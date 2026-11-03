# 🐤 Aletazo (lab prototype, in Juegos en prueba)

A one-tap flyer for one player: every tap gives the bird a wing flap ("aletazo") upwards, gravity
pulls it down, and the course scrolls from right to left. The bird flies through neon hoops and the
openings of walls, and it gets harder every 5 gates. An original game in a well-known genre: the bird,
the hoops, the walls and the look are our own, drawn in the app's neon night. It was built with a
contributor, round by round on a playable prototype, before entering the lab.

## Summary

- **Where:** `https://juegosdesalon.cl/labs/flap/`, in the lab (each person's key, D-281, D-284). Id
  `aletazo` in the usage signal.
- **For whom:** one player. In Spanish, English and Portuguese (C-3), with the language toggle on the
  cover.
- **Status:** active project, to try with friends.

## Cover

A glass card over a demo that flies itself (the engine's autopilot): the title with a 🐤 that sways,
the tagline («Un toque, un aletazo.»), three steps, «🐤 Jugar», the best score on this phone and the
language toggle. The steps:

1. 👆 Toca para subir un poco.
2. ⭕ Pasa por aros y huecos. Al medio vale doble.
3. ❤️ 3 vidas. Si chocas o te saltas un aro, pierdes una.

Under the stage, «💬 Dejar un comentario» opens the lab's comment form (D-265).

## How it is played

- **The tap:** anywhere on the stage (or the space bar, or ↑). The first one starts the game; until
  then the bird hovers and «Toca para volar» says what to do.
- **Gates:** a **hoop** (+1, or **+2 through its middle**: within 30 % of its radius); a **hoop set in
  a wall**, the only way through; or a **bare gap** in a wall, its lips lit cyan (+1). Each hoop is
  drawn in two halves, the back one before the bird and the front one after it, so the bird flies
  through.
- **Lives:** 3 ❤️. Hitting a hoop's end, a wall, a spike or the ground costs one, and so does skipping a
  hoop. After a hit the bird blinks for 1.3 s and can't be hurt again. The ground bounces it back up.
- **Levels:** a new one every 5 gates, announced in big letters («Nivel 3»). Each of the first ten is
  10 % of the starting speed faster; after that it keeps climbing, slower, and never stops. Hoops get
  smaller and further apart in height; from 6 gates in some move up and down (a faint dotted track
  shows it); from level 2 walls appear (announced once: «¡Muros! Pasa por el hueco»), more of them and
  with narrower bare gaps as it goes; from 12 gates in, spinning spikes sit between two hoops, off the
  straight line, never next to a wall. The first three hoops are a warm-up, almost level.
- **Dead center** celebrates like Shinobi's flag, softer (the owner's request): two rings open from the
  hoop, a faint gold flash, a short spray of sparks, the bird lights up for a moment and a «+2» pops up.
  A plain pass shows a «+1».
- **The end:** the bird falls with ✕ eyes, and a card shows the stamp («🏆 ¡Nuevo récord!» or «¡Se
  acabó!»), the score, a line about how it went (under 6: «Recién saliendo del nido 🐣»; 6–15: «Ya le
  estás agarrando el vuelo»; 16–30: «¡Vuelas bonito! ✨»; 31–50: «¡Pájaro de altura! 🦅»; 51 and up:
  «¡Dueño del cielo! 👑»), «Tu mejor: n» when it is not a record, «Jugar otra vez» and back to the lab.
  The owner chose this simple ending over one with a summary of the game.
- **Paused:** leaving the tab mid-game (a call, another app) pauses it; a tap brings it back.

## How it works

- `engine.js`: the world is measured in stage heights (1 = the stage's height, `W` its width over its
  height). `newGame({ W, random })`, `flap(g)` and `step(g, dt)` (a fixed 1/120 s step) move the game
  and leave what happened in `g.events` (`flap`, `pass`, `perfect`, `hit`, `level`, `walls`, `over`,
  `end`) for the page to play. `spawn(g)` lays the next gate; `crossing(gate, y)` says what crossing
  it is worth; `autopilot(g)` flies the cover's demo. Difficulty: `levelOf(passed)`, `diff(level)`
  (0 up, never 1), `targetSpeed(level, W)`, and `fit(W)`, which slows and tightens the world on a
  narrow portrait stage so the gates come at the same pace. `rng(seed)` gives tests a repeatable course.
- `scene.js`: the drawing on one transparent canvas over the app's night: stars and two strips of city
  in parallax, the ground, walls, hoop halves, spikes, the bird, sparks, rings and points. No
  `shadowBlur` (it cost ~50 ms a frame on a 3× phone): the glow is a wide see-through stroke, and the
  bird and the spike are sprites drawn once. The canvas is at most 2×.
- `game.js`: the screens, the input, a few synth tones (opened on the tap on Play, silenced by the app's
  🔊), the texts in `LOCALES = { es, en, pt }`, the best score in `localStorage`
  (`juegos-de-salon:aletazo-best`) and the usage signal (`trackStart` on the first flap, `trackFinish`
  with points, gates, dead centers, walls, level and seconds).
- **The hook:** `window.__aletazo` (`g`, the game in play, and `start()`), for the end-to-end script.

## Tests

`public/labs/flap/engine.test.mjs` (the physics, scoring by crossing height, hits by rim, wall, ground
and skipped hoop, the shield, the end after 3 lives, levels every 5, the course: no walls in level 1,
no spike beside a wall, openings always within reach, and the cover's demo never charging anything).
End to end: `tools/e2e/flap/lab.mjs`.
