/**
 * Memorice — the pixel-art pictures (lab). Each one is 8×8 pixels drawn with letters, one letter
 * per colour of PALETTE ('.' is empty), and turned into a small SVG with crisp edges. Our own drawings.
 */

export const PALETTE = {
  k: '#1a0f33', w: '#ffffff', r: '#ff3b5c', R: '#b0123a', o: '#ff8a3d', y: '#ffd23f', Y: '#c99a00',
  g: '#9dff3a', G: '#2f9e44', c: '#2ee6d6', b: '#3b82ff', B: '#1e3a8a', p: '#ff2e88', v: '#a259ff',
  n: '#8b5a2b', s: '#c9c9d6', S: '#6b6b80',
};

/** The pictures, in a fixed order: the engine picks them by index. */
export const SPRITES = {
  apple: [
    '....G...',
    '...Gn...',
    '.rrnrrr.',
    'rrrrrwrr',
    'rrrrrrwr',
    'rrrrrrrr',
    '.rrrrrr.',
    '..rRRr..',
  ],
  heart: [
    '........',
    '.pp..pp.',
    'pwpppppp',
    'pppppppp',
    'pppppppp',
    '.pppppp.',
    '..pppp..',
    '...pp...',
  ],
  star: [
    '...yy...',
    '...yy...',
    'yyyyyyyy',
    '.yyyyyy.',
    '..yyyy..',
    '.yyyyyy.',
    '.yy..yy.',
    'y......y',
  ],
  ghost: [
    '..wwww..',
    '.wwwwww.',
    'wwkwwkww',
    'wwkwwkww',
    'wwwwwwww',
    'wwwwwwww',
    'wwwwwwww',
    'w.ww.ww.',
  ],
  key: [
    '.yyy....',
    'y...y...',
    'y...y...',
    '.yyyy...',
    '....y...',
    '....yy..',
    '....y...',
    '....yy..',
  ],
  potion: [
    '...nn...',
    '...ss...',
    '..s..s..',
    '.svvvvs.',
    'svwvvvvs',
    'svvvvvvs',
    'svvvvvvs',
    '.ssssss.',
  ],
  fish: [
    '........',
    '....bb..',
    '.b.bbbb.',
    'bbbbbwkb',
    'bbbbbbbb',
    '.b.bbbb.',
    '....bb..',
    '........',
  ],
  cat: [
    'o......o',
    'oo....oo',
    'oooooooo',
    'okooooko',
    'oooooooo',
    'ooopoooo',
    '.oooooo.',
    '..o..o..',
  ],
  sun: [
    'y..y..y.',
    '.y.y.y..',
    '..yyy...',
    'yyyoyyy.',
    '..yyy...',
    '.y.y.y..',
    'y..y..y.',
    '........',
  ],
  moon: [
    '..cccc..',
    '.cc.....',
    'cc......',
    'cc......',
    'cc......',
    'cc......',
    '.cc.....',
    '..cccc..',
  ],
  gem: [
    '........',
    '.cccccc.',
    'cwcccccc',
    'cccccccc',
    '.cccccc.',
    '..cccc..',
    '...cc...',
    '........',
  ],
  flower: [
    '..pp....',
    '.pyyp...',
    '..pp....',
    '...G....',
    '.G.G....',
    '..GG..G.',
    '...G.G..',
    '...GG...',
  ],
  mushroom: [
    '..rrrr..',
    '.rwrrwr.',
    'rrrrrrrr',
    'rwrrrrwr',
    '..wwww..',
    '..wkwk..',
    '..wwww..',
    '........',
  ],
  sword: [
    '.......s',
    '......ss',
    '.....ss.',
    '....ss..',
    'n..ss...',
    '.nss....',
    '.yn.....',
    'y..n....',
  ],
  leaf: [
    '......g.',
    '....ggg.',
    '...gggg.',
    '..ggGgg.',
    '.ggGgg..',
    '.gGgg...',
    '.Gg.....',
    'G.......',
  ],
  drop: [
    '...b....',
    '...b....',
    '..bbb...',
    '..bbb...',
    '.bbwbb..',
    '.bwbbb..',
    '.bbbbb..',
    '..bbb...',
  ],
  crown: [
    '........',
    'y..y..y.',
    'yy.y.yy.',
    'yyyyyyy.',
    'yryybyy.',
    'yyyyyyy.',
    'YYYYYYY.',
    '........',
  ],
  skull: [
    '..ssss..',
    '.ssssss.',
    'ssssssss',
    'skksskks',
    'ssssssss',
    '.sssSss.',
    '..s.s.s.',
    '........',
  ],
};
export const SPRITE_NAMES = Object.keys(SPRITES);

const cache = new Map();
/** The SVG markup of a picture (cached): one rect per run of pixels of the same colour in a row. */
export function spriteSvg(name) {
  if (cache.has(name)) return cache.get(name);
  const rows = SPRITES[name] || [];
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== '.' && PALETTE[ch]) rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${PALETTE[ch]}"/>`;
      x += w;
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 9 9" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  cache.set(name, svg);
  return svg;
}
