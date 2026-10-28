// Muro de la comunidad: anuncios del equipo, temas de conversación y preguntas.
// Se actualiza en tiempo real. Cualquiera puede leer; para escribir hay que
// ingresar con la cuenta invitada. Los administradores moderan en el mismo muro.

import { esc, icon, toast, initials } from "./util.js";
import { tabs as chatTabs } from "./chat.js";
import { avatar } from "./avatares.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }

const $ = (s, r = document) => r.querySelector(s);
const TYPES = {
  anuncio: { label: "Anuncio", chip: "warn", icon: "sparkle" },
  tema: { label: "Tema", chip: "accent", icon: "chat" },
  pregunta: { label: "Pregunta", chip: "ok", icon: "search" },
  logro: { label: "Logro", chip: "ok", icon: "award" },
  encuesta: { label: "Encuesta", chip: "accent", icon: "grid" },
};
const isNews = (p) => p.type === "anuncio" || p.type === "logro";
const FILTERS = [["todo", "Todo"], ["anuncio", "Anuncios"], ["encuesta", "Encuestas"], ["tema", "Temas"], ["pregunta", "Preguntas"]];
let filter = "todo";
let posts = null, loadError = false, flagged = null;
let openId = null, openStop = null, composeOpen = false; // tema abierto en la lista y su suscripción a respuestas

const st = () => ctx.cloud.state();
const me = () => ctx.cloud.myUid();
const count = (m) => Object.keys(m || {}).length;
const has = (m) => !!(m && me() && m[me()]);

// ---------- Texto: se escapa todo y se enlazan las direcciones web ----------
function text(v) {
  return esc(v)
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
    .replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
}
function when(ts) {
  const d = ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  if (!d || isNaN(d)) return "ahora";
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "recién";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) { const n = Math.floor(s / 86400); return `hace ${n} día${n > 1 ? "s" : ""}`; }
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}
const tsVal = (ts) => (ts && ts.toMillis ? ts.toMillis() : 0);
function sortPosts(list) {
  return [...list].sort((a, b) => (b.pinned === true) - (a.pinned === true) || tsVal(b.lastActivity) - tsVal(a.lastActivity));
}

// ---------- Bloques comunes ----------
function byline(x) {
  const staff = x.authorRole === "admin" || x.authorRole === "coordinador";
  return `<span class="wall-by">
    ${avatar(x.authorAvatar, x.authorName, staff ? "staff" : "")}
    <span><b>${esc(x.authorName || "Dirigente")}</b>${staff ? ` <span class="chip warn xs-chip">Equipo</span>` : ""}<br>
    <span class="xs muted">${when(x.createdAt)}${x.editedAt ? " · editado" : ""}</span></span></span>`;
}
function modBadges(x) {
  if (!st().isStaff) return "";
  const r = count(x.reports);
  return `${x.hidden ? `<span class="chip">${icon("eye")} Oculto</span>` : ""}${r ? `<span class="chip danger">Reportado ${r}</span>` : ""}`;
}
function likeBtn(x, path) {
  const n = count(x.likes), mine = has(x.likes);
  return `<button class="wall-like ${mine ? "on" : ""}" data-action="wallLike" data-path="${esc(path)}" data-on="${mine ? 0 : 1}"
    aria-pressed="${mine}" aria-label="Me sirve${n ? `, ${n}` : ""}">${heart()} <span>${n || ""}</span></button>`;
}
const heart = () => `<svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.8 3.8 4.5 7.3 4.5c2 0 3.5 1.1 4.7 2.7 1.2-1.6 2.7-2.7 4.7-2.7 3.5 0 5.7 3.3 4.5 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z"/></svg>`;

function menu(x, kind, pid) {
  // Opciones: dueño (editar, borrar), administrador (fijar, cerrar, ocultar, borrar), resto (reportar)
  const own = me() && x.authorUid === me();
  const admin = st().isStaff;
  const d = `data-kind="${kind}" data-pid="${esc(pid)}" data-rid="${kind === "reply" ? esc(x.id) : ""}"`;
  const items = [];
  if (own) items.push(`<button data-action="wallEdit" ${d}>${icon("edit")} Editar</button>`);
  if (admin && kind === "post") {
    items.push(`<button data-action="wallSet" ${d} data-field="pinned" data-val="${x.pinned ? 0 : 1}">${icon("up")} ${x.pinned ? "Desfijar" : "Fijar arriba"}</button>`);
    if (x.type !== "anuncio") items.push(`<button data-action="wallSet" ${d} data-field="closed" data-val="${x.closed ? 0 : 1}">${icon("lock")} ${x.closed ? "Reabrir conversación" : "Cerrar conversación"}</button>`);
  }
  if (admin) {
    items.push(`<button data-action="wallSet" ${d} data-field="hidden" data-val="${x.hidden ? 0 : 1}">${icon("eye")} ${x.hidden ? "Volver a mostrar" : "Ocultar"}</button>`);
    if (count(x.reports)) items.push(`<button data-action="wallSet" ${d} data-field="reports" data-val="clear">${icon("check")} Quitar reportes</button>`);
  }
  if (own || admin) items.push(`<button class="danger" data-action="wallDelete" ${d}>${icon("trash")} Borrar</button>`);
  if (!own && st().ready) {
    const r = has(x.reports);
    items.push(`<button data-action="wallReport" ${d} data-on="${r ? 0 : 1}">${icon("x")} ${r ? "Quitar mi reporte" : "Reportar"}</button>`);
  }
  if (!items.length) return "";
  return `<details class="wall-menu"><summary class="icon-btn" aria-label="Opciones">${dots()}</summary><div class="wall-menu-list">${items.join("")}</div></details>`;
}
const dots = () => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>`;

function joinBox(what) {
  const s = st();
  if (!s.enabled) return `<div class="note">El muro necesita conexión con las cuentas de la pastoral.</div>`;
  if (s.ready) return "";
  if (s.status === "not-invited") return `<div class="note">Entraste con un correo que aún no está invitado. Pide al equipo coordinador que te invite para participar.</div>`;
  if (s.status === "inactive") return `<div class="note">Tu cuenta está en pausa. Conversa con el equipo coordinador para volver a participar.</div>`;
  return `<div class="card wall-join"><span class="tile-ico tile-brand" style="margin:0">${icon("chat")}</span>
    <div style="flex:1"><strong>¿Quieres ${what}?</strong><p class="muted small">Ingresa con la cuenta con que te invitaron.</p></div>
    <button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button></div>`;
}

// ---------------------------------------------------------------------------
// LISTA DEL MURO  (#/muro)
// ---------------------------------------------------------------------------
export function viewWall() {
  const s = st();
  ctx.onAfterRender(() => {
    const stop = ctx.cloud.watchWall((rows) => { posts = rows; loadError = false; paintList(); },
      () => { loadError = true; paintList(); });
    ctx.onLeave(stop);
    ctx.onLeave(() => { if (openStop) openStop(); openStop = null; });
    if (openId) watchOpen(openId);
    paintList();
    ctx.fotos && ctx.fotos("wallPics");
  });
  const canTopic = s.ready && s.isStaff;
  return `
  <header class="page-head"><span class="eyebrow">Muro de la comunidad</span><h1>Anuncios y <em>conversación</em></h1>
    <p>Toca un tema para leerlo y conversar. Escribe con el mismo cariño con que hablarías en la reunión.</p></header>
  ${chatTabs("muro")}
  ${s.ready || !ctx.cloud.enabled ? `<a class="card link wall-fotos" href="#/momentos"><span class="wall-fotos-t"><b>Momentos</b><small>Las fotos de lo que vivimos juntos</small></span>
    <span class="wall-fotos-pics" id="wallPics" aria-hidden="true"></span>${icon("right")}</a>` : ""}

  ${s.ready ? `
  <button class="btn ${composeOpen ? "btn-ghost" : "btn-primary"} wall-new" data-action="wallCompose" aria-expanded="${composeOpen}" style="margin-top:16px">${icon(composeOpen ? "x" : "plus")} ${composeOpen ? "Cancelar" : canTopic ? "Nueva publicación" : "Proponer una pregunta o un tema"}</button>
  <form class="card wall-compose" id="wallCompose" style="margin-top:12px" ${composeOpen ? "" : "hidden"}>
    <div class="row-wrap" style="gap:8px">
      ${canTopic ? `<div class="seg" role="radiogroup" aria-label="Tipo de publicación">
        ${["anuncio", "tema", "pregunta", "encuesta"].map((t, i) => `<label><input type="radio" name="type" value="${t}" ${i === 1 ? "checked" : ""}><span>${TYPES[t].label}</span></label>`).join("")}
      </div>` : `<input type="hidden" name="type" value="pregunta"><strong>Propón una pregunta o un tema</strong>`}
    </div>
    ${canTopic ? `<div class="poll-opts" id="pollOpts" hidden>
      <span class="xs muted">Opciones (de 2 a 6). El título es la pregunta de la encuesta.</span>
      ${[1, 2, 3].map((n) => `<input class="input" name="opt" maxlength="80" placeholder="Opción ${n}">`).join("")}
      <button type="button" class="btn btn-sm btn-ghost" data-action="pollAddOpt">${icon("plus")} Agregar opción</button>
    </div>` : ""}
    <input class="input" name="title" maxlength="140" required placeholder="${canTopic ? "Título" : "¿Qué te gustaría preguntar o conversar?"}" autocomplete="off">
    <textarea class="textarea" name="body" maxlength="4000" placeholder="Cuéntanos un poco más (opcional)"></textarea>
    <div class="row-wrap">
      ${canTopic ? `<label class="small row-wrap" style="gap:6px"><input type="checkbox" name="pinned"> Fijar arriba</label>` : `<span class="xs muted">Se mostrará tu nombre y la inicial de tu apellido.</span>`}
      <span class="spacer"></span>
      <button class="btn btn-primary btn-sm" type="submit">${icon("send")} Publicar</button>
    </div>
  </form>` : `<div style="margin-top:16px">${joinBox("participar en el muro")}</div>`}

  <div class="row-wrap wall-filters" style="margin-top:20px" role="tablist">
    ${FILTERS.map(([k, l]) => `<button class="btn btn-sm ${filter === k ? "btn-soft" : "btn-ghost"}" data-action="wallFilter" data-f="${k}" role="tab" aria-selected="${filter === k}">${l}</button>`).join("")}
    ${s.isStaff ? `<button class="btn btn-sm ${filter === "reportes" ? "btn-soft" : "btn-ghost"}" data-action="wallFilter" data-f="reportes">Moderación</button>` : ""}
  </div>
  <div id="wallList" class="stack" style="--gap:12px;margin-top:14px" aria-live="polite"></div>
  <p class="xs muted" style="text-align:center;margin-top:22px">Si ves algo que no corresponde, usa «Reportar» en el menú del mensaje y el equipo lo revisará.</p>`;
}

function paintList() {
  const box = $("#wallList");
  if (!box) return;
  if (loadError && !posts) { box.innerHTML = `<div class="note">No pudimos cargar el muro. Revisa tu conexión.</div>`; return; }
  if (!posts) { box.innerHTML = `<div class="card muted" style="text-align:center">Cargando…</div>`; return; }
  let list = sortPosts(posts);
  if (filter === "reportes") {
    list = list.filter((p) => p.hidden || count(p.reports));
    const rs = (flagged || []).filter((r) => r.hidden || count(r.reports));
    box.innerHTML = (list.length || rs.length) ? list.map(postCard).join("") + (rs.length ? `<h2 class="wall-sub">Respuestas reportadas u ocultas</h2>` +
      rs.map((r) => `<a class="card link wall-reply ${r.hidden ? "is-hidden" : ""}" href="#/muro/${encodeURIComponent(r.pid)}">
        <div class="wall-head">${byline(r)}<span class="spacer"></span>${modBadges(r)}</div>
        <div class="wall-body"><p>${text(r.body)}</p></div><span class="go">Ver en su tema ${icon("arrowR")}</span></a>`).join("") : "")
      : `<div class="card" style="text-align:center;padding:32px"><p class="muted">No hay publicaciones ni respuestas reportadas u ocultas.</p></div>`;
    return;
  }
  else if (filter === "anuncio") list = list.filter(isNews);
  else if (filter !== "todo") list = list.filter((p) => p.type === filter);
  if (!list.length) {
    box.innerHTML = `<div class="card" style="text-align:center;padding:32px"><p class="muted">${filter === "reportes" ? "No hay publicaciones reportadas ni ocultas." : "Todavía no hay publicaciones aquí."}</p></div>`;
    return;
  }
  // Conserva lo que se estaba escribiendo en la respuesta del tema abierto.
  const draft = $("#wallReply textarea")?.value || "";
  const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest("#wallReply");
  if (box.querySelector(".wall-edit")) return; // editando: no se redibuja hasta guardar o cancelar
  if (openId && cur.id === openId) cur.post = (posts || []).find((x) => x.id === openId) || cur.post;
  box.innerHTML = list.map(rowHTML).join("");
  const ta = $("#wallReply textarea"); if (ta && draft) ta.value = draft;
  if (focused && ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}
// Cada publicación es una fila: tipo y título. Al tocarla se abre ahí mismo con su conversación.
function rowHTML(p) {
  const t = TYPES[p.type] || TYPES.tema, open = openId === p.id, n = p.replyCount || 0, lk = count(p.likes);
  return `<article class="wall-row ${esc(p.type)}${p.pinned ? " pinned" : ""}${p.hidden ? " is-hidden" : ""}${open ? " open" : ""}" data-pid="${esc(p.id)}">
    <button class="wall-row-head" data-action="wallOpen" data-pid="${esc(p.id)}" aria-expanded="${open}">
      <span class="chip ${t.chip}">${icon(t.icon)} ${t.label}</span>
      <span class="wall-row-t">${p.pinned ? `<span class="wall-pin" title="Fijado">${icon("up")}</span>` : ""}${esc(p.title)}</span>
      <span class="wall-row-meta">${p.type !== "anuncio" ? `<span title="Respuestas">${icon("chat")} ${n}</span>` : ""}${lk ? `<span title="Me sirve">${heart()} ${lk}</span>` : ""}<span class="xs">${when(p.lastActivity || p.createdAt)}</span></span>
      <span class="wall-row-chev" aria-hidden="true">${icon("down")}</span>
    </button>
    ${open ? `<div class="wall-row-body">${threadHTML(p, cur.id === p.id ? cur.replies : null, true)}</div>` : ""}
  </article>`;
}
function watchOpen(id) {
  if (openStop) openStop();
  cur = { id, post: (posts || []).find((x) => x.id === id), replies: null };
  openStop = ctx.cloud.watchReplies(id, (r) => { if (cur.id === id) { cur.replies = r; paintList(); } });
}

// ---------- Encuestas ----------
function pollHTML(p) {
  const opts = p.options || [], votes = p.votes || {}, me = ctx.cloud.myUid();
  const counts = opts.map((_, i) => Object.values(votes).filter((v) => v === i).length);
  const total = counts.reduce((a, b) => a + b, 0), mine = me in votes ? votes[me] : -1;
  const showRes = mine >= 0 || p.closed || !st().ready;
  return `<div class="poll" role="group" aria-label="Encuesta">
    ${opts.map((o, i) => {
      const pct = total ? Math.round((counts[i] / total) * 100) : 0;
      return showRes
        ? `<button class="poll-o res ${mine === i ? "mine" : ""}" ${p.closed || !st().ready ? "disabled" : ""} data-action="pollVote" data-pid="${esc(p.id)}" data-i="${i}">
            <i style="width:${pct}%"></i><span>${mine === i ? "✓ " : ""}${esc(o)}</span><b>${pct}%</b></button>`
        : `<button class="poll-o" data-action="pollVote" data-pid="${esc(p.id)}" data-i="${i}"><span>${esc(o)}</span></button>`;
    }).join("")}
    <span class="xs muted">${total} voto${total === 1 ? "" : "s"}${p.closed ? " · encuesta cerrada" : mine >= 0 ? " · puedes cambiar tu voto" : st().ready ? " · toca una opción para votar" : ""}</span>
  </div>`;
}

function logroCard(p) {
  return `<article class="card wall-post logro ${p.hidden ? "is-hidden" : ""}">
    <div class="wall-head"><span class="chip ok">${icon("award")} Logro</span>${modBadges(p)}<span class="spacer"></span>${menu(p, "post", p.id)}</div>
    <div class="logro-in">
      <span class="logro-av">${avatar(p.authorAvatar, p.authorName)}</span>
      <div><span class="logro-hand">¡lo logró!</span>
        <a class="wall-title" href="#/muro/${encodeURIComponent(p.id)}"><h3>${esc(p.title)}</h3></a>
        <p>${text(p.body || "")}</p></div>
    </div>
    <div class="wall-foot"><span class="xs muted">${when(p.createdAt)}</span><span class="spacer"></span>
      ${st().ready ? likeBtn(p, `wall/${p.id}`) : count(p.likes) ? `<span class="wall-like static">${heart()} ${count(p.likes)}</span>` : ""}
      <a class="btn btn-sm btn-gold" href="#/muro/${encodeURIComponent(p.id)}">🎉 ${p.replyCount ? `${p.replyCount} saludo${p.replyCount > 1 ? "s" : ""}` : "Saludar"}</a></div>
  </article>`;
}
function postCard(p) {
  if (p.type === "logro") return logroCard(p);
  const t = TYPES[p.type] || TYPES.tema;
  const excerpt = (p.body || "").length > 260 ? p.body.slice(0, 260).trim() + "…" : p.body || "";
  const talk = p.type !== "anuncio";
  return `<article class="card wall-post ${p.type} ${p.pinned ? "pinned" : ""} ${p.hidden ? "is-hidden" : ""}">
    <div class="wall-head">
      <span class="chip ${t.chip}">${icon(t.icon)} ${t.label}</span>
      ${p.pinned ? `<span class="chip">${icon("up")} Fijado</span>` : ""}
      ${p.closed ? `<span class="chip">${icon("lock")} Cerrado</span>` : ""}
      ${modBadges(p)}
      <span class="spacer"></span>${menu(p, "post", p.id)}
    </div>
    ${talk ? `<a class="wall-title" href="#/muro/${encodeURIComponent(p.id)}"><h3>${esc(p.title)}</h3></a>` : `<h3 class="wall-title">${esc(p.title)}</h3>`}
    ${p.body ? `<div class="wall-body"><p>${text(talk ? excerpt : p.body)}</p></div>` : ""}
    ${p.type === "encuesta" ? pollHTML(p) : ""}
    <div class="wall-foot">
      ${byline(p)}<span class="spacer"></span>
      ${st().ready ? likeBtn(p, `wall/${p.id}`) : count(p.likes) ? `<span class="wall-like static">${heart()} ${count(p.likes)}</span>` : ""}
      ${talk ? `<a class="btn btn-sm btn-ghost" href="#/muro/${encodeURIComponent(p.id)}">${icon("chat")} ${p.replyCount ? `${p.replyCount} respuesta${p.replyCount > 1 ? "s" : ""}` : "Responder"}</a>` : ""}
    </div>
  </article>`;
}

// ---------------------------------------------------------------------------
// UN TEMA CON SUS RESPUESTAS  (#/muro/:id)
// ---------------------------------------------------------------------------
let cur = { id: null, post: undefined, replies: null };
export function viewPost(id) {
  if (cur.id !== id) cur = { id, post: undefined, replies: null };
  ctx.onAfterRender(() => {
    const a = ctx.cloud.watchPost(id, (p) => { cur.post = p; paintPost(); }, () => { cur.post = cur.post || null; paintPost(); });
    const b = ctx.cloud.watchReplies(id, (r) => { cur.replies = r; paintPost(); });
    ctx.onLeave(a); ctx.onLeave(b);
    paintPost();
  });
  return `<a class="btn btn-sm btn-ghost" href="#/muro">${icon("arrowL")} Volver al muro</a>
    <div id="wallPost" style="margin-top:14px"><div class="card muted" style="text-align:center">Cargando…</div></div>`;
}
function threadHTML(p, rs, inline) {
  const t = TYPES[p.type] || TYPES.tema;
  const replies = [...(rs || [])].sort((a, b) => tsVal(a.createdAt) - tsVal(b.createdAt));
  const talk = p.type !== "anuncio";
  return `
  <article class="card wall-post ${p.type} ${p.hidden ? "is-hidden" : ""}">
    <div class="wall-head">
      ${inline ? "" : `<span class="chip ${t.chip}">${icon(t.icon)} ${t.label}</span>`}
      ${p.closed ? `<span class="chip">${icon("lock")} Conversación cerrada</span>` : ""}
      ${modBadges(p)}<span class="spacer"></span>${menu(p, "post", p.id)}
    </div>
    ${inline ? "" : `<h1 class="wall-h1">${esc(p.title)}</h1>`}
    ${p.body ? `<div class="wall-body"><p>${text(p.body)}</p></div>` : ""}
    ${p.type === "encuesta" ? pollHTML(p) : ""}
    <div class="wall-foot">${byline(p)}<span class="spacer"></span>${st().ready ? likeBtn(p, `wall/${p.id}`) : ""}</div>
  </article>

  ${!talk ? "" : `<h2 class="wall-sub">${rs === null ? "Cargando respuestas…" : replies.length ? `${replies.length} respuesta${replies.length > 1 ? "s" : ""}` : "Aún no hay respuestas"}</h2>
  <div class="stack" style="--gap:10px">
    ${replies.map((r) => `<div class="wall-reply ${r.hidden ? "is-hidden" : ""}" id="r-${esc(r.id)}">
      <div class="wall-head">${byline(r)}<span class="spacer"></span>${modBadges(r)}${menu(r, "reply", p.id)}</div>
      <div class="wall-body"><p>${text(r.body)}</p></div>
      ${st().ready ? `<div class="wall-foot">${likeBtn(r, `wall/${p.id}/replies/${r.id}`)}</div>` : count(r.likes) ? `<div class="wall-foot"><span class="wall-like static">${heart()} ${count(r.likes)}</span></div>` : ""}
    </div>`).join("")}
  </div>

  <div style="margin-top:16px">
  ${p.closed ? `<div class="note">El equipo cerró esta conversación. Puedes seguir leyéndola.</div>`
    : st().ready ? `<form class="card wall-compose" id="wallReply" data-pid="${esc(p.id)}">
        <textarea class="textarea" name="body" maxlength="2000" required placeholder="Escribe tu respuesta…"></textarea>
        <div class="row-wrap"><span class="xs muted">Se mostrará como <b>${esc(ctx.cloud.shortName(st().account.name))}</b></span><span class="spacer"></span>
        <button class="btn btn-primary btn-sm" type="submit">${icon("send")} Responder</button></div>
      </form>`
    : joinBox("sumarte a la conversación")}
  </div>`}`;
}
function paintPost() {
  const box = $("#wallPost");
  if (!box) return;
  const p = cur.post;
  if (p === undefined) return;
  if (p === null) { box.innerHTML = `<div class="card" style="text-align:center;padding:32px"><h2 class="display">Esta publicación ya no está disponible</h2><a class="btn btn-primary" style="margin-top:14px" href="#/muro">Ir al muro</a></div>`; return; }
  // Conserva lo que se estaba escribiendo si llega una respuesta nueva.
  const draft = $("#wallReply textarea")?.value || "";
  const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest("#wallReply");
  box.innerHTML = threadHTML(p, cur.replies, false);
  const ta0 = $("#wallReply textarea"); if (ta0 && draft) ta0.value = draft;
  if (focused) { const ta = $("#wallReply textarea"); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }
}

// ---------------------------------------------------------------------------
// Anuncio destacado en Inicio
// ---------------------------------------------------------------------------
export async function homeHighlight() {
  const slot = $("#wallSlot");
  if (!slot || !ctx.cloud.enabled || !ctx.cloud.state().ready) return;
  const rows = (await ctx.cloud.latestWall()).filter((p) => !p.hidden);
  const s = $("#wallSlot");
  if (!s || !rows.length) return;
  const ann = sortPosts(rows.filter(isNews))[0];
  const talk = sortPosts(rows.filter((p) => !isNews(p)))[0];
  s.innerHTML = `<div class="grid grid-2" style="margin-top:16px">
    ${ann ? `<a class="card link wall-home anuncio" href="${ann.type === "logro" ? `#/muro/${encodeURIComponent(ann.id)}` : "#/muro"}"><span class="eyebrow">${icon(ann.type === "logro" ? "award" : "sparkle")} ${ann.type === "logro" ? "🎉 Nuevo logro" : "Último anuncio"}</span><h3>${esc(ann.title)}</h3>
      ${ann.body ? `<p class="muted small">${esc(ann.body.slice(0, 140))}${ann.body.length > 140 ? "…" : ""}</p>` : ""}<span class="go">Ver el muro ${icon("arrowR")}</span></a>` : ""}
    ${talk ? `<a class="card link wall-home" href="#/muro/${encodeURIComponent(talk.id)}"><span class="eyebrow">${icon("chat")} En conversación</span><h3>${esc(talk.title)}</h3>
      <p class="muted small">${talk.replyCount ? `${talk.replyCount} respuesta${talk.replyCount > 1 ? "s" : ""} · ` : ""}${when(talk.lastActivity)}</p><span class="go">Sumarme ${icon("arrowR")}</span></a>` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------
const need = () => { if (!st().ready) { toast("Ingresa con tu cuenta para participar", ""); return false; } return true; };
const fail = (e) => { console.warn(e); toast("No se pudo guardar. Revisa tu conexión.", ""); };
const pathOf = (el) => (el.dataset.kind === "reply" ? ["wall", el.dataset.pid, "replies", el.dataset.rid] : ["wall", el.dataset.pid]);
const itemOf = (el) => el.dataset.kind === "reply"
  ? (cur.replies || []).find((r) => r.id === el.dataset.rid)
  : (cur.post && cur.post.id === el.dataset.pid ? cur.post : (posts || []).find((p) => p.id === el.dataset.pid));
const closeMenu = (el) => { const d = el.closest("details"); if (d) d.open = false; };

function registerActions() {
  const A = ctx.actions;
  // Abrir o cerrar un tema en la lista (uno a la vez)
  A.wallOpen = (el) => {
    const id = el.dataset.pid;
    if (openId === id) { openId = null; if (openStop) openStop(); openStop = null; cur = { id: null, post: undefined, replies: null }; }
    else { openId = id; watchOpen(id); }
    paintList();
    if (openId) requestAnimationFrame(() => document.querySelector(`.wall-row[data-pid="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest" }));
  };
  A.wallCompose = () => { composeOpen = !composeOpen; ctx.render(); if (composeOpen) requestAnimationFrame(() => $("#wallCompose [name=title]")?.focus()); };
  A.wallFilter = async (el) => {
    filter = el.dataset.f;
    if (filter === "reportes") flagged = await ctx.cloud.flaggedReplies();
    ctx.render();
  };
  A.wallLike = (el) => {
    if (!need()) return;
    ctx.cloud.toggleMark(el.dataset.path.split("/"), "likes", el.dataset.on === "1").catch(fail);
  };
  A.wallReport = (el) => {
    closeMenu(el);
    if (!need()) return;
    const on = el.dataset.on === "1";
    if (on && !confirm("¿Reportar este mensaje al equipo coordinador? Lo revisarán con cuidado.")) return;
    ctx.cloud.toggleMark(pathOf(el), "reports", on).then(() => toast(on ? "Gracias. El equipo lo revisará." : "Reporte retirado")).catch(fail);
  };
  A.wallSet = (el) => {
    closeMenu(el);
    const f = el.dataset.field;
    const val = el.dataset.val === "clear" ? {} : el.dataset.val === "1";
    const p = pathOf(el);
    const op = p.length > 2 ? ctx.cloud.updateReply(p[1], p[3], { [f]: val }) : ctx.cloud.updatePost(p[1], { [f]: val });
    op.then(() => toast({ pinned: val ? "Fijado arriba" : "Desfijado", closed: val ? "Conversación cerrada" : "Conversación reabierta",
      hidden: val ? "Oculto para los demás" : "Visible de nuevo", reports: "Reportes quitados" }[f])).catch(fail);
  };
  A.wallDelete = (el) => {
    closeMenu(el);
    const isReply = el.dataset.kind === "reply";
    if (!confirm(isReply ? "¿Borrar esta respuesta?" : "¿Borrar esta publicación y todas sus respuestas?")) return;
    const op = isReply ? ctx.cloud.deleteReply(el.dataset.pid, el.dataset.rid) : ctx.cloud.deletePost(el.dataset.pid);
    op.then(() => { toast("Borrado"); if (!isReply && location.hash.startsWith("#/muro/")) location.hash = "#/muro"; }).catch(fail);
  };
  A.wallEdit = (el) => {
    closeMenu(el);
    const x = itemOf(el);
    if (!x) return;
    const isReply = el.dataset.kind === "reply";
    const host = el.closest(".wall-post, .wall-reply");
    const body = host.querySelector(".wall-body") || host.querySelector(".wall-title") || host;
    const form = document.createElement("form");
    form.className = "stack wall-edit"; form.style.setProperty("--gap", "8px");
    form.innerHTML = `${isReply ? "" : `<input class="input" name="title" maxlength="140" required value="${esc(x.title)}">`}
      <textarea class="textarea" name="body" maxlength="${isReply ? 2000 : 4000}" ${isReply ? "required" : ""}>${esc(x.body || "")}</textarea>
      <div class="row-wrap"><span class="spacer"></span><button type="button" class="btn btn-sm btn-ghost" data-action="wallEditCancel">Cancelar</button>
      <button class="btn btn-sm btn-primary" type="submit">Guardar</button></div>`;
    form.onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const data = { body: String(f.get("body") || "").trim(), editedAt: new Date() };
      if (!isReply) data.title = String(f.get("title") || "").trim();
      if (isReply ? !data.body : !data.title) return;
      const op = isReply ? ctx.cloud.updateReply(el.dataset.pid, el.dataset.rid, data) : ctx.cloud.updatePost(el.dataset.pid, data);
      op.then(() => toast("Cambios guardados")).catch(fail);
    };
    body.replaceWith(form);
    host.querySelectorAll(".wall-title").forEach((n) => n !== form && n.remove());
    form.querySelector("textarea, input").focus();
  };
  A.wallEditCancel = () => ctx.render();
  A.pollAddOpt = () => {
    const box = $("#pollOpts"), n = box.querySelectorAll("input[name=opt]").length;
    if (n >= 6) { toast("Máximo 6 opciones", ""); return; }
    box.querySelector("[data-action=pollAddOpt]").insertAdjacentHTML("beforebegin", `<input class="input" name="opt" maxlength="80" placeholder="Opción ${n + 1}">`);
  };
  A.pollVote = (el) => {
    if (!need()) return;
    ctx.cloud.votePoll(el.dataset.pid, +el.dataset.i).catch(fail);
  };
  document.addEventListener("change", (e) => {
    if (e.target.name === "type" && e.target.closest("#wallCompose")) {
      const box = $("#pollOpts"); if (box) box.hidden = e.target.value !== "encuesta";
      const t = e.target.form.querySelector("[name=title]"); if (t) t.placeholder = e.target.value === "encuesta" ? "¿Cuál es la pregunta?" : "Título";
    }
  });

  document.addEventListener("submit", async (e) => {
    const f = e.target;
    if (f.id === "wallCompose") {
      e.preventDefault();
      if (!need()) return;
      const d = new FormData(f);
      const title = String(d.get("title") || "").trim();
      if (!title) return;
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      try {
        const type = String(d.get("type") || "pregunta");
        const options = type === "encuesta" ? d.getAll("opt").map((x) => String(x).trim()).filter(Boolean).slice(0, 6) : null;
        if (type === "encuesta" && options.length < 2) { toast("Una encuesta necesita al menos 2 opciones", ""); btn.disabled = false; return; }
        await ctx.cloud.createPost({ type, title, body: String(d.get("body") || "").trim(), pinned: !!d.get("pinned") && st().isStaff, options });
        f.reset(); const po = $("#pollOpts"); if (po) po.hidden = true; toast("Publicado en el muro");
        composeOpen = false; ctx.render();
      } catch (err) { fail(err); }
      btn.disabled = false;
    }
    if (f.id === "wallReply") {
      e.preventDefault();
      if (!need()) return;
      const ta = f.querySelector("textarea");
      const body = ta.value.trim();
      if (!body) return;
      ta.value = "";
      try { await ctx.cloud.createReply(f.dataset.pid, body); }
      catch (err) { fail(err); const t2 = $("#wallReply textarea"); if (t2 && !t2.value) t2.value = body; }
    }
  });
}
