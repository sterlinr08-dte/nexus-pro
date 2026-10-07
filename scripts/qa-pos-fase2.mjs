// QA de la Fase 2 del POS (07-oct-2026): abono de fiado por el servidor, con respaldo al camino viejo mientras la
// migración 20261007120000 no esté aplicada. App real con la REST de Supabase SIMULADA (nunca toca la base real).
// Uso (desde la raíz): python3 -m http.server 8944 &   node scripts/qa-pos-fase2.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';

function db() {
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'TIENDA DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_clientes: [{ id: 'c1', nombre: 'CLIENTE FIADO', activo: true, es_cliente: true }],
    // 1,500 ventas a crédito de 10 (= 15,000) y 1,200 abonos de 5 (= 6,000): antes el saldo se cortaba en 1,000 filas.
    pos_ventas: Array.from({ length: 1500 }, (_, i) => ({ id: 'v' + String(i).padStart(5, '0'), cliente_id: 'c1', credito_monto: 10, total: 10, estado: 'completada', created_at: '2026-09-01T10:00:00Z' })),
    pos_abonos: Array.from({ length: 1200 }, (_, i) => ({ id: 'b' + String(i).padStart(5, '0'), cliente_id: 'c1', monto: 5, fecha: '2026-09-02', metodo: 'Transferencia' })),
    pos_cajas: []
  };
}

async function abrir(b, rpcExiste) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 820 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const pedidos = []; const D = db();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    if (!/supabase\.co$/.test(u.hostname)) return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : 'application/javascript', body: '' });
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.pathname.startsWith('/auth/')) return send({});
    if (!u.pathname.startsWith('/rest/v1/')) return send({ ok: true });
    const t = u.pathname.slice(9); const body = req.postData() ? JSON.parse(req.postData()) : null;
    pedidos.push({ m: req.method(), t, q: u.search, body });
    if (t.startsWith('rpc/pos_fiado_')) {
      if (!rpcExiste) return send({ code: 'PGRST202', message: 'Could not find the function public.' + t.slice(4) }, 404);
      if (t === 'rpc/pos_fiado_registrar_abono') {
        const prev = D.pos_abonos.find(a => body.p_operacion_id && a.operacion_id === body.p_operacion_id);
        if (prev) return send({ ok: true, id: prev.id, numero: prev.numero, repetido: true });
        const row = { id: 'n' + D.pos_abonos.length, cliente_id: body.p_cliente_id, monto: body.p_monto, fecha: '2026-10-07', metodo: body.p_metodo, numero: 'R-00001', operacion_id: body.p_operacion_id };
        D.pos_abonos.push(row); return send({ ok: true, id: row.id, numero: row.numero });
      }
      if (t === 'rpc/pos_fiado_eliminar_abono') { const a = D.pos_abonos.find(x => x.id === body.p_abono_id); D.pos_abonos.push({ id: 'x' + a.id, cliente_id: a.cliente_id, monto: -a.monto, anula_id: a.id, fecha: '2026-10-07' }); return send({ ok: true, numero: 'ANUL-1' }); }
    }
    if (req.method() === 'POST' && t === 'pos_abonos') { const row = Object.assign({ id: 'old' + D.pos_abonos.length }, body); D.pos_abonos.push(row); return send([row], 201); }
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); const g = /^gt\.(.*)$/.exec(v); if (g) filas = filas.filter(x => Number(x[k]) > Number(g[1])); }
    const ord = (u.searchParams.get('order') || '').split(',')[0].split('.'); if (ord[0] && ord[0] !== 'id') filas = filas.slice().sort((x, y) => String(x[ord[0]] || '').localeCompare(String(y[ord[0]] || '')) * (ord[1] === 'desc' ? -1 : 1));
    const off = Number(u.searchParams.get('offset') || 0), lim = Number(u.searchParams.get('limit') || 1000);
    return send(filas.slice(off, off + Math.min(lim, 1000)));   // la API real entrega a lo sumo 1000 filas
  });
  await page.addInitScript(([o, us]) => { localStorage.setItem('nx_auth_mode', 'legacy'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'TIENDA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  await page.evaluate(() => window.nxPosTab('clientes')); await page.waitForTimeout(1500);
  return { ctx, page, errs, pedidos, D };
}
const saldoPantalla = p => p.evaluate(() => (document.querySelector('#nxCliTb tr[data-q]') || {}).innerText || '');
async function abonar(p, monto, met) {
  await p.evaluate(() => { window.nxPosCliVer('c1'); }); await p.waitForTimeout(1500);
  await p.evaluate(([m, me]) => { document.getElementById('posAbMonto').value = m; const s = document.getElementById('posAbMet'); if (s) s.value = me; }, [String(monto), met]);
  await p.evaluate(() => { window.nxPosAbonar('c1'); }); await p.waitForTimeout(1500);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  // ── Con la función del servidor ──
  {
    const { ctx, page, errs, pedidos, D } = await abrir(b, true);
    const fila = await saldoPantalla(page);
    ok(/9,000\.00/.test(fila), 'saldo sin corte: 15,000 − 6,000 = 9,000 con 1,500 ventas y 1,200 abonos', fila);
    await abonar(page, 250.5, 'Transferencia');
    const rpc = pedidos.filter(x => x.t === 'rpc/pos_fiado_registrar_abono');
    ok(rpc.length === 1 && rpc[0].body.p_monto === 250.5 && !!rpc[0].body.p_operacion_id, 'el abono va por la función del servidor, con número de operación', rpc.map(x => x.body));
    ok(!pedidos.some(x => x.m === 'POST' && x.t === 'pos_abonos'), 'la app ya no escribe el abono directo');
    ok(!pedidos.some(x => x.m === 'POST' && x.t === 'pos_asientos'), 'la app ya no escribe el asiento del abono');
    // Doble envío con la misma operación (respuesta perdida): el servidor contesta «repetido» y no hay segunda fila.
    await page.evaluate(() => { window.__nxAbonoOp = { cli: 'c1', op: 'op-fija' }; });
    await abonar(page, 100, 'Transferencia'); await page.evaluate(() => { window.__nxAbonoOp = { cli: 'c1', op: 'op-fija' }; }); await abonar(page, 100, 'Transferencia');
    ok(D.pos_abonos.filter(a => a.operacion_id === 'op-fija').length === 1, 'doble toque con la misma operación: un solo abono');
    // Anular: por la función, y la anulación sale sin botón
    await page.evaluate(() => { const bt = [...document.querySelectorAll('button[aria-label="Anular abono"]')][0]; window.confirm = () => true; bt && bt.click(); }); await page.waitForTimeout(1500);
    ok(pedidos.some(x => x.t === 'rpc/pos_fiado_eliminar_abono'), 'anular va por la función del servidor (reverso, no borra)');
    ok(!pedidos.some(x => x.m === 'DELETE' && x.t === 'pos_abonos'), 'ya no se borra el abono');
    await page.evaluate(() => window.nxPosCliVer('c1')); await page.waitForTimeout(1200);
    const lst = await page.evaluate(() => { const t = document.body.innerText; return { anulacion: /Anulación/i.test(t), anulado: /Anulado/i.test(t), clicked: window.__qaClick || null, txt: (t.match(/.{0,80}(Anul|Sin abonos).{0,80}/g) || []).slice(0, 4), form: !!document.getElementById('posAbMonto'), btns: document.querySelectorAll('button[aria-label="Anular abono"]').length, rojos: [...document.querySelectorAll('b')].filter(x => /-RD/.test(x.textContent)).length, abonosDB: null }; });
    ok(lst.anulacion && lst.anulado, 'la lista muestra «Anulación» y «Anulado» sin botón', lst);
    ok(errs.length === 0, 'sin errores de JavaScript', errs.slice(0, 3));
    await ctx.close();
  }
  // ── Sin la migración (la función todavía no existe): camino de antes ──
  {
    const { ctx, page, errs, pedidos } = await abrir(b, false);
    await abonar(page, 300, 'Transferencia');
    ok(pedidos.some(x => x.t === 'rpc/pos_fiado_registrar_abono') && pedidos.some(x => x.m === 'POST' && x.t === 'pos_abonos'), 'sin la función: intenta el servidor y cae al camino de antes (el abono se guarda igual)');
    ok(errs.length === 0, 'sin errores de JavaScript (respaldo)', errs.slice(0, 3));
    await ctx.close();
  }
  await b.close();
  console.log(`\n${pass} PASS · ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
