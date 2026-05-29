import type { CSSProperties } from 'react';

interface Props {
  questions: string[];
  isLoading?: boolean;
  disabled?: boolean;
  panelStyle?: CSSProperties;
  onSelect: (question: string) => void;
}

const SKELETON_WIDTHS = ['92%', '100%', '84%'] as const;

export function SuggestedQuestionsPanel({
  questions,
  isLoading = false,
  disabled = false,
  panelStyle,
  onSelect,
}: Props) {
  const showSkeleton = isLoading && questions.length === 0;

  if (!showSkeleton && questions.length === 0) return null;

  return (
    <div style={{ ...styles.panel, ...(panelStyle ?? {}) }}>
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

          @keyframes suggestedQuestionSkeletonShimmer {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }
        `}
      </style>

      <span style={styles.label}>추천 질문</span>
      {showSkeleton ? (
        <div style={styles.list} role="status" aria-live="polite" aria-label="추천 질문 생성 중">
          {SKELETON_WIDTHS.map((width, index) => (
            <div key={width} style={styles.skeletonButton}>
              <span
                style={{
                  ...styles.skeletonLine,
                  width,
                  animationDelay: `${index * 110}ms`,
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.list}>
          {questions.map((question, index) => (
            <div
              key={`${question}-${index}`}
              style={{
                ...styles.item,
                animationDelay: `${index * 90}ms`,
              }}
            >
              <button
                type="button"
                style={{
                  ...styles.button,
                  opacity: disabled ? 0.55 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
                onClick={() => onSelect(question)}
                disabled={disabled}
              >
                {question}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const skeletonBase: CSSProperties = {
  background:
    'linear-gradient(90deg, #eef2ff 0%, #f8fbff 36%, #dbeafe 52%, #f8fbff 68%, #eef2ff 100%)',
  backgroundSize: '220% 100%',
  animation: 'suggestedQuestionSkeletonShimmer 1.2s ease-in-out infinite',
};

const styles: Record<string, CSSProperties> = {
  panel: {
    flexShrink: 0,
    borderTop: '1px solid #eef2ff',
    background: '#fff',
    padding: '8px 12px 6px',
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#6b7280',
    marginBottom: 7,
  },
  list: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 6,
  },
  item: {
    opacity: 0,
    animation: 'suggestedQuestionFadeIn 240ms ease-out both',
  },
  button: {
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
  skeletonButton: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minHeight: 33,
    border: '1px solid #dbeafe',
    borderRadius: 8,
    background: '#f8fbff',
    padding: '7px 9px',
    boxSizing: 'border-box',
  },
  skeletonLine: {
    ...skeletonBase,
    display: 'block',
    height: 11,
    borderRadius: 999,
  },
};
