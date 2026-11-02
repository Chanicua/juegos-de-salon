// The CI failure log (D-518): normalization, parsing a failed log, linking fixes, flaky runs and the ≥2 threshold.
import assert from 'node:assert/strict';
import { normalize, signature, parseLog, capture, link, summarize, prune, promote, report, READY } from './failures.mjs';

// What changes from run to run does not change the signature
const a = 'ReferenceError: document is not defined\n    at file:///home/runner/work/juegos-de-salon/juegos-de-salon/public/assets/js/music.js:63:1 (2026-11-01T03:08:28.97Z, a1b2c3d4e5f)';
const b = 'ReferenceError: document is not defined\n    at file:///Users/x/repo/public/assets/js/music.js:70:5 (2026-10-02T11:00:00Z, 9f8e7d6c5b4)';
assert.equal(normalize(a), normalize(b));
assert.match(normalize(a), /music\.js/, 'the file name stays, its folder and line go');
assert.equal(signature('x.test.mjs', a), signature('x.test.mjs', b));
assert.notEqual(signature('x.test.mjs', a), signature('y.test.mjs', a), 'another test, another signature');
assert.notEqual(signature('x.test.mjs', a), signature('x.test.mjs', 'TypeError: other'), 'another error, another signature');
assert.equal(normalize('took 1234ms, 58 px'), 'took <n>ms, <n>px');
assert.match(signature('t', 'e'), /^[0-9a-f]{10}$/);

assert.equal(normalize('see tools/release/readme.py and /a/b/c.js'), 'see readme.py and c.js', 'relative paths too');

// A step that fails with no test of its own: the step is the test
const step = ['tests\tREADME up to date\t2026-11-01T03:44:48.3Z ##[group]Run python3 tools/release/readme.py check',
  'tests\tREADME up to date\t2026-11-01T03:44:51.2Z   warning · portada: 2 screenshot(s) older',
  'tests\tREADME up to date\t2026-11-01T03:44:51.3Z   ERROR · the block "tests" went stale',
  'tests\tREADME up to date\t2026-11-01T03:44:51.4Z ##[error]Process completed with exit code 1.'].join('\n');
assert.deepEqual(parseLog(step), [{ test: 'README up to date', error: 'ERROR · the block "tests" went stale' }]);

// A `tests` log and an end-to-end log
const T = s => `tests\tNode tests\t2026-11-01T03:08:28.1Z ${s}`;
const testsLog = [
  T('##[group]public/a.test.mjs'), T('a: ok'), T('ok'), T('##[endgroup]'),
  T('##[group]public/b.test.mjs'), T('file:///home/runner/x/public/m.js:63'), T('ReferenceError: document is not defined'),
  T('    at file:///home/runner/x/public/m.js:63:1'), T('Node.js v24'), T('##[error]public/b.test.mjs failed'), T('##[endgroup]'),
  T('##[error]Process completed with exit code 1.'),
].join('\n');
assert.deepEqual(parseLog(testsLog), [{ test: 'public/b.test.mjs', error: 'ReferenceError: document is not defined' }]);
const E = s => `g04 · cup\tUNKNOWN STEP\t2026-10-31T20:08:07.5Z ${s}`;
const e2eLog = [E('▶ cup/tournament.mjs:cup'), E('✓ home'), E('✗ the ones left out stay outside'), E('##[error]exited with 1: ✗ the ones left out stay outside'), E('▶ cup/other.mjs'), E('✓ fine')].join('\n');
assert.deepEqual(parseLog(e2eLog), [{ test: 'cup/tournament.mjs:cup', error: '✗ the ones left out stay outside' }]);
// End-to-end's gate job fails whenever a script does: with a script's failure in the log it is not recorded
const gate = ['end-to-end\tRun echo "list: success · scripts: failure"\t2026-11-02T16:17:53.6Z list: success · scripts: failure',
  'end-to-end\tRun echo "list: success · scripts: failure"\t2026-11-02T16:17:53.7Z ##[error]Process completed with exit code 1.'].join('\n');
assert.deepEqual(parseLog(e2eLog + '\n' + gate), [{ test: 'cup/tournament.mjs:cup', error: '✗ the ones left out stay outside' }]);

// Capturing: one record per failing test, a run seen twice is not doubled
const store = { records: [] };
const f = [{ test: 'public/b.test.mjs', error: 'ReferenceError: document is not defined' }];
const day = '2026-11-01T00:00:00Z';
assert.equal(capture(store, f, { check: 'tests', run: 1, commit: 'c1', branch: 'one', pr: 10, date: day }).length, 1);
assert.equal(capture(store, f, { check: 'tests', run: 1, commit: 'c1', branch: 'one', pr: 10, date: day }).length, 0);

// One PR is not enough
let s = summarize(store, { patterns: [] });
assert.equal(s.ready.length, 0);
assert.equal(s.watching.length, 1);

// Linking: a later green commit is the fix, with what it changed
link(store, { check: 'tests', commit: 'c2', pr: 10, date: day }, (from, to) => `${from}..${to}`);
assert.deepEqual(store.records[0].fix, { commit: 'c2', date: day, stat: 'c1..c2' });
link(store, { check: 'end-to-end', commit: 'c3', pr: 10, date: day });
assert.equal(store.records[0].fix.commit, 'c2', 'another check does not touch it');

// The same error on a second PR → ready, with each occurrence and its fix
capture(store, f, { check: 'tests', run: 2, commit: 'd1', branch: 'two', pr: 11, date: day });
capture(store, f, { check: 'tests', run: 3, commit: 'd1b', branch: 'two', pr: 11, date: day });
s = summarize(store, { patterns: [] });
assert.equal(READY, 2);
assert.equal(s.ready.length, 1);
assert.deepEqual(s.ready[0].prs, ['#10', '#11'], 'counted by distinct PRs, not by runs');
const lines = report(s).join('\n');
assert.match(lines, /READY FOR A MECHANISM/);
assert.match(lines, /pull\/10 .*fixed by c2/);
assert.match(lines, /pull\/11 .*not fixed yet/);

// Flaky: green on the very commit that failed is counted apart, not as a real failure
const fl = { records: [] };
capture(fl, [{ test: 'e.mjs', error: '✗ x' }], { check: 'end-to-end', run: 7, commit: 'z', branch: 'p', pr: 20, date: day });
capture(fl, [{ test: 'e.mjs', error: '✗ x' }], { check: 'end-to-end', run: 8, commit: 'y', branch: 'q', pr: 21, date: day });
link(fl, { check: 'end-to-end', commit: 'z', pr: 20, date: day });
link(fl, { check: 'end-to-end', commit: 'y', pr: 21, date: day });
assert.ok(fl.records.every(r => r.flaky && !r.fix));
s = summarize(fl, { patterns: [] });
assert.equal(s.ready.length, 0, 'flaky runs do not make a real pattern');
assert.equal(s.flaky.length, 1);
assert.match(report(s).join('\n'), /flaky .*2 time\(s\)/);

// Promote: a processes.mjs pattern with one sighting per commit and the signature remembered
const memory = { patterns: [] };
const sig = store.records[0].signature;
const p = promote(store, memory, sig, 'browser-global-in-node', { date: '2026-11-01' });
assert.equal(p.seen.length, 3);
assert.deepEqual(p.signatures, [sig]);
assert.throws(() => promote(store, memory, 'nope', 'k', { date: '2026-11-01' }));
s = summarize(store, memory);
assert.equal(s.ready[0].pattern, 'browser-global-in-node', 'promoted but still without a mechanism: still ready');
p.mechanism = { what: 'a test', pr: 'x' };
assert.equal(summarize(store, memory).ready.length, 0, 'with a mechanism it leaves the list');

// Prune: only old records whose pattern has a mechanism go to the archive
const archive = { records: [] };
const later = Date.parse(day) + 91 * 24 * 3600 * 1000;
assert.equal(prune(store, archive, memory, Date.parse(day) + 89 * 24 * 3600 * 1000), 0);
assert.equal(prune(fl, { records: [] }, memory, later), 0, 'no mechanism, kept');
assert.equal(prune(store, archive, memory, later), 3);
assert.equal(store.records.length, 0);

console.log('failures: all green');
