import { Chess } from 'chess.js';

export function formatLocalDate(date = new Date(), separator = '-') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return [year, month, day].join(separator);
}

export function createPgn(moveSANs, { mode = 'ai', result = '*' } = {}) {
  const game = new Chess();
  game.header(
    'Event', '체스 교실',
    'Site', 'chess-learning-app',
    'Date', formatLocalDate(new Date(), '.'),
    'White', mode === 'ai' ? '사용자' : '백',
    'Black', mode === 'ai' ? 'AI' : '흑',
    'Result', result,
  );
  for (const san of moveSANs) game.move(san);
  return game.pgn({ maxWidth:80, newline:'\n' });
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type:'application/x-chess-pgn;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
