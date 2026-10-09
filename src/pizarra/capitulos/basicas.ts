// Capítulo 1 · Preguntas básicas. Recorrido por el barrio nuevo (Plaza de España, Avenida de Europa…).
// ⚠ De ejemplo hasta que Iván pase las preguntas de verdad.
import type { ContenidoCapitulo } from '../datos';

export const basicas: ContenidoCapitulo = ({ calle }) => ({
  victoria: [
    '¡Hola! Soy Victoria, la profesora del Punto Vuela. Hoy empezamos con preguntas básicas.',
    'Vas a recorrer el pueblo buscando pistas. En cada sitio hay un pequeño reto de móviles, ordenadores e internet.',
    'Cada reto que superes te dice dónde está la siguiente pista. La última te lleva hasta El Santo.',
    'Para andar, toca el suelo adonde quieras ir. Si se te olvida la pista, pulsa «Mis pistas». ¡Mucha suerte!',
  ],
  primeraPista: 'La primera pista está en la plaza redonda del barrio nuevo, la que tiene un jardín en el centro.',
  paradas: [
    {
      id: 'plaza-espana', lugar: 'la Plaza de España', ...calle('Plaza de España', 0), objeto: 'movil',
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
      pista: 'Busca la avenida larga con una fila de árboles en medio. Por la mitad, alguien se ha dejado un ordenador.',
    },
    {
      id: 'avenida-europa', lugar: 'la Avenida de Europa', ...calle('Avenida de Europa', 0.4), objeto: 'ordenador',
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
      pista: 'Ahora ve hacia las calles con nombre de país del sur del barrio. En la de los dioses del Olimpo te espera una tableta.',
    },
    {
      id: 'calle-grecia', lugar: 'la Calle Grecia', ...calle('Calle Grecia', 0.5), objeto: 'tableta',
      lineas: ['Una tableta con una foto preciosa del pueblo. ¿Cómo se la mandamos a la familia por WhatsApp?'],
      reto: {
        tipo: 'ordenar', titulo: 'Mandar una foto', enunciado: 'Pon los pasos en orden para enviar una foto por WhatsApp.',
        pasos: ['Abrir WhatsApp', 'Entrar en la conversación de la persona', 'Tocar el clip o la cámara', 'Elegir la foto', 'Pulsar el botón de enviar'],
        bien: '¡Foto enviada!',
      },
      pista: 'Sube hasta la plaza que lleva el nombre de un cantautor granadino. Allí hay un sobre.',
    },
    {
      id: 'carlos-cano', lugar: 'la Plaza de Carlos Cano', ...calle('Plaza de Carlos Cano', 0), objeto: 'sobre',
      lineas: ['Dentro del sobre hay una nota con atajos de teclado y sus nombres mezclados.'],
      reto: {
        tipo: 'relacionar', titulo: 'Atajos de teclado', enunciado: 'Une cada atajo con lo que hace.',
        parejas: [['Ctrl + C', 'Copiar'], ['Ctrl + V', 'Pegar'], ['Ctrl + Z', 'Deshacer']],
        bien: '¡Perfecto! Con estos tres atajos ya te manejas mejor que muchos.',
      },
      pista: '¡Ya solo queda la última parada! Ve a El Santo, el sitio que más quieren los pizarreños.',
    },
  ],
  final: {
    lineas: ['¡Has llegado a El Santo, el rincón más querido de Pizarra!', 'Has superado las preguntas básicas. ¡Ya te manejas con el móvil y el ordenador!'],
    titulo: '¡Capítulo 1 superado!',
    texto: 'Has resuelto las preguntas básicas por el barrio nuevo y has llegado hasta El Santo. Enhorabuena de parte de todo el Punto Vuela.',
  },
});
