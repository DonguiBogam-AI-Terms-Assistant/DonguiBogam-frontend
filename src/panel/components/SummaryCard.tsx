import type { SummarizeResponse } from '@shared/types';
import { LoadingStatusText } from './LoadingStatusText';
import { MarkdownContent } from './MarkdownContent';

interface Props {
  summary: SummarizeResponse;
  animateFrom?: number | null;
}

export function SummaryCard({ summary, animateFrom = null }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{'AI \uC694\uC57D'}</span>
      </div>

      <MarkdownContent
        variant="summary"
        animate={animateFrom !== null}
        animateFrom={animateFrom ?? 0}
      >
        {summary.summary}
      </MarkdownContent>
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div
      style={styles.card}
      role="status"
      aria-live="polite"
      aria-label={'\uBB38\uC11C\uB97C \uC77D\uACE0 \uC788\uC5B4\uC694'}
    >
      <style>
        {`
          @keyframes summarySkeletonPulse {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
        `}
      </style>

      <div style={styles.header}>
        <span style={styles.title}>{'AI \uC694\uC57D'}</span>
      </div>
      <LoadingStatusText
        text={'\uBB38\uC11C\uB97C \uC77D\uACE0 \uC788\uC5B4\uC694'}
        style={styles.loadingStatus}
      />
      <div style={styles.skeletonLine} />
      <div style={{ ...styles.skeletonLine, width: '92%' }} />
      <div style={{ ...styles.skeletonLine, width: '78%' }} />
      <div style={styles.skeletonGap} />
      <div style={{ ...styles.skeletonLine, width: '88%' }} />
      <div style={{ ...styles.skeletonLine, width: '64%' }} />
    </div>
  );
}

const skeletonBase: React.CSSProperties = {
  height: 10,
  borderRadius: 999,
  background: 'linear-gradient(90deg, #ede9fe 0%, #f8f7ff 45%, #ddd6fe 70%, #ede9fe 100%)',
  backgroundSize: '200% 100%',
  animation: 'summarySkeletonPulse 1.2s ease-in-out infinite',
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#f8f7ff',
    border: '1px solid #e0e7ff',
    borderRadius: 10,
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '14px 16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontWeight: 800,
    fontSize: 15,
    color: '#4f46e5',
  },
  loadingStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1.4,
    margin: '12px 0 14px',
  },
  skeletonLine: {
    ...skeletonBase,
    width: '100%',
    marginBottom: 10,
  },
  skeletonGap: {
    height: 10,
  },
};
