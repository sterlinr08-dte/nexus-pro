// QA de la búsqueda «Premium» (58.94, 30-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js, a 390×844 (UA iPhone) y 1280×800, sesión admin. En cada módulo con buscador (fuera del
// Buzón de WhatsApp):
//  · la lupa se monta (marco role=search, aria-expanded/aria-controls) y el campo conserva su id;
//  · abrir (clic en la lupa): el campo queda enfocado y la píldora pasa del 60 % del ancho objetivo en < 600 ms
//    (objetivo = ancho del contenedor en el celular; min(contenedor, 480 px) en escritorio, donde crece en línea);
//  · escribir filtra: el listener original sigue disparando (campo oculto del módulo con el texto / estado del CRM) y las
//    filas visibles bajan o se mantienen;
//  · Esc cierra (y devuelve el foco a la lupa); toque fuera cierra; ✕ limpia y el segundo toque cierra;
//  · sin errores de consola; sin salto de diseño: el título del cuadro no se mueve más de 4 px al abrir (en el celular
//    los filtros de la misma línea se desvanecen, previsto);
//  · movimiento reducido: abre sin resorte (ancho final de inmediato) y sin puntos.
// Capturas antes/después por módulo y secuencia de 6 fotogramas de la apertura (clientes-390-abrir-1..6.png).
// Uso: PORT=8963 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8963 QA_OUT=/ruta node scripts/qa-busqueda-premium.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-busqueda')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => r(s)); }).on('error', () => r('')));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ID = { admin: '00000000-0000-4000-8000-000000000001', agente: '00000000-0000-4000-8000-000000000002' };
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, { w, h, rol, tema = null, reducido = false }) {
  const movil = w < 769;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: movil ? 2 : 1, isMobile: movil, hasTouch: movil, userAgent: movil ? UA_IPHONE : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', reducedMotion: reducido ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript(({ rol, id, tema }) => {
    if (tema) localStorage.setItem('nx_tema', tema); else localStorage.removeItem('nx_tema');
    localStorage.removeItem('nx_tgo_off');
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id, nom: rol === 'admin' ? 'Esterlin Espinal' : 'Robinson Perez', rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { rol, id: ID[rol], tema });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => !!window.nxBusquedaPremium, null, { timeout: 8000 }).catch(() => {});
  await sleep(2000);
  return { ctx, page, errs };
}

async function ir(page, js) {
  await page.evaluate((js) => {
    try { closeMobSB(); } catch (e) {} document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
    js = js.replace(/nav\('([\w-]+)',null\)/g, (m, v) => `nav('${v}',document.querySelector('#sbEl .ni[onclick^="nav(\\'${v}\\'"]'))`);
    try { (0, eval)(js); } catch (e) { console.warn('qa ir: ' + e.message); }
  }, js);
  await sleep(1400);
  await page.evaluate(() => { const c = document.querySelector('.content'); if (c) c.scrollTo(0, 0); });
  await sleep(150);
}

// [nombre, cómo abrir el módulo, campo, selector de filas, campo oculto del módulo (o null), texto a escribir, título de referencia]
const MODULOS = [
  ['clientes', "nav('clientes',null)", '#nbiIn_cliQ', '#tbCli .cli-row', '#cliQ', 'Maria', '#v-clientes .nc .ct'],
  ['polizas', "nav('polizas',null)", '#nbiIn_polQ', '#tbPol tr', '#polQ', 'Maria', '#v-polizas .nc .ct'],
  ['facturas', "nav('facturas',null)", '#nbiIn_factQ', '#tbFact tbody tr', '#factQ', 'Maria', '#panelFact .ct'],
  ['cobros', "nav('facturas',null);setTimeout(()=>switchTab('cob'),250)", '#nbiIn_cobQ', '#tbCob .nxCobCard', '#cobQ', 'Maria', '#panelCob .ct'],
  ['pagos', "nav('facturas',null);setTimeout(()=>switchTab('pagos'),250)", '#nbiIn_pgBuscar', '#tbPagos tbody tr', '#pgBuscar', 'Maria', '#panelPagos .ct'],
  ['cliente360', "nav('cliente360',null)", '#c360Q', '#c360Lista .c360-row', null, 'Maria', '#c360Main, .c360-side'],
  ['crm', "nav('crm',null)", '#nxCrmQ', '#v-crm .nxCrmRow', null, 'Maria', '#v-crm .nxCrmHomeHead h1'],
  ['prospectos', "nav('crm',null);setTimeout(()=>nxCrm.tab('prospectos'),350)", '#nxCrmQPros', '#nxCrmProsHost [onclick*="prosAbrir"]', null, 'Maria', '#v-crm .nxCrmHomeHead h1'],
  ['auditoria', 'navConfig(8,null)', '#nbiIn_auditFiltroUsr', '#auditRows tbody tr', '#auditFiltroUsr', 'Esterlin', '#v-config .ct, #v-config h2, #auditCfg'],
  ['solicitudes', 'nxAbrirSolicitudes()', '#nbiIn_nxPendBuscar', '#nxPendLista .nxPendCard', null, 'Maria', '#panelPend h2, #panelPend h3, #panelPend .ct'],
];

// Medición dentro de la página
const H = () => {
  window.__bp = {
    inst(sel) { const i = document.querySelector(sel); return i && window.nxBusquedaPremium.instancia(i); },
    estado(sel) {
      const i = document.querySelector(sel); if (!i) return null; const ins = window.nxBusquedaPremium.instancia(i); if (!ins) return { montado: false };
      const m = ins.marco.getBoundingClientRect(), c = ins.cont.getBoundingClientRect(); const cs = getComputedStyle(ins.marco), ccs = getComputedStyle(ins.cont);
      const padL = parseFloat(ccs.paddingLeft) || 0, padR = parseFloat(ccs.paddingRight) || 0, bL = parseFloat(ccs.borderLeftWidth) || 0;
      return { montado: true, abierto: ins.abierto, open: ins.wrap.classList.contains('open'), w: m.width, cw: ins.cont.clientWidth - padL - padR, cx: c.left + bL + padL, mx: m.left, wObj: ins.wObj || 0, D: parseFloat(cs.getPropertyValue('--nxbp-d')), foco: document.activeElement === i, focoLupa: document.activeElement === ins.lupa,
        role: ins.marco.getAttribute('role'), exp: ins.lupa.getAttribute('aria-expanded'), ctrl: ins.lupa.getAttribute('aria-controls'), id: i.id, valor: i.value, aura: getComputedStyle(ins.aura).display, flot: ins.marco.classList.contains('nxbp-flotante'), desv: ins.hermanos.length, xVisible: getComputedStyle(ins.x).display !== 'none' && +getComputedStyle(ins.x).opacity > .5, top: m.top, bottom: m.bottom };
    },
    filas(sel) { return [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null && e.getBoundingClientRect().height > 0).length; },
    // Posición del título en el documento (viewport + desplazamiento del área de contenido): mide salto de diseño, no desplazamiento.
    top(sel) { const c = document.querySelector('.content'), st = c ? c.scrollTop : 0; for (const s of sel.split(',')) { const e = document.querySelector(s.trim()); if (e && e.getBoundingClientRect().height) { const r = e.getBoundingClientRect(); return { t: r.top + st, vt: r.top, l: r.left, w: r.width, h: r.height }; } } return null; },
    oculto(sel) { const e = document.querySelector(sel); return e ? e.value : null; },
    crmQ() { try { const s = nxCrm.qa.estado(); return { q: s.q, qPros: s.qPros }; } catch (e) { return null; } },
    rect(sel) { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; },
  };
};

async function esperarAbierto(page, campo, objetivo, lim = 600) {
  const t0 = Date.now(); let e = null;
  while (Date.now() - t0 < lim) { e = await page.evaluate((s) => window.__bp.estado(s), campo); if (e && e.foco && e.w >= objetivo(e) * 0.6) return { ms: Date.now() - t0, e }; await sleep(30); }
  return { ms: -1, e };
}

async function probarModulo(page, w, nom, js, campo, filas, oculto, texto, titulo, errs) {
  const tag = `${nom} ${w}`;
  await ir(page, js);
  await page.waitForSelector(campo, { state: 'attached', timeout: 6000 }).catch(() => {});
  let e = await page.evaluate((s) => window.__bp.estado(s), campo);
  if (!e || !e.w) { console.log('SKIP  ' + tag + ': el módulo no muestra ese buscador en el simulador (' + campo + ')'); return; }
  ok(e.montado && e.role === 'search' && e.exp === 'false' && e.ctrl === e.id, `${tag}: lupa montada (role=search, aria-expanded, aria-controls=${e.id})`, e);
  ok(Math.abs(e.w - e.D) < 1.5, `${tag}: cerrado mide el círculo (${e.w.toFixed(1)} px ≈ ${e.D} px)`, e);
  const lupa = page.locator(campo).locator('xpath=..').locator('.nxBusca-lupa').first();
  await lupa.scrollIntoViewIfNeeded(); await sleep(250);   // Playwright desplazaría al hacer clic: se mide el título ya con la lupa a la vista
  await page.screenshot({ path: OUT + `${nom}-${w}-antes.png` });
  const tituloAntes = await page.evaluate((s) => window.__bp.top(s), titulo);
  const filasAntes = await page.evaluate((s) => window.__bp.filas(s), filas);
  await lupa.click();
  const objetivo = (x) => w < 769 ? x.cw : (x.wObj || Math.min(x.cw, 480));
  const r = await esperarAbierto(page, campo, objetivo);
  ok(r.ms >= 0 && r.ms < 600, `${tag}: abre y enfoca con ancho > 60 % del objetivo en ${r.ms} ms (< 600)`, r.e);
  await sleep(700);
  e = await page.evaluate((s) => window.__bp.estado(s), campo);
  ok(e.abierto && e.open && e.exp === 'true' && e.foco, `${tag}: abierto (aria-expanded=true, foco en el campo)`, e);
  if (w < 769) ok(e.flot && e.w >= e.cw - 2 && Math.abs(e.mx - e.cx) < 3, `${tag}: en el celular la píldora flota a todo el ancho de su fila (${e.w.toFixed(0)}/${e.cw}) desde el borde izquierdo`, e);
  else ok(e.w >= Math.max(300, Math.min(e.cw, 480)) * 0.6 && Math.abs(e.w - e.wObj) < 2, `${tag}: en escritorio crece en línea hasta su objetivo (${e.w.toFixed(0)} px; sitio libre de la línea, 300–480 px)`, e);
  ok(e.xVisible, `${tag}: la ✕ se ve al abrir`, e);
  ok(e.aura === 'block', `${tag}: puntos flotantes activos al abrir`, e);
  const tituloDespues = await page.evaluate((s) => window.__bp.top(s), titulo);
  if (tituloAntes && tituloDespues) ok(Math.abs(tituloAntes.t - tituloDespues.t) <= 4 && Math.abs(tituloAntes.l - tituloDespues.l) <= 4, `${tag}: el título no se mueve al abrir (Δ ${Math.abs(tituloAntes.t - tituloDespues.t).toFixed(1)} px)`, { tituloAntes, tituloDespues });
  else console.log('INFO  ' + tag + ': sin título de referencia para medir el salto');
  // escribir: el filtrado real sigue vivo
  await page.keyboard.type(texto, { delay: 30 });
  await sleep(700);
  const filasDespues = await page.evaluate((s) => window.__bp.filas(s), filas);
  const valorOculto = oculto ? await page.evaluate((s) => window.__bp.oculto(s), oculto) : null;
  const crm = await page.evaluate(() => window.__bp.crmQ());
  const eco = oculto ? valorOculto === texto : nom === 'crm' ? crm && crm.q === texto : nom === 'prospectos' ? crm && crm.qPros === texto : null;
  e = await page.evaluate((s) => window.__bp.estado(s), campo);
  ok(e.valor === texto && e.abierto, `${tag}: el texto queda en el mismo campo (#${e.id}) y sigue abierto`, e);
  if (eco !== null) ok(eco === true, `${tag}: el listener original recibió «${texto}» (${oculto ? 'campo oculto ' + oculto : 'estado del CRM'})`, { valorOculto, crm });
  ok(filasDespues <= filasAntes && (filasAntes <= 1 || filasDespues < filasAntes || eco === true), `${tag}: filtra (filas visibles ${filasAntes} → ${filasDespues})`, { filasAntes, filasDespues });
  await page.screenshot({ path: OUT + `${nom}-${w}-despues.png` });
  // ✕: primero limpia (sigue abierto), el segundo toque cierra
  const x = page.locator(campo).locator('xpath=..').locator('.nxBusca-x').first();
  await x.click(); await sleep(500);
  e = await page.evaluate((s) => window.__bp.estado(s), campo);
  const filasLimpio = await page.evaluate((s) => window.__bp.filas(s), filas);
  ok(e.valor === '' && e.abierto && e.foco, `${tag}: ✕ limpia y conserva el foco (sigue abierto)`, e);
  ok(filasLimpio >= filasDespues, `${tag}: al limpiar vuelven las filas (${filasDespues} → ${filasLimpio})`, { filasDespues, filasLimpio });
  await x.click(); await sleep(800);
  e = await page.evaluate((s) => window.__bp.estado(s), campo);
  ok(!e.abierto && !e.open && Math.abs(e.w - e.D) < 1.5 && !e.flot, `${tag}: segundo toque a ✕ cierra al círculo (${e.w.toFixed(1)} px)`, e);
  // Esc cierra y devuelve el foco a la lupa
  await lupa.click(); await sleep(600);
  await page.keyboard.press('Escape'); await sleep(800);
  e = await page.evaluate((s) => window.__bp.estado(s), campo);
  ok(!e.abierto && Math.abs(e.w - e.D) < 1.5 && e.focoLupa, `${tag}: Esc cierra y el foco vuelve a la lupa`, e);
  // toque fuera cierra
  await lupa.click(); await sleep(600);
  // toque fuera: sobre el título de la barra (#pttl), que nunca queda debajo de la píldora flotante
  const ref = await page.evaluate((s) => window.__bp.top(s), '#pttl, ' + titulo);
  if (ref) { await page.mouse.click(ref.l + 6, ref.vt + Math.min(6, ref.h / 2)); await sleep(900); e = await page.evaluate((s) => window.__bp.estado(s), campo); ok(!e.abierto && Math.abs(e.w - e.D) < 1.5, `${tag}: toque fuera cierra`, e); }
  else { await page.keyboard.press('Escape'); await sleep(600); }
  const tituloFinal = await page.evaluate((s) => window.__bp.top(s), titulo);
  if (tituloAntes && tituloFinal) ok(Math.abs(tituloAntes.t - tituloFinal.t) <= 4, `${tag}: al cerrar el diseño vuelve al sitio (Δ ${Math.abs(tituloAntes.t - tituloFinal.t).toFixed(1)} px)`, { tituloAntes, tituloFinal });
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('prospectos/reset'); await qa('orgtipo/seguros'); await qa('tema/none');
  const SOLO = process.env.QA_SOLO || '';
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { ctx, page, errs } = await abrir(browser, { w, h, rol: 'admin' });
    await page.evaluate(H);
    ok(await page.evaluate(() => !!(window.nxBusquedaPremium && window.nxBusquedaPremium.montar)), `${w}: parches-busqueda-premium.js cargó (API window.nxBusquedaPremium)`);
    ok(await page.evaluate(() => !!document.getElementById('nxBusquedaPremiumCSS')), `${w}: style#nxBusquedaPremiumCSS presente en el <head>`);
    for (const [nom, js, campo, filas, oculto, texto, titulo] of MODULOS) {
      if (SOLO && SOLO !== nom) continue;
      try { await probarModulo(page, w, nom, js, campo, filas, oculto, texto, titulo, errs); } catch (e) { ok(false, `${nom} ${w}: excepción en la prueba`, String(e.message || e)); }
    }
    // El Buzón de WhatsApp no se toca: ningún marco dentro de #v-waInbox
    await ir(page, "nav('waInbox',null)"); await sleep(800);
    const wa = await page.evaluate(() => ({ marcos: document.querySelectorAll('#v-waInbox .nxbp-marco').length, lupas: document.querySelectorAll('#v-waInbox .nxBusca-c').length }));
    ok(wa.marcos === 0, `${w}: el Buzón de WhatsApp queda intacto (0 marcos premium dentro de #v-waInbox)`, wa);
    ok(errs.length === 0, `${w}: sin errores de consola`, errs.slice(0, 5));
    // Secuencia de 6 fotogramas de la apertura en Clientes (resorte 6× más lento para verlo cuadro a cuadro)
    if (w === 390 && !SOLO) {
      await ir(page, "nav('clientes',null)");
      const clip = await page.evaluate(() => { const f = document.querySelector('#v-clientes .frow'); f.scrollIntoView({ block: 'center' }); const r = f.getBoundingClientRect(); const y = Math.max(0, Math.min(innerHeight - 120, r.top - 70)); return { x: 0, y, w: innerWidth, h: Math.max(120, Math.min(innerHeight - y, r.height + 150)) }; });
      await page.evaluate(() => { window.nxBusquedaPremium.escalaTiempo = 6; });
      const lupa = page.locator('#nbiIn_cliQ').locator('xpath=..').locator('.nxBusca-lupa').first();
      await lupa.click({ noWaitAfter: true });
      for (let i = 1; i <= 6; i++) { await page.screenshot({ path: OUT + `clientes-390-abrir-${i}.png`, clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h } }); await sleep(230); }
      await page.evaluate(() => { window.nxBusquedaPremium.escalaTiempo = 1; });
      await sleep(600); await page.keyboard.press('Escape'); await sleep(700);
    }
    await ctx.close();
  }
  // Movimiento reducido: abre sin resorte (ancho final de inmediato) y sin puntos
  {
    const { ctx, page, errs } = await abrir(browser, { w: 390, h: 844, rol: 'admin', reducido: true });
    await page.evaluate(H);
    await ir(page, "nav('clientes',null)");
    const lupa = page.locator('#nbiIn_cliQ').locator('xpath=..').locator('.nxBusca-lupa').first();
    await lupa.click(); await sleep(80);
    const e = await page.evaluate((s) => window.__bp.estado(s), '#nbiIn_cliQ');
    ok(e && e.abierto && e.w >= e.cw - 2 && e.foco, `reduced-motion 390: abre de inmediato al ancho final (${e && e.w.toFixed(0)}/${e && e.cw}) sin resorte`, e);
    ok(e && e.aura === 'none', `reduced-motion 390: sin puntos flotantes`, e);
    await page.screenshot({ path: OUT + 'clientes-390-reducido.png' });
    ok(errs.length === 0, 'reduced-motion: sin errores de consola', errs.slice(0, 4));
    await ctx.close();
  }
  // Tema clásico: mismo comportamiento con el acento morado del sistema (solo captura + humo)
  {
    await qa('tema/clasico');
    const { ctx, page, errs } = await abrir(browser, { w: 1280, h: 800, rol: 'admin', tema: 'clasico' });
    await page.evaluate(H);
    await ir(page, "nav('clientes',null)");
    const lupa = page.locator('#nbiIn_cliQ').locator('xpath=..').locator('.nxBusca-lupa').first();
    await lupa.click(); await sleep(700);
    const e = await page.evaluate((s) => window.__bp.estado(s), '#nbiIn_cliQ');
    const borde = await page.evaluate(() => getComputedStyle(document.querySelector('#nbiIn_cliQ').closest('.nxBusca')).borderTopColor);
    ok(e && e.abierto && e.foco, 'clásico 1280: abre y enfoca igual', e);
    ok(/rgb\(109, 40, 217\)/.test(borde), `clásico 1280: borde con el acento morado del sistema (${borde})`, borde);
    await page.screenshot({ path: OUT + 'clientes-1280-clasico-abierto.png' });
    ok(errs.length === 0, 'clásico: sin errores de consola', errs.slice(0, 4));
    await ctx.close(); await qa('tema/none');
  }
  await browser.close();
  console.log(`\nRESULTADO qa-busqueda-premium: ${pass} PASS · ${fail} FAIL  (capturas en ${OUT})`);
  process.exit(fail ? 1 : 0);
})();
