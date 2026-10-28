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
export async function homeCard() {
  const slot = document.getElementById("desafioSlot"); if (!slot || !ctx.cloud.enabled) return;
  const today = iso(new Date());
  const custom = await ctx.cloud.getDesafio();
  if (custom && custom.texto && (!custom.desde || today >= custom.desde) && (!custom.hasta || today <= custom.hasta)) {
    cur = { key: `c-${custom.desde || "x"}`, title: custom.titulo || "Desafío de la semana", items: [{ text: custom.texto }], source: "equipo" };
  } else cur = null;
  paint();
}
let done = null;
async function paint() {
  const slot = document.getElementById("desafioSlot"); if (!slot) return;
  if (!cur || !cur.items.length) {
    slot.innerHTML = st().isStaff ? `<div class="row-wrap" style="margin-top:12px"><button class="btn btn-sm btn-ghost" data-action="desNew">${icon("plus")} Proponer un desafío de la semana</button></div>` : "";
    return;
  }
  if (st().ready) done = await ctx.cloud.listDesafio(cur.key); else done = [];
  const me = ctx.cloud.myUid(), mine = (done || []).some((d) => d.id === me);
  const role = st().account && st().account.role;
  const pref = ["aspirante", "ingreso", "madurez"].includes(role) ? role : null;
  const items = pref && cur.items.some((i) => i.etapa === pref) ? cur.items.filter((i) => i.etapa === pref) : cur.items;
  const s = document.getElementById("desafioSlot"); if (!s) return;
  s.innerHTML = `<section class="card desafio">
    <div class="desafio-head"><span class="desafio-ico" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><circle cx="22" cy="26" r="17"/><circle cx="22" cy="26" r="10"/><circle cx="22" cy="26" r="3.4" fill="currentColor"/><path d="M22 26 L41 7 M35 6 L41 7 L42 13"/></svg></span><div style="flex:1"><span class="desafio-hand">esta semana te desafiamos</span>${((t) => t && !/^desaf[ií]o de la semana$/i.test(t) ? `<h3>${esc(t)}</h3>` : "")(cur.title.replace(/^Desafío de la semana · /, "").trim())}<span class="desafio-src">Desafío de la semana · propuesto por el equipo</span></div>
      ${st().isStaff ? `<button class="icon-btn" data-action="desNew" aria-label="Proponer otro desafío">${icon("edit")}</button>` : ""}</div>
    <div class="desafio-list">${items.map((i) => `<p>${i.etapa ? `<span class="chip">${esc(ETAPA_L[i.etapa] || i.etapa)}</span> ` : ""}${esc(i.text)}</p>`).join("")}</div>
    <div class="desafio-foot">
      <div class="desafio-who">${(done || []).slice(0, 8).map((d) => d.a && avatarSvg(d.a) ? `<span class="avatar av-ill" title="${esc(d.n)}">${avatarSvg(d.a)}</span>` : `<span class="avatar" title="${esc(d.n)}">${esc(String(d.n || "?").slice(0, 1))}</span>`).join("")}
        <span class="small"><b>${(done || []).length}</b> ${(done || []).length === 1 ? "lo cumplió" : "lo cumplieron"}</span></div>
      ${st().ready ? `<button class="btn btn-sm ${mine ? "btn-soft" : "btn-gold"}" data-action="desDone" data-on="${mine ? 0 : 1}">${mine ? "✓ ¡Lo cumplí!" : "¡Lo cumplí!"}</button>` : ""}
    </div></section>`;
}
function editor() {
  let d = document.getElementById("desDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "desDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const w = weekOf();
  d.innerHTML = `<form method="dialog" id="desForm"><div class="sheet-head"><div style="flex:1"><span class="eyebrow">Inicio</span><h2>Desafío de la semana</h2></div>
      <button type="button" class="icon-btn" data-action="desClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Título</label><input class="input" name="titulo" maxlength="80" value="Desafío de la semana"></div>
      <div class="field"><label>El desafío</label><textarea class="textarea" name="texto" rows="3" maxlength="300" required placeholder="Algo concreto y alcanzable: «Esta semana, escribe a alguien que no ves hace tiempo»"></textarea></div>
      <div class="ag-form-row">
        <div class="field"><label>Desde</label><input class="input" type="date" name="desde" value="${w.desde}"></div>
        <div class="field"><label>Hasta</label><input class="input" type="date" name="hasta" value="${w.hasta}"></div>
      </div>
      <p class="xs muted">Se muestra en Comunidad entre las fechas que elijas.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="desClose">Cancelar</button><button class="btn btn-primary" type="submit">Publicar</button></div></form>`;
  d.showModal();
}
function registerActions() {
  const A = ctx.actions;
  A.desNew = () => editor();
  A.desClose = () => document.getElementById("desDlg")?.close();
  A.desDone = async (el) => {
    if (!cur) return;
    const on = el.dataset.on === "1";
    try { await ctx.cloud.markDesafio(cur.key, on); if (on) toast("🎯 ¡Bien! Desafío cumplido"); paint(); } catch { toast("No se pudo guardar", ""); }
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
