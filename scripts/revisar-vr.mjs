// Comprobación de la realidad virtual sin gafas: un navegador sin ventana con unas Meta Quest 3 emuladas (IWER, de Meta).
// Abre la pantalla de capítulos (debe salir «En realidad virtual»), entra en VR, saca capturas de lo que ve cada ojo
// (revision/vr-*.png), prueba a teletransportarse apuntando con el mando de verdad (emulado) y juega el capítulo entero.
// Uso: npm run revisar-vr [-- --sin-build] [-- <capítulo>]       Navegador: Chrome instalado o la variable CHROMIUM.
import { chromium } from 'playwright-core';
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const capitulo = args.find(a => !a.startsWith('--')) ?? 'basicas';
if (!args.includes('--sin-build')) execSync('npm run build', { stdio: 'inherit' });
mkdirSync('revision', { recursive: true });
const servidor = spawn('npx', ['vite', 'preview', '--port', '4324', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const navegador = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : { channel: 'chrome' }),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const errores = [], informe = [];
const anotar = t => { informe.push(t); console.log(t); };
try {
  const p = await navegador.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errores.push('consola: ' + m.text()); });
  await p.addInitScript({ content: readFileSync('node_modules/iwer/build/iwer.min.js', 'utf8') + ';window.__xrd = new IWER.XRDevice(IWER.metaQuest3); window.__xrd.installRuntime({ forceInstall: true });' });
  await p.goto('http://localhost:4324/?profe');
  await p.waitForSelector('[data-vr]', { timeout: 20000 });
  anotar('Sale el botón «En realidad virtual»');
  await p.screenshot({ path: 'revision/vr-portada.png' });
  await p.click(`[data-vr="${capitulo}"]`);
  await p.waitForFunction(() => window.__vr?.estado().panel, null, { timeout: 90000 });
  anotar('Dentro de la realidad virtual, con el panel de bienvenida');
  // IWER pinta los dos ojos en un lienzo dentro de su contenedor: se pone a pantalla completa para las fotos
  await p.evaluate(() => {
    const c = window.__xrd.canvasContainer; if (!c.isConnected) document.body.appendChild(c);
    Object.assign(c.style, { position: 'fixed', inset: '0', zIndex: '99999', background: '#000' });
    c.querySelectorAll('canvas').forEach(k => { k.style.display = 'block'; k.style.width = '100%'; k.style.height = '100%'; });
  });
  await p.waitForTimeout(1500);
  const foto = async nombre => {
    // lo que ven los ojos: el lienzo que IWER pinta en la página
    await p.screenshot({ path: `revision/vr-${nombre}.png`, timeout: 120000 });
  };
  await foto('bienvenida');
  const estado = () => p.evaluate(() => window.__vr.estado());
  const pulsar = id => p.evaluate(i => window.__vr.pulsar(i), id);
  await pulsar('seguir'); await p.waitForTimeout(600);
  await foto('calle');
  // Teletransporte de verdad: el mando derecho apunta al suelo, delante, y se pulsa el gatillo
  const antes = (await estado()).cabeza;
  await p.evaluate(() => { const c = window.__xrd.controllers.right; c.position.set(0.2, 1.2, -0.3); c.quaternion.setFromEuler?.(new (c.quaternion.constructor)()); });
  await p.evaluate(() => { const c = window.__xrd.controllers.right; const q = c.quaternion; const a = -0.45; q.x = Math.sin(a / 2); q.y = 0; q.z = 0; q.w = Math.cos(a / 2); });
  await p.waitForTimeout(500);
  await foto('apuntando');
  await p.evaluate(() => window.__xrd.controllers.right.updateButtonValue('trigger', 1)); await p.waitForTimeout(150);
  await p.evaluate(() => window.__xrd.controllers.right.updateButtonValue('trigger', 0)); await p.waitForTimeout(500);
  const despues = (await estado()).cabeza;
  const salto = Math.hypot(despues[0] - antes[0], despues[2] - antes[2]);
  anotar(`Teletransporte con el mando: ${salto.toFixed(1)} m`);
  if (salto < 1) errores.push('el teletransporte con el mando no mueve');
  // El capítulo entero: ir a cada objetivo y contestar
  let vueltas = 0, retoFoto = false, terminado = false;
  while (vueltas++ < 300) {
    const e = await estado();
    if (e.panel) {
      if (e.botones.includes('salir')) { await foto('diploma'); terminado = true; break; }
      if (e.botones.includes('seguir')) { await pulsar('seguir'); }
      else {
        if (!retoFoto) { await foto('reto'); retoFoto = true; }
        await p.evaluate(() => window.__resolverRetoVR?.());
        const e2 = await estado(); if (e2.botones.includes('seguir')) await pulsar('seguir');
      }
      await p.waitForTimeout(120); continue;
    }
    if (!e.objetivo) { errores.push('sin objetivo y sin panel'); break; }
    await p.evaluate(o => window.__vr.ir(o.x, o.z), e.objetivo);
    await p.waitForTimeout(700);
    if (vueltas === 3) await foto('llegada');
  }
  anotar(terminado ? `Capítulo «${capitulo}» terminado en realidad virtual (diploma)` : '⚠ no se termina');
  if (!terminado) errores.push('no se termina');
} finally { await navegador.close(); servidor.kill(); }
writeFileSync('revision/informe-vr.txt', [...informe, '', errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores.'].join('\n'));
console.log(errores.length ? `\n${errores.length} errores:\n${errores.slice(0, 8).join('\n')}` : '\nSin errores.');
process.exit(errores.length ? 1 : 0);
