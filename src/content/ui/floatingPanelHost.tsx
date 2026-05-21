import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { TermsDocument } from '@shared/types';
import { FloatingPanel } from './FloatingPanel';

const PANEL_ID = 'terms-ai-floating-panel-host';

let hostEl: HTMLElement | null = null;
let root: Root | null = null;
let currentTerms: TermsDocument | null = null;

export function showFloatingPanel(terms: TermsDocument): void {
  currentTerms = terms;

  if (!hostEl) {
    hostEl = document.createElement('div');
    hostEl.id = PANEL_ID;
    document.body.appendChild(hostEl);
    root = createRoot(hostEl);
  }

  renderPanel();
}

export function hideFloatingPanel(): void {
  currentTerms = null;
  root?.unmount();
  root = null;
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
