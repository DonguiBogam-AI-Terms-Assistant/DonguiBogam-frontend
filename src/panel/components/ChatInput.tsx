import { useState, useRef, type KeyboardEvent } from 'react';

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // 높이 초기화
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div style={styles.container}>
      <textarea
        ref={textareaRef}
        style={{ ...styles.textarea, opacity: disabled ? 0.5 : 1 }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder="약관에 대해 질문하세요... (Enter 전송)"
        disabled={disabled}
        rows={1}
      />
      <button
        style={{
          ...styles.sendBtn,
          opacity: !value.trim() || disabled ? 0.4 : 1,
          cursor: !value.trim() || disabled ? 'not-allowed' : 'pointer',
        }}
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        aria-label="전송"
      >
        ↑
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    padding: '10px 14px',
    borderTop: '1px solid #e5e7eb',
    background: '#fff',
  },
  textarea: {
    flex: 1,
    resize: 'none',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'inherit',
    lineHeight: 1.5,
    outline: 'none',
    overflowY: 'auto',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    fontSize: 16,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s',
  },
};
