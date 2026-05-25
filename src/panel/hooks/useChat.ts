import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatTurn } from '@shared/types';
import type {
  ChatResponsePayload,
  ChatStreamFinalPayload,
  ErrorPayload,
  ExtMessage,
} from '@shared/messages';
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
  clearHistory: () => void;
}

interface ActiveChatRequest {
  userTurnId: string;
  assistantTurnId: string;
  idempotencyKey: string;
  hasDelta: boolean;
}

type FinalPayload = ChatStreamFinalPayload | (ChatResponsePayload & {
  userTurnId: string;
  assistantTurnId: string;
});

const PENDING_ASSISTANT_CONTENT = '';

export function useChat(
  tabId: number | null,
  initialHistory: ChatTurn[] = [],
  initialSessionId: string | null = null
): UseChatResult {
  const [history, setHistory] = useState<ChatTurn[]>(initialHistory);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const activeRequestRef = useRef<ActiveChatRequest | null>(null);

  useEffect(() => {
    activeRequestRef.current = null;
    setHistory(initialHistory);
    setSessionId(initialSessionId);
    setError(null);
    setIsLoading(false);
  }, [tabId, initialSessionId]);

  const applyFinalPayload = useCallback((payload: FinalPayload) => {
    const activeRequest = activeRequestRef.current;
    if (!activeRequest || activeRequest.userTurnId !== payload.userTurnId) return;

    setSessionId(payload.sessionId);
    setHistory((prev) =>
      prev.map((turn) => {
        if (turn.id === payload.userTurnId) {
          return {
            ...turn,
            status: 'sent' as const,
            idempotencyKey: activeRequest.idempotencyKey,
          };
        }

        if (turn.id === payload.assistantTurnId || turn.id === activeRequest.assistantTurnId) {
          return {
            ...payload.turn,
            id: activeRequest.assistantTurnId,
            status: 'sent' as const,
            replyToId: payload.userTurnId,
            suggestedQuestions: payload.suggestedQuestions,
          };
        }

        return turn;
      })
    );
    activeRequestRef.current = null;
    setIsLoading(false);
  }, []);

  const failRequest = useCallback(
    (
      userTurnId: string,
      assistantTurnId: string,
      idempotencyKey: string,
      nextError: { code?: string; message: string }
    ) => {
      const activeRequest = activeRequestRef.current;
      if (!activeRequest || activeRequest.userTurnId !== userTurnId) return;

      setError(nextError);
      setHistory((prev) =>
        prev.map((turn) => {
          if (turn.id === userTurnId) {
            return { ...turn, status: 'failed' as const, idempotencyKey };
          }

          if (turn.id === assistantTurnId || turn.id === activeRequest.assistantTurnId) {
            return {
              ...turn,
              content: nextError.message,
              status: 'failed' as const,
              replyToId: userTurnId,
            };
          }

          return turn;
        })
      );
      activeRequestRef.current = null;
      setIsLoading(false);
    },
    []
  );

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handleStreamMessage = (message: ExtMessage) => {
      const activeRequest = activeRequestRef.current;
      if (!activeRequest) return;

      switch (message.type) {
        case 'CHAT_STREAM_START': {
          if (message.payload.userTurnId !== activeRequest.userTurnId) return;
          if (activeRequest.hasDelta) return;

          setHistory((prev) =>
            prev.map((turn) =>
              turn.id === activeRequest.assistantTurnId
                ? { ...turn, content: PENDING_ASSISTANT_CONTENT, status: 'sending' as const }
                : turn
            )
          );
          break;
        }

        case 'CHAT_STREAM_PROGRESS': {
          if (message.payload.userTurnId !== activeRequest.userTurnId) return;
          if (activeRequest.hasDelta) return;

          setHistory((prev) =>
            prev.map((turn) =>
              turn.id === activeRequest.assistantTurnId
                ? { ...turn, content: PENDING_ASSISTANT_CONTENT, status: 'sending' as const }
                : turn
            )
          );
          break;
        }

        case 'CHAT_STREAM_DELTA': {
          if (message.payload.userTurnId !== activeRequest.userTurnId) return;

          const shouldAppend = activeRequest.hasDelta;
          activeRequest.hasDelta = true;
          setHistory((prev) =>
            prev.map((turn) =>
              turn.id === activeRequest.assistantTurnId
                ? {
                    ...turn,
                    content: shouldAppend ? `${turn.content}${message.payload.text}` : message.payload.text,
                    status: 'sending' as const,
                  }
                : turn
            )
          );
          break;
        }

        case 'CHAT_STREAM_FINAL':
          applyFinalPayload(message.payload);
          break;

        case 'CHAT_STREAM_ERROR':
          failRequest(
            message.payload.userTurnId,
            message.payload.assistantTurnId,
            activeRequest.idempotencyKey,
            {
              code: message.payload.code,
              message: message.payload.message,
            }
          );
          break;

        default:
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleStreamMessage);
    return () => chrome.runtime.onMessage.removeListener(handleStreamMessage);
  }, [applyFinalPayload, failRequest]);

  const submitTurn = useCallback(
    async (userTurn: ChatTurn, options: { append: boolean }) => {
      if (tabId == null || !userTurn.content.trim() || isLoading) return;

      const idempotencyKey = userTurn.idempotencyKey ?? generateRandomId('chatmsg');
      const assistantTurnId = generateId();
      const sendingTurn: ChatTurn = {
        ...userTurn,
        idempotencyKey,
        status: 'sending',
      };
      const pendingAssistantTurn: ChatTurn = {
        id: assistantTurnId,
        role: 'assistant',
        content: PENDING_ASSISTANT_CONTENT,
        timestamp: Date.now(),
        status: 'sending',
        replyToId: userTurn.id,
      };

      activeRequestRef.current = {
        userTurnId: userTurn.id,
        assistantTurnId,
        idempotencyKey,
        hasDelta: false,
      };

      if (options.append) {
        setHistory((prev) => [...prev, sendingTurn, pendingAssistantTurn]);
      } else {
        setHistory((prev) => {
          const next: ChatTurn[] = [];

          for (const turn of prev) {
            if (turn.id === userTurn.id) {
              next.push(sendingTurn, pendingAssistantTurn);
            } else if (turn.replyToId !== userTurn.id) {
              next.push(turn);
            }
          }

          return next;
        });
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
            assistantTurnId,
            idempotencyKey,
          },
        });

        if (!response) throw new Error('No response received.');

        if (response.type === 'CHAT_RESPONSE') {
          applyFinalPayload({
            ...response.payload,
            userTurnId: userTurn.id,
            assistantTurnId,
          });
        } else if (response.type === 'ERROR') {
          const errorPayload = response.payload as ErrorPayload;
          failRequest(userTurn.id, assistantTurnId, idempotencyKey, {
            code: errorPayload.code,
            message: errorPayload.message,
          });
        }
      } catch (err) {
        failRequest(userTurn.id, assistantTurnId, idempotencyKey, {
          message: err instanceof Error ? err.message : 'Failed to send message.',
        });
      }
    },
    [applyFinalPayload, failRequest, isLoading, tabId]
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
  const clearHistory = useCallback(() => {
    activeRequestRef.current = null;
    setHistory([]);
    setSessionId(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    history,
    isLoading,
    error,
    sessionId,
    sendUserMessage,
    retryMessage,
    clearError,
    clearHistory,
  };
}
