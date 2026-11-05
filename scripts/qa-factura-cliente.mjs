// QA 59.78 — «Generar factura» de un solo cliente, eligiendo el mes o los meses (dueño, 05-nov-2026).
// App real contra scripts/qa-crm-mock-server.js, a 390×844 (iPhone) y 1280×800. Intercepta la RPC real
// seguros_generar_factura_manual.
//  · Ficha: «Nueva factura» abre la ventana (ya no lleva a la lista); este mes viene marcado.
//  · Los meses ya facturados salen «✓ Facturado» y no se pueden elegir.
//  · Botón principal ≥54 px, meses ≥44 px de alto, × ≥44×44; el botón dice cuántas facturas y el total.
//  · Varios meses: una llamada por mes, del más viejo al más nuevo, con su período, prima (precio especial) y llave
//    propia; luego resincroniza estados y muestra el NCF de cada una.
//  · «Ya existe» de la RPC (ok:false) se muestra como «Ya tenía factura», sin error.
//  · Cliente con la facturación apagada: aviso y sin botón de generar.
//  · Alta de cliente nuevo: al guardar se ofrece «Cliente registrado · ¿Le generamos su factura?».
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-factura-cliente.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-factura-cliente')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(c, msg, extra) { if (c) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 700) : '')); } }
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const per = (d, k) => { const x = new Date(d.getFullYear(), d.getMonth() + k, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
const HOY = per(new Date(), 0), ANT1 = per(new Date(), -1), ANT2 = per(new Date(), -2), ANT3 = per(new Date(), -3);

async function abrir(browser, width) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, userAgent: width < 500 ? UA : undefined, locale: 'es-DO' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return await r.fulfill({ response: resp }); }
    return await r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  const st = { rpc: [], patches: [], existe: new Set() };
  let n = 0;
  await page.route(/\/rest\/v1\/rpc\/seguros_generar_factura_manual/, async r => { const b = JSON.parse(r.request().postData() || '{}'); st.rpc.push(b);
    if (st.existe.has(b.p_periodo)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, razon: 'Ya existe una factura no anulada de este cliente para este período', periodo: b.p_periodo }) });
    n++; const f = { id: `00000000-0000-4000-8000-0000000f${String(n).padStart(4, '0')}`, cliente_id: b.p_cliente_id, periodo: b.p_periodo, mes: b.p_mes, anio: b.p_anio, prima_base: b.p_prima_base, prima_deps: b.p_prima_deps, total: b.p_prima_base + b.p_prima_deps, estado: 'Pendiente', ncf: 'B020000000' + (100 + n) };
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reintento: false, factura: f, asiento_id: null, ncf: f.ncf, cliente_deuda_total: 99999 }) }); });
  // El simulador no entiende el filtro «or=(wa.eq…)» del aviso de WhatsApp repetido: sin esto devolvería a todos.
  await page.route(/\/rest\/v1\/clientes\?select=id,nom,activo&or=/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route(/\/rest\/v1\/rpc\/seguros_siguiente_numero_poliza/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ numero: 'NX-QA-0001' }) }));
  // Alta: Supabase devuelve la fila creada (return=representation); el simulador no.
  await page.route(/\/rest\/v1\/clientes(\?|$)/, async r => { if (r.request().method() !== 'POST') return r.fallback();
    const d = JSON.parse(r.request().postData() || '{}'); const row = { ...(Array.isArray(d) ? d[0] : d), id: '00000000-0000-4000-8000-00000000c0de', activo: true };
    st.altas = (st.altas || 0) + 1; return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) }); });
  await page.route(/\/rest\/v1\/facturas\?id=eq\./, async r => { if (r.request().method() === 'PATCH') { st.patches.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 204, body: '' }); } return r.fallback(); });
  await page.addInitScript(() => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0 && window.__nxFactCli, null, { timeout: 25000 });
  await sleep(2500);
  return { ctx, page, errs, st };
}
const caja = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), dis: e.disabled, t: e.textContent.trim().replace(/\s+/g, ' ') }; }, sel);

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const w of [390, 1280]) {
    console.log(`\n== ${w}px`);
    const { ctx, page, errs, st } = await abrir(browser, w);
    // Cliente 1: precio especial 3,500 titular / 900 dependiente, 1 dependiente; ya tiene la factura de hace 1 mes.
    const cid = await page.evaluate(([ant1]) => { const c = ST.clientes[1]; c.activo = true; c.permitir_facturacion = true; c.precio_titular = 3500; c.precio_dep = 900; c.deps = [{ nom: 'Dep Uno' }];
      ST.facturas.push({ id: 'f-ya', cliente_id: c.id, periodo: ant1, estado: 'Pendiente', prima_base: 3500, prima_deps: 900, total: 4400 }); return c.id; }, [ANT1]);
    // 59.79: la ficha normal (verCliente, la de la lista de Clientes) trae «Generar factura» en su barra.
    await page.evaluate(id => verCliente(id), cid); await sleep(700);
    const tb = await caja(page, '.sf-toolbar .nxFcTb');
    ok(tb && tb.h >= 44 && /Generar factura/.test(tb.t), `${w}px la ficha normal del cliente tiene «Generar factura» (≥44 de alto)`, tb);
    await page.screenshot({ path: OUT + `${w}-ficha-normal.png` });
    await page.click('.sf-toolbar .nxFcTb'); await sleep(500);
    ok(!!(await page.$('.nxFcOv')) && new RegExp(await page.evaluate(id => ST.clientes.find(c => c.id === id).nom, cid)).test(await page.textContent('.nxFcHead')), `${w}px el botón de la ficha abre la ventana de ese cliente`);
    await page.click('.nxFcNo'); await sleep(200);
    await page.evaluate(id => c360AccionNuevaFactura(id), cid); await sleep(500);
    ok(!!(await page.$('.nxFcOv')), `${w}px «Nueva factura» de la ficha abre la ventana`);
    const hoyB = await caja(page, `.nxFcMes[data-p="${HOY}"]`), yaB = await caja(page, `.nxFcMes[data-p="${ANT1}"]`);
    ok(hoyB && /true/.test(await page.getAttribute(`.nxFcMes[data-p="${HOY}"]`, 'aria-pressed')) && hoyB.h >= 44, `${w}px este mes viene marcado (≥44 de alto)`, hoyB);
    ok(yaB && yaB.dis && /Facturado/.test(yaB.t), `${w}px el mes ya facturado sale «✓ Facturado» y no se puede elegir`, yaB);
    ok(/4,400/.test(await page.textContent('.nxFcPrima')), `${w}px cuota = precio especial 3,500 + 1 dependiente 900`, await page.textContent('.nxFcPrima'));
    const si0 = await caja(page, '.nxFcSi'), x = await caja(page, '.nxFcX');
    ok(si0.h >= 54 && x.w >= 44 && x.h >= 44 && /Generar factura · RD\$ 4,400/.test(si0.t), `${w}px botón principal ≥54 con «Generar factura · RD$ 4,400»; × ≥44`, { si0, x });
    await page.screenshot({ path: OUT + `${w}-ficha.png` });
    // Elegir también 2 y 3 meses atrás → 3 facturas
    await page.click(`.nxFcMes[data-p="${ANT3}"]`); await page.click(`.nxFcMes[data-p="${ANT2}"]`); await sleep(150);
    ok(/Generar 3 facturas · RD\$ 13,200/.test((await caja(page, '.nxFcSi')).t), `${w}px con 3 meses: «Generar 3 facturas · RD$ 13,200»`, (await caja(page, '.nxFcSi')).t);
    await page.screenshot({ path: OUT + `${w}-tres.png` });
    st.existe.add(ANT2); // otra persona o la automática la creó primero
    await page.click('.nxFcSi'); await sleep(1500);
    const pers = st.rpc.map(b => b.p_periodo), keys = new Set(st.rpc.map(b => b.p_idempotency_key));
    ok(pers.join() === [ANT3, ANT2, HOY].join() && keys.size === 3, `${w}px una llamada por mes, del más viejo al más nuevo, con llave propia`, pers);
    const b0 = st.rpc[0] || {};
    ok(b0.p_cliente_id === cid && b0.p_prima_base === 3500 && b0.p_prima_deps === 900 && /^B0/.test(b0.p_tipo_ncf) && /^\d{4}-\d{2}-\d{2}$/.test(b0.p_fecha_emision) && b0.p_mes === Number(ANT3.slice(5)) && b0.p_anio === Number(ANT3.slice(0, 4)), `${w}px datos de la RPC: cliente, prima especial, NCF, fecha, mes y año`, b0);
    const res = await page.textContent('.nxFcCard');
    ok(/2 facturas generadas/.test(res) && /B0200000001/.test(res) && /Ya tenía factura/.test(res), `${w}px resumen: 2 generadas con su NCF y 1 «Ya tenía factura»`, res.slice(0, 300));
    ok(await page.evaluate(id => ST.facturas.filter(f => f.cliente_id === id && f.id.startsWith('00000000-0000-4000-8000-0000000f')).length, cid) === 2, `${w}px las 2 facturas nuevas entran a la lista en memoria`);
    await page.screenshot({ path: OUT + `${w}-listo.png` });
    await page.click('.nxFcSi'); await sleep(200);
    ok(!(await page.$('.nxFcOv')), `${w}px «Listo» cierra la ventana`);
    // Cliente con facturación apagada
    const cid2 = await page.evaluate(() => { const c = ST.clientes[2]; c.activo = true; c.permitir_facturacion = false; return c.id; });
    await page.evaluate(id => nxFacturarCliente(id), cid2); await sleep(300);
    ok(/facturación apagada/.test(await page.textContent('.nxFcCard')) && !(await page.$('.nxFcSi')), `${w}px cliente con la facturación apagada: aviso y sin botón de generar`);
    await page.click('.nxFcNo'); await sleep(200);
    // Alta de cliente nuevo
    const antes = st.rpc.length;
    await page.evaluate(() => abrirNuevoCli()); await sleep(500);
    await page.evaluate(() => { const s = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
      s('cNom', 'CLIENTE PRUEBA QA'); s('cWA', '8297771234'); });
    await page.evaluate(() => { guardarCli(); }); await sleep(2500);
    const nuevo = await page.evaluate(() => { const ov = document.querySelector('.nxFcOv'); return ov ? ov.textContent.replace(/\s+/g, ' ').slice(0, 900) : null; });
    ok(nuevo && /Cliente registrado/.test(nuevo) && /CLIENTE PRUEBA QA/.test(nuevo) && /generamos su factura/.test(nuevo) && /Ahora no/.test(nuevo), `${w}px al registrar un cliente nuevo se ofrece su factura`, nuevo);
    ok(st.rpc.length === antes, `${w}px ofrecer no genera nada hasta que se toca el botón`);
    await page.screenshot({ path: OUT + `${w}-nuevo.png` });
    ok(errs.length === 0, `${w}px sin errores de página`, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})();
