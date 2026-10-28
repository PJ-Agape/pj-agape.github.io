// Cancionero Ágape: canciones con acordes por momento de la misa, cambio de tono,
// notación americana o latina, modo proyección y repertorios para cada celebración.
// Las canciones originales de Ágape vienen incluidas; el equipo agrega las que canta la comunidad.

import { esc, icon, toast } from "./util.js";
import * as E from "./entrada.js";
import { toInline, splitSongs, findDuplicate } from "./acordes-import.js";

let ctx = null; // { actions, render, onAfterRender, onLeave, cloud }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);
const st = () => ctx.cloud.state();
const canEdit = () => !!st().canSongs; // equipo + apostolado del cancionero

// Etiquetas del cancionero (las que definió el equipo), en el orden de la misa.
export const MOMENTOS = [
  ["entrada", "Entrada"], ["perdon", "Perdón"], ["gloria", "Gloria"], ["aleluya", "Aleluya"], ["aclamacion", "Aclamación"],
  ["ofertorio", "Ofertorio"], ["santo", "Santo"], ["padrenuestro", "Padre Nuestro"], ["cordero", "Cordero"], ["comunion", "Comunión"],
  ["meditacion", "Meditación"], ["accion", "Acción de gracias"], ["maria", "Marianos"], ["espiritu", "Espíritu Santo"], ["navidad", "Navidad"],
];
const MLABEL = Object.fromEntries(MOMENTOS);
const known = (l) => (l || []).filter((k) => k in MLABEL); // etiquetas antiguas que ya no se usan quedan fuera
// Momentos de la misa para armar repertorios y la hoja de cantos (algunos no tienen etiqueta propia).
const SLOTS = ["entrada", "perdon", "gloria", "salmo", "aleluya", "ofertorio", "santo", "padrenuestro", "paz", "cordero", "comunion", "comunion2", "accion", "maria", "salida"];
const SLOT_NAME = { salmo: "Salmo", paz: "Paz", salida: "Salida y envío", maria: "Canto a María", comunion2: "Comunión (2)" };
const slotLabel = (k) => SLOT_NAME[k] || MLABEL[k] || k;
// Qué etiquetas sirven para cada momento de la misa (la primera da el nombre del grupo en el selector).
const SLOT_FIT = { aleluya: ["aleluya", "aclamacion"], comunion: ["comunion", "meditacion"], comunion2: ["comunion", "meditacion"], accion: ["accion", "meditacion"], salmo: [], paz: [], salida: [] };
const fitsSlot = (s, slot) => (SLOT_FIT[slot] || [slot]).some((k) => (s.momentos || []).includes(k));
const fitLabel = (slot) => MLABEL[(SLOT_FIT[slot] || [slot])[0]] || "";

// ---------------------------------------------------------------------------
// Canciones originales de la Pastoral Juvenil Ágape (libres para la comunidad)
// ---------------------------------------------------------------------------
const ORIGINALES = [
  { id: "ag-himno", builtin: true, title: "Amor que transforma", author: "Himno Ágape · original de la pastoral", momentos: ["entrada"],
    body: `Estrofa 1:
[G]Somos jóvenes de [D]Yungay
[Em]caminando junto a [C]Ti,
[G]con la mochila de [D]la fe
[C]y un corazón que quiere ser[D]vir.

Coro:
[G]Amor que trans[D]forma,
[Em]amor que se [C]da,
[G]Ágape es tu [D]nombre,
[C]Jesús, nuestro ho[D]gar.
[G]Amor que trans[D]forma,
[Em]nos hace her[C]manos,
[G]tómanos las [D]manos,
[C]llévanos a a[D]mar. [G]

Estrofa 2:
[G]Cuando el camino se hace [D]largo
[Em]y no sé hacia dónde [C]ir,
[G]Tú me miras con [D]cariño
[C]y me enseñas a se[D]guir.

Estrofa 3:
[G]Puente quiero ser, Se[D]ñor,
[Em]entre Tú y mi a[C]migo:
[G]que en mi forma de [D]mirar
[C]te descubra a Ti con[D]migo.` },
  { id: "ag-aleluya", builtin: true, title: "Aleluya Ágape", author: "Original de la pastoral", momentos: ["aleluya"],
    body: `Coro:
[G]Ale[D]luya, [Em]ale[C]luya,
[G]ale[D]luya, a[C]le[D]lu[G]ya.

Estrofa:
[Em]Tu Palabra es [C]luz, Señor,
[G]que ilumina mi ca[D]mino;
[Em]hoy la quiero es[C]cuchar
[G]con el cora[D]zón abier[G]to.` },
  { id: "ag-ofrenda", builtin: true, title: "Te ofrecemos", author: "Original de la pastoral", momentos: ["ofertorio"],
    body: `Estrofa 1:
[D]Pan y vino te trae[A]mos,
[Bm]fruto de la tierra y del tra[G]bajo;
[D]con ellos va nuestra se[A]mana,
[G]lo que reímos y llo[A]ramos.

Coro:
[D]Te ofrecemos, Se[A]ñor, lo que somos,
[Bm]nuestras manos, nuestra juven[G]tud;
[D]todo es tuyo, re[A]cíbelo,
[G]hazlo nuevo con tu a[A]mor. [D]

Estrofa 2:
[D]Te traemos a los a[A]migos,
[Bm]a los que hoy no pudieron ve[G]nir;
[D]pon en ellos tu ca[A]riño,
[G]que también te puedan sen[A]tir.` },
];

// ---------------------------------------------------------------------------
// Acordes: lectura en notación americana (C, Am7, F#m, Bb, D/F#) o latina (Do, Lam, Sol7, Sib)
// ---------------------------------------------------------------------------
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, DO: 0, RE: 2, MI: 4, FA: 5, SOL: 7, LA: 9, SI: 11 };
const NAMES = { us: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"], lat: ["Do", "Do#", "Re", "Mib", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "Sib", "Si"] };
function parseNote(s) {
  const m = /^(Do|Re|Mi|Fa|Sol|La|Si)(#|b)?(.*)$/i.exec(s) || /^([A-G])(#|b)?(.*)$/.exec(s);
  if (!m) return null;
  let n = SEMI[m[1].toUpperCase()]; if (n == null) return null;
  if (m[2] === "#") n++; if (m[2] === "b") n--;
  return { n: (n + 12) % 12, rest: m[3] };
}
function chordName(raw, shift, nota) {
  return raw.split("/").map((part, i) => {
    const p = parseNote(part.trim());
    if (!p) return part;
    return NAMES[nota][(p.n + shift + 120) % 12] + (i === 0 ? p.rest : "");
  }).join("/");
}
const firstChord = (body) => { const m = /\[([^\]]+)\]/.exec(body || ""); return m ? m[1] : ""; };

// ---------------------------------------------------------------------------
// Preferencias de lectura (por dispositivo)
// ---------------------------------------------------------------------------
const PK = "agape_cancionero";
let prefs = { nota: "us", chords: true, size: 1, shift: {} };
try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PK) || "{}") }; } catch {}
const savePrefs = () => { try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch {} };

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------
let songs = null, misas = null, query = "", momento = "", tab = "canciones";
const all = () => [...ORIGINALES, ...(songs || [])].sort((a, b) => a.title.localeCompare(b.title, "es"));
export const songList = () => all(); // para el buscador de Inicio
const byId = (id) => all().find((s) => s.id === id);
function watchAll() {
  if (!st().ready) return;
  const a = ctx.cloud.watchCanciones((r) => { songs = r; repaint(); }, () => { songs = songs || []; repaint(); });
  const b = ctx.cloud.watchRepertorios((r) => { misas = r; repaint(); }, () => { misas = misas || []; repaint(); });
  ctx.onLeave(() => { a(); b(); });
}
let repaint = () => {};

const gate = () => {
  const s = st();
  if (s.ready) return "";
  return `<div class="card wall-join"><span class="tile-ico tile-brand" style="margin:0">${icon("book")}</span>
    <div style="flex:1"><strong>Las canciones de la comunidad son para quienes tienen cuenta</strong>
    <p class="muted small">Aquí ves las canciones originales de Ágape. Ingresa para ver todo el cancionero y los repertorios de cada misa.</p></div>
    ${s.enabled ? `<button class="btn btn-primary btn-sm" data-action="signIn">Ingresar</button>` : ""}</div>`;
};

// ---------------------------------------------------------------------------
// Lista  (#/cancionero)
// ---------------------------------------------------------------------------
export function viewList() {
  const staff = canEdit();
  ctx.onAfterRender(() => { repaint = paintList; watchAll(); paintList(); });
  return `
  ${E.head({ id: "cancionero", back: ["#/oracion", "Capilla"], crumb: "Cancionero", ico: E.ICO.cancion,
    hand: "cantar es rezar dos veces", title: "Cancionero *Ágape*",
    sub: "Canciones con acordes para cada momento de la misa, en el tono que necesites. Ideal para ensayar y para proyectar.",
    side: { hand: "¿Para qué momento?", text: "Elige un momento de la misa y te mostramos sus canciones.", chips: MOMENTOS.slice(0, 10).map(([k, l]) => [l, `data-action="canMomGo" data-m="${k}"`]) },
    guide: { ill: "img/stickers/guitarra.webp", hand: "para la misa del domingo", title: "La hoja de *cantos*", text: "Arma la hoja de una celebración con sus canciones, lista para imprimir o proyectar.", btn: ["#/cancionero/hoja", "Armar la hoja", "print"] } })}
  <section class="ent-lista">
  <h2 class="ent-h" id="canTop">Todas las canciones</h2>
  <nav class="wall-tabs row-wrap" aria-label="Cancionero">
    <button class="btn btn-sm ${tab === "canciones" ? "btn-primary" : "btn-ghost"}" data-action="canTab" data-t="canciones">${icon("book")} Canciones</button>
    <button class="btn btn-sm ${tab === "misas" ? "btn-primary" : "btn-ghost"}" data-action="canTab" data-t="misas">${icon("grid")} Misas y celebraciones</button>
    ${staff ? `<button class="btn btn-sm ${tab === "clasificar" ? "btn-primary" : "btn-ghost"}" data-action="canTab" data-t="clasificar">${icon("check")} Clasificar</button>` : ""}
    <span class="spacer"></span>
    ${tab === "misas" ? `<a class="btn btn-sm btn-soft" href="#/cancionero/hoja">${icon("print")} Hoja de cantos</a>` : `<button class="btn btn-sm btn-ghost" data-action="canExport">${icon("dl")} Exportar</button>`}
    ${staff && tab === "canciones" ? `<button class="btn btn-sm btn-soft" data-action="canImport">${icon("ul")} Importar canciones</button>` : ""}
    ${staff && tab !== "clasificar" ? `<button class="btn btn-sm btn-gold" data-action="${tab === "misas" ? "canNewMisa" : "canNew"}">${icon("plus")} ${tab === "misas" ? "Nueva celebración" : "Nueva canción"}</button>` : ""}
  </nav>
  ${gate()}
  ${tab === "canciones" ? `
  <div class="can-tools">
    <input class="input" id="canSearch" placeholder="Buscar por título, autor o una frase…" value="${esc(query)}" aria-label="Buscar canción">
    <div class="can-chips" role="group" aria-label="Momento">
      <button class="chip ${momento ? "" : "accent"}" data-action="canMom" data-m="">Todas</button>
      ${MOMENTOS.map(([k, l]) => `<button class="chip ${momento === k ? "accent" : ""}" data-action="canMom" data-m="${k}">${esc(l)}</button>`).join("")}
    </div>
  </div>
  <div class="cl-bar" role="toolbar" aria-label="Opciones del libro">
    <button class="btn btn-sm btn-ghost" data-action="clIndex">${icon("grid")} Índice</button>
    <span class="cl-nav"><button class="icon-btn" data-action="clTurn" data-d="-1" aria-label="Página anterior">${icon("left")}</button>
      <span class="cl-pg" id="clPg" aria-live="polite"></span>
      <button class="icon-btn" data-action="clTurn" data-d="1" aria-label="Página siguiente">${icon("right")}</button></span>
    <span class="spacer"></span>
    <button class="btn btn-sm btn-ghost" data-action="canNota">${prefs.nota === "us" ? "Do Re Mi" : "C D E"}</button>
    <button class="btn btn-sm ${prefs.chords ? "btn-soft" : "btn-ghost"}" data-action="canChords" aria-pressed="${prefs.chords}">Acordes</button>
    <span class="can-grp"><button class="icon-btn" data-action="canSize" data-d="-1" aria-label="Letra más chica">A−</button><button class="icon-btn" data-action="canSize" data-d="1" aria-label="Letra más grande">A+</button></span>
  </div>
  <div class="cl-wrap"><div class="cl-stage" id="canLibro" style="--can-size:${prefs.size}" aria-roledescription="libro"></div></div>
  <p class="xs muted cl-help">Desliza la página o toca sus bordes para avanzar. En el computador, usa las flechas del teclado.</p>` : tab === "clasificar" && staff ? clsView() : `<div id="canMisas" class="can-misas"></div>`}
  </section>`;
}
function paintList() {
  paintCls();
  if ($("#canLibro")) buildBook();
  const mb = $("#canMisas");
  if (mb) {
    if (!st().ready) { mb.innerHTML = ""; return; }
    const list = (misas || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    mb.innerHTML = list.length ? list.map((r) => `<a class="card link can-misa" href="#/cancionero/misa/${encodeURIComponent(r.id)}">
        <span class="can-date">${r.date ? `<b>${esc(r.date.slice(8, 10))}</b><small>${esc(new Date(r.date + "T12:00").toLocaleDateString("es-CL", { month: "short" }))}</small>` : "♪"}</span>
        <span class="can-main"><strong>${esc(r.name)}</strong><span class="muted small">${(r.slots || []).filter((x) => x.id).length} canciones${r.note ? ` · ${esc(r.note)}` : ""}</span></span>${icon("right")}</a>`).join("")
      : `<div class="card" style="text-align:center;padding:28px"><p class="muted">${misas === null ? "Cargando…" : "Aún no hay repertorios. Arma el de la próxima misa y todos lo tendrán en su teléfono."}</p>
         ${canEdit() ? `<button class="btn btn-primary btn-sm" style="margin-top:10px" data-action="canNewMisa">${icon("plus")} Nueva celebración</button>` : ""}</div>`;
  }
}

// ---------------------------------------------------------------------------
// El cancionero como libro  (#/cancionero, pestaña Canciones)
// Portada, índice con el número de página de cada canción y una canción por
// página (las largas siguen en la página siguiente). Se pasa de página con
// una animación de volteo, deslizando, tocando los bordes o con el teclado.
// ---------------------------------------------------------------------------
const LK = "agape_libro";
const book = { pages: [], sig: "", at: 0, ix: 1, busy: false, filter: null, justDragged: false };
const anchorOf = (pg) => pg ? (pg.id ? { id: pg.id, part: pg.part } : { k: pg.k }) : null;
let anchor = null;
try { anchor = JSON.parse(localStorage.getItem(LK) || "null"); } catch {}
const saveAnchor = () => { anchor = anchorOf(book.pages[book.at]); try { localStorage.setItem(LK, JSON.stringify(anchor)); } catch {} };
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function filtered() {
  const q = query.trim().toLowerCase();
  return all().filter((s) => (!momento || (s.momentos || []).includes(momento))
    && (!q || (s.title + " " + (s.author || "") + " " + (s.body || "").replace(/\[[^\]]*\]/g, "")).toLowerCase().includes(q)));
}
const filtering = () => !!(query.trim() || momento);

function pageHtml({ cls = "", head = "", body = "", foot = "" }) {
  return `<div class="cl-page ${cls}"><div class="cl-in">${head}<div class="cl-body">${body}</div></div>${foot ? `<div class="cl-foot">${foot}</div>` : ""}</div>`;
}
const footHtml = (left, n, right = "") => `<span class="cl-f-l">${left}</span><span class="cl-f-n">${n}</span><span class="cl-f-r">${right}</span>`;
const songHead = (s) => `<header class="cl-head">${known(s.momentos).length ? `<span class="eyebrow">${known(s.momentos).map((x) => esc(MLABEL[x])).join(" · ")}</span>` : ""}
  <h2>${esc(s.title)}</h2>${s.author ? `<p class="muted small">${esc(s.author)}</p>` : ""}</header>`;
const contHead = (s) => `<p class="cl-cont">${esc(s.title)} <span>(continuación)</span></p>`;

// Reparte una lista de elementos ya dibujados en `body` según el alto disponible.
// availFirst: alto en la primera página; availNext: en las siguientes.
function split(kids, availFirst, availNext, soft) {
  const out = []; let start = 0, avail = availFirst, i = 0;
  if (!kids.length) return [[0, 0]];
  let base = kids[0].offsetTop;
  while (i < kids.length) {
    const bottom = kids[i].offsetTop + kids[i].offsetHeight - base;
    if (bottom > avail && i > start) {
      let cut = i;
      while (cut - 1 > start && soft(kids[cut - 1])) cut--; // no dejar un título de estrofa colgando al pie
      out.push([start, cut]);
      while (cut < kids.length - 1 && kids[cut].classList.contains("can-gap")) cut++; // ni un espacio arriba
      start = i = cut; base = kids[cut].offsetTop; avail = availNext;
      continue;
    }
    i++;
  }
  out.push([start, kids.length]);
  return out;
}

function buildBook(force) {
  const stage = $("#canLibro"); if (!stage || book.busy) return;
  const list = filtered();
  const sig = [stage.clientWidth, stage.clientHeight, prefs.nota, prefs.chords, prefs.size, query, momento, songs === null ? "…" : "",
    list.map((s) => `${s.id}:${(s.body || "").length}:${s.title}:${(s.momentos || []).join(",")}:${prefs.shift[s.id] || 0}`).join("|")].join("/");
  if (!force && sig === book.sig && book.pages.length) { showPage(book.at); return; }
  const filterChanged = book.filter != null && book.filter !== `${query}\u0000${momento}`;
  book.sig = sig; book.filter = `${query}\u0000${momento}`;

  const m = document.createElement("div"); m.className = "cl-leaf cl-measure"; stage.appendChild(m);
  const meas = (html) => { m.innerHTML = html; return m.querySelector(".cl-body"); };
  const soft = (el) => el.classList.contains("can-sec") || el.classList.contains("can-gap");

  // 1) Canciones
  const songPages = [], first = new Map();
  let availNext = null;
  for (const s of list) {
    const lines = songLines(s, prefs.shift[s.id] || 0);
    if (availNext == null) availNext = meas(pageHtml({ cls: "cl-song", head: contHead(s), foot: footHtml("x", 0) })).clientHeight;
    const body = meas(pageHtml({ cls: "cl-song", head: songHead(s), body: lines.join(""), foot: footHtml("x", 0) }));
    const parts = split([...body.children], body.clientHeight, availNext, soft);
    first.set(s.id, songPages.length);
    parts.forEach(([a, b], part) => songPages.push({ id: s.id, part, of: parts.length, html: lines.slice(a, b).join("") }));
  }

  // 2) Índice (los números se completan después; caben igual con 3 dígitos)
  const ixItem = (s, n) => `<button class="cl-ix" data-action="clGo" data-p="${n}"><span class="cl-ix-t">${esc(s.title)}${s.builtin ? ` <small>Original Ágape</small>` : ""}</span><span class="cl-ix-d" aria-hidden="true"></span><span class="cl-ix-n">${n}</span></button>`;
  const ixHead = (cont) => `<header class="cl-head"><span class="eyebrow">${filtering() ? "Canciones encontradas" : "Cancionero Ágape"}</span><h2>Índice${cont ? " <span class=\"cl-cont-s\">(continuación)</span>" : ""}</h2></header>`;
  let ixParts = [[0, 0]];
  if (list.length) {
    const a2 = meas(pageHtml({ cls: "cl-index", head: ixHead(true), foot: footHtml("x", 0) })).clientHeight;
    const b1 = meas(pageHtml({ cls: "cl-index", head: ixHead(false), body: list.map((s) => ixItem(s, 888)).join(""), foot: footHtml("x", 0) }));
    ixParts = split([...b1.children], b1.clientHeight, a2, () => false);
  }
  m.remove();

  // 3) Armar el libro: portada, índice, canciones
  const ixN = ixParts.length, off = 1 + ixN;
  const pages = [];
  const total = list.length;
  const nTxt = songs === null && st().ready ? "Cargando canciones…" : `${total} ${total === 1 ? "canción" : "canciones"}${filtering() ? " con este filtro" : ""}`;
  pages.push({ k: "cover", html: coverHtml({ n: nTxt, go: total > 0 }) });
  ixParts.forEach(([a, b], i) => {
    const body = total ? list.slice(a, b).map((s) => ixItem(s, off + first.get(s.id))).join("")
      : `<div class="cl-empty"><p class="muted">${songs === null && st().ready ? "Cargando canciones…" : "No hay canciones con ese filtro."}</p>
         ${canEdit() ? `<button class="btn btn-primary btn-sm" data-action="canNew">${icon("plus")} Agregar una canción</button>` : ""}</div>`;
    pages.push({ k: "ix" + i, html: pageHtml({ cls: "cl-index", head: ixHead(i > 0), body, foot: footHtml("", 1 + i) }) });
  });
  songPages.forEach((p, i) => {
    const s = byId(p.id), n = off + i;
    const open = `<a href="#/cancionero/${encodeURIComponent(s.id)}" title="Cambiar tono, proyectar o imprimir">Abrir ${icon("right")}</a>`;
    pages.push({ id: p.id, part: p.part, html: pageHtml({ cls: "cl-song", head: p.part ? contHead(s) : songHead(s), body: p.html,
      foot: footHtml(`<button class="cl-f-ix" data-action="clIndex">Índice</button>`, n, open) }) });
  });
  book.pages = pages; book.ix = 1;

  // 4) Volver a donde estaba la lectura
  let at = 0;
  if (filterChanged && filtering()) at = total ? 1 : 0;
  else if (anchor) {
    const j = pages.findIndex((p) => anchor.id ? p.id === anchor.id && p.part === Math.min(anchor.part || 0, pages.filter((q) => q.id === anchor.id).length - 1) : p.k === anchor.k);
    if (j >= 0) at = j;
  }
  book.at = Math.min(at, pages.length - 1);
  showPage(book.at);
}

// Portada: tapa de tela azul noche con marco dorado, lomo cosido, cinta marcapáginas,
// el logo como medallón, un pentagrama con notas y acordes, y la etiqueta de la edición.
const COVER_LINE = "Toda la música para la gloria de Dios";
function coverHtml({ k = "Pastoral Juvenil Ágape · Yungay", t1 = "Cancionero", t2 = "Ágape", ed = "Versión 1", line = COVER_LINE, n = "", go = false } = {}) {
  const rays = [...Array(24)].map((_, i) => { const a = (Math.PI * 2 * i) / 24, r1 = 58, r2 = i % 2 ? 78 : 92;
    return `<path d="M${(100 + Math.cos(a) * r1).toFixed(1)} ${(100 + Math.sin(a) * r1).toFixed(1)} L${(100 + Math.cos(a) * r2).toFixed(1)} ${(100 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join("");
  const staff = [0, 1, 2, 3, 4].map((k) => `<path d="M-10 ${44 + k * 7} C 70 ${20 + k * 7}, 150 ${70 + k * 7}, 230 ${40 + k * 7} S 360 ${30 + k * 7}, 420 ${52 + k * 7}"/>`).join("");
  const note = (x, y, flag) => `<g class="cl-note"><ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.6" transform="rotate(-22 ${x} ${y})"/><path d="M${x + 5.6} ${y - 1.5} V${y - 30}${flag ? ` q2 9 12 13` : ""}" fill="none"/></g>`;
  return `<div class="cl-page cl-cover"><div class="cl-cov">
    <span class="cl-cov-spine" aria-hidden="true"></span>
    <span class="cl-cov-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="cl-cov-ribbon" aria-hidden="true"></span>
    <span class="cl-cov-k">${esc(k)}</span>
    <div class="cl-cov-medal">
      <svg class="cl-cov-rays" viewBox="0 0 200 200" aria-hidden="true">${rays}</svg>
      <img src="icons/logo-320.webp" alt="" width="320" height="320">
    </div>
    <h2><span>${esc(t1)}</span>${t2 ? `<em>${esc(t2)}</em>` : ""}
      <svg class="cl-cov-swash" viewBox="0 0 220 24" aria-hidden="true"><path d="M6 16 C 60 4, 120 4, 214 12"/><path d="M40 20 C 90 12, 140 12, 196 18"/></svg></h2>
    <svg class="cl-cov-staff" viewBox="0 0 400 110" aria-hidden="true">
      <g class="cl-st">${staff}</g>
      ${note(70, 57, true)}${note(108, 66, false)}${note(150, 76, true)}${note(250, 52, false)}${note(292, 44, true)}${note(336, 56, false)}
      <g class="cl-chords"><text x="58" y="20">G</text><text x="140" y="34">D</text><text x="236" y="16">Em</text><text x="326" y="22">C</text></g>
    </svg>
    <div class="cl-cov-foot">
      ${ed ? `<span class="cl-cov-ed">${esc(ed)}</span>` : ""}
      <p class="cl-cov-v">${esc(line)}</p>
      ${go ? `<button class="cl-cov-go" data-action="clGo" data-p="1">Abrir el índice ${icon("arrowR")}</button>` : ""}
      ${n ? `<p class="cl-cov-n">${esc(n)}</p>` : ""}
    </div>
  </div></div>`;
}

function leaf(i, extra = "") {
  return `<div class="cl-leaf ${extra}" data-i="${i}">${book.pages[i]?.html || ""}${extra.includes("cl-turn") ? `<div class="cl-back" aria-hidden="true"></div>` : `<div class="cl-shade" aria-hidden="true"></div>`}</div>`;
}
function showPage(i) {
  const stage = $("#canLibro"); if (!stage) return;
  book.at = Math.max(0, Math.min(i, book.pages.length - 1));
  stage.innerHTML = leaf(book.at);
  const pg = $("#clPg");
  if (pg) pg.textContent = book.at === 0 ? "Portada" : `${book.at} de ${book.pages.length - 1}`;
  document.querySelectorAll("[data-action=clTurn]").forEach((b) => { b.disabled = +b.dataset.d < 0 ? book.at === 0 : book.at >= book.pages.length - 1; });
  saveAnchor();
}

// Prepara el escenario para pasar de `from` a `to`: abajo queda la página que se
// descubre y encima la hoja que gira sobre el lomo (borde izquierdo).
function stageTurn(from, to) {
  const stage = $("#canLibro");
  const fwd = to > from;
  stage.innerHTML = leaf(fwd ? to : from) + leaf(fwd ? from : to, "cl-turn");
  const under = stage.querySelector(".cl-leaf:not(.cl-turn)"), turning = stage.querySelector(".cl-turn");
  return { fwd, under, turning, shade: under.querySelector(".cl-shade") };
}
const ANG = (fwd, p) => fwd ? -180 * p : -180 * (1 - p); // p: 0 → 1 avance del giro
function setTurn(t, p) {
  t.turning.style.transform = `rotateY(${ANG(t.fwd, p)}deg)`;
  t.shade.style.opacity = String(0.55 * (1 - p));
  t.turning.style.setProperty("--lit", String(Math.sin(Math.PI * p)));
}
function finishTurn(t, from, to, p0, done) {
  const dur = reduceMotion() ? 0 : Math.max(120, 620 * (done ? 1 - p0 : p0));
  const end = done ? 1 : 0;
  if (!dur) { book.busy = false; showPage(done ? to : from); return; }
  const start = performance.now();
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const step = (now) => {
    const k = Math.min(1, (now - start) / dur);
    setTurn(t, p0 + (end - p0) * ease(k));
    if (k < 1) requestAnimationFrame(step);
    else { book.busy = false; showPage(done ? to : from); }
  };
  requestAnimationFrame(step);
}
function goPage(to) {
  to = Math.max(0, Math.min(to, book.pages.length - 1));
  const from = book.at;
  if (to === from || book.busy || !$("#canLibro")) return;
  if (reduceMotion()) { showPage(to); return; }
  book.busy = true;
  const t = stageTurn(from, to);
  setTurn(t, 0);
  finishTurn(t, from, to, 0, true);
}
const turnPage = (d) => goPage(book.at + d);

// Deslizar con el dedo (o el mouse): la hoja sigue al dedo, como en un lector de libros.
let drag = null;
document.addEventListener("pointerdown", (e) => {
  const stage = e.target.closest?.("#canLibro");
  if (!stage || book.busy || e.button > 0) return;
  drag = { x: e.clientX, y: e.clientY, w: stage.clientWidth, left: stage.getBoundingClientRect().left, t: null, id: e.pointerId, stage, moved: false, t0: performance.now(), onCtl: !!e.target.closest("a,button,input") };
});
document.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!drag.t) {
    if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2) { if (Math.abs(dy) > 12) drag = null; return; }
    const to = book.at + (dx < 0 ? 1 : -1);
    if (to < 0 || to >= book.pages.length || reduceMotion()) { drag = null; return; }
    drag.to = to; drag.from = book.at; drag.moved = true; book.busy = true;
    drag.t = stageTurn(drag.from, to);
    try { drag.stage.setPointerCapture(e.pointerId); } catch {}
  }
  const p = Math.max(0, Math.min(1, drag.t.fwd ? -dx / drag.w : dx / drag.w));
  drag.p = p; setTurn(drag.t, p);
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (d.t) {
    book.justDragged = true; setTimeout(() => { book.justDragged = false; }, 0);
    const fast = performance.now() - d.t0 < 260 && d.p > 0.08;
    finishTurn(d.t, d.from, d.to, d.p || 0, e.type !== "pointercancel" && (d.p > 0.3 || fast));
    return;
  }
  // Un toque en los bordes de la página pasa de hoja
  if (e.type === "pointerup" && !d.onCtl) {
    const fx = (e.clientX - d.left) / d.w;
    if (fx > 0.72) turnPage(1); else if (fx < 0.28) turnPage(-1);
  }
};
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);
document.addEventListener("click", (e) => { if (e.target.closest?.("#canLibro") && book.justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);

// ---------------------------------------------------------------------------
// Una canción  (#/cancionero/:id)
// ---------------------------------------------------------------------------
let cur = null, fromMisa = null;
export function viewSong(id, misaId) {
  fromMisa = misaId || null;
  ctx.onAfterRender(() => { repaint = () => paintSong(id); watchAll(); paintSong(id); });
  return `<div id="canSong"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function songBody(s, shift, chords = prefs.chords) { return songLines(s, shift, chords).join(""); }
function songLines(s, shift, chords = prefs.chords) {
  const lines = String(s.body || "").split("\n");
  return lines.map((ln) => {
    const t = ln.trim();
    if (!t) return `<div class="can-gap"></div>`;
    if (/^[^\[\]]{1,30}:$/.test(t)) return `<div class="can-sec">${esc(t.slice(0, -1))}</div>`;
    if (!chords || !/\[/.test(ln)) return `<div class="can-line">${esc(ln.replace(/\[[^\]]*\]/g, "")) || "&nbsp;"}</div>`;
    const parts = ln.split(/\[([^\]]+)\]/);
    let html = parts[0] ? `<span class="can-seg"><b class="can-ch">&nbsp;</b><span>${esc(parts[0])}</span></span>` : "";
    for (let i = 1; i < parts.length; i += 2) {
      html += `<span class="can-seg"><b class="can-ch">${esc(chordName(parts[i], shift, prefs.nota))}</b><span>${esc(parts[i + 1] || "") || "&nbsp;"}</span></span>`;
    }
    return `<div class="can-line has-ch">${html}</div>`;
  });
}
function paintSong(id) {
  const box = $("#canSong"); if (!box) return;
  const s = byId(id);
  if (!s) {
    box.innerHTML = songs === null && st().ready ? `<p class="muted" style="padding:30px;text-align:center">Cargando…</p>`
      : `<div class="card" style="text-align:center;padding:30px"><h2 class="display">No encontramos esta canción</h2>${st().ready ? "" : `<p class="muted">Puede que necesites ingresar con tu cuenta.</p>`}<a class="btn btn-primary" style="margin-top:12px" href="#/cancionero">Volver al cancionero</a></div>`;
    return;
  }
  cur = s;
  const shift = prefs.shift[s.id] || 0, key = chordName(firstChord(s.body), shift, prefs.nota);
  const m = fromMisa && (misas || []).find((r) => r.id === fromMisa);
  const seq = m ? (m.slots || []).filter((x) => x.id && byId(x.id)) : [];
  const pos = seq.findIndex((x) => x.id === s.id);
  const prev = pos > 0 ? seq[pos - 1] : null, next = pos >= 0 && pos < seq.length - 1 ? seq[pos + 1] : null;
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/cancionero">Cancionero</a>${m ? `${icon("right")}<a href="#/cancionero/misa/${encodeURIComponent(m.id)}">${esc(m.name)}</a>` : ""}${icon("right")}<span>${esc(s.title)}</span></nav>
  <header class="can-head">
    ${m && pos >= 0 ? `<span class="eyebrow">${esc(slotLabel(seq[pos].m))} · ${pos + 1} de ${seq.length}</span>` : `<span class="eyebrow">${known(s.momentos).map((x) => esc(MLABEL[x])).join(" · ")}</span>`}
    <h1>${esc(s.title)}</h1>
    ${s.author ? `<p class="muted">${esc(s.author)}</p>` : ""}
  </header>
  <div class="can-bar no-print" role="toolbar" aria-label="Opciones de lectura">
    <div class="can-grp" aria-label="Tono"><button class="icon-btn" data-action="canShift" data-d="-1" aria-label="Bajar medio tono">−</button>
      <span class="can-tono">Tono <b>${esc(key || "—")}</b>${shift ? ` <small>(${shift > 0 ? "+" : ""}${shift})</small>` : ""}</span>
      <button class="icon-btn" data-action="canShift" data-d="1" aria-label="Subir medio tono">+</button></div>
    <button class="btn btn-sm btn-ghost" data-action="canNota">${prefs.nota === "us" ? "C D E → Do Re Mi" : "Do Re Mi → C D E"}</button>
    <button class="btn btn-sm ${prefs.chords ? "btn-soft" : "btn-ghost"}" data-action="canChords" aria-pressed="${prefs.chords}">${prefs.chords ? "Ocultar acordes" : "Mostrar acordes"}</button>
    <div class="can-grp"><button class="icon-btn" data-action="canSize" data-d="-1" aria-label="Letra más chica">A−</button><button class="icon-btn" data-action="canSize" data-d="1" aria-label="Letra más grande">A+</button></div>
    <button class="btn btn-sm btn-primary" data-action="canProject" data-scope="song">${icon("eye")} Proyectar</button>
  </div>
  <article class="card can-sheet" style="--can-size:${prefs.size}">${songBody(s, shift)}</article>
  <div class="row-wrap no-print" style="margin-top:14px">
    ${prev ? `<a class="btn btn-ghost" href="#/cancionero/${encodeURIComponent(prev.id)}?misa=${encodeURIComponent(m.id)}">${icon("arrowL")} ${esc(byId(prev.id).title)}</a>` : ""}
    <span class="spacer"></span>
    ${next ? `<a class="btn btn-gold" href="#/cancionero/${encodeURIComponent(next.id)}?misa=${encodeURIComponent(m.id)}">${esc(slotLabel(next.m))}: ${esc(byId(next.id).title)} ${icon("arrowR")}</a>` : ""}
  </div>
  <div class="row-wrap no-print" style="margin-top:10px">
    ${s.link && /^https?:\/\//.test(s.link) ? `<a class="btn btn-sm btn-ghost" href="${esc(s.link)}" target="_blank" rel="noopener">${icon("right")} Escucharla</a>` : ""}
    <button class="btn btn-sm btn-ghost" data-action="print">${icon("print")} Imprimir</button>
    ${canEdit() && !s.builtin ? `<span class="spacer"></span><button class="btn btn-sm btn-soft" data-action="canEdit" data-id="${esc(s.id)}">${icon("edit")} Editar</button>
      ${st().isStaff ? `<button class="btn btn-sm btn-danger" data-action="canDel" data-id="${esc(s.id)}">${icon("trash")} Borrar</button>` : ""}` : ""}
  </div>`;
}

// ---------------------------------------------------------------------------
// Un repertorio  (#/cancionero/misa/:id)
// ---------------------------------------------------------------------------
export function viewMisa(id) {
  ctx.onAfterRender(() => { repaint = () => paintMisa(id); watchAll(); paintMisa(id); });
  return `${gate()}<div id="canMisa"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function paintMisa(id) {
  const box = $("#canMisa"); if (!box) return;
  if (!st().ready) { box.innerHTML = ""; return; }
  const r = (misas || []).find((x) => x.id === id);
  if (!r) { box.innerHTML = misas === null ? `<p class="muted" style="padding:30px;text-align:center">Cargando…</p>` : `<div class="card" style="text-align:center;padding:30px"><h2 class="display">No encontramos este repertorio</h2><a class="btn btn-primary" style="margin-top:12px" href="#/cancionero">Volver</a></div>`; return; }
  const slots = (r.slots || []).filter((x) => x.id);
  box.innerHTML = `
  <nav class="crumbs"><a href="#/cancionero">Cancionero</a>${icon("right")}<span>${esc(r.name)}</span></nav>
  <header class="can-head"><span class="eyebrow">${r.date ? esc(new Date(r.date + "T12:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })) : "Repertorio"}</span>
    <h1>${esc(r.name)}</h1>${r.note ? `<p class="muted">${esc(r.note)}</p>` : ""}</header>
  <div class="row-wrap" style="margin-bottom:14px">
    ${slots.length ? `<button class="btn btn-primary" data-action="canProject" data-scope="misa" data-id="${esc(r.id)}">${icon("eye")} Proyectar toda la misa</button>
    <a class="btn btn-gold" href="#/cancionero/${encodeURIComponent(slots[0].id)}?misa=${encodeURIComponent(r.id)}">Empezar con ${esc(slotLabel(slots[0].m))} ${icon("arrowR")}</a>` : ""}
    <a class="btn btn-soft" href="#/cancionero/hoja?misa=${encodeURIComponent(r.id)}">${icon("print")} Hoja de cantos</a>
    <button class="btn btn-ghost" data-action="canExport" data-misa="${esc(r.id)}">${icon("dl")} Exportar</button>
    ${canEdit() ? `<span class="spacer"></span><button class="btn btn-sm btn-soft" data-action="canEditMisa" data-id="${esc(r.id)}">${icon("edit")} Editar</button>
      ${st().isStaff ? `<button class="btn btn-sm btn-danger" data-action="canDelMisa" data-id="${esc(r.id)}">${icon("trash")} Borrar</button>` : ""}` : ""}
  </div>
  <ol class="can-setlist">${slots.map((x) => { const s = byId(x.id); return `<li>
      <span class="can-slot">${esc(slotLabel(x.m))}</span>
      ${s ? `<a href="#/cancionero/${encodeURIComponent(s.id)}?misa=${encodeURIComponent(r.id)}"><strong>${esc(s.title)}</strong> <span class="muted small">${esc(chordName(firstChord(s.body), prefs.shift[s.id] || 0, prefs.nota))}</span></a>` : `<span class="muted">Canción borrada</span>`}
    </li>`; }).join("") || `<li class="muted">Aún no tiene canciones.</li>`}</ol>`;
}

// ---------------------------------------------------------------------------
// Proyección a pantalla completa (sin acordes, una estrofa por pantalla)
// ---------------------------------------------------------------------------
let slides = [], si = 0;
function stanzas(s) {
  const out = [{ title: s.title, sub: s.author || "" }];
  String(s.body || "").split(/\n\s*\n/).forEach((blk) => {
    const lines = blk.split("\n").map((l) => l.replace(/\[[^\]]*\]/g, "").trim()).filter(Boolean);
    if (!lines.length) return;
    let label = "";
    if (/^[^:]{1,30}:$/.test(lines[0])) label = lines.shift().slice(0, -1);
    if (lines.length) out.push({ label, lines });
  });
  return out;
}
function project(list) {
  slides = list.flatMap((x) => stanzas(x.song).map((sl) => ({ ...sl, moment: x.m ? slotLabel(x.m) : "" })));
  si = 0;
  let ov = document.getElementById("canProj");
  if (!ov) { ov = document.createElement("div"); ov.id = "canProj"; document.body.appendChild(ov); }
  ov.className = "can-proj"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Proyección de la letra");
  document.body.classList.add("cap-quiet");
  try { ov.requestFullscreen && ov.requestFullscreen().catch(() => {}); } catch {}
  paintProj();
}
function paintProj() {
  const ov = document.getElementById("canProj"); if (!ov) return;
  const s = slides[si] || {};
  ov.innerHTML = `<div class="can-proj-in">
    ${s.title ? `<span class="can-proj-mom">${esc(s.moment || "")}</span><h2 class="can-proj-title">${esc(s.title)}</h2>${s.sub ? `<p class="can-proj-sub">${esc(s.sub)}</p>` : ""}`
      : `${s.label ? `<span class="can-proj-mom">${esc(s.label)}</span>` : ""}<p class="can-proj-txt">${(s.lines || []).map(esc).join("<br>")}</p>`}
  </div>
  <div class="can-proj-ctrl"><button class="icon-btn" data-action="canPrev" aria-label="Anterior">${icon("left")}</button>
    <span>${si + 1} / ${slides.length}</span>
    <button class="icon-btn" data-action="canNext" aria-label="Siguiente">${icon("right")}</button>
    <button class="btn btn-sm btn-glass" data-action="canProjClose">Salir</button></div>`;
}
function closeProj() {
  const ov = document.getElementById("canProj"); if (ov) ov.remove();
  document.body.classList.remove("cap-quiet");
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
}

// ---------------------------------------------------------------------------
// Editores (equipo)
// ---------------------------------------------------------------------------
function dialog(id) {
  let d = document.getElementById(id);
  if (!d) { d = document.createElement("dialog"); d.id = id; d.className = "sheet p-sheet"; document.body.appendChild(d); }
  return d;
}
function songEditor(s) {
  const d = dialog("canDlg"), v = s || { title: "", author: "", momentos: [], body: "", link: "" };
  d.innerHTML = `<form method="dialog" id="canForm" data-id="${esc(s ? s.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Cancionero</span><h2>${s ? "Editar canción" : "Nueva canción"}</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="ag-form-row">
        <div class="field"><label>Título</label><input class="input" name="title" required maxlength="120" value="${esc(v.title)}"></div>
        <div class="field"><label>Autor o fuente</label><input class="input" name="author" maxlength="120" value="${esc(v.author || "")}" placeholder="Quién la compuso o de dónde la sacamos"></div>
      </div>
      <fieldset class="p-dates"><legend>Momentos en que se canta</legend>
        <div class="can-chips">${MOMENTOS.map(([k, l]) => `<label class="chip"><input type="checkbox" name="m" value="${k}" ${(v.momentos || []).includes(k) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div>
      </fieldset>
      <div class="field"><label>Letra con acordes</label>
        <button type="button" class="btn btn-sm btn-soft can-fix" data-action="canFix">${icon("check")} Acomodar acordes pegados (acordes arriba de la letra)</button>
        <textarea class="textarea can-ta" name="body" rows="14" maxlength="20000" placeholder="Coro:\n[G]Amor que trans[D]forma,\n[Em]amor que se [C]da…">${esc(v.body || "")}</textarea>
        <span class="xs muted">Escribe cada acorde entre corchetes justo antes de la sílaba donde cambia: <code>[G]Amor que trans[D]forma</code>. Sirve <code>[Am]</code> o <code>[Lam]</code>. Una línea que termina en dos puntos (<code>Coro:</code>) es un título. Deja una línea en blanco entre estrofas.</span></div>
      <div class="field"><label>Enlace para escucharla (opcional)</label><input class="input" name="link" maxlength="400" value="${esc(v.link || "")}" placeholder="https://youtube.com/…"></div>
      <p class="xs muted">Carga solo canciones que la comunidad canta, para uso interno. Las letras se ven solo con cuenta.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  d.showModal();
}
// Importar varias canciones de una vez (pegadas desde un PDF o una página): se separan con «---».
let imp = [];
function importDialog() {
  imp = [];
  const d = dialog("canImpDlg");
  d.innerHTML = `<form method="dialog" id="canImpForm">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Cancionero</span><h2>Importar canciones</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <p class="small">Pega una o varias canciones tal como vienen, con los acordes arriba de la letra. Entre una canción y otra, escribe una línea con <code>---</code>. La primera línea de cada una es su título.</p>
      <textarea class="textarea can-ta" id="canImpText" rows="12" placeholder="Título de la canción&#10;G        D&#10;Primera línea de la letra…&#10;---&#10;Título de otra canción&#10;…"></textarea>
      <button type="button" class="btn btn-soft" data-action="canImpCheck">${icon("eye")} Revisar</button>
      <div id="canImpPrev"></div>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button>
      <button class="btn btn-primary" type="submit" id="canImpSave" disabled>Guardar canciones</button></div>
  </form>`;
  d.showModal();
}
function importPreview() {
  const box = document.getElementById("canImpPrev"); if (!box) return;
  imp = splitSongs(document.getElementById("canImpText")?.value || "");
  const save = document.getElementById("canImpSave");
  if (!imp.length) { box.innerHTML = `<p class="note small">No encontré canciones. Revisa que la primera línea de cada una sea el título.</p>`; if (save) save.disabled = true; return; }
  // Repetidas: contra el cancionero y también dentro de lo mismo que se pegó.
  const seen = [];
  imp.forEach((x) => { const d = findDuplicate(x, [...all(), ...seen]); x.dup = d ? `${d.why} que «${d.song.title}»` : ""; seen.push({ ...x, id: "" }); });
  box.innerHTML = `<p class="small"><b>${imp.length} canci${imp.length > 1 ? "ones" : "ón"}</b> encontrada${imp.length > 1 ? "s" : ""}. Toca una para ver cómo quedó.${imp.some((x) => x.dup) ? ` Las que parecen repetidas quedan sin marcar; márcalas solo si de verdad son distintas.` : ""}</p>
    <div class="field"><label>Autor o fuente (para todas, opcional)</label><input class="input" id="canImpAuthor" maxlength="120" placeholder="Ej: Cancionero parroquial 2019"></div>
    <fieldset class="p-dates"><legend>Momentos (para todas, opcional)</legend>
      <div class="can-chips">${MOMENTOS.map(([k, l]) => `<label class="chip"><input type="checkbox" name="im" value="${k}"> ${esc(l)}</label>`).join("")}</div></fieldset>
    <div class="can-imp-list">${imp.map((x, i) => `<details class="can-imp"><summary><label onclick="event.stopPropagation()"><input type="checkbox" name="imok" value="${i}" ${x.dup ? "" : "checked"}></label>
        <b>${esc(x.title)}</b><small>${x.chords ? `${x.chords} acordes` : "sin acordes"}${x.dup ? ` · <span class="can-dup">posible repetida: ${esc(x.dup)}</span>` : ""}</small></summary>
        <pre class="can-imp-body">${esc(x.body)}</pre></details>`).join("")}</div>`;
  if (save) save.disabled = false;
}

function misaEditor(r) {
  const d = dialog("canMisaDlg"), v = r || { name: "", date: "", note: "", slots: [] };
  const pick = Object.fromEntries((v.slots || []).map((x) => [x.m, x.id]));
  const list = all();
  const opts = (slot) => {
    const m = fitLabel(slot);
    const fit = list.filter((s) => fitsSlot(s, slot)), rest = list.filter((s) => !fitsSlot(s, slot));
    const o = (s) => `<option value="${esc(s.id)}" ${pick[slot] === s.id ? "selected" : ""}>${esc(s.title)}</option>`;
    return `<option value="">—</option>${fit.length ? `<optgroup label="Para ${esc(m)}">${fit.map(o).join("")}</optgroup>` : ""}<optgroup label="Otras">${rest.map(o).join("")}</optgroup>`;
  };
  d.innerHTML = `<form method="dialog" id="canMisaForm" data-id="${esc(r ? r.id : "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Cancionero</span><h2>${r ? "Editar celebración" : "Nueva celebración"}</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <div class="ag-form-row">
        <div class="field"><label>Nombre</label><input class="input" name="name" required maxlength="120" value="${esc(v.name)}" placeholder="Misa juvenil · Todos los Santos"></div>
        <div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${esc(v.date || "")}"></div>
      </div>
      <div class="field"><label>Nota (opcional)</label><input class="input" name="note" maxlength="140" value="${esc(v.note || "")}" placeholder="Ensayo el sábado 18:00 · Guitarra: Cami"></div>
      <div class="can-slots">${SLOTS.map((k) => `<div class="field"><label>${esc(slotLabel(k))}</label><select class="select" name="s_${k}">${opts(k)}</select></div>`).join("")}</div>
      <p class="xs muted">Deja en «—» los momentos que se rezan sin canto.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button><button class="btn btn-primary" type="submit">Guardar</button></div>
  </form>`;
  d.showModal();
}

// ---------------------------------------------------------------------------
// Clasificar por momento, muchas canciones a la vez (equipo)
// ---------------------------------------------------------------------------
const draft = new Map(); // id → momentos sin guardar
const sel = new Set();   // canciones marcadas
let clsQ = "", clsF = "sin";
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const momsOf = (s) => draft.get(s.id) || known(s.momentos);
const MORDER = Object.fromEntries(MOMENTOS.map(([k], i) => [k, i]));
const sortM = (l) => [...new Set(l)].filter((k) => k in MORDER).sort((a, b) => MORDER[a] - MORDER[b]);
const plain = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const firstLine = (s) => { for (const l of String(s.body || "").split("\n")) { const t = l.replace(/\[[^\]]*\]/g, "").trim(); if (t && !/:$/.test(t) && /[a-záéíóúñ]{3}/i.test(t)) return t; } return ""; };
// Pistas por el título (y la primera línea). Es solo una sugerencia: la decide quien clasifica.
const HINTS = [
  ["santo", /^santo\b|santo,? santo/], ["cordero", /cordero de dios/], ["gloria", /^gloria\b|gloria a dios en el cielo/],
  ["perdon", /perdon|piedad|kyrie/], ["aleluya", /aleluya/], ["salmo", /^salmo\b/],
  ["ofertorio", /ofrend|ofrec|ofrezco|pan y (el )?vino|frutos de la tierra|presentamos/],
  ["comunion", /pan de vida|cuerpo de cristo|tu cuerpo|comunion|eucarist|banquete|tu mesa|la mesa|cena del senor|pan vivo/],
  ["paz", /^la paz|^paz\b|paz del senor|la paz este/], ["accion", /\bgracias\b/],
  ["maria", /maria|virgen|madre de dios|madre mia|^ave\b|magnificat|senora/],
  ["salida", /^id\b|vayan|envia|enviado|misioner|anunciar|mision/],
  ["entrada", /^venimos|^vienen|reunid|casa del senor|vamos a la casa|alegres vamos|entrada/],
  ["adoracion", /adora|santisimo|sagrario/], ["aclamacion", /tu palabra|^alab/],
  ["padrenuestro", /^padre nuestro/], ["espiritu", /espiritu/], ["navidad", /navidad|belen|ha nacido|nino dios|pesebre|noche de paz|tamborilero/],
];
function suggest(s) {
  const t = plain(s.title), l = plain(firstLine(s)), have = momsOf(s), out = [];
  for (const [k, re] of HINTS) {
    if (!(k in MLABEL) || have.includes(k) || out.includes(k)) continue;
    // En la primera línea solo se buscan las partes fijas de la misa; lo demás, por el título.
    const byLine = ["santo", "cordero", "gloria", "perdon", "ofertorio", "comunion"].includes(k);
    if (re.test(t) || (byLine && re.test(l))) out.push(k);
  }
  return out.slice(0, 3);
}
const editable = () => (songs || []).slice().sort((a, b) => a.title.localeCompare(b.title, "es"));
function clsVisible() {
  const q = plain(clsQ.trim());
  return editable().filter((s) => {
    const m = momsOf(s);
    if (clsF === "sin" && m.length) return false;
    if (clsF === "sug" && !suggest(s).length) return false;
    if (clsF && !["sin", "sug", "todas"].includes(clsF) && !m.includes(clsF)) return false;
    return !q || plain(s.title + " " + (s.author || "") + " " + firstLine(s)).includes(q);
  });
}
const pending = () => editable().filter((s) => draft.has(s.id) && !sameSet(draft.get(s.id), s.momentos || []));
function setMoms(s, list) { const v = sortM(list); if (sameSet(v, s.momentos || [])) draft.delete(s.id); else draft.set(s.id, v); }

function clsView() {
  return `
  <div class="card cls-help small"><b>Así se clasifica rápido:</b> marca varias canciones y elige el momento abajo, o toca las sugerencias punteadas de cada una. Nada se guarda hasta que tocas «Guardar cambios».</div>
  <div class="cls-tools">
    <input class="input" id="clsSearch" placeholder="Buscar canción…" value="${esc(clsQ)}" aria-label="Buscar canción">
    <select class="select" id="clsFilter" aria-label="Mostrar">
      <option value="sin" ${clsF === "sin" ? "selected" : ""}>Sin momento</option>
      <option value="sug" ${clsF === "sug" ? "selected" : ""}>Con sugerencias</option>
      <option value="todas" ${clsF === "todas" ? "selected" : ""}>Todas</option>
      <optgroup label="Que ya tienen…">${MOMENTOS.map(([k, l]) => `<option value="${k}" ${clsF === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</optgroup>
    </select>
  </div>
  <div class="cls-bar" role="toolbar" aria-label="Clasificar las marcadas">
    <label class="cls-all"><input type="checkbox" id="clsAll"> <span id="clsN">0 marcadas</span></label>
    <select class="select" id="clsMom" aria-label="Momento">${MOMENTOS.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select>
    <button class="btn btn-sm btn-soft" data-action="clsAdd">${icon("plus")} Agregar</button>
    <button class="btn btn-sm btn-ghost" data-action="clsDel">Quitar</button>
    <button class="btn btn-sm btn-ghost" data-action="clsSugAll" id="clsSugBtn">Aceptar sugerencias</button>
    <button class="btn btn-sm btn-ghost" data-action="clsPaste">${icon("ul")} Pegar desde planilla</button>
    <span class="spacer"></span>
    <button class="btn btn-sm btn-primary" data-action="clsSave" id="clsSave" disabled>Guardar cambios</button>
  </div>
  <div id="clsList" class="cls-list"></div>`;
}
function paintCls() {
  const box = $("#clsList"); if (!box) return;
  if (songs === null) { box.innerHTML = `<p class="muted" style="padding:20px;text-align:center">Cargando canciones…</p>`; return; }
  const list = clsVisible();
  box.innerHTML = list.length ? list.map((s) => {
    const m = momsOf(s), sg = suggest(s), ch = draft.has(s.id) && !sameSet(draft.get(s.id), s.momentos || []);
    return `<div class="cls-row${sel.has(s.id) ? " on" : ""}${ch ? " changed" : ""}">
      <input type="checkbox" class="cls-pick" data-id="${esc(s.id)}" ${sel.has(s.id) ? "checked" : ""} aria-label="Marcar ${esc(s.title)}">
      <div class="cls-main"><a href="#/cancionero/${encodeURIComponent(s.id)}"><strong>${esc(s.title)}</strong></a><span class="xs muted">${esc(firstLine(s).slice(0, 70))}</span></div>
      <div class="cls-moms">
        ${m.map((k) => `<button class="chip accent" data-action="clsTog" data-id="${esc(s.id)}" data-m="${k}" title="Quitar">${esc(MLABEL[k])} ×</button>`).join("")}
        ${sg.map((k) => `<button class="chip cls-sug" data-action="clsTog" data-id="${esc(s.id)}" data-m="${k}" title="Sugerencia: tócala para agregarla">+ ${esc(MLABEL[k])}</button>`).join("")}
        <select class="cls-add" data-id="${esc(s.id)}" aria-label="Agregar momento a ${esc(s.title)}"><option value="">+ momento</option>${MOMENTOS.filter(([k]) => !m.includes(k)).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select>
      </div></div>`;
  }).join("") : `<div class="card" style="text-align:center;padding:24px"><p class="muted">${clsF === "sin" ? "Todas las canciones tienen al menos un momento. ¡Bien!" : "No hay canciones con ese filtro."}</p></div>`;
  const n = pending().length, vis = list.map((s) => s.id);
  const sv = $("#clsSave"); if (sv && !sv.dataset.busy) { sv.disabled = !n; sv.textContent = n ? `Guardar cambios (${n})` : "Guardar cambios"; }
  const cn = $("#clsN"); if (cn) cn.textContent = sel.size ? `${sel.size} marcada${sel.size > 1 ? "s" : ""}` : "Marcar todas";
  const all_ = $("#clsAll"); if (all_) { all_.checked = vis.length > 0 && vis.every((id) => sel.has(id)); all_.indeterminate = !all_.checked && vis.some((id) => sel.has(id)); }
  const sb = $("#clsSugBtn"); if (sb) { const k = list.filter((s) => suggest(s).length).length; sb.textContent = k ? `Aceptar sugerencias (${k})` : "Aceptar sugerencias"; sb.disabled = !k; }
}
// Etiquetas pegadas desde una planilla (Excel o Sheets): una canción por línea, con el título y la etiqueta.
const fold_ = (t) => plain(t).replace(/^\s*\d{1,3}\s*[.)-]\s*/, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const ALIAS = {
  entrada: "entrada", "canto de entrada": "entrada", perdon: "perdon", "acto penitencial": "perdon", piedad: "perdon", gloria: "gloria", salmo: "salmo",
  aleluya: "aleluya", aclamacion: "aclamacion", "aclamacion al evangelio": "aclamacion", ofertorio: "ofertorio", ofrendas: "ofertorio", ofrenda: "ofertorio",
  santo: "santo", "padre nuestro": "padrenuestro", padrenuestro: "padrenuestro", paz: "paz", cordero: "cordero", "cordero de dios": "cordero",
  comunion: "comunion", meditacion: "meditacion", "accion de gracias": "accion", gracias: "accion", maria: "maria", marianos: "maria", mariano: "maria", mariana: "maria", marianas: "maria",
  salida: "salida", envio: "salida", "salida y envio": "salida", adoracion: "adoracion", "espiritu santo": "espiritu", espiritu: "espiritu", navidad: "navidad", adviento: "navidad",
  juvenil: "juvenil", animacion: "juvenil", "juvenil y animacion": "juvenil",
};
let pasteRes = null;
function pasteDialog() {
  pasteRes = null;
  const d = dialog("canPasteDlg");
  d.innerHTML = `<form method="dialog" id="clsPasteForm">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Clasificar</span><h2>Pegar etiquetas desde una planilla</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <p class="small">Copia las filas de tu planilla y pégalas aquí. Cada fila necesita el <b>título</b> y, en la última columna, la <b>etiqueta</b> (puedes poner dos separadas por coma). Las filas sin etiqueta no se tocan.</p>
      <textarea class="textarea can-ta" id="clsPasteText" rows="10" placeholder="N°&#9;Título&#9;Fuente&#9;Etiqueta&#10;4&#9;Abre tu jardín&#9;…&#9;Entrada"></textarea>
      <label class="chip" style="align-self:flex-start"><input type="checkbox" id="clsPasteRepl" checked> Reemplazar las etiquetas que ya tenían</label>
      <button type="button" class="btn btn-soft" data-action="clsPasteCheck">${icon("eye")} Revisar</button>
      <div id="clsPastePrev"></div>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button>
      <button class="btn btn-primary" type="submit" id="clsPasteOk" disabled>Aplicar</button></div>
  </form>`;
  d.showModal();
}
function pasteParse(text) {
  const byTitle = new Map(editable().map((s) => [fold_(s.title), s]));
  const builtin = new Set(ORIGINALES.map((s) => fold_(s.title)));
  const res = { ok: [], notFound: [], unknown: new Set(), builtin: [] };
  String(text || "").replace(/\r/g, "").split("\n").forEach((line) => {
    let cols = line.split("\t").map((c) => c.trim());
    if (cols.length < 2) return;
    if (/^\d{1,4}$/.test(cols[0])) cols = cols.slice(1);
    const title = cols[0];
    let label = cols.length > 1 ? cols[cols.length - 1] : "";
    if (/^(cancionero|original|fuente|etiqueta)/i.test(fold_(label))) label = ""; // era la columna «Fuente» (la etiqueta quedó vacía)
    if (!title || !label || /^t[ií]tulo$/i.test(title)) return;
    const keys = [];
    label.split(/[,;/]| y (?!gracias|env)/i).map((x) => fold_(x)).filter(Boolean).forEach((x) => { const k = ALIAS[x]; if (k && k in MLABEL) keys.push(k); else res.unknown.add(x); });
    if (!keys.length) return;
    const t = fold_(title);
    if (builtin.has(t)) { res.builtin.push(title); return; }
    const s = byTitle.get(t);
    if (!s) { res.notFound.push(title); return; }
    res.ok.push({ s, keys });
  });
  return res;
}
function pastePreview() {
  const box = document.getElementById("clsPastePrev"); if (!box) return;
  pasteRes = pasteParse(document.getElementById("clsPasteText")?.value || "");
  const r = pasteRes, ok = document.getElementById("clsPasteOk");
  box.innerHTML = `<div class="note small"><b>${r.ok.length} canci${r.ok.length === 1 ? "ón" : "ones"}</b> recibirán su etiqueta.${r.notFound.length ? `<br>No encontré ${r.notFound.length} en el cancionero: ${r.notFound.map(esc).join(", ")}.` : ""}${r.builtin.length ? `<br>Las originales de Ágape (${r.builtin.map(esc).join(", ")}) ya traen sus etiquetas y no se cambian aquí.` : ""}${r.unknown.size ? `<br>No reconozco estas etiquetas: ${[...r.unknown].map(esc).join(", ")}.` : ""}</div>`;
  if (ok) ok.disabled = !r.ok.length;
}
function pasteApply() {
  if (!pasteRes || !pasteRes.ok.length) return;
  const repl = document.getElementById("clsPasteRepl")?.checked;
  pasteRes.ok.forEach(({ s, keys }) => setMoms(s, repl ? keys : [...momsOf(s), ...keys]));
  const n = pasteRes.ok.length;
  document.getElementById("canPasteDlg")?.close();
  clsF = "todas"; const f = $("#clsFilter"); if (f) f.value = "todas";
  paintCls();
  toast(`Listo: ${n} canciones etiquetadas. Revisa y toca «Guardar cambios».`);
}
async function clsSave() {
  const list = pending(); if (!list.length) return;
  const btn = $("#clsSave"); if (btn) { btn.disabled = true; btn.dataset.busy = "1"; }
  let ok = 0;
  for (const s of list) {
    if (btn) btn.textContent = `Guardando ${ok + 1} de ${list.length}…`;
    try {
      await ctx.cloud.saveCancion(s.id, { title: s.title, author: s.author || "", momentos: draft.get(s.id), body: s.body || "", link: s.link || "" });
      draft.delete(s.id); ok++;
    } catch (err) { console.warn(err); }
  }
  if (btn) delete btn.dataset.busy;
  toast(ok === list.length ? `${ok} canci${ok > 1 ? "ones clasificadas" : "ón clasificada"}` : `Se guardaron ${ok} de ${list.length}. Revisa tu conexión y vuelve a intentarlo.`, ok ? "ok" : "");
  paintCls();
}

// ---------------------------------------------------------------------------
// Hoja de cantos para la misa: tamaño carta, frente y reverso, la letra se ajusta sola
// ---------------------------------------------------------------------------
const HK = "agape_hoja";
let hoja = null, hojaFs = 0, hojaFit = true;
function hojaOpts() { let o = {}; try { o = JSON.parse(localStorage.getItem(HK) || "{}"); } catch {} return { chords: false, cols: 2, sides: 2, labels: true, ...o }; }
const saveHojaOpts = () => { try { localStorage.setItem(HK, JSON.stringify({ chords: hoja.chords, cols: hoja.cols, sides: hoja.sides, labels: hoja.labels })); } catch {} };
export function viewHoja(misaId) {
  hoja = { misa: misaId || "", name: "", date: "", picks: {}, ...hojaOpts(), loaded: false };
  ctx.onAfterRender(() => { repaint = paintHoja; watchAll(); paintHoja(); });
  return `${gate()}<div id="canHoja"><p class="muted" style="padding:30px;text-align:center">Cargando…</p></div>`;
}
function hojaLoad() {
  if (hoja.loaded) return true;
  if (hoja.misa) {
    if (misas === null) return false;
    const r = misas.find((x) => x.id === hoja.misa);
    if (r) { hoja.name = r.name || ""; hoja.date = r.date || ""; (r.slots || []).forEach((x) => { if (x.id) hoja.picks[x.m] = x.id; }); }
  }
  if (!hoja.name) hoja.name = "Misa juvenil";
  hoja.loaded = true; return true;
}
function paintHoja() {
  const box = $("#canHoja"); if (!box || !hoja) return;
  if (st().ready && (songs === null || !hojaLoad())) return;
  if (!hoja.loaded) hojaLoad();
  const list = all();
  const opts = (slot) => {
    const m = fitLabel(slot), cur_ = hoja.picks[slot] || "";
    const fit = list.filter((s) => fitsSlot(s, slot)), rest = list.filter((s) => !fitsSlot(s, slot));
    const o = (s) => `<option value="${esc(s.id)}" ${cur_ === s.id ? "selected" : ""}>${esc(s.title)}</option>`;
    return `<option value="">—</option>${fit.length ? `<optgroup label="Para ${esc(m)}">${fit.map(o).join("")}</optgroup>` : ""}<optgroup label="${fit.length ? "Otras" : "Todas"}">${rest.map(o).join("")}</optgroup>`;
  };
  const r = hoja.misa && (misas || []).find((x) => x.id === hoja.misa);
  box.innerHTML = `
  <nav class="crumbs no-print"><a href="#/cancionero">Cancionero</a>${r ? `${icon("right")}<a href="#/cancionero/misa/${encodeURIComponent(r.id)}">${esc(r.name)}</a>` : ""}${icon("right")}<span>Hoja de cantos</span></nav>
  <header class="can-head"><span class="eyebrow">Para imprimir</span><h1>Hoja de cantos</h1>
    <p class="muted">Elige los cantos de cada momento. La hoja se arma sola en tamaño carta y la letra se ajusta para que todo quepa.</p></header>
  <div class="hc-wrap">
    <form class="card hc-ed stack" id="hcForm" style="--gap:12px" onsubmit="return false">
      <div class="field"><label>Celebración</label><input class="input" name="name" maxlength="120" value="${esc(hoja.name)}"></div>
      <div class="field"><label>Fecha</label><input class="input" type="date" name="date" value="${esc(hoja.date)}"></div>
      <div class="hc-slots">${SLOTS.map((k) => `<div class="field"><label>${esc(slotLabel(k))}</label><select class="select" name="s_${k}">${opts(k)}</select></div>`).join("")}</div>
      <fieldset class="p-dates"><legend>Cómo se ve</legend><div class="can-opts">
        <label class="chip"><input type="checkbox" name="chords" ${hoja.chords ? "checked" : ""}> Con acordes</label>
        <label class="chip"><input type="checkbox" name="labels" ${hoja.labels ? "checked" : ""}> Nombre del momento</label>
        <label class="chip"><input type="radio" name="sides" value="2" ${hoja.sides === 2 ? "checked" : ""}> Frente y reverso</label>
        <label class="chip"><input type="radio" name="sides" value="1" ${hoja.sides === 1 ? "checked" : ""}> Una cara</label>
        <label class="chip"><input type="radio" name="cols" value="2" ${hoja.cols === 2 ? "checked" : ""}> 2 columnas</label>
        <label class="chip"><input type="radio" name="cols" value="3" ${hoja.cols === 3 ? "checked" : ""}> 3 columnas</label>
      </div></fieldset>
      <div class="row-wrap">
        <button type="button" class="btn btn-primary" data-action="hcPrint">${icon("print")} Imprimir o guardar PDF</button>
        ${canEdit() ? `<button type="button" class="btn btn-soft" data-action="hcSave">${icon("check")} ${r ? "Actualizar la celebración" : "Guardar como celebración"}</button>` : ""}
      </div>
      <p class="xs muted">Al imprimir, elige papel <b>Carta</b>, escala <b>100 %</b> (o «Tamaño real») e <b>imprimir en ambas caras</b>.</p>
    </form>
    <div class="hc-prev"><p class="small" id="hcInfo" aria-live="polite"></p><div class="hc-stage" id="hcStage"></div></div>
  </div>`;
  hojaBuild();
}
function hojaRead() {
  const f = document.getElementById("hcForm"); if (!f) return;
  const d = new FormData(f);
  hoja.name = String(d.get("name") || "").trim(); hoja.date = String(d.get("date") || "");
  SLOTS.forEach((k) => { hoja.picks[k] = String(d.get("s_" + k) || ""); });
  hoja.chords = d.get("chords") === "on"; hoja.labels = d.get("labels") === "on";
  hoja.sides = +d.get("sides") || 2; hoja.cols = +d.get("cols") || 2;
  saveHojaOpts();
}
const hojaItems = () => SLOTS.filter((k) => hoja.picks[k] && byId(hoja.picks[k])).map((k) => ({ m: k, song: byId(hoja.picks[k]) }));
// Cada estrofa es un bloque que no se corta; el título va pegado a la primera.
function hojaBlocks(items) {
  const out = [];
  items.forEach((x) => {
    const parts = String(x.song.body || "").replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.replace(/^\n+|\n+$/g, "")).filter((b) => b.replace(/\[[^\]]*\]/g, "").trim() || hoja.chords);
    const head = `<div class="hc-h">${hoja.labels ? `<span class="hc-m">${esc(slotLabel(x.m))}</span>` : ""}<b>${esc(x.song.title)}</b></div>`;
    (parts.length ? parts : [""]).forEach((b, i) => {
      const el = document.createElement("div");
      // Las estrofas largas pueden seguir en la otra columna, para no dejar huecos grandes.
      el.className = "hc-b" + (i === 0 ? " hc-first" : "") + (b.split("\n").length > 9 ? " hc-long" : "");
      el.dataset.title = x.song.title;
      el.innerHTML = (i === 0 ? head : "") + songBody({ body: b }, prefs.shift[x.song.id] || 0, hoja.chords);
      out.push(el);
    });
  });
  return out;
}
function hojaDate() { return hoja.date ? new Date(hoja.date + "T12:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""; }
function hojaBuild() {
  const stage = $("#hcStage"); if (!stage) return;
  const items = hojaItems();
  const info = $("#hcInfo");
  stage.innerHTML = `<div class="hc-pages" style="--hc-cols:${hoja.cols}">
    <section class="hc-page hc-p1"><header class="hc-top"><img src="icons/logo-320.webp" alt="" width="60" height="60">
      <div><h1>${esc(hoja.name || "Hoja de cantos")}</h1><p>${esc([hojaDate(), "Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay"].filter(Boolean).join(" · "))}</p></div></header>
      <div class="hc-cols"><i class="hc-end"></i></div></section>
    ${hoja.sides === 2 ? `<section class="hc-page hc-p2"><div class="hc-cols"><i class="hc-end"></i></div><footer class="hc-foot">${esc(hoja.name || "")} · Pastoral Juvenil Ágape</footer></section>` : ""}
  </div>`;
  const pages = [...stage.querySelectorAll(".hc-cols")];
  if (!items.length) { if (info) info.textContent = "Elige al menos un canto para armar la hoja."; hojaScale(); return; }
  const blocks = hojaBlocks(items);
  const over = (c) => { const e = c.querySelector(".hc-end"), r = c.getBoundingClientRect(), q = e.getBoundingClientRect(); return q.left >= r.right - 2 || q.top > r.bottom + 1; };
  const root = stage.querySelector(".hc-pages");
  // Reparte los bloques en las caras con un tamaño de letra; true si todo cupo.
  const layout = (fs) => {
    root.style.setProperty("--hc-fs", fs + "pt");
    pages.forEach((c) => { c.querySelectorAll(".hc-b, .hc-cont").forEach((n) => n.remove()); });
    let i = 0;
    for (let p = 0; p < pages.length; p++) {
      const c = pages[p], end = c.querySelector(".hc-end");
      if (p > 0 && i < blocks.length && !blocks[i].classList.contains("hc-first")) {
        const ct = document.createElement("div"); ct.className = "hc-cont"; ct.textContent = blocks[i].dataset.title + " (continuación)"; c.insertBefore(ct, end);
      }
      for (; i < blocks.length; i++) {
        c.insertBefore(blocks[i], end);
        if (over(c)) { blocks[i].remove(); break; }
      }
    }
    return i >= blocks.length;
  };
  stage.classList.add("measuring");
  // Búsqueda binaria en cuartos de punto, entre 6,5 y 13 pt.
  let lo = 26, hi = 52, best = 0;
  if (layout(hi / 4)) best = hi;
  else if (layout(lo / 4)) {
    best = lo;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (layout(mid / 4)) { best = lo = mid; } else hi = mid; }
  }
  best /= 4;
  hojaFs = best || 6.5; hojaFit = !!best;
  layout(hojaFs);
  stage.classList.remove("measuring");
  if (info) info.innerHTML = hojaFit ? `${items.length} canto${items.length > 1 ? "s" : ""} · letra de <b>${String(hojaFs).replace(".", ",")} pt</b>${hojaFs < 8 ? " (chica: prueba con 3 columnas o sin acordes)" : ""}`
    : `<span class="can-dup">No cabe todo${hoja.sides === 1 ? " en una cara" : " en la hoja"}.</span> Quita algún canto, ${hoja.sides === 1 ? "usa frente y reverso, " : ""}usa 3 columnas o quita los acordes.`;
  hojaScale();
}
function hojaScale() {
  const stage = $("#hcStage"), pg = stage && stage.querySelector(".hc-pages"); if (!pg) return;
  const w = stage.clientWidth, pw = pg.querySelector(".hc-page").offsetWidth;
  const k = Math.min(1, (w - 4) / pw);
  pg.style.transform = `scale(${k})`;
  stage.style.height = Math.ceil(pg.offsetHeight * k) + "px";
}
function hojaPrint() {
  const src = document.querySelector("#hcStage .hc-pages"); if (!src) return;
  if (!hojaItems().length) { toast("Elige al menos un canto", ""); return; }
  let book = document.getElementById("hcBook");
  if (!book) { book = document.createElement("div"); book.id = "hcBook"; document.body.appendChild(book); }
  const cl = src.cloneNode(true); cl.style.transform = ""; cl.style.setProperty("--hc-fs", (hojaFs * 0.98).toFixed(2) + "pt");
  book.innerHTML = ""; book.appendChild(cl);
  document.body.classList.add("hc-printing");
  const done = () => { document.body.classList.remove("hc-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 200);
}
async function hojaSave() {
  hojaRead();
  const slots = SLOTS.map((k) => ({ m: k, id: hoja.picks[k] || "" })).filter((x) => x.id);
  if (!hoja.name) { toast("Ponle un nombre a la celebración", ""); return; }
  const r = hoja.misa && (misas || []).find((x) => x.id === hoja.misa);
  try {
    const id = await ctx.cloud.saveRepertorio(r ? r.id : null, { name: hoja.name, date: hoja.date, note: r ? r.note || "" : "", slots });
    toast("Celebración guardada", "ok");
    if (!r) { hoja.misa = id; history.replaceState(null, "", "#/cancionero/hoja?misa=" + encodeURIComponent(id)); }
  } catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
}

// ---------------------------------------------------------------------------
// Exportar: PDF (impresión sin cortar canciones), PowerPoint y texto
// ---------------------------------------------------------------------------
function exportSet(o) {
  if (o.misa) {
    const r = (misas || []).find((x) => x.id === o.misa);
    const items = r ? (r.slots || []).filter((x) => x.id && byId(x.id)).map((x) => ({ m: x.m, song: byId(x.id) })) : [];
    return { title: r ? r.name : "Celebración", sub: r && r.date ? new Date(r.date + "T12:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "", items, groups: null };
  }
  const order = Object.fromEntries(MOMENTOS.map(([k], i) => [k, i]));
  const firstM = (s) => known(s.momentos).sort((a, b) => order[a] - order[b])[0] || "zz";
  let list = all().filter((s) => !o.momento || (s.momentos || []).includes(o.momento));
  list.sort((a, b) => (order[o.momento || firstM(a)] ?? 99) - (order[o.momento || firstM(b)] ?? 99) || a.title.localeCompare(b.title, "es"));
  const items = list.map((song) => ({ m: o.momento || firstM(song), song }));
  items.forEach((x, i) => (x.n = i + 1));
  const groups = MOMENTOS.map(([k, l]) => ({ l, list: items.filter((x) => (x.song.momentos || []).includes(k)) })).filter((g) => g.list.length);
  const loose = items.filter((x) => !known(x.song.momentos).length);
  if (loose.length) groups.push({ l: "Otras", list: loose });
  return { title: o.momento ? `Cancionero Ágape · ${MLABEL[o.momento]}` : "Cancionero Ágape", mom: o.momento ? MLABEL[o.momento] : "", sub: "Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay", items, groups };
}
const shiftOf = (o, s) => (o.tono ? prefs.shift[s.id] || 0 : 0);

function exportDialog(misaId) {
  const d = dialog("canExpDlg");
  d.innerHTML = `<form method="dialog" id="canExpForm" data-misa="${esc(misaId || "")}">
    <div class="sheet-head"><div style="flex:1"><span class="eyebrow">Cancionero</span><h2>Exportar ${misaId ? "esta celebración" : "el cancionero"}</h2></div>
      <button type="button" class="icon-btn" data-action="canClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:14px">
      <fieldset class="p-dates"><legend>Formato</legend>
        <div class="can-fmt">
          <label class="card can-fmt-o"><input type="radio" name="fmt" value="pdf" checked><strong>PDF para imprimir</strong><span class="muted small">Con portada e índice. Cada canción queda entera en su página o columna.</span></label>
          <label class="card can-fmt-o"><input type="radio" name="fmt" value="pptx"><strong>PowerPoint</strong><span class="muted small">Una estrofa por diapositiva, letra grande, para proyectar o editar.</span></label>
          <label class="card can-fmt-o"><input type="radio" name="fmt" value="txt"><strong>Texto</strong><span class="muted small">Archivo .txt para editar en Word, Docs o el bloc de notas.</span></label>
        </div>
      </fieldset>
      ${misaId ? "" : `<div class="field"><label>Qué canciones</label><select class="select" name="momento"><option value="">Todo el cancionero</option>${MOMENTOS.map(([k, l]) => `<option value="${k}">Solo ${esc(l)}</option>`).join("")}</select></div>`}
      <div class="can-opts">
        <label class="chip"><input type="checkbox" name="chords" checked> Con acordes</label>
        <label class="chip"><input type="checkbox" name="tono" checked> En el tono que elegí</label>
        <label class="chip" data-only="pdf"><input type="checkbox" name="cols"> Dos columnas</label>
      </div>
      <p class="xs muted">PDF: en la ventana de impresión elige «Guardar como PDF». Las canciones largas que no caben en una página siguen en la siguiente. En PowerPoint no van los acordes.</p>
    </div>
    <div class="sheet-foot"><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="canClose">Cancelar</button><button class="btn btn-primary" type="submit">${icon("dl")} Exportar</button></div>
  </form>`;
  d.showModal();
}

function exportPDF(set, o) {
  let book = document.getElementById("canBook");
  if (!book) { book = document.createElement("div"); book.id = "canBook"; document.body.appendChild(book); }
  book.className = `can-book${o.cols ? " cols-2" : ""}`;
  const today = new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  const head = (x, i) => `<header class="cb-head"><span class="cb-n">${x.n || i + 1}</span><div><h2>${esc(x.song.title)}</h2>
      <span class="cb-meta">${[set.groups ? "" : slotLabel(x.m), x.song.author || "", o.chords ? "Tono " + chordName(firstChord(x.song.body), shiftOf(o, x.song), prefs.nota) : ""].filter(Boolean).map(esc).join(" · ")}</span></div></header>`;
  book.innerHTML = `
    <section class="cb-cover">${set.groups
      ? coverHtml({ ed: set.mom ? `Versión 1 · ${set.mom}` : "Versión 1", n: `Edición ${today} · ${set.items.length} ${set.items.length === 1 ? "canción" : "canciones"}` })
      : coverHtml({ k: "Cancionero Ágape", t1: set.title, t2: "", ed: "", n: set.sub })}</section>
    ${set.groups ? `<section class="cb-index"><h2>Índice</h2>${set.groups.map((g) => `<div class="cb-ig"><h3>${esc(g.l)}</h3><ol>${g.list.map((x) => `<li><b>${x.n}</b> ${esc(x.song.title)}</li>`).join("")}</ol></div>`).join("")}</section>`
      : `<section class="cb-index"><h2>Orden de la celebración</h2><ol class="cb-order">${set.items.map((x, i) => `<li><b>${esc(slotLabel(x.m))}</b> ${esc(x.song.title)}</li>`).join("")}</ol></section>`}
    <section class="cb-songs">${set.items.map((x, i) => `<article class="cb-song">${head(x, i)}<div class="can-sheet cb-body">${songBody(x.song, shiftOf(o, x.song), o.chords)}</div></article>`).join("")}</section>`;
  document.body.classList.add("can-printing");
  const done = () => { document.body.classList.remove("can-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 300);
}

function chordOverLyric(ln, shift) {
  const parts = ln.split(/\[([^\]]+)\]/);
  let text = parts[0], ch = "";
  for (let i = 1; i < parts.length; i += 2) {
    let pos = text.length;
    if (ch.length && ch.length >= pos) { pos = ch.length + 1; text = text.padEnd(pos); }
    ch = ch.padEnd(pos) + chordName(parts[i], shift, prefs.nota);
    text += parts[i + 1] || "";
  }
  return ch.trimEnd() + "\n" + text.trimEnd();
}
function exportTXT(set, o) {
  const out = [set.title.toUpperCase(), set.sub, ""];
  if (set.groups) {
    out.push("ÍNDICE");
    set.groups.forEach((g) => { out.push("", g.l + ":"); g.list.forEach((x) => out.push(`  ${String(x.n).padStart(3)}. ${x.song.title}`)); });
  } else set.items.forEach((x) => out.push(`${slotLabel(x.m)}: ${x.song.title}`));
  set.items.forEach((x, i) => {
    out.push("", "", "=".repeat(48), `${set.groups ? (x.n || i + 1) + ". " : slotLabel(x.m).toUpperCase() + " · "}${x.song.title}`);
    const meta = [x.song.author || "", o.chords ? "Tono " + chordName(firstChord(x.song.body), shiftOf(o, x.song), prefs.nota) : ""].filter(Boolean).join(" · ");
    if (meta) out.push(meta);
    out.push("=".repeat(48), "");
    String(x.song.body || "").split("\n").forEach((ln) => {
      out.push(o.chords && /\[/.test(ln) ? chordOverLyric(ln, shiftOf(o, x.song)) : ln.replace(/\[[^\]]*\]/g, ""));
    });
  });
  const blob = new Blob(["\ufeff" + out.join("\n").replace(/\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });
  save(blob, fileBase(set) + ".txt");
}
const fileBase = (set) => set.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cancionero";
function save(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
function loadPptx() {
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  return new Promise((res, rej) => {
    const sc = document.createElement("script"); sc.src = "js/vendor/pptxgen.bundle.js";
    sc.onload = () => res(window.PptxGenJS); sc.onerror = () => rej(new Error("No se pudo cargar PowerPoint"));
    document.head.appendChild(sc);
  });
}
async function exportPPTX(set) {
  toast("Preparando la presentación…");
  const P = await loadPptx();
  const pptx = new P();
  pptx.layout = "LAYOUT_WIDE"; pptx.title = set.title; pptx.company = "Pastoral Juvenil Ágape";
  const BG = "0B2566", CREAM = "FFF6E5", GOLD = "FFBA03";
  const cover = pptx.addSlide(); cover.background = { color: BG };
  cover.addText(set.title, { x: 0.6, y: 2.4, w: 12.1, h: 1.6, fontFace: "Arial", fontSize: 54, bold: true, color: CREAM, align: "center" });
  cover.addText(set.sub || "", { x: 0.6, y: 4.0, w: 12.1, h: 0.8, fontFace: "Arial", fontSize: 22, color: GOLD, align: "center" });
  set.items.forEach((x) => {
    stanzas(x.song).forEach((sl) => {
      const s = pptx.addSlide(); s.background = { color: BG };
      if (sl.title) {
        if (x.m && !set.groups) s.addText(slotLabel(x.m), { x: 0.6, y: 2.0, w: 12.1, h: 0.7, fontFace: "Arial", fontSize: 26, italic: true, color: GOLD, align: "center" });
        s.addText(sl.title, { x: 0.6, y: 2.7, w: 12.1, h: 1.6, fontFace: "Arial", fontSize: 54, bold: true, color: CREAM, align: "center", fit: "shrink" });
        if (sl.sub) s.addText(sl.sub, { x: 0.6, y: 4.3, w: 12.1, h: 0.6, fontFace: "Arial", fontSize: 18, color: CREAM, align: "center", transparency: 30 });
      } else {
        const n = sl.lines.length, size = n <= 4 ? 40 : n <= 6 ? 34 : n <= 8 ? 28 : 22;
        if (sl.label) s.addText(sl.label, { x: 0.6, y: 0.35, w: 12.1, h: 0.6, fontFace: "Arial", fontSize: 22, italic: true, color: GOLD, align: "center" });
        s.addText(sl.lines.join("\n"), { x: 0.6, y: 1.0, w: 12.1, h: 6.0, fontFace: "Arial", fontSize: size, bold: true, color: CREAM, align: "center", valign: "middle", lineSpacingMultiple: 1.15, fit: "shrink" });
        s.addText(x.song.title, { x: 0.6, y: 7.0, w: 12.1, h: 0.4, fontFace: "Arial", fontSize: 12, color: CREAM, align: "right", transparency: 50 });
      }
    });
  });
  await pptx.writeFile({ fileName: fileBase(set) + ".pptx" });
}

function registerActions() {
  const A = ctx.actions;
  A.canTab = (el) => { tab = el.dataset.t; ctx.render(); };
  A.canMomGo = (el) => {
    tab = "canciones"; momento = el.dataset.m; ctx.render();
    setTimeout(() => document.getElementById("canTop")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
  A.canMom = (el) => { momento = el.dataset.m; document.querySelectorAll("[data-action=canMom]").forEach((b) => b.classList.toggle("accent", b.dataset.m === momento)); paintList(); };
  A.canShift = (el) => { if (!cur) return; prefs.shift[cur.id] = ((prefs.shift[cur.id] || 0) + +el.dataset.d + 18) % 12 - 6 || 0; savePrefs(); paintSong(cur.id); };
  A.canNota = (el) => { prefs.nota = prefs.nota === "us" ? "lat" : "us"; savePrefs(); if ($("#canLibro")) { el.textContent = prefs.nota === "us" ? "Do Re Mi" : "C D E"; buildBook(); } else if (cur) paintSong(cur.id); };
  A.canChords = (el) => { prefs.chords = !prefs.chords; savePrefs(); if ($("#canLibro")) { el.classList.toggle("btn-soft", prefs.chords); el.classList.toggle("btn-ghost", !prefs.chords); el.setAttribute("aria-pressed", prefs.chords); buildBook(); } else if (cur) paintSong(cur.id); };
  A.canSize = (el) => { prefs.size = Math.min(1.8, Math.max(.8, Math.round((prefs.size + +el.dataset.d * .1) * 10) / 10)); savePrefs(); const s = $(".can-sheet") || $("#canLibro"); if (s) s.style.setProperty("--can-size", prefs.size); if ($("#canLibro")) buildBook(); };
  A.clTurn = (el) => turnPage(+el.dataset.d);
  A.clGo = (el) => goPage(+el.dataset.p);
  A.clIndex = () => goPage(book.ix);
  A.canProject = (el) => {
    if (el.dataset.scope === "misa") {
      const r = (misas || []).find((x) => x.id === el.dataset.id); if (!r) return;
      project((r.slots || []).filter((x) => x.id && byId(x.id)).map((x) => ({ m: x.m, song: byId(x.id) })));
    } else if (cur) project([{ song: cur }]);
  };
  A.canPrev = () => { si = Math.max(0, si - 1); paintProj(); };
  A.canNext = () => { si = Math.min(slides.length - 1, si + 1); paintProj(); };
  A.canProjClose = () => closeProj();
  A.canNew = () => songEditor(null);
  A.canImport = () => importDialog();
  A.canImpCheck = () => importPreview();
  A.canFix = () => {
    const ta = document.querySelector("#canForm textarea[name=body]"); if (!ta || !ta.value.trim()) { toast("Primero pega la canción en el cuadro de la letra", ""); return; }
    const before = ta.value, after = toInline(before);
    if (after === before.trim()) { toast("No encontré acordes arriba de la letra para acomodar"); return; }
    ta.value = after; toast("Acordes acomodados. Revisa que cada uno quedó en su sílaba.");
  };
  A.canEdit = (el) => songEditor(byId(el.dataset.id));
  A.canNewMisa = () => misaEditor(null);
  A.canEditMisa = (el) => misaEditor((misas || []).find((x) => x.id === el.dataset.id));
  A.canClose = () => { ["canDlg", "canMisaDlg", "canExpDlg", "canImpDlg", "canPasteDlg"].forEach((k) => document.getElementById(k)?.close()); };
  A.canExport = (el) => exportDialog(el.dataset.misa || "");
  A.canDel = async (el) => {
    if (!confirm("¿Borrar esta canción del cancionero?")) return;
    try { await ctx.cloud.deleteCancion(el.dataset.id); toast("Canción borrada"); location.hash = "#/cancionero"; } catch { toast("No se pudo borrar", ""); }
  };
  A.canDelMisa = async (el) => {
    if (!confirm("¿Borrar este repertorio?")) return;
    try { await ctx.cloud.deleteRepertorio(el.dataset.id); toast("Repertorio borrado"); location.hash = "#/cancionero"; } catch { toast("No se pudo borrar", ""); }
  };
  document.addEventListener("input", (e) => { if (e.target.id === "canSearch") { query = e.target.value; paintList(); } });
  A.clsTog = (el) => { const s = byId(el.dataset.id); if (!s) return; const m = momsOf(s), k = el.dataset.m; setMoms(s, m.includes(k) ? m.filter((x) => x !== k) : [...m, k]); paintCls(); };
  A.clsAdd = () => { const k = $("#clsMom")?.value; if (!sel.size) { toast("Primero marca algunas canciones", ""); return; } sel.forEach((id) => { const s = byId(id); if (s) setMoms(s, [...momsOf(s), k]); }); paintCls(); };
  A.clsDel = () => { const k = $("#clsMom")?.value; if (!sel.size) { toast("Primero marca algunas canciones", ""); return; } sel.forEach((id) => { const s = byId(id); if (s) setMoms(s, momsOf(s).filter((x) => x !== k)); }); paintCls(); };
  A.clsSugAll = () => { const l = clsVisible().filter((s) => suggest(s).length); if (!l.length) return; if (!confirm(`¿Agregar las sugerencias a ${l.length} canciones? Puedes revisarlas antes de guardar.`)) return; l.forEach((s) => setMoms(s, [...momsOf(s), ...suggest(s)])); paintCls(); };
  A.clsSave = () => clsSave();
  A.clsPaste = () => pasteDialog();
  A.clsPasteCheck = () => pastePreview();
  A.hcPrint = () => { hojaRead(); hojaBuild(); hojaPrint(); };
  A.hcSave = () => hojaSave();
  document.addEventListener("input", (e) => {
    if (e.target.id === "clsSearch") { clsQ = e.target.value; paintCls(); }
    if (e.target.closest && e.target.closest("#hcForm") && e.target.name === "name") { clearTimeout(hcT); hcT = setTimeout(() => { hojaRead(); hojaBuild(); }, 350); }
  });
  let hcT = 0;
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "clsFilter") { clsF = t.value; paintCls(); }
    else if (t.id === "clsAll") { clsVisible().forEach((s) => (t.checked ? sel.add(s.id) : sel.delete(s.id))); paintCls(); }
    else if (t.classList.contains("cls-pick")) { t.checked ? sel.add(t.dataset.id) : sel.delete(t.dataset.id); paintCls(); }
    else if (t.classList.contains("cls-add") && t.value) { const s = byId(t.dataset.id); if (s) setMoms(s, [...momsOf(s), t.value]); paintCls(); }
    else if (t.closest && t.closest("#hcForm")) { hojaRead(); hojaBuild(); }
  });
  window.addEventListener("resize", () => { if ($("#hcStage")) hojaScale(); if ($("#canLibro")) { clearTimeout(clRz); clRz = setTimeout(() => buildBook(), 200); } });
  let clRz = 0;
  document.fonts?.ready.then(() => { if ($("#canLibro")) buildBook(true); });
  document.addEventListener("keydown", (e) => {
    if (!document.getElementById("canProj")) {
      if (!$("#canLibro") || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || document.querySelector("dialog[open]")) return;
      if (["ArrowRight", "PageDown"].includes(e.key)) { e.preventDefault(); turnPage(1); }
      else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); turnPage(-1); }
      else if (e.key === "Home") { e.preventDefault(); goPage(book.ix); }
      return;
    }
    if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); A.canNext(); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); A.canPrev(); }
    else if (e.key === "Escape") closeProj();
  });
  let sx = null;
  document.addEventListener("touchstart", (e) => { if (document.getElementById("canProj")) sx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener("touchend", (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) (dx < 0 ? A.canNext : A.canPrev)(); sx = null; }, { passive: true });
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.getElementById("canProj")) { /* sigue abierto sin pantalla completa */ } });
  document.addEventListener("submit", async (e) => {
    if (e.target.id === "canExpForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      const o = { misa: e.target.dataset.misa || "", momento: String(f.get("momento") || ""), chords: f.get("chords") === "on", tono: f.get("tono") === "on", cols: f.get("cols") === "on" };
      const set = exportSet(o);
      if (!set.items.length) { toast("No hay canciones para exportar", ""); return; }
      document.getElementById("canExpDlg")?.close();
      const fmt = f.get("fmt");
      try {
        if (fmt === "pdf") exportPDF(set, o);
        else if (fmt === "txt") { exportTXT(set, o); toast("Texto descargado"); }
        else { await exportPPTX(set); toast("Presentación descargada"); }
      } catch (err) { console.warn(err); toast("No se pudo exportar. Revisa tu conexión.", ""); }
      return;
    }
    if (e.target.id === "canForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = { title: String(f.get("title") || "").trim(), author: String(f.get("author") || "").trim(), momentos: f.getAll("m").map(String),
        body: String(f.get("body") || "").replace(/\r/g, ""), link: String(f.get("link") || "").trim() };
      if (!data.title) return;
      const dupe = findDuplicate(data, all(), e.target.dataset.id || null);
      if (dupe && !confirm(`Parece que «${dupe.song.title}» ya está en el cancionero (tiene ${dupe.why}). ¿Guardar igual?`)) return;
      try { const id = await ctx.cloud.saveCancion(e.target.dataset.id || null, data); document.getElementById("canDlg")?.close(); toast("Canción guardada"); location.hash = "#/cancionero/" + encodeURIComponent(id); }
      catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
    }
    if (e.target.id === "clsPasteForm") { e.preventDefault(); pasteApply(); return; }
    if (e.target.id === "canImpForm") {
      e.preventDefault();
      const f = e.target, ok = [...f.querySelectorAll("input[name=imok]:checked")].map((x) => imp[+x.value]).filter(Boolean);
      if (!ok.length) { toast("No hay canciones marcadas para guardar", ""); return; }
      const author = String(f.querySelector("#canImpAuthor")?.value || "").trim(), momentos = [...f.querySelectorAll("input[name=im]:checked")].map((x) => x.value);
      const btn = document.getElementById("canImpSave"); btn.disabled = true;
      let n = 0, skip = 0;
      for (const x of ok) {
        btn.textContent = `Guardando ${n + skip + 1} de ${ok.length}…`;
        // Por si alguien más la subió mientras revisabas (la lista se actualiza sola).
        if (!x.dup && findDuplicate(x, all())) { skip++; continue; }
        try { await ctx.cloud.saveCancion(null, { title: x.title.slice(0, 120), author, momentos, body: x.body.slice(0, 20000), link: "" }); n++; }
        catch (err) { console.warn(err); }
      }
      document.getElementById("canImpDlg")?.close();
      if (skip) toast(`${skip} ya las había subido otra persona mientras revisabas; no se duplicaron.`);
      if (n + skip === ok.length && !n) { ctx.render(); return; }
      toast(n + skip === ok.length ? `${n} canci${n > 1 ? "ones guardadas" : "ón guardada"} en el cancionero` : `Se guardaron ${n} de ${ok.length - skip}. Revisa tu conexión y vuelve a intentar las que faltan.`, n ? "ok" : "");
      ctx.render();
      return;
    }
    if (e.target.id === "canMisaForm") {
      e.preventDefault();
      const f = new FormData(e.target);
      const data = { name: String(f.get("name") || "").trim(), date: String(f.get("date") || ""), note: String(f.get("note") || "").trim(),
        slots: SLOTS.map((k) => ({ m: k, id: String(f.get("s_" + k) || "") })).filter((x) => x.id) };
      if (!data.name) return;
      try { const id = await ctx.cloud.saveRepertorio(e.target.dataset.id || null, data); document.getElementById("canMisaDlg")?.close(); toast("Celebración guardada"); location.hash = "#/cancionero/misa/" + encodeURIComponent(id); }
      catch (err) { console.warn(err); toast("No se pudo guardar. Revisa tu conexión.", ""); }
    }
  });
}
