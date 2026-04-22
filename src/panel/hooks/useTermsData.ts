/**
 * background에서 현재 탭의 약관 데이터를 로드하는 훅
 */

import { useState, useEffect } from 'react';
import type { TabState } from '@shared/types';
import { sendMessage } from '@shared/messages';

interface UseTermsDataResult {
  tabState: TabState | null;
  isLoading: boolean;
  error: string | null;
  tabId: number | null;
}

export function useTermsData(): UseTermsDataResult {
  const [tabState, setTabState] = useState<TabState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabId, setTabId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 현재 활성 탭 ID 조회
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTabId = activeTab?.id;

        if (!currentTabId) {
          setError('활성 탭을 찾을 수 없습니다.');
          return;
        }

        if (!cancelled) setTabId(currentTabId);

        // background에 PANEL_READY 전송 → TERMS_DATA 응답 수신
        const response = await sendMessage({
          type: 'PANEL_READY',
          payload: { tabId: currentTabId },
        });

        if (cancelled) return;

        if (!response) {
          setError('background 응답이 없습니다.');
          return;
        }

        if (response.type === 'TERMS_DATA') {
          setTabState(response.payload.tabState);
        } else if (response.type === 'ERROR') {
          setError(response.payload.message);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '데이터 로드 실패');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { tabState, isLoading, error, tabId };
}
