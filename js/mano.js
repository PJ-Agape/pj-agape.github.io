// Una mano: ayuda entre jóvenes de la comunidad. Cada uno publica lo que necesita o lo que puede ofrecer
// (estudios, deporte, cosas, un oficio, compañía) y los demás se ofrecen con un toque. Solo cuentas de Ágape.
// Sin teléfonos ni direcciones en la app: se coordinan en persona o por el grupo (no hay mensajes privados).

import { esc, icon, toast } from "./util.js";
import { avatar } from "./avatares.js";
import { stickerSrc } from "./ilustraciones.js";

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

// WhatsApp: nunca público. Solo lo ven quien publicó y quienes se ofrecieron (reglas de Firestore).
const WA_KEY = "agape_mano_wa";
function waGuardado() { try { return localStorage.getItem(WA_KEY) || ""; } catch { return ""; } }
function waNormal(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (/^9\d{8}$/.test(d)) d = "56" + d;          // celular chileno sin código de país
  if (/^09\d{8}$/.test(d)) d = "56" + d.slice(1);
  return /^\d{8,15}$/.test(d) ? d : "";
}
const waLink = (n, txt) => `https://wa.me/${n}?text=${encodeURIComponent(txt)}`;
const privCache = new Map(); // id → { contacto, ayudantes: { uid: {wa, n} } }

// ---------------------------------------------------------------------------
export function view() {
  const s = st();
  ctx.onAfterRender(() => {
    if (!s.ready) return;
    const stop = ctx.cloud.watchManos((r) => { rows = r; err = false; paint(); }, () => { err = true; paint(); });
    pintarGrupo();
    ctx.onLeave(stop);
    paint();
  });
  return `<header class="mano-hero">
    <div class="mano-hero-t"><span class="mano-hand">ayudarnos entre todos</span><h1>Una <em>mano</em></h1>
      <p>Pide lo que necesitas u ofrece lo que sabes hacer. Entre todos, siempre hay alguien que puede.</p>
</div>
    <img class="mano-hero-img" src="${stickerSrc("equipo")}" alt="" loading="lazy">
    <div class="mano-stats" id="manoStats" aria-live="polite"></div>
  </header>
  ${s.ready ? `<div id="manoGrupo"></div>${composer()}` : join(s)}
  ${s.ready ? `<div class="row-wrap mano-filtros" role="tablist" aria-label="Ver">
      ${[["todo", "Todo"], ["pide", "Piden una mano"], ["ofrece", "Ofrecen"], ["mias", "Las mías"]].map(([k, l]) =>
        `<button class="btn btn-sm ${filtro === k ? "btn-soft" : "btn-ghost"}" data-action="manoFiltro" data-f="${k}" role="tab" aria-selected="${filtro === k}">${l}</button>`).join("")}
    </div>
    <div id="manoList" class="mano-list" aria-live="polite"><p class="muted small">Cargando…</p></div>
    <p class="xs muted mano-pie">Por cuidado de todos, el WhatsApp nunca se publica: solo lo ven quien publicó y quienes se ofrecieron, y solo si lo dejan. Si eres menor de edad, cuéntale a tu guía antes de juntarte con alguien.</p>
    <section class="mano-invita"><div><strong>Invita a otros a dar una mano</strong><p class="small muted">Una imagen lista para tu estado, Instagram o el grupo.</p></div>
      <div class="row-wrap" style="gap:8px"><button class="btn btn-gold btn-sm" data-action="manoPieza" data-f="cuadrada">Imagen cuadrada</button>
      <button class="btn btn-soft btn-sm" data-action="manoPieza" data-f="historia">Para historias</button></div></section>` : ""}`;
}

function join(s) {
  if (!ctx.cloud.enabled) return `<div class="note">Una mano necesita conexión con las cuentas de la pastoral.</div>`;
  if (s.status === "not-invited") return `<div class="note">Entraste con un correo que aún no está invitado. Pide al equipo coordinador que te invite.</div>`;
  if (s.status === "inactive") return `<div class="note">Tu cuenta está en pausa. Conversa con el equipo coordinador para volver.</div>`;
  return `<div class="card mano-join"><strong>Una mano es para la comunidad de Ágape</strong>
    <p class="muted small">Si ya eres parte, ingresa con tu cuenta para pedir ayuda o para darla. Si todavía no, ¡súmate! Te esperamos.</p>
    <div class="row-wrap" style="gap:8px"><button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button>
      <a class="btn btn-gold btn-sm" href="#/conocer">Quiero sumarme</a></div></div>`;
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
    <label class="mano-wa-opt"><input type="checkbox" name="waOn" ${waGuardado() ? "checked" : ""}> Quienes se ofrezcan pueden escribirme por WhatsApp</label>
    <input class="input" name="wa" inputmode="tel" autocomplete="tel" placeholder="Tu WhatsApp, ej: 9 1234 5678" value="${esc(waGuardado())}" ${waGuardado() ? "" : "hidden"}>
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
  return `<article class="card mano mc-${esc(m.cat || "otro")} ${pide ? "pide" : "ofrece"}${m.resuelto ? " hecha" : ""}${m.hidden ? " oculta" : ""}">
    <div class="mano-top"><span class="chip ${pide ? "warn" : "ok"}">${pide ? "Necesita una mano" : "Ofrece una mano"}</span>
      <span class="mano-cat"><i aria-hidden="true"></i>${esc(CAT[m.cat] || "Otro")}</span>${m.resuelto ? `<span class="chip ok">Resuelto</span>` : ""}${m.hidden ? `<span class="chip">Oculta</span>` : ""}</div>
    <p class="mano-txt">${esc(m.texto)}</p>
    <div class="mano-by">${avatar(m.authorAvatar, m.authorName, "")}<span><b>${esc(m.authorName || "Alguien de Ágape")}</b><br><span class="xs muted">${cuando(m.createdAt)}</span></span></div>
    ${ayudas.length ? `<p class="small mano-quienes">${pide ? "Se ofrecieron" : "Les interesa"}: <b>${quienes}</b></p>` : ""}
    ${(mine && ayudas.length) || yo ? `<div class="mano-contacto" data-priv="${m.id}"></div>` : ""}
    <div class="row-wrap mano-acc">
      ${!mine && !m.resuelto ? `<button class="btn btn-sm ${yo ? "btn-soft" : "btn-gold"}" data-action="manoAyudo" data-id="${m.id}" data-on="${yo ? 1 : 0}">${yo ? "Ya no puedo" : pide ? "Puedo ayudar" : "Me interesa"}</button>` : ""}
      ${mine && !m.resuelto ? `<button class="btn btn-sm btn-soft" data-action="manoResuelto" data-id="${m.id}">Ya está resuelto</button>` : ""}
      ${!m.resuelto ? `<button class="btn btn-sm btn-ghost" data-action="manoCompartir" data-id="${m.id}">${icon("send")} Compartir</button>` : ""}
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
  const abiertas = (rows || []).filter((m) => !m.resuelto && !m.hidden && m.tipo === "pide" && ms(m.createdAt) > Date.now() - VIGENCIA * 864e5).length;
  const ofrecen = (rows || []).filter((m) => !m.resuelto && !m.hidden && m.tipo === "ofrece" && ms(m.createdAt) > Date.now() - VIGENCIA * 864e5).length;
  const sb = document.getElementById("manoStats");
  if (sb) sb.innerHTML = [[abiertas, abiertas === 1 ? "necesita una mano" : "necesitan una mano"], [ofrecen, ofrecen === 1 ? "ofrece ayuda" : "ofrecen ayuda"], [dadas, dadas === 1 ? "mano dada" : "manos dadas"]]
    .map(([n, l]) => `<span><b>${n}</b>${l}</span>`).join("");
  box.innerHTML = (xs.length ? xs.map(card).join("") : `<div class="mano-vacio"><strong>${filtro === "mias" ? "Todavía no tienes manos" : "Aún no hay nada por aquí"}</strong>
      <p class="muted small">Sé el primero: pide lo que necesitas o cuenta en qué puedes ayudar.</p></div>`);
  box.querySelectorAll("[data-priv]").forEach((el) => pintarContacto(el, rows.find((m) => m.id === el.dataset.priv)));
}

// Contacto privado: al autor, los WhatsApp de quienes se ofrecieron; a quien se ofreció, el del autor.
async function pintarContacto(el, m) {
  if (!m) return;
  const mine = m.authorUid === me();
  let p = privCache.get(m.id);
  if (!p) { p = await ctx.cloud.getManoPrivado(m.id, mine).catch(() => ({})); privCache.set(m.id, p); }
  if (!el.isConnected) return;
  const pide = m.tipo === "pide";
  if (mine) {
    const hs = Object.entries(m.ayudas || {}).map(([uid, n]) => [n, (p.ayudantes || {})[uid]]);
    el.innerHTML = hs.map(([n, h]) => h && h.wa
      ? `<a class="btn btn-sm mano-wa" href="${waLink(h.wa, `Hola ${n}, soy ${ctx.cloud.shortName(st().account.name)}. Vi en Una mano de agAPPe que ${pide ? "puedes ayudarme" : "te interesa lo que ofrecí"}. ¿Coordinamos?`)}" target="_blank" rel="noopener">WhatsApp a ${esc(n)}</a>`
      : `<span class="xs muted">${esc(n)} no dejó WhatsApp: búsquense en el próximo encuentro o por el grupo.</span>`).join("");
    return;
  }
  const c = p.contacto;
  const mio = (p.ayudantes || {})[me()];
  el.innerHTML = (c && c.wa
    ? `<a class="btn btn-sm mano-wa" href="${waLink(c.wa, `Hola ${m.authorName || ""}, vi en Una mano de agAPPe tu publicación: «${m.texto}». ${pide ? "Te puedo ayudar." : "Me interesa."} ¿Coordinamos?`)}" target="_blank" rel="noopener">Escribirle por WhatsApp</a>`
    : `<span class="xs muted">${esc(m.authorName || "Quien publicó")} prefiere coordinar en persona o por el grupo.</span>`) +
    (mio && mio.wa ? `<span class="xs muted">Le dejaste tu WhatsApp.</span>`
      : `<form class="mano-dejar" data-id="${m.id}"><input class="input" name="wa" inputmode="tel" placeholder="Tu WhatsApp (opcional)" value="${esc(waGuardado())}">
        <button class="btn btn-sm btn-soft" type="submit">Dejarle mi WhatsApp</button></form>`);
}

// ---------------------------------------------------------------------------
// Inicio: invitación con lo que se está pidiendo ahora (solo para cuentas de Ágape)
export async function homeCard() {
  const slot = document.getElementById("manoSlot");
  if (!slot || !ctx.cloud.enabled || !st().ready) return;
  const xs = (await ctx.cloud.latestManos().catch(() => [])).filter((m) => !m.hidden && !m.resuelto && ms(m.createdAt) > Date.now() - VIGENCIA * 864e5);
  const pide = xs.filter((m) => m.tipo === "pide"), ult = pide[0] || xs[0];
  slot.innerHTML = `<a class="mano-home" href="#/mano">
    <img src="${stickerSrc("servir")}" alt="" loading="lazy">
    <span class="mano-home-t"><em>una mano</em>
      <strong>${pide.length ? `${pide.length} ${pide.length === 1 ? "persona necesita" : "personas necesitan"} una mano` : "¿Necesitas algo? ¿Sabes hacer algo?"}</strong>
      ${ult ? `<span class="mano-home-q">«${esc(ult.texto.length > 90 ? ult.texto.slice(0, 88) + "…" : ult.texto)}»</span>` : `<span class="mano-home-q">Pide lo que necesitas u ofrece lo que sabes hacer. Entre todos, siempre hay alguien que puede.</span>`}
      <span class="btn btn-gold btn-sm">${pide.length ? "Ver y ayudar" : "Empezar"} ${icon("right")}</span></span></a>`;
}

// Grupo de WhatsApp de Una mano: el enlace de invitación lo deja un administrador y solo lo ven las cuentas.
let grupo = null, sala = null;
async function pintarGrupo() {
  const el = document.getElementById("manoGrupo"); if (!el) return;
  if (grupo === null) grupo = (await ctx.cloud.getManoGrupo().catch(() => null)) || "";
  if (sala === null) sala = await ctx.cloud.manoSala().catch(() => false);
  if (!el.isConnected) return;
  const admin = st().isAdmin, staff = st().isStaff;
  const salaHTML = sala ? `<a class="mano-sala" href="#/chat/una-mano"><span><strong>Sala «Una mano»</strong><small>Pónganse de acuerdo aquí mismo, dentro de la app.</small></span><span class="btn btn-sm btn-primary">Entrar al chat ${icon("right")}</span></a>`
    : staff ? `<div class="mano-sala"><span><strong>Sala de chat para coordinar</strong><small>Crea la sala «Una mano», abierta a todas las cuentas, para ponerse de acuerdo dentro de la app.</small></span><button class="btn btn-sm btn-soft" data-action="manoCrearSala">Crear la sala</button></div>` : "";
  if (!grupo && !admin) { el.innerHTML = salaHTML; return; }
  el.innerHTML = salaHTML + `<div class="mano-grupo">
    <span><strong>Grupo de WhatsApp de Una mano</strong><small>Ahí llegan las peticiones con su imagen, para comentar y ayudar al tiro.</small></span>
    ${grupo ? `<a class="btn btn-sm mano-wa" href="${esc(grupo)}" target="_blank" rel="noopener">Unirme al grupo</a>` : ""}
    ${admin ? `<form class="mano-grupo-f" id="manoGrupoF"><input class="input" name="url" placeholder="Enlace de invitación (https://chat.whatsapp.com/…)" value="${esc(grupo)}"><button class="btn btn-sm btn-soft" type="submit">Guardar</button></form>` : ""}
  </div>`;
}

// Imagen de una petición u oferta, para pegarla en el grupo con su mensaje
async function piezaDe(m) {
  const E = await import("./estudio.js");
  await E.ready();
  const pide = m.tipo === "pide";
  const d = { kicker: "Una mano", hand: pide ? "¿alguien puede ayudar?" : "se ofrece para ayudar", title: m.texto,
    sub: `${m.authorName || "Alguien de Ágape"} · ${CAT[m.cat] || "Otro"}`, ill: pide ? "servir" : "equipo",
    qr: "https://pj-agape.github.io/#/mano", qrLabel: "respóndele aquí" };
  await E.preload(E.illsFor(pide ? "crema" : "cielo", d));
  const cv = document.createElement("canvas"); cv.width = cv.height = 1080;
  E.piece(cv.getContext("2d"), 1080, 1080, pide ? "crema" : "cielo", d);
  return new Promise((ok) => cv.toBlob(ok, "image/png"));
}
const textoDe = (m) => m.tipo === "pide"
  ? `🤝 *Una mano* · ${m.authorName || "Alguien de Ágape"} necesita una mano (${CAT[m.cat] || "Otro"}):\n\n«${m.texto}»\n\n¿Puedes ayudar? Coméntalo aquí o toca «Puedo ayudar» en agAPPe 👉 https://pj-agape.github.io/#/mano`
  : `🤝 *Una mano* · ${m.authorName || "Alguien de Ágape"} ofrece ayuda (${CAT[m.cat] || "Otro"}):\n\n«${m.texto}»\n\n¿Te sirve? Coméntalo aquí o toca «Me interesa» en agAPPe 👉 https://pj-agape.github.io/#/mano`;
async function compartirImagen(blob, name, text) {
  try { await navigator.clipboard.writeText(text); } catch {}
  try {
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Imagen guardada y texto copiado: pégalos en el grupo.", "ok", 5000);
}

// Pieza para redes (estado, Instagram, grupo): se dibuja con el estudio de difusión
async function pieza(formato) {
  const E = await import("./estudio.js");
  await E.ready();
  const d = { kicker: "Una mano", hand: "en Ágape nos ayudamos", title: "¿Necesitas *una mano?* ¿Sabes hacer algo?",
    sub: "Estudios, deporte, cosas, un oficio o simple compañía. Pide u ofrece ayuda en agAPPe.", ill: "servir",
    qr: "https://pj-agape.github.io/#/mano", qrLabel: "entra aquí" };
  await E.preload(E.illsFor("crema", d));
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = formato === "historia" ? 1920 : 1080;
  E.piece(cv.getContext("2d"), cv.width, cv.height, "crema", d);
  return new Promise((ok) => cv.toBlob(ok, "image/png"));
}
export { pieza as _pieza };

function registerActions() {
  const A = ctx.actions;
  const fail = () => toast("No se pudo. Revisa tu conexión.", "");
  A.manoAbrir = () => { abierto = !abierto; ctx.render(); };
  A.manoCrearSala = async () => { try { await ctx.cloud.crearManoSala(); sala = true; toast("Sala creada.", "ok"); pintarGrupo(); } catch { fail(); } };
  A.manoCompartir = async (el) => {
    const m = (rows || []).find((x) => x.id === el.dataset.id); if (!m) return;
    const blob = await piezaDe(m).catch(() => null); if (!blob) return fail();
    return compartirImagen(blob, `agAPPe-una-mano.png`, textoDe(m));
  };
  A.manoPieza = async (el) => {
    const blob = await pieza(el.dataset.f).catch(() => null); if (!blob) return fail();
    const name = `agAPPe-una-mano-${el.dataset.f}.png`, text = "¿Necesitas una mano? ¿Sabes hacer algo? En Ágape nos ayudamos: pide u ofrece ayuda en agAPPe 👉 https://pj-agape.github.io/#/mano";
    try {
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Imagen guardada. Súbela a tu estado o a Instagram.", "ok");
  };
  A.manoFiltro = (el) => { filtro = el.dataset.f; document.querySelectorAll(".mano-filtros [data-f]").forEach((b) => { const on = b.dataset.f === filtro; b.classList.toggle("btn-soft", on); b.classList.toggle("btn-ghost", !on); b.setAttribute("aria-selected", on); }); paint(); };
  A.manoAyudo = (el) => ctx.cloud.setManoAyuda(el.dataset.id, el.dataset.on !== "1")
    .then(() => { privCache.delete(el.dataset.id); if (el.dataset.on !== "1") toast("¡Gracias! Si quieres, déjale tu WhatsApp para que te escriba.", "ok", 5000); }).catch(fail);
  A.manoResuelto = (el) => ctx.cloud.updateMano(el.dataset.id, { resuelto: true }).then(() => toast("¡Qué bueno! Gracias por contarlo.", "ok")).catch(fail);
  A.manoOcultar = (el) => ctx.cloud.updateMano(el.dataset.id, { hidden: el.dataset.on !== "1" }).catch(fail);
  A.manoBorrar = (el) => { if (!confirm("¿Borrar esta publicación?")) return; ctx.cloud.deleteMano(el.dataset.id).catch(fail); };

  document.addEventListener("change", (e) => {
    const f = e.target.closest && e.target.closest("#manoForm"); if (!f) return;
    if (e.target.name === "waOn") { const i = f.querySelector("[name=wa]"); if (i) { i.hidden = !e.target.checked; if (e.target.checked) i.focus(); } }
    if (e.target.name === "tipo") { tipo = e.target.value; const t = f.querySelector("textarea"); if (t) t.placeholder = tipo === "pide" ? "Ej: Necesito ayuda con matemáticas para la prueba del viernes" : "Ej: Sé editar videos; si alguien necesita, le enseño"; }
    if (e.target.name === "cat") { cat = e.target.value; f.querySelectorAll(".mano-cats .chip").forEach((c) => c.classList.toggle("accent", c.querySelector("input").value === cat)); }
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "manoGrupoF") {
      e.preventDefault();
      const url = String(new FormData(e.target).get("url") || "").trim();
      if (url && !/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(url)) return toast("Pega el enlace de invitación del grupo (https://chat.whatsapp.com/…).", "");
      try { await ctx.cloud.saveManoGrupo(url); grupo = url; pintarGrupo(); toast("Enlace guardado.", "ok"); } catch { fail(); }
      return;
    }
    if (e.target.classList && e.target.classList.contains("mano-dejar")) {
      e.preventDefault();
      const wa = waNormal(new FormData(e.target).get("wa"));
      if (!wa) return toast("Revisa el número: por ejemplo 9 1234 5678.", "");
      try { await ctx.cloud.setManoPrivado(e.target.dataset.id, me(), wa); try { localStorage.setItem(WA_KEY, wa); } catch {} privCache.delete(e.target.dataset.id); toast("Listo, ya puede escribirte.", "ok"); paint(); }
      catch { fail(); }
      return;
    }
    if (e.target.id !== "manoForm") return;
    e.preventDefault();
    const fd = new FormData(e.target);
    let wa = "";
    if (fd.get("waOn")) { wa = waNormal(fd.get("wa")); if (!wa) { toast("Revisa tu WhatsApp: por ejemplo 9 1234 5678.", ""); return; } try { localStorage.setItem(WA_KEY, wa); } catch {} }
    const texto = String(fd.get("texto") || "").trim();
    if (!texto) return;
    if (CONTACTO.test(texto)) { toast("Por cuidado de todos, sin teléfonos, correos ni direcciones. Coordínense en persona o por el grupo.", "", 6000); return; }
    const b = e.target.querySelector("[type=submit]"); if (b) b.disabled = true;
    try { const id = await ctx.cloud.createMano({ tipo, cat, texto }); if (wa && id) await ctx.cloud.setManoPrivado(id, "contacto", wa).catch(() => {}); abierto = false; filtro = "todo"; toast(tipo === "pide" ? "Listo. Ojalá alguien te dé una mano pronto." : "Gracias por ofrecerte.", "ok"); ctx.render(); }
    catch { if (b) b.disabled = false; fail(); }
  });
}
