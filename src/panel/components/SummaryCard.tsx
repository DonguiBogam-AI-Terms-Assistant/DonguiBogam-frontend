import type { CSSProperties, ReactNode } from 'react';
import type { SummarizeResponse } from '@shared/types';

interface Props {
  summary: SummarizeResponse;
}

export function SummaryCard({ summary }: Props) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.title}>{'AI \uC694\uC57D'}</span>
      </div>

      <div style={styles.summaryBody}>{renderMarkdown(summary.summary)}</div>
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div style={styles.card}>
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
      <div style={styles.skeletonTitle} />
      <div style={styles.skeletonLine} />
      <div style={{ ...styles.skeletonLine, width: '92%' }} />
      <div style={{ ...styles.skeletonLine, width: '78%' }} />
      <div style={styles.skeletonGap} />
      <div style={{ ...styles.skeletonLine, width: '88%' }} />
      <div style={{ ...styles.skeletonLine, width: '64%' }} />
    </div>
  );
}

function renderMarkdown(markdown: string): ReactNode[] {
  return markdown.replace(/\\n/g, '\n').split('\n').map((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={index} style={styles.lineBreak} />;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      return (
        <div key={index} style={{ ...styles.heading, ...headingStyles[level] }}>
          {renderInlineMarkdown(heading[2])}
        </div>
      );
    }

    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      return (
        <div key={index} style={styles.bulletRow}>
          <span style={styles.bulletMark}>{'\u2022'}</span>
          <span>{renderInlineMarkdown(bullet[1])}</span>
        </div>
      );
    }

    return (
      <p key={index} style={styles.summaryText}>
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, index) => {
    const bold = /^(\*\*|__)(.+)\1$/.exec(part);
    if (bold) {
      return <strong key={index}>{bold[2]}</strong>;
    }

    return part;
  });
}

const headingStyles: Record<number, CSSProperties> = {
  1: { fontSize: 16 },
  2: { fontSize: 14 },
  3: { fontSize: 13 },
};

const skeletonBase: CSSProperties = {
  height: 10,
  borderRadius: 999,
  background: 'linear-gradient(90deg, #ede9fe 0%, #f8f7ff 45%, #ddd6fe 70%, #ede9fe 100%)',
  backgroundSize: '200% 100%',
  animation: 'summarySkeletonPulse 1.2s ease-in-out infinite',
};

const styles: Record<string, CSSProperties> = {
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
    fontWeight: 600,
    fontSize: 13,
    color: '#4f46e5',
  },
  summaryBody: {
    color: '#374151',
  },
  heading: {
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.5,
    margin: '12px 0 6px',
  },
  summaryText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.6,
    margin: '0 0 8px',
  },
  lineBreak: {
    height: 8,
  },
  bulletRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'flex-start',
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: 6,
  },
  bulletMark: {
    color: '#4f46e5',
    lineHeight: 1.6,
  },
  skeletonTitle: {
    ...skeletonBase,
    width: '46%',
    height: 14,
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
