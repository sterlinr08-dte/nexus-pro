// QA de la RUEDA en listas (59.12; nativa 59.15, 05-oct-2026): parches-foco-lista.js con la app real y la REST simulada.
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-foco-lista.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942', OUT = process.env.QA_OUT || require('os').tmpdir();
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { res.resume(); res.on('end', r); }).on('error', r));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
async function abrir(b, w) {
  const o = { viewport: { width: w, height: w < 500 ? 844 : 720 }, hasTouch: w < 500, isMobile: w < 500 };
  const ctx = await b.newContext(o); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(() => { localStorage.setItem('nx_auth_mode', 'legacy'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4500);
  return { ctx, page, errs };
}
// Estado de la rueda: qué fila está en el centro y cómo se ven sus vecinas.
const estado = (p, sel) => p.evaluate((sel) => {
  const filas = [...document.querySelectorAll(sel)];
  const ang = (el) => { const t = getComputedStyle(el).transform; if (!t || t === 'none') return 0; const m = new DOMMatrix(t); return Math.round(Math.atan2(m.m23, m.m22) * 180 / Math.PI); };
  // Escala total = la de la animación (transform) × la propiedad «scale» (59.15: la fila del centro se levanta con scale).
  const esc = (el) => { const cs = getComputedStyle(el), t = cs.transform, s = cs.scale && cs.scale !== 'none' ? parseFloat(cs.scale) : 1; if (!t || t === 'none') return s; const m = new DOMMatrix(t); return +(Math.hypot(m.m11, m.m12, m.m13) * s).toFixed(3); };
  const i = filas.findIndex(f => f.classList.contains('nx-foco'));
  const m = document.querySelector('.nx-foco-marco');
  return { rueda: !!document.querySelector('.nx-rueda'), nativa: !!document.querySelector('.nx-rueda.nx-rueda-nativa'), i, n: filas.length, marco: !!(m && m.classList.contains('on')),
    filas: filas.map(f => ({ ang: ang(f), esc: esc(f), op: +(+getComputedStyle(f).opacity).toFixed(2), blur: /blur/.test(getComputedStyle(f).filter) })) };
}, sel);
const centrar = (p, sel, k) => p.evaluate(([sel, k]) => { const f = document.querySelectorAll(sel)[k]; if (f) f.scrollIntoView({ block: 'center' }); }, [sel, k]);
(async () => {
  await qa('tema/none');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const SEL = '#tbCli > .clirow';
  // ── Computadora ──
  { const { ctx, page, errs } = await abrir(b, 1280);
    await page.evaluate(() => { try { nav('clientes', null); } catch (e) {} }); await page.waitForTimeout(1800);
    await centrar(page, SEL, 3); await page.waitForTimeout(600);
    let e = await estado(page, SEL);
    ok(e.n >= 5, 'clientes: hay filas para probar', e.n);
    ok(e.rueda && e.i === 3, 'la fila que cruza el centro de la pantalla queda en foco', { i: e.i });
    ok(e.marco, 'marco de esquinas sobre la fila del centro');
    const c = e.filas[3], arr = e.filas[2], arr2 = e.filas[1], aba = e.filas[4];
    ok(Math.abs(c.ang) <= 6 && c.esc >= 1.02 && c.op === 1 && !c.blur, 'fila del centro: derecha, más grande, nítida', c);
    ok(arr.ang > 8 && aba.ang < -8, 'vecinas inclinadas hacia atrás como un cilindro (arriba y abajo en sentidos opuestos)', { arriba: arr.ang, abajo: aba.ang });
    ok(arr2.ang > arr.ang && arr2.esc < arr.esc && arr2.op < arr.op, 'cuanto más lejos del centro, más inclinada, pequeña y tenue', { cerca: arr, lejos: arr2 });
    ok(e.nativa, 'rueda nativa: el navegador gira las filas al desplazar (sin JavaScript en cada cuadro)');
    ok(!arr.blur && !aba.blur, 'sin desenfoque al girar (obligaba a redibujar cada cuadro)');
    ok(Math.abs(arr.ang + aba.ang) <= 4 && Math.abs(arr.op - aba.op) <= .06, 'la rueda es simétrica alrededor del centro', { arriba: arr, abajo: aba });
    await page.screenshot({ path: OUT + '/rueda-1280-clientes.png' });
    // Girar: centrar otra fila mueve el foco
    await centrar(page, SEL, 5); await page.waitForTimeout(600);
    e = await estado(page, SEL);
    ok(e.i === 5 && e.filas[3].ang > 8, 'al desplazar, el foco pasa a la nueva fila del centro y la anterior se inclina', { i: e.i, ang3: e.filas[3].ang });
    // Lejos de la lista: todo normal
    await page.evaluate(() => { const s = document.scrollingElement; s.scrollTop = 0; document.querySelectorAll('*').forEach(x => { if (x.scrollTop > 0) x.scrollTop = 0; }); }); await page.waitForTimeout(600);
    e = await estado(page, SEL);
    ok(!e.filas.some(f => f.ang !== 0 || f.op < 1) || e.i >= 0, 'sin lista en el centro no queda nada torcido', { i: e.i, rueda: e.rueda, malas: e.filas.map((f, k) => [k, f.ang, f.op]).filter(x => x[1] || x[2] < 1) });
    // Facturas en la computadora: es una tabla de verdad y no gira (inclinar celdas rompe las columnas).
    await page.evaluate(() => { try { nav('facturas', null); } catch (e) {} }); await page.waitForTimeout(1500);
    await page.evaluate(() => { const s = document.getElementById('fFactEstado'); if (s) { if (![...s.options].some(o => o.value === 'atrasadas')) s.add(new Option('Meses anteriores', 'atrasadas')); s.value = 'atrasadas'; } rFact(); });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const f = document.querySelectorAll('#tbFact table.sf-fact tbody tr')[4]; if (f) f.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(700);
    ok(await page.evaluate(() => !document.querySelector('#tbFact .nx-rueda-fila') && !document.querySelector('#tbFact .nx-rueda')), 'Facturas (computadora): la tabla no gira');
    // CRM
    await page.evaluate(() => { try { nav('crm', null); } catch (e) {} }); await page.waitForTimeout(1800);
    await centrar(page, '.nxOpsRows > .nxOpsTask', 2); await page.waitForTimeout(600);
    e = await estado(page, '.nxOpsRows > .nxOpsTask');
    ok(e.rueda && e.i >= 0, 'CRM: la lista de tareas también gira', { i: e.i });
    await page.screenshot({ path: OUT + '/rueda-1280-crm.png' });
    ok(errs.length === 0, 'sin errores de JavaScript (computadora)', errs.slice(0, 3));
    await ctx.close(); }
  // ── iPhone ──
  { const { ctx, page, errs } = await abrir(b, 390);
    await page.evaluate(() => { try { nav('clientes', null); } catch (e) {} }); await page.waitForTimeout(1800);
    await centrar(page, SEL, 2); await page.waitForTimeout(600);
    const e = await estado(page, SEL);
    ok(e.rueda && e.i === 2 && e.marco, 'iPhone: la fila del centro en foco con marco', { i: e.i });
    ok(Math.abs(e.filas[2].ang) <= 4 && e.filas[2].op >= .95, 'iPhone: la fila del centro queda derecha y nítida', e.filas[2]);
    ok(Math.abs(e.filas[1].ang + e.filas[3].ang) <= 4, 'iPhone: la rueda gira alrededor del centro de la PANTALLA (simétrica), no del de toda la lista', [e.filas[1].ang, e.filas[3].ang]);
    ok(e.filas[1].ang > 8 && e.filas[3].ang < -8 && e.filas[1].op < 1, 'iPhone: las vecinas se inclinan y se oscurecen', [e.filas[1], e.filas[3]]);
    ok(!e.filas.some(f => f.blur), 'iPhone: sin desenfoque (rendimiento)');
    await page.screenshot({ path: OUT + '/rueda-390-clientes.png' });
    // Desplazar sin parar (como la inercia del iPhone): el marco va pegado a la fila del centro en cada cuadro.
    const desfase = await page.evaluate(async () => {
      let sc = document.querySelector('#tbCli'); while (sc && sc !== document.body) { const cs = getComputedStyle(sc); if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 4) break; sc = sc.parentElement; }
      if (!sc || sc === document.body) sc = document.scrollingElement;
      let peor = 0;
      for (let i = 0; i < 40; i++) {
        sc.scrollTop += 9; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const f = document.querySelector('.nx-rueda-fila.nx-foco'), m = document.querySelector('.nx-foco-marco.on');
        if (!f || !m) continue;
        const a = f.getBoundingClientRect(), b = m.getBoundingClientRect();
        peor = Math.max(peor, Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)));
      }
      return Math.round(peor * 10) / 10;
    });
    ok(desfase <= 3, 'iPhone: al desplazar sin parar, el marco va pegado a la fila del centro (desfase ≤ 3 px)', desfase);
    ok(await page.evaluate(() => !!document.querySelector('.nx-rueda.nx-vidrio-no')), 'iPhone: la luz de vidrio no se dibuja sobre la lista que gira');
    // Facturas: en el iPhone la tabla se ve como tarjetas y también gira.
    const SF = '#tbFact table.sf-fact tbody tr.nx-rueda-fila';
    await page.evaluate(() => { try { nav('facturas', null); } catch (e) {} }); await page.waitForTimeout(1500);
    await page.evaluate(() => { const s = document.getElementById('fFactEstado'); if (s) { if (![...s.options].some(o => o.value === 'atrasadas')) s.add(new Option('Meses anteriores', 'atrasadas')); s.value = 'atrasadas'; } rFact(); });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const f = document.querySelectorAll('#tbFact table.sf-fact tbody tr')[4]; if (f) f.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(900);
    const ef = await estado(page, SF);
    ok(ef.rueda && ef.n >= 5 && ef.i >= 1 && ef.marco, 'iPhone Facturas: las tarjetas giran con foco y marco', { n: ef.n, i: ef.i });
    if (ef.i >= 1 && ef.i < ef.n - 1) { const a = ef.filas[ef.i - 1], c = ef.filas[ef.i], z = ef.filas[ef.i + 1];
      ok(Math.abs(c.ang) <= 4 && a.ang > 8 && z.ang < -8 && Math.abs(a.ang + z.ang) <= 4, 'iPhone Facturas: centro derecho y vecinas simétricas', [a.ang, c.ang, z.ang]); }
    await page.screenshot({ path: OUT + '/rueda-390-facturas.png' });
    ok(errs.length === 0, 'sin errores de JavaScript (iPhone)', errs.slice(0, 3));
    await ctx.close(); }
  await b.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
