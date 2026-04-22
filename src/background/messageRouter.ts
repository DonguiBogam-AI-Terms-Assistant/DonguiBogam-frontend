/**
 * Background 메시지 라우터
 * 모든 chrome.runtime.onMessage를 타입별로 분기 처리
 */

import type { ExtMessage, TermsDataPayload, ChatResponsePayload, SummarizeResponsePayload, ErrorPayload } from '@shared/messages';
import type { TabState } from '@shared/types';
import { getTabState, setTabState } from './storageManager';
import { summarize, chat } from './api/client';
import { generateId } from '@shared/utils';

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

        const state: TabState = {
          tabId,
          terms: message.payload.terms,
          chatHistory: [],
          status: 'detected',
        };
        await setTabState(state);

        // 배지 업데이트
        chrome.action.setBadgeText({ text: '!', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#4f46e5', tabId });
        break;
      }

      case 'OPEN_PANEL': {
        // content script에서 온 경우 sender.tab.id 우선 사용
        const tabId = sender.tab?.id ?? message.payload.tabId;
        if (!tabId) return;
        await chrome.sidePanel.open({ tabId });

        const state = await getTabState(tabId);
        if (state) {
          await setTabState({ ...state, status: 'panel_open' });
        }
        break;
      }

      case 'PANEL_READY': {
        const tabId = message.payload.tabId;
        const tabState = await getTabState(tabId);

        const payload: TermsDataPayload = { tabState };
        sendResponse({ type: 'TERMS_DATA', payload });
        break;
      }

      case 'CHAT_REQUEST': {
        const { userMessage, tabId } = message.payload;
        const state = await getTabState(tabId);

        if (!state?.terms) {
          const payload: ErrorPayload = { message: '약관 데이터가 없습니다.', code: 'NO_TERMS' };
          sendResponse({ type: 'ERROR', payload });
          return;
        }

        const response = await chat(userMessage, state.terms.plainText, state.chatHistory);

        // 채팅 히스토리에 user + assistant 턴 추가
        const userTurn = {
          id: generateId(),
          role: 'user' as const,
          content: userMessage,
          timestamp: Date.now(),
        };
        const assistantTurn = {
          id: generateId(),
          role: 'assistant' as const,
          content: response.reply,
          timestamp: Date.now(),
        };

        await setTabState({
          ...state,
          chatHistory: [...state.chatHistory, userTurn, assistantTurn],
        });

        const payload: ChatResponsePayload = { turn: assistantTurn };
        sendResponse({ type: 'CHAT_RESPONSE', payload });
        break;
      }

      case 'SUMMARIZE_REQUEST': {
        const { tabId } = message.payload;
        const state = await getTabState(tabId);

        if (!state?.terms) {
          const payload: ErrorPayload = { message: '약관 데이터가 없습니다.', code: 'NO_TERMS' };
          sendResponse({ type: 'ERROR', payload });
          return;
        }

        const result = await summarize(state.terms.plainText);
        const payload: SummarizeResponsePayload = { result };
        sendResponse({ type: 'SUMMARIZE_RESPONSE', payload });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류';
    const payload: ErrorPayload = { message: errorMessage };
    sendResponse({ type: 'ERROR', payload });
  }
}
