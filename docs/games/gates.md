# 🔀 Compuertas (lab prototype, in Juegos en prueba)

A solo reflex-and-planning game, the owner's idea: "things fall from the top, and you have to keep
making the balls land in places at the bottom; you have handles (*manillas*) you can turn, and the
points below keep changing, so you have to keep turning the handles for the balls that are coming".
The layout is a Galton board (a triangle of pegs, as in pachinko or a quincunx) where every peg is a
paddle the player flips.

## Summary

- **Where:** `https://juegosdesalon.cl/labs/gates/`, in the lab (each person's key, D-281, D-284). Id
  `compuertas` in the usage signal.
- **Who:** one player. Spanish only (it is a prototype).
- **State:** an active lab project, to try with friends.

## Rules

- **The board:** a funnel at the top, 5 rows of paddles in a triangle (1, 2, 3, 4 and 5 paddles) and 6
  bins below. Each paddle leans left or right; a ball that reaches it rolls off that side onto one of
  the two paddles below, and after the last row falls into a bin. Every bin can be reached from the
  funnel.
- **Flipping:** a tap on a paddle flips it. It counts for every ball that reaches the paddle after the
  tap; a ball that already rolled off keeps its way. The tap is judged at its own timestamp, and the
  game runs on its own clock, so the frame rate does not change where a ball goes.
- **The bins:** each 10-second period the bins are 1, 2, 3, 5, 10 and 🗑️ in some order; the 10 and
  the 🗑️ always move. 2.5 seconds before a change the bins blink and show the next value under the
  current one («→5»), and the board says «¡Cambian!».
- **The balls:** about 48 a game, one every 1.7 s at first and every 0.75 s at the end, falling faster
  as the game goes (0.52 s a row down to 0.32 s). A normal ball scores its bin's value (the 🗑️ is 0).
  A ⭐ gold ball (1 in 10) scores triple. A 💣 bomb (from the 6th second, about 1 in 6, never two in
  a row) is defused in the 🗑️ (+5) and blows up anywhere else (−10, the board shakes). The score never
  goes below 0.
- **Help on the board:** a dotted line goes from the funnel along the paddles as they are now to the
  bin the next ball would land in, outlined in white; a small dot over a bin for each ball in the air
  headed there, in its color (pink for a bomb). The next ball waits in the funnel and shakes just before
  it drops.
- **The end:** a minute. The last ball drops early enough to land before it.
- **Best possible:** every ball in the 10 (gold ones too) and every bomb in the 🗑️; the result shows
  «N de M posibles». A player that never misses reaches it (`autoplay` in the engine, which the tests
  and the cover's demo use).

## Modes

Solo only. Without `?seed=` it is today's game (`dia:YYYY-MM-DD`, local date), the same for everyone;
`?seed=<text>` plays another one, and «🔁 Otra partida» opens a random seed.

## Flow

1. **Cover:** the title with a 🔀 that rocks, the tagline («Gira las manillas para que cada pelota
   caiga donde más puntos vale.»), a small board that plays by itself, «📅 La partida de hoy es la misma
   para todos.» (without a seed), «🔀 Empezar» and the three steps:
   1. 👆 Toca una manilla para girarla: la pelota rueda hacia donde apunta.
   2. 🔟 Abajo, los puntos cambian cada 10 segundos. Lleva cada pelota al 10. Las doradas valen el triple.
   3. 💣 Las bombas van a la basura. En otra parte explotan y restan 10.
2. **Countdown:** the shared 3, 2, 1 (`cuenta-regresiva.js`), «¡A girar!»; the clock starts there.
3. **Game:** the score and the seconds left over a bar, the board, and «Toca una manilla para girarla»
   until the first flip. Losing focus or hiding the page pauses the clock («⏸️ En pausa / Toca para
   seguir»); the first tap back only takes the pause off.
4. **Result:** «¡Tiempo!» or «🏆 ¡Tu mejor partida!» (the best is kept on the phone), the score, «de M
   posibles», the best so far, the tally (balls in the 10, gold ones, bombs defused), share (the card
   is one mark per ball in rows of 10: 🟩 the 10, 🟨 3 or 5, 🟧 1 or 2, ⬛ the 🗑️, 🧯 a defused bomb,
   💥 a blown one), «🔁 Otra partida», «📅 La de hoy» (with a seed), back to the lab, and the comment
   form after a line.

The lab card: «Caen pelotas desde arriba y tú giras las manillas para que cada una caiga en el mejor
lugar. Abajo, los puntos cambian cada 10 segundos. Las bombas van a la basura. Un minuto por partida.».

## Message protocol

None: solo, offline. The usage signal (`trackStart` / `trackFinish`) carries the score out of the best,
the balls in the 10, the bombs defused and the flips.

## Files

- `public/labs/gates/engine.js`: the board, the seeded game (paddles, periods, drops), `advance`,
  `flip`, routes, `steer` and `autoplay`, the score, the card and the tally. Pure, with no DOM.
- `public/labs/gates/engine.test.mjs`: every bin reachable, the periods, the points, flips at their
  own moment, a late tap, the same game at 60 Hz, 120 Hz and in one go, and `autoplay` scoring the best.
- `public/labs/gates/scene.js`: the canvas (funnel, paddles that ease to their side, balls, bins, the
  route, the points that rise and the sparks); `paddleAt` finds the paddle a tap touched.
- `public/labs/gates/game.js`: the screens. `window.__compuertas` exposes the state, `juega()` (the
  autoplay at the game's clock) and `adelanta(ms)` (moves the clock ahead) for the end-to-end script.
- `tools/e2e/gates/lab.mjs`: the lab card, the cover, a real tap flipping a paddle, the pause, and a
  whole game played by the autoplay up to the result.

## Exceptions to the canons

- Spanish only (a lab prototype, like Números explosivos): no `rules.js` with `LOCALES`; the texts
  live in `T` in `game.js`.
- No room or pass-the-phone modes, no rankings and no La Copa: a solo lab prototype.
