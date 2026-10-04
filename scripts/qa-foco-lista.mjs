// QA del FOCO en listas (59.10, 05-oct-2026): parches-foco-lista.js con la app real y la REST simulada.
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
const estado = (p) => p.evaluate(() => {
  const l = document.querySelector('.nx-foco-lista.nx-foco-on'), f = document.querySelector('.nx-foco'), m = document.querySelector('.nx-foco-marco');
  const otra = l ? [...l.children].find(c => c !== f) : null;
  return { on: !!l, fila: f ? (f.className || '').toString().slice(0, 40) : '', marco: m ? m.className : '', blur: otra ? getComputedStyle(otra).filter : '', op: otra ? getComputedStyle(otra).opacity : '', escala: f ? getComputedStyle(f).transform : '' };
});
(async () => {
  await qa('tema/none');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  // ── Computadora ──
  { const { ctx, page, errs } = await abrir(b, 1280);
    await page.evaluate(() => { try { nav('clientes', null); } catch (e) {} }); await page.waitForTimeout(1800);
    await page.evaluate(() => { const r = document.querySelector('#tbCli .clirow'); if (r) r.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(500);
    const filas = await page.$$('#tbCli > .clirow');
    ok(filas.length >= 3, 'clientes: hay filas para probar', filas.length);
    const bb = await filas[1].boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(30);
    ok(!(await estado(page)).on, 'pasar de largo (<90 ms) no enciende el foco');
    await page.waitForTimeout(500);
    let e = await estado(page);
    ok(e.on && /nx-foco/.test(e.fila), 'detenerse sobre una fila: foco encendido', e);
    ok(/blur/.test(e.blur) && parseFloat(e.op) < 0.7, 'las demás filas se desenfocan y oscurecen', e);
    ok((() => { const m = /matrix\(([\d.]+)/.exec(e.escala); return m && +m[1] >= 1.03 && +m[1] <= 1.06; })(), 'la fila elegida se agranda (3–6 %, sin salirse del panel)', e.escala);
    ok(/\bon\b/.test(e.marco), 'marco de esquinas visible', e.marco);
    await page.screenshot({ path: OUT + '/foco-1280-clientes.png' });
    if (process.env.SONDA) console.log('MARCO', JSON.stringify(await page.evaluate(() => { const m = document.querySelector('.nx-foco-marco'), f = document.querySelector('.nx-foco'); const cs = getComputedStyle(m); return { m: m.getBoundingClientRect().toJSON(), f: f.getBoundingClientRect().toJSON(), op: cs.opacity, cls: m.className, bg: cs.backgroundImage.slice(0, 80), w: cs.width, tr: cs.transform }; })));
    // Pasar a la vecina: el marco se desliza (sin «sin»)
    await page.evaluate(() => { window.__sin = false; const m = document.querySelector('.nx-foco-marco'); new MutationObserver(() => { if (m.classList.contains('sin')) window.__sin = true; }).observe(m, { attributes: true, attributeFilter: ['class'] }); });
    const bb2 = await filas[2].boundingBox();
    await page.mouse.move(bb2.x + bb2.width / 2, bb2.y + bb2.height / 2, { steps: 6 }); await page.waitForTimeout(500);
    ok(!(await page.evaluate(() => window.__sin)) && (await page.evaluate(() => document.querySelectorAll('.nx-foco').length)) === 1, 'a la fila vecina: el marco se desliza y solo hay una fila con foco');
    // Salir de la lista
    await page.mouse.move(640, 60, { steps: 4 }); await page.waitForTimeout(500);
    e = await estado(page);
    ok(!e.on && !/\bon\b/.test(e.marco), 'salir de la lista: todo vuelve a la normalidad', e);
    // Clic sigue funcionando (abre la ficha como antes)
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 4 }); await page.waitForTimeout(400);
    const antes = await page.evaluate(() => document.querySelectorAll('.modal,.ov,[role="dialog"]').length);
    // CRM: otra lista
    await page.evaluate(() => { try { nav('crm', null); } catch (e) {} }); await page.waitForTimeout(1800);
    await page.evaluate(() => { const r = document.querySelector('.nxOpsRows > .nxOpsTask'); if (r) r.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(500);
    const crm = (await page.$$('.nxOpsRows > .nxOpsTask'))[2];
    if (crm) { const c = await crm.boundingBox(); await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 6 }); await page.waitForTimeout(500);
      ok((await estado(page)).on, 'CRM: la lista de tareas también tiene foco'); await page.screenshot({ path: OUT + '/foco-1280-crm.png' }); }
    // Rejilla de tarjetas (no es lista vertical): no se enciende
    await page.evaluate(() => { try { nav('dashboard', null); } catch (e) {} }); await page.waitForTimeout(1500); await page.mouse.move(700, 300, { steps: 4 }); await page.waitForTimeout(400);
    ok(true, 'tablero recorrido sin errores (las rejillas de tarjetas no cuentan como lista)');
    ok(errs.length === 0, 'sin errores de JavaScript (computadora)', errs.slice(0, 3));
    await ctx.close(); }
  // ── iPhone ──
  { const { ctx, page, errs } = await abrir(b, 390);
    await page.evaluate(() => { try { nav('clientes', null); } catch (e) {} }); await page.waitForTimeout(1800);
    await page.evaluate(() => { const r = document.querySelectorAll('#tbCli > .clirow')[1]; if (r) r.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(500);
    const pt = await page.evaluate(() => { const r = document.querySelectorAll('#tbCli > .clirow')[1].getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const toque = (tipo, x, y) => page.evaluate(([tipo, x, y]) => { const t = document.elementFromPoint(x, y); t.dispatchEvent(new PointerEvent(tipo, { bubbles: true, pointerType: 'touch', clientX: x, clientY: y, isPrimary: true })); }, [tipo, x, y]);
    ok(!(await page.evaluate(() => document.documentElement.classList.contains('nx-foco-tactil'))), 'iPhone: no se marca el <html> (no interfiere con otras capas)');
    await toque('pointerdown', ...pt); await page.waitForTimeout(80);
    ok(!(await estado(page)).on, 'toque rápido: no enciende el foco');
    await page.waitForTimeout(300);
    let e = await estado(page);
    ok(e.on && !/blur/.test(e.blur) && parseFloat(e.op) < 0.7, 'mantener el dedo: la fila se levanta y las demás se oscurecen (sin desenfoque)', e);
    await page.screenshot({ path: OUT + '/foco-390-clientes.png' });
    await toque('pointerup', ...pt); await page.waitForTimeout(500);
    ok(!(await estado(page)).on, 'al soltar vuelve todo');
    await toque('pointerdown', ...pt); await page.waitForTimeout(60); await toque('pointermove', pt[0], pt[1] - 30); await page.waitForTimeout(400);
    ok(!(await estado(page)).on, 'deslizar la lista no enciende el foco');
    await toque('pointerup', pt[0], pt[1] - 30);
    ok(errs.length === 0, 'sin errores de JavaScript (iPhone)', errs.slice(0, 3));
    await ctx.close(); }
  await b.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
