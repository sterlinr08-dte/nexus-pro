// QA de «Clientes con RNC» (parches-pos-empresas.js, 27-oct-2026). Arnés de qa-pos-cubre6.mjs: app real con la REST de
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
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'PIZZERÍA DEMO', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }],
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
  await page.addInitScript(([o, us, apag]) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (apag) localStorage.setItem('nx_pos_empresas_off', '1'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'PIZZERÍA DEMO', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, !!off]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  await page.evaluate(() => window.nxPosTab('clientes')); await page.waitForTimeout(1200);
  return { ctx, page, errs, pedidos, externos };
}

const filas = page => page.evaluate(() => [...document.querySelectorAll('#nxEmpOv .eFila')].map(f => ({ id: f.dataset.emp, op: f.dataset.op === '1', txt: f.textContent.replace(/\s+/g, ' ').trim() })));
const chicos = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null).map(e => ({ t: e.textContent.trim().slice(0, 30) || e.getAttribute('aria-label'), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) })).filter(x => x.h < 44 || x.w < 44), sel);

const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    const s = await abrir(b, w); const page = s.page;
    const btn = await page.evaluate(() => { const e = document.querySelector('#v-pos .nxEmpAbrir'); return e ? { n: document.querySelectorAll('#v-pos .nxEmpAbrir').length, h: e.getBoundingClientRect().height, t: e.textContent.trim() } : null; });
    ok(btn && btn.n === 1 && /Clientes con RNC/.test(btn.t), `${w}px: una sola entrada «Clientes con RNC» en POS → Clientes`, btn);
    ok(btn && btn.h >= 44, `${w}px: botón de entrada de 44 px o más`, btn && btn.h);
    const desde = s.pedidos.length;
    await page.evaluate(() => document.querySelector('#v-pos .nxEmpAbrir').click()); await page.waitForTimeout(900);
    let f = await filas(page);
    const ids = f.map(x => x.id).sort().join(',');
    ok(ids === 'c2,c3,c4,c6', `${w}px: solo RNC/cédula válidos (9 u 11 dígitos): c2, c3, c4, c6`, ids);
    const por = Object.fromEntries(f.map(x => [x.id, x]));
    ok(por.c2 && por.c2.op && /Solo consumo/.test(por.c2.txt) && /Oportunidad: crédito fiscal/.test(por.c2.txt), `${w}px: c2 compra solo consumo → oportunidad de crédito fiscal`, por.c2);
    ok(por.c2 && /RD\$ 17,700\.00/.test(por.c2.txt), `${w}px: c2 comprado 90 días = RD$ 17,700.00`, por.c2 && por.c2.txt);
    ok(por.c3 && !por.c3.op && /Crédito fiscal/.test(por.c3.txt) && /RD\$ 23,600\.00/.test(por.c3.txt), `${w}px: c3 ya compra con B01 (sin oportunidad) y la venta anulada no cuenta`, por.c3);
    ok(por.c4 && por.c4.op && /60 días sin comprar/.test(por.c4.txt) && /RD\$ 0\.00/.test(por.c4.txt) && /Crédito fiscal/.test(por.c4.txt), `${w}px: c4 (E31 hace 100 días) → oportunidad por 60 días sin comprar`, por.c4);
    ok(por.c6 && por.c6.op && /Sin compras/.test(por.c6.txt) && /Cédula 402-1234567-8/.test(por.c6.txt), `${w}px: c6 cédula de 11 dígitos sin compras → oportunidad`, por.c6);
    ok(f[0] && f[0].op, `${w}px: las oportunidades van primero`, f.map(x => x.id));
    await page.evaluate(() => window.nxPosEmpFiltro('op')); await page.waitForTimeout(200);
    f = await filas(page); ok(f.length === 3 && f.every(x => x.op), `${w}px: filtro «Oportunidad» deja 3`, f.map(x => x.id));
    await page.evaluate(() => window.nxPosEmpFiltro('todos')); await page.waitForTimeout(200);
    await page.fill('#nxEmpQ', '101234'); await page.waitForTimeout(200);
    f = await filas(page); ok(f.length === 1 && f[0].id === 'c4', `${w}px: buscar por RNC encuentra c4`, f.map(x => x.id));
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'nxEmpQ'), `${w}px: el buscador no pierde el foco al escribir`);
    await page.fill('#nxEmpQ', ''); await page.waitForTimeout(200);
    const campo = await page.evaluate(() => { const i = document.getElementById('nxEmpQ'), l = i.closest('.eBusca'); return { h: Math.round(l.getBoundingClientRect().height), fs: getComputedStyle(i).fontSize, tn: getComputedStyle(document.querySelector('#nxEmpOv .eMonto')).fontVariantNumeric, tt: getComputedStyle(document.querySelector('#nxEmpOv .eNom')).textTransform }; });
    ok(campo.h >= 48 && campo.fs === '16px', `${w}px: buscador de 48 px y letra de 16 px`, campo);
    ok(/tabular-nums/.test(campo.tn) && campo.tt === 'none', `${w}px: montos con tabular-nums y sin mayúsculas forzadas`, campo);
    const peq = await chicos(page, '#nxEmpOv button, #nxEmpOv a');
    ok(!peq.length, `${w}px: todos los toques de la lista miden 44 px o más`, peq);
    const sc = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && (() => { const bx = document.querySelector('#nxEmpOv .eBody'); return bx.scrollWidth <= bx.clientWidth + 1; })());
    ok(sc, `${w}px: sin desplazamiento horizontal`);
    if (OUT) await page.screenshot({ path: OUT + `/empresas-lista-${w}.png` });

    // Borrador
    await page.evaluate(() => document.querySelector('#nxEmpOv [data-msg="c2"]').click()); await page.waitForTimeout(400);
    const dr = await page.evaluate(() => { const t = document.getElementById('nxEmpTxt'), a = document.getElementById('nxEmpWa'); return t && { txt: t.value, fs: getComputedStyle(t).fontSize, href: a.dataset.href }; });
    ok(dr && /crédito fiscal/.test(dr.txt) && /ITBIS/.test(dr.txt) && /18 %/.test(dr.txt), `${w}px: el borrador explica la factura de crédito fiscal y el ITBIS`, dr && dr.txt);
    ok(dr && !/[!¡]/.test(dr.txt) && /\b(Le|usted|su empresa)\b/.test(dr.txt) && !/\btu\b|\bte\b/i.test(dr.txt), `${w}px: trato de usted y sin exclamaciones`, dr && dr.txt);
    ok(dr && /PIZZERÍA DEMO/.test(dr.txt) && /RNC 1-31-88065-7/.test(dr.txt), `${w}px: lleva el negocio y el RNC del cliente`);
    ok(dr && dr.fs === '16px', `${w}px: texto editable con letra de 16 px`, dr && dr.fs);
    ok(dr && dr.href.startsWith('https://wa.me/18095551234?text='), `${w}px: «Abrir WhatsApp» prepara un enlace wa.me con el texto`, dr && dr.href.slice(0, 60));
    await page.fill('#nxEmpTxt', 'Texto editado por la persona.'); await page.waitForTimeout(100);
    const href2 = await page.evaluate(() => document.getElementById('nxEmpWa').dataset.href);
    ok(/text=Texto%20editado%20por%20la%20persona\./.test(href2), `${w}px: el enlace toma el texto editado`, href2);
    await page.click('#nxEmpCopiar'); await page.waitForTimeout(300);
    const cop = await page.evaluate(() => document.getElementById('nxEmpOk').textContent);
    ok(/copiado|No se pudo copiar/.test(cop), `${w}px: «Copiar» responde`, cop);
    const peqD = await chicos(page, '#nxEmpDr button, #nxEmpDr a');
    ok(!peqD.length, `${w}px: botones del borrador de 44 px o más`, peqD);
    if (OUT && w === 390) await page.screenshot({ path: OUT + `/empresas-borrador-${w}.png` });
    const [pop] = await Promise.all([page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null), page.click('#nxEmpWa')]);
    if (pop) { try { await pop.waitForURL(/wa\.me/, { timeout: 5000 }); } catch (e) {} }
    await page.waitForTimeout(300);
    ok(pop && /^https:\/\/wa\.me\/18095551234\?text=Texto%20editado/.test(pop.url()), `${w}px: abre wa.me en otra pestaña con el texto editado (una persona envía)`, pop && pop.url());
    ok(await page.$('#nxEmpOv') && !(await page.$('#nxWaTexto')), `${w}px: no se desvía al Buzón ni sale de la lista`);
    if (pop) await pop.close();
    // Sin teléfono: enlace desactivado
    await page.evaluate(() => { document.getElementById('nxEmpDr').remove(); document.querySelector('#nxEmpOv [data-msg="c6"]').click(); }); await page.waitForTimeout(300);
    const sinTel = await page.evaluate(() => ({ dis: document.getElementById('nxEmpWa').getAttribute('aria-disabled'), txt: document.getElementById('nxEmpTxt').value, aviso: document.getElementById('nxEmpOk').textContent }));
    ok(sinTel.dis === 'true' && /teléfono/.test(sinTel.aviso) && /\busted\b/.test(sinTel.txt), `${w}px: sin teléfono el enlace queda apagado y se puede copiar (cédula → «usted»)`, sinTel);
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);

    // CSV
    const csv = await page.evaluate(() => window.nxPosEmpCSVTexto());
    const lineas = csv.replace(/^﻿/, '').split('\r\n');
    ok(lineas.length === 5 && /^Cliente,Tipo,RNC o cédula/.test(lineas[0]), `${w}px: CSV con encabezado y 4 clientes`, lineas.length);
    ok(lineas.some(l => /^EMPRESA SRL,RNC,1-31-88065-7,809-555-1234,18095551234,17700\.00,/.test(l) && /Compra sin crédito fiscal/.test(l)), `${w}px: fila de c2 correcta en el CSV`, lineas[1]);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('#nxEmpCSV')]);
    ok(dl && /^clientes-con-rnc-\d{4}-\d{2}-\d{2}\.csv$/.test(dl.suggestedFilename()), `${w}px: «Exportar CSV» descarga el archivo`, dl && dl.suggestedFilename());

    // Nada se envía ni se escribe
    const nuevos = s.pedidos.slice(desde);
    const wsp = nuevos.filter(p => /^\/functions\//.test(p.t || '') || (p.m !== 'GET' && /whatsapp|zernio/i.test(p.t || '')));
    ok(!wsp.length, `${w}px: ningún pedido a funciones (Edge) de WhatsApp ni POST de WhatsApp`, wsp);
    const escr = nuevos.filter(p => p.m !== 'GET');
    ok(!escr.length, `${w}px: la herramienta no escribe en la base`, escr.slice(0, 3));
    const leidas = [...new Set(nuevos.filter(p => p.m === 'GET' && /^pos_/.test(p.t)).map(p => p.t))].sort().join(',');
    ok(leidas === 'pos_clientes,pos_ventas', `${w}px: solo lee pos_clientes y pos_ventas`, leidas);
    const extWa = s.externos.filter(x => /graph\.facebook|whatsapp/i.test(x.h));
    ok(!extWa.length, `${w}px: ninguna llamada a la API de WhatsApp`, extWa);

    // Modo oscuro
    await page.evaluate(() => document.body.classList.add('tema-premium')); await page.waitForTimeout(200);
    const osc = await page.evaluate(() => getComputedStyle(document.querySelector('#nxEmpOv .eBox')).backgroundColor);
    ok(/rgba?\(15, 23, 42/.test(osc), `${w}px: modo oscuro aplica`, osc);
    if (OUT && w === 390) await page.screenshot({ path: OUT + `/empresas-oscuro-${w}.png` });
    await page.evaluate(() => window.nxPosEmpCerrar()); await page.waitForTimeout(100);
    ok(!(await page.$('#nxEmpOv')), `${w}px: se cierra`);
    ok(!s.errs.length, `${w}px: sin errores de JS`, s.errs);
    await s.ctx.close();
  }
  // Apagado
  const s = await abrir(b, 390, true);
  ok(!(await s.page.$('#v-pos .nxEmpAbrir')) && !(await s.page.evaluate(() => typeof window.nxPosEmpresas)).includes('function'), 'apagado con nx_pos_empresas_off=1: no aparece');
  ok(!s.errs.length, 'apagado: sin errores de JS', s.errs);
  await s.ctx.close();
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`); process.exit(fail ? 1 : 0);
