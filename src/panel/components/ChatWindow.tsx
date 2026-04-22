import { useEffect, useRef } from 'react';
import type { ChatTurn } from '@shared/types';

interface Props {
  history: ChatTurn[];
  isLoading: boolean;
}

export function ChatWindow({ history, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  if (history.length === 0 && !isLoading) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>💬</span>
        <p style={styles.emptyText}>약관에 대해 궁금한 점을 물어보세요.</p>
        <p style={styles.emptyHint}>예: "제3자 제공 조항이 있나요?", "보관 기간이 얼마나 되나요?"</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {history.map((turn) => (
        <div
          key={turn.id}
          style={{
            ...styles.bubble,
            ...(turn.role === 'user' ? styles.userBubble : styles.assistantBubble),
          }}
        >
          <p style={styles.bubbleText}>{turn.content}</p>
          <span style={styles.timestamp}>
            {new Date(turn.timestamp).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ))}

      {isLoading && (
        <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
          <span style={styles.typing}>
            <span>●</span><span>●</span><span>●</span>
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '8px 0',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#374151',
    margin: '0 0 4px',
    fontWeight: 500,
  },
  emptyHint: {
    fontSize: 11,
    color: '#9ca3af',
    margin: 0,
    lineHeight: 1.6,
  },
  bubble: {
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: 12,
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
  typing: {
    display: 'flex',
    gap: 4,
    fontSize: 8,
    color: '#9ca3af',
    padding: '4px 0',
  },
};
