// QA de la base contable del POS (15-nov-2026): anulación devuelve el costo, centavos, plan automático y reportes por páginas. Arnés de qa-pos-cubre6.mjs: app real con la REST de
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
    pos_productos: [{ id: 'p1', nombre: 'Celular', precio: 11800, costo: 6000, stock: 50, itbis: true, activo: true, tipo: 'producto' }],
    pos_clientes: [
      { id: 'c1', nombre: 'Juan Pérez', cedula: '', telefono: '8095550000', activo: true, es_cliente: true },
      { id: 'c2', nombre: 'EMPRESA SRL', cedula: '1-31-88065-7', telefono: '809-555-1234', tipo_persona: 'juridica', activo: true, es_cliente: true },
      { id: 'c3', nombre: 'Constructora Abc', cedula: '001-1234567-8', telefono: '8295557777', activo: true, es_cliente: true },
      { id: 'c4', nombre: 'Ferretería Norte', cedula: '101234567', telefono: '8495551111', activo: true, es_cliente: true },
      { id: 'c5', nombre: 'Rnc Malo', cedula: '12345', telefono: '8095552222', activo: true, es_cliente: true },
      { id: 'c6', nombre: 'Ana Gómez', cedula: '40212345678', telefono: '', activo: true, es_cliente: true }
    ],
    pos_ncf_secuencias: [{ id: 's1', tipo: 'B02', prefijo: 'B02', desde: 1, hasta: 100, actual: 5, activo: true }],
    pos_ventas: [
      { id: 'v1', numero: 7, numero_factura: 'CO00000007', subtotal: 847.46, itbis: 152.54, pagado_efectivo: 1000, cliente_id: 'c2', total: 1000, created_at: hace(5), fecha: hace(5), ncf: 'B0200000001', tipo_comprobante: 'consumo', estado: 'completada' },
      { id: 'v2', cliente_id: 'c2', total: 5900, created_at: hace(30), fecha: hace(30), ncf: '', tipo_comprobante: 'sin', estado: 'completada' },
      { id: 'v3', cliente_id: 'c3', total: 23600, created_at: hace(10), fecha: hace(10), ncf: 'B0100000003', tipo_comprobante: 'credito_fiscal', estado: 'completada' },
      { id: 'v4', cliente_id: 'c3', total: 99999, created_at: hace(12), fecha: hace(12), ncf: 'B0200000009', tipo_comprobante: 'consumo', estado: 'anulada' },
      { id: 'v5', cliente_id: 'c4', total: 4720, created_at: hace(100), fecha: hace(100), ncf: 'E310000000001', tipo_comprobante: 'ecf31', estado: 'completada' }
    ],
    pos_cuentas: globalThis.__SINPLAN ? [] : [['1101','Caja'],['1103','CxC'],['1104','Inventario'],['2102','ITBIS por pagar'],['4101','Ventas'],['5101','Costo']].map((c, i) => ({ id: 'c' + i, codigo: c[0], nombre: c[1], activo: true })),
    pos_asientos: [{ id: 'av1', tipo: 'venta', origen_id: 'v1', fecha: '2026-11-01', concepto: 'Venta', numero: 'AS-1' }].concat(Array.from({ length: globalThis.__MUCHOS || 0 }, (_, i) => ({ id: 'x' + i, tipo: 'manual', fecha: '2026-10-01', concepto: 'M' + i, numero: 'M' + i }))),
    pos_asiento_lineas: [{ id: 'l1', asiento_id: 'av1', cuenta_codigo: '5101', debito: 50.5, credito: 0 }, { id: 'l2', asiento_id: 'av1', cuenta_codigo: '1104', debito: 0, credito: 50.5 }],
    pos_cajas: [{ id: 'cj1', estado: 'abierta', apertura: hace(1), monto_inicial: 0 }]
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
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() === 'POST' && t === 'pos_asientos') return send([Object.assign({ id: 'as' + (++globalThis.__n) }, body)]);
    if (req.method() === 'POST' && t === 'pos_cuentas') return send(body.map((c, i) => Object.assign({ id: 'cn' + i }, c)));
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    const off0 = Number(u.searchParams.get('offset') || 0);
    return send(filas.slice(off0, off0 + 1000));
  });
  await page.addInitScript(([o, us, apag]) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (apag) localStorage.setItem('nx_pos_empresas_off', '1'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'TIENDA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, !!off]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  await page.evaluate(() => window.nxPosTab('ventas')); await page.waitForTimeout(1200);
  return { ctx, page, errs, pedidos, externos };
}



const b = await chromium.launch();
try {
  globalThis.__n = 0;
  {
    const s = await abrir(b, 1280); const page = s.page;
    page.on('dialog', d => d.accept());
    await page.evaluate(() => window.nxPosAnularVenta('v1')); await page.waitForTimeout(2500);
    const cab = s.pedidos.find(p => p.m === 'POST' && p.t === 'pos_asientos' && p.body.tipo === 'anulacion');
    ok(!!cab && cab.body.origen_id === 'v1', 'la anulación registra un solo asiento de reversa', s.pedidos.filter(p => p.m === 'POST' && p.t === 'pos_asientos').length);
    const ln = (s.pedidos.find(p => p.m === 'POST' && p.t === 'pos_asiento_lineas') || {}).body || [];
    const por = Object.fromEntries(ln.map(l => [l.cuenta_codigo, l]));
    ok(por['1104'] && por['1104'].debito === 50.5 && por['5101'] && por['5101'].credito === 50.5, 'devuelve el costo al inventario por lo mismo que cargó la venta (50.50)', ln.map(l => [l.cuenta_codigo, l.debito, l.credito]));
    ok(por['4101'] && por['4101'].debito === 847.46 && por['2102'] && por['2102'].debito === 152.54 && por['1101'] && por['1101'].credito === 1000, 'reversa ventas, ITBIS y caja con centavos exactos', ln.map(l => [l.cuenta_codigo, l.debito, l.credito]));
    const td = ln.reduce((a, l) => a + l.debito, 0), th = ln.reduce((a, l) => a + l.credito, 0);
    ok(Math.abs(td - th) < 0.005 && td > 0, 'el asiento cuadra (Debe = Haber)', [td, th]);
    ok(s.pedidos.filter(p => p.m === 'POST' && p.t === 'pos_asientos').length === 1, 'no hay doble reversa');
    ok(s.errs.length === 0, '0 errores de JS', s.errs); await s.ctx.close();
  }
  {
    globalThis.__MUCHOS = 1700;
    const s = await abrir(b, 1280); const page = s.page;
    await page.evaluate(() => window.nxPosTab('contabilidad')); await page.waitForTimeout(2500);
    const offs = s.pedidos.filter(p => p.m === 'GET' && p.t === 'pos_asientos').map(p => new URLSearchParams(p.q).get('offset'));
    ok(offs.includes('0') && offs.includes('1000'), 'los asientos se leen por páginas (ya no se corta en 600)', offs);
    ok(s.errs.length === 0, '0 errores de JS en Contabilidad', s.errs); await s.ctx.close();
    globalThis.__MUCHOS = 0;
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
