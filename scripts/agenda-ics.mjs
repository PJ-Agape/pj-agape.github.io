// Genera agenda.ics (calendario para suscribirse) a partir de la Agenda de Firestore.
// Lo ejecuta cada hora una acción de GitHub.
// Uso: node scripts/agenda-ics.mjs [salida]   (sin dependencias; Node 18+)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { rrule } from "../js/repeat.js";

const OUT = process.argv[2] || "agenda.ics";
const cfg = readFileSync("js/config.js", "utf8");
const KEY = (cfg.match(/apiKey:\s*"([^"]+)"/) || [])[1];
const PROJECT = (cfg.match(/projectId:\s*"([^"]+)"/) || [])[1];
const TZ = "America/Santiago";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const TYPES = { cumpleanos: "Cumpleaños", encuentro: "Encuentro", retiro: "Retiro", misa: "Misa", liturgia: "Liturgia", festividad: "Festividad", curso: "Curso", taller: "Taller", lectura: "Lectura", actividad: "Actividad", equipo: "Equipo", otro: "Otro" };

// --- Firestore (lectura pública de la colección agenda) ---
const val = (v) => v == null ? undefined : "mapValue" in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)])) : "nullValue" in v ? null : "arrayValue" in v ? (v.arrayValue.values || []).map(val) : "stringValue" in v ? v.stringValue : "booleanValue" in v ? v.booleanValue
  : "integerValue" in v ? +v.integerValue : "doubleValue" in v ? v.doubleValue : "timestampValue" in v ? v.timestampValue : undefined;
async function agenda() {
  const rows = [];
  let page = "";
  do {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/agenda?pageSize=300&key=${KEY}${page ? "&pageToken=" + page : ""}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Firestore ${r.status}: ${await r.text()}`);
    const j = await r.json();
    for (const d of j.documents || []) {
      const f = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, val(v)]));
      rows.push({ id: d.name.split("/").pop(), ...f, updated: d.updateTime });
    }
    page = j.nextPageToken || "";
  } while (page);
  return rows.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date || "") && e.title);
}

// --- iCalendar ---
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => "\\" + m).replace(/\r?\n/g, "\\n");
function fold(line) {
  const out = []; let cur = "", bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
const ymd = (s) => s.replace(/-/g, "");
const nextDay = (s) => { const [y, m, d] = s.split("-").map(Number); const x = new Date(Date.UTC(y, m - 1, d + 1)); return x.toISOString().slice(0, 10).replace(/-/g, ""); };
const hm = (t) => (/^\d{1,2}:\d{2}$/.test(t || "") ? t.padStart(5, "0").replace(":", "") + "00" : null);
const stamp = (iso) => (iso ? new Date(iso) : new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

function vevent(e, fam = false) {
  const s = hm(e.start), en = hm(e.end) || s;
  const desc = fam
    ? [e.desc, e.auth && e.auth.req ? "Requiere autorización de papás o apoderados: descárgala en la página para familias." : "", "Pastoral Juvenil Ágape · pj-agape.github.io/familias/"].filter(Boolean).join("\n\n")
    : [e.desc, e.audience ? `Para: ${e.audience}` : "", "Agenda Ágape · pj-agape.github.io/#/agenda"].filter(Boolean).join("\n\n");
  return ["BEGIN:VEVENT", `UID:${e.id}@pj-agape`, `DTSTAMP:${stamp(e.updated)}`,
    s ? `DTSTART;TZID=${TZ}:${ymd(e.date)}T${s}` : `DTSTART;VALUE=DATE:${ymd(e.date)}`,
    s ? `DTEND;TZID=${TZ}:${ymd(e.date)}T${en > s ? en : s}` : `DTEND;VALUE=DATE:${nextDay(e.date)}`,
    rrule(e, !s),
    (e.exdates || []).length ? (s ? `EXDATE;TZID=${TZ}:${e.exdates.map((x) => ymd(x) + "T" + s).join(",")}` : `EXDATE;VALUE=DATE:${e.exdates.map(ymd).join(",")}`) : "",
    `SUMMARY:${esc(e.title)}`, e.place ? `LOCATION:${esc(e.place)}` : "", `DESCRIPTION:${esc(desc)}`,
    `CATEGORIES:${esc(TYPES[e.type] || "Otro")}`, s ? "" : "TRANSP:TRANSPARENT", "END:VEVENT"].filter(Boolean);
}

const VTZ = ["BEGIN:VTIMEZONE", `TZID:${TZ}`, "X-LIC-LOCATION:America/Santiago",
  "BEGIN:STANDARD", "TZOFFSETFROM:-0300", "TZOFFSETTO:-0400", "TZNAME:-04", "DTSTART:19700405T000000", "RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU", "END:STANDARD",
  "BEGIN:DAYLIGHT", "TZOFFSETFROM:-0400", "TZOFFSETTO:-0300", "TZNAME:-03", "DTSTART:19700906T000000", "RRULE:FREQ=YEARLY;BYMONTH=9;BYDAY=1SU", "END:DAYLIGHT",
  "END:VTIMEZONE"];

const own = await agenda();
const byDate = (a, b) => (a.date + (a.start || "")).localeCompare(b.date + (b.start || ""));
function write(out, list, name, desc, fam) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pastoral Juvenil Agape//Agenda//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${name}`, `X-WR-CALDESC:${desc}`, `X-WR-TIMEZONE:${TZ}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H", ...VTZ, ...list.flatMap((e) => vevent(e, fam)), "END:VCALENDAR"];
  const ics = lines.map(fold).join("\r\n") + "\r\n";
  const prev = existsSync(out) ? readFileSync(out, "utf8") : "";
  // Sin cambios en los eventos: no reescribir (evita commits innecesarios por el DTSTAMP)
  const strip = (t) => t.replace(/^DTSTAMP:.*$/gm, "");
  if (strip(prev) !== strip(ics)) { writeFileSync(out, ics); console.log(`${out}: ${list.length} eventos`); }
  else console.log(`${out} sin cambios`);
}
write(OUT, [...own].sort(byDate), "Agenda Ágape", "Agenda oficial de la Pastoral Juvenil Ágape · Parroquia San Miguel de Yungay", false);
// Calendario para familias: solo los eventos marcados «Visible para familias».
write(process.argv[3] || "familias.ics", own.filter((e) => e.familias === true).sort(byDate), "Ágape · Familias", "Actividades de la Pastoral Juvenil Ágape para las familias · Parroquia San Miguel de Yungay", true);
