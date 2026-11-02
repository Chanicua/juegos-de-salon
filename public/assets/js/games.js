/**
 * Registro central de juegos.
 * Para agregar un juego nuevo: crear su carpeta public/<carpeta>/ con su index.html y agregar una
 * entrada aquí. Los textos van por idioma ({ es, en, pt }). El menú principal se genera desde esta lista.
 *
 * El `id` y la carpeta son dos cosas (D-192): el id es un dato —lo guardan las salas de Firebase, el
 * panel y el localStorage— y no cambia nunca; la carpeta es la URL (`path`) y va en inglés. Los
 * juegos de antes conservan su id en español ('ahorcado' vive en /hangman/) y su ruta vieja
 * (/<id>/) queda como página puente, que genera `node tools/release/og.mjs cards`.
 *
 * This file is the games manifest (#855): each entry is meant to hold everything about its game, so a
 * new game is its folder plus one entry here. The other registries move in one at a time, each with a
 * test that fails when they disagree (manifest.test.mjs). Moved in so far: `keywords` (the 🔎 search's
 * words in es, en and pt, D-404; search.js derives KEYWORDS from them).
 */
import { cachedFlags, stateOf } from './flags.js';
import { SAVED_KEY } from './lab-access.js';

/**
 * Whether a game launched by a flag (`lanza`, D-517) is out for this visitor, read at once from what
 * this phone last saw of `flags/` (flags.js keeps it; the home page and the game's page refresh it):
 * 🚀 everyone, or 🧪 lab with a lab key saved here. In node (the tools, the tests) nothing is saved,
 * so the game counts as not launched. Never used for Uno al día's deck, which goes by date.
 */
export function lanzado(id, { flags = cachedFlags(), store = globalThis.localStorage } = {}) {
  const state = stateOf(flags, id);
  if (state === 'all') return true;
  if (state === 'off') return false;
  try { return !!store?.getItem(SAVED_KEY); } catch (_) { return false; }
}

export const GAMES = [
  {
    id: 'copa',
    emoji: '🏆',
    name: { es: 'La Copa', en: 'The Cup', pt: 'A Copa' },
    tagline: { es: 'Un torneo de una semana entre amigos, con un juego distinto cada día.', en: 'A week-long tournament among friends, with a different game every day.', pt: 'Um torneio de uma semana entre amigos, com um jogo diferente por dia.' },
    keywords: {
      es: ['torneo', 'copa', 'semana', 'amigos', 'competencia', 'campeonato', 'grupo', 'diario', 'ranking', 'final', '3 dias', '7 dias', 'global', 'chile', 'brasil'],
      en: ['tournament', 'cup', 'week', 'friends', 'competition', 'championship', 'group', 'daily', 'ranking', 'final', '3 days', '7 days', 'global', 'chile', 'brazil'],
      pt: ['torneio', 'copa', 'semana', 'amigos', 'competição', 'campeonato', 'grupo', 'diário', 'ranking', 'final', '3 dias', '7 dias', 'global', 'chile', 'brasil'],
    },
    players: '2–10',
    duration: '7',
    // No dura minutos sino días. Va en los tres idiomas (D-170): la copa elige el de sus palabras
    durationUnit: { es: 'días', en: 'days', pt: 'dias' },
    // Cómo se juega, para la tabla del README: una copa no tiene modos de un celular o de sala.
    formato: { es: 'Cada uno en su celular, un juego por día', en: 'Each on their own phone, one game a day', pt: 'Cada um no seu celular, um jogo por dia' },
    // Un torneo no es una partida: cada día manda su señal con `players: 1` y no pesa en MAX_PLAYERS.
    torneo: true,
    // Tiene de todo: aparece con cualquier tipo que se elija en los filtros de la portada
    tipos: ['words', 'logic', 'trivia'],
    path: 'cup/',
    // Salió del laboratorio (D-175): se abre desde el menú. /labs/ sigue para probar (la Copa de 3
    // días, la práctica con semilla y las demos).
    available: true,
  },
  {
    id: 'linea-de-tiempo',
    tipos: ['trivia'],
    emoji: '⏳',
    name: { es: 'Línea de Tiempo', en: 'Timeline', pt: 'Linha do Tempo' },
    tagline: { es: 'Ubica los hitos en el orden correcto. Seis temáticas, de la historia a la música.', en: 'Put the milestones in the right order. Six themes, from history to music.', pt: 'Coloque os marcos na ordem certa. Seis temas, da história à música.' },
    keywords: {
      es: ['historia', 'orden', 'ordenar', 'fechas', 'hitos', 'futbol', 'cultura', 'preguntas'],
      en: ['timeline', 'history', 'order', 'sort', 'dates', 'events', 'soccer', 'football', 'trivia', 'quiz'],
      pt: ['história', 'ordem', 'ordenar', 'datas', 'marcos', 'futebol', 'cultura', 'perguntas', 'quiz'],
    },
    players: '1–6',
    duration: '10–20',
    jugadas: ['place'],
    path: 'timeline/',
    // What it plays of La Copa's games, for the end-to-end scope (tools/e2e/affected.mjs, #855)
    reuses: ['cup/games/timeline/', 'cup/games/year/engine.js', 'cup/games/mazos.js'],
    available: true,
  },
  {
    id: 'toque-y-fama',
    tipos: ['logic'],
    emoji: '🔢',
    name: { es: 'Toque y Fama', en: 'Bulls and Cows', pt: 'Toque e Fama' },
    // Its card also holds 🔤 Palabra (#767), so the tagline names both
    tagline: { es: 'Adivina el número o la palabra secreta con toques y famas.', en: 'Crack the secret number or word with bulls and cows.', pt: 'Descubra o número ou a palavra secreta com toques e famas.' },
    keywords: {
      es: ['numeros', 'adivinar', 'codigo', 'secreto', 'mastermind', 'duelo', 'logica'],
      en: ['numbers', 'guess', 'code', 'secret', 'mastermind', 'bulls', 'cows', 'duel', 'logic'],
      pt: ['números', 'adivinhar', 'código', 'secreto', 'mastermind', 'duelo', 'lógica'],
    },
    players: '1–2',
    duration: '5–12',
    jugadas: ['guess'],
    path: 'bulls-and-cows/',
    // What it plays of La Copa's games, for the end-to-end scope (tools/e2e/affected.mjs, #855)
    reuses: ['cup/games/number/'],
    available: true,
  },
  {
    id: 'ahorcado',
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 7, desde: '2026-10-07', grupo: true },
    tipos: ['words'],
    emoji: '🪢',
    name: { es: 'El Ahorcado', en: 'Hangman', pt: 'Forca' },
    tagline: { es: 'Adivina tu palabra antes de quedarte sin vidas. Acá nadie se queda mirando.', en: 'Crack your word before you run out of lives. Nobody sits this one out.', pt: 'Descubra sua palavra antes de ficar sem vidas. Aqui ninguém fica só olhando.' },
    keywords: {
      es: ['palabras', 'letras', 'adivinar', 'vocabulario', 'vidas'],
      en: ['hangman', 'words', 'letters', 'guess', 'vocabulary', 'lives'],
      pt: ['forca', 'palavras', 'letras', 'adivinhar', 'vocabulário', 'vidas'],
    },
    players: '1–6',
    duration: '5–12',
    jugadas: ['word', 'guess', 'buy'],
    path: 'hangman/',
    available: true,
  },
  {
    id: 'dudo',
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 9, desde: '2026-10-07', grupo: true },
    tipos: ['tabletop'],
    emoji: '🎲',
    name: { es: 'Dudo', en: 'Liar\'s Dice', pt: 'Dado Mentiroso' },
    tagline: { es: 'Agita el cacho, apuesta cuántos dados hay en la mesa y aguanta la cara.', en: 'Shake the cup, bid how many dice are on the table and keep a straight face.', pt: 'Sacuda o copo, aposte quantos dados tem na mesa sem entregar o jogo.' },
    keywords: {
      es: ['dados', 'cacho', 'mentiroso', 'mentir', 'apuesta', 'farol', 'previa', 'carrete', 'cubilete'],
      en: ['dice', 'liar', 'lie', 'bluff', 'bet', 'party', 'cup'],
      pt: ['dados', 'mentiroso', 'mentir', 'aposta', 'blefe', 'copo', 'festa'],
    },
    players: '1–6',
    duration: '10–20',
    jugadas: ['bid', 'dudo', 'calza'],
    path: 'liars-dice/',
    available: true,
  },
  {
    id: 'generala',
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 16, desde: '2026-10-23', grupo: true },
    tipos: ['tabletop'],
    emoji: '📝',
    name: { es: 'Generala', en: 'Generala', pt: 'General' },
    tagline: { es: 'Tira cinco dados hasta tres veces y llena tu planilla. Escalera, full, póker… ¡y generala! Como el Kniffel o el Yatzy.', en: 'Roll five dice up to three times and fill your score card. Straight, full house… and generala! Like Kniffel or Yatzy.', pt: 'Jogue cinco dados até três vezes e preencha sua cartela. Sequência, full, quadra… e general! Como o Kniffel ou o Yatzy.' },
    keywords: {
      es: ['dados', 'escalera', 'full', 'poker', 'planilla', 'cubilete', 'kniffel', 'yatzy'],
      en: ['dice', 'yahtzee', 'kniffel', 'yatzy', 'straight', 'full', 'house', 'poker', 'scorecard'],
      pt: ['dados', 'sequência', 'full', 'poker', 'general', 'yahtzee', 'kniffel', 'yatzy', 'copo'],
    },
    players: '1–6',
    duration: '5–30',
    jugadas: ['roll', 'score'],
    path: 'generala/',
    // Announced as "Próximamente" first (D-248), opened on the owner's request (D-405): it joins
    // Uno al día with the deck shuffled on 2026-10-23 (DESDE_GENERALA in uno-al-dia.js)
    nuevoDesde: '2026-10-20',
    available: true,
  },
  {
    id: 'batalla-naval',
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 8, desde: '2026-10-07', grupo: true },
    tipos: ['logic'],
    emoji: '⚓',
    name: { es: 'Batalla Naval', en: 'Battleship', pt: 'Batalha Naval' },
    tagline: { es: 'Hunde la flota del rival antes de que hunda la tuya.', en: 'Sink your rival\'s fleet before they sink yours.', pt: 'Afunde a frota do rival antes que ele afunde a sua.' },
    keywords: {
      es: ['barcos', 'flota', 'hundir', 'mar', 'guerra', 'duelo', 'estrategia'],
      en: ['battleship', 'ships', 'fleet', 'sink', 'sea', 'war', 'duel', 'strategy'],
      pt: ['navios', 'barcos', 'frota', 'afundar', 'mar', 'guerra', 'duelo', 'estratégia'],
    },
    players: '1–2',
    duration: '10–20',
    jugadas: ['shot'],
    path: 'battleship/',
    available: true,
  },
  {
    id: 'julepe',
    tipos: ['tabletop'],
    emoji: '🍹',
    name: { es: 'Julepe', en: 'Julep', pt: 'Paga o Bolo' },
    tagline: { es: 'Dices si vas o te pasas. Si vas y no haces dos bazas, te tomas todo el plato.', en: 'Say if you are in or out. Go in, miss two tricks, and you drink the whole pot.', pt: 'Você diz se entra ou passa. Se entrar e não fizer duas vazas, bebe o bolo inteiro.' },
    players: '1–6',
    duration: '15–30',
    jugadas: ['va', 'paso', 'cambia', 'juega', 'regala'],
    // In La Bodega since D-434 (the owner's request, after D-88 had paused it): off the home page,
    // behind the lab's door at /labs/julep/; /julep/ and /julepe/ are bridges there
    path: 'labs/julep/',
    // Its name in URLs and its docs/games/ and docs/screenshots/ folders, without the lab (C-18)
    slug: 'julep',
    labs: true,
    available: false,
  },
  {
    id: 'cuarto-rey',
    tipos: ['tabletop'],
    emoji: '👑',
    name: { es: 'Cuarto Rey', en: 'Fourth King', pt: 'Quarto Rei' },
    tagline: { es: 'Naipes, sorbos y el temido cuarto rey.', en: 'Cards, sips and the dreaded fourth king.', pt: 'Cartas, goles e o temido quarto rei.' },
    players: '4–6',
    duration: '20–40',
    // In La Bodega since D-420 (the owner's request): off the home page, behind the lab's door at
    // /labs/fourth-king/; /fourth-king/ and /cuarto-rey/ are bridges there
    path: 'labs/fourth-king/',
    // Its name in URLs and its docs/games/ and docs/screenshots/ folders, without the lab (C-18)
    slug: 'fourth-king',
    labs: true,
    available: false,
  },
];

/**
 * Los juegos de La Copa, que también se juegan desde la portada (D-142), de a uno y sin copa: son
 * juegos como los demás (D-198) y abren `<slug>/` (D-149, D-162, D-192), la pantalla de práctica de
 * La Copa con un link que no dice "copa": no cuenta para ninguna copa y, si hay jugador, va a los rankings (D-212). Van aparte
 * de GAMES solo por cómo están hechos: no son una carpeta con su `rules.js` (su motor y su pantalla
 * viven en cup/games/), así que el README y las pruebas de idioma de los juegos no los recorren. Su
 * página y su tarjeta social las genera `node tools/release/og.mjs cards` a partir de cup/suelto/index.html.
 *
 * Uno con `labs: true` todavía no va en la portada, pero su link ya se comparte: tiene página y
 * tarjeta igual (como La Copa, D-101).
 *
 * Línea Relámpago y Toque y Fama: Número no están: son el modo solo de Línea de Tiempo
 * y de Toque y Fama. La Gran Final tampoco: repite los otros y es el cierre de la copa.
 *
 * Se juegan en el idioma de quien juega, con contenido propio de cada idioma (D-170).
 */
export const SUELTOS = [
  {
    // In La Bodega since D-421, the owner's request: Agentes took its place on the home page, in La Copa
    // and in Uno al día. Its page /connections/ still opens (old links, the lab's Bodega card) and the
    // cups created before keep playing it; `bodega` leaves it off the home page and the search
    id: 'conexiones',
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 2, desde: '2026-10-06', hasta: '2026-10-24' },
    slug: 'connections',
    emoji: '🔗',
    name: { es: 'Conexiones', en: 'Connections', pt: 'Conexões' },
    tagline: { es: 'Arma cuatro grupos de cuatro palabras que tienen algo en común.', en: 'Sort sixteen words into four groups of four that share something.', pt: 'Monte quatro grupos de quatro palavras que têm algo em comum.' },
    tipos: ['words', 'trivia'],
    duration: '3–8',
    bodega: true,
  },
  {
    id: 'letras',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 4 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 3, desde: '2026-10-06' },
    slug: 'word',
    emoji: '🔤',
    name: { es: 'Toque y Fama: Palabra', en: 'Bulls and Cows: Word', pt: 'Toque e Fama: Palavra' },
    tagline: { es: 'Adivina la palabra secreta de cinco letras con toques y famas.', en: 'Crack the five-letter secret word with bulls and cows.', pt: 'Descubra a palavra secreta de cinco letras com toques e famas.' },
    keywords: {
      es: ['palabra', 'letras', 'adivinar', 'wordle', 'toque', 'fama', 'vocabulario'],
      en: ['word', 'letters', 'guess', 'wordle', 'bulls', 'cows', 'vocabulary'],
      pt: ['palavra', 'letras', 'adivinhar', 'wordle', 'vocabulário'],
    },
    tipos: ['words', 'logic'],
    duration: '3–8',
  },
  {
    id: 'anio',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 5 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 4, desde: '2026-10-06' },
    slug: 'year',
    emoji: '📅',
    name: { es: '¿En qué año?', en: 'What Year?', pt: 'Em que ano?' },
    tagline: { es: 'Adivina en qué año pasó cada hito. Mientras más cerca, más puntos.', en: 'Guess the year each milestone happened. The closer you get, the more points.', pt: 'Adivinhe em que ano aconteceu cada marco. Quanto mais perto, mais pontos.' },
    keywords: {
      es: ['año', 'fechas', 'historia', 'adivinar', 'cultura', 'preguntas'],
      en: ['year', 'dates', 'history', 'guess', 'trivia', 'quiz'],
      pt: ['ano', 'datas', 'história', 'adivinhar', 'cultura', 'perguntas', 'quiz'],
    },
    tipos: ['trivia'],
    duration: '2–5',
  },
  {
    id: 'reinas',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 3 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 5, desde: '2026-10-06' },
    slug: 'queens',
    emoji: '👑',
    name: { es: 'Reinas', en: 'Queens', pt: 'Rainhas' },
    tagline: { es: 'Pon una reina en cada fila, columna y zona de color, sin que se toquen.', en: 'Place one queen in every row, column and color zone, with none touching.', pt: 'Coloque uma rainha em cada linha, coluna e zona de cor, sem que se toquem.' },
    keywords: {
      es: ['reina', 'ajedrez', 'colores', 'zonas', 'grilla', 'puzzle', 'rompecabezas', 'logica'],
      en: ['queens', 'queen', 'chess', 'colors', 'regions', 'grid', 'puzzle', 'logic'],
      pt: ['rainha', 'xadrez', 'cores', 'zonas', 'grade', 'quebra-cabeça', 'lógica'],
    },
    tipos: ['logic'],
    duration: '2–5',
  },
  {
    id: 'tango',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 7 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 14, desde: '2026-10-16' },
    slug: 'tango',
    emoji: '☀️',
    name: { es: 'Tango', en: 'Tango', pt: 'Tango' },
    tagline: { es: 'Llena la grilla con soles y lunas sin poner tres iguales seguidos.', en: 'Fill the grid with suns and moons without ever putting three in a row.', pt: 'Preencha a grade com sóis e luas sem colocar três iguais seguidos.' },
    keywords: {
      es: ['soles', 'lunas', 'sol', 'luna', 'binario', 'grilla', 'puzzle', 'rompecabezas', 'logica'],
      en: ['suns', 'moons', 'sun', 'moon', 'binary', 'grid', 'puzzle', 'logic'],
      pt: ['sóis', 'luas', 'sol', 'lua', 'binário', 'grade', 'quebra-cabeça', 'lógica'],
    },
    tipos: ['logic'],
    duration: '3–8',
  },
  {
    id: 'zip',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 6 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 13, desde: '2026-10-16' },
    slug: 'zip',
    emoji: '〰️',
    name: { es: 'Zip', en: 'Zip', pt: 'Zip' },
    tagline: { es: 'Une los números en orden con un solo trazo que pase por todas las casillas.', en: 'Connect the numbers in order with a single line that fills every square.', pt: 'Ligue os números em ordem com um só traço que passe por todas as casas.' },
    keywords: {
      es: ['trazo', 'camino', 'linea', 'numeros', 'unir', 'recorrido', 'puzzle', 'rompecabezas', 'logica'],
      en: ['path', 'line', 'trail', 'numbers', 'connect', 'route', 'puzzle', 'logic'],
      pt: ['traço', 'caminho', 'linha', 'números', 'unir', 'percurso', 'quebra-cabeça', 'lógica'],
    },
    tipos: ['logic'],
    duration: '3',
  },
  {
    id: 'desenredo',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 9 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 6, desde: '2026-10-06' },
    slug: 'untangle',
    emoji: '🧶',
    name: { es: 'Desenredo', en: 'Untangle', pt: 'Desenrola' },
    tagline: { es: 'Arrastra los nudos hasta que ningún hilo se cruce.', en: 'Drag the knots until no threads cross.', pt: 'Arraste os nós até que nenhum fio se cruze.' },
    keywords: {
      es: ['nudos', 'hilos', 'cruces', 'enredo', 'desenredar', 'arrastrar', 'puzzle', 'rompecabezas', 'logica'],
      en: ['untangle', 'tangle', 'knots', 'threads', 'crossings', 'drag', 'puzzle', 'logic'],
      pt: ['nós', 'fios', 'cruzamentos', 'emaranhado', 'desembaraçar', 'arrastar', 'quebra-cabeça', 'lógica'],
    },
    tipos: ['logic'],
    duration: '4',
  },
  {
    id: 'donde',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 8 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 15, desde: '2026-10-16' },
    slug: 'where',
    emoji: '📍',
    name: { es: '¿Dónde queda?', en: 'Where Is It?', pt: 'Onde fica?' },
    tagline: { es: 'Ubica cinco ciudades en el globo. Mientras más cerca, más puntos.', en: 'Find five cities on the globe. The closer your pin, the more points.', pt: 'Encontre cinco cidades no globo. Quanto mais perto o alfinete, mais pontos.' },
    keywords: {
      es: ['mapa', 'geografia', 'ciudades', 'paises', 'globo', 'mundo', 'viajes', 'cultura'],
      en: ['map', 'geography', 'cities', 'countries', 'globe', 'world', 'travel', 'trivia', 'where'],
      pt: ['mapa', 'geografia', 'cidades', 'países', 'globo', 'mundo', 'viagens', 'cultura'],
    },
    tipos: ['trivia'],
    duration: '2–5',
  },
  {
    // En el laboratorio (D-257): tiene página y tarjeta, pero no sale en la portada. Su página es
    // /labs/case/ (D-267); `diario`: sin semilla en el link se juega el caso del día, el mismo para
    // todos, y al recargar sigue donde iba
    id: 'caso',
    slug: 'case',
    emoji: '🔍',
    name: { es: 'El caso', en: 'The Case', pt: 'O Caso' },
    tagline: { es: 'Descubre quién es criminal entre 20 sospechosos. Las pistas nunca mienten.', en: 'Find out who the criminals are among 20 suspects. The clues never lie.', pt: 'Descubra quem é criminoso entre 20 suspeitos. As pistas nunca mentem.' },
    tipos: ['logic'],
    duration: '5–10',
    labs: true,
    diario: true,
  },
  {
    // Out of the lab since D-332, with Loteo and Pintaminas: their page was /labs/<slug>/, now a bridge (`deLabs`)
    id: 'rutas',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 10 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 10, desde: '2026-10-16' },
    slug: 'routes',
    emoji: '🚇',
    name: { es: 'Rutas rotas', en: 'Broken Routes', pt: 'Rotas Quebradas' },
    tagline: { es: 'Une todas las líneas del metro girando partes del tablero.', en: 'Join every subway line by flipping parts of the board.', pt: 'Ligue todas as linhas do metrô girando partes do tabuleiro.' },
    keywords: {
      es: ['metro', 'lineas', 'tren', 'girar', 'rotar', 'conectar', 'caminos', 'puzzle', 'rompecabezas', 'logica'],
      en: ['subway', 'metro', 'lines', 'train', 'rotate', 'turn', 'connect', 'pipes', 'routes', 'puzzle', 'logic'],
      pt: ['metrô', 'linhas', 'trem', 'girar', 'rodar', 'conectar', 'caminhos', 'canos', 'quebra-cabeça', 'lógica'],
    },
    tipos: ['logic'],
    duration: '7',
    deLabs: true,
    nuevoDesde: '2026-10-15',
  },
  {
    // Two variants (D-331): 🔢 Numbers and ⚡💧 Utilities, picked in the waiting room
    id: 'loteo',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 11 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 11, desde: '2026-10-16' },
    slug: 'plots',
    emoji: '📐',
    name: { es: 'Loteo', en: 'Plots', pt: 'Loteamento' },
    tagline: { es: 'Divide el tablero en lotes: cada número dice cuántas casillas tiene el suyo.', en: 'Split the board into plots: each number says how many squares its plot has.', pt: 'Divida o tabuleiro em lotes: cada número diz quantas casas tem o seu.' },
    keywords: {
      es: ['lotes', 'dividir', 'numeros', 'casillas', 'rectangulos', 'grilla', 'shikaku', 'puzzle', 'rompecabezas', 'logica'],
      en: ['plots', 'divide', 'split', 'numbers', 'cells', 'rectangles', 'grid', 'shikaku', 'puzzle', 'logic'],
      pt: ['lotes', 'dividir', 'números', 'casas', 'retângulos', 'grade', 'shikaku', 'quebra-cabeça', 'lógica'],
    },
    tipos: ['logic'],
    duration: '5–15',
    deLabs: true,
    nuevoDesde: '2026-10-15',
  },
  {
    // Two variants (D-331): easy (one color) and hard (two colors), picked in the waiting room
    id: 'pintaminas',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 12 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 12, desde: '2026-10-16' },
    slug: 'paint-mines',
    emoji: '🖌️',
    name: { es: 'Pintaminas', en: 'Paint Mines', pt: 'Pinta-Minas' },
    tagline: { es: 'Pinta la grilla y descubre el dibujo escondido.', en: 'Paint the grid and uncover the hidden picture.', pt: 'Pinte a grade e descubra o desenho escondido.' },
    keywords: {
      es: ['pintar', 'dibujo', 'imagen', 'grilla', 'nonograma', 'picross', 'casillas', 'puzzle', 'rompecabezas', 'logica'],
      en: ['paint', 'picture', 'drawing', 'image', 'grid', 'nonogram', 'picross', 'cells', 'puzzle', 'logic'],
      pt: ['pintar', 'desenho', 'imagem', 'grade', 'nonograma', 'picross', 'casas', 'quebra-cabeça', 'lógica'],
    },
    tipos: ['logic'],
    duration: '3–6',
    deLabs: true,
    nuevoDesde: '2026-10-15',
  },
  {
    // Out of the lab in D-421, in Conexiones' place (the owner's request): its page was /labs/agents/, now a bridge (`deLabs`)
    id: 'agentes',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 2 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 17, desde: '2026-10-24' },
    slug: 'agents',
    emoji: '🕵️',
    name: { es: 'Agentes', en: 'Agents', pt: 'Agentes' },
    tagline: { es: 'Encuentra a tus espías con las pistas, sin tocar al asesino.', en: 'Find your spies from the clues, without touching the assassin.', pt: 'Encontre seus espiões com as pistas, sem tocar no assassino.' },
    keywords: {
      es: ['codenames', 'espias', 'pistas', 'palabras', 'asociar', 'asesino', 'agente', 'secreto'],
      en: ['agents', 'codenames', 'spies', 'clues', 'words', 'associate', 'assassin', 'spy', 'secret'],
      pt: ['codenames', 'espiões', 'pistas', 'palavras', 'associar', 'assassino', 'agente', 'segredo'],
    },
    tipos: ['words'],
    duration: '3–6',
    deLabs: true,
    nuevoDesde: '2026-10-21', // launched 2026-10-22; the owner retired its "New" a day early (D-507)
  },
  {
    // Out of the lab in D-456: its page was /labs/bridges/, now a bridge (`deLabs`); its id is La Copa's
    id: 'puentes',
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 13 },
    // Uno al día: its place in the deck order (never reorder: the shuffle depends on it) and since when it comes out (#855)
    unoAlDia: { orden: 18, desde: '2026-10-27' },
    slug: 'bridges',
    emoji: '🚅',
    name: { es: 'Tren en Vilo', en: 'Train on the Edge', pt: 'Trem no Vão' },
    tagline: { es: 'Arma un puente que aguante el tren.', en: 'Build a bridge that holds the train.', pt: 'Monte uma ponte que aguente o trem.' },
    keywords: {
      es: ['puente', 'puentes', 'tren', 'vigas', 'construir', 'fisica', 'ingenieria', 'poly bridge', 'logica'],
      en: ['bridge', 'bridges', 'train', 'beams', 'build', 'physics', 'engineering', 'poly bridge', 'logic'],
      pt: ['ponte', 'pontes', 'trem', 'vigas', 'construir', 'física', 'engenharia', 'poly bridge', 'lógica'],
    },
    tipos: ['logic'],
    duration: '5–7',
    deLabs: true,
    nuevoDesde: '2026-10-26',
  },
  {
    // Out of the lab in D-517, launched by its flag (`lanza`): until the owner switches flags/stick to
    // 🚀 on its /labs/ card, it is hidden from the home page, the search, the rankings and new cups
    // (`oculto`). Its lab page /labs/stick/ stays until the cleanup PR makes it a bridge
    id: 'stick',
    lanza: 'stick',
    // Its name is Shinobi (the owner's choice, first called Ninja); the id stays `stick`
    // La Copa: its place in the pool an admin picks the days from (cup/engine.js POZO, #855)
    copa: { pozo: 14 },
    // Uno al día: by date, never by flag (the deck must be the same on every phone): from the day after
    // the launch, joining the next deck
    unoAlDia: { orden: 19, desde: '2026-11-03' },
    slug: 'shinobi',
    emoji: '🥷',
    name: { es: 'Shinobi', en: 'Shinobi', pt: 'Shinobi' },
    tagline: { es: 'Estira el palo, cruza el abismo y clava la bandera.', en: 'Stretch the stick, cross the gap, plant the flag.', pt: 'Estique o bastão, atravesse o abismo e finque a bandeira.' },
    keywords: {
      es: ['shinobi', 'ninja', 'palo', 'puente', 'saltar', 'habilidad', 'reflejos', 'pulso', 'bandera', 'abismo'],
      en: ['shinobi', 'ninja', 'stick', 'bridge', 'jump', 'skill', 'reflexes', 'timing', 'flag', 'gap'],
      pt: ['shinobi', 'ninja', 'bastão', 'ponte', 'pular', 'habilidade', 'reflexos', 'precisão', 'bandeira', 'abismo'],
    },
    tipos: ['skill'],
    duration: '1–3',
    nuevoDesde: '2026-11-02',
    diasNuevo: 10,
  },
  {
    // Out of the lab in D-517 with Shinobi, launched the same way by flags/stack (see Shinobi). Its name is Babel (the
    // owner's choice): not the original's (Stack); the id stays `stack`
    id: 'stack',
    lanza: 'stack',
    copa: { pozo: 15 },
    unoAlDia: { orden: 20, desde: '2026-11-03' },
    slug: 'babel',
    emoji: '🗼',
    name: { es: 'Babel', en: 'Babel', pt: 'Babel' },
    tagline: { es: 'Levanta tu torre lo más alto que puedas.', en: 'Raise your tower as high as you can.', pt: 'Erga sua torre o mais alto que puder.' },
    keywords: {
      es: ['torre', 'apilar', 'bloques', 'babel', 'stack', 'habilidad', 'reflejos', 'pulso', 'altura'],
      en: ['tower', 'stack', 'blocks', 'babel', 'skill', 'reflexes', 'timing', 'height'],
      pt: ['torre', 'empilhar', 'blocos', 'babel', 'stack', 'habilidade', 'reflexos', 'precisão', 'altura'],
    },
    tipos: ['skill'],
    duration: '1–3',
    nuevoDesde: '2026-11-02',
    diasNuevo: 10,
  },
  // Los del laboratorio viven en /labs/<slug>/ (D-267): al salir pasan a /<slug>/
].map(m => ({ ...m, players: '1', path: `${m.labs ? 'labs/' : ''}${m.slug}/`, available: !m.labs, suelto: true, ...(m.lanza ? { oculto: !lanzado(m.lanza) } : {}) }));

/**
 * Los tipos de juego con que se filtra la portada (D-142), en el orden en que se ofrecen.
 * Cada juego dice los suyos en `tipos`; uno sin tipos solo se ve sin filtro de tipo.
 * La clave es la que va en la URL (`?type=logic`), en inglés como las rutas (D-192, D-214).
 */
export const TIPOS = {
  words: { emoji: '🔤', name: { es: 'Palabras', en: 'Words', pt: 'Palavras' } },
  logic: { emoji: '🧩', name: { es: 'Lógica', en: 'Logic', pt: 'Lógica' } },
  trivia: { emoji: '🧠', name: { es: 'Cultura', en: 'Trivia', pt: 'Cultura' } },
  // Only dice since Julepe and Cuarto Rey left the home page (D-420): the key stays, the name says what is there (D-517)
  tabletop: { emoji: '🎲', name: { es: 'Dados', en: 'Dice', pt: 'Dados' } },
  // The first skill games, Shinobi and Babel (D-517): the home page offers a type only while it has a game to show.
  // A short name, so five types fit one row on a 320 px phone in every language
  skill: { emoji: '🎯', name: { es: 'Pulso', en: 'Skill', pt: 'Reflexo' } },
};

/** Los tipos de antes de D-214 (`?tipo=mesa`): un link viejo sigue filtrando lo mismo. */
export const TIPOS_VIEJOS = { palabras: 'words', logica: 'logic', cultura: 'trivia', mesa: 'tabletop' };

/**
 * The home page's order (D-255, D-361): most finished games first, counting the last four weeks of
 * offline games, rooms that ended, La Copa days played and Uno al día. It is still a fixed list,
 * so the page needs no database to draw itself, but it is no longer refreshed by hand: once a week
 * the processes round runs `node tools/agents/popularity.mjs update` and opens a PR with auto-merge
 * when the order changed. The two lines below are written by that tool; a game not in the list
 * goes after the ones that are, in the order of GAMES and SUELTOS.
 */
export const POPULARIDAD_FECHA = '2026-10-26';
export const POPULARIDAD = ['copa', 'reinas', 'donde', 'tango', 'anio', 'loteo', 'linea-de-tiempo', 'letras', 'desenredo', 'pintaminas', 'conexiones', 'agentes', 'zip', 'toque-y-fama', 'rutas', 'batalla-naval', 'generala', 'dudo', 'ahorcado'];
const puesto = id => { const i = POPULARIDAD.indexOf(id); return i < 0 ? POPULARIDAD.length : i; };

/**
 * A new game carries a "New" label on its home card for a week (D-333, D-507, the owner's request): from
 * `nuevoDesde`, the day it reached the home page, for DIAS_NUEVO days. Every game added after D-333
 * brings its date, and games.test.mjs stops one that doesn't (YA_ESTABAN is the list from before).
 */
export const DIAS_NUEVO = 7;
export const esNuevo = (g, hoy = new Date()) => {
  if (!g?.nuevoDesde) return false;
  const desde = Date.parse(`${g.nuevoDesde}T00:00:00`);
  // A game may carry its own length (`diasNuevo`): Shinobi and Babel keep it 10 days (the owner's request, 2026-11-01)
  return hoy.getTime() >= desde && hoy.getTime() < desde + (g.diasNuevo || DIAS_NUEVO) * 24 * 60 * 60 * 1000;
};

/**
 * Todo lo que ofrece la portada, de lo más jugado a lo menos (D-255). Los que vienen
 * "Próximamente" van al final, con y sin filtro: no se abren y no deben tapar a los que sí.
 * While a game carries its "New" label it goes on top, right after La Copa (D-335, the owner's
 * request: it has no plays yet, so by popularity it would be last); when the label goes, so does that.
 */
export function ordenPortada(hoy = new Date()) {
  const ofrecidos = [...GAMES, ...SUELTOS].filter(g => !g.labs && !g.bodega && !g.oculto).sort((a, b) => puesto(a.id) - puesto(b.id));
  const arriba = g => (g.torneo ? 0 : esNuevo(g, hoy) ? 1 : 2);
  const disponibles = ofrecidos.filter(g => g.available).sort((a, b) => arriba(a) - arriba(b));
  return [...disponibles, ...ofrecidos.filter(g => !g.available)];
}
export const PORTADA = ordenPortada();

/**
 * The 🔥 "Popular" label (D-361, the owner's request): the first POPULARES games of the home page's
 * order, leaving out La Copa (it has its own card on top) and the games still carrying "New"
 * (that label says more, and they have no plays to rank yet). Only available games count.
 */
export const POPULARES = 3;
export function populares(hoy = new Date(), orden = ordenPortada(hoy)) {
  return new Set(orden.filter(g => g.available && !g.torneo && !esNuevo(g, hoy) && POPULARIDAD.includes(g.id)).slice(0, POPULARES).map(g => g.id));
}

/** Cuántos juegan como mínimo y como máximo ("1–6" → [1, 6]; "1" → [1, 1]). */
export function rangoJugadores(players) {
  const n = String(players || '').split(/[^\d]+/).filter(Boolean).map(Number);
  return n.length ? [Math.min(...n), Math.max(...n)] : [1, 1];
}

/* ------------------------------------------------------------------ */
/* Lo derivado: de acá lo lee cualquiera que necesite hablar de juegos  */
/* o de modos sin copiarse la lista (canon C-16).                      */
/* ------------------------------------------------------------------ */

/*
 * `jugadas`: los tipos de mensaje de sala que son una jugada de una persona (un disparo, un
 * intento, una apuesta). El panel cuenta solo esos (D-138): una sala también se llena de
 * mensajes que manda el juego solo —la respuesta a cada disparo, los compromisos y las
 * revelaciones del anti-trampa—, de las entradas y de la charla, y contarlos todos juntos
 * hacía decir "176 msjs" a una partida donde nadie escribió una palabra.
 */

/** Los ids, en el orden del menú. */
export const GAME_IDS = GAMES.map(g => g.id);

// Con los de La Copa: el panel también los nombra cuando mandan su señal de uso (C-16)
const BY_ID = Object.fromEntries([...GAMES, ...SUELTOS].map(g => [g.id, g]));

/** El juego con ese id, o `null` si no está registrado. */
export const gameById = id => BY_ID[id] || null;

/**
 * Cómo se nombra un juego en una URL (C-18, D-266): en inglés, como su carpeta (`reinas` →
 * `queens`). Los de La Copa que no tienen página propia llevan el suyo. El id no cambia (lo
 * guardan las salas, el panel y el celular): solo lo que se ve en la dirección.
 */
export const SLUGS_SIN_PAGINA = { linea: 'timeline-flash', numero: 'number' };
const SLUG_DE = { ...Object.fromEntries([...GAMES, ...SUELTOS].map(g => [g.id, g.slug || String(g.path || '').replace(/\/$/, '') || g.id])), ...SLUGS_SIN_PAGINA };
const ID_DE = Object.fromEntries(Object.entries(SLUG_DE).map(([id, slug]) => [slug, id]));
/** El nombre en la URL de un juego; un id que no está en la lista queda igual. */
export const slugDe = id => (Object.hasOwn(SLUG_DE, id) ? SLUG_DE[id] : id);
/** El id de un juego desde su nombre en la URL, o desde su id (los links de antes de D-266). */
export const idDeSlug = s => (Object.hasOwn(SLUG_DE, s) ? s : Object.hasOwn(ID_DE, s) ? ID_DE[s] : s);

/**
 * Cómo se nombra un juego fuera del menú (el panel, por ejemplo).
 * Un id que no está en la lista se devuelve tal cual: puede ser un juego recién publicado,
 * uno que se fue, o una versión vieja de la app que todavía manda señales. En los tres casos
 * hay que poder verlo, no perderlo en silencio (C-16).
 */
export function gameLabel(id, lang = 'es') {
  const g = BY_ID[id];
  return g ? `${g.emoji} ${g.name[lang] || g.name.es}` : String(id || '?');
}

/**
 * Los modos que existen, en el orden en que se ofrecen (C-5). `online` es el de la sala y
 * se cuenta por sala; los demás son sin red y suben un contador (`local/<juego>/<modo>/<n>`).
 *
 * Agregar un modo es agregar una línea acá: el registro de señales lo manda, las reglas de
 * la base lo aceptan por forma y el panel lo dibuja con su ícono y su color, sin tocar nada
 * más. The label is in English because only the owner reads it, in the panel, which is English
 * only (D-350); what the player sees comes from each game's `LOCALES` (C-3).
 */
export const MODES = {
  online: { icon: '📡', label: 'two phones', room: true },
  local: { icon: '📱', label: 'one phone' },
  cpu: { icon: '🤖', label: 'vs. the phone' },
  // `individual`: played by one person; the panel splits its domains by this flag (D-348)
  solo: { icon: '🧍', label: 'solo', individual: true },
  // One a Day (D-230): today's game, the same for everyone, in its one-player mode
  'uno-al-dia': { icon: '📅', label: 'One a Day', individual: true },
  // A played tournament day: the panel measures it in its own view, with the tournament's data
  copa: { icon: '🏆', label: 'a La Copa day', torneo: true },
};
/** El modo de las partidas de Uno al día (D-230): lo usan los juegos al contarlas y el panel al leerlas. */
export const MODO_UNO_AL_DIA = 'uno-al-dia';

/** Todos los modos conocidos, en orden. */
export const MODE_IDS = Object.keys(MODES);

/** El modo de la sala: el que se cuenta por sala y no por contador. */
export const ROOM_MODE = MODE_IDS.find(m => MODES[m].room);

/** Los que suben un contador de partida sin red: todos menos el de la sala. */
export const LOCAL_MODES = MODE_IDS.filter(m => !MODES[m].room);

/**
 * Forma de una clave de modo. Se valida la forma y no la lista: un modo que el código empezó
 * a mandar antes de que el panel supiera de él tiene que llegar igual (C-16).
 */
export const MODE_KEY = /^[a-z][a-z-]{0,15}$/;

/** ¿Esta clave es un modo sin red, que sube contador? Vale para uno que todavía no existe. */
/** A mode played by one person (D-348): solo and Uno al día. */
export const isIndividualMode = mode => !!MODES[mode]?.individual;

export const isLocalMode = mode => MODE_KEY.test(String(mode || '')) && !MODES[mode]?.room;

/**
 * ¿Es un torneo (un juego que dura días y se juega un juego por día) o un juego de una partida?
 * El panel separa por esto y no por nombre, así que un segundo torneo entraría solo (C-16).
 */
export const isTorneo = id => !!BY_ID[id]?.torneo;

/** El ícono del modo; uno desconocido se muestra con su clave, que es mejor que nada. */
export const modeIcon = mode => MODES[mode]?.icon || '·';

/**
 * Cuántas personas caben en el juego más numeroso ("1–6" → 6). De acá sale el tope con que
 * se guardan y se agrupan los jugadores por partida: si algún día entra un juego de ocho,
 * el tope sube solo. Ojo: los roles de sala (`A`–`F`) y las reglas de la base también tienen
 * que crecer para que un juego así funcione en dos celulares.
 */
export const MAX_PLAYERS = Math.max(...GAMES.filter(g => !g.torneo).map(g => Number(String(g.players).split(/[^\d]+/).filter(Boolean).pop()) || 1));
