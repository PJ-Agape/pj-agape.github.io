// Intención de oración del Papa: cada mes, la comunidad suma rosarios por la intención
// que propone el Santo Padre (Red Mundial de Oración del Papa). En Inicio se ve el recuento del mes.
// El equipo puede ajustar el texto y poner una meta en Gestión → Resumen.

import * as cloud from "./cloud.js";
import { esc, toast } from "./util.js";
import { illus } from "./ilustraciones.js";

// Intenciones 2026 y 2027 del papa León XIV (popesprayer.va). Título y texto de cada mes.
const INT = {
  "2026-01": ["Por la oración con la Palabra de Dios", "Para que la oración con la Palabra de Dios sea alimento y esperanza, y nos ayude a construir una Iglesia más fraterna y misionera."],
  "2026-02": ["Por los niños con enfermedades incurables", "Por los niños con enfermedades incurables y sus familias, para que reciban la atención y el apoyo que necesitan."],
  "2026-03": ["Por el desarme y la paz", "Para que se avance en un desarme efectivo y los gobernantes elijan el diálogo y la diplomacia en lugar de la violencia."],
  "2026-04": ["Por los sacerdotes en crisis", "Por los sacerdotes que pasan por una crisis vocacional, para que encuentren acompañamiento y comunidades que los sostengan."],
  "2026-05": ["Por una alimentación para todos", "Para que todos cuidemos los alimentos, evitemos el desperdicio y nadie quede sin acceso a una buena alimentación."],
  "2026-06": ["Por los valores del deporte", "Para que el deporte sea instrumento de paz, encuentro y diálogo, y promueva el respeto y la solidaridad."],
  "2026-07": ["Por el respeto de la vida humana", "Por el respeto y la protección de la vida humana en todas sus etapas, como un regalo de Dios."],
  "2026-08": ["Por la evangelización en la ciudad", "Para que encontremos nuevas formas de anunciar el Evangelio y hacer comunidad en las grandes ciudades."],
  "2026-09": ["Por el cuidado del agua", "Por una gestión justa y sostenible del agua, para que todos tengan acceso a ella."],
  "2026-10": ["Por la pastoral de la salud mental", "Recemos para que la pastoral de la salud mental se integre en toda la Iglesia, ayudando a superar el estigma y la discriminación hacia las personas con enfermedades mentales."],
  "2026-11": ["Por el buen uso de la riqueza", "Oremos por un buen uso de la riqueza para que, no cediendo a la tentación del egoísmo, esté siempre al servicio del bien común y la solidaridad con los que tienen menos."],
  "2026-12": ["Por las familias monoparentales", "Oremos por las familias que experimentan la ausencia de una madre o de un padre, para que encuentren en la Iglesia apoyo y acompañamiento, y en la fe ayuda y fuerza en los momentos difíciles."],
  // 2027 (popesprayer.va; marzo a noviembre, igual que en Nuestra Revista)
  "2027-01": ["Por el descubrimiento de la fuerza de la oración", "Para que la Iglesia redescubra la oración como un encuentro personal con el Señor, que transforma el corazón y el mundo."],
  "2027-02": ["Por el cuidado de quienes cuidan", "Por quienes cuidan la salud de otros, para que reciban el apoyo que necesitan y sigan adelante con paciencia y fortaleza."],
  "2027-03": ["Por el respeto de la dignidad de la vida humana", "Oremos para que, ante una cultura centrada en la productividad y la inmediatez, seamos capaces de descubrir y valorar la dignidad única de cada persona."],
  "2027-04": ["Por el arte como don que humaniza", "Oremos para que el arte sea acogido como un verdadero don que nos humaniza, eleva el espíritu y ayuda a contemplar la belleza de Dios en la creación."],
  "2027-05": ["Por las oportunidades laborales para todos", "Oremos para que el desarrollo tecnológico abra caminos de trabajo digno y la colaboración entre generaciones fortalezca un futuro donde cada persona pueda ofrecer sus talentos."],
  "2027-06": ["Por un buen uso de la inteligencia artificial", "Oremos para que el desarrollo de la inteligencia artificial esté siempre al servicio de la dignidad humana y sepamos usarla con sabiduría."],
  "2027-07": ["Por los abuelos y ancianos", "Oremos para que los miembros de la Iglesia valoremos el tesoro de fe y de sabiduría que nos ofrecen los abuelos y ancianos, dispuestos a aprender de su experiencia."],
  "2027-08": ["Por la vocación de los jóvenes", "Oremos para que los jóvenes en búsqueda de su vocación propia reconozcan a Jesucristo como compañero de camino a quien pueden abrir su corazón."],
  "2027-09": ["Por una conversión ecológica integral", "Oremos para que aprendamos a vivir una relación nueva con la creación, protegiéndola con justicia y encontrando en la contemplación de lo creado el camino hacia una vida más armoniosa y agradecida."],
  "2027-10": ["Por las comunidades cristianas", "Oremos para que cada parroquia, comunidad o grupo cristiano sea un centro de irradiación misionera que forme nuevos discípulos al servicio del Evangelio."],
  "2027-11": ["Por la integración de los migrantes", "Oremos para que los migrantes y desplazados, acompañados y consolados por la Sagrada Familia en su propio camino de desarraigo, encuentren comunidades que los acojan con dignidad, solidaridad y verdadera integración."],
  "2027-12": ["Por la vocación cristiana de la familia", "Para que las familias cristianas sean testigos del Evangelio y hogares donde crezcan la fe, la esperanza y el amor."],
};
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad = (n) => String(n).padStart(2, "0");
export const mesKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const mesName = (k) => MESES[+k.slice(5) - 1];

let cfg = null, count = null;
async function load(force) {
  if (!cfg || force) cfg = (await cloud.getPapaCfg().catch(() => null)) || {};
  return cfg;
}
// Intención del mes: la del equipo (si la cambió para ese mes) o la oficial
export function intencion(k = mesKey()) {
  const own = cfg && cfg.mes === k && cfg.t ? [cfg.t, cfg.x || ""] : null;
  const it = own || INT[k];
  return it ? { k, t: it[0], x: it[1], mes: mesName(k) } : null;
}
const on = () => !cfg || cfg.on !== false;
// ¿Hay intención cargada para ese mes? (oficial o del equipo) — la usa el tablero «Hoy» de Gestión
export async function intencionCargada(k = mesKey()) { await load().catch(() => {}); return !!intencion(k); }

// Diapositiva del carrusel de Inicio: se arma sola con la intención del mes (y el texto del equipo, si lo cambió).
export const enCarrusel = () => on() && !!intencion();
export function slideHTML() {
  const it = intencion(); if (!it) return "";
  const member = cloud.state().ready;
  return `<article class="car-slide papa-slide" data-theme-c="rose" aria-roledescription="diapositiva">
      <i class="hero-blob b1"></i><i class="hero-blob b3"></i>
      <div class="car-body">
        <span class="eyebrow">🌍 Con el Papa · ${esc(it.mes)}</span>
        <span class="car-hand">recemos con la Iglesia</span>
        <h2 class="car-title" id="papaT0">${esc(it.t)}</h2>
        <p class="lead" id="papaX0">${esc(it.x)}</p><button type="button" class="car-more" data-action="carLead">Leer más</button>
        <p class="papa-sn"><b id="papaN">·</b> <span id="papaNl">rosarios rezados este mes</span></p>
        <div class="actions"><a class="btn btn-gold" href="#/oracion/rosario">📿 Rezar el Rosario</a>${member ? `<button class="btn btn-ghost" data-action="papaSumar">✔ Ya recé uno</button>` : ""}</div>
      </div>
      ${illus("leon", "car-illus")}
    </article>`;
}
// Completa el número (y el texto del equipo) una vez que llegan los datos
export async function paintHome() {
  await load(); const it = intencion();
  const n = it ? await cloud.rosariosMes(it.k) : null;
  const t = document.getElementById("papaT0"), x = document.getElementById("papaX0"), nb = document.getElementById("papaN"), nl = document.getElementById("papaNl");
  if (it && t) { t.textContent = it.t; x.textContent = it.x; }
  if (nb) { nb.textContent = n === null ? "" : String(n); if (nl) nl.textContent = n === null ? "Reza un Rosario por esta intención" : n === 1 ? "rosario rezado este mes" : n ? "rosarios rezados este mes" : "rosarios este mes: ¡sé el primero!"; }
  return { on: on(), it };
}

// Sumar un rosario (desde Inicio o al terminar el Rosario en la app). Un toque cada 15 minutos por dispositivo.
const LK = "agape_papa_ultimo";
export async function sumar() {
  if (!cloud.state().ready) { toast("Para sumar tu rosario, ingresa con tu cuenta", ""); return false; }
  try { const last = +localStorage.getItem(LK) || 0; if (Date.now() - last < 15 * 60000) { toast("Ya sumaste tu rosario. ¡Gracias! 🙏", ""); return false; } } catch {}
  try {
    await cloud.sumarRosario(mesKey());
    try { localStorage.setItem(LK, String(Date.now())); } catch {}
    const el = document.getElementById("papaN"); if (el) el.textContent = String((+el.textContent || 0) + 1);
    toast("¡Tu rosario se sumó a la intención del Papa! 🙏", "ok");
    return true;
  } catch { toast("No se pudo sumar. Revisa tu conexión.", ""); return false; }
}
// Botón para el final del Rosario
export function finHTML() {
  const it = intencion(); if (!on() || !it || !cloud.state().ready) return "";
  return `<button class="ros-next-pr papa-ros" data-action="papaSumar">🌍 Sumar este rosario a la intención del Papa</button><span class="ros-papa-t">${esc(it.t)}</span>`;
}

// Gestión → Resumen
export async function adminHTML() {
  await load(true); const k = mesKey(), it = intencion(k), n = (await cloud.rosariosMes(k)) || 0;
  return `<section class="card" id="papaAdmin"><h3>🌍 Rosarios por la intención del Papa</h3>
    <p class="muted small" style="margin-top:4px">En Inicio se muestra la intención del mes y cuántos rosarios lleva la comunidad (este mes: <b>${n}</b>). Se suma con «Ya recé uno» o al terminar el Rosario en la app.</p>
    <label class="row" style="gap:8px;margin-top:10px;font-weight:700"><input type="checkbox" id="papaOn" ${on() ? "checked" : ""}> Mostrar en Inicio</label>
    <div class="field" style="margin-top:10px"><label>Intención de ${esc(mesName(k))}</label><input class="input" id="papaT" maxlength="90" value="${esc(it ? it.t : "")}"></div>
    <div class="field"><label>Texto</label><textarea class="textarea" id="papaX" rows="3" maxlength="400">${esc(it ? it.x : "")}</textarea></div>
    <div class="field"><label>Meta del mes <span class="muted">(opcional, 0 = sin meta)</span></label><input class="input" id="papaMeta" type="number" min="0" max="10000" value="${+(cfg && cfg.meta) || 0}" style="max-width:140px"></div>
    <button class="btn btn-primary btn-sm" data-action="papaSave">Guardar</button>
    <p class="xs muted" style="margin-top:8px">Cada mes cambia sola a la intención nueva. Si editas el texto, vale solo para este mes.</p></section>`;
}

export function registerActions(actions) {
  actions.papaLead = (el) => { el.classList.toggle("open"); document.getElementById("homeCarousel")?.dispatchEvent(new Event("mouseenter")); }; // pausa el carrusel mientras se lee
  actions.papaMore = (el) => { const x = document.getElementById("papaX0"); if (!x) return; const open = x.classList.toggle("open"); el.textContent = open ? "Mostrar menos" : "Leer completa"; el.setAttribute("aria-expanded", String(open)); };
  actions.papaSumar = async (el) => { const ok = await sumar(); if (ok && el && el.classList.contains("papa-ros")) { el.disabled = true; el.textContent = "✔ Sumado a la intención del Papa"; } };
  actions.papaSave = async () => {
    const t = (document.getElementById("papaT")?.value || "").trim(), x = (document.getElementById("papaX")?.value || "").trim();
    const k = mesKey(), off = INT[k] || ["", ""];
    const data = { on: !!document.getElementById("papaOn")?.checked, meta: Math.max(0, Math.min(10000, +document.getElementById("papaMeta")?.value || 0)) };
    if (t && (t !== off[0] || x !== off[1])) Object.assign(data, { mes: k, t, x });
    try { await cloud.savePapaCfg(data); cfg = data; toast("Guardado 🙏", "ok"); } catch { toast("No se pudo guardar", ""); }
  };
}
