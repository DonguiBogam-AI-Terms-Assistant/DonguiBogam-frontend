import { useCallback, useEffect, useMemo } from 'react';
import { useTermsData } from './hooks/useTermsData';
import { useChat } from './hooks/useChat';
import { useSummarize } from './hooks/useSummarize';
import { SummaryCard, SummarySkeleton } from './components/SummaryCard';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { sendMessage } from '@shared/messages';

export function App() {
  const { tabState, isLoading: dataLoading, error: dataError, tabId } = useTermsData();
  const {
    history,
    isLoading: chatLoading,
    error: chatError,
    sendUserMessage,
    retryMessage,
    clearError,
  } = useChat(tabId, tabState?.chatHistory ?? [], tabState?.sessionId ?? null);
  const { summary, isLoading: summaryLoading, error: summaryError, requestSummary } = useSummarize(tabId);
  const suggestedQuestions = useMemo(() => {
    const latestAssistantQuestions = [...history]
      .reverse()
      .find((turn) => turn.role === 'assistant' && turn.suggestedQuestions?.length)
      ?.suggestedQuestions;

    return latestAssistantQuestions ?? summary?.suggested_questions ?? [];
  }, [history, summary?.suggested_questions]);
  const notifyPanelClosed = useCallback(() => {
    if (!tabId) return;

    void sendMessage({
      type: 'PANEL_CLOSED',
      payload: { tabId },
    }).catch(console.error);
  }, [tabId]);

  useEffect(() => {
    if (tabState?.terms && !summary && !summaryLoading && !summaryError) {
      void requestSummary();
    }
  }, [requestSummary, summary, summaryError, summaryLoading, tabState?.terms]);

  useEffect(() => {
    if (!tabId) return;

    const port = chrome.runtime.connect({ name: 'side-panel' });
    port.postMessage({ tabId });

    window.addEventListener('pagehide', notifyPanelClosed);
    window.addEventListener('beforeunload', notifyPanelClosed);

    return () => {
      window.removeEventListener('pagehide', notifyPanelClosed);
      window.removeEventListener('beforeunload', notifyPanelClosed);
      port.disconnect();
    };
  }, [notifyPanelClosed, tabId]);

  if (dataLoading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading terms...</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div style={styles.center}>
        <span style={{ fontSize: 32 }}>!</span>
        <p style={styles.errorText}>{dataError}</p>
      </div>
    );
  }

  if (!tabState?.terms) {
    return (
      <div style={styles.center}>
        <span style={{ fontSize: 40 }}>?</span>
        <p style={styles.emptyTitle}>No terms detected.</p>
        <p style={styles.emptyDesc}>Open a page that contains terms to analyze it automatically.</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <style>
        {`
          @keyframes suggestedQuestionFadeIn {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      <div style={styles.header}>
        <span style={styles.headerIcon}>AI</span>
        <span style={styles.headerTitle}>동의보감 : 약관 요약 AI</span>
      </div>

      <div style={styles.contentArea}>
        <section style={styles.summarySection}>
          {summary ? <SummaryCard summary={summary} /> : <SummarySkeleton />}

          {summaryError && (
            <p style={styles.inlineError}>
              {summaryError.code ? `Error (${summaryError.code}): ` : ''}
              {summaryError.message}
            </p>
          )}
        </section>

        <div style={styles.divider} />

        <section style={styles.chatSection}>
          <ChatWindow
            history={history}
            isLoading={chatLoading}
            onRetry={retryMessage}
          />

          {chatError && (
            <div style={styles.errorBanner}>
              <span>
                {chatError.code ? `Error (${chatError.code}): ` : ''}
                {chatError.message}
              </span>
              <button style={styles.errorClose} onClick={clearError}>
                Close
              </button>
            </div>
          )}
        </section>
      </div>

      {suggestedQuestions.length > 0 && (
        <div style={styles.suggestedPanel}>
          <span style={styles.suggestedLabel}>추천 질문</span>
          <div style={styles.suggestedList}>
            {suggestedQuestions.map((question, index) => (
              <div
                key={question}
                style={{
                  ...styles.suggestedItem,
                  animationDelay: `${index * 90}ms`,
                }}
              >
                <button
                  type="button"
                  style={{
                    ...styles.suggestedButton,
                    opacity: chatLoading ? 0.55 : 1,
                    cursor: chatLoading ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => sendUserMessage(question)}
                  disabled={chatLoading}
                >
                  {question}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
  headerIcon: {
    fontSize: 12,
    fontWeight: 800,
    color: '#4f46e5',
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
  },
  summarySection: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  chatSection: {
    flex: 2,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  suggestedPanel: {
    flexShrink: 0,
    borderTop: '1px solid #eef2ff',
    background: '#ffffff',
    padding: '8px 14px 6px',
  },
  suggestedLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#6b7280',
    marginBottom: 7,
  },
  suggestedList: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 6,
  },
  suggestedItem: {
    opacity: 0,
    animation: 'suggestedQuestionFadeIn 240ms ease-out both',
  },
  suggestedButton: {
    width: '100%',
    border: '1px solid #dbeafe',
    borderRadius: 8,
    background: '#f8fbff',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: 12,
    lineHeight: 1.4,
    padding: '7px 9px',
    textAlign: 'left',
    fontFamily: 'inherit',
  },
  divider: {
    height: 1,
    flexShrink: 0,
    background: '#f3f4f6',
    margin: '10px 0 12px',
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
