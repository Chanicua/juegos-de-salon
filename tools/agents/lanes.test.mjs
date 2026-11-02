// Merge lanes by blast radius (docs/LANES.md, D-519): the glob table and the PR lane.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { laneOf, laneOfPr, globRe, decision, report, CONFIG, ORDER } from './lanes.mjs';
import { invalidAction, closesWhenDone } from './approve.mjs';
import { decisionsBody } from './processes.mjs';

// Globs
assert.ok(globRe('docs/**').test('docs/a/b.md'));
assert.ok(globRe('**/*.test.mjs').test('a.test.mjs'));
assert.ok(globRe('**/*.test.mjs').test('tools/x/a.test.mjs'));
assert.ok(!globRe('*.md').test('docs/a.md'));
assert.ok(globRe('firebase/*.rules*').test('firebase/database.rules.json'));

// The table
const cases = {
  'firebase/database.rules.json': 'red',
  'public/privacy/texts.js': 'red',
  'tools/agents/send-mail.py': 'red',
  'tools/agents/feedback.mjs': 'red',
  'tools/push/notify.mjs': 'red',
  '.github/workflows/publish.yml': 'red',
  '.github/workflows/tests.yml': 'red',
  'tools/firebase/stats-retention.mjs': 'red',
  'tools/agents/approve.mjs': 'red',
  'tools/agents/lanes.json': 'red',
  'public/labs/babel/game.js': 'green',
  'docs/LANES.md': 'green',
  'changelog/x.md': 'green',
  'marketing/video/a.mp4': 'green',
  'README.md': 'green',
  'tools/agents/covers.test.mjs': 'green',
  'public/assets/js/i18n.js': 'yellow',
  'public/index.html': 'yellow',
  'public/hangman/game.js': 'yellow',
  'tools/e2e/affected.mjs': 'yellow',
  'tools/agents/covers.mjs': 'yellow',
  'somewhere/new.txt': 'yellow',
};
for (const [f, lane] of Object.entries(cases)) assert.equal(laneOf(f).lane, lane, f);

// Every rule names a lane; every file in the repo gets one; unknown is never green
for (const r of CONFIG.rules) assert.ok(ORDER.includes(r.lane) && r.reason, r.glob);
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
for (const f of files) assert.ok(ORDER.includes(laneOf(f).lane), f);
assert.equal(laneOf('zzz/unknown').glob, null);

// A PR's lane is the highest of its files
assert.equal(laneOfPr([]).lane, 'green');
assert.equal(laneOfPr(['docs/a.md', 'public/labs/x/a.js']).lane, 'green');
assert.equal(laneOfPr(['docs/a.md', 'public/index.html']).lane, 'yellow');
const red = laneOfPr(['docs/a.md', 'public/index.html', 'firebase/database.rules.json']);
assert.equal(red.lane, 'red');
assert.deepEqual(red.by.map(x => x.file), ['firebase/database.rules.json']);
assert.match(report(red, 'x'), /^Lane: 🔴 red/);

// The owner's decision is a valid one-tap issue
const sha = 'b'.repeat(40);
const d = decision(12, sha, 'T', red.by);
assert.equal(invalidAction(d.decisions[0].yes[0]), null);
// Yes approves and then merges: an approved PR is not left waiting (it has no auto-merge)
assert.deepEqual(d.decisions[0].yes.map(a => a.type), ['approve-pr', 'merge']);
assert.equal(invalidAction(d.decisions[0].yes[1]), null);
assert.equal(d.decisions[0].yes[1].pr, 12);
assert.ok(closesWhenDone(d.title), 'its issue closes itself once carried out');
assert.ok(!closesWhenDone('Pending work') && !closesWhenDone('Owner approval: PR #12 and more'));
const body = decisionsBody(d);
assert.ok(body.includes(sha), 'the body names the commit, so a push asks again');
assert.match(body, /approve-pr/);

console.log('lanes ok');
