// Descubre Ágape: para que cada uno conozca todos los rincones de la app, sin presiones.
// - Pasaporte Ágape: un sello por cada herramienta que visitas en el mes; al completarlo, un marco especial.
// - «Hoy te recomendamos» (Inicio): una herramienta que todavía no visitas este mes.
// - «Sigue tu camino» al final de cada herramienta: dos sugerencias relacionadas.
// - Cuánta gente pasó por cada herramienta esta semana (conteo anónimo).
// - Recorrido de bienvenida: la primera vez que se abre Inicio.
// Todo se guarda en el dispositivo; no se registra quién es.

import { esc, icon, toast } from "./util.js";
import * as cloud from "./cloud.js";
import { illus } from "./ilustraciones.js";
import { SELLO } from "./agape-digital.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad = (n) => String(n).padStart(2, "0");
const mesKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const hoyKey = (d = new Date()) => `${mesKey(d)}-${pad(d.getDate())}`;

// Las herramientas (las claves son las mismas del contador «Lo más visto»)
export const TOOLS = [
  { k: "evangelio", n: "Evangelio del día", href: "#/evangelio", ill: "biblia", d: "La Palabra de hoy, en video y para leer con calma." },
  { k: "rosario", n: "Rosario", href: "#/oracion/rosario", ill: "maria", d: "Cuenta a cuenta, con los misterios del día y una voz que te guía." },
  { k: "rato", n: "Un rato con Jesús", href: "#/oracion/silencio", ill: "oracion", d: "Unos minutos de silencio guiado para conversar con Él." },
  { k: "salmos", n: "Salmos", href: "#/salmos", ill: "l_biblia", d: "Elige cómo llegas hoy y reza con el salmo que te acompaña." },
  { k: "oremus", n: "Oremus", href: "#/oremus", ill: "jesus", d: "Nuestras oraciones y las de toda la Iglesia." },
  { k: "cancionero", n: "Cancionero", href: "#/cancionero", ill: "img:img/stickers/guitarra.webp", d: "Canciones con acordes para cada momento de la misa." },
  { k: "intenciones", n: "Intenciones", href: "#/oracion/velas", ill: "luz", d: "Enciende una vela y reza por las intenciones de otros." },
  { k: "radio", n: "Radios católicas", href: "#/oracion/radio", ill: "celular", d: "Música y oración en vivo, para acompañar tu día." },
  { k: "podcast", n: "Podcast", href: "#/podcast", ill: "escuchar", d: "Conversaciones para escuchar en el camino." },
  { k: "juegos", n: "Juegos", href: "#/juegos", ill: "juego", d: "Trivia, memorice, sopa de letras y juegos para el grupo." },
  { k: "difusion", n: "Estudio de difusión", href: "#/difusion", ill: "envio", d: "Marcos de foto, historias y stickers para compartir." },
  { k: "agenda", n: "Agenda", href: "#/agenda", ill: "futuro", d: "Encuentros, celebraciones y actividades de Ágape.", soloVisita: true },
  { k: "comunidad", n: "Comunidad", href: "#/red", ill: "equipo", d: "El desafío de la semana, el muro y lo que compartimos.", cuenta: true },
  { k: "momentos", n: "Momentos", href: "#/momentos", ill: "comunidad", d: "Las fotos y recuerdos del grupo.", cuenta: true },
  { k: "formacion", n: "Formación", href: "#/formacion", ill: "apostoles", d: "Cursos para crecer en la fe y aprender a acompañar.", cuenta: true },
];
// Qué sugerir después de cada herramienta (en orden de preferencia)
const NEXT = {
  inicio: ["evangelio", "salmos", "rosario"],
  evangelio: ["salmos", "intenciones", "rato"], capilla: ["rato", "rosario", "salmos"],
  rosario: ["intenciones", "oremus", "cancionero"], rato: ["salmos", "intenciones", "oremus"],
  salmos: ["rato", "oremus", "cancionero"], oremus: ["rosario", "salmos", "intenciones"],
  cancionero: ["radio", "podcast", "salmos"], intenciones: ["rosario", "rato", "evangelio"],
  radio: ["cancionero", "podcast", "juegos"], podcast: ["radio", "juegos", "evangelio"],
  juegos: ["difusion", "cancionero", "podcast"], difusion: ["juegos", "intenciones", "cancionero"],
  agenda: ["evangelio", "juegos", "difusion"], comunidad: ["momentos", "intenciones", "juegos"],
  momentos: ["comunidad", "difusion", "juegos"], formacion: ["evangelio", "oremus", "rato"],
  muro: ["momentos", "intenciones", "juegos"], chat: ["momentos", "juegos", "intenciones"],
};
const tool = (k) => TOOLS.find((t) => t.k === k);
const conCuenta = () => !!(cloud.enabled && cloud.state().ready);
export const herramientas = () => TOOLS.filter((t) => (t.cuenta ? conCuenta() : t.soloVisita ? !conCuenta() : true));
export function ilu(t, cls = "") {
  if (t.ill.startsWith("img:")) return `<img class="z-illus z-sticker ${cls}" src="${esc(t.ill.slice(4))}" alt="" loading="lazy">`;
  return illus(t.ill, cls);
}

// --- Pasaporte (en el dispositivo) -------------------------------------------
const PKEY = "agape_pasaporte";
function leer() {
  let p = null; try { p = JSON.parse(localStorage.getItem(PKEY) || "null"); } catch {}
  if (!p || p.m !== mesKey()) p = { m: mesKey(), s: {}, premio: false, logros: (p && p.logros) || [] };
  return p;
}
const guardar = (p) => { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} };
export function sellos() { const p = leer(), hs = herramientas(); return { p, hs, n: hs.filter((t) => p.s[t.k]).length, total: hs.length }; }
export const completo = () => { const s = sellos(); return s.n >= s.total || (leer().logros || []).length > 0; };
// Se llama cada vez que se abre una pantalla (misma clave del contador «Lo más visto»)
export function marcar(k) {
  if (!tool(k)) return;
  const p = leer(); if (p.s[k]) return;
  p.s[k] = hoyKey(); guardar(p);
  const s = sellos();
  if (s.n >= s.total && !p.premio) {
    p.premio = true; p.logros = [...new Set([...(p.logros || []), p.m])]; guardar(p);
    setTimeout(() => toast(`¡Completaste tu Pasaporte Ágape de ${MESES[new Date().getMonth()]}! Tienes un marco nuevo en el Estudio de difusión.`, "ok", 7000), 900);
  } else setTimeout(() => toast(`Nuevo sello en tu Pasaporte Ágape: ${tool(k).n} (${s.n} de ${s.total})`, "ok", 3500), 900);
}

// --- Cuánta gente pasó por cada herramienta esta semana --------------------------
let semana = null, pidiendo = null;
export async function semanaVistas() {
  if (semana) return semana;
  try { const c = JSON.parse(sessionStorage.getItem("agape_vistas_sem") || "null"); if (c && c.d === hoyKey()) return (semana = c.t); } catch {}
  if (!cloud.enabled) return (semana = {});
  pidiendo = pidiendo || cloud.viewStats(7).then((rows) => {
    const t = {}; (rows || []).forEach((r) => Object.entries(r).forEach(([k, n]) => { if (k !== "dia") t[k] = (t[k] || 0) + (+n || 0); }));
    semana = t; try { sessionStorage.setItem("agape_vistas_sem", JSON.stringify({ d: hoyKey(), t })); } catch {}
    return t;
  }).catch(() => (semana = {}));
  return pidiendo;
}
const gente = (k, t) => { const n = (t || {})[k] || 0; return n >= 3 ? `${n} personas pasaron por aquí esta semana` : ""; };

// --- «Hoy te recomendamos» (Inicio) ----------------------------------------------
function recomendada() {
  const { p, hs } = sellos();
  const faltan = hs.filter((t) => !p.s[t.k]);
  const lista = faltan.length ? faltan : hs;
  const d = new Date(), i = (d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % lista.length;
  return lista[i];
}
export async function paintHome() {
  const slot = document.getElementById("descubreSlot"); if (!slot) return;
  const t = recomendada(), s = sellos(), sem = await semanaVistas();
  const g = gente(t.k, sem);
  const s2 = document.getElementById("descubreSlot"); if (!s2) return;
  s2.innerHTML = `<section class="card ds-rec" aria-labelledby="dsRecT">
    <a class="ds-rec-main" href="${t.href}">
      <span class="ds-rec-ill">${ilu(t)}</span>
      <span class="ds-rec-txt"><span class="ds-hand">hoy te recomendamos</span>
        <strong id="dsRecT">${esc(t.n)}</strong><span>${esc(t.d)}</span>${g ? `<small>${esc(g)}</small>` : ""}</span>
      <span class="ds-go" aria-hidden="true">${icon("arrowR")}</span></a>
    <a class="ds-pas-mini" href="#/sellos"><span class="ds-pas-ico" aria-hidden="true">${SELLO()}</span>
      <span>Tu Pasaporte Ágape de ${MESES[new Date().getMonth()]}: <b>${s.n} de ${s.total}</b> sellos</span>
      <span class="mini-bar"><i style="width:${Math.round((s.n / s.total) * 100)}%"></i></span></a>
  </section>`;
}

// --- «Sigue tu camino» al final de cada herramienta --------------------------------
export async function siguiente(v, k) {
  if (!v || !NEXT[k] || k === "inicio") return;
  const { p } = sellos(), hs = herramientas().map((t) => t.k);
  const opts = NEXT[k].filter((x) => hs.includes(x));
  const orden = [...opts.filter((x) => !p.s[x]), ...opts.filter((x) => p.s[x])].slice(0, 2).map(tool);
  if (!orden.length) return;
  const sem = await semanaVistas();
  if (!v.isConnected || v.querySelector(".ds-next")) return;
  v.insertAdjacentHTML("beforeend", `<aside class="ds-next" aria-label="Sigue tu camino">
    <span class="ds-hand">sigue tu camino</span>
    <div class="ds-next-grid">${orden.map((t) => `<a class="card link ds-next-it" href="${t.href}">
      <span class="ds-next-ill">${ilu(t)}</span>
      <span class="ds-next-txt"><strong>${esc(t.n)}</strong><span>${esc(t.d)}</span>${gente(t.k, sem) ? `<small>${esc(gente(t.k, sem))}</small>` : ""}
        ${p.s[t.k] ? "" : `<em class="ds-nuevo">Sello nuevo</em>`}</span></a>`).join("")}</div>
    <a class="ds-next-pas" href="#/sellos">${icon("check")} Ver mi Pasaporte Ágape</a>
  </aside>`);
}

// --- Página del Pasaporte -------------------------------------------------------
export function view() {
  const { p, hs, n, total } = sellos(), mes = MESES[new Date().getMonth()];
  const lleno = n >= total;
  const fecha = (iso) => { const [, m, d] = iso.split("-").map(Number); return `${d} ${MESES[m - 1].slice(0, 3)}`; };
  return `<header class="page-head"><span class="eyebrow">Descubre Ágape</span><h1>Pasaporte <em>Ágape</em></h1>
    <p>Cada rincón de la app que visitas este mes te da un sello. Recorre todos y recibe el marco especial «Peregrino Ágape» para tu foto. Se renueva cada mes y queda guardado en este dispositivo.</p></header>
    <section class="card ds-pas">
      <div class="ds-pas-head"><span class="ds-pas-sello">${SELLO()}</span>
        <div><span class="ds-hand">${lleno ? "¡pasaporte completo!" : `pasaporte de ${mes}`}</span>
          <strong>${n} de ${total} sellos</strong>
          <span class="mini-bar"><i style="width:${Math.round((n / total) * 100)}%"></i></span></div></div>
      <div class="ds-grid">${hs.map((t, i) => `<a class="ds-st${p.s[t.k] ? " on" : ""}" href="${t.href}" style="--r:${[-6, 4, -2, 7, -4, 3][i % 6]}deg">
        <span class="ds-st-ill">${ilu(t)}</span><b>${esc(t.n)}</b>
        <small>${p.s[t.k] ? `Sellado el ${fecha(p.s[t.k])}` : "Por descubrir"}</small>
        ${p.s[t.k] ? `<i class="ds-st-mark" aria-hidden="true">ÁGAPE</i>` : ""}</a>`).join("")}</div>
      ${lleno ? `<div class="ds-premio">${SELLO("ds-premio-s")}<div><strong>¡Recorriste toda la app este mes!</strong>
        <span>Ya tienes tu marco «Peregrino Ágape» en el Estudio de difusión. Úsalo para tu foto e invita a otros a recorrerla.</span>
        <button class="btn btn-gold btn-sm" data-action="dsMarco">Usar mi marco</button></div></div>`
        : `<p class="small muted" style="margin-top:12px">Te faltan ${total - n}. Toca cualquiera para ir y sellarla.</p>`}
    </section>
    <div class="row-wrap" style="gap:8px;margin-top:12px"><button class="btn btn-ghost btn-sm" data-action="dsTour">Ver el recorrido de la app</button></div>`;
}

// --- Recorrido de bienvenida --------------------------------------------------------
const TOUR = [
  { t: "Bienvenido a agAPPe", x: "La casa digital de la Pastoral Juvenil Ágape de Yungay. Te mostramos sus rincones en 30 segundos.", ill: "sello" },
  { t: "Orar", x: "En la Capilla están el Evangelio del día, el Rosario, Un rato con Jesús, los Salmos y Oremus.", ill: "oracion" },
  { t: "Nadie reza solo", x: "Enciende una vela por tus intenciones y reza por las de otros. Las llevamos a la misa del grupo.", ill: "luz" },
  { t: "Cantar y escuchar", x: "Cancionero con acordes, radios católicas en vivo, podcast y juegos para el grupo.", ill: "juego" },
  { t: "Tu Pasaporte Ágape", x: "Cada rincón que visitas te da un sello. Completa el mes y recibe un marco especial para tu foto.", ill: "sello" },
];
let tourI = 0;
function tourHTML() {
  const s = TOUR[tourI], last = tourI === TOUR.length - 1;
  return `<div class="sheet-body ds-tour">
    <div class="ds-tour-ill">${s.ill === "sello" ? SELLO("ds-tour-s") : illus(s.ill)}</div>
    <span class="ds-hand">${tourI + 1} de ${TOUR.length}</span>
    <h2>${esc(s.t)}</h2><p>${esc(s.x)}</p>
    <div class="ds-tour-dots" aria-hidden="true">${TOUR.map((_, i) => `<i class="${i === tourI ? "on" : ""}"></i>`).join("")}</div>
    <div class="row-wrap" style="gap:8px;justify-content:center">
      ${last ? `<button class="btn btn-gold" data-action="dsTourFin">Empezar</button>` : `<button class="btn btn-ghost btn-sm" data-action="dsTourFin">Saltar</button><button class="btn btn-primary" data-action="dsTourSig">Siguiente</button>`}
    </div></div>`;
}
export function tour(force) {
  try { if (!force && localStorage.getItem("agape_tour1")) return; localStorage.setItem("agape_tour1", "1"); } catch { if (!force) return; }
  tourI = 0;
  let d = document.getElementById("dsTourDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "dsTourDlg"; d.className = "sheet ds-tour-dlg"; d.setAttribute("aria-label", "Recorrido de la app"); document.body.appendChild(d); }
  d.innerHTML = tourHTML(); d.showModal();
}

let ctx = null;
export function setup(c) {
  ctx = c; const A = c.actions;
  A.dsTour = () => tour(true);
  A.dsTourSig = () => { tourI = Math.min(TOUR.length - 1, tourI + 1); const d = document.getElementById("dsTourDlg"); if (d) d.innerHTML = tourHTML(); };
  A.dsTourFin = () => document.getElementById("dsTourDlg")?.close();
  A.dsMarco = () => { try { sessionStorage.setItem("dif_pre", JSON.stringify({ tab: "marco", frame: "peregrino" })); } catch {} location.hash = "#/difusion"; };
}
