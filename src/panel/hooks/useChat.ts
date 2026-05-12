/**
 * 채팅 상태 관리 훅
 * - 메시지 전송 / 응답 수신
 * - 로딩 상태 관리
 * - Backend session_id 관리
 */

import { useState, useCallback } from 'react';
import type { ChatTurn, ErrorPayload } from '@shared/types';
import { sendMessage } from '@shared/messages';
import { generateId } from '@shared/utils';

interface UseChatResult {
  history: ChatTurn[];
  isLoading: boolean;
  error: { code?: string; message: string } | null;
  sessionId: string | null;
  sendUserMessage: (message: string) => Promise<void>;
  clearError: () => void;
}

export function useChat(
  tabId: number | null,
  initialHistory: ChatTurn[] = []
): UseChatResult {
  const [history, setHistory] = useState<ChatTurn[]>(initialHistory);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  const sendUserMessage = useCallback(
    async (message: string) => {
      if (!tabId || !message.trim() || isLoading) return;

      const userTurn: ChatTurn = {
        id: generateId(),
        role: 'user',
        content: message.trim(),
        timestamp: Date.now(),
      };

      // 낙관적 업데이트: 사용자 메시지 즉시 표시
      setHistory((prev) => [...prev, userTurn]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await sendMessage({
          type: 'CHAT_REQUEST',
          payload: { userMessage: message.trim(), tabId },
        });

        if (!response) throw new Error('응답이 없습니다.');

        if (response.type === 'CHAT_RESPONSE') {
          const { turn, sessionId: newSessionId } = response.payload;
          if (newSessionId && !sessionId) {
            setSessionId(newSessionId);
          }
          setHistory((prev) => [...prev, turn]);
        } else if (response.type === 'ERROR') {
          const errorPayload = response.payload as ErrorPayload;
          throw {
            code: errorPayload.code,
            message: errorPayload.message,
          };
        }
      } catch (err) {
        if (typeof err === 'object' && err !== null && 'code' in err) {
          setError(err as { code?: string; message: string });
        } else {
          setError({
            message: err instanceof Error ? err.message : '메시지 전송 실패',
          });
        }
        // 실패 시 사용자 메시지 제거
        setHistory((prev) => prev.filter((t) => t.id !== userTurn.id));
      } finally {
        setIsLoading(false);
      }
    },
    [tabId, isLoading, sessionId]
  );

  const clearError = useCallback(() => setError(null), []);

  return { history, isLoading, error, sessionId, sendUserMessage, clearError };
}
