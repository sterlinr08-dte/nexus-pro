// QA de «Precios por cantidad» (parches-pos-volumen.js, 27-oct-2026). Arnés copiado de qa-pos-cubre6.mjs: app real con la REST de
// Supabase SIMULADA (nunca toca la base real).
// Uso (desde la raíz): python3 -m http.server 8944 &   NODE_PATH=/opt/node22/lib/node_modules node scripts/qa-pos-volumen.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';
const VID = '00000000-0000-4000-8000-0000000000a1';

function db(conCol) {
  const ref = { id: 'p1', nombre: 'Refresco', precio: 100, costo: 50, stock: 50, itbis: true, activo: true, tipo: 'producto', precio_minimo: 0 };
  const exe = { id: 'p2', nombre: 'Servicio exento', precio: 1000, costo: 0, stock: 50, itbis: false, activo: true, tipo: 'servicio' };
  if (conCol) { ref.precio_volumen = [{ desde: 2, precio: 90 }, { desde: 5, precio: 80 }]; exe.precio_volumen = null; }
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'COLMADO DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_niveles_precio: [{ id: 'n1', nombre: 'Detalle', orden: 1, es_default: true, activo: true }],
    pos_productos: [ref, exe],
    pos_clientes: [{ id: 'c1', nombre: 'Juan Pérez', cedula: '', activo: true, es_cliente: true }],
    pos_ncf_secuencias: [{ id: 's1', tipo: 'B02', prefijo: 'B02', desde: 1, hasta: 100, actual: 5, activo: true }],
    pos_ventas: [], pos_cajas: [{ id: 'cj1', estado: 'abierta', apertura: '2026-10-26T12:00:00Z', monto_inicial: 0 }]
  };
}

async function abrir(b, conCol, ancho) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 860 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const pedidos = []; const D = db(conCol);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    if (!/supabase\.co$/.test(u.hostname)) return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : 'application/javascript', body: '' });
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    const body = req.postData() ? JSON.parse(req.postData()) : null;
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
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    return send(filas.slice(0, 1000));
  });
  await page.addInitScript(([o, us]) => { localStorage.setItem('nx_auth_mode', 'legacy'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'COLMADO DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  return { ctx, page, errs, pedidos, D };
}

// Estado de la primera línea de la factura + totales
const lin = page => page.evaluate(() => {
  const r = {}; document.querySelectorAll('#facResumen .tr').forEach(x => { const k = x.querySelector('span')?.textContent.trim(); r[k] = x.querySelector('b')?.textContent.trim(); });
  const tr = document.querySelector('#facTabla tbody tr');
  const tag = tr && tr.querySelector('.nxVolTag'), sug = tr && tr.querySelector('.nxVolSug');
  r.precio = tr && tr.querySelector('input.pin') ? tr.querySelector('input.pin').value : null;
  r.cant = tr && tr.querySelector('.stp-in') ? tr.querySelector('.stp-in').value : null;
  r.tag = tag ? tag.textContent.trim() : null; r.sug = sug ? sug.textContent.trim() : null; r.sugH = sug ? sug.getBoundingClientRect().height : 0;
  return r;
});
const qty = (page, n) => page.evaluate(n => window.nxFacQtySet(0, n), n);
const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    const s = await abrir(b, true, w); const page = s.page;
    await page.evaluate(() => window.nxPosTab('factura')); await page.waitForTimeout(1200);
    await page.evaluate(() => window.nxFacAdd('p1')); await page.waitForTimeout(400);
    let t = await lin(page);
    ok(t.precio === '100' && !t.tag && /Total/.test(Object.keys(t).join()) && /100/.test(t.Total), `${w}px: 1 unidad a precio normal (RD$ 100)`, t);
    ok(t.sug && /Lleve 1 más y paga RD\$ 90\.00 c\/u/.test(t.sug), `${w}px: sugiere «Lleve 1 más y paga RD$ 90.00 c/u»`, t.sug);
    ok(Math.round(t.sugH) >= 44, `${w}px: la sugerencia mide 44 px o más`, t.sugH);
    await page.evaluate(() => document.querySelector('#facTabla .nxVolSug').click()); await page.waitForTimeout(400);
    t = await lin(page);
    ok(t.cant === '2' && t.precio === '90' && /desde 2/.test(t.tag || '') && /180/.test(t.Total), `${w}px: al tocar la sugerencia sube a 2 y el precio baja a 90 (total 180)`, t);
    await qty(page, 4); await page.waitForTimeout(300); t = await lin(page);
    ok(t.precio === '90' && /80\.00/.test(t.sug || ''), `${w}px: con 4 sigue en 90 y sugiere la escala de 5 (80)`, t);
    await qty(page, 5); await page.waitForTimeout(300); t = await lin(page);
    ok(t.precio === '80' && /desde 5/.test(t.tag || '') && !t.sug && /400/.test(t.Total), `${w}px: con 5 baja a 80 (total 400)`, t);
    await page.evaluate(() => window.nxFacQtyStep(0, -1)); await page.waitForTimeout(300); t = await lin(page);
    ok(t.precio === '90' && /desde 2/.test(t.tag || ''), `${w}px: al bajar a 4 vuelve a la escala de 2`, t);
    await qty(page, 1); await page.waitForTimeout(300); t = await lin(page);
    ok(t.precio === '100' && !t.tag, `${w}px: con 1 vuelve al precio normal`, t);
    if (OUT && w === 390) { await qty(page, 4); await page.waitForTimeout(300); await page.locator('#facTabla tbody tr').first().screenshot({ path: OUT + `/volumen-linea-${w}.png` }); await qty(page, 1); await page.waitForTimeout(200); }
    // Precio a mano: se respeta aunque cambie la cantidad
    await qty(page, 5); await page.waitForTimeout(200);
    await page.evaluate(() => window.nxFacPrecio(0, '85')); await page.waitForTimeout(300);
    await qty(page, 6); await page.waitForTimeout(300); t = await lin(page);
    ok(t.precio === '85' && !t.tag && !t.sug && /510/.test(t.Total), `${w}px: precio puesto a mano (85) se respeta con 6 unidades (total 510)`, t);
    // Combinación con «Cubrir 6 % del ITBIS» y descuento por línea
    await page.evaluate(() => { window.nxPosDel(0); window.nxFacRepaint(); window.nxFacAdd('p1'); }); await page.waitForTimeout(300);
    await qty(page, 5); await page.waitForTimeout(200);
    await page.evaluate(() => window.nxFacCubre6()); await page.waitForTimeout(400); t = await lin(page);
    ok(t.precio === '80' && /desde 5/.test(t.tag || '') && /380/.test(t.Total), `${w}px: escala 80 × 5 + Cubrir 6 % → total 380 (400 × 1.12/1.18)`, t);
    await page.evaluate(() => window.nxFacDesc(0, '10')); await page.waitForTimeout(300); t = await lin(page);
    ok(/342/.test(t.Total) && t.precio === '80', `${w}px: + 10 % de descuento por línea → 342 y el precio por cantidad se mantiene`, t);
    await page.evaluate(() => window.nxFacDesc(0, '0')); await page.waitForTimeout(200);
    await page.evaluate(() => window.nxFacAdd('p2')); await page.waitForTimeout(300); t = await lin(page);
    ok(/1,380/.test(t.Total), `${w}px: artículo sin escalas queda igual (380 + 1,000)`, t);
    // Guardar la venta
    await page.evaluate(() => window.nxPosCobrar()); await page.waitForTimeout(900);
    await page.evaluate(() => { const e = document.getElementById('payEfe'); if (e) { e.value = '1380'; e.dispatchEvent(new Event('input', { bubbles: true })); } }); await page.waitForTimeout(300);
    await page.evaluate(() => window.nxPosConfirmar()); await page.waitForTimeout(2500);
    const rpc = s.pedidos.find(p => p.t === 'rpc/pos_registrar_venta_atomica');
    const it1 = rpc && rpc.body.p_items.find(x => x.producto_id === 'p1');
    ok(rpc && Number(rpc.body.p_venta.total) === 1380 && it1 && Number(it1.precio) === 80 && Number(it1.cantidad) === 5 && it1.importe === 380 && it1.descuento === 20, `${w}px: la venta se guarda con precio 80 × 5, descuento 20, importe 380 y total 1,380`, rpc && { total: rpc.body.p_venta.total, it1 });
    // Vender (carrito lateral)
    await page.evaluate(() => { const m = document.getElementById('nxPosPago'); if (m) m.remove(); }); await page.waitForTimeout(200);
    await page.evaluate(() => [...document.querySelectorAll('button')].filter(x => /^cerrar$/i.test(x.textContent.trim()) && x.offsetParent).forEach(x => x.click())); await page.waitForTimeout(600);
    await page.evaluate(() => window.nxPosTab('vender')); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.nxPosAdd('p1'); window.nxPosAdd('p1'); }); await page.waitForTimeout(400);
    const v = await page.evaluate(() => { const c = document.querySelector('#posCartWrap .cartitem'); return c ? { sub: c.querySelector('.citsub')?.textContent, tag: c.querySelector('.nxVolTag')?.getAttribute('title') || null } : null; });
    ok(v && /90\.00/.test(v.sub) && /desde 2/.test(v.tag || ''), `${w}px: en Vender, 2 unidades a 90 con la etiqueta`, v);
    if (OUT && w === 390) await page.locator('#posCartWrap .cartitem').first().screenshot({ path: OUT + `/volumen-vender-${w}.png` });
    await page.evaluate(() => { window.nxPosQty(0, -1); window.nxPosQty(0, -1); }); await page.waitForTimeout(200);
    // Ficha del artículo (antes se cierra el comprobante de la venta)
    await page.evaluate(() => [...document.querySelectorAll('button')].filter(x => /^cerrar$/i.test(x.textContent.trim()) && x.offsetParent).forEach(x => x.click())); await page.waitForTimeout(600);
    await page.evaluate(() => document.querySelectorAll('.overlay').forEach(o => o.remove())); await page.waitForTimeout(200);
    await page.evaluate(() => window.nxPosEditProd('p1')); await page.waitForTimeout(900);
    await page.evaluate(() => window.nxPfProdTab('precios')); await page.waitForTimeout(500);
    let f = await page.evaluate(() => { const c = document.getElementById('nxVolCard'); if (!c) return null; const ins = [...c.querySelectorAll('.nxVolRow input')]; const bts = [...c.querySelectorAll('button')]; return { filas: c.querySelectorAll('.nxVolRow').length, vals: ins.map(i => i.value), inH: Math.min(...ins.map(i => i.getBoundingClientRect().height)), inF: Math.min(...ins.map(i => parseFloat(getComputedStyle(i).fontSize))), btH: Math.min(...bts.map(x => x.getBoundingClientRect().height)), btW: Math.min(...bts.map(x => x.getBoundingClientRect().width)), tab: getComputedStyle(ins[0]).fontVariantNumeric, aviso: !!c.querySelector('.nxVolAviso'), scroll: document.documentElement.scrollWidth <= window.innerWidth + 1 }; });
    ok(f && f.filas === 2 && f.vals.join() === '2,90,5,80' && !f.aviso, `${w}px: la ficha muestra las 2 escalas guardadas`, f);
    ok(f && f.inH >= 48 && f.inF >= 16 && /tabular-nums/.test(f.tab), `${w}px: campos de 48 px, letra 16 y tabular-nums`, f);
    ok(f && f.btH >= 44 && f.btW >= 44, `${w}px: botones de la ficha de 44 px o más`, f);
    await page.evaluate(() => { window.nxPosVolAgregar(); const r = document.querySelectorAll('#nxVolRows .nxVolRow'); const ins = r[r.length - 1].querySelectorAll('input'); ins[0].value = '10'; ins[0].dispatchEvent(new Event('input')); ins[1].value = '55'; ins[1].dispatchEvent(new Event('input')); }); await page.waitForTimeout(200);
    const msg = await page.evaluate(() => document.getElementById('nxVolMsg2')?.textContent || '');
    ok(/debajo del costo con ITBIS \(RD\$ 59\.00\)/.test(msg), `${w}px: avisa si queda debajo del costo con ITBIS (50 × 1.18 = 59)`, msg);
    if (OUT && w === 390) { await page.evaluate(() => document.getElementById('nxVolCard').scrollIntoView({ block: 'start' })); await page.waitForTimeout(300); await page.locator('#nxVolCard').screenshot({ path: OUT + `/volumen-ficha-${w}.png` }); }
    const patchAntes = s.pedidos.filter(p => p.m === 'PATCH' && p.t === 'pos_productos').length;
    await page.evaluate(() => window.nxPosGuardarProd('p1')); await page.waitForTimeout(800);
    ok(s.pedidos.filter(p => p.m === 'PATCH' && p.t === 'pos_productos').length === patchAntes, `${w}px: no deja guardar con una escala debajo del costo`);
    await page.evaluate(() => { const ins = document.querySelectorAll('#nxVolRows .nxVolRow')[2].querySelectorAll('input'); ins[1].value = '75'; ins[1].dispatchEvent(new Event('input')); }); await page.waitForTimeout(200);
    await page.evaluate(() => window.nxPosGuardarProd('p1')); await page.waitForTimeout(1500);
    const pt = s.pedidos.filter(p => p.m === 'PATCH' && p.t === 'pos_productos').pop();
    ok(pt && JSON.stringify(pt.body.precio_volumen) === JSON.stringify([{ desde: 2, precio: 90 }, { desde: 5, precio: 80 }, { desde: 10, precio: 75 }]), `${w}px: guarda las escalas en precio_volumen`, pt && pt.body.precio_volumen);
    ok(!s.errs.length, `${w}px: sin errores de JS`, s.errs);
    await s.ctx.close();

    // Base SIN la columna: la ficha avisa y no envía el campo; la caja no cambia
    const s2 = await abrir(b, false, w); const p2 = s2.page;
    await p2.evaluate(() => window.nxPosEditProd('p1')); await p2.waitForTimeout(900);
    await p2.evaluate(() => window.nxPfProdTab('precios')); await p2.waitForTimeout(500);
    const av = await p2.evaluate(() => { const c = document.getElementById('nxVolCard'); return c ? { aviso: !!c.querySelector('.nxVolAviso'), filas: c.querySelectorAll('.nxVolRow').length } : null; });
    ok(av && av.aviso && av.filas === 0, `${w}px: sin la columna, la tarjeta muestra el aviso y oculta el editor`, av);
    await p2.evaluate(() => window.nxPosGuardarProd('p1')); await p2.waitForTimeout(1500);
    const pt2 = s2.pedidos.filter(p => p.m === 'PATCH' && p.t === 'pos_productos').pop();
    ok(pt2 && !('precio_volumen' in pt2.body), `${w}px: sin la columna no se envía precio_volumen`, pt2 && Object.keys(pt2.body));
    await p2.evaluate(() => window.nxPosTab('factura')); await p2.waitForTimeout(1000);
    await p2.evaluate(() => { window.nxFacAdd('p1'); window.nxFacAdd('p1'); }); await p2.waitForTimeout(300);
    const t2 = await lin(p2);
    ok(t2.precio === '100' && !t2.tag && /200/.test(t2.Total), `${w}px: sin la columna la caja vende a precio normal`, t2);
    ok(!s2.errs.length, `${w}px: sin errores de JS (sin columna)`, s2.errs);
    await s2.ctx.close();
  }
  // Interruptor de apagado
  const s3ctx = await b.newContext({ viewport: { width: 390, height: 860 } });
  await s3ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, body: '' }));
  const s3 = await s3ctx.newPage(); await s3.goto(BASE + '/scripts/qa-pos-volumen.mjs');
  await s3.evaluate(() => localStorage.setItem('nx_pos_volumen_off', '1'));
  await s3.addScriptTag({ url: BASE + '/parches-pos-volumen.js' });
  const apagada = await s3.evaluate(() => typeof window.nxPosVolAjustar === 'undefined' && !document.getElementById('nxPosVolCSS'));
  await s3.evaluate(() => localStorage.removeItem('nx_pos_volumen_off'));
  await s3.addScriptTag({ url: BASE + '/parches-pos-volumen.js?b' });
  const prendida = await s3.evaluate(() => typeof window.nxPosVolAjustar === 'function');
  ok(apagada && prendida, `con nx_pos_volumen_off='1' la capa no se activa; sin él, sí`, { apagada, prendida });
  await s3ctx.close();
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`); process.exit(fail ? 1 : 0);
