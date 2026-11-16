import { FILES, NAMES_KO, PIECE_CLASS, pieceGlyph } from '../chess/config.js';
import { GameOverModal, PromotionModal } from './GameUi.jsx';

export function ChessBoard({
  board,
  selectedSq,
  legalTargets,
  hint,
  kingCheckSq,
  onSquareClick,
  flipped = false,
  rotateColor = null,
  promotion,
  onPromote,
  game,
  gameMode,
  timedOut,
  isOver,
  onReset,
  onMenu,
}) {
  const displayedRanks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const displayedFiles = flipped ? [...FILES].reverse() : FILES;

  return (
    <div className="relative w-full aspect-square">
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl">
        {displayedRanks.map((rank, rowIndex) => displayedFiles.map((file, columnIndex) => {
          const square = `${file}${rank}`;
          const piece = board[8 - rank][FILES.indexOf(file)];
          const isSelected = selectedSq === square;
          const isTarget = legalTargets.has(square);
          const isHint = hint?.from === square || hint?.to === square;
          const isCheck = kingCheckSq === square;
          const isLight = (rowIndex + columnIndex) % 2 === 0;
          const labelColor = isLight ? 'text-amber-700/70' : 'text-amber-100/70';
          const farHalf = Boolean(rotateColor) && rowIndex < 4;
          let ring = '';
          if (isCheck) ring = 'ring-4 ring-inset ring-red-500 bg-red-400/30';
          else if (isSelected) ring = 'ring-4 ring-inset ring-sky-400 bg-sky-300/20';
          else if (isHint) ring = 'ring-4 ring-inset ring-yellow-400 bg-yellow-200/20';

          return (
            <button
              key={square}
              onClick={() => onSquareClick(square)}
              aria-label={`${square} ${piece ? `${piece.color === 'w' ? '백' : '흑'} ${NAMES_KO[piece.type]}` : '빈 칸'}`}
              aria-pressed={isSelected}
              className={`relative flex items-center justify-center h-full text-[clamp(1rem,5vw,3rem)] ${isLight ? 'bg-amber-100' : 'bg-amber-700'} ${ring} hover:brightness-110 transition-all`}
            >
              {columnIndex === 0 && (
                <span
                  style={farHalf ? { transform:'rotate(180deg)' } : undefined}
                  className={`absolute top-0.5 left-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${labelColor}`}
                >
                  {rank}
                </span>
              )}
              {rowIndex === 7 && <span className={`absolute bottom-0.5 right-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${labelColor}`}>{file}</span>}
              {rotateColor && rowIndex === 0 && (
                <span style={{ transform:'rotate(180deg)' }} className={`absolute top-0.5 right-0.5 text-[clamp(0.45rem,1.2vw,0.7rem)] font-mono font-bold leading-none ${labelColor}`}>{file}</span>
              )}
              {piece && (
                <span
                  style={piece.color === rotateColor ? { transform:'rotate(180deg)' } : undefined}
                  className={`${PIECE_CLASS[piece.color]} select-none`}
                >
                  {pieceGlyph(piece)}
                </span>
              )}
              {isTarget && <span className="absolute w-[28%] h-[28%] rounded-full bg-sky-500/70 shadow-[0_0_10px_rgba(14,165,233,0.8)] animate-pulse pointer-events-none" />}
            </button>
          );
        }))}
      </div>
      {promotion && <PromotionModal color={promotion.color} rotated={promotion.color === rotateColor} onSelect={onPromote} />}
      {isOver && <GameOverModal game={game} mode={gameMode} timedOut={timedOut} onReset={onReset} onMenu={onMenu} />}
    </div>
  );
}
