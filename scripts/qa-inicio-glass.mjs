// QA del Inicio glass oscuro (58.88, 29-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js (abonos alrededor de hoy + RPC seguros_resumen_ciclo_admin). A 390 y 1280 px, admin y agente:
//  · con el interruptor APAGADO (localStorage nx_inicio_glass_off=1) lee las cifras del Inicio clásico;
//  · ENCENDIDO comprueba que el glass muestra exactamente esas cifras, sin saltos de diseño entre el primer pintado y el
//    final, sin desborde, textos ≥12 px y toques ≥44 px en móvil, sin errores, sin fondo oscuro fuera del Inicio y con el
//    Buzón de WhatsApp igual que con la capa apagada.
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-inicio-glass.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-inicio-glass')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const resumen = {};
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 600) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(s); } }); }));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dig = (t) => String(t || '').replace(/[^\d-]/g, '');

async function abrir(browser, { width, rol, off, reduce }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [], rpcs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  page.on('request', r => { const u = r.url(); if (/\/rpc\//.test(u)) rpcs.push(u.split('/rpc/')[1]); });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url(); if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); } return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto ya cerrado */ } });
  await page.addInitScript(({ rol, off }) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    if (off) localStorage.setItem('nx_inicio_glass_off', '1'); else localStorage.removeItem('nx_inicio_glass_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: rol === 'admin' ? '00000000-0000-4000-8000-000000000001' : '00000000-0000-4000-8000-000000000002', nom: rol === 'admin' ? 'Esterlin Espinal' : 'Robinson Perez', rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    // Primer cuadro en que el Inicio glass es visible: posiciones de los bloques principales (para medir saltos).
    const SEL = ['.nxIG-head', '.nxIG-kpis', '.nxIG-row2', '#nxIGpros', '#nxIGagts', '#nxIGacc', '.nxIG-main', '.nxIG-prof', '.nxIG-stats', '.nxIG-cal', '#nxIGagenda'];
    window.__igRects = () => { const r0 = document.getElementById('nxIG'); if (!r0) return null; const b0 = r0.getBoundingClientRect(); const o = {}; SEL.forEach(s => { const e = document.querySelector(s); if (!e) return; const b = e.getBoundingClientRect(); o[s] = [Math.round(b.left - b0.left), Math.round(b.top - b0.top), Math.round(b.width), Math.round(b.height)]; }); return o; };
    // Historial cuadro a cuadro (6 s): cada cambio de posición/alto de un bloque queda registrado con el ancho del Inicio.
    window.__igHist = []; let ult = '';
    const t0 = performance.now();
    const tick = () => {
      const e = document.getElementById('nxIG');
      if (e && e.offsetParent !== null && e.getBoundingClientRect().height > 0) {
        const r = window.__igRects(), k = JSON.stringify(r);
        if (k !== ult) { ult = k; window.__igHist.push({ t: Math.round(performance.now()), w: Math.round(e.getBoundingClientRect().width), lleno: !/nxIG-sk/.test(document.getElementById('nxIGk2v').innerHTML), rects: r }); }
      }
      if (performance.now() - t0 < 6000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Mismo registro de ancho para el Inicio clásico (para mostrar que el cambio de ancho del arranque es del sistema).
    window.__dashW = []; const td = () => { const v = document.getElementById('v-dashboard'); if (v && v.offsetParent !== null) { const w = Math.round(v.getBoundingClientRect().width); if (window.__dashW[window.__dashW.length - 1] !== w) window.__dashW.push(w); } if (performance.now() - t0 < 6000) requestAnimationFrame(td); }; requestAnimationFrame(td);
  }, { rol, off });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0 && typeof window.nxCrm === 'object', null, { timeout: 25000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2500);
  await page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('dashboard', null); });
  await sleep(1800);
  return { ctx, page, errs, rpcs };
}

// Cifras del Inicio clásico (su DOM se sigue pintando aunque esté oculto bajo el glass).
const leerClasico = (page) => page.evaluate(() => {
  const t = (s) => (document.querySelector(s)?.innerText || '').trim();
  const n = [...document.querySelectorAll('#dashHero .dhero-n')].map(e => e.innerText.trim());
  const kv = [...document.querySelectorAll('#kpiG .kv')].map(e => e.innerText.trim());
  return { porCobrar: t('#dashHero .dhero-big'), conSaldo: t('#dashHero .dhero-sub'), atrasadas: n[0], cobradoCiclo: t('#kpiCobMes'), activos: n[2], inhab: [...document.querySelectorAll('#dashHero .dhero-s')].map(e => e.innerText.trim())[2], prima: kv[0], enProceso: kv[1], efect: t('#kpiG .kpi .ks') };
});
const leerGlass = (page) => page.evaluate(() => {
  const t = (id) => (document.getElementById(id)?.innerText || '').trim();
  return { porCobrar: t('nxIGk2v'), conSaldo: t('nxIGk2c'), atrasadas: t('nxIGk4v'), cobradoCiclo: t('nxIGcy1'), activos: t('nxIGk3v'), inhab: t('nxIGk3s'), prima: (document.querySelector('#nxIGprima b')?.innerText || '').trim(), enProceso: t('nxIGs3'), efect: t('nxIGk2s'), cobradoHoy: t('nxIGk1v'), anterior: t('nxIGcy2'), vencidas: t('nxIGs1'), porVencer: t('nxIGs2'), p1: t('nxIGp1'), p2: t('nxIGp2'), p3: t('nxIGp3'), agenda: document.querySelectorAll('#nxIGagenda .nxIG-it').length, agentes: [...document.querySelectorAll('#nxIGagts .nxIG-ag')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), sub: t('nxIGSub'), hola: t('nxIGHola') };
});

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('prospectos/reset'); await qa('orgtipo/seguros');
  for (const width of [390, 1280]) for (const rol of ['admin', 'agente']) {
    const tag = `${width}-${rol}`, disp = width < 500 ? 'movil' : 'pc';
    console.log(`\n=== ${tag} ===`);
    // A) Interruptor APAGADO: Inicio clásico, tal cual.
    const A = await abrir(browser, { width, rol, off: true });
    const clasico = await leerClasico(A.page);
    const offDom = await A.page.evaluate(() => ({ cls: document.documentElement.classList.contains('nx-ig'), ig: getComputedStyle(document.getElementById('nxIG')).display, hero: getComputedStyle(document.getElementById('dashHero')).display, qaEnSitio: document.querySelector('#v-dashboard > .qa-g') !== null, nQa: document.querySelectorAll('#v-dashboard .qa').length }));
    ok(!offDom.cls && offDom.ig === 'none' && offDom.hero !== 'none' && offDom.qaEnSitio, `${tag} interruptor: con nx_inicio_glass_off=1 se ve el Inicio clásico (glass oculto, accesos en su sitio)`, offDom);
    await A.page.screenshot({ path: OUT + `inicio-${disp}-${rol}-antes.png` });
    await A.page.evaluate(() => nav('waInbox', null)); await sleep(1200);
    const waOff = await A.page.evaluate(() => { const v = document.getElementById('v-waInbox'); if (!v) return null; const b = v.getBoundingClientRect(); return { on: v.classList.contains('on'), w: Math.round(b.width), x: Math.round(b.left), n: v.querySelectorAll('*').length, bg: getComputedStyle(document.body).backgroundColor, cnt: getComputedStyle(document.getElementById('cnt')).backgroundColor }; });
    await A.page.evaluate(() => nav('clientes', null)); await sleep(600);
    const cliOff = await A.page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, cnt: getComputedStyle(document.getElementById('cnt')).backgroundColor, sw: document.documentElement.scrollWidth }));
    ok(A.errs.length === 0, `${tag} clásico: sin errores de consola`, A.errs.slice(0, 4));
    await A.ctx.close();

    // B) Interruptor ENCENDIDO: Inicio glass.
    const B = await abrir(browser, { width, rol, off: false });
    const { page } = B;
    await sleep(1500);
    const g = await leerGlass(page), oculto = await leerClasico(page);
    resumen[tag] = { clasico, glass: g };
    const on = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('nx-ig'), vis: document.getElementById('nxIG').offsetParent !== null, heroOculto: getComputedStyle(document.getElementById('dashHero')).display === 'none', qaMovida: !!document.querySelector('#nxIGacc > .qa-g'), nQa: document.querySelectorAll('#nxIGacc .qa').length }));
    ok(on.cls && on.vis && on.heroOculto && on.qaMovida, `${tag}: Inicio glass visible, clásico oculto, accesos rápidos dentro del glass`, on);
    ok(on.nQa === offDom.nQa, `${tag}: mismos ${offDom.nQa} accesos rápidos que el clásico (movidos, no duplicados)`, [on.nQa, offDom.nQa]);
    // Cifras: glass = clásico de la corrida A = clásico oculto de esta corrida.
    for (const k of ['porCobrar', 'atrasadas', 'cobradoCiclo', 'activos', 'prima', 'enProceso'])
      ok(dig(g[k]) === dig(clasico[k]) && dig(oculto[k]) === dig(clasico[k]), `${tag}: ${k} glass=${g[k]} = clásico=${clasico[k]}`, { glass: g[k], clasico: clasico[k], oculto: oculto[k] });
    ok(dig(g.conSaldo) === dig(clasico.conSaldo), `${tag}: clientes con saldo ${g.conSaldo} = «${clasico.conSaldo}»`, [g.conSaldo, clasico.conSaldo]);
    ok(dig(g.efect) === dig(clasico.efect), `${tag}: efectividad ${g.efect} = «${clasico.efect}»`, [g.efect, clasico.efect]);
    ok(dig(g.inhab).slice(-1) === dig(clasico.inhab), `${tag}: inhabilitados = «${clasico.inhab}»`, [g.inhab, clasico.inhab]);
    // Serie diaria del ciclo = «Cobrado» del ciclo (misma lista de abonos, sin doble conteo); hoy = 1,500 + 2,500 del simulador.
    const serie = await page.evaluate(() => { const mc = mesCorte(), ini = cicloInicio(mc.anio, mc.mes); let m2 = mc.mes + 1, a2 = mc.anio; if (m2 > 12) { m2 = 1; a2++; } const fin = cicloInicio(a2, m2); let s = 0; Object.entries(_nxIG.porDia || {}).forEach(([d, v]) => { if (d >= ini && d < fin) s += v; }); return { s, hoy: (_nxIG.porDia || {})[hoyRD()] || 0 }; });
    ok(String(Math.round(serie.s)) === dig(clasico.cobradoCiclo), `${tag}: suma de la gráfica diaria (${serie.s}) = cobrado del ciclo del clásico`, [serie.s, clasico.cobradoCiclo]);
    ok(serie.hoy === 4000 && dig(g.cobradoHoy) === '4000', `${tag}: cobrado hoy = RD$ 4,000 (abonos de hoy del simulador)`, [serie.hoy, g.cobradoHoy]);
    ok(dig(g.anterior) === '5000', `${tag}: ciclo anterior al mismo día = RD$ 5,000 (abono de hace 40 días)`, g.anterior);
    ok(g.p1 === '2' && g.p2 === '1' && g.p3 === '1', `${tag}: prospectos Nuevo/Cotizado/Documentos = 2/1/1 (crm_prospectos)`, [g.p1, g.p2, g.p3]);
    ok(g.agenda === 3, `${tag}: agenda con las 3 próximas tareas pendientes`, g.agenda);
    ok(/Hoy llevas 2 cobros/.test(g.sub) && /seguimiento/.test(g.sub), `${tag}: subtítulo con cobros de hoy y seguimientos («${g.sub}»)`, g.sub);
    if (rol === 'admin') {
      ok(g.agentes.length === 3 && /Esterlin.*RD\$ 40,000.*RD\$ 60,000 en poder/.test(g.agentes[0]) && /Robinson.*RD\$ 25,000.*RD\$ 5,000 en poder/.test(g.agentes[1]) && /sin movimiento/.test(g.agentes[2]), `${tag}: cobranza por agente = RPC seguros_resumen_ciclo_admin (cobrado validado y saldo, sin sumar transferencias)`, g.agentes);
    } else {
      const vis = await page.evaluate(() => getComputedStyle(document.getElementById('nxIGagts')).display);
      ok(vis === 'none' && !B.rpcs.some(r => /seguros_resumen_ciclo_admin/.test(r)), `${tag}: agente no ve «Cobranza por agente» ni se llama la RPC de admin`, { vis, rpcs: B.rpcs });
    }
    // Saltos de diseño: entre cuadros consecutivos con el MISMO ancho del Inicio (esqueleto → cifras → CRM/RPC), ningún
    // bloque principal se mueve ni cambia de alto más de 1 px. Los cambios de ancho del arranque (menú lateral que termina
    // de cargar) son del sistema y le pasan igual al Inicio clásico: se informan aparte.
    const hist = await page.evaluate(() => { const h = window.__igHist.slice(); const f = window.__igRects(); const w = Math.round(document.getElementById('nxIG').getBoundingClientRect().width); if (JSON.stringify(h[h.length - 1]?.rects) !== JSON.stringify(f)) h.push({ t: -1, w, lleno: true, rects: f }); return h; });
    const saltos = [];
    for (let i = 1; i < hist.length; i++) { const a = hist[i - 1], b = hist[i]; if (a.w !== b.w) continue; for (const [k, v] of Object.entries(a.rects)) { const w2 = b.rects[k]; if (!w2 || (!v[2] && !w2[2])) continue; const d = Math.max(...v.map((x, j) => Math.abs(x - w2[j]))); if (d > 1) saltos.push([k, a.lleno ? 'lleno' : 'esqueleto', v, w2, b.t]); } }
    const anchos = [...new Set(hist.map(h => h.w))], dashW = await page.evaluate(() => window.__dashW);
    const pintadoVacio = hist.some(h => !h.lleno), pintadoLleno = await page.evaluate(() => !/nxIG-sk/.test(document.getElementById('nxIGk2v').innerHTML) && !/nxIG-sk/.test(document.getElementById('nxIGcy1').innerHTML));
    resumen[tag].saltos = { cuadros: hist.length, esqueletoVisible: pintadoVacio, anchosInicio: anchos, anchosVistaInicio: dashW, saltos: saltos.length };
    ok(pintadoLleno && saltos.length === 0, `${tag}: sin saltos de diseño del esqueleto a las cifras (${hist.length} cuadros, ${Object.keys(hist[0]?.rects || {}).length} bloques, ≤1 px)`, saltos.slice(0, 4));
    if (anchos.length > 1) console.log(`INFO  ${tag}: el ancho del contenido cambia en el arranque (${anchos.join(' → ')} px) por la carga del menú lateral; mismo cambio en la vista del Inicio: ${dashW.join(' → ')}`);
    // Desborde, tamaños y toques
    const med = await page.evaluate((movil) => {
      const r = { sw: [document.documentElement.scrollWidth, window.innerWidth], igOver: 0, chicos: [], toques: [] };
      const ig = document.getElementById('nxIG'); const bi = ig.getBoundingClientRect();
      const qg = ig.querySelector('.qa-g'); if (qg && qg.firstElementChild) { const b1 = qg.firstElementChild.getBoundingClientRect(), bq = qg.getBoundingClientRect(); if (b1.left < bq.left - 1) r.igOver++; }
      ig.querySelectorAll('*').forEach(el => { if (el.closest('.qa-g')) return; const b = el.getBoundingClientRect(); if (b.width && (b.right > bi.right + 1 || b.left < bi.left - 1) && !el.closest('svg')) r.igOver++; });
      if (movil) {
        ig.querySelectorAll('*').forEach(el => { if (el.closest('svg') || !el.offsetParent) return; const propio = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!propio) return; const f = parseFloat(getComputedStyle(el).fontSize); if (f < 12) r.chicos.push([el.className || el.tagName, el.textContent.trim().slice(0, 16), f]); });
        ig.querySelectorAll('button,[role=button],.qa').forEach(el => { if (!el.offsetParent) return; const b = el.getBoundingClientRect(); if (b.height < 44 || b.width < 44) r.toques.push([el.className || el.tagName, (el.innerText || '').trim().slice(0, 14), Math.round(b.width), Math.round(b.height)]); });
      }
      return r;
    }, width < 500);
    ok(med.sw[0] <= med.sw[1], `${tag}: sin desborde horizontal de la página`, med.sw);
    ok(med.igOver === 0, `${tag}: nada se sale del Inicio glass`, med.igOver);
    if (width < 500) {
      ok(med.chicos.length === 0, `${tag}: todo el texto del Inicio ≥12 px`, med.chicos.slice(0, 6));
      ok(med.toques.length === 0, `${tag}: todo lo tocable ≥44 px`, med.toques.slice(0, 6));
    }
    await page.evaluate(() => document.querySelector('.content')?.scrollTo(0, 0)); await sleep(200);
    await page.screenshot({ path: OUT + `inicio-${disp}-${rol}.png` });
    // Captura completa: el Inicio vive en un contenedor con scroll propio (.content), así que se agranda la ventana.
    { const vp = page.viewportSize(); const alto = await page.evaluate(() => document.querySelector('.content').scrollHeight + 90); await page.setViewportSize({ width: vp.width, height: Math.min(alto, 4000) }); await sleep(500); await page.screenshot({ path: OUT + `inicio-${disp}-${rol}-completo.png` }); await page.setViewportSize(vp); await sleep(400); }
    // Navegación: tocar tarjetas lleva a su módulo; al salir no queda fondo oscuro; Buzón igual que con la capa apagada.
    await page.evaluate(() => document.getElementById('nxIGk2').click()); await sleep(900);
    ok(await page.evaluate(() => document.getElementById('v-clientes').classList.contains('on') && document.getElementById('nxIG').offsetParent === null), `${tag}: «Por cobrar» abre Clientes y el glass desaparece`);
    const cliOn = await page.evaluate(() => ({ bg: getComputedStyle(document.body).backgroundColor, cnt: getComputedStyle(document.getElementById('cnt')).backgroundColor, sw: document.documentElement.scrollWidth, oscuro: [...document.querySelectorAll('#cnt *')].filter(e => e.offsetParent && e.closest('#nxIG')).length }));
    ok(cliOn.bg === cliOff.bg && cliOn.cnt === cliOff.cnt && cliOn.oscuro === 0, `${tag}: sin fondo oscuro fuera del Inicio (body/#cnt iguales que con la capa apagada)`, { cliOn, cliOff });
    await page.evaluate(() => nav('waInbox', null)); await sleep(1200);
    const waOn = await page.evaluate(() => { const v = document.getElementById('v-waInbox'); if (!v) return null; const b = v.getBoundingClientRect(); return { on: v.classList.contains('on'), w: Math.round(b.width), x: Math.round(b.left), n: v.querySelectorAll('*').length, bg: getComputedStyle(document.body).backgroundColor, cnt: getComputedStyle(document.getElementById('cnt')).backgroundColor }; });
    ok(JSON.stringify(waOn) === JSON.stringify(waOff), `${tag}: Buzón WhatsApp idéntico con la capa encendida y apagada`, { waOn, waOff });
    await page.evaluate(() => nav('dashboard', null)); await sleep(700);
    ok(await page.evaluate(() => document.getElementById('nxIG').offsetParent !== null && !!document.querySelector('#nxIGacc > .qa-g')), `${tag}: al volver al Inicio el glass reaparece con sus accesos`);
    await page.evaluate(() => nxIGIrProspectos()); await sleep(900);
    ok(await page.evaluate(() => document.getElementById('v-crm')?.classList.contains('on') && nxCrm.qa.estado().tab === 'prospectos'), `${tag}: tarjeta de Prospectos abre CRM → Prospectos`);
    await page.evaluate(() => { nxCrm.tab('panel'); nav('dashboard', null); }); await sleep(900);
    await page.evaluate(() => document.querySelector('#nxIGagenda .nxIG-it').click()); await sleep(1000);
    ok(await page.evaluate(() => document.getElementById('v-cliente360')?.classList.contains('on')), `${tag}: tarea de la Agenda abre la ficha del cliente`);
    await page.evaluate(() => nav('dashboard', null)); await sleep(500);
    await page.evaluate(() => document.querySelector('.nxIG-search').click()); await sleep(400);
    ok(await page.evaluate(() => document.getElementById('gsOverlay').classList.contains('show')), `${tag}: la píldora de búsqueda abre la búsqueda global existente`);
    await page.evaluate(() => { try { cerrarGlobalSearch(); } catch (e) {} });
    ok(B.errs.length === 0, `${tag} glass: sin errores de consola`, B.errs.slice(0, 5));
    await B.ctx.close();
  }
  // Movimiento reducido: sin animaciones ni transiciones dentro del Inicio glass.
  {
    const R = await abrir(browser, { width: 390, rol: 'admin', off: false, reduce: true });
    const m = await R.page.evaluate(() => { const c = document.getElementById('nxIGk1'), s = document.querySelector('#nxIG .nxIG-bar i'); return [getComputedStyle(c).transitionDuration, getComputedStyle(s).transitionDuration, getComputedStyle(document.querySelector('#nxIG .nxIG-days')).animationName]; });
    ok(m[0] === '0s' && m[1] === '0s', 'prefers-reduced-motion: sin transiciones en el Inicio glass', m);
    await R.ctx.close();
  }
  await browser.close();
  fs.writeFileSync(OUT + 'resumen-inicio-glass.json', JSON.stringify(resumen, null, 1));
  console.log('\n' + JSON.stringify(resumen, null, 1).slice(0, 4000));
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
