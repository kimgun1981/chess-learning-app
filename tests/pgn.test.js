import test from 'node:test';
import assert from 'node:assert/strict';

import { createPgn, formatLocalDate } from '../src/chess/pgn.js';

test('PGN 날짜와 파일명은 UTC가 아닌 기기 현지 날짜를 사용한다', () => {
  const localDate = new Date(2026, 10, 16, 1, 30);
  assert.equal(formatLocalDate(localDate), '2026-11-16');
  assert.equal(formatLocalDate(localDate, '.'), '2026.11.16');
});

test('AI 대국을 표준 PGN 헤더와 수순으로 만든다', () => {
  const pgn = createPgn(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], {
    mode:'ai',
    result:'*',
  });

  assert.match(pgn, /\[Event "체스 교실"\]/);
  assert.match(pgn, /\[Site "chess-learning-app"\]/);
  assert.match(pgn, /\[Date "\d{4}\.\d{2}\.\d{2}"\]/);
  assert.match(pgn, /\[White "사용자"\]/);
  assert.match(pgn, /\[Black "AI"\]/);
  assert.match(pgn, /\[Result "\*"\]/);
  assert.match(pgn, /1\. e4 e5 2\. Nf3 Nc6 3\. Bb5 a6 \*$/);
});

test('2인 대국의 체크메이트 결과와 참가자명을 PGN에 보존한다', () => {
  const pgn = createPgn(['f3', 'e5', 'g4', 'Qh4#'], {
    mode:'2p',
    result:'0-1',
  });

  assert.match(pgn, /\[White "백"\]/);
  assert.match(pgn, /\[Black "흑"\]/);
  assert.match(pgn, /\[Result "0-1"\]/);
  assert.match(pgn, /1\. f3 e5 2\. g4 Qh4# 0-1$/);
});

test('잘못된 SAN 수순은 PGN으로 조용히 저장하지 않고 오류를 낸다', () => {
  assert.throws(() => createPgn(['e5']), /Invalid move/);
});
