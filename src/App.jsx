import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const LIGHT_SQUARE = 'bg-stone-100';
const DARK_SQUARE = 'bg-emerald-700';
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

const PIECE_NAMES = { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸', k: '킹' };

const PIECE_UNICODE = {
 P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
 p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
};

const PIECE_GUIDES = {
 p: { name: '폰', oneLine: '기본 기물로 전진만 합니다.', movement: ['앞으로 한 칸', '처음엔 두 칸'], capture: ['대각선으로 잡음'], special: ['승격 가능'], beginnerTips: [], caution: [] },
 n: { name: '나이트', oneLine: 'L자로 뛰는 기물.', movement: ['L자 이동'], capture: ['L자로 잡음'], special: ['뛰어넘기 가능'], beginnerTips: [], caution: [] },
 b: { name: '비숍', oneLine: '대각선으로 움직임.', movement: ['대각선 이동'], capture: ['대각선 경로상 잡음'], special: [], beginnerTips: [], caution: [] },
 r: { name: '룩', oneLine: '직선으로 움직임.', movement: ['상하좌우 이동'], capture: ['직선 경로상 잡음'], special: ['캐슬링'], beginnerTips: [], caution: [] },
 q: { name: '퀸', oneLine: '가장 강력한 기물.', movement: ['모든 방향 이동'], capture: ['경로상 잡음'], special: [], beginnerTips: [], caution: [] },
 k: { name: '킹', oneLine: '핵심 기물.', movement: ['한 칸 이동'], capture: ['주변 한 칸'], special: ['캐슬링'], beginnerTips: [], caution: [] },
};

function squareColor(rowIndex, colIndex) {
 return (rowIndex + colIndex) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
}

function parseFenBoard(fen) {
 const [placement] = fen.split(' ');
 return placement.split('/').map((row) => {
 const squares = [];
 for (const char of row) {
 if (/\d/.test(char)) {
 const count = Number(char);
 for (let i = 0; i < count; i += 1) squares.push(null);
 } else {
 squares.push(char);
 }
 }
 return squares;
 });
}

function pieceColor(piece) {
 if (!piece) return null;
 return piece === piece.toUpperCase() ? 'w' : 'b';
}

function getSquareFromIndices(rowIndex, colIndex) {
 return `${FILES[colIndex]}${RANKS[rowIndex]}`;
}

export default function ChessLearningWebApp() {
 const [fen, setFen] = useState(() => new Chess().fen());
 const [selectedSquare, setSelectedSquare] = useState(null);
 const game = useMemo(() => new Chess(fen), [fen]);
 const board = useMemo(() => parseFenBoard(fen), [fen]);

 const legalMovesFromSelected = useMemo(() => {
 if (!selectedSquare) return [];
 try {
 return game.moves({ square: selectedSquare, verbose: true });
 } catch { return []; }
 }, [game, selectedSquare]);

 const legalTargets = useMemo(
 () => new Set(legalMovesFromSelected.map((m) => m.to)),
 [legalMovesFromSelected]
 );

 function handleSquareClick(square) {
 if (selectedSquare && legalTargets.has(square)) {
 const next = new Chess(fen);
 next.move({ from: selectedSquare, to: square, promotion: 'q' });
 setFen(next.fen());
 setSelectedSquare(null);
 } else {
 const clickedPiece = parseFenBoard(fen)[8 - Number(square[1])][FILES.indexOf(square[0])];
 if (pieceColor(clickedPiece) === 'w') {
 setSelectedSquare(square);
 } else {
 setSelectedSquare(null);
 }
 }
 }

 return (
 <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center">
 <h1 className="text-3xl font-bold mb-4">Chess Coach Duel</h1>
 <p className="mb-8 text-slate-400">본부장님을 위한 맞춤형 반응형 체스 앱입니다.</p>

 <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-[20px] border border-white/20 w-full max-w-md">
 {board.map((row, rowIndex) =>
 row.map((piece, colIndex) => {
 const square = getSquareFromIndices(rowIndex, colIndex);
 const isSelected = selectedSquare === square;
 const isLegalTarget = legalTargets.has(square);

 return (
 <button
 key={square}
 onClick={() => handleSquareClick(square)}
 className={[
 'relative flex items-center justify-center transition',
 'text-[clamp(1.5rem,4vw,3rem)] font-semibold select-none',
 squareColor(rowIndex, colIndex),
 isSelected ? 'ring-4 ring-sky-400 z-10' : ''
 ].join(' ')}
 >
 <span className={pieceColor(piece) === 'w' ? 'text-white' : 'text-slate-950 drop-shadow-md'}>
 {piece ? PIECE_UNICODE[piece] : ''}
 </span>

 {isLegalTarget && !piece && (
 <span className="absolute h-4 w-4 rounded-full bg-sky-500/85" />
 )}
 {isLegalTarget && piece && (
 <span className="absolute inset-1 rounded-full border-4 border-sky-400/85" />
 )}
 
 <span className="pointer-events-none absolute left-1 top-1 text-[10px] font-medium text-black/50">
 {rowIndex === 7 ? FILES[colIndex] : ''}
 </span>
 <span className="pointer-events-none absolute right-1 bottom-1 text-[10px] font-medium text-black/50">
 {colIndex === 0 ? RANKS[rowIndex] : ''}
 </span>
 </button>
 );
 })
 )}
 </div>
 </div>
 );
}
 <div className="mt-1 text-sm font-semibold text-emerald-300">
 막히면 체크 버튼으로 여러 후보 수를 비교해 보세요.
 </div>
 </div>
 </div>

 <div className="mt-4 md:hidden">
 <SelectedPiecePanel
 selectedPieceInfo={selectedPieceInfo}
 selectedPieceDemo={selectedPieceDemo}
 selectedSquare={selectedSquare}
 />
 </div>
 </div>
 </div>

 <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-5">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold">기보</h2>
 <p className="text-sm text-slate-400">내 수와 AI 수를 한 턴씩 모아 보여줍니다.</p>
 </div>
 <div className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
 총 {history.length} 반수
 </div>
 </div>

 <div className="max-h-64 overflow-auto rounded-2xl border border-white/10 bg-slate-900/70">
 <div className="grid grid-cols-[72px_1fr_1fr] gap-px bg-white/5 text-sm">
 <div className="bg-slate-950/80 px-3 py-2 font-semibold text-slate-400">턴</div>
 <div className="bg-slate-950/80 px-3 py-2 font-semibold text-slate-400">당신(백)</div>
 <div className="bg-slate-950/80 px-3 py-2 font-semibold text-slate-400">AI(흑)</div>

 {historyRows.length === 0 ? (
 <div className="col-span-3 bg-slate-900/70 px-3 py-4 text-center text-slate-400">
 아직 수가 없습니다.
 </div>
 ) : (
 historyRows.map((row) => (
 <React.Fragment key={row.moveNumber}>
 <div className="bg-slate-900/70 px-3 py-2 text-slate-400">{row.moveNumber}</div>
 <div className="bg-slate-900/70 px-3 py-2 font-medium">{row.white || '—'}</div>
 <div className="bg-slate-900/70 px-3 py-2 font-medium">{row.black || '—'}</div>
 </React.Fragment>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <SelectedPiecePanel
 selectedPieceInfo={selectedPieceInfo}
 selectedPieceDemo={selectedPieceDemo}
 selectedSquare={selectedSquare}
 className="hidden md:block"
 scrollable
 />

 <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-5">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold">학습 코치</h2>
 <p className="text-sm text-slate-400">체크 버튼을 누르면 현재 포지션의 후보 수를 정렬해서 보여줍니다.</p>
 </div>

 <button
 onClick={() => setCoachOpen((prev) => !prev)}
 className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm font-semibold"
 >
 {coachOpen ? '접기' : '열기'}
 </button>
 </div>

 {coachResults.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-4 text-sm leading-6 text-slate-300">
 지금 막히는 순간에 <span className="font-semibold text-emerald-300">체크 · 힌트 보기</span>를 눌러 보세요.
 추천 수, 대안 수, 왜 좋은지, 실제로 어떻게 두는지가 함께 나옵니다.
 </div>
 ) : coachOpen ? (
 <div className="max-h-[72vh] space-y-3 overflow-auto pr-1">
 {coachResults.map((move, index) => (
 <button
 key={`${move.from}-${move.to}-${move.san}-${index}`}
 onClick={() =>{
 setHighlightMove({ from: move.from, to: move.to });
 setSelectedSquare(move.from);
 }}
 className={`w-full rounded-2xl border p-4 text-left transition ${
 index === 0
 ? 'border-emerald-400/60 bg-emerald-400/10'
 : 'border-white/10 bg-slate-900/70 hover:bg-slate-900'
 }`}
 >
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div>
 <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
 {index === 0 ? 'Best Move' : `Candidate ${index + 1}`}
 </div>
 <div className="mt-1 text-lg font-bold">
 {move.san}{' '}
 <span className="text-sm font-medium text-slate-400">({move.from} → {move.to})</span>
 </div>
 </div>

 <div className="flex flex-wrap gap-2 text-xs">
 <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
 평가 {move.normalizedScore > 0 ? '+' : ''}{(move.normalizedScore / 100).toFixed(2)}
 </span>
 <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
 개선도 {move.improvement > 0 ? '+' : ''}{(move.improvement / 100).toFixed(2)}
 </span>
 </div>
 </div>

 <div className="mt-3 rounded-2xl bg-slate-950/60 p-3">
 <div className="mb-2 text-sm font-semibold text-emerald-300">왜 좋은 수인가?</div>
 <div className="space-y-2 text-sm leading-6 text-slate-200">
 {move.explanations.map((line, explanationIndex) => (
 <div key={`${move.san}-exp-${explanationIndex}`} className="flex gap-2">
 <span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-emerald-300" />
 <span>{line}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-sm leading-6 text-slate-300">
 <div className="font-semibold text-slate-100">직접 두는 방법</div>
 <div className="mt-1">
 1) <span className="font-semibold text-sky-300">{move.from}</span> 칸의 기물을 선택하고,
 2) <span className="font-semibold text-sky-300">{move.to}</span> 칸을 누르면 됩니다.
 {move.promotion ? `승격이 나오면 ${PIECE_NAMES[move.promotion]}을 선택하세요.` : ''}
 </div>
 </div>
 </button>
 ))}
 </div>
 ) : null}
 </div>
 
 <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur sm:p-5 md:hidden">
 <h2 className="text-xl font-bold">사용 흐름</h2>
 <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
 <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
 <span className="font-semibold text-slate-100">1.</span> 말이 궁금하면 먼저 기물을 눌러서 이동 가능 칸을 확인합니다.
 </div>
 <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
 <span className="font-semibold text-slate-100">2.</span> 어디로 둬야 할지 막히면 <span className="font-semibold text-emerald-300">체크 · 힌트 보기</span>를 눌러 여러 후보를 비교합니다.
 </div>
 <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
 <span className="font-semibold text-slate-100">3.</span> 추천 카드 하나를 누르면 보드에서 시작 칸과 도착 칸이 강조됩니다.
 </div>
 <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
 <span className="font-semibold text-slate-100">4.</span> 수를 둔 뒤 AI의 응수를 보고, 기보와 설명을 다시 비교하며 복습합니다.
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {promotionMove && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
 <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-5 shadow-2xl">
 <h3 className="text-xl font-bold">승격할 기물을 선택하세요</h3>
 <p className="mt-2 text-sm text-slate-400">
 {promotionMove.from} → {promotionMove.to} 로 이동한 폰을 어떤 기물로 바꿀지 선택합니다.
 </p>

 <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
 {[
 { key: 'q', label: '퀸', icon: '♕' },
 { key: 'r', label: '룩', icon: '♖' },
 { key: 'b', label: '비숍', icon: '♗' },
 { key: 'n', label: '나이트', icon: '♘' },
 ].map((piece) => (
 <button
 key={piece.key}
 onClick={() => confirmPromotion(piece.key)}
 className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-center transition hover:bg-slate-800"
 >
 <div className="text-3xl">{piece.icon}</div>
 <div className="mt-2 text-sm font-semibold">{piece.label}</div>
 </button>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
