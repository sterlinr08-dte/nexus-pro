// QA de la ventana «Registrar pago» (#mAbono) 59.01 — app real contra scripts/qa-crm-mock-server.js, tema Glass oscuro,
// 390×844 (iPhone) y 1280×800. Intercepta la RPC real seguros_registrar_cobro_con_entrega y el PATCH del comprobante.
//  · Orden: cliente → monto → cómo pagó (banco · referencia · cuenta · comprobante) → quién cobró → resumen → botón.
//  · Altura: Efectivo ≤ 1,000 px (incluye la línea «En poder de») y Transferencia ≤ 1,450 px a 390 (antes 1,225 / ~1,860).
//  · Lógica: método/banco/cuenta se reinician al abrir; Efectivo sin referencia envía «Efectivo»; Transferencia sin
//    referencia no llama a la RPC; tras registrar, window._ultimoAbono.abonoId = abono_id devuelto (recibo enlazado);
//    el comprobante se enlaza con PATCH abonos?id=eq.<abono_id>&comprobante_url=is.null (nunca «el último del cliente»).
//  · Custodia (regla del dueño, = seguros_resumen_ciclo_agente_core): Efectivo → «En poder de» quien recibió; Transferencia/
//    Depósito → «En poder de» el dueño de la cuenta donde se depositó, aunque otro haya gestionado el cobro.
//  · Atajos: «1 cuota» = getTot, «Saldar» = pendiente, «Adelantar» +/− meses = pendiente + N·cuota; resumen y botón con el monto.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-registrar-pago.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-registrar-pago')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
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


const ABONO_ID = '00000000-0000-4000-8000-00000000ab01', ENTREGA_ID = '00000000-0000-4000-8000-00000000e001';
async function metodo(page, m) { await page.evaluate(m => { const s = document.getElementById('aMet'); s.value = m; s.dispatchEvent(new Event('change')); nxChipsSync('mAbono'); }, m); await sleep(250); }
const ALTO = () => document.querySelector('#mAbono .modal').scrollHeight;

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px`);
    const { ctx, page, errs } = await abrir(browser, w);
    const rpc = [], patch = [];
    await page.route(/\/rest\/v1\/rpc\/seguros_registrar_cobro_con_entrega/, async r => { rpc.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, nuevo_pagado: 0, abono_id: ABONO_ID, asiento_id: null, entrega_id: ENTREGA_ID, adelanto: false }) }); });
    await page.route(/\/rest\/v1\/abonos\?id=eq\./, async r => { if (r.request().method() === 'PATCH') { patch.push(r.request().url()); return r.fulfill({ status: 204, body: '' }); } return r.fallback(); });
    await page.route(/\/rest\/v1\/rpc\/seguros_adjuntar_comprobante_entrega/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    const [A, B] = await page.evaluate(() => [ST.clientes[1].id, ST.clientes[2].id]);
    // ── orden y reinicio ──
    await page.evaluate(id => abrirAbono(id), A); await sleep(600);
    const orden = await page.evaluate(() => { const ids = ['abonoI', 'aMnt', 'aMetChips', 'aRef', 'nxBaucheWrap', 'aAgenteChips', 'aboResumenTxt', 'btnAbo']; return ids.map(i => { const e = document.getElementById(i); return e ? Math.round(e.getBoundingClientRect().top + document.querySelector('#mAbono .modal').scrollTop) : null; }); });
    ok(orden.every(v => v !== null) && await page.evaluate(() => { const ids = ['abonoI', 'aMnt', 'aMetChips', 'aRef', 'nxBaucheWrap', 'aAgenteChips', 'aboResumenTxt', 'btnAbo'].map(i => document.getElementById(i)); return ids.every((e, i) => i === 0 || (ids[i - 1].compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)); }), `${w}px orden: cliente → monto → método → referencia → comprobante → agente → resumen → botón`, orden);
    ok(await page.evaluate(() => document.getElementById('aMet').value === 'Efectivo'), `${w}px abre en Efectivo`);
    if (w < 500) { const h = await page.evaluate(ALTO); ok(h <= 1000, `${w}px altura con Efectivo ≤ 1,000 px (${h})`, h); }
    await page.screenshot({ path: OUT + `${w}-efectivo.png` });
    await metodo(page, 'Transferencia');
    await page.evaluate(() => { const b = document.getElementById('aBanco'); b.value = b.options[1] ? b.options[1].value : ''; b.dispatchEvent(new Event('change')); });
    if (w < 500) { const h = await page.evaluate(ALTO); ok(h <= 1450, `${w}px altura con Transferencia ≤ 1,450 px (${h})`, h); }
    const juntos = await page.evaluate(() => { const t = i => document.getElementById(i).getBoundingClientRect().top; return t('aBancoCont') < t('aRef') && t('aRef') < t('aDirectoWrap') && t('aDirectoWrap') < t('nxBaucheWrap') && t('nxBaucheWrap') < t('aAgenteChips'); });
    ok(juntos, `${w}px banco → referencia → cuenta → comprobante juntos, antes del agente`);
    ok(await page.evaluate(() => /transferencia/i.test(document.getElementById('aRefLbl').textContent) && /\*/.test(document.getElementById('aRefLbl').textContent)), `${w}px etiqueta de referencia según el método (Transferencia, obligatoria)`);
    await page.screenshot({ path: OUT + `${w}-transferencia.png` });
    await page.evaluate(() => closeM('mAbono')); await sleep(300);
    await page.evaluate(id => abrirAbono(id), B); await sleep(600);
    const reinicio = await page.evaluate(() => ({ m: document.getElementById('aMet').value, b: document.getElementById('aBanco').value, c: (document.getElementById('aDirectoCuenta') || {}).value || '', vis: getComputedStyle(document.getElementById('aBancoCont')).display }));
    ok(reinicio.m === 'Efectivo' && !reinicio.b && !reinicio.c && reinicio.vis === 'none', `${w}px al abrir otro cliente NO se arrastra método/banco/cuenta`, reinicio);
    // ── regla de custodia en la ventana: Efectivo → quien recibió; banco → dueño de la cuenta ──
    const cust = await page.evaluate(async () => {
      const sel = (id, i) => { const e = document.getElementById(id); e.value = e.options[i].value; e.dispatchEvent(new Event('change')); return e.options[i].textContent.trim(); };
      const ag = document.getElementById('aAgente'); const iAg = [...ag.options].findIndex(o => o.value);
      const nomAg = sel('aAgente', iAg); nxAboActualizarResumen();
      const ef = { tit: document.getElementById('aAgenteTit').textContent, poder: document.getElementById('aboEnPoder').textContent };
      const m = document.getElementById('aMet'); m.value = 'Transferencia'; m.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 150));
      const cu = document.getElementById('aDirectoCuenta'); const iCu = [...cu.options].findIndex(o => o.value && o.textContent.trim() !== nomAg);
      const nomCu = sel('aDirectoCuenta', iCu); nxAboActualizarResumen();
      const tr = { tit: document.getElementById('aAgenteTit').textContent, poder: document.getElementById('aboEnPoder').textContent, cuentaTit: document.querySelector('#aDirectoWrap strong').textContent };
      m.value = 'Efectivo'; m.dispatchEvent(new Event('change'));
      return { nomAg, nomCu, ef, tr };
    });
    ok(/recibió el efectivo/i.test(cust.ef.tit) && cust.ef.poder.includes('En poder de: ' + cust.nomAg) && /efectivo/i.test(cust.ef.poder), `${w}px Efectivo: «En poder de» quien recibió el efectivo`, cust.ef);
    ok(/gestionó/i.test(cust.tr.tit) && cust.tr.poder.includes('En poder de: ' + cust.nomCu) && cust.tr.poder.includes('no está en poder de ' + cust.nomAg) && /llegó el dinero/i.test(cust.tr.cuentaTit), `${w}px Transferencia: «En poder de» el dueño de la cuenta, no quien gestionó`, cust);
    // ── atajos ──
    const at = await page.evaluate(() => { const c = ST.clientes.find(x => x.id === abonoCliId); const P = s => window.nxMoney ? nxMoney.parse(document.getElementById('aMnt').value) : parseFloat(document.getElementById('aMnt').value);
      nxAboUnaCuota(); const una = P(); nxAboSaldar(); const sal = P(); nxAboToggleAdelanto(); const ad1 = P(); nxAboPasoMeses(1); const ad2 = P(); nxAboToggleAdelanto(); const off = P();
      return { cuota: getTot(c), pend: pend(c), una, sal, ad1, ad2, off, tit: document.getElementById('aboResumenTit').textContent, btn: document.getElementById('btnAbo').textContent.trim() }; });
    ok(at.una === at.cuota && at.sal === at.pend && at.ad1 === at.pend + at.cuota && at.ad2 === at.pend + 2 * at.cuota && at.off === at.pend, `${w}px atajos: 1 cuota / Saldar / Adelantar +1 mes / apagar`, at);
    ok(/Registrar RD\$/.test(at.btn) && /RD\$/.test(at.tit), `${w}px resumen y botón muestran el monto`, at);
    // ── Transferencia sin referencia: no llama a la RPC ──
    await metodo(page, 'Transferencia'); await page.fill('#aRef', '');
    await page.evaluate(() => regAbono()); await sleep(300);
    ok(rpc.length === 0, `${w}px Transferencia sin referencia → no se registra (se pide el número)`, rpc.length);
    // ── Efectivo sin referencia + comprobante ──
    await metodo(page, 'Efectivo'); await page.fill('#aRef', '');
    await page.evaluate(() => { window._nxBaucheURL = 'https://tnwsgcxurfyuszxsewsn.supabase.co/storage/v1/object/public/comprobantes/qa/x.jpg'; });
    await page.evaluate(() => regAbono()); await sleep(1500);
    ok(rpc.length === 1 && rpc[0].p_referencia === 'Efectivo' && rpc[0].p_metodo === 'Efectivo', `${w}px Efectivo sin referencia → se envía «Efectivo»`, rpc[0]);
    ok(rpc[0] && !!rpc[0].p_idempotency_key && !!rpc[0].p_agente_cobro, `${w}px la RPC lleva llave de idempotencia y agente`, rpc[0]);
    const ua = await page.evaluate(() => window._ultimoAbono && window._ultimoAbono.abonoId);
    ok(ua === ABONO_ID, `${w}px window._ultimoAbono.abonoId = abono_id (el recibo queda enlazado)`, ua);
    ok(patch.length === 1 && patch[0].includes('id=eq.' + ABONO_ID) && patch[0].includes('comprobante_url=is.null'), `${w}px comprobante al abono EXACTO (no «el último del cliente»)`, patch);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('reciboWAbtn')).display !== 'none' && getComputedStyle(document.getElementById('btnReciboAdelanto')).display === 'none'), `${w}px tras registrar: caja de recibo visible; sin botón de recibo suelto`);
    ok(errs.length === 0, `${w}px sin errores de consola`, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
