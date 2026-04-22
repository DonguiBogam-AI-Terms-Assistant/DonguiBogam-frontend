/**
 * Mock API — backend 준비 전까지 사용
 * 실제 API와 동일한 인터페이스를 구현하므로 교체가 쉬움
 */

import type { SummarizeResponse, ChatResponse, ChatTurn } from '@shared/types';
import { delay } from '@shared/utils';

export async function mockSummarize(plainText: string): Promise<SummarizeResponse> {
  await delay(900);

  // 백엔드로 전송될 payload 확인용 로그
  console.log('[약관AI] 백엔드 전송 payload (summarize):', {
    plainText_length: plainText.length,
    plainText_preview: plainText.slice(0, 200),
    plainText_full: plainText,
  });

  const charCount = plainText.length;
  const hasThirdParty = /제3자|third.party/i.test(plainText);
  const hasMarketing = /마케팅|광고|홍보/i.test(plainText);

  return {
    summary: `이 약관은 총 ${charCount.toLocaleString()}자로 구성되어 있습니다. 개인정보 수집·이용에 관한 내용을 포함하고 있으며${hasThirdParty ? ', 제3자 제공 조항이 포함되어 있습니다' : ''}.`,
    keyPoints: [
      '수집 항목: 이름, 이메일, 접속 로그',
      '이용 목적: 서비스 제공 및 개선',
      hasThirdParty ? '⚠️ 제3자 제공: 있음' : '제3자 제공: 없음',
      hasMarketing ? '⚠️ 마케팅 활용: 있음' : '마케팅 활용: 없음',
      '보관 기간: 서비스 이용 종료 후 3년',
    ],
    riskLevel: hasThirdParty || hasMarketing ? 'medium' : 'low',
  };
}

export async function mockChat(
  userMessage: string,
  plainText: string,
  history: ChatTurn[]
): Promise<ChatResponse> {
  await delay(600);

  // 백엔드로 전송될 payload 확인용 로그
  console.log('[약관AI] 백엔드 전송 payload (chat):', {
    userMessage,
    plainText_length: plainText.length,
    history_turns: history.length,
    plainText_full: plainText,
  });

  const lower = userMessage.toLowerCase();

  // 간단한 키워드 기반 mock 응답
  if (/요약|summary/i.test(lower)) {
    return { reply: `이 약관의 핵심은 개인정보 수집·이용 동의입니다. 총 ${plainText.length.toLocaleString()}자 분량이며, 주요 내용은 수집 항목, 이용 목적, 보관 기간입니다.` };
  }
  if (/제3자|third/i.test(lower)) {
    const has = /제3자|third.party/i.test(plainText);
    return { reply: has ? '⚠️ 이 약관에는 제3자 제공 조항이 포함되어 있습니다. 제공 대상과 목적을 꼭 확인하세요.' : '이 약관에는 제3자 제공 조항이 없습니다.' };
  }
  if (/보관|기간|retention/i.test(lower)) {
    return { reply: '개인정보 보관 기간은 서비스 이용 계약 종료 후 3년입니다. (mock 응답)' };
  }
  if (/거부|opt.out|동의 안/i.test(lower)) {
    return { reply: '동의를 거부할 경우 서비스 이용이 제한될 수 있습니다. 필수 항목과 선택 항목을 구분해서 확인하세요.' };
  }

  // 대화 맥락 반영 (이전 메시지 수)
  const turnCount = history.length;
  return {
    reply: `[Mock 응답 #${Math.ceil(turnCount / 2) + 1}] "${userMessage}"에 대한 답변입니다. 실제 AI 연동 후 정확한 답변을 제공할 예정입니다.`,
  };
}
