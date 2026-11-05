// QA 59.77 — «Rechazar pago» en Solicitudes › Pagos pendientes por validar (dueño, 05-nov-2026).
// App real contra scripts/qa-crm-mock-server.js, a 390×844 (iPhone) y 1280×800.
//  · Admin ve RECHAZAR (≥44×44); un agente no lo ve.
//  · La ventana pide motivo (≥5 letras): sin motivo el botón está apagado y no llama a la RPC.
//  · Rechazar llama a la reversa real seguros_reversar_cobro (motivo con prefijo, llave de idempotencia),
//    resincroniza las facturas del cliente (la última cuota vuelve a Pendiente) y quita el pago de la lista.
//  · Campo de 48 px y letra de 16 px; botones de 48 px.
//  · «Reversar cobro» desde la ficha también resincroniza las facturas (antes quedaban «Pagado»).
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-rechazar-pago.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-rechazar-pago')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ABONO = '00000000-0000-4000-8000-00000000ab77';
const CLI0 = '00000000-0000-4000-8000-000000000200'; // Maria Perez: pagado 8,000 · facturas 2020-01 y 2020-02 de 4,000

async function abrir(browser, width, rol) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.accept('Motivo de prueba QA').catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  const st = { pend: [{ abono_id: ABONO, cliente_id: CLI0, cliente: 'Maria Perez', monto: 4000, metodo: 'Transferencia', banco: 'Banreservas', agente: 'Robinson Perez', cobrado_por: 'Maria Gomez', referencia: 'REF-77', fecha: new Date().toISOString(), puede_validar: true }], rpc: [], patches: [] };
  await page.route(/\/rest\/v1\/rpc\/seguros_pagos_pendientes_validacion/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(st.pend) }));
  await page.route(/\/rest\/v1\/rpc\/seguros_reversar_cobro/, async r => { const b = JSON.parse(r.request().postData() || '{}'); st.rpc.push(b); st.pend = st.pend.filter(p => p.abono_id !== b.p_abono_id);
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reintento: false, abono_id: b.p_abono_id, estado: 'Reversado', asiento_reversa_id: null, nuevo_pagado: 4000, nueva_deuda_anterior: 0 }) }); });
  await page.route(/\/rest\/v1\/facturas\?id=eq\./, async r => { if (r.request().method() === 'PATCH') { st.patches.push({ url: r.request().url(), body: JSON.parse(r.request().postData() || '{}') }); return r.fulfill({ status: 204, body: '' }); } return r.fallback(); });
  await page.addInitScript((rol) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: rol === 'admin' ? 'Esterlin Espinal' : 'Robinson Perez', rol, cargo: rol === 'admin' ? 'ADMIN' : 'AGENTE', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, rol);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(2000);
  return { ctx, page, errs, st };
}
async function irSolicitudes(page) {
  await sleep(1500);
  await page.evaluate(() => nav('solicitudes'));
  await page.waitForSelector('#nxSolPayMerged [data-pay-id]', { timeout: 15000 }).catch(() => {});
  await sleep(800);
  if (!(await page.$('#nxSolPayMerged [data-pay-id]'))) console.log('  (debug) ' + JSON.stringify(await page.evaluate(() => ({ m: !!document.querySelector('#nxSolPayMerged'), on: document.querySelector('#v-solicitudes')?.className, t: (document.querySelector('#v-solicitudes .nxSL-section-pend')?.innerText || '').slice(0, 200) }))));
}
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(cs.fontSize), dis: e.disabled }; }, sel);

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px · admin`);
    const { ctx, page, errs, st } = await abrir(browser, w, 'admin');
    // Estado inicial: las dos cuotas «Pagado» (como Juan Minaya antes del arreglo)
    await page.evaluate(cid => { ST.facturas.filter(f => f.cliente_id === cid).forEach(f => f.estado = 'Pagado'); }, CLI0);
    await irSolicitudes(page);
    const b = await caja(page, '#nxSolPayMerged [data-pay-reject]');
    ok(b && b.w >= 44 && b.h >= 44, `${w}px admin ve RECHAZAR (≥44×44)`, b);
    const v = await caja(page, '#nxSolPayMerged [data-pay-validate]');
    ok(v && v.h >= 44, `${w}px VALIDAR también mide ≥44 de alto`, v);
    await page.screenshot({ path: OUT + `${w}-lista.png` });
    await page.click('#nxSolPayMerged [data-pay-reject]'); await sleep(400);
    const inp = await caja(page, '#nxSolPayMotivo'), btn0 = await caja(page, '.nxSolPayCard.rechazo .nxSolPayConfirm'), vol = await caja(page, '.nxSolPayCard.rechazo .nxSolPayCancel'), x = await caja(page, '.nxSolPayCard.rechazo .nxSolPayX');
    ok(inp && inp.h >= 48 && inp.fs >= 16, `${w}px campo Motivo de 48 px y letra de 16 px`, inp);
    ok(btn0 && btn0.dis === true && btn0.h >= 48 && vol.h >= 48 && x.w >= 44 && x.h >= 44, `${w}px sin motivo, «Rechazar pago» apagado; botones ≥48 y × ≥44`, { btn0, vol, x });
    ok(/cuota vuelve a pendiente/i.test(await page.textContent('.nxSolPayCard.rechazo')), `${w}px la ventana explica que la cuota vuelve a pendiente`);
    await page.screenshot({ path: OUT + `${w}-ventana.png` });
    await page.fill('#nxSolPayMotivo', 'abc'); await sleep(100);
    ok((await caja(page, '.nxSolPayCard.rechazo .nxSolPayConfirm')).dis === true && st.rpc.length === 0, `${w}px motivo de 3 letras: sigue apagado y no llama a la RPC`);
    await page.fill('#nxSolPayMotivo', 'El dinero no entró a la cuenta'); await sleep(100);
    await page.click('.nxSolPayCard.rechazo .nxSolPayConfirm'); await sleep(1500);
    const r = st.rpc[0] || {};
    ok(st.rpc.length === 1 && r.p_abono_id === ABONO && /^Pago rechazado en Solicitudes: El dinero no entró/.test(r.p_motivo) && String(r.p_idempotency_key || '').length >= 8, `${w}px llama UNA vez a seguros_reversar_cobro con motivo y llave`, st.rpc);
    const est = await page.evaluate(cid => ST.facturas.filter(f => f.cliente_id === cid).sort((a, b) => a.periodo < b.periodo ? -1 : 1).map(f => f.periodo + ':' + f.estado), CLI0);
    ok(est.join() === '2020-01:Pagado,2020-02:Pendiente' && st.patches.length === 1 && st.patches[0].body.estado === 'Pendiente', `${w}px la última cuota vuelve a Pendiente (1 PATCH)`, { est, p: st.patches });
    ok(await page.evaluate(cid => ST.clientes.find(c => c.id === cid).pagado, CLI0) === 4000, `${w}px el pagado del cliente baja a 4,000`);
    ok(!(await page.$('.nxSolPayOv')) && !(await page.$(`#nxSolPayMerged [data-pay-id="${ABONO}"]`)), `${w}px se cierra la ventana y el pago sale de la lista`);
    await page.screenshot({ path: OUT + `${w}-despues.png` });
    ok(errs.length === 0, `${w}px sin errores de página`, errs);
    await ctx.close();

    console.log(`== ${w}px · agente`);
    const a = await abrir(browser, w, 'agente');
    await irSolicitudes(a.page);
    ok(await a.page.$('#nxSolPayMerged [data-pay-id]') && !(await a.page.$('#nxSolPayMerged [data-pay-reject]')), `${w}px un agente ve el pago pero NO ve RECHAZAR`);
    await a.ctx.close();
  }
  // 59.80: si el pago tiene una entrega directa pendiente (sale arriba con Confirmar), no se repite abajo.
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px · pago con entrega pendiente`);
    const d = await abrir(browser, w, 'admin');
    await d.page.route(/\/rest\/v1\/entregas_admin\?select=abono_id/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ abono_id: ABONO }]) }));
    await irSolicitudes(d.page);
    ok(!(await d.page.$(`#nxSolPayMerged [data-pay-id="${ABONO}"]`)), `${w}px el pago con entrega pendiente no sale dos veces`);
    await d.ctx.close();
  }
  // «Reversar cobro» desde la ficha también resincroniza
  console.log('\n== reversarAbono (ficha del cliente)');
  const { ctx, page, st } = await abrir(browser, 1280, 'admin');
  await page.route(/\/rest\/v1\/abonos\?cliente_id=eq\./, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: ABONO, cliente_id: CLI0, monto: 4000, fecha: '2026-11-02', estado: 'Aplicado', metodo: 'Transferencia' }]) }));
  await page.evaluate(cid => { ST.facturas.filter(f => f.cliente_id === cid).forEach(f => f.estado = 'Pagado'); }, CLI0);
  await page.evaluate(([id, cid]) => reversarAbono(id, cid), [ABONO, CLI0]); await sleep(1200);
  const est = await page.evaluate(cid => ST.facturas.filter(f => f.cliente_id === cid).sort((a, b) => a.periodo < b.periodo ? -1 : 1).map(f => f.estado), CLI0);
  ok(st.rpc.length === 1 && est.join() === 'Pagado,Pendiente', 'reversar desde la ficha deja la última cuota en Pendiente', { rpc: st.rpc.length, est });
  await ctx.close();
  await browser.close();
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
