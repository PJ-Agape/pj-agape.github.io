// Salmos cantados: recorre los videos del canal de YouTube «Cántalos Salmos» y guarda, para cada
// salmo, su video (data/salmos-yt.json). Lo ejecuta una acción de GitHub una vez por semana.
// No usa claves ni cuentas: lee la página pública del canal y sus páginas siguientes.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const OUT = process.argv[2] || "data/salmos-yt.json";
const HANDLE = process.env.CANAL_SALMOS || "@CantalosSalmos";
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", "Accept-Language": "es-CL,es;q=0.9", Cookie: "CONSENT=YES+1; SOCS=CAI" };
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const falla = (msg) => { console.warn(msg); writeFileSync(OUT, JSON.stringify({ ...prev, canal: HANDLE, error: msg, revisado: new Date().toISOString().slice(0, 10) }, null, 1) + "\n"); process.exit(0); };

// Saca pares (id, título) de un trozo de la respuesta de YouTube (HTML o JSON).
const vistos = new Map();
const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const TITULOS = [
  new RegExp(`"lockupMetadataViewModel":\\{"title":\\{"content":${STR}`),
  new RegExp(`"primaryText":\\{"content":${STR}`),
  new RegExp(`"title":\\{"runs":\\[\\{"text":${STR}`),
  new RegExp(`"title":\\{"simpleText":${STR}`),
];
const MENU = /^(Agregar a la fila|Add to queue|Ver más tarde|Watch later|Compartir|Share|Guardar en playlist|Save to playlist)$/i;
function sacar(txt) {
  for (const m of txt.matchAll(/"(?:videoId|contentId)":"([\w-]{11})"/g)) {
    if (vistos.has(m[1])) continue;
    const win = txt.slice(m.index, m.index + 9000);
    let title = "";
    for (const re of TITULOS) {
      const t = win.match(re); if (!t) continue;
      try { const v = JSON.parse(`"${t[1]}"`); if (v && !MENU.test(v.trim())) { title = v; break; } } catch {}
    }
    if (title) vistos.set(m[1], title);
  }
  const c = txt.match(/"continuationCommand":\{"token":"([^"]+)"/);
  return c ? c[1] : "";
}

async function paginas(tab) {
  const r = await fetch(`https://www.youtube.com/${HANDLE}/${tab}`, { headers: UA }).catch((e) => ({ ok: false, status: e.message, text: async () => "" }));
  const html = await r.text();
  if (!html.includes("ytInitialData")) return `${tab}: ${r.status}, ${html.length} bytes`;
  const key = (html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || [])[1], ver = (html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/) || [])[1] || "2.20240101.00.00";
  let tok = sacar(html), n = 0;
  while (tok && key && n++ < 60) {
    const j = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${key}&prettyPrint=false`, {
      method: "POST", headers: { ...UA, "Content-Type": "application/json" },
      body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion: ver, hl: "es", gl: "CL" } }, continuation: tok }),
    }).then((x) => x.text()).catch(() => "");
    tok = sacar(j);
  }
  return "";
}
const errs = [];
for (const tab of ["videos", "shorts", "streams"]) { const e = await paginas(tab); if (e) errs.push(e); }
if (!vistos.size) falla(`Sin videos (${errs.join(" · ")})`);

// Los números de salmo de un título: «Salmo 23», «SALMO 3:», «Salmo 3 y 34», «Salmos 1 al 5».
function numeros(title) {
  const m = title.match(/\b(?:salmos?|sal\.?|psalms?)\s*(\d{1,3}(?:\s*(?:,|y|e|&|al|a|-|–)\s*\d{1,3})*)/i); if (!m) return [];
  const out = [], parts = m[1].split(/\s*(,|y|e|&|al|a|-|–)\s*/i);
  for (let i = 0; i < parts.length; i += 2) {
    const n = +parts[i], sep = (parts[i - 1] || "").toLowerCase();
    if (i && /^(al|a|-|–)$/.test(sep) && out.length) { for (let k = out[out.length - 1] + 1; k <= n && k - out[out.length - 1] <= 20; k++) out.push(k); }
    else out.push(n);
  }
  return [...new Set(out)].filter((n) => n >= 1 && n <= 150);
}
const salmos = {};
const sinNumero = [];
for (const [id, title] of vistos) {
  const ns = numeros(title);
  if (!ns.length) { sinNumero.push(title); continue; }
  for (const n of ns) (salmos[n] = salmos[n] || []).push({ id, t: title, solo: ns.length === 1 });
}
// Primero el video dedicado solo a ese salmo; después las recopilaciones.
for (const n of Object.keys(salmos)) salmos[n].sort((a, b) => (b.solo ? 1 : 0) - (a.solo ? 1 : 0));
const out = { canal: HANDLE, fuente: "Cántalos Salmos (YouTube)", total: vistos.size, conNumero: Object.keys(salmos).length, salmos, sinNumero: sinNumero.slice(0, 40), ...(errs.length ? { avisos: errs } : {}) };
const igual = JSON.stringify(out) === JSON.stringify({ ...prev, revisado: undefined, error: undefined }, (k, v) => (v === undefined ? undefined : v));
if (!igual) { writeFileSync(OUT, JSON.stringify({ ...out, revisado: new Date().toISOString().slice(0, 10) }, null, 1) + "\n"); console.log(`salmos-yt.json: ${vistos.size} videos, ${out.conNumero} salmos`); }
else console.log("salmos-yt.json sin cambios");
