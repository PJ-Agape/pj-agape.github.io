// Control remoto para lo que se proyecta (canciones, oraciones, salmos y presentaciones): el
// disparador Bluetooth de un palo de selfie, un control de presentaciones o los botones de unos
// audífonos. Igual que en el Rosario: los disparadores envían «Enter» o flechas, y los que solo
// mandan «siguiente pista» necesitan un audio activo (se reproduce silencio) para que Android los
// entregue. Se enciende con el botón «Control» que aparece junto a las flechas.

const NEXT = ["Enter", "NumpadEnter", "ArrowRight", "ArrowDown", "PageDown", "MediaTrackNext", "AudioVolumeUp", "VolumeUp", "MediaPlayPause", " "];
const PREV = ["ArrowLeft", "ArrowUp", "PageUp", "MediaTrackPrevious", "AudioVolumeDown", "VolumeDown"];
const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="5"/><circle cx="12" cy="8" r="2.2"/><path d="M10 14h4M10 17h4"/></svg>`;
let r = null, last = 0, opts = { find: () => null, host: () => null, where: "beforeend", album: "Pastoral Juvenil Ágape" };

export const boton = () => `<button type="button" class="remoto-btn" aria-pressed="${!!r}" title="Avanzar con un control remoto (palo de selfie, control de presentaciones o audífonos)">${ICON}<span>Control</span></button>`;

// Chrome en Android solo muestra los controles multimedia (y recibe «siguiente») con audios de 5 s o más.
function silencio() {
  const sr = 8000, n = sr * 20, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
function mover(d) {
  const t = opts.find(); if (!t) return false;
  const b = d > 0 ? t.next : t.prev;
  if (b && !b.disabled) b.click();
  try { navigator.vibrate && navigator.vibrate(25); } catch {}
  return true;
}
function estado(ok) {
  document.querySelectorAll(".remoto-btn").forEach((b) => {
    b.setAttribute("aria-pressed", String(!!r));
    b.classList.toggle("on", !!r); b.classList.toggle("warn", !!r && !ok);
    const s = b.querySelector("span"); if (s) s.textContent = !r ? "Control" : ok ? "Control activo" : "Control en pausa · tocar";
  });
}
function vigilar() {
  if (!r) return;
  if (!opts.find()) { apagar(); return; } // se cerró la proyección
  const a = r.audio;
  if (a.paused) a.play().then(() => estado(true)).catch(() => estado(false)); else estado(true);
  try { navigator.mediaSession.playbackState = "playing"; } catch {}
}
function encender() {
  const audio = new Audio(silencio()); audio.loop = true; audio.volume = 0.01;
  r = { audio };
  audio.play().then(() => estado(true)).catch(() => estado(false));
  audio.addEventListener("pause", () => { setTimeout(() => { if (r && r.audio === audio) audio.play().catch(() => {}); }, 400); });
  const ms = navigator.mediaSession;
  if (ms) {
    try { ms.metadata = new MediaMetadata({ title: document.title || "Proyección", artist: "Control remoto", album: opts.album }); } catch {}
    const n = () => { mover(1); vigilar(); }, p = () => { mover(-1); vigilar(); };
    [["nexttrack", n], ["play", n], ["pause", n], ["previoustrack", p], ["seekforward", n], ["seekbackward", p]].forEach(([a, f]) => { try { ms.setActionHandler(a, f); } catch {} });
  }
  r.watch = setInterval(vigilar, 3000);
  estado(true);
  try { navigator.vibrate && navigator.vibrate(40); } catch {}
}
export function apagar() {
  if (!r) return;
  clearInterval(r.watch);
  try { r.audio.pause(); URL.revokeObjectURL(r.audio.src); } catch {}
  const ms = navigator.mediaSession;
  if (ms) ["nexttrack", "play", "pause", "previoustrack", "seekforward", "seekbackward"].forEach((a) => { try { ms.setActionHandler(a, null); } catch {} });
  r = null; estado(true);
}

// find(): { next, prev } con los botones de la proyección abierta, o null si no hay ninguna.
// host(): dónde poner el botón «Control» (se agrega solo cada vez que la proyección se redibuja).
let listo = false;
export function iniciar(o) {
  opts = { ...opts, ...o };
  if (listo) return; listo = true;
  const st = document.createElement("style");
  st.textContent = `.remoto-btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-weight:800;font-size:.82rem;cursor:pointer}
.can-proj-ctrl .remoto-btn{padding:7px 12px;border-radius:999px;border:0;background:#fff6e5;color:#0b2566}
.remoto-btn.on{background:#ffba03 !important;color:#0b2566 !important}.remoto-btn.warn{background:#ef591c !important;color:#fff !important}
.nav .remoto-btn span{display:none}`;
  document.head.appendChild(st);
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest(".remoto-btn"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (r && b.classList.contains("warn")) { r.audio.play().then(() => estado(true)).catch(() => {}); return; }
    if (r) apagar(); else encender();
  }, true);
  window.addEventListener("keydown", (e) => {
    if (!opts.find()) return;
    const t = e.target;
    if (t && t.closest && t.closest("input, textarea, select, [contenteditable]")) return;
    // Enter o espacio sobre otro botón (Salir, la música) hacen lo suyo.
    if ((e.key === "Enter" || e.key === " ") && t && t.closest && t.closest("button, a") && !t.closest(".remoto-btn")) return;
    const d = NEXT.includes(e.key) ? 1 : PREV.includes(e.key) ? -1 : 0;
    if (!d) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const now = Date.now(); if (now - last < 300) return; last = now; // algunos controles mandan dos señales por toque
    mover(d);
  }, true);
  const poner = () => { const h = opts.host(); if (h && !h.querySelector(".remoto-btn")) { h.insertAdjacentHTML(opts.where, boton()); estado(true); } };
  new MutationObserver(poner).observe(document.body, { childList: true, subtree: true });
  poner();
}
