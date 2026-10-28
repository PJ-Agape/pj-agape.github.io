// Gestión → Apariencia: el equipo cambia fondos, stickers, textos y colores de cada zona de la app.
// Cada zona tiene su vista previa; «Guardar» la publica al instante (sin pasar por «Publicar»).
import { esc, icon, toast } from "./util.js";
import * as A from "./apariencia.js";

let ctx = null; // { actions, cloud, render }
let draft = {}; // zona → { fondo, sticker, textos, colores }
let open = "";
let pdraft = {}, pcur = "hoy"; // paneles: pantalla → { orden, p: { clave: { oculto, tam, ancho } } }
const clone = (o) => JSON.parse(JSON.stringify(o || {}));

export function setup(c) { ctx = c; registerActions(); }

export async function adminView() {
  await A.refresh(true).catch(() => {});
  draft = {}; pdraft = {};
  A.PANTALLAS.forEach((s) => { pdraft[s.id] = clone(A.panDe(s.id)); });
  A.ZONAS.forEach((z) => { draft[z.id] = clone(A.de(z.id)); });
  await Promise.all(A.ZONAS.filter((z) => (draft[z.id].fondo || {}).tipo === "foto").map(async (z) => { draft[z.id]._foto = await A.fotoDe(z.id, draft[z.id].fondo.v).catch(() => ""); }));
  const g = A.get().global || {};
  setTimeout(wireFrame, 60);
  return `<header class="page-head"><span class="eyebrow">Gestión · Comunicación</span><h1>Apariencia</h1>
    <p>Cambia el fondo, el sticker, los textos y los colores de cada parte de la app. Lo que no cambies queda como viene. Los cambios se ven al instante, sin «Publicar».</p></header>
  <div id="apAdmin" class="stack" style="--gap:12px">
    <section class="card ap-card">
      <h3>Toda la app</h3>
      <div class="ap-row"><label class="ap-lbl" for="apPaper">Color de fondo de la app</label>
        <input type="color" id="apPaper" value="${esc(g.paper || "#fff6e5")}">
        <button type="button" class="btn btn-sm btn-ghost" data-action="apPaperReset">Como viene</button>
        <button type="button" class="btn btn-sm btn-primary" data-action="apPaperSave">Guardar</button></div>
    </section>
    ${panelesHTML()}
    <h2 class="ap-h2">Cada parte, por dentro</h2>
    ${A.ZONAS.map(zonaHTML).join("")}
  </div>`;
}

// Orden y tamaño de los paneles de una pantalla, con la pantalla de verdad al lado.
// La lista se arma leyendo la pantalla que se ve en la vista previa: aparece todo lo que tiene.
let libSel = -1; // sticker suelto elegido
let pgrupos = null; // [{ n, items: [{ k, n, auto, fuera }] }] de la pantalla elegida
const gruposBase = (s) => [{ n: "", items: s.p.map(([k, n]) => ({ k, n })) }];
function leerFrame() {
  const fr = document.getElementById("apPanFrame"), s = A.pantalla(pcur);
  let v = null; try { v = fr && fr.contentDocument && fr.contentDocument.getElementById("view"); } catch {}
  if (!v || !v.children.length) return false;
  const g = A.descubrir(v, s).map((x) => ({ n: x.n, items: x.items.map((it) => ({ k: it.k, n: it.n, auto: !!it.auto, fuera: !it.el, real: it.el ? ((it.el.querySelector("h1, h2, h3") || {}).textContent || "").replace(/\s+/g, " ").trim().slice(0, 48) : "" })) }));
  if (JSON.stringify(g) === JSON.stringify(pgrupos)) return false;
  pgrupos = g; return true;
}
const grupos = () => pgrupos || gruposBase(A.pantalla(pcur));
function rowHTML(it, i, n, gi, d) {
  const k = it.k, nom = it.n, o = (d.p || {})[k] || {};
  const extra = !it.auto && it.real && it.real.toLowerCase() !== nom.toLowerCase() ? `<span class="xs muted ap-pan-real">«${esc(it.real)}»</span>` : "";
  return `<li class="ap-pan-it${o.oculto ? " is-off" : ""}${it.fuera ? " is-fuera" : ""}">
    <div class="ap-pan-top">
      <span class="ap-pan-n">${i + 1}</span><span class="ap-pan-nom"><b>${esc(nom)}</b>${extra}${it.fuera ? `<span class="xs muted">No aparece ahora en tu vista (otros sí pueden verlo).</span>` : ""}</span>
      <span class="ap-pan-mv">
        <button type="button" class="icon-btn" data-action="apPanMv" data-g="${gi}" data-k="${esc(k)}" data-d="-1" ${i ? "" : "disabled"} aria-label="Subir «${esc(nom)}»">${icon("up")}</button>
        <button type="button" class="icon-btn" data-action="apPanMv" data-g="${gi}" data-k="${esc(k)}" data-d="1" ${i < n - 1 ? "" : "disabled"} aria-label="Bajar «${esc(nom)}»">${icon("down")}</button>
        <button type="button" class="btn btn-sm ${o.oculto ? "btn-soft" : "btn-ghost"}" data-action="apPanOff" data-k="${esc(k)}" aria-pressed="${!!o.oculto}">${o.oculto ? "Mostrar" : "Ocultar"}</button>
      </span>
    </div>
    ${o.oculto ? `<p class="xs muted">Oculto: nadie lo ve en esta pantalla.</p>` : `
    <details class="ap-pan-more" ${o.sticker || o.tam || o.ancho ? "open" : ""}><summary class="small">Sticker y tamaño${o.sticker || o.tam || o.ancho ? ` <span class="chip accent">cambiado</span>` : ""}</summary>
    <div class="ap-pan-stk"><span class="ap-pan-stk-l">Sticker</span>
      ${o.sticker && o.sticker !== "ninguno" ? A.stkHTML(o.sticker, "ap-stk-mini") : `<span class="xs muted">${o.sticker ? "sin sticker" : "como viene"}</span>`}
      ${o.sticker ? `<button type="button" class="btn btn-sm btn-ghost" data-action="apPanStk" data-k="${esc(k)}" data-v="">Como viene</button>` : ""}
      ${o.sticker !== "ninguno" ? `<button type="button" class="btn btn-sm btn-ghost" data-action="apPanStk" data-k="${esc(k)}" data-v="ninguno">Quitar</button>` : ""}
    </div>
    ${pickHTML("apPanStk", `data-k="${esc(k)}"`, o.sticker)}
    <div class="ap-pan-sl">
      <label>Tamaño <output data-out="t:${esc(k)}">${o.tam || 100}%</output>
        <input type="range" min="70" max="130" step="5" value="${o.tam || 100}" data-appan="tam" data-k="${esc(k)}"></label>
      <label>Ancho <output data-out="a:${esc(k)}">${o.ancho || 100}%</output>
        <input type="range" min="40" max="100" step="5" value="${o.ancho || 100}" data-appan="ancho" data-k="${esc(k)}"></label>
    </div></details>`}
  </li>`;
}
function libresHTML(d) {
  const L = d.libres || [];
  return `<div class="ap-libs">
    <h4 class="ap-pan-gh">Stickers sueltos</h4>
    <p class="xs muted">Ponlos donde quieras: elige uno y arrástralo en la vista previa (puedes bajar dentro de ella). La esquina naranja lo agranda o lo achica.</p>
    ${L.length ? `<ol class="ap-lib-list">${L.map((it, i) => `<li class="ap-lib-it${i === libSel ? " on" : ""}">
      <button type="button" class="ap-lib-th" data-action="apLibSel" data-i="${i}" aria-label="Elegir este sticker">${A.stkHTML(it.v, "ap-stk-mini")}</button>
      <label>Tamaño <output data-libout="w:${i}">${it.w || 90}</output>
        <input type="range" min="36" max="320" step="2" value="${it.w || 90}" data-applib="w" data-i="${i}"></label>
      <label>Girar <output data-libout="r:${i}">${it.r || 0}°</output>
        <input type="range" min="-45" max="45" step="1" value="${it.r || 0}" data-applib="r" data-i="${i}"></label>
      <button type="button" class="btn btn-sm btn-ghost" data-action="apLibDel" data-i="${i}">Quitar</button>
    </li>`).join("")}</ol>` : ""}
    ${pickHTML("apLibAdd", "", "").replace("Elegir un sticker", "Agregar un sticker")}
  </div>`;
}
function colsHTML() {
  const d = pdraft[pcur] || {};
  return `${libresHTML(d)}
    ${pgrupos ? "" : `<p class="xs muted">Leyendo la pantalla…</p>`}
    ${grupos().map((g, gi) => {
      const map = new Map(g.items.map((x) => [x.k, x])), orden = A.ordenDe(g.items.map((x) => x.k), d).map((k) => map.get(k));
      return `<h4 class="ap-pan-gh">${esc(g.n || "Paneles de la pantalla")}</h4>
      <ol class="ap-pan-list">${orden.map((it, i) => rowHTML(it, i, orden.length, gi, d)).join("")}</ol>`;
    }).join("")}`;
}
function panelesHTML() {
  const s = A.pantalla(pcur), cambiada = !!(A.get().paneles || {})[pcur];
  return `<section class="card ap-card ap-pan" id="apPan">
    <h3>Orden y tamaño de los paneles</h3>
    <p class="small muted">Elige una pantalla y acomoda lo que tiene: súbelo, bájalo, ocúltalo, ponle o quítale el sticker y cambia su tamaño. En la vista previa ves cómo queda.</p>
    <div class="ap-row"><label class="ap-lbl" for="apPanSel">Pantalla</label>
      <select class="input" id="apPanSel" data-appan="sel">${A.PANTALLAS.map((x) => `<option value="${x.id}" ${x.id === pcur ? "selected" : ""}>${esc(x.n)}${(A.get().paneles || {})[x.id] ? " · cambiada" : ""}</option>`).join("")}</select></div>
    <div class="ap-pan-grid">
      <div class="ap-pan-cols" id="apPanCols">${colsHTML()}</div>
      <div class="ap-pan-prev">
        <div class="ap-pan-phone"><iframe id="apPanFrame" title="Vista previa de ${esc(s.n)}" src="index.html${s.ruta}" loading="lazy"></iframe></div>
        <a class="ap-ver small" href="${s.ruta}" target="_blank" rel="noopener">Abrir esta pantalla ${icon("arrowR")}</a>
      </div>
    </div>
    <div class="row-wrap ap-btns">
      <button type="button" class="btn btn-ghost btn-sm" data-action="apPanReset" ${cambiada ? "" : "disabled"}>Volver a como venía</button>
      <span class="spacer"></span>
      <button type="button" class="btn btn-primary" data-action="apPanSave">${icon("check")} Guardar</button>
    </div>
  </section>`;
}
// Solo se redibuja la lista: la vista previa no se toca (si se mueve, se recarga)
function panRepaint(full) {
  const box = document.getElementById("apPan"); if (!box) return;
  const fr = document.getElementById("apPanFrame"), cols = document.getElementById("apPanCols");
  const y = window.scrollY;
  if (!full && cols && fr && fr.dataset.ruta === A.pantalla(pcur).ruta) {
    cols.innerHTML = colsHTML();
    const rb = box.querySelector('[data-action="apPanReset"]'); if (rb) rb.disabled = !(A.get().paneles || {})[pcur];
  } else box.outerHTML = panelesHTML();
  window.scrollTo(0, y);
  wireFrame(); panPreview();
}
function wireFrame() {
  const fr = document.getElementById("apPanFrame"); if (!fr || fr.dataset.ruta) return;
  fr.dataset.ruta = A.pantalla(pcur).ruta;
  fr.addEventListener("load", () => { [500, 1500, 3000, 6000].forEach((t) => setTimeout(() => { panPreview(); if (leerFrame()) panRepaint(); }, t)); });
}
function panPreview() {
  const fr = document.getElementById("apPanFrame");
  try { fr && fr.contentWindow && fr.contentWindow.postMessage({ apPaneles: { id: pcur, d: pdraft[pcur] || {}, edit: true, sel: libSel } }, location.origin); } catch {}
}
const panSet = (k, patch) => {
  const d = pdraft[pcur] = pdraft[pcur] || {};
  d.p = d.p || {};
  const o = { ...(d.p[k] || {}), ...patch };
  Object.keys(o).forEach((x) => { if (!o[x] || ((x === "tam" || x === "ancho") && o[x] === 100)) delete o[x]; });
  if (Object.keys(o).length) d.p[k] = o; else delete d.p[k];
};

// Selector de stickers: se llena recién al abrirlo (son más de 200)
function pickHTML(action, attrs, cur) {
  return `<details class="ap-stk-det" data-pick="${action}" data-attrs="${esc(attrs)}" data-cur="${esc(cur || "")}"><summary class="small"><b>Elegir un sticker</b> <span class="xs muted">(${A.catalogo().reduce((n, [, l]) => n + l.length, 0)} para elegir)</span></summary><div class="ap-pick"></div></details>`;
}
function fillPick(det) {
  const box = det.querySelector(".ap-pick"); if (!det.open || !box || box.childElementCount) return;
  const { pick, attrs, cur } = det.dataset;
  box.innerHTML = A.catalogo().map(([g, l]) => `<h4 class="ap-pick-h">${esc(g)} <span class="xs muted">· ${l.length}</span></h4>
    <div class="ap-stks">${l.map((s) => `<button type="button" class="ap-stk${s === cur ? " on" : ""}" data-action="${pick}" ${attrs} data-v="${esc(s)}" aria-label="Elegir este sticker">${A.stkHTML(s, "")}</button>`).join("")}</div>`).join("");
}

function zonaHTML(z) {
  const d = draft[z.id];
  const cambios = ["fondo", "sticker", "textos", "colores"].filter((k) => d[k] && Object.keys(d[k] || {}).length !== 0 || (k === "sticker" && d.sticker)).length;
  return `<details class="card ap-card" data-zona="${z.id}" ${open === z.id ? "open" : ""}>
    <summary class="ap-sum"><b>${esc(z.n)}</b>${cambios ? `<span class="chip accent">Cambiada</span>` : ""}${icon("down")}</summary>
    <div class="ap-body">
      <div class="ap-prev" data-prev="${z.id}">${prevHTML(z)}</div>
      <a class="ap-ver small" href="${z.ruta}" target="_blank" rel="noopener">Ver esta pantalla ${icon("arrowR")}</a>
      ${fondoHTML(z)}
      ${stickerHTML(z)}
      ${textosHTML(z)}
      ${coloresHTML(z)}
      <div class="row-wrap ap-btns">
        <button type="button" class="btn btn-ghost btn-sm" data-action="apReset" data-z="${z.id}">Volver a como venía</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-action="apSave" data-z="${z.id}">${icon("check")} Guardar</button>
      </div>
    </div>
  </details>`;
}

// Vista previa aproximada: el fondo, el sticker y los textos con sus colores
function prevHTML(z) {
  const d = draft[z.id], f = d.fondo || {}, c = d.colores || {};
  const img = f.tipo === "galeria" ? A.fondoUrl(f.k) : f.tipo === "foto" ? (d._foto || "") : !f.tipo && z.fondoDef ? A.fondoUrl(z.fondoDef) : "";
  const velo = f.velo != null ? f.velo : 40;
  const bg = c.bg || (z.plaza ? "#fde6d4" : "#fff6e5");
  const stk = d.sticker === "ninguno" ? "" : d.sticker || z.stk;
  const txt = (s) => { const t = (z.t || []).find((x) => x[0] === s); return t ? ((d.textos || {})[s] || t[2]) : ""; };
  const hand = (z.t || []).find((x) => /hand|eyebrow/.test(x[0]));
  const title = (z.t || []).find((x) => /h1|h2|cw-h/.test(x[0]));
  const desc = (z.t || []).find((x) => /\bp$/.test(x[0]));
  return `<div class="ap-pv${img ? " is-drag" : ""}" data-pvz="${z.id}" style="background:${esc(bg)};${img ? `--pv-img:url('${esc(/^data:/.test(img) ? img : new URL(img, location.href).href)}');--pv-velo:${velo / 100};--pv-pos:${esc(A.posDe(f) || (z.plaza ? "center bottom" : "center"))};--pv-zoom:${(f.zoom || 100) / 100}` : ""}">
      ${img ? `<span class="ap-pv-hint">Arrastra para mover</span>` : ""}
      ${img ? `<i class="ap-pv-img${z.plaza ? " is-top" : ""}"></i>` : ""}
      ${stk ? A.stkHTML(stk, `ap-pv-stk${z.plaza ? " is-mid" : ""}`) : ""}
      <div class="ap-pv-txt">
        ${hand ? `<span class="ap-pv-hand" style="${c.accent ? `color:${esc(c.accent)}` : ""}">${A.enfasis(txt(hand[0]))}</span>` : ""}
        ${title ? `<b class="ap-pv-t" style="${c.ink ? `color:${esc(c.ink)};` : ""}${c.accent ? `--pv-acc:${esc(c.accent)}` : ""}">${A.enfasis(txt(title[0]))}</b>` : ""}
        ${desc ? `<span class="ap-pv-d">${A.enfasis(txt(desc[0]))}</span>` : ""}
      </div></div>`;
}

function fondoHTML(z) {
  const f = draft[z.id].fondo || {};
  const opt = (v, label, inner, on) => `<button type="button" class="ap-fo${on ? " on" : ""}" data-action="apFondo" data-z="${z.id}" data-v="${v}" aria-pressed="${on}">${inner}<small>${esc(label)}</small></button>`;
  return `<fieldset class="ap-sec"><legend>Fondo</legend>
    <div class="ap-fondos">
      ${opt("", "Como viene", `<span class="ap-fo-x">${z.fondoDef ? `<img src="${A.fondoUrl(z.fondoDef)}" alt="">` : "—"}</span>`, !f.tipo)}
      ${opt("ninguno", "Sin fondo", `<span class="ap-fo-x">${icon("x")}</span>`, f.tipo === "ninguno")}
      ${A.FONDOS.map(([k, l]) => opt("g:" + k, l, `<img src="${A.fondoUrl(k)}" alt="" loading="lazy">`, f.tipo === "galeria" && f.k === k)).join("")}
      ${f.tipo === "foto" ? opt("foto", "Mi foto", `<span class="ap-fo-x">${icon("check")}</span>`, true) : ""}
    </div>
    <label class="btn btn-soft btn-sm ap-file">${icon("plus")} Subir una foto<input type="file" accept="image/*" data-apfile="${z.id}" hidden></label>
    ${f.tipo && f.tipo !== "ninguno" ? `
    <div class="ap-row"><label class="ap-lbl" for="apZoom-${z.id}">Tamaño de la imagen</label>
      <input type="range" id="apZoom-${z.id}" min="100" max="300" step="5" value="${f.zoom || 100}" data-ap="zoom" data-z="${z.id}"></div>
    <div class="ap-row"><label class="ap-lbl" for="apX-${z.id}">Mover a los lados</label>
      <input type="range" id="apX-${z.id}" min="0" max="100" step="1" value="${xy(f, z)[0]}" data-ap="x" data-z="${z.id}"></div>
    <div class="ap-row"><label class="ap-lbl" for="apY-${z.id}">Mover arriba o abajo</label>
      <input type="range" id="apY-${z.id}" min="0" max="100" step="1" value="${xy(f, z)[1]}" data-ap="y" data-z="${z.id}"></div>
    <div class="ap-row"><button type="button" class="btn btn-sm btn-soft" data-action="apCentrar" data-z="${z.id}">Centrar y tamaño original</button>
      <span class="xs muted">También puedes arrastrar la imagen en la vista previa.</span></div>
    ${z.plaza ? "" : `<div class="ap-row"><label class="ap-lbl" for="apVelo-${z.id}">Suavizar la imagen (para que se lean los textos)</label>
      <input type="range" id="apVelo-${z.id}" min="0" max="85" step="5" value="${f.velo != null ? f.velo : 40}" data-ap="velo" data-z="${z.id}"></div>`}` : ""}
  </fieldset>`;
}

// Posición actual en % (las guardadas como «arriba / centro / abajo» se traducen)
function xy(f, z) {
  if (f.x != null || f.y != null) return [f.x ?? 50, f.y ?? 50];
  const p = f.pos || (z.plaza ? "center bottom" : "center");
  return [50, /top/.test(p) ? 0 : /bottom/.test(p) ? 100 : 50];
}
function stickerHTML(z) {
  const d = draft[z.id], cur = d.sticker === "ninguno" ? "" : d.sticker || z.stk;
  return `<fieldset class="ap-sec"><legend>Sticker</legend>
    <div class="ap-row">${cur ? A.stkHTML(cur, "ap-stk-cur") : `<span class="muted small">Sin sticker</span>`}
      <button type="button" class="btn btn-sm btn-ghost" data-action="apStk" data-z="${z.id}" data-v="">Como viene</button>
      <button type="button" class="btn btn-sm btn-ghost" data-action="apStk" data-z="${z.id}" data-v="ninguno">Sin sticker</button></div>
    ${pickHTML("apStk", `data-z="${z.id}"`, cur)}
  </fieldset>`;
}

function textosHTML(z) {
  if (!(z.t || []).length) return "";
  const t = draft[z.id].textos || {};
  return `<fieldset class="ap-sec"><legend>Textos</legend>
    ${z.t.map(([s, l, def], i) => {
      const long = def.length > 60;
      const id = `apT-${z.id}-${i}`;
      return `<div class="field"><label for="${id}">${esc(l)}</label>${long
        ? `<textarea class="textarea" id="${id}" rows="2" maxlength="220" placeholder="${esc(def)}" data-ap="t" data-z="${z.id}" data-s="${esc(s)}">${esc(t[s] || "")}</textarea>`
        : `<input class="input" id="${id}" maxlength="80" placeholder="${esc(def)}" value="${esc(t[s] || "")}" data-ap="t" data-z="${z.id}" data-s="${esc(s)}">`}</div>`;
    }).join("")}
    <p class="xs muted">Vacío = el texto de siempre (en gris).</p>
  </fieldset>`;
}

function coloresHTML(z) {
  const c = draft[z.id].colores || {};
  const row = (k, l, def) => `<div class="ap-row"><label class="ap-lbl" for="apC-${z.id}-${k}">${l}</label>
      <input type="color" id="apC-${z.id}-${k}" value="${esc(c[k] || def)}" data-ap="c" data-k="${k}" data-z="${z.id}">
      ${c[k] ? `<button type="button" class="btn btn-sm btn-ghost" data-action="apCol" data-z="${z.id}" data-k="${k}">Como viene</button>` : `<span class="xs muted">como viene</span>`}</div>`;
  return `<fieldset class="ap-sec"><legend>Colores</legend>
    ${row("bg", "Fondo de la tarjeta", z.plaza ? "#fde6d4" : "#fff6e5")}
    ${row("ink", "Color del título", "#0b2566")}
    ${row("accent", "Color de la frase y lo destacado", "#ef591c")}
  </fieldset>`;
}

function repaint(id) {
  const z = A.zona(id), box = document.querySelector(`details[data-zona="${id}"]`); if (!z || !box) return;
  open = id;
  const y = window.scrollY;
  box.outerHTML = zonaHTML(z);
  window.scrollTo(0, y);
}
function prevOnly(id) {
  const z = A.zona(id), p = document.querySelector(`[data-prev="${id}"]`); if (z && p) p.innerHTML = prevHTML(z);
}

// Foto: se achica en el teléfono (máx. 1600 px de ancho) antes de subirla
async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const sc = Math.min(1, 1600 / img.width), w = Math.round(img.width * sc), h = Math.round(img.height * sc);
    const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
    let q = 0.82, out = c.toDataURL("image/jpeg", q);
    while (out.length > 700000 && q > 0.4) { q -= 0.08; out = c.toDataURL("image/jpeg", q); }
    return out;
  } finally { URL.revokeObjectURL(url); }
}

let wired = false;
function registerActions() {
  const X = ctx.actions;
  X.apFondo = (el) => {
    const d = draft[el.dataset.z], v = el.dataset.v, old = d.fondo || {};
    if (!v) delete d.fondo;
    else if (v === "ninguno") d.fondo = { tipo: "ninguno" };
    else if (v === "foto") d.fondo = { ...old, tipo: "foto" };
    else d.fondo = { tipo: "galeria", k: v.slice(2), pos: old.pos, velo: old.velo };
    repaint(el.dataset.z);
  };
  X.apStk = (el) => { const d = draft[el.dataset.z]; if (el.dataset.v) d.sticker = el.dataset.v; else delete d.sticker; repaint(el.dataset.z); };
  X.apCentrar = (el) => { const d = draft[el.dataset.z]; d.fondo = { ...(d.fondo || {}), x: 50, y: 50, zoom: 100 }; delete d.fondo.pos; repaint(el.dataset.z); };
  X.apCol = (el) => { const d = draft[el.dataset.z]; if (d.colores) delete d.colores[el.dataset.k]; repaint(el.dataset.z); };
  X.apReset = (el) => { if (!confirm("¿Volver esta parte a como venía? Se borran sus cambios.")) return; draft[el.dataset.z] = {}; save(el.dataset.z); };
  X.apSave = (el) => save(el.dataset.z, el);
  X.apPaperReset = async () => { const c = clone(A.get()); c.global = { ...(c.global || {}) }; delete c.global.paper; await persist(c); toast("El fondo de la app volvió a como venía"); ctx.render(); };
  X.apPaperSave = async () => { const v = document.getElementById("apPaper")?.value; const c = clone(A.get()); c.global = { ...(c.global || {}), paper: v }; await persist(c); toast("Fondo de la app guardado", "ok"); };
  X.apPanMv = (el) => {
    const d = pdraft[pcur] = pdraft[pcur] || {}, gs = grupos();
    const ords = gs.map((g) => A.ordenDe(g.items.map((x) => x.k), d));
    const o = ords[+el.dataset.g] || [], i = o.indexOf(el.dataset.k), j = i + +el.dataset.d;
    if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    // Se conserva el orden guardado de lo que no está en esta vista (paneles que ven otros)
    const todos = ords.flat(), resto = (d.orden || []).filter((k) => !todos.includes(k));
    d.orden = [...todos, ...resto]; panRepaint();
  };
  X.apLibAdd = (el) => {
    const d = pdraft[pcur] = pdraft[pcur] || {};
    d.libres = [...(d.libres || []), { v: el.dataset.v, w: 96, r: 6 }];
    libSel = d.libres.length - 1; panRepaint();
    toast("Listo: arrástralo en la vista previa hasta donde quieras.", "ok", 3500);
  };
  X.apLibSel = (el) => { libSel = +el.dataset.i; panRepaint(); };
  X.apLibDel = (el) => { const d = pdraft[pcur] || {}; (d.libres || []).splice(+el.dataset.i, 1); libSel = -1; panRepaint(); };
  X.apPanStk = (el) => {
    panSet(el.dataset.k, { sticker: el.dataset.v }); panRepaint();
    if (!el.dataset.v) { const fr = document.getElementById("apPanFrame"); if (fr) fr.src = fr.src; } // «como viene»: la vista previa vuelve a cargar
  };
  X.apPanOff = (el) => { const o = ((pdraft[pcur] || {}).p || {})[el.dataset.k] || {}; panSet(el.dataset.k, { oculto: !o.oculto }); panRepaint(); };
  X.apPanReset = async () => {
    if (!confirm("¿Volver los paneles de esta pantalla a como venían?")) return;
    const c = clone(A.get()); c.paneles = { ...(c.paneles || {}) }; delete c.paneles[pcur];
    pdraft[pcur] = {};
    if (await persist(c)) { toast("Listo: la pantalla quedó como venía.", "ok"); const fr = document.getElementById("apPanFrame"); if (fr) { fr.removeAttribute("data-ruta"); } panRepaint(); const f2 = document.getElementById("apPanFrame"); if (f2) f2.src = f2.src; }
  };
  X.apPanSave = async (el) => {
    el.disabled = true;
    const c = clone(A.get()); c.paneles = { ...(c.paneles || {}) };
    const d = clone(pdraft[pcur] || {});
    if (d.libres) { d.libres = d.libres.filter((x) => x.v && x.k); if (!d.libres.length) delete d.libres; }
    if (d.p && !Object.keys(d.p).length) delete d.p;
    if (Object.keys(d).length) c.paneles[pcur] = d; else delete c.paneles[pcur];
    if (await persist(c)) { toast("Guardado. Ya se ve en la app.", "ok"); panRepaint(); }
    el.disabled = false;
  };
  if (wired) return; wired = true;
  // Lo que se hace en la vista previa (mover, agrandar, elegir un sticker suelto) vuelve al borrador
  window.addEventListener("message", (e) => {
    const fr = document.getElementById("apPanFrame");
    if (e.origin !== location.origin || !fr || e.source !== fr.contentWindow || !e.data || !e.data.apLib) return;
    const m = e.data.apLib, it = ((pdraft[pcur] || {}).libres || [])[m.i]; if (!it) return;
    if (m.t === "mover") Object.assign(it, { k: m.k, x: m.x, y: m.y });
    if (m.t === "tam") it.w = m.w;
    libSel = m.i;
    const cols = document.getElementById("apPanCols"); if (cols) { const y = scrollY; cols.innerHTML = colsHTML(); scrollTo(0, y); }
  });
  document.addEventListener("toggle", (e) => { if (e.target.dataset && e.target.dataset.pick) fillPick(e.target); }, true);
  // Arrastrar la imagen en la vista previa: mueve el punto que queda centrado
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    const pv = e.target.closest && e.target.closest(".ap-pv.is-drag"); if (!pv) return;
    const id = pv.dataset.pvz, z = A.zona(id), f = (draft[id] || {}).fondo || {};
    const [x, y] = xy(f, z); const r = pv.getBoundingClientRect();
    drag = { id, pv, x0: e.clientX, y0: e.clientY, x, y, w: r.width, h: r.height, k: f.zoom ? f.zoom / 100 : 1 };
    pv.setPointerCapture(e.pointerId); e.preventDefault();
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const d = draft[drag.id]; const cl = (n) => Math.max(0, Math.min(100, Math.round(n)));
    // arrastrar hacia la derecha muestra más de la izquierda de la imagen
    const x = cl(drag.x - ((e.clientX - drag.x0) / drag.w) * 100 / drag.k), y = cl(drag.y - ((e.clientY - drag.y0) / drag.h) * 100 / drag.k);
    d.fondo = { ...(d.fondo || {}), x, y }; delete d.fondo.pos;
    drag.pv.style.setProperty("--pv-pos", `${x}% ${y}%`);
    const sx = document.getElementById(`apX-${drag.id}`), sy = document.getElementById(`apY-${drag.id}`); if (sx) sx.value = x; if (sy) sy.value = y;
  });
  document.addEventListener("pointerup", () => { drag = null; });
  document.addEventListener("pointercancel", () => { drag = null; });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.applib) {
      const it = ((pdraft[pcur] || {}).libres || [])[+t.dataset.i]; if (!it) return;
      it[t.dataset.applib] = +t.value; libSel = +t.dataset.i;
      const out = [...document.querySelectorAll("[data-libout]")].find((x) => x.dataset.libout === `${t.dataset.applib}:${t.dataset.i}`); if (out) out.textContent = t.value + (t.dataset.applib === "r" ? "°" : "");
      panPreview(); return;
    }
    if (t.dataset && (t.dataset.appan === "tam" || t.dataset.appan === "ancho")) {
      panSet(t.dataset.k, { [t.dataset.appan]: +t.value });
      const out = [...document.querySelectorAll("[data-out]")].find((x) => x.dataset.out === `${t.dataset.appan === "tam" ? "t" : "a"}:${t.dataset.k}`); if (out) out.textContent = t.value + "%";
      panPreview(); return;
    }
    if (!t.dataset || !t.dataset.ap || !draft[t.dataset.z]) return;
    const d = draft[t.dataset.z];
    if (t.dataset.ap === "t") { d.textos = d.textos || {}; if (t.value.trim()) d.textos[t.dataset.s] = t.value; else delete d.textos[t.dataset.s]; }
    if (t.dataset.ap === "c") { d.colores = d.colores || {}; d.colores[t.dataset.k] = t.value; }
    if (t.dataset.ap === "velo") { d.fondo = { ...(d.fondo || {}), velo: +t.value }; }
    if (t.dataset.ap === "zoom") { d.fondo = { ...(d.fondo || {}), zoom: +t.value }; }
    if (t.dataset.ap === "x" || t.dataset.ap === "y") { const z0 = A.zona(t.dataset.z), [x, y] = xy(d.fondo || {}, z0); d.fondo = { ...(d.fondo || {}), x, y, [t.dataset.ap]: +t.value }; delete d.fondo.pos; }
    prevOnly(t.dataset.z);
  });
  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.dataset && t.dataset.appan === "sel") { pcur = t.value; pgrupos = null; panRepaint(true); return; }
    if (t.dataset && t.dataset.ap === "c" && draft[t.dataset.z]) repaint(t.dataset.z);
    if (!t.dataset || !t.dataset.apfile || !t.files || !t.files[0]) return;
    const id = t.dataset.apfile;
    toast("Preparando la foto…");
    try {
      const src = await compress(t.files[0]);
      const v = Date.now();
      await ctx.cloud.saveFondoZona(id, { src, v });
      try { localStorage.setItem("agape_fondo_" + id, JSON.stringify({ v, src })); } catch {}
      draft[id].fondo = { ...(draft[id].fondo || {}), tipo: "foto", v };
      draft[id]._foto = src;
      repaint(id);
      toast("Foto lista. Toca «Guardar» para usarla.", "ok", 4000);
    } catch (err) { console.warn(err); toast("No se pudo subir la foto. Prueba con otra o revisa tu conexión.", ""); }
  });
}
async function persist(c) {
  try { await ctx.cloud.saveApariencia(c); A.setLocal(c); return true; }
  catch (e) { console.warn(e); toast(e && e.code === "permission-denied" ? "Falta publicar las reglas nuevas de Firebase (Apariencia)." : "No se pudo guardar. Revisa tu conexión.", "", 5000); return false; }
}
async function save(id, btn) {
  if (btn) btn.disabled = true;
  const c = clone(A.get());
  c.zonas = { ...(c.zonas || {}) };
  const d = clone(draft[id]); delete d._foto;
  ["textos", "colores"].forEach((k) => { if (d[k] && !Object.keys(d[k]).length) delete d[k]; });
  if (Object.keys(d).length) c.zonas[id] = d; else delete c.zonas[id];
  if (await persist(c)) { toast("Guardado. Ya se ve en la app.", "ok"); repaint(id); }
  if (btn) btn.disabled = false;
}
