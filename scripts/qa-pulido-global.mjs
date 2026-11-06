// QA pulido global (06-nov-2026): capa parches-pulido-global.js, a 390×844 y 1280×800, tema oscuro y claro.
//  · Ciclo 20→20: el elegidor del ciclo muestra el texto completo en el celular (≥300 px de ancho, 48 px, 16 px).
//  · Comisiones: nada se sale de la tarjeta (Calcular y Excel visibles dentro de la pantalla).
//  · Campos: ciclo de Custodia, filtro de Pólizas y buscadores de Empresas/Agentes miden 48 px; letra ≥16 en celular, ≥13 en PC.
//  · Configuración: la barra de pestañas marca el lado con más pestañas; en PC la rueda la desplaza.
//  · Sin scroll de lado y sin errores de página. Con nx_pulido_global_off='1' la capa no se carga.
// Uso: PORT=8955 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8955 node scripts/qa-pulido-global.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8955';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-pulido-global')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, opts = {}) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, userAgent: movil ? UA : undefined, locale: 'es-DO', deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript((o) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    if (o.off) localStorage.setItem('nx_pulido_global_off', '1'); else localStorage.removeItem('nx_pulido_global_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, opts);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 3, null, { timeout: 30000 });
  if (!opts.off) await page.waitForFunction(() => window.__nxPulidoGlobal && document.getElementById('nxPulidoGlobalCSS'), null, { timeout: 30000 });
  await sleep(2000);
  if (opts.claro) await page.evaluate(() => { document.documentElement.classList.remove('tema-glass-oscuro'); document.documentElement.classList.add('tema-claro'); });
  return { ctx, page, errs };
}
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right), fs: parseFloat(getComputedStyle(e).fontSize) }; }, sel);
const sinLado = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const ir = async (page, v) => { await page.evaluate(v => nav(v, null), v); await sleep(1200); };

(async () => {
  const browser = await chromium.launch();
  for (const [width, claro] of [[390, false], [1280, false], [390, true], [1280, true]]) {
    const movil = width < 500, tema = claro ? 'claro' : 'oscuro';
    console.log(`\n== ${width}px · ${tema} ==`);
    const { ctx, page, errs } = await abrir(browser, width, { claro });
    const fsMin = movil ? 16 : 13;

    // 1. Ciclo 20→20
    await ir(page, 'rep-agente');
    await page.waitForSelector('#nxC20Periodo', { timeout: 15000 });
    await page.evaluate(() => document.querySelector('#nxC20Periodo').scrollIntoView({ block: 'center' })); await sleep(300);
    const sel = await caja(page, '#nxC20Periodo');
    ok(sel && sel.h >= 44 && (movil ? sel.w >= 300 && sel.h >= 48 && sel.fs >= 16 : sel.w >= 260), 'Ciclo 20→20: el ciclo se lee completo', sel);
    const exp = await caja(page, '#nxC20Export');
    ok(!exp || (exp.r <= width && exp.h >= 44), 'Ciclo 20→20: Excel dentro de la pantalla y ≥44', exp);
    ok(await sinLado(page), 'Ciclo 20→20: sin scroll de lado');
    await page.screenshot({ path: OUT + `ciclo-${width}-${tema}.png` });

    // 2. Comisiones
    await ir(page, 'comisiones');
    const bts = await page.$$eval('#v-comisiones .ch .btn', bs => bs.map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; }));
    const card = await caja(page, '#v-comisiones .nc');
    ok(bts.length === 2 && bts.every(b => b.r <= card.r && b.r <= width && b.h >= 44 && b.w >= 44), 'Comisiones: Calcular y Excel dentro de la tarjeta, ≥44', { bts, card });
    ok(await sinLado(page), 'Comisiones: sin scroll de lado');
    await page.screenshot({ path: OUT + `comisiones-${width}-${tema}.png` });

    // 3. Campos
    await ir(page, 'custodia');
    const cus = await caja(page, '#cusPer');
    ok(cus && cus.h >= 48 && cus.fs >= fsMin, `Custodia: ciclo 48 px y letra ≥${fsMin}`, cus);
    await ir(page, 'polizas');
    const pol = await caja(page, '#polEst');
    ok(pol && pol.h >= 48 && pol.fs >= fsMin, `Pólizas: filtro 48 px y letra ≥${fsMin}`, pol);
    for (const [v, id] of [['empresas', '#nxBus_emp'], ['agentes', '#nxBus_agt']]) {
      await ir(page, v);
      const b = await caja(page, id);
      ok(b && b.h >= 48 && b.fs >= 16, `${v}: buscador 48 px y 16 px`, b);
      ok(await sinLado(page), `${v}: sin scroll de lado`);
    }

    // 4. Configuración
    await ir(page, 'config'); await sleep(500);
    const bar0 = await page.evaluate(() => { const b = document.querySelector('#v-config .cfg-tabs-bar'); return { cabe: b.scrollWidth <= b.clientWidth + 2, izq: b.classList.contains('nxPgIzq'), der: b.classList.contains('nxPgDer'), mask: getComputedStyle(b).maskImage || getComputedStyle(b).webkitMaskImage }; });
    ok(bar0.cabe || (bar0.der && !bar0.izq && /gradient/.test(bar0.mask)), 'Configuración: al empezar, el borde derecho avisa que hay más pestañas', bar0);
    if (!movil && !bar0.cabe) {
      const r = await caja(page, '#v-config .cfg-tabs-bar');
      await page.mouse.move(r.l + 200, (await page.evaluate(() => document.querySelector('#v-config .cfg-tabs-bar').getBoundingClientRect().top)) + 30);
      await page.mouse.wheel(0, 300); await sleep(400);
      const sl = await page.evaluate(() => { const b = document.querySelector('#v-config .cfg-tabs-bar'); return { sl: b.scrollLeft, izq: b.classList.contains('nxPgIzq') }; });
      ok(sl.sl > 0 && sl.izq, 'Configuración (PC): la rueda desplaza las pestañas y aparece el aviso izquierdo', sl);
    }
    await page.evaluate(() => switchCfgTab(13)); await sleep(900);
    const bar1 = await page.evaluate(() => { const b = document.querySelector('#v-config .cfg-tabs-bar'); return { cabe: b.scrollWidth <= b.clientWidth + 2, izq: b.classList.contains('nxPgIzq') }; });
    ok(bar1.cabe || bar1.izq, 'Configuración: al ir a una pestaña del final, el aviso izquierdo aparece', bar1);
    const tabs = await page.$$eval('#v-config .cfg-tab', ts => ts.filter(t => t.offsetParent).map(t => Math.round(t.getBoundingClientRect().height)));
    ok(tabs.length && tabs.every(h => h >= 44), 'Configuración: pestañas ≥44 de alto', tabs);
    ok(await sinLado(page), 'Configuración: sin scroll de lado');
    await page.screenshot({ path: OUT + `config-${width}-${tema}.png` });

    ok(!errs.length, 'sin errores de página', errs);
    await ctx.close();
  }

  // Apagada: no se carga
  console.log('\n== 390px · capa apagada ==');
  {
    const { ctx, page, errs } = await abrir(browser, 390, { off: true });
    ok(!(await page.evaluate(() => !!window.__nxPulidoGlobal || !!document.getElementById('nxPulidoGlobalCSS') || document.documentElement.classList.contains('nx-pulido'))), 'con nx_pulido_global_off=1 la capa no actúa');
    ok(!errs.length, 'sin errores de página (apagada)', errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
