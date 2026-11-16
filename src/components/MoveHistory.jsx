import { Fragment } from 'react';

export function MoveHistory({ moves, compact = false }) {
  if (moves.length === 0) return <p className="text-slate-600 text-center py-2">아직 수가 없습니다</p>;
  return (
    <div className={`grid grid-cols-[1.5rem_1fr_1fr] gap-x-2 gap-y-0.5 ${compact ? 'text-xs' : ''}`}>
      {Array.from({ length:Math.ceil(moves.length / 2) }).map((_, index) => (
        <Fragment key={index}>
          <span className="text-slate-500 text-right">{index + 1}.</span>
          <span className="text-white">{moves[index * 2] ?? ''}</span>
          <span className="text-slate-400">{moves[index * 2 + 1] ?? ''}</span>
        </Fragment>
      ))}
    </div>
  );
}
