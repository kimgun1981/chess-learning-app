import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_STATS,
  STORAGE_KEYS,
  loadJSON,
  loadPreferences,
  loadSavedGame,
  loadStats,
  recordResult,
  removeStoredGame,
  resetLearningProgress,
  saveJSON,
} from '../src/chess/storage.js';

class MemoryStorage {
  constructor() { this.items = new Map(); }
  getItem(key) { return this.items.has(key) ? this.items.get(key) : null; }
  setItem(key, value) { this.items.set(key, String(value)); }
  removeItem(key) { this.items.delete(key); }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

afterEach(() => {
  delete globalThis.localStorage;
});

test('JSON 값을 저장하고 다시 읽으며 깨진 값은 기본값으로 복구한다', () => {
  saveJSON('sample', { difficulty:'hard' });
  assert.deepEqual(loadJSON('sample', null), { difficulty:'hard' });

  globalThis.localStorage.setItem('broken', '{');
  assert.deepEqual(loadJSON('broken', { safe:true }), { safe:true });
  assert.equal(loadJSON('missing', 'fallback'), 'fallback');
});

test('대국 결과를 누적하고 기존 통계의 빠진 항목은 기본값으로 채운다', () => {
  saveJSON(STORAGE_KEYS.stats, { gamesPlayed:2, playerWins:1 });
  assert.deepEqual(loadStats(), {
    ...DEFAULT_STATS,
    gamesPlayed:2,
    aiGames:1,
    playerWins:1,
  });

  const updated = recordResult('aiWins', null, 'ai');
  assert.equal(updated.gamesPlayed, 3);
  assert.equal(updated.aiGames, 2);
  assert.equal(updated.playerWins, 1);
  assert.equal(updated.aiWins, 1);
  assert.deepEqual(loadStats(), updated);
});

test('문자열 통계를 숫자로 복구하고 같은 경기 결과는 한 번만 기록한다', () => {
  saveJSON(STORAGE_KEYS.stats, { gamesPlayed:'2', draws:'1' });
  const first = recordResult('draws', 'game-1');
  const duplicate = recordResult('draws', 'game-1');

  assert.equal(first.gamesPlayed, 3);
  assert.equal(first.draws, 2);
  assert.deepEqual(duplicate, first);
});

test('AI와 2인용 경기 통계를 각각 구분한다', () => {
  recordResult('playerWins', 'ai-game', 'ai');
  recordResult('draws', 'human-game', 'human');
  const stats = loadStats();

  assert.equal(stats.gamesPlayed, 2);
  assert.equal(stats.aiGames, 1);
  assert.equal(stats.humanGames, 1);
  assert.equal(stats.playerWins, 1);
  assert.equal(stats.humanDraws, 1);
});

test('손상된 환경설정과 저장 게임을 안전한 기본값으로 복구한다', () => {
  saveJSON(STORAGE_KEYS.preferences, null);
  assert.deepEqual(loadPreferences(), {
    difficulty:'medium',
    timeControl:300,
    soundEnabled:true,
  });

  saveJSON(STORAGE_KEYS.game, {
    gameMode:'human',
    moveSANs:['e4', '잘못된 수'],
    timeControl:60,
  });
  assert.equal(loadSavedGame(), null);
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEYS.game), null);
});

test('이어하기 기록과 학습 진도를 각각 초기화한다', () => {
  saveJSON(STORAGE_KEYS.game, { fen:'sample' });
  saveJSON(STORAGE_KEYS.lessons, [1, 2, 3]);

  removeStoredGame();
  resetLearningProgress();

  assert.equal(globalThis.localStorage.getItem(STORAGE_KEYS.game), null);
  assert.equal(globalThis.localStorage.getItem(STORAGE_KEYS.lessons), null);
});
