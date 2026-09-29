// QA de la tipografía Apple (29-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js. Recorre las pantallas principales a 390 y 1280 px y mide con estilos calculados:
// familia tipográfica, números tabulares, tamaño mínimo, inputs ≥16px en móvil, desborde horizontal y errores.
// Uso: node scripts/qa-crm-mock-server.js &  QA_PREFIJO=despues- QA_OUT=/ruta node scripts/qa-tipografia.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-tipo-apple')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.env.QA_PREFIJO || 'despues-';
const ESTRICTO = PRE.startsWith('despues'); // en la corrida "antes" solo se mide, no se exige
let pass = 0, fail = 0; const resumen = {};
const ok = (c, m, extra) => { if (c || !ESTRICTO) { if (c) pass++; console.log((c ? 'PASS  ' : 'INFO  ') + m + (!c && extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 300) : '')); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 500) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(s); } }); }));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function contexto(browser, width, sesion) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  const externas = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { const u = r.request().url(); externas.push(u); if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); } return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); });
  // Primer pintado: la familia del <body> en DOMContentLoaded, antes de que corra ningún parche diferido.
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const cs = getComputedStyle(document.body);
      window.__nxTipoDCL = { ff: cs.fontFamily, fs: cs.fontSize, feat: cs.fontFeatureSettings, parches: [...document.scripts].filter(s => /parches-/.test(s.src)).length };
    }, { capture: true, once: true });
  });
  if (sesion) await page.addInitScript(({ rol, nom }) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom, rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, sesion);
  return { ctx, page, errs, externas };
}

async function esperarSplash(page) {
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(250);
}

// Métricas de tipografía de lo que se ve en pantalla.
async function medir(page, raiz) {
  return page.evaluate((raiz) => {
    const root = raiz ? document.querySelector(raiz) : document.body;
    const r = { chicos: [], inputsChicos: [], noSF: [], montosNoTab: [], recortes: 0, total: 0, codigo: [] };
    if (!root) return r;
    const vw = window.innerWidth;
    const visible = (el) => { if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.bottom > 0 && b.right > 0 && b.left < vw; };
    root.querySelectorAll('*').forEach(el => {
      if (el.closest('svg') || /^(SCRIPT|STYLE|I|svg|path|CANVAS|IMG|BR)$/i.test(el.tagName)) return;
      if (el.classList.contains('ti')) return; // íconos Tabler (fuente de íconos)
      const propio = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!propio || !visible(el)) return;
      r.total++;
      const cs = getComputedStyle(el), f = parseFloat(cs.fontSize);
      const t = el.textContent.trim().slice(0, 24);
      if (f < 11) r.chicos.push([el.tagName + '.' + String(el.className).slice(0, 30), t, f]);
      const fam = cs.fontFamily;
      if (/monospace|SF Mono|Menlo/.test(fam)) r.codigo.push([String(el.className).slice(0, 30), t]);
      else if (!/^-apple-system/.test(fam)) r.noSF.push([el.tagName + '.' + String(el.className).slice(0, 30), t, fam.slice(0, 40)]);
      if (/RD\$\s?[\d,]|^\$?[\d,]+\.\d\d$/.test(t) && !/tnum/.test(cs.fontFeatureSettings) && !/tabular-nums/.test(cs.fontVariantNumeric)) r.montosNoTab.push([String(el.className).slice(0, 30), t]);
      if (cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && cs.whiteSpace === 'nowrap') r.recortes++;
    });
    document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]),select,textarea').forEach(el => {
      if (!visible(el)) return; const f = parseFloat(getComputedStyle(el).fontSize); if (f < 16) r.inputsChicos.push([el.id || el.name || el.className.slice(0, 20), f]);
    });
    r.scroll = [document.documentElement.scrollWidth, window.innerWidth];
    return r;
  }, raiz);
}

async function revisar(page, tag, nombre, raiz, width) {
  await sleep(350);
  const m = await medir(page, raiz);
  resumen[`${tag}/${nombre}`] = { textos: m.total, menores11: m.chicos.length, noSF: m.noSF.length, montosSinTabular: m.montosNoTab.length, codigo: m.codigo.length, inputs16: m.inputsChicos.length, recortes: m.recortes, scroll: m.scroll.join('/') };
  ok(m.total > 0, `${tag} ${nombre}: hay texto visible (${m.total})`);
  ok(m.noSF.length === 0, `${tag} ${nombre}: todo el texto usa la pila de Apple`, m.noSF.slice(0, 4));
  ok(m.chicos.length === 0, `${tag} ${nombre}: ningún texto menor de 11 px`, m.chicos.slice(0, 5));
  ok(m.montosNoTab.length === 0, `${tag} ${nombre}: montos con números tabulares`, m.montosNoTab.slice(0, 4));
  ok(m.scroll[0] <= m.scroll[1], `${tag} ${nombre}: sin desborde horizontal`, m.scroll);
  if (width < 500) ok(m.inputsChicos.length === 0, `${tag} ${nombre}: campos ≥16 px (sin zoom de iOS)`, m.inputsChicos.slice(0, 5));
  return m;
}

async function shot(page, name) { await page.screenshot({ path: OUT + PRE + name + '.png', fullPage: false }); }
async function ir(page, vista) { await page.evaluate((v) => { try { if (typeof closeMobSB === 'function') closeMobSB(); } catch (e) {} nav(v, null); }, vista); await sleep(700); }

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('prospectos/reset'); await qa('orgtipo/seguros');
  for (const width of [390, 1280]) {
    const tag = width === 390 ? '390' : '1280';
    console.log(`\n=== ${tag}px ===`);
    // 1) Login (sin sesión)
    {
      const { ctx, page, errs, externas } = await contexto(browser, width, null);
      await page.goto(BASE + '/index.html', { waitUntil: 'load' });
      const dcl = await page.evaluate(() => window.__nxTipoDCL);
      resumen[`${tag}/primer-pintado`] = dcl;
      ok(/^-apple-system/.test(dcl.ff), `${tag}: fuente Apple ya aplicada en DOMContentLoaded (sin FOUC)`, dcl);
      ok(/tnum/.test(dcl.feat || ''), `${tag}: números tabulares desde el primer pintado`, dcl);
      await esperarSplash(page);
      await revisar(page, tag, 'login', '#loginScreen', width);
      await shot(page, `01-login-${tag}`);
      const fuentes = externas.filter(u => /fonts\.googleapis|fonts\.gstatic/.test(u));
      ok(fuentes.length === 0, `${tag}: no se piden fuentes web (Google Fonts)`, fuentes);
      ok(errs.length === 0, `${tag} login: sin errores de consola`, errs);
      await ctx.close();
    }
    // 2) App con sesión admin
    const { ctx, page, errs, externas } = await contexto(browser, width, { rol: 'admin', nom: 'Esterlin Espinal' });
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0 && typeof window.nxCrm === 'object', null, { timeout: 25000 });
    await esperarSplash(page); await sleep(900);
    await ir(page, 'dashboard'); await revisar(page, tag, 'inicio', '#v-dashboard', width); await shot(page, `02-inicio-${tag}`);
    // Tamaños de la escala en piezas genéricas
    const escala = await page.evaluate(() => { const g = (s) => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e); return [c.fontSize, c.fontWeight, c.letterSpacing, c.lineHeight]; }; return { body: g('body'), pttl: g('#pttl'), kpi: g('.kv, .kpi-v, .kpi .v'), th: g('th'), td: g('td') }; });
    resumen[`${tag}/escala`] = escala;
    await ir(page, 'clientes'); await revisar(page, tag, 'clientes', '#v-clientes', width); await shot(page, `03-clientes-${tag}`);
    await page.evaluate(() => { const c = ST.clientes[0]; if (typeof window.abrirCliente360 === 'function') window.abrirCliente360(c.id); else { window.__c360 = c.id; try { nav('cliente360', null); } catch (e) {} } }); await sleep(900);
    if (await page.$('#v-cliente360.on')) await revisar(page, tag, 'cliente360', '#v-cliente360', width);
    await ir(page, 'polizas'); await revisar(page, tag, 'polizas', '#v-polizas', width);
    await ir(page, 'facturas'); await revisar(page, tag, 'facturas', '#v-facturas', width); await shot(page, `04-facturas-${tag}`);
    await ir(page, 'solicitudes'); if (await page.$('#v-solicitudes.on')) await revisar(page, tag, 'solicitudes', '#v-solicitudes', width);
    await ir(page, 'crm'); await page.waitForSelector('#v-crm.on', { timeout: 5000 }).catch(() => {}); await sleep(600);
    await revisar(page, tag, 'crm', '#v-crm', width); await shot(page, `05-crm-${tag}`);
    await page.evaluate(() => { try { nxCrm.tab('prospectos'); } catch (e) {} }); await sleep(700);
    await revisar(page, tag, 'prospectos', '#v-crm', width);
    await page.evaluate(() => { try { nxCrm.tab('panel'); } catch (e) {} });
    await ir(page, 'waInbox'); await sleep(900);
    if (await page.$('#v-waInbox.on')) { await revisar(page, tag, 'buzon-whatsapp', '#v-waInbox', width); await shot(page, `06-buzon-${tag}`); }
    // Modal + toast
    await ir(page, 'clientes');
    await page.evaluate(() => { try { openM('mCli'); } catch (e) {} try { toast('ok', 'Guardado', 'Prueba de tipografía RD$ 1,250.00'); } catch (e) {} }); await sleep(500);
    await revisar(page, tag, 'modal-cliente', '#mCli', width);
    const t = await page.evaluate(() => { const e = [...document.querySelectorAll('.toast, [class*="toast"]')].find(x => x.offsetParent && /Prueba de tipografía/.test(x.textContent)); if (!e) return null; const c = getComputedStyle(e); return [c.fontFamily.slice(0, 20), c.fontSize]; });
    resumen[`${tag}/toast`] = t;
    ok(t && /^-apple-system/.test(t[0]), `${tag}: toast con fuente Apple`, t);
    await shot(page, `07-modal-${tag}`);
    await page.evaluate(() => { try { document.getElementById('mCli').classList.remove('open'); } catch (e) {} });
    // Chequeo de código fijo: el NCF/serial se ve en monoespaciada solo donde corresponde
    const code = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--nx-code').trim());
    ok(/ui-monospace/.test(code), `${tag}: token --nx-code disponible`, code);
    ok(errs.length === 0, `${tag} app: sin errores de consola`, errs.slice(0, 5));
    ok(!externas.some(u => /fonts\.googleapis|fonts\.gstatic/.test(u)), `${tag} app: sin fuentes web`, externas.filter(u => /fonts\./.test(u)));
    await ctx.close();
    // 3) POS (organización tipo tienda)
    await qa('orgtipo/tienda');
    {
      const { ctx, page, errs, externas } = await contexto(browser, width, { rol: 'admin', nom: 'Esterlin Espinal' });
      await page.goto(BASE + '/index.html', { waitUntil: 'load' });
      await page.waitForSelector('#v-pos', { timeout: 20000 }).catch(() => {});
      await esperarSplash(page); await sleep(1800);
      if (await page.$('#v-pos')) {
        await revisar(page, tag, 'pos', '#v-pos', width); await shot(page, `08-pos-${tag}`);
        const nxf = await page.evaluate(() => { const e = document.querySelector('#v-pos'); return e ? [getComputedStyle(e).getPropertyValue('--nx-font').trim().slice(0, 30), getComputedStyle(e).getPropertyValue('--nx-mono').trim().slice(0, 30)] : null; });
        resumen[`${tag}/pos-tokens`] = nxf;
      } else console.log('INFO  POS no alcanzable en el simulador');
      ok(!externas.some(u => /fonts\.googleapis|fonts\.gstatic/.test(u)), `${tag} POS: sin fuentes web`, externas.filter(u => /fonts\./.test(u)));
      ok(errs.length === 0, `${tag} POS: sin errores de consola`, errs.slice(0, 5));
      await ctx.close();
    }
    await qa('orgtipo/seguros');
  }
  await browser.close();
  fs.writeFileSync(OUT + PRE + 'resumen.json', JSON.stringify(resumen, null, 1));
  console.log('\n' + JSON.stringify(resumen, null, 1));
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
