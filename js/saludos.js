// Gestión → Saludos para WhatsApp: el saludo de buenos días y el de buenas noches de cada fecha,
// con su imagen, listos para enviar al grupo desde el celular (menú «Compartir» del teléfono).

import { esc, icon, toast } from "./util.js";
import * as cloud from "./cloud.js";
import * as E from "./estudio.js";

let data = null, sel = null;

// --- Bienvenida a quienes se suman al grupo -------------------------------
const APP = "https://pj-agape.github.io/Formacion_Monitores/";
export const BIENV_DEFAULT = `*¡{bienvenido}, {nombre}!* 🙌💛
Qué alegría que te sumes a la Pastoral Juvenil Ágape. Aquí hay un lugar para ti, tal como eres.

En este grupo compartimos:
☀️ el saludo de buenos días con el Evangelio
🌙 una oración para cerrar el día
📅 las actividades y encuentros

📲 La formación y la comunidad están en nuestra app *agAPPe*: ${APP}
Para entrar, pídenos tu invitación.

Cualquier duda, pregunta con confianza. ¡Caminamos juntos! 🙏
_Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay_`;
// Bienvenida a la comunidad de internautas agAPPe (el Ágape digital), con tono misionero
export const BIENV_RED = `*¡{bienvenido} a la comunidad agAPPe, {nombre}!* 🙌💛
Qué alegría que te sumes al *Ágape digital*: una red de internautas que rezan, unida a los jóvenes de la Pastoral Juvenil Ágape de la Parroquia San Miguel de Yungay.

Aquí, cada día:
☀️ el saludo de buenos días con el Evangelio
🌙 una oración para cerrar el día
🕯️ la Capilla Ágape, abierta para ti: ${APP}capilla

Desde hoy también eres *misionero digital* 🌍
Reenvía los saludos a quien los necesite, deja tus intenciones en la Capilla (las llevamos a la misa) e invita a otros a sumarse.

Aquí nadie reza solo. ¡Ya estamos rezando por ti! 🙏
_Comunidad agAPPe · Pastoral Juvenil Ágape, Yungay_`;
const BV = { o: ["Bienvenido", "Bienvenida", "Bienvenidos", "Bienvenidas"], l: ["Él", "Ella", "Varios", "Varias"] };
const bv = { tpl: null, saved: null, savedRed: null, nombre: "", g: 0, open: false, m: "red" };
const bvDef = () => (bv.m === "red" ? BIENV_RED : BIENV_DEFAULT);
function bienvText() {
  const n = bv.nombre.trim();
  let t = (bv.tpl ?? bvDef()).replace(/\{bienvenido\}/g, BV.o[bv.g]);
  t = n ? t.replace(/\{nombre\}/g, n) : t.replace(/,?\s*\{nombre\}/g, "");
  return t;
}
const bienvPiece = () => bv.m === "red"
  ? { kicker: "Ágape digital", title: bv.nombre.trim() ? `¡${BV.o[bv.g]}, *${bv.nombre.trim()}*!` : `¡${BV.o[bv.g]} *a la red*!`, hand: "internautas que rezan", sub: "Comunidad agAPPe · unida a la Pastoral Juvenil Ágape de Yungay", ill: "celular" }
  : ({ kicker: "Nuevo en el grupo", title: bv.nombre.trim() ? `¡${BV.o[bv.g]}, *${bv.nombre.trim()}*!` : `¡${BV.o[bv.g]} *a casa*!`, hand: "Hay un lugar para ti", sub: "Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay", ill: "acogida" });
const bvStyle = () => (bv.m === "red" ? "noche" : "cielo");
async function paintBienv() {
  const cv = document.getElementById("bvCanvas"); if (!cv) return;
  await E.ready(); const d = bienvPiece(); await E.preload(E.illsFor(bvStyle(), d));
  cv.width = cv.height = 1080; E.piece(cv.getContext("2d"), 1080, 1080, bvStyle(), d);
}
async function bienvHTML() {
  if (bv.saved === null) { const c = await cloud.getBienvenida().catch(() => null); bv.saved = (c && c.texto) || ""; bv.savedRed = (c && c.textoRed) || ""; }
  if (bv.tpl === null) bv.tpl = (bv.m === "red" ? bv.savedRed : bv.saved) || bvDef();
  const admin = cloud.state().isAdmin;
  if (bv.open) setTimeout(paintBienv, 30);
  return `<details class="card sal-bv" ${bv.open ? "open" : ""} id="bvBox"><summary><h2 style="display:inline">👋 Bienvenida a quienes se suman</h2> <span class="muted small">Imagen y mensaje para recibir a quien se suma</span></summary>
    <div class="field" style="margin-top:10px"><label>Bienvenida a</label><div class="seg" role="radiogroup" aria-label="Bienvenida a">
      <label><input type="radio" name="bvM" value="red" ${bv.m === "red" ? "checked" : ""}><span>La comunidad agAPPe (internautas)</span></label>
      <label><input type="radio" name="bvM" value="grupo" ${bv.m === "grupo" ? "checked" : ""}><span>El grupo de la parroquia</span></label></div></div>
    <div class="sal-bv-grid">
      <div><canvas id="bvCanvas" class="sal-img" aria-label="Imagen de bienvenida"></canvas></div>
      <div class="stack">
        <div class="field"><label>Nombre <span class="muted">(o nombres: «Sofi y Mati»)</span></label><input class="input" id="bvNombre" maxlength="40" value="${esc(bv.nombre)}" placeholder="Ej: Sofi"></div>
        <div class="field"><label>Para</label><div class="seg" role="radiogroup" aria-label="Para quién">${BV.l.map((l, i) => `<label><input type="radio" name="bvG" value="${i}" ${bv.g === i ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
        <div class="row-wrap" style="gap:8px">
          <button class="btn btn-gold" data-action="bvShare">📤 Enviar a WhatsApp</button>
          <button class="btn btn-soft btn-sm" data-action="bvCopy">${icon("copy")} Copiar texto</button>
          <button class="btn btn-ghost btn-sm" data-action="bvSave">${icon("dl")} Guardar imagen</button></div>
        <div class="sal-wa" id="bvPrev">${wa(bienvText())}</div>
        <details class="dif-more"><summary>✏️ Editar el mensaje</summary>
          <p class="xs muted" style="margin-top:6px">Usa <b>{nombre}</b> y <b>{bienvenido}</b>: se cambian solos. Entre *asteriscos* va en negrita en WhatsApp y entre _guiones bajos_ en cursiva.</p>
          <textarea class="input" id="bvTpl" rows="12" maxlength="1500">${esc(bv.tpl)}</textarea>
          <div class="row-wrap" style="gap:8px;margin-top:8px">
            ${admin ? `<button class="btn btn-primary btn-sm" data-action="bvStore">💾 Guardar para todo el equipo</button>` : `<span class="xs muted">Tus cambios valen para este envío. Para dejarlos fijos, pídeselo a un administrador.</span>`}
            <button class="btn btn-ghost btn-sm" data-action="bvReset">↩️ Volver al original</button></div>
        </details>
      </div></div></details>`;
}
const pad = (n) => String(n).padStart(2, "0");
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const wa = (t) => esc(t).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(^|\s)_([^_\n]+)_/g, "$1<i>$2</i>").replace(/\n/g, "<br>");
const img = (k, iso) => `saludos/${k === "noche" ? "noche" : "manana"}/${iso}.jpg`;

async function load() {
  if (data) return data;
  try { data = await fetch("saludos/saludos.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)); } catch { data = null; }
  // Fiestas propias (Gestión → Evangelio y fiestas): cambian la cita y la frase del saludo de buenos días
  if (data) {
    const pr = (await cloud.getEvPropio().catch(() => null)) || {};
    data.dias.forEach((x) => {
      const o = (pr.dias || {})[x.iso]; if (!o || !o.cita) return;
      x.titulo = o.titulo || x.titulo; x.cita = o.cita; x.propio = true;
      // El bloque del Evangelio se cambia y se quita la reflexión que venía después (era del Evangelio anterior)
      const ps = x.dia.split("\n\n"), i = ps.findIndex((p) => p.startsWith("📖"));
      if (i >= 0) {
        ps[i] = `📖 *${o.titulo ? o.titulo + " · " : "Evangelio · "}${o.cita}*${o.frase ? `\n_«${o.frase.replace(/[«»]/g, "")}»_` : ""}`;
        if (ps[i + 1] && !/^(🙏|📖|Revisar|Gracias)/.test(ps[i + 1]) && ps.length > i + 3) ps.splice(i + 1, 1);
        x.dia = ps.join("\n\n");
      }
    });
  }
  return data;
}

// Versión general, para compartir fuera de la comunidad (canal, estados, otros grupos):
// la fecha, la frase del Evangelio, la cita, el enlace y la invitación a reenviarlo (misioneros digitales).
function fuera(x) {
  const m = x.dia.match(/📖[^\n]*\n_«(.+?)»_/), frase = m ? m[1] : "";
  const fiesta = x.titulo.includes(" · ") ? x.titulo.split(" · ").slice(1).join(" · ") : /domingo/i.test(x.titulo) ? x.titulo : "";
  return `*Evangelio del día*
_${x.fecha}${fiesta ? " · " + fiesta : ""}_

${frase ? `«${frase}»\n` : ""}${x.cita}

Te invitamos a la Capilla Ágape (deja ahí tu intención: la llevamos a la misa):
${APP}capilla

🙏 *Sé misionero digital:* reenvía este mensaje a tus contactos. Así, día a día, vamos formando el *Ágape digital*: una gran red de internautas que rezan con la Palabra.`;
}
const partFuera = (x) => `<article class="sal-part fuera">
    <h3>Para compartir fuera <small>Canal, estados u otros grupos</small></h3>
    <p class="xs muted">Un mensaje general, sin referencias a la comunidad, con la imagen de buenos días, el enlace a la Capilla (abre sin cuenta) y una invitación a reenviarlo como misioneros digitales.</p>
    <img class="sal-img" src="${img("dia", x.iso)}" alt="Imagen del Evangelio del ${esc(x.fecha)}" loading="lazy">
    <div class="row-wrap" style="gap:8px">
      <button class="btn btn-gold" data-action="salShare" data-iso="${x.iso}" data-k="fuera">📤 Enviar a WhatsApp</button>
      <button class="btn btn-soft btn-sm" data-action="salCopy" data-iso="${x.iso}" data-k="fuera">${icon("copy")} Copiar texto</button>
      <a class="btn btn-ghost btn-sm" href="${img("dia", x.iso)}" download="evangelio-del-dia-${x.iso}.jpg">${icon("dl")} Guardar imagen</a>
    </div>
    <div class="sal-wa">${wa(fuera(x))}</div>
  </article>`;
const part = (x, k) => `<article class="sal-part ${k}">
    <h3>${k === "noche" ? "🌙 Buenas noches" : "☀️ Buenos días"} <span class="sal-para">Para la comunidad de internautas agAPPe</span> <small>${esc(k === "noche" ? `${x.ref} · ${x.salmo}` : `Evangelio · ${x.cita}`)}</small></h3>
    ${k === "dia" && x.propio ? `<p class="xs note">Fiesta propia: el texto ya trae su Evangelio. La imagen conserva el del calendario general.</p>` : ""}
    <img class="sal-img" src="${img(k, x.iso)}" alt="Imagen de ${k === "noche" ? "buenas noches" : "buenos días"} del ${esc(x.fecha)}" loading="lazy">
    <div class="row-wrap" style="gap:8px">
      <button class="btn btn-gold" data-action="salShare" data-iso="${x.iso}" data-k="${k}">📤 Enviar a WhatsApp</button>
      <button class="btn btn-soft btn-sm" data-action="salCopy" data-iso="${x.iso}" data-k="${k}">${icon("copy")} Copiar texto</button>
      <a class="btn btn-ghost btn-sm" href="${img(k, x.iso)}" download="agAPPe-${k === "noche" ? "buenas-noches" : "buenos-dias"}-${x.iso}.jpg">${icon("dl")} Guardar imagen</a>
    </div>
    <div class="sal-wa">${wa(k === "noche" ? x.noche : x.dia)}</div>
  </article>`;

export async function adminView() {
  const d = await load();
  if (!d) return `<header class="page-head"><span class="eyebrow">Gestión</span><h1>Saludos para WhatsApp</h1></header><div class="note">No se pudieron cargar los saludos. Revisa tu conexión.</div>`;
  const t = hoy();
  if (!sel || !d.dias.some((x) => x.iso === sel)) sel = (d.dias.find((x) => x.iso >= t) || d.dias[d.dias.length - 1]).iso;
  const x = d.dias.find((y) => y.iso === sel);
  const night = new Date().getHours() >= 17 && sel === t;
  setTimeout(() => document.querySelector(".sal-day.on")?.scrollIntoView({ block: "nearest", inline: "center" }), 50);
  const bienv = await bienvHTML();
  return `<header class="page-head"><span class="eyebrow">Gestión</span><h1>Saludos para <em>WhatsApp</em></h1>
    <p>Buenos días con el Evangelio y buenas noches con las Vísperas, del ${esc(d.dias[0].fecha.toLowerCase())} al ${esc(d.dias[d.dias.length - 1].fecha.toLowerCase())}. Los de buenos días y buenas noches van a la comunidad de internautas agAPPe, con tono misionero: invitan a reenviarlos para que crezca el Ágape digital, unido a los jóvenes de la parroquia. Desde el celular, «Enviar a WhatsApp» abre el menú para compartir: eliges WhatsApp y la comunidad, y la imagen va con su texto. En el computador son dos pasos: el botón copia la imagen, la pegas en el chat (Ctrl+V) y luego copia el texto para pegarlo junto a ella; sale un solo mensaje.</p></header>
  ${bienv}
  <div class="sal-days" role="list">${d.dias.map((y) => `<button role="listitem" class="sal-day ${y.iso === sel ? "on" : ""} ${y.iso === t ? "today" : ""} ${y.iso < t ? "past" : ""}" data-action="salPick" data-iso="${y.iso}" title="${esc(y.titulo)}"><small>${esc(y.fecha.split(" ")[0].slice(0, 3))}</small><b>${+y.iso.slice(8)}</b><small>${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+y.iso.slice(5, 7) - 1]}</small></button>`).join("")}</div>
  <section class="card sal-card"><div class="sal-top"><h2>${sel === t ? "Hoy · " : ""}${esc(x.fecha)}</h2><span class="muted small">${esc(x.titulo)}</span></div>
    <div class="sal-grid">${(night ? ["noche", "dia"] : ["dia", "noche"]).map((k) => part(x, k)).join("")}${partFuera(x)}</div></section>
  <p class="xs muted">Los versículos de la noche vienen del salmo de Vísperas de cada día, en traducción sencilla. Para la antífona oficial, revisa la Liturgia de las Horas.</p>`;
}

function pick(iso, k) { const x = data && data.dias.find((y) => y.iso === iso); return x ? { x, text: k === "fuera" ? fuera(x) : k === "noche" ? x.noche : x.dia } : null; }

// En el computador el menú para compartir no lleva imagen y texto juntos a WhatsApp. Por eso el botón
// funciona en dos pasos: primero copia la imagen (se pega con Ctrl+V en el chat y WhatsApp abre la vista
// previa con un espacio para escribir) y después copia el texto, que se pega en ese espacio: sale un solo mensaje.
const esPC = () => !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ""));
const toPng = async (blob) => {
  if (blob.type === "image/png") return blob;
  const bmp = await createImageBitmap(blob), c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height; c.getContext("2d").drawImage(bmp, 0, 0);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
};
async function pcShare(el, getBlob, text) {
  const label = el.dataset.label || (el.dataset.label = el.innerHTML);
  const reset = () => { clearTimeout(el._t); el.dataset.step = ""; el.innerHTML = label; };
  if (el.dataset.step !== "2") {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": getBlob().then(toPng) })]);
      el.dataset.step = "2"; el.innerHTML = `${icon("copy")} Paso 2: copiar el texto`;
      clearTimeout(el._t); el._t = setTimeout(reset, 120000);
      toast("Imagen copiada. En el chat de WhatsApp pega con Ctrl+V: se abre la imagen con un espacio para escribir. Después vuelve y toca «Paso 2».", "ok", 7000);
    } catch { try { await navigator.clipboard.writeText(text); } catch {} toast("Este navegador no deja copiar imágenes. Guarda la imagen y pega el texto (ya está copiado).", "", 6000); }
    return;
  }
  try { await navigator.clipboard.writeText(text); toast("Texto copiado. Pégalo con Ctrl+V en el espacio para escribir, junto a la imagen, y envía.", "ok", 6000); }
  catch { toast("No se pudo copiar el texto. Usa «Copiar texto».", ""); }
  reset();
}
async function shareImg(blob, name, text) {
  try { await navigator.clipboard.writeText(text); } catch {}
  try {
    const file = new File([blob], name, { type: blob.type || "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
    if (navigator.share) { await navigator.share({ text }); toast("Se envió el texto. La imagen la guardas con «Guardar imagen».", ""); return; }
    toast("En el computador: guarda la imagen y pega el texto (ya está copiado).", "");
  } catch (e) { if (e && e.name !== "AbortError") toast("No se pudo abrir el menú para compartir. El texto quedó copiado.", ""); }
}
const bvBlob = () => new Promise((ok) => document.getElementById("bvCanvas").toBlob(ok, "image/png"));
let bvT = 0;
function bvRefresh(img) {
  const p = document.getElementById("bvPrev"); if (p) p.innerHTML = wa(bienvText());
  if (img) { clearTimeout(bvT); bvT = setTimeout(paintBienv, 250); }
}
let bvWired = false;
function wireBienv() {
  if (bvWired) return; bvWired = true;
  document.addEventListener("input", (e) => {
    if (e.target.id === "bvNombre") { bv.nombre = e.target.value; bvRefresh(true); }
    if (e.target.id === "bvTpl") { bv.tpl = e.target.value; bvRefresh(false); }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.name === "bvG") { bv.g = +e.target.value; bvRefresh(true); }
    if (e.target.name === "bvM") {
      bv.m = e.target.value; bv.tpl = (bv.m === "red" ? bv.savedRed : bv.saved) || bvDef();
      const ta = document.getElementById("bvTpl"); if (ta) ta.value = bv.tpl; bvRefresh(true);
    }
  });
  document.addEventListener("toggle", (e) => { if (e.target.id === "bvBox") { bv.open = e.target.open; if (bv.open) paintBienv(); } }, true);
}

export function registerActions(actions, render) {
  wireBienv();
  const fname = () => `agAPPe-bienvenida${bv.nombre.trim() ? "-" + bv.nombre.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, "-") : ""}.png`;
  actions.bvShare = async (el) => (esPC() ? pcShare(el, bvBlob, bienvText()) : shareImg(await bvBlob(), fname(), bienvText()));
  actions.bvCopy = async () => { try { await navigator.clipboard.writeText(bienvText()); toast("Texto copiado 📋", "ok"); } catch { toast("No se pudo copiar", ""); } };
  actions.bvSave = async () => { const b = await bvBlob(), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  actions.bvStore = async () => {
    const t = (bv.tpl || "").trim(); if (!t) return toast("El mensaje está vacío", "");
    const v = t === bvDef() ? "" : t;
    if (bv.m === "red") bv.savedRed = v; else bv.saved = v;
    try { await cloud.saveBienvenida({ texto: bv.saved || "", textoRed: bv.savedRed || "" }); toast("Mensaje guardado para todo el equipo 💾", "ok"); }
    catch { toast("No se pudo guardar. Revisa tu conexión.", ""); }
  };
  actions.bvReset = () => { bv.tpl = bvDef(); const ta = document.getElementById("bvTpl"); if (ta) ta.value = bv.tpl; bvRefresh(false); toast("Volviste al mensaje original. Para dejarlo fijo, guárdalo.", ""); };
  actions.salPick = (el) => { sel = el.dataset.iso; render(); };
  actions.salCopy = async (el) => {
    const p = pick(el.dataset.iso, el.dataset.k); if (!p) return;
    try { await navigator.clipboard.writeText(p.text); toast("Texto copiado 📋", "ok"); } catch { toast("No se pudo copiar", ""); }
  };
  actions.salShare = async (el) => {
    const p = pick(el.dataset.iso, el.dataset.k); if (!p) return;
    if (esPC()) return pcShare(el, () => fetch(img(el.dataset.k === "fuera" ? "dia" : el.dataset.k, p.x.iso)).then((r) => r.blob()), p.text);
    try { await navigator.clipboard.writeText(p.text); } catch {}
    try {
      const blob = await fetch(img(el.dataset.k === "fuera" ? "dia" : el.dataset.k, p.x.iso)).then((r) => r.blob());
      const file = new File([blob], `${el.dataset.k === "fuera" ? "evangelio-del-dia" : el.dataset.k === "noche" ? "agAPPe-buenas-noches" : "agAPPe-buenos-dias"}-${p.x.iso}.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: p.text }); return; }
      if (navigator.share) { await navigator.share({ text: p.text }); toast("Se envió el texto. La imagen la guardas con «Guardar imagen».", ""); return; }
      toast("En el computador: guarda la imagen y pega el texto (ya está copiado).", "");
    } catch (e) { if (e && e.name !== "AbortError") toast("No se pudo abrir el menú para compartir. El texto quedó copiado.", ""); }
  };
}
