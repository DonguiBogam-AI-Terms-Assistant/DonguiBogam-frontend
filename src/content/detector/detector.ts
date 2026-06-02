export type DocumentKind = 'CORE' | 'POLICY_NOTICE' | 'UNKNOWN';
export type DetectionConfidence = 'high' | 'medium' | 'low';
export type DetectionPresentation = 'modal' | 'floating' | 'silent';

export interface DetectionResult {
  detected: boolean;
  score: number;
  targetElement: Element | null;
  reasons: string[];
  kind: DocumentKind;
  confidence: DetectionConfidence;
  presentation: DetectionPresentation;
}

export interface TermsPayload {
  url: string;
  title: string;
  rawText: string;
  detectedScore: number;
  reasons: string[];
  kind: DocumentKind;
  confidence: DetectionConfidence;
  presentation: DetectionPresentation;
}

interface DetectionContext {
  titleContext: string;
  hasCoreTitle: boolean;
  hasPolicyNoticeTitle: boolean;
  hasLegalUrl: boolean;
  hasPolicyNoticeUrl: boolean;
}

interface CandidateScore {
  score: number;
  reasons: string[];
  kind: DocumentKind;
  confidence: DetectionConfidence;
  presentation: DetectionPresentation;
}

const SHOW_POLICY_NOTICE_AS_MODAL = true;

const CORE_HIGH_THRESHOLD = 75;
const CORE_MEDIUM_THRESHOLD = 65;
const POLICY_NOTICE_HIGH_THRESHOLD = 75;
const POLICY_NOTICE_MEDIUM_THRESHOLD = 60;

const MIN_CANDIDATE_TEXT_LENGTH = 80;
const MAX_CANDIDATES = 100;
const MAX_ELEMENT_TEXT_LENGTH = 12000;
const MAX_BODY_TEXT_LENGTH = 120000;
const MAX_HEADING_COUNT = 20;
const MAX_IMAGE_ALT_COUNT = 20;

const HIGH_CHURN_HOST =
  /youtube\.com|youtu\.be|chatgpt\.com|x\.com|twitter\.com|facebook\.com|instagram\.com|reddit\.com/i;

const LEGAL_URL_HINT =
  /\/(?:policy|terms|privacy|legal|rules|agreement|consent|notice)(?:\/|$|[?#])|service\.html|privacy\.html|disclaimer\.html|search_policy\.html/i;

const LEGAL_TITLE_HINT =
  /이용약관|서비스\s*약관|개인정보\s*처리방침|개인정보처리방침|개인정보\s*수집|제\s*3\s*자\s*제공|제3자\s*제공|정보보호\s*인증|책임의\s*한계|법적\s*고지|청소년보호정책|스팸메일정책|검색결과\s*수집에\s*대한\s*정책|운영정책|privacy policy|terms of service|terms and conditions/i;

const CORE_TITLE_PATTERN =
  /이용약관|서비스\s*약관|개인정보\s*처리방침|개인정보처리방침|개인정보\s*수집\s*(?:및|·|ㆍ)?\s*이용\s*동의|개인정보\s*수집|개인정보\s*제\s*3\s*자\s*제공\s*동의|개인정보\s*제3자\s*제공\s*동의|제\s*3\s*자\s*제공\s*동의|제3자\s*제공\s*동의|privacy policy|terms of service|terms and conditions/i;

const POLICY_NOTICE_TITLE_PATTERN =
  /정보보호\s*인증|SOC\s*인증|APEC\s*CBPR\s*인증|책임의\s*한계와\s*법적\s*고지|책임의한계와\s*법적\s*고지|책임의\s*한계|법적\s*고지|검색결과\s*수집에\s*대한\s*정책|검색결과의\s*수집|청소년보호정책|스팸메일정책|운영정책/i;

const TERMS_STRUCTURE_PATTERN =
  /제\s*\d+\s*조|제\s*\d+\s*장|목적|정의|서비스의\s*이용|서비스\s*이용|이용계약|회원\s*가입|회원가입|회사의\s*의무|회원의\s*의무|이용자의\s*의무|게시물|콘텐츠|저작권|서비스\s*이용\s*제한|이용\s*제한|계약\s*해지|계약해지|손해배상|면책|광고|분쟁|준거법|재판관할|시행일|시행일자|약관\s*및\s*운영정책/g;

const PRIVACY_STRUCTURE_PATTERN =
  /개인정보의\s*수집|수집하는\s*개인정보|수집\s*및\s*이용|수집·이용|처리\s*목적|처리\s*항목|보유\s*및\s*이용기간|제\s*3\s*자\s*제공|제3자\s*제공|개인정보\s*제\s*3\s*자\s*제공|개인정보\s*제3자\s*제공|처리위탁|수탁사|위탁\s*업무|국외\s*이전|파기|정보주체|이용자\s*권리|동의\s*철회|거부권|쿠키|자동\s*수집|개인정보\s*보호책임자|법정대리인/g;

const CONSENT_CONTEXT_PATTERN =
  /전체\s*동의|필수\s*동의|선택\s*동의|동의합니다|동의하기|개인정보\s*수집\s*및\s*이용|개인정보\s*제\s*3\s*자\s*제공|개인정보\s*제3자\s*제공|제\s*3\s*자\s*제공\s*동의|제3자\s*제공\s*동의|마케팅\s*정보\s*수신/i;

const TABLE_HEADER_PATTERN =
  /수집\s*항목|이용\s*목적|보유\s*기간|수탁사|위탁\s*업무|제공받는\s*자|처리\s*항목/i;

const POLICY_NOTICE_BODY_PATTERN =
  /검색결과|robots\.txt|데이터\s*베이스|데이터베이스|정보중개자|서비스\s*접근|상표|거래의\s*책임|수집|고지|책임|제한|보호|인증|법률|법령/gi;

const FALSE_POSITIVE_PATTERN =
  /FAQ|도움말|고객센터|기술\s*(?:문서|지원|블로그|개요)|이벤트|뉴스|블로그|상품|채용|리뷰|댓글|커뮤니티\s*게시글/gi;

const SEMANTIC_CORE_PATTERN =
  /term|terms|privacy|agreement|consent|tos|eula|provision/i;

const SEMANTIC_POLICY_PATTERN =
  /policy|legal|notice|rules|responsibility|certification|cbpr|spam|youth|search/i;

const EXCLUDED_SELECTOR = [
  'header',
  'footer',
  'nav',
  'aside',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
].join(',');

const SKIP_TEXT_SELECTOR = [
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'video',
  'audio',
  '[hidden]',
  '[aria-hidden="true"]',
].join(',');

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

const TITLE_CONTEXT_SELECTOR = 'h1, h2, h3, .title, .tit, .heading';

const WEAK_AREA_PATTERN =
  /(^|[-_\s])(gnb|lnb|nav|menu|footer|header|sidebar|side|language|lang|breadcrumb|quick|toolbar|search|faq)([-_\s]|$)/i;

export function shouldStartDetection(): boolean {
  const url = location.href;
  const title = document.title ?? '';
  const hasLegalUrl = LEGAL_URL_HINT.test(url);
  const hasLegalTitle = LEGAL_TITLE_HINT.test(title);

  if (HIGH_CHURN_HOST.test(location.hostname)) {
    return hasLegalUrl || hasLegalTitle;
  }

  return true;
}

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function safeQuerySelectorAll(selector: string): NodeListOf<Element> | null {
  try {
    return document.querySelectorAll(selector);
  } catch {
    return null;
  }
}

function readLimitedText(root: Element | null, maxLength: number): string {
  if (!root || maxLength <= 0) return '';

  try {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    let totalLength = 0;

    while (totalLength < maxLength) {
      const node = walker.nextNode();
      if (!node) break;

      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_TEXT_SELECTOR)) continue;

      const text = node.textContent ?? '';
      if (!text.trim()) continue;

      const remaining = maxLength - totalLength;
      const piece = text.length > remaining ? text.slice(0, remaining) : text;
      parts.push(piece);
      totalLength += piece.length;
    }

    return normalizeText(parts.join(' '));
  } catch {
    return normalizeText((root.textContent ?? '').slice(0, maxLength));
  }
}

function elementText(el: Element | null): string {
  return readLimitedText(el, MAX_ELEMENT_TEXT_LENGTH);
}

function bodyText(): string {
  return readLimitedText(document.body, MAX_BODY_TEXT_LENGTH);
}

function getLimitedAttributeText(selector: string, attribute: string, maxCount: number): string {
  const nodes = safeQuerySelectorAll(selector);
  if (!nodes) return '';

  const parts: string[] = [];
  const count = Math.min(nodes.length, maxCount);

  for (let index = 0; index < count; index += 1) {
    const value = nodes.item(index).getAttribute(attribute);
    if (value) parts.push(value);
  }

  return parts.join(' ');
}

function getLimitedNodeText(selector: string, maxCount: number): string {
  const nodes = safeQuerySelectorAll(selector);
  if (!nodes) return '';

  const parts: string[] = [];
  const count = Math.min(nodes.length, maxCount);

  for (let index = 0; index < count; index += 1) {
    const text = readLimitedText(nodes.item(index), 600);
    if (text) parts.push(text);
  }

  return parts.join(' ');
}

export function getTitleContext(): string {
  const headings = getLimitedNodeText(TITLE_CONTEXT_SELECTOR, MAX_HEADING_COUNT);
  const imageAlts = getLimitedAttributeText('img[alt]', 'alt', MAX_IMAGE_ALT_COUNT);
  return normalizeText(`${document.title ?? ''} ${headings} ${imageAlts}`);
}

function getDetectionContext(): DetectionContext {
  const titleContext = getTitleContext();
  const url = location.href;

  return {
    titleContext,
    hasCoreTitle: CORE_TITLE_PATTERN.test(titleContext),
    hasPolicyNoticeTitle: POLICY_NOTICE_TITLE_PATTERN.test(titleContext),
    hasLegalUrl: LEGAL_URL_HINT.test(url),
    hasPolicyNoticeUrl: /policy|legal|notice|rules|disclaimer|search_policy|spam|youth|cbpr|cert/i.test(url),
  };
}

function getIdentityText(el: Element): string {
  const className = (el as HTMLElement).className;
  const safeClassName = typeof className === 'string' ? className : el.getAttribute('class');

  return normalizeText(
    [
      el.tagName,
      el.id,
      safeClassName,
      el.getAttribute('role'),
      el.getAttribute('aria-label'),
      el.getAttribute('name'),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function isVisible(el: Element): boolean {
  try {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      el.getAttribute('aria-hidden') !== 'true' &&
      rect.width > 0 &&
      rect.height > 0
    );
  } catch {
    return el.getAttribute('aria-hidden') !== 'true';
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
    pattern.lastIndex = 0;
    const count = text.match(pattern)?.length ?? 0;
    pattern.lastIndex = 0;
    return count;
  } catch {
    return 0;
  }
}

function hasConsentControlContext(el: Element): boolean {
  try {
    const controls = el.querySelectorAll('input[type="checkbox"], label, button, a');
    const count = Math.min(controls.length, 80);

    for (let index = 0; index < count; index += 1) {
      const control = controls.item(index);
      const scope =
        control.closest('label, li, p, div, section, article, tr') ?? control;
      const text = readLimitedText(scope, 1200);

      if (CONSENT_CONTEXT_PATTERN.test(text)) return true;
    }
  } catch {
    return false;
  }

  return false;
}

function hasStrongTableSignal(el: Element): boolean {
  try {
    const cells = el.querySelectorAll('th, td, caption');
    const count = Math.min(cells.length, 80);

    for (let index = 0; index < count; index += 1) {
      if (TABLE_HEADER_PATTERN.test(readLimitedText(cells.item(index), 600))) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function countTermsNavigationSignals(el: Element): number {
  try {
    const namedSections = Math.min(el.querySelectorAll('a[name^="a"], [id^="a"]').length, 40);
    const indexLinks = Math.min(el.querySelectorAll('a[href*="#a"]').length, 40);
    const sectionHeadings = Math.min(el.querySelectorAll('h2, h3, h4').length, 40);
    return Math.max(namedSections, indexLinks, sectionHeadings);
  } catch {
    return 0;
  }
}

function collectCandidateElements(context: DetectionContext): Element[] {
  const candidates: Element[] = [];
  const seen = new Set<Element>();
  const nodes = safeQuerySelectorAll(CANDIDATE_SELECTOR);

  if (!nodes) return [];

  for (let index = 0; index < nodes.length && candidates.length < MAX_CANDIDATES; index += 1) {
    const el = nodes.item(index);
    if (seen.has(el) || !isVisible(el)) continue;
    seen.add(el);

    const identity = getIdentityText(el);
    const hasSemanticIdentity =
      SEMANTIC_CORE_PATTERN.test(identity) || SEMANTIC_POLICY_PATTERN.test(identity);
    const text = elementText(el);
    const hasShortTitleSignal =
      context.hasCoreTitle ||
      context.hasPolicyNoticeTitle ||
      CORE_TITLE_PATTERN.test(text.slice(0, 1600)) ||
      POLICY_NOTICE_TITLE_PATTERN.test(text.slice(0, 1600));

    if (
      text.length < MIN_CANDIDATE_TEXT_LENGTH &&
      !hasSemanticIdentity &&
      !hasShortTitleSignal
    ) {
      continue;
    }

    candidates.push(el);
  }

  return candidates;
}

function getConfidence(kind: DocumentKind, score: number): DetectionConfidence {
  if (kind === 'CORE') {
    if (score >= CORE_HIGH_THRESHOLD) return 'high';
    if (score >= CORE_MEDIUM_THRESHOLD) return 'medium';
  }

  if (kind === 'POLICY_NOTICE') {
    if (score >= POLICY_NOTICE_HIGH_THRESHOLD) return 'high';
    if (score >= POLICY_NOTICE_MEDIUM_THRESHOLD) return 'medium';
  }

  return 'low';
}

function getPresentation(
  kind: DocumentKind,
  confidence: DetectionConfidence
): DetectionPresentation {
  if (kind === 'CORE' && confidence === 'high') return 'modal';

  if (kind === 'POLICY_NOTICE') {
    if (confidence === 'high' && SHOW_POLICY_NOTICE_AS_MODAL) return 'modal';
    if (confidence !== 'low' && !SHOW_POLICY_NOTICE_AS_MODAL) return 'floating';
  }

  return 'silent';
}

function buildCandidateResult(
  kind: DocumentKind,
  score: number,
  reasons: string[]
): CandidateScore {
  const boundedScore = Math.max(0, score);
  const confidence = getConfidence(kind, boundedScore);
  const presentation = getPresentation(kind, confidence);

  return {
    kind,
    score: boundedScore,
    reasons,
    confidence,
    presentation,
  };
}

function scoreCoreCandidate(
  el: Element,
  text: string,
  identity: string,
  context: DetectionContext
): CandidateScore {
  let score = 0;
  const reasons: string[] = [];
  const topText = text.slice(0, 1600);
  const termsCount = countMatches(text, TERMS_STRUCTURE_PATTERN);
  const privacyCount = countMatches(text, PRIVACY_STRUCTURE_PATTERN);
  const termsNavigationSignals = countTermsNavigationSignals(el);

  if (context.hasCoreTitle) {
    score += 45;
    reasons.push('core_title_context:+45');
  }
  if (CORE_TITLE_PATTERN.test(topText)) {
    score += 22;
    reasons.push('core_text_near_top:+22');
  }
  if (SEMANTIC_CORE_PATTERN.test(identity)) {
    score += /agreement|consent/i.test(identity) ? 16 : 12;
    reasons.push('core_semantic_identity:+12');
  }
  if (context.hasLegalUrl) {
    score += 8;
    reasons.push('legal_url_hint:+8');
  }
  if (termsCount >= 4) {
    score += Math.min(25, 10 + termsCount * 2);
    reasons.push(`terms_structure:${termsCount}`);
  }
  if (termsNavigationSignals >= 8) {
    score += Math.min(24, 10 + termsNavigationSignals);
    reasons.push(`terms_navigation:${termsNavigationSignals}`);
  }
  if (privacyCount >= 3) {
    score += Math.min(30, 12 + privacyCount * 2);
    reasons.push(`privacy_structure:${privacyCount}`);
  }
  if (hasStrongTableSignal(el)) {
    score += 22;
    reasons.push('privacy_table_headers:+22');
  }
  if (hasConsentControlContext(el)) {
    score += 26;
    reasons.push('consent_ui_context:+26');
  }
  if (text.length > 1500 && (context.hasCoreTitle || termsCount >= 3 || privacyCount >= 2)) {
    score += 8;
    reasons.push('core_long_form_text:+8');
  }
  if (el.matches('main, article, [role="main"], [role="dialog"], [aria-modal="true"]')) {
    score += 10;
    reasons.push('core_content_container:+10');
  }

  return buildCandidateResult('CORE', score, reasons);
}

function scorePolicyNoticeCandidate(
  el: Element,
  text: string,
  identity: string,
  context: DetectionContext
): CandidateScore {
  let score = 0;
  const reasons: string[] = [];
  const topText = text.slice(0, 1600);
  const hasPolicyAnchor =
    context.hasPolicyNoticeTitle ||
    context.hasPolicyNoticeUrl ||
    POLICY_NOTICE_TITLE_PATTERN.test(topText);
  const bodyCount = hasPolicyAnchor
    ? countMatches(text, POLICY_NOTICE_BODY_PATTERN)
    : 0;

  if (context.hasPolicyNoticeTitle) {
    score += 48;
    reasons.push('policy_notice_title_context:+48');
  }
  if (POLICY_NOTICE_TITLE_PATTERN.test(topText)) {
    score += 24;
    reasons.push('policy_notice_text_near_top:+24');
  }
  if (context.hasPolicyNoticeUrl) {
    score += 18;
    reasons.push('policy_notice_url_anchor:+18');
  }
  if (SEMANTIC_POLICY_PATTERN.test(identity)) {
    score += 8;
    reasons.push('policy_semantic_identity:+8');
  }
  if (bodyCount >= 3) {
    score += Math.min(26, 10 + bodyCount * 3);
    reasons.push(`policy_notice_body_structure:${bodyCount}`);
  }
  if (text.length > 1200 && hasPolicyAnchor) {
    score += 8;
    reasons.push('policy_notice_long_form_text:+8');
  }
  if (el.matches('main, article, [role="main"]')) {
    score += 8;
    reasons.push('policy_notice_content_container:+8');
  }

  return buildCandidateResult('POLICY_NOTICE', score, reasons);
}

function applyCommonPenalties(candidate: CandidateScore, el: Element, text: string): CandidateScore {
  let score = candidate.score;
  const reasons = [...candidate.reasons];

  if (isWeakLayoutArea(el)) {
    score -= 30;
    reasons.push('weak_layout_area_penalty:-30');
  }

  const falsePositiveCount = countMatches(
    `${document.title ?? ''}\n${getIdentityText(el)}\n${text.slice(0, 1000)}`,
    FALSE_POSITIVE_PATTERN
  );

  if (falsePositiveCount > 0) {
    score -= Math.min(24, falsePositiveCount * 8);
    reasons.push(`general_false_positive:${falsePositiveCount}`);
  }

  if (text.length < 180 && candidate.reasons.every((reason) => !reason.includes('title_context'))) {
    score -= 20;
    reasons.push('too_short_penalty:-20');
  }

  return buildCandidateResult(candidate.kind, score, reasons);
}

export function scoreCandidate(el: Element, context = getDetectionContext()): CandidateScore {
  try {
    const text = elementText(el);
    const identity = getIdentityText(el);
    const core = applyCommonPenalties(
      scoreCoreCandidate(el, text, identity, context),
      el,
      text
    );
    const policyNotice = applyCommonPenalties(
      scorePolicyNoticeCandidate(el, text, identity, context),
      el,
      text
    );

    if (policyNotice.score > core.score) return policyNotice;
    return core;
  } catch {
    return buildCandidateResult('UNKNOWN', 0, ['scoring_error']);
  }
}

function scoreBodyFallback(context: DetectionContext): CandidateScore {
  if (!document.body || (!context.hasCoreTitle && !context.hasPolicyNoticeTitle && !context.hasLegalUrl)) {
    return buildCandidateResult('UNKNOWN', 0, []);
  }

  const text = bodyText();
  const identity = 'BODY';
  const core = scoreCoreCandidate(document.body, text, identity, context);
  const policyNotice = scorePolicyNoticeCandidate(document.body, text, identity, context);

  return policyNotice.score > core.score ? policyNotice : core;
}

function emptyResult(reason = 'not_detected'): DetectionResult {
  return {
    detected: false,
    score: 0,
    targetElement: null,
    reasons: [reason],
    kind: 'UNKNOWN',
    confidence: 'low',
    presentation: 'silent',
  };
}

function isBetterCandidate(candidate: CandidateScore, best: DetectionResult): boolean {
  if (candidate.presentation !== 'silent' && best.presentation === 'silent') return true;
  if (candidate.presentation === 'silent' && best.presentation !== 'silent') return false;
  return candidate.score > best.score;
}

export function getCandidateElements(): Element[] {
  return collectCandidateElements(getDetectionContext());
}

export function detectTermsLikeDocument(): DetectionResult {
  if (!shouldStartDetection()) {
    return emptyResult('high_churn_non_legal_page');
  }

  const context = getDetectionContext();
  let best: DetectionResult = emptyResult();

  try {
    for (const el of collectCandidateElements(context)) {
      const candidate = scoreCandidate(el, context);

      if (isBetterCandidate(candidate, best)) {
        best = {
          detected: candidate.presentation !== 'silent',
          score: candidate.score,
          targetElement: el,
          reasons: candidate.reasons,
          kind: candidate.kind,
          confidence: candidate.confidence,
          presentation: candidate.presentation,
        };
      }
    }

    if (best.presentation === 'silent') {
      const bodyCandidate = scoreBodyFallback(context);
      if (bodyCandidate.presentation !== 'silent' && document.body) {
        best = {
          detected: true,
          score: bodyCandidate.score,
          targetElement: document.body,
          reasons: bodyCandidate.reasons,
          kind: bodyCandidate.kind,
          confidence: bodyCandidate.confidence,
          presentation: bodyCandidate.presentation,
        };
      }
    }

    return best;
  } catch {
    return emptyResult('detection_error');
  }
}

export function extractRawText(el?: Element | null): string {
  return readLimitedText(el ?? document.body, MAX_BODY_TEXT_LENGTH);
}

export function buildTermsPayload(result: DetectionResult): TermsPayload {
  const target = result.targetElement ?? document.body;

  return {
    url: location.href,
    title: document.title,
    rawText: extractRawText(target),
    detectedScore: result.score,
    reasons: result.reasons,
    kind: result.kind,
    confidence: result.confidence,
    presentation: result.presentation,
  };
}
