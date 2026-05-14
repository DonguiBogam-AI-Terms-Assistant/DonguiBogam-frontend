import { useCallback, useEffect, useRef, useState } from 'react';
import type { SummarizeResponse } from '@shared/types';
import type { ErrorPayload } from '@shared/messages';
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
  const inFlightRef = useRef(false);

  useEffect(() => {
    setSummary(null);
    setError(null);
    inFlightRef.current = false;
  }, [tabId]);

  const requestSummary = useCallback(async () => {
    if (!tabId || inFlightRef.current) return;

    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage({
        type: 'SUMMARIZE_REQUEST',
        payload: { tabId },
      });

      if (!response) throw new Error('No response received.');

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
          message: err instanceof Error ? err.message : 'Failed to summarize.',
        });
      }
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [tabId]);

  return { summary, isLoading, error, requestSummary };
}
