// Guía de agAPPe (#/guia): cómo funciona la app, para todos y sin cuenta. Es lo que antes era el curso
// abierto «Bienvenido a agAPPe», ahora como guía para leer: sin unidades, avance ni evaluaciones.

import { esc, icon, rich } from "./util.js";
import { illus } from "./ilustraciones.js";

// Párrafos (línea en blanco) y listas ("- ") con negritas seguras
const prosa = (t) => String(t || "").split(/\n\s*\n/).map((b) => {
  const l = b.split("\n").map((x) => x.trim()).filter(Boolean);
  return l.length && l.every((x) => /^-\s+/.test(x)) ? `<ul>${l.map((x) => `<li>${rich(x.replace(/^-\s+/, ""))}</li>`).join("")}</ul>` : `<p>${rich(l.join(" "))}</p>`;
}).join("");

const PARTES = [
  { id: "casa", ill: "acogida", t: "Esto es agAPPe", sub: "Para qué existe y qué lugar ocupa", secs: [
    ["Una casa abierta", "Ágape es la palabra griega que usa el Nuevo Testamento para hablar del amor de Dios: un amor que se entrega sin esperar nada a cambio. De ahí viene el nombre de nuestra pastoral juvenil.\n\nagAPPe es nuestra casa virtual: un lugar para rezar juntos, compartir lo que vivimos y seguir encontrándonos entre un encuentro y otro."],
    ["Una puerta, no un reemplazo", "La app no reemplaza el encuentro cara a cara ni la Misa del domingo. Es una puerta: nos ayuda a llegar mejor preparados y a no perder el hilo durante la semana.\n\nEl centro sigue siendo Jesús, que nos reúne en la Eucaristía y en la comunidad."],
    ["Para todos", "Esta guía es para todos: jóvenes, dirigentes, familias y quienes nos visitan por primera vez. No necesitas cuenta para leerla."],
  ] },
  { id: "moverte", ill: "camino", t: "Cómo moverte", sub: "Las cuatro puertas y las ayudas de siempre", secs: [
    ["Cuatro puertas", "En el celular las encuentras abajo; en el computador, arriba:\n\n- <strong>Hoy</strong>: lo de cada día: el Evangelio, las novedades y lo que se viene.\n- <strong>Recursos</strong>: materiales, presentaciones, dinámicas y esta guía.\n- <strong>Orar</strong>: la Capilla Ágape, un lugar para rezar.\n- <strong>Comunidad</strong>: el desafío de la semana, la agenda, el muro, el chat y los juegos."],
    ["Ayudas que siempre están", "- <strong>La lupa</strong>: busca en toda la app una oración, una canción, un salmo o un juego.\n- <strong>La campanita</strong>: las novedades desde tu última visita (con cuenta).\n- <strong>Ayuda y Accesibilidad</strong>: en tu perfil; agranda la letra o haz que el teléfono te lea los textos."],
    ["Tenla en tu celular", "Puedes dejar agAPPe en la pantalla de inicio de tu teléfono y abrirla como cualquier aplicación:\n\n- En Android, desde Chrome: abre el menú ⋮ y elige «Instalar app».\n- En iPhone, desde Safari: toca Compartir y luego «Agregar a inicio»."],
  ] },
  { id: "hoy", ill: "luz", t: "Hoy: cada día, algo nuevo", sub: "Lo que te espera al abrir la app", secs: [
    ["La Palabra de hoy", "Lo primero que ves es una frase del Evangelio del día. Tócala para leerlo completo y ver un video breve que lo comenta."],
    ["Lo que está pasando", "Más abajo están las novedades de la pastoral, las cuentas regresivas para lo que se viene, los cumpleaños y las fechas que celebramos como comunidad."],
    ["Tu Pasaporte Ágape", "Cada rincón de la app que visitas en el mes te da un sello. Recórrelos todos y recibe un marco especial para tu foto. En Hoy te recomendamos cada día un rincón nuevo."],
  ] },
  { id: "orar", ill: "oracion", t: "Orar: un lugar para rezar", sub: "La Capilla Ágape y sus formas de rezar", secs: [
    ["La Capilla Ágape", "Siempre abierta, para ti y para tu familia, estés donde estés. Aquí está el Evangelio del día, la Misa de hoy en video y, debajo del Evangelio, una invitación para seguir rezándolo."],
    ["Formas de rezar", "- <strong>El Rosario</strong>: cuenta a cuenta, con los misterios del día y una voz que te guía.\n- <strong>Un rato con Jesús</strong>: oración personal en tu casa o ante el Santísimo.\n- <strong>Salmos</strong>: elige cómo llegas hoy y reza con el salmo que te acompaña.\n- <strong>Recemos juntos</strong>: nuestras oraciones y las de siempre.\n- <strong>Cancionero</strong>: canciones con acordes para la Misa y los encuentros."],
    ["Nadie reza solo", "Enciende una vela con tu intención y toca «Rezo contigo» en las de otros. Las intenciones de la semana las llevamos a la misa del grupo."],
  ] },
  { id: "comunidad", ill: "amigos", t: "Comunidad: donde nos encontramos", sub: "Lo que compartimos entre un encuentro y otro", secs: [
    ["El desafío de la semana", "Un gesto concreto para vivir durante la semana. Cuando lo hagas, toca «¡Lo cumplí!»."],
    ["La agenda", "Todos los encuentros, misas y actividades. Puedes sumar la agenda al calendario de tu celular y los cambios te llegan solos."],
    ["La Plaza Ágape", "- <strong>Momentos</strong>: las fotos de lo que vivimos juntos.\n- <strong>Muro</strong>: avisos, preguntas, encuestas y logros del grupo.\n- <strong>Chat</strong>: salas para conversar.\n- <strong>Juegos</strong>: Emaús, la Trivia Ágape y otros para jugar solo o con amigos."],
    ["Como si estuviéramos frente a frente", "Lo que escribimos en el muro y en el chat lo lee todo el grupo. Escribimos con respeto, con alegría y pensando en el otro."],
  ] },
  { id: "recursos", ill: "biblia", t: "Recursos", sub: "Para preparar, invitar y compartir", secs: [
    ["Materiales", "Presentaciones, guías para el encuentro, el banco de dinámicas, credenciales y todo lo que se imprime. Sin cuenta ves lo de difusión, música, oración y la biblioteca digital."],
    ["Estudio de difusión", "Marcos para tu foto, historias, stickers y fondos de pantalla con la identidad de Ágape, para compartir en tus estados y grupos."],
  ] },
  { id: "cuenta", ill: "celular", t: "Tu cuenta", sub: "Qué puedes hacer sin cuenta y qué se abre con ella", secs: [
    ["Sin cuenta", "- Leer el Evangelio del día y ver su video.\n- Rezar el Rosario, los Salmos y las oraciones de Recemos juntos.\n- Dejar tu intención en la Capilla.\n- Ver la agenda y jugar."],
    ["Con tu cuenta", "- El muro, el chat y los momentos.\n- Las intenciones de la comunidad y el cancionero completo.\n- Tu perfil, tu avatar y tu Pasaporte guardado en todos tus dispositivos."],
    ["Cómo tenerla", "- Pídele a tu dirigente que te invite con tu correo de Google, o solicítala desde «Ingresar».\n- Toca «Ingresar», arriba a la derecha, y elige ese mismo correo.\n- Arma tu avatar y pasa a saludar a la comunidad."],
    ["Nos cuidamos", "En agAPPe nos tratamos como en casa: con respeto y con cariño. Los jóvenes aparecen solo con su nombre y la inicial del apellido."],
  ] },
];

export function view() {
  return `<header class="page-head"><span class="eyebrow">Para todos</span><h1>Guía de <em>agAPPe</em></h1>
    <p>Cómo funciona la app: sus rincones, tu cuenta y dónde pedir ayuda. Toca cada parte para abrirla.</p></header>
    <nav class="guia-ix" aria-label="Partes de la guía">${PARTES.map((p) => `<a href="#g-${p.id}" data-guia="${p.id}">${esc(p.t)}</a>`).join("")}</nav>
    <div class="guia">${PARTES.map((p, i) => `<details class="card guia-p" id="g-${p.id}" ${i === 0 ? "open" : ""}>
      <summary><span class="guia-ill" aria-hidden="true">${illus(p.ill, "")}</span>
        <span class="guia-st"><b>${esc(p.t)}</b><small>${esc(p.sub)}</small></span>${icon("down")}</summary>
      <div class="guia-body">${p.secs.map(([h, x]) => `<section><h3>${esc(h)}</h3>${prosa(x)}</section>`).join("")}</div>
    </details>`).join("")}</div>
    <p class="guia-fin">Ya conoces la casa. Lo más importante: el encuentro verdadero es con Jesús, en la Eucaristía y en la comunidad. Te esperamos en el próximo encuentro.</p>
    <div class="row-wrap" style="gap:8px;margin-top:10px"><a class="btn btn-gold" href="#/">Ir a Hoy ${icon("arrowR")}</a><a class="btn btn-ghost" href="#/ayuda">Ayuda</a></div>`;
}

// El índice abre la parte elegida
if (typeof document !== "undefined") document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("[data-guia]"); if (!a) return;
  e.preventDefault();
  const d = document.getElementById("g-" + a.dataset.guia); if (!d) return;
  d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" });
});
