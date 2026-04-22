/**
 * DOM 요소에서 사람이 읽을 수 있는 plain text를 추출
 * - 숨겨진 요소, script/style 제외
 * - 블록 요소 경계에서 줄바꿈 삽입해 문단 구조 보존
 */

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME',
  'IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO',
]);

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'ASIDE',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'DT', 'DD', 'TR', 'TD', 'TH',
  'BLOCKQUOTE', 'PRE', 'BR', 'HR',
]);

export function extractPlainText(root: Element): string {
  const parts: string[] = [];

  function walk(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      // 렌더링 제외 요소 스킵
      if (SKIP_TAGS.has(el.tagName)) return;
      if (el.getAttribute('aria-hidden') === 'true') return;

      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      // 블록 요소 앞에 줄바꿈
      if (BLOCK_TAGS.has(el.tagName)) parts.push('\n');

      node.childNodes.forEach(walk);

      // 블록 요소 뒤에 줄바꿈
      if (BLOCK_TAGS.has(el.tagName)) parts.push('\n');
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) parts.push(text);
    }
  }

  walk(root);

  return parts
    .join(' ')
    .replace(/[ \t]+/g, ' ')       // 연속 공백 → 단일 공백
    .replace(/\n[ \t]+/g, '\n')    // 줄바꿈 후 공백 제거
    .replace(/\n{3,}/g, '\n\n')    // 3줄 이상 빈 줄 → 2줄로
    .trim();
}

/** 문서 제목 추출 (h1 > title > og:title 순) */
export function extractTitle(root: Element): string {
  const h1 = root.querySelector('h1, h2');
  if (h1?.textContent?.trim()) return h1.textContent.trim().slice(0, 100);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.getAttribute('content')) {
    return ogTitle.getAttribute('content')!.slice(0, 100);
  }

  return document.title.slice(0, 100) || '약관 문서';
}
