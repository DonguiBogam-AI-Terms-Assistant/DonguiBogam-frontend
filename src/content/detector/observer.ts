import {
  detectTermsLikeDocument,
  extractRawText,
  shouldStartDetection,
} from './detector';
import { extractTitle } from '../extractor/textExtractor';
import { generateFingerprint } from '@shared/utils';
import type { TermsDocument } from '@shared/types';

const SCAN_DEBOUNCE_MS = 1500;
const MAX_SCAN_COUNT = 5;
const MAX_OBSERVER_LIFETIME_MS = 15000;
const MIN_TEXT_LENGTH = 100;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const detectedFingerprints = new Set<string>();

type OnDetectedCallback = (doc: TermsDocument) => void;

function getSourceUrl(target: Element): string {
  try {
    return target.ownerDocument.location?.href ?? location.href;
  } catch {
    return location.href;
  }
}

function scanCandidates(onDetected: OnDetectedCallback): boolean {
  const result = detectTermsLikeDocument();
  if (!result.detected || !result.targetElement) return false;

  const plainText = extractRawText(result.targetElement);
  if (plainText.length < MIN_TEXT_LENGTH) return false;

  const fingerprint = generateFingerprint(plainText);
  if (detectedFingerprints.has(fingerprint)) return true;

  detectedFingerprints.add(fingerprint);

  const doc: TermsDocument = {
    fingerprint,
    plainText,
    title: extractTitle(result.targetElement),
    sourceUrl: getSourceUrl(result.targetElement),
    score: result.score,
    reasons: result.reasons,
    kind: result.kind,
    confidence: result.confidence,
    presentation: result.presentation,
    detectedAt: Date.now(),
  };

  onDetected(doc);
  return true;
}

function debouncedScan(scan: () => void): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    scan();
  }, SCAN_DEBOUNCE_MS);
}

export function startObserver(onDetected: OnDetectedCallback): void {
  if (!shouldStartDetection()) return;

  let observer: MutationObserver | null = null;
  let lifetimeTimer: ReturnType<typeof setTimeout> | null = null;
  let scanCount = 0;
  const startedAt = Date.now();

  const stopObserving = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (lifetimeTimer !== null) {
      clearTimeout(lifetimeTimer);
      lifetimeTimer = null;
    }
    observer?.disconnect();
    observer = null;
  };

  const canScanAgain = (): boolean =>
    scanCount < MAX_SCAN_COUNT && Date.now() - startedAt < MAX_OBSERVER_LIFETIME_MS;

  const scanAndStopIfDetected = (): void => {
    if (!canScanAgain()) {
      stopObserving();
      return;
    }

    scanCount += 1;

    if (scanCandidates(onDetected) || !canScanAgain()) {
      stopObserving();
    }
  };

  scanAndStopIfDetected();
  if (!canScanAgain()) return;

  observer = new MutationObserver((mutations) => {
    const hasRelevant = mutations.some(
      (m) =>
        m.addedNodes.length > 0 ||
        (m.type === 'attributes' &&
          ['style', 'class', 'hidden', 'aria-hidden'].includes(
            m.attributeName ?? ''
          ))
    );
    if (hasRelevant) debouncedScan(scanAndStopIfDetected);
  });

  lifetimeTimer = setTimeout(stopObserving, MAX_OBSERVER_LIFETIME_MS);

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
