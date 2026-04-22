import { scoreElement, DETECTION_THRESHOLD } from './scorer';
import { extractPlainText, extractTitle } from '../extractor/textExtractor';
import { generateFingerprint } from '@shared/utils';
import type { TermsDocument } from '@shared/types';

// 약관 후보 CSS 셀렉터 (우선순위 순)
const CANDIDATE_SELECTORS = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  '.modal',
  '.modal-body',
  '.modal-content',
  '[class*="terms"]',
  '[class*="privacy"]',
  '[class*="agreement"]',
  '[class*="consent"]',
  '[id*="terms"]',
  '[id*="privacy"]',
  '[id*="agreement"]',
  'main',
  'article',
];

const DEBOUNCE_MS = 400;
const MIN_TEXT_LENGTH = 200; // 너무 짧은 텍스트는 약관이 아님

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 이미 감지된 fingerprint 세트 (탭 세션 동안 유지) */
const detectedFingerprints = new Set<string>();

type OnDetectedCallback = (doc: TermsDocument) => void;

function scanCandidates(onDetected: OnDetectedCallback): void {
  const seen = new Set<Element>(); // 같은 요소 중복 처리 방지

  for (const selector of CANDIDATE_SELECTORS) {
    let elements: NodeListOf<Element>;
    try {
      elements = document.querySelectorAll(selector);
    } catch {
      continue;
    }

    elements.forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);

      const score = scoreElement(el);
      if (score < DETECTION_THRESHOLD) return;

      const plainText = extractPlainText(el);
      if (plainText.length < MIN_TEXT_LENGTH) return;

      const fingerprint = generateFingerprint(plainText);
      if (detectedFingerprints.has(fingerprint)) return; // 중복 방지

      detectedFingerprints.add(fingerprint);

      const doc: TermsDocument = {
        fingerprint,
        plainText,
        title: extractTitle(el),
        sourceUrl: location.href,
        score,
        detectedAt: Date.now(),
      };

      onDetected(doc);
    });
  }
}

function debouncedScan(onDetected: OnDetectedCallback): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => scanCandidates(onDetected), DEBOUNCE_MS);
}

export function startObserver(onDetected: OnDetectedCallback): void {
  // 페이지 로드 시 즉시 1회 스캔
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

/** 탭 이동/새로고침 시 상태 초기화용 */
export function resetDetectedFingerprints(): void {
  detectedFingerprints.clear();
}
