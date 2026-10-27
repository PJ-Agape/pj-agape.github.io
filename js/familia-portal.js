// Mini portal de cada familia  (#/nuestras-familias/f3 · /muro · /agenda · /registro)
// Inicio con su ícono y su encuentro de la semana, un muro propio y una agenda propia.
// El muro y la agenda los ven solo sus integrantes, sus dirigentes y el equipo.
// Los integrantes eligen el nombre y el ícono (un emoji o una ilustración de la app).

import * as cloud from "./cloud.js";
import { esc, icon, toast } from "./util.js";
import { illus, illusConCara } from "./ilustraciones.js";
import { svg as avatarSvg } from "./avatares.js";
import { IDS, COLORS, SOFT, ETAPAS, corto, revistaHref, loadCal, fechaDe, MESES } from "./familias-ag.js";
import * as reg from "./familias-registro.js";
import * as evalua from "./evaluacion.js";

let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
const st = () => cloud.state();
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoyIso = () => iso(new Date());
const dIso = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };
const diaLargo = (s) => { const t = dIso(s).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); };

// ---- Íconos ----
export const EMOJIS = ["🐟", "⚓", "🔥", "🕊️", "🌱", "🌻", "⭐", "🌈", "⛰️", "🌊", "🦁", "🐑", "🍞", "🍇", "💛", "✝️", "🎶", "🚀", "🌍", "🧭", "🏕️", "🤝", "💡", "🌙", "⚡", "🌳", "🐝", "🦋"];
export const ILUS = ["buenpastor", "jesus", "emaus", "apostoles", "espiritu", "maria", "sagradafamilia", "eucaristia", "levantate", "acogida",
  "albertohurtado", "teresaandes", "carloacutis", "donbosco", "franciscoasis", "virgencarmen"];
const validIcono = (v) => (/^e:/.test(v) && EMOJIS.includes(v.slice(2))) || (/^i:/.test(v) && ILUS.includes(v.slice(2)));
export function famIcon(f, cls = "") {
  const v = f && f.icono;
  if (v && v.startsWith("e:")) return `<span class="fam-ico emo ${cls}" aria-hidden="true">${esc(v.slice(2))}</span>`;
  if (v && v.startsWith("i:")) return `<span class="fam-ico ill ${cls}" aria-hidden="true">${illus(v.slice(2))}</span>`;
  return `<span class="fam-ico num ${cls}" aria-hidden="true">${(f && f.i != null ? f.i : 0) + 1}</span>`;
}

// ---- Datos de la familia ----
let F = null, muro = null, agenda = null, cal = null, unsub = [];
const mine = (f) => !!(f && (f.uids || []).includes(cloud.myUid()));
const canSee = (f) => !cloud.enabled || mine(f) || st().isStaff;
const canMod = (f) => !cloud.enabled || st().isStaff || (mine(f) && st().isGuide); // dirigentes de la familia y equipo
const famNombre = (f) => f.nombre || `Familia ${f.i + 1}`;
async function loadFam(fid) {
  const rows = (await cloud.listFamilias()) || [];
  const r = rows.find((x) => x.id === fid) || {};
  F = { id: fid, i: IDS.indexOf(fid), ...r };
  cal = await loadCal();
  await reg.load().catch(() => {});
}
function watchSubs(fid, repaint) {
  unsub.forEach((u) => u()); unsub = [];
  muro = agenda = null;
  if (!canSee(F)) { muro = []; agenda = []; return; }
  unsub.push(cloud.watchFam(fid, "muro", (r) => { muro = r; repaint(); }, () => { muro = []; repaint(); }));
  unsub.push(cloud.watchFam(fid, "agenda", (r) => { agenda = r; repaint(); }, () => { agenda = []; repaint(); }));
  ctx.onLeave(() => { unsub.forEach((u) => u()); unsub = []; });
}
const tsMs = (t) => (t && t.toDate ? t.toDate().getTime() : t && t.seconds ? t.seconds * 1000 : typeof t === "number" ? t : t && t.__ts ? t.__ts : Date.now());
const hace = (t) => { const s = (Date.now() - tsMs(t)) / 1000; if (s < 60) return "recién"; if (s < 3600) return `hace ${Math.floor(s / 60)} min`; if (s < 86400) return `hace ${Math.floor(s / 3600)} h`; const d = new Date(tsMs(t)); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; };
// Próximos encuentros del calendario de la revista
function proxEncuentros(n) {
  if (!cal) return [];
  const hoy = dIso(hoyIso());
  return (cal.encuentros || []).map((e) => ({ ...e, date: fechaDe(e.fecha) })).filter((e) => e.date && e.date >= hoy).slice(0, n);
}
const eventos = (desde) => (agenda || []).filter((e) => e.fecha && (!desde || e.fecha >= desde)).sort((a, b) => (a.fecha + (a.hora || "")).localeCompare(b.fecha + (b.hora || "")));

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
let tab = "inicio";
export function view(fid, t) {
  if (!IDS.includes(fid)) return null;
  tab = t || "inicio";
  const s = st();
  if (cloud.enabled && !s.ready) return `<div class="card"><p>Las familias son para quienes tienen cuenta.</p><a class="btn btn-primary" href="#/perfil" style="margin-top:10px">Ingresar</a></div>`;
  ctx.onAfterRender(async () => { await loadFam(fid); watchSubs(fid, paint); paint(); });
  return `<nav class="crumbs"><a href="#/nuestras-familias">Nuestras familias</a>${icon("right")}<span id="fpCrumb">Familia ${IDS.indexOf(fid) + 1}</span></nav>
    <div id="fpBody"><p class="muted" style="padding:30px;text-align:center">Cargando la familia…</p></div>`;
}
function paint() {
  const box = document.getElementById("fpBody"); if (!box || !F) return;
  const f = F, c = COLORS[f.i], soft = SOFT[f.i], et = ETAPAS[f.etapa];
  const cr = document.getElementById("fpCrumb"); if (cr) cr.textContent = famNombre(f);
  const TABS = [["inicio", "🏠 Inicio"], ["muro", "💬 Muro"], ["agenda", "📅 Agenda"], ...(st().isGuide || !cloud.enabled ? [["registro", "📋 Registro"]] : [])];
  box.innerHTML = `
  <header class="fp-head" style="--fc:${c};--fs:${soft}">
    ${famIcon(f, "big")}
    <div class="fp-id"><span class="eyebrow">Familia ${f.i + 1}${mine(f) ? " · tu familia" : ""}</span><h1>${esc(famNombre(f))}</h1>
      <div class="fam-etapa">${et ? `<span class="fam-et" style="--ec:${et[2]}">${esc(et[0])}</span>` : ""}<span class="small">⭐ ${(f.dirigentes || []).map((d) => esc(corto(d.nombre))).join(", ") || "Sin dirigente aún"}</span></div></div>
    ${mine(f) || st().isStaff ? `<button class="btn btn-sm btn-glass" data-action="fpEdit">${icon("edit")} Nombre e ícono</button>` : ""}
  </header>
  <nav class="fp-tabs" aria-label="Portal de la familia">${TABS.map(([k, l]) => `<a class="${tab === k ? "on" : ""}" href="#/nuestras-familias/${f.id}${k === "inicio" ? "" : "/" + k}" style="--fc:${c}">${l}</a>`).join("")}</nav>
  <div class="fp-body">${tab === "muro" ? muroHTML(f) : tab === "agenda" ? agendaHTML(f) : inicioHTML(f)}</div>`;
}

const locked = () => `<div class="card" style="text-align:center;padding:24px">${icon("lock")}<p class="muted" style="margin-top:6px">El muro y la agenda son solo para los integrantes de esta familia y sus dirigentes.</p></div>`;

function inicioHTML(f) {
  const e = proxEncuentros(1)[0], x = e ? (e.etapas || {})[f.etapa] || {} : {};
  const ev = eventos(hoyIso()).slice(0, 3);
  const posts = [...(muro || [])].sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)).slice(0, 2);
  const int = f.integrantes || [];
  // Evaluación: el último encuentro, durante la semana siguiente (solo integrantes jóvenes)
  const hoyT = dIso(hoyIso()).getTime();
  const ult = cal ? (cal.encuentros || []).map((x) => ({ ...x, date: fechaDe(x.fecha) })).filter((x) => x.date && x.date.getTime() <= hoyT && hoyT - x.date.getTime() <= 6 * 86400000).pop() : null;
  const evSlot = ult && mine(f) && !st().isGuide ? `<div class="ev-slot" data-ev-fid="${f.id}" data-ev-n="${ult.n}" data-ev-year="${esc(String(cal.year || ult.date.getFullYear()))}" data-ev-tema="${esc(((ult.etapas || {})[f.etapa] || {}).titulo || ult.tema)}"></div>` : "";
  setTimeout(() => evalua.mount(), 0);
  return `${evSlot}
  ${e ? `<a class="fam-enc fp-enc" href="${ETAPAS[f.etapa] ? revistaHref(f.etapa, e.n) : "#/encuentros"}" style="--ec:${ETAPAS[f.etapa] ? ETAPAS[f.etapa][2] : "#1351a4"}">
    <span class="fam-enc-k">${e.date.getTime() === dIso(hoyIso()).getTime() ? "Hoy" : "Próximo"} · encuentro N° ${e.n} del año · ${esc(diaLargo(iso(e.date)))}</span>
    <b>${esc(x.titulo || e.tema)}</b><span class="fam-enc-l">📰 ${ETAPAS[f.etapa] ? `Abrir en la Revista ${esc(ETAPAS[f.etapa][0])}` : "Ver la revista"} ${icon("right")}</span></a>` : ""}
  ${reg.D && reg.D.honor ? reg.cardHonor(f) : ""}
  ${canSee(f) ? `<div class="fp-grid">
    <section class="card"><div class="row-wrap"><h2 class="fr-h">📅 Lo que viene</h2><span class="spacer"></span><a class="small" href="#/nuestras-familias/${f.id}/agenda">Ver agenda</a></div>
      ${ev.length ? `<ul class="fp-evl">${ev.map(evLi).join("")}</ul>` : `<p class="muted small">Sin actividades propias por ahora.${canMod(f) ? ` <a href="#/nuestras-familias/${f.id}/agenda">Agrega una</a>.` : ""}</p>`}</section>
    <section class="card"><div class="row-wrap"><h2 class="fr-h">💬 En el muro</h2><span class="spacer"></span><a class="small" href="#/nuestras-familias/${f.id}/muro">Ir al muro</a></div>
      ${muro === null ? `<p class="muted small">Cargando…</p>` : posts.length ? posts.map((p) => `<div class="fp-mini"><b>${esc(p.autorNombre)}</b> <span class="xs muted">${hace(p.createdAt)}</span><p>${esc(String(p.texto).slice(0, 140))}${String(p.texto).length > 140 ? "…" : ""}</p></div>`).join("") : `<p class="muted small">Aún no hay mensajes. ¡Saluden a su familia!</p>`}</section>
  </div>` : locked()}
  <section class="card" style="margin-top:12px"><h2 class="fr-h">👨‍👩‍👧‍👦 Integrantes · ${int.length}</h2>
    <div class="fam-chips">${int.length ? int.map((j) => st().isGuide ? `<a class="fam-chip" href="#/acompanar/joven/${encodeURIComponent(j.id)}">${esc(j.nombre)}</a>` : `<span class="fam-chip">${esc(j.nombre)}</span>`).join("") : `<span class="xs muted">Por asignar</span>`}</div>
    ${!f.nombre && mine(f) ? `<p class="small" style="margin-top:10px">Su familia aún no tiene nombre ni ícono. <button class="btn btn-sm btn-gold" data-action="fpEdit">Elegirlos</button></p>` : ""}</section>`;
}
const evLi = (e) => { const d = dIso(e.fecha); return `<li><span class="fp-evd"><b>${d.getDate()}</b>${MESES[d.getMonth()].slice(0, 3)}</span><span><b>${esc(e.titulo)}</b><small>${[e.hora, e.lugar].filter(Boolean).map(esc).join(" · ")}</small></span></li>`; };

// ---- Muro ----
function muroHTML(f) {
  if (!canSee(f)) return locked();
  const posts = [...(muro || [])].sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  const me = cloud.myUid();
  return `<form class="card fp-post" id="fpPost" onsubmit="return false">
      <textarea class="textarea" id="fpTexto" maxlength="500" rows="3" placeholder="Escribe algo para tu familia: un saludo, una idea, una intención…"></textarea>
      <div class="row-wrap"><span class="xs muted">Lo leen solo los integrantes de ${esc(famNombre(f))} y sus dirigentes. Cuidémonos: nada de datos personales.</span><span class="spacer"></span><button class="btn btn-primary btn-sm" data-action="fpSend">${icon("send")} Publicar</button></div></form>
    ${muro === null ? `<p class="muted" style="padding:20px;text-align:center">Cargando…</p>` : posts.length ? `<div class="fp-feed">${posts.map((p) => {
      const n = Object.keys(p.likes || {}).length, liked = !!(p.likes || {})[me], av = p.autorAvatar && avatarSvg(p.autorAvatar);
      return `<article class="card fp-msg"><div class="fp-msg-h">${av ? `<span class="avatar av-ill">${av}</span>` : `<span class="avatar">${esc((p.autorNombre || "?")[0])}</span>`}<div style="flex:1"><b>${esc(p.autorNombre)}</b><span class="xs muted"> · ${hace(p.createdAt)}</span></div>
        ${p.autorUid === me || canMod(f) ? `<button class="icon-btn" data-action="fpDel" data-id="${esc(p.id)}" aria-label="Borrar">${icon("trash")}</button>` : ""}</div>
        <p class="fp-txt">${esc(p.texto).replace(/\n/g, "<br>")}</p>
        <button class="fp-like ${liked ? "on" : ""}" data-action="fpLike" data-id="${esc(p.id)}" aria-pressed="${liked}">${liked ? "💛" : "🤍"} ${n || ""}</button></article>`; }).join("")}</div>`
    : `<div class="card" style="text-align:center;padding:24px"><p class="muted">El muro de la familia está esperando su primer mensaje.</p></div>`}`;
}

// ---- Agenda ----
let showPast = false;
function agendaHTML(f) {
  if (!canSee(f)) return locked();
  const hoy = hoyIso(), next = eventos(hoy), past = eventos().filter((e) => e.fecha < hoy).reverse();
  const encs = proxEncuentros(3);
  const ev = (e) => `<div class="card fp-ev">${evLi(e).replace(/^<li>|<\/li>$/g, "")}${e.nota ? `<p class="small">${esc(e.nota)}</p>` : ""}
    ${canMod(f) ? `<div class="row-wrap" style="gap:6px"><button class="btn btn-sm btn-ghost" data-action="fpEvEdit" data-id="${esc(e.id)}">${icon("edit")} Editar</button><button class="btn btn-sm btn-ghost" data-action="fpEvDel" data-id="${esc(e.id)}">${icon("trash")}</button></div>` : ""}</div>`;
  return `
    ${canMod(f) ? `<button class="btn btn-gold btn-sm" data-action="fpEvNew" style="margin-bottom:12px">${icon("plus")} Nueva actividad de la familia</button>` : ""}
    <h2 class="mag-hub-sub">Actividades de la familia</h2>
    ${agenda === null ? `<p class="muted">Cargando…</p>` : next.length ? `<div class="fp-evs">${next.map(ev).join("")}</div>` : `<p class="muted small">No hay actividades programadas.${canMod(f) ? "" : " Sus dirigentes las irán agregando."}</p>`}
    ${encs.length ? `<h2 class="mag-hub-sub">Encuentros del grupo</h2><div class="fp-evs">${encs.map((e) => { const x = (e.etapas || {})[f.etapa] || {}; return `<a class="card fp-ev link" href="${ETAPAS[f.etapa] ? revistaHref(f.etapa, e.n) : "#/encuentros"}">${evLi({ fecha: iso(e.date), titulo: `N° ${e.n} · ${x.titulo || e.tema}`, hora: e.domingo }).replace(/^<li>|<\/li>$/g, "")}</a>`; }).join("")}</div>` : ""}
    <p class="small" style="margin-top:12px"><a href="#/agenda">Ver también la agenda de toda la pastoral ${icon("right")}</a></p>
    ${past.length ? `<button class="btn btn-sm btn-ghost" data-action="fpPast" style="margin-top:10px">${showPast ? "Ocultar" : "Ver"} actividades pasadas (${past.length})</button>${showPast ? `<div class="fp-evs" style="margin-top:8px;opacity:.75">${past.map(ev).join("")}</div>` : ""}` : ""}`;
}
function evEditor(e) {
  let d = document.getElementById("fpDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "fpDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const v = e || { titulo: "", fecha: hoyIso(), hora: "", lugar: "", nota: "" };
  d.innerHTML = `<form method="dialog" id="fpEvForm" data-id="${esc(e ? e.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">${esc(famNombre(F))}</span><h2>${e ? "Editar actividad" : "Nueva actividad"}</h2></div><button type="button" class="icon-btn" data-action="fpClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>¿Qué haremos?</label><input class="input" name="titulo" required maxlength="80" value="${esc(v.titulo)}" placeholder="Ej.: Once de la familia, visita al hogar de ancianos"></div>
      <div class="ag-form-row"><div class="field"><label>Fecha</label><input class="input" type="date" name="fecha" required value="${esc(v.fecha)}"></div>
        <div class="field"><label>Hora</label><input class="input" type="time" name="hora" value="${esc(v.hora || "")}"></div></div>
      <div class="field"><label>Lugar</label><input class="input" name="lugar" maxlength="80" value="${esc(v.lugar || "")}"></div>
      <div class="field"><label>Nota (qué llevar, etc.)</label><textarea class="textarea" name="nota" maxlength="300" rows="2">${esc(v.nota || "")}</textarea></div>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="fpClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  d.showModal();
}

// ---- Nombre e ícono ----
function idEditor() {
  let d = document.getElementById("fpDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "fpDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const cur = F.icono || "";
  d.innerHTML = `<form method="dialog" id="fpIdForm">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Familia ${F.i + 1}</span><h2>Nombre e ícono</h2></div><button type="button" class="icon-btn" data-action="fpClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="field"><label>Nombre de la familia</label><input class="input" name="nombre" maxlength="40" value="${esc(F.nombre || "")}" placeholder="Pónganse de acuerdo entre todos 😉"></div>
      <fieldset class="fp-pick"><legend>Un emoji…</legend><div class="fp-pick-g">${EMOJIS.map((x) => `<label class="fp-opt emo"><input type="radio" name="icono" value="e:${x}" ${cur === "e:" + x ? "checked" : ""}><span>${x}</span></label>`).join("")}</div></fieldset>
      <fieldset class="fp-pick"><legend>…o una ilustración</legend><div class="fp-pick-g ill">${ILUS.map((k) => `<label class="fp-opt ill" title="${esc(k)}"><input type="radio" name="icono" value="i:${k}" ${cur === "i:" + k ? "checked" : ""}><span>${illus(k)}</span></label>`).join("")}</div></fieldset>
      <p class="xs muted">Lo pueden cambiar los integrantes y dirigentes de la familia.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="fpClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div></form>`;
  d.showModal();
}

let wired = false;
function registerActions() {
  const A = ctx.actions;
  A.fpEdit = () => idEditor();
  A.fpClose = () => document.getElementById("fpDlg")?.close();
  A.fpSend = async (el) => {
    const t = document.getElementById("fpTexto"), v = (t && t.value || "").trim().slice(0, 500);
    if (!v) return toast("Escribe un mensaje", "");
    el.disabled = true;
    try { await cloud.postFamMuro(F.id, v); t.value = ""; toast("Publicado en el muro de la familia 💬", "ok"); } catch (e) { console.warn(e); toast("No se pudo publicar", ""); }
    el.disabled = false;
  };
  A.fpLike = async (el) => { const p = (muro || []).find((x) => x.id === el.dataset.id); if (!p) return; try { await cloud.likeFamMuro(F.id, p.id, !(p.likes || {})[cloud.myUid()]); } catch { toast("No se pudo marcar", ""); } };
  A.fpDel = async (el) => { if (!confirm("¿Borrar este mensaje?")) return; try { await cloud.deleteFamMuro(F.id, el.dataset.id); toast("Mensaje borrado"); } catch { toast("No se pudo borrar", ""); } };
  A.fpEvNew = () => evEditor(null);
  A.fpEvEdit = (el) => evEditor((agenda || []).find((x) => x.id === el.dataset.id));
  A.fpEvDel = async (el) => { if (!confirm("¿Borrar esta actividad?")) return; try { await cloud.deleteFamEvento(F.id, el.dataset.id); toast("Actividad borrada"); } catch { toast("No se pudo borrar", ""); } };
  A.fpPast = () => { showPast = !showPast; paint(); };
  if (wired) return; wired = true;
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "fpEvForm") {
      e.preventDefault();
      const fd = new FormData(e.target), id = e.target.dataset.id || null;
      const data = { titulo: String(fd.get("titulo") || "").trim().slice(0, 80), fecha: String(fd.get("fecha") || ""), hora: String(fd.get("hora") || ""),
        lugar: String(fd.get("lugar") || "").trim().slice(0, 80), nota: String(fd.get("nota") || "").trim().slice(0, 300) };
      if (!data.titulo || !/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) return;
      try { await cloud.saveFamEvento(F.id, id, data); document.getElementById("fpDlg")?.close(); toast("Actividad guardada 📅", "ok"); } catch (err) { console.warn(err); toast("No se pudo guardar", ""); }
    }
    if (e.target.id === "fpIdForm") {
      e.preventDefault();
      const fd = new FormData(e.target), nombre = String(fd.get("nombre") || "").trim().slice(0, 40), icono = String(fd.get("icono") || "");
      try {
        const exists = (await cloud.listFamilias() || []).some((r) => r.id === F.id);
        if (!exists) await cloud.saveFamilia(F.id, { nombre, nombrePor: "", icono: validIcono(icono) ? icono : "", etapa: "", dirigentes: [], integrantes: [], uids: [] });
        else {
          if (nombre && nombre !== F.nombre) await cloud.nombrarFamilia(F.id, nombre);
          if (validIcono(icono) && icono !== F.icono) await cloud.iconoFamilia(F.id, icono);
        }
        document.getElementById("fpDlg")?.close(); toast("¡Listo! 🎉", "ok");
        await loadFam(F.id); paint();
      } catch (err) { console.warn(err); toast("No se pudo guardar", ""); }
    }
  });
}
