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
import {
  mockSummarize,
  mockChatQuery,
  mockChatFollowup,
} from './mockApi';
import { getSettings } from '../storageManager';

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

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
  request: ChatQueryRequest | ChatFollowupRequest
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
  const res = await fetch(`${baseUrl}/chat/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
