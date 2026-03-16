import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Chess } from 'chess.js';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const LIGHT_SQUARE = 'bg-slate-300'; 
const DARK_SQUARE = 'bg-emerald-700';

const PIECE_UNICODE = {
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
};

const PIECE_NAMES = {
  p: '폰 (Pawn)', n: '나이트 (Knight)', b: '비숍 (Bishop)', r: '룩 (Rook)', q: '퀸 (Queen)', k: '킹 (King)',
  P: '폰 (Pawn)', N: '나이트 (Knight)', B: '비숍 (Bishop)', R: '룩 (Rook)', Q: '퀸 (Queen)', K: '킹 (King)'
};

const PIECE_DESCRIPTIONS = {
  p: '앞으로 1칸 전진합니다. (처음엔 2칸 가능) 공격할 때는 대각선 앞쪽으로만 잡을 수 있습니다.',
  n: '알파벳 "L" 자 모양으로 이동합니다. 체스에서 유일하게 다른 기물을 뛰어넘을 수 있습니다!',
  b: '대각선 방향으로 칸 수 제한 없이 이동합니다. 처음 위치한 색상의 칸에서만 평생 움직입니다.',
  r: '상하좌우 직선 방향으로 칸 수 제한 없이 직진합니다. 구석을 지키는 든든한 전차입니다.',
  q: '직선과 대각선 모든 방향으로 끝까지 갈 수 있는 체스 최강의 기물입니다. 여왕을 잘 활용하세요!',
  k: '모든 방향으로 딱 1칸씩만 움직일 수 있습니다. 킹이 잡히면 게임이 끝납니다. (체크메이트) 무조건 지켜야 합니다!'
};

function squareColor(rowIndex, colIndex) {
  return (rowIndex + colIndex) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
}

function getSquareFromIndices(rowIndex, colIndex) {
  return `${FILES[colIndex]}${RANKS[rowIndex]}`;
}

export default function ChessLearningWebApp() {
  // [V2.0 개선] FEN 문자열을 상태로 관리하여 리액트의 불변성(Immutability) 원칙을 완벽하게 준수합니다.
  const [fen, setFen] = useState(new Chess().fen());
  const [gameMode, setGameMode] = useState('ai'); 
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [selectedPieceData, setSelectedPieceData] = useState(null); 
  const [aiThinking, setAiThinking] = useState(false);
  const [message, setMessage] = useState("기물을 선택하여 움직이는 법을 배워보세요!");
  
  const aiTimerRef = useRef(null);

  // 현재 FEN을 기반으로 매번 새로운 게임 인스턴스 생성 (히스토리 유지 가능)
  const game = useMemo(() => new Chess(fen), [fen]);
  
  // 보드 데이터 파싱
  const board = useMemo(() => {
    const tempBoard = [];
    const rows = fen.split(' ')[0].split('/');
    rows.forEach(row => {
      const squares = [];
      for (let char of row) {
        if (/\d/.test(char)) {
          for (let i = 0; i < Number(char); i++) squares.push(null);
        } else {
          squares.push(char);
        }
      }
      tempBoard.push(squares);
    });
    return tempBoard;
  }, [fen]);

  const legalMovesFromSelected = useMemo(() => {
    if (!selectedSquare) return [];
    try { return game.moves({ square: selectedSquare, verbose: true }); } 
    catch { return []; }
  }, [game, selectedSquare]);

  const legalTargets = useMemo(() => new Set(legalMovesFromSelected.map((m) => m.to)), [legalMovesFromSelected]);

  const onMove = useCallback((move) => {
    const nextGame = new Chess(game.fen());
    const result = nextGame.move(move);
    if (result) {
      setFen(nextGame.fen());
      return true;
    }
    return false;
  }, [game]);

  function handleSquareClick(square) {
    if (game.isGameOver() || aiThinking) return;
    if (gameMode === 'ai' && game.turn() !== 'w') return;

    if (selectedSquare && legalTargets.has(square)) {
      if (onMove({ from: selectedSquare, to: square, promotion: 'q' })) {
        setSelectedSquare(null);
        setSelectedPieceData(null);
        if (gameMode === 'ai') setMessage("AI가 최선의 수를 고민하고 있습니다...");
        else setMessage(game.turn() === 'b' ? "흑(Black) 차례입니다." : "백(White) 차례입니다.");
      }
    } else {
      const rowIndex = 8 - Number(square[1]);
      const colIndex = FILES.indexOf(square[0]);
      const clickedPiece = board[rowIndex][colIndex];
      
      const isOwnPiece = clickedPiece && (clickedPiece === clickedPiece.toUpperCase() ? 'w' : 'b') === game.turn();
      const canSelect = gameMode === 'human' ? isOwnPiece : (clickedPiece && clickedPiece === clickedPiece.toUpperCase());

      if (canSelect) {
        setSelectedSquare(square);
        const p = clickedPiece;
        setSelectedPieceData({
          piece: p,
          name: PIECE_NAMES[p],
          desc: PIECE_DESCRIPTIONS[p.toLowerCase()]
        });
      } else {
        setSelectedSquare(null);
        setSelectedPieceData(null);
      }
    }
  }

  // AI 로직
  useEffect(() => {
    if (gameMode === 'ai' && game.turn() === 'b' && !game.isGameOver() && !aiThinking) {
      setAiThinking(true);
      aiTimerRef.current = setTimeout(() => {
        const moves = game.moves();
        if (moves.length > 0) {
            const move = moves[Math.floor(Math.random() * moves.length)];
            const nextGame = new Chess(game.fen());
            nextGame.move(move);
            setFen(nextGame.fen());
            setMessage(`AI가 ${move}를 두었습니다. 당신의 차례입니다!`);
        }
        setAiThinking(false);
      }, 800); 
    }
  }, [fen, gameMode, aiThinking]);

  function undoMove() {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      setAiThinking(false);
      
      const pgn = game.pgn();
      if (!pgn && game.history().length === 0) return;

      const undoGame = new Chess();
      undoGame.loadPgn(game.pgn());
      
      if (gameMode === 'ai') {
          if (undoGame.turn() === 'b') undoGame.undo(); 
          else { undoGame.undo(); undoGame.undo(); }
      } else {
          undoGame.undo();
      }
      
      setFen(undoGame.fen());
      setSelectedSquare(null);
      setSelectedPieceData(null);
      setMessage("한 수 물렀습니다.");
  }

  function resetGame() {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      setAiThinking(false);
      setFen(new Chess().fen());
      setSelectedSquare(null);
      setSelectedPieceData(null);
      setMessage("새 게임을 시작합니다!");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2 text-emerald-400">초보자용 체스 교실 V2</h1>
      
      <div className="flex bg-slate-800 p-1 rounded-xl mb-4 shadow-lg border border-slate-700 w-full max-w-md">
        <button onClick={() => setGameMode('ai')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${gameMode === 'ai' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400'}`}>👤 AI 연습</button>
        <button onClick={() => setGameMode('human')} className={`flex-1 py-2 rounded-lg font-bold transition-all ${gameMode === 'human' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}>👥 2인용</button>
      </div>

      <p className="mb-4 text-emerald-300 font-semibold">{message}</p>

      <div className="w-full max-w-md mb-4 bg-slate-900 border-2 border-sky-500/50 rounded-xl p-4 min-h-[110px] flex flex-col justify-center shadow-2xl">
        {selectedPieceData ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{PIECE_UNICODE[selectedPieceData.piece]}</span>
              <h3 className="text-xl font-bold text-sky-400">{selectedPieceData.name}</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">{selectedPieceData.desc}</p>
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p className="text-sm">기물을 터치하면 이동 규칙이 여기에 표시됩니다.</p>
          </div>
        )}
      </div>

      <div className="grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-[15px] border-[5px] border-slate-700 w-full max-w-md bg-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mb-6">
        {board.map((row, rowIndex) => row.map((piece, colIndex) => {
          const square = getSquareFromIndices(rowIndex, colIndex);
          const isSelected = selectedSquare === square;
          const isTarget = legalTargets.has(square);
          const pColor = piece ? (piece === piece.toUpperCase() ? 'w' : 'b') : null;
          
          return (
            <button key={square} onClick={() => handleSquareClick(square)} 
              className={`relative w-full h-full flex items-center justify-center text-[clamp(1.8rem,6vw,3.2rem)] transition-all ${squareColor(rowIndex, colIndex)} ${isSelected ? 'ring-[6px] ring-inset ring-sky-400 z-10 bg-sky-200/40' : 'hover:brightness-110'}`}>
              <span className={pColor === 'w' 
                  ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000]' 
                  : 'text-slate-900 drop-shadow-sm'}>
                {piece ? PIECE_UNICODE[piece] : ''}
              </span>
              {isTarget && <span className="absolute h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-sky-500/70 shadow-[0_0_15px_rgba(14,165,233,1)] animate-pulse" />}
            </button>
          );
        }))}
      </div>

      <div className="flex gap-4 w-full max-w-md pb-10">
        <button onClick={resetGame} className="flex-1 px-4 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold border-b-4 border-slate-900 transition-all active:border-b-0 active:translate-y-1">새 게임</button>
        <button onClick={undoMove} className="flex-1 px-4 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold border-b-4 border-emerald-800 transition-all active:border-b-0 active:translate-y-1 shadow-lg">무르기 (Undo)</button>
      </div>
    </div>
  );
}
