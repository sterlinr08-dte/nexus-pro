// QA del tema «Stripe» (27-nov-2026): app real (index.html + parches) contra la REST simulada de scripts/qa-crm-mock-server.js.
// Entra como administrador con el tema guardado en «stripe» y revisa, a 390×844 y 1280×800:
//   · que <html> tenga tema-claro + tema-stripe y que los colores ya estén cambiados ANTES del primer pintado;
//   · que el acento sea el morado de Stripe (--c1 = #533afd) y el fondo #f6f9fc;
//   · que no haya desplazamiento de lado ni errores de la página;
//   · que Apariencia ya no ofrezca Premium Blue y sí ofrezca Stripe;
//   · que un usuario con «premium» guardado pase solo al Glass oscuro.
// Deja capturas de Inicio, Clientes, Facturas, Cobros, Registrar pago y Apariencia.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-tema-stripe.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-tema-stripe')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 500) : '')); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function abrir(browser, width, tema) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, deviceScaleFactor: movil ? 2 : 1, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  // Supabase → REST simulada; el resto de afuera (íconos y letras de la CDN) pasa; Sentry/EmailJS vacíos.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try {
    const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    if (/sentry|emailjs|googletagmanager|google-analytics/i.test(u)) return r.fulfill({ status: 200, body: '' });
    return r.continue();
  } catch (e) {} });
  await page.addInitScript(({ tema }) => {
    localStorage.setItem('nx_tema', tema); localStorage.removeItem('nx_tgo_off'); localStorage.removeItem('nx_claro_off');
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    // primer pintado: ¿ya estaba la hoja de Stripe aplicada cuando apareció el <body>?
    new MutationObserver((l, mo) => { if (document.body) { const c = getComputedStyle(document.documentElement).getPropertyValue('--c1').trim(); window.__primerC1 = c; window.__primerClases = document.documentElement.className; mo.disconnect(); } }).observe(document, { childList: true, subtree: true });
  }, { tema });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2000);
  // La preferencia de la base manda al cargar (como en producción). Se elige el tema igual que en Apariencia.
  // premium: igual que cargarTemaGuardado con «premium» en la base (aplicarTema(…, false))
  await page.evaluate((t) => aplicarTema(t, t === 'premium' ? false : undefined), tema); await sleep(1200);
  return { ctx, page, errs };
}

const ir = (v) => `nav('${v}',document.querySelector('[onclick*="nav(\\'${v}\\'"]'))`;
const PANTALLAS = [
  ['inicio', ir('dashboard')],
  ['clientes', ir('clientes')],
  ['facturas', ir('facturas')],
  ['cobros', ir('facturas') + ";setTimeout(()=>switchTab('cob'),300)"],
  ['custodia', ir('custodia')],
  ['registrar-pago', ir('clientes') + ';setTimeout(()=>abrirAbono(ST.clientes[0].id),300)'],
  ['apariencia', "try{closeM('mAbono')}catch(e){};" + ir('config') + ';setTimeout(()=>switchCfgTab(12),300)'],
];

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
for (const w of [390, 1280]) {
  const { ctx, page, errs } = await abrir(browser, w, 'stripe');
  const ini = await page.evaluate(() => ({ primer: window.__primerC1, primerClases: window.__primerClases, clases: document.documentElement.className, dataTema: document.documentElement.getAttribute('data-nx-tema'),
    c1: getComputedStyle(document.documentElement).getPropertyValue('--c1').trim(), bg: getComputedStyle(document.documentElement).getPropertyValue('--tgo-bg').trim(), n: window.__nxStripeN || 0, ms: window.__nxStripeMs }));
  ok(/tema-claro/.test(ini.clases) && /tema-stripe/.test(ini.clases), `${w}: <html> lleva tema-claro + tema-stripe`, ini.clases);
  ok(ini.dataTema === 'clasico', `${w}: data-nx-tema sigue en «clasico» (las pantallas claras lo reconocen)`, ini.dataTema);
  ok(ini.n > 500, `${w}: script#nxTemaStripeOn cambió ${ini.n} reglas de color (${ini.ms} ms en el <head>)`, ini);
  ok(ini.c1.toLowerCase() === '#533afd', `${w}: acento morado de Stripe (--c1)`, ini.c1);
  ok(ini.bg.toLowerCase() === '#f6f9fc', `${w}: fondo #f6f9fc (--tgo-bg)`, ini.bg);
  ok((ini.primer || '').toLowerCase() === '#533afd', `${w}: el primer pintado ya sale con Stripe (sin parpadeo)`, { primer: ini.primer, clases: ini.primerClases });
  for (const [nom, js] of PANTALLAS) {
    await page.evaluate((js) => { try { (0, eval)(js); } catch (e) { console.warn('qa: ' + e.message); } }, js);
    await sleep(1400);
    const r = await page.evaluate(() => ({ lado: document.documentElement.scrollWidth > window.innerWidth + 1 }));
    ok(!r.lado, `${w} ${nom}: sin desplazamiento de lado`);
    await page.screenshot({ path: `${OUT}stripe-${w}-${nom}.png`, fullPage: false });
    if (nom === 'apariencia') {
      const ops = await page.evaluate(() => [...document.querySelectorAll('#cfgApariencia .tema-opcion')].map(o => o.dataset.tema));
      ok(!ops.includes('premium'), `${w}: Apariencia ya no ofrece Premium Blue`, ops);
      ok(ops.includes('stripe'), `${w}: Apariencia ofrece Stripe al administrador`, ops);
      const sel = await page.evaluate(() => document.querySelector('#cfgApariencia .tema-sel')?.dataset.tema);
      ok(sel === 'stripe', `${w}: Stripe aparece marcado como activo`, sel);
    }
  }
  ok(errs.length === 0, `${w}: sin errores de la página`, errs.slice(0, 5));
  await ctx.close();
}
// Quien tenía Premium Blue guardado pasa al Glass oscuro
{
  const { ctx, page } = await abrir(browser, 390, 'premium');
  const r = await page.evaluate(() => ({ clases: document.documentElement.className, body: document.body.className, tema: document.documentElement.getAttribute('data-nx-tema') }));
  ok(/tema-glass-oscuro/.test(r.clases) && !/tema-premium/.test(r.body), 'Premium guardado → Glass oscuro', r);
  await ctx.close();
}
// El Claro de siempre no cambia (sin tema-stripe, acento azul)
{
  const { ctx, page } = await abrir(browser, 390, 'clasico');
  const r = await page.evaluate(() => ({ clases: document.documentElement.className, c1: getComputedStyle(document.documentElement).getPropertyValue('--c1').trim() }));
  ok(/tema-claro/.test(r.clases) && !/tema-stripe/.test(r.clases) && r.c1.toLowerCase() === '#2563eb', 'Claro sigue azul y sin Stripe', r);
  // Un administrador que NO es el dueño del sistema (el servidor simulado no confirma mi_es_superadmin) no ve Stripe.
  await page.evaluate(() => { nav('config', document.querySelector('[onclick*="nav(\'config\'"]')); setTimeout(() => switchCfgTab(12), 300); }); await sleep(2500);
  const ops = await page.evaluate(() => [...document.querySelectorAll('#cfgApariencia .tema-opcion')].map(o => o.dataset.tema));
  ok(!ops.includes('stripe') && !ops.includes('premium'), 'Admin que no es el dueño: Apariencia sin Stripe (todavía) y sin Premium', ops);
  await page.screenshot({ path: `${OUT}claro-390-inicio.png` });
  await ctx.close();
}
// El Glass oscuro no cambia
{
  const { ctx, page } = await abrir(browser, 390, 'glass-oscuro');
  const r = await page.evaluate(() => ({ clases: document.documentElement.className, c1: getComputedStyle(document.documentElement).getPropertyValue('--c1').trim() }));
  ok(/tema-glass-oscuro/.test(r.clases) && !/tema-stripe/.test(r.clases) && !/533afd/i.test(r.c1), 'Glass oscuro sin cambios', r);
  await ctx.close();
}
await browser.close();
console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
process.exit(fail ? 1 : 0);
