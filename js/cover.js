// Portada de Inicio: una imagen fija con su texto encima. El equipo (administradores y coordinadores)
// la edita ahí mismo, con el botón «Editar portada»: la foto, cuánto se oscurece, el encuadre y los textos.
// Se guarda en content/portada (campo «cover»), junto a los destacados de Hoy.
import { esc, icon, toast } from "./util.js";

let ctx = null; // { actions, render, cloud }
export const DEF = {
  photo: "", dim: 45, y: 50,
  hand: "bienvenido a casa", title: "Amor que *transforma*",
  text: "Somos jóvenes que caminan juntos para encontrarse con Jesús. Aquí hay un lugar para ti.",
  btn: "Conoce quiénes somos", href: "#/preambulo",
};
const KEY = "agape_cover_v1";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { saved = {}; }
let draft = null; // lo que se está editando (vista previa en vivo)

const okPhoto = (p) => typeof p === "string" && /^data:image\/(jpeg|webp|png);base64,/.test(p) && p.length < 200000;
const okHref = (h) => /^(#\/|https:\/\/|presentaciones\/|familias\/)/.test(String(h || ""));
const num = (v, d, a, b) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
function clean(o) {
  const s = (k, max) => (typeof o[k] === "string" ? o[k].slice(0, max) : DEF[k]);
  return { photo: okPhoto(o.photo) ? o.photo : "", dim: num(o.dim, DEF.dim, 0, 90), y: num(o.y, DEF.y, 0, 100),
    hand: s("hand", 40), title: s("title", 60), text: s("text", 200), btn: s("btn", 40), href: okHref(o.href) ? o.href : DEF.href };
}
export const current = () => clean({ ...DEF, ...saved });
function adopt(v) {
  const next = v && typeof v === "object" ? v : {};
  const changed = JSON.stringify(next) !== JSON.stringify(saved);
  saved = next;
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* sin espacio: se pide de nuevo la próxima vez */ }
  return changed;
}
export function refresh(repaint) {
  ctx?.cloud.getCover?.().then((v) => { if (v && adopt(v) && repaint && !draft) repaint(); }).catch(() => {});
}

const titleHTML = (t) => esc(t || "").replace(/\*(.+?)\*/g, "<em>$1</em>");
const canEdit = () => !!ctx && (!ctx.cloud.enabled || !!ctx.cloud.state().isStaff);
function inner(c) {
  return `${c.hand ? `<span class="cv-hand">${esc(c.hand)}</span>` : ""}
    <h2 class="cv-title">${titleHTML(c.title)}</h2>
    ${c.text ? `<p class="cv-text">${esc(c.text)}</p>` : ""}
    ${c.btn ? `<a class="cv-btn" href="${esc(c.href)}"${/^https:|^presentaciones|^familias/.test(c.href) ? ' target="_blank" rel="noopener"' : ""}>${esc(c.btn)} ${icon("right")}</a>` : ""}`;
}
const styleOf = (c) => (c.photo ? `--cv-ph:url('${c.photo}');--cv-y:${c.y}%;--cv-dim:${(c.dim / 100).toFixed(2)}` : "");
export function html() {
  const c = draft || current();
  return `<section class="bv-cover${c.photo ? " has-photo" : ""}" id="bvCover" style="${styleOf(c)}" aria-label="Portada">
    <i class="cv-blob a" aria-hidden="true"></i><i class="cv-blob b" aria-hidden="true"></i>
    <div class="cv-body" id="cvBody">${inner(c)}</div>
    ${canEdit() ? `<button type="button" class="cv-edit no-print" data-action="coverEdit">${icon("edit")} Editar portada</button>` : ""}
  </section>`;
}
function paint() {
  const el = document.getElementById("bvCover"); if (!el || !draft) return;
  el.classList.toggle("has-photo", !!draft.photo); el.setAttribute("style", styleOf(draft));
  document.getElementById("cvBody").innerHTML = inner(draft);
}

// La foto se achica y se comprime para que pese poco (va dentro del mismo documento que los destacados).
const MAXW = 1400, BYTES = 110000;
async function compress(file) {
  if (!/^image\//.test(file.type)) throw new Error("El archivo no es una imagen.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error("No se pudo leer la imagen.")); i.src = url; });
    let k = Math.min(1, MAXW / Math.max(img.width, img.height)), d = "";
    for (let n = 0; n < 4; n++) {
      const cv = document.createElement("canvas"); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      let q = 0.8; d = cv.toDataURL("image/jpeg", q);
      while (d.length > BYTES && q > 0.4) { q -= 0.08; d = cv.toDataURL("image/jpeg", q); }
      if (d.length <= BYTES) return d;
      k *= 0.75;
    }
    throw new Error("La imagen es demasiado pesada. Prueba con otra.");
  } finally { URL.revokeObjectURL(url); }
}

function openEditor() {
  if (!canEdit()) return;
  draft = current();
  let d = document.getElementById("coverDlg");
  if (!d) {
    d = document.createElement("dialog"); d.id = "coverDlg"; d.className = "sheet cv-dlg"; document.body.appendChild(d);
    d.addEventListener("close", () => { if (draft) { draft = null; ctx.render(); } });
    d.addEventListener("input", (e) => {
      const k = e.target.dataset.cv; if (!k || !draft) return;
      draft[k] = e.target.type === "range" ? Number(e.target.value) : e.target.value;
      const o = e.target.parentElement.querySelector("output"); if (o) o.textContent = e.target.value + " %";
      paint();
    });
    d.addEventListener("change", async (e) => {
      if (e.target.id !== "cvFile" || !e.target.files[0] || !draft) return;
      const msg = d.querySelector("#cvMsg"); msg.textContent = "Preparando la foto…";
      try { draft.photo = await compress(e.target.files[0]); msg.textContent = ""; fields(d); paint(); }
      catch (er) { msg.textContent = er.message; }
      e.target.value = "";
    });
  }
  fields(d);
  d.showModal();
}
function fields(d) {
  const c = draft, f = (k, l, max, ph = "") => `<div class="field"><label for="cv_${k}">${l}</label><input class="input" id="cv_${k}" data-cv="${k}" maxlength="${max}" value="${esc(c[k])}" placeholder="${esc(ph)}"></div>`;
  d.innerHTML = `<div class="sheet-head"><div style="flex:1"><span class="eyebrow">Inicio</span><h2>Editar portada</h2></div>
      <button type="button" class="icon-btn" data-action="coverX" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:14px">
      <p class="small muted">Lo que cambies se ve al instante en la portada, detrás de esta ventana. Nada se guarda hasta que toques «Guardar».</p>
      <div class="row-wrap" style="gap:8px">
        <label class="btn btn-soft btn-sm">${icon("plus")} ${c.photo ? "Cambiar foto" : "Poner una foto"}<input type="file" id="cvFile" accept="image/*" hidden></label>
        ${c.photo ? `<button type="button" class="btn btn-ghost btn-sm" data-action="coverNoPhoto">${icon("trash")} Quitar foto</button>` : ""}
        <span class="small" id="cvMsg" aria-live="polite"></span></div>
      ${c.photo ? `<div class="field"><label for="cv_dim">Oscurecer la foto (para que el texto se lea)</label><input type="range" id="cv_dim" data-cv="dim" min="0" max="90" step="5" value="${c.dim}"> <output>${c.dim} %</output></div>
        <div class="field"><label for="cv_y">Encuadre: subir o bajar la foto</label><input type="range" id="cv_y" data-cv="y" min="0" max="100" step="5" value="${c.y}"> <output>${c.y} %</output></div>` : ""}
      ${f("hand", "Frase manuscrita", 40, DEF.hand)}
      ${f("title", "Título (entre *asteriscos* va lo destacado)", 60, DEF.title)}
      <div class="field"><label for="cv_text">Texto</label><textarea class="textarea" id="cv_text" data-cv="text" rows="3" maxlength="200">${esc(c.text)}</textarea></div>
      <div class="ag-form-row">${f("btn", "Botón (vacío: sin botón)", 40, DEF.btn)}${f("href", "A dónde lleva el botón", 300, "#/preambulo")}</div>
      <span class="xs muted">Para una pantalla de la app, escribe su dirección desde el #: por ejemplo #/oracion, #/red, #/agenda o #/preambulo.</span>
      <div class="row-wrap"><button type="button" class="btn btn-ghost" data-action="coverReset">${icon("undo")} Volver a la original</button><span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-action="coverSave">${icon("check")} Guardar</button></div>
    </div>`;
}
async function persist(next, msg) {
  const prev = saved; adopt(next); draft = null;
  document.getElementById("coverDlg")?.close();
  try { await ctx.cloud.saveCover(next); toast(msg); }
  catch (e) { console.warn(e); adopt(prev); toast("No se pudo guardar. Revisa tu conexión.", ""); }
  ctx.render();
}
export function setup(c) {
  ctx = c;
  const A = c.actions;
  A.coverEdit = openEditor;
  A.coverX = () => document.getElementById("coverDlg")?.close();
  A.coverNoPhoto = () => { if (!draft) return; draft.photo = ""; fields(document.getElementById("coverDlg")); paint(); };
  A.coverSave = () => {
    if (!draft) return;
    if (draft.btn && !okHref(draft.href)) { toast("El enlace del botón debe empezar con #/ o con https://", ""); return; }
    persist(clean(draft), "Portada guardada");
  };
  A.coverReset = () => { if (confirm("¿Volver a la portada original, sin foto y con los textos de siempre?")) persist({}, "La portada volvió a la original"); };
}
