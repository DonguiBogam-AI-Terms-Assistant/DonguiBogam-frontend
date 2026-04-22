import { useState } from 'react';
import type { TermsDocument } from '@shared/types';

interface Props {
  terms: TermsDocument;
}

export function TermsPreview({ terms }: Props) {
  const [expanded, setExpanded] = useState(false);

  const preview = terms.plainText.slice(0, 300);
  const hasMore = terms.plainText.length > 300;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>{terms.title}</div>
          <div style={styles.meta}>
            감지 점수 {terms.score}점 · {terms.plainText.length.toLocaleString()}자
          </div>
        </div>
      </div>

      <div style={styles.textBox}>
        <p style={styles.text}>
          {expanded ? terms.plainText : preview}
          {!expanded && hasMore && '...'}
        </p>
        {hasMore && (
          <button style={styles.toggleBtn} onClick={() => setExpanded((v) => !v)}>
            {expanded ? '접기 ▲' : '전문 보기 ▼'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontWeight: 600,
    fontSize: 13,
    color: '#111827',
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    color: '#9ca3af',
  },
  textBox: {
    padding: '12px 14px',
  },
  text: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 1.7,
    margin: '0 0 8px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
    fontWeight: 500,
  },
};
