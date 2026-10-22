// QA 59.25 «un comprobante no se usa dos veces» (parches-bauche-unico.js) — app real contra scripts/qa-crm-mock-server.js,
// con las RPC nuevas y la Edge comprobante-leer simuladas por page.route (Supabase real nunca se toca). 390 (iPhone) y 1280:
//  A. comprobante nuevo: tarjeta verde, la IA llena referencia y banco vacíos, al guardar registra ANTES del cobro y
//     vincula DESPUÉS con el abono_id devuelto.
//  B. repetido y usuario agente: tarjeta roja con la coincidencia, sin aprobar; regAbono NO llama al cobro.
//  C. repetido y administrador: exige motivo; con motivo aprueba, manda p_motivo y cobra.
//  D. el servidor detecta el repetido aunque el navegador no: no cobra y la tarjeta pasa a roja.
//  E. monto del comprobante distinto al cobrado: aviso.
//  F. sin comprobante: el cobro sigue igual (no llama a las RPC nuevas).
//  G. mismo depósito para varios clientes: dentro del monto del comprobante se permite («compartido», azul) y manda
//     p_monto; si el cobro pasa del monto, vuelve a rojo.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-bauche-unico.mjs
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

const ABONO_ID = '00000000-0000-4000-8000-00000000ab01', ENTREGA_ID = '00000000-0000-4000-8000-00000000e001', COMP_ID = '00000000-0000-4000-8000-00000000cc01';
const HIT = [{ tipo: 'misma_foto', abono_id: '00000000-0000-4000-8000-00000000ab99', cliente: 'Cliente Anterior', monto: 4500, fecha: '2026-10-02T15:00:00Z', agente: 'Robinson', comprobante: 'https://x/viejo.jpg' }];
async function preparar(page, opts) {
  const log = { cobro: [], registrar: [], vincular: [], buscar: [], leer: 0, orden: [] };
  await page.route(/\/rest\/v1\/rpc\/seguros_registrar_cobro_con_entrega/, async r => { log.orden.push('cobro'); log.cobro.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, nuevo_pagado: 0, abono_id: ABONO_ID, asiento_id: null, entrega_id: ENTREGA_ID, adelanto: false }) }); });
  await page.route(/\/rest\/v1\/abonos\?id=eq\./, async r => { if (r.request().method() === 'PATCH') return r.fulfill({ status: 204, body: '' }); return r.fallback(); });
  await page.route(/\/rest\/v1\/rpc\/seguros_adjuntar_comprobante_entrega/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.route(/\/rest\/v1\/rpc\/comprobante_buscar/, async r => { log.buscar.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.buscar || []) }); });
  await page.route(/\/rest\/v1\/rpc\/comprobante_registrar/, async r => { log.orden.push('registrar'); log.registrar.push(JSON.parse(r.request().postData() || '{}'));
    if (opts.registrarError) return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'P0001', message: opts.registrarError, details: JSON.stringify(HIT) }) });
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(COMP_ID) }); });
  await page.route(/\/rest\/v1\/rpc\/comprobante_vincular/, async r => { log.orden.push('vincular'); log.vincular.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: 'true' }); });
  await page.route(/\/functions\/v1\/comprobante-leer/, async r => { log.leer++; await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, sha256: 'x', ia: opts.ia || null, ia_error: opts.iaErr || null }) }); });
  await page.route(/\/rest\/v1\/rpc\/comprobante_parecidos/, async r => { log.parecidos = JSON.parse(r.request().postData() || '{}'); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.parecidos || []) }); });
  return log;
}
async function cobroListo(page, cliente, rol) {
  await page.evaluate(([id, rol]) => { try { sesion.rol = rol; } catch (e) {} API.token = 'qa-token'; abrirAbono(id); }, [cliente, rol]); await sleep(700);
  await page.evaluate(() => { const m = document.getElementById('aMet'); m.value = 'Transferencia'; m.dispatchEvent(new Event('change')); nxChipsSync('mAbono'); }); await sleep(250);
}
async function adjuntar(page) { await page.evaluate(u => window.nxBaucheAsignarExterno(u, u), BASE + '/logo-nexus-pro.png'); }
async function esperarTarjeta(page, clase) { try { await page.waitForFunction(c => document.getElementById('nxBaucheCheck')?.classList.contains(c), clase, { timeout: 8000 }); return true; } catch (e) { return false; } }
async function completar(page, monto) {
  if (monto == null) monto = await page.evaluate(() => { const c = ST.clientes.find(x => x.id === abonoCliId); return Math.max(1, Math.round(pendTot(c))); });
  await page.evaluate(m => {
    const mn = document.getElementById('aMnt'); mn.value = String(m); mn.dispatchEvent(new Event('input', { bubbles: true }));
    const ag = document.getElementById('aAgente'); ag.value = [...ag.options].find(o => o.value).value; ag.dispatchEvent(new Event('change'));
    const b = document.getElementById('aBanco'); if (!b.value) { b.value = b.options[1].value; b.dispatchEvent(new Event('change')); }
    const cu = document.getElementById('aDirectoCuenta'); cu.value = [...cu.options].find(o => o.value).value; cu.dispatchEvent(new Event('change'));
    if (!document.getElementById('aRef').value) document.getElementById('aRef').value = '555';
    nxAboActualizarResumen();
  }, monto);
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px`);
    // A. nuevo + IA llena referencia y banco
    { const { ctx, page, errs } = await abrir(browser, w);
      const A = await page.evaluate(() => ST.clientes[1].id);
      await cobroListo(page, A, 'admin');
      const bancoTxt = await page.evaluate(() => { const b = document.getElementById('aBanco'); return b.options[2] ? b.options[2].text : ''; });
      const P = await page.evaluate(() => Math.max(1, Math.round(pendTot(ST.clientes[1]))));
      const log = await preparar(page, { buscar: [], ia: { es_comprobante: true, banco: bancoTxt, monto: P, moneda: 'DOP', fecha: '2026-10-13', numero_transaccion: '987654321', cuenta_destino: '1234', titular_destino: null, confianza: 0.93, modelo: 'claude-haiku-5-5' } });
      await page.evaluate(() => { document.getElementById('aRef').value = ''; const b = document.getElementById('aBanco'); b.value = ''; b.dispatchEvent(new Event('change')); });
      await adjuntar(page);
      const verde = await esperarTarjeta(page, 'nuevo');
      const st = await page.evaluate(() => ({ txt: document.getElementById('nxBaucheCheck')?.innerText || '', ref: document.getElementById('aRef').value, banco: document.getElementById('aBanco').value }));
      ok(verde && /nuevo/i.test(st.txt), `${w}px A: comprobante nuevo → tarjeta verde`, st);
      ok(st.ref === '987654321', `${w}px A: la IA llena la referencia con el número del banco`, st);
      ok(!!st.banco && st.banco === bancoTxt, `${w}px A: la IA elige el banco (${bancoTxt})`, st);
      ok(log.buscar.length === 1 && /^[0-9a-f]{64}$/.test(log.buscar[0].p_sha256 || '') && /^[0-9a-f]{16}$/.test(log.buscar[0].p_dhash || '') && log.buscar[0].p_numero === '987654321', `${w}px A: busca con huella exacta, número (y guarda la visual como dato)`, log.buscar[0]);
      await completar(page); await sleep(200);
      await page.evaluate(() => document.getElementById('nxBaucheCheck')?.scrollIntoView({ block: 'center' })); await sleep(250); await page.screenshot({ path: OUT + `${w}-A-nuevo.png` });
      await page.evaluate(() => regAbono()); await sleep(1500);
      ok(log.orden.join(',') === 'registrar,cobro,vincular', `${w}px A: registra el comprobante → cobra → vincula (${log.orden.join(',')})`, log.orden);
      ok(log.vincular[0] && log.vincular[0].p_id === COMP_ID && log.vincular[0].p_abono_id === ABONO_ID, `${w}px A: vincula al abono devuelto`, log.vincular[0]);
      ok(log.registrar[0] && log.registrar[0].p_ia && log.registrar[0].p_ia.numero === '987654321' && !log.registrar[0].p_motivo, `${w}px A: guarda lo leído por la IA (para entrenar el lector propio)`, log.registrar[0]);
      ok(log.registrar[0] && Number(log.registrar[0].p_monto) === P, `${w}px A: manda al servidor el monto cobrado (p_monto=${P})`, log.registrar[0] && log.registrar[0].p_monto);
      ok(!errs.length, `${w}px A: sin errores`, errs);
      await ctx.close(); }
    // B. repetido + agente
    { const { ctx, page, errs } = await abrir(browser, w);
      const log = await preparar(page, { buscar: HIT });
      await cobroListo(page, await page.evaluate(() => ST.clientes[1].id), 'agente');
      await adjuntar(page);
      const rojo = await esperarTarjeta(page, 'repetido');
      const st = await page.evaluate(() => ({ txt: document.getElementById('nxBaucheCheck')?.innerText || '', motivo: !!document.getElementById('nxBuMotivo') }));
      ok(rojo && /ya se usó/i.test(st.txt) && /Cliente Anterior/.test(st.txt) && /misma foto/i.test(st.txt), `${w}px B: repetido → tarjeta roja con el pago anterior`, st);
      ok(!st.motivo && /administrador/i.test(st.txt), `${w}px B: un agente no puede aprobar`, st);
      await completar(page); await page.evaluate(() => document.getElementById('nxBaucheCheck')?.scrollIntoView({ block: 'center' })); await sleep(250); await page.screenshot({ path: OUT + `${w}-B-repetido-agente.png` });
      await page.evaluate(() => regAbono()); await sleep(900);
      ok(log.cobro.length === 0 && log.registrar.length === 0, `${w}px B: NO cobra ni registra`, log.orden);
      await ctx.close(); }
    // C. repetido + admin
    { const { ctx, page, errs } = await abrir(browser, w);
      const log = await preparar(page, { buscar: HIT });
      await cobroListo(page, await page.evaluate(() => ST.clientes[1].id), 'admin');
      await adjuntar(page); await esperarTarjeta(page, 'repetido');
      await completar(page);
      await page.evaluate(() => regAbono()); await sleep(600);
      ok(log.cobro.length === 0, `${w}px C: sin aprobar, el admin tampoco cobra`);
      await page.evaluate(() => { document.getElementById('nxBuMotivo').value = 'ab'; document.getElementById('nxBuAprobar').click(); }); await sleep(200);
      ok(await page.evaluate(() => document.getElementById('nxBaucheCheck').classList.contains('repetido')), `${w}px C: motivo muy corto no aprueba`);
      await page.evaluate(() => document.getElementById('nxBaucheCheck')?.scrollIntoView({ block: 'center' })); await sleep(250); await page.screenshot({ path: OUT + `${w}-C-repetido-admin.png` });
      await page.evaluate(() => { document.getElementById('nxBuMotivo').value = 'Mismo depósito paga a dos hermanos'; document.getElementById('nxBuAprobar').click(); }); await sleep(200);
      ok(await page.evaluate(() => document.getElementById('nxBaucheCheck').classList.contains('aprobado')), `${w}px C: con motivo queda «aprobado por administrador»`);
      await page.evaluate(() => document.getElementById('nxBaucheCheck')?.scrollIntoView({ block: 'center' })); await sleep(250); await page.screenshot({ path: OUT + `${w}-C-aprobado.png` });
      await page.evaluate(() => regAbono()); await sleep(1500);
      ok(log.registrar[0] && log.registrar[0].p_motivo === 'Mismo depósito paga a dos hermanos' && log.cobro.length === 1, `${w}px C: manda el motivo al servidor y cobra`, log.registrar[0]);
      await ctx.close(); }
    // D. el servidor lo detecta
    { const { ctx, page } = await abrir(browser, w);
      const log = await preparar(page, { buscar: [], registrarError: 'COMPROBANTE_DUPLICADO' });
      await cobroListo(page, await page.evaluate(() => ST.clientes[1].id), 'admin');
      await adjuntar(page); await esperarTarjeta(page, 'nuevo'); await completar(page);
      await page.evaluate(() => regAbono()); await sleep(1000);
      const st = await page.evaluate(() => ({ cls: document.getElementById('nxBaucheCheck').className, txt: document.getElementById('nxBaucheCheck').innerText }));
      ok(log.cobro.length === 0 && st.cls === 'repetido' && /Cliente Anterior/.test(st.txt), `${w}px D: el servidor lo frena y la tarjeta pasa a roja`, st);
      await ctx.close(); }
    // E. monto distinto + F. sin comprobante
    { const { ctx, page } = await abrir(browser, w);
      const log = await preparar(page, { buscar: [], ia: { es_comprobante: true, banco: null, monto: 3500, moneda: 'DOP', fecha: '2026-10-13', numero_transaccion: '11223344', cuenta_destino: null, titular_destino: null, confianza: 0.9 } });
      await cobroListo(page, await page.evaluate(() => ST.clientes[1].id), 'admin');
      await adjuntar(page); await esperarTarjeta(page, 'nuevo'); await completar(page); await sleep(200);
      const av = await page.evaluate(() => document.querySelector('#nxBaucheCheck .aviso')?.innerText || '');
      ok(/3,500/.test(av) && /estás cobrando/.test(av), `${w}px E: avisa que el comprobante dice otro monto`, av);
      await page.evaluate(() => document.getElementById('nxBaucheCheck')?.scrollIntoView({ block: 'center' })); await sleep(250); await page.screenshot({ path: OUT + `${w}-E-monto.png` });
      await page.evaluate(() => { window.nxQuitarBauche(); }); await sleep(300);
      ok(await page.evaluate(() => !document.getElementById('nxBaucheCheck')), `${w}px F: al quitar el comprobante se quita la tarjeta`);
      await page.evaluate(() => regAbono()); await sleep(1200);
      ok(log.cobro.length === 1 && log.registrar.length === 0, `${w}px F: sin comprobante cobra igual que antes`, log.orden);
      await ctx.close(); }
    // G. depósito compartido
    { const { ctx, page, errs } = await abrir(browser, w);
      const P = await page.evaluate(() => Math.max(1, Math.round(pendTot(ST.clientes[1]))));
      const TOPE = 4500 + P + 2000;
      const log = await preparar(page, { buscar: [{ ...HIT[0], tope: TOPE }], ia: { es_comprobante: true, banco: null, monto: TOPE, moneda: 'DOP', fecha: '2026-10-02', numero_transaccion: '55667788', cuenta_destino: null, titular_destino: null, confianza: 0.95 } });
      await cobroListo(page, await page.evaluate(() => ST.clientes[1].id), 'agente');
      await adjuntar(page); await sleep(300); await completar(page, P);
      const azul = await esperarTarjeta(page, 'compartido');
      const st = await page.evaluate(() => ({ txt: document.getElementById('nxBaucheCheck')?.innerText || '' }));
      ok(azul && /compartido/i.test(st.txt) && /quedan/i.test(st.txt) && /2,000/.test(st.txt), `${w}px G: dentro del monto → «Depósito compartido», dice cuánto queda (RD$2,000)`, st);
      await page.evaluate(() => document.getElementById('nxBaucheCheck')?.scrollIntoView({ block: 'center' })); await sleep(250); await page.screenshot({ path: OUT + `${w}-G-compartido.png` });
      await page.evaluate(m => { const mn = document.getElementById('aMnt'); mn.value = String(m); mn.dispatchEvent(new Event('input', { bubbles: true })); }, P + 2500); await sleep(200);
      ok(await page.evaluate(() => document.getElementById('nxBaucheCheck').classList.contains('repetido') && /lo pasa/.test(document.getElementById('nxBaucheCheck').innerText)), `${w}px G: si el cobro pasa del monto del comprobante → rojo con aviso`);
      await page.evaluate(m => { const mn = document.getElementById('aMnt'); mn.value = String(m); mn.dispatchEvent(new Event('input', { bubbles: true })); nxAboActualizarResumen(); }, P); await sleep(200);
      await page.evaluate(() => regAbono()); await sleep(1500);
      ok(log.orden.join(',') === 'registrar,cobro,vincular' && Number(log.registrar[0].p_monto) === P && !log.registrar[0].p_motivo, `${w}px G: un agente cobra sin aprobación y manda p_monto (${log.orden.join(',')})`, log.registrar[0]);
      ok(!errs.length, `${w}px G: sin errores`, errs);
      await ctx.close(); }
    // H. 59.56 «smart»: otra captura del mismo depósito (sin número leído) → aviso ámbar, NO bloquea
    { const { ctx, page, errs } = await abrir(browser, w);
      const P = await page.evaluate(() => Math.max(1, Math.round(pendTot(ST.clientes[1]))));
      const log = await preparar(page, { buscar: [], parecidos: [{ ...HIT[0], tipo: 'parecido', monto: P }], ia: { es_comprobante: true, banco: 'Banco Popular', monto: P, moneda: 'DOP', fecha: '2026-10-21', numero_transaccion: null, cuenta_destino: '4321', titular_destino: null, hora: '14:32', ordenante: 'Juan Pérez', confianza: 0.6 } });
      await cobroListo(page, await page.evaluate(() => ST.clientes[1].id), 'agente');
      await adjuntar(page);
      const ambar = await esperarTarjeta(page, 'parecido');
      const st = await page.evaluate(() => ({ txt: document.getElementById('nxBaucheCheck')?.innerText || '', ver: (() => { const b = document.querySelector('#nxBaucheCheck .ver'); if (!b) return null; const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() }));
      ok(ambar && /Posible repetido/i.test(st.txt) && /Cliente Anterior/.test(st.txt), `${w}px H: mismo monto, fecha y banco → aviso ámbar con el pago anterior`, st);
      ok(log.parecidos && Number(log.parecidos.p_monto) === P && log.parecidos.p_fecha === '2026-10-21' && log.parecidos.p_banco === 'Banco Popular' && log.parecidos.p_cuenta === '4321' && log.parecidos.p_hora === '14:32' && log.parecidos.p_ordenante === 'Juan Pérez', `${w}px H: pregunta por monto, fecha, banco, cuenta, hora y quien envía`, log.parecidos);
      ok(st.ver && st.ver[0] >= 44 && st.ver[1] >= 44, `${w}px H: botón «Ver» ≥ 44×44 (${st.ver})`, st.ver);
      await completar(page, P); await page.evaluate(() => document.getElementById('nxBaucheCheck')?.scrollIntoView({ block: 'center' })); await sleep(250); await page.screenshot({ path: OUT + `${w}-H-parecido.png` });
      await page.evaluate(() => regAbono()); await sleep(1500);
      ok(log.registrar[0] && log.registrar[0].p_ia && log.registrar[0].p_ia.hora === '14:32' && log.registrar[0].p_ia.ordenante === 'Juan Pérez', `${w}px H: guarda hora y quien envía (para comparar los próximos)`, log.registrar[0] && log.registrar[0].p_ia);
      ok(log.orden.join(',') === 'registrar,cobro,vincular', `${w}px H: el aviso no bloquea: un agente cobra (${log.orden.join(',')})`, log.orden);
      ok(!errs.length, `${w}px H: sin errores`, errs);
      await ctx.close(); }
    // I. 59.56: sin lectura de IA, la tarjeta dice por qué (y protege igual con la foto exacta)
    { const { ctx, page } = await abrir(browser, w);
      const log = await preparar(page, { buscar: [], iaErr: 'credito' });
      await cobroListo(page, await page.evaluate(() => ST.clientes[1].id), 'admin');
      await adjuntar(page); await esperarTarjeta(page, 'nuevo');
      const txt = await page.evaluate(() => document.getElementById('nxBaucheCheck')?.innerText || '');
      ok(/solo la foto exacta/i.test(txt) && /crédito/i.test(txt), `${w}px I: avisa «se revisó solo la foto exacta: la IA no tiene crédito»`, txt);
      ok(!log.parecidos, `${w}px I: sin lectura no busca parecidos`);
      await ctx.close(); }
  }
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
