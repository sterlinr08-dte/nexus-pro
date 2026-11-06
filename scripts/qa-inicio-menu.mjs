// QA de «Inicio y menú» (06-nov-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js, a 390 y 1280 px, tema oscuro y claro, y con el interruptor apagado:
//  · «Inicio» en el menú y en la barra (antes «Dashboard»);
//  · las líneas de las tarjetas del Inicio, la fecha y «Por vencer» no se cortan;
//  · botones de la barra y botón del menú ≥ 44 × 44 px (el círculo del menú queda en el mismo sitio);
//  · buscador: «Ir a…» con botones ≥ 44 px y letra ≥ 13 px, sin MAYÚSCULAS; tocar uno abre la sección; escribir «whats»
//    da la sección arriba y Enter la abre; ⌘K abre en PC; los clientes se siguen encontrando igual;
//  · con localStorage nx_inicio_menu_off=1 no hay atajos ni html.nx-im;
//  · sin pageerror ni desborde horizontal.
// Uso: PORT=8951 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8951 node scripts/qa-inicio-menu.mjs
// Iconos: si existe QA_TABLER=<carpeta con tabler-icons.min.css y tabler-icons.woff2>, se sirven para las capturas.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8951';
const TAB = process.env.QA_TABLER || '';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-inicio-menu')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 500) : '')); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function abrir(browser, { width, off, claro }) {
  const m = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: m ? 844 : 800 }, hasTouch: m, isMobile: m, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try {
    const u = r.request().url();
    if (TAB && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ status: 200, contentType: 'text/css', body: fs.readFileSync(path.join(TAB, 'tabler-icons.min.css'), 'utf8') });
    if (TAB && /tabler-icons\.woff2/.test(u)) return r.fulfill({ status: 200, contentType: 'font/woff2', body: fs.readFileSync(path.join(TAB, 'tabler-icons.woff2')) });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' });
  } catch (e) {} });
  await page.addInitScript(({ off, claro }) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    if (off) localStorage.setItem('nx_inicio_menu_off', '1'); else localStorage.removeItem('nx_inicio_menu_off');
    if (!sessionStorage.getItem('__qaT')) { sessionStorage.setItem('__qaT', '1'); if (claro) localStorage.setItem('nx_tema', 'clasico'); else localStorage.removeItem('nx_tema'); }
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { off, claro });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0 && typeof window.abrirGlobalSearch === 'function', null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2500);
  // El tema guardado vive en las preferencias del simulador (compartidas): se fija aquí sin guardarlo.
  await page.evaluate((claro) => { try { aplicarTema(claro ? 'clasico' : 'glass-oscuro', false); } catch (e) {} try { closeMobSB(); } catch (e) {} nav('dashboard', null); }, !!claro);
  await sleep(1500);
  return { ctx, page, errs };
}
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const width of [390, 1280]) {
    const m = width < 500, tag = String(width);
    console.log(`\n=== ${tag} px ===`);
    // A) Interruptor apagado: referencia de posiciones y que nada nuevo aparezca.
    const A = await abrir(browser, { width, off: true });
    if (m) { await A.page.evaluate(() => toggleSB()); await sleep(800); }
    const circOff = await caja(A.page, 'nav#sbEl .nx-mc-c');
    if (m) { await A.page.evaluate(() => closeMobSB()); await sleep(500); }
    const offDom = await A.page.evaluate(() => { abrirGlobalSearch(); return { im: document.documentElement.classList.contains('nx-im'), flag: !!window.__nxInicioMenu }; });
    await sleep(400);
    const offChips = await A.page.evaluate(() => document.querySelectorAll('#gsResults .nxIM-go button').length);
    ok(!offDom.im && !offDom.flag && offChips === 0, `${tag} apagado (nx_inicio_menu_off=1): sin html.nx-im, sin capa JS y sin atajos`, { offDom, offChips });
    ok(A.errs.length === 0, `${tag} apagado: sin errores`, A.errs.slice(0, 3));
    await A.ctx.close();

    for (const claro of [false, true]) {
      const tt = `${tag} ${claro ? 'claro' : 'oscuro'}`;
      const B = await abrir(browser, { width, off: false, claro });
      const { page } = B;
      const tema = await page.evaluate(() => ({ claro: document.documentElement.classList.contains('tema-claro'), oscuro: document.documentElement.classList.contains('tema-glass-oscuro'), im: document.documentElement.classList.contains('nx-im') }));
      ok(tema.im && (claro ? tema.claro : tema.oscuro), `${tt}: capa encendida y tema correcto`, tema);
      await page.screenshot({ path: OUT + `inicio-${width}-${claro ? 'claro' : 'oscuro'}.png` });

      // 1) «Inicio» en barra y menú
      const t = await page.evaluate(() => ({ pttl: document.getElementById('pttl').textContent.trim(), ni: document.querySelector("#sbEl .ni[onclick^=\"nav('dashboard'\"] .ni-l").textContent.trim(), aria: document.querySelector("#sbEl .ni[onclick^=\"nav('dashboard'\"]").getAttribute('aria-label') }));
      ok(t.pttl === 'INICIO' && t.ni === 'Inicio' && t.aria === 'Inicio', `${tt}: barra «${t.pttl}», menú «${t.ni}»`, t);

      // 2) Textos del Inicio sin cortar
      const cortes = await page.evaluate(() => ['nxIGFecha', 'nxIGk1s', 'nxIGk2s', 'nxIGk3s', 'nxIGk4s', 'nxIGs2l'].map(id => { const e = document.getElementById(id); if (!e || !e.offsetParent) return [id, 'oculto']; return [id, e.textContent.trim(), e.scrollWidth <= e.clientWidth + 1 && e.scrollHeight <= e.clientHeight + 1, Math.round(e.getBoundingClientRect().height)]; }));
      const malos = cortes.filter(c => c[1] !== 'oculto' && !c[2]);
      ok(malos.length === 0, `${tt}: fecha y líneas de las tarjetas completas (${cortes.filter(c => c[1] !== 'oculto').map(c => '«' + c[1] + '»').join(', ')})`, malos);
      const s2 = cortes.find(c => c[0] === 'nxIGs2l');
      if (s2 && s2[1] !== 'oculto') ok(s2[1] === 'Por vencer' && s2[3] <= 18, `${tt}: «Por vencer» en una línea (${s2[3]} px)`, s2);
      if (m) ok(/^\S+ \d+ [a-z]{3} · /.test(cortes[0][1]), `${tt}: fecha corta en el celular «${cortes[0][1]}»`, cortes[0]);
      else ok(/^\S+, \d+ de [a-z]+ · /.test(cortes[0][1]), `${tt}: fecha completa en PC «${cortes[0][1]}»`, cortes[0]);

      // 3) Toques ≥ 44 px en la barra y el botón del menú
      const barra = await page.evaluate(() => [...document.querySelectorAll('.tnav .tn-tog, .tnav .tn-r > .tn-b, .tnav .tn-r > button')].filter(e => e.offsetParent && getComputedStyle(e).display !== 'none').map(e => { const r = e.getBoundingClientRect(); return [e.id || e.className.split(' ').slice(0, 2).join('.'), Math.round(r.width), Math.round(r.height)]; }));
      const chicos = barra.filter(b => b[1] < 44 || b[2] < 44);
      ok(barra.length > 0 && chicos.length === 0, `${tt}: ${barra.length} botones de la barra ≥ 44 × 44 px`, { chicos, barra });
      if (m) { await page.evaluate(() => toggleSB()); await sleep(800); }
      const tg = await caja(page, 'nav#sbEl .nx-mc-tg'), circ = await caja(page, 'nav#sbEl .nx-mc-c');
      ok(tg && tg.w >= 44 && tg.h >= 44, `${tt}: botón que abre/cierra el menú ${tg && tg.w}×${tg && tg.h} px`, tg);
      if (!claro) ok(circ && circOff && Math.abs(circ.x - circOff.x) <= 1 && Math.abs(circ.y - circOff.y) <= 1, `${tt}: el círculo azul del menú queda en el mismo sitio (${circ && circ.x},${circ && circ.y} = ${circOff && circOff.x},${circOff && circOff.y})`, { circ, circOff });
      const pild = await page.evaluate(() => { const e = document.querySelector('nav#sbEl .nx-mc-st'); return e && e.offsetParent ? getComputedStyle(e).textTransform : 'oculto'; });
      ok(pild === 'none' || pild === 'oculto', `${tt}: píldora «Buscar…» del menú sin mayúsculas (${pild})`, pild);
      if (m) { await page.screenshot({ path: OUT + `menu-${width}-${claro ? 'claro' : 'oscuro'}.png` }); await page.evaluate(() => closeMobSB()); await sleep(600); }

      // 4) Buscador: «Ir a…»
      if (m) await page.evaluate(() => abrirGlobalSearch()); else { await page.keyboard.press('Meta+k'); }
      await sleep(500);
      const gs = await page.evaluate(() => { const ov = document.getElementById('gsOverlay'); const bs = [...document.querySelectorAll('#gsResults .nxIM-go button')]; const inp = document.getElementById('gsInput'); return { abierto: ov.classList.contains('show'), n: bs.length, txt: bs.map(b => b.textContent.trim()), med: bs.map(b => { const r = b.getBoundingClientRect(), c = getComputedStyle(b); return [Math.round(r.width), Math.round(r.height), parseFloat(c.fontSize), c.textTransform]; }), ph: inp.placeholder, phTT: getComputedStyle(inp, '::placeholder').textTransform, phCabe: (() => { const c = document.createElement('canvas').getContext('2d'); const cs = getComputedStyle(inp); c.font = cs.fontSize + ' ' + cs.fontFamily; return c.measureText(inp.placeholder).width <= inp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 1; })(), tip: (document.querySelector('#gsResults .nxIM-tip') || {}).textContent || '' }; });
      ok(gs.abierto, `${tt}: el buscador abre ${m ? '(lupa)' : 'con ⌘K'}`, gs.abierto);
      ok(gs.n >= 4 && gs.n <= 8 && gs.txt[0] === 'Clientes' && !gs.txt.includes('Inicio'), `${tt}: «Ir a…» con ${gs.n} secciones (${gs.txt.join(', ')})`, gs.txt);
      ok(gs.med.every(x => x[1] >= 44 && x[0] >= 44 && x[2] >= 13 && x[3] === 'none'), `${tt}: botones «Ir a…» ≥ 44 px, letra ≥ 13 px y sin mayúsculas`, gs.med);
      ok(gs.phTT === 'none' && gs.phCabe, `${tt}: ayuda «${gs.ph}» sin mayúsculas y completa`, gs);
      ok(m ? !/Ctrl|⌘/.test(gs.tip) : /Ctrl K|⌘K/.test(gs.tip), `${tt}: pista de teclado ${m ? 'oculta en el celular' : 'visible en PC'} («${gs.tip}»)`, gs.tip);
      await page.screenshot({ path: OUT + `buscador-${width}-${claro ? 'claro' : 'oscuro'}.png` });
      if (!m) { const kbd = await page.evaluate(() => (document.querySelector('.tnav .tn-b-primary kbd') || {}).textContent); ok(kbd === 'Ctrl K' || kbd === '⌘K', `${tt}: pista de la barra «${kbd}»`, kbd); }

      // tocar «Clientes» abre la sección y cierra el buscador
      await page.click('#gsResults .nxIM-go button:first-child'); await sleep(900);
      const v1 = await page.evaluate(() => ({ cli: document.getElementById('v-clientes').classList.contains('on'), ov: document.getElementById('gsOverlay').classList.contains('show'), t: document.getElementById('pttl').textContent.trim() }));
      ok(v1.cli && !v1.ov, `${tt}: «Ir a Clientes» abre Clientes y cierra el buscador (${v1.t})`, v1);

      // escribir «whats» → la sección sale arriba; Enter la abre
      await page.evaluate(() => abrirGlobalSearch()); await sleep(300);
      await page.fill('#gsInput', ''); await page.type('#gsInput', 'whats'); await sleep(300);
      const r2 = await page.evaluate(() => [...document.querySelectorAll('#gsResults .gs-item')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
      ok(r2.length >= 1 && /WhatsApp/.test(r2[0]) && /Sección/.test(r2[0]), `${tt}: «whats» → primera fila «${r2[0]}»`, r2);
      await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await sleep(1000);
      const v2 = await page.evaluate(() => ({ wa: document.getElementById('v-waInbox') && document.getElementById('v-waInbox').classList.contains('on'), ov: document.getElementById('gsOverlay').classList.contains('show') }));
      ok(v2.wa && !v2.ov, `${tt}: flecha + Enter abre WhatsApp`, v2);

      // los clientes se siguen encontrando igual
      const nom = await page.evaluate(() => ST.clientes[0].nom);
      await page.evaluate(() => abrirGlobalSearch()); await sleep(300);
      await page.fill('#gsInput', ''); await page.type('#gsInput', nom.slice(0, 5)); await sleep(300);
      const r3 = await page.evaluate(() => [...document.querySelectorAll('#gsResults .gs-item')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
      ok(r3.some(x => x.includes(nom) && /Cliente/.test(x)), `${tt}: buscar «${nom.slice(0, 5)}» sigue encontrando a ${nom}`, r3);
      await page.fill('#gsInput', ''); await page.type('#gsInput', 'qqzzxx'); await sleep(300);
      const r4 = await page.evaluate(() => document.getElementById('gsResults').textContent.trim());
      ok(/No se encontraron/.test(r4), `${tt}: sin coincidencias dice «${r4}»`, r4);
      await page.keyboard.press('Escape'); await sleep(200);

      const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
      ok(sw.sw <= sw.w, `${tt}: sin desborde horizontal (${sw.sw} ≤ ${sw.w})`, sw);
      ok(B.errs.length === 0, `${tt}: sin pageerror`, B.errs.slice(0, 3));
      await B.ctx.close();
    }
  }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
