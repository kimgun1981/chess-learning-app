import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

import { getAIMove, getHintAnalysis, minimax } from '../src/chess/engine.js';

function moveKey(move) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

test('모든 난이도의 AI가 현재 위치에서 합법적인 수를 고른다', () => {
  const fen = '4k3/8/8/8/8/8/4P3/4K3 b - - 0 1';

  for (const difficulty of ['easy', 'medium', 'hard']) {
    const game = new Chess(fen);
    const legalMoves = new Set(game.moves({ verbose:true }).map(moveKey));
    const chosen = getAIMove(game, difficulty);

    assert.ok(chosen, `${difficulty} AI가 수를 선택해야 합니다.`);
    assert.ok(legalMoves.has(moveKey(chosen)), `${difficulty} AI가 합법적인 수를 선택해야 합니다.`);
  }
});

test('둘 수 없는 위치에서 AI와 추천 기능은 null을 반환한다', () => {
  const checkmate = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
  assert.equal(checkmate.isCheckmate(), true);
  assert.equal(getAIMove(checkmate, 'hard'), null);
  assert.equal(getHintAnalysis(checkmate), null);
});

test('추천 기능이 합법적인 후보수와 이해 가능한 설명을 제공한다', () => {
  const game = new Chess('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');
  const legalMoves = new Set(game.moves({ verbose:true }).map(moveKey));
  const hint = getHintAnalysis(game);

  assert.ok(hint);
  assert.ok(legalMoves.has(`${hint.from}${hint.to}`));
  assert.equal(hint.label, '추천 후보수');
  assert.ok(hint.san.length > 0);
  assert.ok(hint.reason.length > 0);
});

test('추천 기능은 가능한 1수 체크메이트를 놓치지 않는다', () => {
  const game = new Chess('7k/5Q2/7K/8/8/8/8/8 w - - 0 1');
  const hint = getHintAnalysis(game);
  const after = new Chess(game.fen());
  after.move(hint.san);

  assert.equal(after.isCheckmate(), true);
  assert.match(hint.reason, /체크메이트/);
});

test('미니맥스 계산은 작은 위치에서 유한한 평가값을 반환한다', () => {
  const game = new Chess('4k3/8/8/8/8/8/4P3/4K3 b - - 0 1');
  const score = minimax(game, 2, -Infinity, Infinity, true);
  assert.equal(Number.isFinite(score), true);
});
