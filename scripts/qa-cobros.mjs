// QA de Facturas → Cobros (59.21, 11-oct-2026): resumen, lupa y filtros en una fila, tarjetas y COBRAR.
// Solo forma y orden: rCob(), abrirAbono() y los filtros no cambian. Datos de la REST simulada; los casos raros
// (referencia, cliente sin agente) se ponen en memoria de la página, sin tocar el servidor.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-cobros.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942', OUT = process.env.QA_OUT || require('os').tmpdir();
const TABLER = '/tmp/qa-tabler-icons'; // íconos locales si existen (si no, los íconos quedan vacíos y la prueba sigue)
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { res.resume(); res.on('end', r); }).on('error', r));
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };

async function abrir(b, w, tema) {
  await qa('tema/' + tema);
  const movil = w < 500;
  const ctx = await b.newContext(movil ? { viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA } : { viewport: { width: w, height: 800 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    const m = u.match(/@tabler\/icons-webfont@[^/]+\/dist\/([^?#]+)/); if (m && fs.existsSync(path.join(TABLER, m[1]))) return r.fulfill({ status: 200, body: fs.readFileSync(path.join(TABLER, m[1])) });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript((t) => { localStorage.setItem('nx_auth_mode', 'legacy'); localStorage.setItem('nx_tema', t); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, tema);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4500);
  await page.evaluate(() => { nav('facturas', null); setTimeout(() => switchTab('cob'), 250); });
  await page.waitForFunction(() => document.querySelectorAll('#tbCob .nxCobCard').length > 0, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page, errs };
}

// Casos raros en memoria: referencia en el 1.º cliente con deuda y uno con deuda sin agente.
const casosRaros = (p) => p.evaluate(() => {
  const S = window.ST || ST; const deben = S.clientes.filter(c => c.activo !== false && pendTot(c) > 0);
  if (deben[0]) deben[0].referencia = 'REF-7';
  if (deben[1]) deben[1].agente_id = null;
  rCob(); return { ref: deben[0] && deben[0].id, sinAg: deben[1] && deben[1].id };
});

const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; };

async function recorrido(b, w, tema) {
  const et = `[${w} ${tema}]`;
  const { ctx, page, errs } = await abrir(b, w, tema);
  const oscuro = tema === 'glass-oscuro'; // en «Premium dark» las tarjetas de cobro siguen blancas (como en el claro)
  const raros = await casosRaros(page); await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `cobros-${w}-${tema}.png`), fullPage: true });

  // 1) Lupa y los dos filtros en una sola fila, sin desbordar
  const fila = await page.evaluate(() => {
    const t = document.querySelector('#panelCob .nxCobTools'); if (!t) return null;
    const r = e => { const x = e.getBoundingClientRect(); return { y: x.y + x.height / 2, r: x.right, h: x.height }; };
    const lupa = document.querySelector('#cobQLupa'), ag = document.querySelector('#fAgenteCobChip .nfcBtn'), es = document.querySelector('#fCobEstChip .nfcBtn');
    return { lupa: lupa && r(lupa), ag: ag && r(ag), es: es && r(es), tr: t.getBoundingClientRect().right, sw: t.scrollWidth, cw: t.clientWidth,
      selAg: getComputedStyle(document.getElementById('fAgenteCob')).display, selEs: getComputedStyle(document.getElementById('fCobEst')).display };
  });
  ok(fila && fila.lupa && fila.ag && fila.es, `${et} la fila tiene lupa, chip Agente y chip Estado`, fila);
  if (fila && fila.lupa && fila.ag && fila.es) {
    ok(Math.abs(fila.lupa.y - fila.ag.y) < 6 && Math.abs(fila.ag.y - fila.es.y) < 6, `${et} lupa y filtros en la misma fila`, fila);
    ok(fila.es.r <= fila.tr + 1 && fila.sw <= fila.cw + 1, `${et} la fila no se sale de la pantalla`, fila);
    ok(fila.selAg === 'none' && fila.selEs === 'none', `${et} los select originales quedan ocultos detrás de los chips`, fila);
  }

  // 2) Resumen: en el celular «Deuda total» arriba y a lo ancho; «Con deuda» y «Al día» lado a lado
  const kpi = await page.evaluate(() => {
    const g = s => { const e = document.querySelector('#cobResumen ' + s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, fs: parseFloat(getComputedStyle(e.querySelector('.v')).fontSize) }; };
    const c = document.querySelector('#cobResumen .sf-kpis'); return { cont: c && c.getBoundingClientRect().width, warn: g('.sf-kpi.warn'), err: g('.sf-kpi.err') || g('.sf-kpi.ok:first-child'), ok: g('.sf-kpi.ok:last-child') };
  });
  if (w < 500) {
    ok(kpi.warn && kpi.err && kpi.ok && kpi.warn.y < kpi.err.y && kpi.warn.y < kpi.ok.y, `${et} «Deuda total» va primero`, kpi);
    ok(kpi.warn && Math.abs(kpi.warn.w - kpi.cont) < 2, `${et} «Deuda total» a lo ancho`, kpi);
    ok(kpi.err && kpi.ok && Math.abs(kpi.err.y - kpi.ok.y) < 2 && kpi.err.x < kpi.ok.x, `${et} «Con deuda» y «Al día» lado a lado`, kpi);
    ok(kpi.warn && kpi.warn.fs >= 22, `${et} la cifra de «Deuda total» es la más grande (${kpi.warn && kpi.warn.fs}px)`);
  } else {
    ok(kpi.warn && kpi.err && kpi.ok && Math.abs(kpi.warn.y - kpi.err.y) < 2 && Math.abs(kpi.warn.y - kpi.ok.y) < 2, `${et} los 3 del resumen en una fila`, kpi);
  }

  // 3) Tarjetas
  const tarjetas = await page.evaluate(() => Array.from(document.querySelectorAll('#tbCob .nxCobCard')).map(c => {
    const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
    const nm = c.querySelector('.cbNm'), ag = c.querySelector('.cbAg'), bd = c.querySelector('.cbBadges'), btn = c.querySelector('.cbBtn.cobrar');
    const amts = Array.from(c.querySelectorAll('.cbFoot .cbAmt'));
    const bcs = getComputedStyle(btn);
    return { cls: c.className, id: (btn.getAttribute('onclick') || '').match(/'([^']+)'/)?.[1], nm: R(nm), ag: R(ag), bd: R(bd), card: R(c),
      ant: amts[0] && { gris: !!amts[0].querySelector('.cbV.gray'), disp: getComputedStyle(amts[0]).display },
      pendFs: amts[1] && parseFloat(getComputedStyle(amts[1].querySelector('.cbV')).fontSize),
      btnBg: bcs.backgroundColor, btnImg: bcs.backgroundImage, btnColor: bcs.color, icoColor: getComputedStyle(btn.querySelector('i')).color,
      refColor: nm.querySelector('span') ? getComputedStyle(nm.querySelector('span')).color : null,
      sinAgColor: ag.querySelector('span[style*="ef4444"]') ? getComputedStyle(ag.querySelector('span[style*="ef4444"]')).color : null,
      sinAgIco: ag.querySelector('i[style*="ef4444"]') ? getComputedStyle(ag.querySelector('i[style*="ef4444"]')).color : null };
  }));
  ok(tarjetas.length > 0, `${et} hay tarjetas de cobro (${tarjetas.length})`);
  const deben = tarjetas.filter(t => /u-(crit|warn)/.test(t.cls)), aldia = tarjetas.filter(t => /u-ok/.test(t.cls));
  ok(deben.length > 0 && aldia.length > 0, `${et} hay clientes con deuda (${deben.length}) y al día (${aldia.length}) para comparar`);
  // nombre pegado al agente (antes, en el celular, la regla de toque de 44 px dejaba un hueco)
  const huecos = tarjetas.map(t => Math.round(t.ag.y - t.nm.b));
  ok(huecos.every(h => h >= 0 && h <= 6), `${et} el nombre queda pegado a su agente (hueco ${Math.max(...huecos)}px)`, huecos);
  if (w < 500) {
    ok(tarjetas.every(t => t.bd.y >= t.ag.b - 1), `${et} las etiquetas bajan debajo del agente`);
    ok(tarjetas.every(t => t.nm.w > 200), `${et} el nombre usa todo el ancho de la tarjeta`, tarjetas.map(t => Math.round(t.nm.w)));
    // el área de toque del nombre sigue en 44 px (::after invisible): se prueba tocando por encima y por debajo del texto
    const t0 = tarjetas[0];
    const toque = await page.evaluate(([x, y1, y2]) => [document.elementFromPoint(x, y1), document.elementFromPoint(x, y2)].map(e => !!(e && e.closest('.cbNm'))), [t0.nm.x + 12, t0.nm.y - 8, t0.nm.b + 14]);
    ok(toque[0] && toque[1], `${et} el nombre se puede tocar en 44 px de alto aunque el texto mida menos`, toque);
  } else {
    ok(tarjetas.every(t => t.bd.y < t.ag.b), `${et} en la computadora las etiquetas van a la derecha del nombre`);
  }
  ok(tarjetas.every(t => !t.ant || (t.ant.gris ? t.ant.disp === 'none' : t.ant.disp !== 'none')), `${et} «Deuda anterior» solo se ve cuando hay deuda anterior`);
  ok(tarjetas.every(t => t.pendFs >= 17), `${et} el pendiente se ve grande (17px)`);
  // COBRAR: verde fuerte con ícono blanco para quien debe; suave para quien está al día
  const blanco = 'rgb(255, 255, 255)';
  ok(deben.every(t => t.icoColor === blanco && t.btnColor === blanco), `${et} COBRAR de quien debe: texto e ícono blancos`, deben.map(t => [t.btnColor, t.icoColor]));
  const alfa = c => { const m = c.match(/[\d.]+/g); return m ? (m[3] !== undefined ? +m[3] : 1) : 0; };
  ok(deben.every(t => alfa(t.btnBg) === 1 && /rgb\((1[0-9]|2[0-9]), (1[2-6][0-9]), (4[0-9]|6[0-9]|7[0-9])\)/.test(t.btnBg)), `${et} COBRAR de quien debe: verde sólido`, deben.map(t => t.btnBg));
  if (oscuro) {
    ok(aldia.every(t => alfa(t.btnBg) < 0.3 && t.btnImg === 'none'), `${et} COBRAR de quien está al día: tono suave`, aldia.map(t => t.btnBg));
    ok(aldia.every(t => t.btnColor === 'rgb(187, 247, 208)' && t.icoColor === 'rgb(134, 239, 172)'), `${et} COBRAR al día: texto e ícono verdes claros`, aldia.map(t => [t.btnColor, t.icoColor]));
  } else {
    ok(aldia.every(t => t.btnBg === 'rgb(236, 253, 243)' && t.btnColor === 'rgb(21, 128, 61)'), `${et} COBRAR de quien está al día: verde claro con texto verde`, aldia.map(t => [t.btnBg, t.btnColor]));
  }
  const conRef = tarjetas.find(t => t.id === raros.ref), sinAg = tarjetas.find(t => t.id === raros.sinAg);
  if (oscuro) {
    // la referencia (#7c3aed en línea) y «Sin agente» (#ef4444 en línea) los aclara el tema; aquí solo se comprueba que siguen así
    ok(conRef && conRef.refColor === 'rgb(191, 219, 254)', `${et} la referencia del cliente se lee (la aclara el tema)`, conRef && conRef.refColor);
    ok(sinAg && sinAg.sinAgColor === 'rgb(254, 202, 202)' && sinAg.sinAgIco === sinAg.sinAgColor, `${et} «Sin agente» y su triángulo en rojo claro (no en gris)`, sinAg && [sinAg.sinAgColor, sinAg.sinAgIco]);
  } else {
    ok(conRef && conRef.refColor === 'rgb(124, 58, 237)', `${et} tarjeta blanca: la referencia sigue en su morado`, conRef && conRef.refColor);
    ok(sinAg && sinAg.sinAgColor === 'rgb(239, 68, 68)' && sinAg.sinAgIco === 'rgb(154, 52, 18)', `${et} tarjeta blanca: «Sin agente» y su triángulo con sus colores de siempre`, sinAg && [sinAg.sinAgColor, sinAg.sinAgIco]);
  }
  if (w >= 1100) {
    ok(tarjetas.length >= 2 && Math.abs(tarjetas[0].card.y - tarjetas[1].card.y) < 2 && tarjetas[1].card.x > tarjetas[0].card.r, `${et} dos tarjetas por fila`, tarjetas.slice(0, 2).map(t => t.card));
  } else {
    ok(tarjetas.length >= 2 && tarjetas[1].card.y > tarjetas[0].card.b, `${et} una tarjeta por fila`);
  }

  // 4) Filtro Estado desde el chip (como lo usa la persona)
  const elegir = async (v) => {
    await page.click('#fCobEstChip .nfcBtn'); await page.waitForTimeout(350);
    await page.click(`.nfcPanel.open .nfcOpt[data-v="${v}"]`); await page.waitForTimeout(500);
    return page.evaluate(() => ({ cls: Array.from(document.querySelectorAll('#tbCob .nxCobCard')).map(c => c.className), lbl: (document.querySelector('#fCobEstChip .nfcLbl') || {}).textContent, val: document.getElementById('fCobEst').value }));
  };
  let r = await elegir('deuda');
  ok(r.val === 'deuda' && r.cls.length > 0 && r.cls.every(c => /u-(crit|warn)/.test(c)), `${et} filtro «Con deuda pendiente»: solo quien debe`, r);
  ok(/deuda/i.test(r.lbl || ''), `${et} el chip dice el filtro elegido («${r.lbl}»)`);
  r = await elegir('aldia');
  ok(r.val === 'aldia' && r.cls.length > 0 && r.cls.every(c => /u-ok/.test(c)), `${et} filtro «Al día»: solo quien está al día`, r);
  r = await elegir('');
  ok(r.val === '' && r.cls.length === tarjetas.length && /estado/i.test(r.lbl || ''), `${et} filtro «Todos»: vuelven todas y el chip dice «Estado»`, r);

  // 5) COBRAR abre la ventana de pago de siempre con ese cliente
  const primero = deben[0];
  if (primero) {
    await page.click(`#tbCob .nxCobCard .cbBtn.cobrar[onclick*="${primero.id}"]`); await page.waitForTimeout(900);
    const m = await page.evaluate(() => ({ open: !!document.querySelector('#mAbono.open'), cli: (typeof abonoCliId !== 'undefined' ? abonoCliId : null) }));
    ok(m.open && String(m.cli) === String(primero.id), `${et} COBRAR abre «Registrar pago» con ese cliente`, m);
    await page.evaluate(() => { try { cm('mAbono'); } catch (e) { document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open')); } }); await page.waitForTimeout(400);
  }
  ok(errs.length === 0, `${et} sin errores de página`, errs.slice(0, 3));
  await ctx.close();
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const [w, tema] of [[390, 'glass-oscuro'], [1280, 'glass-oscuro'], [430, 'glass-oscuro'], [390, 'clasico'], [1280, 'clasico'], [390, 'premium']]) {
    try { await recorrido(b, w, tema); } catch (e) { ok(false, `[${w} ${tema}] el recorrido terminó`, String(e && e.message || e).slice(0, 300)); }
  }
  await b.close(); await qa('tema/none');
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
