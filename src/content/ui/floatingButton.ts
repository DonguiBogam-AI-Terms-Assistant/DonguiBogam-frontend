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
      box-shadow: 0 8px 24px rgba(79, 70, 229, 0.42);
      z-index: 2147483647;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 25px;
      font-weight: 700;
      line-height: 1;
    }

    .fab:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(79, 70, 229, 0.52);
    }

    .fab:active {
      transform: translateY(0);
    }

    .badge {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      border: 2px solid #fff;
    }

    .tooltip {
      position: absolute;
      right: 64px;
      top: 50%;
      transform: translateY(-50%);
      background: #111827;
      color: #fff;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 6px 10px;
      border-radius: 7px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    .fab:hover .tooltip {
      opacity: 1;
    }
  </style>

  <button class="fab" id="fab-btn" title="동의보감">
    <span aria-hidden="true">📜</span>
    <span class="badge"></span>
    <span class="tooltip">약관 분석 열기</span>
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
