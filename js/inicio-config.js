// Textos y enlaces de Inicio que el equipo puede cambiar desde Gestión → Inicio y enlaces:
// el saludo, La Plaza Ágape, las radios católicas y los enlaces de interés.
// Se guarda en el mismo documento de la Portada (content/portada, campo «inicio»), que editan
// administradores y coordinadores. Lo que no se cambia usa el texto original de abajo.
import { RADIOS as RADIOS_BASE } from "./capilla.js";

export const DEFAULTS = {
  saludo: { cuenta: "qué bueno verte", visita: "bienvenido a casa" },
  plaza: {
    hand: "donde nos encontramos", title: "La Plaza *Ágape*",
    text: "Lo que vivimos, lo que conversamos y lo que nos decimos: todo en un mismo lugar.",
    doors: {
      muro: { kicker: "Lo que vivimos y conversamos", title: "Muro", text: "Avisos, temas, encuestas y las fotos del grupo.", on: true },
      chat: { kicker: "Lo que nos decimos", title: "Chat", text: "Salas para conversar en grupo.", on: true },
      juegos: { kicker: "Lo que jugamos", title: "Juegos", text: "Cartas, trivia, sopas de letras y más.", on: true },
    },
  },
  radios: RADIOS_BASE.map((r) => ({ ...r })),
  enlaces: [], // Enlaces de interés: pastoral juvenil diocesana, parroquia, diócesis… (los agrega el equipo)
  playlist: { label: "Playlist Ágape", url: "https://open.spotify.com/playlist/5oR6IXXnU6H9AdFJuwdiaB" },
  redes: {
    instagram: "https://www.instagram.com/pj_agape_joven/",
    tiktok: "https://www.tiktok.com/@pj.agape",
    facebook: "https://www.facebook.com/share/18FQ5BhWpd/",
  },
};
export const REDES = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" };
// Íconos simples (monocromos) para los enlaces.
export const BRAND_ICO = {
  spotify: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 9.6c3.4-1 7.2-.7 10.2 1M7.6 12.6c2.8-.8 5.8-.5 8.2.9M8.2 15.4c2.2-.6 4.4-.4 6.3.7" fill="none" stroke="var(--brand-bg, #fff)" stroke-width="1.7" stroke-linecap="round"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M14.5 3h3c.2 1.9 1.5 3.4 3.5 3.6v3.1c-1.3 0-2.5-.4-3.5-1v6.4A5.9 5.9 0 1 1 11.6 9.2v3.2a2.8 2.8 0 1 0 2.9 2.8V3Z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1Z"/></svg>',
};
export const DOOR_NAMES = { muro: "Muro", chat: "Chat", juegos: "Juegos" };

const KEY = "agape_inicio_cfg_v1";
let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch { saved = {}; }

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined || over === null || over === "" ? base : over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = k in base ? merge(base[k], over[k]) : over[k];
  return out;
}
// Configuración efectiva (original + cambios del equipo).
export function cfg() {
  const c = merge(DEFAULTS, saved);
  const radios = Array.isArray(saved.radios) ? saved.radios.filter((r) => r && r.name && /^https?:\/\//i.test(r.url || "")) : DEFAULTS.radios;
  const enlaces = Array.isArray(saved.enlaces) ? saved.enlaces.filter((r) => r && r.name && /^https?:\/\//i.test(r.url || "")) : DEFAULTS.enlaces;
  return { ...c, radios, enlaces };
}
export const savedRaw = () => saved;
export function adopt(v) {
  const next = isObj(v) ? v : {};
  const changed = JSON.stringify(next) !== JSON.stringify(saved);
  saved = next;
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* sin almacenamiento */ }
  return changed;
}
