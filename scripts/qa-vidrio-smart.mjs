// QA de la luz de vidrio smart (59.05, 02-oct-2026): parches-vidrio-global.js con la app real y la REST simulada.
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-vidrio-smart.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942', OUT = process.env.QA_OUT || require('os').tmpdir();
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { res.resume(); res.on('end', r); }).on('error', r));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
async function abrir(b, w, video) {
  const o = { viewport: { width: w, height: w < 500 ? 844 : 720 }, hasTouch: w < 500, isMobile: w < 500 };
  if (video) o.recordVideo = { dir: OUT, size: { width: w, height: o.viewport.height } };
  const ctx = await b.newContext(o); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(() => { localStorage.setItem('nx_auth_mode', 'legacy'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4500);
  await page.evaluate(() => { window.__clases = []; const mo = new MutationObserver(ms => ms.forEach(m => { if (m.target.classList && m.target.classList.contains('nx-vidrio')) { window.__clases.push(m.target.className); if (m.oldValue) window.__clases.push(m.oldValue); } })); mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'], attributeOldValue: true }); });
  return { ctx, page, errs };
}
const centro = bb => [bb.x + bb.width / 2, bb.y + bb.height / 2];
const cls = (p) => p.evaluate(() => { const c = document.querySelector('.nx-vidrio'); return c ? c.className : ''; });
const reset = (p) => p.evaluate(() => { window.__clases = []; });
const vio = (p, k) => p.evaluate(k => window.__clases.some(c => c.split(' ').includes(k)), k);
(async () => {
  await qa('tema/none');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const { ctx, page, errs } = await abrir(b, 1280, true);
  const sb = await (await page.$('nav#sbEl')).boundingBox();
  await page.mouse.move(sbb(sb).x, sbb(sb).y); function sbb(x) { return { x: x.x + x.width / 2, y: x.y + 170 }; }
  await page.waitForTimeout(700);
  const nis = []; for (const h of await page.$$('nav#sbEl .ni')) { if (await h.isVisible()) { const bb = await h.boundingBox(); if (bb && bb.y < 690) nis.push({ h, bb }); } }
  // 1) Lo activo: luz suave
  const on = nis.find(x => 0); const act = await page.$('nav#sbEl .ni.on');
  if (act) { await page.mouse.move(...centro(await act.boundingBox()), { steps: 8 }); await page.waitForTimeout(500); ok(/\bactual\b/.test(await cls(page)), 'ítem activo del menú: luz suave (actual)', await cls(page)); }
  // 2) Deslizar entre vecinos (sin «sin»)
  await reset(page);
  for (const x of nis.slice(1, 5)) { await page.mouse.move(...centro(x.bb), { steps: 8 }); await page.waitForTimeout(250); }
  ok(!(await vio(page, 'sin')), 'entre ítems vecinos del menú se desliza (no reaparece)');
  // 3) Saltar lejos: aparece sin cruzar la pantalla
  const lejos = []; for (const h of await page.$$('#cnt button, #cnt [role="button"]')) { if (await h.isVisible()) { const bb = await h.boundingBox(); if (bb && bb.height <= 120 && bb.x > 700 && bb.y > 100 && bb.y < 680) lejos.push(bb); } }
  await reset(page);
  if (lejos[0]) { await page.mouse.move(...centro(lejos[0]), { steps: 3 }); await page.waitForTimeout(300); ok(await vio(page, 'sin'), 'salto a otra zona: aparece ahí (no cruza la pantalla)'); }
  // 4) Imán: brillo sigue al puntero dentro del control
  if (lejos[0]) {
    const bb = lejos[0];
    await page.mouse.move(bb.x + bb.width * 0.15, bb.y + bb.height / 2); await page.waitForTimeout(250);
    const m1 = await page.evaluate(() => getComputedStyle(document.querySelector('.nx-vidrio')).getPropertyValue('--v-mx'));
    await page.mouse.move(bb.x + bb.width * 0.85, bb.y + bb.height / 2, { steps: 5 }); await page.waitForTimeout(250);
    const m2 = await page.evaluate(() => getComputedStyle(document.querySelector('.nx-vidrio')).getPropertyValue('--v-mx'));
    ok(parseFloat(m1) < 40 && parseFloat(m2) > 60, `imán: el brillo sigue al puntero (${m1.trim()} → ${m2.trim()})`);
  }
  // 5) Botón de color: toma su color (en el CRM hay botones azules)
  await page.evaluate(() => { try { nav('crm', null); } catch (e) {} }); await page.waitForTimeout(1500);
  const azules = await page.$$eval('button, [role="button"], .btn', els => els.filter(e => { const r = e.getBoundingClientRect(); if (r.width < 14 || r.height < 14 || r.height > 120 || r.top < 60 || r.bottom > 700 || e.closest('.tnav')) return false; const cs = getComputedStyle(e); let c = cs.backgroundColor.match(/[\d.]+/g); if (!c || (c[3] !== undefined && +c[3] < .35)) c = (cs.backgroundImage.match(/rgba?\([^)]*\)/) || [''])[0].match(/[\d.]+/g); if (!c) return false; const [R, G, B, A = 1] = c.map(Number); return A > .35 && Math.max(R, G, B) - Math.min(R, G, B) > 60; }).map(e => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
  if (azules[0]) { await page.mouse.move(...azules[0], { steps: 6 }); await page.waitForTimeout(400); ok(/\btinte\b/.test(await cls(page)), 'botón de color: la luz toma su color'); } else ok(false, 'no encontré botón de color para probar');
  // 6) Clic: onda + se hunde
  await reset(page);
  if (azules[0]) { await page.mouse.move(azules[0][0] + 3, azules[0][1], { steps: 4 }); await page.waitForTimeout(300); await page.mouse.down(); await page.waitForTimeout(60); ok(await vio(page, 'press') && await vio(page, 'onda'), 'clic: onda desde el punto + se hunde'); await page.mouse.up(); await page.waitForTimeout(400); }
  // 7) Desplazarse: se aparta y vuelve
  await reset(page);
  await page.mouse.move(640, 400); await page.evaluate(() => { const e = [...document.querySelectorAll('#cnt, #cnt *')].find(x => x.scrollHeight > x.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(x).overflowY)) || document.scrollingElement; e.scrollBy(0, 200); }); await page.waitForTimeout(60);
  const q1 = await vio(page, 'quieto'); await page.waitForTimeout(400); const q2 = /\bquieto\b/.test(await cls(page));
  ok(q1 && !q2, 'al desplazar se aparta y vuelve al quedarse quieto');
  // 8) Escribir: se aparta
  await reset(page);
  if (lejos[0]) await page.mouse.move(...centro(lejos[0]), { steps: 3 });
  await page.waitForTimeout(300); await page.keyboard.press('a'); await page.waitForTimeout(80);
  ok(/\bquieto\b/.test(await cls(page)), 'al escribir la luz se aparta');
  // 9) Teclado (Tab): acompaña al control enfocado
  await page.mouse.move(640, 700);
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(250); }
  const foco = await page.evaluate(() => { const c = document.querySelector('.nx-vidrio'), a = document.activeElement; if (!c || !a) return null; const r = a.getBoundingClientRect(); const t = getComputedStyle(c).getPropertyValue('--v-x'); return { on: c.classList.contains('on'), dx: Math.abs(parseFloat(t) - r.left), tag: a.tagName }; });
  ok(foco && foco.on && foco.dx < 2, 'teclado (Tab): la luz acompaña al control enfocado', foco);
  ok(await page.evaluate(() => document.querySelectorAll('.nx-vidrio').length) === 1, 'una sola capa de luz');
  ok(errs.length === 0, 'sin errores (PC)', errs);
  const v = page.video(); await ctx.close(); fs.renameSync(await v.path(), OUT + '/vidrio-smart.webm');
  // iPhone
  const M = await abrir(b, 390, false);
  const t = []; for (const h of await M.page.$$('#cnt button, #cnt [role="button"]')) { if (await h.isVisible()) { const bb = await h.boundingBox(); if (bb && bb.height <= 120 && bb.y > 80 && bb.y < 760) t.push(bb); } }
  if (t[0]) { await M.page.touchscreen.tap(...centro(t[0])); await M.page.waitForTimeout(60); ok(await vio(M.page, 'flash') && await vio(M.page, 'onda'), 'iPhone: destello con onda al tocar'); }
  ok(M.errs.length === 0, 'sin errores (iPhone)', M.errs);
  await M.ctx.close(); await b.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`);
})();
