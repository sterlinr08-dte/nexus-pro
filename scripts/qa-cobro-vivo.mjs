// QA de «Hoy, en vivo» (59.21, 11-oct-2026): la gráfica de lo cobrado hoy en el Inicio.
// Comprueba que use los MISMOS números de «Cobrado hoy», que suba sola cuando entra un pago (en este equipo y de otro
// agente, por la consulta de cada 30 s), la etiqueta al tocar, «sin conexión», «reducir movimiento» y los dos temas.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-cobro-vivo.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942', OUT = process.env.QA_OUT || require('os').tmpdir();
const TABLER = '/tmp/qa-tabler-icons';
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const pedir = (metodo, ruta, cuerpo) => new Promise((res) => {
  const u = new URL(BASE + ruta); const data = cuerpo ? JSON.stringify(cuerpo) : null;
  const rq = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: metodo, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} }, r => { let t = ''; r.on('data', d => t += d); r.on('end', () => { try { res(JSON.parse(t)); } catch (e) { res(t); } }); });
  rq.on('error', () => res(null)); if (data) rq.write(data); rq.end();
});
const qa = (p) => pedir('GET', '/__qa/' + p);
// Lo mismo que fechaRD()/hoyRD() de la app (RD = UTC−4, sin horario de verano): cálculo independiente para comparar
const fechaRD = f => { const s = String(f || ''); if (!s) return ''; if (s.length <= 10) return s.slice(0, 10); const t = new Date(s); if (isNaN(t)) return s.slice(0, 10); return new Date(t.getTime() - 4 * 3600000).toISOString().slice(0, 10); };
const hoyRD = () => fechaRD(new Date().toISOString());
const cobradoHoyServidor = async () => { const filas = await pedir('GET', '/supa/rest/v1/abonos?select=fecha,monto') || []; const h = hoyRD(); return filas.filter(a => a.fecha && fechaRD(a.fecha) === h).reduce((s, a) => s + (Number(a.monto) || 0), 0); };
const numero = t => Number(String(t || '').replace(/[^\d-]/g, '')) || 0;

async function abrir(b, w, tema, opc = {}) {
  await qa('tema/' + tema);
  const movil = w < 500;
  const ctx = await b.newContext(Object.assign(movil ? { viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA } : { viewport: { width: w, height: 800 } }, opc));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /Hoy en vivo|nxCV/.test(m.text())) errs.push(m.text()); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    const m = u.match(/@tabler\/icons-webfont@[^/]+\/dist\/([^?#]+)/); if (m && fs.existsSync(path.join(TABLER, m[1]))) return r.fulfill({ status: 200, body: fs.readFileSync(path.join(TABLER, m[1])) });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript((t) => { localStorage.setItem('nx_auth_mode', 'legacy'); localStorage.setItem('nx_tema', t); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, tema);
  await page.goto(BASE + '/index.html');
  await page.waitForFunction(() => typeof _nxCV !== 'undefined' && _nxCV.listo, null, { timeout: 15000 }).catch(() => {});
  await sleep(800);
  await page.evaluate(() => { const c = document.getElementById('nxCV'); if (c) c.scrollIntoView({ block: 'center' }); });
  await sleep(300);
  return { ctx, page, errs };
}
const estado = (page) => page.evaluate(() => {
  const c = document.getElementById('nxCV'), now = document.getElementById('nxCVnow'), cv = document.getElementById('nxCVcv'), live = document.getElementById('nxCVlive');
  let tinta = 0; try { const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) tinta++; } catch (e) {}
  return { hay: !!c, oculto: !c || c.hidden, alto: c ? Math.round(c.getBoundingClientRect().height) : 0, tot: (document.getElementById('nxCVtot') || {}).textContent, kpi: (document.getElementById('nxIGk1v') || {}).textContent,
    meta: (document.getElementById('nxCVmeta') || {}).textContent, cmp: (document.getElementById('nxCVcmp') || {}).textContent, aria: cv && cv.getAttribute('aria-label'),
    nowTop: now && !now.hidden ? parseFloat(now.style.top) : null, nowLeft: now && !now.hidden ? parseFloat(now.style.left) : null, mas: [...document.querySelectorAll('#nxCVplot .nxCV-mas')].map(e => e.textContent),
    live: live && live.textContent.trim(), liveOff: !!(live && live.classList.contains('off')), tinta, ancho: document.documentElement.scrollWidth, ax: (document.getElementById('nxCVax') || {}).textContent };
});
// Día de ejemplo en la memoria de la página (hoy y ayer, a horas relativas a «ahora» en RD)
const DIA = [[-600, 2500], [-480, 1500], [-410, 4000], [-300, 2000], [-200, 6500], [-95, 3000], [-30, 1500]];
const AYER = [[480, 3000], [600, 2500], [700, 5000], [900, 4000], [1000, 2000]];
// (mientras se usa el día de ejemplo se pausa la consulta de cada 30 s: si no, trae los abonos reales del servidor
// y la gráfica vuelve a ellos, que es justo lo que hace en la vida real)
const cargarDia = (page) => page.evaluate(([DIA, AYER]) => {
  _nxCV.pollBusy = true;
  const hoy = hoyRD(), ayer = nxIGSumaDias(hoy, -1), mA = nxCVAhora();
  const iso = (f, min) => new Date(Date.parse(f + 'T04:00:00Z') + min * 60000).toISOString();
  const hoyPts = DIA.filter(x => mA + x[0] > 0).map(([d, m]) => ({ fecha: iso(hoy, mA + d), monto: m }));
  window.__qaAb = hoyPts.concat(AYER.map(([mm, m]) => ({ fecha: iso(ayer, mm), monto: m })));
  nxCVDatos(window.__qaAb);
  const esperado = hoyPts.reduce((s, x) => s + x.monto, 0), ayerHasta = AYER.filter(([mm]) => mm <= mA).reduce((s, [, m]) => s + m, 0);
  return { n: hoyPts.length, esperado, ayerHasta };
}, [DIA, AYER]);

async function recorrido(b, w, tema) {
  const et = `[${w} ${tema}]`;
  const { ctx, page, errs } = await abrir(b, w, tema);
  let e = await estado(page);
  // 1) La tarjeta está debajo de los 4 KPI y encima de «Cobros del ciclo»
  const orden = await page.evaluate(() => { const k = document.querySelector('#nxIG .nxIG-kpis'), c = document.getElementById('nxCV'), r = document.querySelector('#nxIG .nxIG-row2'); if (!k || !c || !r) return null;
    return { kc: !!(k.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING), cr: !!(c.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING), ky: k.getBoundingClientRect().bottom, cy: c.getBoundingClientRect().top, cb: c.getBoundingClientRect().bottom, ry: r.getBoundingClientRect().top }; });
  ok(e.hay && !e.oculto, `${et} la tarjeta «Hoy, en vivo» se ve en el Inicio`);
  ok(orden && orden.kc && orden.cr && orden.cy >= orden.ky - 1 && orden.ry >= orden.cb - 1, `${et} va debajo de los 4 KPI y encima de «Cobros del ciclo»`, orden);
  // 2) Mismos números que «Cobrado hoy» y que el servidor (cálculo aparte, con la misma regla de fecha RD)
  const srv = await cobradoHoyServidor();
  ok(e.tot === e.kpi, `${et} el total es el mismo de «Cobrado hoy» (${e.tot} = ${e.kpi})`, e);
  ok(numero(e.tot) === Math.round(srv), `${et} y cuadra con los abonos de hoy del servidor (${srv})`, { tot: e.tot, srv });
  ok(e.tinta > 200, `${et} la gráfica está dibujada (${e.tinta} puntos con tinta)`, e.tinta);
  ok(/Lo cobrado hoy: RD\$/.test(e.aria || ''), `${et} lectores de pantalla: la gráfica tiene su resumen`, e.aria);
  ok(e.live === 'en vivo' && !e.liveOff, `${et} dice «en vivo»`, e.live);
  ok(/ahora$/.test(e.ax || ''), `${et} el eje termina en «ahora»`, e.ax);
  const alto0 = e.alto;
  // 3) Un día con varios pagos: total, cantidad, último y comparación con ayer
  const dia = await cargarDia(page); await sleep(1300); e = await estado(page);
  ok(numero(e.tot) === dia.esperado, `${et} día de ejemplo: total ${e.tot} (esperado ${dia.esperado})`, e.tot);
  ok(new RegExp('^' + dia.n + ' pagos · el último a las \\d{1,2}:\\d{2} [ap]\\. m\\.$').test(e.meta), `${et} «${e.meta}»`, e.meta);
  ok(e.cmp.startsWith('Ayer a esta hora: RD$') && numero(e.cmp.split('▲')[0].split('▼')[0]) === dia.ayerHasta, `${et} «${e.cmp.trim()}»`, { cmp: e.cmp, esperado: dia.ayerHasta });
  ok(Math.abs(e.alto - alto0) <= 1, `${et} la tarjeta no cambia de alto al llegar los datos (${alto0} → ${e.alto} px)`);
  ok(e.ancho <= w + 1, `${et} nada se sale de la pantalla (ancho ${e.ancho})`);
  // 4) Entra un pago en ESTE equipo: sube con animación y sale «+RD$»
  const antes = await estado(page);
  await page.evaluate(() => { const a = window.__qaAb.slice(); a.push({ fecha: new Date().toISOString(), monto: 5500 }); nxCVDatos(a); });
  await sleep(250); const medio = await estado(page);
  ok(medio.mas.some(t => t === '+RD$ 5,500'), `${et} aparece «+RD$ 5,500» junto a la punta`, medio.mas);
  ok(numero(medio.tot) > numero(antes.tot) && numero(medio.tot) < numero(antes.tot) + 5500, `${et} el total cuenta hacia arriba (${antes.tot} → ${medio.tot} → …)`, { antes: antes.tot, medio: medio.tot });
  await sleep(1100); const fin = await estado(page);
  ok(numero(fin.tot) === numero(antes.tot) + 5500, `${et} y termina en ${fin.tot}`, fin.tot);
  // la punta queda en el total nuevo y el último escalón sube lo que entró (la escala puede crecer con margen)
  const punta = await page.evaluate(() => { const g = _nxCV.geo; return { yTot: g.Y(_nxCV.total), yAntes: g.Y(_nxCV.total - 5500) }; });
  ok(fin.nowTop != null && Math.abs(fin.nowTop - punta.yTot) < 1.5 && punta.yTot < punta.yAntes - 5, `${et} la punta «ahora» queda en el total nuevo, ${Math.round(punta.yAntes - punta.yTot)} px más arriba que antes del pago`, { fin: fin.nowTop, punta });
  ok(antes.nowTop != null && fin.nowTop < antes.nowTop - 1, `${et} con la escala con margen, la punta sube a la vista (${Math.round(antes.nowTop)} → ${Math.round(fin.nowTop)} px)`, { antes: antes.nowTop, fin: fin.nowTop });
  // 5) Tocar la gráfica: hora y monto
  const caja = await page.locator('#nxCVplot').boundingBox();
  const geo = await page.evaluate(() => { const g = _nxCV.geo; const q = g.pagos[Math.floor(g.pagos.length / 2)]; return { x: g.X(q.min), monto: q.monto }; });
  if (w < 500) await page.touchscreen.tap(caja.x + geo.x, caja.y + caja.height * 0.6); else await page.mouse.move(caja.x + geo.x, caja.y + caja.height * 0.6);
  await sleep(250);
  const tip = await page.evaluate(() => { const t = document.getElementById('nxCVtip'); return t && !t.hidden ? t.innerText.replace(/\n/g, ' | ') : null; });
  ok(tip && /^\d{1,2}:\d{2} [ap]\. m\. · \+RD\$ [\d,]+/.test(tip) && /Llevabas RD\$/.test(tip), `${et} al tocar un pago: «${tip}»`, tip);
  if (w >= 500) { await page.mouse.move(caja.x - 40, caja.y - 40); await sleep(150); ok(await page.evaluate(() => document.getElementById('nxCVtip').hidden), `${et} al salir el mouse se quita la etiqueta`); }
  // 6) Cobra OTRO agente (llega por la consulta de cada 30 s): se fuerza la consulta en vez de esperar
  const srvAntes = await cobradoHoyServidor();
  await pedir('POST', '/supa/rest/v1/abonos', { cliente_id: '00000000-0000-4000-8000-000000000203', monto: 2345, fecha: new Date().toISOString(), metodo: 'Efectivo' });
  await page.evaluate(() => { _nxCV.pollBusy = false; return nxCVConsultar(); }); await sleep(2300);
  const otro = await estado(page);
  ok(numero(otro.kpi) === Math.round(srvAntes + 2345) && otro.tot === otro.kpi, `${et} pago de otro agente: «Cobrado hoy» y la gráfica pasan juntas a ${otro.kpi}`, { kpi: otro.kpi, tot: otro.tot, esperado: srvAntes + 2345 });
  // 7) Sin conexión: la etiqueta lo dice; al volver, «en vivo» otra vez
  await page.route(/\/rest\/v1\/abonos/, r => r.abort());
  await page.evaluate(() => nxCVConsultar()); await sleep(500);
  let s7 = await estado(page);
  ok(s7.liveOff && s7.live === 'sin conexión', `${et} si falla la consulta dice «sin conexión»`, s7.live);
  await page.unroute(/\/rest\/v1\/abonos/);
  await page.evaluate(() => { _nxCV.pollBusy = false; return nxCVConsultar(); }); await sleep(600);
  s7 = await estado(page);
  ok(!s7.liveOff && s7.live === 'en vivo', `${et} al volver la conexión dice «en vivo»`, s7.live);
  if (w < 500 && tema === 'glass-oscuro') await page.screenshot({ path: path.join(OUT, `cobro-vivo-${w}-${tema}.png`) });
  if (w >= 500) await page.screenshot({ path: path.join(OUT, `cobro-vivo-${w}-${tema}.png`) });
  ok(errs.length === 0, `${et} sin errores de página`, errs.slice(0, 3));
  await ctx.close();
}

async function sinMovimiento(b) {
  const et = '[390 reducir movimiento]';
  const { ctx, page, errs } = await abrir(b, 390, 'glass-oscuro', { reducedMotion: 'reduce' });
  await cargarDia(page); await sleep(200);
  const antes = await estado(page);
  await page.evaluate(() => { const a = window.__qaAb.slice(); a.push({ fecha: new Date().toISOString(), monto: 1000 }); nxCVDatos(a); });
  await sleep(120); const e = await estado(page);
  ok(numero(e.tot) === numero(antes.tot) + 1000 && e.mas.length === 0, `${et} el total cambia de una vez, sin animación ni «+RD$»`, { antes: antes.tot, despues: e.tot, mas: e.mas });
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector('#nxCVnow'), '::after').animationName);
  ok(anim === 'none', `${et} la punta no late`, anim);
  ok(errs.length === 0, `${et} sin errores de página`, errs.slice(0, 3));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, tema] of [[390, 'glass-oscuro'], [1280, 'glass-oscuro'], [390, 'clasico']]) {
    try { await recorrido(b, w, tema); } catch (e) { ok(false, `[${w} ${tema}] el recorrido terminó`, String(e && e.message || e).slice(0, 300)); }
  }
  try { await sinMovimiento(b); } catch (e) { ok(false, '[reducir movimiento] el recorrido terminó', String(e && e.message || e).slice(0, 300)); }
  await b.close(); await qa('tema/none');
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
