# 👀 Ojo de lince (lab prototype, in Games being tried)

An endless memory game for one player, in pixel art. The owner asked (in Spanish): "an incremental
memory game: pictures, ideally pixel art, of different blocks, all covered first; a couple are
revealed and you have to find where they ended up. They do operations to the board as it gets harder,
maybe they rotate it, or you have to find two pairs. Incremental until you lose, with a couple of
lives. And quick." It is our own idea and our own drawings: no credit to an original.

## Summary

- **Where:** `https://juegosdesalon.cl/labs/eagle-eye/`, in the lab (each person's key, D-281, D-284).
  Id `eagle-eye` in the usage signal. Not in `games.js`: lab only, like Números explosivos.
- **For whom:** one player. Spanish, English and Portuguese (C-3), chosen on the cover with the usual
  flags; the lab card is in Spanish like the rest of `/labs/`.
- **Status:** active project, to try with friends. What would prove it: players who play more than one
  game in a visit.

## Files

| File | What |
|---|---|
| `public/labs/eagle-eye/engine.js` | The rules, no DOM: the levels, the moves, a round, a tap, a game |
| `public/labs/eagle-eye/sprites.js` | The 18 pictures, 8×8 pixels drawn with letters, turned into SVG |
| `public/labs/eagle-eye/rules.js` | The texts, es / en / pt |
| `public/labs/eagle-eye/game.js` | The screens and the animations |
| `public/labs/eagle-eye/engine.test.mjs` | The moves, every round from 1 to 30, a game, the pictures and the texts' parity |
| `tools/e2e/eagle-eye/lab.mjs` | End to end |

## Cover

The title with a 👀 that blinks, the tagline, the language flags and a small 3×3 board that plays by
itself (two pictures show, cover, a move, and they open where they went; still with reduced motion).
Then "👀 Jugar" and the three steps (after the button, U-39), today's note and this phone's best.

## How it is played

1. **Look.** The board's tiles flip and show the round's pictures; a bar runs out the time to look.
2. **Covered.** They flip back, and the board moves in front of the player, each move named on top:
   a quarter turn right or left or half a turn (the whole board rotates), a mirror left–right or
   upside down (it squashes through flat), two rows or columns swap, or two tiles swap (the shell game).
   Rows and tiles that swap lift, glow and cross on opposite arcs so they can be followed. Every cover
   looks the same, so when an animation ends the board snaps back to rest and only the engine's map changed.
3. **Find.** "¿Dónde está? [picture]" asks for each one in turn (in a pairs round, "Encuentra los dos"
   and both must be tapped). A right tile opens with a green ring. A wrong tile opens (a decoy or
   empty), shakes, and the right one opens with a yellow ring: one ❤️ less and the same level again on
   another board. Every picture found clears the round: one point and the next level.

**The levels** (`level(n)` in the engine, endless): 3×3 up to level 3, 4×4 up to 7, then 5×5; 2
pictures, one more every two levels, up to 6; from level 4 every third level is a pairs round (2 to 4
pairs); from level 6, 1 to 3 decoys shown but never asked; moves from level 3 (1, then 2 from 6, 3 from
11, 4 from 16); the kinds unlock in order (turns, then tile swaps at 4, mirrors at 5, rows and columns
at 8); the time to look is a bit per picture shown, shorter every level down to 60 %.

**Lives:** 3. Five rounds cleared in a row without a miss give a lost one back. With no lives left the
game ends.

**Seed:** without `?seed=` the first game is today's (`day:<date>`), the same for everyone; "Jugar de
nuevo" draws a random one. A miss replays the level with the try number in the seed, so the board is
new. `?test` runs every wait four times faster (the end-to-end script).

## Result

"Fin del juego", the rounds cleared, a new best or the previous best (`juegos-de-salon:eagle-eye-best`
in `localStorage`), the pictures found, the level reached and the time; share (the solo result image),
"Jugar de nuevo", back to the lab and, after a line, the comment form.

## Exceptions to the canons

- Lab game, outside `games.js`, La Copa and Uno al día; no ranking (D-212).
- `window.__eagleEye` exposes the state (the round's answers) for the end-to-end script.
