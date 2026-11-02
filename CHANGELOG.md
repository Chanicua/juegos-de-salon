# Changelog

## 0.247.1 — 2026-11-02
- **Shinobi and Babel** keep the «Nuevo» label 10 days from their launch, until 2026-11-11 (the owner's request); a game can now set its own length with `diasNuevo`.

- Tests: the cup store's clock test jumps to day 3 from its window, so it no longer fails late in the evening.

## 0.247.0 — 2026-11-01
- **Bug reports start with a failing test** (D-527, #1090): `feedback.mjs repro` records the test that reproduces a 🐞 bug, and `reply` refuses a bug report without one or a `--no-repro` reason; Shinobi's doubled ninja (#1103) is the first example.

## 0.246.0 — 2026-11-01
- **Labs**: each flag in the lab counts how much testers really use it (aggregate, no player data), and an hourly job marks its /labs/ card **✅ Listo para 🚀** with the numbers once it passes the bar (5 finished uses, 2 keys, 3 days, no errors); the owner still publishes it. Behind its own flag `lab-ready` (D-528, #1089).

## 0.245.2 — 2026-11-01
- **Scheduled launches:** a launch workflow switches flags and splash campaigns at a set hour, as the /labs/ cards and the panel do; Shinobi, Babel and their splash go live at 00:00 Pacific on 2026-11-02 (D-529).

## 0.245.1 — 2026-11-01
- 🧪 Labs (flag `tester-ribbon`): the tester ribbon is on every screen, not only the home page and Babel. It hides while a game is being played, unless that screen has a test control.

## 0.245.0 — 2026-11-01
- **Uno al día** tells the best Babel and Shinobi players apart: instead of cutting at 100, their points go through a soft curve (50 → 46, 100 → 71, 200 → 92), and the result says what the game counts there (D-526).

## 0.244.1 — 2026-11-01
- **Shinobi**: the result screen no longer shows the ninja twice; the score is just the number under the title.

## 0.244.0 — 2026-11-01
- **Babel** pays streaks on top of height: 1 point a floor, +3 for each streak of 3 or more perfects, and +1, +2… up to +5 for each perfect that makes the streak longer. **Babel and Shinobi** no longer stop at 100; La Copa still ranks the day by position, and caps at 100 only in the Grand Final and Uno al día. Scores already saved are kept (D-525).

## 0.243.0 — 2026-11-01
- 🧪 Labs (flag `tester-ribbon`): testers get a ribbon on the right edge, under the top bar, with a shimmering T. Opened, it has the tester sheet (i), a link to Labs and the screen's test control (Simular final in Babel), with a red dot on the folded T where the screen has one; elsewhere only the sheet and Labs. It replaces the home page's «tester» chip and Babel's 🧪 tab while the flag is on.

## 0.242.3 — 2026-11-01
- **La Copa's home card no longer offers a day you just played.** Going back to the menu after a cup day brought the page as it was before (the browser's back cache), still saying ▶ Jugar el día N; the card is now drawn again from what La Copa kept, and checked with the server, when the page comes back or is shown again.

## 0.242.2 — 2026-11-01
- **The language switch shows only flags**: the ES/EN/PT text is gone, so it takes less width; the language name is still read aloud and shown on hover.

## 0.242.1 — 2026-11-01
- **Lab**: the "La Copa: your cup, your place and the day's game on the home page" card moves to La Bodega as 💤 No prosperó, as the owner asked from /labs/ (D-511). Nothing changes for players.

## 0.242.0 — 2026-11-01
- 🏆 **La Copa, the length and the time zone chosen by the admin** (in the lab, flag `copa-crear`, D-521): the new create screen asks when it starts first, then how long with − n days + (3 to 14, shortcuts for 3, 7 and 14), the 🏁 Grand Final a switch from 5 days, and a warning on long cups. The final plays 5 of the cup's games at random. The zone of the cup follows the audience (Chile's time for 🇨🇱) or the admin's phone, with **Cambiar**; a player in another zone sees the closing times in their own hours. The database rules take cups of up to 14 days (publish them on merge).

## 0.241.15 — 2026-11-01
- **Lab**: the 🥇 Uno al día month-end place card moves to La Bodega under ✨ Mejoras lanzadas, already live for everyone.

## 0.241.14 — 2026-11-01
- **A lab 🚀 / 📦 PR with red checks no longer waits forever**: the Mac mini's `lab-publish-watch` treated only a conflict with `main` as stuck, so #1099 sat for hours with `tests` and `end-to-end` red. Red checks that last 15 minutes now send the same fixing session (merge `main`, rerun what was flaky, fix what the branch broke), at most twice per request, and the card fails with Volver a pedir if it does not take (D-486).

## 0.241.13 — 2026-11-01
- **La Copa's «Crea o únete a una Copa» button matches One a Day's «Únete al mes»** (in the lab, flag `copa-contexto`): the invite keeps the plain yellow pill; only the ▶ to play a day stays louder.

## 0.241.12 — 2026-11-01
- **La Copa's home card** (lab, flag `copa-contexto`): with a cup saved before the place and the games were, the day bar showed empty and the card had no text; now the bar fills the card and it says «Día 4 de 7. Hoy: Reinas.», the game read from the cup's calendar.

## 0.241.11 — 2026-11-01
- **Filtering the home page hides Uno al día**: with a kind of game or a search on, only the games that match are shown; "Ver todos" brings the card back.

## 0.241.10 — 2026-11-01
- A 🔴 PR now opens with five plain lines for the owner (what changes, worst case, can it be undone, risk, recommendation), so approving or rejecting is one simple read (docs/LANES.md).

## 0.241.9 — 2026-11-01
- **Uno al día**: on the first day of a month, the month's ranking no longer says "nobody yet" while the card above says you are #1: your own row shows with today's points until the hourly count catches up.
- **Uno al día**: the ranking's Today tab says its points are the game's alone; the streak bonus is added in Month.

## 0.241.8 — 2026-11-01
- 🧪 **«tester» tag on the home page**: with a lab key, a subtle «TESTER» sticker on the title's corner, out of the page's flow so nothing moves (the same word in
  every language) opens a sheet saying what the key gives: /labs/, what is in testing already on, and how to
  comment; with «🧪 Ir a Labs». Everyone else sees the title as before (`public/assets/js/tester-badge.js`).

## 0.241.7 — 2026-11-01
- 🧪 **Babel's music joins Babel's /labs/ card**: no separate «Babel con música» card or flag; the music is behind
  Babel's own flag `stack`, so it launches with the game.

## 0.241.6 — 2026-11-01
- 🧪 `tools/e2e/cup/tournament.mjs` no longer fails on the day summer time ends (a 25-hour day, as
  2026-11-01 in Los Angeles): its advanced clock adds three hours to reach tomorrow's day 1 and the cup's end.

## 0.241.5 — 2026-11-01
- 🚀 **Publishing works again**: every Publish run since the merge lanes (D-519) failed to start, because
  `tests.yml`'s new `lane` job asks for more permissions than `publish.yml` granted it. The site stayed
  at the 2026-11-01 03:51 UTC version; this grants them, and the next merge publishes everything waiting.
- 🧪 `public/cup/store.test.mjs` no longer fails on the day summer time ends (a 25-hour day): the
  advanced clock moves two days and two hours, not two plain days.
