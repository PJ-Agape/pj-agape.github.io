// Entrada común de Salmos, Oremus y Cancionero (la distribución de Salmos):
// un arco con su ícono, la frase, el título y una línea; al lado, «Para comenzar» con atajos;
// debajo, una tarjeta con su librito u hoja; al final, una cita.
import { esc, icon } from "./util.js";
import { illus } from "./ilustraciones.js";

// o = { id, back:[href,label], ico, hand, title (con *énfasis*), sub, side:{hand, text, chips:[[label, attrs]]}, guide:{ill, hand, title, text, btn:[href, label, ic]}, cita:[texto, ref] }
const em = (s) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>");
export function head(o) {
  return `${o.back ? `<nav class="crumbs no-print"><a href="${o.back[0]}">${esc(o.back[1])}</a>${icon("right")}<span>${esc(o.crumb || o.title.replace(/\*/g, ""))}</span></nav>` : ""}
  <section class="cap-hero sal-hero ent-hero" data-ent="${esc(o.id)}">
    <div class="cap-arch">
      ${o.ico}
      <span class="cap-hand">${esc(o.hand)}</span>
      <h1 class="cap-title">${em(o.title)}</h1>
      <p class="cap-sub">${esc(o.sub)}</p>
    </div>
    <div class="cap-moment sal-llegas" data-ent="${esc(o.id)}">
      <span class="eyebrow">Para comenzar</span>
      <span class="cap-hand sm">${esc(o.side.hand)}</span>
      <p class="sal-llegas-p">${esc(o.side.text)}</p>
      <div class="sal-siento">${o.side.chips.map(([l, attrs]) => `<${/href=/.test(attrs) ? "a" : "button type=\"button\""} class="sal-feel" ${attrs}>${esc(l)}</${/href=/.test(attrs) ? "a" : "button"}>`).join("")}</div>
    </div>
  </section>
  ${o.guide ? guide({ ...o.guide, id: o.id }) : ""}`;
}
export function guide(g) {
  return `<section class="cap-guide sal-guide"${g.id ? ` data-ent="${esc(g.id)}"` : ""}>
    <div class="cap-guide-art">${g.ill.includes("/") ? `<img class="z-illus z-sticker cap-guide-il" src="${esc(g.ill)}" alt="" loading="lazy" decoding="async">` : illus(g.ill, "cap-guide-il")}</div>
    <div class="cap-guide-txt">
      <span class="cap-hand">${esc(g.hand)}</span>
      <h2>${em(g.title)}</h2>
      <p>${esc(g.text)}</p>
      <div class="cap-guide-btns"><a class="cap-guide-btn" href="${g.btn[0]}">${icon(g.btn[2] || "book")} <span class="ent-btn-l">${esc(g.btn[1])}</span></a></div>
    </div>
  </section>`;
}
export const foot = ([t, ref]) => `<p class="cap-foot">«${esc(t)}»<span>${esc(ref)}</span></p>`;

// Íconos del arco (mismo trazo dorado que la lira de los Salmos)
const G = (d, vb = "0 0 120 100") => `<svg class="sal-lira ent-ico" viewBox="${vb}" aria-hidden="true" fill="none" stroke="#c98a00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const ICO = {
  oremus: G('<path d="M60 10v80M36 34h48"/><path d="M60 10c-6 6-6 12 0 18 6-6 6-12 0-18z" fill="#ffba03" stroke-width="3"/>'),
  cancion: G('<path d="M44 76V22l46-10v54"/><circle cx="34" cy="76" r="11" fill="#ffba03"/><circle cx="80" cy="66" r="11" fill="#ffba03"/><path d="M44 36l46-10"/>'),
};
