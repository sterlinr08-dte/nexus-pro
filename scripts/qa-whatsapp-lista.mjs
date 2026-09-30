// QA de la lista de chats del Buzón de WhatsApp «como el original» (58.94, 30-sep-2026): app real (index.html + cadena de
// parches) contra la REST simulada de scripts/qa-crm-mock-server.js, con hilos/mensajes de WhatsApp inyectados por
// page.route (Supabase real nunca se toca) y un SDK de Realtime simulado. A 390×844 (UA iPhone) y 1280×800:
//  · hora de la lista formato WhatsApp (hoy hh:mm a. m./p. m., Ayer, día de la semana, dd/mm/aa);
//  · vista previa con icono por tipo y ✓ / ✓✓ / ✓✓ azul / ! del último mensaje enviado; «Borrador:» en azul;
//  · fijados primero (📌), silenciados con 🔕, fila «Archivados (N)» que despliega la sección;
//  · menú por pulsación larga / clic derecho con acciones que llaman a las RPC (fijar, silenciar 8 h, no leído);
//  · deslizar a la izquierda archiva (RPC) sin interferir con el toque que abre el chat ni con el desplazamiento vertical;
//  · selector de emojis (abre, busca «gracias», inserta 🙏, cierra con Esc); borrador que sobrevive a recargar;
//  · aviso «escribiendo…» (Edge whatsapp-inbox-leer) UNA sola vez al teclear varias veces seguidas;
//  · contador «(N)» en el título con la pestaña sin foco; sonido/vibración solo para hilos no silenciados;
//  · polling de respaldo cuando el canal Realtime no queda SUBSCRIBED, y se apaga al recuperarlo;
//  · buscador de la lista sobre la Búsqueda premium (58.94): círculo ≤ 52 px con UNA lupa a la derecha de la campana; al
//    tocarlo el campo #nxWaVisualSearch queda enfocado y la píldora pasa del 60 % del ancho de la cabecera en < 600 ms;
//    escribir filtra las filas y con 3+ letras consulta whatsapp_hilo_mensajes (cuerpo=ilike); ✕ limpia y luego cierra;
//    Esc cierra; toque fuera cierra conservando el texto (punto de «búsqueda activa»); nxWaVisualClearSearch() limpia;
//  · cabecera de la lista en 1280 sin montarse; texto natural (sin mayúsculas forzadas); sin superficies claras;
//  · hilos sin las columnas nuevas (fijado_at/archivado_at/silenciado_hasta/ultimo_mensaje_*): sin errores y sin opciones huérfanas.
// Uso: PORT=8963 node scripts/qa-crm-mock-server.js &   PORT=8963 QA_OUT=/ruta node scripts/qa-whatsapp-lista.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8963);
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-whatsapp-lista')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const nWa = log => log.rpc.filter(x => /^whatsapp_/.test(x.fn)).length; // solo RPC del Buzón (la app también llama a mi_es_superadmin, etc.)
const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const hace = ms => new Date(Date.now() - ms).toISOString();
const H = 3600e3, D = 24 * H;

// ── Datos simulados ──
const ID = { mercedes: U(9001), juan: U(9002), ana: U(9003), pedro: U(9004), luisa: U(9005), wilson: U(9006), rosa: U(9007), miguel: U(9008) };
function hilos(conColumnas) {
  const base = (id, o) => ({ id, telefono_e164: o.tel, cliente_id: o.cli != null ? U(200 + o.cli) : null, nombre_perfil: o.nom, asignado_agente_id: null, ultimo_mensaje_at: o.at, ultimo_mensaje_preview: o.prev, ultimo_inbound_at: o.in || o.at, ultima_respuesta_humana_at: o.at, no_leidos_count: o.nl || 0, created_at: hace(400 * D), updated_at: o.at });
  const ext = (o, x) => conColumnas ? Object.assign(o, { fijado_at: null, archivado_at: null, silenciado_hasta: null, ultimo_mensaje_id: null, ultimo_mensaje_direccion: 'in', ultimo_mensaje_tipo: 'text', ultimo_mensaje_estado: null }, x) : o;
  return [
    ext(base(ID.mercedes, { tel: '+18098630085', cli: 0, nom: 'Mercedes Ortiz', at: hace(12 * 60e3), prev: 'Buenos días, ya hice la transferencia 🙏', nl: 2 }), {}),
    ext(base(ID.juan, { tel: '+18295550102', cli: 1, nom: 'Juan R.', at: hace(D), prev: 'Ok gracias', in: hace(20 * H) }), { ultimo_mensaje_direccion: 'out', ultimo_mensaje_estado: 'leido' }),
    ext(base(ID.ana, { tel: '+18495550103', cli: 2, nom: 'Ana Martinez', at: hace(3 * D), prev: 'Imagen', nl: 1 }), { ultimo_mensaje_tipo: 'imagen' }),
    ext(base(ID.pedro, { tel: '+18095550104', cli: 3, nom: 'Pedro S', at: hace(10 * D), prev: 'Hola NERY, tienes un balance pendiente.' }), { ultimo_mensaje_direccion: 'out', ultimo_mensaje_estado: 'entregado', fijado_at: hace(2 * D) }),
    ext(base(ID.luisa, { tel: '+18295550105', cli: 4, nom: 'Luisa F.', at: hace(20 * H), prev: '👍', nl: 1 }), { silenciado_hasta: 'infinity' }),
    ext(base(ID.wilson, { tel: '+18095550199', cli: null, nom: 'Wilson', at: hace(26 * H), prev: 'Cuánto cuesta el plan familiar?', nl: 3 }), { archivado_at: hace(5 * H) }),
    ext(base(ID.rosa, { tel: '+18495550107', cli: 6, nom: 'Rosa Jimenez', at: hace(50 * H), prev: 'Audio' }), { archivado_at: hace(4 * H), ultimo_mensaje_direccion: 'out', ultimo_mensaje_tipo: 'audio', ultimo_mensaje_estado: 'fallido' }),
    ext(base(ID.miguel, { tel: '+18095550108', cli: 7, nom: 'Miguel Torres', at: hace(2 * H), prev: 'Video' }), { ultimo_mensaje_direccion: 'out', ultimo_mensaje_tipo: 'video', ultimo_mensaje_estado: 'enviando' }),
  ];
}
const T = [
  ['out', 'Hola Mercedes, tienes un balance pendiente de RD$ 4,500.00 correspondiente a septiembre 2026.', 40 * H, 'leido'],
  ['in', 'Buenas tardes, no hay atraso, nada más se debe este mes verdad?', 32 * H],
  ['out', 'Así es, solo la cuota de septiembre.', 31 * H, 'leido'],
  ['in', 'Buenos días, ya hice la transferencia 🙏', 15 * 60e3],
  ['in', 'Me confirma cuando la vea por favor', 12 * 60e3],
];
const MSGS = T.map(([d, cuerpo, ms, estado], k) => ({ id: U(9100 + k), hilo_id: ID.mercedes, direccion: d, tipo_contenido: 'text', cuerpo, media_path: null, wa_message_id: 'w' + k, responde_a_id: null, estado: d === 'out' ? (estado || 'enviado') : 'recibido', error_detalle: null, enviado_por_agente_id: null, revision_pago_estado: null, abono_id: null, created_at: hace(ms), reaccion_agente: null }));
MSGS.push({ id: U(9200), hilo_id: ID.miguel, direccion: 'in', tipo_contenido: 'text', cuerpo: 'Le mando el comprobante secreto mañana', media_path: null, wa_message_id: 'w200', responde_a_id: null, estado: 'recibido', error_detalle: null, enviado_por_agente_id: null, revision_pago_estado: null, abono_id: null, created_at: hace(3 * H), reaccion_agente: null });
MSGS.push({ id: U(9201), hilo_id: ID.juan, direccion: 'out', tipo_contenido: 'text', cuerpo: 'Ok gracias', media_path: null, wa_message_id: 'w201', responde_a_id: null, estado: 'leido', error_detalle: null, enviado_por_agente_id: null, revision_pago_estado: null, abono_id: null, created_at: hace(D), reaccion_agente: null });
function mensajesRest(u) {
  const q = new URL(u).searchParams; let rows = MSGS.slice();
  for (const [k, v] of q.entries()) {
    let m = /^eq\.(.*)$/.exec(v); if (m) rows = rows.filter(r => String(r[k]) === m[1]);
    m = /^ilike\.(.*)$/.exec(v); if (m) { const re = new RegExp('^' + m[1].replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/%/g, '.*') + '$', 'i'); rows = rows.filter(r => re.test(String(r[k] || ''))); }
  }
  const order = (q.get('order') || 'created_at.asc').split(',')[0].split('.'); const col = order[0], desc = order.includes('desc');
  rows.sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (desc ? -1 : 1));
  const lim = Number(q.get('limit')); if (lim) rows = rows.slice(0, lim);
  const sel = q.get('select'); if (sel && sel !== '*') { const cols = sel.split(','); rows = rows.map(r => Object.fromEntries(cols.filter(c => c in r).map(c => [c, r[c]]))); }
  return rows;
}

// El simulador aplica el efecto de cada RPC sobre los hilos, como haría el servidor (el siguiente refresco lo trae).
function aplicarRpc(HILOS, fn, b) {
  const h = HILOS.find(x => x.id === b?.p_hilo_id); if (!h) return;
  if (fn === 'whatsapp_hilo_fijar') h.fijado_at = b.p_fijar ? new Date().toISOString() : null;
  if (fn === 'whatsapp_hilo_archivar') h.archivado_at = b.p_archivar ? new Date().toISOString() : null;
  if (fn === 'whatsapp_hilo_silenciar') h.silenciado_hasta = b.p_hasta || null;
  if (fn === 'whatsapp_marcar_hilo_no_leido') h.no_leidos_count = Math.max(1, h.no_leidos_count || 0);
  if (fn === 'whatsapp_marcar_hilo_leido') h.no_leidos_count = 0;
}
async function abrir(browser, { movil, conColumnas = true, ctx: ctxPrevio = null }) {
  const iph = devices['iPhone 13'];
  const ctx = ctxPrevio || await browser.newContext(movil
    ? { ...iph, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [], log = { rpc: [], hilosGet: 0, msgs: [], edge: [] };
  const HILOS = hilos(conColumnas);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url(), req = r.request();
    if (/\/rest\/v1\/rpc\//.test(u)) { let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {} const fn = u.replace(/^.*\/rpc\//, '').split('?')[0]; log.rpc.push({ fn, b }); aplicarRpc(HILOS, fn, b); return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }); }
    if (/\/functions\/v1\/whatsapp-inbox-leer/.test(u)) { let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {} log.edge.push(b); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    if (/\/functions\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
    if (/whatsapp_hilo_mensajes/.test(u)) { log.msgs.push(u.replace(/^.*rest\/v1\//, '')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mensajesRest(u)) }); }
    if (/whatsapp_hilos/.test(u)) { log.hilosGet++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HILOS) }); }
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    if (TABLER && /tabler-icons\.min\.css/.test(u)) return r.fulfill({ path: path.join(TABLER, 'tabler-icons.min.css'), contentType: 'text/css' });
    if (TABLER && /tabler-icons\.woff2/.test(u)) return r.fulfill({ path: path.join(TABLER, 'fonts', 'tabler-icons.woff2'), contentType: 'font/woff2' });
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  if (!ctxPrevio) await ctx.addInitScript(() => {
    localStorage.setItem('nx_tema', 'glass-oscuro'); localStorage.removeItem('nx_tgo_off');
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    window.NX_WA_POLL_MS = 1500;
    // SDK de Realtime simulado: el canal nunca queda SUBSCRIBED (CHANNEL_ERROR) y permite disparar eventos.
    window.__fakeRt = { handlers: [], status: null };
    window.supabase = { createClient() { return { realtime: { setAuth: async () => {} }, channel() { const ch = { on(ev, f, cb) { window.__fakeRt.handlers.push({ f, cb }); return ch; }, subscribe(cb) { window.__fakeRt.status = cb; setTimeout(() => cb('CHANNEL_ERROR'), 150); return ch; } }; return ch; } }; } };
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 30000 });
  await page.waitForFunction(() => !document.getElementById('nxSplash') || getComputedStyle(document.getElementById('nxSplash')).opacity === '0', null, { timeout: 8000 }).catch(() => {});
  await sleep(2000);
  return { ctx, page, errs, log, HILOS };
}
async function irBuzon(page) {
  await page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('waInbox', document.querySelector('#sbEl .ni[onclick^="nav(\'waInbox\'"]')); });
  await page.waitForSelector('#nxWaLista .nxWaRow', { timeout: 15000 }).catch(() => {});
  await sleep(1200);
}
const caja = (page, id) => page.evaluate(id => document.querySelector(`#nxWaLista .nxWaRow[data-hilo="${id}"]`)?.getBoundingClientRect().toJSON() || null, id);
const infoFila = (page, id) => page.evaluate(id => { const r = document.querySelector(`#nxWaLista .nxWaRow[data-hilo="${id}"]`); if (!r) return null; const cs = getComputedStyle(r.querySelector('.nxWaWho b')); return { cls: r.className, hora: r.querySelector('.nxWaTime')?.textContent.trim(), prev: r.querySelector('.nxWaWho span')?.innerHTML, prevTxt: r.querySelector('.nxWaWho span')?.textContent.trim(), nombre: r.querySelector('.nxWaWho b')?.textContent.trim(), tag: r.querySelector('.nxWaTag')?.textContent.trim(), tagTT: getComputedStyle(r.querySelector('.nxWaTag')).textTransform, ttB: cs.textTransform, pesoB: +cs.fontWeight, horaColor: getComputedStyle(r.querySelector('.nxWaTime')).color, icos: [...r.querySelectorAll('.nxWaRowIcos i')].map(i => i.className), badge: r.querySelector('.nxWaBadge')?.textContent, enArch: !!r.closest('.nxWaArchSec'), visible: r.style.display !== 'none', rect: r.getBoundingClientRect().toJSON() }; }, id);
const orden = page => page.evaluate(() => [...document.querySelectorAll('#nxWaLista .nxWaRow')].filter(r => !r.closest('.nxWaArchSec')).map(r => r.dataset.hilo));
const claras = page => page.evaluate(() => { const lum = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); if (p.length > 3 && p[3] < .5) return null; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(p[0]) + .7152 * f(p[1]) + .0722 * f(p[2]); }; const out = []; document.querySelectorAll('#v-waInbox *, .nxWaListMenu, .nxWaListMenu *, .nxWaEmojiPanel, .nxWaEmojiPanel *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width * b.height < 1500 || b.bottom < 0 || b.top > innerHeight) return; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return; const l = lum(cs.backgroundColor); if (l != null && l > .5) out.push(el.tagName + '.' + String(el.className).slice(0, 40) + ' ' + cs.backgroundColor); }); return out; });
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const RE_HORA = /^\d{1,2}:\d{2} [ap]\. ?m\.$/;

async function touch(ctx, page, pts, { esperaEntre = 30, holdMs = 0 } = {}) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
  if (holdMs) await sleep(holdMs);
  for (let i = 1; i < pts.length; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pts[i]] }); await sleep(esperaEntre); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach().catch(() => {});
}

async function suite(browser, movil) {
  const tag = movil ? '390' : '1280';
  const { ctx, page, errs, log } = await abrir(browser, { movil });
  await page.evaluate(id => localStorage.setItem('nxWaBorrador:' + id, 'Hola, te escribo por la póliza'), ID.juan);
  await irBuzon(page);
  if (movil) { await page.evaluate(() => { const c = document.querySelector('.content'); if (c) c.scrollTo(0, 0); }); await sleep(200); await page.screenshot({ path: OUT + 'inbox-390-arriba.png' }); await page.evaluate(() => document.querySelector('#nxWaLista')?.scrollIntoView({ block: 'start' })); await sleep(400); }
  await page.screenshot({ path: OUT + `inbox-${tag}.png` });

  // A. hora formato WhatsApp
  const fm = await infoFila(page, ID.mercedes), fj = await infoFila(page, ID.juan), fa = await infoFila(page, ID.ana), fp = await infoFila(page, ID.pedro), fl = await infoFila(page, ID.luisa), fmi = await infoFila(page, ID.miguel);
  ok(fm && RE_HORA.test(fm.hora), `${tag} A: hoy → hora 12 h («${fm?.hora}»)`, fm);
  ok(fj && fj.hora === 'Ayer', `${tag} A: ayer → «Ayer» («${fj?.hora}»)`);
  ok(fa && DIAS.includes(fa.hora), `${tag} A: hace 3 días → día de la semana («${fa?.hora}»)`);
  ok(fp && /^\d{2}\/\d{2}\/\d{2}$/.test(fp.hora), `${tag} A: hace 10 días → dd/mm/aa («${fp?.hora}»)`);
  // B. vista previa
  ok(fa && /ti-camera/.test(fa.prev) && /Foto/.test(fa.prevTxt), `${tag} B: imagen → icono cámara + «Foto»`, fa?.prev);
  ok(fmi && /ti-video/.test(fmi.prev) && /nxWaPrevTick ti-clock|ti-clock nxWaPrevTick/.test(fmi.prev) && /Video/.test(fmi.prevTxt), `${tag} B: video enviándose → ○ + icono video`, fmi?.prev);
  ok(fp && /ti-checks nxWaPrevTick(?! leido)/.test(fp.prev), `${tag} B: entregado → ✓✓ gris`, fp?.prev);
  ok(fm && !/nxWaPrevTick/.test(fm.prev) && /transferencia/.test(fm.prevTxt), `${tag} B: entrante sin ✓ y texto natural`, fm?.prev);
  ok(fm && /nxWaUnread/.test(fm.cls) && fm.pesoB >= 700 && /rgb\((96, 165, 250|37, 99, 235)\)/.test(fm.horaColor), `${tag} B: no leídos → nombre en negrita y hora azul`, { cls: fm?.cls, peso: fm?.pesoB, color: fm?.horaColor });
  ok(fp && fp.pesoB < 700, `${tag} B: leído → nombre sin negrita (${fp?.pesoB})`);
  ok(fm && fm.ttB === 'none' && fm.tagTT === 'none' && fm.nombre === 'Maria Perez', `${tag} J: texto natural en nombre y etiqueta («${fm?.nombre}» / «${fm?.tag}»)`);
  const tags = await page.evaluate(() => [...document.querySelectorAll('#nxWaLista .nxWaTag')].map(t => t.textContent.trim()));
  ok(tags.every(t => /^[A-ZÁÉÍÓÚ0-9][^A-ZÁÉÍÓÚ]*$/.test(t)), `${tag} J: etiquetas en Title Case`, tags);
  const cap = await page.evaluate(() => { const b = document.querySelector('#v-waInbox .nxWaListCaption b'), s = document.querySelector('#v-waInbox .nxWaListCount'); return { b: b?.textContent, ttb: b && getComputedStyle(b).textTransform, s: s?.textContent, tts: s && getComputedStyle(s).textTransform }; });
  ok(cap.ttb === 'none' && cap.tts === 'none', `${tag} J: cabecera «Conversaciones» sin mayúsculas forzadas`, cap);
  // E. borrador en la fila
  ok(fj && /Borrador:/.test(fj.prevTxt) && /nxWaPrevDraft/.test(fj.prev) && /te escribo/.test(fj.prevTxt), `${tag} E: fila con borrador → «Borrador: …»`, fj?.prev);
  // C. orden, fijados, silenciados, archivados
  const ord = await orden(page);
  ok(ord[0] === ID.pedro && ord[1] === ID.mercedes, `${tag} C: fijado primero, luego por último mensaje`, ord);
  ok(fp && /nxWaPinned/.test(fp.cls) && fp.icos.some(c => /ti-pin/.test(c)), `${tag} C: fila fijada con icono pin`, fp?.icos);
  ok(fl && /nxWaMuted/.test(fl.cls) && fl.icos.some(c => /ti-bell-off/.test(c)), `${tag} C: fila silenciada con icono campana tachada`, fl?.icos);
  ok(!ord.includes(ID.wilson) && !ord.includes(ID.rosa), `${tag} C: archivados fuera de la lista principal`, ord);
  const arch = await page.evaluate(() => { const r = document.querySelector('#nxWaLista .nxWaArchRow'); return r ? { txt: r.textContent.replace(/\s+/g, ' ').trim(), n: r.querySelector('.nxWaArchCount')?.textContent, primero: r === document.querySelector('#nxWaLista').firstElementChild } : null; });
  ok(arch && arch.n === '2' && /Archivados/.test(arch.txt) && arch.primero, `${tag} C: fila «Archivados (2)» arriba`, arch);
  await page.click('#nxWaLista .nxWaArchRow'); await sleep(400);
  const archSec = await page.evaluate(() => [...document.querySelectorAll('#nxWaLista .nxWaArchSec .nxWaRow')].map(r => r.dataset.hilo));
  ok(archSec.length === 2 && archSec.includes(ID.wilson) && archSec.includes(ID.rosa), `${tag} C: la sección Archivados despliega los 2 chats`, archSec);
  const fr = await infoFila(page, ID.rosa);
  ok(fr && /ti-alert-circle nxWaPrevTick fallido/.test(fr.prev) && /ti-microphone/.test(fr.prev) && /Audio/.test(fr.prevTxt), `${tag} B: fallido → ! rojo + icono audio`, fr?.prev);
  if (movil) await page.screenshot({ path: OUT + 'archivados-390.png' });
  await page.click('#nxWaLista .nxWaArchRow'); await sleep(300);
  ok(await page.evaluate(() => !document.querySelector('#nxWaLista .nxWaArchSec')), `${tag} C: la sección Archivados se pliega`);

  // C. menú por pulsación larga (móvil) / clic derecho (escritorio)
  let b = await caja(page, ID.ana);
  if (movil) await touch(ctx, page, [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }], { holdMs: 750 });
  else await page.click(`#nxWaLista .nxWaRow[data-hilo="${ID.ana}"]`, { button: 'right' });
  await sleep(300);
  let menu = await page.evaluate(() => { const m = document.querySelector('.nxWaListMenu'); if (!m) return null; const rc = m.getBoundingClientRect(); return { items: [...m.querySelectorAll('button')].map(x => x.textContent.trim()), bg: getComputedStyle(m).backgroundColor, dentro: rc.left >= 0 && rc.right <= innerWidth && rc.top >= 0 && rc.bottom <= innerHeight, chatAbierto: !!document.querySelector('#v-waInbox.nxWaChatOpen') || !!document.querySelector('#nxWaMsgsBox') }; });
  ok(menu && menu.items.join('|') === 'Fijar chat|Silenciar notificaciones|Archivar chat|Marcar como leído', `${tag} C: menú de la fila con Fijar / Silenciar / Archivar / Marcar como leído`, menu);
  ok(menu && /rgba?\(14, 28, 52/.test(menu.bg) && menu.dentro && !menu.chatAbierto, `${tag} C: menú oscuro, dentro de pantalla y sin abrir el chat`, menu);
  if (movil) await page.screenshot({ path: OUT + 'menu-fila-390.png' });
  await page.click('.nxWaListMenu [data-k="fijar"]'); await sleep(400);
  ok(log.rpc.some(x => x.fn === 'whatsapp_hilo_fijar' && x.b?.p_hilo_id === ID.ana && x.b?.p_fijar === true), `${tag} C: «Fijar chat» llama a rpc/whatsapp_hilo_fijar`, log.rpc);
  const ord2 = await orden(page);
  ok(ord2[0] === ID.ana && /nxWaPinned/.test((await infoFila(page, ID.ana)).cls), `${tag} C: el chat fijado sube al principio`, ord2);
  // silenciar (submenú) y marcar no leído
  b = await caja(page, ID.pedro);
  if (movil) await touch(ctx, page, [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }], { holdMs: 750 }); else await page.click(`#nxWaLista .nxWaRow[data-hilo="${ID.pedro}"]`, { button: 'right' });
  await sleep(250);
  await page.click('.nxWaListMenu [data-k="silenciar"]'); await sleep(150);
  const sub = await page.evaluate(() => [...document.querySelectorAll('.nxWaListMenu button')].map(x => x.textContent.trim()));
  ok(sub.join('|') === '8 horas|1 semana|Siempre|Volver', `${tag} C: submenú Silenciar 8 h / 1 semana / Siempre`, sub);
  await page.click('.nxWaListMenu [data-k="sil_8h"]'); await sleep(400);
  const sil = log.rpc.find(x => x.fn === 'whatsapp_hilo_silenciar');
  ok(sil && sil.b?.p_hilo_id === ID.pedro && sil.b?.p_hasta && Math.abs(new Date(sil.b.p_hasta) - Date.now() - 8 * H) < 60e3, `${tag} C: «8 horas» llama a rpc/whatsapp_hilo_silenciar con p_hasta +8 h`, sil);
  ok((await infoFila(page, ID.pedro)).icos.some(c => /ti-bell-off/.test(c)), `${tag} C: la fila silenciada muestra la campana tachada`);
  b = await caja(page, ID.juan);
  if (movil) await touch(ctx, page, [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }], { holdMs: 750 }); else await page.click(`#nxWaLista .nxWaRow[data-hilo="${ID.juan}"]`, { button: 'right' });
  await sleep(250);
  await page.click('.nxWaListMenu [data-k="no_leido"]'); await sleep(400);
  ok(log.rpc.some(x => x.fn === 'whatsapp_marcar_hilo_no_leido' && x.b?.p_hilo_id === ID.juan), `${tag} C: «Marcar como no leído» llama a rpc/whatsapp_marcar_hilo_no_leido`);
  ok(/nxWaUnread/.test((await infoFila(page, ID.juan)).cls), `${tag} C: la fila pasa a no leída`);
  await page.keyboard.press('Escape');
  ok(await page.evaluate(() => !document.querySelector('.nxWaListMenu')), `${tag} C: el menú se cierra`);

  // F. título con contador y notificación sonora
  await page.evaluate(() => { Object.defineProperty(document, 'hasFocus', { value: () => false, configurable: true }); window.nxWaTituloBadge(); });
  const esperados = await page.evaluate(() => [...document.querySelectorAll('#nxWaLista .nxWaRow')].filter(r => !r.closest('.nxWaArchSec') && r.querySelector('.nxWaBadge') && !r.classList.contains('nxWaMuted')).length);
  let titulo = await page.title();
  ok(esperados > 0 && titulo.startsWith('(' + esperados + ') '), `${tag} F: título «(${esperados}) …» con la pestaña sin foco («${titulo.slice(0, 30)}»)`);
  await page.evaluate(() => { Object.defineProperty(document, 'hasFocus', { value: () => true, configurable: true }); window.nxWaTituloBadge(); });
  titulo = await page.title();
  ok(!/^\(\d+\)/.test(titulo), `${tag} F: título sin contador con la pestaña enfocada`);
  const dispara = (hiloId) => page.evaluate(hiloId => { window.__fakeRt.handlers.filter(h => h.f.table === 'whatsapp_hilo_mensajes').forEach(h => h.cb({ eventType: 'INSERT', new: { id: 'x' + Math.random(), hilo_id: hiloId, direccion: 'in', tipo_contenido: 'text', cuerpo: 'nuevo', created_at: new Date().toISOString() } })); }, hiloId);
  const n0 = await page.evaluate(() => window.__nxWaNotif.sonidos);
  await dispara(ID.mercedes); await sleep(150);
  const n1 = await page.evaluate(() => window.__nxWaNotif.sonidos);
  ok(n1 === n0 + 1, `${tag} F: mensaje entrante → suena (${n0} → ${n1})`);
  await dispara(ID.luisa); await sleep(150);
  ok((await page.evaluate(() => window.__nxWaNotif.sonidos)) === n1, `${tag} F: hilo silenciado → sin sonido`);
  await page.evaluate(() => localStorage.setItem('nxWaSonido', '0'));
  await dispara(ID.mercedes); await sleep(150);
  ok((await page.evaluate(() => window.__nxWaNotif.sonidos)) === n1, `${tag} F: preferencia nxWaSonido=0 → sin sonido`);
  await page.evaluate(() => localStorage.setItem('nxWaSonido', '1'));
  const st = await page.evaluate(() => { const b = document.querySelector('#v-waInbox .nxWaSoundToggle'); return b ? { vis: getComputedStyle(b).display !== 'none', off: b.classList.contains('off') } : null; });
  ok(st && st.vis, `${tag} F: interruptor de sonido en la cabecera de la lista`, st);

  // G. polling de respaldo
  const rt = await page.evaluate(() => window.nxWaEstadoRealtime());
  const g0 = log.hilosGet; await sleep(3600); const g1 = log.hilosGet;
  ok(rt.estado === 'CHANNEL_ERROR' && rt.polling && g1 - g0 >= 2, `${tag} G: canal sin suscribir → polling activo (${g1 - g0} recargas en 3,6 s)`, rt);
  await page.evaluate(() => window.__fakeRt.status('SUBSCRIBED')); await sleep(200);
  const rt2 = await page.evaluate(() => window.nxWaEstadoRealtime());
  const g2 = log.hilosGet; await sleep(2200);
  ok(rt2.estado === 'SUBSCRIBED' && !rt2.polling && log.hilosGet - g2 === 0, `${tag} G: al suscribir el canal se detiene el polling`, rt2);

  // H. buscador de la lista = Búsqueda premium (círculo → píldora) + búsqueda por contenido de mensajes
  await page.evaluate(() => document.querySelector('#v-waInbox .nxWaListCol')?.scrollIntoView({ block: 'start' })); await sleep(300);
  const filasVis = () => page.evaluate(() => [...document.querySelectorAll('#nxWaLista .nxWaRow')].filter(r => r.style.display !== 'none').length);
  const medir = () => page.evaluate(() => {
    const tools = document.querySelector('#v-waInbox .nxWaListTools'), m = tools && tools.querySelector('.nxbp-marco'), inp = document.getElementById('nxWaVisualSearch'); if (!tools || !m || !inp) return null;
    const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const mr = m.getBoundingClientRect(), tr = tools.getBoundingClientRect(), cap = tools.querySelector('.nxWaListCaption'), bell = tools.querySelector('.nxWaSoundToggle'), lupa = m.querySelector('.nxBusca-lupa'), caja = m.querySelector('.nxBusca'), c = cap.getBoundingClientRect(), b = bell.getBoundingClientRect();
    return { w: Math.round(mr.width), h: Math.round(mr.height), toolsW: tools.clientWidth, abierto: m.classList.contains('open'), conTexto: m.classList.contains('nxbp-con-texto'), dentro: m.contains(inp), toggleEnMarco: !!m.querySelector('.nxWaSearchToggle.nxBusca-lupa'), lupasVisibles: [...tools.querySelectorAll('i.ti-search')].filter(i => vis(i.closest('button,label') || i)).length, lupasDom: tools.querySelectorAll('.nxBusca-lupa').length, foco: document.activeElement === inp, focoLupa: document.activeElement === lupa, expanded: lupa?.getAttribute('aria-expanded'), bg: getComputedStyle(caja).backgroundColor, borde: getComputedStyle(caja).borderTopColor, lupaColor: getComputedStyle(lupa).color, captionVis: vis(cap), bellVis: vis(bell), captionDesv: cap.classList.contains('nxbp-desvanecido'), solapa: !(c.right <= mr.left || mr.right <= c.left || c.bottom <= mr.top || mr.bottom <= c.top), derechaDeCampana: mr.left >= b.right - 1, enCabecera: mr.top >= tr.top - 1 && mr.bottom <= tr.bottom + 1 && mr.left >= tr.left - 1 && mr.right <= tr.right + 1, labelOculto: getComputedStyle(tools.querySelector('.nxWaSearch')).display === 'none', valor: inp.value, bCabe: cap.querySelector('b').scrollWidth <= cap.querySelector('b').clientWidth + 1 };
  });
  const esperar = async (cond, lim = 600) => { const t0 = Date.now(); let m; do { m = await medir(); if (m && cond(m)) return { ms: Date.now() - t0, m }; await sleep(30); } while (Date.now() - t0 < lim); return { ms: Date.now() - t0, m }; };
  let m0 = await medir();
  ok(m0 && !m0.abierto && m0.w <= 52 && m0.w >= 40 && m0.h <= 52 && m0.dentro && m0.toggleEnMarco && m0.expanded === 'false', `${tag} H: cerrado = círculo ≤ 52 px (${m0?.w}×${m0?.h}) con la lupa de visual-v4 dentro del marco premium`, m0);
  ok(m0 && m0.lupasVisibles === 1 && m0.lupasDom === 1 && m0.labelOculto, `${tag} H: una sola lupa en la cabecera (el campo viejo .nxWaSearch queda oculto)`, m0);
  ok(m0 && m0.captionVis && m0.bellVis && !m0.solapa && m0.derechaDeCampana && m0.enCabecera && m0.bCabe, `${tag} H: círculo a la derecha de la campana, dentro de la cabecera, sin montarse sobre «Conversaciones»`, m0);
  ok(m0 && /rgba?\(14, 28, 52/.test(m0.bg) && /rgb\(37, 99, 235\)/.test(m0.borde) && /rgb\(37, 99, 235\)/.test(m0.lupaColor), `${tag} H: paleta azul del Buzón (cristal rgba(14,28,52,.82), acento #2563EB) sin heredar el fondo/borde de .nxWaSearch`, m0);
  await page.screenshot({ path: OUT + `inbox-${tag}-cerrado.png` });
  const nF0 = await filasVis();
  await page.click('#v-waInbox .nxWaListTools .nxBusca-lupa', { noWaitAfter: true });
  let ab = await esperar(m => m.abierto && m.w > 0.6 * m.toolsW);
  ok(ab.m && ab.m.abierto && ab.m.w > 0.6 * ab.m.toolsW && ab.ms < 600, `${tag} H: al tocar, la píldora pasa del 60 % del ancho de la cabecera en ${ab.ms} ms (${ab.m?.w}/${ab.m?.toolsW})`, ab.m);
  ok(ab.m && ab.m.foco && ab.m.expanded === 'true' && ab.m.captionDesv && ab.m.enCabecera, `${tag} H: el campo queda enfocado, aria-expanded=true y el título se desvanece bajo la píldora`, ab.m);
  await sleep(500); await page.screenshot({ path: OUT + `inbox-${tag}-abierto.png` });
  await page.keyboard.type('secreto'); await sleep(900);
  const bus = await page.evaluate(() => ({ vis: [...document.querySelectorAll('#nxWaLista .nxWaRow')].filter(r => r.style.display !== 'none').map(r => r.dataset.hilo), hit: [...document.querySelectorAll('#nxWaLista .nxWaRow.nxWaHitMsg')].map(r => r.dataset.hilo), marca: (r => r && getComputedStyle(r.querySelector('.nxWaWho b'), ':after').content)(document.querySelector('#nxWaLista .nxWaRow.nxWaHitMsg')) }));
  ok(nF0 > 1 && bus.vis.length === 1 && bus.vis[0] === ID.miguel && bus.hit[0] === ID.miguel && /en mensajes/.test(bus.marca), `${tag} H: escribir filtra (${nF0} → ${bus.vis.length}) y «secreto» encuentra el chat por contenido, marcado «en mensajes»`, bus);
  ok(log.msgs.some(u => /cuerpo=ilike\.\*secreto\*/.test(u) && /select=hilo_id/.test(u)), `${tag} H: consulta whatsapp_hilo_mensajes?cuerpo=ilike.*secreto*&select=hilo_id`, log.msgs.slice(-3));
  const m1 = await medir();
  ok(m1 && m1.abierto && m1.captionVis && m1.bellVis, `${tag} H: al escribir, la cabecera no pierde el título ni la campana (plegado de visual-v4 neutralizado)`, m1);
  await page.click('#v-waInbox .nxWaListTools .nxBusca-x', { noWaitAfter: true }); await sleep(250);
  const m2 = await medir(), nF2 = await filasVis();
  ok(m2 && m2.valor === '' && m2.abierto && m2.foco && nF2 === nF0, `${tag} H: ✕ limpia el texto (filas ${nF2}/${nF0}) y sigue abierta y enfocada`, m2);
  await page.click('#v-waInbox .nxWaListTools .nxBusca-x', { noWaitAfter: true });
  let ce = await esperar(m => !m.abierto && m.w <= 52, 900);
  ok(ce.m && !ce.m.abierto && ce.m.w <= 52 && ce.m.captionVis && ce.m.bellVis, `${tag} H: ✕ con el campo vacío cierra (círculo de ${ce.m?.w} px en ${ce.ms} ms)`, ce.m);
  await page.click('#v-waInbox .nxWaListTools .nxBusca-lupa', { noWaitAfter: true });
  ab = await esperar(m => m.abierto && m.w > 0.6 * m.toolsW);
  await page.keyboard.press('Escape');
  ce = await esperar(m => !m.abierto && m.w <= 52, 900);
  ok(ab.m?.abierto && ce.m && !ce.m.abierto && ce.m.w <= 52 && ce.m.focoLupa, `${tag} H: Esc cierra y devuelve el foco a la lupa`, ce.m);
  await page.click('#v-waInbox .nxWaListTools .nxBusca-lupa', { noWaitAfter: true });
  ab = await esperar(m => m.abierto && m.w > 0.6 * m.toolsW);
  await page.keyboard.type('luisa'); await sleep(700);
  const nLuisa = await filasVis();
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));   // toque fuera
  ce = await esperar(m => !m.abierto && m.w <= 52, 900);
  ok(ab.m?.abierto && nLuisa === 1 && ce.m && !ce.m.abierto && ce.m.conTexto && ce.m.valor === 'luisa' && (await filasVis()) === 1, `${tag} H: toque fuera cierra conservando «luisa» (1 fila) con el punto de búsqueda activa`, ce.m);
  await page.screenshot({ path: OUT + `inbox-${tag}-filtro-activo.png` });
  await page.evaluate(() => nxWaVisualClearSearch()); await sleep(200);
  const m3 = await medir();
  ok(m3 && m3.valor === '' && !m3.conTexto && !m3.abierto && (await filasVis()) === nF0, `${tag} H: nxWaVisualClearSearch() sigue limpiando (filas ${nF0}) y apaga el punto`, m3);
  ok(m3 && m3.lupasVisibles === 1 && m3.lupasDom === 1, `${tag} H: sigue habiendo una sola lupa tras abrir/cerrar varias veces`, m3);

  // I. cabecera de la lista (1280): título en su sitio, sin lupa duplicada ni barra de búsqueda de segunda fila
  if (!movil) {
    const cab2 = await medir();
    ok(cab2 && !cab2.solapa && cab2.bCabe && cab2.labelOculto && cab2.lupasVisibles === 1 && cab2.enCabecera, `1280 I: «Conversaciones» y el círculo del buscador no se montan; sin lupa duplicada; sin barra vieja de segunda fila`, cab2);
  }

  // C. deslizar en móvil: archivar; toque abre; desplazamiento vertical no archiva
  if (movil) {
    b = await caja(page, ID.mercedes);
    const y = b.y + b.height / 2, x0 = b.x + b.width - 30;
    const rpcAntes = log.rpc.length;
    await touch(ctx, page, [0, 20, 50, 90, 130, 160].map(d => ({ x: x0 - d, y })), { esperaEntre: 40 });
    await sleep(500);
    const ar = log.rpc.slice(rpcAntes).find(x => x.fn === 'whatsapp_hilo_archivar');
    ok(ar && ar.b?.p_hilo_id === ID.mercedes && ar.b?.p_archivar === true, `390 C: deslizar a la izquierda archiva (rpc/whatsapp_hilo_archivar)`, log.rpc.slice(rpcAntes));
    const arch3 = await page.evaluate(() => ({ n: document.querySelector('#nxWaLista .nxWaArchCount')?.textContent, chat: document.querySelector('#v-waInbox').classList.contains('nxWaChatOpen') }));
    ok(arch3.n === '3' && !arch3.chat, `390 C: pasa a Archivados (3) sin abrir el chat`, arch3);
    b = await caja(page, ID.ana);
    const rpcV = nWa(log);
    await touch(ctx, page, [0, 15, 40, 80, 120].map(d => ({ x: b.x + 120, y: b.y + b.height / 2 + d })), { esperaEntre: 40 });
    await sleep(400);
    ok(nWa(log) === rpcV && !(await page.evaluate(() => document.querySelector('#v-waInbox').classList.contains('nxWaChatOpen'))), `390 C: arrastre vertical no archiva ni abre`);
    b = await caja(page, ID.juan);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(1500);
    ok(await page.evaluate(() => document.querySelector('#v-waInbox').classList.contains('nxWaChatOpen') && !!document.getElementById('nxWaTexto')), `390 C: un toque normal abre el chat`);
  } else {
    await page.click(`#nxWaLista .nxWaRow[data-hilo="${ID.juan}"]`); await sleep(1500);
    ok(await page.evaluate(() => !!document.getElementById('nxWaTexto')), `1280: clic abre el chat`);
  }

  // E. borrador restaurado al abrir + D. emoji picker + escribiendo…
  const val0 = await page.evaluate(() => document.getElementById('nxWaTexto')?.value);
  ok(val0 === 'Hola, te escribo por la póliza', `${tag} E: el borrador se restaura al abrir el chat («${val0}»)`);
  await page.click('#v-waInbox .nxWaRefEmoji'); await sleep(400);
  let em = await page.evaluate(() => { const p = document.querySelector('.nxWaEmojiPanel'); if (!p) return null; const rc = p.getBoundingClientRect(); return { cats: p.querySelectorAll('.cats button').length, botones: p.querySelectorAll('.grid [data-e]').length, bg: getComputedStyle(p).backgroundColor, w: rc.width, dentro: rc.left >= 0 && rc.right <= innerWidth + 1 && rc.bottom <= innerHeight + 1, abajo: p.classList.contains('abajo') }; });
  ok(em && em.cats === 6 && em.botones > 50 && /rgba?\(14, 28, 52/.test(em.bg) && em.dentro, `${tag} D: selector de emojis oscuro con 6 categorías`, em);
  if (movil) ok(em && em.abajo && Math.round(em.w) === 390, `390 D: en móvil ocupa todo el ancho al pie`, em);
  await page.fill('.nxWaEmojiPanel input', 'gracias'); await sleep(150);
  em = await page.evaluate(() => [...document.querySelectorAll('.nxWaEmojiPanel .grid [data-e]')].map(b => b.dataset.e));
  ok(em.includes('🙏') && em.length < 10, `${tag} D: búsqueda «gracias» → 🙏`, em);
  if (movil) await page.screenshot({ path: OUT + 'emoji-390.png' });
  await page.click('.nxWaEmojiPanel [data-e="🙏"]'); await sleep(200);
  const val1 = await page.evaluate(() => document.getElementById('nxWaTexto')?.value);
  ok(val1 === 'Hola, te escribo por la póliza🙏', `${tag} D: inserta el emoji en el cursor («${val1}»)`);
  ok((await page.evaluate(() => JSON.parse(localStorage.getItem('nxWaEmojiRecientes') || '[]')))[0] === '🙏', `${tag} D: queda en Recientes`);
  if (movil) { ok(await page.evaluate(() => !!document.querySelector('.nxWaEmojiPanel')), `390 D: en móvil el panel sigue abierto tras insertar`); await page.keyboard.press('Escape'); await sleep(150); }
  ok(await page.evaluate(() => !document.querySelector('.nxWaEmojiPanel')), `${tag} D: se cierra (Esc / al elegir)`);
  // escribiendo… una sola vez
  await page.evaluate(() => { const t = document.getElementById('nxWaTexto'); t.focus(); ['H', 'Ho', 'Hol', 'Hola', 'Hola ', 'Hola p'].forEach(v => { t.value = v; t.dispatchEvent(new Event('input', { bubbles: true })); }); });
  await sleep(400);
  const escribiendo = log.edge.filter(x => x?.accion === 'escribiendo');
  ok(escribiendo.length === 1 && escribiendo[0]?.hilo_id === ID.juan, `${tag} escribiendo…: una sola llamada a whatsapp-inbox-leer al teclear 6 veces`, log.edge);
  const draftLs = await page.evaluate(id => localStorage.getItem('nxWaBorrador:' + id), ID.juan);
  ok(draftLs === 'Hola p', `${tag} E: el borrador se guarda en localStorage («${draftLs}»)`);
  ok(claras && (await claras(page)).length === 0, `${tag}: sin superficies claras en el Buzón`, await claras(page));
  ok(errs.length === 0, `${tag}: sin errores de consola`, errs);

  // E. recargar: el borrador sobrevive
  const page2 = (await abrir(browser, { movil, ctx })).page;
  await irBuzon(page2);
  const fj2 = await infoFila(page2, ID.juan);
  ok(fj2 && /Borrador: Hola p/.test(fj2.prevTxt), `${tag} E: tras recargar, la fila sigue mostrando «Borrador: Hola p»`, fj2?.prevTxt);
  await page2.evaluate(id => nxWaAbrirHilo(id), ID.juan); await sleep(1500);
  ok((await page2.evaluate(() => document.getElementById('nxWaTexto')?.value)) === 'Hola p', `${tag} E: tras recargar, el chat abre con el borrador`);
  await page2.evaluate(() => { const t = document.getElementById('nxWaTexto'); t.value = ''; t.dispatchEvent(new Event('input', { bubbles: true })); });
  ok((await page2.evaluate(id => localStorage.getItem('nxWaBorrador:' + id), ID.juan)) === null, `${tag} E: vaciar el campo limpia el borrador`);
  await ctx.close();
}

async function suiteSinColumnas(browser) {
  const { ctx, page, errs, log } = await abrir(browser, { movil: true, conColumnas: false });
  await irBuzon(page);
  const f = await infoFila(page, ID.mercedes), fj = await infoFila(page, ID.juan);
  ok(f && RE_HORA.test(f.hora) && /transferencia/.test(f.prevTxt) && !/nxWaPrevTick|nxWaPrevIco/.test(f.prev), `390 sin columnas: hora y vista previa en texto plano`, f);
  ok(fj && fj.prevTxt === 'Ok gracias', `390 sin columnas: sin ✓✓ cuando no hay ultimo_mensaje_*`, fj?.prev);
  ok(await page.evaluate(() => !document.querySelector('#nxWaLista .nxWaArchRow') && !document.querySelector('#nxWaLista .nxWaRowIcos i')), `390 sin columnas: sin fila Archivados ni iconos pin/campana`);
  const b = await caja(page, ID.ana);
  await touch(ctx, page, [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }], { holdMs: 750 }); await sleep(300);
  const items = await page.evaluate(() => [...document.querySelectorAll('.nxWaListMenu button')].map(x => x.textContent.trim()));
  ok(items.join('|') === 'Marcar como leído', `390 sin columnas: el menú solo ofrece Marcar como leído`, items);
  await page.click('.nxWaListMenu [data-k="leido"]'); await sleep(300);
  ok(log.rpc.some(x => x.fn === 'whatsapp_marcar_hilo_leido' && x.b?.p_hilo_id === ID.ana), `390 sin columnas: «Marcar como leído» llama a rpc/whatsapp_marcar_hilo_leido`);
  const y = b.y + b.height / 2, x0 = b.x + b.width - 30; const n = nWa(log);
  await touch(ctx, page, [0, 30, 70, 110, 150].map(d => ({ x: x0 - d, y })), { esperaEntre: 40 }); await sleep(400);
  ok(nWa(log) === n, `390 sin columnas: deslizar no llama a archivar`, { rpc: log.rpc.filter(x => /^whatsapp_/.test(x.fn)).slice(n), chat: await page.evaluate(() => document.querySelector('#v-waInbox').classList.contains('nxWaChatOpen')) });
  ok(errs.length === 0, `390 sin columnas: sin errores de consola`, errs);
  await ctx.close();
}

(async () => {
  let browser; try { browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); } catch (e) { browser = await chromium.launch(); }
  try {
    const solo = process.env.QA_SOLO || '';
    if (!solo || solo === '390') await suite(browser, true);
    if (!solo || solo === '1280') await suite(browser, false);
    if (!solo || solo === 'sin') await suiteSinColumnas(browser);
  } catch (e) { fail++; console.log('FAIL  excepción: ' + (e && e.stack || e)); }
  await browser.close();
  console.log(`\n${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
