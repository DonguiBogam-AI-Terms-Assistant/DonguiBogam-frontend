export type GuessedDocumentType =
  | 'TERMS'
  | 'PRIVACY'
  | 'CONSENT'
  | 'POLICY_OTHER'
  | 'UNKNOWN';

export interface DetectionResult {
  detected: boolean;
  score: number;
  targetElement: Element | null;
  reasons: string[];
  /**
   * Backend routing must not depend on this value. It is only for debugging,
   * logs, and future UI copy improvements.
   */
  guessedType?: GuessedDocumentType;
}

export interface TermsPayload {
  url: string;
  title: string;
  rawText: string;
  rawHtml?: string;
  detectedScore: number;
  reasons: string[];
  guessedType?: GuessedDocumentType;
}

interface CandidateScore {
  score: number;
  reasons: string[];
  guessedType: GuessedDocumentType;
}

const DETECTION_THRESHOLD = 65;
const MIN_CANDIDATE_TEXT_LENGTH = 80;
const MAX_CANDIDATES = 160;

const CANDIDATE_SELECTOR = [
  'main',
  'article',
  'section',
  '[role="main"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  'div[id]',
  'div[class]',
].join(',');

const EXCLUDED_SELECTOR = [
  'header',
  'footer',
  'nav',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
].join(',');

const WEAK_AREA_PATTERN =
  /(^|[-_\s])(gnb|lnb|nav|menu|footer|header|sidebar|side|language|lang|breadcrumb|quick|toolbar|search|faq)([-_\s]|$)/i;

const TARGET_TITLE_PATTERN =
  /서비스\s*이용약관|이용약관|서비스\s*약관|개인정보\s*처리방침|개인정보처리방침|개인정보\s*수집\s*및\s*이용\s*동의|개인정보\s*제3자\s*제공\s*동의|제3자\s*제공\s*동의|privacy policy|terms of service|terms and conditions/i;

const TERMS_STRUCTURE_PATTERN =
  /제\s*\d+\s*조|제\s*\d+\s*장|목적|정의|서비스의\s*이용|이용계약|회원가입|회사의\s*의무|회원의\s*의무|이용자의\s*의무|게시물|저작권|서비스\s*이용\s*제한|계약해지|손해배상|면책|분쟁|준거법|재판관할|시행일/g;

const PRIVACY_STRUCTURE_PATTERN =
  /개인정보의\s*수집|수집하는\s*개인정보|수집\s*및\s*이용|수집·이용|처리\s*목적|처리\s*항목|보유\s*및\s*이용기간|제3자\s*제공|개인정보\s*제3자\s*제공|처리위탁|수탁사|위탁\s*업무|국외\s*이전|파기|정보주체|이용자\s*권리|동의\s*철회|거부권|쿠키|자동\s*수집|개인정보\s*보호책임자|법정대리인/g;

const CONSENT_CONTEXT_PATTERN =
  /전체\s*동의|필수\s*동의|선택\s*동의|동의합니다|동의하기|개인정보\s*수집\s*및\s*이용|개인정보\s*제3자\s*제공|제3자\s*제공\s*동의|마케팅\s*정보\s*수신/i;

const TABLE_HEADER_PATTERN =
  /수집\s*항목|이용\s*목적|보유\s*기간|수탁사|위탁\s*업무|제공받는\s*자|처리\s*항목/i;

const FALSE_POSITIVE_PATTERN =
  /청소년보호정책|운영정책|스팸메일정책|검색결과\s*수집|정보보호\s*인증|책임의\s*한계|법적\s*고지|실명확인|FAQ|기술|개요/gi;

const URL_HINT_PATTERN =
  /terms|privacy|policy|agreement|consent|tos|eula/i;

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function visibleText(el: Element | null): string {
  if (!el) return '';
  try {
    const text = 'innerText' in el ? (el as HTMLElement).innerText : el.textContent;
    return normalizeText(text ?? '');
  } catch {
    return normalizeText(el.textContent ?? '');
  }
}

function getIdentityText(el: Element): string {
  return [
    el.tagName,
    el.id,
    el.className,
    el.getAttribute('role'),
    el.getAttribute('aria-label'),
  ]
    .filter(Boolean)
    .join(' ');
}

function isVisible(el: Element): boolean {
  try {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      el.getAttribute('aria-hidden') !== 'true' &&
      rect.width > 0 &&
      rect.height > 0
    );
  } catch {
    return true;
  }
}

function isWeakLayoutArea(el: Element): boolean {
  try {
    if (el.closest(EXCLUDED_SELECTOR)) return true;
    return WEAK_AREA_PATTERN.test(getIdentityText(el));
  } catch {
    return false;
  }
}

function countMatches(text: string, pattern: RegExp): number {
  try {
    return text.match(pattern)?.length ?? 0;
  } catch {
    return 0;
  }
}

function hasConsentControlContext(el: Element): boolean {
  try {
    const controls = el.querySelectorAll('input[type="checkbox"], label, button, a');
    return Array.from(controls).some((control) => {
      const scope =
        control.closest('label, li, p, div, section, article, tr') ?? control;
      const text = visibleText(scope);
      return CONSENT_CONTEXT_PATTERN.test(text);
    });
  } catch {
    return false;
  }
}

function hasStrongTableSignal(el: Element): boolean {
  try {
    const cells = el.querySelectorAll('th, td, caption');
    return Array.from(cells).some((cell) => TABLE_HEADER_PATTERN.test(visibleText(cell)));
  } catch {
    return false;
  }
}

function guessType(text: string, reasons: string[]): GuessedDocumentType {
  if (reasons.some((reason) => reason.includes('consent_ui'))) return 'CONSENT';
  if (/개인정보|privacy|제3자|수집|처리위탁|수탁사|정보주체/i.test(text)) {
    return 'PRIVACY';
  }
  if (/이용약관|서비스\s*약관|terms of service|terms and conditions|제\s*\d+\s*조/i.test(text)) {
    return 'TERMS';
  }
  if (/정책|policy/i.test(text)) return 'POLICY_OTHER';
  return 'UNKNOWN';
}

export function getCandidateElements(): Element[] {
  const candidates: Element[] = [];
  const seen = new Set<Element>();

  try {
    document.querySelectorAll(CANDIDATE_SELECTOR).forEach((el) => {
      if (seen.has(el) || !isVisible(el)) return;
      seen.add(el);

      const text = visibleText(el);
      const hasControlContext = hasConsentControlContext(el);
      if (text.length < MIN_CANDIDATE_TEXT_LENGTH && !hasControlContext) return;

      candidates.push(el);
    });
  } catch {
    return [];
  }

  return candidates
    .sort((a, b) => visibleText(b).length - visibleText(a).length)
    .slice(0, MAX_CANDIDATES);
}

export function scoreCandidate(el: Element): CandidateScore {
  let score = 0;
  const reasons: string[] = [];

  try {
    const text = visibleText(el);
    const headingText = visibleText(el.querySelector('h1, h2, h3, [role="heading"]'));
    const identityText = getIdentityText(el);
    const termsCount = countMatches(text, TERMS_STRUCTURE_PATTERN);
    const privacyCount = countMatches(text, PRIVACY_STRUCTURE_PATTERN);
    const falsePositiveCount = countMatches(text, FALSE_POSITIVE_PATTERN);

    if (TARGET_TITLE_PATTERN.test(headingText)) {
      score += 30;
      reasons.push('target_heading');
    }
    if (TARGET_TITLE_PATTERN.test(text.slice(0, 1200))) {
      score += 18;
      reasons.push('target_text_near_top');
    }
    if (/terms|privacy|policy|agreement|consent/i.test(identityText)) {
      score += 12;
      reasons.push('semantic_id_or_class');
    }
    if (URL_HINT_PATTERN.test(location.href)) {
      score += 5;
      reasons.push('url_hint');
    }
    if (termsCount >= 4) {
      score += Math.min(25, 10 + termsCount * 2);
      reasons.push(`terms_structure:${termsCount}`);
    }
    if (privacyCount >= 3) {
      score += Math.min(30, 12 + privacyCount * 2);
      reasons.push(`privacy_structure:${privacyCount}`);
    }
    if (hasStrongTableSignal(el)) {
      score += 24;
      reasons.push('privacy_table_headers');
    }
    if (hasConsentControlContext(el)) {
      score += 24;
      reasons.push('consent_ui_context');
    }
    if (text.length > 1500) {
      score += 10;
      reasons.push('long_form_text');
    }
    if (el.matches('main, article, [role="main"]')) {
      score += 12;
      reasons.push('main_content_container');
    }
    if (el.matches('[role="dialog"], [aria-modal="true"]')) {
      score += 10;
      reasons.push('dialog_container');
    }
    if (isWeakLayoutArea(el)) {
      score -= 35;
      reasons.push('weak_layout_area_penalty');
    }
    if (falsePositiveCount > 0) {
      score -= Math.min(25, falsePositiveCount * 8);
      reasons.push(`false_positive_terms:${falsePositiveCount}`);
    }
    if (text.length < 180 && !hasConsentControlContext(el)) {
      score -= 20;
      reasons.push('too_short_penalty');
    }

    return {
      score: Math.max(0, score),
      reasons,
      guessedType: guessType(`${headingText}\n${text}`, reasons),
    };
  } catch {
    return { score: 0, reasons: ['scoring_error'], guessedType: 'UNKNOWN' };
  }
}

export function detectTermsLikeDocument(): DetectionResult {
  let best: DetectionResult = {
    detected: false,
    score: 0,
    targetElement: null,
    reasons: [],
    guessedType: 'UNKNOWN',
  };

  try {
    for (const el of getCandidateElements()) {
      const candidate = scoreCandidate(el);
      if (candidate.score > best.score) {
        best = {
          detected: false,
          score: candidate.score,
          targetElement: el,
          reasons: candidate.reasons,
          guessedType: candidate.guessedType,
        };
      }
    }

    const hasNonUrlSignal = best.reasons.some((reason) => reason !== 'url_hint');
    return {
      ...best,
      detected: best.score >= DETECTION_THRESHOLD && hasNonUrlSignal,
    };
  } catch {
    return {
      detected: false,
      score: 0,
      targetElement: null,
      reasons: ['detection_error'],
      guessedType: 'UNKNOWN',
    };
  }
}

export function extractRawText(el?: Element | null): string {
  return visibleText(el ?? document.body);
}

export function extractRawHtml(el?: Element | null): string {
  try {
    return (el ?? document.body).outerHTML;
  } catch {
    return document.body?.outerHTML ?? '';
  }
}

export function buildTermsPayload(result: DetectionResult): TermsPayload {
  const target = result.targetElement ?? document.body;
  return {
    url: location.href,
    title: document.title,
    rawText: extractRawText(target),
    rawHtml: extractRawHtml(target),
    detectedScore: result.score,
    reasons: result.reasons,
    guessedType: result.guessedType,
  };
}
