import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  children: string;
  variant?: 'summary' | 'chat';
}

export function MarkdownContent({ children, variant = 'chat' }: Props) {
  const text = normalizeMarkdownText(children);
  const isChat = variant === 'chat';

  return (
    <div style={isChat ? styles.chatRoot : styles.summaryRoot}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 style={{ ...styles.heading, ...styles.h1 }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ ...styles.heading, ...styles.h2 }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ ...styles.heading, ...styles.h3 }}>{children}</h3>
          ),
          p: ({ children }) => <p style={styles.paragraph}>{children}</p>,
          ul: ({ children }) => <ul style={styles.list}>{children}</ul>,
          ol: ({ children }) => <ol style={{ ...styles.list, ...styles.orderedList }}>{children}</ol>,
          li: ({ children }) => <li style={styles.listItem}>{children}</li>,
          strong: ({ children }) => <strong style={styles.strong}>{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote style={styles.blockquote}>{children}</blockquote>
          ),
          code: ({ children }) => <code style={styles.inlineCode}>{children}</code>,
          pre: ({ children }) => <pre style={styles.codeBlock}>{children}</pre>,
          table: ({ children }) => <table style={styles.table}>{children}</table>,
          th: ({ children }) => <th style={styles.tableHeader}>{children}</th>,
          td: ({ children }) => <td style={styles.tableCell}>{children}</td>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" style={styles.link}>
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function normalizeMarkdownText(value: string): string {
  return decodeBasicHtmlEntities(value)
    .replace(/\\n/g, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/([^\n]) {2,}([-*+] (?=\*\*|\S))/g, '$1\n\n$2')
    .replace(/([.!?]) {2,}(?=[^\s-])/g, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<strong[^>]*>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<b[^>]*>/gi, '**')
    .replace(/<\/b>/gi, '**')
    .replace(/<em[^>]*>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<i[^>]*>/gi, '*')
    .replace(/<\/i>/gi, '*')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

const styles: Record<string, React.CSSProperties> = {
  chatRoot: {
    fontSize: 13,
    lineHeight: 1.6,
    wordBreak: 'break-word',
  },
  summaryRoot: {
    fontSize: 13,
    lineHeight: 1.6,
    color: '#374151',
    wordBreak: 'break-word',
  },
  heading: {
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.45,
    margin: '10px 0 6px',
  },
  h1: {
    fontSize: 15,
  },
  h2: {
    fontSize: 14,
  },
  h3: {
    fontSize: 13,
  },
  paragraph: {
    margin: '0 0 8px',
  },
  list: {
    margin: '0 0 8px',
    paddingLeft: 18,
    listStyleType: 'disc',
    listStylePosition: 'outside',
  },
  orderedList: {
    listStyleType: 'decimal',
  },
  listItem: {
    display: 'list-item',
    margin: '0 0 4px',
  },
  strong: {
    fontWeight: 700,
  },
  blockquote: {
    margin: '6px 0 8px',
    paddingLeft: 10,
    borderLeft: '3px solid #c7d2fe',
    color: '#4b5563',
  },
  inlineCode: {
    background: '#e5e7eb',
    borderRadius: 4,
    padding: '1px 4px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: 12,
  },
  codeBlock: {
    margin: '6px 0 8px',
    padding: 8,
    overflowX: 'auto',
    background: '#111827',
    color: '#f9fafb',
    borderRadius: 6,
    fontSize: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '6px 0 8px',
    fontSize: 12,
  },
  tableHeader: {
    border: '1px solid #d1d5db',
    padding: '4px 6px',
    textAlign: 'left',
    background: '#eef2ff',
  },
  tableCell: {
    border: '1px solid #d1d5db',
    padding: '4px 6px',
    verticalAlign: 'top',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'underline',
  },
};
