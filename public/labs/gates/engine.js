/**
 * Compuertas — the engine (lab prototype). Balls drop one by one from a funnel at the top into a
 * triangle of paddles, like a Galton board: row r has r + 1 paddles, and each one leans left or
 * right. A ball that reaches a paddle rolls off the side it leans to, onto one of the two paddles
 * below; after the last row it falls into one of the ROWS + 1 bins. Every bin can be reached from the
 * funnel. The player taps a paddle to flip it.
 *
 * The bins' values are shuffled every PERIOD (the 10 always moves), so the routes have to change as
 * the game goes. Most balls score the value of their bin; a ⭐ gold ball scores triple; a 💣 bomb must
 * go into the 🗑️ bin, where it is defused, and anywhere else it blows up and takes points away.
 *
 * Everything depends only on the time (ms of game time since the start) and the seed: the same seed is
 * the same game, and how often the screen asks (60 or 120 Hz) does not change where a ball goes. A
 * flip at moment t counts for every ball that reaches that paddle after t.
 */
import { rng } from '../../assets/js/rng.js';

/** The rows of paddles; the bins are one more. */
export const ROWS = 5;
export const BINS = ROWS + 1;
/** A game lasts a minute; the last ball drops early enough to land before the end. */
export const DURATION = 60000;
/** The bins' values change every PERIOD; WARNING before, the next ones show up. */
export const PERIOD = 10000;
export const WARNING = 2500;
/** The trash bin: worth nothing for a ball, the only safe place for a bomb. */
export const TRASH = 0;
/** One period's bins are these values in some order. */
export const VALUES = [1, 2, 3, 5, 10, TRASH];
export const TOP = Math.max(...VALUES);
/** A gold ball multiplies its bin; a bomb in the trash is worth DEFUSED, anywhere else BLAST. */
export const GOLD = 3;
export const DEFUSED = 5;
export const BLAST = -10;
/** The first ball, the gap between balls (from START_GAP down to END_GAP) and the time a ball takes per row. */
const FIRST = 1200;
const START_GAP = 1700, END_GAP = 750;
const START_STEP = 520, END_STEP = 320;
/** Bombs start after the first seconds; how often bombs and gold balls come. */
const BOMBS_FROM = 6000, BOMB_CHANCE = 0.16, GOLD_CHANCE = 0.1;

export const KINDS = ['ball', 'gold', 'bomb'];

/** A seed (any text) to a 32-bit number, so `?seed=` can be a word. */
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
const lerp = (a, b, f) => a + (b - a) * Math.min(1, Math.max(0, f));

/** A shuffle of VALUES whose 10 and 🗑️ are not where they were in `prev`. */
function shuffled(rand, prev) {
  for (;;) {
    const v = [...VALUES];
    for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
    if (!prev || (v.indexOf(TOP) !== prev.indexOf(TOP) && v.indexOf(TRASH) !== prev.indexOf(TRASH))) return v;
  }
}

/** The time one row takes for a ball dropped at t: they fall faster as the game goes. */
export const stepAt = t => Math.round(lerp(START_STEP, END_STEP, t / DURATION));
/** When the ball dropped at t lands. */
export const landsAt = t => t + (ROWS + 1) * stepAt(t);

/**
 * A new game from a seed: the paddles' first positions, every period's bins and every ball (when it
 * drops, its kind and its speed). Nothing random is left for later.
 */
export function newGame(seed = 'x') {
  const rand = rng(hash(String(seed)));
  const gates = Array.from({ length: ROWS }, (_, r) => Array.from({ length: r + 1 }, () => (rand() < 0.5 ? -1 : 1)));
  const periods = [];
  for (let k = 0; k * PERIOD < DURATION; k++) periods.push(shuffled(rand, periods[k - 1]));
  const drops = [];
  for (let t = FIRST; landsAt(t) <= DURATION - 300;) {
    const kind = t >= BOMBS_FROM && rand() < BOMB_CHANCE && drops.at(-1)?.kind !== 'bomb' ? 'bomb' : rand() < GOLD_CHANCE ? 'gold' : 'ball';
    drops.push({ id: drops.length, kind, t0: t, step: stepAt(t) });
    t += Math.round(lerp(START_GAP, END_GAP, t / DURATION) * (0.85 + 0.3 * rand()));
  }
  return {
    seed: String(seed), gates, periods, drops,
    next: 0,          // the next drop to come out of the funnel
    balls: [],        // in the air: { id, kind, t0, step, path }; path[r] is its paddle in row r, path[ROWS] its bin
    done: [],         // landed: { id, kind, bin, value, points, t }
    events: [],       // what happened since the screen last asked (takeEvents)
    t: 0, score: 0, flips: 0,
  };
}

/** The bins at moment t: a period's values, left to right. */
export const binsAt = (g, t) => g.periods[Math.min(g.periods.length - 1, Math.max(0, Math.floor(t / PERIOD)))];
/** The next bins, if they change within WARNING of t (null otherwise). */
export function nextBins(g, t) {
  const k = Math.floor(t / PERIOD) + 1;
  return k < g.periods.length && k * PERIOD - t <= WARNING ? g.periods[k] : null;
}

/** What a ball of `kind` scores in a bin worth `value`. */
export function pointsFor(kind, value) {
  if (kind === 'bomb') return value === TRASH ? DEFUSED : BLAST;
  return value * (kind === 'gold' ? GOLD : 1);
}
/** The best a ball of `kind` can do. */
export const bestFor = kind => (kind === 'bomb' ? DEFUSED : TOP * (kind === 'gold' ? GOLD : 1));
/** The best a whole game can do: every ball in its best bin. */
export const best = g => g.drops.reduce((s, d) => s + bestFor(d.kind), 0);

/** The time of a ball's next event: reaching paddle row path.length − 1, or landing (the same formula). */
const nextAt = b => b.t0 + b.path.length * b.step;

/**
 * Plays the game up to moment t, in order: balls come out of the funnel, roll off the paddles they
 * reach (as the paddles are at that moment) and land. What happened goes to g.events.
 */
export function advance(g, t) {
  for (;;) {
    const d = g.drops[g.next];
    let when = d ? d.t0 : Infinity, ball = null;
    for (const b of g.balls) { const n = nextAt(b); if (n < when) { when = n; ball = b; } }
    if (when > t) break;
    g.t = Math.max(g.t, when);
    if (!ball) {
      g.balls.push({ ...d, path: [0] });
      g.next++;
      g.events.push({ type: 'drop', id: d.id, kind: d.kind, t: when });
    } else if (ball.path.length <= ROWS) {
      const r = ball.path.length - 1, i = ball.path[r];
      ball.path.push(i + (g.gates[r][i] > 0 ? 1 : 0));
      g.events.push({ type: 'bounce', id: ball.id, r, i, t: when });
    } else land(g, ball, when);
  }
  g.t = Math.max(g.t, t);
}

function land(g, ball, t) {
  const bin = ball.path[ROWS], value = binsAt(g, t)[bin], points = pointsFor(ball.kind, value);
  g.score = Math.max(0, g.score + points);
  g.balls.splice(g.balls.indexOf(ball), 1);
  const done = { id: ball.id, kind: ball.kind, bin, value, points, t };
  g.done.push(done);
  g.events.push({ type: 'land', ...done });
}

/** Hands over what happened since the last call (the screen animates it) and forgets it. */
export function takeEvents(g) { const e = g.events; g.events = []; return e; }

/**
 * Flips paddle i of row r at moment t. A tap that arrives late (its moment is before the last frame)
 * counts from now: a ball that already rolled off keeps its way.
 */
export function flip(g, r, i, t) {
  if (!g.gates[r] || g.gates[r][i] === undefined) return false;
  advance(g, Math.max(t, g.t));
  g.gates[r][i] = -g.gates[r][i];
  g.flips++;
  return true;
}

/** Where a ball at paddle i of row r ends up with the paddles as they are now: its bin. */
export function routeFrom(g, r, i) {
  for (; r < ROWS; r++) i += g.gates[r][i] > 0 ? 1 : 0;
  return i;
}
/** The paddles a route goes through from (r, i): [[r, i], …], and its bin last. */
export function routePath(g, r = 0, i = 0) {
  const out = [];
  for (; r < ROWS; r++) { out.push([r, i]); i += g.gates[r][i] > 0 ? 1 : 0; }
  return { paddles: out, bin: i };
}
/** Where a ball in the air is going: its last known paddle followed down with today's paddles. */
export const headedTo = (g, b) => routeFrom(g, b.path.length - 1, b.path.at(-1));

/**
 * The way to lean paddle (r, i) so that a ball on it can still reach bin `target` (−1 left, +1 right):
 * the bins under (r, i) are i … i + ROWS − r. It leans toward the middle of what is left.
 */
export function steer(r, i, target) {
  const left = ROWS - r - 1;           // rows below this one
  const k = target - i;                // how far right the target is, 0 … left + 1
  if (k <= 0) return -1;
  if (k > left) return 1;
  return k * 2 > left + 1 ? 1 : k * 2 < left + 1 ? -1 : 1;
}

/** The bin a ball of `kind` should go to at moment t (the 10's, or the 🗑️ for a bomb). */
export const targetFor = (g, kind, t) => binsAt(g, t).indexOf(kind === 'bomb' ? TRASH : TOP);

/**
 * A player that never misses a paddle in time (the cover's demo and the tests): for each ball in the
 * air, the next paddle it reaches is leaned toward the best bin at its landing, unless a ball that
 * reaches it sooner still needs it the other way.
 */
export function autoplay(g, t) {
  advance(g, t);
  const wants = new Map();
  for (const b of [...g.balls].sort((a, c) => nextAt(a) - nextAt(c))) {
    const r = b.path.length - 1;
    if (r >= ROWS) continue;
    const i = b.path[r], key = `${r},${i}`;
    if (wants.has(key)) continue;
    const dir = steer(r, i, targetFor(g, b.kind, b.t0 + (ROWS + 1) * b.step));
    wants.set(key, dir);
    if (g.gates[r][i] !== dir) flip(g, r, i, t);
  }
}

/** A ball's place at moment t, in board units: x 0 at the funnel, a paddle every 1 sideways; y the row (−1 the funnel, ROWS the bins). */
export function ballAt(b, t) {
  const f = Math.max(0, (t - b.t0) / b.step);
  const k = Math.min(ROWS, Math.floor(f)), u = Math.min(1, f - k);
  const at = r => (r < 0 ? { x: 0, y: -1 } : { x: b.path[Math.min(r, b.path.length - 1)] - r / 2, y: r });
  const a = at(k - 1), z = at(k);
  return { x: a.x + (z.x - a.x) * u, y: a.y + (z.y - a.y) * u, u, k };
}
/** Paddle (r, i), or bin i when r is ROWS, in board units. */
export const nodeAt = (r, i) => ({ x: i - r / 2, y: r });

/** Over: the minute is up and every ball has landed. */
export const isOver = g => g.t >= DURATION && !g.balls.length && g.next >= g.drops.length;

/** The share card: one mark per ball, in rows of 10. */
export function card(g) {
  const mark = d => (d.kind === 'bomb' ? (d.value === TRASH ? '🧯' : '💥') : d.value === TOP ? '🟩' : d.value >= 3 ? '🟨' : d.value > TRASH ? '🟧' : '⬛');
  const marks = g.done.map(mark);
  const rows = [];
  for (let i = 0; i < marks.length; i += 10) rows.push(marks.slice(i, i + 10).join(''));
  return rows.join('\n');
}

/** The tally for the result: balls in the 10, gold balls in the 10, bombs defused and blown. */
export function tally(g) {
  const t = { balls: g.done.length, top: 0, gold: 0, goldTop: 0, bombs: 0, defused: 0 };
  for (const d of g.done) {
    if (d.kind === 'bomb') { t.bombs++; if (d.value === TRASH) t.defused++; continue; }
    if (d.kind === 'gold') t.gold++;
    if (d.value === TOP) { t.top++; if (d.kind === 'gold') t.goldTop++; }
  }
  return t;
}
