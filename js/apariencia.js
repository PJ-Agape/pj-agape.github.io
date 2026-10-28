// Apariencia (Gestión → Apariencia): fondos, stickers, textos y colores de las zonas de la app,
// sin tocar el código. Lo que no se cambia queda como viene en la app.
// Se guarda en content/apariencia (todo menos las fotos) y content/fondo_<zona> (la foto subida de cada zona).

import { illus, illusConCara, SCENE_KEYS } from "./ilustraciones.js";
import { pjSvg, PJ_KEYS } from "./personajes.js";

const LK = "agape_apariencia";
let cfg = (() => { try { return JSON.parse(localStorage.getItem(LK) || "null") || {}; } catch { return {}; } })();
let at = 0, cloud = null;
const fotos = new Map(); // zona → data URL (en memoria)

// Fondos ilustrados de la galería
export const FONDOS = [["parque", "Parque"], ["cielo", "Cielo"], ["cordillera", "Cordillera"], ["noche", "Noche"], ["vitral", "Vitral"], ["mar", "Mar"]];
export const fondoUrl = (k) => `img/fondos/${k}.svg`;
// En una variable de CSS, la dirección debe ser completa (si no, se busca junto a la hoja de estilos)
const abs = (u) => (/^(data:|https?:)/.test(u) ? u : new URL(u, location.href).href);
// Todos los stickers de la app: las imágenes (img/stickers, img/ilus, img/estilo), los personajes y los dibujos del estudio.
// Un sticker se guarda como su dirección, «pj:<personaje>» o «dib:<dibujo>».
export const STICKERS = ["img/stickers/amigos.webp", "img/stickers/biblia.webp", "img/stickers/calendario.webp", "img/stickers/caliz.webp", "img/stickers/comunidad.webp", "img/stickers/grupo.webp", "img/stickers/guitarra.webp", "img/stickers/oracion.webp", "img/ilus/s002.webp", "img/ilus/s004.webp", "img/ilus/s022.webp", "img/ilus/s023.webp", "img/ilus/s024.webp", "img/ilus/s026.webp", "img/ilus/s030.webp", "img/ilus/s031.webp", "img/ilus/s032.webp", "img/ilus/s033.webp", "img/ilus/s035.webp", "img/ilus/s036.webp", "img/ilus/s037.webp", "img/ilus/s039.webp", "img/ilus/s040.webp", "img/ilus/s041.webp", "img/ilus/s042.webp", "img/ilus/s043.webp", "img/ilus/s044.webp", "img/ilus/s047.webp", "img/ilus/s050.webp", "img/ilus/s051.webp", "img/ilus/s065.webp", "img/ilus/s066.webp", "img/ilus/s078.webp", "img/ilus/s081.webp", "img/ilus/s083.webp", "img/ilus/s084.webp", "img/ilus/s085.webp", "img/ilus/s086.webp", "img/ilus/s087.webp", "img/ilus/s088.webp", "img/ilus/s089.webp", "img/ilus/s090.webp", "img/ilus/s091.webp", "img/ilus/s092.webp", "img/ilus/s093.webp", "img/ilus/s094.webp", "img/ilus/s096.webp", "img/ilus/s097.webp", "img/ilus/s098.webp", "img/ilus/s102.webp", "img/ilus/s104.webp", "img/ilus/s105.webp", "img/ilus/s107.webp", "img/ilus/s109.webp", "img/ilus/s201.webp", "img/ilus/s202.webp", "img/ilus/s203.webp", "img/ilus/s204.webp", "img/ilus/s205.webp", "img/ilus/s206.webp", "img/ilus/s207.webp", "img/ilus/s208.webp", "img/ilus/s209.webp", "img/ilus/s210.webp", "img/ilus/s211.webp", "img/ilus/s212.webp", "img/ilus/s213.webp", "img/ilus/s214.webp", "img/ilus/s215.webp", "img/ilus/s216.webp", "img/ilus/s217.webp", "img/ilus/s218.webp", "img/ilus/s219.webp", "img/ilus/s220.webp", "img/ilus/s221.webp", "img/ilus/s222.webp", "img/ilus/s223.webp", "img/ilus/s224.webp", "img/ilus/s225.webp", "img/ilus/s226.webp", "img/ilus/s227.webp", "img/ilus/s228.webp", "img/ilus/s229.webp", "img/ilus/s230.webp", "img/ilus/s231.webp", "img/ilus/s232.webp", "img/ilus/s233.webp", "img/ilus/s234.webp", "img/ilus/s235.webp", "img/ilus/s236.webp", "img/ilus/s237.webp", "img/ilus/s238.webp", "img/ilus/s239.webp", "img/ilus/s240.webp", "img/ilus/s241.webp", "img/ilus/s242.webp", "img/ilus/s243.webp", "img/ilus/s244.webp", "img/ilus/s245.webp", "img/ilus/s246.webp", "img/estilo/sticker-01.webp", "img/estilo/sticker-02.webp", "img/estilo/sticker-03.webp", "img/estilo/sticker-04.webp", "img/estilo/sticker-05.webp", "img/estilo/sticker-06.webp", "img/estilo/sticker-07.webp", "img/estilo/sticker-08.webp", "img/estilo/sticker-09.webp", "img/estilo/sticker-10.webp", "img/estilo/sticker-11.webp", "img/estilo/sticker-12.webp", "img/estilo/sticker-13.webp", "img/estilo/sticker-14.webp", "img/estilo/sticker-15.webp", "img/estilo/sticker-16.webp", "img/estilo/sticker-17.webp"];
// El set del estudio (Difusión → Stickers), con su frase y borde blanco, exportado a img/estudio
export const ESTUDIO = ["img/estudio/e001.webp", "img/estudio/e002.webp", "img/estudio/e003.webp", "img/estudio/e004.webp", "img/estudio/e005.webp", "img/estudio/e006.webp", "img/estudio/e007.webp", "img/estudio/e008.webp", "img/estudio/e009.webp", "img/estudio/e010.webp", "img/estudio/e011.webp", "img/estudio/e012.webp", "img/estudio/e013.webp", "img/estudio/e014.webp", "img/estudio/e015.webp", "img/estudio/e016.webp", "img/estudio/e017.webp", "img/estudio/e018.webp", "img/estudio/e019.webp", "img/estudio/e020.webp", "img/estudio/e021.webp", "img/estudio/e022.webp", "img/estudio/e023.webp", "img/estudio/e024.webp", "img/estudio/e025.webp", "img/estudio/e026.webp", "img/estudio/e027.webp", "img/estudio/e028.webp", "img/estudio/e029.webp", "img/estudio/e030.webp", "img/estudio/e031.webp", "img/estudio/e032.webp", "img/estudio/e033.webp", "img/estudio/e034.webp", "img/estudio/e035.webp", "img/estudio/e036.webp", "img/estudio/e037.webp", "img/estudio/e038.webp", "img/estudio/e039.webp", "img/estudio/e040.webp", "img/estudio/e041.webp", "img/estudio/e042.webp", "img/estudio/e043.webp", "img/estudio/e044.webp", "img/estudio/e045.webp", "img/estudio/e046.webp", "img/estudio/e047.webp", "img/estudio/e048.webp", "img/estudio/e049.webp", "img/estudio/e050.webp", "img/estudio/e051.webp", "img/estudio/e052.webp", "img/estudio/e053.webp", "img/estudio/e054.webp", "img/estudio/e055.webp", "img/estudio/e056.webp", "img/estudio/e057.webp", "img/estudio/e058.webp", "img/estudio/e059.webp", "img/estudio/e060.webp", "img/estudio/e061.webp", "img/estudio/e062.webp", "img/estudio/e063.webp", "img/estudio/e064.webp", "img/estudio/e065.webp", "img/estudio/e066.webp", "img/estudio/e067.webp", "img/estudio/e068.webp", "img/estudio/e069.webp", "img/estudio/e070.webp", "img/estudio/e071.webp", "img/estudio/e072.webp", "img/estudio/e073.webp", "img/estudio/e074.webp", "img/estudio/e075.webp", "img/estudio/e076.webp", "img/estudio/e077.webp", "img/estudio/e078.webp", "img/estudio/e079.webp", "img/estudio/e080.webp", "img/estudio/e081.webp", "img/estudio/e082.webp", "img/estudio/e083.webp", "img/estudio/e084.webp", "img/estudio/e085.webp", "img/estudio/e086.webp", "img/estudio/e087.webp", "img/estudio/e088.webp", "img/estudio/e089.webp", "img/estudio/e090.webp", "img/estudio/e091.webp", "img/estudio/e092.webp", "img/estudio/e093.webp", "img/estudio/e094.webp", "img/estudio/e095.webp", "img/estudio/e096.webp", "img/estudio/e097.webp", "img/estudio/e098.webp", "img/estudio/e099.webp", "img/estudio/e100.webp", "img/estudio/e101.webp", "img/estudio/e102.webp", "img/estudio/e103.webp", "img/estudio/e104.webp", "img/estudio/e105.webp", "img/estudio/e106.webp", "img/estudio/e107.webp", "img/estudio/e108.webp", "img/estudio/e109.webp", "img/estudio/e110.webp", "img/estudio/e111.webp", "img/estudio/e112.webp", "img/estudio/e113.webp", "img/estudio/e114.webp", "img/estudio/e115.webp", "img/estudio/e116.webp", "img/estudio/e117.webp", "img/estudio/e118.webp"];
let dibs = null;
const dibujos = () => dibs || (dibs = SCENE_KEYS.filter((k) => !/^<img/.test(illus(k)) && illusConCara(k)).map((k) => "dib:" + k));
export const catalogo = () => [["Del estudio, con su frase", ESTUDIO], ["Ilustraciones", STICKERS], ["Personajes", PJ_KEYS.map((k) => "pj:" + k)], ["Dibujos", dibujos()]].filter(([, l]) => l.length);
export function stkHTML(v, cls = "") {
  if (/^pj:/.test(v)) return `<span class="${cls} ap-stk-svg ap-stk-pj">${pjSvg(v.slice(3))}</span>`;
  if (/^dib:/.test(v)) return `<span class="${cls} ap-stk-svg">${illusConCara(v.slice(4))}</span>`;
  return `<img class="${cls}" src="${esc(v)}" alt="" loading="lazy" decoding="async">`;
}

// Zonas editables. sel: el elemento en la pantalla · t: sus textos (selector y texto de fábrica)
// · stk: sticker de fábrica (o "" si no trae) · fondo: si admite fondo · plaza: fondo detrás (::before)
export const ZONAS = [
  { id: "hoy", n: "Hoy · saludo", ruta: "#/", re: /^\/$/, sel: ".home-hi", stk: "img/stickers/amigos.webp",
    t: [[".home-hand", "Frase manuscrita", "qué bueno verte"]] },
  { id: "formacion", n: "Formación · encabezado", ruta: "#/formacion", re: /^\/formacion$/, sel: ".page-head", stk: "img/stickers/biblia.webp",
    t: [[".eyebrow", "Línea pequeña", "Bloque 1 · para crecer"], ["h1", "Título", "Formación"], ["p", "Descripción", "El curso de dirigentes, los cursos de la comunidad y los recursos para preparar."]] },
  { id: "formacion_curso", n: "Formación · tarjeta del curso", ruta: "#/formacion", re: /^\/formacion$/, sel: ".hub-cbanner:not(.is-mat):not(.sol-banner)", stk: "img/ilus/s022.webp", stkSel: ".hub-cb-il",
    t: [[".eyebrow", "Línea pequeña (cambia según quién entra)", "Para todos"], [".hub-cb-hand", "Frase manuscrita (cambia según el avance)", "empieza por aquí"], ["h2", "Título (vacío = el nombre del curso)", "Bienvenido a agAPPe"], [".hub-cb-btns .btn-ghost", "Texto del segundo botón", "Ver el itinerario"]] },
  { id: "formacion_mat", n: "Formación · tarjeta de Materiales", ruta: "#/formacion", re: /^\/formacion$/, sel: ".hub-cbanner.is-mat", stk: "img/ilus/s084.webp", stkSel: ".hub-cb-il",
    t: [[".eyebrow", "Línea pequeña", "Herramientas de la pastoral"], [".hub-cb-hand", "Frase manuscrita", "para preparar cada encuentro"], ["h2", "Título", "Materiales"], [".hub-cb-meta", "Descripción", "Todo lo que necesitas para preparar, animar e invitar, en un solo lugar."], [".hub-btn-l", "Texto del botón amarillo", "Abrir Materiales"], [".hub-cb-btns .btn-ghost", "Texto del segundo botón", "Estudio de difusión"]] },
  { id: "materiales", n: "Formación · Materiales · encabezado", ruta: "#/materiales", re: /^\/materiales$/, sel: ".page-head", stk: "",
    t: [[".eyebrow", "Línea pequeña", "Herramientas de la pastoral"], ["h1", "Título", "Materiales"], ["p", "Descripción", "Todo lo que necesitas para preparar, animar e invitar."]] },
  { id: "fi_presentaciones", n: "Formación · Materiales · fichero Presentaciones", ruta: "#/materiales", re: /^\/materiales$/, sel: "#fi-presentaciones", stk: "",
    t: [[".fi-head h2", "Título", "Presentaciones"], [".fi-desc", "Descripción", "Para proyectar a pantalla completa."]] },
  { id: "fi_difusion", n: "Formación · Materiales · fichero Difusión", ruta: "#/materiales", re: /^\/materiales$/, sel: "#fi-difusion", stk: "",
    t: [[".fi-head h2", "Título", "Difusión"], [".fi-desc", "Descripción", "Para invitar y compartir en Estados, historias y grupos."]] },
  { id: "fi_musica", n: "Formación · Materiales · fichero Música", ruta: "#/materiales", re: /^\/materiales$/, sel: "#fi-musica", stk: "",
    t: [[".fi-head h2", "Título", "Música"], [".fi-desc", "Descripción", "Para animar las celebraciones."]] },
  { id: "fi_oracion", n: "Formación · Materiales · fichero Oración", ruta: "#/materiales", re: /^\/materiales$/, sel: "#fi-oracion", stk: "",
    t: [[".fi-head h2", "Título", "Oración"], [".fi-desc", "Descripción", "Para rezar solos o en el encuentro."]] },
  { id: "fi_guias", n: "Formación · Materiales · fichero Guías para el encuentro", ruta: "#/materiales", re: /^\/materiales$/, sel: "#fi-guias", stk: "",
    t: [[".fi-head h2", "Título", "Guías para el encuentro"], [".fi-desc", "Descripción", "Pautas breves para preparar y acompañar cada reunión."]] },
  { id: "fi_imprimir", n: "Formación · Materiales · fichero Para imprimir", ruta: "#/materiales", re: /^\/materiales$/, sel: "#fi-imprimir", stk: "",
    t: [[".fi-head h2", "Título", "Para imprimir"], [".fi-desc", "Descripción", "Listos para llevar en papel."]] },
  { id: "fi_biblioteca", n: "Formación · Materiales · fichero Biblioteca digital", ruta: "#/materiales", re: /^\/materiales$/, sel: "#fi-biblioteca", stk: "",
    t: [[".fi-head h2", "Título", "Biblioteca digital"], [".fi-desc", "Descripción", "Los documentos que citan los cursos, cada uno con el enlace a su fuente oficial."]] },
  { id: "comunidad", n: "Comunidad · encabezado", ruta: "#/red", re: /^\/red$/, sel: ".page-head", stk: "img/stickers/comunidad.webp",
    t: [[".eyebrow", "Línea pequeña", "Bloque 2 · para encontrarnos"], ["h1", "Título", "Comunidad"], ["p", "Descripción", "El muro, el chat, la agenda y todo lo que compartimos como grupo."]] },
  { id: "plaza", n: "Comunidad · La Plaza", ruta: "#/red", re: /^\/red$/, sel: ".plaza:not(.fam-plaza)", stk: "img/ilus/s081.webp", stkSel: ".plaza-scene img", plaza: true, fondoDef: "parque",
    t: [[".plaza-hand", "Frase manuscrita", "donde nos encontramos"], [".plaza-head h2", "Título (entre *asteriscos* va el destacado)", "La Plaza *Ágape*"], [".plaza-head p", "Descripción", "Lo que vivimos, lo que conversamos y lo que nos decimos: todo en un mismo lugar."]] },
  { id: "capilla", n: "Orar · encabezado de la Capilla", ruta: "#/oracion", re: /^\/oracion$/, sel: ".cap-arch", stk: "img/stickers/oracion.webp", stkHost: ".cap-a-hero",
    t: [[".cap-hand", "Frase manuscrita", "pasa, Él te espera"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "Capilla *Ágape*"]] },
  { id: "rezar", n: "Orar · Para rezar", ruta: "#/oracion", re: /^\/oracion$/, sel: ".cap-fila", stk: "",
    t: [[".cw-h", "Título", "Para rezar"]] },
  { id: "agenda", n: "Agenda · encabezado", ruta: "#/agenda", re: /^\/agenda/, sel: ".page-head", stk: "img/stickers/calendario.webp",
    t: [[".eyebrow", "Línea pequeña", "Ventana oficial del grupo"], ["h1", "Título (entre *asteriscos* va el destacado)", "Agenda *Ágape*"], ["p", "Descripción", "Encuentros, celebraciones y actividades de la pastoral, siempre al día. Lo que está aquí es lo oficial."]] },
  { id: "salmos", n: "Orar · Salmos · encabezado", ruta: "#/salmos", re: /^\/salmos$/, sel: '.ent-hero[data-ent="salmos"] .cap-arch', stk: "",
    t: [[".cap-hand", "Frase manuscrita", "Él escucha todo"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "Orar con los *Salmos*"], [".cap-sub", "Descripción", "Son las oraciones que Jesús aprendió de niño y rezó toda su vida. En ellos hay palabras para todo lo que llevas dentro."]] },
  { id: "salmos_comenzar", n: "Orar · Salmos · tarjeta «Para comenzar»", ruta: "#/salmos", re: /^\/salmos$/, sel: '.sal-llegas[data-ent="salmos"]', stk: "",
    t: [[".eyebrow", "Línea pequeña", "Para comenzar"], [".cap-hand", "Frase manuscrita", "¿Cómo llegas hoy?"], [".sal-llegas-p", "Texto", "Elige lo que sientes y te regalamos un salmo para rezar."]] },
  { id: "salmos_guia", n: "Orar · Salmos · tarjeta del librito", ruta: "#/salmos", re: /^\/salmos$/, sel: '.sal-guide[data-ent="salmos"]', stk: "img/ilus/s084.webp", stkSel: ".cap-guide-il",
    t: [[".cap-hand", "Frase manuscrita", "para leer con calma"], ["h2", "Título (entre *asteriscos* va el destacado)", "El librito de los *Salmos*"], [".cap-guide-txt > p", "Descripción", "Los 150 salmos, uno por página, para hojear despacio como un libro de oración."], [".ent-btn-l", "Texto del botón", "Abrir el librito"]] },
  { id: "oremus", n: "Orar · Oremus · encabezado", ruta: "#/oremus", re: /^\/oremus/, sel: '.ent-hero[data-ent="oremus"] .cap-arch', stk: "",
    t: [[".cap-hand", "Frase manuscrita", "recemos juntos"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "*Oremus*"], [".cap-sub", "Descripción", "Nuestras oraciones, para antes y después de cada encuentro, y las que rezamos en toda la Iglesia. Elige una y rézala con calma."]] },
  { id: "oremus_comenzar", n: "Orar · Oremus · tarjeta «Para comenzar»", ruta: "#/oremus", re: /^\/oremus/, sel: '.sal-llegas[data-ent="oremus"]', stk: "",
    t: [[".eyebrow", "Línea pequeña", "Para comenzar"], [".cap-hand", "Frase manuscrita", "¿Qué quieres rezar?"], [".sal-llegas-p", "Texto", "Las de siempre, a un toque. Abajo están todas."]] },
  { id: "oremus_guia", n: "Orar · Oremus · tarjeta del librito", ruta: "#/oremus", re: /^\/oremus/, sel: '.sal-guide[data-ent="oremus"]', stk: "img/ilus/s086.webp", stkSel: ".cap-guide-il",
    t: [[".cap-hand", "Frase manuscrita", "para rezar en papel"], ["h2", "Título (entre *asteriscos* va el destacado)", "El librito de *Oremus*"], [".cap-guide-txt > p", "Descripción", "Todas las oraciones, para hojear con calma o imprimir."], [".ent-btn-l", "Texto del botón", "Abrir el librito"]] },
  { id: "cancionero", n: "Orar · Cancionero · encabezado", ruta: "#/cancionero", re: /^\/cancionero$/, sel: '.ent-hero[data-ent="cancionero"] .cap-arch', stk: "",
    t: [[".cap-hand", "Frase manuscrita", "cantar es rezar dos veces"], [".cap-title", "Título (entre *asteriscos* va el destacado)", "Cancionero *Ágape*"], [".cap-sub", "Descripción", "Canciones con acordes para cada momento de la misa, en el tono que necesites. Ideal para ensayar y para proyectar."]] },
  { id: "cancionero_comenzar", n: "Orar · Cancionero · tarjeta «Para comenzar»", ruta: "#/cancionero", re: /^\/cancionero$/, sel: '.sal-llegas[data-ent="cancionero"]', stk: "",
    t: [[".eyebrow", "Línea pequeña", "Para comenzar"], [".cap-hand", "Frase manuscrita", "¿Para qué momento?"], [".sal-llegas-p", "Texto", "Elige un momento de la misa y te mostramos sus canciones."]] },
  { id: "cancionero_guia", n: "Orar · Cancionero · tarjeta de la hoja de cantos", ruta: "#/cancionero", re: /^\/cancionero$/, sel: '.sal-guide[data-ent="cancionero"]', stk: "img/stickers/guitarra.webp", stkSel: ".cap-guide-il",
    t: [[".cap-hand", "Frase manuscrita", "para la misa del domingo"], ["h2", "Título (entre *asteriscos* va el destacado)", "La hoja de *cantos*"], [".cap-guide-txt > p", "Descripción", "Arma la hoja de una celebración con sus canciones, lista para imprimir o proyectar."], [".ent-btn-l", "Texto del botón", "Armar la hoja"]] },
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
    ["encabezado", "Encabezado", ".page-head"], ["curso", "El curso", ".hub-cbanner:not(.is-mat):not(.sol-banner)"],
    ["materiales", "Materiales", ".hub-cbanner.is-mat"], ["accesos", "Accesos", ".hub-grid"]],
    g: [[".hub-grid", "Accesos, uno por uno"], [".hub-mat-tags", "Atajos de Materiales"]] },
  { id: "materiales", n: "Formación · Materiales", ruta: "#/materiales", re: /^\/materiales$/, p: [
    ["encabezado", "Encabezado", ".page-head"], ["ficheros", "Los ficheros", ".fi-grid"]],
    g: [[".fi-grid", "Ficheros, uno por uno"]] },
  { id: "cursos", n: "Formación · Cursos", ruta: "#/itinerario", re: /^\/itinerario$/, p: [
    ["encabezado", "Encabezado", ".page-head"], ["elegir", "Elegir curso", ".course-switch"], ["avance", "Tu avance", ".progress-card"],
    ["buscar", "Buscador", ".search"], ["camino", "El camino del curso", "#path"]] },
  { id: "capilla", n: "Orar · Capilla", ruta: "#/oracion", re: /^\/oracion$/, p: [
    ["encabezado", "Encabezado de la Capilla", ".cap-a-hero"], ["rezar", "Para rezar (íconos)", ".cap-fila"],
    ["misa", "La misa y el Evangelio", ".cap-a-misa"], ["momento", "Oración del momento", ".cap-moment"],
    ["intenciones", "Nuestras intenciones", ".cap-altar"]],
    g: [[".cg", "Íconos de «Para rezar»"]] },
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
    ["accesos", "Accesos", ".hub-grid"], ["final", "Conócenos y WhatsApp", ".red-end"]],
    g: [[".plaza-doors", "Puertas de La Plaza"], [".hub-grid", "Accesos, uno por uno"]] },
];
export const pantalla = (id) => PANTALLAS.find((x) => x.id === id);
export const panDe = (id) => (cfg.paneles || {})[id] || {};
// El orden final: el guardado, y los paneles nuevos (que no estaban al guardar) en su lugar de siempre
export function ordenDe(keys, d) {
  const saved = (d.orden || []).filter((k) => keys.includes(k));
  const out = saved.slice();
  keys.forEach((k, i) => { if (!out.includes(k)) out.splice(Math.min(i, out.length), 0, k); });
  return out;
}
// Lo que hay en la pantalla, tal como está: los paneles (los conocidos y cualquier otro) y las tarjetas de cada grupo
const slug = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
export const nombre = (el) => {
  const h = el.querySelector("h1, h2, h3, .cw-h, .cg-lbl, strong, b, .eyebrow");
  return (el.getAttribute("aria-label") || (h && h.textContent) || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48);
};
const vacio = (el) => !el.textContent.trim() && !el.querySelector("img, svg, canvas, iframe, video");
const SALTA = ".crumbs, .ent-back, script, style, template, .ap-stk-add, .ap-libres, .no-print.fi-hint";
export function descubrir(v, s) {
  const box = s.wrap ? v.querySelector(s.wrap) : v; if (!box) return [];
  const used = new Set(), top = [];
  for (const [k, n, sel] of s.p) { const e0 = box.querySelector(`:scope > ${sel}`), el = e0 && !used.has(e0) ? e0 : null; if (el) used.add(el); top.push({ k, n, el }); }
  const seen = {};
  for (const el of box.children) {
    if (used.has(el) || el.matches(SALTA) || vacio(el)) continue;
    const base = "x:" + (el.id || el.classList[0] || el.tagName.toLowerCase()); seen[base] = (seen[base] || 0) + 1;
    top.push({ k: seen[base] > 1 ? base + seen[base] : base, n: nombre(el) || "Otro panel", el, auto: true });
  }
  const pos = (a, b) => (!a.el ? 1 : !b.el ? -1 : a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1);
  const out = [{ id: "", n: "", box, items: top.sort(pos) }];
  (s.g || []).forEach(([sel, n], gi) => {
    const b = v.querySelector(sel); if (!b) return;
    const sl = {};
    const items = [...b.children].filter((el) => !el.matches(SALTA)).map((el) => {
      let k = `g${gi}:` + (slug(nombre(el)) || el.tagName.toLowerCase()); sl[k] = (sl[k] || 0) + 1; if (sl[k] > 1) k += sl[k];
      return { k, n: nombre(el) || "Tarjeta", el };
    });
    if (items.length > 1) out.push({ id: sel, n, box: b, items });
  });
  return out;
}
// Vista previa en Gestión: la pantalla va dentro de un marco y recibe el borrador sin guardarlo
if (typeof window !== "undefined" && window.top !== window) window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || !e.data || !e.data.apPaneles) return;
  const { id, d } = e.data.apPaneles, s = pantalla(id), v = document.getElementById("view");
  if (!s || !v) return;
  cfg = { ...cfg, paneles: { ...(cfg.paneles || {}), [id]: d } };
  libEdit = !!e.data.apPaneles.edit; libSel = e.data.apPaneles.sel ?? -1;
  applyPaneles(v, s, d);
  applyLibres(v, s, d.libres || []);
});

// Stickers sueltos: van en una capa sobre la pantalla, amarrados a un panel (x e y en % del panel),
// así siguen en su lugar aunque los paneles cambien de orden o la pantalla de ancho.
let libEdit = false, libSel = -1;
export function applyLibres(v, s, list = []) {
  v.querySelectorAll(":scope > .ap-libres").forEach((x) => x.remove());
  v._apLib = null;
  if (!list.length) return;
  v.classList.add("ap-con-libres");
  const capa = document.createElement("div");
  capa.className = "ap-libres" + (libEdit ? " is-edit" : ""); capa.setAttribute("aria-hidden", "true");
  capa.innerHTML = list.map((it, i) => !it.v ? "" : `<div class="ap-libre${i === libSel ? " on" : ""}" data-i="${i}" style="--w:${+it.w || 90}px;--r:${+it.r || 0}deg">${stkHTML(it.v, "ap-libre-img")}${libEdit ? `<i class="ap-libre-h" data-h="1"></i>` : ""}</div>`).join("");
  v.appendChild(capa);
  v._apLib = { s, list };
  ubicar(v);
  if (!v._apRO && typeof ResizeObserver !== "undefined") { v._apRO = new ResizeObserver(() => ubicar(v)); v._apRO.observe(v); }
  [300, 1200, 3000].forEach((t) => setTimeout(() => ubicar(v), t)); // imágenes y paneles que llegan después
}
const anclas = (v, s) => ((descubrir(v, s)[0] || {}).items || []).filter((x) => x.el && !x.el.classList.contains("ap-oculto") && x.el.getClientRects().length);
// El panel que está bajo un punto (o el más cercano) y el punto en % de ese panel
function anclaEn(v, s, px, py) {
  let best = null, dist = 1e9;
  for (const a of anclas(v, s)) {
    const r = a.el.getBoundingClientRect(), d = py < r.top ? r.top - py : py > r.bottom ? py - r.bottom : 0;
    if (d < dist) { dist = d; best = { a, r }; }
  }
  if (!best) return null;
  const { a, r } = best, rd = (n) => Math.round(n * 10) / 10;
  return { k: a.k, x: rd(((px - r.left) / r.width) * 100), y: rd(((py - r.top) / r.height) * 100) };
}
function ubicar(v) {
  const L = v._apLib, capa = v.querySelector(":scope > .ap-libres"); if (!L || !capa) return;
  const vr = v.getBoundingClientRect(), by = new Map(anclas(v, L.s).map((x) => [x.k, x.el]));
  L.list.forEach((it, i) => {
    const el = capa.querySelector(`[data-i="${i}"]`); if (!el) return;
    if (!it.k && libEdit) { // recién agregado: al centro de lo que se está viendo
      const p = anclaEn(v, L.s, innerWidth / 2, innerHeight / 2);
      if (p) { Object.assign(it, p); avisar({ t: "mover", i, ...p }); }
    }
    const a = by.get(it.k);
    if (!a) { el.hidden = true; return; }
    el.hidden = false;
    const r = a.getBoundingClientRect();
    el.style.left = `${r.left - vr.left + ((it.x ?? 50) / 100) * r.width}px`;
    el.style.top = `${r.top - vr.top + ((it.y ?? 50) / 100) * r.height}px`;
  });
}
const avisar = (m) => { try { window.parent.postMessage({ apLib: m }, location.origin); } catch {} };
// En la vista previa de Gestión: arrastrar para mover y la esquina para agrandar
if (typeof window !== "undefined" && window.top !== window) {
  let drag = null;
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest && e.target.closest(".ap-libres.is-edit .ap-libre"); if (!el) return;
    const v = el.closest(".ap-con-libres"), i = +el.dataset.i, r = el.getBoundingClientRect();
    drag = { el, v, i, h: !!e.target.dataset.h, x0: e.clientX, y0: e.clientY, l0: parseFloat(el.style.left), t0: parseFloat(el.style.top), cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    el.setPointerCapture(e.pointerId); e.preventDefault();
    v.querySelectorAll(".ap-libre.on").forEach((x) => x.classList.toggle("on", x === el)); el.classList.add("on");
    libSel = i; avisar({ t: "sel", i });
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (drag.h) { drag.w = Math.max(36, Math.min(320, Math.round(2 * Math.max(Math.abs(e.clientX - drag.cx), Math.abs(e.clientY - drag.cy))))); drag.el.style.setProperty("--w", drag.w + "px"); }
    else { drag.el.style.left = `${drag.l0 + e.clientX - drag.x0}px`; drag.el.style.top = `${drag.t0 + e.clientY - drag.y0}px`; drag.moved = true; }
  });
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.h && d.w) { const it = d.v._apLib && d.v._apLib.list[d.i]; if (it) it.w = d.w; avisar({ t: "tam", i: d.i, w: d.w }); return; }
    if (!d.moved) return;
    const r = d.el.getBoundingClientRect(), L = d.v._apLib;
    const p = L && anclaEn(d.v, L.s, r.left + r.width / 2, r.top + r.height / 2);
    if (p) { Object.assign(L.list[d.i], p); avisar({ t: "mover", i: d.i, ...p }); ubicar(d.v); }
  });
}
// El sticker de un panel: se cambia el que trae, se quita, o se le pone uno en la esquina
const STK_SEL = [":scope > .sticker", ".cap-guide-art", ".hub-cb-art", ".plaza-scene img", ".sticker", ".z-sticker"];
function panelSticker(el, v) {
  if (el.dataset.apStk === v) return;
  el.dataset.apStk = v;
  el.querySelectorAll(":scope > .ap-stk-add").forEach((x) => x.remove());
  let cur = null;
  for (const sel of STK_SEL) { cur = [...el.querySelectorAll(sel)].find((x) => !x.closest(".car-track") && !(x.parentElement && x.parentElement.closest(".ap-oculto"))); if (cur) break; }
  if (v === "ninguno") { if (cur) cur.classList.add("ap-oculto"); return; }
  if (cur && cur.classList.contains("ap-oculto")) cur.classList.remove("ap-oculto");
  if (cur && /cap-guide-art|hub-cb-art/.test(cur.className)) cur.classList.add("ap-stk-on"), cur.innerHTML = stkHTML(v, "z-illus z-sticker cap-guide-il");
  else if (cur) cur.outerHTML = stkHTML(v, cur.getAttribute("class") || "sticker");
  else { el.classList.add("ap-has-stk"); el.insertAdjacentHTML("afterbegin", stkHTML(v, "ap-stk-add")); }
}
export function applyPaneles(v, s, d) {
  const grupos = descubrir(v, s);
  for (const g of grupos) {
    const vivos = g.items.filter((x) => x.el), keys = vivos.map((x) => x.k), by = new Map(vivos.map((x) => [x.k, x.el]));
    // Se reparten los lugares que ocupan, en el orden elegido (lo demás de la pantalla no se mueve)
    const marks = vivos.map((x) => { const m = document.createComment("p"); x.el.before(m); return m; });
    ordenDe(keys, d).forEach((k, i) => marks[i].replaceWith(by.get(k)));
    for (const [k, el] of by) {
      const o = (d.p || {})[k] || {};
      if (o.sticker) panelSticker(el, o.sticker);
      el.classList.toggle("ap-oculto", !!o.oculto);
      el.classList.toggle("ap-panel", !!(o.tam || o.ancho));
      if (o.tam && o.tam !== 100) el.style.setProperty("--ap-tam", String(o.tam / 100)); else el.style.removeProperty("--ap-tam");
      if (o.ancho && o.ancho < 100) el.style.setProperty("--ap-ancho", o.ancho + "%"); else el.style.removeProperty("--ap-ancho");
    }
  }
  return grupos.length ? grupos[0].items.filter((x) => !x.el).length : 1;
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
    if (applyPaneles(v, s, d)) setTimeout(() => { if (s.re.test((location.hash || "#/").slice(1).split("?")[0])) { applyPaneles(v, s, d); ubicar(v); } }, 900);
    applyLibres(v, s, d.libres || []);
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
    const host = (z.stkHost && el.closest(z.stkHost)) || el;
    const img = z.stkSel ? host.querySelector(z.stkSel) : host.querySelector(":scope > .sticker");
    if (d.sticker === "ninguno") { if (img) img.remove(); }
    else if (img) { const par = img.parentElement; img.outerHTML = stkHTML(d.sticker, img.getAttribute("class") || "sticker"); if (par && par.classList.contains("hub-cb-art")) par.classList.add("ap-stk-on"); }
    else if (!z.stkSel) { host.classList.add("has-sticker"); host.insertAdjacentHTML("afterbegin", stkHTML(d.sticker, "sticker")); }
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
