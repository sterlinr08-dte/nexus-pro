// QA 12-nov-2026 — Controles «− número +» que responden al toque (parches-stepper.js). Solo aspecto.
// Banco de prueba scripts/qa-stepper-banco.html con el MISMO marcado del POS (.citqty, .stp) y de los meses (.pgStep);
// el carrito se repinta entero en cada toque, como en la app.
//  · Al sumar/restar: el número se anima entrando desde el lado tocado y el botón se hunde; la cantidad la pone la función de siempre.
//  · Si la cantidad no cambia (tope o mínimo), no se anima nada.  · Con «reducir movimiento» o la capa apagada, nada se anima.
// Uso: PORT=8952 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8952 node scripts/qa-stepper.mjs   (QA_VIDEO=carpeta graba un video)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8952', VID = process.env.QA_VIDEO || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
// Toca un botón y devuelve la cantidad nueva y qué animaciones quedaron corriendo en el control repintado
const tocar = (page, caja, n, lado) => page.evaluate(async ([caja, n, lado]) => { const w = document.querySelectorAll(caja)[n], b = w.querySelectorAll('button'); b[lado > 0 ? 1 : 0].click();
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 20))));
  const w2 = document.querySelectorAll(caja)[n], num = w2.querySelector('input'), bt = w2.querySelectorAll('button')[lado > 0 ? 1 : 0];
  const kf = num.getAnimations().map(a => a.effect.getKeyframes()[0].clipPath || a.effect.getKeyframes()[0].transform); const on = w2.querySelector('.nxStpOnda'); return { v: num.value, num: num.getAnimations().length, btn: on ? 1 : bt.getAnimations().length, desde: kf[0] || '', onda: !!on }; }, [caja, n, lado]);
(async () => {
  const browser = await pw.chromium.launch();
  for (const width of [390, 1280]) {
    console.log(`\n== ${width}px ==`);
    const ctx = await browser.newContext({ viewport: { width, height: 700 }, ...(VID && width === 390 ? { recordVideo: { dir: VID, size: { width: 390, height: 700 } } } : {}) });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE + '/scripts/qa-stepper-banco.html'); await sleep(300);
    let r = await tocar(page, '.citqty', 0, 1);
    ok(r.v === '3' && r.num === 1 && r.onda && /at 100% 50%/.test(r.desde), 'carrito, «+»: 2 → 3, sale la onda y el número se destapa desde la derecha', r); await sleep(480);
    r = await tocar(page, '.citqty', 0, -1);
    ok(r.v === '2' && r.num === 1 && r.onda && /at 0% 50%/.test(r.desde), 'carrito, «−»: 3 → 2, el número se destapa desde la izquierda', r); await sleep(480);
    const limpio = await page.evaluate(() => ({ ondas: document.querySelectorAll('.nxStpOnda').length, ov: document.querySelector('.citqty').style.overflow }));
    ok(limpio.ondas === 0 && limpio.ov === '', 'al terminar no queda la onda ni estilos pegados en el control', limpio);
    r = await tocar(page, '.citqty', 1, -1);
    ok(r.v === '1' && r.num === 0 && r.btn === 0, 'carrito en el mínimo: la cantidad no cambia y nada se anima', r);
    for (let i = 0; i < 2; i++) { await tocar(page, '.stp', 0, 1); await sleep(480); } r = await tocar(page, '.stp', 0, 1);
    ok(r.v === '5' && r.num === 0, 'factura en el tope: no cambia y no se anima', r);
    r = await tocar(page, '.stp', 0, -1); ok(r.v === '4' && r.num === 1 && r.onda, 'factura, «−»: se anima', r); await sleep(480);
    r = await tocar(page, '.pgStep', 0, 1); ok(r.v === '2' && r.num === 1 && r.btn === 1, 'meses adelantados (no se repinta): se anima igual', r);
    if (VID && width === 390) { for (const [c, n, l] of [['.citqty', 0, 1], ['.citqty', 0, 1], ['.citqty', 0, -1], ['.citqty', 1, 1], ['.stp', 0, -1], ['.stp', 0, 1], ['.pgStep', 0, 1], ['.pgStep', 0, 1], ['.pgStep', 0, -1]]) { await page.locator(c).nth(n).locator('button').nth(l > 0 ? 1 : 0).click(); await sleep(800); } }
    ok(errs.length === 0, 'sin errores de página', errs); await ctx.close();
  }
  for (const [nom, prep] of [['«reducir movimiento»', { reducedMotion: 'reduce' }], ['capa apagada', {}]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, ...prep }); const page = await ctx.newPage();
    if (nom === 'capa apagada') await page.addInitScript(() => localStorage.setItem('nx_stepper_off', '1'));
    await page.goto(BASE + '/scripts/qa-stepper-banco.html'); await sleep(300); const r = await tocar(page, '.citqty', 0, 1);
    ok(r.v === '3' && r.num === 0 && r.btn === 0, `con ${nom}: la cantidad cambia igual y nada se anima`, r); await ctx.close();
  }
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 700 } }); const page = await ctx.newPage(); await page.addInitScript(() => localStorage.setItem('nx_stepper_modo', 'lado'));
    await page.goto(BASE + '/scripts/qa-stepper-banco.html'); await sleep(300); const r = await tocar(page, '.citqty', 0, 1);
    ok(r.v === '3' && r.num === 1 && !r.onda && /translateX\(9px\)/.test(r.desde), 'modo «lado» (variantes 1 y 2): sigue disponible', r); await ctx.close(); }
  await browser.close(); console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
