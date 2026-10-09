// Capítulo 3 · Crear imágenes con IA (ChatGPT). Recorrido por el norte: estación, Calle Real, el Palacio y la Concordia.
// ⚠ Propuesta de Claude: Iván la revisa antes de abrirlo.
import type { ContenidoCapitulo } from '../datos';

export const imagenesIA: ContenidoCapitulo = ({ sitio, calle }) => ({
  victoria: [
    '¡Hola de nuevo! Hoy vamos a crear imágenes con inteligencia artificial, con ChatGPT.',
    'Tú le escribes lo que quieres y él lo dibuja. Pero hay que saber pedírselo bien.',
    'Las pistas de hoy van por la parte de arriba del pueblo y terminan, como siempre, en El Santo.',
  ],
  primeraPista: 'La primera pista espera donde para el tren que va a Málaga.',
  paradas: [
    {
      id: 'estacion', lugar: 'la Estación', ...sitio('estacion-de-pizarra'), objeto: 'movil',
      lineas: ['Un móvil con ChatGPT abierto en el andén. Hay una palabra subrayada: «prompt».'],
      reto: {
        tipo: 'una', titulo: '¿Qué es un «prompt»?', enunciado: 'Cuando le pides a ChatGPT que dibuje algo, ¿cómo se llama lo que le escribes?',
        opciones: [
          { texto: 'La petición o «prompt»: lo que quieres que haga', bien: true },
          { texto: 'La contraseña de ChatGPT', porque: 'No: la contraseña es para entrar. Lo que le pides se llama «prompt».' },
          { texto: 'El nombre del archivo de la imagen', porque: 'No: el «prompt» es el texto con lo que le pides.' },
        ],
        bien: '¡Eso es! El «prompt» es tu petición, escrita con tus palabras.',
      },
      pista: 'Ahora ve a la calle más importante del pueblo antiguo; su nombre lo dice todo: es de reyes.',
    },
    {
      id: 'calle-real', lugar: 'la Calle Real', ...calle('Calle Real', 0.5), objeto: 'tableta',
      lineas: ['En la tableta hay varias peticiones para ChatGPT. Unas sirven y otras no.'],
      reto: {
        tipo: 'elegir', titulo: 'Pedirlo bien', enunciado: '¿Qué peticiones están bien hechas?',
        opciones: [
          { texto: 'Dibuja la iglesia de un pueblo blanco al atardecer, estilo acuarela', bien: true },
          { texto: 'Un cartel de feria con farolillos de colores y gente bailando', bien: true },
          { texto: 'Dibujo', bien: false, porque: 'Muy poco: cuanto más detalle le des, mejor sale.' },
          { texto: 'Una foto de mi vecina, sin que ella lo sepa', bien: false, porque: 'Las caras de otras personas, nunca sin su permiso.' },
        ],
        ayuda: 'Las buenas dicen qué quieres, cómo es y en qué estilo.',
        bien: '¡Muy bien! Qué, cómo y en qué estilo: así sale lo que imaginas.',
      },
      pista: 'Busca el palacio de unos condes, muy cerquita de la iglesia.',
    },
    {
      id: 'palacio', lugar: 'el Palacio de los Condes', ...sitio('palacio-de-los-conde-de-puerto-hermoso'), objeto: 'ordenador',
      lineas: ['Un ordenador en el palacio. Alguien quiere hacer una felicitación con IA para su nieta.'],
      reto: {
        tipo: 'ordenar', titulo: 'Crear la imagen', enunciado: 'Pon en orden los pasos para crear la imagen y guardarla.',
        pasos: ['Abrir ChatGPT', 'Escribir lo que quieres que dibuje', 'Pulsar enviar', 'Esperar a que salga la imagen', 'Pedir cambios si no te gusta', 'Descargar la imagen'],
        bien: '¡Felicitación lista!',
      },
      pista: 'Sube a la plaza cuyo nombre significa «estar de acuerdo».',
    },
    {
      id: 'concordia', lugar: 'la Plaza de la Concordia', ...sitio('plaza-de-la-concordia'), objeto: 'sobre',
      lineas: ['En el sobre, una foto de un burro volando sobre Pizarra. Parece de verdad…'],
      reto: {
        tipo: 'una', titulo: '¿Es de verdad?', enunciado: 'Ves una foto increíble en internet. ¿Puedes fiarte de que es real?',
        opciones: [
          { texto: 'No siempre: hoy se pueden inventar imágenes con IA', bien: true },
          { texto: 'Sí, las fotos no mienten', porque: 'Antes quizá; hoy la IA hace fotos que parecen reales y no lo son.' },
          { texto: 'Sí, si la ha compartido mucha gente', porque: 'Que se comparta mucho no la hace verdad.' },
        ],
        bien: '¡Exacto! Antes de creerte una imagen, piénsalo dos veces.',
      },
      pista: '¡Última parada! Ve hasta El Santo.',
    },
  ],
  final: {
    lineas: ['¡Has llegado a El Santo!', 'Ya sabes pedirle imágenes a la IA, y también desconfiar de las que parecen demasiado increíbles.'],
    titulo: '¡Capítulo 3 superado!',
    texto: 'Has recorrido el norte de Pizarra aprendiendo a crear imágenes con inteligencia artificial y has llegado hasta El Santo. Enhorabuena de parte de todo el Punto Vuela.',
  },
});
