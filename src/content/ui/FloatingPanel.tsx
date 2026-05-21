import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import type { TabState, TermsDocument } from '@shared/types';
import { useChat } from '../../panel/hooks/useChat';
import { useSummarize } from '../../panel/hooks/useSummarize';
import { SummaryCard, SummarySkeleton } from '../../panel/components/SummaryCard';
import { ChatWindow } from '../../panel/components/ChatWindow';
import { ChatInput } from '../../panel/components/ChatInput';
import { sendMessage } from '@shared/messages';

interface Props {
  terms: TermsDocument;
  onClose: () => void;
}

const CONTENT_TAB_ID = 0;
const VIEWPORT_MARGIN = 8;

export function FloatingPanel({ terms, onClose }: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tabState, setTabState] = useState<TabState | null>(null);

  const {
    history,
    isLoading: chatLoading,
    error: chatError,
    sendUserMessage,
    retryMessage,
    clearError,
  } = useChat(CONTENT_TAB_ID, tabState?.chatHistory ?? [], tabState?.sessionId ?? null);
  const { summary, isLoading: summaryLoading, error: summaryError, requestSummary } =
    useSummarize(CONTENT_TAB_ID);

  const suggestedQuestions = useMemo(() => {
    const latestAssistantQuestions = [...history]
      .reverse()
      .find((turn) => turn.role === 'assistant' && turn.suggestedQuestions?.length)
      ?.suggestedQuestions;

    return latestAssistantQuestions ?? summary?.suggested_questions ?? [];
  }, [history, summary?.suggested_questions]);

  const shellStyle: CSSProperties = {
    ...styles.shell,
    ...(panelPosition
      ? {
          left: panelPosition.left,
          top: panelPosition.top,
          right: 'auto',
          bottom: 'auto',
        }
      : {}),
  };

  const handleHeaderPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !shellRef.current) return;
    if ((event.target as HTMLElement).closest('button')) return;

    const rect = shellRef.current.getBoundingClientRect();
    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    setPanelPosition({ left: rect.left, top: rect.top });
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleHeaderPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (!dragRef.current || !shellRef.current) return;

    const rect = shellRef.current.getBoundingClientRect();
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN);
    const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN);
    const nextLeft = Math.min(
      Math.max(VIEWPORT_MARGIN, event.clientX - dragRef.current.offsetX),
      maxLeft
    );
    const nextTop = Math.min(
      Math.max(VIEWPORT_MARGIN, event.clientY - dragRef.current.offsetY),
      maxTop
    );

    setPanelPosition({ left: nextLeft, top: nextTop });
  }, []);

  const handleHeaderPointerUp = useCallback((event: PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      if (!chatLoading) {
        void sendUserMessage(question);
      }
    },
    [chatLoading, sendUserMessage]
  );

  useEffect(() => {
    if (!summary && !summaryLoading && !summaryError) {
      void requestSummary();
    }
  }, [requestSummary, summary, summaryError, summaryLoading, terms.fingerprint]);

  useEffect(() => {
    let closed = false;

    void sendMessage({
      type: 'PANEL_OPENED',
      payload: { tabId: CONTENT_TAB_ID },
    }).catch(console.error);

    void sendMessage({
      type: 'PANEL_READY',
      payload: { tabId: CONTENT_TAB_ID },
    })
      .then((response) => {
        if (!closed && response?.type === 'TERMS_DATA') {
          setTabState(response.payload.tabState);
        }
      })
      .catch(console.error);

    return () => {
      closed = true;
      void sendMessage({
        type: 'PANEL_CLOSED',
        payload: { tabId: CONTENT_TAB_ID },
      }).catch(console.error);
    };
  }, [terms.fingerprint]);

  return (
    <div ref={shellRef} style={shellStyle}>
      <header
        style={{
          ...styles.header,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
      >
        <div style={styles.brand}>
          <span style={styles.logo} aria-hidden="true">
            📜
          </span>
          <div>
            <div style={styles.title}>동의보감</div>
            <div style={styles.subtitle}>{terms.title || '약관 분석'}</div>
          </div>
        </div>
        <button
          type="button"
          style={styles.iconButton}
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="닫기"
        >
          ×
        </button>
      </header>

      <div style={styles.body}>
        <section style={styles.summaryArea}>
          {summary ? <SummaryCard summary={summary} /> : <SummarySkeleton />}
          {summaryError && (
            <p style={styles.inlineError}>
              {summaryError.code ? `Error (${summaryError.code}): ` : ''}
              {summaryError.message}
            </p>
          )}
        </section>

        <div style={styles.sectionDivider} />

        <section style={styles.chatArea}>
          <ChatWindow history={history} isLoading={chatLoading} onRetry={retryMessage} />
          {chatError && (
            <div style={styles.errorBanner}>
              <span>
                {chatError.code ? `Error (${chatError.code}): ` : ''}
                {chatError.message}
              </span>
              <button type="button" style={styles.errorClose} onClick={clearError}>
                닫기
              </button>
            </div>
          )}
        </section>
      </div>

      {suggestedQuestions.length > 0 && (
        <div style={styles.suggestedPanel}>
          <span style={styles.suggestedLabel}>추천 질문</span>
          <div style={styles.suggestedList}>
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                style={{
                  ...styles.suggestedButton,
                  opacity: chatLoading ? 0.55 : 1,
                  cursor: chatLoading ? 'not-allowed' : 'pointer',
                }}
                onClick={() => handleSuggestedQuestion(question)}
                disabled={chatLoading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <ChatInput onSend={sendUserMessage} disabled={chatLoading} />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    position: 'fixed',
    right: 22,
    bottom: 92,
    width: 420,
    height: 'min(720px, calc(100vh - 116px))',
    maxWidth: 'calc(100vw - 32px)',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    color: '#111827',
    border: '1px solid #dfe3ea',
    borderRadius: 12,
    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.22)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    zIndex: 2147483647,
  },
  header: {
    height: 52,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '9px 10px 9px 12px',
    borderBottom: '1px solid #e5e7eb',
    boxSizing: 'border-box',
    background: '#fff',
    userSelect: 'none',
    touchAction: 'none',
  },
  brand: {
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    pointerEvents: 'none',
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eef2ff',
    color: '#4f46e5',
    fontSize: 18,
    flexShrink: 0,
  },
  title: {
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: 800,
    color: '#111827',
  },
  subtitle: {
    maxWidth: 300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 11,
    lineHeight: 1.3,
    color: '#6b7280',
  },
  iconButton: {
    width: 28,
    height: 28,
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 22,
    lineHeight: '24px',
  },
  body: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '10px 12px',
    boxSizing: 'border-box',
    background: '#fff',
  },
  summaryArea: {
    flex: '0 0 42%',
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  sectionDivider: {
    height: 1,
    background: '#e5e7eb',
    flexShrink: 0,
    margin: '10px 0',
  },
  chatArea: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  suggestedPanel: {
    flexShrink: 0,
    borderTop: '1px solid #eef2ff',
    background: '#fff',
    padding: '8px 12px 6px',
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
  inlineError: {
    fontSize: 12,
    color: '#dc2626',
    margin: '8px 0 0',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '8px 10px',
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
    flexShrink: 0,
  },
};
