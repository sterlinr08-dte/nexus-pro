// QA de legibilidad (30-sep-2026): tema «Glass oscuro», app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js. Recorre todas las pantallas a 390×844 (iPhone/Safari) y 1280×800 y, para CADA texto visible
// (nodos de texto con letras o cifras, rectángulos no vacíos, visibility/opacity efectivas, sin aria-hidden, sin
// marcadores decorativos ni controles inactivos), mide:
//  · color efectivo del texto (color × opacidad acumulada de los ancestros);
//  · fondo efectivo REAL: captura de la pantalla con todo el texto transparente (color/-webkit-text-fill-color/::before/
//    ::after) y muestra de los píxeles detrás de cada línea de texto (así cuentan cristal, backdrop-filter, degradados,
//    imágenes y capas semitransparentes; se calcula la razón contra el promedio y contra los píxeles claros/oscuros
//    (percentiles 20/80 de luminancia) y se conserva la peor);
//  · razón de contraste WCAG: falla si < 4.5:1 en texto normal o < 3:1 en texto grande (≥24 px, o ≥18.66 px en negrita),
//    y si la letra mide < 11 px en el celular.
// Se desplaza el contenido por tramos para medir toda la pantalla, no solo lo que cabe en la ventana. Los hallazgos dentro
// del Buzón de WhatsApp (#v-waInbox) se informan aparte y no hacen fallar la suite (ese módulo lo trabajan otros agentes).
// Salida: informe.md + hallazgos.json + capturas con los textos afectados resaltados en rojo (hallazgos-<vista>-<ancho>-<tramo>.png).
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta QA_TABLER=/ruta/tabler/dist node scripts/qa-legibilidad.mjs
//      QA_ROLES=admin,agente (por defecto admin,agente) · QA_ANCHOS=390,1280 · QA_VISTAS=inicio,clientes (filtro opcional)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-legibilidad')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const ROLES = (process.env.QA_ROLES || 'admin,agente').split(',');
const ANCHOS = (process.env.QA_ANCHOS || '390,1280').split(',').map(Number);
const FILTRO = process.env.QA_VISTAS ? process.env.QA_VISTAS.split(',') : null;
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => r(s)); }).on('error', () => r('')));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ID = { admin: '00000000-0000-4000-8000-000000000001', agente: '00000000-0000-4000-8000-000000000002' };

// ── código que corre dentro de la página ──
const MEDIDOR = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const ruta = (el) => { const p = []; for (let a = el; a && a !== document.body && p.length < 4; a = a.parentElement) { p.unshift(nombre(a)); if (a.id) break; } return p.join(' > '); };
  const opacidad = (el) => { let op = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) op *= +getComputedStyle(a).opacity; return op; };
  const zona = (el) => el.closest('#v-waInbox,[id^="nxWa"],[class*="nxWaChat"],[class*="nxWaModal"]') ? 'buzon' : el.closest('nav#sbEl') ? 'menu' : el.closest('.lbox,#login,#loginBox,.login') ? 'login' : 'app';
  let seq = 0;
  window.__ql = {
    // Textos visibles dentro de la ventana que aún no se midieron (cada elemento se mide una sola vez por pantalla).
    candidatos() {
      const out = [];
      document.querySelectorAll('body *').forEach(el => {
        if (el.__qlHecho) return;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|path|OPTION|IMG|CANVAS|VIDEO|IFRAME|BR|HR)$/i.test(el.tagName) || el.closest('svg,.ti,[aria-hidden="true"],.skeleton,.placeholder,[data-placeholder],.sr-only')) return;
        const nodos = [...el.childNodes].filter(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent));
        if (!nodos.length) return;
        if (!el.getClientRects().length) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const op = opacidad(el); if (op < 0.1) return;
        const tc = parse(cs.color); if (!tc || tc.a * op < 0.05) return;
        const rects = [];
        for (const n of nodos) { const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) { if (b.width < 2 || b.height < 2) continue; const x = Math.max(0, b.left + 1), y = Math.max(0, b.top + 1), x2 = Math.min(innerWidth, b.right - 1), y2 = Math.min(innerHeight, b.bottom - 1); if (x2 - x >= 2 && y2 - y >= 2) rects.push([x, y, x2 - x, y2 - y]); } }
        if (!rects.length) return; // fuera de la ventana: se medirá en otro tramo
        // ¿tapado por otra capa? (centro del primer rectángulo)
        const [cx, cy] = [rects[0][0] + rects[0][2] / 2, rects[0][1] + rects[0][3] / 2];
        const top = document.elementFromPoint(cx, cy); if (top && top !== el && !el.contains(top) && !top.contains(el) && !top.closest('.nx-fab')) return;
        el.__qlHecho = true; el.__qlId = ++seq;
        const inactivo = !!(el.closest('[disabled],[aria-disabled="true"],.disabled') || (el.matches('button,input,select,textarea') && el.disabled));
        out.push({ id: seq, ruta: ruta(el), texto: nodos.map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 40), color: { r: tc.r, g: tc.g, b: tc.b, a: tc.a * op }, fs: parseFloat(cs.fontSize), fw: +cs.fontWeight || 400, rects, zona: zona(el), inactivo });
      });
      return out;
    },
    ocultarTexto(on) {
      let s = document.getElementById('__qlOculta');
      if (!on) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('style'); s.id = '__qlOculta'; document.documentElement.appendChild(s); }
      // El botón flotante (fijo) no forma parte del fondo de ningún texto: que no tape lo que se mide (qa-iphone ya vigila que no tape controles).
      s.textContent = 'html *,html *::before,html *::after,html *::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}html .nx-fab{visibility:hidden!important}';
    },
    // Muestra los píxeles detrás de cada texto en la captura (base64) y calcula la razón de contraste.
    async muestrear(b64, items) {
      const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const sx = img.naturalWidth / innerWidth, sy = img.naturalHeight / innerHeight;
      return items.map(it => {
        const px = [];
        for (const [x, y, w, h] of it.rects) {
          const X = Math.round(x * sx), Y = Math.round(y * sy), W = Math.max(1, Math.round(w * sx)), H = Math.max(1, Math.round(h * sy));
          const d = cx.getImageData(X, Y, W, H).data; const paso = Math.max(1, Math.floor(d.length / 4 / 2500));
          for (let i = 0; i < d.length; i += 4 * paso) px.push({ r: d[i], g: d[i + 1], b: d[i + 2] });
        }
        if (!px.length) return { ...it, sinMuestra: true };
        const avg = px.reduce((s, c) => ({ r: s.r + c.r / px.length, g: s.g + c.g / px.length, b: s.b + c.b / px.length }), { r: 0, g: 0, b: 0 });
        px.sort((a, b) => lum(a) - lum(b)); const p20 = px[Math.floor(px.length * 0.2)], p80 = px[Math.floor(px.length * 0.8)];
        const rz = (bg) => ratio(over(it.color, bg), bg);
        const rProm = rz(avg), rMin = Math.min(rProm, rz(p20), rz(p80));
        const grande = it.fs >= 24 || (it.fs >= 18.66 && it.fw >= 700);
        return { ...it, colorHex: hex(over(it.color, avg)), fondo: hex(avg), fondoClaro: hex(p80), fondoOscuro: hex(p20), ratio: +rMin.toFixed(2), ratioProm: +rProm.toFixed(2), grande, limite: grande ? 3 : 4.5 };
      });
    },
    resaltar(ids, on) { document.querySelectorAll('body *').forEach(el => { if (el.__qlId && ids.includes(el.__qlId)) { if (on) { el.__qlOutline = el.style.outline; el.style.outline = '2px solid #FF2D55'; el.style.outlineOffset = '1px'; } else { el.style.outline = el.__qlOutline || ''; el.style.outlineOffset = ''; } } }); },
    reiniciar() { document.querySelectorAll('body *').forEach(el => { delete el.__qlHecho; delete el.__qlId; }); seq = 0; },
    // Desplazador principal de la pantalla (el contenedor visible con más desplazamiento pendiente).
    scroller() {
      const cands = [...document.querySelectorAll('.overlay.open .modal, #notifPanel.show, nav#sbEl.mob-open .sb-nav, nav#sbEl.mob-open, .mobile-more-sheet-clean.open, .gs-box, #sbContab, #sbConfig, .content, #cnt, .main, body, html')].filter(e => e.getClientRects().length);
      let best = null, bs = 0;
      for (const e of cands) { const cs = getComputedStyle(e); if (!/(auto|scroll)/.test(cs.overflowY) && e !== document.scrollingElement) continue; const s = e.scrollHeight - e.clientHeight; if (s > bs + 4) { bs = s; best = e; } }
      if (!best) { const se = document.scrollingElement; if (se.scrollHeight - se.clientHeight > 4) best = se; }
      if (!best) return null; best.__qlScroller = true; return { alto: best.clientHeight, total: best.scrollHeight };
    },
    desplazar(y) { const e = [...document.querySelectorAll('*')].find(x => x.__qlScroller); if (!e) return 0; e.scrollTop = y; return e.scrollTop; },
    fin() { document.querySelectorAll('*').forEach(x => { delete x.__qlScroller; }); },
    cerrar() {
      try { closeMobSB(); } catch (e) {}
      document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
      try { cerrarGlobalSearch(); } catch (e) {}
      const n = document.getElementById('notifPanel'); if (n) n.classList.remove('show');
      try { if (document.querySelector('.mobile-more-sheet-clean.open')) window.__nxToggleMenu(true); } catch (e) {}
    },
  };
};

async function abrir(browser, { w, h, rol, login = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 769, hasTouch: w < 769, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', ...(w < 769 ? { userAgent: UA_IPHONE } : {}) });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript(({ rol, id, login }) => {
    localStorage.removeItem('nx_tema'); localStorage.removeItem('nx_tgo_off');
    if (login) return;
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id, nom: rol === 'admin' ? 'Esterlin Espinal' : 'Robinson Perez', rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { rol, id: ID[rol], login });
  await page.addInitScript(MEDIDOR);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  if (!login) {
    await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
    await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  }
  await sleep(2500);
  return { ctx, page, errs };
}

// Pantallas: [nombre, cómo abrirla]. Las de Configuración van pestaña por pestaña.
const VISTAS = [
  ['inicio', "nav('dashboard',null)"], ['facturas', "nav('facturas',null)"], ['cobros', "nav('facturas',null);setTimeout(()=>switchTab('cobros'),250)"],
  ['clientes', "nav('clientes',null)"], ['cliente360', "nav('cliente360',null);setTimeout(()=>nxC360Abrir(ST.clientes[0].id),300)"],
  ['polizas', "nav('polizas',null)"], ['solicitudes', 'nxAbrirSolicitudes()'], ['crm', "nav('crm',null)"], ['prospectos', "nav('crm',null);setTimeout(()=>nxCrm.tab('prospectos'),350)"],
  ['buzon', "nav('waInbox',null)"],
  ['config-empresa', 'navConfig(1,null)'], ['config-notificaciones', 'navConfig(2,null)'], ['config-automatizacion', 'navConfig(3,null)'], ['config-empresas', 'navConfig(4,null)'],
  ['config-agentes', 'navConfig(5,null)'], ['config-usuarios', 'navConfig(6,null)'], ['config-roles', 'navConfig(7,null)'], ['config-auditoria', 'navConfig(8,null)'],
  ['config-bases', 'navConfig(9,null)'], ['config-changelog', 'navConfig(10,null)'], ['config-metas', 'navConfig(11,null)'], ['config-apariencia', 'navConfig(12,null)'],
  ['config-coberturas', 'navConfig(13,null)'], ['config-bancos', 'navConfig(14,null)'],
  ['modal-nuevo-cliente', "nav('clientes',null);setTimeout(()=>abrirNuevoCli(),300)"], ['modal-abono', "nav('clientes',null);setTimeout(()=>abrirAbono(ST.clientes[0].id),300)"],
  ['busqueda', "nav('dashboard',null);setTimeout(()=>{abrirGlobalSearch();const i=document.getElementById('gsInput');if(i){i.value='mar';i.dispatchEvent(new Event('input',{bubbles:true}))}},300)"],
  ['notificaciones', "nav('dashboard',null);setTimeout(()=>toggleNotif(),300)"],
  ['fab-menu', "nav('dashboard',null);setTimeout(()=>document.querySelector('.nx-fab')&&document.querySelector('.nx-fab').click(),300)"],
];
const VISTAS_ADMIN = [['comisiones', "nav('comisiones',null)"], ['mayor', "nav('mayor',null)"], ['asientos', "nav('asientos',null)"], ['balance', "nav('balance',null)"], ['pyg', "nav('pyg',null)"],
  ['rep-agente', "nav('rep-agente',null)"], ['rep-plan', "nav('rep-plan',null)"], ['rep-empresa', "nav('rep-empresa',null)"], ['rep-aging', "nav('rep-aging',null)"], ['dgii', "nav('dgii',null)"],
  ['prestamos', 'nxAbrirPrestamos()'], ['panel-dueno', 'nxAbrirSuperadmin()'], ['pos', 'nxAbrirPOS()']];
// Menú lateral: cajón ☰ en el celular (con Contabilidad desplegada); en la computadora, los paneles flotantes.
const VISTAS_MENU = (w) => w < 769
  ? [['menu', "nav('dashboard',null);setTimeout(()=>{toggleSB();setTimeout(()=>{try{toggleContab()}catch(e){}},300)},300)"]]
  : [['menu-contabilidad', "nav('dashboard',null);setTimeout(()=>document.getElementById('niContab').click(),300)"], ['menu-configuracion', "nav('dashboard',null);setTimeout(()=>document.getElementById('niAdmin2').click(),300)"]];

async function ir(page, js) {
  await page.evaluate((js) => { window.__ql.cerrar(); js = js.replace(/nav\('([\w-]+)',null\)/g, (m, v) => `nav('${v}',document.querySelector('#sbEl .ni[onclick^="nav(\\'${v}\\'"]'))`); try { (0, eval)(js); } catch (e) { console.warn('qa ir: ' + e.message); } }, js);
  await sleep(1600);
}

// Mide una pantalla entera: tramo a tramo del desplazador principal.
async function medirVista(page, nombreVista, w, rol) {
  await page.evaluate(() => window.__ql.reiniciar());
  const tema = await page.evaluate(() => document.documentElement.classList.contains('tema-glass-oscuro'));
  if (!tema) ok(false, `${nombreVista} ${w}: la página debería tener html.tema-glass-oscuro`, await page.evaluate(() => document.documentElement.className + ' | ' + document.body.className));
  const sc = await page.evaluate(() => window.__ql.scroller());
  const tramos = sc ? Math.min(8, Math.ceil(sc.total / Math.max(1, sc.alto * 0.9))) : 1;
  const hallazgos = [], todos = [];
  for (let t = 0; t < tramos; t++) {
    if (sc && t > 0) { await page.evaluate((y) => window.__ql.desplazar(y), Math.round(t * sc.alto * 0.9)); await sleep(350); }
    const items = await page.evaluate(() => window.__ql.candidatos());
    if (!items.length) continue;
    await page.evaluate(() => window.__ql.ocultarTexto(true)); await sleep(60);
    const b64 = (await page.screenshot({ type: 'png', scale: 'css' })).toString('base64');
    await page.evaluate(() => window.__ql.ocultarTexto(false));
    const res = await page.evaluate(({ b64, items }) => window.__ql.muestrear(b64, items), { b64, items });
    const malos = [];
    for (const r of res) {
      if (r.sinMuestra) continue;
      todos.push(r);
      const motivos = [];
      if (!r.inactivo && r.ratio < r.limite) motivos.push('contraste');
      if (w < 769 && r.fs < 11) motivos.push('tamaño');
      if (motivos.length) { const h = { vista: nombreVista, ancho: w, rol, tramo: t, motivo: motivos.join('+'), ruta: r.ruta, texto: r.texto, color: r.colorHex, fondo: r.fondo, fondoClaro: r.fondoClaro, fondoOscuro: r.fondoOscuro, ratio: r.ratio, ratioProm: r.ratioProm, limite: r.limite, fs: r.fs, fw: r.fw, zona: r.zona, id: r.id }; hallazgos.push(h); malos.push(r.id); }
    }
    if (malos.length) {
      await page.evaluate((ids) => window.__ql.resaltar(ids, true), malos);
      const f = `hallazgos-${nombreVista}-${w}${rol === 'agente' ? '-agente' : ''}-${t}.png`;
      await page.screenshot({ path: OUT + f, type: 'png', scale: 'css' });
      hallazgos.filter(h => h.tramo === t && !h.captura).forEach(h => { h.captura = f; });
      await page.evaluate((ids) => window.__ql.resaltar(ids, false), malos);
    }
  }
  if (sc) { await page.evaluate(() => window.__ql.desplazar(0)); await page.evaluate(() => window.__ql.fin()); }
  return { hallazgos, textos: todos.length };
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('prospectos/reset'); await qa('orgtipo/seguros'); await qa('tema/none');
  const total = [], resumen = [];
  for (const w of ANCHOS) {
    const h = w < 769 ? 844 : 800;
    // Inicio de sesión (sin sesión): texto sobre la foto y la tarjeta de cristal.
    if (!FILTRO || FILTRO.includes('login')) {
      await qa('tema/none');
      const L = await abrir(browser, { w, h, rol: 'admin', login: true });
      await L.page.waitForFunction(() => document.documentElement.classList.contains('tgo-foto'), null, { timeout: 8000 }).catch(() => {}); await sleep(1200); // foto de fondo ya fundida
      const r = await medirVista(L.page, 'login', w, 'admin');
      resumen.push({ vista: 'login', w, rol: 'admin', textos: r.textos, hallazgos: r.hallazgos.length }); total.push(...r.hallazgos);
      ok(r.hallazgos.filter(x => x.zona !== 'buzon').length === 0, `${w} login: ${r.textos} textos legibles`, r.hallazgos.slice(0, 4).map(x => [x.ruta, x.texto, x.ratio, x.fs]));
      await L.ctx.close();
    }
    for (const rol of ROLES) {
      const tag = `${w}-${rol}`; console.log(`\n=== ${tag} ===`);
      await qa('tema/none');
      const A = await abrir(browser, { w, h, rol });
      const lista = VISTAS.concat(rol === 'admin' ? VISTAS_ADMIN : []).concat(VISTAS_MENU(w)).filter(([n]) => !FILTRO || FILTRO.includes(n));
      for (const [nom, js] of lista) {
        await ir(A.page, js);
        const r = await medirVista(A.page, nom, w, rol);
        resumen.push({ vista: nom, w, rol, textos: r.textos, hallazgos: r.hallazgos.length }); total.push(...r.hallazgos);
        const fuera = r.hallazgos.filter(x => x.zona !== 'buzon'), dentro = r.hallazgos.length - fuera.length;
        ok(fuera.length === 0, `${tag} ${nom}: ${r.textos} textos, ${fuera.length} ilegibles${dentro ? ` (+${dentro} en el Buzón, solo informe)` : ''}`, fuera.slice(0, 4).map(x => [x.ruta, x.texto, x.ratio, x.fs, x.color, x.fondo]));
      }
      ok(A.errs.length === 0, `${tag}: sin errores de página en el recorrido`, A.errs.slice(0, 4));
      await A.ctx.close();
    }
  }
  await browser.close();

  // ── informe ──
  const clave = (h) => `${h.vista}|${h.ancho}|${h.ruta}|${h.texto}|${h.motivo}`;
  const agrupados = new Map();
  for (const h of total) { const k = clave(h); if (agrupados.has(k)) agrupados.get(k).n++; else agrupados.set(k, { ...h, n: 1 }); }
  const lista = [...agrupados.values()];
  const fuera = lista.filter(h => h.zona !== 'buzon'), buzon = lista.filter(h => h.zona === 'buzon');
  fs.writeFileSync(OUT + 'hallazgos.json', JSON.stringify({ fecha: new Date().toISOString(), resumen, hallazgos: lista }, null, 1));
  const fila = (h) => `| ${h.vista} | ${h.ancho}${h.rol === 'agente' ? ' (agente)' : ''} | \`${h.ruta.replace(/\|/g, '\\|')}\` | ${h.texto.replace(/\|/g, '\\|')} | ${h.color} | ${h.fondo} (${h.fondoOscuro}–${h.fondoClaro}) | **${h.ratio}** (prom. ${h.ratioProm}) / ${h.limite} | ${h.fs}px ${h.fw} | ${h.motivo}${h.n > 1 ? ' ×' + h.n : ''} | ${h.captura ? `[captura](${h.captura})` : ''} |`;
  const cab = '| Vista | Ancho | Elemento | Texto | Color | Fondo (oscuro–claro) | Razón / mín. | Tamaño | Motivo | Captura |\n|---|---|---|---|---|---|---|---|---|---|';
  const porVista = {}; resumen.forEach(r => { const k = `${r.vista} ${r.w}${r.rol === 'agente' ? ' (agente)' : ''}`; porVista[k] = r; });
  const md = [`# Informe de legibilidad — tema Glass oscuro`, '', `Fecha: ${new Date().toISOString()} · anchos ${ANCHOS.join('/')} · roles ${ROLES.join('/')}`, '',
    `Método: por cada texto visible se compone el color del texto con la opacidad acumulada y se muestrea el fondo REAL detrás de la línea (captura con el texto transparente: cuentan cristal, backdrop-filter, degradados y foto). Razón WCAG mínima entre el promedio y los píxeles claros/oscuros del fondo (p20/p80). Límite 4.5:1 (texto normal) / 3:1 (≥24 px o ≥18.66 px negrita); en el celular además letra ≥ 11 px. Se excluyen elementos aria-hidden, marcadores decorativos y controles inactivos.`, '',
    `## Resumen`, '', `- Textos medidos: ${resumen.reduce((s, r) => s + r.textos, 0)} en ${resumen.length} pantallas×anchos.`, `- Hallazgos fuera del Buzón: **${fuera.length}** (${fuera.filter(h => h.motivo.includes('contraste')).length} de contraste, ${fuera.filter(h => h.motivo.includes('tamaño')).length} de tamaño).`, `- Hallazgos dentro del Buzón de WhatsApp (solo informe, sin corregir): **${buzon.length}**.`, '',
    `| Vista | Ancho | Textos | Hallazgos |`, `|---|---|---:|---:|`, ...Object.entries(porVista).map(([k, r]) => `| ${r.vista} | ${r.w}${r.rol === 'agente' ? ' (agente)' : ''} | ${r.textos} | ${r.hallazgos} |`), '',
    `## Hallazgos fuera del Buzón (${fuera.length})`, '', cab, ...fuera.map(fila), '',
    `## Hallazgos dentro del Buzón de WhatsApp (${buzon.length}) — solo informe`, '', cab, ...buzon.map(fila), ''].join('\n');
  fs.writeFileSync(OUT + 'informe.md', md);
  console.log(`\nInforme: ${OUT}informe.md · hallazgos fuera del Buzón: ${fuera.length} · dentro: ${buzon.length}`);
  console.log(`\n${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
