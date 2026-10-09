// Carga un capítulo por su id (cada uno en su propio fichero).
import type { DatosJuego } from '../juego/juego';
import { capitulo } from './datos';
import { basicas } from './capitulos/basicas';
import { gmail } from './capitulos/gmail';
import { imagenesIA } from './capitulos/imagenes-ia';
import { chrome } from './capitulos/chrome';

const CONTENIDOS = { basicas, gmail, 'imagenes-ia': imagenesIA, chrome };
export const cargarCapitulo = (id: string): DatosJuego => capitulo(id, CONTENIDOS[id as keyof typeof CONTENIDOS]);
