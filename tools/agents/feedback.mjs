#!/usr/bin/env node
/**
 * The 🐞 feedback as GitHub issues (D-275): each report people send from La Copa or the lab
 * (`feedback/` in Firebase, D-104, D-191, D-265) becomes an issue with the `feedback` label, and
 * the processes agent handles it in its round. The Mac mini's `feedback-watch` job (D-382) runs it every 5
 * minutes: that way each report reaches the owner by email and stays linked to its reply and its fix.
 *
 *   node tools/agents/feedback.mjs sync [--dry-run]   # creates the missing issues
 *   node tools/agents/feedback.mjs pending                                   # who is waiting, grouped by player (D-317)
 *   node tools/agents/feedback.mjs reply <n>[,<n>…] <answer.txt> --lang <es|en|pt> [--dry-run | --test-to <address>]
 *                                                                         # one email for all of a player's comments
 *   node tools/agents/feedback.mjs forget <issue> "<reason>"                 # deletes the address, no email
 *   node tools/agents/feedback.mjs expire [--dry-run]                       # deletes the addresses older than 90 days (D-463)
 *   node tools/agents/feedback.mjs repro <issue> <test path>                # the test that reproduces a bug report (D-527)
 *
 * A bug report starts with a failing test (D-527): a `feedback:problem` issue gets its `reply` only
 * once `repro` recorded the test that reproduces it (named after the issue, `#<n>` inside it), or
 * with `reply … --no-repro "<why>"` (not reproducible, device-specific…), which the issue records.
 *
 * Optional email (D-317): a player who wants to hear back leaves an address. The issue only shows
 * its mask (`j********n@g********m`, D-366); the address lives in `feedbackContacto/<id>`, readable only
 * with the owner's key, so `reply` and `forget` run on the owner's Mac mini (the processes round),
 * never in a workflow (its logs are public). `reply` sends the message through Gmail's SMTP
 * (`send-mail.py`), wrapped in one of the friendly templates of `feedback-templates.mjs`, in the
 * language the feedback was written in, deletes the address and notes it on the issue; `forget` (destructive feedback,
 * no email) only deletes it. Either way the address is gone after the issue is resolved. And an
 * address nobody answered does not stay forever (D-463): after `RETENTION_DAYS` (90) it is deleted
 * by `expire`, which `sync` runs on every pass of the `feedback-watch` job, and the issue says so.
 *
 * The repo is public: the issue carries the text as is, the game, the version and the screen, and
 * the name the player gave, so the owner can follow up (D-279), but not their browser. Each issue
 * carries `<!-- feedback:<id> -->`, and `feedbackIssues/<id>` in Firebase (admin only) records the issue
 * each report got: that record, not GitHub's issue list, says what is already up. GitHub's list
 * comes back empty or partial at random (2026-10-22: 0, 62 or 80 issues for the same query, and 60
 * reports re-uploaded), so the markers it shows only add to the record, never take from it.
 * The report's fields (`texto`, `nombre`, `contexto`, and inside it `juego`, `copa`…) are Firebase
 * data and keep their names.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { firebaseConfig } from '../../public/assets/js/firebase-config.js';
import { correoValido as validEmail, enmascararNombre as maskName } from '../../public/cup/reportes.js';

export const LABEL = 'feedback';

/** The optional kind the player picked (D-345) → a second label on the issue; anything else, none. */
export const KIND_LABELS = { sugerencia: 'feedback:suggestion', problema: 'feedback:problem', idea: 'feedback:game-idea', otro: 'feedback:other' };
export const labelsOf = r => [LABEL, ...(KIND_LABELS[r?.tipo] ? [KIND_LABELS[r.tipo]] : [])];
const REPO = process.env.GITHUB_REPOSITORY || 'ellokojavi/juegos-de-salon';
const SITE = 'https://juegosdesalon.cl';

/* ------------------------------------------------------------------ */
/* Pure logic (tested by tools/agents/feedback.test.mjs)              */
/* ------------------------------------------------------------------ */

export const marker = id => `<!-- feedback:${id} -->`;
/** Notes on the issue that the address was used and deleted, or deleted without an email (D-317). */
export const EMAILED = '<!-- feedback-emailed -->', FORGOTTEN = '<!-- feedback-address-deleted -->';

/** The report id of an issue, from its marker. */
export const idOf = body => /<!-- feedback:([^\s>]+) -->/.exec(body || '')?.[1] || null;
/** Does the issue's player want an email reply? (the issue shows the mask) */
export const wantsEmail = body => /^- \*\*Email:\*\* /m.test(body || '');
export const REPLIED = 'replied';
/** Is this report the email the reply answers in its thread? Then the player already sees it (D-370). */
export const inThread = (x, thread) => !!(thread?.id && x.thread?.id === thread.id);
/** The comment left on an issue once its reply is emailed: what the player was told, quoted (D-368). */
export const emailedComment = ({ mask, together = '', answer = '' }) =>
  `📧 Reply emailed to \`${mask}\`${together}; the address was then deleted (D-317). Marked replied and closed as resolved (D-368).` +
  (answer.trim() ? `\n\nWhat we answered:\n\n${answer.trim().split('\n').map(l => `> ${l}`).join('\n')}` : '') + `\n${EMAILED}`;
/**
 * Retention of the optional email (D-463): an address still in `feedbackContacto/` this many days
 * after it was left is deleted, replied or not. The form promises it (`DIAS_CORREO` in
 * `public/assets/js/buzon-form.js`, the same number) and the privacy page says it.
 */
export const RETENTION_DAYS = 90;
/** The report ids whose address is older than the retention (or carries no date), oldest first. */
export const expired = (contacts, now = Date.now(), days = RETENTION_DAYS) => Object.entries(contacts || {})
  .filter(([, c]) => !(Number(c?.at) > now - days * 86400000))
  .sort(([, a], [, b]) => (Number(a?.at) || 0) - (Number(b?.at) || 0)).map(([id]) => id);
/** The comment on the issue whose address expired: the processes agent no longer has anyone to email. */
export const expiredComment = (days = RETENTION_DAYS) =>
  `No reply within ${days} days: the player's email address was deleted (D-463). Answer here if needed; no email can be sent any more.\n${FORGOTTEN}`;

/* A bug report starts with a failing test (D-527) */
export const PROBLEM = KIND_LABELS.problema;
export const REPRO = '<!-- feedback-repro -->', NO_REPRO = '<!-- feedback-no-repro -->';
/** The comment that links an issue to the test reproducing it. */
export const reproComment = path => `🧪 Reproduced by \`${path}\`: it failed before the fix and passes with it (D-527).\n${REPRO}`;
/** The comment that says why a bug report has no reproducing test. */
export const noReproComment = why => `🧪 No reproducing test: ${String(why).trim()} (D-527).\n${NO_REPRO}`;
/** The test file must name the issue (`#<n>`), so it stays tied to it and `affected.mjs` keeps it with its game. */
export const namesIssue = (source, n) => new RegExp(`#${n}(?!\\d)`).test(String(source || ''));
/** The repro record on an issue: `{ path }`, `{ why }` or null (the latest one wins). */
export function reproOf(comments) {
  for (const c of [...(comments || [])].reverse()) {
    const b = c?.body || '';
    if (b.includes(REPRO)) return { path: /`([^`]+)`/.exec(b)?.[1] || '' };
    if (b.includes(NO_REPRO)) return { why: /No reproducing test: ([\s\S]*?) \(D-527\)/.exec(b)?.[1] || '' };
  }
  return null;
}
/** Why `reply` must refuse this issue, or null: a bug report needs its repro or a `--no-repro` reason. */
export function needsRepro(issue, noRepro = '') {
  if (!(issue?.labels || []).some(l => l.name === PROBLEM)) return null;
  if (reproOf(issue.comments) || String(noRepro || '').trim()) return null;
  return `#${issue.number}: a bug report starts with a failing test (D-527). Record it with \`feedback.mjs repro ${issue.number} <test>\`, or reply with --no-repro "<why>".`;
}

/** Already emailed or forgotten? */
export const handled = comments => (comments || []).some(c => (c.body || '').includes(EMAILED) || (c.body || '').includes(FORGOTTEN));

/**
 * The agent's answers, one per issue. With one issue, the file is just the answer; with several,
 * each answer goes under a line `#<n>`. Plain text, and no dashes as punctuation (owner's request,
 * D-317). Returns `{ <n>: answer }`.
 */
export function readAnswers(t, numbers) {
  const text = String(t || '').trim();
  if (!text) throw new Error('The answer file is empty.');
  if (/[—–]/.test(text)) throw new Error('No em or en dashes in the reply: use a comma, a colon or a period.');
  const parts = text.split(/^#(\d+)[ \t]*$/m);
  if (parts.length === 1) {
    if (numbers.length > 1) throw new Error(`Several issues: put each answer under a line "#<n>" (${numbers.map(n => `#${n}`).join(', ')}).`);
    return { [numbers[0]]: text };
  }
  if (parts[0].trim()) throw new Error('Text before the first "#<n>" line.');
  const r = {};
  for (let i = 1; i < parts.length; i += 2) r[parts[i]] = parts[i + 1].trim();
  const missing = numbers.filter(n => !r[n]), extra = Object.keys(r).filter(n => !numbers.includes(n));
  if (missing.length || extra.length) throw new Error(`Answers don't match the issues: missing ${missing.map(n => `#${n}`).join(', ') || 'none'}, extra ${extra.map(n => `#${n}`).join(', ') || 'none'}.`);
  return r;
}

/** What the player wrote, from the issue's quote (without the zero-width spaces of `inert`). */
export const textOf = body => (body || '').split('\n').filter(l => l.startsWith('> ')).map(l => l.slice(2)).join('\n').replace(/\u200b/g, '').trim();

/** The name the player gave, from the issue (`Who`, or `Quién` in the issues from before D-316; without the zero-width spaces of `inert`). */
export const nameOf = body => (/^- \*\*(?:Who|Quién):\*\* (.+)$/m.exec(body || '')?.[1] || '').replace(/\u200b/g, '').trim();

/** The name the reply greets: the report's own (the issue shows it masked, D-366), never a mask. */
export const greetingName = (report, body) => String(report?.nombre || '').trim() || (nameOf(body).includes('*') ? '' : nameOf(body));

/** The report ids that already have an issue, read from the bodies. */
export const uploaded = issues => new Set(issues.flatMap(i => [...(i.body || '').matchAll(/<!-- feedback:([^\s>]+) -->/g)].map(m => m[1])));

/** The issues GitHub showed that `feedbackIssues/` does not have yet: id → its first issue. */
export function unrecorded(issues, ledger) {
  const out = {};
  for (const i of issues) for (const m of (i.body || '').matchAll(/<!-- feedback:([^\s>]+) -->/g))
    if (!ledger?.[m[1]] && i.number && (!out[m[1]] || i.number < out[m[1]])) out[m[1]] = i.number;
  return out;
}

/** The reports without an issue, oldest to newest (so the issue numbers follow the order). */
export const pending = (reports, already) => reports.filter(r => r.id && !already.has(r.id) && String(r.texto || '').trim()).sort((a, b) => (a.at || 0) - (b.at || 0));

/**
 * Whether the issue list GitHub returned looks short: many reports at once, most of what Firebase
 * holds, is what an empty or partial answer looks like, not a burst of players. On 2026-10-22 two
 * such answers re-uploaded 20 handled reports twice. Real reports arrive a few at a time.
 */
export const looksShort = (reports, fresh) => fresh.length >= 5 && fresh.length * 2 >= reports.length;

const context = r => { try { return JSON.parse(r.contexto || '{}') || {}; } catch { return {}; } };

/** Where it was written, in a few words: the game or the page. */
export function where(r) {
  const c = context(r);
  if (c.canal === 'email') return 'email';
  return c.juego || (c.labs && `lab ${c.labs}`) || (c.copa && `cup ${c.copa}`) || c.pantalla || c.url || 'the app';
}

/**
 * Whether a text looks like it carries a secret: a private key, a service account, a token. The
 * repo is public and the support agent reads strangers' emails, so a report like this is never
 * posted (`sync` logs it instead) nor accepted by `inbox.mjs ingest`. Long runs of letters and
 * digits count only with both in them, so long words, game codes and URLs pass.
 */
export function secretLike(text) {
  const t = String(text || '');
  if (/private_key|-----BEGIN [A-Z ]*-----|"type"\s*:\s*"service_account"|client_secret|refresh_token|"password"\s*:/i.test(t)) return true;
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,})/.test(t)) return true;
  return (t.match(/[A-Za-z0-9+_=-]{32,}/g) || []).some(w => /[0-9]/.test(w) && /[A-Za-z]/.test(w) && !/^[a-z]+(?:-[a-z]+)+$/i.test(w));
}

/**
 * A player's own email address or phone number written inside the text is hidden before it reaches
 * the public issue: the repo is public, and the address a player wants a reply at already lives
 * apart, in `feedbackContacto/` (D-317). A phone is a run of 8 or more digits with spaces, dots,
 * dashes or brackets between them; dates (2026-10-27) are left alone.
 */
export function hideContacts(text) {
  return String(text)
    .replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu, '[email hidden]')
    .replace(/(?<![\w-])\+?\(?\d[\d\s().-]{6,}\d(?![\w-])/g, m =>
      /^\d{4}-\d{2}-\d{2}$/.test(m) || (m.match(/\d/g) || []).length < 8 ? m : '[phone hidden]');
}

/** A player's @ or # mentions no one and links nothing. */
const inert = t => String(t).replace(/@/g, '@​').replace(/#(\d)/g, '#​$1');

export function title(r) {
  const t = inert(hideContacts(r.texto).replace(/\s+/g, ' ').trim());
  return `🐞 ${where(r)}: ${t.length > 70 ? `${t.slice(0, 69)}…` : t}`;
}

/** The mask as the rules let it in (D-317; D-366's, or the older one from a cached app), inside a code span: it can't mention or link anything. */
const mask = m => (/^(?:.\*{8}@\*{8}.|.\*{8}.@.\*{8}.)$/u.test(String(m || '')) ? String(m).replace(/`/g, "'") : null);

/** The body: the text as is, who sent it and the context, without the browser. */
export function body(r) {
  const c = context(r);
  const date = r.at ? new Date(r.at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : 'no date';
  const data = [
    ['Who', r.nombre && maskName(r.nombre)], ['Kind', r.tipo && KIND_LABELS[r.tipo]?.slice(9)], ['Lab key', r.tester && String(r.tester).trim()], ['Game', c.juego], ['Lab', c.labs], ['Cup', c.copa], ['Day', c.dia], ['Seed', c.semilla],
    ['Result', c.resumen ?? c.puntaje], ['Mistakes', c.errores], ['Hints', c.ayudas], ['Time', c.tiempo],
    ['Page', c.url && (String(c.url).startsWith('/') ? `${SITE}${c.url}` : c.url)], ['Screen', c.pantalla], ['Window size', c.pantallaTam], ['Version', r.v && `v${r.v}`], ['Date', date],
    ['Email', mask(r.correoMascara) && `\`${mask(r.correoMascara)}\` (wants a reply by email: the processes agent sends it when resolving, D-317)`],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');
  return [
    inert(hideContacts(r.texto).trim()).split('\n').map(l => `> ${l}`).join('\n'),
    '',
    data.map(([k, v]) => `- **${k}:** ${k === 'Email' ? v : inert(v)}`).join('\n'),
    '',
    c.canal === 'email'
      ? 'Arrived by email to hola@juegosdesalon.cl (D-318): the text above is the support agent\'s quote or summary of it. The processes agent handles it in its round.'
      : 'Sent with the app\'s feedback form (D-275, D-345). The processes agent handles it in its round.',
    marker(r.id),
  ].join('\n');
}

/* ------------------------------------------------------------------ */

/**
 * Where each report stands, for the panel's 💬 Feedback section: its issue (open or closed, replied
 * or not) and the PRs that close it or name it (`#n` in their body), with their state. Written to
 * `feedbackEstado/<id>` (owner-only) on every `sync` pass; a report whose issue GitHub's list left
 * out keeps the last status written (PATCH, never PUT: the list comes back partial at random).
 */
export function statusOf(issues, prs) {
  const byIssue = new Map();
  for (const p of prs || []) {
    const ns = new Set([...(p.closingIssuesReferences || []).map(r => r.number), ...[...String(p.body || '').matchAll(/#(\d+)\b/g)].map(m => Number(m[1]))]);
    for (const n of ns) {
      if (!byIssue.has(n)) byIssue.set(n, []);
      byIssue.get(n).push({ n: p.number, state: String(p.state || '').toLowerCase(), title: String(p.title || '').slice(0, 140) });
    }
  }
  const out = {};
  for (const i of issues || []) {
    const id = idOf(i.body);
    if (!id) continue;
    out[id] = {
      issue: i.number,
      state: String(i.state || '').toLowerCase(),
      replied: (i.labels || []).some(l => l.name === REPLIED),
      prs: (byIssue.get(i.number) || []).sort((a, b) => a.n - b.n),
    };
  }
  return out;
}

const gh = (...args) => execFileSync('gh', [...args, '-R', REPO], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Most issues one `sync` pass creates (#849). */
export const MAX_PER_RUN = 20;
/** The reports this pass uploads (oldest first, at most MAX_PER_RUN) and the warning when some wait. */
export function firstBatch(fresh, max = MAX_PER_RUN) {
  if (fresh.length <= max) return { batch: fresh, warning: null };
  return { batch: fresh.slice(0, max), warning: `⚠️ ${fresh.length} new report(s): uploading the first ${max}, the rest wait for the next pass. That many at once is unusual: look at feedback/ in Firebase.` };
}

async function sync(dryRun) {
  // feedback/ is readable only by the owner: read it with the admin key, like feedbackIssues/
  const { read, write } = await import('../firebase/firebase-admin.mjs');
  const t = await adminToken();
  const reports = Object.entries((await read('feedback', t)) || {}).map(([id, r]) => ({ id, ...r }));
  const ledger = (await read('feedbackIssues', t)) || {};
  const list = () => JSON.parse(gh('issue', 'list', '--label', LABEL, '--state', 'all', '--limit', '1000', '--json', 'number,body,state,labels'));
  const issues = list();
  // What GitHub shows and the record lacks goes into the record (the issues from before it existed)
  const missing = unrecorded(issues, ledger);
  if (Object.keys(missing).length && !dryRun) await write('feedbackIssues', 'PATCH', missing, t);
  Object.assign(ledger, missing);
  // Each report's issue and PRs, for the panel's 💬 Feedback section
  try {
    const prs = JSON.parse(gh('pr', 'list', '--state', 'all', '--limit', '400', '--json', 'number,state,title,body,closingIssuesReferences'));
    const status = statusOf(issues, prs);
    if (Object.keys(status).length && !dryRun) await write('feedbackEstado', 'PATCH', status, t);
  } catch (e) { console.warn(`⚠️ feedbackEstado not updated: ${e.message}`); }
  const known = new Set([...Object.keys(ledger), ...uploaded(issues)]);
  let fresh = pending(reports, known);
  if (looksShort(reports, fresh)) {
    // Ask again: a second short answer is not trusted either, and the next run tries once more.
    for (const id of uploaded(list())) known.add(id);
    fresh = pending(reports, known);
    if (looksShort(reports, fresh) && !process.argv.includes('--force'))
      throw new Error(`${fresh.length} of ${reports.length} report(s) without an issue: GitHub's issue list looks incomplete, nothing uploaded (--force if they really are new).`);
  }
  if (!fresh.length) return console.log(`Nothing new (${reports.length} report(s), all with an issue).`);
  // At most MAX_PER_RUN issues per pass (#849): the rest wait for the next pass, oldest first.
  const { batch, warning } = firstBatch(fresh);
  if (warning) console.warn(warning);
  fresh = batch;
  if (dryRun) { for (const r of fresh) console.log(secretLike(`${title(r)}\n${body(r)}`) ? `⚠️ ${r.id}: looks like it carries a key or a token, would not be posted\n` : `${title(r)}\n${body(r)}\n`); return; }
  const exists = JSON.parse(gh('label', 'list', '--limit', '200', '--json', 'name')).some(l => l.name === LABEL);
  if (!exists) gh('label', 'create', LABEL, '--color', 'd93f0b', '--description', 'A player\'s 🐞 report (D-275)');
  const have = new Set(JSON.parse(gh('label', 'list', '--limit', '200', '--json', 'name')).map(l => l.name));
  for (const name of Object.values(KIND_LABELS)) if (!have.has(name)) gh('label', 'create', name, '--color', 'c5def5', '--description', 'The kind the player picked in the inbox (D-345)');
  for (const r of fresh) {
    if (secretLike(`${title(r)}\n${body(r)}`)) { console.error(`⚠️ report ${r.id} looks like it carries a key or a token: not posted. Look at feedback/${r.id} in Firebase and delete it.`); continue; }
    const url = gh('issue', 'create', '--title', title(r), '--label', labelsOf(r).join(','), '--body', body(r)).trim();
    await write('feedbackIssues', 'PATCH', { [r.id]: Number(url.split('/').pop()) }, t);
    console.log(url);
  }
}

/* ------------------------------------------------------------------ */
/* The email reply (D-317): only on the owner's machine                */
/* ------------------------------------------------------------------ */

async function contactOf(number, t, test = false) {
  const issue = JSON.parse(gh('issue', 'view', String(number), '--json', 'body,comments,labels,state'));
  if (!issue.labels.some(l => l.name === LABEL)) throw new Error(`#${number} is not a feedback issue.`);
  const id = idOf(issue.body);
  if (!id) throw new Error(`#${number} has no feedback marker.`);
  // A test only needs the comment: it goes to the test address, not to the player
  if (!test && !wantsEmail(issue.body)) throw new Error(`#${number}: the player left no email.`);
  if (!test && handled(issue.comments)) throw new Error(`#${number}: already emailed or the address was already deleted.`);
  const c = t ? await (await import('../firebase/firebase-admin.mjs')).read(`feedbackContacto/${id}`, t) : null;
  // The issue shows the name masked (D-366): the greeting takes it from the report itself
  const report = t ? await (await import('../firebase/firebase-admin.mjs')).read(`feedback/${id}`, t) : null;
  return { issue: { number, labels: issue.labels, comments: issue.comments }, number: String(number), id, email: c?.correo || null, name: greetingName(report, issue.body), text: textOf(issue.body), thread: c?.idMensaje ? { id: c.idMensaje, subject: c.asunto || '' } : null, state: issue.state, mask: /\*\*Email:\*\* `([^`]+)`/.exec(issue.body)?.[1] || '' };
}

const adminToken = async () => (await import('../firebase/firebase-admin.mjs')).token();

async function remove(id, t) {
  const res = await fetch(`${firebaseConfig.databaseURL}/feedbackContacto/${encodeURIComponent(id)}.json?access_token=${encodeURIComponent(t)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Could not delete feedbackContacto/${id} (HTTP ${res.status}).`);
}

/**
 * One email for one or more comments of the same player (owner's request: a long session leaves
 * several, and N emails for N comments is too many). Every issue must carry the same address.
 * `testTo`: send it to that address instead, without reading or deleting any address or touching
 * the issues (to see how a real reply looks).
 */
async function reply(list, file, lang, { dryRun, testTo, noRepro }) {
  const { readFileSync } = await import('node:fs');
  const { buildEmail } = await import('./feedback-templates.mjs');
  const numbers = String(list).split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean);
  if (!numbers.length || numbers.some(n => !/^\d+$/.test(n))) throw new Error(`Issues as numbers separated by commas, not "${list}".`);
  const answers = readAnswers(readFileSync(file, 'utf8'), numbers);
  if (testTo && !validEmail(testTo)) throw new Error(`--test-to needs an address, not "${testTo}".`);
  const t = testTo ? null : await adminToken();
  const all = [];
  for (const n of numbers) all.push(await contactOf(n, t, !!testTo));
  if (!testTo) {
    const blocked = all.map(x => needsRepro(x.issue, noRepro)).filter(Boolean);
    if (blocked.length) throw new Error(blocked.join('\n'));
    const without = all.filter(x => !x.email);
    if (without.length) throw new Error(`No address in feedbackContacto/ for ${without.map(x => `#${x.number}`).join(', ')} (already deleted?).`);
    if (new Set(all.map(x => x.email.toLowerCase())).size > 1) throw new Error(`Not the same player: ${all.map(x => `#${x.number} ${x.mask}`).join(', ')}. One email per address.`);
  }
  const name = all.map(x => x.name).find(Boolean) || '';
  // An emailed report: answer in the sender's own thread (D-327)
  const thread = testTo ? null : all.map(x => x.thread).find(Boolean);
  // The player sees their own email right above in that thread, so it is not quoted again; a 🐞
  // report, or an email from another thread, still is (D-370)
  const items = all.map(x => ({ quote: inThread(x, thread) ? '' : x.text, answer: answers[x.number] }));
  const { subject, text, html } = buildEmail({ lang, name, n: Number(numbers[0]), items });
  const to = testTo || all[0].email;
  const finalSubject = thread?.subject ? (/^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`) : subject;
  if (dryRun) { console.log(`To: ${testTo || all[0].mask}\nSubject: ${testTo ? subject : finalSubject}${thread ? `\nIn-Reply-To: ${thread.id}` : ''}\n\n${text}`); return; }
  // Through stdin: the address never shows in a command line or a log
  execFileSync('python3', [fileURLToPath(new URL('./send-mail.py', import.meta.url))], { input: JSON.stringify({ to, subject: testTo ? `[Test] ${subject}` : finalSubject, inReplyTo: thread?.id || null, text, html, issues: numbers.map(Number), test: !!testTo }), stdio: ['pipe', 'inherit', 'inherit'] });
  if (testTo) { console.log(`Test email with ${numbers.map(n => `#${n}`).join(', ')} sent to the test address; nothing else touched.`); return; }
  try { gh('label', 'create', REPLIED, '--color', '0e8a16', '--description', 'Feedback answered by email and resolved (D-368)'); } catch { /* already there */ }
  for (const x of all) {
    if (noRepro && x.issue.labels.some(l => l.name === PROBLEM) && !reproOf(x.issue.comments)) gh('issue', 'comment', x.number, '--body', noReproComment(noRepro));
    await remove(x.id, t);
    const together = all.length > 1 ? ` in one email together with ${all.filter(y => y !== x).map(y => `#${y.number}`).join(', ')}` : '';
    // The record of what was answered, then replied and resolved (D-368): the issue says what the player was told
    gh('issue', 'comment', x.number, '--body', emailedComment({ mask: x.mask, together, answer: answers[x.number] }));
    gh('issue', 'edit', x.number, '--add-label', REPLIED);
    gh('issue', 'close', x.number, '--reason', 'completed');
  }
  console.log(`${numbers.map(n => `#${n}`).join(', ')}: one email to ${all[0].mask}, addresses deleted.`);
}

/** Records the test that reproduces a bug report (D-527): it must exist and name the issue. */
async function repro(number, path) {
  const { readFileSync, existsSync } = await import('node:fs');
  const n = String(number).replace(/^#/, '');
  if (!/^\d+$/.test(n)) throw new Error(`An issue number, not "${number}".`);
  if (!existsSync(path)) throw new Error(`No test at ${path}.`);
  if (!namesIssue(readFileSync(path, 'utf8'), n)) throw new Error(`${path} must name the issue (#${n}) so it stays tied to it.`);
  const issue = JSON.parse(gh('issue', 'view', n, '--json', 'labels'));
  if (!issue.labels.some(l => l.name === LABEL)) throw new Error(`#${n} is not a feedback issue.`);
  gh('issue', 'comment', n, '--body', reproComment(path));
  console.log(`#${n}: reproduced by ${path}.`);
}

/** Feedback issues waiting for an email reply, grouped by player (by the address, read with the key). */
async function pendingEmails() {
  const issues = JSON.parse(gh('issue', 'list', '--label', LABEL, '--state', 'all', '--limit', '200', '--json', 'number,title,body,comments,state'))
    .filter(i => wantsEmail(i.body) && !handled(i.comments));
  if (!issues.length) return console.log('Nobody waiting for an email reply.');
  const t = await adminToken();
  const { read } = await import('../firebase/firebase-admin.mjs');
  const groups = new Map();
  for (const i of issues.reverse()) {
    const c = await read(`feedbackContacto/${idOf(i.body)}`, t);
    const key = c?.correo?.toLowerCase() || `(no address) #${i.number}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  for (const [key, list] of groups) {
    const mask = /\*\*Email:\*\* `([^`]+)`/.exec(list[0].body)?.[1] || '?';
    const open = list.filter(i => i.state === 'OPEN').length;
    console.log(`- ${key.startsWith('(') ? key : mask}${nameOf(list[0].body) ? ` (${nameOf(list[0].body)})` : ''}: ${list.map(i => `#${i.number}${i.state === 'OPEN' ? ' (open)' : ''}`).join(', ')}`);
    console.log(`  ${open ? `${open} still open: resolve them first, then` : 'all resolved:'} feedback.mjs reply ${list.map(i => i.number).join(',')} <answer.txt> --lang <xx>`);
  }
}

async function forget(number, reason) {
  if (!reason) throw new Error('Say why there is no email (e.g. "destructive feedback").');
  const t = await adminToken();
  const { id, mask } = await contactOf(number, t);
  await remove(id, t);
  gh('issue', 'comment', String(number), '--body', `No email reply (${inert(reason)}); the address \`${mask}\` was deleted (D-317).\n${FORGOTTEN}`);
  console.log(`#${number}: address deleted, no email.`);
}

/**
 * Deletes every address older than `RETENTION_DAYS` (D-463) and notes it on its issue, so `pending`
 * stops listing it. Runs after each `sync` (the `feedback-watch` job, every 5 minutes) and alone.
 */
async function expire(dryRun) {
  const t = await adminToken();
  const { read } = await import('../firebase/firebase-admin.mjs');
  // Shallow would hide `at`: the node holds a few small entries, so it is read whole
  const ids = expired((await read('feedbackContacto', t)) || {});
  if (!ids.length) return;
  const ledger = (await read('feedbackIssues', t)) || {};
  for (const id of ids) {
    const n = ledger[id];
    if (dryRun) { console.log(`Would delete feedbackContacto/${id}${n ? ` (#${n})` : ''}: older than ${RETENTION_DAYS} days.`); continue; }
    await remove(id, t);
    // The address is gone either way; the note is best-effort
    if (n) try {
      if (!handled(JSON.parse(gh('issue', 'view', String(n), '--json', 'comments')).comments)) gh('issue', 'comment', String(n), '--body', expiredComment());
    } catch (e) { console.error(`#${n}: address deleted, but the note failed (${e.message}).`); }
    console.log(`feedbackContacto/${id}${n ? ` (#${n})` : ''}: no reply in ${RETENTION_DAYS} days, address deleted (D-463).`);
  }
}

/* ------------------------------------------------------------------ */
/* A doubt about the reply (D-328): details by email, a public pointer */
/* ------------------------------------------------------------------ */

export const DOUBT_LABEL = 'support-doubt';
/** The subject of the owner's email, and the Gmail search that finds it: no private detail in either. */
export const doubtSubject = n => `[JdS duda ${n}] ¿Cómo respondemos este reporte?`;
export const gmailSearch = n => `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`subject:"JdS duda ${n}"`)}`;

/**
 * The processes agent doesn't know how to answer a report: the doubt, its draft and the report's
 * text go privately to the owner's email (the issue is public), and a public issue only points to
 * it, with a Gmail link that opens that email.
 */
async function doubt(number, file) {
  const { readFileSync } = await import('node:fs');
  const notes = readFileSync(file, 'utf8').trim();
  if (!notes) throw new Error('Write the doubt and your draft reply in the file.');
  const { text } = await contactOf(number, null, true);
  const n = String(number);
  const body = `${notes}\n\n---\nEl reporte #${n}:\n«${text}»\n\nhttps://github.com/${REPO}/issues/${n}\n\nResponde en el issue de la duda (sin detalles privados: "envía el borrador", "no respondas" o un texto nuevo), o díselo a una sesión de Claude.`;
  execFileSync('python3', [fileURLToPath(new URL('./send-mail.py', import.meta.url))], { input: JSON.stringify({ toOwner: true, subject: doubtSubject(n), text: body, issues: [Number(n)] }), stdio: ['pipe', 'inherit', 'inherit'] });
  const labels = JSON.parse(gh('label', 'list', '--limit', '200', '--json', 'name'));
  if (!labels.some(l => l.name === DOUBT_LABEL)) gh('label', 'create', DOUBT_LABEL, '--color', 'fbca04', '--description', 'How to answer a report: details in the owner\'s email (D-328)');
  const url = gh('issue', 'create', '--label', DOUBT_LABEL, '--title', `Support doubt: how to answer #${n}`, '--body',
    `The processes agent isn't sure how to answer #${n}. The details (the doubt, a draft and the report) went to the owner's email, not here: this repo is public (D-328).\n\n📧 [Open the email in Gmail](${gmailSearch(n)})\n\nAnswer here without private details ("send the draft", "don't reply", or a new text); the next round carries it out and closes this issue.`).trim();
  gh('issue', 'comment', n, '--body', `Waiting for the owner on how to answer: ${url}`);
  console.log(`#${n}: doubt emailed to the owner; ${url}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, a, b] = process.argv.slice(2);
  const option = n => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
  const fail = e => { console.error(e.message); process.exit(1); };
  // Each pass of the job also applies the email's retention (D-463), even when the upload fails
  if (command === 'sync') sync(process.argv.includes('--dry-run')).catch(e => { console.error(e.message); process.exitCode = 1; }).then(() => expire(process.argv.includes('--dry-run'))).catch(fail);
  else if (command === 'expire') expire(process.argv.includes('--dry-run')).catch(fail);
  else if (command === 'pending') pendingEmails().catch(fail);
  else if (command === 'reply' && a && b && option('--lang')) reply(a, b, option('--lang'), { dryRun: process.argv.includes('--dry-run'), testTo: option('--test-to'), noRepro: option('--no-repro') }).catch(fail);
  else if (command === 'repro' && a && b) repro(a, b).catch(fail);
  else if (command === 'forget' && a) forget(a, b).catch(fail);
  else if (command === 'doubt' && a && b) doubt(a, b).catch(fail);
  else { console.error('Usage: node tools/agents/feedback.mjs sync [--dry-run] | pending | reply <n>[,<n>…] <answer.txt> --lang <es|en|pt> [--dry-run | --test-to <address>] [--no-repro "<why>"] | repro <issue> <test> | forget <issue> "<reason>" | expire [--dry-run] | doubt <issue> <notes.txt>'); process.exit(2); }
}
