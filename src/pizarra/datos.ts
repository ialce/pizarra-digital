// Lo común a todos los capítulos (el pueblo, el Punto Vuela, Victoria, Paco y El Santo) y cómo se monta un capítulo
// a partir de su contenido (src/pizarra/capitulos/<id>.ts). Las posiciones están en metros del plano (pueblo.json).
import type { DatosJuego, Parada } from '../juego/juego';
import { CAPITULOS } from './capitulos';
import { construirPueblo, cartel, monumento, type Pueblo } from './pueblo';
import type { Mascara } from '../juego/juego';
import pueblo from './pueblo.json';

const P = pueblo as unknown as Pueblo & { lugares: Record<string, { x: number; z: number; nombre: string }> };
const L = P.limites;
const dentro = (l?: { x: number; z: number }) => !!l && l.x > L.x0 && l.x < L.x1 && l.z > L.z0 && l.z < L.z1;

/** Un punto a lo largo de una calle con nombre (t = 0 al principio, 1 al final), sobre su eje: siempre se puede pisar. */
function calle(nombre: string, t = 0.5) {
  const c = P.calles.find(c => (c as { nombre?: string }).nombre === nombre);
  if (!c) throw new Error(`No está la calle «${nombre}» en el plano`);
  const largos = c.puntos.slice(1).map((p, i) => Math.hypot(p[0] - c.puntos[i][0], p[1] - c.puntos[i][1]));
  let resto = largos.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < largos.length; i++) {
    if (resto <= largos[i]) { const k = resto / largos[i], [ax, az] = c.puntos[i], [bx, bz] = c.puntos[i + 1]; return { x: +(ax + (bx - ax) * k).toFixed(1), z: +(az + (bz - az) * k).toFixed(1) }; }
    resto -= largos[i];
  }
  const [x, z] = c.puntos.at(-1)!; return { x, z };
}

// Punto Vuela: Calle Dámaso Alonso, 35 (el sitio exacto en la calle, por confirmar)
const PV = calle('Calle Dámaso Alonso', 0.45);
// Dirección de la calle en el Punto Vuela: (ux, uz) a lo largo, (nx, nz) hacia la acera del cartel
const [ux, uz] = (() => { const a = calle('Calle Dámaso Alonso', 0.44), b = calle('Calle Dámaso Alonso', 0.46), l = Math.hypot(b.x - a.x, b.z - a.z); return [(b.x - a.x) / l, (b.z - a.z) / l]; })();
const nx = -uz, nz = ux;
const junto = (a: number, n: number) => ({ x: +(PV.x + ux * a + nx * n).toFixed(1), z: +(PV.z + uz * a + nz * n).toFixed(1) });

// El Santo: coordenadas que dio Iván (36.770116, −4.696597)
const santo = P.lugares['el-santo'];
if (!dentro(santo)) throw new Error('El Santo se sale del plano');
/** Un sitio con nombre del plano (Correos, el Ayuntamiento…), llevado al punto de calle más cercano para poder llegar andando. */
function sitio(clave: string) {
  const l = P.lugares[clave]; if (!l) throw new Error(`No está el sitio «${clave}» en el plano`);
  let mejor = { x: l.x, z: l.z }, dm = Infinity;
  for (const c of P.calles) {
    if (c.tipo === 'carretera' || c.tipo === 'camino') continue;
    for (let i = 0; i < c.puntos.length - 1; i++) {
      const [ax, az] = c.puntos[i], [bx, bz] = c.puntos[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((l.x - ax) * dx + (l.z - az) * dz) / l2)), x = ax + t * dx, z = az + t * dz, d = Math.hypot(x - l.x, z - l.z);
      if (d < dm) { dm = d; mejor = { x: +x.toFixed(1), z: +z.toFixed(1) }; }
    }
  }
  if (dm > 70) throw new Error(`«${clave}» queda a ${Math.round(dm)} m de la calle más cercana`);
  return mejor;
}

/** Lo que cambia en cada capítulo. Recibe las ayudas para colocar las paradas por nombre de calle o de sitio. */
export type ContenidoCapitulo = (ayudas: { calle: typeof calle; sitio: typeof sitio }) => {
  victoria: string[]; primeraPista: string; paradas: Parada[];
  final: { lineas: string[]; titulo: string; texto: string };
};
const bloquearCaja = (m: Mascara, x: number, z: number, r: number) => {
  for (let j = Math.floor((z - r - m.z0) / m.paso); j <= Math.floor((z + r - m.z0) / m.paso); j++)
    for (let i = Math.floor((x - r - m.x0) / m.paso); i <= Math.floor((x + r - m.x0) / m.paso); i++) if (i >= 0 && j >= 0 && i < m.ancho && j < m.alto) m.bloqueado[j * m.ancho + i] = 1;
};

/** Monta el capítulo `id` con el contenido de su fichero. */
export function capitulo(id: string, contenido: ContenidoCapitulo): DatosJuego {
  const info = CAPITULOS.find(c => c.id === id)!;
  const c = contenido({ calle, sitio });
  return {
  id,
  titulo: `Capítulo ${info.numero} · ${info.titulo}`,
  escena: e => {
    const r = construirPueblo(P)(e);
    // Cartel del Punto Vuela, en la acera, mirando a la calle
    const c = junto(0, 3.6); cartel(e, c.x, c.z, Math.atan2(-nx, -nz), 'PUNTO VUELA');
    monumento(e, santo.x, santo.z - 5);
    bloquearCaja(r.mascara, santo.x, santo.z - 5, 1.5);
    return r;
  },
  inicio: { ...junto(-9, 0), mirando: Math.atan2(ux, uz) },
  jugador: { ropa: '#3F6E9C', pantalon: '#4A4238', pelo: '#BDB6AC', piel: '#D9A57A' },
  guia: 'victoria',
  personajes: [
    {
      id: 'victoria', nombre: 'Victoria', papel: 'Profesora del Punto Vuela', ...junto(-1.2, 2),
      // dibujada a partir de su foto: melena rizada con flequillo y mechón rubio, gafas finas con esquinas rosas, leopardo
      figura: { ropa: '#A8743F', pantalon: '#1E1C1A', pelo: '#3A2318', pelolargo: true, rizado: true, gafas: true, piel: '#EFC6AE' },
      retrato: { piel: '#EFC6AE', pelo: '#3A2318', peinado: 'melena', mechon: '#D9B56E', ropa: '#B5824C', estampado: 'leopardo', extra: ['gafasFinas'], gafasColor: '#E0306A', ojos: '#4E8C8A', gesto: 'dientes', fondo: '#BFDAD6' },
      lineas: c.victoria,
      otraVez: ['¡Ánimo! Si se te olvida la pista, la tienes arriba y en «Mis pistas».'],
    },
    {
      id: 'paco', nombre: 'Paco Polo', papel: 'Del Punto Vuela', ...junto(1.2, 2),
      // dibujado a partir de su foto: pelo rizado, gafas de pasta negras, americana azul marino y camisa blanca
      figura: { ropa: '#1F2A44', camisa: '#F4F2EC', pantalon: '#2E3440', pelo: '#2A1F18', rizado: true, gafas: true, piel: '#C99472' },
      retrato: { piel: '#C99472', pelo: '#2A1F18', peinado: 'rizado', escote: 'americana', ropa: '#1F2A44', extra: ['gafasPasta'], gesto: 'dientes', fondo: '#E9C7B8' },
      lineas: ['No, no, no, no puedo sacarte el certificado digital de tu hermana si no viene ella aquí.'], // siempre lo mismo
    },
  ],
  paradas: c.paradas,
  final: { lugar: 'El Santo', x: santo.x, z: santo.z, ...c.final },
  bienvenida: { lugar: `Capítulo ${info.numero}`, texto: `${info.titulo}. Estás en la puerta del Punto Vuela: Victoria te espera para contarte el tema de hoy. Toca el suelo para andar.` },
  primeraPista: c.primeraPista,
  guiado: false, // sin flecha, sin «Llévame» y sin marcar el sitio: cada uno va por su cuenta con la pista
  };
}
