// QA de legibilidad del Buzón de WhatsApp en tema «Glass oscuro» (58.95, hotfix «conversaciones con fondo blanco»).
// App real (index.html + cadena parches-whatsapp-*) contra la REST simulada de scripts/qa-crm-mock-server.js (se
// arranca sola en un puerto libre) + hilos y mensajes simulados con page.route que cubren TODO lo que hay en producción:
//  · mensajes text / imagen / audio / contacto / ubicacion / documento (pdf, docx) / sticker / video, in y out;
//  · estados recibido / enviando / enviado / entregado / leido / fallido; citas (también a imagen), reacciones, reenviado,
//    destacado_at, oculto_at; filas de plantilla («Plantilla: …» + meta.plantilla);
//  · imágenes entrantes con revision_pago_estado pendiente / aplicado / descartado (panel «Bauches pendientes» con
//    Aplicar / Descartar) y Storage firmado que devuelve imagen/audio/pdf reales para que las tarjetas se pinten;
//  · hilos: con cliente, sin cliente, `bsid:` sin número, ventana de 24 h cerrada (aviso + «Usar plantilla aprobada» /
//    «Crear plantilla» + recordatorio), fijado, silenciado, archivado (sección «Archivados» desplegada).
// En cada hilo y en cada capa abierta (⋮ y sus ventanas, historial multimedia, destacados, clip, menú de mensaje, Info,
// reenviar, confirmación, visor, plantillas, contactos) a 390×844 (UA iPhone) y 1280×800 se comprueba:
//  · 0 superficies claras (elemento visible con fondo propio, ≥ 30×30 px, luminancia compuesta > .35 y sin tinte fuerte);
//  · contraste WCAG ≥ 4.5:1 (3:1 en texto grande) de TODO texto visible del Buzón, medido sobre el fondo REAL (captura con
//    el texto transparente, como en scripts/qa-legibilidad.mjs).
// Uso: node scripts/qa-whatsapp-legibilidad.mjs   (QA_OUT=/ruta capturas e informe; QA_TABLER=/ruta con tabler-icons.min.css)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-whatsapp-legibilidad')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const PREFIJO = process.env.QA_PREFIJO || '';
const TABLER = process.env.QA_TABLER || '';
const CHROME = fs.existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 900) : '')); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const ago = h => new Date(Date.now() - h * 3600e3).toISOString();

// ── simulador REST en un puerto libre ──
const puertoLibre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const espera = (url, ms = 15000) => new Promise((res, rej) => { const t0 = Date.now(); const tick = () => http.get(url, r => { r.resume(); res(); }).on('error', () => Date.now() - t0 > ms ? rej(new Error('mock no arranca')) : setTimeout(tick, 150)); tick(); });

// ── datos simulados ──
const hilo = (n, o) => ({ id: U(9000 + n), telefono_e164: o.tel, cliente_id: o.cli != null ? U(200 + o.cli) : null, nombre_perfil: o.nom ?? null, asignado_agente_id: null,
  ultimo_mensaje_at: ago(o.h), ultimo_mensaje_preview: o.prev, ultimo_inbound_at: ago(o.hin ?? o.h), ultima_respuesta_humana_at: ago(o.h + 1), no_leidos_count: o.nl || 0, created_at: ago(400), updated_at: ago(o.h),
  fijado_at: o.fij || null, archivado_at: o.arch || null, silenciado_hasta: o.sil || null, ultimo_mensaje_id: null, ultimo_mensaje_direccion: o.dir || 'in', ultimo_mensaje_tipo: o.tipo || 'text', ultimo_mensaje_estado: o.est || null });
const HILOS = [
  hilo(1, { tel: '+18098630085', cli: 0, nom: 'Mercedes Ortiz', h: 0.2, prev: 'Me confirma cuando la vea por favor', nl: 2 }),
  hilo(2, { tel: '+18495550103', cli: 2, nom: 'Ana Martinez', h: 30, hin: 30, prev: 'Le envío la foto', nl: 0, dir: 'out', est: 'leido' }),          // ventana cerrada, cliente atrasado
  hilo(3, { tel: 'bsid:7f3a9c2e1b', cli: null, nom: null, h: 5, prev: 'Hola, quiero información', nl: 1 }),                                             // hilo sin número
  hilo(4, { tel: '+18095550199', cli: null, nom: 'Wilson', h: 26, hin: 2, prev: 'Cuánto cuesta el plan familiar?', nl: 3, tipo: 'imagen' }),           // sin cliente
  hilo(5, { tel: '+18095550104', cli: 3, nom: 'Pedro S', h: 40, hin: 3, prev: 'Hola Pedro, tienes un balance pendiente.', dir: 'out', est: 'entregado', fij: ago(48) }),
  hilo(6, { tel: '+18295550105', cli: 4, nom: 'Luisa F.', h: 20, prev: '👍', nl: 1, sil: 'infinity', tipo: 'audio' }),
  hilo(7, { tel: '+18495550107', cli: 6, nom: 'Rosa Jimenez', h: 50, prev: 'Audio', arch: ago(4), dir: 'out', tipo: 'audio', est: 'fallido' }),
];
const H = Object.fromEntries(HILOS.map((h, i) => [i + 1, h.id]));
let seq = 0;
const msg = (hid, o) => ({ id: U(9100 + (seq++)), hilo_id: hid, direccion: o.d, tipo_contenido: o.t || 'text', cuerpo: o.c ?? null, media_path: o.mp || null, wa_message_id: 'w' + seq, responde_a_id: o.resp || null,
  estado: o.d === 'out' ? (o.e || 'enviado') : 'recibido', error_detalle: o.err || null, enviado_por_agente_id: null, revision_pago_estado: o.rev || null, abono_id: o.rev === 'aplicado' ? U(800) : null, created_at: o.at,
  reaccion_agente: o.ra || null, reaccion_cliente: o.rc || null, meta: o.meta || {}, entregado_at: o.ent || null, leido_at: o.lei || null, destacado_at: o.star || null, destacado_por: null, oculto_at: o.hide || null, oculto_por: null, reenviado: !!o.fwd });
const MSGS = [];
const ayer = h => ago(24 + h), hoy = h => ago(h);
// H1: todo lo que hay en producción
{
  const h = H[1];
  for (let i = 0; i < 24; i++) MSGS.push(msg(h, { d: i % 3 === 0 ? 'out' : 'in', c: 'Mensaje antiguo número ' + (i + 1), at: ago(24 * 6 - i * 2), e: 'leido' }));
  MSGS.push(msg(h, { d: 'out', c: 'Plantilla: recordatorio_atraso', at: ayer(9), e: 'leido', meta: { plantilla: { nombre: 'recordatorio_atraso', idioma: 'es' } } }));
  MSGS.push(msg(h, { d: 'out', c: 'Hola Mercedes, tienes un balance pendiente de RD$ 4,500.00. Puedes ver tu estado en https://nexusprord.com/portal o llamarnos al 809-555-1234.', at: ayer(6), e: 'leido', ent: ayer(5.9), lei: ayer(5.5) }));
  MSGS.push(msg(h, { d: 'in', c: 'Buenas tardes, no hay atraso verdad?', at: ayer(5) }));
  MSGS.push(msg(h, { d: 'in', c: '👍', at: ayer(4.9), ra: '👍', rc: '❤️' }));
  const B1 = msg(h, { d: 'in', t: 'imagen', c: 'Comprobante de la transferencia', mp: 'img/comprobante.jpg', at: ayer(3), rev: 'pendiente', meta: { media: { mime: 'image/jpeg', nombre: 'comprobante.jpg', tamano: 88000 } } }); MSGS.push(B1);
  MSGS.push(msg(h, { d: 'in', t: 'imagen', c: null, mp: 'img/bauche-aplicado.jpg', at: ayer(2.95), rev: 'aplicado', meta: { media: { mime: 'image/jpeg' } } }));
  MSGS.push(msg(h, { d: 'in', t: 'imagen', c: 'Este no era', mp: 'img/bauche-descartado.jpg', at: ayer(2.92), rev: 'descartado', meta: { media: { mime: 'image/jpeg' } } }));
  MSGS.push(msg(h, { d: 'out', c: 'Perfecto, gracias por el comprobante.', at: ayer(2.9), e: 'leido', resp: B1.id, ent: ayer(2.8), lei: ayer(2.7) }));
  MSGS.push(msg(h, { d: 'out', t: 'imagen', c: 'Aquí la factura', mp: 'img/factura-salida.png', at: ayer(2.8), e: 'entregado', meta: { media: { mime: 'image/png', nombre: 'factura.png' } } }));
  MSGS.push(msg(h, { d: 'in', t: 'audio', c: '[audio]', mp: 'aud/nota.ogg', at: ayer(2.5), meta: { media: { mime: 'audio/ogg' } } }));
  MSGS.push(msg(h, { d: 'out', t: 'audio', c: null, mp: 'aud/respuesta.m4a', at: ayer(2.4), e: 'leido', meta: { media: { mime: 'audio/mp4' } } }));
  MSGS.push(msg(h, { d: 'in', t: 'ubicacion', c: '18.4719, -69.8923', at: ayer(2.2), meta: { ubicacion: { lat: 18.4719, lng: -69.8923, nombre: 'Oficina Central', direccion: 'Av. Winston Churchill 1099, Santo Domingo' } } }));
  MSGS.push(msg(h, { d: 'out', t: 'contacto', c: 'Contacto: Ana Martinez (+18495550103)', at: ayer(2), e: 'entregado', meta: { contactos: [{ nombre: 'Ana Martinez', telefonos: ['+18495550103'] }] } }));
  MSGS.push(msg(h, { d: 'in', t: 'sticker', c: '[sticker]', mp: 'img/sticker.webp', at: ayer(1.8) }));
  MSGS.push(msg(h, { d: 'in', t: 'documento', c: 'poliza-2026.pdf', mp: 'doc/poliza-2026.pdf', at: ayer(1.5), meta: { media: { mime: 'application/pdf', nombre: 'poliza-2026.pdf', tamano: 125952 } } }));
  MSGS.push(msg(h, { d: 'out', t: 'documento', c: null, mp: 'doc/contrato.docx', at: ayer(1.4), e: 'leido', meta: { media: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', nombre: 'contrato.docx', tamano: 40960 } } }));
  MSGS.push(msg(h, { d: 'out', t: 'video', c: '[video]', mp: 'vid/clip.mp4', at: hoy(6), e: 'entregado', ent: hoy(5.9) }));
  MSGS.push(msg(h, { d: 'out', c: 'Este mensaje fue reenviado desde otro chat.', at: hoy(5.5), e: 'leido', fwd: true, star: hoy(5.4) }));
  MSGS.push(msg(h, { d: 'in', c: 'Mensaje del cliente destacado ⭐', at: hoy(5.3), star: hoy(5.2), fwd: true }));
  MSGS.push(msg(h, { d: 'out', c: 'Mensaje que el agente borró para él (no debe verse).', at: hoy(5.2), e: 'leido', hide: hoy(5.1) }));
  MSGS.push(msg(h, { d: 'out', c: 'Enviando ahora mismo…', at: hoy(0.4), e: 'enviando' }));
  MSGS.push(msg(h, { d: 'out', c: 'Ya enviado (una palomita).', at: hoy(0.39), e: 'enviado' }));
  MSGS.push(msg(h, { d: 'out', c: 'Este no salió.', at: hoy(0.38), e: 'fallido', err: 'Zernio: número inválido' }));
  MSGS.push(msg(h, { d: 'in', c: 'Buenos días, ya hice la transferencia 🙏', at: hoy(0.25) }));
  MSGS.push(msg(h, { d: 'in', c: 'Me confirma cuando la vea por favor', at: hoy(0.2) }));
}
// H2: ventana cerrada (último entrante hace 30 h), con plantilla enviada y foto
{
  const h = H[2];
  MSGS.push(msg(h, { d: 'in', c: 'Buenas, le envío la foto de la cédula', at: ago(31) }));
  MSGS.push(msg(h, { d: 'in', t: 'imagen', c: null, mp: 'img/cedula.jpg', at: ago(30), rev: 'descartado', meta: { media: { mime: 'image/jpeg' } } }));
  MSGS.push(msg(h, { d: 'out', c: 'Plantilla: factura_generada', at: ago(20), e: 'leido', meta: { plantilla: { nombre: 'factura_generada' } } }));
  MSGS.push(msg(h, { d: 'out', c: 'Le envío la foto', at: ago(19), e: 'leido' }));
}
// H3: bsid sin número · H4: sin cliente · H5-H7: fijado / silenciado / archivado
MSGS.push(msg(H[3], { d: 'in', c: 'Hola, quiero información', at: ago(5) }));
MSGS.push(msg(H[3], { d: 'out', c: 'Claro, ¿en qué le ayudamos?', at: ago(4.9), e: 'fallido', err: 'Sin número' }));
MSGS.push(msg(H[4], { d: 'in', t: 'imagen', c: 'Bauche', mp: 'img/bauche-sin-cliente.jpg', at: ago(2), rev: 'pendiente', meta: { media: { mime: 'image/jpeg' } } }));
MSGS.push(msg(H[4], { d: 'in', c: 'Cuánto cuesta el plan familiar?', at: ago(1.9) }));
MSGS.push(msg(H[5], { d: 'out', c: 'Hola Pedro, tienes un balance pendiente.', at: ago(40), e: 'entregado' }));
MSGS.push(msg(H[6], { d: 'in', c: '👍', at: ago(20) }));
MSGS.push(msg(H[7], { d: 'out', t: 'audio', c: null, mp: 'aud/x.ogg', at: ago(50), e: 'fallido', err: 'Zernio: 500' }));
function mensajesRest(u) {
  const q = new URL(u).searchParams; let rows = MSGS.slice();
  for (const [k, v] of q.entries()) {
    let m;
    if ((m = /^eq\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) === m[1]);
    else if ((m = /^lt\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) < m[1]);
    else if ((m = /^gt\.(.*)$/.exec(v))) rows = rows.filter(r => String(r[k]) > m[1]);
    else if ((m = /^ilike\.(.*)$/.exec(v))) { const t = m[1].replace(/\*/g, '').toLowerCase(); rows = rows.filter(r => String(r[k] || '').toLowerCase().includes(t)); }
    else if ((m = /^not\.is\.null$/.exec(v))) rows = rows.filter(r => r[k] != null);
  }
  const order = (q.get('order') || 'created_at.asc').split(',')[0].split('.'); const col = order[0], desc = order.includes('desc');
  rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (desc ? -1 : 1));
  const lim = Number(q.get('limit')); if (lim) rows = rows.slice(0, lim);
  const sel = q.get('select'); if (sel && sel !== '*') { const cols = sel.split(','); rows = rows.map(r => Object.fromEntries(cols.filter(c => c in r).map(c => [c, r[c]]))); }
  return rows;
}
// medios simulados: SVG (imagen/sticker, fondo claro como una foto real de bauche), WAV para audio, PDF/DOCX mínimos, mp4 vacío
const svg = (txt, bg, fg) => `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="100%" height="100%" fill="${bg}"/><rect x="40" y="40" width="400" height="280" rx="12" fill="${fg}" opacity=".9"/><text x="240" y="300" font-size="30" text-anchor="middle" fill="#111" font-family="sans-serif">${txt}</text></svg>`;
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
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs|jsdelivr/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try {
    const u = r.request().url(), m = r.request().method();
    if (/\/storage\/v1\/object\/sign\/whatsapp-inbox-media\//.test(u)) {
      const p = u.replace(/^.*whatsapp-inbox-media\//, '').replace(/\?.*$/, '');
      if (m === 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signedURL: '/object/sign/whatsapp-inbox-media/' + p + '?token=qa' }) });
      if (/\.(jpg|png|webp)$/.test(p)) return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(p.split('/').pop(), p.includes('sticker') ? '#7c3aed' : '#e5e7eb', p.includes('sticker') ? '#fff' : '#f8fafc') });
      if (/\.(wav|ogg|m4a|mp3)$/.test(p)) return r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV });
      if (/\.pdf$/.test(p)) return r.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' });
      if (/\.docx$/.test(p)) return r.fulfill({ status: 200, contentType: 'application/octet-stream', body: 'PK' });
      return r.fulfill({ status: 200, contentType: 'video/mp4', body: '' });
    }
    if (/\/functions\/v1\/whatsapp-/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    if (/\/rest\/v1\/rpc\/whatsapp_mensajes_destacados/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MSGS.filter(x => x.destacado_at && !x.oculto_at)) });
    if (/\/rest\/v1\/rpc\/whatsapp_/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    if (/whatsapp_hilo_mensajes/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mensajesRest(u)) });
    if (/whatsapp_hilos/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HILOS) });
    if (/whatsapp_plantillas/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: U(700), nombre: 'recordatorio_atraso', estado: 'APPROVED', idioma: 'es', cuerpo: 'Hola {{1}}, tienes un balance pendiente de {{2}}.', categoria: 'UTILITY' }, { id: U(701), nombre: 'factura_generada', estado: 'APPROVED', idioma: 'es', cuerpo: 'Hola {{1}}, tu factura {{2}} ya está lista.', categoria: 'UTILITY' }]) });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript(() => {
    localStorage.setItem('nx_tema', 'glass-oscuro'); localStorage.removeItem('nx_tgo_off'); localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  });
  await page.addInitScript(MEDIDOR);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2000);
  return { ctx, page, errs };
}

// ── medición en página: superficies claras + contraste real (captura con texto transparente) ──
const RAICES = '#v-waInbox,.nxWaChatPop,.nxWaModalOv,.nxWaMhOv,.nxWaTplOverlay,#nxWaTplOverlay,.nxWaLb,.nxWaMsgPro,#nxWaCtxOverlay,.nxWaCtx,.nxPayV2Ov,.nxWaConfirmOv,.nxWaStarredOv,.nxWaAdminDelOv,.nxWaEnvioMasivoOverlay,#nxWaNuevaPlantillaOverlay,.nxWaAutoOverlay,#nxWaAutoOverlay,.nxWaEmojiPanel,.nxWaRowMenu,.nxWaListMenu';
function MEDIDOR() {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const hex = (c) => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const ruta = (el) => { const p = []; for (let a = el; a && a !== document.body && p.length < 5; a = a.parentElement) { p.unshift(nombre(a)); if (a.id === 'v-waInbox') break; } return p.join(' > '); };
  const opacidad = (el) => { let op = 1; for (let a = el; a && a.nodeType === 1; a = a.parentElement) op *= +getComputedStyle(a).opacity; return op; };
  const vis = e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && opacidad(e) > 0.05; };
  // fondo compuesto por capas de color propias (sin captura): sirve para las superficies
  const fondoCss = (el) => { const capas = []; for (let a = el; a && a.nodeType === 1; a = a.parentElement) { const cs = getComputedStyle(a); if (/gradient/.test(cs.backgroundImage) && !/url\(/.test(cs.backgroundImage)) { const cc = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); if (cc.length) { const sa = cc.reduce((s, c) => s + c.a, 0) || 1; capas.push(cc.reduce((s, c) => ({ r: s.r + c.r * c.a / sa, g: s.g + c.g * c.a / sa, b: s.b + c.b * c.a / sa, a: s.a + c.a / cc.length }), { r: 0, g: 0, b: 0, a: 0 })); } } const bg = parse(cs.backgroundColor); if (bg && bg.a > 0) { capas.push(bg); if (bg.a >= 0.99) break; } } let c = { r: 10, g: 22, b: 40, a: 1 }; for (let i = capas.length - 1; i >= 0; i--) { const t = capas[i]; const a = t.a + c.a * (1 - t.a); c = { r: (t.r * t.a + c.r * c.a * (1 - t.a)) / a, g: (t.g * t.a + c.g * c.a * (1 - t.a)) / a, b: (t.b * t.a + c.b * c.a * (1 - t.a)) / a, a }; } return c; };
  let seq = 0;
  window.__wl = {
    parse, lum, hex, vis,
    // Superficies claras: elementos visibles del Buzón (o de una capa abierta) con fondo propio, ≥ 30×30 px dentro de la
    // ventana, luminancia compuesta > .35 y sin tinte fuerte (los botones azules/verdes/rojos no cuentan).
    claras(raices) {
      const out = []; let n = 0;
      document.querySelectorAll(raices).forEach(root => { if (!vis(root)) return; [root, ...root.querySelectorAll('*')].forEach(el => {
        if (/^(IMG|CANVAS|SVG|VIDEO|IFRAME|PATH|I|OPTION|AUDIO)$/i.test(el.tagName) || el.closest('svg,.ti') || el.classList.contains('nxWaAudioKnob')) return;
        const b = el.getBoundingClientRect(); const w = Math.min(b.right, innerWidth) - Math.max(b.left, 0), h = Math.min(b.bottom, innerHeight) - Math.max(b.top, 0);
        if (w < 30 || h < 30 || w * h < 900) return;
        const cs = getComputedStyle(el); const own = parse(cs.backgroundColor);
        if (!(own && own.a > 0.02) && !/gradient/.test(cs.backgroundImage)) return;
        if (!vis(el)) return;
        const f = fondoCss(el); if (Math.max(f.r, f.g, f.b) - Math.min(f.r, f.g, f.b) > 90) return;
        n++; const L = lum(f);
        if (L > 0.35) out.push({ ruta: ruta(el), area: Math.round(w * h), lum: +L.toFixed(2), fondo: hex(f), propio: cs.backgroundColor + (/gradient/.test(cs.backgroundImage) ? ' + gradiente' : '') });
      }); });
      return { n, malos: out };
    },
    // Textos visibles del Buzón (o de una capa abierta) aún no medidos
    candidatos(raices) {
      const out = [];
      document.querySelectorAll(raices).forEach(root => { if (!vis(root)) return; root.querySelectorAll('*').forEach(el => {
        if (el.__wlHecho) return;
        if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|svg|path|OPTION|IMG|CANVAS|VIDEO|IFRAME|BR|HR|AUDIO)$/i.test(el.tagName) || el.closest('svg,.ti,[aria-hidden="true"],.skeleton,.placeholder,.sr-only')) return;
        const nodos = [...el.childNodes].filter(n => n.nodeType === 3 && /[\p{L}\p{N}]/u.test(n.textContent));
        if (!nodos.length) return;
        if (!el.getClientRects().length) return;
        const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
        const op = opacidad(el); if (op < 0.1) return;
        const tc = parse(cs.color); if (!tc || tc.a * op < 0.05) return;
        const rects = [];
        for (const n of nodos) { const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) { if (b.width < 2 || b.height < 2) continue; const x = Math.max(0, b.left + 1), y = Math.max(0, b.top + 1), x2 = Math.min(innerWidth, b.right - 1), y2 = Math.min(innerHeight, b.bottom - 1); if (x2 - x >= 2 && y2 - y >= 2) rects.push([x, y, x2 - x, y2 - y]); } }
        if (!rects.length) return;
        const [cx, cy] = [rects[0][0] + rects[0][2] / 2, rects[0][1] + rects[0][3] / 2];
        const top = document.elementFromPoint(cx, cy); if (top && top !== el && !el.contains(top) && !top.contains(el)) return;
        el.__wlHecho = true; el.__wlId = ++seq;
        const inactivo = !!(el.closest('[disabled],[aria-disabled="true"],.disabled') || (el.matches('button,input,select,textarea') && el.disabled));
        out.push({ id: seq, ruta: ruta(el), texto: nodos.map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim().slice(0, 40), color: { r: tc.r, g: tc.g, b: tc.b, a: tc.a * op }, fs: parseFloat(cs.fontSize), fw: +cs.fontWeight || 400, rects, inactivo });
      }); });
      return out;
    },
    ocultarTexto(on) {
      let s = document.getElementById('__wlOculta');
      if (!on) { if (s) s.remove(); return; }
      if (!s) { s = document.createElement('style'); s.id = '__wlOculta'; document.documentElement.appendChild(s); }
      s.textContent = 'html *,html *::before,html *::after,html *::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important;text-decoration-color:transparent!important}html .nx-fab{visibility:hidden!important}';
    },
    async muestrear(b64, items) {
      const img = new Image(); await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
      const sx = img.naturalWidth / innerWidth, sy = img.naturalHeight / innerHeight;
      return items.map(it => {
        const px = [];
        for (const [x, y, w, h] of it.rects) {
          const X = Math.round(x * sx), Y = Math.round(y * sy), W = Math.max(1, Math.round(w * sx)), Hh = Math.max(1, Math.round(h * sy));
          const d = cx.getImageData(X, Y, W, Hh).data; const paso = Math.max(1, Math.floor(d.length / 4 / 2500));
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
    resaltar(ids, on) { document.querySelectorAll('body *').forEach(el => { if (el.__wlId && ids.includes(el.__wlId)) { if (on) { el.__wlOutline = el.style.outline; el.style.outline = '2px solid #FF2D55'; el.style.outlineOffset = '1px'; } else { el.style.outline = el.__wlOutline || ''; el.style.outlineOffset = ''; } } }); },
    reiniciar() { document.querySelectorAll('body *').forEach(el => { delete el.__wlHecho; delete el.__wlId; }); seq = 0; },
    // Desplazador con más recorrido pendiente entre los candidatos visibles (chat, lista, ventana, página)
    scroller(sels) {
      const cands = [...document.querySelectorAll(sels)].filter(e => e.getClientRects().length);
      let best = null, bs = 0;
      for (const e of cands) { const cs = getComputedStyle(e); if (!/(auto|scroll)/.test(cs.overflowY) && e !== document.scrollingElement) continue; const s = e.scrollHeight - e.clientHeight; if (s > bs + 4) { bs = s; best = e; } }
      if (!best) { const se = document.scrollingElement; if (se.scrollHeight - se.clientHeight > 4) best = se; }
      document.querySelectorAll('*').forEach(x => { delete x.__wlScroller; });
      if (!best) return null; best.__wlScroller = true; return { alto: best.clientHeight, total: best.scrollHeight, top: best.scrollTop };
    },
    desplazar(y) { const e = [...document.querySelectorAll('*')].find(x => x.__wlScroller); if (!e) return 0; e.scrollTop = y; return e.scrollTop; },
  };
}

const HALLAZGOS = [];
// Mide un contexto (hilo abierto / lista / capa): superficies claras + contraste, recorriendo el desplazador por tramos.
async function medir(page, tag, ctxNombre, opts = {}) {
  const raices = opts.raices || RAICES;
  const scrollSel = opts.scroll || '#nxWaMsgsBox,.nxWaMhBody,.nxWaModalCard,.nxWaModalBody,.nxWaTplBox,.nxWaCtxBody,.nxWaCtxSheet,#nxWaCtxBody,.nxWaListScroll,.nxPayV2Box,.nxWaForwardList,.nxWaLbCaption,#cnt,.main,body,html';
  await page.evaluate(() => window.__wl.reiniciar());
  const sc = await page.evaluate((s) => window.__wl.scroller(s), scrollSel);
  const tramos = sc ? Math.min(6, Math.ceil(sc.total / Math.max(1, sc.alto * 0.9))) : 1;
  const superficies = [], textos = []; let medidos = 0, nSup = 0;
  for (let t = 0; t < tramos; t++) {
    if (sc) { await page.evaluate((y) => window.__wl.desplazar(y), Math.round(t * sc.alto * 0.9)); await sleep(350); }
    const cl = await page.evaluate((r) => window.__wl.claras(r), raices);
    nSup += cl.n; cl.malos.forEach(m => { if (!superficies.some(x => x.ruta === m.ruta && x.fondo === m.fondo)) superficies.push({ ...m, tramo: t }); });
    const items = await page.evaluate((r) => window.__wl.candidatos(r), raices);
    if (items.length) {
      await page.evaluate(() => window.__wl.ocultarTexto(true)); await sleep(60);
      const b64 = (await page.screenshot({ type: 'png' })).toString('base64');
      await page.evaluate(() => window.__wl.ocultarTexto(false));
      const res = await page.evaluate(({ b64, items }) => window.__wl.muestrear(b64, items), { b64, items });
      const malos = [];
      for (const r of res) { if (r.sinMuestra) continue; medidos++; if (!r.inactivo && r.ratio < r.limite) { textos.push({ ruta: r.ruta, texto: r.texto, color: r.colorHex, fondo: r.fondo, fondoClaro: r.fondoClaro, fondoOscuro: r.fondoOscuro, ratio: r.ratio, limite: r.limite, fs: r.fs, fw: r.fw, tramo: t }); malos.push(r.id); } }
      if (malos.length) { await page.evaluate((ids) => window.__wl.resaltar(ids, true), malos); await page.screenshot({ path: OUT + `${PREFIJO}hallazgos-${tag}-${ctxNombre.replace(/[^\w.-]+/g, '_')}-${t}.png` }); await page.evaluate((ids) => window.__wl.resaltar(ids, false), malos); }
    }
  }
  if (sc) await page.evaluate(() => window.__wl.desplazar(0));
  superficies.forEach(s => HALLAZGOS.push({ tag, contexto: ctxNombre, tipo: 'superficie', ...s }));
  textos.forEach(x => HALLAZGOS.push({ tag, contexto: ctxNombre, tipo: 'contraste', ...x }));
  ok(superficies.length === 0, `${tag} ${ctxNombre}: 0 superficies claras (${nSup} medidas)`, superficies.slice(0, 6));
  ok(textos.length === 0, `${tag} ${ctxNombre}: contraste ≥ 4.5:1 en ${medidos} textos (${textos.length} ilegibles)`, textos.slice(0, 6).map(x => [x.ruta, x.texto, x.ratio, x.color, x.fondo]));
  return { superficies, textos };
}

const clic = async (page, sel, ms = 6000) => { await page.waitForSelector(sel, { timeout: ms, state: 'attached' }); await page.evaluate(s => document.querySelector(s).click(), sel); };
const cerrarCapas = (page) => page.evaluate(() => document.querySelectorAll('.nxWaChatPop,.nxWaModalOv,.nxWaMhOv,.nxWaLb,.nxWaMsgPro,.nxWaCtx,#nxWaTplOverlay,.nxWaTplOverlay,.nxWaConfirmOv,.nxWaStarredOv,.nxWaAdminDelOv,.nxPayV2Ov,#nxWaNuevaPlantillaOverlay').forEach(x => x.remove()));
async function abrirInbox(page) {
  await page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('waInbox', document.querySelector('#sbEl .ni[onclick^="nav(\'waInbox\'"]')); });
  await page.waitForSelector('#v-waInbox .nxWaRow', { timeout: 15000 }); await sleep(2500);
}
async function abrirHilo(page, id, movil) {
  await cerrarCapas(page);
  await page.evaluate((id) => window.nxWaAbrirHilo(id), id);
  await page.waitForFunction(() => { const b = document.getElementById('nxWaMsgsBox'); return b && (b.querySelector('.nxWaBubWrap') || b.querySelector('.nxWaEmpty')) && !b.classList.contains('prep-bottom'); }, null, { timeout: 12000 }).catch(() => {});
  await sleep(2800);
}
async function conMenu(page, ctx, sel) {
  await page.evaluate(() => document.querySelectorAll('.nxWaMsgPro,.nxWaCtx').forEach(x => x.remove()));
  await page.evaluate(s => document.querySelector(s)?.scrollIntoView({ block: 'center' }), sel); await sleep(300);
  await page.evaluate(s => { const w = document.querySelector(s); if (!w) return; const r = w.getBoundingClientRect(); w.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 10 })); }, sel);
  await page.waitForSelector('.nxWaMsgPro [data-act="reply"]', { timeout: 4000 }).catch(() => {});
  await sleep(400);
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
      const { ctx, page, errs } = await abrir(browser, BASE, movil);
      await abrirInbox(page);
      ok(await page.evaluate(() => document.documentElement.classList.contains('tema-glass-oscuro')), `${tag} tema Glass oscuro activo`);

      // 1) lista con Archivados desplegados + panel «Bauches pendientes»
      await page.evaluate(() => { const a = document.querySelector('#v-waInbox .nxWaArchRow'); if (a && !a.classList.contains('abierto')) a.click(); });
      await sleep(600);
      const pend = await page.evaluate(() => ({ pend: document.querySelectorAll('#nxWaPendPanel .nxWaPend').length, arch: document.querySelectorAll('#v-waInbox .nxWaArchSec .nxWaRow').length, filas: document.querySelectorAll('#v-waInbox .nxWaRow').length }));
      ok(pend.pend === 2 && pend.arch === 1 && pend.filas >= 7, `${tag} lista: ${pend.filas} filas, ${pend.arch} archivada desplegada, ${pend.pend} bauches pendientes con Aplicar/Descartar`, pend);
      await page.screenshot({ path: OUT + `${PREFIJO}lista-${tag}.png`, fullPage: false });
      await medir(page, tag, 'lista');

      // 2) contactos (overlay de la lista)
      await clic(page, '#v-waInbox .nxWaVisualContactsBtn').catch(() => {}); await sleep(900);
      if (await page.$('#nxWaCtxOverlay.open')) { await page.screenshot({ path: OUT + `${PREFIJO}contactos-${tag}.png` }); await medir(page, tag, 'contactos', { raices: '#nxWaCtxOverlay' }); await page.evaluate(() => { document.querySelector('#nxWaCtxOverlay .nxWaCtxClose')?.click(); document.querySelectorAll('#nxWaCtxOverlay').forEach(x => x.classList.remove('open')); }); await sleep(400); }
      else ok(false, `${tag} no abrió la hoja de Contactos`);

      // 2b) bauches pendientes (hoja de visual-v5 con las tarjetas Aplicar / Descartar; el panel #nxWaPendPanel va oculto)
      await clic(page, '#v-waInbox .nxWaBauchesBtn').catch(() => {}); await sleep(900);
      const bau = await page.evaluate(() => { const o = document.querySelector('#nxWaCtxOverlay.open[data-panel="bauches"]'); return o ? { pend: o.querySelectorAll('.nxWaPend').length, aplicar: [...o.querySelectorAll('.nxWaPend button.primary')].map(b => b.textContent.trim()), descartar: o.querySelectorAll('.nxWaPend button:not(.primary)').length, sinCliente: !!o.querySelector('.nxWaPend span[style*="color"]'), img: [...o.querySelectorAll('.nxWaPend img')].every(i => i.naturalWidth > 0) } : null; });
      ok(bau && bau.pend === 2 && bau.aplicar.includes('Aplicar como pago') && bau.descartar === 2 && bau.sinCliente && bau.img, `${tag} bauches pendientes: hoja con 2 tarjetas, imagen real, Aplicar como pago / Descartar y «Sin cliente vinculado»`, bau);
      if (bau) { await page.screenshot({ path: OUT + `${PREFIJO}bauches-${tag}.png` }); await medir(page, tag, 'bauches', { raices: '#nxWaCtxOverlay' }); await page.evaluate(() => { document.querySelector('#nxWaCtxOverlay .nxWaCtxClose')?.click(); document.querySelectorAll('#nxWaCtxOverlay').forEach(x => x.classList.remove('open')); }); await sleep(400); }

      // 3) cada hilo
      const nombres = { 1: 'chat-mercedes-todo', 2: 'chat-ana-ventana-cerrada', 3: 'chat-bsid-sin-numero', 4: 'chat-wilson-sin-cliente', 5: 'chat-pedro-fijado', 6: 'chat-luisa-silenciado', 7: 'chat-rosa-archivado' };
      for (const k of Object.keys(nombres)) {
        await abrirHilo(page, H[k], movil);
        const info = await page.evaluate(() => { const box = document.getElementById('nxWaMsgsBox'); return { burbujas: box ? box.querySelectorAll('.nxWaBubWrap').length : -1, cerrada: !!document.querySelector('#v-waInbox .nxWaCerrada'), tpl: document.querySelectorAll('#v-waInbox .nxWaCerrada .nxWaTplBtn').length, head: document.querySelector('#v-waInbox .nxWaHeadName')?.textContent }; });
        if (k === '1') ok(info.burbujas === 24 + 24, `${tag} ${nombres[k]}: ${info.burbujas} burbujas (todos los tipos, sin el oculto)`, info);
        if (k === '2') ok(info.cerrada && info.tpl >= 1, `${tag} ${nombres[k]}: aviso de 24 h con botones de plantilla (${info.tpl})`, info);
        if (k === '3') ok(/Sin número|bsid/i.test(info.head || '') || info.head, `${tag} ${nombres[k]}: cabecera «${info.head}»`, info);
        await page.screenshot({ path: OUT + `${PREFIJO}${nombres[k]}-${tag}.png` });
        await medir(page, tag, nombres[k]);
        if (k === '1') {
          // capas de la conversación: ⋮ y sus ventanas, historial multimedia, destacados, clip, menú de mensaje, Info, reenviar, confirmación, visor
          const abrirMas = async () => { await cerrarCapas(page); await clic(page, '#v-waInbox .nxWaChatMoreBtn'); await sleep(600); };
          await abrirMas(); await page.screenshot({ path: OUT + `${PREFIJO}menu-mas-${tag}.png` }); await medir(page, tag, 'menu-mas', { raices: '.nxWaChatPop' });
          for (const [a, nom, raiz] of [['media', 'historial-multimedia', '.nxWaMhOv'], ['starred', 'destacados', '.nxWaModalOv'], ['wall', 'fondo-chat', '.nxWaModalOv'], ['contact', 'ficha-contacto', '.nxWaModalOv'], ['more', 'menu-mas-2', '.nxWaChatPop']]) {
            await abrirMas(); const hay = await page.$(`.nxWaMainMenu [data-a="${a}"]`); if (!hay) { ok(false, `${tag} ⋮ no tiene «${a}»`); continue; }
            await clic(page, `.nxWaMainMenu [data-a="${a}"]`); await sleep(a === 'media' ? 1800 : 900);
            if (!(await page.$(raiz))) { ok(false, `${tag} «${a}» no abrió ${raiz}`); continue; }
            await page.screenshot({ path: OUT + `${PREFIJO}${nom}-${tag}.png` }); await medir(page, tag, nom, { raices: raiz });
          }
          await abrirMas(); await clic(page, '.nxWaMainMenu [data-a="buscar"]'); await sleep(700);
          if (await page.$('#v-waInbox .nxWaChatSearch,#v-waInbox .nxWaSearchInChat,#v-waInbox [class*="nxWaChatSearch"]')) { await page.screenshot({ path: OUT + `${PREFIJO}buscar-en-chat-${tag}.png` }); await medir(page, tag, 'buscar-en-chat', { raices: '#v-waInbox .nxWaHead,#v-waInbox [class*="nxWaChatSearch"],#v-waInbox .nxWaSearchInChat' }); }
          await cerrarCapas(page);
          await clic(page, '#v-waInbox .nxWaComposer .nxWaIconBtn').catch(() => {}); await sleep(600);
          if (await page.$('.nxWaAttachPop')) { await page.screenshot({ path: OUT + `${PREFIJO}clip-${tag}.png` }); await medir(page, tag, 'clip', { raices: '.nxWaAttachPop' }); }
          await cerrarCapas(page);
          const idLeido = MSGS.find(m => m.hilo_id === H[1] && m.estado === 'leido' && m.direccion === 'out' && /balance pendiente/.test(m.cuerpo || '')).id;
          await conMenu(page, ctx, '#nxWaMsg-' + idLeido);
          if (await page.$('.nxWaMsgPro')) {
            await page.screenshot({ path: OUT + `${PREFIJO}menu-mensaje-${tag}.png` }); await medir(page, tag, 'menu-mensaje', { raices: '.nxWaMsgPro' });
            for (const [act, nom, raiz] of [['info', 'info-mensaje', '.nxWaModalOv'], ['forward', 'reenviar', '.nxWaModalOv'], ['hide', 'confirmar-borrar', '.nxWaConfirmOv,.nxWaModalOv'], ['react', 'reacciones', '.nxWaMsgPro']]) {
              await conMenu(page, ctx, '#nxWaMsg-' + idLeido); if (!(await page.$(`.nxWaMsgPro [data-act="${act}"]`))) continue;
              await clic(page, `.nxWaMsgPro [data-act="${act}"]`); await sleep(700);
              if (await page.$(raiz)) { await page.screenshot({ path: OUT + `${PREFIJO}${nom}-${tag}.png` }); await medir(page, tag, nom, { raices: raiz }); }
              await cerrarCapas(page);
            }
          }
          await page.evaluate(() => document.querySelector('#nxWaMsgsBox img.nxWaImg')?.scrollIntoView({ block: 'center' })); await sleep(300);
          await clic(page, '#nxWaMsgsBox img.nxWaImg').catch(() => {}); await sleep(700);
          if (await page.$('.nxWaLb')) { await page.screenshot({ path: OUT + `${PREFIJO}visor-${tag}.png` }); await medir(page, tag, 'visor', { raices: '.nxWaLb' }); }
          await cerrarCapas(page);
        }
        if (k === '2') {
          // plantillas: «Usar plantilla aprobada» y «Crear plantilla» (admin)
          const btns = await page.$$('#v-waInbox .nxWaCerrada .nxWaTplBtn');
          for (let i = 0; i < btns.length; i++) {
            await cerrarCapas(page);
            await page.evaluate((i) => document.querySelectorAll('#v-waInbox .nxWaCerrada .nxWaTplBtn')[i].click(), i); await sleep(1200);
            const raiz = await page.$('#nxWaTplOverlay,.nxWaTplOverlay,#nxWaNuevaPlantillaOverlay'); if (!raiz) { ok(false, `${tag} botón de plantilla ${i} no abrió ventana`); continue; }
            await page.screenshot({ path: OUT + `${PREFIJO}plantillas-${i}-${tag}.png` }); await medir(page, tag, 'plantillas-' + i, { raices: '#nxWaTplOverlay,.nxWaTplOverlay,#nxWaNuevaPlantillaOverlay' });
          }
          await cerrarCapas(page);
        }
        if (movil) { await page.evaluate(() => nxWaCerrarDetalleMob()); await sleep(700); }
      }
      ok(errs.length === 0, `${tag}: sin errores de consola`, errs.slice(0, 5));
      await ctx.close();
    }
    await browser.close();
  } catch (e) { console.error(e); fail++; }
  finally { try { mock.kill(); } catch (e) {} }
  fs.writeFileSync(OUT + PREFIJO + 'hallazgos.json', JSON.stringify({ fecha: new Date().toISOString(), hallazgos: HALLAZGOS }, null, 1));
  const md = ['# Legibilidad del Buzón de WhatsApp — Glass oscuro', '', `Fecha: ${new Date().toISOString()} · hallazgos: ${HALLAZGOS.length}`, '', '| Ancho | Contexto | Tipo | Elemento | Texto | Color | Fondo | Razón / lum | Tamaño |', '|---|---|---|---|---|---|---|---|---|',
    ...HALLAZGOS.map(h => `| ${h.tag} | ${h.contexto} | ${h.tipo} | \`${h.ruta}\` | ${(h.texto || '').replace(/\|/g, '\\|')} | ${h.color || ''} | ${h.fondo}${h.fondoClaro ? ` (${h.fondoOscuro}–${h.fondoClaro})` : ''} | ${h.tipo === 'contraste' ? `**${h.ratio}** / ${h.limite}` : `lum ${h.lum} · ${h.area} px² · ${h.propio}`} | ${h.fs ? h.fs + 'px ' + h.fw : ''} |`), ''].join('\n');
  fs.writeFileSync(OUT + PREFIJO + 'informe.md', md);
  console.log(`\nRESULTADO qa-whatsapp-legibilidad: ${pass} PASS · ${fail} FAIL · hallazgos ${HALLAZGOS.length} · informe ${OUT}${PREFIJO}informe.md`);
  process.exit(fail ? 1 : 0);
})();
