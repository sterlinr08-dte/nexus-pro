// QA del Buzón de WhatsApp compacto en el celular (parches-whatsapp-movil.js, 06-nov-2026).
// App real (index.html + cadena de parches) contra scripts/qa-crm-mock-server.js; 20 hilos simulados por page.route
// (Supabase real nunca se toca; no se envía nada). Mide a 390×844 (oscuro y claro) y a 1280×800:
//  · cabecera de una línea (44–56 px); los 5 datos + «Contactos» en 2 columnas, cada uno ≥44 px, dentro de la pantalla
//    y con el nombre entero (sin «…»); los botones ocultos del panel siguen ocultos;
//  · campana y lupa ≥44×44; filas: nombre ≥15 px, vista previa ≥13 px, etiqueta en la línea del nombre;
//  · la lista empieza más arriba y se ven ≥8 chats (antes 6); sin scroll de lado; tocar un dato filtra; tocar un chat lo abre;
//  · con nx_whatsapp_movil_off='1' queda como antes; a 1280 px no cambia nada.
// Uso: PORT=8954 node scripts/qa-crm-mock-server.js &   PORT=8954 node scripts/qa-whatsapp-movil.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium, devices } = pw;
const fs = require('fs'), path = require('path'), os = require('os');
const BASE = 'http://127.0.0.1:' + (process.env.PORT || 8954);
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-whatsapp-movil')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 700) : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const hace = ms => new Date(Date.now() - ms).toISOString();
const NOMS = ['Mercedes Ortiz', 'Juan R.', 'Ana Martinez', 'Pedro S', 'Luisa F.', 'Wilson', 'Rosa Jimenez', 'Miguel Torres', 'Carmen Diaz', 'Luis Peña', 'Sofia Reyes', 'Ramon Cruz', 'Elena Paredes', 'Jose Almonte', 'Maria Nuñez', 'Carlos Vidal', 'Yaneris Mota', 'Pablo Gil', 'Nelly Santos', 'Rafael Toribio'];
const HILOS = NOMS.map((n, i) => ({ id: U(9001 + i), telefono_e164: '+1809555' + String(1000 + i), cliente_id: i % 5 === 4 ? null : U(200 + i), nombre_perfil: n, asignado_agente_id: null, ultimo_mensaje_at: hace((i + 1) * 47 * 60e3), ultimo_mensaje_preview: 'Buenos días, quería saber sobre mi póliza ' + i, ultimo_inbound_at: hace((i + 1) * 47 * 60e3), ultima_respuesta_humana_at: hace(i * 47 * 60e3), no_leidos_count: i % 3 === 0 ? 2 : 0, created_at: hace(400 * 864e5), updated_at: hace(i * 60e3), fijado_at: null, archivado_at: null, silenciado_hasta: null, ultimo_mensaje_id: null, ultimo_mensaje_direccion: 'in', ultimo_mensaje_tipo: 'text', ultimo_mensaje_estado: null }));

async function abrir(browser, { width, off = false, claro = false }) {
  const movil = width < 500;
  const ctx = await browser.newContext(movil
    ? { ...devices['iPhone 13'], viewport: { width, height: 844 }, deviceScaleFactor: 2, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' }
    : { viewport: { width, height: 800 }, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { try { const u = r.request().url();
    if (/\/rest\/v1\/rpc\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    if (/\/functions\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
    if (/whatsapp_hilo_mensajes/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (/whatsapp_hilos/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HILOS) });
    if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, BASE + '/supa') }); return r.fulfill({ response: resp }); }
    return r.fulfill({ status: 200, contentType: /\.css|fonts\.googleapis/.test(u) ? 'text/css' : 'application/javascript', body: '' }); } catch (e) {} });
  await ctx.addInitScript(off => {
    localStorage.setItem('nx_tema', 'glass-oscuro'); localStorage.setItem('nx_auth_mode', 'legacy');
    if (off) localStorage.setItem('nx_whatsapp_movil_off', '1'); else localStorage.removeItem('nx_whatsapp_movil_off');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Esterlin Espinal', rol: 'admin', cargo: 'ADMIN', organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
    window.supabase = { createClient() { return { realtime: { setAuth: async () => {} }, channel() { const ch = { on() { return ch; }, subscribe(cb) { setTimeout(() => { if (typeof cb === 'function') cb('CHANNEL_ERROR'); }, 150); return ch; } }; return ch; } }; } };
  }, off);
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 30000 });
  await sleep(2500);
  if (claro) await page.evaluate(() => aplicarTema('clasico', false)); // false: no se guarda la preferencia
  await page.evaluate(() => { try { closeMobSB(); } catch (e) {} nav('waInbox', document.querySelector('#sbEl .ni[onclick^="nav(\'waInbox\'"]')); });
  await page.waitForSelector('#nxWaLista .nxWaRow', { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  return { ctx, page, errs };
}

const medir = page => page.evaluate(() => {
  const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right) }; };
  const vis = e => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
  const kpis = [...document.querySelectorAll('#v-waInbox .nxWaProKpi')].map(k => ({ ...box(k), l: k.querySelector('.l')?.textContent.trim(), entero: k.querySelector('.l') ? k.querySelector('.l').scrollWidth <= k.querySelector('.l').clientWidth + 1 : false, fs: parseFloat(getComputedStyle(k.querySelector('.l')).fontSize) }));
  const acts = [...document.querySelectorAll('#v-waInbox .nxWaProActs > button')].map(b => ({ c: b.className, t: b.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), vis: vis(b), ...box(b), fs: parseFloat(getComputedStyle(b).fontSize) }));
  const rows = [...document.querySelectorAll('#nxWaLista .nxWaRow')];
  const r0 = rows[0];
  const nom = r0?.querySelector('.nxWaWho > b'), prev = r0?.querySelector('.nxWaWho > span'), tag = r0?.querySelector('.nxWaWho > .nxWaTag');
  return {
    head: box(document.querySelector('#v-waInbox .nxCrmHomeHead')), kpis, acts,
    sonido: box(document.querySelector('#v-waInbox .nxWaSoundToggle')), lupa: box(document.querySelector('#v-waInbox .nxWaSearchToggle')),
    fila: box(r0), nomFs: nom && parseFloat(getComputedStyle(nom).fontSize), prevFs: prev && parseFloat(getComputedStyle(prev).fontSize),
    tagEnLinea: !!(nom && tag) && Math.abs((tag.getBoundingClientRect().top + tag.getBoundingClientRect().bottom) / 2 - (nom.getBoundingClientRect().top + nom.getBoundingClientRect().bottom) / 2) < 8,
    primeraFila: r0 ? Math.round(r0.getBoundingClientRect().top) : null,
    filasVisibles: rows.filter(r => { const b = r.getBoundingClientRect(); return b.height > 0 && b.top >= 0 && b.bottom <= innerHeight; }).length,
    sinLado: document.documentElement.scrollWidth <= innerWidth, vw: innerWidth,
    css: !!document.getElementById('nxWhatsappMovilCss'),
  };
});

(async () => {
  const browser = await chromium.launch();
  const antes = {};
  // Referencia: la capa apagada (como estaba)
  for (const width of [390, 1280]) {
    const { ctx, page, errs } = await abrir(browser, { width, off: true });
    antes[width] = await medir(page);
    await page.screenshot({ path: OUT + `antes-${width}.png` });
    ok(!antes[width].css, `${width} apagada: la capa no se monta con nx_whatsapp_movil_off`);
    ok(!errs.length, `${width} apagada: sin errores de página`, errs);
    await ctx.close();
  }
  for (const [width, claro] of [[390, false], [390, true], [1280, false]]) {
    const tag = width + (claro ? ' claro' : ' oscuro');
    console.log(`\n== ${tag} ==`);
    const { ctx, page, errs } = await abrir(browser, { width, claro });
    const m = await medir(page);
    await page.screenshot({ path: OUT + `despues-${width}${claro ? '-claro' : ''}.png` });
    ok(m.css, `${tag}: la capa está montada`);
    ok(m.sinLado, `${tag}: sin scroll de lado`);
    if (width === 1280) {
      ok(m.primeraFila === antes[1280].primeraFila && JSON.stringify(m.head) === JSON.stringify(antes[1280].head), '1280: nada cambia en la PC', { antes: antes[1280].primeraFila, ahora: m.primeraFila });
    } else {
      ok(m.head && m.head.h >= 44 && m.head.h <= 56, `${tag}: cabecera de una línea (${m.head?.h} px)`, m.head);
      ok(m.kpis.length === 5 && m.kpis.every(k => k.h >= 44 && k.x >= 0 && k.r <= m.vw), `${tag}: los 5 datos a la vista, ≥44 px y dentro de la pantalla`, m.kpis);
      ok(m.kpis.every(k => k.entero && k.fs >= 13), `${tag}: nombres de los datos enteros y ≥13 px`, m.kpis.map(k => [k.l, k.entero, k.fs]));
      const xs = new Set(m.kpis.map(k => k.x)); ok(xs.size === 2, `${tag}: 2 columnas`, [...xs]);
      const cont = m.acts.find(a => /nxWaVisualContactsBtn/.test(a.c));
      ok(cont && cont.vis && cont.h >= 44 && cont.w >= 44 && cont.fs >= 13 && Math.abs(cont.y - m.kpis[4].y) < 4, `${tag}: «Contactos» en la misma fila que el último dato, ≥44 px`, cont);
      const ocultos = m.acts.filter(a => !/nxWaVisualContactsBtn|nxWaBauchesBtn/.test(a.c));
      ok(ocultos.every(a => a.vis === antes[390].acts.find(b => b.c === a.c && b.t === a.t)?.vis), `${tag}: los demás botones del panel siguen como estaban (ocultos)`, ocultos.map(a => [a.t, a.vis]));
      ok(m.sonido && m.sonido.w >= 44 && m.sonido.h >= 44, `${tag}: campana ≥44×44 (antes ${antes[390].sonido?.w}×${antes[390].sonido?.h})`, m.sonido);
      ok(m.lupa && m.lupa.w >= 44 && m.lupa.h >= 44, `${tag}: lupa ≥44×44 (antes ${antes[390].lupa?.w}×${antes[390].lupa?.h})`, m.lupa);
      ok(m.fila.h >= 44 && m.nomFs >= 15 && m.prevFs >= 13, `${tag}: fila ${m.fila.h} px, nombre ${m.nomFs} px, vista previa ${m.prevFs} px (antes ${antes[390].nomFs}/${antes[390].prevFs})`);
      ok(m.tagEnLinea, `${tag}: la etiqueta va en la línea del nombre`);
      ok(m.primeraFila < antes[390].primeraFila - 40, `${tag}: la lista empieza más arriba (${antes[390].primeraFila} → ${m.primeraFila} px)`);
      ok(m.filasVisibles >= 8 && m.filasVisibles > antes[390].filasVisibles, `${tag}: chats a la vista ${antes[390].filasVisibles} → ${m.filasVisibles}`);
      // Tocar un dato filtra (misma función de antes)
      await page.locator('#v-waInbox .nxWaProKpi').nth(1).tap(); await sleep(500);
      ok(await page.evaluate(() => document.querySelectorAll('#v-waInbox .nxWaProKpi')[1].classList.contains('on')), `${tag}: tocar «Sin responder» lo marca`);
      await page.locator('#v-waInbox .nxWaProKpi').nth(0).tap(); await sleep(500);
      // Tocar un chat lo abre
      await page.locator('#nxWaLista .nxWaRow').first().tap(); await sleep(1500);
      const ch = await page.evaluate(() => ({ abierto: document.querySelector('#v-waInbox').classList.contains('nxWaChatOpen'), pro: getComputedStyle(document.querySelector('#v-waInbox .nxWaPro')).display, head: getComputedStyle(document.querySelector('#v-waInbox .nxCrmHomeHead')).display }));
      ok(ch.abierto, `${tag}: tocar un chat lo abre`);
      ok(ch.pro === 'none' && ch.head === 'none', `${tag}: con el chat abierto, cabecera y datos se esconden como antes`, ch);
      await page.screenshot({ path: OUT + `chat-${width}${claro ? '-claro' : ''}.png` });
    }
    ok(!errs.length, `${tag}: sin errores de página`, errs);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} PASS / ${fail} FAIL · capturas en ${OUT}`);
  process.exit(fail ? 1 : 0);
})();
