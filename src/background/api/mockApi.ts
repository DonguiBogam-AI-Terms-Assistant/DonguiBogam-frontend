import type {
  ChatFollowupRequest,
  ChatQueryRequest,
  ChatQueryResponse,
  SummarizeResponse,
} from '@shared/types';
import { delay, generateId } from '@shared/utils';

export async function mockSummarize(
  canonical_url: string,
  page_title: string,
  raw_text: string
): Promise<SummarizeResponse> {
  await delay(900);

  console.log('[TermsAI] mock summary payload:', {
    canonical_url,
    page_title,
    raw_text_length: raw_text.length,
    raw_text_preview: raw_text.slice(0, 200),
  });

  const charCount = raw_text.length;
  const hasThirdParty = /third.?party|3rd.?party|third-party|third party/i.test(raw_text);

  return {
    summary: [
      '# Terms Summary',
      '',
      `This document contains **${charCount.toLocaleString()} characters**.`,
      hasThirdParty
        ? '- It appears to include third-party sharing language.'
        : '- No obvious third-party sharing language was detected in the mock scan.',
      '- Review retention periods, collected data, and opt-out clauses carefully.',
    ].join('\\n'),
    suggested_questions: [
      'What personal data does this service collect?',
      'How long is my data retained after deletion?',
      'Does this policy allow third-party sharing?',
    ],
  };
}

export async function mockChatQuery(request: ChatQueryRequest): Promise<ChatQueryResponse> {
  await delay(600);

  console.log('[TermsAI] mock chat payload:', {
    canonical_url: request.canonical_url,
    raw_text_length: request.raw_text.length,
    query: request.query,
  });

  return {
    session_id: `sess_${generateId()}`,
    answer: generateMockAnswer(request.query, request.raw_text),
    suggested_questions: generateMockQuestions(),
  };
}

export async function mockChatFollowup(request: ChatFollowupRequest): Promise<ChatQueryResponse> {
  await delay(600);

  console.log('[TermsAI] mock chat followup payload:', {
    session_id: request.session_id,
    query: request.query,
  });

  return {
    session_id: request.session_id,
    answer: generateMockAnswer(request.query, ''),
    suggested_questions: generateMockQuestions(),
  };
}

function generateMockQuestions(): string[] {
  return [
    'Can you point out the risky clauses?',
    'Is there any third-party data sharing?',
    'What happens when I delete my account?',
  ];
}

function generateMockAnswer(query: string, plainText: string): string {
  const lower = query.toLowerCase();

  if (/summary|summarize|\uC694\uC57D/i.test(lower)) {
    return 'This mock answer summarizes the main terms: data collection, usage purpose, retention period, and sharing clauses.';
  }

  if (/third|3rd|\uC81C3\uC790/i.test(lower)) {
    const hasThirdParty = /third.?party|3rd.?party|third-party|third party/i.test(plainText);
    return hasThirdParty
      ? 'Third-party sharing language appears to be present. Please review the recipient and purpose clauses.'
      : 'No obvious third-party sharing language was detected in this mock answer.';
  }

  if (/retention|period|\uBCF4\uAD00|\uAE30\uAC04/i.test(lower)) {
    return 'The mock answer suggests checking whether the retention period is tied to account deletion, legal obligations, or service termination.';
  }

  if (/opt.?out|withdraw|\uAC70\uBD80|\uCCA0\uD68C/i.test(lower)) {
    return 'If consent is withdrawn, some services may be limited. Separate required and optional consent items should be reviewed.';
  }

  return `Mock answer for "${query}". A real backend response will provide a more precise analysis.`;
}
