# 약관 요약 AI — Chrome Extension (MV3)

웹페이지의 약관/개인정보처리방침을 자동 감지하고 AI로 요약해주는 Chrome 확장 프로그램입니다.

## 설계
```
웹페이지
  ↓
content script
  - DOM 감시
  - 약관 후보 탐색
  - 점수 기반 감지
  - plain text 추출
  - 플로팅 버튼 표시
  ↓
background service worker
  - 약관 데이터 저장
  - 탭별 상태 관리
  - 사이드패널 열기
  - 요약/채팅 API 중계
  ↓
side panel React app
  - 감지된 약관 미리보기
  - 요약 요청
  - 챗봇 Q&A
```

## 폴더 구조

```
├── manifest.json              # MV3 매니페스트
├── panel.html                 # Side Panel HTML 진입점
├── vite.config.ts             # 빌드 설정 (멀티 엔트리)
├── src/
│   ├── background/
│   │   ├── index.ts           # Service Worker 진입점
│   │   ├── messageRouter.ts   # 메시지 타입별 라우팅
│   │   ├── storageManager.ts  # chrome.storage 추상화
│   │   └── api/
│   │       ├── client.ts      # API 클라이언트 (mock/real 전환)
│   │       └── mockApi.ts     # Mock 응답 구현
│   ├── content/
│   │   ├── index.ts           # Content Script 진입점
│   │   ├── detector/
│   │   │   ├── observer.ts    # MutationObserver + debounce
│   │   │   └── scorer.ts      # 휴리스틱 점수 계산
│   │   ├── extractor/
│   │   │   └── textExtractor.ts  # Plain text 추출
│   │   └── ui/
│   │       └── floatingButton.ts # 플로팅 버튼 (Shadow DOM)
│   ├── panel/
│   │   ├── index.tsx          # React 진입점
│   │   ├── App.tsx            # 메인 앱 컴포넌트
│   │   ├── hooks/
│   │   │   ├── useTermsData.ts   # 약관 데이터 로드
│   │   │   ├── useChat.ts        # 채팅 상태 관리
│   │   │   └── useSummarize.ts   # 요약 요청
│   │   └── components/
│   │       ├── TermsPreview.tsx  # 약관 원문 미리보기
│   │       ├── SummaryCard.tsx   # 요약 결과 카드
│   │       ├── ChatWindow.tsx    # 채팅 메시지 목록
│   │       └── ChatInput.tsx     # 채팅 입력창
│   └── shared/
│       ├── types.ts           # 공통 도메인 타입
│       ├── messages.ts        # 메시지 타입 + 헬퍼
│       └── utils.ts           # fingerprint, generateId 등
```

## 시작하기

```bash
npm install
npm run build
```

빌드 후 Chrome에서 `chrome://extensions` → "압축 해제된 확장 프로그램 로드" → 프로젝트 루트 선택

## 개발 모드

```bash
npm run dev   # 파일 변경 감지 후 자동 빌드
```

## Mock → 실제 API 전환

`src/background/api/client.ts`에서 `useMock` 설정을 변경하거나,
`chrome.storage.local`의 `settings.useMock`을 `false`로 설정하면 됩니다.
======
