// El juego en realidad virtual (Meta Quest 2 y 3, por WebXR desde su navegador). Mismos capítulos, mismo pueblo y
// misma partida guardada que en la pantalla, pero a pie de calle y a tamaño real:
//   - se mueve uno apuntando al suelo con el mando y pulsando el gatillo (teletransporte: no marea; se puede jugar sentado);
//   - el joystick gira la vista de 45 en 45 grados;
//   - los diálogos y los retos salen en un panel flotante delante; se contesta apuntando y pulsando el gatillo;
//   - la pista va en la mano izquierda, como un reloj, y una flecha a la altura de la cintura apunta hacia la zona.
import * as THREE from 'three';
import { figura3D, objetoPista, type DatosJuego, type Personaje, type Parada, type Partida } from '../juego/juego';
import type { Reto } from '../juego/retos';
import { almacen } from '../juego/almacen';
import { crearSonido } from '../juego/sonido';
import { retratoSVG } from '../juego/retrato';
import { Panel, type Boton, type ModeloPanel } from './panel';

const barajar = <T,>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const ALTO_PERSONA = 2.2;     // escala de los muñecos: unos 1,70 m
const TELE_MAX = 22;          // hasta dónde se puede saltar de una vez (m)
const VISTA = 150;            // a partir de aquí no se dibuja (m); la niebla lo disimula

export async function iniciarVR(sesion: XRSession, datos: DatosJuego, opciones: { alSalir: () => void; nueva?: boolean }) {
  const sonido = crearSonido();
  const CLAVE = `pd-partida-${datos.id}`;
  if (opciones.nueva) try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  const guardada = almacen.get<Partida>(CLAVE);
  const personajes = new Map(datos.personajes.map(p => [p.id, p]));
  try { await document.fonts.load("bold 40px 'Atkinson Hyperlegible'"); await document.fonts.load("40px 'Atkinson Hyperlegible'"); } catch { /* sin fuentes: letra del sistema */ }

  // ---------- Render y escena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(800, 600, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;           // en las gafas, sin sombras: que vaya fluido
  renderer.xr.enabled = true; renderer.xr.setReferenceSpaceType('local-floor');
  try { renderer.xr.setFoveation(1); } catch { /* sin foveación */ }
  renderer.domElement.style.display = 'none'; document.body.appendChild(renderer.domElement);

  const escena = new THREE.Scene();
  const { mascara: M, animar } = datos.escena(escena);
  escena.fog = new THREE.Fog('#BFD6E2', 60, VISTA - 10);
  escena.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = false; } });
  escena.updateMatrixWorld(true);
  // Lo lejano no se dibuja: cada malla del pueblo (son teselas de 60 m) se enciende o apaga según la distancia
  const lejanas: { o: THREE.Object3D; x: number; z: number; r: number }[] = [];
  escena.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return;
    m.geometry.computeBoundingSphere(); const s = m.geometry.boundingSphere!.clone().applyMatrix4(m.matrixWorld);
    if (s.radius < 200) lejanas.push({ o: m, x: s.center.x, z: s.center.z, r: s.radius });
    if ((m as unknown as THREE.InstancedMesh).isInstancedMesh) { (m as unknown as THREE.InstancedMesh).computeBoundingSphere(); const b = (m as unknown as THREE.InstancedMesh).boundingSphere!; lejanas[lejanas.length - 1] = { o: m, x: b.center.x, z: b.center.z, r: b.radius }; }
  });

  // ---------- Lo que se puede pisar (igual que en la pantalla) ----------
  const RW = M.ancho, RH = M.alto, PR = M.paso;
  const celda = (x: number, z: number) => { const i = Math.floor((x - M.x0) / PR), j = Math.floor((z - M.z0) / PR); return i < 0 || j < 0 || i >= RW || j >= RH ? -1 : j * RW + i; };
  const alcanzable = new Uint8Array(RW * RH);
  {
    const k0 = celda(datos.inicio.x, datos.inicio.z), cola = new Int32Array(RW * RH); let ini = 0, fin = 0;
    if (k0 >= 0) { alcanzable[k0] = 1; cola[fin++] = k0; }
    while (ini < fin) {
      const k = cola[ini++], i = k % RW;
      for (const kk of [i < RW - 1 ? k + 1 : -1, i > 0 ? k - 1 : -1, k + RW < RW * RH ? k + RW : -1, k - RW]) if (kk >= 0 && !alcanzable[kk] && !M.bloqueado[kk]) { alcanzable[kk] = 1; cola[fin++] = kk; }
    }
  }
  const andable = (x: number, z: number) => { const k = celda(x, z); return k >= 0 && alcanzable[k] === 1; };

  // ---------- Jugador: el «rig» lleva la cámara y los mandos ----------
  const rig = new THREE.Group(); escena.add(rig);
  const camara = new THREE.PerspectiveCamera(70, 1, 0.05, VISTA); rig.add(camara);
  const inicio = guardada && andable(guardada.x, guardada.z) ? guardada : datos.inicio;
  rig.position.set(inicio.x, 0, inicio.z); rig.rotation.y = datos.inicio.mirando + Math.PI; // mirando hacia la calle
  const cabeza = new THREE.Vector3(), adelante = new THREE.Vector3();
  const dondeCabeza = () => { camara.getWorldPosition(cabeza); return cabeza; };
  const rumboCabeza = () => { camara.getWorldDirection(adelante); adelante.y = 0; if (adelante.lengthSq() < 1e-6) adelante.set(0, 0, -1); return adelante.normalize(); };

  // ---------- Estado de la partida (lo mismo que guarda la versión de pantalla) ----------
  let fase = guardada?.fase ?? 0, fallos = guardada?.fallos ?? 0;
  const hablados = new Set<string>(guardada?.hablados ?? []);
  const N = datos.paradas.length;
  const guardar = () => { const h = dondeCabeza(); almacen.set(CLAVE, { fase, fallos, x: h.x, z: h.z, hablados: [...hablados] } satisfies Partida); };
  const parada = () => (fase >= 1 && fase <= N ? datos.paradas[fase - 1] : null);
  const pistaVigente = () => (fase === 1 ? datos.primeraPista : fase >= 2 && fase <= N + 1 ? datos.paradas[fase - 2].pista : '');

  // ---------- Gente y objetos ----------
  const figuras = datos.personajes.map(p => {
    const f = figura3D(p.figura, ALTO_PERSONA); f.grupo.position.set(p.x, 0, p.z); escena.add(f.grupo);
    return { p, f, fase: Math.random() * 6 };
  });
  const objetos = datos.paradas.map(pd => { if (pd.quien) return null; const g = objetoPista(pd.objeto); g.scale.setScalar(0.9); g.position.set(pd.x, 1.1, pd.z); g.visible = false; escena.add(g); return g; });
  const caras = new Map(datos.personajes.map(p => [p.nombre, retratoSVG(p.retrato, { tam: 64 })]));

  // ---------- Mandos: rayo, aro de destino y reloj con la pista ----------
  const panel = new Panel(1.15); escena.add(panel.malla);
  const reloj = new Panel(0.26, 640);
  reloj.malla.renderOrder = 9; // el panel grande, siempre por encima del reloj
  const aro = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color: '#E8B83A', transparent: true, opacity: 0.9, depthWrite: false }));
  aro.rotation.x = -Math.PI / 2; aro.visible = false; escena.add(aro);
  const rayoMat = new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.85 });
  const mandos = [0, 1].map(i => {
    const c = renderer.xr.getController(i), agarre = renderer.xr.getControllerGrip(i);
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
    const linea = new THREE.Line(geo, rayoMat); linea.scale.z = 5; c.add(linea);
    const punta = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshBasicMaterial({ color: '#FFFFFF' })); punta.position.z = -0.02; c.add(punta);
    rig.add(c, agarre);
    const m = { c, agarre, linea, mano: '' as string, gamepad: null as Gamepad | null, giro: false, destino: null as THREE.Vector3 | null, boton: null as string | null };
    c.addEventListener('connected', (e: THREE.Event & { data?: XRInputSource }) => {
      m.mano = e.data?.handedness ?? ''; m.gamepad = e.data?.gamepad ?? null;
      if (m.mano === 'left') { agarre.add(reloj.malla); reloj.malla.position.set(0, 0.06, 0.02); reloj.malla.rotation.set(-Math.PI / 2.6, 0, 0); pintarReloj(); }
    });
    c.addEventListener('disconnected', () => { m.gamepad = null; });
    c.addEventListener('selectend', () => pulsar(m));
    return m;
  });
  const pintarReloj = () => {
    const t = fase === 0 ? 'Habla con Victoria, en la puerta del Punto Vuela.' : pistaVigente() || '¡Último sitio!';
    reloj.mostrar({ etiqueta: fase === 0 ? 'Empieza aquí' : fase <= N ? `Pista ${fase} de ${N}` : 'Última pista', texto: t, acento: '#E8B83A' });
  };

  // Flecha de rumbo, a la altura de la cintura, en línea recta hacia la zona de la siguiente pista
  const flecha = new THREE.Group();
  { const mt = new THREE.MeshBasicMaterial({ color: '#E8B83A' }), borde = new THREE.MeshBasicMaterial({ color: '#14110E' });
    const cono = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 16), mt); cono.rotation.x = Math.PI / 2; cono.position.z = 0.12;
    const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), mt); palo.rotation.x = Math.PI / 2;
    const sombra = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 16), borde); sombra.rotation.x = Math.PI / 2; sombra.position.set(0, -0.004, 0.115);
    (sombra.material as THREE.MeshBasicMaterial).side = THREE.BackSide; flecha.add(cono, palo, sombra); }
  flecha.visible = false; escena.add(flecha);

  // ---------- Paneles: diálogos y retos ----------
  let alPulsar: ((id: string) => void) | null = null;
  const colocarPanel = () => {
    const h = dondeCabeza(), d = rumboCabeza();
    panel.malla.position.set(h.x + d.x * 1.1, Math.max(0.9, h.y - 0.12), h.z + d.z * 1.1);
    panel.malla.lookAt(h.x, panel.malla.position.y, h.z);
  };
  const abrirPanel = (m: ModeloPanel, alBoton: (id: string) => void) => { if (!panel.visible) colocarPanel(); panel.mostrar(m); alPulsar = alBoton; flecha.visible = false; };
  const cerrarPanel = () => { panel.ocultar(); alPulsar = null; pintarReloj(); };
  const decir = (quien: string, papel: string, texto: string, despues: () => void, boton = 'Siguiente') =>
    abrirPanel({ etiqueta: papel, titulo: quien, texto, cara: caras.get(quien), botones: [{ id: 'seguir', texto: boton, estilo: 'primario' }] }, () => { sonido.blip(); despues(); });
  const encadenar = (quien: string, papel: string, lineas: string[], fin: () => void, ultimo = 'Siguiente') => {
    const paso = (i: number) => (i >= lineas.length ? fin() : decir(quien, papel, lineas[i], () => paso(i + 1), i === lineas.length - 1 ? ultimo : 'Siguiente'));
    paso(0);
  };

  /** Un reto en el panel. Sin tiempo y sin castigo: si fallas, te dice por qué y lo intentas otra vez. */
  const reto = (r: Reto, fin: () => void) => {
    let fallosAqui = 0;
    // Para las pruebas automáticas: contesta bien
    (window as unknown as { __resolverRetoVR: () => void }).__resolverRetoVR = () => {
      const p = (id: string) => alPulsar?.(id);
      if (r.tipo === 'una') p(String(r.opciones.findIndex(o => o.bien)));
      if (r.tipo === 'elegir') { r.opciones.forEach((o, i) => o.bien && p(String(i))); p('comprobar'); }
      if (r.tipo === 'ordenar') r.pasos.forEach((_, i) => p(String(i)));
      if (r.tipo === 'relacionar') r.parejas.forEach((_, k) => { p('l' + k); p('r' + k); });
    };
    const base = { etiqueta: 'Reto', titulo: r.titulo, texto: r.enunciado, acento: '#E8B83A' };
    const fallar = (t: string) => { sonido.mal(); fallos++; fallosAqui++; guardar(); return fallosAqui >= 2 && r.ayuda ? `${t} Ayuda: ${r.ayuda}` : t; };
    const hecho = () => { sonido.exclusiva(); abrirPanel({ ...base, aviso: r.bien ?? '¡Muy bien!', botones: [{ id: 'seguir', texto: 'Seguir', estilo: 'primario' }] }, () => fin()); };
    if (r.tipo === 'una') {
      const orden = barajar(r.opciones.map((_, i) => i));
      const pintar = (aviso?: string, mal?: boolean) => abrirPanel({ ...base, aviso, avisoMal: mal, botones: orden.map(i => ({ id: String(i), texto: r.opciones[i].texto })) }, id => {
        const o = r.opciones[Number(id)]; if (o.bien) { sonido.bien(); hecho(); } else pintar(fallar(o.porque ?? 'Esa no es. Prueba con otra.'), true);
      });
      pintar();
    } else if (r.tipo === 'elegir') {
      const orden = barajar(r.opciones.map((_, i) => i)), marcadas = new Set<number>(), buenas = r.opciones.filter(o => o.bien).length;
      const pintar = (aviso?: string, mal?: boolean) => abrirPanel({ ...base, texto: `${r.enunciado} (marca ${buenas})`, aviso, avisoMal: mal, botones: [...orden.map(i => ({ id: String(i), texto: (marcadas.has(i) ? '✓ ' : '') + r.opciones[i].texto, estilo: marcadas.has(i) ? 'marcado' as const : 'normal' as const })), { id: 'comprobar', texto: 'Comprobar', estilo: 'primario' }] }, id => {
        if (id !== 'comprobar') { sonido.blip(); const i = Number(id); marcadas.has(i) ? marcadas.delete(i) : marcadas.add(i); pintar(); return; }
        const mala = [...marcadas].map(i => r.opciones[i]).find(o => !o.bien);
        if (mala) pintar(fallar(mala.porque ?? `«${mala.texto}» no va.`), true);
        else if (marcadas.size < buenas) pintar(fallar(`Vas bien, pero te falta${buenas - marcadas.size > 1 ? 'n' : ''} ${buenas - marcadas.size}.`), true);
        else hecho();
      });
      pintar();
    } else if (r.tipo === 'ordenar') {
      const orden = barajar(r.pasos.map((_, i) => i)); let sig = 0;
      const pintar = (aviso?: string, mal?: boolean) => abrirPanel({ ...base, texto: `${r.enunciado} Toca los pasos del primero al último.`, hechos: r.pasos.slice(0, sig), aviso, avisoMal: mal, botones: orden.filter(i => i >= sig).map(i => ({ id: String(i), texto: r.pasos[i] })) }, id => {
        if (Number(id) === sig) { sonido.blip(); sig++; if (sig === r.pasos.length) hecho(); else pintar(); }
        else pintar(fallar(sig === 0 ? 'Por ahí no se empieza. ¿Qué va primero?' : 'Ese paso va más tarde.'), true);
      });
      pintar();
    } else if (r.tipo === 'relacionar') {
      const der = barajar(r.parejas.map((_, i) => i)), hechas = new Set<number>(); let elegido = -1;
      const pintar = (aviso?: string, mal?: boolean) => {
        const botones: Boton[] = [];
        for (let k = 0; k < r.parejas.length; k++) {
          botones.push({ id: 'l' + k, texto: r.parejas[k][0] + (hechas.has(k) ? ' ✓' : ''), estilo: hechas.has(k) ? 'ok' : elegido === k ? 'marcado' : 'normal' });
          const j = der[k]; botones.push({ id: 'r' + j, texto: r.parejas[j][1], estilo: hechas.has(j) ? 'ok' : 'normal' });
        }
        abrirPanel({ ...base, texto: `${r.enunciado} Toca uno de la izquierda y luego su pareja.`, aviso, avisoMal: mal, columnas: 2, botones }, id => {
          const k = Number(id.slice(1));
          if (id[0] === 'l') { sonido.blip(); elegido = k; pintar(); return; }
          if (elegido < 0) { pintar('Primero toca uno de la izquierda.', true); return; }
          if (k === elegido) { sonido.bien(); hechas.add(k); elegido = -1; if (hechas.size === r.parejas.length) hecho(); else pintar(); }
          else pintar(fallar('Esas dos no van juntas.'), true);
        });
      };
      pintar();
    } else {
      // escribir: en las gafas no hay teclado cómodo; se elige entre la buena y dos que no
      const opciones = barajar([r.respuestas[0], 'No lo sé', '—']);
      const pintar = (aviso?: string, mal?: boolean) => abrirPanel({ ...base, aviso, avisoMal: mal, botones: opciones.map((o, i) => ({ id: String(i), texto: o })) }, id => {
        if (opciones[Number(id)] === r.respuestas[0]) hecho(); else pintar(fallar('No es eso. Prueba otra vez.'), true);
      });
      pintar();
    }
  };

  // ---------- Conversaciones, paradas y final (como en la pantalla) ----------
  const mostrarPista = () => decir(fase <= N ? `Pista ${fase} de ${N}` : 'Última pista', 'Adónde ir ahora', pistaVigente() + '\nLa tienes también en tu mano izquierda.', cerrarPanel, 'Vamos');
  const conversar = (p: Personaje) => {
    const lineas = !hablados.has(p.id) || !p.otraVez?.length ? p.lineas : p.otraVez;
    hablados.add(p.id);
    encadenar(p.nombre, p.papel, lineas, () => {
      if (p.id === datos.guia && fase === 0) { fase = 1; guardar(); sonido.exclusiva(); actualizar(); mostrarPista(); return; }
      cerrarPanel(); guardar();
    }, 'Cerrar');
  };
  const resolverParada = (pd: Parada) => {
    const quien = pd.quien ? personajes.get(pd.quien) : null;
    const tras = () => {
      sonido.exclusiva(); fase++; guardar(); actualizar();
      if (fase === N + 1 && Math.hypot(datos.final.x - pd.x, datos.final.z - pd.z) < 8) { llegarAlFinal(); return; }
      decir(fase <= N ? `Pista ${fase - 1} de ${N} resuelta` : '¡Última pista resuelta!', 'Siguiente destino', pd.pista + '\nLa tienes también en tu mano izquierda.', cerrarPanel, 'Vamos');
    };
    encadenar(quien?.nombre ?? pd.lugar, quien ? pd.lugar : `Pista ${fase} de ${N}`, pd.lineas, () => (pd.reto ? reto(pd.reto, tras) : tras()), pd.reto ? 'Al reto' : 'Siguiente');
  };
  const llegarAlFinal = () => encadenar(datos.final.lugar, '¡Lo has conseguido!', datos.final.lineas, () => { fase = N + 2; guardar(); terminar(); }, 'Ver el diploma');
  const terminar = () => {
    sonido.fanfarria();
    { const antes = almacen.get<{ fallos: number }>(`pd-hecho-${datos.id}`); if (!antes || fallos < antes.fallos) almacen.set(`pd-hecho-${datos.id}`, { fallos, fecha: new Date().toISOString().slice(0, 10) }); }
    abrirPanel({ etiqueta: datos.titulo, titulo: datos.final.titulo, texto: `${datos.final.texto}\n\n${N} pistas resueltas${fallos ? ` · ${fallos} ${fallos === 1 ? 'intento fallido' : 'intentos fallidos'}` : ' · sin un solo fallo'}`,
      botones: [{ id: 'salir', texto: 'Salir de la realidad virtual', estilo: 'primario' }, { id: 'otra', texto: 'Jugar otra vez' }] }, id => {
      if (id === 'otra') { try { localStorage.removeItem(CLAVE); } catch { /* */ } fase = 0; fallos = 0; hablados.clear(); rig.position.set(datos.inicio.x, 0, datos.inicio.z); actualizar(); cerrarPanel(); }
      else sesion.end();
    });
  };
  let objetivo: { x: number; z: number } | null = null;
  const actualizar = () => {
    const pd = parada();
    objetivo = fase === 0 ? personajes.get(datos.guia)! : pd ? pd : fase === N + 1 ? datos.final : null;
    objetos.forEach((o, i) => { if (o) o.visible = i === fase - 1; });
    pintarReloj();
  };

  // Al acercarse a alguien o a la pista, se abre sola (una vez por llegada)
  const armados = new Map<string, boolean>();
  const llegada = (clave: string, d: number, radio: number) => {
    if (d > radio + 2.5) armados.set(clave, true);
    if (d < radio && armados.get(clave) !== false) { armados.set(clave, false); return true; }
    return false;
  };
  const comprobarLlegadas = () => {
    if (panel.visible || fase > N + 1) return;
    const h = dondeCabeza();
    for (const { p } of figuras) if (llegada(p.id, Math.hypot(p.x - h.x, p.z - h.z), 2.6)) { conversar(p); return; }
    const pd = parada();
    if (pd && !pd.quien && llegada('parada' + fase, Math.hypot(pd.x - h.x, pd.z - h.z), 3.6)) { resolverParada(pd); return; }
    if (fase === N + 1 && llegada('final', Math.hypot(datos.final.x - h.x, datos.final.z - h.z), 5)) llegarAlFinal();
  };

  // ---------- Apuntar y pulsar ----------
  const rayo = new THREE.Raycaster(), suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), punto = new THREE.Vector3(), mat4 = new THREE.Matrix4();
  const apuntar = (m: typeof mandos[number]) => {
    m.destino = null; m.boton = null;
    if (!m.gamepad && !m.c.visible) return;
    mat4.identity().extractRotation(m.c.matrixWorld);
    rayo.ray.origin.setFromMatrixPosition(m.c.matrixWorld); rayo.ray.direction.set(0, 0, -1).applyMatrix4(mat4);
    if (panel.visible) {
      const hit = rayo.intersectObject(panel.malla, false)[0];
      m.linea.scale.z = hit ? hit.distance : 3;
      if (hit?.uv) m.boton = panel.boton(hit.uv);
      return;
    }
    if (rayo.ray.intersectPlane(suelo, punto) && punto.distanceTo(rayo.ray.origin) < TELE_MAX) {
      m.linea.scale.z = punto.distanceTo(rayo.ray.origin);
      // al borde de una casa, se busca el trozo de calle más cercano
      for (const r of [0, 0.6, 1.2]) for (let a = 0; a < (r ? 8 : 1); a++) {
        const x = punto.x + Math.cos(a * Math.PI / 4) * r, z = punto.z + Math.sin(a * Math.PI / 4) * r;
        if (andable(x, z)) { m.destino = new THREE.Vector3(x, 0, z); return; }
      }
    } else m.linea.scale.z = 4;
  };
  const teletransportar = (x: number, z: number) => {
    const h = dondeCabeza(); rig.position.x += x - h.x; rig.position.z += z - h.z;
    sonido.blip(); guardar(); comprobarLlegadas();
  };
  const pulsar = (m: typeof mandos[number]) => {
    sonido.activar();
    if (panel.visible) { if (m.boton && alPulsar) { const f = alPulsar; f(m.boton); } return; }
    if (m.destino) teletransportar(m.destino.x, m.destino.z);
  };
  const girar = (s: number) => {
    const h = dondeCabeza(), a = s * Math.PI / 4;
    rig.rotation.y += a;
    // girar alrededor de la cabeza, no del centro del rig
    const dx = rig.position.x - h.x, dz = rig.position.z - h.z;
    rig.position.x = h.x + dx * Math.cos(a) + dz * Math.sin(a); rig.position.z = h.z - dx * Math.sin(a) + dz * Math.cos(a);
    sonido.blip();
  };

  // ---------- Bucle ----------
  const reloj0 = performance.now(); let ultimoCulling = 0, ultimaLlegada = 0;
  const foco = new THREE.Vector3();
  renderer.setAnimationLoop(t => {
    const s = (t - reloj0) / 1000, h = dondeCabeza();
    // mandos: rayo, botón apuntado y giro con el joystick
    let apuntado: string | null = null, destino: THREE.Vector3 | null = null;
    for (const m of mandos) {
      apuntar(m); if (m.boton) apuntado = m.boton; if (m.destino) destino = m.destino;
      const x = m.gamepad?.axes?.[2] ?? 0;
      if (Math.abs(x) > 0.7 && !m.giro) { m.giro = true; girar(x > 0 ? -1 : 1); } else if (Math.abs(x) < 0.3) m.giro = false;
    }
    panel.apuntar(apuntado);
    aro.visible = !!destino && !panel.visible; if (destino) { aro.position.set(destino.x, 0.03, destino.z); aro.scale.setScalar(1 + Math.sin(s * 6) * 0.08); }
    // gente que se gira hacia ti
    for (const f of figuras) {
      const d = Math.hypot(f.p.x - h.x, f.p.z - h.z);
      if (d < 10) { let dg = Math.atan2(h.x - f.p.x, h.z - f.p.z) - f.f.grupo.rotation.y; dg = Math.atan2(Math.sin(dg), Math.cos(dg)); f.f.grupo.rotation.y += dg * 0.08; }
      f.f.brazoD.rotation.x = Math.sin(s * 1.4 + f.fase) * 0.12;
    }
    objetos.forEach(o => { if (o?.visible) { o.rotation.y += 0.012; o.position.y = 1.1 + Math.sin(s * 2.4) * 0.06; } });
    // flecha de rumbo
    const lejos = objetivo ? Math.hypot(objetivo.x - h.x, objetivo.z - h.z) : 0;
    flecha.visible = !panel.visible && fase >= 1 && fase <= N + 1 && lejos > 25;
    if (flecha.visible && objetivo) { const d = rumboCabeza(); flecha.position.set(h.x + d.x * 0.7, Math.max(0.5, h.y - 0.55), h.z + d.z * 0.7); flecha.rotation.y = Math.atan2(objetivo.x - flecha.position.x, objetivo.z - flecha.position.z); }
    // dibujar solo lo cercano (dos veces por segundo basta)
    if (t - ultimoCulling > 500) { ultimoCulling = t; for (const l of lejanas) l.o.visible = Math.hypot(l.x - h.x, l.z - h.z) - l.r < VISTA; }
    if (t - ultimaLlegada > 300) { ultimaLlegada = t; comprobarLlegadas(); }
    foco.set(h.x, 0, h.z); animar?.(s, foco);
    renderer.render(escena, camara);
  });

  // ---------- Arranque y salida ----------
  await renderer.xr.setSession(sesion);
  actualizar();
  const vuelta = !!guardada && fase > 0;
  if (fase > N + 1) terminar();
  else decir(datos.titulo, vuelta ? 'Seguimos donde lo dejaste' : 'Realidad virtual',
    vuelta ? `Llevas ${Math.min(fase - 1, N)} de ${N} pistas. Mira tu mano izquierda para ver la pista.`
      : 'Para moverte, apunta al suelo con el mando y pulsa el gatillo. Con el joystick giras la vista.\nVictoria y Paco te esperan en la puerta del Punto Vuela.', cerrarPanel, 'Empezar');

  sesion.addEventListener('end', () => {
    guardar(); renderer.setAnimationLoop(null); renderer.dispose(); renderer.domElement.remove();
    delete (window as unknown as { __vr?: unknown }).__vr;
    opciones.alSalir();
  });

  // Para las pruebas automáticas (npm run revisar-vr)
  (window as unknown as { __vr: unknown }).__vr = {
    estado: () => ({ fase, panel: panel.visible, botones: panel.visible ? panel.ids() : [], cabeza: dondeCabeza().toArray(), objetivo }),
    pulsar: (id: string) => alPulsar?.(id),
    ir: (x: number, z: number) => teletransportar(x, z),
    andable,
  };
}
