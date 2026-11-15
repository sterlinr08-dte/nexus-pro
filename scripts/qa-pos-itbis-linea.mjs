// QA ITBIS por línea en el ticket y la factura carta (prueba de Muse, 15-nov-2026): (G) gravado / (E) exento y total exento.
// Basado en el arnés de qa-pos-compra-segura.mjs (27-oct-2026). Arnés de qa-ecf-caja.mjs / qa-pos-cubre6.mjs:
// app real con la REST de Supabase y la Edge ecf-mseller SIMULADAS (nunca toca la base real ni MSeller).
// Uso (desde la raíz): python3 -m http.server 8944 &   node scripts/qa-pos-compra-segura.mjs   (QA_OUT=carpeta para capturas)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';
const VID = '00000000-0000-4000-8000-0000000000a1';
const IMEI = '356789104455661';
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
// misma cuenta que parches-pos.js (Date.now() + días, en ISO) → «27-oct-2027»
const garEsperada = dias => { const iso = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10); const [y, m, d] = iso.split('-'); return d + '-' + MESES[Number(m) - 1] + '-' + y; };

function db(conE) {
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'CELULARES DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR', ecf_rnc: conE ? '131880657' : null, ecf_razon_social: conE ? 'Celulares Demo SRL' : null, ecf_direccion: conE ? 'Calle 1' : null }],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_productos: [
      { id: 'p1', nombre: 'Celular Galaxy A15', precio: 11800, costo: 6000, stock: 50, itbis: true, activo: true, tipo: 'producto', garantia_dias: 365, serial: true },
      { id: 'p2', nombre: 'Funda', precio: 590, costo: 100, stock: 50, itbis: true, activo: true, tipo: 'producto', garantia_dias: 0 },
      { id: 'p3', nombre: 'Arroz selecto', precio: 185, costo: 150, stock: 50, itbis: false, activo: true, tipo: 'producto', garantia_dias: 0 }
    ],
    pos_seriales: [{ id: 's1', producto_id: 'p1', serial: IMEI, estado: 'disponible', almacen_id: 'a1', color: '' }],
    pos_clientes: [{ id: 'c1', nombre: 'Juan Pérez', cedula: '', activo: true, es_cliente: true }],
    pos_ncf_secuencias: conE
      ? [{ id: 'n1', tipo: 'B02', prefijo: 'B02', desde: 1, hasta: 100, actual: 5, activo: true }, { id: 'n2', tipo: 'E32', prefijo: 'E32', desde: 1, hasta: 500, actual: 1, activo: true }]
      : [{ id: 'n1', tipo: 'B02', prefijo: 'B02', desde: 1, hasta: 100, actual: 5, activo: true }],
    pos_ventas: [], pos_venta_items: [], pos_cajas: [{ id: 'cj1', estado: 'abierta', apertura: '2026-10-26T12:00:00Z', monto_inicial: 0 }]
  };
}
const edgeOk = (D, body) => {
  if (body.accion !== 'emitir') return [{ ok: true, entorno: 'TesteCF', status: 404 }, 200];
  const r = { ok: true, status: 200, entorno: 'TesteCF', ncf: 'E320000000001', ecf_estado: 'En Cola', ecf_security_code: 'fWCZCV', ecf_qr_url: 'https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=131880657&encf=E320000000001&montototal=11800&codigoseguridad=fWCZCV', ecf_firmado: '26-10-2026 11:00:00' };
  D.pos_ventas.forEach(v => Object.assign(v, { ncf: r.ncf, ecf_security_code: r.ecf_security_code, ecf_qr_url: r.ecf_qr_url, ecf_firmado: r.ecf_firmado }));
  return [r, 200];
};

async function abrir(b, { conE = false, ancho = 1280, ls = {}, oscuro = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 860 } });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  ctx.on('page', p => p.on('pageerror', e => errs.push('[popup] ' + e.message)));
  const pedidos = []; const D = db(conE);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    if (!/supabase\.co$/.test(u.hostname)) return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : 'application/javascript', body: '' });
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    if (u.pathname === '/functions/v1/ecf-mseller') { pedidos.push({ m: 'EDGE', body }); return send(...edgeOk(D, body)); }
    if (u.pathname.startsWith('/auth/')) return send({});
    if (!u.pathname.startsWith('/rest/v1/')) return send({ ok: true });
    const t = u.pathname.slice(9);
    pedidos.push({ m: req.method(), t, q: u.search, body });
    if (t === 'rpc/pos_registrar_venta_atomica') {
      const v = Object.assign({ id: VID, numero: 7, fecha: '2026-10-27T15:00:00Z', organizacion_id: ORG }, body.p_venta);
      D.pos_ventas.push(v);
      const its = body.p_items.map((it, i) => Object.assign({ id: 'it' + i, venta_id: VID }, it));
      D.pos_venta_items.push(...its);
      return send({ ok: true, venta: v, items: its });
    }
    if (t === 'rpc/pos_reservar_seriales') return send('tok-qa');
    if (t === 'rpc/pos_confirmar_seriales_reservados') return send(1);
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() === 'PATCH' && D[t]) { const m = /id=eq\.([^&]+)/.exec(u.search); if (m) D[t].filter(x => String(x.id) === decodeURIComponent(m[1])).forEach(x => Object.assign(x, body)); return send([]); }
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    return send(filas.slice(0, 1000));
  });
  await page.addInitScript(([o, us, extra]) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'CELULARES DEMO', tipo: 'tienda' }, inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    if (!sessionStorage.getItem('qa_ls')) { for (const k in extra) localStorage.setItem(k, extra[k]); sessionStorage.setItem('qa_ls', '1'); }
  }, [ORG, USR, ls]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  if (oscuro) await page.evaluate(() => document.body.classList.add('tema-premium'));
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  return { ctx, page, errs, pedidos, D };
}

async function vender(page, { prods, ncf = 'consumo', imei = false, monto }) {
  await page.evaluate(() => window.nxPosTab('factura')); await page.waitForTimeout(1200);
  await page.evaluate(([ps, n]) => { ps.forEach(p => window.nxFacAdd(p)); window.nxFacNCFPick(n); }, [prods, ncf]); await page.waitForTimeout(500);
  if (imei) {
    await page.evaluate(() => window.nxFacSerial(0)); await page.waitForTimeout(800);
    await page.evaluate(() => { const c = document.querySelector('#nxFacSer [data-serid]'); if (c) c.checked = true; window.nxFacSerGuardar(0); }); await page.waitForTimeout(400);
  }
  await page.evaluate(() => window.nxPosCobrar()); await page.waitForTimeout(900);
  await page.evaluate(m => { const e = document.getElementById('payEfe'); if (e) { e.value = String(m); e.dispatchEvent(new Event('input', { bubbles: true })); } }, monto); await page.waitForTimeout(300);
  await page.evaluate(() => window.nxPosConfirmar()); await page.waitForTimeout(2500);
}
async function popup(s, fn) {
  const [pop] = await Promise.all([s.ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), s.page.evaluate(fn)]);
  if (pop) await pop.waitForTimeout(900);
  return pop;
}
const bloque = pop => pop.evaluate(() => { const b = document.querySelector('.nxCs'); return b ? b.innerText : null; });
async function anchoOk(pop, w) {
  await pop.setViewportSize({ width: w, height: 1000 }); await pop.waitForTimeout(150);
  return pop.evaluate(() => { const b = document.querySelector('.nxCs'); const r = b ? b.getBoundingClientRect() : null; return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bl: r ? r.left : 0, br: r ? r.right : 0 }; });
}


const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    const s = await abrir(b, { ancho: w });
    await vender(s.page, { prods: ['p2', 'p3'], imei: false, monto: 775, ncf: 'sin' });
    const pop = await popup(s, () => window.nxPosVentaTicketVer && window.nxPosVentaTicketVer());
    const t = pop ? await pop.evaluate(() => document.body.innerText) : '';
    ok(/Funda \(G\)/.test(t) && /Arroz selecto \(E\)/.test(t), `${w}px: el ticket marca cada línea (G) gravado / (E) exento`, t.slice(0, 400));
    ok(/Exento de ITBIS\s*RD\$ 185/.test(t) && /\(G\) gravado ITBIS 18 % · \(E\) exento/.test(t), `${w}px: el ticket trae «Exento de ITBIS RD$ 185» y la leyenda`, t.slice(0, 600));
    if (pop && OUT && w === 390) { await pop.setViewportSize({ width: 302, height: 900 }); await pop.screenshot({ path: OUT + '/itbis-ticket.png', fullPage: true }).catch(() => {}); }
    if (pop) {
      let nuevas = 0; const cuenta = () => nuevas++; s.ctx.on('page', cuenta);
      await pop.evaluate(() => { const b = [...document.querySelectorAll('.noprint button')].find(x => /Factura completa/i.test(x.textContent)); if (b) b.click(); });
      await pop.waitForTimeout(1800);
      const t2 = await pop.evaluate(() => document.body.innerText).catch(() => '');
      s.ctx.off('page', cuenta);
      ok(/G = gravado ITBIS 18 % · E = exento/.test(t2) && nuevas === 0, `${w}px: «Factura completa» dentro del ticket cambia ESA pestaña a la factura carta (sin abrir otra)`, { nuevas, t: t2.slice(0, 160) });
    }
    if (pop) await pop.close();
    const pc = await popup(s, () => window.nxFacDocVenta && window.nxFacDocVenta('00000000-0000-4000-8000-0000000000a1'));
    const c = pc ? await pc.evaluate(() => document.body.innerText) : '';
    ok(/Funda\s*G\b/.test(c) && /Arroz selecto\s*E\b/.test(c), `${w}px: la factura carta marca G / E en cada línea`, c.slice(0, 500));
    ok(/Exento de ITBIS\s*RD\$ 185/.test(c) && /G = gravado ITBIS 18 % · E = exento/.test(c), `${w}px: la factura carta trae el total exento y la leyenda`, c.slice(0, 800));
    if (pc && OUT && w === 1280) await pc.screenshot({ path: OUT + '/itbis-carta.png', fullPage: true }).catch(() => {});
    if (pc) await pc.close();
    ok(s.errs.length === 0, `${w}px: 0 errores de JS`, s.errs); await s.ctx.close();
  }
  // Solo artículos gravados: no se agrega nada (el ticket queda como siempre)
  { const s = await abrir(b, { ancho: 390 });
    await vender(s.page, { prods: ['p2'], imei: false, monto: 590, ncf: 'sin' });
    const pop = await popup(s, () => window.nxPosVentaTicketVer && window.nxPosVentaTicketVer());
    const t = pop ? await pop.evaluate(() => document.body.innerText) : '';
    ok(t && !/\((G|E)\)/.test(t) && !/Exento/.test(t), 'sin mezcla gravado/exento: el ticket no agrega marcas', t.slice(0, 300));
    if (pop) await pop.close(); await s.ctx.close(); }
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`); process.exit(fail ? 1 : 0);
