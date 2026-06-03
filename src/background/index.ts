import { setupMessageRouter } from './messageRouter';
import { clearTabState, getTabState } from './storageManager';
import { forgetPanelTab, markPanelClosed } from './panelLifecycle';

setupMessageRouter();

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  handleTabRemoved(tabId, removeInfo).catch(console.error);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    handleTabNavigation(tabId).catch(console.error);
  }
});

console.log('[TermsAI] Background service worker started');

async function handleTabRemoved(
  tabId: number,
  removeInfo: chrome.tabs.TabRemoveInfo
): Promise<void> {
  const state = await getTabState(tabId);

  if (state?.status === 'panel_open' || state?.sessionId) {
    await markPanelClosed(tabId, removeInfo.windowId, 'tab_removed', 'floating-panel');
  }

  await clearTabState(tabId);
  forgetPanelTab(tabId);
}

async function handleTabNavigation(tabId: number): Promise<void> {
  const state = await getTabState(tabId);

  if (state?.status === 'panel_open' || state?.sessionId) {
    await markPanelClosed(tabId, undefined, 'tab_navigation', 'floating-panel');
  }

  await clearTabState(tabId);
  await clearBadgeForTab(tabId);
}

async function clearBadgeForTab(tabId: number): Promise<void> {
  try {
    await chrome.action.setBadgeText({ text: '', tabId });
  } catch (err) {
    if (err instanceof Error && /No tab with id/i.test(err.message)) return;
    throw err;
  }
}
