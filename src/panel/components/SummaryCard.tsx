import type { SummarizeResponse } from '@shared/types';

interface Props {
  summary: SummarizeResponse;
}

export function SummaryCard({ summary }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>AI 요약</span>
      </div>

      <p style={styles.summaryText}>{summary.summary}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#f8f7ff',
    border: '1px solid #e0e7ff',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontWeight: 600,
    fontSize: 13,
    color: '#4f46e5',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 99,
  },
  summaryText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.6,
    margin: '0 0 10px',
  },
  keyPoints: {
    margin: 0,
    padding: '0 0 0 16px',
  },
  keyPoint: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 1.7,
  },
};
