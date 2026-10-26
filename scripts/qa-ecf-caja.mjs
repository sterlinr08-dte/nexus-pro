// QA de la factura electrónica en la caja (e-CF fase 3, 26-oct-2026). App real con la REST de Supabase y la Edge
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
    pos_productos: [{ id: 'p1', nombre: 'Pizza grande', precio: 650, costo: 200, stock: 50, itbis: true, activo: true, tipo: 'producto' }],
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
const opciones = page => page.evaluate(() => [...document.querySelectorAll('#facNCFSel option')].map(o => o.value));
async function vender(page, ncf, cli) {
  await page.evaluate(() => window.nxPosTab('factura')); await page.waitForTimeout(1200);
  await page.evaluate(([n, c]) => { if (c) window.nxFacSetCli(c); window.nxFacAdd('p1'); window.nxFacNCFPick(n); }, [ncf, cli]); await page.waitForTimeout(500);
  await page.evaluate(() => window.nxPosCobrar()); await page.waitForTimeout(900);
  await page.evaluate(() => { const e = document.getElementById('payEfe'); if (e) { e.value = '650'; e.dispatchEvent(new Event('input', { bubbles: true })); } }); await page.waitForTimeout(300);
  await page.evaluate(() => window.nxPosConfirmar()); await page.waitForTimeout(2500);
}
const edgeOk = body => body.accion === 'emitir'
  ? [{ ok: true, status: 200, entorno: 'TesteCF', ncf: 'E320000000001', ecf_estado: 'En Cola', ecf_security_code: 'fWCZCV', ecf_qr_url: 'https://fc.dgii.gov.do/testecf/consultatimbrefc?rncemisor=131880657&encf=E320000000001&montototal=650&codigoseguridad=fWCZCV', ecf_firmado: '26-10-2026 11:00:00' }, 200]
  : [{ ok: true, entorno: 'TesteCF', status: 404 }, 200];

const b = await chromium.launch();
try {
  // 1) Negocio SIN secuencia E: nada cambia
  {
    const s = await abrir(b, false, 1280, edgeOk);
    await s.page.evaluate(() => window.nxPosTab('factura')); await s.page.waitForTimeout(1200);
    const op = await opciones(s.page);
    ok(op.includes('consumo') && !op.includes('ecf32') && !op.includes('ecf31'), 'sin secuencia E: el selector no ofrece factura electrónica', op);
    await s.page.evaluate(() => window.nxPosTab('ajustes')); await s.page.waitForTimeout(1500);
    ok(!(await s.page.locator('#ecfRnc').count()), 'sin secuencia E: Ajustes no muestra la tarjeta e-CF');
    await vender(s.page, 'consumo');
    ok(s.pedidos.some(p => p.t === 'rpc/pos_siguiente_ncf'), 'venta B02: sigue usando pos_siguiente_ncf como siempre');
    ok(!s.pedidos.some(p => p.m === 'EDGE'), 'venta B02: no llama a ecf-mseller');
    ok(!s.errs.length, 'sin errores de JS (sin e-CF)', s.errs);
    await s.ctx.close();
  }
  // 2) Con secuencia E32: venta de consumo electrónica
  {
    const s = await abrir(b, true, 390, edgeOk);
    await s.page.evaluate(() => window.nxPosTab('factura')); await s.page.waitForTimeout(1200);
    const op = await opciones(s.page);
    ok(op.includes('ecf32') && !op.includes('ecf31'), 'con E32 (y sin E31): solo ofrece Consumo electrónica', op);
    if (OUT) await s.page.screenshot({ path: OUT + '/ecf-factura-390.png', timeout: 12000 }).catch(() => console.log('(captura omitida)'));
    await vender(s.page, 'ecf32');
    const venta = s.pedidos.find(p => p.t === 'rpc/pos_registrar_venta_atomica');
    ok(venta && venta.body.p_venta.tipo_comprobante === 'ecf32', 'la venta se guarda con tipo_comprobante ecf32', venta && venta.body.p_venta.tipo_comprobante);
    const e = s.pedidos.filter(p => p.m === 'EDGE');
    ok(e.length === 1 && e[0].body.accion === 'emitir' && e[0].body.venta_id === VID && e[0].body.tipo === 32, 'después de guardar llama a ecf-mseller {emitir, venta_id, tipo 32}', e.map(x => x.body));
    ok(s.pedidos.findIndex(p => p.t === 'rpc/pos_registrar_venta_atomica') < s.pedidos.findIndex(p => p.m === 'EDGE'), 'primero se guarda la venta, después se emite');
    ok(!s.pedidos.some(p => p.t === 'rpc/pos_siguiente_ncf' || p.t === 'rpc/pos_siguiente_encf'), 'el navegador no toma números: el e-NCF lo toma el servidor');
    ok(!s.pedidos.some(p => p.m === 'PATCH' && p.t === 'pos_ventas' && p.body && p.body.ncf), 'el navegador no escribe el NCF en la venta');
    const modal = await s.page.evaluate(() => (document.querySelector('#nxPosPago .modal') || {}).innerText || '');
    ok(/Factura electrónica/i.test(modal) && /E320000000001/.test(modal), 'la ventana «Vendido» muestra el e-NCF', modal.slice(0, 300));
    if (OUT) await s.page.screenshot({ path: OUT + '/ecf-vendido-390.png', timeout: 12000 }).catch(() => console.log('(captura omitida)'));
    const [pop] = await Promise.all([s.ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), s.page.evaluate(() => window.nxPosVentaTicketVer && window.nxPosVentaTicketVer())]);
    if (pop) { await pop.waitForTimeout(800); }
    const html = pop ? await pop.content() : '';
    ok(/Factura de consumo electrónica/.test(html) && /E320000000001/.test(html), 'el recibo dice «Factura de consumo electrónica» y el e-NCF');
    ok(/Código de seguridad: <b>fWCZCV<\/b>/.test(html) && /Fecha de firma/.test(html), 'el recibo trae código de seguridad y fecha de firma');
    ok(/<img src="data:image\/png;base64,[^"]{200,}" alt="Código QR de la DGII"/.test(html), 'el recibo trae el código QR (imagen generada en el equipo)');
    ok(!/[^-]NCF: <b>E32/.test(html), 'no repite el e-NCF como NCF de serie B');
    if (pop && OUT) { await pop.setViewportSize({ width: 390, height: 1100 }); await pop.screenshot({ path: OUT + '/ecf-recibo.png', fullPage: true, timeout: 12000 }).catch(() => console.log('(captura omitida)')); }
    ok(!s.errs.length, 'sin errores de JS (E32)', s.errs);
    await s.ctx.close();
  }
  // 3) E32 cuando MSeller falla: la venta queda y se avisa
  {
    const s = await abrir(b, true, 1280, body => body.accion === 'emitir' ? [{ ok: false, status: 412, error: 'No hay un certificado digital activo asociado a este usuario.' }, 412] : [{ ok: true }, 200]);
    await vender(s.page, 'ecf32');
    ok(s.pedidos.some(p => p.t === 'rpc/pos_registrar_venta_atomica'), 'MSeller falla: la venta igual quedó guardada');
    const toast = await s.page.evaluate(() => [...document.querySelectorAll('.toast, .nxToast, [class*="toast"]')].map(x => x.innerText).join(' | '));
    ok(/factura electrónica no/i.test(toast) && /certificado/i.test(toast), 'avisa que la factura electrónica no salió y por qué', toast.slice(0, 300));
    const modal = await s.page.evaluate(() => (document.querySelector('#nxPosPago .modal') || {}).innerText || '');
    ok(/Pendiente/i.test(modal), 'la ventana «Vendido» la marca pendiente');
    ok(!s.errs.length, 'sin errores de JS (falla MSeller)', s.errs);
    await s.ctx.close();
  }
  // 4) E31 exige RNC del cliente; Ajustes muestra la tarjeta e-CF
  {
    const s = await abrir(b, true, 1280, edgeOk);
    s.D.pos_ncf_secuencias.push({ id: 's3', tipo: 'E31', prefijo: 'E31', desde: 1, hasta: 100, actual: 1, activo: true, vencimiento: '2027-12-31' });
    await s.page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await s.page.waitForTimeout(2500);
    await s.page.evaluate(() => window.nxPosTab('factura')); await s.page.waitForTimeout(1200);
    ok((await opciones(s.page)).includes('ecf31'), 'con E31: ofrece Crédito fiscal electrónica');
    await vender(s.page, 'ecf31', 'c1');
    ok(!s.pedidos.some(p => p.t === 'rpc/pos_registrar_venta_atomica'), 'E31 con cliente sin RNC: no se cobra');
    ok(!s.pedidos.some(p => p.t === 'rpc/pos_siguiente_secuencia' || /pos_secuencias/.test(p.t) && p.m !== 'GET'), 'E31 sin RNC: no gasta número de factura');
    await s.page.evaluate(() => { const m = document.getElementById('nxPosPago'); if (m) m.remove(); });
    await s.page.evaluate(() => window.nxPosTab('ajustes')); await s.page.waitForTimeout(1500);
    ok(await s.page.locator('#ecfRnc').count() === 1, 'Ajustes muestra la tarjeta «Factura electrónica (e-CF)»');
    ok(await s.page.inputValue('#ecfRnc') === '131880657', 'la tarjeta carga el RNC guardado');
    const fila = await s.page.evaluate(() => [...document.querySelectorAll('td')].map(t => t.innerText).filter(t => /^E3\d{11}$/.test(t.trim())));
    ok(fila.includes('E320000000001') && fila.includes('E310000000001'), 'la tabla muestra el próximo e-NCF con 10 dígitos', fila);
    const medidas = await s.page.evaluate(() => ['ecfRnc', 'ecfRaz', 'ecfDir'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.height), parseFloat(getComputedStyle(document.getElementById(id)).fontSize)]; }));
    ok(medidas.every(([h, f]) => h >= 40 && f >= 16), 'campos e-CF: alto y letra de 16 px', medidas);
    const bt = await s.page.evaluate(() => [...document.querySelectorAll('button[onclick*="nxEcf"]')].map(x => Math.round(x.getBoundingClientRect().height)));
    ok(bt.length === 2 && bt.every(h => h >= 44), 'botones e-CF ≥ 44 px', bt);
    await s.page.locator('#ecfRnc').scrollIntoViewIfNeeded();
    if (OUT) await s.page.screenshot({ path: OUT + '/ecf-ajustes-1280.png', timeout: 12000 }).catch(() => console.log('(captura omitida)'));
    await s.page.fill('#ecfRnc', '13-18'); await s.page.evaluate(() => window.nxEcfGuardar()); await s.page.waitForTimeout(500);
    ok(!s.pedidos.some(p => p.m === 'PATCH' && p.t === 'pos_config'), 'RNC inválido: no guarda');
    await s.page.fill('#ecfRnc', '1-31-88065-7'); await s.page.evaluate(() => window.nxEcfGuardar()); await s.page.waitForTimeout(800);
    const pt = s.pedidos.find(p => p.m === 'PATCH' && p.t === 'pos_config');
    ok(pt && pt.body.ecf_rnc === '131880657', 'guarda el RNC solo con dígitos', pt && pt.body);
    ok(!s.errs.length, 'sin errores de JS (E31/Ajustes)', s.errs);
    await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`);
process.exit(fail ? 1 : 0);
