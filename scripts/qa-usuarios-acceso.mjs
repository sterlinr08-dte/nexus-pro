// QA «Usuarios con acceso» (Configuración → Usuarios + función usuarios-acceso).
//  A. La lista pide el estado de acceso y marca «Con acceso» / «Sin acceso»; el usuario sin acceso
//     muestra «Crear acceso» y no el botón de cambiar contraseña.
//  B. «Crear acceso» abre la ventana propia (no prompt), valida 6 caracteres y que coincidan, y
//     manda {accion:'crear_acceso', usuario_id, clave}; luego queda «Con acceso».
//  C. «Nuevo usuario» manda {accion:'crear', nombre, cargo, login, clave, rol} y ya NO escribe
//     usuarios_sistema directo (ni hash de clave). Rechaza clave < 6 y usuario con espacios.
//  D. Rol, estado, usuario y eliminar pasan por la función; si la función falla, se avisa y la
//     lista vuelve a lo que había.
//  E. Sin errores en consola; nombres con HTML se muestran como texto.
// Uso: PORT=8966 node scripts/qa-crm-mock-server.js &   PORT=8966 QA_OUT=/ruta node scripts/qa-usuarios-acceso.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8966);
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-usuarios-acceso')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const U1 = '00000000-0000-4000-8000-000000000001', U2 = '00000000-0000-4000-8000-000000000002';

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: 'es-DO' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; errs.push('console: ' + t); } });
  page.on('dialog', d => d.accept().catch(() => {}));
  const llamadas = [], escriturasDirectas = [];
  let conAcceso = { [U1]: true, [U2]: false }, fallarSiguiente = null;
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try {
    const u = r.request().url(), m = r.request().method();
    if (/\/functions\/v1\/usuarios-acceso/.test(u)) {
      const b = JSON.parse(r.request().postData() || '{}'); llamadas.push({ ...b, auth: r.request().headers()['authorization'] });
      if (fallarSiguiente && b.accion === fallarSiguiente) { fallarSiguiente = null; return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'No puedes quitarte a ti mismo el rol de administrador' }) }); }
      if (b.accion === 'lista') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, usuarios: Object.entries(conAcceso).filter(([, v]) => v).map(([k]) => ({ usuario_id: k, con_acceso: true, ultimo_ingreso: null })) }) });
      if (b.accion === 'crear_acceso') conAcceso[b.usuario_id] = true;
      if (b.accion === 'crear') { const id = '00000000-0000-4000-8000-000000000077'; conAcceso[id] = true; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, usuario: { id, nom: b.nombre.toUpperCase(), login: b.login, rol: b.rol, activo: true, cargo: b.cargo } }) }); }
      return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    if (/\/rest\/v1\/usuarios_sistema/.test(u) && m !== 'GET') escriturasDirectas.push(m + ' ' + u);
    if (/\/rest\/v1\/rpc\//.test(u) || /\/functions\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    if (/whatsapp_hil/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await ctx.addInitScript(() => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    window.supabase = { createClient() { return { realtime: { setAuth: async () => {} }, channel() { const ch = { on() { return ch; }, subscribe(cb) { return ch; } }; return ch; } }; } };
  });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.usuarios || []).length > 0, null, { timeout: 30000 });

  // Sin token (modo legacy) la función no se llama y se avisa claro.
  const sinToken = await page.evaluate(async () => { try { await nxUsuAcc('lista'); return 'llamó'; } catch (e) { return e.message; } });
  ok(/modo legacy/.test(sinToken), 'Sin sesión segura no llama a la función y lo explica', sinToken);

  await page.evaluate(() => { API.token = 'tok-admin'; ST.usuarios.push({ id: '00000000-0000-4000-8000-000000000003', nom: '<img src=x onerror=window.__xss=1>', login: 'raro', rol: 'cajero', activo: true }); });
  await page.evaluate(() => { nav('config', null); setTimeout(() => switchCfgTab(6), 300); });
  await page.waitForSelector('#tbUsuCfg tr', { timeout: 10000 });
  await page.waitForFunction(() => document.querySelectorAll('#tbUsuCfg .nxUsuChip').length > 0, null, { timeout: 10000 });
  await sleep(300);
  const filas = await page.evaluate(() => [...document.querySelectorAll('#tbUsuCfg tr')].map(tr => ({ txt: tr.cells[0]?.innerText, crear: !!tr.querySelector('button[onclick*="crear_acceso"]'), clave: !!tr.querySelector('button[onclick^="abrirCambiarPwd"]') })));
  const f1 = filas.find(f => /Esterlin/i.test(f.txt)), f2 = filas.find(f => /Robinson/i.test(f.txt));
  ok(f1 && /con acceso/i.test(f1.txt) && !f1.crear && f1.clave, 'A. Usuario con acceso: chip «Con acceso», botón de contraseña, sin «Crear acceso»', f1);
  ok(f2 && /sin acceso/i.test(f2.txt) && f2.crear && !f2.clave, 'A. Usuario sin acceso: chip «Sin acceso» y botón «Crear acceso»', f2);
  ok(llamadas.some(l => l.accion === 'lista' && l.auth === 'Bearer tok-admin'), 'A. Pide la lista a la función con el token del admin');
  ok(await page.evaluate(() => !window.__xss) && filas.some(f => /<img src=x/i.test(f.txt || '')), 'E. Nombre con HTML se muestra como texto (no se ejecuta)');
  await page.screenshot({ path: OUT + 'usuarios-lista.png' });

  // B. Crear acceso
  await page.click('#tbUsuCfg button[onclick*="crear_acceso"]');
  await page.waitForSelector('#nxUsuClaveM #nxUsuC1');
  await page.screenshot({ path: OUT + 'usuarios-crear-acceso.png' });
  await page.fill('#nxUsuC1', '123'); await page.fill('#nxUsuC2', '123'); await page.click('#nxUsuCBtn'); await sleep(200);
  ok(!llamadas.some(l => l.accion === 'crear_acceso'), 'B. Clave de 3 caracteres no se manda');
  await page.fill('#nxUsuC1', 'clave123'); await page.fill('#nxUsuC2', 'clave124'); await page.click('#nxUsuCBtn'); await sleep(200);
  ok(!llamadas.some(l => l.accion === 'crear_acceso'), 'B. Claves distintas no se mandan');
  await page.fill('#nxUsuC2', 'clave123'); await page.click('#nxUsuCBtn');
  await page.waitForFunction(() => !document.getElementById('nxUsuClaveM'), null, { timeout: 5000 }).catch(() => {});
  const ca = llamadas.find(l => l.accion === 'crear_acceso');
  ok(ca && ca.usuario_id === U2 && ca.clave === 'clave123', 'B. Manda crear_acceso con el usuario y la clave', ca);
  await page.waitForFunction(() => /con acceso/i.test([...document.querySelectorAll('#tbUsuCfg tr')].find(tr => /Robinson/i.test(tr.innerText))?.innerText || ''), null, { timeout: 5000 }).catch(() => {});
  const r2 = await page.evaluate(() => [...document.querySelectorAll('#tbUsuCfg tr')].find(tr => /Robinson/i.test(tr.innerText))?.innerText || '');
  ok(/con acceso/i.test(r2), 'B. Después queda «Con acceso»', r2);

  // C. Nuevo usuario
  await page.evaluate(() => openM('mUsuario'));
  await page.fill('#uNom', 'Loribel Prueba'); await page.fill('#uCargo', 'Cajera'); await page.fill('#uLogin', 'lori bel'); await page.fill('#uPwd', 'abc12345');
  await page.selectOption('#uRol', 'cajero'); await page.click('#btnUsu'); await sleep(200);
  ok(!llamadas.some(l => l.accion === 'crear'), 'C. Usuario con espacio no se manda');
  await page.fill('#uLogin', 'loribel2'); await page.fill('#uPwd', 'abc12'); await page.click('#btnUsu'); await sleep(200);
  ok(!llamadas.some(l => l.accion === 'crear'), 'C. Clave de 5 caracteres no se manda');
  await page.fill('#uPwd', 'abc12345'); await page.click('#btnUsu'); await sleep(600);
  const cr = llamadas.find(l => l.accion === 'crear');
  ok(cr && cr.nombre === 'Loribel Prueba' && cr.login === 'loribel2' && cr.clave === 'abc12345' && cr.rol === 'cajero' && cr.cargo === 'Cajera', 'C. Manda crear con nombre, cargo, usuario, clave y rol', cr);
  const nueva = await page.evaluate(() => [...document.querySelectorAll('#tbUsuCfg tr')].find(tr => /LORIBEL PRUEBA/.test(tr.innerText))?.innerText || '');
  ok(/con acceso/i.test(nueva), 'C. El usuario nuevo aparece en la lista con acceso', nueva);

  // D. Rol / estado / usuario / eliminar
  const sel = '#tbUsuCfg tr:has-text("Robinson") select';
  await page.locator(sel).first().selectOption('supervisor'); await sleep(300);
  ok(llamadas.some(l => l.accion === 'rol' && l.usuario_id === U2 && l.rol === 'supervisor'), 'D. Cambiar rol pasa por la función');
  await page.locator(sel).nth(1).selectOption('false'); await sleep(300);
  ok(llamadas.some(l => l.accion === 'estado' && l.usuario_id === U2 && l.activo === false), 'D. Desactivar pasa por la función (activo:false)');
  fallarSiguiente = 'rol';
  await page.locator('#tbUsuCfg tr:has-text("Esterlin") select').first().selectOption('cajero'); await sleep(500);
  const rolVuelve = await page.evaluate(() => [...document.querySelectorAll('#tbUsuCfg tr')].find(tr => /Esterlin/i.test(tr.innerText))?.querySelector('select')?.value);
  ok(rolVuelve === 'admin', 'D. Si la función rechaza el cambio, la lista vuelve al rol real', rolVuelve);
  await page.evaluate(() => confirmarCambiarLogin('00000000-0000-4000-8000-000000000002', 'robinson', 'robinsonp', null)); await sleep(300);
  ok(llamadas.some(l => l.accion === 'login' && l.login === 'robinsonp'), 'D. Cambiar usuario pasa por la función');
  await page.evaluate(() => eliminarUsu('00000000-0000-4000-8000-000000000003', null)); await sleep(300);
  ok(llamadas.some(l => l.accion === 'eliminar' && l.usuario_id === '00000000-0000-4000-8000-000000000003'), 'D. Eliminar pasa por la función');
  ok(escriturasDirectas.length === 0, 'D. Ya no se escribe usuarios_sistema directo desde el navegador', escriturasDirectas);
  ok(!llamadas.some(l => 'pwd' in l), 'C. No se manda ningún hash de clave');
  await page.screenshot({ path: OUT + 'usuarios-final.png' });

  ok(errs.length === 0, 'E. Sin errores en consola', errs);
  await browser.close();
  console.log(`\nResultado: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
