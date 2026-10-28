// Cuenta regresiva para un hito: sale de un evento de la Agenda marcado «Mostrar cuenta
// regresiva en Inicio». Muestra días, horas, minutos y segundos hasta su fecha y hora.
// La usan Inicio (app) y la página para familias (si el evento es visible para familias).

import { esc } from "./util.js";
import { nextOn } from "./repeat.js";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (date, time) => { const [y, m, d] = date.split("-").map(Number); const [h, mi] = /^\d{1,2}:\d{2}$/.test(time || "") ? time.split(":").map(Number) : [0, 0]; return new Date(y, m - 1, d, h, mi); };

// El hito más próximo que esté vigente (desde «countFrom» hasta que termina su día).
export function pickAll(list, n = 3) { const out = [], rest = [...(list || [])]; for (let i = 0; i < n; i++) { const e = pick(rest); if (!e) break; out.push(e); rest.splice(rest.findIndex((x) => x.id === e.id), 1); } return out; }
export function pick(list) {
  const now = new Date(), today = iso(now);
  const c = (list || []).filter((e) => e.count && e.date).map((e) => {
    const date = nextOn(e, today) || e.date;
    return { ...e, when: date, target: at(date, e.start), endOfDay: at(date, "23:59") };
  }).filter((e) => (!e.countFrom || today >= e.countFrom) && now <= e.endOfDay).sort((a, b) => a.target - b.target);
  return c[0] || null;
}

const UNITS = [["d", "días", "día"], ["h", "horas", "hora"], ["m", "minutos", "minuto"], ["s", "segundos", "segundo"]];
function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const longDate = (d) => d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

export function html(e, { href = "" } = {}) {
  const p = parts(e.target - new Date());
  const tag = href ? "a" : "div";
  const bg = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(e.countBg || "") ? ` style="--cd-img:url('${e.countBg}')"` : "";
  return `<${tag} class="cd-card${bg ? " cd-photo" : ""}"${bg} ${href ? `href="${esc(href)}"` : ""} data-cd="${e.target.getTime()}" aria-live="off">
    <div class="cd-head"><span class="cd-k">Cuenta regresiva</span><strong>${esc(e.title)}</strong>
      <span class="cd-when">${esc(longDate(e.target))}${e.start ? ` · ${esc(e.start)} h` : ""}${e.place ? ` · ${esc(e.place)}` : ""}</span></div>
    <div class="cd-grid" role="timer" aria-label="Tiempo que falta">${UNITS.map(([k, pl, sg]) => `<span class="cd-u"><b data-u="${k}">${k === "d" ? p[k] : pad(p[k])}</b><small data-l="${k}">${p[k] === 1 ? sg : pl}</small></span>`).join("")}</div>
    <p class="cd-done" hidden>¡Hoy es el día!</p>
  </${tag}>`;
}

// Hace avanzar los relojes de la página cada segundo; se detiene solo si ya no hay ninguno.
let timer = null;
export function start() {
  clearInterval(timer);
  const tick = () => {
    const cards = document.querySelectorAll("[data-cd]");
    if (!cards.length) { clearInterval(timer); timer = null; return; }
    cards.forEach((c) => {
      const ms = +c.dataset.cd - Date.now();
      if (ms <= 0) { c.querySelector(".cd-grid").hidden = true; c.querySelector(".cd-done").hidden = false; return; }
      const p = parts(ms);
      UNITS.forEach(([k, pl, sg]) => {
        const b = c.querySelector(`[data-u="${k}"]`), l = c.querySelector(`[data-l="${k}"]`);
        const v = k === "d" ? String(p[k]) : pad(p[k]);
        if (b && b.textContent !== v) b.textContent = v;
        if (l) l.textContent = p[k] === 1 ? sg : pl;
      });
    });
  };
  tick(); timer = setInterval(tick, 1000);
}
