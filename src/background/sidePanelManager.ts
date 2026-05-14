import { notifyPanelEvent } from './api/client';
import { getTabState } from './storageManager';

const PANEL_PATH = 'panel.html';

type SidePanelWithNewApis = typeof chrome.sidePanel & {
  close?: (options: { tabId?: number; windowId?: number }) => Promise<void>;
  onClosed?: {
    addListener: (callback: (info: { tabId?: number; windowId: number; path: string }) => void) => void;
  };
  onOpened?: {
    addListener: (callback: (info: { tabId?: number; windowId: number; path: string }) => void) => void;
  };
};

const openPanelTabs = new Set<number>();

export async function openTabSpecificPanel(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.windowId) return;

  await enableOnlyPanelTab(tab.id, tab.windowId);
  await chrome.sidePanel.open({ tabId: tab.id });
  markPanelOpened(tab.id, tab.windowId, 'api_open');
}

export async function togglePanelForTab(tabId: number): Promise<'opened' | 'closed'> {
  if (openPanelTabs.has(tabId)) {
    await closePanelForTab(tabId, 'fab_toggle');
    return 'closed';
  }

  await chrome.sidePanel.open({ tabId });
  const tab = await chrome.tabs.get(tabId);
  markPanelOpened(tabId, tab.windowId, 'fab_toggle');
  return 'opened';
}

export async function closePanelForTab(tabId: number, reason: string): Promise<void> {
  const sidePanel = chrome.sidePanel as SidePanelWithNewApis;

  if (sidePanel.close) {
    await sidePanel.close({ tabId });
  } else {
    await disablePanelForTab(tabId);
  }

  markPanelClosed(tabId, undefined, reason);
}

export function registerSidePanelLifecycleEvents(): void {
  const sidePanel = chrome.sidePanel as SidePanelWithNewApis;

  sidePanel.onOpened?.addListener((info) => {
    if (info.tabId) {
      markPanelOpened(info.tabId, info.windowId, 'browser_event');
    }
  });

  sidePanel.onClosed?.addListener((info) => {
    markPanelClosed(info.tabId, info.windowId, 'browser_event', info.path);
  });
}

export function markPanelOpened(tabId: number, _windowId?: number, _reason?: string): void {
  openPanelTabs.add(tabId);
}

export function markPanelClosed(tabId?: number, windowId?: number, reason?: string, path = PANEL_PATH): void {
  if (tabId) {
    if (!openPanelTabs.delete(tabId)) return;
  }

  notifyPanelClosed(tabId, windowId, reason, path).catch(console.error);
}

async function notifyPanelClosed(
  tabId?: number,
  windowId?: number,
  reason?: string,
  path = PANEL_PATH
): Promise<void> {
  const state = tabId ? await getTabState(tabId) : null;

  const event = {
    event: 'closed',
    tab_id: tabId,
    window_id: windowId,
    path,
    reason,
    session_id: state?.sessionId ?? undefined,
    timestamp: Date.now(),
  } as const;

  console.log('[TermsAI] panel closed event:', event);
  await notifyPanelEvent(event);
}

export async function enablePanelForTab(tabId: number): Promise<void> {
  await chrome.sidePanel.setOptions({
    tabId,
    path: PANEL_PATH,
    enabled: true,
  });
}

export async function disablePanelForTab(tabId: number): Promise<void> {
  await chrome.sidePanel.setOptions({
    tabId,
    enabled: false,
  });
}

export async function clearPanelTab(tabId: number): Promise<void> {
  openPanelTabs.delete(tabId);
  await disablePanelForTab(tabId);
}

export async function disablePanelOnOtherTabs(tabId: number, windowId: number): Promise<void> {
  const tabs = await chrome.tabs.query({ windowId });

  await Promise.all(
    tabs
      .filter((tab) => tab.id && tab.id !== tabId)
      .map((tab) => disablePanelForTab(tab.id as number).catch(console.error))
  );
}

async function enableOnlyPanelTab(tabId: number, windowId: number): Promise<void> {
  await enablePanelForTab(tabId);
  await disablePanelOnOtherTabs(tabId, windowId);
}
