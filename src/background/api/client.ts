/**
 * API 클라이언트
 * useMock 설정에 따라 mock/real API를 투명하게 전환
 * Backend: http://localhost:8000 (개발) 또는 설정된 BASE_URL
 */

import type {
  SummarizeResponse,
  ChatQueryResponse,
  ChatQueryRequest,
  ChatFollowupRequest,
} from '@shared/types';
import { delay } from '@shared/utils';
import {
  mockSummarize,
  mockChatQuery,
  mockChatFollowup,
} from './mockApi';
import { getOrCreateClientInstallId, getSettings } from '../storageManager';

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

interface ApiError extends Error {
  code?: string;
}

export interface ChatQueryStreamCallbacks {
  onStart?: (mode: 'initial' | 'follow_up') => void;
  onProgress?: (stage: string) => void;
  onDelta?: (text: string) => void;
}

async function getApiBaseUrl(): Promise<string> {
  // TODO: settings에서 API URL을 읽어올 수 있도록 확장
  return DEFAULT_API_BASE_URL;
}

/**
 * 약관 요약 요청
 * POST /documents/summary
 */
export async function summarize(
  canonical_url: string,
  page_title: string,
  raw_text: string
): Promise<SummarizeResponse> {
  const { useMock } = await getSettings();

  if (useMock) {
    return mockSummarize(canonical_url, page_title, raw_text);
  }

  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/documents/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canonical_url,
      page_title,
      raw_text,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${res.status}`
    );
  }

  return res.json() as Promise<SummarizeResponse>;
}

/**
 * 채팅 쿼리 (첫 요청 또는 후속 요청)
 * POST /chat/query
 */
export async function chatQuery(
  request: ChatQueryRequest | ChatFollowupRequest,
  idempotencyKey: string
): Promise<ChatQueryResponse> {
  const { useMock } = await getSettings();

  if (useMock) {
    // 첫 요청과 후속 요청 구분
    if ('canonical_url' in request) {
      return mockChatQuery(request as ChatQueryRequest);
    } else {
      return mockChatFollowup(request as ChatFollowupRequest);
    }
  }

  const baseUrl = await getApiBaseUrl();
  const clientInstallId = await getOrCreateClientInstallId();
  const res = await fetch(`${baseUrl}/chat/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Install-Id': clientInstallId,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.message || `API error: ${res.status}`
    );
  }

  return res.json() as Promise<ChatQueryResponse>;
}

/**
 * 채팅 스트리밍 쿼리
 * POST /chat/query/stream
 */
export async function chatQueryStream(
  request: ChatQueryRequest | ChatFollowupRequest,
  idempotencyKey: string,
  callbacks: ChatQueryStreamCallbacks = {}
): Promise<ChatQueryResponse> {
  const { useMock } = await getSettings();
  const mode = 'canonical_url' in request ? 'initial' : 'follow_up';

  if (useMock) {
    callbacks.onStart?.(mode);
    await delay(180);
    callbacks.onProgress?.('indexing');
    await delay(180);
    callbacks.onProgress?.('retrieval');

    const response =
      mode === 'initial'
        ? await mockChatQuery(request as ChatQueryRequest)
        : await mockChatFollowup(request as ChatFollowupRequest);

    for (const chunk of splitIntoStreamingChunks(response.answer)) {
      callbacks.onDelta?.(chunk);
      await delay(45);
    }

    return response;
  }

  const baseUrl = await getApiBaseUrl();
  const clientInstallId = await getOrCreateClientInstallId();
  const res = await fetch(`${baseUrl}/chat/query/stream`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      'X-Client-Install-Id': clientInstallId,
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw createApiError(errorData, `API error: ${res.status}`);
  }

  if (!res.body) {
    throw createApiError({ code: 'stream_unavailable' }, 'Streaming response is unavailable.');
  }

  return readChatStream(res.body, callbacks);
}

async function readChatStream(
  body: ReadableStream<Uint8Array>,
  callbacks: ChatQueryStreamCallbacks
): Promise<ChatQueryResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResponse: ChatQueryResponse | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let boundary = findSseBoundary(buffer);
      while (boundary) {
        const rawEvent = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        handleChatStreamEvent(rawEvent, callbacks, (response) => {
          finalResponse = response;
        });
        boundary = findSseBoundary(buffer);
      }

      if (done) break;
    }

    if (buffer.trim()) {
      handleChatStreamEvent(buffer, callbacks, (response) => {
        finalResponse = response;
      });
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResponse) {
    throw createApiError(
      { code: 'stream_closed_without_final' },
      'Streaming response closed before final answer.'
    );
  }

  return finalResponse;
}

function handleChatStreamEvent(
  rawEvent: string,
  callbacks: ChatQueryStreamCallbacks,
  setFinalResponse: (response: ChatQueryResponse) => void
): void {
  const event = parseSseEvent(rawEvent);
  if (!event.data) return;

  const data = JSON.parse(event.data) as {
    type?: string;
    mode?: 'initial' | 'follow_up';
    stage?: string;
    text?: string;
    session_id?: string;
    answer?: string;
    suggested_questions?: string[];
    code?: string;
    message?: string;
  };
  const type = event.name === 'message' ? data.type : event.name;

  switch (type) {
    case 'start':
      callbacks.onStart?.(data.mode ?? 'initial');
      break;
    case 'progress':
      if (data.stage) {
        callbacks.onProgress?.(data.stage);
      }
      break;
    case 'delta':
      if (data.text) {
        callbacks.onDelta?.(data.text);
      }
      break;
    case 'final':
      if (!data.session_id || typeof data.answer !== 'string') {
        throw createApiError(
          { code: 'invalid_stream_final' },
          'Streaming final event is missing required fields.'
        );
      }
      setFinalResponse({
        session_id: data.session_id,
        answer: data.answer,
        suggested_questions: data.suggested_questions ?? [],
      });
      break;
    case 'error':
      throw createApiError(
        { code: data.code, message: data.message },
        'Streaming chat request failed.'
      );
    default:
      break;
  }
}

function parseSseEvent(rawEvent: string): { name: string; data: string } {
  const lines = rawEvent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let name = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;

    const separatorIndex = line.indexOf(':');
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const rawValue = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);
    const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue;

    if (field === 'event') {
      name = value;
    } else if (field === 'data') {
      dataLines.push(value);
    }
  }

  return { name, data: dataLines.join('\n') };
}

function findSseBoundary(buffer: string): { index: number; length: number } | null {
  const boundaries = ['\r\n\r\n', '\n\n', '\r\r']
    .map((token) => ({ index: buffer.indexOf(token), length: token.length }))
    .filter((boundary) => boundary.index !== -1)
    .sort((a, b) => a.index - b.index);

  return boundaries[0] ?? null;
}

function splitIntoStreamingChunks(text: string): string[] {
  const chunks = text.match(/.{1,18}(\s|$)|.{1,18}/g);
  return chunks?.filter(Boolean) ?? [text];
}

function createApiError(errorData: unknown, fallbackMessage: string): ApiError {
  const data = normalizeErrorData(errorData);
  const error = new Error(data.message ?? fallbackMessage) as ApiError;
  error.code = data.code;
  return error;
}

function normalizeErrorData(errorData: unknown): { code?: string; message?: string } {
  if (!errorData || typeof errorData !== 'object') {
    return {};
  }

  const data = errorData as Record<string, unknown>;
  const detail = data.detail && typeof data.detail === 'object' ? data.detail : data;
  const detailRecord = detail as Record<string, unknown>;

  return {
    code: typeof detailRecord.code === 'string' ? detailRecord.code : undefined,
    message:
      typeof detailRecord.message === 'string'
        ? detailRecord.message
        : typeof detailRecord.error === 'string'
          ? detailRecord.error
          : undefined,
  };
}

export async function notifyPanelEvent(event: {
  event: 'opened' | 'closed';
  tab_id?: number;
  window_id?: number;
  path?: string;
  reason?: string;
  session_id?: string;
  timestamp: number;
}): Promise<void> {
  const { useMock } = await getSettings();
  if (useMock) {
    console.log('[TermsAI] mock panel event:', event);
    return;
  }

  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/panel/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    throw new Error(`Panel event API error: ${res.status}`);
  }
}
