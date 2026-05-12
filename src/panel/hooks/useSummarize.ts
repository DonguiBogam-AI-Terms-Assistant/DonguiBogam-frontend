/**
 * 약관 요약 요청 훅
 */

import { useState, useCallback } from 'react';
import type { SummarizeResponse, ErrorPayload } from '@shared/types';
import { sendMessage } from '@shared/messages';

interface UseSummarizeResult {
  summary: SummarizeResponse | null;
  isLoading: boolean;
  error: { code?: string; message: string } | null;
  requestSummary: () => Promise<void>;
}

export function useSummarize(tabId: number | null): UseSummarizeResult {
  const [summary, setSummary] = useState<SummarizeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  const requestSummary = useCallback(async () => {
    if (!tabId || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage({
        type: 'SUMMARIZE_REQUEST',
        payload: { tabId },
      });

      if (!response) throw new Error('응답이 없습니다.');

      if (response.type === 'SUMMARIZE_RESPONSE') {
        setSummary(response.payload.result);
      } else if (response.type === 'ERROR') {
        const errorPayload = response.payload as ErrorPayload;
        throw {
          code: errorPayload.code,
          message: errorPayload.message,
        };
      }
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        setError(err as { code?: string; message: string });
      } else {
        setError({
          message: err instanceof Error ? err.message : '요약 실패',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [tabId, isLoading]);

  return { summary, isLoading, error, requestSummary };
}
