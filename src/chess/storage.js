import { Chess } from 'chess.js';

export const STORAGE_KEYS = {
  game: 'chess-classroom-current-game-v2',
  preferences: 'chess-classroom-preferences-v1',
  lessons: 'chess-classroom-lessons-v1',
  stats: 'chess-classroom-stats-v1',
  recordedGames: 'chess-classroom-recorded-games-v1',
};

export const DEFAULT_STATS = {
  gamesPlayed: 0,
  aiGames: 0,
  humanGames: 0,
  playerWins: 0,
  aiWins: 0,
  draws: 0,
  aiDraws: 0,
  humanDraws: 0,
  whiteWins: 0,
  blackWins: 0,
};

function getStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadJSON(key, fallback) {
  try {
    const value = getStorage()?.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try { getStorage()?.setItem(key, JSON.stringify(value)); } catch { /* private mode or full storage */ }
}

export function removeStoredGame() {
  try { getStorage()?.removeItem(STORAGE_KEYS.game); } catch { /* storage may be unavailable */ }
}

export function loadStats() {
  const stored = loadJSON(STORAGE_KEYS.stats, {});
  const safe = {};
  for (const key of Object.keys(DEFAULT_STATS)) {
    const value = Number(stored?.[key]);
    safe[key] = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }
  safe.draws = Math.max(safe.draws, safe.aiDraws + safe.humanDraws);
  safe.aiGames = Math.max(safe.aiGames, safe.playerWins + safe.aiWins + safe.aiDraws);
  safe.humanGames = Math.max(safe.humanGames, safe.whiteWins + safe.blackWins + safe.humanDraws);
  const resultTotal = safe.playerWins + safe.aiWins + safe.draws + safe.whiteWins + safe.blackWins;
  safe.gamesPlayed = Math.max(safe.gamesPlayed, safe.aiGames + safe.humanGames, resultTotal);
  return safe;
}

export function recordResult(result, gameId = null, mode = null) {
  const stats = loadStats();
  const resultKeys = ['playerWins', 'aiWins', 'draws', 'whiteWins', 'blackWins'];
  if (!resultKeys.includes(result)) return stats;
  const recorded = loadJSON(STORAGE_KEYS.recordedGames, []);
  const safeRecorded = Array.isArray(recorded) ? recorded.filter(id => typeof id === 'string') : [];
  if (gameId && safeRecorded.includes(gameId)) return stats;
  stats.gamesPlayed += 1;
  stats[result] += 1;
  if (mode === 'ai') {
    stats.aiGames += 1;
    if (result === 'draws') stats.aiDraws += 1;
  } else if (mode === 'human') {
    stats.humanGames += 1;
    if (result === 'draws') stats.humanDraws += 1;
  }
  saveJSON(STORAGE_KEYS.stats, stats);
  if (gameId) saveJSON(STORAGE_KEYS.recordedGames, [...safeRecorded.slice(-199), gameId]);
  return stats;
}

export function resetLearningProgress() {
  try { getStorage()?.removeItem(STORAGE_KEYS.lessons); } catch { /* storage may be unavailable */ }
}

export function loadPreferences() {
  const stored = loadJSON(STORAGE_KEYS.preferences, {});
  const difficulty = ['easy', 'medium', 'hard'].includes(stored?.difficulty) ? stored.difficulty : 'medium';
  const validTimes = new Set([0, 60, 180, 300, 600, 1800]);
  const timeControl = validTimes.has(Number(stored?.timeControl)) ? Number(stored.timeControl) : 300;
  return {
    difficulty,
    timeControl,
    soundEnabled:stored?.soundEnabled !== false,
  };
}

export function loadLessonProgress() {
  const stored = loadJSON(STORAGE_KEYS.lessons, []);
  if (!Array.isArray(stored)) return [];
  return [...new Set(stored.filter(id => Number.isInteger(id) && id > 0 && id <= 100))];
}

export function loadSavedGame() {
  const stored = loadJSON(STORAGE_KEYS.game, null);
  if (!stored || typeof stored !== 'object' || !Array.isArray(stored.moveSANs) || stored.moveSANs.length === 0) return null;
  const replay = new Chess();
  try {
    for (const san of stored.moveSANs) {
      if (typeof san !== 'string') {
        removeStoredGame();
        return null;
      }
      replay.move(san);
    }
  } catch {
    removeStoredGame();
    return null;
  }
  const preferences = loadPreferences();
  const gameMode = stored.gameMode === 'human' ? 'human' : 'ai';
  const difficulty = ['easy', 'medium', 'hard'].includes(stored.difficulty) ? stored.difficulty : preferences.difficulty;
  const validTimes = new Set([0, 60, 180, 300, 600, 1800]);
  const timeControl = validTimes.has(Number(stored.timeControl)) ? Number(stored.timeControl) : 0;
  const maximumMilliseconds = Math.max(timeControl * 1000, 0);
  const safeMilliseconds = (milliseconds, seconds) => {
    const candidate = Number.isFinite(Number(milliseconds)) ? Number(milliseconds) : Number(seconds) * 1000;
    if (!Number.isFinite(candidate)) return maximumMilliseconds;
    return Math.min(maximumMilliseconds, Math.max(0, candidate));
  };
  return {
    ...stored,
    gameMode,
    difficulty,
    timeControl,
    moveSANs:[...stored.moveSANs],
    whiteTimeMs:safeMilliseconds(stored.whiteTimeMs, stored.whiteTime),
    blackTimeMs:safeMilliseconds(stored.blackTimeMs, stored.blackTime),
    boardView:stored.boardView === 'b' ? 'b' : 'w',
    gameId:typeof stored.gameId === 'string' && stored.gameId ? stored.gameId : null,
  };
}
