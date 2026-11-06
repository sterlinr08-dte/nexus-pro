// QA 06-nov-2026 — Clientes y ficha del cliente (parches-clientes-ficha.js). Solo vista y avisos; no guarda nada.
// App real contra scripts/qa-crm-mock-server.js (con QA_CLIENTES=30), a 390×844 y 1280×800, y con la capa apagada.
//  · Búsqueda: «martinez ana», «martínez», cédula sin guiones y teléfono con guiones encuentran al cliente.
//  · Cuadrícula: barra legible en oscuro, «Elegir los N de esta página» (marca y desmarca), botones ≥44 y letra ≥13.
//  · Casilla, estrella y «⋮» responden al dedo en un cuadro de 44×44 (prueba con elementFromPoint y un toque real).
//  · Páginas en su propia fila y de 44 px.
//  · Ficha: aviso de cédula repetida y RNC de 9 en 13 px; correo «gmial.com» sugiere y corrige; correo malo avisa;
//    WhatsApp de otro cliente avisa; al editar, su propio WhatsApp no avisa.
//  · Sin errores de página y sin scroll de lado.
// Uso: QA_CLIENTES=30 PORT=8952 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8952 node scripts/qa-clientes-ficha.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8952';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-clientes-ficha')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, apagada) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, userAgent: movil ? UA : undefined, locale: 'es-DO', deviceScaleFactor: movil ? 2 : 1 });
  const page = await ctx.newPage(); const errs = []; const escrituras = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url(), m = r.request().method();
    if (/supabase\.co\//.test(u)) { if (/\/rest\/v1\/clientes/.test(u) && m !== 'GET') escrituras.push(m + ' ' + u); const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(off => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    if (off) localStorage.setItem('nx_clientes_ficha_off', '1'); else localStorage.removeItem('nx_clientes_ficha_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, !!apagada);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(off => typeof ST !== 'undefined' && (ST.clientes || []).length > 20 && (off || window.__nxClientesFicha), !!apagada, { timeout: 30000 });
  await sleep(2000);
  return { ctx, page, errs, escrituras };
}
const buscar = (page, q) => page.evaluate(q => { document.getElementById('cliQ').value = q; rCli(); return [...document.querySelectorAll('#tbCli .cli-nom, #tbCli .cliCard-nom')].map(e => e.textContent.trim()); }, q);
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { w: Math.round(r.width), h: Math.round(r.height), fs: parseFloat(cs.fontSize), t: (e.textContent || '').trim().replace(/\s+/g, ' '), col: cs.color, bg: cs.backgroundColor, hidden: e.hidden, tono: e.dataset ? e.dataset.tono : null }; }, sel);
// Cuadro de 44×44 centrado en el dibujo: las 4 esquinas (2 px adentro) deben caer en el mismo control
const zona44 = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const pts = [[-20, -20], [20, -20], [-20, 20], [20, 20]].map(([dx, dy]) => { const h = document.elementFromPoint(cx + dx, cy + dy); return !!h && (h === e || e.contains(h)); }); return pts; }, sel);
const lum = rgb => { const m = String(rgb).match(/[\d.]+/g); if (!m) return 1; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

(async () => {
  const browser = await chromium.launch();
  for (const width of [390, 1280]) {
    console.log(`\n== ${width}px ==`);
    const { ctx, page, errs, escrituras } = await abrir(browser, width);
    await page.evaluate(() => { nav('clientes', null); cliVista('lista'); });
    await sleep(600);
    // ── 1) Búsqueda
    let r = await buscar(page, 'martinez ana');
    ok(r.length > 0 && r.every(n => /ana martinez/i.test(n)), 'busca «martinez ana» (otro orden) → Ana Martinez', r);
    r = await buscar(page, 'martínez');
    ok(r.length > 0 && r.every(n => /martinez/i.test(n)), 'busca «martínez» (con tilde) → Martinez', r);
    const c0 = await page.evaluate(() => ({ ced: ST.clientes[0].cedula, tel: ST.clientes[0].tel, nom: ST.clientes[0].nom }));
    r = await buscar(page, c0.ced.replace(/\D/g, ''));
    ok(r.some(n => n.toLowerCase().startsWith(c0.nom.toLowerCase())), 'busca la cédula sin guiones', { c0, r });
    const telG = c0.tel.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
    r = await buscar(page, telG);
    ok(r.some(n => n.toLowerCase().startsWith(c0.nom.toLowerCase())), 'busca el teléfono con guiones (' + telG + ')', r);
    r = await buscar(page, 'zzzz no existe');
    ok(r.length === 0, 'una búsqueda sin coincidencias sigue dando «Sin resultados»');
    await buscar(page, '');
    // ── 2) Cuadrícula y barra
    await page.evaluate(() => cliVista('cuadricula')); await sleep(700);
    let bar = await caja(page, '#cliBulkBar');
    const pag = await caja(page, '#cliBulkBar .nxClifPag');
    ok(bar && bar.h > 0 && /Marque clientes/.test(bar.t), 'cuadrícula: la barra se ve con la guía «Marque clientes…»', bar);
    ok(pag && pag.h >= 44 && pag.fs >= 13 && /Elegir los 10 de esta página/.test(pag.t), 'botón «Elegir los 10 de esta página» ≥44 y letra ≥13', pag);
    await page.evaluate(() => document.querySelector('.nxft-tabs').scrollIntoView());
    await page.screenshot({ path: OUT + `cuadricula-vacia-${width}.png` });
    await page.click('#cliBulkBar .nxClifPag'); await sleep(300);
    let sel = await page.evaluate(() => _cliSeleccion.length);
    ok(sel === 10, '«Elegir los de esta página» marca las 10', sel);
    bar = await caja(page, '#cliBulkBar');
    const bq = await caja(page, '#cliBulkBar .bghost:not(.nxClifPag)'), bw = await caja(page, '#cliBulkBar .bc1');
    ok(/10 clientes seleccionados/.test(bar.t) && (await caja(page, '#cliBulkBar .nxClifPag')).h === 0, 'la barra dice «10 clientes seleccionados» y esconde «Elegir…» (no repite «Quitar selección»)', bar.t);
    ok(bq.h >= 44 && bw.h >= 44 && bq.fs >= 13 && bw.fs >= 13, 'Quitar selección y WhatsApp masivo ≥44 y letra ≥13', { bq, bw });
    const oscuro = await page.evaluate(() => document.documentElement.classList.contains('tema-glass-oscuro'));
    if (oscuro) ok(lum(bar.bg) < 0.5 && lum(bq.col) > 0.7 && lum(bw.col) > 0.7, 'tema oscuro: barra oscura y textos claros (se leen)', { bar: bar.bg, q: bq.col, w: bw.col });
    await page.screenshot({ path: OUT + `cuadricula-elegidos-${width}.png` });
    await page.click('#cliBulkBar .bghost:not(.nxClifPag)'); await sleep(300);
    sel = await page.evaluate(() => _cliSeleccion.length);
    ok(sel === 0 && await page.evaluate(() => !document.querySelector('#tbCli .cliCard-chk:checked')), '«Quitar selección» las quita todas', sel);
    // Elegir una a mano y luego «Elegir los 10»: completa la página sin desmarcar la que ya estaba
    await page.evaluate(() => document.querySelector('#tbCli .cliCard-chk').click()); await sleep(150);
    await page.click('#cliBulkBar .nxClifPag'); await sleep(250);
    ok(await page.evaluate(() => _cliSeleccion.length) === 10, 'con 1 marcada, «Elegir los 10» completa la página');
    await page.evaluate(() => cliSelNone()); await sleep(150);
    // ── 3) Toques de 44
    const zc = await zona44(page, '#tbCli .cliCard-chk'), zs = await zona44(page, '#tbCli .cliCard-star'), zm = await zona44(page, '#tbCli .cliCard-more');
    ok(zc && zc.every(Boolean), 'casilla: responde en 44×44', zc);
    ok(zs && zs.every(Boolean), 'estrella: responde en 44×44', zs);
    ok(zm && zm.every(Boolean), '«⋮»: responde en 44×44', zm);
    const p = await page.evaluate(() => { const e = document.querySelector('#tbCli .cliCard-chk'); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2 + 19, y: r.top + r.height / 2 + 19 }; });
    if (width < 500) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
    await sleep(250);
    sel = await page.evaluate(() => _cliSeleccion.length);
    ok(sel === 1, 'un toque en el borde de la zona marca al cliente (no abre la ficha)', { sel, ficha: await page.evaluate(() => document.querySelector('#v-cliente360.active,.overlay.open') ? 'abierta' : 'no') });
    await page.evaluate(() => cliSelNone());
    const pb = await page.evaluate(() => [...document.querySelectorAll('#tbCli .nxpag-btn')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(pb.length >= 3 && pb.every(([w, h]) => w >= 44 && h >= 44), 'páginas: botones de 44×44', pb);
    const fila = await page.evaluate(() => { const tb = document.getElementById('tbCli'), f = [...tb.children].find(x => !x.classList.contains('cliCard')); return f ? Math.round(f.getBoundingClientRect().width) / Math.round(tb.getBoundingClientRect().width) : 0; });
    ok(fila > 0.9, 'páginas en su propia fila (ancho completo)', fila);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll de lado (cuadrícula)');
    // Lista: la barra no aparece
    await page.evaluate(() => cliVista('lista')); await sleep(400);
    ok(await page.evaluate(() => !document.getElementById('cliBulkBar').classList.contains('show')), 'en Lista la barra de selección no aparece');
    // ── 4) Ficha nueva: avisos al momento
    await page.evaluate(() => abrirNuevoCli()); await sleep(900);
    await page.fill('#cCed', c0.ced.replace(/\D/g, '')); await page.locator('#cCed').blur(); await sleep(200);
    let av = await caja(page, '#nx-cedula-aviso');
    ok(av && av.tono === 'err' && /ya es de/i.test(av.t) && av.fs >= 13, 'cédula repetida: aviso rojo en 13 px con el nombre', av);
    await page.fill('#cCed', '123456789'); await sleep(200);
    av = await caja(page, '#nx-cedula-aviso');
    ok(av && /RNC de 9 dígitos/.test(av.t), 'RNC de 9 dígitos: no dice «9/11»', av);
    await page.fill('#cCed', '');
    await page.fill('#cEmail', 'ana@gmial.com'); await page.locator('#cEmail').blur(); await sleep(150);
    av = await caja(page, '#nxClifCorreo');
    ok(av && !av.hidden && /gmail\.com/.test(av.t), 'correo «gmial.com»: «¿Quiso decir ana@gmail.com?»', av);
    const usar = await caja(page, '#nxClifCorreo button');
    ok(usar && usar.h >= 44 && usar.fs >= 13, 'botón «Usar …» ≥44 y letra ≥13', usar);
    await page.screenshot({ path: OUT + `ficha-correo-${width}.png` });
    await page.click('#nxClifCorreo button'); await sleep(100);
    ok(await page.inputValue('#cEmail') === 'ana@gmail.com' && (await caja(page, '#nxClifCorreo')).hidden, '«Usar» corrige el correo y quita el aviso');
    await page.fill('#cEmail', 'ana@'); await page.locator('#cEmail').blur(); await sleep(150);
    av = await caja(page, '#nxClifCorreo');
    ok(av && !av.hidden && av.tono === 'err' && /Revise el correo/.test(av.t), 'correo incompleto: avisa al salir del campo', av);
    await page.fill('#cEmail', 'ana@correo.com'); await sleep(100);
    ok((await caja(page, '#nxClifCorreo')).hidden, 'al corregirlo, el aviso se va solo');
    await page.fill('#cWA', c0.tel); await page.locator('#cWA').blur(); await sleep(200);
    av = await caja(page, '#nxClifWa');
    ok(av && !av.hidden && av.t.toLowerCase().includes(c0.nom.toLowerCase()), 'WhatsApp de otro cliente: avisa con su nombre', av);
    await page.screenshot({ path: OUT + `ficha-avisos-${width}.png` });
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sin scroll de lado (ficha)');
    await page.evaluate(() => { try { nxCliMarcarLimpio(); } catch (e) {} closeM('mCli'); }); await sleep(300);
    // Editar a ese mismo cliente: su propio WhatsApp no avisa y no quedan avisos de la ficha anterior
    await page.evaluate(() => editarCli(ST.clientes[0].id)); await sleep(900);
    const ant = await caja(page, '#nxClifWa'), antC = await caja(page, '#nxClifCorreo');
    ok((!ant || ant.hidden) && (!antC || antC.hidden), 'al abrir otra ficha no quedan avisos viejos');
    await page.locator('#cWA').focus(); await page.locator('#cWA').blur(); await sleep(200);
    av = await caja(page, '#nxClifWa');
    ok(!av || av.hidden, 'al editar, su propio WhatsApp no avisa', av);
    ok(escrituras.length === 0, 'no se guardó nada en clientes', escrituras);
    ok(!errs.length, 'sin errores de página', errs);
    await ctx.close();
  }
  // ── Capa apagada: todo como antes y sin errores
  console.log('\n== apagada (nx_clientes_ficha_off=1) ==');
  {
    const { ctx, page, errs } = await abrir(browser, 390, true);
    ok(await page.evaluate(() => !window.__nxClientesFicha && !window.nxCliCoincide && !document.getElementById('nxClientesFicha')), 'la capa no se carga');
    await page.evaluate(() => { nav('clientes', null); cliVista('lista'); }); await sleep(500);
    const r = await buscar(page, 'ana martinez');
    ok(r.length > 0, 'la búsqueda de siempre funciona', r);
    await page.evaluate(() => cliVista('cuadricula')); await sleep(400);
    ok(await page.evaluate(() => !document.getElementById('cliBulkBar').classList.contains('show')), 'sin marcar, la barra queda oculta como antes');
    ok(!errs.length, 'sin errores de página', errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
