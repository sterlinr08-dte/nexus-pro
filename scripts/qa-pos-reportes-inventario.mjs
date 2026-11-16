// QA (16-nov-2026): los 5 reportes de inventario estilo Infoplus (resumen valorizado, existencia baja, movimientos, sin movimiento, ajustes).
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
    pos_inv_movimientos: globalThis.__MOVS || [],
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
    pos_venta_items: [{ id: 'vi1', venta_id: 'h1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 3, precio: 25, importe: 75, itbis: true }, { id: 'vi2', venta_id: 'h1', producto_id: 'p2', nombre: 'Arroz selecto', cantidad: 1, precio: 135, importe: 135, itbis: false }],
    pos_devoluciones: globalThis.__DEVS || [],
    pos_devolucion_items: [{ id: 'di1', devolucion_id: 'd1', producto_id: 'p1', nombre: 'Agua purificada', cantidad: 1, precio: 25, importe: 25, itbis: true }],
    pos_cuentas: [['1101', 'Caja', 'activo'], ['1103', 'CxC', 'activo'], ['1104', 'Inventario', 'activo'], ['2102', 'ITBIS por pagar', 'pasivo'], ['2105', 'Notas de crédito por aplicar', 'pasivo'], ['4101', 'Ventas', 'ingreso'], ['5101', 'Costo', 'costo'], ['3101', 'Capital', 'capital'], ['4102', 'Otros ingresos', 'ingreso'], ['6104', 'Gastos varios', 'gasto']].map(([c, n, t]) => ({ id: 'cta' + c, codigo: c, nombre: n, tipo: t, activo: true })),
    pos_garantias: [], pos_compras: [], pos_compra_pagos: [], pos_categorias: [{ id: 'k1', nombre: 'Bebidas', orden: 1 }, { id: 'k2', nombre: 'Alimentos', orden: 2 }],
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
const hh = h => new Date(Date.now() - h * 3600e3).toISOString();
try {
  for (const w of [390, 1280]) {
    globalThis.__VENTAS_HOY = []; globalThis.__DEVS = [];
    globalThis.__PRODS = [
      { id: 'p1', nombre: 'Agua purificada', codigo: 'A-01', referencia: '500 ml', categoria_id: 'k1', marca: 'Cristal', precio: 25, costo: 14.5, stock: 100, stock_min: 5, itbis: true, activo: true, tipo: 'producto' },
      { id: 'p2', nombre: 'Refresco cola', codigo: 'A-02', categoria_id: 'k1', precio: 110, costo: 78, stock: 3, stock_min: 5, itbis: true, activo: true, tipo: 'producto' },
      { id: 'p3', nombre: 'Arroz selecto', codigo: 'B-01', categoria_id: 'k2', precio: 185, costo: 150, stock: 20, stock_min: 0, itbis: false, activo: true, tipo: 'producto' },
      { id: 'p4', nombre: 'Azúcar', codigo: 'B-02', categoria_id: 'k2', precio: 85, costo: 64, stock: 0, stock_min: 4, itbis: false, activo: true, tipo: 'producto' },
      { id: 'p5', nombre: 'Entrega', precio: 100, costo: 0, stock: 0, activo: true, tipo: 'servicio' }
    ];
    globalThis.__MOVS = [
      { id: 'm1', producto_id: 'p1', producto_nombre: 'Agua purificada', tipo: 'venta', cantidad: -2, stock_nuevo: 100, referencia: 'CO00000001', fecha: hh(2), created_by_name: 'Ana' },
      { id: 'm2', producto_id: 'p1', producto_nombre: 'Agua purificada', tipo: 'compra', cantidad: 10, stock_nuevo: 102, referencia: 'Compra 10', fecha: hh(5), created_by_name: 'Ana' },
      { id: 'm3', producto_id: 'p2', producto_nombre: 'Refresco cola', tipo: 'ajuste', cantidad: -1, stock_nuevo: 3, referencia: 'Ajuste manual', motivo: 'Roto', fecha: hh(6), created_by_name: 'Ana' },
      { id: 'm4', producto_id: 'p2', producto_nombre: 'Refresco cola', tipo: 'apertura', cantidad: 4, stock_nuevo: 4, referencia: 'Alta de producto', motivo: 'Stock inicial', fecha: hh(8), created_by_name: 'Ana' }
    ];
    const s = await abrir(b, w); const page = s.page; await page.waitForTimeout(1200);
    await page.evaluate(() => window.nxPosTab('reportes')); await page.waitForTimeout(1500);
    ok(await page.evaluate(() => [...document.querySelectorAll('button')].some(x => /Reportes de inventario/i.test(x.innerText))), `${w}px: Reportes tiene el botón «Reportes de inventario»`);
    await page.evaluate(() => window.nxRepInvAbrir()); await page.waitForTimeout(1500);
    const txt = () => page.evaluate(() => document.getElementById('riCuerpo').innerText.replace(/\s+/g, ' '));
    let t = await txt();
    ok(/Subtotal Bebidas 103 RD\$ 1,684\.00/i.test(t) && /Subtotal Alimentos 20 RD\$ 3,000\.00/i.test(t) && /TOTAL GENERAL 123 RD\$ 4,684\.00/i.test(t), `${w}px: Resumen: subtotales por categoría y total 123 unidades / RD$ 4,684.00`, t.slice(-260));
    ok(!/Azúcar/i.test(t) && !/Entrega/i.test(t), `${w}px: Resumen: «solo con existencia» deja fuera lo agotado y los servicios`);
    if (OUT) await page.screenshot({ path: `${OUT}/resumen-${w}.png` });
    const med = await page.evaluate(() => { const tb = [...document.querySelectorAll('.nxRi .ritabs button')].map(x => Math.round(x.getBoundingClientRect().height)); const se = document.querySelector('.nxRi .rifil select'); return { tabs: Math.min(...tb), sel: Math.round(se.getBoundingClientRect().height), fs: getComputedStyle(se).fontSize, ancho: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
    ok(med.tabs >= 44 && med.sel >= 48 && med.fs === '16px' && med.ancho, `${w}px: pestañas ≥44 px, filtros 48 px / 16 px, la página no se desborda`, med);
    await page.evaluate(() => window.nxRepInvSet('pos', false)); t = await txt();
    ok(/Azúcar/i.test(t), `${w}px: sin el filtro aparece el agotado`);
    await page.evaluate(() => window.nxRepInvSet('cat', 'k1')); t = await txt();
    ok(/TOTAL GENERAL 103/i.test(t) && !/Arroz/i.test(t), `${w}px: filtro por categoría`, t.slice(-120));
    await page.evaluate(() => { window.nxRepInvSet('cat', ''); window.nxRepInvSet('tab', 'baja'); }); await page.waitForTimeout(900); t = await txt();
    ok(/Refresco cola .*3 5 2/i.test(t) && /Azúcar .*0 4 4/i.test(t) && !/Agua/i.test(t) && !/Arroz/i.test(t), `${w}px: Existencia baja: Refresco (3 de 5, faltan 2) y Azúcar (0 de 4)`, t);
    await page.evaluate(() => window.nxRepInvSet('tab', 'movs')); await page.waitForTimeout(1200); t = await txt();
    ok(/MOVIMIENTOS 4/i.test(t) && /ENTRADAS 14/i.test(t) && /SALIDAS 3/i.test(t) && /CO00000001/.test(t), `${w}px: Movimientos: 4, entradas 14, salidas 3`, t.slice(0, 200));
    const q = s.pedidos.filter(p => p.t === 'pos_inv_movimientos').pop();
    ok(q && /fecha=gte\./.test(q.q) && /fecha=lt\./.test(q.q), `${w}px: los movimientos se piden por rango de fechas`, q && q.q);
    await page.evaluate(() => window.nxRepInvSet('tipos', 'venta')); t = await txt();
    ok(/MOVIMIENTOS 1/i.test(t), `${w}px: filtro por tipo de movimiento`);
    await page.evaluate(() => { window.nxRepInvSet('tipos', ''); window.nxRepInvSet('tab', 'sinmov'); }); await page.waitForTimeout(1200); t = await txt();
    ok(/Arroz selecto/i.test(t) && !/Agua/i.test(t) && !/Refresco/i.test(t) && /RD\$ 3,000\.00/.test(t), `${w}px: Sin movimiento: solo Arroz (RD$ 3,000 parado)`, t.slice(0, 260));
    await page.evaluate(() => window.nxRepInvSet('tab', 'ajustes')); await page.waitForTimeout(1200); t = await txt();
    ok(/Inventario inicial/i.test(t) && /Salida de mercancía/i.test(t) && /RD\$ 312\.00/.test(t) && /RD\$ 78\.00/.test(t), `${w}px: Ajustes: inventario inicial RD$ 312 y salida RD$ 78`, t.slice(0, 300));
    if (OUT) await page.screenshot({ path: `${OUT}/ajustes-${w}.png` });
    const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.evaluate(() => window.nxRepInvCSV()); const d = await dl;
    ok(d && /inventario_ajustes_.*\.csv/.test(d.suggestedFilename()), `${w}px: descarga el CSV`, d && d.suggestedFilename());
    const pop = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    await page.evaluate(() => window.nxRepInvImprimir()); const pw = await pop; let pt = '';
    if (pw) { await pw.waitForLoadState().catch(() => {}); pt = (await pw.evaluate(() => document.body.innerText)).replace(/\s+/g, ' '); await pw.close(); }
    ok(/AJUSTES DE INVENTARIO/.test(pt) && /TIENDA DEMO|Tienda/i.test(pt), `${w}px: la hoja para imprimir lleva título y nombre del negocio`, pt.slice(0, 160));
    await page.evaluate(() => window.nxRepInvCerrar()); await page.waitForTimeout(500);
    ok(await page.evaluate(() => !document.querySelector('.nxRi') && !!document.querySelector('.nxRepWrap')), `${w}px: «Reportes» vuelve a la pantalla de reportes`);
    ok(!s.pedidos.some(p => p.m !== 'GET' && /pos_(inv|productos|stock)/.test(p.t)), `${w}px: los reportes no escriben nada en la base`);
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
