// Acompañar: la lista de jóvenes del grupo, su ficha privada y sus cumpleaños.
// Lo usan los guías (administradores, coordinadores y dirigentes).
// La asistencia, el pasaporte y el cuadro de honor quedaron en la rama respaldo/revista-y-familias.

import { esc, icon, toast, initials } from "./util.js";
import { svg as avatarSvg } from "./avatares.js";
import { planilla as fichasXlsx } from "./ficha.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => iso(new Date());
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const ETAPAS = {
  ingreso: { l: "Ingreso", c: "#8ad2fa" }, madurez: { l: "Madurez", c: "#1351a4" }, aspirante: { l: "Aspirante", c: "#ef591c" }, equipo: { l: "Equipo", c: "#ffba03" },
};
// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
let jovenes = null;
let repaint = () => {};
function watch() {
  const a = ctx.cloud.watchJovenes((r) => { jovenes = r; repaint(); }, () => { jovenes = jovenes || []; repaint(); });
  ctx.onLeave(() => { a(); });
}
const activos = () => (jovenes || []).filter((j) => j.activo !== false).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
const shortName = (n) => ctx.cloud.shortName(n);
const av = (j, cls = "") => {
  const s = j.avatar && avatarSvg(j.avatar);
  const bg = (ETAPAS[j.etapa] || {}).c || "#e1edfb", dark = bg === "#1351a4" || bg === "#ef591c";
  return s ? `<span class="avatar av-ill ${cls}">${s}</span>` : `<span class="avatar ${cls}" style="background:${bg};color:${dark ? "#fff6e5" : "#0b2566"}">${esc(initials(j.nombre || "?"))}</span>`;
};

// Cumpleaños para Inicio (solo con autorización de la familia): nombre corto y día/mes.
async function rebuildCumples() {
  const items = (jovenes || []).filter((j) => j.activo !== false && j.publico && /^\d{2}-\d{2}$/.test(j.cumple || "")).map((j) => ({ n: shortName(j.nombre), md: j.cumple, ...(j.uid ? { uid: j.uid } : {}) }));
  try { await ctx.cloud.saveCumples({ items }); } catch (e) { console.warn("Cumpleaños:", e); }
}

// ---------------------------------------------------------------------------
// Vista principal  (#/acompanar)
// ---------------------------------------------------------------------------
let qJ = "";
const gate = () => {
  const s = st();
  if (!s.ready) return `<div class="card wall-join"><span class="tile-ico tile-brand" style="margin:0">${icon("users")}</span><div style="flex:1"><strong>Acompañar es para los guías</strong><p class="muted small">Ingresa con tu cuenta.</p></div>${s.enabled ? `<button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button>` : ""}</div>`;
  if (!s.isGuide) return `<div class="card" style="text-align:center;padding:30px"><h2 class="display">Esta sección es para los guías</h2><a class="btn btn-primary" style="margin-top:12px" href="#/">Volver al inicio</a></div>`;
  return "";
};
export function viewMain() {
  const g = gate();
  if (!g) ctx.onAfterRender(() => { repaint = paintMain; watch(); paintMain(); });
  return `
  <header class="page-head"><span class="eyebrow">Para los guías</span><h1>Jóvenes</h1>
    <p>La lista del grupo, quién acompaña a cada uno y su ficha privada. Lo ve solo el equipo.</p></header>
  ${g || `<div id="acBody"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`}`;
}
function paintMain() {
  const box = $("#acBody"); if (!box) return;
  if (jovenes === null) return;
  box.innerHTML = jovenesHTML();
}

// ---------- Jóvenes ----------
function jovenesHTML() {
  const q = qJ.trim().toLowerCase();
  const me = ctx.cloud.myUid(), hasMine = (jovenes || []).some((j) => j.guia === me || j.guia2 === me);
  const list = (jovenes || []).filter((j) => !q || String(j.nombre).toLowerCase().includes(q)).filter((j) => !soloMios || !hasMine || j.guia === me || j.guia2 === me).sort((a, b) => (a.activo === false) - (b.activo === false) || String(a.nombre).localeCompare(String(b.nombre), "es"));
  const groups = Object.entries(ETAPAS).map(([k, e]) => ({ k, e, list: list.filter((j) => j.etapa === k && j.activo !== false) })).filter((g) => g.list.length);
  const off = list.filter((j) => j.activo === false);
  const row = (j) => {
    const extra = [j.uid ? "con cuenta" : "", j.guia ? `lo acompaña ${j.guia === me || j.guia2 === me ? "<b>tú</b>" : esc([j.guiaNombre, j.guia2Nombre].filter(Boolean).map((n) => n.split(" ")[0]).join(" y "))}` : ""].filter(Boolean).join(" · ");
    return `<a class="card link ac-j" href="#/acompanar/joven/${encodeURIComponent(j.id)}">${av(j)}
      <span class="can-main"><strong>${esc(j.nombre)}</strong>${extra ? `<span class="xs muted">${extra}</span>` : ""}</span>${icon("right")}</a>`;
  };
  return `<div class="row-wrap" style="margin:6px 0 12px"><input class="input" id="acSearch" placeholder="Buscar por nombre…" value="${esc(qJ)}" style="flex:1;min-width:200px">
      ${hasMine ? `<button class="chip ${soloMios ? "accent" : ""}" data-action="acMios">Mis jóvenes</button>` : ""}
      <button class="btn btn-gold btn-sm" data-action="acNew">${icon("plus")} Agregar joven</button>
      ${st().isStaff || hasMine ? `<button class="btn btn-soft btn-sm" data-action="acFichasXlsx" title="RUT, contacto de emergencia, alergias…">${icon("dl")} Planilla de fichas (Excel)</button>` : ""}</div>
    ${groups.map((g) => `<h3 class="mag-hub-sub"><span class="ac-dot" style="background:${g.e.c}"></span>${g.e.l} · ${g.list.length}</h3><div class="ac-jlist">${g.list.map(row).join("")}</div>`).join("") || `<div class="card" style="text-align:center;padding:26px"><p class="muted">Agrega a los jóvenes de tu grupo.</p></div>`}
    ${off.length ? `<h3 class="mag-hub-sub">En pausa · ${off.length}</h3><div class="ac-jlist">${off.map(row).join("")}</div>` : ""}
    <p class="xs muted" style="margin-top:14px">Los jóvenes no necesitan cuenta para estar en la lista. Si tienen cuenta, un administrador o coordinador la vincula para que puedan ver su ficha privada.</p>`;
}
let people = null, soloMios = false;
async function jovenEditor(j) {
  if (st().isStaff && !people) people = await ctx.cloud.listPeople();
  let d = document.getElementById("acDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "acDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const v = j || { nombre: "", etapa: "ingreso", cumple: "", publico: false, activo: true, uid: "" };
  const [mm, dd] = /^\d{2}-\d{2}$/.test(v.cumple || "") ? v.cumple.split("-") : ["", ""];
  d.innerHTML = `<form method="dialog" id="acForm" data-id="${esc(j ? j.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Acompañar</span><h2>${j ? "Editar datos" : "Agregar joven"}</h2></div>
      <button type="button" class="icon-btn" data-action="acClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Nombre y apellido</label><input class="input" name="nombre" required maxlength="80" value="${esc(v.nombre)}"></div>
      <div class="ag-form-row">
        <div class="field"><label>Etapa</label><select class="select" name="etapa">${Object.entries(ETAPAS).map(([k, e]) => `<option value="${k}" ${v.etapa === k ? "selected" : ""}>${e.l}</option>`).join("")}</select></div>
        <div class="field"><label>Cumpleaños (opcional)</label><div class="row" style="gap:6px">
          <select class="select" name="dd"><option value="">Día</option>${Array.from({ length: 31 }, (_, i) => pad(i + 1)).map((x) => `<option ${x === dd ? "selected" : ""}>${x}</option>`).join("")}</select>
          <select class="select" name="mm"><option value="">Mes</option>${MESES.map((m, i) => `<option value="${pad(i + 1)}" ${pad(i + 1) === mm ? "selected" : ""}>${m}</option>`).join("")}</select></div></div>
      </div>
      <label class="row" style="gap:8px;align-items:flex-start"><input type="checkbox" name="publico" ${v.publico ? "checked" : ""} style="margin-top:4px"> <span>La familia autorizó mostrar su <b>cumpleaños</b> (nombre e inicial, día y mes) en la app.</span></label>
      ${st().isStaff ? `<div class="field"><label>Cuenta en la página (opcional)</label><select class="select" name="uid"><option value="">Sin cuenta vinculada</option>${(people || []).sort((a, b) => String(a.name).localeCompare(String(b.name), "es")).map((u) => `<option value="${esc(u.uid)}" ${v.uid === u.uid ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select><span class="xs muted">Si tiene cuenta, podrá ver su ficha privada.</span></div>` : ""}
      ${j ? `<label class="row" style="gap:8px"><input type="checkbox" name="activo" ${v.activo !== false ? "checked" : ""}> Participa actualmente (desmarca para dejarlo en pausa)</label>` : ""}
      <p class="xs muted">Guarda solo lo necesario para acompañar. Nada de esto se publica sin la autorización de arriba.</p>
    </div>
    <div class="sheet-foot">${j && st().isStaff ? `<button type="button" class="btn btn-danger btn-sm" data-action="acDel" data-id="${esc(j.id)}">${icon("trash")} Quitar de la lista</button>` : ""}<span class="spacer"></span>
      <button type="button" class="btn btn-ghost" data-action="acClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  d.showModal();
}

// ---------- Un joven ----------
export function viewJoven(id) {
  const g = gate();
  if (!g) ctx.onAfterRender(() => { repaint = () => paintJoven(id); watch(); paintJoven(id); });
  return g || `<nav class="crumbs"><a href="#/acompanar">Jóvenes</a>${icon("right")}<span id="acCrumb">…</span></nav><div id="acOne"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function paintJoven(id) {
  const box = $("#acOne"); if (!box || jovenes === null) return;
  const j = jovenes.find((x) => x.id === id);
  if (!j) { box.innerHTML = `<div class="card" style="text-align:center;padding:30px"><p class="muted">No encontramos a esta persona.</p></div>`; return; }
  const c = $("#acCrumb"); if (c) c.textContent = j.nombre;
  const me = ctx.cloud.myUid(), guias = [j.guiaNombre, j.guia2Nombre].filter(Boolean).join(" y ");
  const [mm, dd] = /^\d{2}-\d{2}$/.test(j.cumple || "") ? j.cumple.split("-") : ["", ""];
  box.innerHTML = `<article class="card stack" style="--gap:12px">
    <div class="row" style="gap:12px;align-items:center">${av(j)}<div><h1 class="display" style="font-size:1.5rem">${esc(j.nombre)}</h1>
      <span class="muted small">${esc((ETAPAS[j.etapa] || {}).l || "")}${j.activo === false ? " · en pausa" : ""}</span></div></div>
    <p class="small">${guias ? `Lo acompaña: <b>${esc(guias)}</b>` : `<span class="muted">Sin dirigente asignado</span>`}</p>
    ${dd ? `<p class="small">Cumpleaños: <b>${+dd} de ${MESES[+mm - 1]}</b>${j.publico ? "" : ' <span class="muted">(no se muestra)</span>'}</p>` : ""}
    <div class="row-wrap"><button class="btn btn-sm btn-soft" data-action="acEdit" data-id="${esc(j.id)}">${icon("edit")} Editar datos</button>
      ${st().isStaff || j.guia === me || j.guia2 === me ? `<a class="btn btn-sm btn-primary" href="#/ficha/${encodeURIComponent(j.id)}">${icon("lock")} Ficha privada</a>` : ""}</div>
  </article>`;
}

// ---------------------------------------------------------------------------
function registerActions() {
  const A = ctx.actions;
  A.acMios = () => { soloMios = !soloMios; paintMain(); };
  // Planilla Excel con las fichas privadas: el equipo, de todos; cada dirigente, de los jóvenes que acompaña.
  A.acFichasXlsx = async (el) => {
    const me = ctx.cloud.myUid();
    const list = (jovenes || []).filter((j) => j.activo !== false && j.etapa !== "equipo" && (st().isStaff || j.guia === me || j.guia2 === me));
    if (!list.length) { toast("No hay jóvenes para la planilla", ""); return; }
    el.disabled = true;
    try { const n = await fichasXlsx(list, ETAPAS); toast(`Planilla descargada con ${n} joven${n === 1 ? "" : "es"}. Guárdala en un lugar seguro: tiene datos personales.`, "ok", 6000); }
    catch (e) { console.warn(e); toast("No se pudo armar la planilla", ""); }
    el.disabled = false;
  };
  A.acNew = () => jovenEditor(null);
  A.acEdit = (el) => jovenEditor((jovenes || []).find((j) => j.id === el.dataset.id));
  A.acClose = () => document.getElementById("acDlg")?.close();
  A.acDel = async (el) => {
    if (!confirm("¿Quitar a esta persona de la lista? Si solo dejó de venir, mejor déjala en pausa.")) return;
    try { await ctx.cloud.deleteJoven(el.dataset.id); document.getElementById("acDlg")?.close(); toast("Quitado de la lista"); location.hash = "#/acompanar"; setTimeout(rebuildCumples, 800); } catch { toast("No se pudo quitar", ""); }
  };
  document.addEventListener("input", (e) => {
    if (e.target.id === "acSearch") { qJ = e.target.value; const pos = e.target.selectionStart; paintMain(); const i = $("#acSearch"); if (i) { i.focus(); i.setSelectionRange(pos, pos); } }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "acForm") {
      e.preventDefault();
      const f = new FormData(e.target), id = e.target.dataset.id || null, old = id && (jovenes || []).find((x) => x.id === id);
      const dd = String(f.get("dd") || ""), mm = String(f.get("mm") || "");
      const data = { ...(old || { desde: todayIso(), avatar: "" }),
        nombre: String(f.get("nombre") || "").trim(), etapa: String(f.get("etapa") || "ingreso"), cumple: dd && mm ? `${mm}-${dd}` : "",
        publico: f.get("publico") === "on", activo: old ? f.get("activo") === "on" : true, uid: st().isStaff ? String(f.get("uid") || "") : (old ? old.uid || "" : "") };
      delete data.id; delete data.updatedAt; delete data.updatedBy;
      if (!data.nombre) return;
      try { const nid = await ctx.cloud.saveJoven(id, data); document.getElementById("acDlg")?.close(); toast(id ? "Datos guardados" : "Agregado a la lista");
        setTimeout(rebuildCumples, 800); if (!id) location.hash = "#/acompanar/joven/" + encodeURIComponent(nid); }
      catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
    }
  });
}
