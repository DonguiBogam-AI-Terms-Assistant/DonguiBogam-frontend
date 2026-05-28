/**
 * Background 메시지 라우터
 * 모든 chrome.runtime.onMessage를 타입별로 분기 처리
 */

import type {
  ExtMessage,
  TermsDataPayload,
  ChatResponsePayload,
  SummarizeResponsePayload,
  ErrorPayload,
} from '@shared/messages';
import type {
  TabState,
  ChatQueryRequest,
  ChatFollowupRequest,
  ChatQueryResponse,
  ChatTurn,
  SummarizeResponse,
} from '@shared/types';
import { clearTabConversation, getTabState, setTabState } from './storageManager';
import { summarizeStream, chatQueryStream } from './api/client';
import {
  disablePanelOnOtherTabs,
  enablePanelForTab,
  markPanelClosed,
  markPanelOpened,
  togglePanelForTab,
} from './sidePanelManager';

type SendResponse = (response: ExtMessage) => void;

export function setupMessageRouter(): void {
  chrome.runtime.onMessage.addListener(
    (message: ExtMessage, sender, sendResponse: SendResponse) => {
      if (isInternalStreamMessage(message)) {
        return false;
      }

      // 비동기 응답을 위해 true 반환
      handleMessage(message, sender, sendResponse);
      return true;
    }
  );
}

async function handleMessage(
  message: ExtMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
): Promise<void> {
  try {
    switch (message.type) {
      case 'TERMS_DETECTED': {
        const tabId = sender.tab?.id;
        if (!tabId) return;

        const existingState = await getTabState(tabId);
        const isSameDocument =
          existingState?.terms?.fingerprint === message.payload.terms.fingerprint;

        const state: TabState = {
          tabId,
          terms: message.payload.terms,
          chatHistory: isSameDocument ? existingState.chatHistory : [],
          sessionId: null, // 새 세션 초기화
          status: existingState?.status ?? 'detected',
        };
        if (isSameDocument) {
          state.sessionId = existingState.sessionId;
        }
        await setTabState(state);

        // 배지 업데이트
        chrome.action.setBadgeText({ text: '!', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#4f46e5', tabId });
        await enablePanelForTab(tabId);
        if (sender.tab?.windowId) {
          await disablePanelOnOtherTabs(tabId, sender.tab.windowId);
        }
        sendResponse({ type: 'ACK', payload: {} });
        break;
      }

      case 'OPEN_PANEL': {
        // content script에서 온 경우 sender.tab.id 우선 사용
        const tabId = sender.tab?.id ?? message.payload.tabId;
        if (!tabId) return;
        const openPromise = chrome.sidePanel.open({ tabId });

        const state = await getTabState(tabId);
        if (state) {
          await setTabState({ ...state, status: 'panel_open' });
        }
        await openPromise;
        const tab = await chrome.tabs.get(tabId);
        markPanelOpened(tabId, tab.windowId, 'open_message');
        sendResponse({ type: 'ACK', payload: {} });
        break;
      }

      case 'TOGGLE_PANEL': {
        const tabId = sender.tab?.id ?? message.payload.tabId;
        if (!tabId) return;
        const result = await togglePanelForTab(tabId);
        const state = await getTabState(tabId);
        if (state) {
          await setTabState({ ...state, status: result === 'opened' ? 'panel_open' : 'detected' });
        }
        sendResponse({ type: 'ACK', payload: {} });
        break;
      }

      case 'PANEL_READY': {
        const tabId = sender.tab?.id ?? message.payload.tabId;
        const tabState = await getTabState(tabId);

        const payload: TermsDataPayload = { tabState };
        sendResponse({ type: 'TERMS_DATA', payload });
        break;
      }

      case 'PANEL_OPENED': {
        const tabId = sender.tab?.id ?? message.payload.tabId;
        if (!tabId) return;

        const state = await getTabState(tabId);
        if (state) {
          await setTabState({ ...state, status: 'panel_open' });
        }
        const tab = await chrome.tabs.get(tabId);
        markPanelOpened(tabId, tab.windowId, 'float_open');
        sendResponse({ type: 'ACK', payload: {} });
        break;
      }

      case 'PANEL_CLOSED': {
        const tabId = sender.tab?.id ?? message.payload.tabId;
        markPanelClosed(tabId, sender.tab?.windowId, 'panel_unload', 'floating-panel');
        sendResponse({ type: 'ACK', payload: {} });
        break;
      }

      case 'CLEAR_CONVERSATION': {
        const tabId = sender.tab?.id ?? message.payload.tabId;
        if (tabId) {
          await clearTabConversation(tabId);
        }
        sendResponse({ type: 'ACK', payload: {} });
        break;
      }

      case 'CHAT_REQUEST': {
        const { userMessage, userTurnId, assistantTurnId, idempotencyKey } = message.payload;
        const tabId = sender.tab?.id ?? message.payload.tabId;
        const state = await getTabState(tabId);

        if (!state?.terms) {
          const payload: ErrorPayload = {
            code: 'no_terms_data',
            message: '약관 데이터가 없습니다.',
          };
          sendResponse({ type: 'ERROR', payload });
          return;
        }

        try {
          const payload = await handleChatStreamRequest({
            tabId,
            state,
            userMessage,
            userTurnId,
            assistantTurnId,
            idempotencyKey,
          });
          sendResponse({ type: 'CHAT_RESPONSE', payload });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '채팅 요청 실패';
          // Backend 에러 형식 파싱 시도
          let code =
            typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string'
              ? err.code
              : 'chat_error';
          if (err instanceof Error && err.message.includes('document_not_found')) {
            code = 'document_not_found';
          }
          await emitChatStreamMessage(tabId, {
            type: 'CHAT_STREAM_ERROR',
            payload: {
              tabId,
              userTurnId,
              assistantTurnId,
              code,
              message: errorMessage,
            },
          });
          const payload: ErrorPayload = {
            code,
            message: errorMessage,
          };
          sendResponse({ type: 'ERROR', payload });
        }
        break;
      }

      case 'SUMMARIZE_REQUEST': {
        const { requestId } = message.payload;
        const tabId = sender.tab?.id ?? message.payload.tabId;
        const state = await getTabState(tabId);

        if (!state?.terms) {
          const payload: ErrorPayload = {
            code: 'no_terms_data',
            message: '약관 데이터가 없습니다.',
          };
          sendResponse({ type: 'ERROR', payload });
          return;
        }

        try {
          // Backend 스펙에 맞게 필드명 변환
          const result = await handleSummaryStreamRequest(tabId, state, requestId);

          const payload: SummarizeResponsePayload = { result };
          sendResponse({ type: 'SUMMARIZE_RESPONSE', payload });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '요약 요청 실패';
          let code = 'summarize_error';
          if (err instanceof Error && err.message.includes('raw_text_too_short')) {
            code = 'raw_text_too_short';
          }
          await emitSummaryStreamMessage(tabId, {
            type: 'SUMMARY_STREAM_ERROR',
            payload: {
              tabId,
              requestId,
              code,
              message: errorMessage,
            },
          });
          const payload: ErrorPayload = {
            code,
            message: errorMessage,
          };
          sendResponse({ type: 'ERROR', payload });
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
    const payload: ErrorPayload = {
      code: 'internal_error',
      message: errorMessage,
    };
    sendResponse({ type: 'ERROR', payload });
  }
}

async function handleSummaryStreamRequest(
  tabId: number,
  state: TabState,
  requestId: string
): Promise<SummarizeResponse> {
  const result = await summarizeStream(
    state.terms!.sourceUrl,
    state.terms!.title,
    state.terms!.plainText,
    {
      onStart: (cached) => {
        void emitSummaryStreamMessage(tabId, {
          type: 'SUMMARY_STREAM_START',
          payload: {
            tabId,
            requestId,
            cached,
          },
        });
      },
      onDelta: (text) => {
        void emitSummaryStreamMessage(tabId, {
          type: 'SUMMARY_STREAM_DELTA',
          payload: {
            tabId,
            requestId,
            text,
          },
        });
      },
    }
  );

  await emitSummaryStreamMessage(tabId, {
    type: 'SUMMARY_STREAM_FINAL',
    payload: {
      tabId,
      requestId,
      result,
    },
  });

  return result;
}

interface ChatStreamRequestArgs {
  tabId: number;
  state: TabState;
  userMessage: string;
  userTurnId: string;
  assistantTurnId: string;
  idempotencyKey: string;
}

async function handleChatStreamRequest({
  tabId,
  state,
  userMessage,
  userTurnId,
  assistantTurnId,
  idempotencyKey,
}: ChatStreamRequestArgs): Promise<ChatResponsePayload> {
  const request: ChatQueryRequest | ChatFollowupRequest = state.sessionId
    ? {
        session_id: state.sessionId,
        query: userMessage,
      }
    : {
        canonical_url: state.terms!.sourceUrl,
        raw_text: state.terms!.plainText,
        query: userMessage,
      };

  const chatResponse: ChatQueryResponse = await chatQueryStream(request, idempotencyKey, {
    onStart: (mode) => {
      void emitChatStreamMessage(tabId, {
        type: 'CHAT_STREAM_START',
        payload: {
          tabId,
          userTurnId,
          assistantTurnId,
          mode,
        },
      });
    },
    onProgress: (stage) => {
      void emitChatStreamMessage(tabId, {
        type: 'CHAT_STREAM_PROGRESS',
        payload: {
          tabId,
          userTurnId,
          assistantTurnId,
          stage,
        },
      });
    },
    onDelta: (text) => {
      void emitChatStreamMessage(tabId, {
        type: 'CHAT_STREAM_DELTA',
        payload: {
          tabId,
          userTurnId,
          assistantTurnId,
          text,
        },
      });
    },
  });

  const userTurn: ChatTurn = {
    id: userTurnId,
    role: 'user',
    content: userMessage,
    timestamp: Date.now(),
    status: 'sent',
    idempotencyKey,
  };
  const assistantTurn: ChatTurn = {
    id: assistantTurnId,
    role: 'assistant',
    content: chatResponse.answer,
    timestamp: Date.now(),
    status: 'sent',
    replyToId: userTurnId,
    suggestedQuestions: chatResponse.suggested_questions,
  };

  const latestState = (await getTabState(tabId)) ?? state;
  const historyWithoutCurrentTurn = latestState.chatHistory.filter(
    (turn) => turn.id !== userTurnId && turn.id !== assistantTurnId && turn.replyToId !== userTurnId
  );

  await setTabState({
    ...latestState,
    sessionId: chatResponse.session_id,
    chatHistory: [...historyWithoutCurrentTurn, userTurn, assistantTurn],
  });

  const payload: ChatResponsePayload = {
    turn: assistantTurn,
    sessionId: chatResponse.session_id,
    suggestedQuestions: chatResponse.suggested_questions,
  };

  await emitChatStreamMessage(tabId, {
    type: 'CHAT_STREAM_FINAL',
    payload: {
      tabId,
      userTurnId,
      assistantTurnId,
      ...payload,
    },
  });

  return payload;
}

async function emitChatStreamMessage(
  tabId: number,
  message: Extract<
    ExtMessage,
    {
      type:
        | 'CHAT_STREAM_START'
        | 'CHAT_STREAM_PROGRESS'
        | 'CHAT_STREAM_DELTA'
        | 'CHAT_STREAM_FINAL'
        | 'CHAT_STREAM_ERROR';
    }
  >
): Promise<void> {
  const deliveries: Promise<unknown>[] = [];

  if (tabId) {
    deliveries.push(chrome.tabs.sendMessage(tabId, message).catch(() => undefined));
  }

  deliveries.push(chrome.runtime.sendMessage(message).catch(() => undefined));
  await Promise.allSettled(deliveries);
}

async function emitSummaryStreamMessage(
  tabId: number,
  message: Extract<
    ExtMessage,
    {
      type:
        | 'SUMMARY_STREAM_START'
        | 'SUMMARY_STREAM_DELTA'
        | 'SUMMARY_STREAM_FINAL'
        | 'SUMMARY_STREAM_ERROR';
    }
  >
): Promise<void> {
  const deliveries: Promise<unknown>[] = [];

  if (tabId) {
    deliveries.push(chrome.tabs.sendMessage(tabId, message).catch(() => undefined));
  }

  deliveries.push(chrome.runtime.sendMessage(message).catch(() => undefined));
  await Promise.allSettled(deliveries);
}

function isInternalStreamMessage(message: ExtMessage): boolean {
  return message.type.startsWith('CHAT_STREAM_') || message.type.startsWith('SUMMARY_STREAM_');
}
