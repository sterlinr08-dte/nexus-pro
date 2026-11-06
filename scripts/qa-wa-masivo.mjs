// QA 59.81 — WhatsApp masivo a los clientes elegidos (dueño, 06-nov-2026, opción A).
// App real contra scripts/qa-crm-mock-server.js (con QA_CLIENTES=30), a 390×844 y 1280×800.
// Intercepta la RPC whatsapp_crear_lote_envio_masivo y la Edge whatsapp-envio-masivo: NO se envía nada real.
//  · Clientes (cuadrícula, marcados) → «WhatsApp masivo» abre la ventana sin error; sin elegir mensaje no se puede enviar.
//  · Cancelar no crea nada. Confirmar crea UNA tanda con el tipo elegido y solo los marcados; el progreso se ve sobre Clientes.
//  · Facturas › Más filtros › «WA masivo» → clientes de las facturas en pantalla (sin repetir).
//  · WhatsApp › Contactos (ventana real): ya lista a todos los clientes con WhatsApp (no solo 14).
//  · Tamaños: tipos ≥54, botón principal ≥54, Cancelar ≥44; sin scroll de lado.
// Uso: QA_CLIENTES=30 PORT=8942 node scripts/qa-crm-mock-server.js &   node scripts/qa-wa-masivo.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-wa-masivo')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const LOTE = '00000000-0000-4000-8000-00000000107e';

async function abrir(browser, width) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, userAgent: movil ? UA : undefined, locale: 'es-DO', deviceScaleFactor: movil ? 2 : 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  const st = { lotes: [], edge: 0 };
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/functions\/v1\/whatsapp-envio-masivo/.test(u)) { st.edge++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, terminado: true }) }); }
    if (/rpc\/whatsapp_crear_lote_envio_masivo/.test(u)) { st.lotes.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOTE) }); }
    if (/whatsapp_envio_masivo_lotes\?/.test(u)) { const b = st.lotes[st.lotes.length - 1] || { p_cliente_ids: [] }; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: LOTE, estado: 'completado', total_destinatarios: b.p_cliente_ids.length, enviados: b.p_cliente_ids.length, fallidos: 0 }]) }); }
    if (/whatsapp_envio_masivo_destinatarios\?/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(() => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 20 && window.__nxWaMasivoElegidos && typeof window.nxWaIniciarEnvioMasivo === 'function', null, { timeout: 30000 });
  await sleep(2000);
  return { ctx, page, errs, st };
}
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), dis: e.disabled, t: e.textContent.trim().replace(/\s+/g, ' ') }; }, sel);

(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 1280]) {
    console.log(`\n== ${width}px ==`);
    const { ctx, page, errs, st } = await abrir(browser, width);
    // ── Clientes
    await page.evaluate(() => { nav('clientes', null); cliVista('cuadricula'); });
    await sleep(700);
    const ids = await page.evaluate(() => { const cs = [...document.querySelectorAll('#tbCli .cliCard-chk')].slice(0, 3); cs.forEach(c => c.click()); return _cliSeleccion.slice(); });
    ok(ids.length === 3, 'Clientes: 3 marcados', ids);
    await page.click('#cliBulkBar button[onclick="cliBulkWA()"]');
    await sleep(400);
    ok(await page.$('#nxMeOv') !== null, 'Clientes: «WhatsApp masivo» abre la ventana');
    ok(!errs.length, 'sin errores de página', errs);
    let b = await caja(page, '#nxMeOv .ok');
    ok(b && b.dis && /Elija/.test(b.t), 'sin elegir el mensaje no se puede enviar', b);
    ok(await page.$$eval('#nxMeOv .nxMeFila', f => f.length) === 3, 'lista los 3 marcados');
    const tipo = await caja(page, '#nxMeOv .nxMeTipo'), canc = await caja(page, '#nxMeOv .no');
    ok(tipo.h >= 54 && b.h >= 54 && canc.h >= 44 && canc.w >= 44, 'tamaños: tipo ≥54, enviar ≥54, cancelar ≥44', { tipo, b, canc });
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll de lado');
    await page.screenshot({ path: OUT + `ventana-${width}.png` });
    await page.click('#nxMeOv .no'); await sleep(200);
    ok(!(await page.$('#nxMeOv')) && st.lotes.length === 0, 'Cancelar cierra y no crea nada');
    await page.click('#cliBulkBar button[onclick="cliBulkWA()"]'); await sleep(300);
    await page.click('#nxMeOv .nxMeTipo[data-k="pago"]');
    b = await caja(page, '#nxMeOv .ok');
    ok(!b.dis && /Confirmar y enviar a 3/.test(b.t), 'al elegir, dice «Confirmar y enviar a 3»', b);
    await page.screenshot({ path: OUT + `elegido-${width}.png` });
    await page.click('#nxMeOv .ok'); await sleep(1500);
    const l = st.lotes[0] || {};
    ok(st.lotes.length === 1 && l.p_tipo === 'pago' && JSON.stringify([...l.p_cliente_ids].sort()) === JSON.stringify([...ids].map(String).sort()), 'crea UNA tanda «pago» solo con los marcados', st.lotes);
    ok(st.edge >= 1, 'llama al envío del Buzón');
    const prog = await page.evaluate(() => { const o = document.getElementById('nxWaEnvioMasivoOverlay'); return o ? { padre: o.parentElement.id || o.parentElement.tagName, vis: o.getBoundingClientRect().width > 0, t: o.textContent.replace(/\s+/g, ' ').trim() } : null; });
    ok(prog && prog.vis && /completado/i.test(prog.t), 'el progreso se ve sobre Clientes y termina', prog);
    await page.screenshot({ path: OUT + `progreso-${width}.png` });
    await page.evaluate(() => _waCerrarPanelEnvioMasivo());
    // ── Facturas
    await page.evaluate(() => { nav('facturas', null); try { switchTab('fact'); } catch (e) {} const s = document.getElementById('fFactEstado'); if (s) { s.value = 'atrasadas'; } rFact(); });
    await sleep(700);
    const esperado = await page.evaluate(() => { const vis = window._nxFactListaVisible || []; const m = new Map(ST.clientes.map(c => [String(c.id), c])); return [...new Set(vis.filter(f => f.estado !== 'Anulada').map(f => String(f.cliente_id)))].filter(id => { const c = m.get(id); return c && c.activo !== false && c.wa; }).length; });
    await page.evaluate(() => { const d = [...document.querySelectorAll('details')].find(x => x.querySelector('[onclick="abrirWAMasivo()"]')); if (d) d.open = true; });
    await page.click('[onclick="abrirWAMasivo()"]'); await sleep(400);
    const nF = await page.$$eval('#nxMeOv .nxMeFila', f => f.length).catch(() => -1);
    ok(esperado > 0 && nF === esperado, `Facturas: «WA masivo» lista los clientes de las facturas en pantalla (${nF}/${esperado})`);
    ok(await page.$eval('#nxMeOv .nxMeTipo[data-k="pago"]', e => e.getAttribute('aria-checked')) === 'true', 'con «Atrasadas», viene marcado «Recordatorio de pago»');
    await page.click('#nxMeOv .no'); await sleep(200);
    ok(st.lotes.length === 1, 'Facturas: cancelar no crea tanda');
    // ── WhatsApp › Contactos
    await page.evaluate(() => { nav('waInbox', null); }); await sleep(1500);
    await page.evaluate(() => { try { nxWaContactFiltro('todos'); } catch (e) {} }); await sleep(300);
    await page.evaluate(() => window.nxWaVisualAbrirContactos && window.nxWaVisualAbrirContactos()); await sleep(500);
    const L = '#nxWaCtxOverlay.open .nxWaContactList .nxWaContact';
    const filas = await page.$$eval(L, f => f.length);
    const totalSeg = await page.evaluate(() => (ST.clientes || []).filter(c => c.activo !== false && c.wa).length);
    ok(filas === totalSeg, `Contactos (ventana real): ya muestra a todos los que recibirían (${filas}/${totalSeg})`);
    await page.screenshot({ path: OUT + `contactos-${width}.png` });
    ok(!errs.length, 'sin errores de página al final', errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass}/${pass + fail} PASS`); process.exit(fail ? 1 : 0);
})();
