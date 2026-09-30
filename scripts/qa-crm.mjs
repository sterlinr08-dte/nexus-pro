// QA del CRM de NEXUS PRO (29-sep-2026): app real (index.html + cadena de parches) contra la REST simulada de
// scripts/qa-crm-mock-server.js. Uso: node scripts/qa-crm-mock-server.js & node scripts/qa-crm.mjs
// Capturas en $QA_OUT (por defecto <tmp>/qa-crm-nexus). Requiere playwright + Chromium (PW_CHROMIUM opcional).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const { chromium } = pw;
const path = require('path'), fs = require('fs'), os = require('os');
const http = require('http');
const BASE = 'http://127.0.0.1:8942';
const OUT = (process.env.QA_OUT || path.join(os.tmpdir(), 'qa-crm-nexus')) + path.sep; fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, m, extra) => { if (c) { pass++; console.log('PASS  ' + m); } else { fail++; console.log('FAIL  ' + m + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 400) : '')); } };
const qa = (p) => new Promise((r) => http.get(BASE + '/__qa/' + p, (res) => { let s = ''; res.on('data', c => s += c); res.on('end', () => { try { r(JSON.parse(s)); } catch (e) { r(s); } }); }));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function abrirApp(browser, { width, rol, nom }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 800 }, hasTouch: width < 500, isMobile: width < 500, locale: 'es-DO', timezoneId: 'America/Santo_Domingo' });
  const page = await ctx.newPage();
  const errs = [], dialogs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') { const t = m.text(); if (/Failed to load resource|net::ERR|favicon|tabler|googleapis|sentry|emailjs/i.test(t)) return; if (/\[CRM\][\s\S]*simulated failure/.test(t)) return; /* errTxt manda el error crudo a consola a propósito */ errs.push('console: ' + t); } });
  page.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message()); d.dismiss().catch(() => {}); });
  // Sin red externa: CDN, fuentes, Sentry y EmailJS responden vacío.
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { const u = r.request().url(); if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, 'http://127.0.0.1:8942/supa') }); return r.fulfill({ response: resp }); } return r.fulfill({ status: 200, contentType: /\.css/.test(u) ? 'text/css' : 'application/javascript', body: '' }); });
  await page.addInitScript(({ rol, nom }) => {
    localStorage.setItem('nx_auth_mode', 'legacy');
    sessionStorage.setItem('nx_sesion', JSON.stringify({ id: rol === 'admin' ? '00000000-0000-4000-8000-000000000001' : '00000000-0000-4000-8000-000000000002', nom, rol, cargo: rol.toUpperCase(), organizacion_id: '00000000-0000-4000-8000-000000000009', inicio: Date.now() }));
    sessionStorage.setItem('nx_sesion_actividad', String(Date.now())); sessionStorage.setItem('nx_ya_saludo', '1');
  }, { rol, nom });
  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  // 58.93: en el celular no hay barra lateral a la vista (el ítem vive en el cajón que abre ☰): basta con que exista.
  await page.waitForSelector('#nxCrmNav', { state: page.viewportSize().width < 769 ? 'attached' : 'visible', timeout: 20000 });
  await page.waitForFunction(() => typeof window.nxCrm === 'object' && typeof ST !== 'undefined' && (ST.clientes || []).length > 0, null, { timeout: 20000 });
  await sleep(600);
  return { ctx, page, errs, dialogs };
}
async function abrirCrm(page) {
  if (await page.$('#sbEl.mob-open') === null && page.viewportSize().width < 500) { /* menú móvil: abrir por JS, igual que el toque en la hamburguesa */ }
  await page.evaluate(() => nav('crm', document.getElementById('nxCrmNav')));
  await page.waitForSelector('#v-crm.on', { timeout: 5000 });
  if (!(await page.$('#nxCrmAgendaHost'))) await page.evaluate(() => nxCrm.tab('panel')); // el CRM recuerda la última pestaña (Prospectos)
  await page.waitForFunction(() => !document.querySelector('#nxCrmAgendaHost .nxOpsEmpty')?.textContent.includes('Cargando') && document.querySelectorAll('#nxCrmAgendaHost .nxOpsTask').length > 0, null, { timeout: 8000 });
  await sleep(200);
}
async function shot(page, name) {
  // La pantalla de carga («Cargando NEXUS PRO») se desvanece sola; esperar a que no tape la captura.
  await page.waitForFunction(() => ![...document.querySelectorAll('.nxs-brand')].some(e => { const r = e.closest('[class*="nxs"]') || e; return e.offsetParent !== null && getComputedStyle(r).opacity !== '0' && getComputedStyle(r).visibility !== 'hidden'; }), null, { timeout: 8000 }).catch(() => {});
  return page.screenshot({ path: OUT + name + '.png', fullPage: true });
}

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : (fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}));
  await qa('prospectos/reset');

  for (const width of [1280, 390]) {
    const tag = width === 390 ? 'movil' : 'escritorio';
    console.log(`\n=== ${tag} ${width}px · admin ===`);
    const { ctx, page, errs, dialogs } = await abrirApp(browser, { width, rol: 'admin', nom: 'Esterlin Espinal' });

    // 1) Panel CRM
    await abrirCrm(page);
    ok(await page.$eval('#pttl', e => e.textContent.trim()) === 'CRM', `${tag}: #pttl dice CRM`);
    ok(await page.$eval('#nxCrmNav', e => e.classList.contains('on')), `${tag}: menú CRM marcado`);
    const venc = await page.$eval('#nxCrmAttVencidas', e => e.textContent.trim());
    ok(venc === '4', `${tag}: seguimientos vencidos = 4 (consulta propia, no tope de 8)`, venc);
    const agendaRows = await page.$$eval('#nxCrmAgendaHost .nxOpsTask', x => x.length);
    ok(agendaRows === 8 && await page.$('#nxCrmAgendaHost .nxOpsMore') !== null, `${tag}: agenda muestra 8 y ofrece ver las 12`, agendaRows);
    ok(!(await page.$$eval('#v-crm', x => x.map(e => e.innerText).join(' '))).match(/\bafiliacion\b|\bseguimiento\b(?![^<]*<)/), `${tag}: sin slugs crudos en pantalla`);
    const sinPanelDup = await page.$$eval('#v-crm h3', hs => hs.filter(h => /Clientes en proceso/.test(h.textContent)).length);
    ok(sinPanelDup === 1, `${tag}: un solo panel "Clientes en proceso"`, sinPanelDup);
    // mesesAtraso: nueva vs. fórmula original, cliente por cliente
    const cmp = await page.evaluate(() => ST.clientes.map(c => [c.nom, nxCrm.qa.mesesAtraso(c), nxCrm.qa.mesesAtrasoLegacy(c)]));
    ok(cmp.every(x => x[1] === x[2]) && cmp.some(x => x[1] >= 2), `${tag}: mesesAtraso con memoria = fórmula original (${cmp.map(x => x[1]).join(',')})`, cmp);
    await shot(page, `01-panel-${tag}`);
    if (width === 390) {
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth, document.getElementById('v-crm').scrollWidth]);
      ok(sw[0] <= sw[1] && sw[2] <= sw[1] + 1, `${tag}: sin desborde horizontal`, sw);
      const fs = await page.evaluate(() => { const out = []; document.querySelectorAll('#v-crm *').forEach(el => { if (el.children.length === 0 && el.textContent.trim() && el.offsetParent) { const f = parseFloat(getComputedStyle(el).fontSize); if (f < 12) out.push([el.className, el.textContent.trim().slice(0, 20), f]); } }); return out; });
      ok(fs.length === 0, `${tag}: ningún texto visible menor de 12px`, fs.slice(0, 5));
      const taps = await page.evaluate(() => [...document.querySelectorAll('#v-crm .nxOpsCheck, #v-crm .nxCrmTopActs button, #v-crm .nxCrmSearch, #v-crm .nxCrmAtt')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height).filter(h => h < 44));
      ok(taps.length === 0, `${tag}: objetivos táctiles principales ≥ 44px`, taps);
    }

    // 2) Ficha desde el CRM (fila de tarea → Cliente 360 modo CRM → pestaña Seguimiento)
    const primeraTarea = await page.$eval('#nxCrmAgendaHost .nxOpsTask', e => e.dataset.id);
    await page.click('#nxCrmAgendaHost .nxOpsTask >> nth=0');
    await page.waitForSelector('#v-cliente360.on', { timeout: 5000 });
    ok(await page.$eval('#v-cliente360', e => e.classList.contains('nxCrm')), `${tag}: Cliente 360 en modo CRM`);
    ok(await page.$('#c360tab-dependientes') !== null && await page.$eval('#c360tab-historial', e => e.style.display === 'none'), `${tag}: pestañas CRM preparadas (Dependientes visible, Historial oculto)`);
    ok(await page.$eval('#pttl', e => e.textContent.trim()) === 'CLIENTE 360', `${tag}: título Cliente 360`);
    ok(await page.$('#c360TabBody .nxCrmAmount') !== null, `${tag}: resumen CRM pintado en la ficha`);
    await page.click('#c360tab-actividad');
    await page.waitForSelector('#c360TabBody .nxCrmTL, #c360TabBody .nxOpsEmpty', { timeout: 5000 });
    await sleep(200);
    const ficha = await page.evaluate(() => ({ hist: document.querySelectorAll('#c360TabBody .nxCrmTL li').length, tareas: document.querySelectorAll('#c360TabBody .nxOpsTask').length, txt: document.querySelector('#c360TabBody').innerText.slice(0, 200) }));
    ok(ficha.hist >= 1 && ficha.tareas >= 1, `${tag}: ficha muestra historial (${ficha.hist}) y tareas (${ficha.tareas})`, ficha);
    await shot(page, `02-ficha-${tag}`);
    // Registrar seguimiento desde la ficha
    await page.click('#c360TabBody button:has-text("Nota")');
    await page.waitForSelector('#nxOpsModal [role=dialog]');
    await page.fill('#nxActTitulo', 'Llamada de prueba QA');
    await page.click('#nxActGuardar');
    await page.waitForFunction(() => !document.getElementById('nxOpsModal'), null, { timeout: 5000 });
    await page.waitForFunction(() => /Llamada de prueba QA/i.test(document.querySelector('#c360TabBody')?.innerText || ''), null, { timeout: 5000 });
    ok(true, `${tag}: seguimiento registrado aparece en el historial`);
    // Volver al CRM: el contexto se apaga al navegar a Clientes y la ficha vuelve a ser la estándar
    await page.evaluate(() => nav('clientes', null));
    ok(await page.evaluate(() => window.__nxCrmCtx === false), `${tag}: contexto CRM se reinicia al navegar`);

    // 3) Nueva tarea con buscador de cliente
    await abrirCrm(page);
    const antesN = await page.evaluate(() => nxCrm.qa.estado().pendientes.length);
    await page.click('#v-crm .nxCrmTools button:has-text("Nueva tarea")');
    await page.waitForSelector('#nxOpsModal [role=dialog]');
    ok(await page.$('#nxOpsModal select#nxOpsCliente') === null && await page.$('#nxOpsClienteQ') !== null, `${tag}: el cliente se elige con buscador, no con <select>`);
    await page.fill('#nxOpsClienteQ', 'ana');
    await page.waitForSelector('#nxOpsClienteL [role=option]');
    const opciones = await page.$$eval('#nxOpsClienteL [role=option]', x => x.map(o => o.textContent));
    ok(opciones.length === 1 && /Ana Martinez/.test(opciones[0]), `${tag}: buscador filtra por nombre`, opciones);
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    ok(await page.$eval('#nxOpsCliente', e => e.value) !== '', `${tag}: cliente seleccionado con teclado`);
    await page.fill('#nxOpsTitulo', 'Tarea creada por QA');
    await page.selectOption('#nxOpsTipo', 'afiliacion');
    await page.click('#nxOpsGuardar');
    await page.waitForFunction(() => !document.getElementById('nxOpsModal'), null, { timeout: 5000 });
    await page.waitForFunction((n) => nxCrm.qa.estado().pendientes.length === n + 1, antesN, { timeout: 5000 });
    ok(await page.$$eval('#nxCrmAgendaHost .nxOpsTask b', x => x.some(b => /Tarea creada por QA/i.test(b.textContent))) || await page.$('#nxCrmAgendaHost .nxOpsMore') !== null, `${tag}: la tarea nueva está en la agenda recargada (${antesN} → ${antesN + 1})`);
    ok(await page.$eval('#v-crm', e => /Afiliaci/i.test(e.innerText)), `${tag}: el tipo se muestra como "Afiliación", no "afiliacion"`);
    await shot(page, `03-tarea-creada-${tag}`);

    // 4) Completar y deshacer
    await page.click('#nxCrmAgendaHost .nxOpsTask >> nth=0 >> .nxOpsCheck');
    await page.waitForSelector('#toastS .toast:has-text("Tarea completada")', { timeout: 5000 });
    await page.waitForFunction((n) => nxCrm.qa.estado().pendientes.length === n, antesN, { timeout: 5000 });
    ok(true, `${tag}: completar quita la tarea de pendientes (${antesN + 1} → ${antesN})`);
    ok(await page.$('#toastS .toast button:has-text("Deshacer")') !== null, `${tag}: aviso con Deshacer`);
    await page.click('#toastS .toast button:has-text("Deshacer")');
    await page.waitForFunction((n) => nxCrm.qa.estado().pendientes.length === n + 1, antesN, { timeout: 5000 });
    ok(true, `${tag}: Deshacer reabre la tarea (${antesN} → ${antesN + 1})`);
    const est = await qa('estado');
    ok(est.tareas.find(t => t.id === primeraTarea).estado === 'pendiente', `${tag}: en la "base" la tarea volvió a pendiente`);

    // 5) Filtro Mis tareas (admin = Esterlin Espinal → agente 101 por nombre) y búsqueda
    await page.click('#v-crm .nxCrmChips button:has-text("Mis tareas")');
    await page.waitForFunction(() => document.querySelector('#v-crm .nxCrmChips button[aria-pressed=true]')?.textContent.includes('Mis'), null, { timeout: 3000 });
    await sleep(300);
    const mias = await page.evaluate(() => { const s = nxCrm.qa.estado(); return { mi: s.miAgente, filas: document.querySelectorAll('#nxCrmAgendaHost .nxOpsTask').length, esperadas: s.agenda.filter(t => t.asignado_agente_id === s.miAgente).length }; });
    ok(mias.mi && mias.filas === Math.min(8, mias.esperadas) && mias.esperadas > 0 && mias.esperadas < 13, `${tag}: "Mis tareas" filtra por agente propio`, mias);
    await page.click('#v-crm .nxCrmChips button:has-text("Todas")');
    await page.fill('#nxCrmQ', 'Pedro');
    await sleep(250);
    const busq = await page.evaluate(() => ({ foco: document.activeElement?.id, filas: [...document.querySelectorAll('#nxCrmAgendaHost .nxOpsTask span')].map(s => s.textContent), riesgo: [...document.querySelectorAll('#v-crm .nxCrmRow b')].map(b => b.textContent) }));
    ok(busq.foco === 'nxCrmQ' && busq.filas.every(f => /Pedro/.test(f)) && busq.riesgo.every(r => /Pedro/.test(r)), `${tag}: búsqueda filtra tareas y clientes sin perder el foco`, busq);
    await page.fill('#nxCrmQ', '');
    await sleep(200);

    // 6) Escape cierra modal y no hay diálogos nativos
    await page.click('#v-crm .nxCrmTools button:has-text("Nueva tarea")');
    await page.waitForSelector('#nxOpsModal');
    await page.waitForSelector('#nxOpsClienteL:not([hidden])');
    await page.keyboard.press('Escape');
    ok(await page.$eval('#nxOpsClienteL', e => e.hidden) && await page.$('#nxOpsModal') !== null, `${tag}: primer Escape cierra la lista del buscador (patrón combobox)`);
    await page.keyboard.press('Escape');
    ok(await page.$('#nxOpsModal') === null, `${tag}: segundo Escape cierra la ventana`);

    // 7) Prospectos: tablero y movimientos
    await page.click('#v-crm .nxCrmSeg button:has-text("Prospectos")');
    await page.waitForSelector('#v-crm .nxProsBoard', { timeout: 5000 });
    const cols = await page.$$eval('#v-crm .nxProsCol', x => x.map(c => [c.querySelector('h3').textContent.trim(), c.querySelectorAll('.nxProsCard').length]));
    ok(cols.length === 4 && cols[0][1] === 2 && cols[1][1] === 1 && cols[2][1] === 1 && cols[3][1] === 0, `${tag}: 4 columnas con conteos 2/1/1/0`, cols);
    ok(await page.$$eval('#v-crm .nxProsCard.is-stale', x => x.length) === 1, `${tag}: 1 prospecto marcado sin movimiento ≥7 días`);
    ok(await page.$$eval('#v-crm .nxProsPerdidos .nxOpsTask', x => x.length) === 1, `${tag}: lista de perdidos con 1`);
    ok(await page.$eval('#v-crm .nxProsKpis', e => /Sin movimiento[\s\S]*1/i.test(e.innerText) && /Perdidos del mes/i.test(e.innerText)), `${tag}: KPIs de prospectos`);
    ok(await page.$$eval('#v-crm .nxProsCard a.wa', x => x.every(a => /^https:\/\/wa\.me\/1829/.test(a.href) && a.target === '_blank')), `${tag}: botón WhatsApp solo abre wa.me`);
    if (width === 390) { const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]); ok(sw[0] <= sw[1], `${tag}: tablero móvil sin desborde de página (carrusel interno)`, sw); }
    await shot(page, `04-prospectos-${tag}`);
    // nuevo → cotizado → documentos
    const uno = '00000000-0000-4000-8000-000000000601';
    const mover = async (id, etapa) => { await page.evaluate((id) => nxCrm.prosPasar(id), id); await page.waitForSelector('#nxProsPasar'); await page.click(`#nxProsPasar .nxCrmOpciones button:has-text("${etapa}")`); };
    await mover(uno, 'Cotizado'); await page.waitForFunction(() => document.querySelector('.nxProsCol.e-cotizado .nxProsCards').textContent.includes('Prospecto Nuevo Uno'), null, { timeout: 4000 });
    ok(true, `${tag}: Nuevo → Cotizado`);
    await mover(uno, 'Documentos'); await page.waitForFunction(() => document.querySelector('.nxProsCol.e-documentos .nxProsCards').textContent.includes('Prospecto Nuevo Uno'), null, { timeout: 4000 });
    ok(true, `${tag}: Cotizado → Documentos`);
    // perdida exige motivo (sin confirm/prompt nativos)
    await mover(uno, 'Perdida'); await page.waitForSelector('#nxProsMotivo');
    ok(await page.$eval('#nxProsMotOk', b => b.disabled), `${tag}: "Marcar como perdido" deshabilitado hasta elegir motivo`);
    await page.click('#nxProsMotivo [data-m="precio"]');
    await page.fill('#nxProsMotTx', 'RD$ 500 más caro que la competencia');
    await page.click('#nxProsMotOk');
    await page.waitForFunction(() => /Prospecto Nuevo Uno[\s\S]*Precio/i.test(document.querySelector('.nxProsPerdidos')?.innerText || ''), null, { timeout: 4000 });
    const estP = await qa('estado'); const p1 = estP.pros.find(p => p.id === uno);
    ok(p1.etapa === 'perdida' && p1.motivo_perdida === 'precio' && estP.hist.filter(h => h.prospecto_id === uno && h.tipo === 'etapa').length === 4, `${tag}: perdida con motivo y 4 filas de historial de etapa`, [p1.etapa, p1.motivo_perdida]);
    await shot(page, `05-prospecto-perdido-${tag}`);
    // reabrir
    await page.click('.nxProsPerdidos button:has-text("Reabrir")'); await page.waitForSelector('#nxProsPasar'); await page.click('#nxProsPasar .nxCrmOpciones button:has-text("Nuevo")');
    await page.waitForFunction(() => document.querySelector('.nxProsCol.e-nuevo .nxProsCards').textContent.includes('Prospecto Nuevo Uno'), null, { timeout: 4000 });
    ok((await qa('estado')).pros.find(p => p.id === uno).motivo_perdida === null, `${tag}: reabrir limpia el motivo`);
    // emitida con cliente vinculado
    const cuatro = '00000000-0000-4000-8000-000000000604';
    await mover(cuatro, 'Emitida'); await page.waitForSelector('#nxProsEmitida');
    await page.click('#nxProsEmitida button:has-text("Marcar como emitida")');
    ok(await page.$('#nxProsEmitida') !== null && await page.$('#toastS .toast:has-text("Vincula un cliente")') !== null, `${tag}: emitida sin cliente no avanza (aviso en pantalla)`);
    await page.fill('#nxProsCliQ', 'juan'); await page.waitForSelector('#nxProsCliL [role=option]'); await page.click('#nxProsCliL [role=option] >> nth=0');
    await page.fill('#nxProsPol', 'POL-QA-1');
    await page.click('#nxProsEmitida button:has-text("Marcar como emitida")');
    await page.waitForFunction(() => document.querySelector('.nxProsCol.e-emitida .nxProsCards').textContent.includes('Prospecto Documentos Cuatro'), null, { timeout: 4000 });
    const p4 = (await qa('estado')).pros.find(p => p.id === cuatro);
    ok(p4.etapa === 'emitida' && p4.cliente_id === '00000000-0000-4000-8000-000000000201' && p4.numero_poliza === 'POL-QA-1', `${tag}: emitida vinculada al cliente, sin facturas`, p4);
    ok((await qa('log')).filter(l => l.t === 'facturas' && l.m !== 'GET').length === 0 && (await qa('log')).filter(l => l.t === 'abonos' && l.m !== 'GET').length === 0, `${tag}: ningún escrito en facturas/abonos`);
    await page.click('.nxProsCol.e-emitida .nxProsCard >> nth=0 >> button:has-text("Ver cliente")');
    await page.waitForSelector('#v-cliente360.on');
    ok(true, `${tag}: "Ver cliente" abre la ficha del cliente vinculado`);
    await abrirCrm(page);
    await page.click('#v-crm .nxCrmSeg button:has-text("Prospectos")'); await page.waitForSelector('#v-crm .nxProsBoard');
    // rollback ante error del servidor
    await qa('fallar/1');
    const dos = '00000000-0000-4000-8000-000000000602';
    await mover(dos, 'Cotizado');
    await page.waitForSelector('#toastS .toast:has-text("No se pudo mover")', { timeout: 4000 });
    await sleep(200);
    const rb = await page.evaluate(() => document.querySelector('.nxProsCol.e-nuevo .nxProsCards').textContent.includes('Prospecto Frio Dos'));
    const tx = await page.$eval('#toastS .toast:has-text("No se pudo mover")', e => e.textContent);
    ok(rb && !/simulated/.test(tx), `${tag}: error del servidor → vuelve a su columna y el mensaje es en español`, tx);
    // ficha del prospecto + nota
    await page.click('.nxProsCol.e-nuevo .nxProsCard >> nth=0');
    await page.waitForSelector('#nxProsFicha');
    await page.waitForSelector('#nxProsFicha .nxCrmTL li');
    await page.fill('#nxProsNotaTx', 'Nota de QA en el prospecto'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => /Nota de QA en el prospecto/i.test(document.querySelector('#nxProsFicha')?.innerText || ''), null, { timeout: 4000 });
    ok(true, `${tag}: ficha de prospecto con historial y nota nueva`);
    await shot(page, `06-prospecto-ficha-${tag}`);
    await page.keyboard.press('Escape');
    ok(await page.$('#nxProsFicha') === null, `${tag}: Escape cierra la ficha del prospecto`);
    // nuevo prospecto
    await page.click('#v-crm button:has-text("Nuevo prospecto")'); await page.waitForSelector('#nxProsModal');
    await page.fill('#nxProsNom', 'Prospecto QA Nuevo'); await page.fill('#nxProsTel', '8299998877'); await page.fill('#nxProsInt', 'Seguro de vida');
    await page.click('#nxProsGuardar');
    await page.waitForFunction(() => document.querySelector('.nxProsCol.e-nuevo .nxProsCards').textContent.toLowerCase().includes('prospecto qa nuevo'), null, { timeout: 4000 });
    ok(true, `${tag}: nuevo prospecto guardado en la columna Nuevo`);

    // 8) WhatsApp Inbox sigue pintando (ids/clases compartidas intactas)
    await page.evaluate(() => nav('waInbox', document.getElementById('nxWaInboxNav')));
    await page.waitForSelector('#v-waInbox.on', { timeout: 5000 });
    await sleep(600);
    const wa = await page.evaluate(() => ({ head: !!document.querySelector('#v-waInbox .nxCrmHomeHead h1'), h1: document.querySelector('#v-waInbox .nxCrmHomeHead h1')?.textContent, orden: [...document.querySelectorAll('#sbNav .ni')].map(n => n.id).filter(Boolean).slice(0, 4), crmNext: document.getElementById('nxCrmNav')?.nextElementSibling?.id }));
    ok(wa.head && /Inbox/i.test(wa.h1) && wa.crmNext === 'nxWaInboxNav', `${tag}: Buzón WhatsApp renderiza con .nxCrmHomeHead y su menú sigue tras #nxCrmNav`, wa);
    await shot(page, `07-whatsapp-inbox-${tag}`);

    ok(dialogs.length === 0, `${tag}: sin diálogos nativos`, dialogs);
    ok(errs.length === 0, `${tag}: sin errores de consola`, errs);
    await page.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
    await qa('prospectos/reset');
  }

  // Rol agente (390): ve toda la cartera, "Mis tareas" filtra por su nombre, prospectos visibles.
  console.log('\n=== móvil 390px · agente ===');
  {
    const { ctx, page, errs, dialogs } = await abrirApp(browser, { width: 390, rol: 'agente', nom: 'Robinson Perez' });
    await abrirCrm(page);
    ok(await page.$eval('#nxCrmAttVencidas', e => e.textContent.trim()) === '4', 'agente: ve las mismas 4 vencidas de toda la cartera (sin restricción por agente)');
    await page.click('#v-crm .nxCrmChips button:has-text("Mis tareas")'); await sleep(400);
    const m = await page.evaluate(() => { const s = nxCrm.qa.estado(); return { mi: s.miAgente, filas: document.querySelectorAll('#nxCrmAgendaHost .nxOpsTask').length, esperadas: s.agenda.filter(t => t.asignado_agente_id === s.miAgente).length }; });
    ok(m.mi === '00000000-0000-4000-8000-000000000102' && m.filas === m.esperadas, 'agente: "Mis tareas" usa su agente (Robinson) por nombre', m);
    await shot(page, '08-agente-mis-tareas-movil');
    await page.click('#v-crm .nxCrmSeg button:has-text("Prospectos")'); await page.waitForSelector('#v-crm .nxProsBoard');
    ok(await page.$$eval('#v-crm .nxProsCard', x => x.length) === 4, 'agente: ve todos los prospectos');
    // Sin tabla → "Pendiente de activar"
    await qa('prospectos/0');
    await page.click('#v-crm button[aria-label="Actualizar prospectos"]');
    await page.waitForSelector('#v-crm .nxProsPend', { timeout: 4000 });
    ok(await page.$eval('#v-crm .nxProsPend', e => /Pendiente de activar/i.test(e.innerText)), 'sin crm_prospectos: estado "Pendiente de activar" (sin error)');
    await shot(page, '09-prospectos-pendiente-activar-movil');
    await qa('prospectos/reset');
    ok(dialogs.length === 0, 'agente: sin diálogos nativos', dialogs);
    ok(errs.length === 0, 'agente: sin errores de consola', errs);
    await page.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
  }

  // Organización tipo tienda: el menú CRM no debe aparecer ni abrirse.
  console.log('\n=== escritorio · organización tienda ===');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { const u = r.request().url(); if (/supabase\.co\//.test(u)) { const resp = await r.fetch({ url: u.replace(/^https:\/\/[^/]+/, 'http://127.0.0.1:8942/supa') }); return r.fulfill({ response: resp }); } return r.fulfill({ status: 200, contentType: /\.css/.test(u) ? 'text/css' : 'application/javascript', body: '' }); });
    await page.addInitScript(() => {
      localStorage.setItem('nx_auth_mode', 'legacy');
      sessionStorage.setItem('nx_sesion', JSON.stringify({ id: '00000000-0000-4000-8000-000000000001', nom: 'Dueño Tienda', rol: 'admin', cargo: 'ADMIN', inicio: Date.now() }));
      sessionStorage.setItem('nx_ya_saludo', '1');
    });
    await qa('orgtipo/tienda'); // la organización del usuario es una tienda (nxCargarOrg marca body.org-tienda)
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.nxCrm === 'object' && document.body.classList.contains('org-tienda'), null, { timeout: 20000 });
    await sleep(1500);
    const t = await page.evaluate(() => { const n = document.getElementById('nxCrmNav'); let r = null; try { r = nav('crm', null); } catch (e) { r = 'err ' + e.message; } window.dispatchEvent(new Event('nexus:reinit')); return { navVisible: !!n && n.style.display !== 'none' && n.offsetParent !== null, crmOn: !!document.querySelector('#v-crm.on'), r, abrirDirecto: (window.nxAbrirCrm(null), !!document.querySelector('#v-crm.on')) }; });
    ok(!t.navVisible && !t.crmOn && !t.abrirDirecto, 'tienda: el menú CRM no se ve y ni nav("crm") ni nxAbrirCrm abren el CRM', t);
    await qa('orgtipo/seguros');
    await page.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
  }

  await browser.close();
  console.log(`\nRESULTADO: ${pass} PASS · ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ERROR FATAL', e); process.exit(2); });
