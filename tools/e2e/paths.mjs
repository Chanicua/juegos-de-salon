/**
 * How to reach each screen of each game, without playing the whole game. Used by `look.mjs` (one
 * screen, to look at it) and by the language tests (all of them, in each language: D-199).
 *
 * Each path is a list of JS snippets run in the page, one every 700 ms; a `1` step is just a
 * wait. It is keyed by the game's id ('ahorcado'), not by its folder.
 */
import { SUELTOS } from '../../public/assets/js/games.js';
import { CAMPAIGNS } from '../../public/assets/js/splash.js';

/** Uno al día (D-414): six days played up to yesterday on this phone, then the page again. */
const UAD_SEED = `(()=>{const d={},f=k=>{const t=new Date(Date.now()-k*86400000);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0')};for(let k=1;k<=6;k++)d[f(k)]={j:'reinas',s:50+k*7,ms:60000,at:Date.now(),n:1};localStorage.setItem('juegos-de-salon:uno-al-dia',JSON.stringify({dias:d}));location.reload();return 1})()`;

/* --- Path pieces for Batalla Naval (see the comment on its entry) --- */
const BS_CPU = [
  `document.querySelectorAll('.mode')[2].click()`,
  `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  `document.querySelector('#setup-actions .btn--yellow').click()`,
];
const BS_SAIL = [
  `[...document.querySelectorAll('#place-actions .btn')].find(b=>/azar|random|aleat|zufällig/i.test(b.textContent)).click()`,
  `document.querySelector('#place-sail .btn').click()`,
];
const BS_HOLD = `(()=>{const S=window.__bn.session();clearTimeout(S.cpuTimer);S.cpuTimer='frenado';})()`;
const BS_MISS = role => `(()=>{const S=window.__bn.session(),L=S.layouts['${role === 'A' ? 'B' : 'A'}'].layout,
  T={carrier:5,battleship:4,cruiser:3,submarine:3,destroyer:2},o=new Set();
  for(const [id,p] of Object.entries(L)) for(let i=0;i<T[id];i++) o.add((p.dir==='h'?p.r:p.r+i)+','+(p.dir==='h'?p.c+i:p.c));
  for(let r=0;r<10;r++) for(let c=0;c<10;c++) if(!o.has(r+','+c)) return S.transport.send({t:'shot',from:'${role}',cell:'ABCDEFGHIJ'[c]+(r+1)});})()`;

/* --- La Copa: "Tus copas" seeded in the test store, and the home page with `?test` (D-234) --- */
const MINE_SEED = `const D=864e5, now=Date.now(); sessionStorage.setItem('juegos-de-salon:copa:prueba:mias', JSON.stringify([
  {code:'FGHIJ',nombre:'Javiera',copa:'Los primos de Valparaíso, edición invierno',fin:now-2*D},
  {code:'ABCDE',nombre:'Javiera',copa:'Piratotes 1983',fin:now + 3 * D},
  {code:'KLMNO',nombre:'Javi',copa:'Copa del finde',fin:now-5*D}])); location.href='/cup/?test'`;

/* --- Tango: start and fill the board with the real engine (see its entry) --- */
const START = `document.getElementById('btn-empezar').click()`;
// Agentes: passes every clue (the last one asks first, so it takes two taps), each as soon as its button is back
const AG_FINISH = `(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));for(let k=0;k<40&&!document.querySelector('#ag-tablero .sin-tocar');k++){const b=document.getElementById('btn-pasar');if(b&&!b.disabled)b.click();await w(b&&!b.disabled?150:100);}})()`;
const TANGO_FILL = clash => `(async()=>{const JUEGOS=await (await import('/cup/games/index.js')).loadAll();const p=JUEGOS.tango.generar(__copa.estado.juego.semilla,1);
  const L=p.sol.map((v,i)=>i).filter(i=>p.dadas[i]===undefined), u=${clash}?L.filter(i=>p.sol[i]===2).at(-1):L.at(-1);
  const c=i=>document.querySelector('.tan[data-i="'+i+'"]');
  for(const i of L){if(i===u)continue;for(let k=0;k<3&&Number(c(i).dataset.v)!==p.sol[i];k++)c(i).click();}
  if(${clash})c(u).click();})()`;

/**
 * How to reach each screen. Each step is a JS snippet run in the page; if a game needs something
 * else, it is added here and not in a new script.
 */
/** Opens the first splash card's Quick look; repeatable, since the panel draws a moment after its seed */
const PEEK = `const b = document.querySelector('.vistazo-btn'); if (!b) document.querySelector('.campana-plegada')?.click(); else if (b.getAttribute('aria-expanded') !== 'true') b.click(); else document.querySelector('.vistazo-btn').closest('footer').scrollIntoView();`;
/** Seeds the panel with rooms, signals and cups, and opens the requested view (see `panel` below). */
const SEED_PANEL = view => `(async()=>{const DAY=86400000,now=Date.now(),today=Math.floor(now/DAY);
      const rooms={ABCD:{createdAt:now-4*60000,lastAt:now-60000,game:'dudo',players:{A:{name:'Javi',online:true},B:{name:'Cata',online:true}},messages:{m1:{t:'hello',at:now-4*60000},m2:{t:'bid',at:now-60000}}},EFGH:{createdAt:now-2*3600000,lastAt:now-12*60000,game:'juego-nuevo',players:{A:{name:'Fausto',online:false}}}};
      // A Batalla Naval like the one that confused the panel (D-138): each shot brings its automatic
      // reply, and there are two chat messages. It must say 40 moves and 2 chat messages.
      const ship={createdAt:now-24*60000,lastAt:now-16*60000,game:'batalla-naval',players:{A:{name:'Tomiguel',online:false},B:{name:'SVS',online:false}},messages:{}};
      for(let i=0;i<40;i++){ship.messages['s'+i]={t:'shot',at:now-40*60000+i*30000};ship.messages['r'+i]={t:'reply',at:now-40*60000+i*30000+500};}
      ship.messages.c1={t:'chat',at:now-17*60000,text:'x'};ship.messages.c2={t:'chat',at:now-16*60000,text:'y'};
      rooms.CPSV=ship;
      // Rooms played over several days, with country and winner, to see the log and its paging (D-79).
      // On purpose: a tie, a room with no recorded winner (from before it was recorded), one nobody
      // else ever joined, and names from several countries.
      const people=[['Javi','CL'],['Cata','CL'],['Pancho','CL'],['Fran','AR'],['Ana','BR'],['Leo','ES'],['Nico','MX'],['Sofi','PE']];
      const games=['dudo','ahorcado','linea-de-tiempo','toque-y-fama','batalla-naval'];
      const byDay={};
      for(let k=0;k<26;k++){
        const d=today-(k%7), code=String.fromCharCode(65+k%26)+'BCD'.slice(0,3);
        const a=people[k%people.length], b=people[(k+3)%people.length];
        const lg=k%4===1?'pt':k%4===2?'en':'es';
        const r={game:games[k%games.length],at:(d*DAY)+((10+k%12)*3600000),v:'0.33.6',players:{A:a[0],B:b[0]},co:{A:a[1],B:b[1]},...(k%5===4?{}:{l:{A:lg,B:k%6===0?'pt':lg}})};
        if(k%7===3) r.end={winner:'tie',at:r.at};
        else if(k%5!==1) r.end={winner:k%2?'A':'B',name:k%2?a[0]:b[0],at:r.at};
        if(k%9===4){ delete r.players.B; delete r.co.B; delete r.end; }
        (byDay[d]=byDay[d]||{rooms:{}}).rooms[code]=r;
      }
      const days={...byDay};
      days[today]={...(days[today]||{}),rooms:{...((days[today]||{}).rooms||{}),ABCD:{game:'dudo',at:now-4*60000,players:{A:'Javi',B:'Cata'},co:{A:'CL',B:'CL'},l:{A:'es',B:'pt'},end:{winner:'A',name:'Javi',at:now}},EFGH:{game:'juego-nuevo',at:now-2*3600000,players:{A:'Fausto'},co:{A:'UY'}},CPSV:{game:'batalla-naval',at:now-24*60000,players:{A:'Tomiguel',B:'SVS'},co:{A:'CL',B:'CL'}}},local:{dudo:{local:{4:6},cpu:{1:3}},'juego-nuevo':{equipos:{6:5}},ahorcado:{local:{3:4}}},origin:{America__Santiago:12,Europe__Madrid:2},lang:{'es-CL':12,'pt-BR':2},applang:{es:11,pt:2,fr:1},hour:{14:4,21:9}};
      days[today-1]={...(days[today-1]||{}),local:{'linea-de-tiempo':{solo:{1:7}}},origin:{America__Santiago:5},lang:{'es-CL':5},applang:{es:5},hour:{20:5}};
      
      const {nuevaMeta}=await import('/cup/engine.js');
      const Z='America/Santiago', dateOf=k=>new Date(now-k*DAY).toLocaleDateString('en-CA',{timeZone:Z});
      const names=['Javi','Cata','Pancho','Fran','Sofi','Nico','Leo'];
      const cup=(name,numDays,ago,n,{lab=false,alias=null,lang='es'}={})=>{
        const pids=names.slice(0,n).map((g,i)=>'p'+String(i).padStart(5,'0'));
        const meta=nuevaMeta({nombre:name,dias:numDays,inicio:dateOf(ago),tz:Z,admin:pids[0],creada:now-(Math.max(ago,0)+1)*DAY,lab,alias,lang});
        // Each entrant's country (D-207); the last one, from before it was saved, has no flag
        const co=['CL','CL','AR','CL','PE','MX','ES'];
        const players=Object.fromEntries(pids.map((p,i)=>[p,{name:names[i],at:now-(Math.max(ago,0)+1)*DAY+(i+1)*3600000,...(i<n-1?{co:co[i]}:{})}]));
        const started=[null],results=[null];
        for(let d=1;d<=numDays;d++){
          started[d]={};results[d]={};
          if(now<meta.win[d].a)continue;
          pids.forEach((p,i)=>{
            const k=(d*7+i*3)%10, isToday=now<meta.win[d].h;
            if(isToday&&i>=n-2&&k%3===0)return;                         // hasn't played it yet
            const t0=Math.min(now-60000,meta.win[d].a+(2+i+d)*3600000);
            started[d][p]=t0;
            if(isToday&&i===n-1){started[d][p]=now-4*60000;return;}  // playing it right now
            if(k===7)return;                                           // left it unfinished
            const s=[100,89,78,67,56,44,30,20,11,0][k];
            results[d][p]={s,ms:40000+k*23000+i*7000,at:t0+60000+k*20000,r:s+'/100',t:''};
          });
        }
        return {meta,players,started,results};
      };
      const cups={OFICI:cup('Copa de la oficina',7,2,5,{alias:'oficina'}),PRIMO:cup('Los primos',3,0,3,{lang:'pt'}),LABOR:cup('Prueba del laboratorio',3,1,2,{lab:true}),AGOST:cup('Copa de agosto',7,20,6,{alias:'agosto'}),FINDE:cup('Copa del finde',3,-2,2)};
      // In the office cup, Cata played day 2 with a wildcard and the admin closed sign-up: the history shows them without a time
      cups.OFICI.wild={p00001:'2'};cups.OFICI.closed=true;
      // Offline games with a time (D-140), for a game's card
      // Site traffic (D-208): a week of visits, with origins, tagged links and pages
      for(let k=0;k<7;k++){const d=today-k,f=7-k;days[d]=days[d]||{};Object.assign(days[d],{vistas:{inicio:9*f,cup:6*f,hangman:2*f,connections:f,labs:1},entradas:{inicio:5*f,cup:3*f,hangman:f,connections:1},juegan:{inicio:2*f,cup:2*f,hangman:1},ref:{directo:5*f,google_com:2*f,google_cl:f,instagram_com:f,chatgpt_com:1},via:{link:3*f,instagram:1},retorno:{nueva:4*f,vuelve:5*f},disp:{celular:7*f,computador:2*f},pais:{CL:7*f,AR:f,ES:1}});}
      // With name and ending since D-210: one playing, one that won, a finished solo game and one without a name
      days[today].live={k3p9aaaaaa:{game:'dudo',mode:'cpu',n:1,co:'CL',l:'es',name:'Javi',v:'0.93.0',at:now-15*60000,beat:now-60000},q8w7aaaaaa:{game:'dudo',mode:'local',n:4,co:'AR',name:'Fran, Leo, Ana, Bia',v:'0.92.1',at:now-5*3600000,beat:now-4*3600000,fin:{at:now-4*3600000,g:'Leo',d:'9 rondas'}},t1t2aaaaaa:{game:'toque-y-fama',mode:'solo',n:1,co:'MX',l:'en',name:'Nico',v:'0.99.0',at:now-3*3600000,beat:now-3*3600000+120000,fin:{at:now-3*3600000+150000,d:'80/100 · 6 intentos · 2:30'}},s0s0aaaaaa:{game:'ahorcado',mode:'solo',n:1,co:'PE',v:'0.90.0',at:now-2*DAY,beat:now-2*DAY+300000}};
      // Cup days also send their signal: the panel doesn't count them among the games' matches
      days[today].local.copa={copa:{1:9}};for(let k=0;k<5;k++){const d=today-k;days[d]=days[d]||{};days[d].support={shown:6+k,open:3+(k%2),pay:k%3,thanks:k===1?1:0};}
      // Phone notifications (D-233): sent by notify.mjs, tapped, and openings of the installed app
      for(let k=0;k<7;k++){const d=today-k;Object.assign(days[d],{mandados:{dia:6,plazo:3,...(k===0?{final:4}:{})},aviso:{dia:3,plazo:2},pwa:{android:2,ios:k%2}});}
      const push={vuelta:now-9*60000,vivas:7,torneos:2};
      // Uno al día (D-230): games in the uno-al-dia mode and the history of three players, with streaks and invitations
      const uad={historia:{},invitados:{sara0001:{u1:{d:today-2},u2:{d:today-1}}},rachas:{sara0001:{s:9},pedro001:{s:3},ana00001:{s:1},leo00001:{s:31}}};
      for(let k=0;k<10;k++){const b=(days[today-k] ||= {});b.uad={boton:9+k,dado:8+k,jugado:7,repite:2,compartir:3,otro:4,invitar:2,invitacion:1,aceptada:k%2,oferta:2,hora:1,activos:1,ahorano:1,silencio:k%3?0:1};b.vistas={...(b.vistas||{}),today:12+k};b.entradas={...(b.entradas||{}),today:3};b.local ||= {};const g=['reinas','conexiones','dudo','anio'][k%4];((b.local[g] ||= {})['uno-al-dia'] ||= {})[1]=3+(k%3);}
      for(const [jid,nd] of [['sara0001',9],['pedro001',4],['ana00001',2]])for(let k=0;k<nd;k++)(uad.historia[jid] ||= {})[today-k]={j:'reinas',s:60+k};
      // Health (D-251): failures by type, errors with their detail (one from an old version) and how long each page took
      for(let k=0;k<7;k++){const b=days[today-k];b.vistas={...(b.vistas||{}),where:8};b.falla={alguna:{cup:2+k%3,hangman:1,...(k===1?{where:3}:{})},js:{cup:1+k%2,hangman:1},promesa:{cup:1},...(k===1?{arranque:{where:2},recurso:{where:3}}:{})};b.listo={inicio:{s1:30,s3:12,s6:3},cup:{s1:10,s3:6,s6:2,s10:1},hangman:{s1:4,s3:2},where:{s3:2,s6:3,s10:2,mas:1}};}
      const errOf=(k,m,f,p,b,v,n)=>({n,d:{k,m,f,p,b,v,at:now}});
      days[today].err={a1:errOf('js',"TypeError: Cannot read properties of undefined (reading 'dia')",'/cup/game.js:1840','cup','chrome129','0.130.0',4),a2:errOf('js',"TypeError: undefined is not an object (evaluating 'c.dia')",'/cup/game.js:1840','cup','ios16','0.130.0',2),b1:errOf('promesa','PERMISSION_DENIED: Permission denied','/cup/store.js:212','cup','safari17','0.130.0',1),c1:errOf('js','ReferenceError: palabras is not defined','/hangman/game.js:88','hangman','samsung25','0.130.0',1)};
      days[today-1].err={d1:errOf('recurso','módulo que no cargó (el de la página)','/where/','where','instagram','0.129.0',3),e1:errOf('js',"SyntaxError: Unexpected token '.'",'/cup/games/where/ui.js:12','where','ios13','0.129.0',2)};
      days[today-3].err={f1:errOf('js','RangeError: Maximum call stack size exceeded','/zip/x.js:5','zip','chrome128','0.128.0',6)};
      // The domains (D-348, D-349): two weeks of active browsers (a cohort that comes back), returns, frequency, shares, endings and replays
      const ids=Array.from({length:40},(_,i)=>('u'+String(i).padStart(9,'0')));
      for(let k=0;k<14;k++){const b=(days[today-k] ||= {});b.activos={};ids.forEach((id,i)=>{if((i+k)%3!==0&&i<20+k)b.activos[id]=(i+k)%2?2:1;});
        b.vuelta={nueva:4+k%3,d1:6,'d2-7':5,'d8-30':2,d31:1};b.frec={f1:5,'f2-3':4,'f4-7':3,'f8-14':2,f15:1};b.comparte={'resultado-tango':3,copa:2,app:1,invita:k%2};
        b.fin={dudo:{local:3,cpu:2},'toque-y-fama':{solo:2}};b.otra={dudo:2,'toque-y-fama':1};}
      // Feedback for the timeline (D-408): a suggestion with a name, an anonymous problem report and a lab tester's idea
      const feedback={f1:{texto:'Me encantó la Generala, ¿pueden agregar más idiomas?',at:now-50*60000,nombre:'Cata',tipo:'sugerencia'},f2:{texto:'El botón de compartir no hace nada en mi celular',at:now-26*3600000,tipo:'problema'},f3:{texto:'Una copa de solo palabras',at:now-3*DAY,nombre:'Leo',tipo:'idea',tester:'LV'},f4:{texto:'Hola, ¿se puede jugar sin internet?',at:now-5*3600000,nombre:'Bia',v:'email',contexto:JSON.stringify({canal:'email',idioma:'pt'}),correoMascara:'b********a@g********m'}};
      // 💬 Feedback: where each message stands (f1 in an open PR, f3 closed and replied, f2 with no issue yet)
      const feedbackEstado={f1:{issue:901,state:'open',replied:false,prs:[{n:950,state:'open',title:'More languages'}]},f3:{issue:880,state:'closed',replied:true,prs:[{n:890,state:'merged',title:'A words-only cup'}]}};
      window.__panel.seed({rooms,days,torneos:cups,push,uad,feedback,feedbackEstado,vista:'${view}'});})()`;

/* --- Pintaminas: the variant the phone remembers, and painting the whole board with the engine's solution --- */
/* --- Loteo: the phone remembers the variant too, so each path starts from Numbers --- */
const LT_NUMBERS = `localStorage.setItem('juegos-de-salon:loteo:variant','numbers'); location.reload()`;
const PM_VARIANT = v => `localStorage.setItem('juegos-de-salon:pintaminas:variant','${v}'); location.reload()`;
const PM_SOLVE = `(()=>{const {p}=window.__pintaminas;const k=c=>c===0?'btn-fondo':c===1?'btn-tinta':'btn-tinta2';
  p.sol.forEach((c,i)=>{if(p.dadas.includes(i))return;document.getElementById(k(c)).click();document.querySelector('#pm-tablero .pm-casilla[data-i="'+i+'"]').click();});})()`;

/* --- The inbox (D-345): a device past its first 2 games, and Toque y Fama's solo result --- */
const INBOX_SEED = `localStorage.setItem('juegos-de-salon:buzon', JSON.stringify({ partidas: 2 }))`;
const TYF_RESULT = [
  `document.querySelectorAll('.mode')[2].click()`,
  `document.getElementById('btn-solo-empezar').click()`,
  `(async()=>{const m=await import('../cup/games/number/engine.js');const s=m.generar(__tyf.guardada().codigo,1).secreto;
    const guess=n=>{for(const d of n)[...document.querySelectorAll('.screen.active .keypad button')].find(x=>x.textContent===d).click();document.querySelector('.screen.active .keypad .ok').click()};
    guess(s==='0123'?'4567':'0123');guess(s);})()`,
  `document.getElementById('btn-fin').click()`,
  `1`, `1`, `1`, `1`,
];

export const PATHS = {
  /**
   * 🕵️ Agentes (D-421): the board, the end (every clue passed, Terminar confirmed) and its result.
   * AG_FINISH passes each clue as soon as its button comes back (a clue takes about a second to
   * turn away), in one step: tapping it on a fixed beat took 14 steps, and the language check runs it
   * eight times.
   */
  agentes: {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, `1`, `1`],
    end: [START, `1`, `1`, `1`, `1`, `1`, `1`, AG_FINISH, ...Array(4).fill(`1`)],
    result: [START, `1`, `1`, `1`, `1`, `1`, `1`, AG_FINISH, ...Array(4).fill(`1`), `document.getElementById('btn-fin')?.click()`, `1`, `1`],
  },
  /**
   * 🖌️ Pintaminas (D-331). The phone remembers the variant, so each path sets it first (the lever's
   * shot leaves it in hard). `hint` is the 💡 hint paid (the cell that pulses and its numbers);
   * `revealed`, a hard board painted whole (the drawing and «Ver resultado»); `result`, its result.
   */
  rutas: {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, `1`, `1`],
    // Two turns done and Give up armed: Undo and Restart lit, the longest button text
    moves: [START, `1`, `1`, `1`, `1`, `1`, `1`, `window.__rutas.girar({f1:0,c1:0,f2:1,c2:1})`, `window.__rutas.girar({f1:2,c1:2,f2:2,c2:2})`, `document.getElementById('btn-rendirse').click()`],
    // Stage 1 solved: the glow and «¡Etapa 1 lista!»
    stage: [START, `1`, `1`, `1`, `1`, `1`, `1`, `(async()=>{for(const r of [...window.__rutas.t.revuelta].reverse()){window.__rutas.girar(r);await new Promise(x=>setTimeout(x,60));}})()`, `1`],
  },
  /** 📐 Loteo: a board, a rejected rectangle, Utilities (picked in the waiting room), all solved, and given up. */
  loteo: {
    intro: [LT_NUMBERS, `1`, `1`],
    game: [LT_NUMBERS, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`],
    error: [LT_NUMBERS, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, `(()=>{const t=__loteo.P.t;__loteo.dibujar({f1:0,c1:0,f2:t.lado-1,c2:t.lado-1})})()`],
    utilities: [LT_NUMBERS, `1`, `document.querySelectorAll('#selector-variante .opcion')[1].click()`, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`],
    end: [LT_NUMBERS, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`,
      `(async()=>{for(let k=0;k<5;k++){for(const r of __loteo.P.t.solucion)__loteo.dibujar(r);await new Promise(r=>setTimeout(r,2000));}})()`,
      ...Array(12).fill(`1`)],
    gaveup: [LT_NUMBERS, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, `document.getElementById('btn-rendirse').click()`, `document.getElementById('btn-rendirse').click()`, `1`],

    // Hint armed (#441): «Toca de nuevo (−10)», the longest label, fits in its half without wrapping
    armed: [LT_NUMBERS, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, `__loteo.dibujar(__loteo.P.t.solucion[0])`, `1`, `document.getElementById('btn-ayuda').click()`],
  },
  pintaminas: {
    intro: [PM_VARIANT('easy'), `1`, `1`],
    'intro-hard': [PM_VARIANT('easy'), `1`, `1`, `document.getElementById('btn-dificil').click()`, `1`, `1`],
    game: [PM_VARIANT('easy'), `1`, START, `1`, `1`, `1`, `1`, `1`, `1`],
    hint: [PM_VARIANT('easy'), `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, `document.getElementById('btn-ayuda').click()`, `document.getElementById('btn-ayuda').click()`],
    'game-hard': [PM_VARIANT('hard'), `1`, START, `1`, `1`, `1`, `1`, `1`, `1`],
    revealed: [PM_VARIANT('hard'), `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, PM_SOLVE, `1`, `1`, `1`],
    result: [PM_VARIANT('hard'), `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, PM_SOLVE, `1`, `1`, `document.getElementById('btn-fin').click()`, `1`, `1`, `1`],
  },
  /** La Copa with the test store (`?test`): the home page and the form to create one. */
  copa: {
    intro: [],
    create: [`document.getElementById('btn-crear').click()`],
    // The new create screen (D-425, lab) with the 3-day cup chosen by its shortcut (D-521): "Los 3 días" and its three games, no final (D-437, D-438)
    'create-three': [`location.href='/cup/?test&lab'`, `1`, `1`, `document.getElementById('btn-crear').click()`, `1`,
      `document.querySelector('#dur-atajos .dur-atajo').click()`, `1`, `document.getElementById('crear-modo').scrollIntoView({ block: 'start' })`],
    // "Tus copas" with one in progress and two finished: the switch off and on (D-234)
    mine: [MINE_SEED, `1`],
    'mine-finished': [MINE_SEED, `1`, `document.getElementById('ver-terminadas').click()`],
    // Every status at once (`&demo=mine`): ready, play it today, two days, half played, played, starts, out
    'mine-status-all': [`location.href='/cup/?test&demo=mine'`, `1`, `1`, `document.getElementById('tus-copas').scrollIntoView({ block: 'start' })`],
    // All finished: "No tienes copas en curso." above the switch
    'mine-none': [MINE_SEED.replace('now + 3 * D', 'now - 1 * D'), `1`],
    // The day table of La Gran Final, with each one's five-round card (#259)
    'final-table': [`location.href='/cup/?test&demo=full'`, `1`, `1`,
      `[...document.querySelectorAll('.md-fila')].pop().click()`,
      `document.querySelector('.screen.active .fila')?.scrollIntoView({ block: 'start' })`],
    // A phone that lost its seat with the day open: Start takes it to type its PIN, with its name
    // already chosen (D-285; the whole test is cup/seat.mjs)
    reseat: [`location.href='/cup/?test&demo=player'`, `1`, `1`,
      `(async()=>{const { hashPin } = await import('/cup/engine.js'); const code=__copa.estado.code;
        const k='juegos-de-salon:copa:prueba', db=JSON.parse(localStorage.getItem(k));
        db[code]._keys.javi02 = await hashPin(code, 'javi02', '4321'); db[code]._seats.javi02 = {};
        localStorage.setItem(k, JSON.stringify(db)); location.href='/cup/?'+code+'&test&day=4'})()`,
      `1`, `1`, `window.confirm=()=>true; document.getElementById('btn-empezar').click()`, `1`],
    // The board's open day card: "until 23:59 tomorrow (48 h)" under the game's name (every day but the final)
    board: [`location.href='/cup/?test&demo=player'`, `1`, `1`, `document.querySelector('button[data-dia]')?.scrollIntoView({ block: 'center' })`],
    // The unused wildcard on the final's day (D-444): day 6 in "Tus días" with ×2 auto, and its result screen saying why
    // Day 6 not played, wildcard unused: the notice on the day card and on its cover (D-444)
    'wild-today': [`location.href='/cup/?test&demo=last-day'`, `1`, `1`, `document.getElementById('comodin-hoy')?.scrollIntoView({ block: 'center' })`],
    'wild-today-cover': [`location.href='/cup/?test&demo=last-day'`, `1`, `1`, `document.querySelector('button[data-dia]').click()`, `1`, `document.getElementById('btn-empezar')?.scrollIntoView({ block: 'end' })`],
    'wild-today-three': [`location.href='/cup/?test&demo=last-day-three'`, `1`, `1`, `document.getElementById('comodin-hoy')?.scrollIntoView({ block: 'center' })`],
    'wild-auto': [`location.href='/cup/?test&demo=final'`, `1`, `1`, `document.querySelector('.mis-dias')?.scrollIntoView({ block: 'end' })`],
    'wild-auto-result': [`location.href='/cup/?test&demo=final'`, `1`, `1`, `[...document.querySelectorAll('.md-fila')][5].click()`, `1`],
    // Out of the cup (D-347): the notice on top of the board, and the grey row in the table
    out: [`location.href='/cup/?test&demo=out'`, `1`, `1`],
    'out-table': [`location.href='/cup/?test&demo=out'`, `1`, `1`, `document.querySelector('.fila.fuera')?.scrollIntoView({ block: 'center' })`],
    // One missed day away from it: the warning
    risk: [`location.href='/cup/?test&demo=risk'`, `1`, `1`],
    // A day's cover (antesDeJugar): ‹ Menú top left goes back to the board
    cover: [`location.href='/cup/?test&demo=player'`, `1`, `1`, `document.querySelector('button[data-dia]').click()`, `1`],
    'cover-back': [`location.href='/cup/?test&demo=player'`, `1`, `1`, `document.querySelector('button[data-dia]').click()`, `1`, `document.getElementById('btn-menu').click()`, `1`],
    // La Copa's 🐞 form, from the cup's screen (D-306: without the context dropdown)
    report: [`location.href='/cup/?test&demo=player'`, `1`, `1`, `document.getElementById('btn-reporte').click()`, `1`],
    // The feedback form (buzon-form.js, D-345) with the inbox's texts, in the layer the 🐞 or "Sugerencias y comentarios" opens
    feedback: [`(async()=>{const {COMMON}=await import('/assets/js/i18n.js');const {abrirComentario}=await import('/assets/js/labs-idioma.js');
      const C=COMMON[document.documentElement.lang]||COMMON.es;abrirComentario({T:C.buzon,enviar:async()=>{},contexto:{}});})()`, `1`],
  },
  dudo: {
    intro: [],
    // The folded rules, open, with the setup's two switches told before the last rule (D-447)
    rules: [`(()=>{const d=document.querySelector('#screen-intro details');d.open=true;document.getElementById('rules-list').scrollIntoView({block:'center'});return 1})()`],
    setup: [`document.querySelectorAll('.mode')[0].click()`],
    // The room creator's setup: the same switches travel to every phone (D-447)
    'setup-room': [`document.querySelectorAll('.mode')[1].click()`],
    // The shaking cloth (D-447) with the clock on, face down: headless Chrome has no sensor, so a button shows
    cloth: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `[...document.querySelectorAll('#setup-form .toggle-row')].find(r=>r.textContent.includes('⏱️'))?.querySelector('.switch:not(.on)')?.click()`,
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      1, 1,
    ],
    // Rolled with the button: the dice in the hand and the turn's clock running
    clock: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `[...document.querySelectorAll('#setup-form .toggle-row')].find(r=>r.textContent.includes('⏱️'))?.querySelector('.switch:not(.on)')?.click()`,
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      1, 1,
      `document.getElementById('btn-permiso')?.click()`,   // a Chrome that can ask, as an iPhone does: asked, it hears nothing and offers the button
      1, 1, 1,
      `document.getElementById('btn-tirar')?.click()`,
      1, 1, 1, 1, 1,
    ],
    // Out of time: the clock moved to its last second, and the screen that says a die is lost
    'time-up': [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `[...document.querySelectorAll('#setup-form .toggle-row')].find(r=>r.textContent.includes('⏱️'))?.querySelector('.switch:not(.on)')?.click()`,
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      1,
      `window.__dudo.session().turn.used = 29700`,
      1,
    ],
    // The end after running out of time five times: the history keeps each timeout
    history: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `[...document.querySelectorAll('#setup-form .toggle-row')].find(r=>r.textContent.includes('⏱️'))?.querySelector('.switch:not(.on)')?.click()`,
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      `(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));for(let k=0;k<5;k++){await w(400);window.__dudo.session().turn.used=29700;await w(900);const h=document.getElementById('handoff');if(!h.hidden){const b=h.querySelector('.btn');b?b.click():h.click();}}})()`,
      1, 1, 1, 1, 1, 1, 1, 1,
      `(()=>{const l=document.getElementById('history-list');l.closest('details').open=true;l.scrollIntoView({block:'center'})})()`,
      1,
    ],
    // Against the phone the table is reached without a handoff screen in between
    game: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `[...document.querySelectorAll('#setup-form .toggle-row')].find(r=>r.textContent.includes('🫨'))?.querySelector('.switch.on')?.click()`,   // the table with the dice out: the shake (D-447) has its own script
      `document.querySelector('#setup-actions .btn--yellow').click()`,
    ],
    // With the face chosen the count selector appears, which is the tight part of the bar
    bid: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `[...document.querySelectorAll('#setup-form .toggle-row')].find(r=>r.textContent.includes('🫨'))?.querySelector('.switch.on')?.click()`,   // the table with the dice out: the shake (D-447) has its own script
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      `document.querySelectorAll('.pinta')[4].click()`,
    ],
    // The table is revealed: bid something absurd and doubt the phone's answer
    reveal: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `[...document.querySelectorAll('#setup-form .toggle-row')].find(r=>r.textContent.includes('🫨'))?.querySelector('.switch.on')?.click()`,   // the table with the dice out: the shake (D-447) has its own script
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      `document.querySelectorAll('.pinta')[5].click()`,
      `document.querySelector('#actions .btn--yellow').click()`,
      `1`,   // the phone takes a while to call its bid: a wait step
      `[...document.querySelectorAll('#actions .btn')].find(b=>/Dudo|Liar|Duvido|Zweifeln/i.test(b.textContent))?.click()`,
    ],
  },
  generala: {
    intro: [],
    // The folded rules, open: the three points and what each box asks for and is worth
    rules: [`(()=>{const d=document.querySelector('#screen-intro details');d.open=true;document.getElementById('boxes-list').scrollIntoView({block:'center'});return 1})()`],
    setup: [`document.querySelector('[data-mode=local]').click()`],
    // Playing solo the table is reached without a handoff: a roll, two dice kept and a box chosen
    game: [
      `document.querySelector('[data-mode=solo]').click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.getElementById('btn-empezar').click()`,
      `document.getElementById('btn-tirar').click()`,
      `(()=>{const d=document.querySelectorAll('.dado-btn');d[0].click();d[3].click()})()`,
      `document.querySelector('.casilla.libre.vale')?.click() || document.querySelector('.casilla.libre').click()`,
    ],
    // On one phone: what one scored and the handoff to the next (C-9)
    handoff: [
      `document.querySelector('[data-mode=local]').click()`,
      `(()=>{const n=['Javi','Cata'];[...document.querySelectorAll('#setup-form input')].forEach((i,k)=>{i.value=n[k];i.dispatchEvent(new Event('input',{bubbles:true}))})})()`,
      `document.getElementById('btn-empezar').click()`,
      `document.querySelector('#handoff .btn').click()`,
      `document.getElementById('btn-tirar').click()`,
      `document.querySelector('.casilla.libre').click()`,
      `document.getElementById('btn-anotar').click()`,
    ],
    // The generala on the first roll, with dice set by hand: it wins right away
    served: [
      `document.querySelector('[data-mode=local]').click()`,
      `(()=>{const n=['Javi','Cata'];[...document.querySelectorAll('#setup-form input')].forEach((i,k)=>{i.value=n[k];i.dispatchEvent(new Event('input',{bubbles:true}))})})()`,
      `document.getElementById('btn-empezar').click()`,
      `document.querySelector('#handoff .btn').click()`,
      `__generala.session().transport.send({t:'roll',from:'A',d:'44444',k:'00000'})`,
    ],
    // Dice 1-3-6-5-4 set by hand: the note that 3-4-5-6-1 is a straight (feedback #736)
    'ace-straight': [
      `document.querySelector('[data-mode=solo]').click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.getElementById('btn-empezar').click()`,
      `__generala.session().transport.send({t:'roll',from:'A',d:'13654',k:'00000'})`,
    ],
    // The end of playing solo: eleven turns scored in the first free box
    final: [
      `document.querySelector('[data-mode=solo]').click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.getElementById('btn-empezar').click()`,
      `(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));for(let t=0;t<11;t++){document.getElementById('btn-tirar').click();await w(60);document.querySelector('.casilla.libre').click();await w(30);document.getElementById('btn-anotar').click();await w(60);}})()`,
      1, 1, 1, 1, 1,
    ],
  },
  'cuarto-rey': {
    intro: [],
    players: [`document.getElementById('btn-go-setup').click()`],
    // With six rows you can see whether the list grows evenly and the bottom bar still fits
    'players-6': [
      `document.getElementById('btn-go-setup').click()`,
      `document.getElementById('btn-add-player').click()`,
      `document.getElementById('btn-add-player').click()`,
    ],
    table: [
      `document.getElementById('btn-go-setup').click()`,
      `[...document.querySelectorAll('#players-form input')].forEach((i,k)=>{i.value=['Javi','Cata','Pancho','Fran'][k];i.dispatchEvent(new Event('input',{bubbles:true}))})`,
      `document.getElementById('btn-start').click()`,
    ],
    // The handoff (C-9): "¡Salud!" and "Pásale el celular a X" on a single screen. The worst case:
    // an Ace with six long-named players, which is six chips plus the handoff. A saved game is
    // left with the Ace on top of the deck and resumed.
    handoff: [
      `(()=>{const n=['Francisca','Maximiliano','Catalina','Sebastián','Valentina','Bartolomé'];const deck=[{rank:'5',suit:'♣',color:'black'},{rank:'A',suit:'♥',color:'red'}];localStorage.setItem('juegos-de-salon:cuarto-rey:session',JSON.stringify({v:1,game:'cuarto-rey',at:Date.now(),mode:'local',state:{players:n.map((name,i)=>({name,gender:'mfx'[i%3]})),deck,turn:0,kings:0,drawn:0,sorbos:n.map(()=>0),fondos:n.map(()=>0),history:[],current:null,finished:false,victim:null,startedAt:Date.now()}}));location.reload()})()`,
      `document.querySelector('#resume-slot .btn--cyan').click()`,
      `document.getElementById('card').click()`,
      `1`,
      `document.querySelector('#result .actions .btn').click()`,
    ],
  },
  julepe: {
    intro: [],
    setup: [`document.querySelectorAll('.mode')[0].click()`],
    // Against the phone the table is reached without a handoff screen in between
    declaration: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.querySelector('#setup-actions .btn--yellow').click()`,
    ],
    // The swap: with one card marked, which is when the hand looks most crowded. The `1` steps are
    // waits: the device's rivals declare and swap first, and take their time on purpose.
    swap: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      `document.querySelector('#actions .btn--yellow')?.click()`,
      `1`, `1`, `1`,
      `document.querySelectorAll('#mine .pcard')[0]?.click()`,
    ],
    // The trick: up to the first card, where the dimmed ones and the why below show up
    trick: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.querySelector('#setup-actions .btn--yellow').click()`,
      `document.querySelector('#actions .btn--yellow')?.click()`,
      `1`, `1`, `1`,
      `document.querySelector('#actions .btn--yellow')?.click()`,
      `1`, `1`, `1`,
      `document.querySelector('#mine .pcard:not(.off)')?.click()`,
    ],
  },
  ahorcado: {
    intro: [],
    setup: [`document.querySelectorAll('.mode')[0].click()`],
    write: [
      `document.querySelectorAll('.mode')[0].click()`,
      `[...document.querySelectorAll('#setup-form .player-row input')].forEach((i,k)=>{i.value=['Javi','Cata'][k];i.dispatchEvent(new Event('input',{bubbles:true}))})`,
      `document.querySelector('#setup-actions .btn').click()`,
      `document.querySelector('#cover button')?.click()`,
    ],
    game: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.querySelector('#setup-actions .btn').click()`,
    ],
    'game-chat': [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.querySelector('#setup-actions .btn').click()`,
      // The room brings chat; here it is turned on by hand to see how it lives with the bar
      `(()=>{document.body.classList.add('chat-on');const m=document.getElementById('chat');m.className='chat';m.hidden=false;m.innerHTML='<button class="chat-fab">💬</button>'})()`,
    ],
    result: [
      `document.querySelectorAll('.mode')[2].click()`,
      `(()=>{const i=document.querySelector('#setup-form input');i.value='Javi';i.dispatchEvent(new Event('input',{bubbles:true}))})()`,
      `document.querySelector('#setup-actions .btn').click()`,
      // It plays itself to the end: what matters here is the screen, not the game. Each move
      // carries its number, which is what the reducer uses to discard repeats.
      `(()=>{const s=window.__ahorcado.view();const w=(s.words.A||'').toUpperCase();
        let n=0; for (const l of new Set(w.split(''))) if (l!==' ')
          window.__ahorcado.session().transport.send({t:'guess',from:'A',letter:l,n:n++,ms:100});})()`,
      `(()=>{for(let i=0;i<4;i++){const h=document.getElementById('handoff');if(h.hidden)break;const b=h.querySelector('button');b?b.click():h.click()}})()`,
    ],
  },
  /**
   * Batalla Naval against the phone: the phone always opens (`starter` is B), so to look at a
   * specific screen the turn has to be moved by hand. `BS_HOLD` cuts the shot timer and leaves it
   * taken, so it isn't armed again; `BS_MISS(role)` shoots at the other's water, which is known
   * because both fleets live in the session. That way both turn screens always come out the
   * same instead of depending on where the bot aimed.
   */
  'batalla-naval': {
    intro: [],
    // Against the phone the board is reached without a handoff screen in between
    placement: [...BS_CPU],
    // My turn: the bar in lime and the rival's board lit (D-92)
    game: [...BS_CPU, ...BS_SAIL, BS_HOLD, BS_MISS('B')],
    // The rival's turn: the bar off and the board too (D-92)
    waiting: [...BS_CPU, ...BS_SAIL, BS_HOLD, BS_MISS('B'), BS_MISS('A')],
  },
  /**
   * Toque y Fama playing solo: La Copa's 🔢 game (D-142). For the result it plays itself: one
   * wrong guess and the right one, which comes from the saved code with the same engine.
   */
  'toque-y-fama': {
    intro: [],
    solo: [`document.querySelectorAll('.mode')[2].click()`],
    'solo-game': [`document.querySelectorAll('.mode')[2].click()`, `document.getElementById('btn-solo-empezar').click()`],
    'solo-result': [
      `document.querySelectorAll('.mode')[2].click()`,
      `document.getElementById('btn-solo-empezar').click()`,
      `(async()=>{const m=await import('../cup/games/number/engine.js');const s=m.generar(__tyf.guardada().codigo,1).secreto;
        const guess=n=>{for(const d of n)[...document.querySelectorAll('.screen.active .keypad button')].find(x=>x.textContent===d).click();document.querySelector('.screen.active .keypad .ok').click()};
        guess(s==='0123'?'4567':'0123');guess(s);})()`,
      `document.getElementById('btn-fin').click()`,
      `1`, `1`, `1`, `1`,   // let the confetti pass
    ],
    // The inbox (D-345): the same result on a device past its first 2 games, the link after the
    // buttons, and the form unfolded in place with a kind picked
    'inbox-link': [INBOX_SEED, ...TYF_RESULT],
    'inbox-form': [INBOX_SEED, ...TYF_RESULT, `document.getElementById('btn-buzon').click()`, `1`, `document.querySelector('.buzon-tipo[data-tipo="idea"]').click()`],
  },
  /**
   * Línea de Tiempo playing solo: La Copa's ⏳ Línea Relámpago (D-142). For the result it is
   * played whole, the first card wrong and the rest right, with the same engine that deals it.
   */
  'linea-de-tiempo': {
    intro: [],
    solo: [`[...document.querySelectorAll('.mode')].find(m=>/solo|alone|sozinho|allein/i.test(m.textContent)).click()`],
    'solo-game': [`[...document.querySelectorAll('.mode')].find(m=>/solo|alone|sozinho|allein/i.test(m.textContent)).click()`, `document.getElementById('btn-solo-empezar').click()`],
    'solo-result': [
      `[...document.querySelectorAll('.mode')].find(m=>/solo|alone|sozinho|allein/i.test(m.textContent)).click()`,
      `document.getElementById('btn-solo-empezar').click()`,
      `(async()=>{const L=await import('../cup/games/timeline/engine.js');const s=__ldt.solo();const p=L.generar(s.codigo,1,{tema:s.tema,excluir:s.skip});
        let j=[];for(const c of p.mano){const l=L.estado(p,j).linea;const right=L.huecoCorrecto(l,c);j=[...j,{c:c.id,at:j.length?right:(right?0:l.length)}];}
        const waitFor=async f=>{for(let i=0;i<40&&!f();i++)await new Promise(r=>setTimeout(r,50));return f();};
        for(const x of j){(await waitFor(()=>document.getElementById('handoff').hidden&&document.querySelector('#solo-juego .hand .card[data-card="'+x.c+'"]'))).click();
          document.querySelector('#solo-juego .line .slot[data-slot="'+x.at+'"]').click();document.getElementById('btn-colocar').click();document.getElementById('handoff').click();}})()`,
      `1`, `1`, `1`, `1`,   // the nine moves keep going on their own meanwhile
      `document.getElementById('btn-fin').click()`,
      `1`, `1`, `1`, `1`,   // let the confetti pass
    ],
  },
  /**
   * Tango standalone, La Copa's ☀️ game. `game` is the board full but one cell, to compare the
   * given sun with the played one (#61); `clash`, full with a last sun that clashes, which is the
   * only clash visible without touching another cell (#135).
   */
  stick: { intro: [], game: [START, `1`, `1`, `1`, `1`] },
  stack: { intro: [], game: [START, `1`, `1`, `1`, `1`] },
  puentes: {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`],
  },
  tango: {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, TANGO_FILL(false)],
    clash: [START, `1`, `1`, `1`, `1`, TANGO_FILL(true), `new Promise(r => setTimeout(r, 1700))`],
    // The button row with a two-tap button armed: Undo, Clear all and the hint each keep their line (D-342)
    'clear-armed': [START, `1`, `1`, `1`, `1`, TANGO_FILL(false), `document.getElementById('btn-borrar')?.click()`],
    'hint-armed': [START, `1`, `1`, `1`, `1`, TANGO_FILL(false), `[...document.querySelectorAll('.tango-acciones .btn')].find(b => b.textContent.includes('💡'))?.click()`],
  },
  /**
   * 🔍 The case of the day. `clues` is the case half solved, with what can be deduced marked
   * until there are clues crossed out on their own (D-282) and one more crossed out by hand with the ✓.
   */
  caso: {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, `1`, `1`],
    clues: [START, `1`, `1`, `1`, `1`, `1`, `1`,
      `(async()=>{const m=await import('/cup/games/case/engine.js');const s=__copa.estado.juego.semilla;const p=m.generar(s,1);
        const plays=()=>(JSON.parse(localStorage.getItem('juegos-de-salon:diario:caso:'+s)||'null')||{}).jugadas||[];
        for(let k=0;k<12;k++){const e=m.estado(p,plays());if(m.usadas(p,e.x).size>=3)break;const d=m.deducibles(e.pistas,e.x);const [i,v]=Object.entries(d)[0]||[];if(i===undefined)break;
          document.querySelector('.cs-persona[data-i="'+i+'"]').click();document.getElementById(+v?'btn-criminal':'btn-inocente').click();}
        [...document.querySelectorAll('.cs-pista:not(.tachada) .tachar')].at(-1)?.click();document.body.click();})()`,
      `1`, `1`, `1`, `1`,   // let the stamp and the hit message go away
    ],
  },
  /**
   * The owner's panel is not a game, but it is looked at the same way: `window.__panel.seed`
   * draws it with seeded data, without signing in with Google or touching the database (C-14).
   * The data deliberately bring a game (`juego-nuevo`), a mode (`equipos`) and a language (`fr`)
   * that are not in the registry: so you can see at once that the panel shows them anyway (C-16).
   *
   * The cups are built with the real engine (`nuevaMeta`): one mid-week with someone playing
   * now, one starting today, a lab one, a finished one and one yet to start. Each shot opens a
   * section or a card by its route (D-207); `data` is the audience one.
   */
  panel: {
    ...Object.fromEntries([['data', '/users'], ['now', '/now'], ['summary', '/summary'], ['timeline', '/timeline'], ['tournament', '/cup'], ['games', '/group'], ['group', '/group'], ['individual', '/individual'], ['daily', '/daily'], ['users', '/users'], ['audience', '/users'],
      ['cup-card', '/cup/OFICI'], ['game-card', '/game/liars-dice'], ['room-card', '/room/CPSV'], ['traffic', '/traffic'], ['health', '/health'], ['campaigns', '/campaigns'], ['feedback', '/feedback']].map(([shot, view]) => [shot, [SEED_PANEL(view)]])),
    // 📣 Campaigns' other two tabs (D-477)
    ...Object.fromEntries([['campaigns-features', 1], ['campaigns-skins', 2]].map(([shot, i]) => [shot, [SEED_PANEL('/campaigns'), `document.querySelectorAll('.campanas-tabs button')[${i}].click()`]])),
    // A splash card's Quick look, opened
    'campaigns-peek': [SEED_PANEL('/campaigns'), ...Array(6).fill(PEEK), `1`, `1`],
    // Where an owner's release notification lands (D-504): that campaign open, ringed and in view
    'campaigns-link': [SEED_PANEL('/campaigns/splash/stack-pronto')],
    // The other two tabs of a cup's card (D-207)
    'cup-days': [SEED_PANEL('/cup/OFICI'), `[...document.querySelectorAll('.subtabs button')][1].click()`],
    'cup-history': [SEED_PANEL('/cup/OFICI'), `[...document.querySelectorAll('.subtabs button')][2].click()`],
  },
  /**
   * Reinas, besides the freshly started board: with two moves, to see the row of ↩️ Deshacer,
   * 🧹 Borrar todo and 🏳️ Rendirse lit (D-283), and with Borrar todo armed, its longest text.
   */
  reinas: {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, `1`, `1`],
    moves: [START, `1`, `1`, `1`, `1`, `1`, `document.querySelector('.rej[data-i="0"]').click()`, `document.querySelector('.rej[data-i="3"]').click()`],
    clear: [START, `1`, `1`, `1`, `1`, `1`, `document.querySelector('.rej[data-i="0"]').click()`, `document.getElementById('btn-borrar').click()`],
  },
  /**
   * ¿En qué año?: the board, the year typed with a. C. on (its label after the boxes) and the
   * reveal of that answer ("Tu respuesta: 622 a. C.", the friend's report that led to it).
   */
  anio: {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, `1`, `1`],
    // HAAAA draws Historia, the only theme with the a. C. switch (D-326)
    bc: [`location.search = '?seed=HAAAA'`, `1`, `1`, `1`, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, ...'622'.split('').map(d => `document.querySelector('.keypad [data-d="${d}"]').click()`), `document.getElementById('btn-ac').click()`],
    // HAAAA draws Historia, the only theme with the a. C. switch (D-326)
    reveal: [`location.search = '?seed=HAAAA'`, `1`, `1`, `1`, `1`, START, `1`, `1`, `1`, `1`, `1`, `1`, ...'622'.split('').map(d => `document.querySelector('.keypad [data-d="${d}"]').click()`), `document.getElementById('btn-ac').click()`, `document.querySelector('.keypad .ok').click()`, `1`, `1`],
  },
  /**
   * The lab games that are not La Copa's are asked for by their folder: `look` opens `/<key>/`
   * when the key is not an id in the registry: the lab's home page, Agents (D-286) and Exploding
   * numbers (D-297). Paint mines, Broken routes and Plots left the lab (D-332): they are La Copa's.
   */
  labs: {
    intro: [],
    // La Bodega folded to its title, and with El caso open
    cellar: [`document.getElementById('bodega').scrollIntoView(); 1`],
    'cellar-open': [`document.querySelector('#seccion-caso summary').click(); document.getElementById('bodega').scrollIntoView(); 1`],
    // Cuarto Rey's card, in La Bodega since D-420
    'cellar-king': [`document.querySelector('#seccion-cuarto-rey summary').click(); document.getElementById('seccion-cuarto-rey').scrollIntoView(); 1`],
    // Julepe's card, in La Bodega since D-434
    'cellar-julep': [`document.querySelector('#seccion-julepe summary').click(); document.getElementById('seccion-julepe').scrollIntoView(); 1`],
    // The home footer's sunset card, in La Bodega's launched improvements since it left the lab
    'cellar-footer': [`document.querySelector('#seccion-pie summary').click(); document.getElementById('seccion-pie').scrollIntoView(); 1`],
  },
  'labs/exploding-numbers': {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, `1`, `1`],
  },
  // Aletazo: the cover over its demo, then Jugar and the first flap (the bird in the air, the HUD up)
  'labs/flap': {
    intro: [],
    game: [`document.getElementById('btn-jugar').click()`, `document.getElementById('escenario').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`, `1`],
  },
  'labs/dominorama': {
    intro: [],
    game: [START, `1`, `1`, `1`, `1`, `1`, `1`],
  },
  // The Uno al día points lab: a click-through prototype; each step opens one screen
  'labs/daily-score': {
    intro: [],
    hub: [`document.querySelector('[data-ir="hub"]').click(); document.getElementById('telefono').scrollIntoView(); 1`],
    rules: [`document.querySelector('[data-ir="hub"]').click(); 1`, `document.querySelector('[data-ir="reglas"]').click(); document.getElementById('telefono').scrollIntoView(); 1`],
    champion: [`document.querySelector('[data-ir="hub"]').click(); 1`, `[...document.querySelectorAll('button')].find(b => /Campe/.test(b.textContent))?.click(); document.getElementById('telefono').scrollIntoView(); 1`],
  },
  // Uno al día with its points (D-414): the page as a first visit sees it (its landing: Jugar is
  // checked above the fold, U-39), with a week played (seeded, then reloaded), the rules, a day's
  // details open under the calendar, and the footer
  today: {
    intro: [],
    hub: [UAD_SEED, `1`],
    rules: [UAD_SEED, `1`, `document.getElementById('btn-uad-reglas')?.click(); 1`],
    day: [UAD_SEED, `1`, `document.querySelector('#uad-cal button.l1, #uad-cal button.l2, #uad-cal button.l3')?.click(); document.getElementById('uad-calendario')?.scrollIntoView(); 1`],
    footer: [UAD_SEED, `1`, `document.getElementById('uad-pie')?.scrollIntoView({ block: 'end' }); 1`],
  },
};

/**
 * La Copa's standalone games that have no path of their own (D-199): the lobby and the freshly
 * started game. With this the language tests go through all of them, and `look` opens them too.
 */
for (const { id } of SUELTOS) {
  PATHS[id] ||= { intro: [], game: [START, `1`, `1`, `1`, `1`, `1`, `1`] };
}

/**
 * The inbox (D-345, U-38) on every kind of ending: the same result as its own path, on a device
 * past its first 2 games, scrolled to the link. `inbox-podium` is La Copa's podium (demo),
 * `inbox-end` Fourth King's last king and `inbox-home` the home page footer's form.
 */
const TO_LINK = `document.getElementById('buzon-pie')?.scrollIntoView({ block: 'center' })`;
for (const [game, screen] of [['ahorcado', 'result'], ['generala', 'final'], ['linea-de-tiempo', 'solo-result'], ['caso', 'result'], ['pintaminas', 'result']]) {
  if (PATHS[game]?.[screen]) PATHS[game][`inbox-${screen}`] = [INBOX_SEED, ...PATHS[game][screen], `1`, TO_LINK];
}
PATHS.copa['inbox-podium'] = [INBOX_SEED, `location.href='/cup/?test&demo=podium'`, `1`, `1`, `1`, TO_LINK];
PATHS['cuarto-rey']['inbox-end'] = [INBOX_SEED,
  `(()=>{const n=['Javi','Cata','Pancho'];const deck=[{rank:'5',suit:'♣',color:'black'},{rank:'K',suit:'♥',color:'red'}];localStorage.setItem('juegos-de-salon:cuarto-rey:session',JSON.stringify({v:1,game:'cuarto-rey',at:Date.now(),mode:'local',state:{players:n.map((name,i)=>({name,gender:'mfx'[i%3]})),deck,turn:0,kings:3,drawn:20,sorbos:n.map(()=>2),fondos:n.map(()=>0),history:[],current:null,finished:false,victim:null,startedAt:Date.now()}}));location.reload()})()`,
  `document.querySelector('#resume-slot .btn--cyan').click()`, `document.getElementById('card').click()`, `1`, `1`,
  `document.querySelector('#result .actions .btn')?.click()`, `1`, `1`, TO_LINK];
PATHS.copa['inbox-home'] = [`location.href='/'`, `1`, `1`, `document.querySelector('.footer-buzon')?.click()`, `1`];
// "☕ Buy me a coffee" (lab): at the end of a Hangman game on a device past its first 5 games, with
// no inbox link that day, and its fixed place under the inbox in the home page footer
const SUPPORT_SEED = `localStorage.setItem('juegos-de-salon:support', JSON.stringify({ games: 5 })); localStorage.setItem('juegos-de-salon:buzon', JSON.stringify({ partidas: 0 }))`;
if (PATHS.ahorcado?.result) PATHS.ahorcado['support-result'] = [SUPPORT_SEED, ...PATHS.ahorcado.result, `1`, `document.getElementById('apoyo-pie')?.scrollIntoView({ block: 'center' })`];
PATHS.copa['support-home'] = [`location.href='/?test'`, `1`, `1`, `document.getElementById('btn-apoyo-portada')?.scrollIntoView({ block: 'center' })`, `1`];
// Its card over the page (D-449): opened from the end of the game, from the home footer, and the thank-you Stripe sends the donor back to
if (PATHS.ahorcado?.result) PATHS.ahorcado['support-sheet'] = [...PATHS.ahorcado['support-result'], `document.getElementById('btn-apoyo')?.click(); 1`];
PATHS.copa['support-sheet'] = [`location.href='/?test'`, `1`, `1`, `document.getElementById('btn-apoyo-portada')?.click(); 1`];
PATHS.copa['support-thanks'] = [`location.href='/?support=thanks&test'`, `1`, `1`, `1`];

/**
 * Each promotional splash campaign over the home page (D-351), as `?splash=<id>` shows it: with
 * this the language tests go through every campaign, and `look.mjs splash <id>` opens one (D-355).
 */
PATHS.splash = Object.fromEntries(Object.keys(CAMPAIGNS).map(id => [id, [`location.href='/?splash=${id}'`, `1`, `1`, `1`]]));

/** The home page share sheet (D-410): the Short in its tab, and the two ways to share under it. */
PATHS.copa['share-sheet'] = [`location.href='/?test'`, `1`, `1`, `document.getElementById('btn-compartir-portada')?.click()`, `1`];
// Dudo's card on the home page, centered: its tagline wraps longest in Spanish (D-447)
PATHS.copa['home-card-dudo'] = [`location.href='/?test'`, `1`, `1`, `[...document.querySelectorAll('.game-card')].find(c=>c.querySelector('h2')?.textContent.match(/dudo|liar|mentiroso|lügen/i))?.scrollIntoView({ block: 'center' })`, `1`];
// Toque y Fama's single card on the home page, with 🔤 Palabra inside (#767)
PATHS.copa['home-card-tyf'] = [`location.href='/?test'`, `1`, `1`, `[...document.querySelectorAll('.game-card')].find(c=>c.querySelector('h2')?.textContent.match(/toque|bulls|bullen/i))?.scrollIntoView({ block: 'center' })`, `1`];
// Rankings, with "Tus partidas" folded with its total when the player has plays (#783)
PATHS.copa['records'] = [`location.href='/records/'`, `1`, `1`, `1`];
// The privacy page (D-463), linked from the home page footer and the email note of every feedback form
PATHS.copa['privacy'] = [`location.href='/privacy/'`, `1`, `1`, `1`];

// The cover's «Cómo se juega», opened (collapsed by default, U-39)
for (const g of ['ahorcado', 'batalla-naval', 'toque-y-fama']) {
  if (PATHS[g]) PATHS[g]['intro-rules'] = [`document.querySelector('details.panel').open=true; document.querySelector('details.panel').scrollIntoView({block:'start'}); 1`, `1`];
}
