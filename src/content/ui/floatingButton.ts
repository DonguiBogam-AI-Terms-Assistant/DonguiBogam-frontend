const BUTTON_ID = 'terms-ai-floating-host';

let hostEl: HTMLElement | null = null;
let onClickCallback: (() => void) | null = null;

const BUTTON_HTML = `
  <style>
    :host { all: initial; }

    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #4f46e5;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.45);
      z-index: 2147483647;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-size: 22px;
      line-height: 1;
    }

    .fab:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.55);
    }

    .fab:active {
      transform: scale(0.96);
    }

    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid #fff;
    }

    .tooltip {
      position: absolute;
      right: 64px;
      top: 50%;
      transform: translateY(-50%);
      background: #1e1b4b;
      color: #fff;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 5px 10px;
      border-radius: 6px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    .fab:hover .tooltip {
      opacity: 1;
    }
  </style>

  <button class="fab" id="fab-btn" title="약관 요약 AI">
    <span>📋</span>
    <span class="badge"></span>
    <span class="tooltip">약관이 감지됐어요</span>
  </button>
`;

export function showFloatingButton(onClick: () => void): void {
  if (hostEl) {
    onClickCallback = onClick;
    return;
  }

  onClickCallback = onClick;

  hostEl = document.createElement('div');
  hostEl.id = BUTTON_ID;

  const shadow = hostEl.attachShadow({ mode: 'closed' });
  shadow.innerHTML = BUTTON_HTML;

  const btn = shadow.getElementById('fab-btn');
  btn?.addEventListener('click', () => {
    onClickCallback?.();
  });

  document.body.appendChild(hostEl);
}

export function hideFloatingButton(): void {
  if (hostEl) {
    hostEl.remove();
    hostEl = null;
    onClickCallback = null;
  }
}

export function isFloatingButtonVisible(): boolean {
  return hostEl !== null;
}
