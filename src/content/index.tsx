import { startObserver } from './detector/observer';
import { hideFloatingButton, showFloatingButton } from './ui/floatingButton';
import { hideFloatingPanel, toggleFloatingPanel } from './ui/floatingPanelHost';
import { sendMessage } from '@shared/messages';
import type { TermsDocument } from '@shared/types';

let currentTerms: TermsDocument | null = null;

function handleTermsDetected(doc: TermsDocument): void {
  console.log(`[TermsAI] detected score=${doc.score} fp=${doc.fingerprint}`);

  currentTerms = doc;
  void prepareFloatingUi(doc);
}

async function prepareFloatingUi(doc: TermsDocument): Promise<void> {
  try {
    await sendMessage({
      type: 'TERMS_DETECTED',
      payload: { terms: doc },
    });
  } catch (err) {
    console.warn('[TermsAI] TERMS_DETECTED failed:', err);
  } finally {
    showFloatingButton(handleButtonClick);
  }
}

function handleButtonClick(): void {
  if (!currentTerms) return;
  toggleFloatingPanel(currentTerms);
}

try {
  if (chrome.runtime?.id) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'HIDE_BUTTON') {
        hideFloatingPanel();
        hideFloatingButton();
        currentTerms = null;
      }
    });
  }
} catch {
  // The extension was reloaded while this content script was still attached.
}

startObserver(handleTermsDetected);
