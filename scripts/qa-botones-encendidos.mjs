// QA de la capa «botones encendidos» (style#nxLuz, 59.57): app real contra scripts/qa-crm-mock-server.js.
//  · Oscuro y claro, 390×844 y 1280×800: Inicio, Clientes y «Registrar pago».
//  · Los principales y lo elegido llevan halo (box-shadow con desenfoque ≥ 16 px); los pequeños, fantasma, deshabilitados y
//    «Falta…» (.pgIncompleto) quedan como estaban; con localStorage.nx_luz_off='1' no cambia nada; 0 errores de JS.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-botones-encendidos.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-botones-encendidos')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function abrir(browser, width, tema, apagado) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(([tema, apagado]) => {
    localStorage.setItem('nx_tema', tema); localStorage.setItem('nx_auth_mode', 'legacy');
    if (apagado) localStorage.setItem('nx_luz_off', '1'); else localStorage.removeItem('nx_luz_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, [tema, apagado]);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await sleep(2200);
  // El simulador devuelve las preferencias guardadas del usuario (tema oscuro): se fuerza el tema pedido sin guardarlo.
  await page.evaluate(t => { try { aplicarTema(t, false); } catch (e) {} }, tema); await sleep(500);
  return { ctx, page, errs };
}
// ¿Tiene halo? = un resplandor CENTRADO (desplazamiento 0 0, desenfoque ≥ 14 px, no inset). Las sombras de caída que ya
// tenían algunos botones (0 14px 30px…) no cuentan.
const HALO = sel => [...document.querySelectorAll(sel)].filter(e => e.getBoundingClientRect().width > 0).map(e => {
  const sh = getComputedStyle(e).boxShadow;
  const partes = sh === 'none' ? [] : sh.split(/,(?![^(]*\))/).map(x => x.trim());
  const halo = partes.some(x => !/inset/.test(x) && /\) 0px 0px (\d+)px/.test(x) && +x.match(/\) 0px 0px (\d+)px/)[1] >= 14);
  return { t: (e.textContent || '').trim().slice(0, 20), halo };
});
(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const tema of ['glass-oscuro', 'clasico']) for (const w of [390, 1280]) for (const apagado of [false, true]) {
    const tag = `${tema === 'clasico' ? 'claro' : 'oscuro'}-${w}${apagado ? '-apagado' : ''}`;
    console.log(`\n== ${tag}`);
    const { ctx, page, errs } = await abrir(browser, w, tema, apagado);
    ok(await page.evaluate(a => document.documentElement.classList.contains('nx-luz') === !a, apagado), `${tag} clase nx-luz ${apagado ? 'apagada' : 'puesta'} desde el primer pintado`);
    ok(await page.evaluate(t => document.documentElement.classList.contains(t === 'clasico' ? 'tema-claro' : 'tema-glass-oscuro'), tema), `${tag} el tema pedido está puesto`);
    // Inicio
    await page.evaluate(() => nav('dashboard', null)); await sleep(1200);
    const ini = await page.evaluate(HALO, '.nxIG-btn.pri');
    if (ini.length) ok(ini.every(x => x.halo === !apagado), `${tag} Inicio: «${ini[0].t}» ${apagado ? 'sin' : 'con'} luz`, ini);
    await page.screenshot({ path: OUT + `${tag}-inicio.png` });
    // Clientes: pestaña activa y vista elegida
    await page.evaluate(() => nav('clientes', null)); await sleep(1200);
    const tabs = await page.evaluate(HALO, '.nxft-tab.is-active, .nxVistaOpt.on');
    ok(tabs.length > 0 && tabs.every(x => x.halo === !apagado), `${tag} Clientes: pestaña/vista elegida ${apagado ? 'sin' : 'con'} luz`, tabs);
    const noSel = await page.evaluate(HALO, '.nxft-tab:not(.is-active), .nxVistaOpt:not(.on)');
    ok(noSel.every(x => !x.halo), `${tag} Clientes: las no elegidas quedan apagadas`, noSel.filter(x => x.halo));
    const peq = await page.evaluate(HALO, '.btn.bsm, .btn.bghost');
    ok(peq.every(x => !x.halo), `${tag} botones pequeños y fantasma sin luz (${peq.length})`, peq.filter(x => x.halo).slice(0, 4));
    await page.screenshot({ path: OUT + `${tag}-clientes.png` });
    // Registrar pago
    const A = await page.evaluate(() => ST.clientes[1].id);
    await page.evaluate(id => abrirAbono(id), A); await sleep(900);
    const ab = await page.evaluate(HALO, '#btnAbo, #aQSaldar.nxSel, #aMetChips .nxOptChip.on');
    ok(ab.length === 3 && ab.every(x => x.halo === !apagado), `${tag} Registrar pago: botón, «Saldo total» y método elegido ${apagado ? 'sin' : 'con'} luz`, ab);
    const off = await page.evaluate(HALO, '#aMetChips .nxOptChip:not(.on), .aboQbtn:not(.nxSel)');
    ok(off.every(x => !x.halo), `${tag} Registrar pago: opciones no elegidas apagadas`, off.filter(x => x.halo));
    await page.screenshot({ path: OUT + `${tag}-abono.png` });
    // «Falta…»: sin agente el botón queda incompleto y sin luz
    const falta = await page.evaluate(() => { const ag = document.getElementById('aAgente'); ag.value = ''; ag.dispatchEvent(new Event('change')); nxAboActualizarResumen(); const b = document.getElementById('btnAbo'); return { inc: b.classList.contains('pgIncompleto'), t: b.textContent.trim().slice(0, 30) }; });
    if (falta.inc) { const h = await page.evaluate(HALO, '#btnAbo'); ok(h.every(x => !x.halo), `${tag} botón «${falta.t}» (incompleto) sin luz`, h); }
    ok(errs.length === 0, `${tag} 0 errores de JS`, errs.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
