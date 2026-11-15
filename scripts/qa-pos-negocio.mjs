// QA de «Datos del negocio» y «Módulos del negocio» por empresa (POS estándar, 15-nov-2026). Arnés de qa-pos-cubre6.mjs: app real con la REST de
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
      { id: 'v1', cliente_id: 'c2', total: 11800, created_at: hace(5), fecha: hace(5), ncf: 'B0200000001', tipo_comprobante: 'consumo', estado: 'completada' },
      { id: 'v2', cliente_id: 'c2', total: 5900, created_at: hace(30), fecha: hace(30), ncf: '', tipo_comprobante: 'sin', estado: 'completada' },
      { id: 'v3', cliente_id: 'c3', total: 23600, created_at: hace(10), fecha: hace(10), ncf: 'B0100000003', tipo_comprobante: 'credito_fiscal', estado: 'completada' },
      { id: 'v4', cliente_id: 'c3', total: 99999, created_at: hace(12), fecha: hace(12), ncf: 'B0200000009', tipo_comprobante: 'consumo', estado: 'anulada' },
      { id: 'v5', cliente_id: 'c4', total: 4720, created_at: hace(100), fecha: hace(100), ncf: 'E310000000001', tipo_comprobante: 'ecf31', estado: 'completada' }
    ],
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
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    const off0 = Number(u.searchParams.get('offset') || 0);
    return send(filas.slice(off0, off0 + 1000));
  });
  await page.addInitScript(([o, us, apag]) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (apag) localStorage.setItem('nx_pos_empresas_off', '1'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'TIENDA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, !!off]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  await page.evaluate(() => window.nxPosTab('ajustes')); await page.waitForTimeout(1200);
  return { ctx, page, errs, pedidos, externos };
}


const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    globalThis.__CFG = {};
    let s = await abrir(b, w); let page = s.page;
    const nom = await page.evaluate(() => { const e = document.getElementById('negNom'); return e ? e.value : null; });
    ok(nom === 'TIENDA DEMO', `${w}px: sin datos guardados propone el nombre de la empresa, nunca «NEXUS PRO»`, nom);
    const alt = await page.evaluate(() => ['negNom', 'negRnc', 'negTel', 'negDir', 'negPie'].map(i => { const e = document.getElementById(i); const r = e.getBoundingClientRect(); return { i, h: Math.round(r.height), f: getComputedStyle(e).fontSize }; }));
    ok(alt.every(x => x.h >= 48 && x.f === '16px'), `${w}px: campos de 48 px con letra de 16 px`, alt);
    const bt = await page.evaluate(() => [...document.querySelectorAll('button[onclick*="nxNegocio"]')].map(e => Math.round(e.getBoundingClientRect().height)));
    ok(bt.length === 2 && bt.every(h => h >= 54), `${w}px: botones principales de 54 px`, bt);
    const chk = await page.evaluate(() => [...document.querySelectorAll('#negMods label')].map(e => Math.round(e.getBoundingClientRect().height)));
    ok(chk.length > 15 && chk.every(h => h >= 44), `${w}px: casillas de módulos de 44 px o más`, chk.slice(0, 4));
    await page.fill('#negNom', ''); await page.evaluate(() => window.nxNegocioGuardar()); await page.waitForTimeout(300);
    ok(!s.pedidos.some(p => p.m !== 'GET' && p.t === 'pos_config'), `${w}px: sin nombre no guarda`);
    await page.fill('#negNom', 'Colmado La Fe'); await page.fill('#negRnc', '123'); await page.evaluate(() => window.nxNegocioGuardar()); await page.waitForTimeout(300);
    ok(!s.pedidos.some(p => p.m !== 'GET' && p.t === 'pos_config'), `${w}px: RNC inválido no guarda`);
    await page.fill('#negRnc', '131-88065-7'); await page.fill('#negTel', '809-555-0000'); await page.fill('#negDir', 'Calle 1'); await page.fill('#negPie', 'Vuelva pronto');
    await page.evaluate(() => window.nxNegocioGuardar()); await page.waitForTimeout(500);
    const g = s.pedidos.filter(p => p.m === 'PATCH' && p.t === 'pos_config').pop();
    ok(g && g.body.emp_nombre === 'Colmado La Fe' && g.body.emp_rnc === '131880657' && g.body.ticket_pie === 'Vuelva pronto' && /organizacion_id=eq\./.test(g.q), `${w}px: guarda los datos en pos_config de su empresa`, g);
    await page.evaluate(() => { document.getElementById('mof_reparaciones').checked = false; document.getElementById('mof_cuotas').checked = false; });
    await page.evaluate(() => window.nxNegocioModsGuardar()); await page.waitForTimeout(600);
    const gm = s.pedidos.filter(p => p.m === 'PATCH' && p.t === 'pos_config').pop();
    ok(gm && JSON.stringify(gm.body.modulos_off) === '["reparaciones","cuotas"]', `${w}px: guarda los módulos apagados`, gm && gm.body);
    const nav = await page.evaluate(() => document.getElementById('v-pos').innerHTML);
    ok(!/nxPosTab\('reparaciones'\)/.test(nav) && !/nxPosTab\('cuotas'\)/.test(nav) && /nxPosTab\('vender'\)/.test(nav), `${w}px: Reparaciones y Cuotas salen del menú al instante; Vender sigue`);
    if (OUT) await page.screenshot({ path: `${OUT}/negocio-${w}.png`, fullPage: true });
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
    globalThis.__CFG = { emp_nombre: 'Colmado La Fe', emp_tel: '809-555-0000', ticket_pie: 'Vuelva pronto', modulos_off: ['reparaciones', 'cuotas'] };
    s = await abrir(b, w); page = s.page;
    await page.evaluate(() => window.nxPosTab('inicio')); await page.waitForTimeout(800);
    const ini = await page.evaluate(() => document.getElementById('v-pos').innerHTML);
    ok(!/nxPosTab\('reparaciones'\)/.test(ini) && !/nxPosTab\('cuotas'\)/.test(ini), `${w}px: al volver a entrar los módulos apagados no aparecen (también para el dueño)`);
    const blq = await page.evaluate(async () => { await window.nxPosTab('reparaciones'); return !!document.querySelector('#v-pos [onclick*="nxRep"]'); });
    ok(blq === false, `${w}px: un módulo apagado no se abre ni llamándolo directo`);
    if (OUT) await page.screenshot({ path: `${OUT}/inicio-${w}.png` });
    ok(s.errs.length === 0, `${w}px: 0 errores de JS (segunda entrada)`, s.errs); await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} PASS / ${fail} FAIL`); process.exit(fail ? 1 : 0);
