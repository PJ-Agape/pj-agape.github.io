// Dibujos de las tarjetas de la lista de juegos. Viven aquí (y no en cada juego) para que la lista
// se muestre sin cargar el código de todos los juegos: cada juego se descarga recién al abrirlo.

export const frenteArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="40" r="16" fill="#1e1f3b"/>
  <rect x="17" y="6" width="30" height="20" rx="4" fill="#fff" stroke="#1e1f3b" stroke-width="3"/><path d="M24 16h16" stroke="#f4562a" stroke-width="4" stroke-linecap="round"/>
  <circle cx="26" cy="40" r="2.5" fill="#ffc93c"/><circle cx="38" cy="40" r="2.5" fill="#ffc93c"/><path d="M26 47c4 3 8 3 12 0" stroke="#ffc93c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
export const triviaArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="32" r="24" fill="#1e1f3b"/>
  <path d="M25 25a7 7 0 1 1 10 6.3c-2 1-3 2.3-3 4.7" stroke="#ffc93c" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="32" cy="45" r="3.2" fill="#ffc93c"/>
  <circle cx="52" cy="14" r="5" fill="#f4562a"/><circle cx="12" cy="50" r="4" fill="#9fd8ff"/></svg>`;
export const ultimaArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="10" y="12" width="26" height="38" rx="5" fill="#3d6bf0" stroke="#1e1f3b" stroke-width="2.5" transform="rotate(-14 23 31)"/>
  <rect x="20" y="10" width="26" height="38" rx="5" fill="#ffc93c" stroke="#1e1f3b" stroke-width="2.5"/><rect x="30" y="13" width="26" height="38" rx="5" fill="#f4562a" stroke="#1e1f3b" stroke-width="2.5" transform="rotate(14 43 32)"/>
  <ellipse cx="43" cy="32" rx="7" ry="10" fill="#fff" transform="rotate(14 43 32)"/><text x="43" y="37" font-size="13" font-weight="800" text-anchor="middle" fill="#f4562a" font-family="sans-serif" transform="rotate(14 43 32)">1</text></svg>`;
export const memArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="6" y="10" width="24" height="32" rx="5" fill="#3d6bf0" stroke="#1e1f3b" stroke-width="2.5" transform="rotate(-10 18 26)"/>
  <path d="M12 20 l8 12 M20 20 l-8 12" stroke="#ffc93c" stroke-width="2.5" transform="rotate(-10 18 26)"/>
  <rect x="32" y="20" width="24" height="32" rx="5" fill="#fff" stroke="#1e1f3b" stroke-width="2.5" transform="rotate(8 44 36)"/><circle cx="44" cy="35" r="7" fill="#f4562a" stroke="#1e1f3b" stroke-width="2" transform="rotate(8 44 36)"/>
  <path d="M40 34 q4 5 8 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
export const mjArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="8" y="22" width="22" height="28" rx="4" fill="#fbf8f3" stroke="#1e1f3b" stroke-width="2.5"/><rect x="5" y="25" width="22" height="28" rx="4" fill="#fff" stroke="#1e1f3b" stroke-width="2.5"/>
  <rect x="34" y="14" width="22" height="28" rx="4" fill="#fbf8f3" stroke="#1e1f3b" stroke-width="2.5"/><rect x="31" y="17" width="22" height="28" rx="4" fill="#fff" stroke="#1e1f3b" stroke-width="2.5"/>
  <circle cx="16" cy="39" r="6" fill="#f4562a"/><circle cx="42" cy="31" r="6" fill="#f4562a"/><path d="M22 18 q8 -10 16 -2" fill="none" stroke="#ffc93c" stroke-width="2.5" stroke-linecap="round"/></svg>`;
export const sopaArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="7" y="7" width="50" height="50" rx="8" fill="#fff" stroke="#1e1f3b" stroke-width="2.5"/>
  <rect x="12" y="25" width="40" height="13" rx="6.5" fill="#ffc93c" opacity=".85" transform="rotate(-8 32 32)"/>
  <g font-family="sans-serif" font-weight="800" font-size="10" fill="#1e1f3b" text-anchor="middle"><text x="18" y="20">F</text><text x="32" y="20">K</text><text x="46" y="20">P</text><text x="18" y="35">P</text><text x="32" y="34">A</text><text x="46" y="32">Z</text><text x="18" y="50">L</text><text x="32" y="50">O</text><text x="46" y="50">R</text></g></svg>`;
export const cwArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><g stroke="#1e1f3b" stroke-width="2.2">
  <rect x="8" y="22" width="12" height="12" fill="#fff"/><rect x="20" y="22" width="12" height="12" fill="#ffc93c"/><rect x="32" y="22" width="12" height="12" fill="#fff"/><rect x="44" y="22" width="12" height="12" fill="#fff"/>
  <rect x="20" y="10" width="12" height="12" fill="#fff"/><rect x="20" y="34" width="12" height="12" fill="#fff"/><rect x="20" y="46" width="12" height="12" fill="#fff"/><rect x="44" y="34" width="12" height="12" fill="#fff"/></g>
  <g font-family="sans-serif" font-weight="800" font-size="9" fill="#1e1f3b" text-anchor="middle"><text x="26" y="31">A</text><text x="14" y="31">P</text><text x="38" y="31">Z</text><text x="26" y="43">M</text></g></svg>`;
export const emausArt = () => `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="M4 58 Q24 40 32 30 T60 8" fill="none" stroke="#f3dfb3" stroke-width="10" stroke-linecap="round"/>
  <path d="M4 58 Q24 40 32 30 T60 8" fill="none" stroke="#1e1f3b" stroke-width="2" stroke-dasharray="3 5"/><circle cx="52" cy="12" r="7" fill="#ffc93c" stroke="#1e1f3b" stroke-width="2"/>
  <circle cx="20" cy="40" r="5" fill="#f2c9a0" stroke="#1e1f3b" stroke-width="2"/><rect x="15" y="45" width="10" height="9" rx="3" fill="#f4562a" stroke="#1e1f3b" stroke-width="2"/>
  <circle cx="31" cy="34" r="5" fill="#d7a77c" stroke="#1e1f3b" stroke-width="2"/><path d="M25 50 L31 39 L37 50 Z" fill="#f3efe6" stroke="#1e1f3b" stroke-width="2"/></svg>`;
