// QA de «Dinero en poder de cada uno» (vista #v-custodia, Contabilidad) — app real contra scripts/qa-crm-mock-server.js,
// tema Glass oscuro, 390×844 (iPhone) y 1280×800. Intercepta la RPC rpc/seguros_resumen_ciclo_admin y las lecturas REST
// (abonos, entregas_admin, transferencias_agentes) con un caso realista:
//  · Robinson cobra 29,500: efectivo 10,000 · transferencia 12,000 a la CUENTA DE ESTERLIN · depósito 3,000 a SU cuenta ·
//    depósito 4,500 hecho el 15-sep y validado el 27-sep cuya entrega a la cuenta de Esterlin quedó en el ciclo anterior
//    (desfase de fechas, caso real de producción). Entrega 2,000 en mano. Transfiere 5,000 a María (aceptada) y 1,000
//    a Esterlin (pendiente: no cuenta). Trae 1,000 de antes (histórico aproximado).
//  · Esterlin (admin) cobra 28,000 (efectivo 8,000 + transferencia 20,000 a su cuenta) y recibe 12,000 en su cuenta.
//  · María no cobra; recibe 5,000 por transferencia.
//  Ruido que debe quedar fuera: efectivo del 19-sep (ciclo anterior), entrega anulada, transferencia rechazada.
// Comprueba: en su poder por agente = servidor; total real cobrado = Σ cobrado (transferencias y depósitos no suman);
// Σ «de este ciclo» + entregado en mano − ajustes = total cobrado; separación efectivo/banco; línea «debe entregar»;
// avisos de histórico aproximado y desfase; detalle de movimientos agrupado; selector de ciclo; sin scroll horizontal.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-custodia.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-custodia')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 700) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const E = uuid(101), R = uuid(102), M = uuid(103), CLI = i => uuid(200 + i);
const I = '2026-09-20T04:00:00+00:00', C = '2026-10-01T15:00:00+00:00', FIN = '2026-10-20T04:00:00+00:00';

// ── Fixtures ──
const ab = (n, ag, monto, metodo, fecha, extra = {}) => ({ id: uuid(9100 + n), cliente_id: CLI(n % 8), monto, metodo, banco: metodo === 'Efectivo' ? null : 'Popular', referencia: metodo === 'Efectivo' ? 'Efectivo' : 'REF' + n, fecha, created_at: fecha, validado_at: metodo === 'Efectivo' ? null : fecha, validacion_estado: metodo === 'Efectivo' ? null : 'validado', estado: 'Pagado', reversado_at: null, agente_cobro: ag, ...extra });
const ABONOS = [
  ab(1, R, 10000, 'Efectivo', '2026-09-22T15:00:00Z'),
  ab(2, R, 12000, 'Transferencia', '2026-09-23T15:00:00Z'),
  ab(3, R, 3000, 'Depósito', '2026-09-24T15:00:00Z'),
  ab(4, R, 4500, 'Depósito', '2026-09-15T17:20:00Z', { validado_at: '2026-09-27T00:44:00Z' }),
  ab(5, E, 8000, 'Efectivo', '2026-09-25T15:00:00Z'),
  ab(6, E, 20000, 'Transferencia', '2026-09-26T15:00:00Z'),
  ab(7, R, 7777, 'Efectivo', '2026-09-19T15:00:00Z'), // ciclo anterior: fuera
  ab(8, R, 999, 'Transferencia', '2026-09-28T15:00:00Z', { validacion_estado: 'pendiente', validado_at: null }), // sin validar: fuera
];
const ent = (n, dueno, cobro, monto, directo, fecha, extra = {}) => ({ id: uuid(9200 + n), agente_id: dueno, cobrado_por: cobro, monto, metodo: directo ? 'Transferencia' : 'Efectivo', banco: directo ? 'Popular' : null, referencia: null, nota: directo ? null : 'Entrega semanal', fecha, created_at: fecha, es_directo: directo, cliente_id: extra.cliente_id || null, abono_id: extra.abono_id || null, anulado: false, anulado_at: null, ...extra });
const ENTREGAS = [
  ent(1, E, R, 12000, true, '2026-09-23T15:00:00Z', { abono_id: uuid(9102), cliente_id: CLI(2) }),
  ent(2, R, R, 3000, true, '2026-09-24T15:00:00Z', { abono_id: uuid(9103), cliente_id: CLI(3) }),
  ent(3, E, E, 20000, true, '2026-09-26T15:00:00Z', { abono_id: uuid(9106), cliente_id: CLI(6) }),
  ent(4, R, null, 2000, false, '2026-09-29T15:00:00Z'),
  ent(5, R, null, 6666, false, '2026-09-29T16:00:00Z', { anulado: true, anulado_at: '2026-09-30T10:00:00Z' }), // anulada: fuera
];
const ENT_FUERA = [ent(6, E, R, 4500, true, '2026-09-15T17:20:00Z', { abono_id: uuid(9104), cliente_id: CLI(4) })]; // ciclo anterior
const TRANSF = [
  { id: uuid(9301), desde_agente: R, hacia_agente: M, monto: 5000, metodo: 'Efectivo', banco: null, referencia: null, nota: null, fecha: '2026-09-27T15:00:00Z', created_at: '2026-09-27T15:00:00Z', aceptado_en: '2026-09-27T16:00:00Z', estado: 'aceptada' },
  { id: uuid(9302), desde_agente: R, hacia_agente: E, monto: 1000, metodo: 'Efectivo', banco: null, referencia: null, nota: null, fecha: '2026-09-30T15:00:00Z', created_at: '2026-09-30T15:00:00Z', aceptado_en: null, estado: 'pendiente' },
];
const fila = (id, nom, cargo, o) => ({ agente_id: id, agente: nom, cargo, periodo: '2026-09', ciclo_inicio: I, ciclo_fin: FIN, corte: C, cerrado: false, saldo_inicial: 0, cobrado_validado: 0, transferido_confirmado: 0, recibido_confirmado: 0, entregado_admin_directo: 0, directo_recibido: 0, reversas_cobros_previos: 0, reintegros_entregas_previas: 0, directos_previos_anulados: 0, saldo_final: 0, diferencia_reconciliacion: 0, historico_aproximado: false, total_negocio_cobrado_ciclo: 57500, ...o });
// Lo que devuelve el servidor (seguros_resumen_ciclo_agente_core): el depósito de 4,500 cuenta como cobro, su entrega no.
const RPC = [
  fila(E, 'ESTERLIN', 'ADMIN', { cobrado_validado: 28000, directo_recibido: 12000, saldo_final: 40000 }),
  fila(M, 'MARIA', 'AGENTE', { recibido_confirmado: 5000, saldo_final: 5000 }),
  fila(R, 'ROBINSON', 'VENDEDOR', { saldo_inicial: 1000, cobrado_validado: 29500, transferido_confirmado: 5000, entregado_admin_directo: 14000, saldo_final: 11500, historico_aproximado: true }),
];
const ESPERADO = { [R]: 11500, [E]: 40000, [M]: 5000 };

async function abrir(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__qaIni')) { sessionStorage.setItem('__qaIni', '1'); localStorage.removeItem('nx_tema'); localStorage.removeItem('nx_tgo_off'); }
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  });
  const llamadas = [];
  const J = (r, d) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) });
  await page.route(/\/rest\/v1\/rpc\/seguros_resumen_ciclo_admin/, async r => { const b = JSON.parse(r.request().postData() || '{}'); llamadas.push(b.p_periodo); return J(r, b.p_periodo === '2026-09' ? RPC : RPC.map(x => ({ ...x, periodo: b.p_periodo }))); });
  await page.route(/\/rest\/v1\/abonos\?select=id,cliente_id,monto,metodo,banco,referencia,fecha,created_at,validado_at/, r => J(r, ABONOS));
  await page.route(/\/rest\/v1\/entregas_admin\?select=/, r => { const u = decodeURIComponent(r.request().url()); const m = /abono_id=in\.\(([^)]*)\)/.exec(u); if (m) { const ids = m[1].split(','); return J(r, ENT_FUERA.concat(ENTREGAS).filter(e => ids.includes(e.abono_id))); } return J(r, ENTREGAS); });
  await page.route(/\/rest\/v1\/transferencias_agentes\?select=/, r => J(r, TRANSF.concat([{ ...TRANSF[0], id: uuid(9303), monto: 8888, estado: 'rechazada' }])));
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(2000);
  return { ctx, page, errs, llamadas };
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px`);
    const { ctx, page, errs, llamadas } = await abrir(browser, w);
    // ── menú: Contabilidad › «Dinero en poder», justo después de «Reporte agente» ──
    const menu = await page.evaluate(() => { const n = document.getElementById('niCustodia'); const p = n && n.previousElementSibling; return { existe: !!n, enContab: !!(n && n.closest('#sbContab')), antes: p ? p.textContent.trim() : '', txt: n ? n.textContent.trim() : '' }; });
    ok(menu.existe && menu.enContab && /Reporte agente/.test(menu.antes) && menu.txt === 'Dinero en poder', `${w}px menú Contabilidad › «Dinero en poder» después de «Reporte agente»`, menu);
    await page.evaluate(() => nav('custodia', document.getElementById('niCustodia')));
    await page.waitForSelector('#v-custodia .cuCard', { timeout: 10000 }); await sleep(400);
    const vista = await page.evaluate(() => ({ on: document.getElementById('v-custodia').classList.contains('on'), ttl: document.getElementById('pttl').textContent, tema: document.documentElement.classList.contains('tema-glass-oscuro'), sel: document.getElementById('cusPer').value, nOpt: document.getElementById('cusPer').options.length, actual: cusPeriodoActual() }));
    ok(vista.on && vista.ttl === 'DINERO EN PODER', `${w}px vista visible con título`, vista);
    ok(vista.tema, `${w}px tema Glass oscuro activo por defecto`);
    ok(vista.sel === vista.actual && vista.nOpt === 12, `${w}px selector de ciclo: actual por defecto + 11 anteriores`, vista);
    // ── cifras por agente = servidor ──
    const c = await page.evaluate(() => [...document.querySelectorAll('#v-custodia .cuCard')].map(k => ({ ag: k.dataset.ag, nom: k.querySelector('.cuNom b').textContent, poder: Number(k.querySelector('.cuEnPoder').dataset.v), txt: k.textContent, debe: k.querySelector('.cuDebe').textContent, avisos: [...k.querySelectorAll('.cuAviso')].map(a => a.textContent) })));
    ok(c.length === 3 && c[0].ag === E, `${w}px 3 tarjetas, administración primero`, c.map(x => x.nom));
    ok(c.every(k => k.poder === ESPERADO[k.ag]), `${w}px EN SU PODER por agente = servidor (Robinson 11,500 · Esterlin 40,000 · María 5,000)`, c.map(k => [k.nom, k.poder]));
    const tot = await page.evaluate(() => ({ cob: Number(document.getElementById('cusTotCob').dataset.v), ciclo: Number(document.getElementById('cusTotCiclo').dataset.v), mano: Number(document.getElementById('cusTotMano').dataset.v), eq: document.querySelector('#cusTot .cuEq').textContent, s: document.querySelector('#cusTot').textContent }));
    const sumCob = RPC.reduce((s, r) => s + r.cobrado_validado, 0), sumTr = TRANSF.filter(t => t.estado === 'aceptada').reduce((s, t) => s + t.monto, 0);
    ok(tot.cob === 57500 && tot.cob === sumCob, `${w}px total real cobrado = Σ cobrado de los agentes (57,500)`, tot);
    ok(tot.cob !== sumCob + sumTr && tot.cob !== sumCob + 12000, `${w}px transferencias (5,000) y depósitos a cuentas de otros (12,000) NO aumentan el total cobrado`);
    ok(tot.ciclo + tot.mano === tot.cob && tot.ciclo === 55500 && tot.mano === 2000, `${w}px cuadre: Σ «de este ciclo» 55,500 + entregado en mano 2,000 = cobrado 57,500`, tot);
    ok(/no se suman/.test(tot.eq), `${w}px explica que transferencias y depósitos no se suman`);
    const rob = c.find(k => k.ag === R), est = c.find(k => k.ag === E), mar = c.find(k => k.ag === M);
    const rd = n => 'RD$ ' + n.toLocaleString('es-DO');
    ok(rob.txt.includes('efectivo ' + rd(10000) + ' · banco ' + rd(19500)), `${w}px Robinson: cobró efectivo 10,000 · banco 19,500 (el efectivo del 19-sep y la transferencia sin validar quedan fuera)`, rob.txt.slice(0, 400));
    ok(/Depositado en cuentas de otros\s*RD\$ 12,000/.test(rob.txt) && /Entregado en mano\s*RD\$ 2,000/.test(rob.txt) && /Transferido a otros\s*RD\$ 5,000/.test(rob.txt), `${w}px Robinson: depositado a otros 12,000 · en mano 2,000 (la anulada no cuenta) · transferido 5,000`, rob.txt.slice(0, 600));
    ok(/Recibido en su cuenta \(de otros\)\s*RD\$ 12,000/.test(est.txt), `${w}px Esterlin: recibido en su cuenta 12,000 (depositado por Robinson)`);
    ok(/Recibido por transferencia\s*RD\$ 5,000/.test(mar.txt), `${w}px María: recibido por transferencia 5,000`);
    ok(rob.debe.includes('Robinson debe entregar ' + rd(10500)) && rob.debe.includes('efectivo ' + rd(3000)) && rob.debe.includes('depositado en su cuenta ' + rd(3000)) && rob.debe.includes(rd(4500) + ' por desfase') && rob.debe.includes(rd(1000) + ' que trae de ciclos anteriores'), `${w}px línea «Robinson debe entregar RD$ 10,500 (efectivo 3,000 + en su cuenta 3,000 + 4,500 desfase)» + lo que trae`, rob.debe);
    ok(/administración\) tiene RD\$ 40,000/.test(est.debe) && est.debe.includes('efectivo ' + rd(8000)) && est.debe.includes('en su cuenta ' + rd(32000)), `${w}px línea de la administración: tiene 40,000 (efectivo 8,000 + en su cuenta 32,000)`, est.debe);
    ok(rob.avisos.some(a => /aproximada/.test(a)) && rob.avisos.some(a => /desfase/.test(a)), `${w}px avisos en Robinson: histórico aproximado y desfase de fechas`, rob.avisos);
    ok(!est.avisos.length && !mar.avisos.length, `${w}px sin avisos donde todo cuadra`, [est.avisos, mar.avisos]);
    ok(c.every(k => !/no coincide/.test(k.txt)), `${w}px el detalle cuadra con el servidor para todos`);
    // ── diseño ──
    const lay = await page.evaluate(() => { const k = document.querySelector('#v-custodia .cuCard'), cs = getComputedStyle(k); const big = getComputedStyle(k.querySelector('.cuEnPoder')); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bg: cs.backgroundColor, color: getComputedStyle(k.querySelector('.cuNom b')).color, big: parseFloat(big.fontSize), cols: getComputedStyle(document.querySelector('#v-custodia .cuGrid')).gridTemplateColumns.split(' ').length, fuera: [...document.querySelectorAll('#v-custodia *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > document.documentElement.clientWidth + 1; }).length }; });
    ok(lay.sw <= lay.cw && lay.fuera === 0, `${w}px sin scroll horizontal ni elementos fuera de pantalla`, lay);
    ok(!/255, 255, 255\)$/.test(lay.bg) && /2[2-5]\d, 2[2-5]\d, 2[2-5]\d/.test(lay.color), `${w}px tarjeta de cristal oscura con texto claro`, lay);
    ok(lay.big >= 20, `${w}px EN SU PODER en grande (${lay.big}px)`);
    ok(w < 500 ? lay.cols === 1 : lay.cols >= 2, `${w}px columnas de tarjetas: ${lay.cols}`);
    await page.screenshot({ path: OUT + `${w}-custodia.png`, fullPage: false });
    await page.screenshot({ path: OUT + `${w}-custodia-completo.png`, fullPage: true });
    // ── detalle de Robinson ──
    await page.click(`#v-custodia .cuCard[data-ag="${R}"]`); await sleep(700);
    const det = await page.evaluate(() => { const b = document.getElementById('cusDetBox'); if (!b) return null; const g = [...b.querySelectorAll('.cuGrp')].map(x => ({ t: x.querySelector('h4 span').textContent, total: x.querySelector('h4 b').textContent, n: x.querySelectorAll('.cuMov').length, txt: x.textContent })); return { eq: b.querySelector('.cuDebe').textContent, g, top: b.getBoundingClientRect().top }; });
    ok(det && det.g.map(x => x.t).join('|') === 'Efectivo recibido|Depósitos a su cuenta|Depósitos a cuentas de otros|Entregas en mano|Transferencias', `${w}px detalle agrupado: efectivo · depósitos a su cuenta · a cuentas de otros · entregas · transferencias`, det && det.g.map(x => x.t));
    ok(det && /= RD\$ 11,500 en su poder/.test(det.eq), `${w}px detalle: ecuación que termina en lo que tiene en su poder`, det && det.eq);
    const G = t => det.g.find(x => x.t === t);
    ok(G('Efectivo recibido').n === 1 && /Juan Rodriguez/.test(G('Efectivo recibido').txt), `${w}px efectivo: 1 cobro con nombre del cliente`, G('Efectivo recibido'));
    ok(G('Depósitos a su cuenta').n === 1 && /a su cuenta/.test(G('Depósitos a su cuenta').txt), `${w}px depósitos a su cuenta: 3,000`, G('Depósitos a su cuenta'));
    ok(G('Depósitos a cuentas de otros').n === 2 && /cuenta de Esterlin/.test(G('Depósitos a cuentas de otros').txt) && /validado/.test(G('Depósitos a cuentas de otros').txt) && /Popular/.test(G('Depósitos a cuentas de otros').txt), `${w}px depósitos a cuentas de otros: 12,000 + el de 4,500 marcado con desfase (banco y dueño de la cuenta)`, G('Depósitos a cuentas de otros'));
    ok(G('Entregas en mano').n === 1, `${w}px entregas en mano: 1 (la anulada no aparece)`);
    ok(G('Transferencias').n === 2 && /Envió a Maria/i.test(G('Transferencias').txt) && /sin confirmar/.test(G('Transferencias').txt) && !/8,888/.test(G('Transferencias').txt), `${w}px transferencias: enviada a María + pendiente «sin confirmar» (la rechazada no aparece)`, G('Transferencias'));
    ok(det.top < (w < 500 ? 844 : 800), `${w}px al tocar se desplaza al detalle`, det.top);
    await page.screenshot({ path: OUT + `${w}-custodia-detalle.png` });
    await page.click(`#v-custodia .cuCard[data-ag="${R}"]`); await sleep(200);
    ok(await page.evaluate(() => !document.getElementById('cusDetBox')), `${w}px tocar de nuevo cierra el detalle`);
    // ── cambio de ciclo ──
    const antes = llamadas.length;
    await page.selectOption('#cusPer', await page.evaluate(() => cusPeriodoMas(cusPeriodoActual(), -1))); await sleep(800);
    ok(llamadas.length === antes + 1 && llamadas[llamadas.length - 1] === await page.evaluate(() => cusPeriodoMas(cusPeriodoActual(), -1)), `${w}px elegir el ciclo anterior consulta el servidor con ese período`, llamadas);
    ok(errs.length === 0, `${w}px sin errores de consola`, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
