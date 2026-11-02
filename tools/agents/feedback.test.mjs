// The 🐞 feedback as issues (D-275, D-279): with the name and without the browser, without mentions, and never the same report twice.
import assert from 'node:assert/strict';
import { greetingName, title, body, pending, uploaded, unrecorded, looksShort, marker, where, idOf, wantsEmail, handled, readAnswers, textOf, nameOf, EMAILED, FORGOTTEN, firstBatch, MAX_PER_RUN, hideContacts } from './feedback.mjs';

const r = {
  id: '-P3bm', at: Date.parse('2026-10-10T18:28:23Z'), v: '0.144.0', nombre: 'Tu admirador secreto',
  texto: 'Se podrian auto tachar las pistas ya usadas. @alguien mira el #12',
  contexto: JSON.stringify({ juego: 'caso', semilla: 'HEJWN', resumen: '75/100', tiempo: '4:59', url: '/labs/case/?labs', pantallaTam: '448×891', navegador: 'Mozilla/5.0 (Linux; Android 10)' }),
};

const c = body(r);
assert.match(c, /\*\*Who:\*\* T\* a\*{8} s\*{6}$/m, 'the name masked, each word by its first letter (D-279, D-366)');
assert.doesNotMatch(c, /admirador/, 'never the full name on the public issue (D-366)');
assert.doesNotMatch(body({ ...r, nombre: undefined }), /Who/, 'without a name, without the line');
assert.match(body({ ...r, tester: 'ratoncito' }), /\*\*Lab key:\*\* ratoncito/, 'with the label of the lab key (D-306)');
assert.doesNotMatch(c, /Mozilla|Android/, 'without the browser');
assert.match(c, /^> Se podrian auto tachar/, 'the text as is, quoted');
assert.match(c, /\*\*Game:\*\* caso/);
assert.match(c, /\*\*Version:\*\* v0\.144\.0/);
assert.match(c, /2026-10-10 18:28 UTC/);
assert.ok(c.endsWith(marker('-P3bm')));
assert.doesNotMatch(c, /@alguien|#12/, "a player's @ or # neither mentions nor links");
assert.match(title(r), /^🐞 caso: Se podrian/);
assert.ok(title({ ...r, texto: 'x'.repeat(200) }).length < 90, 'the title is cut');

// Where, with whatever there is
assert.equal(where({ contexto: '{"labs":"de"}' }), 'lab de');
assert.equal(where({ contexto: 'no es json' }), 'the app');

// Never twice, nor empty ones, oldest to newest
const already = uploaded([{ body: `something\n${marker('a')}` }, { body: null }]);
assert.deepEqual([...already], ['a']);
const list = [{ id: 'a', texto: 'x', at: 1 }, { id: 'c', texto: 'z', at: 3 }, { id: 'b', texto: 'y', at: 2 }, { id: 'd', texto: '  ', at: 4 }];
assert.deepEqual(pending(list, already).map(x => x.id), ['b', 'c']);

// The optional email (D-317): the issue shows the mask, never an address, and says it wants a reply
const withEmail = body({ ...r, correoMascara: 'j********n@g********m' });
assert.match(withEmail, /^- \*\*Email:\*\* `j\*{8}n@g\*{8}m`/m);
assert.match(body({ ...r, correoMascara: 'j********@********m' }), /`j\*{8}@\*{8}m`/, 'the older mask, from a cached app, still shows');
assert.doesNotMatch(body({ ...r, correoMascara: 'jirigoyen@gmail.com' }), /Email/, 'never an address');
assert.ok(wantsEmail(withEmail) && !wantsEmail(c));
assert.equal(idOf(withEmail), '-P3bm');
assert.ok(!handled([]) && !handled([{ body: 'thanks' }]));
assert.ok(handled([{ body: `📧 sent\n${EMAILED}` }]) && handled([{ body: FORGOTTEN }]));
// One answer, or one per issue under "#<n>" (several comments of a player in one email)
assert.deepEqual(readAnswers('  Ya está arreglado.\n', ['383']), { 383: 'Ya está arreglado.' });
assert.deepEqual(readAnswers('#383\nUno.\n\n#401\nDos,\nen dos líneas.\n', ['383', '401']), { 383: 'Uno.', 401: 'Dos,\nen dos líneas.' });
assert.throws(() => readAnswers('Ya está — arreglado.', ['1']), /dash/);
assert.throws(() => readAnswers('   ', ['1']));
assert.throws(() => readAnswers('Una sola para dos', ['1', '2']), /#<n>/);
assert.throws(() => readAnswers('#1\nUno.', ['1', '2']), /missing #2/);
assert.throws(() => readAnswers('#1\nUno.\n#3\nTres.', ['1']), /extra #3/);
assert.throws(() => readAnswers('Hola\n#1\nUno.', ['1']), /before/);
assert.equal(textOf('> uno\n> dos\n\n- x'), 'uno\ndos');
assert.equal(textOf(c), 'Se podrian auto tachar las pistas ya usadas. @alguien mira el #12');
assert.equal(nameOf(withEmail), 'T* a******** s******');
assert.equal(nameOf('> hola\n\n- **Quién:** Cris\n- **Juego:** loteo'), 'Cris', 'issues from before D-316 say Quién');
assert.equal(nameOf(body({ ...r, nombre: '@cris' })), '@****');
assert.equal(nameOf(body({ ...r, nombre: '' })), '');

// A report that arrived by email to hola@ (D-318) says so
const byEmail = { ...r, contexto: JSON.stringify({ canal: 'email', idioma: 'es' }) };
assert.equal(where(byEmail), 'email');
assert.match(body(byEmail), /Arrived by email to hola@juegosdesalon\.cl/);
assert.doesNotMatch(body(byEmail), /🐞 button/);
assert.match(title(byEmail), /^🐞 email: /);

console.log('feedback: ok');

// D-328: the doubt's public pointer carries no private detail, only the issue number
{
  const { doubtSubject, gmailSearch } = await import('./feedback.mjs');
  if (!doubtSubject(435).startsWith('[JdS duda 435]')) throw new Error('doubt subject');
  if (decodeURIComponent(gmailSearch(435).split('#search/')[1]) !== 'subject:"JdS duda 435"') throw new Error('gmail search');
  console.log('feedback doubt: ok');
}

// The inbox's kind (D-345): a known one adds its label, an unknown one or none adds nothing
{
  const { labelsOf, KIND_LABELS } = await import('./feedback.mjs');
  assert.deepEqual(labelsOf({ texto: 'x' }), ['feedback'], 'without a kind, only feedback');
  assert.deepEqual(labelsOf({ texto: 'x', tipo: 'idea' }), ['feedback', 'feedback:game-idea'], 'a game idea gets its label');
  assert.deepEqual(labelsOf({ texto: 'x', tipo: 'hack' }), ['feedback'], 'an unknown kind adds nothing');
  assert.deepEqual(Object.keys(KIND_LABELS).sort(), ['idea', 'otro', 'problema', 'sugerencia'], 'the same list the rules accept');
}

// The reply greets with the real name from the report, never the issue's mask (D-366)
assert.equal(greetingName({ nombre: ' Tu admirador secreto ' }, c), 'Tu admirador secreto');
assert.equal(greetingName(null, c), '', 'no report: no name, never the mask');
assert.equal(greetingName(null, '- **Quién:** Cris'), 'Cris', 'an old issue with the name unmasked');

// The emailed comment quotes what the player was told and still marks the issue handled (D-368)
{
  const { emailedComment, handled } = await import('./feedback.mjs');
  const body = emailedComment({ mask: 'c****o@g****m', answer: 'Line one.\nLine two.' });
  assert.ok(body.includes('> Line one.\n> Line two.'), 'quotes the answer');
  assert.ok(body.includes('closed as resolved'), 'says it was resolved');
  assert.ok(!body.includes('@g****m`') || body.includes('c****o@g****m'), 'only the mask');
  assert.ok(handled([{ body }]), 'counts as handled');
}

// In the sender's own thread the email is not quoted again; outside it, it is (D-370)
{
  const { inThread } = await import('./feedback.mjs');
  const thread = { id: '<a@mail>', subject: 'Hola' };
  assert.equal(inThread({ thread }, thread), true, 'the email of the thread');
  assert.equal(inThread({ thread: null }, thread), false, 'a 🐞 report');
  assert.equal(inThread({ thread: { id: '<b@mail>' } }, thread), false, 'another thread');
  assert.equal(inThread({ thread }, null), false, 'no thread (test email)');
}

// An empty or partial issue list is not taken as 20 new reports (2026-10-22: 40 duplicates)
const twenty = Array.from({ length: 20 }, (_, i) => ({ id: `r${i}`, texto: 'x', at: i }));
assert.ok(looksShort(twenty, pending(twenty, uploaded([]))), 'an empty list uploads nothing');
assert.ok(!looksShort(twenty, twenty.slice(0, 2)), 'two new reports go up');
assert.ok(!looksShort(twenty.slice(0, 3), twenty.slice(0, 3)), 'the first few reports ever go up');

// The Firebase record keeps each report's first issue, and what GitHub shows only adds to it
const dup = [{ number: 683, body: marker('a') }, { number: 312, body: marker('a') }, { number: 9, body: marker('b') }, { number: 5, body: 'no marker' }];
assert.deepEqual(unrecorded(dup, {}), { a: 312, b: 9 }, 'the oldest issue of a duplicated report');
assert.deepEqual(unrecorded(dup, { a: 312 }), { b: 9 }, 'what is recorded is not written again');
assert.deepEqual(unrecorded([], { a: 312 }), {}, 'an empty list from GitHub takes nothing from the record');

// A report that looks like it carries a secret is never posted (the repo is public, #838)
{
  const { secretLike } = await import('./feedback.mjs');
  for (const s of ['{"type": "service_account", "project_id": "x"}', '"private_key": "abc"', '{"email":"x@y.cl","password":"hunter2"}', '-----BEGIN PRIVATE KEY-----\nMIIE',
    'ghp_' + 'Ab1'.repeat(12), 'sk-ant-api03-' + 'x'.repeat(30), '0123456789abcdef0123456789abcdef01234567', 'mi clave es dGhpc2lzYXZlcnlsb25nc2VjcmV0dG9rZW4xMjM0NTY3']) assert.ok(secretLike(s), `a secret: ${s.slice(0, 30)}`);
  for (const s of [body(r), title(r), 'https://juegosdesalon.cl/labs/case/?labs&seed=HEJWN', 'juegos-de-salon-default-rtdb-and-more-words', 'Supercalifragilisticexpialidocious', '']) assert.ok(!secretLike(s), `not a secret: ${s.slice(0, 30)}`);
}

// The optional email's retention (D-463): an address unanswered after 90 days is deleted
{
  const { expired, expiredComment, RETENTION_DAYS } = await import('./feedback.mjs');
  const { DIAS_CORREO } = await import('../../public/assets/js/buzon-form.js');
  assert.equal(RETENTION_DAYS, 90);
  assert.equal(RETENTION_DAYS, DIAS_CORREO, 'the form promises the same number of days the job applies');
  const D = 86400000, now = Date.parse('2026-10-27T12:00:00Z');
  const contacts = {
    fresh: { correo: 'a@b.cl', at: now - 10 * D },
    edge: { correo: 'c@d.cl', at: now - 90 * D + 60000 },
    old: { correo: 'e@f.cl', at: now - 91 * D },
    older: { correo: 'g@h.cl', at: now - 200 * D },
    undated: { correo: 'i@j.cl' },
  };
  assert.deepEqual(expired(contacts, now), ['undated', 'older', 'old'], 'past 90 days (or with no date), oldest first; the rest stay');
  assert.deepEqual(expired({}, now), []);
  assert.deepEqual(expired(null, now), []);
  assert.deepEqual(expired(contacts, now, 5), ['undated', 'older', 'old', 'edge', 'fresh']);
  assert.ok(handled([{ body: expiredComment() }]), 'the note counts as handled: `pending` stops listing it');
  assert.match(expiredComment(), /90 days/);
  assert.doesNotMatch(expiredComment(), /@/, 'the note never carries an address');
}

// One sync pass uploads at most MAX_PER_RUN reports, oldest first, and says so (#849)
{
  const list = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}` }));
  const { batch, warning } = firstBatch(list);
  assert.equal(MAX_PER_RUN, 20);
  assert.deepEqual(batch.map(r => r.id), list.slice(0, 20).map(r => r.id));
  assert.match(warning, /25 new report\(s\).*first 20/);
  assert.deepEqual(firstBatch(list.slice(0, 3)), { batch: list.slice(0, 3), warning: null });
}

// A player's own email or phone inside the text never reaches the public issue.
assert.equal(hideContacts('escríbanme a juan.perez@gmail.com porfa'), 'escríbanme a [email hidden] porfa');
assert.equal(hideContacts('mi cel +56 9 8765 4321'), 'mi cel [phone hidden]');
assert.equal(hideContacts('llamar al (555) 123-4567.'), 'llamar al [phone hidden].');
assert.equal(hideContacts('el 2026-10-27 perdí 3 de 10, código ABCD, v5.12.3, semilla 1234'), 'el 2026-10-27 perdí 3 de 10, código ABCD, v5.12.3, semilla 1234');
assert.doesNotMatch(body({ texto: 'soy ana@mail.cl, +1 415 555 0100', at: 1 }), /ana@|415/);
assert.doesNotMatch(title({ texto: 'soy ana@mail.cl' }), /ana@/);

// statusOf: each report's issue and the PRs that close it or name it
{
  const { statusOf } = await import('./feedback.mjs');
  const issues = [{ number: 10, state: 'OPEN', labels: [], body: '<!-- feedback:aa -->' }, { number: 11, state: 'CLOSED', labels: [{ name: 'replied' }], body: '<!-- feedback:bb -->' }, { number: 12, body: 'no marker' }];
  const prs = [{ number: 20, state: 'MERGED', title: 'Fix', body: 'Closes #10', closingIssuesReferences: [{ number: 10 }] }, { number: 21, state: 'OPEN', title: 'More', body: 'See #10 and #100' }];
  const st = statusOf(issues, prs);
  assert.deepEqual(Object.keys(st), ['aa', 'bb']);
  assert.deepEqual(st.aa, { issue: 10, state: 'open', replied: false, prs: [{ n: 20, state: 'merged', title: 'Fix' }, { n: 21, state: 'open', title: 'More' }] });
  assert.equal(st.bb.replied, true);
  assert.deepEqual(st.bb.prs, []);
}

// A bug report starts with a failing test (D-527): reply refuses a feedback:problem without its repro
{
  const { needsRepro, reproOf, reproComment, noReproComment, namesIssue, PROBLEM } = await import('./feedback.mjs');
  const bug = { number: 42, labels: [{ name: 'feedback' }, { name: PROBLEM }], comments: [] };
  assert.match(needsRepro(bug), /#42.*failing test.*repro 42/);
  assert.equal(needsRepro({ ...bug, labels: [{ name: 'feedback' }, { name: 'feedback:suggestion' }] }), null);
  assert.equal(needsRepro(bug, 'only on one Android phone'), null);
  assert.equal(needsRepro(bug, '   '), needsRepro(bug));
  const withTest = { ...bug, comments: [{ body: 'hi' }, { body: reproComment('tools/e2e/hangman/issue-42.mjs') }] };
  assert.equal(needsRepro(withTest), null);
  assert.deepEqual(reproOf(withTest.comments), { path: 'tools/e2e/hangman/issue-42.mjs' });
  assert.deepEqual(reproOf([{ body: noReproComment('device-specific') }]), { why: 'device-specific' });
  assert.equal(reproOf([{ body: 'nothing' }]), null);
  assert.ok(namesIssue('// #42 the timer froze', 42));
  assert.ok(!namesIssue('// #420 another', 42));
  assert.ok(!namesIssue('', 42));
}
