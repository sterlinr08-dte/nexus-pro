// QA 59.09 «WhatsApp sin lag» (igual que el CRM de Bayol Cell): con un Realtime simulado se comprueba que los eventos
// se aplican EN MEMORIA — sin volver a pedir la lista ni los mensajes y sin reescribir el chat abierto — y que enviar
// no espera una recarga completa ni duplica la burbuja. Reutiliza el arnés de qa-whatsapp-chat.mjs (app real + REST
// simulada). Uso: node scripts/qa-whatsapp-sinlag.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-whatsapp-sinlag')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
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
const LOG = []; let ENV = 0, ENVIO_MS = 300; const ENVIADOS = [];
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
    if (/\/functions\/v1\/whatsapp-inbox-enviar/.test(u)) {
      const b = JSON.parse(r.request().postData() || '{}'); LOG.push('edge:enviar');
      const m = { id: U(9900 + (++ENV)), hilo_id: b.hilo_id, direccion: 'out', tipo_contenido: 'text', cuerpo: b.mensaje, estado: 'enviado', created_at: new Date().toISOString(), meta: {} };
      ENVIADOS.push(m); await sleep(ENVIO_MS);
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, mensaje: m }) });
    }
    if (/whatsapp_hilos/.test(u)) { LOG.push('hilos:' + u.replace(/^.*rest\/v1\//, '')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HILOS) }); }
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(() => {
    window.__RT = { h: {}, estado: '' };
    window.supabase = { createClient: () => ({ realtime: { setAuth: async () => {} }, removeChannel() {},
      channel() { const ch = { on(t, cfg, fn) { window.__RT.h[cfg.table] = fn; return ch; }, subscribe(cb) { setTimeout(() => { window.__RT.estado = 'SUBSCRIBED'; cb('SUBSCRIBED'); }, 30); return ch; } }; return ch; } }) };
  });
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


// Recargas COMPLETAS (lista entera o ventana de 200 mensajes). La consulta liviana de reacciones (select=id,reaccion_agente
// de voz-mensajes, una vez por mensaje nuevo) no cuenta.
const pedidos = () => LOG.filter(l => l.startsWith('hilos:') || (l.startsWith('msgs:') && /select=\*/.test(l))).length;
const evento = (page, tabla, payload) => page.evaluate(([t, p]) => { const f = window.__RT.h[t]; if (!f) return false; f(p); return true; }, [tabla, payload]);

(async () => {
  const PORT = await puertoLibre(); const BASE = 'http://127.0.0.1:' + PORT;
  const mock = spawn(process.execPath, [path.join(REPO, 'scripts', 'qa-crm-mock-server.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
  try {
    await espera(BASE + '/__qa/prefs');
    const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
    for (const movil of [false, true]) {
      const tag = movil ? '390' : '1280';
      console.log(`\n=== ${tag} ===`);
      LOG.length = 0; ENVIADOS.length = 0;
      const { ctx, page, errs } = await abrir(browser, BASE, movil);
      await abrirChat(page, movil);
      ok(await page.evaluate(() => !!(window.__RT.h.whatsapp_hilos && window.__RT.h.whatsapp_hilo_mensajes)), `${tag} Realtime conectado (simulado)`);
      // Marcas en el DOM: si algo se reescribe, la marca desaparece.
      const marcar = () => page.evaluate(() => { const b = document.getElementById('nxWaMsgsBox'); if (b) b.__qa = 1; const l = document.querySelector('#nxWaLista .nxWaRow'); if (l) l.__qa = 1; const p = document.querySelector('#nxWaProPanel .nxWaPro'); if (p) p.__qa = 1; });
      const marcas = () => page.evaluate(() => ({ chat: !!(document.getElementById('nxWaMsgsBox') || {}).__qa, lista: !!(document.querySelector('#nxWaLista .nxWaRow') || {}).__qa, panel: !!(document.querySelector('#nxWaProPanel .nxWaPro') || {}).__qa }));
      await page.evaluate(() => { const t = document.getElementById('nxWaTexto'); if (t) { t.value = 'borrador a medias'; t.dispatchEvent(new Event('input', { bubbles: true })); } });
      await sleep(300); await marcar();
      const p0 = pedidos();

      // 1) Otra conversación cambia (mensaje nuevo de otro cliente): la lista se actualiza en memoria, nada se recarga
      //    y el chat abierto no se toca.
      const otro = JSON.parse(JSON.stringify(HILOS[2])); otro.ultimo_mensaje_at = new Date().toISOString(); otro.ultimo_mensaje_preview = 'Mensaje nuevo de Ana QA'; otro.no_leidos_count = 2;
      await evento(page, 'whatsapp_hilo_mensajes', { eventType: 'INSERT', new: { id: U(9800), hilo_id: otro.id, direccion: 'in', tipo_contenido: 'text', cuerpo: 'Mensaje nuevo de Ana QA', created_at: otro.ultimo_mensaje_at } });
      await evento(page, 'whatsapp_hilos', { eventType: 'UPDATE', new: otro });
      await sleep(900);
      let r = await page.evaluate((id) => ({ txt: (document.querySelector(`#nxWaLista .nxWaRow[data-hilo="${id}"]`) || {}).textContent || '', primero: (document.querySelector('#nxWaLista .nxWaRow') || {}).dataset?.hilo }), otro.id);
      ok(/Mensaje nuevo de Ana QA/.test(r.txt), `${tag} otra conversación: su fila muestra el mensaje nuevo`, r);
      ok(pedidos() === p0, `${tag} otra conversación: NO se vuelve a pedir la lista ni los mensajes`, LOG.slice(-4));
      let mk = await marcas();
      ok(mk.chat, `${tag} otra conversación: el chat abierto NO se reescribe (no parpadea)`, mk);
      ok(await page.evaluate(() => (document.getElementById('nxWaTexto') || {}).value) === 'borrador a medias', `${tag} lo que estaba escribiendo sigue ahí`);

      // 2) Llega un mensaje del cliente al chat abierto: aparece sin recargar nada.
      await marcar(); const p1 = pedidos();
      const nuevoIn = { id: U(9801), hilo_id: H1, direccion: 'in', tipo_contenido: 'text', cuerpo: 'QA: ¿ya lo vio?', estado: 'recibido', created_at: new Date().toISOString(), meta: {} };
      await evento(page, 'whatsapp_hilo_mensajes', { eventType: 'INSERT', new: nuevoIn });
      await sleep(700);
      ok(await page.evaluate(() => [...document.querySelectorAll('#nxWaMsgsBox .nxWaBubWrap')].some(w => /QA: ¿ya lo vio\?/.test(w.textContent))), `${tag} mensaje entrante del chat abierto: aparece`);
      ok(pedidos() === p1, `${tag} mensaje entrante: sin recargar lista ni mensajes`, LOG.slice(-4));
      ok(await page.evaluate(() => (document.getElementById('nxWaTexto') || {}).value) === 'borrador a medias', `${tag} mensaje entrante: el borrador no se pierde`);

      // 3) ✓✓ leído de un mensaje propio: se actualiza solo esa marca, sin recargar.
      const p2 = pedidos();
      const out = await page.evaluate(() => { const w = [...document.querySelectorAll('#nxWaMsgsBox .nxWaBubWrap:not(.in)')].pop(); return w ? (w.dataset.id || w.getAttribute('data-id') || w.querySelector('[data-id]')?.getAttribute('data-id')) : null; });
      const base = MSGS.find(m => m.cuerpo === 'Ya enviado (una palomita).');
      await evento(page, 'whatsapp_hilo_mensajes', { eventType: 'UPDATE', new: Object.assign({}, base, { estado: 'leido', leido_at: new Date().toISOString() }) });
      await sleep(700);
      ok(pedidos() === p2, `${tag} cambio a ✓✓ leído: sin recargar`, LOG.slice(-4));

      // 4) El mismo evento de la lista repetido no reescribe nada.
      await marcar();
      await evento(page, 'whatsapp_hilos', { eventType: 'UPDATE', new: otro });
      await sleep(600);
      mk = await marcas();
      ok(mk.lista && mk.chat && mk.panel, `${tag} evento repetido: lista, panel y chat intactos`, mk);

      // 5) Enviar: el campo de escribir se libera al confirmar, sin recarga completa, y el eco no duplica la burbuja.
      const p3 = pedidos();
      await page.evaluate(() => { const t = document.getElementById('nxWaTexto'); t.value = 'Respuesta QA sin lag'; window.nxWaEnviar(); });
      // Eco de Realtime ANTES de que responda el servidor (lo normal: Realtime suele ganarle al HTTP).
      await sleep(120);
      const eco = { id: U(9900 + ENV), hilo_id: H1, direccion: 'out', tipo_contenido: 'text', cuerpo: 'Respuesta QA sin lag', estado: 'enviado', created_at: new Date().toISOString(), meta: {} };
      await evento(page, 'whatsapp_hilo_mensajes', { eventType: 'INSERT', new: eco });
      await sleep(900);
      const n = await page.evaluate(() => [...document.querySelectorAll('#nxWaMsgsBox .nxWaBubWrap')].filter(w => /Respuesta QA sin lag/.test(w.textContent)).length);
      ok(n === 1, `${tag} enviar: el mensaje queda UNA sola vez (eco + respuesta)`, n);
      ok(LOG.includes('edge:enviar'), `${tag} enviar: llama a whatsapp-inbox-enviar`);
      ok(!LOG.slice(LOG.indexOf('edge:enviar')).some(l => l.startsWith('hilos:')), `${tag} enviar: NO espera una recarga completa de la lista`, LOG.slice(-5));
      ok(await page.evaluate(() => { const t = document.getElementById('nxWaTexto'); return !!t && !t.disabled; }), `${tag} enviar: el campo de escribir queda libre enseguida`);
      ok(/Respuesta QA sin lag/.test(await page.evaluate((id) => (document.querySelector(`#nxWaLista .nxWaRow[data-hilo="${id}"]`) || {}).textContent || '', H1)), `${tag} enviar: la fila de la lista muestra el mensaje enviado`);

      // 6) Respaldo: un evento que no se puede aplicar en memoria (fila sin id) sí recarga.
      const p4 = pedidos();
      await evento(page, 'whatsapp_hilos', { eventType: 'UPDATE', new: {} });
      await sleep(1200);
      ok(pedidos() > p4, `${tag} respaldo: evento raro → recarga completa`, LOG.slice(-3));

      await page.screenshot({ path: OUT + `sinlag-${tag}.png` });
      ok(errs.length === 0, `${tag}: sin errores de consola`, errs.slice(0, 5));
      await ctx.close();
    }
    await browser.close();
  } catch (e) { console.error(e); fail++; }
  finally { try { mock.kill(); } catch (e) {} }
  console.log(`\nRESULTADO qa-whatsapp-sinlag: ${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
