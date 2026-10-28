// Ficha privada de cada joven (#/ficha/{id}): los datos que el equipo necesita para cuidarlo en los
// encuentros y salidas (RUT, edad, dirección, contacto de emergencia, alergias…). Nunca se publica.
// La ven y editan el equipo coordinador, los dirigentes que lo acompañan y el propio joven si tiene cuenta.
// Lo ven el equipo, sus dirigentes y la propia persona.
import { esc, icon, toast } from "./util.js";
import { xlsxBlob } from "./xlsx-mini.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();

export const CAMPOS = [
  ["nombre", "Nombre completo", "text", 100, ""],
  ["rut", "RUT", "text", 15, "12.345.678-9"],
  ["nacimiento", "Fecha de nacimiento", "date", 10, ""],
  ["direccion", "Dirección", "text", 160, "Calle, número y comuna"],
  ["email", "Correo", "email", 120, ""],
  ["emergNombre", "En una emergencia, avisar a", "text", 80, "Nombre y parentesco. Ej.: María Soto, mamá"],
  ["emergTel", "Teléfono de emergencia", "tel", 40, "+56 9 …"],
  ["alergias", "Alergias", "area", 500, "A alimentos, medicamentos u otras. Si no tiene, escribe «Ninguna»."],
  ["notas", "Algo más que la familia quiera que el equipo sepa", "area", 1000, "Salud, medicamentos, cuidados especiales u otra cosa importante."],
];
export function edad(nac) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nac || "")) return "";
  const [y, m, d] = nac.split("-").map(Number), t = new Date();
  let e = t.getFullYear() - y; if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) e--;
  return e >= 0 && e < 120 ? e : "";
}
const fmtFecha = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || "") ? s.split("-").reverse().join("-") : "");
const first = (n) => String(n || "").split(" ")[0];

let cur = null; // { j, f, own }
export function view(jid) {
  const s = st();
  if (!ctx.cloud.enabled || !s.ready) return `<div class="card" style="text-align:center;padding:30px"><h2 class="display">Ficha privada</h2><p class="muted">Ingresa con tu cuenta para verla.</p></div>`;
  cur = null;
  ctx.onAfterRender(() => load(jid));
  return `<div id="fiRoot"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
async function load(jid) {
  const [j, f] = await Promise.all([ctx.cloud.getJoven(jid), ctx.cloud.getFicha(jid)]);
  const box = $("#fiRoot"); if (!box) return;
  if (!j) { box.innerHTML = `<div class="card" style="text-align:center;padding:30px"><h2 class="display">No tienes acceso a esta ficha</h2>
    <p class="muted" style="margin-top:6px">La ven solo el equipo coordinador, los dirigentes que acompañan a este joven y el propio joven.</p></div>`; return; }
  const own = j.uid && j.uid === ctx.cloud.myUid();
  cur = { j, f: f || {}, own };
  box.innerHTML = pageHTML();
}
function pageHTML() {
  const { j, f, own } = cur, n = first(j.nombre), e = edad(f.nacimiento);
  const crumbs = own ? `<a href="#/perfil">Mi perfil</a>` : `<a href="#/acompanar">Jóvenes</a>${icon("right")}<a href="#/acompanar/joven/${encodeURIComponent(j.id)}">${esc(j.nombre)}</a>`;
  const upd = f.updatedAt && f.updatedAt.toDate ? f.updatedAt.toDate().toLocaleDateString("es-CL") : "";
  return `<nav class="crumbs">${crumbs}${icon("right")}<span>Ficha privada</span></nav>
  <header class="page-head"><span class="eyebrow">${icon("lock")} Ficha privada</span><h1>${esc(own ? "Mis datos" : j.nombre)}${e !== "" ? ` <span class="fi-edad">${e} años</span>` : ""}</h1>
    <p>Datos para cuidar${own ? "te" : ` a ${esc(n)}`} en los encuentros y salidas. <b>No se publican</b>: solo los ven el equipo coordinador, ${own ? "tus dirigentes y tú" : `sus dirigentes y ${esc(n)}`}.</p></header>
  ${f.emergTel || f.alergias ? `<section class="card fi-urg">
    ${f.emergTel ? `<a class="btn btn-danger" href="tel:${esc(String(f.emergTel).replace(/[^\d+]/g, ""))}">${icon("phone")} Llamar${f.emergNombre ? ` a ${esc(f.emergNombre)}` : ""} · ${esc(f.emergTel)}</a>` : ""}
    ${f.alergias ? `<p class="fi-alerg"><b>Alergias:</b> ${esc(f.alergias)}</p>` : ""}</section>` : ""}
  <form id="fiForm" class="card stack fi-form" style="--gap:14px">
    ${CAMPOS.map(([k, l, t, max, ph]) => `<div class="field"><label for="fi_${k}">${esc(l)}</label>${t === "area"
      ? `<textarea class="textarea" id="fi_${k}" name="${k}" rows="3" maxlength="${max}" placeholder="${esc(ph)}">${esc(f[k] || "")}</textarea>`
      : `<input class="input" id="fi_${k}" name="${k}" type="${t}" maxlength="${max}" placeholder="${esc(ph)}" value="${esc(f[k] || (k === "nombre" && !f.nombre ? j.nombre : ""))}">`}</div>`).join("")}
    <p class="xs muted">${upd ? `Actualizada el ${esc(upd)}${f.updatedBy ? ` por ${esc(f.updatedBy)}` : ""}. ` : ""}Si cambia algún dato, actualízalo aquí.</p>
    <div class="row-wrap"><button class="btn btn-primary" type="submit">${icon("check")} Guardar la ficha</button></div>
  </form>`;
}

// Planilla Excel con las fichas de una lista de jóvenes (cada uno ve solo las que puede leer).
export async function planilla(jovenes, etapas = {}) {
  const fichas = await Promise.all(jovenes.map((j) => ctx.cloud.getFicha(j.id).then((f) => [j, f || {}])));
  const head = ["Nombre en la lista", "Etapa", "Nombre completo", "RUT", "Fecha de nacimiento", "Edad", "Dirección", "Correo", "En emergencia, avisar a", "Teléfono de emergencia", "Alergias", "Otros datos importantes"];
  const rows = fichas.sort((a, b) => String(a[0].nombre).localeCompare(String(b[0].nombre), "es")).map(([j, f]) => [
    j.nombre, (etapas[j.etapa] || {}).l || j.etapa || "", f.nombre || "", f.rut || "", fmtFecha(f.nacimiento), String(edad(f.nacimiento)), f.direccion || "", f.email || "",
    f.emergNombre || "", f.emergTel || "", f.alergias || "", f.notas || ""]);
  const blob = xlsxBlob([head, ...rows], { sheet: "Fichas", widths: [22, 12, 28, 14, 14, 7, 30, 26, 26, 18, 30, 40] });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `fichas-agape-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return rows.length;
}

function registerActions() {
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "fiForm" || !cur) return;
    e.preventDefault();
    const fd = new FormData(e.target), data = {};
    for (const [k, , , max] of CAMPOS) data[k] = String(fd.get(k) || "").trim().slice(0, max);
    if (data.rut && !/^[0-9.]{6,12}-?[0-9kK]$/.test(data.rut)) { toast("Revisa el RUT (ej.: 12.345.678-9)", ""); return; }
    if (data.nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(data.nacimiento)) data.nacimiento = "";
    const btn = e.target.querySelector("[type=submit]"); btn.disabled = true;
    try { await ctx.cloud.saveFicha(cur.j.id, data); toast("Ficha guardada", "ok"); load(cur.j.id); }
    catch (err) { console.warn(err); btn.disabled = false; toast("No se pudo guardar: " + (err.code || err.message), ""); }
  });
}
