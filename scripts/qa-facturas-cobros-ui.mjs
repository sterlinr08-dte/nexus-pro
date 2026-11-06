// QA 59.82 — Facturas, Cobros e Historial de pagos más claros (06-nov-2026). Solo visual.
// App real contra scripts/qa-crm-mock-server.js, a 390×844 y 1280×800, tema oscuro (por defecto) y claro.
//  · Facturas: lista vacía que explica por qué y botón que lo arregla (Ver atrasadas, Ver todas, Quitar búsqueda); sin emoji.
//  · Cobros: «Ningún cliente coincide» + «Quitar filtros» vuelve a mostrar la lista.
//  · Historial: fecha «jue 6 nov» (título con la fecha original); en el celular no sale «Banco: —» ni «Registró: —»;
//    «Quitar filtros» no toca las fechas; si la carga falla, «Volver a intentar» vuelve a cargar.
//  · Tamaños: botones ≥44 px, letra ≥13 px; sin scroll de lado; sin errores de página.
//  · Interruptor: con localStorage.nx_facturas_cobros_ui_off='1' todo queda como antes.
// Uso: PORT=8953 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8953 node scripts/qa-facturas-cobros-ui.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8953';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-facturas-cobros-ui')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || ''; // carpeta opcional con tabler-icons.min.css y tabler-icons.woff2 (solo para que las capturas muestren los iconos)
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, { tema = '', off = false } = {}) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, userAgent: movil ? UA : undefined, locale: 'es-DO', deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  const st = { fallarAbonos: false };
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (st.fallarAbonos && /\/rest\/v1\/abonos\?/.test(u)) return r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"caida de prueba"}' });
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) { const f = [path.join(TABLER, 'fonts', 'tabler-icons.woff2'), path.join(TABLER, 'tabler-icons.woff2')].find(x => fs.existsSync(x)); if (f) return await r.fulfill({ path: f, contentType: 'font/woff2' }); }
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(({ tema, off }) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    if (tema) localStorage.setItem('nx_tema', tema);
    if (off) localStorage.setItem('nx_facturas_cobros_ui_off', '1');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { tema, off });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0 && (ST.facturas || []).length > 0, null, { timeout: 30000 });
  if (!off) await page.waitForFunction(() => window.__nxFcuUIApi, null, { timeout: 20000 });
  await sleep(1500);
  // las preferencias del simulador ponen el tema oscuro: se aplica el claro como lo haría Ajustes (sin guardar)
  if (tema) await page.evaluate(t => { try { aplicarTema(t, false); } catch (e) {} }, tema);
  await page.evaluate(() => nav('facturas', null)); await sleep(900);
  return { ctx, page, errs, st };
}
const info = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(cs.fontSize), t: e.textContent.trim().replace(/\s+/g, ' ') }; }, sel);
const botones = page => page.$$eval('.nxFcuVacio .acc button', bs => bs.map(b => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(getComputedStyle(b).fontSize), t: b.textContent.trim() }; }));
const sinScrollLado = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

(async () => {
  const browser = await chromium.launch();
  for (const [width, tema] of [[390, ''], [1280, ''], [390, 'clasico'], [1280, 'clasico']]) {
    const nomTema = tema ? 'claro' : 'oscuro';
    console.log(`\n== ${width}px · ${nomTema} ==`);
    const { ctx, page, errs, st } = await abrir(browser, width, { tema });
    const sfx = `${width}-${nomTema}`;
    if (tema) ok(await page.evaluate(() => document.documentElement.classList.contains('tema-claro')), 'tema claro aplicado (html.tema-claro)');

    // ── Facturas: mes en curso sin facturas (el simulador solo tiene 2020)
    let v = await info(page, '#tbFact .nxFcuVacio b');
    ok(v && /Aún no hay facturas de/.test(v.t), 'Facturas: dice que el mes no tiene facturas', v);
    ok(!(await page.evaluate(() => /🎉/.test(document.getElementById('tbFact').textContent))), 'Facturas: sin emoji');
    let bs = await botones(page);
    ok(bs.some(b => /Ver atrasadas \(\d+\)/.test(b.t)), 'Facturas: ofrece «Ver atrasadas (N)»', bs);
    ok(bs.length && bs.every(b => b.h >= 44 && b.w >= 44 && b.fs >= 13), 'Facturas: botones ≥44 px y letra ≥13', bs);
    ok(v && v.fs >= 15, 'Facturas: título de 15 px o más', v);
    ok(await sinScrollLado(page), 'sin scroll de lado');
    await page.screenshot({ path: OUT + `fact-vacio-${sfx}.png` });
    await page.click('.nxFcuVacio [data-fcu="fact-atrasadas"]'); await sleep(500);
    ok(await page.evaluate(() => document.getElementById('fFactEstado').value === 'atrasadas' && !document.querySelector('#tbFact .nxFcuVacio') && document.getElementById('tbFact').children.length > 0), 'Facturas: «Ver atrasadas» muestra la lista');

    // mes con facturas pero el filtro las oculta
    await page.evaluate(() => { document.getElementById('fMes').value = '1'; const fa = document.getElementById('fAnio'); if (![...fa.options].some(o => o.value === '2020')) fa.add(new Option('2020', '2020')); fa.value = '2020'; document.getElementById('fFactEstado').value = 'Pagado'; rFact(); }); await sleep(400);
    v = await info(page, '#tbFact .nxFcuVacio b');
    ok(v && /No hay facturas pagadas en enero 2020/.test(v.t), 'Facturas: «No hay facturas pagadas en enero 2020»', v);
    bs = await botones(page);
    ok(bs.some(b => /^Ver todas \(\d+\)$/.test(b.t)), 'Facturas: ofrece «Ver todas (N)»', bs);
    await page.click('.nxFcuVacio [data-fcu="fact-todas"]'); await sleep(500);
    ok(await page.evaluate(() => document.getElementById('fFactEstado').value === 'todas' && !document.querySelector('#tbFact .nxFcuVacio')), 'Facturas: «Ver todas» muestra la lista');

    // búsqueda sin resultados
    await page.evaluate(() => { document.getElementById('factQ').value = 'zzzz-nadie'; rFact(); }); await sleep(400);
    v = await info(page, '#tbFact .nxFcuVacio b');
    ok(v && /Ninguna factura coincide/.test(v.t), 'Facturas: búsqueda sin resultados lo explica', v);
    await page.screenshot({ path: OUT + `fact-busqueda-${sfx}.png` });
    await page.click('.nxFcuVacio [data-fcu="fact-limpiar"]'); await sleep(500);
    ok(await page.evaluate(() => document.getElementById('factQ').value === '' && !document.querySelector('#tbFact .nxFcuVacio')), 'Facturas: «Quitar búsqueda y agente» vuelve a la lista');

    // ── Cobros
    await page.evaluate(() => switchTab('cob')); await sleep(800);
    await page.evaluate(() => { document.getElementById('cobQ').value = 'zzzz-nadie'; rCob(); }); await sleep(400);
    v = await info(page, '#tbCob .nxFcuVacio b');
    ok(v && /Ningún cliente coincide/.test(v.t), 'Cobros: «Ningún cliente coincide»', v);
    bs = await botones(page);
    ok(bs.length && bs.every(b => b.h >= 44 && b.fs >= 13), 'Cobros: botón ≥44 px', bs);
    await page.screenshot({ path: OUT + `cob-vacio-${sfx}.png` });
    await page.click('.nxFcuVacio [data-fcu="cob-limpiar"]'); await sleep(500);
    ok(await page.evaluate(() => document.getElementById('cobQ').value === '' && !document.querySelector('#tbCob .nxFcuVacio') && document.getElementById('tbCob').children.length > 0), 'Cobros: «Quitar filtros» vuelve a mostrar a los clientes');

    // ── Historial de pagos
    await page.evaluate(() => switchTab('pagos')); await sleep(1500);
    const fechas = await page.$$eval('#tbPagos td[data-lb="Fecha"]', ts => ts.map(t => ({ t: t.textContent.trim(), title: t.title })));
    ok(fechas.length > 0 && fechas.every(f => /^(dom|lun|mar|mié|jue|vie|sáb) \d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)( \d{4})?$/.test(f.t) && /^\d{4}-\d{2}-\d{2}$/.test(f.title)), 'Historial: fecha «jue 6 nov» con la original en el título', fechas.slice(0, 3));
    if (width < 500) {
      const vis = await page.$$eval('#tbPagos td:is([data-lb="Banco"],[data-lb="Usuario"])', ts => ts.map(t => ({ t: t.textContent.trim(), d: getComputedStyle(t).display })));
      ok(vis.length && vis.every(x => (x.t === '—') === (x.d === 'none')), 'Historial (celular): «Banco: —» y «Registró: —» no se muestran; los que tienen dato sí', vis.slice(0, 4));
    }
    await page.evaluate(() => document.getElementById("tbPagos").scrollIntoView({ block: "center" })); await sleep(200);
    await page.screenshot({ path: OUT + `pagos-${sfx}.png` });
    const fechasAntes = await page.evaluate(() => [document.getElementById('pgFechaD').value, document.getElementById('pgFechaH').value]);
    await page.evaluate(() => { document.getElementById('pgBuscar').value = 'zzzz-nadie'; aplicarFiltrosPagos(); }); await sleep(400);
    v = await info(page, '#tbPagos .nxFcuVacio b');
    ok(v && /No hay pagos con estos filtros/.test(v.t), 'Historial: «No hay pagos con estos filtros»', v);
    await page.evaluate(() => document.getElementById("tbPagos").scrollIntoView({ block: "center" })); await sleep(200);
    await page.screenshot({ path: OUT + `pagos-vacio-${sfx}.png` });
    await page.click('.nxFcuVacio [data-fcu="pag-limpiar"]'); await sleep(1200);
    const desp = await page.evaluate(() => ({ q: document.getElementById('pgBuscar').value, f: [document.getElementById('pgFechaD').value, document.getElementById('pgFechaH').value], filas: document.querySelectorAll('#tbPagos tbody tr').length }));
    ok(desp.q === '' && desp.filas > 0 && JSON.stringify(desp.f) === JSON.stringify(fechasAntes), 'Historial: «Quitar filtros» vuelve a la lista sin tocar las fechas', { desp, fechasAntes });
    // carga que falla → Volver a intentar
    st.fallarAbonos = true; await page.evaluate(() => rPagos()); await sleep(900);
    v = await info(page, '#tbPagos .nxFcuVacio b');
    ok(v && /No se pudieron cargar los pagos/.test(v.t), 'Historial: si falla la carga lo dice claro', v);
    await page.screenshot({ path: OUT + `pagos-error-${sfx}.png` });
    st.fallarAbonos = false; await page.click('.nxFcuVacio [data-fcu="pag-reintentar"]'); await sleep(1200);
    ok(await page.evaluate(() => document.querySelectorAll('#tbPagos tbody tr').length > 0), 'Historial: «Volver a intentar» carga los pagos');
    ok(await sinScrollLado(page), 'sin scroll de lado (historial)');
    ok(!errs.length, 'sin errores de página', errs);
    await ctx.close();
  }

  // ── Interruptor apagado: todo como antes
  console.log('\n== apagado (nx_facturas_cobros_ui_off=1) ==');
  { const { ctx, page, errs } = await abrir(browser, 390, { off: true });
    ok(await page.evaluate(() => !window.__nxFcuUIApi && !document.querySelector('.nxFcuVacio') && /Sin facturas generadas/i.test(document.getElementById('tbFact').textContent)), 'apagado: Facturas muestra el texto de antes');
    await page.evaluate(() => switchTab('pagos')); await sleep(1500);
    ok(await page.evaluate(() => [...document.querySelectorAll('#tbPagos td[data-lb="Fecha"]')].every(t => /^\d{4}-\d{2}-\d{2}$/.test(t.textContent.trim()))), 'apagado: la fecha sale como antes');
    ok(!errs.length, 'apagado: sin errores de página', errs);
    await ctx.close(); }

  await browser.close();
  console.log(`\nRESULTADO: ${pass} PASS, ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
