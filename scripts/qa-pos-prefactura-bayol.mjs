// QA (16-nov-2026): Prefactura estilo Bayol Cell (dueño: «que replique la de Bayol Cell taller»). 390, 1024 y 1440 px.
// Cliente·Precio·Almacén·Vendedor + píldora, WhatsApp primero, cliente nuevo al guardar, vendedor guardado, nivel de precio,
// nombres en minúscula normal, artículos en 2 filas, accesos rápidos, Resumen a la derecha en PC, «Nueva», interruptor de apagado.
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
  const pedidos = []; const externos = []; const D = Object.assign(db(), globalThis.__EXTRA || {});
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
    if (t === 'rpc/pos_accesos_rapidos_guardar') { if (globalThis.__RAP_FALLA) return send({ message: 'NO_AUTORIZADO' }, 403); return send({ ok: true, accesos: body.p_ids && body.p_ids.length ? body.p_ids : null }); }
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
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; if (v === 'not.is.null') { filas = filas.filter(x => x[k] != null); continue; } const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); const mi = /^in\.\((.*)\)$/.exec(v); if (mi) { const vs = mi[1].split(',').map(z => z.replace(/^"|"$/g, '')); filas = filas.filter(x => vs.includes(String(x[k]))); } }
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
  for (const w of [390, 1024, 1440]) {
    globalThis.__HOY = new Date().toLocaleDateString('en-CA'); globalThis.__VENTAS_HOY = []; globalThis.__DEVS = []; globalThis.__HIST = []; globalThis.__ACT = [];
    globalThis.__PRODS = [{ id: 'p1', nombre: 'BATERIA SAMSUNG A12', codigo: '2139', precio: 1500, costo: 600, stock: 10, itbis: false, activo: true, tipo: 'producto' }, { id: 'p3', nombre: 'PROTECTOR CRISTAL IPHONE 13 DE 6.1', codigo: '3301', precio: 350, costo: 100, stock: 20, itbis: false, activo: true, tipo: 'producto', favorito: true }, { id: 'p4', nombre: 'Envio - Mensajeria', codigo: '1161', precio: 100, costo: 0, stock: 0, itbis: false, activo: true, tipo: 'servicio' }];
    globalThis.__EXTRA = { pos_vendedores: [{ id: 'vd1', nombre: 'Esterlin Espinal', activo: true }, { id: 'vd2', nombre: 'Robinson', activo: true }], pos_niveles_precio: [{ id: 'n1', nombre: 'Mayorista', orden: 1, activo: true }], pos_producto_niveles: [{ id: 'pn1', producto_id: 'p1', nivel_id: 'n1', precio_contado: 1200 }] };
    const s = await abrir(b, w); const page = s.page; await page.setViewportSize({ width: w, height: 900 });
    s.D.pos_clientes.push({ id: 'c9', nombre: 'Mayorista Demo', telefono: '8095558888', nivel_id: 'n1', nivel_precio: 'mayor', activo: true, es_cliente: true });
    await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(2500);
    await page.evaluate(() => window.nxPosTab('prefactura')); await page.waitForTimeout(1500);
    ok(await page.evaluate(() => !!document.querySelector('#v-pos .nxPfB #facCliInfoWrap[data-doc="pfb"]')), `${w}px: la Prefactura usa el diseño estilo Bayol`);
    // vendedor automático = el usuario de la sesión
    ok(await page.evaluate(() => document.getElementById('pfbVend').value === 'vd1'), `${w}px: Vendedor propone al usuario de la sesión (Esterlin)`);
    // píldora en el celular
    if (w < 761) {
      const p0 = await page.evaluate(() => ({ pil: document.querySelector('.pfbPil').innerText.trim(), opc: getComputedStyle(document.querySelector('.pfbOpc')).display, h: Math.round(document.querySelector('.pfbPil').getBoundingClientRect().height) }));
      ok(/Cliente final · .*Esterlin Espinal/.test(p0.pil) && p0.opc === 'none' && p0.h >= 48, `${w}px: píldora «Cliente final · … · Esterlin Espinal» con Precio/Almacén/Vendedor plegados`, p0);
      await page.click('.pfbPil'); await page.waitForTimeout(200);
      ok(await page.evaluate(() => getComputedStyle(document.querySelector('.pfbOpc')).display !== 'none'), `${w}px: tocar la píldora los abre`);
    } else ok(await page.evaluate(() => getComputedStyle(document.querySelector('.pfbPil')).display === 'none' && getComputedStyle(document.getElementById('pfbNivel')).display !== 'none'), `${w}px: en PC van en una fila, sin píldora`);
    // artículos y nombres
    await page.evaluate(() => { window.nxFacAdd('p1'); window.nxFacAdd('p3'); window.nxFacAdd('p3'); }); await page.waitForTimeout(500);
    const nom = await page.evaluate(() => ({ t: [...document.querySelectorAll('#facTabla .dnm')].map(e => e.innerText.trim()), tt: getComputedStyle(document.querySelector('#facTabla .dnm')).textTransform }));
    ok(nom.t.join('|') === 'Bateria Samsung A12|Protector Cristal iPhone 13 de 6.1' && nom.tt === 'none', `${w}px: nombres en minúscula normal (como Bayol)`, nom);
    if (w < 761) { const hs = await page.evaluate(() => [...document.querySelectorAll('#facTabla tbody tr')].map(r => Math.round(r.getBoundingClientRect().height))); ok(hs.every(h => h <= 140), `${w}px: cada artículo en 2 filas (≤ 140 px)`, hs); }
    // Nivel de precio: SOLO el asignado al cliente; nadie lo fuerza en la prefactura (dueño 16-nov)
    ok(await page.evaluate(() => !document.querySelector('select#pfbNivel') && /Cliente final/i.test(document.getElementById('pfbNivel').innerText)), `${w}px: «Precio» es solo informativo (nivel del cliente, sin selector)`);
    await page.evaluate(() => window.nxFacSetCli('c9')); await page.waitForTimeout(500);
    const pr = await page.evaluate(() => ({ p: document.querySelector('#facTabla .pin').value, n: document.getElementById('pfbNivel').innerText }));
    await page.evaluate(() => window.nxFacSetCli('')); await page.waitForTimeout(500);
    const pr2 = await page.evaluate(() => document.querySelector('#facTabla .pin').value);
    ok(Number(String(pr.p).replace(/,/g, '')) === 1200 && /Mayorista/i.test(pr.n) && Number(String(pr2).replace(/,/g, '')) === 1500, `${w}px: el precio Mayorista solo sale con el cliente que lo tiene asignado (1,200) y vuelve a 1,500 sin él`, [pr, pr2]);
    // accesos rápidos
    const rap = await page.evaluate(() => [...document.querySelectorAll('.pfbRapB')].map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    ok(rap.length >= 2 && /Protector Cristal/.test(rap[0]) && /Envio - Mensajeria/.test(rap[1]), `${w}px: accesos automáticos: favoritos (★) primero y luego servicios`, rap);
    await page.click('.pfbRapB >> nth=1'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => /Agregado/.test(document.querySelectorAll('.pfbRapB')[1].innerText) && document.querySelectorAll('#facTabla tbody tr').length === 3), `${w}px: tocar el acceso agrega el artículo y queda «Agregado»`);
    // WhatsApp primero: cliente existente (Juan Pérez 8095550000)
    await page.fill('#pfbWa', '809-555-0000'); await page.dispatchEvent('#pfbWa', 'input'); await page.waitForTimeout(500);
    const cli = await page.evaluate(() => ({ chip: document.querySelector('.pfbCN').innerText, nom: document.getElementById('pfbNom').value, av: (document.querySelector('#pfbAviso') || {}).innerText }));
    ok(cli.chip === 'Juan Pérez' && cli.nom === 'Juan Pérez' && /Cliente registrado/i.test(cli.av), `${w}px: WhatsApp de un cliente existente lo elige y llena el nombre`, cli);
    // cambiar el número suelta al cliente; uno nuevo se registra al guardar
    await page.fill('#pfbWa', '829-555-9999'); await page.dispatchEvent('#pfbWa', 'input'); await page.waitForTimeout(400);
    await page.fill('#pfbNom', 'Cliente Nuevo Demo'); await page.dispatchEvent('#pfbNom', 'input'); await page.fill('#pfbCed', '00112345678'); await page.dispatchEvent('#pfbCed', 'input'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelector('.pfbCN').innerText === 'Consumidor final' && /se registra al guardar/i.test(document.getElementById('pfbAviso').innerText)), `${w}px: con otro número se suelta el cliente y avisa «se registra al guardar»`);
    // Resumen: a la derecha en PC ≥ 1280, sin la barra de abajo; debajo y con barra en pantallas menores
    const lay = await page.evaluate(() => { const a = document.querySelector('.pfbRes').getBoundingClientRect(), m = document.querySelector('.pfbMain').getBoundingClientRect(), g = document.querySelector('.pfbAcc .pfbGI'); return { der: a.left >= m.right - 1, bar: !!document.getElementById('nxFacBar'), gi: g && getComputedStyle(g).display !== 'none' ? Math.round(g.getBoundingClientRect().height) : 0, sw: document.documentElement.scrollWidth - window.innerWidth }; });
    if (w >= 1280) ok(lay.der && !lay.bar && lay.gi >= 54 && lay.sw <= 1, `${w}px: Resumen fijo a la derecha con «Guardar e imprimir» (54 px) y sin barra abajo`, lay);
    else ok(!lay.der && lay.bar && lay.sw <= 1, `${w}px: Resumen debajo y la barra de abajo de siempre`, lay);
    // tamaños de toque
    const peq = await page.evaluate(() => [...document.querySelectorAll('#v-pos .nxPfB button, #v-pos .nxPfB select, #v-pos .nxPfB input:not([type=hidden])')].filter(e => e.offsetParent && !e.closest('.stp') && !e.closest('.dsc') && !e.closest('.cX') && !e.closest('.dnumrow') && !e.closest('.facQs') && !e.closest('.nx-inv-notedet') && e.getBoundingClientRect().height < 44).map(e => (e.id || e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height)));
    ok(!peq.length, `${w}px: lo nuevo mide ≥ 44 px`, peq);
    if (OUT) await page.screenshot({ path: `${OUT}/pfb-${w}.png` });
    // guardar: registra el cliente nuevo y guarda el vendedor; lo guardado conserva el nombre original
    s.pedidos.length = 0;
    await page.evaluate(() => window.nxPrefGuardar()); await page.waitForTimeout(2500);
    const pc = s.pedidos.find(p => p.t === 'pos_clientes' && p.m === 'POST'), pf = s.pedidos.find(p => p.t === 'pos_prefacturas' && p.m === 'POST');
    ok(pc && pc.body.nombre === 'Cliente Nuevo Demo' && pc.body.telefono === '829-555-9999' && pc.body.cedula === '00112345678', `${w}px: al guardar se registra el cliente nuevo (nombre, WhatsApp, cédula)`, pc && pc.body);
    ok(pf && pf.body.vendedor_id === 'vd1' && pf.body.vendedor_nombre === 'Esterlin Espinal' && pf.body.cliente_nombre === 'Cliente Nuevo Demo' && /^pos_clientes_n/.test(pf.body.cliente_id || '') && pf.body.items[0].nombre === 'BATERIA SAMSUNG A12', `${w}px: la prefactura guarda cliente, vendedor y el nombre original del artículo`, pf && { v: pf.body.vendedor_id, c: pf.body.cliente_nombre, id: pf.body.cliente_id, n: pf.body.items[0].nombre });
    // Muse 6062: un guardado creó el cliente dos veces. Dos guardados a la vez → un solo cliente.
    await page.evaluate(() => { window.nxFacAdd('p1'); window.nxFacSetCli(''); }); await page.waitForTimeout(300);
    await page.evaluate(() => { window.nxPfbWa('829-555-4321'); window.nxPfbCampo('nom', 'Cliente Doble Toque'); }); await page.waitForTimeout(200);
    s.pedidos.length = 0;
    await page.evaluate(() => { window.nxPrefGuardar(); window.nxPrefGuardar(); window.nxDocAccion && window.nxDocAccion('pref', 'guardar'); }); await page.waitForTimeout(2500);
    const altas = s.pedidos.filter(p => p.t === 'pos_clientes' && p.m === 'POST').length, pfs = s.pedidos.filter(p => p.t === 'pos_prefacturas' && p.m === 'POST').length;
    ok(altas === 1 && pfs === 1, `${w}px: varios «Guardar» seguidos crean 1 cliente y 1 prefactura`, { altas, pfs, pf: (s.pedidos.find(p => p.t === 'pos_prefacturas') || {}).body?.cliente_id, gets: s.pedidos.filter(p => p.t === 'pos_clientes').map(p => p.m + ' ' + (p.q || p.url || '')).slice(0, 3) });
    // Un WhatsApp que ya está en la base (aunque esta pantalla no lo tenga cargado) no se vuelve a crear
    s.D.pos_clientes.push({ id: 'cBase', nombre: 'Cliente En Base', telefono: '849-555-6666', activo: true, es_cliente: true });
    await page.evaluate(() => { document.querySelectorAll('.nxRA-ov').forEach(o => o.remove()); window.nxFacAdd('p1'); window.nxFacSetCli(''); }); await page.waitForTimeout(300);
    await page.evaluate(() => { window.nxPfbWa('8495556666'); window.nxPfbCampo('nom', 'Otro Nombre'); }); await page.waitForTimeout(200);
    s.pedidos.length = 0;
    await page.evaluate(() => window.nxPrefGuardar()); await page.waitForTimeout(2500);
    const alta2 = s.pedidos.filter(p => p.t === 'pos_clientes' && p.m === 'POST').length, pf2 = s.pedidos.find(p => p.t === 'pos_prefacturas' && p.m === 'POST');
    ok(alta2 === 0 && pf2 && pf2.body.cliente_id === 'cBase', `${w}px: si el WhatsApp ya existe en la base, usa ese cliente y no crea otro`, { alta2, cli: pf2 && pf2.body.cliente_id });
    await page.evaluate(() => document.querySelectorAll('.nxRA-ov').forEach(o => o.remove()));
    // «Limpiar» (barra de acciones) vacía la prefactura al confirmar, a la primera (Muse 16-nov)
    await page.evaluate(() => { document.querySelectorAll('.nxRA-ov').forEach(o => o.remove()); window.nxFacAdd('p1'); }); await page.waitForTimeout(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('#facOtrasSlot button')].find(x => /Limpiar/i.test(x.innerText)); b.click(); }); await page.waitForTimeout(300);
    await page.click('#nxConfirmaOk'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => !document.querySelectorAll('#facTabla tbody tr .dnm').length), `${w}px: «Limpiar» vacía la prefactura a la primera`);
    // «Nueva» con algo en pantalla pregunta en su propia ventana
    await page.evaluate(() => { document.querySelectorAll('.nxRA-ov').forEach(o => o.remove()); window.nxFacAdd('p1'); }); await page.waitForTimeout(300);
    let dlg = false; page.on('dialog', d => { dlg = true; d.dismiss(); });
    await page.evaluate(() => window.nxPfbNueva()); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !!document.getElementById('nxConfirma')) && !dlg, `${w}px: «Nueva» pregunta en su propia ventana`);
    await page.click('#nxConfirmaOk'); await page.waitForTimeout(800);
    ok(await page.evaluate(() => !document.querySelectorAll('#facTabla tbody tr .dnm').length), `${w}px: «Empezar nueva» deja la prefactura vacía`);
    // Accesos rápidos que se eligen y se cambian (dueño 16-nov)
    await page.evaluate(() => document.querySelectorAll('.nxRA-ov').forEach(o => o.remove()));
    ok(await page.evaluate(() => { const e = document.querySelector('.pfbRapEd'); return !!e && e.getBoundingClientRect().height >= 44; }), `${w}px: hay «Cambiar accesos» (admin)`);
    await page.click('.pfbRapEd'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !!document.getElementById('nxRapM') && /Envio - Mensajeria/.test(document.getElementById('rapLista').innerText)), `${w}px: el editor abre con los accesos actuales`);
    const ini = await page.evaluate(() => document.getElementById('rapLista').innerText.replace(/\s+/g, ' '));
    ok(/1 Protector Cristal.*2 Envio - Mensajeria.*3 Bateria Samsung A12/.test(ini), `${w}px: automáticos = favoritos (★), servicios y lo más prefacturado`, ini.slice(0, 160));
    await page.evaluate(() => window.nxRapQuitar(2)); await page.waitForTimeout(100);
    await page.evaluate(() => window.nxArtPicker('rapArtSlot')); await page.waitForTimeout(300); await page.evaluate(() => window.nxProdPickFiltrar('bateria')); await page.waitForTimeout(150);
    await page.click('#rapArtSlot .nxPpkIt'); await page.click('#rapArtSlot .nxPpkElegir'); await page.waitForTimeout(300);
    await page.evaluate(() => { window.nxRapMover(2, -1); window.nxRapQuitar(0); }); await page.waitForTimeout(150);
    const lst = await page.evaluate(() => document.getElementById('rapLista').innerText.replace(/\s+/g, ' '));
    ok(/1 Bateria Samsung A12.*2 Envio - Mensajeria/.test(lst) && !/Protector/.test(lst), `${w}px: se agrega con el buscador de Factura, se ordena con ↑ ↓ y se quita con ✕`, lst.slice(0, 120));
    s.pedidos.length = 0;
    await page.click('#rapGuardar'); await page.waitForTimeout(1200);
    const pc2 = s.pedidos.find(p => p.t === 'rpc/pos_accesos_rapidos_guardar');
    ok(pc2 && JSON.stringify(pc2.body.p_ids) === JSON.stringify(['p1', 'p4']) && !s.pedidos.some(p => p.t === 'pos_config' && p.m === 'PATCH'), `${w}px: se guardan por el servidor (no PATCH a pos_config) en ese orden`, pc2 && pc2.body);
    const rap2 = await page.evaluate(() => [...document.querySelectorAll('.pfbRapB b')].map(x => x.innerText));
    ok(rap2.join('|') === 'Bateria Samsung A12|Envio - Mensajeria', `${w}px: la prefactura muestra los accesos elegidos`, rap2);
    // Si el servidor no confirma, NO dice «guardados» y la prefactura sigue igual (Muse 16-nov)
    globalThis.__RAP_FALLA = true;
    await page.click('.pfbRapEd'); await page.waitForTimeout(300); await page.evaluate(() => window.nxRapQuitar(0)); await page.click('#rapGuardar'); await page.waitForTimeout(1000);
    const tr = await page.evaluate(() => ({ err: /No se guardaron los accesos/i.test(document.body.innerText), sigue: !!document.getElementById('nxRapM'), rap: [...document.querySelectorAll('.pfbRapB b')].map(x => x.innerText).join('|') }));
    ok(tr.err && tr.sigue && tr.rap === 'Bateria Samsung A12|Envio - Mensajeria', `${w}px: si el servidor no confirma, avisa «No se guardaron» y no cambia nada`, tr);
    globalThis.__RAP_FALLA = false; await page.evaluate(() => document.getElementById('nxRapM').remove());
    await page.click('.pfbRapEd'); await page.waitForTimeout(300); s.pedidos.length = 0;
    await page.evaluate(() => window.nxRapGuardar(true)); await page.waitForTimeout(1000);
    const pc3 = s.pedidos.find(p => p.t === 'rpc/pos_accesos_rapidos_guardar');
    ok(pc3 && pc3.body.p_ids === null, `${w}px: «Volver a los automáticos» los limpia`, pc3 && pc3.body);
    // Foto en el Resumen de la ficha de artículo (dueño 16-nov)
    await page.evaluate(() => window.nxPosNuevoProd()); await page.waitForTimeout(1200);
    const f0 = await page.evaluate(() => { const b = [...document.querySelectorAll('#nxPfResImg button')].find(x => /Subir foto/i.test(x.innerText)); return { hay: !!b, h: b ? Math.round(b.getBoundingClientRect().height) : 0 }; });
    ok(f0.hay && f0.h >= 44, `${w}px: el Resumen del artículo tiene «Subir foto» (44 px)`, f0);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAAGQABA5L2eAAAAABJRU5ErkJggg==', 'base64');
    await page.setInputFiles('#ppImgFile', { name: 'foto.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(1200);
    const f1 = await page.evaluate(() => ({ img: !!document.querySelector('#nxPfResImg img'), cam: /Cambiar foto/i.test(document.getElementById('nxPfResImg').innerText), quitar: /Quitar/i.test(document.getElementById('nxPfResImg').innerText), campo: /^data:image\/jpeg/.test(document.getElementById('ppImg').value) }));
    ok(f1.img && f1.cam && f1.quitar && f1.campo, `${w}px: al subirla se ve en el Resumen con «Cambiar foto» y «Quitar», y queda lista para guardar`, f1);
    if (OUT) await page.screenshot({ path: `${OUT}/ficha-foto-${w}.png` });
    await page.evaluate(() => { const b = [...document.querySelectorAll('#nxPfResImg button')].find(x => /Quitar/i.test(x.innerText)); b.click(); }); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !document.querySelector('#nxPfResImg img') && document.getElementById('ppImg').value === ''), `${w}px: «Quitar» deja el artículo sin foto`);
    await page.evaluate(() => { const m = document.getElementById('nxPosProd'); if (m) m.remove(); });
    // Ficha del cliente: el nivel solo lo cambia admin/gerente (dueño 16-nov)
    await page.evaluate(() => window.nxPosNuevoCli()); await page.waitForTimeout(800);
    ok(await page.evaluate(() => !document.getElementById('entNivel').disabled), `${w}px: el administrador sí puede elegir el nivel del cliente`);
    await page.evaluate(() => { const m = document.getElementById('nxEntForm'); if (m) m.remove(); window.nxRolPreview('cajero'); }); await page.waitForTimeout(800);
    await page.evaluate(() => window.nxPosNuevoCli()); await page.waitForTimeout(800);
    const emp = await page.evaluate(() => ({ dis: document.getElementById('entNivel').disabled, ayu: /Solo el administrador o el gerente/.test((document.getElementById('entNivelAyu') || {}).innerText || '') }));
    ok(emp.dis && emp.ayu, `${w}px: un cajero ve el nivel bloqueado con su aviso`, emp);
    s.pedidos.length = 0;
    await page.evaluate(() => { document.getElementById('entNom').value = 'Cliente de Cajero'; const e = document.getElementById('ent_es_cliente'); if (e && !e.checked) e.click(); window.nxEntGuardar(''); }); await page.waitForTimeout(1500);
    const alta = s.pedidos.find(p => p.t === 'pos_clientes' && p.m === 'POST');
    ok(alta && alta.body.nivel_precio === 'final' && alta.body.nivel_id === null, `${w}px: el cliente que crea un cajero queda con el nivel por defecto`, alta && { id: alta.body.nivel_id, np: alta.body.nivel_precio });
    await page.evaluate(() => { const m = document.getElementById('nxEntForm'); if (m) m.remove(); window.nxRolPreview(''); }); await page.waitForTimeout(800);
    await page.evaluate(() => window.nxPosTab('prefactura')); await page.waitForTimeout(800);
    // Factura no cambia; y el interruptor apaga el diseño
    await page.evaluate(() => window.nxPosTab('factura')); await page.waitForTimeout(1000);
    ok(await page.evaluate(() => !document.querySelector('#v-pos .nxPfB') && !!document.querySelector('#v-pos .nxDoc')), `${w}px: la Factura sigue igual`);
    await page.evaluate(() => { localStorage.setItem('nx_pfb_off', '1'); window.nxPosTab('prefactura'); }); await page.waitForTimeout(1000);
    ok(await page.evaluate(() => !document.querySelector('#v-pos .nxPfB') && !!document.querySelector('#v-pos .nxDoc .partes')), `${w}px: con nx_pfb_off vuelve la prefactura de antes`);
    await page.evaluate(() => localStorage.removeItem('nx_pfb_off'));
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
