# 👀 Memorice (lab prototype, in Games being tried)

> First built as «Ojo de lince» in `/labs/eagle-eye/`; renamed before it merged at the owner's request:
> «Memorice» is what this kind of game is called in Chile. The folder and id became `memory`. «¡Ojo de
> lince!» stays as one of the cheers after a clear.

An endless memory game for one player, in pixel art. The owner asked (in Spanish) for "an incremental
memory game: pictures, ideally pixel art, all covered first; some are revealed and you have to find
where they ended up. Incremental until you lose, with a couple of lives. And quick." It is our own
idea and our own drawings: no credit to an original.

The owner then tuned it on a standalone copy (a claude.ai artifact built from these same files):
one question per board, the prompt under a centred board, more time on the 3×3 and after a clear,
and then **no turns** (the first prototype rotated, mirrored and swapped the covered board; that was
dropped), a board that grows faster up to 6×6, trios on the big boards, a time limit to answer, and
mixed groups and asks after the first standard rounds.

## Summary

- **Where:** `https://juegosdesalon.cl/labs/memory/`, in the lab (each person's key, D-281, D-284).
  Id `memory` in the usage signal; the best is `juegos-de-salon:memory-best`. Not in `games.js`: lab only, like Números explosivos.
- **For whom:** one player. Spanish, English and Portuguese (C-3), chosen on the cover with the usual
  flags; the lab card is in Spanish like the rest of `/labs/`.
- **Status:** active project, to try with friends. What would prove it: players who play more than one
  game in a visit.

## Files

| File | What |
|---|---|
| `public/labs/memory/engine.js` | The rules, no DOM: the levels, a round, a tap, a game |
| `public/labs/memory/sprites.js` | The 45 pictures the owner picked from a board of 100 candidates (2026-11-05): Chilean favourites (flag, piscola, empanada, completo, moai, copihue…), pop and retro, food, symbols and 12 of the first set; 12×12 pixels drawn with letters, turned into SVG. No real people or logos |
| `public/labs/memory/rules.js` | The texts, es / en / pt |
| `public/labs/memory/game.js` | The screens and the animations |
| `public/labs/memory/engine.test.mjs` | The intro, every level up to 80, rounds 1–40, a game, the pictures and the texts' parity |
| `tools/e2e/memory/lab.mjs` | End to end |

## Cover

The title with a 👀 that blinks and the tagline («Mira, recuerda y encuentra.»); under them, once there
is one, this phone's best shown like a result, a yellow pill «🏆 Tu récord · 7 rondas» (the owner
asked for it up top, not under the steps); the language flags and a small 3×3 board that plays by
itself (the pictures show, cover, and the one asked opens with a green ring; still with reduced
motion). Then "👀 Jugar" and the three short steps (after the button, U-39) and today's note.

## How it is played

The heading (name, best), the lives and the round on top; the board in the middle of the screen; under
it a bar for the time left and the prompt.

1. **Look.** The tiles flip and show the round's pictures; some repeat. The bar (lime to yellow) runs
   out the time to look.
2. **Covered.** They flip back.
3. **Find.** "¿Dónde está? [picture]", "Encuentra los dos:" or "Encuentra los tres:" asks for one
   picture; every copy of it must be tapped before the bar (pink to cyan) runs out. A right tile opens
   with a green ring. A wrong tile opens (another picture, or empty) and shakes, or the time runs out
   ("⏰ ¡Se acabó el tiempo!"): the copies not found open with a yellow ring, one ❤️ less, and the same
   level again on another board. All copies found clears the round: "¡Bien!", the pictures stay open
   1.5 s, one point and the next level.

**The levels** (`level(n)` and `makeRound` in the engine, endless):

- **The intro**, the same for everyone (`INTRO`): 1. 3×3, two pictures, find one ("✌️ ¡Ronda de
  pares!" announces level 2); 2. 3×3, two pairs, find one pair; 3. 4×4, three pictures; 4. 4×4, two
  pairs and one picture, find a pair.
- **Then mixed:** the board grows fast (4×4 to level 5, 5×5 to 8, then 6×6, never bigger); the tiles
  with a picture are 2 + the level, up to half the board (18 on the 6×6); the groups are drawn at
  random, singles and pairs, and trios from the 5×5; what is asked is drawn too: a single, a pair or a
  trio, whatever the board holds.
- **Time to look** (`lookMs`, the owner's request): 4.5 s in levels 1 and 2, 4 s in level 3 and down
  evenly to 2 s at level 20, then to 1.5 s at level 25, and 50 ms less each level after that down to 0.8 s (level 39), so that
  sooner or later nobody can keep up. **Time to answer:** 4.5 s per copy at first; every level after
  the intro is 3.5 % shorter, down to 1.4 s per copy.

**Lives:** 3. Five rounds cleared in a row without a miss give a lost one back. With no lives left the
game ends.

**Seed:** without `?seed=` the first game is today's (`day:<date>`), the same for everyone; "Jugar de
nuevo" draws a random one. A miss replays the level with the try number in the seed, so the board is
new. `?test` runs every wait four times faster (the end-to-end script).

## Result

"Fin del juego", the rounds cleared, a new best or the previous best (`juegos-de-salon:memory-best`
in `localStorage`), the pictures found, the level reached and the time; share (the solo result image),
"Jugar de nuevo", back to the lab and, after a line, the comment form.

## Exceptions to the canons

- Lab game, outside `games.js`, La Copa and Uno al día; no ranking (D-212).
- `window.__memory` exposes the state (the round's answer) for the end-to-end script.
