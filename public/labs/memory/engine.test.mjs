// Memorice: the levels, the rounds, a game and the texts (node public/labs/memory/engine.test.mjs)
import assert from 'node:assert/strict';
import { level, sizeOf, makeRound, newPlay, tap, newGame, currentRound, endRound, INTRO, LIVES, LIFE_EVERY, MAX_SIZE } from './engine.js';
import { SPRITES, SPRITE_NAMES, PALETTE, SIZE } from './sprites.js';
import { LOCALES } from './rules.js';

// The intro is the same for everyone: one picture, a pair, on the 3×3 then the 4×4
assert.deepEqual([1, 2, 3, 4].map(n => makeRound('a', n).groups.map(g => g.count)), INTRO);
assert.deepEqual([1, 2, 3, 4].map(n => makeRound('b', n).ask.cells.length), [1, 2, 1, 2]);
assert.deepEqual([1, 2, 3, 4].map(sizeOf), [3, 3, 4, 4]);
// The time to look: 4.5 s twice, 4 s, 2 s at level 20, 1.5 s at 25, then down to 0.8 s, never longer than the level before
assert.deepEqual([1, 2, 3, 20, 25, 30, 39, 60].map(n => level(n).showMs), [4500, 4500, 4000, 2000, 1500, 1250, 800, 800]);
for (let n = 2; n <= 60; n++) assert.ok(level(n).showMs <= level(n - 1).showMs, `${n}: never more time to look`);

// The levels: the board grows to 6×6 and never shrinks, more tiles and less time, down to floors
let prev = level(1);
for (let n = 2; n <= 80; n++) {
  const L = level(n);
  assert.ok(L.size >= prev.size && L.size <= MAX_SIZE, `${n}: the board grows up to ${MAX_SIZE}×${MAX_SIZE}`);
  assert.ok(L.tiles <= L.size * L.size / 2, `${n}: ${L.tiles} tiles fit`);
  if (n > INTRO.length + 1) {
    assert.ok(L.tiles >= prev.tiles, `${n}: never fewer tiles`);
    assert.ok(L.tapMs <= prev.tapMs, `${n}: never more time to answer`);
  }
  assert.ok(L.tapMs >= 2500 && L.showMs >= 800, `${n}: floors`);
  assert.ok(L.maxGroup === (L.size >= 5 ? 3 : 2), `${n}: trios from the 5×5`);
  prev = L;
}
assert.equal(sizeOf(9), MAX_SIZE);
assert.equal(level(1).tapMs, 4500);
assert.equal(level(40).tapMs, 2500, 'never under 2.5 s per copy');

// A round: the board holds the groups, and what is asked is every copy of one picture
const asked = new Set();
for (let n = 1; n <= 40; n++) {
  for (const seed of ['a', 'b', 'c', 'day:2026-11-04']) {
    const r = makeRound(seed, n);
    assert.deepEqual(makeRound(seed, n), r, 'the same seed, the same round');
    assert.equal(r.board.length, r.size * r.size);
    assert.equal(r.board.filter(Boolean).length, r.tiles);
    assert.equal(r.groups.reduce((a, g) => a + g.count, 0), r.tiles);
    assert.equal(new Set(r.groups.map(g => g.sprite)).size, r.groups.length, 'a picture is one group');
    assert.ok(r.groups.length <= SPRITE_NAMES.length);
    for (const g of r.groups) {
      assert.ok(g.count >= 1 && g.count <= r.maxGroup, `${n}: a group of ${g.count}`);
      assert.equal(r.board.filter(v => v === g.sprite).length, g.count);
    }
    assert.ok(r.ask.cells.length >= 1 && r.ask.cells.every(c => r.board[c] === r.ask.sprite));
    assert.equal(r.ask.cells.length, r.board.filter(v => v === r.ask.sprite).length);
    assert.equal(r.answerMs, r.tapMs * r.ask.cells.length, 'time to answer for each copy');
    if (n > INTRO.length) asked.add(`${r.size}:${r.ask.cells.length}`);
  }
}
assert.ok(['5:1', '5:2', '5:3', '6:1', '6:2', '6:3'].every(k => asked.has(k)), `mixed asks: one, a pair or a trio (${[...asked]})`);

// Playing a round: a pair, a miss
const r = makeRound('t', 2);
let p = newPlay(r);
const [a, b] = r.ask.cells;
assert.equal(tap(p, a), 'hit');
assert.equal(tap(p, a), 'again');
assert.equal(tap(p, b), 'clear');
p = newPlay(r);
assert.equal(tap(p, r.board.findIndex(v => v !== r.ask.sprite)), 'miss');

// A game: a clear goes up a level, a miss costs a life and replays the level, LIFE_EVERY in a row gives one back
const g = newGame('x');
assert.deepEqual([g.level, g.lives], [1, LIVES]);
const first = currentRound(g);
assert.deepEqual(endRound(g, false), { life: false, over: false });
assert.deepEqual([g.level, g.lives, g.score], [1, LIVES - 1, 0]);
assert.notDeepEqual(currentRound(g).board, first.board, 'the level again, on another board');
let back = false;
for (let k = 0; k < LIFE_EVERY; k++) back = endRound(g, true).life;
assert.ok(back && g.lives === LIVES, 'a life back');
assert.equal(g.score, LIFE_EVERY);
for (let k = 0; k < LIFE_EVERY; k++) assert.equal(endRound(g, true).life, false, 'never more than LIVES');
for (let k = 1; k < LIVES; k++) assert.equal(endRound(g, false).over, false);
assert.equal(endRound(g, false).over, true);

// The pictures: the owner's 45, 12×12, only colours of the palette
assert.equal(SPRITE_NAMES.length, 45);
for (const [name, rows] of Object.entries(SPRITES)) {
  assert.equal(rows.length, SIZE, name);
  for (const row of rows) {
    assert.equal(row.length, SIZE, `${name}: ${row}`);
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
console.log('✓ memorice');
