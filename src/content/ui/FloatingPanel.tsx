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
  isMinimized: boolean;
  onToggleMinimized: () => void;
  onClose: () => void;
}

const CONTENT_TAB_ID = 0;
const VIEWPORT_MARGIN = 8;
const SUMMARY_DEFAULT_PERCENT = 42;
const SUMMARY_MIN_HEIGHT = 120;
const CHAT_MIN_HEIGHT = 120;

export function FloatingPanel({ terms, isMinimized, onToggleMinimized, onClose }: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingSections, setIsResizingSections] = useState(false);
  const [summaryHeightPercent, setSummaryHeightPercent] = useState(SUMMARY_DEFAULT_PERCENT);
  const [panelOpacity, setPanelOpacity] = useState(1);
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
  const hasConversation = history.length > 0;

  const shellStyle: CSSProperties = {
    ...styles.shell,
    opacity: panelOpacity,
    ...(isMinimized ? styles.minimizedShell : {}),
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

  const updateSummaryHeightFromPointer = useCallback((clientY: number) => {
    if (!bodyRef.current) return;

    const rect = bodyRef.current.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(bodyRef.current);
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const contentTop = rect.top + paddingTop;
    const contentHeight = rect.height - paddingTop - paddingBottom;
    if (contentHeight <= 0) return;

    const minPercent = Math.min(80, (SUMMARY_MIN_HEIGHT / contentHeight) * 100);
    const maxPercent = Math.max(
      minPercent,
      ((contentHeight - CHAT_MIN_HEIGHT) / contentHeight) * 100
    );
    const nextPercent = ((clientY - contentTop) / contentHeight) * 100;

    setSummaryHeightPercent(Math.min(maxPercent, Math.max(minPercent, nextPercent)));
  }, []);

  const handleSectionResizePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      setIsResizingSections(true);
      updateSummaryHeightFromPointer(event.clientY);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [updateSummaryHeightFromPointer]
  );

  const handleSectionResizePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isResizingSections) return;
      event.preventDefault();
      updateSummaryHeightFromPointer(event.clientY);
    },
    [isResizingSections, updateSummaryHeightFromPointer]
  );

  const handleSectionResizePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    setIsResizingSections(false);
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

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleToggleMinimized = useCallback(() => {
    onToggleMinimized();
  }, [onToggleMinimized]);

  useEffect(() => {
    if (!hasConversation) {
      setSummaryHeightPercent(SUMMARY_DEFAULT_PERCENT);
    }
  }, [hasConversation]);

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

          @keyframes conversationAreaEnter {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .terms-ai-opacity-slider {
            width: 54px;
            height: 12px;
            padding: 0;
            margin: 0 2px 0 0;
            background: transparent;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
          }

          .terms-ai-opacity-slider::-webkit-slider-runnable-track {
            height: 1px;
            background: #9ca3af;
            border-radius: 999px;
          }

          .terms-ai-opacity-slider::-webkit-slider-thumb {
            width: 8px;
            height: 8px;
            margin-top: -3.5px;
            border: 1px solid #9ca3af;
            border-radius: 50%;
            background: #f9fafb;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
            appearance: none;
            -webkit-appearance: none;
          }

          .terms-ai-opacity-slider::-moz-range-track {
            height: 1px;
            background: #9ca3af;
            border-radius: 999px;
          }

          .terms-ai-opacity-slider::-moz-range-thumb {
            width: 8px;
            height: 8px;
            border: 1px solid #9ca3af;
            border-radius: 50%;
            background: #f9fafb;
            box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
          }
        `}
      </style>
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
        <div style={styles.headerActions}>
          <input
            type="range"
            min="0.35"
            max="1"
            step="0.05"
            value={panelOpacity}
            className="terms-ai-opacity-slider"
            onChange={(event) => setPanelOpacity(Number(event.currentTarget.value))}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="투명도 조절"
          />
          <button
            type="button"
            style={styles.iconButton}
            onClick={handleToggleMinimized}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={isMinimized ? '최대화' : '최소화'}
          >
            <span
              style={isMinimized ? styles.maximizeIcon : styles.minimizeIcon}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            style={styles.iconButton}
            onClick={handleClose}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="닫기"
          >
            <span style={styles.closeIcon} aria-hidden="true">
              <span style={styles.closeIconLine} />
              <span style={styles.closeIconLineReverse} />
            </span>
          </button>
        </div>
      </header>

      {!isMinimized && (
        <>
          <div
            ref={bodyRef}
            style={{
              ...styles.body,
              ...(isResizingSections ? styles.bodyResizing : {}),
            }}
          >
            <section
              style={{
                ...styles.summaryArea,
                ...(hasConversation
                  ? {
                      ...styles.summaryAreaCompact,
                      height: `${summaryHeightPercent}%`,
                      ...(isResizingSections ? styles.summaryAreaResizing : {}),
                    }
                  : styles.summaryAreaExpanded),
              }}
            >
              {summary ? <SummaryCard summary={summary} /> : <SummarySkeleton />}
              {summaryError && (
                <p style={styles.inlineError}>
                  {summaryError.code ? `Error (${summaryError.code}): ` : ''}
                  {summaryError.message}
                </p>
              )}
            </section>

            {hasConversation && (
              <div style={styles.conversationArea}>
                <div
                  style={{
                    ...styles.sectionResizeHandle,
                    ...(isResizingSections ? styles.sectionResizeHandleActive : {}),
                  }}
                  role="separator"
                  aria-label="AI 요약과 채팅창 크기 조절"
                  aria-orientation="horizontal"
                  aria-valuenow={Math.round(summaryHeightPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  onPointerDown={handleSectionResizePointerDown}
                  onPointerMove={handleSectionResizePointerMove}
                  onPointerUp={handleSectionResizePointerUp}
                  onPointerCancel={handleSectionResizePointerUp}
                >
                  <span style={styles.sectionResizeLine} />
                  <span style={styles.sectionResizeGrip} />
                </div>

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
            )}
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
                      onClick={() => handleSuggestedQuestion(question)}
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
        </>
      )}
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
  minimizedShell: {
    height: 52,
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
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: '20px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  minimizeIcon: {
    display: 'block',
    width: 12,
    height: 2,
    background: '#6b7280',
    borderRadius: 1,
  },
  maximizeIcon: {
    display: 'block',
    width: 11,
    height: 9,
    border: '2px solid #6b7280',
    boxSizing: 'border-box',
  },
  closeIcon: {
    position: 'relative',
    display: 'block',
    width: 13,
    height: 13,
  },
  closeIconLine: {
    position: 'absolute',
    top: 5,
    left: 0,
    width: 14,
    height: 2,
    background: '#6b7280',
    borderRadius: 1,
    transform: 'rotate(45deg)',
    transformOrigin: 'center',
  },
  closeIconLineReverse: {
    position: 'absolute',
    top: 5,
    left: 0,
    width: 14,
    height: 2,
    background: '#6b7280',
    borderRadius: 1,
    transform: 'rotate(-45deg)',
    transformOrigin: 'center',
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
  bodyResizing: {
    cursor: 'row-resize',
    userSelect: 'none',
  },
  summaryArea: {
    height: '100%',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    transition:
      'height 340ms cubic-bezier(0.22, 1, 0.36, 1), min-height 340ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'height',
  },
  summaryAreaCompact: {
    height: '42%',
    minHeight: SUMMARY_MIN_HEIGHT,
  },
  summaryAreaResizing: {
    transition: 'none',
  },
  summaryAreaExpanded: {
    height: '100%',
    minHeight: 0,
  },
  conversationArea: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    animation: 'conversationAreaEnter 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
  },
  sectionResizeHandle: {
    position: 'relative',
    height: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    margin: '2px 0 6px',
    cursor: 'row-resize',
    touchAction: 'none',
    borderRadius: 8,
  },
  sectionResizeHandleActive: {
    background: '#f8fafc',
  },
  sectionResizeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    background: '#e5e7eb',
  },
  sectionResizeGrip: {
    position: 'relative',
    width: 34,
    height: 4,
    borderRadius: 999,
    background: '#c7d2fe',
    boxShadow: '0 0 0 3px #fff',
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
