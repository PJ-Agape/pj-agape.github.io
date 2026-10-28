// Campanita de novedades: un punto rojo en la cabecera cuando hay algo nuevo desde tu última
// visita (velas encendidas, publicaciones del muro, actividades de la agenda). Todo queda en la
// app: no hay notificaciones del teléfono ni correos. Lo «ya visto» se guarda en este dispositivo.

import * as cloud from "./cloud.js";
import * as S from "./store.js";
import { esc, icon, toast } from "./util.js";
import { todayGospel } from "./capilla.js";

// Tipos de novedades. «on»: cómo viene de fábrica; un administrador los prende o apaga en Gestión.
export const TIPOS = [
  { k: "velas", e: "🕯️", t: "Intenciones", d: "Cuando alguien comparte una intención en la Capilla.", on: true },
  { k: "avisos", e: "📢", t: "Avisos y logros del muro", d: "Anuncios del equipo y logros publicados.", on: true },
  { k: "temas", e: "🗣️", t: "Nuevo tema de conversación", d: "Cuando el equipo abre un tema de discusión en el muro.", on: true },
  { k: "publicaciones", e: "💬", t: "Nuevas publicaciones en el muro", d: "Preguntas y publicaciones de la comunidad.", on: true },
  { k: "encuestas", e: "📊", t: "Encuestas", d: "Cuando hay una encuesta nueva para votar.", on: true },
  { k: "agenda", e: "📅", t: "Novedades de la agenda", d: "Actividades nuevas o que cambiaron.", on: true },
  { k: "chat", e: "💭", t: "Mensajes nuevos en el chat", d: "Cuando hay mensajes en las salas donde estás.", on: false },
  { k: "formacion", e: "🎓", t: "Recordatorio de formación", d: "Cada lunes: «Recuerda avanzar en tu formación» (a los jóvenes, su encuentro de la semana).", on: false },
  { k: "rosario", e: "📿", t: "Misterios del día", d: "Cada mañana: qué misterios del Rosario corresponden hoy.", on: false },
  { k: "saludo", e: "☀️", t: "Saludo del día listo (equipo)", d: "Cada mañana, a administradores y coordinación: el saludo de buenos días para enviar al grupo.", on: true },
  { k: "evangelio", e: "📖", t: "Evangelio del día", d: "Cada mañana: la cita y la frase del Evangelio de hoy.", on: false },
];
let cfg = null;
const isOn = (k) => { const t = TIPOS.find((x) => x.k === k); return cfg && k in cfg ? !!cfg[k] : !!(t && t.on); };

const DAY = 86400000;
let items = [], lastFetch = 0, loading = null, open = false;
const key = () => `agape_novedades_${cloud.myUid()}`;
const ms = (t) => (t && t.toDate ? t.toDate().getTime() : t && t.seconds ? t.seconds * 1000 : typeof t === "string" ? Date.parse(t) || 0 : 0);
function seen() {
  try { const v = +localStorage.getItem(key()); if (v) return v; } catch {}
  return Date.now() - 3 * DAY; // la primera vez, muestra lo de los últimos 3 días
}
function markSeen() { try { localStorage.setItem(key(), String(Date.now())); } catch {} }
const unread = () => { const s = seen(); return items.filter((x) => x.ts > s); };
// Lo ya visto se va borrando: cada novedad queda en la campana hasta 24 horas después de verla.
// «Limpiar» la saca de inmediato. Se guarda en este dispositivo.
const vkey = () => `agape_nov_vistos_${cloud.myUid()}`;
const nid = (x) => `${x.href}|${x.ts}`;
function vistos() { try { return JSON.parse(localStorage.getItem(vkey()) || "{}") || {}; } catch { return {}; } }
function saveVistos(v) {
  const lim = Date.now() - 15 * DAY; for (const k in v) if (+k.split("|").pop() < lim) delete v[k];
  try { localStorage.setItem(vkey(), JSON.stringify(v)); } catch {}
}
// Lo pendiente (solicitudes, jóvenes sin dirigente) se queda en la campana mientras siga pendiente.
const visibles = () => { const v = vistos(), now = Date.now(); return items.filter((x) => { if (x.pend) return true; const t = v[nid(x)]; return t === undefined || (t > 0 && now - t < DAY); }); };
function markVistos(list, t) { const v = vistos(); list.forEach((x) => { if (t === 0 || v[nid(x)] === undefined) v[nid(x)] = t; }); saveVistos(v); }
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return "recién"; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? "ayer" : `hace ${d} días`;
};
const lunes = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const short = (t, n = 70) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

const MYST_DIA = ["gloriosos", "gozosos", "dolorosos", "gloriosos", "luminosos", "dolorosos", "gozosos"]; // dom..sáb
const at = (h, d = new Date()) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x.getTime(); };
async function fetchAll() {
  const me = cloud.myUid(), since = Date.now() - 14 * DAY;
  cfg = await cloud.novConfig().catch(() => ({}));
  const none = async () => [];
  const [velas, wall, agenda] = await Promise.all([
    isOn("velas") ? cloud.recentVelas(20) : none(),
    ["avisos", "temas", "publicaciones", "encuestas"].some(isOn) ? cloud.latestWall() : none(),
    isOn("agenda") ? cloud.listAgenda() : none(),
  ]);
  const out = [];
  velas.forEach((v) => { const ts = ms(v.createdAt); if (ts > since && v.authorUid !== me) out.push({ ts, e: "🕯️", href: `#/oracion/velas/${encodeURIComponent(v.id)}`, vela: true,
    t: `${v.authorName || "Alguien"} compartió una intención`, d: v.text ? `«${short(v.text)}»` : "Una intención en silencio. ¿Rezas por ella?", full: v.text ? `«${short(v.text, 400)}»` : "" }); });
  const tipoMuro = (p) => (p.type === "anuncio" || p.type === "logro" ? "avisos" : p.type === "tema" ? "temas" : p.type === "encuesta" ? "encuestas" : "publicaciones");
  wall.filter((p) => !p.hidden && isOn(tipoMuro(p))).forEach((p) => { const ts = ms(p.createdAt); if (ts > since && p.authorUid !== me) out.push({ ts, e: p.type === "anuncio" ? "📢" : p.type === "logro" ? "🏅" : p.type === "encuesta" ? "📊" : "💬",
    href: `#/muro/${encodeURIComponent(p.id)}`, t: p.type === "anuncio" ? "Nuevo aviso en el muro" : p.type === "logro" ? "Un nuevo logro en el muro" : p.type === "encuesta" ? "Nueva encuesta" : p.type === "tema" ? "Nuevo tema de conversación" : `${p.authorName || "Alguien"} publicó en el muro`, d: short(p.title || p.body) }); });
  agenda.forEach((e) => { const ts = ms(e.updatedAt); if (ts > since && e.title && (!e.date || e.date >= new Date(Date.now() - DAY).toISOString().slice(0, 10))) out.push({ ts, e: "📅", href: e.date ? `#/agenda/${e.date}` : "#/agenda",
    t: "Novedad en la agenda", d: short(`${e.title}${e.date ? " · " + e.date.split("-").reverse().join("/") : ""}`) }); });
  // Avisos del equipo pendientes de «Recibido» (siempre, para dirigentes y coordinación)
  if (["admin", "coordinador", "dirigente"].includes(cloud.state().role)) {
    (await cloud.myPendingAvisos()).forEach((a) => out.push({ ts: ms(a.createdAt) || Date.now(), e: a.kind === "tarea" ? "✅" : "📌", href: "#/avisos",
      t: `${a.kind === "tarea" ? "Nueva tarea" : "Nuevo aviso"} de ${a.byName || "la coordinación"}`, d: short(a.title) }));
  }
  // Solicitudes de cuenta por revisar (administradores)
  if (cloud.state().isAdmin) {
    const sols = await cloud.pendingSolicitudes();
    if (sols.length) out.push({ pend: true, ts: Math.max(...sols.map((x) => ms(x.createdAt) || 0)) || Date.now(), e: "🙋", href: "#/admin/dirigentes",
      t: sols.length === 1 ? "Una solicitud de cuenta por revisar" : `${sols.length} solicitudes de cuenta por revisar`, d: short(sols.map((x) => String(x.name || "").split(" ")[0]).join(", ")) });
  }
  const now = Date.now(), dia = now >= at(7) ? at(7) : at(7) - DAY; // lo diario se marca como nuevo cada mañana
  // Para administradores y coordinación: jóvenes sin dirigente y el saludo del día
  if (cloud.state().isAdmin || cloud.state().role === "coordinador") {
    const sin = (await cloud.listJovenes().catch(() => [])).filter((j) => j.activo !== false && !j.guia);
    if (sin.length) out.push({ pend: true, ts: dia, e: "🧭", href: "#/admin/asignar", t: sin.length === 1 ? "Un joven sin dirigente" : `${sin.length} jóvenes sin dirigente`,
      d: short(sin.map((j) => String(j.nombre || "").split(" ")[0]).join(", ")) });
    if (isOn("saludo") && now >= at(7)) out.push({ ts: at(7), e: "☀️", href: "#/admin/saludos", t: "El saludo de hoy está listo", d: "Buenos días con el Evangelio, para enviar al grupo por WhatsApp." });
  }
  if (isOn("chat")) {
    await cloud.loadSalas().catch(() => []);
    const salas = cloud.allSalas().filter((x) => cloud.mySalas().includes(x.key)).slice(0, 8);
    const last = await Promise.all(salas.map((x) => cloud.lastChat(x.key).then((m) => [x, m])));
    last.forEach(([x, m]) => { const ts = m && ms(m.createdAt); if (ts > since && m.authorUid !== me) out.push({ ts, e: "💭", href: `#/chat/${encodeURIComponent(x.key)}`,
      t: `Mensajes nuevos en «${x.name || x.title || x.key}»`, d: `${m.authorName || "Alguien"}: ${short(m.text, 60)}` }); });
  }
  if (isOn("formacion") && now >= at(8, lunes())) {
    const st = cloud.state();
    if (!st.isJoven) { const c = S.activeCourse(), cs = S.courseState(c);
      if (!cs.complete) out.push({ ts: at(8, lunes()), e: "🎓", href: "#/itinerario", t: "Recuerda avanzar en tu formación", d: `Llevas ${cs.readSessions} de ${cs.totalSessions} unidades. ¡Una más esta semana!` }); }
  }
  if (isOn("rosario") && now >= at(8)) { const m = MYST_DIA[new Date().getDay()];
    out.push({ ts: at(8), e: "📿", href: "#/oracion/maria", t: `Hoy corresponde rezar los misterios ${m}`, d: "Un Rosario con María, solo o en comunidad." }); }
  if (isOn("evangelio") && now >= at(7)) { const g = await todayGospel().catch(() => null);
    if (g && g.cita) out.push({ ts: at(7), e: "📖", href: "#/evangelio", t: `Evangelio de hoy · ${g.cita}`, d: g.frase ? `«${short(g.frase, 80)}»` : "Lee la Palabra de hoy." }); }
  items = out.sort((a, b) => b.ts - a.ts).slice(0, 25);
}
export async function refresh(force) {
  if (!cloud.enabled || !cloud.state().ready) { items = []; paint(); return; }
  if (!force && Date.now() - lastFetch < 3 * 60000) { paint(); return; }
  if (loading) return loading;
  lastFetch = Date.now();
  loading = fetchAll().catch(() => {}).finally(() => { loading = null; paint(); });
  return loading;
}

// Botón en la cabecera (lo llama renderChrome en cada vista)
export function mount() {
  const chip = document.getElementById("profileChip"); if (!chip) return;
  let b = document.getElementById("bellBtn");
  const show = cloud.enabled && cloud.state().ready;
  if (!show) { if (b) b.remove(); document.getElementById("bellPanel")?.remove(); return; }
  if (!b) {
    const anchor = document.getElementById("hdrSearch") || chip;
    anchor.insertAdjacentHTML("beforebegin", `<button class="hdr-bell" id="bellBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Novedades">${bellSVG}<span class="bell-dot" hidden></span></button>`);
    b = document.getElementById("bellBtn");
    b.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  }
  closePanel();
  paint();
  refresh();
}
const bellSVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
function paint() {
  const n = unread().length, b = document.getElementById("bellBtn");
  if (b) {
    const dot = b.querySelector(".bell-dot");
    dot.hidden = !n; dot.textContent = n > 9 ? "9+" : String(n);
    b.setAttribute("aria-label", n ? `Novedades: ${n} sin ver` : "Novedades");
  }
  const strip = document.getElementById("velaStrip");
  if (strip) {
    const v = unread().filter((x) => x.vela);
    strip.innerHTML = v.length ? `<a class="card link vela-strip" href="${esc(v[0].href)}"><span class="vela-strip-e" aria-hidden="true">🕯️</span>
      <span style="flex:1;min-width:0"><strong>${v.length === 1 ? "Hay una intención nueva" : `Hay ${v.length} intenciones nuevas`}</strong>
      <span class="muted small">${esc(v[0].d)}</span></span><span class="btn btn-sm btn-gold">Rezar 🙏</span></a>` : "";
  }
}
function toggle() { open ? closePanel() : openPanel(); }
function openPanel() {
  const b = document.getElementById("bellBtn"); if (!b) return;
  const s = seen();
  let p = document.getElementById("bellPanel");
  if (!p) { p = document.createElement("div"); p.id = "bellPanel"; p.className = "bell-panel"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Novedades"); document.body.appendChild(p); }
  const all = visibles(), pend = all.filter((x) => x.pend), list = all.filter((x) => !x.pend).slice(0, 15);
  const item = (x) => `<a class="bell-i ${x.ts > s ? "new" : ""}" href="${esc(x.href)}">
      <span class="bell-e" aria-hidden="true">${x.e}</span><span><b>${esc(x.t)}</b><small>${esc(x.full || x.d)}</small><em>${x.pend ? "<u>Atender</u>" : `${ago(x.ts)}${x.vela ? " · <u>Ir a rezar 🙏</u>" : " · <u>Ver</u>"}`}</em></span></a>`;
  p.innerHTML = `<div class="bell-head"><strong>Novedades</strong><span class="row" style="gap:6px">${list.length ? `<button type="button" class="bell-clear">Limpiar</button>` : ""}<button type="button" class="bell-x" aria-label="Cerrar">${icon("x")}</button></span></div>
    ${pend.length ? `<p class="bell-sec">Por atender</p><div class="bell-list bell-pend">${pend.map(item).join("")}</div>${list.length ? `<p class="bell-sec">Novedades</p>` : ""}` : ""}
    ${list.length ? `<div class="bell-list">${list.map(item).join("")}</div>`
      : pend.length ? "" : `<p class="bell-empty">${loading ? "Buscando novedades…" : "Estás al día ✨ Cuando alguien comparta una intención o publique algo, lo verás aquí."}</p>`}`;
  p.querySelector(".bell-x").onclick = closePanel;
  const cl = p.querySelector(".bell-clear"); if (cl) cl.onclick = (e) => { e.stopPropagation(); markVistos(list, 0); markSeen(); paint(); openPanel(); };
  p.querySelectorAll(".bell-i").forEach((a) => a.addEventListener("click", closePanel));
  const r = b.getBoundingClientRect();
  p.style.top = `${r.bottom + 8}px`; const w = Math.min(380, innerWidth - 16); p.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, r.right - w + 8))}px`;
  p.hidden = false; open = true; b.setAttribute("aria-expanded", "true");
  markVistos(list, Date.now()); markSeen(); paint();
}
function closePanel() {
  const p = document.getElementById("bellPanel"); if (p) p.hidden = true;
  open = false; document.getElementById("bellBtn")?.setAttribute("aria-expanded", "false");
}
document.addEventListener("click", (e) => { if (open && !e.target.closest("#bellPanel")) closePanel(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && open) closePanel(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 5 * 60000);
// Al encender tu propia vela o publicar, vuelve a mirar al rato
export const poke = () => { lastFetch = 0; };

// ---------------------------------------------------------------------------
// Gestión: qué avisa la campanita
// ---------------------------------------------------------------------------
export async function adminHTML() {
  cfg = await cloud.novConfig(true).catch(() => ({}));
  const admin = cloud.state().isAdmin;
  return `<section class="card" id="novAdmin"><h3>🔔 Campanita de novedades</h3>
    <p class="muted small" style="margin-top:4px">Elige qué cosas encienden el punto rojo de la campanita. Todo queda dentro de la app: no llegan notificaciones al teléfono ni correos.</p>
    <div class="nov-tipos">${TIPOS.map((x) => `<label class="nov-tipo"><input type="checkbox" data-nov="${x.k}" ${isOn(x.k) ? "checked" : ""} ${admin ? "" : "disabled"}>
      <span class="nov-e" aria-hidden="true">${x.e}</span><span><b>${esc(x.t)}</b><small>${esc(x.d)}</small></span></label>`).join("")}</div>
    ${admin ? `<button class="btn btn-primary btn-sm" data-nov-save style="margin-top:10px">Guardar</button>` : `<p class="xs muted" style="margin-top:8px">Solo un administrador puede cambiar esto.</p>`}
  </section>`;
}
document.addEventListener("click", async (e) => {
  if (!e.target.closest("[data-nov-save]")) return;
  const data = Object.fromEntries([...document.querySelectorAll("[data-nov]")].map((i) => [i.dataset.nov, i.checked]));
  try { await cloud.saveNovConfig(data); cfg = data; lastFetch = 0; toast("Campanita actualizada 🔔", "ok"); refresh(true); }
  catch (err) { console.warn(err); toast("No se pudo guardar", ""); }
});
