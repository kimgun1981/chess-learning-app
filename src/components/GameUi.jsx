import { GLYPH, NAMES_KO, PIECE_VALUES, PIECE_CLASS, formatTime } from '../chess/config.js';
import { getGameOutcome } from '../chess/rules.js';

export function PromotionModal({ color, rotated = false, onSelect }) {
  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
      <div
        style={rotated ? { transform:'rotate(180deg)' } : undefined}
        className="bg-slate-800 rounded-2xl p-5 border border-slate-600 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="승격할 기물 선택"
      >
        <p className="text-center text-sm font-bold text-slate-300 mb-3">승격할 기물을 선택하세요</p>
        <div className="flex gap-2">
          {['q', 'r', 'b', 'n'].map(type => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-14 h-14 flex flex-col items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-xl transition-all"
            >
              <span className={`text-3xl leading-none select-none ${PIECE_CLASS[color]}`}>{GLYPH[type]}</span>
              <span className="text-[0.6rem] text-slate-400 mt-0.5">{NAMES_KO[type]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GameOverModal({ game, mode, timedOut, onReset, onMenu }) {
  const outcome = getGameOutcome(game, mode, timedOut);
  let icon = '🤝';
  let title = '무승부!';
  let sub = '';

  if (outcome.kind === 'win' && outcome.reason === 'timeout') {
    icon = '⏰';
    title = '시간 초과!';
    sub = outcome.winner === 'w'
      ? '백(White) 승리 — 흑의 시간이 다 됐습니다'
      : '흑(Black) 승리 — 백의 시간이 다 됐습니다';
  } else if (outcome.reason === 'timeout-insufficient') {
    sub = '시간은 끝났지만 상대에게 체크메이트 가능한 기물이 없습니다';
  } else if (outcome.kind === 'win') {
    if (mode === 'ai') {
      if (outcome.winner === 'w') {
        icon = '🎉'; title = '당신의 승리!'; sub = 'AI를 이겼습니다!';
      } else {
        icon = '😓'; title = 'AI 승리!'; sub = '다시 도전해보세요!';
      }
    } else {
      icon = '🏆';
      title = outcome.winner === 'w' ? '백(White) 승리!' : '흑(Black) 승리!';
      sub = '체크메이트';
    }
  } else if (outcome.reason === 'stalemate') sub = '스테일메이트';
  else if (outcome.reason === 'repetition') sub = '3회 반복';
  else if (outcome.reason === 'insufficient') sub = '체크메이트할 기물 부족';
  else sub = '50수 규칙';

  return (
    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
      <div className="bg-slate-800 rounded-2xl p-8 text-center border border-slate-600 shadow-2xl w-72" role="dialog" aria-modal="true">
        <div className="text-6xl mb-3 select-none">{icon}</div>
        <h2 className="text-3xl font-bold text-white mb-1">{title}</h2>
        <p className="text-slate-400 mb-6 text-sm">{sub}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onReset} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-sm transition-all">다시 하기</button>
          <button onClick={onMenu} className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-xl font-bold text-sm transition-all">메뉴로</button>
        </div>
      </div>
    </div>
  );
}

export function PlayerCard({ color, time, timeControl, isActive, capturedTypes, advantage, isTimedOut, compact = false }) {
  const isWhite = color === 'w';
  const isLow = timeControl > 0 && time <= 30;
  const opponentColor = isWhite ? 'b' : 'w';

  return (
    <div className={`rounded-2xl ${compact ? 'px-3 py-2' : 'p-4'} border-2 transition-all duration-300 ${
      isTimedOut ? 'border-red-500 bg-red-950/40'
        : isActive ? 'border-emerald-400 bg-slate-700 shadow-[0_0_20px_rgba(52,211,153,0.15)]'
          : 'border-slate-700 bg-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none">{isWhite ? '⚪' : '⚫'}</span>
          <div>
            <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
              {isWhite ? '백 (White)' : '흑 (Black)'}
            </p>
            {isActive && !isTimedOut && <p className="text-xs text-emerald-400 leading-none animate-pulse">● 차례</p>}
          </div>
        </div>
        {timeControl > 0 && (
          <div className={`${compact ? 'text-2xl' : 'text-3xl'} font-mono font-bold tabular-nums ${
            isTimedOut ? 'text-red-400'
              : isLow && isActive ? 'text-red-400 animate-pulse'
                : isActive ? 'text-white' : 'text-slate-500'
          }`}>
            {formatTime(time)}
          </div>
        )}
      </div>
      <div className="flex items-center flex-wrap gap-0.5 min-h-[1.4rem]">
        {[...capturedTypes]
          .sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a])
          .map((type, index) => (
            <span key={`${type}-${index}`} className={`text-base leading-none select-none ${
              opponentColor === 'w'
                ? 'text-white [text-shadow:-1px_-1px_0_#555,1px_1px_0_#555]'
                : 'text-slate-900 drop-shadow'
            }`}>
              {GLYPH[type]}
            </span>
          ))}
        {advantage > 0 && <span className="text-xs font-bold text-emerald-400 ml-1">+{advantage}</span>}
      </div>
    </div>
  );
}
