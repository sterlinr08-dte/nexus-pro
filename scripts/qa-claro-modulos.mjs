// QA de contraste del MODO CLARO en Préstamos (Financiamiento) y Punto de venta (12-oct-2026).
// App real (index.html + cadena de parches) en el tema «clasico» con html.tema-claro, contra la REST simulada de
// scripts/qa-crm-mock-server.js para Seguros y una base EN MEMORIA (abajo, db()) para las tablas del POS y de Préstamos,
// así cada pantalla interna sale con datos y no vacía. Recorre las vistas de los dos módulos a 390×844 (iPhone) y 1280×800
// y, para CADA texto visible, mide el color efectivo contra el fondo REAL (captura con el texto transparente; cuentan
// degradados, cristal e imágenes): falla si la razón WCAG es < 4.5:1 (texto normal) o < 3:1 (≥24 px, o ≥18.66 px en
// negrita). Las letras de menos de 11 px en el celular se informan aparte (no hacen fallar).
// Salida: informe.md + hallazgos.json + capturas con los textos afectados en rojo.
// Uso: PORT=8942 node scripts/qa-crm-mock-server.js &   QA_BASE=http://127.0.0.1:8942 QA_OUT=/ruta QA_TABLER=/ruta/tabler node scripts/qa-claro-modulos.mjs
//      QA_ANCHOS=390,1280 · QA_MODULOS=prestamos,pos · QA_VISTAS=pr-dashboard,pos-inicio (filtro opcional)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-claro-modulos')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const ANCHOS = (process.env.QA_ANCHOS || '390,1280').split(',').map(Number);
const MODULOS = (process.env.QA_MODULOS || 'prestamos,pos').split(',');
const FILTRO = process.env.QA_VISTAS ? process.env.QA_VISTAS.split(',') : null;
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => r(s)); }).on('error', () => r('')));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const ORG = '00000000-0000-4000-8000-000000000009', USR = '00000000-0000-4000-8000-000000000001';

// ── código que corre dentro de la página ──
const MEDIDOR = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const ruta = (el) => { const p = []; for (let a = el; a && a !== document.body && p.length < 4; a = a.parentElement) { p.unshift(nombre(a)); if (a.id) break; } return p.join(' > '); };
  const opacidad = (el) => { let op = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) op *= +getComputedStyle(a).opacity; return op; };
  const zona = (el) => el.closest('#v-waInbox,[id^="nxWa"],[class*="nxWaChat"],[class*="nxWaModal"]') ? 'buzon' : el.closest('nav#sbEl') ? 'menu' : el.closest('.lbox,#login,#loginBox,.login') ? 'login' : 'app';
  let seq = 0;
  window.__ql = {
    // Textos visibles dentro de la ventana que aún no se midieron (cada elemento se mide una sola vez por pantalla).
    candidatos() {
      const out = [];
      // Con una ventana (o la hoja «Más» de Préstamos) abierta, lo de atrás queda velado a propósito: se mide solo lo de adentro.
      const vis = (e) => e.getClientRects().length && getComputedStyle(e).display !== 'none';
      const capas = [...document.querySelectorAll('.overlay.open, #nxFPDockHost.dock-open')].filter(vis);
      const capa = capas.length ? capas[capas.length - 1] : null;
      document.querySelectorAll('body *').forEach(el => {
        if (el.__qlHecho) return;
        if (capa && !capa.contains(el)) return;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|path|OPTION|IMG|CANVAS|VIDEO|IFRAME|BR|HR)$/i.test(el.tagName) || el.closest('svg,.ti,[aria-hidden="true"],.skeleton,.placeholder,[data-placeholder],.sr-only')) return;
        const nodos = [...el.childNodes].filter(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent));
        if (!nodos.length) return;
        if (!el.getClientRects().length) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const op = opacidad(el); if (op < 0.1) return;
        const tc = parse(cs.color); if (!tc || tc.a * op < 0.05) return;
        const rects = [];
        // Recorte de los ancestros con overflow ≠ visible: el texto cortado con «…» no se mide debajo del botón vecino.
        const clip = [0, 0, innerWidth, innerHeight];
        for (let a = el; a && a !== document.body; a = a.parentElement) { const ca = a === el ? cs : getComputedStyle(a); if (ca.overflowX !== 'visible' || ca.overflowY !== 'visible') { const bb = a.getBoundingClientRect(); clip[0] = Math.max(clip[0], bb.left); clip[1] = Math.max(clip[1], bb.top); clip[2] = Math.min(clip[2], bb.right); clip[3] = Math.min(clip[3], bb.bottom); } }
        for (const n of nodos) { const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) { if (b.width < 2 || b.height < 2) continue; const x = Math.max(clip[0], b.left + 1), y = Math.max(clip[1], b.top + 1), x2 = Math.min(clip[2], b.right - 1), y2 = Math.min(clip[3], b.bottom - 1); if (x2 - x >= 2 && y2 - y >= 2) rects.push([x, y, x2 - x, y2 - y]); } }
        if (!rects.length) return; // fuera de la ventana: se medirá en otro tramo
        // ¿tapado por otra capa? (centro del primer rectángulo)
        const [cx, cy] = [rects[0][0] + rects[0][2] / 2, rects[0][1] + rects[0][3] / 2];
        const top = document.elementFromPoint(cx, cy); if (top && top !== el && !el.contains(top) && !top.contains(el) && !top.closest('.nx-fab')) return;
        el.__qlHecho = true; el.__qlId = ++seq;
        const inactivo = !!(el.closest('[disabled],[aria-disabled="true"],.disabled') || (el.matches('button,input,select,textarea') && el.disabled));
        out.push({ id: seq, ruta: ruta(el), texto: nodos.map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 40), color: { r: tc.r, g: tc.g, b: tc.b, a: tc.a * op }, fs: parseFloat(cs.fontSize), fw: +cs.fontWeight || 400, rects, zona: zona(el), inactivo });
      });
      return out;
    },
    ocultarTexto(on) {
      let s = document.getElementById('__qlOculta');
      if (!on) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('style'); s.id = '__qlOculta'; document.documentElement.appendChild(s); }
      // El botón flotante (fijo) no forma parte del fondo de ningún texto: que no tape lo que se mide (qa-iphone ya vigila que no tape controles).
      s.textContent = 'html *,html *::before,html *::after,html *::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}html .nx-fab{visibility:hidden!important}';
    },
    // Muestra los píxeles detrás de cada texto en la captura (base64) y calcula la razón de contraste.
    async muestrear(b64, items) {
      const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const sx = img.naturalWidth / innerWidth, sy = img.naturalHeight / innerHeight;
      return items.map(it => {
        const px = [];
        for (const [x, y, w, h] of it.rects) {
          const X = Math.round(x * sx), Y = Math.round(y * sy), W = Math.max(1, Math.round(w * sx)), H = Math.max(1, Math.round(h * sy));
          const d = cx.getImageData(X, Y, W, H).data; const paso = Math.max(1, Math.floor(d.length / 4 / 2500));
          for (let i = 0; i < d.length; i += 4 * paso) px.push({ r: d[i], g: d[i + 1], b: d[i + 2] });
        }
        if (!px.length) return { ...it, sinMuestra: true };
        const avg = px.reduce((s, c) => ({ r: s.r + c.r / px.length, g: s.g + c.g / px.length, b: s.b + c.b / px.length }), { r: 0, g: 0, b: 0 });
        px.sort((a, b) => lum(a) - lum(b)); const p20 = px[Math.floor(px.length * 0.2)], p80 = px[Math.floor(px.length * 0.8)];
        const rz = (bg) => ratio(over(it.color, bg), bg);
        const rProm = rz(avg), rMin = Math.min(rProm, rz(p20), rz(p80));
        const grande = it.fs >= 24 || (it.fs >= 18.66 && it.fw >= 700);
        return { ...it, colorHex: hex(over(it.color, avg)), fondo: hex(avg), fondoClaro: hex(p80), fondoOscuro: hex(p20), ratio: +rMin.toFixed(2), ratioProm: +rProm.toFixed(2), grande, limite: grande ? 3 : 4.5 };
      });
    },
    resaltar(ids, on) { document.querySelectorAll('body *').forEach(el => { if (el.__qlId && ids.includes(el.__qlId)) { if (on) { el.__qlOutline = el.style.outline; el.style.outline = '2px solid #FF2D55'; el.style.outlineOffset = '1px'; } else { el.style.outline = el.__qlOutline || ''; el.style.outlineOffset = ''; } } }); },
    reiniciar() { document.querySelectorAll('body *').forEach(el => { delete el.__qlHecho; delete el.__qlId; }); seq = 0; },
    // Desplazador principal de la pantalla (el contenedor visible con más desplazamiento pendiente).
    scroller() {
      const cands = [...document.querySelectorAll('.overlay.open .modal, #notifPanel.show, nav#sbEl.mob-open .sb-nav, nav#sbEl.mob-open, .mobile-more-sheet-clean.open, .gs-box, #sbContab, #sbConfig, .content, #cnt, .main, body, html')].filter(e => e.getClientRects().length);
      let best = null, bs = 0;
      for (const e of cands) { const cs = getComputedStyle(e); if (!/(auto|scroll)/.test(cs.overflowY) && e !== document.scrollingElement) continue; const s = e.scrollHeight - e.clientHeight; if (s > bs + 4) { bs = s; best = e; } }
      if (!best) { const se = document.scrollingElement; if (se.scrollHeight - se.clientHeight > 4) best = se; }
      if (!best) return null; best.__qlScroller = true; return { alto: best.clientHeight, total: best.scrollHeight };
    },
    desplazar(y) { const e = [...document.querySelectorAll('*')].find(x => x.__qlScroller); if (!e) return 0; e.scrollTop = y; return e.scrollTop; },
    fin() { document.querySelectorAll('*').forEach(x => { delete x.__qlScroller; }); },
    cerrar() {
      try { closeMobSB(); } catch (e) {}
      document.querySelectorAll('.overlay.open').forEach(o => o.classList.remove('open'));
      try { cerrarGlobalSearch(); } catch (e) {}
      const n = document.getElementById('notifPanel'); if (n) n.classList.remove('show');
      try { if (document.querySelector('.mobile-more-sheet-clean.open')) window.__nxToggleMenu(true); } catch (e) {}
    },
  };
};

// El desplazador de la pantalla: si hay una ventana abierta, el de adentro de la ventana; si no, el del módulo.
const DESPLAZADOR = () => {
  const visible = (e) => e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  window.__ql.scroller = function () {
    const ovs = [...document.querySelectorAll('.overlay.open')].filter(visible);
    const raiz = ovs.length ? ovs[ovs.length - 1] : null;
    const cands = raiz ? [raiz, ...raiz.querySelectorAll('*')] : [...document.querySelectorAll('#v-pos.on *, #v-prestamos.on *, #cnt, .content, .main, body, html')];
    let best = null, bs = 0;
    for (const e of cands) {
      if (!visible(e)) continue; const cs = getComputedStyle(e);
      if (!/(auto|scroll)/.test(cs.overflowY) && e !== document.scrollingElement) continue;
      if (e.clientHeight < 120) continue; // carriles horizontales y listas chiquitas: no son la pantalla
      const s = e.scrollHeight - e.clientHeight; if (s > bs + 4) { bs = s; best = e; }
    }
    if (!best && !raiz) { const se = document.scrollingElement; if (se.scrollHeight - se.clientHeight > 4) best = se; }
    if (!best) return null; best.__qlScroller = true; return { alto: best.clientHeight, total: best.scrollHeight };
  };
};

// ── Base en memoria para el POS y Préstamos (Seguros sigue en el simulador) ──
function db() {
  const hoy = new Date(); const iso = (d) => d.toISOString().slice(0, 10);
  const dia = (n) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return iso(d); };
  const ts = (n, h = 10) => dia(n) + 'T' + String(h).padStart(2, '0') + ':15:00Z';
  const NOMP = ['IPHONE 11 PRO MAX', 'IPHONE 12 MINI', 'CARGADOR 20W', 'FUNDA SILICONA', 'AUDIFONOS BT', 'CABLE USB-C', 'PROTECTOR VIDRIO', 'BATERIA IPHONE 11', 'PANTALLA A12', 'MICA CAMARA', 'SAMSUNG A15', 'REDMI NOTE 13', 'BOCINA JBL GO', 'REPARACION PLACA'];
  const prods = NOMP.map((n, i) => ({ id: 'p' + i, nombre: n, codigo: 'P-' + String(100 + i), precio: [42000, 26000, 950, 450, 1800, 350, 300, 2200, 3500, 250, 11500, 13900, 2600, 2500][i], costo: [36000, 21000, 520, 180, 1100, 150, 90, 1500, 2400, 90, 9800, 11800, 1900, 0][i], stock: i === 13 ? 0 : [3, 1, 25, 40, 2, 60, 80, 0, 4, 30, 6, 5, 1, 0][i], stock_min: [2, 2, 5, 10, 3, 10, 10, 2, 2, 5, 2, 2, 2, 0][i], tipo: i === 13 ? 'servicio' : 'producto', itbis: i !== 13, categoria_id: i < 2 || i === 10 || i === 11 ? 'cat1' : 'cat2', activo: true, created_at: ts(-60) }));
  const clientes = Array.from({ length: 25 }, (_, i) => ({ id: 'c' + i, nombre: 'CLIENTE ' + String(i + 1).padStart(2, '0') + (i === 1 ? ' MARIA RODRIGUEZ' : i === 2 ? ' JUAN PEREZ' : ''), cedula: '0010000' + String(1000 + i), telefono: '809555' + String(1000 + i), activo: true, es_cliente: true, created_at: ts(-90) }));
  const ventas = Array.from({ length: 12 }, (_, i) => ({ id: 'v' + i, numero_factura: (i % 4 === 3 ? 'CR-' : 'CO-') + String(101 + i).padStart(6, '0'), numero: (i % 4 === 3 ? 'CR-' : 'CO-') + String(101 + i).padStart(6, '0'), cliente_id: i % 3 ? 'c' + i : null, cliente_nombre: i % 3 ? clientes[i].nombre : null, subtotal: 1000 + i * 850, itbis: Math.round((1000 + i * 850) * 0.18), total: Math.round((1000 + i * 850) * 1.18), a_credito: i % 4 === 3, credito_monto: i % 4 === 3 ? Math.round((1000 + i * 850) * 1.18) : 0, estado: i === 5 ? 'anulada' : 'completada', metodo_pago: ['efectivo', 'tarjeta', 'transferencia'][i % 3], usuario_id: USR, usuario_nombre: 'Esterlin Espinal', vendedor_nombre: 'ROBINSON PEREZ', almacen_id: 'a1', caja_id: 'cj1', created_at: ts(i < 6 ? 0 : -(i - 5), 9 + (i % 8)) }));
  const fins = [0, 1, 2].map(i => ({ id: 'f' + i, cliente_id: 'c' + (i + 1), cliente_nombre: clientes[i + 1].nombre, estado: 'activo', monto: 30000 + i * 10000, inicial: 5000, num_cuotas: 6, frecuencia: 'mensual', venta_id: 'v' + (3 + i * 4), created_at: ts(-100 + i * 20) }));
  const cuotas = []; fins.forEach((f, k) => { for (let n = 1; n <= 6; n++) cuotas.push({ id: 'q' + k + n, financiamiento_id: f.id, numero: n, monto: Math.round((f.monto - 5000) / 6), pagado: n <= 2, fecha_venc: dia(-100 + k * 20 + n * 30), created_at: f.created_at }); });
  const finPagos = []; fins.forEach((f, k) => { for (let n = 1; n <= 2; n++) finPagos.push({ id: 'g' + k + n, financiamiento_id: f.id, monto: Math.round((f.monto - 5000) / 6), fecha: dia(-100 + k * 20 + n * 30), metodo: 'Efectivo', created_at: ts(-100 + k * 20 + n * 30) }); });
  return {
    pos_config: [{ id: 1, organizacion_id: ORG, prefijo_contado: 'CO', prefijo_credito: 'CR' }],
    pos_categorias: [{ id: 'cat1', nombre: 'CELULARES', orden: 1, activo: true }, { id: 'cat2', nombre: 'ACCESORIOS', orden: 2, activo: true }],
    pos_productos: prods, pos_clientes: clientes,
    pos_proveedores: [{ id: 'pv1', nombre: 'DISTRIBUIDORA DEL CARIBE', telefono: '8095550001', activo: true }, { id: 'pv2', nombre: 'IMPORTADORA CIBAO', telefono: '8095550002', activo: true }],
    pos_cajas: [{ id: 'cj1', estado: 'abierta', monto_inicial: 2000, apertura: 2000, abierta_at: ts(0, 8), created_at: ts(0, 8), usuario_id: USR, usuario_nombre: 'Esterlin Espinal', almacen_id: 'a1' },
      { id: 'cj0', estado: 'cerrada', monto_inicial: 2000, apertura: 2000, monto_final: 18450, cerrada_at: ts(-1, 19), abierta_at: ts(-1, 8), created_at: ts(-1, 8), usuario_id: USR, usuario_nombre: 'Esterlin Espinal', almacen_id: 'a1' }],
    pos_vendedores: [{ id: 'vd1', nombre: 'ROBINSON PEREZ', activo: true }],
    pos_reparaciones: ['recibido', 'diagnostico', 'reparando', 'listo', 'entregado'].map((e, i) => ({ id: 'r' + i, numero: 'REP-' + String(1 + i).padStart(4, '0'), cliente_nombre: clientes[i + 3].nombre, cliente_telefono: clientes[i + 3].telefono, equipo: ['IPHONE 11', 'SAMSUNG A32', 'REDMI NOTE 10', 'IPHONE XR', 'MOTO G60'][i], falla: ['PANTALLA ROTA', 'NO CARGA', 'BATERIA', 'CAMARA', 'SOFTWARE'][i], estado: e, total: 3500 + i * 500, abonado: 1000, created_at: ts(-i * 2) })),
    pos_financiamientos: fins, pos_fin_cuotas: cuotas, pos_fin_pagos: finPagos,
    pos_apartados: [{ id: 'ap1', numero: 'AP-0001', cliente_id: 'c4', cliente_nombre: clientes[4].nombre, total: 12000, abonado: 4000, estado: 'activo', fecha_limite: dia(10), created_at: ts(-5) },
      { id: 'ap2', numero: 'AP-0002', cliente_id: 'c5', cliente_nombre: clientes[5].nombre, total: 8000, abonado: 2000, estado: 'activo', fecha_limite: dia(-3), created_at: ts(-30) },
      { id: 'ap3', numero: 'AP-0003', cliente_id: 'c6', cliente_nombre: clientes[6].nombre, total: 5000, abonado: 5000, estado: 'completado', fecha_limite: dia(-10), created_at: ts(-40) }],
    pos_apartado_pagos: [{ id: 'app1', apartado_id: 'ap1', monto: 4000, metodo: 'Efectivo', created_at: ts(-5) }, { id: 'app2', apartado_id: 'ap2', monto: 2000, metodo: 'Efectivo', created_at: ts(-30) }],
    pos_almacenes: [{ id: 'a1', nombre: 'Principal', es_principal: true, activo: true }],
    pos_stock_almacen: prods.filter(p => p.tipo !== 'servicio').map(p => ({ id: 'sa' + p.id, producto_id: p.id, almacen_id: 'a1', stock: p.stock })),
    pos_prefacturas: [{ id: 'pf1', numero: 'PF-0001', cliente_nombre: clientes[7].nombre, total: 4500, estado: 'abierta', items: [], created_at: ts(0, 11) }, { id: 'pf2', numero: 'PF-0002', cliente_nombre: clientes[8].nombre, total: 1200, estado: 'facturada', items: [], created_at: ts(-2) }],
    pos_ventas: ventas,
    pos_venta_items: ventas.map((v, i) => ({ id: 'vi' + i, venta_id: v.id, producto_id: 'p' + (i % 13), nombre: NOMP[i % 13], cantidad: 1, precio: v.subtotal, total: v.total })),
    pos_cotizaciones: Array.from({ length: 6 }, (_, i) => ({ id: 'k' + i, numero: 'COT-' + (500 + i), cliente_nombre: clientes[i].nombre, total: 1000 * (i + 1), fecha: dia(-i), validez_dias: 15, estado: i === 4 ? 'vencida' : 'vigente', created_at: ts(-i) })),
    pos_compras: [{ id: 'cm1', numero: 'CMP-0001', proveedor_id: 'pv1', proveedor_nombre: 'DISTRIBUIDORA DEL CARIBE', total: 54000, pagado: 20000, estado: 'recibida', fecha: dia(-6), created_at: ts(-6) }, { id: 'cm2', numero: 'CMP-0002', proveedor_id: 'pv2', proveedor_nombre: 'IMPORTADORA CIBAO', total: 18000, pagado: 18000, estado: 'recibida', fecha: dia(-15), created_at: ts(-15) }],
    pos_abonos: [{ id: 'ab1', cliente_id: 'c3', monto: 500, fecha: dia(-2), metodo: 'Efectivo', created_at: ts(-2) }],
    rrhh_empleados: [{ id: 'e1', nombre: 'ROBINSON PEREZ', cargo: 'VENDEDOR', salario: 25000, activo: true }, { id: 'e2', nombre: 'ESTERLIN ESPINAL', cargo: 'ADMINISTRADOR', salario: 45000, activo: true }],
    prestamos: [
      { id: 'pr1', nombre: 'MARIA RODRIGUEZ', cedula: '001-1234567-8', telefono: '8095551001', capital: 50000, total_devolver: 62000, tasa_interes: 2, fecha_prestamo: dia(-120), modo: 'cuotas', num_cuotas: 12, frecuencia: 'mensual', metodo_interes: 'plano', notas: '', created_at: ts(-120), created_by_name: 'Esterlin Espinal' },
      { id: 'pr2', nombre: 'JUAN PEREZ', cedula: '001-7654321-0', telefono: '8095551002', capital: 20000, total_devolver: 24000, tasa_interes: 2.5, fecha_prestamo: dia(-150), modo: 'cuotas', num_cuotas: 8, frecuencia: 'quincenal', metodo_interes: 'plano', notas: '', created_at: ts(-150), created_by_name: 'Esterlin Espinal' },
      { id: 'pr3', nombre: 'ANA MARTINEZ', cedula: '', telefono: '8095551003', capital: 20000, total_devolver: 24000, tasa_interes: 20, fecha_prestamo: dia(-40), modo: 'libre', metodo_interes: 'saldo', notas: '', created_at: ts(-40), created_by_name: 'Esterlin Espinal' },
      { id: 'pr4', nombre: 'CARLOS SANTOS', cedula: '402-1111111-1', telefono: '8095551004', capital: 100000, total_devolver: 100000, tasa_interes: 3, plazo_meses: 12, fecha_prestamo: dia(-90), modo: 'credito', metodo_interes: 'saldo', notas: '', created_at: ts(-90), created_by_name: 'Esterlin Espinal' },
      { id: 'pr5', nombre: 'LUISA FERNANDEZ', cedula: '', telefono: '8095551005', capital: 30000, total_devolver: 33600, tasa_interes: 2, fecha_prestamo: dia(-200), modo: 'cuotas', num_cuotas: 6, frecuencia: 'mensual', metodo_interes: 'plano', notas: '', created_at: ts(-200), created_by_name: 'Esterlin Espinal' },
      { id: 'pr6', nombre: 'PEDRO GOMEZ', cedula: '', telefono: '8095551006', capital: 15000, total_devolver: 18000, tasa_interes: 2, fecha_prestamo: dia(-20), modo: 'cuotas', num_cuotas: 10, frecuencia: 'semanal', metodo_interes: 'plano', notas: '', created_at: ts(-20), created_by_name: 'Esterlin Espinal' }],
    prestamo_pagos: [
      ...[1, 2, 3].map(n => ({ id: 'pp1' + n, prestamo_id: 'pr1', monto: 5166.67, fecha: dia(-120 + n * 30), metodo: 'Efectivo', created_at: ts(-120 + n * 30) })),
      { id: 'pp21', prestamo_id: 'pr2', monto: 3000, fecha: dia(-135), metodo: 'Efectivo', created_at: ts(-135) },
      { id: 'pp31', prestamo_id: 'pr3', monto: 5000, fecha: dia(-10), metodo: 'Transferencia', created_at: ts(-10) },
      { id: 'pp41', prestamo_id: 'pr4', monto: 3000, tipo: 'interes', fecha: dia(-60), metodo: 'Efectivo', created_at: ts(-60) },
      { id: 'pp42', prestamo_id: 'pr4', monto: 10000, tipo: 'capital', fecha: dia(-30), metodo: 'Efectivo', created_at: ts(-30) },
      ...[1, 2, 3, 4, 5, 6].map(n => ({ id: 'pp5' + n, prestamo_id: 'pr5', monto: 5600, fecha: dia(-200 + n * 30), metodo: 'Efectivo', created_at: ts(-200 + n * 30) })),
      ...[1, 2].map(n => ({ id: 'pp6' + n, prestamo_id: 'pr6', monto: 1800, fecha: dia(-20 + n * 7), metodo: 'Efectivo', created_at: ts(-20 + n * 7) }))],
    prestamos_config: [{ id: 1 }],
    prestamo_clientes: ['MARIA RODRIGUEZ', 'JUAN PEREZ', 'ANA MARTINEZ', 'CARLOS SANTOS'].map((n, i) => ({ id: 'pc' + i, nombre: n, cedula: '001-000000' + i + '-1', telefono: '809555100' + (i + 1), direccion: 'SANTIAGO', created_at: ts(-200 + i) })),
    prestamo_solicitudes: [{ id: 's1', nombre: 'ROSA DIAZ', cedula: '001-2222222-2', telefono: '8095551010', modo: 'cuotas', capital: 25000, num_cuotas: 6, frecuencia: 'mensual', tasa_interes: 3, estado: 'enviada', created_at: ts(-1) },
      { id: 's2', nombre: 'MIGUEL TORRES', cedula: '', telefono: '8095551011', modo: 'libre', capital: 10000, tasa_interes: 10, estado: 'aprobada', created_at: ts(-12) }]
  };
}
const NUESTRA = (t) => /^(pos_|prestamo|rrhh_)/.test(t);
function filtrar(filas, sp) {
  for (const [k, v] of sp) {
    if (/^(select|order|limit|offset|on_conflict|or|and)$/.test(k)) continue;
    const m = /^(eq|neq|gt|gte|lt|lte|in|is)\.(.*)$/.exec(v); if (!m) continue;
    const [, op, val] = m;
    filas = filas.filter(x => {
      if (x[k] === undefined) return true;
      const a = x[k], s = String(a), n = Number(a), vn = Number(val);
      if (op === 'eq') return s === val; if (op === 'neq') return s !== val;
      if (op === 'gt') return isNaN(vn) ? s > val : n > vn; if (op === 'gte') return isNaN(vn) ? s >= val : n >= vn;
      if (op === 'lt') return isNaN(vn) ? s < val : n < vn; if (op === 'lte') return isNaN(vn) ? s <= val : n <= vn;
      if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map(z => z.replace(/^"|"$/g, '')).includes(s);
      if (op === 'is') return val === 'null' ? a === null : true;
      return true;
    });
  }
  const off = Number(sp.get('offset') || 0), lim = Number(sp.get('limit') || 0);
  return filas.slice(off, lim ? off + lim : undefined);
}

async function abrir(browser, { w, h }) {
  const D = db();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 769, hasTouch: w < 769, locale: 'es-DO', timezoneId: 'America/Santo_Domingo', ...(w < 769 ? { userAgent: UA_IPHONE } : {}) });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const req = r.request(), u = req.url();
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    if (/supabase\.co\//.test(u)) {
      const U = new URL(u), t = U.pathname.startsWith('/rest/v1/') ? U.pathname.slice(9) : '';
      if (t && NUESTRA(t)) {
        const json = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-' + Math.max(0, (Array.isArray(o) ? o.length : 1) - 1) + '/' + (Array.isArray(o) ? o.length : 1) }, body: JSON.stringify(o) });
        if (req.method() === 'GET' || req.method() === 'HEAD') return json(filtrar(D[t] || [], U.searchParams));
        return json([]); // nada se escribe
      }
      const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp });
    }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) { /* contexto cerrado */ } });
  await page.addInitScript(({ id }) => {
    localStorage.setItem('nx_tema', 'clasico'); localStorage.removeItem('nx_tgo_off'); localStorage.removeItem('nx_claro_off');
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id, nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { id: USR });
  await page.addInitScript(MEDIDOR);
  await page.addInitScript(DESPLAZADOR);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 25000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2500);
  return { ctx, page, errs };
}

// Pantallas de cada módulo: [nombre, cómo abrirla, cómo cerrarla (opcional), solo en el celular (opcional)].
const VISTAS = {
  prestamos: { abrir: 'nxAbrirPrestamos()', vistas: [
    ['pr-dashboard', "nxPrestamoFiltroTipo('todos')"], ['pr-activos', "nxPrestamoFiltroTipo('activos')"], ['pr-cobranza', "nxPrestamoFiltroTipo('vencidos')"],
    ['pr-cuotas', "nxPrestamoFiltroTipo('cuotas')"], ['pr-pagados', "nxPrestamoFiltroTipo('pagados')"], ['pr-credito', "nxPrestamoFiltroTipo('credito')"],
    ['pr-clientes', "nxPrView('clientes')"], ['pr-evaluacion', "nxPrView('evaluacion')"], ['pr-solicitudes', "nxPrView('solicitudes')"], ['pr-reportes', "nxPrView('reportes')"],
    ['pr-detalle', "nxPrestamoFiltroTipo('todos');setTimeout(()=>nxPrestamoVer('pr1'),250)"], ['pr-detalle-credito', "nxPrestamoFiltroTipo('credito');setTimeout(()=>nxPrestamoVer('pr4'),250)"],
    ['pr-nuevo', "nxPrestamoFiltroTipo('todos');setTimeout(()=>nxPrestamoNuevo(),250)"], ['pr-config', "nxPrestamoFiltroTipo('todos');setTimeout(()=>nxPrestamoConfig(),250)"],
    ['pr-mas', "nxPrestamoFiltroTipo('todos');setTimeout(()=>nxFPToggleMore(),250)", 'nxFPToggleMore()', true]] },
  pos: { abrir: 'nxAbrirPOS()', vistas: [
    ...['inicio', 'avisos', 'vender', 'factura', 'prefactura', 'reparaciones', 'productos', 'inventario', 'compras', 'cotizaciones', 'entidades', 'crm', 'clientes', 'rrhh', 'caja', 'cuotas', 'apartados', 'ventas', 'notascredito', 'prefhist', 'reportes', 'contabilidad', 'ia', 'ajustes'].map(t => ['pos-' + t, `nxPosTab('${t}')`]),
    ['pos-menu', "nxPosTab('inicio');setTimeout(()=>nxPosToggleSide(),400)", 'nxPosToggleSide()', true]] }
};

async function ir(page, js, espera = 1800) {
  await page.evaluate((js) => { window.__ql.cerrar(); try { (0, eval)(js); } catch (e) { console.warn('qa ir: ' + e.message); } }, js);
  await sleep(espera);
}

async function medirVista(page, nombreVista, w) {
  await page.evaluate(() => window.__ql.reiniciar());
  const tema = await page.evaluate(() => document.documentElement.classList.contains('tema-claro'));
  if (!tema) ok(false, `${nombreVista} ${w}: la página debería tener html.tema-claro`, await page.evaluate(() => document.documentElement.className));
  const sc = await page.evaluate(() => window.__ql.scroller());
  const tramos = sc ? Math.min(10, Math.ceil(sc.total / Math.max(1, sc.alto * 0.9))) : 1;
  const hallazgos = [], todos = [];
  for (let t = 0; t < tramos; t++) {
    if (sc && t > 0) { await page.evaluate((y) => window.__ql.desplazar(y), Math.round(t * sc.alto * 0.9)); await sleep(350); }
    const items = await page.evaluate(() => window.__ql.candidatos());
    if (!items.length) continue;
    await page.evaluate(() => window.__ql.ocultarTexto(true)); await sleep(60);
    const b64 = (await page.screenshot({ type: 'png', scale: 'css' })).toString('base64');
    await page.evaluate(() => window.__ql.ocultarTexto(false));
    const res = await page.evaluate(({ b64, items }) => window.__ql.muestrear(b64, items), { b64, items });
    const malos = [];
    for (const r of res) {
      if (r.sinMuestra) continue;
      todos.push(r);
      const motivos = [];
      if (!r.inactivo && r.ratio < r.limite) motivos.push('contraste');
      if (w < 769 && r.fs < 11) motivos.push('tamaño');
      if (motivos.length) { hallazgos.push({ vista: nombreVista, ancho: w, tramo: t, motivo: motivos.join('+'), ruta: r.ruta, texto: r.texto, color: r.colorHex, fondo: r.fondo, fondoClaro: r.fondoClaro, fondoOscuro: r.fondoOscuro, ratio: r.ratio, ratioProm: r.ratioProm, limite: r.limite, fs: r.fs, fw: r.fw, zona: r.zona, id: r.id }); if (motivos.includes('contraste')) malos.push(r.id); }
    }
    if (malos.length) {
      await page.evaluate((ids) => window.__ql.resaltar(ids, true), malos);
      const f = `hallazgos-${nombreVista}-${w}-${t}.png`;
      await page.screenshot({ path: OUT + f, type: 'png', scale: 'css' });
      hallazgos.filter(h => h.tramo === t && !h.captura && h.motivo.includes('contraste')).forEach(h => { h.captura = f; });
      await page.evaluate((ids) => window.__ql.resaltar(ids, false), malos);
    }
    if (t === 0 && process.env.QA_CAPTURAS) await page.screenshot({ path: OUT + `vista-${nombreVista}-${w}.png`, type: 'png', scale: 'css' });
  }
  if (sc) { await page.evaluate(() => window.__ql.desplazar(0)); await page.evaluate(() => window.__ql.fin()); }
  return { hallazgos, textos: todos.length };
}

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  await qa('orgtipo/seguros'); await qa('tema/clasico');
  const total = [], resumen = [];
  for (const w of ANCHOS) {
    const h = w < 769 ? 844 : 800;
    for (const mod of MODULOS) {
      const M = VISTAS[mod]; console.log(`\n=== ${mod} ${w} ===`);
      const A = await abrir(browser, { w, h });
      await A.page.evaluate((js) => { try { (0, eval)(js); } catch (e) { console.warn(e.message); } }, M.abrir); await sleep(3500);
      const abierto = await A.page.evaluate((m) => !!document.querySelector(m === 'pos' ? '#v-pos.on .nxTShell' : '#v-prestamos.on #nxFPShell'), mod);
      ok(abierto, `${w} ${mod}: el módulo abre`);
      for (const [nom, js, cierre, soloMovil] of M.vistas) {
        if (FILTRO && !FILTRO.includes(nom)) continue;
        if (soloMovil && w >= 769) continue;
        await ir(A.page, js);
        const r = await medirVista(A.page, nom, w);
        if (cierre) { await A.page.evaluate((js) => { try { (0, eval)(js); } catch (e) {} }, cierre); await sleep(500); }
        const con = r.hallazgos.filter(x => x.motivo.includes('contraste')), tam = r.hallazgos.filter(x => x.motivo === 'tamaño');
        resumen.push({ vista: nom, w, textos: r.textos, contraste: con.length, tamano: tam.length }); total.push(...r.hallazgos);
        ok(r.textos > 0 && con.length === 0, `${w} ${nom}: ${r.textos} textos, ${con.length} con poco contraste${tam.length ? ` (${tam.length} de menos de 11 px, solo informe)` : ''}`, con.slice(0, 5).map(x => [x.ruta, x.texto, x.ratio, x.color, x.fondo]));
      }
      ok(A.errs.length === 0, `${w} ${mod}: sin errores de página`, A.errs.slice(0, 4));
      await A.ctx.close();
    }
  }
  await browser.close();
  const clave = (h) => `${h.vista}|${h.ancho}|${h.ruta}|${h.texto}|${h.motivo}`;
  const agr = new Map(); for (const h of total) { const k = clave(h); if (agr.has(k)) agr.get(k).n++; else agr.set(k, { ...h, n: 1 }); }
  const lista = [...agr.values()], con = lista.filter(h => h.motivo.includes('contraste')), tam = lista.filter(h => h.motivo === 'tamaño');
  fs.writeFileSync(OUT + 'hallazgos.json', JSON.stringify({ fecha: new Date().toISOString(), resumen, hallazgos: lista }, null, 1));
  const fila = (h) => `| ${h.vista} | ${h.ancho} | \`${h.ruta.replace(/\|/g, '\\|')}\` | ${h.texto.replace(/\|/g, '\\|')} | ${h.color} | ${h.fondo} | **${h.ratio}** / ${h.limite} | ${h.fs}px ${h.fw} |${h.captura ? ` [captura](${h.captura})` : ''} |`;
  const cab = '| Vista | Ancho | Elemento | Texto | Color | Fondo | Razón / mín. | Letra | Captura |\n|---|---|---|---|---|---|---|---|---|';
  fs.writeFileSync(OUT + 'informe.md', [`# Contraste del modo claro — Préstamos y Punto de venta`, '', `Fecha: ${new Date().toISOString()} · anchos ${ANCHOS.join('/')}`, '',
    `- Textos medidos: ${resumen.reduce((s, r) => s + r.textos, 0)} en ${resumen.length} pantallas×anchos.`, `- Con poco contraste: **${con.length}**.`, `- Letra de menos de 11 px en el celular (solo informe): ${tam.length}.`, '',
    '| Vista | Ancho | Textos | Contraste | < 11 px |', '|---|---|---:|---:|---:|', ...resumen.map(r => `| ${r.vista} | ${r.w} | ${r.textos} | ${r.contraste} | ${r.tamano} |`), '',
    `## Poco contraste (${con.length})`, '', cab, ...con.map(fila), '', `## Letra de menos de 11 px (${tam.length})`, '', cab, ...tam.map(fila), ''].join('\n'));
  console.log(`\nInforme: ${OUT}informe.md · con poco contraste: ${con.length} · letra < 11 px: ${tam.length}`);
  console.log(`\n${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
