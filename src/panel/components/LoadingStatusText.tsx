import { useEffect, useState, type CSSProperties } from 'react';

interface Props {
  text: string;
  style?: CSSProperties;
}

export function LoadingStatusText({ text, style }: Props) {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setDotCount((current) => (current >= 4 ? 1 : current + 1));
    }, 420);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes termsAiLoadingTextShimmer {
            0% { background-position: 120% 50%; }
            100% { background-position: -120% 50%; }
          }

          .terms-ai-loading-status-text {
            background-image: linear-gradient(90deg, #4f46e5 0%, #7c3aed 34%, #c4b5fd 50%, #4338ca 66%, #4f46e5 100%);
            background-size: 220% 100%;
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
            animation: termsAiLoadingTextShimmer 1.35s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .terms-ai-loading-status-text {
              animation: none;
              background: none;
              color: #4f46e5;
              -webkit-text-fill-color: currentColor;
            }
          }
        `}
      </style>
      <span style={style} aria-hidden="true">
        <span className="terms-ai-loading-status-text">{text}</span>
        <span className="terms-ai-loading-status-text" style={styles.dots}>
          {` ${'.'.repeat(dotCount)}`}
        </span>
      </span>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  dots: {
    display: 'inline-block',
    width: '2.8em',
    textAlign: 'left',
  },
};
