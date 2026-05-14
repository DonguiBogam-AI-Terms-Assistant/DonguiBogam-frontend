import { startObserver } from './detector/observer';
import { hideFloatingButton, showFloatingButton } from './ui/floatingButton';
import { sendMessage } from '@shared/messages';
import type { TermsDocument } from '@shared/types';

let currentTerms: TermsDocument | null = null;

function handleTermsDetected(doc: TermsDocument): void {
  console.log(`[TermsAI] detected score=${doc.score} fp=${doc.fingerprint}`);

  currentTerms = doc;
  void preparePanelAndShowButton(doc);
}

async function preparePanelAndShowButton(doc: TermsDocument): Promise<void> {
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

  sendMessage({
    type: 'TOGGLE_PANEL',
    payload: { tabId: 0 },
  }).catch((err) => {
    console.warn('[TermsAI] TOGGLE_PANEL failed:', err);
  });
}

try {
  if (chrome.runtime?.id) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'HIDE_BUTTON') {
        hideFloatingButton();
        currentTerms = null;
      }
    });
  }
} catch {
  // The extension was reloaded while this content script was still attached.
}

startObserver(handleTermsDetected);
