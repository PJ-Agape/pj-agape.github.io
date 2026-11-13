// Rosario en comunidad (#/rosario/sala): una sala en línea para rezar el Rosario juntos, cada uno
// desde su teléfono. Las salas las abren dirigentes, coordinadores y administradores. Quien crea la sala recibe un código de 4 letras y un enlace para invitar.
// Una persona guía: avanza las cuentas y todos ven la misma oración al mismo tiempo. La guía se
// puede ceder a cualquiera de la sala, con o sin cuenta (sin cuenta se entra con una sesión anónima).
//
// Todo vive en un documento salas_rosario/{CÓDIGO}: { host, guia, set, i, llamada, people: { uid: { n, a } } }.
// «llamada»: enlace a una llamada de voz para rezar en voz alta (WhatsApp, Meet, Jitsi o Zoom), que
// pega quien creó la sala o quien guía.
// La sala funciona como sala de espera: no se borra cuando sale la última persona. Quien llega antes
// espera a quien guía; quien la creó la encuentra en «Tus salas» para volver o cerrarla. Una sala
// sin movimiento por 24 horas se puede borrar.
// Pública o privada (pub): las públicas aparecen en el Inicio mientras alguien guía («Estamos rezando
// el Rosario, ingresa en silencio y acompáñanos»); las privadas solo con el enlace o el código.
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
const SILENCIO = "En silencio";
const NK = "agape_sala_nombre", MK = "agape_mis_salas";
const VENCE = 24 * 3600e3;
const misSalas = () => { try { return JSON.parse(localStorage.getItem(MK) || "[]").filter((x) => x && /^[A-Z]{4}$/.test(x.c) && Date.now() - x.t < VENCE * 3); } catch { return []; } };
const guardaMisSalas = (l) => { try { localStorage.setItem(MK, JSON.stringify(l.slice(0, 6))); } catch {} };
const recuerdaSala = (c) => guardaMisSalas([{ c, t: Date.now() }, ...misSalas().filter((x) => x.c !== c)]);
const olvidaSala = (c) => guardaMisSalas(misSalas().filter((x) => x.c !== c));
const LINK = (c) => `https://pj-agape.github.io/rosario/?sala=${c}`;
const STALE = 3.5 * 60e3;
const LLAMADA_OK = /^https:\/\/(call\.whatsapp\.com|meet\.google\.com|meet\.jit\.si|([a-z0-9-]+\.)?zoom\.us)\/\S+$/i;
const llamadaDe = (u) => /whatsapp/i.test(u) ? "WhatsApp" : /meet\.google/i.test(u) ? "Meet" : /jit\.si/i.test(u) ? "Jitsi" : "Zoom"; // sin señal hace más de esto: ya no está (o se le cortó)

let code = "", room = null, stop = null, hb = null, err = "", busy = false, tried = "", verGente = false, applying = false;

const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
const short = (name) => { const p = String(name || "").trim().split(/\s+/); return p[0] ? (p[0] + (p[1] ? " " + p[1][0] + "." : "")).slice(0, 40) : ""; };
const ms = (t) => (t && t.toMillis ? t.toMillis() : typeof t === "number" ? t : 0);
const vivo = (p) => p && (!p.a || Date.now() - ms(p.a) < STALE); // sin «a» todavía = recién entró
const people = () => Object.entries(room?.people || {}).sort((a, b) => ms(a[1].j) - ms(b[1].j));
const nombreDe = (u) => (room?.people?.[u]?.n) || "Alguien";
const guiaViva = () => room && room.people && vivo(room.people[room.guia]);
const hostNombre = () => room?.people?.[room.host]?.n || room?.hn || "quien creó la sala";

export const active = () => !!room;
export const isLeader = () => !!room && room.guia === me();
export const follower = () => !!room && room.guia !== me();
export const isApplying = () => applying;
export const puedeCrear = () => !!st().isGuide; // dirigentes, coordinadores y administradores

function nombreMio() {
  const a = st().account;
  if (a && a.name) return short(a.name);
  try { return localStorage.getItem(NK) || ""; } catch { return ""; }
}
const guardaNombre = (n) => { try { localStorage.setItem(NK, n); } catch {} };
const myEntry = (n) => ({ n: n === SILENCIO ? SILENCIO : short(n) || SILENCIO, a: ctx.cloud.rosarioTs(), j: Date.now() });

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
  ctx.onAfterRender(() => { paint(want); if (!want) vigilarPublicas("rsPubList", false); });
  return `<div id="rsRoot"></div>`;
}
function paint(want = "") {
  const root = $("#rsRoot"); if (!root) return;
  const n = nombreMio(), conCuenta = !!(st().account && st().account.name), today = BY_DAY[new Date().getDay()];
  const nombreIn = (id) => conCuenta ? "" : `<label class="field"><span>Tu nombre <small class="muted">(opcional)</small></span><input class="input" id="${id}" maxlength="30" autocomplete="given-name" placeholder="Si lo dejas en blanco, entras «en silencio»" value="${esc(n)}"></label>`;
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
      <p class="xs muted">${conCuenta ? "" : "No necesitas cuenta. Tu nombre es opcional: sin él, entras en silencio. "}Puedes salir cuando quieras.</p></section>`;
    if (want !== tried && conCuenta && !busy) { tried = want; join(want); }
    return;
  }
  const crear = puedeCrear(), mias = crear ? misSalas() : [];
  root.innerHTML = `${head}${errHTML}
    ${mias.length ? `<section class="card stack rs-card" style="--gap:8px"><h2 class="cred-h">Tus salas abiertas</h2>
      <p class="small muted">Siguen abiertas aunque no haya nadie: quien llega espera a que entres a guiar.</p>
      <ul class="rs-mias">${mias.map((x) => `<li><span class="rs-code rs-code-s">${x.c.split("").map((l) => `<b>${l}</b>`).join("")}</span>
        <button class="btn btn-gold btn-sm" data-action="rsJoin" data-code="${x.c}">Entrar</button>
        <button class="btn btn-ghost btn-sm" data-action="rsShareMine" data-code="${x.c}">${icon("send")} Invitar</button>
        <button class="btn btn-ghost btn-sm" data-action="rsCloseMine" data-code="${x.c}">Cerrar</button></li>`).join("")}</ul></section>` : ""}
    ${crear ? "" : `<p class="small muted rs-nota">Las salas las abren los dirigentes y coordinadores. Si te invitaron, abre su enlace o escribe aquí el código de 4 letras.</p>`}
    ${!crear ? "" : `<section class="card stack rs-card" style="--gap:10px"><h2 class="cred-h">Crear una sala</h2>
      <p class="small muted">Tú guías al comienzo y puedes ceder la guía a quien quieras. Puedes crearla antes e invitar: quien llegue primero espera en la sala hasta que entres.</p>
      ${nombreIn("rsNameC")}
      <label class="field"><span>Misterios</span><select class="input" id="rsSet">${Object.entries(SETS).map(([k, t]) => `<option value="${k}" ${k === today ? "selected" : ""}>${t}${k === today ? " (hoy)" : ""}</option>`).join("")}</select></label>
      <fieldset class="rs-vis"><legend>¿Quién puede verla?</legend>
        <label><input type="radio" name="rsPub" value="0" checked> <span><b>Privada</b><small>Solo entra quien tiene el enlace o el código.</small></span></label>
        <label><input type="radio" name="rsPub" value="1"> <span><b>Pública</b><small>Mientras rezan, aparece en el Inicio: «Estamos rezando el Rosario, ingresa en silencio y acompáñanos».</small></span></label>
      </fieldset>
      <button class="btn btn-gold imp-go" data-action="rsCreate" ${busy ? "disabled" : ""}>${icon("plus")} Crear sala</button></section>`}
    <div id="rsPubList"></div>
    <section class="card stack rs-card" style="--gap:10px"><h2 class="cred-h">Entrar a una sala</h2>
      ${nombreIn("rsNameJ")}
      <form id="rsJoinForm" class="row" style="gap:8px" onsubmit="return false"><input class="input ul-code-in" id="rsCodeIn" maxlength="4" autocomplete="off" autocapitalize="characters" placeholder="CÓDIGO" aria-label="Código de la sala">
        <button class="btn btn-primary" data-action="rsJoin" ${busy ? "disabled" : ""}>Entrar</button></form></section>`;
}
const repaint = () => { if ($("#rsRoot")) paint(new URLSearchParams((location.hash.split("?")[1]) || "").get("sala") || ""); };

// El nombre es opcional: quien no lo escribe aparece «En silencio»
function leerNombre(id) {
  if (st().account && st().account.name) return short(st().account.name);
  const v = short(($("#" + id) || {}).value || "");
  if (v) guardaNombre(v);
  return v || SILENCIO;
}

// ---------------------------------------------------------------------------
// Sala: crear, entrar, escuchar, salir
// ---------------------------------------------------------------------------
async function create(set, i = 0, nombre = nombreMio(), pub = false) {
  if (busy) return; busy = true; err = ""; repaint();
  try {
    const uid = await ctx.cloud.salaAuth();
    for (let k = 0; k < 6; k++) {
      const c = Array.from({ length: 4 }, () => LETTERS[rnd(LETTERS.length)]).join("");
      if (await ctx.cloud.rosarioExists(c)) continue;
      await ctx.cloud.rosarioCreate(c, { host: uid, guia: uid, hn: short(nombre) || "Alguien", pub: !!pub, set: SETS[set] ? set : BY_DAY[new Date().getDay()], i: Math.max(0, i | 0), people: { [uid]: myEntry(nombre) } });
      recuerdaSala(c); busy = false; listen(c, true); return;
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
    if (!(await ctx.cloud.rosarioExists(c))) { olvidaSala(c); err = `No encontramos la sala ${c}. Puede que ya se haya cerrado: revisa el código.`; busy = false; repaint(); return; }
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
    if (room.host === me()) recuerdaSala(c);
    if (first) { first = false; if (abrir && rosa) rosa.open(room.set, room.i); }
    if (room.guia !== me()) { applying = true; try { rosa && rosa.apply(room.set, room.i); } finally { applying = false; } }
    else if (!eraGuia && antes) { toast("Ahora guías tú el Rosario"); try { navigator.vibrate?.([60, 80, 60]); } catch {} }
    paintBar(); repaint();
  }, (e) => { err = errText(e, "join"); toast(err, "", 7000); salir(false); });
  clearInterval(hb);
  hb = setInterval(() => { if (room && code) ctx.cloud.rosarioUpdate(code, { ["people." + me() + ".a"]: ctx.cloud.rosarioTs() }).catch(() => {}); paintBar(); }, 90e3);
}
// Salir: la sala queda abierta. Quien guía deja la guía a quien creó la sala (si sigue), a la primera
// persona que queda o, si no queda nadie, de vuelta a quien la creó, que la retoma al volver.
export async function leave() {
  if (!room) return;
  const c = code, r = room, u = me(), otros = people().filter(([k, p]) => k !== u && vivo(p)), todos = people().filter(([k]) => k !== u);
  salir(true);
  try {
    const upd = { ["people." + u]: ctx.cloud.rosarioDel() };
    if (r.guia === u) {
      const sig = otros.find(([k]) => k === r.host) || otros[0] || todos[0];
      if (sig) upd.guia = sig[0]; else if (u !== r.host) upd.guia = r.host;
    }
    await ctx.cloud.rosarioUpdate(c, upd);
  } catch (e) { console.warn(e); }
}
// Cerrar la sala para todos (solo quien la creó)
async function cerrar(c) {
  try { await ctx.cloud.rosarioDelete(c); olvidaSala(c); toast("Cerraste la sala"); }
  catch (e) { console.warn(e); toast("No se pudo cerrar la sala", ""); }
  if (room && code === c) salir(false); else repaint();
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
// Salas públicas: aviso en el Inicio y lista en la página de las salas
// ---------------------------------------------------------------------------
let pubStop = null;
const rezandoAhora = (r) => r && r.pub && r.people && r.people[r.guia] && vivo(r.people[r.guia]);
function avisoHTML(lista, enInicio) {
  const vivas = lista.filter((r) => rezandoAhora(r) && !(room && code === r.id)).slice(0, enInicio ? 2 : 6);
  if (!vivas.length) return "";
  return vivas.map((r) => {
    const n = Object.values(r.people || {}).filter(vivo).length;
    return `<a class="rs-aviso" href="#/rosario/sala?sala=${esc(r.id)}">
      <span class="rs-live" aria-hidden="true"></span>
      <span class="rs-aviso-t"><b>Estamos rezando el Rosario</b><span>Ingresa en silencio y acompáñanos.</span>
        <small>Misterios ${esc((SETS[r.set] || "").toLowerCase())} · guía ${esc(r.people[r.guia].n || "")} · ${n} ${n === 1 ? "persona" : "personas"}</small></span>
      <span class="btn btn-gold btn-sm">Acompañar ${icon("right")}</span></a>`;
  }).join("");
}
function vigilarPublicas(slotId, enInicio) {
  if (!ctx.cloud.enabled || !ctx.cloud.rosarioPublicasWatch) return;
  if (pubStop) pubStop();
  let ultima = [];
  const pinta = () => { const el = document.getElementById(slotId); if (el) el.innerHTML = avisoHTML(ultima, enInicio); };
  pubStop = ctx.cloud.rosarioPublicasWatch((l) => { ultima = l; pinta(); }, () => {});
  const tick = setInterval(pinta, 60e3); // «vivo» depende de la hora: se revisa cada minuto
  ctx.onLeave(() => { if (pubStop) pubStop(); pubStop = null; clearInterval(tick); });
}
export function paintHome() { vigilarPublicas("rosarioVivoSlot", true); }

// ---------------------------------------------------------------------------
// Barra de la sala, dentro del Rosario
// ---------------------------------------------------------------------------
// Para el modo proyección: cómo unirse (se muestra en una esquina)
export const proyInfo = () => (room ? `Únete a rezar: pj-agape.github.io/rosario · sala ${code}` : "");
export function barHTML() { return `<div class="ros-sala" id="rosSala" ${room ? "" : "hidden"}></div>`; }
export function paintBar() {
  const bar = $("#rosSala"), ov = $("#rosOverlay");
  ov?.classList.toggle("ros-follow", follower());
  ov?.classList.toggle("ros-en-sala", !!room);
  const nb = ov?.querySelector("[data-action=rosSalaNew]"); if (nb) nb.hidden = !!room || !puedeCrear();
  const pi = $("#rosProyInfo"); if (pi) pi.textContent = proyInfo();
  if (!bar) return;
  if (!room) { bar.hidden = true; bar.innerHTML = ""; const f = $("#rosFollow"); if (f) f.remove(); return; }
  bar.hidden = false;
  const ps = people(), vivos = ps.filter(([, p]) => vivo(p)), u = me(), soyHost = room.host === u, soyGuia = room.guia === u;
  const puedeTomar = !soyGuia && (soyHost || !guiaViva());
  bar.innerHTML = `<div class="rs-row">
      <span class="rs-live" aria-hidden="true"></span>
      <span class="rs-info"><b>Sala ${esc(code)}</b> · ${vivos.length} ${vivos.length === 1 ? "rezando" : "rezando juntos"}<small>${soyGuia ? "Tú guías el Rosario" : !(room.people && room.people[room.guia]) ? `Sala de espera · guía ${esc(hostNombre())}` : `Guía: ${esc(nombreDe(room.guia))}${guiaViva() ? "" : " (sin señal)"}`}</small></span>
      <button class="rs-b" data-action="rsInvite">${icon("send")} Invitar</button>
      ${room.llamada ? `<a class="rs-b rs-call" href="${esc(room.llamada)}" target="_blank" rel="noopener">${icon("phone")} Llamada</a>`
        : soyGuia || soyHost ? `<button class="rs-b" data-action="rsCall">${icon("phone")} Llamada</button>` : ""}
      <button class="rs-b" data-action="rsPeople" aria-expanded="${verGente}">${icon("users")} ${vivos.length}</button>
      <button class="rs-b rs-out" data-action="rsLeave" aria-label="Salir de la sala">Salir</button>
    </div>
    ${verGente ? `<ul class="rs-people">${ps.map(([k, p]) => `<li class="${vivo(p) ? "" : "off"}"><span>${esc(p.n || "Alguien")}${k === u ? " <small>tú</small>" : ""}${k === room.host ? " <small>creó la sala</small>" : ""}${k === room.guia ? " <small class='g'>guía</small>" : ""}${vivo(p) ? "" : " <small>sin señal</small>"}</span>
        ${(soyGuia || soyHost) && k !== room.guia && k !== u && vivo(p) ? `<button class="rs-b" data-action="rsGive" data-u="${esc(k)}">Ceder la guía</button>` : ""}</li>`).join("")}</ul>
      <div class="row-wrap" style="gap:6px">${puedeTomar ? `<button class="btn btn-soft btn-sm" data-action="rsTake">${soyHost ? "Retomar la guía" : "Tomar la guía"}</button>` : ""}
      ${(soyGuia || soyHost) && room.llamada ? `<button class="rs-b" data-action="rsCall">Cambiar la llamada</button>` : ""}
      ${soyHost ? `<button class="rs-b" data-action="rsPub" aria-pressed="${!!room.pub}">${room.pub ? "Pública: sale en el Inicio" : "Privada: solo con enlace"}</button>
        <button class="rs-b rs-out" data-action="rsCloseRoom">Cerrar la sala para todos</button>` : ""}</div>` : ""}`;
  // Aviso en los controles de quien sigue
  const ctl = ov?.querySelector(".ros-ctl");
  let f = $("#rosFollow");
  if (follower() && ctl) {
    const espera = !(room.people && room.people[room.guia]);
    if (!f) { f = document.createElement("div"); f.id = "rosFollow"; f.className = "ros-follow-msg"; }
    // En la sala de espera el aviso va arriba, a la vista; durante el Rosario, bajo las cuentas
    const donde = espera ? bar : ctl;
    if (f.previousElementSibling !== donde) donde.after(f);
    f.classList.toggle("rs-espera", espera);
    f.innerHTML = espera
      ? `<b>Sala de espera.</b> El Rosario comienza cuando llegue ${esc(hostNombre())} a guiarlo.
        <span class="rs-esp-int">Mientras esperamos, piensa en las intenciones que traes a esta oración: las personas, las alegrías y las preocupaciones que quieres poner en manos de María.
        Si quieres que la comunidad rece contigo, enciende una vela.</span>
        <button class="btn btn-gold btn-sm" data-action="rsVela">${velaHecha ? "Encender otra vela" : "Encender una vela"}</button>
        ${puedeTomar ? `<button class="rs-b" data-action="rsTake">¿No llega? Guiar yo</button>` : ""}`
      : `${esc(nombreDe(room.guia))} guía el Rosario: reza a su ritmo, las cuentas avanzan solas.${puedeTomar && !guiaViva() ? ` <button class="rs-b" data-action="rsTake">Tomar la guía</button>` : ""}`;
  } else if (f) f.remove();
}

async function invitar() {
  if (!room) return;
  const link = LINK(code), text = `Te invito a rezar el Rosario conmigo en la Capilla Ágape, cada uno desde su teléfono. Entra a la sala ${code}:\n${link}`
    + (room.llamada ? `\n\nPara rezar en voz alta, únete también a la llamada:\n${room.llamada}` : "");
  try { await navigator.clipboard.writeText(text); } catch {}
  if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  toast(`Invitación copiada. El código de la sala es ${code}.`, "ok", 6000);
}

// Llamada de voz: quien creó la sala o quien guía pega el enlace (WhatsApp → Llamadas → Crear enlace de llamada)
function llamadaDlg() {
  let d = document.getElementById("rsCallDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "rsCallDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = `<form class="sheet-body stack" style="--gap:10px" id="rsCallForm" method="dialog">
    <span class="eyebrow">Sala ${esc(code)}</span><h2 style="margin:0">Llamada para rezar en voz alta</h2>
    <p class="small">Así quien guía reza la primera parte y todos responden, cada uno desde su teléfono.</p>
    <ol class="small rs-steps"><li>En WhatsApp, abre la pestaña <b>Llamadas</b> y toca <b>Crear enlace de llamada</b> (de voz, hasta 32 personas).</li>
      <li>Toca <b>Copiar enlace</b> y pégalo aquí.</li></ol>
    <p class="xs muted">También sirve un enlace de Google Meet, Jitsi o Zoom.</p>
    <input class="input" id="rsCallIn" type="url" inputmode="url" placeholder="https://call.whatsapp.com/…" value="${esc(room?.llamada || "")}">
    <div class="row-wrap" style="gap:8px"><button class="btn btn-gold" data-action="rsCallSave" type="button">Guardar</button>
      ${room?.llamada ? `<button class="btn btn-ghost btn-sm" data-action="rsCallDel" type="button">Quitar la llamada</button>` : ""}
      <button class="btn btn-ghost btn-sm" data-action="rsCallX" type="button">Cancelar</button></div>
  </form>`;
  d.showModal(); setTimeout(() => $("#rsCallIn")?.focus(), 50);
}
async function guardarLlamada(url) {
  if (!room) return;
  url = String(url || "").trim();
  if (url && !LLAMADA_OK.test(url)) { toast("Pega un enlace de llamada de WhatsApp (call.whatsapp.com), Meet, Jitsi o Zoom", "", 6000); return false; }
  try {
    await ctx.cloud.rosarioUpdate(code, { llamada: url ? url : ctx.cloud.rosarioDel() });
    toast(url ? `Llamada de ${llamadaDe(url)} lista: todos ven el botón para unirse` : "Quitaste la llamada", "ok");
    return true;
  } catch (e) { console.warn(e); toast("No se pudo guardar la llamada", ""); return false; }
}

// Vela desde la sala de espera, sin salir de la sala: con cuenta va a las velas de la Capilla; sin
// cuenta, a las intenciones del Ágape digital (las leen los guías y se llevan a la misa del grupo).
let velaHecha = false;
function velaDlg() {
  let d = document.getElementById("rsVelaDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "rsVelaDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const conCuenta = !!st().ready;
  d.innerHTML = `<form class="sheet-body stack" style="--gap:10px" id="rsVelaForm" onsubmit="return false">
    <span class="eyebrow">Capilla Ágape</span><h2 style="margin:0">Enciende una vela</h2>
    <p class="small">Escribe tu intención y la comunidad Ágape rezará contigo${conCuenta ? "" : ". La llevamos a la misa del grupo"}.</p>
    <textarea class="input" id="rsVelaText" rows="4" maxlength="500" placeholder="Por…"></textarea>
    <p class="xs muted">${conCuenta ? "La ve solo la comunidad con cuenta, en las velas de la Capilla." : "No se publica fuera de la comunidad: la leen solo los guías."}</p>
    <div class="row-wrap" style="gap:8px"><button class="btn btn-gold" data-action="rsVelaGo" type="button">Encender</button>
      <button class="btn btn-ghost btn-sm" data-action="rsVelaX" type="button">Ahora no</button></div>
  </form>`;
  d.showModal(); setTimeout(() => $("#rsVelaText")?.focus(), 50);
}
async function encenderVela(btn) {
  const t = String(($("#rsVelaText") || {}).value || "").trim();
  if (!t) { toast("Escribe tu intención", ""); $("#rsVelaText")?.focus(); return; }
  if (btn) btn.disabled = true;
  try {
    if (st().ready) await ctx.cloud.lightVela(t);
    else { const n = nombreDe(me()); await ctx.cloud.saveIntencionRed({ t: t.slice(0, 500), n: n === SILENCIO ? "" : n.slice(0, 40) }); }
    velaHecha = true;
    document.getElementById("rsVelaDlg")?.close();
    toast("Tu vela está encendida. La comunidad reza contigo.", "ok", 5000);
    paintBar();
  } catch (e) { console.warn(e); toast("No se pudo encender la vela. Revisa tu conexión.", ""); if (btn) btn.disabled = false; }
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
function registerActions() {
  const A = ctx.actions;
  A.rsCreate = () => { if (!puedeCrear()) return; const n = leerNombre("rsNameC"); create(($("#rsSet") || {}).value, 0, n, ($("input[name=rsPub]:checked") || {}).value === "1"); };
  A.rsPub = async () => {
    if (!room || room.host !== me()) return;
    try { await ctx.cloud.rosarioUpdate(code, { pub: !room.pub }); toast(room.pub ? "La sala ahora es privada" : "La sala ahora es pública: aparece en el Inicio mientras rezan", "ok", 5000); }
    catch (e) { console.warn(e); toast("No se pudo cambiar", ""); }
  };
  A.rsJoin = (el) => { const n = leerNombre("rsNameJ"); join(el.dataset.code || ($("#rsCodeIn") || {}).value, n); };
  A.rsOpen = () => { if (room && rosa) rosa.open(room.set, room.i); };
  // Desde el Rosario abierto: «Rezar con otros» crea la sala con los misterios y la cuenta de ese momento
  A.rosSalaNew = () => {
    if (!puedeCrear()) return;
    const s = rosa && rosa.state(), n = nombreMio();
    if (!n) { location.hash = "#/rosario/sala"; document.getElementById("rosOverlay") && ctx.actions.rosClose(); toast("Escribe tu nombre y crea la sala", ""); return; }
    create(s ? s.set : "", s ? s.i : 0, n);
  };
  A.rsInvite = () => invitar();
  A.rsPeople = () => { verGente = !verGente; paintBar(); };
  A.rsGive = (el) => setGuia(el.dataset.u);
  A.rsTake = () => setGuia(me());
  A.rsCall = () => llamadaDlg();
  A.rsVela = () => velaDlg();
  A.rsVelaX = () => document.getElementById("rsVelaDlg")?.close();
  A.rsVelaGo = (el) => encenderVela(el);
  A.rsCallX = () => document.getElementById("rsCallDlg")?.close();
  A.rsCallSave = async () => { if (await guardarLlamada(($("#rsCallIn") || {}).value)) A.rsCallX(); };
  A.rsCallDel = async () => { if (await guardarLlamada("")) A.rsCallX(); };
  A.rsLeave = async () => { const host = room && room.host === me(); await leave(); toast(host ? "Saliste. La sala sigue abierta: vuelve a ella desde «Rosario en comunidad»." : "Saliste de la sala. Puedes seguir rezando solo.", "", 6000); };
  let cierre = "";
  const confirmaCierre = (c, el) => { if (cierre === c) { cierre = ""; cerrar(c); return; } cierre = c; if (el) el.textContent = "Toca de nuevo para cerrar"; setTimeout(() => { if (cierre === c) { cierre = ""; paintBar(); repaint(); } }, 4000); };
  A.rsCloseRoom = (el) => { if (room && room.host === me()) confirmaCierre(code, el); };
  A.rsCloseMine = (el) => confirmaCierre(el.dataset.code, el);
  A.rsShareMine = async (el) => { const c = el.dataset.code, text = `Te invito a rezar el Rosario conmigo en la Capilla Ágape, cada uno desde su teléfono. Entra a la sala ${c}:\n${LINK(c)}`;
    try { await navigator.clipboard.writeText(text); } catch {}
    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); toast(`Invitación copiada. Código: ${c}`, "ok"); };
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target && e.target.id === "rsCodeIn") { e.preventDefault(); A.rsJoin({ dataset: {} }); } });
}
