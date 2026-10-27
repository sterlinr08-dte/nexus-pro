// QA del botón «Cubrir 6 % del ITBIS» en la caja (27-oct-2026). Basado en qa-ecf-caja.mjs. App real con la REST de Supabase y la Edge
// ecf-mseller SIMULADAS (nunca toca la base real ni MSeller).
// Uso (desde la raíz): python3 -m http.server 8944 &   node scripts/qa-ecf-caja.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';
const VID = '00000000-0000-4000-8000-0000000000a1';

function db(conE) {
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'PIZZERÍA DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR', ecf_rnc: conE ? '131880657' : null, ecf_razon_social: conE ? 'Pizzería Demo SRL' : null, ecf_direccion: conE ? 'Calle 1' : null }],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_productos: [{ id: 'p1', nombre: 'Celular', precio: 11800, costo: 6000, stock: 50, itbis: true, activo: true, tipo: 'producto' }, { id: 'p2', nombre: 'Servicio exento', precio: 1000, costo: 0, stock: 50, itbis: false, activo: true, tipo: 'servicio' }, { id: 'p3', nombre: 'Precio fijo', precio: 1180, costo: 500, stock: 50, itbis: true, activo: true, tipo: 'producto', no_descuento: true }],
    pos_clientes: [{ id: 'c1', nombre: 'Juan Pérez', cedula: '', activo: true, es_cliente: true }, { id: 'c2', nombre: 'Empresa SRL', cedula: '1-31-88065-7', tipo_persona: 'juridica', activo: true, es_cliente: true }],
    pos_ncf_secuencias: conE
      ? [{ id: 's1', tipo: 'B02', prefijo: 'B02', desde: 1, hasta: 100, actual: 5, activo: true }, { id: 's2', tipo: 'E32', prefijo: 'E32', desde: 1, hasta: 500, actual: 1, activo: true }]
      : [{ id: 's1', tipo: 'B02', prefijo: 'B02', desde: 1, hasta: 100, actual: 5, activo: true }],
    pos_ventas: [], pos_cajas: [{ id: 'cj1', estado: 'abierta', apertura: '2026-10-26T12:00:00Z', monto_inicial: 0 }]
  };
}

async function abrir(b, conE, ancho, edge) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 860 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const pedidos = []; const D = db(conE);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    if (!/supabase\.co$/.test(u.hostname)) return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : 'application/javascript', body: '' });
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    if (u.pathname === '/functions/v1/ecf-mseller') { pedidos.push({ m: 'EDGE', t: 'ecf', body }); return send(...edge(body)); }
    if (u.pathname.startsWith('/auth/')) return send({});
    if (!u.pathname.startsWith('/rest/v1/')) return send({ ok: true });
    const t = u.pathname.slice(9);
    pedidos.push({ m: req.method(), t, q: u.search, body });
    if (t === 'rpc/pos_registrar_venta_atomica') {
      const v = Object.assign({ id: VID, numero: 7, fecha: '2026-10-26T15:00:00Z', organizacion_id: ORG }, body.p_venta);
      D.pos_ventas.push(v);
      return send({ ok: true, venta: v, items: body.p_items.map((it, i) => Object.assign({ id: 'it' + i }, it)) });
    }
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() === 'POST' && /^pos_(devolucion(es|_items)|notas_debito)$/.test(t)) {
      const filas = (Array.isArray(body) ? body : [body]).map((x, i) => Object.assign({ id: (t === 'pos_devoluciones' ? '00000000-0000-4000-8000-0000000000d' : '00000000-0000-4000-8000-0000000000e') + ((D[t] || []).length + i) }, x));
      D[t] = (D[t] || []).concat(filas); return send(filas, 201);
    }
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    return send(filas.slice(0, 1000));
  });
  await page.addInitScript(([o, us]) => { localStorage.setItem('nx_auth_mode', 'legacy'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'PIZZERÍA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  return { ctx, page, errs, pedidos, D };
}

const tot = page => page.evaluate(() => { const r = {}; document.querySelectorAll('#facResumen .tr').forEach(x => { const k = x.querySelector('span')?.textContent.trim(); r[k] = x.querySelector('b')?.textContent.trim(); }); const btn = document.querySelector('#facResumen .facCubre6'); r.btn = btn ? btn.textContent.trim() : null; r.on = btn ? btn.classList.contains('on') : null; r.h = btn ? btn.getBoundingClientRect().height : 0; return r; });
const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    const s = await abrir(b, false, w, () => [{ ok: true }, 200]); const page = s.page;
    await page.evaluate(() => window.nxPosTab('factura')); await page.waitForTimeout(1200);
    await page.evaluate(() => window.nxFacAdd('p1')); await page.waitForTimeout(400);
    let t = await tot(page);
    ok(/11,800/.test(t.Total) && t.btn && !t.on, `${w}px: sin botón tocado total 11,800`, t);
    ok(t.h >= 44, `${w}px: botón de 44 px o más`, t.h);
    await page.evaluate(() => window.nxFacCubre6()); await page.waitForTimeout(400);
    t = await tot(page);
    ok(/11,200/.test(t.Total) && t.on && /1,708/.test(t['ITBIS (18%)']), `${w}px: con el 6 % total 11,200 e ITBIS 1,708`, t);
    await page.evaluate(() => { window.nxFacAdd('p2'); window.nxFacAdd('p3'); }); await page.waitForTimeout(400);
    t = await tot(page);
    ok(/13,380/.test(t.Total), `${w}px: exento y «no permite descuento» quedan igual (11,200 + 1,000 + 1,180)`, t);
    if (OUT) { await page.evaluate(() => document.getElementById('facResumen').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await page.locator('#facResumen').screenshot({ path: OUT + `/cubre6-${w}.png` }); }
    await page.evaluate(() => window.nxFacCubre6()); await page.waitForTimeout(400);
    t = await tot(page);
    ok(/13,980/.test(t.Total) && !t.on, `${w}px: tocar otra vez lo quita`, t);
    await page.evaluate(() => window.nxFacCubre6()); await page.waitForTimeout(300);
    await page.evaluate(() => window.nxPosCobrar()); await page.waitForTimeout(900);
    await page.evaluate(() => { const e = document.getElementById('payEfe'); if (e) { e.value = '13380'; e.dispatchEvent(new Event('input', { bubbles: true })); } }); await page.waitForTimeout(300);
    await page.evaluate(() => window.nxPosConfirmar()); await page.waitForTimeout(2500);
    const rpc = s.pedidos.find(p => p.t === 'rpc/pos_registrar_venta_atomica');
    const it1 = rpc && rpc.body.p_items.find(x => x.producto_id === 'p1');
    ok(rpc && Number(rpc.body.p_venta.total) === 13380 && it1 && it1.descuento === 600 && it1.importe === 11200, `${w}px: la venta se guarda con descuento 600 en la línea y total 13,380`, rpc && { total: rpc.body.p_venta.total, it1 });
    ok(!s.errs.length, `${w}px: sin errores de JS`, s.errs);
    await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`); process.exit(fail ? 1 : 0);
