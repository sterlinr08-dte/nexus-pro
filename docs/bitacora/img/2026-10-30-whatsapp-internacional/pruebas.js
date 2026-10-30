// Pruebas de la ficha del cliente 59.75 (59.74 secciones + WhatsApp de otro país). Solo lectura: API simulada en memoria, red a Supabase bloqueada.
// Incluye TODAS las pruebas del paquete B (59.73) más las de C. uso:
//   NODE_PATH=/opt/node22/lib/node_modules node pruebas.js http://localhost:8771 390|1280 [off]   (CAP=carpeta para las capturas)
// «off» corre con el interruptor apagado (localStorage.nx_cli_sec_off='1'): la ventana debe verse como en 59.73.
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2]; const VW = +process.argv[3] || 390; const OFF = process.argv[4] === 'off'; const OUT = __dirname; const CAP = process.env.CAP || OUT;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: VW, height: VW < 500 ? 844 : 900 }, isMobile: VW < 500, hasTouch: VW < 500 });
  const p = await ctx.newPage(); const errores = [];
  p.on('pageerror', e => errores.push(String(e.message).slice(0, 160)));
  await p.route('**/*', r => { const u = r.request().url(); if (/localhost:87\d\d/.test(u) || (/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|cdnjs|unpkg/.test(u) && !/supabase/.test(u))) return r.continue(); return r.abort(); });
  await p.addInitScript(off => { localStorage.setItem('nx_splash_shown', '1'); localStorage.setItem('nx_tema', 'glass-oscuro'); if (off) localStorage.setItem('nx_cli_sec_off', '1'); else localStorage.removeItem('nx_cli_sec_off'); }, OFF);
  await p.goto(BASE + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(9000);
  await p.evaluate(() => {
    sesion = { id: 'u1', nom: 'Auditor', rol: 'admin', usuario: 'aud', es_superadmin: true, org_id: 'o1' };
    ST.clientes = [
      { id: 'c1', nom: 'VIEJO CEDULA MALA', cedula: '001-1234567-0', wa: '13055551234', tel: '305-555', plan: 'Básico', activo: true, deps: [], estado_cliente: 'ACTIVO', deuda_anterior: 0 },
      { id: 'c2', nom: 'OTRO CLIENTE', cedula: '00112345673', wa: '18295550000', plan: 'Superior', ars: 'ARS Humano', agente_id: 'a2', activo: true, numero_poliza: 'POL-000245', fecha_inicio: '2026-01-15', deuda_anterior: 17400, deps: [{ nom: 'JUAN PÉREZ', rel: 'Hijo/a', id: 1 }] },
      { id: 'c3', nom: 'CLIENTE ESPAÑA', wa: '+34612345678', tel: '+584121234567', plan: 'Básico', activo: true, deps: [], estado_cliente: 'ACTIVO', deuda_anterior: 0 }];
    ST.agentes = [{ id: 'a1', nom: 'ROBINSON', activo: true }, { id: 'a2', nom: 'ESTERLIN', activo: true }, { id: 'a3', nom: 'LORIBEL', activo: true }]; ST.empresas = []; ST.usuarios = []; ST.facturas = [];
    document.getElementById('loginScreen').style.display = 'none'; document.getElementById('app').style.display = 'flex';
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
  const abrirEstado = () => p.evaluate(async () => { const d = document.getElementById('nxCliEstDet'); if (d) d.open = true; const c = document.querySelector('#mCli .nxFcCaja'); if (c && c.classList.contains('nxFcPleg')) c.querySelector(':scope>.nxFcSec').click(); await new Promise(r => setTimeout(r, 200)); });
  const base = { cNom: 'Juan Pérez', cWA: '809 555 1234' };

  console.log(`\n== ${VW}px · interruptor ${OFF ? 'APAGADO (59.73)' : 'encendido (59.74)'} ==`);
  ok('capa activa según el interruptor', await p.evaluate(off => document.documentElement.classList.contains('nx-clisec') === !off && !!document.getElementById('nxCliSecJs'), OFF));

  // ───────── Paquete B (59.73): debe seguir pasando ─────────
  await abrir(); await llenar({ ...base, cCed: '00118827567', cTel: '+1 (829) 555-0001', cEmail: 'juan@correo.com', cFecNac: '1990-02-03', cAgt: 'a1' });
  let r = await guardar(); let d = r.calls[0] && r.calls[0].d;
  ok('B · alta normal guarda 1 vez', r.calls.length === 1 && !r.abierta, { n: r.calls.length, toasts: r.toasts });
  ok('B · cédula 001-1882756-7, wa 18095551234, tel 829-555-0001', d && d.cedula === '001-1882756-7' && d.wa === '18095551234' && d.tel === '829-555-0001', d && { ced: d.cedula, wa: d.wa, tel: d.tel });
  ok('B · fecha_nacimiento en el mismo INSERT', d && d.fecha_nacimiento === '1990-02-03');
  ok('B · activo true y estado ACTIVO', d && d.activo === true && d.estado_cliente === 'ACTIVO');
  ok('B · deps vacío sigue siendo "[]"', d && d.deps === '[]', d && d.deps);
  await abrir(); await llenar({ ...base, cWA: '8295559999', cPermFact: false }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('B · cortesía: permitir_facturacion=false', d && d.permitir_facturacion === false);
  for (const est of ['CANCELADO', 'SUSPENDIDO']) { await abrir(); await llenar({ ...base, cWA: '8495550001', cEstadoCli: est }); r = await guardar(); d = r.calls[0] && r.calls[0].d; ok(`B · crear ${est} → activo=false`, d && d.activo === false && d.estado_cliente === est, d && { activo: d.activo }); }
  const casos = [
    ['sin nombre', { cNom: '' }, 'Falta el nombre'], ['WhatsApp 1234567890 (sin +)', { cWA: '1234567890' }, 'fuera de RD'], ['WhatsApp 15 dígitos', { cWA: '809555123412345' }, 'WhatsApp no válido'],
    ['cédula 12', { cCed: '12' }, 'Cédula no válida'], ['cédula dígito malo', { cCed: '001-1882756-3' }, 'último dígito'], ['cédula duplicada', { cCed: '001-1234567-3', cWA: '8095550002' }, null],
    ['día 31', { cDiaFact: '31' }, 'Día de facturación'], ['día -5', { cDiaFact: '-5' }, 'Día de facturación'], ['correo maria@', { cEmail: 'maria@' }, 'Correo no válido'], ['teléfono abc', { cTel: 'abc' }, 'Teléfono no válido'],
    ['ref WA mala', { cRefWa: '12345' }, 'referencia'], ['B01 sin RNC', { cNCF: 'B01' }, 'Falta el RNC'], ['nacimiento 1850', { cFecNac: '1850-01-01' }, 'año de nacimiento'], ['nacimiento futuro', { cFecNac: '2031-01-01' }, 'futuro'], ['fechas invertidas', { cFecIni: '2026-05-01', cFecFin: '2026-01-01' }, 'Fechas invertidas']];
  for (const [n, v, msg] of casos) { await abrir(); await llenar({ ...base, ...v }); r = await guardar(300); const t = r.toasts.join(' / '); ok('B · valida: ' + n, r.calls.length === 0 && (msg ? t.includes(msg) : /ya registrada/.test(t)), t.slice(0, 120)); }
  await abrir(); await llenar({ ...base, cNCF: 'B01', cCed: '131234567' }); r = await guardar(); ok('B · B01 con RNC de 9 dígitos guarda', r.calls.length === 1);
  await abrir(); await llenar({ ...base, cWA: '+1 849-555-0003' }); r = await guardar(); ok('B · WhatsApp +1 849 aceptado', r.calls.length === 1 && r.calls[0].d.wa === '18495550003');
  await abrir(); await llenar({ ...base, cDiaFact: '28' }); r = await guardar(); ok('B · día 28 aceptado', r.calls.length === 1 && r.calls[0].d.dia_facturacion === 28);
  await abrir('editar', 'c1'); r = await guardar(); ok('B · editar viejo sin cambiar cédula/WA: guarda y avisa', r.calls.length === 1 && r.calls[0].m === 'patch' && r.toasts.some(t => /Revise la cédula/.test(t)), r.toasts);
  await abrir('editar', 'c1'); await llenar({ cCed: '001-1234567-9' }); r = await guardar(300); ok('B · editar y cambiar a cédula mala: bloquea', r.calls.length === 0);
  await abrir(); await llenar({ ...base, cWA: '829-555-0000' }); await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(500);
  let sw = await p.evaluate(() => document.querySelector('.swal-overlay .swal-ttl')?.textContent || '');
  ok('B · WhatsApp repetido (memoria): pregunta', /WhatsApp ya registrado/.test(sw), sw);
  await swal('Cancelar'); await p.waitForTimeout(300); r = await p.evaluate(() => ({ n: __calls.filter(c => c.t === 'clientes' && c.m !== 'get').length, btn: document.getElementById('btnGCli').disabled }));
  ok('B · …Cancelar: no guarda y botón libre', r.n === 0 && !r.btn, r);
  await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(400); await swal('Guardar igual'); await p.waitForTimeout(600);
  r = await p.evaluate(() => __calls.filter(c => c.t === 'clientes' && c.m !== 'get').length); ok('B · …Guardar igual: guarda', r === 1);
  await abrir(); await p.evaluate(() => __modo = 'dupwa'); await llenar({ ...base, cWA: '8095557777' }); await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(500);
  sw = await p.evaluate(() => (document.querySelector('.swal-overlay .swal-msg')?.textContent || '') + ' · get=' + __calls.filter(c => c.m === 'get').map(c => c.q).join(';'));
  ok('B · WhatsApp repetido en la BASE (select solo lectura): pregunta', /CLIENTE EN LA BASE/.test(sw), sw.slice(0, 200)); await swal('Cancelar'); await p.evaluate(() => __modo = 'ok');
  await abrir(); await p.evaluate(() => __modo = 'red'); await llenar({ ...base, cWA: '8095558888', cPermFact: false }); r = await guardar();
  ok('B · red caída: 1 solo POST, sin reintento sin columnas', r.calls.length === 1, { n: r.calls.length });
  ok('B · red caída: aviso y ventana abierta, botón libre', r.toasts.some(t => /Sin conexión/.test(t)) && r.abierta && !r.btn, r.toasts);
  await p.evaluate(() => __modo = 'ok'); r = await guardar();
  ok('B · reintento: mismo número de póliza (1 sola reserva)', r.rpc === 1 && r.calls.length === 2 && r.calls[1].d.numero_poliza === r.calls[0].d.numero_poliza && r.calls[1].d.permitir_facturacion === false, { rpc: r.rpc, pol: r.calls.map(c => c.d.numero_poliza) });
  await abrir(); await p.evaluate(() => __modo = 'colvip'); await llenar({ ...base, cWA: '8095556666' }); r = await guardar(); await p.evaluate(() => __modo = 'ok');
  const k2 = r.calls[1] ? Object.keys(r.calls[1].d) : []; const k1 = r.calls[0] ? Object.keys(r.calls[0].d) : [];
  ok('B · columna faltante: reintenta quitando solo «vip» y avisa', r.calls.length === 2 && k1.filter(k => !k2.includes(k)).join() === 'vip' && r.toasts.some(t => /vip/.test(t)), { quitadas: k1.filter(k => !k2.includes(k)), toasts: r.toasts });
  await abrir(); await p.evaluate(() => __modo = 'lento'); await llenar({ ...base, cWA: '8095554444' });
  const lento = await p.evaluate(async () => { const b = document.getElementById('btnGCli'); b.click(); b.click(); await new Promise(r => setTimeout(r, 12500)); const dis = b.disabled; b.click(); await new Promise(r => setTimeout(r, 2500)); return { posts: __calls.filter(c => c.t === 'clientes' && c.m !== 'get').length, deshabilitadoA12s: dis, avisos: [...__toasts] }; });
  ok('B · lento 14 s + 3 clics: 1 solo POST, botón bloqueado a los 12 s', lento.posts === 1 && lento.deshabilitadoA12s, lento);
  await p.evaluate(() => __modo = 'ok');
  await abrir(); await abrirEstado(); const g4 = await p.evaluate(async () => { document.querySelector('.pend-chk').click(); await new Promise(r => setTimeout(r, 200)); return { sel: document.getElementById('cEstadoCli').value, chip: [...document.querySelectorAll('#cEstadoCliChips .nxOptChip.on')].map(c => c.textContent.trim()).join(), resumen: document.querySelector('#nxCliEstDet .nxSecSumT')?.textContent || '' }; });
  ok('B · G4: estado y ficha coinciden (En proceso)', g4.sel === 'EN_PROCESO' && /proceso/i.test(g4.chip), g4);
  await p.evaluate(() => { closeM('mCli'); });
  const crm = await p.evaluate(async () => { if (!window.nxCrm) return { sinCrm: true }; nxCrm.qa.estado().pros.push({ id: 'p1', nombre: 'PROSPECTO X', telefono: '8295551212', asignado_agente_id: 'a2' }); try { nxCrm.prosCrearCliente('p1'); } catch (e) { return { err: String(e) }; } await new Promise(r => setTimeout(r, 300)); return { agt: document.getElementById('cAgt').value, chip: [...document.querySelectorAll('#cAgtChips .nxOptChip.on')].map(c => c.textContent.trim()).join(), busca: document.getElementById('cAgtBusca')?.value }; });
  ok('B · CRM precarga el agente del prospecto', crm.agt === 'a2' && /ESTERLIN/.test(crm.chip), crm);
  await abrir(); await p.evaluate(() => document.querySelector('#mCli .mt button').click()); await p.waitForTimeout(300);
  ok('B · ✕ sin cambios: cierra sin preguntar', await p.evaluate(() => !document.getElementById('mCli').classList.contains('open') && !document.querySelector('.swal-overlay')));
  for (const via of ['x', 'esc', 'fuera']) {
    await abrir(); await llenar({ cNom: 'BORRADOR' }); await p.waitForTimeout(100);
    if (via === 'x') await p.evaluate(() => document.querySelector('#mCli .mt button').click());
    if (via === 'esc') { await p.evaluate(() => document.body.focus()); await p.keyboard.press('Escape'); }
    if (via === 'fuera') await p.evaluate(() => document.getElementById('mCli').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForTimeout(400);
    const pregunta = await p.evaluate(() => document.querySelector('.swal-overlay .swal-ttl')?.textContent || '');
    await swal('Cancelar'); await p.waitForTimeout(200);
    const sigue = await p.evaluate(() => document.getElementById('mCli').classList.contains('open') && document.getElementById('cNom').value === 'BORRADOR');
    ok(`B · con cambios (${via}): pregunta y «Cancelar» conserva lo escrito`, /Descartar/.test(pregunta) && sigue, { pregunta, sigue });
    if (via === 'fuera') { await p.evaluate(() => document.querySelector('#mCli .mt button').click()); await p.waitForTimeout(300); await swal('Descartar'); await p.waitForTimeout(300); ok('B · «Descartar» cierra', await p.evaluate(() => !document.getElementById('mCli').classList.contains('open'))); }
  }
  await abrir();
  const tk = await p.evaluate(() => { const a = id => { const e = document.getElementById(id); return { type: e.type, im: e.getAttribute('inputmode'), ac: e.getAttribute('autocomplete'), cap: e.getAttribute('autocapitalize'), ek: e.getAttribute('enterkeyhint'), lab: e.labels ? e.labels.length : 0 }; }; const md = document.querySelector('#mCli .modal'); return { cNom: a('cNom'), cCed: a('cCed'), cWA: a('cWA'), cTel: a('cTel'), cEmail: a('cEmail'), cRefWa: a('cRefWa'), cDiaFact: a('cDiaFact'), cDir: a('cDir'), cFecNac: a('cFecNac'), role: md.getAttribute('role'), modal: md.getAttribute('aria-modal'), lb: md.getAttribute('aria-labelledby'), foco: document.activeElement.id || document.activeElement.className, grupos: ['cPlanChips', 'cAgtChips', 'cARSChips'].map(i => document.getElementById(i).getAttribute('role') + ':' + document.getElementById(i).getAttribute('aria-labelledby')), sinEtiqueta: [...md.querySelectorAll('input:not([type=checkbox]):not([type=hidden])')].filter(e => getComputedStyle(e).display !== 'none' && !(e.labels && e.labels.length) && !e.getAttribute('aria-label')).map(e => e.id) }; });
  ok('B · teclados: WA/Tel/RefWa tel, cédula y día numéricos, correo sin mayúscula', tk.cWA.type === 'tel' && tk.cWA.im === 'tel' && tk.cTel.im === 'tel' && tk.cRefWa.im === 'tel' && tk.cCed.im === 'numeric' && tk.cDiaFact.im === 'numeric' && tk.cEmail.cap === 'off' && tk.cEmail.ac === 'email' && tk.cNom.ac === 'name', tk);
  ok('B · accesibilidad: diálogo, etiquetas y grupos', tk.role === 'dialog' && tk.modal === 'true' && tk.lb === 'mCliT' && tk.sinEtiqueta.length === 0 && tk.grupos.every(g => g === 'group:' + g.split(':')[1]) && tk.cNom.lab === 1, { sinEtiqueta: tk.sinEtiqueta, grupos: tk.grupos, foco: tk.foco });
  ok('B · foco dentro de la ventana al abrir', await p.evaluate(() => !!document.activeElement.closest('#mCli')), tk.foco);
  await p.evaluate(() => document.getElementById('cNom').focus()); await p.keyboard.press('Enter'); const tras = await p.evaluate(() => document.activeElement.id);
  ok('B · Enter en Nombre pasa a Cédula', tras === 'cCed', tras);
  let fuera = 0; for (let i = 0; i < 90; i++) { await p.keyboard.press('Tab'); if (!(await p.evaluate(() => !!document.activeElement.closest('#mCli')))) fuera++; }
  ok('B · Tab no se sale de la ventana (90 pulsaciones)', fuera === 0, { fuera });
  await p.evaluate(() => { const c = document.getElementById('cCed'); c.focus(); c.value = '00118827567'; c.blur(); const w = document.getElementById('cWA'); w.focus(); w.value = '18095551234'; w.blur(); });
  ok('B · formato al salir: cédula y WhatsApp', await p.evaluate(() => document.getElementById('cCed').value === '001-1882756-7' && document.getElementById('cWA').value === '809-555-1234'));
  await abrir('editar', 'c2'); await p.evaluate(() => document.getElementById('cDeudaUnlock').click()); await p.waitForTimeout(300);
  ok('B · Ajustar deuda: diálogo propio (no confirm)', await p.evaluate(() => /Ajustar la deuda/.test(document.querySelector('.swal-overlay .swal-ttl')?.textContent || '')));
  await swal('Ajustar'); await p.waitForTimeout(200); ok('B · …y desbloquea el campo', await p.evaluate(() => !document.getElementById('cDeudaIni').disabled));
  await p.evaluate(() => { document.querySelectorAll('.swal-overlay').forEach(s => s.remove()); window.nxCliMarcarLimpio(); closeM('mCli'); });

  // ───────── Dependientes con cédula y nacimiento (addDep/rDepLM, con y sin capa) ─────────
  await abrir(); await llenar({ ...base, cWA: '8095551111' });
  const dep1 = await p.evaluate(() => { document.getElementById('dN').value = 'Pedro Pérez'; document.getElementById('dR').value = 'Hijo/a'; addDep(); return { deps: JSON.parse(JSON.stringify(tempDeps)), lista: document.getElementById('depLM').innerText }; });
  ok('C · dependiente sin cédula ni nacimiento: {nom,rel,id} sin claves extra', dep1.deps.length === 1 && !('cedula' in dep1.deps[0]) && !('fecha_nacimiento' in dep1.deps[0]) && dep1.deps[0].nom === 'Pedro Pérez', dep1);
  if (!OFF) {
    const dep2 = await p.evaluate(() => { document.getElementById('dN').value = 'Ana Pérez'; document.getElementById('dR').value = 'Cónyuge'; document.getElementById('dC').value = '00118827567'; document.getElementById('dNac').value = '1984-11-02'; __toasts.length = 0; addDep(); return { deps: JSON.parse(JSON.stringify(tempDeps)), lista: document.getElementById('depLM').innerText, limpios: !document.getElementById('dC').value && !document.getElementById('dNac').value }; });
    ok('C · dependiente con cédula válida y nacimiento: se guardan formateados y la tarjeta los muestra', dep2.deps.length === 2 && dep2.deps[1].cedula === '001-1882756-7' && dep2.deps[1].fecha_nacimiento === '1984-11-02' && /001-1882756-7/.test(dep2.lista) && /02\/11\/1984/.test(dep2.lista) && dep2.limpios, dep2);
    const dep3 = await p.evaluate(() => { document.getElementById('dN').value = 'Malo'; document.getElementById('dC').value = '001-1882756-3'; __toasts.length = 0; addDep(); return { n: tempDeps.length, toasts: [...__toasts], inv: document.getElementById('dC').getAttribute('aria-invalid'), nomSigue: document.getElementById('dN').value }; });
    ok('C · cédula del dependiente con dígito malo: no agrega y avisa', dep3.n === 2 && dep3.toasts.some(t => /Cédula del dependiente/.test(t)) && dep3.inv === 'true' && dep3.nomSigue === 'Malo', dep3);
    const dep4 = await p.evaluate(() => { document.getElementById('dC').value = '12'; __toasts.length = 0; addDep(); const a = { n: tempDeps.length, t: [...__toasts] }; document.getElementById('dC').value = ''; document.getElementById('dNac').value = '2031-01-01'; __toasts.length = 0; addDep(); return { ...a, n2: tempDeps.length, t2: [...__toasts] }; });
    ok('C · cédula «12» y nacimiento futuro del dependiente: no agregan y avisan', dep4.n === 2 && /11 dígitos/.test(dep4.t.join()) && dep4.n2 === 2 && /futuro/.test(dep4.t2.join()), dep4);
    await p.evaluate(() => { document.getElementById('dNac').value = ''; });
    r = await guardar(); d = r.calls[0] && r.calls[0].d; let depsG = []; try { depsG = JSON.parse(d.deps); } catch (e) { }
    ok('C · al guardar, deps lleva cedula y fecha_nacimiento solo en el que las tiene', r.calls.length === 1 && depsG.length === 2 && !('cedula' in depsG[0]) && depsG[1].cedula === '001-1882756-7' && depsG[1].fecha_nacimiento === '1984-11-02', depsG);
  } else {
    ok('C · con el interruptor apagado no existen #dC ni #dNac (59.73)', await p.evaluate(() => !document.getElementById('dC') && !document.getElementById('dNac')));
    r = await guardar(); d = r.calls[0] && r.calls[0].d;
    ok('C · deps se guarda como antes', r.calls.length === 1 && d.deps === JSON.stringify(dep1.deps), d && d.deps);
  }
  await abrir('editar', 'c2'); ok('C · editar carga los dependientes viejos (sin cédula) y los pinta', await p.evaluate(() => tempDeps.length === 1 && /JUAN PÉREZ/.test(document.getElementById('depLM').innerText) && /Hijo\/a/.test(document.getElementById('depLM').innerText)));

  if (!OFF) {
    // ───────── Orden en 6 secciones ─────────
    await abrir();
    const est = await p.evaluate(() => { const m = document.querySelector('#mCli .modal'); const hijos = [...m.children].filter(c => getComputedStyle(c).display !== 'none').map(c => c.tagName + (c.id ? '#' + c.id : '') + (c.className ? '.' + c.className.split(' ')[0] : '')); const en = (id, n) => !!document.getElementById(id)?.closest('#nxSec' + n); return { hijos, titulos: [...m.querySelectorAll('.nxSec>h2')].map(h => h.textContent.trim()), ok: en('cNom', 1) && en('cCed', 1) && en('cFecNac', 1) && en('cWA', 2) && en('cTel', 2) && en('cEmail', 2) && en('cDir', 2) && en('cRef', 2) && en('cRefWa', 2) && en('cPlan', 3) && en('cARS', 3) && en('cAgt', 3) && en('eChips', 3) && en('cNCF', 3) && en('cDiaFact', 3) && en('cFecIni', 3) && en('cFecFin', 3) && en('seccionPrecioCustom', 3) && en('cDeudaIni', 4) && en('cEstadoCli', 5) && en('cPendientes', 5) && en('cVip', 5) && en('depLM', 6) && en('dN', 6) && en('dC', 6), resto: document.getElementById('nxCliResto').children.length, vacio: [...document.querySelectorAll('#mCli .nxSec')].every(s => s.querySelectorAll('input,select,button').length > 0) }; });
    ok('C · 6 secciones en orden y cada campo en la suya', est.ok && est.titulos.join('|') === '1Datos personales|2Contacto|3Seguro|4Deuda|5Estado y proceso|6Dependientes' && est.hijos[0].startsWith('DIV.mt') && est.hijos[est.hijos.length - 1] === 'DIV.fe' && est.hijos.length === 8, est);
    ok('C · lo viejo (rejillas, separadores, títulos «//») queda escondido, no borrado', est.resto >= 5 && await p.evaluate(() => getComputedStyle(document.getElementById('nxCliResto')).display === 'none'), { resto: est.resto });
    ok('C · mismos ids: guardarCli encuentra todos sus campos', await p.evaluate(() => ['cNom', 'cCed', 'cWA', 'cTel', 'cEmail', 'cDir', 'cRef', 'cRefWa', 'cPlan', 'cAgt', 'cNCF', 'cARS', 'cFecIni', 'cFecFin', 'cDiaFact', 'cDeudaIni', 'cDeudaUnlock', 'cDeudaHint', 'cDeudaLbl', 'cEstadoCli', 'cPrioridad', 'cPermFact', 'cPendientes', 'cOtroPend', 'cProgTxt', 'cProgBar', 'cNotaProc', 'cFechaSeg', 'cRespSeg', 'cVip', 'eChips', 'seccionPrecioCustom', 'cPrecioCustomOn', 'camposPrecioCustom', 'cPrecioTitular', 'cPrecioDep', 'precioStdInfo', 'dN', 'dR', 'depLM', 'btnGCli', 'mCliT', 'cFecNac'].every(id => document.getElementById(id) && document.getElementById(id).closest('#mCli'))));

    // ───────── Buscadores de ARS y Agente ─────────
    const bq = await p.evaluate(() => ({ agt: document.getElementById('cAgtBusca').value, agtSel: document.getElementById('cAgt').value, ars: document.getElementById('cARSBusca').value, arsSel: document.getElementById('cARS').value, chipsOcultos: getComputedStyle(document.getElementById('cAgtChips')).display === 'none' && getComputedStyle(document.getElementById('cARSChips')).display === 'none', selOculto: getComputedStyle(document.getElementById('cAgt')).display === 'none', lab: document.getElementById('cAgtBusca').labels.length, role: document.getElementById('cAgtBusca').getAttribute('role') }));
    ok('C · buscadores: muestran el valor actual (Robinson / Sin ARS), select oculto manda, con etiqueta y role', bq.agt === 'ROBINSON' && bq.agtSel === 'a1' && bq.ars === 'Sin ARS' && bq.arsSel === '' && bq.chipsOcultos && bq.selOculto && bq.lab === 1 && bq.role === 'combobox', bq);
    await p.evaluate(() => document.getElementById('cAgtBusca').focus()); await p.waitForTimeout(100);
    const ab = await p.evaluate(() => { const L = document.getElementById('cAgtLista'); return { abierta: !L.hidden, n: L.querySelectorAll('.nxSecOp[data-v]').length, altos: [...L.querySelectorAll('.nxSecOp')].map(o => Math.round(o.getBoundingClientRect().height)), sel: L.querySelector('[aria-selected="true"]')?.textContent.trim(), exp: document.getElementById('cAgtBusca').getAttribute('aria-expanded') }; });
    ok('C · agente: al tocar se abre la lista completa, 44 px por opción, la actual marcada', ab.abierta && ab.n === 3 && ab.altos.every(h => h >= 44) && /ROBINSON/.test(ab.sel) && ab.exp === 'true', ab);
    await p.keyboard.type('est'); await p.waitForTimeout(100);
    const fil = await p.evaluate(() => [...document.querySelectorAll('#cAgtLista .nxSecOp[data-v]')].map(o => o.textContent.trim()));
    ok('C · agente: escribir «est» filtra a ESTERLIN', fil.length === 1 && /ESTERLIN/.test(fil[0]), fil);
    await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    const el1 = await p.evaluate(() => ({ sel: document.getElementById('cAgt').value, txt: document.getElementById('cAgtBusca').value, cerrada: document.getElementById('cAgtLista').hidden, chip: [...document.querySelectorAll('#cAgtChips .nxOptChip.on')].map(c => c.textContent.trim()).join(), sigueAbierta: document.getElementById('mCli').classList.contains('open') }));
    ok('C · agente: Enter elige → #cAgt = a2 (mismo id que las fichas), texto ESTERLIN, lista cerrada', el1.sel === 'a2' && el1.txt === 'ESTERLIN' && el1.cerrada && el1.sigueAbierta, el1);
    await p.evaluate(() => { document.getElementById('cAgtBusca').blur(); document.getElementById('cAgtBusca').focus(); }); await p.waitForTimeout(100);
    await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(50);
    const nav = await p.evaluate(() => ({ activa: document.querySelector('#cAgtLista .nxSecOp.activa')?.textContent.trim(), ad: document.getElementById('cAgtBusca').getAttribute('aria-activedescendant') }));
    await p.keyboard.press('ArrowUp'); await p.waitForTimeout(50); const nav2 = await p.evaluate(() => document.querySelector('#cAgtLista .nxSecOp.activa')?.textContent.trim());
    ok('C · agente: flechas ↓↓ llegan a ROBINSON (circular desde ESTERLIN) y ↑ vuelve a LORIBEL', /ROBINSON/.test(nav.activa) && !!nav.ad && /LORIBEL/.test(nav2), { nav, nav2 });
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    const esc = await p.evaluate(() => ({ cerrada: document.getElementById('cAgtLista').hidden, txt: document.getElementById('cAgtBusca').value, sel: document.getElementById('cAgt').value, ventana: document.getElementById('mCli').classList.contains('open'), swal: !!document.querySelector('.swal-overlay') }));
    ok('C · agente: Esc cierra la lista sin cambiar nada y sin cerrar la ventana', esc.cerrada && esc.txt === 'ESTERLIN' && esc.sel === 'a2' && esc.ventana && !esc.swal, esc);
    await p.evaluate(() => { document.getElementById('cAgtBusca').blur(); const i = document.getElementById('cARSBusca'); i.focus(); }); await p.waitForTimeout(100);
    const arsN = await p.evaluate(() => document.querySelectorAll('#cARSLista .nxSecOp[data-v]').length);
    await p.keyboard.type('hum'); await p.waitForTimeout(100);
    const arsF = await p.evaluate(() => [...document.querySelectorAll('#cARSLista .nxSecOp[data-v]')].map(o => o.dataset.v));
    await p.evaluate(() => document.querySelector('#cARSLista .nxSecOp[data-v="ARS Humano"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(100);
    const arsE = await p.evaluate(() => ({ sel: document.getElementById('cARS').value, txt: document.getElementById('cARSBusca').value }));
    ok('C · ARS: lista completa (12 + «Sin ARS»), «hum» filtra, tocar elige → #cARS = «ARS Humano»', arsN >= 11 && arsF.join() === 'ARS Humano' && arsE.sel === 'ARS Humano' && arsE.txt === 'ARS Humano', { arsN, arsF, arsE });
    await p.evaluate(() => { const i = document.getElementById('cARSBusca'); i.focus(); }); await p.waitForTimeout(80); await p.keyboard.type('zzz'); await p.waitForTimeout(80);
    const sinRes = await p.evaluate(() => document.querySelector('#cARSLista .nxSecVacio')?.textContent); await p.keyboard.press('Tab'); await p.waitForTimeout(80);
    ok('C · ARS: sin coincidencias dice «Sin resultados» y Tab cierra dejando el valor', sinRes === 'Sin resultados' && await p.evaluate(() => document.getElementById('cARSLista').hidden && document.getElementById('cARSBusca').value === 'ARS Humano' && document.getElementById('cARS').value === 'ARS Humano'), sinRes);
    await p.evaluate(() => { const i = document.getElementById('cARSBusca'); i.focus(); }); await p.waitForTimeout(80);
    await p.evaluate(() => document.querySelector('#cARSLista .nxSecOp[data-v=""]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(80);
    ok('C · ARS: «Sin ARS» deja el select vacío (como la ficha de antes)', await p.evaluate(() => document.getElementById('cARS').value === '' && document.getElementById('cARSBusca').value === 'Sin ARS'));
    await llenar({ ...base, cWA: '8095553333' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
    ok('C · guardar manda agente_id=a2 y ars=null tal como lo dejaron los buscadores', r.calls.length === 1 && d.agente_id === 'a2' && d.ars === null, d && { agente_id: d.agente_id, ars: d.ars });
    // CRM → el buscador refleja el agente precargado (reabrir en el mismo instante también refresca)
    const crm2 = await p.evaluate(async () => { if (!window.nxCrm) return { sinCrm: true }; nxCrm.qa.estado().pros.push({ id: 'p2', nombre: 'PROSPECTO Y', telefono: '8295551213', asignado_agente_id: 'a3' }); nxCrm.prosCrearCliente('p2'); await new Promise(r => setTimeout(r, 300)); return { agt: document.getElementById('cAgt').value, busca: document.getElementById('cAgtBusca').value }; });
    ok('C · CRM: el buscador muestra el agente del prospecto (LORIBEL)', crm2.sinCrm || (crm2.agt === 'a3' && crm2.busca === 'LORIBEL'), crm2);
    await p.evaluate(() => { window.nxCliMarcarLimpio(); closeM('mCli'); });

    // ───────── Plan como segmento ─────────
    await abrir();
    const plan = await p.evaluate(() => ({ txt: [...document.querySelectorAll('#cPlanChips .nxOptTxt')].map(t => t.textContent), vals: [...document.querySelectorAll('#cPlanChips .nxOptChip')].map(c => c.dataset.v), on: document.querySelector('#cPlanChips .nxOptChip.on')?.dataset.v, altos: [...document.querySelectorAll('#cPlanChips .nxOptChip')].map(c => Math.round(c.getBoundingClientRect().height)) }));
    await p.evaluate(() => document.querySelector('#cPlanChips .nxOptChip[data-v="Esencial Plus"]').click()); await p.waitForTimeout(100);
    ok('C · plan: segmento «Básico · Superior · Esencial Plus» con los mismos values; tocar cambia #cPlan', plan.txt.join('|') === 'Básico|Superior|Esencial Plus' && plan.vals.join('|') === 'Básico|Superior|Esencial Plus' && plan.on === 'Básico' && plan.altos.every(h => h >= 44) && await p.evaluate(() => document.getElementById('cPlan').value === 'Esencial Plus'), plan);

    // ───────── Estado y proceso plegable ─────────
    const pleg = await p.evaluate(() => { const det = document.getElementById('nxCliEstDet'); const vis = e => e.checkVisibility(); return { cerrado: !det.open, estadoOculto: !vis(document.getElementById('cEstadoCliChips')), sum: det.querySelector('.nxSecSumT').textContent + ' / ' + det.querySelector('.nxSecSumS').textContent, altoSum: Math.round(det.querySelector('summary').getBoundingClientRect().height), tituloViejoOculto: !vis(det.querySelector('.nxSecOldTit')) }; });
    ok('C · «Estado y proceso» abre plegado con resumen (Activo · prioridad media · sin pendientes), 44+ px', pleg.cerrado && pleg.estadoOculto && /Activo · prioridad media/.test(pleg.sum) && /Sin pendientes/.test(pleg.sum) && pleg.altoSum >= 44 && pleg.tituloViejoOculto, pleg);
    await p.evaluate(() => document.querySelector('#nxCliEstDet summary').click()); await p.waitForTimeout(200);
    const desp = await p.evaluate(() => { const det = document.getElementById('nxCliEstDet'); const vis = e => e.checkVisibility(); return { abierto: det.open, estadoVisible: vis(document.getElementById('cEstadoCliChips')), pend: vis(document.getElementById('cPendientes')), vip: vis(document.getElementById('cVip')), sum: det.querySelector('.nxSecSumS').textContent }; });
    ok('C · al tocar se despliega: estado, pendientes y VIP visibles; el resumen ya no dice «toque para ver»', desp.abierto && desp.estadoVisible && desp.pend && desp.vip && !/toque/.test(desp.sum), desp);
    await p.evaluate(() => { document.querySelector('#cEstadoCliChips .nxOptChip[data-v="SUSPENDIDO"]').click(); document.querySelector('.pend-chk').click(); document.getElementById('cPermFact').click(); }); await p.waitForTimeout(150);
    const res2 = await p.evaluate(() => document.querySelector('#nxCliEstDet .nxSecSumT').textContent + ' / ' + document.querySelector('#nxCliEstDet .nxSecSumS').textContent);
    ok('C · el resumen sigue lo que se cambia dentro (Suspendido, 1 pendiente, sin facturación)', /Suspendido/.test(res2) && /1 pendiente/.test(res2) && /sin facturación/.test(res2), res2);
    await p.evaluate(() => document.querySelector('#nxCliEstDet summary').click()); await p.waitForTimeout(150);
    ok('C · vuelve a plegarse al tocar', await p.evaluate(() => !document.getElementById('nxCliEstDet').open));
    await abrir(); ok('C · al reabrir la ventana vuelve plegado', await p.evaluate(() => !document.getElementById('nxCliEstDet').open));

    // ───────── Editar muestra el número de póliza ─────────
    const nuevo = await p.evaluate(() => ({ cab: document.getElementById('nxCliPolCab').hidden, fr: document.getElementById('nxCliPolFr').hidden, visible: document.getElementById('nxCliPolFr').getBoundingClientRect().height }));
    ok('C · en «Nuevo» no se ve número de póliza', nuevo.cab && nuevo.fr && nuevo.visible === 0, nuevo);
    await abrir('editar', 'c2');
    const edi = await p.evaluate(() => ({ cab: document.getElementById('nxCliPolCab').textContent, num: document.getElementById('nxCliPolNum').value, ro: document.getElementById('nxCliPolNum').readOnly, visible: document.getElementById('nxCliPolFr').getBoundingClientRect().height > 0, titulo: document.getElementById('mCliT').textContent, agt: document.getElementById('cAgtBusca').value, ars: document.getElementById('cARSBusca').value }));
    ok('C · en «Editar» se ve «Póliza POL-000245 · desde 15/01/2026» y el campo de solo lectura; buscadores con ESTERLIN y ARS Humano', edi.cab === 'Póliza POL-000245 · desde 15/01/2026' && edi.num === 'POL-000245' && edi.ro && edi.visible && edi.titulo === 'EDITAR CLIENTE' && edi.agt === 'ESTERLIN' && edi.ars === 'ARS Humano', edi);
    await p.evaluate(() => document.getElementById('cFecNac').focus()); await p.keyboard.press('Enter');
    ok('C · Enter desde Nacimiento salta el campo de solo lectura (va a WhatsApp)', await p.evaluate(() => document.activeElement.id === 'cWA'), await p.evaluate(() => document.activeElement.id));
    r = await guardar(); d = r.calls[0] && r.calls[0].d;
    ok('C · editar y guardar no manda ningún campo nuevo (sin numero_poliza ni claves de la capa)', r.calls.length === 1 && r.calls[0].m === 'patch' && !('numero_poliza' in d) && !Object.keys(d).some(k => /^nx|Busca/.test(k)), Object.keys(d || {}).filter(k => /^nx|Busca|poliza/.test(k)));

    // ───────── Sin saltos al abrir (primer cuadro = 300 ms después) ─────────
    await p.evaluate(() => { window.nxCliMarcarLimpio(); closeM('mCli'); }); await p.waitForTimeout(300);
    const fouc = await p.evaluate(async () => {
      // medidas de maquetación (offset*), no de pantalla: la animación nxPopIn escala la ventana en el primer cuadro y no es un reflujo
      const medir = () => { const o = {}; [...document.querySelectorAll('#mCli .modal [id], #mCli .modal > *, #mCli .nxSecRej > *')].forEach((e, i) => { o[(e.id || e.className) + '#' + i] = [e.offsetTop, e.offsetLeft, e.offsetWidth, e.offsetHeight].join(':'); }); return o; };
      editarCli('c2');
      const a = await new Promise(res => requestAnimationFrame(() => res(medir())));
      const orden0 = [...document.querySelectorAll('#mCli .modal > *')].map(e => e.tagName + (e.id ? '#' + e.id : '')).join(',');
      await new Promise(r => setTimeout(r, 300));
      const b = medir(); const orden1 = [...document.querySelectorAll('#mCli .modal > *')].map(e => e.tagName + (e.id ? '#' + e.id : '')).join(',');
      const dif = Object.keys(a).filter(k => b[k] !== undefined && a[k] !== b[k]).map(k => k + ' ' + a[k] + ' → ' + b[k]);
      return { n: Object.keys(a).length, dif: dif.slice(0, 8), nDif: dif.length, mismoOrden: orden0 === orden1, orden0 };
    });
    ok('C · sin reflujo: el orden y las medidas del primer cuadro son las mismas 300 ms después', fouc.nDif === 0 && fouc.mismoOrden && fouc.n > 50, fouc);
    await p.evaluate(() => { window.nxCliMarcarLimpio(); closeM('mCli'); });

    // ───────── Regla de espaciado y botones (390 y 1280) ─────────
    await abrir('editar', 'c2'); await abrirEstado(); await p.evaluate(() => { document.getElementById('dN').value = 'X Y'; addDep(); });
    const med = await p.evaluate(() => {
      const m = document.querySelector('#mCli .modal'); m.scrollTop = 0; const R = e => e.getBoundingClientRect(); const cs = e => getComputedStyle(e); const F = [];
      const mr = R(m); const bordeL = parseFloat(cs(m).borderLeftWidth) || 0; const mt = m.querySelector('.mt'); const padT = parseFloat(cs(mt).paddingTop);
      const nom = R(document.getElementById('cNom')); F.push(['borde izquierdo→campo', Math.round(nom.left - mr.left - bordeL), window.innerWidth < 600 ? 16 : 40]);
      F.push(['borde arriba→título', Math.round(padT), window.innerWidth < 600 ? 24 : 48]);
      const h1 = R(document.getElementById('nxSecH1')); F.push(['título de la ventana→1.ª sección', Math.round(h1.top - R(mt).bottom), 24]);
      F.push(['título de sección→etiqueta', Math.round(R(document.getElementById('cNom').labels[0]).top - h1.bottom), 8]);
      const lab = document.getElementById('cNom').labels[0]; F.push(['etiqueta→cajita', Math.round(nom.top - R(lab).bottom), 8]);
      F.push(['campo→siguiente campo (Nombre→Cédula)', Math.round(R(document.getElementById('cCed').labels[0]).top - nom.bottom), 20]);
      F.push(['sección 1→sección 2', Math.round(R(document.getElementById('nxSecH2')).top - R(document.getElementById('nxSec1')).bottom), 24]);
      F.push(['sección 2→3', Math.round(R(document.getElementById('nxSecH3')).top - R(document.getElementById('nxSec2')).bottom), 24]);
      F.push(['sección 3→4', Math.round(R(document.getElementById('nxSecH4')).top - R(document.getElementById('nxSec3')).bottom), 24]);
      F.push(['sección 4→5', Math.round(R(document.getElementById('nxSecH5')).top - R(document.getElementById('nxSec4')).bottom), 24]);
      F.push(['sección 5→6', Math.round(R(document.getElementById('nxSecH6')).top - R(document.getElementById('nxSec5')).bottom), 24]);
      const avisoCed = document.querySelector('#mCli .nx-cedula-aviso'); if (avisoCed && avisoCed.checkVisibility()) F.push(['cajita→aviso de la cédula', Math.round(R(avisoCed).top - R(document.getElementById('cCed')).bottom), 4]);
      F.push(['tarjeta plegable→su contenido (resumen 56)', Math.round(R(document.querySelector('#nxCliEstDet summary')).height), 56]);
      F.push(['filas de dependientes', Math.round(R(document.querySelectorAll('#depLM .dep-c')[1]).top - R(document.querySelectorAll('#depLM .dep-c')[0]).bottom), 8]);
      const inputs = [...m.querySelectorAll('input:not([type=checkbox]):not([type=hidden]),select')].filter(e => e.offsetParent !== null && cs(e).display !== 'none');
      const malos = inputs.filter(e => Math.round(R(e).height) < 48 || parseFloat(cs(e).fontSize) < 16).map(e => e.id + ':' + Math.round(R(e).height) + 'px/' + cs(e).fontSize);
      const btn = R(document.getElementById('btnGCli'));
      const toques = [...m.querySelectorAll('button,.nxOptChip,.echip,summary,label:has(>input[type=checkbox]),.nxSecOp,.dep-c button')].filter(e => e.offsetParent !== null && R(e).width > 0);
      const toquesMalos = toques.filter(e => R(e).height < 44 || R(e).width < 44).map(e => (e.id || e.className.split(' ')[0] || e.tagName) + ':' + Math.round(R(e).width) + 'x' + Math.round(R(e).height));
      const letras = [...m.querySelectorAll('label,button,.nxSecH,.nxSecSumS,.nxDepSub,.nxSecOpT,#cDeudaHint,#cPendientesLbl')].filter(e => e.offsetParent !== null).filter(e => parseFloat(cs(e).fontSize) < 13).map(e => (e.id || e.className.split(' ')[0]) + ':' + cs(e).fontSize);
      const desborde = m.scrollWidth > m.clientWidth + 1;
      return { F, malos, btn: Math.round(btn.height), toquesMalos, letras, desborde, alto: m.scrollHeight };
    });
    const fallas = med.F.filter(([, real, esp]) => real !== esp);
    ok('C · espacios de la regla (8/20/24, bordes 48/40 ó 24/16, ayuda 4, lista 8)', fallas.length === 0, { fallas, F: med.F });
    ok('C · campos 48 px con letra 16; botón principal 54', med.malos.length === 0 && med.btn === 54, { malos: med.malos, btn: med.btn });
    ok('C · todo lo que se toca ≥ 44 px; letras de controles ≥ 13; sin desborde', med.toquesMalos.length === 0 && med.letras.length === 0 && !med.desborde, { toques: med.toquesMalos, letras: med.letras, desborde: med.desborde, alto: med.alto });
    await p.evaluate(() => { window.nxCliMarcarLimpio(); closeM('mCli'); });
  } else {
    // ───────── Interruptor apagado: la ventana es la de 59.73 ─────────
    await abrir();
    const v73 = await p.evaluate(() => { const m = document.querySelector('#mCli .modal'); return { secciones: m.querySelectorAll('.nxSec,.nxSecCombo,#nxCliEstDet,#nxCliPolFr,#nxCliResto').length, gf2: m.querySelectorAll(':scope>.gf2').length, nomEnGf2: !!document.getElementById('cNom').closest('.gf2'), chipsAgt: getComputedStyle(document.getElementById('cAgtChips')).display !== 'none' && document.querySelectorAll('#cAgtChips .nxOptChip').length === 3, caja: !!document.querySelector('#mCli .nxFcCaja.nxFcPleg'), lbl: document.getElementById('eChipsLbl').textContent, planTxt: document.querySelector('#cPlanChips .nxOptTxt')?.textContent, hijos: [...m.children].map(c => c.tagName + (c.id ? '#' + c.id : '') + '.' + c.className.split(' ')[0]) }; });
    ok('C-off · sin secciones ni buscadores; rejillas .gf2, fichas de agente visibles, «Estado y proceso» plegable de 59.44, «Empresa cotizante»', v73.secciones === 0 && v73.gf2 === 2 && v73.nomEnGf2 && v73.chipsAgt && v73.caja && /Empresa cotizante/i.test(v73.lbl) && v73.planTxt === 'Plan Básico', v73);
    await p.evaluate(() => { window.nxCliMarcarLimpio(); closeM('mCli'); });
  }
  // ───────── Capturas del iPhone del dueño (30-oct 07:19): fechas, asa del menú, parentesco, Dirección, título y ✕ ─────────
  await abrir('editar', 'c2'); await llenar({ cFecNac: '' }); await p.evaluate(() => document.getElementById('cFecNac').dispatchEvent(new Event('change', { bubbles: true })));
  const ip = await p.evaluate(() => {
    const m = document.querySelector('#mCli .modal'); const R = e => e.getBoundingClientRect(); const cs = e => getComputedStyle(e); const mr = R(m); const bl = parseFloat(cs(m).borderLeftWidth) || 0; const br = parseFloat(cs(m).borderRightWidth) || 0;
    const fechas = ['cFecNac', 'cFecIni', 'cFecFin'].map(id => { const e = document.getElementById(id); const fr = e.closest('.fr'); return { id, w: Math.round(R(e).width), frw: Math.round(R(fr).width), dentro: R(e).right <= mr.right - br + .5, app: cs(e).webkitAppearance || cs(e).appearance, guia: e.dataset.nxGuia, vacio: e.dataset.nxVacio || null, minw: cs(e).minWidth }; });
    const x = m.querySelector('.mt button'); const t = document.getElementById('mCliT'); const pad = window.innerWidth < 600 ? 16 : 40;
    return { fechas, dR: cs(document.getElementById('dR')).textTransform, dRtxt: document.getElementById('dR').options[0].textContent, dir: document.getElementById('cDir').placeholder, tituloX: Math.round(R(t).left - mr.left - bl), xW: Math.round(R(x).width), xH: Math.round(R(x).height), xDer: Math.round(mr.right - br - R(x).right), pad, asa: window.innerWidth <= 768 ? cs(document.getElementById('sbEl')).visibility : 'hidden', asaTg: [...document.querySelectorAll('.nx-mc-tg')].every(e => window.innerWidth > 768 || cs(e).display === 'none') };
  });
  ok('iPhone-1 · fechas: ancho = su celda, dentro de la ventana, sin apariencia nativa, guía «dd/mm/aaaa» y marca de vacío', ip.fechas.every(f => f.dentro && f.w === f.frw && f.app === 'none' && f.guia === 'dd/mm/aaaa' && f.minw === '0px') && ip.fechas[0].vacio === '1' && ip.fechas[1].vacio === null, ip.fechas);
  ok('iPhone-2 · con la ventana abierta, el menú lateral y su asa quedan ocultos en el celular', ip.asa === 'hidden' && ip.asaTg, { asa: ip.asa, tg: ip.asaTg });
  ok('iPhone-3 · parentesco en minúscula normal («Cónyuge»)', ip.dR === 'none' && ip.dRtxt === 'Cónyuge', { tt: ip.dR, txt: ip.dRtxt });
  ok('iPhone-4 · Dirección con guía', ip.dir === 'Calle, número, sector, ciudad', ip.dir);
  ok(`iPhone-5 · título a ${ip.pad} px del borde y ✕ de 44 px a ${ip.pad} px del borde`, ip.tituloX === ip.pad && ip.xW === 44 && ip.xH === 44 && ip.xDer === ip.pad, { tituloX: ip.tituloX, x: ip.xW + 'x' + ip.xH, der: ip.xDer });
  await p.evaluate(() => { window.nxCliMarcarLimpio(); closeM('mCli'); });

  // ───────── 59.75 · WhatsApp / teléfonos de otro país (dueño, 30-oct: «sí», clientes con WhatsApp internacional) ─────────
  const foco = async (id, v) => p.evaluate(async ({ id, v }) => { const e = document.getElementById(id); e.focus(); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); await new Promise(r => setTimeout(r, 50)); e.blur(); document.getElementById('cNom').focus(); await new Promise(r => setTimeout(r, 150)); return { v: e.value, inv: e.getAttribute('aria-invalid'), toasts: [...__toasts] }; }, { id, v });
  await abrir(); await llenar({ ...base, cWA: '+34 612 345 670' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · WhatsApp con «+» (España) guarda como +34612345670', r.calls.length === 1 && d.wa === '+34612345670', d && d.wa);
  await abrir(); await llenar({ ...base, cWA: '0034 612 345 671' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · WhatsApp con «00» guarda como +34612345671', r.calls.length === 1 && d.wa === '+34612345671', d && d.wa);
  await abrir(); await llenar({ ...base, cWA: '+1 305 555 1234' }); await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(500);
  sw = await p.evaluate(() => document.querySelector('.swal-overlay .swal-ttl')?.textContent || '');
  ok('I · +1 305 repetido con el viejo «13055551234» (memoria): pregunta', /WhatsApp ya registrado/.test(sw), sw); await swal('Cancelar'); await p.waitForTimeout(300);
  await abrir(); await llenar({ ...base, cWA: '0034 612 345 678' }); await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(500);
  sw = await p.evaluate(() => document.querySelector('.swal-overlay .swal-ttl')?.textContent || '');
  ok('I · «0034…» repetido con «+34612345678» guardado (memoria): pregunta', /WhatsApp ya registrado/.test(sw), sw); await swal('Cancelar'); await p.waitForTimeout(300);
  await abrir(); await p.evaluate(() => __modo = 'dupwa'); await llenar({ ...base, cWA: '+57 300 123 4567' }); await p.evaluate(() => { window.guardarCli(); }); await p.waitForTimeout(500);
  const q = await p.evaluate(() => __calls.filter(c => c.m === 'get').map(c => c.q).join(';'));
  ok('I · repetido en la BASE: la consulta lleva el «+» codificado (%2B) y los dígitos', /wa\.eq\.%2B573001234567/.test(q) && /wa\.eq\.573001234567/.test(q) && !/wa\.eq\.\+/.test(q), q.slice(0, 160)); await swal('Cancelar'); await p.evaluate(() => __modo = 'ok');
  await abrir(); await llenar({ ...base, cWA: '3055551234' }); r = await guardar(300);
  ok('I · 10 dígitos no RD sin «+»: aviso «Número fuera de RD» y no guarda', r.calls.length === 0 && r.toasts.some(t => /fuera de RD/.test(t)) && !r.toasts.some(t => /no válido/.test(t)) && r.abierta, r.toasts);
  await p.waitForTimeout(200); await p.screenshot({ path: `${CAP}/aviso-fuera-rd-${VW}.png` });
  await abrir(); await llenar({ ...base, cWA: '+1 305 555 9876' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · el mismo número con «+1» pasa y guarda +13055559876', r.calls.length === 1 && d.wa === '+13055559876', d && d.wa);
  await abrir(); await llenar({ ...base, cWA: '13055559876' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · 11 dígitos con 1 delante no RD (EE. UU. sin +) se toma como otro país: +13055559876', r.calls.length === 1 && d.wa === '+13055559876', d && d.wa);
  for (const [n, v, msg] of [['«+» con 7 dígitos en total', { cWA: '+34 12345' }, 'WhatsApp no válido'], ['«+» con 16 dígitos', { cWA: '+1234567890123456' }, 'WhatsApp no válido'], ['809 con 11 dígitos', { cWA: '80955512345' }, 'WhatsApp no válido'], ['teléfono 10 dígitos no RD sin +', { cTel: '3055551234' }, 'fuera de RD'], ['ref WA 10 dígitos no RD sin +', { cRefWa: '7875551234' }, 'fuera de RD'], ['teléfono «+» corto', { cTel: '+58 12345' }, 'Teléfono no válido']]) {
    await abrir(); await llenar({ ...base, ...v }); r = await guardar(300); const t = r.toasts.join(' / '); ok('I · bloquea: ' + n, r.calls.length === 0 && t.includes(msg), t.slice(0, 120));
  }
  await abrir(); await llenar({ ...base, cWA: '8095551111', cTel: '+58 412 123 4567', cRefWa: '+1 (787) 555-1234' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · teléfono y WhatsApp de referencia de otro país: +584121234567 y +17875551234', r.calls.length === 1 && d.tel === '+584121234567' && d.referencia_wa === '+17875551234', d && { tel: d.tel, ref: d.referencia_wa });
  await abrir(); await llenar({ ...base, cWA: '8095551112', cTel: '829-555-0002', cRefWa: '849 555 0003' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · RD sigue igual: wa 18095551112, tel 829-555-0002, ref 18495550003', d && d.wa === '18095551112' && d.tel === '829-555-0002' && d.referencia_wa === '18495550003', d && { wa: d.wa, tel: d.tel, ref: d.referencia_wa });
  await abrir('editar', 'c1'); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · editar viejo «13055551234» sin cambiar: guarda y conserva el número tal cual', r.calls.length === 1 && r.calls[0].m === 'patch' && d.wa === '13055551234', d && d.wa);
  await abrir('editar', 'c3'); const vista = await p.evaluate(() => ({ wa: document.getElementById('cWA').value, tel: document.getElementById('cTel').value })); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · editar internacional: se ve «+34 612345678» / «+58 4121234567» y guarda sin cambiar', vista.wa === '+34 612345678' && vista.tel === '+58 4121234567' && r.calls.length === 1 && d.wa === '+34612345678' && d.tel === '+584121234567', { vista, wa: d && d.wa, tel: d && d.tel });
  await abrir('editar', 'c3'); await llenar({ cWA: '+34 612 999 999' }); r = await guardar(); d = r.calls[0] && r.calls[0].d;
  ok('I · editar internacional y cambiar el número: guarda el nuevo', r.calls.length === 1 && d.wa === '+34612999999', d && d.wa);
  await abrir(); let f = await foco('cWA', '+1 305 555 1234'); ok('I · al salir del campo, «+1 305 555 1234» se ve «+1 3055551234»', f.v === '+1 3055551234' && !f.inv, f);
  f = await foco('cWA', '00 44 7911 123456'); ok('I · al salir del campo, «00 44…» se ve «+44 7911123456»', f.v === '+44 7911123456', f.v);
  f = await foco('cWA', '829 555 1234'); ok('I · al salir del campo, RD se ve «829-555-1234»', f.v === '829-555-1234', f.v);
  f = await foco('cWA', '3055551234'); ok('I · al salir del campo con 10 dígitos no RD: aviso antes de Guardar y campo marcado', f.inv === 'true' && f.toasts.some(t => /fuera de RD/.test(t)), f);
  await p.screenshot({ path: `${CAP}/aviso-al-salir-${VW}.png` });
  f = await foco('cWA', '3055551234'); ok('I · el mismo número no vuelve a avisar', f.toasts.filter(t => /fuera de RD/.test(t)).length === 1, f.toasts.length);
  const tecla = await p.evaluate(async () => { const e = document.getElementById('cWA'); const out = {}; for (const [k, v] of [['mas', '+447911123456'], ['cc', '0034612345678'], ['rd', '8095551234'], ['largo', '+123456789012345678']]) { e.focus(); e.value = ''; for (const ch of v) { e.value += ch; e.dispatchEvent(new InputEvent('input', { bubbles: true, data: ch })); } out[k] = e.value; } return out; });
  ok('I · al escribir: «+44…» y «0034…» no se cortan a 10 dígitos; RD se forma 809-555-1234; tope 15 dígitos', tecla.mas === '+44 7911123456' && tecla.cc === '+34 612345678' && tecla.rd === '809-555-1234' && tecla.largo.replace(/\D/g, '').length === 15, tecla);
  await foco('cWA', '+34 612 345 678'); await foco('cTel', '+58 412 123 4567'); await p.waitForTimeout(200); await p.screenshot({ path: `${CAP}/internacional-formato-${VW}.png` });
  const medidas = await p.evaluate(() => ['cWA', 'cTel', 'cRefWa'].map(id => { const e = document.getElementById(id); const r = e.getBoundingClientRect(); return { id, h: Math.round(r.height), fs: getComputedStyle(e).fontSize, ml: e.maxLength, im: e.inputMode, dentro: r.right <= document.querySelector('#mCli .modal').getBoundingClientRect().right }; }));
  ok('I · campos de teléfono: 48 px, letra 16 px, inputmode tel, maxlength 20 y dentro de la ventana', medidas.every(m => m.h >= 48 && m.fs === '16px' && m.im === 'tel' && m.ml === 20 && m.dentro), medidas);
  await p.evaluate(() => { window.nxCliMarcarLimpio(); closeM('mCli'); });
  const unit = await p.evaluate(() => ({ wa1: nxWa('+5351234567'), wa2: nxWa('8095551234'), wa3: nxWa('+34612345678'), f1: nxTelFmt('+5491123456789'), f2: nxTelFmt('+507 61234567'), f3: nxTelFmt('+1 8095551234'), n1: nxTelNorm('809555123412345').tipo, n2: nxTelNorm('+809 555 1234').tipo }));
  ok('I · nxWa no antepone «1» a un número con «+» (Cuba 10 dígitos) y los demás siguen igual', unit.wa1 === '5351234567' && unit.wa2 === '18095551234' && unit.wa3 === '34612345678', unit);
  ok('I · formato: código de 2 y 3 dígitos; «+1 809…» vuelve a ser RD', unit.f1 === '+54 91123456789' && unit.f2 === '+507 61234567' && unit.f3 === '809-555-1234' && unit.n1 === 'mal' && unit.n2 === 'rd', unit);
  ok('sin errores de JavaScript en la página', errores.length === 0, errores);
  fs.writeFileSync(`${OUT}/pruebas-${VW}${OFF ? '-off' : ''}.json`, JSON.stringify(R, null, 1));
  console.log(`\n${VW}px${OFF ? ' (apagado)' : ''}: ${R.filter(x => x.ok).length}/${R.length} OK`);
  await b.close();
})();
