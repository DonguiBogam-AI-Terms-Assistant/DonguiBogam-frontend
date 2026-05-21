import type { ChatTurn, SummarizeResponse, TabState, TermsDocument } from './types';

export type MessageType =
  | 'TERMS_DETECTED'
  | 'TOGGLE_PANEL'
  | 'OPEN_PANEL'
  | 'PANEL_CLOSED'
  | 'PANEL_READY'
  | 'TERMS_DATA'
  | 'CHAT_REQUEST'
  | 'CHAT_RESPONSE'
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

export interface TermsDataPayload {
  tabState: TabState | null;
}

export interface ChatRequestPayload {
  userMessage: string;
  tabId: number;
  userTurnId: string;
  idempotencyKey: string;
}

export interface ChatResponsePayload {
  turn: ChatTurn;
  sessionId: string;
  suggestedQuestions: string[];
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
  | { type: 'PANEL_CLOSED'; payload: PanelClosedPayload }
  | { type: 'PANEL_READY'; payload: PanelReadyPayload }
  | { type: 'TERMS_DATA'; payload: TermsDataPayload }
  | { type: 'CHAT_REQUEST'; payload: ChatRequestPayload }
  | { type: 'CHAT_RESPONSE'; payload: ChatResponsePayload }
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
