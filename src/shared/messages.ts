import type { ChatTurn, SummarizeResponse, TabState, TermsDocument } from './types';

export type MessageType =
  | 'TERMS_DETECTED'
  | 'TOGGLE_PANEL'
  | 'OPEN_PANEL'
  | 'PANEL_OPENED'
  | 'PANEL_CLOSED'
  | 'CLEAR_CONVERSATION'
  | 'PANEL_READY'
  | 'TERMS_DATA'
  | 'CHAT_REQUEST'
  | 'CHAT_RESPONSE'
  | 'CHAT_STREAM_START'
  | 'CHAT_STREAM_PROGRESS'
  | 'CHAT_STREAM_DELTA'
  | 'CHAT_STREAM_FINAL'
  | 'CHAT_STREAM_ERROR'
  | 'SUMMARIZE_REQUEST'
  | 'SUMMARIZE_RESPONSE'
  | 'ACK'
  | 'ERROR';

export interface TermsDetectedPayload {
  terms: TermsDocument;
}

export interface TogglePanelPayload {
  tabId: number;
}

export interface OpenPanelPayload {
  tabId: number;
}

export interface PanelReadyPayload {
  tabId: number;
}

export interface PanelClosedPayload {
  tabId: number;
}

export interface PanelOpenedPayload {
  tabId: number;
}

export interface ClearConversationPayload {
  tabId: number;
}

export interface TermsDataPayload {
  tabState: TabState | null;
}

export interface ChatRequestPayload {
  userMessage: string;
  tabId: number;
  userTurnId: string;
  assistantTurnId: string;
  idempotencyKey: string;
}

export interface ChatResponsePayload {
  turn: ChatTurn;
  sessionId: string;
  suggestedQuestions: string[];
}

export interface ChatStreamStartPayload {
  tabId: number;
  userTurnId: string;
  assistantTurnId: string;
  mode: 'initial' | 'follow_up';
}

export interface ChatStreamProgressPayload {
  tabId: number;
  userTurnId: string;
  assistantTurnId: string;
  stage: string;
}

export interface ChatStreamDeltaPayload {
  tabId: number;
  userTurnId: string;
  assistantTurnId: string;
  text: string;
}

export interface ChatStreamFinalPayload {
  tabId: number;
  userTurnId: string;
  assistantTurnId: string;
  turn: ChatTurn;
  sessionId: string;
  suggestedQuestions: string[];
}

export interface ChatStreamErrorPayload {
  tabId: number;
  userTurnId: string;
  assistantTurnId: string;
  code: string;
  message: string;
}

export interface SummarizeRequestPayload {
  tabId: number;
}

export interface SummarizeResponsePayload {
  result: SummarizeResponse;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export type ExtMessage =
  | { type: 'TERMS_DETECTED'; payload: TermsDetectedPayload }
  | { type: 'TOGGLE_PANEL'; payload: TogglePanelPayload }
  | { type: 'OPEN_PANEL'; payload: OpenPanelPayload }
  | { type: 'PANEL_OPENED'; payload: PanelOpenedPayload }
  | { type: 'PANEL_CLOSED'; payload: PanelClosedPayload }
  | { type: 'CLEAR_CONVERSATION'; payload: ClearConversationPayload }
  | { type: 'PANEL_READY'; payload: PanelReadyPayload }
  | { type: 'TERMS_DATA'; payload: TermsDataPayload }
  | { type: 'CHAT_REQUEST'; payload: ChatRequestPayload }
  | { type: 'CHAT_RESPONSE'; payload: ChatResponsePayload }
  | { type: 'CHAT_STREAM_START'; payload: ChatStreamStartPayload }
  | { type: 'CHAT_STREAM_PROGRESS'; payload: ChatStreamProgressPayload }
  | { type: 'CHAT_STREAM_DELTA'; payload: ChatStreamDeltaPayload }
  | { type: 'CHAT_STREAM_FINAL'; payload: ChatStreamFinalPayload }
  | { type: 'CHAT_STREAM_ERROR'; payload: ChatStreamErrorPayload }
  | { type: 'SUMMARIZE_REQUEST'; payload: SummarizeRequestPayload }
  | { type: 'SUMMARIZE_RESPONSE'; payload: SummarizeResponsePayload }
  | { type: 'ACK'; payload: Record<string, never> }
  | { type: 'ERROR'; payload: ErrorPayload };

export function sendMessage<T extends ExtMessage>(message: T): Promise<ExtMessage | undefined> {
  if (!chrome.runtime?.id) {
    return Promise.resolve(undefined);
  }

  try {
    return chrome.runtime.sendMessage(message);
  } catch (err) {
    return Promise.reject(err);
  }
}

export function sendToTab(tabId: number, message: ExtMessage): Promise<void> {
  if (!chrome.runtime?.id) {
    return Promise.resolve();
  }

  try {
    return chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    return Promise.reject(err);
  }
}
