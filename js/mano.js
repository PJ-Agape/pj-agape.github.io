// Una mano: ayuda entre jóvenes de la comunidad. Cada uno publica lo que necesita o lo que puede ofrecer
// (estudios, deporte, cosas, un oficio, compañía) y los demás se ofrecen con un toque. Solo cuentas de Ágape.
// Sin teléfonos ni direcciones en la app: se coordinan en persona o por el grupo (no hay mensajes privados).

import { esc, icon, toast } from "./util.js";
import { avatar } from "./avatares.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }

const CATS = [
  ["estudio", "Estudios"], ["deporte", "Deporte"], ["cosas", "Cosas"],
  ["oficio", "Un oficio"], ["compania", "Compañía"], ["otro", "Otro"],
];
const CAT = Object.fromEntries(CATS);
const VIGENCIA = 45; // días que una mano sigue a la vista si nadie la marca como resuelta
let rows = null, err = false, filtro = "todo", tipo = "pide", cat = "estudio", abierto = false;

const st = () => ctx.cloud.state();
const me = () => ctx.cloud.myUid();
const ms = (ts) => (ts && ts.toMillis ? ts.toMillis() : ts && ts.seconds ? ts.seconds * 1000 : Date.now());
function cuando(ts) {
  const s = (Date.now() - ms(ts)) / 1000;
  if (s < 3600) return "recién";
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const n = Math.floor(s / 86400);
  return n < 7 ? `hace ${n} día${n > 1 ? "s" : ""}` : new Date(ms(ts)).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}
// Por cuidado de todos (hay menores en la comunidad): nada de teléfonos, correos ni direcciones.
const CONTACTO = /(\+?\d[\d\s.-]{7,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(@\w{3,})|\b(calle|pasaje|avenida|av\.|depto|block)\b\s*\S*\s*\d+/i;

// ---------------------------------------------------------------------------
export function view() {
  const s = st();
  ctx.onAfterRender(() => {
    if (!s.ready) return;
    const stop = ctx.cloud.watchManos((r) => { rows = r; err = false; paint(); }, () => { err = true; paint(); });
    ctx.onLeave(stop);
    paint();
  });
  return `<header class="page-head"><span class="eyebrow">ayudarnos entre todos</span><h1>Una <em>mano</em></h1>
    <p>Pide lo que necesitas u ofrece lo que sabes hacer. Entre todos, siempre hay alguien que puede.</p></header>
  ${s.ready ? composer() : join(s)}
  ${s.ready ? `<div class="row-wrap mano-filtros" role="tablist" aria-label="Ver">
      ${[["todo", "Todo"], ["pide", "Piden una mano"], ["ofrece", "Ofrecen"], ["mias", "Las mías"]].map(([k, l]) =>
        `<button class="btn btn-sm ${filtro === k ? "btn-soft" : "btn-ghost"}" data-action="manoFiltro" data-f="${k}" role="tab" aria-selected="${filtro === k}">${l}</button>`).join("")}
    </div>
    <div id="manoList" class="mano-list" aria-live="polite"><p class="muted small">Cargando…</p></div>
    <p class="xs muted mano-pie">Por cuidado de todos, no publiques teléfonos ni direcciones: coordínense en persona, en el próximo encuentro o por el grupo. Si eres menor de edad, cuéntale a tu guía antes de juntarte con alguien.</p>` : ""}`;
}

function join(s) {
  if (!ctx.cloud.enabled) return `<div class="note">Una mano necesita conexión con las cuentas de la pastoral.</div>`;
  if (s.status === "not-invited") return `<div class="note">Entraste con un correo que aún no está invitado. Pide al equipo coordinador que te invite.</div>`;
  if (s.status === "inactive") return `<div class="note">Tu cuenta está en pausa. Conversa con el equipo coordinador para volver.</div>`;
  return `<div class="card mano-join"><strong>Una mano es para la comunidad de Ágape</strong>
    <p class="muted small">Ingresa con tu cuenta para pedir ayuda o para darla.</p>
    <button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button></div>`;
}

function composer() {
  return `<button class="btn ${abierto ? "btn-ghost" : "btn-primary"} mano-nueva" data-action="manoAbrir" aria-expanded="${abierto}">${icon(abierto ? "x" : "plus")} ${abierto ? "Cancelar" : "Pedir u ofrecer una mano"}</button>
  <form class="card mano-form" id="manoForm" ${abierto ? "" : "hidden"}>
    <div class="seg" role="radiogroup" aria-label="Qué quieres hacer">
      <label><input type="radio" name="tipo" value="pide" ${tipo === "pide" ? "checked" : ""}><span>Necesito una mano</span></label>
      <label><input type="radio" name="tipo" value="ofrece" ${tipo === "ofrece" ? "checked" : ""}><span>Puedo dar una mano</span></label>
    </div>
    <div class="mano-cats" role="radiogroup" aria-label="Tema">
      ${CATS.map(([k, l]) => `<label class="chip ${cat === k ? "accent" : ""}"><input type="radio" name="cat" value="${k}" ${cat === k ? "checked" : ""}>${l}</label>`).join("")}
    </div>
    <textarea class="textarea" name="texto" maxlength="200" required placeholder="${tipo === "pide" ? "Ej: Necesito ayuda con matemáticas para la prueba del viernes" : "Ej: Sé editar videos; si alguien necesita, le enseño"}"></textarea>
    <div class="row-wrap"><span class="xs muted">Se mostrará como <b>${esc(ctx.cloud.shortName(st().account.name))}</b>. Sin teléfonos ni direcciones.</span>
      <span class="spacer"></span><button class="btn btn-primary btn-sm" type="submit">${icon("send")} Publicar</button></div>
  </form>`;
}

function visibles() {
  const s = st(), lim = Date.now() - VIGENCIA * 864e5;
  return (rows || []).filter((m) => (!m.hidden || s.isStaff) && (m.authorUid === me() || !m.resuelto || ms(m.resueltoAt || m.createdAt) > Date.now() - 7 * 864e5) && ms(m.createdAt) > lim)
    .filter((m) => filtro === "todo" || (filtro === "mias" ? m.authorUid === me() || (m.ayudas || {})[me()] : m.tipo === filtro));
}

function card(m) {
  const mine = m.authorUid === me(), s = st();
  const ayudas = Object.entries(m.ayudas || {}), yo = !!(m.ayudas || {})[me()];
  const quienes = ayudas.map(([, n]) => esc(n)).join(", ");
  const pide = m.tipo === "pide";
  return `<article class="card mano ${pide ? "pide" : "ofrece"}${m.resuelto ? " hecha" : ""}${m.hidden ? " oculta" : ""}">
    <div class="mano-top"><span class="chip ${pide ? "warn" : "ok"}">${pide ? "Necesita una mano" : "Ofrece una mano"}</span>
      <span class="chip">${esc(CAT[m.cat] || "Otro")}</span>${m.resuelto ? `<span class="chip ok">Resuelto</span>` : ""}${m.hidden ? `<span class="chip">Oculta</span>` : ""}</div>
    <p class="mano-txt">${esc(m.texto)}</p>
    <div class="mano-by">${avatar(m.authorAvatar, m.authorName, "")}<span><b>${esc(m.authorName || "Alguien de Ágape")}</b><br><span class="xs muted">${cuando(m.createdAt)}</span></span></div>
    ${ayudas.length ? `<p class="small mano-quienes">${pide ? "Se ofrecieron" : "Les interesa"}: <b>${quienes}</b>${mine && !m.resuelto ? `. Búsquense en el próximo encuentro o por el grupo.` : ""}</p>` : ""}
    <div class="row-wrap mano-acc">
      ${!mine && !m.resuelto ? `<button class="btn btn-sm ${yo ? "btn-soft" : "btn-gold"}" data-action="manoAyudo" data-id="${m.id}" data-on="${yo ? 1 : 0}">${yo ? "Ya no puedo" : pide ? "Puedo ayudar" : "Me interesa"}</button>` : ""}
      ${mine && !m.resuelto ? `<button class="btn btn-sm btn-soft" data-action="manoResuelto" data-id="${m.id}">Ya está resuelto</button>` : ""}
      <span class="spacer"></span>
      ${s.isStaff ? `<button class="btn btn-sm btn-ghost" data-action="manoOcultar" data-id="${m.id}" data-on="${m.hidden ? 1 : 0}">${m.hidden ? "Mostrar" : "Ocultar"}</button>` : ""}
      ${mine || s.isStaff ? `<button class="btn btn-sm btn-ghost" data-action="manoBorrar" data-id="${m.id}">${icon("trash")} Borrar</button>` : ""}
    </div></article>`;
}

function paint() {
  const box = document.getElementById("manoList"); if (!box) return;
  if (err) { box.innerHTML = `<div class="note">No se pudo cargar. Revisa tu conexión.</div>`; return; }
  if (!rows) return;
  const xs = visibles();
  const dadas = (rows || []).filter((m) => m.resuelto).length;
  box.innerHTML = (dadas ? `<p class="mano-cuenta"><b>${dadas}</b> ${dadas === 1 ? "mano ya se dio" : "manos ya se dieron"} en la comunidad.</p>` : "") +
    (xs.length ? xs.map(card).join("") : `<div class="mano-vacio"><strong>${filtro === "mias" ? "Todavía no tienes manos" : "Aún no hay nada por aquí"}</strong>
      <p class="muted small">Sé el primero: pide lo que necesitas o cuenta en qué puedes ayudar.</p></div>`);
}

// ---------------------------------------------------------------------------
function registerActions() {
  const A = ctx.actions;
  const fail = () => toast("No se pudo. Revisa tu conexión.", "");
  A.manoAbrir = () => { abierto = !abierto; ctx.render(); };
  A.manoFiltro = (el) => { filtro = el.dataset.f; document.querySelectorAll(".mano-filtros [data-f]").forEach((b) => { const on = b.dataset.f === filtro; b.classList.toggle("btn-soft", on); b.classList.toggle("btn-ghost", !on); b.setAttribute("aria-selected", on); }); paint(); };
  A.manoAyudo = (el) => ctx.cloud.setManoAyuda(el.dataset.id, el.dataset.on !== "1")
    .then(() => { if (el.dataset.on !== "1") toast("¡Gracias! Le avisamos que puedes. Búsquense en el próximo encuentro.", "ok", 5000); }).catch(fail);
  A.manoResuelto = (el) => ctx.cloud.updateMano(el.dataset.id, { resuelto: true }).then(() => toast("¡Qué bueno! Gracias por contarlo.", "ok")).catch(fail);
  A.manoOcultar = (el) => ctx.cloud.updateMano(el.dataset.id, { hidden: el.dataset.on !== "1" }).catch(fail);
  A.manoBorrar = (el) => { if (!confirm("¿Borrar esta publicación?")) return; ctx.cloud.deleteMano(el.dataset.id).catch(fail); };

  document.addEventListener("change", (e) => {
    const f = e.target.closest && e.target.closest("#manoForm"); if (!f) return;
    if (e.target.name === "tipo") { tipo = e.target.value; const t = f.querySelector("textarea"); if (t) t.placeholder = tipo === "pide" ? "Ej: Necesito ayuda con matemáticas para la prueba del viernes" : "Ej: Sé editar videos; si alguien necesita, le enseño"; }
    if (e.target.name === "cat") { cat = e.target.value; f.querySelectorAll(".mano-cats .chip").forEach((c) => c.classList.toggle("accent", c.querySelector("input").value === cat)); }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "manoForm") return;
    e.preventDefault();
    const texto = String(new FormData(e.target).get("texto") || "").trim();
    if (!texto) return;
    if (CONTACTO.test(texto)) { toast("Por cuidado de todos, sin teléfonos, correos ni direcciones. Coordínense en persona o por el grupo.", "", 6000); return; }
    const b = e.target.querySelector("[type=submit]"); if (b) b.disabled = true;
    try { await ctx.cloud.createMano({ tipo, cat, texto }); abierto = false; filtro = "todo"; toast(tipo === "pide" ? "Listo. Ojalá alguien te dé una mano pronto." : "Gracias por ofrecerte.", "ok"); ctx.render(); }
    catch { if (b) b.disabled = false; fail(); }
  });
}
