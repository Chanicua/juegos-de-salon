#!/usr/bin/env node
/**
 * One-tap decisions (D-273): the processes agent opens an issue with "Yes" and "No" checkboxes,
 * and when the owner checks one, `.github/workflows/approve.yml` runs this and does what that
 * checkbox says, with no model in between.
 *
 *   node tools/agents/approve.mjs                          # in GitHub Actions: reads $GITHUB_EVENT_PATH
 *   node tools/agents/approve.mjs --dry-run <event.json>   # says what it would do, does nothing
 *
 * The issue carries each option on a line `- [ ] Yes <!-- op:1:si -->` and, at the end, the
 * actions of each option in a `<!-- acciones {...} -->` block (written by `processes.mjs decide`).
 * The markers (`op:n:si`, `op:n:pub` for "Yes, and publish" (D-409), `op:n:no`, `hecho:n`, `acciones`) stay in Spanish: parsing depends only
 * on them, so issues opened before D-316 (in Spanish) still work. Actions are written in English
 * (`{ type: 'merge', pr }`); the Spanish ones of older issues (`{ tipo: 'fusionar', pr }`) are
 * read through `normalizeAction`.
 * It only obeys if:
 *   - whoever checked the box is the owner (OWNER), the issue has the `processes` label (or the
 *     old `procesos`) and was opened by the workflows bot (`decide.yml`, so GitHub emails the
 *     owner) or by the owner;
 *   - the actions block did not change in the same edit (a checked box cannot bring new actions);
 *   - the decision had not been made before (`<!-- hecho:1 -->`);
 *   - each action is in the closed list (`invalidAction`).
 * When done, it writes the result on the decision's line and comments on the issue. Those edits
 * are made with the workflow token, which does not wake another workflow.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const OWNER = 'ellokojavi';
/** Who may open a decisions issue: the bot (so GitHub notifies the owner) or the owner. */
export const AUTHORS = [OWNER, 'github-actions[bot]', 'app/github-actions'];
export const LABEL = 'processes';
/** Labels that count as the decisions label: the current one and the one before D-316. */
export const LABELS = [LABEL, 'procesos'];
/** The workflows a checkbox may re-run on main. */
export const WORKFLOWS = ['e2e.yml', 'publish.yml'];
/** The commit status a 🔴 PR needs from the owner (docs/LANES.md); the lane job sets it red. */
export const APPROVAL = 'owner-approval';

/* ------------------------------------------------------------------ */
/* Pure logic (tested by tools/agents/approve.test.mjs)               */
/* ------------------------------------------------------------------ */

/** Spanish action types and fields (issues opened before D-316) → English. */
const OLD_TYPES = { fusionar: 'merge', 'cerrar-pr': 'close-pr', 'cerrar-issue': 'close-issue', comentar: 'comment', correr: 'run', encolar: 'queue', nada: 'nothing' };
const OLD_FIELDS = { tipo: 'type', motivo: 'reason', en: 'on', texto: 'text', tarea: 'task' };

/** An action with English type and fields, whatever language it was written in. */
export function normalizeAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) return action;
  const out = {};
  for (const [k, v] of Object.entries(action)) out[OLD_FIELDS[k] || k] = v;
  if (OLD_TYPES[out.type]) out.type = OLD_TYPES[out.type];
  return out;
}

/** The issue's actions block, normalized: `{ "1:si": [ {type, …} ], … }`, or null if missing or unreadable. */
export function readActions(body = '') {
  const m = body.match(/<!-- acciones (\{[\s\S]*?\}) -->/);
  if (!m) return null;
  let raw;
  try { raw = JSON.parse(m[1]); } catch { return null; }
  if (!raw || typeof raw !== 'object') return null;
  return Object.fromEntries(Object.entries(raw).map(([op, list]) => [op, Array.isArray(list) ? list.map(normalizeAction) : list]));
}

/** The issue's checkboxes: `{ "1:si": true, "1:no": false, … }`. */
export function checkboxes(body = '') {
  const res = {};
  for (const m of body.matchAll(/^\s*[-*] \[( |x|X)\] .*?<!-- op:(\d+:[a-z]+) -->/gm)) res[m[2]] = m[1] !== ' ';
  return res;
}

/** The decisions already carried out (`<!-- hecho:1 -->`). */
export const doneSet = (body = '') => new Set([...body.matchAll(/<!-- hecho:(\d+) -->/g)].map(m => m[1]));

/** The decisions of the issue not made yet: those in the actions block without `<!-- hecho:n -->`. */
export function undecided(body = '') {
  const done = doneSet(body);
  return [...new Set(Object.keys(readActions(body) || {}).map(op => op.split(':')[0]))].filter(n => !done.has(n));
}

/**
 * The body with decision n settled without a box (D-411): what it asked was already done or no
 * longer applies, so no Yes or No is checked, which would carry something out or record the wrong
 * answer. A line goes under its options with the note, and the decision counts as made.
 */
export function settle(body, decision, note) {
  if (doneSet(body).has(String(decision))) return body;
  const lines = body.split('\n');
  const last = lines.map((l, i) => (new RegExp(`<!-- op:${decision}:[a-z]+ -->`).test(l) ? i : -1)).filter(i => i >= 0).pop();
  if (last === undefined) throw new Error(`the issue has no decision ${decision}`);
  lines.splice(last + 1, 0, `- ✔️ No answer needed, nothing was carried out: ${String(note).trim()} <!-- hecho:${decision} -->`);
  return lines.join('\n');
}

/** The decision whose actions queue `task` (an idea's, `ideas <id>:`), ignoring the [labs]/[publish] mark, or null. */
export function decisionQueuing(body, startsWith) {
  for (const [op, list] of Object.entries(readActions(body) || {})) {
    if (list.some(a => a.type === 'queue' && String(a.task).replace(/^\[(labs|publish)\] /, '').startsWith(startsWith))) return op.split(':')[0];
  }
  return null;
}

/** The text of question n (`### n. …`), so the comment makes sense without opening the issue. */
export function question(body = '', n) {
  return body.match(new RegExp(`^###\\s+${n}\\.\\s+(.+)$`, 'm'))?.[1].trim() || `Decision ${n}`;
}

/** The options that went from empty to checked between two versions of the body. */
export function newlyChecked(before, after) {
  const a = checkboxes(before), d = checkboxes(after);
  return Object.keys(d).filter(k => d[k] && !a[k]);
}

/** Why an action is not in the closed list, or null if it is. Accepts Spanish or English actions. */
export function invalidAction(action) {
  const n = x => Number.isInteger(x) && x > 0;
  const a = normalizeAction(action);
  if (!a || typeof a !== 'object') return 'not an action';
  switch (a.type) {
    case 'merge': case 'close-pr': return n(a.pr) ? null : `${a.type} without a PR number`;
    case 'close-issue': return n(a.issue) ? null : 'close-issue without an issue number';
    case 'comment': return n(a.on) && typeof a.text === 'string' && a.text.trim() ? null : 'comment without a target or text';
    case 'run': return WORKFLOWS.includes(a.workflow) ? null : `run: only ${WORKFLOWS.join(' or ')}`;
    case 'queue': return typeof a.task === 'string' && a.task.trim() ? null : 'queue without a task';
    // The owner's tick on a 🔴 PR (docs/LANES.md): green owner-approval status on that exact commit
    case 'approve-pr': return n(a.pr) && /^[0-9a-f]{40}$/.test(a.sha || '') ? null : 'approve-pr without a PR number and a full commit sha';
    case 'nothing': return null;
    default: return `unknown action: ${a.type}`;
  }
}

/**
 * The checked boxes that still have no result next to them: those of a run GitHub cancelled.
 * With three boxes checked almost at once, GitHub keeps one run in progress and one pending, and
 * cancels the ones in between: without this, those decisions were lost.
 */
export function checkedWithoutResult(body = '') {
  const res = [];
  for (const m of body.matchAll(/^\s*[-*] \[[xX]\] .*?<!-- op:(\d+:[a-z]+) -->(.*)$/gm)) if (!m[2].trim()) res.push(m[1]);
  return res;
}

const yesNo = option => ({ si: 'Yes', pub: 'Yes, and publish', no: 'No' })[option] || option;

/**
 * What to do with an `issues.edited` event: `{ ignore: reason }` or `{ plans: [{ decision, option,
 * actions }], warnings: [] }`. It touches nothing: its choices can be tested with made-up events.
 * `current` is the body as it is when running (it may be newer than the event's): the decisions
 * already made and the boxes left without a result come from it.
 */
export function plan(event, owner = OWNER, current = event?.issue?.body) {
  const { action, issue, sender, changes } = event || {};
  if (action !== 'edited') return { ignore: 'not an edit' };
  if (!issue?.labels?.some(l => LABELS.includes(l.name))) return { ignore: `the issue does not have the ${LABEL} label` };
  if (issue.state !== 'open') return { ignore: 'the issue is closed' };
  if (sender?.login !== owner) return { ignore: `edited by ${sender?.login}, not ${owner}` };
  if (![owner, ...AUTHORS.slice(1)].includes(issue.user?.login)) return { ignore: `the issue was opened by ${issue.user?.login}: only those opened by the bot or ${owner} count` };
  const before = changes?.body?.from;
  if (typeof before !== 'string') return { ignore: 'the edit did not change the body' };
  const actions = readActions(issue.body);
  if (!actions) return { ignore: 'the issue has no actions block' };
  if (JSON.stringify(readActions(before)) !== JSON.stringify(actions)) return { ignore: 'the actions block changed in the same edit' };

  const alreadyDone = new Set([...doneSet(before), ...doneSet(current)]), plans = [], warnings = [], taken = new Set();
  const ops = [...new Set([...newlyChecked(before, issue.body), ...checkedWithoutResult(current)])];
  for (const op of ops) {
    const [decision, option] = op.split(':');
    if (alreadyDone.has(decision) || taken.has(decision)) { warnings.push(`${question(before, decision)}: already answered, so the new ${yesNo(option)} was not carried out.`); continue; }
    const list = actions[op];
    if (!Array.isArray(list)) { warnings.push(`${question(before, decision)}: the ${yesNo(option)} has no actions.`); continue; }
    const bad = list.map(invalidAction).filter(Boolean);
    if (bad.length) { warnings.push(`${question(before, decision)}: the ${yesNo(option)} was not carried out (${bad.join('; ')}).`); continue; }
    taken.add(decision);
    plans.push({ decision, option, actions: list });
  }
  if (!plans.length && !warnings.length) return { ignore: 'no new checkbox was checked' };
  return { plans, warnings };
}

/**
 * The body with the result at the end of the option's line (replacing that of an earlier
 * attempt). If it succeeded, the decision is made (`<!-- hecho:n -->`); if it failed, it is not:
 * unchecking and checking the box again retries it.
 */
export function recordDone(body, decision, option, result, made = true) {
  const re = new RegExp(`^(\\s*[-*] \\[[xX ]\\] .*?<!-- op:${decision}:${option} -->).*$`, 'm');
  return body.replace(re, (_, line) => `${line} — ${result}${made ? ` <!-- hecho:${decision} -->` : ''}`);
}

/* ------------------------------------------------------------------ */
/* What touches GitHub                                                */
/** An owner-approval issue (docs/LANES.md) closes itself once its tick has been carried out. */
export const closesWhenDone = (title = '') => /^Owner approval: PR #\d+$/.test(title);

/* ------------------------------------------------------------------ */

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45 * 60 * 1000 });

/**
 * One action, with the workflow token. A merge made with that token does not wake publish.yml
 * (GitHub does not chain workflows with it), so `merge` runs it by hand afterwards; publish.yml
 * already runs the end-to-end tests before publishing (D-302).
 */
function perform(action, repo) {
  const a = normalizeAction(action);
  const R = ['-R', repo];
  switch (a.type) {
    case 'merge': {
      const pr = JSON.parse(gh('pr', 'view', String(a.pr), ...R, '--json', 'state,baseRefName'));
      if (pr.state === 'MERGED') return `#${a.pr} was already merged`;
      if (pr.state !== 'OPEN') throw new Error(`#${a.pr} is closed: not merged`);
      if (pr.baseRefName !== 'main') throw new Error(`#${a.pr} targets ${pr.baseRefName}, not main`);
      // Waits for the required checks (tests and end-to-end, D-216); if one fails, it does not merge.
      try { gh('pr', 'checks', String(a.pr), ...R, '--required', '--watch', '--fail-fast', '--interval', '30'); }
      catch (e) { throw new Error(`the checks of #${a.pr} did not pass`); }
      // No --delete-branch: GitHub deletes the branch (the repo has it enabled) and so retargets
      // the PRs stacked on it to main. Deleted by hand, GitHub closes them (it happened to #303).
      // A conflict with main is reported as such: it used to say "Command failed" without the cause (#331).
      const mergeable = JSON.parse(gh('pr', 'view', String(a.pr), ...R, '--json', 'mergeable')).mergeable;
      if (mergeable === 'CONFLICTING') throw new Error(`#${a.pr} conflicts with main: it needs updating`);
      gh('pr', 'merge', String(a.pr), ...R, '--merge');
      // publish.yml runs the tests and the end-to-end suite before publishing (D-302): that is enough
      gh('workflow', 'run', 'publish.yml', ...R, '--ref', 'main');
      return `#${a.pr} merged; the site is being published`;
    }
    case 'close-pr':
      gh('pr', 'close', String(a.pr), ...R, ...(a.reason ? ['--comment', a.reason] : []));
      return `#${a.pr} closed`;
    case 'close-issue':
      gh('issue', 'close', String(a.issue), ...R, ...(a.reason ? ['--comment', a.reason] : []));
      return `#${a.issue} closed`;
    case 'comment':
      gh('issue', 'comment', String(a.on), ...R, '--body', a.text);
      return `commented on #${a.on}`;
    case 'run':
      gh('workflow', 'run', a.workflow, ...R, '--ref', 'main');
      return a.workflow === 'publish.yml' ? 'the site is being published' : 'running the end-to-end tests';
    case 'approve-pr': {
      // Only the commit the owner was asked about: a push after the question needs a new tick
      const pr = JSON.parse(gh('pr', 'view', String(a.pr), ...R, '--json', 'state,headRefOid'));
      if (pr.state !== 'OPEN') throw new Error(`#${a.pr} is not open`);
      if (pr.headRefOid !== a.sha) throw new Error(`#${a.pr} changed since the question (${a.sha.slice(0, 7)} → ${pr.headRefOid.slice(0, 7)}): its lane job asks again`);
      gh('api', '-X', 'POST', `repos/${repo}/statuses/${a.sha}`, '-f', 'state=success', '-f', `context=${APPROVAL}`, '-f', 'description=Approved by the owner');
      return `#${a.pr} approved by the owner`;
    }
    case 'queue':
      return `queued for the next round: ${a.task}`;
    case 'nothing':
      return 'noted';
  }
}

function main() {
  const i = process.argv.indexOf('--dry-run');
  const dryRun = i > 0;
  const path = dryRun ? process.argv[i + 1] : process.env.GITHUB_EVENT_PATH;
  if (!path) { console.error('Usage: node tools/agents/approve.mjs [--dry-run <event.json>]'); process.exit(2); }
  const event = JSON.parse(readFileSync(path, 'utf8'));
  // The current body: an earlier run may have written results after this event
  const current = dryRun ? event.issue.body : JSON.parse(gh('issue', 'view', String(event.issue.number), '-R', process.env.GITHUB_REPOSITORY, '--json', 'body')).body;
  const p = plan(event, OWNER, current);
  if (p.ignore) { console.log(`Nothing to do: ${p.ignore}.`); return; }
  if (dryRun) { console.log(JSON.stringify(p, null, 2)); return; }

  const repo = process.env.GITHUB_REPOSITORY, n = String(event.issue.number);
  const lines = [...p.warnings.map(w => `⚠️ ${w}`)];
  let failed = false;
  for (const { decision, option, actions } of p.plans) {
    const done = [];
    let result, ok = true;
    try {
      for (const a of actions) done.push(perform(a, repo));
      result = `✅ ${done.join('; ')}`;
    } catch (e) {
      failed = true; ok = false;
      // The reason is in what gh wrote to stderr, not in "Command failed: …"
      const why = String(e.stderr || '').trim().split('\n').filter(Boolean).pop() || String(e.message || e).split('\n')[0];
      result = `❌ ${[...done, why].join('; ')}`;
    }
    lines.push(`**${question(event.issue.body, decision)}** ${yesNo(option)}. ${result}`);
    // Re-read the body before writing: another box may have been checked while this ran.
    const body = JSON.parse(gh('issue', 'view', n, '-R', repo, '--json', 'body')).body;
    gh('issue', 'edit', n, '-R', repo, '--body', recordDone(body, decision, option, result.split(';')[0], ok));
  }
  if (failed) lines.push('', 'To retry what failed, uncheck the box and check it again.');
  gh('issue', 'comment', n, '-R', repo, '--body', lines.join('\n'));
  // The PR is merged (or the owner said No): nothing is left to decide, so the question goes away
  if (!failed && closesWhenDone(event.issue.title)) gh('issue', 'close', n, '-R', repo, '--reason', 'completed');
  console.log(lines.join('\n'));
  if (failed) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
