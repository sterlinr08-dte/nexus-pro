// QA de Facturas → Cobros (59.21, 11-oct-2026; filas en 2 líneas 59.27, 14-oct): resumen, lupa y filtros en una fila, filas y COBRAR.
// Solo forma y orden: rCob(), abrirAbono() y los filtros no cambian. Datos de la REST simulada; los casos raros
// (referencia, cliente sin agente) se ponen en memoria de la página, sin tocar el servidor.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-cobros.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942', OUT = process.env.QA_OUT || require('os').tmpdir();
const TABLER = '/tmp/qa-tabler-icons'; // íconos locales si existen (si no, los íconos quedan vacíos y la prueba sigue)
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { res.resume(); res.on('end', r); }).on('error', r));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };

async function abrir(b, w, tema) {
  await qa('tema/' + tema);
  const movil = w < 500;
  const ctx = await b.newContext(movil ? { viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA } : { viewport: { width: w, height: 800 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    const m = u.match(/@tabler\/icons-webfont@[^/]+\/dist\/([^?#]+)/); if (m && fs.existsSync(path.join(TABLER, m[1]))) return r.fulfill({ status: 200, body: fs.readFileSync(path.join(TABLER, m[1])) });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript((t) => { localStorage.setItem('nx_auth_mode', 'legacy'); localStorage.setItem('nx_tema', t); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, tema);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4500);
  await page.evaluate(() => { nav('facturas', null); setTimeout(() => switchTab('cob'), 250); });
  await page.waitForFunction(() => document.querySelectorAll('#tbCob .nxCobFila').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page, errs };
}

// Casos raros en memoria: referencia en el 1.º cliente con deuda y uno con deuda sin agente.
const casosRaros = (p) => p.evaluate(() => {
  const S = window.ST || ST; const deben = S.clientes.filter(c => c.activo !== false && pendTot(c) > 0);
  if (deben[0]) deben[0].referencia = 'REF-7';
  if (deben[1]) deben[1].agente_id = null;
  rCob(); return { ref: deben[0] && deben[0].id, sinAg: deben[1] && deben[1].id };
});

const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; };

async function recorrido(b, w, tema) {
  const et = `[${w} ${tema}]`;
  const { ctx, page, errs } = await abrir(b, w, tema);
  const oscuro = tema === 'glass-oscuro'; // en «Premium dark» las tarjetas de cobro siguen blancas (como en el claro)
  const raros = await casosRaros(page); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `cobros-${w}-${tema}.png`), fullPage: true });

  // 1) Lupa y los dos filtros en una sola fila, sin desbordar
  const fila = await page.evaluate(() => {
    const t = document.querySelector('#panelCob .nxCobTools'); if (!t) return null;
    const r = e => { const x = e.getBoundingClientRect(); return { y: x.y + x.height / 2, r: x.right, h: x.height }; };
    const lupa = document.querySelector('#cobQLupa'), ag = document.querySelector('#fAgenteCobChip .nfcBtn'), es = document.querySelector('#fCobEstChip .nfcBtn');
    return { lupa: lupa && r(lupa), ag: ag && r(ag), es: es && r(es), tr: t.getBoundingClientRect().right, sw: t.scrollWidth, cw: t.clientWidth,
      selAg: getComputedStyle(document.getElementById('fAgenteCob')).display, selEs: getComputedStyle(document.getElementById('fCobEst')).display };
  });
  ok(fila && fila.lupa && fila.ag && fila.es, `${et} la fila tiene lupa, chip Agente y chip Estado`, fila);
  if (fila && fila.lupa && fila.ag && fila.es) {
    ok(Math.abs(fila.lupa.y - fila.ag.y) < 6 && Math.abs(fila.ag.y - fila.es.y) < 6, `${et} lupa y filtros en la misma fila`, fila);
    ok(fila.es.r <= fila.tr + 1 && fila.sw <= fila.cw + 1, `${et} la fila no se sale de la pantalla`, fila);
    ok(fila.selAg === 'none' && fila.selEs === 'none', `${et} los select originales quedan ocultos detrás de los chips`, fila);
  }

  // 2) Resumen: en el celular «Deuda total» arriba y a lo ancho; «Con deuda» y «Al día» lado a lado
  const kpi = await page.evaluate(() => {
    const g = s => { const e = document.querySelector('#cobResumen ' + s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, fs: parseFloat(getComputedStyle(e.querySelector('.v')).fontSize) }; };
    const c = document.querySelector('#cobResumen .sf-kpis'); return { cont: c && c.getBoundingClientRect().width, warn: g('.sf-kpi.warn'), err: g('.sf-kpi.err') || g('.sf-kpi.ok:first-child'), ok: g('.sf-kpi.ok:last-child') };
  });
  if (w < 500) {
    ok(kpi.warn && kpi.err && kpi.ok && kpi.warn.y < kpi.err.y && kpi.warn.y < kpi.ok.y, `${et} «Deuda total» va primero`, kpi);
    ok(kpi.warn && Math.abs(kpi.warn.w - kpi.cont) < 2, `${et} «Deuda total» a lo ancho`, kpi);
    ok(kpi.err && kpi.ok && Math.abs(kpi.err.y - kpi.ok.y) < 2 && kpi.err.x < kpi.ok.x, `${et} «Con deuda» y «Al día» lado a lado`, kpi);
    ok(kpi.warn && kpi.warn.fs >= 22, `${et} la cifra de «Deuda total» es la más grande (${kpi.warn && kpi.warn.fs}px)`);
  } else {
    ok(kpi.warn && kpi.err && kpi.ok && Math.abs(kpi.warn.y - kpi.err.y) < 2 && Math.abs(kpi.warn.y - kpi.ok.y) < 2, `${et} los 3 del resumen en una fila`, kpi);
  }

  // 3) Filas en dos líneas (59.27, reel «6 movimientos»): quién · cuánto · cómo está; monto en un solo lugar
  const filas = await page.evaluate(() => Array.from(document.querySelectorAll('#tbCob .nxCobFila')).map(c => {
    const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
    const nm = c.querySelector('.cfNm'), tot = c.querySelector('.cfTot'), btn = c.querySelector('.cfCobrar'), sub = c.querySelector('.cfSub');
    const bcs = getComputedStyle(btn);
    return { cls: c.className, id: c.dataset.cli, fila: R(c), nm: R(nm), tot: R(tot), btn: R(btn), sub: R(sub), totTxt: tot.textContent.trim(), totFs: parseFloat(getComputedStyle(tot).fontSize),
      ant: !!c.querySelector('.cfAnt'), btnBg: bcs.backgroundColor, btnColor: bcs.color, icoColor: getComputedStyle(btn.querySelector('i')).color,
      refColor: nm.querySelector('.cfRef') ? getComputedStyle(nm.querySelector('.cfRef')).color : null,
      sinAgColor: sub.querySelector('.cfSinAg') ? getComputedStyle(sub.querySelector('.cfSinAg')).color : null };
  }));
  ok(filas.length > 0, `${et} hay filas de cobro (${filas.length})`);
  const deben = filas.filter(t => /\b(pend|parcial)\b/.test(t.cls)), aldia = filas.filter(t => /\baldia\b/.test(t.cls));
  ok(deben.length > 0 && aldia.length > 0, `${et} hay clientes con deuda (${deben.length}) y al día (${aldia.length})`);
  ok(filas.every(t => t.fila.h <= (w < 500 ? 90 : 64)), `${et} cada fila es baja (${w < 500 ? '≤ 90' : '≤ 64'} px): ${Math.max(...filas.map(t => Math.round(t.fila.h)))} px`, filas.map(t => Math.round(t.fila.h)));
  ok(new Set(filas.map(t => Math.round(t.tot.r))).size === 1, `${et} los montos quedan alineados en una sola columna a la derecha`, filas.map(t => Math.round(t.tot.r)));
  ok(new Set(filas.map(t => Math.round(t.fila.w))).size === 1, `${et} todas las filas miden lo mismo de ancho`, filas.map(t => Math.round(t.fila.w)));
  if (w < 500) {
    ok(filas.every(t => Math.abs((t.nm.y + t.nm.h / 2) - (t.tot.y + t.tot.h / 2)) < 6 && t.sub.y >= t.nm.b - 2 && t.btn.y >= t.tot.b - 6), `${et} dos líneas: nombre y monto arriba; estado, agente y COBRAR abajo`);
  } else {
    ok(filas.every(t => Math.abs((t.nm.y + t.nm.h / 2) - (t.tot.y + t.tot.h / 2)) < 6 && Math.abs((t.btn.y + t.btn.h / 2) - (t.tot.y + t.tot.h / 2)) < 6), `${et} en la computadora todo va en una sola línea`);
  }
  ok(filas.every(t => t.btn.h >= 36 && t.btn.w >= 44), `${et} COBRAR se puede tocar (≥ 36 × 44 px, más 6 px de margen invisible)`, filas.map(t => [Math.round(t.btn.h), Math.round(t.btn.w)]));
  ok(filas.every(t => t.totFs >= 14), `${et} el monto se ve grande (${filas[0] && filas[0].totFs}px)`);
  const blanco = 'rgb(255, 255, 255)';
  const conMonto = deben.filter(t => !/RD\$\s*0(\.00)?$/.test(t.totTxt));
  ok(conMonto.every(t => t.btnBg === 'rgb(21, 128, 61)' && t.btnColor === blanco && t.icoColor === blanco), `${et} COBRAR de quien debe: verde sólido, texto e ícono blancos`, conMonto.map(t => [t.btnBg, t.btnColor, t.icoColor]));
  ok(aldia.every(t => /rgba\(0, 0, 0, 0\)|transparent/.test(t.btnBg)), `${et} COBRAR de quien está al día: suave (sin relleno)`, aldia.map(t => t.btnBg));
  const conRef = filas.find(t => t.id === raros.ref), sinAg = filas.find(t => t.id === raros.sinAg);
  ok(conRef && conRef.refColor && conRef.refColor !== 'rgb(0, 0, 0)', `${et} la referencia del cliente se ve (${conRef && conRef.refColor})`);
  ok(sinAg && sinAg.sinAgColor === 'rgb(239, 68, 68)', `${et} «Sin agente» en rojo`, sinAg && sinAg.sinAgColor);
  const daOk = await page.evaluate(() => Array.from(document.querySelectorAll('#tbCob .nxCobFila')).every(f => { const c = (window.ST || ST).clientes.find(x => String(x.id) === f.dataset.cli); return !!f.querySelector('.cfAnt') === (deudaAnt(c) > 0.009); }));
  ok(daOk, `${et} «incl. anterior» solo sale cuando hay deuda anterior`);
  // lo oculto no se borra: tocar la fila abre el detalle en la misma fila (una a la vez)
  await page.click('#tbCob .nxCobFila:nth-child(1) .cfNm'); await page.waitForTimeout(300);
  let ab = await page.evaluate(() => Array.from(document.querySelectorAll('#tbCob .nxCobFila')).map(f => ({ ab: f.classList.contains('abierta'), exp: f.querySelector('.cfFila').getAttribute('aria-expanded'), det: !f.querySelector('.cfDet').hidden, btns: f.querySelectorAll('.cfDet .cfBtn').length })));
  ok(ab[0].ab && ab[0].exp === 'true' && ab[0].det && ab[0].btns === 2 && !(await page.evaluate(() => !!document.querySelector('#mAbono.open'))), `${et} tocar la fila abre su detalle (Ver ficha y WhatsApp) sin abrir el cobro`, ab[0]);
  await page.click('#tbCob .nxCobFila:nth-child(2) .cfNm'); await page.waitForTimeout(300);
  ab = await page.evaluate(() => Array.from(document.querySelectorAll('#tbCob .nxCobFila')).map(f => f.classList.contains('abierta')));
  ok(!ab[0] && ab[1] && ab.filter(Boolean).length === 1, `${et} abrir otra fila cierra la anterior`, ab);
  await page.click('#tbCob .nxCobFila:nth-child(2) .cfNm'); await page.waitForTimeout(300);
  ab = await page.evaluate(() => document.querySelectorAll('#tbCob .nxCobFila.abierta').length);
  ok(ab === 0, `${et} tocarla otra vez la cierra`);
  if (w < 500) await page.screenshot({ path: path.join(OUT, `cobros-${w}-${tema}-filas.png`) });
  const tarjetas = filas;

  // 4) Filtro Estado desde el chip (como lo usa la persona)
  const elegir = async (v) => {
    await page.click('#fCobEstChip .nfcBtn'); await page.waitForTimeout(350);
    await page.click(`.nfcPanel.open .nfcOpt[data-v="${v}"]`); await page.waitForTimeout(500);
    return page.evaluate(() => ({ cls: Array.from(document.querySelectorAll('#tbCob .nxCobFila')).map(c => c.className), lbl: (document.querySelector('#fCobEstChip .nfcLbl') || {}).textContent, val: document.getElementById('fCobEst').value }));
  };
  let r = await elegir('deuda');
  ok(r.val === 'deuda' && r.cls.length > 0 && r.cls.every(c => /\b(pend|parcial)\b/.test(c)), `${et} filtro «Con deuda pendiente»: solo quien debe`, r);
  ok(/deuda/i.test(r.lbl || ''), `${et} el chip dice el filtro elegido («${r.lbl}»)`);
  r = await elegir('aldia');
  ok(r.val === 'aldia' && r.cls.length > 0 && r.cls.every(c => /\baldia\b/.test(c)), `${et} filtro «Al día»: solo quien está al día`, r);
  r = await elegir('');
  ok(r.val === '' && r.cls.length === tarjetas.length && /estado/i.test(r.lbl || ''), `${et} filtro «Todos»: vuelven todas y el chip dice «Estado»`, r);

  // 5) COBRAR abre la ventana de pago de siempre con ese cliente
  const primero = deben[0];
  if (primero) {
    await page.click(`#tbCob .nxCobFila[data-cli="${primero.id}"] .cfCobrar`); await page.waitForTimeout(900);
    const m = await page.evaluate(() => ({ open: !!document.querySelector('#mAbono.open'), cli: (typeof abonoCliId !== 'undefined' ? abonoCliId : null) }));
    ok(m.open && String(m.cli) === String(primero.id), `${et} COBRAR abre «Registrar pago» con ese cliente`, m);
    await page.evaluate(() => { try { cm('mAbono'); } catch (e) { document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); } }); await page.waitForTimeout(400);
  }
  ok(errs.length === 0, `${et} sin errores de página`, errs.slice(0, 3));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, tema] of [[390, 'glass-oscuro'], [1280, 'glass-oscuro'], [430, 'glass-oscuro'], [390, 'clasico'], [1280, 'clasico'], [390, 'premium']]) {
    try { await recorrido(b, w, tema); } catch (e) { ok(false, `[${w} ${tema}] el recorrido terminó`, String(e && e.message || e).slice(0, 300)); }
  }
  await b.close(); await qa('tema/none');
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
