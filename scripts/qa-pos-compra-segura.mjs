// QA del bloque «Compra segura» en el ticket y la factura (27-oct-2026). Arnés de qa-ecf-caja.mjs / qa-pos-cubre6.mjs:
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
      { id: 'p2', nombre: 'Funda', precio: 590, costo: 100, stock: 50, itbis: true, activo: true, tipo: 'producto', garantia_dias: 0 }
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
  const gar = garEsperada(365);
  // 1) Venta con garantía + IMEI y B02 → ticket y factura carta
  for (const w of [390, 1280]) {
    const s = await abrir(b, { ancho: w });
    await vender(s.page, { prods: ['p1', 'p2'], imei: true, monto: 12390 });
    const rpc = s.pedidos.find(p => p.t === 'rpc/pos_registrar_venta_atomica');
    const it1 = rpc && rpc.body.p_items.find(x => x.producto_id === 'p1');
    ok(it1 && it1.serial === IMEI && it1.garantia_hasta, `${w}px: la venta guarda IMEI y garantía en la línea`, it1);
    const pop = await popup(s, () => window.nxPosVentaTicketVer && window.nxPosVentaTicketVer());
    const t = pop ? await bloque(pop) : null;
    ok(t && /Compra segura/.test(t), `${w}px: el ticket trae el bloque «Compra segura»`, t);
    ok(t && t.includes('Garantía hasta ' + gar), `${w}px: ticket «Garantía hasta ${gar}»`, t);
    ok(t && (t.match(/Garantía hasta/g) || []).length === 1, `${w}px: la funda (sin garantía) no inventa garantía`, t);
    ok(t && t.includes('IMEI / serial registrado: ' + IMEI), `${w}px: ticket con el IMEI registrado`, t);
    ok(t && /Comprobante fiscal NCF B02/.test(t), `${w}px: ticket con el comprobante fiscal B02`, t);
    ok(t && /Guarde esta factura para cualquier reclamo/.test(t), `${w}px: ticket «Guarde esta factura…»`, t);
    if (pop && w === 390) {
      for (const tw of [220, 302]) { const a = await anchoOk(pop, tw); ok(a.sw <= a.cw && a.br <= a.cw + 0.5 && a.bl >= 0, `térmica ${tw === 220 ? '58' : '80'} mm (${tw}px): el bloque cabe sin desbordar`, a); }
      if (OUT) { await pop.setViewportSize({ width: 302, height: 1000 }); await pop.screenshot({ path: OUT + '/compra-segura-ticket.png', fullPage: true }).catch(() => {}); }
    }
    if (pop) await pop.close();
    const pc = await popup(s, () => window.nxFacDocVenta && window.nxFacDocVenta('00000000-0000-4000-8000-0000000000a1'));
    const c = pc ? await bloque(pc) : null;
    ok(c && /Compra segura/.test(c) && c.includes('Garantía hasta ' + gar) && c.includes(IMEI) && /B02/.test(c), `${w}px: la factura carta trae el bloque con garantía, IMEI y NCF`, c);
    if (pc) { const a = await pc.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); ok(a.sw <= a.cw, `${w}px: la factura carta no desborda a lo ancho`, a); }
    if (pc && OUT && w === 1280) await pc.screenshot({ path: OUT + '/compra-segura-carta.png', fullPage: true }).catch(() => {});
    if (pc) await pc.close();
    ok(!s.errs.length, `${w}px: sin errores de JS (con garantía)`, s.errs);
    await s.ctx.close();
  }
  // 2) Venta sin garantía, sin IMEI y sin comprobante → no sale nada
  {
    const s = await abrir(b, { ancho: 390 });
    await vender(s.page, { prods: ['p2'], ncf: 'sin', monto: 590 });
    const pop = await popup(s, () => window.nxPosVentaTicketVer());
    const html = pop ? await pop.content() : '';
    ok(pop && !/nxCs|Compra segura|Garantía hasta|Guarde esta factura/.test(html), 'sin garantía ni IMEI ni NCF: el ticket no inventa nada', html.length);
    if (pop) await pop.close();
    ok(!s.errs.length, 'sin errores de JS (sin garantía)', s.errs);
    await s.ctx.close();
  }
  // 3) Ajustes: interruptor + texto del negocio (390 claro y 1280 oscuro)
  for (const [w, osc] of [[390, false], [1280, true]]) {
    const s = await abrir(b, { ancho: w, oscuro: osc });
    await s.page.evaluate(() => window.nxPosTab('ajustes')); await s.page.waitForTimeout(1500);
    const m = await s.page.evaluate(() => {
      const c = document.getElementById('nxCsCard'), sw = document.getElementById('nxCsSw'), ta = document.getElementById('nxCsTxt');
      const prev = c && c.previousElementSibling;
      return { hay: !!c, n: document.querySelectorAll('#nxCsCard').length, tras: !!(prev && prev.querySelector('#cfgGarantiaRepDias')), on: sw && sw.getAttribute('aria-checked'), swH: sw ? sw.getBoundingClientRect().height : 0, swW: sw ? sw.getBoundingClientRect().width : 0, taH: ta ? ta.getBoundingClientRect().height : 0, taF: ta ? getComputedStyle(ta).fontSize : '', max: ta && ta.maxLength, tt: ta ? getComputedStyle(ta).textTransform : '', sw2: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, bg: c ? getComputedStyle(c).backgroundColor : '', ink: c ? getComputedStyle(c.querySelector('.csLbl')).color : '' };
    });
    ok(m.hay && m.n === 1 && m.tras, `${w}px: Ajustes muestra una sola tarjeta «Compra segura», debajo de la garantía de reparación`, m);
    ok(m.on === 'true', `${w}px: el interruptor viene encendido por defecto`, m.on);
    ok(m.swH >= 44 && m.swW >= 44, `${w}px: interruptor tocable de 44 px o más`, m);
    ok(m.taH >= 48 && m.taF === '16px' && m.max === 160 && m.tt === 'none', `${w}px: texto del negocio 48 px / 16 px, límite 160, sin mayúsculas forzadas`, m);
    ok(m.sw2 <= m.cw, `${w}px: Ajustes sin desborde horizontal`, m);
    if (osc) { const n = (m.ink.match(/\d+/g) || []).slice(0, 3).map(Number); ok(n.length === 3 && n[0] + n[1] + n[2] > 500 && !/^rgb\(255, 255, 255\)$/.test(m.bg), '1280px oscuro: la tarjeta usa el tema oscuro (letra clara, fondo no blanco)', m); }
    await s.page.locator('#nxCsTxt').fill('Cambios en 7 días con factura y empaque original. ' + 'x'.repeat(200));
    await s.page.waitForTimeout(500);
    const ls = await s.page.evaluate(() => ({ t: localStorage.getItem('nx_pos_cs_texto'), cnt: document.getElementById('nxCsCnt').textContent }));
    ok(ls.t && ls.t.length <= 160 && /^Cambios en 7 días/.test(ls.t) && /160 \/ 160/.test(ls.cnt), `${w}px: el texto se guarda en el equipo con tope de 160`, ls);
    if (OUT) { await s.page.evaluate(() => document.getElementById('nxCsCard').scrollIntoView({ block: 'center' })); await s.page.waitForTimeout(300); await s.page.locator('#nxCsCard').screenshot({ path: OUT + `/compra-segura-ajustes-${w}${osc ? '-oscuro' : ''}.png` }).catch(() => {}); }
    if (w === 390) {
      await s.page.locator('#nxCsTxt').fill('Cambios en 7 días con factura y empaque original.'); await s.page.waitForTimeout(500);
      await vender(s.page, { prods: ['p1'], imei: true, monto: 11800 });
      let pop = await popup(s, () => window.nxPosVentaTicketVer());
      let t = pop ? await bloque(pop) : null;
      ok(t && /Cambios en 7 días con factura y empaque original\./.test(t), 'el texto del negocio sale en el ticket', t);
      if (pop) await pop.close();
      // apagar con el interruptor → no sale
      await s.page.evaluate(() => window.nxPosTab('ajustes')); await s.page.waitForTimeout(1200);
      await s.page.evaluate(() => document.getElementById('nxCsSw').click()); await s.page.waitForTimeout(200);
      const off = await s.page.evaluate(() => ({ a: document.getElementById('nxCsSw').getAttribute('aria-checked'), ls: localStorage.getItem('nx_pos_cs_mostrar') }));
      ok(off.a === 'false' && off.ls === '0', 'el interruptor se apaga y queda guardado', off);
      pop = await popup(s, () => window.nxPosVentaTicketVer());
      const html = pop ? await pop.content() : '';
      ok(pop && !/class="nxCs"/.test(html) && /IMEI: 356789104455661/.test(html), 'interruptor apagado: el bloque no sale (el IMEI de la línea sigue como siempre)');
      if (pop) await pop.close();
    }
    ok(!s.errs.length, `${w}px: sin errores de JS (Ajustes)`, s.errs);
    await s.ctx.close();
  }
  // 4) e-CF E32: el QR de la DGII sigue saliendo y el bloque lo menciona; la carta trae el QR
  {
    const s = await abrir(b, { conE: true, ancho: 390 });
    await vender(s.page, { prods: ['p1'], ncf: 'ecf32', imei: true, monto: 11800 });
    const pop = await popup(s, () => window.nxPosVentaTicketVer());
    const html = pop ? await pop.content() : '';
    const t = pop ? await bloque(pop) : null;
    ok(/Factura de consumo electrónica/.test(html) && /<img src="data:image\/png;base64,[^"]{200,}" alt="Código QR de la DGII"/.test(html) && /Código de seguridad: <b>fWCZCV<\/b>/.test(html), 'e-CF: el ticket sigue con su QR y código de seguridad');
    ok(t && /Factura electrónica e-NCF E320000000001: verifíquela con el código QR de arriba/.test(t) && t.includes('Garantía hasta ' + gar), 'e-CF: el bloque cita el e-NCF y el QR, más la garantía', t);
    ok(html.indexOf('alt="Código QR de la DGII"') < html.indexOf('class="nxCs"'), 'e-CF: el bloque va debajo del QR');
    if (pop && OUT) { await pop.setViewportSize({ width: 302, height: 1000 }); await pop.screenshot({ path: OUT + '/compra-segura-ticket-ecf.png', fullPage: true }).catch(() => {}); }
    if (pop) await pop.close();
    const pc = await popup(s, () => window.nxFacDocVenta('00000000-0000-4000-8000-0000000000a1'));
    const hc = pc ? await pc.content() : '';
    ok(/class="nxCs"[\s\S]*<img src="data:image\/png;base64,[^"]{200,}" alt="Código QR de la DGII"/.test(hc) && /verifíquela con el código QR de la DGII/.test(hc), 'e-CF: la factura carta trae el QR de la DGII dentro del bloque');
    if (pc) await pc.close();
    ok(!s.errs.length, 'sin errores de JS (e-CF)', s.errs);
    await s.ctx.close();
  }
  // 5) Capa apagada con nx_pos_compra_segura_off='1' → ni tarjeta ni bloque
  {
    const s = await abrir(b, { ancho: 1280, ls: { nx_pos_compra_segura_off: '1' } });
    await s.page.evaluate(() => window.nxPosTab('ajustes')); await s.page.waitForTimeout(1200);
    ok(!(await s.page.locator('#nxCsCard').count()), 'capa apagada: Ajustes no muestra la tarjeta');
    await vender(s.page, { prods: ['p1'], imei: true, monto: 11800 });
    const pop = await popup(s, () => window.nxPosVentaTicketVer());
    const html = pop ? await pop.content() : '';
    ok(pop && !/class="nxCs"/.test(html) && /Garantía hasta: /.test(html), 'capa apagada: el ticket sale igual que antes');
    if (pop) await pop.close();
    ok(!s.errs.length, 'sin errores de JS (capa apagada)', s.errs);
    await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`); process.exit(fail ? 1 : 0);
