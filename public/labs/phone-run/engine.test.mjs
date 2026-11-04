// Duende's engine (lab): the track is the same for a seed, every stretch can be run without a hit,
// the obstacles stop who they should, a hit costs a life and starts the stretch again, and the
// stretches get faster with one new kind of obstacle each.
import assert from 'node:assert/strict';
import {
  newGame, step, act, autopilot, stretch, speed, kindsFor, hits, score, coins, card, inAir, ducking, height,
  SECTOR, LIVES, HIT_MS, READY_MS, JUMP_MS, KINDS,
} from './engine.js';

// The same seed, the same track
assert.deepEqual(stretch('a', 3), stretch('a', 3));
assert.notDeepEqual(stretch('a', 3), stretch('b', 3));

// Faster each stretch, one new kind each, then all of them
for (let s = 1; s < 8; s++) assert.ok(speed(s) >= speed(s - 1));
assert.deepEqual(kindsFor(0), ['roca']);
assert.deepEqual(kindsFor(1), ['roca', 'tronco']);
assert.deepEqual(kindsFor(9), KINDS);
for (let s = 0; s < 4; s++) {
  const kinds = new Set(stretch('k', s).obstacles.map(o => o.kind));
  assert.ok(kinds.has(KINDS[s]), `stretch ${s + 1} brings ${KINDS[s]}`);
  for (const k of kinds) assert.ok(kindsFor(s).includes(k));
}

// Who stops whom
assert.equal(hits('roca', { air: true, duck: false }), false);
assert.equal(hits('roca', { air: false, duck: true }), true);
assert.equal(hits('tronco', { air: true, duck: false }), false);
assert.equal(hits('rama', { air: false, duck: true }), false);
assert.equal(hits('rama', { air: false, duck: false }), true);
assert.equal(hits('carro', { air: true, duck: false }), true);

// Every obstacle stays inside its stretch, with room between them, and always a way past
for (const seed of ['x', 'y', 'z', 'w']) for (let s = 0; s < 10; s++) {
  const { obstacles } = stretch(seed, s);
  assert.ok(obstacles.length >= 3, `stretch ${s} has obstacles`);
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    assert.ok(o.z > s * SECTOR && o.z < (s + 1) * SECTOR);
    assert.ok(o.lanes.length < 3 || o.kind === 'tronco' || o.kind === 'rama', 'a single-lane obstacle never blocks the three lanes');
    if (i) assert.ok((o.z - obstacles[i - 1].z) / speed(s) >= 0.9, `stretch ${s}: at least 0.9 s between obstacles`);
  }
}

/** Plays with the autopilot from `t0` until `until` ms, frame by frame at 60 Hz. */
function run(g, t0, until, pilot = true) {
  const evs = [];
  for (let t = t0; t <= until && !g.over; t += 1000 / 60) {
    evs.push(...step(g, t));
    const a = pilot && autopilot(g, t);
    if (a) act(g, a, t);
  }
  return evs;
}

// The careful player never gets hit: ten stretches on several seeds, also at 30 Hz frames
for (const seed of ['uno', 'dos', 'tres', 'cuatro', 'cinco']) {
  const g = newGame(seed, 0);
  const evs = run(g, 0, 160000);
  assert.equal(evs.filter(e => e.type === 'hit').length, 0, `seed ${seed}: the autopilot was hit on stretch ${g.s + 1} by ${g.hitKind}`);
  assert.ok(g.s >= 10, `seed ${seed}: ten stretches in 160 s (reached ${g.s})`);
  assert.equal(evs.filter(e => e.type === 'checkpoint').length, g.s);
  assert.ok(coins(g) > 0, 'and picked some coins');
}

// Standing still: the first rock is a hit, the runner stops before it, a life goes
{
  const g = newGame('quieto', 0);
  assert.equal(step(g, READY_MS - 1).length, 0);
  assert.equal(g.z, 0, 'the beat before running: still');
  const first = g.track.obstacles.find(o => o.lanes.includes(1));
  const evs = run(g, 0, 40000, false).filter(e => e.type !== 'coin');
  assert.equal(evs[0].type, 'hit');
  assert.equal(g.lives, 0);
  assert.equal(evs.filter(e => e.type === 'hit').length, LIVES, 'three hits');
  assert.equal(evs.filter(e => e.type === 'restart').length, LIVES - 1, 'two restarts from the checkpoint');
  assert.equal(evs.at(-1).type, 'over', 'and the game ends');
  assert.ok(g.over && g.z < first.z, 'never past the first obstacle in its lane');
  assert.equal(g.s, 0); assert.equal(score(g), coins(g) * 10, 'no checkpoint, only the coins before the rock');
}

// A hit after a checkpoint starts again at that checkpoint, with the stretch's coins lost but the earlier ones kept
{
  const g = newGame('control', 0);
  // With the autopilot until just past the second checkpoint
  for (let t = 0; g.s < 2; t += 1000 / 60) { step(g, t); const a = autopilot(g, t); if (a) act(g, a, t); }
  const s = g.s, bank = g.bank;
  // Run on without playing until the next hit
  let t = g.t;
  while (g.hitAt === null) { t += 16; step(g, t); }
  assert.equal(g.lives, LIVES - 1);
  assert.ok(act(g, 'jump', t + 1) === false, 'no moves while stumbling');
  step(g, g.hitAt + HIT_MS + 1);
  assert.equal(g.s, s, 'same stretch');
  assert.equal(g.z, s * SECTOR, 'back at its checkpoint');
  assert.equal(g.lane, 1, 'in the middle lane');
  assert.equal(g.bank, bank, 'the coins of the stretches passed are kept');
  assert.equal(g.run, 0);
  assert.equal(score(g), s * 100 + bank * 10);
}

// The moves
{
  const g = newGame('mov', 0);
  step(g, 1000);
  assert.ok(act(g, 'left', 1000)); assert.equal(g.lane, 0);
  assert.equal(act(g, 'left', 1010), false, 'no lane past the edge');
  act(g, 'right', 1020); act(g, 'right', 1030); assert.equal(g.lane, 2);
  assert.ok(act(g, 'jump', 1100)); assert.ok(inAir(g, 1100 + JUMP_MS / 2));
  assert.ok(height(g, 1100 + JUMP_MS / 2) > 1.5);
  assert.equal(act(g, 'jump', 1200), false, 'no jump in the air');
  assert.ok(act(g, 'duck', 1300)); assert.ok(!inAir(g, 1301) && ducking(g, 1301), 'ducking in the air drops to the ground');
}

assert.equal(card({ s: 3, hitsTotal: 2 }), '📍📍📍💥💥');
console.log('✓ phone-run engine');
