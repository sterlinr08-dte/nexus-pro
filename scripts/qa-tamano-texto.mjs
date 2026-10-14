// QA 59.28 «Tamaño de los textos» (parches-tamano-texto.js): Configuración → Apariencia, cuadros y listas por usuario.
//  A. Con «Normal» no se toca nada (ningún estilo en línea).
//  B. La tarjeta aparece en Apariencia con los 4 tamaños de cada grupo y la vista previa cambia.
//  C. Cuadros «Grande»: los números del Inicio crecen 15 % y no se cortan; los títulos de tarjeta también.
//  D. Listas «Extra grande»: las filas de Cobros crecen 30 %, sin desborde horizontal; los botones NO cambian.
//  E. Se guarda en la base (usuario_preferencias) y al recargar vuelve; una pantalla nueva sale ya ajustada.
//  F. Menú, barra de arriba y botones no cambian. Volver a «Normal» quita todo. Sin errores.
// Uso: PORT=8964 node scripts/qa-crm-mock-server.js &   PORT=8964 QA_OUT=/ruta node scripts/qa-tamano-texto.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8964);
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-tamano-texto')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function abrir(browser, movil, ctxPrevio) {
  const iph = devices['iPhone 13'];
  const ctx = ctxPrevio || await browser.newContext(movil
    ? { ...iph, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/\/rest\/v1\/rpc\//.test(u) || /\/functions\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    if (/whatsapp_hil/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  if (!ctxPrevio) await ctx.addInitScript(() => {
    localStorage.setItem('nx_tema', 'glass-oscuro'); localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    window.supabase = { createClient() { return { realtime: { setAuth: async () => {} }, channel() { const ch = { on() { return ch; }, subscribe(cb) { setTimeout(() => cb('CHANNEL_ERROR'), 150); return ch; } }; return ch; } }; } };
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 30000 });
  await page.waitForFunction(() => !!window.nxTamanoTexto, null, { timeout: 15000 });
  await sleep(600);
  return { ctx, page, errs };
}
const tam = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; }, sel);
const enLinea = page => page.evaluate(() => [...document.querySelectorAll('#cnt [style*="font-size"][data-nx-txt]')].length);
const irInicio = page => page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('dashboard', null); });
const irCobros = page => page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('facturas', null); setTimeout(() => switchTab('cob'), 250); });
const irApariencia = page => page.evaluate(() => { try { closeMobSB(); } catch (e) {} navConfig(12, null); });

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const movil of [true, false]) {
    const tag = movil ? '390' : '1280';
    await fetch(BASE + '/__qa/tema/glass-oscuro');
    const { ctx, page, errs } = await abrir(browser, movil);
    // A
    await irInicio(page); await sleep(900);
    const kv0 = await tam(page, '.nxIG-kv'), ct0 = await tam(page, '#v-dashboard .nc .ct');
    ok((await enLinea(page)) === 0, `${tag} A: con «Normal» no hay ningún tamaño en línea`);
    await irCobros(page); await sleep(1200);
    const nm0 = await tam(page, '#tbCob .cfNm'), btn0 = await tam(page, '#tbCob .cfCobrar');
    const nav0 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#pttl') || document.body).fontSize));
    ok(nm0 > 0 && kv0 > 0, `${tag} A: medidas base (Inicio ${kv0}px, fila Cobros ${nm0}px)`, { kv0, nm0, ct0, btn0 });
    // B
    await irApariencia(page); await sleep(900);
    const card = await page.evaluate(() => { const c = document.getElementById('nxTxtCard'); return c ? { seg: c.querySelectorAll('.nxTxtSeg').length, btn: c.querySelectorAll('.nxTxtSeg button').length, on: [...c.querySelectorAll('button.on')].map(b => b.dataset.g + ':' + b.dataset.t) } : null; });
    ok(card && card.seg === 2 && card.btn === 8 && card.on.join() === 'c:normal,l:normal', `${tag} B: la tarjeta «Tamaño de los textos» está en Apariencia con 4 tamaños por grupo`, card);
    const pk0 = await tam(page, '#nxTxtPrev .pk');
    await page.click('#nxTxtCard button[data-g="c"][data-t="grande"]');
    await page.click('#nxTxtCard button[data-g="l"][data-t="xl"]'); await sleep(300);
    const pk1 = await tam(page, '#nxTxtPrev .pk'), rn1 = await tam(page, '#nxTxtPrev .rn');
    ok(Math.abs(pk1 - pk0 * 1.15) < 0.3 && Math.abs(rn1 - 14 * 1.3) < 0.3, `${tag} B: la vista previa cambia al tocar`, { pk0, pk1, rn1 });
    await page.screenshot({ path: OUT + tag + '-B-apariencia.png' });
    // C
    await irInicio(page); await sleep(900);
    const kv1 = await tam(page, '.nxIG-kv'), ct1 = await tam(page, '#v-dashboard .nc .ct');
    const corte = await page.evaluate(() => [...document.querySelectorAll('.nxIG-kv')].filter(e => e.scrollHeight > e.clientHeight + 1).length);
    ok(Math.abs(kv1 - kv0 * 1.15) < 0.4, `${tag} C: número del Inicio ${kv0}→${kv1}px (+15 %)`, { kv0, kv1 });
    ok(!ct0 || Math.abs(ct1 - ct0 * 1.15) < 0.4, `${tag} C: título de tarjeta también crece`, { ct0, ct1 });
    ok(corte === 0, `${tag} C: ningún número del Inicio queda cortado`, corte);
    await page.screenshot({ path: OUT + tag + '-C-inicio-grande.png' });
    // D
    await irCobros(page); await sleep(1300);
    const nm1 = await tam(page, '#tbCob .cfNm'), btn1 = await tam(page, '#tbCob .cfCobrar');
    const desb = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(Math.abs(nm1 - nm0 * 1.3) < 0.4, `${tag} D: nombre en la fila de Cobros ${nm0}→${nm1}px (+30 %)`, { nm0, nm1 });
    ok(btn1 === btn0, `${tag} D: el botón «Cobrar» no cambia`, { btn0, btn1 });
    ok(desb <= 1, `${tag} D: sin desborde horizontal`, desb);
    await page.screenshot({ path: OUT + tag + '-D-cobros-xl.png' });
    // F (menú/cabecera)
    const nav1 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#pttl') || document.body).fontSize));
    ok(nav1 === nav0, `${tag} F: la barra de arriba no cambia`, { nav0, nav1 });
    // E guardado y recarga
    await sleep(1500);
    const prefs = await (await fetch(BASE + '/__qa/prefs')).json();
    const mio = (prefs.find(p => p.usuario_id === '00000000-0000-4000-8000-000000000001') || {}).datos || {};
    ok(mio.texto_cuadros === 'grande' && mio.texto_listas === 'xl', `${tag} E: se guardó en la base`, mio);
    const p2 = await ctx.newPage(); const errs2 = [];
    p2.on('pageerror', e => errs2.push(e.message));
    await page.close();
    const r2 = await abrir(browser, movil, ctx);
    await irCobros(r2.page);
    await r2.page.waitForFunction(() => !!document.querySelector('#tbCob .cfNm'), null, { timeout: 8000 });
    const nm2 = await tam(r2.page, '#tbCob .cfNm');
    ok(Math.abs(nm2 - nm0 * 1.3) < 0.4, `${tag} E: al recargar, Cobros sale ya en Extra grande (${nm2}px)`, { nm2 });
    // F volver a normal
    await irApariencia(r2.page); await sleep(800);
    await r2.page.click('#nxTxtCard button[data-g="c"][data-t="normal"]'); await r2.page.click('#nxTxtCard button[data-g="l"][data-t="normal"]'); await sleep(300);
    await irCobros(r2.page); await sleep(1200);
    const nm3 = await tam(r2.page, '#tbCob .cfNm');
    ok(Math.abs(nm3 - nm0) < 0.2 && (await enLinea(r2.page)) === 0, `${tag} F: «Normal» deja todo como estaba`, { nm3, nm0 });
    ok(!errs.length && !r2.errs.length, `${tag} F: sin errores en la consola`, errs.concat(r2.errs));
    await p2.close(); await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
