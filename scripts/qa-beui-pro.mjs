// QA de la capa 59.24 «detalles pro» (ideas de beUI, dueño 14-oct-2026): parches-beui-pro.js.
//  · Cobros: las cifras del resumen ruedan desde 0 hasta su valor, terminan EXACTAS y no vuelven a rodar si la app
//    repinta el mismo valor; si el valor cambia, ruedan desde el anterior.
//  · Formulario de préstamo (nxPrestamoNuevo): barra de pasos fija arriba, marca el paso activo, salta a la sección,
//    y el paso «Resumen» queda apagado mientras está oculto.
//  · Cliente 360 en el celular: 3 acciones + «Más»; «Más» despliega el resto; en 1280 todo sigue como antes.
//  · Con «reducir movimiento» las cifras no ruedan. Sin errores de página.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8942 QA_OUT=/ruta node scripts/qa-beui-pro.mjs
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
  return { ctx, page, errs };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function cobros(page, tag) {
  // muestrear el texto de la 2.ª cifra («Deuda total») mientras rueda
  const muestras = await page.evaluate(async () => {
    nav('facturas', null); await new Promise(r => setTimeout(r, 300));
    const out = []; const t0 = performance.now();
    switchTab('cob');
    while (performance.now() - t0 < 1600) { const v = document.querySelectorAll('#cobResumen .sf-kpi .v')[1]; if (v) out.push(v.textContent); await new Promise(r => requestAnimationFrame(r)); }
    return out;
  });
  const fin = muestras[muestras.length - 1], distintos = [...new Set(muestras)];
  ok(distintos.length >= 4, `${tag} Cobros: «Deuda total» rueda (${distintos.length} valores distintos)`, distintos.slice(0, 6));
  const esperado = await page.evaluate(() => { const v = document.querySelectorAll('#cobResumen .sf-kpi .v')[1]; return v ? v.textContent : null; });
  ok(fin === esperado && /\d/.test(fin), `${tag} Cobros: termina exacto (${fin})`);
  // repintar con el mismo valor: no vuelve a rodar
  const rep = await page.evaluate(async () => { rCob(); const out = []; for (let i = 0; i < 30; i++) { const v = document.querySelectorAll('#cobResumen .sf-kpi .v')[1]; out.push(v && v.textContent); await new Promise(r => requestAnimationFrame(r)); } return [...new Set(out)]; });
  ok(rep.length === 1 && rep[0] === fin, `${tag} Cobros: repintar el mismo valor no lo hace rodar otra vez`, rep);
  await page.screenshot({ path: OUT + `/beui-${tag}-cobros.png` });
}
async function prestamo(page, tag, movil) {
  await page.evaluate(() => window.nxPrestamoNuevo && window.nxPrestamoNuevo()); await sleep(900);
  const m = await page.evaluate(() => {
    const bar = document.querySelector('#nxPrModal .nxBePasos'); if (!bar) return null;
    const bs = [...bar.querySelectorAll('button[data-i]')];
    const r = bar.getBoundingClientRect();
    return { n: bs.length, on: bs.findIndex(b => b.classList.contains('on')), dis: bs.filter(b => b.disabled).map(b => b.textContent.trim()), w: r.width, vw: innerWidth, top: Math.round(r.top) };
  });
  ok(m && m.n >= 4, `${tag} Préstamo: barra de pasos con ${m && m.n} secciones`, m);
  ok(m && m.on === 0, `${tag} Préstamo: arranca en el paso 1`, m);
  ok(m && m.dis.some(t => /Resumen/i.test(t)), `${tag} Préstamo: «Resumen» apagado mientras está oculto`, m);
  ok(m && m.w <= m.vw, `${tag} Préstamo: la barra cabe en la pantalla`, m);
  await page.screenshot({ path: OUT + `/beui-${tag}-prestamo-1.png` });
  await page.evaluate(() => { const b = [...document.querySelectorAll('#nxPrModal .nxBePasos button[data-i]')].filter(b => !b.disabled).pop(); b && b.click(); }); await sleep(1600);
  const m2 = await page.evaluate(() => { const bar = document.querySelector('#nxPrModal .nxBePasos'); const bs = [...bar.querySelectorAll('button[data-i]')]; const r = bar.getBoundingClientRect(); const sc = bar.parentElement; return { on: bs.findIndex(b => b.classList.contains('on')), last: bs.map((b, i) => b.disabled ? -1 : i).filter(i => i >= 0).pop(), pegada: Math.abs(r.top - sc.getBoundingClientRect().top) < 4, opaco: (/rgba\(.*,\s*(0\.9\d*|1)\)|rgb\(/.test(getComputedStyle(bar).backgroundColor)), scroll: sc.scrollTop }; });
  ok(m2.on === m2.last && m2.scroll > 100, `${tag} Préstamo: tocar el último paso baja hasta él y lo marca`, m2);
  ok(m2.pegada && m2.opaco, `${tag} Préstamo: la barra se queda fija arriba al bajar, con fondo que tapa lo de atrás`, m2);
  await page.screenshot({ path: OUT + `/beui-${tag}-prestamo-2.png` });
  await page.evaluate(() => { try { document.getElementById('nxPrModal').remove(); } catch (e) {} });
}
async function c360(page, tag, movil) {
  const id = await page.evaluate(() => { const c = (ST.clientes || []).find(x => x.tel) || ST.clientes[0]; nav('cliente360', null); nxC360Abrir(c.id); return c.id; }); await sleep(1300);
  const a = await page.evaluate(() => {
    const box = document.querySelector('#v-cliente360 .sf-actions'); if (!box) return null;
    const vis = [...box.querySelectorAll('.sf-btn')].filter(b => b.offsetParent).map(b => b.textContent.trim());
    return { vis, total: box.querySelectorAll('.sf-btn:not(.nxBeMasBtn)').length, mas: !!box.querySelector('.nxBeMasBtn') };
  });
  if (movil) {
    ok(a && a.mas && a.vis.length === 4 && /Más/.test(a.vis[3]), `${tag} Ficha: 3 acciones + «Más» (${a && a.vis.join(' | ')})`, a);
    await page.screenshot({ path: OUT + `/beui-${tag}-ficha-cerrada.png` });
    await page.click('#v-cliente360 .nxBeMasBtn'); await sleep(600);
    const b = await page.evaluate(() => { const box = document.querySelector('#v-cliente360 .sf-actions'); return { vis: [...box.querySelectorAll('.sf-btn:not(.nxBeMasBtn)')].filter(b => b.offsetParent).length, exp: box.querySelector('.nxBeMasBtn').getAttribute('aria-expanded'), anchoOk: [...box.querySelectorAll('.sf-btn')].every(x => x.getBoundingClientRect().right <= innerWidth + 1) }; });
    ok(b.vis === a.total && b.exp === 'true' && b.anchoOk, `${tag} Ficha: «Más» despliega las ${a.total} acciones dentro de la pantalla`, b);
    await page.screenshot({ path: OUT + `/beui-${tag}-ficha-abierta.png` });
  } else {
    ok(a && !a.mas && a.vis.length === a.total, `${tag} Ficha: en computadora todas las acciones a la vista, sin «Más»`, a);
  }
}
(async () => {
  const b = await chromium.launch();
  for (const [w, tema] of [[390, 'glass-oscuro'], [430, 'glass-oscuro'], [390, 'clasico'], [1280, 'glass-oscuro']]) {
    const tag = w + ' ' + tema; const movil = w < 500;
    const { ctx, page, errs } = await abrir(b, w, tema);
    await sleep(1200);
    try { await cobros(page, tag); } catch (e) { ok(false, tag + ' Cobros: excepción', e.message); }
    try { await prestamo(page, tag, movil); } catch (e) { ok(false, tag + ' Préstamo: excepción', e.message); }
    try { await c360(page, tag, movil); } catch (e) { ok(false, tag + ' Ficha: excepción', e.message); }
    ok(!errs.some(e => /beui|Bepasos|nxBe/i.test(e)), `${tag}: sin errores de la capa`, errs);
    await ctx.close();
  }
  // reducir movimiento: las cifras no ruedan
  { const { ctx, page } = await abrir(b, 390, 'glass-oscuro'); await page.emulateMedia({ reducedMotion: 'reduce' }); await sleep(800);
    const d = await page.evaluate(async () => { nav('facturas', null); await new Promise(r => setTimeout(r, 300)); const out = []; const t0 = performance.now(); switchTab('cob'); while (performance.now() - t0 < 900) { const v = document.querySelectorAll('#cobResumen .sf-kpi .v')[1]; if (v) out.push(v.textContent); await new Promise(r => requestAnimationFrame(r)); } return [...new Set(out)]; });
    ok(d.length === 1, '390 reducir movimiento: la cifra aparece directa, sin rodar', d); await ctx.close(); }
  console.log(`\n${pass} PASS · ${fail} FAIL`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
