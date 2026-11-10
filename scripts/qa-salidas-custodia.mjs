// QA 59.83 — «Salidas» de la custodia del administrador (capa parches-salidas-custodia.js).
// App real contra scripts/qa-crm-mock-server.js, a 390×844 (iPhone) y 1280×800. Nada toca producción: se interceptan
// la tabla seguros_salidas_custodia y las RPC seguros_registrar_salida_custodia, seguros_anular_salida_custodia,
// seguros_salidas_ciclo y seguros_resumen_ciclo_admin.
//  · El botón «Salida» y la lista «Salidas» salen solo para el administrador.
//  · La ventana abre con el cursor en el monto; medidas: todo ≥44, campos 48 px con letra 16, botón principal 54.
//  · El monto se arma con comas y el botón principal lo muestra.
//  · «Depósito al banco» fija Efectivo y pide el banco destino.
//  · Aviso antes del error si el monto supera la custodia que está en pantalla.
//  · Registrar llama a la RPC una sola vez aunque se toque dos veces, con los parámetros correctos y su llave.
//  · El error del servidor se ve tal cual; al reintentar se usa la misma llave.
//  · Tras registrar: la custodia se vuelve a pedir al servidor y la lista se recarga.
//  · «Ajuste inicial» exige nota. Anular pide motivo y llama a la RPC; la anulada queda tachada.
//  · Reporte del ciclo: columna «Salidas» (sin contar el depósito al banco).
//  · Sin desplazamiento horizontal ni errores de JavaScript. Con el apagador puesto no aparece nada.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-salidas-custodia.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-salidas-custodia')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 700) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const E = uuid(101), R = uuid(102);
const fila = (id, nom, cargo, o) => ({ agente_id: id, agente: nom, cargo, periodo: '', ciclo_inicio: '2026-10-20T04:00:00+00:00', ciclo_fin: '2026-11-20T04:00:00+00:00', corte: '2026-11-09T15:00:00+00:00', cerrado: false, saldo_inicial: 0, cobrado_validado: 0, transferido_confirmado: 0, recibido_confirmado: 0, entregado_admin_directo: 0, directo_recibido: 0, reversas_cobros_previos: 0, reintegros_entregas_previas: 0, directos_previos_anulados: 0, saldo_final: 0, diferencia_reconciliacion: 0, historico_aproximado: false, total_negocio_cobrado_ciclo: 0, ...o });
const SALIDA_VIEJA = { id: uuid(7001), agente_id: E, monto: 12500, motivo: 'gasto', metodo: 'Efectivo', banco: null, referencia: 'F-221', nota: 'Papelería', fecha_real: null, created_at: '2026-11-05T15:00:00Z', created_by: 'Esterlin Espinal', anulado: false, anulado_at: null, anulado_por: null, anulado_motivo: null };

async function abrir(browser, width, o = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  const st = { registrar: [], anular: [], resumen: 0, listas: 0, ciclo: [], salidas: o.vacia ? [] : [{ ...SALIDA_VIEJA }], error: null, custodia: 40000, n: 0 };
  const J = (r, d, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(d) });
  await page.route(/\/rest\/v1\/rpc\/seguros_resumen_ciclo_admin/, async r => { const b = JSON.parse(r.request().postData() || '{}'); st.resumen++;
    return J(r, [fila(E, 'ESTERLIN', 'ADMIN', { periodo: b.p_periodo, cobrado_validado: 28000, directo_recibido: 12000, saldo_final: st.custodia, total_negocio_cobrado_ciclo: 43000 }), fila(R, 'ROBINSON', 'VENDEDOR', { periodo: b.p_periodo, cobrado_validado: 15000, saldo_final: 15000, total_negocio_cobrado_ciclo: 43000 })]); });
  await page.route(/\/rest\/v1\/rpc\/seguros_cierre_ciclo_admin/, r => J(r, []));
  await page.route(/\/rest\/v1\/(abonos\?select=id,cliente_id,monto,metodo,banco,referencia,fecha,created_at,validado_at|entregas_admin\?select=|transferencias_agentes\?select=)/, r => J(r, []));
  await page.route(/\/rest\/v1\/seguros_salidas_custodia\?/, r => { st.listas++; return J(r, st.salidas.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))); });
  await page.route(/\/rest\/v1\/rpc\/seguros_registrar_salida_custodia/, async r => { const b = JSON.parse(r.request().postData() || '{}'); st.registrar.push(b); await sleep(350);
    if (st.error) return J(r, { code: 'P0001', details: null, hint: null, message: st.error }, 400);
    const ya = st.salidas.find(s => s.idem === b.p_idempotency_key); if (ya) return J(r, { ok: true, id: ya.id, reintento: true });
    st.n++; const s = { id: uuid(7100 + st.n), agente_id: E, monto: b.p_monto, motivo: b.p_motivo, metodo: b.p_metodo, banco: b.p_banco, referencia: b.p_referencia, nota: b.p_nota, fecha_real: b.p_fecha_real, created_at: new Date(Date.now() + st.n * 1000).toISOString(), created_by: 'Esterlin Espinal', anulado: false, anulado_at: null, anulado_por: null, anulado_motivo: null, idem: b.p_idempotency_key };
    st.salidas.push(s); if (b.p_motivo !== 'deposito_banco') st.custodia -= b.p_monto;
    return J(r, { ok: true, id: s.id, reintento: false, custodia: st.custodia }); });
  await page.route(/\/rest\/v1\/rpc\/seguros_anular_salida_custodia/, async r => { const b = JSON.parse(r.request().postData() || '{}'); st.anular.push(b); await sleep(200);
    const s = st.salidas.find(x => x.id === b.p_id); if (!s) return J(r, { code: 'P0001', message: 'La salida no existe' }, 400);
    s.anulado = true; s.anulado_at = new Date().toISOString(); s.anulado_por = 'Esterlin Espinal'; s.anulado_motivo = b.p_motivo; if (s.motivo !== 'deposito_banco') st.custodia += Number(s.monto);
    return J(r, { ok: true, id: s.id, reintento: false, custodia: st.custodia }); });
  await page.route(/\/rest\/v1\/rpc\/seguros_salidas_ciclo/, r => { const b = JSON.parse(r.request().postData() || '{}'); st.ciclo.push(b.p_periodo);
    return J(r, [{ agente_id: E, agente: 'ESTERLIN', motivo: 'aseguradora', movimientos: 1, total: 18000 }, { agente_id: E, agente: 'ESTERLIN', motivo: 'gasto', movimientos: 2, total: 2500 }, { agente_id: E, agente: 'ESTERLIN', motivo: 'deposito_banco', movimientos: 1, total: 9000 }]); });
  await page.addInitScript(([rol, off]) => {
    if (!sessionStorage.getItem('__qaIni')) { sessionStorage.setItem('__qaIni', '1'); localStorage.removeItem('nx_tema'); localStorage.removeItem('nx_tgo_off'); if (off) localStorage.setItem('nx_salidas_custodia_off', '1'); else localStorage.removeItem('nx_salidas_custodia_off'); }
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol, cargo: rol === 'admin' ? 'ADMIN' : 'AGENTE', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, [o.rol || 'admin', !!o.off]);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0 && typeof rCustodia === 'function', null, { timeout: 25000 });
  await sleep(2500);
  await page.evaluate(() => nav('custodia', document.getElementById('niCustodia')));
  await sleep(1500);
  return { ctx, page, errs, st };
}
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(c.fontSize), tt: c.textTransform, dis: !!e.disabled, vis: r.width > 0 && r.height > 0, t: (e.value !== undefined && e.tagName !== 'BUTTON' ? e.value : e.textContent).trim().replace(/\s+/g, ' ') }; }, sel);
const sinScrollH = page => page.evaluate(() => { const d = document.documentElement; const c = document.querySelector('.nxSalCard'); return d.scrollWidth <= d.clientWidth + 1 && (!c || c.scrollWidth <= c.clientWidth + 1); });
const pequenos = page => page.evaluate(() => [...document.querySelectorAll('.nxSalOv button, .nxSalOv input, .nxSalOv select, .nxSalOv summary')].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return { c: e.className || e.tagName, w: Math.round(r.width), h: Math.round(r.height) }; }).filter(x => x.w < 44 || x.h < 44));

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px · administrador`);
    const { ctx, page, errs, st } = await abrir(browser, w);
    // ── Pantalla
    const b = await caja(page, '#v-custodia .cuHead .nxSalBtn');
    if (w < 700)     ok(await page.evaluate(() => { const e = document.querySelector('#v-custodia .cuHead .cuSel'); if (!e) return false; const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(e); c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const t = e.options[e.selectedIndex].text; return c.measureText(t).width + 44 <= e.getBoundingClientRect().width; }), `${w}px el selector del ciclo se lee completo`);
    ok(b && b.vis && b.h >= 44 && b.w >= 44 && b.t === 'Salida', `${w}px botón «Salida» en la cabecera de Custodia (≥44×44)`, b);
    ok(await page.evaluate(() => document.querySelectorAll('.nxSalBtn').length) === 1, `${w}px hay un solo botón «Salida»`);
    const l0 = await page.textContent('#nxSalBox');
    ok(/Salidas/.test(l0) && /Gasto del negocio/.test(l0) && /RD\$ 12,500\.00/.test(l0) && /Esterlin Espinal/.test(l0) && /5 nov/.test(l0), `${w}px lista «Salidas»: fecha, motivo, de dónde, monto y quién`, l0.replace(/\s+/g, ' ').slice(0, 200));
    const an = await caja(page, '#nxSalBox .nxSalAnu');
    ok(an && an.h >= 44 && an.w >= 44, `${w}px «Anular» ≥44×44`, an);
    ok(await sinScrollH(page), `${w}px pantalla sin desplazamiento horizontal`);
    await page.evaluate(() => document.querySelector('#nxSalBox').scrollIntoView({ block: 'center' })); await sleep(300);
    await page.screenshot({ path: OUT + `${w}-lista.png` });
    // ── Ventana
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('#v-custodia .nxSalBtn'); await sleep(450);
    ok(!!(await page.$('.nxSalOv')) && /Registrar salida/.test(await page.textContent('.nxSalHead')), `${w}px la ventana «Registrar salida» abre`);
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'nxSalMonto'), `${w}px el cursor queda en el monto`);
    const mo = await caja(page, '#nxSalMonto'), si = await caja(page, '#nxSalSi'), x = await caja(page, '.nxSalX'), op = await caja(page, '.nxSalOp');
    const nt = await caja(page, '#nxSalNota');
    ok(mo.h === 48 && mo.fs === 16 && nt.h === 48 && nt.fs === 16, `${w}px campos de 48 px con letra de 16 px`, { mo, nt });
    ok(si.h === 54 && si.t === 'Registrar salida', `${w}px botón principal de 54 px`, si);
    ok(x.w >= 44 && x.h >= 44 && op.h >= 44, `${w}px ✕ y opciones ≥44`, { x, op });
    const peq = await pequenos(page);
    ok(peq.length === 0, `${w}px todo lo que se toca en la ventana mide ≥44×44`, peq);
    ok(await page.evaluate(() => [...document.querySelectorAll('.nxSalOv .nxSalLbl, .nxSalOv button, .nxSalOv summary')].every(e => getComputedStyle(e).textTransform === 'none')), `${w}px etiquetas y botones sin MAYÚSCULAS`);
    ok(await page.evaluate(() => [...document.querySelectorAll('.nxSalOp[data-mot]')].map(e => e.textContent.trim()).join('|')) === 'Pago a la aseguradora|Gasto del negocio|Retiro del dueño|Depósito al banco' && /Ajuste inicial/.test(await page.textContent('.nxSalMas')), `${w}px 4 motivos + «Ajuste inicial» aparte`);
    // Monto con comas y botón con el monto
    await page.type('#nxSalMonto', '18000.5'); await sleep(120);
    ok((await caja(page, '#nxSalMonto')).t === '18,000.5' && (await caja(page, '#nxSalSi')).t === 'Registrar salida RD$ 18,000.50', `${w}px el monto se arma con comas y el botón lo muestra`, [(await caja(page, '#nxSalMonto')).t, (await caja(page, '#nxSalSi')).t]);
    // Aviso antes del error (custodia en pantalla: 40,000)
    await page.fill('#nxSalMonto', ''); await page.type('#nxSalMonto', '50000'); await sleep(120);
    ok(await page.evaluate(() => { const a = document.getElementById('nxSalAviso'); return !a.hidden && /RD\$ 40,000\.00/.test(a.textContent); }), `${w}px avisa antes del error si supera la custodia en pantalla`, await page.textContent('#nxSalAviso'));
    await page.fill('#nxSalMonto', ''); await page.type('#nxSalMonto', '18000.5'); await sleep(120);
    ok(await page.evaluate(() => document.getElementById('nxSalAviso').hidden), `${w}px el aviso se quita cuando el monto cabe`);
    // Depósito al banco fija Efectivo
    await page.click('.nxSalOp[data-met="Banco"]'); await sleep(100);
    ok(await page.evaluate(() => !document.getElementById('nxSalBancoCampo').hidden && document.getElementById('nxSalLBanco').textContent === 'Banco'), `${w}px con «Banco» pide el banco`);
    await page.click('.nxSalOp[data-mot="deposito_banco"]'); await sleep(150);
    const dep = await page.evaluate(() => ({ seg: document.getElementById('nxSalMetSeg').hidden, fijo: !document.getElementById('nxSalMetFijo').hidden && document.getElementById('nxSalMetFijo').textContent.trim(), lbl: document.getElementById('nxSalLBanco').textContent, campo: !document.getElementById('nxSalBancoCampo').hidden, btn: document.getElementById('nxSalSi').textContent, bancoVisible: !!document.querySelector('.nxSalOp[data-met="Banco"]').offsetParent }));
    ok(dep.seg && dep.fijo === 'Efectivo' && !dep.bancoVisible && dep.campo && dep.lbl === 'Banco destino', `${w}px «Depósito al banco» fija Efectivo y pide el banco destino`, dep);
    await page.screenshot({ path: OUT + `${w}-ventana-deposito.png` });
    await page.click('#nxSalSi'); await sleep(200);
    ok(st.registrar.length === 0 && await page.evaluate(() => !document.getElementById('nxSalBancoErr').hidden), `${w}px depósito sin banco destino: no envía y lo pide`);
    const bancos = await page.evaluate(() => [...document.getElementById('nxSalBanco').options].map(o => o.value));
    ok(bancos.length >= 3 && bancos.includes('__otro'), `${w}px el banco sale del catálogo de bancos del sistema`, bancos.slice(0, 8));
    await page.selectOption('#nxSalBanco', bancos[1]);
    await page.click('#nxSalSi'); await sleep(900);
    const d0 = st.registrar[0] || {};
    ok(st.registrar.length === 1 && d0.p_motivo === 'deposito_banco' && d0.p_metodo === 'Efectivo' && d0.p_banco === bancos[1] && d0.p_monto === 18000.5, `${w}px depósito: RPC con motivo deposito_banco, Efectivo y banco destino`, d0);
    ok(!(await page.$('.nxSalOv')), `${w}px al registrar se cierra la ventana`);
    // ── Salida normal, con todos los datos y doble toque
    const resumenAntes = st.resumen, listasAntes = st.listas;
    await page.click('#v-custodia .nxSalBtn'); await sleep(400);
    await page.type('#nxSalMonto', '18000');
    await page.click('.nxSalOp[data-met="Banco"]'); await page.selectOption('#nxSalBanco', bancos[1]);
    await page.fill('#nxSalNota', 'Prima de noviembre');
    await page.click('.nxSalDet summary'); await sleep(150);
    const rf = await caja(page, '#nxSalRef'), fe = await caja(page, '#nxSalFecha');
    ok(rf.h === 48 && rf.fs === 16 && fe.h === 48 && fe.fs === 16, `${w}px referencia y fecha: 48 px con letra de 16 px`, { rf, fe });
    await page.fill('#nxSalRef', 'TRF-9981'); await page.fill('#nxSalFecha', '2026-11-08');
    ok(await sinScrollH(page), `${w}px ventana sin desplazamiento horizontal`);
    ok((await pequenos(page)).length === 0, `${w}px con todo abierto, todo sigue ≥44×44`, await pequenos(page));
    await page.screenshot({ path: OUT + `${w}-ventana.png` });
    st.error = 'Solo hay RD$ 1,943.00 en banco';
    await page.evaluate(() => { const b = document.getElementById('nxSalSi'); b.click(); b.click(); document.querySelector('.nxSalCard').requestSubmit(); });
    await sleep(120);
    ok((await caja(page, '#nxSalSi')).dis && /Guardando/.test((await caja(page, '#nxSalSi')).t), `${w}px el botón queda deshabilitado mientras guarda`);
    await sleep(800);
    ok(st.registrar.length === 2, `${w}px tres toques seguidos = una sola llamada a la RPC`, st.registrar.length);
    const errT = await page.evaluate(() => { const e = document.getElementById('nxSalErr'); return e.hidden ? null : e.textContent.trim(); });
    ok(errT === 'Solo hay RD$ 1,943.00 en banco' && !!(await page.$('.nxSalOv')) && !(await caja(page, '#nxSalSi')).dis, `${w}px el error del servidor se ve tal cual y la ventana sigue abierta`, errT);
    await page.screenshot({ path: OUT + `${w}-ventana-error.png` });
    st.error = null;
    await page.click('#nxSalSi'); await sleep(1600);
    const p1 = st.registrar[1] || {}, p2 = st.registrar[2] || {};
    ok(st.registrar.length === 3 && p2.p_monto === 18000 && p2.p_motivo === 'aseguradora' && p2.p_metodo === 'Banco' && p2.p_banco === bancos[1] && p2.p_referencia === 'TRF-9981' && p2.p_nota === 'Prima de noviembre' && p2.p_fecha_real === '2026-11-08' && p2.p_comprobante_url === null, `${w}px RPC registrar con los parámetros correctos`, p2);
    ok(p1.p_idempotency_key && p1.p_idempotency_key === p2.p_idempotency_key && p1.p_idempotency_key !== d0.p_idempotency_key, `${w}px llave contra doble envío: la misma al reintentar y otra en cada apertura`, [d0.p_idempotency_key, p1.p_idempotency_key, p2.p_idempotency_key]);
    ok(Object.keys(p2).sort().join() === 'p_banco,p_comprobante_url,p_fecha_real,p_idempotency_key,p_metodo,p_monto,p_motivo,p_nota,p_referencia', `${w}px la RPC recibe exactamente sus 9 parámetros`, Object.keys(p2));
    ok(st.resumen > resumenAntes && st.listas > listasAntes, `${w}px tras registrar se vuelve a pedir la custodia al servidor y la lista`, { resumen: [resumenAntes, st.resumen], listas: [listasAntes, st.listas] });
    const cust = await page.evaluate(id => { const c = document.querySelector(`#v-custodia .cuCard[data-ag="${id}"] .cuEnPoder`); return c && Number(c.dataset.v); }, E);
    ok(cust === 22000, `${w}px la custodia en pantalla es la del servidor (40,000 − 18,000 = 22,000; el depósito no la baja)`, cust);
    const l1 = (await page.textContent('#nxSalBox')).replace(/\s+/g, ' ');
    ok(/Pago a la aseguradora/.test(l1) && /RD\$ 18,000\.00/.test(l1) && /Depósito al banco/.test(l1) && /Efectivo → /.test(l1) && /ref\. TRF-9981/.test(l1), `${w}px la lista muestra las dos nuevas`, l1.slice(0, 300));
    // ── Ajuste inicial exige nota
    await page.click('#v-custodia .nxSalBtn'); await sleep(400);
    await page.type('#nxSalMonto', '1000'); await page.click('.nxSalMas'); await sleep(100);
    const nReg = st.registrar.length;
    await page.click('#nxSalSi'); await sleep(250);
    ok(st.registrar.length === nReg && await page.evaluate(() => !document.getElementById('nxSalNotaErr').hidden && document.getElementById('nxSalLNota').textContent === 'Nota'), `${w}px «Ajuste inicial» sin nota: no envía y la pide`);
    await page.keyboard.press('Escape'); await sleep(200);
    ok(!(await page.$('.nxSalOv')), `${w}px Esc cierra la ventana`);
    // ── Anular
    const idA = await page.evaluate(() => document.querySelector('#nxSalBox .nxSalFila:not(.anu) .nxSalAnu').dataset.id);
    await page.evaluate(() => document.querySelector('#nxSalBox .nxSalFila:not(.anu) .nxSalAnu').scrollIntoView({ block: 'center' })); await sleep(200);
    await page.click('#nxSalBox .nxSalFila:not(.anu) .nxSalAnu'); await sleep(400);
    ok(!!(await page.$('.nxSalOv')) && /Anular salida/.test(await page.textContent('.nxSalHead')), `${w}px «Anular» abre la ventana que pide el motivo`);
    const am = await caja(page, '#nxSalAnuMot'), as = await caja(page, '#nxSalAnuSi');
    ok(am.h === 48 && am.fs === 16 && as.h === 54 && (await pequenos(page)).length === 0, `${w}px anular: campo 48/16, botón 54, todo ≥44`, { am, as });
    await page.click('#nxSalAnuSi'); await sleep(200);
    ok(st.anular.length === 0 && await page.evaluate(() => !document.getElementById('nxSalAnuMotErr').hidden), `${w}px anular sin motivo: no llama a la RPC`);
    await page.fill('#nxSalAnuMot', 'Se registró dos veces');
    await page.screenshot({ path: OUT + `${w}-anular.png` });
    const r2 = st.resumen;
    await page.evaluate(() => { const b = document.getElementById('nxSalAnuSi'); b.click(); b.click(); }); await sleep(1500);
    ok(st.anular.length === 1 && st.anular[0].p_id === idA && st.anular[0].p_motivo === 'Se registró dos veces' && Object.keys(st.anular[0]).sort().join() === 'p_id,p_motivo', `${w}px anular llama a la RPC una vez con p_id y p_motivo`, st.anular);
    ok(st.resumen > r2, `${w}px tras anular se vuelve a pedir la custodia`);
    const tach = await page.evaluate(id => { const f = document.querySelector(`#nxSalBox .nxSalFila[data-id="${id}"]`); return f && { anu: f.classList.contains('anu'), td: getComputedStyle(f.querySelector('.nxSalM')).textDecorationLine, btn: !!f.querySelector('.nxSalAnu'), t: f.textContent.replace(/\s+/g, ' ') }; }, idA);
    ok(tach && tach.anu && /line-through/.test(tach.td) && !tach.btn && /Anulada: Se registró dos veces/.test(tach.t), `${w}px la anulada queda tachada, con su motivo y sin «Anular»`, tach);
    ok(await sinScrollH(page), `${w}px sin desplazamiento horizontal al final`);
    await page.evaluate(() => document.querySelector('#nxSalBox').scrollIntoView({ block: 'center' })); await sleep(300);
    await page.screenshot({ path: OUT + `${w}-lista-final.png` });
    // ── Reporte del ciclo
    await page.evaluate(() => nav('rep-agente', null)); await sleep(2500);
    const rep = await page.evaluate(() => { const t = document.querySelector('#nxCiclo20 .nxC20Table'); if (!t) return null; const th = [...t.querySelectorAll('th')].map(x => x.textContent.trim()); const i = th.indexOf('Salidas'); return { th, i, vals: [...t.querySelectorAll('tbody tr')].map(tr => tr.children[0].textContent.trim().slice(0, 8) + '=' + (tr.children[i] ? tr.children[i].textContent.trim() : '')) }; });
    ok(rep && rep.i === 5 && rep.vals.some(v => /^ESTERLIN=RD\$ 20[.,]500$/i.test(v)) && rep.vals.some(v => /^ROBINSON=RD\$ 0$/i.test(v)) && st.ciclo.length >= 1, `${w}px reporte del ciclo: columna «Salidas» por agente (20,500; el depósito de 9,000 no cuenta)`, rep);
    ok(await page.evaluate(() => { const d = document.documentElement; return d.scrollWidth <= d.clientWidth + 1; }), `${w}px reporte del ciclo sin desplazamiento horizontal de la página`);
    await page.evaluate(() => { const t = document.querySelector('#nxCiclo20'); if (t) t.scrollIntoView({ block: 'start' }); }); await sleep(300);
    await page.screenshot({ path: OUT + `${w}-reporte-ciclo.png` });
    ok(errs.length === 0, `${w}px sin errores de JavaScript`, errs);
    await ctx.close();

    console.log(`== ${w}px · lista vacía`);
    { const { ctx, page, errs } = await abrir(browser, w, { vacia: true });
      ok(/Sin salidas\. Registre la primera con «Salida»\./.test(await page.textContent('#nxSalBox')), `${w}px lista vacía dice qué hacer`, await page.textContent('#nxSalBox'));
      ok(errs.length === 0, `${w}px (vacía) sin errores de JavaScript`, errs); await ctx.close(); }

    console.log(`== ${w}px · agente (no administrador)`);
    { const { ctx, page, errs, st } = await abrir(browser, w, { rol: 'agente' });
      await page.evaluate(() => { try { rCustodia(); } catch (e) {} try { window.nxSalidaCustodia && window.nxSalidaCustodia(); } catch (e) {} }); await sleep(600);
      ok(await page.evaluate(() => !document.querySelector('.nxSalBtn') && !document.querySelector('#nxSalBox') && !document.querySelector('.nxSalOv')), `${w}px un agente no ve el botón, la lista ni la ventana`);
      ok(st.listas === 0 && st.registrar.length === 0, `${w}px un agente no consulta las salidas`, st.listas);
      ok(errs.length === 0, `${w}px (agente) sin errores de JavaScript`, errs); await ctx.close(); }

    console.log(`== ${w}px · apagador nx_salidas_custodia_off`);
    { const { ctx, page, errs, st } = await abrir(browser, w, { off: true });
      ok(await page.evaluate(() => !document.querySelector('.nxSalBtn') && !document.querySelector('#nxSalBox') && !document.getElementById('nxSalCusCss') && typeof window.nxSalidaCustodia === 'undefined'), `${w}px con el apagador no aparece nada (ni botón, ni lista, ni estilos)`);
      ok(!!(await page.$('#v-custodia .cuHead')) && !!(await page.$('#v-custodia .cuCard')), `${w}px con el apagador la pantalla de Custodia sigue igual`);
      await page.evaluate(() => nav('rep-agente', null)); await sleep(2500);
      const th = await page.evaluate(() => [...document.querySelectorAll('#nxCiclo20 .nxC20Table th')].map(x => x.textContent.trim()));
      ok(th.length === 7 && !th.includes('Salidas') && st.ciclo.length === 0 && st.listas === 0, `${w}px con el apagador el reporte del ciclo queda como antes (7 columnas, sin consultar salidas)`, th);
      ok(errs.length === 0, `${w}px (apagado) sin errores de JavaScript`, errs); await ctx.close(); }
  }
  await browser.close();
  console.log(`\nRESULTADO: ${pass} aprobadas, ${fail} fallidas`);
  process.exit(fail ? 1 : 0);
})();
