export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

// The text variation selector keeps chess pieces monochrome on iOS.
export const GLYPH = { p:'♟︎', n:'♞︎', b:'♝︎', r:'♜︎', q:'♛︎', k:'♚︎' };
export const pieceGlyph = piece => piece ? GLYPH[piece.type] : null;

export const PIECE_CLASS = {
  w: 'text-white [text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000,0_0_6px_rgba(0,0,0,0.6)]',
  b: 'text-gray-900 [text-shadow:0_0_4px_rgba(255,255,255,1),1px_1px_0_rgba(255,255,255,0.8),-1px_-1px_0_rgba(255,255,255,0.8)]',
};

export const NAMES_KO = { p:'폰', n:'나이트', b:'비숍', r:'룩', q:'퀸', k:'킹' };

export const DESCRIPTIONS = {
  p: '앞으로 1칸 이동 (첫 수는 2칸 가능). 공격은 대각선 앞 1칸만 가능합니다. 상대 진영 끝까지 가면 원하는 기물로 바꿀 수 있습니다 (프로모션).',
  n: '"L"자 모양으로 이동합니다 (2칸 직선 + 1칸 측면). 다른 기물을 뛰어넘을 수 있는 유일한 기물입니다.',
  b: '대각선 방향으로 끝까지 이동합니다. 처음 위치한 색상의 칸에서만 움직이므로, 두 비숍은 서로 다른 색을 담당합니다.',
  r: '상하좌우 직선으로 끝까지 이동합니다. 킹과 함께 캐슬링(Castling)을 할 수 있습니다.',
  q: '직선과 대각선 모든 방향으로 끝까지 이동하는 체스 최강의 기물입니다.',
  k: '모든 방향으로 1칸만 이동합니다. 킹은 잡히는 기물이 아니며, 체크를 피할 방법이 없는 체크메이트가 되면 게임이 끝납니다.',
};

export const PIECE_VALUES = { p:1, n:3, b:3.2, r:5, q:9, k:0 };

export const DIFFICULTIES = [
  { id:'easy', label:'초급', icon:'🌱', desc:'AI가 무작위로 수를 둡니다. 기물의 이동 규칙과 기본 감각을 익히기에 적합합니다.' },
  { id:'medium', label:'중급', icon:'⚡', desc:'AI가 기물 잡기·체크·중앙 장악을 우선합니다.' },
  { id:'hard', label:'심화', icon:'🔥', desc:'AI가 미니맥스 알고리즘으로 3수 앞을 계산합니다.' },
];

export const TIME_OPTIONS = [
  { label:'무제한', seconds:0, icon:'∞', desc:'시간 제한 없이 여유롭게' },
  { label:'1분', seconds:60, icon:'⚡', desc:'초고속 불릿' },
  { label:'3분', seconds:180, icon:'🔥', desc:'빠른 블리츠' },
  { label:'5분', seconds:300, icon:'⏱', desc:'표준 블리츠' },
  { label:'10분', seconds:600, icon:'🕐', desc:'래피드' },
  { label:'30분', seconds:1800, icon:'♟', desc:'클래식' },
];

export function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${(safe % 60).toString().padStart(2, '0')}`;
}
