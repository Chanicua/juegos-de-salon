#!/usr/bin/env node
/**
 * The CI failure log (D-518): every red `tests` or `end-to-end` run on a PR becomes a record, the
 * records are grouped by a deterministic signature, and a signature seen on two PRs reaches the
 * processes round as "ready for a mechanism" (D-273).
 *
 *   node tools/agents/failures.mjs capture --log <file> --store <failures.json> --check <tests|end-to-end> --run <id> --commit <sha> --branch <b> [--pr <n>]
 *   node tools/agents/failures.mjs link --store <failures.json> --check <c> --commit <sha> --branch <b> [--pr <n>]
 *   node tools/agents/failures.mjs prune --store <failures.json> --archive <archive.json>
 *   node tools/agents/failures.mjs classify [<file.log>]   # the signatures of a log, without storing
 *   node tools/agents/failures.mjs check                   # ready and flaky signatures (also in processes.mjs check)
 *   node tools/agents/failures.mjs promote <signature> <key>   # makes it a processes.mjs pattern
 *
 * `capture`, `link` and `prune` are run by `.github/workflows/failure-log.yml` on the `failure-log`
 * branch, which holds only `failures.json` and `archive.json` (why not main or Firebase: D-518).
 * `check` and `promote` run in the round: they read that branch with `git show origin/failure-log:…`
 * and write only `docs/processes.json`. No model is involved: same signature, same pattern.
 * Only CI logs go in: never owner or player data.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BRANCH = 'failure-log';
const REPO = 'ellokojavi/juegos-de-salon';
const DAY = 24 * 3600 * 1000;
/** Records older than this whose pattern already has a mechanism go to archive.json. */
export const KEEP_DAYS = 90;
/** Distinct PRs a signature needs before the round is asked for a mechanism. */
export const READY = 2;

/* ------------------------------------------------------------------ */
/* Pure logic (tested by failures.test.mjs)                           */
/* ------------------------------------------------------------------ */

/** The error text without what changes from run to run: paths, line numbers, hashes, times, durations. */
export function normalize(text) {
  return String(text)
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, '<time>')
    .replace(/\b\d{4}-\d\d-\d\d\b/g, '<date>')
    .replace(/\b\d\d:\d\d(:\d\d(\.\d+)?)?\b/g, '<time>')
    .replace(/(file:\/\/)?\/?([\w.@-]+\/)+([\w.@-]+)/g, '$3')
    .replace(/(\.m?[jt]sx?|\.py|\.html|\.json):\d+(:\d+)?/g, '$1')
    .replace(/\bline \d+\b/gi, 'line <n>')
    .replace(/\b[0-9a-f]{7,40}\b/g, '<hash>')
    .replace(/\b\d+(\.\d+)?\s?(ms|s|px)\b/g, '<n>$2')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Same test and same normalized error, same signature: 10 hex characters. */
export function signature(test, error) {
  return createHash('sha1').update(`${test}\n${normalize(error)}`).digest('hex').slice(0, 10);
}

/** A line of `gh run view --log-failed` is "job<TAB>step<TAB>time text": the text alone. */
const text = line => line.replace(/^[^\t]*\t[^\t]*\t\S+Z ?/, '');
const NOISE = /^\s+at |^Node\.js v|^\s*\^?\s*$|^##\[(endgroup|group)\]/;
const ERRORISH = /✗|\bERROR\b|Error\b|AssertionError|assert|expected|FAIL|Cannot|not defined|not a function|Timeout/i;

/**
 * The failing tests of a failed run's log, each with its first error lines. `tests` marks a failure
 * with `##[error]<file> failed` at the end of the file's group; the end-to-end scripts start with
 * `▶ <script>` and end, when red, with `##[error]exited with 1: ✗ <what failed>`.
 */
export function parseLog(log) {
  const failures = [];
  let current = null, lines = [], step = null, stepLines = [];
  for (const raw of String(log).split('\n')) {
    const t = text(raw);
    const s = raw.split('\t')[1];
    if (s !== step) { step = s; stepLines = []; }
    let m;
    // A step that failed with no test of its own (the README check, a lint): the step is the test
    if (/^##\[error\]Process completed with exit code/.test(t)) {
      if (step && !failures.some(f => f.step === step)) failures.push({ test: step, error: excerpt(stepLines), step, bare: true });
      continue;
    }
    if (!NOISE.test(t)) stepLines.push(t);
    if ((m = t.match(/^##\[group\](\S+\.(?:m?js|py))\s*$/))) { current = m[1]; lines = []; continue; }
    if ((m = t.match(/^▶ (\S+)/))) { current = m[1]; lines = []; continue; }
    if ((m = t.match(/^##\[error\](\S+) failed\s*$/))) {
      failures.push({ test: m[1], error: excerpt(lines), step });
      continue;
    }
    if ((m = t.match(/^##\[error\]exited with \d+: (.*)$/)) && current) {
      if (!failures.some(f => f.test === current)) failures.push({ test: current, error: m[1].trim() || excerpt(lines), step });
      continue;
    }
    if (current && !NOISE.test(t)) lines.push(t);
  }
  // A step with no test of its own counts only when no test failed: end-to-end's gate job ("Run echo
  // \"list: success · scripts: failure\"") fails whenever a script does, and is not a failure of its own
  const tests = failures.filter(f => !f.bare);
  return (tests.length ? tests : failures).map(({ test, error }) => ({ test, error }));
}

/** The first three lines that look like an error, or the last three lines when none does. */
export function excerpt(lines) {
  const errs = lines.filter(l => ERRORISH.test(l) && !/^✓/.test(l.trim()));
  return (errs.length ? errs.slice(0, 3) : lines.slice(-3)).map(l => l.trim()).join('\n').slice(0, 500);
}

const emptyLog = () => ({ records: [] });
const prKey = r => (r.pr ? `#${r.pr}` : r.branch);

/** Adds one record per failing test of a run (a run seen twice is not added twice). Returns those added. */
export function capture(store, failures, { check, run, commit, branch, pr = null, date }) {
  const added = [];
  for (const f of failures) {
    if (store.records.some(r => r.run === run && r.test === f.test)) continue;
    const r = { run, check, pr, branch, commit, test: f.test, error: f.error, signature: signature(f.test, f.error), date, fix: null, flaky: false };
    store.records.push(r);
    added.push(r);
  }
  return added;
}

/**
 * The same PR passed the same check: each of its open records gets its outcome. Passing on the very
 * commit that failed, with no change, is flaky; on a later commit, that commit is the fix, with what
 * it changed (`stat(from, to)`: the files and lines from the failed commit to the green one).
 */
export function link(store, { check, commit, branch, pr = null, date }, stat = () => null) {
  const open = store.records.filter(r => r.check === check && !r.fix && !r.flaky && (pr ? r.pr === pr : r.branch === branch));
  for (const r of open) {
    if (r.commit === commit) r.flaky = true;
    else r.fix = { commit, date, stat: stat(r.commit, commit) };
  }
  return open;
}

/** The patterns of docs/processes.json that a signature was promoted to. */
const patternOf = (memory, sig) => (memory?.patterns || []).find(p => (p.signatures || []).includes(sig));

/**
 * The signatures to look at: `ready` are real failures (not flaky) seen on at least READY distinct
 * PRs whose pattern has no mechanism yet; `flaky` are those that passed on the same commit, counted
 * apart (flakiness is its own pattern: fix or quarantine the test).
 */
export function summarize(store, memory) {
  const groups = new Map();
  for (const r of store.records) {
    const g = groups.get(r.signature) || { signature: r.signature, test: r.test, error: r.error, check: r.check, real: [], flaky: [] };
    (r.flaky ? g.flaky : g.real).push(r);
    groups.set(r.signature, g);
  }
  const ready = [], flaky = [], watching = [];
  for (const g of groups.values()) {
    const p = patternOf(memory, g.signature);
    g.pattern = p?.key || null;
    g.prs = [...new Set(g.real.map(prKey))];
    if (p?.mechanism) continue;
    if (g.prs.length >= READY) ready.push(g);
    else if (g.real.length) watching.push(g);
    if (g.flaky.length) flaky.push(g);
  }
  const byCount = (a, b) => b.prs.length - a.prs.length || b.flaky.length - a.flaky.length;
  return { ready: ready.sort(byCount), flaky: flaky.sort(byCount), watching };
}

/** Records older than KEEP_DAYS whose pattern has a mechanism leave the log for the archive. */
export function prune(store, archive, memory, now = Date.now()) {
  const old = r => now - Date.parse(r.date) > KEEP_DAYS * DAY && patternOf(memory, r.signature)?.mechanism;
  const moved = store.records.filter(old);
  store.records = store.records.filter(r => !old(r));
  archive.records.push(...moved);
  return moved.length;
}

/** Records a promoted signature as a processes.mjs pattern: one sighting per PR, the signature remembered. */
export function promote(store, memory, sig, key, { date }) {
  const rs = store.records.filter(r => r.signature === sig);
  if (!rs.length) throw new Error(`No record has the signature ${sig}.`);
  let p = memory.patterns.find(x => x.key === key);
  if (!p) memory.patterns.push(p = { key, what: `CI ${rs[0].check}: ${rs[0].test} · ${rs[0].error.split('\n')[0]}`, seen: [], mechanism: null });
  p.signatures = [...new Set([...(p.signatures || []), sig])];
  for (const r of rs) if (!p.seen.some(v => v.commit === r.commit)) p.seen.push({ date: r.date, what: `${prKey(r)} ${r.check}: ${r.test}`, commit: r.commit });
  return p;
}

const link_ = r => (r.pr ? `https://github.com/${REPO}/pull/${r.pr}` : r.branch);
const runUrl = r => `https://github.com/${REPO}/actions/runs/${r.run}`;

/** The lines processes.mjs check prints for the failure log. */
export function report({ ready, flaky }) {
  const out = [];
  if (!ready.length) out.push('No CI failure seen on two PRs without a mechanism.');
  for (const g of ready) {
    out.push(`- ⚠️ READY FOR A MECHANISM \`${g.signature}\` · ${g.check} · ${g.test} · ${g.prs.length} PRs${g.pattern ? ` (pattern ${g.pattern})` : ''}: ${g.error.split('\n')[0]}`);
    for (const r of g.real) out.push(`    - ${r.date.slice(0, 10)} ${link_(r)} · run ${runUrl(r)}${r.fix ? ` · fixed by ${r.fix.commit.slice(0, 7)}${r.fix.stat ? ` (${r.fix.stat})` : ''}` : ' · not fixed yet'}`);
  }
  for (const g of flaky) out.push(`- 🎲 flaky \`${g.signature}\` · ${g.check} · ${g.test} · passed on the same commit ${g.flaky.length} time(s): fix or quarantine the test. ${g.flaky.map(runUrl).join(' ')}`);
  if (ready.length) out.push('→ For each one: node tools/agents/failures.mjs promote <signature> <key>, then a mechanism (a test before an instruction) and processes.mjs mechanism <key> "…" --pr <url>.');
  return out;
}

/* ------------------------------------------------------------------ */
/* What reads files, git and GitHub                                   */
/* ------------------------------------------------------------------ */

const readJson = (file, empty) => (existsSync(file) ? { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) } : empty());
const writeJson = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const flag = (args, name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const memoryFile = () => join(ROOT, 'docs/processes.json');
const readMemory = () => readJson(memoryFile(), () => ({ patterns: [] }));

/** The log on the failure-log branch, as GitHub has it now. */
export function loadRemote() {
  try { sh('git', ['fetch', '-q', 'origin', BRANCH]); } catch { /* not created yet */ }
  try { return { ...emptyLog(), ...JSON.parse(sh('git', ['show', `origin/${BRANCH}:failures.json`])) }; } catch { return emptyLog(); }
}

/** What changed from the failed commit to the green one, from GitHub's compare (the CI checkout may not have them). */
function compareStat(from, to) {
  try {
    const c = JSON.parse(sh('gh', ['api', `repos/${REPO}/compare/${from}...${to}`]));
    const files = c.files || [];
    const add = files.reduce((s, f) => s + f.additions, 0), del = files.reduce((s, f) => s + f.deletions, 0);
    return `${files.length} file(s) +${add} −${del}: ${files.slice(0, 5).map(f => f.filename).join(', ')}${files.length > 5 ? ', …' : ''}`;
  } catch { return null; }
}

function runArgs(args) {
  const pr = flag(args, '--pr');
  return { check: flag(args, '--check'), run: Number(flag(args, '--run')) || null, commit: flag(args, '--commit'), branch: flag(args, '--branch'), pr: pr ? Number(pr) : null, date: new Date().toISOString() };
}

function main([command, ...args]) {
  switch (command) {
    case 'capture': {
      const store = flag(args, '--store'), log = flag(args, '--log'), o = runArgs(args);
      if (!store || !log || !o.check || !o.commit) throw new Error('Usage: capture --log <file> --store <file> --check <c> --run <id> --commit <sha> --branch <b> [--pr <n>]');
      const s = readJson(store, emptyLog);
      let failures = parseLog(readFileSync(log, 'utf8'));
      if (!failures.length) failures = [{ test: `(${o.check})`, error: 'no failing test found in the log' }];
      const added = capture(s, failures, o);
      writeJson(store, s);
      for (const r of added) console.log(`${r.signature} ${r.test}: ${r.error.split('\n')[0]}`);
      return;
    }
    case 'link': {
      const store = flag(args, '--store'), o = runArgs(args);
      if (!store || !o.check || !o.commit) throw new Error('Usage: link --store <file> --check <c> --commit <sha> --branch <b> [--pr <n>]');
      const s = readJson(store, emptyLog);
      const done = link(s, o, compareStat);
      writeJson(store, s);
      for (const r of done) console.log(`${r.signature} ${r.test}: ${r.flaky ? 'flaky' : `fixed by ${o.commit.slice(0, 7)}`}`);
      return;
    }
    case 'prune': {
      const store = flag(args, '--store'), arch = flag(args, '--archive');
      const s = readJson(store, emptyLog), a = readJson(arch, emptyLog);
      const n = prune(s, a, readMemory());
      if (n) { writeJson(store, s); writeJson(arch, a); }
      return console.log(`${n} record(s) archived.`);
    }
    case 'classify': {
      const log = readFileSync(args[0] || 0, 'utf8');
      for (const f of parseLog(log)) console.log(`${signature(f.test, f.error)} ${f.test}\n  ${normalize(f.error)}`);
      return;
    }
    case 'check':
      return console.log(report(summarize(loadRemote(), readMemory())).join('\n'));
    case 'promote': {
      const [sig, key] = args;
      if (!sig || !key) throw new Error('Usage: promote <signature> <key>');
      const m = JSON.parse(readFileSync(memoryFile(), 'utf8'));
      const p = promote(loadRemote(), m, sig, key, { date: new Date().toISOString().slice(0, 10) });
      writeJson(memoryFile(), m);
      return console.log(`${key}: seen ${p.seen.length} time(s); now give it a mechanism (processes.mjs mechanism ${key} "…" --pr <url>).`);
    }
    default:
      console.error('Usage: node tools/agents/failures.mjs capture | link | prune | classify [log] | check | promote <signature> <key>');
      process.exit(2);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(1); }
}
