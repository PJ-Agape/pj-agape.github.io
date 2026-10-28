// Gestión → Apariencia: el equipo cambia fondos, stickers, textos y colores de cada zona de la app.
// Cada zona tiene su vista previa; «Guardar» la publica al instante (sin pasar por «Publicar»).
import { esc, icon, toast } from "./util.js";
import * as A from "./apariencia.js";

let ctx = null; // { actions, cloud, render }
let draft = {}; // zona → { fondo, sticker, textos, colores }
let open = "";
const clone = (o) => JSON.parse(JSON.stringify(o || {}));

export function setup(c) { ctx = c; registerActions(); }

export async function adminView() {
  await A.refresh(true).catch(() => {});
  draft = {};
  A.ZONAS.forEach((z) => { draft[z.id] = clone(A.de(z.id)); });
  await Promise.all(A.ZONAS.filter((z) => (draft[z.id].fondo || {}).tipo === "foto").map(async (z) => { draft[z.id]._foto = await A.fotoDe(z.id, draft[z.id].fondo.v).catch(() => ""); }));
  const g = A.get().global || {};
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
    ${A.ZONAS.map(zonaHTML).join("")}
  </div>`;
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
  return `<div class="ap-pv" style="background:${esc(bg)};${img ? `--pv-img:url('${esc(/^data:/.test(img) ? img : new URL(img, location.href).href)}');--pv-velo:${velo / 100};--pv-pos:${esc(f.pos || (z.plaza ? "center bottom" : "center"))}` : ""}">
      ${img ? `<i class="ap-pv-img${z.plaza ? " is-top" : ""}"></i>` : ""}
      ${stk ? `<img class="ap-pv-stk${z.plaza ? " is-mid" : ""}" src="${esc(stk)}" alt="">` : ""}
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
    ${f.tipo && f.tipo !== "ninguno" ? `<div class="ap-row">
      <label class="ap-lbl" for="apPos-${z.id}">Mostrar de la imagen</label>
      <select class="select" id="apPos-${z.id}" data-ap="pos" data-z="${z.id}">${[["center top", "La parte de arriba"], ["center", "El centro"], ["center bottom", "La parte de abajo"]].map(([v, l]) => `<option value="${v}" ${(f.pos || (z.plaza ? "center bottom" : "center")) === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    ${z.plaza ? "" : `<div class="ap-row"><label class="ap-lbl" for="apVelo-${z.id}">Suavizar la imagen (para que se lean los textos)</label>
      <input type="range" id="apVelo-${z.id}" min="0" max="85" step="5" value="${f.velo != null ? f.velo : 40}" data-ap="velo" data-z="${z.id}"></div>`}` : ""}
  </fieldset>`;
}

function stickerHTML(z) {
  const d = draft[z.id], cur = d.sticker === "ninguno" ? "" : d.sticker || z.stk;
  return `<fieldset class="ap-sec"><legend>Sticker</legend>
    <div class="ap-row">${cur ? `<img class="ap-stk-cur" src="${esc(cur)}" alt="Sticker actual">` : `<span class="muted small">Sin sticker</span>`}
      <button type="button" class="btn btn-sm btn-ghost" data-action="apStk" data-z="${z.id}" data-v="">Como viene</button>
      ${z.stkSel ? "" : `<button type="button" class="btn btn-sm btn-ghost" data-action="apStk" data-z="${z.id}" data-v="ninguno">Sin sticker</button>`}</div>
    <details class="ap-stk-det"><summary class="small"><b>Elegir otro sticker</b></summary>
      <div class="ap-stks">${A.STICKERS.map((s) => `<button type="button" class="ap-stk${s === cur ? " on" : ""}" data-action="apStk" data-z="${z.id}" data-v="${esc(s)}" aria-label="Elegir este sticker"><img src="${esc(s)}" alt="" loading="lazy" decoding="async"></button>`).join("")}</div>
    </details>
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
  X.apCol = (el) => { const d = draft[el.dataset.z]; if (d.colores) delete d.colores[el.dataset.k]; repaint(el.dataset.z); };
  X.apReset = (el) => { if (!confirm("¿Volver esta parte a como venía? Se borran sus cambios.")) return; draft[el.dataset.z] = {}; save(el.dataset.z); };
  X.apSave = (el) => save(el.dataset.z, el);
  X.apPaperReset = async () => { const c = clone(A.get()); c.global = { ...(c.global || {}) }; delete c.global.paper; await persist(c); toast("El fondo de la app volvió a como venía"); ctx.render(); };
  X.apPaperSave = async () => { const v = document.getElementById("apPaper")?.value; const c = clone(A.get()); c.global = { ...(c.global || {}), paper: v }; await persist(c); toast("Fondo de la app guardado", "ok"); };
  if (wired) return; wired = true;
  document.addEventListener("input", (e) => {
    const t = e.target; if (!t.dataset || !t.dataset.ap || !draft[t.dataset.z]) return;
    const d = draft[t.dataset.z];
    if (t.dataset.ap === "t") { d.textos = d.textos || {}; if (t.value.trim()) d.textos[t.dataset.s] = t.value; else delete d.textos[t.dataset.s]; }
    if (t.dataset.ap === "c") { d.colores = d.colores || {}; d.colores[t.dataset.k] = t.value; }
    if (t.dataset.ap === "velo") { d.fondo = { ...(d.fondo || {}), velo: +t.value }; }
    if (t.dataset.ap === "pos") { d.fondo = { ...(d.fondo || {}), pos: t.value }; }
    prevOnly(t.dataset.z);
  });
  document.addEventListener("change", async (e) => {
    const t = e.target;
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
