// Importar canciones al cancionero: convierte el formato «acordes arriba de la letra»
// (como vienen en la mayoría de los cancioneros en PDF o en páginas web) al formato
// de la app, con cada acorde entre corchetes justo antes de la sílaba: [G]Amor que trans[D]forma.
// Acepta notación americana (C, Am7, F#m, Bb, D/F#) y latina (Do, Lam, Sol7, Sib, Re/Fa#), también en
// mayúsculas (DO, REm, SIb, FA#).

const ROOT = "(?:[A-G]|Do|Re|Mi|Fa|Sol|La|Si|DO|RE|MI|FA|SOL|LA|SI)";
const ACC = "(?:#|b|♯|♭)?";
const QUAL = "(?:m|min|maj|M|dim|aug|sus|add|º|°|\\+|-)?";
const EXT = "(?:\\d{1,2})?(?:(?:sus|add|maj|M|b|#|\\+|-)\\d{1,2})*(?:\\(\\w+\\))?";
const CHORD = new RegExp(`^${ROOT}${ACC}${QUAL}${EXT}(?:\\/${ROOT}${ACC})?$`);
// Lo que puede acompañar a los acordes en su línea sin que deje de ser «línea de acordes»
const FILLER = /^(?:\||\/|-+|\.+|x\d+|\(x?\d+\)|\(?bis\)?|%|N\.C\.?|\*)$/i;

export const isChord = (t) => CHORD.test(t);
export function isChordLine(line) {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return false;
  let chords = 0;
  for (const t of toks) {
    if (isChord(t.replace(/[,;]$/, ""))) chords++;
    else if (!FILLER.test(t)) return false;
  }
  return chords > 0;
}

// Etiquetas de sección: «CORO», «Estribillo», «Estrofa 2», «2.», «Puente»… → «Coro:», «Estrofa 2:»
const LABELS = [
  [/^(?:coro|estribillo|refr[aá]n)\b\.?\s*(\d+)?\s*:?\s*$/i, (m) => `Coro${m[1] ? " " + m[1] : ""}:`],
  [/^(?:estrofa|verso)\s*(\d+)?\s*:?\s*$/i, (m) => `Estrofa${m[1] ? " " + m[1] : ""}:`],
  [/^(\d{1,2})[.)-]\s*$/, (m) => `Estrofa ${m[1]}:`],
  [/^(?:pre-?coro)\s*:?\s*$/i, () => "Precoro:"],
  [/^(?:puente)\s*:?\s*$/i, () => "Puente:"],
  [/^(?:intro(?:ducci[oó]n)?)\s*:?\s*$/i, () => "Intro:"],
  [/^(?:final|fin|outro)\s*:?\s*$/i, () => "Final:"],
];
function label(line) {
  const t = line.trim();
  for (const [re, f] of LABELS) { const m = re.exec(t); if (m) return f(m); }
  return null;
}

// Pone los acordes de la línea de arriba dentro de la letra, en la misma columna.
function merge(chordLine, lyric) {
  const out = [], re = /\S+/g; let m;
  while ((m = re.exec(chordLine))) out.push({ col: m.index, ch: m[0] });
  let text = lyric.replace(/\s+$/, "");
  const len = text.length, cola = [];
  for (const { col, ch } of out.reverse()) {
    if (FILLER.test(ch)) continue;
    const c = ch.replace(/[,;]$/, "");
    if (col >= len) cola.unshift(`[${c}]`); // después del final de la letra: van al final, en orden
    else text = text.slice(0, col) + `[${c}]` + text.slice(col);
  }
  if (cola.length) text += (text ? " " : "") + cola.join(" ");
  // Si un acorde quedó sobre el comienzo, no deja espacios raros al inicio; y une las sílabas
  // estiradas con guiones para calzar con los acordes («ven--go» → «ven[Sib]go»).
  return text.replace(/^\s+(\[)/, "$1").replace(/([\p{L}\]])\s*-{2,}\s*(?=[\p{L}\[])/gu, "$1").replace(/ {2,}/g, " ").replace(/ (\[[^\]]+\]) (?!\[)/g, " $1");
}
const chordsOnly = (line) => line.trim().split(/\s+/).filter((t) => !FILLER.test(t)).map((t) => `[${t.replace(/[,;]$/, "")}]`).join(" ");

export function toInline(text) {
  const lines = String(text || "").replace(/\r/g, "").replace(/\t/g, "    ").replace(/ /g, " ").split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*\d{1,3}\s*$/.test(line) && (i === 0 || !lines[i - 1].trim())) continue; // números de página sueltos
    // «Intro: Am F C G» → la etiqueta y, debajo, los acordes
    const lc = /^\s*(intro(?:ducci[oó]n)?|final|puente|interludio)\s*:\s*(.+)$/i.exec(line);
    if (lc && isChordLine(lc[2])) { if (out.length && out[out.length - 1] !== "") out.push(""); out.push(label(lc[1] + ":") || lc[1] + ":"); out.push(chordsOnly(lc[2])); continue; }
    // «Tono:» con el acorde en la misma línea o en la siguiente → «Tono: Fa»
    const tn = /^\s*tono\s*:?\s*(.*)$/i.exec(line);
    if (tn) {
      let k = tn[1].trim(), j = i;
      if (!k) { j = i + 1; while (j < lines.length && !lines[j].trim()) j++; k = j < lines.length && isChord(lines[j].trim()) ? lines[j].trim() : ""; }
      if (k && isChord(k)) { out.push(`Tono: ${k}`); out.push(""); i = j; continue; }
    }
    const lb = label(line);
    if (lb) { if (out.length && out[out.length - 1] !== "") out.push(""); out.push(lb); continue; }
    if (/\[[^\]]+\]/.test(line)) { out.push(line.trim()); continue; } // ya viene con acordes entre corchetes
    if (isChordLine(line)) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !isChordLine(next) && !label(next)) { out.push(merge(line, next)); i++; }
      else out.push(chordsOnly(line)); // intro o pasaje solo instrumental
      continue;
    }
    const l = line.replace(/\s+$/, "");
    if (!l && /:$/.test(out[out.length - 1] || "")) continue; // sin línea en blanco justo después de «Coro:»
    out.push(l);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ¿Quedan líneas de acordes sueltas (arriba de la letra, sin corchetes)? Entonces hay que acomodarlas.
export function hasLoose(text) {
  return String(text || "").replace(/\r/g, "").split("\n").some((l) => !/\[[^\]]+\]/.test(l) && isChordLine(l.replace(/\u00a0/g, " ")));
}

// Varias canciones pegadas juntas: se separan con una línea «---». La primera línea de cada una es el título.
export function splitSongs(text) {
  return String(text || "").replace(/\r/g, "").split(/\n\s*-{3,}\s*\n/).map((chunk) => {
    const lines = chunk.split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    const title = (lines.shift() || "").trim().replace(/^\d{1,3}\s*[.)-]\s*/, "").replace(/\s+/g, " ");
    const body = toInline(lines.join("\n"));
    const chords = (body.match(/\[[^\]]+\]/g) || []).length;
    return { title, body, chords };
  }).filter((s) => s.title && s.body);
}

// ---------------------------------------------------------------------------
// Repetidas: la misma canción con el título escrito distinto («¡Alma Misionera!», «12. alma misionera»)
// o con otro título pero la misma letra (se compara la primera línea cantada, sin acordes).
// ---------------------------------------------------------------------------
const fold = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
export const normTitle = (t) => fold(String(t || "").replace(/^\s*\d{1,3}\s*[.)-]\s*/, ""));
export function firstLyric(body) {
  for (const raw of String(body || "").split("\n")) {
    const l = raw.replace(/\[[^\]]*\]/g, "").trim();
    if (!l || /:$/.test(l) || isChordLine(l) || /^\(|cejillo|capo|^tono\b/i.test(l)) continue; // indicaciones, no letra
    const f = fold(l);
    if (f.length >= 12) return f.split(" ").slice(0, 5).join(" ");
  }
  return "";
}
// Devuelve la canción ya existente que parece la misma (o null).
export function findDuplicate(song, list, skipId) {
  const t = normTitle(song.title), l = firstLyric(song.body);
  for (const s of list || []) {
    if (skipId && s.id === skipId) continue;
    if (t && normTitle(s.title) === t) return { song: s, why: "el mismo título" };
    if (l && firstLyric(s.body) === l) return { song: s, why: "la misma letra" };
  }
  return null;
}
