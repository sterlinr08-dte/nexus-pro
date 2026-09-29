// QA del tema «Glass oscuro» (58.89, 29-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js. A 390 y 1280 px, admin y agente:
//  · primer pintado: cuadro a cuadro (requestAnimationFrame) desde que existe <body> hasta 6 s después de cargar, el tema
//    visible nunca cambia (usuario nuevo → glass-oscuro; usuario con 'clasico' → clásico; premium; migración única);
//  · recorre las pantallas de Seguros (+ Préstamos/Panel del dueño/POS como admin) y mide contraste texto/fondo efectivo
//    (sin texto oscuro sobre oscuro ni blanco sobre blanco; ≥4.5:1 en las superficies principales; campos legibles),
//    desborde horizontal, modales, Buzón y errores de consola;
//  · cambia de tema en Configuración → Apariencia entre todos los temas (clases, espejo local, preferencia guardada,
//    recarga sin salto) y el botón de la barra superior; interruptor por equipo (nx_tgo_off).
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-tema-glass.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-tema-glass')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
// Íconos Tabler reales en las capturas si hay copia local (opcional): QA_TABLER=/ruta con tabler-icons.min.css y fonts/.
const TABLER = process.env.QA_TABLER || '';
let pass = 0, fail = 0; const resumen = { contraste: {}, primerPintado: {} };
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(s); } }); }));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ID = { admin: '00000000-0000-4000-8000-000000000001', agente: '00000000-0000-4000-8000-000000000002' };

// ── medición en la página: fondo efectivo (capas semitransparentes y degradados compuestos hasta la escena) ──
const MEDIR = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => { const a = t.a + b.a * (1 - t.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (t.r * t.a + b.r * b.a * (1 - t.a)) / a, g: (t.g * t.a + b.g * b.a * (1 - t.a)) / a, b: (t.b * t.a + b.b * b.a * (1 - t.a)) / a, a }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Escena: en glass-oscuro, tono medio del fondo fijo; en los temas claros, blanco (foto clara / fondo blanco).
  const escenaDe = () => document.documentElement.classList.contains('tema-glass-oscuro') ? { r: 46, g: 59, b: 83, a: 1 } : document.body.classList.contains('tema-premium') ? { r: 11, g: 18, b: 32, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  const fondo = (el) => {
    const capas = [];
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/gradient/.test(cs.backgroundImage) && !/url\(/.test(cs.backgroundImage)) {
        const cc = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
        if (cc.length) { const m = cc.reduce((s, c) => ({ r: s.r + c.r / cc.length, g: s.g + c.g / cc.length, b: s.b + c.b / cc.length, a: s.a + c.a / cc.length }), { r: 0, g: 0, b: 0, a: 0 }); capas.push(m); if (m.a >= 0.99) break; }
      }
      const bg = parse(cs.backgroundColor); if (bg && bg.a > 0) { capas.push(bg); if (bg.a >= 0.99) break; }
    }
    let c = escenaDe(); for (let i = capas.length - 1; i >= 0; i--) c = over(capas[i], c); return c;
  };
  const visible = (el) => { const b = el.getBoundingClientRect(); if (!b.width || !b.height || b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return false; let op = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) op *= +getComputedStyle(a).opacity; if (op < 0.2) return false; const cx = Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2)); const top = document.elementFromPoint(cx, cy); return !(top && top !== el && !el.contains(top) && !top.contains(el)); };
  const medir = (el) => { const cs = getComputedStyle(el); const tc = parse(cs.color); if (!tc || tc.a === 0) return null; let op = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) op *= +getComputedStyle(a).opacity; const bg = fondo(el); const col = over({ ...tc, a: tc.a * op }, bg); return { r: ratio(col, bg), lt: lum(col), lb: lum(bg), fs: parseFloat(cs.fontSize), fw: +cs.fontWeight || 400 }; };
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  window.__tgo = {
    // Todo texto visible: casos «ilegibles» = oscuro sobre oscuro o claro sobre claro con contraste < 3.
    textos(raiz) {
      const root = document.querySelector(raiz) || document.body, r = { total: 0, bajo45: 0, oscuroSobreOscuro: [], claroSobreClaro: [] };
      root.querySelectorAll('*').forEach(el => {
        if (el.closest('svg') || /^(SCRIPT|STYLE|svg|path|CANVAS|IMG|BR|OPTION|I)$/i.test(el.tagName) || el.closest('.ti')) return;
        if (![...el.childNodes].some(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent))) return; // sin letras ni cifras (emoji, «·») no cuenta
        if (!visible(el)) return;
        const m = medir(el); if (!m) return; r.total++;
        const grande = m.fs >= 24 || (m.fs >= 18.66 && m.fw >= 700);
        if (m.r < (grande ? 3 : 4.5)) r.bajo45++;
        if (m.r < 3 && m.lt < 0.2 && m.lb < 0.2) r.oscuroSobreOscuro.push([nombre(el), el.textContent.trim().slice(0, 24), +m.r.toFixed(2)]);
        if (m.r < 3 && m.lt > 0.6 && m.lb > 0.6) r.claroSobreClaro.push([nombre(el), el.textContent.trim().slice(0, 24), +m.r.toFixed(2)]);
      });
      return r;
    },
    // Superficies principales: rótulos y datos que el tema pinta (≥4.5:1, o ≥3:1 si es texto grande).
    superficies() {
      const SEL = ['.tnav .pttl', '#sbEl .ni-l', '#sbEl .sb-nm', '.nc .ct', 'thead th', 'tbody td', '.kpi .kl', '.kpi .kv', '.modal .mt', '.modal .fr label', '.nxCrmHead h1', '.nxCrmHead p', '.nxSf .sf-kpi .lb', '.nxSf .sf-kpi .v', '.nxSf .sf-fantitle h2', '#nxIG .nxIG-h', '#nxIG .nxIG-kv', '.nxCrmHomeHead h1', '.nxCrmHomeHead h2', '.tema-opcion div'];
      const malos = []; let n = 0;
      SEL.forEach(s => document.querySelectorAll(s).forEach(el => { if (!visible(el) || !/[\p{L}\p{N}]/u.test(el.textContent)) return; const m = medir(el); if (!m) return; n++; const grande = m.fs >= 24 || (m.fs >= 18.66 && m.fw >= 700); if (m.r < (grande ? 3 : 4.5)) malos.push([s, el.textContent.trim().slice(0, 20), +m.r.toFixed(2)]); }));
      return { n, malos };
    },
    // Campos: texto escrito legible sobre su propio fondo.
    campos(raiz) {
      const root = document.querySelector(raiz) || document.body, malos = []; let n = 0;
      root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=color]),select,textarea').forEach(el => { if (!visible(el)) return; const m = medir(el); if (!m) return; n++; if (m.r < 4.5) malos.push([nombre(el), +m.r.toFixed(2)]); });
      return { n, malos };
    },
  };
};

async function abrir(browser, { width, rol, mirror, off }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript(({ rol, id, mirror, off }) => {
    // Solo la primera carga de la pestaña fija el espejo; las recargas conservan lo que la app escribió.
    if (!sessionStorage.getItem('__qaIni')) { sessionStorage.setItem('__qaIni', '1'); if (mirror) localStorage.setItem('nx_tema', mirror); else localStorage.removeItem('nx_tema'); if (off) localStorage.setItem('nx_tgo_off', '1'); else localStorage.removeItem('nx_tgo_off'); }
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id, nom: rol === 'admin' ? 'Esterlin Espinal' : 'Robinson Perez', rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    // Estado del tema en CADA cuadro pintado, desde que existe <body> (lo que el usuario ve), durante 6 s.
    const est = () => { const h = document.documentElement, b = document.body; const t = h.classList.contains('tema-glass-oscuro') ? 'glass-oscuro' : b && b.classList.contains('tema-premium') ? 'premium' : b && b.classList.contains('tema-glass') ? 'glass' : 'clasico'; return t; };
    window.__temaCuadros = []; window.__temaDCL = null; const t0 = performance.now();
    const tick = () => { if (document.body) { const t = est(); const c = window.__temaCuadros; if (!c.length || c[c.length - 1].t !== t) c.push({ t, ms: Math.round(performance.now() - t0), bg: getComputedStyle(document.documentElement).backgroundColor }); } if (performance.now() - t0 < 9000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    new MutationObserver((ms, o) => { if (document.body) { window.__temaCuerpo = est(); o.disconnect(); } }).observe(document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => { window.__temaDCL = { t: est(), bg: getComputedStyle(document.documentElement).backgroundColor, cls: document.documentElement.className }; }, { once: true, capture: true });
  }, { rol, id: ID[rol], mirror, off });
  await page.addInitScript(MEDIR);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(3000);
  return { ctx, page, errs };
}
const estadoTema = (page) => page.evaluate(() => ({ html: document.documentElement.classList.contains('tema-glass-oscuro'), premium: document.body.classList.contains('tema-premium'), glass: document.body.classList.contains('tema-glass'), attr: document.documentElement.getAttribute('data-nx-tema'), mirror: localStorage.getItem('nx_tema'), bg: getComputedStyle(document.documentElement).backgroundColor, cuadros: window.__temaCuadros, cuerpo: window.__temaCuerpo, dcl: window.__temaDCL }));
const prefs = async (rol) => ((await qa('prefs')) || []).find(r => r.usuario_id === ID[rol])?.datos || null;

// Pantallas: [nombre, cómo abrirla, captura, raíz a medir]
const VISTAS = [
  ['inicio', "nav('dashboard',null)", 'inicio'], ['facturas', "nav('facturas',null)", 'facturas'], ['cobros', "nav('facturas',null);setTimeout(()=>switchTab('cobros'),250)"],
  ['clientes', "nav('clientes',null)", 'clientes'], ['cliente360', "nav('cliente360',null);setTimeout(()=>nxC360Abrir(ST.clientes[0].id),300)", 'cliente360'],
  ['polizas', "nav('polizas',null)"], ['solicitudes', "nxAbrirSolicitudes()"], ['crm', "nav('crm',null)", 'crm'], ['prospectos', "nav('crm',null);setTimeout(()=>nxCrm.tab('prospectos'),350)"],
  ['buzon', "nav('waInbox',null)", 'buzon'], ['config', "navConfig(12,null)", 'config'],
];
const VISTAS_ADMIN = [['comisiones', "nav('comisiones',null)"], ['mayor', "nav('mayor',null)"], ['balance', "nav('balance',null)"], ['pyg', "nav('pyg',null)"], ['dgii', "nav('dgii',null)"],
  ['prestamos', "nxAbrirPrestamos()"], ['panel-dueno', "nxAbrirSuperadmin()"], ['pos', "nxAbrirPOS()"]];

async function ir(page, js) {
  await page.evaluate((js) => {
    try { closeMobSB(); } catch (e) {} document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
    // nav('x',null) no mueve el ítem activo del menú: se pasa el ítem real del menú (como un toque del usuario).
    js = js.replace(/nav\('([\w-]+)',null\)/g, (m, v) => `nav('${v}',document.querySelector('#sbEl .ni[onclick^="nav(\\'${v}\\'"]'))`);
    try { (0, eval)(js); } catch (e) { console.warn('qa ir: ' + e.message); }
  }, js);
  await sleep(1500);
  await page.evaluate(() => { const c = document.querySelector('.content'); if (c) c.scrollTo(0, 0); });
  await sleep(150);
}

async function recorrer(page, tag, rol, width, tema, capturar) {
  const lista = VISTAS.concat(rol === 'admin' && tema === 'glass-oscuro' ? VISTAS_ADMIN : []);
  const res = {};
  for (const [nom, js, shot] of lista) {
    await ir(page, js);
    const t = await page.evaluate(() => window.__tgo.textos('body'));
    const s = await page.evaluate(() => window.__tgo.superficies());
    const c = await page.evaluate(() => window.__tgo.campos('#cnt'));
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    res[nom] = { textos: t.total, bajo45: t.bajo45, ilegibles: t.oscuroSobreOscuro.length + t.claroSobreClaro.length, superficies: s.n, campos: c.n };
    if (tema === 'glass-oscuro') {
      ok(t.oscuroSobreOscuro.length === 0 && t.claroSobreClaro.length === 0, `${tag} ${nom}: sin texto oscuro sobre oscuro ni blanco sobre blanco (${t.total} textos)`, { oscuro: t.oscuroSobreOscuro.slice(0, 5), claro: t.claroSobreClaro.slice(0, 5) });
      ok(s.malos.length === 0, `${tag} ${nom}: superficies principales ≥4.5:1 (${s.n} medidas)`, s.malos.slice(0, 6));
      ok(c.malos.length === 0, `${tag} ${nom}: campos legibles (${c.n})`, c.malos.slice(0, 5));
      ok(sw[0] <= sw[1], `${tag} ${nom}: sin desborde horizontal`, sw);
      if (capturar && shot) await page.screenshot({ path: OUT + `${shot}-${width}${rol === 'agente' ? '-agente' : ''}.png` });
    }
  }
  // Modal (Nuevo cliente) y modal de abono: hoja blanca legible.
  for (const [nom, js] of [['modal', "nav('clientes',null);setTimeout(()=>abrirNuevoCli(),300)"], ['modal-abono', "nav('clientes',null);setTimeout(()=>abrirAbono(ST.clientes[0].id),300)"]]) {
    await ir(page, js);
    const abierto = await page.evaluate(() => !!document.querySelector('.overlay.open .modal'));
    const t = await page.evaluate(() => window.__tgo.textos('.overlay.open'));
    const c = await page.evaluate(() => window.__tgo.campos('.overlay.open'));
    const s = await page.evaluate(() => window.__tgo.superficies());
    res[nom] = { textos: t.total, bajo45: t.bajo45, ilegibles: t.oscuroSobreOscuro.length + t.claroSobreClaro.length, campos: c.n };
    if (tema === 'glass-oscuro') {
      ok(abierto && t.total > 5 && t.oscuroSobreOscuro.length === 0 && t.claroSobreClaro.length === 0, `${tag} ${nom}: abierto y legible (${t.total} textos)`, { abierto, t: t.oscuroSobreOscuro.concat(t.claroSobreClaro).slice(0, 5) });
      ok(c.malos.length === 0 && s.malos.length === 0, `${tag} ${nom}: campos y rótulos ≥4.5:1 (${c.n} campos)`, { c: c.malos.slice(0, 5), s: s.malos.slice(0, 5) });
      if (capturar && nom === 'modal') await page.screenshot({ path: OUT + `modal-${width}${rol === 'agente' ? '-agente' : ''}.png` });
    }
    await page.evaluate(() => document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')));
  }
  return res;
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('prospectos/reset'); await qa('orgtipo/seguros');

  for (const width of [390, 1280]) for (const rol of ['admin', 'agente']) {
    const tag = `${width}-${rol}`;
    console.log(`\n=== ${tag} ===`);
    // 1) Usuario nuevo: sin preferencia en la base y sin espejo local → glass-oscuro desde el primer cuadro, sin cambio.
    await qa('tema/none');
    const A = await abrir(browser, { width, rol });
    let e = await estadoTema(A.page);
    resumen.primerPintado[tag + ' nuevo'] = { dcl: e.dcl, cuerpo: e.cuerpo, cuadros: e.cuadros.map(c => c.t + '@' + c.ms) };
    ok(e.cuerpo === 'glass-oscuro' && e.dcl && e.dcl.t === 'glass-oscuro' && /rgb\(11, 18, 32\)/.test(e.dcl.bg), `${tag} nuevo: glass-oscuro ya al crear <body> y en DOMContentLoaded (fondo ${e.dcl && e.dcl.bg})`, { cuerpo: e.cuerpo, dcl: e.dcl });
    ok(e.cuadros.length === 1 && e.cuadros[0].t === 'glass-oscuro', `${tag} nuevo: ningún cuadro con otro tema durante la carga (${e.cuadros.length} estado)`, e.cuadros);
    ok(e.html && e.attr === 'glass-oscuro' && e.mirror === 'glass-oscuro', `${tag} nuevo: tras cargar sigue glass-oscuro y el espejo local quedó escrito`, { html: e.html, attr: e.attr, mirror: e.mirror });
    await sleep(1200); const pa = await prefs(rol);
    ok(pa && pa.tema_glass_oscuro_v1 === true && !('tema' in pa), `${tag} nuevo: no se guarda un tema que el usuario no eligió (solo la marca de la migración)`, pa);
    // Recorrido completo en glass-oscuro (+ capturas).
    resumen.contraste[tag] = await recorrer(A.page, tag, rol, width, 'glass-oscuro', true);
    ok(A.errs.length === 0, `${tag} glass-oscuro: sin errores de consola en todo el recorrido`, A.errs.slice(0, 5));
    await A.ctx.close();

    // 2) Usuario con 'clasico' elegido (base + espejo) → clásico desde el primer cuadro y después de cargar.
    await qa('tema/clasico');
    const B = await abrir(browser, { width, rol, mirror: 'clasico' });
    e = await estadoTema(B.page);
    ok(e.cuerpo === 'clasico' && e.dcl.t === 'clasico' && e.cuadros.length === 1 && !e.html && e.attr === 'clasico', `${tag} clásico: clásico en el primer cuadro, en DOMContentLoaded y al final (sin cambio)`, { cuerpo: e.cuerpo, dcl: e.dcl, cuadros: e.cuadros });
    if (width === 1280 && rol === 'admin') resumen.contraste[tag + ' (clásico, referencia)'] = await recorrer(B.page, tag + ' clásico', rol, width, 'clasico', false);
    ok(B.errs.length === 0, `${tag} clásico: sin errores de consola`, B.errs.slice(0, 5));
    await B.ctx.close();
  }

  // Comparación de contraste con el clásico (1280 admin): el tema no empeora la legibilidad medida.
  {
    const g = resumen.contraste['1280-admin'], c = resumen.contraste['1280-admin (clásico, referencia)'];
    const suma = (o, k) => Object.entries(o).filter(([n]) => n in c && n in g).reduce((s, [, v]) => s + v[k], 0);
    const cmp = { glassBajo45: suma(g, 'bajo45'), clasicoBajo45: suma(c, 'bajo45'), glassIlegibles: suma(g, 'ilegibles'), clasicoIlegibles: suma(c, 'ilegibles'), textos: suma(g, 'textos') };
    resumen.comparacion = cmp;
    ok(cmp.glassBajo45 <= cmp.clasicoBajo45 && cmp.glassIlegibles <= cmp.clasicoIlegibles, `1280-admin: textos bajo 4.5:1 glass-oscuro ${cmp.glassBajo45} ≤ clásico ${cmp.clasicoBajo45}; ilegibles ${cmp.glassIlegibles} ≤ ${cmp.clasicoIlegibles} (de ${cmp.textos})`, cmp);
  }

  // 3) Migración única: 'clasico' guardado antes de 58.89 (sin marca) → pasa a glass-oscuro una vez, sin cambio visible.
  for (const width of [390, 1280]) {
    await qa('tema/clasico-viejo');
    const M = await abrir(browser, { width, rol: 'admin' });
    const e = await estadoTema(M.page); await sleep(1200); const p = await prefs('admin');
    ok(e.cuadros.length === 1 && e.cuadros[0].t === 'glass-oscuro' && e.html && p.tema === 'glass-oscuro' && p.tema_glass_oscuro_v1 === true, `${width} migración: 'clasico' anterior pasa una vez a glass-oscuro (guardado + marca), sin cambio de tema en pantalla`, { cuadros: e.cuadros, p });
    await M.ctx.close();
  }
  // 4) Premium elegido (base + espejo): oscuro premium desde el primer cuadro del <body>.
  {
    await qa('tema/premium');
    const P = await abrir(browser, { width: 1280, rol: 'admin', mirror: 'premium' });
    const e = await estadoTema(P.page);
    // (la clase de premium vive en <body>: la pone el primer <script> del <body>, antes de su primer pintado)
    ok(e.dcl.t === 'premium' && e.cuadros.length === 1 && e.cuadros[0].t === 'premium' && e.premium && !e.html, `premium: desde el primer cuadro pintado y al final (sin cambio)`, { dcl: e.dcl, cuadros: e.cuadros });
    await P.ctx.close();
  }
  // 5) Botón viejo «Modo oscuro» (preferencia 'dark' sin 'tema'): la migración antigua a premium sigue igual.
  {
    await qa('tema/legacydark');
    const L = await abrir(browser, { width: 1280, rol: 'admin' });
    const e = await estadoTema(L.page); await sleep(1200); const p = await prefs('admin');
    ok(e.premium && !e.html && p.tema === 'premium', `'dark' viejo sin 'tema' → premium (lógica anterior intacta)`, { e: [e.premium, e.html], p });
    await L.ctx.close();
  }
  // 6) Interruptor por equipo (nx_tgo_off=1): clásico siempre y sin la opción en Apariencia.
  {
    await qa('tema/none');
    const O = await abrir(browser, { width: 1280, rol: 'admin', off: true });
    const e = await estadoTema(O.page);
    await ir(O.page, 'navConfig(12,null)');
    const opc = await O.page.evaluate(() => [...document.querySelectorAll('.tema-opcion')].map(o => o.dataset.tema));
    ok(!e.html && e.cuadros.length === 1 && e.cuadros[0].t === 'clasico' && !opc.includes('glass-oscuro') && opc.length === 4, `interruptor nx_tgo_off: clásico en todos los cuadros y Apariencia sin «Glass oscuro» (${opc.join(', ')})`, { cuadros: e.cuadros, opc });
    await O.ctx.close();
  }
  // 7) Cambiar de tema en Configuración → Apariencia, y el botón de la barra superior.
  for (const width of [390, 1280]) {
    await qa('tema/none');
    const S = await abrir(browser, { width, rol: 'admin' });
    const { page } = S;
    await ir(page, 'navConfig(12,null)');
    const opc = await page.evaluate(() => [...document.querySelectorAll('.tema-opcion')].map(o => o.dataset.tema));
    ok(opc.join() === 'glass-oscuro,clasico,premium,glass,auto' && await page.evaluate(() => document.querySelector('.tema-opcion.tema-sel')?.dataset.tema === 'glass-oscuro'), `${width} Apariencia: 5 temas y «Glass oscuro» marcado como activo`, opc);
    for (const t of ['clasico', 'premium', 'glass', 'auto', 'glass-oscuro']) {
      await page.evaluate((t) => document.querySelector(`.tema-opcion[data-tema="${t}"]`).click(), t); await sleep(500);
      const e = await estadoTema(page);
      const esperado = t === 'auto' ? 'clasico' : t; // Chromium de pruebas: esquema claro
      const real = e.html ? 'glass-oscuro' : e.premium ? 'premium' : e.glass ? 'glass' : 'clasico';
      const sel = await page.evaluate(() => document.querySelector('.tema-opcion.tema-sel')?.dataset.tema);
      const s = await page.evaluate(() => window.__tgo.superficies());
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      ok(real === esperado && e.attr === esperado && e.mirror === t && sel === t && sw[0] <= sw[1], `${width} Apariencia → ${t}: clases, espejo y selección correctos (se ve ${real})`, { real, attr: e.attr, mirror: e.mirror, sel, sw });
      if (t === 'glass-oscuro') ok(s.malos.length === 0, `${width} Apariencia → ${t}: rótulos legibles tras el cambio`, s.malos.slice(0, 5));
    }
    if (width === 1280) await page.screenshot({ path: OUT + 'config-apariencia-1280.png' });
    await sleep(1300);
    ok((await prefs('admin')).tema === 'glass-oscuro', `${width} Apariencia: la elección se guarda en la base (usuario_preferencias)`);
    // Botón de la barra superior: oscuro ⇄ clásico, mismo sistema de temas.
    await page.evaluate(() => toggleDarkMode()); await sleep(400);
    const t1 = await estadoTema(page);
    await page.evaluate(() => toggleDarkMode()); await sleep(400);
    const t2 = await estadoTema(page);
    const ico = await page.evaluate(() => document.getElementById('iconDarkMode')?.className);
    ok(!t1.html && !t1.premium && t1.attr === 'clasico' && t2.html && t2.attr === 'glass-oscuro' && /ti-sun/.test(ico), `${width} botón de la barra: glass-oscuro → clásico → glass-oscuro (ícono sol en oscuro)`, { t1: t1.attr, t2: t2.attr, ico });
    // Elegir Clásico y recargar: el primer cuadro ya es clásico (espejo), sin salto.
    await page.evaluate(() => aplicarTema('clasico')); await sleep(1300);
    await page.reload({ waitUntil: 'load' }); await sleep(3500);
    const r = await estadoTema(page);
    ok(r.cuerpo === 'clasico' && r.cuadros.length === 1 && r.cuadros[0].t === 'clasico' && !r.html, `${width} recarga tras elegir Clásico: clásico desde el primer cuadro, sin salto`, { cuerpo: r.cuerpo, cuadros: r.cuadros });
    await page.evaluate(() => aplicarTema('glass-oscuro')); await sleep(1300);
    await page.reload({ waitUntil: 'load' }); await sleep(3500);
    const r2 = await estadoTema(page);
    ok(r2.cuerpo === 'glass-oscuro' && r2.cuadros.length === 1 && r2.html, `${width} recarga tras volver a Glass oscuro: glass-oscuro desde el primer cuadro`, { cuerpo: r2.cuerpo, cuadros: r2.cuadros });
    ok(S.errs.length === 0, `${width} cambio de temas: sin errores de consola`, S.errs.slice(0, 5));
    await S.ctx.close();
  }
  // 8) Menú lateral y botón flotante (móvil), login, modo liviano.
  {
    await qa('tema/none');
    const V = await abrir(browser, { width: 390, rol: 'admin' });
    const { page } = V;
    await ir(page, "nav('dashboard',null)");
    const liv = await page.evaluate(() => ({ nc: getComputedStyle(document.querySelector('.nc') || document.body).backdropFilter, tnav: getComputedStyle(document.querySelector('.tnav')).backgroundColor }));
    ok(/none/.test(liv.nc) && /0\.9[0-9]|rgb\(/.test(liv.tnav), `390 modo liviano: tarjetas sin desenfoque y barra superior casi sólida (${liv.tnav})`, liv);
    await page.evaluate(() => toggleSB()); await sleep(1200);
    const sb = await page.evaluate(() => { const r = window.__tgo.textos('#sbEl'); const a = getComputedStyle(document.getElementById('sbEl'), '::after').backgroundImage; return { r, a }; });
    ok(sb.r.total > 8 && sb.r.oscuroSobreOscuro.length === 0 && sb.r.claroSobreClaro.length === 0 && /rgb\(18, 26, 44\)/.test(sb.a), `390 menú lateral abierto: panel de cristal oscuro sólido y ${sb.r.total} rótulos legibles`, sb);
    await page.screenshot({ path: OUT + 'menu-390.png' });
    await page.evaluate(() => { try { closeMobSB(); } catch (e) {} }); await sleep(600);
    const fab = await page.$('.nx-fab');
    if (fab) {
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.nx-fab')).backgroundColor);
      await fab.click(); await sleep(700);
      const hoja = await page.evaluate(() => { const s = document.querySelector('.mobile-more-sheet-clean.open'); return s ? { bg: getComputedStyle(s).backgroundColor, t: window.__tgo.textos('.mobile-more-sheet-clean.open') } : null; });
      ok(bg === 'rgb(37, 99, 235)' && hoja && hoja.bg === 'rgb(255, 255, 255)' && hoja.t.oscuroSobreOscuro.length + hoja.t.claroSobreClaro.length === 0, `390 botón flotante azul NEXUS y su menú en hoja blanca legible`, { bg, hoja });
      await page.screenshot({ path: OUT + 'fab-menu-390.png' });
    }
    ok(V.errs.length === 0, '390 menú/botón flotante: sin errores de consola', V.errs.slice(0, 4));
    await V.ctx.close();
    // Login con el tema (sin sesión): el <html> ya trae la clase y el splash usa la escena.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const lp = await ctx.newPage(); const lerr = [];
    lp.on('pageerror', e => lerr.push(e.message));
    await lp.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, body: '' }).catch(() => {}));
    await lp.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    const sp = await lp.evaluate(() => ({ cls: document.documentElement.classList.contains('tema-glass-oscuro'), splash: document.getElementById('nxSplash') ? getComputedStyle(document.getElementById('nxSplash')).backgroundColor : null }));
    await sleep(9000);
    const lg = await lp.evaluate(() => ({ vis: getComputedStyle(document.getElementById('loginScreen')).display !== 'none', box: getComputedStyle(document.querySelector('.lbox')).backgroundColor }));
    ok(sp.cls && sp.splash === 'rgb(20, 28, 46)' && lg.vis && /rgba\(15, 23, 42/.test(lg.box) && lerr.length === 0, `login/splash: tema desde el primer pintado, splash con la escena y tarjeta de login de cristal oscuro`, { sp, lg, lerr });
    await lp.screenshot({ path: OUT + 'login-390.png' });
    await ctx.close();
  }

  await browser.close();
  fs.writeFileSync(OUT + 'resumen-tema-glass.json', JSON.stringify(resumen, null, 1));
  console.log('\nComparación de contraste (1280 admin): ' + JSON.stringify(resumen.comparacion));
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
