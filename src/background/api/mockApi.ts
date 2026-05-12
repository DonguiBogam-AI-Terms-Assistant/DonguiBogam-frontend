/**
 * Mock API — backend 준비 전까지 사용
 * Backend API와 동일한 인터페이스를 구현하므로 교체가 쉬움
 */

import type {
  SummarizeResponse,
  ChatQueryResponse,
  ChatQueryRequest,
  ChatFollowupRequest,
} from '@shared/types';
import { delay } from '@shared/utils';
import { generateId } from '@shared/utils';

export async function mockSummarize(
  canonical_url: string,
  page_title: string,
  raw_text: string
): Promise<SummarizeResponse> {
  await delay(900);

  // 백엔드로 전송될 payload 확인용 로그
  console.log('[약관AI] 백엔드 전송 payload (documents/summary):', {
    canonical_url,
    page_title,
    raw_text_length: raw_text.length,
    raw_text_preview: raw_text.slice(0, 200),
  });

  const charCount = raw_text.length;
  const hasThirdParty = /제3자|third.party/i.test(raw_text);
  const hasMarketing = /마케팅|광고|홍보/i.test(raw_text);

  return {
    summary: `이 약관은 총 ${charCount.toLocaleString()}자로 구성되어 있습니다. 개인정보 수집·이용에 관한 내용을 포함하고 있으며${hasThirdParty ? ', 제3자 제공 조항이 포함되어 있습니다' : ''}.`,
  };
}

export async function mockChatQuery(
  request: ChatQueryRequest
): Promise<ChatQueryResponse> {
  await delay(600);

  // 백엔드로 전송될 payload 확인용 로그
  console.log('[약관AI] 백엔드 전송 payload (chat/query - 첫 요청):', {
    canonical_url: request.canonical_url,
    raw_text_length: request.raw_text.length,
    query: request.query,
  });

  const sessionId = `sess_${generateId()}`;
  return {
    session_id: sessionId,
    answer: generateMockAnswer(request.query, request.raw_text),
  };
}

export async function mockChatFollowup(
  request: ChatFollowupRequest
): Promise<ChatQueryResponse> {
  await delay(600);

  // 백엔드로 전송될 payload 확인용 로그
  console.log('[약관AI] 백엔드 전송 payload (chat/query - 후속 요청):', {
    session_id: request.session_id,
    query: request.query,
  });

  return {
    session_id: request.session_id,
    answer: generateMockAnswer(request.query, ''),
  };
}

/**
 * Mock 답변 생성
 */
function generateMockAnswer(query: string, plainText: string): string {
  const lower = query.toLowerCase();

  // 간단한 키워드 기반 mock 응답
  if (/요약|summary/i.test(lower)) {
    return `이 약관의 핵심은 개인정보 수집·이용 동의입니다. 주요 내용은 수집 항목, 이용 목적, 보관 기간입니다.`;
  }
  if (/제3자|third/i.test(lower)) {
    const has = plainText && /제3자|third.party/i.test(plainText);
    return has
      ? '⚠️ 이 약관에는 제3자 제공 조항이 포함되어 있습니다. 제공 대상과 목적을 꼭 확인하세요.'
      : '이 약관에는 제3자 제공 조항이 없습니다.';
  }
  if (/보관|기간|retention/i.test(lower)) {
    return '개인정보 보관 기간은 서비스 이용 계약 종료 후 3년입니다. (mock 응답)';
  }
  if (/거부|opt.out|동의 안/i.test(lower)) {
    return '동의를 거부할 경우 서비스 이용이 제한될 수 있습니다. 필수 항목과 선택 항목을 구분해서 확인하세요.';
  }

  return `"${query}"에 대한 답변입니다. 실제 AI 연동 후 정확한 답변을 제공할 예정입니다. (mock 응답)`;
}
