// Convierte un plano exportado de OpenStreetMap (referencias/pizarra.osm) en los datos de la maqueta
// (src/pizarra/pueblo.json): calles, zonas, árboles y edificios.
// En Pizarra, OpenStreetMap casi no tiene edificios dibujados, así que las casas se generan a lo largo de las calles
// (fachadas a los dos lados, con su acera), siempre igual gracias a una semilla fija.
// Junta todos los .osm de referencias/ (se pueden exportar a trozos) o los que se le pasen.
// Uso: npm run osm  [-- a.osm b.osm]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const entradas = process.argv.length > 2 ? process.argv.slice(2) : readdirSync('referencias').filter(f => f.endsWith('.osm')).sort().map(f => `referencias/${f}`);
const xmls = entradas.map(f => readFileSync(f, 'utf8'));
const xml = xmls.join('\n');
// Sitios que tienen que entrar en la maqueta aunque OSM no los tenga (coordenadas que dio Iván)
const FIJOS = { 'el-santo': { lat: 36.770116, lon: -4.696597, nombre: 'El Santo' } };

// ---------- Lectura sencilla del XML de OSM ----------
const atributos = s => Object.fromEntries([...s.matchAll(/(\w[\w:]*)="([^"]*)"/g)].map(m => [m[1], m[2]]));
const etiquetas = cuerpo => Object.fromEntries([...cuerpo.matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g)].map(m => [m[1], m[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')]));
const b = { minlat: Infinity, minlon: Infinity, maxlat: -Infinity, maxlon: -Infinity };
for (const m of xml.matchAll(/<bounds [^>]*>/g)) { const a = atributos(m[0]); b.minlat = Math.min(b.minlat, +a.minlat); b.minlon = Math.min(b.minlon, +a.minlon); b.maxlat = Math.max(b.maxlat, +a.maxlat); b.maxlon = Math.max(b.maxlon, +a.maxlon); }
const lat0 = (+b.minlat + +b.maxlat) / 2, lon0 = (+b.minlon + +b.maxlon) / 2;
const KX = 111320 * Math.cos(lat0 * Math.PI / 180), KZ = 110540;
const proyectar = (lat, lon) => [+((lon - lon0) * KX).toFixed(2), +(-(lat - lat0) * KZ).toFixed(2)];

const nodos = new Map(), nodosConEtiquetas = [];
for (const m of xml.matchAll(/<node ([^>]*?)(\/>|>([\s\S]*?)<\/node>)/g)) {
  const a = atributos(m[1]); const p = proyectar(+a.lat, +a.lon); nodos.set(a.id, p);
  if (m[3] && !nodos.has('t' + a.id)) { nodos.set('t' + a.id, 1); nodosConEtiquetas.push({ p, t: etiquetas(m[3]) }); }
}
const vias = [], viasVistas = new Set();
for (const m of xml.matchAll(/<way ([^>]*)>([\s\S]*?)<\/way>/g)) {
  const idVia = atributos(m[1]).id; if (viasVistas.has(idVia)) continue; viasVistas.add(idVia);
  const puntos = [...m[2].matchAll(/<nd ref="(\d+)"\/>/g)].map(n => nodos.get(n[1])).filter(Boolean);
  vias.push({ id: atributos(m[1]).id, puntos, t: etiquetas(m[2]) });
}

const [x0, z1] = proyectar(+b.minlat, +b.minlon), [x1, z0] = proyectar(+b.maxlat, +b.maxlon);
const limites = { x0: Math.ceil(x0), x1: Math.floor(x1), z0: Math.ceil(z0), z1: Math.floor(z1) };

// ---------- Calles ----------
const ANCHO = { motorway: 12, trunk: 10, primary: 9, secondary: 9, tertiary: 8, unclassified: 6, residential: 6, living_street: 5, service: 4, pedestrian: 6, footway: 2.5, path: 2, track: 3.5, steps: 2.5, cycleway: 2.5 };
const TIPO = { secondary: 'carretera', primary: 'carretera', trunk: 'carretera', tertiary: 'calle', unclassified: 'calle', residential: 'calle', living_street: 'calle', service: 'calle', pedestrian: 'peatonal', footway: 'peatonal', steps: 'escalera', path: 'camino', track: 'camino', cycleway: 'peatonal' };
const calles = [];
for (const v of vias) {
  const h = v.t.highway; if (!h || !ANCHO[h] || v.puntos.length < 2) continue;
  if (v.t.area === 'yes') continue;
  calles.push({ puntos: v.puntos, ancho: +(v.t.width ?? ANCHO[h]), tipo: TIPO[h], via: h, ...(v.t.name ? { nombre: v.t.name } : {}) });
}

// ---------- Zonas, agua, vía del tren y árboles ----------
const zonas = [], arboles = [], vias_tren = [];
const cerrada = p => p.length > 3 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1];
for (const v of vias) {
  const t = v.t;
  if (cerrada(v.puntos)) {
    const p = v.puntos.slice(0, -1);
    if (t.leisure === 'pitch' || t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'grass' || t.landuse === 'recreation_ground') zonas.push({ puntos: p, tipo: 'verde' });
    else if (t.landuse === 'orchard' || t.landuse === 'farmland' || t.landuse === 'meadow') zonas.push({ puntos: p, tipo: 'campo' });
    else if (t.amenity === 'parking') zonas.push({ puntos: p, tipo: 'aparcamiento' });
    else if (t.natural === 'water' || t.waterway === 'riverbank') zonas.push({ puntos: p, tipo: 'agua' });
    else if (t.highway === 'pedestrian' || t.place === 'square') zonas.push({ puntos: p, tipo: 'plaza' });
  }
  if (t.waterway === 'river' || t.waterway === 'canal' || t.waterway === 'stream') vias_tren.push({ agua: true, puntos: v.puntos, ancho: t.waterway === 'river' ? 22 : t.waterway === 'canal' ? 4 : 2.5 });
  if (t.railway === 'rail') vias_tren.push({ puntos: v.puntos, ancho: 4 });
  if (t.natural === 'tree_row') for (let i = 0; i < v.puntos.length - 1; i++) {
    const [ax, az] = v.puntos[i], [bx, bz] = v.puntos[i + 1], l = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < l; s += 7) arboles.push([+(ax + (bx - ax) * s / l).toFixed(1), +(az + (bz - az) * s / l).toFixed(1)]);
  }
}
for (const n of nodosConEtiquetas) if (n.t.natural === 'tree') arboles.push(n.p);
// Ríos y canales: cintas de agua convertidas en polígonos (un polígono por tramo)
const tramo = ([ax, az], [bx, bz], w) => { const l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l * w / 2, nz = (bx - ax) / l * w / 2; return [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]].map(p => p.map(n => +n.toFixed(2))); };
const tren = [];
for (const v of vias_tren) for (let i = 0; i < v.puntos.length - 1; i++) {
  if (v.agua) zonas.push({ puntos: tramo(v.puntos[i], v.puntos[i + 1], v.ancho * 1.04), tipo: 'agua' });
}
for (const v of vias_tren) if (!v.agua) tren.push({ puntos: v.puntos });

// ---------- Edificios: los de OSM y los generados a lo largo de las calles ----------
const edificios = [];
for (const v of vias) if (v.t.building && cerrada(v.puntos)) edificios.push({ osm: true, puntos: v.puntos.slice(0, -1), alto: v.t['building:levels'] ? +v.t['building:levels'] * 3.4 : 6, tipo: v.t.amenity === 'place_of_worship' ? 'iglesia' : v.t.building === 'yes' || v.t.building === 'house' ? 'casa' : 'publico', ...(v.t.name ? { nombre: v.t.name } : {}) });

// Rejilla de ocupación de 1 m: calles (con acera), agua, zonas y edificios ya puestos
const W = limites.x1 - limites.x0, H = limites.z1 - limites.z0;
const ocupado = new Uint8Array(W * H);
const marcarDisco = (x, z, r) => {
  for (let j = Math.floor(z - r - limites.z0); j <= Math.ceil(z + r - limites.z0); j++) for (let i = Math.floor(x - r - limites.x0); i <= Math.ceil(x + r - limites.x0); i++)
    if (i >= 0 && j >= 0 && i < W && j < H && (i + limites.x0 + 0.5 - x) ** 2 + (j + limites.z0 + 0.5 - z) ** 2 <= r * r) ocupado[j * W + i] = 1;
};
const marcarLinea = (p, r) => { for (let k = 0; k < p.length - 1; k++) { const [ax, az] = p[k], [bx, bz] = p[k + 1], l = Math.hypot(bx - ax, bz - az); for (let s = 0; s <= l; s += 0.7) marcarDisco(ax + (bx - ax) * s / l, az + (bz - az) * s / l, r); } };
const dentro = (p, x, z) => { let d = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d; } return d; };
const marcarPoligono = p => { let a = Infinity, bb = -Infinity, c = Infinity, d = -Infinity; for (const [x, z] of p) { a = Math.min(a, x); bb = Math.max(bb, x); c = Math.min(c, z); d = Math.max(d, z); } for (let z = Math.floor(c); z <= d; z++) for (let x = Math.floor(a); x <= bb; x++) if (dentro(p, x + 0.5, z + 0.5)) { const i = x - limites.x0, j = z - limites.z0; if (i >= 0 && j >= 0 && i < W && j < H) ocupado[j * W + i] = 1; } };
for (const c of calles) marcarLinea(c.puntos, c.ancho / 2 + (c.tipo === 'camino' ? 0.6 : 1.4));
for (const v of vias_tren) marcarLinea(v.puntos, v.ancho / 2 + 2);
for (const z of zonas) marcarPoligono(z.puntos);
for (const e of edificios) marcarPoligono(e.puntos);
for (const [x, z] of arboles) marcarDisco(x, z, 1.2);
const libre = (x, z) => { const i = Math.floor(x - limites.x0), j = Math.floor(z - limites.z0); return i >= 0 && j >= 0 && i < W && j < H && !ocupado[j * W + i]; };

let semilla = 20261008;
const azar = () => ((semilla = (semilla * 1664525 + 1013904223) >>> 0) / 4294967296);
// Las casas se ponen solo junto a calles del pueblo (no junto a carreteras de fuera, caminos ni senderos)
const CON_CASAS = new Set(['residential', 'living_street', 'unclassified', 'service']);
for (const c of calles) {
  if (!CON_CASAS.has(c.via)) continue;
  for (let k = 0; k < c.puntos.length - 1; k++) {
    const [ax, az] = c.puntos[k], [bx, bz] = c.puntos[k + 1], l = Math.hypot(bx - ax, bz - az); if (l < 6) continue;
    const ux = (bx - ax) / l, uz = (bz - az) / l;
    for (const lado of [-1, 1]) {
      const nx = -uz * lado, nz = ux * lado, retiro = c.ancho / 2 + 1.5;
      let s = 1.5;
      while (s < l - 3) {
        const w = 5 + Math.floor(azar() * 4), d = 8 + Math.floor(azar() * 5);
        if (s + w > l - 1.5) break;
        // esquinas de la parcela: frente a lo largo de la calle, fondo hacia dentro
        const fx = ax + ux * s + nx * retiro, fz = az + uz * s + nz * retiro;
        const p = [[fx, fz], [fx + ux * w, fz + uz * w], [fx + ux * w + nx * d, fz + uz * w + nz * d], [fx + nx * d, fz + nz * d]];
        let ok = true;
        for (let a = 0.3; a <= w - 0.3 && ok; a += 0.9) for (let e = 0.3; e <= d - 0.3; e += 0.9) if (!libre(fx + ux * a + nx * e, fz + uz * a + nz * e)) { ok = false; break; }
        if (ok) {
          // a veces una casa más baja o con el fondo más corto, para que la manzana no sea un bloque
          const plantas = azar() < 0.6 ? 2 : 1;
          edificios.push({ puntos: p.map(q => q.map(n => +n.toFixed(2))), alto: +(plantas * 2.9 + azar() * 0.4).toFixed(1), tipo: 'casa' });
          for (let a = -0.2; a <= w + 0.2; a += 0.6) for (let e = -0.2; e <= d + 0.6; e += 0.6) { const x = fx + ux * a + nx * e, z = fz + uz * a + nz * e, i = Math.floor(x - limites.x0), j = Math.floor(z - limites.z0); if (i >= 0 && j >= 0 && i < W && j < H) ocupado[j * W + i] = 1; }
          s += w;
        } else s += 1.5;
      }
    }
  }
}

// ---------- Lugares con nombre (para colocar paradas) ----------
const lugares = {};
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
for (const n of nodosConEtiquetas) if (n.t.name && (n.t.amenity || n.t.shop || n.t.tourism || n.t.railway === 'station' || n.t.place)) lugares[slug(n.t.name)] = { x: n.p[0], z: n.p[1], nombre: n.t.name };
for (const c of calles) if (c.nombre) { const m = c.puntos[Math.floor(c.puntos.length / 2)]; lugares[slug(c.nombre)] ??= { x: m[0], z: m[1], nombre: c.nombre }; }

// Fuera las casas sueltas a lo largo de caminos de fuera del pueblo: cada casa necesita vecinas a menos de 60 m
{
  const c = edificios.map(e => e.puntos.reduce((a, [x, z]) => [a[0] + x / e.puntos.length, a[1] + z / e.puntos.length], [0, 0]));
  const quedan = edificios.filter((e, i) => e.osm || c.filter(([x, z]) => Math.abs(x - c[i][0]) < 60 && Math.abs(z - c[i][1]) < 60).length >= 25);
  edificios.length = 0; edificios.push(...quedan);
}
// Recorte: el pueblo y 50 m alrededor (fuera queda la vega, que no se juega)
{
  let a = Infinity, bb = -Infinity, c = Infinity, d = -Infinity;
  for (const e of edificios) for (const [x, z] of e.puntos) { a = Math.min(a, x); bb = Math.max(bb, x); c = Math.min(c, z); d = Math.max(d, z); }
  for (const f of Object.values(FIJOS)) { const [x, z] = proyectar(f.lat, f.lon); a = Math.min(a, x); bb = Math.max(bb, x); c = Math.min(c, z); d = Math.max(d, z); }
  Object.assign(limites, { x0: Math.max(limites.x0, Math.floor(a - 50)), x1: Math.min(limites.x1, Math.ceil(bb + 50)), z0: Math.max(limites.z0, Math.floor(c - 50)), z1: Math.min(limites.z1, Math.ceil(d + 50)) });
}
const cerca = p => p.some(([x, z]) => x > limites.x0 - 80 && x < limites.x1 + 80 && z > limites.z0 - 80 && z < limites.z1 + 80);
for (const c of calles) delete c.via;
for (const e of edificios) delete e.osm;
for (const [k, f] of Object.entries(FIJOS)) { const [x, z] = proyectar(f.lat, f.lon); lugares[k] = { x, z, nombre: f.nombre }; }
const entrada = entradas.join(', ');
const salida = { fuente: `OpenStreetMap (ODbL), ${entrada}`, centro: { lat: +lat0.toFixed(6), lon: +lon0.toFixed(6) }, limites, calles: calles.filter(c => cerca(c.puntos)), tren: tren.filter(t => cerca(t.puntos)), edificios, zonas: zonas.filter(z => cerca(z.puntos)), arboles, lugares };
writeFileSync('src/pizarra/pueblo.json', JSON.stringify(salida));
console.log(`Limites ${W} × ${H} m · ${calles.length} calles · ${edificios.length} edificios (${edificios.filter(e => e.tipo === 'casa').length} casas generadas o de OSM) · ${zonas.length} zonas · ${arboles.length} árboles · ${Object.keys(lugares).length} lugares`);
