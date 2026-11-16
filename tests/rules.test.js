import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

import {
  canColorPossiblyMate,
  getGameOutcome,
  outcomeToStat,
  remainingClockMilliseconds,
  remainingClockSeconds,
} from '../src/chess/rules.js';

test('체스 시계는 지난 온전한 초만 차감하고 0 아래로 내려가지 않는다', () => {
  const startedAt = 10_000;
  assert.equal(remainingClockSeconds(60, startedAt, startedAt), 60);
  assert.equal(remainingClockSeconds(60, startedAt, startedAt + 999), 60);
  assert.equal(remainingClockSeconds(60, startedAt, startedAt + 1_000), 59);
  assert.equal(remainingClockSeconds(60, startedAt, startedAt + 80_000), 0);
  assert.equal(remainingClockSeconds(60, startedAt, startedAt - 1_000), 60);
});

test('빠른 착수를 반복해도 1초 미만의 사용 시간이 누적된다', () => {
  let remaining = 60_000;
  for (let move = 0; move < 20; move += 1) {
    remaining = remainingClockMilliseconds(remaining, 0, 900);
  }
  assert.equal(remaining, 42_000);
});

test('시간패에서 상대에게 메이트 가능 기물이 없으면 무승부로 판정한다', () => {
  const bareKings = new Chess('7k/8/8/8/8/8/8/K7 w - - 0 1');
  const loneBishop = new Chess('7k/8/8/8/8/8/8/K1b5 w - - 0 1');
  const sameColorBishops = new Chess('7k/8/8/8/8/8/8/K1b3b1 w - - 0 1');

  for (const game of [bareKings, loneBishop, sameColorBishops]) {
    assert.equal(canColorPossiblyMate(game, 'b'), false);
    assert.deepEqual(getGameOutcome(game, '2p', 'w'), {
      kind:'draw',
      reason:'timeout-insufficient',
    });
  }
});

test('시간패에서 상대에게 메이트 가능 기물이 있으면 상대 승리로 판정한다', () => {
  const rook = new Chess('7k/8/8/8/8/8/8/K1r5 w - - 0 1');
  const oppositeColorBishops = new Chess('7k/8/8/8/8/8/8/K1b2b2 w - - 0 1');

  for (const game of [rook, oppositeColorBishops]) {
    assert.equal(canColorPossiblyMate(game, 'b'), true);
    assert.deepEqual(getGameOutcome(game, '2p', 'w'), {
      kind:'win',
      winner:'b',
      reason:'timeout',
    });
  }
});

test('상대 기물 도움으로 메이트 가능한 외기물은 시간패 승리로 판정한다', () => {
  const bishopHelpMate = new Chess('8/8/8/8/1b6/8/B1k5/K7 b - - 0 1');
  const knightHelpMate = new Chess('8/8/8/8/1n6/8/B7/K1k5 b - - 2 1');
  const sameColorBishops = new Chess('7k/8/8/8/8/3B4/8/KB6 w - - 0 1');

  assert.equal(canColorPossiblyMate(bishopHelpMate, 'b'), true);
  assert.equal(canColorPossiblyMate(knightHelpMate, 'b'), true);
  assert.equal(canColorPossiblyMate(sameColorBishops, 'w'), false);
});

test('체크메이트와 스테일메이트를 구분한다', () => {
  const checkmate = new Chess('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
  const stalemate = new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');

  assert.deepEqual(getGameOutcome(checkmate, 'ai'), {
    kind:'win',
    winner:'w',
    reason:'checkmate',
  });
  assert.deepEqual(getGameOutcome(stalemate, 'ai'), {
    kind:'draw',
    reason:'stalemate',
  });
});

test('3회 반복과 50수 규칙 무승부를 판정한다', () => {
  const repeated = new Chess();
  for (let cycle = 0; cycle < 2; cycle += 1) {
    repeated.move('Nf3');
    repeated.move('Nf6');
    repeated.move('Ng1');
    repeated.move('Ng8');
  }
  assert.equal(repeated.isThreefoldRepetition(), true);
  assert.deepEqual(getGameOutcome(repeated, '2p'), {
    kind:'draw',
    reason:'repetition',
  });

  const fiftyMove = new Chess('8/8/8/8/8/8/7k/K6R w - - 100 51');
  assert.equal(fiftyMove.isDrawByFiftyMoves(), true);
  assert.deepEqual(getGameOutcome(fiftyMove, '2p'), {
    kind:'draw',
    reason:'fifty-move',
  });
});

test('게임 결과를 모드별 통계 항목으로 변환한다', () => {
  assert.equal(outcomeToStat({ kind:'draw' }, 'ai'), 'draws');
  assert.equal(outcomeToStat({ kind:'win', winner:'w' }, 'ai'), 'playerWins');
  assert.equal(outcomeToStat({ kind:'win', winner:'b' }, 'ai'), 'aiWins');
  assert.equal(outcomeToStat({ kind:'win', winner:'w' }, '2p'), 'whiteWins');
  assert.equal(outcomeToStat({ kind:'win', winner:'b' }, '2p'), 'blackWins');
  assert.equal(outcomeToStat({ kind:'playing' }, 'ai'), null);
});
