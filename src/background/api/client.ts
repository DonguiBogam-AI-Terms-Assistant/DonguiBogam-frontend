/**
 * API 클라이언트
 * useMock 설정에 따라 mock/real API를 투명하게 전환
 */

import type { SummarizeResponse, ChatResponse, ChatTurn } from '@shared/types';
import { mockSummarize, mockChat } from './mockApi';
import { getSettings } from '../storageManager';

export async function summarize(plainText: string): Promise<SummarizeResponse> {
  const { useMock, language: _language } = await getSettings();

  if (useMock) {
    return mockSummarize(plainText);
  }

  // TODO: 실제 API 엔드포인트로 교체
  const res = await fetch('https://your-api.example.com/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plainText }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<SummarizeResponse>;
}

export async function chat(
  userMessage: string,
  plainText: string,
  history: ChatTurn[]
): Promise<ChatResponse> {
  const { useMock } = await getSettings();

  if (useMock) {
    return mockChat(userMessage, plainText, history);
  }

  // TODO: 실제 API 엔드포인트로 교체
  const res = await fetch('https://your-api.example.com/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, plainText, history }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<ChatResponse>;
}
