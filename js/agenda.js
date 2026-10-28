// Agenda oficial de la Pastoral Juvenil Ágape: calendario tipo planner con los
// encuentros y actividades del grupo, más las últimas noticias del muro.
// La ve cualquiera; la editan los administradores.

import * as fondo from "./fondo-cuenta.js";
import { esc, icon, toast } from "./util.js";
import { illus, SCENE_KEYS, sceneLabel } from "./ilustraciones.js";
import { REPEATS, isRepeat, occurrences, describe as repeatText, rrule } from "./repeat.js";
// Texto de cada opción según la fecha elegida: «Cada mes, el 3er sábado».
const repLabel = (k, date) => (k && /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? repeatText({ date, repeat: k }) : REPEATS[k]);
import * as autz from "./autorizacion.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); fondo.wire(toast); }
const $ = (s, r = document) => r.querySelector(s);

// Cada tipo pertenece a un área, y cada área tiene su panel: Comunidad, Capilla (al final) y Formación.
// Lo que se destaca en Inicio sale además en las diapositivas de Inicio.
export const AREAS = {
  comunidad: { t: "Comunidad", c: "#ef591c", hand: "para encontrarnos", href: "#/red" },
  capilla: { t: "Capilla", c: "#c98a00", hand: "para celebrar", href: "#/oracion" },
  formacion: { t: "Formación", c: "#1351a4", hand: "para crecer", href: "#/formacion" },
};
export const TYPES = {
  cumpleanos: { label: "Cumpleaños", color: "#f6b7a0", area: "comunidad" },
  encuentro: { label: "Encuentro", color: "#ef591c", area: "comunidad" },
  retiro: { label: "Retiro", color: "#a8443b", area: "comunidad" },
  misa: { label: "Misa", color: "#ffba03", area: "capilla" },
  liturgia: { label: "Liturgia", color: "#d39a1c", area: "capilla" },
  festividad: { label: "Festividad", color: "#f3d27a", area: "capilla" },
  curso: { label: "Curso", color: "#1351a4", area: "formacion" },
  taller: { label: "Taller", color: "#8ad2fa", area: "formacion" },
  lectura: { label: "Lectura", color: "#5f7fb8", area: "formacion" },
  // tipos anteriores: se siguen mostrando en las fechas ya guardadas, pero ya no se ofrecen
  actividad: { label: "Actividad", color: "#ef591c", area: "comunidad", old: true },
  equipo: { label: "Equipo", color: "#1351a4", area: "formacion", old: true },
  otro: { label: "Otro", color: "#9aa7c2", area: "comunidad", old: true },
};
// Cumpleaños (los autorizados en Acompañar → Jóvenes): no son eventos editables, se muestran cada año.
const CUMPLE = { label: "Cumpleaños", color: "#f6b7a0", area: "comunidad" };
const areaOf = (e) => typeOf(e).area || "comunidad";
const typeOf = (e) => (e.cumple ? CUMPLE : TYPES[e.type] || TYPES.otro);
let cumples = [];
async function loadCumples() {
  if (!ctx.cloud.state().ready || !ctx.cloud.getCumples) return;
  const c = await ctx.cloud.getCumples().catch(() => null);
  cumples = (c && Array.isArray(c.items) ? c.items : []).filter((x) => x && x.n && /^\d{2}-\d{2}$/.test(x.md));
}
function cumpleEvents(from, to) {
  const out = [], y0 = +from.slice(0, 4), y1 = +to.slice(0, 4);
  for (let y = y0; y <= y1; y++) for (const c of cumples) {
    const date = `${y}-${c.md}`;
    if (date >= from && date <= to) out.push({ id: `cumple-${c.md}-${c.n}-${y}`, cumple: true, type: "cumple", date, title: `Cumpleaños de ${c.n}`, desc: `¡Saludemos a ${c.n} en su día!` });
  }
  return out;
}
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const todayIso = () => iso(new Date());
const longDate = (s) => parse(s).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
// Invitación a las familias: el joven la manda por WhatsApp; la familia confirma en su página.
const APP = new URL("./", location.href.split("#")[0]).href;
const famLink = (e) => `${APP}familias/#ev-${e.baseId || e.id}`;
function invMsg(e) {
  const cuando = `${longDate(e.date)}${e.start ? `, a las ${e.start} h` : ""}`;
  return `¡Hola! Te invito a *${e.title}* de la Pastoral Juvenil Ágape.\n\n${cuando.charAt(0).toUpperCase() + cuando.slice(1)}${e.place ? `\n${e.place}` : ""}\n\nPor favor, confirma si puedes venir aquí: ${famLink(e)}`;
}
const waHref = (e) => `https://wa.me/?text=${encodeURIComponent(invMsg(e))}`;
// Tarjeta en Inicio para los jóvenes: la próxima actividad a la que se invita a las familias.
export async function homeInvite() {
  const slot = document.getElementById("famInvSlot"); if (!slot) return;
  const s = ctx.cloud.state();
  if (!s.ready || !["ingreso", "madurez", "aspirante"].includes(s.role)) return;
  const t = todayIso();
  const list = expand((await ctx.cloud.listAgenda()).filter((e) => e.invFam && e.date), t, shiftIso(t, 60)).filter((e) => e.date >= t)
    .sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")));
  const e = list[0]; if (!e || !document.getElementById("famInvSlot")) return;
  document.getElementById("famInvSlot").innerHTML = `<section class="card fam-inv">
    <span class="fam-inv-hand">invita a tu familia</span>
    <h3>${esc(e.title)}</h3>
    <p class="muted">${esc(longDate(e.date))}${e.start ? ` · ${esc(e.start)} h` : ""}${e.place ? ` · ${esc(e.place)}` : ""}</p>
    <p class="small">Mándale la invitación a tu mamá, papá o apoderado. Desde el mensaje pueden confirmar si vienen.</p>
    <a class="btn btn-primary" href="${waHref(e)}" target="_blank" rel="noopener">${icon("send")} Enviar por WhatsApp</a>
  </section>`;
}
async function paintConf(id) {
  const box = document.querySelector(`[data-conf="${CSS.escape(id)}"]`); if (!box) return;
  const rows = await ctx.cloud.listConfirmaciones(id);
  if (rows === null) { box.innerHTML = `<p class="xs muted">No se pudieron cargar las confirmaciones.</p>`; return; }
  const n = rows.reduce((a, r) => a + (+r.personas || 0), 0);
  rows.sort((a, b) => String(a.joven).localeCompare(String(b.joven), "es"));
  box.innerHTML = `<p class="small"><b>Confirmaciones de las familias:</b> ${rows.length ? `${rows.length} familia${rows.length === 1 ? "" : "s"} · ${n} persona${n === 1 ? "" : "s"}` : "todavía ninguna"}</p>
    ${rows.length ? `<ul class="ag-conf-list">${rows.map((r) => `<li><span>${esc(r.joven)} · ${+r.personas || 1} persona${+r.personas === 1 ? "" : "s"}</span>
      <button class="icon-btn" data-action="agConfDel" data-id="${esc(id)}" data-cid="${esc(r.id)}" aria-label="Quitar">${icon("x")}</button></li>`).join("")}</ul>` : ""}`;
}

let events = null, month = null, selDay = null, openId = null;

// Expande los eventos que se repiten en sus fechas (id de cada fecha: «id@AAAA-MM-DD»).
function expand(list, from, to) {
  return list.flatMap((e) => (isRepeat(e) ? occurrences(e, from, to).map((d) => ({ ...e, id: `${e.id}@${d}`, baseId: e.id, date: d })) : [e]));
}
const shiftIso = (s, days) => { const d = parse(s); d.setDate(d.getDate() + days); return iso(d); };
function all() {
  const m0 = iso(month || new Date()), t = todayIso();
  const from = shiftIso(m0 < t ? m0 : t, -45), to = shiftIso(m0 > t ? m0 : t, 400);
  const own = expand((events || []).filter((e) => e.date), from, to);
  return [...own, ...cumpleEvents(from, to)].sort((a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || "")));
}
// Las fechas seguidas de una misma serie (cada día, de lunes a viernes…) se juntan en una sola tarjeta
// «14 – 18 oct». Una serie semanal o mensual sigue mostrándose fecha por fecha.
function groupRuns(list) {
  const out = [], open = {};
  for (const e of list) {
    const g = e.baseId && open[e.baseId];
    if (g && (parse(e.date) - parse(g.last)) / 86400000 <= 3) { g.last = e.date; g.n++; continue; }
    const ng = { ...e, first: e.date, last: e.date, n: 1 };
    if (e.baseId) open[e.baseId] = ng;
    out.push(ng);
  }
  return out;
}
const MES3 = (d) => MESES[d.getMonth()].slice(0, 3);
function rangeText(g) {
  const a = parse(g.first), b = parse(g.last);
  if (g.n < 2) return "";
  if (!g.until) return `Desde el ${a.getDate()} ${MES3(a)}`;
  return a.getMonth() === b.getMonth() ? `Del ${a.getDate()} al ${b.getDate()} ${MES3(b)}` : `Del ${a.getDate()} ${MES3(a)} al ${b.getDate()} ${MES3(b)}`;
}
const byDay = () => all().reduce((m, e) => ((m[e.date] = m[e.date] || []).push(e), m), {});

// ---------------------------------------------------------------------------
export function viewAgenda(day) {
  const now = new Date();
  if (day) { const d = parse(day); month = new Date(d.getFullYear(), d.getMonth(), 1); selDay = day; }
  if (!month) month = new Date(now.getFullYear(), now.getMonth(), 1);
  ctx.onAfterRender(async () => {
    await loadCumples();
    const stop = ctx.cloud.watchAgenda((rows) => { events = rows; paint(); }, () => { events = events || []; paint(); });
    ctx.onLeave(stop);
    paint();
  });
  const admin = ctx.cloud.state().isStaff;
  return `
  <header class="page-head"><span class="eyebrow">Ventana oficial del grupo</span><h1>Agenda <em>Ágape</em></h1>
    <p>Encuentros, celebraciones y actividades de la pastoral, siempre al día. Lo que está aquí es lo oficial.</p></header>
  ${ctx.tabs ? ctx.tabs("agenda") : ""}
  <div class="row-wrap" style="margin:14px 0 4px">
    ${admin ? `<button class="btn btn-primary btn-sm" data-action="agNew">${icon("plus")} Nuevo evento</button>` : ""}
    <span class="spacer"></span><button class="btn btn-sm btn-ghost" data-action="agPrint">${icon("print")} Imprimir el mes</button>
    <button class="btn btn-sm btn-gold" data-action="agSub">${icon("grid")} Suscribirme al calendario</button>
  </div>
  <div class="ag-layout">
    <section class="card ag-cal" aria-label="Calendario">
      <div class="ag-cal-head">
        <button class="icon-btn" data-action="agMonth" data-d="-1" aria-label="Mes anterior">${icon("left")}</button>
        <h2 id="agMonthName"></h2>
        <button class="icon-btn" data-action="agMonth" data-d="1" aria-label="Mes siguiente">${icon("right")}</button>
        <button class="btn btn-sm btn-ghost" data-action="agToday">Hoy</button>
      </div>
      <div class="ag-grid" id="agGrid"></div>
      <div class="ag-legend">${Object.entries(AREAS).map(([a, A]) => `<span class="ag-lg-a" style="--ac:${A.c}">${esc(A.t)}:</span>${Object.values(TYPES).filter((t) => t.area === a && !t.old).map((t) => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join("")}`).join("")}</div>
    </section>
    <aside class="ag-side">
      <section class="card ag-list-card"><h3 id="agListTitle">Próximas fechas</h3><div id="agList" class="ag-list"><p class="muted small">Cargando…</p></div></section>
    </aside>
  </div>`;
}

function paint() {
  const grid = $("#agGrid");
  if (!grid) return;
  $("#agMonthName").textContent = `${MESES[month.getMonth()]} ${month.getFullYear()}`;
  const map = byDay();
  const first = new Date(month); const offset = (first.getDay() + 6) % 7;
  const start = new Date(first); start.setDate(1 - offset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = iso(d), evs = map[key] || [];
    const out = d.getMonth() !== month.getMonth();
    if (i >= 35 && out && cells.length >= 35) break;
    cells.push(`<button class="ag-day${out ? " out" : ""}${key === todayIso() ? " today" : ""}${key === selDay ? " sel" : ""}" data-action="agDay" data-day="${key}" aria-label="${esc(longDate(key))}${evs.length ? `, ${evs.length} evento${evs.length > 1 ? "s" : ""}` : ""}">
      <span class="ag-n">${d.getDate()}</span>
      <span class="ag-dots">${evs.slice(0, 3).map((e) => `<i style="background:${typeOf(e).color}" title="${esc(e.title)}"></i>`).join("")}${evs.length > 3 ? `<b>+${evs.length - 3}</b>` : ""}</span>
      <span class="ag-titles">${evs.slice(0, 2).map((e) => `<span style="--c:${typeOf(e).color}">${esc(e.title.replace(/^Camino Ágape · /, ""))}</span>`).join("")}</span>
    </button>`);
  }
  grid.innerHTML = DIAS.map((d) => `<span class="ag-dow">${d}</span>`).join("") + cells.join("");
  paintList();
}
// Imprimir el mes que se está viendo: la grilla con todos sus eventos y, en otra hoja, el detalle.
function printMonth() {
  const y = month.getFullYear(), m = month.getMonth(), name = `${MESES[m]} ${y}`;
  const map = byDay(), first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const weeks = Math.ceil((offset + days) / 7);
  const hora = (e) => (e.start ? `${e.start}${e.end ? `–${e.end}` : ""}` : "");
  const cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(y, m, 1 - offset + i), key = iso(d), out = d.getMonth() !== m;
    const evs = out ? [] : map[key] || [], max = weeks > 5 ? 3 : 4;
    cells.push(`<div class="agp-day${out ? " out" : ""}${[5, 6].includes(i % 7) ? " we" : ""}"><b class="agp-n">${d.getDate()}</b>
      ${evs.slice(0, max).map((e) => `<span class="agp-ev" style="--c:${typeOf(e).color}">${e.start ? `<i>${esc(e.start)}</i> ` : ""}${esc(e.title.replace(/^Camino Ágape · /, ""))}</span>`).join("")}
      ${evs.length > max ? `<span class="agp-more">+${evs.length - max} más (ver detalle)</span>` : ""}</div>`);
  }
  const list = all().filter((e) => e.date.slice(0, 7) === `${y}-${pad(m + 1)}`);
  const usados = [...new Map(list.map((e) => [typeOf(e).label, typeOf(e).color])).entries()];
  let box = document.getElementById("agPrint");
  if (!box) { box = document.createElement("div"); box.id = "agPrint"; document.body.appendChild(box); }
  box.innerHTML = `<section class="agp-page">
      <header class="agp-head"><img src="icons/logo-320.webp" alt=""><div><span>Agenda Ágape · Pastoral Juvenil</span><h1>${esc(name)}</h1></div>
        <p>${list.length ? `${list.length} ${list.length === 1 ? "fecha" : "fechas"} este mes` : "Sin fechas agendadas este mes"}</p></header>
      <div class="agp-grid" style="--weeks:${weeks}">${DIAS.map((d) => `<span class="agp-dow">${d}</span>`).join("")}${cells.join("")}</div>
      ${usados.length ? `<footer class="agp-legend">${usados.map(([l, c]) => `<span><i style="background:${c}"></i>${esc(l)}</span>`).join("")}</footer>` : ""}
    </section>
    ${list.length ? `<section class="agp-page agp-detail"><h2>Detalle de ${esc(name)}</h2>
      ${list.map((e) => `<article class="agp-row" style="--c:${typeOf(e).color}">
        <span class="agp-date"><b>${parse(e.date).getDate()}</b><small>${esc(parse(e.date).toLocaleDateString("es-CL", { weekday: "short" }))}</small></span>
        <div><strong>${esc(e.title)}</strong>
          <span>${[typeOf(e).label, hora(e), e.place || "", e.audience && !e.cumple ? `Para: ${e.audience}` : ""].filter(Boolean).map(esc).join(" · ")}</span>
          ${e.desc && !e.cumple ? `<p>${esc(e.desc)}</p>` : ""}</div></article>`).join("")}
    </section>` : ""}`;
  document.body.classList.add("ag-printing");
  const done = () => { document.body.classList.remove("ag-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 250);
}
function paintList() {
  const box = $("#agList"); if (!box) return;
  let list, title;
  if (selDay) { list = all().filter((e) => e.date === selDay); title = longDate(selDay); }
  else { const t = todayIso(); const t60 = shiftIso(t, 60); list = groupRuns(all().filter((e) => e.date >= t && (!e.cumple || e.date <= t60))).slice(0, 8); title = "Próximas fechas"; }
  $("#agListTitle").innerHTML = `${esc(title)}${selDay ? ` <button class="btn btn-sm btn-ghost" data-action="agDay" data-day="">Ver próximas</button>` : ""}`;
  if (!list.length) { box.innerHTML = `<div class="ag-empty">${illus("descanso")}<p class="muted small">${selDay ? "Nada agendado este día." : "No hay fechas próximas agendadas."}</p></div>`; return; }
  const admin = ctx.cloud.state().isStaff;
  box.innerHTML = list.map((e) => {
    const t = typeOf(e), d = parse(e.date), open = openId === e.id, run = (e.n || 1) > 1, d2 = run ? parse(e.last) : d;
    return `<article class="ag-ev${open ? " open" : ""}" style="--c:${t.color}">
      <button class="ag-ev-head" data-action="agOpen" data-id="${esc(e.id)}" aria-expanded="${open}">
        ${run ? `<span class="ag-date ag-range"><b>${d.getDate()}</b><i aria-hidden="true">–</i><b>${e.until ? d2.getDate() : "…"}</b><small>${MES3(d)}${e.until && d2.getMonth() !== d.getMonth() ? `–${MES3(d2)}` : ""}</small></span>`
          : `<span class="ag-date"><b>${d.getDate()}</b><small>${MESES[d.getMonth()].slice(0, 3)}</small></span>`}
        <span class="ag-ev-main"><span class="ag-type">${t.label}${e.baseId && !run ? " · ↻" : ""}${e.feat ? ` · <span class="ag-feat">${icon("sparkle")} En Inicio</span>` : ""}${e.familias ? " ·" : ""}${e.count ? " · ⏳" : ""}${autz.hasAuth(e) ? " · Autorización" : ""}</span><strong>${e.cumple ? "" : ""}${esc(e.title)}</strong>
          ${run ? `<span class="ag-run">${esc(rangeText(e))} · ${esc(repeatText(e).split(",")[0].toLowerCase())}</span>` : ""}
          <span class="muted small">${[e.start ? `${esc(e.start)}${e.end ? `–${esc(e.end)}` : ""}` : "", esc(e.place || e.audience || "")].filter(Boolean).join(" · ")}</span></span>
      </button>
      ${open ? `<div class="ag-ev-body">
        ${e.desc ? `<p>${esc(e.desc)}</p>` : ""}
        ${isRepeat(e) ? `<p class="small ag-rep">↻ ${esc(repeatText(e))}</p>` : ""}
        ${e.audience && !e.cumple ? `<p class="small"><b>Para:</b> ${esc(e.audience)}</p>` : ""}
        ${e.place ? `<p class="small"><b>Lugar:</b> ${esc(e.place)}</p>` : ""}
        <div class="row-wrap" style="margin-top:8px">
          <button class="btn btn-sm btn-ghost" data-action="agIcs" data-id="${esc(e.id)}">${icon("dl")} Agregar a mi calendario</button>
          ${autz.hasAuth(e) ? `<button class="btn btn-sm btn-gold" data-action="agAuthPdf" data-id="${esc(e.id)}">Autorización (PDF)</button>` : ""}
          ${e.invFam ? `<a class="btn btn-sm btn-primary" href="${waHref(e)}" target="_blank" rel="noopener">${icon("send")} Invitar a mi familia</a>` : ""}
          ${admin && !e.cumple ? `<button class="btn btn-sm btn-soft" data-action="agEdit" data-id="${esc(e.baseId || e.id)}">${icon("edit")} Editar${e.baseId ? " la serie" : ""}</button>
            ${e.baseId ? `<button class="btn btn-sm btn-ghost" data-action="agSkip" data-id="${esc(e.baseId)}" data-date="${esc(e.date)}">${icon("x")} Saltar esta fecha</button>` : ""}
            <button class="btn btn-sm btn-danger" data-action="agDel" data-id="${esc(e.baseId || e.id)}" data-rep="${e.baseId ? 1 : 0}">${icon("trash")} Borrar${e.baseId ? " la serie" : ""}</button>` : ""}
        </div>
        ${admin && e.invFam ? `<div class="ag-conf" data-conf="${esc(e.baseId || e.id)}"><p class="xs muted">Cargando confirmaciones…</p></div>` : ""}</div>` : ""}
    </article>`;
  }).join("");
  box.querySelectorAll("[data-conf]").forEach((b) => paintConf(b.dataset.conf));
}

// ---------------------------------------------------------------------------
// Formulario (solo administradores)
// ---------------------------------------------------------------------------
function openForm(ev) {
  const e = ev || { date: selDay || todayIso(), type: "encuentro" };
  fondo.init(e.countBg || "");
  let dlg = document.getElementById("agDialog");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "agDialog"; dlg.className = "sheet"; document.body.appendChild(dlg); }
  dlg.innerHTML = `<form method="dialog" id="agForm" data-id="${esc(ev ? ev.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Agenda</span><h2>${ev ? "Editar evento" : "Nuevo evento"}</h2></div>
      <button type="button" class="icon-btn" data-action="agClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Título</label><input class="input" name="title" required maxlength="120" value="${esc(e.title || "")}" placeholder="Ej: Encuentro semanal, Misa juvenil, Retiro"></div>
      <div class="ag-form-row">
        <div class="field"><label>Fecha</label><input class="input" type="date" name="date" required value="${esc(e.date)}"></div>
        <div class="field"><label>Desde</label><input class="input" type="time" name="start" value="${esc(e.start || "")}"></div>
        <div class="field"><label>Hasta</label><input class="input" type="time" name="end" value="${esc(e.end || "")}"></div>
      </div>
      <div class="ag-form-row">
        <div class="field"><label>Se repite</label><select class="select" name="repeat" id="agRepeat">${Object.keys(REPEATS).map((k) => `<option value="${k}" ${(e.repeat || "") === k ? "selected" : ""}>${esc(repLabel(k, e.date))}</option>`).join("")}</select></div>
        <div class="field" id="agUntilBox" ${isRepeat(e) ? "" : "hidden"}><label>Hasta (opcional)</label><input class="input" type="date" name="until" value="${esc(e.until || "")}"><span class="xs muted">En blanco: sin fecha de término.</span></div>
      </div>
      ${(e.exdates || []).length ? `<p class="xs muted">Fechas saltadas: ${e.exdates.map((d) => esc(longDate(d))).join(" · ")}. <label class="row" style="display:inline-flex;gap:4px"><input type="checkbox" name="clearEx"> volver a incluirlas</label></p>` : ""}
      <div class="ag-form-row">
        <div class="field"><label>Tipo</label><select class="select" name="type">${Object.entries(AREAS).map(([a, A]) => `<optgroup label="${esc(A.t)}">${Object.entries(TYPES).filter(([k, t]) => t.area === a && (!t.old || e.type === k)).map(([k, t]) => `<option value="${k}" ${e.type === k ? "selected" : ""}>${t.label}${t.old ? " (anterior)" : ""}</option>`).join("")}</optgroup>`).join("")}</select></div>
        <div class="field"><label>Para quiénes</label><input class="input" name="audience" maxlength="80" value="${esc(e.audience || "")}" placeholder="Todos, Dirigentes, Aspirantes…"></div>
      </div>
      <div class="field"><label>Lugar</label><input class="input" name="place" maxlength="120" value="${esc(e.place || "")}" placeholder="Ej: Salón parroquial"></div>
      <div class="field"><label>Detalle</label><textarea class="textarea" name="desc" maxlength="1500" placeholder="Qué traer, a qué hora termina, a quién consultar…">${esc(e.desc || "")}</textarea></div>
      <fieldset class="p-dates ag-feat-box">
        <label class="row" style="gap:8px;font-weight:800"><input type="checkbox" name="count" id="agCount" ${e.count ? "checked" : ""}> ⏳ Mostrar cuenta regresiva en Inicio</label>
        <span class="xs muted">Días, horas, minutos y segundos hasta la fecha y hora de este evento. Si es visible para familias, también aparece en su página.</span>
        <div class="field" id="agCountOpts" style="margin-top:10px" ${e.count ? "" : "hidden"}><label>Mostrarla desde</label><input class="input" type="date" name="countFrom" value="${esc(e.countFrom || todayIso())}"><span class="xs muted">Desaparece sola al terminar el día del evento.</span></div>
        <div class="field" id="agCountBg" style="margin-top:10px" ${e.count ? "" : "hidden"}><label>Imagen de fondo <span class="muted">(opcional)</span></label>
          ${fondo.html()}
          <span class="xs muted">Sube una foto o un logo y encuádralo aquí. Se oscurece un poco para que los números se lean bien.</span></div>
      </fieldset>
      ${autz.formHTML(ev)}
      <fieldset class="p-dates ag-feat-box">
        <label class="row" style="gap:8px;font-weight:800"><input type="checkbox" name="feat" id="agFeat" ${e.feat ? "checked" : ""}> ${icon("sparkle")} Destacar en Inicio</label>
        <span class="xs muted">Aparece como diapositiva en el carrusel de bienvenida entre las fechas que elijas.</span>
        <div class="stack" id="agFeatOpts" style="--gap:10px;margin-top:10px" ${e.feat ? "" : "hidden"}>
          <div class="ag-form-row">
            <div class="field"><label>Mostrar desde</label><input class="input" type="date" name="featFrom" value="${esc(e.featFrom || todayIso())}"></div>
            <div class="field"><label>Mostrar hasta (incluido)</label><input class="input" type="date" name="featTo" value="${esc(e.featTo || "")}"><span class="xs muted">En blanco: hasta el día del evento.</span></div>
          </div>
          <div class="ag-form-row">
            <div class="field"><label>Frase manuscrita</label><input class="input" name="featHand" maxlength="40" value="${esc(e.featHand || "")}" placeholder="¡no te lo pierdas!"></div>
            <div class="field"><label>Ilustración</label><select class="select" name="featIllus"><option value="">Automática según el tipo</option>${SCENE_KEYS.map((k) => `<option value="${k}" ${e.featIllus === k ? "selected" : ""}>${sceneLabel(k)}</option>`).join("")}</select></div>
          </div>
        </div>
      </fieldset>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="agClose">Cancelar</button>
      <button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  dlg.showModal();
}

function ics(e) {
  const d = e.date.replace(/-/g, "");
  const t = (s) => s.replace(":", "") + "00";
  const esc2 = (s) => String(s || "").replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const next = new Date(parse(e.date)); next.setDate(next.getDate() + 1);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pastoral Juvenil Agape//Agenda//ES", "BEGIN:VEVENT",
    `UID:${e.id}@pj-agape`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    e.start ? `DTSTART;TZID=America/Santiago:${d}T${t(e.start)}` : `DTSTART;VALUE=DATE:${d}`,
    e.start ? `DTEND;TZID=America/Santiago:${d}T${t(e.end || e.start)}` : `DTEND;VALUE=DATE:${iso(next).replace(/-/g, "")}`,
    rrule(e, !e.start), (e.exdates || []).length ? (e.start ? `EXDATE;TZID=America/Santiago:${e.exdates.map((x) => x.replace(/-/g, "") + "T" + t(e.start)).join(",")}` : `EXDATE;VALUE=DATE:${e.exdates.map((x) => x.replace(/-/g, "")).join(",")}`) : "",
    `SUMMARY:${esc2(e.title)}`, e.place ? `LOCATION:${esc2(e.place)}` : "", e.desc ? `DESCRIPTION:${esc2(e.desc)}` : "",
    "END:VEVENT", "END:VCALENDAR"].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `agape-${e.date}.ics`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// Paneles por área: Comunidad, Capilla (al final) y Formación muestran sus próximas fechas.
export const panelSlot = (area) => `<div class="ag-panel-slot" data-ag-panel="${area}"></div>`;
export async function fillPanels() {
  if (!document.querySelector("[data-ag-panel]")) return;
  await loadCumples().catch(() => {});
  let own = []; try { own = (await ctx.cloud.listAgenda()) || []; } catch {}
  const t = todayIso(), to = shiftIso(t, 120);
  const list = groupRuns([...expand(own.filter((e) => e.date && e.title), t, to), ...cumpleEvents(t, shiftIso(t, 31))]
    .filter((e) => e.date >= t && e.date <= to).sort((x, y) => (x.date + (x.start || "")).localeCompare(y.date + (y.start || ""))));
  document.querySelectorAll("[data-ag-panel]").forEach((el) => {
    const a = el.dataset.agPanel, A = a === "inicio" ? { t: "Destacados", c: "#ef591c", hand: "no te lo pierdas" } : a === "todas" ? { t: "Próximas fechas", c: "#ef591c", hand: "lo que viene" } : AREAS[a]; if (!A) return;
    // Inicio: lo que se marcó «Destacar en Inicio», de todas las áreas.
    const l = list.filter((e) => (a === "inicio" ? e.feat === true : a === "todas" || areaOf(e) === a)).slice(0, 5);
    if (a === "inicio" && !l.length) { el.innerHTML = ""; return; }
    el.innerHTML = `<section class="card ag-panel" style="--ac:${A.c}">
      <header class="ag-panel-h"><span><span class="eyebrow">${icon("cal")} Agenda · ${esc(A.t)}</span><span class="ag-panel-hand">${esc(A.hand)}</span></span>
        <a class="ag-panel-all" href="#/agenda">Ver todo ${icon("arrowR")}</a></header>
      ${l.length ? `<ul class="ag-panel-l">${l.map((e) => { const d = parse(e.date), tp = typeOf(e);
        const cuando = (e.n || 1) > 1 ? rangeText(e) : `${d.getDate()} ${MES3(d)}`;
        return `<li><a href="#/agenda/${e.date}" style="--c:${tp.color}"><span class="ag-pd"><b>${d.getDate()}</b>${MES3(d)}</span>
          <span class="ag-pt"><strong>${esc(e.title.replace(/^Camino Ágape · /, ""))}</strong><small>${esc(tp.label)}${(e.n || 1) > 1 ? ` · ${esc(cuando)}` : ""}${e.start ? ` · ${esc(e.start)} h` : ""}${e.place ? ` · ${esc(e.place)}` : ""}</small></span></a></li>`; }).join("")}</ul>`
        : `<p class="muted small ag-panel-empty">No hay fechas próximas por ahora.</p>`}
    </section>`;
  });
}

// Suscripción: agenda.ics se regenera cada hora desde la Agenda (acción de GitHub).
const ICS_URL = new URL("agenda.ics", location.href.split("#")[0]).href;
function subDialog() {
  const webcal = ICS_URL.replace(/^https?:/, "webcal:");
  const google = "https://calendar.google.com/calendar/render?cid=" + encodeURIComponent(webcal);
  let d = document.getElementById("agSubDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "agSubDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = `<div class="sheet-head"><div style="flex:1"><span class="eyebrow">Agenda Ágape</span><h2>Suscríbete al calendario</h2></div>
      <button type="button" class="icon-btn" data-action="agSubClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:14px">
      <p>Se hace una sola vez. Desde ahí, los eventos de la Agenda y los encuentros del grupo aparecen solos en tu calendario, y se actualizan cuando el equipo los cambia.</p>
      <a class="card link ag-sub-o" href="${google}" target="_blank" rel="noopener"><strong>Google Calendar</strong><span class="muted small">Se abre Google Calendar: toca «Agregar». En el celular, hazlo una vez desde el computador o desde calendar.google.com.</span></a>
      <a class="card link ag-sub-o" href="${webcal}"><strong>iPhone, iPad o Mac</strong><span class="muted small">Se abre Calendario: toca «Suscribirse».</span></a>
      <div class="card ag-sub-o"><strong>Outlook u otro calendario</strong><span class="muted small">Agrega un calendario «desde internet» con esta dirección:</span>
        <div class="row-wrap" style="margin-top:8px"><input class="input" id="agSubUrl" readonly value="${ICS_URL}" style="flex:1;min-width:200px"><button class="btn btn-sm btn-primary" data-action="agSubCopy">${icon("copy")} Copiar</button></div></div>
      <div class="note small"><b>¿Lo quieres en la pantalla de inicio?</b> Agrega el widget de tu calendario: en Android, mantén presionado un espacio libre → Widgets → Google Calendar; en iPhone, mantén presionado → «+» → Calendario. Verás ahí las próximas fechas de Ágape.</div>
      <p class="xs muted">Tu calendario revisa los cambios cada algunas horas (Google puede tardar hasta un día). El calendario es de solo lectura: los eventos los crea el equipo coordinador en esta Agenda.</p>
    </div>`;
  d.showModal();
}

function registerActions() {
  ctx.actions.agSub = () => subDialog();
  ctx.actions.agPrint = () => printMonth();
  ctx.actions.agSubClose = () => document.getElementById("agSubDlg")?.close();
  ctx.actions.agSubCopy = async () => {
    const i = document.getElementById("agSubUrl");
    try { await navigator.clipboard.writeText(ICS_URL); toast("Dirección copiada"); } catch { i.select(); toast("Selecciona y copia la dirección"); }
  };
  const A = ctx.actions;
  A.agMonth = (el) => { month = new Date(month.getFullYear(), month.getMonth() + +el.dataset.d, 1); selDay = null; paint(); };
  A.agToday = () => { const n = new Date(); month = new Date(n.getFullYear(), n.getMonth(), 1); selDay = todayIso(); paint(); };
  A.agDay = (el) => { selDay = el.dataset.day || null; openId = null; paint(); if (selDay && matchMedia("(max-width: 900px)").matches) $("#agList")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  A.agConfDel = async (el) => {
    if (!confirm("¿Quitar esta confirmación?")) return;
    try { await ctx.cloud.deleteConfirmacion(el.dataset.id, el.dataset.cid); paintConf(el.dataset.id); } catch { toast("No se pudo quitar", ""); }
  };
  A.agOpen = (el) => { openId = openId === el.dataset.id ? null : el.dataset.id; paintList(); };
  A.agNew = () => openForm(null);
  A.agEdit = (el) => openForm((events || []).find((e) => e.id === el.dataset.id));
  A.agClose = () => document.getElementById("agDialog")?.close();
  A.agSkip = async (el) => {
    const base = (events || []).find((x) => x.id === el.dataset.id); if (!base) return;
    if (!confirm(`¿Saltar el ${longDate(el.dataset.date)}? El resto de las fechas se mantiene.`)) return;
    try { await ctx.cloud.patchEvent(base.id, { exdates: [...new Set([...(base.exdates || []), el.dataset.date])].sort() }); openId = null; toast("Fecha saltada"); }
    catch { toast("No se pudo guardar", ""); }
  };
  A.agDel = async (el) => {
    if (!confirm(el.dataset.rep === "1" ? "¿Borrar TODAS las fechas de este evento que se repite? Para quitar solo una, usa «Saltar esta fecha»." : "¿Borrar este evento de la agenda?")) return;
    try { await ctx.cloud.deleteEvent(el.dataset.id); openId = null; toast("Evento borrado"); } catch { toast("No se pudo borrar", ""); }
  };
  A.agAuthPdf = async (el) => {
    const e = all().find((x) => x.id === el.dataset.id); if (!e) return;
    const base = e.baseId ? (events || []).find((x) => x.id === e.baseId) : null;
    const ev = base ? { ...base, date: e.date, auth: { ...base.auth, salidaF: e.date, regresoF: base.auth.regresoF && base.auth.salidaF ? shiftIso(e.date, Math.round((parse(base.auth.regresoF) - parse(base.auth.salidaF)) / 86400000)) : e.date } } : e;
    toast("Preparando la autorización…");
    try { await autz.download(ev); } catch (err) { console.warn(err); toast("No se pudo crear el PDF", ""); }
  };
  A.agAuthPreview = async () => {
    const form = document.getElementById("agForm"); if (!form) return;
    const f = new FormData(form);
    const ev = { title: String(f.get("title") || "Actividad").trim() || "Actividad", date: String(f.get("date") || ""), start: String(f.get("start") || ""), end: String(f.get("end") || ""), place: String(f.get("place") || ""), auth: autz.fromForm(f) || { req: true } };
    try { await autz.download(ev); } catch (err) { console.warn(err); toast("No se pudo crear el PDF", ""); }
  };
  A.agIcs = (el) => {
    const e = all().find((x) => x.id === el.dataset.id); if (!e) return;
    const base = e.baseId && (events || []).find((x) => x.id === e.baseId);
    ics(base ? { ...base } : e);
  };
  document.addEventListener("change", (e) => {
    if (e.target.id === "agCount") { const o = $("#agCountOpts"); if (o) o.hidden = !e.target.checked; const b = $("#agCountBg"); if (b) b.hidden = !e.target.checked; }
    if (e.target.id === "agInv" && e.target.checked) { const fam = $("#agFam"); if (fam) fam.checked = true; }
    if (e.target.id === "agAuth") { const o = $("#agAuthOpts"); if (o) o.hidden = !e.target.checked; const fam = $("#agFam"); if (e.target.checked && fam) fam.checked = true; }
    if (e.target.id === "agFeat") { const o = $("#agFeatOpts"); if (o) o.hidden = !e.target.checked; }
    if (e.target.id === "agRepeat") { const o = $("#agUntilBox"); if (o) o.hidden = !e.target.value; }
    if (e.target.name === "date" && e.target.closest("#agForm")) { const sel = $("#agRepeat"); if (sel) [...sel.options].forEach((o) => { o.textContent = repLabel(o.value, e.target.value); }); }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "agForm") return;
    e.preventDefault();
    const f = new FormData(e.target);
    const data = Object.fromEntries(["title", "date", "start", "end", "type", "audience", "place", "desc"].map((k) => [k, String(f.get(k) || "").trim()]));
    if (!data.title || !data.date) return;
    data.repeat = REPEATS[String(f.get("repeat") || "")] ? String(f.get("repeat") || "") : "";
    data.until = data.repeat ? String(f.get("until") || "") : "";
    if (data.until && data.until < data.date) { toast("«Hasta» es anterior a la fecha del evento", ""); return; }
    data.invFam = f.get("invFam") === "on";
    data.familias = f.get("familias") === "on" || data.invFam;
    data.count = f.get("count") === "on";
    data.countFrom = data.count ? String(f.get("countFrom") || "") : "";
    data.countBg = data.count ? fondo.get() : "";
    data.auth = autz.fromForm(f);
    if (data.auth && !data.auth.salidaF) data.auth.salidaF = data.date;
    data.feat = f.get("feat") === "on";
    for (const k of ["featFrom", "featTo", "featHand", "featIllus"]) data[k] = data.feat ? String(f.get(k) || "").trim() : "";
    if (data.feat && !data.featFrom) data.featFrom = todayIso();
    if (data.feat && data.featTo && data.featTo < data.featFrom) { toast("«Mostrar hasta» es anterior a «Mostrar desde»", ""); return; }
    const old = e.target.dataset.id && (events || []).find((x) => x.id === e.target.dataset.id);
    if (old && old.featOrder != null) data.featOrder = old.featOrder;
    data.exdates = data.repeat && old && old.exdates && f.get("clearEx") !== "on" ? old.exdates : [];
    try {
      const id = await ctx.cloud.saveEvent(e.target.dataset.id || null, data);
      document.getElementById("agDialog")?.close();
      const d = parse(data.date); month = new Date(d.getFullYear(), d.getMonth(), 1); selDay = data.date; openId = data.repeat ? `${id}@${data.date}` : id;
      toast(data.feat ? "Guardado y destacado en Inicio" : "Guardado en la agenda"); paint();
    } catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  });
}
