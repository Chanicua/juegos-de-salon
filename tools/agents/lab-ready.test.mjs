// Lab readiness is measured (D-528): the evidence from labsUso/, the threshold, and what check writes.
import assert from 'node:assert/strict';
import { DAY_MS, thresholdOf, evidenceOf, verdict, report, untold } from './lab-ready.mjs';
import { READY } from '../../public/assets/js/flag-list.js';
import { patchOf } from '../../public/assets/js/lab-usage.js';

const T = { completions: 5, keys: 2, days: 3, errors: 0 };
assert.deepEqual(thresholdOf('x', {}, T), T, 'the default');
assert.deepEqual(thresholdOf('x', { x: { completions: 1 } }, T), { ...T, completions: 1 }, 'a row overrides only what it names');
assert.ok(READY.completions >= 1 && READY.keys >= 2 && READY.days >= 3 && READY.errors === 0, 'the issue\'s default: ≥2 keys, ≥3 days, 0 errors');

const uso = {
  100: { n: 4, c: 2, k: { aaaa0001: true } },
  101: { n: 3, c: 2, k: { bbbb0002: true, aaaa0001: true } },
  102: { n: 2, c: 1, e: 0, k: { aaaa0001: true } },
  bad: { n: 99 },
};
const ev = evidenceOf(uso);
assert.deepEqual(ev, { exposures: 9, completions: 5, errors: 0, keys: 2, days: 3 }, 'summed, distinct keys, days with use; a bad day key is skipped');
assert.deepEqual(verdict(ev, T), { ready: true, missing: [] }, 'exactly the threshold is ready');
assert.equal(evidenceOf(uso, 101 * DAY_MS).days, 2, 'only days since the flag was switched');
assert.equal(evidenceOf(uso, 101 * DAY_MS + 5).days, 2, 'the switch day itself counts');
assert.deepEqual(evidenceOf(null), { exposures: 0, completions: 0, errors: 0, keys: 0, days: 0 }, 'nothing yet');

const v = verdict({ exposures: 3, completions: 1, errors: 2, keys: 1, days: 1 }, T);
assert.equal(v.ready, false);
assert.equal(v.missing.length, 4, 'says each thing missing');
assert.equal(verdict({ ...ev, errors: 1 }, T).ready, false, 'one load with an error is not ready');

const flags = { a: { state: 'lab', at: 0 }, b: { state: 'all', at: 0 } };
const r = report({ flags, uso: { a: uso }, prev: {}, now: 7, ids: ['a', 'b', 'c'] });
assert.deepEqual(Object.keys(r), ['a', 'c'], 'only flags in lab (no row = lab)');
assert.equal(r.a.ready, true);
assert.equal(r.a.since, 7, 'ready since now');
assert.equal(r.c.ready, false);
const r2 = report({ flags, uso: { a: uso }, prev: { a: { ready: true, since: 3, told: 5 } }, now: 9, ids: ['a'] });
assert.equal(r2.a.since, 3, 'keeps when it became ready');
assert.equal(r2.a.told, 5, 'told once, not every day');
const r3 = report({ flags, uso: { a: { 100: { n: 1 } } }, prev: { a: { ready: true, since: 3, told: 5 } }, now: 9, ids: ['a'] });
assert.equal(r3.a.told, undefined, 'no longer ready: told is dropped, so a new readiness is told again');

assert.deepEqual(untold({ a: { ready: true }, b: { ready: true, told: 1 }, c: { ready: false } }), ['a']);
assert.deepEqual(untold(null), []);

assert.deepEqual(patchOf('n', 'abcd1234'), { n: { '.sv': { increment: 1 } }, 'k/abcd1234': true }, 'an exposure names the key\'s hash');
assert.deepEqual(patchOf('c', 'abcd1234'), { c: { '.sv': { increment: 1 } } }, 'a completion does not');
console.log('✓ lab ready');
