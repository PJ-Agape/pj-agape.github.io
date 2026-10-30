// El librito de Oremus: las oraciones de la Capilla (las nuestras y las de siempre) como un libro
// para hojear en el teléfono y para imprimir en PDF, igual que el librito de los Salmos.
// Cada grupo empieza en una página nueva; las oraciones de un grupo siguen una tras otra.

import { esc, icon, toast } from "./util.js";
import { oremusLibro } from "./capilla.js";
import { createBook, splitByHeight } from "./libro.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, onAfterRender }
export function setup(c) { ctx = c; registerActions(); }

// Un dibujo para cada oración (las que no están aquí usan el del grupo).
const ILUS = {
  "Padre nuestro": "oracion", "Ave María": "anunciacion", "Gloria al Padre": "sal_cielo", "Credo": "biblia", "Ángel de Dios": "sal_alas",
  "Acto de Contrición": "corazonlimpio", "Alma de Cristo": "sagradocorazon", "Comunión espiritual": "eucaristia", "Coronilla de la Divina Misericordia": "jesus",
  "Acto de caridad": "amar", "El eterno reposo": "luz", "Rosario": "maria", "Salve Regina": "virgen", "Bajo tu amparo": "virgencarmen", "Acordaos": "virgen",
  "Ángelus": "trigo", "Regina Coeli": "flores", "Ven Santo Espíritu": "espiritu", "Oración por el Papa": "apostoles", "Oración a San José": "jose",
  "San Miguel Arcángel": "sanmiguel",
};
const ILUS_G = { "Nuestras oraciones": "comunidad", "Las de cada día": "oracion", "Con Jesús": "jesus", "Con María": "maria", "Al Espíritu Santo": "espiritu", "Por la Iglesia y los santos": "santos" };
const ilusDe = (o, g, cls) => illus(ILUS[o.t] || ILUS_G[g] || "oracion", cls);

const LS = "agape_oremus_libro";
let lsize = 1; try { lsize = +localStorage.getItem(LS + "_t") || 1; } catch {}
let book = null, lsig = "";

// Las líneas de una oración: V./R. destacados, «Oremos:» igual, y una línea vacía separa estrofas.
const linea = (l) => /^[VR]\. /.test(l) ? `<b class="ore-vr">${l[0]}.</b> ${esc(l.slice(3))}` : /^Oremos: /.test(l) ? `<b class="ore-vr">Oremos:</b> ${esc(l.slice(8))}` : esc(l);
const lineasHTML = (x) => String(x || "").split("\n").map((l) => l.trim()).map((l) => (l ? `<p class="sl-v">${linea(l)}</p>` : `<div class="sl-gap"></div>`));
const oraHead = (o, g) => `<div class="ore-ph">${ilusDe(o, g, "ore-il")}<h3>${esc(o.t)}</h3></div>`;
const grpHead = (g, cont) => `<header class="cl-head"><span class="eyebrow">Recemos juntos</span><h2>${esc(g)}${cont ? ` <span class="cl-cont-s">(continuación)</span>` : ""}</h2></header>`;

// La cruz con rayos de la portada (en el mismo trazo que la lira de los Salmos).
const CRUZ = `<svg class="sl-harp ore-cruz" viewBox="0 4 200 98" aria-hidden="true"><g class="sl-harp-s">${[...Array(12)].map((_, i) => {
  const a = (Math.PI * 2 * i) / 12, r1 = 30, r2 = i % 2 ? 40 : 46;
  return `<path d="M${(100 + Math.cos(a) * r1).toFixed(1)} ${(46 + Math.sin(a) * r1).toFixed(1)} L${(100 + Math.cos(a) * r2).toFixed(1)} ${(46 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join("")}</g>
  <g class="sl-harp-f"><path d="M100 14 V98 M80 40 H120"/></g></svg>`;
function portada(n, go) {
  const rays = [...Array(24)].map((_, i) => { const a = (Math.PI * 2 * i) / 24, r1 = 58, r2 = i % 2 ? 78 : 92;
    return `<path d="M${(100 + Math.cos(a) * r1).toFixed(1)} ${(100 + Math.sin(a) * r1).toFixed(1)} L${(100 + Math.cos(a) * r2).toFixed(1)} ${(100 + Math.sin(a) * r2).toFixed(1)}"/>`; }).join("");
  return `<div class="cl-page cl-cover"><div class="cl-cov">
    <span class="cl-cov-spine" aria-hidden="true"></span>
    <span class="cl-cov-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="cl-cov-ribbon" aria-hidden="true"></span>
    <span class="cl-cov-k">Pastoral Juvenil Ágape · Yungay</span>
    <div class="cl-cov-medal"><svg class="cl-cov-rays" viewBox="0 0 200 200" aria-hidden="true">${rays}</svg><img src="icons/logo-320.webp" alt="" width="320" height="320"></div>
    <h2><span>Libro de oraciones</span><em>Recemos juntos</em>
      <svg class="cl-cov-swash" viewBox="0 0 220 24" aria-hidden="true"><path d="M6 16 C 60 4, 120 4, 214 12"/><path d="M40 20 C 90 12, 140 12, 196 18"/></svg></h2>
    ${CRUZ}
    <div class="cl-cov-foot">
      <p class="cl-cov-v">Nuestras oraciones y las de siempre</p>
      ${go ? `<button class="cl-cov-go" data-action="oreLGo" data-p="1">Abrir el índice ${icon("arrowR")}</button>` : ""}
      <p class="cl-cov-n">${n} oraciones</p>
    </div></div></div>`;
}
const pageOf = ({ cls = "", head = "", body = "", foot = "" }) => `<div class="cl-page ${cls}"><div class="cl-in">${head}<div class="cl-body">${body}</div></div>${foot ? `<div class="cl-foot">${foot}</div>` : ""}</div>`;
const footOf = (l, n, r = "") => `<span class="cl-f-l">${l}</span><span class="cl-f-n">${n}</span><span class="cl-f-r">${r}</span>`;

// ---------------------------------------------------------------------------
// Librito  (#/oremus/libro)
// ---------------------------------------------------------------------------
export function viewLibro() {
  ctx.onAfterRender(() => buildLibro());
  return `
  <nav class="crumbs no-print"><a href="#/oracion">Capilla</a>${icon("right")}<a href="#/oremus">Recemos juntos</a>${icon("right")}<span>Librito</span></nav>
  <div class="cl-bar" role="toolbar" aria-label="Opciones del libro">
    <button class="btn btn-sm btn-ghost" data-action="oreLGo" data-p="1">${icon("grid")} Índice</button>
    <span class="cl-nav"><button class="icon-btn ore-turn" data-action="oreLTurn" data-d="-1" aria-label="Página anterior">${icon("left")}</button>
      <span class="cl-pg" id="oreLPg" aria-live="polite"></span>
      <button class="icon-btn ore-turn" data-action="oreLTurn" data-d="1" aria-label="Página siguiente">${icon("right")}</button></span>
    <span class="spacer"></span>
    <span class="can-grp"><button class="icon-btn" data-action="oreLSize" data-d="-1" aria-label="Letra más chica">A−</button><button class="icon-btn" data-action="oreLSize" data-d="1" aria-label="Letra más grande">A+</button></span>
    <button class="btn btn-sm btn-ghost" data-action="oreLPdf">${icon("print")} PDF</button>
  </div>
  <div class="cl-wrap"><div class="cl-stage" id="oreLibroSt" style="--sl-size:${lsize}" aria-roledescription="libro"></div></div>
  <p class="xs muted cl-help">Desliza la página o toca sus bordes para avanzar. En el computador, usa las flechas del teclado.</p>`;
}
function buildLibro(force) {
  const stage = document.getElementById("oreLibroSt"); if (!stage) return;
  if (!book) book = createBook({ stage: "oreLibroSt", label: "oreLPg", key: LS, buttons: ".ore-turn" });
  if (book.busy) return;
  const grupos = oremusLibro();
  const total = grupos.reduce((n, [, xs]) => n + xs.length, 0);
  const sig = [stage.clientWidth, stage.clientHeight, lsize, grupos.map(([g, xs]) => g + xs.map((o) => o.t + o.x.length).join()).join("|")].join("/");
  if (!force && sig === lsig && book.pages.length) { book.show(book.at); return; }
  lsig = sig;
  const m = document.createElement("div"); m.className = "cl-leaf cl-measure"; stage.appendChild(m);
  const meas = (html) => { m.innerHTML = html; return m.querySelector(".cl-body"); };
  const soft = (el) => el.classList.contains("ore-ph") || el.classList.contains("sl-sub") || el.classList.contains("sl-gap");
  // Cada grupo: sus oraciones en un solo flujo que se reparte en páginas.
  const sp = [], first = new Map();
  for (const [g, xs] of grupos) {
    const kids = [], start = [];
    xs.forEach((o) => { start.push(kids.length); kids.push(oraHead(o, g)); if (o.note) kids.push(`<p class="sl-sub">${esc(o.note)}</p>`); kids.push(...lineasHTML(o.x)); kids.push(`<div class="ore-fin"></div>`); });
    const availNext = meas(pageOf({ cls: "sl-page ore-page", head: grpHead(g, true), foot: footOf("x", 0) })).clientHeight;
    const body = meas(pageOf({ cls: "sl-page ore-page", head: grpHead(g), body: kids.join(""), foot: footOf("x", 0) }));
    const parts = splitByHeight([...body.children], body.clientHeight - 16, availNext - 16, soft); // un margen por si el texto se reparte distinto
    xs.forEach((o, i) => first.set(g + "|" + o.t, sp.length + Math.max(0, parts.findIndex(([a, b]) => start[i] >= a && start[i] < b))));
    parts.forEach(([a, b], part) => sp.push({ g, part, html: kids.slice(a, b).join("") }));
  }
  // Índice, por grupos
  const ixRows = [];
  grupos.forEach(([g, xs]) => { ixRows.push({ g }); xs.forEach((o) => ixRows.push({ g, o })); });
  const ixRow = (r, p) => r.o ? `<button class="cl-ix" data-action="oreLGo" data-p="${p}"><span class="cl-ix-t">${esc(r.o.t)}</span><span class="cl-ix-d" aria-hidden="true"></span><span class="cl-ix-n">${p}</span></button>`
    : `<p class="ore-ixg">${esc(r.g)}</p>`;
  const ixHead = (cont) => `<header class="cl-head"><span class="eyebrow">Recemos juntos</span><h2>Índice${cont ? ` <span class="cl-cont-s">(continuación)</span>` : ""}</h2></header>`;
  const a2 = meas(pageOf({ cls: "cl-index", head: ixHead(true), foot: footOf("x", 0) })).clientHeight;
  const b1 = meas(pageOf({ cls: "cl-index", head: ixHead(false), body: ixRows.map((r) => ixRow(r, 888)).join(""), foot: footOf("x", 0) }));
  const ixParts = splitByHeight([...b1.children], b1.clientHeight, a2, (el) => el.classList.contains("ore-ixg"));
  m.remove();
  const off = 1 + ixParts.length, pages = [{ k: "cover", html: portada(total, true) }];
  ixParts.forEach(([a, b], i) => pages.push({ k: "ix" + i, html: pageOf({ cls: "cl-index", head: ixHead(i > 0),
    body: ixRows.slice(a, b).map((r) => ixRow(r, r.o ? off + first.get(r.g + "|" + r.o.t) : 0)).join(""), foot: footOf("", 1 + i) }) }));
  sp.forEach((p, i) => pages.push({ k: `g${i}`, html: pageOf({ cls: "sl-page ore-page", head: grpHead(p.g, p.part > 0), body: p.html,
    foot: footOf(`<button class="cl-f-ix" data-action="oreLGo" data-p="1">Índice</button>`, off + i) }) }));
  book.setPages(pages);
}

// PDF: portada, índice y las oraciones a dos columnas, en hoja carta (mismo diseño que los Salmos).
function pdf() {
  const grupos = oremusLibro();
  const total = grupos.reduce((n, [, xs]) => n + xs.length, 0);
  if (!total) { toast("Aún no hay oraciones", ""); return; }
  let el = document.getElementById("salBook");
  if (!el) { el = document.createElement("div"); el.id = "salBook"; document.body.appendChild(el); }
  el.innerHTML = `<section class="sb-cover">${portada(total, false)}</section>
    <section class="sb-index"><h2>Índice</h2>${grupos.map(([g, xs]) => `<p class="ore-ixg">${esc(g)}</p><ol>${xs.map((o) => `<li>${esc(o.t)}</li>`).join("")}</ol>`).join("")}</section>
    <section class="sb-salmos">${grupos.map(([g, xs]) => `<h2 class="ore-pg">${esc(g)}</h2>${xs.map((o) => `<article class="sb-s">
      <div class="sb-top"><header>${ilusDe(o, g, "sb-ilus")}<h3>${esc(o.t)}</h3></header>${o.note ? `<p class="sl-sub">${esc(o.note)}</p>` : ""}${lineasHTML(o.x).slice(0, 2).join("")}</div>
      ${lineasHTML(o.x).slice(2).join("")}</article>`).join("")}`).join("")}</section>
    <p class="sb-fuente">Pastoral Juvenil Ágape · Yungay. Oraciones de la tradición de la Iglesia (devocionario de Vatican News) y oraciones propias de la comunidad.</p>`;
  document.body.classList.add("sal-printing");
  const done = () => { document.body.classList.remove("sal-printing"); window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 300);
}

function registerActions() {
  const A = ctx.actions;
  A.oreLTurn = (el) => book && book.turn(+el.dataset.d);
  A.oreLGo = (el) => book && book.go(+el.dataset.p);
  A.oreLSize = (el) => {
    lsize = Math.min(1.6, Math.max(.8, Math.round((lsize + +el.dataset.d * .1) * 10) / 10)); try { localStorage.setItem(LS + "_t", lsize); } catch {}
    const s = document.getElementById("oreLibroSt"); if (s) s.style.setProperty("--sl-size", lsize); buildLibro(true);
  };
  A.oreLPdf = () => pdf();
  let rz = 0; window.addEventListener("resize", () => { if (document.getElementById("oreLibroSt")) { clearTimeout(rz); rz = setTimeout(() => buildLibro(), 200); } });
}
