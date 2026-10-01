// Prueba automática de los botones de navegación de ventanas (Atrás/Cerrar).
// Uso:  NODE_PATH=/opt/node22/lib/node_modules node scripts/test-nav-botones.mjs [--sin-capa] [--capturas DIR]
// Requiere un servidor estático en http://127.0.0.1:8787 (p. ej. `npx http-server -p 8787 -c-1 .`).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SIN_CAPA = process.argv.includes('--sin-capa');
const CAPTURAS = (() => { const i = process.argv.indexOf('--capturas'); return i > 0 ? process.argv[i + 1] : null; })();
const BASE = process.env.NX_BASE || 'http://127.0.0.1:8787';
const MEDIR = fs.readFileSync(new URL('./nav-apple/medir.js', import.meta.url), 'utf8');

// Ventanas reales que se pueden abrir sin datos de Supabase.
// `abrir` corre en la página; `apilaSobre` abre antes otra ventana para probar el caso apilado.
const VENTANAS = [
  { nombre: 'mCli',        abrir: "openM('mCli')" },
  { nombre: 'mAbono',      abrir: "openM('mAbono')" },
  { nombre: 'mEmp',        abrir: "openM('mEmp')" },
  { nombre: 'mAgente',     abrir: "openM('mAgente')" },
  { nombre: 'mAsiento',    abrir: "openM('mAsiento')" },
  { nombre: 'mUsuario',    abrir: "openM('mUsuario')" },
  { nombre: 'mPDF',        abrir: "openM('mPDF')" },
  { nombre: 'mErrorLog',   abrir: "openM('mErrorLog')" },
  { nombre: 'mDocs',       abrir: "openM('mDocs')" },
  { nombre: 'mBackup',     abrir: "openM('mBackup')" },
  { nombre: 'mHistCobros', abrir: "openM('mHistCobros')" },
  { nombre: 'mInhab sobre mCli', abrir: "openM('mInhab')", apilaSobre: "openM('mCli')", apilada: true },
  // Dinámicas (POS): «← Volver» en texto a la derecha y `.nxPf > .head` con flecha a la izquierda
  { nombre: 'POS nxPosCats', abrir: "window.nxPosCategorias && window.nxPosCategorias()", dinamica: true },
  { nombre: 'POS nxPrefM',   abrir: "window.nxPrefLista && window.nxPrefLista()", dinamica: true },
];

const VIEWPORTS = [
  { nombre: 'iphone-390', width: 390, height: 844, movil: true, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { nombre: 'escritorio-1280', width: 1280, height: 800, movil: false },
];

const fallos = [];
let checks = 0;
function check(cond, msg) { checks++; if (!cond) fallos.push(msg); }

async function prepararPagina(ctx) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  const errores = [];
  page.on('pageerror', (e) => errores.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_|supabase|Failed to load resource|Failed to fetch|net::/i.test(m.text())) errores.push('console: ' + m.text()); });
  if (SIN_CAPA) await page.route(/parches-nav-apple\.js/, (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* sin capa */' }));
  await page.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__nxSegurosLoader20260906 && document.querySelector('#nx-semi-glass-global-css'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  // Entrar sin Supabase: sesión ficticia y app visible (misma ruta que iniciarApp, sin red).
  await page.evaluate(() => {
    sesion = { id: 'qa', nom: 'QA NAV', rol: 'admin' };
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
  });
  await page.addScriptTag({ content: MEDIR });
  return { page, errores };
}

async function cerrarTodo(page) {
  await page.evaluate(() => { document.querySelectorAll('.overlay.open').forEach((o) => { if (o.id && /^m[A-Z]/.test(o.id)) o.classList.remove('open'); else o.remove(); }); });
  await page.waitForTimeout(80);
}

async function probarVentana(page, vp, v) {
  await cerrarTodo(page);
  if (v.apilaSobre) { await page.evaluate(v.apilaSobre); await page.waitForTimeout(120); }
  try { await page.evaluate(v.abrir); } catch (e) { if (v.dinamica) return { ok: false, motivo: 'no abrió: ' + String(e.message).slice(0, 60) }; throw e; }
  await page.waitForTimeout(650); // deja terminar la entrada
  const m = await page.evaluate(() => window.nxMedirVentana());
  const tag = `[${vp.nombre}] ${v.nombre}`;
  if (!m.ok && v.dinamica) return m; // sin datos del POS la ventana puede no existir: se informa, no falla
  if (!m.ok) { check(false, `${tag}: ${m.motivo}`); return m; }
  const tam = vp.movil ? 44 : 36;
  const salidas = m.salidas;
  check(salidas.length >= 1, `${tag}: sin salida visible en la cabecera`);
  check(m.nX + m.nBack === salidas.length, `${tag}: salidas ambiguas (${JSON.stringify(salidas.map((s) => s.kind))})`);
  if (v.apilada) {
    check(m.nBack === 1 && m.nX === 0, `${tag}: apilada debe tener solo ‹ (tiene X=${m.nX} back=${m.nBack})`);
    salidas.filter((s) => s.kind === 'back').forEach((s) => check(s.lado === 'izq', `${tag}: ‹ debe ir a la izquierda`));
    salidas.filter((s) => s.kind === 'back').forEach((s) => check(s.icon !== 'ti-arrow-left' || s.cls.includes('nx-nav-btn'), `${tag}: ‹ debe ser chevron, no flecha`));
  } else {
    check(m.nX === 1, `${tag}: debe haber exactamente una ✕ (hay ${m.nX})`);
    check(m.nBack === 0, `${tag}: ventana suelta no debe tener flecha/volver (hay ${m.nBack})`);
    salidas.filter((s) => s.kind === 'x').forEach((s) => check(s.lado === 'der', `${tag}: ✕ debe ir a la derecha`));
  }
  for (const s of salidas) {
    check(Math.abs(s.w - tam) <= 1 && Math.abs(s.h - tam) <= 1, `${tag}: tamaño ${s.w}×${s.h}, esperado ${tam}×${tam}`);
    check(s.circulo, `${tag}: el botón debe ser un círculo`);
    check(!s.texto, `${tag}: texto visible en el botón («${s.texto}»)`);
    check(s.contraste >= 4.5, `${tag}: contraste ${s.contraste} < 4.5`);
    check(/^(Cerrar|Volver)$/.test(s.aria), `${tag}: aria-label «${s.aria}»`);
  }
  check(m.tituloCentrado, `${tag}: título no centrado (desvío ${m.desvioTitulo}px)`);
  if (CAPTURAS) {
    fs.mkdirSync(CAPTURAS, { recursive: true });
    await page.screenshot({ path: path.join(CAPTURAS, `${SIN_CAPA ? 'antes' : 'despues'}-${vp.nombre}-${v.nombre.replace(/\W+/g, '_')}.png`), fullPage: false });
  }
  return m;
}

async function probarComportamiento(page, vp) {
  if (SIN_CAPA) return;
  const tag = `[${vp.nombre}] comportamiento`;
  // ✕ cierra; ‹ vuelve a la ventana de abajo
  await cerrarTodo(page);
  await page.evaluate("openM('mCli')"); await page.waitForTimeout(100);
  await page.evaluate("openM('mInhab')"); await page.waitForTimeout(400);
  await page.click('#mInhab .mt .nx-nav-btn[data-nx-kind="back"]');
  await page.waitForTimeout(100);
  let st = await page.evaluate(() => ({ inhab: document.getElementById('mInhab').classList.contains('open'), cli: document.getElementById('mCli').classList.contains('open') }));
  check(!st.inhab && st.cli, `${tag}: ‹ debe cerrar la de arriba y dejar la de abajo (${JSON.stringify(st)})`);
  await page.click('#mCli .mt .nx-nav-btn[data-nx-kind="x"]');
  await page.waitForTimeout(100);
  st = await page.evaluate(() => document.getElementById('mCli').classList.contains('open'));
  check(!st, `${tag}: ✕ debe cerrar la ventana`);

  // Entrada: animación presente y se repite al reabrir
  await page.evaluate("openM('mCli')");
  const anim1 = await page.evaluate(() => { const b = document.querySelector('#mCli .mt .nx-nav-btn'); return b && b.classList.contains('nx-nav-enter') && getComputedStyle(b).animationName; });
  check(anim1 === 'nxNavIn', `${tag}: entrada del botón (animationName=${anim1})`);
  await page.waitForTimeout(600);
  await page.evaluate("closeM('mCli')"); await page.waitForTimeout(50);
  await page.evaluate("openM('mCli')");
  const anim2 = await page.evaluate(() => { const b = document.querySelector('#mCli .mt .nx-nav-btn'); const a = b.getAnimations ? b.getAnimations() : []; return a.length && a[0].currentTime < 200; });
  check(!!anim2, `${tag}: la entrada debe repetirse al reabrir`);
  await page.waitForTimeout(600);

  // Hundido medido en pointer-down (≥ 90 ms, escala ≈ .86)
  const box = await page.locator('#mCli .mt .nx-nav-btn[data-nx-kind="x"]').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const esc = await page.evaluate(() => { const b = document.querySelector('#mCli .mt .nx-nav-btn[data-nx-kind="x"]'); const m = new DOMMatrix(getComputedStyle(b).transform); return { press: b.classList.contains('nx-press'), scale: +m.a.toFixed(2) }; });
  check(esc.press && esc.scale <= 0.9, `${tag}: pulsado debe hundir a ~.86 (${JSON.stringify(esc)})`);
  // Arrastrar fuera cancela sin ejecutar (hacia el cuerpo del modal: soltar sobre el fondo ya cerraba antes, es «tocar fuera»)
  await page.mouse.move(cx - 120, cy + 120, { steps: 4 });
  await page.waitForTimeout(60);
  const cancel = await page.evaluate(() => !document.querySelector('#mCli .mt .nx-nav-btn.nx-press'));
  await page.mouse.up();
  await page.waitForTimeout(80);
  const sigue = await page.evaluate(() => document.getElementById('mCli').classList.contains('open'));
  check(cancel && sigue, `${tag}: arrastrar fuera debe cancelar sin cerrar (press=${!cancel}, abierta=${sigue})`);

  // Esc: suelta cierra; apilada vuelve una; respeta buscador abierto
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  check(!(await page.evaluate(() => document.getElementById('mCli').classList.contains('open'))), `${tag}: Esc debe cerrar la ventana suelta`);
  await page.evaluate("openM('mCli');openM('mInhab')"); await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  st = await page.evaluate(() => ({ inhab: document.getElementById('mInhab').classList.contains('open'), cli: document.getElementById('mCli').classList.contains('open') }));
  check(!st.inhab && st.cli, `${tag}: Esc en apilada debe volver solo una (${JSON.stringify(st)})`);
  await page.evaluate(() => { const p = document.createElement('div'); p.id = 'qaEscPropio'; p.setAttribute('data-nx-esc-propio', ''); p.textContent = 'menú'; document.body.appendChild(p); });
  await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  check(await page.evaluate(() => document.getElementById('mCli').classList.contains('open')), `${tag}: Esc no debe cerrar la ventana si otro elemento ya maneja Esc`);
  await page.evaluate(() => document.getElementById('qaEscPropio').remove());
  if (!vp.movil) {
    const tip = await page.getAttribute('#mCli .mt .nx-nav-btn[data-nx-kind="x"]', 'title');
    check(tip === 'Cerrar (Esc)', `${tag}: tooltip «${tip}»`);
  }
  await cerrarTodo(page);

  // Deslizar (solo móvil)
  if (vp.movil) {
    const cdp = await page.context().newCDPSession(page);
    const toca = async (pts, soltar = true) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0].x, y: pts[0].y }] });
      for (let i = 1; i < pts.length; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: pts[i].x, y: pts[i].y }] }); await page.waitForTimeout(pts[i].dt || 16); }
      if (soltar) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await page.evaluate("openM('mCli')"); await page.waitForTimeout(500);
    const hb = await page.locator('#mCli .mt').boundingBox();
    const hx = hb.x + hb.width / 2, hy = hb.y + hb.height / 2;
    // 1:1 (±2 px): mover 10 px de histéresis + 60 px → el modal debe estar a ~60 px
    await toca([{ x: hx, y: hy }, { x: hx, y: hy + 10 }, { x: hx, y: hy + 40, dt: 30 }, { x: hx, y: hy + 70, dt: 30 }], false);
    const ty = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('#mCli .modal')).transform).f);
    check(Math.abs(ty - 60) <= 2, `${tag}: deslizar 1:1 (translateY=${ty.toFixed(1)}, esperado 60±2)`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(SP_T1 + 150);
    const vuelto = await page.evaluate(() => ({ abierta: document.getElementById('mCli').classList.contains('open'), t: document.querySelector('#mCli .modal').style.transform }));
    check(vuelto.abierta && !vuelto.t, `${tag}: deslizar corto debe volver y limpiar (${JSON.stringify(vuelto)})`);
    // Largo: cierra y limpia
    await toca([{ x: hx, y: hy }, { x: hx, y: hy + 10 }, { x: hx, y: hy + 120, dt: 40 }, { x: hx, y: hy + 260, dt: 40 }, { x: hx, y: hy + 330, dt: 40 }]);
    await page.waitForTimeout(600);
    const cerrada = await page.evaluate(() => ({ abierta: document.getElementById('mCli').classList.contains('open'), t: document.querySelector('#mCli .modal').style.transform, op: getComputedStyle(document.querySelector('#mCli .modal')).opacity }));
    check(!cerrada.abierta && !cerrada.t, `${tag}: deslizar largo debe cerrar y dejar sin desplazamiento (${JSON.stringify(cerrada)})`);
    await page.evaluate("openM('mCli')"); await page.waitForTimeout(500); // deja terminar la animación de apertura del modal
    const limpio = await page.evaluate(() => { const m = document.querySelector('#mCli .modal'); return { t: m.style.transform, op: getComputedStyle(m).opacity, cls: m.className }; });
    check(!limpio.t && limpio.op === '1' && !/nx-nav-(leaving|settle|dragging)/.test(limpio.cls), `${tag}: tras cerrar deslizando, la próxima apertura debe estar limpia (${JSON.stringify(limpio)})`);
    await cerrarTodo(page);
  }
}

async function probarReducido(browser, vp) {
  if (SIN_CAPA) return;
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
  const { page, errores } = await prepararPagina(ctx);
  await page.evaluate("openM('mCli')"); await page.waitForTimeout(50);
  const r = await page.evaluate(() => { const b = document.querySelector('#mCli .mt .nx-nav-btn'); const cs = getComputedStyle(b); return { anim: cs.animationName, tr: cs.transitionProperty }; });
  check(r.anim === 'none' && /opacity/.test(r.tr) && !/transform/.test(r.tr), `[${vp.nombre}] reduced-motion: solo fundido (${JSON.stringify(r)})`);
  check(errores.length === 0, `[${vp.nombre}] reduced-motion: errores de consola ${errores.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

let SP_T1 = 600;
const browser = await chromium.launch();
const resumen = [];
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.deviceScaleFactor || 1, ignoreHTTPSErrors: true });
  const { page, errores } = await prepararPagina(ctx);
  SP_T1 = await page.evaluate(() => (window.__nxNavResortes ? Math.round(window.__nxNavResortes.d100.dur * 1000) : 600));
  for (const v of VENTANAS) {
    const m = await probarVentana(page, vp, v);
    resumen.push({ vp: vp.nombre, ventana: v.nombre, ...(m.ok ? { salidas: m.salidas.map((s) => `${s.kind}@${s.lado} ${s.w}x${s.h}${s.circulo ? '●' : '▭'} ${s.icon || s.texto}`), titulo: m.tituloCentrado ? 'centrado' : `desvío ${m.desvioTitulo}px` } : { error: m.motivo }) });
  }
  await probarComportamiento(page, vp);
  check(errores.length === 0, `[${vp.nombre}] errores de consola: ${errores.slice(0, 3).join(' | ')}`);
  await ctx.close();
  await probarReducido(browser, vp);
}
await browser.close();

console.log(`\n== ${SIN_CAPA ? 'ANTES (sin capa)' : 'DESPUÉS (con capa)'} ==`);
for (const r of resumen) console.log(`${r.vp.padEnd(16)} ${r.ventana.padEnd(22)} ${r.error || r.salidas.join(' · ') + ' | título ' + r.titulo}`);
console.log(`\nComprobaciones: ${checks}  Fallos: ${fallos.length}`);
for (const f of fallos) console.log(' ✗ ' + f);
if (process.env.NX_JSON) fs.writeFileSync(process.env.NX_JSON, JSON.stringify({ sinCapa: SIN_CAPA, checks, fallos, resumen }, null, 2));
process.exit(fallos.length && !SIN_CAPA ? 1 : 0);
