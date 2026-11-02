# Cánones y estándares de Juegos de Salón

Reglas de construcción para **todos** los juegos de la app, actuales y futuros.
Se revisa **antes** de construir un juego nuevo y **antes** de modificar uno existente.
Cada canon tiene un ID (C-n) para citarlo en el código, en los commits y en las decisiones.

> Si un canon estorba en un caso concreto, no se ignora en silencio: se documenta la excepción
> en la especificación del juego y, si conviene para todos, se cambia este archivo.

---

## C-1 · Identidad y tono

- Español chileno informal por defecto; inglés y portugués son opcionales y se eligen a mano (C-3, D-514). Tuteo, humor liviano, sin groserías fuertes.
- **The audience is everyone, not only Chile** (D-324). The app was first made for Chilean tables, and the Chilean Spanish voice stays as its flavor, but no text, document or decision presents it as being for Chileans only. Content only one country knows is tagged and optional (D-186).
- **Instrucciones concisas** (U-8, U-18, D-184): la meta primero y con verbo, a lo más 3 puntos, nada de lo que el dibujo de ejemplo ya muestra y el puntaje en una frase. Un tope en `public/cup/games/juegos.test.mjs` frena lo que se pasa. Concisas no es telegrama: frases completas (U-1).
- Paleta y tipografías compartidas desde `public/assets/css/base.css`: fondo oscuro con degradados, acentos neón (rosado, amarillo, cian, lima), **Bangers** en títulos y **Nunito** en el cuerpo. The fonts are served from `public/assets/fonts/` (never from Google Fonts), with their OFL license, and every page that links `base.css` preloads `nunito-latin.woff2` and `bangers-latin.woff2` (the title font, so titles do not flash in the fallback) right before it (#851, `public/assets/css/fonts-preload.test.mjs`).
- **Las cifras que el jugador lee o compara** (teclados, intentos, números secretos) van en `var(--font-num)` (Nunito 900) con `tabular-nums`, nunca en Bangers: ahí el 1 y el 7 son casi el mismo trazo y los jugadores se equivocan (D-30). Bangers se queda en títulos, nombres, palabras y códigos de sala (letras, sin I ni O).
- Nada de estilos "de marca" propios por juego: un juego puede tener colores temáticos (el mar en Batalla Naval), pero botones, paneles, chips y títulos salen de las clases comunes.
- Cada juego tiene un emoji propio que lo identifica en el menú, la pestaña y la barra superior.
- Momentos de cierre con celebración: confeti y sonido al ganar o al terminar una partida.

## C-2 · Estructura de un juego

Una carpeta por juego dentro de `public/` (la raíz del sitio: carpeta = URL), con nombre en inglés,
en minúsculas y con guiones (`public/hangman/` → `/hangman/`, D-192), y siempre estos archivos:

```
public/<carpeta>/
  index.html      Pantallas como <section class="screen">, barra superior, contenedores #handoff y #cover
  style.css       Solo lo específico del juego
  rules.js        GAME_ID, DEFAULT_CONFIG y LOCALES = { es, en, pt, de }. Datos, sin lógica ni DOM
  engine.js       Reglas puras, sin DOM ni estado global. Testeable con node
  engine.test.mjs Tests del motor (node public/<carpeta>/engine.test.mjs)
  game.js         Máquina de estados y render. Lo único que toca el DOM
```

- **El id no es la carpeta** (D-192): el `id` es un dato —lo guardan las salas, el panel y el
  `localStorage`— y no cambia nunca; la carpeta es la URL y va en `path`. Un juego nuevo puede usar
  el mismo nombre en inglés para los dos. Si una carpeta se renombra, la ruta vieja queda como
  página puente (la genera `node tools/release/og.mjs cards`).
- Los juegos de La Copa siguen la misma idea en `public/cup/games/<carpeta>/`: `engine.js`
  (reglas puras), `ui.js` (pantalla) y sus datos propios; lo común a todos queda en `games/`.
  A game enters the Cup pool (`POZO`) with `copa: { pozo }` in its `games.js` entry, plus its loader in
  `cup/games/index.js`; `cup/engine.js` derives the pool and `manifest.test.mjs` checks both (#855).
  Uno suelto que todavía está en el laboratorio (`labs: true` en `SUELTOS`) tiene su página en
  `/labs/<slug>/`, y `/<slug>/` es página puente hasta que salga (D-267).
  Toda página de `/labs/` carga primero la puerta (`labs-puerta.js`) y lleva
  `<meta name="robots" content="noindex, nofollow">`, y sus puentes también el `noindex`
  (`og.mjs` los pone en las que genera; D-281). En `/labs/`, un proyecto va en **Proyectos
  activos** mientras se prueba y en **La Bodega** si no prosperó, plegado a su título (D-280), or once
  what it tried reached everyone (D-372): whatever is implemented for everyone moves to La Bodega in
  the same PR, folded, a game to 🎲 Juegos guardados and an improvement to ✨ Mejoras lanzadas
  (D-479, `public/labs/bodega.test.mjs`). The owner sends a feature live from its own card with **🚀 Publicar para todos**,
  which a headless session on the Mac mini turns into a PR with auto-merge (D-480).
- El juego se registra en `public/assets/js/games.js` con `id`, `emoji`, `name` y `tagline` por idioma, `players`, `duration`, `path` y `available`. Con sala, también `jugadas`: los tipos de mensaje que hace una persona, que es lo que el panel cuenta como jugadas (D-138).
- El `<head>` de cada página de la app lleva el manifest, el ícono y el nombre del iPhone
  (`apple-touch-icon` y `apple-mobile-web-app-title`), el script que elige el manifest del idioma
  justo después del `<link rel="manifest">`, el vigía (`vigia.js`) antes de las hojas de estilo
  (C-7, D-251), y, después de las hojas de estilo, el
  registro del service worker (`import '<…>assets/js/instalable.js'`, que además pone el manifest y
  el nombre del idioma elegido, y trae `llegada.js`, que repite encima el dado de Juego al azar hasta
  que el juego está dibujado: una `.screen.active` que no sea `#screen-espera`, D-237; only on the
  game the dice opened, D-375): así la app se
  puede instalar desde cualquier juego, con su nombre.
  Se copian de otro juego; `public/assets/js/instalable.test.mjs` los exige (D-221, D-222).
- Las páginas en git no llevan import map: lo escribe `set-version.py` solo en la copia que se publica,
  recorriendo todos los módulos del sitio, así que los de un juego nuevo entran solos (C-11, D-192, D-205).
- Reutilizar siempre los módulos compartidos antes de escribir uno nuevo:
  `public/assets/js/ui.js` (DOM, confeti, vibración, wake lock), `i18n.js`, `sound.js`, `session.js`, `handoff.js`, `transport/`.
  Lo mismo con los estilos de `base.css`: una hoja que sube desde abajo con pasos o ajustes es la
  `.hoja` (con `.hoja-capa`, `.hoja-paso`…), la de los avisos de La Copa y del globo de la portada (D-232).

## C-3 · Idiomas

- **Español es el idioma por defecto.** Quien entra a juegosdesalon.cl sin haber elegido nada ve la app en español, sea cual sea el idioma de su navegador: nunca se detecta con `navigator.language`. Inglés y portugués son opcionales: solo se activan cuando la persona toca el toggle, y la elección queda guardada en el dispositivo (D-47). El alemán salió (D-514): quien lo tenía guardado, o llega con `?lang=de` o por `/de/`, queda en inglés (`RETIRADOS` en `i18n.js`).
- **El idioma también puede venir en el link:** `?lang=pt` en cualquier página, o las puertas `/pt/` y `/en/`. Se aplica, se guarda y el parámetro se saca de la barra. No es detección: alguien lo eligió, para sí mismo o para quien recibe el link. La invitación a una sala lo lleva pegado con `withLang()` (D-74).
- Todo texto visible vive en `LOCALES.es`, `LOCALES.en` y `LOCALES.pt` de `rules.js`. Ninguna cadena literal en `game.js`.
- Los textos fijos del HTML se marcan con `data-i18n="clave"` (o `data-i18n-html`) y se aplican con `applyStatic(T)`.
- El idioma se lee con `getLang()` y el toggle `langToggle()` va en la intro de cada juego.
- **El selector de idioma es uno solo, `langToggle()`, y se ve igual en toda la app** (D-231).
  Ninguna pantalla arma el suyo. Su estándar:
  - Una píldora de vidrio (`--glass`) con un botón por idioma de `LANGS`, en el orden de `LANGS`.
  - **Each button carries only its flag** (🇪🇸, 🇬🇧, 🇧🇷), without the ES/EN/PT code (D-524),
    at least 44 × 44 px (C-8), so the toggle stays narrow on any screen.
    La bandera identifica el idioma, no el país de quien juega: el español va con 🇪🇸 (D-244). Salen de `BANDERAS` en `i18n.js`, en emoji, nunca
    en SVG: en Windows se ve como dos letras y se acepta (D-231).
  - The chosen one sits on yellow (`--yellow`) and slightly larger; the others on a transparent background.
  - Cada botón mide al menos 44 px de alto (C-8), dice su idioma en su propio idioma a quien
    no ve la bandera (`NOMBRES_IDIOMA`, como `aria-label` y `title`): with no code beside it, that name is what
    screen readers and a hover give.
  - Un idioma nuevo trae su bandera y su nombre: la prueba de paridad lo exige.
- Las traducciones se adaptan, no se calcan: los chistes y las referencias locales se reemplazan por equivalentes. El portugués es el de Brasil, informal ("você", "celular", "rolê"), y los nombres de los juegos se traducen (Quarto Rei, Toque e Fama, Batalha Naval, Linha do Tempo) igual que en inglés (D-48).
- **En La Copa, lo personal va en tu idioma y lo del grupo en el de la copa** (D-170): la pantalla
  sigue el toggle de quien mira, pero las palabras de Agentes, Conexiones y Palabra, los mensajes que se
  comparten al grupo y su link van en el idioma que se eligió al crear la copa. El contenido con
  palabras es propio de cada idioma, no una traducción.
- **Todos los diccionarios (`IDIOMAS`, también los del laboratorio) tienen exactamente las mismas claves**, las listas el mismo largo y las plantillas las mismas `{llaves}`: un texto que falta en un idioma se ve como `undefined` en pantalla, y `errText` (C-14) busca la misma clave en cualquier idioma. Lo verifica `node public/assets/js/i18n.test.mjs` (menú, frases, mazos y todos los juegos). Los mazos de Línea de Tiempo llevan `es`, `en`, `pt` y `de` en cada carta, y el test del motor también lo exige.
- Las plantillas usan `{llaves}` y una función `fmt()`; nunca se arman frases concatenando palabras sueltas.
- **Un idioma nuevo entra por el laboratorio** (D-191): con todos sus textos (la paridad recorre
  `IDIOMAS`), pero en `EN_LABS`, que lo ofrece solo en el dispositivo que entró por
  `/labs/<idioma>/`. Sale del laboratorio cuando quienes lo hablan lo revisaron. Hoy no hay
  ninguno: el alemán pasó por ahí, salió (D-197) y después dejó la app (D-514).

## C-4 · Sonido y vibración

- Efectos sintetizados con Web Audio en `public/assets/js/sound.js`. Sin archivos de audio.
- Botón 🔊/🔇 en la barra superior de cada juego. La preferencia se guarda y vale para toda la app.
- Se desbloquea el audio con el primer toque (`initSound()`), requisito de iOS.
- Hay sonido en: toque de botón, acción principal del juego, resultado (bueno y malo), cambio de turno, final.
- `vibrate()` acompaña los momentos importantes, nunca sola como único indicio.

## C-5 · Modos de juego

On every landing the modes (or the start button) come right after the cover, the title and the language toggle, and the rules and steps go below them (U-39, D-344).

Un juego para dos personas ofrece los tres modos, en este orden en la intro:

1. **📱 Un celular** (pasar y jugar). Es el modo base y el respaldo cuando la red falla.
2. **📡 Dos celulares** (sala con código de 4 letras y QR).
3. **Un jugador**: **🤖 Contra el celular** cuando el juego tiene información oculta que le da sentido a una IA (Batalla Naval, Dudo), o **🧍 Jugar solo** con puntaje y récord cuando un rival de máquina no agrega nada (Línea de Tiempo, ver D-27; Toque y Fama, ver D-129). La tarjeta del menú dice "1–N jugadores".

Un juego de grupo (más de dos) elige si se ofrece en un celular, en varios o en los dos; lo que
no ofrece no se muestra (D-213). "Próximamente", deshabilitado y a la vista, es solo para un
modo que el juego piensa tener.

## C-6 · Memoria de partida (obligatorio en todos los modos)

**Toda partida en curso se puede retomar.** Vale para un celular, contra el celular y dos celulares.

- Se guarda con `createSessionStore(GAME_ID)` de `public/assets/js/session.js`, bajo `juegos-de-salon:<id>:session`, con caducidad de 12 horas.
- Se guarda después de cada acción que cambia el estado, no solo al final de un turno. Incluye el trabajo a medio hacer (una flota a medio colocar, notas del jugador).
- La intro muestra un panel "⏯ Hay una partida a medias" con **Continuar** y **Borrar** mientras exista una partida sin terminar.
- Al terminar la partida se marca `done: true` y el panel deja de ofrecerse.
- Empezar una partida nueva borra la guardada.
- En juegos con reductor de mensajes se guarda la lista de mensajes y se retoma reproduciéndola (`createLocalTransport({ seed })`); los datos privados (número secreto, flota) van en `private`, nunca viajan por la red.
- Al retomar en modo un celular se vuelve a mostrar la pantalla de pase o la pantalla tapada: nadie sabe quién tiene el teléfono.
- Escribir en `localStorage` puede fallar (modo privado, cuota). Siempre en `try/catch`: si falla, el juego sigue funcionando sin memoria.
- El nombre del jugador se recuerda entre partidas con `createNameStore(GAME_ID)`. Un juego de grupo en un celular recuerda además la mesa entera con su `list()`/`setList()` (`juegos-de-salon:<id>:names`); una clave vieja de esa lista va en `legacyKeys` y se muda sola la primera vez.

## C-7 · Transporte y multijugador

- El estado de una partida se deriva de una **lista de mensajes** (`view()`), nunca de variables sueltas de turno. Así la reconexión es "volver a leer los mensajes".
- Los mensajes se procesan en serie; los duplicados y los fuera de turno se descartan en el reductor.
- **Lo que se reparte sale de la semilla:** cartas, palabras y todo lo repartible se derivan de la
  semilla compartida que va en la lista de mensajes, así cada celular llega al mismo reparto sin
  mandarlo. La excepción es lo oculto que nadie debe poder calcular con el código, que es público: los
  dados de Dudo van comprometidos con hash y sal (D-70) y las manos de Julepe en sobres cerrados
  (D-81). Ver C-10. Y lo que se tira a la vista de todos no se reparte: los dados de Generala los
  tira el celular de quien juega y viajan en claro, porque con la semilla se podrían calcular los
  próximos tiros (D-246).
- Todos los modos usan la misma lógica: cambia el transporte, no el juego.
  `public/assets/js/transport/local.js` (mismo dispositivo, también para la IA) y `firebase.js` (sala remota).
- Creating and joining an online room goes through `public/assets/js/room-flow.js` (`roomFlow({ game, maxPlayers, defaultConfig, start })`, #860): the game keeps only its own `startOnline`.
- Interfaz del transporte: `create`, `join`, `send`, `onMessage`, `onPresence`, `leave`, `dispose`.
- **Campos reservados del transporte:** `from`, `at` (marca de tiempo) e `id`. Un juego que necesite enviar una posición o una cantidad usa otro nombre, o el transporte se lo pisará sin avisar.
- **Firebase no guarda una lista vacía:** el campo simplemente no queda. Una lista que puede ir vacía viaja como texto (`"1,4,8"`, o `""`) y el motor la lee aceptando la cadena, la lista cruda del transporte local y el campo ausente (D-60).
- Salas: código de 4 letras mayúsculas sin I ni O, QR con `?room=CÓDIGO`, campo `game` para separar juegos, caducidad de media hora sin jugadas y de 6 horas en total (D-89). Roles de A a F (hasta seis jugadores).
- **Antes de tocar la sala se espera la conexión.** Crear o entrar espera a `.info/connected` (8 s) y corre con tope (12 s), y el tope de salas por celular se revisa antes de la red (`errors.js`, `ratelimit.js`). Sin eso, quedarse sin señal se ve como un botón pegado para siempre.
- **Un celular no puede abrir salas sin parar:** 20 por hora y 80 por día (D-41). El tope está sobre el uso legítimo más intenso, no sobre el promedio, porque la revancha abre sala nueva. Si `localStorage` falla, se deja crear: bloquear a un jugador legítimo es peor que dejar pasar a un abusivo.
- **Cada partida deja una señal de uso para el panel del dueño** (`public/assets/js/transport/stats.js`, D-44). El transporte apunta las salas solo; los modos sin red llaman `trackStart({ game, mode, players })` al empezar (no al retomar) y `trackFinish({ ganador, empate, detalle })` al terminar. Es un `fetch` por REST, sin SDK, mejor esfuerzo: nunca se espera ni se muestra. Un modo sin red manda quién juega —los nombres que la partida ya tiene (`nombres` en `trackStart`) o, si no hay, el último que la persona escribió en la app (`nombreDelCelular`)— y cómo terminó, una sola vez (D-210), además del idioma elegido en la app (D-211). Nunca sale un secreto, el chat ni una IP. Quien **entra a propósito** con su nombre y PIN para los rankings (D-212) manda además su mejor puntaje y sus partidas a su jugador; sin entrar, nada de eso. De una **sala** quedan además el país del celular y quién ganó, que es lo que el panel muestra como bitácora (D-79). Una partida sin red se ve en vivo en el panel porque `trackStart` le arranca un latido (D-140): el juego no tiene que hacer nada más.
- **Cada página que carga módulos lleva el vigía** (`<script src="…/assets/js/vigia.js"></script>`
  en el `<head>`, antes de las hojas de estilo; no en el panel ni en las puente, D-251): anota lo que
  falla al cargar o al jugar para la sección Salud del panel. "Arrancó" lo avisa `trackVisit`, así que
  la página lo llama al cargar, como ya hacía. Lo comprueba `public/assets/js/vigia.test.mjs`.
- **Room writes nobody waits for are handled in the transport** (`public/assets/js/transport/best-effort.js`,
  D-320). The games fire `send()` and move on, and nobody awaits the presence writes either, so a
  rejection there would reach the vigía as an unhandled one. `firebase.js` passes the `push` of
  `send()` through `message()` and the presence writes and the background room note through
  `quiet()`. A denied message that is already on the server is a resend after a reconnect (the SDK
  sends again every write whose ack was lost, and a message can only be written once), so it is not
  reported; any other failed message is raised again so the vigía still counts it, and a failed
  presence write or room note only goes to `console.warn`. `send()` still returns the same promise.
  `best-effort.test.mjs` fails on any Firebase call in `firebase.js` that nobody awaits, returns or catches.
- **Irse a propósito cierra la sala.** `leave()` suelta los oyentes y deja la sala esperando; `dispose()` es la despedida: escribe `left` en el rol y borra la sala si con eso no queda nadie adentro (`public/assets/js/transport/dispose.js`, D-50). Lo llaman el botón de cancelar o salir de la sala del lobby, el de cambiar de modo al final y el cambio a la sala de la revancha. **Cerrar la pestaña o quedarse sin señal no es irse:** eso solo apaga `online`, porque esa partida se puede retomar (C-6), así que nada de esto cuelga de `pagehide`. Nunca lanza, lleva tope corto y, si falla, la sala queda marcada y la borra la papelera.
- **Las salas vencidas se borran solas.** Al crear o entrar a una sala, el celular la apunta en la papelera (`cleanup/days/<día>`, `public/assets/js/transport/cleanup.js`, D-39). A new room is noted in the same write that creates it, so a room that exists is always in a bucket (D-321). Phones do not sweep: the nightly `room-sweep` job deletes the expired rooms of every closed bucket and the unnoted ones (`tools/firebase/room-sweep.mjs`, D-499). Nada de esto se le muestra al jugador ni puede voltear una partida.
- Taking a seat is a race: two phones can join at the same instant. A seat is taken with a Firebase transaction that writes the phone's `uid` only if no other phone holds that seat, so exactly one phone gets it and the other moves on to the next free seat, or hears the room is full (`public/assets/js/transport/seat.js`, #850). The first free seat that was read is never assumed to still be free.
- Cuando hay más de dos jugadores, uno es anfitrión (rol A) y abre la partida cuando están todos.
- Quien abre un enlace de sala (`?room=CÓDIGO`) llega a una pantalla que **solo** deja unirse a esa sala: título propio de invitación, nada de botón para crear otra, el código va fijo y de solo lectura, y los ajustes de la partida no se muestran porque los fija el anfitrión. Ofrecer las dos cosas confunde a quien fue invitado.
- El enlace de la sala se comparte con el diálogo nativo del sistema (`botonInvitar` en `public/assets/js/compartir.js`); copiar al portapapeles es solo el respaldo cuando el navegador no tiene ese diálogo. El diálogo del celular ya incluye copiar, así que no se pierde nada.
- **Todo lo que se comparte** pasa por `public/assets/js/compartir.js` y sigue su estándar (D-165, U-30, U-33): cabecera `{emoji} *{título}* · {contexto}`, una idea por línea y el link solo al final; si va imagen, lleva arriba la misma cabecera y abajo el mismo link (`lamina`, `laminaResultado`), y se manda junto con su texto. Las invitaciones van solo con texto; la app, desde la portada, con su tarjeta social del idioma como imagen (`compartirApp`, D-226) y un texto que nombra todo lo principal, una línea cada cosa (`LO_PRINCIPAL`, D-271, U-35). Un juego nuevo no arma su propio mensaje ni su propio botón.
- Se muestra cuando el rival se desconecta y se retoma solo cuando vuelve.
- La revancha crea una sala nueva y mueve a los dos jugadores; parte quien perdió.

## C-8 · Interfaz táctil

- Objetivos táctiles de 44 px como mínimo; los controles pequeños llevan área táctil ampliada invisible.
- `.app` mide `calc(100svh - muescas)`, el alto chico de la pantalla, no `100dvh`: lo que se apoya abajo tiene que verse también cuando el navegador muestra toda su interfaz. Se revisa con `node tools/e2e/look.mjs <juego> <pantalla> --notches` (D-77).
- Las acciones irreversibles se confirman: seleccionar y luego confirmar (por ejemplo elegir casilla y tocar "¡Fuego!").
- **Nada se preselecciona** en una jugada que se confirma. La app no elige por el jugador: sin selección explícita, el botón de confirmar va deshabilitado. En una lista que se desplaza, un toque puede irse en scroll y no llegar nunca; si había algo preseleccionado, el jugador termina confirmando lo que no eligió (D-38). Un ajuste de la partida sí puede venir con un valor por defecto, si se ve y se puede cambiar antes de empezar (D-213). **Jugada** es lo que se elige durante la partida y se confirma con un botón (una casilla, una carta, una apuesta, una respuesta). **Ajuste** es lo que se elige antes de que la partida empiece y vale para toda ella (jugadores, mazo, temática, número de rondas, el género en Cuarto Rey, las opciones de una copa al crearla o inscribirse), aunque se elija entre una partida y la siguiente.
- El botón que confirma **dice sobre qué actúa** ("Colocar aquí · 🔍 Se funda Google"), no solo la acción.
- Nada importante bajo la línea de flotación en un celular de 812 px: los botones de la pantalla final deben verse sin desplazar.
- Si una lista puede crecer sin límite, el botón de confirmar va flotando (`position: sticky; bottom: 0`) con un degradado detrás, nunca al final del contenido.
- Los bloques largos (repaso de la partida, reglas) van colapsados por defecto.
- Sin scroll horizontal. Las grillas y tablas se adaptan al ancho.
- **Aire entre el tablero y sus botones** (D-309): el tablero de juego, y lo que resume la partida en el resultado, lleva `data-tablero`; `base.css` le da 28 px (`--aire-tablero`) hasta lo de abajo, descontando el gap del contenedor (`--gap-contenedor`) y el relleno de la barra de botones (`--aire-ya`, que declara el juego). No se separa con márgenes sueltos. Cada captura de los guiones lo mide y marca ✗ bajo 24 px; `look.mjs` lo informa.
- Las etiquetas de una grilla (letras, números) van **dentro** de la misma grilla CSS, como una fila y una columna más; nunca en un contenedor aparte que se alinea "a ojo", porque cada navegador lo estira distinto (pasó en Safari con Batalla Naval).
- Se respeta `prefers-reduced-motion`.
- Un toque fuera de un elemento seleccionado lo deselecciona.
- **De quién es el turno se ve sin leer** (D-92): con señales redundantes —el color y la forma de la barra de estado o el asiento encendido, lo tocable vivo y lo ajeno apagado—, un toque fuera de turno que responde (C-8b) y, al llegar el turno, `SFX.turn()` con vibración.
- **Arrastrar es elegir, nunca confirmar** (D-85). Donde haya arrastre, soltar deja la jugada
  elegida y la acción irreversible sigue colgando del botón que la nombra; el camino de toques
  queda intacto, y el gesto sale de `public/assets/js/arrastre.js`, no de una implementación propia.
  El navegador no se lo puede llevar: `overscroll-behavior: none` en `<html>` y `<body>` (que el
  deslizar para actualizar no recargue la partida) y `touch-action` en toda la zona de arrastre, no
  solo en cada pieza (D-86). Un gesto nuevo se prueba en un celular de verdad (D-67).
  The phone's own back gestures (iOS's edge swipe, Android's Back) cannot be blocked: since D-432
  (for everyone since 2026-10-23), while a game is on, `public/assets/js/back-guard.js` catches them and asks
  «¿Salir de la partida?»; the header's «‹ Menú» (`a.back`) asks the same, and Salir follows it.
  `trackStart` arms it and `trackFinish` / `trackEnd` disarm it, so a game that reports its start and
  end gets it without code of its own.
  Lo que se arrastra se dibuja en grande y **por sobre el dedo**: si el texto era chico en la
  lista, arrastrarlo bajo el dedo lo deja igual de ilegible y además tapado.
- Se muestra en pantalla lo que el jugador necesita recordar (su número secreto, su flota), tapado si el celular pasa de mano.

## C-8b · Errores del jugador

- Un error se muestra con una señal inconfundible (color, sacudida, sonido propio) y se queda en pantalla hasta que el jugador toca; nunca se cierra solo ni lo pisa la jugada de otro.
- Esa señal es **para quien se equivocó**. A los demás el mismo hecho les llega como noticia, en tercera persona y sin el fondo rojo: “¡Cata se equivocó!”, no “¡Te equivocaste!” (D-36).
- Va acompañado de una explicación corta y concreta de qué estuvo mal, con los datos del juego (por ejemplo, entre qué hitos iba la carta y entre cuáles se puso). **Excepción, cuando la respuesta ya se ve** (D-277): en Línea de Tiempo, ⏳ Línea Relámpago y 📅 ¿En qué año? el año de la carta, grande, ya dice qué estuvo mal; en vez de repetirlo, el veredicto cuenta el **dato** de la carta, algo que el jugador se lleva, y lo cuenta también al acertar (D-314). Si el juego corre contra el reloj, el reloj se pausa mientras se lee, con tope. Una carta sin dato vuelve a decir entre qué hitos iba.
- Un acierto o la jugada de otro puede cerrarse solo tras un par de segundos (los que tome leer su dato, con una barra que se vacía, D-314), si después no viene un pase de celular; un toque lo cierra antes. Si viene un pase, manda C-9 (D-213).
- El temporizador que cierra un aviso solo puede cerrar ese aviso, no uno más nuevo.
- **Excepción, cuando errar es la jugada normal** (D-56): en El Ahorcado, una letra que no está no abre un aviso que haya que cerrar en los modos donde el celular no cambia de mano; se señala por cuatro canales (color, sacudida, sonido y el dibujo que avanza) y el juego sigue. El veredicto de la ronda sí se queda hasta que el jugador toque.

## C-9 · Transiciones de "pasar el celular"

- En modo un celular, entre turnos siempre hay: **resultado de lo que acaba de pasar** y, debajo, **"Pásale el celular a X"** con un botón. Nunca se salta el resultado.
- Se usa `public/assets/js/handoff.js` (`showHandoff`, `passBlock`, `showCover`), no una implementación propia.
- Cuando hay un botón de pase, solo el botón avanza: un toque accidental no puede cerrar la pantalla antes de leerla. El resultado se queda hasta el botón; nada lo cierra con un temporizador (D-213).
- La información secreta se tapa con `showCover` antes de que el siguiente jugador mire.

## C-10 · Anti-trampa

Cuando cada dispositivo guarda un secreto (un número, una flota):

- Al fijarlo se publica `sha256(secreto + sal privada)`; la sal se revela solo al final.
- Al terminar se revelan los secretos y cada dispositivo verifica el hash **y** recalcula todas las respuestas dadas por el rival.
- El resultado se muestra al jugador: "verificado ✅" o "⚠️ no coincide".
- El secreto nunca viaja por la red durante la partida.
- **Lo oculto que sí tiene que viajar** no sale de la semilla (C-7): los dados se tiran en cada celular y se publica `sha256(dados + sal)`, que se verifica al destapar (D-70); un reparto se cierra por jugador, con la llave pública de cada uno (`public/assets/js/sobre.js`), y al cerrar la mano cada uno destapa lo suyo para verificarlo contra lo jugado (D-81).

## C-11 · Publicación y versionado

- La versión de una publicación es la primera entrada de `CHANGELOG.md` (`## X.Y.Z — fecha`) subida una vez por cada entrada de `changelog/` que todavía no se juntó, en el orden en que llegaron a main (`tools/release/changelog.mjs`, D-300). Cada PR deja la suya sin número en `changelog/<rama>.md`. Las páginas en git no la llevan (D-205).
- Al publicar, `publish.yml` corre `set-version.py --site _site`: stamps each file with `?h=<8 hex of the sha256 of its content>` (D-467) in the import maps, the stylesheets, the classic scripts (the watchdog, D-251), the `<link rel="modulepreload">` hrefs (home page) and the card images, writes `<meta name="release" content="X.Y.Z-<commit>">` and the version in the menu footer, only in the copy that gets uploaded. A publish that changes one file invalidates only that file (and the pages' HTML), and two open PRs do not collide.
- Que el README (C-13) y las tarjetas (D-181) no hayan quedado atrás lo frena el check `tests` de cada PR, y se vuelve a revisar antes de publicar.
- Los módulos nuevos entran solos: el script recorre `**/*.js` del sitio y estampa toda página que cargue módulos (D-192).
- Se publica solo `public/`, con `.github/workflows/publish.yml`, en cada fusión a main y solo si pasan las pruebas y la punta a punta (D-192, D-302).
- El menú dibuja la lista de juegos **antes** que cualquier adorno, y los adornos van en `try/catch`: un adorno roto no puede dejar la app vacía.
- Cada cambio publicado entra en `changelog/` sin número, y el agente de procesos lo junta en `CHANGELOG.md` con su versión (D-300).
- Se verifica que el sitio publicado sirva la versión nueva antes de darla por lista: lo hace el último paso de `publish.yml` (D-205).
- The PR's session learns of the merge without the owner (D-323): with auto-merge on, the last step of the required `end-to-end` check comments on the still-open PR that it merges now (`tools/release/merge-report.mjs --ready`), without holding the check; the session learns of the merge with `tools/agents/wait-pr.mjs`, which it runs in the background after turning on auto-merge (D-400). After publishing, the `report` job of `publish.yml` comments on the merged PR "✅ Merged and published" with the version, or "❌ Merged, but not published" with the step that stopped it: a record, not a wake-up.

## C-12 · Pruebas

- El motor de cada juego tiene tests que corren con node, sin navegador. GitHub los corre todos en cada PR y en cada fusión a main (D-143): un PR con ❌ no se fusiona. `main` exige `tests` y `end-to-end` (el resumen de los guiones en Chrome), y un PR listo lleva auto-merge: GitHub lo fusiona solo cuando los dos pasan (D-216). The only exception is the owner explicitly saying not to auto-merge a PR (D-419).
- **Lo vigila un test, no la memoria** (D-213): `node public/assets/js/games.test.mjs` exige a cada juego de `GAMES` su motor y sus tests (C-2), el gancho `window.__…` (C-14) y la especificación con las secciones de C-13 en orden y el gancho nombrado. Lo que un juego todavía no cumple va en `EXCEPCIONES` de ese test, con la decisión que lo deja pendiente; cuando el juego se pone al día, el test pide borrar la excepción.
- Antes de publicar se prueba el juego de punta a punta en Chrome headless: partida completa en cada modo, con recarga a mitad de partida y revancha.
- El modo de dos celulares se prueba con dos instancias del navegador, y al menos una vez contra la URL publicada.
- Un cambio en un módulo compartido obliga a repetir la regresión de **todos** los juegos.
- Se revisan capturas reales de cada pantalla, no solo el resultado de los asertos: los problemas de diseño se ven, no se afirman. Rehacerlas no es revisarlas: antes de publicar se mira la hoja de contacto (`node tools/e2e/contact-sheet.mjs <seccion>`), que las pone juntas al tamaño del README (D-76).
- Una captura se saca con la pantalla quieta. Congelada a media animación, una lista con entradas escalonadas se fotografía con las filas a distintos anchos y parece un error de CSS que no existe (D-76).
- Consola sin errores es parte del criterio de aceptación.
- **Cada pantalla se prueba en todos los idiomas que se ofrecen** (D-199): el `languages.mjs` de cada
  juego en `tools/e2e/` recorre las pantallas de `paths.mjs` en cada idioma de `LANGS` contra
  el español. Un guion que mira algo de un idioma recorre `LANGS`, no una lista escrita a mano, y
  saca del diccionario lo que espera: así un idioma nuevo queda probado el día que entra.

## C-13 · Documentación

Con cada juego o cambio relevante se actualiza:

- `docs/games/<carpeta>.md`: la especificación, con estas secciones en este orden: Resumen,
  Reglas, Modos, Flujo, Protocolo de mensajes, Archivos y Excepciones a los cánones (D-213). Lo que
  un juego necesite además va en una sección propia. Los juegos de La Copa viven en `cup.md`.
- `docs/REQUERIMIENTOS.md`: requerimientos con prefijo propio y estado.
- `docs/decisions/D-<n>.md`: one numbered decision (D-n) per non-obvious choice, with its why and its consequences; `docs/DECISIONS.md` is its generated index (D-394).
- `README.md`: sección del juego con capturas, **en inglés** (ver abajo).
- `CHANGELOG.md`: qué cambió, en qué versión.

**Everything internal is in English** (D-316, which amends D-78): documents, decisions, specs,
changelog entries, code comments and identifiers, file names, tool messages, commits, PRs and
GitHub issues. Only what the player reads stays in the app's languages (C-3), and persisted data
keys keep their names. The README is the first door for people from anywhere: what it shows
generated is English too (modes from the `en` of each `rules.js`, themes from the `en` of the decks,
captions in `docs/capturas.json`). Spanish text and names still in the repo are migrated in phases
(D-316); new text is English even inside a file that is still Spanish.

El README no se mantiene a pulso: `python3 tools/release/readme.py` lo sostiene.

- Lo derivable del código —tabla de juegos, modos, temáticas con su cuenta de cartas, nombres
  por idioma, tests, índice de documentos y galerías de capturas— vive entre marcas
  `<!-- generated: ... -->` y lo reescribe `update` desde `tools/release/facts.mjs`, que importa
  los módulos de verdad. Dentro de esas marcas no se edita a mano.
- La prosa la escribe una persona. `check` compara los hechos de hoy contra el último sello
  (`docs/facts.json`) y nombra qué cambió y qué sección hay que releer; `seal` lo anota
  cuando ya se releyó. Un cambio material que no pasó por ahí no llega a publicarse:
  el check `tests` corre `readme.py check` en cada PR y antes de publicar (C-11, D-205).
- Las capturas salen de los guiones de `tools/e2e/`: `docs/capturas.json` dice de qué guion y
  de qué toma sale cada imagen, y `capturas <seccion>` las rehace. Una pantalla nueva en el
  README es una toma nueva en el guion, no un recorte a mano. Se miran antes de publicar
  (C-12) y se guardan al doble del ancho con que se muestran.
- Una captura atrasada es un aviso en un PR cualquiera, no lo frena. Solo "actualiza el README"
  exige dejarlas todas al día (D-213).

Lo que se atrasa igual lo recoge el agente `documentation` (D-172): una ronda sobre lo que
entró a `main`, que lanza el agente de procesos los días que entró algo (D-276), y una revisión de cada PR antes de proponer su fusión, con
`node tools/agents/document.mjs check` y su memoria en `docs/documentation.json`. No reemplaza esta
regla: quien cambia algo lo documenta en su mismo PR.

## C-14 · Robustez

- Nada de dependencias de npm ni de paso de compilación: el repo publicado se abre y funciona.
- Las bibliotecas externas (QR) se cargan bajo demanda y su falla no rompe la pantalla. The room QR is drawn by the shared module `public/assets/js/qr.js` (`renderQr`), which loads a copy of the library served by the site itself (`public/assets/js/vendor/qrcode.js`, qrcode-generator 1.4.4, unchanged), never from a CDN; a game does not carry its own copy of that code.
- Cada juego expone un gancho de solo lectura `window.__…` para las pruebas automatizadas, nombrado en la especificación del juego (D-213).
- La pantalla no se apaga jugando (`keepAwake()`).
- An animation that runs on its own (a cover's demo) draws through `onScreen` (`public/assets/js/on-screen.js`), so it stops asking for frames while scrolled off screen; a loop bounded in time or tied to a turn does not need it (#883).
- Los errores previsibles se muestran al jugador en su idioma, con una salida clara; nunca una pantalla en blanco.
- **El mensaje no inventa la causa.** Si desde el navegador no se puede distinguir entre dos causas (quedarse sin señal y toparse con el tope de conexiones se ven igual), el texto las nombra a las dos en vez de elegir una. Precisión falsa es peor que vaguedad honesta (D-40).
- Los errores del transporte se traducen con `errText`/`failWith` de `public/assets/js/transport/errors.js`, nunca con un mapa propio en cada juego.
- Creating or joining a room goes through `tryRoom` (same module): the button says it is waiting, and a room that can't be reached offers one-phone mode under the message (U-37, D-319).
- The rematch button goes through `tryRematch` (same module): if the new room can't be opened or joined, the room text shows under the button and the button comes back; it never fails silently or leaves an unhandled rejection (D-322).
- **Un reintento nunca traba** (U-22, D-123): si una escritura que se hace una sola vez choca al reintentar, primero se mira si la anterior llegó (aunque el celular haya mostrado error); si llegó, se sigue como si hubiera salido bien.
- **A la consola solo va lo inesperado.** Un error previsto que ya se le mostró al jugador no se registra: si la consola se llena de fallas normales, "consola sin errores" deja de servir como criterio (C-12).

## C-15 · Chat de sala

Solo en los modos de **varios celulares**: en un celular la gente está mirando la misma pantalla y hablando en voz alta, y en solitario no hay con quién.

- Se usa `public/assets/js/chat.js` (`createChat`), no una implementación propia. Los textos salen de `LOCALES` del juego (C-3).
- A text field in a fixed layer (chat, the 💬 feedback form) keeps clear of the iOS keyboard with `public/assets/js/keyboard.js` (`followKeyboard`, which sets `--kb` from `visualViewport`), not its own listener. The feedback form uses it behind `flag('keyboard-lift')` (#883); `chat.js` still has its own copy of the same logic until it is moved over.
- Vive en su propio contenedor (`<div id="chat">`), hermano de `#handoff` y **fuera** de las `.screen`: los re-render de la partida no pueden borrar lo que el jugador está escribiendo.
- Los mensajes viajan por el mismo transporte que las jugadas (`{ t: 'chat', text }`), pero **no son parte del estado**: el reductor los dibuja y no los guarda. Un mensaje de chat no vuelve a dibujar la partida.
- El chat **muere con la sala**, no con la partida: sigue vivo en la pantalla de victoria o derrota, que es donde la conversación se cierra sola (D-35). No se guarda en la memoria de partida (C-6), y la revancha crea una sala nueva y por lo tanto un chat en blanco. Al reconectar se recupera de la sala, sin sonido ni globito de no leídos.
- No aparece sobre las pantallas de veredicto: el chat va por debajo de `#handoff` y se cierra solo cuando llega el turno del jugador (salvo que esté escribiendo).
- The bubble lives in a strip of its own at the bottom of the screen: with the chat on, one shared rule in `base.css` (`body.chat-on .screen.active`) makes every room screen end above it, so it never covers a button or the board (C-8). A game does not add its own padding for the bubble; a sticky bar stops above it. Check a screen with `node tools/e2e/look.mjs <game> <shot> --chat`.
- Burbuja flotante con globito de no leídos; sonido discreto y vibración corta al recibir, sujetos al botón de silencio (C-4).
- Un mensaje nuevo se asoma unos segundos al lado de la burbuja, con el nombre de quien escribe: el globito dice *cuántos*, la etiqueta dice *qué*. Se puede tocar para abrir el chat y desaparece sola.
- Límites: 120 caracteres por mensaje, un mensaje cada 1,2 s por celular y los últimos 60 en pantalla. Las reglas de Firebase validan el largo del texto.
- La sala se lee con solo saber el código: el chat no es privado y no se usa para nada sensible.

## C-16 · El panel se entera solo

El panel del dueño (`/panel/`) no lleva su propia lista de juegos, ni de modos, ni de idiomas:
lee las mismas listas que usa la app y dibuja las señales que le llegan. **Un juego, un modo,
un idioma o un entorno nuevo tiene que aparecer ahí sin que nadie se acuerde de ir a editarlo**,
porque el día que se agrega un juego nadie se acuerda del panel, y una cifra que falta no se ve
como un error: se lee como que nadie jugó.

- **Una lista por eje, y una sola.** Los juegos y los modos viven en `public/assets/js/games.js`
  (`GAMES`, `MODES`, y de ahí salen `gameLabel`, `modeIcon`, `ROOM_MODE`, `LOCAL_MODES` y
  `MAX_PLAYERS`); los entornos, en `public/assets/js/transport/stats.js` (`ENVS`); los idiomas, en
  `public/assets/js/i18n.js` (`LANGS`). El panel las importa. No las copia **en ninguna parte**: ni en
  el JavaScript, ni en las opciones del HTML, ni en una regla de CSS por modo.
- **Lo desconocido se muestra, no se descarta.** Una señal de un juego, un modo o un idioma que
  el panel no conoce se dibuja igual, con su clave cruda por nombre. Pasa siempre: la app
  publicada empieza a mandar lo nuevo antes de que nadie mire el panel, y lo de un juego que ya
  se fue del menú queda guardado. Descartarlo en silencio es mentir en la cifra total.
- **Se valida la forma, no la lista.** Las reglas de `firebase/database.rules.json` aceptan un
  modo por su forma (`^[a-z][a-z-]{0,15}$`, la misma de `MODE_KEY`) y no por enumeración, igual
  que ya hacían con el id del juego. Una lista en las reglas es peor que una lista en el código:
  rechaza la señal en el servidor, la partida ni se entera y el dato no existe nunca más.
- **Ningún tope escrito a mano.** Cuántos jugadores caben sale de `MAX_PLAYERS`, derivado del
  juego más numeroso del registro. Un juego de ocho sube el tope solo (y obliga a crecer los
  roles de sala `A`–`F` y el patrón de `$p` en las reglas, que es un cambio aparte).
- **El color y el ícono se reparten, no se asignan uno por uno.** Los colores de las barras se
  toman por orden de la paleta y el ícono sale del registro: un modo nuevo entra con su color y
  con `·` mientras nadie le elija emoji, nunca gris ni invisible.
- **Lo vigila un test, no la memoria:** `node public/panel/adapta.test.mjs` inventa un juego, un modo y
  una partida más numerosa, y exige que lleguen hasta la barra; además falla si el panel o las
  reglas vuelven a nombrar un juego o un modo. Para mirarlo: `node tools/e2e/look.mjs panel data`,
  que siembra el panel con un juego y un modo que no existen.
- **Lo que sí hay que tocar a mano:** una **categoría** de señal nueva (algo que no sea juego,
  modo, jugadores, zona horaria, idioma ni hora) necesita su línea en las reglas, su sección en
  el panel y publicar las reglas en la consola (ver [PANEL.md](PANEL.md)).

## C-17 · La portada

La portada (`public/index.html`) es la lista de juegos y las maneras de elegir uno. Sus reglas
salieron de varias decisiones que se fueron corrigiendo; aquí está lo vigente, y cada punto dice
de dónde viene. Lo que cambie la portada se cambia aquí, en el mismo PR.

- **Everything on the home page can be searched, in every language (D-403, D-404).** The 🔎 search
  (`public/assets/js/search.js`) finds each card by its name, tagline and type in any language, and by
  its `keywords`, kept in its `games.js` entry (the games manifest, #855): what it is, what it is played with and what it is like, in es, en, pt and de, at
  least three per language. A new game, or anything new with a card, brings its keywords in the same
  PR; something new inside an existing card (a new kind of La Copa, a new mode) adds its words to that
  card's keywords. `search.test.mjs` fails without them. A new language of the app adds its keywords
  for every card when it comes in.
- **The list is drawn at once from the last visit's copy (D-435).** The page saves the list's HTML
  (`juegos-de-salon:portada-foto`, keyed by version, language, day and today's One a Day played or not) and a script under `#games`
  puts it back before the modules arrive; the module clears `#games` and draws the real cards in the
  same task. So anything drawn into the list must look the same in the copy as drawn (no state that
  only the module knows, nothing random), and the space above the list (`#lang-slot`, `.tools`,
  `#azar-slot`, `.filtros`) is reserved at the size the module draws it, or the list jumps.
  `tools/e2e/home/instant.mjs` checks that the copy equals the real list.
- **Qué se ofrece y en qué orden.** Las tarjetas salen de `PORTADA` en `games.js`: los juegos
  de `GAMES` y los juegos de La Copa sueltos (`SUELTOS`, aparte solo por cómo están hechos, D-198)
  van mezclados, de lo más jugado a lo menos, según la lista `POPULARIDAD` (D-255): most games
  finished in the last four weeks first, recounted every week by the processes round with
  `tools/agents/popularity.mjs update` (D-361), sin lista
  propia en la página (D-142, D-149). La Copa va primera, en media fila junto a Uno al día. Un
  juego que no está disponible se ve, con "Próximamente" al lado del nombre, pero no se abre, ni
  con el teclado (`available` en `games.js`, C-2; D-142), y va al final de la lista, con y sin
  filtro (v0.128.2). La tarjeta dice jugadores y duración,
  y si el juego no está en el idioma elegido lo dice antes de abrirlo ("🇪🇸 En español",
  `idiomas` en `games.js`; hoy ninguno lo declara, D-170). Uno de `SUELTOS` con `labs: true` no
  sale en la portada, aunque su link ya se comparta.
- **A new game says "New" for a week** (D-333, D-507): next to its name, like "Próximamente", from its
  `nuevoDesde` date in `games.js` for `DIAS_NUEVO` days (`esNuevo`). Every game that reaches the
  home page brings that date; `games.test.mjs` stops one that doesn't.
  Unlike the plain yellow "Próximamente" pill, it is a sticker that shines softly, so it sits on the
  card rather than over it (D-373): tilted −6°, a see-through dark fill with a thin faint edge in its
  own color and a light shadow, the title's rainbow flowing through its letters (`shimmer`, one
  gradient across the word, like the home page title), a low breathing glow and a little wobble around
  its tilt now and then; with reduced motion it stays tilted and still (owner's requests; the
  owner picked this look among ten on a comparison page).
  While it says "New" it also goes **on top of the list, right after La Copa** (`ordenPortada`,
  D-335): with no plays yet, by popularity it would be last. When the label goes, it goes back to
  its place in `POPULARIDAD`.
- **🔥 "Popular"** (D-361, for everyone since D-369): the first three of the order that are neither
  La Copa nor "New" (`populares`) wear the "New" sticker in fire colors, with the 🔥 outside the
  gradient, beside the name when it fits (on its own line only when the name fills it).
- **✨ Nuevos and 🔥 Populares filters** (D-362, D-369): a row of two chips above the types, each shown
  only when it has games, kept in the link as `?type=new` / `?type=popular`. With a favorite marked,
  ⭐ Favoritos goes first in that row: with its name, tighter, or the ⭐ alone, centered (D-364).
  These shortcuts (and the 🔎 pill, D-390) are outlined, with no fill; the types are filled. The chosen
  pill is the same cyan in both rows, because both are one single choice (D-407).
- **The app's name on the floating menu** (D-364, D-369): while the filters float, "🎲 Juegos de
  Salón" tops them in the title's font, in the 36 px the floating filters leave above them, so nothing
  moves when it appears; a tap goes back to the top. The frosted background reaches
  4 px below the last row, so the space under the filters matches the space above the title.
- **Home page experiments** (D-361): what is tried on the home page before players see it is a URL
  parameter the page reads, off by default, listed in `public/labs/home/experiments.js`. `/labs/home/`
  opens the real home page with `?lab`, which draws the bar (`public/labs/experiments.css`) with one
  switch for each; never in a frame, where an iPhone would not let anything stick (D-363).
  **Everything in development sits behind the lab** (D-395): an experiment, or anything else not yet
  validated, turns on only for a lab key holder (`labAccess()` in `public/assets/js/lab-access.js`);
  without one its parameter shows the site as it is. It reaches everyone only once validated in the lab.
  A feature on a page players visit asks its runtime flag, `flag('<id>')` in `public/assets/js/flags.js`, named in `flag-list.js` (D-515)
  (D-498): Firebase `flags/<id>` is *lab*, *all* or *off*, and the owner publishes it with a toggle
  (on its `/labs/` card, the one place), not a PR. With none
  being tried, its 🏠 Experimentos de la portada card waits in La Bodega, folded (D-372).
- **A promotional splash, off by default** (D-351): when the owner turns on a campaign
  (`ACTIVE` in `splash.js`, with `node tools/agents/splash.mjs on <id> | off`), a window over the
  home page tells what is new, with the page darkened behind; each phone sees it once, and a new
  campaign shows again. ✕, "Ahora no" and its links mark it as seen at once; a tap outside the window or Escape is forgiven once: the first such close leaves it for a later visit, the second marks it (D-462). A campaign marked `audience: 'regulars'` waits, unseen, for a phone with 5 or more
  visit days in the last four weeks and 10 or more finished games that has not paid (D-458): never a first visit. Each game in it shows a clip of real play (`marketing/splash/`) and
  opens with ▶ Play; the way out is a quiet "Ahora no". It fits a 320×640 screen with three games. `?splash=<id>` previews one (one that is not on, only with a lab key, D-395);
  `?test` and the scripts never see it. Tried in the lab from the home page's experiments bar (D-389).
  **One window per visit** (D-423, D-424): when the recap of an ended cup of La Copa, or of an ended
  season of Uno al día, opens (in the lab for now, except the cups the owner opens to all their players, D-426), the splash waits for the next visit (`startRecap` in `assets/js/recap.js` runs first). One gate (`assets/js/home-windows.js`, D-431) extends it to every window the home page opens on its own: recap, then splash (one campaign per visit), then the install bubble. A visit whose address carries `?support=` (☕ the support card or Stripe's thank-you, D-449) is already that visit's window: the gate opens nothing else.
- **Seasonal touches** (D-457): on a date's days (Halloween first) the home page and Rankings, never a
  game, dress up a little from a template in `public/assets/season/templates.js`: the tab's favicon,
  the hero's emoji cycle, background particles, a corner drawing, a flyby, a rare peek. None of it is
  text, takes a tap or moves under `prefers-reduced-motion`, and `?test` keeps it off; a template in
  the lab (`public: false`) shows only to lab key holders. How to add one: `docs/SEASONS.md`.
- **Arriba de la lista, los accesos que eligen por ti.** 🎲 Juego al azar, bajo la bajada, sale
  de los juegos que se pueden abrir, nunca de La Copa (D-188), y abre el juego con el
  dado encima (D-237). It always picks among every game, whatever filter is on, and never one that
  needs a group, three or more players at least (`alAzar` in `azar.js`, D-374; Cuarto Rey was the one, and since D-420 it is in the lab's La Bodega, off the home page). Uno al día es una tarjeta de media fila al lado de La Copa: los dos pesan
  más que un juego (D-230, D-239; el detalle, en [UNO-AL-DIA.md](UNO-AL-DIA.md)).
- **Las dos tarjetas de media fila** (`.fila-alta`, `.game-card.alta`) llevan el emoji de 40 px
  a la izquierda del título, la bajada y las píldoras de ancho entero, y el título en color: La
  Copa en dorado, Uno al día en celeste; los juegos van en blanco. Para que jugadores y duración
  quepan en una línea, la píldora dice "👥 2–10" y "jugadores" queda solo para el lector de
  pantalla (`.unidad`); la tarjeta ancha de un juego sí lo muestra (D-239). Las píldoras van
  abajo a la izquierda, aparte de la bajada y a la misma altura en las dos tarjetas (D-305).
- **Se filtra por tipo o por favoritos, y por nada más.** Un tipo a la vez (`TIPOS`), que
  se prende y se apaga con un toque. Solo hay fichas de tipos que tienen algún juego que se
  puede abrir, así la lista nunca queda vacía. Cuántos juegan no se filtra: cada juego lo
  pregunta adentro (D-149). Con un filtro puesto, la línea de abajo dice "Se ven n de m" y
  ofrece "Ver todos" (D-149; #71, resuelto en [USABILIDAD.md](USABILIDAD.md)).
- **⭐ Favoritos es un filtro más**, excluyente con los tipos, y aparece solo con algún favorito
  marcado. Los favoritos son de ese navegador (`localStorage`, por id de juego), sin cuenta
  (`favoritos.js`, D-238). La Copa no se marca, ni un juego que no está disponible. Desmarcar
  uno estando en ⭐ Favoritos no lo saca de la vista (se puede volver a marcar), salvo que ya no
  quede ninguno: ahí se ven todos.
- **El filtro va en la URL, en inglés** (`?type=logic`, `?type=favorites`): volver desde un juego
  lo deja como estaba y un link filtrado se puede compartir. Un link viejo (`?tipo=`) se reescribe
  y uno que no aplica (`?jugadores=`, o `?type=favorites` sin favoritos) muestra todos sin avisar
  (D-149, D-214, D-238).
- **Los filtros se quedan pegados arriba** al bajar por la lista, y tocar uno estando pegados
  lleva a la primera tarjeta filtrada (D-196). Pegados, su fondo sube hasta tapar la franja de la
  muesca: las tarjetas no se ven pasar detrás de la hora (U-12). They keep floating after that tap even when the
  result is too short to scroll that far: an empty space under the list (`.filtros-relleno`) holds
  them, and shrinks as the player scrolls up, so they leave at the first pixel up; the jump is
  rounded up to a whole pixel (D-371).
- **Los tipos van en una sola fila**, a cualquier ancho desde 320 px y en los tres idiomas:
  con la fila bajo 560 px el emoji sube arriba del nombre (cinco tipos no cabían a 900 px en es y pt), y bajo 300 px de caja las fichas se aprietan para
  no quedar pegadas al borde (D-144, D-149, U-11). Lo que se suma a la fila entra solo si cabe,
  y eso se mide en la página, no se supone: ⭐ Favoritos va primera, con su nombre o con la ⭐
  sola y menos aire entre las fichas, y si ni así cabe (a 320 px, casi siempre) va en su propia
  línea arriba de los tipos (D-238, D-241).
- **Nada se sale de la pantalla a 320 px**, tampoco donde el navegador no sabe partir una palabra
  larga ("Galgenmännchen" en el Chrome de Linux): la columna de tarjetas no crece más que la
  pantalla (`minmax(0, 1fr)`, D-238).
- **Dentro de una tarjeta no hay nada tocable**: la tarjeta es un link entero. Lo que se toca
  sin abrir el juego, como la ⭐, va al lado del link, encima de la tarjeta (`.game-slot`), con
  44 px de toque y sin tapar texto (C-8, D-238).
- **La barra de arriba** va en dos bloques: el idioma (C-3) a la izquierda y, a la derecha, las
  acciones: el sonido (C-4), 🏅 rankings (D-212, abiertos a todos desde D-217; medalla y no copa, para no confundirlo con La Copa) y compartir. Con
  6 px de aire entre botones caben en una línea desde 375 px; más angosto (320 px), las acciones
  bajan a una segunda línea y siguen a la derecha (v0.128.1). En un idioma que tiene video
  promocional (hoy, solo español), compartir abre una hoja (la de D-223 y D-232) con el video, que se carga recién al tocarlo, y dos opciones: **Invitar a
  jugar**, que comparte la app con su tarjeta social en el idioma en que se mira (`compartirApp`,
  D-226, U-33), y **Compartir el video**, un texto con el link del video en YouTube (`compartir-portada.js`,
  D-253). En los demás idiomas comparte directo la app con su tarjeta, sin hoja (D-254). Su ícono es el de compartir de los sistemas operativos, una
  caja abierta con una flecha hacia arriba, en SVG y no un emoji (D-242), con la caja celeste,
  la flecha rosada y la sombra de abajo de los botones de la página (D-243).
  El globo que invita a agregar la app a inicio sale abajo, solo en los celulares donde se puede
  agregar (no en el computador ni en la app ya instalada), y la ✕ lo apaga para siempre en ese
  navegador (D-232).
- **The footer's last line links the privacy page** (D-463): the version, "código en GitHub" and
  "Privacidad" (`COMMON.privacy`), which opens `/privacy/`. The same page is linked from the note
  under the email field of every feedback form. **The page describes the code:** a PR that stores
  something new about players, or keeps it for a different time, edits `public/privacy/texts.js`
  in the same PR, in the three languages (`texts.test.mjs` checks their shape).
- **The footer outside the home page:** game covers (the one-player games' too, on their own page, not in La Copa or Uno al día), La Copa's entrance,
  Rankings and Uno al día end with the same violet-sunset footer (`site-footer.js`, U-38); only Rankings
  and Uno al día carry the funny phrase. Never during a game or on a result screen. **Every game is a game** (the owner, 2026-10-27): no player text or doc calls one a "minigame"; only La Copa's Gran Final plays shortened versions.
- **Se prueba entera en Chrome:** `tools/e2e/favorites.mjs` (filtros, favoritos y 320 px en los
  tres idiomas), `share-home.mjs`, `install-prompt.mjs`, `daily.mjs` e
  `lang-from-url.mjs`. `window.__portada` dice el filtro, las tarjetas que se ven y los
  favoritos. Un cambio que se ve rehace la captura `docs/screenshots/menu.png` (C-13).

## C-18 · Las URL, en inglés

Todo lo que se ve en una dirección va en inglés: las carpetas (`/hangman/`, C-2, D-192), los
nombres de los parámetros (`?room=`, `?seed=`, `?test`) y sus valores en palabras (`?type=logic`,
`&demo=podium`, `&notif=deadline`, `?practice=queens`), también en el `#` del panel (`#/cup/OFICI`).
Los nombres de antes se siguen leyendo como alias: un link que ya circula no se rompe (D-214, D-266).

- **Se lee y se escribe con `parametros.js`.** `param('room')` lee el nombre nuevo o el de antes y
  devuelve el valor en inglés; `tiene('test')` hace lo mismo con una bandera. Un parámetro nuevo
  se agrega ahí, en inglés, y uno que cambia de nombre deja el viejo en `ALIAS`, `BANDERAS` o
  `VALORES`. Nada lee `location.search` a mano con un nombre en español.
- **Lo que la app genera va siempre con el nombre nuevo:** invitaciones, links compartidos, avisos al
  celular (`tools/push/`), lo que deja en la barra con `history.replaceState`. Al abrir una página,
  `trackVisit()` reescribe en inglés una dirección vieja (`normalizarUrl`).
- **El juego en la URL va con el nombre de su carpeta** (`slugDe` / `idDeSlug` en `games.js`): el id
  (`reinas`) no cambia, porque lo guardan las salas, el panel y el celular, pero no se ve.
- **Una clave que se guarda no cambia por esto:** el panel sigue contando `aviso/plazo` aunque la URL
  diga `notif=deadline` (`AVISO_CLAVE`).
- **Lo que no es palabra queda como es:** códigos (`?K7Q2X`, `?c=`), el link propio de una copa
  (`?pirata`, que elige quien la crea; las palabras de las banderas están reservadas).
  Code variable names are no longer an exception: everything internal is English (D-316, which
  amends D-266 here), renamed in phases.
- **Lo frena una prueba:** `node public/assets/js/parametros.test.mjs` busca en `public/` y en
  `tools/push/` una URL armada con un nombre de antes.

---

## C-19 · The way out of a result screen

Every end screen (a game's result, a Cup day, the Cup's podium) offers the exits that are right at
that moment, and only those, in the same order everywhere (D-343):

| Context | Main action | Secondary | Exits |
|---|---|---|---|
| A Cup day | **Back to the board** | Share · next-day notice | none: the board is the Cup's home |
| The Cup's podium | **Share the summary** | My days, the table | **🏠 Back to the menu**, under the podium; "Leave this Cup" stays a quiet link |
| One a Day (any game) | **Share** | 🎲 Play another · Replay today's | **📅 Back to One a Day**; the menu is the header's ‹ (one way to it, not two) |
| A game played on its own | **Play again** / Rematch | Share · Change mode | Back to the menu (or to the lab) |

- **Blocks in this order:** the result (emoji, title, score, place) → the context (the One a Day
  card) → the actions → the exits → the long detail, folded or below (breakdown, words, fleets,
  history) → rankings → one feedback link, 🐞 or 💬, last (U-38).
- **The main action and the exits show without scrolling** at 390×812 and at 320 px, in the four
  languages (C-8): measured, not guessed (`getBoundingClientRect().bottom <= innerHeight`). What
  goes above them (the Sign in offer inside the One a Day card) is one line (`compacto`).
- **One primary (yellow) button per view**: the rest are cyan or ghost. A card that offers
  something extra under a result (the Cup's next-day notice) does not compete with it.
- **No exit twice:** where the header's ‹ already goes to the menu, the result does not add a
  second "back to the menu" next to another exit (One a Day).
- **The exits come from `public/assets/js/fin.js`** (`salidasFin(contexto)`): the same words and
  look in every game. A game does not build its own "back to the menu" (or "back to the lab",
  `salidasFin('lab')`) for these contexts; `fin.test.mjs` fails on a hand-built one (#1042).
- **The header's ‹ goes to the screen's logical parent and names it** (#1042): «‹ Menú» on a hub
  or a game played on its own, «‹ Laboratorio» in a game opened from the lab, «‹ Volver a la copa»
  on a Cup day (its cover, while playing it, its result) and a trial run goes back to its day's
  cover; a cup's board says «‹ La Copa» and goes to La Copa's home (`/cup/`, with «Tus copas»). Mid-game it asks first (D-432).
  A button that goes back one step inside a game (setup → intro) says «‹ Volver», never «Menú».
- **One a Day is one card in every game**: `tarjetaResultado` (`uno-al-dia-ui.js`) carries its
  actions and exits, and `ponerTarjeta` puts it right under the hero. In today mode the game adds
  no buttons of its own: no rematch (#226), no change mode, no second menu button.
- **Never offered at the wrong moment:** play again in a Cup day (it is played once, U-21), a
  link to La Copa from One a Day (a Cup is joined by invitation), the menu inside a running Cup
  (the header's ‹ already goes there).
- **What a result says, once (D-353).** A result screen is read in a glance, so each fact appears
  in one place only:
  - **The score, the time, the winner and the game's name** each appear once. The hero says them; a
    card or a sentence below does not repeat them ("Hoy: 80 puntos", "Tu tiempo fue 1:20",
    "Total: 80 puntos", the champion named again as an award). A share card that only restates the
    score (Desenredo's 🧶 🟩🟩) goes in the shared text, not on the screen.
  - **The subtitle adds, it does not copy:** what the detail below already shows (each fleet's
    shots and aim) is not said again under the title.
  - **The long detail is folded or after the exits:** the score breakdown (🧮, always folded),
    boards, words, history. It never pushes the main action down.
  - **Sign in is one line:** the same `bloqueJugador({ destacado, compacto })` card everywhere, also
    for "¿Quieres que esta partida cuente?" (D-274); tapping it opens the form with the name in.
  - **Secondary offers fold:** under a result, "Invite a friend" and the like are a folded row,
    open where they are the point (`/today/`).
  - **One share button per screen**, and singular and plural said right ("1 julepe").
- **A test stops it:** `node public/assets/js/fin.test.mjs`.

---

## Lista de chequeo antes de dar por listo un juego

- [ ] Los modos que ofrece (los tres, si es para dos) funcionan y la partida se puede retomar en **todos** (C-5, C-6).
- [ ] Las instrucciones siguen U-18: la meta primero, a lo más 3 puntos, sin repetir el dibujo de ejemplo (C-1).
- [ ] Todo el texto está en español, inglés y portugués (el de `IDIOMAS`, también el del laboratorio), con las mismas claves en todos, sin cadenas sueltas en el código (C-3, D-191).
- [ ] Sus pantallas están en `tools/e2e/paths.mjs` y su `languages.mjs` pasa en todos los idiomas (C-12, D-199).
- [ ] Hay sonido y vibración en las acciones clave, con botón de silencio (C-4).
- [ ] On its landing the start button (or the first mode) is above the fold at 320×568 and 375×667 in every language, with the rules below it: `node tools/e2e/landing-fold.mjs` green (U-39, D-344).
- [ ] Los botones tienen 44 px, los botones finales se ven sin desplazar y no hay scroll horizontal (C-8).
- [ ] Its result screen follows C-19: the exits from `fin.js` for each context it is played in, none built by hand (`salidasFin('lab')` from the lab), the header's ‹ naming its logical parent, and each fact said once (score, time, winner, name), the long detail folded or after the exits, Sign in in one line, one share button (D-343, D-353).
- [ ] En un celular, el resultado se ve antes del pase, y lo secreto va tapado (C-9).
- [ ] Los secretos se comprometen y verifican (C-10).
- [ ] Las fallas de sala se ven en pantalla, en todos los idiomas, y la consola queda limpia; creating or joining a room goes through `tryRoom` (C-14, U-37).
- [ ] Tests del motor y `node public/assets/js/games.test.mjs` en verde, y partida completa probada en cada modo, con capturas revisadas (C-12).
- [ ] Lo que cambió, en `changelog/<rama>.md` sin número (`node tools/release/changelog.mjs new`); publicada y comprobada en la URL pública por `publish.yml` (C-11, D-205, D-300).
- [ ] Si tiene varios celulares, el chat de sala usa el módulo compartido y muere con la sala (C-15).
- [ ] Lo que comparte (sala, resultado) sale de `compartir.js`, con la cabecera del estándar, y un resultado va con su imagen (C-7, D-165).
- [ ] Registro en el menú, README, especificación, requerimientos y decisiones (C-2, C-13). En la portada, con su tipo, entra al dado y a los favoritos y cabe a 320 px (C-17). A new one brings `nuevoDesde` for its "New" label (D-333) and its search keywords in the three languages (D-404).
- [ ] Las excepciones a los cánones están escritas en su especificación (C-13).
- [ ] Sus URL van en inglés: carpeta, parámetros y valores, leídos con `parametros.js`, con los nombres de antes como alias (C-18).
- [ ] Su `index.html` lleva el vigía antes de las hojas de estilo y llama `trackVisit()` al cargar: `node public/assets/js/vigia.test.mjs` en verde (C-7, D-251).
- [ ] El panel lo muestra sin haberlo tocado: `node public/panel/adapta.test.mjs` en verde y una mirada a `node tools/e2e/look.mjs panel data` (C-16).
- [ ] Capturas del README rehechas y miradas, y `python3 tools/release/readme.py check` en verde (C-13).
- [ ] `node tools/agents/document.mjs check --from origin/main` sin ✗ nuevos: decisiones, pruebas, guiones y CHANGELOG al día (D-172).
