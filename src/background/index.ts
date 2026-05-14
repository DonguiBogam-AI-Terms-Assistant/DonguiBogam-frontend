import { setupMessageRouter } from './messageRouter';
import { clearTabState } from './storageManager';
import {
  clearPanelTab,
  disablePanelForTab,
  markPanelClosed,
  registerSidePanelLifecycleEvents,
} from './sidePanelManager';

setupMessageRouter();
registerSidePanelLifecycleEvents();

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTabState(tabId).catch(console.error);
  clearPanelTab(tabId).catch(console.error);
  chrome.action.setBadgeText({ text: '', tabId });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    clearTabState(tabId).catch(console.error);
    disablePanelForTab(tabId).catch(console.error);
    chrome.action.setBadgeText({ text: '', tabId });
  }
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
