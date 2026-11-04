// Pastoral Juvenil Ágape — aplicación principal (vistas públicas y enrutador).

import { CONFIG } from "./config.js";
import * as S from "./store.js";
import * as cloud from "./cloud.js";
import { esc, rich, plain, icon, toast, initials } from "./util.js";
import { ORACIONES } from "./devocionario.js";
import * as wall from "./muro.js";
import * as chat from "./chat.js";
import * as avisos from "./avisos.js";
import * as agenda from "./agenda.js";
import * as remoto from "./remoto.js";
import * as portada from "./portada.js";
import * as oremus from "./oremus.js";
import * as capilla from "./capilla.js";
import * as agapeDigital from "./agape-digital.js";
import * as cancionero from "./cancionero.js";
import * as salmos from "./salmos.js";
import * as AV from "./avatares.js";
import * as acompanar from "./acompanar.js";
import * as desafio from "./desafio.js";
import * as fiestas from "./fiestas.js";
import * as descubre from "./descubre.js";
import * as temporadas from "./temporadas.js";
import * as momentos from "./momentos.js";
import * as apariencia from "./apariencia.js";
import * as juegos from "./juegos.js";
import * as podcast from "./podcast.js";
import { cfg as inicioCfg, REDES, BRAND_ICO } from "./inicio-config.js";
import * as solicitud from "./solicitud.js";
import * as conocer from "./conocer.js";
import * as ficha from "./ficha.js";
import * as ayuda from "./ayuda.js";
import * as cuenta from "./cuenta.js";
import * as a11y from "./accesible.js";
import * as grupo from "./grupo.js";
import * as inicio from "./inicio.js";
import * as novedades from "./novedades.js";
import * as papa from "./papa.js";
import * as guia from "./guia.js";
import { illus } from "./ilustraciones.js";

// Secciones que se descargan recién al abrirlas (juegos, imprimir, credenciales, difusión y lo de Gestión):
// así la app abre más rápido, sobre todo con datos móviles. Cada una se prepara una sola vez.
const lazy = (load, init) => { let p = null; return () => p || (p = load().then((m) => { init(m); return m; }).catch((e) => { p = null; throw e; })); };
const mod = {
  emaus: lazy(() => import("./emaus.js"), (m) => m.setup({ actions, onAfterRender, onLeave })),
  memorice: lazy(() => import("./memorice.js"), (m) => m.setup({ actions, onAfterRender, onLeave })),
  mahjong: lazy(() => import("./mahjong.js"), (m) => m.setup({ actions, onAfterRender, onLeave })),
  sopa: lazy(() => import("./sopa.js"), (m) => m.setup({ actions, onAfterRender, onLeave })),
  crucigrama: lazy(() => import("./crucigrama.js"), (m) => m.setup({ actions, onAfterRender, onLeave })),
  frente: lazy(() => import("./frente.js"), (m) => m.setup({ actions, onAfterRender, onLeave })),
  trivia: lazy(() => import("./trivia.js"), (m) => m.setup({ actions, onAfterRender, onLeave })),
  ultima: lazy(() => import("./ultima.js"), (m) => m.setup({ actions, onAfterRender, onLeave, cloud })),
  credenciales: lazy(() => import("./credenciales.js"), (m) => m.setup({ actions, onAfterRender })),
  difusion: lazy(() => import("./difusion.js"), (m) => m.setup({ actions, onAfterRender })),
  inicioAdmin: lazy(() => import("./inicio-admin.js"), (m) => m.setup({ actions, render: () => render(), onAfterRender, cloud })),
  familiasAdmin: lazy(() => import("./familias-admin.js"), (m) => m.setup({ actions, render: () => render(), onAfterRender, cloud })),
  dinamicas: lazy(() => import("./dinamicas.js"), (m) => m.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud })),
  gEq: lazy(() => import("./gestion-equipo.js"), (m) => m.setup({ actions })),
};


const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const viewEl = () => $("#view");

// ---------------------------------------------------------------------------
// Acciones: cualquier elemento con data-action="nombre" dispara actions.nombre
// ---------------------------------------------------------------------------
export const actions = {};
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const fn = actions[t.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(t, e);
});

// ---------------------------------------------------------------------------
// Enrutador por hash (#/recursos, #/oracion, #/red, #/admin/...)
// ---------------------------------------------------------------------------
const routes = [
  [/^\/$/, viewHome, "inicio"],
  [/^\/muro$/, () => wall.viewWall(), "muro"],
  [/^\/agenda$/, () => agenda.viewAgenda(), "agenda"],
  [/^\/agenda\/(\d{4}-\d{2}-\d{2})$/, (d) => agenda.viewAgenda(d), "agenda"],
  [/^\/avisos$/, () => avisos.view(), "muro"],
  [/^\/chat$/, () => chat.viewRooms(), "muro"],
  [/^\/chat\/([A-Za-z0-9_-]+)$/, (k) => chat.viewRoom(k), "muro"],
  [/^\/muro\/([^/]+)$/, (id) => wall.viewPost(id), "muro"],
  [/^\/comunidad$/, () => { location.replace("presentaciones/guia-de-servicio.html"); return null; }, "comunidad"],
  // La formación (cursos, evaluaciones, cuaderno y constancias) se lleva en una aplicación aparte: los enlaces viejos llevan a Recursos.
  [/^\/(?:itinerario|unidad|encuentro|vivir|cuaderno|constancia|verificar|imprimir\/curso)(?:\/.*)?(?:\?.*)?$/, () => { location.replace("#/recursos"); return null; }, "formacion"],
  [/^\/materiales(?:\?f=([a-z]+))?$/, (f) => viewMaterials(f), "materiales"],
  [/^\/oracion$/, () => capilla.view(), "oracion"],
  [/^\/evangelio$/, () => capilla.view({ focus: "gospel" }), "oracion"],
  [/^\/oracion\/([a-z]+)$/, (k) => capilla.view({ focus: k }), "oracion"],
  [/^\/oremus\/libro$/, () => oremus.viewLibro(), "oracion"],
  [/^\/oremus(?:\/([^/?]+))?$/, (t) => capilla.oremusView(t ? decodeURIComponent(t) : ""), "oracion"],
  [/^\/oracion\/velas\/([^/?]+)$/, (id) => capilla.view({ focus: "velas", vela: id }), "oracion"],
  [/^\/recursos$/, () => inicio.viewRecursos(), "formacion"],
  [/^\/formacion$/, () => { location.replace("#/recursos"); return null; }, "formacion"],
  [/^\/solicitar$/, () => solicitud.view(), "perfil"],
  [/^\/conocer(?:\?(.*))?$/, (q) => conocer.view(q || ""), "perfil"],
  [/^\/ficha\/([^/?]+)$/, (id) => ficha.view(decodeURIComponent(id)), "acompanar"],
  [/^\/(?:guia|recorrido|tutorial)(?:\?.*)?$/, () => guia.view(), "formacion"],
  [/^\/red$/, () => { onAfterRender(() => { desafio.homeCard(); momentos.homeStrip(); inicio.refreshInicioCfg(() => { if (location.hash === "#/red") render(); }); }); return inicio.viewRed(); }, "red"],
  [/^\/momentos$/, () => momentos.view(), "red"],
  [/^\/juegos$/, () => juegos.view(), "red"],
  [/^\/juegos\/impostor$/, () => juegos.impostor(), "red"],
  [/^\/juegos\/frente$/, () => mod.frente().then((m) => m.view()), "red"],
  [/^\/juegos\/trivia$/, () => mod.trivia().then((m) => m.view()), "red"],
  [/^\/juegos\/ultima(?:\?(.*))?$/, (q) => mod.ultima().then((m) => m.view(q || "")), "red"],
  [/^\/juegos\/memorice$/, () => mod.memorice().then((m) => m.view()), "red"],
  [/^\/juegos\/emaus(?:\?(.*))?$/, (q) => mod.emaus().then((m) => m.view(q || "")), "red"],
  [/^\/juegos\/mahjong$/, () => mod.mahjong().then((m) => m.view()), "red"],
  [/^\/juegos\/sopa$/, () => mod.sopa().then((m) => m.view()), "red"],
  [/^\/juegos\/crucigrama$/, () => mod.crucigrama().then((m) => m.view()), "red"],
  [/^\/podcast$/, () => podcast.view(), "red"],
  [/^\/credenciales$/, () => mod.credenciales().then((m) => m.view()), "materiales"],
  [/^\/buscar(?:\?q=(.*))?$/, (q) => inicio.viewBuscar(q || ""), "buscar"],
  [/^\/ayuda(?:\?t=([a-z]+))?$/, (t) => ayuda.view(t), "ayuda"],
  [/^\/difusion$/, () => mod.difusion().then((m) => m.view()), "difusion"],
  [/^\/sellos$/, () => descubre.view(), "inicio"],
  [/^\/mesdemaria$/, () => temporadas.viewMaria(), "oracion"],
  [/^\/adviento$/, () => temporadas.viewAdviento(), "oracion"],
  [/^\/accesibilidad$/, () => a11y.viewPage(), "perfil"],
  [/^\/cancionero$/, () => cancionero.viewList(), "oracion"],
  [/^\/salmos$/, () => salmos.viewList(), "oracion"],
  [/^\/salmos\/libro$/, () => salmos.viewLibro(), "oracion"],
  [/^\/salmos\/(\d{1,3})(?:\?e=([a-z]+))?$/, (n, e) => salmos.viewOne(n, e), "oracion"],
  [/^\/dinamicas$/, () => mod.dinamicas().then((m) => m.viewList()), "materiales"],
  [/^\/acompanar$/, () => acompanar.viewMain(), "acompanar"],
  [/^\/acompanar\/(?:asistencia|jovenes|honor)$/, () => { location.replace("#/acompanar"); return null; }, "acompanar"],
  [/^\/acompanar\/joven\/([^/?]+)$/, (id) => acompanar.viewJoven(id), "acompanar"],
  // Lo que se llevó al respaldo (revista, Mi Camino, familias, pasaporte): los enlaces viejos vuelven al inicio.
  [/^\/(?:encuentros|archivo|mi-camino|nuestras-familias|pasaporte)(?:\/.*)?$/, () => { location.replace("#/"); return null; }, "inicio"],
  [/^\/dinamicas\/([^/?]+)$/, (id) => mod.dinamicas().then((m) => m.viewOne(id)), "materiales"],
  [/^\/cancionero\/misa\/([^/?]+)$/, (id) => cancionero.viewMisa(id), "oracion"],
  [/^\/cancionero\/hoja(?:\?misa=([^&]+))?$/, (m) => cancionero.viewHoja(m), "oracion"],
  [/^\/cancionero\/([^/?]+)(?:\?misa=([^&]+))?$/, (id, m) => cancionero.viewSong(id, m), "oracion"],
  [/^\/perfil$/, viewProfile, "perfil"],
  [/^\/admin(?:\/(.*))?$/, viewAdmin, "admin"],
];

let lastPath = null;
// Una vista a la vez: si se pide otra mientras una sección se descarga, se dibuja apenas termine la actual.
let rendering = null, renderAgain = false;
export function render() {
  if (rendering) { renderAgain = true; return rendering; }
  rendering = renderNow().finally(() => { rendering = null; if (renderAgain) { renderAgain = false; render(); } });
  return rendering;
}
async function renderNow() {
  if (!S.content()) return; // aún cargando: el arranque dibuja apenas termina
  S.setPreviewOpen(cloud.enabled && !!cloud.viewingAs());
  const path = decodeURIComponent(location.hash.replace(/^#/, "")) || "/";
  let match = null, fn = viewNotFound, section = "";
  for (const [re, f, sec] of routes) {
    const m = path.match(re);
    if (m) { match = m; fn = f; section = sec; break; }
  }
  leaveHooks.splice(0).forEach((f) => { try { f(); } catch {} });
  if (!cloud.enabled && section !== "admin" && section !== "perfil" && section !== "verificar" && !S.hasProfile()) {
    location.replace("#/perfil"); return;
  }
  // Con cuentas: el muro y los recursos del equipo piden iniciar sesión; el resto de la app queda abierto.
  // La portada de Materiales la ven todos (sin cuenta, solo difusión, música, oración y la biblioteca).
  const recursos = section === "materiales" && path !== "/materiales";
  // Jóvenes de Ingreso y Madurez: las secciones del equipo quedan fuera de su espacio.
  if (cloud.enabled && cloud.state().isJoven && (section === "comunidad" || recursos)) fn = viewSoloEquipo;
  if (cloud.enabled && (section === "muro" || recursos) && !cloud.state().ready) fn = () => viewLogin(recursos ? "recursos" : "muro");
  document.body.classList.toggle("is-admin", section === "admin");
  applyTheme();
  renderChrome(section);
  const html = await fn(...(match ? match.slice(1) : []));
  if (html == null) return;
  const v = viewEl();
  v.innerHTML = (section !== "admin" && S.isPreview() ? previewBanner() : "") + html;
  decorate(v, section);
  volverBotones(v, path);
  apariencia.apply(v, path);
  v.classList.remove("view-enter"); void v.offsetWidth; v.classList.add("view-enter");
  if (path !== lastPath) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (path !== lastPath && cloud.enabled && !cloud.viewingAs() && window.top === window) { const k = vistaDe(path); if (k) cloud.countView(k); }
  // Descubre Ágape: el sello del pasaporte y «Sigue tu camino» al final de cada herramienta
  if (section !== "admin" && window.top === window) { const k = vistaDe(path); if (k) { descubre.marcar(k); descubre.siguiente(v, k); } }
  lastPath = path;
  updateInstallSlot();
  afterRender.splice(0).forEach((f) => f());
  ayuda.afterRender();
  a11y.afterRender();
  grupo.afterRender(section);
  agenda.fillPanels(); // paneles de la Agenda en Hoy y en Comunidad
  helpFab(section);
}
// Lo más visto (Gestión → Estadísticas): a qué sección corresponde cada pantalla.
const VISTA_RUTAS = [
  [/^\/$/, "inicio"], [/^\/evangelio/, "evangelio"], [/^\/oracion\/velas/, "intenciones"], [/^\/oracion\/(rosario|maria)/, "rosario"],
  [/^\/oracion\/silencio/, "rato"], [/^\/oracion\/radio/, "radio"], [/^\/oracion/, "capilla"], [/^\/oremus/, "oremus"], [/^\/salmos/, "salmos"],
  [/^\/cancionero/, "cancionero"], [/^\/red$/, "comunidad"], [/^\/muro/, "muro"], [/^\/chat/, "chat"], [/^\/momentos/, "momentos"],
  [/^\/juegos/, "juegos"], [/^\/podcast/, "podcast"], [/^\/agenda/, "agenda"], [/^\/recursos$/, "formacion"],
  [/^\/(materiales|imprimir|credenciales)/, "materiales"],
  [/^\/dinamicas/, "dinamicas"], [/^\/difusion/, "difusion"], [/^\/ayuda/, "ayuda"], [/^\/buscar/, "buscar"],
];
const vistaDe = (path) => { const p = path.split("?")[0]; const r = VISTA_RUTAS.find(([re]) => re.test(p)); return r ? r[1] : ""; };
// Sin botón flotante: la Ayuda está en el perfil y en el pie de página.
function helpFab() { document.getElementById("helpFab")?.remove(); }
// Identidad visual: ilustración de trazo simple en el encabezado de cada sección.
const HEAD_ILLUS = { formacion: "biblia", red: "amigos", buscar: "pregunta", agenda: "futuro", comunidad: "equipo", itinerario: "camino", materiales: "biblia", oracion: "jesus", muro: "amigos", perfil: "acogida", verificar: "envio", difusion: "envio" };
function decorate(v, section) {
  const hero = v.querySelector(".hero");
  if (hero && !hero.querySelector(".z-illus")) {
    hero.insertAdjacentHTML("afterbegin", '<i class="hero-blob b1"></i><i class="hero-blob b2"></i><i class="hero-blob b3"></i>');
  }
  // Los encabezados ya no llevan ilustración: la app se apoya en la tipografía, el color y el papel.
  void HEAD_ILLUS[section];
  stickers(v);
}
// Dentro de Salmos, Oremus y Cancionero (un salmo, una canción, un librito, la hoja de cantos):
// botones para volver a la entrada de la sección y a la Capilla, arriba (en vez de la ruta) y al final.
const VOLVER = [
  [/^\/salmos\/(\d{1,3}|libro)/, "#/salmos", "Volver a los Salmos"],
  [/^\/oremus\/libro$/, "#/oremus", "Volver a Recemos juntos"],
  [/^\/cancionero\/.+/, "#/cancionero", "Volver al Cancionero"],
];
function volverBotones(v, path) {
  const r = VOLVER.find(([re]) => re.test(path)); if (!r) return;
  const crumbs = v.querySelector(".crumbs");
  const misa = crumbs && [...crumbs.querySelectorAll("a")].find((a) => /\/misa\//.test(a.getAttribute("href") || ""));
  const bar = (cls) => `<nav class="ent-backs no-print ${cls}" aria-label="Volver">
    ${misa ? `<a class="ent-back" href="${esc(misa.getAttribute("href"))}">${icon("left")} Volver a «${esc(misa.textContent.trim())}»</a>` : ""}
    <a class="ent-back${misa ? " is-sec" : ""}" href="${r[1]}">${icon("left")} ${esc(r[2])}</a>
    <a class="ent-back is-sec" href="#/oracion">${icon("flame")} Capilla</a></nav>`;
  if (crumbs) crumbs.outerHTML = bar("is-top"); else v.insertAdjacentHTML("afterbegin", bar("is-top"));
  v.insertAdjacentHTML("beforeend", bar("is-end"));
}
// Stickers (ilustraciones propias de la PJ) en el encabezado de las secciones principales.
const STICKERS = {
  "/": [[".home-hi", "amigos"]],
  "/formacion": [[".page-head", "biblia"]],
  "/red": [[".page-head", "comunidad"]],
  "/oracion": [[".cap-a-hero", "oracion"]], // fuera del arco: el arco recorta lo que sale de su curva
  "/agenda": [[".page-head", "calendario"]],
};
function stickers(v) {
  const path = (location.hash.replace(/^#/, "") || "/").split("?")[0];
  for (const [sel, name, where = "afterbegin"] of STICKERS[path] || []) {
    const host = v.querySelector(sel);
    if (!host || v.querySelector(`.sticker-${name}`)) continue;
    // «beforebegin»: para bloques que se redibujan solos (la Misa de hoy), el sticker va justo antes.
    if (where === "afterbegin") host.classList.add("has-sticker");
    host.insertAdjacentHTML(where, `<img class="sticker sticker-${name}" src="img/stickers/${name}.webp" alt="" loading="lazy" decoding="async">`);
  }
}
const afterRender = [];
export const onAfterRender = (f) => afterRender.push(f);
// Tareas al salir de una vista (p. ej. dejar de escuchar el muro en tiempo real).
const leaveHooks = [];
const onLeave = (f) => leaveHooks.push(f);
window.addEventListener("hashchange", render);

document.addEventListener("agape:color", () => { a11y.apply(); applyTheme(); });
function applyTheme() {
  document.documentElement.dataset.theme = "amanecer";
  const pick = a11y.COLORES.find(([k]) => k && k === a11y.prefs().color);
  const color = pick ? pick[2] : { amanecer: "#1351a4", cenaculo: "#0a2a6e", esperanza: "#0a3a78" }.amanecer;
  $('meta[name="theme-color"]')?.setAttribute("content", color);
}

// ---------------------------------------------------------------------------
// Cabecera, navegación inferior
// ---------------------------------------------------------------------------
// Navegación: Hoy · Recursos · Orar · Comunidad (la Agenda vive dentro de Comunidad)
const NAV = [
  ["inicio", "#/", "Hoy", "home"],
  ["formacion", "#/recursos", "Recursos", "book"],
  ["oracion", "#/oracion", "Orar", "flame"],
  ["red", "#/red", "Comunidad", "users"],
];
// Cada sección se marca en su bloque
const TAB_OF = { materiales: "formacion", muro: "red", comunidad: "formacion", difusion: "formacion", acompanar: "red", agenda: "red" };
const navFor = () => NAV;
// Franja «Ver como…» (solo equipo): recuerda que es una vista de prueba y cómo volver.
const VER_COMO = [["visitante", "Visitante sin cuenta"], ["ingreso", "Joven · Ingreso"], ["madurez", "Joven · Madurez"], ["aspirante", "Aspirante"], ["dirigente", "Dirigente"], ["coordinador", "Coordinador"]];
function viewAsBar() {
  let bar = document.getElementById("viewAsBar");
  const va = cloud.enabled && cloud.viewingAs();
  if (!va) { if (bar) bar.remove(); document.body.classList.remove("has-va"); return; }
  if (!bar) { bar = document.createElement("div"); bar.id = "viewAsBar"; bar.className = "va-bar"; document.body.prepend(bar); }
  document.body.classList.add("has-va");
  const lab = (VER_COMO.find((x) => x[0] === va) || [va, va])[1];
  bar.innerHTML = `<span>${icon("eye")} Estás viendo la app como <b>${esc(lab)}</b>. Tus permisos no cambian: lo que hagas se guarda como tú.</span>
    <span class="va-btns"><button class="btn btn-sm btn-ghost" data-action="vaOpen">Cambiar</button><button class="btn btn-sm btn-gold" data-action="vaSet" data-r="">Volver a mi vista</button></span>`;
}
function vaDialog() {
  let d = document.getElementById("vaDlg");
  if (!d) { d = document.createElement("dialog"); d.id = "vaDlg"; d.className = "sheet"; document.body.appendChild(d); }
  const cur = cloud.viewingAs(), coord = cloud.realRole() === "coordinador";
  d.innerHTML = `<div class="sheet-head"><div style="flex:1"><span class="eyebrow">Para guiar a alguien</span><h2>Ver la app como…</h2></div>
      <button type="button" class="icon-btn" data-action="vaClose" aria-label="Cerrar">${icon("x")}</button></div>
    <div class="sheet-body stack" style="--gap:12px">
      <p class="small muted">Cambia el menú y las secciones para que veas lo mismo que esa persona. No cambia tus permisos ni los datos: si publicas o editas algo, queda a tu nombre.</p>
      <div class="va-opts">${VER_COMO.filter(([k]) => !(coord && k === "coordinador")).map(([k, l]) => `<button class="btn ${cur === k ? "btn-primary" : "btn-soft"}" data-action="vaSet" data-r="${k}">${esc(l)}</button>`).join("")}</div>
      ${cur ? `<button class="btn btn-ghost" data-action="vaSet" data-r="">Volver a mi vista</button>` : ""}
    </div>`;
  d.showModal();
}
actions.vaOpen = () => vaDialog();
actions.vaClose = () => document.getElementById("vaDlg")?.close();
actions.vaSet = (el) => {
  document.getElementById("vaDlg")?.close();
  cloud.setViewAs(el.dataset.r || "");
  toast(el.dataset.r ? "Vista de prueba activada" : "Volviste a tu vista");
  location.hash = "#/";
};
// Redes sociales en el pie de página (se editan en Gestión → Inicio y enlaces).
function paintFootSocial() {
  const box = $("#footSocial"); if (!box) return;
  const r = inicioCfg().redes || {};
  box.innerHTML = Object.keys(REDES).filter((k) => /^https:\/\//.test(r[k] || "")).map((k) =>
    `<a href="${esc(r[k])}" target="_blank" rel="noopener" aria-label="${REDES[k]} de Ágape" title="${REDES[k]}">${BRAND_ICO[k]}</a>`).join("");
}
function renderChrome(section) {
  viewAsBar();
  paintFootSocial();
  const tab = TAB_OF[section] || section;
  const cur = (k) => (k === tab ? 'aria-current="page"' : "");
  const NAV = navFor();
  $("#topNav").innerHTML = NAV.map(([k, h, l]) => `<a href="${h}" data-k="${k}" ${cur(k)}>${l}</a>`).join("");
  $("#bottomNav").innerHTML = NAV.filter((n) => n[4] !== "top").map(([k, h, l, ic]) =>
    `<a href="${h}" data-k="${k}" ${cur(k)}><span class="ico-wrap">${icon(ic)}</span>${l}</a>`).join("");
  const p = S.getProfile();
  const inAdmin = section === "admin" && (cloud.enabled ? cloud.state().isStaff : S.isAdmin());
  const guest = cloud.enabled && !cloud.state().ready;
  $("#profileChip").innerHTML = inAdmin
    ? `<span class="avatar">${icon("gear")}</span><span class="name">Gestión</span>`
    : guest ? `<span class="avatar">${icon("users")}</span><span class="name">Ingresar</span>`
    : `${cloud.enabled && AV.isValid((cloud.state().account || {}).avatar) ? `<span class="chip-av">${AV.svg(cloud.state().account.avatar)}</span>` : `<span class="avatar">${esc(initials(p.name))}</span>`}<span class="name">${esc(p.name || "Mi perfil")}</span>`;
  $("#profileChip").setAttribute("href", inAdmin ? "#/admin" : "#/perfil");
  if (!$("#hdrSearch")) $("#profileChip").insertAdjacentHTML("beforebegin", `<a class="hdr-search" id="hdrSearch" href="#/buscar" aria-label="Buscar en la app" title="Buscar">${icon("search")}</a>`);
  $("#hdrSearch").toggleAttribute("hidden", section === "buscar");
  novedades.mount();
}

function previewBanner() {
  return `<div class="draft-bar no-print" style="margin-bottom:18px">
    ${icon("eye")} Estás viendo la vista previa del borrador. Los dirigentes aún ven la versión publicada.
    <span class="spacer"></span>
    <a class="btn btn-sm btn-ghost" href="#/admin/publicar">Volver a Gestión</a>
  </div>`;
}

// ---------------------------------------------------------------------------
// INICIO
// ---------------------------------------------------------------------------
function heroTitle(t) {
  const words = esc(t).split(" ");
  if (words.length < 2) return words.join(" ");
  const last = words.pop();
  return `${words.join(" ")} <em>${last}</em>`;
}
function viewHome() {
  onAfterRender(() => { novedades.refresh(); inicio.paintGospel(); agenda.homeInvite(); desafio.homeReminder(); fiestas.paintHome(); descubre.paintHome(); temporadas.paintHome(); descubre.tour(); });
  // Lo destacado: las diapositivas de Gestión → Portada (y la intención del Papa). No avanzan solas:
  // se pasan deslizando el dedo o con las flechas.
  const carousel = () => {
    const slides = portada.current().filter((x) => !x.course);
    if (papa.enCarrusel()) slides.splice(Math.min(1, slides.length), 0, { papa: true, label: "Con el Papa" });
    if (!slides.length) return "";
    return `<section class="home-news" id="homeCarousel"><div class="carousel" aria-roledescription="carrusel" aria-label="Destacados">
    <div class="car-track" id="carTrack">${slides.map((x) => (x.papa ? papa.slideHTML() : portada.slideHTML(x))).join("")}</div>
    ${slides.length > 1 ? `<div class="car-ctrl">
      <button class="icon-btn" data-action="carGo" data-d="-1" aria-label="Anterior">${icon("left")}</button>
      <div class="car-dots" role="tablist">${slides.map((x, i) => `<button role="tab" aria-label="${esc((x.label || x.title || "").replace(/\*/g, ""))}" data-action="carTo" data-i="${i}" class="${i ? "" : "on"}"></button>`).join("")}</div>
      <button class="icon-btn" data-action="carGo" data-d="1" aria-label="Siguiente">${icon("right")}</button>
    </div>` : ""}
  </div></section>`;
  };
  onAfterRender(() => portada.refresh().then((changed) => {
    const el = document.getElementById("homeCarousel");
    if (!changed || !el) return;
    el.outerHTML = carousel(); startCarousel(); papa.paintHome().catch(() => {});
  }));
  onAfterRender(startCarousel);
  onAfterRender(() => papa.paintHome().then((r) => {
    const has = !!document.querySelector(".papa-slide");
    if (r && has !== (r.on && !!r.it)) { const el = document.getElementById("homeCarousel"); if (el) { el.outerHTML = carousel(); startCarousel(); papa.paintHome(); } }
  }).catch(() => {}));
  onAfterRender(async () => {
    const list = cuenta.pickAll(await cloud.listAgenda(), 3);
    const slot = document.getElementById("countSlot");
    if (list.length && slot) { slot.innerHTML = list.map((e) => cuenta.html(e, { href: `#/agenda/${e.when}` })).join(""); cuenta.start(); }
  });
  // Hoy: el saludo con el Evangelio, Continuar, lo destacado y las próximas fechas.
  // El resto vive en las pestañas de abajo (Recursos, Orar, Comunidad).
  return `
  ${inicio.greetHTML()}
  <div id="fiestaSlot"></div>
  ${solicitud.homeCard()}
  <div id="desafioHoy"></div>
  <div id="temporadaSlot"></div>
  <div id="descubreSlot"></div>
  ${carousel()}
  <div id="countSlot"></div>
  <div class="ag-panel-slot" data-ag-panel="inicio"></div>
  <div id="famInvSlot"></div>
  ${radiosHTML()}
  ${cloud.enabled && !cloud.state().ready ? `<a class="card link camino-banner" href="presentaciones/se-puente.html" target="_blank" rel="noopener" style="margin-top:16px">
    <span class="tile-ico tile-brand" style="margin:0">${icon("sparkle")}</span>
    <span style="flex:1"><span class="eyebrow">¿Quieres ser dirigente?</span><strong>Sé puente</strong>
    <span class="muted small">Una presentación corta sobre qué es ser dirigente en Ágape.</span></span>${icon("right")}</a>` : ""}
  <div id="installSlot"></div>
  `;
}
// Radios católicas, podcast, playlist y enlaces de interés: una franja liviana al final de Hoy (se abren en la página de cada una).
const RADIO_ICO = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M7 8 17 3.5"/><circle cx="15.5" cy="14" r="2.6"/><path d="M6.5 12.5h4M6.5 15.5h4"/></svg>`;
function radiosHTML() {
  const rs = inicioCfg().radios, pl = inicioCfg().playlist || {};
  onAfterRender(() => inicio.refreshInicioCfg(() => { if (location.hash === "" || location.hash === "#/") render(); }));
  onAfterRender(() => podcast.refreshQuiet(() => { if (podcast.hasEpisodes()) document.querySelector(".hr-pod small")?.remove(); }));
  return `<nav class="home-radios" aria-label="Radios católicas en vivo">
    ${rs.length ? `<span class="hr-lbl">${RADIO_ICO} Radios católicas</span>` : ""}
    <div class="hr-list">${rs.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc([r.name, r.where].filter(Boolean).join(" · "))}"><i class="hr-dot" aria-hidden="true"></i>${esc(r.short || r.name)}</a>`).join("")}</div>
    <span class="hr-more">
      ${podcast.hasEpisodes() ? `<a class="hr-pod" href="#/podcast">${podcast.MIC} Podcast Ágape</a>` : ""}
      ${/^https:\/\//.test(pl.url || "") ? `<a class="hr-pl" href="${esc(pl.url)}" target="_blank" rel="noopener">${BRAND_ICO.spotify} ${esc(pl.label || "Playlist Ágape")}</a>` : ""}
    </span>
  </nav>
  ${(inicioCfg().enlaces || []).length ? `<nav class="home-radios home-links" aria-label="Enlaces de interés">
    <span class="hr-lbl">${LINK_ICO} Enlaces de interés</span>
    <div class="hr-list">${inicioCfg().enlaces.map((r) => `<a href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc([r.name, r.where].filter(Boolean).join(" · "))}">${esc(r.short || r.name)}</a>`).join("")}</div>
  </nav>` : ""}`;
}
const LINK_ICO = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg>`;
let carI = 0;
function startCarousel() {
  const track = document.getElementById("carTrack");
  if (!track) return;
  carI = 0;
  const n = track.children.length;
  const show = (i, anim = true) => {
    carI = Math.max(0, Math.min(n - 1, i)); // sin vuelta circular: al final, se queda en la última
    track.style.transition = anim ? "" : "none";
    track.style.transform = `translateX(${-carI * 100}%)`;
    [...track.children].forEach((s, k) => { s.setAttribute("aria-hidden", k !== carI); s.inert = k !== carI; });
    document.querySelectorAll(".car-dots button").forEach((b, k) => { b.classList.toggle("on", k === carI); b.setAttribute("aria-selected", k === carI); });
  };
  actions.carGo = (el) => show(carI + +el.dataset.d);
  actions.carLead = (el) => { const p = el.previousElementSibling; if (!p) return; const o = p.classList.toggle("open"); el.textContent = o ? "Mostrar menos" : "Leer más"; };
  actions.carTo = (el) => show(+el.dataset.i);
  // La diapositiva sigue al dedo y, al soltar, se acomoda en la más cercana.
  const box = track.parentElement;
  let sx = null, sy = null, dx = 0, horiz = null;
  box.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; horiz = null; }, { passive: true });
  box.addEventListener("touchmove", (e) => {
    if (sx == null) return;
    const mx = e.touches[0].clientX - sx, my = e.touches[0].clientY - sy;
    if (horiz === null && Math.hypot(mx, my) > 8) horiz = Math.abs(mx) > Math.abs(my);
    if (!horiz) return;
    dx = mx;
    const edge = (carI === 0 && dx > 0) || (carI === n - 1 && dx < 0) ? 0.3 : 1; // en los extremos, resiste
    track.style.transition = "none";
    track.style.transform = `translateX(calc(${-carI * 100}% + ${dx * edge}px))`;
  }, { passive: true });
  box.addEventListener("touchend", () => {
    if (sx == null) return;
    const w = box.clientWidth || 1;
    if (horiz && Math.abs(dx) > w * 0.18) show(carI + (dx < 0 ? 1 : -1)); else show(carI);
    sx = null;
  }, { passive: true });
  show(0, false);
  // «Leer más» solo donde el texto quedó cortado
  requestAnimationFrame(() => track.querySelectorAll(".car-more").forEach((b) => { const p = b.previousElementSibling; if (p && !p.classList.contains("open")) b.hidden = p.scrollHeight <= p.clientHeight + 2; }));
}
function tile(href, ic, title, text) {
  return `<a class="card link" href="${href}">
    <div class="tile-ico tile-brand">${icon(ic)}</div>
    <h3>${esc(title)}</h3>
    <p class="muted small" style="margin-top:6px">${esc(text)}</p>
  </a>`;
}

// Convierte texto con párrafos (línea en blanco) y listas ("- ") en HTML seguro.
export function prose(text) {
  return String(text || "").split(/\n\s*\n/).map((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => /^[-•]\s+/.test(l))) {
      return `<ul class="prose-list">${lines.map((l) => `<li>${rich(l.replace(/^[-•]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return `<p>${rich(lines.join(" "))}</p>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// MATERIALES Y ORACIÓN
// ---------------------------------------------------------------------------
function cardHTML(c, kind) {
  const tag = `<span class="chip ${c.type === "crisis" ? "danger" : "accent"}">${esc(c.tag || "")}</span>`;
  const head = `${tag}<h3 style="margin-top:12px">${esc(c.title)}</h3>`;
  if (c.type === "list") {
    return `<article class="card">${head}<ul class="fn-list" style="grid-template-columns:1fr">${(c.items || []).map((i) => `<li class="rich">${rich(i)}</li>`).join("")}</ul></article>`;
  }
  if (c.type === "crisis") {
    const tones = ["ok", "warn", "danger"];
    return `<article class="card">${head}<div class="stack" style="--gap:8px;margin-top:14px">
      ${(c.items || []).map((i, n) => `<div class="note ${tones[n] === "danger" ? "" : tones[n]} rich small" ${tones[n] === "danger" ? 'style="background:var(--danger-soft);color:var(--danger);border-color:transparent"' : ""}>${rich(i)}</div>`).join("")}
    </div></article>`;
  }
  if (c.type === "action") {
    const has = !!(c.url && /^https?:\/\//.test(c.url));
    return `<article class="card" style="display:flex;flex-direction:column">${head}
      <p class="muted small" style="margin:8px 0 16px">${rich(c.text)}</p><span class="spacer"></span>
      ${has ? `<a class="btn btn-primary btn-block" href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.btnText || "Abrir")} ${icon("arrowR")}</a>`
            : `<button class="btn btn-ghost btn-block" disabled>${esc(c.btnText || "Abrir")} · próximamente</button>`}
    </article>`;
  }
  if (kind === "prayer") {
    return `<article class="card">${head}<div class="prayer prose-pre" style="text-align:left;font-size:1.08rem">${rich(c.text)}</div></article>`;
  }
  return `<article class="card">${head}<p class="muted small rich prose-pre" style="margin-top:8px">${rich(c.text)}</p></article>`;
}
function viewMaterials(abrir) {
  // Desde Recursos se puede llegar con un fichero abierto (#/materiales?f=presentaciones)
  if (abrir) { fiOpen.add(abrir); onAfterRender(() => document.getElementById("fi-" + abrir)?.scrollIntoView({ behavior: "smooth", block: "start" })); }
  const m = S.content().materials;
  const lib = buildLibrary();
  const row = (href, ic, title, sub, ext) => `<a class="fi-row" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ""}>
      <span class="fi-ico">${icon(ic)}</span><span class="fi-txt"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>${icon(ext ? "arrowR" : "right")}</a>`;
  const guide = (c) => {
    if (c.type === "action") {
      const has = !!(c.url && /^https?:\/\//.test(c.url));
      return has ? row(esc(c.url), "print", c.title, c.tag || "", true)
        : `<div class="fi-row is-off"><span class="fi-ico">${icon("print")}</span><span class="fi-txt"><b>${esc(c.title)}</b><small>Próximamente</small></span></div>`;
    }
    return `<details class="fi-det"><summary class="fi-row"><span class="fi-ico">${icon(c.type === "list" ? "route" : c.type === "crisis" ? "users" : "edit")}</span>
      <span class="fi-txt"><b>${esc(c.title)}</b>${c.tag ? `<small>${esc(c.tag)}</small>` : ""}</span>${icon("down")}</summary>
      <div class="fi-open">${cardHTML(c, "material")}</div></details>`;
  };
  const guides = (m.cards || []).filter((c) => c.type !== "action"), prints = (m.cards || []).filter((c) => c.type === "action");
  // Sin cuenta (y los jóvenes): difusión, música, oración y la biblioteca digital. El resto es del equipo.
  const st0 = cloud.enabled ? cloud.state() : { ready: true }, guest = cloud.enabled && !st0.ready;
  const full = !cloud.enabled || (!!st0.ready && !st0.isJoven);
  const OPEN = ["difusion", "musica", "oracion"];
  const FILES = [
    ["presentaciones", "Presentaciones", "#ef591c", "Para proyectar a pantalla completa.", [
      row("presentaciones/se-puente.html", "sparkle", "Sé puente", "Para invitar a futuros dirigentes", true),
      row("presentaciones/el-arte-de-encontrarnos.html", "grid", "El Arte de Encontrarnos", "Para el consejo pastoral, el párroco y las familias", true),
      row("presentaciones/mes-de-maria.html", "flame", "Mes de María", "Con María, puente hacia Jesús · 31 días", true),
      row("presentaciones/orar-con-la-palabra.html", "book", "Orar con la Palabra", "Leer, meditar, hablar con Dios y actuar: 4 pasos para orar con la Biblia", true),
      row("presentaciones/sacramentos.html", "sparkle", "Los Sacramentos", "Qué es un sacramento y los siete, explicados en simple", true),
      row("presentaciones/guia-de-servicio.html", "users", "Guía de servicio", "Identidad, métodos, roles, cargos y reuniones de la pastoral", true),
    ]],
    ["difusion", "Difusión", "#9bbf8a", "Para invitar y compartir en Estados, historias y grupos.", [
      row("#/difusion", "sparkle", "Estudio de difusión", "Marco de foto, historias, invitaciones, fondos de pantalla y stickers"),
    ]],
    ["musica", "Música", "#ffba03", "Para animar las celebraciones.", [
      row("#/cancionero", "book", "Cancionero Ágape", guest ? "Las canciones originales de Ágape. Con tu cuenta, el cancionero completo." : "Acordes, cambio de tono, proyección y repertorios"),
    ]],
    ["oracion", "Oración", "#1351a4", "Para rezar solos o en el encuentro.", [
      row("#/oremus", "book", "Recemos juntos", "Nuestras oraciones y las de siempre, en un solo lugar"),
      row("#/salmos", "book", "Oremos con los salmos", "Un salmo para cada momento y cómo rezarlo paso a paso"),
    ]],
    ["guias", "Guías para el encuentro", "#8ad2fa", "Pautas breves para preparar y acompañar cada reunión.", [
      row("#/dinamicas", "sparkle", "Banco de dinámicas", "Rompehielos, juegos, oración y reflexión, por para qué sirven"), ...guides.map(guide)]],
    ["imprimir", "Para imprimir", "#fde0d2", "Listos para llevar en papel.", [
      row("#/credenciales", "award", "Credenciales", "Tarjetas de solapa con foto, nombre y parroquia para los encuentros"),
      row("#/cancionero", "print", "Cancionero en PDF", "Desde el cancionero: Exportar → PDF"),
      ...prints.map(guide),
    ]],
  ].map((f) => { f[4] = f[4].filter(Boolean); return f; }).filter((f) => f[4].length && (full || OPEN.includes(f[0])));
  return `<header class="page-head"><span class="eyebrow">Herramientas de la pastoral</span><h1>${esc(full ? m.title : "Materiales")}</h1><p>${esc(full ? m.desc : "Para invitar a otros, cantar, rezar y conocer más nuestra fe.")}</p></header>
    ${guest ? `<p class="fi-hint">Con tu cuenta se abren también las presentaciones, guías y dinámicas del equipo.</p>` : ""}
    <p class="fi-hint">Toca un fichero para abrirlo.</p>
    <div class="fi-grid">${FILES.map(([k, t, col, d, items, count], i) => `
      <details class="fichero" id="fi-${k}" style="--fi:${col}" ${fiOpen.has(k) ? "open" : ""} data-fi="${k}">
        <summary class="fi-sum"><span class="fi-tab">Fichero ${String(i + 1).padStart(2, "0")}</span>
          <span class="fi-head"><h2>${esc(t)}</h2>${count === null ? "" : `<span class="fi-count">${items.length}</span>`}<span class="fi-chev" aria-hidden="true">${icon("down")}</span></span></summary>
        <p class="fi-desc">${esc(d)}</p>
        <div class="fi-list">${items.join("")}</div>
      </details>`).join("")}
      ${libraryHTML(lib, FILES.length + 1)}
    </div>`;
}
// Ficheros desplegables: se recuerda cuáles quedaron abiertos (en esta pestaña), así al volver siguen igual.
const fiOpen = new Set((() => { try { return JSON.parse(sessionStorage.getItem("agape_fi_open") || "[]"); } catch { return []; } })());
document.addEventListener("toggle", (e) => {
  const d = e.target; if (!d.matches || !d.matches("details.fichero[data-fi]")) return;
  d.open ? fiOpen.add(d.dataset.fi) : fiOpen.delete(d.dataset.fi);
  try { sessionStorage.setItem("agape_fi_open", JSON.stringify([...fiOpen])); } catch {}
}, true);
actions.fiGo = (el) => document.getElementById("fi-" + el.dataset.k)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

// ---------------------------------------------------------------------------
// BIBLIOTECA DIGITAL: se arma sola con los recursos y documentos citados en los contenidos de formación
// ---------------------------------------------------------------------------
const LIB_GROUPS = [
  ["biblia", "Biblia y Catecismo", "Para leer y orar la Palabra, y consultar la fe de la Iglesia."],
  ["magisterio", "Documentos de la Iglesia", "Exhortaciones, encíclicas y documentos del Papa y del Sínodo."],
  ["pj", "Pastoral juvenil", "Orientaciones de la pastoral juvenil latinoamericana y chilena."],
  ["cuidado", "Ambientes sanos y seguros", "Orientaciones y materiales de prevención de la Iglesia en Chile."],
  ["ayuda", "Salud mental y redes de ayuda", "Líneas de apoyo gratuitas y orientación en salud."],
  ["otros", "Otros recursos", ""],
];
function libGroup(url) {
  const u = String(url).toLowerCase();
  if (/catechism|esl0506|biblia/.test(u)) return "biblia";
  if (/prevenirabusos|iglesiadesantiago.*ambientes/.test(u)) return "cuidado";
  if (/minsal|saludresponde|4141/.test(u)) return "ayuda";
  if (/pastoraljuvenil|celam|capym/.test(u)) return "pj";
  if (/vatican\.va/.test(u)) return "magisterio";
  return "otros";
}
// Nombre y descripción de los documentos más citados (si no está aquí, se usa lo que dice la unidad).
const LIB_META = [
  ["christus-vivit", "Christus vivit", "Exhortación del papa Francisco a los jóvenes y a todo el pueblo de Dios (2019)."],
  ["evangelii-gaudium", "Evangelii gaudium", "Exhortación del papa Francisco sobre el anuncio del Evangelio en el mundo actual (2013)."],
  ["gaudete-et-exsultate", "Gaudete et exsultate", "Exhortación del papa Francisco sobre la llamada a la santidad hoy (2018)."],
  ["fratelli-tutti", "Fratelli tutti", "Encíclica del papa Francisco sobre la fraternidad y la amistad social (2020)."],
  ["verbum-domini", "Verbum Domini", "Exhortación de Benedicto XVI sobre la Palabra de Dios; incluye la lectio divina (2010)."],
  ["dilexi-te", "Dilexi te", "Exhortación del papa León XIV sobre el amor a los pobres (2025)."],
  ["veglia-tor-vergata", "León XIV: vigilia con los jóvenes en Tor Vergata", "Discurso del Jubileo de los Jóvenes sobre la amistad en Cristo (2025)."],
  ["synod_doc_20181027", "Documento final del Sínodo sobre los jóvenes", "Los jóvenes, la fe y el discernimiento vocacional (2018)."],
  ["esl0506", "Biblia · El Libro del Pueblo de Dios", "Traducción latinoamericana de la Biblia, en el sitio del Vaticano."],
  ["catechism_sp/p4s1", "Catecismo: La oración cristiana", "Cuarta parte del Catecismo de la Iglesia Católica."],
  ["catechism_sp/index", "Catecismo de la Iglesia Católica", "Índice completo del Catecismo en español."],
  ["capym", "Civilización del Amor. Proyecto y misión", "Orientaciones del CELAM para la Pastoral Juvenil latinoamericana."],
  ["pastoraljuvenil.cl", "Comisión Nacional de Pastoral Juvenil", "Noticias, documentos y subsidios de la Pastoral Juvenil de Chile."],
  ["prevenirabusos/ise", "Integridad en el Servicio Eclesial (ISE)", "Orientaciones de la Conferencia Episcopal de Chile para el servicio pastoral (2020)."],
  ["ise.pdf", "Integridad en el Servicio Eclesial · PDF", "Texto completo para descargar."],
  ["folleto_base", "Ambientes sanos, seguros y de buen trato", "Folleto para responsables de grupos y comunidades."],
  ["recursos_int", "Recursos de prevención de la Iglesia de Chile", "Materiales de difusión y formación en prevención."],
  ["4141", "Línea de apoyo *4141", "Ministerio de Salud. Gratuita, las 24 horas."],
  ["saludresponde", "Salud Responde · 600 360 7777", "Orientación en salud del Ministerio de Salud, incluida salud mental."],
];
const libMeta = (url) => { const u = url.toLowerCase(); return LIB_META.find(([k]) => u.includes(k)); };
const cleanSource = (src) => String(src || "").replace(/\s+\d[\d\s,.\-–y]*$/, "").replace(/\s*\(.*?\)\s*$/, "").trim();
function buildLibrary() {
  const byUrl = new Map();
  // La biblioteca junta los documentos oficiales que citan todos los cursos (también los ocultos o
  // dirigidos a otros roles): son enlaces públicos, útiles para cualquiera.
  const all = (S.isPreview() ? S.getDraft() : S.publishedContent()) || S.content();
  ((all && all.courses) || []).forEach((course) => course.phases.forEach((ph, pi) => ph.sessions.forEach((se) => {
    const cite = { course: course.id, courseTitle: course.title, pi, id: se.id, title: se.title };
    const add = (url, title, note, weight) => {
      if (!url || !/^https?:\/\//.test(url)) return;
      const key = url.replace(/[#?].*$/, "").replace(/\/$/, "");
      let e = byUrl.get(key);
      if (!e) { e = { url, title, note: note || "", weight, cites: [] }; byUrl.set(key, e); }
      if (weight > e.weight && title) { e.title = title; e.weight = weight; }
      if (!e.note && note) e.note = note;
      if (!e.cites.some((c) => c.course === cite.course && c.id === cite.id)) e.cites.push(cite);
    };
    (se.resources || []).forEach((r) => add(r.url, r.title, r.note, 2));
    (se.church || []).forEach((c) => add(c.url, cleanSource(c.source), "", 1));
  })));
  const items = [...byUrl.values()].map((e) => {
    const m = libMeta(e.url);
    const title = m ? m[1] : e.title.replace(/,\s*(capítulo|números?|número)\b.*$/i, "").replace(/:\s*(capítulo|números?)\b.*$/i, "");
    const note = m ? m[2] : (/\b(números?|lee|capítulo)\b/i.test(e.note) ? "" : e.note);
    const cites = [...e.cites].sort((x, y) => x.course.localeCompare(y.course) || x.pi - y.pi || x.id.localeCompare(y.id, "es", { numeric: true }));
    return { ...e, title, note, cites, group: libGroup(e.url) };
  });
  items.sort((a, b) => b.cites.length - a.cites.length || a.title.localeCompare(b.title, "es"));
  return { total: items.length, groups: LIB_GROUPS.map(([k, t, d]) => ({ k, t, d, items: items.filter((i) => i.group === k) })).filter((g) => g.items.length) };
}
function libraryHTML(lib, num = 6) {
  if (!lib.total) return "";
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  return `
  <details id="fi-biblioteca" class="fichero fi-lib" style="--fi:#0b2566" ${fiOpen.has("biblioteca") ? "open" : ""} data-fi="biblioteca">
    <summary class="fi-sum"><span class="fi-tab">Fichero ${String(num).padStart(2, "0")}</span>
      <span class="fi-head"><h2>Biblioteca digital</h2><span class="fi-count">${lib.total}</span><span class="fi-chev" aria-hidden="true">${icon("down")}</span></span></summary>
    <p class="fi-desc">Documentos de la Iglesia y recursos para profundizar, cada uno con el enlace a su fuente oficial.</p>
    <label class="search" style="display:block;margin:12px 0 4px">
      ${icon("search")}<span class="sr-only">Buscar en la biblioteca</span>
      <input id="libSearch" type="search" placeholder="Buscar: Christus vivit, Catecismo, Biblia…" autocomplete="off">
    </label>
    <div class="lib-cols">${lib.groups.map((g) => `
      <div class="lib-group" data-lib-group>
        <h3 class="lib-h">${esc(g.t)}</h3>
        <ul class="lib-simple">${g.items.map((it) => `<li class="lib-item" data-lib="${esc((it.title + " " + host(it.url)).toLowerCase())}">
          <a href="${esc(it.url)}" target="_blank" rel="noopener"><b>${esc(it.title)}</b><span>${esc(host(it.url))} ↗</span></a></li>`).join("")}</ul>
      </div>`).join("")}</div>
    <p class="xs muted lib-empty" id="libEmpty" hidden>Nada coincide con la búsqueda.</p>
  </details>`;
}
document.addEventListener("input", (e) => {
  if (e.target.id !== "libSearch") return;
  const q = e.target.value.trim().toLowerCase();
  let any = 0;
  $$("[data-lib-group]").forEach((g) => {
    let n = 0;
    g.querySelectorAll(".lib-item").forEach((it) => { const hit = !q || it.dataset.lib.includes(q); it.hidden = !hit; if (hit) n++; });
    g.hidden = !n; any += n;
  });
  $("#libEmpty").hidden = !!any;
});
// ---------------------------------------------------------------------------
// PERFIL / BIENVENIDA
// ---------------------------------------------------------------------------
function viewProfile() {
  if (cloud.enabled) return viewAccount();
  const p = S.getProfile();
  const isNew = !p.name;
  return `
  <div class="welcome">
    ${isNew ? `<section class="hero" style="margin-bottom:18px;text-align:center">
      <img class="welcome-logo" src="icons/logo-320.webp" width="116" height="116" alt="Logo Ágape Joven PJ">
      <span class="eyebrow">Bienvenido a Ágape</span>
      <h1>Pasa, estás en <em>casa</em></h1>
      <p class="lead">Cuéntanos quién eres.</p>
    </section>` : `<header class="page-head"><span class="eyebrow">Mi perfil</span><h1>${esc(p.name)}</h1></header>`}
    <form class="card stack" id="profileForm" style="--gap:14px">
      <div class="field"><label for="pfName">Nombre y apellido</label>
        <input class="input big" id="pfName" name="name" required autocomplete="name" value="${esc(p.name)}" placeholder="Ej: Camila Soto"></div>
      <div class="field"><label for="pfParish">Capilla o parroquia</label>
        <input class="input big" id="pfParish" name="parish" value="${esc(p.parish)}" placeholder="Ej: Parroquia San José"></div>
      <p class="xs muted">Tus datos se guardan en este dispositivo.</p>
      <button class="btn btn-primary btn-block" type="submit">${isNew ? "Comenzar" : "Guardar cambios"}</button>
    </form>
    ${!isNew ? `${a11y.panelHTML()}<div id="installSlot" style="margin-top:14px"></div>
      <p class="xs muted" style="text-align:center;margin-top:18px">¿Eres del equipo coordinador? <a href="#/admin">Entrar a Gestión</a></p>` : ""}
  </div>`;
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "profileForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get("name") || "").trim();
  if (!name) return;
  const wasNew = !S.hasProfile();
  S.saveProfile({ name, parish: String(f.get("parish") || "").trim() });
  toast(wasNew ? `¡Bienvenido, ${name.split(" ")[0]}!` : "Perfil actualizado");
  location.hash = wasNew ? "#/" : "#/perfil";
  if (!wasNew) render();
});

function viewNotFound() {
  return `<div class="card" style="text-align:center;padding:40px"><h2 class="display">No encontramos esta página</h2>
    <a class="btn btn-primary" style="margin-top:16px" href="#/">Volver al inicio</a></div>`;
}


// ---------------------------------------------------------------------------
// CUENTAS (cuando Firebase está configurado)
// ---------------------------------------------------------------------------
function viewSoloEquipo() {
  return `<div class="card" style="max-width:520px;margin:6vh auto 0;text-align:center;padding:32px">
    ${illus("camino", "")}
    <h1 class="display" style="font-size:1.6rem;margin-top:10px">Esto es para el equipo de dirigentes</h1>
    <p class="muted" style="margin-top:8px">Tu espacio está en la comunidad: el muro, el chat, la agenda, los juegos y la capilla.</p>
    <a class="btn btn-primary" style="margin-top:16px" href="#/red">Ir a Comunidad</a></div>`;
}
function viewLogin(kind = "cuenta") {
  const st = cloud.state();
  const R = kind === "recursos", MU = kind === "muro";
  const msg = {
    "not-invited": `<h2 class="display">Tu correo aún no tiene cuenta</h2>
      <p class="muted" style="margin-top:8px">Entraste como <b>${esc(st.user?.email || "")}</b>. Si quieres formar parte o ya participas de Ágape, solicita tu cuenta con un formulario corto.</p>
      <div class="row-wrap" style="justify-content:center;margin-top:18px"><button class="btn btn-ghost" data-action="signOut">Usar otra cuenta</button><a class="btn btn-primary" href="#/solicitar">Solicitar mi cuenta</a></div>`,
    inactive: `<h2 class="display">Tu cuenta está en pausa</h2>
      <p class="muted" style="margin-top:8px">Conversa con el equipo coordinador para reactivarla.</p>
      <button class="btn btn-ghost" style="margin-top:18px" data-action="signOut">Cerrar sesión</button>`,
    loading: `<h2 class="display">Conectando…</h2>`,
    error: `<h2 class="display">No pudimos conectar tu cuenta</h2>
      <p class="muted" style="margin-top:8px">Revisa tu conexión e inténtalo de nuevo.${st.error ? ` <span class="xs">(${esc(st.error)})</span>` : ""}</p>
      <button class="btn btn-primary" style="margin-top:18px" data-action="signIn">${icon("users")} Reintentar</button>`,
  }[st.status];
  return `<div class="welcome">
    <section class="hero" style="margin-bottom:18px;text-align:center">
      <img class="welcome-logo" src="icons/logo-320.webp" width="116" height="116" alt="Logo Ágape Joven PJ">
      <span class="eyebrow">${MU ? "Muro y chat" : R ? "Materiales" : "Tu cuenta"}</span>
      <h1>${MU ? `Lo que conversa el <em>grupo</em>` : R ? `Recursos para <em>dirigentes</em>` : `Tu casa en <em>Ágape</em>`}</h1>
      <p class="lead">${MU ? "El muro y el chat son del grupo: para cuidar a los jóvenes, solo los ven quienes tienen cuenta. Ingresa con tu cuenta de Google." : R ? "Las presentaciones, las guías y el banco de dinámicas son para quienes tienen cuenta. Ingresa con tu cuenta de Google para verlos." : "Ingresa con tu cuenta de Google para entrar a los espacios del grupo: el muro, el chat, las intenciones y tu perfil."}</p>
    </section>
    <div class="card" style="text-align:center;padding:28px">
      ${msg || `<button class="btn btn-primary btn-block google-btn" data-action="signIn">${googleIcon()} Continuar con Google</button>
        <p class="xs muted" style="margin-top:12px">¿Aún no tienes cuenta? <a href="#/solicitar"><b>Solicítala aquí</b></a>.</p>`}
      <p class="small" style="margin-top:14px">¿Aún no eres dirigente? <a href="presentaciones/se-puente.html" target="_blank" rel="noopener"><b>Mira «Sé puente»</b></a></p>
    </div>
  </div>`;
}
const googleIcon = () => `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
actions.signIn = async () => { try { await cloud.signIn(); } catch { toast("No se pudo iniciar sesión", ""); } };
actions.signOut = async () => {
  if (cloud.state().ready && !confirm("¿Cerrar sesión en este dispositivo? Tu avance queda guardado en tu cuenta.")) return;
  await cloud.signOutUser(); location.hash = "#/"; render();
};
actions.retryAccount = async () => { await cloud.signOutUser(); await cloud.signIn(); };

function viewAccount() {
  const st = cloud.state();
  if (!st.ready) return viewLogin();
  const a = st.account;
  const fila = (href, ic, t, extra = "") => `<a class="pf-row" href="${href}" ${extra}>${icon(ic)}<span>${t}</span>${icon("right")}</a>`;
  return `<div class="welcome pf">
    <header class="pf-head">
      <span class="pf-av">${AV.isValid(a.avatar) ? AV.svg(a.avatar) : `<span class="avatar">${esc(initials(a.name))}</span>`}</span>
      <div><h1>${esc(a.name)}</h1><span class="chip ${cloud.isStaffRole(a.role) ? "warn" : "accent"}">${esc(cloud.roleLabel(a.role))}</span></div>
    </header>
    <section class="pf-sec"><h2>Mi cuenta</h2>
      <details class="pf-det"><summary>${icon("edit")}<span>Mis datos</span>${icon("down")}</summary>
        <form class="stack" id="accountForm" style="--gap:14px;margin-top:12px">
          <p class="small muted">${esc(a.email)}</p>
          <div class="field"><label for="acName">Nombre y apellido</label><input class="input big" id="acName" name="name" required value="${esc(a.name)}"></div>
          <div class="field"><label for="acParish">Capilla o parroquia</label><input class="input big" id="acParish" name="parish" value="${esc(a.parish || "")}"></div>
          <p class="xs muted">Tu nombre se muestra a la comunidad con la inicial del apellido.</p>
          <button class="btn btn-primary btn-block" type="submit">Guardar cambios</button>
        </form></details>
      <details class="pf-det"><summary>${icon("users")}<span>Mi avatar</span>${icon("down")}</summary><section class="av-card" id="avCard">${avPicker()}</section></details>
      <details class="pf-det" ${myCum === false ? "hidden" : ""} id="cumDet"><summary>${icon("cal")}<span>Mi cumpleaños</span>${icon("down")}</summary><section class="cum-card" id="cumCard">${cumCardHTML()}</section></details>
      <details class="pf-det"><summary>${icon("eye")}<span>Accesibilidad</span>${icon("down")}</summary>${a11y.panelHTML()}</details>
      ${fila("#/ayuda", "book", "Ayuda")}
    </section>
    ${st.isGuide ? `<section class="pf-sec"><h2>Equipo</h2>
      ${fila("#/acompanar", "check", "Jóvenes y fichas")}
      ${fila("#/admin", "gear", "Gestión")}
      ${st.isStaff ? `<button class="pf-row" data-action="vaOpen">${icon("eye")}<span>Ver la app como…</span>${icon("right")}</button>` : ""}
    </section>` : ""}
    <button class="btn btn-ghost pf-out" data-action="signOut">${icon("out")} Cerrar sesión</button>
    <div id="installSlot" style="margin-top:14px"></div>
  </div>`;
}
// Mi cumpleaños (Mi cuenta): cada uno elige si lo comparte con la comunidad (solo día y mes).
let myCum = undefined; // undefined: cargando · null: no compartido · "MM-DD"
function cumCardHTML() {
  if (myCum === undefined) onAfterRender(() => cloud.getMyCumple().then((md) => { myCum = md; const c = document.getElementById("cumCard"); if (c) c.innerHTML = cumCardHTML(); const det = document.getElementById("cumDet"); if (det) det.hidden = md === false; }));
  if (myCum === false) return ""; // las reglas aún no están publicadas: la tarjeta no se muestra
  const head = `<h3>Mi cumpleaños</h3><p class="muted small">Si lo compartes, aparece en la Agenda y en Inicio para que la comunidad te salude. Solo se ve el día y el mes, con tu nombre e inicial.</p>`;
  if (!cloud.canShareCumple()) return `${head}<p class="note small" style="margin-top:10px">Para mostrar tu cumpleaños, tu familia tiene que autorizarlo en el consentimiento. Pídeselo a tu dirigente.</p>`;
  if (myCum === undefined) return `${head}<p class="muted small" style="margin-top:10px">Cargando…</p>`;
  const [mm, dd] = myCum ? myCum.split("-") : ["", ""];
  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${head}
    <form id="cumForm" class="row-wrap" style="margin-top:12px;gap:8px;align-items:flex-end">
      <div class="field" style="min-width:90px"><label for="cumD">Día</label><select class="select" id="cumD" name="d" required><option value="">—</option>${Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => `<option value="${d}" ${d === dd ? "selected" : ""}>${+d}</option>`).join("")}</select></div>
      <div class="field" style="min-width:150px"><label for="cumM">Mes</label><select class="select" id="cumM" name="m" required><option value="">—</option>${MES.map((m, i) => { const v = String(i + 1).padStart(2, "0"); return `<option value="${v}" ${v === mm ? "selected" : ""}>${m}</option>`; }).join("")}</select></div>
      <button class="btn btn-primary" type="submit">${myCum ? "Actualizar" : "Compartir mi cumpleaños"}</button>
      ${myCum ? `<button class="btn btn-ghost" type="button" data-action="cumDel">Dejar de compartirlo</button>` : ""}
    </form>
    ${myCum ? `<p class="xs muted" style="margin-top:8px">Compartido: ${+dd} de ${MES[+mm - 1]}.</p>` : ""}`;
}
const DIAS_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "cumForm") return;
  e.preventDefault();
  const f = new FormData(e.target), d = String(f.get("d") || ""), m = String(f.get("m") || "");
  if (!d || !m) return;
  if (+d > DIAS_MES[+m - 1]) { toast("Ese mes no tiene ese día. Revisa la fecha.", ""); return; }
  try { await cloud.setMyCumple(`${m}-${d}`); myCum = `${m}-${d}`; toast("¡Listo! Tu cumpleaños quedó en la Agenda", "ok"); }
  catch (err) { console.warn(err); toast("No se pudo guardar todavía. Avísale al equipo.", ""); }
  const c = document.getElementById("cumCard"); if (c) c.innerHTML = cumCardHTML();
});
actions.cumDel = async () => {
  if (!confirm("¿Dejar de compartir tu cumpleaños?")) return;
  try { await cloud.setMyCumple(null); myCum = null; toast("Tu cumpleaños ya no se muestra"); } catch { toast("No se pudo quitar", ""); }
  const c = document.getElementById("cumCard"); if (c) c.innerHTML = cumCardHTML();
};
// Selector de avatar (Mi cuenta): arma tu monito, elige un personaje o un sticker de la comunidad
let avDraft = null, avKey = null, avTab = null;
function avPicker() {
  const a = cloud.state().account || {};
  if (!avDraft) avDraft = AV.parse(a.avatar) || AV.parse(AV.randomKey());
  if (!avTab) avTab = AV.kind(a.avatar) || "m";
  if (!avKey) avKey = AV.isValid(a.avatar) ? a.avatar : AV.keyOf(avDraft);
  const key = avKey, saved = a.avatar === key;
  const swatch = (k, colors) => colors.map((c, i) => `<button class="av-sw ${avDraft[k] === i ? "on" : ""}" style="--c:${c}" data-action="avSet" data-k="${k}" data-v="${i}" aria-label="${AV.OPTS[k].label} ${i + 1}"></button>`).join("");
  const mini = (k) => Array.from({ length: AV.OPTS[k].n }, (_, i) => `<button class="av-mini ${avDraft[k] === i ? "on" : ""}" data-action="avSet" data-k="${k}" data-v="${i}" title="${esc(AV.OPTS[k].names[i])}">${AV.svg(AV.keyOf({ ...avDraft, [k]: i }))}</button>`).join("");
  const grid = (pre, keys, names) => `<div class="av-grid">${keys.map((k) => `<button class="av-pick ${key === pre + k ? "on" : ""}" data-action="avPick" data-key="${pre}${k}" title="${esc(names[k])}">${AV.svg(pre + k)}<small>${esc(names[k])}</small></button>`).join("")}</div>`;
  const tab = (t, l) => `<button class="av-tab ${avTab === t ? "on" : ""}" data-action="avTab" data-t="${t}" role="tab" aria-selected="${avTab === t}">${l}</button>`;
  const body = avTab === "j" ? `<p class="muted small">Personajes con onda para representarte.</p>${grid("j:", AV.PJ_KEYS, Object.fromEntries(AV.PJ_KEYS.map((k) => [k, AV.PJ[k][0]])))}`
    : avTab === "k" ? `<p class="muted small">Los mismos dibujos de nuestros stickers: Jesús, María, los santos y la comunidad.</p>${grid("k:", AV.STK_KEYS, AV.STK)}`
    : `<div class="av-row"><span>${AV.OPTS.h.label}</span><div>${mini("h")}</div></div>
    <div class="av-row"><span>${AV.OPTS.c.label}</span><div>${swatch("c", AV.HAIRC)}</div></div>
    <div class="av-row"><span>${AV.OPTS.s.label}</span><div>${swatch("s", AV.SKIN)}</div></div>
    <div class="av-row"><span>${AV.OPTS.f.label}</span><div>${mini("f")}</div></div>
    <div class="av-row"><span>${AV.OPTS.x.label}</span><div>${mini("x")}</div></div>
    <div class="av-row"><span>${AV.OPTS.r.label}</span><div>${mini("r")}</div></div>
    <div class="av-row"><span>${AV.OPTS.b.label}</span><div>${mini("b")}</div></div>`;
  return `<div class="av-head"><div class="av-big">${AV.svg(key)}</div>
      <div style="flex:1;min-width:180px"><h3>Mi avatar</h3><p class="muted small">Aparece junto a tu nombre en el chat, el muro y la lista de quienes están en línea.</p>
        <div class="row-wrap" style="margin-top:10px">${avTab === "m" ? `<button class="btn btn-sm btn-ghost" data-action="avRandom">Al azar</button>` : ""}
        <button class="btn btn-sm ${saved ? "btn-soft" : "btn-primary"}" data-action="avSave" ${saved ? "disabled" : ""}>${saved ? "Guardado ✓" : "Guardar avatar"}</button></div></div></div>
    <div class="av-tabs" role="tablist">${tab("m", "Arma tu monito")}${tab("j", "Personajes")}${tab("k", "Stickers")}</div>
    ${body}`;
}
const repaintAv = () => { const c = $("#avCard"); if (c) c.innerHTML = avPicker(); };
actions.avSet = (el) => { avDraft = { ...avDraft, [el.dataset.k]: +el.dataset.v }; avKey = AV.keyOf(avDraft); repaintAv(); };
actions.avRandom = () => { avDraft = AV.parse(AV.randomKey()); avKey = AV.keyOf(avDraft); repaintAv(); };
actions.avTab = (el) => { avTab = el.dataset.t; if (avTab === "m") avKey = AV.keyOf(avDraft); repaintAv(); };
actions.avPick = (el) => { avKey = el.dataset.key; repaintAv(); };
actions.avSave = async () => {
  try { await cloud.updateMyProfile({ avatar: avKey }); toast("¡Avatar guardado!"); render(); }
  catch { toast("No se pudo guardar. Revisa tu conexión.", ""); }
};
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "accountForm") return;
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get("name") || "").trim();
  if (!name) return;
  try { await cloud.updateMyProfile({ name, parish: String(f.get("parish") || "").trim() }); toast("Perfil actualizado"); render(); }
  catch { toast("No se pudo guardar. Revisa tu conexión.", ""); }
});

async function viewAdmin(sub = "") {
  const [m] = await Promise.all([import("./admin.js"), mod.inicioAdmin(), mod.familiasAdmin(), mod.gEq()]);
  return m.renderAdmin(sub || "", { actions, render, onAfterRender, cloud });
}

// ---------------------------------------------------------------------------
// App instalable (PWA)
// ---------------------------------------------------------------------------
let deferredInstall = null;
function updateInstallSlot() { const s = $("#installSlot"); if (s) s.innerHTML = installCard(); }
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; updateInstallSlot(); });
window.addEventListener("appinstalled", () => { deferredInstall = null; updateInstallSlot(); toast("App instalada"); });
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function installCard() {
  if (isStandalone()) return "";
  if (deferredInstall) {
    return `<div class="card install-bar" style="margin-top:16px">
      <span class="tile-ico" style="margin:0">${icon("phone")}</span>
      <div style="flex:1"><strong>Lleva Ágape en tu celular</strong><p class="muted small">Instálala y úsala incluso sin internet.</p></div>
      <button class="btn btn-primary btn-sm" data-action="install">Instalar</button></div>`;
  }
  if (isIOS()) {
    return `<div class="card install-bar" style="margin-top:16px">
      <span class="tile-ico" style="margin:0">${icon("phone")}</span>
      <div style="flex:1"><strong>Agrégala a tu pantalla de inicio</strong><p class="muted small">En Safari toca Compartir y luego «Agregar a inicio».</p></div></div>`;
  }
  return "";
}
actions.install = async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice.catch(() => {});
  deferredInstall = null; updateInstallSlot();
};
// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
wall.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud, fotos: (id) => momentos.homeStrip(id) });
window.addEventListener("agape:logro", () => toast("¡Felicitaciones! Compartimos tu logro en el muro de la comunidad", "ok", 6000));
chat.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
avisos.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
agenda.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud, tabs: (k) => chat.tabs(k) });
portada.setup({ actions, render: () => render(), onAfterRender, cloud });
solicitud.setup({ actions, render: () => render(), onAfterRender, cloud });
conocer.setup({ actions, render: () => render(), onAfterRender, cloud });
ficha.setup({ actions, render: () => render(), onAfterRender, cloud });
cancionero.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
salmos.setup({ actions, render: () => render(), onAfterRender, cloud });
acompanar.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
ayuda.setup({ actions, render: () => render(), onAfterRender, cloud });
desafio.setup({ actions, render: () => render(), cloud });
fiestas.setup({ actions, render: () => render() });
descubre.setup({ actions, render: () => render() });
temporadas.setup({ actions, render: () => render() });
momentos.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud });
juegos.setup({ actions, render: () => render(), onAfterRender, onLeave });
podcast.setup({ actions, render: () => render(), onAfterRender, cloud });
inicio.setup({ actions, render: () => render(), onAfterRender, agenda, wall });
papa.registerActions(actions);
apariencia.setup(cloud);
setTimeout(() => apariencia.refresh().then((ch) => { if (ch && !location.hash.startsWith("#/admin")) render(); }), 1500);
capilla.setup({ actions, render: () => render(), onAfterRender, onLeave, cloud, content: () => S.content() });
agapeDigital.setup({ actions, render: () => render() });
oremus.setup({ actions, onAfterRender });
// Control remoto (palo de selfie, control de presentaciones) en todo lo que se proyecta: canciones, oraciones y salmos.
remoto.iniciar({
  find: () => { const o = document.querySelector(".can-proj"); return o ? { next: o.querySelector('[aria-label="Siguiente"]'), prev: o.querySelector('[aria-label="Anterior"]') } : null; },
  host: () => document.querySelector(".can-proj .can-proj-ctrl"),
});

async function boot() {
  try {
    S.prefetchContent();
    if (cloud.enabled) await cloud.init();
    if (S.quickStart()) {
      // Con copia guardada: se dibuja ya y el contenido publicado (nube y sitio) se revisa por detrás.
      const before = S.current();
      S.loadContent(cloud.enabled ? cloud.fetchContent : null).then(() => { if (S.current() !== before && !/^#\/admin/.test(location.hash)) render(); }).catch(() => {});
    } else await S.loadContent(cloud.enabled ? cloud.fetchContent : null);
    // Si la nube no respondió a tiempo (o entregó la copia guardada), se vuelve a pedir el contenido
    // publicado: al abrir, a los pocos segundos y cada vez que se vuelve a la app (como mucho cada 2 min).
    if (cloud.enabled) {
      let lastC = Date.now();
      const recheck = async (force) => {
        if (!force && Date.now() - lastC < 120000) return; lastC = Date.now();
        const c = await cloud.fetchContent().catch(() => null);
        if (S.adoptIfNewer(c) && !/^#\/admin/.test(location.hash)) render();
      };
      setTimeout(() => recheck(true), 8000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") recheck(false); });
    }
    if (cloud.enabled) cloud.onChange(render); // después de cargar el contenido, para no dibujar sin datos
    if (cloud.enabled) setTimeout(() => cloud.countVisit(), 5000); // una visita por dispositivo y día (sin datos personales)
  } catch (e) {
    viewEl().innerHTML = `<div class="card" style="text-align:center;padding:40px"><h2 class="display">No se pudo cargar el contenido</h2>
      <p class="muted" style="margin-top:8px">Revisa tu conexión e inténtalo de nuevo.</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  await render();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    // Si se publica una versión nueva de la app, se recarga una vez para mostrarla.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloaded) return;
      reloaded = true; location.reload();
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
      .then((r) => r.update().catch(() => {})).catch(() => {});
  }
}
boot();
// Diapositiva con enlace: tocar cualquier parte (que no sea un botón o enlace) la abre.
document.addEventListener("click", (e) => {
  const sl = e.target.closest && e.target.closest(".car-slide[data-go]");
  if (!sl || e.target.closest("a, button, input, select, textarea")) return;
  location.hash = sl.dataset.go;
});
