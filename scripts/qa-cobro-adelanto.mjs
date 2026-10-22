// QA 59.55 «meses por adelantado» en Registrar pago (capa #nxAdelPane). App real contra scripts/qa-crm-mock-server.js, a 390 y 1280:
//  · un solo atajo encendido; «Saldo total» apagado si está al día;
//  · «N cuotas de RD$ X» debajo del monto; cuadrícula de meses (morado = este pago, verde = ya adelantados, punteado = próxima);
//  · resumen y botón con meses exactos (sin «≈») y «a favor» si sobra; nada se envía al servidor al pintar.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-cobro-adelanto.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-cobro-adelanto')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript((abierto) => {
    if (!sessionStorage.getItem('__qaIni')) { sessionStorage.setItem('__qaIni', '1'); localStorage.removeItem('nx_tema'); localStorage.removeItem('nx_tgo_off'); if (abierto === null) localStorage.removeItem('nx_menu_cristal'); else localStorage.setItem('nx_menu_cristal', abierto ? '1' : '0'); }
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    // Estado del menú en el primer cuadro pintado con <body> (lo que ve el usuario) y en DOMContentLoaded.
    window.__mcCuadros = [];
    const tick = () => { if (document.body) window.__mcCuadros.push(document.documentElement.classList.contains('nx-mc-open')); if (window.__mcCuadros.length < 240) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    document.addEventListener('DOMContentLoaded', () => { window.__mcDCL = document.documentElement.classList.contains('nx-mc-open'); }, { once: true, capture: true });
  }, opts.abierto === undefined ? null : opts.abierto);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
    await sleep(2500);
  return { ctx, page, errs };
}



(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px`);
    const { ctx, page, errs } = await abrir(browser, w);
    const escrituras = []; page.on('request', r => { if (r.method() !== 'GET' && /rest\/v1\//.test(r.url()) && !/rpc\/mi_es_superadmin/.test(r.url())) escrituras.push(r.method() + ' ' + r.url().split('/rest/v1/')[1]); });
    // Cliente al día, cuota conocida, factura el 20; sin adelanto previo
    const info = await page.evaluate(() => { const c = ST.clientes[1]; c.dia_facturacion = 20; c.pagado = c.deuda_total || 0; abrirAbono(c.id); return { cuota: getTot(c) }; });
    await sleep(700);
    const n0 = escrituras.length;
    let r = await page.evaluate(() => ({ dis: document.getElementById('aQSaldar').disabled, sel: [...document.querySelectorAll('#mAbono .aboQbtn.nxSel')].map(b => b.id) }));
    ok(r.dis && r.sel.length === 0, `${w}px al día: «Saldo total» apagado y ningún atajo encendido`, r);
    await page.click('#aQAdel'); await sleep(250);
    for (let i = 0; i < 3; i++) { await page.evaluate(() => nxAboPasoMeses(1)); await sleep(120); }
    r = await page.evaluate(() => ({ sel: [...document.querySelectorAll('#mAbono .aboQbtn.nxSel')].map(b => b.id), cuotas: document.getElementById('nxAdCuotas').textContent, nuevos: document.querySelectorAll('#nxAdVista .nxAdM.nuevo').length, sig: document.querySelectorAll('#nxAdVista .nxAdM.sig').length, res: document.querySelector('#nxAdVista .nxAdRes').textContent, em: (document.querySelector('#aboResumenTxt em') || {}).textContent || '', btn: document.getElementById('btnAbo').textContent, vis: !document.getElementById('nxAdVista').hidden }));
    ok(r.sel.length === 1 && r.sel[0] === 'aQAdel', `${w}px «Adelantar» es el único encendido`, r.sel);
    ok(/^4 cuotas de RD\$/.test(r.cuotas), `${w}px debajo del monto: «4 cuotas de …»`, r.cuotas);
    ok(r.vis && r.nuevos === 4 && r.sig === 1, `${w}px cuadrícula: 4 meses de este pago + la próxima`, r);
    ok(/tiene pagado hasta la factura de/.test(r.res) && /próxima que tendrá que pagar/.test(r.res), `${w}px resumen dice hasta qué factura queda pagado y cuál sigue`, r.res);
    ok(!/≈/.test(r.em) && (r.em.match(/\(\d+ mes/g) || []).length === 1 && /\(4 meses\)/.test(r.em), `${w}px resumen exacto «(4 meses)» sin «≈»`, r.em);
    await page.screenshot({ path: OUT + `${w}-adelanto.png` });
    // Monto que no cuadra: 4 cuotas + 500
    await page.evaluate(c => { const el = document.getElementById('aMnt'); el.value = window.nxMoney ? window.nxMoney.format(String(c * 4 + 500)) : String(c * 4 + 500); nxAboActualizarResumen(); }, info.cuota); await sleep(200);
    r = await page.evaluate(() => ({ cuotas: document.getElementById('nxAdCuotas').textContent, res: document.querySelector('#nxAdVista .nxAdRes').textContent, em: (document.querySelector('#aboResumenTxt em') || {}).textContent || '' }));
    ok(/\+ RD\$\s?500/.test(r.cuotas) && /a favor/.test(r.res) && /a favor/.test(r.em), `${w}px monto que no cuadra: «+ RD$ 500 a favor»`, r);
    // Con 1 mes adelantado de antes: sale en verde
    await page.evaluate(() => { const c = ST.clientes[1]; c.pagado = (c.deuda_total || 0) + getTot(c); try { cm('mAbono'); } catch (e) {} });
    await sleep(400); await page.evaluate(() => abrirAbono(ST.clientes[1].id)); await sleep(700);
    await page.click('#aQAdel'); await sleep(250);
    r = await page.evaluate(() => ({ ya: document.querySelectorAll('#nxAdVista .nxAdM.ya').length, nuevos: document.querySelectorAll('#nxAdVista .nxAdM.nuevo').length }));
    ok(r.ya === 1 && r.nuevos === 1, `${w}px con 1 mes adelantado antes: 1 verde («ya pagado») + 1 de este pago`, r);
    await page.screenshot({ path: OUT + `${w}-adelanto-previo.png` });
    ok(escrituras.length === n0, `${w}px pintar no escribe nada en el servidor`, escrituras.slice(n0));
    ok(errs.length === 0, `${w}px sin errores`, errs);
    await ctx.close();
  }
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
