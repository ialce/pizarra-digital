// Retratos pixel-art por piezas (32 × 32). Un mismo dibujo sirve para el juego (diálogos) y para el álbum de Personajes.
// Se describe a cada personaje con piezas (piel, pelo, barba, tocado, ropa…) y sale un SVG nítido a cualquier tamaño.
// Probar combinaciones: node --experimental-strip-types scripts/retratos.ts  (deja revision/retratos.html)

export type Piel = 'clara' | 'media' | 'morena' | 'oscura';
export interface Retrato {
  piel?: Piel | string;
  pelo?: string;                                                       // color
  peinado?: 'corto' | 'largo' | 'rapado' | 'calvo' | 'mono' | 'raya';  // «mono»: recogido detrás; «raya»: corto con raya (siglo XX)
  barba?: 'no' | 'corta' | 'larga' | 'bigote';                          // «larga»: barba sumeria en tirabuzones
  tocado?: 'no' | 'sombrero' | 'cinta' | 'gorro' | 'cuernos' | 'tiara' | 'velo' | 'nemes' | 'peluca';
  // «cuernos»: tiara de cuernos de los dioses mesopotámicos; «tiara»: diadema de oro; «velo»: pañuelo sobre el pelo;
  // «nemes»: tocado a rayas de faraón (y Esfinge); «peluca»: peluca egipcia negra cortada a la altura de la mandíbula
  ropa?: string; ribete?: string;
  escote?: 'redondo' | 'hombro' | 'chaqueta';                          // «hombro»: túnica sobre un solo hombro; «chaqueta»: americana y camisa
  extra?: ('collar' | 'gafas' | 'estrella' | 'pendientes' | 'calamo')[];
  ojos?: string;
  gesto?: 'serio' | 'sonrisa';
  fondo?: string;
}

const PIEL: Record<Piel, string> = { clara: '#E9BE98', media: '#D19A6E', morena: '#B07A4E', oscura: '#7E5234' };
const W = 32;

function hex(c: string): [number, number, number] {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const aHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
/** Aclara (f > 0) u oscurece (f < 0) un color. */
export function tono(c: string, f: number) {
  const [r, g, b] = hex(c);
  return f >= 0 ? aHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f) : aHex(r * (1 + f), g * (1 + f), b * (1 + f));
}

/** Devuelve la rejilla de colores (null = fondo). */
export function rejillaRetrato(s: Retrato): (string | null)[][] {
  const g: (string | null)[][] = Array.from({ length: W }, () => Array(W).fill(null));
  const put = (x: number, y: number, c: string) => { if (x >= 0 && y >= 0 && x < W && y < W) g[y][x] = c; };
  const ell = (cx: number, cy: number, rx: number, ry: number, x: number, y: number) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const area = (f: (x: number, y: number) => boolean, c: string | ((x: number, y: number) => string)) => {
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (f(x, y)) put(x, y, typeof c === 'string' ? c : c(x, y));
  };
  const piel = PIEL[s.piel as Piel] ?? s.piel ?? PIEL.media;
  const pS = tono(piel, -0.18), pL = tono(piel, 0.18);
  const pelo = s.pelo ?? '#2A1C14', peloS = tono(pelo, -0.3), peloL = tono(pelo, 0.22);
  const ropa = s.ropa ?? '#D9CDB0', ropaS = tono(ropa, -0.2), ropaL = tono(ropa, 0.15), ribete = s.ribete ?? tono(ropa, -0.35);
  const peinado = s.peinado ?? 'corto', barba = s.barba ?? 'no', tocado = s.tocado ?? 'no', extra = s.extra ?? [];
  const oro = '#E2B53A', oroS = '#A9801F';

  // Pelo largo por detrás (antes que la cara)
  if (peinado === 'largo') area((x, y) => y >= 8 && y <= 26 && ell(16, 15, 9, 12, x, y), (x) => (x < 12 || x > 20 ? peloS : pelo));
  if (tocado === 'velo') area((x, y) => y >= 5 && y <= 28 && ell(16, 16, 9.5, 13, x, y), (x) => (x < 11 ? tono(s.ribete ?? '#E8DCC0', -0.2) : s.ribete ?? '#E8DCC0'));

  // Ropa: hombros
  area((x, y) => y >= 25 && Math.abs(x + 0.5 - 16) <= 8 + (y - 25) * 1.6, (x, y) => (Math.abs(x + 0.5 - 16) > 6 + (y - 25) * 1.6 ? ropaS : y === 26 && x > 17 ? ropaL : ropa));
  if ((s.escote ?? 'redondo') === 'redondo') {
    area((x, y) => y >= 25 && y <= 26 && Math.abs(x + 0.5 - 16) <= 3 - (y - 25), piel);
    area((x, y) => (y === 25 && Math.abs(x + 0.5 - 16) > 3 && Math.abs(x + 0.5 - 16) <= 4) || (y === 26 && Math.abs(x + 0.5 - 16) > 2 && Math.abs(x + 0.5 - 16) <= 3) || (y === 27 && Math.abs(x + 0.5 - 16) <= 2), ribete);
  } else if (s.escote === 'hombro') {
    // un hombro al aire (el izquierdo de la imagen) y la tela cruzando en diagonal
    area((x, y) => y >= 25 && x < 16 - (y - 25) * 0.9 && Math.abs(x + 0.5 - 16) <= 8 + (y - 25) * 1.6, (x) => (x < 6 ? pS : piel));
    area((x, y) => y >= 25 && Math.abs(x - (16 - (y - 25) * 0.9)) < 1, ribete);
  } else if (s.escote === 'chaqueta') {
    area((x, y) => y >= 25 && Math.abs(x + 0.5 - 16) <= 2.2 - (y - 25) * 0.15 + (y - 25) * 0.5, '#EEE8DA'); // camisa
    area((x, y) => y >= 26 && Math.abs(x + 0.5 - 16) < 0.8, '#7A2A22');                                // corbata
    area((x, y) => y >= 25 && Math.abs(Math.abs(x + 0.5 - 16) - (2.6 + (y - 25) * 0.5)) < 0.6, ropaS);  // solapas
  }
  // Cuello
  area((x, y) => y >= 20 && y <= 25 && x >= 13 && x <= 18, (x, y) => (y <= 21 || x === 13 ? pS : piel));
  // Orejas y cabeza
  for (const cx of [9.6, 22.4]) area((x, y) => ell(cx, 14.6, 1.5, 2.4, x, y), pS);
  area((x, y) => ell(16, 13.5, 6.6, 8.2, x, y), (x, y) => (x <= 10 || y >= 20 ? pS : x >= 19 && y <= 11 ? pL : piel));
  // Ojos, cejas, nariz y boca
  const ojos = s.ojos ?? '#24160E';
  for (const ox of [13, 19]) { put(ox, 14, ojos); put(ox + (ox < 16 ? -1 : 1), 14, '#F1EADB'); put(ox, 12, peloS); put(ox + (ox < 16 ? -1 : 1), 12, peloS); }
  put(16, 15, pS); put(16, 16, pS); put(17, 16, tono(piel, -0.28));
  const boca = tono(piel, -0.4);
  if (s.gesto === 'sonrisa') { put(14, 18, boca); put(15, 19, boca); put(16, 19, boca); put(17, 19, boca); put(18, 18, boca); }
  else { put(15, 19, boca); put(16, 19, boca); put(17, 19, boca); }

  // Pelo
  if (peinado === 'corto' || peinado === 'largo' || peinado === 'mono' || peinado === 'raya')
    area((x, y) => ell(16, 11.5, 7.2, 7.4, x, y) && (y <= 8 || (y <= 12 && (x <= 10 || x >= 21))), (x, y) => (y <= 6 && x >= 15 ? peloL : x <= 10 ? peloS : pelo));
  if (peinado === 'raya') { for (let y = 5; y <= 8; y++) put(12, y, peloS); area((x, y) => y === 9 && x >= 13 && x <= 20, pelo); }
  if (peinado === 'mono') area((x, y) => ell(16, 4.2, 4.2, 2.6, x, y), (x, y) => (y <= 3 && x >= 16 ? peloL : x < 14 ? peloS : pelo));
  if (peinado === 'rapado') area((x, y) => ell(16, 11.5, 7, 7.4, x, y) && y <= 7, tono(piel, -0.32));
  // Barba
  if (barba === 'corta') area((x, y) => ell(16, 13.5, 6.8, 8.6, x, y) && y >= 17 && !(y === 19 && x >= 15 && x <= 17) && !(y <= 18 && x >= 13 && x <= 19), (x) => (x <= 11 ? peloS : pelo));
  if (barba === 'larga') {
    area((x, y) => (ell(16, 13.5, 6.8, 8.6, x, y) && y >= 17 && !(y <= 18 && x >= 13 && x <= 19) && !(y === 19 && x >= 15 && x <= 17)) || (y >= 21 && y <= 27 && Math.abs(x + 0.5 - 16) <= 5.5 - (y - 21) * 0.45),
      (x, y) => (y >= 20 && (y % 2 === 0) ? peloS : x <= 11 ? peloS : pelo));
  }
  if (barba === 'bigote' || barba === 'corta' || barba === 'larga') area((x, y) => y === 18 && x >= 14 && x <= 18, peloS);

  // Tocados
  if (tocado === 'sombrero') {
    const c = s.ribete && s.escote === 'chaqueta' ? '#3A2A20' : '#5A3E28', cS = tono(c, -0.3);
    area((x, y) => y === 7 && x >= 5 && x <= 26, cS);
    area((x, y) => y === 6 && x >= 6 && x <= 25, c);
    area((x, y) => y >= 1 && y <= 5 && x >= 10 && x <= 21 && !(y === 1 && (x === 10 || x === 21)), (x, y) => (y === 5 ? '#9C2A1C' : x <= 12 ? cS : c));
    area((x, y) => y === 2 && x >= 14 && x <= 17, cS); // abolladura de la copa
  }
  if (tocado === 'cinta') area((x, y) => y === 8 && x >= 9 && x <= 22, s.ribete ?? '#C41F12');
  if (tocado === 'gorro') area((x, y) => ell(16, 8.2, 7.3, 4.6, x, y) && y <= 8, (x, y) => (y === 8 ? tono(s.ribete ?? '#8A5A3A', -0.2) : x <= 11 ? tono(s.ribete ?? '#8A5A3A', -0.15) : s.ribete ?? '#8A5A3A'));
  if (tocado === 'tiara') { area((x, y) => y === 7 && x >= 9 && x <= 22, oro); for (const x of [11, 16, 21]) { put(x, 6, oro); } put(16, 5, oro); }
  if (tocado === 'cuernos') {
    // gorro alto con varios pares de cuernos superpuestos, la marca de los dioses
    area((x, y) => y >= 0 && y <= 8 && Math.abs(x + 0.5 - 16) <= 5.5 - y * 0.15 + (y > 6 ? 1 : 0), (x) => (x <= 12 ? oroS : oro));
    for (const y of [2, 5, 8]) area((xx, yy) => yy === y && Math.abs(xx + 0.5 - 16) <= 7 - (y === 8 ? -0.5 : 0) && Math.abs(xx + 0.5 - 16) >= 3, '#F4E7C4');
    for (const y of [1, 4, 7]) { put(16 - 7 + (y === 7 ? 0 : 1), y, '#F4E7C4'); put(16 + 6 - (y === 7 ? 0 : 1), y, '#F4E7C4'); }
  }
  if (tocado === 'peluca') {
    area((x, y) => (ell(16, 12, 8.4, 8.6, x, y) && (y <= 9 || x <= 10 || x >= 21)) && y <= 20, (x, y) => (x <= 10 ? '#141018' : y % 3 === 0 ? '#2A2430' : '#1E1A22'));
    area((x, y) => y === 9 && x >= 10 && x <= 21, '#141018');
  }
  if (tocado === 'nemes') {
    const az = s.ribete ?? '#2F5E9C';
    area((x, y) => (ell(16, 11, 8.6, 8.4, x, y) && (y <= 9 || x <= 9 || x >= 22)) || (y >= 12 && y <= 25 && ((x >= 7 && x <= 10) || (x >= 21 && x <= 24))), (x, y) => (y % 2 === 0 ? az : oro));
    area((x, y) => y === 8 && x >= 9 && x <= 22, oro);
    put(16, 7, '#C41F12'); put(16, 6, oro); // la cobra (ureo)
  }
  // Extras
  if (extra.includes('gafas')) {
    for (const [x0, x1] of [[11, 14], [18, 21]]) { area((x, y) => (y === 13 || y === 15) && x >= x0 && x <= x1, '#1E1A16'); put(x0 - 1, 14, '#1E1A16'); put(x1 + 1, 14, '#1E1A16'); }
    put(16, 14, '#1E1A16'); put(15, 14, '#1E1A16');
    for (const ox of [13, 19]) { put(ox, 14, ojos); put(ox + (ox < 16 ? -1 : 1), 14, '#F1EADB'); }
  }
  if (extra.includes('collar')) area((x, y) => y === 26 && Math.abs(x + 0.5 - 16) <= 4 && x % 2 === 0, oro);
  if (extra.includes('pendientes')) { put(9, 17, oro); put(22, 17, oro); }
  if (extra.includes('calamo')) area((x, y) => x - y === -2 && y >= 23 && y <= 31 && x >= 21, '#C9A26A');
  if (extra.includes('estrella')) {
    // estrella de ocho puntas de Inanna, al lado de la cabeza
    const [cx, cy] = [27, 5];
    for (let k = -3; k <= 3; k++) { put(cx + k, cy, oro); put(cx, cy + k, oro); }
    for (let k = -2; k <= 2; k++) { put(cx + k, cy + k, oro); put(cx + k, cy - k, oro); }
  }
  return g;
}

/** SVG nítido del retrato. `silueta`: solo la sombra (cromo sin conseguir). */
export function retratoSVG(s: Retrato, opciones: { tam?: number; silueta?: boolean; marco?: boolean; titulo?: string } = {}) {
  const g = rejillaRetrato(s);
  const fondo = s.fondo ?? '#E8D8B4';
  const borde = tono(opciones.silueta ? '#3A3028' : fondo, -0.62);
  // contorno de 1 píxel alrededor de la figura
  const c: (string | null)[][] = g.map(f => f.slice());
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx])) c[y][x] = borde;
  let rects = '';
  for (let y = 0; y < W; y++) {
    let x = 0;
    while (x < W) {
      const col = c[y][x]; let n = 1;
      while (x + n < W && c[y][x + n] === col) n++;
      if (col) rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${opciones.silueta && col !== borde ? '#3A3028' : col}"/>`;
      x += n;
    }
  }
  const tam = opciones.tam ?? 96;
  const fondoSVG = opciones.silueta ? '#CFC4AE' : fondo;
  const marco = opciones.marco ? `<rect x="0.5" y="0.5" width="31" height="31" fill="none" stroke="${tono(fondoSVG, -0.5)}" stroke-width="1"/>` : '';
  const t = opciones.titulo ? `<title>${opciones.titulo.replace(/[<&"]/g, '')}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${tam}" height="${tam}" shape-rendering="crispEdges" role="img"${opciones.titulo ? '' : ' aria-hidden="true"'}>${t}<rect width="32" height="32" fill="${fondoSVG}"/>${rects}${marco}</svg>`;
}

/** El corresponsal de La Hemeroteca: sombrero, gabardina y libreta. */
export const CORRESPONSAL: Retrato = { piel: 'media', pelo: '#3A2618', peinado: 'corto', barba: 'no', tocado: 'sombrero', ropa: '#B49A6A', ribete: '#8C7246', escote: 'redondo', gesto: 'sonrisa', fondo: '#E6D3A8' };
