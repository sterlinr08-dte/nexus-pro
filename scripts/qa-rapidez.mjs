// QA 59.26 «que se sienta instantáneo» (parches-rapidez.js + cambios en parches-whatsapp-inbox.js), ideas de Raycast:
//  A. Buzón con la lista todavía en camino: filas de espera, KPI «—», nunca «0» ni «Todavia no han llegado mensajes»; línea fina arriba.
//  B. Precarga en memoria: al entrar al sistema la lista se pide sola; al abrir el Buzón ya está (sin filas de espera). Nada en localStorage.
//  C. Archivar un chat (menú real) → aviso con «Deshacer»; tocarlo desarchiva por la RPC.
//  D. Teléfono 809-000-0000 / 1 809-…, cédula de Préstamos, y cursor en su sitio al corregir en medio (monto y cédula).
//  E. Las listas de Clientes/Cobros muestran filas de espera (no la rueda) y los botones con rueda siguen igual.
// Uso: PORT=8963 node scripts/qa-crm-mock-server.js &   PORT=8963 QA_OUT=/ruta node scripts/qa-rapidez.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8963);
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-rapidez')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
const TABLER = process.env.QA_TABLER || '';
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const hace = ms => new Date(Date.now() - ms).toISOString();
const H = 3600e3, D = 24 * H;
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
async function abrir(browser, { movil, conColumnas = true, ctx: ctxPrevio = null, demora = 0 }) {
  const iph = devices['iPhone 13'];
  const ctx = ctxPrevio || await browser.newContext(movil
    ? { ...iph, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [], log = { rpc: [], hilosGet: 0, hilosT: 0, msgs: [], edge: [] };
  const HILOS = hilos(conColumnas);
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url(), req = r.request();
    if (/\/rest\/v1\/rpc\//.test(u)) { let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {} const fn = u.replace(/^.*\/rpc\//, '').split('?')[0]; log.rpc.push({ fn, b }); aplicarRpc(HILOS, fn, b); return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }); }
    if (/\/functions\/v1\/whatsapp-inbox-leer/.test(u)) { let b = null; try { b = JSON.parse(req.postData() || 'null'); } catch (e) {} log.edge.push(b); return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    if (/\/functions\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
    if (/whatsapp_hilo_mensajes/.test(u)) { log.msgs.push(u.replace(/^.*rest\/v1\//, '')); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mensajesRest(u)) }); }
    if (/whatsapp_hilos/.test(u)) { log.hilosGet++; log.hilosT = log.hilosT || Date.now(); if (demora) await sleep(demora); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HILOS) }); }
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
  return { ctx, page, errs, log, HILOS };
}

const irBuzon = page => page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('waInbox', null); });
const estadoBuzon = page => page.evaluate(() => {
  const L = document.getElementById('nxWaLista');
  return { sk: L ? L.querySelectorAll('.nxWaSkRow').length : -1, filas: L ? L.querySelectorAll('.nxWaRow').length : -1, cuenta: document.querySelector('#v-waInbox .nxWaListCount')?.textContent.trim(),
    vacio: /Todavia no han llegado/.test(L?.textContent || ''), kpi: document.querySelector('#nxWaProPanel .nxWaProKpi .v')?.textContent.trim(),
    kpiSk: !!document.querySelector('#nxWaProPanel .nxWaProKpi .v .nxSkNum'), linea: !!document.querySelector('#nxLinea.on') };
});

(async () => {
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const movil of [true, false]) {
    const tag = movil ? '390' : '1280';
    // A. lista en camino (el servidor tarda 6 s)
    { const { ctx, page, errs, log } = await abrir(browser, { movil, demora: 6000 });
      await irBuzon(page); await sleep(700);
      const e1 = await estadoBuzon(page);
      ok(e1.sk >= 5 && e1.filas === 0 && !e1.vacio && !/\d+ chats/.test(e1.cuenta || ''), `${tag} A: mientras llega la lista se ven filas de espera, nunca «Todavia no han llegado mensajes»`, e1);
      ok(e1.kpiSk && e1.kpi !== '0', `${tag} A: el contador «Conversaciones» no dice 0 mientras carga`, e1);
      ok(e1.linea, `${tag} A: la línea fina de arriba está encendida mientras espera`, e1);
      await page.screenshot({ path: OUT + tag + '-A-cargando.png' });
      await page.waitForFunction(() => document.querySelectorAll('#nxWaLista .nxWaRow').length > 0 && !document.querySelector('#nxWaLista .nxWaSkRow'), null, { timeout: 15000 }).catch(() => {});
      await page.waitForFunction(() => !document.querySelector('#nxLinea.on'), null, { timeout: 9000 }).catch(() => {});
      const e2 = await estadoBuzon(page);
      ok(e2.sk === 0 && e2.filas >= 5 && e2.kpi === '8' && !e2.linea, `${tag} A: al llegar, filas reales, KPI 8 y la línea se apaga`, e2);
      const ls = await page.evaluate(() => Object.keys(localStorage).filter(k => /hilo|wa_?lista|nxWaCache/i.test(k)));
      ok(!ls.length, `${tag} A/B: nada de la lista se guarda en localStorage`, ls);
      ok(!errs.length, `${tag} A: sin errores`, errs);
      await ctx.close(); }
    // B. precarga en memoria
    { const { ctx, page, errs, log } = await abrir(browser, { movil });
      await page.waitForFunction(() => window.nxWaCargadoUnaVez && window.nxWaCargadoUnaVez(), null, { timeout: 15000 }).catch(() => {});
      const pre = log.hilosGet;
      ok(pre >= 1, `${tag} B: la lista de chats se pide sola al entrar, sin abrir el Buzón (${pre})`, log);
      await irBuzon(page); await sleep(150);
      const e = await estadoBuzon(page);
      ok(e.sk === 0 && e.filas >= 5, `${tag} B: al abrir el Buzón la lista ya está (150 ms, sin filas de espera)`, e);
      // C. archivar con Deshacer (menú real: clic derecho / pulsación larga)
      await sleep(900);
      const id = U(9002);
      if (movil) {
        const b = await page.evaluate(id => document.querySelector(`#nxWaLista .nxWaRow[data-hilo="${id}"]`).getBoundingClientRect().toJSON(), id);
        const cdp = await ctx.newCDPSession(page);
        const pt = { x: b.x + 120, y: b.y + b.height / 2 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] }); await sleep(800);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400);
      } else {
        await page.click(`#nxWaLista .nxWaRow[data-hilo="${id}"]`, { button: 'right' }); await sleep(400);
      }
      const rpc0 = log.rpc.length;
      const item = await page.evaluate(() => { const b = [...document.querySelectorAll('.nxWaListMenu button, .nxWaListMenu [role=menuitem], .nxWaListMenu div')].find(x => /^Archivar chat$/.test(x.textContent.trim())); if (b) { b.click(); return true; } return false; });
      await sleep(900);
      const ar = log.rpc.slice(rpc0).find(x => x.fn === 'whatsapp_hilo_archivar');
      const t = await page.evaluate(() => { const b = document.querySelector('#toastS .nxDeshacer'); return { hay: !!b, txt: b?.closest('.toast')?.textContent.replace(/\s+/g, ' ').trim(), alto: b ? Math.round(b.getBoundingClientRect().height) : 0 }; });
      ok(item && ar && ar.b.p_archivar === true, `${tag} C: el menú «Archivar chat» archiva por la RPC`, { item, rpc: log.rpc.slice(rpc0) });
      ok(t.hay && /Chat archivado/.test(t.txt) && t.alto >= 44, `${tag} C: sale el aviso «Chat archivado» con «Deshacer» (≥ 44 px)`, t);
      await page.screenshot({ path: OUT + tag + '-C-deshacer.png' });
      const rpc1 = log.rpc.length;
      await page.click('#toastS .nxDeshacer'); await sleep(900);
      const de = log.rpc.slice(rpc1).find(x => x.fn === 'whatsapp_hilo_archivar');
      const fila = await page.evaluate(id => { const r = document.querySelector(`#nxWaLista .nxWaRow[data-hilo="${id}"]`); return r ? { enArch: !!r.closest('.nxWaArchSec'), cls: r.className } : null; }, id);
      ok(de && de.b.p_archivar === false && de.b.p_hilo_id === id, `${tag} C: «Deshacer» desarchiva por la RPC`, log.rpc.slice(rpc1));
      ok(fila && !fila.enArch && !/nxWaArchived/.test(fila.cls), `${tag} C: el chat vuelve a la lista`, fila);
      // otros avisos siguen igual (sin Deshacer)
      await page.evaluate(() => toast('ok', 'Guardado', '')); await sleep(200);
      const otros = await page.evaluate(() => [...document.querySelectorAll('#toastS .toast')].filter(t => /Guardado/.test(t.textContent)).map(t => !!t.querySelector('.nxDeshacer')));
      ok(otros.length === 1 && !otros[0], `${tag} C: los demás avisos no llevan «Deshacer»`, otros);
      ok(!errs.length, `${tag} B/C: sin errores`, errs);
      await ctx.close(); }
    // D/E. campos y listas
    { const { ctx, page, errs } = await abrir(browser, { movil });
      await sleep(1500);
      await page.evaluate(() => abrirNuevoCli()); await sleep(500);
      const escribir = async (sel, txt) => { await page.click(sel); await page.fill(sel, ''); await page.type(sel, txt, { delay: 15 }); return page.inputValue(sel); };
      const tel = await escribir('#cTel', '8095551234');
      const wa = await escribir('#cWA', '18095551234');
      const ced = await escribir('#cCed', '00112345678');
      ok(tel === '809-555-1234', `${tag} D: teléfono se forma solo (809-555-1234)`, tel);
      ok(wa === '1 809-555-1234', `${tag} D: WhatsApp con 1 delante (1 809-555-1234)`, wa);
      ok(ced === '001-1234567-8', `${tag} D: cédula 001-1234567-8`, ced);
      const waNum = await page.evaluate(() => { try { return nxWa(document.getElementById('cWA').value); } catch (e) { return 'err:' + e.message; } });
      ok(waNum === '18095551234', `${tag} D: el número que se guarda/envía sigue siendo 18095551234`, waNum);
      // cursor: corregir en medio de la cédula
      await page.evaluate(() => { const i = document.getElementById('cCed'); i.focus(); i.setSelectionRange(5, 5); });
      await page.keyboard.press('Backspace'); await page.keyboard.type('9');
      const c2 = await page.evaluate(() => { const i = document.getElementById('cCed'); return { v: i.value, p: i.selectionStart }; });
      ok(c2.v === '001-9234567-8' && c2.p === 5, `${tag} D: corregir en medio de la cédula deja el cursor ahí (no salta al final)`, c2);
      await page.screenshot({ path: OUT + tag + '-D-cliente.png' });
      await page.evaluate(() => { try { closeM('mCli'); } catch (e) { document.getElementById('mCli').classList.remove('open'); } });
      // monto: corregir en medio
      await page.evaluate(() => { try { API.token = 'qa-token'; abrirAbono(ST.clientes[1].id); } catch (e) {} }); await sleep(700);
      const hayMnt = await page.evaluate(() => !!document.getElementById('aMnt') && document.getElementById('mAbono').classList.contains('open'));
      if (hayMnt) {
        await page.fill('#aMnt', ''); await page.type('#aMnt', '12345', { delay: 15 });
        const m1 = await page.inputValue('#aMnt');
        await page.evaluate(() => { const i = document.getElementById('aMnt'); i.focus(); i.setSelectionRange(1, 1); });
        await page.keyboard.type('9');
        const m2 = await page.evaluate(() => { const i = document.getElementById('aMnt'); return { v: i.value, p: i.selectionStart, n: nxMoney.parse(i.value) }; });
        ok(m1 === '12,345' && m2.v === '192,345' && m2.p === 2 && m2.n === 192345, `${tag} D: monto 12,345 → escribir 9 tras el 1 da 192,345 con el cursor tras el 9`, { m1, m2 });
      } else ok(false, `${tag} D: no abrió Registrar pago`);
      // préstamo: máscaras por id (sin abrir el formulario largo)
      const pr = await page.evaluate(() => { const r = {}; for (const [id, v] of [['prcTel', '8295550000'], ['prcCed', '40212345678']]) { const i = document.createElement('input'); i.id = id; document.body.appendChild(i); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); r[id] = i.value; i.remove(); } return r; });
      ok(pr.prcTel === '829-555-0000' && pr.prcCed === '402-1234567-8', `${tag} D: Préstamos: teléfono y cédula del cliente también se forman`, pr);
      // E. listas: filas de espera en lugar de rueda, botones intactos
      const e = await page.evaluate(() => {
        const d = document.createElement('div'); d.innerHTML = '<div class="loading"><div class="spin"></div>Cargando...</div><button class="btn"><div class="spin"></div></button>'; document.body.appendChild(d);
        const L = d.querySelector('.loading'), r = { ruedaLista: getComputedStyle(L.querySelector('.spin')).display, alto: Math.round(L.getBoundingClientRect().height), antes: getComputedStyle(L, '::before').content, ruedaBoton: getComputedStyle(d.querySelector('button .spin')).display };
        d.remove(); return r; });
      ok(e.ruedaLista === 'none' && e.alto >= 100 && e.antes !== 'none' && e.ruedaBoton !== 'none', `${tag} E: listas con filas de espera (sin rueda); la rueda dentro de los botones sigue`, e);
      ok(!errs.length, `${tag} D/E: sin errores`, errs);
      await ctx.close(); }
  }
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL · capturas en ${OUT}`);
  await browser.close(); process.exit(fail ? 1 : 0);
})();
