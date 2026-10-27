// QA de la capa «materializar» (parches-nx-materializar.js, 59.68): app real contra scripts/qa-crm-mock-server.js.
//  · 390×844 y 1280×800, oscuro y claro: la primera pantalla no se anima; al ir a Clientes, Pólizas, Facturas y Reportes
//    las piezas entran (1–10, en cascada) y a los 1.2 s todas quedan nítidas y visibles; la cascada vieja queda apagada;
//    con reducir movimiento o localStorage.nx_materializar_off='1' no anima; 0 errores de JS.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-materializar.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-materializar')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
async function abrir(browser, width, tema, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', reducedMotion: opts.reducir ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(([tema, apagado]) => {
    localStorage.setItem('nx_tema', tema); localStorage.setItem('nx_auth_mode', 'legacy');
    if (apagado) localStorage.setItem('nx_materializar_off', '1'); else localStorage.removeItem('nx_materializar_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, [tema, !!opts.apagado]);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(2600);
  await page.evaluate(t => { try { aplicarTema(t, false); } catch (e) {} }, tema); await sleep(400);
  return { ctx, page, errs };
}
// Va a una pantalla y mide en el mismo cuadro (antes del primer dibujo) qué piezas quedaron marcadas.
const IR = async (page, vista) => page.evaluate(async v => {
  nav(v, null);
  await new Promise(r => setTimeout(r, 0));
  const m = [...document.querySelectorAll('.view.on .nx-mat-in')];
  document.querySelectorAll('[data-qa-mat]').forEach(e => e.removeAttribute('data-qa-mat')); m.forEach(e => e.setAttribute('data-qa-mat', '1'));
  const delays = m.map(e => Math.round(parseFloat(getComputedStyle(e).animationDelay) * 1000) || 0);
  return { n: m.length, anim: m[0] ? getComputedStyle(m[0]).animationName : '', delays, viejos: document.querySelectorAll('.view.on .nx-motion-item').length,
    viejoAnim: document.querySelector('.view.on .nx-motion-item') ? getComputedStyle(document.querySelector('.view.on .nx-motion-item')).animationName : 'none' };
}, vista);
const DESPUES = page => page.evaluate(() => ({ quedan: document.querySelectorAll('.nx-mat-in:not(.nx-mat-fin)').length, cualBorrosa: [...document.querySelectorAll('[data-qa-mat]')].filter(e => /blur/.test(getComputedStyle(e).filter)).map(e => (e.id || e.className).toString().slice(0, 60) + ' ' + getComputedStyle(e).filter),
  borrosas: [...document.querySelectorAll('[data-qa-mat]')].filter(e => /blur/.test(getComputedStyle(e).filter)).length,
  invisibles: [...document.querySelectorAll('[data-qa-mat]')].filter(e => parseFloat(getComputedStyle(e).opacity) < 0.99).length,
  movidas: [...document.querySelectorAll('[data-qa-mat]')].filter(e => getComputedStyle(e).transform !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(getComputedStyle(e).transform)).length }));
(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const tema of ['glass-oscuro', 'clasico']) for (const w of [390, 1280]) {
    const tag = `${tema === 'clasico' ? 'claro' : 'oscuro'}-${w}`; console.log(`\n== ${tag}`);
    const { ctx, page, errs } = await abrir(browser, w, tema);
    ok(await page.evaluate(() => document.documentElement.classList.contains('nx-mat') && !!document.getElementById('nxMaterializarCSS')), `${tag} capa encendida`);
    ok(await page.evaluate(() => document.querySelectorAll('.nx-mat-in').length === 0), `${tag} la primera pantalla al abrir no se anima`);
    for (const v of ['clientes', 'polizas', 'facturas', 'dashboard']) {
      const r = await IR(page, v);
      ok(r.n >= 1 && r.n <= 10 && r.anim === 'nxMatIn', `${tag} ${v}: ${r.n} piezas se materializan`, r);
      ok(r.delays.every((d, i) => i === 0 || d >= r.delays[i - 1]), `${tag} ${v}: en cascada (${r.delays.join(',')} ms)`, r.delays);
      ok(r.viejos === 0 || r.viejoAnim === 'none', `${tag} ${v}: la cascada vieja no se suma`, r);
      if (v === 'clientes') { await sleep(140); await page.screenshot({ path: OUT + `${tag}-clientes-medio.png` }); }
      await sleep(1300);
      const d = await DESPUES(page);
      ok(d.quedan === 0 && d.borrosas === 0 && d.invisibles === 0 && d.movidas === 0, `${tag} ${v}: al terminar todo queda nítido y visible`, d);
      if (v === 'clientes') await page.screenshot({ path: OUT + `${tag}-clientes-final.png` });
    }
    // Volver a la misma pantalla sin cambiar (refresco de datos) no anima.
    const re = await page.evaluate(async () => { try { rDash(); } catch (e) {} await new Promise(r => setTimeout(r, 0)); return document.querySelectorAll('.nx-mat-in:not(.nx-mat-fin)').length; });
    ok(re === 0, `${tag} refrescar datos de la pantalla no la anima`, re);
    ok(errs.length === 0, `${tag} sin errores de JS`, errs);
    await ctx.close();
  }
  for (const caso of [{ apagado: true }, { reducir: true }]) {
    const tag = caso.apagado ? 'apagada' : 'reducir-movimiento'; console.log(`\n== ${tag}`);
    const { ctx, page, errs } = await abrir(browser, 390, 'glass-oscuro', caso);
    const r = await IR(page, 'clientes');
    ok(r.n === 0, `${tag}: no se anima nada`, r);
    ok(errs.length === 0, `${tag}: sin errores de JS`, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
