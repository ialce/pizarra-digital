// El juego de Pizarra: personajes, paradas con sus retos y el final en El Santo.
// ⚠ PROVISIONAL: los textos de Victoria y Paco, las paradas, los retos y las pistas son de ejemplo
// hasta que Iván pase los de verdad. Las posiciones están en metros del plano (ver pueblo.json → lugares).
import type { DatosJuego, Parada } from '../juego/juego';
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
const p = (nombre: string, t?: number) => calle(nombre, t);
const bloquearCaja = (m: Mascara, x: number, z: number, r: number) => {
  for (let j = Math.floor((z - r - m.z0) / m.paso); j <= Math.floor((z + r - m.z0) / m.paso); j++)
    for (let i = Math.floor((x - r - m.x0) / m.paso); i <= Math.floor((x + r - m.x0) / m.paso); i++) if (i >= 0 && j >= 0 && i < m.ancho && j < m.alto) m.bloqueado[j * m.ancho + i] = 1;
};

const paradas: Parada[] = [
  {
    id: 'plaza-espana', lugar: 'la Plaza de España', ...p('Plaza de España', 0), objeto: 'movil',
    lineas: ['¡Un móvil abandonado en la plaza! Tiene un mensaje en la pantalla…', '«Su paquete está retenido en Correos. Pague 1,99 € en este enlace para recibirlo.»'],
    reto: {
      tipo: 'una', titulo: '¿Qué hacemos con el mensaje?', enunciado: 'Te llega este mensaje al móvil y no esperabas ningún paquete. ¿Qué haces?',
      opciones: [
        { texto: 'No toco el enlace y borro el mensaje', bien: true },
        { texto: 'Pago, total es poco dinero', porque: 'Cuidado: es un engaño para quedarse con los datos de tu tarjeta.' },
        { texto: 'Contesto con mi nombre y mi DNI', porque: 'Nunca des tus datos a quien no conoces. Es un engaño.' },
      ],
      bien: '¡Eso es! Correos nunca te pide pagar por un enlace en un mensaje.',
    },
    pista: 'Sigue la Avenida de Europa, la calle larga con árboles. A mitad de camino hay un ordenador esperándote.',
  },
  {
    id: 'avenida-europa', lugar: 'la Avenida de Europa', ...p('Avenida de Europa', 0.4), objeto: 'ordenador',
    lineas: ['Un ordenador en mitad de la avenida. Pide una contraseña nueva para entrar.'],
    reto: {
      tipo: 'elegir', titulo: 'Contraseñas seguras', enunciado: '¿Cuáles de estas contraseñas son seguras?',
      opciones: [
        { texto: 'Olivo-Pizarra-27!', bien: true },
        { texto: 'Gato*Verde*Mesa*9', bien: true },
        { texto: '123456', bien: false, porque: '«123456» es la primera que prueban los ladrones.' },
        { texto: 'Tu fecha de nacimiento', bien: false, porque: 'La fecha de nacimiento la puede saber cualquiera.' },
        { texto: 'contraseña', bien: false, porque: '«contraseña» es de las más usadas: nada segura.' },
      ],
      ayuda: 'Las seguras son largas y mezclan palabras, números y símbolos.',
      bien: '¡Muy bien! Larga, con palabras sueltas, números y algún símbolo.',
    },
    pista: 'Ahora baja hacia la Calle Grecia. Allí te espera una tableta con fotos.',
  },
  {
    id: 'calle-grecia', lugar: 'la Calle Grecia', ...p('Calle Grecia', 0.5), objeto: 'tableta',
    lineas: ['Una tableta con una foto preciosa del pueblo. ¿Cómo se la mandamos a la familia por WhatsApp?'],
    reto: {
      tipo: 'ordenar', titulo: 'Mandar una foto', enunciado: 'Pon los pasos en orden para enviar una foto por WhatsApp.',
      pasos: ['Abrir WhatsApp', 'Entrar en la conversación de la persona', 'Tocar el clip o la cámara', 'Elegir la foto', 'Pulsar el botón de enviar'],
      bien: '¡Foto enviada!',
    },
    pista: 'Sube hasta la Plaza de Carlos Cano. Allí hay un sobre con la última pista antes de El Santo.',
  },
  {
    id: 'carlos-cano', lugar: 'la Plaza de Carlos Cano', ...p('Plaza de Carlos Cano', 0), objeto: 'sobre',
    lineas: ['Dentro del sobre hay una nota con atajos de teclado y sus nombres mezclados.'],
    reto: {
      tipo: 'relacionar', titulo: 'Atajos de teclado', enunciado: 'Une cada atajo con lo que hace.',
      parejas: [['Ctrl + C', 'Copiar'], ['Ctrl + V', 'Pegar'], ['Ctrl + Z', 'Deshacer']],
      bien: '¡Perfecto! Con estos tres atajos ya te manejas mejor que muchos.',
    },
    pista: '¡Ya solo queda la última parada! Ve a El Santo, el sitio que más quieren los pizarreños.',
  },
];

export const pizarra: DatosJuego = {
  id: 'pizarra',
  titulo: 'Pizarra Digital',
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
      figura: { ropa: '#8C4A6B', pantalon: '#2F3A4C', pelo: '#5A3A22', pelolargo: true, falda: true, piel: '#E2B08A' },
      retrato: { piel: 'clara', pelo: '#5A3A22', peinado: 'largo', ropa: '#8C4A6B', escote: 'redondo', extra: ['pendientes'], gesto: 'sonrisa', fondo: '#F1DCC8' },
      lineas: [
        '¡Hola! Soy Victoria, la profesora del Punto Vuela. Bienvenido al juego de Pizarra Digital.',
        'Vas a recorrer el pueblo buscando pistas. En cada sitio hay un pequeño reto de ordenadores, móviles e internet.',
        'Cada reto que superes te dice dónde está la siguiente pista. La última te lleva hasta El Santo.',
        'Si te pierdes, pulsa «Llévame» y te acompaño andando. ¡Mucha suerte!',
      ],
      otraVez: ['¡Ánimo! Si no sabes adónde ir, pulsa «Mis pistas» o «Llévame».'],
    },
    {
      id: 'paco', nombre: 'Paco Polo', papel: 'Del Punto Vuela', ...junto(1.2, 2),
      figura: { ropa: '#2E8B57', pantalon: '#4A4238', pelo: '#3A2618', piel: '#C98E62' },
      retrato: { piel: 'media', pelo: '#3A2618', peinado: 'corto', barba: 'bigote', ropa: '#2E8B57', escote: 'redondo', gesto: 'sonrisa', fondo: '#D8E8D0' },
      lineas: ['[Aquí va la frase de Paco: me la tienes que pasar]'],
    },
  ],
  paradas,
  final: {
    lugar: 'El Santo', x: santo.x, z: santo.z,
    lineas: ['¡Has llegado a El Santo, el rincón más querido de Pizarra!', 'Has resuelto todas las pistas por el pueblo. ¡Ya te manejas con el ordenador y el móvil!'],
    titulo: '¡Recorrido completado!',
    texto: 'Has encontrado todas las pistas de Pizarra y has llegado hasta El Santo. Enhorabuena de parte de todo el Punto Vuela.',
  },
  bienvenida: { lugar: 'Pizarra', texto: 'Estás en la puerta del Punto Vuela. Victoria y Paco te esperan para contarte de qué va el juego. Toca el suelo para andar, o pulsa «Llévame».' },
};
