// Motor del juego de pistas: andar por la maqueta del pueblo, hablar con personajes y resolver una pista en cada parada
// hasta llegar al final. Sale del juego «Corresponsal» de La Hemeroteca Perdida, adaptado para gente mayor:
// se anda tocando el suelo (o con «Llévame»), letra y botones grandes, sin prisas, y se puede escuchar cada texto.
import * as THREE from 'three';
import { crearPixelado, mat, caja } from './pixel';
import { almacen } from './almacen';
import { crearSonido } from './sonido';
import { retratoSVG, type Retrato } from './retrato';
import { abrirReto, type Reto } from './retos';

/** Lo que se puede pisar: rejilla de celdas cuadradas; 1 = bloqueado. */
export interface Mascara { x0: number; z0: number; ancho: number; alto: number; paso: number; bloqueado: Uint8Array }
export interface Escenario {
  mascara: Mascara;
  animar?: (t: number, foco: THREE.Vector3) => void;
  dibujarMapa?: (c: CanvasRenderingContext2D, aM: (x: number, z: number) => readonly [number, number], escala: number) => void;
}
/** Cómo es una persona en la maqueta (el muñeco 3D). */
export interface Figura { ropa: string; pantalon?: string; piel?: string; pelo?: string; falda?: boolean; pelolargo?: boolean; gafas?: boolean; calvo?: boolean; zapatos?: string }
export interface Personaje {
  id: string; nombre: string; papel: string; x: number; z: number;
  figura: Figura; retrato: Retrato;
  /** Lo que dice la primera vez. */
  lineas: string[];
  /** Lo que dice las demás veces (si no hay, repite `lineas`). */
  otraVez?: string[];
}
export interface Parada {
  id: string;
  /** Nombre del sitio («Plaza de España»). */
  lugar: string;
  x: number; z: number;
  /** Quién da la pista aquí (id de personaje); si no hay nadie, la pista es un objeto que flota. */
  quien?: string;
  objeto?: 'ordenador' | 'movil' | 'tableta' | 'sobre';
  /** Lo que se cuenta al llegar, antes del reto. */
  lineas: string[];
  reto?: Reto;
  /** Al superar el reto: la pista que lleva a la siguiente parada. */
  pista: string;
}
export interface DatosJuego {
  id: string; titulo: string;
  escena: (escena: THREE.Scene) => Escenario;
  inicio: { x: number; z: number; mirando: number };
  jugador: Figura;
  /** Quién explica el juego al empezar (id de personaje): hasta hablar con él no empieza el recorrido. */
  guia: string;
  personajes: Personaje[];
  paradas: Parada[];
  final: { lugar: string; x: number; z: number; lineas: string[]; titulo: string; texto: string };
  bienvenida: { lugar: string; texto: string };
}
interface Partida { fase: number; fallos: number; x: number; z: number; hablados: string[] }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Muñeco de bloques con piernas y brazos que se mueven al andar. */
export function figura3D(f: Figura, escala = 3) {
  const grupo = new THREE.Group(), cuerpo = new THREE.Group();
  const piel = mat(f.piel ?? '#D19A6E'), ropa = mat(f.ropa), pantalon = mat(f.pantalon ?? '#3E4A5C'), zapato = mat(f.zapatos ?? '#2A221C');
  const miembro = (w: number, h: number, d: number, m: THREE.Material, x: number, yPivote: number) => {
    const g = new THREE.Group(); g.position.set(x, yPivote, 0);
    g.add(caja(w, h, d, m, 0, -h, 0)); cuerpo.add(g); return g;
  };
  const piernaI = miembro(0.11, 0.24, 0.12, f.falda ? piel : pantalon, -0.08, 0.24), piernaD = miembro(0.11, 0.24, 0.12, f.falda ? piel : pantalon, 0.08, 0.24);
  piernaI.add(caja(0.12, 0.05, 0.15, zapato, 0, -0.26, 0.015)); piernaD.add(caja(0.12, 0.05, 0.15, zapato, 0, -0.26, 0.015));
  const brazoI = miembro(0.08, 0.24, 0.08, ropa, -0.21, 0.5), brazoD = miembro(0.08, 0.24, 0.08, ropa, 0.21, 0.5);
  brazoI.add(caja(0.07, 0.06, 0.07, piel, 0, -0.3, 0)); brazoD.add(caja(0.07, 0.06, 0.07, piel, 0, -0.3, 0));
  cuerpo.add(caja(0.34, 0.3, 0.24, ropa, 0, 0.22, 0));                                    // torso
  if (f.falda) cuerpo.add(caja(0.38, 0.2, 0.28, mat(f.pantalon ?? '#3E4A5C'), 0, 0.1, 0));  // falda
  cuerpo.add(caja(0.22, 0.22, 0.22, piel, 0, 0.52, 0));                                   // cabeza
  const pelo = mat(f.pelo ?? '#3A2618');
  if (!f.calvo) {
    cuerpo.add(caja(0.24, 0.07, 0.24, pelo, 0, 0.72, 0));                                 // pelo por arriba
    cuerpo.add(caja(0.24, f.pelolargo ? 0.34 : 0.14, 0.06, pelo, 0, f.pelolargo ? 0.38 : 0.6, -0.1)); // nuca o melena
  } else cuerpo.add(caja(0.24, 0.06, 0.06, pelo, 0, 0.56, -0.1));
  if (f.gafas) cuerpo.add(caja(0.2, 0.04, 0.02, mat('#1E1A16'), 0, 0.57, 0.115));
  // Marca en el stencil dónde se ve a la persona: su silueta solo se pinta donde la tapa otra cosa
  cuerpo.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; Object.assign(m.material as THREE.Material, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }); } });
  grupo.add(cuerpo); grupo.scale.setScalar(escala);
  return { grupo, cuerpo, piernaI, piernaD, brazoI, brazoD };
}

/** Objeto de la pista: un ordenador, un móvil, una tableta o un sobre que flota y brilla. */
function objetoPista(tipo: Parada['objeto'] = 'ordenador') {
  const g = new THREE.Group(), brillo = { emissive: '#3A6EA8', emissiveIntensity: 0.6 };
  if (tipo === 'ordenador') {
    g.add(caja(0.9, 0.06, 0.6, mat('#3A3F48'), 0, 0, 0));
    const pantalla = new THREE.Group(); pantalla.position.set(0, 0.06, -0.28); pantalla.rotation.x = -0.25;
    pantalla.add(caja(0.9, 0.62, 0.05, mat('#3A3F48'), 0, 0, 0), caja(0.8, 0.52, 0.02, mat('#7FC3F2', brillo), 0, 0.05, 0.03)); g.add(pantalla);
  } else if (tipo === 'movil') {
    g.add(caja(0.36, 0.7, 0.06, mat('#22262C'), 0, 0, 0), caja(0.3, 0.58, 0.02, mat('#7FC3F2', brillo), 0, 0.06, 0.035));
  } else if (tipo === 'tableta') {
    g.add(caja(0.8, 0.56, 0.05, mat('#22262C'), 0, 0, 0), caja(0.72, 0.48, 0.02, mat('#7FC3F2', brillo), 0, 0.04, 0.03));
  } else {
    g.add(caja(0.8, 0.5, 0.05, mat('#F4EFE2', { emissive: '#8A7A40', emissiveIntensity: 0.25 }), 0, 0, 0), caja(0.16, 0.16, 0.02, mat('#C41F12'), 0, 0.17, 0.03));
  }
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.scale.setScalar(1.6);
  return g;
}

export async function iniciarJuego(raiz: HTMLElement, datos: DatosJuego, opciones: { alSalir: () => void; nueva?: boolean }) {
  const tactil = matchMedia('(pointer: coarse)').matches;
  const sonido = crearSonido();
  const CLAVE = `pd-partida-${datos.id}`;
  if (opciones.nueva) try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  const guardada = almacen.get<Partida>(CLAVE);
  const personajes = new Map(datos.personajes.map(p => [p.id, p]));
  const voz = 'speechSynthesis' in window;

  raiz.innerHTML = `
    <div class="pj-lienzo"></div>
    <div class="pj-barra">
      <button type="button" class="pj-boton" data-pj="salir">Salir</button>
      <span class="pj-grupo">
        <button type="button" class="pj-boton" data-pj="pistas">Mis pistas <b></b></button>
        <button type="button" class="pj-boton" data-pj="sonido" aria-pressed="true">Sonido</button>
      </span>
    </div>
    <canvas class="pj-mapa" width="300" height="300" aria-label="Mapa del pueblo: toca para ampliarlo" role="button" tabindex="0"></canvas>
    <p class="pj-objetivo" aria-live="polite"></p>
    <div class="pj-flecha" hidden aria-hidden="true"><svg viewBox="0 0 16 16" width="26" height="26"><path d="M8 1.5 14 13.5 8 10.2 2 13.5Z" fill="currentColor"/></svg></div>
    <div class="pj-zoom">
      <button type="button" class="pj-boton" data-zoom="-1" aria-label="Acercar">+</button>
      <button type="button" class="pj-boton" data-zoom="1" aria-label="Alejar">−</button>
      <button type="button" class="pj-boton" data-giro="1" aria-label="Girar la vista a la izquierda">⟲</button>
      <button type="button" class="pj-boton" data-giro="-1" aria-label="Girar la vista a la derecha">⟳</button>
    </div>
    <div class="pj-acciones">
      <button type="button" class="pj-llevame">Llévame</button>
      <button type="button" class="pj-hablar" hidden>Hablar</button>
    </div>
    <p class="pj-ayuda">${tactil ? 'Toca el suelo para ir andando, o pulsa «Llévame»' : 'Haz clic en el suelo para ir andando, pulsa «Llévame» o usa las flechas del teclado'}</p>
    <div class="pj-aviso" aria-live="polite"></div>
    <section class="pj-dialogo" hidden aria-live="polite">
      <div class="pj-cara" aria-hidden="true"></div>
      <div class="pj-cuerpo">
        <p class="pj-quien"><b></b> <span></span></p>
        <p class="pj-texto"></p>
        <div class="pj-botones">
          ${voz ? '<button type="button" class="pj-escuchar">Escuchar</button>' : ''}
          <button type="button" class="pj-seguir">Siguiente</button>
        </div>
      </div>
    </section>
    <section class="pj-reto-capa" hidden></section>
    <section class="pj-panel" hidden></section>`;
  const $ = <T extends HTMLElement>(s: string) => raiz.querySelector<T>(s)!;
  const lienzoCont = $('.pj-lienzo');

  // ---------- Escena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  lienzoCont.appendChild(renderer.domElement);
  const lienzo = renderer.domElement;
  Object.assign(lienzo.style, { width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', touchAction: 'none' });
  const pixelado = crearPixelado(renderer);
  const escena = new THREE.Scene();
  const { mascara: M, animar, dibujarMapa } = datos.escena(escena);
  escena.updateMatrixWorld(true);

  // ---------- Lo que se puede andar ----------
  const RW = M.ancho, RH = M.alto, PR = M.paso;
  const celdaX = (k: number) => M.x0 + ((k % RW) + 0.5) * PR, celdaZ = (k: number) => M.z0 + (Math.floor(k / RW) + 0.5) * PR;
  const celda = (x: number, z: number) => { const i = Math.floor((x - M.x0) / PR), j = Math.floor((z - M.z0) / PR); return i < 0 || j < 0 || i >= RW || j >= RH ? -1 : j * RW + i; };
  // Solo vale lo que se alcanza andando desde el inicio (patios cerrados y rincones sueltos, fuera)
  const alcanzable = new Uint8Array(RW * RH);
  const VEC = [1, -1, RW, -RW];
  const vecino = (k: number, d: number) => { const i = k % RW; if ((d === 1 && i === RW - 1) || (d === -1 && i === 0)) return -1; const kk = k + d; return kk >= 0 && kk < RW * RH ? kk : -1; };
  {
    let k0 = celda(datos.inicio.x, datos.inicio.z);
    if (k0 < 0 || M.bloqueado[k0]) console.warn('El inicio cae en un sitio bloqueado');
    const cola = new Int32Array(RW * RH); let ini = 0, fin = 0;
    if (k0 >= 0) { alcanzable[k0] = 1; cola[fin++] = k0; }
    while (ini < fin) { const k = cola[ini++]; for (const d of VEC) { const kk = vecino(k, d); if (kk < 0 || alcanzable[kk] || M.bloqueado[kk]) continue; alcanzable[kk] = 1; cola[fin++] = kk; } }
  }
  const andable = (x: number, z: number) => { const k = celda(x, z); return k >= 0 && alcanzable[k] === 1; };
  /** La celda andable más cercana a (x, z), en un radio de `r` metros. */
  const celdaCercana = (x: number, z: number, r = 4) => {
    const ic = Math.floor((x - M.x0) / PR), jc = Math.floor((z - M.z0) / PR), n = Math.ceil(r / PR);
    let mejor = -1, dm = Infinity;
    for (let j = jc - n; j <= jc + n; j++) for (let i = ic - n; i <= ic + n; i++) {
      if (i < 0 || j < 0 || i >= RW || j >= RH) continue;
      const k = j * RW + i; if (!alcanzable[k]) continue;
      const d = (i - ic) ** 2 + (j - jc) ** 2; if (d < dm) { dm = d; mejor = k; }
    }
    return mejor;
  };
  // Distancia andando a un destino (BFS desde el destino); de ahí salen la flecha, el rastro del mapa y «Llévame»
  const distancia = new Int32Array(RW * RH), colaB = new Int32Array(RW * RH);
  let destinoCamino = '';
  const calcularCamino = (x: number, z: number) => {
    const clave = x.toFixed(1) + ',' + z.toFixed(1); if (clave === destinoCamino) return; destinoCamino = clave;
    distancia.fill(-1);
    const k0 = celdaCercana(x, z, 8); if (k0 < 0) return;
    distancia[k0] = 0; let ini = 0, fin = 0; colaB[fin++] = k0;
    while (ini < fin) { const k = colaB[ini++]; for (const d of VEC) { const kk = vecino(k, d); if (kk < 0 || distancia[kk] >= 0 || !alcanzable[kk]) continue; distancia[kk] = distancia[k] + 1; colaB[fin++] = kk; } }
  };
  const caminoDesde = (x: number, z: number) => {
    const ruta: number[] = []; let k = celdaCercana(x, z);
    if (k < 0 || distancia[k] < 0) return ruta;
    while (distancia[k] > 0 && ruta.length < 20000) {
      let sig = -1;
      for (const d of VEC) { const kk = vecino(k, d); if (kk >= 0 && distancia[kk] >= 0 && distancia[kk] < distancia[k]) { sig = kk; break; } }
      if (sig < 0) break; ruta.push(sig); k = sig;
    }
    return ruta;
  };
  const despejado = (ax: number, az: number, bx: number, bz: number) => {
    const pasos = Math.ceil(Math.hypot(bx - ax, bz - az) / (PR * 0.5));
    for (let s = 1; s < pasos; s++) if (!andable(ax + (bx - ax) * s / pasos, az + (bz - az) * s / pasos)) return false;
    return true;
  };

  // ---------- Jugador ----------
  const yo = figura3D(datos.jugador);
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 24), new THREE.MeshBasicMaterial({ color: '#C41F12' }));
  aro.rotation.x = -Math.PI / 2; aro.position.y = 0.03; yo.grupo.add(aro);
  const pos = new THREE.Vector3(datos.inicio.x, 0, datos.inicio.z);
  if (guardada && andable(guardada.x, guardada.z)) pos.set(guardada.x, 0, guardada.z);
  yo.grupo.position.copy(pos); yo.grupo.rotation.y = datos.inicio.mirando; escena.add(yo.grupo);

  // ---------- Estado de la partida ----------
  // fase 0: hablar con la guía · 1..n: paradas · n+1: ir al final · n+2: terminado
  let fase = guardada?.fase ?? 0, fallos = guardada?.fallos ?? 0;
  const hablados = new Set<string>(guardada?.hablados ?? []);
  const N = datos.paradas.length;
  const guardar = () => almacen.set(CLAVE, { fase, fallos, x: pos.x, z: pos.z, hablados: [...hablados] } satisfies Partida);

  // ---------- Personajes, objetos de pista y marca del destino ----------
  const figuras = datos.personajes.map(p => {
    const f = figura3D(p.figura); f.grupo.position.set(p.x, 0, p.z);
    f.grupo.rotation.y = Math.atan2(pos.x - p.x, pos.z - p.z); escena.add(f.grupo);
    return { p, f, fase: Math.random() * 6 };
  });
  const objetos = datos.paradas.map(pd => {
    if (pd.quien) return null;
    const g = objetoPista(pd.objeto); g.position.set(pd.x, 1.4, pd.z); g.visible = false; escena.add(g); return g;
  });
  // Marca del sitio al que hay que ir: rombo dorado y un haz de luz que se ve de lejos
  const marca = new THREE.Group();
  const rombo = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), mat('#E8B83A', { emissive: '#E8B83A', emissiveIntensity: 0.6 })); rombo.scale.y = 1.4;
  const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 30, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#FFE08A', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  haz.position.y = 19; marca.add(rombo, haz); escena.add(marca);
  // Destino de un toque en el suelo
  const destinoAro = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 24), new THREE.MeshBasicMaterial({ color: '#E8B83A', transparent: true }));
  destinoAro.rotation.x = -Math.PI / 2; destinoAro.position.y = 0.05; destinoAro.visible = false; escena.add(destinoAro);

  // ---------- Gente vista a través de las casas ----------
  // Lo que tapa una casa se pinta encima como una silueta de color (el jugador en rojo; los demás, en dorado)
  const silueta = (color: string) => new THREE.MeshBasicMaterial({ color, depthWrite: false, depthFunc: THREE.GreaterDepth, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilZPass: THREE.ReplaceStencilOp, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp });
  const fantasmaYo = silueta('#C41F12'), fantasmaOtros = silueta('#E8B83A');
  const conFantasma: [THREE.Object3D, THREE.Material][] = [[yo.grupo, fantasmaYo], ...figuras.map(f => [f.f.grupo, fantasmaOtros] as [THREE.Object3D, THREE.Material])];
  const guardados = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const dibujarFantasmas = () => {
    const auto0 = renderer.autoClear; renderer.autoClear = false;
    for (const [o, m] of conFantasma) {
      if (!o.visible) continue;
      o.traverse(x => { const me = x as THREE.Mesh; if (me.isMesh) { guardados.set(me, me.material); me.material = m; } });
      renderer.render(o, camara);
      for (const [me, mt] of guardados) me.material = mt; guardados.clear();
    }
    renderer.autoClear = auto0;
  };

  // ---------- Cámara ----------
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  let azimut = Math.PI * 0.22, azimutObjetivo = azimut;
  let visto = tactil ? 24 : 30, vistoActual = visto;
  const elevacion = Math.PI * 0.33, mira = pos.clone(); // bastante desde arriba: las casas tapan menos
  let foco: THREE.Vector3 | null = null;
  let ancho = 1, alto = 1;
  // en vertical (móvil), que quepan al menos 30 m de ancho
  const encuadrar = () => { const a = ancho / alto, m = vistoActual * Math.max(1, 0.9 / a) / 2; camara.left = -m * a; camara.right = m * a; camara.top = m; camara.bottom = -m; camara.updateProjectionMatrix(); };
  const ajustar = () => { ancho = Math.max(1, lienzoCont.clientWidth); alto = Math.max(1, lienzoCont.clientHeight); pixelado.ajustar(ancho, alto, 3); encuadrar(); };
  const colocarCamara = () => {
    const r = 150;
    camara.position.set(mira.x + r * Math.cos(elevacion) * Math.sin(azimut), mira.y + r * Math.sin(elevacion), mira.z + r * Math.cos(elevacion) * Math.cos(azimut));
    camara.lookAt(mira); camara.updateMatrixWorld();
  };
  const zoom = (f: number) => { visto = Math.min(70, Math.max(12, visto * f)); };
  const girar = (s: number) => { azimutObjetivo += s * Math.PI / 2; sonido.blip(); };

  // ---------- Andar solo hacia un sitio («Llévame» o tocar el suelo) ----------
  let auto: { x: number; z: number; ruta: number[]; alLlegar?: () => void } | null = null;
  const irA = (x: number, z: number, alLlegar?: () => void) => {
    calcularCamino(x, z); const ruta = caminoDesde(pos.x, pos.z);
    if (!ruta.length && Math.hypot(x - pos.x, z - pos.z) > 1) { avisar('Por ahí no se puede pasar.'); return; }
    auto = { x, z, ruta, alLlegar }; destinoAro.position.set(x, 0.05, z); destinoAro.visible = true;
  };
  const parar = () => { auto = null; destinoAro.visible = false; };

  // ---------- Controles ----------
  const teclas = new Set<string>();
  const ocupado = () => !$('.pj-dialogo').hidden || !$('.pj-panel').hidden || !$('.pj-reto-capa').hidden;
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { if (!$('.pj-panel').hidden && fase <= N + 1) cerrarPanel(); return; }
    if (ocupado()) { if ((k === ' ' || k === 'enter') && !dlg.hidden && document.activeElement?.tagName !== 'BUTTON') { e.preventDefault(); dlgSeguir.click(); } return; }
    if ([' ', 'enter'].includes(k)) { e.preventDefault(); hablar(); return; }
    if (k === 'q') girar(1); else if (k === 'e') girar(-1);
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); teclas.add(k); parar(); }
  };
  const onKeyUp = (e: KeyboardEvent) => teclas.delete(e.key.toLowerCase());
  const onBlur = () => teclas.clear();
  addEventListener('keydown', onKeyDown); addEventListener('keyup', onKeyUp); addEventListener('blur', onBlur);

  // Tocar el suelo: andar hasta allí. Dos dedos: acercar o alejar. Arrastrar un dedo: mover la vista un poco no hace falta.
  const dedos = new Map<number, { x: number; y: number; x0: number; y0: number }>();
  let pellizco = 0;
  const rayo = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), punto = new THREE.Vector3(), ndc = new THREE.Vector2();
  lienzo.addEventListener('pointerdown', e => {
    sonido.activar(); lienzo.setPointerCapture(e.pointerId);
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    if (dedos.size === 2) { const [a, b] = [...dedos.values()]; pellizco = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  lienzo.addEventListener('pointermove', e => {
    const d = dedos.get(e.pointerId); if (!d) return; d.x = e.clientX; d.y = e.clientY;
    if (dedos.size === 2 && pellizco > 0) { const [a, b] = [...dedos.values()], n = Math.hypot(a.x - b.x, a.y - b.y); zoom(pellizco / n); pellizco = n; }
  });
  const soltar = (e: PointerEvent) => {
    const d = dedos.get(e.pointerId); const eraUno = dedos.size === 1; dedos.delete(e.pointerId); if (dedos.size < 2) pellizco = 0;
    if (!d || !eraUno || e.type === 'pointercancel' || ocupado()) return;
    if (Math.hypot(d.x - d.x0, d.y - d.y0) > 14) return; // era un arrastre, no un toque
    const r = lienzo.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(ndc, camara); if (!rayo.ray.intersectPlane(plano, punto)) return;
    // ¿Ha tocado a alguien? Entonces va hasta él y habla
    const p = figuras.find(f => Math.hypot(f.p.x - punto.x, f.p.z - punto.z) < 2.2);
    if (p) { irA(p.p.x, p.p.z, () => conversar(p.p)); sonido.blip(); return; }
    const k = celdaCercana(punto.x, punto.z, 3);
    if (k < 0) { avisar('Ahí no se puede ir. Toca una calle.'); return; }
    sonido.blip(); irA(celdaX(k), celdaZ(k));
  };
  lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar);
  lienzo.addEventListener('wheel', e => { e.preventDefault(); zoom(Math.exp(e.deltaY * 0.001)); }, { passive: false });
  raiz.querySelectorAll<HTMLButtonElement>('[data-giro]').forEach(b => b.addEventListener('click', () => girar(Number(b.dataset.giro))));
  raiz.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(b => b.addEventListener('click', () => { sonido.blip(); zoom(Number(b.dataset.zoom) > 0 ? 1.3 : 1 / 1.3); }));
  $('[data-pj="salir"]').addEventListener('click', () => salir());
  $('[data-pj="pistas"]').addEventListener('click', () => { sonido.blip(); abrirPistas(); });
  const btnSonido = $('[data-pj="sonido"]');
  const pintarSonido = () => { btnSonido.textContent = sonido.mudo ? 'Sin sonido' : 'Sonido'; btnSonido.setAttribute('aria-pressed', String(!sonido.mudo)); };
  btnSonido.addEventListener('click', () => { sonido.activar(); sonido.alternar(); pintarSonido(); }); pintarSonido();
  $('.pj-hablar').addEventListener('click', () => hablar());
  $('.pj-llevame').addEventListener('click', () => { sonido.blip(); llevame(); });

  // ---------- Avisos breves ----------
  const avisoEl = $('.pj-aviso'); let avisoT = 0;
  const avisar = (texto: string) => { avisoEl.textContent = texto; avisoEl.classList.add('visible'); clearTimeout(avisoT); avisoT = window.setTimeout(() => avisoEl.classList.remove('visible'), 3200); };

  // ---------- Diálogos: el texto sale entero, se pasa con «Siguiente» y se puede escuchar ----------
  const dlg = $('.pj-dialogo'), dlgTexto = $('.pj-texto'), dlgSeguir = $<HTMLButtonElement>('.pj-seguir'), cara = $('.pj-cara');
  let alSeguir: (() => void) | null = null;
  const caras = new Map<string, string>();
  for (const p of datos.personajes) caras.set(p.nombre, retratoSVG(p.retrato, { tam: 88 }));
  const callar = () => { if (voz) speechSynthesis.cancel(); };
  const leer = (texto: string) => {
    if (!voz) return; callar();
    const u = new SpeechSynthesisUtterance(texto); u.lang = 'es-ES'; u.rate = 0.92;
    const es = speechSynthesis.getVoices().find(v => v.lang === 'es-ES') ?? speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
    if (es) u.voice = es; speechSynthesis.speak(u);
  };
  raiz.querySelector('.pj-escuchar')?.addEventListener('click', () => leer(dlgTexto.textContent ?? ''));
  const decir = (quien: string, papel: string, texto: string, despues: () => void, boton = 'Siguiente') => {
    callar(); dlg.hidden = false;
    const svg = caras.get(quien); cara.innerHTML = svg ?? ''; dlg.classList.toggle('pj-con-cara', !!svg);
    $('.pj-quien b').textContent = quien; $('.pj-quien span').textContent = papel;
    dlgTexto.textContent = texto; dlgSeguir.textContent = boton; alSeguir = despues;
    dlgSeguir.focus({ preventScroll: true });
  };
  dlgSeguir.addEventListener('click', () => { sonido.blip(); callar(); const f = alSeguir; alSeguir = null; f?.(); });
  const cerrarDialogo = () => { callar(); dlg.hidden = true; alSeguir = null; foco = null; actualizarObjetivo(); };
  const encadenar = (quien: string, papel: string, lineas: string[], fin: () => void, ultimo = 'Siguiente') => {
    const paso = (i: number) => (i >= lineas.length ? fin() : decir(quien, papel, lineas[i], () => paso(i + 1), i === lineas.length - 1 ? ultimo : 'Siguiente'));
    paso(0);
  };

  // ---------- Conversaciones y paradas ----------
  const parada = () => (fase >= 1 && fase <= N ? datos.paradas[fase - 1] : null);
  const conversar = (p: Personaje) => {
    parar(); foco = new THREE.Vector3((p.x + pos.x) / 2, 0.8, (p.z + pos.z) / 2);
    const pd = parada();
    if (pd && pd.quien === p.id) { resolverParada(pd); return; }
    const primera = !hablados.has(p.id);
    const lineas = primera || !p.otraVez?.length ? p.lineas : p.otraVez;
    hablados.add(p.id);
    encadenar(p.nombre, p.papel, lineas, () => {
      if (p.id === datos.guia && fase === 0) { fase = 1; guardar(); sonido.exclusiva(); actualizarObjetivo(); mostrarPista(); return; }
      cerrarDialogo(); guardar();
    }, 'Cerrar');
  };
  /** La pista vigente, en grande, con el sitio al que ir. */
  const mostrarPista = () => {
    const pd = parada();
    if (pd) {
      const anterior = fase >= 2 ? datos.paradas[fase - 2].pista : null;
      decir(`Pista ${fase} de ${N}`, 'Dónde ir ahora', anterior ?? `Primera parada: ${pd.lugar}. Sigue la flecha amarilla o pulsa «Llévame».`, cerrarDialogo, 'Vamos');
    } else if (fase === N + 1) decir('Última pista', 'Dónde ir ahora', datos.paradas[N - 1]?.pista ?? `Ve a ${datos.final.lugar}.`, cerrarDialogo, 'Vamos');
  };
  const resolverParada = (pd: Parada) => {
    parar(); foco = new THREE.Vector3(pd.x, 0.8, pd.z);
    const quien = pd.quien ? personajes.get(pd.quien) : null;
    const nombre = quien?.nombre ?? pd.lugar, papel = quien ? pd.lugar : `Pista ${fase} de ${N}`;
    const tras = () => {
      sonido.exclusiva();
      fase++; guardar(); actualizarObjetivo();
      const obj = objetos[fase - 2]; if (obj) obj.visible = false;
      decir(fase <= N ? `Pista ${fase - 1} de ${N} resuelta` : '¡Última pista resuelta!', 'Siguiente destino', pd.pista, cerrarDialogo, 'Vamos');
    };
    encadenar(nombre, papel, pd.lineas, () => {
      if (!pd.reto) { tras(); return; }
      callar(); dlg.hidden = true;
      abrirReto($('.pj-reto-capa'), pd.reto, sonido, () => { fallos++; guardar(); }, tras, leer);
    }, pd.reto ? 'Al reto' : 'Siguiente');
  };
  const llegarAlFinal = () => {
    parar(); foco = new THREE.Vector3(datos.final.x, 1, datos.final.z);
    encadenar(datos.final.lugar, '¡Habéis llegado!', datos.final.lineas, () => { fase = N + 2; guardar(); terminar(); }, 'Ver el final');
  };

  // ---------- Objetivo, cercanía y «Llévame» ----------
  const objetivo = () => {
    if (fase === 0) { const g = personajes.get(datos.guia)!; return { x: g.x, z: g.z, texto: `Habla con ${g.nombre}: te explica el juego.` }; }
    const pd = parada();
    if (pd) return { x: pd.x, z: pd.z, texto: `Pista ${fase} de ${N}: ve a ${pd.lugar}.` };
    if (fase === N + 1) return { x: datos.final.x, z: datos.final.z, texto: `Última parada: ${datos.final.lugar}.` };
    return null;
  };
  let objetivoActual = objetivo();
  const actualizarObjetivo = () => {
    objetivoActual = objetivo();
    $('.pj-objetivo').textContent = objetivoActual?.texto ?? '';
    $('[data-pj="pistas"] b').textContent = `${Math.max(0, Math.min(fase - 1, N))}/${N}`;
    if (objetivoActual) calcularCamino(objetivoActual.x, objetivoActual.z);
    marca.visible = !!objetivoActual; if (objetivoActual) marca.position.set(objetivoActual.x, 0, objetivoActual.z);
    objetos.forEach((o, i) => { if (o) o.visible = i === fase - 1; });
    const pd = parada(); if (pd && !pd.quien) marca.position.y = 1.6;
    haz.visible = !(fase === 0 || pd?.quien); // sobre una persona, el haz la taparía: basta el rombo
  };
  const llevame = () => {
    if (ocupado() || !objetivoActual) return;
    const o = objetivoActual;
    if (fase === 0) { const g = personajes.get(datos.guia)!; irA(g.x, g.z, () => conversar(g)); return; }
    const pd = parada();
    if (pd) { irA(pd.x, pd.z, () => (pd.quien ? conversar(personajes.get(pd.quien)!) : resolverParada(pd))); return; }
    irA(o.x, o.z, llegarAlFinal);
  };
  type Cerca = { tipo: 'persona'; p: Personaje } | { tipo: 'objeto'; pd: Parada } | { tipo: 'final' };
  const cerca = (): Cerca | null => {
    let mejor: Cerca | null = null, dm = 3;
    for (const { p } of figuras) { const d = Math.hypot(p.x - pos.x, p.z - pos.z); if (d < dm) { dm = d; mejor = { tipo: 'persona', p }; } }
    const pd = parada(); if (pd && !pd.quien && Math.hypot(pd.x - pos.x, pd.z - pos.z) < 3.2) mejor = { tipo: 'objeto', pd };
    if (fase === N + 1 && Math.hypot(datos.final.x - pos.x, datos.final.z - pos.z) < 5) mejor = { tipo: 'final' };
    return mejor;
  };
  const hablar = () => {
    if (ocupado()) return; const c = cerca(); if (!c) return;
    if (c.tipo === 'persona') conversar(c.p); else if (c.tipo === 'objeto') resolverParada(c.pd); else llegarAlFinal();
  };
  // Al llegar andando a la parada o al final, se abre solo (una vez por llegada)
  let yaAbierto = '';

  // ---------- Minimapa ----------
  const mapa = $<HTMLCanvasElement>('.pj-mapa'), mctx = mapa.getContext('2d')!;
  const MW = mapa.width, MH = mapa.height;
  const LX0 = M.x0, LZ0 = M.z0, LW = RW * PR, LH = RH * PR;
  const fondo = document.createElement('canvas'); fondo.width = 1200; fondo.height = Math.round(1200 * LH / LW);
  const escF = fondo.width / LW;
  dibujarMapa?.(fondo.getContext('2d')!, (x, z) => [(x - LX0) * escF, (z - LZ0) * escF] as const, escF);
  let mapaGrande = false, radioMapa = 70; // metros alrededor del jugador que enseña el minimapa
  const alternarMapa = () => { mapaGrande = !mapaGrande; mapa.classList.toggle('grande', mapaGrande); sonido.blip(); };
  mapa.addEventListener('click', alternarMapa);
  mapa.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarMapa(); } });
  let rutaVista: number[] = [];
  const pintarMapa = (t: number) => {
    const r = mapaGrande ? Math.max(LW, LH) * 0.55 : radioMapa;
    const cxm = mapaGrande ? LX0 + LW / 2 : pos.x, czm = mapaGrande ? LZ0 + LH / 2 : pos.z;
    const k = MW / (2 * r), aM = (x: number, z: number) => [(x - cxm) * k + MW / 2, (z - czm) * k + MH / 2] as const;
    mctx.fillStyle = '#C9B47E'; mctx.fillRect(0, 0, MW, MH);
    const [fx, fz] = aM(LX0, LZ0); mctx.imageSmoothingEnabled = true; mctx.drawImage(fondo, fx, fz, LW * k, LH * k);
    // camino hasta el objetivo
    if (rutaVista.length) {
      mctx.fillStyle = '#C41F12'; const cada = Math.max(2, Math.round((mapaGrande ? 8 : 2.5) / PR));
      for (let s = cada; s < rutaVista.length; s += cada) { const [a, b] = aM(celdaX(rutaVista[s]), celdaZ(rutaVista[s])); mctx.fillRect(a - 1.5, b - 1.5, 3, 3); }
    }
    if (objetivoActual) { const [a, b] = aM(objetivoActual.x, objetivoActual.z); mctx.fillStyle = '#E8B83A'; mctx.strokeStyle = '#111'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(a, b, 7 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2); mctx.fill(); mctx.stroke(); }
    const [px, pz] = aM(pos.x, pos.z), a = yo.grupo.rotation.y;
    mctx.save(); mctx.translate(px, pz); mctx.rotate(-a + Math.PI);
    mctx.fillStyle = '#C41F12'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.moveTo(0, -10); mctx.lineTo(8, 8); mctx.lineTo(-8, 8); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
    mctx.strokeStyle = '#111'; mctx.lineWidth = 4; mctx.strokeRect(2, 2, MW - 4, MH - 4);
  };

  // ---------- Paneles: mis pistas y el final ----------
  const panel = $('.pj-panel');
  const cerrarPanel = () => { panel.hidden = true; };
  const abrirPistas = () => {
    panel.hidden = false;
    const hechas = datos.paradas.slice(0, Math.max(0, fase - 1));
    panel.innerHTML = `<div class="pj-hoja">
      <p class="pj-dato">Mis pistas · ${Math.min(hechas.length, N)} de ${N}</p>
      <h2>${esc(datos.titulo)}</h2>
      ${fase === 0 ? '<p>Todavía no has empezado. Habla con quien te explica el juego.</p>' : ''}
      <ol class="pj-lista">${datos.paradas.map((pd, i) => i < fase - 1 ? `<li class="ok"><b>${esc(pd.lugar)}</b><br>${esc(pd.pista)}</li>` : i === fase - 1 ? `<li class="ahora"><b>Ahora: ${esc(pd.lugar)}</b></li>` : '<li class="bloq"><i>Por descubrir</i></li>').join('')}
        <li class="${fase === N + 1 ? 'ahora' : fase > N + 1 ? 'ok' : 'bloq'}"><b>${fase >= N + 1 ? esc(datos.final.lugar) : 'Final'}</b></li></ol>
      <button type="button" class="pj-boton pj-cerrar">Volver al juego</button></div>`;
    panel.querySelector('.pj-cerrar')!.addEventListener('click', cerrarPanel);
  };
  const terminar = () => {
    callar(); dlg.hidden = true; foco = new THREE.Vector3(datos.final.x, 1, datos.final.z);
    sonido.fanfarria(); marca.visible = false;
    panel.hidden = false;
    panel.innerHTML = `<article class="pj-hoja pj-diploma">
      <p class="pj-dato">${esc(datos.titulo)}</p>
      <h2>${esc(datos.final.titulo)}</h2>
      <p>${esc(datos.final.texto)}</p>
      <p class="pj-sello">${N} pistas resueltas${fallos ? ` · ${fallos} ${fallos === 1 ? 'intento fallido' : 'intentos fallidos'}` : ' · sin un solo fallo'}</p>
      <div class="pj-acciones-final">
        <button type="button" class="pj-boton pj-primario" data-pj="otra">Jugar otra vez</button>
        <button type="button" class="pj-boton" data-pj="fuera">Salir</button>
      </div></article>`;
    panel.querySelector('[data-pj="otra"]')!.addEventListener('click', () => { try { localStorage.removeItem(CLAVE); } catch { /* */ } salir(true); });
    panel.querySelector('[data-pj="fuera"]')!.addEventListener('click', () => salir());
  };

  // ---------- Bucle ----------
  const flecha = $('.pj-flecha'), botonHablar = $('.pj-hablar'), botonLlevame = $('.pj-llevame');
  const frente = new THREE.Vector3(), derecha = new THREE.Vector3(), mov = new THREE.Vector3(), proy = new THREE.Vector3(), objetivoCam = new THREE.Vector3();
  let previo = performance.now(), raf = 0, andando = 0, ultimoGuardado = 0, ultimaRuta = 0;
  const VELOCIDAD = 6.5;
  const bucle = (ahora: number) => {
    const dt = Math.min(0.05, (ahora - previo) / 1000), dtMov = Math.min(0.25, (ahora - previo) / 1000); previo = ahora; const t = ahora / 1000; // dtMov: aunque el aparato vaya a pocos fotogramas, se anda a la misma velocidad
    let ix = 0, iy = 0;
    if (teclas.has('a') || teclas.has('arrowleft')) ix -= 1;
    if (teclas.has('d') || teclas.has('arrowright')) ix += 1;
    if (teclas.has('w') || teclas.has('arrowup')) iy += 1;
    if (teclas.has('s') || teclas.has('arrowdown')) iy -= 1;
    let fuerza = Math.min(1, Math.hypot(ix, iy));
    mov.set(0, 0, 0);
    if (!ocupado() && fuerza > 0.08) {
      frente.set(-Math.sin(azimut), 0, -Math.cos(azimut)); derecha.set(Math.cos(azimut), 0, -Math.sin(azimut));
      mov.copy(derecha).multiplyScalar(ix).addScaledVector(frente, iy).normalize().multiplyScalar(VELOCIDAD * fuerza * Math.min(dtMov, 0.1));
    } else if (!ocupado() && auto) {
      // seguir la ruta: hacia el punto más lejano que se ve en línea recta
      const ruta = auto.ruta;
      // quitar lo ya andado: hasta la celda de la ruta más cercana a donde estás (los atajos se saltan celdas)
      { let mejor = -1, dm = Infinity; for (let s = 0; s < Math.min(ruta.length, 80); s++) { const dd = Math.hypot(celdaX(ruta[s]) - pos.x, celdaZ(ruta[s]) - pos.z); if (dd < dm) { dm = dd; mejor = s; } }
        if (mejor > 0) ruta.splice(0, mejor); }
      while (ruta.length && Math.hypot(celdaX(ruta[0]) - pos.x, celdaZ(ruta[0]) - pos.z) < 0.6) ruta.shift();
      let gx = auto.x, gz = auto.z;
      if (ruta.length) { let g = ruta[0]; for (let s = 1; s < Math.min(ruta.length, 40); s += 2) { if (despejado(pos.x, pos.z, celdaX(ruta[s]), celdaZ(ruta[s]))) g = ruta[s]; else break; } gx = celdaX(g); gz = celdaZ(g); }
      const d = Math.hypot(gx - pos.x, gz - pos.z), dFin = Math.hypot(auto.x - pos.x, auto.z - pos.z);
      // fin de la ruta: ya está (si el destino es una persona, se queda a su lado y habla)
      if (!ruta.length && (dFin < (auto.alLlegar ? 2.6 : 0.4) || d < 0.05 || !despejado(pos.x, pos.z, auto.x, auto.z))) { const f = auto.alLlegar; parar(); f?.(); }
      else if (d > 0.01) {
        // «Llévame» va más deprisa cuanto más lejos queda (si no, cruzar el pueblo sería eterno)
        const v = Math.min(16, VELOCIDAD + ruta.length * PR / 25);
        fuerza = 1; mov.set(gx - pos.x, 0, gz - pos.z).multiplyScalar(Math.min(1, v * dtMov / d));
      }
    }
    if (mov.lengthSq() > 0) {
      if (andable(pos.x + mov.x, pos.z + mov.z)) { pos.x += mov.x; pos.z += mov.z; }
      else if (andable(pos.x + mov.x, pos.z)) pos.x += mov.x;
      else if (andable(pos.x, pos.z + mov.z)) pos.z += mov.z;
      else if (auto && !auto.ruta.length) { const f = auto.alLlegar; parar(); f?.(); } // al lado del destino y no se puede pegar más
      let dg = Math.atan2(mov.x, mov.z) - yo.grupo.rotation.y; dg = Math.atan2(Math.sin(dg), Math.cos(dg));
      yo.grupo.rotation.y += dg * Math.min(1, dt * 12);
      andando += dt * 10 * fuerza;
      if (ahora - ultimoGuardado > 3000) { ultimoGuardado = ahora; guardar(); }
    } else { andando *= 0.8; fuerza = 0; }
    yo.grupo.position.lerp(pos, Math.min(1, dt * 18));
    const z = Math.sin(andando) * Math.min(1, fuerza * 1.5);
    yo.piernaI.rotation.x = z * 0.7; yo.piernaD.rotation.x = -z * 0.7; yo.brazoI.rotation.x = -z * 0.5; yo.brazoD.rotation.x = z * 0.5;
    yo.cuerpo.position.y = Math.abs(Math.sin(andando)) * 0.04 * Math.min(1, fuerza * 1.5);

    // ¿Ha llegado andando (sin «Llévame») a la parada o al final? Se abre solo
    if (!ocupado() && objetivoActual && fase >= 1) {
      const pd = parada(), clave = String(fase);
      const dentro = pd ? (!pd.quien && Math.hypot(pd.x - pos.x, pd.z - pos.z) < 2.6) : fase === N + 1 && Math.hypot(datos.final.x - pos.x, datos.final.z - pos.z) < 4;
      if (dentro && yaAbierto !== clave) { yaAbierto = clave; parar(); if (pd) resolverParada(pd); else llegarAlFinal(); }
      if (!dentro && yaAbierto === clave) yaAbierto = '';
    }

    // mundo
    animar?.(t, pos);
    for (const f of figuras) {
      const d = Math.hypot(f.p.x - pos.x, f.p.z - pos.z);
      if (d < 9) { let dg = Math.atan2(pos.x - f.p.x, pos.z - f.p.z) - f.f.grupo.rotation.y; dg = Math.atan2(Math.sin(dg), Math.cos(dg)); f.f.grupo.rotation.y += dg * Math.min(1, dt * 4); }
      f.f.brazoD.rotation.x = Math.sin(t * 1.4 + f.fase) * 0.12; f.f.cuerpo.position.y = Math.abs(Math.sin(t * 1.6 + f.fase)) * 0.015;
    }
    objetos.forEach(o => { if (o?.visible) { o.rotation.y += dt * 1.2; o.position.y = 1.4 + Math.sin(t * 2.4) * 0.15; } });
    rombo.rotation.y += dt * 2; rombo.position.y = (parada() && !parada()!.quien ? 3.6 : 3.4) + Math.sin(t * 3.3) * 0.15;
    (haz.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 2) * 0.08;
    if (destinoAro.visible) destinoAro.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
    // cámara
    azimut += (azimutObjetivo - azimut) * Math.min(1, dt * 6);
    if (foco) objetivoCam.copy(foco); else objetivoCam.set(yo.grupo.position.x, 0.6, yo.grupo.position.z);
    mira.lerp(objetivoCam, Math.min(1, dt * 4));
    const vd = visto * (foco ? 0.7 : 1);
    if (Math.abs(vistoActual - vd) > 0.01) { vistoActual += (vd - vistoActual) * Math.min(1, dt * 4); encuadrar(); }
    colocarCamara();
    pixelado.dibujar(escena, camara, true, dibujarFantasmas);

    // ruta hasta el objetivo (para la flecha y el mapa), cinco veces por segundo
    if (objetivoActual && ahora - ultimaRuta > 200) { ultimaRuta = ahora; calcularCamino(objetivoActual.x, objetivoActual.z); rutaVista = caminoDesde(pos.x, pos.z); }
    if (!objetivoActual) rutaVista = [];
    pintarMapa(t);
    const c = ocupado() ? null : cerca();
    botonHablar.hidden = !c;
    if (c) botonHablar.textContent = c.tipo === 'persona' ? `Hablar con ${c.p.nombre}` : c.tipo === 'objeto' ? 'Ver la pista' : 'Llegar';
    botonLlevame.hidden = ocupado() || !objetivoActual;
    botonLlevame.textContent = auto ? 'Andando…' : fase === 0 ? `Llévame con ${personajes.get(datos.guia)!.nombre}` : 'Llévame a la pista';
    // flecha amarilla junto al jugador, señalando el camino de verdad (por las calles)
    if (objetivoActual && rutaVista.length > 6 && !ocupado()) {
      let g = rutaVista[0];
      for (let s = 1; s < Math.min(rutaVista.length, 30); s++) { if (despejado(pos.x, pos.z, celdaX(rutaVista[s]), celdaZ(rutaVista[s]))) g = rutaVista[s]; else break; }
      proy.set(celdaX(g), 0.6, celdaZ(g)).project(camara); const gx = (proy.x + 1) / 2 * ancho, gy = (1 - proy.y) / 2 * alto;
      proy.set(pos.x, 0.6, pos.z).project(camara); const cx = (proy.x + 1) / 2 * ancho, cy = (1 - proy.y) / 2 * alto;
      const ang = Math.atan2(gy - cy, gx - cx), k = Math.max(80, Math.min(ancho, alto) * 0.17);
      flecha.hidden = false; flecha.style.transform = `translate(${cx + Math.cos(ang) * k}px, ${cy + Math.sin(ang) * k}px) translate(-50%,-50%) rotate(${ang + Math.PI / 2}rad)`;
    } else flecha.hidden = true;
    raf = requestAnimationFrame(bucle);
  };

  const ro = new ResizeObserver(ajustar); ro.observe(lienzoCont);
  ajustar(); colocarCamara(); actualizarObjetivo();
  raf = requestAnimationFrame(bucle);
  const vuelta = !!guardada && fase > 0;
  if (fase > N + 1) terminar();
  else decir(datos.bienvenida.lugar, vuelta ? 'Seguimos donde lo dejaste' : 'Bienvenida', vuelta ? `Llevas ${Math.min(fase - 1, N)} de ${N} pistas. ${objetivoActual?.texto ?? ''}` : datos.bienvenida.texto, () => { sonido.activar(); cerrarDialogo(); }, vuelta ? 'Seguir' : 'Empezar');
  // Para las pruebas automáticas
  (raiz as HTMLElement & { prueba?: unknown }).prueba = { auto: () => auto && { x: auto.x, z: auto.z, n: auto.ruta.length, r: auto.ruta.slice(0, 3).map(k => [celdaX(k), celdaZ(k), andable(celdaX(k), celdaZ(k))]) }, ir: (x: number, z: number) => { pos.set(x, 0, z); yo.grupo.position.copy(pos); mira.copy(pos); }, pos: () => [pos.x, pos.z], andable, fase: () => fase, llevame, hablar, alcanzable: (x: number, z: number) => { calcularCamino(x, z); return caminoDesde(pos.x, pos.z).length; } };

  function salir(otra = false) {
    if (fase <= N + 1) guardar();
    callar(); cancelAnimationFrame(raf); ro.disconnect(); clearTimeout(avisoT);
    removeEventListener('keydown', onKeyDown); removeEventListener('keyup', onKeyUp); removeEventListener('blur', onBlur);
    pixelado.destruir(); renderer.dispose(); raiz.innerHTML = '';
    if (otra) iniciarJuego(raiz, datos, opciones); else opciones.alSalir();
  }
}
