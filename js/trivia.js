// Trivia Ágape: preguntas sobre la comunidad, la app y la fe.
// Parte de las preguntas sale del contenido vivo de la app (las evaluaciones del curso),
// así que la trivia crece cuando crece el contenido.
// Se juega en el teléfono; el mejor puntaje queda solo en este dispositivo.
import { esc, icon } from "./util.js";
import * as S from "./store.js";

let ctx = null; // { actions, onAfterRender, onLeave }
export function setup(c) { ctx = c; registerActions(); }
const $ = (s, r = document) => r.querySelector(s);

// [pregunta, [respuesta correcta, otras…], por qué]
const BANCO = {
  comunidad: [
    ["¿Qué significa «Ágape»?", ["El amor de Dios, gratuito, que no pide nada a cambio", "Una fiesta de jóvenes", "Una oración en latín", "El nombre de un santo"], "Es la palabra griega del Nuevo Testamento para el amor de Dios: un amor que transforma a quien lo recibe."],
    ["¿Cuál es nuestro lema?", ["Amor que transforma", "Siempre adelante", "Jóvenes en camino", "Unidos en la fe"], "«Amor que transforma»: el amor de Dios cambia la vida de quien lo recibe."],
    ["¿Qué frase acompaña a agAPPe?", ["Construyendo vínculos de amistad en Cristo", "La fe en tu bolsillo", "Conectados con Dios", "Jóvenes con propósito"], "Es lo que queremos: amistad verdadera, con Jesús al centro."],
    ["¿Cuál de estos NO es uno de nuestros tres métodos?", ["El método competitivo", "El método familiar y comunitario", "El método intuitivo", "El método activo"], "Nuestros métodos son el familiar y comunitario, el intuitivo y el activo. Aquí nadie compite: caminamos juntos."],
    ["El método intuitivo nos entrena para…", ["Leer los gestos, los silencios y las miradas", "Memorizar oraciones", "Organizar actividades rápido", "Ganar en las dinámicas"], "No todo se dice con palabras: formamos la empatía para conectar de verdad con el otro."],
    ["Según el método activo, el joven es…", ["Protagonista de su formación", "Espectador del encuentro", "Ayudante del dirigente", "Invitado ocasional"], "Aquí nadie viene a calentar un asiento: se aprende haciendo y compartiendo."],
    ["«Profundidad antes que números» quiere decir que…", ["Buscamos vivir de verdad el Evangelio, no ser un grupo grande", "Hay que sacar buenas notas", "Solo entran los que saben mucho", "No se cuenta la asistencia"], "No buscamos ser un grupo grande, sino un grupo verdadero."],
    ["¿Quiénes son el puente con la Parroquia?", ["Los asesores", "Los dirigentes", "Los aspirantes", "Los papás"], "Los asesores custodian el sentido y la identidad del grupo y mantienen viva la unión con el Párroco."],
    ["¿Cada cuánto se reúnen asesores y coordinadores?", ["Una vez al mes", "Todas las semanas", "Una vez al año", "Cada dos semanas"], "En la reunión mensual revisan lineamientos, calendario litúrgico y objetivos del mes."],
    ["Los coordinadores sirven en…", ["Dupla", "Solitario", "Grupos de diez", "Turnos de un mes"], "La coordinación es una dupla, acompañada por los asesores."],
    ["¿Con qué va de la mano toda nuestra planificación?", ["Con el año litúrgico de la Iglesia", "Con el calendario escolar", "Con las vacaciones", "Con los cumpleaños del grupo"], "Temas y dinámicas siguen el calendario de la Iglesia."],
    ["¿A qué diócesis pertenecemos?", ["San Bartolomé de Chillán", "Santiago", "Concepción", "Los Ángeles"], "Somos parte de la Diócesis San Bartolomé de Chillán, en Ñuble."],
  ],
  app: [
    ["¿Dónde están Momentos, Muro, Chat y Juegos?", ["En La Plaza Ágape", "En la Capilla", "En Materiales", "En Mi cuaderno"], "La Plaza Ágape es nuestra red social: lo que vivimos, conversamos y jugamos."],
    ["En la Capilla, ¿qué puedes dejar para que la comunidad rece contigo?", ["Tus intenciones", "Un comentario", "Una foto", "Una canción"], "Rezamos unos por otros: así nos sabemos comunidad."],
    ["¿Qué guarda «Mi cuaderno»?", ["Lo que escribiste en las reflexiones", "Las tareas del colegio", "Los cumpleaños", "Los mensajes del chat"], "Tus respuestas a las reflexiones quedan guardadas para volver a ellas."],
    ["¿Cómo se llama el curso para dirigentes?", ["El Arte de Encontrarnos", "Escuela de Líderes", "Camino de Emaús", "Jóvenes que Sirven"], "Lo hace quien termina Aspirante y decide servir."],
    ["¿Dónde está el Cancionero?", ["En Materiales", "En el Chat", "En Mi perfil", "En la Agenda"], "En Materiales: canciones con acordes, para proyectar y exportar."],
    ["¿Qué marcas cuando cumples el desafío de la semana?", ["¡Lo cumplí!", "Me gusta", "Listo", "Enviar"], "El desafío sale del encuentro de cada semana."],
    ["En El Impostor, si pillan al impostor…", ["Todavía puede ganar si adivina la palabra", "Pierde todo el grupo", "Se acaba el juego para siempre", "Gana el que votó primero"], "¡Hasta el final hay esperanza!"],
    ["En ¡En la frente!, ¿qué haces si adivinaste la palabra?", ["Inclinar la pantalla hacia el suelo", "Gritar «¡Ágape!»", "Agitar el celular", "Apagar la pantalla"], "Hacia el suelo es punto; hacia el techo, paso."],
    ["¿Qué significa la «APP» destacada en agAPPe?", ["Que es la app de Ágape", "Un error de escritura", "Una sigla en inglés", "Nada en especial"], "Ágape + app = agAPPe."],
  ],
  fe: [
    ["¿Cuántos evangelios hay en la Biblia?", ["Cuatro", "Tres", "Doce", "Siete"], "Mateo, Marcos, Lucas y Juan."],
    ["¿En qué ciudad nació Jesús?", ["Belén", "Nazaret", "Jerusalén", "Cafarnaúm"], "Nació en Belén y creció en Nazaret."],
    ["¿Quién negó a Jesús tres veces?", ["Pedro", "Judas", "Tomás", "Juan"], "Después, Jesús resucitado le preguntó tres veces: «¿Me amas?»."],
    ["¿Cuántos libros tiene la Biblia católica?", ["73", "66", "50", "100"], "46 del Antiguo Testamento y 27 del Nuevo."],
    ["¿Qué celebramos en Pentecostés?", ["La venida del Espíritu Santo", "El nacimiento de Jesús", "La Última Cena", "La Asunción de María"], "Cincuenta días después de Pascua."],
    ["¿Cuántos sacramentos hay?", ["Siete", "Tres", "Diez", "Cinco"], "Bautismo, Confirmación, Eucaristía, Reconciliación, Unción de los enfermos, Orden y Matrimonio."],
    ["¿Qué color usa el sacerdote en Cuaresma?", ["Morado", "Verde", "Blanco", "Rojo"], "El morado invita a la conversión y a la espera."],
    ["¿Cuántas Avemarías tiene cada misterio del Rosario?", ["Diez", "Cinco", "Siete", "Doce"], "Un Padre Nuestro, diez Avemarías y un Gloria."],
    ["¿Cuál es el primer libro de la Biblia?", ["Génesis", "Éxodo", "Mateo", "Salmos"], "Génesis comienza con la creación."],
    ["¿Qué apóstol era cobrador de impuestos?", ["Mateo", "Andrés", "Santiago", "Felipe"], "Jesús le dijo «Sígueme» y él dejó todo."],
    ["¿En qué río fue bautizado Jesús?", ["Jordán", "Nilo", "Éufrates", "Biobío"], "Juan Bautista lo bautizó en el Jordán."],
    ["¿Quién es la patrona de Chile?", ["La Virgen del Carmen", "Santa Rosa de Lima", "La Virgen de Guadalupe", "Santa Teresa de los Andes"], "Se celebra el 16 de julio."],
    ["¿Quién fundó el Hogar de Cristo?", ["San Alberto Hurtado", "Don Bosco", "San Francisco de Asís", "Santa Teresa de Calcuta"], "«Contento, Señor, contento»."],
    ["¿Cuántos días dura la Cuaresma?", ["40", "30", "50", "7"], "Como los 40 días de Jesús en el desierto."],
    ["¿Cuándo se reza el Mes de María en Chile?", ["Del 8 de noviembre al 8 de diciembre", "Todo mayo", "Todo octubre", "En Semana Santa"], "Termina el 8 de diciembre, fiesta de la Inmaculada Concepción."],
    ["¿Quién es la primera santa chilena?", ["Santa Teresa de los Andes", "Laura Vicuña", "Santa Rosa de Lima", "Santa Clara"], "Fue canonizada en 1993."],
  ],
};
const TEMAS = {
  mix: { l: "Mezcla", d: "Un poco de todo" },
  comunidad: { l: "Nuestra comunidad", d: "Quiénes somos y cómo caminamos" },
  app: { l: "La app", d: "¿Cuánto conoces agAPPe?" },
  fe: { l: "Biblia y fe", d: "Lo que creemos y celebramos" },
  curso: { l: "Curso de dirigentes", d: "Situaciones del curso" },
};
const N = 10, SECS = 20;

// ---------------------------------------------------------------------------
// Preguntas que salen del contenido vivo
// ---------------------------------------------------------------------------
function cursoDyn() {
  const out = [];
  try {
    for (const c of S.content().courses || []) for (const p of c.phases || []) for (const q of p.quiz?.questions || []) {
      const opts = q.options || [];
      if (!q.q || opts.length < 2 || opts[q.correct] == null) continue;
      out.push([String(q.q).replace(/^\s*\d+\s*[.)]\s*/, ""), [opts[q.correct], ...opts.filter((_, i) => i !== q.correct)], q.feedback || ""]);
    }
  } catch { /* sin contenido */ }
  return out;
}
const hasCurso = () => cursoDyn().length >= N;

// ---------------------------------------------------------------------------
// Partida
// ---------------------------------------------------------------------------
const rnd = (n) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const KEY = "agape_trivia";
const mem = (() => { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { return {}; } })();
mem.best = mem.best || {}; mem.seen = Array.isArray(mem.seen) ? mem.seen : [];
const save = () => { try { mem.seen = mem.seen.slice(-120); localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* sin almacenamiento */ } };

let g = null; // { cat, qs:[{q, opts, ok, why}], i, pts, hits, streak, best, answered, picked, left }
let timer = null;
const stop = () => { if (timer) clearInterval(timer); timer = null; };

async function pool(cat) {
  if (cat === "curso") return cursoDyn();
  if (cat === "mix") return [...BANCO.comunidad, ...BANCO.app, ...BANCO.fe, ...shuffle(cursoDyn()).slice(0, 6)];
  return BANCO[cat] || [];
}
async function start(cat) {
  const all = await pool(cat);
  // Primero las que no ha visto hace poco.
  const fresh = shuffle(all.filter((x) => !mem.seen.includes(x[0]))), old = shuffle(all.filter((x) => mem.seen.includes(x[0])));
  const pick = [...fresh, ...old].slice(0, N);
  g = { cat, i: 0, pts: 0, hits: 0, streak: 0, bestStreak: 0, answered: false, picked: -1, left: SECS,
    qs: pick.map(([q, [ok, ...bad], why]) => { const opts = shuffle([ok, ...bad]); return { q, opts, ok: opts.indexOf(ok), why }; }) };
  pick.forEach((x) => mem.seen.push(x[0])); save();
  paint();
}

// ---------------------------------------------------------------------------
// Vistas
// ---------------------------------------------------------------------------
export function view() {
  ctx.onLeave(stop);
  ctx.onAfterRender(paint);
  return `<div class="imp" id="tvRoot"></div>`;
}
function paint() {
  const root = $("#tvRoot"); if (!root) return;
  stop();
  root.innerHTML = !g ? setupHTML() : g.i >= g.qs.length ? endHTML() : qHTML();
  if (g && g.i < g.qs.length && !g.answered) run();
}

export { triviaArt as artSvg } from "./juegos-arte.js";
import { triviaArt as artSvg } from "./juegos-arte.js";

function setupHTML() {
  const cats = Object.entries(TEMAS).filter(([k]) => (k !== "curso" || hasCurso()));
  return `<a class="imp-back" href="#/juegos">${icon("left")} Juegos</a>
  <header class="imp-hero tv-hero">
    <span class="imp-mask" aria-hidden="true">${artSvg()}</span>
    <div><h1>Trivia <em>Ágape</em></h1><p>${N} preguntas, ${SECS} segundos cada una. Mientras más rápido respondes, más puntos.</p></div>
  </header>
  <h2 class="tv-h">Elige un tema</h2>
  <div class="tv-cats">${cats.map(([k, t]) => `<button class="tv-cat" data-action="tvStart" data-cat="${k}">
      <b>${t.l}</b><small>${t.d}</small>${mem.best[k] ? `<span class="tv-best">Tu récord: ${mem.best[k]}</span>` : ""}</button>`).join("")}</div>
  <p class="muted small jg-soon">Para jugar en grupo, proyecten la pantalla o júntense alrededor de un celular y respondan entre todos.</p>`;
}
function qHTML() {
  const q = g.qs[g.i], a = g.answered;
  return `<div class="tv">
    <div class="tv-top"><span>${g.i + 1} / ${g.qs.length}</span>${g.streak >= 2 ? `<span class="tv-streak">Racha de ${g.streak}</span>` : ""}<b>${g.pts} pts</b></div>
    <div class="tv-bar" aria-hidden="true"><i id="tvBar" style="width:${(g.left / SECS) * 100}%"></i></div>
    <h2 class="tv-q">${esc(q.q)}</h2>
    <div class="tv-opts" role="group" aria-label="Respuestas">${q.opts.map((o, i) => {
      const cls = !a ? "" : i === q.ok ? "is-ok" : i === g.picked ? "is-bad" : "is-dim";
      return `<button class="tv-opt ${cls}" data-action="tvPick" data-i="${i}" ${a ? "disabled" : ""}><span>${"ABCD"[i]}</span>${esc(o)}</button>`; }).join("")}</div>
    ${a ? `<div class="tv-why ${g.picked === q.ok ? "is-ok" : ""}" role="status"><b>${g.picked === q.ok ? pick(["¡Bien!", "¡Exacto!", "¡Eso es!", "¡Muy bien!"]) : g.picked < 0 ? "Se acabó el tiempo." : "Casi."}</b> ${esc(q.why)}</div>
      <button class="btn btn-primary imp-go" data-action="tvNext">${g.i + 1 >= g.qs.length ? "Ver resultado" : "Siguiente"} ${icon("right")}</button>` : ""}
  </div>`;
}
const pick = (a) => a[rnd(a.length)];
function endHTML() {
  const t = g.hits, prev = mem.best[g.cat] || 0, rec = g.pts > prev;
  if (rec) { mem.best[g.cat] = g.pts; save(); }
  const msg = t >= 9 ? "¡Impresionante! Te sabes todo." : t >= 7 ? "¡Muy bien! Se nota que caminas con nosotros." : t >= 4 ? "¡Bien! Cada partida se aprende algo nuevo." : "¡Buen intento! Juega otra vez y verás cómo mejoras.";
  return `<div class="imp-stage">
    <p class="imp-count">${esc(TEMAS[g.cat].l)}</p>
    <h2 class="imp-big tv-score"><b>${g.pts}</b> puntos</h2>
    <p><b>${t} de ${g.qs.length}</b> correctas${g.bestStreak >= 3 ? ` · mejor racha: ${g.bestStreak}` : ""}</p>
    ${rec && prev ? `<p class="tv-rec">¡Nuevo récord personal!</p>` : ""}
    <p>${msg}</p>
    <button class="btn btn-primary imp-go" data-action="tvStart" data-cat="${g.cat}">${icon("undo")} Jugar otra vez</button>
    <button class="btn btn-ghost btn-sm" data-action="tvHome">Elegir otro tema</button></div>`;
}

function run() {
  const t0 = Date.now() - (SECS - g.left) * 1000;
  timer = setInterval(() => {
    if (!g || g.answered) { stop(); return; }
    g.left = Math.max(0, SECS - (Date.now() - t0) / 1000);
    const b = $("#tvBar"); if (b) { b.style.width = `${(g.left / SECS) * 100}%`; b.classList.toggle("is-low", g.left < 6); }
    if (g.left <= 0) answer(-1);
  }, 100);
}
function answer(i) {
  if (!g || g.answered) return;
  stop();
  const q = g.qs[g.i]; g.answered = true; g.picked = i;
  if (i === q.ok) { g.hits++; g.streak++; g.bestStreak = Math.max(g.bestStreak, g.streak); g.pts += 100 + Math.round((g.left / SECS) * 50) + (g.streak >= 3 ? 20 : 0); try { navigator.vibrate?.(40); } catch { /* */ } }
  else g.streak = 0;
  paint();
  $(".tv-why")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function registerActions() {
  const A = ctx.actions;
  A.tvStart = (el) => start(el.dataset.cat || "mix");
  A.tvPick = (el) => answer(Number(el.dataset.i));
  A.tvNext = () => { g.i++; g.answered = false; g.picked = -1; g.left = SECS; paint(); window.scrollTo({ top: 0 }); };
  A.tvHome = () => { g = null; paint(); };
}
