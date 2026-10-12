// QA del modo claro (59.22, 12-oct-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js, tema Clásico con el modo claro encendido (html.tema-claro, «gemelo claro del grafito»):
//  · primer cuadro pintado con <body>: html.tema-claro y fondo #EEF1F5, nunca un cuadro del grafito; pantalla de carga clara;
//    theme-color #EEF1F5; escena con la oficina desenfocada (html.tgc-foto) y sin la foto nítida (#nxBgPhoto);
//  · acento único azul NEXUS (--c1 #2563EB) e íconos planos (sin bolitas 3D de color);
//  · 390×844 (UA iPhone) y 1280×800: Inicio, Clientes, Cobros, Pólizas y WhatsApp sin superficies grandes oscuras ni textos bajo 3:1;
//  · barra de arriba: botones de cristal claro con el ícono #334155 (sin «caramelo» 3D); título en el celular;
//  · menú = RIEL AZUL NEXUS (dueño, 12-oct): cajón ☰ (390) y riel (1280) en azul con desenfoque, nombres blancos legibles sobre
//    el azul, el elegido en píldora blanca con el texto azul; en la computadora la rayita de brillo del elegido (dueño, 02-oct)
//    y la píldora sigue a WhatsApp y al CRM (marcan su botón por su cuenta); nombre y rol del usuario sin montarse;
//  · ventana «Nuevo cliente»: hoja blanca, campos con filo gris (sin el borde morado) y anillo azul al enfocar;
//  · WhatsApp: la regla del aviso vacío pinta el ícono (no el texto «ea4a»);
//  · Configuración → Apariencia: la opción se llama «Claro»; botón sol/luna con su nombre; claro ⇄ grafito en vivo;
//  · «reducir transparencia» (si el Chromium de pruebas la emula): riel en azul sólido y panel principal en blanco sólido, sin desenfoque;
//  · interruptor por equipo nx_claro_off=1: el Clásico de antes (acento morado, sin html.tema-claro, foto nítida, carril de 210 px);
//  · sin errores de consola.
// Uso: PORT=8975 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8975 QA_OUT=/ruta node scripts/qa-modo-claro.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-modo-claro')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => r(s)); }).on('error', () => r('')));
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, { off = false } = {}) {
  const movil = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, userAgent: movil ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return await r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript(({ off }) => {
    if (!sessionStorage.getItem('__qaIni')) {
      sessionStorage.setItem('__qaIni', '1'); localStorage.setItem('nx_tema', 'clasico'); localStorage.removeItem('nx_tgo_off');
      if (off) localStorage.setItem('nx_claro_off', '1'); else localStorage.removeItem('nx_claro_off');
    }
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    // Lo que ve el usuario en cada cuadro desde que existe <body> (los primeros ~2 s).
    window.__qcCuadros = [];
    const tick = () => {
      if (document.body) { const d = document.documentElement, sp = document.getElementById('nxSplash');
        window.__qcCuadros.push({ claro: d.classList.contains('tema-claro'), grafito: d.classList.contains('tema-glass-oscuro'), bg: getComputedStyle(d).backgroundColor, splash: sp ? getComputedStyle(sp).backgroundColor : null }); }
      if (window.__qcCuadros.length < 120) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { off });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2500);
  await page.evaluate(MEDIR);
  return { ctx, page, errs };
}

// ── medición en la página (mismo criterio que qa-tema-glass: capas compuestas hasta la escena) ──
const MEDIR = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => { const a = t.a + b.a * (1 - t.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (t.r * t.a + b.r * b.a * (1 - t.a)) / a, g: (t.g * t.a + b.g * b.a * (1 - t.a)) / a, b: (t.b * t.a + b.b * b.a * (1 - t.a)) / a, a }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Escena del modo claro: el gris #EEF1F5 de la base (más exigente para el texto oscuro que el blanco del velo).
  const ESCENA = { r: 238, g: 241, b: 245, a: 1 };
  const promedio = (img) => { const cc = (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); if (!cc.length) return null; const sa = cc.reduce((s, c) => s + c.a, 0) || 1; return cc.reduce((s, c) => ({ r: s.r + c.r * c.a / sa, g: s.g + c.g * c.a / sa, b: s.b + c.b * c.a / sa, a: s.a + c.a / cc.length }), { r: 0, g: 0, b: 0, a: 0 }); };
  // El menú pinta su panel en un seudoelemento (::before en la computadora, ::after en el cajón): cuenta como capa del menú.
  const panelMenu = (a) => { if (a.id !== 'sbEl') return null; const cs = getComputedStyle(a, innerWidth <= 768 ? '::after' : '::before'); if (cs.display === 'none') return null; const m = promedio(cs.backgroundImage); const bg = parse(cs.backgroundColor); return m && bg && bg.a > 0 ? over(m, bg) : m || (bg && bg.a > 0 ? bg : null); };
  const fondo = (el) => {
    const capas = [];
    for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (/gradient/.test(cs.backgroundImage) && !/url\(/.test(cs.backgroundImage)) { const m = promedio(cs.backgroundImage); if (m) { capas.push(m); if (m.a >= 0.99) break; } }
      const bg = parse(cs.backgroundColor); if (bg && bg.a > 0) { capas.push(bg); if (bg.a >= 0.99) break; }
      const pm = panelMenu(a); if (pm) { capas.push(pm); if (pm.a >= 0.99) break; }
    }
    let c = ESCENA; for (let i = capas.length - 1; i >= 0; i--) c = over(capas[i], c); return c;
  };
  const visible = (el) => { const b = el.getBoundingClientRect(); if (!b.width || !b.height || b.bottom < 0 || b.top > innerHeight || b.right < 0 || b.left > innerWidth) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return false; let op = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) op *= +getComputedStyle(a).opacity; if (op < 0.2) return false; const cx = Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), cy = Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2)); const top = document.elementFromPoint(cx, cy); return !(top && top !== el && !el.contains(top) && !top.contains(el)); };
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const sat = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
  window.__qc = {
    lum: (s) => { const c = parse(s); return c ? +lum(c).toFixed(3) : null; },
    // Fondo efectivo de un elemento (o del ::before/::after que hace de panel): luminancia y saturación.
    fondoDe(sel, ps) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!el) return null;
      if (ps) { const cs = getComputedStyle(el, ps); const m = /gradient/.test(cs.backgroundImage) ? promedio(cs.backgroundImage) : null; const bg = parse(cs.backgroundColor); let c = ESCENA; if (bg && bg.a > 0) c = over(bg, c); if (m) c = over(m, c); return { lum: +lum(c).toFixed(3), sat: Math.round(sat(c)), bgc: cs.backgroundColor, img: cs.backgroundImage.slice(0, 160), blur: cs.backdropFilter || cs.webkitBackdropFilter || 'none', display: cs.display }; }
      const c = fondo(el); return { lum: +lum(c).toFixed(3), sat: Math.round(sat(c)) };
    },
    // Todo texto visible con letras o cifras: contraste contra su fondo compuesto.
    textos(raiz) {
      const root = document.querySelector(raiz) || document.body, r = { total: 0, bajo45: 0, bajo3: [] };
      root.querySelectorAll('*').forEach(el => {
        if (el.closest('svg') || /^(SCRIPT|STYLE|svg|path|CANVAS|IMG|BR|OPTION|I)$/i.test(el.tagName) || el.closest('.ti')) return;
        if (el.closest('.nx-rueda-fila:not(.nx-foco)')) return; // filas atenuadas a propósito por la rueda (59.12)
        if (![...el.childNodes].some(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent))) return;
        if (!visible(el)) return;
        const cs = getComputedStyle(el); const tc = parse(cs.color); if (!tc || tc.a === 0) return;
        let op = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) op *= +getComputedStyle(a).opacity;
        const bg = fondo(el), rr = ratio(over({ ...tc, a: tc.a * op }, bg), bg); r.total++;
        const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400, grande = fs >= 24 || (fs >= 18.66 && fw >= 700);
        if (rr < (grande ? 3 : 4.5)) r.bajo45++;
        if (rr < 3) r.bajo3.push([nombre(el), el.textContent.trim().slice(0, 24), +rr.toFixed(2)]);
      });
      return r;
    },
    // Superficies grandes oscuras: todo elemento visible de ≥ 4 000 px² con fondo propio cuyo fondo compuesto sea un gris
    // oscuro (luminancia < 0.2 y poco color). Los colores de acento (azul, verde, rojo) no cuentan: son botones o marcas.
    oscuras(raiz) {
      const root = document.querySelector(raiz) || document.body, malos = []; let n = 0;
      root.querySelectorAll('*').forEach(el => {
        if (/^(IMG|CANVAS|SVG|VIDEO|IFRAME|PATH|I|OPTION)$/i.test(el.tagName) || el.closest('svg,.tema-opcion,.ti,#loginScreen')) return;
        const b = el.getBoundingClientRect(); const w = Math.min(b.right, innerWidth) - Math.max(b.left, 0), h = Math.min(b.bottom, innerHeight) - Math.max(b.top, 0);
        if (w < 40 || h < 24 || w * h < 4000) return;
        const cs = getComputedStyle(el); const own = parse(cs.backgroundColor);
        if (!(own && own.a > 0.02) && !/gradient/.test(cs.backgroundImage)) return;
        if (!visible(el)) return;
        const f = fondo(el); if (sat(f) > 90) return;
        n++; const L = lum(f); if (L < 0.2) malos.push([nombre(el), Math.round(w * h), +L.toFixed(2)]);
      });
      return { n, malos };
    },
    iconos3d: () => [...document.querySelectorAll('i.ti')].filter(e => /gradient/.test(e.getAttribute('style') || '')).length,
    pildora() {
      const ind = document.getElementById('springInd'), on = document.querySelector('#sbNav .ni.on');
      const sp = document.body.classList.contains('spring-nav') && ind && getComputedStyle(ind).display !== 'none';
      const el = sp ? ind : on; if (!el || !on) return null;
      const a = el.getBoundingClientRect(), o = on.getBoundingClientRect(), cs = getComputedStyle(el);
      const lbl = on.querySelector('.ni-l'), ico = on.querySelector('.ni-i'), raya = sp ? getComputedStyle(ind, '::after') : null;
      return { spring: !!sp, dy: Math.round(Math.abs(a.top - o.top)), h: Math.round(a.height), op: +cs.opacity, img: cs.backgroundImage.slice(0, 120), bg: cs.backgroundColor, on: on.id || (lbl || on).textContent.trim(),
        lbl: lbl && getComputedStyle(lbl).color, ico: ico && getComputedStyle(ico).color, raya: raya && { disp: raya.display, img: raya.backgroundImage.slice(0, 90) } };
    },
  };
};

async function ir(page, js) {
  // nav('x',null) no mueve el ítem activo del menú: se pasa el ítem real del menú (como un toque del usuario).
  js = js.replace(/nav\('([\w-]+)',null\)/g, (m, v) => `nav('${v}',document.querySelector('#sbEl .ni[onclick^="nav(\\'${v}\\'"]'))`);
  await page.evaluate((js) => { try { closeMobSB(); } catch (e) {} document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); (0, eval)(js); }, js);
  await sleep(1600);
}

const VISTAS = [['inicio', "nav('dashboard',null)"], ['clientes', "nav('clientes',null)"], ['cobros', "nav('facturas',null);setTimeout(()=>switchTab('cobros'),250)"],
  ['polizas', "nav('polizas',null)"], ['whatsapp', "nav('waInbox',null)"]];
const AZUL = /37, 99, 235/;
// Riel azul: panel azul NEXUS translúcido; el elegido, píldora blanca (degradado blanco → #EEF4FF) con el texto y el ícono #1D4ED8.
const esPanelAzul = (p) => p && p.lum < 0.3 && p.sat > 120 && p.blur !== 'none';
const esPildoraBlanca = (p) => p && /rgb\(255, 255, 255\)/.test(p.img) && p.lbl === 'rgb(29, 78, 216)' && p.ico === 'rgb(29, 78, 216)';

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('tema/clasico');

  for (const width of [390, 1280]) {
    console.log(`\n=== ${width} · modo claro ===`);
    const { ctx, page, errs } = await abrir(browser, width);
    const W = width + ' ';

    // 1) Carga: claro desde el primer cuadro, sin destello oscuro.
    const c = await page.evaluate(() => window.__qcCuadros);
    ok(c.length > 0 && c[0].claro && c[0].bg === 'rgb(238, 241, 245)' && !c.some(x => x.grafito || !x.claro), W + 'primer cuadro: html.tema-claro y fondo #EEF1F5, ningún cuadro del grafito', c.slice(0, 3));
    ok(c[0].splash === null || c[0].splash === 'rgb(238, 241, 245)', W + 'pantalla de carga clara (#EEF1F5)', c[0]);
    const e = await page.evaluate(() => ({ tc: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'), c1: getComputedStyle(document.documentElement).getPropertyValue('--c1').trim().toLowerCase(),
      foto: document.documentElement.classList.contains('tgc-foto'), after: getComputedStyle(document.documentElement, '::after').backgroundImage, afterOp: getComputedStyle(document.documentElement, '::after').opacity,
      nitida: (() => { const p = document.getElementById('nxBgPhoto'); if (!p) return 'sin'; const cs = getComputedStyle(p); return cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 ? 'oculta' : 'visible'; })() }));
    ok(String(e.tc).toUpperCase() === '#EEF1F5', W + `theme-color #EEF1F5 (${e.tc})`);
    ok(e.c1 === '#2563eb', W + `acento único azul NEXUS: --c1 ${e.c1}`);
    const archivo = width < 500 ? 'fondo-oficina-claro-movil.webp' : 'fondo-oficina-claro.webp';
    ok(e.foto && e.after.includes(archivo) && e.afterOp === '1' && e.nitida !== 'visible', W + `escena: ${archivo} desenfocada con velo y sin la foto nítida`, e);

    // 2) Barra de arriba: cristal claro y el ícono oscuro (sin los botones «caramelo» 3D).
    const bar = await page.evaluate(() => [['☰', '.tnav .tn-tog'], ['campana', '.tnav .notif-bell'], ['actualizar', '#btnRefrescar']].map(([n, s]) => {
      const b = document.querySelector(s); if (!b || !b.getBoundingClientRect().width) return { n, no: 1 };
      const i = b.querySelector('i'); return { n, ico: i && getComputedStyle(i).color, f: window.__qc.fondoDe(b), img: getComputedStyle(b).backgroundImage.slice(0, 80) };
    }));
    const vis = bar.filter(x => !x.no);
    ok(vis.length >= 2 && vis.every(x => x.ico === 'rgb(51, 65, 85)' && x.f.lum > 0.7 && x.f.sat <= 40), W + `barra de arriba: ${vis.map(x => x.n).join(', ')} en cristal claro con el ícono #334155`, bar);
    if (width < 500) {
      const t = await page.evaluate(() => { const p = document.querySelector('.tnav .pttl'); if (!p) return null; const r = p.getBoundingClientRect(), color = getComputedStyle(p).color; return { t: p.textContent.trim(), w: r.width, color, lum: window.__qc.lum(color) }; });
      ok(t && t.t && t.w > 0 && t.lum < 0.2, W + `título de la pantalla en la barra, en texto oscuro («${t && t.t}»)`, t);
    }

    // 3) Pantallas: sin superficies grandes oscuras ni textos bajo 3:1; íconos planos.
    for (const [nom, js] of VISTAS) {
      await ir(page, js);
      if (nom === 'whatsapp') await sleep(900);
      const r = await page.evaluate(() => ({ o: window.__qc.oscuras('body'), t: window.__qc.textos('body'), i3: window.__qc.iconos3d(), sw: [document.documentElement.scrollWidth, innerWidth] }));
      ok(r.o.malos.length === 0, W + `${nom}: sin superficies grandes oscuras (${r.o.n} revisadas)`, r.o.malos.slice(0, 6));
      ok(r.t.total > 5 && r.t.bajo3.length === 0, W + `${nom}: ${r.t.total} textos, ninguno bajo 3:1 (bajo 4.5:1: ${r.t.bajo45})`, r.t.bajo3.slice(0, 6));
      ok(r.i3 === 0, W + `${nom}: íconos planos, sin bolitas de color (${r.i3})`);
      ok(r.sw[0] <= r.sw[1], W + `${nom}: sin desplazamiento horizontal`, r.sw);
      await page.screenshot({ path: OUT + `${width}-${nom}.png` });
    }
    // WhatsApp: la regla del aviso vacío pinta el ícono de Tabler, no el texto «ea4a».
    const ea = await page.evaluate(() => { const out = []; for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch (e) { continue; } for (const r of rs) if (r.selectorText && /nxWaEmptyPolished/.test(r.selectorText) && r.style && r.style.content) out.push(r.style.content); } return out; });
    ok(ea.length > 0 && ea.every(x => x !== '"ea4a"'), W + 'WhatsApp: el aviso vacío usa el ícono (sin el texto «ea4a»)', ea);

    // 4) Menú: cajón ☰ en el celular, riel en la computadora; píldora azul en el activo y siguiendo a los módulos.
    if (width < 500) {
      await ir(page, "nav('clientes',null)");
      await page.click('.tnav .tn-tog'); await sleep(900);
      const m = await page.evaluate(() => {
        const sb = document.getElementById('sbEl'), un = sb.querySelector('.sb-u .sb-un'), ur = sb.querySelector('.sb-u .sb-ur');
        const a = un && un.getBoundingClientRect(), b = ur && ur.getBoundingClientRect();
        return { abierto: /mob-open/.test(sb.className), panel: window.__qc.fondoDe(sb, '::after'), pil: window.__qc.pildora(), t: window.__qc.textos('#sbEl'),
          monta: a && b && b.width && a.width ? !(a.bottom <= b.top + 1 || b.bottom <= a.top + 1 || a.right <= b.left || b.right <= a.left) : null, nom: un && un.textContent.trim(), rol: ur && ur.textContent.trim() };
      });
      ok(m.abierto && esPanelAzul(m.panel), `${W}cajón ☰: riel azul NEXUS (luminancia ${m.panel.lum}, ${m.panel.blur})`, m.panel);
      ok(esPildoraBlanca(m.pil) && m.pil.dy <= 2 && m.pil.op > 0.9, `${W}cajón ☰: el activo (${m.pil && m.pil.on}) en píldora blanca con el azul`, m.pil);
      ok(m.monta === false, `${W}cajón ☰: nombre («${m.nom}») y rol («${m.rol}») sin montarse`, m);
      ok(m.t.total > 8 && m.t.bajo3.length === 0, `${W}cajón ☰: ${m.t.total} rótulos legibles (bajo 4.5:1: ${m.t.bajo45})`, m.t.bajo3.slice(0, 5));
      await page.screenshot({ path: OUT + `${width}-cajon.png` });
      await page.evaluate(() => { try { closeMobSB(); } catch (e) {} }); await sleep(500);
    } else {
      await ir(page, "nav('clientes',null)");
      const m = await page.evaluate(() => ({ w: Math.round(document.getElementById('sbEl').getBoundingClientRect().width), panel: window.__qc.fondoDe('#sbEl', '::before'), main: window.__qc.fondoDe('.main', '::before'), pil: window.__qc.pildora() }));
      ok(m.w >= 76 && m.w <= 84 && esPanelAzul(m.panel), `${W}riel: ${m.w} px en azul NEXUS (luminancia ${m.panel.lum})`, m);
      ok(m.main.lum > 0.8, `${W}panel principal en cristal claro (luminancia ${m.main.lum})`, m.main);
      ok(esPildoraBlanca(m.pil) && m.pil.dy <= 2, `${W}riel: el activo (${m.pil && m.pil.on}) en píldora blanca con el azul`, m.pil);
      ok(m.pil && m.pil.raya && m.pil.raya.disp === 'block' && AZUL.test(m.pil.raya.img), `${W}riel: la rayita de brillo del elegido se ve (azul sobre la píldora)`, m.pil && m.pil.raya);
      const tr = await page.evaluate(() => window.__qc.textos('#sbEl'));
      ok(tr.total >= 2 && tr.bajo3.length === 0, `${W}riel: rótulos legibles sobre el azul (${tr.total}; bajo 4.5:1: ${tr.bajo45})`, tr.bajo3.slice(0, 5));
      for (const [nom, js, id] of [['WhatsApp', "nav('waInbox')", 'nxWaInboxNav'], ['CRM', "nav('crm')", 'nxCrmNav']]) {
        await ir(page, js); await sleep(400);
        const p = await page.evaluate(() => window.__qc.pildora());
        const onId = await page.evaluate(() => document.querySelector('#sbNav .ni.on')?.id || '');
        ok(p && onId === id && p.dy <= 2, `${W}la píldora sigue a ${nom} (marca su botón por su cuenta)`, { p, onId });
      }
    }

    // 5) Ventana «Nuevo cliente»: hoja blanca, campos con filo gris y anillo azul al enfocar.
    await ir(page, "nav('clientes',null);setTimeout(()=>abrirNuevoCli(),300)");
    const v = await page.evaluate(() => {
      const ov = document.querySelector('.overlay.open'), md = ov && ov.querySelector('.modal'); if (!md) return null;
      const inp = [...md.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),select,textarea')].find(x => x.getBoundingClientRect().width > 0);
      return { hoja: window.__qc.fondoDe(md), velo: getComputedStyle(ov).backgroundColor, borde: inp && getComputedStyle(inp).borderTopColor, t: window.__qc.textos('.overlay.open'), id: inp && (inp.id || inp.name) };
    });
    ok(v && v.hoja.lum > 0.9, W + `Nuevo cliente: hoja blanca (luminancia ${v && v.hoja.lum})`, v);
    ok(v && /rgba\(15, 23, 42, 0\.\d+\)/.test(v.velo), W + `Nuevo cliente: velo suave (${v && v.velo})`);
    ok(v && v.borde === 'rgba(15, 23, 42, 0.14)', W + `Nuevo cliente: campos con filo gris, sin el borde morado (${v && v.borde})`);
    ok(v && v.t.bajo3.length === 0, W + `Nuevo cliente: ${v && v.t.total} textos, ninguno bajo 3:1 (bajo 4.5:1: ${v && v.t.bajo45})`, v && v.t.bajo3.slice(0, 5));
    if (v && v.id) {
      await page.evaluate((id) => { const x = document.getElementById(id) || document.querySelector(`[name="${id}"]`); x && x.focus(); }, v.id); await sleep(250);
      const f = await page.evaluate((id) => { const x = document.getElementById(id) || document.querySelector(`[name="${id}"]`); const cs = getComputedStyle(x); return { b: cs.borderTopColor, sh: cs.boxShadow }; }, v.id);
      ok(f.b === 'rgb(37, 99, 235)' && AZUL.test(f.sh), W + 'Nuevo cliente: al enfocar, filo y anillo azul', f);
    }
    await page.screenshot({ path: OUT + `${width}-nuevo-cliente.png` });

    // 6) Apariencia y botón sol/luna; cambio en vivo claro ⇄ grafito.
    await ir(page, 'navConfig(12,null)');
    const ap = await page.evaluate(() => { const o = document.querySelector('.tema-opcion[data-tema="clasico"]'); return o && { txt: o.textContent.replace(/\s+/g, ' ').trim(), sel: o.classList.contains('tema-sel') }; });
    ok(ap && /\bClaro\b/i.test(ap.txt) && !/CLÁSICO/i.test(ap.txt) && ap.sel, W + `Apariencia: la opción se llama «Claro» y está marcada`, ap);
    const tema = () => page.evaluate(() => ({ claro: document.documentElement.classList.contains('tema-claro'), grafito: document.documentElement.classList.contains('tema-glass-oscuro'),
      tc: document.querySelector('meta[name="theme-color"]')?.getAttribute('content'), btn: document.getElementById('btnDarkMode')?.getAttribute('aria-label'), bg: getComputedStyle(document.documentElement).backgroundColor }));
    let t = await tema();
    ok(t.claro && t.btn === 'Modo oscuro', W + `botón sol/luna en claro: «${t.btn}»`, t);
    await page.evaluate(() => toggleDarkMode()); await sleep(700);
    t = await tema();
    ok(t.grafito && !t.claro && t.btn === 'Modo claro' && String(t.tc).toUpperCase() !== '#EEF1F5', W + `sol/luna → grafito en vivo (theme-color ${t.tc}, botón «${t.btn}»)`, t);
    await page.evaluate(() => toggleDarkMode()); await sleep(900);
    t = await tema();
    ok(t.claro && !t.grafito && t.btn === 'Modo oscuro' && String(t.tc).toUpperCase() === '#EEF1F5' && t.bg === 'rgb(238, 241, 245)', W + 'sol/luna → claro en vivo de nuevo (#EEF1F5)', t);
    const tras = await page.evaluate(() => { nav('dashboard', document.querySelector('#sbEl .ni[onclick^="nav(\'dashboard\'"]')); return new Promise(r => setTimeout(() => r({ o: window.__qc.oscuras('body'), i3: window.__qc.iconos3d() }), 1600)); });
    ok(tras.o.malos.length === 0 && tras.i3 === 0, W + 'tras ir y volver del grafito: Inicio claro y plano', tras);

    // 7) «Reducir transparencia» (iPhone → Accesibilidad): cristal blanco sólido, sin desenfoque.
    try {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
      await sleep(300);
      if (await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)) {
        const rt = await page.evaluate((m) => m ? { barra: window.__qc.fondoDe('.tnav', null), bc: getComputedStyle(document.querySelector('.tnav')).backgroundColor, bf: getComputedStyle(document.querySelector('.tnav')).backdropFilter }
          : { panel: window.__qc.fondoDe('#sbEl', '::before'), main: window.__qc.fondoDe('.main', '::before') }, width < 500);
        if (width < 500) ok(rt.bc === 'rgb(255, 255, 255)' && rt.bf === 'none', W + 'reducir transparencia: barra blanca sólida, sin desenfoque', rt);
        else ok(rt.panel.bgc === 'rgb(29, 78, 216)' && !/gradient|url/.test(rt.panel.img) && rt.panel.blur === 'none' && rt.main.bgc === 'rgb(255, 255, 255)' && rt.main.blur === 'none', W + 'reducir transparencia: riel azul sólido y panel principal blanco sólido, sin desenfoque', rt);
      } else console.log('INFO  ' + W + 'este Chromium no emula prefers-reduced-transparency: se omite');
      await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    } catch (x) { console.log('INFO  ' + W + 'reducir transparencia no disponible: ' + x.message); }

    ok(errs.length === 0, W + 'sin errores de consola', errs.slice(0, 4));
    await ctx.close();
  }

  // 8) Interruptor por equipo: nx_claro_off=1 devuelve el Clásico de antes.
  {
    console.log('\n=== 1280 · interruptor nx_claro_off ===');
    const { ctx, page, errs } = await abrir(browser, 1280, { off: true });
    const c = await page.evaluate(() => window.__qcCuadros.some(x => x.claro));
    const e = await page.evaluate(() => ({ claro: document.documentElement.classList.contains('tema-claro'), grafito: document.documentElement.classList.contains('tema-glass-oscuro'), c1: getComputedStyle(document.documentElement).getPropertyValue('--c1').trim().toLowerCase(),
      w: Math.round(document.getElementById('sbEl').getBoundingClientRect().width), ap: document.querySelector('.tema-opcion') ? 1 : 0,
      nitida: (() => { const p = document.getElementById('nxBgPhoto'); return p ? getComputedStyle(p).display : 'sin'; })() }));
    ok(!c && !e.claro && !e.grafito && e.c1 === '#6d28d9', `nx_claro_off: sin html.tema-claro en ningún cuadro y el acento morado de antes (${e.c1})`, e);
    ok(e.w > 150 && e.nitida !== 'none', `nx_claro_off: el carril de antes (${e.w} px) y la foto nítida`, e);
    await ir(page, 'navConfig(12,null)');
    const ap = await page.evaluate(() => document.querySelector('.tema-opcion[data-tema="clasico"]')?.textContent.replace(/\s+/g, ' ').trim());
    ok(/CL[AÁ]SICO/i.test(ap || ''), `nx_claro_off: Apariencia vuelve a decir «Clásico»`, ap);
    ok(errs.length === 0, 'nx_claro_off: sin errores de consola', errs.slice(0, 4));
    await ctx.close();
  }
  await qa('tema/none');
  await browser.close();
  console.log(`\nRESULTADO qa-modo-claro: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
