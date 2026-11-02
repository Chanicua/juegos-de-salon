// Tests del almacén de prueba de La Copa (las reglas que imita): node public/cup/store.test.mjs
import assert from 'node:assert/strict';

const memoria = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() };
};
globalThis.localStorage = memoria();
globalThis.sessionStorage = memoria();
globalThis.addEventListener ||= () => {};

const { createLocalStore } = await import('./store-local.js');
const { nuevaMeta, hashPin, DIA_MS, fechaEn, moverInicio, sumarDias, inscripcionAbierta, pasarDia, diaActual, terminada, conCierre } = await import('./engine.js');
const { createCuenta, juntarCopas } = await import('./cuenta.js');

let n = 0;
const test = async (name, fn) => { try { await fn(); n++; } catch (e) { console.error(`✗ ${name}`); throw e; } };
const rechaza = async (p, code) => { await assert.rejects(p, e => e.code === code); };

// No pause between PIN attempts here: the pause itself is tested below (D-464)
const admin = createLocalStore({ uid: 'u-admin', pausa: 0 });
const otro = createLocalStore({ uid: 'u-otro', pausa: 0 });
const intruso = createLocalStore({ uid: 'u-intruso', pausa: 0 });
const CODE = 'KQRST';
const hoy = fechaEn(admin.now());
const meta = nuevaMeta({ nombre: 'Copa de prueba', dias: 3, inicio: hoy, admin: 'aaaaaa', creada: admin.now() });

await test('crear y leer', async () => {
  await admin.crear(CODE, meta, { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: await hashPin(CODE, 'aaaaaa', '1111') });
  const L = await admin.leer(CODE);
  assert.equal(L.meta.name, 'Copa de prueba');
  assert.equal(L.players.aaaaaa.name, 'Cata');
  assert.equal(L._keys, undefined); // el hash no se lee
  await rechaza(admin.crear(CODE, meta, { pid: 'x', name: 'x', at: 1, pinHash: 'x' }), 'ocupado');
});

await test('cerrar la inscripción y mover el inicio: solo el admin, y solo sin empezar (D-110)', async () => {
  const C2 = 'MNPQR';
  const m2 = nuevaMeta({ nombre: 'Copa dos', dias: 3, inicio: hoy, admin: 'aaaaaa', creada: admin.now() });
  await admin.crear(C2, m2, { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: 'h' });
  await rechaza(otro.cerrarInscripcion(C2, true), 'permiso');
  await admin.cerrarInscripcion(C2, true);
  assert.equal((await admin.leer(C2)).closed, true);
  await rechaza(otro.inscribir(C2, { pid: 'bbbbbb', name: 'Javi', at: 2, pinHash: 'h' }), 'cerrada');
  await admin.cerrarInscripcion(C2, false);
  await otro.inscribir(C2, { pid: 'bbbbbb', name: 'Javi', at: 2, pinHash: 'h' });
  // Mover el inicio a mañana: las ventanas se corren un día
  const manana = moverInicio(m2, sumarDias(hoy, 1));
  await rechaza(otro.reprogramar(C2, manana), 'permiso');
  await admin.reprogramar(C2, manana);
  const L2 = await admin.leer(C2);
  assert.equal(L2.meta.start, sumarDias(hoy, 1));
  assert.ok(Math.abs(L2.meta.win[1].a - m2.win[1].a - DIA_MS) <= 3600000); // un día (± el cambio de hora)
  assert.equal(L2.meta.createdAt, m2.createdAt);
  // Con alguien que ya empezó, no se mueve
  await admin.reprogramar(C2, moverInicio(m2, hoy));
  await admin.empezar(C2, 1, 'aaaaaa');
  await rechaza(admin.reprogramar(C2, moverInicio(m2, sumarDias(hoy, 1))), 'empezada');
  assert.equal(inscripcionAbierta(m2, admin.now(), true), false);
});

await test('copa del laboratorio: el admin la pasa al día siguiente aunque ya se juegue (D-115)', async () => {
  const C3 = 'HJKLM';
  const m3 = nuevaMeta({ nombre: 'Copa lab', dias: 3, inicio: hoy, admin: 'aaaaaa', creada: admin.now(), lab: true });
  assert.equal(m3.lab, true);
  assert.equal(nuevaMeta({ nombre: 'x', dias: 3, inicio: hoy, admin: 'a', creada: 1 }).lab, undefined);
  await admin.crear(C3, m3, { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: 'h' });
  // Con el admin solo no se juega (D-118)
  await rechaza(admin.empezar(C3, 1, 'aaaaaa'), 'faltan');
  await otro.inscribir(C3, { pid: 'bbbbbb', name: 'Javi', at: 2, pinHash: 'h' });
  await admin.empezar(C3, 1, 'aaaaaa');
  assert.equal(diaActual(m3, admin.now()), 1);
  await rechaza(otro.reprogramar(C3, pasarDia(m3)), 'permiso');
  await admin.reprogramar(C3, pasarDia(m3));
  const L3 = await admin.leer(C3);
  assert.equal(diaActual(L3.meta, admin.now()), 2);
  assert.equal(L3.meta.lab, true);
  // Lo jugado sigue ahí, y el día 1 sigue abierto en su día de gracia
  assert.ok(L3.started[1].aaaaaa);
  await admin.resultado(C3, 1, 'aaaaaa', { s: 50, ms: 1000, t: '', r: '50/100' });
  // Terminada, su nombre ya no cambia (D-148)
  let m = L3.meta;
  while (!terminada(m, admin.now())) { m = pasarDia(m); await admin.reprogramar(C3, m); }
  await rechaza(admin.renombrarCopa(C3, 'Otro nombre'), 'terminada');
});

await test('eliminar la copa: solo el admin (D-117)', async () => {
  const C4 = 'PQRST';
  await admin.crear(C4, nuevaMeta({ nombre: 'Copa a borrar', dias: 3, inicio: hoy, admin: 'aaaaaa', creada: admin.now() }), { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: 'h' });
  await rechaza(otro.eliminar(C4), 'permiso');
  await admin.eliminar(C4);
  assert.equal(await admin.leer(C4), null);
});

await test('link propio: único mientras dure, libre al eliminar o al vencer (D-121)', async () => {
  const mA = nuevaMeta({ nombre: 'Pirata', dias: 3, inicio: hoy, admin: 'aaaaaa', creada: admin.now(), alias: 'pirata' });
  await admin.crear('BCDFG', mA, { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: 'h' });
  assert.equal((await admin.alias('pirata')).code, 'BCDFG');
  const mB = nuevaMeta({ nombre: 'Otra', dias: 3, inicio: hoy, admin: 'bbbbbb', creada: admin.now(), alias: 'pirata' });
  await rechaza(otro.crear('CDFGH', mB, { pid: 'bbbbbb', name: 'Javi', at: 1, pinHash: 'h' }), 'alias');
  await admin.eliminar('BCDFG');
  assert.equal(await admin.alias('pirata'), null);
  await otro.crear('CDFGH', mB, { pid: 'bbbbbb', name: 'Javi', at: 1, pinHash: 'h' });
  assert.equal((await otro.alias('pirata')).code, 'CDFGH');
  // Vencido (7 días después de terminar), otra copa lo puede tomar
  admin.adelantar(20 * DIA_MS);
  const mC = nuevaMeta({ nombre: 'Tercera', dias: 3, inicio: fechaEn(admin.now()), admin: 'aaaaaa', creada: admin.now(), alias: 'pirata' });
  await admin.crear('DFGHJ', mC, { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: 'h' });
  assert.equal((await admin.alias('pirata')).code, 'DFGHJ');
  admin.reiniciarReloj();
});

await test('inscribirse: nombre repetido y cupo', async () => {
  await otro.inscribir(CODE, { pid: 'bbbbbb', name: 'Javi', at: 2, pinHash: await hashPin(CODE, 'bbbbbb', '2222') });
  await rechaza(intruso.inscribir(CODE, { pid: 'cccccc', name: ' javi ', at: 3, pinHash: 'h' }), 'nombre-repetido');
  for (let i = 0; i < 8; i++) await intruso.inscribir(CODE, { pid: `p${i}aaaa`, name: `J${i}`, at: 3, pinHash: 'h' });
  await rechaza(intruso.inscribir(CODE, { pid: 'zzzzzz', name: 'Once', at: 3, pinHash: 'h' }), 'llena');
});

await test('sentarse con el PIN', async () => {
  await rechaza(intruso.sentarse(CODE, 'bbbbbb', await hashPin(CODE, 'bbbbbb', '0000')), 'pin');
  await rechaza(intruso.resultado(CODE, 1, 'bbbbbb', { s: 1, ms: 1 }), 'permiso');
  await intruso.sentarse(CODE, 'bbbbbb', await hashPin(CODE, 'bbbbbb', '2222'));
});

await test('sentarse como su jugador, sin PIN de copa (D-359)', async () => {
  const cel = createLocalStore({ uid: 'u-jugador' });
  await rechaza(cel.sentarseComoJugador(CODE, 'bbbbbb', 'jid00001'), 'pin');
  await otro.enlazar(CODE, 'bbbbbb', 'jid00001');
  await rechaza(cel.sentarseComoJugador(CODE, 'bbbbbb', 'jid00002'), 'pin');
  // D-416: linked, but this phone is not seated as the player (it lost its anonymous session)
  await rechaza(cel.sentarseComoJugador(CODE, 'bbbbbb', 'jid00001'), 'pin');
  localStorage.setItem('juegos-de-salon:prueba:records-uid', 'u-jugador');
  localStorage.setItem('juegos-de-salon:prueba:records-db', JSON.stringify({ jugadorSeats: { jid00001: { 'u-jugador': 'h' } } }));
  await cel.sentarseComoJugador(CODE, 'bbbbbb', 'jid00001');
  localStorage.removeItem('juegos-de-salon:prueba:records-uid');
  localStorage.removeItem('juegos-de-salon:prueba:records-db');
  const { readFileSync } = await import('node:fs');
  const r = JSON.parse(readFileSync(new URL('../../firebase/database.rules.json', import.meta.url))).rules.torneoSeats.$code.$pid.$uid['.validate'];
  assert.match(r, /players\/' \+ \$pid \+ '\/j'\)\.val\(\) && root\.child\('jugadorSeats\/' \+ newData\.val\(\) \+ '\/' \+ auth\.uid\)\.exists\(\)/, 'the rules accept the jid only from a phone seated as that linked player');
});

await test('comodín antes de empezar; resultado una vez y en su ventana', async () => {
  await otro.comodin(CODE, 1, 'bbbbbb');
  await rechaza(otro.comodin(CODE, 2, 'bbbbbb'), 'comodin');
  await admin.empezar(CODE, 1, 'aaaaaa');
  await rechaza(admin.comodin(CODE, 1, 'aaaaaa'), 'comodin');
  await rechaza(admin.empezar(CODE, 2, 'aaaaaa'), 'ventana');
  await admin.resultado(CODE, 1, 'aaaaaa', { s: 5, ms: 1000, t: '🟩' });
  await rechaza(admin.resultado(CODE, 1, 'aaaaaa', { s: 7, ms: 1 }), 'ya-jugado');
  const L = await admin.leer(CODE);
  assert.equal(L.results[1].aaaaaa.s, 5);
  assert.equal(L.wild.bbbbbb, '1');
});

await test('el reloj adelantado abre y cierra días', async () => {
  // To two hours into day 3, from its own window: a fixed two days and two hours failed on the day a
  // time zone leaves summer time (25 hours, as 2026-11-01 in Los Angeles), and run late in the evening
  // it jumped past day 3, so the test failed after 22:00
  admin.adelantar(meta.win[3].a + 2 * 3600e3 - admin.now());
  await rechaza(otro.resultado(CODE, 1, 'bbbbbb', { s: 1, ms: 1 }), 'ventana');
  await otro.empezar(CODE, 3, 'bbbbbb');
  await otro.resultado(CODE, 3, 'bbbbbb', { s: 300, ms: 1 });
  admin.reiniciarReloj();
});

await test('admin: sacar, renombrar y cambiar PIN; nadie más', async () => {
  await rechaza(otro.sacar(CODE, 'aaaaaa', true), 'permiso');
  await rechaza(otro.sacar(CODE, 'p0aaaa', true), 'permiso');
  await admin.sacar(CODE, 'p0aaaa', true);
  assert.equal((await admin.leer(CODE)).players.p0aaaa.out, true);
  await admin.sacar(CODE, 'p0aaaa', false);
  assert.equal((await admin.leer(CODE)).players.p0aaaa.out, undefined);
  await rechaza(admin.renombrar(CODE, 'p0aaaa', 'CATA'), 'nombre-repetido');
  await admin.renombrar(CODE, 'p0aaaa', 'Coni');
  // A new PIN needs the admin's own PIN (D-464): the seat alone is not enough
  await rechaza(admin.cambiarPin(CODE, 'bbbbbb', await hashPin(CODE, 'bbbbbb', '9999')), 'pin-admin');
  await rechaza(admin.cambiarPin(CODE, 'bbbbbb', await hashPin(CODE, 'bbbbbb', '9999'), { admin: 'aaaaaa', adminHash: await hashPin(CODE, 'aaaaaa', '0000') }), 'pin-admin');
  await rechaza(otro.cambiarPin(CODE, 'bbbbbb', await hashPin(CODE, 'bbbbbb', '9999'), { admin: 'aaaaaa', adminHash: await hashPin(CODE, 'aaaaaa', '1111') }), 'permiso');
  await admin.cambiarPin(CODE, 'bbbbbb', await hashPin(CODE, 'bbbbbb', '9999'), { admin: 'aaaaaa', adminHash: await hashPin(CODE, 'aaaaaa', '1111') });
  await rechaza(otro.comodin(CODE, 2, 'bbbbbb'), 'permiso'); // su asiento se cayó
  await otro.sentarse(CODE, 'bbbbbb', await hashPin(CODE, 'bbbbbb', '9999'));
});

await test('PIN attempts: one every 5 s per cup player (D-464)', async () => {
  let esperado = 0;
  const lento = createLocalStore({ uid: 'u-lento', esperar: async ms => { esperado += ms; } });
  await rechaza(lento.sentarse(CODE, 'p1aaaa', await hashPin(CODE, 'p1aaaa', '0000')), 'pin');
  // Right away again: the phone waits once (here it does not really wait) and is still refused
  await rechaza(lento.sentarse(CODE, 'p1aaaa', 'h'), 'espera');
  assert.ok(esperado >= 5000, 'it waited the pause before the second try');
  const L = JSON.parse(localStorage.getItem('juegos-de-salon:copa:prueba'))[CODE];
  assert.equal(L._intentos.p1aaaa.u, 'u-lento', 'the attempt names the phone');
  assert.equal((await lento.leer(CODE))._intentos, undefined, 'nobody reads the attempts');
});

await test('renombrar la copa: solo su admin y mientras no termine', async () => {
  await rechaza(otro.renombrarCopa(CODE, 'Otra copa'), 'permiso');
  await admin.renombrarCopa(CODE, 'La copa nueva');
  assert.equal((await admin.leer(CODE)).meta.name, 'La copa nueva');
});

await test('terminar la copa antes: solo el admin, una vez, y después nadie juega (D-161)', async () => {
  const C3 = 'TUVWX';
  const m3 = nuevaMeta({ nombre: 'Copa tres', dias: 3, inicio: fechaEn(admin.now()), admin: 'aaaaaa', creada: admin.now() });
  await admin.crear(C3, m3, { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: 'h' });
  await otro.inscribir(C3, { pid: 'bbbbbb', name: 'Javi', at: 2, pinHash: 'h' });
  await rechaza(otro.terminarCopa(C3), 'permiso');
  await admin.empezar(C3, 1, 'aaaaaa');
  await admin.terminarCopa(C3);
  const L3 = await admin.leer(C3);
  assert.ok(L3.fin > 0);
  assert.ok(terminada(conCierre(L3).meta, admin.now()));
  await rechaza(admin.terminarCopa(C3), 'fin');
  await rechaza(admin.resultado(C3, 1, 'aaaaaa', { s: 5, ms: 1, t: '' }), 'ventana');
  await rechaza(otro.empezar(C3, 1, 'bbbbbb'), 'ventana');
  await rechaza(otro.comodin(C3, 1, 'bbbbbb'), 'comodin');
  await rechaza(admin.renombrarCopa(C3, 'Otra'), 'terminada');
  await rechaza(intruso.inscribir(C3, { pid: 'cccccc', name: 'Pepe', at: 3, pinHash: 'h' }), 'cerrada');
  await admin.eliminar(C3);
});

await test('escuchar avisa los cambios', async () => {
  const vistas = [];
  const off = admin.escuchar(CODE, L => vistas.push(Object.keys(L.players).length));
  await intruso.sacar(CODE, 'p1aaaa', true).catch(() => {});
  await admin.renombrar(CODE, 'p1aaaa', 'Nico');
  off();
  assert.ok(vistas.length >= 2);
});

await test('cuenta: sesión por copa y copas de prueba aparte', async () => {
  const c = createCuenta(), cp = createCuenta({ prueba: true });
  c.recordar('ABCDE', 'aaaaaa', { nombre: 'Cata', copa: 'Copa 1', fin: Date.now() });
  assert.equal(c.quien('ABCDE'), 'aaaaaa');
  assert.equal(cp.quien('ABCDE'), null);
  assert.equal(c.mias().length, 1);
  // A finished cup stays in "Tus copas", behind the switch (D-336)
  assert.equal(c.mias().length, 1);
  c.intento.guardar('ABCDE', 1, 'aaaaaa', { jugadas: [1] });
  assert.deepEqual(c.intento.leer('ABCDE', 1, 'aaaaaa'), { jugadas: [1] });
  c.olvidar('ABCDE');
  assert.equal(c.quien('ABCDE'), null);
});

await test('"Tus copas" suma las del jugador que este celular no conoce, sin repetir (D-220)', async () => {
  const now = Date.now();
  const mias = [{ code: 'ABCDE', nombre: 'Cata', copa: 'Copa 1', fin: now }];
  const delJugador = [
    { code: 'ABCDE', nombre: 'Cata', copa: 'Copa 1', fin: now },
    { code: 'FGHJK', nombre: 'Cata', copa: 'Piratas', fin: now + DIA_MS },
    { code: 'LMNPQ', nombre: 'Cata', copa: 'Vieja', fin: now - 8 * DIA_MS },
  ];
  assert.deepEqual(juntarCopas(mias, delJugador).map(c => c.code), ['ABCDE', 'FGHJK', 'LMNPQ']);
  assert.deepEqual(juntarCopas([], [null, delJugador[1]]).map(c => c.code), ['FGHJK']);
});

await test('el país de cada jugador: al crear, al inscribirse y, para los de antes, una vez después (D-207, D-209)', async () => {
  const C4 = 'WXYZA';
  const m4 = nuevaMeta({ nombre: 'Copa con banderas', dias: 3, inicio: hoy, admin: 'aaaaaa', creada: admin.now() });
  await admin.crear(C4, m4, { pid: 'aaaaaa', name: 'Cata', at: 1, pinHash: 'h', co: 'CL' });
  await otro.inscribir(C4, { pid: 'bbbbbb', name: 'Javi', at: 2, pinHash: 'h' });
  let L = await admin.leer(C4);
  assert.equal(L.players.aaaaaa.co, 'CL');
  assert.equal(L.players.bbbbbb.co, undefined, 'sin país conocido no se guarda nada');
  await otro.ponerPais(C4, 'bbbbbb', 'AR');
  await otro.ponerPais(C4, 'bbbbbb', 'PE');
  L = await admin.leer(C4);
  assert.equal(L.players.bbbbbb.co, 'AR', 'el país se anota una vez y no se pisa');
});

await test('avisos al celular: solo quien está sentado, y nadie los lee (D-223)', async () => {
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: { p256dh: 'p', auth: 'a' }, lang: 'es', tz: 'UTC' };
  const SUB = 'a'.repeat(32);
  await admin.guardarAvisos(CODE, 'aaaaaa', SUB, sub, { dia: true, plazo: false });
  await rechaza(intruso.guardarAvisos(CODE, 'aaaaaa', SUB, sub), 'permiso');
  await rechaza(admin.guardarAvisos(CODE, 'aaaaaa', 'no-es-un-id', sub), 'permiso');
  assert.equal((await admin.leer(CODE))._avisos, undefined, 'la copa no muestra quién quiere avisos');
  const av = await admin.avisosDe(CODE);
  assert.deepEqual({ dia: av.aaaaaa[SUB].dia, plazo: av.aaaaaa[SUB].plazo, uid: av.aaaaaa[SUB].sub.uid }, { dia: true, plazo: false, uid: 'u-admin' });
  await rechaza(intruso.quitarAvisos(CODE, 'aaaaaa', SUB), 'permiso');
  await admin.quitarAvisos(CODE, 'aaaaaa', SUB);
  assert.deepEqual((await admin.avisosDe(CODE)).aaaaaa, {});
  // Las reglas de Firebase dicen lo mismo
  const { readFile } = await import('node:fs/promises');
  const reglas = JSON.parse(await readFile(new URL('../../firebase/database.rules.json', import.meta.url), 'utf8')).rules;
  assert.equal(reglas.push.$subId['.read'], false);
  assert.match(reglas.push.$subId['.write'], /data\.child\('uid'\)\.val\(\) === auth\.uid/);
  assert.equal(reglas.pushCopa.$code.$pid.$subId['.read'], false);
  assert.match(reglas.pushCopa.$code.$pid.$subId['.write'], /torneoSeats/);
  assert.match(reglas.pushCopa.$code.$pid.$subId['.write'], /push\/' \+ \$subId \+ '\/uid/);
  // Lo ya mandado lo anota solo tools/push/notify.mjs, como administrador (D-224)
  assert.deepEqual(reglas.pushEnviados, { '.read': false, '.write': false });
});

await test('cuenta: los avisos de cada copa y el "Ahora no" quedan en el celular', async () => {
  const c = createCuenta();
  assert.equal(c.avisos.leer('KQRST'), null);
  c.avisos.guardar('KQRST', { subId: 'x', dia: true, plazo: true });
  assert.deepEqual(c.avisos.leer('KQRST'), { subId: 'x', dia: true, plazo: true });
  c.avisos.guardar('KQRST', { no: true });
  assert.deepEqual(c.avisos.leer('KQRST'), { no: true });
  c.avisos.borrar('KQRST');
  assert.equal(c.avisos.leer('KQRST'), null);
});

console.log(`copa/store: ${n} tests OK`);
process.exit(0);
