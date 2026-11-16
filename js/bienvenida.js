// Inicio: la bienvenida. Una pantalla tranquila, hecha desde el Preámbulo de la Pastoral Juvenil Ágape:
// el saludo, el Evangelio de hoy, una frase de lo que somos y tres puertas. Lo del día a día vive en «Hoy».
import { esc, icon } from "./util.js";
import { cfg } from "./inicio-config.js";

// Frases del Preámbulo, una por día
export const FRASES = [
  "¡Qué bueno que estés aquí! Ojalá hoy alguien te mire, te escuche y te haga sentir en casa.",
  "Llegues como llegues, con ganas, con dudas o después de un tiempo lejos, aquí hay un lugar para ti.",
  "En Ágape tu historia importa. Cada uno pone su color y juntos hacemos camino.",
  "Somos una familia que se cuida: nos acompañamos en lo bueno y en lo no tan bueno.",
  "Ágape lo hacemos entre todos. Lo que tú traes, por pequeño que parezca, suma.",
  "Servir es nuestra forma de amar, y se nota en los gestos pequeños de cada día.",
  "Más que ser muchos, lo más importante es que nadie se sienta solo.",
  "¿Te equivocaste? Nos pasa a todos. Aquí se pide perdón y se vuelve a empezar.",
  "Eres joven y ya eres Iglesia: Dios cuenta contigo hoy, no mañana.",
  "Los santos también fueron jóvenes y caminaron nuestra tierra. La santidad es para ti, aquí y ahora.",
];
// El equipo puede cambiarlas en Gestión → Inicio y enlaces (una por línea)
const lista = () => { const l = String(cfg().frases || "").split("\n").map((x) => x.trim()).filter(Boolean); return l.length ? l : FRASES; };
const deHoy = () => { const d = new Date(), l = lista(); return l[Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) % l.length]; };

export function inicioHTML({ greet, guest, extra = "" }) {
  const puerta = (id, href, ic, hand, t, d, c) => `<a class="bv-door" id="${id}" href="${href}" style="--c:${c}"><i aria-hidden="true">${icon(ic)}</i><span><em>${esc(hand)}</em><strong>${esc(t)}</strong><small>${esc(d)}</small></span>${icon("right")}</a>`;
  // El video de bienvenida: a quien llega por primera vez se le muestra arriba; a quien ya tiene cuenta, al final.
  const video = `<section class="bv-video" aria-label="Video de bienvenida"><span class="bv-k">¡dale play y conócenos!</span>
      <video controls playsinline preload="none" poster="video/bienvenida.jpg?v=2" src="video/bienvenida.mp4?v=2"></video></section>`;
  return `<div class="bv">
    ${greet}
    ${extra}
    ${guest ? video : ""}
    <section class="bv-lema" aria-label="Lo que somos">
      <span class="bv-k">amor que transforma</span>
      <blockquote>${esc(deHoy())}</blockquote>
      <a class="bv-mas" href="#/preambulo">Conoce quiénes somos ${icon("right")}</a>
    </section>
    <nav class="bv-doors" aria-label="¿A dónde quieres ir?">
      ${puerta("bvRezar", "#/oracion", "flame", "un ratito con Dios", "Rezar", "La Capilla está siempre abierta para ti.", "var(--cy)")}
      ${puerta("bvRed", "#/red", "users", "juntos es mejor", "Encontrarnos", "Fotos, mensajes y todo lo que vivimos como grupo.", "var(--co)")}
      ${puerta("bvHoy", "#/hoy", "cal", "lo que se viene", "Lo de hoy", "Cumpleaños, encuentros y avisos del día.", "var(--cs)")}
    </nav>
    ${guest ? `<p class="bv-pie">¿Es tu primera vez? ¡Qué alegría! <a href="presentaciones/hay-un-lugar-para-ti.html" target="_blank" rel="noopener">Hay un lugar para ti</a></p>` : ""}
    ${guest ? "" : video}
    <div id="installSlot"></div>
  </div>`;
}

export function viewPreambulo() {
  const P = [
    "Nosotros, jóvenes de la Pastoral Juvenil Ágape, de la Parroquia San Miguel de Yungay, tenemos un lema que también es una tarea: un <b>amor que transforma</b>. No hablamos de un sentimiento que va y viene, sino de una decisión de cada día. Queremos que quien pase por Ágape se vaya distinto de como llegó, porque alguien lo miró, lo escuchó y lo tomó en serio.",
    "Todo nace en la Misa. Ahí recibimos el amor que después compartimos, y a ella volvemos una y otra vez para renovarlo. La oración de cada día, sencilla y personal, mantiene vivo ese encuentro, porque nadie puede dar lo que no ha recibido. Sin ella, nuestro servicio se quedaría en pura actividad.",
    "Miramos a María, la joven de Nazaret que dijo que sí sin tenerlo todo claro. De ella aprendemos a escuchar, a estar disponibles y a servir sin hacer ruido. Junto a José y a Jesús, la Sagrada Familia nos enseña que la fe se vive en casa, en lo sencillo. Y nos acompañan santos que fueron jóvenes como nosotros o que caminaron nuestra tierra: San Alberto Hurtado, Santa Teresa de los Andes, San Carlo Acutis y San Pier Giorgio Frassati. Si ellos pudieron, la santidad también es posible para nosotros, aquí y ahora.",
    "La Parroquia es nuestra casa. No somos un grupo aparte: caminamos con nuestros pastores, con toda la comunidad y al ritmo del año litúrgico. Somos Iglesia que sirve.",
    "Vivimos el Evangelio en el día a día. Partimos de lo que nos pasa, lo conversamos, lo iluminamos con la Palabra y volvemos a la vida con un compromiso concreto, celebrando juntos lo que Dios hace en nosotros. Aquí nadie se queda mirando desde afuera: estamos atentos a los gestos y silencios del otro, y cada uno es protagonista de su camino. Nos importa más la profundidad que los números.",
    "Servir es nuestra forma de amar. Por eso salimos al encuentro de quienes más lo necesitan: los pobres, los enfermos y los que están solos. Lo hacemos con alegría y sin esperar nada a cambio.",
    "Creemos que Dios nos llama a cada uno por nuestro nombre, al matrimonio, al sacerdocio, a la vida consagrada o al servicio en medio del mundo. Nos ayudamos a escuchar ese llamado y a responderlo sin miedo.",
    "Ágape no es de unos pocos. Lo construimos entre todos: cada uno pone lo que tiene, se hace cargo de su parte y responde por lo que se le confía.",
    "Queremos ser una familia que se cuida. Recibimos a cada uno como es, también a quien llega con dudas o vuelve después de un tiempo lejos, y lo acompañamos en su camino. Nos tratamos con respeto, en lo que decimos y en lo que hacemos. Cuando nos equivocamos, pedimos perdón y volvemos a empezar. Protegemos a los más frágiles, para que Ágape sea siempre un lugar sano y seguro.",
    "Somos jóvenes y somos Iglesia hoy, no mañana: el ahora de Dios. Y lo vivimos con la alegría de saber que somos enviados.",
  ];
  return `<nav class="ent-backs no-print is-top" aria-label="Volver"><a class="ent-back" href="#/">${icon("left")} Inicio</a></nav>
  <article class="bv-pre">
    <header><span class="bv-k">lo que somos</span><h1>Preámbulo</h1>
      <p class="bv-cita">«En esto conocerán todos que son mis discípulos: si se aman unos a otros»<small>Juan 13, 35</small></p></header>
    ${P.map((p) => `<p>${p}</p>`).join("")}
    <p class="bv-fin">Esta es la responsabilidad de cada uno de nosotros: cuidar este amor, hacerlo crecer y ser los primeros en vivirlo.</p>
  </article>`;
}
