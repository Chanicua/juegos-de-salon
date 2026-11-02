# 🗼 Babel (La Copa game, launched by flag; Stack in the lab)

> **Launched 2026-11-02 (D-517, D-529).** The game is now **🗼 Babel**, a La Copa game in `public/cup/games/stack/`
> (engine, scene, screen, texts in es, en and pt) that serves its page `/babel/`, Uno al día (from the
> deck shuffled on 2026-11-08) and La Copa. **Score (D-525):** 1 a floor, +3 a streak of 3+ perfects, and +1, +2… up to +5 for each further perfect in it; no cap (the Grand Final caps at 100; Uno al día uses a soft curve, D-526). It went live when the launch workflow switched
> the flag `stack` to everyone at 00:00 Pacific on 2026-11-02 (D-529); the gate stays until the cleanup PR, with «Nuevo» for 10 days. The cover credits the original with a link, as every inspired game
> does. What follows describes the English lab prototype, still at `/labs/stack/` until the cleanup PR;
> the play is the same in the new module. End to end: `tools/e2e/stack/game.mjs`.
>
> **The end's tour** (the owner's request, only in Babel, not the lab prototype): when a game ends the
> tower takes the whole screen and the camera goes down it to the base at a steady pace while it turns
> a full circle, then back up turning the other way (`scene.js` `tour`, `recorrer`). A glowing plane
> slices the tower every ten floors, its number lying on the plane in two opposite corners. Up top it
> reads «N pisos» (no blocks stamp); «Continuar» sits on a blurred strip over the tower, and the tour starts from the game's last frame, the top gliding up to just under «Fin del juego». No tour
> with reduced motion.
>
> **«🧪 Simular final»** (only with a lab key, on `/babel/`): a floors box and a button in a folded 🧪 tab on
> the screen's left edge (`#sk-lab`), off the cover so it always shows what players see (the owner's call).
> The game starts with the tower already built to that height minus three, the last three blocks drop
> on their own and the next one misses, so the owner sees the end without playing it. Taps do nothing
> meanwhile; «Continuar» reloads the cover instead of opening the result, so it is never ranked
> and it sends no usage signal, takes no Uno al día attempt and saves nothing (`simulando()` in `ui.js`).

A one-tap tower game for one player (D-445): a block slides over the tower, a tap drops it, and whatever
hangs over the edge is cut off. **Inspired by [Stack](https://www.ketchappgames.com/), by Ketchapp
(2016)**, and it says so on the cover and in the lab. The owner sent a video of the original and asked:
"Build the prototype directly and put it in Labs. English only for now".

## Summary

- **Where:** `https://juegosdesalon.cl/labs/stack/`, in the lab (each person's key, D-281, D-284). Id
  `stack` in the usage signal.
- **For whom:** one player. **English only** (the owner's request): the page is `lang="en"`, so the
  comment form's email field is in English too. The lab card is in Spanish, like the rest of `/labs/`,
  and says "Por ahora, solo en inglés."
- **Status:** active project, to try with friends. It is the site's first reflex game: every other game
  is a puzzle, a word game or a party game. What would prove it: players who play more than one round
  in a visit.

## Cover

The title with a 🧱 that sways, the tagline ("Stack the blocks as high as you can."), the credit, and a
tower that builds itself on a small canvas (mostly perfect drops, a cut now and then, then it starts
over; still with reduced motion). Then "🧱 Play" and the three steps (after the button, U-39):

1. 👆 Tap to drop each sliding block onto the tower.
2. ✂️ Whatever hangs over the edge is cut off, so the next block is smaller. Miss the tower and the game ends.
3. 🎯 Drop a block exactly on the one below and nothing is cut. Do it 4 times in a row and the block grows back.

## How it is played

- **The heading**, like the other games': "🧱 Stack" on the left and "🏆 Best: n" on the right (once
  there is a best); it turns yellow and glows when this game beats it.
- **The tower** fills the screen between the heading and "💬 Leave a comment", drawn in isometric view on
  a transparent canvas, so it stands on the app's own night with its floating dots, and it fades into it
  at the bottom. The score (blocks placed) is big and yellow at the top. Before the first drop it says
  "Tap anywhere to drop the block".
- **The block** slides in from one side, crosses the tower, goes out to the other side and back, again
  and again: the first along one axis, the next along the other. Each block is a little faster, up to a
  top speed.
- **A tap anywhere on the tower** (or Space or Enter) drops it. What overlaps the block below stays; what
  hangs over falls away, and the next block is that smaller size.
- **A perfect drop** (within 0.035 of the block below, 3.5% of the base's side) cuts nothing; a glowing
  cyan outline opens around it with sparks in the house's colors, and it says "Perfect!", then "Perfect
  ×n" in a row, in the display font with the titles' rainbow. From the 4th in a row, each perfect grows
  the block back 0.05 on each side that was cut, up to the base, with a little confetti.
- **Missing the tower** ends the game: the whole block falls and it says "Game over".
- **The colors** are the house's neon (base.css): the blocks go from pink through orange, yellow, lime and
  cyan to purple and back, a sixth of the way each level, with a soft shine on top. The base is a column
  of the night's purple. The original's pastel colors and its own sky were dropped so it looks like the
  rest of the app (the owner's request, 2026-10-25).
- **No clock, no daily board:** every game starts the same; the score is the height.
- **Interrupted** (a call, another app, the screen locked, the page losing focus): the game pauses. The
  sliding slab freezes where it was and "⏸️ Paused · Tap to continue" covers the tower. The first tap
  back only takes the pause off and never drops; the slab goes on from the same spot at the same speed
  (`pause(g, ms)` moves its clock forward by the pause), so pausing gives no advantage. Before this, the
  tap back dropped the slab wherever time had left it.

## The result

The stamp (🏆 New best! or Game over), the score, "Your best: n" (when it is not a new best; kept on the
phone, `juegos-de-salon:stack-best`, the moment each block beats it, so a game the phone closes halfway
still keeps it), the perfect drops and the longest perfect streak, sharing (the
last 20 blocks as 🟩 perfect and 🟨 cut, ten to a line, newest on top), 🔁 Play again, back to the lab
and, after a line, the comment form.

## How it works

- `engine.js`, pure: where the sliding block is depends only on the time since it appeared
  (`offsetAt(m, t)`), never on how many frames were drawn, and `drop(g, t)` judges a drop at moment `t`.
  The page passes the tap's own `event.timeStamp`, so a 60 Hz and a 120 Hz phone play the same game, and
  a frame drawn late does not move the drop. `pause(g, ms)` freezes the slab for a pause. `perfectTime(g, t)` says when the block is next exactly
  over the tower (the cover's demo and the end-to-end script use it).
- `scene.js`: the canvas scene, shared with the splash teaser (`marketing/splash/teaser/stack.html`) so it always looks like the game (each block a box with its top and the two sides facing the viewer, the
  falling pieces with gravity, the perfect glow and its sparks, a camera that rises with the tower).
- `game.js`: the cover, the game and the result. The end-to-end hook is `window.__stack` (`S`, with `S.soltarEn(t)` to drop at a
  moment, `S.pausar()` to pause as a hidden page does, and `perfecto()`).

## To tune

The numbers at the top of `engine.js`: the swing (`RANGE`), the perfect margin (`PERFECT`), when and how
much a streak grows the block (`GROW_FROM`, `GROW`) and the speed (`SPEED_START`, `SPEED_STEP`,
`SPEED_MAX`). The score is `puntos(kinds)` in `cup/games/stack/engine.js` (D-525, see the top of this file).

## The teaser

The splash `stack-pronto` ("Llegar al cielo es el objetivo", off until the owner turns it on from the panel's
📣 Campaigns) announces the game without naming it or showing its play: the view circles a tall neon tower,
already built, and climbs it into the stars (`public/assets/splash/stack-teaser.mp4`, recorded by
`node marketing/splash/teaser.mjs stack` from `marketing/splash/teaser/stack.html`). The scene imports the game's
own `scene.js` and draws with it in the same isometric view (turned by the camera's `yaw`, which the game leaves at 0), so a change to the game's drawing reaches the
teaser on its next recording (`teaser.mjs stack`); it follows `marketing/splash/TEASERS.md` on the engine `teaser/_teaser.js` (D-505); its memory is
`marketing/splash/campaigns/stack-pronto/README.md`.

## Tests

`public/labs/stack/engine.test.mjs` (the slide, perfect drops, cuts on both axes, misses, growing back,
the same position at 60 and 120 Hz, a long perfect game) and `tools/e2e/stack/lab.mjs` (the lab card,
the cover and its moving tower, a real tap on the screen, perfect drops, a cut, the best kept as it
happens, a pause on losing focus and the tap back that only resumes, a miss, the result, Play again).

## Exceptions to the canons

- **English only** (the owner's request), where a lab prototype is usually Spanish only (D-304): the
  three languages come when it leaves the lab.
- **No 3, 2, 1 countdown:** the block waits 0.4 s at its side before it slides, and the game is the
  tower, not a clock.

## Background music (behind Babel's flag `stack`)

From the countdown until 7 s after the game is lost, when it fades out over 2 s (leaving the page sooner stops it), one of four retro tracks at random each game
(Pixabay: The Mountain, Bransboynd, Hitslab, DeepMusicEveryday), at 22% volume through a Web Audio gain so the sound effects play over it;
it follows the mute button. `public/assets/js/music.js`, hooked only in Babel's `ui.js` (the cover's «Empezar», `montar`, the end), so a
change to it tests only Babel; a La Copa day has no cover, so there it starts with the tower.
The cover has «🎵 Música: sí / 🔇 Música: no» (`#btn-musica`, in words: an icon alone looked like the sound effects' 🔊)
right of the language toggle (under it when they do not fit), both above the tower as a header (`#sk-cabecera`, the owner's call); kept on the phone in `juegos-de-salon:music`.
The end screen credits the track that played under «Continuar»: «🎵 Música: Retro Game, de The Mountain, en Pixabay»,
linked to its Pixabay page (`CREDITS` in `ui.js`; the four authors: The Mountain, Bransboynd, Hitslab, DeepMusicEveryDay).
