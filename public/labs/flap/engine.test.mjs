// Aletazo's engine: the physics, the gates, the hits, the levels and the end, on seeded courses.
import assert from 'node:assert/strict';
import {
  newGame, step, flap, spawn, crossing, autopilot, rng, levelOf, diff, targetSpeed, fit, verdictOf,
  BR, GROUND, PERFECT, LEVEL_EVERY, LIVES, SHIELD, FLAP,
} from './engine.js';

const run = (g, secs, each) => { for (let t = 0; t < secs; t += 1 / 120) { each?.(g); step(g, 1 / 120); } };
const events = (g, type) => g.events.filter(e => e.type === type);

// The seeded random repeats itself
{
  const a = rng(7), b = rng(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  const c = rng(8)();
  assert.ok(c >= 0 && c < 1);
}

// Levels every 5 gates; the difficulty and the speed only go up, and never stop
{
  assert.equal(levelOf(0), 1); assert.equal(levelOf(LEVEL_EVERY - 1), 1); assert.equal(levelOf(LEVEL_EVERY), 2); assert.equal(levelOf(23), 5);
  assert.equal(diff(1), 0);
  for (let l = 1; l < 40; l++) {
    assert.ok(diff(l + 1) > diff(l) && diff(l) < 1, `diff climbs at level ${l}`);
    assert.ok(targetSpeed(l + 1, 1) > targetSpeed(l, 1), `speed climbs at level ${l}`);
  }
  // Each of the first ten levels adds 10 % of the starting speed
  assert.ok(Math.abs(targetSpeed(5, 1) / targetSpeed(1, 1) - 1.4) < 1e-9);
  // A narrow stage slows the world, down to a floor
  assert.equal(fit(0.9), 1); assert.equal(fit(2), 1); assert.equal(fit(0.3), 0.68);
}

// The result's line by score
assert.deepEqual([0, 5, 6, 15, 16, 30, 31, 50, 51, 200].map(verdictOf), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);

// What crossing a gate is worth
{
  const hoop = { y: 0.5, r: 0.15, bare: false };
  assert.equal(crossing(hoop, 0.5), 'perfect');
  assert.equal(crossing(hoop, 0.5 + 0.15 * PERFECT - 0.001), 'perfect');
  assert.equal(crossing(hoop, 0.5 + 0.15 * PERFECT + 0.001), 'pass');
  assert.equal(crossing(hoop, 0.5 - (0.15 - BR * 0.5) + 0.001), 'pass');
  assert.equal(crossing(hoop, 0.5 + 0.2), 'miss');
  // A bare gap has no dead center
  assert.equal(crossing({ y: 0.5, r: 0.1, bare: true }, 0.5), 'pass');
}

// A new game waits for the first tap, hovering; the tap starts it and lifts the bird
{
  const g = newGame({ W: 0.55, random: rng(1) });
  assert.equal(g.mode, 'ready'); assert.equal(g.hearts, LIVES);
  assert.ok(g.gates.length >= 1 && g.gates[0].x > g.bird.x, 'the course is laid out ahead');
  const y0 = g.bird.y;
  run(g, 1);
  assert.ok(Math.abs(g.bird.y - y0) < 0.05 && g.mode === 'ready', 'it hovers while ready');
  assert.ok(flap(g)); assert.equal(g.mode, 'play'); assert.equal(g.bird.vy, -FLAP);
  const y1 = g.bird.y;
  run(g, 0.1);
  assert.ok(g.bird.y < y1, 'a flap goes up');
  run(g, 0.5);
  assert.ok(g.bird.vy > 0, 'and gravity brings it down');
}

// The ground costs a life and bounces the bird up; the shield keeps it from costing two at once
{
  const g = newGame({ W: 0.55, random: rng(2) });
  flap(g); g.gates = []; g.spikes = []; g.gates.push({ x: 99, baseY: 0.5, y: 0.5, r: 0.15, amp: 0, w: 1, ph: 0, wall: false, bare: false, done: false, hit: false, ok: 0, flash: 0 });
  run(g, 1.2);
  assert.equal(g.hearts, LIVES - 1, 'one life lost on the ground');
  assert.ok(events(g, 'hit').length === 1);
  run(g, SHIELD * 0.5);
  assert.equal(g.hearts, LIVES - 1, 'not two in a row while shielded');
}

// Three hits end the game: it falls, then 'end'
{
  const g = newGame({ W: 0.55, random: rng(3) });
  flap(g);
  run(g, 8);   // never flaps again: the ground takes every life
  assert.equal(g.hearts, 0);
  assert.ok(events(g, 'over').length === 1 && events(g, 'end').length === 1);
  assert.equal(g.mode, 'over');
}

// Through a hoop's middle is +2, through the rest of it +1; a rim end hurts; skipping one hurts
{
  const mk = (g, y, extra = {}) => { g.gates = [{ x: g.bird.x + 0.05, baseY: y, y, r: 0.15, amp: 0, w: 1, ph: 0, color: '#fff', wall: false, bare: false, done: false, hit: false, ok: 0, flash: 0, ...extra }]; g.spikes = []; };
  const fly = (gy, by) => {
    const g = newGame({ W: 2, random: rng(4) }); flap(g); mk(g, gy); g.bird.y = by; g.bird.vy = 0;
    // hold the bird at its height while the gate goes by
    run(g, 0.3, x => { x.bird.y = by; x.bird.vy = 0; });
    return g;
  };
  let g = fly(0.5, 0.5);
  assert.equal(g.score, 2); assert.equal(g.perfects, 1); assert.ok(events(g, 'perfect').length === 1);
  g = fly(0.5, 0.58);
  assert.equal(g.score, 1); assert.ok(events(g, 'pass').length === 1);
  g = fly(0.5, 0.5 + 0.15);
  assert.equal(g.score, 0); assert.equal(g.hearts, LIVES - 1, 'the rim end hurts');
  g = fly(0.3, 0.7);
  assert.equal(g.score, 0); assert.equal(g.hearts, LIVES - 1, 'skipping a hoop hurts');
}

// A wall: its opening is the only way; its slabs hurt
{
  const wallAt = (g, y, bare) => { g.gates = [{ x: g.bird.x + 0.1, baseY: y, y, r: 0.12, amp: 0, w: 1, ph: 0, color: '#fff', wall: true, bare, done: false, hit: false, ok: 0, flash: 0 }]; g.spikes = []; };
  const fly = (by, bare) => {
    const g = newGame({ W: 2, random: rng(5) }); flap(g); wallAt(g, 0.5, bare);
    run(g, 0.4, x => { x.bird.y = by; x.bird.vy = 0; });
    return g;
  };
  let g = fly(0.5, true);
  assert.equal(g.score, 1); assert.equal(g.walls, 1); assert.equal(g.hearts, LIVES, 'through a bare gap clean: +1, no harm');
  g = fly(0.25, true);
  assert.equal(g.hearts, LIVES - 1); assert.equal(g.score, 0, 'into the slab above: a life, no point');
  g = fly(0.8, false);
  assert.equal(g.hearts, LIVES - 1, 'into the slab below a walled hoop: a life');
}

// The course: no walls in level 1, never a spike beside a wall, openings always on screen
{
  for (let seed = 1; seed <= 30; seed++) {
    const g = newGame({ W: 0.55, random: rng(seed) });
    for (let i = 0; i < 4; i++) assert.ok(!spawn(g).wall, 'level 1 has no walls');
    g.passed = 30; g.level = levelOf(30);
    for (let i = 0; i < 60; i++) {
      const h = spawn(g);
      // the opening's middle, wherever it moves, is always somewhere the bird can be
      assert.ok(h.baseY - h.amp > BR + 0.1 && h.baseY + h.amp < GROUND - BR, 'the opening stays within reach');
    }
    for (const z of g.spikes) {
      const near = g.gates.filter(h => Math.abs(h.x - z.x) < 0.5);
      assert.ok(near.every(h => !h.wall), 'no spike next to a wall');
    }
    assert.ok(g.gates.some(h => h.wall) && g.gates.some(h => h.bare), 'higher up there are walls and bare gaps');
  }
}

// A new level is announced every 5 gates, and walls are announced the first time one shows
{
  const g = newGame({ W: 0.55, random: rng(11) });
  flap(g);
  run(g, 60, autopilot);
  const levels = events(g, 'level').map(e => e.level);
  assert.ok(g.passed >= LEVEL_EVERY * 2, `the autopilot gets past ${g.passed} gates`);
  assert.deepEqual(levels, levels.map((_, i) => i + 2), 'levels come in order');
  assert.equal(levels.length, g.level - 1);
  assert.ok(events(g, 'walls').length <= 1);
}

// The cover's demo flies itself and never charges lives or points
{
  const g = newGame({ W: 0.55, random: rng(12) });
  g.mode = 'demo';
  run(g, 20);
  assert.equal(g.score, 0); assert.equal(g.hearts, LIVES); assert.equal(g.mode, 'demo');
  assert.ok(g.bird.y > 0 && g.bird.y < GROUND);
}

console.log('aletazo engine: ok');
