/**
 * 채팅 상태 관리 훅
 * - 메시지 전송 / 응답 수신
 * - 로딩 상태 관리
 */

import { useState, useCallback } from 'react';
import type { ChatTurn } from '@shared/types';
import { sendMessage } from '@shared/messages';
import { generateId } from '@shared/utils';

interface UseChatResult {
  history: ChatTurn[];
  isLoading: boolean;
  error: string | null;
  sendUserMessage: (message: string) => Promise<void>;
  clearError: () => void;
}

export function useChat(
  tabId: number | null,
  initialHistory: ChatTurn[] = []
): UseChatResult {
  const [history, setHistory] = useState<ChatTurn[]>(initialHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setHistory((prev) => [...prev, response.payload.turn]);
        } else if (response.type === 'ERROR') {
          throw new Error(response.payload.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '메시지 전송 실패');
        // 실패 시 사용자 메시지 제거
        setHistory((prev) => prev.filter((t) => t.id !== userTurn.id));
      } finally {
        setIsLoading(false);
      }
    },
    [tabId, isLoading]
  );

  const clearError = useCallback(() => setError(null), []);

  return { history, isLoading, error, sendUserMessage, clearError };
}
