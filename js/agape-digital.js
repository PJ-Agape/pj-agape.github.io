// Ágape digital: la red de «internautas que rezan» que llega por el saludo del día.
// Quien llega sin cuenta a la Capilla ve una bienvenida y puede dejar su intención (sin cuenta);
// el equipo y los dirigentes ven la lista de la semana para llevarla a la misa del grupo.

import { esc, icon, toast } from "./util.js";
import * as cloud from "./cloud.js";

// El sello: la cruz al centro y las ondas de la red que salen de ella.
export const SELLO = (cls = "") => `<svg class="ad-sello ${cls}" viewBox="0 0 80 80" aria-hidden="true">
  <circle cx="40" cy="40" r="37" fill="#0b2566"/>
  <circle cx="40" cy="40" r="31" fill="#fff6e5"/>
  <g fill="none" stroke="#ef591c" stroke-width="3.4" stroke-linecap="round">
    <path d="M24 30a22 22 0 0 1 32 0"/><path d="M18 24a30 30 0 0 1 44 0" opacity=".55"/></g>
  <path d="M40 32v26M31 41h18" stroke="#ffba03" stroke-width="6" stroke-linecap="round"/>
  <path d="M40 32v26M31 41h18" stroke="#0b2566" stroke-width="2" stroke-linecap="round" opacity=".25"/>
</svg>`;

let ctx = null; // { actions, render }
export function setup(c) { ctx = c; registerActions(); }

const CERRADA = "agape_red_cerrada";
const LLEGA = "agape_red_llega";
// ¿Llegó recién desde el enlace del saludo? (capilla/index.html deja la marca)
export function llegoDelMensaje() {
  try { const v = sessionStorage.getItem(LLEGA); if (v) { sessionStorage.removeItem(LLEGA); return true; } } catch {}
  return false;
}
const cerradaHoy = () => { try { return localStorage.getItem(CERRADA) === new Date().toDateString(); } catch { return false; } };

// Bienvenida (solo para quienes no tienen cuenta)
export function bienvenidaHTML() {
  if (cloud.state().ready || cerradaHoy()) return "";
  return `<section class="card ad-bienv" id="adBienv" aria-labelledby="adT">
    <button class="icon-btn ad-x" data-action="adCerrar" aria-label="Cerrar la bienvenida">${icon("x")}</button>
    <div class="ad-head">${SELLO("ad-sello-l")}
      <div><span class="ad-hand">bienvenido al</span>
        <h2 id="adT">Ágape <em>digital</em></h2>
        <p class="ad-lema">una red de internautas que rezan</p></div></div>
    <p class="ad-txt">Detrás de esta Capilla hay jóvenes de la Parroquia San Miguel de Yungay que rezan por ti. Hoy te sumas a la red: lee el Evangelio, deja tu intención y reenvía el mensaje para que llegue a más personas.</p>
    <div class="row-wrap ad-btns">
      <button class="btn btn-gold" data-action="adIntencion">${icon("flame")} Dejar mi intención</button>
      <button class="btn btn-ghost" data-action="adEvangelio">${icon("book")} Leer el Evangelio de hoy</button>
    </div>
    <div id="adFormBox"></div>
  </section>`;
}

// Formulario de intención sin cuenta (va también en «Nuestras intenciones» para quien no tiene cuenta)
export function formHTML(id = "adForm") {
  if (!cloud.enabled) return "";
  return `<form class="ad-form" id="${id}" data-adform novalidate>
    <label class="ad-f"><strong>Tu intención</strong><span>¿Por quién o por qué quieres que recemos? La llevamos a la misa del grupo.</span>
      <textarea class="textarea" name="t" rows="3" maxlength="500" required placeholder="Por mi familia… Por un enfermo… Por la paz…"></textarea></label>
    <label class="ad-f"><strong>Tu nombre <span class="muted">(opcional)</span></strong>
      <input class="input" name="n" maxlength="40" autocomplete="given-name" placeholder="Puedes dejarlo en blanco"></label>
    <div class="cono-hp" aria-hidden="true"><label>No completar <input name="web" tabindex="-1" autocomplete="off"></label></div>
    <p class="xs muted">Solo la lee el equipo de Ágape. En la misa la presentamos sin tu nombre; no se publica ni se comparte.</p>
    <button class="btn btn-primary" type="submit">${icon("send")} Enviar mi intención</button>
  </form>`;
}
const gracias = () => `<div class="ad-ok">${SELLO("ad-sello-s")}<div><strong>¡Gracias! Ya estamos rezando contigo.</strong>
  <span>Tu intención va a la misa del grupo. Ahora eres parte del Ágape digital: reenvía el mensaje de hoy para que la red siga creciendo.</span></div></div>`;

// Para el equipo y los dirigentes: las intenciones de la semana, para llevarlas a la misa
function semana(d) { const t = d && d.toDate ? d.toDate() : d ? new Date(d) : null; return t && Date.now() - t.getTime() <= 7 * 86400000; }
const fechaCorta = (d) => { const t = d && d.toDate ? d.toDate() : new Date(d); return t.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" }); };
async function listaMisa() {
  const [velas, red] = await Promise.all([cloud.recentVelas(80).catch(() => []), cloud.listIntencionesRed().catch(() => null)]);
  return { velas: (velas || []).filter((v) => semana(v.createdAt) && (v.text || "").trim()), red: red === null ? null : red.filter((r) => semana(r.createdAt)) };
}
export function botonMisaHTML() {
  return cloud.state().isGuide ? `<button class="btn btn-sm btn-soft ad-misa-btn" data-action="adMisa">${icon("print")} Intenciones para la misa</button>` : "";
}
async function abrirMisa() {
  let d = document.getElementById("adMisaDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "adMisaDlg"; d.className = "sheet"; document.body.appendChild(d); }
  d.innerHTML = `<div class="sheet-head"><div style="flex:1"><span class="eyebrow">Para la misa del grupo</span><h2>Intenciones de la semana</h2></div>
    <button type="button" class="icon-btn" data-action="adMisaX" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body" id="adMisaBody"><p class="muted">Cargando…</p></div>`;
  d.showModal();
  const { velas, red } = await listaMisa();
  const body = document.getElementById("adMisaBody"); if (!body) return;
  const item = (t, who, f, del) => `<li><p>${esc(t)}</p><small>${who ? esc(who) + " · " : ""}${esc(f)}</small>${del ? `<button class="sal-link ad-del" data-action="adDel" data-id="${esc(del)}">Borrar</button>` : ""}</li>`;
  body.innerHTML = `<p class="small muted">Las de los últimos 7 días: las velas de la comunidad y las que dejó el Ágape digital sin cuenta.</p>
    <h3 class="ad-mh">Del Ágape digital <b>${red ? red.length : 0}</b></h3>
    ${red === null ? `<p class="note">No se pudieron leer: falta publicar las reglas nuevas de Firebase (intenciones_red).</p>`
      : red.length ? `<ol class="ad-ml">${red.map((r) => item(r.t, r.n || "Sin nombre", fechaCorta(r.createdAt), r.id)).join("")}</ol>` : `<p class="muted small">Esta semana no llegaron intenciones de la red.</p>`}
    <h3 class="ad-mh">De la comunidad (velas) <b>${velas.length}</b></h3>
    ${velas.length ? `<ol class="ad-ml">${velas.map((v) => item(v.text, v.authorName || "", fechaCorta(v.createdAt))).join("")}</ol>` : `<p class="muted small">Esta semana no hay velas con intención escrita.</p>`}
    <div class="row-wrap" style="margin-top:14px"><span class="spacer"></span><button class="btn btn-primary" data-action="adMisaPrint">${icon("print")} Imprimir para la misa</button></div>`;
  ultima = { velas, red: red || [] };
}
let ultima = null;
function imprimirMisa() {
  if (!ultima) return;
  let box = document.getElementById("adPrint");
  if (!box) { box = document.createElement("div"); box.id = "adPrint"; document.body.appendChild(box); }
  const todas = [...ultima.red.map((r) => r.t), ...ultima.velas.map((v) => v.text)];
  const hoy = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  box.innerHTML = `<header class="adp-h">${SELLO("adp-sello")}<div><span>Pastoral Juvenil Ágape · Ágape digital</span><h1>Intenciones para la misa</h1><p>${esc(hoy)}</p></div></header>
    <p class="adp-intro">Señor, te presentamos las intenciones de nuestra comunidad y de quienes rezan con nosotros a la distancia:</p>
    <ol class="adp-l">${todas.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
    <p class="adp-fin">Por todas estas intenciones, y por las que llevamos en silencio, roguemos al Señor.</p>`;
  document.body.classList.add("ad-printing");
  const done = () => { document.body.classList.remove("ad-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 200);
}

function registerActions() {
  const A = ctx.actions;
  A.adCerrar = () => { try { localStorage.setItem(CERRADA, new Date().toDateString()); } catch {} document.getElementById("adBienv")?.remove(); };
  A.adEvangelio = () => { const g = document.getElementById("capGospel"); if (g) g.scrollIntoView({ behavior: "smooth", block: "start" }); };
  A.adIntencion = () => {
    const box = document.getElementById("adFormBox"); if (!box) return;
    if (!box.innerHTML.trim()) box.innerHTML = formHTML("adForm");
    box.querySelector("textarea")?.focus();
  };
  A.adMisa = () => abrirMisa();
  A.adMisaX = () => document.getElementById("adMisaDlg")?.close();
  A.adMisaPrint = () => imprimirMisa();
  A.adDel = async (el) => {
    if (!confirm("¿Borrar esta intención?")) return;
    try { await cloud.deleteIntencionRed(el.dataset.id); el.closest("li")?.remove(); } catch { toast("No se pudo borrar", ""); }
  };
  document.addEventListener("submit", async (e) => {
    const f = e.target; if (!f.matches || !f.matches("[data-adform]")) return;
    e.preventDefault();
    if (f.web && f.web.value) return; // robots
    const t = f.t.value.trim(), n = f.n.value.trim();
    if (t.length < 3) { toast("Escribe tu intención", ""); f.t.focus(); return; }
    const b = f.querySelector("button[type=submit]"); if (b) b.disabled = true;
    try { await cloud.saveIntencionRed({ t: t.slice(0, 500), n: n.slice(0, 40) }); f.outerHTML = gracias(); }
    catch (err) { console.warn(err); toast("No se pudo enviar. Revisa tu conexión e intenta de nuevo.", "", 5000); if (b) b.disabled = false; }
  });
}
