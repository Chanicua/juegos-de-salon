// Compuertas' engine (lab): paddles that send a ball left or right, every bin reachable, bins that
// change, what each kind of ball scores, flips at their own moment, and the same game at any frame rate.
import assert from 'node:assert/strict';
import {
  newGame, advance, takeEvents, flip, routeFrom, routePath, steer, autoplay, binsAt, nextBins, pointsFor,
  best, bestFor, isOver, card, tally, ballAt, landsAt, stepAt,
  ROWS, BINS, DURATION, PERIOD, WARNING, VALUES, TRASH, TOP, GOLD, DEFUSED, BLAST,
} from './engine.js';

// The same seed is the same game; another seed, another one
{
  const a = newGame('hola'), b = newGame('hola'), c = newGame('chao');
  assert.deepEqual(a.gates, b.gates); assert.deepEqual(a.periods, b.periods); assert.deepEqual(a.drops, b.drops);
  assert.notDeepEqual(a.drops.map(d => d.t0), c.drops.map(d => d.t0));
}

// The board: row r has r + 1 paddles leaning −1 or +1, and there is one bin more than rows
{
  const g = newGame('x');
  assert.equal(g.gates.length, ROWS); assert.equal(BINS, ROWS + 1);
  g.gates.forEach((row, r) => { assert.equal(row.length, r + 1); assert.ok(row.every(v => v === -1 || v === 1)); });
}

// A paddle sends the ball to its side: all left is bin 0, all right the last bin
{
  const g = newGame('x');
  g.gates = g.gates.map(row => row.map(() => -1));
  assert.equal(routeFrom(g, 0, 0), 0);
  g.gates = g.gates.map(row => row.map(() => 1));
  assert.equal(routeFrom(g, 0, 0), BINS - 1);
  assert.equal(routePath(g).paddles.length, ROWS);
}

// steer: from the funnel, every bin can be reached by leaning each paddle on the way
for (let target = 0; target < BINS; target++) {
  const g = newGame('x');
  let i = 0;
  for (let r = 0; r < ROWS; r++) { g.gates[r][i] = steer(r, i, target); i += g.gates[r][i] > 0 ? 1 : 0; }
  assert.equal(i, target, `bin ${target} can be reached`);
  assert.equal(routeFrom(g, 0, 0), target);
}

// The bins: each period is VALUES in some order, the 10 and the trash always move, the next ones show WARNING before
{
  const g = newGame('x');
  assert.equal(g.periods.length, DURATION / PERIOD);
  for (const p of g.periods) assert.deepEqual([...p].sort((a, b) => a - b), [...VALUES].sort((a, b) => a - b));
  for (let k = 1; k < g.periods.length; k++) {
    assert.notEqual(g.periods[k].indexOf(TOP), g.periods[k - 1].indexOf(TOP), 'the 10 moves');
    assert.notEqual(g.periods[k].indexOf(TRASH), g.periods[k - 1].indexOf(TRASH), 'the trash moves');
  }
  assert.equal(binsAt(g, PERIOD - 1), g.periods[0]); assert.equal(binsAt(g, PERIOD), g.periods[1]);
  assert.equal(nextBins(g, PERIOD - WARNING - 1), null);
  assert.equal(nextBins(g, PERIOD - WARNING), g.periods[1]);
  assert.equal(nextBins(g, DURATION - 100), null, 'nothing after the last period');
}

// Points: the bin's value; gold triples it; a bomb is defused in the trash and blows up anywhere else
assert.equal(pointsFor('ball', 5), 5);
assert.equal(pointsFor('ball', TRASH), 0);
assert.equal(pointsFor('gold', TOP), TOP * GOLD);
assert.equal(pointsFor('bomb', TRASH), DEFUSED);
assert.equal(pointsFor('bomb', TOP), BLAST);
assert.equal(bestFor('ball'), TOP); assert.equal(bestFor('bomb'), DEFUSED);

// The balls: they speed up, there are bombs and gold ones, and the last one lands before the minute is up
{
  const g = newGame('dia:2026-11-07');
  assert.ok(stepAt(DURATION) < stepAt(0));
  assert.ok(g.drops.length >= 35, `${g.drops.length} balls`);
  assert.ok(g.drops.some(d => d.kind === 'bomb') && g.drops.some(d => d.kind === 'gold'));
  assert.ok(landsAt(g.drops.at(-1).t0) <= DURATION);
  assert.ok(g.drops.every((d, k) => k === 0 || d.t0 > g.drops[k - 1].t0));
  assert.ok(g.drops.every((d, k) => !(d.kind === 'bomb' && g.drops[k - 1]?.kind === 'bomb')), 'never two bombs in a row');
}

// One ball, step by step: it drops, rolls off each paddle as it is at that moment, and lands
{
  const g = newGame('x');
  g.drops = [{ id: 0, kind: 'ball', t0: 1000, step: 100 }];
  g.gates = g.gates.map(row => row.map(() => -1));
  advance(g, 999);
  assert.equal(g.balls.length, 0);
  advance(g, 1000);
  assert.equal(g.balls.length, 1);
  advance(g, 1150);   // past paddle row 0 (at 1100)
  assert.deepEqual(g.balls[0].path, [0, 0]);
  // Flipping row 1's paddle before the ball gets there (1200) sends it right
  flip(g, 1, 0, 1150);
  advance(g, 1250);
  assert.deepEqual(g.balls[0].path, [0, 0, 1]);
  // Flipping row 0's paddle now changes nothing for it: it already rolled off
  flip(g, 0, 0, 1250);
  advance(g, 1000 + 6 * 100);
  assert.equal(g.balls.length, 0); assert.equal(g.done.length, 1);
  assert.equal(g.done[0].bin, 1);
  const ev = takeEvents(g).map(e => e.type);
  assert.deepEqual(ev, ['drop', 'bounce', 'bounce', 'bounce', 'bounce', 'bounce', 'land']);
  assert.deepEqual(takeEvents(g), [], 'the events are handed over once');
  assert.equal(g.score, pointsFor('ball', binsAt(g, 1600)[1]));
  assert.equal(g.flips, 2);
}

// A late tap (its moment before the last frame) counts from now
{
  const g = newGame('x');
  g.drops = [{ id: 0, kind: 'ball', t0: 0, step: 100 }];
  g.gates = g.gates.map(row => row.map(() => -1));
  advance(g, 150);
  flip(g, 0, 0, 50);   // the ball was already past row 0 at 100
  assert.deepEqual(g.balls[0].path, [0, 0]);
}

// A score never goes under 0
{
  const g = newGame('x');
  g.drops = [{ id: 0, kind: 'bomb', t0: 0, step: 100 }];
  const bin = routeFrom(g, 0, 0);
  if (binsAt(g, 600)[bin] === TRASH) flip(g, ROWS - 1, bin - (g.gates[ROWS - 1][bin] > 0 ? 1 : 0), 0);
  advance(g, 1000);
  assert.equal(g.done[0].points, BLAST); assert.equal(g.score, 0);
}

// The same game at 60 Hz, at 120 Hz and in one go, with the same flips at the same moments
{
  const flips = [[300, 0, 0], [2100, 2, 1], [5150, 4, 3], [9000, 1, 1], [20000, 3, 0], [33333, 4, 4]];
  const run = hz => {
    const g = newGame('frames');
    let k = 0;
    for (let t = 0; t <= DURATION; t += 1000 / hz) {
      while (k < flips.length && flips[k][0] <= t) { flip(g, flips[k][1], flips[k][2], flips[k][0]); k++; }
      advance(g, t);
    }
    advance(g, DURATION);
    return g;
  };
  const once = newGame('frames');
  for (const [t, r, i] of flips) flip(once, r, i, t);
  advance(once, DURATION);
  const a = run(60), b = run(120);
  assert.equal(a.score, b.score); assert.equal(a.score, once.score);
  assert.deepEqual(a.done, b.done); assert.deepEqual(a.done, once.done);
  assert.ok(isOver(a));
}

// A player that never misses scores the best possible; doing nothing scores much less
for (const seed of ['dia:2026-11-07', 'a', 'b', 'c']) {
  const g = newGame(seed);
  for (let t = 0; t <= DURATION; t += 16) autoplay(g, t);
  advance(g, DURATION);
  assert.ok(isOver(g));
  assert.equal(g.score, best(g), `${seed}: the bot scores ${g.score} of ${best(g)}`);
  const c = tally(g);
  assert.equal(c.defused, c.bombs); assert.equal(c.top, c.balls - c.bombs);
  const idle = newGame(seed);
  advance(idle, DURATION);
  assert.ok(idle.score < best(g) / 2, `${seed}: idle ${idle.score}`);
  // The share card: a mark per ball, in rows of 10
  const marks = card(g).split('\n');
  assert.equal(marks.length, Math.ceil(g.done.length / 10));
  assert.ok(!card(g).includes('💥') && card(g).includes('🟩'));
}

// Where a ball is drawn: at the funnel when it drops, on each paddle as it reaches it, in its bin at the end
{
  const g = newGame('x');
  g.drops = [{ id: 0, kind: 'ball', t0: 0, step: 100 }];
  g.gates = g.gates.map(row => row.map(() => 1));
  advance(g, 0);
  const b = g.balls[0];
  assert.deepEqual([ballAt(b, 0).x, ballAt(b, 0).y], [0, -1]);
  advance(g, 100);
  assert.deepEqual([ballAt(b, 100).x, ballAt(b, 100).y], [0, 0]);
  advance(g, 250);
  const p = ballAt(b, 250);
  assert.ok(p.y > 1 && p.y < 2 && p.x > 0, 'between rows 1 and 2, going right');
  advance(g, 599);
  const q = ballAt(b, 599);
  assert.ok(q.y > ROWS - 1 && Math.abs(q.x - (ROWS / 2)) < 0.05, 'over the last bin');
}

console.log('✓ compuertas engine');
