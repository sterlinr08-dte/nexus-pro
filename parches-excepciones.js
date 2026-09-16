/* NEXUS PRO · Centro de excepciones operativas
   Supervisa fallos de venta/inventario/reparación/contabilidad. No incluye impuestos. */
(function () {
  'use strict';
  if (window.__nxExcepcionesOperativas20260916) return;
  window.__nxExcepcionesOperativas20260916 = true;

  var EXC = [];
  var filtro = 'abierta';
  var TIPOS = {
    POS_VENTA_IMEI_SIN_CONFIRMAR: 'IMEI sin confirmar',
    POS_VENTA_ITEMS_INCOMPLETOS: 'Líneas de venta incompletas',
    REP_ENTREGA_INCOMPLETA: 'Entrega de reparación incompleta',
    POS_VENTA_INVENTARIO_PENDIENTE: 'Inventario pendiente',
    ASIENTO_DESCUADRADO: 'Asiento descuadrado'
  };

  function h(v) {
    if (typeof window.escHtml === 'function') return window.escHtml(v);
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function fecha(v) {
    try { return new Date(v).toLocaleString('es-DO', {dateStyle:'short', timeStyle:'short'}); }
    catch (_) { return v || '—'; }
  }

  function montar() {
    var audit = document.getElementById('auditCfg');
    if (!audit || document.getElementById('nxExcCentro')) return;
    var card = audit.closest('.nc');
    if (!card || !card.parentNode) return;
    var box = document.createElement('div');
    box.id = 'nxExcCentro';
    box.className = 'nc';
    box.style.marginBottom = '12px';
    card.parentNode.insertBefore(box, card);
  }

  function badge(abiertas) {
    var b = document.getElementById('nxExcBadge');
    if (!b) {
      var item = document.querySelector('[onclick^="navConfig(8"]');
      if (item) {
        b = document.createElement('span');
        b.id = 'nxExcBadge';
        b.className = 'ni-b';
        item.appendChild(b);
      }
    }
    if (b) {
      b.textContent = abiertas;
      b.style.display = abiertas ? '' : 'none';
      b.title = abiertas + ' excepción(es) operativa(s) abierta(s)';
    }
  }

  function pintar() {
    montar();
    var box = document.getElementById('nxExcCentro');
    if (!box) return;
    var abiertas = EXC.filter(function (x) { return x.estado === 'abierta'; });
    var criticas = abiertas.filter(function (x) { return x.severidad === 'critica'; });
    var resueltas = EXC.filter(function (x) { return x.estado === 'resuelta'; });
    var lista = EXC.filter(function (x) { return filtro === 'todas' || x.estado === filtro; });
    badge(abiertas.length);

    box.innerHTML = '<div class="ch"><div><div class="ct"><i class="ti ti-alert-triangle"></i> Centro de excepciones operativas</div>' +
      '<div class="ct-s">Fallos que requieren seguimiento · la operación fiscal está excluida</div></div>' +
      '<button class="btn bsm bghost" onclick="nxExcCargar(true)"><i class="ti ti-refresh"></i> Actualizar</button></div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px">' +
        tarjeta('Pendientes', abiertas.length, '#d97706') +
        tarjeta('Críticas', criticas.length, '#dc2626') +
        tarjeta('Resueltas', resueltas.length, '#059669') +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' +
        botonFiltro('abierta','Pendientes') + botonFiltro('resuelta','Resueltas') + botonFiltro('todas','Todas') +
      '</div>' +
      (lista.length ? '<div style="display:grid;gap:8px">' + lista.map(fila).join('') + '</div>' :
        '<div class="empty" style="padding:24px">' + (filtro === 'abierta' ? 'Sin excepciones pendientes.' : 'Sin registros para este filtro.') + '</div>');
  }

  function tarjeta(titulo, valor, color) {
    return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;background:#fff">' +
      '<div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">' + titulo + '</div>' +
      '<div style="font-size:22px;font-weight:800;color:' + color + '">' + valor + '</div></div>';
  }

  function botonFiltro(id, texto) {
    return '<button class="btn bsm ' + (filtro === id ? 'bc1' : 'bghost') + '" onclick="nxExcFiltrar(\'' + id + '\')">' + texto + '</button>';
  }

  function fila(x) {
    var abierta = x.estado === 'abierta';
    var color = x.severidad === 'critica' ? '#dc2626' : '#d97706';
    return '<div style="border:1px solid #e2e8f0;border-left:4px solid ' + color + ';border-radius:10px;padding:11px;background:#fff">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">' +
        '<div><div style="font-size:11px;font-weight:800;color:#0f172a">' + h(TIPOS[x.tipo] || x.tipo) + '</div>' +
        '<div style="font-size:9px;color:#64748b;margin-top:2px">' + h(x.modulo) + ' · ' + fecha(x.detectada_en) + ' · ' + h(x.severidad.toUpperCase()) + '</div></div>' +
        (abierta ? '<button class="btn bsm bc5" onclick="nxExcResolver(\'' + h(x.id) + '\')"><i class="ti ti-check"></i> Resolver</button>' : '<span class="badge bC5">RESUELTA</span>') +
      '</div>' +
      '<div style="font-size:10px;color:#475569;margin-top:8px;line-height:1.45">' + h(x.detalle || 'Sin detalle') + '</div>' +
      (!abierta ? '<div style="font-size:9px;color:#047857;margin-top:7px"><strong>Cierre:</strong> ' + h(x.nota_resolucion || '—') + ' · ' + fecha(x.resuelta_en) + '</div>' : '') +
    '</div>';
  }

  async function cargar(silencioso) {
    montar();
    try {
      EXC = await API.get('operacion_excepciones', 'select=*&order=detectada_en.desc&limit=200');
      pintar();
    } catch (e) {
      var box = document.getElementById('nxExcCentro');
      if (box) box.innerHTML = '<div class="empty">No se pudo cargar el centro de excepciones.</div>';
      if (!silencioso && typeof toast === 'function') toast('err', 'Excepciones', 'No se pudo cargar el centro operativo');
      console.error('[NEXUS] excepciones:', e);
    }
  }

  async function resolver(id) {
    if (!sesion || sesion.rol !== 'admin') {
      if (typeof toast === 'function') toast('err', 'Sin permiso', 'Solo el administrador puede cerrar excepciones');
      return;
    }
    var nota = prompt('Describe qué se verificó o corrigió (mínimo 8 caracteres):');
    if (nota == null) return;
    nota = nota.trim();
    if (nota.length < 8) {
      if (typeof toast === 'function') toast('warn', 'Nota incompleta', 'Escribe al menos 8 caracteres');
      return;
    }
    try {
      var r = await fetch(API.url + '/rest/v1/rpc/resolver_excepcion_operativa', {
        method: 'POST', headers: API.hdr(), body: JSON.stringify({p_excepcion_id:id, p_nota:nota})
      });
      if (!r.ok) throw new Error(await r.text());
      if (typeof toast === 'function') toast('ok', 'Excepción resuelta', 'El cierre quedó registrado en Auditoría');
      await cargar(true);
      if (typeof cargarAuditoriaSupabase === 'function') await cargarAuditoriaSupabase();
      if (typeof rAuditoria === 'function') rAuditoria();
    } catch (e) {
      if (typeof toast === 'function') toast('err', 'No se pudo resolver', typeof nxRpcErr === 'function' ? nxRpcErr(e) : e.message);
    }
  }

  window.nxExcCargar = cargar;
  window.nxExcResolver = resolver;
  window.nxExcFiltrar = function (v) { filtro = v; pintar(); };

  var originalRender = window.renderAuditoriaCfg;
  if (typeof originalRender === 'function') {
    window.renderAuditoriaCfg = function () {
      originalRender.apply(this, arguments);
      setTimeout(function () { cargar(true); }, 0);
    };
  }

  var originalAudit = window.logAudit;
  if (typeof originalAudit === 'function') {
    window.logAudit = function (accion) {
      var ret = originalAudit.apply(this, arguments);
      if (TIPOS[accion]) setTimeout(function () { cargar(true); }, 700);
      return ret;
    };
  }
})();

