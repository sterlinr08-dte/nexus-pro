/* ════════════════════════════════════════════════════════════════════
   MÓDULO: COMPRA Y VENTA DE VEHÍCULOS (dentro de Multiempresa · admin)
   Registro del vehículo + costo de compra, gastos de reacondicionamiento
   que se van sumando, costo total, precio de venta (margen monto/%),
   acto de venta imprimible, documentos y configuración.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__NX_VEHICULOS__) return;
  window.__NX_VEHICULOS__ = true;

  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esAdmin() { try { return (typeof sesion !== 'undefined') && sesion && sesion.rol === 'admin'; } catch (e) { try { return window.sesion && window.sesion.rol === 'admin'; } catch (_) { return false; } } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  // Buscador estándar (reglamento del dueño): respaldo por si index.html aún no trae
  // nxBuscaHTML en caché (mismo criterio que ya usa AGUAPRO/POS).
  function fmt(n) { return 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function toast(t, m, s) { try { if (window.toast) window.toast(t, m, s); } catch (e) {} }
  function cerrarModal(id) { const o = document.getElementById(id); if (o) o.remove(); }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function parseMoney(v) { try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(v)) || 0; } catch (e) {} return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
  function nomAdmin() { try { return (window.sesion && window.sesion.nom) || 'Admin'; } catch (e) { return 'Admin'; } }
  function scanMoney(el) { try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(el); } catch (e) {} }
  function kpi(lbl, v, col) { return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px 8px"><div style="font-size:9.5px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.3px">${esc(lbl)}</div><div style="font-size:14px;font-weight:800;color:${col || '#1e293b'};margin-top:2px">${v}</div></div>`; }

  function numLetras(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return 'CERO';
    const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
    const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    function m100(x) { if (x <= 20) return U[x]; if (x < 30) return 'VEINTI' + U[x - 20]; const d = Math.floor(x / 10), u = x % 10; return D[d] + (u ? ' Y ' + U[u] : ''); }
    function m1000(x) { if (x === 100) return 'CIEN'; const c = Math.floor(x / 100), r = x % 100; return ((c ? C[c] + ' ' : '') + (r ? m100(r) : '')).trim(); }
    let t = ''; const mill = Math.floor(n / 1000000), miles = Math.floor((n % 1000000) / 1000), cien = n % 1000;
    if (mill) t += (mill === 1 ? 'UN MILLÓN' : m1000(mill) + ' MILLONES') + ' ';
    if (miles) t += (miles === 1 ? 'MIL' : m1000(miles) + ' MIL') + ' ';
    if (cien) t += m1000(cien);
    return t.trim();
  }
  function fechaLarga(d) {
    try { const dt = new Date(String(d || hoy()).slice(0, 10) + 'T12:00:00'); const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; return dt.getDate() + ' días del mes de ' + M[dt.getMonth()] + ' del año ' + dt.getFullYear(); } catch (e) { return String(d || ''); }
  }

  let _vehiculos = [];
  let _gastosByVeh = {};
  let _vhCfg = {};
  let _vhFiltro = 'todos';

  function gastosDe(v) { return _gastosByVeh[v.id] || []; }
  function totalGastos(v) { return gastosDe(v).reduce((s, x) => s + Number(x.costo || 0), 0); }
  function costoTotal(v) { return Number(v.compra_precio || 0) + totalGastos(v); }
  function gananciaDe(v) { return Number(v.precio_venta || 0) > 0 ? Number(v.precio_venta || 0) - costoTotal(v) : 0; }
  function margenPctDe(v) { const c = costoTotal(v); return (c > 0 && Number(v.precio_venta || 0) > 0) ? (gananciaDe(v) / c * 100) : 0; }
  function tituloVeh(v) { return [v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || 'Vehículo'; }

  async function cargarVehiculos() {
    _vehiculos = await getAPI().get('vehiculos', 'select=*&order=created_at.desc') || [];
    const g = await getAPI().get('vehiculo_gastos', 'select=*&order=fecha.asc') || [];
    _gastosByVeh = {};
    g.forEach(x => { (_gastosByVeh[x.vehiculo_id] = _gastosByVeh[x.vehiculo_id] || []).push(x); });
    try { const c = await getAPI().get('vehiculos_config', 'select=*&id=eq.1'); _vhCfg = (c && c[0]) || {}; } catch (e) { _vhCfg = {}; }
  }

  // ── Vista / lista ──
  function ensureView() {
    let v = document.getElementById('v-vehiculos');
    if (v) return v;
    const dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-vehiculos';
    dash.parentElement.appendChild(v);
    return v;
  }

  function cardHTML(v) {
    const ct = costoTotal(v), gan = gananciaDe(v), pv = Number(v.precio_venta || 0);
    const vendido = v.estado === 'vendido';
    const badge = vendido
      ? '<span style="font-size:9px;font-weight:800;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px">VENDIDO</span>'
      : '<span style="font-size:9px;font-weight:800;color:#6d28d9;background:#eff6ff;padding:2px 8px;border-radius:20px">INVENTARIO</span>';
    const sub = [v.color, v.placa ? 'Placa ' + v.placa : '', v.chasis ? 'Chasis ' + (v.chasis || '').slice(-6) : ''].filter(Boolean).join(' · ');
    return `<div class="nxVhCard" data-busca="${esc((tituloVeh(v) + ' ' + (v.placa || '') + ' ' + (v.chasis || '') + ' ' + (v.comprador_nombre || '')).toLowerCase())}" onclick="window.nxVehVer('${v.id}')" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:9px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.04)" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <div style="min-width:0"><div style="font-size:14px;font-weight:800;color:#1e293b">${esc(tituloVeh(v))}</div><div style="font-size:11px;color:#475569">${esc(sub || 'Sin datos')}</div></div>
        ${badge}
      </div>
      <div style="display:flex;justify-content:space-between;gap:6px;font-size:11px">
        <span style="color:#475569">Costo: <b style="color:#0f172a">${fmt(ct)}</b></span>
        ${pv > 0 ? `<span style="color:#475569">Venta: <b style="color:#6d28d9">${fmt(pv)}</b></span><span style="color:${gan >= 0 ? '#16a34a' : '#dc2626'};font-weight:800">${gan >= 0 ? '+' : ''}${fmt(gan)}</span>` : '<span style="color:#475569">Precio sin definir</span>'}
      </div>
    </div>`;
  }

  function renderLista(view) {
    const enInv = _vehiculos.filter(v => v.estado !== 'vendido');
    const vend = _vehiculos.filter(v => v.estado === 'vendido');
    const invertido = enInv.reduce((s, v) => s + costoTotal(v), 0);
    const ganReal = vend.reduce((s, v) => s + gananciaDe(v), 0);
    const ganPot = enInv.reduce((s, v) => s + gananciaDe(v), 0);
    const f = _vhFiltro;
    const lista = _vehiculos.filter(v => f === 'inventario' ? v.estado !== 'vendido' : f === 'vendidos' ? v.estado === 'vendido' : true);
    const chip = (k, l) => `<button type="button" class="btn bsm${_vhFiltro === k ? ' bc1' : ''}" onclick="window.nxVehFiltro('${k}')" style="font-size:10px;padding:5px 10px">${l}</button>`;
    const cards = _vehiculos.length === 0
      ? '<div data-nbf-ignorar style="text-align:center;padding:36px;color:#475569;font-size:13px">Aún no hay vehículos.<br>Toca <b>"Nuevo"</b> para registrar uno.</div>'
      : (lista.length === 0 ? '<div data-nbf-ignorar style="text-align:center;padding:30px;color:#475569;font-size:12px">Ningún vehículo en este filtro.</div>' : lista.map(cardHTML).join(''));
    view.innerHTML = `
      <div class="nc">
        <div class="ch">
          <div><div class="ct"><i class="ti ti-car"></i> Compra y Venta de Vehículos</div><div class="ct-s">Multiempresa · solo el administrador</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn bsm" type="button" onclick="window.nxAbrirMultiempresa()"><i class="ti ti-arrow-left"></i> Volver</button>
            <button class="btn bsm" type="button" onclick="window.nxVehConfig()" title="Datos para el acto de venta"><i class="ti ti-settings"></i> Config</button>
            <button class="btn bsm bc4" type="button" onclick="window.nxVehExportar()"><i class="ti ti-file-spreadsheet"></i> Excel</button>
            <button class="btn bsm bc1" type="button" onclick="window.nxVehNuevo()"><i class="ti ti-plus"></i> Nuevo</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin-bottom:10px">
          ${kpi('Vehículos', _vehiculos.length, '#1e293b')}
          ${kpi('En inventario', enInv.length, '#6d28d9')}
          ${kpi('Invertido', fmt(invertido), '#dc2626')}
          ${kpi('Ganancia potencial', fmt(ganPot), ganPot >= 0 ? '#16a34a' : '#dc2626')}
          ${kpi('Ganancia realizada', fmt(ganReal), '#059669')}
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">${chip('todos', 'Todos')}${chip('inventario', 'En inventario')}${chip('vendidos', 'Vendidos')}</div>
        <div style="margin-bottom:10px"><span id="nxVhBuscarLupa"></span></div>
        <div id="nxVhLista">${cards}</div>
      </div>`;
    // NPGS §5: la lupa se pinta DESPUÉS de view.innerHTML — el <span> recién existe aquí.
    try { pintarLupaVh(); } catch (e) {}
  }

  window.nxVehFiltro = function (k) { _vhFiltro = k; const v = document.getElementById('v-vehiculos'); if (v) renderLista(v); };
  window.nxVehBuscar = function (q) {
    const t = String(q || '').trim().toLowerCase();
    document.querySelectorAll('#nxVhLista .nxVhCard').forEach(c => { const b = c.getAttribute('data-busca') || ''; c.style.display = (!t || b.includes(t)) ? '' : 'none'; });
  };
  // NPGS §5: lupa colapsada. cont: SÍ funciona aquí — las tarjetas son <div> hijos directos de
  // #nxVhLista y el contador compartido excluye los <div> ocultos por display:none (offsetParent).
  function pintarLupaVh() {
    const box = document.getElementById('nxVhBuscarLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_nxVhBuscar')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'nxVhBuscar',
      placeholder: 'Marca, placa, chasis o comprador…',
      onterm: function (v) { window.nxVehBuscar(v); }
    });
  }

  window.nxAbrirVehiculos = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    const view = ensureView(); if (!view) return;
    try { window.nxGuardarLugar && window.nxGuardarLugar('vehiculos'); } catch (e) {}
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const pt = document.getElementById('pttl'); if (pt) pt.textContent = 'VEHÍCULOS';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:8px;font-weight:600">Cargando vehículos...</div></div></div>';
    try { await cargarVehiculos(); renderLista(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudieron cargar los vehículos.<br><span style="font-size:11px;color:#475569">' + esc(String(e && e.message || e)) + '</span></div></div>'; }
  };

  // ── Formulario nuevo/editar ──
  window.nxVehNuevo = function () { abrirForm(null); };
  window.nxVehEditar = function (id) { const v = _vehiculos.find(x => String(x.id) === String(id)); if (v) abrirForm(v); };

  function fld(id, lbl, value, ph, type, extra) {
    return `<div class="fr"><label>${lbl}</label><input id="${id}" ${type === 'money' ? 'data-nx-money inputmode="numeric"' : type === 'date' ? 'type="date"' : type === 'number' ? 'type="number" inputmode="numeric"' : 'class="no-upper"'} value="${esc(value == null ? '' : value)}" placeholder="${ph || ''}" ${extra || ''}></div>`;
  }

  function abrirForm(v) {
    cerrarModal('nxVhModal');
    const e = v || {};
    const ov = document.createElement('div'); ov.id = 'nxVhModal'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:480px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-car"></i> ${v ? 'Editar vehículo' : 'Nuevo vehículo'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhModal').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">DATOS DEL VEHÍCULO</div>
          <div class="fr-row">${fld('vhMarca', 'Marca', e.marca, 'Toyota')}${fld('vhModelo', 'Modelo', e.modelo, 'Corolla')}</div>
          <div class="fr-row">${fld('vhAnio', 'Año', e.anio, '2018', 'number')}${fld('vhColor', 'Color', e.color, 'Gris')}</div>
          <div class="fr-row">${fld('vhTipo', 'Tipo', e.tipo, 'Sedán / Jeepeta')}${fld('vhPlaca', 'Placa', e.placa, 'A000000')}</div>
          <div class="fr-row">${fld('vhChasis', 'Chasis (VIN)', e.chasis, 'No. de chasis')}${fld('vhMotor', 'No. de motor', e.no_motor, 'No. de motor')}</div>
          ${fld('vhMatricula', 'No. de matrícula', e.no_matricula, 'No. de matrícula')}
          <div class="fr"><label>Descripción / observaciones</label><textarea id="vhDesc" class="no-upper" rows="2" placeholder="Detalles del vehículo">${esc(e.descripcion || '')}</textarea></div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">COMPRA</div>
          <div class="fr-row">${fld('vhCompraPrecio', 'Precio de compra', e.compra_precio ? Math.round(e.compra_precio) : '', '0', 'money')}${fld('vhCompraFecha', 'Fecha de compra', e.compra_fecha || hoy(), '', 'date')}</div>
          <div class="fr-row">${fld('vhVendNom', 'Vendedor (a quién compró)', e.vendedor_nombre, 'Nombre')}${fld('vhVendCed', 'Cédula del vendedor', e.vendedor_cedula, '000-0000000-0')}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxVhModal').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxVehGuardar('${v ? v.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  }

  window.nxVehGuardar = async function (id) {
    const body = {
      marca: (val('vhMarca') || '').trim() || null,
      modelo: (val('vhModelo') || '').trim() || null,
      anio: parseInt(val('vhAnio'), 10) || null,
      color: (val('vhColor') || '').trim() || null,
      tipo: (val('vhTipo') || '').trim() || null,
      placa: (val('vhPlaca') || '').trim() || null,
      chasis: (val('vhChasis') || '').trim() || null,
      no_motor: (val('vhMotor') || '').trim() || null,
      no_matricula: (val('vhMatricula') || '').trim() || null,
      descripcion: (val('vhDesc') || '').trim() || null,
      compra_precio: parseMoney(val('vhCompraPrecio')),
      compra_fecha: val('vhCompraFecha') || hoy(),
      vendedor_nombre: (val('vhVendNom') || '').trim() || null,
      vendedor_cedula: (val('vhVendCed') || '').trim() || null
    };
    if (!body.marca && !body.modelo) { toast('err', 'Pon al menos la marca o el modelo'); return; }
    try {
      if (id) { await getAPI().patch('vehiculos', 'id=eq.' + id, body); }
      else { body.created_by_name = nomAdmin(); await getAPI().post('vehiculos', body); }
      toast('ok', id ? 'Vehículo actualizado' : 'Vehículo registrado');
      cerrarModal('nxVhModal');
      await cargarVehiculos();
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  // ── Detalle ──
  window.nxVehVer = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    cerrarModal('nxVhDet');
    const gastos = gastosDe(v).slice().sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const ct = costoTotal(v), pv = Number(v.precio_venta || 0), gan = gananciaDe(v), mp = margenPctDe(v);
    const vendido = v.estado === 'vendido';
    const datos = [
      ['Año', v.anio], ['Color', v.color], ['Tipo', v.tipo], ['Placa', v.placa],
      ['Chasis', v.chasis], ['Motor', v.no_motor], ['Matrícula', v.no_matricula]
    ].filter(x => x[1]).map(x => `<div style="font-size:11px"><span style="color:#475569">${x[0]}:</span> <b style="color:#1e293b">${esc(x[1])}</b></div>`).join('');
    const gastosHTML = gastos.length === 0
      ? '<div style="color:#475569;font-size:11px;padding:10px">Sin gastos de reacondicionamiento aún</div>'
      : gastos.map(g => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><div><b style="color:#0f172a">${esc(g.concepto || 'Gasto')}</b> <span style="color:#475569">${(g.fecha || '').slice(0, 10)}</span>${g.nota ? `<div style="color:#475569;font-size:10px">${esc(g.nota)}</div>` : ''}</div><div style="display:flex;align-items:center;gap:6px"><b style="color:#dc2626">${fmt(g.costo)}</b><button class="btn bsm bghost" type="button" onclick="window.nxVehDelGasto('${g.id}','${id}')" title="Eliminar" aria-label="Eliminar"><i class="ti ti-minus" style="color:#dc2626"></i></button></div></div>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxVhDet'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:480px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-car"></i> ${esc(tituloVeh(v))}</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhDet').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px">${datos || '<span style="font-size:11px;color:#475569">Sin datos adicionales</span>'}</div>
            ${vendido ? '<span style="font-size:9px;font-weight:800;color:#16a34a;background:#dcfce7;padding:3px 9px;border-radius:20px">VENDIDO</span>' : '<span style="font-size:9px;font-weight:800;color:#6d28d9;background:#eff6ff;padding:3px 9px;border-radius:20px">INVENTARIO</span>'}
          </div>
          ${v.descripcion ? `<div style="font-size:11px;color:#475569;margin-bottom:8px;background:#f8fafc;border-radius:8px;padding:7px 9px">📝 ${esc(v.descripcion)}</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
            ${kpi('Compra', fmt(v.compra_precio), '#6d28d9')}${kpi('Reacond.', fmt(totalGastos(v)), '#ea580c')}${kpi('Costo total', fmt(ct), '#0f172a')}
          </div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:8px 0 4px">REACONDICIONAMIENTO (${gastos.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px">${gastosHTML}</div>
          ${!vendido ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:10px">
            <div style="display:flex;gap:6px;margin-bottom:6px"><input id="vhGConcepto" class="no-upper" placeholder="Concepto (pintura, interior...)" style="flex:2;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;outline:none"><input id="vhGCosto" data-nx-money inputmode="numeric" placeholder="Costo" style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;outline:none"></div>
            <div style="display:flex;gap:6px"><input id="vhGFecha" type="date" value="${hoy()}" style="flex:0 0 auto;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;outline:none"><input id="vhGNota" class="no-upper" placeholder="Nota (opcional)" style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;outline:none"><button aria-label="Agregar un gasto" class="btn bc1 bsm" type="button" onclick="window.nxVehAddGasto('${id}')"><i class="ti ti-plus"></i></button></div>
          </div>` : ''}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:6px 0 4px">PRECIO DE VENTA</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px">
            ${!vendido ? `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;font-size:11px;color:#475569">Margen:
              <input id="vhMargenVal" inputmode="decimal" placeholder="0" value="${v.margen_valor ? Number(v.margen_valor) : ''}" style="width:74px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none">
              <select id="vhMargenTipo" style="padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff"><option value="monto"${v.margen_tipo !== 'porcentaje' ? ' selected' : ''}>RD$</option><option value="porcentaje"${v.margen_tipo === 'porcentaje' ? ' selected' : ''}>%</option></select>
              <button class="btn bsm bghost" type="button" onclick="window.nxVehAplicarMargen('${id}')">Calcular</button></div>
              <div style="display:flex;gap:6px;align-items:center"><input id="vhPrecioVenta" data-nx-money inputmode="numeric" placeholder="Precio de venta" value="${pv ? Math.round(pv) : ''}" oninput="window.nxVehPreviewGanancia('${id}')" style="flex:1;min-width:0;padding:10px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:15px;font-weight:700;outline:none"><button class="btn bc1 bsm" type="button" onclick="window.nxVehGuardarPrecio('${id}')"><i class="ti ti-device-floppy"></i> Guardar</button></div>
              <div id="vhGanPrev" style="font-size:11px;margin-top:6px;color:${gan >= 0 ? '#16a34a' : '#dc2626'};font-weight:700">${pv > 0 ? 'Ganancia: ' + fmt(gan) + ' · margen ' + mp.toFixed(1) + '%' : 'Define un precio para ver la ganancia'}</div>`
        : `<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#475569">Precio de venta</span><b style="color:#6d28d9">${fmt(pv)}</b></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px"><span style="color:#475569">Ganancia</span><b style="color:${gan >= 0 ? '#16a34a' : '#dc2626'}">${fmt(gan)} · ${mp.toFixed(1)}%</b></div>${v.comprador_nombre ? `<div style="font-size:11px;color:#475569;margin-top:6px">Comprador: <b>${esc(v.comprador_nombre)}</b>${v.venta_fecha ? ' · ' + esc(v.venta_fecha) : ''}</div>` : ''}`}
          </div>
        </div>
        <div style="border-top:1px solid #f1f5f9;padding-top:10px;margin-top:10px">
          ${!vendido ? `<button class="btn bc1 nxPrPagar" type="button" onclick="window.nxVehVender('${id}')"><i class="ti ti-cash"></i> Registrar venta</button>` : `<div style="text-align:center;margin-bottom:8px"><button class="btn bsm" type="button" onclick="window.nxVehReabrir('${id}')"><i class="ti ti-rotate"></i> Volver a inventario</button></div>`}
          <div class="nxPrActs">
            <button class="nxPrAcc" type="button" onclick="window.nxVehActoVenta('${id}')"><i class="ti ti-file-certificate"></i> Acto venta</button>
            <button class="nxPrAcc" type="button" onclick="window.nxVehDocs('${id}')"><i class="ti ti-folder"></i> Docs${Array.isArray(v.documentos) && v.documentos.length ? ' (' + v.documentos.length + ')' : ''}</button>
            <button class="nxPrAcc" type="button" onclick="window.nxVehEditar('${id}')"><i class="ti ti-edit"></i> Editar</button>
            <button class="nxPrAcc del" type="button" onclick="window.nxVehBorrar('${id}')"><i class="ti ti-minus"></i> Borrar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  };

  window.nxVehPreviewGanancia = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const pv = parseMoney(val('vhPrecioVenta')); const ct = costoTotal(v); const gan = pv - ct; const mp = ct > 0 ? gan / ct * 100 : 0;
    const el = document.getElementById('vhGanPrev'); if (!el) return;
    el.style.color = gan >= 0 ? '#16a34a' : '#dc2626';
    el.textContent = pv > 0 ? ('Ganancia: ' + fmt(gan) + ' · margen ' + mp.toFixed(1) + '%') : 'Define un precio para ver la ganancia';
  };

  window.nxVehAplicarMargen = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const ct = costoTotal(v);
    const tipo = val('vhMargenTipo') || 'monto';
    const mv = Number(String(val('vhMargenVal') || '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
    const precio = tipo === 'porcentaje' ? Math.round(ct * (1 + mv / 100)) : Math.round(ct + mv);
    const inp = document.getElementById('vhPrecioVenta');
    if (inp) { inp.value = precio.toLocaleString('en-US'); }
    window.nxVehPreviewGanancia(id);
  };

  window.nxVehGuardarPrecio = async function (id) {
    const precio = parseMoney(val('vhPrecioVenta'));
    const tipo = val('vhMargenTipo') || 'monto';
    const mv = Number(String(val('vhMargenVal') || '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, { precio_venta: precio, margen_tipo: tipo, margen_valor: mv });
      const v = _vehiculos.find(x => String(x.id) === String(id)); if (v) { v.precio_venta = precio; v.margen_tipo = tipo; v.margen_valor = mv; }
      toast('ok', 'Precio de venta guardado', fmt(precio));
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  window.nxVehAddGasto = async function (id) {
    const concepto = (val('vhGConcepto') || '').trim();
    const costo = parseMoney(val('vhGCosto'));
    if (!concepto) { toast('err', 'Pon el concepto del gasto'); return; }
    if (costo <= 0) { toast('err', 'Pon el costo'); return; }
    try {
      await getAPI().post('vehiculo_gastos', { vehiculo_id: id, concepto: concepto, costo: costo, fecha: val('vhGFecha') || hoy(), nota: (val('vhGNota') || '').trim() || null, created_by_name: nomAdmin() });
      toast('ok', 'Gasto agregado', concepto + ' · ' + fmt(costo));
      await cargarVehiculos();
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo agregar', String(e && e.message || e)); }
  };

  window.nxVehDelGasto = async function (gid, vid) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await getAPI().del('vehiculo_gastos', 'id=eq.' + gid);
      toast('ok', 'Gasto eliminado');
      await cargarVehiculos();
      window.nxVehVer(vid);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  window.nxVehBorrar = async function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    if (!confirm('¿Eliminar el vehículo "' + tituloVeh(v) + '" y todos sus gastos? Esta acción no se puede deshacer.')) return;
    try {
      await getAPI().del('vehiculos', 'id=eq.' + id);
      toast('ok', 'Vehículo eliminado');
      cerrarModal('nxVhDet');
      await cargarVehiculos();
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  window.nxVehReabrir = async function (id) {
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, { estado: 'inventario' });
      const v = _vehiculos.find(x => String(x.id) === String(id)); if (v) v.estado = 'inventario';
      toast('ok', 'Vehículo de vuelta en inventario');
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // ── Registrar venta (comprador) ──
  window.nxVehVender = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    cerrarModal('nxVhVenta');
    const ov = document.createElement('div'); ov.id = 'nxVhVenta'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-cash"></i> Registrar venta</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhVenta').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">${esc(tituloVeh(v))} · costo total ${fmt(costoTotal(v))}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">COMPRADOR</div>
          ${fld('vsNom', 'Nombre del comprador', v.comprador_nombre, 'Nombre Apellido')}
          <div class="fr-row">${fld('vsCed', 'Cédula', v.comprador_cedula, '000-0000000-0')}${fld('vsTel', 'Teléfono', v.comprador_telefono, '809-000-0000')}</div>
          ${fld('vsDir', 'Dirección', v.comprador_direccion, 'Calle, sector, ciudad')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">VENTA</div>
          <div class="fr-row">${fld('vsPrecio', 'Precio de venta', v.precio_venta ? Math.round(v.precio_venta) : '', '0', 'money')}${fld('vsFecha', 'Fecha de venta', v.venta_fecha || hoy(), '', 'date')}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxVhVenta').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxVehConfirmarVenta('${id}')"><i class="ti ti-check"></i> Confirmar venta</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  };

  window.nxVehConfirmarVenta = async function (id) {
    const precio = parseMoney(val('vsPrecio'));
    if (precio <= 0) { toast('err', 'Pon el precio de venta'); return; }
    const body = {
      estado: 'vendido', precio_venta: precio, venta_fecha: val('vsFecha') || hoy(),
      comprador_nombre: (val('vsNom') || '').trim() || null,
      comprador_cedula: (val('vsCed') || '').trim() || null,
      comprador_telefono: (val('vsTel') || '').trim() || null,
      comprador_direccion: (val('vsDir') || '').trim() || null
    };
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, body);
      Object.assign(_vehiculos.find(x => String(x.id) === String(id)) || {}, body);
      toast('ok', 'Venta registrada', fmt(precio));
      cerrarModal('nxVhVenta');
      await cargarVehiculos();
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo registrar la venta', String(e && e.message || e)); }
  };

  // ── Acto de venta (documento imprimible / PDF) ──
  window.nxVehActoVenta = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const c = _vhCfg || {};
    const precio = Number(v.precio_venta || 0);
    const vendNom = (c.vendedor_nombre && c.vendedor_nombre.trim()) || nomAdmin();
    const vendDet = [c.vendedor_cedula ? 'portador(a) de la cédula No. <b>' + esc(c.vendedor_cedula) + '</b>' : '', c.vendedor_direccion ? 'domiciliado(a) en ' + esc(c.vendedor_direccion) : '', c.vendedor_telefono ? 'Tel. ' + esc(c.vendedor_telefono) : ''].filter(Boolean).join(', ');
    const compDet = [v.comprador_cedula ? 'portador(a) de la cédula No. <b>' + esc(v.comprador_cedula) + '</b>' : '', v.comprador_direccion ? 'domiciliado(a) en ' + esc(v.comprador_direccion) : '', v.comprador_telefono ? 'Tel. ' + esc(v.comprador_telefono) : ''].filter(Boolean).join(', ');
    const descFilas = [['Marca', v.marca], ['Modelo', v.modelo], ['Año', v.anio], ['Color', v.color], ['Tipo', v.tipo], ['Chasis (VIN)', v.chasis], ['No. de motor', v.no_motor], ['Placa', v.placa], ['No. de matrícula', v.no_matricula]].filter(x => x[1]).map(x => `<tr><td style="color:#555;width:42%">${x[0]}</td><td><b>${esc(x[1])}</b></td></tr>`).join('');
    const firmaTestigo = (nom, ced) => nom ? `<div class="firma" style="max-width:48%">${esc(nom)}<br><span style="color:#777;font-size:11px">Testigo${ced ? '<br>Céd. ' + esc(ced) : ''}</span></div>` : '';
    const testigosHTML = (c.testigo1_nombre || c.testigo2_nombre) ? `<div style="font-size:12px;text-align:center;color:#475569;margin:36px 0 0;font-weight:700">TESTIGOS</div><div class="firmas" style="margin-top:40px;justify-content:space-around">${firmaTestigo(c.testigo1_nombre, c.testigo1_cedula)}${firmaTestigo(c.testigo2_nombre, c.testigo2_cedula)}</div>` : '';
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acto de venta - ${esc(tituloVeh(v))}</title>
      <style>body{font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:660px;margin:0 auto;padding:26px 22px;line-height:1.55;font-size:13.5px}h1{font-size:18px;text-align:center;margin:0 0 16px;letter-spacing:.5px}p{margin:9px 0;text-align:justify}.parte{background:#f6f7f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin:10px 0;font-size:12.5px}table.veh{width:100%;border-collapse:collapse;margin:8px 0;font-size:12.5px}table.veh td{padding:5px 9px;border-bottom:1px solid #ececec}.firmas{display:flex;justify-content:space-between;gap:24px;margin-top:54px}.firma{flex:1;text-align:center;border-top:1.5px solid #1a1a1a;padding-top:6px;font-size:12px}.foot{color:#999;font-size:10.5px;text-align:center;margin-top:26px}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;background:#1e3a6e;margin:-26px -22px 16px;padding:11px 16px"><button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:Segoe UI,system-ui,-apple-system,sans-serif">&#10005; Cerrar</button><span style="color:#fff;font-size:11.5px;opacity:.85;font-family:Segoe UI,system-ui,-apple-system,sans-serif"></span></div>
        <h1>CONTRATO DE VENTA DE VEHÍCULO DE MOTOR</h1>
        <p><b>ENTRE:</b> De una parte, <b>${esc(vendNom)}</b>${vendDet ? ', ' + vendDet : ''}, quien en lo adelante se denominará <b>EL VENDEDOR</b>; y de la otra parte, <b>${esc(v.comprador_nombre || '____________________')}</b>${compDet ? ', ' + compDet : ''}, quien en lo adelante se denominará <b>EL COMPRADOR</b>.</p>
        <p><b>PRIMERO:</b> EL VENDEDOR declara ser el único y legítimo propietario del vehículo de motor que se describe a continuación:</p>
        <table class="veh">${descFilas || '<tr><td colspan="2" style="text-align:center;color:#888">Sin descripción</td></tr>'}</table>
        <p><b>SEGUNDO:</b> EL VENDEDOR, por medio del presente acto, VENDE, CEDE y TRANSFIERE con todas las garantías de derecho, a favor de EL COMPRADOR, el vehículo descrito anteriormente, por el precio convenido de <b>${fmt(precio)}</b> (<b>${numLetras(precio)} PESOS DOMINICANOS</b>).</p>
        <p><b>TERCERO:</b> EL VENDEDOR declara haber recibido de EL COMPRADOR el monto total acordado, otorgándole por medio del presente el más amplio y formal recibo de descargo y finiquito.</p>
        <p><b>CUARTO:</b> EL VENDEDOR transfiere a EL COMPRADOR todos los derechos de propiedad sobre el referido vehículo, declarando que el mismo se encuentra libre de toda carga, gravamen u oposición.</p>
        <p><b>QUINTO:</b> EL COMPRADOR declara aceptar la presente venta y recibir el vehículo en las condiciones físicas y mecánicas en que se encuentra, las cuales declara conocer.</p>
        <p>Hecho y firmado de buena fe, en dos (2) originales de un mismo tenor y efecto, uno para cada parte${testigosHTML ? ', ante los testigos que firman al pie' : ''}, en la República Dominicana, a los <b>${fechaLarga(v.venta_fecha || hoy())}</b>.</p>
        <div class="firmas">
          <div class="firma">EL VENDEDOR<br><span style="color:#777;font-size:11px">${esc(vendNom)}${c.vendedor_cedula ? '<br>Céd. ' + esc(c.vendedor_cedula) : ''}</span></div>
          <div class="firma">EL COMPRADOR<br><span style="color:#777;font-size:11px">${esc(v.comprador_nombre || '')}${v.comprador_cedula ? '<br>Céd. ' + esc(v.comprador_cedula) : ''}</span></div>
        </div>
        ${testigosHTML}
        ${c.abogado_nombre ? `<div style="margin-top:40px;border-top:1px dashed #bbb;padding-top:16px">
          <p style="font-size:12px"><b>LEGALIZACIÓN DE FIRMAS.</b> Yo, <b>${esc(c.abogado_nombre)}</b>, Abogado(a) Notario(a)${c.abogado_matricula ? ', con Matrícula del Colegio de Abogados de la República Dominicana (CARD) No. <b>' + esc(c.abogado_matricula) + '</b>' : ''}${c.abogado_cedula ? ', portador(a) de la cédula No. <b>' + esc(c.abogado_cedula) + '</b>' : ''}${c.abogado_telefono ? ', Tel. ' + esc(c.abogado_telefono) : ''}, CERTIFICO Y DOY FE de que las firmas que anteceden fueron puestas libre y voluntariamente en mi presencia por las partes contratantes, quienes me declararon que esas son las firmas que acostumbran usar en todos los actos de su vida pública y privada. En la República Dominicana, a los ${fechaLarga(v.venta_fecha || hoy())}.</p>
          <div class="firmas" style="margin-top:46px"><div class="firma" style="max-width:60%">${esc(c.abogado_nombre)}<br><span style="color:#777;font-size:11px">Abogado(a) Notario(a)${c.abogado_matricula ? '<br>CARD No. ' + esc(c.abogado_matricula) : ''}</span></div></div>
        </div>` : ''}
        <button class="noprint" onclick="window.print()" style="width:100%;padding:13px;margin-top:30px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:Segoe UI,system-ui,-apple-system,sans-serif">🖨️ Imprimir / Guardar PDF</button>
        <div class="foot">${esc(vendNom)} · Documento generado el ${hoy()}</div>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('err', 'Permite las ventanas emergentes para ver el acto de venta'); return; } w.document.write(html); w.document.close(); }
    catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };

  // ── Documentos del vehículo ──
  const DOCS_BUCKET = 'comprobantes';
  let _vhDocSubiendo = false;
  async function subirDocVeh(id, file) {
    const api = getAPI();
    if (!api || !api.url || !api.key) throw new Error('Sin conexión');
    let ext = '';
    if (file.name && file.name.includes('.')) ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext) ext = (file.type && file.type.includes('png')) ? 'png' : (file.type && file.type.includes('pdf')) ? 'pdf' : 'jpg';
    const path = `vehiculos/${id}/${Date.now()}.${ext}`;
    const fd = new FormData(); fd.append('', file, 'doc.' + ext);
    const headers = { 'apikey': api.key, 'Authorization': 'Bearer ' + (api.token || api.key) };
    let resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'POST', headers, body: fd });
    if (!resp.ok && resp.status === 400) resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'PUT', headers, body: fd });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + (await resp.text()).slice(0, 120));
    return { path: path, url: `${api.url}/storage/v1/object/public/${DOCS_BUCKET}/${path}` };
  }
  window.nxVehSubirDoc = async function (id, input, tipo) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!/^image\//.test(file.type) && !/pdf$/i.test(file.type || '') && !/\.(jpg|jpeg|png|webp|pdf|heic)$/i.test(file.name || '')) { toast('err', 'Archivo no válido', 'Sube una imagen o PDF'); input.value = ''; return; }
    if (_vhDocSubiendo) return; _vhDocSubiendo = true;
    const v = _vehiculos.find(x => String(x.id) === String(id));
    toast('ok', 'Subiendo documento…', file.name);
    try {
      const r = await subirDocVeh(id, file);
      const arr = Array.isArray(v.documentos) ? v.documentos.slice() : [];
      arr.push({ nombre: file.name, tipo: tipo || 'otro', url: r.url, path: r.path, mime: file.type || '', fecha: hoy() });
      await getAPI().patch('vehiculos', 'id=eq.' + id, { documentos: arr });
      v.documentos = arr;
      toast('ok', 'Documento guardado', file.name);
      window.nxVehDocs(id);
    } catch (e) { toast('err', 'No se pudo subir', String(e && e.message || e).slice(0, 90)); }
    _vhDocSubiendo = false; try { input.value = ''; } catch (e) {}
  };
  window.nxVehBorrarDoc = async function (id, idx) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const arr = Array.isArray(v.documentos) ? v.documentos.slice() : []; const doc = arr[idx]; if (!doc) return;
    if (!confirm('¿Eliminar el documento "' + (doc.nombre || '') + '"?')) return;
    arr.splice(idx, 1);
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, { documentos: arr }); v.documentos = arr;
      try { const api = getAPI(); if (doc.path && api) await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${doc.path}`, { method: 'DELETE', headers: { 'apikey': api.key, 'Authorization': 'Bearer ' + (api.token || api.key) } }); } catch (e) {}
      toast('ok', 'Documento eliminado'); window.nxVehDocs(id);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };
  const VH_DOC_TIPOS = [{ k: 'matricula', lbl: 'Matrícula', ic: 'ti-file-text' }, { k: 'acto', lbl: 'Acto firmado', ic: 'ti-file-certificate' }, { k: 'cedula', lbl: 'Cédula', ic: 'ti-id' }, { k: 'foto', lbl: 'Foto', ic: 'ti-photo' }, { k: 'otro', lbl: 'Otro', ic: 'ti-paperclip' }];
  window.nxVehDocs = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    cerrarModal('nxVhDocs');
    const docs = Array.isArray(v.documentos) ? v.documentos : [];
    const tiles = VH_DOC_TIPOS.map(t => `<label style="flex:1 1 64px;min-width:64px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:10px 5px;text-align:center"><input type="file" accept="image/*,.pdf" style="display:none" onchange="window.nxVehSubirDoc('${id}',this,'${t.k}')"><i class="ti ${t.ic}" style="font-size:19px;color:#6d28d9"></i><span style="font-size:9.5px;font-weight:700;color:#475569;line-height:1.1">${t.lbl}</span></label>`).join('');
    const lista = docs.length ? docs.map((d, i) => { const tlbl = (VH_DOC_TIPOS.find(t => t.k === d.tipo) || {}).lbl || 'Documento'; return `<div style="display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid #f1f5f9"><i class="ti ${/pdf/i.test(d.mime || d.url || '') ? 'ti-file-type-pdf' : 'ti-photo'}" style="font-size:18px;color:#475569"></i><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.nombre || tlbl)}</div><div style="font-size:10px;color:#475569">${esc(tlbl)} · ${esc((d.fecha || '').slice(0, 10))}</div></div><button class="btn bsm bghost" type="button" onclick="window.nxVerComprobante && window.nxVerComprobante('${esc(d.url)}')" title="Ver" aria-label="Ver"><i class="ti ti-eye" style="color:#6d28d9"></i></button><button class="btn bsm bghost" type="button" onclick="window.nxVehBorrarDoc('${id}',${i})" title="Eliminar" aria-label="Eliminar"><i class="ti ti-minus" style="color:#dc2626"></i></button></div>`; }).join('') : '<div style="color:#475569;font-size:11px;padding:14px;text-align:center">Sin documentos. Toca un tipo arriba para subir.</div>';
    const ov = document.createElement('div'); ov.id = 'nxVhDocs'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:86vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-folder"></i> Documentos — ${esc(tituloVeh(v))}</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhDocs').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">Matrícula, acto firmado, cédula del comprador, fotos u otros (imágenes o PDF).</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${tiles}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:4px 0 4px">ARCHIVOS (${docs.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${lista}</div>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };

  // ── Configuración (vendedor + abogado + testigos del acto de venta) ──
  window.nxVehConfig = function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    cerrarModal('nxVhCfg');
    const c = _vhCfg || {};
    const f = (id, lbl, value, ph) => `<div class="fr"><label>${lbl}</label><input id="${id}" class="no-upper" value="${esc(value || '')}" placeholder="${ph || ''}"></div>`;
    const ov = document.createElement('div'); ov.id = 'nxVhCfg'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:460px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-settings"></i> Datos del acto de venta</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhCfg').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:10px">Estos datos salen en el acto de venta como EL VENDEDOR y su legalización.</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">VENDEDOR (usted)</div>
          ${f('vcVendNom', 'Nombre del vendedor', c.vendedor_nombre, 'Nombre o empresa')}
          <div class="fr-row">${f('vcVendCed', 'Cédula / RNC', c.vendedor_cedula, '000-0000000-0')}${f('vcVendTel', 'Teléfono', c.vendedor_telefono, '809-000-0000')}</div>
          ${f('vcVendDir', 'Dirección', c.vendedor_direccion, 'Calle, sector, ciudad')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">ABOGADO (legalización)</div>
          ${f('vcAboNom', 'Nombre del abogado(a)', c.abogado_nombre, 'Lic. Nombre Apellido')}
          <div class="fr-row">${f('vcAboCed', 'Cédula', c.abogado_cedula, '000-0000000-0')}${f('vcAboMat', 'Matrícula (CARD)', c.abogado_matricula, 'No. de matrícula')}</div>
          ${f('vcAboTel', 'Teléfono / Estudio', c.abogado_telefono, '809-000-0000')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">TESTIGOS (opcional)</div>
          <div class="fr-row">${f('vcT1Nom', 'Testigo 1 — nombre', c.testigo1_nombre, 'Nombre')}${f('vcT1Ced', 'Cédula', c.testigo1_cedula, '000-0000000-0')}</div>
          <div class="fr-row">${f('vcT2Nom', 'Testigo 2 — nombre', c.testigo2_nombre, 'Nombre')}${f('vcT2Ced', 'Cédula', c.testigo2_cedula, '000-0000000-0')}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxVhCfg').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxVehGuardarConfig()"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.nxVehGuardarConfig = async function () {
    const body = {
      vendedor_nombre: (val('vcVendNom') || '').trim() || null, vendedor_cedula: (val('vcVendCed') || '').trim() || null,
      vendedor_telefono: (val('vcVendTel') || '').trim() || null, vendedor_direccion: (val('vcVendDir') || '').trim() || null,
      abogado_nombre: (val('vcAboNom') || '').trim() || null, abogado_cedula: (val('vcAboCed') || '').trim() || null,
      abogado_matricula: (val('vcAboMat') || '').trim() || null, abogado_telefono: (val('vcAboTel') || '').trim() || null,
      testigo1_nombre: (val('vcT1Nom') || '').trim() || null, testigo1_cedula: (val('vcT1Ced') || '').trim() || null,
      testigo2_nombre: (val('vcT2Nom') || '').trim() || null, testigo2_cedula: (val('vcT2Ced') || '').trim() || null,
      updated_at: new Date().toISOString()
    };
    try {
      let r = await getAPI().patch('vehiculos_config', 'id=eq.1', body);
      if (!r || (Array.isArray(r) && r.length === 0)) { try { await getAPI().post('vehiculos_config', Object.assign({ id: 1 }, body)); } catch (e) {} }
      _vhCfg = Object.assign({}, _vhCfg, body);
      cerrarModal('nxVhCfg'); toast('ok', 'Datos del acto guardados');
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  // ── Exportar a Excel (CSV) ──
  window.nxVehExportar = function () {
    if (!_vehiculos.length) { toast('warn', 'No hay vehículos para exportar'); return; }
    const cab = ['Marca', 'Modelo', 'Año', 'Color', 'Placa', 'Chasis', 'Compra', 'Reacondicionamiento', 'Costo total', 'Precio venta', 'Ganancia', 'Margen %', 'Estado', 'Comprador', 'Fecha venta'];
    const filas = _vehiculos.map(v => [v.marca || '', v.modelo || '', v.anio || '', v.color || '', v.placa || '', v.chasis || '', Math.round(Number(v.compra_precio || 0)), Math.round(totalGastos(v)), Math.round(costoTotal(v)), Math.round(Number(v.precio_venta || 0)), Math.round(gananciaDe(v)), margenPctDe(v).toFixed(1), v.estado === 'vendido' ? 'Vendido' : 'Inventario', v.comprador_nombre || '', v.venta_fecha || '']);
    const esc2 = x => { const s = String(x == null ? '' : x); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cab, ...filas].map(r => r.map(esc2).join(',')).join('\r\n');
    try { const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vehiculos_' + hoy() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 500); toast('ok', 'Excel exportado', _vehiculos.length + ' vehículos'); }
    catch (e) { toast('err', 'No se pudo exportar', String(e && e.message || e)); }
  };

  // ── Registrar el módulo en el hub de Multiempresa ──
  function registrar() {
    try { if (window.nxMERegistrar) window.nxMERegistrar({ orden: 2, nombre: 'Compra y Venta de Vehículos', desc: 'Inventario, costos, ganancia y acto de venta', icon: 'ti-car', color: '#6d28d9', bg: '#eff6ff', onclick: 'window.nxAbrirVehiculos()' }); } catch (e) {}
  }
  function init() { let n = 0; const t = function () { n++; if (window.nxMERegistrar) { registrar(); return; } if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

