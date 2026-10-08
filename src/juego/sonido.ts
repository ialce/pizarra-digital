// Efectos de sonido sintetizados en el navegador (sin ficheros): pitidos de 8 bits al estilo de los juegos antiguos.
import { almacen } from './almacen';

export function crearSonido() {
  let ctx: AudioContext | null = null;
  let mudo = almacen.get<boolean>('pd-sonido-mudo') ?? false;
  const activar = () => {
    if (!ctx) { try { ctx = new AudioContext(); } catch { ctx = null; } }
    if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  const tono = (f: number, inicio: number, dur: number, tipo: OscillatorType = 'square', vol = 0.05, fFin?: number) => {
    const c = activar(); if (!c || mudo) return;
    const t = c.currentTime + inicio;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (fFin) o.frequency.exponentialRampToValueAtTime(fFin, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  return {
    activar,
    get mudo() { return mudo; },
    alternar() { mudo = !mudo; almacen.set('pd-sonido-mudo', mudo); if (!mudo) this.blip(); return mudo; },
    letra() { tono(880 + Math.random() * 120, 0, 0.025, 'square', 0.012); },
    blip() { tono(660, 0, 0.06, 'square', 0.035); },
    bien() { tono(660, 0, 0.09); tono(990, 0.09, 0.16); },
    mal() { tono(220, 0, 0.22, 'sawtooth', 0.04, 140); },
    exclusiva() { [523, 659, 784, 1047].forEach((f, i) => tono(f, i * 0.07, 0.12, 'square', 0.04)); },
    papiro() { [1175, 1568, 2093].forEach((f, i) => tono(f, i * 0.06, 0.1, 'triangle', 0.05)); },
    noche() { tono(196, 0, 1.6, 'triangle', 0.05, 147); tono(294, 0.2, 1.4, 'triangle', 0.03, 220); },
    esfinge() { tono(98, 0, 1.2, 'sawtooth', 0.035, 73); tono(147, 0.1, 1.1, 'triangle', 0.04, 110); },
    fanfarria() { [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(([f, t]) => tono(f, t, 0.2, 'square', 0.045)); },
  };
}
export type Sonido = ReturnType<typeof crearSonido>;
