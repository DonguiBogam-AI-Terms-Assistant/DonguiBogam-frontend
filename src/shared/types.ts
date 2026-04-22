// ─── 도메인 타입 ───────────────────────────────────────────────

/** 감지된 약관 문서 */
export interface TermsDocument {
  fingerprint: string;
  plainText: string;
  title: string;
  sourceUrl: string;
  score: number;
  detectedAt: number;
}

/** 채팅 메시지 단위 */
export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** 탭별 상태 (storage.session) */
export interface TabState {
  tabId: number;
  terms: TermsDocument | null;
  chatHistory: ChatTurn[];
  status: 'idle' | 'detected' | 'panel_open';
}

// ─── Storage 스키마 ────────────────────────────────────────────

export interface LocalStorageSchema {
  /** fingerprint → 요약 캐시 */
  summaryCache: Record<string, string>;
  settings: UserSettings;
}

export interface UserSettings {
  language: 'ko' | 'en';
  useMock: boolean;
}

// ─── API 타입 ──────────────────────────────────────────────────

export interface SummarizeRequest {
  plainText: string;
  fingerprint: string;
}

export interface SummarizeResponse {
  summary: string;
  keyPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ChatRequest {
  userMessage: string;
  plainText: string;
  history: ChatTurn[];
}

export interface ChatResponse {
  reply: string;
}
