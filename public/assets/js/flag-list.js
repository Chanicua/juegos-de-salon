/**
 * The lab's runtime flags by name (D-498), for /labs/, the panel and the tests only. It is apart from
 * flags.js, which almost every page loads, so adding or renaming a flag here does not run the
 * end-to-end scripts of every page (D-515). A new flag is a row here and its card in /labs/.
 */
export const FLAGS = {
  'copa-crear': '🏆 La Copa: the new create screen, with the length from 3 to 14 days and the cup\'s zone, and each player\'s own hours in a cup of another zone (D-521)',
  'copa-hoy': '🏆 La Copa: ▶ Jugar hoy on its home page card',
  'copa-espera': '🏆 La Copa: Día N en Xh on its home page card',
  'copa-contexto': '🏆 La Copa: which cup, your place and the day\'s game on its home page card',
  'bn-salva': '🎆 Battleship: Salvo',
  'keyboard-lift': '⌨️ Feedback form above the iOS keyboard',
  'uad-share-grids': '🟩 Uno al día: share grids for Agentes, Dudo, Generala and Battleship',
  'cover-facts': '📖 Game pages: who plays and how long, in the rules',
  'uad-night-totals': '📅 Uno al día: totals written by the hourly rebuild',
  'home-pill-bar': '💊 Home page: top bar buttons as pills of one height',
  'cup-back-board': '🏆 La Copa: the header ‹ goes back to the board while playing a day',
  'name-guard': '🛡️ Rankings: offensive names refused on sign-up',
  'uad-month-end': '🥇 Uno al día: month-end window with your place, a medal for the podium',
  'stick': '🥷 Shinobi: the game, on the home page, the search and new cups (D-517)',
  'stack': '🗼 Babel: the game, on the home page, the search and new cups (D-517), with its background music',
  'tester-ribbon': '🧪 Testers: a ribbon on the right edge with the tester sheet, Labs and each screen\'s test control',
  'no-double-tap-zoom': '👆 Games: a double tap no longer zooms the page (iPhone)',
  'lab-ready': '✅ Labs: lab use of each flag is counted, and its card says when it is ready to 🚀 (D-528)',
};

/**
 * When a flag in *lab* is ready to publish (D-528): at least `completions` finished loads by at least
 * `keys` different lab keys over at least `days` days, with at most `errors` loads that failed, all
 * since the flag was last switched. `tools/agents/lab-ready.mjs` applies it; a row of READY_BY
 * overrides it for one flag (a screen few reach asks for less, a big change for more).
 */
export const READY = { completions: 5, keys: 2, days: 3, errors: 0 };
export const READY_BY = {};
