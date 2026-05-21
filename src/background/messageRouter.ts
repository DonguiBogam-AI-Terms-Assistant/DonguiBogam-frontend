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
} from '@shared/types';
import { getTabState, setTabState } from './storageManager';
import { summarize, chatQuery } from './api/client';
import { generateId } from '@shared/utils';
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
        const tabId = message.payload.tabId;
        const tabState = await getTabState(tabId);

        const payload: TermsDataPayload = { tabState };
        sendResponse({ type: 'TERMS_DATA', payload });
        break;
      }

      case 'PANEL_CLOSED': {
        markPanelClosed(message.payload.tabId, undefined, 'panel_unload');
        sendResponse({ type: 'ACK', payload: {} });
        break;
      }

      case 'CHAT_REQUEST': {
        const { userMessage, tabId, userTurnId, idempotencyKey } = message.payload;
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
          let chatResponse: ChatQueryResponse;

          // 첫 요청 vs 후속 요청 분기
          if (!state.sessionId) {
            // 첫 요청: canonical_url, raw_text, query 포함
            const request: ChatQueryRequest = {
              canonical_url: state.terms.sourceUrl,
              raw_text: state.terms.plainText,
              query: userMessage,
            };
            chatResponse = await chatQuery(request, idempotencyKey);

            // 새 sessionId 저장
            await setTabState({
              ...state,
              sessionId: chatResponse.session_id,
            });
          } else {
            // 후속 요청: session_id, query만 포함
            const request: ChatFollowupRequest = {
              session_id: state.sessionId,
              query: userMessage,
            };
            chatResponse = await chatQuery(request, idempotencyKey);
          }

          // 채팅 히스토리에 user + assistant 턴 추가
          const userTurn = {
            id: userTurnId,
            role: 'user' as const,
            content: userMessage,
            timestamp: Date.now(),
            status: 'sent' as const,
            idempotencyKey,
          };
          const assistantTurn = {
            id: generateId(),
            role: 'assistant' as const,
            content: chatResponse.answer,
            timestamp: Date.now(),
            status: 'sent' as const,
            suggestedQuestions: chatResponse.suggested_questions,
          };

          await setTabState({
            ...state,
            sessionId: chatResponse.session_id, // 갱신 (안전성)
            chatHistory: [...state.chatHistory, userTurn, assistantTurn],
          });

          const payload: ChatResponsePayload = {
            turn: assistantTurn,
            sessionId: chatResponse.session_id,
            suggestedQuestions: chatResponse.suggested_questions,
          };
          sendResponse({ type: 'CHAT_RESPONSE', payload });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '채팅 요청 실패';
          // Backend 에러 형식 파싱 시도
          let code = 'chat_error';
          if (err instanceof Error && err.message.includes('document_not_found')) {
            code = 'document_not_found';
          }
          const payload: ErrorPayload = {
            code,
            message: errorMessage,
          };
          sendResponse({ type: 'ERROR', payload });
        }
        break;
      }

      case 'SUMMARIZE_REQUEST': {
        const { tabId } = message.payload;
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
          const result = await summarize(
            state.terms.sourceUrl, // canonical_url
            state.terms.title, // page_title
            state.terms.plainText // raw_text
          );

          const payload: SummarizeResponsePayload = { result };
          sendResponse({ type: 'SUMMARIZE_RESPONSE', payload });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '요약 요청 실패';
          let code = 'summarize_error';
          if (err instanceof Error && err.message.includes('raw_text_too_short')) {
            code = 'raw_text_too_short';
          }
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
