// QA (16-nov-2026): Reportes sin tope de 2,000 ventas (carga por rango, por páginas, con sus renglones),
// número de versión en el menú y botones del pie de la ficha a 48 px. 390 y 1280 px.
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
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }, { id: 'a2', nombre: 'Sucursal Norte', es_principal: false, activo: true }],
    pos_stock_almacen: [{ id: 'sa1', producto_id: 'p1', almacen_id: 'a1', stock: 8 }, { id: 'sa2', producto_id: 'p1', almacen_id: 'a2', stock: 2 }, { id: 'sa3', producto_id: 'p3', almacen_id: 'a1', stock: 20 }],
    pos_pedidos_almacen: [], pos_pedido_almacen_items: [], pos_ordenes_compra: [], pos_orden_compra_items: [], pos_proveedores: [{ id: 'pv1', nombre: 'Distribuidora Uno', rnc: '101000001', telefono: '8095550101', activo: true }, { id: 'pv2', nombre: 'Suplidora Dos', activo: true }], pos_transferencias: [], pos_transferencia_items: [],
    pos_inv_movimientos: [],
    pos_precio_historial: globalThis.__HIST || [], pos_activos_fijos: globalThis.__ACT || [],
    pos_compras: [{ id: 'c1', numero: 10, fecha: globalThis.__HOY, proveedor_nombre: 'Distribuidora Uno', ncf: 'B0100000009', subtotal: 1000, itbis: 180, total: 1180, a_credito: true, estado: 'recibida' }, { id: 'c2', numero: 11, fecha: globalThis.__HOY, proveedor_nombre: 'Suplidora Dos', subtotal: 500, itbis: 0, total: 500, a_credito: false, estado: 'recibida' }, { id: 'c3', numero: 12, fecha: globalThis.__HOY, proveedor_nombre: 'Anulada SRL', subtotal: 9, itbis: 0, total: 9, estado: 'anulada' }],
    pos_compra_items: [{ id: 'ci1', compra_id: 'c1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 50, costo: 20, importe: 1000 }, { id: 'ci2', compra_id: 'c2', producto_id: 'p3', nombre: 'Arroz selecto', cantidad: 5, costo: 100, importe: 500 }],
    pos_transferencias: [{ id: 't1', numero: 'TR-00001', created_at: new Date().toISOString(), origen_nombre: 'Principal', destino_nombre: 'Sucursal' }, { id: 't2', numero: 'TR-00002', created_at: new Date().toISOString(), origen_nombre: 'Principal', destino_nombre: 'Sucursal' }],
    pos_transferencia_items: [{ id: 'ti1', transferencia_id: 't1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 12 }, { id: 'ti2', transferencia_id: 't2', producto_id: 'p3', nombre: 'Arroz selecto', cantidad: 3 }],
    pos_seriales: [{ id: 's1', producto_id: 'p2', serial: '356000000000001', estado: 'disponible', color: 'Negro', created_at: new Date().toISOString() }, { id: 's2', producto_id: 'p2', serial: '356000000000002', estado: 'disponible', created_at: new Date().toISOString() }],
    pos_productos: globalThis.__PRODS || [{ id: 'p1', nombre: 'Agua purificada', precio: 25, costo: 14, stock: 50, itbis: true, activo: true, tipo: 'producto' }, { id: 'p2', nombre: 'Arroz selecto', precio: 185, costo: 150, stock: 50, itbis: false, activo: true, tipo: 'producto' }],
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
    pos_venta_items: [{ id: 'vi1', venta_id: 'h1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 4, precio: 29.5, importe: 118, itbis: true, costo_unitario: 10 }, { id: 'vi2', venta_id: 'h2', producto_id: 'p3', nombre: 'Arroz selecto', cantidad: 2, precio: 200, importe: 400, itbis: false }],
    pos_devoluciones: globalThis.__DEVS || [],
    pos_devolucion_items: [{ id: 'di1', devolucion_id: 'd1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 1, precio: 25, importe: 25, itbis: true }],
    pos_cuentas: [['1101', 'Caja', 'activo'], ['1103', 'CxC', 'activo'], ['1104', 'Inventario', 'activo'], ['2102', 'ITBIS por pagar', 'pasivo'], ['2105', 'Notas de crédito por aplicar', 'pasivo'], ['4101', 'Ventas', 'ingreso'], ['5101', 'Costo', 'costo'], ['1102', 'Banco', 'activo'], ['2101', 'CxP', 'pasivo'], ['3101', 'Capital', 'capital'], ['4102', 'Otros ingresos', 'ingreso'], ['6104', 'Gastos varios', 'gasto']].map(([c, n, t]) => ({ id: 'cta' + c, codigo: c, nombre: n, tipo: t, activo: true })),
    pos_garantias: [], pos_compra_pagos: [], pos_categorias: [{ id: 'k1', nombre: 'Bebidas', orden: 1 }, { id: 'k2', nombre: 'Alimentos', orden: 2 }],
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
    if (t === 'rpc/pos_orden_compra_crear') { const n = D.pos_ordenes_compra.length + 1; const pv = D.pos_proveedores.find(x => x.id === body.p_proveedor); let tot = 0; const o = { id: 'oc' + n, numero: 'OC-0000' + n, proveedor_id: body.p_proveedor, proveedor_nombre: pv ? pv.nombre : null, fecha_esperada: body.p_fecha_esperada, notas: body.p_notas, estado: 'abierta', created_at: new Date().toISOString() }; body.p_items.forEach((it, i) => { tot += it.cantidad * it.costo; D.pos_orden_compra_items.push({ id: o.id + 'i' + i, orden_id: o.id, producto_id: it.producto_id, nombre: (D.pos_productos.find(x => x.id === it.producto_id) || {}).nombre, cantidad: it.cantidad, costo: it.costo, recibido: 0 }); }); o.total_estimado = tot; D.pos_ordenes_compra.unshift(o); return send({ ok: true, id: o.id, numero: o.numero, items: body.p_items.length, total: tot }); }
    if (t === 'rpc/pos_orden_compra_recibir') { const o = D.pos_ordenes_compra.find(x => x.id === body.p_orden); if (!['abierta', 'parcial'].includes(o.estado)) return send({ message: 'ORDEN_NO_ABIERTA' }, 400); const ci = globalThis.__ULT_COMPRA || []; ci.forEach(c => { const it = D.pos_orden_compra_items.find(i => i.orden_id === o.id && i.producto_id === c.producto_id); if (it) it.recibido += Number(c.cantidad); }); const its = D.pos_orden_compra_items.filter(i => i.orden_id === o.id); const falta = its.reduce((a, i) => a + Math.max(0, i.cantidad - i.recibido), 0); o.estado = falta > 0 ? 'parcial' : 'recibida'; return send({ ok: true, estado: o.estado, falta }); }
    if (t === 'rpc/pos_orden_compra_cerrar') { const o = D.pos_ordenes_compra.find(x => x.id === body.p_orden); if (body.p_estado === 'anulada' && o.estado === 'parcial') return send({ message: 'YA_RECIBIO_ALGO' }, 400); o.estado = body.p_estado; o.motivo = body.p_motivo; return send({ ok: true, estado: o.estado }); }
    if (t === 'rpc/pos_registrar_compra_atomica') { globalThis.__ULT_COMPRA = (body.p_items || []); return send({ ok: true, compra: { id: 'cmp1', numero: 10, fecha: new Date().toLocaleDateString('en-CA') }, total_desembarcado: (body.p_compra || {}).subtotal }); }
    if (t === 'rpc/pos_mover_stock_atomico') return send({ ok: true, stock_nuevo: Number(body.p_delta || 0), stock_almacen_nuevo: Number(body.p_delta || 0) });
    if (t === 'rpc/pos_agregar_costo') { const pr = D.pos_productos.find(x => x.id === body.p_producto); const nuevo = Math.round((pr.costo + body.p_monto / pr.stock) * 100) / 100; const fila = { id: 'ca1', producto_id: pr.id, producto_nombre: pr.nombre, producto_codigo: pr.codigo, monto: body.p_monto, unidades: pr.stock, costo_anterior: pr.costo, costo_nuevo: nuevo, motivo: body.p_motivo, metodo: body.p_metodo, created_by_name: 'Esterlin', fecha: new Date().toISOString() }; D.pos_costos_agregados = [fila]; return send({ ok: true, id: 'ca1', costo_anterior: pr.costo, costo_nuevo: nuevo, unidades: pr.stock, monto: body.p_monto }); }
    if (t === 'rpc/pos_pedido_almacen_crear') { const n = D.pos_pedidos_almacen.length + 1; const ped = { id: 'ped' + n, numero: 'PA-0000' + n, pide_id: body.p_pide, surte_id: body.p_surte, estado: 'pendiente', notas: body.p_notas, created_by_name: 'Esterlin', created_at: new Date().toISOString() }; D.pos_pedidos_almacen.unshift(ped); body.p_items.forEach((it, i) => D.pos_pedido_almacen_items.push({ id: ped.id + 'i' + i, pedido_id: ped.id, producto_id: it.producto_id, nombre: (D.pos_productos.find(x => x.id === it.producto_id) || {}).nombre, cantidad: it.cantidad, despachado: 0 })); return send({ ok: true, id: ped.id, numero: ped.numero, items: body.p_items.length }); }
    if (t === 'rpc/pos_transferir_stock') { const tr = { id: 'tr1', numero: 'TR-00001', origen_id: body.p_origen_id, destino_id: body.p_destino_id, created_at: new Date().toISOString() }; D.pos_transferencias.push(tr); body.p_lineas.forEach((x, i) => D.pos_transferencia_items.push({ id: 'ti' + i, transferencia_id: 'tr1', producto_id: x.producto_id, cantidad: x.cantidad })); return send({ id: 'tr1', numero: 'TR-00001', lineas: body.p_lineas.length }); }
    if (t === 'rpc/pos_pedido_almacen_atender') { const ped = D.pos_pedidos_almacen.find(x => x.id === body.p_pedido); if (ped.estado !== 'pendiente') return send({ message: 'PEDIDO_YA_ATENDIDO' }, 400); ped.estado = body.p_estado; ped.atendido_por = 'Esterlin'; if (body.p_estado === 'despachado') { ped.transferencia_id = body.p_transferencia; ped.transferencia_numero = 'TR-00001'; D.pos_pedido_almacen_items.filter(i => i.pedido_id === ped.id).forEach(i => { i.despachado = D.pos_transferencia_items.filter(x => x.producto_id === i.producto_id).reduce((a, x) => a + x.cantidad, 0); }); } else ped.motivo = body.p_motivo; return send({ ok: true, estado: body.p_estado }); }
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() === 'POST') { const arr = (Array.isArray(body) ? body : [body]).map((x, i) => Object.assign({ id: t + '_n' + (D[t] ? D[t].length : 0) + '_' + i, created_at: new Date().toISOString() }, x)); D[t] = (D[t] || []).concat(arr); return send(arr); }
    if (req.method() === 'PATCH' && t === 'pos_secuencias') { const id = u.searchParams.get('id').slice(3); const pr = u.searchParams.get('proximo'); const row = D.pos_secuencias.find(x => x.id === id); if (!row || (pr && String(row.proximo) !== pr.slice(3))) return send([]); Object.assign(row, body); return send([row]); }
    if (req.method() === 'PATCH' && t === 'pos_activos_fijos') { const id = u.searchParams.get('id').slice(3); const row = (D[t] || []).find(x => x.id === id); if (row) Object.assign(row, body); return send(row ? [row] : []); }
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
    globalThis.__HOY = new Date().toLocaleDateString('en-CA'); globalThis.__DEVS = []; globalThis.__HIST = []; globalThis.__ACT = [];
    globalThis.__PRODS = [{ id: 'p1', nombre: 'Agua purificada', codigo: 'A-01', categoria_id: 'k1', precio: 30, costo: 15, stock: 10, itbis: false, activo: true, tipo: 'producto' }];
    const ahora = new Date().toISOString();
    globalThis.__VENTAS_HOY = Array.from({ length: 2500 }, (_, i) => ({ id: 'vv' + i, numero: i + 1, total: i === 0 ? 50 : 100, subtotal: 100, itbis: 0, created_at: ahora, fecha: ahora, estado: 'completada', tipo_comprobante: 'sin' }));
    const s = await abrir(b, w); const page = s.page;
    s.D.pos_venta_items = globalThis.__VENTAS_HOY.map((v, i) => ({ id: 'vi' + i, venta_id: v.id, producto_id: 'p1', nombre: 'Agua purificada', cantidad: 1, precio: 100, importe: 100, itbis: false, costo_unitario: 15 }));
    await page.waitForTimeout(800);
    // versión en el menú
    const ver = await page.evaluate(() => { const e = document.querySelector('.nxTVer'); return e ? e.textContent : null; });
    ok(ver && /Versión \d{4}/i.test(ver), `${w}px: el menú muestra el número de versión`, ver);
    if (OUT && w === 1280) { await page.evaluate(() => { const e = document.querySelector(".nxTFoot"); if (e) e.scrollIntoView(); }); await page.locator(".nxTSide").screenshot({ path: `${OUT}/version-menu-${w}.png` }); }
    s.pedidos.length = 0;
    await page.evaluate(() => window.nxPosTab('reportes')); await page.waitForTimeout(6000);
    const vq = s.pedidos.filter(p => p.t === 'pos_ventas' && /pos_venta_items/.test(decodeURIComponent(p.q || '')));
    ok(vq.length >= 3 && vq.every(p => !/limit=2000/.test(p.q)) && vq.some(p => /offset=2000/.test(p.q)), `${w}px: Reportes trae las ventas por páginas de 1,000 (sin tope de 2,000)`, vq.map(p => p.q.slice(0, 60)));
    const q0 = decodeURIComponent(vq[0].q);
    ok(/fecha\.gte\./.test(q0) && /fecha\.is\.null,created_at\.gte\./.test(q0), `${w}px: pide solo el rango de fechas (por fecha y, si falta, por creación)`, q0.slice(0, 220));
    const tp = await page.evaluate(() => document.getElementById('v-pos').innerText.replace(/\s+/g, ' '));
    ok(/Ticket promedio RD\$ ?99\.98/i.test(tp), `${w}px: el ticket promedio lleva centavos (249,950 / 2,500 = 99.98)`, (tp.match(/Ticket promedio.{0,30}/i) || [''])[0]);
    await page.evaluate(() => window.nxRepInvAbrir()); await page.waitForTimeout(800);
    await page.evaluate(() => window.nxRepInvSet('grupo', 'ven')); await page.waitForTimeout(2500);
    const t = await page.evaluate(() => document.getElementById('riCuerpo').innerText.replace(/\s+/g, ' '));
    ok(/2,500/.test(t) && /249,950/.test(t), `${w}px: el reporte de Ventas cuenta las 2,500 ventas (RD$249,950), no 2,000`, t.slice(0, 260));
    // cambiar a un rango ya cargado no vuelve a pedir; uno más viejo sí
    s.pedidos.length = 0;
    await page.evaluate(() => { window.nxRepInvCerrar(); }); await page.waitForTimeout(800);
    await page.evaluate(() => window.nxRepRango('d', '2025-01-01')); await page.waitForTimeout(5000);
    const vq2 = s.pedidos.filter(p => p.t === 'pos_ventas' && /pos_venta_items/.test(decodeURIComponent(p.q || '')));
    ok(vq2.length >= 1 && /2025-01-0/.test(decodeURIComponent(vq2[0].q)) || /2024-12-31/.test(decodeURIComponent(vq2[0] ? vq2[0].q : '')), `${w}px: elegir una fecha más vieja vuelve a cargar desde esa fecha`, vq2.map(p => decodeURIComponent(p.q).slice(0, 120)));
    // Muse: teclear el año («0002») no debe recargar ni cambiar la fecha; el ticket promedio lleva centavos
    s.pedidos.length = 0;
    await page.evaluate(() => window.nxRepRango('d', '0002-11-16')); await page.waitForTimeout(1500);
    ok(!s.pedidos.some(p => p.t === 'pos_ventas') && await page.evaluate(() => [...document.querySelectorAll('input[type=date]')].some(i => i.value === '2025-01-01')), `${w}px: un año a medio escribir (0002) no recarga ni cambia la fecha`);
    globalThis.__nada = 0;
    // Venta rápida: la cantidad escrita a mano cambia el total sin tocar «+»
    await page.evaluate(() => { window.nxPosTab('vender'); }); await page.waitForTimeout(1500);
    await page.evaluate(() => window.nxPosAdd('p1')); await page.waitForTimeout(500);
    const qi = page.locator('.citqty-in').first();
    if (await qi.count()) {
      await qi.click({ clickCount: 3 }); await page.keyboard.type('4'); await page.waitForTimeout(1200);
      const q = await page.evaluate(() => ({ v: document.querySelector('.citqty-in').value, foco: document.activeElement && document.activeElement.classList.contains('citqty-in'), txt: document.body.innerText.replace(/\s+/g, ' ') }));
      ok(q.v === '4' && q.foco && /RD\$ ?120\.00/.test(q.txt), `${w}px: escribir 4 en la cantidad cambia el total a RD$120 sin tocar «+» y deja el cursor en el campo`, { v: q.v, foco: q.foco });
    } else ok(false, `${w}px: no se encontró el campo de cantidad del carrito`);
    // pie de la ficha de artículo: 48 px los secundarios, 54 el principal
    await page.evaluate(() => window.nxPosNuevoProd()); await page.waitForTimeout(1200);
    const pie = await page.evaluate(() => [...document.querySelectorAll('#nxPosProd .footbar button')].map(x => [x.innerText.trim(), Math.round(x.getBoundingClientRect().height)]));
    ok(pie.length === 3 && pie.filter(x => /Cancelar|nuevo/i.test(x[0])).every(x => x[1] >= 48) && pie.some(x => /Guardar art/i.test(x[0]) && x[1] >= 54), `${w}px: pie de la ficha: Cancelar y Guardar y nuevo 48 px, Guardar artículo 54 px`, pie);
    if (OUT) await page.screenshot({ path: `${OUT}/pie-ficha-${w}.png` });
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
