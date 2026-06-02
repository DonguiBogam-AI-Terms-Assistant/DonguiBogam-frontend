type DocumentBucket = 'CORE' | 'POLICY' | 'UNKNOWN';
type DetectionStrength = 'high' | 'medium' | 'low';

export interface DetectionResult {
  detected: boolean;
  score: number;
  targetElement: Element | null;
  reasons: string[];
}

export interface TermsPayload {
  url: string;
  title: string;
  rawText: string;
  detectedScore: number;
  reasons: string[];
}

interface CandidateScore {
  detected: boolean;
  score: number;
  reasons: string[];
}

interface ScanCache {
  mainText: WeakMap<Element, string>;
  titleContext: WeakMap<Element, string>;
  consentControlContext: WeakMap<Element, boolean>;
  privacyTableHeaderCount: WeakMap<Element, number>;
  linkTextRatio: WeakMap<Element, number>;
  negativeContext: WeakMap<Element, boolean>;
  candidateEvidenceScore: WeakMap<Element, number>;
}

const CORE_DETECTION_THRESHOLD = 70;
const POLICY_NOTICE_THRESHOLD = 75;
const MIN_CANDIDATE_TEXT_LENGTH = 120;
const MAX_CANDIDATES_PER_DOCUMENT = 260;

let activeScanCache: ScanCache | null = null;

function createScanCache(): ScanCache {
  return {
    mainText: new WeakMap(),
    titleContext: new WeakMap(),
    consentControlContext: new WeakMap(),
    privacyTableHeaderCount: new WeakMap(),
    linkTextRatio: new WeakMap(),
    negativeContext: new WeakMap(),
    candidateEvidenceScore: new WeakMap(),
  };
}

function withScanCache<T>(fn: () => T): T {
  const previousCache = activeScanCache;
  activeScanCache = createScanCache();

  try {
    return fn();
  } finally {
    activeScanCache = previousCache;
  }
}

function getCachedValue<T>(
  cache: WeakMap<Element, T> | undefined,
  el: Element,
  compute: () => T
): T {
  if (!cache) return compute();

  const cached = cache.get(el);
  if (cached !== undefined) return cached;

  const value = compute();
  cache.set(el, value);
  return value;
}

const CANDIDATE_SELECTOR = [
  'main',
  'article',
  'section',
  '[role="main"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
  'form',
  'div[id]',
  'div[class]',
].join(',');

const EXCLUDED_SELECTOR = [
  'script',
  'style',
  'noscript',
  'svg',
  'header',
  'footer',
  'nav',
  'aside',
  '[hidden]',
  '[aria-hidden="true"]',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
].join(',');

const TITLE_AREA_SELECTOR = [
  'h1',
  'h2',
  'h3',
  '[role="heading"]',
  '.title',
  '[class*="title"]',
  '[id*="title"]',
].join(',');

const WEAK_AREA_PATTERN =
  /(^|[-_\s])(gnb|lnb|nav|menu|footer|header|sidebar|side|language|lang|breadcrumb|quick|toolbar|search|faq)([-_\s]|$)/i;

const CORE_TITLE_PATTERN =
  /이용약관|서비스\s*약관|개인정보\s*처리방침|개인정보처리방침|개인정보\s*수집\s*(?:및|·|ㆍ)?\s*이용|개인정보\s*제\s*3\s*자\s*제공|제\s*3\s*자\s*제공\s*동의|privacy\s*policy|terms\s*of\s*service|terms\s*and\s*conditions/i;

const TERMS_ARTICLE_PATTERN = /(?:제\s*\d+\s*(?:조|장)|Article\s*\d+)/gi;

const TERMS_NARRATIVE_HEADING_SIGNATURES = [
  /여러분을\s*환영합니다/i,
  /다양한\s*서비스를\s*즐겨보세요/i,
  /회원으로\s*가입하시면/i,
  /콘텐츠를\s*소중히/i,
  /개인정보를\s*소중히\s*보호/i,
  /타인의\s*권리/i,
  /서비스\s*이용\s*관련\s*주의사항/i,
  /서비스\s*이용\s*제한/i,
  /책임집니다/i,
  /이용계약\s*해지/i,
  /광고가\s*포함/i,
  /약관\s*개정/i,
  /시행일자/i,
];

const TERMS_NARRATIVE_BODY_SIGNATURES = [
  /서비스\s*이용약관/i,
  /본\s*약관/i,
  /서비스/i,
  /회원/i,
  /계정/i,
  /콘텐츠/i,
  /게시물/i,
  /개인정보처리방침/i,
  /권리/i,
  /의무/i,
  /금지/i,
  /제한/i,
  /해지/i,
  /손해/i,
  /배상/i,
  /책임/i,
  /광고/i,
  /약관\s*개정/i,
  /시행일자/i,
];

const TERMS_SUPPORT_PATTERN =
  /목적|정의|이용계약|회원\s*가입|회원가입|계정|회사의\s*의무|회원의\s*의무|이용자의\s*의무|서비스\s*이용\s*제한|이용\s*제한|계약\s*해지|계약해지|손해배상|면책|분쟁|준거법|재판관할|시행일|시행일자|개정일|콘텐츠|게시물|저작권|광고/gi;

const PRIVACY_CORE_PATTERN =
  /개인정보처리방침의\s*의의|개인정보의\s*수집|수집하는\s*개인정보|수집한\s*개인정보의\s*이용|수집\s*(?:및|·|ㆍ)\s*이용|처리\s*목적|처리\s*항목|보유\s*(?:및|·|ㆍ)?\s*이용\s*기간|보유\s*기간|개인정보의\s*제공\s*(?:및|·|ㆍ)?\s*위탁|개인정보의\s*제공|제\s*3\s*자\s*제공|개인정보\s*제\s*3\s*자\s*제공|처리\s*위탁|처리위탁|수탁사|위탁\s*업무|국외\s*이전|개인정보의\s*파기|파기|이용자\s*(?:및|·|ㆍ)?\s*법정대리인의\s*권리|정보주체|이용자\s*권리|동의\s*철회|거부권|쿠키|자동\s*수집|개인정보\s*보호책임자|개인위치정보의\s*처리|개정\s*전\s*고지\s*의무|법정대리인/gi;

const PRIVACY_TABLE_HEADER_PATTERN =
  /수집\s*항목|수집항목|이용\s*목적|처리\s*목적|보유\s*기간|보유\s*(?:및|·|ㆍ)?\s*이용\s*기간|수탁사|위탁\s*업무|제공받는\s*자|제공\s*목적|처리\s*항목/gi;

const CONSENT_CONTEXT_PATTERN =
  /전체\s*동의|필수\s*동의|선택\s*동의|동의합니다|동의하기|동의함|이용약관\s*동의|서비스\s*약관\s*동의|개인정보\s*수집\s*(?:및|·|ㆍ)?\s*이용|개인정보\s*제\s*3\s*자\s*제공|제\s*3\s*자\s*제공\s*동의|마케팅\s*정보\s*수신|광고성\s*정보\s*수신/i;

const POLICY_NOTICE_TITLE_PATTERN =
  /정보보호\s*인증|SOC\s*인증|APEC\s*CBPR\s*인증|책임의\s*한계와\s*법적\s*고지|책임의\s*한계와\s*법적고지|청소년보호정책|청소년\s*보호\s*정책|스팸메일정책|스팸메일\s*정책|검색결과\s*수집에\s*대한\s*정책|운영정책|운영\s*정책|콘텐츠\s*정책|커뮤니티\s*가이드라인|광고\s*정책|환불\s*정책|결제\s*정책|법적\s*고지/i;

const POLICY_NOTICE_URL_PATTERN =
  /\/(?:policy|terms|rules|legal|notice|privacy)(?:\/|$)|[?&](?:policy|terms|rules|legal|notice|privacy)=/i;

const POLICY_NOTICE_CONTAINER_PATTERN =
  /(^|[-_\s])(content|policy|rules|legal|notice|responsibility|spam|robots|iso)([-_\s]|$)/i;

const POLICY_NOTICE_BODY_SIGNATURES = [
  /적용됩니다/i,
  /시행일/i,
  /고지/i,
  /책임/i,
  /제한/i,
  /보호/i,
  /인증/i,
  /수집/i,
  /차단/i,
  /신고/i,
  /문의/i,
  /위반/i,
  /권리/i,
  /피해/i,
  /법률/i,
  /법령/i,
];

const NEGATIVE_PAGE_PATTERN =
  /FAQ|도움말|고객센터|기술\s*(?:문서|지원|블로그|개요)|개요|이벤트|뉴스|블로그|상품|검색결과\s*페이지|채용|리뷰|댓글|커뮤니티\s*게시글/i;

const URL_HINT_PATTERN = /terms|privacy|policy|agreement|consent|tos|eula|provision/i;
const SEMANTIC_ID_PATTERN = /term|terms|privacy|policy|agreement|consent|stip|provision|legal/i;
const POLICY_IFRAME_PATTERN = /policy|terms|privacy|agreement|provision|consent/i;

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function safeQueryAll(root: ParentNode, selector: string): Element[] {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

function safeMatches(el: Element, selector: string): boolean {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

function visibleText(root: Element | Document | null): string {
  if (!root) return '';

  try {
    if (root.nodeType === 9) {
      return visibleText((root as Document).body);
    }

    const el = root as Element;
    const text = 'innerText' in el ? (el as HTMLElement).innerText : el.textContent;
    return normalizeText(text ?? '');
  } catch {
    return normalizeText(root.textContent ?? '');
  }
}

function textContentOf(el: Element | null): string {
  return normalizeText(el?.textContent ?? '');
}

function imageAltText(el: Element | Document): string {
  try {
    return normalizeText(
      safeQueryAll(el, 'img[alt]')
        .map((img) => img.getAttribute('alt') ?? '')
        .filter(Boolean)
        .join('\n')
    );
  } catch {
    return '';
  }
}

function getClassName(el: Element): string {
  const className = (el as HTMLElement).className;
  if (typeof className === 'string') return className;
  return el.getAttribute('class') ?? '';
}

function getIdentityText(el: Element): string {
  return normalizeText(
    [
      el.tagName,
      el.id,
      getClassName(el),
      el.getAttribute('role'),
      el.getAttribute('aria-label'),
      el.getAttribute('name'),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function isHiddenByStyle(el: Element): boolean {
  try {
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      el.getAttribute('aria-hidden') === 'true' ||
      rect.width <= 0 ||
      rect.height <= 0
    );
  } catch {
    return el.getAttribute('aria-hidden') === 'true';
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

function cloneWithoutWeakAreas(el: Element): Element {
  const clone = el.cloneNode(true) as Element;

  safeQueryAll(clone, EXCLUDED_SELECTOR).forEach((node) => node.remove());
  safeQueryAll(clone, '[id], [class], [role], [aria-label]').forEach((node) => {
    if (WEAK_AREA_PATTERN.test(getIdentityText(node))) node.remove();
  });

  return clone;
}

function computeMainText(el: Element): string {
  try {
    const clone = cloneWithoutWeakAreas(el);
    return normalizeText([textContentOf(clone), imageAltText(clone)].filter(Boolean).join('\n'));
  } catch {
    return visibleText(el);
  }
}

function mainText(el: Element): string {
  return getCachedValue(activeScanCache?.mainText, el, () => computeMainText(el));
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

function countSignatureMatches(text: string, signatures: RegExp[]): number {
  return signatures.reduce((count, signature) => {
    try {
      return signature.test(text) ? count + 1 : count;
    } catch {
      return count;
    }
  }, 0);
}

function getDocumentTitle(doc: Document = document): string {
  return normalizeText(doc.title ?? '');
}

function computeTitleContext(el: Element): string {
  try {
    const clone = cloneWithoutWeakAreas(el);
    const titleText = safeQueryAll(clone, TITLE_AREA_SELECTOR)
      .slice(0, 40)
      .map((node) => textContentOf(node))
      .filter(Boolean)
      .join('\n');
    const altText = safeQueryAll(clone, 'img[alt]')
      .slice(0, 20)
      .map((img) => img.getAttribute('alt') ?? '')
      .filter(Boolean)
      .join('\n');

    return normalizeText(`${getDocumentTitle(el.ownerDocument)}\n${titleText}\n${altText}`);
  } catch {
    return getDocumentTitle(el.ownerDocument);
  }
}

function getTitleContext(el: Element): string {
  return getCachedValue(activeScanCache?.titleContext, el, () => computeTitleContext(el));
}

function getTopText(text: string, maxLength = 1200): string {
  return normalizeText(text).slice(0, maxLength);
}

function computeLinkTextRatio(el: Element): number {
  try {
    const totalLength = mainText(el).length;
    if (totalLength === 0) return 0;

    const linkTextLength = safeQueryAll(el, 'a')
      .map((link) => visibleText(link))
      .join(' ').length;

    return linkTextLength / totalLength;
  } catch {
    return 0;
  }
}

function getLinkTextRatio(el: Element): number {
  return getCachedValue(activeScanCache?.linkTextRatio, el, () => computeLinkTextRatio(el));
}

function getAssociatedLabelText(control: Element): string {
  try {
    const id = control.getAttribute('id');
    if (!id) return '';

    const escapedId =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(id)
        : id.replace(/"/g, '\\"');
    const label = control.ownerDocument.querySelector(`label[for="${escapedId}"]`);

    return visibleText(label);
  } catch {
    return '';
  }
}

function getConsentControlContext(control: Element): string {
  const parts: string[] = [];

  try {
    parts.push(visibleText(control));
    parts.push(getAssociatedLabelText(control));

    const parentLabel = control.closest('label');
    if (parentLabel) parts.push(visibleText(parentLabel));

    const smallScope = control.closest('li, p, tr, fieldset, form, [role="dialog"]');
    if (smallScope) parts.push(visibleText(smallScope).slice(0, 900));

    const parent = control.parentElement;
    if (parent) parts.push(visibleText(parent).slice(0, 600));

    const previous = control.previousElementSibling;
    const next = control.nextElementSibling;
    if (previous) parts.push(visibleText(previous).slice(0, 300));
    if (next) parts.push(visibleText(next).slice(0, 300));
  } catch {
    // Ignore partial DOM access failures.
  }

  return normalizeText(parts.join('\n'));
}

function computeConsentControlContext(el: Element): boolean {
  try {
    const controls = safeQueryAll(
      el,
      [
        'input[type="checkbox"]',
        'input[type="radio"]',
        'label',
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        '[role="checkbox"]',
        '[role="button"]',
      ].join(',')
    );

    return controls.some((control) => CONSENT_CONTEXT_PATTERN.test(getConsentControlContext(control)));
  } catch {
    return false;
  }
}

function hasConsentControlContext(el: Element): boolean {
  return getCachedValue(activeScanCache?.consentControlContext, el, () =>
    computeConsentControlContext(el)
  );
}

function computePrivacyTableHeaderCount(el: Element): number {
  try {
    const tableText = safeQueryAll(el, 'table, th, td, caption')
      .map((node) => visibleText(node))
      .join('\n');

    return countMatches(tableText, PRIVACY_TABLE_HEADER_PATTERN);
  } catch {
    return 0;
  }
}

function getPrivacyTableHeaderCount(el: Element): number {
  return getCachedValue(activeScanCache?.privacyTableHeaderCount, el, () =>
    computePrivacyTableHeaderCount(el)
  );
}

function countTermsNavigationSignals(el: Element): number {
  try {
    const navPattern =
      /(?:^|#|[-_])(?:a|article|clause|terms?)[-_]?\d+|제\s*\d+\s*(?:조|장)|Article\s*\d+|이용약관|서비스\s*약관|개인정보|수집\s*항목|이용\s*목적|보유\s*기간/i;

    const anchorCount = safeQueryAll(el, 'a[href^="#"], a[name], [id]').filter((node) => {
      const context = normalizeText(
        [
          node.getAttribute('href'),
          node.getAttribute('name'),
          node.getAttribute('id'),
          visibleText(node).slice(0, 120),
        ]
          .filter(Boolean)
          .join(' ')
      );

      return navPattern.test(context);
    }).length;

    const headingCount = safeQueryAll(el, 'h2, h3, h4').filter((node) =>
      navPattern.test(visibleText(node))
    ).length;

    return Math.max(anchorCount, headingCount);
  } catch {
    return 0;
  }
}

function getAccessibleDocuments(): Document[] {
  const docs: Document[] = [document];

  safeQueryAll(document, 'iframe').forEach((iframe) => {
    try {
      const frame = iframe as HTMLIFrameElement;
      const frameDocument = frame.contentDocument;
      if (frameDocument?.body) docs.push(frameDocument);
    } catch {
      // Cross-origin iframe content cannot be read from the parent page.
      // To detect those frames, manifest.json content_scripts needs all_frames: true.
    }
  });

  return docs;
}

function hasPolicyIframeHint(doc: Document = document): boolean {
  try {
    return safeQueryAll(doc, 'iframe').some((iframe) => {
      const context = normalizeText(
        [iframe.getAttribute('src'), iframe.getAttribute('id'), iframe.getAttribute('name')]
          .filter(Boolean)
          .join(' ')
      );

      return POLICY_IFRAME_PATTERN.test(context);
    });
  } catch {
    return false;
  }
}

function getDocumentUrl(doc: Document): string {
  try {
    return doc.location?.href ?? location.href;
  } catch {
    return location.href;
  }
}

function computeGeneralNegativeContext(el: Element): boolean {
  const context = normalizeText(`${getTitleContext(el)}\n${getTopText(mainText(el), 600)}`);
  return NEGATIVE_PAGE_PATTERN.test(context);
}

function hasGeneralNegativeContext(el: Element): boolean {
  return getCachedValue(activeScanCache?.negativeContext, el, () =>
    computeGeneralNegativeContext(el)
  );
}

function computeCandidateEvidenceScore(el: Element): number {
  const text = mainText(el);
  const titleContext = getTitleContext(el);
  const identity = getIdentityText(el);
  const articleCount = countMatches(text, TERMS_ARTICLE_PATTERN);
  const privacyCount = countMatches(text, PRIVACY_CORE_PATTERN);
  const policyBodyCount = countSignatureMatches(text, POLICY_NOTICE_BODY_SIGNATURES);
  let score = 0;

  if (CORE_TITLE_PATTERN.test(titleContext)) score += 45;
  if (POLICY_NOTICE_TITLE_PATTERN.test(titleContext)) score += 42;
  if (hasConsentControlContext(el)) score += 28;
  if (getPrivacyTableHeaderCount(el) >= 2) score += 26;
  if (countSignatureMatches(titleContext, TERMS_NARRATIVE_HEADING_SIGNATURES) >= 3) score += 24;
  if (POLICY_NOTICE_URL_PATTERN.test(getDocumentUrl(el.ownerDocument))) score += 10;
  if (POLICY_NOTICE_CONTAINER_PATTERN.test(identity)) score += 10;
  if (SEMANTIC_ID_PATTERN.test(identity)) score += 8;

  score += Math.min(35, articleCount * 5);
  score += Math.min(30, privacyCount * 4);
  score += Math.min(22, policyBodyCount * 3);

  if (safeMatches(el, 'main, article, [role="main"], [role="dialog"], [aria-modal="true"], form')) {
    score += 10;
  }
  if (isWeakLayoutArea(el)) score -= 30;
  if (
    hasGeneralNegativeContext(el) &&
    !CORE_TITLE_PATTERN.test(titleContext) &&
    !POLICY_NOTICE_TITLE_PATTERN.test(titleContext)
  ) {
    score -= 35;
  }

  return score;
}

function getCandidateEvidenceScore(el: Element): number {
  return getCachedValue(activeScanCache?.candidateEvidenceScore, el, () =>
    computeCandidateEvidenceScore(el)
  );
}

export function getCandidateElements(root: Document = document): Element[] {
  const candidates: Element[] = [];
  const seen = new Set<Element>();

  try {
    safeQueryAll(root, CANDIDATE_SELECTOR).forEach((el) => {
      if (seen.has(el) || isHiddenByStyle(el)) return;
      seen.add(el);

      const text = mainText(el);
      const titleContext = getTitleContext(el);
      const hasImportantShortSignal =
        CORE_TITLE_PATTERN.test(titleContext) ||
        POLICY_NOTICE_TITLE_PATTERN.test(titleContext) ||
        hasConsentControlContext(el) ||
        getPrivacyTableHeaderCount(el) >= 2;

      if (text.length < MIN_CANDIDATE_TEXT_LENGTH && !hasImportantShortSignal) return;
      candidates.push(el);
    });
  } catch {
    return [];
  }

  return candidates
    .sort((a, b) => getCandidateEvidenceScore(b) - getCandidateEvidenceScore(a))
    .slice(0, MAX_CANDIDATES_PER_DOCUMENT);
}

function getDetectionStrength(params: {
  bucket: DocumentBucket;
  score: number;
  enoughText: boolean;
  exactCoreTitle: boolean;
  coreStructureSignal: boolean;
  consentGatePassed: boolean;
  policyTitleAnchor: boolean;
  policyGateCount: number;
}): DetectionStrength {
  if (params.bucket === 'CORE') {
    if (params.consentGatePassed) {
      return 'high';
    }

    if (params.exactCoreTitle && params.coreStructureSignal) {
      return params.enoughText ? 'high' : 'medium';
    }

    if (
      params.score >= CORE_DETECTION_THRESHOLD &&
      params.enoughText &&
      (params.exactCoreTitle || params.coreStructureSignal)
    ) {
      return 'medium';
    }

    return 'low';
  }

  if (params.bucket === 'POLICY') {
    if (
      params.score >= POLICY_NOTICE_THRESHOLD &&
      params.policyTitleAnchor &&
      params.policyGateCount >= 3 &&
      params.enoughText
    ) {
      return 'high';
    }

    if (
      params.score >= POLICY_NOTICE_THRESHOLD &&
      params.policyGateCount >= 2 &&
      (params.policyTitleAnchor || params.policyGateCount >= 3)
    ) {
      return 'medium';
    }
  }

  return 'low';
}

export function scoreCandidate(el: Element): CandidateScore {
  let score = 0;
  const reasons: string[] = [];

  try {
    const text = mainText(el);
    const fullText = visibleText(el);
    const titleContext = getTitleContext(el);
    const topText = getTopText(text, 1200);
    const identityText = getIdentityText(el);
    const url = getDocumentUrl(el.ownerDocument);

    const exactCoreTitle = CORE_TITLE_PATTERN.test(titleContext);
    const coreTextNearTop = CORE_TITLE_PATTERN.test(topText);
    const articleCount = countMatches(text, TERMS_ARTICLE_PATTERN);
    const narrativeHeadingCount = countSignatureMatches(titleContext, TERMS_NARRATIVE_HEADING_SIGNATURES);
    const narrativeBodyCount = countSignatureMatches(text, TERMS_NARRATIVE_BODY_SIGNATURES);
    const termsSupportCount = countMatches(text, TERMS_SUPPORT_PATTERN);
    const privacyCount = countMatches(text, PRIVACY_CORE_PATTERN);
    const privacyTableHeaderCount = getPrivacyTableHeaderCount(el);
    const termsNavigationSignals = countTermsNavigationSignals(el);
    const hasConsentContext = hasConsentControlContext(el);
    const policyTitleAnchor = POLICY_NOTICE_TITLE_PATTERN.test(titleContext);
    const policyUrlAnchor = POLICY_NOTICE_URL_PATTERN.test(url);
    const policyContainerAnchor = POLICY_NOTICE_CONTAINER_PATTERN.test(identityText);
    const policyBodyStructureCount = countSignatureMatches(text, POLICY_NOTICE_BODY_SIGNATURES);
    const enoughText = text.length >= 800;
    const linkTextRatio = getLinkTextRatio(el);
    const negativeContext = hasGeneralNegativeContext(el);
    const strongNegativeContext = negativeContext && !exactCoreTitle && !policyTitleAnchor;

    if (exactCoreTitle) {
      score += 44;
      reasons.push('exact_core_title:+44');
    }

    if (coreTextNearTop) {
      score += 8;
      reasons.push('core_text_near_top_weak:+8');
    }

    if (SEMANTIC_ID_PATTERN.test(identityText)) {
      score += /agreement|consent/i.test(identityText) ? 14 : 10;
      reasons.push('semantic_id_or_class:+10');
    }

    if (URL_HINT_PATTERN.test(url)) {
      score += 4;
      reasons.push('url_hint_weak:+4');
    }

    if (articleCount >= 8) {
      score += 36;
      reasons.push(`article_terms_structure:${articleCount}:+36`);
    } else if (articleCount >= 3) {
      score += 28;
      reasons.push(`article_terms_structure:${articleCount}:+28`);
    } else if (articleCount >= 1 && exactCoreTitle) {
      score += 10;
      reasons.push(`article_terms_structure:${articleCount}:+10`);
    }

    if (narrativeHeadingCount >= 5 && narrativeBodyCount >= 8) {
      score += 36;
      reasons.push(`plain_terms_heading_signature:${narrativeHeadingCount}/${narrativeBodyCount}:+36`);
    } else if (narrativeHeadingCount >= 3 && narrativeBodyCount >= 7) {
      score += 30;
      reasons.push(`plain_terms_heading_signature:${narrativeHeadingCount}/${narrativeBodyCount}:+30`);
    } else if (exactCoreTitle && narrativeHeadingCount >= 2 && narrativeBodyCount >= 6) {
      score += 24;
      reasons.push(`plain_terms_heading_signature:${narrativeHeadingCount}/${narrativeBodyCount}:+24`);
    } else if (exactCoreTitle && narrativeBodyCount >= 10) {
      score += 14;
      reasons.push(`plain_terms_body_with_anchor:${narrativeBodyCount}:+14`);
    }

    if (termsSupportCount >= 10 && articleCount >= 3) {
      score += 16;
      reasons.push(`terms_support_density:${termsSupportCount}:+16`);
    } else if (
      termsSupportCount >= 6 &&
      (articleCount >= 3 || narrativeHeadingCount >= 3 || exactCoreTitle)
    ) {
      score += 10;
      reasons.push(`terms_support_density:${termsSupportCount}:+10`);
    }

    if (termsNavigationSignals >= 8) {
      score += 16;
      reasons.push(`terms_navigation:${termsNavigationSignals}:+16`);
    } else if (termsNavigationSignals >= 4) {
      score += 8;
      reasons.push(`terms_navigation:${termsNavigationSignals}:+8`);
    }

    if (privacyCount >= 10) {
      score += 36;
      reasons.push(`privacy_structure:${privacyCount}:+36`);
    } else if (privacyCount >= 4) {
      score += 28;
      reasons.push(`privacy_structure:${privacyCount}:+28`);
    } else if (privacyCount >= 2 && exactCoreTitle) {
      score += 12;
      reasons.push(`privacy_structure:${privacyCount}:+12`);
    }

    if (privacyTableHeaderCount >= 3) {
      score += 34;
      reasons.push(`privacy_table_signature:${privacyTableHeaderCount}:+34`);
    } else if (privacyTableHeaderCount >= 2) {
      score += 28;
      reasons.push(`privacy_table_signature:${privacyTableHeaderCount}:+28`);
    } else if (privacyTableHeaderCount >= 1 && exactCoreTitle) {
      score += 14;
      reasons.push(`privacy_table_signature:${privacyTableHeaderCount}:+14`);
    }

    if (hasConsentContext) {
      score += 34;
      reasons.push('consent_checkbox_context:+34');
    }

    if (hasConsentContext && (exactCoreTitle || coreTextNearTop)) {
      score += 22;
      reasons.push('consent_core_context:+22');
    }

    if (hasConsentContext && safeMatches(el, '[role="dialog"], [aria-modal="true"], form')) {
      score += 12;
      reasons.push('consent_control_container:+12');
    }

    if (policyTitleAnchor) {
      score += 44;
      reasons.push('policy_notice_title_anchor:+44');
    }

    if (policyUrlAnchor) {
      score += 10;
      reasons.push('policy_notice_url_anchor:+10');
    }

    if (policyContainerAnchor) {
      score += 10;
      reasons.push('policy_notice_container_anchor:+10');
    }

    if (enoughText) {
      score += 10;
      reasons.push('main_text_length_800:+10');
    }

    if (policyBodyStructureCount >= 6) {
      score += 20;
      reasons.push(`policy_notice_body_structure:${policyBodyStructureCount}:+20`);
    } else if (policyBodyStructureCount >= 4) {
      score += 14;
      reasons.push(`policy_notice_body_structure:${policyBodyStructureCount}:+14`);
    }

    if (text.length > 3000 && (articleCount >= 3 || privacyCount >= 4 || policyBodyStructureCount >= 4)) {
      score += 12;
      reasons.push('long_target_document:+12');
    } else if (text.length > 1500 && (exactCoreTitle || policyTitleAnchor)) {
      score += 8;
      reasons.push('medium_target_document:+8');
    }

    if (safeMatches(el, 'main, article, [role="main"]')) {
      score += 10;
      reasons.push('main_content_container:+10');
    }

    if (safeMatches(el, '[role="dialog"], [aria-modal="true"]')) {
      score += 10;
      reasons.push('dialog_container:+10');
    }

    if (safeMatches(el, 'form')) {
      score += 8;
      reasons.push('form_container:+8');
    }

    if (isWeakLayoutArea(el)) {
      score -= 35;
      reasons.push('weak_layout_area_penalty:-35');
    }

    if (linkTextRatio > 0.55 && text.length < 5000 && !hasConsentContext) {
      score -= 24;
      reasons.push(`link_heavy_menu_penalty:${linkTextRatio.toFixed(2)}:-24`);
    }

    if (strongNegativeContext) {
      score -= 45;
      reasons.push('general_negative_page_context:-45');
    }

    if (fullText.length < 180 && !hasConsentContext) {
      score -= 20;
      reasons.push('too_short_penalty:-20');
    }

    score = Math.max(0, score);

    const coreStructureSignal =
      articleCount >= 3 ||
      (narrativeHeadingCount >= 3 && narrativeBodyCount >= 7) ||
      privacyCount >= 4 ||
      privacyTableHeaderCount >= 2;
    const consentGatePassed =
      score >= CORE_DETECTION_THRESHOLD &&
      hasConsentContext &&
      (exactCoreTitle || coreTextNearTop || safeMatches(el, '[role="dialog"], [aria-modal="true"], form'));
    const coreGatePassed =
      score >= CORE_DETECTION_THRESHOLD &&
      (exactCoreTitle || coreStructureSignal || consentGatePassed) &&
      !strongNegativeContext;
    const policyGateCount = [
      policyTitleAnchor,
      policyUrlAnchor,
      policyContainerAnchor,
      enoughText,
      policyBodyStructureCount >= 4,
    ].filter(Boolean).length;
    const policyNoticeGatePassed =
      score >= POLICY_NOTICE_THRESHOLD &&
      !strongNegativeContext &&
      (policyTitleAnchor ? policyGateCount >= 2 : policyGateCount >= 3) &&
      (policyTitleAnchor || policyUrlAnchor || policyContainerAnchor);
    const bucket: DocumentBucket = coreGatePassed
      ? 'CORE'
      : policyNoticeGatePassed
        ? 'POLICY'
        : 'UNKNOWN';
    const strength = getDetectionStrength({
      bucket,
      score,
      enoughText,
      exactCoreTitle,
      coreStructureSignal,
      consentGatePassed,
      policyTitleAnchor,
      policyGateCount,
    });
    const detected =
      strength !== 'low' &&
      ((bucket === 'CORE' && score >= CORE_DETECTION_THRESHOLD) ||
        (bucket === 'POLICY' && score >= POLICY_NOTICE_THRESHOLD)) &&
      (coreGatePassed || policyNoticeGatePassed || consentGatePassed);

    if (coreGatePassed) reasons.push('core_gate_passed');
    if (policyNoticeGatePassed) reasons.push(`policy_notice_gate_passed:${policyGateCount}`);
    if (consentGatePassed) reasons.push('consent_gate_passed');

    return {
      detected,
      score,
      reasons,
    };
  } catch {
    return {
      detected: false,
      score: 0,
      reasons: ['scoring_error'],
    };
  }
}

function isBetterCandidate(candidate: CandidateScore, best: DetectionResult): boolean {
  if (candidate.detected !== best.detected) return candidate.detected;
  return candidate.score > best.score;
}

export function detectTermsLikeDocument(): DetectionResult {
  return withScanCache(() => {
    let best: DetectionResult = {
      detected: false,
      score: 0,
      targetElement: null,
      reasons: [],
    };

    try {
      for (const doc of getAccessibleDocuments()) {
        for (const el of getCandidateElements(doc)) {
          const candidate = scoreCandidate(el);

          if (isBetterCandidate(candidate, best)) {
            best = {
              detected: candidate.detected,
              score: candidate.score,
              targetElement: el,
              reasons: candidate.reasons,
            };
          }
        }
      }

      const iframeHintReasons =
        !best.detected && hasPolicyIframeHint(document)
          ? [...best.reasons, 'policy_iframe_may_need_all_frames']
          : best.reasons;

      return {
        ...best,
        reasons: iframeHintReasons,
      };
    } catch {
      return {
        detected: false,
        score: 0,
        targetElement: null,
        reasons: ['detection_error'],
      };
    }
  });
}

export function extractRawText(el?: Element | null): string {
  return visibleText(el ?? document.body);
}

function getPayloadUrl(target: Element | null): string {
  try {
    return target?.ownerDocument?.location?.href ?? location.href;
  } catch {
    return location.href;
  }
}

function getPayloadTitle(target: Element | null): string {
  try {
    return target?.ownerDocument?.title ?? document.title;
  } catch {
    return document.title;
  }
}

export function buildTermsPayload(result: DetectionResult): TermsPayload {
  const target = result.targetElement ?? document.body;

  return {
    url: getPayloadUrl(target),
    title: getPayloadTitle(target),
    rawText: extractRawText(target),
    detectedScore: result.score,
    reasons: result.reasons,
  };
}
