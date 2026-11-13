import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';

// ─── Constants ────────────────────────────────────────────────────────────────
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

// Both colors use the same solid silhouettes; color is conveyed by CSS fill
// only, so white and black pieces share an identical shape. The trailing
// U+FE0E (text variation selector) forces monochrome rendering so these glyphs
// are NOT shown as fixed-color emoji — otherwise white pieces appear black.
const GLYPH = { p:'♟︎', n:'♞︎', b:'♝︎', r:'♜︎', q:'♛︎', k:'♚︎' };
const pieceGlyph = p => p ? GLYPH[p.type] : null;

// Shared piece coloring (white fill w/ dark outline, dark fill w/ light outline).
const PIECE_CLASS = {
  w: 'text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000,0_0_6px_rgba(0,0,0,0.6)]',
  b: 'text-gray-900 [text-shadow:0_0_4px_rgba(255,255,255,1),1px_1px_0_rgba(255,255,255,0.8),-1px_-1px_0_rgba(255,255,255,0.8)]',
};

const NAMES_KO = { p:'폰', n:'나이트', b:'비숍', r:'룩', q:'퀸', k:'킹' };

const DESCRIPTIONS = {
  p: '앞으로 1칸 이동 (첫 수는 2칸 가능). 공격은 대각선 앞 1칸만 가능합니다. 상대 진영 끝까지 가면 원하는 기물로 바꿀 수 있습니다 (프로모션).',
  n: '"L"자 모양으로 이동합니다 (2칸 직선 + 1칸 측면). 다른 기물을 뛰어넘을 수 있는 유일한 기물입니다!',
  b: '대각선 방향으로 끝까지 이동합니다. 처음 위치한 색상의 칸에서만 움직이므로, 두 비숍은 서로 다른 색을 담당합니다.',
  r: '상하좌우 직선으로 끝까지 이동합니다. 킹과 함께 캐슬링(Castling)을 할 수 있습니다.',
  q: '직선과 대각선 모든 방향으로 끝까지 이동하는 체스 최강의 기물입니다.',
  k: '모든 방향으로 1칸만 이동합니다. 킹은 잡히는 기물이 아니며, 체크를 피할 방법이 없는 체크메이트가 되면 게임이 끝납니다.',
};

const PIECE_VALUES = { p:1, n:3, b:3.2, r:5, q:9, k:0 };

const DIFFICULTIES = [
  { id:'easy',   label:'초급', icon:'🌱', desc:'AI가 무작위로 수를 둡니다. 기물의 이동 규칙과 기본 감각을 익히기에 딱 좋은 단계입니다.' },
  { id:'medium', label:'중급', icon:'⚡', desc:'AI가 기물 잡기·체크를 우선하며 중앙 장악을 시도합니다. 핵심 전략을 배울 수 있습니다.' },
  { id:'hard',   label:'심화', icon:'🔥', desc:'AI가 미니맥스 알고리즘으로 3수 앞을 내다보며 최선의 수를 선택합니다.' },
];

const TIME_OPTIONS = [
  { label:'무제한', seconds:0,    icon:'∞',  desc:'시간 제한 없이 여유롭게' },
  { label:'1분',   seconds:60,   icon:'⚡', desc:'초고속 불릿' },
  { label:'3분',   seconds:180,  icon:'🔥', desc:'빠른 블리츠' },
  { label:'5분',   seconds:300,  icon:'⏱', desc:'표준 블리츠' },
  { label:'10분',  seconds:600,  icon:'🕐', desc:'래피드' },
  { label:'30분',  seconds:1800, icon:'♟', desc:'클래식' },
];

const STORAGE_KEYS = {
  game: 'chess-classroom-current-game-v2',
  preferences: 'chess-classroom-preferences-v1',
  lessons: 'chess-classroom-lessons-v1',
};

const LESSONS = [
  { id:1, title:'폰의 첫 이동', level:'기물 이동', fen:'start', expected:'e2e4', objective:'e2의 폰을 e4로 이동하세요.', explanation:'폰은 첫 이동에서 1칸 또는 2칸 전진할 수 있습니다.' },
  { id:2, title:'나이트의 L자 이동', level:'기물 이동', fen:'start', expected:'g1f3', objective:'g1의 나이트를 f3으로 이동하세요.', explanation:'나이트는 다른 기물을 뛰어넘을 수 있습니다.' },
  { id:3, title:'비숍의 대각선', level:'기물 이동', fen:'4k3/8/8/8/8/8/8/2B1K3 w - - 0 1', expected:'c1h6', objective:'c1의 비숍을 h6으로 이동하세요.', explanation:'비숍은 현재 위치의 칸과 같은 색의 대각선만 이동합니다.' },
  { id:4, title:'룩의 직선 이동', level:'기물 이동', fen:'4k3/8/8/8/8/8/8/R3K3 w - - 0 1', expected:'a1a8', objective:'a1의 룩을 a8로 이동하세요.', explanation:'룩은 상하좌우 직선으로 이동합니다.' },
  { id:5, title:'퀸의 긴 이동', level:'기물 이동', fen:'4k3/8/8/8/8/8/8/3QK3 w - - 0 1', expected:'d1h5', objective:'d1의 퀸을 h5로 이동하세요.', explanation:'퀸은 직선과 대각선을 모두 이용할 수 있습니다.' },
  { id:6, title:'킹의 안전한 이동', level:'기물 이동', fen:'7k/8/8/8/8/8/8/4K3 w - - 0 1', expected:'e1f2', objective:'e1의 킹을 f2로 이동하세요.', explanation:'킹은 모든 방향으로 1칸 이동하지만, 상대가 공격하는 칸으로는 갈 수 없습니다.' },
  { id:7, title:'상대 기물 잡기', level:'기초 전술', fen:'4k3/8/8/8/8/8/p7/R3K3 w - - 0 1', expected:'a1a2', objective:'a1의 룩으로 a2의 폰을 잡으세요.', explanation:'이동할 칸에 상대 기물이 있으면 그 기물을 잡습니다.' },
  { id:8, title:'체크에서 벗어나기', level:'기초 전술', fen:'4r1k1/8/8/8/8/8/8/4K3 w - - 0 1', expected:'e1d2', objective:'체크를 받은 e1의 킹을 d2로 피하세요.', explanation:'체크를 받으면 킹을 옮기거나, 공격을 막거나, 공격한 기물을 잡아야 합니다.' },
  { id:9, title:'킹사이드 캐슬링', level:'특수 규칙', fen:'4k3/8/8/8/8/8/8/4K2R w K - 0 1', expected:'e1g1', objective:'e1의 킹을 g1로 이동해 캐슬링하세요.', explanation:'캐슬링은 킹을 보호하면서 룩을 빠르게 활성화하는 특수 이동입니다.' },
  { id:10, title:'1수 체크메이트', level:'마무리', fen:'7k/5Q2/7K/8/8/8/8/8 w - - 0 1', expected:'f7g7', objective:'f7의 퀸을 g7로 옮겨 체크메이트하세요.', explanation:'상대 킹이 체크를 피할 방법이 하나도 없으면 체크메이트입니다.' },
];

function loadJSON(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}

function removeStoredGame() {
  try { window.localStorage.removeItem(STORAGE_KEYS.game); } catch { /* storage may be unavailable */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── AI ───────────────────────────────────────────────────────────────────────
function evaluate(game) {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let s = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sign = p.color === 'b' ? 1 : -1;
      const center = (3.5 - Math.abs(c - 3.5) + 3.5 - Math.abs(r - 3.5)) * 0.025;
      const activity = ['n', 'b', 'q'].includes(p.type) ? center : 0;
      const pawnAdvance = p.type === 'p' ? (p.color === 'w' ? 6 - r : r - 1) * 0.035 : 0;
      s += sign * (PIECE_VALUES[p.type] + activity + pawnAdvance);
    }
  }
  return s;
}

function minimax(game, depth, alpha, beta, maximizing) {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = game.moves({ verbose: true });
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const g = new Chess(game.fen()); g.move(m);
      best = Math.max(best, minimax(g, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const g = new Chess(game.fen()); g.move(m);
      best = Math.min(best, minimax(g, depth - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function getAIMove(game, difficulty) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  if (difficulty === 'medium') {
    let best = null, bestScore = -Infinity;
    for (const m of moves) {
      const g = new Chess(game.fen()); const r = g.move(m);
      let s = g.isCheckmate() ? 10000 : 0;
      if (!g.isCheckmate()) {
        if (g.isCheck()) s += 3;
        if (r.captured) s += PIECE_VALUES[r.captured] * 10;
        if (['d4','d5','e4','e5'].includes(r.to)) s += 1;
      }
      s += Math.random() * 0.3;
      if (s > bestScore) { bestScore = s; best = m; }
    }
    return best;
  }
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const g = new Chess(game.fen()); g.move(m);
    const s = minimax(g, 2, -Infinity, Infinity, false);
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

function explainRecommendedMove(move, after) {
  if (after.isCheckmate()) return '상대 킹이 피할 수 없는 체크메이트입니다.';
  if (move.flags?.includes('k') || move.flags?.includes('q')) return '킹을 보호하고 룩을 활성화하는 캐슬링입니다.';
  if (move.captured) return `상대의 ${NAMES_KO[move.captured]}을/를 잡아 기물 점수에서 이득을 얻는 수입니다.`;
  if (after.isCheck()) return '상대 킹에게 체크를 걸어 응수를 강제합니다.';
  if (['d4','d5','e4','e5'].includes(move.to)) return '중앙을 차지해 기물이 움직일 공간을 넓히는 수입니다.';
  if (['n','b'].includes(move.piece) && ['1','8'].includes(move.from[1])) return '나이트나 비숍을 첫자리에서 꺼내 공격과 방어에 참여시키는 수입니다.';
  return '기물 점수와 상대의 다음 대응을 함께 계산했을 때 안정적인 후보수입니다.';
}

function getHintAnalysis(game) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  let best = null, bestScore = Infinity, bestGame = null;
  for (const m of moves) {
    const g = new Chess(game.fen());
    const result = g.move(m);
    const s = minimax(g, 2, -Infinity, Infinity, true);
    if (s < bestScore) { bestScore = s; best = result; bestGame = g; }
  }
  return best ? {
    from: best.from,
    to: best.to,
    san: best.san,
    reason: explainRecommendedMove(best, bestGame),
  } : null;
}

// ─── Commentary & Tips ────────────────────────────────────────────────────────
function getCommentary(move, game) {
  if (!move) return '';
  const name = NAMES_KO[move.piece];
  if (game.isCheckmate()) return `체크메이트! AI의 ${name}이/가 결정적인 수를 완성했습니다.`;
  if (game.isCheck()) return `체크! AI의 ${name}이/가 킹을 위협합니다. 반드시 피하세요!`;
  if (move.flags?.includes('e')) return '앙파상(En Passant)! 폰만 사용하는 특수 잡기 기술입니다.';
  if (move.flags?.includes('k')) return 'AI가 킹사이드 캐슬링으로 킹을 보호했습니다.';
  if (move.flags?.includes('q')) return 'AI가 퀸사이드 캐슬링으로 킹을 보호하고 룩을 활성화했습니다.';
  if (move.captured) return `AI의 ${name}이/가 당신의 ${NAMES_KO[move.captured]}을/를 잡았습니다.`;
  if (['d4','d5','e4','e5'].includes(move.to)) return `AI가 중앙 ${move.to}을/를 장악하는 수를 뒀습니다.`;
  if (['n','b'].includes(move.piece) && move.from[1] === '8') return `AI가 ${name}을/를 전개해 공격과 방어에 참여시켰습니다.`;
  return `AI가 ${name}을/를 ${move.from} → ${move.to}으로 이동했습니다. 이제 AI가 공격하는 기물과 빈틈을 확인하세요.`;
}

function getTip(game, totalMoves) {
  if (game.isCheck()) return '⚠️ 체크! 킹을 이동하거나 체크를 막아야 합니다.';
  const pieces = game.board().flat().filter(Boolean);
  if (pieces.length <= 10) return '💡 [엔드게임] 기물이 많이 줄었습니다. 킹을 중앙으로 이동하고 폰 승격을 준비하세요.';
  if (totalMoves < 8 && game.get('e2')?.type === 'p' && game.get('d2')?.type === 'p')
    return '💡 [중앙] e폰이나 d폰을 움직여 기물이 나올 길을 만드세요.';
  if (game.get('b1')?.type === 'n' || game.get('g1')?.type === 'n' || game.get('c1')?.type === 'b' || game.get('f1')?.type === 'b')
    return '💡 [기물 전개] 첫자리에 남은 나이트·비숍을 먼저 꺼내세요.';
  if (totalMoves < 24 && game.get('e1')?.type === 'k')
    return '💡 [킹 보호] 조건이 된다면 캐슬링으로 킹을 보호하세요.';
  return '💡 상대의 다음 체크·잡기 수를 먼저 확인한 뒤 공격하세요.';
}

function getUserMoveFeedback(move, gameAfter) {
  if (gameAfter.isCheckmate()) return '훌륭합니다. 상대 킹이 피할 수 없는 체크메이트를 완성했습니다.';
  if (move.flags?.includes('k') || move.flags?.includes('q')) return '좋은 캐슬링입니다. 킹을 보호하고 룩을 활성화했습니다.';
  if (move.captured) return `${NAMES_KO[move.captured]}을/를 잡았습니다. 이동한 ${NAMES_KO[move.piece]}이/가 다시 잡히지 않는지도 확인하세요.`;
  if (gameAfter.isCheck()) return '좋은 체크입니다. AI는 킹을 피하거나 공격을 막아야 합니다.';
  if (['d4','d5','e4','e5'].includes(move.to)) return '중앙으로 진출했습니다. 중앙을 장악하면 다른 기물의 이동이 편해집니다.';
  if (['n','b'].includes(move.piece) && move.from[1] === '1') return `${NAMES_KO[move.piece]}을/를 전개했습니다. 현재 칸에서 중앙을 공격하는지 살펴보세요.`;
  return `${move.from} → ${move.to} 이동을 완료했습니다. AI의 다음 체크·잡기 수를 예상해보세요.`;
}

// ─── Screens ──────────────────────────────────────────────────────────────────
function ModeSelect({ onSelect, onResume, hasSavedGame, completedLessons }) {
  return (
    <div className="app-screen safe-page bg-slate-950 flex flex-col items-center justify-start sm:justify-center gap-6 sm:gap-10 px-4 py-6">
      <div className="text-center">
        <div className="text-6xl sm:text-7xl mb-3 select-none">♟</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2">체스 교실</h1>
        <p className="text-slate-400">배우고 연습할 방법을 선택하세요</p>
      </div>
      {hasSavedGame && (
        <button onClick={onResume}
          className="w-full max-w-md min-h-12 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg transition-all">
          ▶ 지난 게임 이어하기
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-4xl">
        <button onClick={() => onSelect('learn')}
          className="mode-card bg-slate-800/90 hover:bg-slate-700 border-2 border-amber-500/40 hover:border-amber-400 rounded-2xl p-5 sm:p-6 text-left transition-all shadow-xl">
          <div className="text-4xl mb-2">🎓</div>
          <h2 className="text-xl font-bold text-amber-400 mb-2">기초 학습</h2>
          <p className="text-slate-400 text-sm leading-relaxed">기물 이동부터 체크메이트까지 10단계로 연습합니다.</p>
          <p className="text-xs text-amber-300 mt-3">{completedLessons}/10 완료</p>
        </button>
        <button onClick={() => onSelect('ai')}
          className="mode-card bg-slate-800/90 hover:bg-slate-700 border-2 border-sky-500/40 hover:border-sky-400 rounded-2xl p-5 sm:p-6 text-left transition-all shadow-xl">
          <div className="text-4xl mb-2">🤖</div>
          <h2 className="text-xl font-bold text-sky-400 mb-2">1인용</h2>
          <p className="text-slate-400 text-sm leading-relaxed">AI와 대결하며 체스를 배웁니다.<br/>초급·중급·심화 · 힌트 · AI 수 설명</p>
        </button>
        <button onClick={() => onSelect('human')}
          className="mode-card bg-slate-800/90 hover:bg-slate-700 border-2 border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-5 sm:p-6 text-left transition-all shadow-xl">
          <div className="text-4xl mb-2">👥</div>
          <h2 className="text-xl font-bold text-emerald-400 mb-2">2인용</h2>
          <p className="text-slate-400 text-sm leading-relaxed">두 명이 같은 화면에서 대결합니다.<br/>타이머 · 잡은 기물 · 점수판 제공</p>
        </button>
      </div>
    </div>
  );
}

function DifficultySelect({ onSelect, onBack }) {
  return (
    <div className="app-screen safe-page bg-slate-950 flex flex-col items-center justify-center gap-8 px-4 py-6 sm:p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">난이도 선택</h1>
        <p className="text-slate-400">AI의 강도를 선택하세요</p>
      </div>
      <div className="flex flex-col gap-4 w-full max-w-lg">
        {DIFFICULTIES.map(d => (
          <button key={d.id} onClick={() => onSelect(d.id)}
            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-slate-400 rounded-2xl p-6 text-left transition-all shadow-lg flex items-start gap-4 group">
            <span className="text-4xl mt-0.5 group-hover:scale-110 transition-transform">{d.icon}</span>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{d.label}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{d.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <button onClick={onBack} className="text-slate-500 hover:text-slate-300 text-sm">← 뒤로</button>
    </div>
  );
}

function TimeSelect({ onSelect, onBack }) {
  return (
    <div className="app-screen safe-page bg-slate-950 flex flex-col items-center justify-center gap-8 px-4 py-6 sm:p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">시간 선택</h1>
        <p className="text-slate-400">플레이어당 제한 시간을 선택하세요</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {TIME_OPTIONS.map(t => (
          <button key={t.label} onClick={() => onSelect(t.seconds)}
            className="bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-emerald-400 rounded-2xl p-4 text-center transition-all shadow-lg group">
            <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">{t.icon}</div>
            <div className="text-lg font-bold text-white">{t.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={onBack} className="text-slate-500 hover:text-slate-300 text-sm">← 뒤로</button>
    </div>
  );
}

function LessonSelect({ onSelect, onBack }) {
  const completed = new Set(loadJSON(STORAGE_KEYS.lessons, []));
  return (
    <div className="app-screen safe-page bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6 sm:p-8">
      <div className="w-full max-w-3xl flex items-center justify-between mb-5">
        <button onClick={onBack} className="min-h-11 px-2 text-slate-400 hover:text-white">← 메뉴</button>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-400">기초 학습 10단계</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{completed.size}/10 완료</p>
        </div>
        <div className="w-16" />
      </div>
      <div className="w-full max-w-3xl h-2 rounded-full bg-slate-800 overflow-hidden mb-5" aria-label={`학습 진행도 ${completed.size}/10`}>
        <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all" style={{ width:`${completed.size * 10}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-3xl">
        {LESSONS.map((lesson, index) => {
          const done = completed.has(lesson.id);
          return (
            <button key={lesson.id} onClick={() => onSelect(index)}
              className={`min-h-20 rounded-xl border-2 p-4 text-left transition-all ${done ? 'bg-emerald-950/50 border-emerald-600' : 'bg-slate-800 border-slate-700 hover:border-amber-400'}`}>
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
    </div>
  );
}

function LessonPractice({ lesson, onBack, onNext }) {
  const [fen, setFen] = useState(() => lesson.fen === 'start' ? new Chess().fen() : lesson.fen);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('이동할 기물을 누른 뒤 목적지를 누르세요.');
  const [completed, setCompleted] = useState(false);
  const game = useMemo(() => new Chess(fen), [fen]);
  const board = game.board();
  const legalTargets = selected ? new Set(game.moves({ square:selected, verbose:true }).map(m => m.to)) : new Set();

  function clickSquare(sq) {
    if (completed) return;
    if (selected && legalTargets.has(sq)) {
      const moveCode = `${selected}${sq}`;
      if (moveCode !== lesson.expected) {
        setFeedback('옮길 수는 있지만 이번 문제의 목표 수는 아닙니다. 목표 문구를 다시 확인해보세요.');
        setSelected(null);
        return;
      }
      const next = new Chess(game.fen());
      next.move({ from:selected, to:sq, promotion:'q' });
      setFen(next.fen());
      setSelected(null);
      setCompleted(true);
      setFeedback(`정답입니다. ${lesson.explanation}`);
      const saved = new Set(loadJSON(STORAGE_KEYS.lessons, []));
      saved.add(lesson.id);
      saveJSON(STORAGE_KEYS.lessons, [...saved]);
      return;
    }
    const piece = game.get(sq);
    if (piece?.color === 'w') {
      setSelected(sq);
      setFeedback(`${sq} ${NAMES_KO[piece.type]}을/를 선택했습니다. 파란 표시의 칸을 누르세요.`);
    } else {
      setSelected(null);
    }
  }

  return (
    <div className="app-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="safe-header flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800">
        <button onClick={onBack} className="min-h-11 px-2 text-slate-400 hover:text-white">← 목록</button>
        <p className="font-bold text-amber-400 text-sm sm:text-base">{lesson.id}단계 · {lesson.title}</p>
        <span className="text-xs text-slate-500">{lesson.id}/10</span>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto p-3 sm:p-5 flex flex-col md:flex-row items-center md:items-start gap-4">
        <div className="lesson-board w-full max-w-[520px] aspect-square grid grid-cols-8 overflow-hidden rounded-xl border-4 border-slate-700 shadow-2xl">
          {RANKS.map((rank, r) => FILES.map((file, c) => {
            const sq = `${file}${rank}`;
            const piece = board[8 - rank][c];
            const target = legalTargets.has(sq);
            const isSelected = selected === sq;
            return (
              <button key={sq} onClick={() => clickSquare(sq)}
                aria-label={`${sq} ${piece ? `${piece.color === 'w' ? '백' : '흑'} ${NAMES_KO[piece.type]}` : '빈 칸'}`}
                aria-pressed={isSelected}
                className={`relative flex items-center justify-center text-[clamp(1.35rem,8vw,3.2rem)] ${(r + c) % 2 === 0 ? 'bg-amber-100' : 'bg-amber-700'} ${isSelected ? 'ring-4 ring-inset ring-sky-400' : ''}`}>
                {piece && <span className={`${PIECE_CLASS[piece.color]} select-none`}>{pieceGlyph(piece)}</span>}
                {target && <span className="absolute w-[28%] h-[28%] rounded-full bg-sky-500/75 pointer-events-none" />}
              </button>
            );
          }))}
        </div>
        <section className="w-full md:flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-bold text-amber-400 mb-2">이번 목표</p>
          <p className="text-lg font-bold leading-relaxed">{lesson.objective}</p>
          <div aria-live="polite" className={`mt-4 rounded-xl p-3 text-sm leading-relaxed ${completed ? 'bg-emerald-950 text-emerald-200 border border-emerald-600' : 'bg-slate-900 text-slate-300'}`}>
            {feedback}
          </div>
          {completed && (
            <button onClick={onNext} className="w-full min-h-12 mt-4 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold">
              {lesson.id === LESSONS.length ? '학습 목록으로' : '다음 단계로 →'}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── Promotion Modal ──────────────────────────────────────────────────────────
function PromotionModal({ color, rotated, onSelect }) {
  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
      <div style={rotated ? { transform: 'rotate(180deg)' } : undefined}
        className="bg-slate-800 rounded-2xl p-5 border border-slate-600 shadow-2xl">
        <p className="text-center text-sm font-bold text-slate-300 mb-3">승격할 기물을 선택하세요</p>
        <div className="flex gap-2">
          {['q', 'r', 'b', 'n'].map(t => (
            <button key={t} onClick={() => onSelect(t)}
              className="w-14 h-14 flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-xl transition-all">
              <span className={`text-3xl leading-none select-none ${PIECE_CLASS[color]}`}>{GLYPH[t]}</span>
              <span className="text-[0.6rem] text-slate-400 mt-0.5">{NAMES_KO[t]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Game Over Modal ──────────────────────────────────────────────────────────
function GameOverModal({ game, mode, timedOut, onReset, onMenu }) {
  let icon, title, sub;
  if (timedOut) {
    const winner = timedOut === 'w' ? 'b' : 'w';
    const winnerPieces = game.board().flat().filter(p => p?.color === winner && p.type !== 'k');
    const minors = winnerPieces.filter(p => p.type === 'b' || p.type === 'n').length;
    const canPossiblyMate = winnerPieces.some(p => ['p','r','q'].includes(p.type)) || minors >= 2;
    if (!canPossiblyMate) {
      icon = '🤝'; title = '무승부!';
      sub = '시간은 끝났지만 상대에게 체크메이트 가능한 기물이 없습니다';
    } else {
      icon = '⏰'; title = '시간 초과!';
      sub = timedOut === 'w' ? '흑(Black) 승리 — 백의 시간이 다 됐습니다' : '백(White) 승리 — 흑의 시간이 다 됐습니다';
    }
  } else if (game.isCheckmate()) {
    const loser = game.turn();
    if (mode === 'ai') {
      if (loser === 'w') { icon = '😓'; title = 'AI 승리!'; sub = '다시 도전해보세요!'; }
      else               { icon = '🎉'; title = '당신의 승리!'; sub = 'AI를 이겼습니다!'; }
    } else {
      icon = '🏆'; title = loser === 'w' ? '흑(Black) 승리!' : '백(White) 승리!'; sub = '체크메이트';
    }
  } else {
    icon = '🤝'; title = '무승부!';
    if (game.isStalemate()) sub = '스테일메이트';
    else if (game.isThreefoldRepetition()) sub = '3회 반복';
    else if (game.isInsufficientMaterial()) sub = '체크메이트할 기물 부족';
    else sub = '50수 규칙';
  }
  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
      <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-600 shadow-2xl w-72">
        <div className="text-6xl mb-3 select-none">{icon}</div>
        <h2 className="text-3xl font-bold text-white mb-1">{title}</h2>
        <p className="text-slate-400 mb-6 text-sm">{sub}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onReset} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm transition-all">다시 하기</button>
          <button onClick={onMenu}  className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-xl font-bold text-sm transition-all">메뉴로</button>
        </div>
      </div>
    </div>
  );
}

// ─── Player Card ──────────────────────────────────────────────────────────────
function PlayerCard({ color, time, timeControl, isActive, capturedTypes, advantage, isTimedOut, compact = false }) {
  const isWhite = color === 'w';
  const isLow   = timeControl > 0 && time <= 30;
  const oppColor = isWhite ? 'b' : 'w';

  return (
    <div className={`rounded-2xl ${compact ? 'px-3 py-2' : 'p-4'} border-2 transition-all duration-300 ${
      isTimedOut ? 'border-red-500 bg-red-950/40' :
      isActive   ? 'border-emerald-400 bg-slate-700 shadow-[0_0_20px_rgba(52,211,153,0.15)]' :
                   'border-slate-700 bg-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none">{isWhite ? '⚪' : '⚫'}</span>
          <div>
            <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
              {isWhite ? '백 (White)' : '흑 (Black)'}
            </p>
            {isActive && !isTimedOut && (
              <p className="text-xs text-emerald-400 leading-none animate-pulse">● 차례</p>
            )}
          </div>
        </div>
        {timeControl > 0 && (
          <div className={`${compact ? 'text-2xl' : 'text-3xl'} font-mono font-bold tabular-nums ${
            isTimedOut             ? 'text-red-400' :
            isLow && isActive      ? 'text-red-400 animate-pulse' :
            isActive               ? 'text-white' : 'text-slate-500'
          }`}>
            {formatTime(time)}
          </div>
        )}
      </div>

      {/* Captured pieces + material advantage */}
      <div className="flex items-center flex-wrap gap-0.5 min-h-[1.4rem]">
        {[...capturedTypes]
          .sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a])
          .map((type, i) => (
            <span key={i} className={`text-base leading-none select-none ${
              oppColor === 'w'
                ? 'text-white [text-shadow:-1px_-1px_0_#555,1px_1px_0_#555]'
                : 'text-slate-900 drop-shadow'
            }`}>
              {GLYPH[type]}
            </span>
          ))}
        {advantage > 0 && (
          <span className="text-xs font-bold text-emerald-400 ml-1">+{advantage}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ChessApp() {
  const [screen, setScreen]               = useState('menu');
  const [gameMode, setGameMode]           = useState('ai');
  const [difficulty, setDifficulty]       = useState(() => loadJSON(STORAGE_KEYS.preferences, {}).difficulty ?? 'medium');
  const [moveSANs, setMoveSANs]           = useState([]);
  const [selectedSq, setSelectedSq]       = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [commentary, setCommentary]       = useState('');
  const [userFeedback, setUserFeedback]   = useState('');
  const [tip, setTip]                     = useState('');
  const [hint, setHint]                   = useState(null);
  const [timeControl, setTimeControl]     = useState(() => loadJSON(STORAGE_KEYS.preferences, {}).timeControl ?? 300);
  const [whiteTime, setWhiteTime]         = useState(() => loadJSON(STORAGE_KEYS.preferences, {}).timeControl ?? 300);
  const [blackTime, setBlackTime]         = useState(() => loadJSON(STORAGE_KEYS.preferences, {}).timeControl ?? 300);
  const [timedOut, setTimedOut]           = useState(null);
  const [boardView, setBoardView]         = useState('w');   // 2P: orientation currently shown
  const [boardFade, setBoardFade]         = useState(false); // 2P: true while mid-flip (faded out)
  const [promotion, setPromotion]         = useState(null);  // { from, to, color } when choosing
  const [savedGame, setSavedGame]         = useState(() => loadJSON(STORAGE_KEYS.game, null));
  const [lessonIndex, setLessonIndex]     = useState(0);
  const [showHistory, setShowHistory]     = useState(false);

  const aiInProgress  = useRef(false);
  const aiTimer       = useRef(null);
  const timerInterval = useRef(null);
  const flipTimer     = useRef(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const game = useMemo(() => {
    const g = new Chess();
    for (const san of moveSANs) try { g.move(san); } catch { break; }
    return g;
  }, [moveSANs]);

  const board = useMemo(() => game.board(), [game]);

  // AI is "thinking" exactly while it is black's turn in an active AI game.
  const aiThinking = gameMode === 'ai' && screen === 'game'
    && game.turn() === 'b' && !game.isGameOver() && !timedOut;

  const legalMoves = useMemo(() => {
    if (!selectedSq) return [];
    try { return game.moves({ square: selectedSq, verbose: true }); } catch { return []; }
  }, [game, selectedSq]);

  const legalTargets = useMemo(() => new Set(legalMoves.map(m => m.to)), [legalMoves]);

  const kingCheckSq = useMemo(() => {
    if (!game.isCheck()) return null;
    const turn = game.turn();
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p?.type === 'k' && p.color === turn) return `${FILES[c]}${RANKS[r]}`;
      }
    return null;
  }, [game, board]);

  const capturedByColor = useMemo(() => {
    const byWhite = [], byBlack = [];
    for (const move of game.history({ verbose: true })) {
      if (move.captured) {
        if (move.color === 'w') byWhite.push(move.captured);
        else byBlack.push(move.captured);
      }
    }
    return { byWhite, byBlack };
  }, [game]);

  const materialAdvantage = useMemo(() => {
    let s = 0;
    for (const p of capturedByColor.byWhite) s += PIECE_VALUES[p];
    for (const p of capturedByColor.byBlack) s -= PIECE_VALUES[p];
    return s;
  }, [capturedByColor]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    saveJSON(STORAGE_KEYS.preferences, { difficulty, timeControl });
  }, [difficulty, timeControl]);

  // Save an unfinished match locally. A closed tab can be resumed later.
  useEffect(() => {
    if (screen !== 'game' || moveSANs.length === 0 || game.isGameOver() || timedOut) {
      if (screen === 'game' && (game.isGameOver() || timedOut)) removeStoredGame();
      return;
    }
    saveJSON(STORAGE_KEYS.game, {
      gameMode, difficulty, moveSANs, timeControl, whiteTime, blackTime, boardView,
      savedAt: Date.now(),
    });
  }, [screen, game, gameMode, difficulty, moveSANs, timeControl, whiteTime, blackTime, boardView, timedOut]);

  // AI
  useEffect(() => {
    if (screen !== 'game') return;
    if (gameMode !== 'ai' || game.turn() !== 'b' || game.isGameOver()) return;
    if (aiInProgress.current) return;
    aiInProgress.current = true;
    const cGame = game, cCount = moveSANs.length, cDiff = difficulty;
    const delay = difficulty === 'hard' ? 1400 : 900;
    aiTimer.current = setTimeout(() => {
      const aiMove = getAIMove(cGame, cDiff);
      if (aiMove) {
        const g = new Chess(cGame.fen());
        const result = g.move(aiMove);
        setMoveSANs(prev => [...prev, result.san]);
        setCommentary(getCommentary(result, g));
        if (!g.isGameOver()) setTip(getTip(g, cCount + 1));
      }
      aiInProgress.current = false;
    }, delay);
    return () => { clearTimeout(aiTimer.current); aiInProgress.current = false; };
    // `game`/`difficulty` are intentionally omitted: `game` derives from `moveSANs`
    // (already a dep) and adding it would re-fire the effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSANs, gameMode, screen]);

  // Chess clock — calculate from real elapsed time so iPhone/iPad background
  // throttling does not make the clock run slower than real time.
  useEffect(() => {
    clearInterval(timerInterval.current);
    if (screen !== 'game' || gameMode !== 'human' || timeControl === 0) return;
    if (game.isGameOver() || timedOut) return;
    const activeColor = game.turn();
    const startedAt = Date.now();
    const startingTime = activeColor === 'w' ? whiteTime : blackTime;
    timerInterval.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, startingTime - elapsed);
      (activeColor === 'w' ? setWhiteTime : setBlackTime)(remaining);
      if (remaining === 0) {
        clearInterval(timerInterval.current);
        setTimedOut(activeColor);
      }
    }, 250);
    return () => clearInterval(timerInterval.current);
    // Time states are captured once per turn; adding them would restart the clock every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSANs, screen, gameMode, timedOut, timeControl]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  // Apply a move (promo = promotion piece, ignored for non-promotion moves).
  function applyMove(from, to, promo) {
    const g = new Chess(game.fen());
    const result = g.move({ from, to, promotion: promo });
    if (!result) return;
    setMoveSANs(prev => [...prev, result.san]);
    if (gameMode === 'ai' && result.color === 'w') setUserFeedback(getUserMoveFeedback(result, g));
    if (gameMode === 'ai' && !g.isGameOver()) { setTip('🤖 AI가 다음 수를 계산하고 있습니다...'); setCommentary(''); }
    else if (gameMode === 'human' && !g.isGameOver()) {
      setTip(g.turn() === 'w' ? '⚪ 백(White) 차례입니다' : '⚫ 흑(Black) 차례입니다');
    }
  }

  function handlePromote(type) {
    if (!promotion) return;
    applyMove(promotion.from, promotion.to, type);
    setPromotion(null);
  }

  function handleSquareClick(sq) {
    if (game.isGameOver() || aiThinking || timedOut || promotion) return;
    if (gameMode === 'ai' && game.turn() !== 'w') return;
    setHint(null);
    if (selectedSq && legalTargets.has(sq)) {
      // Pawn reaching the last rank → ask which piece to promote to.
      const isPromo = legalMoves.some(m => m.to === sq && m.flags.includes('p'));
      if (isPromo) {
        setPromotion({ from: selectedSq, to: sq, color: game.turn() });
      } else {
        applyMove(selectedSq, sq);
      }
      setSelectedSq(null); setSelectedPiece(null);
      return;
    }
    const r = 8 - Number(sq[1]), c = FILES.indexOf(sq[0]);
    const piece = board[r][c];
    if (!piece) { setSelectedSq(null); setSelectedPiece(null); return; }
    const isMyPiece = gameMode === 'human' ? piece.color === game.turn() : piece.color === 'w';
    if (isMyPiece) { setSelectedSq(sq); setSelectedPiece(piece); }
    else           { setSelectedSq(null); setSelectedPiece(null); }
  }

  function handleHint() {
    const best = getHintAnalysis(game);
    if (best) {
      setHint(best);
      setTip(`💡 추천 ${best.san}: ${best.reason}`);
    }
  }

  function handleUndo() {
    clearTimeout(aiTimer.current); aiInProgress.current = false;
    clearInterval(timerInterval.current); clearTimeout(flipTimer.current);
    setBoardFade(false); setPromotion(null);
    setHint(null);
    setSelectedSq(null); setSelectedPiece(null); setCommentary(''); setUserFeedback('');
    setTip('한 수 물렀습니다.');
    setMoveSANs(prev => {
      const cut = gameMode === 'ai' ? Math.max(0, prev.length - 2) : prev.length - 1;
      return prev.slice(0, cut);
    });
  }

  // 2-player: manually flip the board (fade out → swap orientation → fade in).
  function handleFlip() {
    if (boardFade) return;
    clearTimeout(flipTimer.current);
    setBoardFade(true);
    flipTimer.current = setTimeout(() => {
      setBoardView(v => (v === 'w' ? 'b' : 'w'));
      setBoardFade(false);
    }, 220);
  }

  function handleReset() {
    if (moveSANs.length > 0 && !game.isGameOver() && !timedOut && !window.confirm('현재 게임을 지우고 새로 시작할까요?')) return;
    clearTimeout(aiTimer.current); aiInProgress.current = false;
    clearInterval(timerInterval.current); clearTimeout(flipTimer.current);
    setMoveSANs([]); setSelectedSq(null);
    setSelectedPiece(null); setCommentary(''); setUserFeedback(''); setHint(null);
    setBoardView('w'); setBoardFade(false); setPromotion(null);
    setWhiteTime(timeControl); setBlackTime(timeControl); setTimedOut(null);
    removeStoredGame(); setSavedGame(null);
    setTip(gameMode === 'ai' ? '💡 중앙 폰(e4 또는 d4)을 먼저 전진시켜보세요!' : '⚪ 백(White) 차례입니다');
  }

  function startGame(mode, diff, tc) {
    clearTimeout(aiTimer.current); aiInProgress.current = false;
    clearInterval(timerInterval.current); clearTimeout(flipTimer.current);
    const tc_ = tc ?? timeControl;
    setGameMode(mode);
    if (diff !== undefined) setDifficulty(diff);
    setTimeControl(tc_);
    setWhiteTime(tc_); setBlackTime(tc_); setTimedOut(null);
    setBoardView('w'); setBoardFade(false); setPromotion(null);
    setScreen('game');
    setMoveSANs([]); setSelectedSq(null); setSelectedPiece(null);
    setCommentary(''); setUserFeedback(''); setHint(null); setShowHistory(false);
    removeStoredGame(); setSavedGame(null);
    setTip(mode === 'ai' ? '💡 중앙 폰(e4 또는 d4)을 먼저 전진시켜보세요!' : '⚪ 백(White) 차례입니다');
  }

  function handleModeSelect(mode) {
    if (mode === 'learn') setScreen('lessons');
    else if (mode === 'ai') { setGameMode('ai'); setScreen('difficulty'); }
    else { setGameMode('human'); setScreen('timeSelect'); }
  }

  function resumeGame() {
    const saved = savedGame ?? loadJSON(STORAGE_KEYS.game, null);
    if (!saved?.moveSANs?.length) return;
    clearTimeout(aiTimer.current); clearInterval(timerInterval.current);
    setGameMode(saved.gameMode === 'human' ? 'human' : 'ai');
    setDifficulty(saved.difficulty ?? 'medium');
    setTimeControl(saved.timeControl ?? 0);
    setWhiteTime(saved.whiteTime ?? saved.timeControl ?? 0);
    setBlackTime(saved.blackTime ?? saved.timeControl ?? 0);
    setBoardView(saved.boardView === 'b' ? 'b' : 'w');
    setMoveSANs(saved.moveSANs);
    setTimedOut(null); setPromotion(null); setSelectedSq(null); setSelectedPiece(null);
    setCommentary(''); setUserFeedback('저장한 지점에서 게임을 이어갑니다.'); setHint(null);
    setTip(saved.gameMode === 'human' ? '저장한 2인용 게임을 재개했습니다.' : '💡 상대의 다음 체크·잡기 수를 확인하세요.');
    setScreen('game');
  }

  function goMenu() {
    if (moveSANs.length > 0 && !game.isGameOver() && !timedOut) {
      saveJSON(STORAGE_KEYS.game, {
        gameMode, difficulty, moveSANs, timeControl, whiteTime, blackTime, boardView,
        savedAt: Date.now(),
      });
      if (!window.confirm('현재 게임은 자동 저장됩니다. 메뉴로 이동할까요?')) return;
    }
    clearTimeout(aiTimer.current);
    clearInterval(timerInterval.current); clearTimeout(flipTimer.current);
    setPromotion(null);
    setSavedGame(loadJSON(STORAGE_KEYS.game, null));
    setScreen('menu');
  }

  // ── Routing ────────────────────────────────────────────────────────────────
  if (screen === 'menu')       return <ModeSelect onSelect={handleModeSelect} onResume={resumeGame} hasSavedGame={!!savedGame?.moveSANs?.length} completedLessons={loadJSON(STORAGE_KEYS.lessons, []).length} />;
  if (screen === 'difficulty') return <DifficultySelect onSelect={d => startGame('ai', d)} onBack={() => setScreen('menu')} />;
  if (screen === 'timeSelect') return <TimeSelect onSelect={tc => startGame('human', undefined, tc)} onBack={() => setScreen('menu')} />;
  if (screen === 'lessons')    return <LessonSelect onSelect={i => { setLessonIndex(i); setScreen('lesson'); }} onBack={() => setScreen('menu')} />;
  if (screen === 'lesson')     return <LessonPractice key={LESSONS[lessonIndex].id} lesson={LESSONS[lessonIndex]} onBack={() => setScreen('lessons')} onNext={() => {
    if (lessonIndex < LESSONS.length - 1) setLessonIndex(i => i + 1);
    else setScreen('lessons');
  }} />;

  // ── Game screen ────────────────────────────────────────────────────────────
  const isOver    = game.isGameOver() || !!timedOut;
  const pairCount = Math.ceil(moveSANs.length / 2);
  const diffInfo  = DIFFICULTIES.find(d => d.id === difficulty);
  const whiteMat  = materialAdvantage > 0 ? Math.round(materialAdvantage) : 0;
  const blackMat  = materialAdvantage < 0 ? Math.round(-materialAdvantage) : 0;

  // Board renderer — flipped=true shows board from black's perspective.
  // rotateColor: that army's piece symbols are rotated 180° so the player sitting
  // across the table (offline face-to-face) reads their own pieces upright.
  function renderBoard(flipped = false, rotateColor = null) {
    const dispRanks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const dispFiles = flipped ? ['h','g','f','e','d','c','b','a'] : FILES;
    return (
      <div className="relative w-full aspect-square">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl">
          {dispRanks.map((rank, rIdx) =>
            dispFiles.map((file, cIdx) => {
              const sq         = `${file}${rank}`;
              const piece      = board[8 - rank][FILES.indexOf(file)];
              const isSelected = selectedSq === sq;
              const isTarget   = legalTargets.has(sq);
              const isHint     = hint?.from === sq || hint?.to === sq;
              const isCheck    = kingCheckSq === sq;
              const glyph      = pieceGlyph(piece);
              const isLight    = (rIdx + cIdx) % 2 === 0;
              const lc         = isLight ? 'text-amber-700/70' : 'text-amber-100/70';
              // 2-player: the far half (top, rIdx<4) faces the across-the-table
              // player, so its coordinate labels are rotated 180° to read upright.
              const farHalf    = !!rotateColor && rIdx < 4;

              let ring = '';
              if (isCheck)         ring = 'ring-4 ring-inset ring-red-500 bg-red-400/30';
              else if (isSelected) ring = 'ring-4 ring-inset ring-sky-400 bg-sky-300/20';
              else if (isHint)     ring = 'ring-4 ring-inset ring-yellow-400 bg-yellow-200/20';

              return (
                <button key={sq} onClick={() => handleSquareClick(sq)}
                  aria-label={`${sq} ${piece ? `${piece.color === 'w' ? '백' : '흑'} ${NAMES_KO[piece.type]}` : '빈 칸'}`}
                  aria-pressed={isSelected}
                  className={`relative flex items-center justify-center h-full text-[clamp(1rem,5vw,3rem)] ${isLight ? 'bg-amber-100' : 'bg-amber-700'} ${ring} hover:brightness-110 transition-all`}>
                  {cIdx === 0 && <span style={farHalf ? { transform: 'rotate(180deg)' } : undefined} className={`absolute top-0.5 left-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${lc}`}>{rank}</span>}
                  {rIdx === 7 && <span className={`absolute bottom-0.5 right-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${lc}`}>{file}</span>}
                  {/* 2-player: extra file labels on the top edge, rotated for the far player */}
                  {rotateColor && rIdx === 0 && <span style={{ transform: 'rotate(180deg)' }} className={`absolute top-0.5 right-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${lc}`}>{file}</span>}
                  {glyph && (
                    <span style={piece?.color === rotateColor ? { transform: 'rotate(180deg)' } : undefined}
                      className={`${PIECE_CLASS[piece.color]} select-none`}>
                      {glyph}
                    </span>
                  )}
                  {isTarget && <span className="absolute w-[28%] h-[28%] rounded-full bg-sky-500/70 shadow-[0_0_10px_rgba(14,165,233,0.8)] animate-pulse pointer-events-none" />}
                </button>
              );
            })
          )}
        </div>
        {promotion && <PromotionModal color={promotion.color} rotated={promotion.color === rotateColor} onSelect={handlePromote} />}
        {isOver && <GameOverModal game={game} mode={gameMode} timedOut={timedOut} onReset={handleReset} onMenu={goMenu} />}
      </div>
    );
  }

  // ── AI mode ────────────────────────────────────────────────────────────────
  if (gameMode === 'ai') {
    return (
      <div className="app-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="safe-header flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-800 flex-shrink-0">
          <h1 className="text-lg font-bold text-emerald-400">♟ 체스 교실</h1>
          <div className="flex items-center gap-2">
            {aiThinking && <span className="text-xs text-sky-400 animate-pulse">AI 생각 중...</span>}
            {diffInfo && <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{diffInfo.icon} {diffInfo.label}</span>}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-900 text-sky-300">🤖 AI 연습</span>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-3 py-4 flex flex-col md:flex-row gap-4 items-start">
          <div className="ai-board w-full md:w-[52%] lg:max-w-[520px] flex-shrink-0 mx-auto md:mx-0">
            {renderBoard(false)}
          </div>
          <div className="w-full md:flex-1 flex flex-col gap-3">
            <div className={`rounded-xl px-4 py-3 border ${game.isCheck() ? 'bg-red-950/80 border-red-500/60' : 'bg-slate-800 border-slate-700'}`}>
              <p className="text-sm font-semibold leading-relaxed text-emerald-300">{tip}</p>
            </div>
            {commentary && (
              <div className="bg-slate-900 rounded-xl px-4 py-3 border border-sky-500/30">
                <p className="text-xs font-semibold text-sky-500 mb-1">🤖 AI 수 설명</p>
                <p className="text-sm text-sky-200 leading-relaxed">{commentary}</p>
              </div>
            )}
            {userFeedback && (
              <div aria-live="polite" className="bg-emerald-950/50 rounded-xl px-4 py-3 border border-emerald-500/30">
                <p className="text-xs font-semibold text-emerald-500 mb-1">🎓 내 수 피드백</p>
                <p className="text-sm text-emerald-200 leading-relaxed">{userFeedback}</p>
              </div>
            )}
            <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 min-h-[80px] flex flex-col justify-center">
              {selectedPiece ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl select-none">{pieceGlyph(selectedPiece)}</span>
                    <span className="font-bold text-sky-400">{NAMES_KO[selectedPiece.type]}</span>
                    <span className="text-xs text-slate-500">{selectedPiece.color === 'w' ? '(백)' : '(흑)'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{DESCRIPTIONS[selectedPiece.type]}</p>
                </>
              ) : (
                <p className="text-xs text-slate-500 text-center">기물을 클릭하면 이동 규칙이 표시됩니다</p>
              )}
            </div>
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <p className="text-xs font-semibold text-slate-400 mb-2">📋 기보 ({moveSANs.length}수)</p>
              <div className="max-h-36 md:max-h-52 overflow-y-auto text-xs font-mono">
                {moveSANs.length === 0 ? <p className="text-slate-600 text-center py-2">아직 수가 없습니다</p> : (
                  <div className="grid grid-cols-[1.5rem_1fr_1fr] gap-x-2 gap-y-0.5">
                    {Array.from({ length: pairCount }).map((_, i) => (
                      <React.Fragment key={i}>
                        <span className="text-slate-500 text-right">{i + 1}.</span>
                        <span className="text-white">{moveSANs[i * 2] ?? ''}</span>
                        <span className="text-slate-400">{moveSANs[i * 2 + 1] ?? ''}</span>
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleHint} disabled={game.turn() !== 'w' || aiThinking || isOver}
                className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all">
                💡 힌트
              </button>
              <button onClick={handleUndo} disabled={moveSANs.length === 0 || aiThinking || game.turn() === 'b'}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all">
                ↩ 무르기
              </button>
              <button onClick={handleReset} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-sm transition-all">
                🔄 초기화
              </button>
            </div>
            <button onClick={goMenu} className="py-2 text-slate-500 hover:text-slate-300 text-sm text-center transition-all">← 메뉴로 돌아가기</button>
          </div>
        </main>
      </div>
    );
  }

  // ── 2-player mode ──────────────────────────────────────────────────────────
  const isBlackTurn = game.turn() === 'b' && !isOver;
  const isWhiteTurn = game.turn() === 'w' && !isOver;

  // Offline face-to-face: the board stays fixed (no auto-flip). `boardView` is
  // the near-side army shown at the bottom; the far-side army's pieces are
  // rotated 180° so the player across the table reads them upright. A manual
  // "보드 뒤집기" button toggles `boardView` with a fade.
  const bottomColor = boardView;          // near-side player (bottom of board)
  const topColor    = bottomColor === 'w' ? 'b' : 'w';  // far-side player
  const cardFor = color => color === 'w'
    ? { color:'w', time:whiteTime, timeControl, isActive:isWhiteTurn, capturedTypes:capturedByColor.byWhite, advantage:whiteMat, isTimedOut:timedOut === 'w' }
    : { color:'b', time:blackTime, timeControl, isActive:isBlackTurn, capturedTypes:capturedByColor.byBlack, advantage:blackMat, isTimedOut:timedOut === 'b' };

  return (
    <div className="app-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="safe-header flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-800 flex-shrink-0">
        <h1 className="text-lg font-bold text-emerald-400">♟ 체스 교실</h1>
        <div className="flex items-center gap-2">
          {timeControl > 0 && <span className="text-xs text-slate-400">{TIME_OPTIONS.find(t => t.seconds === timeControl)?.label}</span>}
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-900 text-emerald-300">👥 2인용</span>
          <button onClick={goMenu} className="text-xs text-slate-500 hover:text-slate-300 transition-all ml-2">← 메뉴</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-2 sm:p-3 lg:p-4 w-full max-w-7xl mx-auto items-start">
        {/* Board column: far-side card → board → near-side card */}
        <div className="two-player-column flex flex-col gap-1.5 w-full mx-auto lg:mx-0 flex-none">
          {/* Top card — far-side player; rotated 180° (like their pieces) so the
              across-the-table player reads their own info upright. */}
          <div style={{ transform: 'rotate(180deg)' }}>
            <PlayerCard {...cardFor(topColor)} compact />
          </div>

          {/* Fixed board; the top army's pieces are rotated 180° to face the
              far-side player. Opacity fades only on a manual flip. */}
          <div className="w-full transition-opacity duration-200 ease-in-out"
            style={{ opacity: boardFade ? 0 : 1 }}>
            {renderBoard(bottomColor === 'b', topColor)}
          </div>

          {/* Bottom card — near-side player */}
          <PlayerCard {...cardFor(bottomColor)} compact />

          <div className="flex gap-2">
            <button onClick={handleUndo} disabled={moveSANs.length === 0 || !!timedOut}
              className="flex-1 min-h-11 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all">
              ↩ 무르기
            </button>
            <button onClick={handleReset} className="flex-1 min-h-11 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-sm transition-all">
              🔄 새 게임
            </button>
          </div>
          <button onClick={handleFlip} disabled={boardFade}
            className="min-h-11 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 rounded-xl font-bold text-sm transition-all">
            ⟲ 보드 뒤집기
          </button>
        </div>

        {/* Side panel: tip + move history. Stacks below the board on mobile. */}
        <div className="flex flex-col gap-3 w-full lg:w-64 xl:w-80 lg:flex-1">
          <div className={`rounded-xl px-4 py-3 border ${game.isCheck() ? 'bg-red-950/80 border-red-500/60' : 'bg-slate-800 border-slate-700'}`}>
            <p className="text-sm font-semibold leading-relaxed text-emerald-300">{tip}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex-1">
            <button onClick={() => setShowHistory(v => !v)} className="w-full min-h-10 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>📋 기보 ({moveSANs.length}수)</span><span>{showHistory ? '숨기기 ▲' : '보기 ▼'}</span>
            </button>
            {showHistory && <div className="overflow-y-auto text-xs font-mono max-h-40 lg:max-h-[60vh]">
              {moveSANs.length === 0 ? <p className="text-slate-600 text-center py-2">아직 수가 없습니다</p> : (
                <div className="grid grid-cols-[1.5rem_1fr_1fr] gap-x-2 gap-y-0.5">
                  {Array.from({ length: pairCount }).map((_, i) => (
                    <React.Fragment key={i}>
                      <span className="text-slate-500 text-right">{i + 1}.</span>
                      <span className="text-white">{moveSANs[i * 2] ?? ''}</span>
                      <span className="text-slate-400">{moveSANs[i * 2 + 1] ?? ''}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>}
          </div>
        </div>
      </main>
    </div>
  );
}
