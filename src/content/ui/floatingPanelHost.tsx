import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { TermsDocument } from '@shared/types';
import { sendMessage } from '@shared/messages';
import { FloatingPanel } from './FloatingPanel';

const PANEL_ID = 'terms-ai-floating-panel-host';
const CONTENT_TAB_ID = 0;

let hostEl: HTMLElement | null = null;
let mountEl: HTMLDivElement | null = null;
let root: Root | null = null;
let currentTerms: TermsDocument | null = null;

export function showFloatingPanel(terms: TermsDocument): void {
  currentTerms = terms;

  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = PANEL_ID;
    const shadowRoot = hostEl.attachShadow({ mode: 'open' });
    const resetStyle = document.createElement('style');
    resetStyle.textContent = `
      :host {
        all: initial;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }
    `;
    mountEl = document.createElement('div');
    shadowRoot.append(resetStyle, mountEl);
    document.body.appendChild(hostEl);
    root = createRoot(mountEl);
  }

  renderPanel();
}

export function hideFloatingPanel(): void {
  void sendMessage({
    type: 'CLEAR_CONVERSATION',
    payload: { tabId: CONTENT_TAB_ID },
  }).catch(console.error);

  currentTerms = null;
  root?.unmount();
  root = null;
  mountEl = null;
  hostEl?.remove();
  hostEl = null;
}

export function toggleFloatingPanel(terms: TermsDocument): void {
  if (hostEl) {
    hideFloatingPanel();
    return;
  }

  showFloatingPanel(terms);
}

export function isFloatingPanelVisible(): boolean {
  return hostEl !== null;
}

function renderPanel(): void {
  if (!root || !currentTerms) return;

  root.render(
    <StrictMode>
      <FloatingPanel terms={currentTerms} onClose={hideFloatingPanel} />
    </StrictMode>
  );
}
