// Tarjeta para compartir una vela recién encendida: imagen (dibujada en el teléfono con el estudio de
// difusión) + texto con la intención y el enlace a la Capilla, lista para enviar por WhatsApp.
// La comparte solo quien escribió la intención, desde su propio teléfono.

import { icon, toast } from "./util.js";

export const LINK = "https://pj-agape.github.io/vela/";
let actual = null; // { text, intencion }

const corta = (t, n) => (t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t);

export function textoDe(intencion) {
  const t = String(intencion || "").trim();
  return t
    ? `Encendí una vela en la Capilla Ágape:\n\n_«${t}»_\n\n¿Rezas conmigo? Enciende tú también la tuya:\n${LINK}`
    : `Encendí una vela en la Capilla Ágape por quienes llevo en el corazón.\n\n¿Rezas conmigo? Enciende tú también la tuya:\n${LINK}`;
}

const pieza = (intencion) => {
  const t = String(intencion || "").trim();
  return { kicker: "Capilla Ágape", hand: "¿rezas conmigo?", title: "Encendí una *vela*",
    sub: t ? `«${corta(t, 150)}»` : "Por quienes llevo en el corazón.", ill: "oracion", qr: LINK, qrLabel: "enciende la tuya" };
};

// Panel que va debajo del formulario apenas se enciende la vela
export function panelHTML(intencion) {
  actual = { intencion: String(intencion || "").trim(), text: textoDe(intencion) };
  return `<div class="vt-panel" id="vtPanel">
    <p class="vt-h"><strong>Invita a alguien a rezar contigo</strong><span>Envía tu vela por WhatsApp: va la imagen, tu intención y el enlace a la Capilla.</span></p>
    <canvas class="vt-img" id="vtCanvas" width="1080" height="1080" aria-label="Imagen de tu vela para compartir"></canvas>
    <div class="row-wrap vt-btns">
      <button class="btn btn-gold" data-action="vtShare">${icon("send")} Enviar por WhatsApp</button>
      <button class="btn btn-soft btn-sm" data-action="vtCopy">${icon("copy")} Copiar texto</button>
      <button class="btn btn-ghost btn-sm" data-action="vtSave">${icon("dl")} Guardar imagen</button>
    </div>
    <p class="xs muted">Compártela solo si quieres: tu intención la eliges tú. Quien la reciba puede encender su vela, aunque no tenga cuenta.</p>
  </div>`;
}

export async function pintar() {
  const cv = document.getElementById("vtCanvas"); if (!cv || !actual) return;
  try {
    const E = await import("./estudio.js");
    await E.ready();
    const d = pieza(actual.intencion);
    await E.preload(E.illsFor("noche", d));
    E.piece(cv.getContext("2d"), 1080, 1080, "noche", d);
  } catch (e) { console.warn("Tarjeta de vela:", e); cv.remove(); }
}

const blob = () => new Promise((ok) => { const cv = document.getElementById("vtCanvas"); if (!cv) ok(null); else cv.toBlob(ok, "image/png"); });
const esPC = () => !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ""));

async function compartir(el) {
  if (!actual) return;
  const text = actual.text;
  // En el teléfono: el menú para compartir lleva imagen y texto juntos a WhatsApp
  if (!esPC()) {
    try { await navigator.clipboard.writeText(text); } catch {}
    try {
      const b = await blob();
      const file = b && new File([b], "vela-agape.png", { type: "image/png" });
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
  }
  // En el computador (o si no hay menú para compartir): WhatsApp con el texto y el enlace
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  if (esPC()) toast("Se abrió WhatsApp con el texto. Si quieres la imagen, guárdala y adjúntala.", "", 6000);
}

let wired = false;
export function setup(actions) {
  if (wired) return; wired = true;
  actions.vtShare = (el) => compartir(el);
  actions.vtCopy = async () => { if (!actual) return; try { await navigator.clipboard.writeText(actual.text); toast("Texto copiado", "ok"); } catch { toast("No se pudo copiar", ""); } };
  actions.vtSave = async () => {
    const b = await blob(); if (!b) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "vela-agape.png";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
}
