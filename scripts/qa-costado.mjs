// QA 12-nov-2026 — «Costado» en Clientes y Facturas (parches-costado.js). Solo lectura: no debe escribir nada.
// App real contra scripts/qa-crm-mock-server.js (QA_CLIENTES=30), a 390×844 y 1280×800, y con la capa apagada.
//  · Clientes: tocar el nombre abre el resumen al costado (no la ficha completa), con las mismas cifras de la ficha.
//  · Facturas: tocar el nombre abre el resumen de ESA factura (balance, total, meses anteriores, estado).
//  · PC: la lista sigue a la vista; ↓ / K pasan de fila; Esc cierra. Celular: hoja desde abajo con fondo.
//  · Botones: Cobrar, WhatsApp, Ficha completa, Ver factura llaman a lo de siempre y cierran el panel.
//  · Botones ≥44 px, sin scroll de lado, sin errores, cero escrituras.
// Uso: QA_CLIENTES=30 PORT=8952 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8952 node scripts/qa-costado.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8952';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-costado')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 700) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, apagada) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, userAgent: movil ? UA : undefined, locale: 'es-DO', deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = []; const escrituras = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url(), m = r.request().method();
    if (/supabase\.co\//.test(u)) { if (m !== 'GET' && !/\/rpc\//.test(u) && !/usuario_preferencias/.test(u)) escrituras.push(m + ' ' + u); const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    if (process.env.QA_ICONOS && /tabler/.test(u)) return await r.continue();
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(off => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    if (off) localStorage.setItem('nx_costado_off', '1'); else localStorage.removeItem('nx_costado_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, !!apagada);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(off => typeof ST !== 'undefined' && (ST.clientes || []).length > 20 && (off || window.__nxCostado), !!apagada, { timeout: 30000 });
  await sleep(2000);
  await page.evaluate(() => { window.__ll = []; ['abrirAbono', 'nxAbrirWhatsAppDeCliente', 'enviarWA', 'verFacturaPDF_id', 'nxMesesAntVer'].forEach(n => { window['__o_' + n] = window[n]; window[n] = (...a) => window.__ll.push(n + ':' + a.join(',')); }); });
  return { ctx, page, errs, escrituras };
}
const estado = page => page.evaluate(() => { const p = document.getElementById('nxCostado'), o = {};
  o.a = window.__nxCostado ? __nxCostado.actual() : null; o.on = !!p && p.classList.contains('on');
  if (p) { const r = p.getBoundingClientRect(); o.caja = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; o.txt = p.innerText.replace(/\s+/g, ' ').trim();
    o.btn = [...p.querySelectorAll('button')].filter(b => b.offsetParent || b.getClientRects().length).map(b => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))); o.cortado = p.scrollWidth > p.clientWidth + 1; }
  o.ficha = !!document.querySelector('#csPanel.open'); o.act = document.querySelectorAll('.nxCost-act').length;
  const sc = document.getElementById('nxCostScrim'); o.scrim = sc ? getComputedStyle(sc).display !== 'none' && sc.classList.contains('on') : false;
  const d = document.documentElement; o.sw = d.scrollWidth - d.clientWidth; o.ll = (window.__ll || []).slice(-1)[0] || ''; return o; });

(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 1280]) {
    console.log(`\n== ${width}px ==`);
    const { ctx, page, errs, escrituras } = await abrir(browser, width);
    const pc = width >= 1100;
    // ── Clientes
    await page.evaluate(() => { nav('clientes', null); cliVista('lista'); }); await sleep(700);
    const anchoAntes = await page.evaluate(() => Math.round(document.getElementById('tbCli').getBoundingClientRect().width));
    const esp = await page.evaluate(() => { const e = document.querySelectorAll('#tbCli .cli-main')[1]; const id = e.getAttribute('onclick').match(/verCliente\('([^']+)'/)[1]; const c = ST.clientes.find(x => x.id === id); return { id, nom: c.nom, pend: fmt(pendTot(c)), prima: fmt(getTot(c)), est: getEst(c) }; });
    await page.locator('#tbCli .cli-main').nth(1).locator('.cli-nom').click(); await sleep(700);
    let s = await estado(page);
    ok(s.a && s.a.tipo === 'cli' && s.a.id === esp.id && s.on && !s.ficha && s.act === 1, 'Clientes: tocar el nombre abre el costado y NO la ficha completa', [s.a, s.on, s.ficha, s.act]);
    ok(s.txt.includes(esp.nom) && s.txt.includes(esp.pend) && s.txt.includes(esp.prima) && s.txt.includes(esp.est), 'Clientes: mismas cifras que la ficha (pendiente, prima, estado)', [esp, s.txt.slice(0, 220)]);
    ok(s.btn.every(h => h >= 44) && !s.cortado && s.sw <= 0, 'Clientes: botones ≥44 px, nada cortado, sin scroll de lado', [Math.min(...s.btn), s.cortado, s.sw]);
    if (pc) { const w = await page.evaluate(() => { const l = document.getElementById('tbCli').getBoundingClientRect(), p = document.getElementById('nxCostado').getBoundingClientRect(); return [Math.round(l.width), Math.round(l.right), Math.round(p.left)]; });
      ok(w[0] < anchoAntes && w[0] > 380 && w[1] <= w[2] + 1 && !s.scrim, 'PC: la lista sigue a la vista al lado del panel, sin fondo', [anchoAntes, w, s.scrim]); }
    else ok(s.caja[0] === 0 && s.caja[2] === width && s.caja[1] >= 60 && s.scrim, 'Celular: hoja desde abajo de ancho completo, con fondo', [s.caja, s.scrim]);
    await page.screenshot({ path: OUT + `clientes-${width}.png` });
    if (pc) { await page.keyboard.press('ArrowDown'); await sleep(350); const a = (await estado(page)).a; await page.keyboard.press('k'); await sleep(350); const b = (await estado(page)).a;
      ok(a && a.id !== esp.id && b && b.id === esp.id, 'PC: ↓ pasa al siguiente y K vuelve', [a, b]); }
    else { await page.locator('#nxCostado [data-c="sig"]').click(); await sleep(350); const a = (await estado(page)).a; await page.locator('#nxCostado [data-c="ant"]').click(); await sleep(350); const b = (await estado(page)).a;
      ok(a && a.id !== esp.id && b && b.id === esp.id, 'Celular: flechas ▼ ▲ pasan de cliente', [a, b]); }
    await page.locator('#nxCostado [data-c="cobrar"]').click(); await sleep(350); s = await estado(page);
    ok(s.ll === 'abrirAbono:' + esp.id && !s.a && !s.on, 'Clientes: «Cobrar» abre el cobro de siempre y cierra el panel', [s.ll, s.a]);
    await page.locator('#tbCli .cli-main').nth(1).locator('.cli-nom').click(); await sleep(500);
    await page.locator('#nxCostado [data-c="ficha"]').click(); await sleep(600); s = await estado(page);
    ok(s.ficha && !s.a, 'Clientes: «Ficha completa» abre la ficha de siempre', [s.ficha, s.a]);
    await page.evaluate(() => { try { cerrarCS(); } catch (e) { document.getElementById('csPanel').classList.remove('open'); document.querySelector('.cs-overlay')?.classList.remove('show'); } }); await sleep(300);
    // cuadrícula
    await page.evaluate(() => cliVista('cuadricula')); await sleep(600);
    await page.locator('#tbCli .cliCard-body').first().locator('.cliCard-nom').click(); await sleep(600); s = await estado(page);
    ok(s.a && s.a.tipo === 'cli' && s.on && !s.ficha, 'Clientes en cuadrícula: también abre el costado', [s.a, s.ficha]);
    if (pc) await page.keyboard.press('Escape'); else await page.locator('#nxCostScrim').click({ position: { x: 20, y: 20 } }); await sleep(400); s = await estado(page);
    ok(!s.a && !s.on && s.act === 0, 'Esc (PC) o tocar el fondo (celular) cierra', [s.a, s.on, s.act]);
    await page.evaluate(() => cliVista('lista'));
    // ── Facturas
    await page.evaluate(() => { nav('facturas', null); }); await sleep(700);
    await page.evaluate(() => { const e = document.getElementById('fFactEstado'); if (e) { e.value = 'atrasadas'; rFact(); } }); await sleep(700); // el mes en curso del servidor de prueba no tiene facturas
    const sel = '#tbFact .sfr-nm, #tbFact td.cli-cell';
    const nF = await page.locator(sel).count();
    const ef = await page.evaluate(sel => { const e = document.querySelectorAll(sel)[0]; const f0 = e.closest('article.sfr-cc, tr'); const fid = f0.querySelector('[onclick*="nxFactMenu("]').getAttribute('onclick').match(/nxFactMenu\('([^']+)'/)[1];
      const f = ST.facturas.find(x => String(x.id) === fid), sal = Number(_saldoFacturasCliente(String(f.cliente_id))[f.id] || 0); return { fid, cid: String(f.cliente_id), nom: f.cliente_nom || (ST.clientes.find(c => String(c.id) === String(f.cliente_id)) || {}).nom, bal: fmt(sal), tot: fmt(Number(f.prima_base || 0) + Number(f.prima_deps || 0)), pill: clasificarFacturaUrgencia(f, sal).pillTxt }; }, sel);
    await page.locator(sel).first().click({ position: { x: 12, y: 10 } }); await sleep(700); s = await estado(page);
    ok(nF > 0 && s.a && s.a.tipo === 'fac' && s.a.id === ef.fid && s.on && !s.ficha, 'Facturas: tocar el nombre abre el costado de ESA factura', [nF, s.a, ef.fid, s.ficha]);
    ok(s.txt.includes(ef.nom) && s.txt.includes(ef.bal) && s.txt.includes(ef.tot) && s.txt.includes(ef.pill), 'Facturas: balance, total y estado iguales a la lista', [ef, s.txt.slice(0, 240)]);
    ok(s.btn.every(h => h >= 44) && !s.cortado && s.sw <= 0, 'Facturas: botones ≥44 px, nada cortado, sin scroll de lado', [Math.min(...s.btn), s.cortado, s.sw]);
    await page.screenshot({ path: OUT + `facturas-${width}.png` });
    await page.locator('#nxCostado [data-c="pdf"]').click(); await sleep(300); s = await estado(page);
    ok(s.ll === 'verFacturaPDF_id:' + ef.fid && !s.a, 'Facturas: «Ver factura» abre la de siempre', s.ll);
    await page.locator(sel).first().click({ position: { x: 12, y: 10 } }); await sleep(500);
    const hayCobrar = await page.locator('#nxCostado [data-c="cobrarF"]').count();
    if (hayCobrar) { await page.locator('#nxCostado [data-c="cobrarF"]').click(); await sleep(300); s = await estado(page); ok(s.ll === 'abrirAbono:' + ef.cid, 'Facturas: «Cobrar» abre el cobro del cliente', s.ll); }
    else { ok(true, 'Facturas: factura anulada, sin «Cobrar» (correcto)'); await page.evaluate(() => __nxCostado.cerrar(true)); }
    // cambiar de pantalla cierra
    await page.locator(sel).first().click({ position: { x: 12, y: 10 } }); await sleep(500);
    await page.evaluate(() => nav('clientes', null)); await sleep(600); s = await estado(page);
    ok(!s.a && !s.on, 'Cambiar de pantalla cierra el panel', [s.a, s.on]);
    ok(escrituras.length === 0, 'Cero escrituras a la base', escrituras);
    ok(errs.length === 0, 'Sin errores de página', errs);
    await ctx.close();
  }
  // capa apagada: todo como antes
  { console.log('\n== 1280px, capa apagada ==');
    const { ctx, page, errs } = await abrir(browser, 1280, true);
    await page.evaluate(() => { nav('clientes', null); cliVista('lista'); }); await sleep(700);
    await page.locator('#tbCli .cli-main').nth(1).locator('.cli-nom').click(); await sleep(700);
    const s = await page.evaluate(() => ({ api: !!window.__nxCostado, panel: !!document.getElementById('nxCostado'), ficha: !!document.querySelector('#csPanel.open') }));
    ok(!s.api && !s.panel && s.ficha, 'Apagada: el nombre abre la ficha completa, como antes', s);
    ok(errs.length === 0, 'Apagada: sin errores', errs); await ctx.close(); }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`); process.exit(fail ? 1 : 0);
})();
