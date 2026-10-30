// Celebraciones de la comunidad: cumpleaños de quienes tienen cuenta (los autorizados) y las fechas Ágape
// (aniversario, fiesta patronal…). Aparecen en Inicio (sorpresa para quien está de cumpleaños, saludo y
// oración para los demás, cuenta regresiva de las fechas), como vela especial en la Capilla, en Gestión →
// Saludos WhatsApp (texto e imagen) y en el Estudio de difusión (plantillas y marcos).

import { esc, icon, toast } from "./util.js";
import * as cloud from "./cloud.js";
import { illus as illusBase, illusConCara } from "./ilustraciones.js";
// Las escenas propias (torta, fiesta) se muestran como imagen: en el modo «papel» los SVG en línea se ocultan.
const illus = (k) => {
  if (k !== "torta" && k !== "fiesta") return illusBase(k);
  const s = illusConCara(k).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/var\(--il-bg,\s*#fff\)/g, "#ffffff")
    .replace(/var\(--il-pop,\s*#ffba03\)/g, "#ffba03").replace(/currentColor/g, "#0b2566");
  return `<img class="fi-ill-img" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}" alt="">`;
};
import { avatar } from "./avatares.js";
import { SELLO } from "./agape-digital.js";

const APP = "https://pj-agape.github.io/";
const pad = (n) => String(n).padStart(2, "0");
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const mdOf = (d) => `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoOf = (d) => `${d.getFullYear()}-${mdOf(d)}`;
const parse = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const slug = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "x";
export const fechaLarga = (iso) => { const d = parse(iso); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
export const mdTexto = (md) => (md ? `${+md.slice(3)} de ${MESES[+md.slice(0, 2) - 1]}` : "sin fecha");
// Próxima vez que llega un día y mes (hoy incluido): fecha ISO y días que faltan
function proxima(md, from = new Date()) {
  const hoy = new Date(from.toDateString());
  let d = new Date(hoy.getFullYear(), +md.slice(0, 2) - 1, +md.slice(3));
  if (d < hoy) d = new Date(hoy.getFullYear() + 1, +md.slice(0, 2) - 1, +md.slice(3));
  return { iso: isoOf(d), n: Math.round((d - hoy) / 864e5) };
}
const idCumple = (c, year) => `c-${year}-${c.md}-${c.uid || slug(c.n)}`;
const idFecha = (f, year) => `f-${year}-${slug(f.id)}`;

// --- Fechas Ágape -------------------------------------------------------------
export const FECHAS_DEF = [
  { id: "aniversario", t: "Aniversario de Ágape", md: "", aniv: true, msg: "" },
  { id: "sanmiguel", t: "San Miguel Arcángel, patrono de nuestra parroquia", md: "09-29", msg: "«¿Quién como Dios?» Que San Miguel nos proteja y nos enseñe a estar siempre del lado del bien." },
];
let fechas = null, cumples = null, cargado = 0, conCuenta = false;
export async function load(force) {
  // Al abrir la app, Inicio se dibuja antes de que termine el ingreso: si ya hay cuenta y lo guardado
  // se cargó sin ella (sin cumpleaños), se vuelve a cargar.
  const ready = !!(cloud.enabled && cloud.state().ready);
  if (!force && fechas && conCuenta === ready && Date.now() - cargado < 5 * 60e3) return { fechas, cumples };
  const [f, c] = await Promise.all([
    cloud.enabled ? cloud.getFechas().catch(() => null) : null,
    cloud.enabled && cloud.state().ready ? cloud.getCumples().catch(() => null) : null,
  ]);
  fechas = f && Array.isArray(f.items) ? f.items : FECHAS_DEF.map((x) => ({ ...x }));
  cumples = (c && Array.isArray(c.items) ? c.items : []).filter((x) => x && x.n && /^\d{2}-\d{2}$/.test(x.md));
  cargado = Date.now(); conCuenta = ready;
  return { fechas, cumples };
}
export const getFechasCache = () => fechas || FECHAS_DEF;
export const getCumplesCache = () => cumples || [];

// ¿Soy yo? Por la cuenta enlazada o, si no, por el nombre corto
function soyYo(c) {
  const me = cloud.myUid(), acc = cloud.state().account;
  if (c.uid) return c.uid === me;
  return !!acc && cloud.shortName(acc.name) === c.n;
}

// Celebraciones de un día (ISO): cumpleaños y fechas Ágape
export function delDia(iso) {
  const md = iso.slice(5), y = iso.slice(0, 4);
  return {
    cumples: getCumplesCache().filter((c) => c.md === md).map((c) => ({ ...c, id: idCumple(c, y), yo: soyYo(c) })),
    fechas: getFechasCache().filter((f) => f.md === md).map((f) => ({ ...f, id: idFecha(f, y) })),
  };
}

// --- Textos y piezas -----------------------------------------------------------
export function textoCumple(n, iso) {
  return `🎂 *¡Feliz cumpleaños, ${n}!*
_${cap(fechaLarga(iso))}_

Hoy la comunidad Ágape da gracias a Dios por tu vida. Que el Señor te bendiga, te cuide y te regale un año lleno de su amor. 💛

🕯️ Hoy encendimos una vela por ti en la Capilla y todos estamos rezando por ti.
🎁 Entra a agAPPe: la comunidad te dejó saludos 👉 ${APP}

¡Un abrazo enorme de toda la familia Ágape! 🎉`;
}
export function textoFecha(f, iso) {
  if (f.aniv) return `🎉 *¡Feliz aniversario, Ágape!*
${iso ? `_${cap(fechaLarga(iso))}_\n\n` : "\n"}Hoy damos gracias a Dios por la historia de la Pastoral Juvenil Ágape: por cada joven, cada dirigente y cada familia que ha caminado con nosotros. 💛${f.msg ? `\n\n${f.msg}` : ""}

_«Doy gracias a mi Dios cada vez que me acuerdo de ustedes»_ (Flp 1,3)

🙏 *Sé misionero digital:* comparte este saludo y súmate a dar gracias en la Capilla Ágape 👉 ${APP}capilla`;
  return `🎉 *Hoy celebramos: ${f.t}*
${iso ? `_${cap(fechaLarga(iso))}_\n\n` : "\n"}${f.msg || "Damos gracias a Dios y celebramos como comunidad."}

🙏 Únete a la oración en la Capilla Ágape 👉 ${APP}capilla`;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Datos para la imagen (estudio.piece)
export const piezaCumple = (n, iso) => ({ style: "sol", d: { kicker: iso ? cap(fechaLarga(iso)) : "Comunidad Ágape", hand: n ? "¡hoy es su día!" : "¡hoy es tu día!", title: n ? `¡Feliz cumpleaños, *${n}!*` : "¡Feliz *cumpleaños*!", sub: "Toda la comunidad Ágape reza por ti · Parroquia San Miguel de Yungay", ill: "torta" } });
export const piezaFecha = (f, iso) => f.aniv
  ? { style: "coral", d: { kicker: iso ? cap(fechaLarga(iso)) : "Pastoral Juvenil Ágape", hand: "gracias, Señor", title: "¡Feliz *aniversario,* Ágape!", sub: "«Doy gracias a mi Dios cada vez que me acuerdo de ustedes» · Flp 1,3", ill: "fiesta" } }
  : { style: "cielo", d: { kicker: iso ? cap(fechaLarga(iso)) : "Fechas Ágape", hand: "hoy celebramos", title: f.t.length > 34 ? f.t.replace(/^(\S+(?:\s+\S+){0,2})/, "*$1*") : `*${f.t}*`, sub: "Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay", ill: f.id === "sanmiguel" ? "sanmiguel" : "fiesta" } };

// --- Velas en la Capilla --------------------------------------------------------
export async function velasHoy() {
  if (!cloud.state().ready) return [];
  await load();
  const iso = isoOf(new Date()), dd = delDia(iso), out = [];
  const T = { toDate: () => new Date(new Date().toDateString()) };
  for (const c of dd.cumples) out.push({ id: "fiesta:" + c.id, fiesta: "cumple", text: `Hoy rezamos por ${c.n} en su cumpleaños: que el Señor bendiga su vida, la cuide y la llene de su amor.`, createdAt: T });
  for (const f of dd.fechas) out.push({ id: "fiesta:" + f.id, fiesta: "fecha", text: f.aniv ? "Damos gracias a Dios por la historia de Ágape y por cada persona que ha caminado con nosotros." : `Damos gracias a Dios: ${f.t}.`, createdAt: T });
  await Promise.all(out.map(async (v) => { const d = await cloud.getFiesta(v.id.slice(7)); v.prays = (d && d.prays) || {}; }));
  return out;
}

// --- Inicio -----------------------------------------------------------------------
const docs = new Map(); // id → { prays, firmas }
const nPrays = (id) => Object.keys((docs.get(id) || {}).prays || {}).length;
const firmas = (id) => Object.entries((docs.get(id) || {}).firmas || {}).map(([uid, x]) => ({ uid, ...x })).filter((x) => x.t);
const yaRece = (id) => !!((docs.get(id) || {}).prays || {})[cloud.myUid()];
const miFirma = (id) => (((docs.get(id) || {}).firmas || {})[cloud.myUid()] || {}).t || "";

function metaTxt(id, quien) {
  const p = nPrays(id), f = firmas(id).length;
  const a = [p ? `${p} ${p === 1 ? "persona rezó" : "personas rezaron"}${quien ? " " + quien : ""}` : "", f ? `${f} ${f === 1 ? "saludo" : "saludos"}` : ""].filter(Boolean);
  return a.join(" · ");
}
const confeti = () => `<div class="fi-confeti" aria-hidden="true">${Array.from({ length: 26 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.35}s;--c:${["#ffba03", "#ef591c", "#8ad2fa", "#0b2566"][i % 4]};--r:${(i * 47) % 360}deg"></i>`).join("")}</div>`;
const firmaForm = (id, n) => `<form class="fi-form" data-fiform="${esc(id)}" hidden>
    <textarea class="textarea" name="t" rows="2" maxlength="280" placeholder="Escríbele algo bonito a ${esc(n)}…">${esc(miFirma(id))}</textarea>
    <div class="row-wrap" style="gap:8px"><button class="btn btn-primary btn-sm" type="submit">${icon("send")} ${miFirma(id) ? "Guardar mi saludo" : "Dejar mi saludo"}</button>
      ${miFirma(id) ? `<button type="button" class="sal-link" data-action="fiFirmaDel" data-id="${esc(id)}">Quitar mi saludo</button>` : ""}</div></form>`;

function cardYo(c) {
  const fs = firmas(c.id);
  return `<section class="card fi-card fi-yo" aria-labelledby="fiYoT">${confeti()}
    <div class="fi-ill">${illus("torta")}</div>
    <div class="fi-txt"><span class="fi-hand">¡hoy es tu día!</span>
      <h2 id="fiYoT">¡Feliz cumpleaños, ${esc(c.n)}!</h2>
      <p>Toda la comunidad Ágape da gracias a Dios por tu vida. Hoy encendimos una vela por ti en la Capilla.</p>
      ${nPrays(c.id) ? `<p class="fi-meta"><b>${nPrays(c.id)}</b> ${nPrays(c.id) === 1 ? "persona rezó" : "personas rezaron"} por ti hoy.</p>` : ""}
      ${fs.length ? `<div class="fi-firmas"><span class="fi-firmas-h">La comunidad te dejó ${fs.length === 1 ? "un saludo" : `${fs.length} saludos`}</span>
        ${fs.map((x) => `<div class="fi-firma">${avatar(x.a || "", x.n || "Alguien", "cap-av")}<p><b>${esc(x.n || "Alguien")}</b>${esc(x.t)}</p></div>`).join("")}</div>`
        : `<p class="xs muted">Durante el día irán llegando los saludos de la comunidad.</p>`}
      <div class="fi-btns"><a class="btn btn-gold btn-sm" href="#/oracion/velas">${icon("flame")} Ver mi vela</a>
        <button class="btn btn-ghost btn-sm" data-action="fiMarco" data-f="cumple">Marco de cumpleaños para mi foto</button></div>
    </div></section>`;
}
function cardCumple(c, n) {
  const hoy = n === 0, cuando = n === 1 ? "mañana" : `el ${DIAS[parse(proxima(c.md).iso).getDay()]}`;
  return `<section class="card fi-card fi-cumple${hoy ? "" : " is-pronto"}">
    <div class="fi-ill">${illus("torta")}</div>
    <div class="fi-txt"><span class="fi-hand">${hoy ? "hoy está de cumpleaños" : `${cuando} está de cumpleaños`}</span>
      <h2>${esc(c.n)}</h2>
      <p>${hoy ? `Regálale una oración y déjale un saludo: lo verá al entrar a la app.` : `Déjale un saludo desde ya: se lo mostramos el día de su cumpleaños.`}</p>
      <div class="fi-btns">
        ${hoy ? `<button class="btn btn-sm ${yaRece(c.id) ? "btn-soft" : "btn-gold"}" data-action="fiPray" data-id="${esc(c.id)}" data-on="${yaRece(c.id) ? 0 : 1}">${icon("flame")} ${yaRece(c.id) ? "Ya rezaste" : `Rezo por ${esc(c.n)}`}</button>` : ""}
        <button class="btn btn-sm btn-ghost" data-action="fiFirma" data-id="${esc(c.id)}">${miFirma(c.id) ? "Editar mi saludo" : "Dejarle un saludo"}</button></div>
      ${firmaForm(c.id, c.n)}
      <p class="fi-meta">${esc(metaTxt(c.id, hoy ? `por ${c.n}` : ""))}</p>
    </div></section>`;
}
function cardFecha(f, n) {
  if (n > 0) return `<section class="card fi-card fi-cuenta">
    <div class="fi-num"><b>${n}</b><span>${n === 1 ? "día" : "días"}</span></div>
    <div class="fi-txt"><span class="fi-hand">${n === 1 ? "mañana celebramos" : "se viene"}</span><h2>${esc(f.t)}</h2>
      <p>${cap(fechaLarga(proxima(f.md).iso))}. ${f.aniv ? "Prepárate para dar gracias por la historia de Ágape." : "Prepárate para celebrar en comunidad."}</p></div></section>`;
  return `<section class="card fi-card fi-fecha">${confeti()}
    <div class="fi-ill">${f.id === "sanmiguel" ? illus("sanmiguel") : illus("fiesta")}</div>
    <div class="fi-txt"><span class="fi-hand">hoy celebramos</span><h2>${f.aniv ? "¡Feliz aniversario, Ágape!" : esc(f.t)}</h2>
      <p>${esc(f.aniv ? "Damos gracias a Dios por la historia de Ágape y por cada joven, dirigente y familia que ha caminado con nosotros." : f.msg || "Damos gracias a Dios y celebramos como comunidad.")}</p>
      ${cloud.state().ready ? `<div class="fi-btns"><button class="btn btn-sm ${yaRece(f.id) ? "btn-soft" : "btn-gold"}" data-action="fiPray" data-id="${esc(f.id)}" data-on="${yaRece(f.id) ? 0 : 1}">${icon("flame")} ${yaRece(f.id) ? "Diste gracias" : "Doy gracias"}</button>
        ${f.aniv ? `<button class="btn btn-sm btn-ghost" data-action="fiMarco" data-f="aniversario">Marco de aniversario</button>` : ""}</div>
      <p class="fi-meta">${nPrays(f.id) ? `${nPrays(f.id)} ${nPrays(f.id) === 1 ? "persona dio" : "personas dieron"} gracias hoy` : ""}</p>` : ""}
    </div></section>`;
}

let pintando = 0;
export async function paintHome() {
  const slot = document.getElementById("fiestaSlot"); if (!slot || !cloud.enabled) return;
  const my = ++pintando;
  await load();
  const ready = cloud.state().ready, now = new Date(), out = [], ids = [];
  // Fechas Ágape: cuenta regresiva (7 días) y el día mismo
  for (const f of getFechasCache()) {
    if (!f.md) continue;
    const p = proxima(f.md, now); if (p.n > 7) continue;
    const x = { ...f, id: idFecha(f, p.iso.slice(0, 4)) };
    out.push([p.n, () => cardFecha(x, p.n)]); if (!p.n) ids.push(x.id);
  }
  if (ready) {
    let yo = null;
    for (const c of getCumplesCache()) {
      const p = proxima(c.md, now); if (p.n > 3) continue;
      const x = { ...c, id: idCumple(c, p.iso.slice(0, 4)) };
      if (soyYo(c)) { if (!p.n) yo = x; continue; } // la sorpresa es solo el día
      out.push([p.n, () => cardCumple(x, p.n)]); ids.push(x.id);
    }
    if (yo) { out.unshift([-1, () => cardYo(yo)]); ids.push(yo.id); }
  }
  if (!out.length) { slot.innerHTML = ""; return; }
  await Promise.all([...new Set(ids)].map(async (id) => { const d = await cloud.getFiesta(id); if (d) docs.set(id, d); }));
  if (my !== pintando) return;
  const s = document.getElementById("fiestaSlot"); if (!s) return;
  s.innerHTML = out.sort((a, b) => a[0] - b[0]).slice(0, 4).map(([, f]) => f()).join("");
}

// --- Gestión: Fechas Ágape --------------------------------------------------------
let editFechas = null, abierto = false;
export function fechasAdminHTML() {
  if (!editFechas) editFechas = getFechasCache().map((x) => ({ ...x }));
  const staff = cloud.state().isStaff;
  return `<details class="card fi-adm" id="fiAdm" ${abierto ? "open" : ""}><summary><h2 style="display:inline">Fechas Ágape</h2> <span class="muted small">Aniversario, fiesta patronal y otras fechas para celebrar</span></summary>
    <p class="small muted" style="margin-top:8px">Cada fecha aparece en Inicio (cuenta regresiva de 7 días y una tarjeta el mismo día), como vela de acción de gracias en la Capilla y aquí, con su saludo listo. Si una fecha no tiene día, su tarjeta queda disponible abajo para enviarla cuando quieras.</p>
    <div class="fi-adm-list">${editFechas.map((f, i) => `<div class="fi-adm-row" data-i="${i}">
      <input class="input" data-fi="t" maxlength="70" value="${esc(f.t)}" aria-label="Nombre de la fecha" ${staff ? "" : "disabled"}>
      <div class="row" style="gap:6px"><select class="input" data-fi="d" aria-label="Día" ${staff ? "" : "disabled"}><option value="">Día</option>${Array.from({ length: 31 }, (_, k) => `<option ${f.md && +f.md.slice(3) === k + 1 ? "selected" : ""}>${k + 1}</option>`).join("")}</select>
        <select class="input" data-fi="m" aria-label="Mes" ${staff ? "" : "disabled"}><option value="">Mes</option>${MESES.map((m, k) => `<option value="${k + 1}" ${f.md && +f.md.slice(0, 2) === k + 1 ? "selected" : ""}>${m}</option>`).join("")}</select></div>
      <input class="input" data-fi="msg" maxlength="220" value="${esc(f.msg || "")}" placeholder="Mensaje (opcional)" aria-label="Mensaje" ${staff ? "" : "disabled"}>
      <div class="row-wrap" style="gap:6px"><button class="btn btn-soft btn-sm" data-action="fiVer" data-i="${i}">Ver su saludo</button>
        ${staff && !f.aniv && f.id !== "sanmiguel" ? `<button class="sal-link" data-action="fiQuitar" data-i="${i}">Quitar</button>` : ""}</div>
    </div>`).join("")}</div>
    ${staff ? `<div class="row-wrap" style="gap:8px;margin-top:10px"><button class="btn btn-ghost btn-sm" data-action="fiNueva">${icon("plus")} Agregar una fecha</button>
      <span class="spacer"></span><button class="btn btn-primary btn-sm" data-action="fiGuardar">Guardar las fechas</button></div>` : ""}
    <div id="fiVerBox"></div></details>`;
}
function leerFechas() {
  document.querySelectorAll(".fi-adm-row").forEach((r) => {
    const f = editFechas[+r.dataset.i]; if (!f) return;
    const v = (k) => r.querySelector(`[data-fi="${k}"]`).value;
    f.t = v("t").trim() || f.t; f.msg = v("msg").trim();
    const d = +v("d"), m = +v("m"); f.md = d && m ? `${pad(m)}-${pad(Math.min(d, new Date(2024, m, 0).getDate()))}` : "";
  });
}

// Pieza de celebración para Saludos WhatsApp (texto + imagen dibujada en el teléfono)
export function parteHTML(k, titulo, para, texto, aviso = "") {
  return `<article class="sal-part fiesta">
    <h3>${titulo} <span class="sal-para">${para}</span></h3>
    ${aviso ? `<p class="xs note">${aviso}</p>` : ""}
    <canvas class="sal-img" data-fipz="${esc(k)}" width="1080" height="1080" aria-label="Imagen del saludo"></canvas>
    <div class="row-wrap" style="gap:8px">
      <button class="btn btn-gold" data-action="fiShare" data-k="${esc(k)}">Enviar a WhatsApp</button>
      <button class="btn btn-soft btn-sm" data-action="fiCopy" data-k="${esc(k)}">${icon("copy")} Copiar texto</button>
      <button class="btn btn-ghost btn-sm" data-action="fiSave" data-k="${esc(k)}">${icon("dl")} Guardar imagen</button>
    </div>
    <div class="sal-wa" data-fitx="${esc(k)}"></div>
  </article>`;
}
export const piezas = new Map(); // k → { text, pz, name }

let ctx = null;
export function setup(c) { ctx = c; registerActions(); }
function registerActions() {
  const A = ctx.actions;
  const refresh = () => paintHome();
  A.fiPray = async (el) => {
    const on = el.dataset.on === "1", id = el.dataset.id;
    try { await cloud.prayFiesta(id, on); const d = docs.get(id) || {}; d.prays = { ...(d.prays || {}) }; if (on) d.prays[cloud.myUid()] = {}; else delete d.prays[cloud.myUid()]; docs.set(id, d);
      if (on) toast("Gracias por rezar con la comunidad", "ok"); refresh(); }
    catch { toast("No se pudo guardar. Si recién se actualizó la app, falta publicar las reglas nuevas de Firebase.", "", 5000); }
  };
  A.fiFirma = (el) => { const f = document.querySelector(`[data-fiform="${CSS.escape(el.dataset.id)}"]`); if (f) { f.hidden = !f.hidden; if (!f.hidden) f.querySelector("textarea")?.focus(); } };
  A.fiFirmaDel = async (el) => {
    try { await cloud.firmaFiesta(el.dataset.id, ""); const d = docs.get(el.dataset.id) || {}; if (d.firmas) delete d.firmas[cloud.myUid()]; toast("Saludo quitado"); refresh(); } catch { toast("No se pudo quitar", ""); }
  };
  A.fiMarco = (el) => { try { sessionStorage.setItem("dif_pre", JSON.stringify({ tab: "marco", frame: el.dataset.f })); } catch {} location.hash = "#/difusion"; };
  // Gestión
  A.fiNueva = () => { abierto = true; leerFechas(); editFechas.push({ id: "f" + Date.now().toString(36), t: "Nueva fecha", md: "", msg: "" }); ctx.render(); };
  A.fiQuitar = (el) => { abierto = true; leerFechas(); editFechas.splice(+el.dataset.i, 1); ctx.render(); };
  A.fiGuardar = async () => {
    abierto = true; leerFechas();
    try { await cloud.saveFechas({ items: editFechas }); fechas = editFechas.map((x) => ({ ...x })); toast("Fechas guardadas", "ok"); ctx.render(); }
    catch { toast("No se pudieron guardar. Si recién se actualizó la app, falta publicar las reglas nuevas de Firebase.", "", 5000); }
  };
  A.fiVer = async (el) => {
    leerFechas();
    const f = editFechas[+el.dataset.i], box = document.getElementById("fiVerBox"); if (!f || !box) return;
    const iso = f.md ? proxima(f.md).iso : "";
    box.innerHTML = `<div class="sal-grid" style="margin-top:12px">${parteHTML("ver", f.aniv ? "Aniversario de Ágape" : esc(f.t), iso ? `Llega el ${esc(fechaLarga(iso))}` : "Tarjeta genérica, sin fecha", "")}</div>`;
    const k = "ver";
    piezas.set(k, { text: textoFecha(f, iso), pz: piezaFecha(f, iso), name: `agAPPe-${slug(f.t)}` });
    await pintarPiezas(box);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  document.addEventListener("submit", async (e) => {
    const f = e.target; if (!f.matches || !f.matches("[data-fiform]")) return;
    e.preventDefault();
    const id = f.dataset.fiform, t = f.t.value.trim(); if (!t) { f.t.focus(); return; }
    const b = f.querySelector("button[type=submit]"); if (b) b.disabled = true;
    try { await cloud.firmaFiesta(id, t); const d = docs.get(id) || {}; d.firmas = { ...(d.firmas || {}), [cloud.myUid()]: { t } }; docs.set(id, d); toast("¡Saludo guardado! Lo verá el día de su cumpleaños.", "ok"); refresh(); }
    catch (err) { console.warn("Saludo:", err); toast(err && err.code === "permission-denied" ? "Firebase no dejó guardar el saludo (permiso denegado). Revisa que las reglas publicadas sean las últimas." : `No se pudo guardar el saludo${err && err.code ? ` (${err.code})` : ""}. Revisa tu conexión.`, "", 7000); if (b) b.disabled = false; }
  });
}

// Dibuja las imágenes y textos de las piezas que haya en la página
export async function pintarPiezas(root = document) {
  const E = await import("./estudio.js");
  await E.ready();
  for (const cv of root.querySelectorAll("canvas[data-fipz]")) {
    const p = piezas.get(cv.dataset.fipz); if (!p) continue;
    await E.preload(E.illsFor(p.pz.style, p.pz.d));
    E.piece(cv.getContext("2d"), 1080, 1080, p.pz.style, p.pz.d);
    const tx = root.querySelector(`[data-fitx="${CSS.escape(cv.dataset.fipz)}"]`);
    if (tx) tx.innerHTML = esc(p.text).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(^|\s)_([^_\n]+)_/g, "$1<i>$2</i>").replace(/\n/g, "<br>");
  }
}
export const piezaBlob = (k) => new Promise((ok) => { const cv = document.querySelector(`canvas[data-fipz="${CSS.escape(k)}"]`); if (!cv) ok(null); else cv.toBlob(ok, "image/png"); });
export { SELLO };
