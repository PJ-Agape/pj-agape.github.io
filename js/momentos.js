// Momentos Ágape: un feed de fotos de la comunidad.
// Coordinadores y administradores suben una foto con su descripción; quienes tienen cuenta
// reaccionan (una reacción cada uno) y comentan. La foto se comprime en el teléfono antes de subirla.
import { esc, icon, toast } from "./util.js";
import { avatar } from "./avatares.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const st = () => ctx.cloud.state();
const $ = (s, r = document) => r.querySelector(s);

const REACTS = [
  ["amen", "🙏", "Amén"],
  ["corazon", "❤️", "Me encanta"],
  ["alegria", "😄", "Qué alegría"],
  ["fuerza", "💪", "¡Fuerza!"],
];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const when = (t) => {
  const d = t && t.toDate ? t.toDate() : null; if (!d) return "recién";
  const h = Math.floor((Date.now() - d) / 3600000);
  return h < 1 ? "recién" : h < 24 ? `hace ${h} h` : h < 48 ? "ayer" : `${d.getDate()} ${MESES[d.getMonth()]}`;
};

let posts = null, more = true, state = "idle", openC = {}, coms = {}; // state: idle | loading | denied | error

async function load(reset) {
  if (reset) { posts = null; more = true; }
  state = "loading";
  try {
    const last = posts && posts.length ? posts[posts.length - 1].createdAt?.toMillis?.() : null;
    const rows = last ? await ctx.cloud.olderMomentos(last, 6) : await ctx.cloud.listMomentos(6);
    posts = [...(posts || []), ...rows]; more = rows.length === 6; state = "idle";
  } catch (e) {
    state = e && e.code === "permission-denied" ? "denied" : "error";
    posts = posts || [];
  }
}

// ---------------------------------------------------------------------------
// Franja en Comunidad (solo aparece cuando los Momentos están habilitados)
// ---------------------------------------------------------------------------
export async function homeStrip(id = "plazaPics") {
  // Fotos recientes: en la puerta «Muro» de La Plaza Ágape y arriba del muro
  const pics = document.getElementById(id); if (!pics || !ctx.cloud.enabled || !st().ready) return;
  let rows = [];
  try { rows = await ctx.cloud.listMomentos(3); } catch (e) { return; }
  if (!document.getElementById(id) || !rows.length) return;
  pics.innerHTML = rows.map((r) => `<img src="${esc(r.img)}" alt="" loading="lazy">`).join("");
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export function view() {
  const s = st();
  if (ctx.cloud.enabled && !s.ready) return `<div class="card" style="text-align:center;padding:30px"><h2 class="display">Momentos Ágape</h2>
    <p class="muted" style="margin-top:8px">Las fotos de la comunidad son para quienes tienen cuenta.</p><a class="btn btn-primary" style="margin-top:14px" href="#/perfil">Ingresar</a></div>`;
  ctx.onAfterRender(async () => { if (posts === null) { await load(true); } paint(); });
  return `<nav class="crumbs"><a href="#/muro">Muro</a>${icon("right")}<span>Momentos</span></nav>
    <header class="page-head mom-head"><h1>Momentos <em>Ágape</em></h1>
      <p>Las fotos de lo que vivimos juntos. Reacciona y deja un comentario con cariño.</p></header>
    ${s.isStaff ? `<button class="btn btn-gold mom-new" data-action="momNew">${icon("plus")} Subir un momento</button>` : ""}
    <div id="momList" class="mom-list"><p class="muted small">Cargando…</p></div>`;
}
function paint() {
  const box = $("#momList"); if (!box) return;
  if (state === "denied") { box.innerHTML = `<div class="note">Los Momentos estarán disponibles muy pronto.${st().isStaff ? " (Falta publicar las reglas de Firestore.)" : ""}</div>`; return; }
  if (state === "error" && !posts.length) { box.innerHTML = `<div class="note">No pudimos cargar las fotos. Revisa tu conexión.</div>`; return; }
  if (!posts.length) { box.innerHTML = `<p class="muted mom-empty">Aún no hay momentos.${st().isStaff ? " Sube el primero." : ""}</p>`; return; }
  box.innerHTML = posts.map(card).join("") + (more ? `<button class="btn btn-ghost mom-more" data-action="momMore">Ver más fotos</button>` : "");
}
function card(p) {
  const me = ctx.cloud.myUid(), staff = st().isStaff, mine = (p.reacts || {})[me];
  const counts = REACTS.map(([k]) => Object.values(p.reacts || {}).filter((v) => v === k).length);
  const total = counts.reduce((a, b) => a + b, 0), n = p.commentCount || 0, open = !!openC[p.id];
  return `<article class="mom-card" data-mom="${esc(p.id)}">
    <header class="mom-by">${avatar(p.authorAvatar || "", p.authorName || "Equipo", "mom-av")}<span><b>${esc(p.authorName || "Equipo")}</b><small>${when(p.createdAt)}</small></span>
      ${staff ? `<span class="mom-tools"><button class="icon-btn" data-action="momEdit" data-id="${esc(p.id)}" aria-label="Editar descripción">${icon("edit")}</button><button class="icon-btn" data-action="momDel" data-id="${esc(p.id)}" aria-label="Borrar foto">${icon("trash")}</button></span>` : ""}</header>
    <div class="mom-img"><img src="${esc(p.img)}" alt="${esc((p.texto || "Foto de la comunidad").slice(0, 120))}" loading="lazy"></div>
    ${p.texto ? `<p class="mom-txt">${esc(p.texto)}</p>` : ""}
    <div class="mom-reacts" role="group" aria-label="Reacciones">
      ${REACTS.map(([k, e, l], i) => `<button class="mom-r${mine === k ? " on" : ""}" data-action="momReact" data-id="${esc(p.id)}" data-r="${k}" aria-pressed="${mine === k}" title="${l}"><span aria-hidden="true">${e}</span>${counts[i] ? `<b>${counts[i]}</b>` : ""}<span class="sr-only">${l}</span></button>`).join("")}
      <button class="mom-c" data-action="momComments" data-id="${esc(p.id)}" aria-expanded="${open}">${icon("chat")} ${n ? `${n} comentario${n > 1 ? "s" : ""}` : "Comentar"}</button>
    </div>
    ${total ? `<p class="mom-total xs muted">${total} ${total > 1 ? "reacciones" : "reacción"}</p>` : ""}
    ${open ? `<div class="mom-coms">${comsHTML(p.id)}
      <form class="mom-cform" data-id="${esc(p.id)}"><input class="input" name="t" maxlength="500" required placeholder="Escribe un comentario con cariño…" autocomplete="off">
        <button class="btn btn-primary btn-sm" type="submit">Enviar</button></form></div>` : ""}
  </article>`;
}
function comsHTML(id) {
  const list = coms[id];
  if (!list) return `<p class="xs muted">Cargando comentarios…</p>`;
  if (!list.length) return `<p class="xs muted">Sé la primera persona en comentar.</p>`;
  const me = ctx.cloud.myUid(), staff = st().isStaff;
  return list.map((c) => `<div class="mom-com">${avatar(c.authorAvatar || "", c.authorName || "", "mom-av sm")}
    <p><b>${esc(c.authorName || "Alguien")}</b> ${esc(c.texto)} <small>${when(c.createdAt)}</small>
    ${c.authorUid === me || staff ? `<button class="mom-cdel" data-action="momComDel" data-id="${esc(id)}" data-cid="${esc(c.id)}">Borrar</button>` : ""}</p></div>`).join("");
}
function repaintCard(id) {
  const el = document.querySelector(`[data-mom="${CSS.escape(id)}"]`), p = (posts || []).find((x) => x.id === id);
  if (el && p) { el.outerHTML = card(p); }
}
async function loadComs(id) {
  try { coms[id] = await ctx.cloud.listComentarios(id); } catch { coms[id] = []; }
  const p = (posts || []).find((x) => x.id === id); if (p) p.commentCount = coms[id].length;
  repaintCard(id);
}

// ---------------------------------------------------------------------------
// Subir: se reduce a 1280 px por lado y se comprime en JPEG (queda bajo ~600 KB)
// ---------------------------------------------------------------------------
function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      let max = 1280, q = 0.78, out = "";
      for (let k = 0; k < 6; k++) {
        const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        const c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        out = c.toDataURL("image/jpeg", q);
        if (out.length <= 600000) break;
        max = Math.round(max * 0.82); q = Math.max(0.55, q - 0.06);
      }
      out.length <= 880000 ? resolve(out) : reject(new Error("muy grande"));
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("no es imagen")); };
    im.src = url;
  });
}
let draftImg = "";
function newDialog() {
  draftImg = "";
  let d = document.getElementById("momDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "momDlg"; d.className = "sheet p-sheet"; document.body.appendChild(d); }
  d.innerHTML = `<form method="dialog" id="momForm">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Momentos Ágape</span><h2>Subir un momento</h2></div>
      <button type="button" class="icon-btn" data-action="momClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <label class="mom-pick" id="momPick"><input type="file" accept="image/*" id="momFile" hidden><span>${icon("plus")} Elegir una foto</span></label>
      <div class="field"><label for="momText">Descripción</label><textarea class="textarea" id="momText" name="texto" rows="3" maxlength="1000" placeholder="¿Qué vivimos en este momento?"></textarea></div>
      <label class="row" style="gap:8px;align-items:flex-start"><input type="checkbox" name="ok" required style="margin-top:4px"> <span class="small">Confirmo que las familias de los jóvenes que aparecen autorizaron sus fotos, y que la foto cuida a las personas.</span></label>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="momClose">Cancelar</button>
      <button class="btn btn-primary" type="submit" id="momSend">Publicar</button></div></form>`;
  d.showModal();
}

function registerActions() {
  const A = ctx.actions;
  A.momNew = () => newDialog();
  A.momClose = () => document.getElementById("momDlg")?.close();
  A.momMore = async (el) => { el.disabled = true; await load(false); paint(); };
  A.momReact = async (el) => {
    const id = el.dataset.id, p = (posts || []).find((x) => x.id === id); if (!p) return;
    const me = ctx.cloud.myUid(), cur = (p.reacts || {})[me], next = cur === el.dataset.r ? null : el.dataset.r;
    p.reacts = { ...(p.reacts || {}) }; if (next) p.reacts[me] = next; else delete p.reacts[me];
    repaintCard(id);
    try { await ctx.cloud.reactMomento(id, next); } catch { toast("No se pudo guardar tu reacción", ""); }
  };
  A.momComments = (el) => { const id = el.dataset.id; openC[id] = !openC[id]; repaintCard(id); if (openC[id]) loadComs(id); };
  A.momComDel = async (el) => {
    if (!confirm("¿Borrar este comentario?")) return;
    try { await ctx.cloud.deleteComentario(el.dataset.id, el.dataset.cid); await loadComs(el.dataset.id); } catch { toast("No se pudo borrar", ""); }
  };
  A.momEdit = async (el) => {
    const p = (posts || []).find((x) => x.id === el.dataset.id); if (!p) return;
    const t = prompt("Descripción de la foto:", p.texto || ""); if (t === null) return;
    try { await ctx.cloud.editMomento(p.id, t.trim()); p.texto = t.trim().slice(0, 1000); repaintCard(p.id); toast("Descripción actualizada"); } catch { toast("No se pudo guardar", ""); }
  };
  A.momDel = async (el) => {
    if (!confirm("¿Borrar esta foto con sus reacciones? Esta acción no se puede deshacer.")) return;
    try { await ctx.cloud.deleteMomento(el.dataset.id); posts = posts.filter((x) => x.id !== el.dataset.id); paint(); toast("Foto borrada"); } catch { toast("No se pudo borrar", ""); }
  };
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "momFile" || !e.target.files[0]) return;
    const pick = $("#momPick"); pick.classList.add("busy");
    try { draftImg = await compress(e.target.files[0]); pick.innerHTML = `<img src="${draftImg}" alt="Vista previa"><span class="mom-change">Cambiar foto</span><input type="file" accept="image/*" id="momFile" hidden>`; }
    catch { toast("No pudimos usar esa imagen. Prueba con otra foto.", ""); }
    pick.classList.remove("busy");
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "momForm") {
      e.preventDefault();
      if (!draftImg) { toast("Elige una foto primero", ""); return; }
      const btn = $("#momSend"); btn.disabled = true;
      try {
        await ctx.cloud.addMomento({ img: draftImg, texto: String(new FormData(e.target).get("texto") || "").trim() });
        document.getElementById("momDlg")?.close(); toast("¡Momento publicado!", "ok");
        await load(true); paint();
      } catch (err) { console.warn(err); toast(err && err.code === "permission-denied" ? "Aún no se puede publicar: falta habilitar los Momentos." : "No se pudo publicar. Revisa tu conexión.", ""); }
      btn.disabled = false;
      return;
    }
    const f = e.target.closest && e.target.closest(".mom-cform"); if (!f) return;
    e.preventDefault();
    const inp = f.querySelector("input"), t = inp.value.trim(); if (!t) return;
    inp.disabled = true;
    try { await ctx.cloud.addComentario(f.dataset.id, t); inp.value = ""; await loadComs(f.dataset.id); }
    catch { toast("No se pudo enviar el comentario", ""); }
    inp.disabled = false;
  });
}
