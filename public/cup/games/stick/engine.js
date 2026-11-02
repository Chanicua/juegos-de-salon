/**
 * 🥷 Shinobi (id `stick`) — its engine in La Copa, Uno al día and its own page, moved over from the lab
 * (D-446): hold to stretch a stick, let go and it falls across the gap; land it on the next pillar and the
 * ninja runs over. Pure functions, no DOM.
 *
 * Fair on every phone: the stick's length depends only on how long the finger was held (the press's and
 * the release's own timestamps), and where the running ninja is depends only on the time since the stick
 * fell, never on how many frames were drawn.
 *
 * Fair between players: the course (the pillars, the gaps, the slides) comes from a seed, and `generarDia`
 * makes it from the cup's code and day (D-97), so everyone who plays that day crosses the same gaps.
 *
 * Units: the screen is VIEW wide; x grows to the right and a pillar is { x, w, move? }: its left edge,
 * its width, and how it slides, if it is a moving one (from MOVE_FROM on).
 *
 * A moving pillar slides back and forth while it is the one to reach; where it is depends only on the
 * time since the ninja stepped on the pillar before (`g.moveT0`). The stick is judged where the pillar is
 * when the stick lands, TURN_MS after the release, and the pillar stops right there.
 */
import { rng } from '../../../assets/js/rng.js';
import { hash32 } from '../semilla.js';

export const VIEW = 360;              // the screen's width, in world units
export const HOLD_X = 92;             // where the current pillar's right edge sits on the screen
export const GROW = 330;              // the stick grows this many units a second while held…
export const MAX_STICK = 460;         // …up to this
export const PERFECT = 4.5;           // a tip this close to the next pillar's center is perfect (the flag)
export const MAX_BONUS = 5;           // a perfect is worth +1, +2… for each one in a row, up to this
export const TURN_MS = 320;           // the stick takes this long to fall across
export const RUN = 310;               // the ninja runs this many units a second
export const NINJA = 18;              // the ninja's width
export const FIRST = { x: 0, w: 84 }; // the starting pillar
export const MIN_GAP = 26;            // a moving pillar never comes closer than this
export const MOVE_FROM = 10;          // the first pillar that may move…
export const MOVE_FULL = 60;          // …and from here on they move their widest and fastest
export const PERIOD_SLOW = 4400;      // ms for a whole swing, on the first moving pillars…
export const PERIOD_FAST = 1900;      // …down to this
export const LIVES = 3;               // a fall costs one; the run ends with the last

const half = NINJA / 2;
const right = p => p.x + p.w;

/** A new game on the course of `seed`, with `lives` lives (the trial plays with one). */
export function newGame(seed = 1, t0 = 0, lives = LIVES) {
  return {
    seed, rand: rng(seed), pillars: [{ ...FIRST }], i: 0, moveT0: t0,
    lives, score: 0, bridges: 0, perfects: 0, bonus: 0, streak: 0, bestStreak: 0,
    phase: 'ready',        // ready → growing → walking → ready…, or lost → ready (a life gone), or over; 'held' when paused mid-hold
    hold: null, held: 0, stick: 0, walk: null, kinds: [],
  };
}

/** How hard pillar `k` is: 0 at the start, 1 from the 40th on. */
const hardness = k => Math.min(1, k / 40);
/** How much the moving pillars move at pillar `k`: 0 before MOVE_FROM, 1 from MOVE_FULL on. */
export const motion = k => Math.max(0, Math.min(1, (k - MOVE_FROM) / (MOVE_FULL - MOVE_FROM)));

/** Pillar `k` of the course, made the first time it is asked for: always in the same order, so a seed is a course. */
export function pillar(g, k) {
  while (g.pillars.length <= k) {
    const n = g.pillars.length, prev = g.pillars[n - 1], d = hardness(n), r = g.rand;
    // From wide to narrow: at the hardest, between 10 and 24 units (the flag's strip is 9)
    const w = Math.round(10 + (1 - d) * 36 + r() * (14 + (1 - d) * 18));
    // The whole next pillar always fits on the screen, with a little room to spare
    const room = VIEW - HOLD_X - 14 - w;
    let gap = Math.round(Math.min(room, 34 + r() * (110 + d * 120)));
    // From MOVE_FROM on, some pillars slide: more of them, farther and faster as the run goes on.
    // A moving one keeps its whole swing on the screen and never comes closer than MIN_GAP
    const m = motion(n), mueve = r(), fase = r(), donde = r();
    let move = null;
    if (n >= MOVE_FROM && mueve < 0.3 + 0.35 * m) {
      const amp = Math.round(Math.min(18 + 42 * m, (room - MIN_GAP) / 2));
      if (amp >= 12) {
        gap = Math.round(MIN_GAP + amp + donde * (room - MIN_GAP - 2 * amp));
        move = { amp, period: Math.round(PERIOD_SLOW - (PERIOD_SLOW - PERIOD_FAST) * m), phase: fase * Math.PI * 2 };
      }
    }
    const p = { x: right(prev) + gap, w };
    if (move) p.move = move;
    g.pillars.push(p);
  }
  return g.pillars[k];
}

/** The pillar the ninja stands on, and the one to reach. */
export const current = g => pillar(g, g.i);
export const next = g => pillar(g, g.i + 1);

/**
 * Pillar `k` as it is at moment `t`: a moving one, while it is the one to reach, slides around its
 * place; once the stick landed on it (or a pillar not yet in play), it stands still.
 */
export function pillarAt(g, k, t) {
  const p = pillar(g, k);
  if (!p.move || k !== g.i + 1) return p;
  if (p.stopAt != null && t >= p.stopAt) return { ...p, x: p.landX };
  return { ...p, x: p.x + slide(p, t - g.moveT0) };
}
/** How far a moving pillar is from its place, `ms` after it became the one to reach. */
const slide = (p, ms) => Math.round(p.move.amp * Math.sin(p.move.phase + (Math.max(0, ms) / p.move.period) * Math.PI * 2) * 100) / 100;

/** Where the ninja's center stands, at rest, on pillar `p`: at its right edge. */
export const restX = p => right(p) - half - 1;

/** The stick's length at moment `t` (ms): it grows while held, and stays as it was once let go. */
export function stickAt(g, t) {
  if (g.phase === 'growing') return Math.min(MAX_STICK, g.held + Math.max(0, t - g.hold) * GROW / 1000);
  return g.phase === 'held' ? g.held : g.stick;
}

/** A finger down at `t`: the stick starts growing (or goes on growing, after a pause in the middle of a hold). */
export function press(g, t) {
  if (g.phase !== 'ready' && g.phase !== 'held') return false;
  if (g.phase === 'ready') g.held = 0;
  g.phase = 'growing'; g.hold = t;
  return true;
}

/** The page was hidden in the middle of a hold: the stick stops where it was, and a new press goes on from there. */
export function suspend(g, t) {
  if (g.phase !== 'growing') return;
  g.held = stickAt(g, t); g.phase = 'held';
}

/**
 * The finger up at `t`: the stick falls. Returns what will happen when it lands:
 * - `perfect`: its tip lands within PERFECT of the next pillar's center (on its flag);
 * - `land`: on the next pillar;
 * - `short`: in the gap: nothing holds its tip, so it swings on down into the gap; the ninja runs to the
 *   pillar's edge and falls after it;
 * - `long`: past the pillar: the ninja runs to the tip and falls.
 * The ninja starts running when the stick is down (TURN_MS later).
 */
export function release(g, t) {
  if (g.phase !== 'growing') return null;
  const len = stickAt(g, t), cur = current(g), tip = right(cur) + len;
  // A moving pillar is judged where it is when the stick lands, and stops there if the stick is on it; a
  // miss leaves it sliding on, so after the climb back it is where it would be, with no jump
  const nx = pillarAt(g, g.i + 1, t + TURN_MS), real = next(g);
  const center = nx.x + nx.w / 2;
  const kind = tip < nx.x ? 'short' : tip > right(nx) ? 'long' : Math.abs(tip - center) <= PERFECT ? 'perfect' : 'land';
  const ok = kind === 'perfect' || kind === 'land';
  if (real.move && ok) { real.stopAt = t + TURN_MS; real.landX = nx.x; }
  g.stick = len; g.phase = 'walking';
  g.walk = {
    t0: t + TURN_MS, from: restX(cur), to: ok ? restX(nx) : kind === 'short' ? right(cur) : tip, kind, tip, ok, done: false,
  };
  return { kind, len, tip, offset: tip - center };
}

/** The x of the running ninja's center at `t`. */
export function runX(w, t) {
  return w.from + Math.min(w.to - w.from, Math.max(0, (t - w.t0) / 1000 * RUN));
}
/** When the running ninja's center reaches `x`. */
const timeAt = (w, x) => w.t0 + (x - w.from) / RUN * 1000;
/**
 * Moves the game on to moment `t` and says what happened, once the ninja is done running: `{ type: 'fall',
 * kind }` (the stick missed: it ran to the tip and fell) or `{ type: 'arrive', kind, gain, bonus, streak,
 * moving }` (it is on the next pillar: a point, and a perfect's bonus). Everything follows from the
 * release's timestamp, so it does not matter how often it is called.
 */
export function advance(g, t) {
  const w = g.walk, out = [];
  if (g.phase !== 'walking' || !w || w.done) return out;
  if (t < timeAt(w, w.to)) return out;
  w.done = true;
  if (!w.ok) {
    g.lives--; g.streak = 0; g.kinds.push('fall');
    g.phase = g.lives > 0 ? 'lost' : 'over';
    out.push({ type: 'fall', kind: w.kind, lives: g.lives, over: g.lives === 0 });
    return out;
  }
  g.i++; g.bridges++;
  // The pillars after a moving one move with where it stopped, so the gaps stay as they were made
  const now = g.pillars[g.i], delta = now.move ? now.landX - now.x : 0;
  now.x += delta;
  if (delta) for (let k = g.i + 1; k < g.pillars.length; k++) g.pillars[k].x += delta;
  g.moveT0 = timeAt(w, w.to);
  let bonus = 0;
  if (w.kind === 'perfect') { g.streak++; g.perfects++; bonus = Math.min(g.streak, MAX_BONUS); g.bonus += bonus; } else g.streak = 0;
  g.bestStreak = Math.max(g.bestStreak, g.streak);
  g.score += 1 + bonus;
  g.kinds.push(w.kind);
  g.phase = 'ready'; g.stick = 0; g.held = 0;
  out.push({ type: 'arrive', kind: w.kind, gain: 1 + bonus, bonus, streak: g.streak, moving: !!g.pillars[g.i].move });
  return out;
}

/**
 * After a fall that left lives, the ninja is back on the same pillar at `t`: a new stick and the streak
 * gone. A moving pillar never stopped (a miss does not stop it), so it goes on sliding from where it is.
 */
export function revive(g, t) {
  if (g.phase !== 'lost') return false;
  g.phase = 'ready'; g.stick = 0; g.held = 0; g.walk = null;
  return true;
}

/** When the ninja is done with this walk (it arrived or fell): for the page's animation. */
export function walkEnd(g) {
  const w = g.walk;
  return w ? timeAt(w, w.to) : 0;
}

/**
 * A pause of `ms`: a moving pillar's clock, and while the ninja runs its clock, move forward by that
 * much, so everything comes back where it was.
 */
export function pause(g, ms) {
  if (ms <= 0 || g.phase === 'over') return;
  g.moveT0 += ms;
  const w = g.walk;
  if (g.phase !== 'walking' || !w) return;
  w.t0 += ms;
}

/**
 * How long to hold, from a press at `t`, for a stick whose tip lands `offset` from the next pillar's center
 * (the demo and the end-to-end script). For a moving pillar, where it will be when the stick lands.
 */
export function holdFor(g, offset = 0, t = 0) {
  // What was already stretched before a pause counts (held, or growing again from there)
  const cur = current(g), base = g.phase === 'held' || g.phase === 'growing' ? g.held : 0;
  let h = 0;
  for (let k = 0; k < 30; k++) {
    const nx = pillarAt(g, g.i + 1, t + h + TURN_MS);
    h = Math.max(0, (nx.x + nx.w / 2 + offset - right(cur) - base) / GROW * 1000);
  }
  return h;
}

/** The share card's line: each bridge a 🎯 perfect or a 🟩, then how it ended; the last 20, ten to a line. */
export function card(kinds) {
  const last = kinds.slice(-20).map(k => ({ perfect: '🎯', land: '🟩', fall: '🕳️' }[k] || '🟩'));
  const rows = [];
  for (let i = 0; i < last.length; i += 10) rows.push(last.slice(i, i + 10).join(''));
  return rows.join('\n');
}

/** The trial (D-103) plays with a single life: the first fall ends it. */
export const LIVES_ENSAYO = 1;

/**
 * The day's course (D-331): the seed of `código:día` (and `:sal`, the trial's), the same on every phone,
 * and the lives. The course itself is endless and made from the seed as the run goes (`pillar`), so this
 * is all there is to generate. The trial is another course (another code and salt) with one life.
 */
export function generarDia(codigo, dia, { sal = '', ensayo = false } = {}) {
  return { semilla: hash32(`${codigo}:${dia}${sal ? `:${sal}` : ''}`), vidas: ensayo ? LIVES_ENSAYO : LIVES };
}

/**
 * A run's score: the game's own points (a bridge is 1, a flag adds its streak bonus, +1 up to +5), with
 * no cap (the owner's rule, 2026-11-01, replacing D-517's cap at 100). La Copa ranks a day by position
 * (D-95); where a 0–100 is averaged (the Grand Final, Uno al día) the cup caps it.
 */
export const puntaje = e => Math.max(0, Math.round(Number(e?.score) || 0));

/** The share card of a finished run (its saved state): the last bridges, as `card` draws them. */
export const tarjeta = e => card(Array.isArray(e?.kinds) ? e.kinds : []);

/**
 * Uno al día's score, 0 to 100 (D-526): a soft curve over the points, `100 × (1 − e^(−points/K))`,
 * so the best keep standing apart (50 → 46, 100 → 71, 200 → 92) instead of all tying at 100.
 */
export const DIA_K = 80;
export const puntajeDia = s => Math.max(0, Math.min(100, Math.round(100 * (1 - Math.exp(-(Number(s) || 0) / DIA_K)))));
