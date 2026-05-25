import { setupMessageRouter } from './messageRouter';
import { clearTabState, getTabState } from './storageManager';
import {
  clearPanelTab,
  disablePanelForTab,
  markPanelClosed,
  markPanelsClosedForWindow,
  registerSidePanelLifecycleEvents,
} from './sidePanelManager';

setupMessageRouter();
registerSidePanelLifecycleEvents();

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  handleTabRemoved(tabId, removeInfo).catch(console.error);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    handleTabNavigation(tabId).catch(console.error);
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  markPanelsClosedForWindow(windowId).catch(console.error);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({ enabled: false }).catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setOptions({ enabled: false }).catch(console.error);
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(console.error);

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'side-panel') return;

  let panelTabId: number | undefined;

  port.onMessage.addListener((message: { tabId?: number }) => {
    if (typeof message.tabId === 'number') {
      panelTabId = message.tabId;
    }
  });

  port.onDisconnect.addListener(() => {
    markPanelClosed(panelTabId, undefined, 'port_disconnect');
  });
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
  await clearPanelTab(tabId);
  chrome.action.setBadgeText({ text: '', tabId }).catch(console.error);
}

async function handleTabNavigation(tabId: number): Promise<void> {
  const state = await getTabState(tabId);

  if (state?.status === 'panel_open' || state?.sessionId) {
    const tab = await chrome.tabs.get(tabId).catch(() => undefined);
    await markPanelClosed(tabId, tab?.windowId, 'tab_navigation', 'floating-panel');
  }

  await clearTabState(tabId);
  await disablePanelForTab(tabId);
  chrome.action.setBadgeText({ text: '', tabId }).catch(console.error);
}
