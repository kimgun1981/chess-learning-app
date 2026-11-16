import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import {
  DIFFICULTIES,
  FILES,
  NAMES_KO,
  PIECE_CLASS,
  RANKS,
  TIME_OPTIONS,
  pieceGlyph,
} from '../chess/config.js';
import { LESSONS } from '../chess/lessons.js';
import {
  STORAGE_KEYS,
  loadLessonProgress,
  resetLearningProgress,
  saveJSON,
} from '../chess/storage.js';
import { PromotionModal } from './GameUi.jsx';

export function ModeSelect({ onSelect, onResume, hasSavedGame, completedLessons, stats }) {
  return (
    <div className="app-screen safe-page bg-slate-950 flex flex-col items-center justify-start sm:justify-center gap-5 sm:gap-8 px-4 py-6">
      <div className="text-center">
        <div className="text-6xl sm:text-7xl mb-3 select-none text-emerald-300 [text-shadow:0_0_20px_rgba(52,211,153,0.35)]">♟</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2">체스 교실</h1>
        <p className="text-slate-400">배우고 연습할 방법을 선택하세요</p>
      </div>
      {hasSavedGame && (
        <button
          onClick={onResume}
          className="w-full max-w-md min-h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg transition-all"
        >
          ▶ 지난 게임 이어하기
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-4xl">
        <button
          onClick={() => onSelect('learn')}
          className="mode-card bg-slate-800/90 hover:bg-slate-700 border-2 border-amber-500/40 hover:border-amber-400 rounded-2xl p-5 sm:p-6 text-left transition-all shadow-xl"
        >
          <div className="text-4xl mb-2">🎓</div>
          <h2 className="text-xl font-bold text-amber-400 mb-2">기초 학습</h2>
          <p className="text-slate-400 text-sm leading-relaxed">기물 이동부터 체크메이트까지 {LESSONS.length}단계로 연습합니다.</p>
          <p className="text-xs text-amber-300 mt-3">{completedLessons}/{LESSONS.length} 완료</p>
        </button>
        <button
          onClick={() => onSelect('ai')}
          className="mode-card bg-slate-800/90 hover:bg-slate-700 border-2 border-sky-500/40 hover:border-sky-400 rounded-2xl p-5 sm:p-6 text-left transition-all shadow-xl"
        >
          <div className="text-4xl mb-2">🤖</div>
          <h2 className="text-xl font-bold text-sky-400 mb-2">1인용</h2>
          <p className="text-slate-400 text-sm leading-relaxed">AI와 대결하며 체스를 배웁니다.<br />초급·중급·심화 · 힌트 · AI 수 설명</p>
          <p className="text-xs text-sky-300 mt-3">{stats.aiGames}경기 · 나 {stats.playerWins}승 · AI {stats.aiWins}승 · 무 {stats.aiDraws}</p>
        </button>
        <button
          onClick={() => onSelect('human')}
          className="mode-card bg-slate-800/90 hover:bg-slate-700 border-2 border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-5 sm:p-6 text-left transition-all shadow-xl"
        >
          <div className="text-4xl mb-2">👥</div>
          <h2 className="text-xl font-bold text-emerald-400 mb-2">2인용</h2>
          <p className="text-slate-400 text-sm leading-relaxed">두 명이 같은 화면에서 대결합니다.<br />타이머 · 잡은 기물 · 점수판 제공</p>
          <p className="text-xs text-emerald-300 mt-3">{stats.humanGames}경기 · 백 {stats.whiteWins}승 · 흑 {stats.blackWins}승 · 무 {stats.humanDraws}</p>
        </button>
      </div>
    </div>
  );
}

export function DifficultySelect({ onSelect, onBack }) {
  return (
    <div className="app-screen safe-page bg-slate-950 flex flex-col items-center justify-center gap-8 px-4 py-6 sm:p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">난이도 선택</h1>
        <p className="text-slate-400">AI의 강도를 선택하세요</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-lg">
        {DIFFICULTIES.map(difficulty => (
          <button
            key={difficulty.id}
            onClick={() => onSelect(difficulty.id)}
            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-slate-400 rounded-2xl p-6 text-left transition-all shadow-lg flex items-start gap-4 group"
          >
            <span className="text-4xl mt-0.5 group-hover:scale-110 transition-transform">{difficulty.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{difficulty.label}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{difficulty.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <button onClick={onBack} className="min-h-11 text-slate-500 hover:text-slate-300 text-sm">← 뒤로</button>
    </div>
  );
}

export function TimeSelect({ onSelect, onBack }) {
  return (
    <div className="app-screen safe-page bg-slate-950 flex flex-col items-center justify-center gap-8 px-4 py-6 sm:p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">시간 선택</h1>
        <p className="text-slate-400">플레이어당 제한 시간을 선택하세요</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {TIME_OPTIONS.map(option => (
          <button
            key={option.label}
            onClick={() => onSelect(option.seconds)}
            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-emerald-400 rounded-2xl p-4 text-center transition-all shadow-lg group"
          >
            <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{option.icon}</div>
            <div className="text-lg font-bold text-white">{option.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{option.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={onBack} className="min-h-11 text-slate-500 hover:text-slate-300 text-sm">← 뒤로</button>
    </div>
  );
}

export function LessonSelect({ onSelect, onBack }) {
  const [completed, setCompleted] = useState(() => new Set(
    loadLessonProgress().filter(id => LESSONS.some(lesson => lesson.id === id)),
  ));
  const [reviewOnly, setReviewOnly] = useState(false);
  const lessons = reviewOnly ? LESSONS.filter(lesson => !completed.has(lesson.id)) : LESSONS;
  const percentage = Math.round((completed.size / LESSONS.length) * 100);

  function resetProgress() {
    if (!window.confirm('학습 완료 표시를 모두 지우고 처음부터 다시 시작할까요?')) return;
    resetLearningProgress();
    setCompleted(new Set());
    setReviewOnly(false);
  }

  return (
    <div className="app-screen safe-page bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6 sm:p-8">
      <div className="w-full max-w-3xl flex items-center justify-between mb-5">
        <button onClick={onBack} className="min-h-11 px-2 text-slate-400 hover:text-white">← 메뉴</button>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-400">기초 학습 {LESSONS.length}단계</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{completed.size}/{LESSONS.length} 완료</p>
        </div>
        <div className="w-16" />
      </div>
      <div className="w-full max-w-3xl h-2 rounded-full bg-slate-800 overflow-hidden mb-4" aria-label={`학습 진행도 ${completed.size}/${LESSONS.length}`}>
        <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all" style={{ width:`${percentage}%` }} />
      </div>
      <div className="w-full max-w-3xl flex flex-wrap justify-between gap-2 mb-4">
        <button
          onClick={() => setReviewOnly(value => !value)}
          className={`min-h-11 px-4 rounded-xl text-sm font-bold border ${reviewOnly ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
        >
          {reviewOnly ? '전체 단계 보기' : '미완료 단계만 복습'}
        </button>
        <button onClick={resetProgress} className="min-h-11 px-4 rounded-xl text-sm text-slate-400 hover:text-white bg-slate-900 border border-slate-800">학습 기록 초기화</button>
      </div>
      {lessons.length === 0 ? (
        <div className="w-full max-w-3xl rounded-2xl border border-emerald-600 bg-emerald-950/40 p-8 text-center">
          <p className="text-xl font-bold text-emerald-300">모든 단계를 완료했습니다.</p>
          <button onClick={() => setReviewOnly(false)} className="mt-4 min-h-11 px-4 rounded-xl bg-emerald-700 font-bold">완료한 단계 다시 보기</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
          {lessons.map(lesson => {
            const index = LESSONS.findIndex(item => item.id === lesson.id);
            const done = completed.has(lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => onSelect(index)}
                className={`min-h-20 rounded-xl border-2 p-4 text-left transition-all ${done ? 'bg-emerald-950/50 border-emerald-600' : 'bg-slate-800 border-slate-700 hover:border-amber-400'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">{lesson.id}단계 · {lesson.level}</p>
                    <p className="font-bold text-white mt-1">{lesson.title}</p>
                  </div>
                  <span className={`text-sm font-bold ${done ? 'text-emerald-400' : 'text-slate-500'}`}>{done ? '완료' : '시작'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LessonPractice({ lesson, onBack, onNext }) {
  const initialFen = lesson.fen === 'start' ? new Chess().fen() : lesson.fen;
  const [fen, setFen] = useState(initialFen);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('이동할 기물을 누른 뒤 목적지를 누르세요.');
  const [completed, setCompleted] = useState(false);
  const [promotion, setPromotion] = useState(null);
  const game = useMemo(() => new Chess(fen), [fen]);
  const board = game.board();
  const legalMoves = selected ? game.moves({ square:selected, verbose:true }) : [];
  const legalTargets = new Set(legalMoves.map(move => move.to));

  function resetLesson() {
    setFen(initialFen);
    setSelected(null);
    setPromotion(null);
    setCompleted(false);
    setFeedback('다시 풀어보세요. 이동할 기물을 먼저 누르세요.');
  }

  function attemptMove(from, to, promotedTo = '') {
    const moveCode = `${from}${to}${promotedTo}`;
    if (!lesson.answers.includes(moveCode)) {
      setFeedback(`이번 문제의 목표와 다른 수입니다. ${lesson.wrongHint}`);
      setSelected(null);
      setPromotion(null);
      return;
    }
    const next = new Chess(game.fen());
    next.move({ from, to, promotion:promotedTo || undefined });
    setFen(next.fen());
    setSelected(null);
    setPromotion(null);
    setCompleted(true);
    setFeedback(`정답입니다. ${lesson.explanation}`);
    const saved = new Set(loadLessonProgress());
    saved.add(lesson.id);
    saveJSON(STORAGE_KEYS.lessons, [...saved]);
  }

  function clickSquare(square) {
    if (completed || promotion) return;
    if (selected && legalTargets.has(square)) {
      const isPromotion = legalMoves.some(move => move.to === square && move.promotion);
      if (isPromotion) setPromotion({ from:selected, to:square, color:'w' });
      else attemptMove(selected, square);
      return;
    }
    const piece = game.get(square);
    if (piece?.color === 'w') {
      setSelected(square);
      setFeedback(`${square} ${NAMES_KO[piece.type]}을/를 선택했습니다. 파란 표시의 칸을 누르세요.`);
    } else {
      setSelected(null);
    }
  }

  return (
    <div className="app-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="safe-header flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800">
        <button onClick={onBack} className="min-h-11 px-2 text-slate-400 hover:text-white">← 목록</button>
        <p className="font-bold text-amber-400 text-sm sm:text-base">{lesson.id}단계 · {lesson.title}</p>
        <span className="text-xs text-slate-500">{lesson.id}/{LESSONS.length}</span>
      </header>
      <main className="safe-main flex-1 w-full max-w-4xl mx-auto p-3 sm:p-5 flex flex-col md:flex-row items-center md:items-start gap-4">
        <div className="lesson-board relative w-full max-w-[520px] aspect-square grid grid-cols-8 overflow-hidden rounded-xl border-4 border-slate-700 shadow-2xl">
          {RANKS.map((rank, row) => FILES.map((file, column) => {
            const square = `${file}${rank}`;
            const piece = board[8 - rank][column];
            const target = legalTargets.has(square);
            const isSelected = selected === square;
            return (
              <button
                key={square}
                onClick={() => clickSquare(square)}
                aria-label={`${square} ${piece ? `${piece.color === 'w' ? '백' : '흑'} ${NAMES_KO[piece.type]}` : '빈 칸'}`}
                aria-pressed={isSelected}
                className={`relative flex items-center justify-center text-[clamp(1.35rem,8vw,3.2rem)] ${(row + column) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-700'} ${isSelected ? 'ring-4 ring-inset ring-sky-400' : ''}`}
              >
                {piece && <span className={`${PIECE_CLASS[piece.color]} select-none`}>{pieceGlyph(piece)}</span>}
                {target && <span className="absolute w-[28%] h-[28%] rounded-full bg-sky-500/75 pointer-events-none" />}
              </button>
            );
          }))}
          {promotion && <PromotionModal color="w" onSelect={type => attemptMove(promotion.from, promotion.to, type)} />}
        </div>
        <section className="w-full md:flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-bold text-amber-400 mb-2">이번 목표</p>
          <p className="text-lg font-bold leading-relaxed">{lesson.objective}</p>
          <div aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm leading-relaxed ${completed ? 'bg-emerald-950 text-emerald-200 border border-emerald-600' : 'bg-slate-900 text-slate-300'}`}>
            {feedback}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={resetLesson} className="min-h-12 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-sm">다시 풀기</button>
            {completed && (
              <button onClick={onNext} className="flex-1 min-h-12 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold">
                {lesson.id === LESSONS.length ? '학습 목록으로' : '다음 단계로 →'}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
