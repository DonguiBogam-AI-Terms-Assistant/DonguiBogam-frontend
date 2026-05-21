import { useCallback, useEffect, useState } from 'react';
import type { ChatTurn } from '@shared/types';
import type { ErrorPayload } from '@shared/messages';
import { sendMessage } from '@shared/messages';
import { generateId, generateRandomId } from '@shared/utils';

interface UseChatResult {
  history: ChatTurn[];
  isLoading: boolean;
  error: { code?: string; message: string } | null;
  sessionId: string | null;
  sendUserMessage: (message: string) => Promise<void>;
  retryMessage: (turn: ChatTurn) => Promise<void>;
  clearError: () => void;
}

export function useChat(
  tabId: number | null,
  initialHistory: ChatTurn[] = [],
  initialSessionId: string | null = null
): UseChatResult {
  const [history, setHistory] = useState<ChatTurn[]>(initialHistory);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  useEffect(() => {
    setHistory(initialHistory);
    setSessionId(initialSessionId);
    setError(null);
    setIsLoading(false);
  }, [tabId, initialSessionId]);

  const submitTurn = useCallback(
    async (userTurn: ChatTurn, options: { append: boolean }) => {
      if (tabId == null || !userTurn.content.trim() || isLoading) return;

      const idempotencyKey = userTurn.idempotencyKey ?? generateRandomId('chatmsg');
      const sendingTurn: ChatTurn = {
        ...userTurn,
        idempotencyKey,
        status: 'sending',
      };

      if (options.append) {
        setHistory((prev) => [...prev, sendingTurn]);
      } else {
        setHistory((prev) => prev.map((turn) => (turn.id === userTurn.id ? sendingTurn : turn)));
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await sendMessage({
          type: 'CHAT_REQUEST',
          payload: {
            userMessage: userTurn.content.trim(),
            tabId,
            userTurnId: userTurn.id,
            idempotencyKey,
          },
        });

        if (!response) throw new Error('No response received.');

        if (response.type === 'CHAT_RESPONSE') {
          const { turn, sessionId: newSessionId } = response.payload;
          if (newSessionId && !sessionId) {
            setSessionId(newSessionId);
          }

          setHistory((prev) => [
            ...prev.map((item) =>
              item.id === userTurn.id
                ? { ...item, status: 'sent' as const, idempotencyKey }
                : item
            ),
            turn,
          ]);
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
            message: err instanceof Error ? err.message : 'Failed to send message.',
          });
        }

        setHistory((prev) =>
          prev.map((turn) =>
            turn.id === userTurn.id
              ? { ...turn, status: 'failed' as const, idempotencyKey }
              : turn
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [tabId, isLoading, sessionId]
  );

  const sendUserMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      await submitTurn(
        {
          id: generateId(),
          role: 'user',
          content: trimmed,
          timestamp: Date.now(),
          status: 'sending',
          idempotencyKey: generateRandomId('chatmsg'),
        },
        { append: true }
      );
    },
    [submitTurn]
  );

  const retryMessage = useCallback(
    async (turn: ChatTurn) => {
      if (turn.role !== 'user' || !turn.idempotencyKey) return;
      await submitTurn(turn, { append: false });
    },
    [submitTurn]
  );

  const clearError = useCallback(() => setError(null), []);

  return { history, isLoading, error, sessionId, sendUserMessage, retryMessage, clearError };
}
