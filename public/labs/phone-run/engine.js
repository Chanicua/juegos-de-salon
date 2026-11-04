/**
 * Duende — the engine of the lab prototype, inspired by the TV game played over the phone in the
 * nineties (Hugo, ITE, 1990): a gnome runs down a three-lane track, and the phone's keys move him
 * (4 ◀, 6 ▶, 2 jump, 8 duck). Pure functions, no DOM.
 *
 * Fair on every phone: the runner's distance depends only on the time since the stretch started,
 * never on how many frames were drawn; an obstacle is judged at the moment the runner reaches it.
 *
 * The track is cut into stretches of SECTOR meters. Each one is a checkpoint: a hit costs a life and
 * starts the stretch again from its beginning, with the same obstacles (so it can be learned). Each
 * stretch is faster, and brings a new kind of obstacle until all of them are in play.
 */

export const LANES = 3;
export const SECTOR = 200;            // meters in a stretch
export const LIVES = 3;
export const JUMP_MS = 640;           // how long a jump keeps the runner in the air
export const JUMP_H = 1.6;            // and how high, in meters
export const DUCK_MS = 700;           // how long a duck lasts
export const HIT_MS = 1400;           // the stumble before starting the stretch again
export const READY_MS = 900;          // the beat before running, at the start and after a hit
export const LANE_MS = 140;           // how long the runner takes to slide to another lane (drawing only)
export const FIRST = 45;              // meters from a stretch's start to its first obstacle

/** The runner's speed on stretch `s` (0 = the first), in meters a second. */
export const speed = s => Math.min(25, 10 + s * 1.6);

/**
 * The obstacles:
 * - roca: a rock in one lane: jump it or change lane.
 * - tronco: a log across the whole track: jump.
 * - rama: a branch across the track, at head height: duck.
 * - carro: a cart in one lane, too tall to jump: change lane.
 */
export const KINDS = ['roca', 'tronco', 'rama', 'carro'];

/** Which kinds stretch `s` uses: one new kind a stretch, then all of them. */
export const kindsFor = s => KINDS.slice(0, Math.min(KINDS.length, s + 1));

/** Whether an obstacle of `kind` in the runner's lane stops a runner who is in the air / ducking. */
export function hits(kind, { air, duck }) {
  if (kind === 'roca') return !air;
  if (kind === 'tronco') return !air;
  if (kind === 'rama') return !duck;
  return true;   // carro: only another lane saves you
}

/** A small seeded random generator (mulberry32), so a seed always gives the same track. */
export function rng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703);
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stretch `s` of the track for `seed`: its obstacles { z, kind, lanes } and coins { z, lane, id },
 * z in meters from the track's start. The gaps are measured in time, so a fast stretch is not
 * impossible: never less than enough to land a jump or finish a duck and react again.
 */
export function stretch(seed, s) {
  const r = rng(`${seed}:${s}`);
  const v = speed(s), kinds = kindsFor(s);
  const start = s * SECTOR, end = start + SECTOR - 25;
  const obstacles = [], coins = [];
  let z = start + FIRST, lastKind = null, lastLanes = null;
  const minGap = Math.max(0.95, 2.3 - 0.22 * s);    // seconds between obstacles…
  const spread = Math.max(0.5, 1.1 - 0.08 * s);     // …plus up to this much more
  while (z < end) {
    // The newest kind shows up more often in its own stretch, so it is learned there
    let kind = s < KINDS.length && r() < 0.4 ? kinds[kinds.length - 1] : kinds[Math.floor(r() * kinds.length)];
    let lanes;
    if (kind === 'tronco' || kind === 'rama') lanes = [0, 1, 2];
    else {
      const two = s >= 3 && r() < 0.35;
      const a = Math.floor(r() * LANES);
      lanes = two ? [a, (a + 1 + Math.floor(r() * 2)) % LANES].sort() : [a];
      // Two carts back to back that leave no time to cross two lanes: the second one keeps a lane open next to the runner's
      if (kind === 'carro' && lastKind === 'carro' && lanes.length === 2 && lastLanes.length === 2) lanes = [lanes[0]];
    }
    obstacles.push({ z: Math.round(z * 10) / 10, kind, lanes, id: `${s}:${obstacles.length}` });
    lastKind = kind; lastLanes = lanes;
    const gap = (minGap + r() * spread) * v;
    // Coins in the gap, in a lane, when it is long enough
    if (gap > 16 && r() < 0.75) {
      const lane = Math.floor(r() * LANES), n = 3 + Math.floor(r() * 3);
      const from = z + gap / 2 - (n - 1) * 1.5;
      for (let i = 0; i < n; i++) coins.push({ z: Math.round((from + i * 3) * 10) / 10, lane, id: `${s}:${coins.length}` });
    }
    z += gap;
  }
  return { obstacles, coins: coins.filter(c => c.z < end + 10) };
}

/** A new game on `seed`, ready to run at time `t0` (ms). */
export function newGame(seed = 'duende', t0 = 0) {
  const g = {
    seed, s: 0, z: 0, t: t0, lane: 1, laneFrom: 1, laneAt: -1e9, jumpAt: -1e9, duckAt: -1e9,
    lives: LIVES, hitAt: null, hitKind: null, readyUntil: t0 + READY_MS, over: false, overAt: null,
    bank: 0, run: 0, got: new Set(), hitsTotal: 0, track: null, stretches: [0],
  };
  g.track = stretch(seed, 0);
  return g;
}

export const inAir = (g, t) => t - g.jumpAt < JUMP_MS;
export const ducking = (g, t) => !inAir(g, t) && t - g.duckAt < DUCK_MS;
/** How high the runner is at `t`, in meters (a parabola through the jump). */
export function height(g, t) {
  const p = (t - g.jumpAt) / JUMP_MS;
  return p >= 0 && p < 1 ? 4 * JUMP_H * p * (1 - p) : 0;
}
/** The runner's lane as drawn at `t`: sliding from the last one for LANE_MS. */
export function laneAt(g, t) {
  const p = Math.min(1, Math.max(0, (t - g.laneAt) / LANE_MS));
  return g.laneFrom + (g.lane - g.laneFrom) * (1 - (1 - p) * (1 - p));
}
/** The coins: those of the stretches passed plus those picked in this one (lost if it starts again). */
export const coins = g => g.bank + g.run;
/** The score: 100 a checkpoint passed, 10 a coin. */
export const score = g => g.s * 100 + coins(g) * 10;
/** Whether the runner is still (the beat before running, a stumble, or the end). */
export const still = (g, t) => g.over || g.hitAt !== null || t < g.readyUntil;

/**
 * Moves the game to time `t` (ms): the runner advances, picks coins, passes checkpoints and is
 * stopped by the first obstacle it cannot get past. Returns what happened, in order:
 * { type: 'coin' | 'checkpoint' | 'hit' | 'restart' | 'over', … }.
 */
export function step(g, t) {
  const events = [];
  if (g.over || t <= g.t) { g.t = Math.max(g.t, t); return events; }
  if (g.hitAt !== null) {
    if (t - g.hitAt < HIT_MS) { g.t = t; return events; }
    if (g.lives <= 0) { g.over = true; g.overAt = t; g.t = t; events.push({ type: 'over' }); return events; }
    restart(g, g.hitAt + HIT_MS);
    events.push({ type: 'restart', s: g.s });
  }
  let from = Math.max(g.t, g.readyUntil);
  g.t = t;
  while (from < t && !g.over && g.hitAt === null) {
    const v = speed(g.s);
    const z0 = g.z, z1 = z0 + v * (t - from) / 1000, gate = (g.s + 1) * SECTOR;
    const zEnd = Math.min(z1, gate);
    const at = z => from + (z - z0) / v * 1000;
    for (const c of g.track.coins) {
      if (c.z > z0 && c.z <= zEnd && c.lane === g.lane && !g.got.has(c.id)) { g.got.add(c.id); g.run++; events.push({ type: 'coin', id: c.id }); }
    }
    const o = g.track.obstacles.find(o => o.z > z0 && o.z <= zEnd && o.lanes.includes(g.lane) && hits(o.kind, { air: inAir(g, at(o.z)), duck: ducking(g, at(o.z)) }));
    if (o) {
      // Stopped just before it; the coins past it were not reached
      for (const c of g.track.coins) if (g.got.has(c.id) && c.z > o.z) { g.got.delete(c.id); g.run--; }
      g.z = o.z - 0.6; g.hitAt = at(o.z); g.hitKind = o.kind; g.hitId = o.id; g.lives--; g.hitsTotal++;
      events.push({ type: 'hit', kind: o.kind, lives: g.lives });
      break;
    }
    g.z = zEnd;
    if (zEnd < gate) break;
    // A checkpoint: the stretch's coins are kept, and the next stretch, faster, begins right here
    from = at(gate);
    g.s++; g.bank += g.run; g.run = 0; g.got = new Set(); g.track = stretch(g.seed, g.s); g.stretches.push(g.s);
    events.push({ type: 'checkpoint', s: g.s });
  }
  return events;
}

/** Starts the current stretch again from its checkpoint, in the middle lane, at time `t`. */
function restart(g, t) {
  g.z = g.s * SECTOR; g.lane = 1; g.laneFrom = 1; g.laneAt = -1e9; g.jumpAt = -1e9; g.duckAt = -1e9;
  g.hitAt = null; g.hitKind = null; g.run = 0; g.got = new Set(); g.readyUntil = t + READY_MS;
}

/**
 * A key or a swipe at time `t`: 'left' (4), 'right' (6), 'jump' (2) or 'duck' (8). Call step(g, t)
 * first. Returns whether it did anything.
 */
export function act(g, action, t) {
  if (g.over || g.hitAt !== null) return false;
  if (action === 'left' || action === 'right') {
    const lane = Math.max(0, Math.min(LANES - 1, g.lane + (action === 'left' ? -1 : 1)));
    if (lane === g.lane) return false;
    g.laneFrom = laneAt(g, t); g.lane = lane; g.laneAt = t;
    return true;
  }
  if (action === 'jump') {
    if (inAir(g, t)) return false;
    g.jumpAt = t; g.duckAt = -1e9;
    return true;
  }
  if (action === 'duck') {
    // In the air, ducking drops the runner to the ground at once, ducked
    g.jumpAt = -1e9; g.duckAt = t;
    return true;
  }
  return false;
}

/** A pause of `ms` (a call, another app): every moment the game keeps moves on by it. */
export function shift(g, ms) {
  for (const k of ['t', 'readyUntil', 'jumpAt', 'duckAt', 'laneAt']) g[k] += ms;
  if (g.hitAt !== null) g.hitAt += ms;
}

/** The next obstacle in the runner's way (in any lane) and how many meters ahead it is. */
export function next(g) {
  const o = g.track.obstacles.find(o => o.z > g.z);
  return o ? { ...o, ahead: o.z - g.z } : null;
}

/**
 * What a careful player would do now (for the cover's demo and the tests): the move that gets past
 * the next obstacle, when it is close enough, or null.
 */
export function autopilot(g, t) {
  if (still(g, t)) return null;
  const o = next(g);
  if (!o) return null;
  const secs = o.ahead / speed(g.s);
  if (!o.lanes.includes(g.lane)) return null;
  if (o.kind === 'carro') {
    if (secs > 0.9) return null;
    const to = [0, 1, 2].filter(l => !o.lanes.includes(l)).sort((a, b) => Math.abs(a - g.lane) - Math.abs(b - g.lane))[0];
    return to < g.lane ? 'left' : 'right';
  }
  if (o.kind === 'rama') return secs < 0.35 && !ducking(g, t) ? 'duck' : null;
  // roca, tronco: jump just in time
  return secs < 0.28 && !inAir(g, t) ? 'jump' : null;
}

/** The emoji line for sharing: a 📍 per checkpoint passed, a 💥 per hit, the 🏁 of where it ended. */
export function card(g) {
  return `${'📍'.repeat(g.s)}${'💥'.repeat(g.hitsTotal)}`.slice(0, 60) || '💥';
}
