// Comprobación del juego en un navegador sin ventana: compila, abre el juego en escritorio y móvil, hace capturas
// (revision/*.png) y juega la partida entera con «Llévame» y las respuestas buenas. Para si algo falla.
// Uso: npm run revisar  [-- --sin-build] [-- --solo-capturas]
// Navegador: el Chrome instalado, o el que diga la variable CHROMIUM (ruta al ejecutable).
import { chromium } from 'playwright-core';
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (!args.includes('--sin-build')) execSync('npm run build', { stdio: 'inherit' });
mkdirSync('revision', { recursive: true });
const servidor = spawn('npx', ['vite', 'preview', '--port', '4319', '--strictPort'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const URL = 'http://localhost:4319/';
const navegador = await chromium.launch({
  ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : { channel: 'chrome' }),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const informe = [];
const errores = [];
const anotar = t => { informe.push(t); console.log(t); };
try {
  for (const [nombre, vista] of [['escritorio', { width: 1280, height: 800 }], ['movil', { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const ctx = await navegador.newContext({ viewport: { width: vista.width, height: vista.height }, isMobile: vista.isMobile, hasTouch: vista.hasTouch, deviceScaleFactor: vista.deviceScaleFactor ?? 1 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errores.push(`${nombre}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error') errores.push(`${nombre} (consola): ${m.text()}`); });
    await p.goto(URL); await p.screenshot({ path: `revision/${nombre}-portada.png` });
    const t0 = Date.now();
    await p.goto(URL + '?jugar&nueva');
    await p.waitForSelector('.pj-dialogo:not([hidden])', { timeout: 60000 });
    anotar(`${nombre}: el juego carga en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    await p.waitForTimeout(800); await p.screenshot({ path: `revision/${nombre}-bienvenida.png` });
    await p.click('.pj-seguir'); await p.waitForTimeout(600);
    await p.screenshot({ path: `revision/${nombre}-inicio.png` });
    if (args.includes('--solo-capturas') || nombre === 'movil' && !args.includes('--partida-movil')) { await ctx.close(); continue; }
    // Partida entera: «Llévame» hasta cada sitio, «Siguiente» en los diálogos y las respuestas buenas en los retos
    const fase = () => p.evaluate(() => document.getElementById('juego').prueba.fase());
    let vueltas = 0, capturas = 0;
    while (vueltas++ < 400) {
      if (await p.locator('.pj-panel:not([hidden]) .pj-diploma').count()) { anotar(`${nombre}: partida terminada (diploma)`); break; }
      if (await p.locator('.pj-reto-capa:not([hidden])').count()) {
        if (capturas++ < 2) await p.screenshot({ path: `revision/${nombre}-reto-${capturas}.png` });
        await p.evaluate(() => (window).__resolverReto?.());
        const seguir = p.locator('.pj-reto-seguir'); if (await seguir.count()) await seguir.click();
        await p.waitForTimeout(300); continue;
      }
      if (await p.locator('.pj-dialogo:not([hidden])').count()) { await p.click('.pj-seguir'); await p.waitForTimeout(150); continue; }
      // El juego no lleva de la mano (sin «Llévame» a la vista): la prueba usa el mismo camino por dentro
      {
        const f0 = await fase(); await p.evaluate(() => document.getElementById('juego').prueba.llevame());
        try { await p.waitForSelector('.pj-dialogo:not([hidden]), .pj-reto-capa:not([hidden]), .pj-panel:not([hidden])', { timeout: 240000 }); }
        catch { anotar(`${nombre}: ⚠ no llega al destino en la fase ${f0}`); errores.push('no llega'); break; }
        if (capturas < 3) { await p.screenshot({ path: `revision/${nombre}-llegada-${f0}.png` }); }
        continue;
      }
      await p.waitForTimeout(300);
    }
    await p.screenshot({ path: `revision/${nombre}-final.png` });
    await ctx.close();
  }
} finally {
  await navegador.close(); servidor.kill();
}
writeFileSync('revision/informe.txt', [...informe, '', errores.length ? 'ERRORES:\n' + errores.join('\n') : 'Sin errores.'].join('\n'));
console.log(errores.length ? `\n${errores.length} errores (ver revision/informe.txt)` : '\nSin errores.');
process.exit(errores.length ? 1 : 0);
