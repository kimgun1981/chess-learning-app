import { Chess } from 'chess.js';
import { NAMES_KO, PIECE_VALUES } from './config.js';

export function evaluate(game) {
  if (game.isCheckmate()) return game.turn() === 'w' ? 100000 : -100000;
  if (game.isDraw()) return 0;
  let score = 0;
  const board = game.board();
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const piece = board[row][column];
      if (!piece) continue;
      const sign = piece.color === 'b' ? 1 : -1;
      const center = (3.5 - Math.abs(column - 3.5) + 3.5 - Math.abs(row - 3.5)) * 0.025;
      const activity = ['n', 'b', 'q'].includes(piece.type) ? center : 0;
      const pawnAdvance = piece.type === 'p' ? (piece.color === 'w' ? 6 - row : row - 1) * 0.035 : 0;
      score += sign * (PIECE_VALUES[piece.type] + activity + pawnAdvance);
    }
  }
  return score;
}

function cloneGame(game) {
  const history = game.history();
  if (history.length > 0) {
    try {
      const replay = new Chess();
      for (const san of history) replay.move(san);
      if (replay.fen() === game.fen()) return replay;
    } catch { /* A game loaded from a custom FEN cannot be replayed from start. */ }
  }
  return new Chess(game.fen());
}

function orderedMoves(game) {
  return game.moves({ verbose:true }).sort((a, b) => {
    const aPriority = (a.captured ? PIECE_VALUES[a.captured] * 10 : 0) + (a.promotion ? 8 : 0);
    const bPriority = (b.captured ? PIECE_VALUES[b.captured] * 10 : 0) + (b.promotion ? 8 : 0);
    return bPriority - aPriority;
  });
}

export function minimax(game, depth, alpha, beta, maximizing, deadline = Infinity) {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  if (Date.now() >= deadline) return evaluate(game);
  const moves = orderedMoves(game);
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      if (Date.now() >= deadline) break;
      const next = cloneGame(game); next.move(move);
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false, deadline));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best === -Infinity ? evaluate(game) : best;
  }
  let best = Infinity;
  for (const move of moves) {
    if (Date.now() >= deadline) break;
    const next = cloneGame(game); next.move(move);
    best = Math.min(best, minimax(next, depth - 1, alpha, beta, true, deadline));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best === Infinity ? evaluate(game) : best;
}

export function getAIMove(game, difficulty) {
  const moves = game.moves({ verbose:true });
  if (!moves.length) return null;
  if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
  if (difficulty === 'medium') {
    let best = null, bestScore = -Infinity;
    for (const move of moves) {
      const next = new Chess(game.fen()); const result = next.move(move);
      let score = next.isCheckmate() ? 10000 : 0;
      if (!next.isCheckmate()) {
        if (next.isCheck()) score += 3;
        if (result.captured) score += PIECE_VALUES[result.captured] * 10;
        if (['d4','d5','e4','e5'].includes(result.to)) score += 1;
      }
      score += Math.random() * 0.3;
      if (score > bestScore) { bestScore = score; best = move; }
    }
    return best;
  }
  let best = null, bestScore = -Infinity;
  const deadline = Date.now() + 700;
  for (const move of orderedMoves(game)) {
    if (Date.now() >= deadline && best) break;
    const next = cloneGame(game); next.move(move);
    const score = minimax(next, 2, -Infinity, Infinity, false, deadline);
    if (score > bestScore) { bestScore = score; best = move; }
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
  return '기물 점수와 상대의 다음 대응을 함께 계산한 참고용 후보수입니다.';
}

export function getHintAnalysis(game) {
  const moves = orderedMoves(game);
  if (!moves.length) return null;
  let best = null, bestScore = Infinity, bestGame = null;
  // Always spot a mate in one before the time-limited deeper search.
  for (const move of moves) {
    const next = cloneGame(game);
    const result = next.move(move);
    if (next.isCheckmate()) {
      return {
        from:result.from,
        to:result.to,
        san:result.san,
        reason:explainRecommendedMove(result, next),
        label:'추천 후보수',
      };
    }
  }
  const deadline = Date.now() + 300;
  const depth = moves.length <= 12 ? 2 : 1;
  for (const move of moves) {
    if (Date.now() >= deadline && best) break;
    const next = cloneGame(game);
    const result = next.move(move);
    const score = minimax(next, depth, -Infinity, Infinity, true, deadline);
    if (score < bestScore) { bestScore = score; best = result; bestGame = next; }
  }
  return best ? {
    from:best.from,
    to:best.to,
    san:best.san,
    reason:explainRecommendedMove(best, bestGame),
    label:'추천 후보수',
  } : null;
}

export function getCommentary(move, game) {
  if (!move) return '';
  const name = NAMES_KO[move.piece];
  if (game.isCheckmate()) return `체크메이트! AI의 ${name}이/가 결정적인 수를 완성했습니다.`;
  if (game.isCheck()) return `체크! AI의 ${name}이/가 킹을 위협합니다. 반드시 피하세요.`;
  if (move.flags?.includes('e')) return '앙파상(En Passant)! 폰만 사용하는 특수 잡기 기술입니다.';
  if (move.flags?.includes('k')) return 'AI가 킹사이드 캐슬링으로 킹을 보호했습니다.';
  if (move.flags?.includes('q')) return 'AI가 퀸사이드 캐슬링으로 킹을 보호하고 룩을 활성화했습니다.';
  if (move.captured) return `AI의 ${name}이/가 당신의 ${NAMES_KO[move.captured]}을/를 잡았습니다.`;
  if (['d4','d5','e4','e5'].includes(move.to)) return `AI가 중앙 ${move.to}을/를 장악하는 수를 뒀습니다.`;
  if (['n','b'].includes(move.piece) && move.from[1] === '8') return `AI가 ${name}을/를 전개해 공격과 방어에 참여시켰습니다.`;
  return `AI가 ${name}을/를 ${move.from} → ${move.to}으로 이동했습니다. 공격받는 기물과 빈틈을 확인하세요.`;
}

export function getTip(game, totalMoves) {
  if (game.isCheck()) return '⚠️ 체크! 킹을 이동하거나 체크를 막아야 합니다.';
  const pieces = game.board().flat().filter(Boolean);
  if (pieces.length <= 10) return '💡 [엔드게임] 킹을 중앙으로 이동하고 폰 승격을 준비하세요.';
  if (totalMoves < 8 && game.get('e2')?.type === 'p' && game.get('d2')?.type === 'p') return '💡 [중앙] e폰이나 d폰을 움직여 기물이 나올 길을 만드세요.';
  if (game.get('b1')?.type === 'n' || game.get('g1')?.type === 'n' || game.get('c1')?.type === 'b' || game.get('f1')?.type === 'b') return '💡 [기물 전개] 첫자리에 남은 나이트·비숍을 먼저 꺼내세요.';
  if (totalMoves < 24 && game.get('e1')?.type === 'k') return '💡 [킹 보호] 조건이 된다면 캐슬링으로 킹을 보호하세요.';
  return '💡 상대의 다음 체크·잡기 수를 먼저 확인한 뒤 공격하세요.';
}

export function getUserMoveFeedback(move, gameAfter) {
  if (gameAfter.isCheckmate()) return '훌륭합니다. 상대 킹이 피할 수 없는 체크메이트를 완성했습니다.';
  if (move.flags?.includes('k') || move.flags?.includes('q')) return '좋은 캐슬링입니다. 킹을 보호하고 룩을 활성화했습니다.';
  if (move.captured) return `${NAMES_KO[move.captured]}을/를 잡았습니다. 이동한 ${NAMES_KO[move.piece]}이/가 다시 잡히지 않는지도 확인하세요.`;
  if (gameAfter.isCheck()) return '좋은 체크입니다. AI는 킹을 피하거나 공격을 막아야 합니다.';
  if (['d4','d5','e4','e5'].includes(move.to)) return '중앙으로 진출했습니다. 중앙을 장악하면 다른 기물의 이동이 편해집니다.';
  if (['n','b'].includes(move.piece) && move.from[1] === '1') return `${NAMES_KO[move.piece]}을/를 전개했습니다. 현재 칸에서 중앙을 공격하는지 살펴보세요.`;
  return `${move.from} → ${move.to} 이동을 완료했습니다. AI의 다음 체크·잡기 수를 예상해보세요.`;
}
