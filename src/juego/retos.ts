// Retos de cada parada: preguntas cortas de informática pensadas para gente mayor. Sin tiempo y sin castigo:
// si fallas, te dice por qué y lo intentas otra vez; al segundo fallo sale una ayuda si la hay.
//   una        — una pregunta con varias respuestas; solo una es buena
//   elegir     — marcar todas las buenas y ninguna mala (¿qué contraseñas son seguras?)
//   ordenar    — poner los pasos en orden (enviar un correo con una foto)
//   relacionar — unir cada cosa con su pareja (cada icono con lo que hace)
//   escribir   — escribir la respuesta (un atajo, una palabra escondida); se aceptan varias formas

interface Base { titulo: string; enunciado: string; bien?: string; ayuda?: string }
export interface RetoUna extends Base { tipo: 'una'; opciones: { texto: string; bien?: boolean; porque?: string }[] }
export interface RetoElegir extends Base { tipo: 'elegir'; opciones: { texto: string; bien: boolean; porque?: string }[] }
export interface RetoOrdenar extends Base { tipo: 'ordenar'; pasos: string[] }                 // en su orden correcto
export interface RetoRelacionar extends Base { tipo: 'relacionar'; parejas: [string, string][] } // [izquierda, derecha]
export interface RetoEscribir extends Base { tipo: 'escribir'; respuestas: string[]; marcador?: string }
export type Reto = RetoUna | RetoElegir | RetoOrdenar | RetoRelacionar | RetoEscribir;

interface Sonido { bien(): void; mal(): void; blip(): void; exclusiva(): void }
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const barajar = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '').replace(/[«»"'.]/g, '');

/** Abre el reto en `cont`; `fin` cuando se resuelve. `alFallar` cuenta los intentos fallidos. */
export function abrirReto(cont: HTMLElement, rt: Reto, sonido: Sonido, alFallar: () => void, fin: () => void, leer?: (t: string) => void) {
  cont.hidden = false;
  cont.innerHTML = `<div class="pj-reto" role="dialog" aria-label="${esc(rt.titulo)}">
    <p class="pj-reto-tipo">Reto</p>
    <h3>${esc(rt.titulo)}</h3>
    <p class="pj-reto-enunciado">${esc(rt.enunciado)}</p>
    ${leer ? '<button type="button" class="pj-escuchar pj-reto-escuchar">Escuchar</button>' : ''}
    <div class="pj-reto-zona"></div>
    <p class="pj-reto-aviso" aria-live="polite"></p>
  </div>`;
  const zona = cont.querySelector<HTMLElement>('.pj-reto-zona')!; (zona as HTMLElement & { reto?: Reto }).reto = rt;
  const aviso = cont.querySelector<HTMLElement>('.pj-reto-aviso')!;
  cont.querySelector('.pj-reto-escuchar')?.addEventListener('click', () => leer?.(rt.enunciado));
  let fallosAqui = 0;
  const avisar = (t: string, mal = false) => { aviso.textContent = t; aviso.classList.toggle('mal', mal); };
  const fallar = (t: string) => {
    sonido.mal(); alFallar(); fallosAqui++;
    avisar(fallosAqui >= 2 && rt.ayuda ? `${t} Ayuda: ${rt.ayuda}` : t, true);
  };
  const terminar = () => {
    sonido.exclusiva();
    avisar(rt.bien ?? '¡Muy bien!');
    zona.querySelectorAll('button, input').forEach(b => ((b as HTMLButtonElement).disabled = true));
    zona.insertAdjacentHTML('beforeend', '<button type="button" class="pj-boton pj-primario pj-reto-seguir">Seguir</button>');
    const b = zona.querySelector<HTMLButtonElement>('.pj-reto-seguir')!; b.disabled = false; b.focus({ preventScroll: true });
    b.addEventListener('click', () => { cont.hidden = true; cont.innerHTML = ''; fin(); });
  };

  if (rt.tipo === 'una') {
    zona.innerHTML = `<div class="pj-reto-opciones">${barajar(rt.opciones.map((o, i) => ({ o, i }))).map(({ o, i }) => `<button type="button" class="pj-ficha" data-i="${i}">${esc(o.texto)}</button>`).join('')}</div>`;
    zona.querySelectorAll<HTMLButtonElement>('.pj-ficha').forEach(b => b.addEventListener('click', () => {
      const o = rt.opciones[Number(b.dataset.i)];
      if (o.bien) { sonido.bien(); b.classList.add('ok'); terminar(); }
      else { b.classList.remove('temblar'); void b.offsetWidth; b.classList.add('temblar'); fallar(o.porque ?? 'Esa no es. Prueba con otra.'); }
    }));
  }

  if (rt.tipo === 'elegir') {
    const buenas = rt.opciones.filter(o => o.bien).length;
    zona.innerHTML = `<p class="pj-reto-cuenta">Marca ${buenas} y pulsa «Comprobar».</p><div class="pj-reto-opciones">${barajar(rt.opciones.map((o, i) => ({ o, i }))).map(({ o, i }) => `<button type="button" class="pj-ficha" aria-pressed="false" data-i="${i}">${esc(o.texto)}</button>`).join('')}</div>
      <button type="button" class="pj-boton pj-primario pj-reto-comprobar">Comprobar</button>`;
    zona.querySelectorAll<HTMLButtonElement>('.pj-ficha').forEach(b => b.addEventListener('click', () => { sonido.blip(); b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); avisar(''); }));
    zona.querySelector('.pj-reto-comprobar')!.addEventListener('click', () => {
      const marcadas = [...zona.querySelectorAll<HTMLButtonElement>('.pj-ficha[aria-pressed="true"]')].map(b => rt.opciones[Number(b.dataset.i)]);
      const mala = marcadas.find(o => !o.bien);
      if (mala) { fallar(mala.porque ?? `«${mala.texto}» no va.`); return; }
      if (marcadas.length < buenas) { fallar(`Vas bien, pero te falta${buenas - marcadas.length > 1 ? 'n' : ''} ${buenas - marcadas.length}.`); return; }
      zona.querySelector('.pj-reto-comprobar')!.remove(); terminar();
    });
  }

  if (rt.tipo === 'ordenar') {
    let siguiente = 0;
    zona.innerHTML = `<p class="pj-reto-cuenta">Toca los pasos en orden, del primero al último.</p><ol class="pj-reto-hechos"></ol><div class="pj-reto-opciones">${barajar(rt.pasos.map((t, i) => ({ t, i }))).map(({ t, i }) => `<button type="button" class="pj-ficha" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
    const hechos = zona.querySelector('.pj-reto-hechos')!;
    zona.querySelectorAll<HTMLButtonElement>('.pj-ficha').forEach(b => b.addEventListener('click', () => {
      if (Number(b.dataset.i) === siguiente) {
        sonido.blip(); siguiente++; b.remove(); hechos.insertAdjacentHTML('beforeend', `<li>${esc(rt.pasos[siguiente - 1])}</li>`); avisar('');
        if (siguiente === rt.pasos.length) terminar();
      } else { b.classList.remove('temblar'); void b.offsetWidth; b.classList.add('temblar'); fallar(siguiente === 0 ? 'Por ahí no se empieza. ¿Qué va primero?' : 'Ese paso va más tarde.'); }
    }));
  }

  if (rt.tipo === 'relacionar') {
    // Se toca uno de la izquierda y luego su pareja de la derecha
    let elegido = -1, hechas = 0;
    const der = barajar(rt.parejas.map((p, i) => ({ t: p[1], i })));
    zona.innerHTML = `<p class="pj-reto-cuenta">Toca uno de la izquierda y después su pareja de la derecha.</p>
      <div class="pj-reto-parejas"><div>${rt.parejas.map((p, i) => `<button type="button" class="pj-ficha" data-l="${i}">${esc(p[0])}</button>`).join('')}</div>
      <div>${der.map(({ t, i }) => `<button type="button" class="pj-ficha" data-r="${i}">${esc(t)}</button>`).join('')}</div></div>`;
    const izq = [...zona.querySelectorAll<HTMLButtonElement>('[data-l]')];
    izq.forEach(b => b.addEventListener('click', () => { sonido.blip(); elegido = Number(b.dataset.l); izq.forEach(x => x.setAttribute('aria-pressed', String(x === b))); avisar(''); }));
    zona.querySelectorAll<HTMLButtonElement>('[data-r]').forEach(b => b.addEventListener('click', () => {
      if (elegido < 0) { avisar('Primero toca uno de la izquierda.', true); return; }
      if (Number(b.dataset.r) === elegido) {
        sonido.bien(); hechas++;
        const l = izq[elegido]; l.classList.add('ok'); b.classList.add('ok'); l.disabled = b.disabled = true; l.setAttribute('aria-pressed', 'false');
        l.textContent += ' ✓'; elegido = -1;
        if (hechas === rt.parejas.length) terminar();
      } else { b.classList.remove('temblar'); void b.offsetWidth; b.classList.add('temblar'); fallar('Esas dos no van juntas.'); }
    }));
  }

  if (rt.tipo === 'escribir') {
    zona.innerHTML = `<form class="pj-reto-escribir"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Tu respuesta" placeholder="${esc(rt.marcador ?? 'Escribe aquí')}"><button type="submit" class="pj-boton pj-primario">Comprobar</button></form>`;
    const f = zona.querySelector('form')!, input = f.querySelector('input')!;
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (!input.value.trim()) { avisar('Escribe algo primero.', true); return; }
      if (rt.respuestas.some(r => normalizar(r) === normalizar(input.value))) terminar();
      else fallar('No es eso. Revísalo y prueba otra vez.');
    });
    setTimeout(() => input.focus(), 50);
    return;
  }
  (zona.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
}

/** Para las pruebas automáticas (npm run revisar): resuelve el reto abierto con las respuestas buenas. */
(window as unknown as { __resolverReto: () => void }).__resolverReto = () => {
  const zona = document.querySelector<HTMLElement>('.pj-reto-zona'); if (!zona) return;
  const r = (zona as HTMLElement & { reto?: Reto }).reto; if (!r) return;
  const clic = (s: string) => zona.querySelector<HTMLButtonElement>(s)?.click();
  if (r.tipo === 'una') clic(`[data-i="${r.opciones.findIndex(o => o.bien)}"]`);
  if (r.tipo === 'elegir') { r.opciones.forEach((o, i) => o.bien && clic(`[data-i="${i}"]`)); clic('.pj-reto-comprobar'); }
  if (r.tipo === 'ordenar') r.pasos.forEach((_, i) => clic(`[data-i="${i}"]`));
  if (r.tipo === 'relacionar') r.parejas.forEach((_, i) => { clic(`[data-l="${i}"]`); clic(`[data-r="${i}"]`); });
  if (r.tipo === 'escribir') { zona.querySelector('input')!.value = r.respuestas[0]; zona.querySelector('form')!.requestSubmit(); }
};
