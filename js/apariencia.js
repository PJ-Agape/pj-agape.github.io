// Apariencia (Gestión → Apariencia): fondos, stickers, textos y colores de las zonas de la app,
// sin tocar el código. Lo que no se cambia queda como viene en la app.
// Se guarda en content/apariencia (todo menos las fotos) y content/fondo_<zona> (la foto subida de cada zona).

const LK = "agape_apariencia";
let cfg = (() => { try { return JSON.parse(localStorage.getItem(LK) || "null") || {}; } catch { return {}; } })();
let at = 0, cloud = null;
const fotos = new Map(); // zona → data URL (en memoria)

// Fondos ilustrados de la galería
export const FONDOS = [["parque", "Parque"], ["cielo", "Cielo"], ["cordillera", "Cordillera"], ["noche", "Noche"], ["vitral", "Vitral"], ["mar", "Mar"]];
export const fondoUrl = (k) => `img/fondos/${k}.svg`;
// En una variable de CSS, la dirección debe ser completa (si no, se busca junto a la hoja de estilos)
const abs = (u) => (/^(data:|https?:)/.test(u) ? u : new URL(u, location.href).href);
// Todos los stickers de la app
export const STICKERS = ["img/ilus/s002.webp", "img/ilus/s004.webp", "img/ilus/s022.webp", "img/ilus/s023.webp", "img/ilus/s024.webp", "img/ilus/s026.webp", "img/ilus/s030.webp", "img/ilus/s031.webp", "img/ilus/s032.webp", "img/ilus/s033.webp", "img/ilus/s035.webp", "img/ilus/s036.webp", "img/ilus/s037.webp", "img/ilus/s039.webp", "img/ilus/s040.webp", "img/ilus/s041.webp", "img/ilus/s042.webp", "img/ilus/s043.webp", "img/ilus/s044.webp", "img/ilus/s047.webp", "img/ilus/s050.webp", "img/ilus/s051.webp", "img/ilus/s065.webp", "img/ilus/s066.webp", "img/ilus/s078.webp", "img/ilus/s081.webp", "img/ilus/s083.webp", "img/ilus/s084.webp", "img/ilus/s085.webp", "img/ilus/s086.webp", "img/ilus/s087.webp", "img/ilus/s088.webp", "img/ilus/s089.webp", "img/ilus/s090.webp", "img/ilus/s091.webp", "img/ilus/s092.webp", "img/ilus/s093.webp", "img/ilus/s094.webp", "img/ilus/s096.webp", "img/ilus/s097.webp", "img/ilus/s098.webp", "img/ilus/s102.webp", "img/ilus/s104.webp", "img/ilus/s105.webp", "img/ilus/s107.webp", "img/ilus/s109.webp", "img/ilus/s201.webp", "img/ilus/s202.webp", "img/ilus/s203.webp", "img/ilus/s204.webp", "img/ilus/s205.webp", "img/ilus/s206.webp", "img/ilus/s207.webp", "img/ilus/s208.webp", "img/ilus/s209.webp", "img/ilus/s210.webp", "img/ilus/s211.webp", "img/ilus/s212.webp", "img/ilus/s213.webp", "img/ilus/s214.webp", "img/ilus/s215.webp", "img/ilus/s216.webp", "img/ilus/s217.webp", "img/ilus/s218.webp", "img/ilus/s219.webp", "img/ilus/s220.webp", "img/ilus/s221.webp", "img/ilus/s222.webp", "img/ilus/s223.webp", "img/ilus/s224.webp", "img/ilus/s225.webp", "img/ilus/s226.webp", "img/ilus/s227.webp", "img/ilus/s228.webp", "img/ilus/s229.webp", "img/ilus/s230.webp", "img/ilus/s231.webp", "img/ilus/s232.webp", "img/ilus/s233.webp", "img/ilus/s234.webp", "img/ilus/s235.webp", "img/ilus/s236.webp", "img/ilus/s237.webp", "img/ilus/s238.webp", "img/ilus/s239.webp", "img/ilus/s240.webp", "img/ilus/s241.webp", "img/ilus/s242.webp", "img/ilus/s243.webp", "img/ilus/s244.webp", "img/ilus/s245.webp", "img/ilus/s246.webp", "img/stickers/amigos.webp", "img/stickers/biblia.webp", "img/stickers/calendario.webp", "img/stickers/caliz.webp", "img/stickers/comunidad.webp", "img/stickers/grupo.webp", "img/stickers/guitarra.webp", "img/stickers/oracion.webp"];

// Zonas editables. sel: el elemento en la pantalla · t: sus textos (selector y texto de fábrica)
// · stk: sticker de fábrica (o "" si no trae) · fondo: si admite fondo · plaza: fondo detrás (::before)
export const ZONAS = [
  { id: "hoy", n: "Hoy · saludo", ruta: "#/", re: /^\/$/, sel: ".home-hi", stk: "img/stickers/amigos.webp",
    t: [[".home-hand", "Frase manuscrita", "qué bueno verte"]] },
  { id: "formacion", n: "Formación · encabezado", ruta: "#/formacion", re: /^\/formacion$/, sel: ".page-head", stk: "img/stickers/biblia.webp",
    t: [[".eyebrow", "Línea pequeña", "Bloque 1 · para crecer"], ["h1", "Título", "Formación"], ["p", "Descripción", "El curso de dirigentes, los cursos de la comunidad y los recursos para preparar."]] },
  { id: "comunidad", n: "Comunidad · encabezado", ruta: "#/red", re: /^\/red$/, sel: ".page-head", stk: "img/stickers/comunidad.webp",
    t: [[".eyebrow", "Línea pequeña", "Bloque 2 · para encontrarnos"], ["h1", "Título", "Comunidad"], ["p", "Descripción", "El muro, el chat, la agenda y todo lo que compartimos como grupo."]] },
  { id: "plaza", n: "Comunidad · La Plaza", ruta: "#/red", re: /^\/red$/, sel: ".plaza:not(.fam-plaza)", stk: "img/ilus/s081.webp", stkSel: ".plaza-scene img", plaza: true, fondoDef: "parque",
    t: [[".plaza-hand", "Frase manuscrita", "donde nos encontramos"], [".plaza-head h2", "Título (entre *asteriscos* va el destacado)", "La Plaza *Ágape*"], [".plaza-head p", "Descripción", "Lo que vivimos, lo que conversamos y lo que nos decimos: todo en un mismo lugar."]] },
  { id: "capilla", n: "Orar · encabezado de la Capilla", ruta: "#/oracion", re: /^\/oracion$/, sel: ".cap-arch", stk: "img/stickers/oracion.webp",
    t: [[".cap-hand", "Frase manuscrita", "pasa, Él te espera"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "Capilla *Ágape*"]] },
  { id: "rezar", n: "Orar · Para rezar", ruta: "#/oracion", re: /^\/oracion$/, sel: ".cap-fila", stk: "",
    t: [[".cw-h", "Título", "Para rezar"]] },
  { id: "agenda", n: "Agenda · encabezado", ruta: "#/agenda", re: /^\/agenda/, sel: ".page-head", stk: "img/stickers/calendario.webp",
    t: [[".eyebrow", "Línea pequeña", "Ventana oficial del grupo"], ["h1", "Título (entre *asteriscos* va el destacado)", "Agenda *Ágape*"], ["p", "Descripción", "Encuentros, celebraciones y actividades de la pastoral, siempre al día. Lo que está aquí es lo oficial."]] },
  { id: "salmos", n: "Orar · entrada de Salmos", ruta: "#/salmos", re: /^\/salmos$/, sel: '.ent-hero[data-ent="salmos"] .cap-arch', stk: "",
    t: [[".cap-hand", "Frase manuscrita", "Él escucha todo"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "Orar con los *Salmos*"], [".cap-sub", "Descripción", "Son las oraciones que Jesús aprendió de niño y rezó toda su vida. En ellos hay palabras para todo lo que llevas dentro."]] },
  { id: "oremus", n: "Orar · entrada de Oremus", ruta: "#/oremus", re: /^\/oremus/, sel: '.ent-hero[data-ent="oremus"] .cap-arch', stk: "",
    t: [[".cap-hand", "Frase manuscrita", "recemos juntos"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "*Oremus*"], [".cap-sub", "Descripción", "Nuestras oraciones, para antes y después de cada encuentro, y las que rezamos en toda la Iglesia. Elige una y rézala con calma."]] },
  { id: "cancionero", n: "Orar · entrada del Cancionero", ruta: "#/cancionero", re: /^\/cancionero$/, sel: '.ent-hero[data-ent="cancionero"] .cap-arch', stk: "",
    t: [[".cap-hand", "Frase manuscrita", "cantar es rezar dos veces"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "Cancionero *Ágape*"], [".cap-sub", "Descripción", "Canciones con acordes para cada momento de la misa, en el tono que necesites. Ideal para ensayar y para proyectar."]] },
];
export const zona = (id) => ZONAS.find((z) => z.id === id);

// Paneles de cada pantalla: el equipo los sube, los baja, los oculta y cambia su tamaño y ancho.
// p: [clave, nombre, selector (hijo directo de la pantalla)] · wrap: dónde están (si no, la pantalla misma)
export const PANTALLAS = [
  { id: "hoy", n: "Hoy", ruta: "#/", re: /^\/$/, p: [
    ["saludo", "Saludo y Evangelio del día", ".home-hi"], ["solicitud", "Solicitud para ser dirigente", ".sol-banner"],
    ["continuar", "Continuar el curso", ".home-go"], ["destacados", "Destacados (carrusel)", "#homeCarousel"],
    ["cuenta", "Cuenta regresiva", "#countSlot"], ["agenda", "Próximas fechas", ".ag-panel-slot"],
    ["radios", "Radios, podcast y playlist", ".home-radios:not(.home-links)"], ["enlaces", "Enlaces de interés", ".home-links"],
    ["puente", "«Sé puente»", ".camino-banner"]] },
  { id: "formacion", n: "Formación", ruta: "#/formacion", re: /^\/formacion$/, p: [
    ["encabezado", "Encabezado", ".page-head"], ["curso", "El curso de dirigentes", ".hub-cbanner:not(.is-mat):not(.sol-banner)"],
    ["materiales", "Herramientas de la pastoral", ".hub-cbanner.is-mat"], ["accesos", "Accesos", ".hub-grid"]] },
  { id: "capilla", n: "Orar · Capilla", ruta: "#/oracion", re: /^\/oracion$/, p: [
    ["encabezado", "Encabezado de la Capilla", ".cap-a-hero"], ["rezar", "Para rezar (íconos)", ".cap-fila"],
    ["misa", "La misa y el Evangelio", ".cap-a-misa"], ["momento", "Oración del momento", ".cap-moment"],
    ["intenciones", "Nuestras intenciones", ".cap-altar"]] },
  { id: "salmos", n: "Orar · Salmos", ruta: "#/salmos", re: /^\/salmos$/, p: [
    ["entrada", "Entrada y «Para comenzar»", ".ent-hero"], ["librito", "El librito de los Salmos", ".sal-guide"], ["cita", "Cita final", ".cap-foot"]] },
  { id: "oremus", n: "Orar · Oremus", ruta: "#/oremus", re: /^\/oremus/, wrap: ".oremus", p: [
    ["entrada", "Entrada y «Para comenzar»", ".ent-hero"], ["librito", "El librito de Oremus", ".sal-guide"],
    ["lista", "Todas las oraciones", ".ent-lista"], ["cita", "Cita final", ".cap-foot"]] },
  { id: "cancionero", n: "Orar · Cancionero", ruta: "#/cancionero", re: /^\/cancionero$/, p: [
    ["entrada", "Entrada y «Para comenzar»", ".ent-hero"], ["hoja", "La hoja de cantos", ".sal-guide"], ["lista", "Todas las canciones", ".ent-lista"]] },
  { id: "comunidad", n: "Comunidad", ruta: "#/red", re: /^\/red$/, p: [
    ["encabezado", "Encabezado", ".page-head"], ["desafio", "Desafío de la semana", ".red-desafio"],
    ["agenda", "Próximas fechas", ".ag-panel-slot"], ["plaza", "La Plaza Ágape", ".plaza"],
    ["accesos", "Accesos", ".hub-grid"], ["final", "Conócenos y WhatsApp", ".red-end"]] },
];
export const pantalla = (id) => PANTALLAS.find((x) => x.id === id);
export const panDe = (id) => (cfg.paneles || {})[id] || {};
// El orden final: el guardado, y los paneles nuevos (que no estaban al guardar) en su lugar de siempre
export function ordenDe(s, d) {
  const keys = s.p.map((x) => x[0]), saved = (d.orden || []).filter((k) => keys.includes(k));
  const out = saved.slice();
  keys.forEach((k, i) => { if (!out.includes(k)) out.splice(Math.min(i, out.length), 0, k); });
  return out;
}
// Vista previa en Gestión: la pantalla va dentro de un marco y recibe el borrador sin guardarlo
if (typeof window !== "undefined" && window.top !== window) window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || !e.data || !e.data.apPaneles) return;
  const { id, d } = e.data.apPaneles, s = pantalla(id), v = document.getElementById("view");
  if (!s || !v) return;
  cfg = { ...cfg, paneles: { ...(cfg.paneles || {}), [id]: d } };
  applyPaneles(v, s, d);
});
export function applyPaneles(v, s, d) {
  const box = s.wrap ? v.querySelector(s.wrap) : v; if (!box) return 0;
  const found = new Map();
  for (const [k, , sel] of s.p) { const el = box.querySelector(`:scope > ${sel}`); if (el) found.set(k, el); }
  // Se reparten los lugares que ocupan, en el orden elegido (lo demás de la pantalla no se mueve)
  const els = [...found.values()].sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1));
  const marks = els.map((el) => { const m = document.createComment("p"); el.before(m); return m; });
  ordenDe(s, d).filter((k) => found.has(k)).forEach((k, i) => marks[i].replaceWith(found.get(k)));
  marks.forEach((m) => m.remove());
  for (const [k, el] of found) {
    const o = (d.p || {})[k] || {};
    el.classList.toggle("ap-oculto", !!o.oculto);
    el.classList.toggle("ap-panel", !!(o.tam || o.ancho));
    if (o.tam && o.tam !== 100) el.style.setProperty("--ap-tam", String(o.tam / 100)); else el.style.removeProperty("--ap-tam");
    if (o.ancho && o.ancho < 100) el.style.setProperty("--ap-ancho", o.ancho + "%"); else el.style.removeProperty("--ap-ancho");
  }
  return s.p.length - found.size;
}
export const get = () => cfg;
export const de = (id) => (cfg.zonas || {})[id] || {};

export function setup(c) { cloud = c; }
export async function refresh(force) {
  if (!cloud || !cloud.enabled) return false;
  if (!force && at && Date.now() - at < 5 * 60000) return false;
  at = Date.now();
  const c = await cloud.getApariencia().catch(() => null);
  if (!c) return false;
  const ch = JSON.stringify(c) !== JSON.stringify(cfg);
  cfg = c; try { localStorage.setItem(LK, JSON.stringify(c)); } catch {}
  if (ch) fotos.clear();
  return ch;
}
export function setLocal(c) { cfg = c || {}; fotos.clear(); try { localStorage.setItem(LK, JSON.stringify(cfg)); } catch {} }
async function foto(id, v) {
  const key = `${id}@${v || 0}`;
  if (fotos.has(key)) return fotos.get(key);
  let src = null;
  try { const c = JSON.parse(localStorage.getItem("agape_fondo_" + id) || "null"); if (c && c.v === v) src = c.src; } catch {}
  if (!src && cloud && cloud.enabled) { const d = await cloud.getFondoZona(id).catch(() => null); src = d && d.src; if (src) try { localStorage.setItem("agape_fondo_" + id, JSON.stringify({ v, src })); } catch {} }
  fotos.set(key, src || ""); return src || "";
}
export const fotoDe = foto;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Dónde se centra la imagen: x e y en % (0 = izquierda/arriba, 100 = derecha/abajo); antes se guardaba «pos»
export const posDe = (f) => (!f ? "" : f.x != null || f.y != null ? `${f.x ?? 50}% ${f.y ?? 50}%` : f.pos || "");
export const enfasis = (s) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");

// Aplica lo editado a la pantalla recién dibujada
export function apply(v, path) {
  const g = cfg.global || {};
  const root = document.documentElement;
  if (g.paper) root.style.setProperty("--paper", g.paper); else root.style.removeProperty("--paper");
  for (const s of PANTALLAS) {
    if (!s.re.test(path) || !(cfg.paneles || {})[s.id]) continue;
    const d = cfg.paneles[s.id];
    // Algunos paneles llegan un momento después: se acomodan otra vez
    if (applyPaneles(v, s, d)) setTimeout(() => { if (s.re.test((location.hash || "#/").slice(1).split("?")[0])) applyPaneles(v, s, d); }, 900);
  }
  for (const z of ZONAS) {
    if (!z.re.test(path)) continue;
    const el = v.querySelector(z.sel); if (!el) continue;
    applyZona(el, z, de(z.id));
  }
}
export function applyZona(el, z, d) {
  // Textos
  for (const [s, , def] of z.t || []) {
    const t = el.querySelector(s); if (!t) continue;
    const val = (d.textos || {})[s];
    if (val != null && val !== "") t.innerHTML = enfasis(val);
  }
  // Colores
  el.classList.toggle("ap-bg", !!(d.colores && d.colores.bg));
  el.classList.toggle("ap-ink", !!(d.colores && d.colores.ink));
  el.classList.toggle("ap-accent", !!(d.colores && d.colores.accent));
  for (const [k, p] of [["bg", "--ap-bg"], ["ink", "--ap-ink"], ["accent", "--ap-accent"]]) {
    const c = d.colores && d.colores[k];
    if (c) el.style.setProperty(p, c); else el.style.removeProperty(p);
  }
  // Sticker
  if (d.sticker) {
    let img = z.stkSel ? el.querySelector(z.stkSel) : el.querySelector(":scope > .sticker");
    if (d.sticker === "ninguno") { if (img) img.remove(); }
    else if (img) img.src = d.sticker;
    else if (!z.stkSel) { el.classList.add("has-sticker"); el.insertAdjacentHTML("afterbegin", `<img class="sticker" src="${esc(d.sticker)}" alt="" loading="lazy" decoding="async">`); }
  }
  // Fondo
  const f = d.fondo;
  el.classList.toggle("ap-fondo", !!(f && f.tipo && f.tipo !== "ninguno" && !z.plaza));
  el.classList.toggle("ap-sinfondo", !!(f && f.tipo === "ninguno"));
  const velo = f && f.velo != null ? f.velo : 40;
  el.style.setProperty("--ap-velo", String(velo / 100));
  const pos = posDe(f);
  if (pos) el.style.setProperty("--ap-pos", pos); else el.style.removeProperty("--ap-pos");
  if (f && f.zoom > 100) el.style.setProperty("--ap-zoom", String(f.zoom / 100)); else el.style.removeProperty("--ap-zoom");
  if (!f || !f.tipo || f.tipo === "ninguno") { el.style.removeProperty("--ap-img"); return; }
  if (f.tipo === "galeria") el.style.setProperty("--ap-img", `url("${abs(fondoUrl(f.k))}")`);
  if (f.tipo === "foto") foto(z.id, f.v).then((src) => { if (src) el.style.setProperty("--ap-img", `url("${src}")`); });
}
