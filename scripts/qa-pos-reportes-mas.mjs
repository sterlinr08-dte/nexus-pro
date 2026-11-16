// QA (16-nov-2026): 12 reportes más estilo Infoplus — ventas, ganancias (artículo y día), empleado, cliente, compras, recepciones,
// despachos (detalle y por almacén), series no vendidas, inventario físico y lista de precios.
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
    pos_inv_movimientos: [],
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
    pos_cuentas: [['1101', 'Caja', 'activo'], ['1103', 'CxC', 'activo'], ['1104', 'Inventario', 'activo'], ['2102', 'ITBIS por pagar', 'pasivo'], ['2105', 'Notas de crédito por aplicar', 'pasivo'], ['4101', 'Ventas', 'ingreso'], ['5101', 'Costo', 'costo'], ['3101', 'Capital', 'capital'], ['4102', 'Otros ingresos', 'ingreso'], ['6104', 'Gastos varios', 'gasto']].map(([c, n, t]) => ({ id: 'cta' + c, codigo: c, nombre: n, tipo: t, activo: true })),
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
    const ahora = Date.now(); globalThis.__HOY = new Date().toLocaleDateString('en-CA');
    globalThis.__VENTAS_HOY = [
      { id: 'h1', numero_factura: 'CO00000001', total: 118, subtotal: 100, itbis: 18, pagado_efectivo: 118, created_at: new Date(ahora - 60e3).toISOString(), fecha: new Date(ahora - 60e3).toISOString(), estado: 'completada', cliente_id: 'c1', cliente_nombre: 'Juan Pérez', vendedor_nombre: 'Ana' },
      { id: 'h2', numero_factura: 'CO00000002', total: 400, subtotal: 400, itbis: 0, pagado_efectivo: 400, created_at: new Date(ahora - 30e3).toISOString(), fecha: new Date(ahora - 30e3).toISOString(), estado: 'completada', cliente_nombre: 'Consumidor final', created_by_name: 'Luis' }
    ];
    // nota de crédito: 1 agua (RD$ 29.50) de la factura 1
    globalThis.__DEVS = [{ id: 'd1', venta_id: 'h1', numero: 'NC-00001', fecha: globalThis.__HOY, created_at: new Date().toISOString(), total: 29.5, itbis: 4.5, estado: 'emitida' }];
    globalThis.__PRODS = [
      { id: 'p1', nombre: 'Agua purificada', codigo: 'A-01', categoria_id: 'k1', precio: 29.5, precio_mayor: 26, costo: 14.5, stock: 100, itbis: true, activo: true, tipo: 'producto' },
      { id: 'p2', nombre: 'Celular X', codigo: 'C-01', categoria_id: 'k1', precio: 11800, costo: 8000, stock: 2, itbis: true, activo: true, tipo: 'producto', serial: true },
      { id: 'p3', nombre: 'Arroz selecto', codigo: 'B-01', categoria_id: 'k2', precio: 200, costo: 150, stock: 20, itbis: false, activo: true, tipo: 'producto' }
    ];
    const s = await abrir(b, w); const page = s.page; await page.waitForTimeout(1200);
    s.D.pos_devolucion_items = [{ id: 'di1', devolucion_id: 'd1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 1, precio: 29.5, importe: 29.5, itbis: true }];
    await page.evaluate(() => window.nxPosTab('reportes')); await page.waitForTimeout(2000);
    await page.evaluate(() => window.nxRepInvAbrir()); await page.waitForTimeout(1500);
    const txt = () => page.evaluate(() => document.getElementById('riCuerpo').innerText.replace(/\s+/g, ' '));
    const ir = async t => { await page.evaluate(x => window.nxRepInvSet('tab', x), t); await page.waitForTimeout(1300); return txt(); };
    const grupos = await page.evaluate(() => [...document.querySelectorAll('.nxRi .ritabs button')].map(x => x.innerText.trim()));
    ok(grupos.length === 3 && /inventario/i.test(grupos[0]) && /ventas/i.test(grupos[1]) && /compras/i.test(grupos[2]), `${w}px: tres grupos: Inventario, Ventas, Compras y despachos`, grupos);
    await page.evaluate(() => window.nxRepInvSet('grupo', 'ven')); await page.waitForTimeout(1300);
    const ops = await page.evaluate(() => [...document.querySelector('.nxRi .rifil select').options].map(o => o.textContent));
    ok(ops.length === 5 && ops[0] === 'Ventas', `${w}px: el grupo Ventas ofrece sus 5 reportes`, ops);
    let t = await txt();
    ok(/CO00000001/.test(t) && /TOTAL RD\$ 518\.00 - RD\$ 29\.50 RD\$ 488\.50/i.test(t), `${w}px: Ventas: total 518, devuelto 29.50, neto 488.50`, t.slice(-200));
    if (OUT) await page.screenshot({ path: `${OUT}/ventas-${w}.png` });
    t = await ir('ganancias');
    // Agua: (4−1) uds; venta sin ITBIS 100−25 = 75; costo 4×10 (costo de la venta) − 1×14.5 (devuelto a costo actual) = 25.5; Arroz 400 − 300
    ok(/Agua purificada 3 RD\$ 75\.00 RD\$ 25\.50 RD\$ 49\.50 66 %/i.test(t) && /Arroz selecto 2 RD\$ 400\.00 RD\$ 300\.00 RD\$ 100\.00 25 %/i.test(t) && /TOTAL RD\$ 475\.00 RD\$ 325\.50 RD\$ 149\.50/i.test(t), `${w}px: Ganancias por artículo: usa el costo de la venta y resta la devolución`, t.slice(-330));
    t = await ir('gandia');
    ok(/2 RD\$ 488\.50 RD\$ 475\.00 RD\$ 325\.50 RD\$ 149\.50/.test(t), `${w}px: Ganancias por día: 2 facturas, neto 488.50, ganancia 149.50`, t.slice(-200));
    t = await ir('empleado');
    ok(/Luis 1 RD\$ 400\.00 RD\$ 400\.00 RD\$ 400\.00/i.test(t) && /Ana 1 RD\$ 118\.00 - RD\$ 29\.50 RD\$ 88\.50 RD\$ 88\.50/i.test(t), `${w}px: Ventas por empleado: vendedor, o quien registró si no hay`, t.slice(-260));
    t = await ir('clientes');
    ok(/Consumidor final 1 RD\$ 400\.00 RD\$ 400\.00/i.test(t) && /Juan Pérez 1 RD\$ 118\.00 - RD\$ 29\.50 RD\$ 88\.50/i.test(t), `${w}px: Ventas por cliente`, t.slice(-260));
    await page.evaluate(() => window.nxRepInvSet('grupo', 'com')); await page.waitForTimeout(1300); t = await txt();
    ok(/Distribuidora Uno B0100000009 Crédito/i.test(t) && !/Anulada/i.test(t) && /TOTAL RD\$ 1,500\.00 RD\$ 180\.00 RD\$ 1,680\.00/i.test(t) && /A CRÉDITO RD\$ 1,180\.00/i.test(t), `${w}px: Compras: 2 (sin la anulada), total 1,680, a crédito 1,180`, t.slice(0, 120) + ' … ' + t.slice(-120));
    t = await ir('recep');
    ok(/Agua purificada 50 RD\$ 20\.00 RD\$ 1,000\.00/i.test(t) && /TOTAL 55 RD\$ 1,500\.00/i.test(t), `${w}px: Recepciones: 55 unidades, RD$ 1,500`, t.slice(-160));
    t = await ir('desp');
    ok(/TR-00001 Principal Sucursal Agua purificada 12/i.test(t) && /TOTAL 15/i.test(t), `${w}px: Despachos: detalle y 15 unidades`, t.slice(-160));
    t = await ir('despalm');
    ok(/Principal Sucursal 2 15/i.test(t), `${w}px: Despachos por almacén: Principal → Sucursal, 2 despachos, 15 unidades`, t);
    await page.evaluate(() => window.nxRepInvSet('grupo', 'inv')); await page.waitForTimeout(1000);
    t = await ir('series');
    ok(/SERIES DISPONIBLES 2/i.test(t) && /356000000000001/.test(t) && /Celular X · 2/i.test(t) && /RD\$ 16,000\.00/.test(t), `${w}px: Series no vendidas: 2 del Celular X, RD$ 16,000 a costo`, t.slice(0, 200));
    t = await ir('fisico');
    ok(/Agua purificada 100/i.test(t) && /UNIDADES EN SISTEMA 122/i.test(t) && /CONTEO/i.test(await page.evaluate(() => document.querySelector('.nxRi .ritab thead').innerText)), `${w}px: Inventario físico: hoja de conteo con 122 unidades en sistema`, t.slice(0, 160));
    t = await ir('precios');
    ok(/Agua purificada Bebidas RD\$ 14\.50 RD\$ 29\.50 RD\$ 26\.00 42 %/i.test(t) && /Arroz selecto Alimentos RD\$ 150\.00 RD\$ 200\.00 25 %/i.test(t), `${w}px: Lista de precios con margen sobre el precio sin ITBIS`, t.slice(0, 300));
    if (OUT) await page.screenshot({ path: `${OUT}/precios-${w}.png` });
    const med = await page.evaluate(() => ({ ancho: document.documentElement.scrollWidth <= window.innerWidth + 1, tabs: Math.min(...[...document.querySelectorAll('.nxRi .ritabs button')].map(x => Math.round(x.getBoundingClientRect().height))) }));
    ok(med.ancho && med.tabs >= 44, `${w}px: sin desborde y grupos ≥44 px`, med);
    ok(!s.pedidos.some(p => p.m !== 'GET' && /^pos_/.test(p.t)), `${w}px: ningún reporte escribe en las tablas del POS`, s.pedidos.filter(p => p.m !== 'GET' && /^pos_/.test(p.t)).map(p => p.t));
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
