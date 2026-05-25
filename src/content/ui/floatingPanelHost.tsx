import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { TermsDocument } from '@shared/types';
import { FloatingPanel } from './FloatingPanel';

const PANEL_ID = 'terms-ai-floating-panel-host';

let hostEl: HTMLElement | null = null;
let mountEl: HTMLDivElement | null = null;
let root: Root | null = null;
let currentTerms: TermsDocument | null = null;
let isPanelMinimized = false;

export function showFloatingPanel(terms: TermsDocument): void {
  currentTerms = terms;
  isPanelMinimized = false;

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
  currentTerms = null;
  isPanelMinimized = false;
  root?.unmount();
  root = null;
  mountEl = null;
  hostEl?.remove();
  hostEl = null;
}

export function toggleFloatingPanel(terms: TermsDocument): void {
  if (hostEl) {
    toggleFloatingPanelMinimized();
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
      <FloatingPanel
        terms={currentTerms}
        isMinimized={isPanelMinimized}
        onToggleMinimized={toggleFloatingPanelMinimized}
        onClose={hideFloatingPanel}
      />
    </StrictMode>
  );
}

function toggleFloatingPanelMinimized(): void {
  if (!hostEl) return;
  isPanelMinimized = !isPanelMinimized;
  renderPanel();
}
