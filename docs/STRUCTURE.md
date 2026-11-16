# 체스 교실 — 프로젝트 구조도

## 디렉토리 트리

```
chess-learning-app/
├── .github/workflows/
│   └── ci.yml              ← main push·Pull Request 자동 검사
│
├── docs/
│   ├── STRUCTURE.md        ← 이 파일 (구조도)
│   ├── DESCRIPTION.md      ← 기능 설명서
│   └── MANUAL.md           ← 사용자 매뉴얼
│
├── public/
│   ├── manifest.webmanifest ← 홈 화면 설치 정보
│   ├── sw.js                ← 오프라인 캐시 서비스 워커
│   ├── icon-192.png         ← 홈 화면 아이콘
│   ├── icon-512.png         ← 고해상도 홈 화면 아이콘
│   ├── favicon.svg          ← 브라우저 아이콘
│   └── app-icon.svg         ← 앱 아이콘 원본 자산
│
├── src/
│   ├── main.jsx             ← React 진입점 + 서비스 워커 등록
│   ├── App.jsx              ← 화면 전환·게임 상태·타이머를 조정하는 메인 컴포넌트
│   ├── index.css            ← 전역 CSS, 반응형 화면, 아이폰 안전 영역
│   │
│   ├── chess/               ← 화면과 분리한 체스 기능 모듈
│   │   ├── config.js        ← 기물·난이도·제한 시간 공통 설정
│   │   ├── engine.js        ← AI, 힌트 후보수, 수 설명과 학습 팁
│   │   ├── lessons.js       ← 20단계 학습 문제와 복수 정답·오답 설명
│   │   ├── rules.js         ← 타이머와 게임 종료 판정
│   │   ├── storage.js       ← 게임·설정·학습·통계 로컬 저장
│   │   ├── audio.js         ← 효과음과 기기 진동
│   │   └── pgn.js           ← PGN 생성과 파일 저장
│   │
│   └── components/
│       ├── ChessBoard.jsx      ← 체스판과 칸·기물 렌더링
│       ├── GameUi.jsx          ← 플레이어 카드·승격·게임 종료 화면
│       ├── LearningScreens.jsx ← 메뉴·설정·학습 목록·학습 실습 화면
│       └── MoveHistory.jsx     ← SAN 기보 목록
│
├── tests/
│   ├── config.test.js       ← 설정과 시간 표시 테스트
│   ├── engine.test.js       ← AI·힌트 테스트
│   ├── lessons.test.js      ← 20단계 문제·정답 유효성 테스트
│   ├── pgn.test.js          ← PGN 생성 테스트
│   ├── pwa.test.js          ← 홈 화면 설치·오프라인 설정 테스트
│   ├── rules.test.js        ← 시간·종료 판정 테스트
│   └── storage.test.js      ← 저장 데이터 검증 테스트
│
├── dist/                   ← 빌드 결과물 (vite build 출력)
│
├── index.html              ← HTML 진입점 + PWA 메타 정보
├── vite.config.js          ← Vite 설정 (base: '/chess-learning-app/')
├── package.json            ← 의존성 및 스크립트
└── eslint.config.js        ← ESLint 설정
```

---

## 모듈별 책임

```
App.jsx
│
└── ChessApp
    │
    ├── [State]
    │   ├── screen            현재 화면 (menu/difficulty/timeSelect/lessons/lesson/game)
    │   ├── gameMode          게임 모드 (ai/human)
    │   ├── difficulty        AI 난이도 (easy/medium/hard)
    │   ├── moveSANs[]        착수 기록 (SAN 표기)
    │   ├── selectedSq        선택된 칸 좌표
    │   ├── selectedPiece     선택된 기물 정보
    │   ├── commentary        AI 수 설명 텍스트
    │   ├── userFeedback      사용자가 둔 수의 학습 피드백
    │   ├── tip               학습 팁 텍스트
    │   ├── hint/hintBusy     힌트 후보수와 계산 중 상태
    │   ├── timeControl       선택된 제한 시간(초)
    │   ├── whiteTime         백 남은 시간
    │   ├── blackTime         흑 남은 시간
    │   ├── timedOut          시간 초과된 색상
    │   ├── soundEnabled      효과음 사용 여부
    │   ├── savedGame         이어하기용 로컬 저장 정보
    │   ├── lessonIndex       현재 기초 학습 단계
    │   ├── showHistory       2인용 기보 펼침 여부
    │   └── pgnStatus         기보 복사·저장 결과 안내
    │
    ├── [계산값 / useMemo]
    │   ├── game              Chess 인스턴스 (moveSANs 재생)
    │   ├── board             game.board() 8×8 배열
    │   ├── legalMoves        선택 칸 합법적 이동 목록
    │   ├── legalTargets      이동 가능 칸 Set
    │   ├── kingCheckSq       체크 상태 킹 위치
    │   ├── capturedByColor   색상별 잡힌 기물 목록
    │   ├── materialAdvantage 점수 차이
    │   └── outcome           체크메이트·무승부·시간 초과 결과
    │
    ├── [Effects]
    │   ├── AI 자동 착수       흑 차례 → 딜레이 후 AI 이동
    │   ├── Chess clock        Date.now() 기반 밀리초 실제 경과 시간 계산
    │   ├── 자동 저장          수·남은 밀리초·보드 방향을 브라우저에 저장
    │   ├── 통계 기록          한 게임을 한 번만 승패 통계에 반영
    │   ├── 효과음·진동        착수·체크·시간 경고·종료 알림
    │   └── Wake Lock          2인용 대국 중 화면 꺼짐 방지 요청
    │
    ├── [Handlers]
    │   ├── handleSquareClick  칸 클릭 → 선택/이동 처리
    │   ├── handleHint         시간예산 내 추천 후보수 계산·표시
    │   ├── handleUndo         무르기 (AI모드: 2수, 2인용: 1수)
    │   ├── handleReset        게임 초기화
    │   ├── prepareFreshGame   저장 게임 교체 확인 후 새 게임 준비
    │   ├── resumeGame         자동 저장된 게임 불러오기
    │   ├── copyPgn            기보를 클립보드에 복사
    │   ├── downloadPgn        .pgn 파일로 저장
    │   ├── handleModeSelect   모드 선택 → 다음 화면 이동
    │   └── goMenu             메인 메뉴로 복귀
    │
    └── [Render]
        ├── ChessBoard            공통 체스판
        ├── AI 모드 UI            보드 + 사이드 패널 2단 레이아웃
        └── 2인용 모드 UI         흑 카드(180° 회전) + 보드 + 백 카드

chess/
├── engine.js     AI 평가·미니맥스·후보수 계산 시간 제한
├── lessons.js    20개 FEN 문제·정답 배열·목표·정답/오답 설명
├── rules.js      밀리초 타이머·시간패 판정·승패 통계 변환
├── storage.js    값 검증 후 localStorage 읽기/쓰기
├── audio.js      Web Audio 효과음·Vibration API 호출
└── pgn.js        chess.js를 이용한 표준 PGN 문자열 생성

components/
├── LearningScreens.jsx  학습 진행도·미완료 복습·초기화·다시 풀기
├── ChessBoard.jsx       좌표·선택·합법수·힌트·체크 표시
├── GameUi.jsx           플레이어 카드·승격·게임 결과
└── MoveHistory.jsx      SAN 착수 기록
```

---

## 데이터 흐름

```
사용자 클릭
    │
    ▼
handleSquareClick(sq)
    │
    ├─ selectedSq 없음 → 내 기물 선택 → setSelectedSq
    │
    └─ selectedSq 있음 + 합법 이동 → setMoveSANs 추가
                                          │
                                          ▼
                                   game·outcome 재계산
                                          │
                         ┌────────────────┼────────────────┐
                         ▼                ▼                ▼
                    AI 모드          2인용 모드        공통 처리
               AI 수 계산·설명      상대 차례·시계     자동 저장·효과음
```

---

## 설치·오프라인 흐름

```
프로덕션 페이지 첫 접속
    │
    ├─ manifest.webmanifest → 이름·아이콘·독립 실행 화면 제공
    │
    └─ main.jsx → sw.js 등록
                    │
                    ├─ HTML·빌드 파일·아이콘 캐시
                    └─ 다음 접속 때 네트워크 실패 시 캐시 사용
```

- 서비스 워커는 GitHub Pages의 `/chess-learning-app/` 경로를 기준으로 등록됩니다.
- 개발 서버에서는 서비스 워커를 등록하지 않아 개발 중 오래된 파일이 보이는 문제를 줄입니다.
- 오프라인 사용 전에는 온라인 상태에서 한 번 정상적으로 열어 캐시 준비를 마쳐야 합니다.

---

## 자동 테스트

`npm test`는 Node 내장 테스트 실행기로 `tests/*.test.js`를 실행합니다.

- AI가 합법적인 수를 선택하는지 확인
- 추천 후보수와 체크메이트 탐지 확인
- 20단계 학습 문제의 FEN과 모든 정답이 유효한지 확인
- 밀리초 시계와 승패·무승부 판정 확인
- 저장값 검증과 중복 통계 방지 확인
- PGN 형식과 결과값 확인
- 홈 화면 설치 정보와 서비스 워커 구성 확인

`npm run lint`, `npm test`, `npm run build`를 배포 전 기본 검증 순서로 사용합니다.

`.github/workflows/ci.yml`은 `main` 브랜치의 push와 Pull Request마다 Node.js 22 환경에서 의존성을 설치하고, `npm test` → `npm run lint` → `npm run build`를 자동 실행합니다. 소스 읽기 권한만 사용합니다.

---

## 기술 스택

| 항목 | 버전 | 용도 |
|------|------|------|
| React | 19.2 | UI 프레임워크 |
| chess.js | 1.4 | 체스 규칙 엔진 |
| Vite | 8.3 | 번들러 / 개발 서버 |
| Tailwind CSS | 4.2 | 유틸리티 CSS |
| gh-pages | - | GitHub Pages 배포 |
| Service Worker / Web App Manifest | 브라우저 API | 홈 화면 설치·오프라인 실행 |
| Web Audio / Vibration / Wake Lock | 브라우저 API | 2인용 알림·화면 꺼짐 방지 |
| Node test runner | Node 내장 | 자동 테스트 |

## 배포

- **URL**: https://kimgun1981.github.io/chess-learning-app/
- **브랜치**: `main`은 소스 코드, `gh-pages`는 공개 빌드 결과
- **명령어**: `npm run deploy`
- **배포 도구**: `gh-pages` 6.3.0을 프로젝트에 고정해 사용
