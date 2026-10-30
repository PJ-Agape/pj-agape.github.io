// Personajes para avatares: animalitos y figuras juveniles dibujados en SVG (64×64)
// con el trazo azul marino de la página. Se usan como «j:<id>» en el avatar.

const N = "#0b2566";
const S = `stroke="${N}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
const s1 = `stroke="${N}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
const eye = (x, y, r = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${N}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.32}" fill="#fff"/>`;
const eyes = (x1, x2, y, r) => eye(x1, y, r) + eye(x2, y, r);
const cheeks = (x1, x2, y, c = "#ef591c", o = 0.3) => `<ellipse cx="${x1}" cy="${y}" rx="2.6" ry="1.7" fill="${c}" opacity="${o}"/><ellipse cx="${x2}" cy="${y}" rx="2.6" ry="1.7" fill="${c}" opacity="${o}"/>`;
const smile = (x, y, w = 3) => `<path d="M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}" fill="none" ${s1}/>`;
const spark = (x, y, r = 3, c = "#ffba03") => `<path d="M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r} Z" fill="${c}"/>`;
const dots = (c, pts) => pts.map(([x, y, r = 1.4]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join("");

// Cada personaje: nombre, fondo [color1, color2] (degradado) y dibujo.
export const PJ = {
  llama: ["Llama", ["#8ad2fa", "#e1f3fd"], () => `
    ${dots("#fff", [[12, 18, 2], [52, 14, 1.6], [50, 26, 1.2]])}
    <path d="M19 66 C19 52 24 45 32 45 C40 45 45 52 45 66 Z" fill="#fff6e5" ${S}/>
    <ellipse cx="24.5" cy="14" rx="3.4" ry="8" transform="rotate(-16 24.5 14)" fill="#fff6e5" ${S}/>
    <ellipse cx="39.5" cy="14" rx="3.4" ry="8" transform="rotate(16 39.5 14)" fill="#fff6e5" ${S}/>
    <circle cx="21.5" cy="7.5" r="3" fill="#ef591c" ${s1}/><circle cx="42.5" cy="7.5" r="3" fill="#ffba03" ${s1}/>
    <ellipse cx="32" cy="31" rx="12" ry="13" fill="#fff6e5" ${S}/>
    <path d="M23 22 C22 15 28 14 29 17 C30 13 35 13 36 17 C37 14 43 15 41 22 C37 19 27 19 23 22 Z" fill="#fff6e5" ${S}/>
    ${eyes(27, 37, 29)}
    <ellipse cx="32" cy="37" rx="6.5" ry="4.8" fill="#f1d6bd" ${S}/>
    <path d="M30 35.5 h.1 M34 35.5 h.1" ${S}/>${smile(32, 38.3, 2)}
    ${cheeks(23.5, 40.5, 34)}
    <path d="M19 47 Q32 54 45 47 L46 53 Q32 60 18 53 Z" fill="#ef591c" ${S}/>
    <path d="M21 50.5 Q32 56.5 43 50.5" fill="none" stroke="#ffba03" stroke-width="2.2"/>
    <path d="M39 53 L41 63 L46 61 L43 52 Z" fill="#ef591c" ${S}/>`],
  zorro: ["Zorro", ["#ffd36b", "#fde0d2"], () => `
    ${spark(12, 16, 3.5, "#fff")}${spark(53, 48, 3, "#fff")}
    <path d="M18 66 C18 54 24 48 32 48 C40 48 46 54 46 66 Z" fill="#1351a4" ${S}/>
    <path d="M29 48 L32 54 L35 48" fill="#fff6e5" ${s1}/>
    <path d="M14 26 L16 7 L27 17 Q32 15.5 37 17 L48 7 L50 26 Q50 40 32 47 Q14 40 14 26 Z" fill="#e8763a" ${S}/>
    <path d="M18 11 L25 17.5 L19.5 21 Z M46 11 L39 17.5 L44.5 21 Z" fill="#fff6e5" ${s1}/>
    <path d="M15 29 Q24 31 32 40 Q40 31 49 29 Q48 40 32 47 Q16 40 15 29 Z" fill="#fff6e5" ${S}/>
    ${eyes(25.5, 38.5, 28.5)}
    <ellipse cx="32" cy="40" rx="2.8" ry="2" fill="${N}"/>
    <path d="M29.5 43.3 Q32 45.3 34.5 43.3" fill="none" ${s1}/>${cheeks(22, 42, 34.5, "#ef591c", .35)}`],
  pinguino: ["Pingüino", ["#bfe7fb", "#e1f3fd"], () => `
    ${dots("#fff", [[10, 30, 1.8], [54, 22, 1.5], [14, 46, 1.2], [52, 40, 2]])}
    <ellipse cx="32" cy="42" rx="19" ry="22" fill="#24375f" ${S}/>
    <path d="M19 40 C19 30 25 26 32 30 C39 26 45 30 45 40 C45 54 38 62 32 62 C26 62 19 54 19 40 Z" fill="#fff" ${S}/>
    ${eyes(27, 37, 37, 2.3)}
    <path d="M28.5 42 L35.5 42 L32 46.5 Z" fill="#ffba03" ${S}/>
    ${cheeks(23, 41, 43, "#ef591c", .35)}
    <path d="M13 30 C13 9 51 9 51 30 Z" fill="#ef591c" ${S}/>
    <path d="M22 13 v16 M32 11 v18 M42 13 v16" stroke="#ffba03" stroke-width="2.6"/>
    <rect x="11" y="26" width="42" height="7" rx="3.5" fill="#fff6e5" ${S}/>
    <circle cx="32" cy="7.5" r="4.5" fill="#fff6e5" ${S}/>`],
  gato: ["Gato gamer", ["#c9b8f5", "#efe8ff"], () => `
    ${spark(10, 14, 3.5, "#fff")}${spark(55, 50, 3, "#ffba03")}
    <path d="M17 66 C17 53 23 47 32 47 C41 47 47 53 47 66 Z" fill="#0b2566" ${S}/>
    <path d="M26 53 h12 v4 h-12 Z" fill="#8ad2fa" ${s1}/>
    <path d="M16 24 L17 8 L28 17 M48 24 L47 8 L36 17" fill="#f2a65a" ${S}/>
    <path d="M18.5 12 L19 19 L24 15.5 Z M45.5 12 L45 19 L40 15.5 Z" fill="#fbc9b4"/>
    <ellipse cx="32" cy="31" rx="16" ry="14.5" fill="#f2a65a" ${S}/>
    <path d="M27 17.5 L28.5 22 M32 16.5 V21.5 M37 17.5 L35.5 22" ${s1}/>
    <ellipse cx="32" cy="37" rx="7" ry="5" fill="#fff6e5" ${s1}/>
    ${eyes(25.5, 38.5, 30)}
    <path d="M30.5 34.5 L33.5 34.5 L32 36.2 Z" fill="#ef591c" ${s1}/>
    <path d="M29 38.2 Q30.5 39.6 32 38.2 Q33.5 39.6 35 38.2" fill="none" ${s1}/>
    <path d="M12 34 L19 35 M12 38 L19 37.5 M52 34 L45 35 M52 38 L45 37.5" ${s1}/>
    <path d="M14 30 C13 10 51 10 50 30" fill="none" stroke="${N}" stroke-width="3.2"/>
    <rect x="9.5" y="26" width="7.5" height="12" rx="3.5" fill="#ef591c" ${S}/><rect x="47" y="26" width="7.5" height="12" rx="3.5" fill="#ef591c" ${S}/>`],
  quiltro: ["Quiltro", ["#9be3b0", "#e2f7e8"], () => `
    ${dots("#fff", [[11, 20, 2], [54, 16, 1.5]])}
    <path d="M18 66 C18 54 24 48 32 48 C40 48 46 54 46 66 Z" fill="#c98e63" ${S}/>
    <path d="M20 47 L44 47 L32 60 Z" fill="#ef591c" ${S}/><circle cx="32" cy="49" r="2.6" fill="#ffba03" ${s1}/>
    <ellipse cx="32" cy="31" rx="15" ry="14.5" fill="#d9a77a" ${S}/>
    <path d="M18 20 C11 20 8 30 11 39 C13 43 18 40 19 34 Z" fill="#8d5a3b" ${S}/>
    <path d="M46 20 C53 20 56 30 53 39 C51 43 46 40 45 34 Z" fill="#8d5a3b" ${S}/>
    <ellipse cx="37.5" cy="28" rx="5.5" ry="5" fill="#8d5a3b" opacity=".55"/>
    ${eyes(26, 38, 28.5)}
    <ellipse cx="32" cy="37.5" rx="7.5" ry="5.5" fill="#fff6e5" ${s1}/>
    <ellipse cx="32" cy="35" rx="2.8" ry="2" fill="${N}"/>
    <path d="M29 39 Q32 41.5 35 39" fill="none" ${s1}/>
    <path d="M31 40.5 q1 4 3 0" fill="#ef591c" ${s1}/>`],
  oso: ["Oso con polerón", ["#ffba03", "#ffe3a0"], () => `
    ${spark(11, 48, 3.5, "#fff")}${spark(53, 12, 3, "#fff")}
    <path d="M13 66 C13 50 21 44 32 44 C43 44 51 50 51 66 Z" fill="#1351a4" ${S}/>
    <path d="M28 48 v8 M36 48 v8" stroke="#fff6e5" stroke-width="2" stroke-linecap="round"/>
    <path d="M13 44 C9 26 18 10 32 10 C46 10 55 26 51 44 C47 50 17 50 13 44 Z" fill="#1351a4" ${S}/>
    <circle cx="19" cy="14" r="5" fill="#1351a4" ${S}/><circle cx="45" cy="14" r="5" fill="#1351a4" ${S}/>
    <ellipse cx="32" cy="32" rx="13" ry="12.5" fill="#a8744f" ${S}/>
    ${eyes(26.5, 37.5, 29.5)}
    <ellipse cx="32" cy="37" rx="5.8" ry="4.3" fill="#e9c9a3" ${s1}/>
    <ellipse cx="32" cy="35.3" rx="2.2" ry="1.5" fill="${N}"/>${smile(32, 38.2, 2)}
    ${cheeks(22.5, 41.5, 34.5)}`],
  pudu: ["Pudú", ["#f1cd74", "#fff3d0"], () => `
    ${dots("#fff", [[11, 24, 1.8], [53, 30, 1.4]])}
    <path d="M19 66 C19 54 25 48 32 48 C39 48 45 54 45 66 Z" fill="#b07a4d" ${S}/>
    <path d="M22 16 L20 8 M20 12 L16 10 M42 16 L44 8 M44 12 L48 10" stroke="#6b4226" stroke-width="2.6" stroke-linecap="round"/>
    <ellipse cx="17" cy="23" rx="7" ry="4" transform="rotate(-25 17 23)" fill="#b07a4d" ${S}/>
    <ellipse cx="47" cy="23" rx="7" ry="4" transform="rotate(25 47 23)" fill="#b07a4d" ${S}/>
    <path d="M20 28 C20 17 44 17 44 28 C44 40 38 47 32 47 C26 47 20 40 20 28 Z" fill="#b07a4d" ${S}/>
    ${eyes(26.5, 37.5, 29, 2.6)}
    <ellipse cx="32" cy="40.5" rx="5.2" ry="4" fill="#e9c9a3" ${s1}/>
    <ellipse cx="32" cy="39" rx="2.2" ry="1.5" fill="${N}"/>
    ${cheeks(23.5, 40.5, 35.5)}${dots("#e9c9a3", [[24, 22, 1.1], [40, 22, 1.1], [32, 20, 1.1]])}`],
  panda: ["Panda", ["#9be3b0", "#e7f8ec"], () => `
    <path d="M47 8 q4 6 0 12 q-4 -6 0 -12 Z" fill="#2fb35a" ${s1}/><path d="M47 20 v6" ${s1}/>
    <path d="M17 66 C17 53 23 47 32 47 C41 47 47 53 47 66 Z" fill="#fff" ${S}/>
    <path d="M22 66 C22 58 26 54 26 54 M42 66 C42 58 38 54 38 54" stroke="${N}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="18" cy="17" r="6" fill="${N}"/><circle cx="46" cy="17" r="6" fill="${N}"/>
    <ellipse cx="32" cy="31" rx="16" ry="15" fill="#fff" ${S}/>
    <ellipse cx="25.5" cy="30" rx="4.5" ry="5.5" transform="rotate(20 25.5 30)" fill="${N}"/>
    <ellipse cx="38.5" cy="30" rx="4.5" ry="5.5" transform="rotate(-20 38.5 30)" fill="${N}"/>
    <circle cx="26" cy="29.5" r="1.5" fill="#fff"/><circle cx="38" cy="29.5" r="1.5" fill="#fff"/>
    <ellipse cx="32" cy="36" rx="2.4" ry="1.7" fill="${N}"/>${smile(32, 38.5, 2.4)}
    ${cheeks(21, 43, 37, "#f28bb5", .5)}`],
  conejo: ["Conejo", ["#f7c6d9", "#fdebf2"], () => `
    ${spark(12, 40, 3, "#fff")}${spark(53, 36, 2.5, "#fff")}
    <path d="M18 66 C18 54 24 48 32 48 C40 48 46 54 46 66 Z" fill="#8ad2fa" ${S}/>
    <path d="M22 26 C17 14 18 2 23 2 C28 2 29 14 28 24 Z" fill="#fff" ${S}/>
    <path d="M42 26 C47 14 46 2 41 2 C36 2 35 14 36 24 Z" fill="#fff" ${S}/>
    <path d="M23 8 C21 13 22 19 24.5 22 M41 8 C43 13 42 19 39.5 22" stroke="#f28bb5" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="32" cy="34" rx="14.5" ry="13" fill="#fff" ${S}/>
    ${eyes(26.5, 37.5, 32)}
    <path d="M30.6 37 L33.4 37 L32 38.6 Z" fill="#f28bb5" ${s1}/>
    <path d="M29 39.8 Q30.5 41.2 32 39.8 Q33.5 41.2 35 39.8" fill="none" ${s1}/>
    ${cheeks(22.5, 41.5, 37, "#f28bb5", .55)}
    <path d="M26 48.5 L32 51.5 L38 48.5 L38 54.5 L32 51.5 L26 54.5 Z" fill="#ef591c" ${s1}/>`],
  buho: ["Búho estudioso", ["#1351a4", "#3a77c9"], () => `
    ${spark(11, 14, 3, "#ffba03")}${spark(53, 12, 2.4, "#fff")}${dots("#fff", [[8, 34, 1], [56, 30, 1.2], [50, 52, .9]])}
    <path d="M15 44 C13 24 18 12 32 12 C46 12 51 24 49 44 C47 58 17 58 15 44 Z" fill="#c98e63" ${S}/>
    <path d="M16 18 L14 8 L24 13 M48 18 L50 8 L40 13" fill="#c98e63" ${S}/>
    <path d="M23 42 C23 36 41 36 41 42 C41 52 23 52 23 42 Z" fill="#f3dcc0" ${s1}/>
    <path d="M27 42 q2 2 4 0 M33 42 q2 2 4 0 M30 47 q2 2 4 0" fill="none" ${s1}/>
    <circle cx="25" cy="27" r="7" fill="#fff6e5" ${S}/><circle cx="39" cy="27" r="7" fill="#fff6e5" ${S}/>
    ${eyes(25, 39, 27.5, 2.6)}
    <circle cx="25" cy="27" r="7.8" fill="none" stroke="#ef591c" stroke-width="2"/><circle cx="39" cy="27" r="7.8" fill="none" stroke="#ef591c" stroke-width="2"/>
    <path d="M31 27 h2" stroke="#ef591c" stroke-width="2"/>
    <path d="M29.5 33 L34.5 33 L32 37 Z" fill="#ffba03" ${s1}/>
    <path d="M18 60 h28 l-3 -5 h-22 Z" fill="#ef591c" ${s1}/>`],
  ballena: ["Ballena", ["#8ad2fa", "#1351a4"], () => `
    <path d="M30 13 C28 7 24 6 22 8 M34 13 C36 7 40 6 42 8 M32 15 V6" stroke="#e1f3fd" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="22" cy="8" r="1.8" fill="#e1f3fd"/><circle cx="42" cy="8" r="1.8" fill="#e1f3fd"/><circle cx="32" cy="5" r="2" fill="#e1f3fd"/>
    <path d="M10 36 C10 22 20 16 32 16 C44 16 54 22 54 36 C54 48 44 54 32 54 C20 54 10 48 10 36 Z" fill="#4f8fe0" ${S}/>
    <path d="M14 42 C20 50 44 50 50 42 C48 51 40 54 32 54 C24 54 16 51 14 42 Z" fill="#e1f3fd" ${s1}/>
    <path d="M18 45 v4 M24 47 v5 M30 48 v5 M36 48 v5 M42 47 v5 M47 45 v4" stroke="#8ad2fa" stroke-width="1.4"/>
    ${eyes(24, 40, 33, 2.5)}${smile(32, 38, 4)}${cheeks(19, 45, 38, "#f28bb5", .55)}
    <path d="M2 60 Q10 56 18 60 T34 60 T50 60 T66 60" fill="none" stroke="#e1f3fd" stroke-width="2.4"/>`],
  abeja: ["Abeja", ["#ffe08a", "#fff6e5"], () => `
    <ellipse cx="18" cy="20" rx="8" ry="11" transform="rotate(-30 18 20)" fill="#e1f3fd" ${S}/>
    <ellipse cx="46" cy="20" rx="8" ry="11" transform="rotate(30 46 20)" fill="#e1f3fd" ${S}/>
    <path d="M25 13 C24 8 21 6 19 6 M39 13 C40 8 43 6 45 6" fill="none" ${S}/><circle cx="19" cy="6" r="2.2" fill="${N}"/><circle cx="45" cy="6" r="2.2" fill="${N}"/>
    <circle cx="32" cy="38" r="20" fill="#ffba03" ${S}/>
    <path d="M14 46 C24 50 40 50 50 46 L48 51 C40 55 24 55 16 51 Z M13.5 36 C24 32 40 32 50.5 36 L51.5 41 C40 37 24 37 12.5 41 Z" fill="${N}"/>
    ${eyes(25.5, 38.5, 28, 2.4)}${smile(32, 31, 3)}${cheeks(21.5, 42.5, 31.5)}`],
  paloma: ["Palomita", ["#e1f3fd", "#fff"], () => `
    <circle cx="32" cy="32" r="22" fill="#ffba03" opacity=".25"/>
    ${spark(12, 14, 3.5)}${spark(52, 50, 3)}${spark(50, 12, 2.2, "#ef591c")}
    <path d="M30 40 C20 40 10 34 6 24 C14 26 20 28 26 32 C20 24 18 16 20 10 C28 16 33 24 34 32 Z" fill="#fff" ${S}/>
    <path d="M24 40 C24 30 30 24 38 24 C46 24 50 30 50 36 C50 46 42 52 32 52 L20 58 L23 49 C20 46 24 44 24 40 Z" fill="#fff" ${S}/>
    <path d="M50 30 L57 32 L50 34.5 Z" fill="#ffba03" ${s1}/>
    ${eye(43, 30, 2)}${cheeks(41, 41, 35.5, "#f28bb5", .45)}
    <path d="M28 44 Q33 47 38 44" fill="none" stroke="#8ad2fa" stroke-width="2" stroke-linecap="round"/>`],
  dino: ["Dino", ["#9be3b0", "#d8f4e1"], () => `
    ${dots("#fff", [[10, 20, 1.6], [55, 44, 1.4]])}
    <path d="M24 14 L28 8 L31 14 L35 8 L38 15 L42 10 L44 18" fill="#ffba03" ${S}/>
    <path d="M16 66 C16 52 20 46 24 44 L22 30 C22 16 46 14 50 26 C53 34 50 42 42 44 C46 48 48 56 48 66 Z" fill="#4fbf74" ${S}/>
    <path d="M28 66 C28 58 30 52 36 50 C40 54 40 60 40 66 Z" fill="#d8f4e1" ${s1}/>
    ${eye(33, 26, 2.6)}${eye(44, 27, 2.2)}
    <path d="M30 37 Q40 41 48 35" fill="none" ${s1}/><path d="M36 38.5 v2.5 M41 38 v2.5" stroke="#fff" stroke-width="1.6"/>
    ${dots("#2e8a50", [[26, 46, 1.6], [22, 52, 1.3], [44, 54, 1.4], [27, 40, 1.2]])}`],
  astronauta: ["Astronauta", ["#0b2566", "#1351a4"], () => `
    ${spark(10, 14, 2.6, "#fff")}${spark(54, 20, 3, "#ffba03")}${dots("#fff", [[16, 40, 1], [50, 8, 1], [56, 40, 1.2], [8, 28, 1]])}
    <path d="M14 66 C14 52 22 46 32 46 C42 46 50 52 50 66 Z" fill="#fff" ${S}/>
    <rect x="26" y="52" width="12" height="8" rx="2" fill="#8ad2fa" ${s1}/><circle cx="29" cy="56" r="1.3" fill="#ef591c"/><circle cx="35" cy="56" r="1.3" fill="#ffba03"/>
    <circle cx="32" cy="29" r="18" fill="#fff" ${S}/>
    <rect x="18" y="20" width="28" height="20" rx="10" fill="#24375f" ${S}/>
    <path d="M22 26 C24 23 28 22 30 22" stroke="#8ad2fa" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${eyes(26.5, 37.5, 30.5, 2)}<path d="M29.5 34.5 Q32 36.5 34.5 34.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M44 14 L48 8" ${S}/><circle cx="48.5" cy="7.5" r="2.4" fill="#ef591c" ${s1}/>`],
  robot: ["Robot", ["#fde0d2", "#ffd0b8"], () => `
    ${spark(12, 18, 3)}${spark(53, 46, 2.6, "#1351a4")}
    <path d="M32 12 V6" ${S}/><circle cx="32" cy="5" r="3" fill="#ef591c" ${s1}/>
    <path d="M17 66 V54 Q17 48 23 48 H41 Q47 48 47 54 V66 Z" fill="#8ad2fa" ${S}/>
    <circle cx="32" cy="57" r="4" fill="#ffba03" ${s1}/><path d="M30.5 57 h3 M32 55.5 v3" stroke="${N}" stroke-width="1.4"/>
    <rect x="15" y="12" width="34" height="32" rx="9" fill="#c4d3e6" ${S}/>
    <rect x="11" y="23" width="5" height="10" rx="2.5" fill="#ef591c" ${s1}/><rect x="48" y="23" width="5" height="10" rx="2.5" fill="#ef591c" ${s1}/>
    <rect x="20" y="19" width="24" height="16" rx="6" fill="#24375f" ${s1}/>
    <circle cx="26.5" cy="26.5" r="3" fill="#8ad2fa"/><circle cx="37.5" cy="26.5" r="3" fill="#8ad2fa"/>
    <path d="M28 31 Q32 33.5 36 31" fill="none" stroke="#8ad2fa" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M22 39 h4 M30 39 h4 M38 39 h4" stroke="${N}" stroke-width="1.8" stroke-linecap="round"/>`],
  sol: ["Solcito", ["#ffba03", "#ffe08a"], () => `
    ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6, r1 = 19, r2 = i % 2 ? 26 : 29; return `<path d="M${(32 + r1 * Math.cos(a)).toFixed(1)} ${(32 + r1 * Math.sin(a)).toFixed(1)} L${(32 + r2 * Math.cos(a)).toFixed(1)} ${(32 + r2 * Math.sin(a)).toFixed(1)}" stroke="#ef591c" stroke-width="3" stroke-linecap="round"/>`; }).join("")}
    <circle cx="32" cy="32" r="16" fill="#ffd34d" ${S}/>
    <path d="M22 28 q3 -3 6 0 M36 28 q3 -3 6 0" fill="none" ${S}/>
    <path d="M25 35 Q32 43 39 35 Z" fill="#fff6e5" ${S}/>${cheeks(22, 42, 34, "#ef591c", .45)}`],
  cactus: ["Cactus", ["#fde0d2", "#fff6e5"], () => `
    ${spark(12, 14, 3)}${spark(52, 18, 2.4, "#ef591c")}
    <path d="M22 50 L42 50 L39 62 L25 62 Z" fill="#ef591c" ${S}/><rect x="20" y="46" width="24" height="6" rx="2" fill="#e8763a" ${S}/>
    <path d="M24 46 V24 C24 14 40 14 40 24 V46" fill="#4fbf74" ${S}/>
    <path d="M24 36 H18 C15 36 14 34 14 31 V26 C14 23 18 23 18 26 V31 H24 M40 32 H46 V22 C46 19 50 19 50 22 V30 C50 34 48 36 46 36 H40" fill="#4fbf74" ${S}/>
    <path d="M32 18 v2 M28 40 h-1.5 M37 42 h1.5" ${s1}/>
    ${eyes(28.5, 35.5, 28, 1.9)}${smile(32, 32, 2.4)}${cheeks(26, 38, 31.5, "#f28bb5", .55)}
    <circle cx="32" cy="14.5" r="3" fill="#f28bb5" ${s1}/><circle cx="32" cy="14.5" r="1" fill="#ffba03"/>`],
  taza: ["Tecito de once", ["#8ad2fa", "#e1f3fd"], () => `
    <path d="M24 16 C21 12 27 10 24 5 M32 16 C29 12 35 10 32 5 M40 16 C37 12 43 10 40 5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M45 28 C54 28 54 42 44 42" fill="none" stroke="${N}" stroke-width="6" stroke-linecap="round"/>
    <path d="M45 28 C54 28 54 42 44 42" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M14 22 H48 V40 C48 50 41 54 31 54 C21 54 14 50 14 40 Z" fill="#fff" ${S}/>
    <path d="M14 22 H48" stroke="#c98e63" stroke-width="5"/><path d="M14 22 H48" fill="none" ${S}/>
    ${eyes(25, 37, 34, 2.2)}${smile(31, 38.5, 3)}${cheeks(21, 41, 39, "#f28bb5", .55)}
    <path d="M8 58 H56" stroke="${N}" stroke-width="3" stroke-linecap="round"/><ellipse cx="31" cy="57" rx="20" ry="3" fill="#ffba03" ${s1}/>`],
  guitarra: ["Guitarrita", ["#ef591c", "#ff9a6a"], () => `
    ${spark(12, 50, 3, "#fff")}${spark(14, 14, 2.4, "#ffba03")}
    <path d="M50 8 L56 14 L52 18 L46 12 Z" fill="${N}"/><path d="M48 14 L34 28" stroke="${N}" stroke-width="5" stroke-linecap="round"/>
    <path d="M30 22 C26 18 18 18 15 23 C13 27 15 30 14 34 C10 38 9 46 14 51 C19 56 27 55 31 51 C35 47 34 50 38 46 C42 43 44 38 41 34 C37 30 34 26 30 22 Z" fill="#ffba03" ${S}/>
    <circle cx="27" cy="38" r="4.5" fill="#6b4226" ${s1}/>
    <path d="M45 15 L22 42 M47 17 L24 44" stroke="#fff6e5" stroke-width="1"/>
    ${eyes(19, 27, 29, 1.8)}<path d="M20 45 Q23 48 26 45" fill="none" ${s1}/>
    <path d="M52 34 v8 a2.5 2.5 0 1 1 -2 -2.4 M52 34 l5 2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`],
};
export const PJ_KEYS = Object.keys(PJ);

let uid = 0;
// Personajes con sticker propio (img/pj): se muestran como imagen sobre su círculo de color.
const PJ_IMG = new Set(["abeja", "astronauta", "ballena", "buho", "cactus", "conejo", "dino", "gato", "guitarra", "oso", "paloma", "panda", "pinguino", "pudu", "quiltro", "robot", "sol", "taza", "zorro"]);
export const pjImg = (id) => (PJ_IMG.has(id) ? `img/pj/${id}.webp` : "");
export function pjSvg(id) {
  const p = PJ[id]; if (!p) return "";
  const [, [c1, c2], draw] = p, g = "pj" + (++uid);
  if (PJ_IMG.has(id)) return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><circle cx="32" cy="32" r="30" fill="url(#${g})" stroke="#0b2566" stroke-width="2.5"/><image href="${pjImg(id)}" x="7" y="7" width="50" height="50" preserveAspectRatio="xMidYMid meet"/></svg>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><clipPath id="${g}c"><circle cx="32" cy="32" r="30"/></clipPath></defs>
    <circle cx="32" cy="32" r="30" fill="url(#${g})"/><g clip-path="url(#${g}c)">${draw()}</g>
    <circle cx="32" cy="32" r="30" fill="none" stroke="${N}" stroke-width="2.6"/></svg>`;
}
