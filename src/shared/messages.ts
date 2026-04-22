import type { TermsDocument, ChatTurn, TabState, SummarizeResponse } from './types';

// ─── 메시지 타입 열거 ──────────────────────────────────────────

export type MessageType =
  | 'TERMS_DETECTED'      // content → background: 약관 감지됨
  | 'OPEN_PANEL'          // content → background: 패널 열기 요청
  | 'PANEL_READY'         // panel → background: 패널 초기화 완료
  | 'TERMS_DATA'          // background → panel: 약관 데이터 응답
  | 'CHAT_REQUEST'        // panel → background: 채팅 메시지 전송
  | 'CHAT_RESPONSE'       // background → panel: 채팅 응답
  | 'SUMMARIZE_REQUEST'   // panel → background: 요약 요청
  | 'SUMMARIZE_RESPONSE'  // background → panel: 요약 응답
  | 'ERROR';              // 에러 전파

// ─── 페이로드 타입 ─────────────────────────────────────────────

export interface TermsDetectedPayload {
  terms: TermsDocument;
}

export interface OpenPanelPayload {
  tabId: number;
}

export interface PanelReadyPayload {
  tabId: number;
}

export interface TermsDataPayload {
  tabState: TabState | null;
}

export interface ChatRequestPayload {
  userMessage: string;
  tabId: number;
}

export interface ChatResponsePayload {
  turn: ChatTurn;
}

export interface SummarizeRequestPayload {
  tabId: number;
}

export interface SummarizeResponsePayload {
  result: SummarizeResponse;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

// ─── 메시지 유니온 타입 ────────────────────────────────────────

export type ExtMessage =
  | { type: 'TERMS_DETECTED'; payload: TermsDetectedPayload }
  | { type: 'OPEN_PANEL'; payload: OpenPanelPayload }
  | { type: 'PANEL_READY'; payload: PanelReadyPayload }
  | { type: 'TERMS_DATA'; payload: TermsDataPayload }
  | { type: 'CHAT_REQUEST'; payload: ChatRequestPayload }
  | { type: 'CHAT_RESPONSE'; payload: ChatResponsePayload }
  | { type: 'SUMMARIZE_REQUEST'; payload: SummarizeRequestPayload }
  | { type: 'SUMMARIZE_RESPONSE'; payload: SummarizeResponsePayload }
  | { type: 'ERROR'; payload: ErrorPayload };

// ─── 헬퍼 ─────────────────────────────────────────────────────

/** type-safe 메시지 전송 (content/panel → background) */
export function sendMessage<T extends ExtMessage>(
  message: T
): Promise<ExtMessage | undefined> {
  return chrome.runtime.sendMessage(message);
}

/** background → 특정 탭의 content script로 전송 */
export function sendToTab(tabId: number, message: ExtMessage): Promise<void> {
  return chrome.tabs.sendMessage(tabId, message);
}
