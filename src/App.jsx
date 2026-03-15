import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const LIGHT_SQUARE = 'bg-slate-300'; 
const DARK_SQUARE = 'bg-emerald-700';

const PIECE_UNICODE = {
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
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
        for (let i = 0; i < Number(char); i++) squares.push(null);
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
  const [game] = useState(() => new Chess());
  const [renderTrigger, setRenderTrigger] = useState(0); 
  
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState("당신은 백(White)입니다. 첫 수를 두어보세요!");
  const aiTimerRef = useRef(null);

  const board = useMemo(() => parseFenBoard(game.fen()), [renderTrigger]);

  const legalMovesFromSelected = useMemo(() => {
    if (!selectedSquare) return [];
    try { return game.moves({ square: selectedSquare, verbose: true }); } 
    catch { return []; }
  }, [selectedSquare, renderTrigger]);

  const legalTargets = useMemo(() => new Set(legalMovesFromSelected.map((m) => m.to)), [legalMovesFromSelected]);

  function handleSquareClick(square) {
    if (game.isGameOver() || aiThinking || game.turn() !== 'w') return;

    if (selectedSquare && legalTargets.has(square)) {
      const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (move) {
        setSelectedSquare(null);
        setMessage("AI가 생각 중입니다...");
        setRenderTrigger(t => t + 1); 
      }
    } else {
      const rowIndex = 8 - Number(square[1]);
      const colIndex = FILES.indexOf(square[0]);
      const clickedPiece = board[rowIndex][colIndex];
      if (clickedPiece && pieceColor(clickedPiece) === 'w') {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    }
  }

  useEffect(() => {
    if (game.turn() === 'b' && !game.isGameOver() && !aiThinking) {
      setAiThinking(true);
      aiTimerRef.current = setTimeout(() => {
        const moves = game.moves();
        if (moves.length > 0) {
            game.move(moves[Math.floor(Math.random() * moves.length)]);
            setMessage("당신 차례입니다.");
        }
        setAiThinking(false);
        setRenderTrigger(t => t + 1); 
      }, 800); 
    }
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [renderTrigger]);

  function undoMove() {
      if (aiTimerRef.current) { 
          clearTimeout(aiTimerRef.current); 
      }
      setAiThinking(false);

      if (game.history().length === 0) return;

      if (game.turn() === 'b') {
          game.undo(); 
          setMessage("방금 둔 내 수를 물렀습니다.");
      } else {
          game.undo(); 
          game.undo(); 
          setMessage("한 턴을 물렀습니다. 다시 두세요.");
      }
      
      setSelectedSquare(null);
      setRenderTrigger(t => t + 1);
  }

  function resetGame() {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      setAiThinking(false);
      game.reset();
      setSelectedSquare(null);
      setMessage("새 게임을 시작합니다!");
      setRenderTrigger(t => t + 1);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2 text-emerald-400">Chess Coach Duel</h1>
      <p className="mb-6 text-emerald-300 font-semibold">{message}</p>
      
      <div className="flex gap-4 mb-8 w-full max-w-md">
        <button onClick={resetGame} className="flex-1 px-4 py-3 bg-slate-800 rounded-xl font-bold">새 게임</button>
        <button onClick={undoMove} className="flex-1 px-4 py-3 bg-emerald-600 rounded-xl font-bold border border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]">무르기 (Undo)</button>
      </div>

      {/* [버그 수정] grid-rows-8 추가 및 각 버튼에 w-full h-full 추가하여 빈 칸이 찌그러지지 않도록 강제 고정 */}
      <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-[12px] sm:rounded-[20px] border-4 border-slate-700 w-full max-w-md bg-slate-800 shadow-2xl">
        {board.map((row, rowIndex) => row.map((piece, colIndex) => {
          const square = getSquareFromIndices(rowIndex, colIndex);
          const isSelected = selectedSquare === square;
          const isTarget = legalTargets.has(square);
          
          return (
            <button key={square} onClick={() => handleSquareClick(square)} 
              className={`relative w-full h-full flex items-center justify-center text-[clamp(1.5rem,5vw,3rem)] transition-colors ${squareColor(rowIndex, colIndex)} ${isSelected ? 'ring-[4px] sm:ring-[6px] ring-inset ring-sky-400 z-10 bg-sky-200/50' : ''}`}>
              
              <span className={pieceColor(piece) === 'w' 
                  ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]' 
                  : 'text-slate-900 drop-shadow-sm'}>
                {piece ? PIECE_UNICODE[piece] : ''}
              </span>
              
              {isTarget && <span className="absolute h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-sky-500/80 shadow-lg" />}
            </button>
          );
        }))}
      </div>
    </div>
  );
}
