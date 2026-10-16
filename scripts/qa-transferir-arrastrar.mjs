// QA de «Transferir dinero» con billete que se arrastra (59.32, 16-oct-2026).
// Comprueba que arrastrar o tocar un agente solo llena el mismo <select id="nxTA2Hacia"> y que el envío sigue
// pasando por rpc/transferencias_crear con ese destino y el monto escrito. Datos de la REST simulada.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-transferir-arrastrar.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), path = require('path');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942', OUT = process.env.QA_OUT || require('os').tmpdir();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const getJSON = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { r(JSON.parse(d)); } catch (e) { r(null); } }); }).on('error', () => r(null)));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };

async function abrir(b, w, apagado) {
  const movil = w < 500;
  const ctx = await b.newContext(movil ? { viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA } : { viewport: { width: w, height: 800 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript((off) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (off) localStorage.setItem('nxArrastrar', '0'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, !!apagado);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4500);
  await page.evaluate(() => window.nxAbrirTransferenciaAgenteV2());
  await page.waitForTimeout(1200);
  return { ctx, page, errs };
}

async function recorrido(b, w) {
  const et = `[${w}]`;
  const { ctx, page, errs } = await abrir(b, w);
  const n = await page.locator('#nxTAD .tad-ag').count();
  ok(n >= 2, et + ' aparecen los círculos de los agentes', n);

  // Elegir quien entrega (admin): la lista no debe incluirlo
  const desdeId = await page.evaluate(() => { const s = document.getElementById('nxTA2Desde'); const o = Array.from(s.options).find(x => x.value); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return o.value; });
  await page.waitForTimeout(200);
  const ids = await page.$$eval('#nxTAD .tad-ag', els => els.map(e => e.getAttribute('data-id')));
  ok(!ids.includes(desdeId), et + ' quien entrega no aparece como destino');

  // Monto en vivo sobre el billete
  await page.fill('#nxTA2Monto', '2500');
  await page.dispatchEvent('#nxTA2Monto', 'input');
  await page.waitForTimeout(150);
  const billTxt = await page.textContent('#nxTADmonto');
  ok(/2,500/.test(billTxt), et + ' el billete muestra el monto escrito', billTxt);

  // Arrastrar el billete al último agente
  const bill = await page.locator('#nxTADbill').boundingBox();
  const meta = page.locator('#nxTAD .tad-ag').last();
  await meta.scrollIntoViewIfNeeded();
  const destinoId = await meta.getAttribute('data-id');
  const tb = await meta.locator('.tad-av').boundingBox();
  await page.mouse.move(bill.x + bill.width / 2, bill.y + bill.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 14 });
  await page.screenshot({ path: path.join(OUT, `transferir-arrastrando-${w}.png`) });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const sel = await page.$eval('#nxTA2Hacia', s => s.value);
  ok(sel === destinoId, et + ' soltar el billete sobre el agente llena «Recibe»', { sel, destinoId });
  ok(await meta.evaluate(e => e.classList.contains('on')), et + ' el agente elegido queda marcado');
  const foot = await page.textContent('#nxTADfoot');
  ok(/Para/.test(foot) && /2,500/.test(foot), et + ' el pie dice para quién y cuánto', foot);
  await page.screenshot({ path: path.join(OUT, `transferir-elegido-${w}.png`) });

  // Soltar fuera no cambia nada y el billete vuelve
  const b2 = await page.locator('#nxTADbill').boundingBox();
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2); await page.mouse.down();
  await page.mouse.move(b2.x + 20, b2.y + 160, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(400);
  ok((await page.$eval('#nxTA2Hacia', s => s.value)) === destinoId, et + ' soltar fuera no cambia el destino');
  const tr = await page.$eval('#nxTADbill', e => e.style.transform);
  ok(!tr || tr === 'none', et + ' el billete vuelve a su sitio', tr);

  // Tocar otro agente también elige
  const primero = page.locator('#nxTAD .tad-ag').first();
  const primeroId = await primero.getAttribute('data-id');
  await primero.click(); await page.waitForTimeout(300);
  ok((await page.$eval('#nxTA2Hacia', s => s.value)) === primeroId, et + ' tocar el círculo también elige');

  // Cambiar el <select> a mano marca el círculo
  await page.evaluate((id) => { const s = document.getElementById('nxTA2Hacia'); s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); }, destinoId);
  await page.waitForTimeout(150);
  ok(await meta.evaluate(e => e.classList.contains('on')), et + ' elegir en la lista de siempre marca el círculo');

  // Enviar: mismo RPC, mismo destino y monto
  await page.fill('#nxTA2Ref', 'QA-ARR-' + w);
  const antes = ((await getJSON('log')) || []).length;
  await page.click('#nxTA2Btn'); await page.waitForTimeout(900);
  const log = ((await getJSON('log')) || []).slice(antes).filter(x => x.t === 'rpc/transferencias_crear');
  ok(log.length === 1, et + ' se manda una sola vez rpc/transferencias_crear', log.length);
  ok(log[0] && log[0].b.p_hacia_agente === destinoId && Number(log[0].b.p_monto) === 2500 && log[0].b.p_desde_agente === desdeId,
     et + ' con el destino, el monto y el origen elegidos', log[0] && log[0].b);
  ok(!(await page.evaluate(() => document.getElementById('nxModalTransferAgenteV2').classList.contains('open'))), et + ' la ventana se cierra al enviar');
  ok(errs.length === 0, et + ' sin errores en la página', errs);
  await ctx.close();
}

const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
for (const w of [390, 430, 1280]) await recorrido(b, w);
{ const { ctx, page } = await abrir(b, 390, true);
  ok((await page.locator('#nxTAD').count()) === 0, '[390] con nxArrastrar=0 no aparece la franja (interruptor)');
  ok((await page.locator('#nxTA2Hacia').count()) === 1, '[390] con la franja apagada la lista de siempre sigue');
  await ctx.close(); }
await b.close();
console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
