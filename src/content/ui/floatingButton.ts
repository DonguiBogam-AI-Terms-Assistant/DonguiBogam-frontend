import { getExtensionIconUrl } from '@shared/utils';

const BUTTON_ID = 'terms-ai-floating-host';
const ICON_URL = getExtensionIconUrl();

let hostEl: HTMLElement | null = null;
let onClickCallback: (() => void) | null = null;

const BUTTON_HTML = `
  <style>
    :host { all: initial; }

    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.24);
      overflow: hidden;
      z-index: 2147483647;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1;
    }

    .fab:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.3);
    }

    .fab:active {
      transform: translateY(0);
    }

    .fab-icon {
      display: block;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      transform: scale(1.08);
    }

    .tooltip {
      position: absolute;
      right: 68px;
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
    <img class="fab-icon" src="${ICON_URL}" alt="" aria-hidden="true" />
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
