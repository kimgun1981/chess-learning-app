# 체스 교실 — 프로젝트 구조도

## 디렉토리 트리

```
chess-learning-app/
├── docs/
│   ├── STRUCTURE.md        ← 이 파일 (구조도)
│   ├── DESCRIPTION.md      ← 기능 설명서
│   └── MANUAL.md           ← 사용자 매뉴얼
│
├── src/
│   ├── main.jsx            ← React 진입점 (ReactDOM.createRoot)
│   ├── App.jsx             ← 앱 전체 로직 및 UI (단일 파일)
│   └── index.css           ← 전역 CSS (Tailwind + 아이폰 안전 영역 + 반응형 보드)
│
├── public/                 ← 정적 파일 (favicon 등)
├── dist/                   ← 빌드 결과물 (vite build 출력)
│
├── index.html              ← HTML 진입점
├── vite.config.js          ← Vite 설정 (base: '/chess-learning-app/')
├── package.json            ← 의존성 및 스크립트
└── eslint.config.js        ← ESLint 설정
```

---

## App.jsx 내부 구조

```
App.jsx
│
├── [상수 / 설정]
│   ├── FILES, RANKS          체스 파일/랭크 배열
│   ├── GLYPH                 기물별 단색 유니코드 기호 매핑
│   ├── STORAGE_KEYS          게임·선호 설정·학습 진행도 저장 키
│   ├── LESSONS               10단계 기초 학습 문제
│   ├── NAMES_KO              기물 한국어 이름
│   ├── DESCRIPTIONS          기물 이동 규칙 설명
│   ├── PIECE_VALUES          기물 점수 (p=1, n=3, b=3.2, r=5, q=9)
│   ├── DIFFICULTIES          난이도 3단계 (초급/중급/심화)
│   └── TIME_OPTIONS          타이머 6단계 (무제한~30분)
│
├── [순수 함수]
│   ├── formatTime(secs)      초 → "m:ss" 포맷
│   ├── evaluate(game)        기물 점수 합산 (AI 평가 함수)
│   ├── minimax(...)          미니맥스 + 알파베타 가지치기 (depth=3)
│   ├── getAIMove(game, diff) 난이도별 AI 수 선택
│   ├── getHintAnalysis(game) 다음 대응까지 계산한 추천 수·이유
│   └── getCommentary(move)   AI 수 설명 텍스트 생성
│
├── [화면 컴포넌트]
│   ├── ModeSelect            모드 선택 화면 (1인용 / 2인용)
│   ├── DifficultySelect      난이도 선택 화면 (AI 모드)
│   ├── TimeSelect            타이머 선택 화면 (2인용 모드)
│   ├── LessonSelect          10단계 학습 목록·진행도
│   ├── LessonPractice        기초 학습 실습 보드·정답 피드백
│   ├── PromotionModal        프로모션 기물 선택
│   ├── GameOverModal         게임 종료 모달 (승패/무승부 표시)
│   └── PlayerCard            플레이어 정보 카드 (색상/시간/잡은 기물)
│
└── [메인 컴포넌트] ChessApp
    │
    ├── [State]
    │   ├── screen            현재 화면 (menu/difficulty/timeSelect/game)
    │   ├── gameMode          게임 모드 (ai/human)
    │   ├── difficulty        AI 난이도 (easy/medium/hard)
    │   ├── moveSANs[]        착수 기록 (SAN 표기)
    │   ├── selectedSq        선택된 칸 좌표
    │   ├── selectedPiece     선택된 기물 정보
    │   ├── aiThinking        AI 계산 중 여부
    │   ├── commentary        AI 수 설명 텍스트
    │   ├── userFeedback       사용자가 둔 수의 학습 피드백
    │   ├── tip               학습 팁 텍스트
    │   ├── hint              힌트 from/to 좌표
    │   ├── timeControl       선택된 제한 시간(초)
    │   ├── whiteTime         백 남은 시간
    │   ├── blackTime         흑 남은 시간
    │   └── timedOut          시간 초과된 색상
    │   ├── savedGame         이어하기용 로컬 저장 정보
    │   ├── lessonIndex       현재 기초 학습 단계
    │   └── showHistory       2인용 기보 펼침 여부
    │
    ├── [Derived / useMemo]
    │   ├── game              Chess 인스턴스 (moveSANs 재생)
    │   ├── board             game.board() 8×8 배열
    │   ├── legalMoves        선택 칸 합법적 이동 목록
    │   ├── legalTargets      이동 가능 칸 Set
    │   ├── kingCheckSq       체크 상태 킹 위치
    │   ├── capturedByColor   색상별 잡힌 기물 목록
    │   └── materialAdvantage 점수 차이
    │
    ├── [Effects]
    │   ├── AI 자동 착수       흑 차례 → 딜레이 후 AI 이동
    │   ├── Chess clock        실제 경과 시간을 기준으로 현재 차례 시간 계산
    │   ├── 시간 초과 감지     whiteTime/blackTime === 0
    │   └── 자동 저장          수·타이머·보드 방향을 브라우저에 저장
    │
    ├── [Handlers]
    │   ├── handleSquareClick  칸 클릭 → 선택/이동 처리
    │   ├── handleHint         힌트 계산 및 표시
    │   ├── handleUndo         무르기 (AI모드: 2수, 2인용: 1수)
    │   ├── handleReset        게임 초기화
    │   ├── startGame          게임 시작 (모드/난이도/타이머 설정)
    │   ├── handleModeSelect   모드 선택 → 다음 화면 이동
    │   └── goMenu             메인 메뉴로 복귀
    │
    └── [Render]
        ├── renderBoard(flipped)  체스판 렌더링 (flip 지원)
        ├── AI 모드 UI            보드 + 사이드 패널 2단 레이아웃
        └── 2인용 모드 UI         흑 카드(180° 회전) + 보드 + 백 카드
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
                                   useMemo: game 재계산
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                         AI 모드                  2인용 모드
                    useEffect 트리거            다음 차례로 전환
                    → AI 수 계산 (setTimeout)
                    → setMoveSANs 추가
```

---

## 기술 스택

| 항목 | 버전 | 용도 |
|------|------|------|
| React | 19.2 | UI 프레임워크 |
| chess.js | 1.4 | 체스 규칙 엔진 |
| Vite | 8.3 | 번들러 / 개발 서버 |
| Tailwind CSS | 4.2 | 유틸리티 CSS |
| gh-pages | - | GitHub Pages 배포 |

## 배포

- **URL**: https://kimgun1981.github.io/chess-learning-app/
- **브랜치**: `main` → 빌드 → `gh-pages` 브랜치 자동 배포
- **명령어**: `npm run deploy`
- **배포 도구**: `gh-pages` 6.3.0을 프로젝트에 고정해 사용
