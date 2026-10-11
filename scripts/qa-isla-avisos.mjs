// QA de la ISLA DE AVISOS (59.20, 11-oct-2026): parches-isla-avisos.js con la app real y la REST simulada.
// Uso: node scripts/qa-crm-mock-server.js &   QA_OUT=/ruta node scripts/qa-isla-avisos.mjs
//      QA_VIDEO=1 además graba el video de demostración (iPhone con isla y computadora) en QA_OUT/video.
// El iPhone se simula con el área segura real de Chromium (Emulation.setSafeAreaInsetsOverride: 59 px arriba como
// el iPhone 15/16) y NX_ISLA_QA.standalone (la app abierta desde el ícono). La isla física y la barra de estado se
// dibujan encima solo en esta prueba, para ver cómo queda la píldora de NEXUS debajo de ellas.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.QA_BASE || 'http://127.0.0.1:8942', OUT = process.env.QA_OUT || require('os').tmpdir();
const VIDEO = process.env.QA_VIDEO === '1';
let pass = 0, fail = 0; const ok = (c, m, x) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); } };
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';
const esperar = (p, ms) => p.waitForTimeout(ms);
// Íconos Tabler de la app: la prueba no sale a internet, así que usa una copia local (se baja una vez con curl).
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const TABLER = path.join(require('os').tmpdir(), 'qa-tabler-icons');
function tablerLocal(u) {
  const m = u.match(/@tabler\/icons-webfont@[^/]+\/dist\/([^?#]+)/); if (!m) return null;
  const f = path.join(TABLER, m[1]);
  if (!fs.existsSync(f)) { try { fs.mkdirSync(path.dirname(f), { recursive: true }); execSync(`curl -sf -o "${f}" "${u.split(/[?#]/)[0]}"`, { timeout: 30000 }); } catch (e) { return null; } }
  return fs.existsSync(f) ? f : null;
}
const TIPO = { css: 'text/css', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf' };

async function abrir(b, { w, h, iphone = false, inset = 0, instalada = false, reducir = false, video = null, dpr }) {
  const o = { viewport: { width: w, height: h }, hasTouch: iphone, isMobile: iphone, deviceScaleFactor: dpr || (iphone ? 3 : 1) };
  if (iphone) o.userAgent = UA_IPHONE;
  if (reducir) o.reducedMotion = 'reduce';
  if (video) o.recordVideo = { dir: OUT + '/video', size: video };
  const ctx = await b.newContext(o); const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  if (inset) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: inset, topMax: inset, bottom: 34, bottomMax: 34, left: 0, leftMax: 0, right: 0, rightMax: 0 } }); }
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    if (/@tabler\/icons-webfont/.test(u)) { const f = tablerLocal(u); if (f) return r.fulfill({ status: 200, contentType: TIPO[f.split('.').pop()] || 'application/octet-stream', body: fs.readFileSync(f) }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await page.addInitScript((qa) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    if (qa) window.NX_ISLA_QA = qa;
  }, instalada ? { standalone: true } : null);
  await page.goto(BASE + '/index.html'); await esperar(page, 4500);
  // Espías: abrir un chat y cambiar de pantalla (nav sigue funcionando de verdad).
  await page.evaluate(() => {
    window.__qaNav = []; window.__qaAbrir = [];
    const n0 = window.nav; window.nav = function (v) { window.__qaNav.push(v); try { return n0.apply(this, arguments); } catch (e) {} };
    window.nxWaAbrirHilo = (id) => { window.__qaAbrir.push(id); };
  });
  return { ctx, page, errs };
}
// La isla física del iPhone y la barra de estado (hora y batería), por encima de todo, como en el teléfono.
async function hardware(page, inset) {
  await page.evaluate((inset) => {
    const top = Math.round(inset - 48), d = document.createElement('div'); d.id = 'qaHw';
    d.innerHTML = `<div style="position:fixed;left:50%;top:${top}px;width:126px;height:37px;margin-left:-63px;border-radius:19px;background:#000;z-index:2147483647;pointer-events:none"></div>
      <div style="position:fixed;left:0;right:0;top:${top}px;height:37px;display:flex;align-items:center;justify-content:space-between;padding:0 28px 0 46px;box-sizing:border-box;z-index:2147483646;pointer-events:none;color:#fff;font:600 17px/1 -apple-system,system-ui,sans-serif;letter-spacing:-.02em;text-shadow:0 0 1px rgba(0,0,0,.25)">
        <span>9:41</span><span style="display:flex;align-items:center;gap:6px"><span style="font-size:13px;letter-spacing:.04em">5G</span>
        <span style="width:25px;height:12px;border:1.5px solid rgba(255,255,255,.55);border-radius:4px;padding:1px;box-sizing:border-box;display:inline-flex"><span style="flex:0 0 78%;background:#fff;border-radius:1.5px"></span></span></span></div>`;
    document.body.appendChild(d);
  }, inset);
}
const estado = (p) => p.evaluate(() => {
  const el = document.getElementById('nxIsla'), r = el && el.getBoundingClientRect(), c = el && el.querySelector('.nxIsla-c:not(.sale)');
  return { ...(window.nxIsla ? window.nxIsla.estado() : {}), clases: el ? el.className : '', top: r && Math.round(r.top), ancho: r && Math.round(r.width), alto: r && Math.round(r.height),
    titulo: c && (c.querySelector('.nxIsla-t') || {}).textContent, texto: c && (c.querySelector('.nxIsla-s') || {}).textContent, der: c && (c.querySelector('.nxIsla-d') || {}).textContent,
    ini: c && (c.querySelector('.nxIsla-ic') || {}).textContent, opacidad: el && +getComputedStyle(el).opacity, toasts: document.querySelectorAll('#toastS .toast').length };
});
const wa = (p, hilo, nombre, cuerpo, extra) => p.evaluate(([hilo, nombre, cuerpo, extra]) => document.dispatchEvent(new CustomEvent('nxwa:mensaje', { detail: {
  mensaje: Object.assign({ id: 'm' + Math.random(), hilo_id: hilo, direccion: 'in', cuerpo, tipo_contenido: 'texto' }, extra || {}),
  hilo: { id: hilo, nombre_perfil: nombre, telefono_e164: '18095550001' }, abierto: false } })), [hilo, nombre, cuerpo, extra]);
const pendientes = (p, items) => p.evaluate((items) => document.dispatchEvent(new CustomEvent('nxpagos:pendientes', { detail: { items } })), items);
const cerrarIsla = async (p) => { await p.evaluate(() => window.nxIsla && window.nxIsla.cerrar()); await esperar(p, 700); };
async function deslizarArriba(page, x, y0, dy) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 - dy * i / 8 }] }); await esperar(page, 16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const A1 = { abono_id: 'a1', cliente: 'Ana Martinez', monto: 1500, metodo: 'Transferencia', puede_validar: true };
const A2 = { abono_id: 'a2', cliente: 'Pedro Sanchez', monto: 4000, metodo: 'Depósito', puede_validar: true };
const A3 = { abono_id: 'a3', cliente: 'Rosa Jimenez', monto: 2000, metodo: 'Transferencia', puede_validar: false };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errores = [];

  // ── iPhone 15/16 con isla, app abierta desde el ícono (390 px, área segura 59) ──
  { const { ctx, page, errs } = await abrir(b, { w: 390, h: 844, iphone: true, inset: 59, instalada: true });
    await hardware(page, 59);
    ok(await page.evaluate(() => window.__nxIslaAvisos20261011 === true && !!(window.toast && window.toast.__nxIsla)), 'la capa carga y envuelve window.toast');
    ok(await page.evaluate(() => [...document.scripts].some(s => /parches-isla-avisos\.js\?.*b=6025/.test(s.src))), 'el cargador la pide con el build nuevo (b=6025)');
    // Ancho cuadro por cuadro mientras se abre.
    await page.evaluate(() => { window.__qaAnchos = []; const t0 = performance.now(); const f = () => { const el = document.getElementById('nxIsla'); if (el) window.__qaAnchos.push(Math.round(el.getBoundingClientRect().width)); if (performance.now() - t0 < 1400) requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await wa(page, 'h1', 'María Pérez', 'Buenas, ¿ya salió mi póliza?');
    await esperar(page, 180);
    let e = await estado(page);
    ok(e.fase === 'abierta' && e.modo === 'isla', 'WhatsApp nuevo: la isla se abre en modo isla (debajo de la isla del teléfono)', e);
    await esperar(page, 1300);
    const anchos = await page.evaluate(() => window.__qaAnchos.filter(Boolean));
    const an = { primero: anchos[0], max: Math.max(...anchos), ultimo: anchos[anchos.length - 1], cuadros: anchos.length };
    ok(an.primero <= 140 && an.max >= 376 && Math.abs(an.ultimo - 372) <= 2, 'nace como la píldora (126), crece con un rebote leve y se queda en 372', an);
    e = await estado(page);
    ok(e.top === 11 && Math.abs(e.ancho - 372) <= 2 && Math.abs(e.alto - 100) <= 2, 'ya abierta: arriba a 11 px (borde de la isla), 372 × 100', { top: e.top, ancho: e.ancho, alto: e.alto });
    ok(e.titulo === 'María Pérez' && e.texto === 'Buenas, ¿ya salió mi póliza?' && e.der === 'ahora' && /MP/.test(e.ini || ''), 'muestra quién escribió, el mensaje, «ahora» y sus iniciales', e);
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('#nxIsla .nxIsla-t')).textTransform === 'none'), 'en letra normal, como los avisos del iPhone (no hereda las mayúsculas globales)');
    ok(await page.evaluate(() => document.fonts.check('16px tabler-icons') || [...document.fonts].some(f => /tabler/i.test(f.family) && f.status === 'loaded')), 'los íconos de la app (Tabler) cargan en la prueba');
    const cont = await page.evaluate(() => { const c = document.querySelector('#nxIsla .nxIsla-c'); const r = c.getBoundingClientRect(); return Math.round(r.top); });
    ok(cont >= 50, 'el texto empieza debajo de la isla (que termina a 48 px) y de la hora: no queda tapado', cont);
    ok(await page.evaluate(() => [...document.querySelectorAll('#nxIsla .nxIsla-ic .ti')].every(i => getComputedStyle(i).color === 'rgb(255, 255, 255)')), 'los íconos de la isla van en blanco también con el tema oscuro');
    await page.screenshot({ path: OUT + '/isla-390-whatsapp.png' });
    await wa(page, 'h1', 'María Pérez', 'Le mando la foto del carnet', { tipo_contenido: 'imagen', cuerpo: '' });
    await esperar(page, 450);
    e = await estado(page);
    ok(e.der === '2' && e.texto === 'Foto' && (e.cola || []).length === 0, 'otro mensaje del mismo chat: se suma en el mismo aviso (2) y dice «Foto»', e);
    await page.tap('#nxIsla .nxIsla-c');
    await esperar(page, 700);
    e = await estado(page);
    const nav1 = await page.evaluate(() => ({ nav: window.__qaNav.slice(), abrir: window.__qaAbrir.slice() }));
    ok(nav1.nav.includes('waInbox') && nav1.abrir.includes('h1'), 'al tocarla abre el Buzón en ese chat', nav1);
    ok(e.fase === 'oculta', 'y la isla se recoge', e.fase);
    await page.evaluate(() => nav('dashboard', null)); await esperar(page, 600);

    // Pagos hechos (window.toast)
    let antes = (await estado(page)).toasts;
    await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 2,500 — Juan Rodriguez'));
    await esperar(page, 1100);
    e = await estado(page);
    ok(e.titulo === 'Pago registrado' && e.der === 'RD$ 2,500' && e.texto === 'Juan Rodriguez', '«Pago registrado» sale en la isla con el monto a la derecha y el cliente debajo', e);
    ok(e.toasts === antes, 'y no sale además el aviso de la esquina (no se duplica)', { antes, ahora: e.toasts });
    await page.screenshot({ path: OUT + '/isla-390-pago.png' });
    await page.evaluate(() => toast('err', 'No se pudo validar', 'prueba'));
    await esperar(page, 200);
    e = await estado(page);
    ok(e.toasts === antes + 1 && e.titulo === 'Pago registrado', 'un error sigue saliendo en la esquina como siempre', { toasts: e.toasts });
    await cerrarIsla(page);
    await page.evaluate(() => toast('ok', 'Pago validado', 'Acumulado de Robinson Perez: RD$ 25,000.00'));
    await esperar(page, 1100);
    e = await estado(page);
    ok(e.titulo === 'Pago validado' && !e.der && e.texto === 'Acumulado de Robinson Perez: RD$ 25,000.00', '«Pago validado»: el acumulado va completo debajo (no se confunde con el monto del pago)', e);
    await cerrarIsla(page);
    await page.evaluate(() => toast('ok', 'Abono registrado', 'RD$ 300.00 · Ferretería Ochoa · compra #12'));
    await esperar(page, 1100);
    e = await estado(page);
    ok(e.der === 'RD$ 300.00' && e.texto === 'Ferretería Ochoa · compra #12', '«Abono registrado» del POS: monto y detalle', e);
    await cerrarIsla(page);

    // Pagos por validar nuevos
    await pendientes(page, [A1]); await esperar(page, 300);
    e = await estado(page);
    ok(e.fase === 'oculta', 'la primera lista de pagos por validar no se anuncia (ya estaban)', e.fase);
    await pendientes(page, [A1, A2]); await esperar(page, 1100);
    e = await estado(page);
    ok(e.titulo === 'Pago por validar' && e.texto === 'Pedro Sanchez · Depósito' && e.der === 'RD$ 4,000', 'llega un pago por validar nuevo: lo anuncia con cliente, método y monto', e);
    await page.screenshot({ path: OUT + '/isla-390-por-validar.png' });
    await page.tap('#nxIsla .nxIsla-c'); await esperar(page, 700);
    ok((await page.evaluate(() => window.__qaNav.slice())).includes('solicitudes'), 'al tocarlo abre Solicitudes');
    await page.evaluate(() => nav('dashboard', null)); await esperar(page, 600);
    await pendientes(page, [A1, A2, A3]); await esperar(page, 600);
    e = await estado(page);
    ok(e.fase === 'oculta', 'no avisa de un pago que este usuario no puede validar', e);

    // Reglas del sonido: chat silenciado y chat abierto
    await page.evaluate(() => { window.nxWaHiloSilenciado = (h) => h && h.id === 'h9'; });
    await wa(page, 'h9', 'Grupo silenciado', 'hola'); await esperar(page, 400);
    ok((await estado(page)).fase === 'oculta', 'no avisa de un chat silenciado');
    const foco = await page.evaluate(() => document.hasFocus());
    if (foco) {
      await page.evaluate(() => document.dispatchEvent(new CustomEvent('nxwa:mensaje', { detail: { mensaje: { id: 'mx', hilo_id: 'h1', direccion: 'in', cuerpo: 'ya lo vi' }, hilo: { id: 'h1', nombre_perfil: 'María Pérez' }, abierto: true } })));
      await esperar(page, 400);
      ok((await estado(page)).fase === 'oculta', 'no avisa del chat que ya está abierto');
    } else console.log('SKIP  chat abierto: el navegador de prueba no tiene foco');

    // Muchos chats a la vez: uno en pantalla y el resto en un solo resumen
    for (const [h, n] of [['h2', 'Juan Rodriguez'], ['h3', 'Ana Martinez'], ['h4', 'Carlos Diaz'], ['h5', 'Luisa Fernandez']]) await wa(page, h, n, 'Hola');
    await esperar(page, 300);
    e = await estado(page);
    ok(e.actual === 'wa:h2' && (e.cola || []).length === 1 && e.cola[0] === 'wa:varios', 'cuatro chats seguidos: se ve el primero y los demás quedan en un solo resumen', e);
    await esperar(page, 1700);
    e = await estado(page);
    ok(e.actual === 'wa:varios' && e.titulo === 'WhatsApp' && /3 mensajes nuevos de 3 chats/.test(e.texto || ''), 'a los 1,5 s pasa al resumen sin recogerse', e);
    // Deslizar hacia arriba la recoge
    const r = await page.evaluate(() => { const x = document.querySelector('#nxIsla .nxIsla-c').getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2 }; });
    await deslizarArriba(page, r.x, r.y, 60); await esperar(page, 700);
    ok((await estado(page)).fase === 'oculta', 'deslizar hacia arriba la recoge');
    ok(await page.evaluate(() => { const el = document.getElementById('nxIsla'); return getComputedStyle(el).pointerEvents === 'none' && getComputedStyle(el).visibility === 'hidden'; }), 'recogida no tapa nada (no recibe toques)');
    // Apagada en este equipo
    await page.evaluate(() => localStorage.setItem('nxIslaAvisos', '0'));
    antes = (await estado(page)).toasts;
    await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 100 — Prueba'));
    await esperar(page, 400);
    e = await estado(page);
    ok(e.fase === 'oculta' && e.toasts === antes + 1, 'con nxIslaAvisos=0 vuelve el aviso de siempre', e);
    await page.evaluate(() => localStorage.removeItem('nxIslaAvisos'));
    errores.push(...errs.map(x => '390: ' + x)); await ctx.close(); }

  // ── iPhone Pro Max (430 px, área 62): la isla está un poco más abajo ──
  { const { ctx, page, errs } = await abrir(b, { w: 430, h: 932, iphone: true, inset: 62, instalada: true });
    await hardware(page, 62);
    await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 4,000 — Carlos Diaz')); await esperar(page, 1100);
    const e = await estado(page);
    ok(e.modo === 'isla' && e.top === 14 && Math.abs(e.ancho - 412) <= 2, '430 px: modo isla a 14 px, 412 de ancho', e);
    await page.screenshot({ path: OUT + '/isla-430-pago.png' });
    errores.push(...errs.map(x => '430: ' + x)); await ctx.close(); }

  // ── iPhone con muesca (sin isla), app instalada: píldora flotante debajo de la barra ──
  { const { ctx, page, errs } = await abrir(b, { w: 390, h: 844, iphone: true, inset: 47, instalada: true });
    await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 2,500 — Juan Rodriguez')); await esperar(page, 1100);
    const e = await estado(page);
    ok(e.modo === 'flota' && e.top === 55 && Math.abs(e.ancho - 374) <= 2 && Math.abs(e.alto - 62) <= 2, 'iPhone con muesca: píldora flotante a 55 px, 374 × 62', e);
    errores.push(...errs.map(x => 'muesca: ' + x)); await ctx.close(); }

  // ── Safari normal (sin instalar): flotante arriba ──
  { const { ctx, page, errs } = await abrir(b, { w: 390, h: 844, iphone: true });
    await wa(page, 'h1', 'María Pérez', 'Hola'); await esperar(page, 1100);
    const e = await estado(page);
    ok(e.modo === 'flota' && e.top === 8, 'Safari sin instalar: píldora flotante a 8 px', e);
    await page.screenshot({ path: OUT + '/isla-390-safari.png' });
    errores.push(...errs.map(x => 'safari: ' + x)); await ctx.close(); }

  // ── Computadora ──
  { const { ctx, page, errs } = await abrir(b, { w: 1280, h: 800 });
    await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 2,500 — Juan Rodriguez')); await esperar(page, 1100);
    let e = await estado(page);
    ok(e.modo === 'flota' && e.top === 14 && Math.abs(e.ancho - 380) <= 2, 'computadora: píldora flotante arriba al centro, 380 de ancho', e);
    await page.screenshot({ path: OUT + '/isla-1280-pago.png' });
    // El ratón encima la detiene; al salir se va.
    const r = await page.evaluate(() => { const x = document.getElementById('nxIsla').getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2 }; });
    await page.mouse.move(r.x, r.y); await esperar(page, 4200);
    ok((await estado(page)).fase === 'abierta', 'con el ratón encima no se va');
    await page.mouse.move(10, 400); await esperar(page, 3600);   // sigue con el tiempo que le quedaba (~2,7 s) y se recoge
    ok((await estado(page)).fase === 'oculta', 'al quitar el ratón termina su tiempo y se recoge');
    await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 1,000 — Prueba')); await esperar(page, 900);
    await page.keyboard.press('Tab'); await page.evaluate(() => { const c = document.querySelector('#nxIsla .nxIsla-c'); if (c) c.setAttribute('tabindex', '0'), c.focus(); });
    await page.keyboard.press('Escape'); await esperar(page, 700);
    ok((await estado(page)).fase === 'oculta', 'Escape la cierra');
    errores.push(...errs.map(x => '1280: ' + x)); await ctx.close(); }

  // ── Reducir movimiento: aparece ya grande, sin estirarse ──
  { const { ctx, page, errs } = await abrir(b, { w: 390, h: 844, iphone: true, inset: 59, instalada: true, reducir: true });
    await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 2,500 — Juan Rodriguez')); await esperar(page, 60);
    const e = await estado(page);
    ok(Math.abs(e.ancho - 372) <= 2, 'con «reducir movimiento» sale ya con su tamaño (solo aparece y desaparece)', e.ancho);
    errores.push(...errs.map(x => 'reducir: ' + x)); await ctx.close(); }

  ok(errores.length === 0, 'sin errores de la página en ninguna prueba', errores);

  // ── Video de demostración ──
  if (VIDEO) {
    { const { ctx, page } = await abrir(b, { w: 390, h: 844, iphone: true, inset: 59, instalada: true, video: { width: 780, height: 1688 }, dpr: 2 });
      await hardware(page, 59);
      await pendientes(page, [A1]);
      await esperar(page, 1500);
      await wa(page, 'h1', 'María Pérez', 'Buenas, ¿ya salió mi póliza?'); await esperar(page, 2300);
      await wa(page, 'h1', 'María Pérez', 'Le mando la foto del carnet', { tipo_contenido: 'imagen', cuerpo: '' }); await esperar(page, 5200);
      await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 2,500 — Juan Rodriguez')); await esperar(page, 5000);
      await pendientes(page, [A1, A2]); await esperar(page, 2600);
      await page.tap('#nxIsla .nxIsla-c'); await esperar(page, 2600);
      await page.evaluate(() => nav('dashboard', null)); await esperar(page, 1200);
      await wa(page, 'h2', 'Juan Rodriguez', '¿Cuánto debo de la póliza?'); await esperar(page, 1800);
      const r = await page.evaluate(() => { const x = document.querySelector('#nxIsla .nxIsla-c').getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2 }; });
      await deslizarArriba(page, r.x, r.y, 70); await esperar(page, 1500);
      await ctx.close(); }
    { const { ctx, page } = await abrir(b, { w: 1280, h: 720, video: { width: 1280, height: 720 } });
      await esperar(page, 1200);
      await page.evaluate(() => toast('ok', 'Pago registrado', 'RD$ 2,500 — Juan Rodriguez')); await esperar(page, 4800);
      await wa(page, 'h1', 'María Pérez', 'Buenas, ¿ya salió mi póliza?'); await esperar(page, 5200);
      await ctx.close(); }
  }
  await b.close();
  console.log(`\n${pass} OK, ${fail} con fallas`);
  process.exit(fail ? 1 : 0);
})();
