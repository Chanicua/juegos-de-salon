# 🎸 Pulso (lab prototype, in Active projects)

A one-finger rhythm game in the spirit of the guitar rhythm games, played with the thumb, to
well-known classics played as rock. The owner's requests (2026-11-04):

- Taps only, never swipes ("it doesn't work well any other way").
- Notes that are held for a while and released at the exact moment.
- Rhythms that change like music does, and a song that gets harder as it goes.
- One player collecting as many points as possible, one level.
- After trying the first version, with music the game generated: "what's key is that it is known
  music, so people feel more motivated", without copyright problems. The songs are made locally and
  played as media, "rock with punch, that gets incrementally harder", and the pads have more effects.

## Summary

- **Where:** `https://juegosdesalon.cl/labs/pulse/`, in the lab (behind each person's key, D-281,
  D-284). Id `pulso` in the usage signal.
- **For whom:** one player. Spanish only, like the other lab prototypes (D-191).
- **Songs:** four, easy to very hard, each with its own record on the phone. `?song=<id>` (the link a
  result shares) marks that song on the cover.
- **Status:** prototype in the lab. Next to try with the owner: whether the windows feel right on a
  real phone, how the band sounds, which songs to add.

## The music, and why it can be used

The melodies are by composers who died long ago (Beethoven 1827, Grieg 1907, Mozart 1791). In Chile
a work enters the public domain 70 years after its author's death (Ley 17.336), so the melodies are
free. Nothing comes from a recording: the arrangements are ours and the band is synthesized. Left out
on purpose, though they sound old: "Cumpleaños feliz", "Cielito lindo" (its author died in 1957) and
"La danza del sable" (Khachaturian, 1978).

| id | Song | By | ★ | Parts | Tempo |
|---|---|---|---|---|---|
| `alegria` | Himno de la alegría | Beethoven | 1 | 6 | 96 → 148 |
| `quinta` | La Quinta (the Fifth Symphony's opening) | Beethoven | 2 | 6 | 100 → 158 |
| `montana` | En la gruta del rey de la montaña | Grieg | 3 | 8 | 84 → 176, it speeds up like the original |
| `turca` | Marcha turca | Mozart | 4 | 6 | 80 → 120, in sixteenths |

**The score** is `songs.js`: each song has phrases (bars like `B3:8 C#4:8 F#4:4`, each with its
chord) and parts that play phrases at a tempo, with a level and a drum style. **The audio** is two
files per song in `songs/`: `<id>-banda.mp3` (drums, bass, two rhythm guitars; stereo, 128 kbps) and
`<id>-guitarra.mp3` (the lead guitar that plays the melody; mono, 80 kbps). About 3 MB per song.

**How they are made:** `node tools/generators/pulse/render.mjs [id…]` plays each song's events in a
headless Chromium (`tools/generators/pulse/band.js`, an OfflineAudioContext, in 8-second pieces
because an offline context slows down as its notes pile up), scales both parts together, and ffmpeg
compresses, brings them up (the band around −12 LUFS, the two together around −10) and encodes them.
Every run adds a few MB to git's history (D-494): run it only when a song or the band changes, and
keep each file under 5 MB.

**The band:** two distorted rhythm guitars panned left and right (power chords, palm-muted chugs),
bass with a sub, kick with a click, snare in a room, hats and crashes. The lead guitar has a slight
bend into each note, vibrato on the long ones, delay and reverb. Four drum styles: `suave` (half
time), `rock`, `duro` (driving eighths, sixteenth hats) and `galope` (the metal gallop). The last bar
of each part is a snare fill, and each part starts with a crash.

## Cover

The title with a 🎸 that rocks, the tagline, a small stage where a part of a song plays itself (the
notes fall, the pads light up and throw sparks, a hold is held to its end), **Elige una canción** with
the four songs (title, composer, ★ difficulty, the record or "Sin tocar aún"), the three steps,
"better with sound" and 🎧 Ajustar el ritmo (with the current tuning, if any). Tapping a song loads
its audio ("Afinando las guitarras…") and starts it.

## How it is played

- **Three pads in an arc** at the bottom, where the thumb reaches: the middle one a bit higher. The
  whole column of a lane counts as its pad, so a tap a bit off still lands.
- **Notes fall** down the three lanes and reach their pad on the beat (they are in view 1.45 s,
  `ANTICIPO`). Faint dashes falling with them mark the beats, brighter on the bar.
- **The notes are the melody:** low notes go left, high ones right (by pitch, within each phrase), so
  a repeated note is the same pad. The lead guitar file plays the whole melody; a miss (or a tap on
  nothing, or a bad release) quiets it until the next hit.
- **Which notes:** each part has a level. Level 0 plays the notes on the beat, level 1 also the
  eighths, level 2 all of them. Long notes are always played, as holds. In Himno de la alegría the
  last three parts play each quarter as two eighths (`doble`).
- **Tap notes:** a tap when one reaches its pad: ¡Perfecto! (±50 ms), ¡Bien! (±95 ms), Casi
  (±140 ms). Later than that it is a Fallo and keeps falling, grey.
- **Hold notes** have a tail ending in a white ring. They are pressed when the head arrives, held
  (the tail glows and shortens into the pad, sparks fly off it), and released when the ring reaches
  the pad, which lights up when it is time (±70/120/170 ms). Letting go before is "Muy pronto";
  holding past it, "Muy tarde": both break the run. Each beat held pays 20.
- **One finger:** the first finger plays and any other is ignored until it lifts.
- **Points:** 100/70/40 per judgment (taps and releases), times the multiplier: ×2 at 10 in a row,
  ×3 at 20, ×4 at 30.
- **Energy:** starts at 60 of 100. A perfect adds 2, a good 1, a miss takes 9, a bad release 6. At 0
  the power goes out ("🔌 ¡Se cortó la luz!"): the tape slows down and stops, the stage flickers dark
  and the game ends. Playing the whole song is "🤘 ¡Ovación!".
- **⏸** pauses (also when the phone leaves the page); 🏳️ Terminar asks for a second tap.
- **The result:** the song, the score, the card (a square per part by how well it was played, ⬛ not
  reached), the record, precision, best run, the counts, how far it got, share, 🔁 Otra vez,
  🎸 Otra canción, back to the lab and the comment form.

## The effects

- **A hit:** sparks of the lane's color fly off the pad (more, and some white, for a perfect), the
  pad bounces and its lane flashes; a perfect's word pops bigger.
- **A miss:** the pad shakes and goes grey a moment, and a dead string sounds.
- **A hold:** a wider glow flickers around the tail and sparks keep flying while it is held.
- **A long run:** at ×3 the pads glow; at ×4 they burn, the screen's edges burn, the score glows
  and "🔥 ¡En llamas!" pops up.
- **The beat:** a glow from the floor pulses on every beat, stronger on the bar.
- **A new part:** "Parte 3" big in the middle, with its tempo ("120 pulsos por minuto").
- With `prefers-reduced-motion`: no sparks, shakes, fire or pulse.

## Timing

The game's clock is the audio clock (`getOutputTimestamp` when the browser has it), minus the output
latency the browser reports and the player's tuning, so what is judged is what is heard. The two
files start together, sample-accurately, as AudioBufferSources. Some decoders pad an mp3's start, so
the first sound of each decoded file (the band's first beat at `PREROLL`, 0.5 s; the lead's first
note) tells the game where 0 is (`desfase` in `music.js`). A limiter on the output catches the band
and the lead together going over 0 dB. A tap's time is its event's timestamp.

**🎧 Ajustar el ritmo** plays 16 clicks; the median of the taps' lag (from the third on) is kept as
the tuning (`juegos-de-salon:pulso-ajuste`, from −150 to +350 ms), for Bluetooth headphones. Without
running audio (a browser that keeps it suspended, the e2e scripts) the game plays silent on the
page's clock. The site's 🔊 mutes the music without stopping the clock.

## How it works

- `songs.js`: the scores (`CANCIONES`), `compas()` and `midi()` for the notation.
- `engine.js`: the song from its score (`cancion(def)`: bars, notes, and the band's and lead's events),
  the game (`nuevaPartida`, `tocar`, `soltar`, `avanzar`), `juzgar`, `precision`, `maximo`, `tarjeta`,
  and the constants (windows, points, energy, gaps). Pure: no DOM, no audio. The one-finger rules:
  never two notes at once, room for the thumb (130 ms on the same pad, 160 to the next one, 210 to
  the far one, `HUECO`), a hold leaves room for what follows, a hold shorter than 0.32 s is a tap;
  a melody note too quick for them is not played (the guitar still plays it).
- `music.js`: loads and plays a song's two files, quiets the lead on a miss, the dead string, the
  power cut and the tuning's clicks.
- `game.js`: the cover, the stage and its effects (a canvas over the whole page, nothing scrolls and
  a long press selects nothing), the tuning and the result. Records are
  `juegos-de-salon:pulso-record-<id>`. `window.__pulso.auto = true` makes it play itself, every note
  perfect (the e2e scripts).
- `engine.test.mjs` checks every score adds up, each song (the same every time, length, faster part by
  part, the one-finger rules, harder at the end, the notes are the melody, all three pads used, its
  two files exist under 5 MB), the judging, the multiplier, holds (early, on time, late), a perfect
  game of every song and the power cut. `tools/e2e/pulse/lab.mjs` plays it in the browser.

## Exceptions to the canons

- Spanish only (C-3): a lab prototype, as D-191 allows.
- No 3, 2, 1 countdown (D-105): the song counts itself in, with the sticks and the 1-2-3-4 on screen,
  because a countdown out of time with the music would throw the rhythm off.
- The stage covers the whole page while playing, without the top bar: the pause button is in its
  score bar.
- Audio files in git (about 12 MB for the four songs, each file under 5 MB, D-494): the game needs
  them to play, and they change only when a song does.
