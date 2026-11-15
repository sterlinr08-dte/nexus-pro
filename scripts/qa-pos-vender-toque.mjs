// QA de Vender (prueba de Muse, 15-nov-2026): existencia visible en la lista angosta y agregar con un toque (los de IMEI abren la ventana). Arnés de qa-pos-cubre6.mjs: app real con la REST de
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
    pos_productos: [{ id: 'p1', nombre: 'Agua purificada', precio: 25, costo: 14, stock: 50, itbis: true, activo: true, tipo: 'producto' }, { id: 'p2', nombre: 'Arroz selecto', precio: 185, costo: 150, stock: 3, stock_min: 5, itbis: false, activo: true, tipo: 'producto' }, { id: 'p3', nombre: 'Teléfono con IMEI', precio: 9000, costo: 7000, stock: 2, itbis: true, activo: true, tipo: 'producto', serial: true }],
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
  for (const w of [390, 500, 1280]) {
    globalThis.__CFG = {}; globalThis.__CAJA_CERRADA = false;
    const s = await abrir(b, w); const page = s.page;
    const filas = await page.evaluate(() => [...document.querySelectorAll('#posGrid .nxPosCard')].map(c => ({ id: c.dataset.pid, txt: c.innerText.replace(/\s+/g, ' '), stkVis: [...c.querySelectorAll('.vstk,.vstkm')].some(e => e.offsetParent !== null && /und|agotado|servicio/i.test(e.textContent)) })));
    ok(filas.length === 3 && filas.every(f => f.stkVis), `${w}px: cada artículo muestra su existencia a la vista`, filas);
    const arroz = filas.find(f => f.id === 'p2');
    ok(arroz && /bajo: 3 und/i.test(arroz.txt), `${w}px: el arroz avisa «Bajo: 3 und»`, arroz && arroz.txt);
    await page.click('#posGrid .nxPosCard[data-pid="p1"]'); await page.waitForTimeout(400);
    await page.click('#posGrid .nxPosCard[data-pid="p1"]'); await page.waitForTimeout(400);
    let est = await page.evaluate(() => ({ modal: !!document.querySelector('.overlay.open #ppkQ, #nxProdPick, .nxPpk'), cart: (document.getElementById('posCartWrap') || {}).innerText || '' }));
    const av = await page.evaluate(() => { const e = document.getElementById('nxVAviso'); return e ? { n: document.querySelectorAll('#nxVAviso').length, t: e.innerText.replace(/\s+/g, ' '), on: e.classList.contains('on') } : null; });
    ok(av && av.n === 1 && av.on && /\+1 Agua purificada/i.test(av.t) && /2 en el carrito/i.test(av.t), `${w}px: un solo aviso que se actualiza («+1 Agua purificada · 2 en el carrito»)`, av);
    ok(!est.modal, `${w}px: tocar un artículo no abre la ventana «Buscar artículo»`, est.modal);
    ok(/carrito \(2\)/i.test(est.cart) && /agua purificada/i.test(est.cart), `${w}px: dos toques = 2 unidades en el carrito`, est.cart.replace(/\s+/g, ' ').slice(0, 160));
    for (let i = 0; i < 4; i++) { await page.click('#posGrid .nxPosCard[data-pid="p2"]'); await page.waitForTimeout(250); }
    est = await page.evaluate(() => (document.getElementById('posCartWrap') || {}).innerText || '');
    ok(/carrito \(5\)/i.test(est), `${w}px: no deja pasar de la existencia (arroz: 3 de 4 toques)`, est.replace(/\s+/g, ' ').slice(0, 160));
    await page.click('#posGrid .nxPosCard[data-pid="p3"] .vthumb'); await page.waitForTimeout(500);
    const abre = await page.evaluate(() => !!document.getElementById('ppkQ'));
    ok(abre, `${w}px: un artículo con IMEI sí abre la ventana para elegirlo`, abre);
    if (OUT) await page.screenshot({ path: `${OUT}/vender-toque-${w}.png` });
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
