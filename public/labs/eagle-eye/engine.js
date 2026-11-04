/**
 * Ojo de lince — the rules (lab prototype, no DOM). An endless memory game: each round a few
 * pixel-art pictures show on a covered board, they hide again, the board is turned around (rotated,
 * mirrored, rows or tiles swapped) and the player taps where each picture ended up. Every round is a
 * little harder (a bigger board, more pictures, pairs, decoys, more moves) until the lives run out.
 * Everything comes from a seed, so the same seed plays the same game. See docs/games/eagle-eye.md.
 */
import { SPRITE_NAMES } from './sprites.js';

export const LIVES = 3;
/** Rounds cleared in a row without a miss that give a lost life back. */
export const LIFE_EVERY = 5;
export const MAX_SIZE = 5;

/* ------------------------------------------------------------------ */
/* The seed                                                            */
/* ------------------------------------------------------------------ */

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** A seeded random in [0, 1) (mulberry32). */
export function rng(seed) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];
function shuffle(r, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ------------------------------------------------------------------ */
/* What each level asks                                                */
/* ------------------------------------------------------------------ */

/**
 * The difficulty of level `n` (1, 2, 3…, endless): the board's side, how many pictures to find (or
 * pairs), the decoys shown but never asked, the moves made to the board and the moves allowed, and
 * how long the pictures stay up.
 */
export function level(n) {
  const size = n <= 3 ? 3 : n <= 7 ? 4 : MAX_SIZE;
  const pairs = n >= 4 && n % 3 === 1;
  const ask = pairs ? Math.min(4, 2 + Math.floor((n - 4) / 6)) : Math.min(6, 2 + Math.floor((n - 1) / 2));
  const decoys = n >= 6 ? Math.min(3, Math.floor((n - 3) / 3)) : 0;
  const moves = n < 3 ? 0 : n < 6 ? 1 : n < 11 ? 2 : n < 16 ? 3 : 4;
  const kinds = ['rotate'];
  if (n >= 4) kinds.push('swap');
  if (n >= 5) kinds.push('flip');
  if (n >= 8) kinds.push('rows');
  const shown = ask * (pairs ? 2 : 1) + decoys;
  // Quick (the owner's request): a bit of time per picture, and less each level, down to a floor
  const showMs = Math.round((900 + 300 * shown) * Math.max(0.6, 1 - 0.03 * (n - 1)));
  return { size, pairs, ask, decoys, moves, kinds, showMs };
}

/* ------------------------------------------------------------------ */
/* The moves                                                           */
/* ------------------------------------------------------------------ */

/**
 * Where the tile at index `i` of a `size`×`size` board goes after a move:
 * - `{ type: 'rotate', turns }`: a quarter turn clockwise per turn (−1 is counter-clockwise);
 * - `{ type: 'flip', axis: 'h' | 'v' }`: a mirror, left–right or top–bottom;
 * - `{ type: 'rows' | 'cols', a, b }`: two rows (or columns) trade places;
 * - `{ type: 'swap', a, b }`: two tiles trade places.
 */
export function move(size, i, m) {
  let r = Math.floor(i / size), c = i % size;
  const last = size - 1;
  switch (m.type) {
    case 'rotate': {
      const t = ((m.turns % 4) + 4) % 4;
      for (let k = 0; k < t; k++) [r, c] = [c, last - r];
      break;
    }
    case 'flip': if (m.axis === 'h') c = last - c; else r = last - r; break;
    case 'rows': if (r === m.a) r = m.b; else if (r === m.b) r = m.a; break;
    case 'cols': if (c === m.a) c = m.b; else if (c === m.b) c = m.a; break;
    case 'swap': return i === m.a ? m.b : i === m.b ? m.a : i;
    default: break;
  }
  return r * size + c;
}
/** A whole board (index → picture or null) after a move. */
export function moveBoard(size, cells, m) {
  const out = new Array(cells.length).fill(null);
  cells.forEach((v, i) => { out[move(size, i, m)] = v; });
  return out;
}

/** A move of the allowed kinds that changes where at least one picture is (so it is never wasted). */
function randomMove(r, size, cells, kinds) {
  const full = cells.map((v, i) => (v === null ? -1 : i)).filter(i => i >= 0);
  for (let tries = 0; tries < 40; tries++) {
    const kind = pick(r, kinds);
    let m;
    if (kind === 'rotate') m = { type: 'rotate', turns: pick(r, [1, -1, 1, -1, 2]) };
    else if (kind === 'flip') m = { type: 'flip', axis: pick(r, ['h', 'v']) };
    else if (kind === 'rows') {
      const type = pick(r, ['rows', 'cols']);
      const line = i => (type === 'rows' ? Math.floor(i / size) : i % size);
      const a = line(pick(r, full));
      let b = Math.floor(r() * (size - 1)); if (b >= a) b++;
      m = { type, a: Math.min(a, b), b: Math.max(a, b) };
    } else {
      // A picture trades places with another tile (empty or not): the shell game
      const a = pick(r, full);
      let b = Math.floor(r() * (size * size - 1)); if (b >= a) b++;
      m = { type: 'swap', a: Math.min(a, b), b: Math.max(a, b) };
    }
    const after = moveBoard(size, cells, m);
    if (after.some((v, i) => v !== cells[i])) return m;
  }
  return { type: 'rotate', turns: 1 };
}

/* ------------------------------------------------------------------ */
/* A round                                                             */
/* ------------------------------------------------------------------ */

/**
 * The round of level `n` for a seed: `start` is the board as it is shown (index → picture name or
 * null), `moves` what is done to it once covered, `end` the board after them, and `ask` the pictures
 * to find in the order they are asked, each with the tiles where it ended up (two for a pair).
 */
export function makeRound(seed, n) {
  const L = level(n);
  const r = rng(`${seed}|${n}`);
  const cellsN = L.size * L.size;
  const names = shuffle(r, SPRITE_NAMES);
  const asked = names.slice(0, L.ask);
  const decoys = names.slice(L.ask, L.ask + L.decoys);
  const pieces = [...asked.flatMap(s => (L.pairs ? [s, s] : [s])), ...decoys];
  const spots = shuffle(r, [...Array(cellsN).keys()]).slice(0, pieces.length);
  const start = new Array(cellsN).fill(null);
  pieces.forEach((s, k) => { start[spots[k]] = s; });
  const moves = [];
  let end = start, before = null;
  const same = (a, b) => a.every((v, i) => v === b[i]);
  for (let k = 0; k < L.moves; k++) {
    // Never a move that undoes the one before (a turn and its opposite, the same mirror twice)
    let m, after;
    for (let tries = 0; tries < 12; tries++) {
      m = randomMove(r, L.size, end, L.kinds);
      after = moveBoard(L.size, end, m);
      if (!before || !same(after, before)) break;
    }
    moves.push(m);
    before = end; end = after;
  }
  const ask = shuffle(r, asked).map(sprite => ({ sprite, cells: end.flatMap((v, i) => (v === sprite ? [i] : [])) }));
  return { level: n, ...L, start, moves, end, ask };
}

/* ------------------------------------------------------------------ */
/* Playing a round                                                     */
/* ------------------------------------------------------------------ */

/** The player's progress in a round: which picture is asked now and the tiles already found. */
export const newPlay = round => ({ round, current: 0, found: [] });

/**
 * A tap on tile `i`: `'again'` (already found, nothing happens), `'hit'` (one of a pair found, the
 * other is still missing), `'next'` (that picture is done, the next one is asked), `'clear'` (the
 * round is done) or `'miss'`.
 */
export function tap(play, i) {
  if (play.found.includes(i)) return 'again';
  const item = play.round.ask[play.current];
  if (!item || !item.cells.includes(i)) return 'miss';
  play.found.push(i);
  if (!item.cells.every(c => play.found.includes(c))) return 'hit';
  play.current++;
  return play.current >= play.round.ask.length ? 'clear' : 'next';
}

/* ------------------------------------------------------------------ */
/* A game                                                              */
/* ------------------------------------------------------------------ */

/** A new game: level 1, every life, nothing cleared yet. */
export const newGame = seed => ({ seed, level: 1, lives: LIVES, score: 0, streak: 0, tries: 0, found: 0, misses: 0 });

/** The round the game is on now: a miss replays the level with another board (`tries`). */
export const currentRound = g => makeRound(`${g.seed}|${g.tries}`, g.level);

/**
 * The end of a round. Cleared: one more point, the next level and, every LIFE_EVERY in a row, a lost
 * life back (`life: true`). Missed: one life less, the same level again. `over` once no life is left.
 */
export function endRound(g, cleared) {
  g.tries++;
  let life = false;
  if (cleared) {
    g.score++; g.level++; g.streak++;
    if (g.streak % LIFE_EVERY === 0 && g.lives < LIVES) { g.lives++; life = true; }
  } else {
    g.lives--; g.misses++; g.streak = 0;
  }
  return { life, over: g.lives <= 0 };
}
