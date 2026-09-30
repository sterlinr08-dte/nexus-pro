// QA de la iconografía del tema «Glass oscuro» (58.94, 30-sep-2026): app real (index.html + cadena de parches) contra la REST
// simulada de scripts/qa-crm-mock-server.js. A 390 px (UA iPhone) y 1280 px, admin, recorre las pantallas y comprueba:
//  · ningún <i class="ti"> dentro de button / .btn / .sf-btn / .pill / .chip / .nxBtn / pestañas / chips de filtro lleva caja:
//    fondo con alpha > 0, borde visible o degradado (el «cuadrado con borde» de la captura del dueño);
//  · los tiles (ícono protagonista: cifras, accesos rápidos, cabeceras, pestañas de Configuración) son cuadrados con radio ≥ 25 % del
//    lado, relleno translúcido sin degradado y glifo centrado;
//  · ningún ícono visible tiene degradado de fondo ni brillo ::after; tamaños de glifo en botones y tiles dentro de {18,20,22,24,28,32};
//  · Clásico no cambia (conserva el coloreado por nombre y no recibe los tokens --nx-ico-*).
// Uso: PORT=8957 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8957 QA_OUT=/ruta node scripts/qa-iconos.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-iconos')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const PFX = process.env.QA_PFX || '';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 900) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(s); } }); }));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ID = { admin: '00000000-0000-4000-8000-000000000001', agente: '00000000-0000-4000-8000-000000000002' };
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function abrir(browser, { width, rol, mirror }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA_IPHONE : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
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
  await page.addInitScript(({ rol, id, mirror }) => {
    if (mirror) localStorage.setItem('nx_tema', mirror); else localStorage.removeItem('nx_tema'); localStorage.removeItem('nx_tgo_off');
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id, nom: rol === 'admin' ? 'Esterlin Espinal' : 'Robinson Perez', rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); sessionStorage.setItem('nx_splash_shown', '1');
  }, { rol, id: ID[rol], mirror });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(2500);
  return { ctx, page, errs };
}
async function ir(page, js) {
  await page.evaluate((js) => {
    try { closeMobSB(); } catch (e) {} document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
    js = js.replace(/nav\('([\w-]+)',null\)/g, (m, v) => `nav('${v}',document.querySelector('#sbEl .ni[onclick^="nav(\\'${v}\\'"]'))`);
    try { (0, eval)(js); } catch (e) { console.warn('qa ir: ' + e.message); }
  }, js);
  await sleep(1500);
  await page.evaluate(() => { const c = document.querySelector('.content'); if (c) c.scrollTo(0, 0); });
  await sleep(150);
}

// Pantallas: [nombre, cómo abrirla]. «facturas-atrasadas» pinta las tarjetas de factura con COBRAR / WhatsApp / ⋮ (la captura del dueño).
const VISTAS = [
  ['inicio', "nav('dashboard',null)"], ['clientes', "nav('clientes',null)"], ['cobros', "nav('clientes',null);setTimeout(()=>switchTab('cob'),250)"],
  ['facturas', "nav('facturas',null)"], ['facturas-atrasadas', "nav('facturas',null);setTimeout(()=>{var s=document.getElementById('fFactEstado');if(s){s.value='atrasadas';rFact();}},300)"],
  ['cliente360', "nav('cliente360',null);setTimeout(()=>nxC360Abrir(ST.clientes[0].id),300)"], ['polizas', "nav('polizas',null)"], ['solicitudes', "nxAbrirSolicitudes()"],
  ['crm', "nav('crm',null)"], ['config', "navConfig(12,null)"], ['prestamos', "nxAbrirPrestamos()"], ['modal-abono', "nav('clientes',null);setTimeout(()=>abrirAbono(ST.clientes[0].id),300)"],
];
const TAMANOS = [18, 20, 22, 24, 28, 32];

// Medición en la página (sin tocar #v-waInbox ni el riel, que van por otras capas).
const MEDIR = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return p.length > 3 ? p[3] : 1; };
  const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const nm = (el) => { let s = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''); const p = el.parentElement; if (p) s += ' < ' + p.tagName.toLowerCase() + (typeof p.className === 'string' && p.className.trim() ? '.' + p.className.trim().split(/\s+/).slice(0, 2).join('.') : ''); return s; };
  const caja = (el) => { const cs = getComputedStyle(el); const a = parse(cs.backgroundColor) || 0; const bw = parseFloat(cs.borderTopWidth) || 0, bs = cs.borderTopStyle, ba = parse(cs.borderTopColor) || 0; const grad = /gradient/.test(cs.backgroundImage) && !/url\(/.test(cs.backgroundImage); return { fondo: a > 0.01, borde: bw > 0 && bs !== 'none' && ba > 0.01, grad, cs }; };
  const fuera = (el) => el.closest('#v-waInbox,#sbEl,nav.sb');
  window.__ico = {
    // 1) glifos dentro de botones, píldoras, chips, pestañas y filas: sin caja
    botones() {
      const malos = []; let n = 0;
      document.querySelectorAll(':is(button,.btn,.sf-btn,.pill,.chip,.nxBtn,.cbBtn,.maBtn,.nxft-tab,.nfcBtn,.nxVistaOpt,.nxpag-btn,.nxBusca-lupa,.cliCard-more,.fc-ico,.echip,.badge,.sfr-prev,.tn-b,.tn-tog,td,label,summary) i.ti').forEach(el => {
        if (fuera(el) || el.closest('.cfg-tab,.acc-menu') || !vis(el)) return; n++;
        const c = caja(el); if (c.fondo || c.borde || c.grad) malos.push([nm(el), c.cs.backgroundColor, c.cs.borderTopWidth + ' ' + c.cs.borderTopColor, c.grad ? 'degradado' : '']);
      });
      return { n, malos };
    },
    // 2) tamaño del glifo en botones/píldoras (tokens --nx-ico-sm / --nx-ico-md)
    tamanos(set) {
      const malos = []; let n = 0;
      document.querySelectorAll(':is(.btn,.sf-btn,.cbBtn,.maBtn,.nxft-tab,.nfcBtn,.nxVistaOpt,.nxpag-btn,.nxBusca-lupa,.cliCard-more,.fc-ico,.echip,.tn-b,.tn-tog) i.ti').forEach(el => {
        if (fuera(el) || el.closest('.cfg-tab,.acc-menu') || !vis(el)) return; n++;
        const fs = Math.round(parseFloat(getComputedStyle(el).fontSize)); if (!set.includes(fs)) malos.push([nm(el), fs]);
      });
      return { n, malos };
    },
    // 3) tiles: cuadrados, radio ≥ 25 % del lado, relleno translúcido sin degradado, glifo en el conjunto de tamaños, centrado
    tiles(set) {
      const malos = []; let n = 0; const dentro = [];
      const SEL = '#v-dashboard .kpi i.ti,#v-dashboard .sm i.ti,#nxIG .nxIG-acc .qa i.qa-ico,.nc .ct>i.ti,.nxSL-section-title>i.ti,.nxSf .sf-fantitle h2 i.ti,.cfg-tab i,.acc-menu button>i.ti,.sf-kpi .ic,.nxFP-dico,.nxFP-emptyIco,.nxFP-hAsi,.nxSL-head-icon,.mobile-more-sheet-clean .icon,#mAbono .aboToggleIc,#mAbono .aboSummaryIc';
      document.querySelectorAll(SEL).forEach(el => {
        if (fuera(el) || !vis(el)) return; n++;
        const b = el.getBoundingClientRect(), cs = getComputedStyle(el), c = caja(el);
        const r = cs.borderTopLeftRadius; const rpx = /%$/.test(r) ? parseFloat(r) / 100 * b.width : parseFloat(r);
        const glifo = el.matches('i') ? el : el.querySelector('i.ti'); const fs = glifo ? Math.round(parseFloat(getComputedStyle(glifo).fontSize)) : null;
        const lado = Math.round(b.width), alto = Math.round(b.height);
        const centrado = glifo ? (() => { const g = glifo.getBoundingClientRect(); return Math.abs((g.left + g.width / 2) - (b.left + b.width / 2)) <= 2 && Math.abs((g.top + g.height / 2) - (b.top + b.height / 2)) <= 3; })() : true;
        const gl = glifo && glifo !== el ? caja(glifo) : { fondo: false, borde: false, grad: false };
        const p = { sel: nm(el), lado, alto, radio: +(rpx / b.width).toFixed(2), fondo: c.fondo, grad: c.grad, glifo: fs, centrado, glifoConCaja: gl.fondo || gl.borde || gl.grad };
        if (Math.abs(lado - alto) > 1 || rpx < 0.25 * b.width - 0.5 || !c.fondo || c.grad || (fs !== null && !set.includes(fs)) || !centrado || p.glifoConCaja) malos.push(p); else dentro.push(p.sel);
      });
      return { n, malos };
    },
    // 4) ningún ícono visible con degradado ni brillo ::after
    planos() {
      const malos = []; let n = 0;
      document.querySelectorAll('i.ti,.qa-ico').forEach(el => {
        if (fuera(el) || !vis(el)) return; n++;
        const cs = getComputedStyle(el); const grad = /gradient/.test(cs.backgroundImage); const a = getComputedStyle(el, '::after'); const glint = a.content !== 'none' && a.content !== 'normal' && /gradient/.test(a.backgroundImage);
        const inset = /inset/.test(cs.boxShadow); if (grad || glint || inset) malos.push([nm(el), grad ? 'degradado' : '', glint ? 'brillo' : '', inset ? 'sombra-interna' : '']);
      });
      return { n, malos };
    },
    tokens() { const cs = getComputedStyle(document.documentElement); return { sm: cs.getPropertyValue('--nx-ico-sm').trim(), md: cs.getPropertyValue('--nx-ico-md').trim(), r: cs.getPropertyValue('--nx-ico-tile-r').trim(), squircle: CSS.supports('corner-shape', 'squircle') }; },
  };
};

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('prospectos/reset'); await qa('orgtipo/seguros'); await qa('tema/none');
  for (const width of [390, 1280]) {
    const tag = `${width}-admin`;
    console.log(`\n=== ${tag} glass-oscuro ===`);
    const A = await abrir(browser, { width, rol: 'admin' });
    await A.page.addInitScript(MEDIR); await A.page.evaluate(MEDIR);
    const tk = await A.page.evaluate(() => window.__ico.tokens());
    ok(tk.sm === '18px' && tk.md === '20px' && tk.r === '28%', `${tag}: tokens de iconografía en :root (--nx-ico-sm 18, --nx-ico-md 20, radio de tile 28 %)`, tk);
    console.log('      corner-shape:squircle en este Chromium: ' + tk.squircle);
    for (const [nom, js] of VISTAS) {
      await ir(A.page, js);
      const b = await A.page.evaluate(() => window.__ico.botones());
      ok(b.n > 0 && b.malos.length === 0, `${tag} ${nom}: ningún ícono dentro de botón/píldora/chip/pestaña/fila lleva caja ni borde (${b.n} íconos)`, b.malos.slice(0, 8));
      const t = await A.page.evaluate((s) => window.__ico.tamanos(s), TAMANOS);
      ok(t.malos.length === 0, `${tag} ${nom}: glifos de botones en {18,20} px (${t.n})`, t.malos.slice(0, 8));
      const ti = await A.page.evaluate((s) => window.__ico.tiles(s), TAMANOS);
      ok(ti.malos.length === 0, `${tag} ${nom}: tiles cuadrados, radio ≥25 %, tinte sin degradado, glifo centrado y sin caja propia (${ti.n} tiles)`, ti.malos.slice(0, 6));
      const p = await A.page.evaluate(() => window.__ico.planos());
      ok(p.malos.length === 0, `${tag} ${nom}: ningún ícono con degradado, brillo ni sombra interna (${p.n})`, p.malos.slice(0, 6));
      if (nom === 'facturas-atrasadas') {
        const ico = await A.page.evaluate(() => { const i = document.querySelector('.nxSf table.sf-fact td[data-lb="Cobro"] .btn i.ti'); if (!i) return null; const cs = getComputedStyle(i); return { cls: i.className, bg: cs.backgroundColor, b: cs.borderTopWidth, fs: cs.fontSize, disp: cs.display }; });
        ok(ico && /ti-cash/.test(ico.cls) && /rgba\(0, 0, 0, 0\)|transparent/.test(ico.bg) && ico.b === '0px' && ico.fs === '18px', `${tag} facturas: el botón COBRAR lleva ti-cash sin caja (glifo 18 px)`, ico);
        const wa = await A.page.evaluate(() => { const i = document.querySelector('.nxSf table.sf-fact td[data-lb="Acciones"] .btn i.ti-brand-whatsapp'); if (!i) return null; const cs = getComputedStyle(i); return { color: cs.color, bg: cs.backgroundColor, b: cs.borderTopWidth, fs: cs.fontSize }; });
        ok(wa && wa.color === 'rgb(74, 222, 128)' && wa.b === '0px' && /rgba\(0, 0, 0, 0\)/.test(wa.bg), `${tag} facturas: WhatsApp de la tarjeta en verde, sin caja`, wa);
        if (width === 390) { try { const h = A.page.locator('.nxSf table.sf-fact tbody tr').first(); await h.scrollIntoViewIfNeeded(); await h.screenshot({ path: OUT + PFX + 'cobros-390-tarjeta.png' }); } catch (e) {} }
      }
      if (['inicio', 'clientes', 'cobros', 'config', 'facturas-atrasadas'].includes(nom)) await A.page.screenshot({ path: OUT + PFX + `${nom}-${width}.png` });
      await A.page.evaluate(() => document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')));
    }
    ok(A.errs.length === 0, `${tag}: sin errores de consola en todo el recorrido`, A.errs.slice(0, 5));
    await A.ctx.close();
  }
  // Clásico (1280, admin): no recibe los tokens y conserva su coloreado por nombre (colorize en parches-seguros-base.js).
  await qa('tema/clasico');
  const B = await abrir(browser, { width: 1280, rol: 'admin', mirror: 'clasico' });
  await B.page.evaluate(MEDIR);
  const c = await B.page.evaluate(() => ({ cls: document.documentElement.classList.contains('tema-glass-oscuro'), tk: window.__ico.tokens(), coloreados: [...document.querySelectorAll('i.ti')].filter(e => /gradient/.test(e.getAttribute('style') || '')).length, kpi: (() => { const i = document.querySelector('.sf-kpi .ic i.ti, #v-dashboard .kpi i.ti'); return i ? getComputedStyle(i).backgroundImage.slice(0, 40) : null; })() }));
  ok(!c.cls && c.tk.sm === '' && c.tk.r === '' && c.coloreados > 3, `clásico: sin tokens --nx-ico-* y con el coloreado por nombre intacto (${c.coloreados} íconos coloreados)`, c);
  await B.ctx.close();
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
