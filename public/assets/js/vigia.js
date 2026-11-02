/**
 * El vigía: lo que le falla a quien juega, para la sección Salud del panel (D-251).
 *
 * Es un script clásico, no un módulo, y va en el <head> de cada página antes de las hojas de
 * estilo. Así está escuchando antes de que se pida cualquier módulo, y sigue funcionando cuando
 * lo que falla son justamente los módulos: un archivo que no llegó, una sintaxis que ese
 * navegador no entiende, un import que no existe. Por lo mismo está escrito sin `?.`, sin `??` y
 * sin nada que un Safari viejo no lea, y no importa nada: la dirección de la base, el entorno y
 * el día los repite de firebase-config.js, stats.js y cleanup.js (vigia.test.mjs comprueba que
 * digan lo mismo).
 *
 * Qué anota, por día y por entorno, en `stats/<env>/days/<día>`:
 *
 *   falla/<tipo>/<página>   cargas de esa página donde pasó eso, una vez por carga y tipo:
 *                           `recurso` (un script o una hoja de estilos no llegó), `js` (un error
 *                           sin atrapar), `promesa` (una promesa rechazada sin atrapar),
 *                           `arranque` (a los 20 s la página no había arrancado) y `alguna`
 *                           (cualquiera de las anteriores: cuántas cargas tuvieron un problema)
 *   err/<firma>/n           cuántas cargas vieron ese error (la firma junta tipo, mensaje,
 *                           archivo, línea, página y navegador)
 *   err/<firma>/d           { k, p, m, f, b, v, at }: qué error es, lo deja el primero que lo ve
 *   listo/<página>/<tramo>  cuánto tardó la página en arrancar: s1 (menos de 1 s), s3, s6, s10
 *                           y mas (10 s o más). Solo cargas que estuvieron a la vista todo el rato
 *
 * "Arrancó" es que los módulos de la página cargaron y corrieron: lo avisa `trackVisit` de
 * stats.js con `__vigia.listo()`. Las cargas de cada página ya las cuenta el tráfico
 * (`vistas/<página>`, D-208), así que esto no las repite: una carga que no arrancó nunca llegó a
 * contarse ahí, y el panel suma las dos.
 *
 * Señales, no personas (D-44): ni IP, ni dirección completa (sin `?` ni `#`, que llevan códigos de
 * sala y de copa), ni el navegador entero: solo su familia y versión mayor (`safari17`, `ios16`).
 * Mejor esfuerzo: nunca lanza, nunca muestra nada, y como mucho manda diez errores por carga.
 */
(function () {
  'use strict';
  var w = window, d = document;
  if (w.__vigia) return;

  var BASE = 'https://juegos-de-salon-default-rtdb.firebaseio.com';
  var DIA_MS = 24 * 60 * 60 * 1000;
  var ARRANQUE_MS = 20000;
  var TOPE = 10;
  var STAMP = { '.sv': 'timestamp' };
  var INC = { '.sv': { increment: 1 } };

  /** Lo mismo que `envOf` de stats.js: pruebas es todo lo que no se sirve desde internet. */
  function entorno(host, path) {
    var h = String(host || '').toLowerCase();
    if (/\.github\.io$/.test(h) && String(path || '').indexOf('/juegos-de-salon-previews/') === 0) return 'dev';
    if (/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)$/.test(h)) return 'dev';
    if (/^(10\.\d+|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d+\.\d+$/.test(h)) return 'dev';
    if (/(^|\.)(ts\.net|local)$/.test(h)) return 'dev';
    return 'prod';
  }

  /** Lo mismo que `paginaDe` de stats.js: la primera carpeta, o `inicio`. */
  function pagina(path) {
    var primera = String(path || '/').split('/').filter(Boolean)[0] || '';
    var k = primera.replace(/\.html?$/, '').replace(/^index$/, '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    return k || 'inicio';
  }

  /** La familia del navegador y su versión mayor. En iOS todos son Safari por dentro: va la del sistema. */
  function navegador(ua) {
    ua = String(ua || '');
    var m;
    if ((m = /(?:iPhone|iPad|iPod).*? OS (\d+)/.exec(ua))) return 'ios' + m[1];
    if (/FBAN|FBAV/.test(ua)) return 'facebook';
    if (/Instagram/.test(ua)) return 'instagram';
    if ((m = /SamsungBrowser\/(\d+)/.exec(ua))) return 'samsung' + m[1];
    if ((m = /Edg(?:A|iOS)?\/(\d+)/.exec(ua))) return 'edge' + m[1];
    if ((m = /Firefox\/(\d+)/.exec(ua))) return 'firefox' + m[1];
    if ((m = /Chrome\/(\d+)/.exec(ua))) return 'chrome' + m[1];
    if ((m = /Version\/(\d+).*Safari/.exec(ua))) return 'safari' + m[1];
    return 'otro';
  }

  /** La dirección de algo, sin el sitio, sin `?` ni `#`: `/hangman/game.js`. De otro sitio, con su dominio. */
  function ruta(url) {
    var s = String(url || '');
    if (!s) return '';
    s = s.split('#')[0].split('?')[0];
    var propio = location.protocol + '//' + location.host;
    if (s.indexOf(propio) === 0) return s.slice(propio.length) || '/';
    return s.replace(/^https?:\/\//, '');
  }

  /** El mensaje, sin direcciones largas ni lo que va después de `?`, en una línea y acotado. */
  function limpio(msg) {
    // "Uncaught " lo antepone Chrome y Safari no: sin él, el mismo error es uno solo en los dos
    return String(msg || '').replace(/^Uncaught (?:exception: )?/, '').replace(/https?:\/\/[^\s'")]+/g, ruta).replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  /** Un hash corto y estable (djb2) para la firma: mismas cosas, misma clave. */
  function firma(partes) {
    var s = partes.join('|'), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  /** La primera línea del stack que sea de este sitio: `/hangman/game.js:120`. */
  function lugarDelStack(stack) {
    var lineas = String(stack || '').split('\n');
    for (var i = 0; i < lineas.length; i++) {
      var m = /(https?:\/\/[^\s()]+?):(\d+)(?::\d+)?\)?\s*$/.exec(lineas[i]);
      if (m && m[1].indexOf(location.host) !== -1) return ruta(m[1]) + ':' + m[2];
    }
    return '';
  }

  /** Lo que un navegador o una extensión tira y no es de la app. */
  function esRuido(msg, archivo) {
    if (/^(chrome|moz|safari|safari-web)-extension:|^webkit-masked-url:/.test(archivo || '')) return true;
    if (/ResizeObserver loop/.test(msg)) return true;
    if (/^(Uncaught )?Script error\.?$/.test(msg) && !archivo) return true;
    return false;
  }

  var V = {
    pagina: pagina(location.pathname),
    // A browser marked in the panel as not counted writes its live errors to `owner`, as stats.js does
    env: (function () { var e = entorno(location.hostname, location.pathname); try { if (e === 'prod' && localStorage.getItem('juegos-de-salon:not-counted') === '1') return 'owner'; } catch (_) { /* no storage */ } return e; })(),
    nav: navegador(navigator.userAgent),
    fallas: [],          // lo que se mandó en esta carga, para las pruebas (C-14)
    vistos: {},
    tipos: {},
    listoEn: null,
    noArranco: false,
    oculta: d.visibilityState === 'hidden',
    saliendo: false,
  };

  function version() {
    // The release meta set-version.py writes (D-467); the URLs carry content hashes, not the version
    var meta = d.querySelector('meta[name="release"]');
    var m = /^(\d+\.\d+\.\d+)/.exec((meta && meta.content) || '');
    return m ? m[1] : '0';
  }

  function enviar(cambios) {
    try {
      var url = BASE + '/stats/' + V.env + '/days/' + Math.floor(Date.now() / DIA_MS) + '.json';
      var p = fetch(url, { method: 'PATCH', body: JSON.stringify(cambios), keepalive: true });
      if (p && p.catch) p.catch(function () { /* mejor esfuerzo */ });
    } catch (_) { /* sin fetch o sin red: nada */ }
  }

  /** Un tipo de falla en esta carga: se cuenta una vez, y la primera de cualquier tipo suma `alguna`. */
  function contarTipo(tipo, cambios) {
    if (V.tipos[tipo]) return;
    V.tipos[tipo] = true;
    cambios['falla/' + tipo + '/' + V.pagina] = INC;
    if (!V.tipos.alguna) { V.tipos.alguna = true; cambios['falla/alguna/' + V.pagina] = INC; }
  }

  function anotar(tipo, mensaje, lugar) {
    try {
      if (V.saliendo || V.fallas.length >= TOPE) return;
      var m = limpio(mensaje), f = String(lugar || '').slice(0, 120);
      // Los números no separan errores: "índice 3" e "índice 4" son el mismo
      var id = firma([tipo, m.replace(/\d+/g, '#'), f.replace(/:\d+$/, ''), V.pagina, V.nav.replace(/\d+$/, '')]);
      if (V.vistos[id]) return;
      V.vistos[id] = true;
      var cambios = {};
      contarTipo(tipo, cambios);
      cambios['err/' + id + '/n'] = INC;
      enviar(cambios);
      // El detalle va aparte: las reglas lo dejan escribir una sola vez, y si fuera en el mismo
      // envío, el rechazo del segundo celular se llevaría también su cuenta
      var det = { k: tipo, p: V.pagina, m: m || '(sin mensaje)', b: V.nav, v: version(), at: STAMP };
      if (f) det.f = f;
      var una = {};
      una['err/' + id + '/d'] = det;
      enviar(una);
      V.fallas.push({ tipo: tipo, mensaje: m, lugar: f });
    } catch (_) { /* el vigía no puede ser otra falla */ }
  }

  // Errores sin atrapar y recursos que no llegaron. En captura: el `error` de un <script> o un
  // <link> no sube, y es la única forma de enterarse de un módulo que no se pudo bajar.
  w.addEventListener('error', function (e) {
    var t = e && e.target;
    if (t && t !== w && t.tagName) {
      var tag = t.tagName;
      var esHoja = tag === 'LINK' && /stylesheet/.test(t.rel || '');
      if (tag !== 'SCRIPT' && !esHoja) return;   // imágenes y audio: no frenan el juego
      var src = t.src || t.href || '';
      anotar('recurso', (tag === 'SCRIPT' ? (t.type === 'module' ? 'módulo' : 'script') : 'hoja de estilos') + ' que no cargó' + (src ? '' : ' (el de la página)'),
        src ? ruta(src) : ruta(location.href));
      return;
    }
    var msg = (e && e.message) || '';
    var archivo = (e && e.filename) || '';
    if (esRuido(msg, archivo)) return;
    var lugar = archivo ? ruta(archivo) + (e.lineno ? ':' + e.lineno : '') : lugarDelStack(e && e.error && e.error.stack);
    anotar('js', (e && e.error && e.error.name && msg.indexOf(e.error.name) === -1 ? e.error.name + ': ' : '') + msg, lugar);
  }, true);

  w.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    var msg = r && r.message ? (r.name && r.name !== 'Error' ? r.name + ': ' : '') + r.message : String(r);
    if (r && r.name === 'AbortError') return;   // un fetch cancelado al salir de la página
    if (esRuido(msg, '')) return;
    anotar('promesa', msg, lugarDelStack(r && r.stack));
  });

  // Irse no es una falla: lo que se corta al cerrar la pestaña no se anota
  w.addEventListener('pagehide', function () { V.saliendo = true; });
  d.addEventListener('visibilitychange', function () { if (d.visibilityState === 'hidden') V.oculta = true; });

  /** Cuánto tardó, en tramos: el panel no necesita el milisegundo. */
  function tramo(ms) {
    return ms < 1000 ? 's1' : ms < 3000 ? 's3' : ms < 6000 ? 's6' : ms < 10000 ? 's10' : 'mas';
  }

  // Si a los 20 s la página no arrancó, y estuvo a la vista todo ese rato, es que no arrancó
  var reloj = setTimeout(function () {
    if (V.listoEn !== null || V.oculta || V.saliendo) return;
    V.noArranco = true;
    var cambios = {};
    contarTipo('arranque', cambios);
    enviar(cambios);
    V.fallas.push({ tipo: 'arranque', mensaje: '', lugar: '' });
  }, ARRANQUE_MS);

  V.listo = function () {
    if (V.listoEn !== null) return;
    var ms = (w.performance && performance.now) ? performance.now() : 0;
    V.listoEn = ms;
    clearTimeout(reloj);
    // Si arranca después de los 20 s ya contó como que no arrancó: quien esperaba ya se fue
    if (V.oculta || V.noArranco || !ms) return;
    var cambios = {};
    cambios['listo/' + V.pagina + '/' + tramo(ms)] = INC;
    enviar(cambios);
  };

  // The tester ribbon on every screen (for lab key holders): vigía is the one script every page
  // loads, so it only adds the module next to itself; the module checks the key
  try {
    var yo = d.currentScript;
    if (yo && yo.src && w.location.pathname.indexOf('/panel/') < 0) {
      var boot = function () {
        var m = d.createElement('script'); m.type = 'module';
        m.src = new URL('tester-boot.js', yo.src).href; // next to vigía (and seen by the e2e scope graph)
        d.head.appendChild(m);
      };
      if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
    }
  } catch (_) { /* never in the way of the watcher */ }

  // Para las pruebas con node: las mismas cuentas que usa la página
  V._ = { entorno: entorno, pagina: pagina, navegador: navegador, ruta: ruta, limpio: limpio, firma: firma, tramo: tramo, lugarDelStack: lugarDelStack, BASE: BASE };
  w.__vigia = V;
})();
