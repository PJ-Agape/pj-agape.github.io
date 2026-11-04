// Antes: botón al grupo (o canal) de WhatsApp de la app. Desde noviembre de 2026 la app no muestra
// botones a WhatsApp; el enlace guardado en privado/whatsapp queda, pero no se usa.

import * as cloud from "./cloud.js";
import { esc } from "./util.js";
import * as AP from "./apariencia.js";

const WA_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const valid = (u) => /^https:\/\/(chat\.whatsapp\.com|(www\.)?whatsapp\.com\/channel)\//.test(String(u || ""));
const card = (g) => `<a class="card link wa-card" id="waCard" href="${esc(g.url)}" target="_blank" rel="noopener">
  <span class="wa-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg></span>
  <span style="flex:1;min-width:0"><strong>${esc(g.title || "Únete al grupo de WhatsApp de la app")}</strong>
  <span class="muted small">${esc(g.desc || "Tutoriales, novedades y ánimo para la comunidad Ágape.")}</span></span>
  <span class="btn btn-sm wa-btn">Unirme</span></a>`;

// Desde noviembre de 2026 la app ya no muestra botones al grupo ni al canal de WhatsApp.
export async function afterRender() {}

// Editor para Gestión (equipo)
export async function adminHTML() { return ""; }
document.addEventListener("click", async (e) => {
  const save = e.target.closest("[data-wa-save]"), clear = e.target.closest("[data-wa-clear]");
  if (!save && !clear) return;
  const { toast } = await import("./util.js");
  const url = clear ? "" : document.getElementById("waUrl").value.trim();
  if (url && !valid(url)) { toast("El enlace debe ser de un grupo (chat.whatsapp.com) o canal (whatsapp.com/channel) de WhatsApp", ""); return; }
  try {
    await cloud.saveGrupoWA({ url, title: clear ? "" : document.getElementById("waTitle").value.trim().slice(0, 60), desc: clear ? "" : document.getElementById("waDesc").value.trim().slice(0, 100) });
    toast(url ? "Botón del grupo guardado" : "Botón quitado", "ok");
    const box = document.getElementById("waAdmin"); if (box) box.outerHTML = await adminHTML();
  } catch (err) { console.warn(err); toast("No se pudo guardar", ""); }
});
