// QA de «Margen por producto» en Reportes del POS (27-oct-2026). Arnés copiado de qa-pos-cubre6.mjs: app real con la REST de
// Supabase SIMULADA (nunca toca la base real). Verifica cálculos con datos conocidos, 390 y 1280 px, modo claro y oscuro,
// controles de 44 px o más, que no escribe en la base, que un cajero no lo ve y 0 errores de JS.
// Uso (desde la raíz): python3 -m http.server 8944 &   NODE_PATH=/opt/node22/lib/node_modules node scripts/qa-pos-margen.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';
const hace = d => new Date(Date.now() - d * 864e5).toISOString();

function db() {
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'TIENDA DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_categorias: [{ id: 'k1', nombre: 'Celulares' }, { id: 'k2', nombre: 'Accesorios' }],
    pos_productos: [
      { id: 'p1', nombre: 'Celular', precio: 11800, costo: 6000, stock: 50, itbis: true, activo: true, tipo: 'producto', categoria_id: 'k1' },
      { id: 'p2', nombre: 'Servicio exento', precio: 1000, costo: 0, stock: 0, itbis: false, activo: true, tipo: 'servicio' },
      { id: 'p3', nombre: 'Cable USB', precio: 1180, costo: 950, stock: 50, itbis: true, activo: true, tipo: 'producto', categoria_id: 'k2' },
      { id: 'p4', nombre: 'Funda exenta', precio: 500, costo: 600, stock: 50, itbis: false, activo: true, tipo: 'producto', categoria_id: 'k2' },
      { id: 'p5', nombre: 'Viejo inactivo', precio: 100, costo: 50, stock: 0, itbis: false, activo: false, tipo: 'producto' }
    ],
    pos_ventas: [
      { id: 'v1', numero: 1, estado: 'completada', total: 27640, created_at: hace(2) },
      { id: 'v2', numero: 2, estado: 'anulada', total: 59000, created_at: hace(3) },
      { id: 'v3', numero: 3, estado: 'completada', total: 118000, created_at: hace(40) }
    ],
    pos_venta_items: [
      { id: 'i1', venta_id: 'v1', producto_id: 'p1', cantidad: 2, precio: 11800, importe: 23600, itbis: true },
      { id: 'i2', venta_id: 'v1', producto_id: 'p3', cantidad: 3, precio: 1180, importe: 3540, itbis: true },
      { id: 'i3', venta_id: 'v1', producto_id: 'p4', cantidad: 1, precio: 500, importe: 500, itbis: false },
      { id: 'i4', venta_id: 'v2', producto_id: 'p1', cantidad: 5, precio: 11800, importe: 59000, itbis: true },
      { id: 'i5', venta_id: 'v3', producto_id: 'p1', cantidad: 10, precio: 11800, importe: 118000, itbis: true }
    ],
    pos_cajas: [{ id: 'cj1', estado: 'abierta', apertura: hace(1), monto_inicial: 0 }]
  };
}

async function abrir(b, ancho, { rol = 'admin', tema = null } = {}) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 860 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const pedidos = []; const D = db();
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    if (!/supabase\.co$/.test(u.hostname)) return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : 'application/javascript', body: '' });
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    const body = req.postData() ? (() => { try { return JSON.parse(req.postData()); } catch (e) { return req.postData(); } })() : null;
    if (u.pathname.startsWith('/auth/')) return send({});
    if (!u.pathname.startsWith('/rest/v1/')) return send({ ok: true });
    const t = u.pathname.slice(9);
    pedidos.push({ m: req.method(), t, q: u.search, body });
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) {
      if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue;
      let m;
      if ((m = /^eq\.(.*)$/.exec(v))) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]);
      else if ((m = /^in\.\((.*)\)$/.exec(v))) { const s = m[1].split(','); filas = filas.filter(x => s.includes(String(x[k]))); }
      else if ((m = /^gte\.(.*)$/.exec(v))) filas = filas.filter(x => x[k] === undefined || String(x[k]) >= m[1]);
    }
    const off = Number(u.searchParams.get('offset') || 0);
    return send(filas.slice(off, off + 1000));
  });
  await page.addInitScript(([o, us, rol, tema]) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (tema) localStorage.setItem('nx_tema', tema); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol, cargo: rol.toUpperCase(), organizacion_id: o, org: { id: o, nombre: 'TIENDA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, rol, tema]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  // La preferencia de tema de la base pisa el espejo local: se fija aquí para probar el modo claro.
  if (tema) await page.evaluate(t => { try { aplicarTema(t, false); } catch (e) {} }, tema);
  return { ctx, page, errs, pedidos, D };
}

const leerFilas = page => page.evaluate(() => [...document.querySelectorAll('#nxMgBody .nxMg-row:not(.nxMg-head)')].map(r => {
  const c = [...r.querySelectorAll('.nxMg-c')].map(x => x.querySelector('span') ? x.querySelector('span').textContent.trim() : x.textContent.trim());
  return { id: r.dataset.id, estado: r.dataset.estado, pill: r.querySelector('.nxMg-pill').textContent.trim(), precio: c[0], costo: c[1], ganU: c[2], margen: c[3], piso: c[4], u30: c[5], g30: c[6], bajar: r.querySelector('.nxMg-bajar').textContent.trim() };
}));
const chicos = page => page.evaluate(() => [...document.querySelectorAll('#nxMargenM button, #nxMargenM input, #nxMargenM select, #nxMargenM summary, .nxMgBtn')]
  .filter(e => e.offsetParent !== null).map(e => ({ t: (e.textContent || e.placeholder || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 30), h: e.getBoundingClientRect().height }))
  .filter(x => x.h < 44));

const b = await chromium.launch();
try {
  // 1) Cálculo puro (sin pantalla)
  {
    const s = await abrir(b, 1280); const page = s.page;
    const c = await page.evaluate(() => { const C = window.nxPosMargen.calc; return [C({ id: 'a', precio: 11800, costo: 6000, itbis: true }), C({ id: 'b', precio: 1180, costo: 950, itbis: true }), C({ id: 'c', precio: 500, costo: 600, itbis: false }), C({ id: 'd', precio: 1000, costo: 0, itbis: false }), C({ id: 'e', precio: 2000, costo: 1500, itbis: false })]; });
    ok(c[0].ganU === 4000 && c[0].margen === 40 && c[0].piso === 7080 && c[0].bajar === 4720 && c[0].estado === 'puede', 'cálculo: 11,800 con ITBIS y costo 6,000 → gana 4,000, 40 %, piso 7,080, puede bajar 4,720', c[0]);
    ok(c[1].ganU === 50 && c[1].margen === 5 && c[1].piso === 1121 && c[1].estado === 'justo', 'cálculo: 1,180 con ITBIS y costo 950 → gana 50, 5 %, piso 1,121, margen justo', c[1]);
    ok(c[2].ganU === -100 && c[2].piso === 600 && c[2].bajar === -100 && c[2].estado === 'perdida', 'cálculo: exento 500 con costo 600 → pierde 100, piso 600, con pérdida', c[2]);
    ok(c[3].estado === 'sincosto' && c[3].piso === null, 'cálculo: sin costo → no se puede calcular', c[3]);
    ok(c[4].ganU === 500 && c[4].margen === 25 && c[4].piso === 1500, 'cálculo: exento 2,000 con costo 1,500 → gana 500, 25 %, piso = costo 1,500', c[4]);
    await s.ctx.close();
  }
  // 2) Pantalla a 390 y 1280, oscuro (por defecto) y claro
  for (const [w, tema] of [[390, null], [390, 'clasico'], [1280, null], [1280, 'clasico']]) {
    const tag = `${w}px ${tema ? 'claro' : 'oscuro'}`;
    const s = await abrir(b, w, { tema }); const page = s.page;
    await page.evaluate(() => window.nxPosTab('reportes')); await page.waitForTimeout(1500);
    const hayBtn = await page.evaluate(() => !!document.querySelector('#v-pos .nxMgBtn'));
    ok(hayBtn, `${tag}: botón «Margen por producto» en Reportes`);
    await page.evaluate(() => document.querySelector('#v-pos .nxMgBtn').click()); await page.waitForTimeout(1500);
    const F = await leerFilas(page);
    ok(F.map(f => f.id).join(',') === 'p1,p3,p2,p4', `${tag}: 4 activos (sin el inactivo), ordenados por ganancia del mes`, F.map(f => f.id));
    const f1 = F.find(f => f.id === 'p1'), f2 = F.find(f => f.id === 'p2'), f3 = F.find(f => f.id === 'p3'), f4 = F.find(f => f.id === 'p4');
    ok(f1 && f1.ganU === 'RD$ 4,000.00' && f1.margen === '40 %' && f1.piso === 'RD$ 7,080.00' && f1.u30 === '2' && f1.g30 === 'RD$ 8,000.00' && /Puede bajar hasta RD\$ 7,080\.00 \(RD\$ 4,720\.00 menos\)/.test(f1.bajar) && f1.pill === 'Puede bajar precio', `${tag}: Celular correcto (la venta anulada y la de hace 40 días no cuentan)`, f1);
    ok(f3 && f3.margen === '5 %' && f3.u30 === '3' && f3.g30 === 'RD$ 150.00' && f3.pill === 'Margen justo', `${tag}: Cable margen justo, 3 vendidas, gana 150`, f3);
    ok(f4 && f4.ganU === '−RD$ 100.00' && f4.g30 === '−RD$ 100.00' && /Le faltan RD\$ 100\.00 para no perder/.test(f4.bajar) && f4.pill === 'Vende con pérdida', `${tag}: Funda con pérdida`, f4);
    ok(f2 && f2.pill === 'Sin costo: no se puede calcular' && f2.piso === '—', `${tag}: Servicio sin costo`, f2);
    const res = await page.evaluate(() => [...document.querySelectorAll('.nxMg-res b')].map(x => x.textContent.trim()));
    ok(res.join('|') === '4|RD$ 8,050.00|1|1', `${tag}: resumen 4 artículos, ganancia 8,050, 1 con pérdida, 1 sin costo`, res);
    await page.evaluate(() => window.nxPosMargenFiltro('bajo')); await page.waitForTimeout(200);
    ok((await leerFilas(page)).map(f => f.id).join(',') === 'p3,p4', `${tag}: filtro margen bajo → Cable y Funda`);
    await page.evaluate(() => window.nxPosMargenFiltro('sin')); await page.waitForTimeout(200);
    ok((await leerFilas(page)).map(f => f.id).join(',') === 'p2', `${tag}: filtro sin costo → Servicio`);
    await page.evaluate(() => window.nxPosMargenFiltro('sin')); await page.waitForTimeout(100);
    await page.selectOption('#nxMgCat', 'k2'); await page.waitForTimeout(200);
    ok((await leerFilas(page)).map(f => f.id).join(',') === 'p3,p4', `${tag}: categoría Accesorios → Cable y Funda`);
    await page.selectOption('#nxMgCat', ''); await page.fill('#nxMgQ', 'celu'); await page.waitForTimeout(200);
    ok((await leerFilas(page)).map(f => f.id).join(',') === 'p1', `${tag}: buscar «celu» → Celular`);
    await page.fill('#nxMgQ', ''); await page.waitForTimeout(200);
    const ch = await chicos(page);
    ok(!ch.length, `${tag}: todo lo tocable mide 44 px o más`, ch);
    const campo = await page.evaluate(() => { const i = document.getElementById('nxMgQ'), c = getComputedStyle(i); return { h: i.getBoundingClientRect().height, fs: c.fontSize, sel: document.getElementById('nxMgCat').getBoundingClientRect().height, tt: [...document.querySelectorAll('#nxMargenM .nxMg-tt h2, #nxMargenM .nxMg-tt p, #nxMargenM .nxMg-pill, #nxMargenM .nxMg-bajar, #nxMargenM .nxMg-res span, #nxMargenM .nxMg-head > div, #nxMargenM input, #nxMargenM .nxMg-c small')].map(e => getComputedStyle(e).textTransform).concat([...document.querySelectorAll('#nxMargenM .nxMg-c')].map(e => getComputedStyle(e, '::before').textTransform)).filter(x => x !== 'none' && x !== 'normal').length ? 'upper' : 'none', num: getComputedStyle(document.querySelector('.nxMg-row:not(.nxMg-head)')).fontVariantNumeric }; });
    ok(campo.h === 48 && campo.fs === '16px' && campo.sel === 48, `${tag}: campos de 48 px con letra de 16 px`, campo);
    ok(campo.tt === 'none' && /tabular-nums/.test(campo.num), `${tag}: sin mayúsculas forzadas y números tabulares`, campo);
    const sinScroll = await page.evaluate(() => { const m = document.querySelector('#nxMargenM .nxMg'); return m.scrollWidth <= m.clientWidth + 1 && document.getElementById('nxMgBody').scrollWidth <= document.getElementById('nxMgBody').clientWidth + 1; });
    ok(sinScroll, `${tag}: sin desplazamiento horizontal`);
    const fondo = await page.evaluate(() => getComputedStyle(document.querySelector('.nxMg')).backgroundColor);
    const campoFondo = await page.evaluate(() => getComputedStyle(document.getElementById('nxMgQ')).backgroundColor);
    ok(tema ? /255, 255, 255/.test(campoFondo) : /11, 15, 25/.test(campoFondo), `${tag}: el buscador sigue el tema`, campoFondo);
    ok(tema ? /255, 255, 255/.test(fondo) : /18, 24, 38/.test(fondo), `${tag}: fondo del tema correcto`, fondo);
    if (OUT) await page.screenshot({ path: `${OUT}/margen-${w}-${tema ? 'claro' : 'oscuro'}.png` });
    const escrituras = s.pedidos.filter(p => p.m !== 'GET' && /pos_productos|pos_ventas|pos_venta_items/.test(p.t));
    ok(!escrituras.length, `${tag}: no escribe en la base`, escrituras);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok(!(await page.evaluate(() => !!document.getElementById('nxMargenM'))), `${tag}: Esc cierra`);
    ok(!s.errs.length, `${tag}: sin errores de JS`, s.errs);
    await s.ctx.close();
  }
  // 3) Un cajero no lo ve
  {
    const s = await abrir(b, 390, { rol: 'cajero' }); const page = s.page;
    await page.evaluate(() => window.nxPosMargenAbrir && window.nxPosMargenAbrir()); await page.waitForTimeout(500);
    ok(!(await page.evaluate(() => !!document.getElementById('nxMargenM') || !!document.querySelector('.nxMgBtn'))), 'cajero: no ve el margen ni el botón');
    ok(!s.errs.length, 'cajero: sin errores de JS', s.errs);
    await s.ctx.close();
  }
  // 4) Apagable
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 860 } }); const page = await ctx.newPage();
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.addInitScript(() => localStorage.setItem('nx_pos_margen_off', '1'));
    await page.goto(BASE + '/index.html'); await page.waitForTimeout(3000);
    ok(await page.evaluate(() => !window.nxPosMargen && !window.nxPosMargenAbrir), 'apagado con nx_pos_margen_off=1');
    await ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`); process.exit(fail ? 1 : 0);
