// QA de iPhone (58.93, 30-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js, a 390×664 (iPhone 13 con barras de Safari), 430×740 (Pro Max) y 375×667 (SE), admin y agente:
//  · sin barra lateral en el celular: el riel de 76 px no se ve ni se toca (elementFromPoint en x=10..80 en cada pantalla),
//    el contenido usa todo el ancho, y ☰ abre el cajón con todos los destinos; búsqueda global, notificaciones, hoja del
//    botón flotante y ventanas (Registrar pago, Nuevo cliente) a ancho completo, sin nada debajo de un riel;
//  · el botón flotante no tapa ningún control al llegar al final de cada pantalla (Inicio, Configuración, Clientes…);
//  · sin desborde horizontal; Roles y permisos sin palabras partidas letra por letra; botones sin rótulo cortado;
//  · Registrar pago a 430 px de alto con el campo enfocado (teclado abierto): «Registrar abono» visible y tocable;
//  · título de la barra: WHATSAPP en el Buzón y ningún título cortado; cifras del Buzón sin rótulos cortados;
//  · Préstamos: la barra inferior a ancho completo, 5 botones sin montarse; toques de la barra superior ≥ 44 px;
//  · entrada (390×664): «Entrar al sistema» visible sin desplazar y texto de ejemplo ≥ 4.5:1;
//  · tema oscuro: íconos planos (sin degradado, brillo ::after, sombra interna difusa ni drop-shadow) y en el tema
//    clásico el coloreado de íconos sigue funcionando.
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta QA_PFX=v5- node scripts/qa-iphone.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-iphone')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const PFX = process.env.QA_PFX || 'v5-';
const TABLER = process.env.QA_TABLER || '';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => r(s)); }).on('error', () => r('')));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ID = { admin: '00000000-0000-4000-8000-000000000001', agente: '00000000-0000-4000-8000-000000000002' };

async function abrir(browser, { w, h, rol, login = false, tema = null }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 769, hasTouch: w < 769, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript(({ rol, id, login, tema }) => {
    if (tema) localStorage.setItem('nx_tema', tema); else localStorage.removeItem('nx_tema');
    localStorage.removeItem('nx_tgo_off');
    if (login) return;
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id, nom: rol === 'admin' ? 'Esterlin Espinal' : 'Robinson Perez', rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { rol, id: ID[rol], login, tema });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  if (!login) {
    await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
    await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  }
  await sleep(2500);
  return { ctx, page, errs };
}

// ── medición en la página ──
const H = () => {
  const nm = (e) => e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') : null;
  window.__qi = {
    // Franja del riel (x=10..80): ¿qué elemento queda encima en cada punto? (y en la zona del overlay)
    riel(y0, y1) {
      const r = [];
      for (let y = Math.max(y0, 90); y <= Math.min(y1, innerHeight - 10); y += 60) for (const x of [10, 40, 70, 80]) {
        const e = document.elementFromPoint(x, y); r.push({ x, y, riel: !!(e && e.closest('#sbEl')), e: nm(e) });
      }
      return r;
    },
    rect(sel) { const e = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; },
    cerrar() {
      try { closeMobSB(); } catch (e) {}
      document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
      try { cerrarGlobalSearch(); } catch (e) {}
      const n = document.getElementById('notifPanel'); if (n) n.classList.remove('show');
      try { if (document.querySelector('.mobile-more-sheet-clean.open')) window.__nxToggleMenu(true); } catch (e) {}
    },
    // Controles tocables visibles que el botón flotante tapa.
    tapadosPorFab() {
      const fab = document.querySelector('.nx-fab'); if (!fab || getComputedStyle(fab).display === 'none') return { fab: false, tapados: [] };
      const f = fab.getBoundingClientRect(); const t = [];
      document.querySelectorAll('#cnt button, #cnt a[href], #cnt a[onclick], #cnt input:not([type=hidden]), #cnt select, #cnt textarea, #cnt [onclick]').forEach(e => {
        const b = e.getBoundingClientRect(); if (!b.width || !b.height) return; if (b.bottom <= 0 || b.top >= innerHeight) return;
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return;
        if (e.closest('.nxFacBar,[style*="position:fixed"],[style*="position: fixed"]')) return;
        const ix = Math.min(b.right, f.right) - Math.max(b.left, f.left), iy = Math.min(b.bottom, f.bottom) - Math.max(b.top, f.top);
        if (ix > 4 && iy > 4) t.push([nm(e), (e.innerText || e.value || '').trim().slice(0, 24)]);
      });
      return { fab: true, tapados: t };
    },
    alFinal() { // lleva cada contenedor con desplazamiento vertical de la vista al final
      document.querySelectorAll('.content, #cnt .view.on, #cnt .view.on *').forEach(c => { if (c.scrollHeight > c.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(c).overflowY)) c.scrollTop = c.scrollHeight; });
    },
    // Botones con el rótulo cortado (fuera de tablas y de tiras que se deslizan)
    cortados(raiz) {
      const out = []; const root = document.querySelector(raiz) || document.body;
      root.querySelectorAll('.btn, .sf-btn, button').forEach(e => {
        const b = e.getBoundingClientRect(); if (!b.width || b.bottom < 0 || b.top > innerHeight) return;
        if (e.closest('td,th,#sbEl,.nx-fab')) return; const txt = (e.innerText || '').trim(); if (txt.length < 3) return;
        const cs = getComputedStyle(e); if (!/(hidden|clip)/.test(cs.overflowX)) return;
        if (e.scrollWidth > e.clientWidth + 2) out.push([nm(e), txt.slice(0, 30), e.scrollWidth, e.clientWidth]);
      });
      return out;
    },
    // Rótulos partidos letra por letra: más líneas que palabras
    partidos(sel) {
      const out = []; document.querySelectorAll(sel).forEach(e => { const b = e.getBoundingClientRect(); if (!b.width) return; const lh = parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2; const lineas = Math.round(b.height / lh); const pal = (e.innerText || '').trim().split(/\s+/).length; if (lineas > pal) out.push([e.innerText.trim().slice(0, 30), lineas, pal]); });
      return out;
    },
    // Íconos con acabado 3D en pantalla: degradado de fondo, brillo ::after con degradado, sombra interna difusa o
    // drop-shadow. (Un aro interno de 1 px sin difuminar es un borde, no un brillo.)
    brillos() {
      const out = [], vistos = new Set();
      document.querySelectorAll('body *').forEach(e => {
        if (e.closest('#sbEl,.tema-opcion,.lshield')) return;
        const r = e.getBoundingClientRect(); if (r.width < 12 || r.width > 90 || r.height < 12 || r.height > 90 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
        const esIco = e.matches('i.ti,[class*=ico],[class*=Ico],[class*=icon],[class*=Icon],[class*=avatar],[class*=Av],[class*=-av],.av') || (e.children.length === 1 && e.firstElementChild.matches('i.ti') && r.width < 70) || (e.children.length === 0 && /^[A-ZÁÉÍÓÚÑ]{1,3}$/.test((e.textContent || '').trim()) && r.width < 70);
        if (!esIco) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < .2) return;
        const grad = /gradient/.test(cs.backgroundImage);
        const inset = (cs.boxShadow.match(/inset[^,]*|[^,]*inset/g) || []).some(s => { const n = (s.match(/(-?\d+(\.\d+)?)px/g) || []).map(parseFloat); return n.length >= 3 && n[2] > 0.5; });
        const a = getComputedStyle(e, '::after'); const glint = a.content !== 'none' && a.content !== 'normal' && /gradient/.test(a.backgroundImage);
        const filt = /drop-shadow/.test(cs.filter);
        if (grad || inset || glint || filt) { const k = nm(e) + '<' + nm(e.parentElement); if (vistos.has(k)) return; vistos.add(k); out.push([k, grad ? 'degradado' : '', inset ? 'sombra-interna' : '', glint ? 'brillo' : '', filt ? 'drop-shadow' : ''].filter(Boolean).join(' ')); }
      });
      return out;
    },
  };
};

const VISTAS_FAB = [['inicio', "nav('dashboard',null)"], ['clientes', "nav('clientes',null)"], ['facturas', "nav('facturas',null)"], ['cliente360', "nav('cliente360',null);setTimeout(()=>nxC360Abrir(ST.clientes[0].id),300)"],
  ['config-empresa', 'navConfig(1,null)'], ['config-notificaciones', 'navConfig(2,null)'], ['config-roles', 'navConfig(7,null)'], ['config-actualizaciones', 'navConfig(10,null)'], ['crm', "nav('crm',null)"], ['polizas', "nav('polizas',null)"]];
const VISTAS_FAB_ADMIN = [['rep-agente', "nav('rep-agente',null)"], ['rep-aging', "nav('rep-aging',null)"], ['config-bancos', 'navConfig(14,null)']];

async function ir(page, js) {
  await page.evaluate((js) => { window.__qi.cerrar(); js = js.replace(/nav\('([\w-]+)',null\)/g, (m, v) => `nav('${v}',document.querySelector('#sbEl .ni[onclick^="nav(\\'${v}\\'"]'))`); try { (0, eval)(js); } catch (e) { console.warn('qa ir: ' + e.message); } }, js);
  await sleep(1400);
  await page.evaluate(() => { const c = document.querySelector('.content'); if (c) c.scrollTo(0, 0); });
  await sleep(150);
}

async function movil(browser, w, h, rol) {
  const tag = `${w}x${h}-${rol}`; console.log(`\n=== ${tag} ===`);
  const { ctx, page, errs } = await abrir(browser, { w, h, rol });
  await page.evaluate(H);
  const lleno = (x) => !!x && x.l <= 12 && x.r >= w - 12; // ancho completo (8 px de margen)
  // 0) Sin riel: invisible, fuera de pantalla y sin toques; el contenido empieza en x=0; ☰ abre el cajón completo.
  await ir(page, "nav('dashboard',null)");
  let r = await page.evaluate(() => { const s = document.getElementById('sbEl'); const b = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { vis: cs.visibility, der: Math.round(b.right), pe: cs.pointerEvents, main: window.__qi.rect('.main'), tnav: window.__qi.rect('.tnav'), riel: window.__qi.riel(80, innerHeight) }; });
  ok(r.vis === 'hidden' && r.der <= 0 && r.pe === 'none', `${tag} sin barra lateral: el riel no se ve ni se toca (visibility ${r.vis}, borde derecho ${r.der})`, r);
  ok(r.riel.every(p => !p.riel), `${tag} sin barra lateral: nada del riel en x=10..80`, r.riel.filter(p => p.riel).slice(0, 4));
  ok(r.main && r.main.l === 0 && r.main.w === w && r.tnav && r.tnav.l <= 12, `${tag} sin barra lateral: contenido y barra de arriba a todo el ancho (main x ${r.main && r.main.l}, ancho ${r.main && r.main.w})`, r);
  await page.click('.tnav .tn-tog'); await sleep(700);
  r = await page.evaluate(() => { const s = document.getElementById('sbEl'); const it = [...s.querySelectorAll('#sbNav .ni[onclick]')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }); const b = s.getBoundingClientRect(); return { abierto: s.classList.contains('mob-open'), vis: getComputedStyle(s).visibility, l: Math.round(b.left), w: Math.round(b.width), items: it.length, total: s.querySelectorAll('#sbNav .ni[onclick]').length }; });
  ok(r.abierto && r.vis === 'visible' && r.l === 0 && r.w > 150 && r.items >= 8, `${tag} ☰ abre el cajón con los destinos del menú (${r.items} a la vista de ${r.total})`, r);
  if (w === 390 && rol === 'admin') await page.screenshot({ path: OUT + PFX + `sin-riel-cajon-${w}.png` });
  await page.evaluate(() => closeMobSB()); await sleep(500);
  const shot = async (n) => { if (w === 390 && (rol === 'admin' || /abono|busqueda/.test(n))) await page.screenshot({ path: OUT + PFX + `${n}-${w}${rol === 'agente' ? '-agente' : ''}.png` }); };

  // 1) Búsqueda global
  await ir(page, "nav('dashboard',null)");
  await page.evaluate(() => abrirGlobalSearch()); await sleep(500); await page.keyboard.type('mar'); await sleep(700);
  r = await page.evaluate(() => ({ inp: window.__qi.rect('#gsInput'), box: window.__qi.rect('.gs-box'), riel: window.__qi.riel(80, 400), act: document.activeElement && document.activeElement.id }));
  ok(lleno(r.inp) && r.act === 'gsInput', `${tag} búsqueda: campo entero a todo el ancho (x ${r.inp && r.inp.l}–${r.inp && r.inp.r})`, r.inp);
  ok(r.riel.every(p => !p.riel), `${tag} búsqueda: nada de un riel encima (x=10..80)`, r.riel.filter(p => p.riel).slice(0, 4));
  await shot('busqueda');
  // 2) Notificaciones
  await page.evaluate(() => { window.__qi.cerrar(); toggleNotif(); }); await sleep(700);
  r = await page.evaluate(() => ({ p: window.__qi.rect('#notifPanel'), riel: window.__qi.riel(80, 400) }));
  ok(lleno(r.p), `${tag} notificaciones: panel a todo el ancho (x ${r.p && r.p.l}–${r.p && r.p.r})`, r.p);
  ok(r.riel.every(p => !p.riel), `${tag} notificaciones: nada de un riel encima (x=10..80)`, r.riel.filter(p => p.riel).slice(0, 4));
  await shot('notificaciones');
  // 3) Hoja del botón flotante
  await page.evaluate(() => window.__qi.cerrar()); await sleep(300);
  await page.click('.nx-fab'); await sleep(700);
  r = await page.evaluate(() => ({ s: window.__qi.rect('.mobile-more-sheet-clean.open'), riel: window.__qi.riel(140, 560), fabArriba: (() => { const f = document.querySelector('.nx-fab'); const b = f.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!(e && f.contains(e)); })() }));
  ok(lleno(r.s), `${tag} menú del botón flotante: la hoja a todo el ancho (x ${r.s && r.s.l}–${r.s && r.s.r})`, r.s);
  ok(r.riel.every(p => !p.riel), `${tag} menú del botón flotante: nada de un riel encima (x=10..80)`, r.riel.filter(p => p.riel).slice(0, 4));
  ok(r.fabArriba, `${tag} menú del botón flotante: la ✕ del botón sigue tocable para cerrar`);
  await shot('fab-menu');
  await page.evaluate(() => window.__qi.cerrar()); await sleep(300);
  // 4) Ventanas
  for (const [nom, js] of [['modal-abono', "nav('clientes',null);setTimeout(()=>abrirAbono(ST.clientes[0].id),300)"], ['modal-nuevo-cliente', "nav('clientes',null);setTimeout(()=>abrirNuevoCli(),300)"]]) {
    await ir(page, js);
    r = await page.evaluate(() => ({ m: window.__qi.rect('.overlay.open .modal'), riel: window.__qi.riel(80, 600), sw: document.documentElement.scrollWidth }));
    ok(lleno(r.m), `${tag} ${nom}: la ventana usa todo el ancho (x ${r.m && r.m.l}–${r.m && r.m.r})`, r.m);
    ok(r.riel.every(p => !p.riel), `${tag} ${nom}: nada de un riel encima (x=10..80)`, r.riel.filter(p => p.riel).slice(0, 4));
    const c = await page.evaluate(() => { const o = document.querySelector('.overlay.open'); const out = []; for (let k = 0; k < 8; k++) { out.push(...window.__qi.cortados('.overlay.open')); const a = o.scrollTop; o.scrollTop += o.clientHeight * .8; if (o.scrollTop === a) break; } o.scrollTop = 0; return out; });
    ok(c.length === 0, `${tag} ${nom}: ningún botón con el rótulo cortado`, c.slice(0, 5));
    if (nom === 'modal-nuevo-cliente') {
      const d = await page.evaluate(() => { const i = document.getElementById('dN'), s = document.getElementById('dR'); const m = document.querySelector('#mCli .modal').getBoundingClientRect(); s.scrollIntoView({ block: 'center' }); const b = s.getBoundingClientRect(), bi = i.getBoundingClientRect(); const btn = s.nextElementSibling.getBoundingClientRect(); return { sel: [Math.round(b.left), Math.round(b.right)], inp: Math.round(bi.width), boton: Math.round(btn.right), modal: [Math.round(m.left), Math.round(m.right)] }; });
      ok(d.boton <= d.modal[1] + 1 && d.sel[1] <= d.modal[1], `${tag} nuevo cliente: fila de dependientes dentro de la ventana (botón + hasta ${d.boton}, ventana hasta ${d.modal[1]})`, d);
    }
    await shot(nom);
  }
  // 5) Registrar pago con el teclado abierto (430 px de alto)
  await page.setViewportSize({ width: w, height: 430 }); await sleep(300);
  await ir(page, "nav('clientes',null);setTimeout(()=>abrirAbono(ST.clientes[0].id),300)");
  await page.evaluate(() => { const i = document.getElementById('aMnt'); i.focus(); i.scrollIntoView({ block: 'center' }); }); await sleep(400);
  r = await page.evaluate(() => { const b = document.getElementById('btnAbo'); const x = b.getBoundingClientRect(); const e = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2); const i = document.getElementById('aMnt').getBoundingClientRect(); return { t: Math.round(x.top), b: Math.round(x.bottom), vh: innerHeight, arriba: !!(e && b.contains(e)), foco: document.activeElement.id, campo: [Math.round(i.top), Math.round(i.bottom)] }; });
  ok(r.foco === 'aMnt' && r.t >= 0 && r.b <= r.vh && r.arriba, `${tag} Registrar pago (alto 430, campo enfocado): «Registrar abono» visible y tocable (${r.t}–${r.b} de ${r.vh})`, r);
  ok(r.campo[1] <= r.t, `${tag} Registrar pago: la fila fija no tapa el campo enfocado`, r);
  if (w === 390) await page.screenshot({ path: OUT + PFX + `abono-teclado-${w}${rol === 'agente' ? '-agente' : ''}.png` });
  await page.evaluate(() => window.__qi.cerrar());
  await page.setViewportSize({ width: w, height: h }); await sleep(400);
  // 6) Pantallas: botón flotante, desborde, títulos, cortes
  const vistas = VISTAS_FAB.concat(rol === 'admin' ? VISTAS_FAB_ADMIN : []);
  for (const [nom, js] of vistas) {
    await ir(page, js);
    const t = await page.evaluate(() => { const p = document.getElementById('pttl'); return { txt: p.textContent, sw: p.scrollWidth, cw: p.clientWidth, sh: p.scrollHeight, ch: p.clientHeight, fs: getComputedStyle(p).fontSize }; });
    ok(t.sw <= t.cw + 1 && t.sh <= t.ch + 1, `${tag} ${nom}: título «${t.txt}» entero (${t.fs})`, t);
    const c = await page.evaluate(() => window.__qi.cortados('#cnt'));
    ok(c.length === 0, `${tag} ${nom}: ningún botón con el rótulo cortado`, c.slice(0, 5));
    if (nom === 'config-roles') {
      const p = await page.evaluate(() => window.__qi.partidos('.role-perm span'));
      ok(p.length === 0, `${tag} Roles y permisos: ningún permiso partido letra por letra`, p.slice(0, 4));
    }
    await page.evaluate(() => window.__qi.alFinal()); await sleep(350);
    const f = await page.evaluate(() => window.__qi.tapadosPorFab());
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    ok(!f.fab || f.tapados.length === 0, `${tag} ${nom}: al final de la pantalla el botón flotante no tapa ningún control`, f.tapados.slice(0, 4));
    ok(sw[0] <= sw[1], `${tag} ${nom}: sin desborde horizontal`, sw);
    const rv = await page.evaluate(() => window.__qi.riel(80, innerHeight).filter(p => p.riel));
    ok(rv.length === 0, `${tag} ${nom}: nada de un riel en x=10..80`, rv.slice(0, 3));
    if (w === 390 && rol === 'admin' && /config-roles|config-notificaciones|inicio/.test(nom)) await page.screenshot({ path: OUT + PFX + `${nom}-final-${w}.png` });
  }
  // 7) Buzón: título y cifras
  await ir(page, "nav('waInbox',null)"); await sleep(600);
  r = await page.evaluate(() => ({ t: document.getElementById('pttl').textContent, kpi: [...document.querySelectorAll('#v-waInbox .nxWaProKpi .l')].map(l => [l.textContent, l.scrollWidth, l.clientWidth]), sw: document.documentElement.scrollWidth }));
  ok(r.t === 'WHATSAPP', `${tag} Buzón: el título dice WHATSAPP («${r.t}»)`);
  ok(r.kpi.length === 5 && r.kpi.every(k => k[1] <= k[2] + 1), `${tag} Buzón: las 5 cifras con el rótulo entero`, r.kpi);
  ok(r.sw <= w, `${tag} Buzón: sin desborde horizontal`, r.sw);
  if (w === 390 && rol === 'admin') await page.screenshot({ path: OUT + PFX + `buzon-${w}.png` });
  // 8) Préstamos (admin): barra inferior después del riel
  if (rol === 'admin') {
    await ir(page, 'nxAbrirPrestamos()'); await sleep(500);
    r = await page.evaluate(() => { const d = document.querySelector('.nxFP-dock'); if (!d || getComputedStyle(d).display === 'none') return null; const b = d.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), btns: [...d.querySelectorAll('.nxFP-dockBtn')].map(x => { const s = x.querySelector('span'); const bb = x.getBoundingClientRect(); return [s && s.textContent, s ? s.scrollWidth <= s.clientWidth + 1 : true, Math.round(bb.left), Math.round(bb.right)]; }) }; });
    ok(lleno(r), `${tag} Préstamos: la barra inferior a todo el ancho (x ${r && r.l}–${r && r.r})`, r);
    ok(r && r.btns.every((b, i, a) => b[1] && (i === 0 || b[2] >= a[i - 1][3] - 1)), `${tag} Préstamos: los 5 botones de la barra sin rótulos cortados ni montados`, r && r.btns);
    if (w === 390) await page.screenshot({ path: OUT + PFX + `prestamos-${w}.png` });
  }
  // 9) Toques de la barra superior
  r = await page.evaluate(() => [...document.querySelectorAll('.tnav .tn-tog, .tnav .tn-r > #btnRefrescar, .tnav .tn-r > .notif-bell')].filter(e => e.offsetParent).map(e => { const b = e.getBoundingClientRect(); return [e.className, Math.round(b.width), Math.round(b.height)]; }));
  ok(r.length === 3 && r.every(x => x[1] >= 44 && x[2] >= 44), `${tag} barra superior: menú, campana y actualizar de al menos 44×44 px`, r);
  // 10) Íconos planos (tema oscuro)
  const ICO = [['inicio', "nav('dashboard',null)"], ['clientes', "nav('clientes',null)"], ['cliente360', "nav('cliente360',null);setTimeout(()=>nxC360Abrir(ST.clientes[0].id),300)"], ['crm', "nav('crm',null)"], ['polizas', "nav('polizas',null)"], ['config', 'navConfig(1,null)'], ['modal-abono', "nav('clientes',null);setTimeout(()=>abrirAbono(ST.clientes[0].id),300)"], ['modal-nuevo-cliente', "nav('clientes',null);setTimeout(()=>abrirNuevoCli(),300)"]].concat(rol === 'admin' ? [['prestamos', 'nxAbrirPrestamos()'], ['solicitudes', 'nxAbrirSolicitudes()']] : []);
  for (const [nom, js] of ICO) {
    await ir(page, js);
    const b = await page.evaluate(async () => { const o = document.querySelector('.overlay.open') || document.querySelector('.content'); const all = new Set(); for (let k = 0; k < 6; k++) { window.__qi.brillos().forEach(x => all.add(x)); const a = o.scrollTop; o.scrollTop += o.clientHeight * .8; if (o.scrollTop === a) break; await new Promise(r => setTimeout(r, 200)); } o.scrollTop = 0; return [...all]; });
    ok(b.length === 0, `${tag} íconos planos en ${nom}: sin degradado, brillo, sombra interna ni drop-shadow`, b.slice(0, 6));
  }
  await page.evaluate(() => window.__qi.cerrar()); await sleep(200);
  ok(errs.length === 0, `${tag}: sin errores de consola`, errs.slice(0, 5));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('prospectos/reset'); await qa('orgtipo/seguros'); await qa('tema/none');
  const SOLO = process.env.QA_SOLO || ''; // 'clasico' = solo la parte de temas (desarrollo)
  if (!SOLO) for (const [w, h] of [[390, 664], [430, 740], [375, 667]]) for (const rol of ['admin', 'agente']) await movil(browser, w, h, rol);

  // Entrada al sistema (sin sesión)
  for (const [w, h] of (SOLO ? [] : [[390, 664], [375, 667], [430, 740]])) {
    const { ctx, page } = await abrir(browser, { w, h, login: true });
    const r = await page.evaluate(() => {
      const lum = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const b = document.getElementById('btnLogin').getBoundingClientRect(); const u = document.getElementById('loginUser');
      return { b: [Math.round(b.top), Math.round(b.bottom)], vh: innerHeight, sh: document.scrollingElement.scrollHeight, ph: +ratio(getComputedStyle(u, '::placeholder').color, getComputedStyle(u).backgroundColor).toFixed(2), bg: getComputedStyle(u).backgroundColor };
    });
    ok(r.b[1] <= r.vh, `login ${w}×${h}: «Entrar al sistema» visible sin desplazar (termina en ${r.b[1]} de ${r.vh})`, r);
    ok(r.ph >= 4.5, `login ${w}×${h}: texto de ejemplo ≥ 4.5:1 (${r.ph}) sobre el campo gris cálido (${r.bg})`, r);
    if (w === 390) await page.screenshot({ path: OUT + PFX + `login-${w}.png` });
    await ctx.close();
  }

  // Tema clásico: el coloreado de íconos (ahora en index.html) sigue igual; y al pasar a glass-oscuro en vivo se aplana.
  {
    await qa('tema/clasico');
    const { ctx, page, errs } = await abrir(browser, { w: 390, h: 844, rol: 'admin', tema: 'clasico' });
    await page.evaluate(H);
    await ir(page, "nav('clientes',null)");
    let r = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('tema-glass-oscuro'), n: document.querySelectorAll('i.ti[data-nxc="2"]').length, bg: (document.querySelector('.sf-kpi .ic i.ti') || {}).style?.background || '' }));
    ok(!r.cls && r.n > 3 && /gradient/.test(r.bg), `clásico: los íconos sueltos conservan su color por nombre (${r.n} coloreados)`, r);
    await page.evaluate(() => aplicarTema('glass-oscuro', false)); await sleep(500);
    r = await page.evaluate(() => ({ n: document.querySelectorAll('i.ti[data-nxc="2"]').length, bg: getComputedStyle(document.querySelector('.sf-kpi .ic i.ti')).backgroundImage }));
    ok(r.n === 0 && !/gradient/.test(r.bg), `cambio en vivo a glass-oscuro: los íconos quedan planos`, r);
    await page.evaluate(() => aplicarTema('clasico', false)); await sleep(700);
    r = await page.evaluate(() => document.querySelectorAll('i.ti[data-nxc="2"]').length);
    ok(r > 3, `cambio en vivo de vuelta a clásico: vuelve el color por nombre (${r})`);
    ok(errs.length === 0, 'clásico: sin errores de consola', errs.slice(0, 4));
    await ctx.close(); await qa('tema/none');
  }
  await browser.close();
  console.log(`\nRESULTADO qa-iphone: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
