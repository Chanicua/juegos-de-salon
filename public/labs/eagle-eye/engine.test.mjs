// Ojo de lince: the moves, the rounds, a game and the texts (node public/labs/eagle-eye/engine.test.mjs)
import assert from 'node:assert/strict';
import { level, move, moveBoard, makeRound, newPlay, tap, newGame, currentRound, endRound, LIVES, LIFE_EVERY, MAX_SIZE } from './engine.js';
import { SPRITES, SPRITE_NAMES, PALETTE } from './sprites.js';
import { LOCALES } from './rules.js';

// The moves: a quarter turn clockwise takes the top-left corner to the top-right
assert.equal(move(3, 0, { type: 'rotate', turns: 1 }), 2);
assert.equal(move(3, 2, { type: 'rotate', turns: 1 }), 8);
assert.equal(move(3, 0, { type: 'rotate', turns: -1 }), 6);
assert.equal(move(4, 0, { type: 'rotate', turns: 2 }), 15);
assert.equal(move(3, 4, { type: 'rotate', turns: 1 }), 4, 'the centre stays');
assert.equal(move(3, 0, { type: 'flip', axis: 'h' }), 2);
assert.equal(move(3, 0, { type: 'flip', axis: 'v' }), 6);
assert.equal(move(4, 1, { type: 'rows', a: 0, b: 2 }), 9);
assert.equal(move(4, 1, { type: 'cols', a: 1, b: 3 }), 3);
assert.equal(move(4, 5, { type: 'swap', a: 5, b: 10 }), 10);
assert.equal(move(4, 6, { type: 'swap', a: 5, b: 10 }), 6);
// Every move is a permutation, and four quarter turns are none
for (const size of [3, 4, 5]) {
  const ids = [...Array(size * size).keys()];
  for (const m of [{ type: 'rotate', turns: 1 }, { type: 'rotate', turns: -1 }, { type: 'rotate', turns: 2 }, { type: 'flip', axis: 'h' }, { type: 'flip', axis: 'v' }, { type: 'rows', a: 0, b: size - 1 }, { type: 'cols', a: 1, b: 2 }, { type: 'swap', a: 0, b: 3 }]) {
    assert.equal(new Set(ids.map(i => move(size, i, m))).size, ids.length, `${size}: ${JSON.stringify(m)} is a permutation`);
  }
  let b = ids;
  for (let k = 0; k < 4; k++) b = moveBoard(size, b, { type: 'rotate', turns: 1 });
  assert.deepEqual(b, ids);
}

// The levels get harder and never ask for more than the board holds
let prev = level(1);
assert.deepEqual([prev.size, prev.ask, prev.moves, prev.decoys, prev.pairs], [3, 2, 0, 0, false], 'level 1 is easy: 3×3, two pictures, no move');
assert.ok(level(3).moves >= 1, 'the board starts moving at level 3');
assert.ok(level(4).pairs, 'level 4 is a pairs round');
for (let n = 1; n <= 60; n++) {
  const L = level(n);
  assert.ok(L.size <= MAX_SIZE && L.size >= prev.size, `${n}: the board never shrinks`);
  assert.ok(L.moves >= prev.moves, `${n}: never fewer moves`);
  const shown = L.ask * (L.pairs ? 2 : 1) + L.decoys;
  assert.ok(shown <= L.size * L.size * 0.6, `${n}: ${shown} pictures fit the board`);
  assert.ok(L.ask + L.decoys <= SPRITE_NAMES.length, `${n}: enough pictures`);
  assert.ok(L.showMs >= 800 && L.showMs <= 5000, `${n}: shown for ${L.showMs} ms`);
  prev = L;
}

// A round: the start, the moves, the end and what is asked all agree
for (let n = 1; n <= 30; n++) {
  for (const seed of ['a', 'b', 'day:2026-11-04']) {
    const r = makeRound(seed, n);
    assert.deepEqual(makeRound(seed, n), r, 'the same seed, the same round');
    assert.equal(r.start.length, r.size * r.size);
    assert.equal(r.moves.length, level(n).moves);
    let b = r.start;
    for (const m of r.moves) {
      assert.ok(r.kinds.includes(m.type === 'cols' ? 'rows' : m.type), `${n}: ${m.type} is allowed`);
      const after = moveBoard(r.size, b, m);
      assert.ok(after.some((v, i) => v !== b[i]), `${n}: a move always moves a picture`);
      b = after;
    }
    assert.deepEqual(b, r.end);
    const shown = r.start.filter(Boolean);
    assert.equal(shown.length, r.ask.length * (r.pairs ? 2 : 1) + r.decoys);
    for (const item of r.ask) {
      assert.equal(item.cells.length, r.pairs ? 2 : 1, `${n}: ${item.sprite} is on ${item.cells.length} tiles`);
      for (const c of item.cells) assert.equal(r.end[c], item.sprite);
    }
  }
}

// Playing a round: hits, a pair, a miss
const r = makeRound('t', 4);
assert.ok(r.pairs);
let p = newPlay(r);
const [a, b] = r.ask[0].cells;
assert.equal(tap(p, a), 'hit');
assert.equal(tap(p, a), 'again');
assert.equal(tap(p, b), 'next');
const wrong = r.end.findIndex(v => v !== r.ask[1].sprite);
assert.equal(tap(p, wrong), 'miss');
p = newPlay(r);
const all = r.ask.flatMap(x => x.cells);
assert.deepEqual(all.map(c => tap(p, c)).at(-1), 'clear');

// A game: a clear goes up a level, a miss costs a life and replays the level, LIFE_EVERY in a row gives one back
const g = newGame('x');
assert.deepEqual([g.level, g.lives], [1, LIVES]);
const first = currentRound(g);
assert.deepEqual(endRound(g, false), { life: false, over: false });
assert.deepEqual([g.level, g.lives, g.score], [1, LIVES - 1, 0]);
assert.notDeepEqual(currentRound(g).start, first.start, 'the level again, on another board');
let back = false;
for (let k = 0; k < LIFE_EVERY; k++) back = endRound(g, true).life;
assert.ok(back && g.lives === LIVES, 'a life back');
assert.equal(g.score, LIFE_EVERY);
for (let k = 0; k < LIFE_EVERY; k++) assert.equal(endRound(g, true).life, false, 'never more than LIVES');
for (let k = 1; k < LIVES; k++) assert.equal(endRound(g, false).over, false);
assert.equal(endRound(g, false).over, true);

// The pictures: 8×8, only colours of the palette
for (const [name, rows] of Object.entries(SPRITES)) {
  assert.equal(rows.length, 8, name);
  for (const row of rows) {
    assert.equal(row.length, 8, `${name}: ${row}`);
    for (const ch of row) assert.ok(ch === '.' || PALETTE[ch], `${name}: ${ch}`);
  }
}

// The texts: the same keys and the same {placeholders} in every language
const keys = o => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v).map(x => `${k}.${x}`) : [k])).sort();
const holes = s => [...JSON.stringify(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join();
for (const lang of ['en', 'pt']) {
  assert.deepEqual(keys(LOCALES[lang]), keys(LOCALES.es), `${lang}: the same keys as es`);
  for (const k of Object.keys(LOCALES.es)) assert.equal(holes(LOCALES[lang][k]), holes(LOCALES.es[k]), `${lang}.${k}: the same {placeholders}`);
  assert.equal(LOCALES[lang].steps.length, 3);
}
for (const [lang, L] of Object.entries(LOCALES)) {
  const length = L.steps.map(([, x]) => x).join(' ').length;
  assert.ok(length <= 280, `${lang}: "How to play" has ${length} characters (U-18: at most 280)`);
}
console.log('✓ ojo de lince');
