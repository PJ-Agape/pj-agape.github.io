// Portada de Inicio: el carrusel de bienvenida.
// Mezcla tres fuentes:
//  1) diapositivas de base (Ágape, curso, Mes de la Familia, Todos los Santos, Mes de María),
//  2) lo que el equipo edita en Gestión → Portada (guardado en content/portada),
//  3) eventos de la Agenda marcados «Destacar en Inicio».
// Cada diapositiva se muestra solo entre sus fechas «desde» y «hasta» (si las tiene).

import { esc, icon, toast } from "./util.js";
import { illus, SCENE_KEYS, sceneLabel } from "./ilustraciones.js";
import { isRepeat, nextOn, describe as repeatText } from "./repeat.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = () => iso(new Date());
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const fmt = (s) => { if (!s) return ""; const [y, m, d] = s.split("-").map(Number); return `${d} ${MESES[m - 1].slice(0, 3)}${y !== new Date().getFullYear() ? " " + y : ""}`; };
const longDate = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }); };

export const THEMES = {
  sky: "Celeste", blue: "Azul", gold: "Dorado", rose: "Rosa", orange: "Naranja",
};
const ILLUS_LABEL = (k) => sceneLabel(k);

// ---------------------------------------------------------------------------
// Diapositivas de base (se pueden editar, ocultar o restaurar desde Gestión)
// ---------------------------------------------------------------------------
export const DEFAULTS = [
  { key: "agape", label: "Qué es Ágape", theme: "sky", order: 10, logo: true, illus: "emaus",
    kicker: "Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay", hand: "bienvenido a casa",
    title: "Amor que *transforma*",
    text: "Somos jóvenes de la parroquia que caminan juntos para encontrarse con Jesús, formarse y servir. Aquí nadie es espectador: cada uno importa, con su historia y lo que aporta.",
    chips: ["Familiar y comunitario", "Intuitivo", "Activo"],
    b1: { label: "Conoce la comunidad", href: "#/red" }, b2: { label: "Ver la agenda", href: "#/agenda" } },
  { key: "familia", label: "Mes de la Familia", theme: "blue", order: 5, from: "2026-10-01", to: "2026-10-31", illus: "sagradafamilia",
    kicker: "Octubre · Mes de la Familia", hand: "la familia, primera comunidad",
    title: "Mes de la *Familia*",
    text: "En la familia aprendemos a amar, a perdonar y a rezar. Este mes damos gracias por los nuestros, rezamos por cada hogar y, como la Sagrada Familia de Nazaret, ponemos a Jesús al centro.",
    chips: ["Agradecer", "Rezar juntos", "Cuidarnos"],
    b1: { label: "Rezar por mi familia", href: "#/oracion/velas" }, b2: { label: "Página para las familias", href: "familias/index.html" } },
  { key: "santos", label: "Todos los Santos", theme: "gold", order: 30, from: "2026-09-15", to: "2026-11-02", illus: "santoschile",
    kicker: "Domingo 1 de noviembre · Solemnidad", hand: "tú también estás llamado",
    title: "Todos los *Santos*",
    text: "La santidad no es para unos pocos: es la vocación de todos. Celebramos a quienes ya viven junto a Dios, como san Alberto Hurtado y santa Teresa de los Andes, y el 2 de noviembre rezamos por nuestros difuntos.",
    b1: { label: "Horarios en la agenda", href: "#/agenda" }, b2: { label: "Rezar con el devocionario", href: "#/oracion" } },
  { key: "maria", label: "Mes de María", theme: "rose", order: 40, from: "2026-09-15", to: "2026-12-08", illus: "virgen",
    kicker: "8 de noviembre al 8 de diciembre · 31 días", hand: "con María, puente hacia Jesús",
    title: "Mes de *María*",
    text: "Un mes para rezar, cantar y llevar flores a la Virgen, como es tradición en Chile. ¡Invita a tu familia!",
    b1: { label: "Rezar los 31 días", href: "presentaciones/mes-de-maria.html" }, b2: { label: "Rezar el Rosario", href: "#/oracion/rosario" } },
];
const DEF = Object.fromEntries(DEFAULTS.map((d) => [d.key, d]));

// Eventos de la Agenda → diapositivas
const EV_THEME = { cumpleanos: "rose", encuentro: "orange", retiro: "orange", misa: "gold", liturgia: "gold", festividad: "gold", curso: "blue", taller: "sky", lectura: "blue", actividad: "orange", equipo: "blue", otro: "rose" };
const EV_ILLUS = { cumpleanos: "amigos", encuentro: "comunidad", retiro: "camino", misa: "eucaristia", liturgia: "eucaristia", festividad: "santos", curso: "biblia", taller: "equipo", lectura: "biblia", actividad: "amigos", equipo: "equipo", otro: "corazon" };
function fromEvent(ev) {
  // Si se repite, la diapositiva muestra la próxima fecha.
  const e = isRepeat(ev) ? { ...ev, date: nextOn(ev, todayIso()) || ev.date } : ev;
  const when = [isRepeat(ev) ? repeatText(ev) : longDate(e.date), e.start ? `${e.start}${e.end ? `–${e.end}` : ""} h` : "", e.place || ""].filter(Boolean).join(" · ");
  const text = e.desc ? (e.desc.length > 230 ? e.desc.slice(0, 228).trimEnd() + "…" : e.desc) : (e.audience ? `Para: ${e.audience}.` : "");
  return {
    key: "ev-" + e.id, eventId: e.id, event: true, label: e.title, order: Number.isFinite(+e.featOrder) && e.featOrder !== "" ? +e.featOrder : 15,
    theme: EV_THEME[e.type] || "sky", illus: e.featIllus && SCENE_KEYS.includes(e.featIllus) ? e.featIllus : (EV_ILLUS[e.type] || "comunidad"),
    kicker: when, hand: e.featHand || "¡no te lo pierdas!", title: e.title, text,
    b1: { label: "Ver en la agenda", href: `#/agenda/${e.date}` },
    from: e.featFrom || "", to: e.featTo || (isRepeat(ev) ? (ev.until || "") : e.date), date: e.date,
  };
}

// ---------------------------------------------------------------------------
// Datos (con copia local para que Inicio aparezca al instante)
// ---------------------------------------------------------------------------
const CACHE = "agape_portada_v1";
let over = {}, featured = [], loaded = false;
try { const c = JSON.parse(localStorage.getItem(CACHE) || "null"); if (c) { over = c.over || {}; featured = c.featured || []; } } catch {}
const saveCache = () => { try { localStorage.setItem(CACHE, JSON.stringify({ over, featured })); } catch {} };

// Todas las diapositivas (sin filtrar por fecha), ordenadas.
export function allSlides() {
  // Cualquier diapositiva se puede borrar: las de base y las de la Agenda quedan marcadas «deleted».
  const gone = (k) => !!(over[k] && over[k].deleted);
  const base = DEFAULTS.filter((d) => !gone(d.key)).map((d) => (over[d.key] ? { ...d, ...over[d.key], key: d.key, course: d.course, builtin: true, edited: true } : { ...d, builtin: true }));
  const custom = Object.entries(over).filter(([k, v]) => !DEF[k] && !k.startsWith("ev-") && !(v && v.deleted)).map(([k, v]) => ({ ...v, key: k }));
  const evs = featured.map(fromEvent).filter((e) => !gone(e.key));
  return [...base, ...custom, ...evs].sort((a, b) => (a.order ?? 50) - (b.order ?? 50) || String(a.date || a.from || "").localeCompare(String(b.date || b.from || "")));
}
export const status = (x, t = todayIso()) => x.hidden ? "hidden" : x.from && t < x.from ? "soon" : x.to && t > x.to ? "past" : "live";
export function current() {
  const t = todayIso();
  const list = allSlides().filter((x) => status(x, t) === "live");
  return list;
}

export async function refresh() {
  const before = JSON.stringify({ over, featured });
  const [p, ag] = await Promise.all([ctx.cloud.getPortada ? ctx.cloud.getPortada() : null, ctx.cloud.listAgenda ? ctx.cloud.listAgenda(true) : null]);
  if (p) over = p.slides || {};
  if (ag) featured = ag.filter((e) => e.feat === true && e.date).map(({ id, title, date, start, end, place, desc, audience, type, featFrom, featTo, featHand, featIllus, featOrder, repeat, until, exdates }) =>
    ({ id, title, date, start, end, place, desc, audience, type, featFrom, featTo, featHand, featIllus, featOrder, repeat, until, exdates }));
  loaded = true;
  const changed = JSON.stringify({ over, featured }) !== before;
  if (changed) saveCache();
  return changed;
}

// ---------------------------------------------------------------------------
// HTML de una diapositiva (el curso lo arma app.js)
// ---------------------------------------------------------------------------
const titleHTML = (t) => esc(t || "").replace(/\*(.+?)\*/g, "<em>$1</em>");
const btn = (b, main) => {
  if (!b || !b.label || !b.href) return "";
  const ext = !String(b.href).startsWith("#");
  return `<a class="btn ${main ? "btn-gold" : "btn-glass"}" href="${esc(b.href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${esc(b.label)} ${main ? icon("arrowR") : ""}</a>`;
};
// Enlace con vista previa: un video de YouTube muestra su imagen; cualquier otra página, su ícono y nombre.
export const okUrl = (u) => /^https?:\/\/[^\s]+$/i.test(String(u || "").trim());
export function ytId(u) {
  try {
    const x = new URL(u), h = x.hostname.replace(/^www\.|^m\./, "");
    if (h === "youtu.be") return x.pathname.slice(1).split("/")[0];
    if (h.endsWith("youtube.com")) return x.searchParams.get("v") || (x.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{6,})/) || [])[1] || "";
  } catch {}
  return "";
}
export function linkPreviewHTML(l) {
  if (!l || !okUrl(l.url)) return "";
  let host = ""; try { host = new URL(l.url).hostname.replace(/^www\./, ""); } catch { return ""; }
  const yt = ytId(l.url).replace(/[^\w-]/g, "");
  return `<a class="car-link${yt ? " is-yt" : ""}" href="${esc(l.url)}" target="_blank" rel="noopener">
      ${yt ? `<span class="car-link-img"><img src="https://i.ytimg.com/vi/${yt}/hqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"><i class="car-link-play" aria-hidden="true"></i></span>`
        : `<span class="car-link-ico"><b aria-hidden="true">${esc(host.charAt(0).toUpperCase())}</b><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64" alt="" loading="lazy" width="32" height="32" onerror="this.remove()"></span>`}
      <span class="car-link-txt"><b>${esc(l.label || (yt ? "Ver el video" : host))}</b><small>${esc(host)} ↗</small></span>
    </a>`;
}
// Foto de fondo: se guarda comprimida dentro de la portada, con su punto de encuadre y cuánto se oscurece.
const okPhoto = (p) => !!(p && typeof p.src === "string" && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$/.test(p.src));
const clampN = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : d; };
const PHOTO_MAX = 1600, PHOTO_BYTES = 150000, PORTADA_MAX = 900000;
async function compressPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const k = Math.min(1, PHOTO_MAX / Math.max(img.width, img.height));
    const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    let q = 0.8, d = cv.toDataURL("image/jpeg", q);
    while (d.length > PHOTO_BYTES && q > 0.35) { q -= 0.08; d = cv.toDataURL("image/jpeg", q); }
    if (d.length > PHOTO_BYTES) { // todavía pesada: se achica
      const c2 = document.createElement("canvas"); c2.width = Math.round(cv.width * 0.7); c2.height = Math.round(cv.height * 0.7);
      c2.getContext("2d").drawImage(cv, 0, 0, c2.width, c2.height); d = c2.toDataURL("image/jpeg", 0.6);
    }
    return d;
  } finally { URL.revokeObjectURL(url); }
}

export function slideHTML(x) {
  const chips = (x.chips || []).filter(Boolean);
  const ph = okPhoto(x.photo);
  const phStyle = ph ? ` style="--car-photo:url('${x.photo.src}');--car-px:${clampN(x.photo.x, 50)}%;--car-py:${clampN(x.photo.y, 50)}%;--car-dim:${clampN(x.photo.dim, 55) / 100}"` : "";
  return `<article class="car-slide${ph ? " has-photo" : ""}" data-theme-c="${esc(THEMES[x.theme] ? x.theme : "sky")}" aria-roledescription="diapositiva"${phStyle}>
      ${ph ? "" : `<i class="hero-blob b1"></i><i class="hero-blob b3"></i>`}
      <div class="car-body">
        ${x.kicker ? `<span class="eyebrow">${esc(x.kicker)}</span>` : ""}
        ${x.hand ? `<span class="car-hand">${esc(x.hand)}</span>` : ""}
        <h2 class="car-title">${titleHTML(x.title)}</h2>
        ${x.text ? `<p class="lead">${esc(x.text)}</p><button type="button" class="car-more" data-action="carLead">Leer más</button>` : ""}
        ${chips.length ? `<div class="car-chips">${chips.map((c) => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
        <div class="actions">${btn(x.b1, true)}${btn(x.b2, false)}</div>
      </div>
      ${x.logo ? `<img class="car-logo" src="icons/logo-320.webp" width="150" height="150" alt="Logo Ágape Joven PJ, Parroquia San Miguel de Yungay">` : ""}
      ${x.link && okUrl(x.link.url) ? linkPreviewHTML(x.link) : !ph && x.illus && SCENE_KEYS.includes(x.illus) ? illus(x.illus, "car-illus") : ""}
    </article>`;
}

// ---------------------------------------------------------------------------
// Gestión → Portada
// ---------------------------------------------------------------------------
const STATUS = {
  live: ["Visible ahora", "ok"], soon: ["Programada", "warn"], past: ["Terminada", ""], hidden: ["Oculta", "danger"],
};
export function adminView() {
  ctx.onAfterRender(() => refresh().then((changed) => { if (changed && location.hash.startsWith("#/admin/portada")) ctx.render(); }));
  const list = allSlides();
  const t = todayIso();
  return `
  <header class="page-head"><span class="eyebrow">Gestión</span><h1>Portada de Inicio</h1>
    <p>Las diapositivas del carrusel de bienvenida. Cada una se muestra entre sus fechas «desde» y «hasta»; sin fechas, se muestra siempre. Los cambios se ven al instante, sin pasar por «Publicar».</p></header>
  <div class="row-wrap">
    <button class="btn btn-primary" data-action="pNew">${icon("plus")} Nueva diapositiva</button>
    <a class="btn btn-ghost" href="#/agenda">${icon("grid")} Destacar un evento de la Agenda</a>
    <a class="btn btn-ghost" href="#/">${icon("eye")} Ver Inicio</a>
  </div>
  <div class="stack p-list" style="--gap:10px">
    ${list.map((x, i) => {
      const s = status(x, t), [sl, sc] = STATUS[s];
      const dates = x.from || x.to ? `${x.from ? `desde ${fmt(x.from)}` : ""}${x.from && x.to ? " " : ""}${x.to ? `hasta ${fmt(x.to)}` : ""}` : "sin fechas: siempre";
      const src = x.event ? "Desde la Agenda" : x.course ? "Curso (automática)" : x.builtin ? (x.edited ? "Base · editada" : "Base") : "Creada por el equipo";
      return `<article class="card p-row" data-theme-c="${esc(x.course ? "blue" : x.theme || "sky")}">
        <span class="p-sw"></span>
        <div class="p-main">
          <div class="row-wrap" style="gap:6px"><span class="chip ${sc}">${sl}</span><span class="chip">${esc(src)}</span></div>
          <strong>${esc(x.course ? "Curso «El Arte de Encontrarnos»" : (x.title || x.label || "").replace(/\*/g, ""))}</strong>
          <span class="muted small">${esc(dates)}</span>
        </div>
        <div class="p-btns">
          <button class="icon-btn" data-action="pMove" data-k="${esc(x.key)}" data-d="-1" ${i ? "" : "disabled"} aria-label="Subir">${icon("up")}</button>
          <button class="icon-btn" data-action="pMove" data-k="${esc(x.key)}" data-d="1" ${i < list.length - 1 ? "" : "disabled"} aria-label="Bajar">${icon("down")}</button>
          ${x.event
            ? `<a class="btn btn-sm btn-soft" href="#/agenda/${esc(x.date)}">${icon("edit")} En la Agenda</a>`
            : `<button class="btn btn-sm btn-soft" data-action="pEdit" data-k="${esc(x.key)}">${icon("edit")} Editar</button>
               <button class="btn btn-sm btn-ghost" data-action="pHide" data-k="${esc(x.key)}" data-on="${x.hidden ? 0 : 1}">${icon(x.hidden ? "eye" : "x")} ${x.hidden ? "Mostrar" : "Ocultar"}</button>
               ${x.builtin && x.edited ? `<button class="btn btn-sm btn-ghost" data-action="pReset" data-k="${esc(x.key)}">${icon("undo")} Restaurar</button>` : ""}`}
          <button class="btn btn-sm btn-danger" data-action="pDel" data-k="${esc(x.key)}">${icon("trash")} ${x.event ? "Quitar de Inicio" : "Borrar"}</button>
        </div>
      </article>`;
    }).join("")}
  </div>
  <p class="xs muted">Consejo: para resaltar una actividad, créala en la Agenda y marca «Destacar en Inicio». Desaparece sola cuando pasa su fecha.</p>
  ${Object.values(over).some((v) => v && v.deleted) ? `<button class="btn btn-ghost btn-sm" data-action="pRestoreAll">${icon("undo")} Recuperar las diapositivas borradas de base</button>` : ""}`;
}

// Editor (diálogo con vista previa)
let editing = null;
function editor(x, isNew) {
  editing = { key: x.key, isNew, course: !!x.course, photo: okPhoto(x.photo) ? { ...x.photo } : null };
  let dlg = document.getElementById("pDialog");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "pDialog"; dlg.className = "sheet p-sheet"; document.body.appendChild(dlg); }
  const v = (k) => esc(x[k] || "");
  const opt = (obj, cur) => Object.entries(obj).map(([k, l]) => `<option value="${k}" ${cur === k ? "selected" : ""}>${esc(l)}</option>`).join("");
  const scenes = Object.fromEntries([["", "Sin ilustración"], ...SCENE_KEYS.map((k) => [k, ILLUS_LABEL(k)])]);
  dlg.innerHTML = `<form method="dialog" id="pForm">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Portada</span><h2>${isNew ? "Nueva diapositiva" : x.course ? "Diapositiva del curso" : "Editar diapositiva"}</h2></div>
      <button type="button" class="icon-btn" data-action="pClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      ${x.course ? `<p class="muted small">El contenido de esta diapositiva lo toma del curso y del avance de cada persona. Aquí solo eliges cuándo se muestra.</p>` : `
      <div class="p-prev" id="pPrev" aria-hidden="true"></div>
      <div class="field"><label>Título</label><input class="input" name="title" required maxlength="80" value="${v("title")}" placeholder="Ej: Retiro de *primavera*">
        <span class="xs muted">Pon entre asteriscos la palabra que quieres resaltar: Retiro de *primavera*.</span></div>
      <div class="ag-form-row">
        <div class="field"><label>Línea superior</label><input class="input" name="kicker" maxlength="90" value="${v("kicker")}" placeholder="Ej: Sábado 18 de octubre · Salón parroquial"></div>
        <div class="field"><label>Frase manuscrita</label><input class="input" name="hand" maxlength="40" value="${v("hand")}" placeholder="Ej: ¡te esperamos!"></div>
      </div>
      <div class="field"><label>Texto breve</label><textarea class="textarea" name="text" maxlength="280" rows="3" placeholder="Dos o tres líneas como máximo.">${v("text")}</textarea></div>
      <div class="ag-form-row">
        <div class="field"><label>Color</label><select class="select" name="theme">${opt(THEMES, x.theme || "sky")}</select></div>
        <div class="field"><label>Ilustración</label><select class="select" name="illus">${opt(scenes, x.illus || "")}</select></div>
      </div>
      <div class="ag-form-row">
        <div class="field"><label>Botón principal</label><input class="input" name="b1l" maxlength="40" value="${esc(x.b1?.label || "")}" placeholder="Ej: Inscríbete"></div>
        <div class="field"><label>Enlace</label><input class="input" name="b1h" maxlength="400" value="${esc(x.b1?.href || "")}" placeholder="#/agenda o https://…"></div>
      </div>
      <div class="ag-form-row">
        <div class="field"><label>Segundo botón (opcional)</label><input class="input" name="b2l" maxlength="40" value="${esc(x.b2?.label || "")}"></div>
        <div class="field"><label>Enlace</label><input class="input" name="b2h" maxlength="400" value="${esc(x.b2?.href || "")}" placeholder="#/muro, #/oracion, https://…"></div>
      </div>
      <fieldset class="p-dates"><legend>Enlace con vista previa (opcional)</legend>
        <div class="ag-form-row">
          <div class="field"><label>Enlace</label><input class="input" name="lku" type="url" maxlength="400" value="${esc(x.link?.url || "")}" placeholder="https://youtube.com/… o cualquier página"></div>
          <div class="field"><label>Texto de la vista previa</label><input class="input" name="lkl" maxlength="60" value="${esc(x.link?.label || "")}" placeholder="Ej: Mira el tráiler"></div>
        </div>
        <span class="xs muted">Se muestra en la diapositiva en lugar de la ilustración. Un video de YouTube aparece con su imagen; otras páginas, con su ícono y nombre.</span>
      </fieldset>
      <fieldset class="p-dates p-photo"><legend>Foto de fondo (opcional)</legend>
        <div class="row-wrap" style="gap:8px;align-items:center">
          <label class="btn btn-soft btn-sm">${icon("ul")} <span id="pPhL">${okPhoto(x.photo) ? "Cambiar foto" : "Elegir foto"}</span><input type="file" accept="image/*" id="pPhFile" class="sr-only"></label>
          <button type="button" class="btn btn-ghost btn-sm" data-action="pPhDel" id="pPhDel" ${okPhoto(x.photo) ? "" : "hidden"}>${icon("x")} Quitar foto</button>
        </div>
        <div id="pPhEd" class="p-ph-ed" ${okPhoto(x.photo) ? "" : "hidden"}>
          <div class="p-ph-mocks" id="pPhMocks"></div>
          <div class="fc-sl">
            <label>Encuadre ↔ <input type="range" id="pPhX" min="0" max="100" step="1" value="${clampN(x.photo?.x, 50)}"></label>
            <label>Encuadre ↕ <input type="range" id="pPhY" min="0" max="100" step="1" value="${clampN(x.photo?.y, 50)}"></label>
            <label>Oscurecer <input type="range" id="pPhDim" min="20" max="85" step="1" value="${clampN(x.photo?.dim, 55)}"></label>
          </div>
          <span class="xs muted">Mueve el encuadre para que lo importante quede a la vista en computador y celular. «Oscurecer» ayuda a que el texto se lea bien. Con foto, la ilustración no se muestra.</span>
        </div>
      </fieldset>
      <div class="field"><label>Etiquetas (opcional, separadas por coma)</label><input class="input" name="chips" maxlength="120" value="${esc((x.chips || []).join(", "))}"></div>`}
      <fieldset class="p-dates"><legend>¿Cuándo se muestra?</legend>
        <div class="ag-form-row">
          <div class="field"><label>Desde</label><input class="input" type="date" name="from" value="${v("from")}"></div>
          <div class="field"><label>Hasta (incluido)</label><input class="input" type="date" name="to" value="${v("to")}"></div>
        </div>
        <span class="xs muted">Déjalas en blanco para mostrarla siempre. Al pasar la fecha «hasta», se oculta sola.</span>
        <label class="row" style="gap:8px;margin-top:8px"><input type="checkbox" name="hidden" ${x.hidden ? "checked" : ""}> Ocultar por ahora</label>
      </fieldset>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="pClose">Cancelar</button>
      <button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  dlg.showModal();
  preview();
}
function readForm(form) {
  const f = new FormData(form), g = (k) => String(f.get(k) || "").trim();
  const base = editing.course ? {} : {
    title: g("title"), kicker: g("kicker"), hand: g("hand"), text: g("text"), theme: g("theme") || "sky", illus: g("illus"),
    b1: { label: g("b1l"), href: g("b1h") }, b2: { label: g("b2l"), href: g("b2h") },
    chips: g("chips").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5),
    link: okUrl(g("lku")) ? { url: g("lku"), label: g("lkl") } : null,
    photo: editing.photo ? { src: editing.photo.src, x: clampN($("#pPhX")?.value, 50), y: clampN($("#pPhY")?.value, 50), dim: clampN($("#pPhDim")?.value, 55) } : null,
  };
  return { ...base, from: g("from"), to: g("to"), hidden: f.get("hidden") === "on" };
}
function preview() {
  const box = $("#pPrev"), form = $("#pForm");
  if (!box || !form) return;
  const x = readForm(form);
  box.innerHTML = `<div class="p-prev-in">${slideHTML({ ...x, title: x.title || "Título de la diapositiva", logo: editing.key === "agape" && (over.agape?.logo ?? true) })}</div>`;
  const m = $("#pPhMocks");
  if (m) m.innerHTML = x.photo ? ["Computador", "Celular"].map((l, i) => `<div class="p-ph-mock ${i ? "is-mob" : ""}"><small>${l}</small>
    <div class="p-ph-frame" style="background-image:linear-gradient(rgba(11,37,102,${x.photo.dim / 100}),rgba(11,37,102,${x.photo.dim / 100})),url('${x.photo.src}');background-position:center,${x.photo.x}% ${x.photo.y}%"><b>${esc((x.title || "Título").replace(/\*/g, ""))}</b></div></div>`).join("") : "";
}

async function persist(next, msg) {
  const prev = over;
  over = next; saveCache();
  try { await ctx.cloud.savePortada({ slides: over }); toast(msg || "Portada actualizada"); }
  catch (e) { console.warn(e); over = prev; saveCache(); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  ctx.render();
}
const stored = (k) => over[k] || (DEF[k] ? stripDefault(DEF[k]) : null);
const stripDefault = (d) => { const { key, label, course, ...rest } = d; return { ...rest, label }; };

function registerActions() {
  const A = ctx.actions;
  A.pNew = () => editor({ theme: "orange", illus: "amigos", from: todayIso(), b1: { label: "Ver en la agenda", href: "#/agenda" } }, true);
  A.pEdit = (el) => { const x = allSlides().find((s) => s.key === el.dataset.k); if (x) editor(x, false); };
  A.pClose = () => document.getElementById("pDialog")?.close();
  A.pHide = (el) => { const k = el.dataset.k; persist({ ...over, [k]: { ...stored(k), hidden: el.dataset.on === "1" } }, el.dataset.on === "1" ? "Diapositiva oculta" : "Diapositiva visible"); };
  A.pReset = (el) => {
    if (!confirm("¿Volver esta diapositiva a su versión original?")) return;
    const n = { ...over }; delete n[el.dataset.k]; persist(n, "Diapositiva restaurada");
  };
  A.pDel = (el) => {
    const k = el.dataset.k, ev = k.startsWith("ev-");
    if (!confirm(ev ? "¿Quitar este evento de la portada? Sigue en la Agenda." : "¿Borrar esta diapositiva de la portada?")) return;
    const n = { ...over };
    if (DEF[k] || ev) n[k] = { deleted: true }; else delete n[k]; // las de base y las de la Agenda quedan marcadas como borradas
    persist(n, ev ? "Evento quitado de la portada" : "Diapositiva borrada");
  };
  A.pRestoreAll = () => {
    if (!confirm("¿Recuperar las diapositivas de base y los eventos que se habían borrado de la portada?")) return;
    const n = {}; for (const [k, v] of Object.entries(over)) if (!(v && v.deleted)) n[k] = v;
    persist(n, "Diapositivas recuperadas");
  };
  A.pMove = async (el) => {
    const list = allSlides(), i = list.findIndex((s) => s.key === el.dataset.k), j = i + +el.dataset.d;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const n = { ...over }, evOrders = [];
    list.forEach((s, idx) => {
      const order = (idx + 1) * 10;
      if (s.event) { if (s.order !== order) evOrders.push([s.eventId, order]); }
      else if ((s.order ?? 50) !== order) n[s.key] = { ...(n[s.key] || stored(s.key)), order };
    });
    for (const [id, order] of evOrders) {
      const e = featured.find((f) => f.id === id); if (e) e.featOrder = order;
      try { await ctx.cloud.patchEvent(id, { featOrder: order }); } catch (err) { console.warn(err); }
    }
    persist(n, "Orden actualizado");
  };
  A.pPhDel = () => {
    if (!editing) return; editing.photo = null;
    const ed = $("#pPhEd"), d = $("#pPhDel"), l = $("#pPhL"), f = $("#pPhFile");
    if (ed) ed.hidden = true; if (d) d.hidden = true; if (l) l.textContent = "Elegir foto"; if (f) f.value = "";
    preview();
  };
  document.addEventListener("change", async (e) => {
    if (e.target.id !== "pPhFile" || !e.target.files[0] || !editing) return;
    const l = $("#pPhL"); if (l) l.textContent = "Preparando…";
    try {
      const src = await compressPhoto(e.target.files[0]);
      editing.photo = { src, x: 50, y: 50, dim: 55 };
      ["pPhX", "pPhY"].forEach((id) => { const r = $("#" + id); if (r) r.value = 50; }); const dm = $("#pPhDim"); if (dm) dm.value = 55;
      $("#pPhEd").hidden = false; $("#pPhDel").hidden = false; if (l) l.textContent = "Cambiar foto";
      preview();
    } catch (err) { console.warn(err); if (l) l.textContent = "Elegir foto"; toast("No pude abrir esa imagen. Prueba con una foto JPG o PNG.", ""); }
  });
  document.addEventListener("input", (e) => { if (e.target.closest && e.target.closest("#pForm")) preview(); });
  document.addEventListener("change", (e) => { if (e.target.closest && e.target.closest("#pForm")) preview(); });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "pForm") return;
    e.preventDefault();
    const x = readForm(e.target);
    if (!editing.course && !x.title) return;
    if (x.from && x.to && x.to < x.from) { toast("La fecha «hasta» es anterior a «desde»", ""); return; }
    const key = editing.isNew ? "s" + Date.now().toString(36) : editing.key;
    const prev = stored(key) || {};
    const order = editing.isNew ? 15 : prev.order;
    const label = editing.course ? prev.label : (x.title || "").replace(/\*/g, "");
    const next = { ...over, [key]: { ...prev, ...x, label, order } };
    if (!x.photo) delete next[key].photo;
    if (JSON.stringify({ slides: next }).length > PORTADA_MAX) {
      toast("La portada ya tiene muchas fotos. Quita la foto de alguna diapositiva que ya terminó y vuelve a intentar.", "");
      return;
    }
    document.getElementById("pDialog")?.close();
    persist(next, editing.isNew ? "Diapositiva creada" : "Cambios guardados");
  });
}
