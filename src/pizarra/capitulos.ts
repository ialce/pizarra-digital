// Los capítulos del curso: uno por tema. Este fichero es ligero (lo usa la pantalla de capítulos);
// el contenido de cada uno está en src/pizarra/capitulos/<id>.ts.
//
// ABRIR UN CAPÍTULO: poner `abierto: true` (lo decide Iván según vaya el curso). Abiertos, se juegan en
// cualquier orden. Con ?profe en la dirección se ven y se juegan todos, abiertos o no (para probarlos).

export interface InfoCapitulo { id: string; numero: number; titulo: string; resumen: string; abierto: boolean }

export const CAPITULOS: InfoCapitulo[] = [
  { id: 'basicas', numero: 1, titulo: 'Preguntas básicas', resumen: 'Mensajes engañosos, contraseñas seguras, mandar una foto y los atajos del teclado.', abierto: true },
  { id: 'gmail', numero: 2, titulo: 'Gmail', resumen: 'Tu dirección de correo, escribir y enviar un correo, las carpetas y los correos trampa.', abierto: false },
  { id: 'imagenes-ia', numero: 3, titulo: 'Crear imágenes con IA', resumen: 'Pedirle a ChatGPT que dibuje: cómo pedirlo bien, los pasos y qué no se debe hacer.', abierto: false },
  { id: 'chrome', numero: 4, titulo: 'El navegador Chrome', resumen: 'Los botones del navegador, la barra de arriba, buscar algo y saber si una página es de fiar.', abierto: false },
];
