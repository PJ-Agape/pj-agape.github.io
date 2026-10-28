// Misa en vivo: busca en la lista pública (RSS) del canal de YouTube de Magnificat TV la Misa de
// cada día y la guarda en data/misa-vivo.json, para que el botón de la Capilla lleve a la de hoy.
// Lo ejecuta cada hora la misma acción del Evangelio. No usa claves ni cuentas.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = process.argv[2] || "data/misa-vivo.json";
const HANDLE = process.env.CANAL_MISA || "@magnificat.tv-fm";
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "es-CL,es;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" };
// Si algo falla, se deja anotado en el archivo (sin borrar los días que ya había).
const falla = (msg) => { console.warn(msg); const o = { ...prev, handle: HANDLE, error: msg, revisado: new Date().toISOString().slice(0, 13) }; if (JSON.stringify(o.error) !== JSON.stringify(prev.error)) writeFileSync(OUT, JSON.stringify(o, null, 1) + "\n"); process.exit(0); };
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const tz = (d) => new Date(d.toLocaleString("en-US", { timeZone: "America/Santiago" }));
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// El ID del canal se saca una vez de su página y se guarda.
let channelId = prev.handle === HANDLE ? prev.channelId : "";
if (!channelId) {
  const r = await fetch(`https://www.youtube.com/${HANDLE}`, { headers: UA }).catch((e) => ({ ok: false, status: e.message, text: async () => "" }));
  const html = await r.text();
  channelId = (html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) || html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/"(?:channelId|browseId)":"(UC[\w-]{22})"/) || [])[1] || "";
  if (!channelId) falla(`No se encontró el canal ${HANDLE} (${r.status}, ${html.length} bytes, ${(html.match(/<title>([^<]*)/) || [])[1] || ""})`);
}
// Los videos: primero la lista RSS del canal; si YouTube no la entrega, la página de transmisiones.
let items = [], via = "rss";
// El RSS de YouTube a veces responde 404 un rato: se reintenta un par de veces.
let rss = { ok: false, status: "-" };
for (let i = 0; i < 3 && !rss.ok; i++) {
  if (i) await new Promise((r) => setTimeout(r, 4000));
  rss = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { headers: UA }).catch(() => ({ ok: false, status: "red" }));
}
if (rss.ok) {
  items = (await rss.text()).split("<entry>").slice(1).map((e) => ({ id: (e.match(/<yt:videoId>([^<]+)</) || [])[1], title: dec((e.match(/<title>([^<]+)</) || [])[1] || ""), pub: (e.match(/<published>([^<]+)</) || [])[1] }));
} else {
  via = `streams (rss ${rss.status})`;
  const h = await (await fetch(`https://www.youtube.com/${HANDLE}/streams`, { headers: UA })).text().catch(() => "");
  // Cada video aparece como «videoId» (o «contentId») y, un poco más adelante, su título.
  for (const m of h.matchAll(/"(?:videoId|contentId)":"([\w-]{11})"/g)) {
    if (items.some((x) => x.id === m[1])) continue;
    const t = h.slice(m.index, m.index + 4000).match(/"title":\{(?:"runs":\[\{"text"|"simpleText"|"content"):"((?:[^"\\]|\\.)*)"/);
    if (t) try { items.push({ id: m[1], title: JSON.parse(`"${t[1]}"`), pub: "" }); } catch {}
  }
  if (!items.length) falla(`Sin videos: ${via}, página ${h.length} bytes`);
}
// La Misa del día se titula «Santa Misa de Hoy | Viernes, XXIX Semana… (23-10-2026) | …»; en fiestas y
// solemnidades a veces solo «Santa Misa | Fiesta, Santos Simón y Judas… (28-10-2026) | …» (sin «de Hoy»).
const esMisa = (t) => !/homil[ií]a|rosario|adoraci[oó]n/i.test(t) &&
  (/misa de hoy/i.test(t) || (/^\s*(la\s+)?santa misa\b/i.test(t) && /\b\d{1,2}[-./]\d{1,2}[-./]\d{4}\b/.test(t)));
// Se usa la fecha del título; si no trae, la de publicación (hora de Chile).
const nuevos = {};
for (const { id, title, pub } of items) {
  console.log("·", pub, title);
  if (!id || !esMisa(title)) continue;
  const f = title.match(/\b(\d{1,2})[-./](\d{1,2})[-./](\d{4})\b/);
  const p = tz(pub ? new Date(pub) : new Date());
  const iso = f ? `${f[3]}-${f[2].padStart(2, "0")}-${f[1].padStart(2, "0")}` : isoOf(p);
  if (!nuevos[iso]) nuevos[iso] = { id, title }; // el más nuevo primero
}
const viejos = Object.fromEntries(Object.entries(prev.days || {}).filter(([, x]) => esMisa(x.title || "")));
const days = Object.fromEntries(Object.entries({ ...viejos, ...nuevos }).sort(([a], [b]) => b.localeCompare(a)));
// Solo los últimos 10 días.
const desde = isoOf(new Date(tz(new Date()).getTime() - 10 * 864e5));
for (const k of Object.keys(days)) if (k < desde) delete days[k];
const out = { handle: HANDLE, channelId, via, vistos: items.slice(0, 8).map((x) => x.title), fuente: "Magnificat TV (YouTube)", days };
if (JSON.stringify(out) !== JSON.stringify(prev)) { writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n"); console.log("misa-vivo.json:", Object.keys(days).join(", ")); }
else console.log("misa-vivo.json sin cambios");
