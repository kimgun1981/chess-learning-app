import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  DESCRIPTIONS, DIFFICULTIES, FILES, NAMES_KO, PIECE_VALUES, TIME_OPTIONS, pieceGlyph,
} from './chess/config.js';
import {
  getAIMove, getCommentary, getHintAnalysis, getTip, getUserMoveFeedback,
} from './chess/engine.js';
import { LESSONS } from './chess/lessons.js';
import { playGameSound, vibrate } from './chess/audio.js';
import { createPgn, downloadTextFile, formatLocalDate } from './chess/pgn.js';
import {
  STORAGE_KEYS, loadLessonProgress, loadPreferences, loadSavedGame, loadStats,
  recordResult, removeStoredGame, saveJSON,
} from './chess/storage.js';
import { getGameOutcome, outcomeToStat, remainingClockMilliseconds } from './chess/rules.js';
import { ChessBoard } from './components/ChessBoard.jsx';
import { PlayerCard } from './components/GameUi.jsx';
import {
  DifficultySelect, LessonPractice, LessonSelect, ModeSelect, TimeSelect,
} from './components/LearningScreens.jsx';
import { MoveHistory } from './components/MoveHistory.jsx';

function createGameId() {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

function pgnResult(outcome) {
  if (outcome.kind === 'draw') return '1/2-1/2';
  if (outcome.kind === 'win') return outcome.winner === 'w' ? '1-0' : '0-1';
  return '*';
}

function PgnActions({ onCopy, onDownload, status, disabled }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
      <p className="text-xs font-semibold text-slate-400 mb-2">기보 보관</p>
      <div className="flex gap-2">
        <button disabled={disabled} onClick={onCopy} className="flex-1 min-h-11 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-bold">기보 복사</button>
        <button disabled={disabled} onClick={onDownload} className="flex-1 min-h-11 rounded-lg bg-sky-800 hover:bg-sky-700 disabled:opacity-40 text-xs font-bold">PGN 저장</button>
      </div>
      {status && <p aria-live="polite" className="mt-2 text-xs text-sky-300">{status}</p>}
    </div>
  );
}

export default function ChessApp() {
  const [initialPreferences] = useState(loadPreferences);
  const [screen, setScreen] = useState('menu');
  const [gameMode, setGameMode] = useState('ai');
  const [difficulty, setDifficulty] = useState(initialPreferences.difficulty);
  const [moveSANs, setMoveSANs] = useState([]);
  const [selectedSq, setSelectedSq] = useState(null);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [commentary, setCommentary] = useState('');
  const [userFeedback, setUserFeedback] = useState('');
  const [tip, setTip] = useState('');
  const [hint, setHint] = useState(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [timeControl, setTimeControl] = useState(initialPreferences.timeControl);
  const [whiteTime, setWhiteTime] = useState(initialPreferences.timeControl);
  const [blackTime, setBlackTime] = useState(initialPreferences.timeControl);
  const [timedOut, setTimedOut] = useState(null);
  const [boardView, setBoardView] = useState('w');
  const [boardFade, setBoardFade] = useState(false);
  const [promotion, setPromotion] = useState(null);
  const [savedGame, setSavedGame] = useState(loadSavedGame);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(initialPreferences.soundEnabled);
  const [pgnStatus, setPgnStatus] = useState('');

  const aiInProgress = useRef(false);
  const aiTimer = useRef(null);
  const hintTimer = useRef(null);
  const timerInterval = useRef(null);
  const flipTimer = useRef(null);
  const wakeLock = useRef(null);
  const lastLowTimeAlert = useRef('');
  const announcedResult = useRef(null);
  const gameId = useRef(createGameId());
  const initialClockMilliseconds = initialPreferences.timeControl * 1000;
  const clock = useRef({ w:initialClockMilliseconds, b:initialClockMilliseconds, active:null, startedAt:null });

  const game = useMemo(() => {
    const replay = new Chess();
    for (const san of moveSANs) replay.move(san);
    return replay;
  }, [moveSANs]);
  const board = useMemo(() => game.board(), [game]);
  const aiThinking = gameMode === 'ai' && screen === 'game' && game.turn() === 'b' && !game.isGameOver() && !timedOut;
  const legalMoves = useMemo(() => {
    if (!selectedSq) return [];
    try { return game.moves({ square:selectedSq, verbose:true }); } catch { return []; }
  }, [game, selectedSq]);
  const legalTargets = useMemo(() => new Set(legalMoves.map(move => move.to)), [legalMoves]);
  const kingCheckSq = useMemo(() => {
    if (!game.isCheck()) return null;
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        const piece = board[row][column];
        if (piece?.type === 'k' && piece.color === game.turn()) return `${FILES[column]}${8 - row}`;
      }
    }
    return null;
  }, [game, board]);
  const capturedByColor = useMemo(() => {
    const byWhite = [];
    const byBlack = [];
    for (const move of game.history({ verbose:true })) {
      if (!move.captured) continue;
      (move.color === 'w' ? byWhite : byBlack).push(move.captured);
    }
    return { byWhite, byBlack };
  }, [game]);
  const materialAdvantage = useMemo(() => {
    const white = capturedByColor.byWhite.reduce((total, piece) => total + PIECE_VALUES[piece], 0);
    const black = capturedByColor.byBlack.reduce((total, piece) => total + PIECE_VALUES[piece], 0);
    return white - black;
  }, [capturedByColor]);
  const outcome = useMemo(() => getGameOutcome(game, gameMode, timedOut), [game, gameMode, timedOut]);
  const isOver = outcome.kind !== 'playing';

  useEffect(() => {
    saveJSON(STORAGE_KEYS.preferences, { difficulty, timeControl, soundEnabled });
  }, [difficulty, timeControl, soundEnabled]);

  useEffect(() => {
    if (screen !== 'game' || moveSANs.length === 0 || isOver) {
      if (screen === 'game' && isOver) removeStoredGame();
      return;
    }
    const now = Date.now();
    const whiteTimeMs = clock.current.active === 'w' && clock.current.startedAt !== null
      ? remainingClockMilliseconds(clock.current.w, clock.current.startedAt, now)
      : clock.current.w;
    const blackTimeMs = clock.current.active === 'b' && clock.current.startedAt !== null
      ? remainingClockMilliseconds(clock.current.b, clock.current.startedAt, now)
      : clock.current.b;
    saveJSON(STORAGE_KEYS.game, {
      gameMode, difficulty, moveSANs, timeControl, whiteTime, blackTime,
      whiteTimeMs, blackTimeMs,
      boardView, gameId:gameId.current, savedAt:Date.now(),
    });
  }, [screen, gameMode, difficulty, moveSANs, timeControl, whiteTime, blackTime, boardView, isOver]);

  useEffect(() => {
    if (screen !== 'game' || gameMode !== 'ai' || game.turn() !== 'b' || game.isGameOver() || timedOut) return;
    if (aiInProgress.current) return;
    aiInProgress.current = true;
    const currentGame = game;
    const currentMoveCount = moveSANs.length;
    aiTimer.current = window.setTimeout(() => {
      const aiMove = getAIMove(currentGame, difficulty);
      if (aiMove) {
        const next = new Chess();
        for (const san of currentGame.history()) next.move(san);
        const result = next.move(aiMove);
        setMoveSANs(previous => [...previous, result.san]);
        setCommentary(getCommentary(result, next));
        playGameSound(soundEnabled, next.isCheck() ? 'check' : result.captured ? 'capture' : 'move');
        if (!next.isGameOver()) setTip(getTip(next, currentMoveCount + 1));
      }
      aiInProgress.current = false;
    }, difficulty === 'hard' ? 800 : 650);
    return () => {
      window.clearTimeout(aiTimer.current);
      aiInProgress.current = false;
    };
    // game is reconstructed from moveSANs, which is already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSANs, gameMode, screen, difficulty, soundEnabled, timedOut]);

  useEffect(() => {
    window.clearInterval(timerInterval.current);
    clock.current.active = null;
    clock.current.startedAt = null;
    if (screen !== 'game' || gameMode !== 'human' || timeControl === 0 || isOver) return;

    const activeColor = game.turn();
    const startedAt = Date.now();
    const startingMilliseconds = clock.current[activeColor];
    clock.current.active = activeColor;
    clock.current.startedAt = startedAt;
    const updateClock = () => {
      const remaining = remainingClockMilliseconds(startingMilliseconds, startedAt);
      (activeColor === 'w' ? setWhiteTime : setBlackTime)(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        clock.current[activeColor] = 0;
        clock.current.active = null;
        clock.current.startedAt = null;
        window.clearInterval(timerInterval.current);
        setTimedOut(activeColor);
      }
    };
    updateClock();
    timerInterval.current = window.setInterval(updateClock, 100);
    return () => {
      window.clearInterval(timerInterval.current);
      if (clock.current.active === activeColor && clock.current.startedAt === startedAt) {
        clock.current[activeColor] = remainingClockMilliseconds(startingMilliseconds, startedAt);
        clock.current.active = null;
        clock.current.startedAt = null;
      }
    };
  }, [moveSANs, screen, gameMode, timeControl, isOver, game]);

  useEffect(() => {
    if (screen !== 'game' || outcome.kind === 'playing') return;
    const stat = outcomeToStat(outcome, gameMode);
    if (stat) recordResult(stat, gameId.current, gameMode);
    if (announcedResult.current !== gameId.current) {
      announcedResult.current = gameId.current;
      playGameSound(soundEnabled, 'end');
      if (gameMode === 'human') vibrate([70, 50, 100]);
    }
  }, [screen, outcome, gameMode, soundEnabled]);

  useEffect(() => {
    if (screen !== 'game' || gameMode !== 'human' || timeControl === 0 || isOver) return;
    const activeColor = game.turn();
    const remaining = activeColor === 'w' ? whiteTime : blackTime;
    if (remaining > 10 || remaining <= 0) return;
    const alertKey = `${activeColor}-${remaining}`;
    if (lastLowTimeAlert.current === alertKey) return;
    lastLowTimeAlert.current = alertKey;
    playGameSound(soundEnabled, 'warning');
    if (remaining <= 5) vibrate(35);
  }, [screen, gameMode, timeControl, isOver, game, whiteTime, blackTime, soundEnabled]);

  useEffect(() => {
    if (screen !== 'game' || gameMode !== 'human' || !navigator.wakeLock?.request) return;
    let cancelled = false;
    const requestWakeLock = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) await lock.release();
        else {
          wakeLock.current = lock;
          lock.addEventListener('release', () => {
            if (wakeLock.current === lock) wakeLock.current = null;
          });
        }
      } catch { /* Some phones and battery modes do not provide Wake Lock. */ }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (!wakeLock.current || wakeLock.current.released)) requestWakeLock();
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLock.current?.release().catch(() => {});
      wakeLock.current = null;
    };
  }, [screen, gameMode]);

  useEffect(() => () => {
    window.clearTimeout(aiTimer.current);
    window.clearTimeout(hintTimer.current);
    window.clearTimeout(flipTimer.current);
    window.clearInterval(timerInterval.current);
  }, []);

  function settleClockBeforeMove() {
    if (gameMode !== 'human' || timeControl === 0) return true;
    const activeColor = game.turn();
    if (clock.current.active !== activeColor || clock.current.startedAt === null) return clock.current[activeColor] > 0;
    const now = Date.now();
    const remaining = remainingClockMilliseconds(clock.current[activeColor], clock.current.startedAt, now);
    clock.current[activeColor] = remaining;
    clock.current.startedAt = now;
    (activeColor === 'w' ? setWhiteTime : setBlackTime)(Math.ceil(remaining / 1000));
    if (remaining <= 0) {
      setTimedOut(activeColor);
      return false;
    }
    return true;
  }

  function applyMove(from, to, promotedTo) {
    if (!settleClockBeforeMove()) return;
    const next = new Chess();
    for (const san of moveSANs) next.move(san);
    const result = next.move({ from, to, promotion:promotedTo });
    if (!result) return;
    setMoveSANs(previous => [...previous, result.san]);
    setPgnStatus('');
    playGameSound(soundEnabled, next.isCheck() ? 'check' : result.captured ? 'capture' : 'move');
    if (gameMode === 'human') vibrate(result.captured || next.isCheck() ? 35 : 18);
    if (gameMode === 'ai' && result.color === 'w') setUserFeedback(getUserMoveFeedback(result, next));
    if (gameMode === 'ai' && !next.isGameOver()) {
      setTip('AI가 다음 수를 계산하고 있습니다...');
      setCommentary('');
    } else if (gameMode === 'human' && !next.isGameOver()) {
      setTip(next.turn() === 'w' ? '백(White) 차례입니다' : '흑(Black) 차례입니다');
    }
  }

  function handlePromote(type) {
    if (!promotion) return;
    applyMove(promotion.from, promotion.to, type);
    setPromotion(null);
  }

  function handleSquareClick(square) {
    if (isOver || aiThinking || timedOut || promotion || hintBusy) return;
    if (gameMode === 'ai' && game.turn() !== 'w') return;
    setHint(null);
    if (selectedSq && legalTargets.has(square)) {
      const requiresPromotion = legalMoves.some(move => move.to === square && move.promotion);
      if (requiresPromotion) setPromotion({ from:selectedSq, to:square, color:game.turn() });
      else applyMove(selectedSq, square);
      setSelectedSq(null);
      setSelectedPiece(null);
      return;
    }
    const piece = game.get(square);
    if (!piece) {
      setSelectedSq(null);
      setSelectedPiece(null);
      return;
    }
    const isMovable = gameMode === 'human' ? piece.color === game.turn() : piece.color === 'w';
    if (isMovable) {
      setSelectedSq(square);
      setSelectedPiece(piece);
    } else {
      setSelectedSq(null);
      setSelectedPiece(null);
    }
  }

  function handleHint() {
    if (hintBusy) return;
    setHintBusy(true);
    setTip('추천 후보수를 계산하고 있습니다...');
    hintTimer.current = window.setTimeout(() => {
      const best = getHintAnalysis(game);
      if (best) {
        setHint(best);
        setTip(`${best.label} ${best.san}: ${best.reason}`);
      }
      setHintBusy(false);
    }, 30);
  }

  function handleUndo() {
    window.clearTimeout(aiTimer.current);
    window.clearTimeout(hintTimer.current);
    aiInProgress.current = false;
    settleClockBeforeMove();
    setBoardFade(false);
    setPromotion(null);
    setHint(null);
    setHintBusy(false);
    setSelectedSq(null);
    setSelectedPiece(null);
    setCommentary('');
    setUserFeedback('');
    setTip('한 수 물렀습니다. 이미 사용한 시간은 돌아오지 않습니다.');
    setMoveSANs(previous => {
      const removeCount = gameMode === 'ai' ? 2 : 1;
      return previous.slice(0, Math.max(0, previous.length - removeCount));
    });
  }

  function handleFlip() {
    if (boardFade) return;
    window.clearTimeout(flipTimer.current);
    setBoardFade(true);
    flipTimer.current = window.setTimeout(() => {
      setBoardView(value => value === 'w' ? 'b' : 'w');
      setBoardFade(false);
    }, 220);
  }

  function prepareFreshGame(mode, selectedDifficulty, selectedTimeControl) {
    const previousGame = loadSavedGame();
    if (previousGame && !window.confirm('저장된 지난 게임을 지우고 새 게임을 시작할까요?')) return false;
    const nextTimeControl = selectedTimeControl ?? timeControl;
    const milliseconds = nextTimeControl * 1000;
    window.clearTimeout(aiTimer.current);
    window.clearTimeout(hintTimer.current);
    window.clearInterval(timerInterval.current);
    window.clearTimeout(flipTimer.current);
    aiInProgress.current = false;
    gameId.current = createGameId();
    announcedResult.current = null;
    lastLowTimeAlert.current = '';
    clock.current = { w:milliseconds, b:milliseconds, active:null, startedAt:null };
    setGameMode(mode);
    if (selectedDifficulty !== undefined) setDifficulty(selectedDifficulty);
    setTimeControl(nextTimeControl);
    setWhiteTime(nextTimeControl);
    setBlackTime(nextTimeControl);
    setTimedOut(null);
    setBoardView('w');
    setBoardFade(false);
    setPromotion(null);
    setMoveSANs([]);
    setSelectedSq(null);
    setSelectedPiece(null);
    setCommentary('');
    setUserFeedback('');
    setHint(null);
    setHintBusy(false);
    setShowHistory(false);
    setPgnStatus('');
    removeStoredGame();
    setSavedGame(null);
    setTip(mode === 'ai' ? '중앙 폰(e4 또는 d4)을 먼저 전진시켜보세요!' : '백(White) 차례입니다');
    setScreen('game');
    return true;
  }

  function recordCurrentResult() {
    const stat = outcomeToStat(outcome, gameMode);
    if (stat) recordResult(stat, gameId.current, gameMode);
  }

  function handleReset() {
    if (moveSANs.length > 0 && !isOver && !window.confirm('현재 게임을 지우고 새로 시작할까요?')) return;
    if (isOver) recordCurrentResult();
    removeStoredGame();
    setSavedGame(null);
    prepareFreshGame(gameMode, difficulty, timeControl);
  }

  function handleModeSelect(mode) {
    if (mode === 'learn') setScreen('lessons');
    else if (mode === 'ai') {
      setGameMode('ai');
      setScreen('difficulty');
    } else {
      setGameMode('human');
      setScreen('timeSelect');
    }
  }

  function resumeGame() {
    const saved = loadSavedGame();
    if (!saved) {
      setSavedGame(null);
      return;
    }
    window.clearTimeout(aiTimer.current);
    window.clearInterval(timerInterval.current);
    gameId.current = saved.gameId || createGameId();
    announcedResult.current = null;
    clock.current = { w:saved.whiteTimeMs, b:saved.blackTimeMs, active:null, startedAt:null };
    setGameMode(saved.gameMode);
    setDifficulty(saved.difficulty);
    setTimeControl(saved.timeControl);
    setWhiteTime(Math.ceil(saved.whiteTimeMs / 1000));
    setBlackTime(Math.ceil(saved.blackTimeMs / 1000));
    setBoardView(saved.boardView);
    setMoveSANs(saved.moveSANs);
    setTimedOut(null);
    setPromotion(null);
    setSelectedSq(null);
    setSelectedPiece(null);
    setCommentary('');
    setUserFeedback('저장한 지점에서 게임을 이어갑니다.');
    setHint(null);
    setHintBusy(false);
    setPgnStatus('');
    setTip(saved.gameMode === 'human' ? '저장한 2인용 게임을 재개했습니다.' : '상대의 다음 체크·잡기 수를 확인하세요.');
    setScreen('game');
  }

  function goMenu() {
    window.clearTimeout(hintTimer.current);
    setHintBusy(false);
    if (moveSANs.length > 0 && !isOver) {
      settleClockBeforeMove();
      saveJSON(STORAGE_KEYS.game, {
        gameMode, difficulty, moveSANs, timeControl, whiteTime, blackTime,
        whiteTimeMs:clock.current.w, blackTimeMs:clock.current.b,
        boardView, gameId:gameId.current, savedAt:Date.now(),
      });
      if (!window.confirm('현재 게임은 자동 저장됩니다. 메뉴로 이동할까요?')) return;
    }
    if (isOver) {
      recordCurrentResult();
      removeStoredGame();
    }
    window.clearTimeout(aiTimer.current);
    window.clearInterval(timerInterval.current);
    window.clearTimeout(flipTimer.current);
    setPromotion(null);
    setSavedGame(loadSavedGame());
    setScreen('menu');
  }

  async function copyPgn() {
    try {
      await navigator.clipboard.writeText(createPgn(moveSANs, { mode:gameMode, result:pgnResult(outcome) }));
      setPgnStatus('기보를 클립보드에 복사했습니다.');
    } catch {
      setPgnStatus('복사할 수 없습니다. PGN 저장을 이용하세요.');
    }
  }

  function downloadPgn() {
    const date = formatLocalDate();
    downloadTextFile(`chess-classroom-${date}.pgn`, createPgn(moveSANs, { mode:gameMode, result:pgnResult(outcome) }));
    setPgnStatus('PGN 파일을 저장했습니다.');
  }

  if (screen === 'menu') {
    const completedLessons = loadLessonProgress().filter(id => id <= LESSONS.length).length;
    return (
      <ModeSelect
        onSelect={handleModeSelect}
        onResume={resumeGame}
        hasSavedGame={Boolean(savedGame)}
        completedLessons={completedLessons}
        stats={loadStats()}
      />
    );
  }
  if (screen === 'difficulty') return <DifficultySelect onSelect={selected => prepareFreshGame('ai', selected)} onBack={() => setScreen('menu')} />;
  if (screen === 'timeSelect') return <TimeSelect onSelect={selected => prepareFreshGame('human', undefined, selected)} onBack={() => setScreen('menu')} />;
  if (screen === 'lessons') return <LessonSelect onSelect={index => { setLessonIndex(index); setScreen('lesson'); }} onBack={() => setScreen('menu')} />;
  if (screen === 'lesson') {
    return (
      <LessonPractice
        key={LESSONS[lessonIndex].id}
        lesson={LESSONS[lessonIndex]}
        onBack={() => setScreen('lessons')}
        onNext={() => {
          if (lessonIndex < LESSONS.length - 1) setLessonIndex(index => index + 1);
          else setScreen('lessons');
        }}
      />
    );
  }

  const difficultyInfo = DIFFICULTIES.find(item => item.id === difficulty);
  const whiteMaterial = materialAdvantage > 0 ? Math.round(materialAdvantage) : 0;
  const blackMaterial = materialAdvantage < 0 ? Math.round(-materialAdvantage) : 0;
  const boardProps = {
    board, selectedSq, legalTargets, hint, kingCheckSq, onSquareClick:handleSquareClick,
    promotion, onPromote:handlePromote, game, gameMode, timedOut, isOver,
    onReset:handleReset, onMenu:goMenu,
  };

  if (gameMode === 'ai') {
    return (
      <div className="app-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="safe-header flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-800 flex-shrink-0">
          <h1 className="text-lg font-bold text-emerald-400">♟ 체스 교실</h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {aiThinking && <span className="text-xs text-sky-400 animate-pulse">AI 생각 중...</span>}
            {difficultyInfo && <span className="px-2 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{difficultyInfo.icon} {difficultyInfo.label}</span>}
            <button onClick={() => setSoundEnabled(value => !value)} className="min-h-9 px-2 rounded-lg bg-slate-800 text-xs text-slate-300" aria-pressed={soundEnabled}>소리 {soundEnabled ? '켬' : '끔'}</button>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-900 text-sky-300">AI 연습</span>
          </div>
        </header>
        <main className="safe-main flex-1 w-full max-w-5xl mx-auto px-3 py-4 flex flex-col md:flex-row gap-4 items-start">
          <div className="ai-board w-full md:w-[52%] lg:max-w-[520px] flex-shrink-0 mx-auto md:mx-0">
            <ChessBoard {...boardProps} />
          </div>
          <div className="w-full md:flex-1 flex flex-col gap-3">
            <div className={`rounded-xl px-4 py-3 border ${game.isCheck() ? 'bg-red-950/80 border-red-500/60' : 'bg-slate-800 border-slate-700'}`}>
              <p className="text-sm font-semibold leading-relaxed text-emerald-300">{tip}</p>
            </div>
            {commentary && (
              <div className="bg-slate-900 rounded-xl px-4 py-3 border border-sky-500/30">
                <p className="text-xs font-semibold text-sky-500 mb-1">AI 수 설명</p>
                <p className="text-sm text-sky-200 leading-relaxed">{commentary}</p>
              </div>
            )}
            {userFeedback && (
              <div aria-live="polite" className="bg-emerald-950/50 rounded-xl px-4 py-3 border border-emerald-500/30">
                <p className="text-xs font-semibold text-emerald-500 mb-1">내 수 피드백</p>
                <p className="text-sm text-emerald-200 leading-relaxed">{userFeedback}</p>
              </div>
            )}
            <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700 min-h-[80px] flex flex-col justify-center">
              {selectedPiece ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl select-none">{pieceGlyph(selectedPiece)}</span>
                    <span className="font-bold text-sky-400">{NAMES_KO[selectedPiece.type]}</span>
                    <span className="text-xs text-slate-500">({selectedPiece.color === 'w' ? '백' : '흑'})</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{DESCRIPTIONS[selectedPiece.type]}</p>
                </>
              ) : <p className="text-xs text-slate-500 text-center">기물을 누르면 이동 규칙이 표시됩니다</p>}
            </div>
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <p className="text-xs font-semibold text-slate-400 mb-2">기보 ({moveSANs.length}수)</p>
              <div className="max-h-36 md:max-h-52 overflow-y-auto text-xs font-mono"><MoveHistory moves={moveSANs} /></div>
            </div>
            <PgnActions onCopy={copyPgn} onDownload={downloadPgn} status={pgnStatus} disabled={moveSANs.length === 0} />
            <div className="flex gap-2">
              <button onClick={handleHint} disabled={game.turn() !== 'w' || aiThinking || isOver || hintBusy} className="flex-1 min-h-12 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all">{hintBusy ? '계산 중...' : '힌트'}</button>
              <button onClick={handleUndo} disabled={moveSANs.length === 0 || aiThinking || game.turn() === 'b' || isOver} className="flex-1 min-h-12 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all">무르기</button>
              <button onClick={handleReset} className="flex-1 min-h-12 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-sm transition-all">초기화</button>
            </div>
            <button onClick={goMenu} className="min-h-11 text-slate-500 hover:text-slate-300 text-sm text-center transition-all">← 메뉴로 돌아가기</button>
          </div>
        </main>
      </div>
    );
  }

  const isBlackTurn = game.turn() === 'b' && !isOver;
  const isWhiteTurn = game.turn() === 'w' && !isOver;
  const bottomColor = boardView;
  const topColor = bottomColor === 'w' ? 'b' : 'w';
  const cardFor = color => color === 'w'
    ? { color:'w', time:whiteTime, timeControl, isActive:isWhiteTurn, capturedTypes:capturedByColor.byWhite, advantage:whiteMaterial, isTimedOut:timedOut === 'w' }
    : { color:'b', time:blackTime, timeControl, isActive:isBlackTurn, capturedTypes:capturedByColor.byBlack, advantage:blackMaterial, isTimedOut:timedOut === 'b' };

  return (
    <div className="app-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="safe-header flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-slate-800 flex-shrink-0">
        <h1 className="text-lg font-bold text-emerald-400">♟ 체스 교실</h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {timeControl > 0 && <span className="text-xs text-slate-400">{TIME_OPTIONS.find(item => item.seconds === timeControl)?.label}</span>}
          <button onClick={() => setSoundEnabled(value => !value)} className="min-h-9 px-2 rounded-lg bg-slate-800 text-xs text-slate-300" aria-pressed={soundEnabled}>소리 {soundEnabled ? '켬' : '끔'}</button>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-900 text-emerald-300">2인용</span>
          <button onClick={goMenu} className="min-h-9 text-xs text-slate-500 hover:text-slate-300 transition-all ml-1">← 메뉴</button>
        </div>
      </header>
      <main className="safe-main flex-1 flex flex-col lg:flex-row gap-3 p-2 sm:p-3 lg:p-4 w-full max-w-7xl mx-auto items-start">
        <div className="two-player-column flex flex-col gap-1.5 w-full mx-auto lg:mx-0 flex-none">
          <div style={{ transform:'rotate(180deg)' }}><PlayerCard {...cardFor(topColor)} compact /></div>
          <div className="w-full transition-opacity duration-200 ease-in-out" style={{ opacity:boardFade ? 0 : 1 }}>
            <ChessBoard {...boardProps} flipped={bottomColor === 'b'} rotateColor={topColor} />
          </div>
          <PlayerCard {...cardFor(bottomColor)} compact />
          <div className="flex gap-2">
            <button onClick={handleUndo} disabled={moveSANs.length === 0 || isOver} className="flex-1 min-h-11 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all">무르기</button>
            <button onClick={handleReset} className="flex-1 min-h-11 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-sm transition-all">새 게임</button>
          </div>
          <button onClick={handleFlip} disabled={boardFade} className="min-h-11 bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 rounded-xl font-bold text-sm transition-all">보드 뒤집기</button>
        </div>
        <div className="flex flex-col gap-3 w-full lg:w-64 xl:w-80 lg:flex-1">
          <div className={`rounded-xl px-4 py-3 border ${game.isCheck() ? 'bg-red-950/80 border-red-500/60' : 'bg-slate-800 border-slate-700'}`}>
            <p className="text-sm font-semibold leading-relaxed text-emerald-300">{tip}</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex-1">
            <button onClick={() => setShowHistory(value => !value)} className="w-full min-h-10 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>기보 ({moveSANs.length}수)</span><span>{showHistory ? '숨기기 ▲' : '보기 ▼'}</span>
            </button>
            {showHistory && <div className="overflow-y-auto text-xs font-mono max-h-40 lg:max-h-[60vh]"><MoveHistory moves={moveSANs} compact /></div>}
          </div>
          <PgnActions onCopy={copyPgn} onDownload={downloadPgn} status={pgnStatus} disabled={moveSANs.length === 0} />
          <p className="text-[0.7rem] leading-relaxed text-slate-500 px-1">앱에서는 3회 반복과 50수 규칙을 즉시 무승부로 처리합니다.</p>
        </div>
      </main>
    </div>
  );
}
