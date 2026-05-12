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
  sessionId: string | null; // Backend 채팅 세션 ID
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

/** 약관 요약 요청 */
export interface SummarizeRequest {
  canonical_url: string; // http/https URL
  page_title: string; // 1~300자
  raw_text: string; // 1~200,000자
}

/** 약관 요약 응답 (MVP: summary만 포함) */
export interface SummarizeResponse {
  summary: string;
}

/** 첫 채팅 요청 */
export interface ChatQueryRequest {
  canonical_url: string;
  raw_text: string;
  query: string; // 1~1,000자
}

/** 후속 채팅 요청 */
export interface ChatFollowupRequest {
  session_id: string;
  query: string; // 1~1,000자
}

/** 채팅 응답 (첫/후속 동일) */
export interface ChatQueryResponse {
  session_id: string; // 후속 요청에 사용
  answer: string;
}
