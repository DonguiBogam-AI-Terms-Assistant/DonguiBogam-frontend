/**
 * Background Service Worker 진입점
 * - 메시지 라우터 초기화
 * - 탭 닫힘 시 세션 상태 정리
 * - side panel 기본 동작 설정
 */

import { setupMessageRouter } from './messageRouter';
import { clearTabState } from './storageManager';

// 메시지 라우터 등록
setupMessageRouter();

// 탭 닫힘 시 세션 스토리지 정리
chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabState(tabId).catch(console.error);
  chrome.action.setBadgeText({ text: '', tabId });
});

// 탭 URL 변경 시 배지 초기화 (SPA 내비게이션 대응)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// side panel: 탭별로 독립 동작
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch(console.error);

console.log('[약관AI] Background service worker 시작');
