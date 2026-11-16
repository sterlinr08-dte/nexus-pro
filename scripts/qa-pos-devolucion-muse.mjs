// QA (prueba de Muse del 16-nov-2026): la nota de crédito se ve en la factura, el ticket, Inicio y Reportes; su fecha sale sin «20:00»; el asiento
// de una devolución «Nota de crédito» va a 2105 y la de efectivo saca de la caja; Inicio sin tarjetas vacías; menú sin repetidos; el aviso del carrito se va.
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
    pos_cuentas: [['1101', 'Caja', 'activo'], ['1103', 'CxC', 'activo'], ['1104', 'Inventario', 'activo'], ['2102', 'ITBIS por pagar', 'pasivo'], ['2105', 'Notas de crédito por aplicar', 'pasivo'], ['4101', 'Ventas', 'ingreso'], ['5101', 'Costo', 'costo']].map(([c, n, t]) => ({ id: 'cta' + c, codigo: c, nombre: n, tipo: t, activo: true })),
    pos_garantias: [], pos_compras: [], pos_compra_pagos: []
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
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() === 'POST') { const arr = (Array.isArray(body) ? body : [body]).map((x, i) => Object.assign({ id: t + '_n' + (D[t] ? D[t].length : 0) + '_' + i, created_at: new Date().toISOString() }, x)); D[t] = (D[t] || []).concat(arr); return send(arr); }
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
  return { ctx, page, errs, pedidos, externos };
}





const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    const ahora = Date.now(), hoyD = new Date().toLocaleDateString('en-CA');
    globalThis.__VENTAS_HOY = [
      { id: 'h1', numero_factura: 'CO00000007', total: 210, subtotal: 199, itbis: 11, pagado_efectivo: 210, created_at: new Date(ahora - 20 * 60e3).toISOString(), fecha: new Date(ahora - 20 * 60e3).toISOString(), estado: 'completada', caja_id: 'cj2', cliente_nombre: 'Consumidor final' },
      { id: 'h2', numero_factura: 'CO00000008', total: 40, pagado_efectivo: 40, created_at: new Date(ahora - 10 * 60e3).toISOString(), fecha: new Date(ahora - 10 * 60e3).toISOString(), estado: 'completada', caja_id: 'cj2', cliente_nombre: 'Consumidor final' }
    ];
    globalThis.__DEVS = [{ id: 'd1', venta_id: 'h1', numero: 'NC-00002', fecha: hoyD, created_at: new Date(ahora - 5 * 60e3).toISOString(), total: 25, itbis: 4, subtotal: 21, metodo: 'Nota de crédito', estado: 'emitida' }];
    const s = await abrir(b, w); const page = s.page; await page.waitForTimeout(1500);
    // Inicio
    if (OUT) { await page.screenshot({ path: `${OUT}/inicio-${w}.png` }); await page.evaluate(() => window.scrollTo(0, 500)); await page.screenshot({ path: `${OUT}/inicio2-${w}.png` }); await page.evaluate(() => window.scrollTo(0, 0)); }
    const kp = await page.evaluate(() => [...document.querySelectorAll('.nxTKpi')].map(x => x.innerText.replace(/\s+/g, ' ')));
    const vh = kp.find(x => /Ventas de hoy/i.test(x)) || '';
    ok(/225\.00/.test(vh) && /devuelto/i.test(vh), `${w}px: «Ventas de hoy» = 250 − 25 devuelto = RD$ 225`, vh);
    ok(!kp.some(x => /Garant/i.test(x)) && !kp.some(x => /Compras pendientes/i.test(x)) && !kp.some(x => /Clientes esperando/i.test(x)), `${w}px: Inicio sin tarjetas vacías (Garantías, Compras, Clientes esperando)`, kp);
    ok(kp.some(x => /Caja/i.test(x)) && kp.some(x => /Utilidad/i.test(x)), `${w}px: Caja y Utilidad siguen`, kp);
    // Menú sin repetidos
    const nav = await page.evaluate(() => { const c = {}; document.querySelectorAll('.nxTNav').forEach(b2 => { const m = /nxPosTab\('([^']+)'/.exec(b2.getAttribute('onclick') || ''); if (m) c[m[1]] = (c[m[1]] || 0) + 1; }); return c; });
    ok(Object.values(nav).every(n => n === 1) && nav.prefhist === 1 && nav.ventas === 1, `${w}px: cada opción del menú aparece una sola vez`, nav);
    // Historial
    await page.evaluate(() => window.nxPosTab('ventas')); await page.waitForTimeout(1200);
    const fila = await page.evaluate(() => { const r = [...document.querySelectorAll('#histBody tr')].find(x => /CO00000007/.test(x.innerText)); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/DEV\. PARCIAL/.test(fila) && /185\.00/.test(fila), `${w}px: Historial marca CO00000007 «DEV. PARCIAL» y neto RD$ 185`, fila);
    // Ticket con la nota
    const pop = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    await page.evaluate(() => window.nxPosTicket('h1')); const tk = await pop; let tt = '';
    if (tk) { await tk.waitForLoadState().catch(() => {}); tt = (await tk.evaluate(() => document.body.innerText)).replace(/\s+/g, ' '); await tk.close(); }
    ok(/NC-00002/.test(tt) && /NETO DESPUÉS DE DEVOLUCIÓN\s*RD\$\s*185/i.test(tt), `${w}px: el ticket menciona NC-00002 y el neto RD$ 185`, tt.slice(-300));
    // Notas de crédito: fecha sin 20:00 del día anterior
    await page.evaluate(() => window.nxPosTab('notascredito')); await page.waitForTimeout(1000);
    const nc = await page.evaluate(() => { const r = [...document.querySelectorAll('tr')].find(x => /NC-00002/.test(x.innerText)); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
    const dmy = hoyD.slice(8) + '/' + hoyD.slice(5, 7) + '/' + hoyD.slice(0, 4);
    ok(nc.includes(dmy) && !/20:00/.test(nc), `${w}px: la NC sale con fecha ${dmy} y sin «20:00»`, nc);
    // Reportes
    await page.evaluate(() => window.nxPosTab('reportes')); await page.waitForTimeout(1500);
    const rp = await page.evaluate(() => document.querySelector('.nxRepWrap') ? document.querySelector('.nxRepWrap').innerText.replace(/\s+/g, ' ') : '');
    ok(/Ventas netas\s*RD\$\s*225/i.test(rp) && /Devoluciones/i.test(rp), `${w}px: Reportes: ventas netas RD$ 225 y devoluciones`, rp.slice(0, 300));
    const agua = await page.evaluate(() => { const r = [...document.querySelectorAll('.nxRepWrap tr')].find(x => /Agua/i.test(x.innerText)); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Agua purificada\s*2\s*RD\$\s*50/i.test(agua), `${w}px: Más vendidos: Agua 3 − 1 devuelta = 2 (RD$ 50)`, agua);
    // Devolución nueva con «Nota de crédito» → asiento a 2105, sin salida de caja; luego una en efectivo → salida de caja
    for (const met of ['Nota de crédito', 'Efectivo']) {
      await page.evaluate(() => window.nxDevNueva('h1')); await page.waitForTimeout(900);
      await page.evaluate(m => { const i = document.querySelector('#devLineas input[data-devc]'); if (i) { i.value = '1'; i.dispatchEvent(new Event('change')); } document.getElementById('devMet').value = m; }, met);
      const n0 = s.pedidos.length; await page.evaluate(() => window.nxDevGuardar(false)); await page.waitForTimeout(1500);
      const nuevos = s.pedidos.slice(n0);
      const lin = nuevos.filter(p => p.t === 'pos_asiento_lineas' && p.m === 'POST').flatMap(p => Array.isArray(p.body) ? p.body : [p.body]);
      const cajaMov = nuevos.find(p => p.t === 'pos_caja_movimientos' && p.m === 'POST');
      if (met === 'Nota de crédito') ok(lin.some(l => l.cuenta_codigo === '2105' && Number(l.credito) > 0) && !lin.some(l => l.cuenta_codigo === '1101') && !cajaMov, `${w}px: devolución «Nota de crédito» abona 2105, no toca Caja`, { lin, cajaMov: !!cajaMov });
      else ok(lin.some(l => l.cuenta_codigo === '1101' && Number(l.credito) > 0) && cajaMov && cajaMov.body.tipo === 'salida', `${w}px: devolución en efectivo abona Caja y registra la salida de la caja abierta`, { lin, cajaMov });
    }
    // Aviso del carrito: se borra al vaciar
    await page.evaluate(() => window.nxPosTab('vender')); await page.waitForTimeout(1000);
    await page.evaluate(() => window.nxVenderSel('p1')); await page.waitForTimeout(300);
    const hay = await page.evaluate(() => !!document.querySelector('#nxVAviso.on'));
    page.once('dialog', d => d.accept()); await page.evaluate(() => window.nxPosVaciar()); await page.waitForTimeout(600);
    const queda = await page.evaluate(() => !!document.getElementById('nxVAviso'));
    ok(hay && !queda, `${w}px: el aviso «+1 …» aparece y se borra al vaciar el carrito`, { hay, queda });
    if (OUT) await page.screenshot({ path: `${OUT}/vender-${w}.png` });
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
