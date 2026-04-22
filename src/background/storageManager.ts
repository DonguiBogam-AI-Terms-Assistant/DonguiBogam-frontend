/**
 * chrome.storage 추상화 레이어
 * - session: 탭별 현재 상태 (브라우저 세션 동안 유지)
 * - local: 요약 캐시, 설정 (영구)
 */

import type { TabState, LocalStorageSchema, UserSettings } from '@shared/types';

// ─── Session Storage (탭 상태) ─────────────────────────────────

export async function getTabState(tabId: number): Promise<TabState | null> {
  const key = `tab_${tabId}`;
  const result = await chrome.storage.session.get(key);
  return (result[key] as TabState) ?? null;
}

export async function setTabState(state: TabState): Promise<void> {
  const key = `tab_${state.tabId}`;
  await chrome.storage.session.set({ [key]: state });
}

export async function clearTabState(tabId: number): Promise<void> {
  await chrome.storage.session.remove(`tab_${tabId}`);
}

// ─── Local Storage (캐시 + 설정) ──────────────────────────────

export async function getSummaryCache(fingerprint: string): Promise<string | null> {
  const result = await chrome.storage.local.get('summaryCache');
  const cache = (result['summaryCache'] as LocalStorageSchema['summaryCache']) ?? {};
  return cache[fingerprint] ?? null;
}

export async function setSummaryCache(fingerprint: string, summary: string): Promise<void> {
  const result = await chrome.storage.local.get('summaryCache');
  const cache = (result['summaryCache'] as LocalStorageSchema['summaryCache']) ?? {};
  cache[fingerprint] = summary;
  await chrome.storage.local.set({ summaryCache: cache });
}

export async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.local.get('settings');
  return (result['settings'] as UserSettings) ?? { language: 'ko', useMock: true };
}

export async function setSettings(settings: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({ settings: { ...current, ...settings } });
}
