// QA de los botones de barra de navegación de las ventanas (01-oct-2026, parches-nav-botones.js), tema Glass oscuro.
// App real (index.html + cadena de parches) contra scripts/qa-crm-mock-server.js, a 390×844 (iPhone) y 1280×800.
//  · Las 13 ventanas fijas de index.html + el visor de bauche + 5 casos sintéticos con los patrones reales del código
//    («← Cerrar» del POS, «← Volver» suelto, «← Volver» apilado, cabecera sin botones, ✕ + flecha inyectada).
//  · Cada cabecera: a lo sumo una salida visible por lado; Cerrar (✕) a la derecha, Atrás (‹) a la izquierda solo si
//    está apilada; círculo de 44 px (iPhone) / 36 px (escritorio); ícono claro con contraste; título centrado (±6 px);
//    tocar el botón sigue cerrando la ventana; sin errores de consola.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-nav-botones.mjs   (QA_SIN=1 → sin la capa, para el «antes»)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-nav-botones')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const SIN = !!process.env.QA_SIN;
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
  if (SIN) await page.route(/parches-nav-botones\.js/, r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
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
    await sleep(2500);
  return { ctx, page, errs };
}

// Mide la cabecera de la ventana abierta más alta (la última .overlay.open)
const MEDIR = () => {
  const ovs = [...document.querySelectorAll('.overlay.open')];
  const ov = ovs[ovs.length - 1]; if (!ov) return null;
  const modal = ov.querySelector('.modal'), mt = ov.querySelector('.modal > .mt'); if (!mt) return null;
  const mr = mt.getBoundingClientRect();
  const vis = el => { const c = getComputedStyle(el); const r = el.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const lum = s => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(s || ''); if (!m) return 0; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(+m[1]) + .7152 * f(+m[2]) + .0722 * f(+m[3]); };
  const btns = [...mt.querySelectorAll(':scope > button, :scope > a.btn')].filter(vis).map(b => {
    const r = b.getBoundingClientRect(), i = b.querySelector('i'), c = getComputedStyle(b);
    const txt = [...b.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && getComputedStyle(n).display !== 'none' && n.tagName !== 'I')).map(n => n.textContent).join('').trim();
    return { kind: b.getAttribute('data-nxnav'), icon: i ? i.className : '', txt, x: Math.round(r.x - mr.x), w: Math.round(r.width), h: Math.round(r.height),
      lado: (r.x + r.width / 2) < (mr.x + mr.width / 2) ? 'izq' : 'der', radio: c.borderTopLeftRadius, color: c.color, lumIcon: lum(c.color), fs: c.fontSize };
  });
  const t = mt.querySelector(':scope > [data-nxtitle]') || [...mt.children].find(e => e.tagName !== 'BUTTON');
  let centro = null;
  if (t) { const range = document.createRange(); range.selectNodeContents(t); const rr = range.getBoundingClientRect(); centro = Math.round((rr.x + rr.width / 2) - (mr.x + mr.width / 2)); }
  return { id: ov.id, titulo: t ? t.textContent.trim().slice(0, 40) : '', btns, centro, mtW: Math.round(mr.width), hasHead: mt.hasAttribute('data-nxhead') };
};

// Casos sintéticos con el HTML exacto de los patrones del código
const SINTETICOS = {
  posCerrar: { html: '<div class="modal" style="max-width:480px"><div class="mt"><span><i class="ti ti-user"></i> Elegir cliente</span><button class="nxBack" type="button" onclick="document.getElementById(\'qaPos\').remove()"><i class="ti ti-arrow-left"></i> Cerrar</button></div><div style="height:120px"></div></div>', id: 'qaPos', espera: { izq: null, der: 'close' } },
  volverSuelto: { html: '<div class="modal" style="max-width:480px"><div class="mt"><span><i class="ti ti-car"></i> Nuevo vehículo</span><button class="nxBack" type="button" onclick="document.getElementById(\'qaVs\').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div><div style="height:120px"></div></div>', id: 'qaVs', espera: { izq: null, der: 'close' } },
  sinBotones: { html: '<div class="modal" style="max-width:480px"><div class="mt"><span><i class="ti ti-file"></i> Documento</span></div><div style="height:120px"></div></div>', id: 'qaSb', espera: { izq: null, der: 'close' } },
  xMasFlecha: { html: '<div class="modal" style="max-width:520px"><div class="mt" style="display:flex;align-items:center;gap:8px"><span style="flex:1;text-align:center"><i class="ti ti-photo"></i> BAUCHE / COMPROBANTE</span><button aria-label="Cerrar ventana" class="btn bghost bsm" type="button" onclick="document.getElementById(\'qaXf\').classList.remove(\'open\')"><i class="ti ti-x"></i></button></div><div style="height:120px"></div></div>', id: 'qaXf', espera: { izq: null, der: 'close' } },
};

async function abrirSint(page, k, encima) {
  const s = SINTETICOS[k];
  await page.evaluate(({ s, encima }) => {
    if (encima) { const base = document.createElement('div'); base.className = 'overlay open'; base.id = 'qaBase'; base.innerHTML = '<div class="modal" style="max-width:520px"><div class="mt"><span>Secuencias</span><button class="btn bghost bsm" type="button" onclick="document.getElementById(\'qaBase\').remove()"><i class="ti ti-x"></i></button></div><div style="height:200px"></div></div>'; document.body.appendChild(base); }
    const ov = document.createElement('div'); ov.className = 'overlay open'; ov.id = s.id; ov.innerHTML = s.html; document.body.appendChild(ov);
  }, { s, encima });
  await sleep(350);
}

async function revisar(page, nombre, espera, w, captura) {
  const m = await page.evaluate(MEDIR);
  if (!m) { ok(false, `${w}px ${nombre}: cabecera encontrada`); return null; }
  const izq = m.btns.filter(b => b.lado === 'izq' && b.kind), der = m.btns.filter(b => b.lado === 'der' && b.kind);
  const salidas = m.btns.filter(b => b.kind === 'close' || b.kind === 'back' || /arrow-left|ti-x\b/.test(b.icon));
  ok(salidas.filter(b => b.kind === 'close' || /ti-x\b/.test(b.icon)).length <= 1, `${w}px ${nombre}: una sola ✕ visible`, m.btns);
  ok(m.btns.filter(b => /arrow-left|chevron-left/.test(b.icon)).length <= (espera.izq ? 1 : 0), `${w}px ${nombre}: sin flecha Atrás duplicada/indebida`, m.btns);
  if (espera.der) ok(der.length === 1 && der[0].kind === espera.der && /ti-x\b/.test(der[0].icon), `${w}px ${nombre}: Cerrar (✕) a la derecha`, m.btns);
  if (espera.izq) ok(izq.length === 1 && izq[0].kind === 'back' && /chevron-left/.test(izq[0].icon), `${w}px ${nombre}: Atrás (‹) a la izquierda`, m.btns);
  const tam = w < 500 ? 44 : 36;
  const nav = m.btns.filter(b => b.kind === 'close' || b.kind === 'back');
  ok(nav.length > 0 && nav.every(b => b.w === tam && b.h === tam && b.radio === '50%'), `${w}px ${nombre}: círculo ${tam}×${tam}`, nav);
  ok(nav.every(b => b.lumIcon > .8 && b.txt === ''), `${w}px ${nombre}: ícono claro, sin texto visible`, nav);
  if (m.btns.length === nav.length) ok(Math.abs(m.centro) <= 6, `${w}px ${nombre}: título centrado (${m.centro}px)`, m);
  if (captura) await page.locator('.overlay.open .modal >> nth=-1').screenshot({ path: OUT + captura }).catch(() => {});
  return m;
}

(async () => {
  const browser = await chromium.launch();
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px ${SIN ? '(SIN la capa)' : ''}`);
    const { ctx, page, errs } = await abrir(browser, w);
    const tema = await page.evaluate(() => document.documentElement.classList.contains('tema-glass-oscuro'));
    ok(tema, `${w}px tema Glass oscuro activo`);
    // 13 ventanas fijas
    const fijas = await page.evaluate(() => [...document.querySelectorAll('body > .overlay[id], .overlay[id]')].map(o => o.id).filter((v, i, a) => a.indexOf(v) === i));
    for (const id of fijas) {
      await page.evaluate(id => document.getElementById(id).classList.add('open'), id); await sleep(300);
      const tiene = await page.evaluate(id => !!document.querySelector('#' + id + ' .modal > .mt'), id);
      if (tiene) await revisar(page, '#' + id, { der: 'close' }, w, w === 390 && id === 'mAbono' ? `${SIN ? 'antes' : 'despues'}-mAbono-390.png` : null);
      await page.evaluate(id => document.getElementById(id).classList.remove('open'), id); await sleep(120);
    }
    // Visor de bauche (la ventana de la captura del dueño)
    await page.evaluate(() => window.nxVerComprobante && window.nxVerComprobante('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="#ddd"/></svg>')));
    await sleep(500);
    if (await page.evaluate(() => !!document.querySelector('#nxVisorBauche.open'))) {
      await revisar(page, 'Visor de bauche', { der: 'close' }, w, `${SIN ? 'antes' : 'despues'}-bauche-${w}.png`);
      if (!SIN) {
        await page.locator('#nxVisorBauche [data-nxnav="close"]').click();
        await sleep(250);
        ok(await page.evaluate(() => !document.querySelector('#nxVisorBauche.open')), `${w}px Visor de bauche: la ✕ cierra la ventana`);
      } else await page.evaluate(() => document.getElementById('nxVisorBauche').classList.remove('open'));
    } else ok(false, `${w}px Visor de bauche abre`);
    // Casos sintéticos
    for (const k of Object.keys(SINTETICOS)) {
      await abrirSint(page, k, false);
      await revisar(page, k, SINTETICOS[k].espera, w, w === 390 ? `${SIN ? 'antes' : 'despues'}-${k}-390.png` : null);
      if (!SIN) {
        await page.locator(`#${SINTETICOS[k].id} [data-nxnav="close"]`).click();
        await sleep(200);
        ok(await page.evaluate(id => { const o = document.getElementById(id); return !o || !o.classList.contains('open'); }, SINTETICOS[k].id), `${w}px ${k}: la ✕ cierra la ventana`);
      }
      await page.evaluate(id => { const o = document.getElementById(id); if (o) o.remove(); }, SINTETICOS[k].id);
    }
    // Apilada: «← Volver» encima de otra ventana = Atrás a la izquierda, y vuelve a la de abajo
    await abrirSint(page, 'volverSuelto', true);
    await revisar(page, 'volverApilado', { izq: 'back' }, w, w === 390 ? `${SIN ? 'antes' : 'despues'}-apilada-390.png` : null);
    if (!SIN) {
      await page.locator('#qaVs [data-nxnav="back"]').click(); await sleep(200);
      ok(await page.evaluate(() => !document.getElementById('qaVs') && !!document.querySelector('#qaBase.open')), `${w}px volverApilado: ‹ vuelve a la ventana de abajo`);
    }
    await page.evaluate(() => { ['qaVs', 'qaBase'].forEach(id => { const o = document.getElementById(id); if (o) o.remove(); }); });
    ok(errs.length === 0, `${w}px sin errores de consola`, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
