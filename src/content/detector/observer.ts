import {
  detectTermsLikeDocument,
  extractRawHtml,
  extractRawText,
} from './detector';
import { extractTitle } from '../extractor/textExtractor';
import { generateFingerprint } from '@shared/utils';
import type { TermsDocument } from '@shared/types';

const DEBOUNCE_MS = 400;
const MIN_TEXT_LENGTH = 100;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const detectedFingerprints = new Set<string>();

type OnDetectedCallback = (doc: TermsDocument) => void;

function scanCandidates(onDetected: OnDetectedCallback): void {
  const result = detectTermsLikeDocument();
  if (!result.detected || !result.targetElement) return;

  const plainText = extractRawText(result.targetElement);
  if (plainText.length < MIN_TEXT_LENGTH) return;

  const fingerprint = generateFingerprint(plainText);
  if (detectedFingerprints.has(fingerprint)) return;

  detectedFingerprints.add(fingerprint);

  const doc: TermsDocument = {
    fingerprint,
    plainText,
    rawHtml: extractRawHtml(result.targetElement),
    title: extractTitle(result.targetElement),
    sourceUrl: location.href,
    score: result.score,
    reasons: result.reasons,
    guessedType: result.guessedType,
    detectedAt: Date.now(),
  };

  onDetected(doc);
}

function debouncedScan(onDetected: OnDetectedCallback): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => scanCandidates(onDetected), DEBOUNCE_MS);
}

export function startObserver(onDetected: OnDetectedCallback): void {
  scanCandidates(onDetected);

  const observer = new MutationObserver((mutations) => {
    const hasRelevant = mutations.some(
      (m) =>
        m.addedNodes.length > 0 ||
        (m.type === 'attributes' &&
          ['style', 'class', 'hidden', 'aria-hidden'].includes(
            m.attributeName ?? ''
          ))
    );
    if (hasRelevant) debouncedScan(onDetected);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden', 'aria-hidden', 'display'],
  });
}

export function resetDetectedFingerprints(): void {
  detectedFingerprints.clear();
}
