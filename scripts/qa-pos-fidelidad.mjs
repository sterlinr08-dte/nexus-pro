// QA de «Clientes que vuelven» (parches-pos-fidelidad.js, 27-oct-2026). Arnés copiado de qa-pos-cubre6.mjs:
// app real con la REST de Supabase SIMULADA (nunca toca la base real). Comprueba la clasificación con fechas
// conocidas, que el borrador de WhatsApp NO envía nada (cero POST, cero Edge Functions), la sugerencia en la
// factura (con % > 0 sí, con 0 no), el CSV, toques de 44 px, 0 errores de JS, 390 y 1280 px, y el apagado.
// Uso (desde la raíz): python3 -m http.server 8944 &   NODE_PATH=/opt/node22/lib/node_modules node scripts/qa-pos-fidelidad.mjs
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8944';
const OUT = process.env.QA_OUT || '';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';
const DIA = 864e5, AHORA = Date.now();
const hace = d => new Date(AHORA - d * DIA - 3600e3).toISOString();

function db() {
  let n = 0;
  const v = (cli, d, total, extra) => Object.assign({ id: 'v' + (++n), numero: n, cliente_id: cli, cliente_nombre: cli, total, estado: 'completada', fecha: hace(d), created_at: hace(d) }, extra || {});
  return {
    organizaciones: [{ id: ORG, slug: 'demo', nombre: 'Tienda Demo', tipo: 'tienda', activo: true }],
    usuarios_sistema: [{ id: USR, nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: ORG }],
    pos_config: [{ organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_productos: [{ id: 'p1', nombre: 'Celular', precio: 11800, costo: 6000, stock: 50, itbis: true, activo: true, tipo: 'producto' }],
    pos_clientes: [
      { id: 'c1', nombre: 'Ana Rosario', telefono: '809-555-0001', activo: true, es_cliente: true },
      { id: 'c2', nombre: 'Beto Díaz', telefono: '809-555-0002', activo: true, es_cliente: true },
      { id: 'c3', nombre: 'Carla Peña', telefono: '809-555-0003', activo: true, es_cliente: true },
      { id: 'c4', nombre: 'Darío Gil', telefono: '', activo: true, es_cliente: true },
      { id: 'c5', nombre: 'Eva Mota', telefono: '', activo: true, es_cliente: true },
      { id: 'c6', nombre: 'Fabio Luna', telefono: '', activo: true, es_cliente: true },
      { id: 'c7', nombre: 'Gina Reyes', telefono: '', activo: true, es_cliente: true }
    ],
    pos_ventas: [
      v('c1', 5, 1000), v('c1', 20, 1500), v('c1', 40, 500), v('c1', 70, 1000), // frecuente: 4 en 90 días, 4,000
      v('c2', 50, 2000), v('c2', 80, 2000), v('c2', 120, 2000), v('c2', 150, 2000), // por perder: 50 días sin volver
      v('c3', 30, 11800), // una sola compra
      v('c4', 200, 900), // una compra, pero hace más de 120 días: ninguno
      v('c5', 10, 300), v('c5', 20, 300), // 2 compras: ninguno
      v('c6', 5, 700, { estado: 'anulada' }), v('c6', 12, 700, { anulada: true }), v('c6', 10, 700), v('c6', 15, 700), // anuladas no cuentan: ninguno
      v('c7', 50, 400), v('c7', 60, 400), v('c7', 70, 400) // 3 en 90 días pero 50 sin volver: por perder
    ],
    pos_venta_items: [{ id: 'i1', venta_id: 'v9', producto_id: 'p1', nombre: 'Celular', garantia_hasta: new Date(AHORA + 60 * DIA).toISOString().slice(0, 10) }],
    pos_cajas: [{ id: 'cj1', estado: 'abierta', apertura: hace(1), monto_inicial: 0 }]
  };
}

async function abrir(b, ancho, apagar) {
  const ctx = await b.newContext({ viewport: { width: ancho, height: 860 }, acceptDownloads: true });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const pedidos = []; const D = db();
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => {
    const req = r.request(), u = new URL(req.url());
    if (!/supabase\.co$/.test(u.hostname)) { if (/wa\.me$/.test(u.hostname)) pedidos.push({ m: req.method(), t: 'WAME', q: u.search }); return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u.href) ? 'text/css' : (/wa\.me/.test(u.hostname) ? 'text/html' : 'application/javascript'), body: '' }); }
    const send = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.pathname.startsWith('/functions/v1/')) { pedidos.push({ m: req.method(), t: 'EDGE ' + u.pathname }); return send({ ok: true }); }
    if (u.pathname.startsWith('/auth/')) return send({});
    if (!u.pathname.startsWith('/rest/v1/')) return send({ ok: true });
    const t = u.pathname.slice(9);
    pedidos.push({ m: req.method(), t, q: u.search });
    if (t.startsWith('rpc/')) return send(null);
    if (req.method() !== 'GET') return send([]);
    let filas = D[t] || [];
    for (const [k, v] of u.searchParams) { if (/^(select|order|limit|offset|on_conflict)$/.test(k)) continue; const m = /^eq\.(.*)$/.exec(v); if (m) filas = filas.filter(x => x[k] === undefined || String(x[k]) === m[1]); }
    return send(filas.slice(0, 1000));
  });
  await page.addInitScript(([o, us, off]) => { localStorage.setItem('nx_auth_mode', 'legacy'); if (off) localStorage.setItem('nx_pos_fidelidad_off', '1'); sessionStorage.setItem('nx_sesion', JSON.stringify({ id: us, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: o, org: { id: o, nombre: 'Tienda Demo', tipo: 'tienda' }, inicio: Date.now() })); sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1'); }, [ORG, USR, !!apagar]);
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(4000);
  await page.evaluate(() => window.nxAbrirPOS && window.nxAbrirPOS()); await page.waitForTimeout(3000);
  return { ctx, page, errs, pedidos, D };
}
const chicos = (page, sel) => page.evaluate(s => Array.from(document.querySelectorAll(s)).filter(e => e.offsetParent !== null).map(e => ({ t: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) })).filter(x => x.h < 44 || x.w < 44), sel);
const sugTxt = page => page.evaluate(() => Array.from(document.querySelectorAll('#facOtrasSlot .facSugIt')).map(x => x.textContent.trim()).filter(t => /frecuente/i.test(t)));

const b = await chromium.launch();
try {
  for (const w of [390, 1280]) {
    const s = await abrir(b, w); const page = s.page;
    // 1) Clasificación pura con fechas conocidas
    const pura = await page.evaluate(() => {
      const T = window.__nxPosFidTest; if (!T) return null;
      const ah = Date.parse('2026-10-27T15:00:00Z'), d = n => new Date(ah - n * 864e5).toISOString();
      const r = T.clasificar([
        { cliente_id: 'x', estado: 'completada', total: 100, fecha: d(1) }, { cliente_id: 'x', estado: 'completada', total: 200, fecha: d(30) }, { cliente_id: 'x', estado: 'completada', total: 300, fecha: d(89) },
        { cliente_id: 'y', estado: 'completada', total: 100, fecha: d(46) }, { cliente_id: 'y', estado: 'completada', total: 100, fecha: d(100) }, { cliente_id: 'y', estado: 'completada', total: 100, fecha: d(300) },
        { cliente_id: 'z', estado: 'completada', total: 50, fecha: d(119) }, { cliente_id: 'w', estado: 'completada', total: 50, fecha: d(121) },
        { cliente_id: 'q', estado: 'completada', total: 9, fecha: d(2) }, { cliente_id: 'q', estado: 'anulada', total: 9, fecha: d(3) }, { cliente_id: 'q', estado: 'completada', anulada: true, total: 9, fecha: d(4) }
      ], [], ah);
      return { f: r.grupos.frecuentes.map(x => x.id + ':' + x.total90 + ':' + x.ticket90), p: r.grupos.perder.map(x => x.id), u: r.grupos.una.map(x => x.id) };
    });
    ok(pura && pura.f.join() === 'x:600:200' && pura.p.join() === 'y' && pura.u.join() === 'q,z', `${w}px: clasificación pura (89 días frecuente, 46 días por perder, 119 sí y 121 no, anuladas fuera)`, pura);

    // 2) Botón en Clientes y panel
    await page.evaluate(() => window.nxPosTab('clientes')); await page.waitForTimeout(1200);
    const bot = await page.evaluate(() => { const x = document.querySelector('.nxFidAbrir'); return x ? Math.round(x.getBoundingClientRect().height) : 0; });
    ok(bot >= 44, `${w}px: botón «Clientes que vuelven» en Clientes, 44 px o más`, bot);
    await page.click('.nxFidAbrir'); await page.waitForTimeout(1200);
    const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('#nxFidPanel .nxFidTab')).map(t => t.textContent.trim().replace(/\s+/g, ' ')));
    ok(tabs.join('|') === 'Frecuentes 1|Por perder 2|Una sola compra 1', `${w}px: conteos 1 frecuente, 2 por perder, 1 una sola compra`, tabs);
    const nom = async () => page.evaluate(() => Array.from(document.querySelectorAll('#nxFidPanel .nxFidRow b')).map(x => x.textContent));
    const frec = await nom();
    const fila1 = await page.evaluate(() => document.querySelector('#nxFidPanel .nxFidRow')?.textContent || '');
    ok(frec.join() === 'Ana Rosario' && /4,000\.00/.test(fila1) && /1,000\.00/.test(fila1), `${w}px: Ana frecuente con total 4,000 y ticket 1,000`, fila1);
    const tn = await page.evaluate(() => getComputedStyle(document.querySelector('#nxFidPanel .nxFidMo')).fontVariantNumeric);
    ok(/tabular-nums/.test(tn), `${w}px: montos con tabular-nums`, tn);
    await page.evaluate(() => window.nxPosFidGrupo('perder')); await page.waitForTimeout(200);
    ok((await nom()).join() === 'Beto Díaz,Gina Reyes', `${w}px: por perder Beto y Gina (Gina tenía 3 en 90 días pero 50 sin volver)`, await nom());
    await page.evaluate(() => window.nxPosFidGrupo('una')); await page.waitForTimeout(200);
    ok((await nom()).join() === 'Carla Peña', `${w}px: una sola compra solo Carla (Darío, 200 días, no)`, await nom());
    ok(!(await chicos(page, '#nxFidPanel button')).length, `${w}px: todos los toques del panel de 44 px o más`, await chicos(page, '#nxFidPanel button'));
    const mayus = await page.evaluate(() => Array.from(document.querySelectorAll('#nxFidPanel *')).filter(e => getComputedStyle(e).textTransform === 'uppercase').length);
    ok(mayus === 0, `${w}px: sin mayúsculas forzadas`, mayus);
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(ancho, `${w}px: sin desplazamiento horizontal`);
    if (OUT && w === 390) { await page.evaluate(() => window.nxPosFidGrupo('frecuentes')); await page.waitForTimeout(300); await page.screenshot({ path: OUT + '/fidelidad-390-panel.png' }); await page.evaluate(() => window.nxPosFidGrupo('una')); }

    // 3) CSV
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#nxFidPanel [data-csv]')]);
    const csv = fs.readFileSync(await dl.path(), 'utf8');
    const lin = csv.replace(/^﻿/, '').split(/\r\n/);
    ok(lin.length === 2 && /^Cliente,Teléfono,Grupo/.test(lin[0]) && /Carla Peña,809-555-0003,Una sola compra,1,1,11800\.00,11800\.00/.test(lin[1]) && /una-sola-compra/.test(dl.suggestedFilename()), `${w}px: CSV de «una sola compra» con encabezado y la fila de Carla`, { lin, f: dl.suggestedFilename() });

    // 4) Borrador: editable, en usted, sin exclamaciones, sin envío
    const antes = s.pedidos.filter(p => p.m !== 'GET').length;
    await page.click('#nxFidPanel .nxFidRow [data-msg]'); await page.waitForTimeout(900);
    const msg = await page.evaluate(() => { const ta = document.getElementById('nxFidTa'), a = document.querySelector('#nxFidMsg [data-wa]'); return { v: ta ? ta.value : '', fs: ta ? getComputedStyle(ta).fontSize : '', href: a ? a.getAttribute('href') : '', tgt: a ? a.target : '' }; });
    ok(/Carla/.test(msg.v) && /Celular/.test(msg.v) && /garantía está vigente/.test(msg.v) && !/[!¡]/.test(msg.v) && /\bsu\b|usted|le ayudamos/i.test(msg.v), `${w}px: borrador de garantía con el artículo, en usted y sin exclamaciones`, msg.v);
    ok(msg.fs === '16px', `${w}px: el borrador se escribe con letra de 16 px`, msg.fs);
    await page.fill('#nxFidTa', 'Texto cambiado por el cajero'); await page.waitForTimeout(150);
    const href2 = await page.evaluate(() => document.querySelector('#nxFidMsg [data-wa]').getAttribute('href'));
    ok(/^https:\/\/wa\.me\/18095550003\?text=Texto%20cambiado/.test(href2) && msg.tgt === '_blank', `${w}px: «Abrir WhatsApp» lleva el texto editado a wa.me en pestaña nueva`, href2);
    ok(!(await chicos(page, '#nxFidMsg button, #nxFidMsg a')).length, `${w}px: botones del borrador de 44 px o más`, await chicos(page, '#nxFidMsg button, #nxFidMsg a'));
    if (OUT && w === 390) { await page.evaluate(() => { document.getElementById('nxFidTa').value = window.__nxPosFidTest.borrador(window.__nxPosFidTest.datos().porCli.c3, { articulo: 'Celular', garantia: '26/12/2026' }); }); await page.screenshot({ path: OUT + '/fidelidad-390-mensaje.png' }); }
    // No se hace clic en el enlace: la app ya enruta todo wa.me al Inbox de NEXUS (parches-whatsapp-enrutamiento-nexus.js),
    // que solo deja el texto preparado. Aquí se prueba que esta capa no envía nada por su cuenta.
    await page.click('#nxFidMsg [data-copiar]').catch(() => {}); await page.waitForTimeout(300);
    const desp = s.pedidos.filter(p => p.m !== 'GET');
    ok(desp.length === antes && !s.pedidos.some(p => /^EDGE/.test(p.t)), `${w}px: preparar, copiar y abrir no hacen POST ni llaman Edge Functions`, desp.slice(antes));
    ok(await page.evaluate(() => !/sendMessage|whatsapp-send|functions\/v1/.test(document.getElementById('nxFidMsg').innerHTML)), `${w}px: el borrador no tiene ninguna llamada de envío`);
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => !document.getElementById('nxFidPanel') && !document.getElementById('nxFidMsg')), `${w}px: Esc cierra el borrador y el panel`);
    const brF = await page.evaluate(() => window.__nxPosFidTest.borrador(window.__nxPosFidTest.datos().porCli.c1) + '\n' + window.__nxPosFidTest.borrador(window.__nxPosFidTest.datos().porCli.c2));
    ok(/gracias/i.test(brF) && /extrañamos/.test(brF) && !/[!¡]/.test(brF), `${w}px: borradores de agradecimiento y «le extrañamos» sin exclamaciones`, brF);

    // 5) Sugerencia en la factura: con 0 nada
    await page.evaluate(() => window.nxPosTab('factura')); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.nxFacSetCli('c1'); window.nxFacAdd('p1'); }); await page.waitForTimeout(900);
    ok(!(await sugTxt(page)).length, `${w}px: con 0 % no aparece ninguna sugerencia de cliente frecuente`, await sugTxt(page));
    // Ajustes: guardar 10 %
    await page.evaluate(() => window.nxPosTab('ajustes')); await page.waitForTimeout(900);
    const fld = await page.evaluate(() => { const i = document.getElementById('nxFidPct'); return i ? { h: Math.round(i.getBoundingClientRect().height), fs: getComputedStyle(i).fontSize, v: i.value } : null; });
    ok(fld && fld.h === 48 && fld.fs === '16px' && fld.v === '0', `${w}px: campo del % en Ajustes 48 px / 16 px, en 0`, fld);
    await page.fill('#nxFidPct', '10'); await page.click('.nxFidAjCard .nxFidBtn'); await page.waitForTimeout(900);
    ok(await page.evaluate(() => localStorage.getItem('nx_pos_fid_pct') === '10'), `${w}px: el 10 % se guarda en este equipo (localStorage, sin escribir en la base)`);
    await page.evaluate(() => window.nxPosTab('factura')); await page.waitForTimeout(1200);
    await page.evaluate(() => { window.nxFacSetCli('c1'); if (!document.querySelector('#facTabla tr td')) window.nxFacAdd('p1'); }); await page.waitForTimeout(900);
    let sg = await sugTxt(page);
    ok(sg.length === 1 && /Cliente frecuente: puede ofrecerle 10 %/.test(sg[0]) && /1,180\.00/.test(sg[0]), `${w}px: con 10 % aparece «Cliente frecuente: puede ofrecerle 10 %» (1,180 de 11,800)`, sg);
    const tot1 = await page.evaluate(() => Array.from(document.querySelectorAll('#facResumen .tr')).map(x => x.textContent.replace(/\s+/g, ' ').trim()).find(t => /^Total/.test(t)) || '');
    ok(/11,800/.test(tot1), `${w}px: la sugerencia no cambia el total (11,800)`, tot1);
    await page.evaluate(() => window.nxFacCubre6()); await page.waitForTimeout(500);
    sg = await sugTxt(page);
    const tot2 = await page.evaluate(() => Array.from(document.querySelectorAll('#facResumen .tr')).map(x => x.textContent.replace(/\s+/g, ' ').trim()).find(t => /^Total/.test(t)) || '');
    ok(/11,200/.test(tot2) && sg.length === 1, `${w}px: convive con «Cubrir 6 %» (total 11,200 y la sugerencia sigue)`, { tot2, sg });
    await page.evaluate(() => window.nxFacSetCli('c3')); await page.waitForTimeout(600);
    ok(!(await sugTxt(page)).length, `${w}px: cliente que no es frecuente (Carla): sin sugerencia`, await sugTxt(page));
    if (OUT && w === 390) { await page.evaluate(() => window.nxFacSetCli('c1')); await page.waitForTimeout(500); await page.evaluate(() => document.getElementById('facOtrasSlot').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300); await page.screenshot({ path: OUT + '/fidelidad-390-factura.png' }); }
    ok(!s.pedidos.some(p => p.m !== 'GET' && /^(pos_|rpc\/pos_)/.test(p.t)), `${w}px: nada escribe en tablas del POS durante la prueba`, s.pedidos.filter(p => p.m !== 'GET' && /^(pos_|rpc\/pos_)/.test(p.t)));
    ok(!s.errs.length, `${w}px: sin errores de JS`, s.errs);
    await s.ctx.close();
  }
  // 6) Modo oscuro (tema-glass-oscuro, el de fábrica, y tema-premium) y modo claro
  {
    const s = await abrir(b, 390); const page = s.page;
    const fondo = () => page.evaluate(() => { const bx = document.querySelector('#nxFidPanel .nxFidBox'), h = document.querySelector('#nxFidPanel .nxFidHd h3'); return { bg: getComputedStyle(bx).backgroundColor, h3: getComputedStyle(h).color }; });
    await page.evaluate(() => { document.documentElement.classList.add('tema-glass-oscuro'); window.nxPosFidAbrir(); }); await page.waitForTimeout(1200);
    let f = await fondo();
    ok(f.bg === 'rgb(18, 24, 38)' && f.h3 === 'rgb(241, 245, 249)', '390px: modo oscuro (glass oscuro) con panel oscuro y título claro', f);
    if (OUT) await page.screenshot({ path: OUT + '/fidelidad-390-oscuro.png' });
    await page.evaluate(() => { document.documentElement.classList.remove('tema-glass-oscuro', 'tgo-foto'); document.body.classList.remove('tema-premium'); }); await page.waitForTimeout(200);
    f = await fondo();
    ok(f.bg === 'rgb(255, 255, 255)' && f.h3 === 'rgb(15, 23, 42)', '390px: modo claro con panel blanco y título oscuro', f);
    if (OUT) await page.screenshot({ path: OUT + '/fidelidad-390-claro.png' });
    await page.evaluate(() => document.body.classList.add('tema-premium')); await page.waitForTimeout(200);
    f = await fondo();
    ok(f.bg === 'rgb(18, 24, 38)', '390px: tema premium también oscuro', f);
    ok(!s.errs.length, '390px temas: sin errores de JS', s.errs);
    await s.ctx.close();
  }
  {
    const s = await abrir(b, 1280, true); const page = s.page;
    await page.evaluate(() => window.nxPosTab('clientes')); await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({ boton: !!document.querySelector('.nxFidAbrir'), sug: typeof window.nxPosFidSug, css: !!document.getElementById('nxPosFidCSS') }));
    ok(!r.boton && r.sug === 'undefined' && !r.css, 'apagado con nx_pos_fidelidad_off=1: no aparece nada', r);
    ok(!s.errs.length, 'apagado: sin errores de JS', s.errs);
    await s.ctx.close();
  }
} finally { await b.close(); }
console.log(`\n${pass} pasaron, ${fail} fallaron`); process.exit(fail ? 1 : 0);
