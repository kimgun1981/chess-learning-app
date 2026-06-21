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

const NAMES_KO = { p:'폰', n:'나이트', b:'비숍', r:'룩', q:'퀸', k:'킹' };

const DESCRIPTIONS = {
  p: '앞으로 1칸 이동 (첫 수는 2칸 가능). 공격은 대각선 앞 1칸만 가능합니다. 상대 진영 끝까지 가면 원하는 기물로 바꿀 수 있습니다 (프로모션).',
  n: '"L"자 모양으로 이동합니다 (2칸 직선 + 1칸 측면). 다른 기물을 뛰어넘을 수 있는 유일한 기물입니다!',
  b: '대각선 방향으로 끝까지 이동합니다. 처음 위치한 색상의 칸에서만 움직이므로, 두 비숍은 서로 다른 색을 담당합니다.',
  r: '상하좌우 직선으로 끝까지 이동합니다. 킹과 함께 캐슬링(Castling)을 할 수 있습니다.',
  q: '직선과 대각선 모든 방향으로 끝까지 이동하는 체스 최강의 기물입니다.',
  k: '모든 방향으로 1칸만 이동합니다. 킹이 잡히면 (체크메이트) 게임이 끝납니다.',
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
  for (const row of game.board())
    for (const p of row)
      if (p) s += (p.color === 'b' ? 1 : -1) * PIECE_VALUES[p.type];
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

function getHintMove(game) {
  const moves = game.moves({ verbose: true });
  if (!moves.length) return null;
  let best = null, bestScore = -Infinity;
  for (const m of moves) {
    const g = new Chess(game.fen()); const r = g.move(m);
    let s = g.isCheckmate() ? 10000 : 0;
    if (!g.isCheckmate()) {
      if (g.isCheck()) s += 3;
      if (r.captured) s += PIECE_VALUES[r.captured] * 10;
      if (['d4','d5','e4','e5'].includes(r.to)) s += 1;
    }
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
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
  return `AI가 ${name}을/를 ${move.from} → ${move.to}으로 이동했습니다.`;
}

function getTip(game, totalMoves) {
  if (game.isCheck()) return '⚠️ 체크! 킹을 이동하거나 체크를 막아야 합니다.';
  if (totalMoves < 6)  return '💡 [오프닝] 중앙 폰(e4 또는 d4)을 먼저 전진시켜 중앙을 장악하세요.';
  if (totalMoves < 14) return '💡 [오프닝] 나이트·비숍을 전개하고, 캐슬링으로 킹을 보호하세요.';
  if (totalMoves < 30) return '💡 [미들게임] 룩을 열린 파일에 배치하고 퀸으로 공격을 준비하세요.';
  return '💡 [엔드게임] 킹을 적극 활용하고 폰 프로모션을 목표로 하세요.';
}

// ─── Screens ──────────────────────────────────────────────────────────────────
function ModeSelect({ onSelect }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-10 p-6">
      <div className="text-center">
        <div className="text-7xl mb-4 select-none">♟</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-emerald-400 mb-2">체스 교실</h1>
        <p className="text-slate-400">모드를 선택하세요</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        <button onClick={() => onSelect('ai')}
          className="flex-1 bg-slate-800 hover:bg-slate-700 border-2 border-sky-500/40 hover:border-sky-400 rounded-2xl p-8 text-left transition-all shadow-xl">
          <div className="text-5xl mb-3">🤖</div>
          <h2 className="text-2xl font-bold text-sky-400 mb-2">1인용 (AI 연습)</h2>
          <p className="text-slate-400 text-sm leading-relaxed">AI와 대결하며 체스를 배웁니다.<br/>초급·중급·심화 · 힌트 · AI 해설 제공</p>
        </button>
        <button onClick={() => onSelect('human')}
          className="flex-1 bg-slate-800 hover:bg-slate-700 border-2 border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-8 text-left transition-all shadow-xl">
          <div className="text-5xl mb-3">👥</div>
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">2인용</h2>
          <p className="text-slate-400 text-sm leading-relaxed">두 명이 같은 화면에서 대결합니다.<br/>타이머 · 잡은 기물 · 점수판 제공</p>
        </button>
      </div>
    </div>
  );
}

function DifficultySelect({ onSelect, onBack }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 p-6">
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8 p-6">
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

// ─── Game Over Modal ──────────────────────────────────────────────────────────
function GameOverModal({ game, mode, timedOut, onReset, onMenu }) {
  let icon, title, sub;
  if (timedOut) {
    icon = '⏰'; title = '시간 초과!';
    sub = timedOut === 'w' ? '흑(Black) 승리 — 백의 시간이 다 됐습니다' : '백(White) 승리 — 흑의 시간이 다 됐습니다';
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
function PlayerCard({ color, time, timeControl, isActive, capturedTypes, advantage, isTimedOut }) {
  const isWhite = color === 'w';
  const isLow   = timeControl > 0 && time <= 30;
  const oppColor = isWhite ? 'b' : 'w';

  return (
    <div className={`rounded-2xl p-4 border-2 transition-all duration-300 ${
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
          <div className={`text-3xl font-mono font-bold tabular-nums ${
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
  const [difficulty, setDifficulty]       = useState('medium');
  const [moveSANs, setMoveSANs]           = useState([]);
  const [selectedSq, setSelectedSq]       = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [commentary, setCommentary]       = useState('');
  const [tip, setTip]                     = useState('');
  const [hint, setHint]                   = useState(null);
  const [timeControl, setTimeControl]     = useState(300);
  const [whiteTime, setWhiteTime]         = useState(300);
  const [blackTime, setBlackTime]         = useState(300);
  const [timedOut, setTimedOut]           = useState(null);
  const [boardView, setBoardView]         = useState('w');   // 2P: orientation currently shown
  const [boardFade, setBoardFade]         = useState(false); // 2P: true while mid-flip (faded out)

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

  // Chess clock — countdown and timeout detection run inside the interval
  // callback (not the effect body) so React's set-state-in-effect rule is satisfied.
  useEffect(() => {
    clearInterval(timerInterval.current);
    if (screen !== 'game' || gameMode !== 'human' || timeControl === 0) return;
    if (game.isGameOver() || timedOut) return;
    const activeColor = game.turn();
    timerInterval.current = setInterval(() => {
      const tick = setter => setter(p => {
        if (p <= 1) { clearInterval(timerInterval.current); setTimedOut(activeColor); return 0; }
        return p - 1;
      });
      tick(activeColor === 'w' ? setWhiteTime : setBlackTime);
    }, 1000);
    return () => clearInterval(timerInterval.current);
    // `game` derives from `moveSANs` (already a dep); omitting it is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSANs, screen, gameMode, timedOut, timeControl]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSquareClick(sq) {
    if (game.isGameOver() || aiThinking || timedOut) return;
    if (gameMode === 'ai' && game.turn() !== 'w') return;
    setHint(null);
    if (selectedSq && legalTargets.has(sq)) {
      const g = new Chess(game.fen());
      const result = g.move({ from: selectedSq, to: sq, promotion: 'q' });
      if (result) {
        setMoveSANs(prev => [...prev, result.san]);
        if (gameMode === 'ai' && !g.isGameOver()) { setTip('🤖 AI가 최선의 수를 고민하고 있습니다...'); setCommentary(''); }
        else if (gameMode === 'human' && !g.isGameOver()) {
          setTip(g.turn() === 'w' ? '⚪ 백(White) 차례입니다' : '⚫ 흑(Black) 차례입니다');
        }
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
    const best = getHintMove(game);
    if (best) setHint({ from: best.from, to: best.to });
  }

  function handleUndo() {
    clearTimeout(aiTimer.current); aiInProgress.current = false;
    clearInterval(timerInterval.current);
    setHint(null);
    setSelectedSq(null); setSelectedPiece(null); setCommentary('');
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
    clearTimeout(aiTimer.current); aiInProgress.current = false;
    clearInterval(timerInterval.current); clearTimeout(flipTimer.current);
    setMoveSANs([]); setSelectedSq(null);
    setSelectedPiece(null); setCommentary(''); setHint(null);
    setBoardView('w'); setBoardFade(false);
    setWhiteTime(timeControl); setBlackTime(timeControl); setTimedOut(null);
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
    setBoardView('w'); setBoardFade(false);
    setScreen('game');
    setMoveSANs([]); setSelectedSq(null); setSelectedPiece(null);
    setCommentary(''); setHint(null);
    setTip(mode === 'ai' ? '💡 중앙 폰(e4 또는 d4)을 먼저 전진시켜보세요!' : '⚪ 백(White) 차례입니다');
  }

  function handleModeSelect(mode) {
    if (mode === 'ai') { setGameMode('ai'); setScreen('difficulty'); }
    else               { setGameMode('human'); setScreen('timeSelect'); }
  }

  function goMenu() {
    clearTimeout(aiTimer.current);
    clearInterval(timerInterval.current); clearTimeout(flipTimer.current);
    setScreen('menu');
  }

  // ── Routing ────────────────────────────────────────────────────────────────
  if (screen === 'menu')       return <ModeSelect onSelect={handleModeSelect} />;
  if (screen === 'difficulty') return <DifficultySelect onSelect={d => startGame('ai', d)} onBack={() => setScreen('menu')} />;
  if (screen === 'timeSelect') return <TimeSelect onSelect={tc => startGame('human', undefined, tc)} onBack={() => setScreen('menu')} />;

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

              let ring = '';
              if (isCheck)         ring = 'ring-4 ring-inset ring-red-500 bg-red-400/30';
              else if (isSelected) ring = 'ring-4 ring-inset ring-sky-400 bg-sky-300/20';
              else if (isHint)     ring = 'ring-4 ring-inset ring-yellow-400 bg-yellow-200/20';

              return (
                <button key={sq} onClick={() => handleSquareClick(sq)}
                  className={`relative flex items-center justify-center h-full text-[clamp(1rem,5vw,3rem)] ${isLight ? 'bg-amber-100' : 'bg-amber-700'} ${ring} hover:brightness-110 transition-all`}>
                  {cIdx === 0 && <span className={`absolute top-0.5 left-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${lc}`}>{rank}</span>}
                  {rIdx === 7 && <span className={`absolute bottom-0.5 right-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${lc}`}>{file}</span>}
                  {glyph && (
                    <span style={piece?.color === rotateColor ? { transform: 'rotate(180deg)' } : undefined}
                      className={piece?.color === 'w'
                      ? 'text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000,0_0_6px_rgba(0,0,0,0.6)] select-none'
                      : 'text-gray-900 [text-shadow:0_0_4px_rgba(255,255,255,1),1px_1px_0_rgba(255,255,255,0.8),-1px_-1px_0_rgba(255,255,255,0.8)] select-none'}>
                      {glyph}
                    </span>
                  )}
                  {isTarget && <span className="absolute w-[28%] h-[28%] rounded-full bg-sky-500/70 shadow-[0_0_10px_rgba(14,165,233,0.8)] animate-pulse pointer-events-none" />}
                </button>
              );
            })
          )}
        </div>
        {isOver && <GameOverModal game={game} mode={gameMode} timedOut={timedOut} onReset={handleReset} onMenu={goMenu} />}
      </div>
    );
  }

  // ── AI mode ────────────────────────────────────────────────────────────────
  if (gameMode === 'ai') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 flex-shrink-0">
          <h1 className="text-lg font-bold text-emerald-400">♟ 체스 교실</h1>
          <div className="flex items-center gap-2">
            {aiThinking && <span className="text-xs text-sky-400 animate-pulse">AI 생각 중...</span>}
            {diffInfo && <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{diffInfo.icon} {diffInfo.label}</span>}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-900 text-sky-300">🤖 AI 연습</span>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-3 py-4 flex flex-col md:flex-row gap-4 items-start">
          <div className="w-full md:w-[52%] lg:max-w-[520px] flex-shrink-0 mx-auto md:mx-0">
            {renderBoard(false)}
          </div>
          <div className="w-full md:flex-1 flex flex-col gap-3">
            <div className={`rounded-xl px-4 py-3 border ${game.isCheck() ? 'bg-red-950/80 border-red-500/60' : 'bg-slate-800 border-slate-700'}`}>
              <p className="text-sm font-semibold leading-relaxed text-emerald-300">{tip}</p>
            </div>
            {commentary && (
              <div className="bg-slate-900 rounded-xl px-4 py-3 border border-sky-500/30">
                <p className="text-xs font-semibold text-sky-500 mb-1">🤖 AI 해설</p>
                <p className="text-sm text-sky-200 leading-relaxed">{commentary}</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <h1 className="text-lg font-bold text-emerald-400">♟ 체스 교실</h1>
        <div className="flex items-center gap-2">
          {timeControl > 0 && <span className="text-xs text-slate-400">{TIME_OPTIONS.find(t => t.seconds === timeControl)?.label}</span>}
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-900 text-emerald-300">👥 2인용</span>
          <button onClick={goMenu} className="text-xs text-slate-500 hover:text-slate-300 transition-all ml-2">← 메뉴</button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-3 lg:p-5 w-full max-w-7xl mx-auto">
        {/* Board column: far-side card → board → near-side card */}
        <div className="flex flex-col gap-2 w-full lg:flex-1 lg:max-w-2xl mx-auto">
          {/* Top card — far-side player; rotated 180° (like their pieces) so the
              across-the-table player reads their own info upright. */}
          <div style={{ transform: 'rotate(180deg)' }}>
            <PlayerCard {...cardFor(topColor)} />
          </div>

          {/* Fixed board; the top army's pieces are rotated 180° to face the
              far-side player. Opacity fades only on a manual flip. */}
          <div className="w-full transition-opacity duration-200 ease-in-out"
            style={{ opacity: boardFade ? 0 : 1 }}>
            {renderBoard(bottomColor === 'b', topColor)}
          </div>

          {/* Bottom card — near-side player */}
          <PlayerCard {...cardFor(bottomColor)} />

          <div className="flex gap-2">
            <button onClick={handleUndo} disabled={moveSANs.length === 0 || !!timedOut}
              className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all">
              ↩ 무르기
            </button>
            <button onClick={handleReset} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-sm transition-all">
              🔄 새 게임
            </button>
          </div>
          <button onClick={handleFlip} disabled={boardFade}
            className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 rounded-xl font-bold text-sm transition-all">
            ⟲ 보드 뒤집기
          </button>
        </div>

        {/* Side panel: move history visible on large screens */}
        <div className="hidden lg:flex flex-col gap-3 w-64 xl:w-80">
          <div className={`rounded-xl px-4 py-3 border ${game.isCheck() ? 'bg-red-950/80 border-red-500/60' : 'bg-slate-800 border-slate-700'}`}>
            <p className="text-sm font-semibold leading-relaxed text-emerald-300">{tip}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex-1">
            <p className="text-xs font-semibold text-slate-400 mb-2">📋 기보 ({moveSANs.length}수)</p>
            <div className="overflow-y-auto text-xs font-mono max-h-[60vh]">
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
        </div>
      </main>
    </div>
  );
}
