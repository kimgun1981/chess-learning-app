export function remainingClockMilliseconds(startingMilliseconds, startedAt, now = Date.now()) {
  const elapsed = Math.max(0, now - startedAt);
  return Math.max(0, startingMilliseconds - elapsed);
}

export function remainingClockSeconds(startingSeconds, startedAt, now = Date.now()) {
  return Math.ceil(remainingClockMilliseconds(startingSeconds * 1000, startedAt, now) / 1000);
}

export function canColorPossiblyMate(game, color) {
  const allPieces = game.board().flat().filter(Boolean);
  const own = allPieces.filter(piece => piece.color === color && piece.type !== 'k');
  if (own.length === 0) return false;
  // chess.js correctly recognizes bare kings, a lone minor, and bishops that
  // can only travel on one square color as dead positions.
  if (game.isInsufficientMaterial()) return false;
  return true;
}

export function getGameOutcome(game, mode, timedOut = null) {
  if (timedOut) {
    const winner = timedOut === 'w' ? 'b' : 'w';
    if (!canColorPossiblyMate(game, winner)) return { kind:'draw', reason:'timeout-insufficient' };
    return { kind:'win', winner, reason:'timeout' };
  }
  if (game.isCheckmate()) return { kind:'win', winner:game.turn() === 'w' ? 'b' : 'w', reason:'checkmate' };
  if (game.isStalemate()) return { kind:'draw', reason:'stalemate' };
  if (game.isThreefoldRepetition()) return { kind:'draw', reason:'repetition' };
  if (game.isInsufficientMaterial()) return { kind:'draw', reason:'insufficient' };
  if (game.isDraw()) return { kind:'draw', reason:'fifty-move' };
  return { kind:'playing', mode };
}

export function outcomeToStat(outcome, mode) {
  if (outcome.kind === 'draw') return 'draws';
  if (outcome.kind !== 'win') return null;
  if (mode === 'ai') return outcome.winner === 'w' ? 'playerWins' : 'aiWins';
  return outcome.winner === 'w' ? 'whiteWins' : 'blackWins';
}
