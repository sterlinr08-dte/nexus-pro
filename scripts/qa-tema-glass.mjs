// QA del tema «Glass oscuro» (58.89 + v2 58.90, 29-sep-2026; 58.91 «todo oscuro», 30-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js. A 390 y 1280 px, admin y agente:
//  · primer pintado: cuadro a cuadro (requestAnimationFrame) desde que existe <body> hasta 6 s después de cargar, el tema
//    visible nunca cambia (usuario nuevo → glass-oscuro; usuario con 'clasico' → clásico; premium; migración única);
//  · recorre las pantallas de Seguros (+ Préstamos/Panel del dueño/POS como admin) y mide contraste texto/fondo efectivo
//    (sin texto oscuro sobre oscuro ni blanco sobre blanco; ≥4.5:1 en las superficies principales; campos legibles),
//    desborde horizontal, modales, Buzón y errores de consola;
//  · 58.91: ninguna superficie grande clara (luminancia del fondo efectivo de tarjetas/paneles/modales), modales y hojas
//    oscuros, campos oscuros con texto ≥4.5:1, marcador ≥4.5:1, borde ≥3:1 y anillo de foco visible;
//  · cambia de tema en Configuración → Apariencia entre todos los temas (clases, espejo local, preferencia guardada,
//    recarga sin salto) y el botón de la barra superior; interruptor por equipo (nx_tgo_off).
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-tema-glass.mjs   (QA_BASE=http://127.0.0.1:<puerto> si el simulador corre en otro puerto)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-tema-glass')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
// Íconos Tabler reales en las capturas si hay copia local (opcional): QA_TABLER=/ruta con tabler-icons.min.css y fonts/.
const TABLER = process.env.QA_TABLER || '';
const PFX = process.env.QA_PFX || 'v4-'; // prefijo de las capturas
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
  const escenaDe = () => document.documentElement.classList.contains('tema-glass-oscuro') ? { r: 58, g: 48, b: 42, a: 1 } : document.body.classList.contains('tema-premium') ? { r: 11, g: 18, b: 32, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  const fondo = (el) => {
    const capas = [];
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/gradient/.test(cs.backgroundImage) && !/url\(/.test(cs.backgroundImage)) {
        const cc = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
        if (cc.length) { const sa = cc.reduce((s, c) => s + c.a, 0) || 1; const m = cc.reduce((s, c) => ({ r: s.r + c.r * c.a / sa, g: s.g + c.g * c.a / sa, b: s.b + c.b * c.a / sa, a: s.a + c.a / cc.length }), { r: 0, g: 0, b: 0, a: 0 }); /* promedio ponderado por opacidad: «transparent» no oscurece */ capas.push(m); if (m.a >= 0.99) break; }
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
      const root = document.querySelector(raiz) || document.body, r = { total: 0, bajo45: 0, lista45: [], bajo3: [], oscuroSobreOscuro: [], claroSobreClaro: [] };
      root.querySelectorAll('*').forEach(el => {
        if (el.closest('svg') || /^(SCRIPT|STYLE|svg|path|CANVAS|IMG|BR|OPTION|I)$/i.test(el.tagName) || el.closest('.ti')) return;
        if (![...el.childNodes].some(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent))) return; // sin letras ni cifras (emoji, «·») no cuenta
        if (!visible(el)) return;
        const m = medir(el); if (!m) return; r.total++;
        const grande = m.fs >= 24 || (m.fs >= 18.66 && m.fw >= 700);
        if (m.r < (grande ? 3 : 4.5)) { r.bajo45++; if (r.lista45.length < 12) r.lista45.push([nombre(el), el.textContent.trim().slice(0, 24), +m.r.toFixed(2)]); }
        if (m.r < 3) r.bajo3.push([nombre(el), el.textContent.trim().slice(0, 24), +m.r.toFixed(2)]);
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
    // 58.91 — superficies grandes claras: todo elemento visible de ≥ 4 000 px² cuyo fondo efectivo (capas compuestas hasta
    // la escena) tenga luminancia > 0.35 (≈ gris medio claro). Se excluyen imágenes/lienzos, las vistas previas de los temas
    // claros en Apariencia (son muestras a propósito) y lo que no tiene fondo propio.
    claras(raiz) {
      const root = document.querySelector(raiz) || document.body, malos = []; let n = 0, max = 0;
      root.querySelectorAll('*').forEach(el => {
        if (/^(IMG|CANVAS|SVG|VIDEO|IFRAME|PATH|I|OPTION)$/i.test(el.tagName) || el.closest('svg,.tema-opcion,.ti')) return;
        const b = el.getBoundingClientRect(); const w = Math.min(b.right, innerWidth) - Math.max(b.left, 0), h = Math.min(b.bottom, innerHeight) - Math.max(b.top, 0);
        if (w < 40 || h < 24 || w * h < 4000) return;
        const cs = getComputedStyle(el); const own = parse(cs.backgroundColor);
        if (!(own && own.a > 0.02) && !/gradient/.test(cs.backgroundImage)) return;
        if (!visible(el)) return;
        const f = fondo(el); if (Math.max(f.r, f.g, f.b) - Math.min(f.r, f.g, f.b) > 90) return; // color de acento (ícono verde de WhatsApp, botones azules): no es una superficie clara
        n++; const L = lum(f); if (L > max) max = L;
        if (L > 0.35) malos.push([nombre(el), Math.round(w * h), +L.toFixed(2)]);
      });
      return { n, malos, max: +max.toFixed(3) };
    },
    // 58.91 — campos: fondo oscuro, texto ≥4.5:1, marcador ≥4.5:1 y borde ≥3:1 contra lo que rodea al campo.
    camposOscuros(raiz) {
      const root = document.querySelector(raiz) || document.body, malos = []; let n = 0;
      root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=color]):not([type=file]),select,textarea').forEach(el => {
        if (!visible(el)) return; n++;
        const cs = getComputedStyle(el), bg = fondo(el), ent = el.parentElement ? fondo(el.parentElement) : bg;
        const t = parse(cs.color), ph = parse(getComputedStyle(el, '::placeholder').color), bd = parse(cs.borderTopColor), bw = parseFloat(cs.borderTopWidth) || 0;
        const r = { fondo: +lum(bg).toFixed(3), texto: t ? +ratio(over(t, bg), bg).toFixed(2) : 0 };
        if (el.tagName !== 'SELECT' && ph) r.marcador = +ratio(over(ph, bg), bg).toFixed(2);
        // borde: si el campo no tiene borde propio (va dentro de un buscador con marco), cuenta el contraste del relleno contra su entorno
        r.borde = bw >= 1 && bd ? +ratio(over(bd, ent), ent).toFixed(2) : +ratio(bg, ent).toFixed(2);
        const marco = el.closest('.nxBusca,.nxCrmSearch,.nxWaRefTextPill');
        if (marco) { const mcs = getComputedStyle(marco), mb = parse(mcs.borderTopColor), me = marco.parentElement ? fondo(marco.parentElement) : bg; r.borde = mb && parseFloat(mcs.borderTopWidth) >= 1 ? +ratio(over(mb, me), me).toFixed(2) : r.borde; }
        if (r.fondo > 0.2 || r.texto < 4.5 || (r.marcador !== undefined && r.marcador < 4.5) || r.borde < 3) malos.push([nombre(el), r]);
      });
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
  ['prestamos', "nxAbrirPrestamos()", 'prestamos'], ['panel-dueno', "nxAbrirSuperadmin()"], ['pos', "nxAbrirPOS()"]];

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
    res[nom] = { textos: t.total, bajo45: t.bajo45, bajo3: t.bajo3.length, ilegibles: t.oscuroSobreOscuro.length + t.claroSobreClaro.length, superficies: s.n, campos: c.n };
    if (tema === 'glass-oscuro') ok(t.bajo3.length === 0, `${tag} ${nom}: ningún texto por debajo de 3:1`, t.bajo3.slice(0, 5));
    if (tema === 'glass-oscuro') {
      ok(t.oscuroSobreOscuro.length === 0 && t.claroSobreClaro.length === 0, `${tag} ${nom}: sin texto oscuro sobre oscuro ni blanco sobre blanco (${t.total} textos)`, { oscuro: t.oscuroSobreOscuro.slice(0, 5), claro: t.claroSobreClaro.slice(0, 5) });
      ok(s.malos.length === 0, `${tag} ${nom}: superficies principales ≥4.5:1 (${s.n} medidas)`, s.malos.slice(0, 6));
      ok(c.malos.length === 0, `${tag} ${nom}: campos legibles (${c.n})`, c.malos.slice(0, 5));
      ok(sw[0] <= sw[1], `${tag} ${nom}: sin desborde horizontal`, sw);
      if (capturar && shot) await page.screenshot({ path: OUT + PFX + `${shot}-${width}${rol === 'agente' ? '-agente' : ''}.png` });
    }
    if (tema === 'glass-oscuro') {
      const cl = await page.evaluate(() => window.__tgo.claras('#app'));
      const co = await page.evaluate(() => window.__tgo.camposOscuros('#cnt'));
      res[nom].claras = cl.malos.length; res[nom].lumMax = cl.max;
      ok(cl.malos.length === 0, `${tag} ${nom}: sin superficies grandes claras (${cl.n} superficies, luminancia máx. ${cl.max})`, cl.malos.slice(0, 6));
      ok(co.malos.length === 0, `${tag} ${nom}: campos oscuros — texto y marcador ≥4.5:1, borde ≥3:1 (${co.n})`, co.malos.slice(0, 4));
    }
  }
  // Modal (Nuevo cliente) y modal de abono: hoja blanca legible.
  for (const [nom, js] of [['modal', "nav('clientes',null);setTimeout(()=>abrirNuevoCli(),300)"], ['modal-abono', "nav('clientes',null);setTimeout(()=>abrirAbono(ST.clientes[0].id),300)"]]) {
    await ir(page, js);
    const abierto = await page.evaluate(() => !!document.querySelector('.overlay.open .modal'));
    const t = await page.evaluate(() => window.__tgo.textos('.overlay.open'));
    const c = await page.evaluate(() => window.__tgo.campos('.overlay.open'));
    const s = await page.evaluate(() => window.__tgo.superficies());
    res[nom] = { textos: t.total, bajo45: t.bajo45, bajo3: t.bajo3.length, ilegibles: t.oscuroSobreOscuro.length + t.claroSobreClaro.length, campos: c.n };
    if (tema === 'glass-oscuro') {
      ok(abierto && t.total > 5 && t.oscuroSobreOscuro.length === 0 && t.claroSobreClaro.length === 0, `${tag} ${nom}: abierto y legible (${t.total} textos)`, { abierto, t: t.oscuroSobreOscuro.concat(t.claroSobreClaro).slice(0, 5) });
      ok(c.malos.length === 0 && s.malos.length === 0, `${tag} ${nom}: campos y rótulos ≥4.5:1 (${c.n} campos)`, { c: c.malos.slice(0, 5), s: s.malos.slice(0, 5) });
      const md = await page.evaluate(() => { const m = document.querySelector('.overlay.open .modal'); if (!m) return null; const cl = window.__tgo.claras('.overlay.open .modal'); const co = window.__tgo.camposOscuros('.overlay.open'); return { bg: getComputedStyle(m).backgroundImage.slice(0, 80), cl, co }; });
      ok(md && md.cl.malos.length === 0 && md.cl.max < 0.2, `${tag} ${nom}: ventana en cristal oscuro, sin superficies claras dentro (luminancia máx. ${md && md.cl.max})`, md);
      ok(md && md.co.malos.length === 0 && md.co.n > 0, `${tag} ${nom}: campos oscuros — texto/marcador ≥4.5:1, borde ≥3:1 (${md && md.co.n} campos)`, md && md.co.malos.slice(0, 4));
      // (se espera a que termine la transición de sombra/borde del campo antes de medir)
      const hayCampo = await page.evaluate(() => { const i = [...document.querySelectorAll('.overlay.open .modal input:not([type=checkbox]):not([type=radio]):not([type=hidden])')].find(e => e.offsetParent); if (!i) return false; i.setAttribute('data-qa-foco', '1'); i.focus(); return true; });
      await sleep(450);
      const foco = hayCampo ? await page.evaluate(() => { const i = document.querySelector('[data-qa-foco]'); const cs = getComputedStyle(i); const r = { sombra: cs.boxShadow, borde: cs.borderTopColor, outline: cs.outlineStyle, activo: document.activeElement === i }; i.blur(); i.removeAttribute('data-qa-foco'); return r; }) : null;
      ok(foco && (/rgba?\(96, 165, 250/.test(foco.sombra) || foco.outline !== 'none') && /96, 165, 250/.test(foco.borde), `${tag} ${nom}: anillo de foco azul visible al escribir`, foco);
      if (capturar && nom === 'modal') await page.screenshot({ path: OUT + PFX + `modal-${width}${rol === 'agente' ? '-agente' : ''}.png` });
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
    ok(e.cuerpo === 'glass-oscuro' && e.dcl && e.dcl.t === 'glass-oscuro' && /rgb\(12, 26, 48\)/.test(e.dcl.bg), `${tag} nuevo: glass-oscuro ya al crear <body> y en DOMContentLoaded (fondo ${e.dcl && e.dcl.bg})`, { cuerpo: e.cuerpo, dcl: e.dcl });
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
    cmp.glassBajo3 = suma(g, 'bajo3'); cmp.clasicoBajo3 = suma(c, 'bajo3');
    ok(cmp.glassBajo45 <= cmp.clasicoBajo45 && cmp.glassIlegibles <= cmp.clasicoIlegibles, `1280-admin: textos bajo 4.5:1 glass-oscuro ${cmp.glassBajo45} ≤ clásico ${cmp.clasicoBajo45}; ilegibles ${cmp.glassIlegibles} ≤ ${cmp.clasicoIlegibles} (de ${cmp.textos})`, cmp);
    ok(cmp.glassBajo45 <= 20 && cmp.glassBajo3 === 0, `1280-admin (58.91): meta de contraste — bajo 4.5:1 = ${cmp.glassBajo45} (≤20) y bajo 3:1 = ${cmp.glassBajo3} (0)`, cmp);
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
    if (width === 1280) await page.screenshot({ path: OUT + PFX + 'config-apariencia-1280.png' });
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
    ok(/none/.test(liv.nc) && /0\.9[0-9]|rgb\(/.test(liv.tnav), `390 modo liviano: tarjetas sin desenfoque y cabecera casi sólida (${liv.tnav})`, liv);
    // Cabecera móvil mínima: menú + título + campana (+ actualizar, que ya estaba); sin barra inferior.
    const cab = await page.evaluate(() => { const t = document.querySelector('.tnav'); const vis = [...t.querySelectorAll('button,[role=button],.pttl')].filter(e => e.offsetParent && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map(e => e.id || e.className.split(' ').slice(0, 2).join('.') || e.tagName); const bb = [...document.querySelectorAll('.mobile-bottom-nav-clean,[class*=bottom-nav]')].filter(e => e.offsetParent && e.getBoundingClientRect().height > 0).length; return { vis, alto: Math.round(t.getBoundingClientRect().height), titulo: document.getElementById('pttl').innerText, bb }; });
    ok(cab.vis.includes('tn-tog') && cab.vis.includes('pttl') && cab.vis.some(v => /notif-bell/.test(v)) && cab.alto <= 76 && cab.bb === 0, `390 cabecera mínima: menú + título «${cab.titulo}» + campana (${cab.vis.join(', ')}; ${cab.alto} px) y sin barra inferior`, cab);
    await page.screenshot({ path: OUT + PFX + 'inicio-390.png' });
    await page.evaluate(() => toggleSB()); await sleep(1200);
    // 30-sep (menú de cristal): el panel del cajón ya no es grafito sólido sino cristal (tinte con alfa + blur ≥ 20 px).
    const sb = await page.evaluate(() => { const r = window.__tgo.textos('#sbEl'); const c = getComputedStyle(document.getElementById('sbEl'), '::after'); return { r, a: c.backgroundImage, blur: c.backdropFilter || c.webkitBackdropFilter }; });
    const abierto = await page.evaluate(() => document.getElementById('sbEl').classList.contains('mob-open') && getComputedStyle(document.querySelector('#sbEl .ni .ni-l')).display !== 'none');
    ok(abierto && sb.r.total > 8 && sb.r.oscuroSobreOscuro.length === 0 && sb.r.claroSobreClaro.length === 0 && /rgba\(30, 48, 80, 0\.62\)/.test(sb.a) && /blur\((2\d|[3-9]\d)px\)/.test(sb.blur), `390 cajón móvil de siempre: abre con nombres, cristal azul noche y ${sb.r.total} rótulos legibles`, sb);
    await page.screenshot({ path: OUT + PFX + 'menu-390.png' });
    await page.evaluate(() => { try { closeMobSB(); } catch (e) {} }); await sleep(600);
    const fab = await page.$('.nx-fab');
    if (fab) {
      const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.nx-fab')).backgroundColor);
      await fab.click(); await sleep(700);
      const hoja = await page.evaluate(() => { const s = document.querySelector('.mobile-more-sheet-clean.open'); return s ? { bg: getComputedStyle(s).backgroundColor, t: window.__tgo.textos('.mobile-more-sheet-clean.open') } : null; });
      const hojaL = await page.evaluate(() => { const s = document.querySelector('.mobile-more-sheet-clean.open'); return s ? window.__tgo.claras('.mobile-more-sheet-clean.open') : null; });
      ok(bg === 'rgb(37, 99, 235)' && hoja && /gradient/.test(await page.evaluate(() => getComputedStyle(document.querySelector('.mobile-more-sheet-clean.open')).backgroundImage)) && hojaL && hojaL.malos.length === 0 && hoja.t.oscuroSobreOscuro.length + hoja.t.claroSobreClaro.length === 0 && hoja.t.bajo3.length === 0, `390 botón flotante azul NEXUS y su menú en hoja oscura legible (58.91)`, { bg, hoja, hojaL });
      await page.screenshot({ path: OUT + PFX + 'fab-menu-390.png' });
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
    ok(sp.cls && sp.splash === 'rgb(12, 26, 48)' && lg.vis && /rgba\(14, 28, 52/.test(lg.box) && lerr.length === 0, `login/splash: tema desde el primer pintado, splash con la escena y tarjeta de login de cristal oscuro`, { sp, lg, lerr });
    await lp.screenshot({ path: OUT + PFX + 'login-390.png' });
    await ctx.close();
  }

  // 9) v2 (58.90): riel solo de íconos con tooltips, paneles flotantes, cabecera dentro del panel (sin barra), foto.
  {
    await qa('tema/none');
    const R = await abrir(browser, { width: 1280, rol: 'admin' });
    const { page } = R;
    await ir(page, "nav('dashboard',null)");
    // Riel
    const riel = await page.evaluate(() => {
      const sb = document.getElementById('sbEl'), b = sb.getBoundingClientRect();
      const items = [...sb.querySelectorAll('.ni')].filter(n => !n.closest('#sbContab,#sbConfig') && n.offsetParent && getComputedStyle(n).display !== 'none');
      // 30-sep (menú de cristal): la etiqueta existe en el DOM (se revela al expandir) pero en el riel contraído va con opacidad 0
      const conNombre = items.filter(n => n.querySelector('.ni-l') && getComputedStyle(n.querySelector('.ni-l')).display !== 'none' && +getComputedStyle(n.querySelector('.ni-l')).opacity > 0);
      const sinAria = items.filter(n => !(n.getAttribute('aria-label') || '').trim());
      const on = sb.querySelector('.spring-ind'), onR = on.getBoundingClientRect();
      const av = sb.querySelector('.sb-av').getBoundingClientRect();
      return { w: Math.round(b.width), left: Math.round(b.left), top: Math.round(b.top), bottom: Math.round(innerHeight - b.bottom), radius: getComputedStyle(sb, '::before').borderRadius, n: items.length, conNombre: conNombre.length, sinAria: sinAria.length,
        cuadros: items.every(n => { const r = n.getBoundingClientRect(); return Math.round(r.width) === 76 && Math.round(r.height) === 48; }), // 30-sep: filas de borde a borde (76×48)
        activo: { w: Math.round(onR.width), h: Math.round(onR.height), bg: getComputedStyle(on).backgroundColor }, avatarAbajo: Math.round(b.bottom - av.bottom) < 40 };
    });
    ok(riel.w === 76 && riel.left >= 10 && riel.top >= 10 && riel.bottom >= 10 && riel.radius === '26px' && riel.cuadros && riel.conNombre === 0, `1280 riel flotante solo de íconos: ${riel.w} px, separado de los bordes, radio ${riel.radius}, ${riel.n} filas de 76×48 sin texto visible`, riel);
    ok(riel.sinAria === 0 && riel.activo.bg === 'rgb(37, 99, 235)' && riel.activo.w === 76 && riel.activo.h === 48 && riel.avatarAbajo, `1280 riel: aria-label en cada ícono, activo = barra azul de borde a borde 76×48, avatar al pie`, riel);
    // Gráfica «Cobros del ciclo» acumulada (58.91): último punto = cobrado en el ciclo; etiqueta del día al pasar el mouse.
    const gr = await page.evaluate(() => { const ch = _nxIG.ch, d = (t) => String(t || '').replace(/[^\d]/g, ''); return { ultimo: ch && ch.acum[ch.acum.length - 1], monotona: ch && ch.acum.every((v, i, a) => !i || v >= a[i - 1]), suma: ch && ch.serie.slice(0, ch.acum.length).reduce((s, v) => s + v, 0), ciclo: d(document.getElementById('nxIGcy1').textContent), tip: document.getElementById('nxIGchTip').textContent, sub: document.getElementById('nxIGchs').textContent }; });
    ok(gr.ultimo > 0 && String(Math.round(gr.ultimo)) === gr.ciclo && gr.monotona && gr.ultimo === gr.suma && /Acumulado/.test(gr.sub), `1280 gráfica acumulada: último punto ${gr.ultimo} = «cobrado en el ciclo» ${gr.ciclo}, sin bajadas`, gr);
    const bx = await page.evaluate(() => { const b = document.getElementById('nxIGchPlot').getBoundingClientRect(), ch = _nxIG.ch; let i = ch.serie.findIndex(v => v > 0); return { x: b.left + (i / (ch.N - 1)) * b.width, y: b.top + b.height / 2, i, dia: ch.serie[i], acum: ch.acum[i] }; });
    await page.mouse.move(bx.x, bx.y); await sleep(250);
    const tipD = await page.evaluate(() => document.getElementById('nxIGchTip').textContent);
    ok(/\(\+RD\$/.test(tipD) && tipD.replace(/\s/g, '').includes(String(bx.acum.toLocaleString('en-US'))), `1280 al pasar el mouse la etiqueta muestra acumulado y lo cobrado ese día: «${tipD}»`, { tipD, bx });
    await page.mouse.move(700, 700); await sleep(200);
    ok(await page.evaluate(() => document.getElementById('nxIGchTip').textContent) === gr.tip, '1280 al salir de la gráfica vuelve al total del ciclo');
    // Tooltip con hover y con foco de teclado
    const itemSel = '#sbEl .ni[onclick^="nav(\'facturas\'"]';
    await page.hover(itemSel); await sleep(300);
    const tip = await page.evaluate((s) => { const n = document.querySelector(s), a = getComputedStyle(n, '::after'); return { op: a.opacity, txt: a.content, label: n.getAttribute('aria-label'), pos: a.position }; }, itemSel);
    ok(tip.op === '1' && tip.txt.replace(/"/g, '') === tip.label && tip.label.length > 2, `1280 tooltip al pasar el mouse: «${tip.label}»`, tip);
    await page.mouse.move(700, 400); await page.keyboard.press('Tab'); await page.focus('#sbEl .ni[onclick^="nav(\'clientes\'"]'); await sleep(600);
    const tipF = await page.evaluate(() => { const n = document.activeElement; return { fv: n.matches(':focus-visible'), op: getComputedStyle(n, '::after').opacity, label: n.getAttribute('aria-label') }; });
    ok(tipF.fv && tipF.op === '1', `1280 tooltip con foco de teclado (:focus-visible) en «${tipF.label}»`, tipF);
    // Paneles flotantes
    await page.mouse.move(700, 400);
    await page.click('#niContab'); await sleep(700);
    const fl = await page.evaluate(() => { const f = document.getElementById('sbContab'), r = f.getBoundingClientRect(), cs = getComputedStyle(f); const it = f.querySelector('.ni'); return { vis: cs.visibility, pos: cs.position, left: Math.round(r.left), top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight, conNombre: getComputedStyle(it.querySelector('.ni-l')).display !== 'none', nav: Math.round(document.getElementById('sbEl').getBoundingClientRect().width) }; });
    ok(fl.vis === 'visible' && fl.pos === 'fixed' && fl.left >= 88 && fl.top >= 0 && fl.bottom <= fl.h && fl.conNombre && fl.nav === 76, `1280 Contabilidad abre un panel flotante junto al riel (x=${fl.left}, ${fl.top}–${fl.bottom}) con nombres; el riel no se ensancha`, fl);
    await page.screenshot({ path: OUT + PFX + 'menu-flyout-1280.png' });
    await page.click('#niAdmin2'); await sleep(700);
    const dos = await page.evaluate(() => [getComputedStyle(document.getElementById('sbContab')).visibility, getComputedStyle(document.getElementById('sbConfig')).visibility]);
    ok(dos[0] === 'hidden' && dos[1] === 'visible', '1280 un panel a la vez: abrir Configuración cierra Contabilidad', dos);
    await page.keyboard.press('Escape'); await sleep(500);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('sbConfig')).visibility === 'hidden'), '1280 Escape cierra el panel flotante');
    await page.click('#niContab'); await sleep(600); await page.mouse.click(900, 500); await sleep(600);
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('sbContab')).visibility === 'hidden'), '1280 tocar fuera cierra el panel flotante');
    await page.click('#niContab'); await sleep(600);
    await page.click('#sbContab .ni[onclick^="nav(\'comisiones\'"]'); await sleep(1200);
    const nv = await page.evaluate(() => ({ on: document.getElementById('v-comisiones').classList.contains('on'), cerrado: getComputedStyle(document.getElementById('sbContab')).visibility === 'hidden', padre: getComputedStyle(document.getElementById('niContab')).backgroundColor }));
    ok(nv.on && nv.cerrado && nv.padre === 'rgb(37, 99, 235)', '1280 elegir «Comisiones» en el panel navega, cierra el panel y marca en azul el ícono de Contabilidad', nv);
    // Sin barra superior: la cabecera es la primera fila del panel principal; cada acción una sola vez y alcanzable.
    await ir(page, "nav('dashboard',null)");
    const ACC = ['refrescarDatos', 'abrirLog', 'toggleNotif', 'toggleDarkMode', 'abrirGlobalSearch', 'instalarApp', 'abrirBackup', 'desconectar'];
    const cab = await page.evaluate((ACC) => {
      const t = document.querySelector('.tnav'), m = document.querySelector('.main'), tr = t.getBoundingClientRect(), mr = m.getBoundingClientRect();
      const vis = (e) => e.offsetParent && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
      const r = {};
      ACC.forEach(f => { const els = [...document.querySelectorAll(`#app [onclick*="${f}("]`)].filter(vis); const alcanzable = els.filter(e => { const b = e.getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + b.height / 2; const top = document.elementFromPoint(x, y); return top && (top === e || e.contains(top)); }); r[f] = [els.length, alcanzable.length]; });
      const searchIG = [...document.querySelectorAll('#nxIG .nxIG-search')].filter(vis).length;
      return { r, searchIG, dentro: tr.top >= mr.top && tr.left >= mr.left && tr.right <= mr.right + 1, fondo: getComputedStyle(t).backgroundColor, borde: getComputedStyle(t).borderTopWidth, mainBg: getComputedStyle(m, '::before').backgroundColor, radio: getComputedStyle(m).borderTopLeftRadius, tog: getComputedStyle(document.querySelector('.tn-tog')).display, titulo: document.getElementById('pttl').innerText, tituloFs: getComputedStyle(document.getElementById('pttl')).fontSize };
    }, ACC);
    const unaVez = ACC.every(f => cab.r[f][0] === 1 && cab.r[f][1] === 1);
    ok(cab.dentro && cab.fondo === 'rgba(0, 0, 0, 0)' && cab.borde === '0px' && cab.radio === '24px' && /rgba\(14, 28, 52/.test(cab.mainBg) && cab.tog === 'none', `1280 sin barra superior: la cabecera («${cab.titulo}», ${cab.tituloFs}) es la primera fila del panel principal de cristal (radio ${cab.radio})`, cab);
    ok(unaVez && cab.searchIG === 0, `1280 cada acción de la antigua barra aparece UNA vez y se puede tocar: ${ACC.map(f => f + ' ' + cab.r[f][0]).join(', ')}`, cab.r);
    for (const [f, sel, chk] of [['toggleNotif', '.tnav .notif-bell', "document.getElementById('notifPanel').classList.contains('show')"], ['abrirGlobalSearch', '.tnav .tn-b-primary', "document.getElementById('gsOverlay').classList.contains('show')"]]) {
      await page.click(sel); await sleep(500);
      ok(await page.evaluate((c) => (0, eval)(c), chk), `1280 la acción ${f} funciona desde la cabecera`);
      await page.keyboard.press('Escape'); await page.evaluate(() => { try { cerrarGlobalSearch(); } catch (e) {} document.getElementById('notifPanel').classList.remove('show'); }); await sleep(300);
    }
    await page.screenshot({ path: OUT + PFX + 'inicio-1280-cabecera.png' });
    ok(R.errs.length === 0, '1280 riel/paneles/cabecera: sin errores de consola', R.errs.slice(0, 5));
    await R.ctx.close();
  }
  // 10) Foto de fondo: el degradado se ve desde el primer pintado; la foto entra con fundido sin mover nada.
  for (const width of [390, 1280]) {
    await qa('tema/none');
    // serviceWorkers:'block': la foto se pide después de `load`; si el service worker ya controla la página, su fetch no
    // pasaría por page.route y la prueba no lo vería.
    const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, isMobile: width < 500, hasTouch: width < 500, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const fotos = [];
    // Se retrasa la foto 7 s (app ya pintada) para ver el marcador de posición y medir justo el cambio de la foto.
    await page.route(/fondo-login/, async r => { await sleep(7000); fotos.push(r.request().url()); return r.continue(); });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url(); if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); } return r.fulfill({ status: 200, body: '' }); } catch (e) {} });
    await page.addInitScript(({ id }) => {
      localStorage.setItem('nx_auth_mode', 'legacy');
      sessionStorage.setItem('nx_sesion', JSON.stringify({ id, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
      sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
      window.__cls = 0; try { new PerformanceObserver(l => { l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; }); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
      const medidas = () => ['.main', '#sbEl', '#cnt', '.tnav'].map(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; });
      let prev = null; const vig = () => { const h = document.documentElement; if (h && h.classList.contains('tgo-foto')) { window.__fotoAntes = prev; return; } if (document.body && document.getElementById('app')) prev = { rects: medidas(), cls: window.__cls, visible: getComputedStyle(document.getElementById('app')).display !== 'none' }; requestAnimationFrame(vig); }; requestAnimationFrame(vig); // último cuadro SIN foto
      document.addEventListener('DOMContentLoaded', () => { const b = getComputedStyle(document.documentElement, '::before'), a = getComputedStyle(document.documentElement, '::after'); window.__fotoDCL = { grad: /gradient/.test(b.backgroundImage), antes: a.opacity, clase: document.documentElement.classList.contains('tgo-foto') }; }, { once: true });
    }, { id: ID.admin });
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
    await sleep(600);
    const antes = await page.evaluate(() => ({ dcl: window.__fotoDCL, clase: document.documentElement.classList.contains('tgo-foto') }));
    await page.waitForFunction(() => document.documentElement.classList.contains('tgo-foto'), null, { timeout: 15000 }).catch(() => {});
    await sleep(900);
    const fa = await page.evaluate(() => window.__fotoAntes);
    const despues = await page.evaluate(() => { const a = getComputedStyle(document.documentElement, '::after'); return { clase: document.documentElement.classList.contains('tgo-foto'), op: a.opacity, img: /fondo-login/.test(a.backgroundImage), filtro: a.filter, cls: window.__cls, rects: ['.main', '#sbEl', '#cnt', '.tnav'].map(s => { const b = document.querySelector(s).getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; }) }; });
    const archivo = width < 500 ? 'fondo-login-movil.webp' : 'fondo-login.webp';
    const kb = Math.round(fs.statSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', archivo)).size / 1024);
    ok(antes.dcl && antes.dcl.grad && antes.dcl.antes === '0' && !antes.dcl.clase && fa && fa.visible, `${width} primer pintado: degradado cálido visible y la foto oculta hasta cargar (la app ya estaba en pantalla con el degradado)`, { antes, fa });
    ok(despues.clase && despues.op === '1' && despues.img && despues.filtro === 'none' && fotos.some(u => u.includes(archivo)), `${width} la foto ${archivo} (${kb} KB, mismo fondo del login, sin filter en CSS) entra con fundido`, { despues, fotos });
    const dcls = despues.cls - (fa ? fa.cls : 0);
    ok(fa && JSON.stringify(fa.rects) === JSON.stringify(despues.rects) && dcls < 0.001, `${width} la foto no mueve nada: mismas medidas de panel/menú/contenido/cabecera antes y después, desplazamiento acumulado (CLS) al entrar la foto ${dcls.toFixed(4)}`, { antes: fa, despues: despues.rects, dcls });
    ok(kb < (width < 500 ? 90 : 200), `${width} peso de ${archivo}: ${kb} KB`);
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(OUT + 'resumen-tema-glass.json', JSON.stringify(resumen, null, 1));
  console.log('\nComparación de contraste (1280 admin): ' + JSON.stringify(resumen.comparacion));
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
