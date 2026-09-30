// QA de la conversación abierta del Buzón de WhatsApp (58.94, «WhatsApp con las características del original»).
// App real (index.html + cadena parches-whatsapp-*) contra la REST simulada de scripts/qa-crm-mock-server.js (se
// arranca sola en un puerto libre) + hilos, mensajes, Storage firmado, RPC nuevas y Edge whatsapp-inbox-leer simulados
// con page.route. Tema Glass oscuro. A 390×844 (UA iPhone, táctil) y 1280×800:
//  · separadores de día centrados y divisor «N mensajes no leídos» anclado a los N últimos entrantes, visible al abrir;
//  · hora en cada burbuja; ○ enviando · ✓ enviado · ✓✓ entregado · ✓✓ azul leído · ! fallido con «Reintentar»;
//  · colas solo en la última burbuja de cada racha; agrupación (same-prev); ocultos no se pintan;
//  · enlaces (URL y teléfono) seguros; ubicación, contacto, sticker (sin globo), documento (icono/nombre/tamaño), audio
//    (play/pausa, progreso, velocidad, mic); cita con miniatura; «Reenviado»; ⭐ destacado; reacción cliente+agente;
//  · visor a pantalla completa (abre, navega, cierra); cargar mensajes anteriores al llegar arriba sin perder la posición;
//  · contador de nuevos en «ir al final»; menú de mensaje y ⋮ en cristal oscuro con Destacar / Borrar para mí /
//    Mensajes destacados; clip oscuro; texto natural en cabecera y menús; teléfono formateado en la cabecera;
//  · botón flotante global oculto y estable con el chat abierto (390); sin superficies claras en #v-waInbox;
//  · se llama a whatsapp_marcar_hilo_leido y a la Edge whatsapp-inbox-leer al abrir; sin errores de consola.
// Uso: node scripts/qa-whatsapp-chat.mjs   (QA_OUT=/ruta para las capturas; QA_TABLER=/ruta con tabler-icons.min.css)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-whatsapp-chat')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
const CHROME = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clic = async (page, sel, ms = 8000) => { await page.waitForSelector(sel, { timeout: ms, state: 'attached' }); await page.evaluate(s => document.querySelector(s).click(), sel); };
const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const ago = h => new Date(Date.now() - h * 3600e3).toISOString();

// ── simulador REST en un puerto libre ──
const puertoLibre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const espera = (url, ms = 15000) => new Promise((res, rej) => { const t0 = Date.now(); const tick = () => http.get(url, r => { r.resume(); res(); }).on('error', () => Date.now() - t0 > ms ? rej(new Error('mock no arranca')) : setTimeout(tick, 150)); tick(); });

// ── datos simulados ──
const hilo = (n, o) => ({ id: U(9000 + n), telefono_e164: o.tel, cliente_id: o.cli != null ? U(200 + o.cli) : null, nombre_perfil: o.nom, asignado_agente_id: null,
  ultimo_mensaje_at: ago(o.h), ultimo_mensaje_preview: o.prev, ultimo_inbound_at: ago(o.hin ?? o.h), ultima_respuesta_humana_at: ago(o.h + 1), no_leidos_count: o.nl || 0, created_at: ago(400), updated_at: ago(o.h) });
const HILOS = [
  hilo(1, { tel: '+18098630085', cli: 0, nom: 'Mercedes Ortiz', h: 0.2, prev: 'Me confirma cuando la vea por favor', nl: 2 }),
  hilo(2, { tel: '+18295550102', cli: 1, nom: 'Juan R.', h: 1.5, prev: 'Ok gracias', nl: 0 }),
  hilo(3, { tel: '+18495550103', cli: 2, nom: 'Ana Martinez', h: 3, prev: 'Le envío la foto', nl: 1 }),
  hilo(6, { tel: '+18095550199', cli: null, nom: 'Wilson', h: 26, prev: 'Cuánto cuesta el plan familiar?', nl: 3 }),
];
const H1 = HILOS[0].id;
let seq = 0;
const msg = (o) => ({ id: U(9100 + (seq++)), hilo_id: H1, direccion: o.d, tipo_contenido: o.t || 'text', cuerpo: o.c ?? null, media_path: o.mp || null, wa_message_id: 'w' + seq, responde_a_id: o.resp || null,
  estado: o.d === 'out' ? (o.e || 'enviado') : 'recibido', error_detalle: o.err || null, enviado_por_agente_id: null, revision_pago_estado: null, abono_id: null, created_at: o.at,
  reaccion_agente: o.ra || null, reaccion_cliente: o.rc || null, meta: o.meta || {}, entregado_at: o.ent || null, leido_at: o.lei || null, destacado_at: o.star || null, destacado_por: null, oculto_at: o.hide || null, oculto_por: null, reenviado: !!o.fwd });
const MSGS = [];
// 230 mensajes viejos (hace 30 a 3 días) + 18 recientes: la carga inicial trae los 200 más recientes; los 48 anteriores
// llegan con el scroll hacia arriba (uno de los recientes está oculto → 199 y 247 burbujas).
for (let i = 0; i < 230; i++) MSGS.push(msg({ d: i % 3 === 0 ? 'out' : 'in', c: 'Mensaje antiguo número ' + (i + 1), at: ago(24 * 30 - i * 2.8), e: 'leido' }));
const hoy = h => ago(h), ayer = h => ago(24 + h);
const rec = [];
rec.push(msg({ d: 'out', c: 'Hola Mercedes, tienes un balance pendiente de RD$ 4,500.00. Puedes ver tu estado en https://nexusprord.com/portal o llamarnos al 809-555-1234.', at: ayer(6), e: 'leido', ent: ayer(5.9), lei: ayer(5.5) }));
rec.push(msg({ d: 'in', c: 'Buenas tardes, no hay atraso verdad?', at: ayer(5) }));
rec.push(msg({ d: 'in', c: '👍', at: ayer(4.9), ra: '👍', rc: '❤️' }));
const IMG = msg({ d: 'in', t: 'imagen', c: 'Comprobante de la transferencia', mp: 'img/comprobante.jpg', at: ayer(3), meta: { media: { mime: 'image/jpeg', nombre: 'comprobante.jpg', tamano: 88000 } } }); rec.push(IMG);
rec.push(msg({ d: 'out', c: 'Perfecto, gracias por el comprobante.', at: ayer(2.9), e: 'leido', resp: IMG.id, ent: ayer(2.8), lei: ayer(2.7) }));
rec.push(msg({ d: 'in', t: 'audio', c: '[audio]', mp: 'aud/nota.wav', at: ayer(2.5), meta: { media: { mime: 'audio/wav' } } }));
rec.push(msg({ d: 'in', t: 'ubicacion', c: '18.4719, -69.8923', at: ayer(2.2), meta: { ubicacion: { lat: 18.4719, lng: -69.8923, nombre: 'Oficina Central', direccion: 'Av. Winston Churchill 1099, Santo Domingo' } } }));
rec.push(msg({ d: 'out', t: 'contacto', c: 'Contacto: Ana Martinez (+18495550103)', at: ayer(2), e: 'entregado', meta: { contactos: [{ nombre: 'Ana Martinez', telefonos: ['+18495550103'] }] } }));
rec.push(msg({ d: 'in', t: 'sticker', c: '[sticker]', mp: 'img/sticker.webp', at: ayer(1.8) }));
rec.push(msg({ d: 'in', t: 'documento', c: 'poliza-2026.pdf', mp: 'doc/poliza-2026.pdf', at: ayer(1.5), meta: { media: { mime: 'application/pdf', nombre: 'poliza-2026.pdf', tamano: 125952 } } }));
rec.push(msg({ d: 'out', t: 'video', c: '[video]', mp: 'vid/clip.mp4', at: hoy(6), e: 'entregado', ent: hoy(5.9) }));
rec.push(msg({ d: 'out', c: 'Este mensaje fue reenviado desde otro chat.', at: hoy(5.5), e: 'leido', fwd: true, star: hoy(5.4) }));
rec.push(msg({ d: 'out', c: 'Mensaje que el agente borró para él (no debe verse).', at: hoy(5.2), e: 'leido', hide: hoy(5.1) }));
rec.push(msg({ d: 'out', c: 'Enviando ahora mismo…', at: hoy(0.4), e: 'enviando' }));
rec.push(msg({ d: 'out', c: 'Ya enviado (una palomita).', at: hoy(0.39), e: 'enviado' }));
rec.push(msg({ d: 'out', c: 'Este no salió.', at: hoy(0.38), e: 'fallido', err: 'Zernio: número inválido' }));
rec.push(msg({ d: 'in', c: 'Buenos días, ya hice la transferencia 🙏', at: hoy(0.25) }));
rec.push(msg({ d: 'in', c: 'Me confirma cuando la vea por favor', at: hoy(0.2) }));
MSGS.push(...rec);
const LOG = [];
const ORIG = new Map(MSGS.map(m => [m.id, { destacado_at: m.destacado_at, oculto_at: m.oculto_at }]));
function mensajesRest(u) {
  const q = new URL(u).searchParams; let rows = MSGS.slice();
  for (const [k, v] of q.entries()) {
    let m;
    if ((m = /^eq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) === m[1]);
    else if ((m = /^lt\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) < m[1]);
    else if ((m = /^gt\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) > m[1]);
  }
  const order = (q.get('order') || 'created_at.asc').split(',')[0].split('.'); const col = order[0], desc = order.includes('desc');
  rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (desc ? -1 : 1));
  const lim = Number(q.get('limit')); if (lim) rows = rows.slice(0, lim);
  const sel = q.get('select'); if (sel && sel !== '*') { const cols = sel.split(','); rows = rows.map(r => Object.fromEntries(cols.filter(c => c in r).map(c => [c, r[c]]))); }
  return rows;
}
// medios simulados: SVG para imagen/sticker, WAV (2 s, 440 Hz) para audio, mp4 vacío para video
const svg = (txt, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="100%" height="100%" fill="${bg}"/><circle cx="240" cy="150" r="70" fill="#fff" opacity=".85"/><text x="240" y="300" font-size="34" text-anchor="middle" fill="#fff" font-family="sans-serif">${txt}</text></svg>`;
function wav() {
  const sr = 8000, n = sr * 2, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / sr) * 12000), 44 + i * 2);
  return buf;
}
const WAV = wav();

async function abrir(browser, BASE, movil) {
  const iph = devices['iPhone 13'];
  const ctx = await browser.newContext(movil
    ? { ...iph, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs|jsdelivr/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try {
    const u = r.request().url(), m = r.request().method();
    if (/\/storage\/v1\/object\/sign\/whatsapp-inbox-media\//.test(u)) {
      const p = u.replace(/^.*whatsapp-inbox-media\//, '').replace(/\?.*$/, '');
      if (m === 'POST') { LOG.push('sign:' + p); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signedURL: '/object/sign/whatsapp-inbox-media/' + p + '?token=qa' }) }); }
      if (/\.(jpg|png|webp)$/.test(p)) return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(p.includes('sticker') ? 'STICKER' : p.split('/').pop(), p.includes('sticker') ? '#7c3aed' : '#1d4ed8') });
      if (/\.wav$/.test(p)) return r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
      if (/\.pdf$/.test(p)) return r.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' });
      return r.fulfill({ status: 200, contentType: 'video/mp4', body: '' });
    }
    if (/\/functions\/v1\/whatsapp-inbox-leer/.test(u)) { LOG.push('edge:leer:' + (r.request().postData() || '')); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    if (/\/rest\/v1\/rpc\/whatsapp_mensajes_destacados/.test(u)) { LOG.push('rpc:destacados'); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MSGS.filter(x => x.destacado_at && !x.oculto_at)) }); }
    if (/\/rest\/v1\/rpc\/whatsapp_(mensaje_destacar|mensaje_ocultar|marcar_hilo_leido)/.test(u)) {
      const fn = u.replace(/^.*rpc\//, '').replace(/\?.*$/, ''), body = r.request().postData() || ''; LOG.push('rpc:' + fn + ':' + body);
      try { const b = JSON.parse(body); const x = MSGS.find(m => m.id === b.p_mensaje_id); if (x && fn === 'whatsapp_mensaje_destacar') x.destacado_at = b.p_destacar ? new Date().toISOString() : null; if (x && fn === 'whatsapp_mensaje_ocultar') x.oculto_at = new Date().toISOString(); } catch (e) {}
      return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    }
    if (/whatsapp_hilo_mensajes/.test(u)) { LOG.push('msgs:' + u.replace(/^.*rest\/v1\//, '')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mensajesRest(u)) }); }
    if (/whatsapp_hilos/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HILOS) });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(() => {
    localStorage.setItem('nx_tema', 'glass-oscuro'); localStorage.removeItem('nx_tgo_off'); localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2000);
  return { ctx, page, errs };
}

// medición en página
const MEDIR = () => {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (t, b) => { const a = t.a + b.a * (1 - t.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (t.r * t.a + b.r * b.a * (1 - t.a)) / a, g: (t.g * t.a + b.g * b.a * (1 - t.a)) / a, b: (t.b * t.a + b.b * b.a * (1 - t.a)) / a, a }; };
  const fondo = (el) => { const capas = []; for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (/gradient/.test(cs.backgroundImage) && !/url\(/.test(cs.backgroundImage)) { const cc = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); if (cc.length) { const sa = cc.reduce((s, c) => s + c.a, 0) || 1; capas.push(cc.reduce((s, c) => ({ r: s.r + c.r * c.a / sa, g: s.g + c.g * c.a / sa, b: s.b + c.b * c.a / sa, a: s.a + c.a / cc.length }), { r: 0, g: 0, b: 0, a: 0 })); } } const bg = parse(cs.backgroundColor); if (bg && bg.a > 0) { capas.push(bg); if (bg.a >= 0.99) break; } } let c = { r: 10, g: 22, b: 40, a: 1 }; for (let i = capas.length - 1; i >= 0; i--) c = over(capas[i], c); return c; };
  const nm = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const vis = e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  window.__wa = {
    lum, parse, fondo, nm, vis,
    // superficies grandes claras dentro de una raíz (≥4000 px², fondo propio, luminancia compuesta > .35)
    claras(sel) { const root = document.querySelector(sel); if (!root) return { n: 0, malos: [['sin raíz']] }; const malos = []; let n = 0; root.querySelectorAll('*').forEach(el => { if (/^(IMG|CANVAS|SVG|VIDEO|IFRAME|PATH|I|OPTION)$/i.test(el.tagName) || el.closest('svg,.ti')) return; const b = el.getBoundingClientRect(); const w = Math.min(b.right, innerWidth) - Math.max(b.left, 0), h = Math.min(b.bottom, innerHeight) - Math.max(b.top, 0); if (w < 40 || h < 24 || w * h < 4000) return; const cs = getComputedStyle(el); const own = parse(cs.backgroundColor); if (!(own && own.a > 0.02) && !/gradient/.test(cs.backgroundImage)) return; if (!vis(el)) return; const f = fondo(el); if (Math.max(f.r, f.g, f.b) - Math.min(f.r, f.g, f.b) > 90) return; n++; const L = lum(f); if (L > 0.35) malos.push([nm(el), Math.round(w * h), +L.toFixed(2)]); }); return { n, malos }; },
    rect(sel) { const e = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) }; },
  };
};

async function abrirChat(page, movil) {
  await page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('waInbox', document.querySelector('#sbEl .ni[onclick^="nav(\'waInbox\'"]')); });
  await sleep(2000);
  const row = await page.$('#v-waInbox .nxWaRow'); await row.click();
  await page.waitForSelector('#nxWaMsgsBox .nxWaBubWrap', { timeout: 10000 });
  await sleep(3200);
}

const leerMenu = (page) => page.evaluate(() => { const p = document.querySelector('.nxWaMsgPro'); if (!p) return null; const f = window.__wa.fondo(p); return { items: [...p.querySelectorAll('button')].map(b => b.innerText.trim()), lum: +window.__wa.lum(f).toFixed(3), tt: getComputedStyle(p.querySelector('button')).textTransform, rect: window.__wa.rect(p) }; });
// Pulsación larga táctil (520 ms → nxWaMsgMenu → openMsgMenu de voz-mensajes): se lee el menú con el dedo aún apoyado,
// porque al levantarlo Chromium sintetiza un clic que lo cierra (como un toque fuera).
async function menuPorPulsacionLarga(page, ctx, sel) {
  await page.evaluate(() => document.querySelectorAll('.nxWaMsgPro,.nxWaCtx').forEach(x => x.remove()));
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await sleep(300);
  const b = await (await page.$(sel + ' .nxWaBub')).boundingBox();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
  await page.waitForSelector('.nxWaMsgPro [data-act="reply"]', { timeout: 4000 }).catch(() => {});
  await sleep(400);
  const r = await leerMenu(page);
  await page.screenshot({ path: OUT + 'menu-390.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
  await cdp.detach().catch(() => {});
  await sleep(300);
  await page.evaluate(() => document.querySelectorAll('.nxWaMsgPro,.nxWaCtx').forEach(x => x.remove()));
  return r;
}
async function menuMensaje(page, ctx, sel) {
  await page.evaluate(() => document.querySelectorAll('.nxWaMsgPro,.nxWaCtx').forEach(x => x.remove()));
  await page.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await sleep(300);
  await page.evaluate(s => { const w = document.querySelector(s); const r = w.getBoundingClientRect(); w.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 10 })); }, sel);
  await page.waitForSelector('.nxWaMsgPro [data-act="reply"]', { timeout: 4000 }).catch(() => {});
  await sleep(400);
  return leerMenu(page);
}

(async () => {
  const PORT = await puertoLibre(); const BASE = 'http://127.0.0.1:' + PORT;
  const mock = spawn(process.execPath, [path.join(REPO, 'scripts', 'qa-crm-mock-server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  try {
    await espera(BASE + '/__qa/prefs');
    const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
    for (const movil of [true, false]) {
      const tag = movil ? '390' : '1280';
      console.log(`\n=== ${tag} ===`);
      LOG.length = 0;
      MSGS.forEach(m => { const o = ORIG.get(m.id); if (o) { m.destacado_at = o.destacado_at; m.oculto_at = o.oculto_at; } }); // el mock persiste las RPC: estado limpio por viewport
      const { ctx, page, errs } = await abrir(browser, BASE, movil);
      await page.evaluate(MEDIR);
      await abrirChat(page, movil);
      await page.evaluate(MEDIR);

      // 0) marcar leído local + Edge whatsapp-inbox-leer al abrir
      ok(LOG.some(l => l.startsWith('rpc:whatsapp_marcar_hilo_leido')) && LOG.some(l => l.startsWith('edge:leer:') && l.includes(H1) && l.includes('"accion":"leer"')), `${tag} al abrir: RPC whatsapp_marcar_hilo_leido + Edge whatsapp-inbox-leer {hilo_id, accion:'leer'}`, LOG.filter(l => /rpc:|edge:/.test(l)));

      // 1) burbujas, separadores, divisor, colas
      let r = await page.evaluate((idImg) => {
        const box = document.getElementById('nxWaMsgsBox'); const bb = box.getBoundingClientRect();
        const seps = [...box.querySelectorAll(':scope > .nxWaDaySep')].map(s => { const b = s.getBoundingClientRect(); return { txt: s.textContent, centro: Math.abs((b.left + b.right) / 2 - (bb.left + bb.right) / 2) }; });
        const wraps = [...box.querySelectorAll('.nxWaBubWrap')];
        const tails = wraps.filter(w => w.classList.contains('nxWaTail'));
        const rachas = wraps.reduce((n, w, i) => n + ((i === 0 || wraps[i - 1].classList.contains('in') !== w.classList.contains('in') || !w.previousElementSibling || !w.previousElementSibling.classList.contains('nxWaBubWrap')) ? 1 : 0), 0);
        const tailPseudo = tails.length ? getComputedStyle(tails[tails.length - 1].querySelector('.nxWaBub'), '::before').content : null;
        const noTail = wraps.find(w => !w.classList.contains('nxWaTail'));
        const noTailPseudo = noTail ? getComputedStyle(noTail.querySelector('.nxWaBub'), '::before').content : null;
        const unread = box.querySelector('.nxWaUnreadSep'); let unreadOk = null;
        if (unread) { let n = 0, e = unread.nextElementSibling; while (e) { if (e.classList.contains('nxWaBubWrap') && !e.classList.contains('in')) { unreadOk = false; break; } if (e.classList.contains('nxWaBubWrap')) n++; e = e.nextElementSibling; } if (unreadOk === null) unreadOk = n === 2; }
        const ub = unread && unread.getBoundingClientRect();
        const horas = wraps.filter(w => w.querySelector('.nxWaMsgTime') && /\d{1,2}:\d{2}/.test(w.querySelector('.nxWaMsgTime').textContent)).length;
        // mensaje corto: la hora nunca se monta sobre el texto (misma línea o debajo, a la derecha)
        const montados = [...box.querySelectorAll('.nxWaBub.nxWaRefShort')].filter(bu => { const t = bu.querySelector('.nxWaMsgText'), m = bu.querySelector('.nxWaMsgMeta'); if (!t || !m) return false; const a = t.getBoundingClientRect(), b = m.getBoundingClientRect(); return b.left < a.right - 1 && b.top < a.bottom - 1 && b.bottom > a.top + 1; }).length;
        const st = s => { const e = box.querySelector('.nxWaMsgState.' + s); if (!e) return null; const rb = e.querySelector('.nxWaRetry'); const bub = e.closest('.nxWaBub').getBoundingClientRect(); return { glifo: e.querySelector('.nxWaMsgCheck').textContent, color: getComputedStyle(e.querySelector('.nxWaMsgCheck')).color, retry: !!rb, dentro: !rb || rb.getBoundingClientRect().right <= bub.right + 1 }; };
        return { total: wraps.length, montados, seps, tails: tails.length, rachas, tailPseudo, noTailPseudo, unread: unread && unread.textContent, unreadOk, unreadVisible: !!ub && ub.top >= bb.top - 2 && ub.bottom <= bb.bottom + 2, horas, samePrev: box.querySelectorAll('.nxWaBubWrap.same-prev').length,
          enviando: st('st-enviando'), enviado: st('st-enviado'), entregado: st('st-entregado'), leido: st('st-leido'), fallido: st('st-fallido'), oculto: !![...box.querySelectorAll('.nxWaMsgText')].find(t => /borró para él/.test(t.textContent)), sepDentroWrap: box.querySelectorAll('.nxWaBubWrap .nxWaDaySep').length };
      }, IMG.id);
      ok(r.total === 200 - 1 + 0 || r.total === 217, `${tag} carga inicial: 200 más recientes menos el oculto (${r.total} burbujas)`, r.total);
      ok(r.seps.length >= 3 && r.seps.every(s => s.centro <= 24) && r.seps.some(s => s.txt === 'Hoy') && r.seps.some(s => s.txt === 'Ayer') && r.sepDentroWrap === 0, `${tag} separadores de día centrados, hijos directos del chat (${r.seps.map(s => s.txt).join(' · ')})`, r.seps.slice(-4));
      ok(r.horas === r.total, `${tag} hora en todas las burbujas (${r.horas}/${r.total})`);
      ok(r.montados === 0, `${tag} en los mensajes cortos la hora no se monta sobre el texto`, r.montados);
      ok(r.tails === r.rachas && r.tailPseudo !== 'none' && r.noTailPseudo === 'none' && r.samePrev > 0, `${tag} colas solo en la última burbuja de cada racha (${r.tails} colas / ${r.rachas} rachas; ${r.samePrev} agrupadas)`, r);
      ok(r.unread === '2 mensajes no leídos' && r.unreadOk === true && r.unreadVisible, `${tag} divisor «2 mensajes no leídos» antes de los 2 últimos entrantes y visible al abrir`, { unread: r.unread, unreadOk: r.unreadOk, unreadVisible: r.unreadVisible });
      ok(r.enviando && r.enviando.glifo === '○' && r.enviado && r.enviado.glifo === '✓' && r.entregado && r.entregado.glifo === '✓✓' && r.leido && r.leido.glifo === '✓✓', `${tag} estados: ○ enviando · ✓ enviado · ✓✓ entregado · ✓✓ leído`, { enviando: r.enviando, enviado: r.enviado, entregado: r.entregado, leido: r.leido });
      ok(r.leido && r.leido.color === 'rgb(83, 189, 235)' && r.entregado && r.entregado.color !== 'rgb(83, 189, 235)', `${tag} ✓✓ azul solo en leído (${r.leido && r.leido.color} vs entregado ${r.entregado && r.entregado.color})`);
      ok(r.fallido && r.fallido.glifo === '!' && r.fallido.retry && r.fallido.dentro, `${tag} fallido: «!» + botón Reintentar dentro de la burbuja`, r.fallido);
      ok(!r.oculto, `${tag} el mensaje con oculto_at no se pinta`);

      // 2) enlaces, cita con miniatura, reenviado, destacado, reacciones, tipos de contenido
      r = await page.evaluate(() => {
        const box = document.getElementById('nxWaMsgsBox'); const q = s => box.querySelector(s);
        const links = [...box.querySelectorAll('.nxWaMsgText a')].map(a => ({ href: a.getAttribute('href'), t: a.target, rel: a.rel }));
        const bubSticker = q('.nxWaSticker')?.closest('.nxWaBub');
        const doc = q('.nxWaDoc');
        const loc = q('.nxWaLocCard');
        const con = q('.nxWaContactCard');
        const au = q('.nxWaAudio');
        return { links, quoteThumb: !!q('.nxWaQuote.hasThumb .nxWaQuoteThumb'), fwd: q('.nxWaFwd')?.textContent.trim(), star: !!q('.nxWaMsgMeta .nxWaStar'), react: q('.nxWaReactionBadge')?.textContent, reactLum: q('.nxWaReactionBadge') && +window.__wa.lum(window.__wa.fondo(q('.nxWaReactionBadge'))).toFixed(3), reactCls: q('.nxWaReactionBadge') ? [!!q('.nxWaReactionBadge .cl'), !!q('.nxWaReactionBadge .ag')] : null,
          sticker: !!bubSticker, stickerBg: bubSticker && getComputedStyle(bubSticker).backgroundColor, stickerW: q('.nxWaSticker') && Math.round(q('.nxWaSticker').getBoundingClientRect().width),
          doc: doc && { nombre: doc.querySelector('b').textContent, sub: doc.querySelector('.nxWaCardTx span').textContent, ico: doc.querySelector('.nxWaCardIco i').className, href: doc.getAttribute('href'), dl: doc.getAttribute('download') },
          loc: loc && { href: loc.getAttribute('href'), nombre: loc.querySelector('b').textContent, dir: loc.querySelector('.nxWaCardTx span').textContent, mapa: !!loc.querySelector('.nxWaLocMap i') },
          con: con && { nombre: con.querySelector('b').textContent, tel: con.querySelector('.nxWaCardTx span').textContent, btn: con.querySelector('.nxWaContactBtn')?.textContent.trim(), ini: con.querySelector('.nxWaCardIco').textContent },
          audio: au && { mic: !!au.querySelector('.nxWaAudioMic'), play: !!au.querySelector('.nxWaAudioPlay'), rate: au.querySelector('.nxWaAudioRate')?.textContent, hidden: getComputedStyle(au.querySelector('audio')).display },
          video: !!q('.nxWaVideoWrap video') && !!q('.nxWaVideoExpand'), img: !!q('img.nxWaImg[onclick^="nxWaVerMedia"]'),
          headName: document.querySelector('#v-waInbox .nxWaHeadName') && { txt: document.querySelector('#v-waInbox .nxWaHeadName').textContent, tt: getComputedStyle(document.querySelector('#v-waInbox .nxWaHeadName')).textTransform },
          headWinVisible: (() => { const w = document.querySelector('#v-waInbox .nxWaHeadWin'), h = document.querySelector('#v-waInbox .nxWaHead'); if (!w) return false; const a = w.getBoundingClientRect(), b = h.getBoundingClientRect(); return a.width > 40 && a.right <= b.right && a.bottom <= b.bottom + 1; })(),
          headSub: document.querySelector('#v-waInbox .nxWaHeadSub')?.textContent.replace(/\s+/g, ' ').trim(), headTT: getComputedStyle(document.querySelector('#v-waInbox .nxWaHeadSub')).textTransform,
          claras: window.__wa.claras('#v-waInbox') };
      });
      ok(r.links.length >= 2 && r.links.some(l => l.href === 'https://nexusprord.com/portal' && l.t === '_blank' && /noopener/.test(l.rel)) && r.links.some(l => /^https:\/\/wa\.me\/8095551234$/.test(l.href) && l.t === '_blank'), `${tag} enlaces clicables seguros (URL y teléfono → wa.me)`, r.links);
      ok(r.quoteThumb, `${tag} cita con miniatura cuando el citado es una imagen`);
      ok(r.fwd === 'Reenviado' && r.star, `${tag} etiqueta «Reenviado» y ⭐ en el mensaje destacado`, { fwd: r.fwd, star: r.star });
      ok(r.react && r.react.includes('❤️') && r.react.includes('👍') && r.reactCls && r.reactCls[0] && r.reactCls[1] && r.reactLum < 0.2, `${tag} reacción del cliente (❤️) junto a la del agente (👍) en badge oscuro (lum ${r.reactLum})`, r.react);
      ok(r.sticker && r.stickerBg === 'rgba(0, 0, 0, 0)' && r.stickerW === 160, `${tag} sticker de 160 px sin globo (fondo ${r.stickerBg})`, { w: r.stickerW, bg: r.stickerBg });
      ok(r.doc && r.doc.nombre === 'poliza-2026.pdf' && /PDF · 123 KB/.test(r.doc.sub) && /ti-file-type-pdf/.test(r.doc.ico) && r.doc.dl === 'poliza-2026.pdf', `${tag} documento: icono PDF, nombre y tamaño (${r.doc && r.doc.sub})`, r.doc);
      ok(r.loc && r.loc.href === 'https://maps.google.com/?q=18.4719,-69.8923' && r.loc.nombre === 'Oficina Central' && /Churchill/.test(r.loc.dir) && r.loc.mapa, `${tag} ubicación: tarjeta con pin y enlace a Google Maps`, r.loc);
      ok(r.con && r.con.nombre === 'Ana Martinez' && r.con.tel === '+1 849-555-0103' && /Mensaje/.test(r.con.btn) && r.con.ini === 'AM', `${tag} contacto: avatar-iniciales, nombre, teléfono y «Mensaje»`, r.con);
      ok(r.audio && r.audio.mic && r.audio.play && r.audio.rate === '1x' && r.audio.hidden === 'none', `${tag} audio: reproductor propio con mic, play y velocidad; <audio> nativo oculto`, r.audio);
      ok(r.video && r.img, `${tag} imagen abre el visor; video con botón de pantalla completa`);
      ok(r.headName && r.headName.tt === 'none' && r.headName.txt === 'Maria Perez' && /^\+1 809-863-0085\s*ventana abierta$/.test(r.headSub) && r.headTT === 'none' && r.headWinVisible, `${tag} cabecera: nombre tal como está guardado, teléfono formateado y estado de ventana (${r.headSub})`, { n: r.headName, s: r.headSub });
      ok(r.claras.malos.length === 0, `${tag} sin superficies claras en #v-waInbox (${r.claras.n} medidas)`, r.claras.malos.slice(0, 5));
      await page.screenshot({ path: OUT + `chat-${tag}.png` });

      // 3) audio: play / progreso / velocidad
      r = await page.evaluate(async () => {
        const au = document.querySelector('#nxWaMsgsBox .nxWaAudio'); au.scrollIntoView({ block: 'center' });
        const a = au.querySelector('audio'); const play = au.querySelector('.nxWaAudioPlay');
        await new Promise(r => setTimeout(r, 300));
        const dur0 = au.querySelector('.nxWaAudioTime').textContent;
        play.click(); await new Promise(r => setTimeout(r, 900));
        const tocando = !a.paused, t1 = a.currentTime, fill = parseFloat(au.querySelector('.nxWaAudioFill').style.width), icono = au.querySelector('.nxWaAudioPlay i').className;
        au.querySelector('.nxWaAudioRate').click(); const rate = a.playbackRate, rateTxt = au.querySelector('.nxWaAudioRate').textContent;
        play.click(); await new Promise(r => setTimeout(r, 200));
        return { dur0, tocando, t1, fill, icono, rate, rateTxt, pausado: a.paused, dur: a.duration };
      });
      ok(r.dur0 === '0:02' && r.tocando && r.t1 > 0.3 && r.fill > 5 && /pause/.test(r.icono) && r.rate === 1.5 && r.rateTxt === '1.5x' && r.pausado, `${tag} audio: duración 0:02, play avanza (${r.t1.toFixed(2)} s, ${r.fill.toFixed(0)} %), icono pausa, 1.5x, pausa`, r);

      // 4) visor a pantalla completa
      await page.evaluate(() => document.querySelector('#nxWaMsgsBox img.nxWaImg').scrollIntoView({ block: 'center' })); await sleep(300);
      await clic(page, '#nxWaMsgsBox img.nxWaImg'); await sleep(600);
      r = await page.evaluate(() => { const lb = document.querySelector('.nxWaLb'); if (!lb) return null; const f = window.__wa.fondo(lb); return { vis: window.__wa.vis(lb), count: lb.querySelector('.nxWaLbCount').textContent, img: !!lb.querySelector('.nxWaLbStage img'), lum: +window.__wa.lum(f).toFixed(3), down: lb.querySelector('.nxWaLbDown').hasAttribute('download'), caption: lb.querySelector('.nxWaLbCaption').textContent, z: getComputedStyle(lb).zIndex, fixed: getComputedStyle(lb).position }; });
      ok(r && r.vis && r.count === '1 / 2' && r.img && r.lum < 0.05 && r.down && /Comprobante/.test(r.caption) && r.fixed === 'fixed', `${tag} visor: abre oscuro a pantalla completa con imagen 1/2, pie y descarga`, r);
      if (movil) await page.screenshot({ path: OUT + 'lightbox-390.png' });
      await clic(page, '.nxWaLb .nxWaLbNav.next'); await sleep(500);
      r = await page.evaluate(() => { const lb = document.querySelector('.nxWaLb'); return lb && { count: lb.querySelector('.nxWaLbCount').textContent, video: !!lb.querySelector('.nxWaLbStage video') }; });
      ok(r && r.count === '2 / 2' && r.video, `${tag} visor: navega al video del mismo hilo (2/2)`, r);
      await page.keyboard.press('Escape'); await sleep(300);
      ok(await page.evaluate(() => !document.querySelector('.nxWaLb')), `${tag} visor: Escape lo cierra`);

      // 5) cargar mensajes anteriores al llegar arriba, conservando la posición
      r = await page.evaluate(async () => {
        let box = document.getElementById('nxWaMsgsBox');
        const primeroId = box.querySelector('.nxWaBubWrap').id, antes = box.querySelectorAll('.nxWaBubWrap').length;
        box.scrollTop = 0;
        await new Promise(r => setTimeout(r, 2500));
        box = document.getElementById('nxWaMsgsBox'); // el repintado crea un contenedor nuevo
        const primero = document.getElementById(primeroId), wraps = box.querySelectorAll('.nxWaBubWrap');
        const pr = primero.getBoundingClientRect(), bb = box.getBoundingClientRect();
        return { antes, despues: wraps.length, enVista: pr.top >= bb.top - 4 && pr.top < bb.bottom, scrollTop: box.scrollTop, primeroTxt: primero.querySelector('.nxWaMsgText').textContent, primeroAhora: wraps[0].querySelector('.nxWaMsgText').textContent, ind: !!box.querySelector('.nxWaOlder') };
      });
      ok(r.antes === 199 && r.despues === 247 && LOG.some(l => l.startsWith('msgs:') && /created_at=lt\./.test(l) && /limit=100/.test(l)), `${tag} historial: al llegar arriba se piden los anteriores con cursor created_at=lt (${r.antes} → ${r.despues})`, { d: r.despues, req: LOG.filter(l => /lt\./.test(l)) });
      ok(r.enVista && r.scrollTop > 0 && r.primeroAhora === 'Mensaje antiguo número 1', `${tag} historial: la posición de lectura se conserva («${r.primeroTxt}» sigue a la vista; ahora empieza en «${r.primeroAhora}»)`, r);

      // 6) contador de nuevos en «ir al final» (agente leyendo arriba)
      MSGS.push(msg({ d: 'in', c: 'Mensaje NUEVO que llega por Realtime', at: new Date().toISOString() }));
      await page.evaluate(() => { const box = document.getElementById('nxWaMsgsBox'); box.scrollTop = box.scrollHeight * 0.5; });
      await sleep(400);
      await page.evaluate(() => window.nxWaRecargar()); await sleep(1500);
      r = await page.evaluate(() => { const b = document.querySelector('#v-waInbox .nxWaLatest'); const c = b && b.querySelector('.nxWaLatestCount'); return { show: b && b.classList.contains('show'), n: c && c.textContent, vis: c && window.__wa.vis(c), nuevo: !![...document.querySelectorAll('#nxWaMsgsBox .nxWaMsgText')].find(t => /Mensaje NUEVO/.test(t.textContent)) }; });
      ok(r.show && r.n === '1' && r.vis && r.nuevo, `${tag} contador «1» en el botón ir al final cuando llega un mensaje y el agente no está al fondo`, r);
      await clic(page, '#v-waInbox .nxWaLatest'); await sleep(1200);
      r = await page.evaluate(() => { const b = document.querySelector('#v-waInbox .nxWaLatest'); const box = document.getElementById('nxWaMsgsBox'); return { n: b.querySelector('.nxWaLatestCount').textContent, fondo: box.scrollTop + box.clientHeight >= box.scrollHeight - 80 }; });
      ok(r.n === '' && r.fondo, `${tag} al ir al final el contador se apaga`, r);
      MSGS.pop();

      // 7) menú de mensaje oscuro: Destacar / Borrar para mí / Info con entregado/leído
      const selLeido = '#nxWaMsg-' + rec[0].id;
      if (movil) { const lp = await menuPorPulsacionLarga(page, ctx, selLeido); ok(lp && lp.items.includes('Responder') && lp.items.includes('Borrar para mí'), `${tag} pulsación larga (520 ms) abre el menú del mensaje`, lp); }
      let mn = await menuMensaje(page, ctx, selLeido);
      ok(mn && mn.lum < 0.2 && mn.tt === 'none' && mn.items.includes('Destacar') && mn.items.includes('Borrar para mí') && mn.items.includes('Info del mensaje'), `${tag} menú de mensaje en cristal oscuro (lum ${mn && mn.lum}) con Destacar y Borrar para mí, texto natural`, mn);
      await clic(page, '.nxWaMsgPro [data-act="info"]'); await sleep(500);
      r = await page.evaluate(() => { const ov = document.querySelector('.nxWaModalOv'); if (!ov) return null; const dts = [...ov.querySelectorAll('dt')].map(d => d.textContent); const f = window.__wa.fondo(ov.querySelector('.nxWaModalCard')); return { dts, lum: +window.__wa.lum(f).toFixed(3) }; });
      ok(r && r.dts.includes('Entregado') && r.dts.includes('Leído') && r.lum < 0.2, `${tag} Info del mensaje muestra Entregado y Leído en ventana oscura`, r);
      await page.evaluate(() => document.querySelectorAll('.nxWaModalOv').forEach(x => x.remove()));
      mn = await menuMensaje(page, ctx, selLeido);
      await clic(page, '.nxWaMsgPro [data-act="star"]'); await sleep(700);
      r = await page.evaluate(s => ({ star: !!document.querySelector(s + ' .nxWaMsgMeta .nxWaStar') }), selLeido);
      ok(r.star && LOG.some(l => l.startsWith('rpc:whatsapp_mensaje_destacar') && l.includes(rec[0].id) && l.includes('"p_destacar":true')), `${tag} Destacar: RPC whatsapp_mensaje_destacar y ⭐ en la burbuja`, LOG.filter(l => /destacar/.test(l)));
      mn = await menuMensaje(page, ctx, selLeido);
      ok(mn && mn.items.includes('Quitar destacado'), `${tag} menú: ahora ofrece «Quitar destacado»`, mn && mn.items);
      await clic(page, '.nxWaMsgPro [data-act="hide"]'); await sleep(500);
      r = await page.evaluate(() => { const ov = document.querySelector('.nxWaConfirmOv'); if (!ov) return null; const f = window.__wa.fondo(ov.querySelector('.nxWaModalCard')); return { lum: +window.__wa.lum(f).toFixed(3), txt: ov.textContent.includes('seguirá viendo') }; });
      ok(r && r.lum < 0.2 && r.txt, `${tag} Borrar para mí: confirmación en cristal oscuro`, r);
      await clic(page, '.nxWaConfirmOv [data-ok]'); await sleep(700);
      r = await page.evaluate(s => ({ existe: !!document.querySelector(s), modal: !!document.querySelector('.nxWaConfirmOv') }), selLeido);
      ok(!r.existe && !r.modal && LOG.some(l => l.startsWith('rpc:whatsapp_mensaje_ocultar') && l.includes(rec[0].id)), `${tag} Borrar para mí: RPC whatsapp_mensaje_ocultar y el mensaje desaparece del chat`, r);

      // 8) menú ⋮ oscuro con «Mensajes destacados»; clip oscuro
      await clic(page, '#v-waInbox .nxWaChatMoreBtn'); await sleep(600);
      r = await page.evaluate(() => { const p = document.querySelector('.nxWaChatPop.nxWaMainMenu'); if (!p) return null; const f = window.__wa.fondo(p); return { items: [...p.querySelectorAll('button')].map(b => b.innerText.trim()), lum: +window.__wa.lum(f).toFixed(3), tt: getComputedStyle(p.querySelector('button')).textTransform }; });
      ok(r && r.lum < 0.2 && r.tt === 'none' && r.items.includes('Mensajes destacados'), `${tag} menú ⋮ oscuro, texto natural, con «Mensajes destacados»`, r);
      await clic(page, '.nxWaMainMenu [data-a="starred"]'); await sleep(900);
      r = await page.evaluate(() => { const ov = document.querySelector('.nxWaStarredOv'); if (!ov) return null; return { rows: [...ov.querySelectorAll('.nxWaStarRow span')].map(s => s.textContent), lum: +window.__wa.lum(window.__wa.fondo(ov.querySelector('.nxWaModalCard'))).toFixed(3) }; });
      ok(r && r.rows.length >= 1 && r.rows.some(t => /reenviado desde otro chat/.test(t)) && r.lum < 0.2 && LOG.some(l => l === 'rpc:destacados'), `${tag} Mensajes destacados: panel oscuro con ${r && r.rows.length} destacado(s) vía RPC whatsapp_mensajes_destacados`, r);
      await page.evaluate(() => document.querySelectorAll('.nxWaModalOv').forEach(x => x.remove()));
      await clic(page, '#v-waInbox .nxWaComposer .nxWaIconBtn'); await sleep(600);
      r = await page.evaluate(() => { const p = document.querySelector('.nxWaAttachPop'); if (!p) return null; return { lum: +window.__wa.lum(window.__wa.fondo(p)).toFixed(3), n: p.querySelectorAll('button').length, tt: getComputedStyle(p.querySelector('button')).textTransform }; });
      ok(r && r.lum < 0.2 && r.n === 6 && r.tt === 'none', `${tag} panel del clip en cristal oscuro (6 opciones, texto natural)`, r);
      await page.evaluate(() => document.querySelectorAll('.nxWaChatPop').forEach(x => x.remove()));

      // 9) botón flotante: oculto y estable con el chat abierto (solo móvil)
      if (movil) {
        const muestras = await page.evaluate(() => new Promise(res => { const out = []; const f = document.querySelector('.nx-fab'); if (!f) return res(null); let n = 0; const t = setInterval(() => { const cs = getComputedStyle(f); out.push([cs.opacity, cs.visibility, cs.pointerEvents]); if (++n >= 25) { clearInterval(t); res(out); } }, 100); }));
        const oculto = muestras && muestras.every(m => m[0] === '0' && m[1] === 'hidden' && m[2] === 'none');
        const tapa = await page.evaluate(() => { const f = document.querySelector('.nx-fab'), b = f.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return e && f.contains(e); });
        ok(muestras && oculto && !tapa && (await page.evaluate(() => document.body.classList.contains('nxWaChatOpen'))), `${tag} botón flotante oculto y sin parpadeo durante 2,5 s con el chat abierto (body.nxWaChatOpen)`, muestras && muestras.filter(m => m[0] !== '0').slice(0, 3));
        await page.evaluate(() => nxWaCerrarDetalleMob()); await sleep(900);
        const vuelve = await page.evaluate(() => { const f = document.querySelector('.nx-fab'); const cs = getComputedStyle(f); return { op: cs.opacity, vis: cs.visibility, body: document.body.classList.contains('nxWaChatOpen') }; });
        ok(vuelve.op === '1' && vuelve.vis === 'visible' && !vuelve.body, `${tag} al volver a la lista el botón flotante reaparece`, vuelve);
      }

      ok(errs.length === 0, `${tag}: sin errores de consola`, errs.slice(0, 5));
      await ctx.close();
    }
    await browser.close();
  } catch (e) { console.error(e); fail++; }
  finally { try { mock.kill(); } catch (e) {} }
  console.log(`\nRESULTADO qa-whatsapp-chat: ${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
