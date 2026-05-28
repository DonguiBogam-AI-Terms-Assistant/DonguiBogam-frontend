import { useCallback, useEffect, useRef, useState } from 'react';
import type { SummarizeResponse } from '@shared/types';
import type { ErrorPayload, ExtMessage } from '@shared/messages';
import { sendMessage } from '@shared/messages';
import { generateRandomId } from '@shared/utils';

interface UseSummarizeResult {
  summary: SummarizeResponse | null;
  summaryAnimateFrom: number | null;
  isLoading: boolean;
  error: { code?: string; message: string } | null;
  requestSummary: () => Promise<void>;
}

const CONTENT_SCRIPT_TAB_ID = 0;

export function useSummarize(tabId: number | null): UseSummarizeResult {
  const [summary, setSummary] = useState<SummarizeResponse | null>(null);
  const [summaryAnimateFrom, setSummaryAnimateFrom] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const inFlightRef = useRef(false);
  const activeRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSummary(null);
    setSummaryAnimateFrom(null);
    setError(null);
    inFlightRef.current = false;
    activeRequestIdRef.current = null;
  }, [tabId]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const handleSummaryStreamMessage = (message: ExtMessage) => {
      if (!isSummaryStreamMessage(message)) return;
      if (tabId !== CONTENT_SCRIPT_TAB_ID && message.payload.tabId !== tabId) return;
      if (message.payload.requestId !== activeRequestIdRef.current) return;

      switch (message.type) {
        case 'SUMMARY_STREAM_START':
          setIsLoading(true);
          setError(null);
          setSummary(null);
          setSummaryAnimateFrom(null);
          break;

        case 'SUMMARY_STREAM_DELTA':
          setSummary((prev) => {
            const previousText = prev?.summary ?? '';
            setSummaryAnimateFrom(previousText.length);
            return {
              summary: `${previousText}${message.payload.text}`,
              suggested_questions: prev?.suggested_questions ?? [],
            };
          });
          break;

        case 'SUMMARY_STREAM_FINAL':
          setSummary((prev) => {
            const previousText = prev?.summary ?? '';
            const nextText = message.payload.result.summary;
            const animateFrom = getCommonPrefixLength(previousText, nextText);
            setSummaryAnimateFrom(animateFrom < nextText.length ? animateFrom : null);
            return message.payload.result;
          });
          setIsLoading(false);
          inFlightRef.current = false;
          activeRequestIdRef.current = null;
          break;

        case 'SUMMARY_STREAM_ERROR':
          setError({
            code: message.payload.code,
            message: message.payload.message,
          });
          setIsLoading(false);
          inFlightRef.current = false;
          activeRequestIdRef.current = null;
          break;

        default:
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleSummaryStreamMessage);
    return () => chrome.runtime.onMessage.removeListener(handleSummaryStreamMessage);
  }, [tabId]);

  const requestSummary = useCallback(async () => {
    if (tabId == null || inFlightRef.current) return;

    inFlightRef.current = true;
    const requestId = generateRandomId('summary');
    activeRequestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);
    setSummaryAnimateFrom(null);

    try {
      const response = await sendMessage({
        type: 'SUMMARIZE_REQUEST',
        payload: { tabId, requestId },
      });

      if (!response) throw new Error('No response received.');

      if (response.type === 'SUMMARIZE_RESPONSE') {
        setSummary((prev) => {
          const previousText = prev?.summary ?? '';
          const nextText = response.payload.result.summary;
          const animateFrom = getCommonPrefixLength(previousText, nextText);
          setSummaryAnimateFrom(animateFrom < nextText.length ? animateFrom : null);
          return response.payload.result;
        });
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
      activeRequestIdRef.current = null;
      setIsLoading(false);
    }
  }, [tabId]);

  return { summary, summaryAnimateFrom, isLoading, error, requestSummary };
}

function isSummaryStreamMessage(
  message: ExtMessage
): message is Extract<
  ExtMessage,
  {
    type:
      | 'SUMMARY_STREAM_START'
      | 'SUMMARY_STREAM_DELTA'
      | 'SUMMARY_STREAM_FINAL'
      | 'SUMMARY_STREAM_ERROR';
  }
> {
  return message.type.startsWith('SUMMARY_STREAM_');
}

function getCommonPrefixLength(a: string, b: string): number {
  const maxLength = Math.min(a.length, b.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (a[index] !== b[index]) return index;
  }

  return maxLength;
}
