// Gestión, etapa 2: lo que antes se hacía en pantallas sueltas, ahora dentro del panel.
//  · Moderación: reportes del muro (publicaciones y respuestas) y del chat en un solo lugar
//  · Consentimientos: qué familias firmaron y qué autorizaron (solo administración)

import * as cloud from "./cloud.js";
import { esc, icon, toast } from "./util.js";

const st = () => cloud.state();
let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
const corto = (n) => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0] || ""; };

// ---------------------------------------------------------------------------
// Moderación  (#/admin/moderacion)
// ---------------------------------------------------------------------------
export function moderacionHTML() {
  setTimeout(paintMod, 0);
  return `<header class="page-head"><span class="eyebrow">Gestión · Comunicación</span><h1>Moderación</h1>
    <p>Todo lo reportado del muro y del chat en un solo lugar. Ocultar lo saca de la vista de todos sin borrarlo; el equipo lo sigue viendo.</p></header>
    <div class="row-wrap" style="gap:8px;margin-bottom:12px">
      <a class="btn btn-sm btn-soft" href="#/muro">${icon("chat")} Ir al muro</a><a class="btn btn-sm btn-soft" href="#/chat">${icon("chat")} Ir al chat</a>
      <button class="btn btn-sm btn-soft" data-action="salaNew">${icon("plus")} Nueva sala</button>
      ${st().isAdmin ? `<button class="btn btn-sm btn-soft" data-action="chatCfg">Horario y limpieza del chat</button>` : ""}</div>
    <div id="gmBox"><p class="muted" style="padding:24px;text-align:center">Buscando reportes…</p></div>`;
}
let M = null;
async function paintMod() {
  const box = document.getElementById("gmBox"); if (!box) return;
  await cloud.loadSalas().catch(() => {});
  const [wall, reps, chat] = await Promise.all([cloud.latestWall().catch(() => []), cloud.flaggedReplies().catch(() => []), cloud.reportedChat(cloud.allSalas().map((s) => s.key)).catch(() => [])]);
  M = { wall, reps, chat };
  const nrep = (x) => Object.keys(x.reports || {}).length;
  const posts = wall.filter((p) => nrep(p) || p.hidden).sort((a, b) => nrep(b) - nrep(a));
  const salaName = (k) => (cloud.allSalas().find((s) => s.key === k) || {}).name || k;
  const row = (kind, x, txt, extra) => `<div class="card gm-i ${x.hidden ? "off" : ""}"><div style="flex:1;min-width:0">
      <span class="xs muted">${extra} · ${esc(x.authorName || "")}${nrep(x) ? ` · <b class="gm-rep">${nrep(x)} reporte${nrep(x) > 1 ? "s" : ""}</b>` : ""}${x.hidden ? " · oculto" : ""}</span>
      <p class="gm-t">${esc(String(txt || "").slice(0, 280))}</p></div>
      <div class="gm-a">${kind !== "chat" ? `<button class="btn btn-sm btn-soft" data-action="gmHide" data-k="${kind}" data-id="${esc(x.id)}" data-p="${esc(x.pid || "")}" data-on="${x.hidden ? "0" : "1"}">${x.hidden ? "Mostrar" : "Ocultar"}</button>` : ""}
        ${nrep(x) && kind !== "chat" ? `<button class="btn btn-sm btn-ghost" data-action="gmClear" data-k="${kind}" data-id="${esc(x.id)}" data-p="${esc(x.pid || "")}">Quitar reportes</button>` : ""}
        <button class="btn btn-sm btn-ghost" data-action="gmDel" data-k="${kind}" data-id="${esc(x.id)}" data-p="${esc(x.pid || x.sala || "")}" aria-label="Borrar">${icon("trash")}</button></div></div>`;
  const n = posts.length + reps.length + chat.length;
  box.innerHTML = n ? `
    ${posts.length ? `<h2 class="mag-hub-sub">Publicaciones del muro · ${posts.length}</h2>${posts.map((p) => row("post", p, `${p.title}${p.body ? " — " + p.body : ""}`, `<a href="#/muro/${esc(p.id)}">Muro</a>`)).join("")}` : ""}
    ${reps.length ? `<h2 class="mag-hub-sub">Respuestas · ${reps.length}</h2>${reps.map((r) => row("reply", r, r.body, `<a href="#/muro/${esc(r.pid)}">Respuesta</a>`)).join("")}` : ""}
    ${chat.length ? `<h2 class="mag-hub-sub">Chat · ${chat.length}</h2>${chat.map((m) => row("chat", m, m.text, `<a href="#/chat/${esc(m.sala)}">${esc(salaName(m.sala))}</a>`)).join("")}` : ""}`
    : `<div class="card gh-ok"><b>Sin reportes</b><p class="muted small">No hay nada reportado ni oculto en el muro o el chat.</p></div>`;
}

// ---------------------------------------------------------------------------
// Consentimientos  (#/admin/consentimientos) — solo administración
// ---------------------------------------------------------------------------
const YOUTH = ["ingreso", "madurez", "aspirante"];
export function consentHTML() {
  setTimeout(paintCons, 0);
  return `<header class="page-head"><span class="eyebrow">Gestión · Personas</span><h1>Consentimientos</h1>
    <p>Qué familias firmaron el consentimiento y qué autorizaron. El papel se guarda en la carpeta de consentimientos; aquí solo queda el registro.</p></header>
    <div class="row-wrap" style="margin-bottom:12px"><button class="btn btn-sm btn-soft" data-action="aConsentPdf">${icon("dl")} Descargar el consentimiento (PDF)</button></div>
    <div id="gcBox"><p class="muted" style="padding:24px;text-align:center">Cargando…</p></div>`;
}
async function paintCons() {
  const box = document.getElementById("gcBox"); if (!box) return;
  const ad = await cloud.adminData().catch(() => null);
  if (!ad) { box.innerHTML = `<div class="note">No se pudo cargar. Revisa tu conexión.</div>`; return; }
  const list = [...ad.users.filter((u) => YOUTH.includes(u.role) && u.active !== false).map((u) => ({ ...u, link: `#/admin/dirigentes/${encodeURIComponent(u.uid)}` })),
    ...ad.invites.filter((i) => YOUTH.includes(i.role)).map((i) => ({ ...i, name: i.name || i.id, pend: true, link: "#/admin/dirigentes" }))]
    .sort((a, b) => (!!a.consent - !!b.consent) || String(a.name).localeCompare(String(b.name), "es"));
  const yes = (v) => (v ? "✓" : "—");
  const falta = list.filter((u) => !u.consent).length;
  box.innerHTML = `${falta ? `<div class="note warn" style="margin-bottom:12px"><b>${falta}</b> joven${falta > 1 ? "es" : ""} sin consentimiento registrado.</div>` : `<div class="note" style="margin-bottom:12px">✓ Todos los jóvenes tienen su consentimiento registrado.</div>`}
    <div class="gf-tablewrap"><table class="gf-table gc-table"><thead><tr><th>Joven</th><th>Rol</th><th>Consentimiento</th><th>Cuadro de honor</th><th>Cumpleaños</th><th>Fotos</th><th>Ficha privada</th><th>Avisos</th><th></th></tr></thead>
    <tbody>${list.map((u) => { const c = u.consent || {};
      return `<tr class="${u.consent ? "" : "dirty"}"><th>${esc(corto(u.name))}${u.pend ? ` <span class="chip">Invitación</span>` : ""}</th><td>${esc(cloud.roleLabel(u.role))}</td>
        <td>${!u.consent ? `<b class="gm-rep">Falta</b>` : c.mayor ? "Mayor de 18" : `✓ ${esc(c.fecha || "")}`}</td><td>${c.mayor ? "—" : yes(c.honor)}</td><td>${c.mayor ? "—" : yes(c.cumple)}</td><td>${c.mayor ? "—" : yes(c.fotos)}</td><td>${c.mayor ? "—" : yes(c.ficha)}</td><td>${c.mayor ? "—" : yes(c.avisos)}</td>
        <td><a class="btn btn-sm btn-ghost" href="${u.link}">${icon("edit")}</a></td></tr>`; }).join("") || `<tr><td colspan="9" class="muted">Aún no hay cuentas de jóvenes.</td></tr>`}</tbody></table></div>`;
}

// ---------------------------------------------------------------------------
function registerActions() {
  const A = ctx.actions;
  A.gmHide = async (el) => {
    const on = el.dataset.on === "1";
    try { if (el.dataset.k === "post") await cloud.updatePost(el.dataset.id, { hidden: on }); else await cloud.updateReply(el.dataset.p, el.dataset.id, { hidden: on }); toast(on ? "Oculto" : "Visible de nuevo"); paintMod(); }
    catch { toast("No se pudo cambiar", ""); }
  };
  A.gmClear = async (el) => {
    try { if (el.dataset.k === "post") await cloud.updatePost(el.dataset.id, { reports: {} }); else await cloud.updateReply(el.dataset.p, el.dataset.id, { reports: {} }); toast("Reportes quitados"); paintMod(); }
    catch { toast("No se pudo cambiar", ""); }
  };
  A.gmDel = async (el) => {
    if (!confirm("¿Borrar definitivamente? No se puede deshacer.")) return;
    try {
      if (el.dataset.k === "post") await cloud.deletePost(el.dataset.id);
      else if (el.dataset.k === "reply") await cloud.deleteReply(el.dataset.p, el.dataset.id);
      else await cloud.deleteChat(el.dataset.p, el.dataset.id);
      toast("Borrado"); paintMod();
    } catch { toast("No se pudo borrar", ""); }
  };
}
