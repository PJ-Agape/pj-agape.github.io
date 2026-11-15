// ¡Última! — juego de cartas sincronizado: cada uno juega desde su celular.
// Se crea una sala con un código de 4 letras; los demás entran con el código o el QR.
// Todo vive en un documento (partidas/{CÓDIGO}) que escuchan todos los teléfonos.
// Solo quien tiene el turno escribe la partida; «¡Última!» y «¡Pillar!» tocan campos aparte.
//
// Cartas: 4 colores de Ágape (azul, naranja, dorado, celeste), números 0–9, Salta, Reversa,
// Roba 2, Cambio de color y Roba 4. Gana quien se queda sin cartas.
import { esc, icon, toast } from "./util.js";
import * as E from "./estudio.js";

let ctx = null; // { actions, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
const me = () => ctx.cloud.myUid();

// ---------------------------------------------------------------------------
// Cartas
// ---------------------------------------------------------------------------
export const COLORS = { a: ["Azul", "#3d6bf0"], n: ["Naranja", "#f4562a"], d: ["Dorado", "#ffc93c"], c: ["Celeste", "#9fd8ff"] };
const VAL_NAME = { S: "Salta", R: "Reversa", D: "Roba 2", C: "Cambio de color", 4: "Roba 4" };
const colorOf = (c) => c[0];
const valOf = (c) => c.slice(1);
const isWild = (c) => c[0] === "w";
const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function newDeck() {
  const d = [];
  for (const col of Object.keys(COLORS)) {
    d.push(col + "0");
    for (let k = 1; k <= 9; k++) d.push(col + k, col + k);
    for (const v of ["S", "R", "D"]) d.push(col + v, col + v);
  }
  for (let k = 0; k < 4; k++) d.push("wC", "w4");
  return shuffle(d);
}
export const canPlay = (card, g) => isWild(card) || colorOf(card) === g.color || (!isWild(g.top) && valOf(card) === valOf(g.top));
const cardLabel = (c) => (isWild(c) ? VAL_NAME[valOf(c)] : `${VAL_NAME[valOf(c)] || valOf(c)} ${COLORS[colorOf(c)][0].toLowerCase()}`);

const SVG = {
  S: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5 17.5 6.5"/></svg>',
  R: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9h11l-3-3M19 15H8l3 3"/></svg>',
  wheel: '<svg viewBox="0 0 24 24"><path d="M12 12V3a9 9 0 0 1 9 9Z" fill="#3d6bf0"/><path d="M12 12h9a9 9 0 0 1-9 9Z" fill="#f4562a"/><path d="M12 12v9a9 9 0 0 1-9-9Z" fill="#ffc93c"/><path d="M12 12H3a9 9 0 0 1 9-9Z" fill="#9fd8ff"/><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="1.6"/></svg>',
};
function cardHTML(c, { idx = null, ok = false, small = false, color = null } = {}) {
  const v = valOf(c), wild = isWild(c), bg = wild ? (color ? COLORS[color][1] : "#1e1f3b") : COLORS[colorOf(c)][1];
  const mid = v === "S" || v === "R" ? SVG[v] : v === "C" ? SVG.wheel : v === "4" ? `<span>+4</span>` : v === "D" ? "<span>+2</span>" : `<span>${v}</span>`;
  const corner = v === "S" ? "⊘" : v === "R" ? "⇄" : v === "C" ? "" : v === "D" ? "+2" : v === "4" ? "+4" : v;
  const tag = idx == null ? "div" : "button";
  return `<${tag} class="ul-card${small ? " sm" : ""}${ok ? " ok" : ""}${wild ? " wild" : ""}" style="--cc:${bg}" ${idx == null ? "" : `type="button" data-action="ulPlay" data-i="${idx}" ${ok ? "" : 'aria-disabled="true"'}`} aria-label="${esc(cardLabel(c))}">
    <i class="ul-corner">${corner}</i><b class="ul-mid">${mid}</b><i class="ul-corner br">${corner}</i></${tag}>`;
}

// ---------------------------------------------------------------------------
// Estado de la sala
// ---------------------------------------------------------------------------
let code = "", room = null, stop = null, pickIdx = null, busy = false, err = "", tried = "";
const short = (name) => { const p = String(name || "").trim().split(/\s+/); return p[0] ? p[0] + (p[1] ? " " + p[1][0] + "." : "") : "Jugador"; };
const players = () => Object.entries(room?.players || {}).sort((a, b) => (a[1].j || 0) - (b[1].j || 0));
function curUid(g) {
  if (!g || !g.order) return "";
  const P = room.players || {};
  for (let k = 0; k < g.order.length; k++) { const u = g.order[(g.turn + k * g.dir + g.order.length * 8) % g.order.length]; if (P[u]) return u; }
  return "";
}
function nextIndex(g, from, steps = 1) {
  const P = room.players || {}, n = g.order.length;
  let i = from, moved = 0;
  while (moved < steps) { i = (i + g.dir + n) % n; if (P[g.order[i]]) moved++; if (i === from && !P[g.order[i]]) break; }
  return i;
}
function drawTo(g, uid, k) {
  for (let x = 0; x < k; x++) {
    if (!g.deck.length) { g.deck = shuffle(g.pile || []); g.pile = []; }
    if (!g.deck.length) break;
    (g.hands[uid] = g.hands[uid] || []).push(g.deck.pop());
  }
}
const clone = (o) => JSON.parse(JSON.stringify(o));

// Escribe la partida: aplica antes los castigos pendientes («¡Pillar!») y limpia los «¡Última!» viejos.
async function commit(g, extra = {}) {
  const upd = { ...extra };
  for (const [u, k] of Object.entries(room.pen || {})) { if (g.hands[u]) drawTo(g, u, +k || 2); upd["pen." + u] = ctx.cloud.partidaDel(); }
  for (const u of Object.keys(room.said || {})) if ((g.hands[u] || []).length > 1) upd["said." + u] = ctx.cloud.partidaDel();
  g.n = (g.n || 0) + 1;
  upd.g = g;
  busy = true;
  try { await ctx.cloud.partidaUpdate(code, upd); }
  catch (e) { console.warn(e); toast("No se pudo enviar la jugada. Revisa tu conexión.", ""); }
  finally { busy = false; }
}

// ---------------------------------------------------------------------------
// Vistas
// ---------------------------------------------------------------------------
export function view(q = "") {
  const want = (new URLSearchParams(q).get("sala") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  ctx.onLeave(() => { if (stop) stop(); stop = null; });
  ctx.onAfterRender(() => { if (want && want !== code && want !== tried && st().ready) { tried = want; join(want); } else paint(); });
  return `<div class="ul" id="ulRoot"></div>`;
}
function paint() {
  const root = $("#ulRoot"); if (!root) return;
  if (ctx.cloud.enabled && !st().ready) {
    root.innerHTML = `${backLink()}<div class="card" style="text-align:center;padding:30px"><h1 class="display">¡Última!</h1>
      <p class="muted" style="margin-top:8px">Para jugar con otros celulares necesitas tu cuenta de la app.</p><a class="btn btn-primary" style="margin-top:14px" href="#/perfil">Ingresar</a></div>`;
    return;
  }
  root.innerHTML = !room ? homeHTML() : room.status === "lobby" ? lobbyHTML() : gameHTML();
  if (room && room.status === "lobby") drawQR();
}
const backLink = () => `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>`;
export { ultimaArt as artSvg } from "./juegos-arte.js";
import { ultimaArt as artSvg } from "./juegos-arte.js";

function homeHTML() {
  return `${backLink()}
  <header class="imp-hero ul-hero"><span class="imp-mask" aria-hidden="true">${artSvg()}</span>
    <div><h1>¡<em>Última</em>!</h1><p>El juego de cartas de Ágape, cada uno desde su celular. Junta colores o números, castiga con un Roba 2 y no olvides gritar «¡Última!» cuando te quede una carta.</p></div></header>
  ${err ? `<div class="note" style="margin-top:12px">${esc(err)}</div>` : ""}
  <div class="ul-home">
    <section class="card stack" style="--gap:10px"><h2 class="cred-h">Crear una sala</h2><p class="small muted">Para 2 a 8 jugadores. Te damos un código para que los demás entren.</p>
      <button class="btn btn-primary imp-go" data-action="ulCreate">${icon("plus")} Crear sala</button></section>
    <section class="card stack" style="--gap:10px"><h2 class="cred-h">Entrar a una sala</h2>
      <form id="ulJoinForm" class="row" style="gap:8px" onsubmit="return false"><input class="input ul-code-in" id="ulCodeIn" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CÓDIGO" aria-label="Código de la sala">
      <button class="btn btn-gold" type="submit">Entrar</button></form></section>
  </div>
  <details class="imp-how"><summary>¿Cómo se juega?</summary><ol>
    <li>En tu turno, tira una carta del <b>mismo color</b> o del <b>mismo número o símbolo</b> que la de la mesa.</li>
    <li><b>Salta</b>: el siguiente pierde su turno. <b>Reversa</b>: cambia el sentido. <b>Roba 2</b>: el siguiente roba dos y pierde el turno.</li>
    <li><b>Cambio de color</b> se tira siempre y eliges el color. <b>Roba 4</b>: además, el siguiente roba cuatro.</li>
    <li>Si no tienes ninguna, roba una. Si sirve, la puedes tirar; si no, pasas.</li>
    <li>Cuando te quede una carta, toca <b>«¡Última!»</b>. Si se te olvida y alguien te pilla, robas dos.</li>
    <li>Gana quien se queda primero sin cartas.</li></ol></details>`;
}
function lobbyHTML() {
  const ps = players(), host = room.host === me();
  return `${backLink()}
  <div class="ul-lobby card">
    <span class="ul-kicker">Sala de ¡Última!</span>
    <div class="ul-code" aria-label="Código de la sala">${code.split("").map((c) => `<b>${c}</b>`).join("")}</div>
    <p class="small muted">Los demás entran en Juegos → ¡Última! → «Entrar a una sala», o escaneando este código:</p>
    <canvas id="ulQR" width="360" height="360" aria-label="Código QR para entrar a la sala"></canvas>
    <h2 class="cred-h">Jugadores · ${ps.length}/8</h2>
    <ul class="ul-players">${ps.map(([u, p]) => `<li><b>${esc(p.n)}</b>${u === room.host ? `<small>crea la sala</small>` : ""}${u === me() ? `<small>tú</small>` : ""}</li>`).join("")}</ul>
    ${host ? `<button class="btn btn-primary imp-go" data-action="ulStart" ${ps.length < 2 ? "disabled" : ""}>${ps.length < 2 ? "Esperando jugadores…" : `${icon("check")} Empezar con ${ps.length}`}</button>`
      : `<p class="ul-wait">Esperando que ${esc(room.players[room.host]?.n || "quien creó la sala")} empiece la partida…</p>`}
    <button class="btn btn-ghost btn-sm" data-action="ulLeave">Salir de la sala</button>
  </div>`;
}
function drawQR() {
  const cv = $("#ulQR"); if (!cv) return;
  const url = location.href.split("#")[0] + "#/juegos/ultima?sala=" + code;
  try { E.qr(cv.getContext("2d"), url, 0, 0, 360); } catch (e) { console.warn(e); cv.remove(); }
}
function gameHTML() {
  const g = room.g, mine = (g.hands[me()] || []), cur = curUid(g), myTurn = cur === me() && room.status === "play";
  const ps = players().filter(([u]) => g.order.includes(u)), said = room.said || {}, pen = room.pen || {};
  const others = g.order.filter((u) => room.players[u]);
  const vuln = others.filter((u) => u !== me() && (g.hands[u] || []).length === 1 && !said[u] && !pen[u]);
  const canCall = mine.length <= 2 && mine.length > 0 && !said[me()];
  if (room.status === "end") {
    const w = room.players[g.winner]?.n || "Alguien";
    const rank = ps.map(([u, p]) => [p.n, (g.hands[u] || []).length]).sort((a, b) => a[1] - b[1]);
    return `${backLink()}<div class="ul-end card"><span class="ul-kicker">¡Terminó la partida!</span>
      <h1 class="ul-win">${g.winner === me() ? "¡Ganaste!" : `¡Ganó ${esc(w)}!`}</h1>
      <ol class="ul-rank">${rank.map(([n, k]) => `<li><b>${esc(n)}</b><span>${k ? `${k} carta${k > 1 ? "s" : ""}` : "sin cartas"}</span></li>`).join("")}</ol>
      ${room.host === me() ? `<button class="btn btn-primary imp-go" data-action="ulStart">${icon("undo")} Jugar otra vez</button><button class="btn btn-ghost btn-sm" data-action="ulClose">Cerrar la sala</button>`
        : `<p class="ul-wait">Esperando la revancha…</p><button class="btn btn-ghost btn-sm" data-action="ulLeave">Salir de la sala</button>`}</div>`;
  }
  const curName = room.players[cur]?.n || "";
  const lastTxt = g.last ? (g.last.t === "play" ? `${esc(room.players[g.last.u]?.n || "")} tiró ${esc(cardLabel(g.last.c))}` : g.last.t === "draw" ? `${esc(room.players[g.last.u]?.n || "")} robó una carta` : g.last.t === "pass" ? `${esc(room.players[g.last.u]?.n || "")} pasó` : g.last.t === "skip" ? `Se saltó el turno de ${esc(room.players[g.last.u]?.n || "")}` : "¡Empieza la partida!") : "";
  return `<div class="ul-game ${myTurn ? "is-mine" : ""}" style="--tc:${COLORS[g.color][1]}">
    <div class="ul-top"><span class="ul-code-sm">Sala ${esc(code)}</span>
      <span class="ul-dir" title="Sentido">${g.dir > 0 ? "↻" : "↺"}</span>
      <button class="btn btn-ghost btn-sm" data-action="ulLeave">Salir</button></div>
    <div class="ul-opps">${ps.filter(([u]) => u !== me()).map(([u, p]) => `<div class="ul-opp${u === cur ? " now" : ""}">
        <b>${esc(p.n)}</b><span class="ul-n">${(g.hands[u] || []).length}</span>${said[u] && (g.hands[u] || []).length === 1 ? `<em class="ul-said">¡Última!</em>` : ""}${pen[u] ? `<em class="ul-pen">+${pen[u]}</em>` : ""}</div>`).join("")}</div>
    <div class="ul-table">
      <button class="ul-deck" data-action="ulDraw" ${myTurn && !g.drew ? "" : "disabled"} aria-label="Robar una carta"><span>Robar</span><small>${g.deck.length}</small></button>
      <div class="ul-pile">${cardHTML(g.top, { color: isWild(g.top) ? g.color : null })}</div>
      <div class="ul-color" aria-label="Color en juego: ${COLORS[g.color][0]}"><i></i><span>${COLORS[g.color][0]}</span></div>
    </div>
    <p class="ul-status">${myTurn ? `<b>¡Te toca!</b> ${g.drew ? "Tira la carta que robaste o pasa." : "Tira una carta o roba."}` : `Turno de <b>${esc(curName)}</b>`}<br><small>${lastTxt}</small></p>
    <div class="ul-actions">
      ${vuln.map((u) => `<button class="btn ul-catch" data-action="ulCatch" data-u="${esc(u)}">¡Pillar a ${esc(room.players[u].n)}!</button>`).join("")}
      ${canCall ? `<button class="btn ul-call" data-action="ulCall">¡Última!</button>` : ""}
      ${myTurn && g.drew ? `<button class="btn btn-soft" data-action="ulPass">Pasar</button>` : ""}
      ${room.host === me() && !myTurn && cur ? `<button class="btn btn-ghost btn-sm" data-action="ulSkip" title="Si no está respondiendo">Saltar a ${esc(curName)}</button>` : ""}
    </div>
    <div class="ul-hand" aria-label="Tus cartas">${mine.map((c, i) => cardHTML(c, { idx: i, ok: myTurn && canPlay(c, g) && (!g.drew || i === mine.length - 1) })).join("")}</div>
    ${pickIdx != null && myTurn ? `<div class="ul-pick" role="dialog" aria-label="Elige el color"><p>Elige el color</p><div>${Object.entries(COLORS).map(([k, [l, hex]]) => `<button data-action="ulColor" data-c="${k}" style="--pc:${hex}">${l}</button>`).join("")}</div>
      <button class="btn btn-ghost btn-sm" data-action="ulPickX">Cancelar</button></div>` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
// Sala: crear, entrar, escuchar, salir
// ---------------------------------------------------------------------------
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const myEntry = () => { const a = st().account || {}; return { n: short(a.name), av: String(a.avatar || "").slice(0, 20), j: Date.now() }; };
function listen(c) {
  if (stop) stop();
  code = c; err = "";
  stop = ctx.cloud.partidaWatch(c, (data) => {
    if (!data) { if (room) toast("La sala se cerró"); room = null; code = ""; if (stop) stop(); stop = null; paint(); return; }
    if (!data.players || !data.players[me()]) { room = null; code = ""; if (stop) stop(); stop = null; paint(); return; }
    const was = room && room.g && room.g.n, mine = curUid(data.g) === me();
    room = data;
    if (data.g && data.g.n !== was && mine && data.status === "play") { try { navigator.vibrate?.(60); } catch { /* */ } }
    if (pickIdx != null && (!data.g || curUid(data.g) !== me())) pickIdx = null;
    paint();
  }, (e) => { err = e && e.code === "permission-denied" ? "Los juegos en línea estarán disponibles muy pronto." + (st().isAdmin ? " (Falta publicar las reglas de Firestore para «partidas».)" : "") : "No pudimos conectar con la sala."; room = null; code = ""; paint(); });
}
async function create() {
  for (let k = 0; k < 6; k++) {
    const c = Array.from({ length: 4 }, () => LETTERS[rnd(LETTERS.length)]).join("");
    try {
      if (await ctx.cloud.partidaExists(c)) continue;
      await ctx.cloud.partidaCreate(c, { game: "ultima", host: me(), status: "lobby", players: { [me()]: myEntry() }, g: null, said: {}, pen: {} });
      listen(c); return;
    } catch (e) {
      console.warn(e);
      err = e && e.code === "permission-denied" ? "Los juegos en línea estarán disponibles muy pronto." + (st().isAdmin ? " (Falta publicar las reglas de Firestore para «partidas».)" : "") : "No se pudo crear la sala. Revisa tu conexión.";
      paint(); return;
    }
  }
}
async function join(c) {
  c = String(c || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (c.length !== 4) { toast("El código tiene 4 letras", ""); return; }
  try {
    if (!(await ctx.cloud.partidaExists(c))) { err = `No encontramos la sala ${c}. Revisa el código.`; paint(); return; }
    await ctx.cloud.partidaUpdate(c, { ["players." + me()]: myEntry() });
    listen(c);
  } catch (e) {
    console.warn(e);
    err = e && e.code === "permission-denied" ? "No se pudo entrar: la partida ya empezó o la sala está llena." : "No se pudo entrar a la sala. Revisa tu conexión.";
    paint();
  }
}
async function leave() {
  if (!room) return;
  const c = code, others = players().filter(([u]) => u !== me());
  if (stop) stop(); stop = null;
  try {
    if (!others.length) await ctx.cloud.partidaDelete(c);
    else await ctx.cloud.partidaUpdate(c, { ["players." + me()]: ctx.cloud.partidaDel(), ...(room.host === me() ? { host: others[0][0] } : {}) });
  } catch (e) { console.warn(e); }
  room = null; code = ""; pickIdx = null; cleanHash(); paint();
}
const cleanHash = () => { if (location.hash.includes("sala=")) history.replaceState(null, "", "#/juegos/ultima"); };

// ---------------------------------------------------------------------------
// Jugadas
// ---------------------------------------------------------------------------
function deal() {
  const order = players().map(([u]) => u), deck = newDeck(), hands = {};
  for (const u of order) hands[u] = deck.splice(-7);
  let top = deck.pop();
  while (isWild(top)) { deck.unshift(top); top = deck.pop(); }
  return { deck, pile: [], top, color: colorOf(top), turn: rnd(order.length), dir: 1, order, hands, drew: false, n: 0, last: { t: "start" }, winner: null };
}
async function play(i, chosen) {
  const g = clone(room.g), mine = g.hands[me()], card = mine[i];
  if (!card || !canPlay(card, g) || (g.drew && i !== mine.length - 1)) return;
  if (isWild(card) && !chosen) { pickIdx = i; paint(); return; }
  mine.splice(i, 1);
  g.pile.push(g.top); g.top = card; g.color = isWild(card) ? chosen : colorOf(card); g.drew = false;
  g.last = { t: "play", u: me(), c: card };
  const v = valOf(card), meIdx = g.order.indexOf(me());
  let nextI;
  if (v === "R") { g.dir *= -1; nextI = nextIndex(g, meIdx, others2(g) ? 2 : 1); }
  else if (v === "S") nextI = nextIndex(g, meIdx, 2);
  else if (v === "D" || v === "4") { const victimI = nextIndex(g, meIdx, 1); drawTo(g, g.order[victimI], v === "D" ? 2 : 4); nextI = nextIndex(g, meIdx, 2); }
  else nextI = nextIndex(g, meIdx, 1);
  g.turn = nextI;
  const extra = {};
  if (!mine.length) { g.winner = me(); extra.status = "end"; }
  pickIdx = null;
  await commit(g, extra);
}
// Con dos jugadores, la Reversa funciona como Salta.
const others2 = (g) => g.order.filter((u) => room.players[u]).length === 2;
async function draw() {
  const g = clone(room.g); if (g.drew) return;
  drawTo(g, me(), 1); g.drew = true; g.last = { t: "draw", u: me() };
  await commit(g);
}
async function pass() {
  const g = clone(room.g); if (!g.drew) return;
  g.drew = false; g.turn = nextIndex(g, g.order.indexOf(me()), 1); g.last = { t: "pass", u: me() };
  await commit(g);
}

function registerActions() {
  const A = ctx.actions;
  A.ulCreate = (el) => { el.disabled = true; create(); };
  A.ulLeave = () => leave();
  A.ulClose = async () => { if (!confirm("¿Cerrar la sala para todos?")) return; const c = code; if (stop) stop(); stop = null; room = null; code = ""; try { await ctx.cloud.partidaDelete(c); } catch (e) { console.warn(e); } cleanHash(); paint(); };
  A.ulStart = async (el) => {
    if (!room || room.host !== me() || players().length < 2) return;
    el.disabled = true;
    try { await ctx.cloud.partidaUpdate(code, { g: deal(), status: "play", said: {}, pen: {} }); } catch (e) { console.warn(e); toast("No se pudo empezar", ""); el.disabled = false; }
  };
  A.ulPlay = (el) => { if (busy || !room || curUid(room.g) !== me() || el.getAttribute("aria-disabled")) return; play(+el.dataset.i); };
  A.ulColor = (el) => { if (pickIdx == null) return; play(pickIdx, el.dataset.c); };
  A.ulPickX = () => { pickIdx = null; paint(); };
  A.ulDraw = () => { if (!busy && room && curUid(room.g) === me()) draw(); };
  A.ulPass = () => { if (!busy && room && curUid(room.g) === me()) pass(); };
  A.ulCall = async () => { try { await ctx.cloud.partidaUpdate(code, { ["said." + me()]: true }); toast("¡Última!"); } catch (e) { console.warn(e); } };
  A.ulCatch = async (el) => {
    const u = el.dataset.u; el.disabled = true;
    try { await ctx.cloud.partidaUpdate(code, { ["pen." + u]: 2, ["said." + u]: true }); toast(`¡Pillaste a ${room.players[u]?.n || ""}! Roba dos.`); } catch (e) { console.warn(e); }
  };
  A.ulSkip = async () => {
    if (!room || room.host !== me()) return;
    const g = clone(room.g), cur = curUid(g); if (!cur) return;
    g.drew = false; g.turn = nextIndex(g, g.order.indexOf(cur), 1); g.last = { t: "skip", u: cur };
    await commit(g);
  };
  document.addEventListener("submit", (e) => { if (e.target.id !== "ulJoinForm") return; e.preventDefault(); join($("#ulCodeIn")?.value); });
  document.addEventListener("input", (e) => { if (e.target.id === "ulCodeIn") e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4); });
}
