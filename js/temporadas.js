// Campañas de temporada: Mes de María (8 de noviembre al 8 de diciembre) y Calendario de Adviento
// (del primer domingo de Adviento al 24 de diciembre). Cada una tiene su página, abierta a todos,
// y una tarjeta en Inicio y en la Capilla mientras dura.

import { esc, icon } from "./util.js";
import * as cloud from "./cloud.js";
import { illus } from "./ilustraciones.js";
import { TOOLS, ilu } from "./descubre.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const pad = (n) => String(n).padStart(2, "0");
const hoy0 = () => new Date(new Date().toDateString());
const dif = (a, b) => Math.round((a - b) / 864e5);
const largo = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;

// --- Mes de María -----------------------------------------------------------------
// En Chile se reza del 8 de noviembre al 8 de diciembre (Inmaculada Concepción).
export function mesMaria(d = hoy0()) {
  let y = d.getFullYear();
  if (d.getMonth() === 0) y -= 1;
  const ini = new Date(y, 10, 8), fin = new Date(y, 11, 8);
  const dia = dif(d, ini) + 1;
  return { ini, fin, dia, activo: d >= ini && d <= fin, pronto: dif(ini, d) > 0 && dif(ini, d) <= 6 ? dif(ini, d) : 0 };
}
// Una flor para María cada día: un gesto sencillo para ofrecerle
export const FLORES = [
  "Hoy le ofrezco a María un saludo: rezo un Avemaría apenas despierte.",
  "Hoy le ofrezco mi paciencia: no levanto la voz aunque me cueste.",
  "Hoy le ofrezco un gracias: se lo digo a alguien de mi casa sin que me lo pida.",
  "Hoy le ofrezco mi tiempo: dejo el celular quince minutos para estar con alguien.",
  "Hoy le ofrezco mi alegría: comparto algo bueno que me pasó.",
  "Hoy le ofrezco mi ayuda: hago una tarea de la casa sin que me lo pidan.",
  "Hoy le ofrezco una intención: rezo por alguien que está enfermo.",
  "Hoy le ofrezco mi perdón: suelto un enojo que vengo cargando.",
  "Hoy le ofrezco mi estudio o mi trabajo: lo hago con cariño, como para Ella.",
  "Hoy le ofrezco mi escucha: atiendo de verdad a quien me habla.",
  "Hoy le ofrezco mi sencillez: no presumo ni me comparo.",
  "Hoy le ofrezco una decena del Rosario por mi familia.",
  "Hoy le ofrezco mi confianza: le entrego algo que me preocupa.",
  "Hoy le ofrezco mi generosidad: comparto algo mío con alguien.",
  "Hoy le ofrezco mis palabras: no hablo mal de nadie.",
  "Hoy le ofrezco mi visita: escribo a alguien que está solo.",
  "Hoy le ofrezco mi humildad: pido perdón si me equivoqué.",
  "Hoy le ofrezco mi fe: leo el Evangelio del día con calma.",
  "Hoy le ofrezco mi servicio: ayudo a un compañero que lo necesita.",
  "Hoy le ofrezco mi gratitud: anoto tres regalos que Dios me dio hoy.",
  "Hoy le ofrezco una canción: canto o escucho un canto a María.",
  "Hoy le ofrezco mi silencio: regalo diez minutos a Jesús.",
  "Hoy le ofrezco mi amabilidad: sonrío y saludo a quien me cruce.",
  "Hoy le ofrezco mi oración por los jóvenes de Ágape y por sus familias.",
  "Hoy le ofrezco mi pureza de corazón: cuido lo que miro y lo que digo.",
  "Hoy le ofrezco mi esperanza: animo a alguien que está desanimado.",
  "Hoy le ofrezco mi casa: rezo junto a mi familia, aunque sea un Avemaría.",
  "Hoy le ofrezco mi constancia: termino algo que dejé a medias.",
  "Hoy le ofrezco mi invitación: invito a alguien a rezar el Rosario conmigo.",
  "Hoy le ofrezco mi sí: como Ella, digo «hágase» a lo que Dios me pida.",
  "Hoy, fiesta de la Inmaculada, le ofrezco todo el mes: gracias, Madre, por acompañarnos.",
];
export const florDe = (dia) => FLORES[Math.max(0, Math.min(FLORES.length - 1, dia - 1))];

// --- Adviento ------------------------------------------------------------------
export function adviento(d = hoy0()) {
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const ini = new Date(y, 11, 3); ini.setDate(ini.getDate() - ini.getDay()); // primer domingo de Adviento
  const fin = new Date(y, 11, 24);
  const dias = dif(fin, ini) + 1, dia = dif(d, ini) + 1;
  return { ini, fin, dias, dia, activo: d >= ini && d <= fin, pronto: dif(ini, d) > 0 && dif(ini, d) <= 7 ? dif(ini, d) : 0 };
}
// Una ventanita por día: una palabra y una herramienta de la app para vivirla
const VENTANAS = [
  ["evangelio", "Despierta", "El Adviento empieza con una palabra: «¡velen!». Lee el Evangelio de hoy y pregúntate qué te tiene dormido."],
  ["intenciones", "Una luz para otro", "Enciende una vela por alguien que está pasando un momento difícil."],
  ["cancionero", "Canta la espera", "Busca un canto en el Cancionero y tararéalo durante el día."],
  ["salmos", "Ven, Señor", "Elige cómo llegas hoy y reza con el salmo que te toca."],
  ["rato", "Diez minutos con Él", "Regálale a Jesús un rato de silencio. Él también te espera."],
  ["difusion", "Invita a alguien", "Arma una historia en el Estudio de difusión e invita a un amigo a preparar la Navidad."],
  ["rosario", "Con María, esperando", "Reza un misterio del Rosario: nadie supo esperar como Ella."],
  ["oremus", "Palabras para rezar", "Elige una oración de Recemos juntos y rézala despacio antes de dormir."],
  ["juegos", "La alegría del encuentro", "Juega una trivia y compártela con el grupo: la fe también se celebra."],
  ["radio", "Música para el camino", "Escucha una radio católica mientras haces tus cosas."],
  ["evangelio", "Prepara el camino", "Juan el Bautista grita en el desierto. ¿Qué camino necesitas enderezar?"],
  ["intenciones", "Reza por otro", "Entra a Nuestras intenciones y toca «Rezo contigo» en tres velas."],
  ["podcast", "Escuchar para crecer", "Escucha un episodio del podcast en el camino."],
  ["salmos", "Alégrate", "Estamos a mitad de camino: reza un salmo de alegría."],
  ["rato", "Hazle espacio", "En un rato de silencio, dile a Jesús qué quieres regalarle esta Navidad."],
  ["difusion", "Comparte la espera", "Ponle a tu foto un marco de Ágape y compártelo en tus estados."],
  ["evangelio", "Hágase", "María dijo sí sin entenderlo todo. Lee el Evangelio y pídele su confianza."],
  ["cancionero", "Canta con el grupo", "Elige un canto para la misa de Navidad y apréndete los acordes."],
  ["rosario", "Los misterios gozosos", "Reza los misterios gozosos: la historia de la Navidad cuenta a cuenta."],
  ["intenciones", "Por las familias", "Enciende una vela por las familias que están separadas o con problemas."],
  ["oremus", "Bendice la mesa", "Busca en Recemos juntos una bendición de la mesa y rézala hoy con tu familia."],
  ["juegos", "Prepara la fiesta", "Elige un juego para compartir en Navidad con tu familia o tus amigos."],
  ["evangelio", "José, el justo", "Lee el Evangelio y aprende de José: confiar, cuidar y hacer silencio."],
  ["rato", "El pesebre del corazón", "Un rato con Jesús: ordena tu corazón como quien prepara el pesebre."],
  ["salmos", "Ya llega", "Reza un salmo de esperanza: el Señor está cerca."],
  ["intenciones", "Por los que están solos", "Enciende una vela por quienes pasarán la Navidad solos."],
  ["podcast", "Un regalo para escuchar", "Comparte un episodio del podcast con alguien que lo necesite."],
  ["cancionero", "Noche de paz", "Busca un villancico en el Cancionero y cántalo con tu familia."],
];
const ESPECIALES = {
  "12-08": ["rosario", "Inmaculada Concepción", "Hoy celebramos a María Inmaculada y termina el Mes de María. Reza el Rosario y dale gracias."],
  "12-12": ["oremus", "Virgen de Guadalupe", "La Morenita del Tepeyac, madre de América. Rézale un Avemaría por nuestro continente."],
  "12-24": ["evangelio", "Esta noche nace Jesús", "Lee el Evangelio de la Nochebuena y prepara tu corazón: ¡Dios se hace niño!"],
};
export function ventana(i, a = adviento()) {
  const d = new Date(a.ini); d.setDate(d.getDate() + i);
  const md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const v = ESPECIALES[md] || VENTANAS[i % VENTANAS.length];
  return { i, d, k: v[0], t: v[1], x: v[2], tool: TOOLS.find((x) => x.k === v[0]) };
}
const AKEY = "agape_adviento";
const abiertas = () => { try { const o = JSON.parse(localStorage.getItem(AKEY) || "null"); return o && o.y === adviento().ini.getFullYear() ? o.a : []; } catch { return []; } };
const abrir = (i) => { try { const a = [...new Set([...abiertas(), i])]; localStorage.setItem(AKEY, JSON.stringify({ y: adviento().ini.getFullYear(), a })); } catch {} };

// --- Tarjetas (Inicio y Capilla) ----------------------------------------------------
export function tarjetaHTML() {
  const a = adviento(), m = mesMaria();
  const out = [];
  if (a.activo) out.push(`<a class="card link tp-card tp-adv" href="#/adviento">
      <span class="tp-ill">${illus("l_navidad")}</span>
      <span class="tp-txt"><span class="tp-hand">calendario de Adviento</span><strong>Día ${a.dia}: abre la ventanita de hoy</strong>
        <span>Cada día, una sorpresa para preparar la Navidad.</span></span><span class="ds-go" aria-hidden="true">${icon("arrowR")}</span></a>`);
  else if (a.pronto) out.push(`<a class="card link tp-card tp-adv" href="#/adviento"><span class="tp-ill">${illus("l_navidad")}</span>
      <span class="tp-txt"><span class="tp-hand">se viene el Adviento</span><strong>En ${a.pronto} ${a.pronto === 1 ? "día" : "días"} se abre el Calendario de Adviento</strong>
        <span>Una ventanita por día hasta Navidad.</span></span><span class="ds-go" aria-hidden="true">${icon("arrowR")}</span></a>`);
  if (m.activo) out.push(`<a class="card link tp-card tp-maria" href="#/mesdemaria">
      <span class="tp-ill">${illus("maria")}</span>
      <span class="tp-txt"><span class="tp-hand">Mes de María · día ${m.dia} de 31</span><strong>La flor de hoy para María</strong>
        <span>${esc(florDe(m.dia))}</span></span><span class="ds-go" aria-hidden="true">${icon("arrowR")}</span></a>`);
  else if (m.pronto) out.push(`<a class="card link tp-card tp-maria" href="#/mesdemaria"><span class="tp-ill">${illus("maria")}</span>
      <span class="tp-txt"><span class="tp-hand">se viene el Mes de María</span><strong>En ${m.pronto} ${m.pronto === 1 ? "día" : "días"} empezamos el Mes de María</strong>
        <span>Del 8 de noviembre al 8 de diciembre: una flor para María cada día.</span></span><span class="ds-go" aria-hidden="true">${icon("arrowR")}</span></a>`);
  return out.join("");
}
export function paintHome() { const s = document.getElementById("temporadaSlot"); if (s) s.innerHTML = tarjetaHTML(); }

// --- Página del Mes de María ---------------------------------------------------------
export async function viewMaria() {
  const m = mesMaria(), mes = `${m.ini.getFullYear()}-11`, mes2 = `${m.ini.getFullYear()}-12`;
  setTimeout(async () => {
    const [a, b] = await Promise.all([cloud.rosariosMes(mes).catch(() => null), cloud.rosariosMes(mes2).catch(() => null)]);
    const el = document.getElementById("tpRos"); if (!el || (a == null && b == null)) return;
    const n = (a || 0) + (b || 0);
    el.innerHTML = n ? `<b>${n}</b> ${n === 1 ? "rosario rezado" : "rosarios rezados"} por la comunidad entre noviembre y diciembre` : "Sé el primero en rezar el Rosario este mes.";
  }, 30);
  const dia = m.activo ? m.dia : m.dia > 31 ? 31 : 0;
  const lista = dia ? FLORES.slice(0, dia).map((f, i) => ({ f, i })).reverse() : [];
  return `<header class="page-head"><span class="eyebrow">8 de noviembre al 8 de diciembre</span><h1>Mes de <em>María</em></h1>
    <p>Durante un mes, le llevamos flores a María: un gesto sencillo cada día y el Rosario, rezado en comunidad desde donde estemos.</p></header>
    <section class="card tp-hero tp-maria">
      <div class="tp-hero-ill">${illus("maria")}</div>
      <div class="tp-txt">${m.activo ? `<span class="tp-hand">día ${m.dia} de 31 · ${esc(largo(hoy0()))}</span>
        <h2>La flor de hoy</h2><p class="tp-flor">${esc(florDe(m.dia))}</p>`
        : m.dia < 1 ? `<span class="tp-hand">${m.pronto ? `en ${m.pronto} ${m.pronto === 1 ? "día" : "días"}` : "muy pronto"}</span><h2>El Mes de María comienza el 8 de noviembre</h2><p>Cada día habrá aquí una flor para ofrecerle a María.</p>`
        : `<span class="tp-hand">gracias, Madre</span><h2>El Mes de María terminó</h2><p>Volvemos a encontrarnos el próximo 8 de noviembre.</p>`}
        <div class="row-wrap" style="gap:8px;margin-top:10px">
          <a class="btn btn-gold" href="#/oracion/rosario">${icon("flame")} Rezar el Rosario</a>
          <button class="btn btn-ghost btn-sm" data-action="tpMarco" data-f="maria">Marco Mes de María para mi foto</button></div>
        <p class="small" id="tpRos" style="margin-top:10px"></p>
      </div></section>
    <section class="card" style="margin-top:14px"><h3>Una oración para cada día</h3>
      <p style="margin-top:6px">María, Madre de Jesús y madre nuestra: en este mes queremos estar cerca de ti. Recibe la flor que hoy te ofrecemos, sencilla como nuestra vida. Enséñanos a decir «sí» a Dios como tú, a cuidar a los demás y a llevar a Jesús a quienes no lo conocen. Amén.</p></section>
    ${lista.length > 1 ? `<section class="card" style="margin-top:14px"><h3>Las flores de este mes</h3>
      <ol class="tp-flores">${lista.map(({ f, i }) => `<li><b>Día ${i + 1}</b> ${esc(f)}</li>`).join("")}</ol></section>` : ""}`;
}

// --- Página del Calendario de Adviento -------------------------------------------------
export function viewAdviento() {
  const a = adviento(), ab = abiertas();
  const orden = Array.from({ length: a.dias }, (_, i) => i).sort((x, y) => ((x * 7 + 3) % a.dias) - ((y * 7 + 3) % a.dias));
  const puerta = (i) => {
    const v = ventana(i, a), pasada = a.dia > i + 1 || (!a.activo && a.dia > a.dias), hoy = a.activo && a.dia === i + 1, open = ab.includes(i);
    const cls = open ? "open" : hoy ? "hoy" : pasada ? "pasada" : "cerrada";
    return `<button class="tp-door ${cls}" data-action="tpAbrir" data-i="${i}" ${!hoy && !pasada && !open ? "disabled" : ""} aria-label="Día ${v.d.getDate()} de ${MESES[v.d.getMonth()]}${open ? ": " + esc(v.t) : ""}">
      <b>${v.d.getDate()}</b>${open ? `<span class="tp-door-ill">${v.tool ? ilu(v.tool) : ""}</span><small>${esc(v.t)}</small>` : hoy ? `<small>¡Ábreme!</small>` : ""}</button>`;
  };
  const antes = !a.activo && a.dia < 1;
  return `<header class="page-head"><span class="eyebrow">Preparamos la Navidad</span><h1>Calendario de <em>Adviento</em></h1>
    <p>Cada día se abre una ventanita con una palabra y un rincón de la app para vivirla. Las de días anteriores también se pueden abrir.</p></header>
    ${antes ? `<p class="note">El calendario se abre el ${esc(largo(a.ini))}, primer domingo de Adviento.</p>` : ""}
    <section class="tp-cal" aria-label="Ventanitas de Adviento">${orden.map(puerta).join("")}</section>
    <div id="tpVen"></div>`;
}
function verVentana(i) {
  const v = ventana(i), box = document.getElementById("tpVen"); if (!box) return;
  abrir(i);
  box.innerHTML = `<section class="card tp-hero tp-adv tp-ven">
    <div class="tp-hero-ill">${v.tool ? ilu(v.tool) : ""}</div>
    <div class="tp-txt"><span class="tp-hand">${esc(largo(v.d))}</span><h2>${esc(v.t)}</h2><p>${esc(v.x)}</p>
      ${v.tool ? `<a class="btn btn-gold" href="${v.tool.href}" style="margin-top:8px">Ir a ${esc(v.tool.n)} ${icon("arrowR")}</a>` : ""}</div></section>`;
  const door = document.querySelector(`.tp-door[data-i="${i}"]`);
  if (door) { door.className = "tp-door open"; door.disabled = false; door.innerHTML = `<b>${v.d.getDate()}</b><span class="tp-door-ill">${v.tool ? ilu(v.tool) : ""}</span><small>${esc(v.t)}</small>`; }
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

export function setup(c) {
  const A = c.actions;
  A.tpAbrir = (el) => verVentana(+el.dataset.i);
  A.tpMarco = (el) => { try { sessionStorage.setItem("dif_pre", JSON.stringify({ tab: "marco", frame: el.dataset.f })); } catch {} location.hash = "#/difusion"; };
}

// Después de leer el Evangelio: una sola invitación para seguir rezándolo (cambia según el día;
// en el Mes de María y en Adviento, su campaña). Va en la Capilla, bajo el Evangelio.
const DESPUES = [
  ["rato", "Quédate un rato con Él", "Unos minutos de silencio con lo que escuchaste hoy."],
  ["salmos", "Responde con un salmo", "Elige cómo llegas y reza el Evangelio con un salmo."],
  ["rato", "Deja que la Palabra te hable", "Un rato de silencio guiado, al estilo de Santa Teresa."],
  ["rosario", "Medítalo junto a María", "Reza un misterio del Rosario con lo que leíste."],
  ["intenciones", "Lleva a alguien en tu oración", "Enciende una vela por quien te vino a la mente al leer."],
  ["oremus", "Termina con una oración", "Elige una oración de Recemos juntos para cerrar tu lectura."],
  ["cancionero", "Canta la Palabra", "Busca una canción que te ayude a rezar lo de hoy."],
];
export function despuesEvangelio(d = hoy0()) {
  const a = adviento(d), m = mesMaria(d);
  if (a.activo) return { ill: "l_navidad", t: `Calendario de Adviento · día ${a.dia}`, x: "Abre la ventanita de hoy y sigue preparando la Navidad.", href: "#/adviento" };
  if (m.activo) return { ill: "maria", t: `Mes de María · día ${m.dia}`, x: florDe(m.dia), href: "#/mesdemaria" };
  const [k, t, x] = DESPUES[d.getDay()], tool = TOOLS.find((y) => y.k === k);
  return { tool, t, x, href: tool.href };
}
export function despuesHTML() {
  const v = despuesEvangelio();
  return `<a class="card link tp-card tp-despues" href="${v.href}">
    <span class="tp-ill">${v.tool ? ilu(v.tool) : illus(v.ill)}</span>
    <span class="tp-txt"><span class="tp-hand">para seguir rezándolo</span><strong>${esc(v.t)}</strong><span>${esc(v.x)}</span></span>
    <span class="ds-go" aria-hidden="true">${icon("arrowR")}</span></a>`;
}
