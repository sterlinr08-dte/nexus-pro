// Revisión de los temas de paleta (27-nov-2026, Claude): casos que qa-tema-stripe.mjs no cubre.
// App real contra scripts/qa-crm-mock-server.js, pero las preferencias (usuario_preferencias) y mi_es_superadmin se simulan
// AQUÍ para poder retrasar la lectura, contar los guardados y decir «es el dueño» o no.
// Uso: PORT=8942 node scripts/qa-tema-revision.mjs   (QA_VIEJO=http://127.0.0.1:8943 → compara con la versión anterior)
//      QA_SOLO=premium,oraculo,… para correr solo algunos bloques.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const VIEJO = process.env.QA_VIEJO || '';
const SOLO = process.env.QA_SOLO ? process.env.QA_SOLO.split(',') : null;
const corre = (k) => !SOLO || SOLO.includes(k);
let pass = 0, fail = 0; const fallos = [];
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; fallos.push(m); console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 900) : '')); } };
const limite = (c, m, x) => console.log((c ? 'PASS  ' : 'LIMITE ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 300)));
const info = (m, x) => console.log('INFO  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x).slice(0, 900) : ''));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const UID = '00000000-0000-4000-8000-000000000001';

async function abrir(browser, o) {
  o = Object.assign({ base: BASE, width: 390, temaLocal: null, prefs: {}, retrasoPrefs: 0, rol: 'admin', dueno: false, tienda: false, oscuro: false, extraLocal: {} }, o);
  const movil = o.width < 500;
  const ctx = await browser.newContext({ viewport: { width: o.width, height: movil ? 844 : 800 }, hasTouch: movil, isMobile: movil, deviceScaleFactor: movil ? 2 : 1, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', colorScheme: o.oscuro ? 'dark' : 'light' });
  const page = await ctx.newPage();
  const st = { prefs: JSON.parse(JSON.stringify(o.prefs)), posts: [], errs: [], gets: 0 };
  page.on('pageerror', e => st.errs.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try {
    const u = r.request().url(), m = r.request().method();
    if (/supabase\.co\//.test(u)) {
      if (/\/rest\/v1\/usuario_preferencias/.test(u)) {
        if (m === 'GET') { st.gets++; if (o.retrasoPrefs) await sleep(o.retrasoPrefs); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ datos: st.prefs }]) }); }
        if (m === 'POST') { const b = JSON.parse(r.request().postData() || '{}'); const antes = st.prefs.tema; st.posts.push({ t: Date.now(), datos: b.datos, cambiaTema: (b.datos || {}).tema !== antes, temaAntes: antes }); st.prefs = b.datos; return r.fulfill({ status: 201, body: '' }); }
      }
      if (/rpc\/mi_es_superadmin/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(!!o.dueno) });
      const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, o.base + '/supa') }); return r.fulfill({ response: resp });
    }
    if (/sentry|emailjs|googletagmanager|google-analytics/i.test(u)) return r.fulfill({ status: 200, body: '' });
    return r.continue();
  } catch (e) {} });
  await page.addInitScript((o) => {
    if (!sessionStorage.getItem('__qaIni')) {
      sessionStorage.setItem('__qaIni', '1');
      if (o.temaLocal) localStorage.setItem('nx_tema', o.temaLocal); else localStorage.removeItem('nx_tema');
      localStorage.removeItem('nx_tgo_off'); localStorage.removeItem('nx_claro_off');
      if (o.tienda) localStorage.setItem('nx_org_tipo', 'tienda'); else localStorage.removeItem('nx_org_tipo');
      for (const k in o.extraLocal) localStorage.setItem(k, o.extraLocal[k]);
      localStorage.setItem('nx_auth_mode', 'legacy');
      sessionStorage.setItem('nx_sesion', JSON.stringify({ id: o.uid, nom: 'Esterlin Espinal', rol: o.rol, cargo: o.rol === 'admin' ? 'ADMIN' : 'AGENTE', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
      sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    }
    // Primer pintado: clases y color de acento en el primer cuadro que se dibuja con <body>.
    const f = () => { if (!document.body) return requestAnimationFrame(f); const cs = getComputedStyle(document.documentElement);
      window.__qaPrimer = { clases: document.documentElement.className, c1: cs.getPropertyValue('--c1').trim(), bg: cs.getPropertyValue('--tgo-bg').trim(), body: document.body.className }; };
    requestAnimationFrame(f);
  }, Object.assign({}, o, { uid: UID }));
  await page.goto(o.base + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 30000 }).catch(() => {});
  await sleep(2500 + o.retrasoPrefs);
  return { ctx, page, st };
}
const html = (page) => page.evaluate(() => ({ clases: document.documentElement.className, data: document.documentElement.getAttribute('data-nx-tema'), body: document.body.className,
  c1: getComputedStyle(document.documentElement).getPropertyValue('--c1').trim(), local: localStorage.getItem('nx_tema'), pref: (typeof nxPref === 'function') ? nxPref('tema', null) : null }));
const apariencia = async (page) => { await page.evaluate(() => { nav('config', document.querySelector('[onclick*="nav(\'config\'"]')); setTimeout(() => switchCfgTab(12), 300); }); await sleep(2500);
  return page.evaluate(() => [...document.querySelectorAll('#cfgApariencia .tema-opcion')].map(o => o.dataset.tema)); };

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

// ─── 1. Premium Blue y migraciones ───────────────────────────────────────────
if (corre('premium')) {
  const PREFS = { tema: 'stripe', tema_glass_oscuro_v1: true, lugar: { k: 'clientes', s: null }, vista_rueda: true, notif_leidas: ['a', 'b'] };
  // 1a. Celular con el espejo local viejo «premium» y en la base otro tema (el dueño eligió Stripe en la PC). Base lenta (2 s).
  for (const retraso of [0, 2000]) {
    const { ctx, page, st } = await abrir(browser, { temaLocal: 'premium', prefs: PREFS, retrasoPrefs: retraso, dueno: true });
    const h = await html(page);
    info(`premium local + base stripe, base en ${retraso} ms: guardados`, st.posts.map(p => p.datos));
    ok(JSON.stringify(Object.keys(st.prefs).sort()) === JSON.stringify(Object.keys(PREFS).sort()) || Object.keys(PREFS).every(k => k in st.prefs),
      `premium local, base en ${retraso} ms: no se borran las otras preferencias de la base`, st.prefs);
    ok(st.prefs.tema === 'stripe', `premium local, base en ${retraso} ms: la preferencia de la base (stripe) no se pisa`, st.prefs.tema);
    ok(/tema-stripe/.test(h.clases), `premium local, base en ${retraso} ms: termina en Stripe (lo de la base)`, h);
    await ctx.close();
  }
  // 1a-bis. Entrada con usuario y clave: iniciarApp() llama cargarTemaGuardado() ANTES de leer la base (_prefsListas=false)
  //         y cargarTodo() la lee después de bajar todos los datos (varios segundos). Se repite ese mismo orden aquí.
  for (const [nom, base] of [['nuevo', BASE]].concat(VIEJO ? [['viejo', VIEJO]] : [])) {
    const { ctx, page, st } = await abrir(browser, { base, temaLocal: 'glass-oscuro', prefs: PREFS, dueno: true });
    const antes = st.posts.length;
    await page.evaluate(() => { localStorage.setItem('nx_tema', 'premium'); _prefs = {}; _prefsListas = false; cargarTemaGuardado(); });
    await sleep(2500); // nxPrefSet guarda a los 900 ms; la base todavía «no ha respondido»
    const nuevos = st.posts.slice(antes).map(p => p.datos);
    info(`[${nom}] entrada con clave + espejo «premium»: lo que se manda a la base antes de leerla`, nuevos);
    ok(!nuevos.some(d => d && Object.keys(d).length <= 2), `[${nom}] entrada con clave + espejo «premium»: no se sobrescriben las preferencias de la base con un objeto casi vacío`, nuevos);
    await ctx.close();
  }
  // 1b. Premium guardado en la base → Glass oscuro, un solo guardado, y en la segunda carga ninguno.
  {
    const { ctx, page, st } = await abrir(browser, { temaLocal: 'premium', prefs: { tema: 'premium', tema_glass_oscuro_v1: true } });
    const h = await html(page); const temaPosts = () => st.posts.filter(p => p.cambiaTema).length; const n1 = temaPosts();
    ok(/tema-glass-oscuro/.test(h.clases) && !/tema-premium/.test(h.body), 'premium en la base → Glass oscuro', h);
    ok(st.prefs.tema === 'glass-oscuro' && n1 === 1, 'premium en la base: queda guardado glass-oscuro (1 guardado)', { n1, prefs: st.prefs });
    await page.reload({ waitUntil: 'load' }); await sleep(3500);
    ok(temaPosts() === n1, 'premium: en la segunda carga no se vuelve a guardar el tema', st.posts.map(p => p.datos.tema));
    await ctx.close();
  }
  // 1c. Automático con el celular en oscuro → Glass oscuro, sin guardar nada.
  {
    const { ctx, page, st } = await abrir(browser, { temaLocal: 'auto', prefs: { tema: 'auto', tema_glass_oscuro_v1: true }, oscuro: true });
    const h = await html(page);
    ok(/tema-glass-oscuro/.test(h.clases) && !/tema-premium/.test(h.body), 'auto + celular oscuro → Glass oscuro', h);
    ok(/tema-glass-oscuro/.test((await page.evaluate(() => window.__qaPrimer)).clases), 'auto + oscuro: ya en el primer pintado');
    ok(!st.posts.some(p => p.cambiaTema) && st.prefs.tema === 'auto', 'auto: el tema guardado sigue en «auto» (no se reescribe)', st.posts.map(p => p.datos.tema));
    await ctx.close();
  }
  // 1d. Migración vieja «dark» (nunca tocó el picker) → Glass oscuro una vez.
  {
    const { ctx, page, st } = await abrir(browser, { prefs: { dark: true } });
    const h = await html(page); const temaPosts = () => st.posts.filter(p => p.cambiaTema).length; const n1 = temaPosts();
    ok(/tema-glass-oscuro/.test(h.clases) && st.prefs.tema === 'glass-oscuro', 'dark viejo → Glass oscuro guardado', { h, prefs: st.prefs });
    await page.reload({ waitUntil: 'load' }); await sleep(3500);
    ok(temaPosts() === n1, 'dark viejo: sin guardados repetidos del tema en la segunda carga', st.posts.map(p => p.datos.tema));
    await ctx.close();
  }
}

// ─── 2. Quién ve los temas nuevos ───────────────────────────────────────────
if (corre('visibles')) {
  const casos = [
    { nom: 'dueño del sistema', o: { dueno: true }, ve: true },
    { nom: 'otro administrador', o: { dueno: false }, ve: false },
    { nom: 'agente', o: { rol: 'agente', dueno: true }, ve: false },
  ];
  for (const c of casos) {
    const { ctx, page } = await abrir(browser, Object.assign({ temaLocal: 'clasico', prefs: { tema: 'clasico', tema_glass_oscuro_v1: true } }, c.o));
    // en producción el dueño entra con Supabase Auth (API.token = su JWT); la sesión simulada es «legacy» (sin token)
    await page.evaluate(() => { API.token = 'qa-token-dueno'; });
    const ops = await apariencia(page);
    const tiene = ['stripe', 'apple', 'linear'].filter(x => ops.includes(x));
    ok(c.ve ? tiene.length === 3 : tiene.length === 0, `${c.nom}: ${c.ve ? 've' : 'no ve'} Stripe/Apple/Linear`, ops);
    ok(!ops.includes('premium'), `${c.nom}: sin Premium Blue`, ops);
    await ctx.close();
  }
  // Equipo compartido: el dueño usó Stripe en esta PC (nx_tema_luz=stripe). Entra otro administrador y toca sol/luna dos veces.
  {
    const { ctx, page, st } = await abrir(browser, { temaLocal: 'glass-oscuro', prefs: { tema: 'glass-oscuro', tema_glass_oscuro_v1: true }, dueno: false, extraLocal: { nx_tema_luz: 'stripe', nx_tema_noche: 'linear' } });
    await page.evaluate(() => toggleDarkMode()); await sleep(1500);
    const h = await html(page);
    ok(!/tema-(stripe|apple|linear)/.test(h.clases), 'otro administrador en un equipo compartido: sol/luna no le pone un tema que no puede elegir', { h, guardado: st.prefs.tema });
    await page.evaluate(() => toggleDarkMode()); await sleep(1500);
    const h2 = await html(page);
    ok(!/tema-linear/.test(h2.clases), 'otro administrador en un equipo compartido: al volver a oscuro no le pone Linear', { h2, guardado: st.prefs.tema });
    await ctx.close();
  }
  // Tiendas: siempre en Claro, aunque el espejo diga stripe/linear y aunque se llame aplicarTema.
  for (const t of ['stripe', 'linear', 'apple']) {
    await fetch(BASE + '/__qa/orgtipo/tienda');
    const { ctx, page, st } = await abrir(browser, { tienda: true, temaLocal: t, prefs: { tema: t, tema_glass_oscuro_v1: true }, dueno: true });
    const pr = await page.evaluate(() => window.__qaPrimer);
    const h = await html(page);
    ok(/tema-claro/.test(pr.clases) && !/tema-(stripe|apple|linear|glass-oscuro)/.test(pr.clases), `tienda con ${t}: primer pintado en Claro`, pr);
    ok(/tema-claro/.test(h.clases) && !/tema-(stripe|apple|linear|glass-oscuro)/.test(h.clases), `tienda con ${t}: queda en Claro`, h);
    await page.evaluate((t) => aplicarTema(t), t); await sleep(800);
    const h2 = await html(page);
    ok(!/tema-(stripe|apple|linear|glass-oscuro)/.test(h2.clases) && st.prefs.tema === t, `tienda: aplicarTema('${t}') sigue en Claro y no cambia lo guardado`, { h2, pref: st.prefs.tema });
    await ctx.close(); await fetch(BASE + '/__qa/orgtipo/seguros');
  }
}

// ─── 3. El mecanismo de copias: ¿cambia qué regla gana? (oráculo) ────────────
// Para cada elemento visible y cada propiedad de color: lo que se ve con el tema de paleta debe ser exactamente
// el color del tema base pasado por la paleta. Si sale otro color, la copia cambió qué regla gana (o tocó otra regla).
if (corre('oraculo')) {
  const PANT = { inicio: "nav('dashboard',document.querySelector('[onclick*=\"nav(\\'dashboard\\'\"]'))", clientes: "nav('clientes',document.querySelector('[onclick*=\"nav(\\'clientes\\'\"]'))",
    facturas: "nav('facturas',document.querySelector('[onclick*=\"nav(\\'facturas\\'\"]'))", custodia: "nav('custodia',document.querySelector('[onclick*=\"nav(\\'custodia\\'\"]'))",
    config: "nav('config',document.querySelector('[onclick*=\"nav(\\'config\\'\"]'))" };
  const BASEDE = { stripe: 'clasico', apple: 'clasico', linear: 'glass-oscuro' };
  for (const id of ['stripe', 'apple', 'linear']) for (const w of [390, 1280]) {
    const { ctx, page } = await abrir(browser, { width: w, temaLocal: BASEDE[id], prefs: { tema: BASEDE[id], tema_glass_oscuro_v1: true }, dueno: true });
    let malos = [], faltan = 0, total = 0;
    for (const [nom, js] of Object.entries(PANT)) {
      await page.evaluate((js) => { (0, eval)(js); }, js); await sleep(1500);
      const r = await page.evaluate(async ({ id, base }) => {
        const PROPS = ['color', 'background-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'box-shadow', 'background-image', 'fill', 'stroke', 'text-decoration-color', 'caret-color'];
        const els = [...document.querySelectorAll('body *')].filter(e => e.getClientRects().length);
        const snap = () => els.map(e => { const cs = getComputedStyle(e); return PROPS.map(p => cs.getPropertyValue(p)); });
        const pseudo = () => ['::before', '::after'].map(ps => { const cs = getComputedStyle(document.documentElement, ps); return PROPS.map(p => cs.getPropertyValue(p)).join('|'); });
        const quieto = (s) => s.replace(/transition[^;]*;?/g, '');
        // sin transiciones: queremos el valor final, no uno a medio camino
        const sinT = document.createElement('style'); sinT.textContent = '*,*::before,*::after{transition:none!important;animation-play-state:paused!important}'; document.head.appendChild(sinT);
        await new Promise(r => setTimeout(r, 100));
        const a = snap();
        aplicarTema(id, false); await new Promise(r => setTimeout(r, 400));
        const b = snap();
        aplicarTema(base, false); await new Promise(r => setTimeout(r, 400));
        const c = snap();
        sinT.remove();
        // la paleta del tema, como la usa el script
        const scr = document.getElementById('nxTemasPaletaOn').textContent;
        const T = (new Function(scr.slice(scr.indexOf('var TEMAS='), scr.indexOf('/* Reglas de OTROS')) + ';return TEMAS;'))()[id];
        const H = T.hex, R = Object.assign({}, T.rgb || {});
        Object.keys(H).forEach(h => { const k = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)).join(','); const v = [1, 3, 5].map(i => parseInt(H[h].substr(i, 2), 16)).join(','); if (!R[k]) R[k] = v; });
        const mapa = (v) => v.replace(/(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g, (m, x, y, z) => { const k = x + ',' + y + ',' + z; return R[k] ? R[k].replace(/,/g, ', ') : m; });
        const malos = []; let faltan = 0, total = 0;
        els.forEach((e, i) => PROPS.forEach((p, j) => {
          const va = a[i][j], vb = b[i][j], vc = c[i][j]; if (va !== vc) return; // inestable (animación): no cuenta
          const esp = mapa(va).replace(/\s+/g, ''), real = vb.replace(/\s+/g, ''); total++;
          if (real === esp) return;
          if (real === va.replace(/\s+/g, '')) { faltan++; return; } // no se cambió (estilo en línea, var() o color escrito en el JS)
          const nom = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
          malos.push({ el: nom, p, base: va, esperado: mapa(va), sale: vb });
        }));
        return { malos: malos.slice(0, 40), nMalos: malos.length, faltan, total };
      }, { id, base: BASEDE[id] });
      malos = malos.concat(r.malos.map(x => Object.assign({ pantalla: nom }, x))); faltan += r.faltan; total += r.total;
      if (r.nMalos) info(`${id} ${w} ${nom}: ${r.nMalos} valores distintos de «base + paleta»`, r.malos.slice(0, 6));
    }
    ok(malos.length === 0, `${id} ${w}: cada color = color del tema base pasado por la paleta (ninguna regla cambia de ganadora)`, malos.slice(0, 10));
    info(`${id} ${w}: ${total} valores revisados; ${faltan} quedan con el color del tema base (no los alcanza la copia)`);
    await ctx.close();
  }
}

// ─── 4. Copias: doble proceso, hoja reemplazada, <style> dentro de un bloque, CSSOM ───
// LIMITE = el mecanismo no lo cubre, pero hoy (27-nov-2026) ningún archivo del sistema lo usa con colores de la paleta.
if (corre('copias')) {
  const { ctx, page } = await abrir(browser, { temaLocal: 'stripe', prefs: { tema: 'stripe', tema_glass_oscuro_v1: true }, dueno: true });
  const r = await page.evaluate(async () => {
    const out = {};
    const contar = () => { let n = 0; const rec = (rs) => { for (const r of rs) { if (r.selectorText && /tema-stripe\)/.test(r.selectorText) && !/tema-(apple|linear)/.test(r.selectorText)) n++; if (r.cssRules) rec(r.cssRules); } };
      for (const s of document.styleSheets) { try { rec(s.cssRules); } catch (e) {} } return n; };
    out.antes = contar(); window.nxTemaPaletaProcesar(); window.nxTemaPaletaProcesar(); out.despuesDoble = contar();
    // ida y vuelta Stripe → Apple → Stripe: ¿se acumulan copias?
    aplicarTema('apple', false); await new Promise(r => setTimeout(r, 300)); aplicarTema('stripe', false); await new Promise(r => setTimeout(r, 300));
    out.despuesIdaVuelta = contar();
    // hoja nueva con color de la paleta
    const prueba = (css, como) => new Promise(res => { const d = document.createElement('div'); d.className = 'qaX' + como; d.textContent = 'x'; document.body.appendChild(d);
      como(css, d); setTimeout(() => { res(getComputedStyle(d).color); d.remove(); }, 250); });
    const st1 = document.createElement('style'); st1.textContent = '.qaA{color:#2563eb}'; document.head.appendChild(st1);
    const dA = document.createElement('div'); dA.className = 'qaA'; document.body.appendChild(dA); await new Promise(r => setTimeout(r, 200));
    out.styleNuevo = getComputedStyle(dA).color;
    st1.textContent = '.qaA{color:#1d4ed8}'; await new Promise(r => setTimeout(r, 200)); out.styleReemplazado = getComputedStyle(dA).color;
    st1.firstChild.data = '.qaA{color:#2563eb}'; await new Promise(r => setTimeout(r, 200)); out.styleTextoCambiado = getComputedStyle(dA).color;
    const caja = document.createElement('div'); caja.innerHTML = '<style>.qaB{color:#2563eb}</style><div class="qaB">x</div>'; document.body.appendChild(caja); await new Promise(r => setTimeout(r, 200));
    out.styleDentroDeBloque = getComputedStyle(caja.querySelector('.qaB')).color;
    st1.sheet.insertRule('.qaC{color:#2563eb}', 0); const dC = document.createElement('div'); dC.className = 'qaC'; document.body.appendChild(dC); await new Promise(r => setTimeout(r, 200));
    out.reglaCSSOM = getComputedStyle(dC).color;
    // un selector que apunta al propio <html> sin escribir «html»
    const st2 = document.createElement('style'); st2.textContent = '.tema-claro{--qa-c:#2563eb}[data-nx-tema="clasico"]{--qa-d:#2563eb}'; document.head.appendChild(st2); await new Promise(r => setTimeout(r, 200));
    const cs = getComputedStyle(document.documentElement); out.reglaHtmlSinHtml = [cs.getPropertyValue('--qa-c').trim(), cs.getPropertyValue('--qa-d').trim()];
    return out;
  });
  info('copias', r);
  ok(r.antes === r.despuesDoble, 'procesar dos veces no duplica copias', r);
  ok(r.despuesIdaVuelta === r.antes, 'Stripe → Apple → Stripe no acumula copias de Stripe', r);
  const morado = 'rgb(83, 58, 253)';
  ok(r.styleNuevo === morado, '<style> nuevo de un parche: se copia', r.styleNuevo);
  ok(r.styleReemplazado === 'rgb(68, 52, 212)', '<style> con el texto reemplazado: se vuelve a copiar', r.styleReemplazado);
  limite(r.styleTextoCambiado === morado, '<style> cambiando solo el nodo de texto (.data): se vuelve a copiar', r.styleTextoCambiado);
  limite(r.styleDentroDeBloque === morado, '<style> que llega dentro de un bloque (innerHTML): se copia', r.styleDentroDeBloque);
  limite(r.reglaCSSOM === morado, 'regla agregada con insertRule: se copia', r.reglaCSSOM);
  limite(r.reglaHtmlSinHtml.every(v => v.toLowerCase() === '#533afd'), 'regla para <html> escrita como .tema-claro / [data-nx-tema]: se copia', r.reglaHtmlSinHtml);
  await ctx.close();
}

// ─── 5. Rendimiento: MutationObserver sobre todo el documento (CPU 4× más lenta, como un iPhone medio) ───
if (corre('rendimiento')) {
  const res = {};
  for (const [nom, t, sinMO] of [['clasico', 'clasico', false], ['stripe', 'stripe', false], ['stripe-sin-observador', 'stripe', true]]) {
    const { ctx, page } = await abrir(browser, { temaLocal: t, prefs: { tema: t, tema_glass_oscuro_v1: true }, dueno: true });
    if (sinMO) await page.evaluate(() => { window.__nxTemaMO && window.__nxTemaMO.disconnect(); });
    const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const r = await page.evaluate(async () => {
      const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
      const solo = [], conPintado = [];
      for (let k = 0; k < 7; k++) {
        const c = document.createElement('div'); document.getElementById('app').appendChild(c);
        let t1 = performance.now();
        for (let i = 0; i < 300; i++) { const f = document.createElement('div'); f.className = 'nc'; f.innerHTML = '<span class="btn">a</span>'.repeat(10); c.appendChild(f); }
        await Promise.resolve(); solo.push(performance.now() - t1);          // inserción + observador (microtarea)
        t1 = performance.now(); void c.offsetHeight; conPintado.push(performance.now() - t1); // recálculo de estilos
        c.remove(); await new Promise(r => setTimeout(r, 50));
      }
      return { insercion: Math.round(med(solo)), estilos: Math.round(med(conPintado)) };
    });
    res[nom] = r; await ctx.close();
  }
  info('rendimiento (CPU ×4, mediana de 7)', res);
  ok(res.stripe.insercion <= res['stripe-sin-observador'].insercion * 1.5 + 5, 'el observador de todo el documento casi no suma a una inserción de 3000 nodos', res);
  info('costo de tener ~1,750 reglas más (recálculo de estilos): stripe vs clasico', { stripe: res.stripe.estilos, clasico: res.clasico.estilos });
}

// ─── 6. Glass oscuro y Claro iguales a la versión anterior (QA_VIEJO) ───────
if (corre('igual') && VIEJO) {
  for (const t of ['glass-oscuro', 'clasico']) for (const w of [390, 1280]) {
    const fotos = {};
    for (const [k, base] of [['nuevo', BASE], ['viejo', VIEJO]]) {
      const { ctx, page } = await abrir(browser, { base, width: w, temaLocal: t, prefs: { tema: t, tema_glass_oscuro_v1: true } });
      const pr = await page.evaluate(() => window.__qaPrimer);
      const vals = [];
      for (const v of ['dashboard', 'clientes', 'facturas', 'custodia', 'config']) {
        await page.evaluate((v) => nav(v, document.querySelector(`[onclick*="nav('${v}'"]`)), v); await sleep(1500);
        vals.push(await page.evaluate((v) => { const P = ['color', 'background-color', 'border-top-color', 'box-shadow', 'background-image', 'opacity', 'font-size', 'padding-top', 'border-radius'];
          const s = document.createElement('style'); s.textContent = '*,*::before,*::after{transition:none!important}'; document.head.appendChild(s);
          const out = [...document.querySelectorAll('body *')].filter(e => e.getClientRects().length && !e.closest('[id*="toast" i],.toast')).map(e => { const cs = getComputedStyle(e); return (e.id || e.className.toString().slice(0, 40) || e.tagName) + '=' + P.map(p => cs.getPropertyValue(p)).join('|').replace(/127\.0\.0\.1:\d+/g, 'HOST'); });
          ['::before', '::after'].forEach(ps => { const cs = getComputedStyle(document.documentElement, ps); out.push(('html' + ps + '=' + cs.backgroundImage + '|' + cs.backgroundColor + '|' + cs.opacity).replace(/127\.0\.0\.1:\d+/g, 'HOST')); });
          s.remove(); return out; }, v));
      }
      fotos[k] = { pr, vals: vals.flat(), clases: (await html(page)).clases };
      await ctx.close();
    }
    const dif = []; const n = Math.min(fotos.nuevo.vals.length, fotos.viejo.vals.length);
    for (let i = 0; i < n; i++) if (fotos.nuevo.vals[i] !== fotos.viejo.vals[i]) dif.push({ nuevo: fotos.nuevo.vals[i], viejo: fotos.viejo.vals[i] });
    ok(fotos.nuevo.clases === fotos.viejo.clases, `${t} ${w}: mismas clases en <html> que antes`, { nuevo: fotos.nuevo.clases, viejo: fotos.viejo.clases });
    ok(fotos.nuevo.pr.c1 === fotos.viejo.pr.c1 && fotos.nuevo.pr.clases === fotos.viejo.pr.clases, `${t} ${w}: primer pintado igual que antes`, { nuevo: fotos.nuevo.pr, viejo: fotos.viejo.pr });
    ok(dif.length === 0 && fotos.nuevo.vals.length === fotos.viejo.vals.length, `${t} ${w}: estilos de ${n} elementos iguales que antes`, { nNuevo: fotos.nuevo.vals.length, nViejo: fotos.viejo.vals.length, dif: dif.slice(0, 5) });
  }
}

// ─── 7. Primer pintado con CPU lenta y red lenta (iPhone) ──────────────────
if (corre('parpadeo')) {
  for (const t of [{ id: 'stripe', c1: '#533afd' }, { id: 'apple', c1: '#0066cc' }, { id: 'linear', c1: '#828fff' }]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 400 * 1024, uploadThroughput: 200 * 1024 });
    await page.addInitScript((id) => { localStorage.setItem('nx_tema', id);
      const marcas = []; window.__qaMarcas = marcas;
      const f = () => { const cs = getComputedStyle(document.documentElement); marcas.push({ body: !!document.body, c1: cs.getPropertyValue('--c1').trim(), clases: document.documentElement.className, n: window.__nxTemaN || 0 }); if (marcas.length < 40) requestAnimationFrame(f); };
      requestAnimationFrame(f); }, t.id);
    await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 120000 });
    await sleep(1500);
    const m = await page.evaluate(() => window.__qaMarcas);
    const conBody = m.filter(x => x.body);
    const malos = conBody.filter(x => x.c1.toLowerCase() !== t.c1);
    ok(conBody.length > 0 && malos.length === 0, `${t.id}: CPU ×6 y red lenta, todos los cuadros con <body> ya con su color`, { primero: conBody[0], malos: malos.slice(0, 3) });
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fallos.length) console.log('Fallos:\n - ' + fallos.join('\n - '));
process.exit(fail ? 1 : 0);
