// QA de «Cuenta segura» (parches-cobro-cuenta-segura.js) — app real contra scripts/qa-crm-mock-server, a 390 y 1280 px.
//  · Cajero: Transferencia sin comprobante NO llama a la RPC y avisa; con comprobante sí; Efectivo sigue igual.
//  · La nota bajo «Cuenta de destino» dice si entró a la cuenta del administrador o si lo valida el administrador.
//  · Administrador: Transferencia sin comprobante sí llama a la RPC.
//  · Apagada (nx_cuenta_segura_off): no avisa y llama a la RPC (la regla del servidor es aparte).
// La regla del servidor (migración 20261112220000) no se prueba aquí: el servidor de pruebas no la ejecuta.
// Uso: PORT=8953 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8953 node scripts/qa-cuenta-segura.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw; const fs = require('fs'), path = require('path'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8953';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-cuenta-segura')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 500) : '')); } };

async function abrir(browser, width, rol, off) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(({ rol, off }) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    if (off) localStorage.setItem('nx_cuenta_segura_off', '1'); else localStorage.removeItem('nx_cuenta_segura_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: rol === 'admin' ? 'Esterlin Espinal' : 'Cajera', rol, cargo: rol === 'admin' ? 'ADMIN' : 'CAJERO', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { rol, off: !!off });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(2500);
  const rpc = [];
  await page.route(/\/rest\/v1\/rpc\/seguros_registrar_cobro_con_entrega/, async r => { rpc.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, nuevo_pagado: 0, abono_id: '00000000-0000-4000-8000-00000000ab01', asiento_id: null, entrega_id: null, adelanto: 0 }) }); });
  await page.route(/\/rest\/v1\/abonos\?id=eq\./, async r => r.request().method() === 'PATCH' ? r.fulfill({ status: 204, body: '' }) : r.fallback());
  await page.route(/\/rest\/v1\/rpc\/(seguros_adjuntar_comprobante_entrega|comprobante_)/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  return { ctx, page, errs, rpc };
}
// Llena Transferencia; cuenta = 'admin' u 'otro'. Devuelve la nota.
const llenar = (page, cuenta) => page.evaluate(async (cuenta) => {
  const ev = (e) => e.dispatchEvent(new Event('change', { bubbles: true }));
  const ag = document.getElementById('aAgente'); ag.value = [...ag.options].find(o => o.value).value; ev(ag);
  const m = document.getElementById('aMet'); m.value = 'Transferencia'; ev(m); await new Promise(r => setTimeout(r, 200));
  const b = document.getElementById('aBanco'); b.value = b.options[1].value; ev(b);
  document.getElementById('aRef').value = '123456';
  const adm = (ST.agentes.find(a => String(a.cargo).toLowerCase() === 'admin') || {}).id;
  const cu = document.getElementById('aDirectoCuenta');
  cu.value = cuenta === 'admin' ? adm : [...cu.options].find(o => o.value && o.value !== adm).value; ev(cu);
  try { nxAboActualizarResumen(); } catch (e) {}
  await new Promise(r => setTimeout(r, 400));
  const n = document.getElementById('nxCtaSegNota');
  return n ? n.textContent : null;
}, cuenta);

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px · cajero`);
    let { ctx, page, errs, rpc } = await abrir(browser, w, 'cajero');
    const A = await page.evaluate(() => ST.clientes[1].id);
    await page.evaluate(id => abrirAbono(id), A); await sleep(700);
    let nota = await llenar(page, 'otro');
    ok(nota === 'La valida el administrador · Falta el comprobante', `${w}px cuenta de otro agente: dice que lo valida el administrador y pide el comprobante`, nota);
    await page.evaluate(() => regAbono()); await sleep(900);
    ok(rpc.length === 0, `${w}px Transferencia sin comprobante: no se llama al servidor`, rpc.length);
    const t = await page.evaluate(() => [...document.querySelectorAll('.toast,.nxToast,[class*="toast"]')].map(e => e.textContent).join(' | '));
    ok(/Falta el comprobante/.test(t), `${w}px aviso «Falta el comprobante»`, t.slice(0, 200));
    const med = await page.evaluate(() => { const n = document.getElementById('nxCtaSegNota'), r = n.getBoundingClientRect(), d = document.documentElement; return { fs: getComputedStyle(n).fontSize, vis: r.width > 0 && r.height > 0, sw: d.scrollWidth - d.clientWidth, alto: Math.round(r.height), der: Math.round(r.right), ancho: innerWidth }; });
    ok(med.vis && med.sw <= 0 && med.der <= med.ancho && parseFloat(med.fs) >= 12, `${w}px la nota se ve, cabe y no hay barra de lado`, med);
    await page.evaluate(() => document.getElementById('aDirectoWrap').scrollIntoView({ block: 'center' })); await sleep(300);
    await page.screenshot({ path: OUT + `cuenta-segura-${w}-otro.png` });
    nota = await llenar(page, 'admin');
    ok(nota === 'Falta el comprobante', `${w}px cuenta del administrador: lo dice`, nota);
    await page.evaluate(() => { window._nxBaucheURL = 'https://tnwsgcxurfyuszxsewsn.supabase.co/storage/v1/object/public/comprobantes/qa/x.jpg'; document.getElementById('nxBaucheWrap').appendChild(document.createElement('i')); });
    await sleep(600);
    const nota2 = await page.evaluate(() => { const n = document.getElementById('nxCtaSegNota'); return n.textContent + '|' + n.style.display + '|' + document.querySelector('#nxBaucheWrap > label').textContent.trim(); });
    ok(/^\|none\|Comprobante \*/.test(nota2), `${w}px con comprobante ya no lo pide; el rótulo dice «Comprobante *»`, nota2);
    await page.evaluate(() => regAbono()); await sleep(1800);
    ok(rpc.length === 1 && rpc[0].p_metodo === 'Transferencia' && !!rpc[0].p_comprobante_url && !!rpc[0].p_cuenta_destino_id, `${w}px con comprobante: se registra con cuenta y comprobante`, rpc[0]);
    ok(errs.length === 0, `${w}px sin errores`, errs); await ctx.close();

    ({ ctx, page, errs, rpc } = await abrir(browser, w, 'cajero'));
    await page.evaluate(id => abrirAbono(id), A); await sleep(700);
    await page.evaluate(() => { const ag = document.getElementById('aAgente'); ag.value = [...ag.options].find(o => o.value).value; ag.dispatchEvent(new Event('change', { bubbles: true })); const m = document.getElementById('aMet'); m.value = 'Efectivo'; m.dispatchEvent(new Event('change', { bubbles: true })); });
    await sleep(300); await page.evaluate(() => regAbono()); await sleep(1500);
    ok(rpc.length === 1 && rpc[0].p_metodo === 'Efectivo', `${w}px Efectivo: se registra igual que antes`, rpc[0]); await ctx.close();

    console.log(`== ${w}px · administrador`);
    ({ ctx, page, errs, rpc } = await abrir(browser, w, 'admin'));
    await page.evaluate(id => abrirAbono(id), A); await sleep(700);
    nota = await llenar(page, 'admin');
    await page.evaluate(() => regAbono()); await sleep(1500);
    ok(rpc.length === 1 && nota === '', `${w}px administrador sin comprobante: se registra y no se le pide`, { n: rpc.length, nota }); await ctx.close();

    console.log(`== ${w}px · apagada`);
    ({ ctx, page, errs, rpc } = await abrir(browser, w, 'cajero', true));
    await page.evaluate(id => abrirAbono(id), A); await sleep(700);
    nota = await llenar(page, 'otro');
    await page.evaluate(() => regAbono()); await sleep(1500);
    ok(nota === null && rpc.length === 1, `${w}px apagada: sin nota y sin candado en el navegador`, { nota, n: rpc.length }); await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
