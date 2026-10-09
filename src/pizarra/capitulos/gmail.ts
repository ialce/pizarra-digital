// Capítulo 2 · Gmail. Recorrido por el centro: Correos, Casa de la Cultura, Ayuntamiento y la iglesia.
// ⚠ Propuesta de Claude: Iván la revisa antes de abrirlo.
import type { ContenidoCapitulo } from '../datos';

export const gmail: ContenidoCapitulo = ({ sitio }) => ({
  victoria: [
    '¡Bienvenido otra vez! Hoy toca Gmail, el correo electrónico de Google.',
    'Las pistas de hoy están por el centro del pueblo. En cada una aprenderás algo del correo.',
    'Como siempre, la última te lleva hasta El Santo. ¡A por ello!',
  ],
  primeraPista: 'Para hablar de correo, empieza por donde se han mandado las cartas toda la vida.',
  paradas: [
    {
      id: 'correos', lugar: 'Correos', ...sitio('correos'), objeto: 'sobre',
      lineas: ['Un sobre en la puerta de Correos. Dentro hay una tarjeta con una dirección de correo a medias…', '«paco.polo@…» ¿Qué le falta?'],
      reto: {
        tipo: 'una', titulo: 'Tu dirección de Gmail', enunciado: 'Una dirección de Gmail siempre termina igual. ¿Cómo termina?',
        opciones: [
          { texto: '@gmail.com', bien: true },
          { texto: '@google.es', porque: 'Casi: es de Google, pero las direcciones de Gmail terminan en @gmail.com.' },
          { texto: 'www.gmail.com', porque: 'Eso es la dirección de la página web, no la de tu correo.' },
        ],
        bien: '¡Eso es! nombre@gmail.com. Lo de antes de la @ lo eliges tú.',
      },
      pista: 'Sigue hasta la casa donde el pueblo va a ver teatro, exposiciones y talleres. Allí hay un ordenador encendido.',
    },
    {
      id: 'casa-cultura', lugar: 'la Casa de la Cultura', ...sitio('casa-de-la-cultura'), objeto: 'ordenador',
      lineas: ['El ordenador tiene Gmail abierto. Alguien quiere mandar un correo y no sabe por dónde empezar.'],
      reto: {
        tipo: 'ordenar', titulo: 'Escribir un correo', enunciado: 'Pon en orden los pasos para escribir y enviar un correo.',
        pasos: ['Abrir Gmail', 'Pulsar «Redactar»', 'Escribir la dirección en «Para»', 'Poner el asunto', 'Escribir el mensaje', 'Pulsar «Enviar»'],
        bien: '¡Correo enviado!',
      },
      pista: 'Ahora ve a la casa de todos los vecinos, donde está el alcalde.',
    },
    {
      id: 'ayuntamiento', lugar: 'el Ayuntamiento', ...sitio('ayuntamiento-de-pizarra'), objeto: 'tableta',
      lineas: ['En la tableta del Ayuntamiento se ven las carpetas de Gmail, pero se han desordenado los nombres.'],
      reto: {
        tipo: 'relacionar', titulo: 'Las carpetas de Gmail', enunciado: 'Une cada carpeta con lo que guarda.',
        parejas: [['Recibidos', 'Los correos que te llegan'], ['Enviados', 'Los que tú has mandado'], ['Spam', 'Correo basura o sospechoso'], ['Papelera', 'Lo que has borrado']],
        bien: '¡Muy bien! Ya sabes dónde buscar cada cosa.',
      },
      pista: 'Sube hasta la plaza que hay delante de la iglesia de San Pedro. Allí hay un móvil con un correo raro.',
    },
    {
      id: 'plaza-iglesia', lugar: 'la Plaza de la Iglesia', ...sitio('plaza-de-la-iglesia'), objeto: 'movil',
      lineas: ['En el móvil hay un correo: «Su cuenta de Gmail será bloqueada hoy. Escriba aquí su contraseña para evitarlo.»'],
      reto: {
        tipo: 'una', titulo: 'Un correo trampa', enunciado: '¿Qué haces con este correo?',
        opciones: [
          { texto: 'No contesto y lo marco como spam', bien: true },
          { texto: 'Escribo mi contraseña para que no me la bloqueen', porque: 'Google nunca te pide la contraseña por correo. Es un engaño.' },
          { texto: 'Se lo reenvío a mis contactos para avisarles', porque: 'Mejor no: así el engaño llega a más gente. Márcalo como spam.' },
        ],
        bien: '¡Perfecto! Si te piden la contraseña por correo, es una trampa.',
      },
      pista: '¡Última parada! Sube hasta El Santo.',
    },
  ],
  final: {
    lineas: ['¡Has llegado a El Santo!', 'Ya sabes tu dirección, escribir un correo, las carpetas y cómo no caer en trampas. ¡Gmail ya no tiene secretos!'],
    titulo: '¡Capítulo 2 superado!',
    texto: 'Has recorrido el centro de Pizarra aprendiendo a usar Gmail y has llegado hasta El Santo. Enhorabuena de parte de todo el Punto Vuela.',
  },
});
