/**
 * Side Panel 메인 앱 컴포넌트
 */

import { useTermsData } from './hooks/useTermsData';
import { useChat } from './hooks/useChat';
import { useSummarize } from './hooks/useSummarize';
import { TermsPreview } from './components/TermsPreview';
import { SummaryCard } from './components/SummaryCard';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';

export function App() {
  const { tabState, isLoading: dataLoading, error: dataError, tabId } = useTermsData();
  const { history, isLoading: chatLoading, error: chatError, sendUserMessage, clearError } = useChat(
    tabId,
    tabState?.chatHistory ?? []
  );
  const { summary, isLoading: summaryLoading, error: summaryError, requestSummary } = useSummarize(tabId);

  // ── 로딩 상태 ──────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>데이터 불러오는 중...</p>
      </div>
    );
  }

  // ── 에러 상태 ──────────────────────────────────────────────
  if (dataError) {
    return (
      <div style={styles.center}>
        <span style={{ fontSize: 32 }}>⚠️</span>
        <p style={styles.errorText}>{dataError}</p>
      </div>
    );
  }

  // ── 약관 미감지 상태 ───────────────────────────────────────
  if (!tabState?.terms) {
    return (
      <div style={styles.center}>
        <span style={{ fontSize: 40 }}>🔍</span>
        <p style={styles.emptyTitle}>감지된 약관이 없습니다</p>
        <p style={styles.emptyDesc}>약관이 포함된 페이지를 방문하면 자동으로 감지됩니다.</p>
      </div>
    );
  }

  const { terms } = tabState;

  return (
    <div style={styles.root}>
      {/* 헤더 */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>📋</span>
        <span style={styles.headerTitle}>약관 요약 AI</span>
        <span style={styles.mockBadge}>MOCK</span>
      </div>

      {/* 스크롤 영역 */}
      <div style={styles.scrollArea}>
        {/* 약관 원문 미리보기 */}
        <TermsPreview terms={terms} />

        {/* 요약 카드 또는 요약 버튼 */}
        {summary ? (
          <SummaryCard summary={summary} />
        ) : (
          <button
            style={{
              ...styles.summarizeBtn,
              opacity: summaryLoading ? 0.6 : 1,
              cursor: summaryLoading ? 'not-allowed' : 'pointer',
            }}
            onClick={requestSummary}
            disabled={summaryLoading}
          >
            {summaryLoading ? '요약 중...' : '✨ AI 요약 보기'}
          </button>
        )}

        {summaryError && (
          <p style={styles.inlineError}>
            {summaryError.code ? `오류 (${summaryError.code}): ` : ''}
            {summaryError.message}
          </p>
        )}

        {/* 구분선 */}
        <div style={styles.divider} />

        {/* 채팅 영역 */}
        <ChatWindow history={history} isLoading={chatLoading} />

        {chatError && (
          <div style={styles.errorBanner}>
            <span>
              {chatError.code ? `오류 (${chatError.code}): ` : ''}
              {chatError.message}
            </span>
            <button style={styles.errorClose} onClick={clearError}>✕</button>
          </div>
        )}
      </div>

      {/* 입력창 (하단 고정) */}
      <ChatInput onSend={sendUserMessage} disabled={chatLoading} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    background: '#fff',
    color: '#111827',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  headerIcon: { fontSize: 18 },
  headerTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  mockBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#d97706',
    background: '#fef3c7',
    padding: '2px 6px',
    borderRadius: 4,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
  },
  summarizeBtn: {
    width: '100%',
    padding: '10px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
    transition: 'opacity 0.15s',
  },
  divider: {
    height: 1,
    background: '#f3f4f6',
    margin: '4px 0 12px',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: 24,
    textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #4f46e5',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginBottom: 12,
  },
  loadingText: { fontSize: 13, color: '#6b7280', margin: 0 },
  errorText: { fontSize: 13, color: '#dc2626', margin: '8px 0 0' },
  emptyTitle: { fontSize: 14, fontWeight: 600, color: '#374151', margin: '12px 0 4px' },
  emptyDesc: { fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.6 },
  inlineError: { fontSize: 12, color: '#dc2626', margin: '0 0 8px' },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: '#dc2626',
    marginTop: 8,
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
  },
};
