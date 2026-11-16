import test from 'node:test';
import assert from 'node:assert/strict';

import { FILES, RANKS, formatTime, pieceGlyph } from '../src/chess/config.js';

test('체스판 좌표와 기물 표시는 8×8 구성을 유지한다', () => {
  assert.deepEqual(FILES, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  assert.deepEqual(RANKS, [8, 7, 6, 5, 4, 3, 2, 1]);
  assert.equal(pieceGlyph({ type:'k' }), '♚︎');
  assert.equal(pieceGlyph(null), null);
});

test('초 단위 시간을 분:초 형식으로 안전하게 표시한다', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(61.9), '1:01');
  assert.equal(formatTime(1800), '30:00');
  assert.equal(formatTime(-10), '0:00');
});
