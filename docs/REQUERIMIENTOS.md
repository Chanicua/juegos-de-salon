# Requerimientos

Documento vivo. Cada requerimiento tiene un ID para poder referenciarlo desde decisiones, commits e issues.

Los IDs no se reusan: un requerimiento que cambia conserva su ID y su texto se actualiza citando la decisión que lo cambió (D-213).

## Plataforma (RP)

| ID | Requerimiento | Estado |
|---|---|---|
| RP-01 | App web que funcione en celulares y tablets (mobile-first) y también en navegador de escritorio. | ✅ v0.1 |
| RP-02 | Menú principal para escoger el juego a jugar. | ✅ v0.1 |
| RP-03 | Varios juegos disponibles desde la misma dirección; cada juego con su propia URL, que es su carpeta en inglés (`/hangman/`), no su id (`ahorcado`); las rutas viejas en español son páginas puente (D-192). | ✅ v0.1 (estructura); carpetas en inglés en v0.91.0 |
| RP-04 | Cada juego presenta su dinámica (reglas, materiales) antes de empezar. | ✅ v0.1 |
| RP-05 | Cada juego prepara a los jugadores (ingreso de nombres y datos necesarios). | ✅ v0.1 |
| RP-06 | El celular/tablet es la interfaz principal: guía turnos, situaciones y decisiones. | ✅ v0.1 |
| RP-07 | Tono distendido y festivo: colores vivos, animaciones, tipografías expresivas. | ✅ v0.1 |
| RP-08 | Publicado en una URL pública para probar desde el celular (GitHub Pages, cuenta ellokojavi). | ✅ v0.1 |
| RP-09 | Documentar requerimientos y decisiones dentro del proyecto. | ✅ v0.1 |
| RP-10 | Sin dependencias ni paso de build: abrir el repo publicado debe bastar. | ✅ v0.1 |
| RP-11 | Instalable como “app” en la pantalla de inicio (manifest PWA básico). | ✅ v0.1; con service worker e íconos PNG desde v0.105.0 (D-221), y con el nombre en el idioma del jugador desde v0.106.1 (D-222). Un globo en la portada invita a agregarla, para todos desde v0.121.0 (D-232) |
| RP-12 | Idioma español chileno, informal. | ✅ v0.1 |
| RP-13 | Funcionar sin conexión (service worker). | ⏳ pendiente |
| RP-14 | Sonidos en las acciones clave, con botón para silenciar. | ✅ v0.3 |
| RP-15 | Jugar en español o inglés, con un toggle al inicio (menú) que aplica a todos los juegos. Después se sumaron el portugués (RP-25, D-48) y el alemán (RP-35, D-197). | ✅ v0.2 |
| RP-16 | Toda partida en curso se puede retomar, en todos los juegos y en todos los modos (canon C-6). | ✅ v0.7 |
| RP-17 | Cánones de construcción documentados y revisados antes de crear o cambiar un juego. | ✅ v0.7 |
| RP-18 | Quien entra por un enlace de sala solo puede unirse a esa sala: no se le ofrece crear otra ni configurar la partida. | ✅ v0.10.1 |
| RP-19 | Las salas vencidas se borran solas de Firebase, sin servidor ni tarea manual. | ✅ v0.17 |
| RP-20 | Cuando no se puede abrir una sala, el jugador ve por qué en su idioma y con una salida, sin que se le culpe a su internet. | ✅ v0.18 |
| RP-21 | Un celular no puede abrir salas sin parar: hay un tope por dispositivo que protege la cuota del plan gratuito. | ✅ v0.19 |
| RP-22 | Vigilar el uso de la cuota de Firebase (conexiones simultáneas y descarga mensual) con una alerta antes de llegar al techo. | 🟡 conexiones con alerta (consola, 2026-10-12); descarga ⏳ |
| RP-23 | Un panel privado del dueño (`/panel/`), con entrada por Google, que muestra salas vivas, celulares conectados, partidas por juego y modo, jugadores por partida, origen (zona horaria), idioma y hora del día (D-44). | ✅ v0.20 |
| RP-24 | Los juegos registran señales de uso para el panel del dueño: de las salas lo que ya viaja a Firebase y, desde v0.33.6, el país del celular y quién ganó (D-79); de los modos sin red, desde v0.99.2, quién juega (el nombre que ya usa en la app) y cómo terminó (D-210). Nunca IP, secretos ni chat. | ✅ v0.20 |
| RP-25 | Jugar en portugués (de Brasil): toda la experiencia —menú, juegos, salas, chat, errores, cartas— en el idioma elegido, con las mismas claves que español e inglés (D-48). | ✅ v0.22 |
| RP-26 | Se registra el idioma elegido en el juego, aparte del idioma del navegador: uno dice de dónde es la persona y el otro en cuál prefiere jugar (D-46). | ✅ v0.21.2 |
| RP-27 | Una sala que se cancela se cierra en el acto: quien se va a propósito se despide, la sala queda sin nadie y se borra sola, y el panel deja de mostrarla viva. Cerrar la pestaña no cancela nada: esa partida se puede retomar (D-50). | ✅ v0.25 |
| RP-28 | El idioma puede venir en el link (`?lang=`, y las puertas `/en/`, `/pt/` y `/de/`, esta desde D-197) y viaja pegado a la invitación de una sala, para que quien la reciba abra la app en el idioma en que se la mandaron (D-74). | ✅ v0.33 |
| RP-29 | El panel muestra la **bitácora de salas jugadas** del rango elegido (7 o 30 días), paginada: día y hora, jugadores con la bandera de su país, juego y ganador. Las pruebas y las salas donde nunca entró nadie más quedan fuera por defecto (D-79). | ✅ v0.33.6 |
| RP-30 | El panel filtra todo —cifras, barras y bitácora— con seis rangos: 7, 30, 60 y 90 días, 1 año y lo que va del año. Se baja de la base solo lo que el rango pide (D-80). | ✅ v0.33.7 |
| RP-31 | El panel muestra en vivo las partidas sin red que se están jugando (contra el celular, un celular, solo), con juego, modo, cuántos juegan y país (D-140); desde v0.99.2, también quién juega y cómo terminó (D-210, RP-40). | ✅ v0.64.7 |
| RP-32 | La portada ofrece los juegos de La Copa sueltos, de un jugador y sin copa: Conexiones, Toque y Fama: Palabra, ¿En qué año?, Reinas, Tango, Zip, Desenredo (D-190) y ¿Dónde queda? (D-174); since D-332 also Rutas rotas, Loteo and Pintaminas, and since D-421 Agentes in Conexiones' place (Conexiones went to the lab's La Bodega). Se juegan en el idioma de quien juega, con contenido propio de cada idioma (D-170); antes la tarjeta avisaba que se jugaban en español (D-142). | ✅ v0.65 |
| RP-33 | La portada se filtra por tipo de juego; el filtro queda en la URL, en inglés (`?type=logic`, D-214), dice cuántos juegos se ven y se quita con un toque (D-142, D-149); al bajar, los filtros quedan pegados arriba (D-196). | ✅ v0.93 |
| RP-34 | Las explicaciones de todos los juegos (reglas, ayudas, modos, antesalas, Administrar y las frases del menú) son cortas: cada regla se dice una vez por pantalla, con frases completas, y una palabra por concepto: tachar, el celular, jugador, administrador, vidas, sorbos (D-177, U-5, U-8). | ✅ v0.84.0 |
| RP-35 | Jugar en alemán: toda la experiencia en el idioma elegido, con las mismas claves que los otros tres, primero solo en el laboratorio (`/labs/de/`), con un botón para que quienes lo prueban comenten (D-191). Salió del laboratorio y se ofrece a todos, con su puerta `/de/` (D-197); el glosario está en [ALEMAN.md](ALEMAN.md). | ✅ v0.94.0 |
| RP-36 | El panel se navega por secciones (Ahora, La Copa, Juegos, Audiencia) con una ficha por copa, juego y sala: la tabla, la grilla jugador × día y la historia de una copa; los modos, las salas y las partidas sin red de un juego. Cada cifra abre la lista que la suma, cada nombre lleva la bandera de su país, la vista queda en la URL y las horas son del Pacífico (D-207). | ✅ v0.99.0 |
| RP-37 | El panel muestra el tráfico del sitio aunque nadie juegue: visitas, páginas vistas, de dónde llegan (solo el dominio), por qué link, si es primera vez, aparato, país y cuántas visitas llegan a jugar, por página de entrada. Los links que comparte la app llevan su marca, porque WhatsApp no dice de dónde viene nadie (D-208). | ✅ v0.99.0 |
| RP-38 | El panel separa por entorno también las salas vivas, que viven en un `rooms/` común a todos: las de otro entorno no se cuentan y se nombran debajo de la lista, para que ninguna desaparezca en silencio (D-45). Hasta D-213 se anotaba como RP-25, que repetía un ID. | ✅ v0.21.1 |
| RP-39 | Cada nombre de jugador que muestra el panel lleva la bandera de su país, si se conoce: fichas, "va primero", retirados e historia de una copa. Quien se inscribió en una copa antes de que se guardara el país lo anota solo al volver a abrirla (D-209). | ✅ v0.99.1 |
| RP-40 | Las partidas sin red (contra el celular, un celular, solo) mandan al panel quién juega —los nombres que la partida ya tiene o el último que la persona escribió en la app, nunca uno pedido para esto— y cómo terminó: quién ganó, empate o el puntaje jugando solo. El panel las lista en Juegos y en la ficha de cada juego (D-210, que cambia D-44 para estos modos). | ✅ v0.99.2 |
| RP-41 | Cada copa, sala y partida sin red dice en qué idioma se jugó (el elegido en la app, por jugador en una sala), con una etiqueta en el panel y un desglose por idioma en La Copa y en la ficha de cada juego (D-211). | ✅ v0.99.3 |
| RP-42 | Rankings con identidad sin cuenta: nombre y PIN de 4 dígitos, opcionales y válidos en cualquier celular. Récord por juego de la semana y de siempre, amigos de La Copa, la pestaña "Copa", Todoterreno y medallero de campeones de La Copa, en la antesala de cada juego, en la portada de La Copa y en `/records/`. Parte en el laboratorio (D-212). | ✅ v0.100.0 (en el laboratorio); para todos desde v0.102.0 |
| RP-43 | Cada juego tiene su ranking: los de grupo, sus victorias (semana, siempre y amigos) en su intro; Toque y Fama solo y Línea Relámpago (por temática), su récord de 0 a 100 en su antesala. Todo también en `/records/` (D-215). | ✅ v0.101.0 (en el laboratorio); para todos desde v0.102.0 |
| RP-44 | **Uno al día**: un juego por día, el mismo desafío para todos, que sale de la fecha y cambia a la medianoche de cada jugador, con el dado de Juego al azar. Racha con comodines, calendario y progreso por juego, en el celular y, con jugador, en Firebase; ranking del día, de la semana y de rachas; invitar a un amigo; avisos que pide el jugador a la hora que elige. Diseño en [UNO-AL-DIA.md](UNO-AL-DIA.md) (D-230). | ✅ v0.121.0, para todos (el n.° 1 es el 6 de octubre de 2026). Se construyó en el laboratorio: el núcleo (los 7 solitarios, racha, calendario y `/today/`, en el celular) desde v0.115.0; El Ahorcado, Batalla Naval y Dudo con la semilla del día y su puntaje de 0 a 100 desde v0.116.0; jugador, rankings, comodines e invitaciones desde v0.117.0; los avisos que pide el jugador, el globo del ícono y el calendario desde v0.118.0; sus cifras en el panel desde v0.119.0; sin revancha, un solo ranking, "⏰ Agregar recordatorio" y la actividad en el panel desde v0.120.0; sin ese recordatorio cuando los avisos están activos desde v0.120.1; el recordatorio es el aviso diario y el del calendario se sacó en v0.120.2 |
| RP-45 | Marcar juegos como favoritos en la portada con una ⭐ en cada tarjeta, y una ficha "⭐ Favoritos" que deja ver solo esos. Se guardan en el navegador, sin cuenta (D-238, #233). | ✅ v0.122.0 |
| RP-46 | El panel muestra lo que le falla a quien juega: cargas que no arrancaron, errores sin atrapar juntados por qué son (página, navegador, versión, desde cuándo) y cuánto tarda cada página en poder jugar, con un aviso en la navegación si hoy o ayer alguna página no arrancó. Lo anota un script que carga antes que los módulos, así que avisa también cuando son ellos los que fallan. Sin IP, sin dirección completa y del navegador solo familia y versión (D-251). | ✅ v0.132.0 |
| RP-47 | El botón de compartir de la portada muestra el video promocional y deja elegir entre invitar a jugar (el mensaje de la app con su tarjeta) o compartir el video, con su link de YouTube (D-253, PR #263). Solo en español, el idioma del video; en los demás, compartir directo como antes (D-254). Since D-410 it opens in every language, with the Spanish and English Shorts in tabs. | ✅ v0.133.0, v0.133.1 |
| RP-48 | **El caso**, un misterio de deducción al estilo de *Clues by Sam*, para probar con amigos en el laboratorio (`/labs/case/`), solo en español: veinte sospechosos, pistas que siempre dicen la verdad y nunca hay que adivinar; un caso del día y casos con código, y el resultado se comparte. Si engancha, pasa a La Copa con los cuatro idiomas (D-256, [docs/games/case.md](games/case.md)). | ✅ v0.136.0 (en el laboratorio) |
| RP-49 | **El caso como juego de La Copa**, en los cuatro idiomas, con portada animada en la antesala, sesión de prueba y desglose del puntaje; se juega suelto en `/case/` y en la práctica del laboratorio, sin entrar todavía al pozo de una copa (D-257). | ✅ v0.138.0 (en el laboratorio) |
| RP-50 | Sumar El caso al pozo de La Copa (`POZO`) y sacarlo del laboratorio, cuando el dueño lo apruebe. | ❌ no prosperó: El caso pasó a La Bodega del laboratorio en v0.154.0 (D-280) |
| RP-51 | **Acertijos con truco**, al estilo de *Brain Test*, para probar con amigos en el laboratorio (`/labs/riddles/`): cinco acertijos en los que la respuesta obvia no es la buena, cada uno con su gesto (tocar, elegir, arrastrar), pista, narrador burlón y comentario, en los cuatro idiomas. Si gusta, un "acertijo del día" para Uno al día o La Copa (D-269). | ❌ se sacó en v0.146.1: el dueño lo probó y no le gustó |
| RP-52 | **La clave**, un prototipo del laboratorio (`/labs/code/`) para probar con amigos: una base y 4 cartas transparentes reparten los trazos de un código de 5 cifras; hay que ponerlas todas, girar y voltear cada una hasta que formen las cifras, y escribir el código en el teclado. En español también hay **Palabra**: una palabra de 5 letras de catorce segmentos, con cartas de dos caras. Empezó con dos figuras; el dueño pidió más cartas, sacó el modo de 8, pidió marcar los trazos encima de otros y sumó Palabra cuando el de cifras se volvió mecánico; en los cuatro idiomas (D-270, [docs/games/code.md](games/code.md)). | ✅ v0.147.0 (en el laboratorio) |
| RP-53 | Que los rankings se llenen: al terminar una partida sin haber entrado, un bloque a la vista ofrece entrar con nombre y PIN para que esa partida (o la victoria) cuente; la portada de Toque y Fama, Generala y Ahorcado muestra primero los mejores puntajes jugando solo; Ahorcado solo tiene su tabla de 0 a 100, también en `/records/` (D-274). | ✅ v0.150.0 |
| RP-54 | El laboratorio ordenado y cerrado: `/labs/` en dos grupos, **Proyectos activos** y **La Bodega** (los que no prosperaron, que se siguen jugando; D-280), y con puerta: sin la llave del link del dueño ninguna página de `/labs/` se muestra, y nada del laboratorio se indexa ni lo enlaza el README (D-281). Desde D-284, una llave por persona. | ✅ v0.154.0 |
| RP-55 | **Agentes**, un *Codenames* mini para uno solo, en Proyectos activos del laboratorio (`/labs/agents/`), solo en español: el juego da tres pistas con su número y el jugador encuentra a sus 9 agentes entre 12 palabras, sin tocar las neutrales ni al asesino; puntaje de 0 a 100, el tablero del día y tableros con código, y el crédito a Codenames con el link a su página. Si gusta, pasa a La Copa en los cuatro idiomas (D-286, [docs/games/agents.md](games/agents.md)). Desde v0.159.0 el tablero es más difícil: cuatro pistas (una de 2), 11 agentes entre 15 palabras y trampas que se parecen a alguna pista (D-287). Desde v0.160.0 la portada cuenta que cada palabra es el nombre en clave de un espía, y hay 100 pistas que el tablero del día recorre sin repetir una antes de 15 días (D-288). Since D-421 it is out of the lab, in Conexiones' place (RP-69). | ✅ v0.157.0 (en el laboratorio); for everyone with RP-69 |
| RP-56 | **Pintaminas**, un Buscaminas de colores para uno solo, en Proyectos activos del laboratorio (`/labs/paint-mines/`), solo en español: en una grilla de 7×7 cada número dice cuántas de sus 8 vecinas son de su mismo color; se pinta con el pincel elegido, nunca hay que adivinar, y al terminar aparece un dibujo. Puntaje de 0 a 100 (−15 por error), el tablero del día y tableros con código, y el crédito a ColorSweeper con el link a su página. Si gusta, pasa a La Copa (D-289, [docs/games/paint-mines.md](games/paint-mines.md)). Desde v0.161.1 los pinceles son «Pinta {color}» (un color al azar por tablero) y «No pinta», y los dibujos son irregulares, para que no se adivinen por espejo (D-290). Desde v0.162.0 hay un modo difícil de dos colores, con tres pinceles, que se enciende con un interruptor eléctrico en la portada y paga ×1.5 (D-291). Desde v0.163.0, «💡 Ayuda (−10)» marca una casilla que se puede deducir y los números que lo explican, sin decir su color (D-292). Desde v0.168.3 cada dibujo se pinta con sus colores de verdad, ya no al azar (D-298). | ✅ v0.161.0 (en el laboratorio) |
| RP-57 | **Rutas**, un prototipo para uno solo en Proyectos activos del laboratorio (`/labs/routes/`), inspirado en *Junction Nine*, solo en español: nueve piezas de un plano de metro en 3×3; se arrastra para marcar un rectángulo y, al soltar, gira media vuelta, hasta unir todas las líneas, en cinco etapas cada vez más difíciles. El juego dice el mínimo de giros de cada etapa; la partida tiene 7 minutos y un botón para rendirse, y el puntaje va por capas: 17 por etapa completada, más hasta 10 por rapidez (solo completando las cinco) y hasta 5 por giros, así que completar más siempre gana (reiniciar es gratis en puntos); el tablero del día y tableros con código, y el crédito a Junction Nine con el link a su página (D-293, D-294, D-295, [docs/games/routes.md](games/routes.md)). | ✅ v0.164.0 (en el laboratorio); reloj, rendirse y puntaje por capas en v0.165.0 |
| RP-58 | **Números explosivos**, un prototipo para uno solo en Proyectos activos del laboratorio (`/labs/exploding-numbers/`), inspirado en *Number Match*, solo en español: en una grilla de 9 columnas se hacen estallar de a pares dos números iguales o que suman 10, si están juntos en línea (de lado, de arriba abajo, en diagonal o del final de una fila al comienzo de la siguiente); una fila estallada entera se va, y sin pares ➕ copia abajo los que quedan (3 veces por partida). Cada par estalla con explosiones, una fila entera explota y al limpiar el tablero explota todo. Puntaje sobre 100 (70 por limpiarlo, 10 por cada ➕ sin usar, −10 por ayuda), el tablero del día con salida segura, tableros con código, rendirse y el crédito a Number Match con el link a su página (D-297, [docs/games/exploding-numbers.md](games/exploding-numbers.md)). | ✅ v0.168.0 (en el laboratorio) |
| RP-59 | **Loteo**, un prototipo para uno solo en Proyectos activos del laboratorio (`/labs/plots/`), inspirado en *Shikaku* (Nikoli), solo en español: dividir la grilla en rectángulos, cada uno con un solo número que es su área, arrastrando de una esquina a otra (tocar borra). Cinco tableros de solución única contra el reloj, dos para calentar (5×5 y 6×6) y tres difíciles (7×7, 7×7 y 8×8: lotes más grandes, ninguno a la vista de entrada, más pasos de deducción), todos deducibles sin adivinar y con los números repartidos lejos entre sí; el de hoy el mismo para todos, puntaje sobre 100 (12 por tablero, hasta 40 por rapidez, −10 por ayuda), ↩ Deshacer, 🧹 Borrar (dos toques) y 🏳️ Rendirse en una fila, la 💡 ayuda aparte, una demo que se juega sola y el crédito a Shikaku con su link (D-310, [docs/games/plots.md](games/plots.md)). Desde v0.170.0, un selector en la portada cambia al modo ⚡💧 Servicios: lotes todos del mismo tamaño, cada uno con exactamente un ⚡ y un 💧, en cinco tableros de 6×6 en lotes de 3 a 8×8 en lotes de 8; el celular recuerda el modo y el link lo lleva (`?mode=utilities`) (D-311). Desde v0.170.2 sus tres difíciles (6×6 de 6 y dos 8×8 de 8) no muestran ningún lote de entrada y un aviso dice cómo pensarlos (D-312). | ✅ v0.169.0 (en el laboratorio); modo Servicios en v0.170.0 |
| RP-60 | **Rutas rotas, Loteo and Pintaminas leave the lab**: on the home page (`/routes/`, `/plots/`, `/paint-mines/`) in the four languages and in the pool of La Copa, outside the Gran Final (D-332). | ✅ v0.172.0 |
| RP-61 | **Variants**: standalone, the player picks the variant in the waiting room (Pintaminas easy / hard, Loteo Numbers / Utilities); in a cup, the admin picks one per day for everyone. Every variant scores 0 to 100 (D-331). | ✅ v0.172.0 |
| RP-62 | A new game shows a "New" label on its home card for two weeks (D-333; one week since D-507). | ✅ v0.172.0 |
| RP-63 | **Uno al día with every one-player game**: Rutas rotas, Loteo, Pintaminas, Zip, Tango and ¿Dónde queda? join the daily deck (16 games) from the deck shuffled on October 23, 2026, without changing the days already set; a game with variants plays its default one, with no picker (D-334). | ✅ v0.173.0 |
| RP-64 | While a game carries its "New" label, its card goes right after La Copa on the home page; when the label goes, back to its place by popularity (D-335, dilemma #443). | ✅ v0.173.0 |
| RP-65 | **"💬 Suggestions and comments" for every player**: a quiet link after the end of every game (group, solo, one-player games, One a Day, La Copa's podium) opens a short form with an optional kind, at most once a day and resting two weeks after sending; the home page footer always has it (D-341, U-38, #463). | ✅ v0.175.0 |
| RP-66 | **The home page's order updates every week**, by games finished in the last four weeks (offline, rooms and La Copa days), recounted by the processes round; a **🔥 "Popular" label** on the top three, tried first in the lab with the home page's experiments bar (`/labs/home/`); the lab in three groups: games, improvements and La Bodega (D-361); **✨ Nuevos and 🔥 Populares filter chips** above the types, in the lab with `?picks` (D-362), joined there by ⭐ Favoritos, and the app's name on the floating menu with `?brand` (D-364). | ✅ order; ✅ label, filters and the name on the floating menu for everyone since D-369 |
| RP-67 | **Pips**, a solo prototype in the lab's Juegos en prueba (`/labs/pips/`), inspired by Pips (The New York Times Games), Spanish only: lay every domino so each colored zone keeps its rule (sum, equal, different, less, more); three boards from easy to hard against the clock, each with exactly one answer, today's the same for everyone; out of 100 (20 a board, up to 40 for speed, −10 a help); the credit with its link (D-381, [docs/games/pips.md](games/pips.md)). | ✅ in the lab |
| RP-68 | **Cuarto Rey goes to the lab's 📦 La Bodega**: off the home page, 🎲 Juego al azar, the 🔎 search, the home page order and the home page's link cards; still playable at `/labs/fourth-king/` with a lab key, folded in La Bodega, and the old links `/fourth-king/` and `/cuarto-rey/` lead there (D-420, [docs/games/fourth-king.md](games/fourth-king.md)). | ✅ |
| RP-69 | **Agentes in Conexiones' place** (the owner's request): Agentes leaves the lab with the ✨ New label, at `/agents/`, in the four languages with a deck of clues each; it takes Conexiones' place in La Copa's pool and demo calendars and in Uno al día (from 2026-10-24), and the Gran Final plays it whole. Conexiones goes to the lab's La Bodega: off the home page, the search and new cups, still open at `/connections/`, and the cups created before keep playing it (D-421, [docs/games/agents.md](games/agents.md)). | ✅ D-421 (the version is set on merge, D-300) |
| RP-70 | **Stack**, a solo prototype in the lab's Juegos en prueba (`/labs/stack/`), inspired by Stack (Ketchapp), English only (the owner's request): tap to drop each sliding block onto the tower, the overhang is cut off, a perfect drop cuts nothing, a miss ends the game, and the score is the height (D-445, [docs/games/stack.md](games/stack.md)). | ✅ D-445 (the version is set on merge, D-300) |
| RP-71 | **Stick Ninja**, a solo prototype in the lab's Juegos en prueba (`/labs/stick/`), inspired by Stick Hero (Ketchapp), English only: hold to stretch the stick and let go to bridge the gap; a tip on the pillar's flag is a perfect worth more for each one in a row, with an emerging pulse; achievements as banners; from the 10th pillar on, some pillars slide, slowly at first and faster later (no stars, the owner's request); the day's course, the same for everyone, and today's runs on the phone to compare (D-446, [docs/games/stick.md](games/stick.md)). | ✅ D-446 (the version is set on merge, D-300) |
| RP-72 | **☕ Buy me a coffee**, in the lab (the owner's request): voluntary support through a Stripe Payment Link, with no backend; always in the home page footer beside 💬 Suggestions and comments (both as buttons in a two-column grid: outlined at first, frosted in the footer's violet sunset since PR `footer-sunset-public`, U-38), and at the end of a finished game from the device's 6th game, at most once a week and never on the same ending as the inbox; a support page (`/labs/support/`) that says the games stay free; each step counted in the day's stats. Until the payment link is set, the button simulates the payment (D-448). | ✅ D-448 (in the lab); for every player since PR `support-public`, its counters in the panel's 📣 Campaigns since PR `panel-support-campaign` (the version is set on merge, D-300) |
| RP-73 | **☕ Invítame a un café as a card over the page** (the owner's request): instead of a page of its own, the footer link and the end-of-game link open a sheet from the bottom like the share sheet, short enough to fit a small phone; Stripe returns to the home page with `?support=thanks`, which opens the thank-you as the same sheet (D-449). | ✅ D-449; for every player since PR `support-public`, its counters in the panel's 📣 Campaigns since PR `panel-support-campaign` (the version is set on merge, D-300) |
| RP-74 | **Rankings: Tus partidas folded** (a player's email, #783): on the Rankings page the list of how many times you played each game comes closed, with the total in its title, so the rankings show first. Tried in the lab (D-409), then for every player; its lab card is in La Bodega, marked 🚀 Lanzado. | ✅ |
| RP-75 | **Toque y Fama: one home card** (a player's email, #767): 🔤 Palabra has no card of its own on the home page; Toque y Fama's card says "the number or the word" and a 🔢 Número / 🔤 Palabra toggle on both games' pages picks one or the other, like Loteo's variants. Tried in the lab (D-409), then for every player; its lab card is in La Bodega, marked 🚀 Lanzado. | ✅ |
| RP-76 | **The 🥂 toast to support only for regulars** (the owner's request): a splash campaign can wait for players who already play here (5 or more visit days in the last four weeks, 10 or more finished games, not paid yet), so a new player never meets a request for money on a first visit; `brindis-apoyo` does (D-458). | ✅ D-458 (the campaign is still off; the version is set on merge, D-300) |
| RP-77 | **A tap outside a splash does not lose it** (the owner's request): closing a campaign window by tapping outside it, or with Escape, is forgiven once, so it comes back on a later visit; a second such close, or ✕, "Ahora no" or its links, marks it as seen. Tried in the lab first, then shipped to everyone at the owner's request (D-462). | ✅ D-462 (for everyone; the version is set on merge, D-300) |
| RP-78 | **How the splash campaigns did** (the owner's request): the panel's 📣 Campaigns shows, for the chosen range, each campaign's reach (unique phones), % tapped through, % closed, coverage of home page views, time open and one bar per day shown, so a campaign switched off and on again is not diluted; anonymous counters, a preview never counts (D-461). | ✅ D-461 (the version is set on merge, D-300) |
| RP-79 | **🔒 A privacy page** (the 2026-10-27 audit, #842): `/privacy/` in the four languages says what the games keep on the phone and in Firebase, why, for how long, who else sees it, a word for children and parents, and how to ask to see or delete data at hola@juegosdesalon.cl; linked from the home page footer and the email note of every feedback form. A reply email nobody answered is deleted after 90 days (`feedback.mjs expire`). Published for everyone, not behind the lab (D-463). | ✅ D-463 (the version is set on merge, D-300) |
| RP-80 | **Splash conversion** (the owner's request): after a campaign's Play, the game it opened counts as started and finished (once, in that tab, within 2 hours), and 📊 How they did shows % that finished a game and conversion over reach (D-466). | ✅ D-466 (the version is set on merge, D-300) |
| RP-81 | **Shinobi and Babel ready to launch by flag** (the owner's request, 2026-10-31): Stick Ninja and Stack, renamed 🥷 Shinobi and 🗼 Babel, finished as La Copa games in es, en and pt (`/shinobi/`, `/babel/`, Uno al día, La Copa; score 0–100 under D-517, uncapped since D-525 except in the Grand Final and Uno al día), crediting Ketchapp on the cover, hidden until the owner switches `flags/stick` and `flags/stack` on their /labs/ cards; the home filters gain 🎯 Pulso and Cartas/Dados becomes 🎲 Dados (D-517, [docs/games/stick.md](games/stick.md), [docs/games/stack.md](games/stack.md)). | ✅ D-517, D-525 (the version is set on merge, D-300) |
| RP-82 | **🐤 Aletazo**, a one-tap flyer in the lab's Juegos en prueba (`/labs/flap/`), in Spanish, English and Portuguese, proposed by a contributor and shaped round by round on a playable prototype: a tap lifts the bird, gravity brings it down; through hoops (+1, dead center +2), walls with one opening and past spinning spikes; a new level every 5 gates, faster and tighter; 3 lives; a simple ending ([docs/games/flap.md](games/flap.md)). | ✅ in the lab (the version is set on merge, D-300) |

## Cuarto Rey (CR)

In the lab's 📦 La Bodega since D-420, at the owner's request: off the home page, 🎲 Juego al azar and the 🔎 search, still playable at `/labs/fourth-king/` with a lab key. The requirements below still hold for the game.

| ID | Requerimiento | Estado |
|---|---|---|
| CR-01 | Entre 4 y 6 jugadores, con nombre. | ✅ |
| CR-02 | Mazo inglés de 52 cartas, sin jokers, barajado al azar. El celular reemplaza al mazo físico. | ✅ |
| CR-03 | Los jugadores sacan cartas por turnos, en orden de asiento hacia la derecha. | ✅ |
| CR-04 | Todos ven la carta que salió (pantalla grande, carta con animación de volteo). | ✅ |
| CR-05 | Regla por carta según instrucciones originales (A al K), ver [especificación](games/fourth-king.md). | ✅ |
| CR-06 | Para 2 y 3 la app nombra explícitamente al compañero de la derecha / izquierda. | ✅ |
| CR-07 | Para J y Q la app nombra a quiénes les toca tomar según el género registrado. | ✅ |
| CR-08 | Para 8 la app permite elegir a quién se regalan los 2 sorbos (repartidos o a una sola persona). | ✅ |
| CR-09 | Para 5 la app propone una penitencia al azar, con opción de pedir otra o de “arrugarse” y tomar. | ✅ |
| CR-10 | Para 4, 6, 7 y 9 la app explica el mini-juego, dice quién parte, entrega ayudas simples (temporizador, categoría, idea de “nunca nunca”) y permite marcar al perdedor. | ✅ |
| CR-11 | Contador visible de reyes (0 a 4). Al cuarto rey, quien lo sacó se toma todo el vaso y la partida termina. | ✅ |
| CR-12 | Pantalla final con el “ganador” del cuarto rey, ranking aproximado de sorbos y opción de otra ronda. | ✅ |
| CR-13 | La partida se guarda automáticamente y se puede retomar si se cierra el navegador. | ✅ |
| CR-14 | Los nombres de los jugadores se recuerdan para la próxima partida. | ✅ |
| CR-15 | La pantalla no se apaga mientras se juega (Wake Lock, donde el navegador lo permita). | ✅ |
| CR-16 | Vibración al sacar carta y en momentos clave (donde el dispositivo lo permita). | ✅ |
| CR-18 | Historial de cartas sacadas en la partida: plegado al pie de la pantalla final, con palo, quién la sacó y qué decía. | ✅ v0.27 |
| CR-19 | Transición entre turnos: tras resolver la carta, una pantalla con "¡Salud!" y quiénes toman arriba y "Pásale el celular a X" debajo, que solo avanza con la confirmación del siguiente jugador (antes eran dos pantallas, la primera avanzaba sola; una sola desde D-213). | ✅ v0.2 |
| CR-20 | La carta boca abajo ocupa la mayor parte de la pantalla (fácil de tocar); al descubrirse gira y se encoge para dejar espacio a las instrucciones. | ✅ v0.2 |
| CR-21 | Todo el contenido del juego (reglas, mini-juegos, penitencias, categorías, ideas de Nunca Nunca) disponible en español e inglés. | ✅ v0.2 |
| CR-22 | Todo el contenido del juego en portugués (Quarto Rei, Era Uma Vez, Porquinho Bochechudo, Cultura de Boteco, Eu Nunca, prendas y categorías adaptadas). | ✅ v0.22 |

## Dudo (DU) — ver [especificación](games/liars-dice.md)

| ID | Requerimiento | Estado |
|---|---|---|
| DU-01 | De 2 a 6 jugadores, cinco dados cada uno; cada jugador ve solo los suyos. | ✅ v0.28 |
| DU-02 | Apuesta de cantidad + pinta sobre el total de la mesa, con los ases de comodín. | ✅ v0.28 |
| DU-03 | La app no deja hacer una apuesta ilegal: subir es más cantidad o la misma con pinta mayor, y entrar y salir de los ases cuesta la mitad y el doble más uno. | ✅ v0.28 |
| DU-04 | Dudar destapa la mesa, cuenta la pinta más los ases y quita un dado a quien se equivocó. | ✅ v0.28 |
| DU-05 | Calzar: acertar la cantidad exacta devuelve un dado (tope cinco) y fallar quita uno. Desde la mitad de los dados de la mesa y con tres jugadores o más; en un duelo no existe (D-71). Es configurable. | ✅ v0.29 |
| DU-06 | Quien pierde el dado abre la ronda siguiente; quien se queda sin dados sale y gana el último con dados. | ✅ v0.28 |
| DU-07 | Modo un celular, de 2 a 6, con pantalla de pase entre turnos (C-9). | ✅ v0.28 |
| DU-08 | Modo contra el celular: el aparato apuesta por probabilidad y **solo** con sus propios dados. | ✅ v0.28 |
| DU-09 | Modo varios celulares con sala, chat y turnos. Los dados no viajan: se comprometen con hash y se destapan al dudar (C-10). | ✅ v0.32 |
| DU-10 | Memoria de partida en todos los modos (C-6). | ✅ v0.28 |
| DU-11 | Textos e interfaz en español, inglés y portugués, con el plural de cada pinta (C-3). | ✅ v0.28 |
| DU-12 | El destape muestra los dados de todos con los que cuentan marcados, el total y quién pierde el dado. | ✅ v0.28 |
| DU-13 | Repaso de la partida al final: qué se apostó, cuánto había y quién perdió el dado en cada ronda. | ✅ v0.28 |
| DU-14 | Ronda obligada: con un jugador en un dado, esa ronda se juega sin comodín y sin cambiar de pinta. | ⏳ pendiente |
| DU-15 | En español, las pintas se nombran como en la mesa chilena (ases, tontos, trenes, cuadras, quinas y sextas), con un interruptor para volver a los números. Encendido por defecto; inglés y portugués van por número (D-71; "quinas", D-491). | ✅ v0.29 |
| DU-16 | The owner's request: to get your dice you shake the phone, like the cup at a real table. The dice roll on screen in 3D while it shakes, on a green cloth with bigger dice, the phone vibrates with them, and they stay as they fell when the shaking stops. On by default; a button where there is no sensor (D-447). | ✅ v0.209 in the lab; for everyone with D-447 |
| DU-17 | The owner's request: a fixed time to answer, or lose a die. ⏱️ 30 seconds per turn: out of time, the player loses a die without the table being revealed. Off by default (D-447). | ✅ v0.209 in the lab; for everyone with D-447 |
| DU-18 | Issue #897: Dudo with the traditional Chilean rules. A 📜 Classic rules switch, off by default: no opening in aces, half plus one into aces, calzar in a duel and with one die, the open obligada round; Pasar and Dudar a la siciliana as variants (D-487, D-490, D-491). | ✅ in the lab first; for everyone with D-495 |

## Generala (GE) — ver [especificación](games/generala.md)

| ID | Requerimiento | Estado |
|---|---|---|
| GE-01 | Cinco dados y hasta tres tiros por turno; entre tiro y tiro se guardan los que se tocan. | ✅ |
| GE-02 | Planilla de 11 casillas (Unos a Seises, Escalera, Full, Póker, Generala y Doble generala); se anota en una libre aunque valga 0, y la app calcula los puntos (servidos, cinco más). | ✅ |
| GE-03 | La generala servida gana la partida al tiro con dos jugadores o más, como ajuste encendido por defecto (D-246). | ✅ |
| GE-04 | Modo un celular, de 2 a 6, con lo anotado y el pase al siguiente (C-9). | ✅ |
| GE-05 | Modo varios celulares con sala, chat, revancha y los dados de quien juega a la vista de todos (D-246). | ✅ |
| GE-06 | Jugar solo con récord del celular y tabla de rankings `generala_solo` (D-212). | ✅ |
| GE-07 | Memoria de partida en todos los modos, con los dados guardados a medio turno (C-6). | ✅ |
| GE-08 | Textos en español, inglés, portugués ("General") y alemán (C-3). | ✅ |
| GE-09 | Uno al día, con los dados de la semilla del día (D-247). In the deck from 2026-10-23 (D-405). | ✅ v0.189.0 |
| GE-11 | En la portada, como "Próximamente" mientras no se abre (D-248). | ✅ v0.128.0 |
| GE-12 | Abrir Generala desde la portada (`available: true`) y sumarla al mazo de Uno al día (D-405). | ✅ v0.189.0 |
| GE-10 | Victorias en los rankings (`generala_victorias`, D-215). | ✅ |

## La Copa (LIG) — ver [docs/games/cup.md](games/cup.md)

| ID | Requerimiento | Estado |
|---|---|---|
| LIG-1 | Tarjeta "La Copa" en el menú principal que lleva a `/cup/`. | ✅ v0.42 |
| LIG-2 | Crear una copa: nombre, duración, inicio hoy o mañana, nombre y PIN del admin. | ✅ v0.42 |
| LIG-3 | Código de 5 letras sin I ni O y link `/cup/?CÓDIGO`. | ✅ v0.42 |
| LIG-4 | Inscribirse con nombre (hasta 20 caracteres, no repetido) y PIN de 4 dígitos escrito dos veces. | ✅ v0.42 |
| LIG-5 | Entrar como jugador ya inscrito tocando el nombre y escribiendo el PIN; el celular recuerda la sesión. | ✅ v0.42 |
| LIG-6 | Máximo 10 jugadores por copa (lo cuida el celular; las reglas no cuentan hijos). | ✅ v0.42 |
| LIG-7 | Calendario fijo por modalidad, visible desde el primer día. | ✅ v0.42 |
| LIG-8 | Ventana de cada día: ese día más uno de gracia, impuesta por el servidor; la final sin gracia. | ✅ v0.42 |
| LIG-9 | Un solo intento por día; recargar retoma el intento (C-6). | ✅ v0.42 |
| LIG-10 | Puntos del día por posición (10-8-6-5-4-3-2-1-1-1), desempate por tiempo activo. | ✅ v0.42 |
| LIG-11 | Comodín ×2, uno por jugador, activado antes de Empezar, no en la final. | ✅ v0.42 |
| LIG-12 | La Gran Final ×2 el último día. | ✅ v0.42 |
| LIG-13 | Resultados del día ocultos hasta jugarlo o hasta que cierre, también en la tabla y el gráfico. | ✅ v0.42 |
| LIG-14 | Tabla general con flechas contra el día anterior y quién falta por jugar hoy. | ✅ v0.42 |
| LIG-15 | Resultado del día con puntaje, posición provisoria y tarjeta para compartir. | ✅ v0.42 |
| LIG-16 | Podio final con confeti y medallas. | ✅ v0.42 |
| LIG-17 | ⏳ Línea Relámpago, con 10 hitos y la mano, las ranuras y el arrastre de Línea de Tiempo (D-102). | ✅ v0.44 |
| LIG-18 | 🔢 Toque y Fama: adivina el número, con el teclado, las notas y el tablero de Toque y Fama. | ✅ v0.44 |
| LIG-19 | 🔗 Conexiones con 12 grillas difíciles, de temas generales y con distractores. | ✅ v0.44 |
| LIG-20 | ~~⚓ Batalla Naval: Solitario~~ reemplazado por 👑 Reinas, con solución única (D-102). | ✅ v0.44 |
| LIG-21 | ~~🎲 ¿Dudo o le creo?~~ reemplazado por 🔤 Toque y Fama con letras (D-102). | ✅ v0.44 |
| LIG-22 | 📅 ¿En qué año?. | ✅ v0.42 |
| LIG-23 | 🏁 La Gran Final. | ✅ v0.42 |
| LIG-24 | Admin: renombrar, sacar y cambiar PIN de jugadores (since D-464, the admin confirms a new PIN with their own). | ✅ v0.42 |
| LIG-25 | Admin: invitación, recordatorio del día (cualquier día), tabla parcial y resumen final por el diálogo de compartir. | ✅ v0.42 |
| LIG-26 | Cuenta segura: hash del PIN ilegible y escritura autorizada por reglas (D-96). | ✅ v0.42 (falta publicar reglas y habilitar el acceso anónimo) |
| LIG-27 | Modo de prueba local con reloj adelantable y gancho `window.__copa` (C-14). | ✅ v0.42 |
| LIG-28 | Señal al panel por día jugado (C-16) y documentación (C-13). | ✅ v0.42 |
| LIG-29 | Recordatorios `.ics` para el calendario del celular. | ⏳ pendiente (Uno al día tuvo uno de v0.118.0 a v0.120.2; el dueño lo sacó: el recordatorio es el aviso diario, D-230) |
| LIG-30 | Verificación cruzada: cada celular recalcula los puntajes ajenos desde las jugadas. | ⏳ pendiente |
| LIG-31 | Papelera: borrar copas una semana después de terminadas. | ⏳ pendiente |
| LIG-32 | Inglés y portugués, con contenido propio por idioma (D-98, D-170). | ✅ D-170 |
| LIG-33 | Avisos automáticos por WhatsApp, correo o push (D-99). | ✅ v0.110.0: avisos al celular (push), abiertos a todos (D-228). Plan en [PWA-NOTIFICACIONES.md](PWA-NOTIFICACIONES.md) (D-221): instalable en v0.105.0, suscribirse en v0.107.0 (D-223), mandar en v0.108.0 (D-224), la clave en v0.108.1 (D-225) y la campana en la app del iPhone en v0.109.1 (D-227). medidos en el panel en v0.112.0 (D-233). WhatsApp y correo, no |
| LIG-34 | Calendario elegido por el admin al crear la copa: qué juegos y en qué orden, a partir de una propuesta al azar; la final va al último (D-163) y, desde D-418, repite los juegos de la semana. | ✅ v0.75.0 |
| LIG-35 | Pantalla de espera antes del día 1: cuándo parte, calendario e inscritos. | ✅ v0.42 |
| LIG-36 | "Cómo se juega" antes de cada juego y de cada ronda de la final; el intento empieza en Empezar. | ✅ v0.42 |
| LIG-37 | Tiempo activo: el cronómetro se pausa con la pantalla oculta (D-95). | ✅ v0.42 |
| LIG-38 | Tablero con tus días: los pasados con su resultado y deshabilitados, hoy habilitado, los que vienen deshabilitados. | ✅ v0.42 |
| LIG-39 | Gráfico de tu posición día a día. | ✅ v0.42 |
| LIG-40 | El panel del dueño muestra las copas creadas y su progreso. | ✅ D-137; ficha de cada copa con D-207 |
| LIG-41 | Práctica de cada juego suelto, con semilla repetible, desde el laboratorio (D-101). | ✅ v0.43 |
| LIG-42 | Reportar un problema o dejar un comentario con su contexto, desde la práctica, el tablero y el resultado, sin cuenta (D-104). | ✅ v0.45 (se leen con `node tools/firebase/reports.mjs`) |
| LIG-43 | Laboratorio `/labs/`: La Copa sale del menú (Próximamente) y se prueba ahí, con la Copa de 3 días. | ✅ v0.43 |
| LIG-44 | El panel del dueño muestra los reportes. | ⏳ pendiente |
| LIG-45 | 〰️ Zip y ☀️ Tango en el laboratorio, con solución única, para decidir si entran al calendario. | ✅ v0.44 |
| LIG-46 | El teclado, el tablero y la línea se comparten con Toque y Fama y Línea de Tiempo (`public/assets/js/teclado.js`, `public/assets/css/teclado.css`, `public/assets/css/linea.css`). | ✅ v0.44 |
| LIG-47 | Sesión de prueba antes de cada día: la misma mecánica con otro contenido, que no cuenta (D-103). | ✅ v0.45 |
| LIG-48 | Zip por niveles contra el reloj (3 minutos) y aviso cuando el trazo llega al final sin pasar por todas. | ✅ v0.45 |
| LIG-49 | Reinas: toque para la reina, toque largo para la X. Tango: ≠, borrar todo, pista (−15) y consejos. | ✅ v0.45 |
| LIG-50 | Cuenta regresiva de 5 a 1 y "¡A jugar!" antes de cada juego; el reloj parte ahí (D-105). | ✅ v0.45 |
| LIG-51 | Al terminar, cómo se calculó el puntaje, línea por línea (D-106). | ✅ v0.45 |
| LIG-52 | El nombre del reporte queda guardado en el dispositivo (D-104). | ✅ v0.45 |
| LIG-53 | Reinas puntúa el tiempo en resolverlo (100 hasta 30 s, 10 a los 5 min), sin castigo por error (D-107). | ✅ v0.46 |
| LIG-54 | 🔤 pasa a llamarse Toque y Fama: Palabra y suma puntos por cada letra encontrada en su lugar, una vez por lugar (D-108). | ✅ v0.47 |
| LIG-55 | La práctica del laboratorio ofrece la sesión de prueba, como un día de la copa (D-109). | ✅ v0.47 |
| LIG-56 | Zip muestra la solución del nivel a medias al acabarse el tiempo (D-109). | ✅ v0.47 |
| LIG-57 | Los reportes que no se pueden enviar se guardan y se reenvían (D-109). | ✅ v0.47 |
| LIG-58 | Recién creada, la copa abre en Administrar con una guía para invitar (D-110). | ✅ v0.48 |
| LIG-59 | El admin cierra y reabre la inscripción (D-110). | ✅ v0.48 |
| LIG-60 | El admin mueve el inicio a hoy o mañana mientras nadie haya jugado (D-110). | ✅ v0.48 |
| LIG-61 | Demos de cada vista de la copa en el laboratorio (D-110). | ✅ v0.48 |
| LIG-62 | Rendirse en Reinas (D-110). | ✅ v0.48 |
| LIG-63 | La copa no usa la temática de Brasil (D-111). | ✅ v0.48 |
| LIG-64 | Todos los juegos puntúan de 0 a 100 (D-113). | ✅ v0.49 |
| LIG-65 | Las copas nuevas usan la hora del Pacífico y Administrar muestra la zona (D-113). | ✅ v0.49 |
| LIG-66 | Inicio de la copa: hoy, mañana u otra fecha (hasta 30 días) con calendario (D-115). | ✅ v0.51 |
| LIG-67 | Copas del laboratorio: el admin pasa al día siguiente (D-115). | ✅ v0.51 |
| LIG-68 | El admin elimina la copa, con dos confirmaciones (D-117). | ✅ v0.53 |
| LIG-69 | La copa se juega entre 2 y 10; con el admin solo no parte ni avanza de día (D-118). | ✅ v0.54 |
| LIG-70 | El nombre de la copa llega a 40 caracteres, con contador (D-119). | ✅ v0.55 |
| LIG-71 | Link propio de la copa (?pirata), único mientras dure y reusable 7 días después de terminar (D-121). | ✅ v0.57 |
| LIG-72 | Compartir la tabla parcial como imagen, con "(-1J)" para quien lleva menos juegos (D-126). | ✅ v0.59 |
| LIG-73 | Invitación promocional, sin revelar los juegos (D-127). | ✅ v0.60 |
| LIG-74 | Conexiones agrupa por significado, sin juegos de palabras (D-128). | ✅ v0.61 |
| LIG-75 | El tiempo se corta al terminar el tablero, no al tocar "Ver resultado" (D-130). | ✅ v0.62 |
| LIG-76 | La tabla muestra los 7 días de cada jugador con su estado y una leyenda (D-131). | ✅ v0.63 |
| LIG-77 | Reglas plegadas debajo del tablero en cada juego, con las palabras de sus botones (D-133). | ✅ v0.64 |
| LIG-78 | La imagen de la tabla pone gráfico y tabla en el mismo eje, con todos los días y los empates a la vista (D-141). | ✅ v0.64.9 |
| LIG-79 | El resultado del día se envía apenas termina el tablero, no al tocar "Ver resultado" (D-150). | ✅ v0.66.1 |
| LIG-80 | La imagen de la tabla muestra los puntos de cada día, el comodín, quién no jugó y quién todavía puede, con leyenda; "(-1J)" en pill y el podio final en galvanos; 4:5 (D-153). | ✅ v0.67.0 |
| LIG-81 | La imagen de la tabla mide lo que necesita, entre 1080 × 1080 y 1080 × 1350, sin aire de sobra (D-154). | ✅ v0.67.1 |
| LIG-82 | El admin termina la copa antes (por ejemplo, si el último no va a jugar la final); los días sin abrir quedan anulados (D-161). | ✅ v0.73.0 |
| LIG-83 | Terminada la copa, el admin exporta la tabla final: la imagen y una planilla CSV con la tabla, los lugares día a día y el detalle (D-161). | ✅ v0.73.0 |
| LIG-84 | Juegos de reserva (La Palabra, Ahorcado Contrarreloj), separados de LIG-34. | ⏳ pendiente |
| LIG-85 | Reinas: arrastrar desde una casilla vacía pinta X en las vacías por donde pasa, sin tocar el toque ni el toque largo (D-166). | ✅ v0.78.0 |
| LIG-86 | Reinas: el toque cicla vacía → reina → X → vacía; el toque largo queda como atajo de la X (D-167). | ✅ v0.78.0 |
| LIG-87 | Reinas: arrastrar desde una X borra las X por donde pasa; las reinas no se tocan (D-168). | ✅ v0.79.0 |
| LIG-88 | Reinas: 🧹 Borrar todo deja el tablero en blanco, con confirmación; el reloj sigue (D-169). | ✅ v0.79.0 |
| LIG-89 | La Copa sale del laboratorio: tarjeta activa en el menú principal y "‹ Menú" vuelve al menú; `/labs/` sigue para probar (D-175). | ✅ v0.83.0 |
| LIG-90 | 📍 ¿Dónde queda? se juega suelto desde la portada, en `/minigames/where/`, sin "Próximamente" (D-174). | ✅ v0.82.0 |
| LIG-91 | En Administrar, la invitación sigue mientras alguien nuevo pueda entrar (inscripción abierta y cupo) y, ya partida, dice en qué día va (D-176). | ✅ v0.83.1 |
| LIG-92 | Quien entra tarde lee que los días cerrados quedan en 0 desde el día 3 (el día 1 sigue en su gracia el día 2); con la copa llena lee que está llena; la sesión de prueba avisa que es más corta y no cuenta (D-177). | ✅ v0.84.0 |
| LIG-93 | Zip tiene diez niveles, de 4 × 4 a 7 × 7: con los diez son 100 puntos y la partida termina ahí, sin esperar el reloj; entre quienes los resuelven todos gana quien terminó antes (D-250). | ✅ v0.130.0 |
| LIG-94 | The owner's request: someone gets history and continuity just by using their usual name and PIN. With no player on the phone, the cup PIN tried as the player PIN for that name signs them in as that player; a podium saved without them gets their player once they sit in that cup as it (D-358). | ✅ on merge (D-358) |
| LIG-95 | The owner's request: no cup PINs are needed when someone is signed in as a player; the player PIN plus being signed up in the cup suffices. The cup PIN stays for people without a player (D-359). | ✅ on merge (D-359) |
| LIG-96 | The owner's request: an unused ×2 wildcard is not lost. In a cup with a Grand Final it lands on its own on the last day before the final the player played; day 6 warns that it applies today and the day it lands on shows a gold **×2 auto** (D-444). | ✅ on merge (D-444) |

## Requerimientos no funcionales

- **Accesible al tacto:** botones de al menos 44 px de alto, texto grande, alto contraste sobre fondo oscuro.
- **Rendimiento:** carga inicial < 200 KB sin contar fuentes web; sin frameworks.
- **Privacidad:** la partida vive en `localStorage` del dispositivo; a Firebase van la sala (modos de varios celulares) y señales de uso para el panel del dueño: contadores por juego, modo, jugadores, zona horaria, idioma y hora (D-44). De una sala, además, el país y quién ganó (D-79); de una partida sin red, quién juega (el nombre que ya usa en la app) y cómo terminó (D-210). Esos nombres solo los lee el dueño. Nunca IP, secretos ni chat. What is kept, why and for how long is told to players on `/privacy/`, in the four languages, which changes with the code (D-463). ✅ D-463
- **Responsabilidad:** el menú incluye un mensaje de consumo responsable.
- **URL en inglés:** carpetas, parámetros y sus valores; los links de antes, en español, siguen funcionando (C-18, D-266). ✅ v0.143.0
- **Internal text in English:** documents, decisions, code, tool messages, commits, PRs and GitHub issues are written in English; what the player reads keeps the app's four languages, and persisted data keys keep their names. Done in phases (C-13, D-316). 🚧 phase 1 (living instructions and bot texts) v0.170.7; phase 3 (the workshop: `tools/`, workflows, agents) v0.171.2

## Toque y Fama (TF) — ver [especificación](games/bulls-and-cows.md) y [estudio de factibilidad](games/bulls-and-cows-factibilidad.md)

| ID | Requerimiento | Estado |
|---|---|---|
| TF-01 | Dos jugadores; cada uno elige un número secreto de 3, 4 o 5 cifras distintas (4 por defecto). | ✅ v0.4 |
| TF-02 | El celular calcula toques y famas automáticamente; nunca se cuenta a mano. | ✅ v0.4 |
| TF-03 | Modo un celular (pasar y jugar) con pantalla opaca entre turnos. | ✅ v0.4 |
| TF-04 | ~~Modo contra el celular: duelo contra un solver.~~ Reemplazado por jugar solo (TF-19, D-129). | ✅ v0.4 |
| TF-05 | Modo dos celulares conectados por sala con código de 4 letras y QR (Firebase Realtime Database). | ✅ v0.4 |
| TF-06 | El secreto no sale del celular durante la partida; compromiso por hash (con sal privada) al inicio y revelación verificada al final. | ✅ v0.4 |
| TF-07 | Reconexión: si un celular se cierra, retoma la partida desde la sala (secreto guardado en el dispositivo). | ✅ v0.4 |
| TF-08 | Derecho a réplica configurable. Quién parte es determinista: el invitado en la primera partida, el perdedor en la revancha (ver D-19). Since D-367 this applies only to 📱 one phone: on 📡 two phones both guess at once, without right of reply. | ✅ v0.4 |
| TF-09 | Textos en español e inglés (“Bulls and Cows”). | ✅ v0.4 |
| TF-10 | Revancha en los tres modos; en dos celulares se crea una sala nueva y ambos se mueven solos. | ✅ v0.4 |
| TF-11 | Indicador de rival desconectado en modo dos celulares. | ✅ v0.4 |
| TF-12 | Al adivinar, el jugador ve su propio número como recordatorio. En modo un celular parte oculto y se muestra al tocarlo. | ✅ v0.4.1 |
| TF-13 | Pulsación larga sobre una cifra del teclado la marca como bloqueada (no está en el número secreto). Las marcas son por jugador, se recuerdan durante la partida y se ven tachadas; otra pulsación larga las libera. Instrucción breve en pantalla. | ✅ v0.4.2 |
| TF-14 | En el resultado, bloque colapsado “Ver todos los intentos” con los tableros de ambos jugadores; colapsado no empuja los botones fuera de la pantalla. | ✅ v0.4.3 |
| TF-18 | Textos en portugués (“Toque e Fama”). | ✅ v0.22 |
| TF-19 | Jugar solo: el celular elige el número y el jugador lo adivina en la menor cantidad de intentos, con récord por cifras y cero al inicio; pistas con palabra completa en su tablero (D-129). | ✅ v0.61 |

## Batalla Naval (BN) — ver [docs/games/battleship.md](games/battleship.md)

| ID | Requerimiento | Estado |
|---|---|---|
| BN-01 | Tablero 10×10 (A–J, 1–10) y flota clásica de 5 barcos (5, 4, 3, 3, 2). | ✅ v0.6 |
| BN-02 | Colocación por toque: seleccionar barco, tocar casilla, girar, arrastrar, “al azar” y “limpiar”; validación de bordes y superposición. Los barcos pueden tocarse. | ✅ v0.6 |
| BN-03 | Turnos con tiro extra al acertar (configurable, activado por defecto). | ✅ v0.6 |
| BN-04 | Respuestas agua / tocado / hundido, con el barco y sus casillas al hundir. Marcador de barcos hundidos. | ✅ v0.6 |
| BN-05 | Tres modos: un celular (flota tapada, pase al fallar), contra el celular (IA con cacería por paridad y persecución) y dos celulares (sala Firebase). | ✅ v0.6 |
| BN-06 | Compromiso de la flota con hash y sal, revelación y verificación al final. | ✅ v0.6 |
| BN-07 | Reconexión, revancha (parte el perdedor), presencia. | ✅ v0.6 |
| BN-08 | Selección + confirmación “¡Fuego!” antes de disparar (con opción de disparo directo). | ✅ v0.6 |
| BN-09 | Textos en español e inglés (“Battleship”); sonidos de agua, impacto y hundimiento. | ✅ v0.6 |
| BN-10 | Los transportes `local` y `firebase` se mueven a `public/assets/js/transport/` para compartirlos entre juegos. | ✅ v0.6 |
| BN-16 | Textos en portugués (“Batalha Naval”: água, acertou, afundou). | ✅ v0.22 |

## Línea de Tiempo (LT) — ver [docs/games/timeline.md](games/timeline.md)

| ID | Requerimiento | Estado |
|---|---|---|
| LT-01 | Cartas con hitos sin año que se ubican en una línea de tiempo común. | ✅ v0.8 |
| LT-02 | Temáticas seleccionables; agregar una es solo un archivo de datos. Vienen Historia y Música. | ✅ v0.8 |
| LT-03 | Acierto: la carta entra en la línea. Error: se descarta y el jugador roba otra. | ✅ v0.8 |
| LT-04 | Gana quien se queda sin cartas. Mano configurable de 3, 5 o 7. | ✅ v0.8 |
| LT-05 | Modo un celular de 2 a 6 jugadores, con pase entre turnos. | ✅ v0.8 |
| LT-06 | Modo solitario: vaciar la mano en la menor cantidad de intentos, con récord por temática y mano. | ✅ v0.9.2 |
| LT-07 | Modo varios celulares de 2 a 6 (roles A–F), con lobby y anfitrión que abre la partida. | ✅ v0.9 |
| LT-08 | Mazo determinista por semilla, para que todos los dispositivos vean el mismo reparto. | ✅ v0.8 |
| LT-09 | Memoria de partida en todos los modos (canon C-6). | ✅ v0.8 |
| LT-10 | Textos en español e inglés. | ✅ v0.8 |
| LT-11 | Chat de sala en varios celulares, en la sala de espera y durante la partida; muere con la partida (canon C-15). | ✅ v0.10 |
| LT-12 | La ronda se juega completa y, si más de uno queda sin cartas, gana quien respondió en menos tiempo. El tiempo se muestra solo al final. | ✅ v0.12 |
| LT-13 | Opción de pozo común: 6 cartas a la vista para todos, se reponen por el final, y gana quien coloque primero las cartas acordadas. | ✅ v0.13 |
| LT-14 | Cuatro temáticas (Historia, Música, Chile, Cultura pop) y cartas que no se repiten entre partidas seguidas. | ✅ v0.14 |
| LT-15 | Opción de todas las cartas a la vista: se despliega el doble de la meta desde el primer turno, no entra ninguna carta nueva y la mesa solo se achica. Es la opción marcada al abrir la configuración. | ✅ v0.21 |
| LT-16 | Arrastrar la carta de la mano a su lugar en la línea, y retomar la ya puesta para moverla o devolverla. Soltar elige; el botón coloca (D-85). | ✅ v0.35 |
| LT-17 | Mazos de Brasil (historia, tele, música y farándula, 140 cartas) y de Fútbol mundial (123 cartas), en los tres idiomas. | ✅ v0.23 |
| LT-18 | Textos y los cuatro mazos en portugués (“Linha do Tempo”). Hasta D-213 se anotaba como LT-16, que repetía un ID. | ✅ v0.22 |

## El Ahorcado (AH) — ver [docs/games/hangman.md](games/hangman.md)

| ID | Requerimiento | Estado |
|---|---|---|
| AH-01 | Palabra tapada que se adivina por letras; cada error dibuja un trazo del ahorcado. | ✅ v0.26 |
| AH-02 | Vidas configurables: 5, 6 u 8 (hasta 0.84.0, "errores permitidos"), y el último trazo siempre son los ojos en X. | ✅ v0.26 |
| AH-03 | La palabra sale de una cadena entre jugadores (cada uno para el siguiente, con pista) o del mazo del celular. | ✅ v0.26 |
| AH-04 | Cinco temáticas y una mezcla, con palabra y pista propias en español, inglés y portugués. Con cadena, la temática sugiere palabras a quien escribe (D-62). | ✅ v0.26 |
| AH-05 | Puntaje: las vidas que le quedaron a quien adivinó; desempata quien gastó menos letras y después menos tiempo. Los colgados van al final, por cuánto revelaron, y si no la sacó nadie no hay ganador (D-61). | ✅ v0.26 |
| AH-06 | Comprar una letra: revela la que falta más rara y cuesta una vida (D-58). | ✅ v0.26 |
| AH-07 | Modo un celular, de 2 a 6 jugadores, con pantalla tapada para escribir y pase en cada letra (D-59). | ✅ v0.26 |
| AH-08 | Modo varios celulares, de 2 a 6 (roles A–F), con sala, anfitrión y turnos alternados (D-66). | ✅ v0.26 |
| AH-09 | Modo jugar solo: la app reparte una palabra de la temática elegida y el jugador la saca. Sin rival y sin secreto que comprometer (D-65). | ✅ v0.26 |
| AH-10 | Con cadena, la palabra no viaja: se compromete con hash y se verifica al final (canon C-10). | ✅ v0.26 |
| AH-11 | Memoria de partida en todos los modos, incluida la palabra a medio escribir (canon C-6). | ✅ v0.26 |
| AH-12 | Teclado de 27 teclas en español y 26 en los otros idiomas; acentos plegados y Ñ aparte (D-57). | ✅ v0.26 |
| AH-13 | Chat de sala en varios celulares (canon C-15). | ✅ v0.26 |
| AH-14 | La tira de rivales muestra vidas y avance, nunca las letras (D-55). | ✅ v0.26 |
| AH-15 | Entra al menú publicado cuando esté probado de punta a punta y con capturas en el README. | ✅ v0.26 |
| AH-16 | Turnos alternados letra a letra, salteando a quien ya terminó y a quien se fue de la sala (D-59, D-66). | ✅ v0.26 |
| AH-17 | Al confirmar una letra, un cartel breve dice cómo fue antes de que cambie el turno (D-63). | ✅ v0.26 |

## Julepe (JU) — ver [docs/games/julep.md](games/julep.md)

| ID | Requerimiento | Estado |
|---|---|---|
| JU-01 | Juego de bazas con baraja inglesa de 52 cartas, cinco por jugador y una vuelta que marca el triunfo. De 2 a 6 jugadores. | ✅ v0.34 |
| JU-02 | El plato: cada jugador pone 2 sorbos cuando queda vacío, y solo entonces. | ✅ v0.34 |
| JU-03 | Declaración por turno, desde la derecha del dador: ir (comprometerse a dos bazas) o pasarse (no juega, no bebe). Hasta 0.84.0 las reglas decían "en secreto" (D-177). | ✅ v0.34 |
| JU-04 | Si se pasan todos, la mano se anula con el plato acumulado; si va uno solo, el dador se queda obligado (D-83). | ✅ v0.34 |
| JU-05 | Cambio de hasta tres cartas desde la reserva propia, por puestos y no por nombre de carta (D-82). | ✅ v0.34 |
| JU-06 | Las cinco bazas con las tres obligaciones —asistir, montar y fallar—: la app apaga las cartas que no se pueden tirar y dice por qué (C-8b). | ✅ v0.34 |
| JU-07 | Julepe: quien fue y no hizo dos bazas se toma el plato entero, y el plato pasa a la mano siguiente una vez por cada julepeado (se dobla con dos julepes). | ✅ v0.34 |
| JU-08 | Quien se salva reparte dos sorbos por baza entre los demás. | ✅ v0.34 |
| JU-09 | Partida de 5, 8 o 12 manos; gana quien terminó más seco, con tabla de sorbos y julepes. | ✅ v0.34 |
| JU-10 | Modo un celular, de 2 a 6, con pase y resultado antes de cada pase (C-9). | ✅ v0.34 |
| JU-11 | Modo varios celulares, de 2 a 6, con sala, QR y chat, y reparto cerrado por jugador (D-81). | ✅ v0.34 |
| JU-12 | Modo contra el celular: mesa de tres contra dos rivales que solo miran sus propias cartas. | ✅ v0.34 |
| JU-13 | Al cerrar la mano cada celular destapa sus cartas y todos verifican que nadie jugó una que no tenía (C-10). | ✅ v0.34 |
| JU-14 | Memoria de partida en los tres modos, incluida la llave privada de la sala (C-6). | ✅ v0.34 |
| JU-15 | Los tres idiomas, con nombre propio en cada uno: Julepe, Julep y Paga o Bolo (D-84). | ✅ v0.34 |
