// Accesibilidad: letra más grande, lectura fácil, menos movimiento, más contraste y
// «Escuchar» (el teléfono lee en voz alta). Se guarda en este dispositivo y sirve con o
// sin cuenta: cada persona la ajusta a su medida desde Mi perfil o #/accesibilidad.

import { esc } from "./util.js";

const K = "agape_a11y_v1";
const DEF = { size: 0, facil: false, calma: false, contraste: false, voz: false, color: "" };
// Color de la app (cada persona elige el suyo). «Morado» es la única excepción a la paleta del logo.
export const COLORES = [["", "Azul Ágape", "#1351a4"], ["celeste", "Celeste", "#0b6fb3"], ["naranja", "Naranja", "#c9460f"], ["morado", "Morado", "#6b3fa0"]];
let P = { ...DEF };
try { P = { ...DEF, ...JSON.parse(localStorage.getItem(K) || "{}") }; } catch {}
const save = () => { try { localStorage.setItem(K, JSON.stringify(P)); } catch {} };
export const prefs = () => ({ ...P });
export const easy = () => !!P.facil;

export function apply() {
  const h = document.documentElement;
  h.classList.toggle("a11y-s1", P.size === 1);
  h.classList.toggle("a11y-s2", P.size === 2);
  h.classList.toggle("a11y-facil", !!P.facil);
  h.classList.toggle("a11y-calma", !!P.calma);
  h.classList.toggle("a11y-contraste", !!P.contraste);
  h.classList.toggle("a11y-voz", !!P.voz && hasVoice());
  if (COLORES.some(([k]) => k && k === P.color)) h.dataset.color = P.color; else delete h.dataset.color;
}
apply();

// ---------------------------------------------------------------------------
// Panel de ajustes
// ---------------------------------------------------------------------------
const OPTS = [
  ["facil", "Lectura fácil", "Letra más clara, más espacio entre líneas, botones grandes y un resumen corto de cada encuentro."],
  ["voz", "Escuchar", "Aparece un botón para que el teléfono lea en voz alta los encuentros, las oraciones y las dinámicas."],
  ["calma", "Menos movimiento", "Sin animaciones ni cosas que se muevan solas."],
  ["contraste", "◐ Más contraste", "Textos más oscuros y bordes más marcados."],
];
export function panelHTML() {
  return `<section class="card a11y-panel" id="a11yPanel" aria-labelledby="a11yTitle">
    <h2 id="a11yTitle">Accesibilidad</h2>
    <p class="muted small">Ajusta la app a tu medida. Se guarda en este teléfono o computador.</p>
    <div class="a11y-row" role="group" aria-label="Tamaño de la letra"><span class="a11y-k">Tamaño de la letra</span>
      <div class="seg">${["Normal", "Grande", "Muy grande"].map((l, i) => `<label><input type="radio" name="a11ySize" value="${i}" ${P.size === i ? "checked" : ""} data-a11y="size"><span style="font-size:${[0.9, 1.05, 1.2][i]}rem">${l}</span></label>`).join("")}</div></div>
    <div class="a11y-row" role="radiogroup" aria-label="Color de la app"><span class="a11y-k">Color de la app</span>
      <div class="a11y-colors">${COLORES.map(([k, l, c]) => `<label class="a11y-color"><input type="radio" name="a11yColor" value="${k}" ${P.color === k ? "checked" : ""} data-a11y="color"><i style="--c:${c}"></i><span>${l}</span></label>`).join("")}</div></div>
    ${OPTS.map(([k, l, d]) => (k === "voz" && !hasVoice()) ? "" : `<label class="a11y-opt"><input type="checkbox" data-a11y="${k}" ${P[k] ? "checked" : ""}>
      <span><b>${l}</b><span class="small muted">${esc(d)}</span></span></label>`).join("")}
    ${hasVoice() ? `<button type="button" class="btn btn-ghost btn-sm" data-a11y-test>Probar la voz</button>` : ""}
  </section>`;
}
export function viewPage() {
  return `<header class="page-head"><span class="eyebrow">Para todos</span><h1>Una app a tu <em>medida</em></h1>
    <p>En Ágape hay un lugar para cada uno. Aquí puedes hacer la letra más grande, pedir que la app te lea en voz alta y más.</p></header>
    ${panelHTML()}`;
}

// ---------------------------------------------------------------------------
// Escuchar (síntesis de voz del propio teléfono)
// ---------------------------------------------------------------------------
function hasVoice() { return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window; }
let speaking = null; // elemento que se está leyendo
function voice() {
  const v = speechSynthesis.getVoices();
  return v.find((x) => /^es[-_]CL/i.test(x.lang)) || v.find((x) => /^es[-_](419|MX|AR|US)/i.test(x.lang)) || v.find((x) => /^es/i.test(x.lang)) || null;
}
// Texto legible de un bloque: sin botones, campos ni íconos; cada línea o párrafo es una pausa.
function textOf(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll("button, input, textarea, select, svg, script, style, .no-tts, .a11y-say, [aria-hidden=true]").forEach((n) => n.remove());
  c.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  c.querySelectorAll("p, li, h1, h2, h3, h4, div, span.eyebrow, label, .cap-vr").forEach((b) => b.append("\n"));
  return c.textContent.split("\n").map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean).join(".\n").replace(/([.!?¿¡:;,»])\./g, "$1");
}
function chunks(t) {
  const out = [];
  t.split(/\n+/).forEach((line) => {
    const parts = line.match(/[^.!?]+[.!?]*/g) || [line];
    let cur = "";
    parts.forEach((p) => { if ((cur + p).length > 220 && cur) { out.push(cur); cur = p; } else cur += p; });
    if (cur.trim()) out.push(cur);
  });
  return out;
}
export function stop() {
  if (!hasVoice()) return;
  speechSynthesis.cancel();
  if (speaking) speaking.classList.remove("a11y-reading");
  speaking = null;
  document.querySelectorAll("[data-a11y-say]").forEach((b) => { b.textContent = b.dataset.label || "Escuchar"; b.setAttribute("aria-pressed", "false"); });
}
export function say(text, el, btn) {
  if (!hasVoice() || !text) return;
  stop();
  const v = voice(), list = chunks(text);
  speaking = el || null;
  if (el) el.classList.add("a11y-reading");
  if (btn) { btn.textContent = "⏹ Detener"; btn.setAttribute("aria-pressed", "true"); }
  list.forEach((c, i) => {
    const u = new SpeechSynthesisUtterance(c);
    u.lang = v ? v.lang : "es-CL"; if (v) u.voice = v;
    u.rate = P.facil ? 0.85 : 0.95;
    if (i === list.length - 1) u.onend = () => stop();
    speechSynthesis.speak(u);
  });
}

// Bloques que se pueden escuchar por separado
const BLOCKS = [".mc-enc", ".mc-easy", ".cap-devcard", ".din-sheet", ".cap-gospel", ".mag-enc-head", ".unit-sec", ".help-item .help-a"];
// Se llama después de dibujar cada vista
export function afterRender() {
  apply();
  stop();
  const fab = document.getElementById("a11yFab");
  if (!P.voz || !hasVoice()) { if (fab) fab.remove(); document.querySelectorAll(".a11y-say").forEach((b) => b.remove()); return; }
  document.querySelectorAll(BLOCKS.join(",")).forEach((el) => {
    if (el.querySelector(":scope > .a11y-say")) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "a11y-say btn btn-sm btn-soft no-print"; b.dataset.a11ySay = "block"; b.dataset.label = "Escuchar";
    b.textContent = "Escuchar"; b.setAttribute("aria-pressed", "false");
    el.prepend(b);
  });
  if (!fab) {
    const f = document.createElement("button");
    f.id = "a11yFab"; f.type = "button"; f.className = "a11y-fab no-print"; f.dataset.a11ySay = "page"; f.dataset.label = "Escuchar la página";
    f.textContent = "Escuchar la página"; f.setAttribute("aria-pressed", "false");
    document.body.appendChild(f);
  }
}

// Eventos propios (no dependen del delegado de la app)
document.addEventListener("change", (e) => {
  const k = e.target.dataset && e.target.dataset.a11y; if (!k) return;
  if (k === "size") P.size = +e.target.value;
  else if (k === "color") { P.color = e.target.value; document.dispatchEvent(new Event("agape:color")); }
  else P[k] = !!e.target.checked;
  save(); afterRender();
});
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-a11y-say], [data-a11y-test]");
  if (!t) return;
  e.preventDefault(); e.stopPropagation();
  if (t.hasAttribute("data-a11y-test")) return say("Hola. Así te voy a leer los encuentros y las oraciones de Ágape.");
  if (t.getAttribute("aria-pressed") === "true") return stop();
  if (t.dataset.a11ySay === "page") {
    const v = document.getElementById("view");
    return say(v ? textOf(v.querySelector(".page-head") ? v : v) : "", v, t);
  }
  const el = t.parentElement; say(textOf(el), el, t);
}, true);
window.addEventListener("hashchange", () => stop());
if (hasVoice()) speechSynthesis.onvoiceschanged = () => {};
