import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';

import { LESSONS } from '../src/chess/lessons.js';

function parseAnswer(answer) {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(answer);
  assert.ok(match, `답안 ${answer}은/는 UCI 좌표 형식이어야 합니다.`);
  return {
    from:match[1],
    to:match[2],
    ...(match[3] ? { promotion:match[3] } : {}),
  };
}

function gameForLesson(lesson) {
  return lesson.fen === 'start' ? new Chess() : new Chess(lesson.fen);
}

test('학습 문제 20개가 고유 번호와 필수 설명을 갖는다', () => {
  assert.equal(LESSONS.length, 20);
  assert.equal(new Set(LESSONS.map(lesson => lesson.id)).size, LESSONS.length);

  for (const lesson of LESSONS) {
    assert.equal(typeof lesson.title, 'string');
    assert.ok(lesson.title.length > 0, `${lesson.id}번 제목이 비어 있습니다.`);
    assert.ok(lesson.level.length > 0, `${lesson.id}번 단계가 비어 있습니다.`);
    assert.ok(lesson.objective.length > 0, `${lesson.id}번 목표가 비어 있습니다.`);
    assert.ok(lesson.explanation.length > 0, `${lesson.id}번 설명이 비어 있습니다.`);
    assert.ok(lesson.wrongHint.length > 0, `${lesson.id}번 오답 안내가 비어 있습니다.`);
    assert.ok(lesson.answers.length > 0, `${lesson.id}번 정답이 없습니다.`);
  }
});

test('모든 학습 문제의 정답 수가 해당 시작 위치에서 합법적이다', () => {
  for (const lesson of LESSONS) {
    assert.doesNotThrow(() => gameForLesson(lesson), `${lesson.id}번 FEN이 올바르지 않습니다.`);

    for (const answer of lesson.answers) {
      const game = gameForLesson(lesson);
      const move = game.move(parseAnswer(answer));
      assert.ok(move, `${lesson.id}번 정답 ${answer}이/가 합법적인 수가 아닙니다.`);
    }
  }
});

test('여러 정답을 허용하는 문제가 충분히 포함되어 있다', () => {
  const multipleAnswerLessons = LESSONS.filter(lesson => lesson.answers.length > 1);
  assert.ok(multipleAnswerLessons.length >= 3);
});

test('1수 메이트 문제의 정답은 실제 체크메이트를 만든다', () => {
  const mateLessons = LESSONS.filter(lesson => lesson.level === '1수 메이트');
  assert.ok(mateLessons.length > 0);

  for (const lesson of mateLessons) {
    for (const answer of lesson.answers) {
      const game = gameForLesson(lesson);
      game.move(parseAnswer(answer));
      assert.equal(game.isCheckmate(), true, `${lesson.id}번 정답 ${answer}은/는 체크메이트여야 합니다.`);
    }
  }
});
