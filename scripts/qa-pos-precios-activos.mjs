// QA (16-nov-2026): reporte «Cambios de precio» (historial que escribe la base) y módulo «Activos fijos» (alta, edición, baja, depreciación).
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
    if (t === 'rpc/pos_registrar_compra_atomica') return send({ ok: true, compra: { id: 'cmp1', numero: 10, fecha: new Date().toLocaleDateString('en-CA') }, total_desembarcado: (body.p_compra || {}).subtotal });
    if (t === 'rpc/pos_mover_stock_atomico') return send({ ok: true, stock_nuevo: Number(body.p_delta || 0), stock_almacen_nuevo: Number(body.p_delta || 0) });
    if (t === 'rpc/pos_agregar_costo') { const pr = D.pos_productos.find(x => x.id === body.p_producto); const nuevo = Math.round((pr.costo + body.p_monto / pr.stock) * 100) / 100; const fila = { id: 'ca1', producto_id: pr.id, producto_nombre: pr.nombre, producto_codigo: pr.codigo, monto: body.p_monto, unidades: pr.stock, costo_anterior: pr.costo, costo_nuevo: nuevo, motivo: body.p_motivo, metodo: body.p_metodo, created_by_name: 'Esterlin', fecha: new Date().toISOString() }; D.pos_costos_agregados = [fila]; return send({ ok: true, id: 'ca1', costo_anterior: pr.costo, costo_nuevo: nuevo, unidades: pr.stock, monto: body.p_monto }); }
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
const mesesAtras = n => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toLocaleDateString('en-CA'); };
try {
  for (const w of [390, 1280]) {
    globalThis.__HOY = new Date().toLocaleDateString('en-CA'); globalThis.__VENTAS_HOY = []; globalThis.__DEVS = [];
    globalThis.__PRODS = [{ id: 'p1', nombre: 'Agua purificada', codigo: 'A-01', categoria_id: 'k1', precio: 30, costo: 15, stock: 10, itbis: true, activo: true, tipo: 'producto' }];
    globalThis.__HIST = [
      { id: 'x1', producto_id: 'p1', producto_nombre: 'Agua purificada', producto_codigo: 'A-01', campo: 'precio', anterior: 25, nuevo: 30, usuario: 'Esterlin', fecha: new Date().toISOString() },
      { id: 'x2', producto_id: 'p1', producto_nombre: 'Agua purificada', producto_codigo: 'A-01', campo: 'costo', anterior: 16, nuevo: 12, usuario: 'Esterlin', fecha: new Date().toISOString() }
    ];
    // Nevera: RD$ 60,000, residual 6,000, 5 años, comprada hace 12 meses → 12 × (54,000/60) = 10,800 → en libros 49,200
    globalThis.__ACT = [{ id: 'af1', codigo: 'AF-001', nombre: 'Nevera exhibidora', categoria: 'Equipos', ubicacion: 'Tienda', fecha_compra: mesesAtras(12), costo: 60000, vida_util_meses: 60, valor_residual: 6000, estado: 'activo' },
      { id: 'af2', nombre: 'Estante viejo', categoria: 'Mobiliario', fecha_compra: mesesAtras(100), costo: 5000, vida_util_meses: 60, valor_residual: 0, estado: 'baja' }];
    const s = await abrir(b, w); const page = s.page; await page.waitForTimeout(1200);
    await page.evaluate(() => window.nxPosTab('reportes')); await page.waitForTimeout(1800);
    await page.evaluate(() => window.nxRepInvAbrir()); await page.waitForTimeout(1300);
    const txt = () => page.evaluate(() => document.getElementById('riCuerpo').innerText.replace(/\s+/g, ' '));
    await page.evaluate(() => window.nxRepInvSet('tab', 'cambios')); await page.waitForTimeout(1300);
    let t = await txt();
    ok(/CAMBIOS 2/i.test(t) && /SUBIDAS 1/i.test(t) && /BAJADAS 1/i.test(t) && /Precio RD\$ 25\.00 RD\$ 30\.00 \+20 % Esterlin/i.test(t) && /Costo RD\$ 16\.00 RD\$ 12\.00 -25 %/i.test(t), `${w}px: Cambios de precio: antes, ahora, % y usuario`, t);
    await page.evaluate(() => window.nxRepInvSet('campo', 'costo')); t = await txt();
    ok(/CAMBIOS 1/i.test(t) && !/\+20 %/.test(t), `${w}px: filtro «Qué cambió»`);
    await page.evaluate(() => window.nxRepInvSet('grupo', 'act')); await page.waitForTimeout(1300); t = await txt();
    ok(/Nevera exhibidora Tienda .* RD\$ 60,000\.00 12 de 60 meses RD\$ 10,800\.00 RD\$ 49,200\.00/i.test(t) && !/Estante/i.test(t) && /VALOR EN LIBROS RD\$ 49,200\.00/i.test(t), `${w}px: Activos: depreciación 12 de 60 meses = 10,800 → en libros 49,200; el de baja no sale`, t.slice(0, 400));
    await page.evaluate(() => window.nxRepInvSet('baja', true)); t = await txt();
    ok(/Estante viejo \(de baja\) .* 60 de 60 meses RD\$ 5,000\.00 RD\$ 0\.00/i.test(t), `${w}px: «Incluir dados de baja» y tope de depreciación en la vida útil`, t.slice(0, 500));
    ok(/TOTAL GENERAL RD\$ 60,000\.00 RD\$ 10,800\.00 RD\$ 49,200\.00/i.test(t) && /ACTIVOS EN USO 1/i.test(t), `${w}px: los dados de baja se ven pero no suman al total`, t.slice(-200));
    // Alta
    await page.evaluate(() => window.nxActivoForm('')); await page.waitForTimeout(500);
    const med = await page.evaluate(() => { const i = document.getElementById('afNom'), g = document.getElementById('afGuardar'); return { h: Math.round(i.getBoundingClientRect().height), fs: getComputedStyle(i).fontSize, btn: Math.round(g.getBoundingClientRect().height), ancho: document.documentElement.scrollWidth <= window.innerWidth + 1, foco: document.activeElement && document.activeElement.id }; });
    ok(med.h >= 48 && med.fs === '16px' && med.btn >= 54 && med.ancho, `${w}px: ficha del activo: campos 48 px / 16 px, botón 54 px, sin desborde`, med);
    if (OUT) await page.screenshot({ path: `${OUT}/activo-form-${w}.png` });
    await page.evaluate(() => window.nxActivoGuardar('')); await page.waitForTimeout(300);
    ok(await page.evaluate(() => !!document.getElementById('nxActivo')) && !s.pedidos.some(p => p.t === 'pos_activos_fijos' && p.m === 'POST'), `${w}px: sin nombre no guarda`);
    await page.evaluate(() => { const f = (id, v) => { document.getElementById(id).value = v; }; f('afNom', 'Laptop caja'); f('afCat', 'Computadoras'); f('afCos', '45,000.50'); f('afVid', '3'); f('afRes', '5000'); });
    await page.evaluate(() => window.nxActivoGuardar('')); await page.waitForTimeout(1500);
    const post = s.pedidos.find(p => p.t === 'pos_activos_fijos' && p.m === 'POST');
    ok(post && post.body.nombre === 'Laptop caja' && post.body.costo === 45000.5 && post.body.vida_util_meses === 36 && post.body.valor_residual === 5000 && !('organizacion_id' in post.body), `${w}px: guarda el activo (3 años = 36 meses; la empresa la pone la base)`, post && post.body);
    t = await txt(); ok(/Laptop caja/i.test(t) && !(await page.evaluate(() => !!document.getElementById('nxActivo'))), `${w}px: aparece en la lista y la ficha se cierra`);
    // Editar y dar de baja
    await page.evaluate(() => document.querySelector('.nxRi .ritab .ric').click()); await page.waitForTimeout(500);
    ok(await page.evaluate(() => /Editar activo/i.test(document.getElementById('nxActivo').innerText) && /Dar de baja/i.test(document.getElementById('nxActivo').innerText)), `${w}px: tocar una fila abre «Editar activo» con «Dar de baja»`);
    await page.evaluate(() => { const b2 = [...document.querySelectorAll('#nxActivo button')].find(x => /Dar de baja/i.test(x.innerText)); b2.click(); }); await page.waitForTimeout(1500);
    const pat = s.pedidos.filter(p => p.t === 'pos_activos_fijos' && p.m === 'PATCH').pop();
    ok(pat && pat.body.estado === 'baja' && !s.pedidos.some(p => p.t === 'pos_activos_fijos' && p.m === 'DELETE'), `${w}px: dar de baja cambia el estado; nunca borra`, pat && pat.body);
    if (OUT) await page.screenshot({ path: `${OUT}/activos-${w}.png` });
    // «Agregar costo»: RD$ 100 entre 10 unidades → costo 15 → 25
    await page.evaluate(() => window.nxRepInvSet('tab', 'costos')); await page.waitForTimeout(1300); t = await txt();
    ok(/Aún no hay costos agregados/i.test(t) && await page.evaluate(() => [...document.querySelectorAll('.nxRi .riacc button')].some(x => /Costo/i.test(x.innerText))), `${w}px: Costos agregados: vacío con su botón «+ Costo»`, t);
    await page.evaluate(() => window.nxCostoForm()); await page.waitForTimeout(400);
    await page.evaluate(() => window.nxCostoGuardar()); await page.waitForTimeout(300);
    ok(!s.pedidos.some(p => p.t === 'rpc/pos_agregar_costo'), `${w}px: sin artículo ni monto no envía nada`);
    await page.evaluate(() => window.nxArtPicker('caArtSlot')); await page.waitForTimeout(250); await page.evaluate(() => window.nxProdPickFiltrar('agua')); await page.waitForTimeout(150);
    await page.click('#caArtSlot .nxPpkIt'); await page.click('#caArtSlot .nxPpkElegir'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.getElementById('caArt').value === 'A-01 · Agua purificada' && /Agua purificada/i.test(document.getElementById('caArtSlotTxt').textContent)), `${w}px: el artículo se elige con el buscador de Factura`);
    await page.evaluate(() => { const f = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); }; f('caMon', '100'); f('caMot', 'Reacondicionado'); });
    const vista = await page.evaluate(() => document.getElementById('caVista').innerText.replace(/\s+/g, ' '));
    ok(/10 en existencia · \+RD\$ 10\.00 c\/u/i.test(vista) && /RD\$ 15\.00 → RD\$ 25\.00/.test(vista), `${w}px: antes de guardar muestra el reparto: +RD$ 10 c/u, costo 15 → 25`, vista);
    const cm = await page.evaluate(() => { const i = document.querySelector('#caArtSlot button.scan'), g = document.getElementById('caGuardar'); return { h: Math.round(i.getBoundingClientRect().height), fs: getComputedStyle(document.getElementById('caMon')).fontSize, btn: Math.round(g.getBoundingClientRect().height) }; });
    ok(cm.h >= 48 && cm.fs === '16px' && cm.btn >= 54, `${w}px: ficha de costo: 48 px / 16 px, botón 54 px`, cm);
    if (OUT) await page.screenshot({ path: `${OUT}/costo-form-${w}.png` });
    const n9 = s.pedidos.length; await page.evaluate(() => window.nxCostoGuardar()); await page.waitForTimeout(2200);
    const nv9 = s.pedidos.slice(n9), rpc = nv9.find(p => p.t === 'rpc/pos_agregar_costo');
    ok(rpc && rpc.body.p_producto === 'p1' && rpc.body.p_monto === 100 && rpc.body.p_metodo === 'efectivo' && rpc.body.p_motivo === 'Reacondicionado', `${w}px: llama al servidor con artículo, monto, motivo y pago`, rpc && rpc.body);
    const li9 = nv9.filter(p => p.t === 'pos_asiento_lineas' && p.m === 'POST').flatMap(p => Array.isArray(p.body) ? p.body : [p.body]);
    ok(li9.some(l => l.cuenta_codigo === '1104' && Number(l.debito) === 100) && li9.some(l => l.cuenta_codigo === '1101' && Number(l.credito) === 100), `${w}px: asiento Debe Inventario 100 / Haber Caja 100`, li9);
    const mv9 = nv9.find(p => p.t === 'pos_caja_movimientos' && p.m === 'POST');
    ok(mv9 && mv9.body.tipo === 'salida' && Number(mv9.body.monto) === 100, `${w}px: en efectivo sale de la caja abierta`, mv9 && mv9.body);
    t = await txt();
    ok(/Agua purificada Reacondicionado 10 RD\$ 100\.00 RD\$ 15\.00 RD\$ 25\.00 Efectivo/i.test(t), `${w}px: el reporte lista el costo agregado`, t.slice(0, 400));
    ok(nv9.filter(p => p.t === 'rpc/pos_agregar_costo').length === 1 && !nv9.some(p => p.t === 'pos_productos' && p.m !== 'GET'), `${w}px: una sola llamada; el costo lo cambia el servidor, no la pantalla`);
    if (OUT) await page.screenshot({ path: `${OUT}/costos-${w}.png` });
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
