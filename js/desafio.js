// Desafío de la semana (tarjeta en Comunidad). Lo propone el equipo desde la misma tarjeta.
// Cada uno marca «¡Lo cumplí!».

import { esc, icon, toast } from "./util.js";
import { svg as avatarSvg } from "./avatares.js";

let ctx = null; // { actions, render, cloud }
export function setup(c) { ctx = c; registerActions(); }
const st = () => ctx.cloud.state();
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ETAPA_L = { ingreso: "Ingreso", madurez: "Madurez", aspirante: "Aspirante" };
function monday(d = new Date()) { const x = new Date(d); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
const weekOf = () => { const m = monday(), s = new Date(m); s.setDate(s.getDate() + 6); return { desde: iso(m), hasta: iso(s) }; };

let cur = null; // { key, title, items: [{etapa, text}], source }
let guardado = null; // el desafío tal como está guardado (para editarlo o quitarlo)
async function loadCur() {
  const today = iso(new Date());
  const custom = await ctx.cloud.getDesafio();
  guardado = custom && custom.texto ? custom : null;
  if (custom && custom.texto && (!custom.desde || today >= custom.desde) && (!custom.hasta || today <= custom.hasta)) {
    cur = { key: `c-${custom.desde || "x"}`, title: custom.titulo || "Desafío de la semana", items: [{ text: custom.texto }], source: "equipo", hasta: custom.hasta || "" };
  } else cur = null;
}
export async function homeCard() {
  const slot = document.getElementById("desafioSlot"); if (!slot || !ctx.cloud.enabled) return;
  await loadCur();
  paint();
}
// Lo que le toca a cada uno (si el desafío trae uno por etapa)
function itemsFor() {
  const role = st().account && st().account.role;
  const pref = ["aspirante", "ingreso", "madurez"].includes(role) ? role : null;
  return pref && cur.items.some((i) => i.etapa === pref) ? cur.items.filter((i) => i.etapa === pref) : cur.items;
}
// Hoy: «Recuerda que tienes un desafío pendiente», hasta que la persona marque «¡Lo cumplí!».
export async function homeReminder() {
  const slot = document.getElementById("desafioHoy"); if (!slot || !ctx.cloud.enabled || !st().ready) return;
  await loadCur().catch(() => { cur = null; });
  const s = document.getElementById("desafioHoy"); if (!s) return;
  if (!cur || !cur.items.length) { s.innerHTML = ""; return; }
  const list = await ctx.cloud.listDesafio(cur.key).catch(() => []);
  if ((list || []).some((d) => d.id === ctx.cloud.myUid())) { s.innerHTML = ""; return; }
  const t = cur.title.replace(/^Desafío de la semana · /, "").trim();
  s.innerHTML = `<section class="card des-hoy" aria-labelledby="desHoyT">
    <span class="des-hoy-ico" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><circle cx="22" cy="26" r="17"/><circle cx="22" cy="26" r="10"/><circle cx="22" cy="26" r="3.4" fill="currentColor"/><path d="M22 26 L41 7 M35 6 L41 7 L42 13"/></svg></span>
    <div class="des-hoy-txt">
      <span class="des-hoy-hand">recuerda que tienes un desafío pendiente</span>
      <h2 id="desHoyT">${esc(t && !/^desaf[ií]o de la semana$/i.test(t) ? t : "Desafío de la semana")}</h2>
      ${itemsFor().map((i) => `<p>${esc(i.text)}</p>`).join("")}
      ${cur.hasta ? `<span class="xs muted">Tienes hasta el ${esc(fechaLarga(cur.hasta))}.</span>` : ""}
      <div class="des-hoy-b"><button class="btn btn-gold btn-sm" data-action="desDone" data-on="1" data-from="hoy">${icon("check")} ¡Lo cumplí!</button>
        <a class="btn btn-ghost btn-sm" href="#/red">Ver quiénes lo cumplieron</a></div>
    </div></section>`;
}
const fechaLarga = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }); };
let done = null;
async function paint() {
  const slot = document.getElementById("desafioSlot"); if (!slot) return;
  if (!cur || !cur.items.length) {
    slot.innerHTML = st().isStaff ? `<div class="row-wrap" style="margin-top:12px"><button class="btn btn-sm btn-ghost" data-action="desNew">${icon("plus")} Proponer un desafío de la semana</button>
      ${guardado ? `<span class="xs muted">Hay uno guardado para ${guardado.desde && iso(new Date()) < guardado.desde ? "más adelante" : "fechas que ya pasaron"}. <button class="sal-link" data-action="desEdit">Editarlo</button> · <button class="sal-link" data-action="desDel">Quitarlo</button></span>` : ""}</div>` : "";
    return;
  }
  if (st().ready) done = await ctx.cloud.listDesafio(cur.key); else done = [];
  const me = ctx.cloud.myUid(), mine = (done || []).some((d) => d.id === me);
  const items = itemsFor();
  const s = document.getElementById("desafioSlot"); if (!s) return;
  s.innerHTML = `<section class="card desafio">
    <div class="desafio-head"><span class="desafio-ico" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><circle cx="22" cy="26" r="17"/><circle cx="22" cy="26" r="10"/><circle cx="22" cy="26" r="3.4" fill="currentColor"/><path d="M22 26 L41 7 M35 6 L41 7 L42 13"/></svg></span><div style="flex:1"><span class="desafio-hand">esta semana te desafiamos</span>${((t) => t && !/^desaf[ií]o de la semana$/i.test(t) ? `<h3>${esc(t)}</h3>` : "")(cur.title.replace(/^Desafío de la semana · /, "").trim())}<span class="desafio-src">Desafío de la semana · propuesto por el equipo</span></div>
      </div>
    <div class="desafio-list">${items.map((i) => `<p>${i.etapa ? `<span class="chip">${esc(ETAPA_L[i.etapa] || i.etapa)}</span> ` : ""}${esc(i.text)}</p>`).join("")}</div>
    <div class="desafio-foot">
      <div class="desafio-who">${(done || []).slice(0, 8).map((d) => d.a && avatarSvg(d.a) ? `<span class="avatar av-ill" title="${esc(d.n)}">${avatarSvg(d.a)}</span>` : `<span class="avatar" title="${esc(d.n)}">${esc(String(d.n || "?").slice(0, 1))}</span>`).join("")}
        <span class="small"><b>${(done || []).length}</b> ${(done || []).length === 1 ? "lo cumplió" : "lo cumplieron"}</span></div>
      ${st().ready ? `<button class="btn btn-sm ${mine ? "btn-soft" : "btn-gold"}" data-action="desDone" data-on="${mine ? 0 : 1}">${mine ? "✓ ¡Lo cumplí!" : "¡Lo cumplí!"}</button>` : ""}
    </div>
    ${st().isStaff ? `<div class="desafio-admin"><span class="xs muted">Solo el equipo ve esto:</span>
      <button class="btn btn-sm btn-ghost" data-action="desEdit">${icon("edit")} Editar</button>
      <button class="btn btn-sm btn-ghost" data-action="desNew">${icon("plus")} Proponer otro</button>
      <button class="btn btn-sm btn-danger" data-action="desDel">${icon("trash")} Quitar</button></div>` : ""}</section>`;
}
function editor(prev) {
  let d = document.getElementById("desDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "desDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const w = weekOf();
  d.innerHTML = `<form method="dialog" id="desForm"><div class="sheet-head"><div style="flex:1"><span class="eyebrow">Inicio</span><h2>Desafío de la semana</h2></div>
      <button type="button" class="icon-btn" data-action="desClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Título</label><input class="input" name="titulo" maxlength="80" value="${esc((prev && prev.titulo) || "Desafío de la semana")}"></div>
      <div class="field"><label>El desafío</label><textarea class="textarea" name="texto" rows="3" maxlength="300" required placeholder="Algo concreto y alcanzable: «Esta semana, escribe a alguien que no ves hace tiempo»">${esc((prev && prev.texto) || "")}</textarea></div>
      <div class="ag-form-row">
        <div class="field"><label>Desde</label><input class="input" type="date" name="desde" value="${esc((prev && prev.desde) || w.desde)}"></div>
        <div class="field"><label>Hasta</label><input class="input" type="date" name="hasta" value="${esc((prev && prev.hasta) || w.hasta)}"></div>
      </div>
      <p class="xs muted">Se muestra en Comunidad entre las fechas que elijas.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="desClose">Cancelar</button><button class="btn btn-primary" type="submit">${prev ? "Guardar cambios" : "Publicar"}</button></div></form>`;
  d.showModal();
}
function registerActions() {
  const A = ctx.actions;
  A.desNew = () => editor(null);
  A.desEdit = () => editor(guardado);
  A.desDel = async () => {
    if (!confirm("¿Quitar el desafío? Deja de verse en Comunidad.")) return;
    try { await ctx.cloud.saveDesafio({}); guardado = null; toast("Desafío quitado"); homeCard(); } catch { toast("No se pudo quitar", ""); }
  };
  A.desClose = () => document.getElementById("desDlg")?.close();
  A.desDone = async (el) => {
    if (!cur) return;
    const on = el.dataset.on === "1";
    try {
      await ctx.cloud.markDesafio(cur.key, on);
      if (on) toast("¡Bien! Desafío cumplido", "ok");
      const h = document.getElementById("desafioHoy");
      if (h && el.dataset.from === "hoy") { const c = h.firstElementChild; if (c) { c.classList.add("is-done"); setTimeout(() => { h.innerHTML = ""; }, 450); } else h.innerHTML = ""; }
      paint();
    } catch { toast("No se pudo guardar", ""); }
  };
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "desForm") return;
    e.preventDefault();
    const f = new FormData(e.target);
    const data = { titulo: String(f.get("titulo") || "").trim() || "Desafío de la semana", texto: String(f.get("texto") || "").trim(), desde: String(f.get("desde") || ""), hasta: String(f.get("hasta") || "") };
    if (!data.texto) return;
    try { await ctx.cloud.saveDesafio(data); document.getElementById("desDlg")?.close(); toast("Desafío publicado"); homeCard(); } catch { toast("No se pudo publicar", ""); }
  });
}
