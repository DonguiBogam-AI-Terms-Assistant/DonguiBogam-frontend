/**
 * Content Script 진입점
 * - 약관 감지 옵저버 시작
 * - 감지 시 background로 메시지 전송
 * - 플로팅 버튼 표시/제어
 */

import { startObserver } from './detector/observer';
import { showFloatingButton, hideFloatingButton } from './ui/floatingButton';
import { sendMessage } from '@shared/messages';
import type { TermsDocument } from '@shared/types';

let currentTerms: TermsDocument | null = null;

function handleTermsDetected(doc: TermsDocument): void {
  console.log(`[약관AI] 감지됨 score=${doc.score} fp=${doc.fingerprint}`);

  currentTerms = doc;

  // background에 약관 데이터 전달
  sendMessage({
    type: 'TERMS_DETECTED',
    payload: { terms: doc },
  }).catch((err) => {
    console.warn('[약관AI] TERMS_DETECTED 전송 실패:', err);
  });

  // 플로팅 버튼 표시
  showFloatingButton(handleButtonClick);
}

function handleButtonClick(): void {
  if (!currentTerms) return;

  // content script에서는 chrome.tabs.getCurrent가 동작하지 않음
  // background의 sender.tab.id를 활용하기 위해 tabId 없이 전송
  // background의 OPEN_PANEL 핸들러가 sender.tab.id를 사용하도록 변경
  sendMessage({
    type: 'OPEN_PANEL',
    payload: { tabId: 0 }, // background에서 sender.tab.id로 덮어씀
  }).catch((err) => {
    console.warn('[약관AI] OPEN_PANEL 전송 실패:', err);
  });
}

// background로부터 오는 메시지 수신 (필요 시 확장)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'HIDE_BUTTON') {
    hideFloatingButton();
    currentTerms = null;
  }
});

// 옵저버 시작
startObserver(handleTermsDetected);
