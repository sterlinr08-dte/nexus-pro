// QA (Boutique Aura, 16-nov-2026): número de asiento leído del servidor (no repite AS-00001), compra de contado sale de la caja,
// inventario inicial asentado a costo (1104/3101), resumen contable con el monto del documento y categoría nueva desde la ficha.
// Supabase SIMULADA (nunca toca la base real). Comprueba: RNC/cédula válidos, marca «Oportunidad», borrador sin envío
// (ningún POST a funciones de WhatsApp ni escritura en la base), CSV, toques de 44 px, 0 errores de JS, 390 y 1280 px.
// Uso (desde la raíz): python3 -m http.server 8944 &   NODE_PATH=/opt/node22/lib/node_modules node scripts/qa-pos-empresas.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';
const hace = d => new Date(Date.now() - d * 86400000).toISOString();

function db() {
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'TIENDA DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [Object.assign({ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }, globalThis.__CFG || {})],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_productos: [{ id: 'p1', nombre: 'Agua purificada', precio: 25, costo: 14, stock: 50, itbis: true, activo: true, tipo: 'producto' }, { id: 'p2', nombre: 'Arroz selecto', precio: 185, costo: 150, stock: 50, itbis: false, activo: true, tipo: 'producto' }],
    pos_clientes: [
      { id: 'c1', nombre: 'Juan Pérez', cedula: '', telefono: '8095550000', activo: true, es_cliente: true },
      { id: 'c2', nombre: 'EMPRESA SRL', cedula: '1-31-88065-7', telefono: '809-555-1234', tipo_persona: 'juridica', activo: true, es_cliente: true },
      { id: 'c3', nombre: 'Constructora Abc', cedula: '001-1234567-8', telefono: '8295557777', activo: true, es_cliente: true },
      { id: 'c4', nombre: 'Ferretería Norte', cedula: '101234567', telefono: '8495551111', activo: true, es_cliente: true },
      { id: 'c5', nombre: 'Rnc Malo', cedula: '12345', telefono: '8095552222', activo: true, es_cliente: true },
      { id: 'c6', nombre: 'Ana Gómez', cedula: '40212345678', telefono: '', activo: true, es_cliente: true }
    ],
    pos_ncf_secuencias: [{ id: 's1', tipo: 'B02', prefijo: 'B02', desde: 1, hasta: 100, actual: 5, activo: true }],
    pos_ventas: globalThis.__VENTAS_HOY || [
      { id: 'v1', cliente_id: 'c2', total: 11800, created_at: hace(5), fecha: hace(5), ncf: 'B0200000001', tipo_comprobante: 'consumo', estado: 'completada' },
      { id: 'v2', cliente_id: 'c2', total: 5900, created_at: hace(30), fecha: hace(30), ncf: '', tipo_comprobante: 'sin', estado: 'completada' },
      { id: 'v3', cliente_id: 'c3', total: 23600, created_at: hace(10), fecha: hace(10), ncf: 'B0100000003', tipo_comprobante: 'credito_fiscal', estado: 'completada' },
      { id: 'v4', cliente_id: 'c3', total: 99999, created_at: hace(12), fecha: hace(12), ncf: 'B0200000009', tipo_comprobante: 'consumo', estado: 'anulada' },
      { id: 'v5', cliente_id: 'c4', total: 4720, created_at: hace(100), fecha: hace(100), ncf: 'E310000000001', tipo_comprobante: 'ecf31', estado: 'completada' }
    ],
    pos_cajas: [{ id: 'cj2', estado: 'abierta', apertura: new Date().toISOString(), monto_inicial: 0 }],
    pos_caja_movimientos: [],
    pos_venta_items: [{ id: 'vi1', venta_id: 'h1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 3, precio: 25, importe: 75, itbis: true }, { id: 'vi2', venta_id: 'h1', producto_id: 'p2', nombre: 'Arroz selecto', cantidad: 1, precio: 135, importe: 135, itbis: false }],
    pos_devoluciones: globalThis.__DEVS || [],
    pos_devolucion_items: [{ id: 'di1', devolucion_id: 'd1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 1, precio: 25, importe: 25, itbis: true }],
    pos_cuentas: [['1101', 'Caja', 'activo'], ['1103', 'CxC', 'activo'], ['1104', 'Inventario', 'activo'], ['2102', 'ITBIS por pagar', 'pasivo'], ['2105', 'Notas de crédito por aplicar', 'pasivo'], ['4101', 'Ventas', 'ingreso'], ['5101', 'Costo', 'costo'], ['3101', 'Capital', 'capital'], ['4102', 'Otros ingresos', 'ingreso'], ['6104', 'Gastos varios', 'gasto']].map(([c, n, t]) => ({ id: 'cta' + c, codigo: c, nombre: n, tipo: t, activo: true })),
    pos_garantias: [], pos_compras: [], pos_compra_pagos: [], pos_categorias: [],
    pos_secuencias: [{ id: 'sqA', tipo: 'asiento', prefijo: 'AS-', longitud: 5, proximo: 1, activo: true }]
  };
}

async function abrir(b, ancho, off) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 860 }, acceptDownloads: true });
  try { await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }); } catch (e) {}
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const pedidos = []; const externos = []; const D = db();
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    externos.push({ m: req.method(), h: u.hostname, p: u.pathname });
    if (!/supabase\.co$/.test(u.hostname)) return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : (/wa\.me/.test(u.hostname) ? 'text/html' : 'application/javascript'), body: '' });
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    const body = req.postData() ? (() => { try { return JSON.parse(req.postData()); } catch (e) { return req.postData(); } })() : null;
    if (u.pathname.startsWith('/functions/')) { pedidos.push({ m: req.method(), t: u.pathname, body }); return send({ ok: true }); }
    if (u.pathname.startsWith('/auth/')) return send({});
    if (!u.pathname.startsWith('/rest/v1/')) return send({ ok: true });
    const t = u.pathname.slice(9);
    pedidos.push({ m: req.method(), t, q: u.search, body });
    if (t === 'rpc/pos_abrir_mi_caja') { D.pos_cajas = [{ id: 'cjN', estado: 'abierta', apertura: new Date().toISOString(), monto_inicial: Number((body || {}).p_monto_inicial || 0) }]; return send(D.pos_cajas[0]); }
    if (t === 'rpc/pos_registrar_compra_atomica') return send({ ok: true, compra: { id: 'cmp1', numero: 10, fecha: new Date().toLocaleDateString('en-CA') }, total_desembarcado: (body.p_compra || {}).subtotal });
    if (t === 'rpc/pos_mover_stock_atomico') return send({ ok: true, stock_nuevo: Number(body.p_delta || 0), stock_almacen_nuevo: Number(body.p_delta || 0) });
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() === 'POST') { const arr = (Array.isArray(body) ? body : [body]).map((x, i) => Object.assign({ id: t + '_n' + (D[t] ? D[t].length : 0) + '_' + i, created_at: new Date().toISOString() }, x)); D[t] = (D[t] || []).concat(arr); return send(arr); }
    if (req.method() === 'PATCH' && t === 'pos_secuencias') { const id = u.searchParams.get('id').slice(3); const pr = u.searchParams.get('proximo'); const row = D.pos_secuencias.find(x => x.id === id); if (!row || (pr && String(row.proximo) !== pr.slice(3))) return send([]); Object.assign(row, body); return send([row]); }
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; if (v === 'not.is.null') { filas = filas.filter(x => x[k] != null); continue; } const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    const off0 = Number(u.searchParams.get('offset') || 0);
    return send(filas.slice(off0, off0 + 1000));
  });
  await page.addInitScript(([o, us, apag]) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (apag) localStorage.setItem('nx_pos_empresas_off', '1'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'TIENDA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, !!off]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  await page.evaluate(() => window.nxPosTab('inicio')); await page.waitForTimeout(1200);
  return { ctx, page, errs, pedidos, externos, D };
}






const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    globalThis.__VENTAS_HOY = []; globalThis.__DEVS = [];
    const s = await abrir(b, w); const page = s.page; await page.waitForTimeout(1200);
    // 1) El servidor ya usó AS-00001 (la compra v2 numera allá): el siguiente asiento del navegador debe ser AS-00002
    s.D.pos_secuencias[0].proximo = 2;
    // Artículo nuevo con 15 unidades a costo 250 → asiento de inventario inicial RD$ 3,750 (1104 / 3101)
    await page.evaluate(() => window.nxPosNuevoProd()); await page.waitForTimeout(900);
    const hayNueva = await page.evaluate(() => !!document.querySelector('#ppCat option[value="__nueva__"]'));
    ok(hayNueva, `${w}px: la ficha del artículo ofrece «+ Nueva categoría…»`);
    page.once('dialog', d => d.accept('Blusas'));
    await page.evaluate(() => { const sl = document.getElementById('ppCat'); sl.value = '__nueva__'; sl.dispatchEvent(new Event('change')); }); await page.waitForTimeout(700);
    const catSel = await page.evaluate(() => { const sl = document.getElementById('ppCat'); return sl.options[sl.selectedIndex].textContent; });
    ok(catSel === 'Blusas' && s.pedidos.some(p => p.t === 'pos_categorias' && p.m === 'POST'), `${w}px: la categoría «Blusas» se crea y queda elegida`, catSel);
    await page.evaluate(() => { const f = (id, v) => { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input')); } }; f('ppNom', 'Blusa lino'); f('ppPre', '450'); f('ppCos', '250'); f('ppStk', '15'); });
    const n0 = s.pedidos.length;
    await page.evaluate(() => window.nxPosGuardarProd(null)); await page.waitForTimeout(3000);
    const nuevos = s.pedidos.slice(n0);
    const cab = nuevos.find(p => p.t === 'pos_asientos' && p.m === 'POST');
    const lin = nuevos.filter(p => p.t === 'pos_asiento_lineas' && p.m === 'POST').flatMap(p => Array.isArray(p.body) ? p.body : [p.body]);
    ok(cab && cab.body.numero === 'AS-00002', `${w}px: el asiento toma el número REAL del servidor (AS-00002, no repite AS-00001)`, cab && cab.body.numero);
    ok(lin.some(l => l.cuenta_codigo === '1104' && Number(l.debito) === 3750) && lin.some(l => l.cuenta_codigo === '3101' && Number(l.credito) === 3750), `${w}px: inventario inicial 15 × 250 = RD$ 3,750 a Inventario / Capital`, lin);
    // 2) Compra de contado con la caja abierta → salida de caja
    await page.evaluate(() => window.nxPosTab('compras')); await page.waitForTimeout(900);
    await page.evaluate(() => window.nxPosNuevaCompra()); await page.waitForTimeout(900);
    await page.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; }; set('compArt', 'p1'); set('compCant', '5'); set('compCosto', '250'); });
    await page.evaluate(() => window.nxPosCompraAddItem()); await page.waitForTimeout(400);
    const n1 = s.pedidos.length;
    await page.evaluate(() => window.nxPosGuardarCompra(false)); await page.waitForTimeout(1800);
    const mov = s.pedidos.slice(n1).find(p => p.t === 'pos_caja_movimientos' && p.m === 'POST');
    ok(mov && mov.body.tipo === 'salida' && Number(mov.body.monto) === 1250 && /Compra No\. 10/.test(mov.body.concepto), `${w}px: compra de contado RD$ 1,250 sale de la caja abierta`, mov && mov.body);
    // 3) Resumen contable: monto del documento, no Debe+costo
    s.D.pos_asientos = [{ id: 'asv', numero: 'AS-00003', fecha: new Date().toLocaleDateString('en-CA'), concepto: 'Venta CO00000001', tipo: 'venta', created_at: new Date().toISOString() }];
    s.D.pos_asiento_lineas = [['1101', 1650, 0], ['4101', 0, 1398.31], ['2102', 0, 251.69], ['5101', 950, 0], ['1104', 0, 950]].map(([c, d, h], i) => ({ id: 'l' + i, asiento_id: 'asv', cuenta_id: 'cta' + c, cuenta_codigo: c, debito: d, credito: h }));
    await page.evaluate(() => window.nxPosTab('contabilidad')); await page.waitForTimeout(2000);
    const mv = await page.evaluate(() => [...document.querySelectorAll('.ctamov')].map(x => x.innerText.replace(/\s+/g, ' ')));
    ok(mv.some(x => /1,650/.test(x)) && !mv.some(x => /2,600/.test(x)), `${w}px: el Resumen contable dice RD$ 1,650 (la factura), no RD$ 2,600`, mv);
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
