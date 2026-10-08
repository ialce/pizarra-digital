// Portada y arranque del juego.
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import { almacen } from './juego/almacen';

const raiz = document.getElementById('juego')!;
const botonJugar = document.querySelector<HTMLButtonElement>('[data-jugar]')!;
const botonNueva = document.querySelector<HTMLButtonElement>('[data-nueva]')!;

const pintar = () => {
  const p = almacen.get<{ fase: number }>('pd-partida-pizarra');
  const aMedias = !!p && p.fase > 0;
  botonJugar.textContent = aMedias ? 'Continuar la partida' : 'Empezar a jugar';
  botonNueva.hidden = !aMedias;
};
pintar();

async function jugar(nueva = false) {
  raiz.hidden = false; document.documentElement.classList.add('jugando');
  raiz.innerHTML = '<p class="pj-cargando">Preparando el pueblo…</p>';
  try {
    const [{ iniciarJuego }, { pizarra }] = await Promise.all([import('./juego/juego'), import('./pizarra/datos')]);
    await iniciarJuego(raiz, pizarra, {
      nueva,
      alSalir: () => { raiz.hidden = true; document.documentElement.classList.remove('jugando'); pintar(); },
    });
  } catch (err) {
    console.error(err);
    raiz.innerHTML = '<p class="pj-cargando">No se ha podido cargar el juego en este navegador.</p>';
    setTimeout(() => { raiz.hidden = true; document.documentElement.classList.remove('jugando'); }, 3000);
  }
}
botonJugar.addEventListener('click', () => jugar());
botonNueva.addEventListener('click', () => { if (confirm('¿Seguro? Se pierde la partida que llevas.')) jugar(true); });
// ?jugar abre el juego directamente (para el código QR y las pruebas)
if (new URLSearchParams(location.search).has('jugar')) jugar(new URLSearchParams(location.search).has('nueva'));
