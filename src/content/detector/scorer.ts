/**
 * 휴리스틱 점수 기반 약관 감지기
 * 각 신호에 가중치를 부여하고 합산 점수로 판별
 */

interface ScoringSignal {
  name: string;
  weight: number;
  check: (el: Element) => boolean;
}

// 약관 관련 핵심 키워드
const TERMS_KEYWORDS =
  /이용약관|개인정보|동의|제3자\s*제공|보유기간|수집\s*및\s*이용|처리방침|privacy policy|terms of service|terms and conditions/i;

// 약관 내용 밀도 키워드 (많을수록 약관일 가능성 높음)
const DENSITY_KEYWORDS =
  /수집|이용|제공|처리|보관|파기|위탁|동의|거부|권리|의무|책임|손해|배상/g;

const SIGNALS: ScoringSignal[] = [
  // URL에 약관 관련 경로 포함
  {
    name: 'url_keywords',
    weight: 15,
    check: () =>
      /terms|privacy|policy|agreement|consent|tos|eula/i.test(location.href),
  },

  // 제목(h1~h3)에 약관 키워드 포함
  {
    name: 'heading_keywords',
    weight: 25,
    check: (el) => {
      const heading = el.querySelector('h1, h2, h3');
      return TERMS_KEYWORDS.test(heading?.textContent ?? '');
    },
  },

  // 요소 자체 텍스트에 약관 키워드 포함
  {
    name: 'text_keywords',
    weight: 20,
    check: (el) => TERMS_KEYWORDS.test(el.textContent ?? ''),
  },

  // 텍스트 밀도 (약관은 텍스트가 많음, 1500자 이상)
  {
    name: 'text_density',
    weight: 15,
    check: (el) => (el.textContent?.length ?? 0) > 1500,
  },

  // 약관 특유 단어 빈도 (5개 이상)
  {
    name: 'keyword_frequency',
    weight: 15,
    check: (el) => {
      const matches = el.textContent?.match(DENSITY_KEYWORDS) ?? [];
      return matches.length >= 5;
    },
  },

  // 스크롤 가능한 컨테이너 (약관은 보통 스크롤 박스)
  {
    name: 'scrollable_container',
    weight: 10,
    check: (el) => {
      const style = getComputedStyle(el);
      return style.overflowY === 'scroll' || style.overflowY === 'auto';
    },
  },

  // 동의/확인 버튼 존재
  {
    name: 'consent_button',
    weight: 15,
    check: (el) => {
      const buttons = el.querySelectorAll('button, input[type="button"], input[type="submit"], a');
      return Array.from(buttons).some((btn) =>
        /동의|agree|accept|confirm|확인|승인/i.test(btn.textContent ?? '')
      );
    },
  },

  // 모달/오버레이 형태 (fixed/absolute 포지션)
  {
    name: 'is_overlay',
    weight: 10,
    check: (el) => {
      const style = getComputedStyle(el);
      return style.position === 'fixed' || style.position === 'absolute';
    },
  },

  // role="dialog" 또는 aria-modal
  {
    name: 'dialog_role',
    weight: 10,
    check: (el) =>
      el.getAttribute('role') === 'dialog' ||
      el.getAttribute('aria-modal') === 'true',
  },
];

export const DETECTION_THRESHOLD = 55;

export function scoreElement(el: Element): number {
  return SIGNALS.reduce((sum, signal) => {
    try {
      return sum + (signal.check(el) ? signal.weight : 0);
    } catch {
      return sum; // 개별 신호 오류가 전체를 막지 않도록
    }
  }, 0);
}
