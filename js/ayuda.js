// Ayuda (#/ayuda): respuestas cortas a «¿Cómo hago…?», solo las que sirven a tu perfil,
// con un botón «Muéstrame» que te lleva a la pantalla y señala el botón exacto.

import { esc, icon } from "./util.js";
import { illus } from "./ilustraciones.js";

let ctx = null; // { actions, render, onAfterRender, cloud }
export function setup(c) { ctx = c; registerActions(); }

// Perfiles: visitante, joven (Ingreso y Madurez), aspirante, dirigente, coordinador, admin.
const CUENTA = ["joven", "aspirante", "dirigente", "coordinador", "admin"];
const GUIAS = ["dirigente", "coordinador", "admin"];
const EQUIPO = ["coordinador", "admin"];
const TEMAS = [
  ["inicio", "Primeros pasos"], ["agenda", "Agenda"], ["muro", "Muro y chat"],
  ["oracion", "Capilla y cancionero"], ["itinerario", "Formación"], ["comunidad", "Acompañar"], ["admin", "Gestión"],
];
const T = [
  // Primeros pasos
  { t: "inicio", q: "¿Hay una guía para conocer la app?", who: ["visitante", ...CUENTA], a: ["Sí: en Formación está «Bienvenido a agAPPe», un curso corto para todos.", "Son 7 unidades breves: cómo moverte, qué hay en cada pestaña y qué se abre con tu cuenta.", "No necesitas cuenta para hacerlo."], go: "#/formacion" },
  { t: "inicio", q: "¿Cómo entro a la app?", who: ["visitante"], a: ["Toca «Ingresar» arriba a la derecha.", "Elige «Continuar con Google» con el correo con que te invitaron.", "Si dice que tu correo no está invitado, pídele al equipo que te invite con ese correo."], go: "#/perfil", el: "[data-action=signIn]" },
  { t: "inicio", q: "¿Cómo instalo la app en mi celular?", who: ["visitante", ...CUENTA], a: ["En Android (Chrome): menú ⋮ → «Instalar app» o «Agregar a pantalla principal».", "En iPhone (Safari): botón Compartir → «Agregar a inicio».", "Queda como un ícono más y funciona aunque tengas poca señal."], go: "#/perfil", el: "[data-action=install]" },
  { t: "inicio", q: "¿Cómo pongo el marco de Ágape en mi foto de perfil?", who: CUENTA, a: ["En Comunidad toca «Estudio de difusión» → «Marco de foto».", "Elige tu foto y un marco; ajusta con «Acercar» y «Mover».", "Toca «Descargar» y ponla de foto en WhatsApp o Facebook. Tu foto no se sube a ninguna parte."], go: "#/difusion", el: ".dif-tabs" },
  { t: "inicio", q: "¿Cómo hago una historia o invito a alguien?", who: CUENTA, a: ["En «Estudio de difusión» elige una plantilla: frase, actividad de la agenda, cuenta regresiva o invitación.", "Cambia estilo, dibujo y formato (Estado, post o cuadrado).", "Toca «Compartir» para mandarla directo a WhatsApp o Instagram."], go: "#/difusion", el: ".dif-form" },
  { t: "inicio", q: "¿Cómo agrando la letra o hago que la app me lea?", who: ["visitante", ...CUENTA], a: ["Abre «Accesibilidad» (al final de cualquier página o en Mi perfil).", "Elige el tamaño de la letra y activa «Lectura fácil» si quieres textos más claros.", "Activa «Escuchar» y aparecerá un botón para que el teléfono te lea en voz alta."], go: "#/accesibilidad", el: "#a11yPanel" },
  { t: "comunidad", q: "¿Cómo acompaño a un joven con discapacidad?", who: GUIAS, a: ["Pregúntale a la persona y a su familia qué le ayuda y qué le gusta. No decidas en su lugar.", "Dale tiempo: espera su respuesta y no respondas por ella.", "Explica con ejemplos concretos y frases cortas; muestra en vez de solo decir.", "Ofrece formas de participar sin hablar en público: escribir, dibujar, encender la vela, tocar un instrumento.", "En las dinámicas, adapta las reglas para que todos puedan jugar.", "Muéstrale «Accesibilidad»: letra grande, lectura fácil y «Escuchar»."], go: "#/accesibilidad" },
  { t: "inicio", q: "¿Cómo elijo mi avatar?", who: CUENTA, a: ["Entra a Mi perfil (tu nombre, arriba a la derecha).", "Arma tu monito (peinado, cara, ropa, fondo…) o elige un personaje o un sticker de Ágape.", "Toca «Guardar avatar». Se verá en el chat y en el muro."], go: "#/perfil", el: "#avCard" },
  { t: "inicio", q: "¿Qué es el desafío de la semana?", who: CUENTA, a: ["Es un gesto concreto para vivir durante la semana. Aparece en Comunidad cuando el equipo lo propone.", "Cuando lo hagas, toca «¡Lo cumplí!». Los demás verán que lo cumpliste."], go: "#/red", el: "[data-action=desDone]" },
  { t: "inicio", q: "Soy nuevo: ¿quiero ser dirigente, por dónde parto?", who: ["visitante"], a: ["Mira la presentación «Sé puente»: cuenta qué es ser dirigente en Ágape.", "Después conversa con alguien del equipo: ellos te invitan a la app."], href: "presentaciones/se-puente.html" },


  // Agenda
  { t: "agenda", q: "¿Cómo tengo la agenda en el calendario de mi celular?", who: ["visitante", ...CUENTA], a: ["En Agenda, toca «Suscribirme al calendario».", "Elige Google Calendar o iPhone. Se hace una sola vez y los cambios llegan solos."], go: "#/agenda", el: "[data-action=agSub]" },
  { t: "agenda", q: "¿Cómo creo un evento?", who: EQUIPO, a: ["En Agenda, toca «Nuevo evento».", "Completa título, fecha y hora. Si se repite, elige cada cuánto.", "Marca «Visible para familias» si las familias deben verlo."], go: "#/agenda", el: "[data-action=agNew]" },
  { t: "agenda", q: "¿Cómo pido autorización a los papás para una salida?", who: EQUIPO, a: ["Al crear o editar el evento, marca «¿Requiere autorización de papás o apoderados?».", "Completa salida, regreso, lugar, aporte y qué llevar. Con «Ver cómo queda el PDF» lo revisas.", "Las familias lo descargan desde la página para familias o desde el evento."], go: "#/agenda", el: "[data-action=agNew]" },
  { t: "agenda", q: "¿Cómo pongo una cuenta regresiva para un evento?", who: EQUIPO, a: ["Crea o edita el evento en la Agenda, con su fecha y hora.", "Marca «Mostrar cuenta regresiva en Inicio» y elige desde cuándo se ve.", "Si quieres, en «Imagen de fondo» sube una foto o un logo y encuádralo con «Tamaño» y «Mover». Lo que va dentro del recuadro punteado se ve bien en computador y celular.", "Aparece en Inicio con días, horas, minutos y segundos. Si el evento es visible para familias, también en su página."], go: "#/agenda", el: "[data-action=agNew]" },
  { t: "agenda", q: "¿Cómo destaco un evento en las Novedades de Inicio?", who: EQUIPO, a: ["Edita el evento y marca «Destacar en Inicio».", "Elige desde y hasta cuándo se muestra."], go: "#/agenda", el: "[data-action=agNew]" },

  // Muro y chat
  { t: "muro", q: "¿Cómo publico en el muro?", who: CUENTA, a: ["En «Muro y chat», escribe en el cuadro de arriba.", "Los jóvenes pueden publicar preguntas; el equipo, también anuncios, temas y encuestas."], go: "#/muro", el: "#wallCompose" },
  { t: "muro", q: "¿Cómo hago una encuesta?", who: EQUIPO, a: ["En el muro, elige el tipo «Encuesta».", "Escribe la pregunta y de 2 a 6 opciones. Cada persona vota una vez y puede cambiar su voto."], go: "#/muro", el: "#wallCompose" },
  { t: "muro", q: "¿Cómo respondo o reacciono a un mensaje del chat?", who: CUENTA, a: ["Toca los tres puntos (⋯) junto al mensaje.", "Elige una reacción, «Responder» o «Enviar zumbido» si esa persona está en línea."], go: "#/chat" },
  { t: "muro", q: "¿Puedo escribirle a alguien por privado?", who: CUENTA, a: ["No. Todas las salas son grupales y las modera el equipo, para cuidar a todos.", "Lo privado se conversa fuera de la app, con los adultos responsables."] },
  { t: "muro", q: "¿Cómo creo una sala de chat?", who: EQUIPO, a: ["En Chat, toca «Nueva sala».", "Elige nombre, color y quiénes entran: todos, ciertos roles o personas elegidas."], go: "#/chat", el: "[data-action=salaNew]" },
  { t: "muro", q: "Alguien escribió algo inapropiado, ¿qué hago?", who: CUENTA, a: ["Toca los tres puntos (⋯) del mensaje → «Reportar». El equipo lo revisa.", "Si es urgente o alguien está en riesgo, avisa de inmediato a un adulto del equipo."] },

  // Capilla y cancionero
  { t: "oracion", q: "¿Cómo rezo el Rosario con la voz que guía?", who: ["visitante", ...CUENTA], a: ["En Capilla, toca «Rezar el Rosario ahora».", "Abajo, activa «Voz que guía»: el teléfono dice la primera parte de cada oración y en pantalla aparece en dorado lo que respondes tú.", "Con «Avanzar solo», pasa sola a la cuenta siguiente después de tu respuesta. Si lo apagas, avanzas tú tocando la pantalla o con un control.", "La voz es la de tu teléfono: en Android puedes elegirla en Ajustes → Accesibilidad → Salida de texto a voz."], go: "#/oracion/rosario" },
  { t: "oracion", q: "¿Cómo paso las cuentas del Rosario con un control remoto?", who: ["visitante", ...CUENTA], a: ["Sirven unos audífonos Bluetooth, un control para pasar diapositivas o el disparador de un palo de selfie (el que se desmonta sirve para jornadas y retiros).", "Conéctalo por Bluetooth, abre el Rosario y activa «Control remoto». En las notificaciones aparece «Santo Rosario»: eso significa que está escuchando.", "Cada toque avanza una cuenta y el teléfono vibra suave (dos veces al empezar un misterio). Así puedes rezar sin mirar la pantalla.", "Audífonos: usa play/pausa o «siguiente». Disparador de selfie: usa el botón «Android». Si tu disparador solo sube el volumen, en Android instala Button Mapper y asigna a «Subir volumen» la acción «Siguiente pista»."], go: "#/oracion/rosario" },
  { t: "oracion", q: "¿Cómo comparto una intención?", who: CUENTA, a: ["En Capilla, toca «Intenciones».", "Escribe por quién o por qué rezas y toca «Compartir mi intención». La ven los demás del grupo y pueden rezar contigo."], go: "#/oracion", el: "#velaForm" },
  { t: "oracion", q: "¿Cómo proyecto una canción en la Misa o el encuentro?", who: CUENTA, a: ["En el Cancionero, abre la canción.", "Toca «Proyectar». Avanzas con las flechas o tocando la pantalla."], go: "#/cancionero" },
  { t: "oracion", q: "¿Cómo exporto el cancionero?", who: CUENTA, a: ["En el Cancionero, toca «Exportar».", "Elige PDF, PowerPoint o texto."], go: "#/cancionero", el: "[data-action=canExport]" },
  { t: "oracion", q: "¿Quiero ayudar con el cancionero, cómo lo hago?", who: CUENTA, a: ["El cancionero lo seguimos construyendo entre todos.", "Pídele al equipo que te habilite: un administrador lo activa en tu ficha de Gestión.", "Con eso podrás agregar canciones, corregirlas y armar los repertorios de las misas."], go: "#/cancionero" },
  { t: "admin", q: "¿Cómo habilito a alguien para el cancionero?", who: ["admin"], a: ["En Gestión → Dirigentes, abre la ficha de la persona.", "En «Apostolado del cancionero» marca «Ayuda a construir el cancionero».", "Podrá agregar y editar canciones y repertorios. Borrar sigue siendo del equipo."], go: "#/admin/dirigentes" },
  { t: "oracion", q: "¿Cómo agrego una canción?", who: CUENTA, a: ["Si eres del equipo o te habilitaron para el cancionero, toca «Agregar una canción».", "Pega la letra con los acordes entre corchetes, justo antes de la sílaba: [G]Somos jóvenes de [D]Yungay."], go: "#/cancionero", el: "[data-action=canNew]" },

  // Formación
  { t: "itinerario", q: "¿Cómo avanzo en el curso?", who: ["aspirante", ...GUIAS], a: ["En Formación, toca la unidad que sigue: se abre como presentación.", "En la última lámina toca «Marcar unidad como completada». Al completar todas las de un módulo se abre su evaluación."], go: "#/itinerario" },
  { t: "itinerario", q: "¿Dónde quedan mis respuestas del cuaderno?", who: ["aspirante", ...GUIAS], a: ["En Formación → Curso de dirigentes → «Mi cuaderno». Solo tú las lees.", "Puedes descargarlas como texto."], go: "#/cuaderno", el: "[data-action=downloadNotes]" },
  { t: "itinerario", q: "¿Puedo leer la unidad completa en vez de la presentación?", who: ["aspirante", ...GUIAS], a: ["Sí. Dentro de la presentación toca «📄 Texto completo» arriba a la derecha."] },

  // Acompañar
  { t: "comunidad", q: "¿Cómo agrego a un joven a la lista?", who: GUIAS, a: ["En Acompañar, toca «Agregar joven».", "Nombre, etapa y cumpleaños (día y mes). Marca la autorización de la familia solo si la firmaron."], go: "#/acompanar", el: "[data-action=acNew]" },

  // Gestión
  { t: "admin", q: "¿Cómo invito a alguien a la app?", who: ["admin"], a: ["En Gestión → Dirigentes, toca «Invitar».", "Escribe su correo de Google y elige el rol.", "Si es un joven, primero descarga el consentimiento, que lo firme su familia y regístralo."], go: "#/admin/dirigentes", el: "[data-action=aInvite]" },
  { t: "admin", q: "¿Cómo cambio las Novedades de Inicio?", who: EQUIPO, a: ["En Gestión → Portada, edita, oculta u ordena las diapositivas.", "Con «Nueva diapositiva» creas una con fechas de inicio y término."], go: "#/admin/portada", el: "[data-action=pNew]" },
  { t: "admin", q: "¿Cómo edito la página para familias?", who: EQUIPO, a: ["En Gestión → Familias cambias bienvenida, carta, preguntas y contacto.", "Ahí también está el enlace y el código QR para compartirla."], go: "#/admin/familias", el: "#famForm" },
  { t: "admin", q: "¿Cómo veo la app como la ve un joven?", who: EQUIPO, a: ["En Mi perfil o en Gestión, toca «Ver como…» y elige el perfil.", "Arriba aparece una franja amarilla. «Volver a mi vista» te devuelve a la tuya."], go: "#/perfil", el: "[data-action=vaOpen]" },
  { t: "admin", q: "¿Cómo propongo el desafío de la semana?", who: EQUIPO, a: ["En Comunidad, toca «Proponer un desafío de la semana» (o el lápiz en la tarjeta).", "Elige desde y hasta cuándo se muestra."], go: "#/red", el: "[data-action=desNew]" },
];

export function perfil() {
  const s = ctx.cloud.enabled ? ctx.cloud.state() : { ready: true, role: "admin" };
  if (!s.ready) return "visitante";
  if (["ingreso", "madurez"].includes(s.role)) return "joven";
  return s.role || "dirigente";
}
export const helpFor = (who) => T.filter((x) => x.who.includes(who));

let q = "";
export function view(tema) {
  const who = perfil(), mine = helpFor(who);
  const temas = TEMAS.filter(([k]) => mine.some((x) => x.t === k));
  const first = tema && temas.some(([k]) => k === tema) ? tema : null;
  const order = first ? [temas.find(([k]) => k === first), ...temas.filter(([k]) => k !== first)] : temas;
  ctx.onAfterRender(() => { const i = document.getElementById("helpQ"); if (i && q) { i.value = q; filter(); } });
  return `<header class="page-head"><span class="eyebrow">Ayuda</span><h1>¿Cómo hago…?</h1>
      <p>Respuestas cortas para tu perfil. Toca «Muéstrame» y te llevamos al botón exacto.</p></header>
    <div class="help-search"><input class="input" id="helpQ" type="search" placeholder="Escribe lo que quieres hacer: intención, calendario, encuesta…" autocomplete="off"></div>
    <div class="help-chips">${order.map(([k, l]) => `<a class="chip ${k === first ? "accent" : ""}" href="#help-${k}">${esc(l)}</a>`).join("")}</div>
    <div id="helpList">${order.map(([k, l]) => `<section class="help-sec" id="help-${k}"><h2>${esc(l)}</h2>
      ${mine.filter((x) => x.t === k).map((x) => `<details class="help-item" data-s="${esc((x.q + " " + x.a.join(" ")).toLowerCase())}"${k === first ? " open" : ""}>
        <summary>${esc(x.q)}</summary>
        <ol>${x.a.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        ${x.go ? `<button class="btn btn-sm btn-primary" data-action="helpGo" data-go="${esc(x.go)}" data-el="${esc(x.el || "")}">${icon("arrowR")} Muéstrame</button>`
          : x.href ? `<a class="btn btn-sm btn-primary" href="${esc(x.href)}" target="_blank" rel="noopener">${icon("arrowR")} Ver</a>` : ""}
      </details>`).join("")}</section>`).join("")}</div>
    <p class="help-none" id="helpNone" hidden>No encontramos nada con esas palabras. Prueba con otra, o pregunta en la sala general del chat.</p>
    <div class="card help-more">${illus("escuchar")}<div><h3>¿No encontraste tu respuesta?</h3>
      <p class="small muted">${who === "visitante" ? "Pregúntale a alguien del equipo en el próximo encuentro." : "Pregunta en la sala general del chat: alguien del equipo te va a ayudar."}</p>
      ${who === "visitante" ? "" : `<a class="btn btn-sm btn-soft" href="#/chat/general">${icon("chat")} Ir a la sala general</a>`}</div></div>`;
}

function filter() {
  const v = (document.getElementById("helpQ")?.value || "").trim().toLowerCase();
  q = v;
  const words = v.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean);
  let n = 0;
  document.querySelectorAll(".help-item").forEach((d) => {
    const s = d.dataset.s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const ok = !words.length || words.every((w) => s.includes(w));
    d.hidden = !ok; if (ok) n++;
    if (words.length && ok) d.open = true;
  });
  document.querySelectorAll(".help-sec").forEach((s) => (s.hidden = ![...s.querySelectorAll(".help-item")].some((d) => !d.hidden)));
  const none = document.getElementById("helpNone"); if (none) none.hidden = n > 0;
  const chips = document.querySelector(".help-chips"); if (chips) chips.hidden = !!words.length;
}

// Señalar el botón en la pantalla de destino
let pending = null;
export function afterRender() {
  if (!pending) return;
  const sel = pending; pending = null;
  let tries = 0;
  const find = () => {
    const el = sel && document.querySelector(sel);
    if (!el) { if (++tries < 25) return setTimeout(find, 160); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("help-pulse");
    const tip = document.createElement("div"); tip.className = "help-tip"; tip.textContent = "Aquí 👆";
    document.body.appendChild(tip);
    const place = () => { const r = el.getBoundingClientRect(); tip.style.left = `${Math.max(12, Math.min(innerWidth - 110, r.left + r.width / 2 - 45))}px`; tip.style.top = `${r.bottom + 10}px`; };
    setTimeout(place, 450); place();
    const done = () => { el.classList.remove("help-pulse"); tip.remove(); removeEventListener("scroll", place); };
    addEventListener("scroll", place, { passive: true });
    setTimeout(done, 6000); el.addEventListener("click", done, { once: true });
  };
  setTimeout(find, 200);
}

function registerActions() {
  ctx.actions.helpGo = (el) => {
    pending = el.dataset.el || null;
    const go = el.dataset.go;
    if (location.hash === go) { ctx.render(); } else location.hash = go;
  };
  document.addEventListener("input", (e) => { if (e.target.id === "helpQ") filter(); });
}
