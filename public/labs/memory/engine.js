/**
 * Memorice — the rules (lab prototype, no DOM). An endless memory game: each round some
 * pixel-art pictures show on a covered board, some of them repeated (a pair, a trio), they hide
 * again, and the player taps every copy of the one picture asked for before the time runs out. The
 * board grows up to 6×6, more pictures show and there is less time to look and to answer, until the
 * lives run out. Everything comes from a seed, so the same seed plays the same game.
 * See docs/games/memory.md.
 */
import { SPRITE_NAMES } from './sprites.js';

export const LIVES = 3;
/** Rounds cleared in a row without a miss that give a lost life back. */
export const LIFE_EVERY = 5;
export const MAX_SIZE = 6;

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
 * The first levels are the same for everyone and teach the game (the owner's request): the groups on
 * the board, how many copies of each picture, and the first one is the one asked.
 */
export const INTRO = [
  [1, 1],        // 3×3: two pictures, find one
  [2, 2],        // 3×3: two pairs, find one pair
  [1, 1, 1],     // 4×4: three pictures
  [2, 2, 1],     // 4×4: two pairs and one picture, find a pair
];
/** The tiles with a picture, at most, as a share of the board. */
const FILL = 0.5;

/** The board's side for level `n`: it grows fast, 3×3 → 6×6. */
export const sizeOf = n => (n <= 2 ? 3 : n <= 5 ? 4 : n <= 8 ? 5 : MAX_SIZE);

/**
 * How long the pictures stay up in level `n` (the owner's request): 4.5 s in the first two levels,
 * 4 s in the third and down evenly to 2 s at level 20, to 1.5 s at level 25, and then 50 ms less each
 * level down to 0.8 s, so that sooner or later nobody can keep up.
 */
export function lookMs(n) {
  if (n <= 2) return 4500;
  if (n <= 20) return Math.round(4000 - 2000 * (n - 3) / 17);
  if (n <= 25) return Math.round(2000 - 100 * (n - 20));
  return Math.max(800, 1500 - 50 * (n - 25));
}

/**
 * The difficulty of level `n` (1, 2, 3…, endless): the board's side, the tiles with a picture, the
 * biggest group (a trio from the 5×5 on), how long the pictures stay up and how long there is to
 * find each copy. After the INTRO the groups are drawn at random, mixed (the owner's request), and
 * every level brings a tile more and a little less time (`lookMs`), down to a floor.
 */
export function level(n) {
  const size = sizeOf(n);
  const intro = INTRO[n - 1] || null;
  const tiles = intro ? intro.reduce((a, b) => a + b, 0) : Math.min(Math.floor(size * size * FILL), 2 + n);
  const maxGroup = size >= 5 ? 3 : 2;
  // The time to answer: shorter every level after the intro, down to 55 %
  const speed = Math.max(0.55, 1 - 0.035 * Math.max(0, n - INTRO.length));
  const showMs = lookMs(n);
  // …but never under 2.5 s per copy (the owner found 1.4 s too short)
  const tapMs = Math.round(Math.max(2500, 4500 * speed));
  return { size, intro, tiles, maxGroup, showMs, tapMs };
}

/* ------------------------------------------------------------------ */
/* A round                                                             */
/* ------------------------------------------------------------------ */

/**
 * The round of level `n` for a seed: `groups` are the pictures on the board with how many copies
 * each, `board` the board (index → picture name or null), `ask` the picture to find with the tiles
 * where its copies are, and `answerMs` the time to find them all.
 */
export function makeRound(seed, n) {
  const L = level(n);
  const r = rng(`${seed}|${n}`);
  let counts, asked = 0;
  if (L.intro) counts = L.intro;
  else {
    // Mixed groups: singles, pairs and (on the big boards) trios, filling the tiles
    const sizes = L.maxGroup === 3 ? [1, 1, 2, 2, 3, 3] : [1, 1, 2, 2];
    counts = [];
    for (let left = L.tiles; left > 0;) {
      const c = pick(r, sizes.filter(x => x <= left));
      counts.push(c); left -= c;
    }
    // What is asked is mixed too: a single, a pair or a trio, whatever the board holds
    const kinds = [...new Set(counts)];
    const want = pick(r, kinds);
    asked = pick(r, counts.map((c, i) => (c === want ? i : -1)).filter(i => i >= 0));
  }
  const names = shuffle(r, SPRITE_NAMES);
  const groups = counts.map((count, i) => ({ sprite: names[i], count }));
  const pieces = groups.flatMap(g => Array(g.count).fill(g.sprite));
  const cellsN = L.size * L.size;
  const spots = shuffle(r, [...Array(cellsN).keys()]).slice(0, pieces.length);
  const board = new Array(cellsN).fill(null);
  pieces.forEach((s, k) => { board[spots[k]] = s; });
  const sprite = groups[asked].sprite;
  const ask = { sprite, cells: board.flatMap((v, i) => (v === sprite ? [i] : [])) };
  return { level: n, ...L, groups, board, ask, answerMs: L.tapMs * ask.cells.length };
}

/* ------------------------------------------------------------------ */
/* Playing a round                                                     */
/* ------------------------------------------------------------------ */

/** The player's progress in a round: the tiles already found. */
export const newPlay = round => ({ round, found: [] });

/**
 * A tap on tile `i`: `'again'` (already found, nothing happens), `'hit'` (one copy found, others are
 * still missing), `'clear'` (every copy found: the round is done) or `'miss'`.
 */
export function tap(play, i) {
  if (play.found.includes(i)) return 'again';
  const { cells } = play.round.ask;
  if (!cells.includes(i)) return 'miss';
  play.found.push(i);
  return cells.every(c => play.found.includes(c)) ? 'clear' : 'hit';
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
 * life back (`life: true`). Missed (a wrong tile or the time ran out): one life less, the same level
 * again. `over` once no life is left.
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
