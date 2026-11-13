// Rosario en comunidad (#/rosario/sala): una sala en línea para rezar el Rosario juntos, cada uno
// desde su teléfono. Quien crea la sala recibe un código de 4 letras y un enlace para invitar.
// Una persona guía: avanza las cuentas y todos ven la misma oración al mismo tiempo. La guía se
// puede ceder a cualquiera de la sala, con o sin cuenta (sin cuenta se entra con una sesión anónima).
//
// Todo vive en un documento salas_rosario/{CÓDIGO}: { host, guia, set, i, people: { uid: { n, a } } }.
// Solo quien guía escribe el paso (i) y los misterios (set); cada uno escribe solo su propio nombre.

import { esc, icon, toast } from "./util.js";

let ctx = null;      // { actions, onAfterRender, onLeave, cloud }
let rosa = null;     // ganchos del Rosario de la Capilla: { open(set, i), apply(set, i), state() }
export function setup(c) { ctx = c; registerActions(); }
export function bind(h) { rosa = h; }

const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
const me = () => ctx.cloud.salaUid();
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const SETS = { gozosos: "Gozosos", luminosos: "Luminosos", dolorosos: "Dolorosos", gloriosos: "Gloriosos" };
const BY_DAY = ["gloriosos", "gozosos", "dolorosos", "gloriosos", "luminosos", "dolorosos", "gozosos"];
const NK = "agape_sala_nombre";
const LINK = (c) => `https://pj-agape.github.io/rosario/?sala=${c}`;
const STALE = 3.5 * 60e3; // sin señal hace más de esto: ya no está (o se le cortó)

let code = "", room = null, stop = null, hb = null, err = "", busy = false, tried = "", verGente = false, applying = false;

const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
const short = (name) => { const p = String(name || "").trim().split(/\s+/); return p[0] ? (p[0] + (p[1] ? " " + p[1][0] + "." : "")).slice(0, 40) : ""; };
const ms = (t) => (t && t.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);
const vivo = (p) => p && (!p.a || Date.now() - ms(p.a) < STALE); // sin «a» todavía = recién entró
const people = () => Object.entries(room?.people || {}).sort((a, b) => ms(a[1].j) - ms(b[1].j));
const nombreDe = (u) => (room?.people?.[u]?.n) || "Alguien";
const guiaViva = () => room && room.people && vivo(room.people[room.guia]);

export const active = () => !!room;
export const isLeader = () => !!room && room.guia === me();
export const follower = () => !!room && room.guia !== me();
export const isApplying = () => applying;

function nombreMio() {
  const a = st().account;
  if (a && a.name) return short(a.name);
  try { return localStorage.getItem(NK) || ""; } catch { return ""; }
}
const guardaNombre = (n) => { try { localStorage.setItem(NK, n); } catch {} };
const myEntry = (n) => ({ n: short(n) || "Alguien", a: ctx.cloud.rosarioTs(), j: Date.now() });

function errText(e, que) {
  const c = e && e.code;
  if (c === "auth/operation-not-allowed" || c === "auth/admin-restricted-operation")
    return "Por ahora para rezar en una sala necesitas tu cuenta de la app." + (st().isAdmin ? " (Falta activar el acceso anónimo en Firebase → Authentication.)" : "");
  if (c === "permission-denied")
    return que === "join" ? "No se pudo entrar a la sala: puede que esté llena o ya se haya cerrado." : "Las salas del Rosario estarán disponibles muy pronto." + (st().isAdmin ? " (Falta publicar las reglas de Firestore para «salas_rosario».)" : "");
  return "No pudimos conectar con la sala. Revisa tu conexión.";
}

// ---------------------------------------------------------------------------
// Página: crear o entrar
// ---------------------------------------------------------------------------
export function view(q = "") {
  const want = (new URLSearchParams(q).get("sala") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  ctx.onAfterRender(() => paint(want));
  return `<div id="rsRoot"></div>`;
}
function paint(want = "") {
  const root = $("#rsRoot"); if (!root) return;
  const n = nombreMio(), conCuenta = !!(st().account && st().account.name), today = BY_DAY[new Date().getDay()];
  const nombreIn = (id) => conCuenta ? "" : `<label class="field"><span>Tu nombre</span><input class="input" id="${id}" maxlength="30" autocomplete="given-name" placeholder="Cómo te verán los demás" value="${esc(n)}"></label>`;
  const head = `<a class="imp-back" href="#/oracion/rosario">${icon("left")} Capilla</a>
    <header class="page-head"><span class="eyebrow">Capilla Ágape</span><h1>Rosario en <em>comunidad</em></h1>
    <p>Recen juntos, cada uno desde su teléfono. Una persona guía y todos van en la misma cuenta, como en la capilla.</p></header>`;
  const errHTML = err ? `<p class="rs-err" role="alert">${esc(err)}</p>` : "";
  if (room) {
    root.innerHTML = `${head}<section class="card stack rs-card" style="--gap:10px"><h2 class="cred-h">Estás en la sala ${esc(code)}</h2>
      <p class="small muted">${people().filter(([, p]) => vivo(p)).length} rezando · guía ${esc(nombreDe(room.guia))}</p>
      <button class="btn btn-gold" data-action="rsOpen">${icon("right")} Volver al Rosario</button></section>`;
    return;
  }
  if (want) {
    root.innerHTML = `${head}${errHTML}<section class="card stack rs-card" style="--gap:12px">
      <span class="rs-code" aria-label="Sala ${esc(want)}">${want.split("").map((c) => `<b>${c}</b>`).join("")}</span>
      <h2 class="cred-h">Te invitaron a rezar el Rosario</h2>
      ${nombreIn("rsNameJ")}
      <button class="btn btn-gold imp-go" data-action="rsJoin" data-code="${esc(want)}" ${busy ? "disabled" : ""}>${icon("right")} Entrar a rezar</button>
      <p class="xs muted">${conCuenta ? "" : "No necesitas cuenta: solo tu nombre, para que los demás sepan quién reza. "}Puedes salir cuando quieras.</p></section>`;
    if (want !== tried && conCuenta && !busy) { tried = want; join(want); }
    return;
  }
  root.innerHTML = `${head}${errHTML}
    <section class="card stack rs-card" style="--gap:10px"><h2 class="cred-h">Crear una sala</h2>
      <p class="small muted">Tú guías al comienzo y puedes ceder la guía a quien quieras.</p>
      ${nombreIn("rsNameC")}
      <label class="field"><span>Misterios</span><select class="input" id="rsSet">${Object.entries(SETS).map(([k, t]) => `<option value="${k}" ${k === today ? "selected" : ""}>${t}${k === today ? " (hoy)" : ""}</option>`).join("")}</select></label>
      <button class="btn btn-gold imp-go" data-action="rsCreate" ${busy ? "disabled" : ""}>${icon("plus")} Crear sala</button></section>
    <section class="card stack rs-card" style="--gap:10px"><h2 class="cred-h">Entrar a una sala</h2>
      ${nombreIn("rsNameJ")}
      <form id="rsJoinForm" class="row" style="gap:8px" onsubmit="return false"><input class="input ul-code-in" id="rsCodeIn" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CÓDIGO" aria-label="Código de la sala">
        <button class="btn btn-primary" data-action="rsJoin" ${busy ? "disabled" : ""}>Entrar</button></form></section>`;
}
const repaint = () => { if ($("#rsRoot")) paint(new URLSearchParams((location.hash.split("?")[1]) || "").get("sala") || ""); };

function leerNombre(id) {
  if (st().account && st().account.name) return short(st().account.name);
  const v = short(($("#" + id) || {}).value || "");
  if (!v) { toast("Escribe tu nombre para que los demás sepan quién reza", ""); $("#" + id)?.focus(); return ""; }
  guardaNombre(v); return v;
}

// ---------------------------------------------------------------------------
// Sala: crear, entrar, escuchar, salir
// ---------------------------------------------------------------------------
async function create(set, i = 0, nombre = nombreMio()) {
  if (busy) return; busy = true; err = ""; repaint();
  try {
    const uid = await ctx.cloud.salaAuth();
    for (let k = 0; k < 6; k++) {
      const c = Array.from({ length: 4 }, () => LETTERS[rnd(LETTERS.length)]).join("");
      if (await ctx.cloud.rosarioExists(c)) continue;
      await ctx.cloud.rosarioCreate(c, { host: uid, guia: uid, set: SETS[set] ? set : BY_DAY[new Date().getDay()], i: Math.max(0, i | 0), people: { [uid]: myEntry(nombre) } });
      busy = false; listen(c, true); return;
    }
  } catch (e) { console.warn(e); err = errText(e, "create"); toast(err, "", 7000); }
  busy = false; repaint();
}
async function join(c, nombre = nombreMio()) {
  c = String(c || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (c.length !== 4) { toast("El código tiene 4 letras", ""); return; }
  if (busy) return; busy = true; err = ""; repaint();
  try {
    const uid = await ctx.cloud.salaAuth();
    if (!(await ctx.cloud.rosarioExists(c))) { err = `No encontramos la sala ${c}. Puede que ya haya terminado: revisa el código.`; busy = false; repaint(); return; }
    await ctx.cloud.rosarioUpdate(c, { ["people." + uid]: myEntry(nombre) });
    busy = false; listen(c, true); return;
  } catch (e) { console.warn(e); err = errText(e, "join"); }
  busy = false; repaint();
}
function listen(c, abrir) {
  if (stop) stop();
  code = c; err = "";
  let first = true;
  stop = ctx.cloud.rosarioWatch(c, (data) => {
    if (!data || !data.people || !data.people[me()]) { if (room) toast(data ? "Saliste de la sala" : "La sala se cerró. Puedes seguir rezando solo."); salir(false); return; }
    const antes = room, eraGuia = antes && antes.guia === me();
    room = data;
    if (first) { first = false; if (abrir && rosa) rosa.open(room.set, room.i); }
    if (room.guia !== me()) { applying = true; try { rosa && rosa.apply(room.set, room.i); } finally { applying = false; } }
    else if (!eraGuia && antes) { toast("Ahora guías tú el Rosario"); try { navigator.vibrate?.([60, 80, 60]); } catch {} }
    paintBar(); repaint();
  }, (e) => { err = errText(e, "join"); toast(err, "", 7000); salir(false); });
  clearInterval(hb);
  hb = setInterval(() => { if (room && code) ctx.cloud.rosarioUpdate(code, { ["people." + me() + ".a"]: ctx.cloud.rosarioTs() }).catch(() => {}); paintBar(); }, 90e3);
}
// Salir: quien guía deja la guía a quien creó la sala (si sigue) o a la primera persona que queda.
export async function leave() {
  if (!room) return;
  const c = code, r = room, u = me(), otros = people().filter(([k, p]) => k !== u && vivo(p)), todos = people().filter(([k]) => k !== u);
  salir(true);
  try {
    if (!todos.length) await ctx.cloud.rosarioDelete(c);
    else {
      const upd = { ["people." + u]: ctx.cloud.rosarioDel() };
      if (r.guia === u) upd.guia = (otros.find(([k]) => k === r.host) || otros[0] || todos[0])[0];
      await ctx.cloud.rosarioUpdate(c, upd);
    }
  } catch (e) { console.warn(e); }
}
function salir(quiet) {
  if (stop) stop(); stop = null; clearInterval(hb); hb = null;
  room = null; code = ""; verGente = false;
  if (location.hash.includes("sala=")) history.replaceState(null, "", "#/rosario/sala");
  paintBar(); if (!quiet) repaint();
}

// Quien guía avanza: se escribe el paso para todos
let pushT = null;
export function push(set, i) {
  if (!isLeader() || applying) return;
  if (room.set === set && room.i === i) return;
  room = { ...room, set, i };
  clearTimeout(pushT);
  pushT = setTimeout(() => ctx.cloud.rosarioUpdate(code, { set, i }).catch((e) => { console.warn(e); toast("No se pudo avanzar para todos. Revisa tu conexión.", ""); }), 120);
}
async function setGuia(u) {
  if (!room) return;
  try { await ctx.cloud.rosarioUpdate(code, { guia: u, ...(u === me() ? { ["people." + me() + ".a"]: ctx.cloud.rosarioTs() } : {}) }); toast(u === me() ? "Ahora guías tú" : `Ahora guía ${nombreDe(u)}`); }
  catch (e) { console.warn(e); toast("No se pudo cambiar la guía", ""); }
}

// ---------------------------------------------------------------------------
// Barra de la sala, dentro del Rosario
// ---------------------------------------------------------------------------
export function barHTML() { return `<div class="ros-sala" id="rosSala" ${room ? "" : "hidden"}></div>`; }
export function paintBar() {
  const bar = $("#rosSala"), ov = $("#rosOverlay");
  ov?.classList.toggle("ros-follow", follower());
  ov?.classList.toggle("ros-en-sala", !!room);
  const nb = ov?.querySelector("[data-action=rosSalaNew]"); if (nb) nb.hidden = !!room;
  if (!bar) return;
  if (!room) { bar.hidden = true; bar.innerHTML = ""; const f = $("#rosFollow"); if (f) f.remove(); return; }
  bar.hidden = false;
  const ps = people(), vivos = ps.filter(([, p]) => vivo(p)), u = me(), soyHost = room.host === u, soyGuia = room.guia === u;
  const puedeTomar = !soyGuia && (soyHost || !guiaViva());
  bar.innerHTML = `<div class="rs-row">
      <span class="rs-live" aria-hidden="true"></span>
      <span class="rs-info"><b>Sala ${esc(code)}</b> · ${vivos.length} ${vivos.length === 1 ? "rezando" : "rezando juntos"}<small>${soyGuia ? "Tú guías el Rosario" : `Guía: ${esc(nombreDe(room.guia))}${guiaViva() ? "" : " (sin señal)"}`}</small></span>
      <button class="rs-b" data-action="rsInvite">${icon("send")} Invitar</button>
      <button class="rs-b" data-action="rsPeople" aria-expanded="${verGente}">${icon("users")} ${vivos.length}</button>
      <button class="rs-b rs-out" data-action="rsLeave" aria-label="Salir de la sala">Salir</button>
    </div>
    ${verGente ? `<ul class="rs-people">${ps.map(([k, p]) => `<li class="${vivo(p) ? "" : "off"}"><span>${esc(p.n || "Alguien")}${k === u ? " <small>tú</small>" : ""}${k === room.host ? " <small>creó la sala</small>" : ""}${k === room.guia ? " <small class='g'>guía</small>" : ""}${vivo(p) ? "" : " <small>sin señal</small>"}</span>
        ${(soyGuia || soyHost) && k !== room.guia && k !== u && vivo(p) ? `<button class="rs-b" data-action="rsGive" data-u="${esc(k)}">Ceder la guía</button>` : ""}</li>`).join("")}</ul>
      ${puedeTomar ? `<button class="btn btn-soft btn-sm" data-action="rsTake">${soyHost ? "Retomar la guía" : "Tomar la guía"}</button>` : ""}` : ""}`;
  // Aviso en los controles de quien sigue
  const ctl = ov?.querySelector(".ros-ctl");
  let f = $("#rosFollow");
  if (follower() && ctl) {
    if (!f) { f = document.createElement("p"); f.id = "rosFollow"; f.className = "ros-follow-msg"; ctl.after(f); }
    f.innerHTML = `${esc(nombreDe(room.guia))} guía el Rosario: reza a su ritmo, las cuentas avanzan solas.${puedeTomar && !guiaViva() ? ` <button class="rs-b" data-action="rsTake">Tomar la guía</button>` : ""}`;
  } else if (f) f.remove();
}

async function invitar() {
  if (!room) return;
  const link = LINK(code), text = `Te invito a rezar el Rosario conmigo en la Capilla Ágape, cada uno desde su teléfono. Entra a la sala ${code}:\n${link}`;
  try { await navigator.clipboard.writeText(text); } catch {}
  if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  toast(`Invitación copiada. El código de la sala es ${code}.`, "ok", 6000);
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
function registerActions() {
  const A = ctx.actions;
  A.rsCreate = () => { const n = leerNombre("rsNameC"); if (!n) return; create(($("#rsSet") || {}).value, 0, n); };
  A.rsJoin = (el) => { const n = leerNombre("rsNameJ"); if (!n) return; join(el.dataset.code || ($("#rsCodeIn") || {}).value, n); };
  A.rsOpen = () => { if (room && rosa) rosa.open(room.set, room.i); };
  // Desde el Rosario abierto: «Rezar con otros» crea la sala con los misterios y la cuenta de ese momento
  A.rosSalaNew = () => {
    const s = rosa && rosa.state(), n = nombreMio();
    if (!n) { location.hash = "#/rosario/sala"; document.getElementById("rosOverlay") && ctx.actions.rosClose(); toast("Escribe tu nombre y crea la sala", ""); return; }
    create(s ? s.set : "", s ? s.i : 0, n);
  };
  A.rsInvite = () => invitar();
  A.rsPeople = () => { verGente = !verGente; paintBar(); };
  A.rsGive = (el) => setGuia(el.dataset.u);
  A.rsTake = () => setGuia(me());
  A.rsLeave = async () => { await leave(); toast("Saliste de la sala. Puedes seguir rezando solo."); };
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target && e.target.id === "rsCodeIn") { e.preventDefault(); A.rsJoin({ dataset: {} }); } });
}
