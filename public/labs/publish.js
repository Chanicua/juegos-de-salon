/**
 * 🚀 Publicar para todos (D-480): the owner sends a lab feature to production from its card.
 * Only the owner sees it: signed in with the panel's Google account (the session is shared by the
 * whole site), and only if reading `labsPublish/` works, which the rules allow to the owner alone.
 * A lab key holder sees the same page as before.
 *
 * Confirming writes `labsPublish/<card id>`; the Mac mini's `lab-publish-watch` job picks it up
 * within 5 minutes and a headless session opens the PR (tools/jobs/prompts/lab-publish.md). Each
 * card shows its request's state live, with the PR, its checks and its preview once it exists.
 *
 * A card behind a runtime flag (D-498, `assets/js/flags.js`) needs no PR: its 🚀 writes
 * `flags/<id>` = 'all' and everyone gets it on their next visit; ↩️ Volver al laboratorio takes it
 * back. A later cleanup PR removes the gate and moves the card to La Bodega (D-479).
 */
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getDatabase, ref, onValue, set, remove } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';
import { firebaseConfig } from '../assets/js/firebase-config.js';
import { $, $$, el } from '../assets/js/ui.js';
import { stateOf } from '../assets/js/flags.js';
import { FLAGS } from '../assets/js/flag-list.js';

const REPO = 'https://github.com/ellokojavi/juegos-de-salon';
const PREVIEWS = 'https://ellokojavi.github.io/juegos-de-salon-previews';
/** Same as tools/agents/lab-publish.mjs branchOf. */
export const branchOf = (id, kind) => `${kind === 'bodega' ? 'bodega' : 'publish'}-${id.replace(/^seccion-/, '')}`;

/** The cards with buttons: what is being tried, and in La Bodega the ones behind a flag, which keep their switch (D-510). */
const cards = () => [...$$('#activos > .seccion, #mejoras > .seccion'), ...$$('#bodega .seccion').filter(c => flagOf(c.id))];
const titleOf = card => $('h2', card)?.textContent.trim() || card.id;
const when = ms => new Date(ms).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const link = (href, text) => el('a', { href, target: '_blank', rel: 'noopener' }, text);

const WAIT = 'No es inmediato: tarda entre 30 y 60 minutos (un juego, algo más). El Mac mini revisa los pedidos cada 5 minutos, '
  + 'Claude hace el cambio y abre el PR, y se fusiona solo cuando pasan las pruebas. Si el Mac mini está apagado, empieza cuando se encienda.';

/** What a card shows for its request. Pure but for the DOM nodes: one line per fact, the links last. */
export function statusOf(id, e) {
  const branch = e.branch || branchOf(id, e.kind);
  const bodega = e.kind === 'bodega';
  const search = `${REPO}/pulls?q=is%3Apr+head%3A${branch}`;
  const pr = e.pr && [link(`${REPO}/pull/${e.pr}`, `🔀 Ver el PR #${e.pr}`), link(`${REPO}/pull/${e.pr}/checks`, '🧪 Estado de las pruebas'), link(`${PREVIEWS}/${branch}/`, '🔍 Vista previa')];
  switch (e.state) {
    case 'requested': return { tone: 'wait', lines: [`⏳ ${bodega ? '📦 ' : ''}Pedido el ${when(e.at)}: esperando que el Mac mini lo tome.`, WAIT, `El PR saldrá de la rama ${branch}.`], links: [link(search, '🔎 Buscar su PR en GitHub')], cancel: true };
    case 'working': return { tone: 'wait', lines: [`🛠️ Claude está trabajando en esto desde ${when(e.started || e.at)}: ${bodega ? 'mueve la tarjeta a La Bodega' : 'quita la puerta del laboratorio, mueve la tarjeta a La Bodega'} y pasa las revisiones.`, 'Cuando abra el PR, aparece acá con el link a sus pruebas.'], links: [link(search, '🔎 Buscar su PR en GitHub')] };
    case 'pr': return { tone: 'wait', lines: [`🔀 El PR #${e.pr} está abierto con auto-merge: se fusiona solo cuando pasen las pruebas, y unos minutos después ${bodega ? 'la tarjeta aparece en La Bodega' : 'queda publicado para todos'}.`], links: pr };
    case 'merged': return { tone: 'ok', lines: [`✅ Fusionado el ${when(e.done || e.at)}. El sitio se publica solo en unos minutos; con esa versión, esta tarjeta pasa a La Bodega.`], links: pr || [] };
    case 'failed': return { tone: 'bad', lines: [`❌ No se pudo ${bodega ? 'enviar a La Bodega' : 'publicar'}: ${e.msg || 'sin detalle.'}`], links: pr || [], retry: true };
    default: return null;
  }
}

let db, requests = {}, flags = {}, listas = {};

/** The flag a card is behind, or null: its id without `seccion-`, if FLAGS has it. */
export const flagOf = id => { const f = id.replace(/^seccion-/, ''); return FLAGS[f] ? f : null; };
const setFlag = (f, state) => set(ref(db, `flags/${f}`), { state, at: Date.now() });

/** What a flagged card shows (D-498): its state and the buttons to the other two; /labs/ is the one place to switch them. */
export function flagStatusOf(state, at, lista = null) {
  const since = at ? ` desde el ${when(at)}` : '';
  if (state === 'all') return { tone: 'ok', lines: [`🟢 Publicado para todos${since}: cada jugador lo ve la próxima vez que abre esa página. Sin PR.`, 'Su tarjeta ya está en La Bodega; más adelante, un PR de limpieza quita la puerta del código.'], to: [['lab', '↩️ Volver al laboratorio'], ['off', '⚪ Apagar para todos']] };
  if (state === 'off') return { tone: 'bad', lines: [`⚪ Apagado para todos${since}, también en el laboratorio.`], to: [['lab', '🧪 Encender en el laboratorio']] };
  return { tone: 'wait', lines: ['🧪 En el laboratorio: solo lo ven quienes tienen la llave.', ...readyLines(lista)], ready: !!lista?.ready, to: [['all', '🚀 Publicar para todos'], ['off', '⚪ Apagar para todos']] };
}

/** What lab-ready.mjs measured for a flag in lab (D-528): ✅ Listo para 🚀 with its evidence, or what is missing. */
export function readyLines(l) {
  if (!l) return [];
  const nums = `${l.completions} usos completos de ${l.exposures} aperturas, ${l.keys} llave(s), ${l.days} día(s), ${l.errors} con error`;
  return l.ready ? [`✅ Listo para 🚀: ${nums}.`] : [`📊 Uso en el laboratorio: ${nums}. Falta: ${(l.missing || []).join(', ')}.`];
}

/** The confirmation for a flagged card: immediate, no note, no PR. */
export function askFlag(card, f) {
  const close = () => capa.remove();
  const msg = el('p', { class: 'muted', role: 'alert' });
  const btn = el('button', { class: 'btn btn--yellow', onClick: async () => {
    btn.disabled = true;
    try { await setFlag(f, 'all'); close(); } catch (err) { btn.disabled = false; msg.textContent = `No se pudo guardar (${err?.code || err?.message || 'error'}).`; }
  } }, '🚀 Sí, publicar');
  const panel = el('div', { class: 'hoja', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'publicar-titulo' },
    el('div', { class: 'hoja-asa', 'aria-hidden': 'true' }),
    el('h2', { id: 'publicar-titulo' }, '🚀 ¿Publicar para todos?'),
    el('p', {}, el('b', {}, titleOf(card)), ' lo ven todos los jugadores desde la próxima vez que abran esa página.'),
    el('p', { class: 'hoja-caja' }, 'Es inmediato: es un interruptor, no un PR. Si algo sale mal, lo devuelves al laboratorio desde esta misma tarjeta.'),
    msg,
    el('div', { class: 'btn-row' }, btn, el('button', { class: 'btn btn--ghost', onClick: close }, 'Cancelar')),
  );
  const capa = el('div', { class: 'hoja-capa' }, el('div', { class: 'hoja-fondo', onClick: close }), panel);
  document.body.append(capa);
  btn.focus();
}

/** 📦 Enviar a La Bodega (D-511): the same request, of kind 'bodega'. A card live for everyone goes as 🚀 Lanzado, any other as 💤 No prosperó. */
export function askBodega(card, existing) {
  const f = flagOf(card.id);
  const launched = f && stateOf(flags, f) === 'all';
  const note = el('textarea', { rows: 3, maxlength: 500, placeholder: launched ? 'Nota opcional para Claude' : 'Nota opcional para Claude (por ejemplo: por qué no prosperó)', class: 'publicar-nota' }, existing?.note || '');
  const close = () => capa.remove();
  const msg = el('p', { class: 'muted', role: 'alert' });
  const btn = el('button', { class: 'btn btn--yellow', onClick: async () => {
    btn.disabled = true;
    try {
      await set(ref(db, `labsPublish/${card.id}`), { state: 'requested', kind: 'bodega', at: Date.now(), title: titleOf(card).slice(0, 120), ...(note.value.trim() ? { note: note.value.trim().slice(0, 500) } : {}) });
      close();
    } catch (err) { btn.disabled = false; msg.textContent = `No se pudo guardar el pedido (${err?.code || err?.message || 'error'}).`; }
  } }, '📦 Sí, enviar');
  const panel = el('div', { class: 'hoja', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'publicar-titulo' },
    el('div', { class: 'hoja-asa', 'aria-hidden': 'true' }),
    el('h2', { id: 'publicar-titulo' }, '📦 ¿Enviar a La Bodega?'),
    el('p', {}, el('b', {}, titleOf(card)), launched
      ? ' ya está publicado para todos: su tarjeta pasa a La Bodega como 🚀 Lanzado, y conserva sus botones.'
      : ' deja de estar en prueba: su tarjeta pasa a La Bodega como 💤 No prosperó. Los jugadores no lo ven; con tu llave se sigue abriendo.'),
    el('p', { class: 'hoja-caja' }, WAIT),
    note, msg,
    el('div', { class: 'btn-row' }, btn, el('button', { class: 'btn btn--ghost', onClick: close }, 'Cancelar')),
  );
  const capa = el('div', { class: 'hoja-capa' }, el('div', { class: 'hoja-fondo', onClick: close }), panel);
  document.body.append(capa);
  btn.focus();
}

export function ask(card, existing) {
  const note = el('textarea', { rows: 3, maxlength: 500, placeholder: 'Nota opcional para Claude (por ejemplo: solo en español por ahora)', class: 'publicar-nota' }, existing?.note || '');
  const close = () => capa.remove();
  const go = async () => {
    btn.disabled = true;
    try {
      await set(ref(db, `labsPublish/${card.id}`), { state: 'requested', at: Date.now(), title: titleOf(card).slice(0, 120), ...(note.value.trim() ? { note: note.value.trim().slice(0, 500) } : {}) });
      close();
      $('.publicar-estado', card)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) { btn.disabled = false; msg.textContent = `No se pudo guardar el pedido (${err?.code || err?.message || 'error'}).`; }
  };
  const msg = el('p', { class: 'muted', role: 'alert' });
  const btn = el('button', { class: 'btn btn--yellow', onClick: go }, '🚀 Sí, publicar');
  const panel = el('div', { class: 'hoja', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'publicar-titulo' },
    el('div', { class: 'hoja-asa', 'aria-hidden': 'true' }),
    el('h2', { id: 'publicar-titulo' }, '🚀 ¿Publicar para todos?'),
    el('p', {}, el('b', {}, titleOf(card)), ' deja el laboratorio y lo ven todos los jugadores. Su tarjeta pasa a La Bodega.'),
    el('p', { class: 'hoja-caja' }, WAIT),
    el('p', { class: 'muted' }, 'Lo sigues en esta tarjeta: el PR, sus pruebas y su vista previa, o por qué no se pudo (y entonces no publica nada).'),
    note, msg,
    el('div', { class: 'btn-row' }, btn, el('button', { class: 'btn btn--ghost', onClick: close }, 'Cancelar')),
  );
  const capa = el('div', { class: 'hoja-capa' }, el('div', { class: 'hoja-fondo', onClick: close }), panel);
  document.body.append(capa);
  btn.focus();
}

/** Draws the cards for these requests: the page's own listener, and tools/e2e/labs/publish.mjs. */
export function render(r = requests, fl = flags, li = listas) {
  requests = r; flags = fl; listas = li;
  for (const card of cards()) {
    $('.publicar', card)?.remove();
    const f = flagOf(card.id);
    const inBodega = !!card.closest('#bodega');
    const toBodega = () => el('button', { class: 'btn btn--ghost', onClick: () => askBodega(card) }, '📦 Enviar a La Bodega');
    // a flagged card shows its switch, unless a 📦 request is on its way (until the card is in La Bodega)
    const sending = requests[card.id]?.kind === 'bodega' && !(inBodega && requests[card.id].state === 'merged');
    if (f && !sending) {
      const fs = flagStatusOf(stateOf(flags, f), flags?.[f]?.at, listas?.[f]);
      const box = el('div', { class: 'publicar' }, el('div', { class: `publicar-estado publicar-estado--${fs.ready ? 'ok' : fs.tone}`, role: 'status' },
        ...fs.lines.map(l => el('p', {}, l)),
        el('div', { class: 'btn-row' }, ...fs.to.map(([to, label]) => el('button', { class: 'btn btn--ghost', onClick: () => (to === 'all' ? askFlag(card, f) : setFlag(f, to).catch(() => {})) }, label)),
          inBodega ? null : toBodega())));
      ($('.detalle', card) || card).append(box);
      continue;
    }
    const e = requests[card.id];
    const s = e && statusOf(card.id, e);
    const box = el('div', { class: 'publicar' });
    if (!s) box.append(el('div', { class: 'btn-row' }, el('button', { class: 'btn btn--ghost', onClick: () => ask(card) }, '🚀 Publicar para todos'), toBodega()));
    else box.append(el('div', { class: `publicar-estado publicar-estado--${s.tone}`, role: 'status' },
      ...s.lines.map(l => el('p', {}, l)),
      s.links.length ? el('p', { class: 'publicar-links' }, ...s.links) : null,
      s.cancel ? el('button', { class: 'btn btn--ghost', onClick: () => remove(ref(db, `labsPublish/${card.id}`)) }, 'Cancelar el pedido') : null,
      s.retry ? el('button', { class: 'btn btn--ghost', onClick: () => (e.kind === 'bodega' ? askBodega(card, e) : ask(card, e)) }, e.kind === 'bodega' ? '📦 Volver a pedir' : '🚀 Volver a pedir') : null,
    ));
    card.append(box);
  }
}

export function start() {
  // the default app, as the panel's: Firebase keeps the sign-in per app name, so a named app would
  // not see the owner signed in on /panel/
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  db = getDatabase(app);
  let stop = null;
  const owner = $('#publicar-dueno');
  onAuthStateChanged(auth, user => {
    stop?.(); stop = null; requests = {}; flags = {}; listas = {}; $$('.publicar').forEach(n => n.remove());
    if (owner) owner.hidden = !!user;
    if (!user) return;
    // a read the rules refuse means this is not the owner: nothing is shown
    let owns = false;
    const offFlags = onValue(ref(db, 'flags'), snap => { flags = snap.val() || {}; if (owns) render(); }, () => {});
    const offReq = onValue(ref(db, 'labsPublish'), snap => { owns = true; requests = snap.val() || {}; render(); }, () => {});
    const offListas = onValue(ref(db, 'flagsListas'), snap => { listas = snap.val() || {}; if (owns) render(); }, () => {});
    stop = () => { offFlags(); offReq(); offListas(); };
  });
  owner?.querySelector('button')?.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithPopup(auth, provider).catch(() => {});
  });
}
