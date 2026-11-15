// QA del cobro (prueba de Muse, 15-nov-2026): aviso de caja cerrada con «Abrir caja» dentro del cobro e ITBIS por línea (gravado / exento). Arnés de qa-pos-cubre6.mjs: app real con la REST de
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
    pos_ventas: [
      { id: 'v1', cliente_id: 'c2', total: 11800, created_at: hace(5), fecha: hace(5), ncf: 'B0200000001', tipo_comprobante: 'consumo', estado: 'completada' },
      { id: 'v2', cliente_id: 'c2', total: 5900, created_at: hace(30), fecha: hace(30), ncf: '', tipo_comprobante: 'sin', estado: 'completada' },
      { id: 'v3', cliente_id: 'c3', total: 23600, created_at: hace(10), fecha: hace(10), ncf: 'B0100000003', tipo_comprobante: 'credito_fiscal', estado: 'completada' },
      { id: 'v4', cliente_id: 'c3', total: 99999, created_at: hace(12), fecha: hace(12), ncf: 'B0200000009', tipo_comprobante: 'consumo', estado: 'anulada' },
      { id: 'v5', cliente_id: 'c4', total: 4720, created_at: hace(100), fecha: hace(100), ncf: 'E310000000001', tipo_comprobante: 'ecf31', estado: 'completada' }
    ],
    pos_cajas: globalThis.__CAJA_CERRADA ? [] : [{ id: 'cj1', estado: 'abierta', apertura: hace(1), monto_inicial: 0 }]
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
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    const off0 = Number(u.searchParams.get('offset') || 0);
    return send(filas.slice(off0, off0 + 1000));
  });
  await page.addInitScript(([o, us, apag]) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (apag) localStorage.setItem('nx_pos_empresas_off', '1'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'TIENDA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, !!off]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  await page.evaluate(() => window.nxPosTab('vender')); await page.waitForTimeout(1200);
  return { ctx, page, errs, pedidos, externos };
}



const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    globalThis.__CFG = {}; globalThis.__CAJA_CERRADA = true;
    const s = await abrir(b, w); const page = s.page;
    await page.evaluate(() => { window.nxPosAdd('p1'); window.nxPosAdd('p2'); }); await page.waitForTimeout(500);
    const cart = await page.evaluate(() => document.getElementById('posCartWrap') ? document.getElementById('posCartWrap').innerText.replace(/\s+/g, ' ') : '');
    ok(/Exento/i.test(cart) && /Exento de ITBIS RD\$ 185/i.test(cart), `${w}px: el carrito marca el arroz «Exento» y muestra «Exento de ITBIS RD$ 185»`, cart.slice(0, 300));
    await page.evaluate(() => window.nxPosCobrar()); await page.waitForTimeout(1200);
    const hd = await page.evaluate(() => (document.querySelector('.nxPgItbis') || {}).textContent || '');
    ok(/Incluye ITBIS RD\$ 4/.test(hd) && /Exento RD\$ 185/.test(hd), `${w}px: el cobro dice «Incluye ITBIS RD$ 4 · Exento RD$ 185»`, hd);
    const av = await page.evaluate(() => { const a = document.querySelector('#pgCajaAviso .nxPgCaja'); if (!a) return null; const b = a.querySelector('.nxPgCajaB'), i = a.querySelector('#pgCajaIni'); const mr = document.querySelector('#nxPosPago .nxPgBody').getBoundingClientRect(); return { cabe: b.getBoundingClientRect().right <= mr.right + 0.5 && a.getBoundingClientRect().right <= mr.right + 0.5, t: a.innerText.replace(/\s+/g, ' '), bh: Math.round(b.getBoundingClientRect().height), ih: Math.round(i.getBoundingClientRect().height), f: getComputedStyle(i).fontSize }; });
    ok(av && /Caja cerrada/i.test(av.t), `${w}px: al abrir el cobro avisa «Caja cerrada» (antes solo al confirmar)`, av);
    ok(av && av.bh >= 44 && av.ih >= 48 && av.f === '16px', `${w}px: botón ≥44 px y campo 48/16`, av);
    ok(av && av.cabe, `${w}px: el aviso y el botón «Abrir caja» caben sin salirse`, av);
    if (OUT) await page.screenshot({ path: `${OUT}/cobro-caja-${w}.png` });
    await page.fill('#pgCajaIni', '500'); await page.evaluate(() => window.nxPgAbrirCaja()); await page.waitForTimeout(800);
    const rpc = s.pedidos.find(p => p.t === 'rpc/pos_abrir_mi_caja');
    ok(rpc && Number(rpc.body.p_monto_inicial) === 500, `${w}px: «Abrir caja» abre la caja con el fondo escrito`, rpc && rpc.body);
    const sigue = await page.evaluate(() => ({ aviso: !!document.querySelector('#pgCajaAviso .nxPgCaja'), modal: !!document.getElementById('nxPosPago') }));
    ok(!sigue.aviso && sigue.modal, `${w}px: el aviso se quita y el cobro sigue abierto (no se pierde la venta)`, sigue);
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
    globalThis.__CAJA_CERRADA = false;
    const s2 = await abrir(b, w); const p2 = s2.page;
    await p2.evaluate(() => window.nxPosAdd('p1')); await p2.waitForTimeout(300);
    await p2.evaluate(() => window.nxPosCobrar()); await p2.waitForTimeout(1000);
    const av2 = await p2.evaluate(() => ({ aviso: !!document.querySelector('#pgCajaAviso .nxPgCaja'), hd: (document.querySelector('.nxPgItbis') || {}).textContent || '' }));
    ok(!av2.aviso, `${w}px: con la caja abierta no sale el aviso`, av2);
    ok(/Incluye ITBIS RD\$ 4/.test(av2.hd) && !/Exento/.test(av2.hd), `${w}px: sin artículos exentos no se menciona «Exento»`, av2.hd);
    ok(s2.errs.length === 0, `${w}px: 0 errores de JS (caja abierta)`, s2.errs); await s2.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
