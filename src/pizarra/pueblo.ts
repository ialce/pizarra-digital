// La maqueta del pueblo a partir de datos sencillos: calles, edificios y zonas (sacados de OpenStreetMap con
// `npm run osm`, o los provisionales de `provisional.ts`). De aquí salen la escena 3D, lo que se puede andar y el minimapa.
// Coordenadas en metros: x hacia el este, z hacia el sur (norte = −z), con el (0, 0) en el centro del plano.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, caja, azar } from '../juego/pixel';
import type { Escenario, Mascara } from '../juego/juego';

export type P2 = [number, number];
export interface Calle { puntos: P2[]; ancho: number; tipo?: 'calle' | 'carretera' | 'peatonal' | 'camino' | 'escalera' }
export interface Edificio { puntos: P2[]; alto: number; tipo?: 'casa' | 'iglesia' | 'publico' | 'ermita'; nombre?: string }
export interface Zona { puntos: P2[]; tipo: 'verde' | 'plaza' | 'campo' | 'agua' | 'aparcamiento' }
export interface Pueblo {
  limites: { x0: number; x1: number; z0: number; z1: number };
  calles: Calle[]; edificios: Edificio[]; zonas: Zona[]; arboles?: P2[]; tren?: { puntos: P2[] }[];
  /** Sitios con nombre (para colocar paradas y personajes). */
  lugares?: Record<string, { x: number; z: number; nombre: string }>;
}

export const COLOR = {
  campo: '#C9B47E', campoOscuro: '#B49D66', calle: '#8E8A83', carretera: '#6F6C68', peatonal: '#D9CDB4', camino: '#BFA67A',
  verde: '#7E9A4A', plaza: '#E2D6BE', agua: '#5F93A8', aparcamiento: '#9E9A92',
  cal: '#F4F0E6', calSombra: '#E4DED0', zocalo: '#9C7A54', teja: '#B5563A', tejaOscura: '#954530', azotea: '#E9E3D6',
  piedra: '#D8C7A2', hoja: '#5E7C33', hojaOscura: '#4F6B2B', tronco: '#6B4A2E', oro: '#E8B83A',
};

const sinIndice = (g: THREE.BufferGeometry) => (g.index ? g.toNonIndexed() : g);
const forma = (puntos: P2[]) => new THREE.Shape(puntos.map(([x, z]) => new THREE.Vector2(x, -z)));
/** Prisma vertical de la planta `puntos`, de y0 a y0 + alto. */
function prisma(puntos: P2[], alto: number, y0 = 0) {
  const g = new THREE.ExtrudeGeometry(forma(puntos), { depth: alto, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  return sinIndice(g);
}
/** Superficie plana a la altura y. */
function suelo(puntos: P2[], y: number) {
  const g = new THREE.ShapeGeometry(forma(puntos)); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
  return sinIndice(g);
}
/** Cinta de una calle (tramos rectos con juntas redondas). */
function cinta(puntos: P2[], ancho: number, y: number) {
  const partes: THREE.BufferGeometry[] = [], r = ancho / 2;
  for (let i = 0; i < puntos.length - 1; i++) {
    const [ax, az] = puntos[i], [bx, bz] = puntos[i + 1], l = Math.hypot(bx - ax, bz - az); if (l < 0.01) continue;
    const g = new THREE.PlaneGeometry(l, ancho); g.rotateX(-Math.PI / 2); g.rotateY(-Math.atan2(bz - az, bx - ax)); g.translate((ax + bx) / 2, y, (az + bz) / 2);
    partes.push(sinIndice(g));
  }
  for (const [x, z] of puntos) { const c = new THREE.CircleGeometry(r, 10); c.rotateX(-Math.PI / 2); c.translate(x, y, z); partes.push(sinIndice(c)); }
  return partes;
}
/** La planta un pelo más grande (para el zócalo: si coincidiera con la pared, parpadearía). */
const engordar = (p: P2[], d = 0.06): P2[] => { const [cx, cz] = centroide(p); return p.map(([x, z]) => { const l = Math.hypot(x - cx, z - cz) || 1; return [x + (x - cx) / l * d, z + (z - cz) / l * d]; }); };
const centroide = (p: P2[]) => p.reduce((a, [x, z]) => [a[0] + x / p.length, a[1] + z / p.length], [0, 0]) as P2;
const dentroPoligono = (p: P2[], x: number, z: number) => {
  let d = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, zi] = p[i], [xj, zj] = p[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
};
const distSegmento = (x: number, z: number, [ax, az]: P2, [bx, bz]: P2) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
};

/** Monta la maqueta en la escena y devuelve lo andable y el minimapa. */
export function construirPueblo(pueblo: Pueblo, semilla = 7): (escena: THREE.Scene) => Escenario {
  return escena => {
    const r = azar(semilla), L = pueblo.limites;
    const ancho = L.x1 - L.x0, fondo = L.z1 - L.z0, cx = (L.x0 + L.x1) / 2, cz = (L.z0 + L.z1) / 2;
    escena.background = new THREE.Color('#BFD6E2');

    // Luz de mediodía andaluz: blanca y fuerte, sombras cortas. El sol sigue al jugador (ver `animar`).
    escena.add(new THREE.HemisphereLight('#FFFFFF', '#B9A27A', 0.95));
    const sol = new THREE.DirectionalLight('#FFF4DE', 2.6);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.03;
    Object.assign(sol.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 });
    escena.add(sol, sol.target);
    const relleno = new THREE.DirectionalLight('#FFE9C8', 0.45); relleno.position.set(40, 20, 50); escena.add(relleno);

    // Suelo: el campo que rodea el pueblo, un poco más grande que el plano
    const campo = new THREE.Mesh(new THREE.PlaneGeometry(ancho + 400, fondo + 400), mat(COLOR.campo));
    campo.rotation.x = -Math.PI / 2; campo.position.set(cx, -0.02, cz); campo.receiveShadow = true; escena.add(campo);

    // Zonas (parques, plazas, aparcamientos, agua) y calles, en capas planas
    const porColor = new Map<string, THREE.BufferGeometry[]>();
    const echar = (color: string, g: THREE.BufferGeometry | THREE.BufferGeometry[]) => { const l = porColor.get(color) ?? porColor.set(color, []).get(color)!; l.push(...(Array.isArray(g) ? g : [g])); };
    for (const z of pueblo.zonas) echar(COLOR[z.tipo === 'campo' ? 'campoOscuro' : z.tipo], suelo(z.puntos, z.tipo === 'agua' ? 0.005 : 0.004));
    const ordenCalles = [...pueblo.calles].sort((a, b) => (a.tipo === 'carretera' ? 0 : 1) - (b.tipo === 'carretera' ? 0 : 1));
    for (const c of ordenCalles) {
      const tipo = c.tipo ?? 'calle';
      echar(tipo === 'carretera' ? COLOR.carretera : tipo === 'peatonal' || tipo === 'escalera' ? COLOR.peatonal : tipo === 'camino' ? COLOR.camino : COLOR.calle, cinta(c.puntos, c.ancho, tipo === 'carretera' ? 0.01 : 0.012));
      if (tipo === 'calle' || tipo === 'carretera') echar(COLOR.calSombra, cinta(c.puntos, Math.max(0.3, c.ancho * 0.06), 0.016)); // raya o canalillo del centro
    }
    for (const v of pueblo.tren ?? []) { echar('#A39A8C', cinta(v.puntos, 3.2, 0.014)); echar('#4A4440', cinta(v.puntos, 1.6, 0.018)); }
    for (const [color, gs] of porColor) {
      const m = new THREE.Mesh(mergeGeometries(gs), mat(color)); m.receiveShadow = true; escena.add(m);
    }

    // Edificios: paredes encaladas con zócalo, y tejado de teja o azotea
    const paredes: THREE.BufferGeometry[] = [], zocalos: THREE.BufferGeometry[] = [], tejas: THREE.BufferGeometry[] = [], tejasOsc: THREE.BufferGeometry[] = [], azoteas: THREE.BufferGeometry[] = [], piedras: THREE.BufferGeometry[] = [];
    for (const e of pueblo.edificios) {
      if (e.puntos.length < 3) continue;
      const alto = e.alto;
      if (e.tipo === 'iglesia' || e.tipo === 'ermita') {
        paredes.push(prisma(e.puntos, alto));
        zocalos.push(prisma(engordar(e.puntos), 0.9));
        tejas.push(prisma(e.puntos, 0.5, alto));
        // campanario en la esquina más al oeste
        const [tx, tz] = e.puntos.reduce((a, b) => (b[0] < a[0] ? b : a));
        const [mx, mz] = centroide(e.puntos), k = 0.18, bx = tx + (mx - tx) * k, bz = tz + (mz - tz) * k, lado = e.tipo === 'iglesia' ? 4.2 : 2.4, h = alto + (e.tipo === 'iglesia' ? 9 : 3);
        const torre = new THREE.BoxGeometry(lado, h, lado); torre.translate(bx, h / 2, bz); paredes.push(sinIndice(torre));
        const remate = new THREE.ConeGeometry(lado * 0.72, lado * 0.9, 4); remate.rotateY(Math.PI / 4); remate.translate(bx, h + lado * 0.45, bz); tejasOsc.push(sinIndice(remate));
        for (const s of [-1, 1]) { const v = new THREE.BoxGeometry(lado * 0.35, lado * 0.5, lado + 0.04); v.translate(bx + s * lado * 0.22, h - lado * 0.45, bz); piedras.push(sinIndice(v)); }
        continue;
      }
      paredes.push(prisma(e.puntos, alto));
      zocalos.push(prisma(engordar(e.puntos), 0.7));
      if (e.tipo === 'publico' || r() < 0.38) azoteas.push(prisma(e.puntos, 0.25, alto)); // azotea con pretil
      else (r() < 0.5 ? tejas : tejasOsc).push(prisma(e.puntos, 0.45, alto));
    }
    const echarMalla = (gs: THREE.BufferGeometry[], color: string) => { if (!gs.length) return; const m = new THREE.Mesh(mergeGeometries(gs), mat(color)); m.castShadow = true; m.receiveShadow = true; escena.add(m); };
    echarMalla(paredes, COLOR.cal); echarMalla(zocalos, COLOR.zocalo);
    echarMalla(tejas, COLOR.teja); echarMalla(tejasOsc, COLOR.tejaOscura); echarMalla(azoteas, COLOR.azotea); echarMalla(piedras, '#3B342E');

    // Árboles (naranjos y olivos): tronco y copa de bloques
    const arboles = pueblo.arboles ?? [];
    if (arboles.length) {
      const troncoG = new THREE.BoxGeometry(0.35, 1.6, 0.35); troncoG.translate(0, 0.8, 0);
      const copaG = new THREE.BoxGeometry(2, 1.7, 2); copaG.translate(0, 2.3, 0);
      const troncos = new THREE.InstancedMesh(troncoG, mat(COLOR.tronco), arboles.length);
      const copas = new THREE.InstancedMesh(copaG, mat(COLOR.hoja), arboles.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      arboles.forEach(([x, z], i) => {
        const k = 0.8 + r() * 0.5; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI); s.set(k, k, k);
        m.compose(new THREE.Vector3(x, 0, z), q, s); troncos.setMatrixAt(i, m); copas.setMatrixAt(i, m);
        copas.setColorAt(i, new THREE.Color(r() < 0.5 ? COLOR.hoja : COLOR.hojaOscura));
      });
      troncos.castShadow = copas.castShadow = true; escena.add(troncos, copas);
    }
    // Farolas y macetas sueltas por las calles: dan escala
    for (const c of pueblo.calles) if ((c.tipo ?? 'calle') === 'calle' && c.puntos.length > 1 && r() < 0.35) {
      const [ax, az] = c.puntos[0], [bx, bz] = c.puntos[1], l = Math.hypot(bx - ax, bz - az); if (l < 8) continue;
      const nx = -(bz - az) / l, nz = (bx - ax) / l, t = 0.5, d = c.ancho / 2 - 0.3;
      const fx = ax + (bx - ax) * t + nx * d, fz = az + (bz - az) * t + nz * d;
      escena.add(caja(0.12, 3.2, 0.12, mat('#2E2A26'), fx, 0, fz), caja(0.4, 0.35, 0.4, mat('#F6E7B0', { emissive: '#8A7A40', emissiveIntensity: 0.3 }), fx, 3.2, fz));
    }

    // ---------- Lo que se puede andar: una rejilla de 0,5 m; los edificios (un poco engordados) y el agua no ----------
    const PASO = 1, RADIO = 0.35; // celdas de 1 m: el pueblo entero son unos 5 millones
    const mw = Math.ceil(ancho / PASO), mh = Math.ceil(fondo / PASO);
    const datos = new Uint8Array(mw * mh); // 1 = bloqueado
    const bloquear = (p: P2[], radio: number, valor = 1) => {
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (const [x, z] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      const i0 = Math.max(0, Math.floor((x0 - radio - L.x0) / PASO)), i1 = Math.min(mw - 1, Math.ceil((x1 + radio - L.x0) / PASO));
      const j0 = Math.max(0, Math.floor((z0 - radio - L.z0) / PASO)), j1 = Math.min(mh - 1, Math.ceil((z1 + radio - L.z0) / PASO));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = L.x0 + (i + 0.5) * PASO, z = L.z0 + (j + 0.5) * PASO;
        if (datos[j * mw + i] === 1) continue;
        if (dentroPoligono(p, x, z)) { datos[j * mw + i] = valor; continue; }
        for (let k = 0, n = p.length; k < n; k++) if (distSegmento(x, z, p[k], p[(k + 1) % n]) < radio) { datos[j * mw + i] = valor; break; }
      }
    };
    for (const e of pueblo.edificios) bloquear(e.puntos, RADIO);
    for (const z of pueblo.zonas) if (z.tipo === 'agua') bloquear(z.puntos, RADIO, 2); // 2 = agua (luego se abren los puentes)
    // Puentes: donde una calle o un camino cruza el agua, se puede pasar
    for (const c of pueblo.calles) for (let k = 0; k < c.puntos.length - 1; k++) {
      const [ax, az] = c.puntos[k], [bx, bz] = c.puntos[k + 1], l = Math.hypot(bx - ax, bz - az), r = Math.max(1, c.ancho / 2 - 0.5);
      for (let s = 0; s <= l; s += PASO * 0.5) {
        const x = ax + (bx - ax) * s / l, z = az + (bz - az) * s / l;
        for (let dj = -r; dj <= r; dj += PASO) for (let di = -r; di <= r; di += PASO) {
          if (di * di + dj * dj > r * r) continue;
          const i = Math.floor((x + di - L.x0) / PASO), j = Math.floor((z + dj - L.z0) / PASO);
          if (i >= 0 && j >= 0 && i < mw && j < mh && datos[j * mw + i] === 2) datos[j * mw + i] = 0;
        }
      }
    }
    for (let k = 0; k < datos.length; k++) if (datos[k] === 2) datos[k] = 1;
    for (const [x, z] of arboles) bloquear([[x - 0.3, z - 0.3], [x + 0.3, z - 0.3], [x + 0.3, z + 0.3], [x - 0.3, z + 0.3]], RADIO);
    const mascara: Mascara = { x0: L.x0, z0: L.z0, ancho: mw, alto: mh, paso: PASO, bloqueado: datos };

    // ---------- Minimapa ----------
    const dibujarMapa = (c: CanvasRenderingContext2D, aM: (x: number, z: number) => readonly [number, number], escala: number) => {
      c.fillStyle = COLOR.campo; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      const poli = (p: P2[], color: string) => { c.fillStyle = color; c.beginPath(); p.forEach(([x, z], i) => { const [a, b] = aM(x, z); if (i) c.lineTo(a, b); else c.moveTo(a, b); }); c.closePath(); c.fill(); };
      for (const z of pueblo.zonas) poli(z.puntos, COLOR[z.tipo === 'campo' ? 'campoOscuro' : z.tipo]);
      c.lineCap = 'round'; c.lineJoin = 'round';
      for (const k of ordenCalles) {
        const tipo = k.tipo ?? 'calle';
        c.strokeStyle = tipo === 'carretera' ? '#5E5B57' : tipo === 'camino' ? COLOR.camino : tipo === 'peatonal' || tipo === 'escalera' ? '#CDBF9F' : '#7D7A74';
        c.lineWidth = Math.max(1.5, k.ancho * escala); c.beginPath();
        k.puntos.forEach(([x, z], i) => { const [a, b] = aM(x, z); if (i) c.lineTo(a, b); else c.moveTo(a, b); }); c.stroke();
      }
      c.strokeStyle = '#4A4440'; c.lineWidth = Math.max(1, 1.6 * escala);
      for (const v of pueblo.tren ?? []) { c.beginPath(); v.puntos.forEach(([x, z], i) => { const [a, b] = aM(x, z); if (i) c.lineTo(a, b); else c.moveTo(a, b); }); c.stroke(); }
      for (const e of pueblo.edificios) poli(e.puntos, e.tipo === 'iglesia' || e.tipo === 'ermita' ? '#C9A27A' : '#FFFDF6');
    };

    const animar = (_t: number, foco: THREE.Vector3) => {
      // el sol y su caja de sombras siguen al jugador: sombras nítidas en todo el pueblo
      sol.target.position.set(foco.x, 0, foco.z); sol.position.set(foco.x - 30, 60, foco.z + 22);
    };
    return { mascara, animar, dibujarMapa };
  };
}

/** Cartel con letras (sobre dos postes), mirando hacia `giro`. */
export function cartel(escena: THREE.Object3D, x: number, z: number, giro: number, texto: string, opciones: { fondo?: string; letra?: string; ancho?: number } = {}) {
  const ancho = opciones.ancho ?? 4.4, alto = ancho * 0.28;
  const lienzo = document.createElement('canvas'); lienzo.width = 256; lienzo.height = Math.round(256 * alto / ancho);
  const c = lienzo.getContext('2d')!;
  c.fillStyle = opciones.fondo ?? '#1F6E3A'; c.fillRect(0, 0, lienzo.width, lienzo.height);
  c.strokeStyle = '#FFFFFF'; c.lineWidth = 6; c.strokeRect(5, 5, lienzo.width - 10, lienzo.height - 10);
  c.fillStyle = opciones.letra ?? '#FFFFFF'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `bold ${Math.round(lienzo.height * 0.5)}px system-ui, sans-serif`; c.fillText(texto, lienzo.width / 2, lienzo.height / 2 + 2, lienzo.width - 24);
  const tex = new THREE.CanvasTexture(lienzo); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const g = new THREE.Group();
  const tabla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, 0.12), [mat('#2E2A26'), mat('#2E2A26'), mat('#2E2A26'), mat('#2E2A26'), new THREE.MeshLambertMaterial({ map: tex }), mat('#2E2A26')]);
  tabla.position.y = 2.6; tabla.castShadow = true; g.add(tabla);
  for (const s of [-1, 1]) g.add(caja(0.14, 2.6, 0.14, mat('#2E2A26'), s * (ancho / 2 - 0.3), 0, 0));
  g.position.set(x, 0, z); g.rotation.y = giro; escena.add(g); return g;
}

/** Monumento en lo alto: pedestal de piedra y figura blanca con los brazos abiertos. */
export function monumento(escena: THREE.Object3D, x: number, z: number, giro = 0) {
  const g = new THREE.Group(), piedra = mat(COLOR.piedra), blanco = mat('#F4F1EA');
  g.add(caja(6, 0.4, 6, mat('#CDBB98'), 0, 0, 0));                   // explanada
  g.add(caja(2.4, 2.2, 2.4, piedra, 0, 0.4, 0), caja(2.8, 0.3, 2.8, piedra, 0, 2.6, 0)); // pedestal
  g.add(caja(0.9, 2.6, 0.7, blanco, 0, 2.9, 0));                       // túnica
  g.add(caja(0.6, 0.6, 0.6, blanco, 0, 5.5, 0));                       // cabeza
  for (const s of [-1, 1]) { const b = caja(1.2, 0.3, 0.3, blanco, 0, 0, 0); b.position.set(s * 0.95, 4.9, 0); b.rotation.z = s * 0.35; g.add(b); } // brazos abiertos
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(x, 0, z); g.rotation.y = giro; escena.add(g); return g;
}
