// Paneles flotantes para la realidad virtual: un lienzo 2D (texto y botones grandes) pegado a un plano en 3D.
// Los botones se pulsan apuntando con el mando: el rayo da en el plano, la coordenada UV dice qué botón es.
import * as THREE from 'three';

export type EstiloBoton = 'normal' | 'primario' | 'marcado' | 'ok' | 'mal' | 'apagado';
export interface Boton { id: string; texto: string; estilo?: EstiloBoton }
export interface ModeloPanel {
  etiqueta?: string;          // línea pequeña de arriba («Pista 2 de 5», «Reto»)
  titulo?: string;            // nombre de quien habla o título del reto
  texto?: string;
  cara?: string;              // SVG del retrato
  hechos?: string[];          // pasos ya puestos (reto de ordenar)
  botones?: Boton[];
  columnas?: 1 | 2;
  aviso?: string; avisoMal?: boolean;
  acento?: string;            // color de la franja de arriba
}

const LETRA = "'Atkinson Hyperlegible', system-ui, sans-serif";
const C = { papel: '#FFFFFF', tinta: '#14110E', gris: '#4A4640', verde: '#1F6E3A', rojo: '#C41F12', oro: '#E8B83A', cal: '#F7F3EA', ok: '#CFE6C2' };

/** Parte un texto en líneas que caben en `ancho` px. */
function lineas(c: CanvasRenderingContext2D, texto: string, ancho: number) {
  const out: string[] = [];
  for (const parrafo of texto.split('\n')) {
    let linea = '';
    for (const p of parrafo.split(' ')) {
      const prueba = linea ? linea + ' ' + p : p;
      if (c.measureText(prueba).width > ancho && linea) { out.push(linea); linea = p; } else linea = prueba;
    }
    out.push(linea);
  }
  return out;
}

export class Panel {
  readonly malla: THREE.Mesh;
  private lienzo = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private textura: THREE.CanvasTexture;
  private zonas: { id: string; x: number; y: number; w: number; h: number; activo: boolean }[] = [];
  private caras = new Map<string, HTMLImageElement>();
  private modelo: ModeloPanel = {};
  private encima: string | null = null;
  /** px por metro del lienzo: el panel mide `ancho` m y su alto sale del contenido. */
  constructor(private ancho = 1.15, private pxAncho = 1100) {
    this.lienzo.width = pxAncho; this.lienzo.height = 600;
    this.ctx = this.lienzo.getContext('2d')!;
    this.textura = new THREE.CanvasTexture(this.lienzo);
    this.textura.colorSpace = THREE.SRGBColorSpace; this.textura.anisotropy = 4;
    this.malla = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.textura, transparent: true, depthTest: false, depthWrite: false }));
    this.malla.renderOrder = 10; this.malla.visible = false;
  }

  mostrar(m: ModeloPanel) { this.modelo = m; this.encima = null; this.pintar(); this.malla.visible = true; }
  ocultar() { this.malla.visible = false; this.zonas = []; }
  get visible() { return this.malla.visible; }

  /** El botón (id) en el punto UV del plano, si lo hay. */
  boton(uv: THREE.Vector2) {
    const x = uv.x * this.lienzo.width, y = (1 - uv.y) * this.lienzo.height;
    return this.zonas.find(z => z.activo && x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h)?.id ?? null;
  }
  /** Resalta el botón al que se apunta. */
  apuntar(id: string | null) { if (id !== this.encima) { this.encima = id; this.pintar(); } }
  ids() { return this.zonas.filter(z => z.activo).map(z => z.id); }

  private cara(svg: string) {
    let im = this.caras.get(svg);
    if (!im) { im = new Image(); im.onload = () => this.pintar(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); this.caras.set(svg, im); }
    return im.complete && im.naturalWidth ? im : null;
  }

  private pintar() {
    const m = this.modelo, c = this.ctx, W = this.lienzo.width, M = 44;
    // 1) medir el alto que hace falta
    const conCara = !!m.cara, xTexto = conCara ? M + 170 : M, anchoTexto = W - xTexto - M;
    c.font = `30px ${LETRA}`; const lEt = m.etiqueta ? 1 : 0;
    c.font = `bold 46px ${LETRA}`; const lTit = m.titulo ? lineas(c, m.titulo, anchoTexto) : [];
    c.font = `40px ${LETRA}`; const lTex = m.texto ? lineas(c, m.texto, anchoTexto) : [];
    const cols = m.columnas ?? 1, botones = m.botones ?? [], anchoBoton = (W - 2 * M - (cols - 1) * 20) / cols;
    c.font = `bold 36px ${LETRA}`;
    const lBot = botones.map(b => lineas(c, b.texto, anchoBoton - 40));
    const altoFila = (i: number) => Math.max(...(cols === 2 ? [lBot[i - (i % 2)], lBot[i - (i % 2) + 1] ?? []] : [lBot[i]]).map(l => l.length)) * 44 + 36;
    let alto = M + (lEt ? 46 : 0) + lTit.length * 56 + (lTit.length ? 10 : 0) + lTex.length * 52;
    if (conCara) alto = Math.max(alto, M + 150);
    const hechos = m.hechos ?? [];
    if (hechos.length) alto += 20 + hechos.length * 46;
    c.font = `bold 34px ${LETRA}`; const lAv = m.aviso ? lineas(c, m.aviso, W - 2 * M) : [];
    if (lAv.length) alto += 20 + lAv.length * 44;
    if (botones.length) { alto += 30; for (let i = 0; i < botones.length; i += cols) alto += altoFila(i) + 16; }
    alto += M;
    if (this.lienzo.height !== Math.ceil(alto)) { this.lienzo.height = Math.ceil(alto); this.textura.dispose(); this.textura = new THREE.CanvasTexture(this.lienzo); this.textura.colorSpace = THREE.SRGBColorSpace; (this.malla.material as THREE.MeshBasicMaterial).map = this.textura; }
    this.malla.scale.set(this.ancho, this.ancho * this.lienzo.height / W, 1);
    // 2) pintar
    c.clearRect(0, 0, W, this.lienzo.height);
    c.fillStyle = C.papel; c.strokeStyle = C.tinta; c.lineWidth = 10;
    c.beginPath(); c.roundRect(5, 5, W - 10, this.lienzo.height - 10, 18); c.fill(); c.stroke();
    c.fillStyle = m.acento ?? C.verde; c.fillRect(10, 10, W - 20, 14);
    let y = M;
    if (conCara) { const im = this.cara(m.cara!); if (im) { c.imageSmoothingEnabled = false; c.drawImage(im, M, y, 140, 140); } c.strokeStyle = C.tinta; c.lineWidth = 5; c.strokeRect(M, y, 140, 140); }
    c.textBaseline = 'top';
    if (m.etiqueta) { c.font = `bold 30px ${LETRA}`; c.fillStyle = C.verde; c.fillText(m.etiqueta.toUpperCase(), xTexto, y); y += 46; }
    c.font = `bold 46px ${LETRA}`; c.fillStyle = C.rojo; for (const l of lTit) { c.fillText(l, xTexto, y); y += 56; } if (lTit.length) y += 10;
    c.font = `40px ${LETRA}`; c.fillStyle = C.tinta; for (const l of lTex) { c.fillText(l, xTexto, y); y += 52; }
    if (conCara) y = Math.max(y, M + 150);
    if (hechos.length) { y += 20; c.font = `34px ${LETRA}`; hechos.forEach((h, i) => { c.fillStyle = C.ok; c.fillRect(M, y, W - 2 * M, 40); c.fillStyle = C.tinta; c.fillText(`${i + 1}. ${h}`, M + 14, y + 4); y += 46; }); }
    if (lAv.length) { y += 20; c.font = `bold 34px ${LETRA}`; c.fillStyle = m.avisoMal ? C.rojo : C.verde; for (const l of lAv) { c.fillText(l, M, y); y += 44; } }
    this.zonas = [];
    if (botones.length) {
      y += 30;
      for (let i = 0; i < botones.length; i += cols) {
        const h = altoFila(i);
        for (let k = 0; k < cols && i + k < botones.length; k++) {
          const b = botones[i + k], x = M + k * (anchoBoton + 20), est = b.estilo ?? 'normal', on = this.encima === b.id && est !== 'apagado';
          const fondo = { normal: C.cal, primario: C.verde, marcado: C.oro, ok: C.ok, mal: '#F4C7C2', apagado: '#E6E2DA' }[est];
          c.fillStyle = on ? (est === 'primario' ? '#2E8B57' : C.oro) : fondo; c.strokeStyle = C.tinta; c.lineWidth = on ? 8 : 5;
          c.beginPath(); c.roundRect(x, y, anchoBoton, h, 12); c.fill(); c.stroke();
          c.font = `bold 36px ${LETRA}`; c.fillStyle = est === 'primario' && !on ? '#FFFFFF' : est === 'apagado' ? '#8A857C' : C.tinta;
          lBot[i + k].forEach((l, n) => c.fillText(l, x + 20, y + 18 + n * 44));
          this.zonas.push({ id: b.id, x, y, w: anchoBoton, h, activo: est !== 'apagado' && est !== 'ok' });
        }
        y += h + 16;
      }
    }
    this.textura.needsUpdate = true;
  }
}
