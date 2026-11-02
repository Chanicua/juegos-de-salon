#!/usr/bin/env node
/**
 * Merge lanes by blast radius (docs/LANES.md, D-519): which lane a PR takes, from its files alone.
 * The agents' confidence is never an input.
 *
 *   node tools/agents/lanes.mjs check [base]     # this branch against base (origin/main)
 *   node tools/agents/lanes.mjs check --pr <n>   # a PR on GitHub, open or merged
 *   node tools/agents/lanes.mjs ci               # the `lane` job in tests.yml (GitHub Actions only)
 *
 * It prints the lane, the files that set it, what the lane requires and, for the review agents,
 * the stage of covers.mjs (D-304: lab only, a game leaving the lab, the site). The rules are in
 * lanes.json: the first glob that matches a file gives its lane, no match is yellow.
 *
 * In CI, a 🔴 PR gets the `needs-owner` label, a red `owner-approval` status on its head commit and
 * a one-tap decision issue whose Yes is `approve-pr` (approve.mjs) for that commit; 🟢/🟡 get a
 * green `owner-approval` at once. A push after the owner's tick asks again.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONFIG = JSON.parse(readFileSync(join(ROOT, 'tools/agents/lanes.json'), 'utf8'));
export const ORDER = ['green', 'yellow', 'red'];
export const LABEL = 'needs-owner';
export const STATUS = 'owner-approval';

/** A glob as a RegExp: `**` crosses folders (and `**\/` may be empty), `*` does not. */
export function globRe(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i++; } }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const RULES = CONFIG.rules.map(r => ({ ...r, re: globRe(r.glob) }));

/** One file's lane and why: `{ lane, glob, reason }`. Unknown files are yellow, never green. */
export function laneOf(file, rules = RULES) {
  const r = rules.find(x => x.re.test(file));
  return r ? { lane: r.lane, glob: r.glob, reason: r.reason } : { lane: 'yellow', glob: null, reason: 'no rule: unknown files are yellow' };
}

/** A PR's lane: the highest of its files, with the files that set it. No files is green. */
export function laneOfPr(files) {
  const each = files.map(f => ({ file: f, ...laneOf(f) }));
  const lane = each.reduce((top, x) => (ORDER.indexOf(x.lane) > ORDER.indexOf(top) ? x.lane : top), 'green');
  return { lane, by: each.filter(x => x.lane === lane), files: each };
}

/** The report `check` prints. */
export function report({ lane, by }, stageLine) {
  const L = CONFIG.lanes[lane];
  const lines = [`Lane: ${L.icon} ${lane} — ${L.name}`, `Requires: ${L.requires}`, `Set by:`];
  for (const x of by.slice(0, 15)) lines.push(`  ${x.file}  (${x.glob ?? 'no rule'}: ${x.reason})`);
  if (by.length > 15) lines.push(`  … and ${by.length - 15} more`);
  if (stageLine) lines.push(`Stage: ${stageLine}`);
  return lines.join('\n');
}

/** The one-tap decision for a 🔴 PR (processes.mjs decisionsBody's input). */
export function decision(pr, sha, title, by) {
  return {
    title: `Owner approval: PR #${pr}`,
    summary: `PR #${pr} (${title}) is in the 🔴 lane (docs/LANES.md): it never merges on its own.`,
    decisions: [{
      question: `Approve PR #${pr} at ${sha.slice(0, 7)}`,
      context: `Files that make it 🔴:\n${by.slice(0, 10).map(x => `- \`${x.file}\` — ${x.reason}`).join('\n')}\n\nYes turns its \`${STATUS}\` check green for this commit, waits for tests and end-to-end, merges it and publishes the site; a later push asks again. No leaves it blocked.`,
      // Approved means merged: a 🔴 PR has no auto-merge, and an approval alone left PRs waiting
      yes: [{ type: 'approve-pr', pr, sha }, { type: 'merge', pr }],
      no: [{ type: 'nothing' }],
    }],
  };
}

/* ------------------------------------------------------------------ */

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const git = (...a) => run('git', a);
const gh = (...a) => run('gh', a);

async function stageOf(base) {
  const { stage, labsExits, STAGES } = await import('./covers.mjs');
  const files = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
  const exits = labsExits(git('diff', `${base}...HEAD`, '--', 'public/assets/js/games.js', 'public/cup/rules.js'), git('diff', '--name-status', '-M', `${base}...HEAD`));
  return STAGES[stage(files, exits)](exits);
}

const prFiles = n => JSON.parse(gh('api', '--paginate', `repos/{owner}/{repo}/pulls/${n}/files?per_page=100`, '--jq', '[.[].filename]').replace(/\]\s*\[/g, ','));

async function ci() {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const repo = process.env.GITHUB_REPOSITORY, pr = event.pull_request;
  const n = pr.number, sha = pr.head.sha;
  const result = laneOfPr(prFiles(n));
  console.log(report(result));
  const status = (state, description) => gh('api', '-X', 'POST', `repos/${repo}/statuses/${sha}`, '-f', `state=${state}`, '-f', `context=${STATUS}`, '-f', `description=${description}`);
  if (result.lane !== 'red') {
    status('success', `${result.lane} lane: no owner approval needed`);
    try { gh('pr', 'edit', String(n), '-R', repo, '--remove-label', LABEL); } catch { /* it did not have it */ }
    return;
  }
  const statuses = JSON.parse(gh('api', `repos/${repo}/commits/${sha}/statuses`));
  if (statuses.find(s => s.context === STATUS)?.state === 'success' && statuses.find(s => s.context === STATUS)?.description === 'Approved by the owner') {
    console.log('The owner already approved this commit.');
    return;
  }
  try { gh('label', 'create', LABEL, '-R', repo, '--color', 'B60205', '--description', 'Red lane: needs the owner\'s approval (docs/LANES.md)'); } catch { /* exists */ }
  gh('pr', 'edit', String(n), '-R', repo, '--add-label', LABEL);
  status('failure', 'red lane: waiting for the owner tick');
  // One open question per commit: the issue title names the PR, the body the commit
  const open = JSON.parse(gh('issue', 'list', '-R', repo, '--state', 'open', '--label', 'processes', '--search', `"Owner approval: PR #${n}" in:title`, '--json', 'number,body'));
  if (open.some(i => i.body.includes(sha))) { console.log('The question for this commit is already open.'); return; }
  const { decisionsBody } = await import('./processes.mjs');
  const d = decision(n, sha, pr.title, result.by);
  for (const i of open) gh('issue', 'close', String(i.number), '-R', repo, '--comment', `Replaced: the PR changed to ${sha.slice(0, 7)}.`);
  const url = gh('issue', 'create', '-R', repo, '--title', d.title, '--label', 'processes', '--body', decisionsBody(d)).trim();
  gh('pr', 'comment', String(n), '-R', repo, '--body', `🔴 **Red lane** (docs/LANES.md): this PR does not merge until the owner approves it: ${url}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  try {
    if (cmd === 'ci') await ci();
    else if (cmd === 'check' && args[0] === '--pr') console.log(report(laneOfPr(prFiles(Number(args[1])))));
    else if (cmd === 'check') {
      const base = args[0] || 'origin/main';
      const files = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
      console.log(report(laneOfPr(files), await stageOf(base)));
    } else { console.error('Usage: node tools/agents/lanes.mjs check [base] | check --pr <n> | ci'); process.exit(2); }
  } catch (e) { console.error(String(e.stderr || e.message || e)); process.exit(1); }
}
