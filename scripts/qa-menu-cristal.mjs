// QA del menú lateral de cristal (30-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js, tema Glass oscuro, admin.
//  · 1280×800: el riel contraído mide 76–84 px y el expandido 260–320 px; el chevron expande en < 600 ms y las etiquetas
//    quedan visibles; el estado persiste tras recargar (ya en el primer pintado); el ítem activo tiene fondo #2563EB y ocupa
//    todo el ancho del panel; las divisorias son degradados; el panel tiene backdrop-filter con blur ≥ 20 px y borde ≤ .12 de
//    alfa; .main no cambia de posición ni de ancho al expandir (el panel flota encima); Esc contrae; los paneles flotantes
//    de Contabilidad siguen al borde; 6 cuadros de la transición; sin errores de consola.
//  · 390×844 (UA iPhone): el cajón ☰ abre con el mismo lenguaje (cristal, divisorias, rótulos, activo de borde a borde,
//    tarjeta de usuario), filas ≥ 44 px, sin scroll horizontal, sin superficies claras, cierra con toque fuera, con el
//    chevron y deslizando hacia la izquierda.
// Uso: PORT=8975 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8975 QA_OUT=/ruta node scripts/qa-menu-cristal.mjs
//      (QA_TABLER=/ruta con tabler-icons.min.css y fonts/ para ver los íconos reales en las capturas; QA_REEL=/ruta/rail_abierto.jpg
//      añade una comparación lado a lado con el fotograma de referencia.)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-menu-cristal')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const REEL = process.env.QA_REEL || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 600) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript((abierto) => {
    if (!sessionStorage.getItem('__qaIni')) { sessionStorage.setItem('__qaIni', '1'); localStorage.removeItem('nx_tema'); localStorage.removeItem('nx_tgo_off'); if (abierto === null) localStorage.removeItem('nx_menu_cristal'); else localStorage.setItem('nx_menu_cristal', abierto ? '1' : '0'); }
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    // Estado del menú en el primer cuadro pintado con <body> (lo que ve el usuario) y en DOMContentLoaded.
    window.__mcCuadros = [];
    const tick = () => { if (document.body) window.__mcCuadros.push(document.documentElement.classList.contains('nx-mc-open')); if (window.__mcCuadros.length < 240) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    document.addEventListener('DOMContentLoaded', () => { window.__mcDCL = document.documentElement.classList.contains('nx-mc-open'); }, { once: true, capture: true });
  }, opts.abierto === undefined ? null : opts.abierto);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await page.waitForFunction(() => !!document.querySelector('#sbEl .nx-mc-tg'), null, { timeout: 15000 }).catch(() => {});
  await sleep(2500);
  return { ctx, page, errs };
}

const MEDIR = () => {
  const sb = document.getElementById('sbEl'), nav = document.getElementById('sbNav'), main = document.querySelector('.main');
  const cs = (el, ps) => getComputedStyle(el, ps);
  const rgba = s => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const r = sb.getBoundingClientRect(), mr = main.getBoundingClientRect();
  const before = cs(sb, '::before'), after = cs(sb, '::after');
  const panel = window.innerWidth <= 768 ? after : before;
  const act = nav.querySelector('.ni.on'); const ind = document.getElementById('springInd');
  const spring = document.body.classList.contains('spring-nav') && ind && cs(ind).display !== 'none';
  const barEl = spring ? ind : act;
  const bar = barEl ? barEl.getBoundingClientRect() : null;
  const navR = nav.getBoundingClientRect();
  const lbl = act ? act.querySelector('.ni-l') : null;
  const ss = nav.querySelector('.ss');
  const tg = sb.querySelector('.nx-mc-tg');
  const labels = [...nav.querySelectorAll('.ni:not(#sbContab *):not(#sbConfig *) .ni-l')].map(l => { const c = cs(l), b = l.getBoundingClientRect(); return { t: l.textContent.trim(), op: +c.opacity, x: Math.round(b.x), w: Math.round(b.width), color: c.color, disp: c.display }; });
  const rows = [...nav.querySelectorAll('.ni:not(#sbContab *):not(#sbConfig *)')].map(n => { const b = n.getBoundingClientRect(); return { t: (n.querySelector('.ni-l') || n).textContent.trim(), x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; });
  const bw = panel.width === 'auto' ? r.width : parseFloat(panel.width);
  return {
    nav: { x: r.x, w: r.width, h: r.height, cls: sb.className, open: document.documentElement.classList.contains('nx-mc-open') },
    panel: { w: bw, blur: panel.backdropFilter || panel.webkitBackdropFilter, bg: panel.backgroundImage, bgc: panel.backgroundColor, border: rgba(panel.borderTopColor), bw: panel.borderTopWidth, radius: panel.borderTopLeftRadius, shadow: panel.boxShadow, display: panel.display },
    main: { x: mr.x, w: mr.width },
    bar: bar && { x: bar.x, w: bar.width, h: bar.height, bg: cs(barEl).backgroundColor, el: barEl.id || barEl.className, navX: navR.x, navW: navR.width },
    activo: act && { t: (lbl || act).textContent.trim(), lblColor: lbl && cs(lbl).color, icoColor: cs(act.querySelector('.ni-i')).color },
    ss: ss && { txt: ss.textContent.trim(), line: cs(ss, '::before').backgroundImage, color: cs(ss).color, fs: cs(ss).fontSize, ls: cs(ss).letterSpacing, tt: cs(ss).textTransform, h: ss.getBoundingClientRect().height },
    tg: tg && { exp: tg.getAttribute('aria-expanded'), label: tg.getAttribute('aria-label'), x: tg.getBoundingClientRect().x, vis: cs(tg).display !== 'none' },
    labels, rows,
    sw: [document.documentElement.scrollWidth, innerWidth],
    user: (() => { const u = sb.querySelector('.sb-u'); if (!u) return null; const b = u.getBoundingClientRect(); const n = u.querySelector('.sb-un'); return { h: b.h || b.height, nom: n && n.textContent.trim(), nomOp: n && +cs(n).opacity, nomDisp: n && cs(n.parentElement).display }; })(),
    search: (() => { const s = sb.querySelector('.nx-mc-search'); if (!s) return null; const t = s.querySelector('.nx-mc-st'); return { h: s.getBoundingClientRect().height, pillOp: +cs(t).opacity, bg: cs(s).backgroundColor, border: cs(s).borderTopWidth }; })(),
  };
};
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const esAzul = s => /rgba?\(37,\s*99,\s*235/.test(s || '');
const esGradiente = s => /linear-gradient\(/.test(s || '') && /rgba\(0, 0, 0, 0\)|transparent/.test(s || '');
const blurPx = s => { const m = /blur\(([\d.]+)px\)/.exec(s || ''); return m ? +m[1] : 0; };

async function compuesto(browser, archivos, salida, alto) {
  // Une varias capturas en una sola imagen (página HTML con las imágenes en fila).
  const ctx = await browser.newContext({ viewport: { width: 100, height: 100 } });
  const page = await ctx.newPage();
  const uri = f => 'data:image/' + (/\.jpe?g$/i.test(f) ? 'jpeg' : 'png') + ';base64,' + fs.readFileSync(f).toString('base64');
  const html = `<!doctype html><body style="margin:0;background:#0B1628;display:flex;gap:8px;padding:8px;width:max-content">${archivos.map(f => `<img src="${uri(f)}" style="height:${alto}px;display:block">`).join('')}</body>`;
  await page.setContent(html); await sleep(400);
  const box = await page.evaluate(() => [document.body.scrollWidth, document.body.scrollHeight]);
  await page.setViewportSize({ width: Math.min(8000, box[0]), height: Math.min(8000, box[1]) });
  await page.screenshot({ path: salida, fullPage: true });
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});

  // ═══ 1280×800 ═══
  console.log('\n=== 1280×800 · riel de cristal ===');
  let A = await abrir(browser, 1280);
  let m = await A.page.evaluate(MEDIR);
  ok(m.tg && m.tg.vis, 'chevron del canto presente (parches-menu-cristal.js cargado)', m.tg);
  ok(!m.nav.open && m.panel.w >= 76 && m.panel.w <= 84, `riel contraído: panel de ${m.panel.w} px (76–84)`, m.panel);
  ok(Math.round(m.nav.w) === 76 && Math.round(m.main.x) === 100, `riel de 76 px en el flujo y .main en x=100 (${m.main.x})`, { nav: m.nav, main: m.main });
  ok(blurPx(m.panel.blur) >= 20, `cristal: backdrop-filter blur ≥ 20 px (${m.panel.blur})`);
  ok(m.panel.border && m.panel.border[3] <= 0.12 && m.panel.border[3] > 0 && m.panel.bw === '1px', `borde de 1 px con alfa ≤ .12 (${JSON.stringify(m.panel.border)})`);
  ok(/linear-gradient/.test(m.panel.bg) && /0px 1px 0px 0px inset|inset 0px 1px 0px/.test(m.panel.shadow.replace(/rgba?\([^)]*\)\s*/g, '')), 'tinte con degradado vertical y brillo interior arriba', { bg: m.panel.bg.slice(0, 80), sh: m.panel.shadow.slice(0, 120) });
  ok(parseFloat(m.panel.radius) >= 24 && parseFloat(m.panel.radius) <= 28, `radio grande del panel (${m.panel.radius})`);
  ok(m.ss && esGradiente(m.ss.line), 'divisorias de sección: degradado que se desvanece en los extremos', m.ss);
  ok(m.ss && m.ss.tt === 'uppercase' && parseFloat(m.ss.fs) >= 10 && parseFloat(m.ss.ls) >= 1, `rótulo de sección en mayúsculas con tracking (${m.ss && m.ss.fs}, ${m.ss && m.ss.ls})`, m.ss);
  ok(m.bar && esAzul(m.bar.bg) && Math.abs(m.bar.x - m.bar.navX) < 1 && Math.abs(m.bar.w - m.bar.navW) < 1, 'ítem activo (contraído): barra #2563EB de borde a borde del panel', m.bar);
  ok(m.rows.length >= 9 && m.rows.every(r => r.h === 48 && r.w === 76), `ítems del riel: ${m.rows.length} filas de 76×48`, m.rows.slice(0, 3));
  ok(m.labels.every(l => l.op === 0), 'contraído: etiquetas ocultas (opacidad 0)', m.labels.filter(l => l.op > 0));
  ok(m.tg.exp === 'false' && /expandir/i.test(m.tg.label), 'chevron: aria-expanded=false / «Expandir el menú»', m.tg);
  ok(m.search && m.search.pillOp === 0 && m.search.border === '0px', 'buscador: solo la lupa en el riel, sin marco de botón', m.search);
  await A.page.screenshot({ path: OUT + 'rail-cerrado-1280.png' });

  // expandir con el chevron: tiempo medido cuadro a cuadro dentro de la página (ancho del panel hasta llegar a 288 px)
  const listo = await A.page.evaluate(() => new Promise(res => {
    const sb = document.getElementById('sbEl'), t0 = performance.now(); const w = () => parseFloat(getComputedStyle(sb, '::before').width);
    sb.querySelector('.nx-mc-tg').click();
    const tick = () => { const x = w(); const dt = performance.now() - t0; if ((x >= 287 && x <= 289.5 && dt > 250) || dt > 1500) return res({ ms: Math.round(dt), w: x }); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }));
  ok(listo.ms > 0 && listo.ms < 600, `el chevron expande en < 600 ms (${listo.ms} ms hasta ${listo.w} px)`, listo);
  await sleep(500);
  // 6 cuadros de la transición (contraer → expandir a 1/3 de velocidad para que las capturas la recorran)
  await A.page.click('#sbEl .nx-mc-tg'); await sleep(700);
  await A.page.evaluate(() => document.documentElement.style.setProperty('--nx-mc-dur', '1.26s'));
  await A.page.click('#sbEl .nx-mc-tg');
  const cuadros = [];
  for (let i = 0; i < 6; i++) { await A.page.screenshot({ path: OUT + `transicion-${i + 1}.png`, clip: { x: 0, y: 0, width: 420, height: 800 } }); cuadros.push(OUT + `transicion-${i + 1}.png`); await sleep(60); }
  await A.page.evaluate(() => document.documentElement.style.removeProperty('--nx-mc-dur'));
  await sleep(900);
  m = await A.page.evaluate(MEDIR);
  ok(m.nav.open && m.panel.w >= 260 && m.panel.w <= 320, `expandido: panel de ${m.panel.w} px (260–320)`, m.panel);
  ok(Math.round(m.nav.w) === 76 && Math.round(m.main.x) === 100 && Math.round(m.main.w) === 1168, `.main no se mueve al expandir: x=${m.main.x}, ancho=${m.main.w} (el panel flota encima)`, m.main);
  ok(m.labels.length >= 9 && m.labels.every(l => l.op === 1 && l.x > 60 && l.x + l.w <= 300 + 12), `expandido: ${m.labels.length} etiquetas visibles dentro del panel`, m.labels);
  const sol = await A.page.evaluate(() => { const l = document.querySelector('#niSolicit .ni-l'); return l && getComputedStyle(l).textTransform; });
  ok(sol === 'lowercase', '«SOLICITUDES» se muestra como «Solicitudes» (minúsculas + inicial en mayúscula)', sol);
  ok(m.bar && esAzul(m.bar.bg) && Math.abs(m.bar.x - m.bar.navX) < 1 && Math.abs(m.bar.w - m.bar.navW) < 1 && m.bar.w >= 260, 'ítem activo (expandido): barra #2563EB de borde a borde del panel', m.bar);
  ok(m.activo && /rgb\(255, 255, 255\)/.test(m.activo.lblColor) && /rgb\(255, 255, 255\)/.test(m.activo.icoColor), 'ítem activo: ícono y texto blancos', m.activo);
  ok(m.tg.exp === 'true' && /contraer/i.test(m.tg.label) && m.tg.x > 270, 'chevron: aria-expanded=true / «Contraer el menú», en el canto derecho del panel', m.tg);
  ok(m.user && m.user.nomOp === 1 && m.user.nom && !/cargando/i.test(m.user.nom), 'tarjeta de usuario: nombre visible al expandir', m.user);
  ok(m.search && m.search.pillOp === 1, 'buscador: píldora visible al expandir', m.search);
  const tipVisible = await A.page.evaluate(() => { const n = document.querySelector('#sbEl .ni.on'); n.classList.add('tgo-tip'); const d = getComputedStyle(n, '::after').display; n.classList.remove('tgo-tip'); return d; });
  ok(tipVisible === 'none', 'expandido: sin tooltips del riel (las etiquetas ya se ven)', tipVisible);
  await A.page.screenshot({ path: OUT + 'rail-abierto-1280.png' });
  await compuesto(browser, cuadros, OUT + 'transicion.png', 600);
  if (REEL && fs.existsSync(REEL)) {
    await A.page.screenshot({ path: OUT + 'rail-abierto-1280-recorte.png', clip: { x: 0, y: 0, width: 330, height: 800 } });
    await compuesto(browser, [REEL, OUT + 'rail-abierto-1280-recorte.png'], OUT + 'comparacion-reel.png', 800);
  }
  // panel flotante de Contabilidad sigue al borde del panel expandido
  await A.page.evaluate(() => toggleContab()); await sleep(400);
  const contab = await A.page.evaluate(() => { const p = document.getElementById('sbContab'); const c = getComputedStyle(p); return { x: p.getBoundingClientRect().x, vis: c.visibility, blur: c.backdropFilter || c.webkitBackdropFilter, bg: c.backgroundImage.slice(0, 40) }; });
  ok(contab.vis === 'visible' && Math.abs(contab.x - (12 + 288 + 12)) < 2 && blurPx(contab.blur) >= 20, `panel flotante Contabilidad en x=${contab.x} (borde del panel + 12, como con el riel) con cristal`, contab);
  await A.page.screenshot({ path: OUT + 'rail-abierto-contab-1280.png' });
  await A.page.evaluate(() => toggleContab()); await sleep(300);
  // Esc contrae
  await A.page.keyboard.press('Escape'); await sleep(600);
  m = await A.page.evaluate(MEDIR);
  ok(!m.nav.open && m.panel.w <= 84, 'Esc contrae el menú', m.panel);
  // el escudo también expande (toggleSB envuelto)
  await A.page.click('#sbEl .sb-mk'); await sleep(600);
  m = await A.page.evaluate(MEDIR);
  ok(m.nav.open && m.panel.w >= 260, 'el escudo del riel también expande', m.panel);
  ok(A.errs.length === 0, 'sin errores de consola (1280)', A.errs);
  const guardado = await A.page.evaluate(() => localStorage.getItem('nx_menu_cristal'));
  ok(guardado === '1', 'estado guardado en localStorage nx_menu_cristal=1', guardado);
  await A.ctx.close();

  // persistencia: nueva pestaña con el estado guardado → expandido desde el primer cuadro pintado
  console.log('\n=== 1280×800 · recarga con el menú expandido ===');
  A = await abrir(browser, 1280, { abierto: true }); // pestaña nueva con nx_menu_cristal=1 ya guardado (como una recarga)
  const cu = await A.page.evaluate(() => ({ dcl: window.__mcDCL, cuadros: window.__mcCuadros, n: window.__mcCuadros.length }));
  m = await A.page.evaluate(MEDIR);
  ok(cu.dcl === true && cu.cuadros.length > 0 && cu.cuadros.every(Boolean), `recarga: expandido en DOMContentLoaded y en los ${cu.n} cuadros pintados (sin salto)`, { dcl: cu.dcl, primeros: cu.cuadros.slice(0, 5) });
  ok(m.nav.open && m.panel.w >= 260 && m.labels.every(l => l.op === 1), 'recarga: el estado expandido persiste (panel y etiquetas)', m.panel);
  ok(Math.round(m.main.x) === 100, '.main sigue en x=100 con el menú expandido al cargar', m.main);
  // navegar a otra pantalla mantiene la barra activa de borde a borde
  await A.page.evaluate(() => nav('clientes', document.querySelector('#sbEl .ni[onclick^="nav(\'clientes\'"]'))); await sleep(900);
  m = await A.page.evaluate(MEDIR);
  ok(m.activo && m.activo.t === 'Clientes' && m.bar && esAzul(m.bar.bg) && Math.abs(m.bar.w - m.bar.navW) < 1, 'al navegar, la barra activa sigue al nuevo ítem de borde a borde', { activo: m.activo, bar: m.bar });
  ok(A.errs.length === 0, 'sin errores de consola (recarga)', A.errs);
  await A.ctx.close();

  // movimiento reducido: sin desplazamiento de etiquetas, solo fundido
  console.log('\n=== 1280×800 · prefers-reduced-motion ===');
  A = await abrir(browser, 1280, { reduced: true });
  const rm = await A.page.evaluate(() => { const l = document.querySelector('#sbEl .ni .ni-l'); const c = getComputedStyle(l); return { tr: c.transform, tt: c.transition }; });
  ok(rm.tr === 'none' && /opacity/.test(rm.tt) && !/transform/.test(rm.tt), 'movimiento reducido: etiquetas sin desplazamiento, solo fundido', rm);
  await A.ctx.close();

  // ═══ 390×844 (UA iPhone) ═══
  console.log('\n=== 390×844 · cajón ☰ de cristal ===');
  const M = await abrir(browser, 390);
  m = await M.page.evaluate(MEDIR);
  ok(!/mob-open/.test(m.nav.cls) && (m.nav.x + m.nav.w <= 0 || m.nav.x < -200), 'cerrado: el cajón está fuera de pantalla (sin riel en el celular)', m.nav);
  await M.page.click('.tnav .tn-tog'); await sleep(800);
  m = await M.page.evaluate(MEDIR);
  ok(/mob-open/.test(m.nav.cls) && m.nav.x === 0 && m.nav.w >= 260 && m.nav.w <= 320, `abierto: cajón de ${m.nav.w} px (260–320) en x=0`, m.nav);
  ok(m.panel.display !== 'none' && blurPx(m.panel.blur) >= 20, `cristal en el cajón: blur ≥ 20 px (${m.panel.blur})`, m.panel);
  ok(m.panel.border && m.panel.border[3] <= 0.12 && /linear-gradient/.test(m.panel.bg), 'cajón: hairline ≤ .12 y tinte con degradado', m.panel);
  ok(m.ss && esGradiente(m.ss.line) && m.ss.tt === 'uppercase' && parseFloat(m.ss.fs) >= 11, 'cajón: divisorias en degradado y rótulos ≥ 11 px', m.ss);
  ok(m.rows.length >= 9 && m.rows.every(r => r.h >= 44 && r.x === 0 && Math.abs(r.w - m.nav.w) <= 2), `cajón: ${m.rows.length} filas ≥ 44 px de borde a borde`, m.rows.slice(0, 4));
  ok(m.bar && esAzul(m.bar.bg) && m.bar.x === 0 && Math.abs(m.bar.w - m.nav.w) <= 2, 'cajón: ítem activo #2563EB de borde a borde', m.bar);
  ok(m.labels.every(l => l.op === 1 && l.disp !== 'none'), 'cajón: etiquetas visibles', m.labels.filter(l => l.op < 1));
  ok(m.sw[0] <= m.sw[1], 'cajón: sin desplazamiento horizontal', m.sw);
  ok(m.user && m.user.nom && m.user.h >= 44, 'cajón: tarjeta de usuario (avatar, nombre, rol) ≥ 44 px', m.user);
  ok(m.search && m.search.h >= 44 && m.search.pillOp === 1, 'cajón: píldora de búsqueda', m.search);
  ok(m.tg && m.tg.vis && m.tg.x > 250 && m.tg.x < 390, 'cajón: chevron ‹ en el canto derecho de la cabecera', m.tg);
  // sin superficies claras: color del panel, filas y textos
  const claras = await M.page.evaluate(() => {
    const out = []; const sb = document.getElementById('sbEl');
    const l = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const p = s => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(s || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
    sb.querySelectorAll('.ni,.sb-top,.sb-ft,.sb-u,.ss,.sb-nav').forEach(el => { const c = p(getComputedStyle(el).backgroundColor); if (c && c[3] > .3 && l(c) > .25 && !el.classList.contains('on')) out.push([el.className, getComputedStyle(el).backgroundColor]); });
    const bgs = [getComputedStyle(sb, '::after').backgroundImage];
    bgs.forEach(b => { const ms = b.match(/rgba?\([^)]*\)/g) || []; ms.forEach(s => { const c = p(s); if (c && c[3] > .3 && l(c) > .25) out.push(['panel', s]); }); });
    return out;
  });
  ok(claras.length === 0, 'cajón: sin superficies claras', claras);
  await M.page.screenshot({ path: OUT + 'cajon-390.png' });
  // cierre con el chevron
  await M.page.click('#sbEl .nx-mc-tg'); await sleep(600);
  m = await M.page.evaluate(MEDIR);
  ok(!/mob-open/.test(m.nav.cls), 'cajón: el chevron ‹ lo cierra', m.nav.cls);
  // cierre por toque fuera
  await M.page.click('.tnav .tn-tog'); await sleep(700);
  await M.page.mouse.click(360, 500); await sleep(600);
  m = await M.page.evaluate(MEDIR);
  ok(!/mob-open/.test(m.nav.cls), 'cajón: toque fuera lo cierra', m.nav.cls);
  // cierre deslizando hacia la izquierda (eventos táctiles sintéticos sobre el cajón)
  await M.page.click('.tnav .tn-tog'); await sleep(700);
  const desl = await M.page.evaluate(async () => {
    const sb = document.getElementById('sbEl'); const sl = ms => new Promise(r => setTimeout(r, ms));
    const ev = (t, x, y) => { const touch = new Touch({ identifier: 1, target: sb, clientX: x, clientY: y, pageX: x, pageY: y }); sb.dispatchEvent(new TouchEvent(t, { touches: t === 'touchend' ? [] : [touch], changedTouches: [touch], bubbles: true, cancelable: true })); };
    ev('touchstart', 200, 400); await sl(20);
    const pasos = []; for (let x = 190; x >= 60; x -= 26) { ev('touchmove', x, 402); await sl(16); pasos.push(getComputedStyle(sb).transform); }
    ev('touchend', 60, 402); await sl(500);
    return { sigue: pasos, cls: sb.className };
  });
  ok(!/mob-open/.test(desl.cls) && desl.sigue.some(t => /matrix\(1, 0, 0, 1, -\d/.test(t)), 'cajón: deslizar a la izquierda lo sigue 1:1 y lo cierra', desl);
  ok(M.errs.length === 0, 'sin errores de consola (390)', M.errs);
  await M.ctx.close();

  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
