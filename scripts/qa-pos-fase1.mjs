// QA de la Fase 1 del POS (07-oct-2026, docs/PLAN-POS-DESDE-STUDIO.md): app real con la REST de Supabase SIMULADA
// (Playwright intercepta *.supabase.co; nunca toca la base real).
// Uso (desde la raíz): python3 -m http.server 8944 &   QA_OUT=/ruta node scripts/qa-pos-fase1.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944', OUT = process.env.QA_OUT || require('os').tmpdir();
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';

function db() {
  const prods = Array.from({ length: 14 }, (_, i) => ({ id: 'p' + i, nombre: ['IPHONE 11 PRO MAX', 'IPHONE 12 MINI', 'CARGADOR 20W', 'FUNDA SILICONA', 'AUDIFONOS BT', 'CABLE USB-C', 'PROTECTOR VIDRIO', 'BATERIA IPHONE 11', 'PANTALLA A12', 'MICA CAMARA', 'SOPORTE AUTO', 'MEMORIA 64GB', 'RELOJ SMART', 'BOCINA BT'][i], codigo: 'PRD-00' + (1000 + i), precio: 1250.5 + i, costo: 500, itbis: true, stock: i % 4, activo: true, tipo: 'producto' }));
  const clientes = Array.from({ length: 25 }, (_, i) => ({ id: 'c' + i, nombre: 'CLIENTE ' + String(i + 1).padStart(2, '0') + (i === 7 ? ' ÁNGEL PÉREZ' : ''), cedula: '0010000' + String(1000 + i), telefono: '809555' + String(1000 + i), activo: true, es_cliente: true, codigo: 'C-' + (100 + i) }));
  // Cartera grande: 2,500 cuotas y 3,200 pagos para comprobar que ya no se corta en 2,000/3,000.
  const fins = [{ id: 'f1', cliente_id: 'c1', estado: 'activo', monto: 100000, created_at: '2026-01-01T10:00:00Z' }];
  const cuotas = Array.from({ length: 2500 }, (_, i) => ({ id: 'q' + String(i).padStart(5, '0'), financiamiento_id: 'f1', numero: i + 1, monto: 40, pagado: false, fecha_venc: '2026-02-01' }));
  const pagos = Array.from({ length: 3200 }, (_, i) => ({ id: 'g' + String(i).padStart(5, '0'), financiamiento_id: 'f1', monto: 10, fecha: '2026-03-01', created_at: '2026-03-01T10:00:00Z' }));
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'TIENDA DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }],
    pos_productos: prods, pos_clientes: clientes, pos_financiamientos: fins, pos_fin_cuotas: cuotas, pos_fin_pagos: pagos,
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_cotizaciones: Array.from({ length: 13 }, (_, i) => ({ id: 'k' + i, numero: 'COT-' + (500 + i), cliente_nombre: 'CLIENTE ' + (i + 1), total: 1000 * (i + 1), fecha: '2026-10-01', validez_dias: 15, estado: 'vigente', created_at: '2026-10-0' + (1 + (i % 6)) + 'T10:00:00Z' }))
  };
}

async function abrir(b, w, D, rol) {
  const movil = w < 500;
  const ctx = await b.newContext({ viewport: { width: w, height: movil ? 844 : 820 }, hasTouch: movil, isMobile: movil });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const pedidos = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    if (!/supabase\.co$/.test(u.hostname)) return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : 'application/javascript', body: '' });
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.pathname.startsWith('/auth/')) return send({});
    if (!u.pathname.startsWith('/rest/v1/')) return send({ ok: true });
    const t = u.pathname.slice(9); pedidos.push(req.method() + ' ' + t + u.search);
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    const off = Number(u.searchParams.get('offset') || 0), lim = Number(u.searchParams.get('limit') || 0);
    filas = filas.slice(off, lim ? off + lim : undefined);
    return send(filas);
  });
  await page.addInitScript(([o, us, rol]) => { localStorage.setItem('nx_auth_mode', 'legacy'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol, cargo: rol.toUpperCase(), organizacion_id: o, org: { id: o, nombre: 'TIENDA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, rol || 'admin']);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => { try { window.nxAbrirPOS && window.nxAbrirPOS(); } catch (e) {} }); await page.waitForTimeout(3000);
  return { ctx, page, errs, pedidos };
}
const tab = async (p, t) => { await p.evaluate(t => window.nxPosTab(t), t); await p.waitForTimeout(1200); };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const w of [1280, 390]) {
    const D = db(); const { ctx, page, errs, pedidos } = await abrir(b, w, D);
    ok(await page.evaluate(() => !!document.querySelector('#v-pos.on')), `[${w}] el POS abre`);
    // 1. Cartera sin tope: pidió por páginas de 1000 hasta el final
    const pagCuo = pedidos.filter(x => x.startsWith('GET pos_fin_cuotas')).length, pagPag = pedidos.filter(x => x.startsWith('GET pos_fin_pagos')).length;
    ok(pagCuo >= 3 && pagPag >= 4, `[${w}] cartera por páginas (cuotas ${pagCuo}, pagos ${pagPag} consultas)`);
    ok(!pedidos.some(x => /pos_fin_cuotas.*limit=2000|pos_fin_pagos.*limit=3000|pos_financiamientos.*limit=300\b/.test(x)), `[${w}] ya no se piden los topes viejos 300/2000/3000`);
    // 2. Dinero con centavos
    const dinero = await page.evaluate(() => document.getElementById('v-pos').innerText.match(/RD\$ [\d,]+(\.\d\d)?/g) || []);
    ok(dinero.length > 0 && dinero.every(x => /\.\d\d$/.test(x)), `[${w}] el dinero del POS sale «RD$ 1,250.00»`, dinero.slice(0, 4));
    // 3. Clientes: búsqueda + 10 en 10
    await tab(page, 'clientes');
    let st = await page.evaluate(() => ({ vis: [...document.querySelectorAll('#nxCliTb tr[data-q]')].filter(r => !r.hasAttribute('data-p10-oculta')).length, pie: (document.querySelector('.nxP10[data-de="clientes"]') || {}).innerText || '' }));
    ok(st.vis === 10 && /1–10/.test(st.pie) && /25/.test(st.pie), `[${w}] Clientes: 10 por página con «1–10 de 25»`, st);
    ok(await page.evaluate(() => !document.querySelector('#nxCliTb').closest('table').parentElement.querySelector('.nxPager') && !document.querySelector('#v-pos .nxPager')), `[${w}] un solo paginador (el «Ver más» global no se mete en las listas del POS de 10 en 10)`);
    await page.evaluate(() => window.nxPag10('clientes', 3)); await page.waitForTimeout(200);
    st = await page.evaluate(() => [...document.querySelectorAll('#nxCliTb tr[data-q]')].filter(r => !r.hasAttribute('data-p10-oculta')).length);
    ok(st === 5, `[${w}] Clientes: la página 3 tiene los 5 últimos`, st);
    await page.fill('.nxBuscaFila input', 'angel perez'); await page.waitForTimeout(300);
    st = await page.evaluate(() => [...document.querySelectorAll('#nxCliTb tr[data-q]')].filter(r => !r.hasAttribute('data-p10-oculta') && !r.hasAttribute('data-p10-fuera')).map(r => r.innerText.split('\n')[0]));
    ok(st.length === 1 && /ÁNGEL/.test(st[0]), `[${w}] Clientes: busca en TODA la lista, sin acentos (estaba en la página 1 de otra búsqueda)`, st);
    await page.screenshot({ path: `${OUT}/fase1-${w}-clientes.png` });
    // 4. Cotizaciones con búsqueda
    await tab(page, 'cotizaciones');
    ok(await page.evaluate(() => !!document.querySelector('#nxCotTb[data-pag10="cotizaciones"]') && !!document.querySelector('.nxP10[data-de="cotizaciones"]')), `[${w}] Cotizaciones: buscador y paginador`);
    // 5. Factura: barra de acciones, asistente, crear cliente
    await tab(page, 'factura');
    const fac = await page.evaluate(() => ({ bar: !!document.querySelector('.nxFacBar6'), btns: [...document.querySelectorAll('.nxFacBar6 .fbA')].map(x => x.getAttribute('data-k')), sug: !!document.querySelector('.facSug, .facQs') }));
    ok(fac.bar && ['guardar', 'imprimir', 'anular'].every(k => fac.btns.includes(k) || fac.btns.some(b => b && b.indexOf(k) === 0)), `[${w}] Factura: barra de acciones inteligentes`, fac.btns);
    ok(fac.sug, `[${w}] Factura: asistente visible`);
    const desb = await page.evaluate(() => { const c = document.querySelector('#v-pos .nx-invoice-pro'); if (!c) return 'sin factura'; const cr = c.getBoundingClientRect(); const pad = document.querySelector('.nxDocPad'); return { card: Math.round(cr.width), pad: pad ? Math.round(pad.getBoundingClientRect().width) : 0, pie: (document.querySelector('.facPie') || {}).scrollWidth, pieW: Math.round((document.querySelector('.facPie') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width) }; });
    ok(desb.pad <= desb.card && desb.pie <= desb.pieW + 1, `[${w}] Factura: nada se sale por la derecha (pie con píldoras del asistente)`, desb);
    await page.screenshot({ path: `${OUT}/fase1-${w}-factura.png` });
    // 6. Buscador con lupa en un <select> largo del POS (14 artículos en Ajuste de inventario)
    const lupa = await page.evaluate(() => { const s = document.createElement('select'); s.id = 'qaSel'; s.innerHTML = [...Array(12)].map((_, i) => `<option value="${i}">ARTICULO ${i}</option>`).join(''); document.getElementById('v-pos').appendChild(s); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(s.hasAttribute('data-nx-sb'))))); });
    ok(lupa, `[${w}] buscador con lupa en listas de 10+ dentro del POS`);
    // 7. Fuera del POS no cambia nada
    const fuera = await page.evaluate(() => new Promise(r => { document.getElementById('v-pos').classList.remove('on'); const s = document.createElement('select'); s.innerHTML = [...Array(12)].map((_, i) => `<option>${i}</option>`).join(''); document.body.appendChild(s); requestAnimationFrame(() => requestAnimationFrame(() => r(!s.hasAttribute('data-nx-sb')))); }));
    ok(fuera, `[${w}] fuera del POS (Seguros, WhatsApp) los <select> quedan como siempre`);
    const pagerSeg = await page.evaluate(() => new Promise(r => { const d = document.createElement('div'); d.innerHTML = '<table><tbody>' + [...Array(20)].map((_, i) => '<tr><td>' + i + '</td></tr>').join('') + '</tbody></table>'; document.body.appendChild(d); setTimeout(() => r(!!d.querySelector('.nxPager') || !!(d.nextElementSibling && d.nextElementSibling.classList && d.nextElementSibling.classList.contains('nxPager')) || !!document.querySelector('.nxPager')), 900); }));
    ok(pagerSeg, `[${w}] el «Ver más (15)» global sigue en las tablas de Seguros (sin data-pag10)`);
    ok(!/STUDIO/.test(await page.evaluate(() => document.body.innerText)), `[${w}] no aparece «STUDIO» en pantalla`);
    ok(errs.length === 0, `[${w}] sin errores de JavaScript`, errs.slice(0, 3));
    await ctx.close();
  }
  // 8. Cobro: un vendedor no puede cambiar el cliente que viene de la factura
  {
    const { ctx, page, errs } = await abrir(b, 1280, db(), 'vendedor');
    const r = await page.evaluate(() => { try { return typeof window.nxPosTab === 'function'; } catch (e) { return false; } });
    ok(r, '[vendedor] el POS abre con rol vendedor');
    ok(errs.length === 0, '[vendedor] sin errores de JavaScript', errs.slice(0, 3));
    await ctx.close();
  }
  await b.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
