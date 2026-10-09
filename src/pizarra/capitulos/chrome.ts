// Capítulo 4 · El navegador Chrome. Recorrido por la zona de la estación y la Avenida de la Constitución.
// ⚠ Propuesta de Claude: Iván la revisa antes de abrirlo.
import type { ContenidoCapitulo } from '../datos';

export const chrome: ContenidoCapitulo = ({ sitio, calle }) => ({
  victoria: [
    '¡Bienvenido! Hoy aprendemos a usar Chrome, el programa para entrar en internet.',
    'Las pistas de hoy están cerca de aquí, por la zona de la estación. La última, como siempre, en El Santo.',
  ],
  primeraPista: 'Empieza en la plaza que hay junto a la estación del tren.',
  paradas: [
    {
      id: 'plaza-estacion', lugar: 'la Plaza de la Estación', ...sitio('plaza-estacion'), objeto: 'ordenador',
      lineas: ['Un ordenador con Chrome abierto. Arriba hay unos botones, pero no se sabe para qué sirve cada uno.'],
      reto: {
        tipo: 'relacionar', titulo: 'Los botones de Chrome', enunciado: 'Une cada botón con lo que hace.',
        parejas: [['←', 'Volver a la página anterior'], ['⟳', 'Recargar la página'], ['☆', 'Guardar en favoritos'], ['+', 'Abrir una pestaña nueva']],
        bien: '¡Muy bien! Ya sabes moverte por las páginas.',
      },
      pista: 'Ahora ve a la calle con el nombre de nuestra comunidad autónoma.',
    },
    {
      id: 'calle-andalucia', lugar: 'la Calle Andalucía', ...calle('Calle Andalucía', 0.5), objeto: 'tableta',
      lineas: ['En la tableta, Chrome está abierto y hay que buscar algo.'],
      reto: {
        tipo: 'una', titulo: 'La barra de arriba', enunciado: '¿Dónde escribes lo que quieres buscar o la dirección de una página?',
        opciones: [
          { texto: 'En la barra larga de arriba del todo', bien: true },
          { texto: 'En cualquier parte de la página', porque: 'No: hay que tocar la barra de arriba, la de las direcciones.' },
          { texto: 'En la papelera', porque: '¡No! La papelera es para borrar. Se escribe en la barra de arriba.' },
        ],
        bien: '¡Eso es! En la barra de arriba vale para buscar y para escribir direcciones.',
      },
      pista: 'Sigue hasta la avenida que lleva el nombre de la ley más importante de España.',
    },
    {
      id: 'constitucion', lugar: 'la Avenida de la Constitución', ...calle('Avenida de la Constitución', 0.5), objeto: 'movil',
      lineas: ['En el móvil hay varias páginas para pagar el recibo de la luz. ¿Cuáles son de fiar?'],
      reto: {
        tipo: 'elegir', titulo: 'Páginas de fiar', enunciado: '¿Qué señales te dicen que una página es segura?',
        opciones: [
          { texto: 'Tiene un candado al lado de la dirección', bien: true },
          { texto: 'La dirección empieza por https://', bien: true },
          { texto: 'La dirección es rara: «c0rreos-pag0.xyz»', bien: false, porque: 'Letras cambiadas por números y terminaciones raras: cuidado.' },
          { texto: 'Te dice que has ganado un premio', bien: false, porque: 'Los premios por sorpresa son casi siempre un engaño.' },
        ],
        ayuda: 'Fíjate en el candado y en cómo empieza la dirección.',
        bien: '¡Perfecto! Candado y https: buenas señales.',
      },
      pista: 'Ve a la ronda que se llama como un campo de olivos.',
    },
    {
      id: 'ronda-olivar', lugar: 'la Ronda del Olivar', ...calle('Ronda del Olivar', 0.5), objeto: 'sobre',
      lineas: ['En el sobre: «Quiero saber a qué hora sale el autobús de Pizarra a Málaga».'],
      reto: {
        tipo: 'ordenar', titulo: 'Buscar en internet', enunciado: 'Pon en orden los pasos para buscarlo en Chrome.',
        pasos: ['Abrir Chrome', 'Tocar la barra de arriba', 'Escribir «horario autobús Pizarra Málaga»', 'Pulsar buscar', 'Abrir uno de los resultados'],
        bien: '¡Encontrado!',
      },
      pista: '¡Última parada! Ve hasta El Santo.',
    },
  ],
  final: {
    lineas: ['¡Has llegado a El Santo!', 'Ya sabes moverte por Chrome, buscar lo que necesitas y reconocer una página de fiar.'],
    titulo: '¡Capítulo 4 superado!',
    texto: 'Has recorrido Pizarra aprendiendo a usar el navegador Chrome y has llegado hasta El Santo. Enhorabuena de parte de todo el Punto Vuela.',
  },
});
