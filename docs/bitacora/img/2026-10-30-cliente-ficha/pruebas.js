// Pruebas de la ficha del cliente 59.73 (solo lectura: API simulada en memoria, red a Supabase bloqueada).
// uso: NODE_PATH=/opt/node22/lib/node_modules node pruebas.js http://localhost:8767 390|1280
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2]; const VW = +process.argv[3] || 390; const OUT = __dirname;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: VW, height: VW < 500 ? 844 : 900 }, isMobile: VW < 500, hasTouch: VW < 500 });
  const p = await ctx.newPage(); const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  await p.route('**/*', r => { const u = r.request().url(); if (/localhost:87\d\d/.test(u) || (/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|cdnjs|unpkg/.test(u) && !/supabase/.test(u))) return r.continue(); return r.abort(); });
  await p.addInitScript(() => { localStorage.setItem('nx_splash_shown', '1'); localStorage.setItem('nx_tema', 'glass-oscuro'); });
  await p.goto(BASE + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(9000);
  await p.evaluate(() => {
    sesion = { id: 'u1', nom: 'Auditor', rol: 'admin', usuario: 'aud', es_superadmin: true, org_id: 'o1' };
    ST.clientes = [
      { id: 'c1', nom: 'VIEJO CEDULA MALA', cedula: '001-1234567-0', wa: '13055551234', tel: '305-555', plan: 'Básico', activo: true, deps: [], estado_cliente: 'ACTIVO', deuda_anterior: 0 },
      { id: 'c2', nom: 'OTRO CLIENTE', cedula: '00112345673', wa: '18295550000', plan: 'Básico', activo: true, deps: [] }];
    ST.agentes = [{ id: 'a1', nom: 'ROBINSON', activo: true }, { id: 'a2', nom: 'ESTERLIN', activo: true }]; ST.empresas = []; ST.usuarios = []; ST.facturas = [];
    document.getElementById('loginScreen').style.display = 'none'; document.getElementById('app').style.display = 'flex';
    // API simulada: registra llamadas; comportamiento por prueba en window.__modo
    window.__calls = []; window.__toasts = []; window.__modo = 'ok'; window.__pol = 0;
    const A = window.API || API;
    A.get = async (t, q) => { __calls.push({ m: 'get', t, q }); if (__modo === 'dupwa' && t === 'clientes') return [{ id: 'zz', nom: 'CLIENTE EN LA BASE', activo: true }]; return []; };
    A.post = async (t, d) => {
      __calls.push({ m: 'post', t, d: JSON.parse(JSON.stringify(d)) });
      if (t.startsWith('rpc/seguros_siguiente_numero_poliza')) return { numero: 'POL-' + (++__pol) };
      if (__modo === 'red') throw new Error('TypeError: Failed to fetch');
      if (__modo === 'colvip' && 'vip' in d) throw new Error(JSON.stringify({ code: 'PGRST204', message: "Could not find the 'vip' column of 'clientes' in the schema cache" }));
      if (__modo === 'lento') await new Promise(r => setTimeout(r, 14000));
      return [{ ...d, id: 'n' + __calls.length }];
    };
    A.patch = async (t, f, d) => { __calls.push({ m: 'patch', t, f, d: JSON.parse(JSON.stringify(d)) }); if (__modo === 'red') throw new Error('Failed to fetch'); return []; };
    const ot = window.toast; window.toast = function (k, a, b) { __toasts.push([k, a, b || ''].join(' | ')); try { return ot.apply(this, arguments); } catch (e) { } }; try { toast = window.toast; } catch (e) { }
    window.logAudit = () => { };
    window.__orig = JSON.stringify(ST.clientes);
  });
  const R = [];
  const ok = (nombre, cond, det) => { R.push({ prueba: nombre, ok: !!cond, det }); console.log(cond ? 'OK ' : 'FALLA', nombre, det ? JSON.stringify(det).slice(0, 220) : ''); };
  const abrir = async (modo = 'nuevo', id) => p.evaluate(async ({ modo, id }) => { document.querySelectorAll('.swal-overlay').forEach(s => s.remove()); window.nxCliMarcarLimpio && nxCliMarcarLimpio(); closeM('mCli'); await new Promise(r => setTimeout(r, 150)); ST.clientes = JSON.parse(__orig); __calls.length = 0; __toasts.length = 0; if (modo === 'nuevo') abrirNuevoCli(); else editarCli(id); await new Promise(r => setTimeout(r, 400)); }, { modo, id });
  const llenar = async (v) => p.evaluate(v => { for (const [k, x] of Object.entries(v)) { const e = document.getElementById(k); if (!e) continue; if (e.type === 'checkbox') e.checked = x; else e.value = x; } }, v);
  const guardar = async (espera = 600) => { await p.evaluate(() => { window.__gp = window.guardarCli(); }); await p.waitForTimeout(espera); return p.evaluate(() => ({ calls: __calls.filter(c => c.t === 'clientes' && c.m !== 'get'), rpc: __calls.filter(c => c.t.startsWith('rpc/seguros_siguiente_numero_poliza')).length, gets: __calls.filter(c => c.m === 'get').length, toasts: [...__toasts], abierta: document.getElementById('mCli').classList.contains('open'), swal: !!document.querySelector('.swal-overlay'), btn: document.getElementById('btnGCli').disabled })); };
  const swal = async (txt) => p.evaluate(t => { const b = [...document.querySelectorAll('.swal-overlay button')].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, txt);
  const base = { cNom: 'Juan Pérez', cWA: '809 555 1234' };

  // 1. Alta normal + formatos + cumpleaños
  await abrir(); await llenar({ ...base, cCed: '00118827567', cTel: '+1 (829) 555-0001', cEmail: 'juan@correo.com', cFecNac: '1990-02-03', cAgt: 'a1' });
  let r = await guardar(); let d = r.calls[0] && r.calls[0].d;
  ok('alta normal guarda 1 vez', r.calls.length === 1 && !r.abierta, { n: r.calls.length, toasts: r.toasts });
  ok('cédula guardada 001-1882756-7, wa 18095551234, tel 829-555-0001', d && d.cedula === '001-1882756-7' && d.wa === '18095551234' && d.tel === '829-555-0001', d && { ced: d.cedula, wa: d.wa, tel: d.tel });
  ok('fecha_nacimiento en el mismo INSERT', d && d.fecha_nacimiento === '1990-02-03');
  ok('activo true y estado ACTIVO', d && d.activo === true && d.estado_cliente === 'ACTIVO');
  // 2. Cortesía
  await abrir(); await llenar({ ...base, cWA: '8295559999', cPermFact: false }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('cortesía: permitir_facturacion=false', d && d.permitir_facturacion === false);
  // 3. Cancelado / Suspendido al crear
  for (const est of ['CANCELADO', 'SUSPENDIDO']) { await abrir(); await llenar({ ...base, cWA: '8495550001', cEstadoCli: est }); r = await guardar(); d = r.calls[0] && r.calls[0].d; ok(`crear ${est} → activo=false`, d && d.activo === false && d.estado_cliente === est, d && { activo: d.activo }); }
  // 4. Validaciones
  const casos = [
    ['sin nombre', { cNom: '' }, 'Falta el nombre'], ['WhatsApp 1234567890', { cWA: '1234567890' }, 'WhatsApp no válido'], ['WhatsApp 15 dígitos', { cWA: '809555123412345' }, 'WhatsApp no válido'],
    ['cédula 12', { cCed: '12' }, 'Cédula no válida'], ['cédula dígito malo', { cCed: '001-1882756-3' }, 'último dígito'], ['cédula duplicada', { cCed: '001-1234567-3', cWA: '8095550002' }, null],
    ['día 31', { cDiaFact: '31' }, 'Día de facturación'], ['día -5', { cDiaFact: '-5' }, 'Día de facturación'], ['correo maria@', { cEmail: 'maria@' }, 'Correo no válido'], ['teléfono abc', { cTel: 'abc' }, 'Teléfono no válido'],
    ['ref WA mala', { cRefWa: '12345' }, 'referencia'], ['B01 sin RNC', { cNCF: 'B01' }, 'Falta el RNC'], ['nacimiento 1850', { cFecNac: '1850-01-01' }, 'año de nacimiento'], ['nacimiento futuro', { cFecNac: '2031-01-01' }, 'futuro'], ['fechas invertidas', { cFecIni: '2026-05-01', cFecFin: '2026-01-01' }, 'Fechas invertidas']];
  // cédula duplicada: c2 tiene 00118827562
  for (const [n, v, msg] of casos) { await abrir(); await llenar({ ...base, ...v }); if (n === 'cédula duplicada') await p.evaluate(() => { }); r = await guardar(300); const t = r.toasts.join(' / '); ok('valida: ' + n, r.calls.length === 0 && (msg ? t.includes(msg) : /ya registrada/.test(t)), t.slice(0, 120)); }
  await abrir(); await llenar({ ...base, cNCF: 'B01', cCed: '131234567' }); r = await guardar(); ok('B01 con RNC de 9 dígitos guarda', r.calls.length === 1);
  await abrir(); await llenar({ ...base, cWA: '+1 849-555-0003' }); r = await guardar(); ok('WhatsApp +1 849 aceptado', r.calls.length === 1 && r.calls[0].d.wa === '18495550003');
  await abrir(); await llenar({ ...base, cDiaFact: '28' }); r = await guardar(); ok('día 28 aceptado', r.calls.length === 1 && r.calls[0].d.dia_facturacion === 28);
  // 5. Edición de cliente viejo (cédula mala y WhatsApp no RD sin cambiar) → guarda con aviso
  await abrir('editar', 'c1'); r = await guardar(); ok('editar viejo sin cambiar cédula/WA: guarda y avisa', r.calls.length === 1 && r.calls[0].m === 'patch' && r.toasts.some(t => /Revise la cédula/.test(t)), r.toasts);
  await abrir('editar', 'c1'); await llenar({ cCed: '001-1234567-9' }); r = await guardar(300); ok('editar y cambiar a cédula mala: bloquea', r.calls.length === 0);
  // 6. Duplicado de WhatsApp (memoria y base): avisa, no bloquea
  await abrir(); await llenar({ ...base, cWA: '829-555-0000' }); await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(500);
  let sw = await p.evaluate(() => document.querySelector('.swal-overlay .swal-ttl')?.textContent || '');
  ok('WhatsApp repetido (memoria): pregunta', /WhatsApp ya registrado/.test(sw), sw);
  await swal('Cancelar'); await p.waitForTimeout(300); r = await p.evaluate(() => ({ n: __calls.filter(c => c.t === 'clientes' && c.m !== 'get').length, btn: document.getElementById('btnGCli').disabled }));
  ok('…Cancelar: no guarda y botón libre', r.n === 0 && !r.btn, r);
  await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(400); await swal('Guardar igual'); await p.waitForTimeout(600);
  r = await p.evaluate(() => __calls.filter(c => c.t === 'clientes' && c.m !== 'get').length); ok('…Guardar igual: guarda', r === 1);
  await abrir(); await p.evaluate(() => __modo = 'dupwa'); await llenar({ ...base, cWA: '8095557777' }); await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(500);
  sw = await p.evaluate(() => (document.querySelector('.swal-overlay .swal-msg')?.textContent || '') + ' · get=' + __calls.filter(c => c.m === 'get').map(c => c.q).join(';'));
  ok('WhatsApp repetido en la BASE (select solo lectura): pregunta', /CLIENTE EN LA BASE/.test(sw), sw.slice(0, 200)); await swal('Cancelar'); await p.evaluate(() => __modo = 'ok');
  // 7. Red caída: un solo intento, error, botón libre; reintento con el mismo nº de póliza
  await abrir(); await p.evaluate(() => __modo = 'red'); await llenar({ ...base, cWA: '8095558888', cPermFact: false }); r = await guardar();
  ok('red caída: 1 solo POST, sin reintento sin columnas', r.calls.length === 1, { n: r.calls.length });
  ok('red caída: aviso y ventana abierta, botón libre', r.toasts.some(t => /Sin conexión/.test(t)) && r.abierta && !r.btn, r.toasts);
  await p.evaluate(() => __modo = 'ok'); r = await guardar();
  ok('reintento: mismo número de póliza (1 sola reserva)', r.rpc === 1 && r.calls.length === 2 && r.calls[1].d.numero_poliza === r.calls[0].d.numero_poliza && r.calls[1].d.permitir_facturacion === false, { rpc: r.rpc, pol: r.calls.map(c => c.d.numero_poliza) });
  // 8. Columna faltante: quita SOLO esa y avisa
  await abrir(); await p.evaluate(() => __modo = 'colvip'); await llenar({ ...base, cWA: '8095556666' }); r = await guardar(); await p.evaluate(() => __modo = 'ok');
  const k2 = r.calls[1] ? Object.keys(r.calls[1].d) : []; const k1 = r.calls[0] ? Object.keys(r.calls[0].d) : [];
  ok('columna faltante: reintenta quitando solo «vip» y avisa', r.calls.length === 2 && k1.filter(k => !k2.includes(k)).join() === 'vip' && r.toasts.some(t => /vip/.test(t)), { quitadas: k1.filter(k => !k2.includes(k)), toasts: r.toasts });
  // 9. Lento 14 s con 3 clics
  await abrir(); await p.evaluate(() => __modo = 'lento'); await llenar({ ...base, cWA: '8095554444' });
  const lento = await p.evaluate(async () => { const b = document.getElementById('btnGCli'); b.click(); b.click(); await new Promise(r => setTimeout(r, 12500)); const dis = b.disabled; b.click(); await new Promise(r => setTimeout(r, 2500)); return { posts: __calls.filter(c => c.t === 'clientes' && c.m !== 'get').length, deshabilitadoA12s: dis, avisos: [...__toasts] }; });
  ok('lento 14 s + 3 clics: 1 solo POST, botón bloqueado a los 12 s', lento.posts === 1 && lento.deshabilitadoA12s, lento);
  await p.evaluate(() => __modo = 'ok');
  // 10. G4: pendiente → chip «En proceso»
  await abrir(); const g4 = await p.evaluate(async () => { const c = document.querySelector('#mCli .nxFcCaja'); if (c && c.classList.contains('nxFcPleg')) c.querySelector(':scope>.nxFcSec').click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('.pend-chk').click(); await new Promise(r => setTimeout(r, 200)); return { sel: document.getElementById('cEstadoCli').value, chip: [...document.querySelectorAll('#cEstadoCliChips .nxOptChip.on')].map(c => c.textContent.trim()).join() }; });
  ok('G4: estado y ficha coinciden (En proceso)', g4.sel === 'EN_PROCESO' && /proceso/i.test(g4.chip), g4);
  // 11. CRM precarga agente
  await p.evaluate(() => { closeM('mCli'); });
  const crm = await p.evaluate(async () => { if (!window.nxCrm) return { sinCrm: true }; nxCrm.qa.estado().pros.push({ id: 'p1', nombre: 'PROSPECTO X', telefono: '8295551212', asignado_agente_id: 'a2' }); try { nxCrm.prosCrearCliente('p1'); } catch (e) { return { err: String(e) }; } await new Promise(r => setTimeout(r, 300)); return { agt: document.getElementById('cAgt').value, chip: [...document.querySelectorAll('#cAgtChips .nxOptChip.on')].map(c => c.textContent.trim()).join() }; });
  ok('CRM precarga el agente del prospecto', crm.agt === 'a2' && /ESTERLIN/.test(crm.chip), crm);
  // 12. Cerrar: sin cambios / con cambios (✕, Esc, tocar fuera)
  await abrir(); await p.evaluate(() => document.querySelector('#mCli .mt button').click()); await p.waitForTimeout(300);
  ok('✕ sin cambios: cierra sin preguntar', await p.evaluate(() => !document.getElementById('mCli').classList.contains('open') && !document.querySelector('.swal-overlay')));
  for (const via of ['x', 'esc', 'fuera']) {
    await abrir(); await llenar({ cNom: 'BORRADOR' }); await p.waitForTimeout(100);
    if (via === 'x') await p.evaluate(() => document.querySelector('#mCli .mt button').click());
    if (via === 'esc') { await p.evaluate(() => document.body.focus()); await p.keyboard.press('Escape'); }
    if (via === 'fuera') await p.evaluate(() => document.getElementById('mCli').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForTimeout(400);
    const pregunta = await p.evaluate(() => document.querySelector('.swal-overlay .swal-ttl')?.textContent || '');
    await swal('Cancelar'); await p.waitForTimeout(200);
    const sigue = await p.evaluate(() => document.getElementById('mCli').classList.contains('open') && document.getElementById('cNom').value === 'BORRADOR');
    ok(`con cambios (${via}): pregunta y «Cancelar» conserva lo escrito`, /Descartar/.test(pregunta) && sigue, { pregunta, sigue });
    if (via === 'fuera') { await p.evaluate(() => document.querySelector('#mCli .mt button').click()); await p.waitForTimeout(300); await swal('Descartar'); await p.waitForTimeout(300); ok('«Descartar» cierra', await p.evaluate(() => !document.getElementById('mCli').classList.contains('open'))); }
  }
  // 13. Teclado y accesibilidad
  await abrir();
  const tk = await p.evaluate(() => { const a = id => { const e = document.getElementById(id); return { type: e.type, im: e.getAttribute('inputmode'), ac: e.getAttribute('autocomplete'), cap: e.getAttribute('autocapitalize'), ek: e.getAttribute('enterkeyhint'), lab: e.labels ? e.labels.length : 0 }; }; const md = document.querySelector('#mCli .modal'); return { cNom: a('cNom'), cCed: a('cCed'), cWA: a('cWA'), cTel: a('cTel'), cEmail: a('cEmail'), cRefWa: a('cRefWa'), cDiaFact: a('cDiaFact'), cDir: a('cDir'), cFecNac: a('cFecNac'), role: md.getAttribute('role'), modal: md.getAttribute('aria-modal'), lb: md.getAttribute('aria-labelledby'), foco: document.activeElement.id || document.activeElement.className, grupos: ['cPlanChips', 'cAgtChips', 'cARSChips'].map(i => document.getElementById(i).getAttribute('role') + ':' + document.getElementById(i).getAttribute('aria-labelledby')), sinEtiqueta: [...md.querySelectorAll('input:not([type=checkbox]):not([type=hidden])')].filter(e => getComputedStyle(e).display !== 'none' && !(e.labels && e.labels.length) && !e.getAttribute('aria-label')).map(e => e.id) }; });
  ok('teclados: WA/Tel/RefWa tel, cédula y día numéricos, correo sin mayúscula', tk.cWA.type === 'tel' && tk.cWA.im === 'tel' && tk.cTel.im === 'tel' && tk.cRefWa.im === 'tel' && tk.cCed.im === 'numeric' && tk.cDiaFact.im === 'numeric' && tk.cEmail.cap === 'off' && tk.cEmail.ac === 'email' && tk.cNom.ac === 'name', tk);
  ok('accesibilidad: diálogo, etiquetas y grupos', tk.role === 'dialog' && tk.modal === 'true' && tk.lb === 'mCliT' && tk.sinEtiqueta.length === 0 && tk.grupos.every(g => g === 'group:' + g.split(':')[1]) && tk.cNom.lab === 1, { sinEtiqueta: tk.sinEtiqueta, grupos: tk.grupos, foco: tk.foco });
  ok('foco dentro de la ventana al abrir', await p.evaluate(() => !!document.activeElement.closest('#mCli')), tk.foco);
  await p.evaluate(() => document.getElementById('cNom').focus()); await p.keyboard.press('Enter'); const tras = await p.evaluate(() => document.activeElement.id);
  ok('Enter en Nombre pasa a Cédula', tras === 'cCed', tras);
  let fuera = 0; for (let i = 0; i < 90; i++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => !!document.activeElement.closest('#mCli')))) fuera++; }
  ok('Tab no se sale de la ventana (90 pulsaciones)', fuera === 0, { fuera });
  await p.evaluate(() => { const c = document.getElementById('cCed'); c.focus(); c.value = '00118827567'; c.blur(); const w = document.getElementById('cWA'); w.focus(); w.value = '18095551234'; w.blur(); });
  ok('formato al salir: cédula y WhatsApp', await p.evaluate(() => document.getElementById('cCed').value === '001-1882756-7' && document.getElementById('cWA').value === '809-555-1234'));
  // 14. Deuda: Ajustar usa el diálogo del sistema
  await abrir('editar', 'c2'); await p.evaluate(() => document.getElementById('cDeudaUnlock').click()); await p.waitForTimeout(300);
  ok('Ajustar deuda: diálogo propio (no confirm)', await p.evaluate(() => /Ajustar la deuda/.test(document.querySelector('.swal-overlay .swal-ttl')?.textContent || '')));
  await swal('Ajustar'); await p.waitForTimeout(200); ok('…y desbloquea el campo', await p.evaluate(() => !document.getElementById('cDeudaIni').disabled));
  await p.evaluate(() => { document.querySelectorAll('.swal-overlay').forEach(s => s.remove()); window.nxCliMarcarLimpio(); closeM('mCli'); });
  ok('sin errores de JavaScript en la página', errores.length === 0, errores);
  fs.writeFileSync(`${OUT}/pruebas-${VW}.json`, JSON.stringify(R, null, 1));
  console.log(`\n${VW}px: ${R.filter(x => x.ok).length}/${R.length} OK`);
  await b.close();
})();
