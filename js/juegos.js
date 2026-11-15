// Juegos de la comunidad (en La Plaza Ágape).
// El Impostor: se juega en grupo con un solo celular que pasa de mano en mano.
// Todos ven la misma palabra secreta menos el impostor, que tiene que disimular.
// No usa internet ni guarda nada en la nube: los nombres quedan solo en este teléfono.
import { esc, icon } from "./util.js";
import { frenteArt as frenteSvg } from "./juegos-arte.js";
import { triviaArt as triviaSvg } from "./juegos-arte.js";
import { ultimaArt as ultimaSvg } from "./juegos-arte.js";
import { memArt as memSvg } from "./juegos-arte.js";
import { mjArt as mjSvg } from "./juegos-arte.js";
import { sopaArt as spSvg } from "./juegos-arte.js";
import { cwArt as cwSvg } from "./juegos-arte.js";
import { emausArt as emSvg } from "./juegos-arte.js";

let ctx = null; // { actions, render, onAfterRender, onLeave }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

// ---------------------------------------------------------------------------
// Palabras: [palabra secreta, pista para el impostor]
// ---------------------------------------------------------------------------
const TEMAS = {
  biblia: { l: "Biblia", d: "Personajes y escenas", w: [
    ["Arca de Noé", "lluvia"], ["Moisés", "desierto"], ["David y Goliat", "honda"], ["Jonás", "ballena"], ["Torre de Babel", "idiomas"],
    ["Cruce del Mar Rojo", "camino"], ["Zaqueo", "árbol"], ["Hijo pródigo", "regreso"], ["Buen samaritano", "herido"],
    ["Multiplicación de los panes", "canasta"], ["Bodas de Caná", "fiesta"], ["Última Cena", "mesa"], ["Belén", "estrella"],
    ["Reyes Magos", "regalos"], ["Adán y Eva", "jardín"], ["Daniel", "leones"], ["Sansón", "fuerza"], ["José y sus hermanos", "túnica"],
    ["Lázaro", "amigo"], ["Tomás", "tocar"], ["Diez mandamientos", "piedra"], ["Pentecostés", "viento"], ["Jesús camina sobre el agua", "lago"],
    ["Oveja perdida", "buscar"], ["Ángel Gabriel", "anuncio"], ["Juan Bautista", "río"], ["Pedro", "pescador"], ["Pesca milagrosa", "redes"],
  ] },
  santos: { l: "Santos y testigos", d: "Gente que siguió a Jesús", w: [
    ["San Alberto Hurtado", "camioneta"], ["Santa Teresa de los Andes", "cordillera"], ["San Francisco de Asís", "animales"],
    ["Madre Teresa de Calcuta", "India"], ["San Juan Pablo II", "viajes"], ["Carlo Acutis", "computador"], ["Don Bosco", "patio"],
    ["Santa Clara", "luz"], ["San Pablo", "cartas"], ["Virgen del Carmen", "escapulario"], ["Virgen de Guadalupe", "manto"],
    ["San José", "carpintero"], ["Santa Rosa de Lima", "flores"], ["San Ignacio de Loyola", "soldado"], ["Pier Giorgio Frassati", "montaña"],
    ["San Martín de Porres", "escoba"], ["Santa Mónica", "paciencia"], ["San Agustín", "inquieto"], ["San Francisco Javier", "barco"],
    ["Santa Teresita", "pequeño"], ["Laura Vicuña", "colegio"], ["El Papa", "Roma"], ["San Pedro", "llaves"], ["Santa Ana", "abuela"],
  ] },
  fe: { l: "Nuestra fe", d: "Misa, sacramentos y tiempos", w: [
    ["Bautismo", "agua"], ["Confirmación", "padrino"], ["Confesión", "perdón"], ["Eucaristía", "pan"], ["Matrimonio", "anillos"],
    ["Rosario", "cuentas"], ["Altar", "mesa"], ["Sagrario", "lámpara"], ["Cáliz", "copa"], ["Cirio pascual", "luz"], ["Agua bendita", "entrada"],
    ["Incienso", "humo"], ["Biblia", "libro"], ["Crucifijo", "pared"], ["Adviento", "espera"], ["Cuaresma", "cuarenta"], ["Domingo de Ramos", "palmas"],
    ["Navidad", "pesebre"], ["Domingo de Resurrección", "piedra"], ["Peregrinación", "caminar"], ["Procesión", "calle"], ["Monaguillo", "ayudar"],
    ["Campanas", "torre"], ["Señal de la cruz", "frente"], ["Padre Nuestro", "cielo"], ["Ave María", "saludo"], ["Homilía", "escuchar"], ["Ofrendas", "llevar"],
  ] },
  comunidad: { l: "Vida en comunidad", d: "Lo que vivimos en la pastoral", w: [
    ["Retiro", "silencio"], ["Misión", "mochila"], ["Campamento", "carpa"], ["Fogata", "noche"], ["Guitarra", "cuerdas"], ["Reunión de grupo", "círculo"],
    ["Dinámica", "juego"], ["Once compartida", "té"], ["Colecta", "monedas"], ["Kermés", "puestos"], ["Mes de María", "noviembre"],
    ["Jornada Mundial de la Juventud", "banderas"], ["Animar la misa", "micrófono"], ["Parroquia", "barrio"], ["Párroco", "bendición"],
    ["Catequesis", "sala"], ["Visita al hogar de ancianos", "abuelos"], ["Olla común", "cocinar"], ["Bus del retiro", "viaje"],
    ["Foto del grupo", "sonreír"], ["Completada", "beneficio"], ["Rifa", "números"], ["Ensayo del coro", "voces"], ["Saco de dormir", "frío"],
  ] },
};
const MIX = { l: "Mezcla", d: "Un poco de todo" };
const TIEMPOS = [[0, "Sin tiempo"], [120, "2 min"], [180, "3 min"], [300, "5 min"]];

// ---------------------------------------------------------------------------
// Ajustes (solo en este teléfono) y estado de la ronda
// ---------------------------------------------------------------------------
const KEY = "agape_impostor";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ ...cfg, used: used.slice(-60) })); } catch { /* sin almacenamiento */ } };
const saved = load() || {};
const cfg = { n: saved.n || 5, names: Array.isArray(saved.names) ? saved.names.slice(0, 20) : [], imps: saved.imps || 1, cat: saved.cat || "mix", hint: saved.hint !== false, time: saved.time ?? 180 };
let used = Array.isArray(saved.used) ? saved.used : [];
let g = null; // ronda en juego
let timer = null, left = 0;

const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
const playerName = (i) => (cfg.names[i] || "").trim() || `Jugador ${i + 1}`;

function newRound() {
  const pool = cfg.cat === "mix" ? Object.values(TEMAS).flatMap((t) => t.w.map((x) => [...x, t.l])) : TEMAS[cfg.cat].w.map((x) => [...x, TEMAS[cfg.cat].l]);
  let fresh = pool.filter((x) => !used.includes(x[0]));
  if (!fresh.length) { used = used.filter((u) => !pool.some((x) => x[0] === u)); fresh = pool; }
  const [word, hint, tema] = fresh[rnd(fresh.length)];
  used.push(word);
  const n = cfg.n, imps = new Set();
  const k = n >= 6 ? cfg.imps : 1;
  while (imps.size < k) imps.add(rnd(n));
  const others = [...Array(n).keys()].filter((i) => !imps.has(i)); // empieza alguien que no es impostor
  g = { word, hint, tema, imps: [...imps], turn: 0, phase: "pass", starter: others[rnd(others.length)], voted: null };
  save();
}
function stopTimer() { if (timer) clearInterval(timer); timer = null; }

// ---------------------------------------------------------------------------
// Vistas
// ---------------------------------------------------------------------------
export function view() {
  return `<header class="page-head"><span class="eyebrow">La Plaza Ágape</span><h1>Juegos <em>Ágape</em></h1>
      <p>Para jugar en grupo o en un rato a solas.</p></header>
    <a class="jg-card is-em" href="#/juegos/emaus">
      <span class="jg-card-art" aria-hidden="true">${emSvg()}</span>
      <span class="jg-card-txt"><small>Juego de rol · 6 capítulos</small><b>Emaús</b>
        <span>El arte de encontrarnos: sábado a sábado haces amigos, aprendes a acoger, escuchar y cuidar… y un Caminante te acompaña.</span></span>${icon("right")}</a>
    <h2 class="jg-h">Para jugar en grupo</h2>
    <a class="jg-card" href="#/juegos/impostor">
      <span class="jg-card-art" aria-hidden="true">${maskSvg()}</span>
      <span class="jg-card-txt"><small>3 a 20 jugadores · un solo celular</small><b>El Impostor</b>
        <span>Todos tienen la misma palabra… menos uno. ¿Quién está disimulando?</span></span>${icon("right")}</a>
    <a class="jg-card is-fr" href="#/juegos/frente">
      <span class="jg-card-art" aria-hidden="true">${frenteSvg()}</span>
      <span class="jg-card-txt"><small>De a 2 o en equipos · mímicas</small><b>¡En la frente!</b>
        <span>Celular en la frente, sin mirar. Tus amigos actúan la palabra y tú adivinas.</span></span>${icon("right")}</a>
    <a class="jg-card is-tv" href="#/juegos/trivia">
      <span class="jg-card-art" aria-hidden="true">${triviaSvg()}</span>
      <span class="jg-card-txt"><small>Para jugar solo o entre todos</small><b>Trivia Ágape</b>
        <span>¿Cuánto sabes de nuestra comunidad, el Camino, la app y la fe?</span></span>${icon("right")}</a>
    <a class="jg-card is-ul" href="#/juegos/ultima">
      <span class="jg-card-art" aria-hidden="true">${ultimaSvg()}</span>
      <span class="jg-card-txt"><small>2 a 8 jugadores · cada uno con su celular</small><b>¡Última!</b>
        <span>El juego de cartas de Ágape. Junta colores, lanza un Roba 2 y no olvides avisar tu última carta.</span></span>${icon("right")}</a>
    <h2 class="jg-h">Para jugar solo</h2>
    <div class="jg-solo">
    <a class="jg-card jg-mini is-mem" href="#/juegos/memorice">
      <span class="jg-card-art" aria-hidden="true">${memSvg()}</span>
      <span class="jg-card-txt"><small>Con los stickers</small><b>Memorice</b>
        <span>Da vuelta las cartas y encuentra las parejas.</span></span>${icon("right")}</a>
    <a class="jg-card jg-mini is-mj" href="#/juegos/mahjong">
      <span class="jg-card-art" aria-hidden="true">${mjSvg()}</span>
      <span class="jg-card-txt"><small>Con los personajes</small><b>Mahjong</b>
        <span>Libera el tablero juntando fichas iguales.</span></span>${icon("right")}</a>
    <a class="jg-card jg-mini is-sp" href="#/juegos/sopa">
      <span class="jg-card-art" aria-hidden="true">${spSvg()}</span>
      <span class="jg-card-txt"><small>Santos, Biblia y más</small><b>Sopa de letras</b>
        <span>Encuentra las palabras escondidas.</span></span>${icon("right")}</a>
    <a class="jg-card jg-mini is-cw" href="#/juegos/crucigrama">
      <span class="jg-card-art" aria-hidden="true">${cwSvg()}</span>
      <span class="jg-card-txt"><small>Pon a prueba lo que sabes</small><b>Crucigrama</b>
        <span>Un crucigrama nuevo en cada partida.</span></span>${icon("right")}</a>
    </div>`;
}

export function impostor() {
  ctx.onLeave(stopTimer);
  ctx.onAfterRender(paint);
  return `<div class="imp" id="impRoot"></div>`;
}

function paint() {
  const root = $("#impRoot"); if (!root) return;
  root.innerHTML = !g ? setupHTML() : ({ pass: passHTML, show: showHTML, talk: talkHTML, vote: voteHTML, end: endHTML })[g.phase]();
  if (g && g.phase === "talk") runTimer();
  root.scrollIntoView({ block: "start" });
}

function setupHTML() {
  const cats = [...Object.entries(TEMAS), ["mix", MIX]];
  return `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>
  <header class="imp-hero">
    <span class="imp-mask" aria-hidden="true">${maskSvg()}</span>
    <div><h1>El <em>Impostor</em></h1><p>Todos reciben la misma palabra secreta, menos el impostor. Den pistas sin decirla y descubran quién está disimulando.</p></div>
  </header>
  <details class="imp-how"><summary>¿Cómo se juega?</summary>
    <ol><li>Pasen el celular. Cada uno toca para ver su palabra y la oculta antes de pasarlo.</li>
      <li>Por turnos, cada uno dice <b>una palabra</b> relacionada. Ni muy obvia ni muy rara.</li>
      <li>El impostor no sabe la palabra: escucha y trata de pasar piola.</li>
      <li>Después de dos vueltas, voten. Si pillan al impostor, todavía puede ganar si adivina la palabra.</li></ol>
    <p class="muted small">Es para reírnos juntos, no para dejar mal a nadie.</p></details>

  <form id="impSetup" class="imp-setup">
    <section><h2>Jugadores</h2>
      <div class="imp-step"><button type="button" class="imp-pm" data-action="impN" data-d="-1" aria-label="Uno menos">−</button>
        <output id="impN">${cfg.n}</output><button type="button" class="imp-pm" data-action="impN" data-d="1" aria-label="Uno más">+</button></div>
      <p class="muted small">Escribe los nombres si quieres (solo el nombre). Quedan guardados solo en este teléfono.</p>
      <div class="imp-names" id="impNames">${namesHTML()}</div></section>

    <section><h2>Tema</h2><div class="imp-chips">
      ${cats.map(([k, t]) => `<label class="imp-chip"><input type="radio" name="cat" value="${k}" ${cfg.cat === k ? "checked" : ""}><span><b>${t.l}</b><small>${t.d}</small></span></label>`).join("")}</div></section>

    <section class="imp-opts">
      <label class="imp-opt" id="impImpsRow" ${cfg.n < 6 ? "hidden" : ""}><span>Impostores</span>
        <select name="imps"><option value="1" ${cfg.imps === 1 ? "selected" : ""}>1</option><option value="2" ${cfg.imps === 2 ? "selected" : ""}>2</option></select></label>
      <label class="imp-opt"><span>Tiempo para conversar</span>
        <select name="time">${TIEMPOS.map(([v, l]) => `<option value="${v}" ${cfg.time === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="imp-opt imp-check"><input type="checkbox" name="hint" ${cfg.hint ? "checked" : ""}><span>Darle una pista al impostor <small>Más fácil para quien recién empieza</small></span></label>
    </section>
    <button class="btn btn-primary imp-go" type="submit">${icon("eye")} Repartir palabras</button>
  </form>`;
}
const namesHTML = () => Array.from({ length: cfg.n }, (_, i) =>
  `<input name="nm" maxlength="18" autocomplete="off" placeholder="Jugador ${i + 1}" value="${esc(cfg.names[i] || "")}" aria-label="Nombre del jugador ${i + 1}">`).join("");

function passHTML() {
  const who = playerName(g.turn);
  return `<div class="imp-stage">
    <p class="imp-count">${g.turn + 1} de ${cfg.n}</p>
    <h2 class="imp-big">Pásale el celular a<br><b>${esc(who)}</b></h2>
    <p class="muted">Que nadie más mire la pantalla.</p>
    <button class="imp-reveal" data-action="impShow"><span>Soy ${esc(who)}</span><small>Toca para ver tu palabra</small></button>
    <button class="btn btn-ghost btn-sm" data-action="impQuit">Terminar juego</button></div>`;
}
function showHTML() {
  const imp = g.imps.includes(g.turn), last = g.turn + 1 >= cfg.n;
  return `<div class="imp-stage">
    <div class="imp-secret ${imp ? "is-imp" : ""}">
      ${imp ? `<span class="imp-secret-mask" aria-hidden="true">${maskSvg()}</span><small>Shhh…</small><b>Eres el impostor</b>
          ${cfg.hint ? `<p>Pista: <strong>${esc(g.hint)}</strong></p>` : `<p>Tema: <strong>${esc(g.tema)}</strong></p>`}
          <p class="imp-tip">Escucha a los demás y di algo que suene creíble.</p>`
        : `<small>Tu palabra es</small><b>${esc(g.word)}</b><p>Tema: ${esc(g.tema)}</p><p class="imp-tip">No la digas. Da pistas que solo entiendan los que la saben.</p>`}
    </div>
    <button class="btn btn-primary imp-go" data-action="impNext">${last ? "Listo, ¡a jugar!" : "Listo, ocultar y pasar"}</button></div>`;
}
function talkHTML() {
  return `<div class="imp-stage">
    <h2 class="imp-big">Empieza<br><b>${esc(playerName(g.starter))}</b></h2>
    <p>Por turnos, cada uno dice <b>una palabra</b> relacionada con la palabra secreta. Den dos vueltas y después voten.</p>
    ${cfg.time ? `<div class="imp-timer" id="impTimer" role="timer" aria-live="off">${fmt(left || cfg.time)}</div>` : ""}
    <button class="btn btn-primary imp-go" data-action="impVote">Ir a votar</button>
    <button class="btn btn-ghost btn-sm" data-action="impQuit">Terminar juego</button></div>`;
}
function voteHTML() {
  return `<div class="imp-stage">
    <h2 class="imp-big">¿A quién votó<br><b>la mayoría?</b></h2>
    <p class="muted">Cuenten a la una, a las dos y a las tres… ¡y apunten!</p>
    <div class="imp-voters">${Array.from({ length: cfg.n }, (_, i) => `<button class="imp-voter" data-action="impVoted" data-i="${i}">${esc(playerName(i))}</button>`).join("")}</div>
    <button class="btn btn-ghost btn-sm" data-action="impVoted" data-i="-1">No se pusieron de acuerdo</button></div>`;
}
function endHTML() {
  const names = g.imps.map(playerName), caught = g.imps.includes(g.voted), many = g.imps.length > 1;
  const who = names.map((x) => `<b>${esc(x)}</b>`).join(" y ");
  let head, txt;
  if (g.voted < 0) { head = "¡Ganó el impostor!"; txt = `Nadie se decidió. ${many ? "Los impostores eran" : "El impostor era"} ${who}.`; }
  else if (caught) { head = "¡Lo pillaron!"; txt = `${many ? `Pillaron a <b>${esc(playerName(g.voted))}</b>. El otro impostor era ${names.filter((_, i) => g.imps[i] !== g.voted).map((x) => `<b>${esc(x)}</b>`).join("")}.` : `Era ${who}.`} Última oportunidad: si adivina la palabra secreta, gana igual.`; }
  else { head = "¡Ganó el impostor!"; txt = `<b>${esc(playerName(g.voted))}</b> no era. ${many ? "Los impostores eran" : "El impostor era"} ${who}.`; }
  return `<div class="imp-stage">
    <h2 class="imp-big imp-result ${caught ? "is-win" : "is-imp"}">${head}</h2>
    <p>${txt}</p>
    <details class="imp-word"><summary>Ver la palabra secreta</summary><b>${esc(g.word)}</b></details>
    <button class="btn btn-primary imp-go" data-action="impAgain">${icon("undo")} Otra ronda</button>
    <button class="btn btn-ghost btn-sm" data-action="impQuit">Cambiar jugadores o tema</button></div>`;
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function runTimer() {
  stopTimer(); if (!cfg.time) return;
  if (!left) left = cfg.time;
  timer = setInterval(() => {
    const el = $("#impTimer"); if (!el) { stopTimer(); return; }
    left = Math.max(0, left - 1); el.textContent = left ? fmt(left) : "¡A votar!";
    if (!left) { el.classList.add("is-done"); stopTimer(); try { navigator.vibrate?.(300); } catch { /* sin vibración */ } }
  }, 1000);
}

function maskSvg() {
  return `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M8 20c8-4 16-5 24-5s16 1 24 5c0 14-6 26-14 28-4 1-6-4-10-4s-6 5-10 4C14 46 8 34 8 20Z" fill="#1e1f3b"/>
    <path d="M17 27c3-2 7-2 10 0-3 4-7 4-10 0Zm20 0c3-2 7-2 10 0-3 4-7 4-10 0Z" fill="#ffc93c"/><path d="M26 39c4 2 8 2 12 0" stroke="#f4562a" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
function readNames() { const ins = document.querySelectorAll("#impNames input"); if (ins.length) cfg.names = [...ins].map((x) => x.value.trim()); }
function registerActions() {
  const A = ctx.actions;
  A.impN = (el) => {
    readNames();
    cfg.n = Math.min(20, Math.max(3, cfg.n + Number(el.dataset.d)));
    $("#impN").textContent = cfg.n; $("#impNames").innerHTML = namesHTML();
    const row = $("#impImpsRow"); if (row) row.hidden = cfg.n < 6;
  };
  A.impShow = () => { g.phase = "show"; paint(); };
  A.impNext = () => { if (g.turn + 1 >= cfg.n) { g.phase = "talk"; left = cfg.time; } else { g.turn++; g.phase = "pass"; } paint(); };
  A.impVote = () => { stopTimer(); g.phase = "vote"; paint(); };
  A.impVoted = (el) => { g.voted = Number(el.dataset.i); g.phase = "end"; paint(); };
  A.impAgain = () => { newRound(); paint(); };
  A.impQuit = () => { stopTimer(); g = null; paint(); };
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "impSetup") return;
    e.preventDefault();
    readNames();
    const f = new FormData(e.target);
    cfg.cat = String(f.get("cat") || "mix"); cfg.imps = Number(f.get("imps") || 1); cfg.time = Number(f.get("time") || 0); cfg.hint = !!f.get("hint");
    newRound(); paint();
  });
}
