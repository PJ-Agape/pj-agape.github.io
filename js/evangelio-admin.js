// Gestión → Evangelio y fiestas: el Evangelio del día sale solo (calendario general de la Iglesia).
// Cuando en Chile o en la parroquia se celebra otra cosa (una fiesta de la Virgen, un santo, la fiesta
// patronal), aquí se fija el Evangelio de ese día: lo usan Inicio, la Capilla, la campanita y el saludo de buenos días.

import * as cloud from "./cloud.js";
import { esc, icon, toast } from "./util.js";
import { resetPropio } from "./capilla.js";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corta = (s) => { const [y, m, d] = s.split("-").map(Number); return `${d} ${MESES[m - 1]} ${y}`; };
// Plantillas frecuentes: el equipo revisa la cita con el leccionario o el misal antes de guardar
export const PLANTILLAS = [
  { k: "rosario", titulo: "Nuestra Señora del Rosario", cita: "Lc 1,26-38", frase: "Alégrate, llena de gracia, el Señor está contigo." },
  { k: "fatima", titulo: "Nuestra Señora de Fátima", cita: "Lc 1,26-38", frase: "Alégrate, llena de gracia, el Señor está contigo." },
  { k: "carmen", titulo: "Nuestra Señora del Carmen, Reina y Patrona de Chile", cita: "Jn 19,25-27", frase: "Ahí tienes a tu madre." },
  { k: "lourdes", titulo: "Nuestra Señora de Lourdes", cita: "Jn 2,1-11", frase: "Hagan todo lo que él les diga." },
];
let data = null, feed = null, edit = null;

async function load(force) {
  if (!data || force) data = (await cloud.getEvPropio().catch(() => null)) || { dias: {} };
  if (!data.dias) data.dias = {};
  if (!feed) feed = await fetch("data/evangelio.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
}

export async function adminView() {
  await load(true);
  const hoy = iso(new Date());
  const prox = Object.entries(data.dias).filter(([d]) => d >= hoy).sort(([a], [b]) => a.localeCompare(b));
  const pas = Object.entries(data.dias).filter(([d]) => d < hoy).sort(([a], [b]) => b.localeCompare(a)).slice(0, 10);
  const v = edit || { fecha: hoy, titulo: "", cita: "", frase: "", url: "" };
  const auto = feed && feed.days && feed.days[v.fecha];
  const row = ([d, o]) => `<li class="ev-row"><span class="fp-evd"><b>${+d.slice(8)}</b>${MESES[+d.slice(5, 7) - 1]}</span>
    <span style="flex:1"><b>${esc(o.titulo || "Fiesta propia")}</b><small class="muted">${esc(o.cita)}${o.frase ? ` · «${esc(o.frase)}»` : ""}</small></span>
    <button class="btn btn-sm btn-ghost" data-action="evaEdit" data-d="${d}">${icon("edit")}</button>
    <button class="btn btn-sm btn-ghost" data-action="evaDel" data-d="${d}" aria-label="Quitar">${icon("trash")}</button></li>`;
  return `<header class="page-head"><span class="eyebrow">Gestión · Contenidos</span><h1>Evangelio y <em>fiestas</em></h1>
    <p>El Evangelio de cada día llega solo, según el calendario general de la Iglesia. Cuando en Chile o en la parroquia se celebra otra fiesta, fija aquí sus lecturas: se verán en Inicio, en la Capilla y en el saludo de buenos días.</p></header>
  <form class="card stack" id="evaForm" style="--gap:12px" onsubmit="return false">
    <h2 class="fr-h">${edit && data.dias[edit.fecha] ? "Editar fiesta" : "Nueva fiesta"}</h2>
    <div class="can-chips"><span class="xs muted">Plantillas:</span>${PLANTILLAS.map((p) => `<button type="button" class="chip" data-action="evaTpl" data-k="${p.k}">${esc(p.titulo.split(",")[0])}</button>`).join("")}</div>
    <div class="ag-form-row"><div class="field"><label>Fecha</label><input class="input" type="date" name="fecha" id="evaFecha" required value="${esc(v.fecha)}"></div>
      <div class="field" style="flex:2"><label>Celebración</label><input class="input" name="titulo" maxlength="90" required value="${esc(v.titulo)}" placeholder="Ej.: Nuestra Señora del Rosario"></div></div>
    <div class="ag-form-row"><div class="field"><label>Cita del Evangelio</label><input class="input" name="cita" maxlength="40" required value="${esc(v.cita)}" placeholder="Ej.: Lc 1,26-38"></div>
      <div class="field" style="flex:2"><label>Frase breve del Evangelio</label><input class="input" name="frase" maxlength="160" value="${esc(v.frase)}" placeholder="Una línea que se entienda sola"></div></div>
    <div class="field"><label>Enlace al texto completo <span class="muted">(opcional)</span></label><input class="input" name="url" maxlength="300" value="${esc(v.url || "")}" placeholder="https://… (si no, se abre Vatican News)"></div>
    <p class="xs muted" id="evaAuto">${auto ? `Ese día el calendario general trae: <b>${esc(auto.titulo)}</b> · ${esc(auto.cita)}.` : "Revisa la cita en el leccionario o el misal antes de guardar."}</p>
    <div class="row-wrap"><span class="spacer"></span>${edit ? `<button type="button" class="btn btn-ghost btn-sm" data-action="evaNew">Cancelar</button>` : ""}<button class="btn btn-primary" data-action="evaSave">${icon("check")} Guardar</button></div>
  </form>
  <section class="card"><h2 class="fr-h">Próximas fiestas propias</h2>
    ${prox.length ? `<ul class="ev-list">${prox.map(row).join("")}</ul>` : `<p class="muted small">No hay fiestas propias programadas. Los demás días se usa el calendario general.</p>`}</section>
  ${pas.length ? `<details class="card"><summary class="fr-h">Fiestas anteriores (${pas.length})</summary><ul class="ev-list">${pas.map(row).join("")}</ul></details>` : ""}`;
}

let wired = false;
export function registerActions(A, rerender) {
  A.evaTpl = (el) => {
    const p = PLANTILLAS.find((x) => x.k === el.dataset.k), f = document.getElementById("evaForm"); if (!p || !f) return;
    f.elements.titulo.value = p.titulo; f.elements.cita.value = p.cita; f.elements.frase.value = p.frase;
  };
  A.evaEdit = (el) => { edit = { fecha: el.dataset.d, ...data.dias[el.dataset.d] }; rerender(); };
  A.evaNew = () => { edit = null; rerender(); };
  A.evaSave = async (el) => {
    const f = document.getElementById("evaForm"); if (!f || !f.reportValidity()) return;
    const g = (k) => String(f.elements[k].value || "").trim();
    const fecha = g("fecha"), o = { titulo: g("titulo").slice(0, 90), cita: g("cita").slice(0, 40), frase: g("frase").replace(/[«»]/g, "").slice(0, 160) };
    const url = g("url"); if (url) { if (!/^https:\/\//.test(url)) return toast("El enlace debe empezar con https://", ""); o.url = url.slice(0, 300); }
    el.disabled = true;
    try {
      await load(true);
      if (edit && edit.fecha !== fecha) delete data.dias[edit.fecha];
      data.dias[fecha] = o;
      // se guardan solo las del último año para que el documento no crezca sin fin
      const lim = iso(new Date(Date.now() - 365 * 86400000));
      Object.keys(data.dias).forEach((d) => { if (d < lim) delete data.dias[d]; });
      await cloud.saveEvPropio(data); resetPropio(); edit = null;
      toast(`Evangelio del ${corta(fecha)} guardado`, "ok"); rerender();
    } catch (e) { console.warn(e); toast("No se pudo guardar", ""); el.disabled = false; }
  };
  A.evaDel = async (el) => {
    if (!confirm(`¿Quitar la fiesta del ${corta(el.dataset.d)}? Ese día vuelve el Evangelio del calendario general.`)) return;
    try { await load(true); delete data.dias[el.dataset.d]; await cloud.saveEvPropio(data); resetPropio(); toast("Fiesta quitada"); rerender(); } catch { toast("No se pudo quitar", ""); }
  };
  if (wired) return; wired = true;
  document.addEventListener("change", (e) => {
    if (e.target.id !== "evaFecha") return;
    const a = feed && feed.days && feed.days[e.target.value], p = document.getElementById("evaAuto");
    if (p) p.innerHTML = a ? `Ese día el calendario general trae: <b>${esc(a.titulo)}</b> · ${esc(a.cita)}.` : "Revisa la cita en el leccionario o el misal antes de guardar.";
  });
}
