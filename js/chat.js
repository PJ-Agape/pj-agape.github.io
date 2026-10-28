// Chat de Ágape: salas grupales en tiempo real (general, equipo coordinador,
// dirigentes y aspirantes). No hay mensajes privados: lo privado queda fuera de la app.

import { esc, icon, toast, initials } from "./util.js";
import { illus, SCENE_KEYS, sceneLabel } from "./ilustraciones.js";
import { avatar } from "./avatares.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
let msgs = null, current = null, online = [], replyTo = null, openedAt = 0;
const seenBuzz = new Set();
const ONLINE_MS = 420000; // se considera en línea si dio señales en los últimos 7 minutos (la señal se renueva cada 3)
const PAGE = 40; // mensajes que se cargan por vez
let limit = PAGE, stopMsgs = null, cfg = null, lastSent = 0;
const purged = new Set();
const hm = (d) => d.getHours() * 60 + d.getMinutes();
const toMin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
// ¿El chat está abierto ahora? El equipo coordinador puede escribir siempre.
function chatOpen() {
  if (!cfg || st().isStaff) return true;
  const a = toMin(cfg.desde), b = toMin(cfg.hasta), n = hm(new Date());
  return a === b ? true : a < b ? n >= a && n < b : n >= a || n < b;
}
const SALA_ILLUS = { general: "comunidad", coordinacion: "mesa", dirigentes: "equipo", aspirantes: "camino" };
const SALA_COLOR = { general: "#8ad2fa", coordinacion: "#ffba03", dirigentes: "#1351a4", aspirantes: "#ef591c" };
const COLORS = ["#8ad2fa", "#ffba03", "#ef591c", "#1351a4", "#fde0d2", "#9be3b0"];
const colorOf = (s) => s.color || SALA_COLOR[s.key] || "#8ad2fa";
const illusOf = (s) => (s.illus && SCENE_KEYS.includes(s.illus) ? s.illus : SALA_ILLUS[s.key] || "amigos");
const ROLE_NAMES = { admin: "Administradores", coordinador: "Coordinadores", dirigente: "Dirigentes", aspirante: "Aspirantes", ingreso: "Jóvenes de Ingreso", madurez: "Jóvenes de Madurez" };
function accessText(s) {
  if (!s.custom) return "";
  if (s.access === "all") return "Todos los que tienen cuenta";
  if (s.access === "roles") return (s.roles || []).map((r) => ROLE_NAMES[r] || r).join(", ") || "Solo el equipo";
  return `${(s.members || []).length} integrantes elegidos`;
}

// Pestañas de Comunidad: Muro (con las fotos), Chat y Agenda, en todas sus pantallas.
export function tabs(active) {
  return `<nav class="wall-tabs row-wrap" aria-label="Comunidad">
    <a class="btn btn-sm ${active === "muro" ? "btn-primary" : "btn-ghost"}" href="#/muro">${icon("sparkle")} Muro</a>
    <a class="btn btn-sm ${active === "chat" ? "btn-primary" : "btn-ghost"}" href="#/chat">${icon("chat")} Chat</a>
    <a class="btn btn-sm ${active === "agenda" ? "btn-primary" : "btn-ghost"}" href="#/agenda">${icon("cal")} Agenda</a>
    ${ctx && ["admin", "coordinador", "dirigente"].includes(st().role) ? `<a class="btn btn-sm btn-ghost" href="#/avisos">${icon("check")} Avisos del equipo</a>` : ""}
  </nav>`;
}
function gate() {
  const s = st();
  if (!s.enabled) return `<div class="note">El chat necesita conexión con las cuentas de la pastoral.</div>`;
  if (s.ready) return "";
  if (s.status === "not-invited") return `<div class="note">Entraste con un correo que aún no está invitado. Pide al equipo coordinador que te invite.</div>`;
  if (s.status === "inactive") return `<div class="note">Tu cuenta está en pausa. Conversa con el equipo coordinador.</div>`;
  return `<div class="card wall-join"><span class="tile-ico tile-brand" style="margin:0">${icon("chat")}</span>
    <div style="flex:1"><strong>El chat es para quienes tienen cuenta</strong><p class="muted small">Ingresa con la cuenta con que te invitaron.</p></div>
    <button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button></div>`;
}
const when = (ts) => {
  const d = ts && ts.toDate ? ts.toDate() : null;
  return d ? d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "";
};
const dayOf = (ts) => {
  const d = ts && ts.toDate ? ts.toDate() : null;
  if (!d) return "Hoy";
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = (t - x) / 86400000;
  return diff === 0 ? "Hoy" : diff === 1 ? "Ayer" : d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
};
const linkify = (v) => esc(v).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>').replace(/\n/g, "<br>");

// ---------------------------------------------------------------------------
// Lista de salas  (#/chat)
// ---------------------------------------------------------------------------
export async function viewRooms() {
  const g = gate();
  if (!g) await ctx.cloud.loadSalas();
  const staff = st().isStaff;
  const salas = ctx.cloud.allSalas().filter((s) => ctx.cloud.canSee(s));
  const active = salas.filter((s) => !s.archived), archived = salas.filter((s) => s.archived);
  if (!g) ctx.onAfterRender(async () => {
    for (const s of active) {
      const m = await ctx.cloud.lastChat(s.key);
      const el = document.querySelector(`[data-last="${s.key}"]`);
      if (el) el.textContent = m ? `${m.authorName}: ${m.text.slice(0, 70)}${m.text.length > 70 ? "…" : ""}` : "Aún no hay mensajes. ¡Saluda!";
    }
  });
  const card = (s) => `<div class="chat-room-wrap"><a class="card link chat-room${s.archived ? " is-arch" : ""}" href="#/chat/${encodeURIComponent(s.key)}" style="--sc:${colorOf(s)}">
      <span class="chat-room-ill">${illus(illusOf(s))}</span>
      <span class="chat-room-body"><h3>${esc(s.name)}${s.archived ? ` <span class="chip xs-chip">Archivada</span>` : ""}</h3><span class="muted small">${esc(s.desc || "")}</span>
      ${staff && s.custom ? `<span class="xs muted">👥 ${esc(accessText(s))}</span>` : ""}
      ${s.archived ? "" : `<span class="chat-last small" data-last="${esc(s.key)}">…</span>`}</span>${icon("right")}
    </a>${staff && s.custom ? `<button class="icon-btn chat-room-edit" data-action="salaEdit" data-id="${esc(s.key)}" aria-label="Editar sala">${icon("edit")}</button>` : ""}</div>`;
  return `
  <header class="page-head"><span class="eyebrow">Chat de la comunidad</span><h1>Conversemos <em>juntos</em></h1>
    <p>Salas de grupo para coordinarnos y compartir. Todo lo que se escribe aquí lo ven los integrantes de la sala; para temas personales o privados, usa otro canal con tu acompañante.</p></header>
  ${tabs("chat")}
  ${g || `${staff ? `<div class="row-wrap" style="margin:10px 0"><button class="btn btn-gold btn-sm" data-action="salaNew">${icon("plus")} Nueva sala</button>${st().isAdmin ? `<button class="btn btn-ghost btn-sm" data-action="chatCfg">⚙️ Horario y limpieza</button>` : ""}</div>` : ""}
    <div class="chat-rooms">${active.map(card).join("")}</div>
    ${archived.length ? `<h3 class="mag-hub-sub" style="margin-top:22px">Salas archivadas</h3><div class="chat-rooms">${archived.map(card).join("")}</div>` : ""}
    <p class="xs muted" style="margin-top:16px">¿No ves una sala que te corresponde? El equipo coordinador asigna las salas.</p>`}`;
}

// Ajustes del chat (solo administradores)
async function chatCfgDialog() {
  const c = await ctx.cloud.chatConfig(true).catch(() => ctx.cloud.CHAT_DEFAULT);
  let d = document.getElementById("chatCfgDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "chatCfgDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = `<form method="dialog" id="chatCfgForm">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Chat</span><h2>Horario y limpieza</h2></div>
      <button type="button" class="icon-btn" onclick="this.closest('dialog').close()" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:14px">
      <div class="ag-form-row"><div class="field"><label>Abre a las</label><input class="input" type="time" name="desde" value="${esc(c.desde)}" required></div>
        <div class="field"><label>Cierra a las</label><input class="input" type="time" name="hasta" value="${esc(c.hasta)}" required></div></div>
      <p class="xs muted">Fuera de ese horario las salas se pueden leer, pero no reciben mensajes. El equipo coordinador puede escribir siempre. Si pones la misma hora en ambos, el chat queda abierto todo el día.</p>
      <div class="field"><label>Borrar los mensajes con más de</label><select class="select" name="dias">${[[30, "30 días"], [60, "60 días"], [90, "90 días"], [180, "6 meses"], [0, "Nunca"]].map(([v, l]) => `<option value="${v}" ${+c.dias === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <span class="xs muted">La limpieza ocurre sola cuando alguien del equipo abre una sala. Cuida la privacidad y mantiene la app liviana.</span></div>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  d.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try { await ctx.cloud.saveChatConfig({ desde: f.get("desde"), hasta: f.get("hasta"), dias: +f.get("dias") }); d.close(); toast("Ajustes del chat guardados", "ok"); }
    catch (err) { console.warn(err); toast("No se pudo guardar", ""); }
  };
  d.showModal();
}

// ---------------------------------------------------------------------------
// Una sala  (#/chat/:sala)
// ---------------------------------------------------------------------------
export async function viewRoom(key) {
  const g = gate();
  if (!g) await ctx.cloud.loadSalas();
  const sala = ctx.cloud.allSalas().find((s) => s.key === key);
  if (!sala) return g ? `${g}` : null;
  if (!g && !ctx.cloud.mySalas().includes(key)) {
    return `${tabs("chat")}<div class="card" style="text-align:center;padding:32px"><h2 class="display">Esta sala no es para tu cuenta</h2>
      <p class="muted" style="margin-top:8px">Si crees que deberías estar, pídelo al equipo coordinador.</p>
      <a class="btn btn-primary" style="margin-top:14px" href="#/chat">Ver mis salas</a></div>`;
  }
  if (current !== key) { current = key; msgs = null; online = []; replyTo = null; seenBuzz.clear(); limit = PAGE; }
  if (!g) cfg = await ctx.cloud.chatConfig().catch(() => ctx.cloud.CHAT_DEFAULT);
  if (!g) ctx.onAfterRender(() => {
    openedAt = Date.now();
    subscribe(key);
    const stop = () => { if (stopMsgs) stopMsgs(); stopMsgs = null; };
    // Limpieza: el equipo borra en segundo plano lo que pasó el plazo (una vez por sala y sesión)
    if (st().isStaff && cfg && cfg.dias > 0 && !purged.has(key)) { purged.add(key); ctx.cloud.purgeChat(key, cfg.dias).catch((e) => console.warn("Limpieza del chat:", e)); }
    const stopP = ctx.cloud.watchPresence(key, (rows) => { online = rows; paintOnline(); });
    const leave = ctx.cloud.joinRoom(key);
    const tick = setInterval(paintOnline, 30000);
    ctx.onLeave(() => { stop(); stopP(); leave(); clearInterval(tick); });
    paint(); paintOnline(); paintReply();
    $("#chatText")?.focus({ preventScroll: true });
  });
  return `
  <div class="chat-head" style="--sc:${colorOf(sala)}">
    <a class="icon-btn" href="#/chat" aria-label="Volver a las salas">${icon("arrowL")}</a>
    <span class="chat-head-dot"></span>
    <div style="flex:1;min-width:0"><h1>${esc(sala.name)}</h1><span class="xs muted">${esc(sala.desc || "")}${st().isStaff && sala.custom ? ` · 👥 ${esc(accessText(sala))}` : ""}</span></div>
    ${st().isStaff && sala.custom ? `<button class="icon-btn" data-action="salaEdit" data-id="${esc(sala.key)}" aria-label="Editar sala">${icon("edit")}</button>` : ""}
  </div>
  ${g || `<div class="chat-layout">
  <div class="chat-box card">
    <div class="chat-list" id="chatList" aria-live="polite"><div class="muted small" style="text-align:center;padding:30px">Cargando…</div></div>
    <div class="chat-replybar" id="chatReply" hidden></div>
    ${sala.archived ? `<div class="chat-arch">${icon("lock")} Sala archivada: se puede leer, pero ya no recibe mensajes.</div>` : !chatOpen() ? `<div class="chat-arch">🌙 El chat está abierto de ${esc(cfg.desde)} a ${esc(cfg.hasta)}. Puedes leer los mensajes; vuelve a escribir en ese horario.</div>` : `<form class="chat-compose" id="chatForm" data-sala="${esc(key)}">
      <details class="chat-buzzpick"><summary class="btn btn-ghost" title="Enviar un zumbido" aria-label="Enviar un zumbido">📳</summary><div class="wall-menu-list" id="chatBuzzList"></div></details>
      <textarea id="chatText" class="textarea" rows="1" maxlength="1500" placeholder="Escribe un mensaje…" aria-label="Mensaje"></textarea>
      <button class="btn btn-primary" type="submit" aria-label="Enviar">${icon("send")}</button>
    </form>`}
  </div>
  <aside class="chat-online" id="chatOnline" aria-label="En línea en esta sala"></aside>
  </div>
  <p class="xs muted" style="margin-top:10px;text-align:center">Lo que escribes lo ven todos los integrantes de esta sala. Si algo no corresponde, repórtalo desde el menú del mensaje.</p>`}`;
}

function subscribe(key) {
  if (stopMsgs) stopMsgs();
  stopMsgs = ctx.cloud.watchChat(key, (rows) => { msgs = rows; checkBuzz(); paint(); }, () => { msgs = msgs || []; paint(true); }, limit);
}
function paint(err) {
  const box = $("#chatList");
  if (!box) return;
  if (err && !msgs.length) { box.innerHTML = `<div class="note">No pudimos cargar los mensajes. Revisa tu conexión.</div>`; return; }
  if (!msgs) return;
  const me = ctx.cloud.myUid(), admin = st().isStaff;
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  if (!msgs.length) {
    box.innerHTML = `<div class="chat-empty">${illus("amigos")}<p class="muted">Todavía no hay mensajes. ¡Rompe el hielo!</p></div>`;
    return;
  }
  let lastDay = "", lastAuthor = "", lastT = 0;
  const ms = (t) => (t && t.toMillis ? t.toMillis() : t && t.seconds ? t.seconds * 1000 : +new Date(t || 0)) || 0;
  const onl = onlineNow();
  const more = msgs.length >= limit ? `<div class="chat-more"><button class="btn btn-sm btn-ghost" data-action="chatMore">Ver mensajes anteriores</button></div>` : "";
  box.innerHTML = more + msgs.map((m) => {
    const day = dayOf(m.createdAt);
    const sep = day !== lastDay ? `<div class="chat-day"><span>${esc(day)}</span></div>` : "";
    if (sep) lastAuthor = "";
    lastDay = day;
    if (m.kind === "buzz") {
      lastAuthor = "";
      return `${sep}<div class="chat-sys" id="msg-${esc(m.id)}"><span>📳 <b>${esc(m.authorName)}</b> ${esc(m.text)}</span>
        ${m.authorUid === me || admin ? `<button class="chat-sys-x" data-action="chatDelete" data-id="${esc(m.id)}" aria-label="Borrar">${icon("x")}</button>` : ""}</div>`;
    }
    const mine = m.authorUid === me;
    // Se agrupan los mensajes seguidos de la misma persona, salvo que pasen más de 5 minutos
    const t = ms(m.createdAt);
    const cont = lastAuthor === m.authorUid && (!t || !lastT || t - lastT < 5 * 60000);
    lastAuthor = m.authorUid; lastT = t;
    const staff = ctx.cloud.isStaffRole(m.authorRole);
    const reps = Object.keys(m.reports || {}).length;
    const myRep = !!(m.reports && m.reports[me]);
    const reacts = Object.values(m.reactions || {}).reduce((o, e) => ((o[e] = (o[e] || 0) + 1), o), {});
    const myReact = (m.reactions || {})[me] || "";
    const opts = [`<div class="chat-react-row" role="group" aria-label="Reaccionar">${ctx.cloud.REACTIONS.map((e) => `<button class="${myReact === e ? "on" : ""}" data-action="chatReact" data-id="${esc(m.id)}" data-e="${e}" aria-label="Reaccionar ${e}">${e}</button>`).join("")}</div>`,
      `<button data-action="chatReply" data-id="${esc(m.id)}">${icon("undo")} Responder</button>`];
    if (!mine) opts.push(`<button data-action="chatBuzz" data-uid="${esc(m.authorUid)}" data-name="${esc(m.authorName)}">📳 Enviar zumbido${onl.some((p) => p.id === m.authorUid) ? "" : ` <small class="muted">(no está en línea)</small>`}</button>`);
    if (mine || admin) opts.push(`<button data-action="chatDelete" data-id="${esc(m.id)}">${icon("trash")} Borrar</button>`);
    if (!mine) opts.push(`<button data-action="chatReport" data-id="${esc(m.id)}" data-on="${myRep ? 0 : 1}">${icon("x")} ${myRep ? "Quitar mi reporte" : "Reportar"}</button>`);
    return `${sep}<div class="chat-msg ${mine ? "mine" : ""} ${cont ? "cont" : ""}" id="msg-${esc(m.id)}">
      ${!mine && !cont ? avatar(m.authorAvatar, m.authorName, staff ? "staff" : "") : `<span class="avatar-space"></span>`}
      <div class="chat-col">
        <div class="chat-bubble">
          ${!cont ? `<b class="chat-name">${mine ? "Tú" : esc(m.authorName || "Dirigente")}${staff ? ` <span class="chip warn xs-chip">Equipo</span>` : ""}</b>` : ""}
          ${m.replyTo ? `<button class="chat-quote" data-action="chatJump" data-id="${esc(m.replyTo.id)}"><b>${esc(m.replyTo.name)}</b><span>${esc(m.replyTo.text)}</span></button>` : ""}
          <div class="chat-text">${linkify(m.text)}</div>
          <span class="chat-meta">${when(m.createdAt)}${admin && reps ? ` · <span class="chip danger xs-chip">Reportado ${reps}</span>` : ""}</span>
        </div>
        ${Object.keys(reacts).length ? `<div class="chat-reacts">${Object.entries(reacts).map(([e, n]) => `<button class="${myReact === e ? "on" : ""}" data-action="chatReact" data-id="${esc(m.id)}" data-e="${e}" aria-label="${e} ${n}">${e}${n > 1 ? ` <b>${n}</b>` : ""}</button>`).join("")}</div>` : ""}
      </div>
      <details class="wall-menu chat-menu"><summary class="icon-btn" aria-label="Opciones del mensaje"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></summary><div class="wall-menu-list">${opts.join("")}</div></details>
    </div>`;
  }).join("");
  if (box.dataset.keep) { box.scrollTop = box.scrollHeight - +box.dataset.keep; delete box.dataset.keep; }
  else if (nearBottom || !box.dataset.ready) { box.scrollTop = box.scrollHeight; box.dataset.ready = "1"; }
}

// ---------- En línea ----------
function onlineNow() {
  const now = Date.now();
  return online.filter((p) => { const t = p.at && p.at.toMillis ? p.at.toMillis() : now; return now - t < ONLINE_MS; })
    .sort((a, b) => (a.id === ctx.cloud.myUid()) - (b.id === ctx.cloud.myUid()) || String(a.name).localeCompare(String(b.name), "es"));
}
function paintOnline() {
  const box = $("#chatOnline"); if (!box) return;
  const list = onlineNow(), me = ctx.cloud.myUid();
  box.innerHTML = `<span class="chat-online-n"><i></i>${list.length} en línea</span>
    <div class="chat-online-list">${list.map((p) => p.id === me
      ? `<span class="chat-pres me" title="Tú">${avatar(p.avatar, p.name)}<small>Tú</small></span>`
      : `<details class="chat-pres"><summary title="${esc(p.name)}">${avatar(p.avatar, p.name)}<small>${esc(String(p.name).split(" ")[0])}</small></summary>
          <div class="wall-menu-list chat-pres-menu"><b>${esc(p.name)}</b>
            <button data-action="chatBuzz" data-uid="${esc(p.id)}" data-name="${esc(p.name)}">📳 Enviar zumbido</button>
            <button data-action="chatMention" data-name="${esc(p.name)}">@ Mencionar</button></div></details>`).join("")}</div>`;
  const bl = $("#chatBuzzList");
  if (bl) {
    const others = list.filter((p) => p.id !== me);
    bl.innerHTML = `<b class="chat-buzz-t">📳 Zumbido a…</b>` + (others.length ? others.map((p) => `<button data-action="chatBuzz" data-uid="${esc(p.id)}" data-name="${esc(p.name)}">${avatar(p.avatar, p.name)} ${esc(p.name)}</button>`).join("")
      : `<p class="small muted" style="padding:6px 10px;margin:0">No hay nadie más en línea en esta sala. El zumbido solo llega a quien la tiene abierta.</p>`);
  }
}
function paintReply() {
  const bar = $("#chatReply"); if (!bar) return;
  bar.hidden = !replyTo;
  bar.innerHTML = replyTo ? `<div><small>Respondiendo a <b>${esc(replyTo.name)}</b></small><span>${esc(replyTo.text)}</span></div>
    <button class="icon-btn" data-action="chatReplyX" aria-label="Cancelar respuesta">${icon("x")}</button>` : "";
}

// ---------- Zumbido ----------
let audio = null;
function buzzEffect(from) {
  try { navigator.vibrate && navigator.vibrate([180, 80, 180, 80, 320]); } catch {}
  const box = document.querySelector(".chat-box");
  if (box) { box.classList.remove("buzz"); void box.offsetWidth; box.classList.add("buzz"); setTimeout(() => box.classList.remove("buzz"), 900); }
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime;
    [0, 0.18, 0.36].forEach((d) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "square"; o.frequency.setValueAtTime(140, t + d); o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.06, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
      o.start(t + d); o.stop(t + d + 0.16);
    });
  } catch {}
  toast(`📳 ¡${from} te envió un zumbido!`);
}
function checkBuzz() {
  const me = ctx.cloud.myUid();
  (msgs || []).forEach((m) => {
    if (m.kind !== "buzz" || seenBuzz.has(m.id)) return;
    seenBuzz.add(m.id);
    const t = m.createdAt && m.createdAt.toMillis ? m.createdAt.toMillis() : Date.now();
    if (m.buzzTo === me && m.authorUid !== me && t > openedAt - 5000) buzzEffect(m.authorName);
  });
}
const BUZZ_WAIT = 30000;
function canBuzz(uid) {
  let log = {}; try { log = JSON.parse(sessionStorage.getItem("agape_buzz") || "{}"); } catch {}
  const left = BUZZ_WAIT - (Date.now() - (log[uid] || 0));
  if (left > 0) return Math.ceil(left / 1000);
  log[uid] = Date.now(); try { sessionStorage.setItem("agape_buzz", JSON.stringify(log)); } catch {}
  return 0;
}

// ---------- Crear y editar salas (administradores y coordinadores) ----------
let people = null;
async function salaEditor(id) {
  await ctx.cloud.loadSalas();
  const s = id ? ctx.cloud.allSalas().find((x) => x.key === id) : { name: "", desc: "", color: COLORS[0], illus: "amigos", access: "roles", roles: ["coordinador"], members: [] };
  if (!s) return;
  if (!people) people = await ctx.cloud.listPeople();
  let d = document.getElementById("salaDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "salaDlg"; d.className = "sheet p-sheet"; document.body.appendChild(d); }
  const me = ctx.cloud.myUid();
  const sorted = [...people].sort((a, b) => String(a.name).localeCompare(String(b.name), "es"));
  d.innerHTML = `<form method="dialog" id="salaForm" data-id="${esc(id || "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Chat</span><h2>${id ? "Editar sala" : "Nueva sala"}</h2></div>
      <button type="button" class="icon-btn" data-action="salaClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="ag-form-row">
        <div class="field"><label>Nombre</label><input class="input" name="name" required maxlength="60" value="${esc(s.name)}" placeholder="Coro, Equipo de liturgia, Retiro…"></div>
        <div class="field"><label>Descripción</label><input class="input" name="desc" maxlength="120" value="${esc(s.desc || "")}" placeholder="Para qué es esta sala"></div>
      </div>
      <div class="ag-form-row">
        <div class="field"><label>Color</label><div class="can-chips">${COLORS.map((c) => `<label class="av-sw sala-sw" style="--c:${c}"><input type="radio" name="color" value="${c}" ${s.color === c ? "checked" : ""}></label>`).join("")}</div></div>
        <div class="field"><label>Ilustración</label><select class="select" name="illus">${SCENE_KEYS.map((k) => `<option value="${k}" ${illusOf(s) === k ? "selected" : ""}>${sceneLabel(k)}</option>`).join("")}</select></div>
      </div>
      <fieldset class="p-dates"><legend>¿Quiénes entran?</legend>
        <div class="can-chips">
          <label class="chip"><input type="radio" name="access" value="all" ${s.access === "all" ? "checked" : ""}> Todos los que tienen cuenta</label>
          <label class="chip"><input type="radio" name="access" value="roles" ${s.access === "roles" ? "checked" : ""}> Ciertos roles</label>
          <label class="chip"><input type="radio" name="access" value="people" ${s.access === "people" ? "checked" : ""}> Personas elegidas</label>
        </div>
        <div class="sala-roles can-chips" style="margin-top:10px" ${s.access === "roles" ? "" : "hidden"}>${Object.entries(ROLE_NAMES).map(([k, l]) => `<label class="chip"><input type="checkbox" name="roles" value="${k}" ${(s.roles || []).includes(k) ? "checked" : ""}> ${l}</label>`).join("")}</div>
        <div class="sala-people" style="margin-top:10px" ${s.access === "people" ? "" : "hidden"}>
          <input class="input" id="salaFind" placeholder="Buscar por nombre…" style="margin-bottom:8px">
          <div class="sala-list">${sorted.map((u) => `<label class="sala-person" data-n="${esc(String(u.name).toLowerCase())}"><input type="checkbox" name="members" value="${esc(u.uid)}" ${(s.members || []).includes(u.uid) || (!id && u.uid === me) ? "checked" : ""}> ${esc(u.name)} <span class="xs muted">${esc(ctx.cloud.roleLabel(u.role))}</span></label>`).join("") || `<p class="muted small">No pudimos cargar la lista de personas.</p>`}</div>
          <p class="xs muted">Mínimo 3 personas: las salas son siempre de grupo. Administradores y coordinadores entran a todas para acompañar.</p>
        </div>
      </fieldset>
      ${id ? `<label class="row" style="gap:8px"><input type="checkbox" name="archived" ${s.archived ? "checked" : ""}> Archivar (queda de solo lectura)</label>` : ""}
    </div>
    <div class="sheet-foot">${id ? `<button type="button" class="btn btn-danger btn-sm" data-action="salaDel" data-id="${esc(id)}">${icon("trash")} Borrar sala</button>` : ""}<span class="spacer"></span>
      <button type="button" class="btn btn-ghost" data-action="salaClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  d.showModal();
}

function registerActions() {
  const A = ctx.actions;
  const close = (el) => { const d = el.closest("details"); if (d) d.open = false; };
  A.chatDelete = (el) => {
    close(el);
    if (!confirm("¿Borrar este mensaje para todos?")) return;
    ctx.cloud.deleteChat(current, el.dataset.id).catch(() => toast("No se pudo borrar", ""));
  };
  A.salaNew = () => salaEditor(null);
  A.salaEdit = (el) => salaEditor(el.dataset.id);
  A.salaClose = () => document.getElementById("salaDlg")?.close();
  A.salaDel = async (el) => {
    if (!confirm("¿Borrar esta sala y todos sus mensajes? No se puede deshacer. Si solo quieres cerrarla, mejor archívala.")) return;
    try { await ctx.cloud.deleteSala(el.dataset.id); document.getElementById("salaDlg")?.close(); toast("Sala borrada"); location.hash = "#/chat"; ctx.render(); }
    catch (e) { console.warn(e); toast("No se pudo borrar", ""); }
  };
  A.chatReact = (el) => {
    close(el);
    const m = (msgs || []).find((x) => x.id === el.dataset.id); if (!m) return;
    const mine = (m.reactions || {})[ctx.cloud.myUid()];
    ctx.cloud.reactChat(current, m.id, mine === el.dataset.e ? null : el.dataset.e).catch(() => toast("No se pudo guardar", ""));
  };
  A.chatReply = (el) => {
    close(el);
    const m = (msgs || []).find((x) => x.id === el.dataset.id); if (!m) return;
    replyTo = { id: m.id, name: m.authorName, text: m.text.length > 120 ? m.text.slice(0, 118) + "…" : m.text };
    paintReply(); $("#chatText")?.focus();
  };
  A.chatReplyX = () => { replyTo = null; paintReply(); };
  A.chatJump = (el) => {
    const t = document.getElementById("msg-" + el.dataset.id);
    if (!t) { toast("Ese mensaje ya no está en la conversación", ""); return; }
    t.scrollIntoView({ behavior: "smooth", block: "center" }); t.classList.add("flash"); setTimeout(() => t.classList.remove("flash"), 1400);
  };
  A.chatBuzz = (el) => {
    close(el);
    const wait = canBuzz(el.dataset.uid);
    if (wait) { toast(`Espera ${wait} s para volver a enviarle un zumbido`, ""); return; }
    ctx.cloud.sendBuzz(current, { uid: el.dataset.uid, name: el.dataset.name }).then(() => toast(`📳 Zumbido enviado a ${el.dataset.name}`)).catch(() => toast("No se pudo enviar", ""));
  };
  A.chatMention = (el) => {
    close(el);
    const ta = $("#chatText"); if (!ta) return;
    ta.value = (ta.value ? ta.value.replace(/\s*$/, " ") : "") + "@" + el.dataset.name.split(" ")[0] + " "; ta.focus();
  };
  A.chatReport = (el) => {
    close(el);
    const on = el.dataset.on === "1";
    if (on && !confirm("¿Reportar este mensaje al equipo coordinador?")) return;
    ctx.cloud.reportChat(current, el.dataset.id, on).then(() => toast(on ? "Gracias. El equipo lo revisará." : "Reporte retirado")).catch(() => toast("No se pudo guardar", ""));
  };
  A.chatMore = () => {
    const box = $("#chatList"), h = box ? box.scrollHeight : 0;
    limit += PAGE; box.dataset.keep = String(h); subscribe(current);
  };
  A.chatCfg = () => chatCfgDialog();
  const send = async (form) => {
    const ta = form.querySelector("textarea");
    const text = ta.value.trim();
    if (!text) return;
    if (!chatOpen()) { toast(`El chat está abierto de ${cfg.desde} a ${cfg.hasta}`, ""); return; }
    const wait = Math.ceil((lastSent + 3000 - Date.now()) / 1000);
    if (wait > 0) { toast(`Espera ${wait} s antes de enviar otro mensaje`, ""); return; }
    lastSent = Date.now();
    ta.value = ""; ta.style.height = "";
    const rt = replyTo; replyTo = null; paintReply();
    try { await ctx.cloud.sendChat(form.dataset.sala, text, rt); const b = $("#chatList"); if (b) b.scrollTop = b.scrollHeight; }
    catch (e) { console.warn(e); toast("No se pudo enviar. Revisa tu conexión.", ""); if (!ta.value) ta.value = text; replyTo = rt; paintReply(); }
  };
  // Los menús del chat se ubican siempre dentro de la pantalla (no se cortan en los bordes).
  document.addEventListener("toggle", (e) => {
    const d = e.target;
    if (d.classList && (d.classList.contains("chat-menu") || d.classList.contains("chat-buzzpick")) && d.open) {
      document.querySelectorAll(".chat-menu[open], .chat-buzzpick[open]").forEach((x) => { if (x !== d) x.open = false; });
      const r = d.querySelector("summary").getBoundingClientRect(), m = d.querySelector(".wall-menu-list");
      m.style.position = "fixed"; m.style.right = "auto"; m.style.bottom = "auto";
      const w = m.offsetWidth, h = m.offsetHeight;
      m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px";
      m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + "px";
      return;
    }
    if (!d.classList || !d.classList.contains("chat-pres") || !d.open) return;
    document.querySelectorAll(".chat-pres[open]").forEach((x) => { if (x !== d) x.open = false; });
    const r = d.querySelector("summary").getBoundingClientRect(), m = d.querySelector(".chat-pres-menu");
    m.style.left = Math.max(8, Math.min(r.left, innerWidth - 210)) + "px"; m.style.top = r.bottom + 4 + "px";
  }, true);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".chat-pres")) document.querySelectorAll(".chat-pres[open]").forEach((x) => (x.open = false));
    if (!e.target.closest(".chat-menu, .chat-buzzpick")) document.querySelectorAll(".chat-menu[open], .chat-buzzpick[open]").forEach((x) => (x.open = false));
  });
  document.addEventListener("scroll", (e) => { if (e.target.id === "chatList" || e.target === document) document.querySelectorAll(".chat-menu[open], .chat-buzzpick[open]").forEach((x) => (x.open = false)); }, true);
  document.addEventListener("change", (e) => {
    if (e.target.name === "access" && e.target.closest("#salaForm")) {
      const f = e.target.form; f.querySelector(".sala-roles").hidden = e.target.value !== "roles"; f.querySelector(".sala-people").hidden = e.target.value !== "people";
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "salaFind") return;
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll(".sala-person").forEach((l) => (l.hidden = !!q && !l.dataset.n.includes(q)));
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "salaForm") return;
    e.preventDefault();
    const f = new FormData(e.target), id = e.target.dataset.id || null;
    const data = { name: String(f.get("name") || "").trim(), desc: String(f.get("desc") || "").trim(), color: String(f.get("color") || COLORS[0]),
      illus: String(f.get("illus") || "amigos"), access: String(f.get("access") || "roles"), roles: f.getAll("roles").map(String), members: f.getAll("members").map(String),
      archived: f.get("archived") === "on" };
    if (!data.name) return;
    if (data.access === "roles" && !data.roles.length) { toast("Elige al menos un rol", ""); return; }
    if (data.access === "people" && data.members.length < 3) { toast("Una sala necesita al menos 3 personas", ""); return; }
    if (data.access !== "people") data.members = [];
    if (data.access !== "roles") data.roles = [];
    try { const nid = await ctx.cloud.saveSala(id, data); document.getElementById("salaDlg")?.close(); toast(id ? "Sala actualizada" : "Sala creada"); if (!id) location.hash = "#/chat/" + nid; else ctx.render(); }
    catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  });
  document.addEventListener("submit", (e) => { if (e.target.id === "chatForm") { e.preventDefault(); send(e.target); } });
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "chatText" && e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer: fine)").matches) {
      e.preventDefault(); send(e.target.form);
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "chatText") return;
    e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  });
}
