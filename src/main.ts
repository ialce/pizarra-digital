// Pantalla de capítulos y arranque del juego.
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import { almacen } from './juego/almacen';
import { CAPITULOS } from './pizarra/capitulos';

const raiz = document.getElementById('juego')!;
const lista = document.querySelector<HTMLOListElement>('.capitulos')!;
const params = new URLSearchParams(location.search);
const PROFE = params.has('profe'); // ?profe: se ven y se juegan todos (para probarlos)
// ¿Unas gafas de realidad virtual (Meta Quest)? Entonces cada capítulo abierto tiene también «En realidad virtual»
let hayVR = false;
(navigator as Navigator & { xr?: XRSystem }).xr?.isSessionSupported('immersive-vr').then(si => { hayVR = si; if (si) { pintar(); import('./vr/vr'); import('./pizarra/juegos'); } }).catch(() => {});
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function pintar() {
  lista.innerHTML = CAPITULOS.map(c => {
    const hecho = almacen.get<{ fallos: number }>(`pd-hecho-${c.id}`);
    const partida = almacen.get<{ fase: number }>(`pd-partida-${c.id}`);
    const aMedias = !!partida && partida.fase > 0 && !hecho;
    const abierto = c.abierto || PROFE;
    const estado = !abierto ? 'cerrado' : hecho ? 'hecho' : aMedias ? 'medias' : 'nuevo';
    const etiqueta = { cerrado: '🔒 Todavía cerrado', hecho: `✓ Superado${hecho && !hecho.fallos ? ' sin fallos' : ''}`, medias: 'A medias', nuevo: 'Sin empezar' }[estado];
    return `<li class="capitulo" data-estado="${estado}">
      <span class="capitulo-num" aria-hidden="true">${c.numero}</span>
      <div class="capitulo-cuerpo">
        <h2>${esc(c.titulo)}</h2>
        <p>${esc(c.resumen)}</p>
        <p class="capitulo-estado">${etiqueta}${!c.abierto && PROFE ? ' · abierto solo para la profe' : ''}</p>
        ${abierto ? `<div class="capitulo-botones">
          <button type="button" class="boton ${estado === 'hecho' ? '' : 'boton-grande'}" data-jugar="${c.id}">${estado === 'medias' ? 'Continuar' : estado === 'hecho' ? 'Jugar otra vez' : 'Empezar'}</button>
          ${estado === 'medias' ? `<button type="button" class="boton" data-nueva="${c.id}">Empezar de nuevo</button>` : ''}
          ${hayVR ? `<button type="button" class="boton boton-vr" data-vr="${c.id}">🥽 En realidad virtual</button>` : ''}
        </div>` : '<p class="capitulo-nota">Se abrirá cuando lo veamos en clase.</p>'}
      </div></li>`;
  }).join('');
  lista.querySelectorAll<HTMLButtonElement>('[data-jugar]').forEach(b => b.addEventListener('click', () => jugar(b.dataset.jugar!, b.textContent === 'Jugar otra vez')));
  lista.querySelectorAll<HTMLButtonElement>('[data-vr]').forEach(b => b.addEventListener('click', () => jugarVR(b.dataset.vr!)));
  lista.querySelectorAll<HTMLButtonElement>('[data-nueva]').forEach(b => b.addEventListener('click', () => { if (confirm('¿Seguro? Se pierde lo que llevas de este capítulo.')) jugar(b.dataset.nueva!, true); }));
}
pintar();

async function jugar(id: string, nueva = false) {
  raiz.hidden = false; document.documentElement.classList.add('jugando');
  raiz.innerHTML = '<p class="pj-cargando">Preparando el pueblo…</p>';
  try {
    const [{ iniciarJuego }, { cargarCapitulo }] = await Promise.all([import('./juego/juego'), import('./pizarra/juegos')]);
    await iniciarJuego(raiz, cargarCapitulo(id), {
      nueva,
      alSalir: () => { raiz.hidden = true; document.documentElement.classList.remove('jugando'); pintar(); },
    });
  } catch (err) {
    console.error(err);
    raiz.innerHTML = '<p class="pj-cargando">No se ha podido cargar el juego en este navegador.</p>';
    setTimeout(() => { raiz.hidden = true; document.documentElement.classList.remove('jugando'); }, 3000);
  }
}
/** En las gafas: la sesión se pide en el mismo toque (si no, el navegador la bloquea) y después se monta el pueblo. */
async function jugarVR(id: string) {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr; if (!xr) return;
  let sesion: XRSession;
  try { sesion = await xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] }); }
  catch (err) { console.error(err); alert('No se ha podido entrar en la realidad virtual.'); return; }
  document.documentElement.classList.add('en-vr');
  try {
    const [{ iniciarVR }, { cargarCapitulo }] = await Promise.all([import('./vr/vr'), import('./pizarra/juegos')]);
    await iniciarVR(sesion, cargarCapitulo(id), { alSalir: () => { document.documentElement.classList.remove('en-vr'); pintar(); } });
  } catch (err) { console.error(err); sesion.end().catch(() => {}); }
}
// ?jugar=<capítulo> abre ese capítulo directamente (para un código QR y para las pruebas); ?jugar solo, el primero
if (params.has('jugar')) {
  const id = params.get('jugar') || CAPITULOS[0].id, c = CAPITULOS.find(x => x.id === id);
  if (c && (c.abierto || PROFE)) jugar(id, params.has('nueva'));
}
