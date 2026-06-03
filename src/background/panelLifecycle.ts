import { notifyPanelEvent } from './api/client';
import { clearTabConversation, getTabState } from './storageManager';

const FLOATING_PANEL_PATH = 'floating-panel';
const RECENT_CLOSE_DEDUPE_MS = 1000;

const openPanelTabs = new Set<number>();
const recentClosedEvents = new Map<number, number>();

export function markPanelOpened(tabId: number): void {
  recentClosedEvents.delete(tabId);
  openPanelTabs.add(tabId);
}

export function markPanelClosed(
  tabId?: number,
  windowId?: number,
  reason?: string,
  path = FLOATING_PANEL_PATH
): Promise<void> {
  if (tabId) {
    const wasTrackedOpen = openPanelTabs.delete(tabId);
    const isStateCleanupSignal =
      reason === 'panel_unload' ||
      reason === 'tab_removed' ||
      reason === 'tab_navigation';

    if (!wasTrackedOpen && !isStateCleanupSignal) return Promise.resolve();

    const now = Date.now();
    const recentClosedAt = recentClosedEvents.get(tabId);
    if (recentClosedAt && now - recentClosedAt < RECENT_CLOSE_DEDUPE_MS) {
      return Promise.resolve();
    }
    recentClosedEvents.set(tabId, now);
  }

  return notifyPanelClosed(tabId, windowId, reason, path).catch(console.error);
}

export function forgetPanelTab(tabId: number): void {
  openPanelTabs.delete(tabId);
  recentClosedEvents.delete(tabId);
}

async function notifyPanelClosed(
  tabId?: number,
  windowId?: number,
  reason?: string,
  path = FLOATING_PANEL_PATH
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
  try {
    await notifyPanelEvent(event);
  } finally {
    if (tabId) {
      await clearTabConversation(tabId);
    }
  }
}
