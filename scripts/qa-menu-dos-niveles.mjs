// QA del menú de dos niveles (18-nov-2026): app real contra la REST simulada (scripts/qa-crm-mock-server.js).
// Comprueba en Glass oscuro y Claro, a 1440 y 390 px: riel de secciones + columna de páginas; las páginas son los
// mismos botones del menú de siempre (tocar una navega con nav()); sección de una sola página navega directo; permisos
// (un botón escondido no aparece); contadores; cajón ☰ en el celular; toques ≥ 44 px; sin scroll horizontal;
// apagado con nx_m2_off vuelve el menú anterior; sin errores de consola.
// Uso: PORT=8975 node scripts/qa-crm-mock-server.js &  QA_BASE=http://127.0.0.1:8975 QA_OUT=/ruta [QA_TABLER=/ruta] node scripts/qa-menu-dos-niveles.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8975';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-menu-dos-niveles')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const http = require('http');
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => r(s)); }).on('error', () => r('')));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 500) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, tema, off) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 900 }, hasTouch: movil, isMobile: movil, userAgent: movil ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', deviceScaleFactor: 2 });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(([tema, off]) => {
    if (!sessionStorage.getItem('__qaIni')) { sessionStorage.setItem('__qaIni', '1'); localStorage.removeItem('nx_tgo_off'); localStorage.removeItem('nx_menu_cristal');
      if (tema === 'claro') localStorage.setItem('nx_tema', 'clasico'); else localStorage.removeItem('nx_tema');
      if (off) localStorage.setItem('nx_m2_off', '1'); else localStorage.removeItem('nx_m2_off'); }
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, [tema, off]);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(3000);
  return { ctx, page, errs };
}
const ESTADO = () => {
  const r = document.getElementById('nxM2'), sb = document.getElementById('sbEl'), main = document.querySelector('.main');
  const vis = el => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    html: document.documentElement.className, m2: vis(r), sb: vis(sb), m2box: box(r), rail: box(r && r.querySelector('.m2-rail')), col: box(r && r.querySelector('.m2-col')), main: box(main),
    secs: [...(r ? r.querySelectorAll('.m2-sec') : [])].map(b => ({ s: b.dataset.sec, cur: b.getAttribute('aria-current') === 'true', dot: !!b.querySelector('.m2-dot'), h: Math.round(b.getBoundingClientRect().height) })),
    pgs: [...(r ? r.querySelectorAll('.m2-pg') : [])].map(b => ({ t: b.textContent.trim(), cur: b.getAttribute('aria-current') === 'page', h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) })),
    titulo: (r && r.querySelector('.m2-hd b') || {}).textContent || '', pttl: (document.getElementById('pttl') || {}).textContent || '',
    vista: (document.querySelector('.view.on') || {}).id || '', scrollX: document.documentElement.scrollWidth - window.innerWidth,
    open: !!(r && r.classList.contains('m2-open')), colBg: r && r.querySelector('.m2-col') ? getComputedStyle(r.querySelector('.m2-col')).backgroundColor : ''
  };
};

const browser = await chromium.launch();
for (const tema of ['oscuro', 'claro']) {
  await qa(tema === 'claro' ? 'tema/clasico' : 'tema/none');
  // ── PC ──
  console.log(`\n== PC 1440 · ${tema}`);
  let { ctx, page, errs } = await abrir(browser, 1440, tema, false);
  await page.evaluate(() => nav('dashboard', null)); await sleep(600); // el servidor de prueba recuerda la última pantalla
  let e = await page.evaluate(ESTADO);
  ok(/nx-m2/.test(e.html) && (tema === 'oscuro' ? /tema-glass-oscuro/.test(e.html) : /tema-claro/.test(e.html)), 'clase nx-m2 y tema correcto', e.html);
  ok(e.m2 && !e.sb, 'se ve el menú nuevo y no el de siempre', { m2: e.m2, sb: e.sb });
  ok(e.rail && e.rail.w >= 64 && e.rail.w <= 80 && e.col && e.col.w >= 220 && e.col.w <= 250, 'dos columnas: riel ~72 y páginas ~236', { rail: e.rail, col: e.col });
  ok(e.main && e.col && e.main.x >= e.col.x + e.col.w, 'el contenido empieza después del menú (no lo tapa)', { main: e.main, col: e.col });
  const secs = e.secs.map(s => s.s);
  ok(['inicio', 'seguros', 'mensajes', 'conta', 'reportes', 'config'].every(s => secs.includes(s)), 'secciones del admin: Inicio, Seguros, Mensajes, Contabilidad, Reportes, Configuración', secs);
  ok(e.secs.every(s => s.h >= 44) && e.pgs.every(p => p.h >= 44), 'todo lo que se toca mide ≥ 44 px', { s: e.secs.map(s => s.h), p: e.pgs.map(p => p.h) });
  ok(e.secs.some(s => s.cur && s.s === 'inicio') && e.pgs.some(p => p.cur && /Inicio/.test(p.t)), 'al entrar: Inicio activo', e.secs);
  if (tema === 'oscuro') await page.screenshot({ path: OUT + 'pc-oscuro-inicio.png' });
  // Seguros: tocar el icono cambia la lista sin navegar
  await page.click('#nxM2 .m2-sec[data-sec="seguros"]'); await sleep(300);
  e = await page.evaluate(ESTADO);
  ok(e.titulo === 'Seguros' && ['Facturas', 'Clientes', 'Pólizas', 'Solicitudes'].every(t => e.pgs.some(p => p.t.startsWith(t))), 'Seguros muestra Facturas, Clientes, Pólizas y Solicitudes', e.pgs.map(p => p.t));
  ok(e.vista === 'v-dashboard', 'tocar la sección no navega (sigue en Inicio)', e.vista);
  ok(e.pgs.some(p => p.t === 'Solicitudes'), 'rótulo «SOLICITUDES» queda «Solicitudes»', e.pgs.map(p => p.t));
  // Tocar Clientes navega con el botón de siempre
  await page.click('#nxM2 .m2-pg:has-text("Clientes")'); await sleep(900);
  e = await page.evaluate(ESTADO);
  ok(e.vista === 'v-clientes' && e.pgs.some(p => p.cur && p.t.startsWith('Clientes')) && e.secs.some(s => s.cur && s.s === 'seguros'), 'Clientes abre la pantalla y queda marcada', { v: e.vista, pg: e.pgs });
  await page.screenshot({ path: OUT + `pc-${tema}-seguros.png` });
  // Contabilidad: opciones de un desplegable de siempre
  await page.click('#nxM2 .m2-sec[data-sec="conta"]'); await sleep(300);
  e = await page.evaluate(ESTADO);
  ok(e.titulo === 'Contabilidad' && e.pgs.some(p => p.t === 'Mayor general') && e.pgs.some(p => /DGII/.test(p.t)) && !e.pgs.some(p => /Comisiones/.test(p.t)), 'Contabilidad: Mayor…DGII, sin Comisiones (escondida por el dueño)', e.pgs.map(p => p.t));
  await page.click('#nxM2 .m2-pg:has-text("Balance")'); await sleep(900);
  e = await page.evaluate(ESTADO);
  ok(e.vista === 'v-balance' && e.pgs.some(p => p.cur && p.t === 'Balance'), 'Balance abre y queda marcado', e.vista);
  // Configuración (navConfig)
  await page.click('#nxM2 .m2-sec[data-sec="config"]'); await sleep(300);
  e = await page.evaluate(ESTADO);
  ok(e.pgs.length >= 10 && e.pgs.some(p => p.t === 'Usuarios'), 'Configuración lista sus páginas', e.pgs.length);
  await page.click('#nxM2 .m2-pg:has-text("Usuarios")'); await sleep(1200);
  e = await page.evaluate(ESTADO);
  ok(e.vista === 'v-config' && e.pgs.some(p => p.cur && p.t === 'Usuarios'), 'Usuarios abre Configuración y queda marcado', { v: e.vista, cur: e.pgs.filter(p => p.cur) });
  if (tema === 'oscuro') await page.screenshot({ path: OUT + 'pc-oscuro-config.png' });
  // Inicio: sección de una sola página navega directo
  await page.click('#nxM2 .m2-sec[data-sec="inicio"]'); await sleep(900);
  e = await page.evaluate(ESTADO);
  ok(e.vista === 'v-dashboard', 'Inicio (una sola página) navega directo', e.vista);
  // Permisos: si un botón de siempre se esconde, desaparece del menú nuevo
  await page.evaluate(() => { const c = document.getElementById('niContab'); c.style.display = 'none'; });
  await sleep(300);
  e = await page.evaluate(ESTADO);
  ok(!e.secs.some(s => s.s === 'conta'), 'sin permiso de Contabilidad, la sección no aparece', e.secs.map(s => s.s));
  await page.evaluate(() => { document.getElementById('niContab').style.display = ''; });
  // Contador: Solicitudes con pendientes pone punto rojo en Seguros
  await page.evaluate(() => { const b = document.getElementById('niSolicitBadge'); if (b) { b.textContent = '3'; b.style.display = 'inline-flex'; } });
  await sleep(300);
  e = await page.evaluate(ESTADO);
  ok(e.secs.some(s => s.s === 'seguros' && s.dot), 'pendientes de Solicitudes: punto rojo en Seguros', e.secs);
  // Buscador ⌘K desde el menú
  await page.click('#nxM2 .m2-sec[data-sec="seguros"]'); await sleep(200);
  await page.click('#nxM2 .m2-bus'); await sleep(600);
  const bus = await page.evaluate(() => { const m = document.getElementById('gsModal') || document.querySelector('.gs-modal,.nxBusca,[id*="globalSearch" i]'); return !!m && getComputedStyle(m).display !== 'none'; });
  ok(bus, 'el botón Buscar abre la búsqueda de siempre');
  await page.keyboard.press('Escape');
  ok(e.scrollX <= 0, 'sin scroll horizontal', e.scrollX);
  // Punto de venta (tiene su propia columna de páginas): en PC queda solo el riel, sin tres columnas
  const hayPos = await page.evaluate(() => typeof window.nxAbrirPOS === 'function');
  if (hayPos) {
    await page.evaluate(() => window.nxAbrirPOS()); await sleep(2500);
    e = await page.evaluate(ESTADO);
    const solo = await page.evaluate(() => { const c = document.querySelector('#nxM2 .m2-col'); return !!document.querySelector('.view.on #nxTSide') && c && getComputedStyle(c).display === 'none'; });
    ok(solo && e.rail && e.rail.w > 0 && !e.secs.some(s => s.cur), 'Punto de venta abierto: solo el riel (sin tres columnas), ninguna sección marcada', { rail: e.rail, secs: e.secs });
    if (tema === 'claro') await page.screenshot({ path: OUT + 'pc-claro-pos.png' });
    await page.click('#nxM2 .m2-sec[data-sec="seguros"]'); await sleep(1400);
    e = await page.evaluate(ESTADO);
    ok(e.vista === 'v-facturas' && e.col && e.col.w > 0, 'desde el Punto de venta, tocar Seguros abre Facturas y vuelven las dos columnas', { v: e.vista, col: e.col });
  } else ok(true, 'sin Punto de venta en esta prueba');
  ok(errs.length === 0, 'sin errores de consola', errs);
  await ctx.close();

  // ── iPhone ──
  console.log(`\n== iPhone 390 · ${tema}`);
  ({ ctx, page, errs } = await abrir(browser, 390, tema, false));
  e = await page.evaluate(ESTADO);
  ok(!e.open && e.scrollX <= 0, 'cajón cerrado al entrar y sin scroll horizontal', { open: e.open, sx: e.scrollX });
  await page.click('.tn-tog'); await sleep(700);
  e = await page.evaluate(ESTADO);
  ok(e.open && e.m2box && e.m2box.x >= 0 && e.m2box.w <= 351, 'el ☰ abre el cajón con las dos columnas', e.m2box);
  ok(e.rail && e.col && e.col.x > e.rail.x && e.col.w >= 230, 'riel y columna lado a lado dentro del cajón', { rail: e.rail, col: e.col });
  ok(e.secs.every(s => s.h >= 44) && e.pgs.every(p => p.h >= 44), 'toques ≥ 44 px en el celular');
  await page.tap('#nxM2 .m2-sec[data-sec="seguros"]'); await sleep(400);
  await page.screenshot({ path: OUT + `iphone-${tema}-seguros.png` });
  await page.tap('#nxM2 .m2-pg:has-text("Pólizas")'); await sleep(1100);
  e = await page.evaluate(ESTADO);
  ok(e.vista === 'v-polizas' && !e.open, 'Pólizas abre la pantalla y cierra el cajón', { v: e.vista, open: e.open });
  await page.click('.tn-tog'); await sleep(600);
  await page.tap('#mobOverlay', { position: { x: 375, y: 400 } }).catch(() => {}); await sleep(600);
  e = await page.evaluate(ESTADO);
  ok(!e.open, 'tocar fuera cierra el cajón', e.open);
  ok(errs.length === 0, 'sin errores de consola (celular)', errs);
  await ctx.close();
}
await qa('tema/none');
// ── Apagado ──
console.log('\n== Apagado (nx_m2_off)');
{ const { ctx, page, errs } = await abrir(browser, 1440, 'oscuro', true);
  const e = await page.evaluate(ESTADO);
  ok(!e.m2 && e.sb && !/nx-m2/.test(e.html), 'con nx_m2_off vuelve el menú de siempre', { m2: e.m2, sb: e.sb });
  ok(errs.length === 0, 'sin errores (apagado)', errs);
  await ctx.close(); }
await browser.close();
console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
