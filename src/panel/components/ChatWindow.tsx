import { useEffect, useRef } from 'react';
import type { ChatTurn } from '@shared/types';
import { LoadingStatusText } from './LoadingStatusText';
import { MarkdownContent } from './MarkdownContent';

interface Props {
  history: ChatTurn[];
  isLoading: boolean;
  onRetry?: (turn: ChatTurn) => void;
}

export function ChatWindow({ history, isLoading, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const assistantContentLengthsRef = useRef<Map<string, number>>(new Map());
  const hasPendingAssistant = history.some(
    (turn) => turn.role === 'assistant' && turn.status === 'sending'
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  useEffect(() => {
    const nextLengths = new Map<string, number>();

    for (const turn of history) {
      if (turn.role === 'assistant') {
        nextLengths.set(turn.id, turn.content.length);
      }
    }

    assistantContentLengthsRef.current = nextLengths;
  }, [history]);

  if (history.length === 0 && !isLoading) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyContent}>
          <span style={styles.emptyIcon}>{'\uD83D\uDCAC'}</span>
          <p style={styles.emptyText}>{'\uC57D\uAD00\uC5D0 \uB300\uD574 \uAD81\uAE08\uD55C \uC810\uC744 \uBB3C\uC5B4\uBCF4\uC138\uC694'}</p>
          <p style={styles.emptyHint}>
            {'\uC608: "\uC81C3\uC790 \uC81C\uACF5 \uC870\uD56D\uC774 \uC788\uB098\uC694?", "\uBCF4\uAD00 \uAE30\uAC04\uC740 \uC5BC\uB9C8\uB098 \uB418\uB098\uC694?"'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes chatSkeletonShimmer {
            0% {
              background-position: 120% 0;
            }
            100% {
              background-position: -120% 0;
            }
          }

          @keyframes chatMessageFadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes chatWordFadeIn {
            from {
              opacity: 0;
              filter: blur(2px);
            }
            to {
              opacity: 1;
              filter: blur(0);
            }
          }

          .terms-ai-message-enter {
            opacity: 0;
            transform: translateY(8px);
            animation: chatMessageFadeIn 200ms ease-out forwards;
          }

          .terms-ai-fade-word {
            opacity: 0;
            filter: blur(2px);
            animation: chatWordFadeIn 160ms ease-out forwards;
          }

          @media (prefers-reduced-motion: reduce) {
            .terms-ai-message-enter,
            .terms-ai-fade-word {
              animation: none;
              opacity: 1;
              transform: none;
              filter: none;
            }
          }
        `}
      </style>

      {history.map((turn) => {
        const isPendingAssistant =
          turn.role === 'assistant' && turn.status === 'sending' && !turn.content.trim();
        const previousAssistantContentLength =
          turn.role === 'assistant' ? assistantContentLengthsRef.current.get(turn.id) : undefined;
        const animateFrom = previousAssistantContentLength ?? 0;
        const shouldAnimateAssistantContent =
          turn.role === 'assistant' &&
          !isPendingAssistant &&
          turn.content.length > animateFrom &&
          (turn.status === 'sending' || previousAssistantContentLength !== undefined);

        return (
          <div
            key={turn.id}
            className={!isPendingAssistant ? 'terms-ai-message-enter' : undefined}
            style={{
              ...styles.bubble,
              ...(turn.role === 'user' ? styles.userBubble : styles.assistantBubble),
              ...(isPendingAssistant ? styles.skeletonBubble : {}),
            }}
          >
            {isPendingAssistant ? (
              <AssistantSkeleton />
            ) : turn.role === 'assistant' ? (
              <MarkdownContent animate={shouldAnimateAssistantContent} animateFrom={animateFrom}>
                {turn.content}
              </MarkdownContent>
            ) : (
              <p style={styles.bubbleText}>{turn.content}</p>
            )}
            {turn.role === 'user' && turn.status === 'failed' && (
              <button type="button" style={styles.retryButton} onClick={() => onRetry?.(turn)}>
                Retry
              </button>
            )}
            {!isPendingAssistant && (
              <span style={styles.timestamp}>
                {new Date(turn.timestamp).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        );
      })}

      {isLoading && !hasPendingAssistant && (
        <div style={{ ...styles.bubble, ...styles.assistantBubble, ...styles.skeletonBubble }}>
          <AssistantSkeleton />
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function AssistantSkeleton() {
  return (
    <div
      style={styles.skeletonStack}
      role="status"
      aria-live="polite"
      aria-label={'\uAD00\uB828 \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694'}
    >
      <LoadingStatusText
        text={'\uAD00\uB828 \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694'}
        style={styles.skeletonStatus}
      />
      <span style={{ ...styles.skeletonLine, width: '78%' }} />
      <span style={{ ...styles.skeletonLine, width: '94%' }} />
      <span style={{ ...styles.skeletonLine, width: '56%' }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '8px 0',
    boxSizing: 'border-box',
  },
  empty: {
    position: 'relative',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    padding: '12px 16px',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  emptyContent: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100%',
    transform: 'translate(-50%, -50%)',
    padding: '0 16px',
    boxSizing: 'border-box',
  },
  emptyIcon: {
    fontSize: 28,
    lineHeight: 1,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#374151',
    margin: '0 0 6px',
    fontWeight: 500,
  },
  emptyHint: {
    fontSize: 11,
    color: '#9ca3af',
    margin: 0,
    lineHeight: 1.5,
  },
  bubble: {
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: 12,
    boxSizing: 'border-box',
    wordBreak: 'break-word',
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: '#4f46e5',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    background: '#f3f4f6',
    color: '#111827',
    borderBottomLeftRadius: 4,
  },
  skeletonBubble: {
    width: '76%',
    maxWidth: '76%',
    padding: '13px 14px',
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  skeletonStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '1px 0',
  },
  skeletonStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.4,
    marginBottom: 2,
  },
  skeletonLine: {
    display: 'block',
    height: 10,
    borderRadius: 999,
    background:
      'linear-gradient(90deg, #e5e7eb 0%, #eef2ff 34%, #c7d2fe 50%, #eef2ff 66%, #e5e7eb 100%)',
    backgroundSize: '240% 100%',
    animation: 'chatSkeletonShimmer 1.25s ease-in-out infinite',
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 1.6,
    margin: '0 0 4px',
    whiteSpace: 'pre-wrap',
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.6,
    display: 'block',
    textAlign: 'right',
  },
  retryButton: {
    display: 'block',
    marginTop: 6,
    marginLeft: 'auto',
    padding: '3px 8px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.65)',
    background: 'rgba(255,255,255,0.16)',
    color: '#fff',
    fontSize: 11,
    cursor: 'pointer',
  },
};
