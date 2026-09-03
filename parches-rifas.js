/* ===================== MÓDULO RIFAS (v1 · panel admin) ===================== */
(function () {
  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; }); }
  // Buscador estándar (reglamento del dueño): respaldo por si index.html aún no trae
  // nxBuscaHTML en caché (mismo criterio que ya usa AGUAPRO/POS).
  function rfBuscador(o) {
    if (typeof window.nxBuscaHTML === 'function') return window.nxBuscaHTML(o || {});
    o = o || {};
    return '<div class="rfSearch"><i class="ti ti-search"></i><input' + (o.id ? ' id="' + o.id + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') + ' placeholder="' + esc(o.placeholder || 'Buscar…') + '" value="' + esc(o.value || '') + '" autocomplete="off" oninput="' + (o.oninput || '') + '"></div>';
  }
  function fmt(n) { return 'RD$ ' + Math.round(Number(n || 0)).toLocaleString('en-US'); }
  function toast() { try { return window.toast.apply(null, arguments); } catch (e) {} }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function chk(id) { var e = document.getElementById(id); return !!(e && e.checked); }
  function moneyVal(id) { var e = document.getElementById(id); if (!e) return 0; try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(e.value)) || 0; } catch (er) {} return Number(String(e.value).replace(/[^0-9.-]/g, '')) || 0; }
  function cerrarModal(id) { var o = document.getElementById(id); if (o) o.remove(); }
  function curSes() { try { return (typeof sesion !== 'undefined') ? sesion : window.sesion; } catch (e) { try { return window.sesion; } catch (_) { return null; } } }
  function esAdmin() { var s = curSes(); return !!(s && s.rol === 'admin'); }
  function fechaDMY(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return String(d).slice(0, 10); } }

  var _rifas = [], _resByRifa = {}, _rifaImgData = '', _cuentas = [], _vendedores = [], _paquetes = [];
  var _rifaSel = null, _boletos = [], _bolMap = {}, _tabPage = 0, _tabQ = '';
  // RIFAS V3 (panel administrativo): pestaña interna activa + filtro de estado del tablero.
  // 5 pestañas reales (Resumen/Números/Pagos por revisar/Participantes/Tickets, ver auditoría
  // RIFAS_V3_AUDITORIA_IMPLEMENTACION.md en chatgpt/visual-draft).
  var _rfTab = 'resumen', _rfBoardEst = '', _rfPagosQ = '', _rfPtQ = '', _rfTkQ = '';
  var _rifaFaqs = [];
  var _rifaTut = [];
  var RIFA_TUT_DEF = [
    { t: 'Tus datos', d: 'Escribe tu nombre y tu número de WhatsApp.' },
    { t: 'Elige', d: 'Elige tus números o la cantidad de boletos que quieras.' },
    { t: 'Paga', d: 'Transfiere a la cuenta indicada y sube la foto de tu comprobante.' },
    { t: 'Acepta los términos y condiciones', d: 'Marca la casilla de aceptación para poder confirmar tu compra.' },
    { t: 'Recibe tu boleto', d: 'Te confirmamos y te enviamos tu boleto por WhatsApp.' }
  ];
  var _rifaLogoData = '';
  var RIFA_COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#db2777', '#0f172a'];

  function ensureView() {
    var v = document.getElementById('v-rifas');
    if (v) return v;
    var dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-rifas';
    dash.parentElement.appendChild(v);
    return v;
  }

  async function cargarRifas() {
    try { _rifas = await getAPI().get('rifas', 'select=*&order=created_at.desc') || []; } catch (e) { _rifas = []; }
    try { _cuentas = await getAPI().get('rifa_cuentas', 'select=*&order=created_at.asc') || []; } catch (e) { _cuentas = []; }
    try { _vendedores = await getAPI().get('rifa_vendedores', 'select=*&order=nombre.asc') || []; } catch (e) { _vendedores = []; }
    try { _paquetes = await getAPI().get('rifa_paquetes', 'select=*&order=cantidad.asc') || []; } catch (e) { _paquetes = []; }
    _resByRifa = {};
    try {
      var bs = await getAPI().get('rifa_boletos', 'select=rifa_id,precio,estado') || [];
      bs.forEach(function (b) {
        if (!b.rifa_id || b.estado === 'anulado') return;
        var o = _resByRifa[b.rifa_id] || (_resByRifa[b.rifa_id] = { n: 0, conf: 0, pend: 0, monto: 0 });
        o.n++;
        if (b.estado === 'confirmado') { o.conf++; o.monto += Number(b.precio || 0); } else { o.pend++; }
      });
    } catch (e) {}
  }

  window.nxAbrirRifas = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    var view = ensureView(); if (!view) return;
    try { window.nxGuardarLugar && window.nxGuardarLugar('rifas'); } catch (e) {}
    document.querySelectorAll('.view').forEach(function (x) { x.classList.remove('on'); });
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(function (n) { n.classList.remove('on'); });
    var pt = document.getElementById('pttl'); if (pt) pt.textContent = 'RIFAS';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:8px;font-weight:600">Cargando rifas...</div></div></div>';
    try { await cargarRifas(); renderRifas(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudo cargar Rifas.<br><span style="font-size:11px;color:#475569">' + esc(String(e && e.message || e)) + '</span></div></div>'; }
  };

  function renderRifas(view) {
    if (_rifaSel) { var _rsel = _rifas.find(function (x) { return String(x.id) === String(_rifaSel); }); if (_rsel) { renderRifaPanel(view, _rsel); return; } _rifaSel = null; }
    var _s = curSes(); var negocio = (_s && _s.org && _s.org.nombre) || 'Multiempresa';
    var cards = _rifas.length ? _rifas.map(function (r) {
      var o = _resByRifa[r.id] || { n: 0, conf: 0, pend: 0, monto: 0 };
      var total = Number(r.cantidad_numeros || 0);
      var pct = total ? Math.min(100, Math.round(o.n / total * 100)) : 0;
      var estCol = r.estado === 'sorteada' ? '#16a34a' : (r.estado === 'cerrada' ? '#64748b' : '#4f46e5');
      return '<div class="nxRfCard">' +
        '<div class="nxRfTop"><div style="min-width:0"><div class="nxRfNom">' + esc(r.nombre || '') + '</div><div class="nxRfSub">' + esc(r.premio || '') + '</div></div>' +
        '<span class="nxRfEst" style="background:' + estCol + '1a;color:' + estCol + '">' + esc((r.estado || 'abierta').toUpperCase()) + '</span></div>' +
        '<div class="nxRfMeta"><span><i class="ti ti-ticket"></i> ' + o.n + '/' + total + '</span><span><i class="ti ti-cash"></i> ' + fmt(o.monto) + '</span><span><i class="ti ti-calendar"></i> ' + (r.fecha_sorteo ? fechaDMY(r.fecha_sorteo) : 'sin fecha') + '</span><span><i class="ti ti-coin"></i> ' + fmt(r.precio_boleto) + '</span></div>' +
        (r.mostrar_progreso === false ? '<div class="nxRfHid"><i class="ti ti-eye-off"></i> Barra de vendidos oculta</div>' : '<div class="nxRfBar"><div style="width:' + pct + '%"></div></div>') +
        '<div class="nxRfAct"><button class="btn bsm bc1" type="button" onclick="window.nxRifaAbrir(\'' + r.id + '\')"><i class="ti ti-layout-grid"></i> Gestionar</button>' +
        '<button aria-label="Editar esta rifa" class="btn bsm bghost" type="button" onclick="window.nxRifaEditar(\'' + r.id + '\')"><i class="ti ti-edit"></i></button>' +
        '<button aria-label="Eliminar esta rifa" class="btn bsm bghost" type="button" onclick="window.nxRifaEliminar(\'' + r.id + '\')"><i class="ti ti-minus" style="color:#dc2626"></i></button></div>' +
        '</div>';
    }).join('') : '<div style="text-align:center;color:#475569;font-size:13px;padding:34px">Aún no hay rifas.<br>Toca <b>"Nueva rifa"</b> para crear la primera.</div>';

    var soloRifa = !!(_s && _s.org && _s.org.tipo === 'rifa');
    var backBtn = soloRifa
      ? '<button class="btn bsm" type="button" onclick="window.logout&&window.logout()"><i class="ti ti-logout"></i> Cerrar sesión</button>'
      : '<button class="btn bsm" type="button" onclick="window.nxAbrirMultiempresa()"><i class="ti ti-arrow-left"></i> Volver</button>';
    view.innerHTML = '<div class="nc">' +
      '<div class="ch"><div><div class="ct"><i class="ti ti-ticket"></i> Rifas</div><div class="ct-s">' + esc(negocio) + '</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' + backBtn +
      '<button class="btn bsm bc1" type="button" onclick="window.nxRifaNueva()"><i class="ti ti-plus"></i> Nueva rifa</button></div></div>' +
      '<div class="nxRfGrid">' + cards + '</div></div>';
  }

  window.nxRifaNueva = function () { abrirRifaForm(null); };
  window.nxRifaEditar = function (id) { var r = _rifas.find(function (x) { return String(x.id) === String(id); }); if (r) abrirRifaForm(r); };

  function abrirRifaForm(r) {
    cerrarModal('nxRifaForm');
    var e = r || {};
    _rifaFaqs = Array.isArray(e.faqs) ? e.faqs.map(function (f) { return { q: f.q || '', a: f.a || '' }; }) : [];
    _rifaTut = Array.isArray(e.tutorial) ? e.tutorial.map(function (s) { return { t: s.t || '', d: s.d || '' }; }) : RIFA_TUT_DEF.map(function (s) { return { t: s.t, d: s.d }; });
    var logoVal = e.empresa_logo || ''; _rifaLogoData = logoVal;
    var logoIsUrl = /^https?:\/\//i.test(logoVal);
    var logoPrev = logoVal ? '<img src="' + esc(logoVal) + '" style="height:54px;border-radius:10px;background:#f1f5f9" alt="Logo del negocio">' : '';
    var dig = Number(e.cantidad_digitos || 4);
    var imgVal = e.imagen || ''; _rifaImgData = imgVal;
    var imgIsUrl = /^https?:\/\//i.test(imgVal);
    var imgUrl = imgIsUrl ? imgVal : '';
    var imgPrev = imgVal ? '<img src="' + esc(imgVal) + '" style="max-width:100%;border-radius:10px" alt="Imagen de la rifa">' : '';
    var fechaVal = '';
    if (e.fecha_sorteo) { try { fechaVal = new Date(e.fecha_sorteo).toISOString().slice(0, 16); } catch (er) {} }
    var ov = document.createElement('div'); ov.id = 'nxRifaForm'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:460px;max-height:92vh;display:flex;flex-direction:column">' +
      '<div class="mt"><span><i class="ti ti-ticket"></i> ' + (r ? 'Editar rifa' : 'Nueva rifa') + '</span><button class="nxBack" type="button" onclick="document.getElementById(\'nxRifaForm\').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>' +
      '<div style="overflow-y:auto;flex:1">' +
      '<div class="fr"><label>Nombre de la rifa *</label><input id="rfNom" class="no-upper" value="' + esc(e.nombre || '') + '" placeholder="Ej: Gran Rifa iPhone"></div>' +
      '<div class="fr"><label>Premio</label><input id="rfPremio" class="no-upper" value="' + esc(e.premio || '') + '" placeholder="Ej: iPhone 16 Pro Max"></div>' +
      '<div class="fr"><label>Descripción del producto (página pública)</label><textarea id="rfDescripcion" class="no-upper" placeholder="Detalles del premio: modelo, especificaciones, color, valor aproximado, etc." style="width:100%;min-height:60px;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:13px;resize:vertical">' + esc(e.descripcion || '') + '</textarea></div>' +
      '<div class="fr-row">' +
      '<div class="fr"><label>Precio del boleto</label><input id="rfPrecio" data-nx-money inputmode="numeric" value="' + (e.precio_boleto ? Math.round(e.precio_boleto) : '') + '" placeholder="0"></div>' +
      '<div class="fr"><label>Dígitos</label><select id="rfDig" onchange="window.nxRifaDigCambio()"><option value="2"' + (dig === 2 ? ' selected' : '') + '>2 (00–99)</option><option value="3"' + (dig === 3 ? ' selected' : '') + '>3 (000–999)</option><option value="4"' + (dig === 4 ? ' selected' : '') + '>4 (0000–9999)</option></select></div>' +
      '</div>' +
      '<div class="fr"><label>Cantidad de boletos (límite)</label><input id="rfCant" inputmode="numeric" value="' + (e.cantidad_numeros != null ? e.cantidad_numeros : 10000) + '" placeholder="10000"></div>' +
      '<div class="fr"><label>Fecha y hora del sorteo</label><input id="rfFecha" type="datetime-local" value="' + fechaVal + '"></div>' +
      '<div class="fr-row">' +
      '<div class="fr"><label>Forma de elegir número</label><select id="rfSel"><option value="manual"' + (e.seleccion !== 'auto' ? ' selected' : '') + '>Manual (del tablero)</option><option value="auto"' + (e.seleccion === 'auto' ? ' selected' : '') + '>A la suerte (auto)</option></select></div>' +
      '<div class="fr"><label>Apartado vence (horas)</label><input id="rfApart" inputmode="numeric" value="' + (e.apartado_horas != null ? e.apartado_horas : 24) + '" placeholder="24"></div>' +
      '</div>' +
      '<div class="fr-row">' +
      '<div class="fr"><label>Límite por persona</label><input id="rfLim" inputmode="numeric" value="' + (e.limite_por_persona != null ? e.limite_por_persona : '') + '" placeholder="sin límite"></div>' +
      '<div class="fr"><label>Sortear al vender</label><select id="rfCond"><option value=""' + (!e.condicion_venta ? ' selected' : '') + '>Sin condición</option><option value="80"' + (e.condicion_venta == 80 ? ' selected' : '') + '>80%</option><option value="90"' + (e.condicion_venta == 90 ? ' selected' : '') + '>90%</option><option value="100"' + (e.condicion_venta == 100 ? ' selected' : '') + '>100%</option></select></div>' +
      '</div>' +
      '<div class="fr"><label>WhatsApp de contacto (página pública)</label><input id="rfWa" inputmode="tel" value="' + esc(e.whatsapp_contacto || '') + '" placeholder="809-000-0000"></div>' +
      // ── Marca: nombre y logo de la empresa (página pública)
      '<div class="fr"><label>Nombre de la empresa (marca)</label><input id="rfEmpNom" class="no-upper" value="' + esc(e.empresa_nombre || '') + '" placeholder="Ej: Rifas Yamaha RD"><div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Sale en la cabecera de la página pública, debajo del nombre de la rifa. Vacío = el nombre del negocio.</div></div>' +
      '<div class="fr"><label>Logo de la empresa</label>' +
      '<input type="file" id="rfLogoFile" accept="image/*" onchange="window.nxRifaLogoFile(this)" style="font-size:12px;padding:9px;border:1.5px dashed #c7d2fe;border-radius:10px;width:100%;background:#f8fafc;color:#475569">' +
      '<div id="rfLogoPrev" style="margin-top:7px">' + logoPrev + '</div>' +
      '<input id="rfLogoUrl" class="no-upper" value="' + esc(logoIsUrl ? logoVal : '') + '" placeholder="o pega un enlace https://..." style="margin-top:7px"></div>' +
      '<div class="fr"><label>Imagen / banner (opcional)</label>' +
      '<input type="file" id="rfImgFile" accept="image/*" onchange="window.nxRifaImgFile(this)" style="font-size:12px;padding:9px;border:1.5px dashed #c7d2fe;border-radius:10px;width:100%;background:#f8fafc;color:#475569">' +
      '<div id="rfImgPrev" style="margin-top:7px">' + imgPrev + '</div>' +
      '<input id="rfImg" class="no-upper" value="' + esc(imgUrl) + '" placeholder="o pega un enlace https://..." style="margin-top:7px"></div>' +
      '<label style="display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:#334155;padding:6px 2px"><input type="checkbox" id="rfMostrarFecha"' + (e.mostrar_fecha === false ? '' : ' checked') + ' style="width:18px;height:18px"> Mostrar la fecha del sorteo en el boleto</label>' +
      '<label style="display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:#334155;padding:6px 2px"><input type="checkbox" id="rfMostrarProg"' + (e.mostrar_progreso === false ? '' : ' checked') + ' style="width:18px;height:18px"> Mostrar la barra de boletos vendidos</label>' +
      '<label style="display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:#334155;padding:6px 2px"><input type="checkbox" id="rfMostrarPct"' + (e.mostrar_porcentaje === false ? '' : ' checked') + ' style="width:18px;height:18px"> Mostrar el porcentaje (%) en la barra</label>' +
      '<label style="display:flex;align-items:flex-start;gap:9px;font-size:13px;font-weight:600;color:#334155;padding:6px 2px"><input type="checkbox" id="rfOcultarNums"' + (e.ocultar_numeros ? ' checked' : '') + ' style="width:18px;height:18px;margin-top:1px"> <span>Ocultar los números en la página pública<br><small style="font-weight:500;color:#94a3b8">El cliente solo elige cuántos tickets quiere y el sistema le asigna números al azar.</small></span></label>' +
      // ── Botones de cantidad rápida (+N) de la página pública
      '<div class="fr"><label>Botones de cantidad rápida (+N)</label><input id="rfAtajos" inputmode="numeric" value="' + (Array.isArray(e.atajos) ? e.atajos.join(', ') : '1, 5, 10, 25') + '" placeholder="1, 5, 10, 25"><div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Cantidades de los botones rápidos en la página. Sepáralas con coma (ej: 1, 5, 10, 25). Déjalo VACÍO para quitar esos botones.</div></div>' +
      // ── Color del sistema (página pública)
      '<div class="fr"><label>Color del sistema (página pública)</label><input type="hidden" id="rfColor" value="' + esc(e.color || '') + '">' +
      '<div id="rfColorSw" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
      RIFA_COLORS.map(function (c) { var on = String(e.color || '').toLowerCase() === c.toLowerCase(); return '<button type="button" data-c="' + c + '" onclick="window.nxRifaColor(\'' + c + '\')" style="width:31px;height:31px;border-radius:50%;background:' + c + ';border:' + (on ? '3px solid #0f172a' : '2px solid #fff') + ';box-shadow:0 0 0 1px #e2e8f0;cursor:pointer;padding:0"></button>'; }).join('') +
      '<button type="button" data-c="" onclick="window.nxRifaColor(\'\')" title="Color por defecto" style="width:31px;height:31px;border-radius:50%;background:#f1f5f9;border:' + (e.color ? '2px solid #fff' : '3px solid #0f172a') + ';box-shadow:0 0 0 1px #e2e8f0;cursor:pointer;color:#64748b;font-size:14px;display:inline-flex;align-items:center;justify-content:center" aria-label="Color por defecto"><i class="ti ti-ban"></i></button>' +
      '<input type="color" title="Elegir otro color" value="' + esc(/^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : '#4f46e5') + '" oninput="window.nxRifaColor(this.value)" style="width:40px;height:31px;border:1.5px solid #e2e8f0;border-radius:8px;padding:0;cursor:pointer;background:#fff">' +
      '</div><div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Toca un color, o el cuadrito de la derecha para elegir el tono exacto que quieras.</div></div>' +
      // ── Tema de la página pública (claro / oscuro)
      '<div class="fr"><label>Tema de la página pública</label><select id="rfTema"><option value="auto"' + (e.tema === 'auto' ? ' selected' : '') + '>Automático (según el banner)</option><option value="claro"' + (!e.tema || e.tema === 'claro' ? ' selected' : '') + '>Claro (blanco)</option><option value="oscuro"' + (e.tema === 'oscuro' ? ' selected' : '') + '>Oscuro (negro)</option></select><div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Automático toma el color y el claro/oscuro del banner que subas.</div></div>' +
      // ── Cuentas bancarias de cobro
      '<div class="fr"><label>Cuentas bancarias de cobro</label><button type="button" class="btn bsm bghost" style="width:100%;justify-content:center" onclick="window.nxRifaCuentas()"><i class="ti ti-building-bank" style="color:#4f46e5"></i> Administrar cuentas de cobro</button><div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Son las cuentas que verá el cliente para pagar. Se comparten entre tus rifas.</div></div>' +
      // ── Tutorial "¿Cómo jugar?" (pasos) para la página pública
      '<div class="fr"><label>Tutorial "¿Cómo jugar?" (pasos)</label><div id="rfTutList">' + tutRowsHTML() + '</div>' +
      '<button type="button" class="btn bsm bghost" style="width:100%;justify-content:center;margin-top:7px" onclick="window.nxRifaTutAdd()"><i class="ti ti-plus" style="color:#16a34a"></i> Agregar paso</button>' +
      '<div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Pasos que verá el cliente en la página. Bórralos todos para ocultar el tutorial.</div></div>' +
      // ── Preguntas frecuentes (FAQ) para la página pública
      '<div class="fr"><label>¿Cómo es el sorteo? (página pública)</label><textarea id="rfComoSorteo" class="no-upper" placeholder="Ej: El sorteo se realiza con la Lotería Nacional el día del cierre. Gana el número que coincida con el primer premio..." style="width:100%;min-height:60px;padding:9px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:13px;resize:vertical">' + esc(e.como_sorteo || '') + '</textarea></div>' +
      '<div class="fr"><label>Preguntas frecuentes (página pública)</label><div id="rfFaqList">' + faqRowsHTML() + '</div>' +
      '<button type="button" class="btn bsm bghost" style="width:100%;justify-content:center;margin-top:7px" onclick="window.nxRifaFaqAdd()"><i class="ti ti-plus" style="color:#16a34a"></i> Agregar pregunta</button></div>' +
      '</div>' +
      '<div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxRifaForm\').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxRifaGuardar(\'' + (r ? r.id : '') + '\')"><i class="ti ti-check"></i> Guardar</button></div>' +
      '</div>';
    document.body.appendChild(ov);
  }

  window.nxRifaColor = function (c) {
    var h = document.getElementById('rfColor'); if (h) h.value = c || '';
    var sw = document.getElementById('rfColorSw'); if (!sw) return;
    sw.querySelectorAll('button').forEach(function (b) {
      var bc = String(b.getAttribute('data-c') || '');
      var on = bc.toLowerCase() === String(c || '').toLowerCase();
      b.style.border = on ? '3px solid #0f172a' : '2px solid #fff';
    });
  };
  function faqRowsHTML() {
    if (!_rifaFaqs.length) return '<div style="font-size:11px;color:#94a3b8;padding:4px 2px">Sin preguntas. Agrega las dudas comunes (ej: ¿Cuándo es el sorteo?, ¿Cómo recojo el premio?).</div>';
    return _rifaFaqs.map(function (f, i) {
      return '<div style="border:1px solid #e8edf3;border-radius:10px;padding:8px;margin-bottom:7px;background:#fbfcfe">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:5px"><b style="font-size:10.5px;color:#64748b">Pregunta ' + (i + 1) + '</b><button type="button" class="btn bsm bghost" title="Quitar" onclick="window.nxRifaFaqDel(' + i + ')" aria-label="Quitar"><i class="ti ti-minus" style="color:#dc2626"></i></button></div>' +
        '<input class="no-upper" style="margin-bottom:6px" placeholder="Pregunta" value="' + esc(f.q || '') + '" oninput="window.nxRifaFaqSet(' + i + ',\'q\',this.value)">' +
        '<textarea placeholder="Respuesta" oninput="window.nxRifaFaqSet(' + i + ',\'a\',this.value)" style="width:100%;min-height:50px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;resize:vertical">' + esc(f.a || '') + '</textarea>' +
        '</div>';
    }).join('');
  }
  window.nxRifaFaqSet = function (i, k, v) { if (_rifaFaqs[i]) _rifaFaqs[i][k] = v; };
  window.nxRifaFaqAdd = function () { _rifaFaqs.push({ q: '', a: '' }); var c = document.getElementById('rfFaqList'); if (c) c.innerHTML = faqRowsHTML(); };
  window.nxRifaFaqDel = function (i) { _rifaFaqs.splice(i, 1); var c = document.getElementById('rfFaqList'); if (c) c.innerHTML = faqRowsHTML(); };
  function tutRowsHTML() {
    if (!_rifaTut.length) return '<div style="font-size:11px;color:#94a3b8;padding:4px 2px">Sin pasos. El tutorial no aparecerá en la página.</div>';
    return _rifaTut.map(function (s, i) {
      return '<div style="border:1px solid #e8edf3;border-radius:10px;padding:8px;margin-bottom:7px;background:#fbfcfe">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:5px"><b style="font-size:10.5px;color:#64748b">Paso ' + (i + 1) + '</b><button type="button" class="btn bsm bghost" title="Quitar" onclick="window.nxRifaTutDel(' + i + ')" aria-label="Quitar"><i class="ti ti-minus" style="color:#dc2626"></i></button></div>' +
        '<input class="no-upper" style="margin-bottom:6px" placeholder="Título (ej: Paga)" value="' + esc(s.t || '') + '" oninput="window.nxRifaTutSet(' + i + ',\'t\',this.value)">' +
        '<textarea placeholder="Explicación del paso" oninput="window.nxRifaTutSet(' + i + ',\'d\',this.value)" style="width:100%;min-height:46px;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;resize:vertical">' + esc(s.d || '') + '</textarea>' +
        '</div>';
    }).join('');
  }
  window.nxRifaTutSet = function (i, k, v) { if (_rifaTut[i]) _rifaTut[i][k] = v; };
  window.nxRifaTutAdd = function () { _rifaTut.push({ t: '', d: '' }); var c = document.getElementById('rfTutList'); if (c) c.innerHTML = tutRowsHTML(); };
  window.nxRifaTutDel = function (i) { _rifaTut.splice(i, 1); var c = document.getElementById('rfTutList'); if (c) c.innerHTML = tutRowsHTML(); };

  window.nxRifaLogoFile = function (input) {
    var f = input.files && input.files[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast('err', 'Imagen muy grande', 'Máximo 8 MB'); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        try {
          var max = 320, w = img.width, h = img.height;
          if (w > max || h > max) { var s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          _rifaLogoData = cv.toDataURL('image/png');
        } catch (er) { _rifaLogoData = ev.target.result; }
        var p = document.getElementById('rfLogoPrev'); if (p) p.innerHTML = '<img src="' + _rifaLogoData + '" style="height:54px;border-radius:10px;background:#f1f5f9" alt="Logo del negocio">';
        var u = document.getElementById('rfLogoUrl'); if (u) u.value = '';
        try { toast('ok', 'Logo listo', 'Se guarda con la rifa'); } catch (er) {}
      };
      img.onerror = function () { toast('err', 'No se pudo leer la imagen'); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };
  window.nxRifaImgFile = function (input) {
    var f = input.files && input.files[0]; if (!f) return;
    if (f.size > 12 * 1024 * 1024) { toast('err', 'Imagen muy grande', 'Máximo 12 MB'); return; }
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        try {
          var max = 900, w = img.width, h = img.height;
          if (w > max) { h = Math.round(h * max / w); w = max; }
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          cv.getContext('2d').drawImage(img, 0, 0, w, h);
          _rifaImgData = cv.toDataURL('image/jpeg', 0.72);
        } catch (er) { _rifaImgData = ev.target.result; }
        var p = document.getElementById('rfImgPrev'); if (p) p.innerHTML = '<img src="' + _rifaImgData + '" style="max-width:100%;border-radius:10px" alt="Imagen de la rifa">';
        var u = document.getElementById('rfImg'); if (u) u.value = '';
        try { toast('ok', 'Imagen lista', 'Se guarda con la rifa'); } catch (er) {}
      };
      img.onerror = function () { toast('err', 'No se pudo leer la imagen'); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
  };
  window.nxRifaDigCambio = function () {
    var dig = Number(val('rfDig') || 4);
    var def = dig === 2 ? 100 : (dig === 3 ? 1000 : 10000);
    var c = document.getElementById('rfCant'); if (c) c.value = def;
  };

  window.nxRifaGuardar = async function (id) {
    var nom = (val('rfNom') || '').trim();
    if (!nom) { toast('err', 'Falta el nombre', 'Ponle nombre a la rifa'); return; }
    var dig = Number(val('rfDig') || 4);
    var max = Math.pow(10, dig);
    var cant = Number(String(val('rfCant') || '').replace(/[^0-9]/g, '')) || max;
    if (cant > max) cant = max;
    var fecha = val('rfFecha');
    var body = {
      nombre: nom,
      premio: (val('rfPremio') || '').trim() || null,
      descripcion: (val('rfDescripcion') || '').trim() || null,
      como_sorteo: (val('rfComoSorteo') || '').trim() || null,
      precio_boleto: moneyVal('rfPrecio'),
      cantidad_digitos: dig,
      cantidad_numeros: cant,
      seleccion: val('rfSel') || 'manual',
      fecha_sorteo: fecha ? fecha : null,
      apartado_horas: Number(String(val('rfApart') || '24').replace(/[^0-9]/g, '')) || 24,
      limite_por_persona: val('rfLim') ? (Number(String(val('rfLim')).replace(/[^0-9]/g, '')) || null) : null,
      condicion_venta: val('rfCond') ? Number(val('rfCond')) : null,
      imagen: ((val('rfImg') || '').trim() || _rifaImgData || null),
      mostrar_fecha: chk('rfMostrarFecha'),
      mostrar_progreso: chk('rfMostrarProg'),
      mostrar_porcentaje: chk('rfMostrarPct'),
      ocultar_numeros: chk('rfOcultarNums'),
      whatsapp_contacto: (val('rfWa') || '').trim() || null,
      empresa_nombre: (val('rfEmpNom') || '').trim() || null,
      empresa_logo: ((val('rfLogoUrl') || '').trim() || _rifaLogoData || null),
      color: (val('rfColor') || '').trim() || null,
      tema: val('rfTema') || 'claro',
      faqs: _rifaFaqs.filter(function (f) { return (f.q || '').trim(); }).map(function (f) { return { q: (f.q || '').trim(), a: (f.a || '').trim() }; }),
      tutorial: _rifaTut.filter(function (s) { return (s.t || '').trim() || (s.d || '').trim(); }).map(function (s) { return { t: (s.t || '').trim(), d: (s.d || '').trim() }; }),
      atajos: (function () { var a = (val('rfAtajos') || '').split(',').map(function (s) { return parseInt(String(s).replace(/[^0-9]/g, ''), 10); }).filter(function (n) { return n > 0; }); return Array.from(new Set(a)).sort(function (x, y) { return x - y; }).slice(0, 6); })()
    };
    try {
      if (id) { await getAPI().patch('rifas', 'id=eq.' + id, body); toast('ok', 'Rifa actualizada', nom); }
      else { await getAPI().post('rifas', body); toast('ok', 'Rifa creada', nom); }
      cerrarModal('nxRifaForm');
      await cargarRifas();
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  window.nxRifaEliminar = async function (id) {
    var r = _rifas.find(function (x) { return String(x.id) === String(id); }); if (!r) return;
    if (!confirm('¿Eliminar la rifa "' + (r.nombre || '') + '"? Se borran también sus boletos.')) return;
    try {
      try { await getAPI().del('rifa_boletos', 'rifa_id=eq.' + id); } catch (er) {}
      await getAPI().del('rifas', 'id=eq.' + id);
      toast('ok', 'Rifa eliminada', r.nombre || '');
      await cargarRifas();
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  function currentRifa() { return _rifas.find(function (x) { return String(x.id) === String(_rifaSel); }); }

  async function cargarBoletos(id) {
    try { _boletos = await getAPI().get('rifa_boletos', 'select=*&rifa_id=eq.' + id + '&order=created_at.desc') || []; } catch (e) { _boletos = []; }
    _bolMap = {};
    _boletos.forEach(function (b) { if (b.estado !== 'anulado') _bolMap[String(b.numero)] = b; });
  }
  function rifaStats() {
    var o = { n: 0, conf: 0, pend: 0, monto: 0 };
    _boletos.forEach(function (b) { if (b.estado === 'anulado') return; o.n++; if (b.estado === 'confirmado') { o.conf++; o.monto += Number(b.precio || 0); } else { o.pend++; } });
    return o;
  }

  window.nxRifaAbrir = async function (id) {
    _rifaSel = id; _tabPage = 0; _tabQ = ''; _rfTab = 'resumen'; _rfBoardEst = ''; _rfPagosQ = ''; _rfPtQ = ''; _rfTkQ = ''; _tkEst = '';
    var view = document.getElementById('v-rifas'); if (!view) return;
    await cargarBoletos(id);
    renderRifas(view);
  };
  window.nxRifaVolverLista = async function () {
    _rifaSel = null;
    var view = document.getElementById('v-rifas'); if (!view) return;
    await cargarRifas();
    renderRifas(view);
  };

  // Estado real de una celda (por su número YA rellenado con ceros). 'disponible' si no hay
  // boleto en _bolMap. Un solo lugar para no repetir el ternario entre el filtro y el pintado.
  function estadoCelda(s) {
    var b = _bolMap[s];
    if (!b) return 'disponible';
    if (b.estado === 'confirmado') return 'confirmado';
    if (b.estado === 'apartado') return 'apartado';
    return 'por_confirmar';
  }
  function boardHTML(r) {
    var dig = Number(r.cantidad_digitos || 4);
    var total = Number(r.cantidad_numeros || 0);
    var q = (_tabQ || '').trim();
    var est = _rfBoardEst || '';
    var per = 120;
    var nums = [];
    for (var i = 0; i < total; i++) {
      var s = String(i).padStart(dig, '0');
      if (q && s.indexOf(q) < 0) continue;
      if (est && estadoCelda(s) !== est) continue;
      nums.push(s);
    }
    var pages = Math.max(1, Math.ceil(nums.length / per));
    if (_tabPage >= pages) _tabPage = 0;
    var slice = nums.slice(_tabPage * per, _tabPage * per + per);
    var cells = slice.map(function (s) {
      var e = estadoCelda(s);
      var cls = e === 'confirmado' ? 'rfN-conf' : (e === 'apartado' ? 'rfN-apar' : (e === 'por_confirmar' ? 'rfN-pend' : 'rfN-disp'));
      return '<button type="button" class="rfN ' + cls + '" onclick="window.nxRifaNum(\'' + s + '\')">' + s + '</button>';
    }).join('');
    var board = '<div class="rfBoard">' + (slice.length ? cells : '<div style="grid-column:1/-1;text-align:center;color:#475569;font-size:12px;padding:20px">Sin números con ese filtro</div>') + '</div>';
    var pager = pages > 1 ? '<div class="rfPager"><button aria-label="Página anterior" class="btn bsm bghost" type="button" onclick="window.nxRifaTabPage(-1)"' + (_tabPage <= 0 ? ' disabled' : '') + '><i class="ti ti-chevron-left"></i></button><span>Página ' + (_tabPage + 1) + ' / ' + pages + '</span><button aria-label="Página siguiente" class="btn bsm bghost" type="button" onclick="window.nxRifaTabPage(1)"' + (_tabPage >= pages - 1 ? ' disabled' : '') + '><i class="ti ti-chevron-right"></i></button></div>' : '';
    return board + pager;
  }

  // RIFAS V3 — KPIs reales del panel (5, no los 2 buckets de rifaStats): confirmado/apartado/
  // por_confirmar separados, tal como pide la auditoría del prototipo. rifaStats() NO se toca —
  // sigue siendo lo que usa el modal nxRifaStats().
  function rfKpisData(r) {
    var total = Number(r.cantidad_numeros || 0);
    var conf = 0, apar = 0, porConf = 0, monto = 0;
    _boletos.forEach(function (b) {
      if (b.estado === 'anulado') return;
      if (b.estado === 'confirmado') { conf++; monto += Number(b.precio || 0); }
      else if (b.estado === 'apartado') apar++;
      else porConf++;
    });
    var vendidos = conf + apar + porConf;
    return { total: total, disp: Math.max(0, total - vendidos), apar: apar, porConf: porConf, conf: conf, monto: monto, vendidos: vendidos };
  }
  // "Atención requerida": pagos sin revisar + apartados a punto de vencer (apartado_hasta ya
  // viaja en cada boleto —select=* — solo no se leía en el panel; se calcula en vivo, nunca se
  // guarda). Apartados sin apartado_hasta (ventas del staff, que no expiran) no cuentan aquí.
  function atencionRifa() {
    var pagos = 0, apVencen = 0, now = Date.now();
    _boletos.forEach(function (b) {
      if (b.estado === 'por_confirmar') pagos++;
      if (b.estado === 'apartado' && b.apartado_hasta) {
        var t = new Date(b.apartado_hasta).getTime();
        if (!isNaN(t) && t > now && (t - now) <= 3600000) apVencen++;
      }
    });
    return { pagos: pagos, apVencen: apVencen };
  }
  function renderRifaPanel(view, r) {
    var k = rfKpisData(r);
    var pct = k.total ? Math.min(100, Math.round(k.vendidos / k.total * 100)) : 0;
    var wb = '';
    if (r.numero_ganador) { var gb = _bolMap[String(r.numero_ganador)]; wb = '<div class="rsBanner"><i class="ti ti-trophy"></i> <span><b>Ganador:</b> número ' + esc(r.numero_ganador) + ' — ' + (gb ? esc(gb.comprador_nombre || 'sin nombre') : 'no vendido (casa)') + '</span></div>'; }
    var atn = atencionRifa();
    var atnHTML = (atn.pagos > 0 || atn.apVencen > 0) ? (
      '<div class="rfAttn"><div class="rfAttnT"><i class="ti ti-alert-triangle"></i> Atención requerida</div>' +
      (atn.pagos > 0 ? '<button class="rfAttnRow" type="button" onclick="window.nxRfTab(\'pagos\')"><b>' + atn.pagos + ' comprobante' + (atn.pagos === 1 ? '' : 's') + '</b><span>Esperan revisión</span><i class="ti ti-chevron-right"></i></button>' : '') +
      (atn.apVencen > 0 ? '<button class="rfAttnRow" type="button" onclick="window.nxRfIrApartados()"><b>' + atn.apVencen + ' apartado' + (atn.apVencen === 1 ? '' : 's') + '</b><span>Vencen en menos de 1 hora</span><i class="ti ti-chevron-right"></i></button>' : '') +
      '</div>'
    ) : '';
    var sideHTML = '<div class="rfSide">' +
      '<button class="rfTab' + (_rfTab === 'resumen' ? ' on' : '') + '" data-tab="resumen" type="button" onclick="window.nxRfTab(\'resumen\')"><i class="ti ti-layout-dashboard"></i><span>Resumen</span></button>' +
      '<button class="rfTab' + (_rfTab === 'numeros' ? ' on' : '') + '" data-tab="numeros" type="button" onclick="window.nxRfTab(\'numeros\')"><i class="ti ti-grid-dots"></i><span>Números</span></button>' +
      '<button class="rfTab' + (_rfTab === 'pagos' ? ' on' : '') + '" data-tab="pagos" type="button" onclick="window.nxRfTab(\'pagos\')"><i class="ti ti-receipt"></i><span>Pagos por revisar</span>' + (k.porConf > 0 ? '<span class="rfTabBadge">' + k.porConf + '</span>' : '') + '</button>' +
      '<button class="rfTab' + (_rfTab === 'participantes' ? ' on' : '') + '" data-tab="participantes" type="button" onclick="window.nxRfTab(\'participantes\')"><i class="ti ti-users"></i><span>Participantes</span></button>' +
      '<button class="rfTab' + (_rfTab === 'tickets' ? ' on' : '') + '" data-tab="tickets" type="button" onclick="window.nxRfTab(\'tickets\')"><i class="ti ti-list-details"></i><span>Tickets</span></button>' +
      '</div>';
    // Sidebar vertical fija (solo escritorio, min-width:900px vía CSS) — MISMA clase .rfTab y
    // MISMO data-tab que la fila de pestañas horizontal de abajo (que sigue intacta para el
    // celular, decisión ya tomada en RONDA 2). nxRfTab() hace querySelectorAll('.rfTab') para
    // marcar la activa — como matchea las DOS listas a la vez, la barra lateral se actualiza
    // sola sin tocar esa función.
    view.innerHTML = '<div class="rfShell">' + sideHTML + '<div class="rfMain"><div class="nc">' +
      '<div class="ch"><div style="min-width:0"><div class="ct"><i class="ti ti-ticket"></i> ' + esc(r.nombre || '') + '</div><div class="ct-s">' + esc(r.premio || '') + ' · ' + fmt(r.precio_boleto) + '</div></div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn bsm" type="button" onclick="window.nxRifaVolverLista()"><i class="ti ti-arrow-left"></i> Rifas</button><button class="btn bsm bc1" type="button" onclick="window.nxRifaSorteo()"><i class="ti ti-trophy"></i> Sorteo</button><button class="btn bsm bghost" type="button" onclick="window.nxRifaReportes()"><i class="ti ti-chart-bar"></i> Reportes</button><button class="btn bsm bghost" type="button" onclick="window.nxRifaVendedores()" title="Empleados / vendedores de esta rifa" aria-label="Empleados / vendedores de esta rifa"><i class="ti ti-users"></i></button><button class="btn bsm bghost" type="button" onclick="window.nxRifaPaquetes()" title="Combos / paquetes" aria-label="Combos / paquetes"><i class="ti ti-package"></i></button><button class="btn bsm bghost" type="button" onclick="window.nxRifaLink()" title="Link público de compra" aria-label="Link público de compra"><i class="ti ti-link"></i></button><button aria-label="Editar esta rifa" class="btn bsm bghost" type="button" onclick="window.nxRifaEditar(\'' + r.id + '\')"><i class="ti ti-edit"></i></button></div></div>' +
      '<div class="rfKpis">' +
      '<div class="rfKpi rfKpiT" onclick="window.nxRfIrDisponibles()" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div class="rfKpiIco" style="background:#eef2ff;color:#4338ca"><i class="ti ti-grid-dots"></i></div><span>Disponibles</span><b>' + k.disp + '</b></div>' +
      '<div class="rfKpi rfKpiT" onclick="window.nxRfIrApartados()" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div class="rfKpiIco" style="background:#fffbeb;color:#b45309"><i class="ti ti-bookmark"></i></div><span>Apartados</span><b style="color:#64748b">' + k.apar + '</b></div>' +
      '<div class="rfKpi rfKpiT" onclick="window.nxRfTab(\'pagos\')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div class="rfKpiIco" style="background:#fff7ed;color:#c2410c"><i class="ti ti-clock-hour-4"></i></div><span>Pagos x revisar</span><b style="color:#d97706">' + k.porConf + '</b></div>' +
      '<div class="rfKpi rfKpiT" onclick="window.nxRifaTickets(\'confirmado\',\'Confirmados\')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div class="rfKpiIco" style="background:#f0fdf4;color:#16a34a"><i class="ti ti-circle-check"></i></div><span>Confirmados</span><b style="color:#16a34a">' + k.conf + '</b></div>' +
      '<div class="rfKpi rfKpiT" onclick="window.nxRifaPorCuenta()" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div class="rfKpiIco" style="background:#f0fdf4;color:#16a34a"><i class="ti ti-cash"></i></div><span>Recaudado</span><b style="color:#16a34a">' + fmt(k.monto) + '</b></div>' +
      '</div>' + wb +
      (r.mostrar_progreso === false ? '' : '<div class="nxRfBar" style="margin:10px 0"><div style="width:' + pct + '%"></div></div>') +
      atnHTML +
      '<div class="rfTabs">' +
      '<button class="rfTab' + (_rfTab === 'resumen' ? ' on' : '') + '" data-tab="resumen" type="button" onclick="window.nxRfTab(\'resumen\')">Resumen</button>' +
      '<button class="rfTab' + (_rfTab === 'numeros' ? ' on' : '') + '" data-tab="numeros" type="button" onclick="window.nxRfTab(\'numeros\')">Números</button>' +
      '<button class="rfTab' + (_rfTab === 'pagos' ? ' on' : '') + '" data-tab="pagos" type="button" onclick="window.nxRfTab(\'pagos\')">Pagos por revisar' + (k.porConf > 0 ? '<span class="rfTabBadge">' + k.porConf + '</span>' : '') + '</button>' +
      '<button class="rfTab' + (_rfTab === 'participantes' ? ' on' : '') + '" data-tab="participantes" type="button" onclick="window.nxRfTab(\'participantes\')">Participantes</button>' +
      '<button class="rfTab' + (_rfTab === 'tickets' ? ' on' : '') + '" data-tab="tickets" type="button" onclick="window.nxRfTab(\'tickets\')">Tickets</button>' +
      '</div>' +
      '<div id="rfTabBody">' + rfTabBodyHTML(r) + '</div>' +
      '</div></div></div>';
    // NPGS §5: la lupa se pinta DESPUÉS de view.innerHTML — el <span> recién existe aquí; cada
    // pestaña pinta la suya (una sola existe a la vez en el DOM real, según _rfTab).
    try { pintarLupaRfTabActiva(); } catch (e) {}
  }

  // RIFAS V3 — 3 pestañas internas reales (Resumen=tablero, Pagos por revisar=bandeja,
  // Participantes=lista completa). Boletos/Vendedores/Sorteo/Configuración del prototipo YA
  // tienen su entrada real en los botones del encabezado de arriba (Vendedores/Sorteo/Editar) —
  // no se duplicaron como pestañas nuevas.
  window.nxRfTab = function (t) {
    _rfTab = (['resumen', 'numeros', 'pagos', 'participantes', 'tickets'].indexOf(t) >= 0) ? t : 'resumen';
    var r = currentRifa(); if (!r) return;
    document.querySelectorAll('.rfTab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === _rfTab); });
    var body = document.getElementById('rfTabBody'); if (body) body.innerHTML = rfTabBodyHTML(r);
    try { pintarLupaRfTabActiva(); } catch (e) {}
  };
  function rfTabBodyHTML(r) {
    if (_rfTab === 'numeros') return rfNumerosTabHTML(r);
    if (_rfTab === 'pagos') return rfPagosTabHTML();
    if (_rfTab === 'participantes') return rfParticipantesTabHTML();
    if (_rfTab === 'tickets') return rfTicketsTabHTML();
    return rfResumenTabHTML(r);
  }
  // NPGS §5: pinta la lupa de LA pestaña que esté activa ahora mismo — cada pestaña tiene su
  // propio <span> placeholder y su propio término (_tabQ/_rfPagosQ/_rfPtQ/_rfTkQ), sin cruzarse
  // entre sí. "Resumen" (dashboard) no lleva lupa — no hay ninguna lista que filtrar ahí.
  function pintarLupaRfTabActiva() {
    if (_rfTab === 'numeros') pintarLupaRfTab();
    else if (_rfTab === 'pagos') pintarLupaRfPagos();
    else if (_rfTab === 'participantes') pintarLupaRfPt();
    else if (_rfTab === 'tickets') pintarLupaRfTk();
  }
  // ── Pestaña "Resumen" — REAL, no decorativa: 3 tarjetas derivadas de rifas.fecha_sorteo y
  // _boletos (ya cargados), nunca inventadas. Descartado a propósito del mockup original: una
  // "Actividad reciente" (no hay ningún log de gestión en este módulo, cero tabla real detrás) y
  // "Meta del día"/"Promesas de pago" (sin esquema que las respalde) — ver el changelog.
  function rfResumenTabHTML(r) {
    var k = rfKpisData(r);
    var pct = k.total ? Math.min(100, Math.round(k.vendidos / k.total * 100)) : 0;
    var pendConfirmar = _boletos.reduce(function (s, b) { return s + (b.estado === 'por_confirmar' ? Number(b.precio || 0) : 0); }, 0);
    var potencial = k.disp * Number(r.precio_boleto || 0);
    var sorteoHTML;
    if (r.mostrar_fecha !== false && r.fecha_sorteo) {
      var fs = null; try { fs = new Date(r.fecha_sorteo); } catch (e) {}
      var dias = fs ? Math.ceil((fs.getTime() - Date.now()) / 86400000) : null;
      var fTxt = fs ? fs.toLocaleString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      sorteoHTML = '<div class="rfSumBig">' + esc(fTxt) + '</div><div class="rfSumSub">' + (dias === null ? '' : (dias > 0 ? 'Faltan ' + dias + ' día' + (dias === 1 ? '' : 's') : (dias === 0 ? 'Es hoy' : 'Ya pasó'))) + '</div>';
    } else {
      sorteoHTML = '<div class="rfSumEmpty">Sin fecha de sorteo definida</div><button class="rfSumLink" type="button" onclick="window.nxRifaEditar(\'' + r.id + '\')">Ponerle fecha <i class="ti ti-chevron-right"></i></button>';
    }
    // Donut "Progreso de ventas": mismo conic-gradient que ya usa "Medios de pago"
    // (nxRifaStats) — reusa .pie/.pieLeg/.pieRow/.pieDot/.piePct, cero CSS nuevo. Solo se
    // pinta si hay algún número vendido (k.vendidos>0); con la rifa recién creada (todo
    // disponible) no aporta nada mostrar un donut de un solo color, así que no se arma.
    var donutHTML = '';
    if (k.total > 0 && k.vendidos > 0) {
      var segsD = [
        { k: 'Confirmados', v: k.conf, c: '#16a34a' },
        { k: 'Apartados', v: k.apar, c: '#d97706' },
        { k: 'Por confirmar', v: k.porConf, c: '#ea580c' },
        { k: 'Disponibles', v: k.disp, c: '#94a3b8' }
      ].filter(function (s) { return s.v > 0; });
      var accD2 = 0;
      var stopsD = segsD.map(function (s) { var a = accD2, b3 = accD2 + s.v / k.total * 360; accD2 = b3; return s.c + ' ' + a + 'deg ' + b3 + 'deg'; }).join(',');
      var legendD = segsD.map(function (s) { var p = Math.round(s.v / k.total * 100); return '<div class="pieRow"><span class="pieDot" style="background:' + s.c + '"></span><span class="pieK">' + s.k + '</span><b>' + s.v + '</b><span class="piePct">' + p + '%</span></div>'; }).join('');
      donutHTML = '<div class="rfSumCard" style="grid-column:1/-1"><div class="rfSumT"><i class="ti ti-chart-donut"></i> Progreso de ventas</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:center">' +
        '<div style="position:relative;width:148px;height:148px;margin:6px auto 12px"><div class="pie" style="margin:0;background:conic-gradient(' + stopsD + ')"></div><div style="position:absolute;inset:28px;background:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#0f172a;box-shadow:inset 0 0 0 1px #f1f5f9">' + pct + '%</div></div>' +
        '<div class="pieLeg" style="min-width:200px;flex:1">' + legendD + '</div>' +
        '</div></div>';
    }
    return '<div class="rfSumGrid">' + donutHTML +
      '<div class="rfSumCard"><div class="rfSumT"><i class="ti ti-calendar-event"></i> Próximo sorteo</div>' + sorteoHTML + '</div>' +
      '<div class="rfSumCard"><div class="rfSumT"><i class="ti ti-hourglass"></i> Por cobrar en revisión</div><div class="rfSumBig">' + fmt(pendConfirmar) + '</div><div class="rfSumSub">' + k.porConf + ' pago' + (k.porConf === 1 ? '' : 's') + ' esperando aprobación</div>' +
      (k.porConf > 0 ? '<button class="rfSumLink" type="button" onclick="window.nxRfTab(\'pagos\')">Revisar ahora <i class="ti ti-chevron-right"></i></button>' : '') + '</div>' +
      '<div class="rfSumCard"><div class="rfSumT"><i class="ti ti-trending-up"></i> Ingreso potencial restante</div><div class="rfSumBig">' + fmt(potencial) + '</div><div class="rfSumSub">Si se venden los ' + k.disp + ' número' + (k.disp === 1 ? '' : 's') + ' disponibles</div>' +
      (k.disp > 0 ? '<button class="rfSumLink" type="button" onclick="window.nxRfIrDisponibles()">Ver disponibles <i class="ti ti-chevron-right"></i></button>' : '') + '</div>' +
      '</div>';
  }
  // ── Pestaña "Números" — el tablero de siempre (era "Resumen" antes de esta versión, mismo
  // contenido, solo se movió a su propia pestaña dedicada).
  // Detalle del número: en escritorio (min-width:900px vía CSS) va DOCKEADO como columna fija
  // junto al tablero (#rfDetailDock, ver gestBoleto); en móvil ese contenedor se oculta y
  // gestBoleto sigue usando el cajón/overlay de siempre — comportamiento intacto.
  var RF_DOCK_EMPTY = '<div class="rfDockCard rfDockEmpty"><i class="ti ti-hand-click"></i>Toca un número del tablero para ver su detalle aquí.</div>';
  window.nxRfDockCerrar = function () { var d = document.getElementById('rfDetailDock'); if (d) d.innerHTML = RF_DOCK_EMPTY; };
  function rfNumerosTabHTML(r) {
    return '<div class="rfNumRow"><div class="rfBoardCol">' +
      '<div class="rfCtl"><span id="rfTabQLupa"></span>' +
      '<select id="rfBoardEstSel" onchange="window.nxRfBoardEst(this.value)" aria-label="Filtrar tablero por estado">' +
      '<option value=""' + (!_rfBoardEst ? ' selected' : '') + '>Todos los estados</option>' +
      '<option value="disponible"' + (_rfBoardEst === 'disponible' ? ' selected' : '') + '>Disponibles</option>' +
      '<option value="apartado"' + (_rfBoardEst === 'apartado' ? ' selected' : '') + '>Apartados</option>' +
      '<option value="por_confirmar"' + (_rfBoardEst === 'por_confirmar' ? ' selected' : '') + '>Por confirmar</option>' +
      '<option value="confirmado"' + (_rfBoardEst === 'confirmado' ? ' selected' : '') + '>Confirmados</option>' +
      '</select>' +
      '<button class="btn bsm bc1" type="button" onclick="window.nxRifaSuerte()"><i class="ti ti-dice-5"></i> A la suerte</button></div>' +
      '<div class="rfLegend"><span><i class="d" style="background:#e2e8f0"></i>Disponible</span><span><i class="d" style="background:#fdba74"></i>Por confirmar</span><span><i class="d" style="background:#86efac"></i>Confirmado</span><span><i class="d" style="background:#fde68a"></i>Apartado</span></div>' +
      '<div id="rfBoardWrap">' + boardHTML(r) + '</div>' +
      '</div>' +
      '<div class="rfDetailDock" id="rfDetailDock">' + RF_DOCK_EMPTY + '</div>' +
      '</div>';
  }
  window.nxRfBoardEst = function (v) {
    _rfBoardEst = (['disponible', 'apartado', 'por_confirmar', 'confirmado'].indexOf(v) >= 0) ? v : '';
    _tabPage = 0;
    var r = currentRifa(); var w = document.getElementById('rfBoardWrap');
    if (r && w) w.innerHTML = boardHTML(r);
  };
  window.nxRfIrDisponibles = function () { _rfBoardEst = 'disponible'; window.nxRfTab('numeros'); };
  window.nxRfIrApartados = function () { _rfBoardEst = 'apartado'; window.nxRfTab('numeros'); };

  // ── Pestaña "Pagos por revisar" (bandeja) — solo boletos por_confirmar. Filtro y filas propios
  // (NO comparte _tkEst con el modal nxRifaTickets, para no arrastrar estado entre los dos).
  // Abrir una fila reusa gestBoleto vía nxTkOpen — cero acciones nuevas, mismo panel lateral.
  function rfPagosRowsHTML(q) {
    var ql = (q || '').trim().toLowerCase();
    var list = _boletos.filter(function (b) {
      if (b.estado !== 'por_confirmar') return false;
      if (!ql) return true;
      return (String(b.numero) + ' ' + (b.comprador_nombre || '') + ' ' + (b.comprador_telefono || '')).toLowerCase().indexOf(ql) >= 0;
    });
    if (!list.length) return '<div class="rfPayEmpty"><i class="ti ti-checks"></i>No hay pagos por revisar.</div>';
    return list.map(function (b) {
      var nom = (b.comprador_nombre || '').trim();
      var ini = nom ? nom.split(/\s+/).map(function (x) { return x[0] || ''; }).slice(0, 2).join('').toUpperCase() : '?';
      // Miniatura real del comprobante en la fila (no solo un ícono) si el boleto trae voucher —
      // sin voucher, cae al avatar de iniciales de siempre. Mismo dato (b.voucher), ninguna
      // consulta nueva.
      var thumb = b.voucher ? '<img class="rfPayThumb" src="' + esc(b.voucher) + '" alt="Comprobante de pago">' : '<div class="rfPayIni">' + esc(ini) + '</div>';
      return '<div class="rfPayRow" onclick="window.nxTkOpen(\'' + b.id + '\')" tabindex="0" role="button" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}">' +
        thumb +
        '<div class="rfPayInfo"><b>' + esc(nom || '—') + '</b><span>#' + esc(String(b.numero)) + ' · ' + esc(fechaTk(b.created_at)) + '</span></div>' +
        '<div class="rfPayR"><b>' + fmt(b.precio) + '</b>' + (b.voucher ? '<i class="ti ti-receipt" style="color:#16a34a" title="Con comprobante"></i>' : '') + '</div>' +
        // Aprobar/Rechazar de 1 toque, sin abrir el panel lateral (stopPropagation — la fila
        // entera ya tiene su propio onclick que la abriría). Mismas 2 funciones de siempre
        // (nxRifaConfirmar/nxRifaRechazar), nada nuevo — solo un atajo desde la bandeja.
        '<div class="rfPayBtns">' +
        '<button type="button" class="rfPayBtn rfPayBtnOk" aria-label="Aprobar pago" title="Aprobar pago" onclick="event.stopPropagation();window.nxRifaConfirmar(\'' + b.id + '\')"><i class="ti ti-check"></i></button>' +
        '<button type="button" class="rfPayBtn rfPayBtnNo" aria-label="Rechazar pago" title="Rechazar pago" onclick="event.stopPropagation();window.nxRifaRechazar(\'' + b.id + '\')"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '</div>';
    }).join('');
  }
  function rfPagosTabHTML() {
    return '<div style="margin-bottom:9px"><span id="rfPagosQLupa"></span></div>' +
      '<div id="rfPagosBody">' + rfPagosRowsHTML(_rfPagosQ) + '</div>';
  }
  window.nxRfPagosBuscar = function (v) { _rfPagosQ = v || ''; var b = document.getElementById('rfPagosBody'); if (b) b.innerHTML = rfPagosRowsHTML(_rfPagosQ); };
  // NPGS §5: lupa colapsada, mismo patrón que pintarLupaRfTab (tablero) — SIN cont: porque las
  // filas viven dentro de #rfPagosBody sin marcado propio de "resultados" (mensaje ya honesto).
  function pintarLupaRfPagos() {
    var box = document.getElementById('rfPagosQLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_rfPagosQ')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'rfPagosQ',
      placeholder: 'Comprador, número o teléfono…', value: _rfPagosQ || '',
      onterm: function (v) { window.nxRfPagosBuscar(v); }
    });
  }

  // ── Pestaña "Participantes" — antes reusaba tkRowsHTML tal cual (una fila por TICKET, no por
  // persona): un mismo comprador con 3 boletos salía 3 veces sin ningún total (Hallazgo E de la
  // auditoría). Ahora se AGRUPA de verdad por comprador — telKey() (el mismo normalizador que ya
  // usa nxRifaPrevBoletos para "cliente repetido"), o 'n:'+nombre si no hay teléfono, IGUAL
  // criterio que ya usa rifaStats()/nxRifaStats para no inventar un 2do criterio de agrupación.
  // comprador_cedula/comprador_email SÍ son columnas reales de rifa_boletos (confirmado por SQL
  // directo) — se muestran cuando existen, nada se inventa si vienen vacías.
  function rfParticipantesData(q) {
    var ql = (q || '').trim().toLowerCase();
    var groups = {}, order = [];
    _boletos.forEach(function (b) {
      if (b.estado === 'anulado') return;
      var k = telKey(b.comprador_telefono) || ('n:' + (b.comprador_nombre || '?'));
      if (!groups[k]) { groups[k] = { nombre: '', telefono: '', cedula: '', email: '', tickets: [], montoConf: 0, pend: 0 }; order.push(k); }
      var g = groups[k];
      if (!g.nombre && b.comprador_nombre) g.nombre = b.comprador_nombre;
      if (!g.telefono && b.comprador_telefono) g.telefono = b.comprador_telefono;
      if (!g.cedula && b.comprador_cedula) g.cedula = b.comprador_cedula;
      if (!g.email && b.comprador_email) g.email = b.comprador_email;
      g.tickets.push(b);
      if (b.estado === 'confirmado') g.montoConf += Number(b.precio || 0); else g.pend += Number(b.precio || 0);
    });
    var list = order.map(function (k) { return groups[k]; });
    if (ql) list = list.filter(function (g) { return (g.nombre + ' ' + g.telefono + ' ' + g.cedula).toLowerCase().indexOf(ql) >= 0; });
    list.sort(function (a, b) { return b.tickets.length - a.tickets.length || (b.montoConf + b.pend) - (a.montoConf + a.pend); });
    return list;
  }
  // Índice numérico → grupo, para que nxRfPartVer reciba un ÍNDICE en vez de un nombre/teléfono
  // embebido en el onclick (un nombre con apóstrofe, ej. "d'Leon", rompería el string de JS del
  // atributo — mismo bug ya documentado y evitado en este sistema). Se refresca en cada pintado,
  // consistente porque el render es síncrono de un solo hilo.
  var _rfPartCache = [];
  function rfParticipantesRowsHTML(q) {
    var list = rfParticipantesData(q);
    _rfPartCache = list;
    if (!list.length) return '<div class="rfPayEmpty"><i class="ti ti-users"></i>Sin participantes con ese filtro.</div>';
    return list.map(function (g, i) {
      var ini = g.nombre ? g.nombre.trim().split(/\s+/).map(function (x) { return x[0] || ''; }).slice(0, 2).join('').toUpperCase() : '?';
      var sub = [g.telefono, (g.tickets.length + ' boleto' + (g.tickets.length === 1 ? '' : 's'))].filter(Boolean).join(' · ');
      return '<div class="rfPayRow" onclick="window.nxRfPartVer(' + i + ')" tabindex="0" role="button" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}">' +
        '<div class="rfPayIni">' + esc(ini) + '</div>' +
        '<div class="rfPayInfo"><b>' + esc(g.nombre || '—') + '</b><span>' + esc(sub) + '</span></div>' +
        '<div class="rfPartR"><b>' + fmt(g.montoConf) + '</b>' + (g.pend > 0 ? '<span class="rfPartPend">+' + fmt(g.pend) + ' en revisión</span>' : '') + '</div>' +
        '</div>';
    }).join('');
  }
  function rfParticipantesTabHTML() {
    return '<div style="margin-bottom:9px"><span id="rfPtQLupa"></span></div>' +
      '<div id="rfPtBody">' + rfParticipantesRowsHTML(_rfPtQ) + '</div>';
  }
  window.nxRfPtBuscar = function (v) { _rfPtQ = v || ''; var b = document.getElementById('rfPtBody'); if (b) b.innerHTML = rfParticipantesRowsHTML(_rfPtQ); };
  function pintarLupaRfPt() {
    var box = document.getElementById('rfPtQLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_rfPtQ')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'rfPtQ',
      placeholder: 'Comprador, teléfono o cédula…', value: _rfPtQ || '',
      onterm: function (v) { window.nxRfPtBuscar(v); }
    });
  }
  // Detalle de UN participante: sus datos reales + sus boletos (chips, cada uno abre gestBoleto
  // vía nxTkOpen — cero acción nueva, mismo panel lateral de siempre).
  // Las 2 tarjetas "Confirmado"/"En revisión" son ahora CLICABLES (pedido del dueño): tocar una
  // filtra la lista de boletos de ABAJO a esa sección — no abre otra ventana ni navega fuera del
  // participante, porque los boletos que respaldan esos 2 montos son justo los que ya se listan
  // aquí mismo como chips. Reusa `.rfKpiT` (mismo chevron+cursor:pointer que ya usan los KPI del
  // panel principal) — no un estilo nuevo.
  function partChipHTML(b) {
    var e = tkEstInfo(b);
    return '<button type="button" class="rfPartTk" style="color:' + e[1] + ';border-color:' + e[1] + '55;background:' + e[1] + '14" onclick="window.nxTkOpen(\'' + b.id + '\')">#' + esc(String(b.numero)) + '<span class="rfPartTkM">' + e[0] + '</span></button>';
  }
  function partChipsFiltrar(g, tipo) {
    var list = g.tickets.slice().sort(function (a, b) { return String(a.numero).localeCompare(String(b.numero)); });
    if (tipo === 'confirmado') list = list.filter(function (b) { return b.estado === 'confirmado'; });
    else if (tipo === 'pendiente') list = list.filter(function (b) { return b.estado !== 'confirmado'; }); // por_confirmar + apartado, mismo criterio que g.pend
    return list;
  }
  window.nxRfPartVer = function (idx) {
    var g = _rfPartCache[idx]; if (!g) return;
    cerrarModal('nxRfPart');
    var ini = g.nombre ? g.nombre.trim().split(/\s+/).map(function (x) { return x[0] || ''; }).slice(0, 2).join('').toUpperCase() : '?';
    var chips = partChipsFiltrar(g, '').map(partChipHTML).join('');
    var ov = document.createElement('div'); ov.id = 'nxRfPart'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    var kbd = ' onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}"';
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:92vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-user"></i> Participante</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxRfPart\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="overflow-y:auto;flex:1">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">' +
      '<div class="rfPayIni" style="width:46px;height:46px;font-size:15px;flex-shrink:0">' + esc(ini) + '</div>' +
      '<div style="min-width:0"><div style="font-size:15px;font-weight:800;color:#0f172a">' + esc(g.nombre || '—') + '</div>' +
      (g.telefono ? '<div style="font-size:12.5px;color:#334155"><i class="ti ti-brand-whatsapp" style="color:#16a34a"></i> ' + esc(g.telefono) + '</div>' : '') +
      '</div></div>' +
      (g.cedula || g.email ? '<div style="font-size:12px;color:#475569;margin-bottom:10px">' + [g.cedula ? 'Cédula: ' + esc(g.cedula) : '', g.email ? 'Correo: ' + esc(g.email) : ''].filter(Boolean).join(' · ') + '</div>' : '') +
      '<div class="rfKpis" style="grid-template-columns:1fr 1fr;margin-bottom:12px">' +
      '<div class="rfKpi rfKpiT" id="rfPartKpiConf" tabindex="0" role="button" aria-label="Ver solo los boletos confirmados" onclick="window.nxRfPartFiltro(' + idx + ',\'confirmado\')"' + kbd + '><span>Confirmado</span><b style="color:#16a34a">' + fmt(g.montoConf) + '</b></div>' +
      '<div class="rfKpi rfKpiT" id="rfPartKpiPend" tabindex="0" role="button" aria-label="Ver solo los boletos en revisión" onclick="window.nxRfPartFiltro(' + idx + ',\'pendiente\')"' + kbd + '><span>En revisión</span><b style="color:#d97706">' + fmt(g.pend) + '</b></div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px">' +
      '<span id="rfPartChipsLbl" style="font-size:10.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px">Sus boletos (' + g.tickets.length + ')</span>' +
      '<button type="button" id="rfPartVerTodos" onclick="window.nxRfPartFiltro(' + idx + ',\'\')" style="display:none;border:0;background:none;color:#4338ca;font-size:11px;font-weight:800;cursor:pointer;padding:0">Ver todos</button>' +
      '</div>' +
      '<div id="rfPartChips" style="display:flex;flex-wrap:wrap;gap:7px">' + chips + '</div>' +
      '</div></div>';
    document.body.appendChild(ov);
  };
  window.nxRfPartFiltro = function (idx, tipo) {
    var g = _rfPartCache[idx]; if (!g) return;
    var wrap = document.getElementById('rfPartChips'); if (!wrap) return;
    var actual = wrap.getAttribute('data-filtro') || '';
    var next = actual === tipo ? '' : tipo; // tocar la misma tarjeta 2 veces limpia el filtro
    wrap.setAttribute('data-filtro', next);
    var list = partChipsFiltrar(g, next);
    wrap.innerHTML = list.length ? list.map(partChipHTML).join('') : '<div style="font-size:12px;color:#94a3b8;padding:6px 2px">Sin boletos en esta sección.</div>';
    var lbl = document.getElementById('rfPartChipsLbl');
    if (lbl) lbl.textContent = (next === 'confirmado' ? 'Confirmados' : next === 'pendiente' ? 'En revisión' : 'Sus boletos') + ' (' + list.length + ')';
    var ver = document.getElementById('rfPartVerTodos'); if (ver) ver.style.display = next ? '' : 'none';
    var k1 = document.getElementById('rfPartKpiConf'), k2 = document.getElementById('rfPartKpiPend');
    if (k1) k1.classList.toggle('on', next === 'confirmado');
    if (k2) k2.classList.toggle('on', next === 'pendiente');
  };

  // ── Pestaña "Tickets" — lista CRUDA de boletos (reusa tkRowsHTML, la MISMA tabla del modal
  // "Lista de tickets", cero lógica nueva) — distinta a "Participantes", que agrupa por PERSONA.
  // Comparte _tkEst con el modal nxRifaTickets a propósito: es el mismo filtro global de estado
  // que ya usan los botones/KPIs del panel (Confirmados/Por confirmar/...) — no un estado nuevo.
  function rfTicketsTabHTML() {
    return '<div class="rfCtl"><span id="rfTkQLupa"></span>' +
      '<select id="rfTkEstSel" onchange="window.nxRfTkEst(this.value)" aria-label="Filtrar tickets por estado">' +
      '<option value=""' + (!_tkEst ? ' selected' : '') + '>Todos los estados</option>' +
      '<option value="confirmado"' + (_tkEst === 'confirmado' ? ' selected' : '') + '>Confirmados</option>' +
      '<option value="por_confirmar"' + (_tkEst === 'por_confirmar' ? ' selected' : '') + '>Por confirmar</option>' +
      '<option value="apartado"' + (_tkEst === 'apartado' ? ' selected' : '') + '>Apartados</option>' +
      '<option value="anulado"' + (_tkEst === 'anulado' ? ' selected' : '') + '>Anulados</option>' +
      '</select></div>' +
      '<div class="tw" style="overflow:auto"><table class="tkTbl"><thead><tr><th>No.</th><th>Participante</th><th>Fecha</th><th>Pago</th><th>Monto</th><th>Estado</th><th>Modo</th></tr></thead><tbody id="rfTkBody">' + tkRowsHTML(_rfTkQ) + '</tbody></table></div>';
  }
  window.nxRfTkEst = function (v) {
    _tkEst = (['confirmado', 'por_confirmar', 'apartado', 'anulado'].indexOf(v) >= 0) ? v : '';
    var b = document.getElementById('rfTkBody'); if (b) b.innerHTML = tkRowsHTML(_rfTkQ);
  };
  window.nxRfTkBuscar = function (v) { _rfTkQ = v || ''; var b = document.getElementById('rfTkBody'); if (b) b.innerHTML = tkRowsHTML(_rfTkQ); };
  function pintarLupaRfTk() {
    var box = document.getElementById('rfTkQLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_rfTkQ')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'rfTkQ',
      placeholder: 'Número, comprador o teléfono…', value: _rfTkQ || '',
      onterm: function (v) { window.nxRfTkBuscar(v); }
    });
  }

  window.nxRifaBuscar = function (v) { _tabQ = v; _tabPage = 0; var r = currentRifa(); var w = document.getElementById('rfBoardWrap'); if (r && w) w.innerHTML = boardHTML(r); };
  // NPGS §5: lupa colapsada, con teclado numérico (inputmode). SIN cont: — el tablero pagina de a
  // 120 celdas por página, un conteo de celdas visibles engañaría (no es "N boletos encontrados").
  function pintarLupaRfTab() {
    var box = document.getElementById('rfTabQLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_rfTabQ')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'rfTabQ',
      placeholder: 'Número de boleto…', value: _tabQ || '', inputmode: 'numeric',
      onterm: function (v) { window.nxRifaBuscar(v); }
    });
  }
  window.nxRifaTabPage = function (d) { _tabPage += d; if (_tabPage < 0) _tabPage = 0; var r = currentRifa(); var w = document.getElementById('rfBoardWrap'); if (r && w) w.innerHTML = boardHTML(r); };
  window.nxRifaNum = function (s) { var b = _bolMap[s]; if (b) gestBoleto(b); else nxRifaVender(s); };

  window.nxRifaSuerte = function () {
    var r = currentRifa(); if (!r) return;
    var total = Number(r.cantidad_numeros || 0), dig = Number(r.cantidad_digitos || 4);
    var avail = [];
    for (var i = 0; i < total; i++) { var s = String(i).padStart(dig, '0'); if (!_bolMap[s]) avail.push(s); }
    if (!avail.length) { toast('err', 'Sin disponibles', 'No quedan números libres'); return; }
    nxRifaVender(avail[Math.floor(Math.random() * avail.length)]);
  };

  function nxRifaVender(numero) {
    var r = currentRifa(); if (!r) return;
    cerrarModal('nxRvForm');
    var ov = document.createElement('div'); ov.id = 'nxRvForm'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:92vh;display:flex;flex-direction:column">' +
      '<div class="mt"><span><i class="ti ti-ticket"></i> Vender boleto ' + esc(numero) + '</span><button class="nxBack" type="button" onclick="document.getElementById(\'nxRvForm\').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>' +
      '<div style="overflow-y:auto;flex:1">' +
      '<div class="fr"><label>Comprador *</label><input id="rvNom" class="no-upper" placeholder="Nombre del comprador"></div>' +
      '<div class="fr"><label>WhatsApp / teléfono</label><input id="rvTel" inputmode="tel" placeholder="809-000-0000" oninput="window.nxRifaPrevBoletos(this.value)"></div>' +
      '<div id="rvPrev" style="display:none"></div>' +
      '<div class="fr-row"><div class="fr"><label>Precio</label><input id="rvPrecio" data-nx-money inputmode="numeric" value="' + (r.precio_boleto ? Math.round(r.precio_boleto) : '') + '"></div>' +
      '<div class="fr"><label>Método de pago</label><select id="rvMet"><option>Efectivo</option><option>Transferencia</option><option>Depósito</option><option>Tarjeta</option><option>Pago móvil</option></select></div></div>' +
      (vendsRifa().length ? '<div class="fr"><label>Vendedor (opcional)</label><select id="rvVendSel"><option value="">— Sin vendedor —</option>' + vendsRifa().map(function (v) { return '<option value="' + v.id + '">' + esc(v.nombre || '') + '</option>'; }).join('') + '</select></div>' : '<div class="fr"><label>Vendedor (opcional)</label><input id="rvVend" class="no-upper" placeholder="Quién lo vendió"></div>') +
      (_cuentas.length ? '<div class="fr"><label>Cuenta donde pagó (opcional)</label><select id="rvCuenta"><option value="">— No aplica —</option>' + _cuentas.map(function (c) { return '<option value="' + c.id + '">' + esc(c.banco || '') + (c.numero_cuenta ? ' · ' + esc(c.numero_cuenta) : '') + '</option>'; }).join('') + '</select></div>' : '') +
      '<label style="display:flex;align-items:center;gap:9px;font-size:13px;font-weight:600;color:#334155;padding:6px 2px"><input type="checkbox" id="rvConf" style="width:18px;height:18px"> Pago confirmado (verificado)</label>' +
      '<div style="font-size:11px;color:#94a3b8;padding:0 2px 6px">Sin marcar, queda “Por confirmar” hasta que apruebes el pago.</div>' +
      '</div>' +
      '<div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxRvForm\').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxRifaVenderGuardar(\'' + esc(numero) + '\')"><i class="ti ti-check"></i> Vender</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    setTimeout(function () { var i = document.getElementById('rvNom'); if (i) i.focus(); }, 60);
  }

  // Muestra los boletos que ese teléfono YA tiene en esta rifa (cliente repetido)
  // Normaliza un telefono a su clave comparable: solo digitos y, si trae el
  // codigo de pais (1 / +1), se queda con los ultimos 10 digitos. Asi "1809-555-1234",
  // "+1 809 555 1234" y "809-555-1234" cuentan como el MISMO cliente.
  function telKey(t) { var d = String(t || '').replace(/\D/g, ''); if (d.length > 10) d = d.slice(-10); return d; }
  window.nxRifaPrevBoletos = function (tel) {
    var box = document.getElementById('rvPrev'); if (!box) return;
    var d = telKey(tel);
    if (d.length < 7) { box.style.display = 'none'; box.innerHTML = ''; return; }
    var prev = _boletos.filter(function (b) { return b.estado !== 'anulado' && telKey(b.comprador_telefono) === d; });
    if (!prev.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
    prev.sort(function (a, b) { return String(a.numero).localeCompare(String(b.numero)); });
    var nom = (prev[0].comprador_nombre || '').trim();
    var montoTot = prev.reduce(function (s, b) { return s + (Number(b.precio) || 0); }, 0);
    var chips = prev.map(function (b) {
      var col = b.estado === 'confirmado' ? '#16a34a' : (b.estado === 'apartado' ? '#94a3b8' : '#d97706');
      return '<span style="display:inline-flex;align-items:center;background:' + col + '1a;color:' + col + ';font-weight:800;font-size:11px;padding:2px 8px;border-radius:20px;margin:3px 3px 0 0">' + esc(String(b.numero)) + '</span>';
    }).join('');
    box.style.display = 'block';
    box.innerHTML = '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 10px;margin:0 0 9px">' +
      '<div style="font-size:11.5px;font-weight:800;color:#1d4ed8;display:flex;align-items:center;gap:5px"><i class="ti ti-user-check"></i> Cliente repetido' + (nom ? ': ' + esc(nom) : '') + '</div>' +
      '<div style="font-size:10.5px;color:#475569;margin:2px 0 2px">Ya tiene ' + prev.length + ' boleto' + (prev.length > 1 ? 's' : '') + ' en esta rifa · ' + fmt(montoTot) + '</div>' +
      '<div>' + chips + '</div></div>';
    var ni = document.getElementById('rvNom'); if (ni && !ni.value.trim() && nom) ni.value = nom;
  };

  window.nxRifaVenderGuardar = async function (numero) {
    var nom = (val('rvNom') || '').trim();
    if (!nom) { toast('err', 'Falta el comprador', 'Pon el nombre'); return; }
    var body = {
      rifa_id: _rifaSel, numero: numero,
      comprador_nombre: nom,
      comprador_telefono: (val('rvTel') || '').trim() || null,
      precio: moneyVal('rvPrecio'),
      metodo_pago: val('rvMet') || null,
      vendedor_id: val('rvVendSel') || null,
      vendedor_nombre: val('rvVendSel') ? ((_vendedores.find(function (x) { return String(x.id) === String(val('rvVendSel')); }) || {}).nombre || null) : ((val('rvVend') || '').trim() || null),
      cuenta_id: val('rvCuenta') || null,
      estado: chk('rvConf') ? 'confirmado' : 'por_confirmar',
      origen: 'offline'
    };
    try {
      await getAPI().post('rifa_boletos', body);
      toast('ok', 'Boleto vendido', numero + ' · ' + nom);
      cerrarModal('nxRvForm');
      await cargarBoletos(_rifaSel);
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
      var nb = _bolMap[numero]; if (nb) window.nxRifaBoleto(nb.id);
    } catch (e) {
      var msg = String(e && e.message || e);
      if (/duplicate|unique|23505/i.test(msg)) toast('err', 'Número ya tomado', 'Ese boleto ya fue vendido');
      else toast('err', 'No se pudo', msg);
    }
  };

  // Ancho mínimo (px) a partir del cual, en la pestaña Números, el detalle se dockea como
  // columna fija (#rfDetailDock) en vez de abrir el cajón lateral — MISMO breakpoint que usa el
  // CSS (.rfNumRow/.rfDetailDock, min-width:900px) para que JS y CSS decidan lo mismo.
  var RF_DOCK_MIN = 900;
  function gestBoleto(b) {
    cerrarModal('nxRbGest');
    var wa = String(b.comprador_telefono || '').replace(/\D/g, ''); if (wa.length === 10) wa = '1' + wa;
    var estTxt = b.estado === 'confirmado' ? 'Pago verificado' : (b.estado === 'apartado' ? 'Apartado' : (b.estado === 'anulado' ? 'Rechazado' : 'Por confirmar'));
    var rg = currentRifa() || _rifas.find(function (x) { return String(x.id) === String(b.rifa_id); }) || {};
    var prem = rg.premio || rg.nombre || 'la rifa';
    _bolActual = bolData(b, rg); _bolTexto = bolTexto(b, rg);
    var waHref = boletoWaHref(b, rg);
    // Contenido del detalle — el MISMO de siempre, ahora en una variable para poder mostrarlo en
    // 2 contenedores distintos: el cajón lateral (móvil, o fuera de la pestaña Números) o la
    // columna fija #rfDetailDock (escritorio, pestaña Números — ver RF_DOCK_MIN más abajo).
    // Ninguna de las funciones que actúan sobre el boleto (nxRifaConfirmar/Liberar/CambiarNum/...)
    // tuvo que tocarse: siguen cerrando 'nxRbGest' (no-op si no existe) y volviendo a pintar la
    // pestaña completa, que reconstruye este mismo detalle en el contenedor que corresponda.
    var body2 = '<div style="font-size:13px;color:#334155;line-height:1.7;padding:2px 2px 8px">' +
      '<div style="font-size:15px;font-weight:800;color:#0f172a">' + esc(b.comprador_nombre || '—') + '</div>' +
      (b.comprador_telefono ? '<div><i class="ti ti-brand-whatsapp" style="color:#16a34a"></i> ' + esc(b.comprador_telefono) + '</div>' : '') +
      '<div><i class="ti ti-cash"></i> ' + fmt(b.precio) + (b.metodo_pago ? ' · ' + esc(b.metodo_pago) : '') + '</div>' +
      '<div>Estado: <b>' + estTxt + '</b></div>' +
      (b.vendedor_nombre ? '<div>Vendedor: ' + esc(b.vendedor_nombre) + '</div>' : '') +
      '</div>' +
      // Motivo del rechazo — solo se ve si el boleto quedó anulado por rechazo de pago
      // (nxRifaRechazarGuardar). No inventa nada: si no hay motivo guardado, no aparece nada.
      (b.estado === 'anulado' && b.motivo_rechazo ? '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:9px 11px;margin:2px 2px 8px;font-size:12px;color:#991b1b"><b>Motivo del rechazo:</b> ' + esc(b.motivo_rechazo) + '</div>' : '') +
      // "Vista previa del comprobante" (pedido explícito del prototipo): miniatura clicable
      // ANTES de los botones, mismo nxVerVoucher() de siempre para el tamaño completo — no se
      // duplica la acción de "Voucher", solo se le agregó un atajo visual.
      (b.voucher ? '<button type="button" class="rfVouThumb" onclick="window.nxVerVoucher(\'' + b.id + '\')" aria-label="Ver comprobante completo"><img src="' + esc(b.voucher) + '" alt="Comprobante de pago"><span><i class="ti ti-zoom-in"></i> Ver comprobante completo</span></button>' : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">' +
      '<a class="btn bsm bc1" href="' + waHref + '" target="_blank" rel="noopener" style="flex:1 1 100%;justify-content:center;padding:11px"><i class="ti ti-brand-whatsapp"></i> Enviar por WhatsApp</a>' +
      '<button class="btn bsm bghost" type="button" style="flex:1;min-width:110px;justify-content:center" onclick="window.nxRifaBoleto(\'' + b.id + '\')"><i class="ti ti-eye"></i> Ver / imagen</button>' +
      '<button class="btn bsm bghost" type="button" style="flex:1;min-width:100px;justify-content:center" onclick="window.nxRifaEditarBoleto(\'' + b.id + '\')"><i class="ti ti-edit"></i> Editar</button>' +
      (b.estado !== 'confirmado' && b.estado !== 'anulado' ? '<button class="btn bsm" type="button" style="flex:1;min-width:110px;justify-content:center;background:#16a34a;border-color:#16a34a;color:#fff" onclick="window.nxRifaConfirmar(\'' + b.id + '\')"><i class="ti ti-check"></i> Aprobar pago</button>' : '') +
      (b.estado === 'por_confirmar' ? '<button class="btn bsm" type="button" style="flex:1;min-width:110px;justify-content:center;background:#dc2626;border-color:#dc2626;color:#fff" onclick="window.nxRifaRechazar(\'' + b.id + '\')"><i class="ti ti-x"></i> Rechazar pago</button>' : '') +
      (esAdmin() ? '<button class="btn bsm bghost" type="button" style="flex:1;min-width:120px;justify-content:center;color:#4338ca" onclick="window.nxRifaCambiarNum(\'' + b.id + '\')"><i class="ti ti-arrows-exchange"></i> Cambiar número</button>' : '') +
      '<button class="btn bsm bghost" type="button" style="flex:1;min-width:100px;justify-content:center;color:#dc2626" onclick="window.nxRifaLiberar(\'' + b.id + '\')"><i class="ti ti-trash"></i> Liberar</button>' +
      '</div>';
    var dock = (_rfTab === 'numeros' && window.innerWidth >= RF_DOCK_MIN) ? document.getElementById('rfDetailDock') : null;
    if (dock) {
      dock.innerHTML = '<div class="rfDockCard"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<span style="font-size:14px;font-weight:800;color:#0f172a;display:flex;align-items:center;gap:6px"><i class="ti ti-ticket" style="color:#4338ca"></i> Boleto ' + esc(String(b.numero)) + '</span>' +
        '<button aria-label="Cerrar detalle" class="btn bsm bghost" type="button" onclick="window.nxRfDockCerrar()"><i class="ti ti-x"></i></button></div>' +
        body2 + '</div>';
      return;
    }
    // RIFAS V3: panel LATERAL, no modal centrado — .rfDrawerOv/.rfDrawer (CSS nueva) reusan el
    // MISMO .overlay/.modal de siempre (mismo id nxRbGest, mismo cierre por click-afuera y por
    // botón, mismos onclick internos) — solo cambia el contenedor visual. Con esto ninguna de
    // las funciones que ya cierran este id (nxRifaConfirmar/nxRifaLiberar/nxRifaCambiarNum) tuvo
    // que tocarse: cerrarModal('nxRbGest') sigue funcionando igual.
    var ov = document.createElement('div'); ov.id = 'nxRbGest'; ov.className = 'overlay open rfDrawerOv';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal rfDrawer"><div class="mt"><span><i class="ti ti-ticket"></i> Boleto ' + esc(String(b.numero)) + '</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxRbGest\').remove()"><i class="ti ti-x"></i></button></div>' + body2 + '</div>';
    document.body.appendChild(ov);
  }

  // ── CAMBIAR NÚMERO DEL BOLETO (solo administración) ──
  window.nxRifaCambiarNum = function (id) {
    if (!esAdmin()) { toast('err', 'Solo administración', 'Esta opción es solo para el administrador'); return; }
    var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (!b) return;
    var rg = currentRifa() || _rifas.find(function (x) { return String(x.id) === String(b.rifa_id); }) || {};
    var dig = Number(rg.cantidad_digitos || 4), total = Number(rg.cantidad_numeros || 0);
    cerrarModal('nxRbGest'); cerrarModal('nxCambNum');
    var ov = document.createElement('div'); ov.id = 'nxCambNum'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:360px"><div class="mt"><span><i class="ti ti-arrows-exchange"></i> Cambiar número</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxCambNum\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:12.5px;color:#475569;padding:2px 2px 4px">Si el cliente no quiere ese número, asígnale otro <b>disponible</b>. Conserva el comprador y el pago; solo cambia el número.</div>' +
      '<div style="font-size:12.5px;color:#475569;padding:2px 2px 10px">Boleto actual: <b style="font-family:var(--mono);color:#4338ca">' + esc(String(b.numero)) + '</b> · ' + esc(b.comprador_nombre || '—') + '</div>' +
      '<div class="fr"><label>Nuevo número (0 a ' + (total ? total - 1 : 0) + ')</label><input id="cnNum" inputmode="numeric" maxlength="' + dig + '" placeholder="' + ('0').repeat(dig) + '" value="" style="font-family:var(--mono);letter-spacing:2px"></div>' +
      '<div style="margin-top:4px"><button class="btn bsm bghost" type="button" onclick="window.nxRifaCambNumSuerte(' + dig + ',' + total + ')"><i class="ti ti-dice-5"></i> A la suerte (uno libre)</button></div>' +
      '<div class="fe" style="margin-top:12px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxCambNum\').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxRifaCambNumGuardar(\'' + b.id + '\')"><i class="ti ti-check"></i> Cambiar</button></div></div>';
    document.body.appendChild(ov);
  };
  window.nxRifaCambNumSuerte = function (dig, total) {
    var avail = [];
    for (var i = 0; i < total; i++) { var s = String(i).padStart(dig, '0'); if (!_bolMap[s]) avail.push(s); }
    if (!avail.length) { toast('err', 'Sin disponibles', 'No quedan números libres'); return; }
    var el = document.getElementById('cnNum'); if (el) el.value = avail[Math.floor(Math.random() * avail.length)];
  };
  window.nxRifaCambNumGuardar = async function (id) {
    if (!esAdmin()) { toast('err', 'Solo administración', ''); return; }
    var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (!b) return;
    var rg = currentRifa() || _rifas.find(function (x) { return String(x.id) === String(b.rifa_id); }) || {};
    var dig = Number(rg.cantidad_digitos || 4), total = Number(rg.cantidad_numeros || 0);
    var raw = (val('cnNum') || '').trim();
    if (!raw) { toast('err', 'Escribe el número'); return; }
    if (!/^\d+$/.test(raw)) { toast('err', 'Solo números'); return; }
    var num = parseInt(raw, 10);
    if (total && (num < 0 || num >= total)) { toast('err', 'Fuera de rango', 'Debe ser de 0 a ' + (total - 1)); return; }
    var padded = String(num).padStart(dig, '0');
    if (padded === String(b.numero)) { toast('info', 'Es el mismo número', ''); return; }
    var ocup = _bolMap[padded];
    if (ocup && String(ocup.id) !== String(id)) { toast('err', 'Número ocupado', 'El ' + padded + ' ya lo tiene ' + (ocup.comprador_nombre || 'otro cliente')); return; }
    try {
      var antes = String(b.numero);
      await getAPI().patch('rifa_boletos', 'id=eq.' + id, { numero: padded });
      if (typeof window.logAudit === 'function') window.logAudit('RIFA_CAMBIO_NUMERO', (rg.nombre || 'Rifa') + ': ' + antes + ' → ' + padded + ' · ' + (b.comprador_nombre || 's/n') + (b.comprador_telefono ? ' (' + b.comprador_telefono + ')' : ''), 'Rifas');
      toast('ok', 'Número cambiado', 'Ahora es el ' + padded);
      cerrarModal('nxCambNum');
      await cargarBoletos(_rifaSel);
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
      var nb = _bolMap[padded]; if (nb) gestBoleto(nb);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  window.nxRifaEditarBoleto = function (id) {
    var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (!b) return;
    cerrarModal('nxRbGest'); cerrarModal('nxBolEdit');
    var metodos = ['Efectivo', 'Transferencia', 'Depósito', 'Tarjeta', 'Pago móvil'];
    var metOpts = metodos.map(function (m) { return '<option' + (b.metodo_pago === m ? ' selected' : '') + '>' + m + '</option>'; }).join('');
    var ov = document.createElement('div'); ov.id = 'nxBolEdit'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:92vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-edit"></i> Editar boleto ' + esc(String(b.numero)) + '</span><button class="nxBack" type="button" onclick="document.getElementById(\'nxBolEdit\').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>' +
      '<div style="overflow-y:auto;flex:1">' +
      '<div class="fr"><label>Comprador</label><input id="beNom" class="no-upper" value="' + esc(b.comprador_nombre || '') + '"></div>' +
      '<div class="fr"><label>WhatsApp / teléfono</label><input id="beTel" inputmode="tel" value="' + esc(b.comprador_telefono || '') + '"></div>' +
      '<div class="fr-row"><div class="fr"><label>Precio</label><input id="bePrecio" data-nx-money inputmode="numeric" value="' + (b.precio ? Math.round(b.precio) : '') + '"></div>' +
      '<div class="fr"><label>Método de pago</label><select id="beMet"><option value="">—</option>' + metOpts + '</select></div></div>' +
      (vendsRifa().length ? '<div class="fr"><label>Vendedor</label><select id="beVendSel"><option value="">— Sin vendedor —</option>' + vendsRifa().map(function (v) { return '<option value="' + v.id + '"' + (String(b.vendedor_id) === String(v.id) ? ' selected' : '') + '>' + esc(v.nombre || '') + '</option>'; }).join('') + '</select></div>' : '') +
      (_cuentas.length ? '<div class="fr"><label>Cuenta donde pagó</label><select id="beCuenta"><option value="">— No aplica —</option>' + _cuentas.map(function (c) { return '<option value="' + c.id + '"' + (String(b.cuenta_id) === String(c.id) ? ' selected' : '') + '>' + esc(c.banco || '') + (c.numero_cuenta ? ' · ' + esc(c.numero_cuenta) : '') + '</option>'; }).join('') + '</select></div>' : '') +
      '<div class="fr"><label>Estado</label><select id="beEstado"><option value="apartado"' + (b.estado === 'apartado' ? ' selected' : '') + '>Apartado</option><option value="por_confirmar"' + (b.estado === 'por_confirmar' ? ' selected' : '') + '>Por confirmar</option><option value="confirmado"' + (b.estado === 'confirmado' ? ' selected' : '') + '>Pago verificado</option></select></div>' +
      '</div>' +
      '<div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxBolEdit\').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxRifaEditBoletoGuardar(\'' + b.id + '\')"><i class="ti ti-check"></i> Guardar</button></div></div>';
    document.body.appendChild(ov);
  };
  window.nxRifaEditBoletoGuardar = async function (id) {
    var nom = (val('beNom') || '').trim();
    if (!nom) { toast('err', 'Falta el comprador'); return; }
    var body = {
      comprador_nombre: nom,
      comprador_telefono: (val('beTel') || '').trim() || null,
      precio: moneyVal('bePrecio'),
      metodo_pago: val('beMet') || null,
      estado: val('beEstado') || 'por_confirmar'
    };
    if (document.getElementById('beVendSel')) { var vid = val('beVendSel') || null; body.vendedor_id = vid; body.vendedor_nombre = vid ? ((_vendedores.find(function (x) { return String(x.id) === String(vid); }) || {}).nombre || null) : null; }
    if (document.getElementById('beCuenta')) { body.cuenta_id = val('beCuenta') || null; }
    try {
      await getAPI().patch('rifa_boletos', 'id=eq.' + id, body);
      toast('ok', 'Boleto actualizado', '');
      cerrarModal('nxBolEdit');
      await cargarBoletos(_rifaSel);
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
      var nb = _boletos.find(function (x) { return String(x.id) === String(id); });
      if (nb) gestBoleto(nb);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  // Aprobar/Rechazar/Cambiar número/Editar YA NO cierran la ventana de detalle al terminar —
  // pedido del dueño (2-ago-2026): así puede aprobar un pago y de inmediato tocar "Enviar por
  // WhatsApp" sin tener que volver a buscar al cliente. En vez de dejar la ventana vieja con
  // datos desactualizados, se REABRE con gestBoleto(nb) usando el boleto YA REFRESCADO de
  // cargarBoletos() — mismo patrón que ya usaba "Cambiar número" (nxRifaCambNumGuardar, más
  // abajo), ahora aplicado también aquí. "Liberar" es la única excepción a propósito: borra el
  // boleto por completo, así que no queda ningún detalle real que volver a mostrar.
  window.nxRifaConfirmar = async function (id) {
    try {
      await getAPI().patch('rifa_boletos', 'id=eq.' + id, { estado: 'confirmado' });
      toast('ok', 'Pago confirmado', '');
      await cargarBoletos(_rifaSel);
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
      var nb = _boletos.find(function (x) { return String(x.id) === String(id); });
      if (nb) gestBoleto(nb); else cerrarModal('nxRbGest');
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // Liberar SÍ cierra la ventana — a diferencia de Aprobar/Rechazar/Cambiar/Editar, este boleto
  // se BORRA por completo (DELETE), así que no queda ningún registro real que volver a mostrar.
  window.nxRifaLiberar = async function (id) {
    if (!confirm('¿Liberar este número? Se borra el boleto y el número queda disponible otra vez.')) return;
    try {
      await getAPI().del('rifa_boletos', 'id=eq.' + id);
      toast('ok', 'Número liberado', '');
      cerrarModal('nxRbGest');
      await cargarBoletos(_rifaSel);
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // ── RECHAZAR PAGO (con motivo) ──────────────────────────────────────────────────────────
  // Distinto de "Liberar": Liberar BORRA el boleto (sin rastro, sin motivo). Rechazar lo deja
  // en estado 'anulado' (ya existía como estado, pero ninguna función lo escribía — quedaba
  // "fantasma": aparecía en el filtro "Anulados" de Tickets y en tkEstInfo, pero nunca se
  // llegaba a producir). Al marcarlo 'anulado', _bolMap lo excluye automáticamente
  // (estadoCelda()), así que el número queda disponible para otro comprador SIN tocar nada más
  // — el mismo mecanismo que ya usa el resto del tablero. El motivo se guarda para que el
  // admin (o cualquiera revisando después) sepa POR QUÉ se rechazó ese pago.
  window.nxRifaRechazar = function (id) {
    var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (!b) return;
    cerrarModal('nxRbGest'); cerrarModal('nxRifaRech');
    var ov = document.createElement('div'); ov.id = 'nxRifaRech'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:400px"><div class="mt"><span><i class="ti ti-x"></i> Rechazar pago</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxRifaRech\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:12.5px;color:#475569;padding:2px 2px 10px">Boleto <b style="font-family:var(--mono);color:#4338ca">' + esc(String(b.numero)) + '</b> · ' + esc(b.comprador_nombre || '—') + '. El número queda <b>libre</b> para otro comprador.</div>' +
      '<div class="fr"><label>Motivo del rechazo (queda guardado, se ve en el detalle del boleto)</label><textarea id="rrMotivo" class="no-upper" rows="3" placeholder="Ej: el comprobante no corresponde al monto del boleto"></textarea></div>' +
      '<div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxRifaRech\').remove()">Cancelar</button><button class="btn bsm" type="button" style="background:#dc2626;border-color:#dc2626;color:#fff" onclick="window.nxRifaRechazarGuardar(\'' + b.id + '\')"><i class="ti ti-x"></i> Rechazar pago</button></div></div>';
    document.body.appendChild(ov);
  };
  window.nxRifaRechazarGuardar = async function (id) {
    var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (!b) return;
    var motivo = (val('rrMotivo') || '').trim();
    var btn = document.querySelector('#nxRifaRech .fe .bsm[style*="dc2626"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Rechazando…'; }
    try {
      await getAPI().patch('rifa_boletos', 'id=eq.' + id, { estado: 'anulado', motivo_rechazo: motivo || null });
      var rg = currentRifa() || _rifas.find(function (x) { return String(x.id) === String(b.rifa_id); }) || {};
      try { window.logAudit && window.logAudit('RIFA_PAGO_RECHAZADO', (rg.nombre || 'Rifa') + ': boleto ' + String(b.numero) + ' · ' + (b.comprador_nombre || 's/n') + (motivo ? ' · ' + motivo.slice(0, 120) : ''), 'Rifas'); } catch (e) {}
      toast('ok', 'Pago rechazado', 'El número ' + String(b.numero) + ' quedó libre otra vez');
      cerrarModal('nxRifaRech');
      await cargarBoletos(_rifaSel);
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
      var nb = _boletos.find(function (x) { return String(x.id) === String(id); });
      if (nb) gestBoleto(nb);
    } catch (e) {
      toast('err', 'No se pudo', String(e && e.message || e));
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-x"></i> Rechazar pago'; }
    }
  };

  // ── LINK PÚBLICO DE COMPRA ──
  window.nxRifaLink = function () {
    var r = currentRifa(); if (!r) return;
    cerrarModal('nxLink');
    var link = location.origin + '/rifa.html?id=' + r.id;
    var ov = document.createElement('div'); ov.id = 'nxLink'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:400px"><div class="mt"><span><i class="ti ti-link"></i> Link público de compra</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxLink\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:12px;color:#475569;margin-bottom:8px">Comparte este enlace para que tus clientes compren su boleto solos (eligen número y suben su pago):</div>' +
      '<input id="lkInp" readonly value="' + esc(link) + '" onclick="this.select()" style="width:100%;height:42px;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;background:#f8fafc;color:#334155">' +
      '<div class="fe" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn bsm bghost" type="button" onclick="window.nxLinkCopiar()"><i class="ti ti-copy"></i> Copiar</button><a class="btn bsm bghost" href="' + esc(link) + '" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> Abrir</a><button class="btn bsm bc1" type="button" onclick="window.nxLinkShare()"><i class="ti ti-brand-whatsapp"></i> Compartir</button></div></div>';
    document.body.appendChild(ov);
  };
  window.nxLinkCopiar = function () { var i = document.getElementById('lkInp'); if (!i) return; try { i.select(); document.execCommand('copy'); } catch (e) {} try { if (navigator.clipboard) navigator.clipboard.writeText(i.value); } catch (e) {} toast('ok', 'Link copiado', ''); };
  window.nxLinkShare = function () { var i = document.getElementById('lkInp'); if (!i) return; var url = i.value; if (navigator.share) { navigator.share({ title: 'Rifa', text: '🎟️ ¡Participa en la rifa! Compra tu boleto aquí:', url: url }).catch(function () {}); } else { window.nxLinkCopiar(); } };
  window.nxVerVoucher = function (id) {
    var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (!b || !b.voucher) { toast('info', 'Sin comprobante'); return; }
    cerrarModal('nxVou');
    var ov = document.createElement('div'); ov.id = 'nxVou'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:440px;max-height:92vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-receipt"></i> Comprobante · ' + esc(String(b.numero)) + '</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxVou\').remove()"><i class="ti ti-x"></i></button></div><div style="overflow:auto;flex:1"><img src="' + esc(b.voucher) + '" style="width:100%;border-radius:10px;display:block" alt="Comprobante de pago"></div></div>';
    document.body.appendChild(ov);
  };

  // ── SORTEO / GANADOR ──
  function padGan(raw, dig) { var r = String(raw || '').replace(/\D/g, ''); return r ? r.padStart(dig, '0').slice(-dig) : ''; }
  window.nxRifaSorteo = function () {
    var r = currentRifa(); if (!r) return;
    cerrarModal('nxSorteo');
    var dig = Number(r.cantidad_digitos || 4);
    var prev = r.numero_ganador || '';
    var ov = document.createElement('div'); ov.id = 'nxSorteo'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:400px"><div class="mt"><span><i class="ti ti-trophy"></i> Sorteo · ' + esc(r.nombre || '') + '</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxSorteo\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div class="fr"><label>Número ganador (el que salió en la lotería)</label><input id="rsNum" inputmode="numeric" maxlength="' + dig + '" value="' + esc(prev) + '" placeholder="' + new Array(dig + 1).join('0') + '" style="font-family:var(--mono);font-size:22px;text-align:center;letter-spacing:5px;font-weight:800"></div>' +
      '<button class="btn bc1" type="button" style="width:100%" onclick="window.nxRifaBuscarGanador()"><i class="ti ti-search"></i> Buscar ganador</button>' +
      '<div id="rsResult" style="margin-top:12px"></div>' +
      '<div class="fe" style="margin-top:12px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxSorteo\').remove()">Cerrar</button><button class="btn" type="button" style="background:#16a34a;border-color:#16a34a;color:#fff" onclick="window.nxRifaGuardarSorteo()"><i class="ti ti-check"></i> Guardar resultado</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    if (prev) window.nxRifaBuscarGanador();
  };
  window.nxRifaBuscarGanador = function () {
    var r = currentRifa(); if (!r) return;
    var dig = Number(r.cantidad_digitos || 4);
    var num = padGan(val('rsNum'), dig);
    var res = document.getElementById('rsResult'); if (!res) return;
    if (!num) { res.innerHTML = '<div class="rsNone">Escribe el número ganador arriba.</div>'; return; }
    var b = _bolMap[num];
    var main;
    if (b) {
      var wa = String(b.comprador_telefono || '').replace(/\D/g, ''); if (wa.length === 10) wa = '1' + wa;
      var waTxt = encodeURIComponent('¡FELICIDADES ' + (b.comprador_nombre || '') + '! 🎉🏆 Tu número ' + num + ' GANÓ en ' + (r.premio || r.nombre || 'la rifa') + '. En breve nos comunicamos contigo.');
      main = '<div class="rsWin"><div class="rsWinT">🏆 ¡GANADOR!</div><div class="rsWinNum">' + esc(num) + '</div><div class="rsWinNom">' + esc(b.comprador_nombre || '—') + '</div>' +
        (b.comprador_telefono ? '<div class="rsWinTel"><i class="ti ti-brand-whatsapp"></i> ' + esc(b.comprador_telefono) + '</div>' : '') +
        '<div class="rsWinEst">' + (b.estado === 'confirmado' ? '✓ Pago verificado' : '• Pago por confirmar') + '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:11px;justify-content:center">' +
        (wa ? '<a class="btn bsm" style="background:#fff;color:#15803d;border:none" href="https://wa.me/' + wa + '?text=' + waTxt + '" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> Avisar al ganador</a>' : '') +
        '<button class="btn bsm" style="background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.4)" type="button" onclick="window.nxRifaBoleto(\'' + b.id + '\')"><i class="ti ti-ticket"></i> Ver boleto</button>' +
        '</div></div>';
    } else {
      main = '<div class="rsNone"><i class="ti ti-mood-empty"></i> El número <b>' + esc(num) + '</b> no fue vendido — no hay ganador entre los boletos. Puedes registrar otro número (segundo sorteo) o el premio queda para la casa.</div>';
    }
    var max = Math.pow(10, dig), nn = parseInt(num, 10) || 0;
    var antN = String((nn - 1 + max) % max).padStart(dig, '0');
    var posN = String((nn + 1) % max).padStart(dig, '0');
    function conLine(lbl, x) { var bb = _bolMap[x]; return '<div class="rsCon"><span><b>' + lbl + '</b> ' + x + '</span><span style="color:' + (bb ? '#16a34a' : '#94a3b8') + '">' + (bb ? esc(bb.comprador_nombre || 'vendido') : 'no vendido') + '</span></div>'; }
    res.innerHTML = main + '<div class="rsConBox"><div class="rsConT">Números vecinos (consolación)</div>' + conLine('Anterior', antN) + conLine('Posterior', posN) + '</div>';
  };
  window.nxRifaGuardarSorteo = async function () {
    var r = currentRifa(); if (!r) return;
    var dig = Number(r.cantidad_digitos || 4);
    var num = padGan(val('rsNum'), dig);
    if (!num) { toast('err', 'Escribe el número ganador'); return; }
    try {
      await getAPI().patch('rifas', 'id=eq.' + r.id, { numero_ganador: num, estado: 'sorteada' });
      r.numero_ganador = num; r.estado = 'sorteada';
      toast('ok', 'Sorteo guardado', 'Número ganador: ' + num);
      cerrarModal('nxSorteo');
      await cargarRifas();
      var v = document.getElementById('v-rifas'); if (v) renderRifas(v);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // ── CUENTAS DE COBRO ──
  function ctaIcon(t) { return t === 'tarjeta' ? 'ti-credit-card' : (t === 'movil' ? 'ti-device-mobile' : 'ti-building-bank'); }
  async function recargarCuentas() { try { _cuentas = await getAPI().get('rifa_cuentas', 'select=*&order=created_at.asc') || []; } catch (e) {} }
  window.nxRifaCuentas = function () {
    cerrarModal('nxCtas');
    var lista = _cuentas.length ? _cuentas.map(function (c) {
      var clase = c.clase === 'ahorro' ? 'Ahorro' : (c.clase === 'corriente' ? 'Corriente' : '');
      return '<div class="ctaRow"><div class="ctaL"><i class="ti ' + ctaIcon(c.tipo) + '"></i><div style="min-width:0"><b>' + esc(c.banco || '(sin banco)') + (clase ? ' · ' + clase : '') + '</b><span>' + esc(c.numero_cuenta || '') + (c.titular ? ' · ' + esc(c.titular) : '') + (c.rnc_cedula ? ' · ' + esc(c.rnc_cedula) : '') + '</span></div></div><div style="display:flex;gap:4px"><button aria-label="Editar esta cuenta de cobro" class="btn bsm bghost" type="button" onclick="window.nxCuentaForm(\'' + c.id + '\')"><i class="ti ti-edit"></i></button><button aria-label="Eliminar esta cuenta de cobro" class="btn bsm bghost" type="button" onclick="window.nxCuentaEliminar(\'' + c.id + '\')"><i class="ti ti-minus" style="color:#dc2626"></i></button></div></div>';
    }).join('') : '<div style="text-align:center;color:#475569;font-size:12px;padding:18px">Sin cuentas. Agrega tus cuentas de banco, tarjeta o pago móvil para cobrar.</div>';
    var ov = document.createElement('div'); ov.id = 'nxCtas'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:90vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-building-bank"></i> Cuentas de cobro</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxCtas\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<button class="btn bsm bc1" type="button" style="margin-bottom:10px" onclick="window.nxCuentaForm(\'\')"><i class="ti ti-plus"></i> Nueva cuenta</button>' +
      '<div style="overflow-y:auto;flex:1">' + lista + '</div></div>';
    document.body.appendChild(ov);
  };
  window.nxCuentaForm = function (id) {
    var c = id ? (_cuentas.find(function (x) { return String(x.id) === String(id); }) || {}) : {};
    cerrarModal('nxCtaForm');
    var ov = document.createElement('div'); ov.id = 'nxCtaForm'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:380px"><div class="mt"><span><i class="ti ti-building-bank"></i> ' + (id ? 'Editar cuenta' : 'Nueva cuenta') + '</span><button class="nxBack" type="button" onclick="document.getElementById(\'nxCtaForm\').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>' +
      '<div class="fr"><label>Tipo</label><select id="ctTipo"><option value="banco"' + (c.tipo !== 'tarjeta' && c.tipo !== 'movil' ? ' selected' : '') + '>Cuenta bancaria</option><option value="tarjeta"' + (c.tipo === 'tarjeta' ? ' selected' : '') + '>Tarjeta</option><option value="movil"' + (c.tipo === 'movil' ? ' selected' : '') + '>Pago móvil / tPago</option></select></div>' +
      '<div class="fr"><label>Banco / entidad</label><input id="ctBanco" class="no-upper" value="' + esc(c.banco || '') + '" placeholder="Ej: Banreservas"></div>' +
      '<div class="fr"><label>Número de cuenta / teléfono</label><input id="ctNum" class="no-upper" value="' + esc(c.numero_cuenta || '') + '" placeholder="Ej: 9601234567"></div>' +
      '<div class="fr"><label>Tipo de cuenta (ahorro / corriente)</label><select id="ctClase"><option value=""' + (!c.clase ? ' selected' : '') + '>— No aplica —</option><option value="ahorro"' + (c.clase === 'ahorro' ? ' selected' : '') + '>Ahorro</option><option value="corriente"' + (c.clase === 'corriente' ? ' selected' : '') + '>Corriente</option></select></div>' +
      '<div class="fr"><label>Titular</label><input id="ctTit" class="no-upper" value="' + esc(c.titular || '') + '" placeholder="Nombre del titular"></div>' +
      '<div class="fr"><label>RNC / Cédula del titular</label><input id="ctRnc" class="no-upper" value="' + esc(c.rnc_cedula || '') + '" placeholder="Ej: 001-1234567-8"></div>' +
      '<div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxCtaForm\').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxCuentaGuardar(\'' + (id || '') + '\')"><i class="ti ti-check"></i> Guardar</button></div></div>';
    document.body.appendChild(ov);
  };
  window.nxCuentaGuardar = async function (id) {
    var banco = (val('ctBanco') || '').trim();
    if (!banco && !(val('ctNum') || '').trim()) { toast('err', 'Falta el banco o el número'); return; }
    var body = { banco: banco || null, numero_cuenta: (val('ctNum') || '').trim() || null, titular: (val('ctTit') || '').trim() || null, tipo: val('ctTipo') || 'banco', clase: val('ctClase') || null, rnc_cedula: (val('ctRnc') || '').trim() || null };
    try {
      if (id) await getAPI().patch('rifa_cuentas', 'id=eq.' + id, body);
      else await getAPI().post('rifa_cuentas', body);
      toast('ok', 'Cuenta guardada', '');
      cerrarModal('nxCtaForm');
      await recargarCuentas();
      window.nxRifaCuentas();
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxCuentaEliminar = async function (id) {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    try {
      await getAPI().del('rifa_cuentas', 'id=eq.' + id);
      await recargarCuentas();
      toast('ok', 'Cuenta eliminada', '');
      window.nxRifaCuentas();
    } catch (e) { toast('err', 'No se pudo'); }
  };
  // ── PAQUETES / COMBOS (por rifa) ──
  async function recargarPaq() { try { _paquetes = await getAPI().get('rifa_paquetes', 'select=*&order=cantidad.asc') || []; } catch (e) {} }
  window.nxRifaPaquetes = function () {
    var r = currentRifa(); if (!r) { toast('err', 'Abre una rifa primero'); return; }
    cerrarModal('nxPaqs');
    var pb = Number(r.precio_boleto || 0);
    var mios = _paquetes.filter(function (p) { return String(p.rifa_id) === String(r.id); });
    var lista = mios.length ? mios.map(function (p) {
      var normal = pb * Number(p.cantidad || 0), ah = normal - Number(p.precio || 0);
      return '<div class="ctaRow"><div class="ctaL"><i class="ti ti-package" style="color:#7c3aed"></i><div style="min-width:0"><b>' + Number(p.cantidad || 0) + ' boletos · ' + fmt(p.precio) + '</b><span>' + (p.etiqueta ? esc(p.etiqueta) + ' · ' : '') + (ah > 0 ? 'ahorra ' + fmt(ah) : 'sin descuento') + '</span></div></div><div style="display:flex;gap:4px"><button aria-label="Editar este combo" class="btn bsm bghost" type="button" onclick="window.nxPaqForm(\'' + p.id + '\')"><i class="ti ti-edit"></i></button><button aria-label="Eliminar este combo" class="btn bsm bghost" type="button" onclick="window.nxPaqEliminar(\'' + p.id + '\')"><i class="ti ti-minus" style="color:#dc2626"></i></button></div></div>';
    }).join('') : '<div style="text-align:center;color:#475569;font-size:12px;padding:18px">Sin paquetes. Crea combos como "5 boletos por RD$400" para vender más.</div>';
    var ov = document.createElement('div'); ov.id = 'nxPaqs'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:90vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-package"></i> Combos / paquetes</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxPaqs\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:11.5px;color:#64748b;margin-bottom:8px">Boleto suelto: <b>' + fmt(pb) + '</b>. Los paquetes aparecen en la página pública de esta rifa.</div>' +
      '<button class="btn bsm bc1" type="button" style="margin-bottom:10px" onclick="window.nxPaqForm(\'\')"><i class="ti ti-plus"></i> Nuevo paquete</button>' +
      '<div style="overflow-y:auto;flex:1">' + lista + '</div></div>';
    document.body.appendChild(ov);
  };
  window.nxPaqForm = function (id) {
    var p = id ? (_paquetes.find(function (x) { return String(x.id) === String(id); }) || {}) : {};
    cerrarModal('nxPaqForm');
    var ov = document.createElement('div'); ov.id = 'nxPaqForm'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:380px"><div class="mt"><span><i class="ti ti-package"></i> ' + (id ? 'Editar paquete' : 'Nuevo paquete') + '</span><button class="nxBack" type="button" onclick="document.getElementById(\'nxPaqForm\').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>' +
      '<div class="fr-row"><div class="fr"><label>Cantidad de boletos</label><input id="pqCant" inputmode="numeric" value="' + esc(p.cantidad != null ? p.cantidad : '') + '" placeholder="5"></div>' +
      '<div class="fr"><label>Precio del combo (RD$)</label><input id="pqPrecio" inputmode="numeric" value="' + esc(p.precio != null ? p.precio : '') + '" placeholder="400"></div></div>' +
      '<div class="fr"><label>Etiqueta (opcional)</label><input id="pqEtiq" class="no-upper" value="' + esc(p.etiqueta || '') + '" placeholder="Ej: Combo familiar"></div>' +
      '<div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxPaqForm\').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxPaqGuardar(\'' + (id || '') + '\')"><i class="ti ti-check"></i> Guardar</button></div></div>';
    document.body.appendChild(ov);
  };
  window.nxPaqGuardar = async function (id) {
    var r = currentRifa(); if (!r) return;
    var cant = parseInt(String(val('pqCant') || '').replace(/[^0-9]/g, ''), 10) || 0;
    var precio = Number(String(val('pqPrecio') || '').replace(/[^0-9.]/g, '')) || 0;
    if (cant < 1) { toast('err', 'Pon la cantidad de boletos'); return; }
    if (precio <= 0) { toast('err', 'Pon el precio del combo'); return; }
    var body = { cantidad: cant, precio: precio, etiqueta: (val('pqEtiq') || '').trim() || null };
    if (!id) body.rifa_id = r.id;
    try {
      if (id) await getAPI().patch('rifa_paquetes', 'id=eq.' + id, body);
      else await getAPI().post('rifa_paquetes', body);
      toast('ok', 'Paquete guardado', '');
      cerrarModal('nxPaqForm');
      await recargarPaq();
      window.nxRifaPaquetes();
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxPaqEliminar = async function (id) {
    if (!confirm('¿Eliminar este paquete?')) return;
    try { await getAPI().del('rifa_paquetes', 'id=eq.' + id); await recargarPaq(); toast('ok', 'Paquete eliminado', ''); window.nxRifaPaquetes(); }
    catch (e) { toast('err', 'No se pudo'); }
  };
  window.nxRifaPorCuenta = function () {
    var r = currentRifa(); if (!r) return;
    cerrarModal('nxPorCta');
    var tot = {}, sinCta = 0, totalGen = 0;
    _boletos.forEach(function (b) {
      if (b.estado !== 'confirmado') return;
      var p = Number(b.precio || 0); totalGen += p;
      if (b.cuenta_id) { tot[b.cuenta_id] = (tot[b.cuenta_id] || 0) + p; } else { sinCta += p; }
    });
    var rows = _cuentas.map(function (c) {
      return '<div class="ctaRow"><div class="ctaL"><i class="ti ' + ctaIcon(c.tipo) + '"></i><div style="min-width:0"><b>' + esc(c.banco || '') + '</b><span>' + esc(c.numero_cuenta || '') + '</span></div></div><b style="color:#16a34a">' + fmt(tot[c.id] || 0) + '</b></div>';
    }).join('');
    if (sinCta > 0) rows += '<div class="ctaRow"><div class="ctaL"><i class="ti ti-cash"></i><div><b>Sin cuenta asignada</b><span>efectivo u otros</span></div></div><b style="color:#475569">' + fmt(sinCta) + '</b></div>';
    if (!rows) rows = '<div style="text-align:center;color:#475569;font-size:12px;padding:16px">Aún no hay cobros confirmados.</div>';
    var ov = document.createElement('div'); ov.id = 'nxPorCta'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:400px;max-height:90vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-building-bank"></i> Recaudado por cuenta</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxPorCta\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:11.5px;color:#475569;margin-bottom:8px">' + esc(r.nombre || '') + ' · solo pagos confirmados</div>' +
      '<div style="overflow-y:auto;flex:1">' + rows + '</div>' +
      '<div style="border-top:1px dashed #e2e8f0;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:800;font-size:13px"><span>Total confirmado</span><span style="color:#16a34a">' + fmt(totalGen) + '</span></div></div>';
    document.body.appendChild(ov);
  };

  // ── VENDEDORES + LIQUIDACIÓN ──
  function nombreVend(id) { var v = _vendedores.find(function (x) { return String(x.id) === String(id); }); return v ? v.nombre : ''; }
  // Vendedores (empleados) de la rifa abierta — cada rifa tiene su propio equipo
  function vendsRifa() { return _vendedores.filter(function (v) { return String(v.rifa_id || '') === String(_rifaSel || ''); }); }
  async function recargarVend() { try { _vendedores = await getAPI().get('rifa_vendedores', 'select=*&order=nombre.asc') || []; } catch (e) {} }
  window.nxRifaVendedores = function () {
    cerrarModal('nxVends');
    var r = currentRifa();
    var vs = vendsRifa();
    var lista = vs.length ? vs.map(function (v) {
      var cod = (v.codigo || '').toUpperCase();
      return '<div class="ctaRow"><div class="ctaL"><i class="ti ti-user"></i><div style="min-width:0"><b>' + esc(v.nombre || '') + '</b><span>' + (v.telefono ? esc(v.telefono) + ' · ' : '') + 'comisión ' + Number(v.comision_pct || 0) + '%</span>' + (cod ? '<span style="display:block;margin-top:3px"><i class="ti ti-key" style="font-size:12px"></i> Código: <b style="font-family:var(--mono);letter-spacing:1px;color:#4f46e5">' + esc(cod) + '</b></span>' : '') + '</div></div><div style="display:flex;gap:4px">' + (cod ? '<button class="btn bsm bghost" type="button" title="Compartir acceso" onclick="window.nxVendLink(\'' + v.id + '\')" aria-label="Compartir acceso"><i class="ti ti-share" style="color:#16a34a"></i></button>' : '') + '<button aria-label="Editar este vendedor" class="btn bsm bghost" type="button" onclick="window.nxVendForm(\'' + v.id + '\')"><i class="ti ti-edit"></i></button><button aria-label="Eliminar este vendedor" class="btn bsm bghost" type="button" onclick="window.nxVendEliminar(\'' + v.id + '\')"><i class="ti ti-minus" style="color:#dc2626"></i></button></div></div>';
    }).join('') : '<div style="text-align:center;color:#475569;font-size:12px;padding:18px">Sin vendedores. Agrega a tu equipo para asignar ventas y calcular comisiones.</div>';
    var ov = document.createElement('div'); ov.id = 'nxVends'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:90vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-users"></i> Vendedores</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxVends\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:12px;color:#475569;font-weight:700;margin:-2px 0 9px;display:flex;align-items:center;gap:5px"><i class="ti ti-ticket" style="color:#4f46e5"></i> ' + esc((r && r.nombre) || 'Rifa') + '</div>' +
      '<button class="btn bsm bc1" type="button" style="margin-bottom:10px" onclick="window.nxVendForm(\'\')"><i class="ti ti-plus"></i> Nuevo vendedor</button>' +
      '<div style="overflow-y:auto;flex:1">' + lista + '</div></div>';
    document.body.appendChild(ov);
  };
  window.nxVendForm = function (id) {
    var v = id ? (_vendedores.find(function (x) { return String(x.id) === String(id); }) || {}) : {};
    cerrarModal('nxVendForm');
    var ov = document.createElement('div'); ov.id = 'nxVendForm'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:380px"><div class="mt"><span><i class="ti ti-user"></i> ' + (id ? 'Editar vendedor' : 'Nuevo vendedor') + '</span><button class="nxBack" type="button" onclick="document.getElementById(\'nxVendForm\').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>' +
      '<div class="fr"><label>Nombre *</label><input id="vdNom" class="no-upper" value="' + esc(v.nombre || '') + '" placeholder="Nombre del vendedor"></div>' +
      '<div class="fr"><label>Teléfono / WhatsApp</label><input id="vdTel" inputmode="tel" value="' + esc(v.telefono || '') + '" placeholder="809-000-0000"></div>' +
      '<div class="fr"><label>Comisión (%)</label><input id="vdCom" inputmode="decimal" value="' + (v.comision_pct != null ? Number(v.comision_pct) : '') + '" placeholder="0"></div>' +
      '<div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById(\'nxVendForm\').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxVendGuardar(\'' + (id || '') + '\')"><i class="ti ti-check"></i> Guardar</button></div></div>';
    document.body.appendChild(ov);
  };
  window.nxVendGuardar = async function (id) {
    var nom = (val('vdNom') || '').trim();
    if (!nom) { toast('err', 'Falta el nombre'); return; }
    var body = { nombre: nom, telefono: (val('vdTel') || '').trim() || null, comision_pct: Number(String(val('vdCom') || '0').replace(/[^0-9.]/g, '')) || 0 };
    try {
      if (id) await getAPI().patch('rifa_vendedores', 'id=eq.' + id, body);
      else { body.rifa_id = _rifaSel || null; await getAPI().post('rifa_vendedores', body); }
      toast('ok', 'Vendedor guardado', '');
      cerrarModal('nxVendForm');
      await recargarVend();
      window.nxRifaVendedores();
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxVendLink = function (id) {
    var v = _vendedores.find(function (x) { return String(x.id) === String(id); }); if (!v || !v.codigo) { toast('err', 'Sin código'); return; }
    var cod = String(v.codigo).toUpperCase();
    var url = location.origin + '/vendedor.html?c=' + cod;
    var txt = 'Hola ' + (v.nombre || '') + ', este es tu acceso de vendedor para las rifas.\n\nEntra aquí: ' + url + '\nTu código: ' + cod;
    if (navigator.share) { navigator.share({ title: 'Acceso de vendedor', text: txt }).catch(function () {}); }
    else if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { toast('ok', 'Enlace copiado', cod); }, function () { toast('ok', 'Código ' + cod, url); }); }
    else { toast('ok', 'Código ' + cod, url); }
  };
  window.nxVendEliminar = async function (id) {
    if (!confirm('¿Eliminar este vendedor?')) return;
    try { await getAPI().del('rifa_vendedores', 'id=eq.' + id); await recargarVend(); toast('ok', 'Vendedor eliminado', ''); window.nxRifaVendedores(); }
    catch (e) { toast('err', 'No se pudo'); }
  };
  window.nxRifaLiquidacion = function () {
    var r = currentRifa(); if (!r) return;
    cerrarModal('nxLiq');
    var byV = {};
    _boletos.forEach(function (b) {
      if (b.estado !== 'confirmado') return;
      var key = b.vendedor_id ? ('id:' + b.vendedor_id) : ('nom:' + (b.vendedor_nombre || '(sin vendedor)'));
      var o = byV[key] || (byV[key] = { nombre: '', n: 0, monto: 0, vid: b.vendedor_id || null });
      o.n++; o.monto += Number(b.precio || 0);
      if (!o.nombre) o.nombre = (b.vendedor_id ? nombreVend(b.vendedor_id) : '') || b.vendedor_nombre || '(sin vendedor)';
    });
    var rows = Object.keys(byV).map(function (k) {
      var o = byV[k];
      var pct = o.vid ? Number((_vendedores.find(function (x) { return String(x.id) === String(o.vid); }) || {}).comision_pct || 0) : 0;
      var com = Math.round(o.monto * pct / 100);
      var entregar = o.monto - com;
      return '<div class="liqRow"><div class="liqTop"><b>' + esc(o.nombre) + '</b><span>' + o.n + ' boletos · ' + fmt(o.monto) + '</span></div><div class="liqBot"><span>Comisión ' + pct + '%: <b style="color:#7c3aed">' + fmt(com) + '</b></span><span>A entregar: <b style="color:#16a34a">' + fmt(entregar) + '</b></span></div></div>';
    }).join('');
    if (!rows) rows = '<div style="text-align:center;color:#475569;font-size:12px;padding:16px">Aún no hay ventas confirmadas con vendedor.</div>';
    var ov = document.createElement('div'); ov.id = 'nxLiq'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:90vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-users"></i> Liquidación de vendedores</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxLiq\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:11.5px;color:#475569;margin-bottom:8px">' + esc(r.nombre || '') + ' · solo pagos confirmados</div>' +
      '<div style="overflow-y:auto;flex:1">' + rows + '</div></div>';
    document.body.appendChild(ov);
  };

  // ── MAYOR COMPRADOR (ranking) ──
  window.nxRifaMayorComprador = function () {
    var r = currentRifa(); if (!r) return;
    cerrarModal('nxMayor');
    var byC = {};
    _boletos.forEach(function (b) {
      if (b.estado === 'anulado') return;
      var tel = String(b.comprador_telefono || '').replace(/\D/g, '');
      var key = tel || ('nom:' + (b.comprador_nombre || '?'));
      var o = byC[key] || (byC[key] = { nombre: '', tel: '', n: 0, monto: 0 });
      o.n++; o.monto += Number(b.precio || 0);
      if (!o.nombre) o.nombre = b.comprador_nombre || '?';
      if (!o.tel && b.comprador_telefono) o.tel = b.comprador_telefono;
    });
    var arr = Object.keys(byC).map(function (k) { return byC[k]; }).sort(function (a, b) { return b.n - a.n || b.monto - a.monto; });
    var rows = arr.slice(0, 40).map(function (o, i) {
      var medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1) + '.'));
      return '<div class="liqRow"><div class="liqTop"><b>' + medal + ' ' + esc(o.nombre) + '</b><span>' + o.n + ' boleto' + (o.n === 1 ? '' : 's') + '</span></div><div class="liqBot"><span>' + (o.tel ? esc(o.tel) : '') + '</span><span style="color:#16a34a;font-weight:700">' + fmt(o.monto) + '</span></div></div>';
    }).join('');
    if (!rows) rows = '<div style="text-align:center;color:#475569;font-size:12px;padding:16px">Aún no hay compras registradas.</div>';
    var ov = document.createElement('div'); ov.id = 'nxMayor'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:420px;max-height:90vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-crown"></i> Mayor comprador</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxMayor\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="font-size:11.5px;color:#475569;margin-bottom:8px">' + esc(r.nombre || '') + ' · quién más boletos ha comprado</div>' +
      '<div style="overflow-y:auto;flex:1">' + rows + '</div></div>';
    document.body.appendChild(ov);
  };

  // ── REPORTES (menú) ──
  window.nxRifaReportes = function () {
    cerrarModal('nxReps');
    function item(fn, ic, lbl, col) { return '<button class="repItem" type="button" onclick="document.getElementById(\'nxReps\').remove();window.' + fn + '()"><span class="repIco" style="background:' + col + '22;color:' + col + '"><i class="ti ' + ic + '"></i></span><span>' + lbl + '</span><i class="ti ti-chevron-right" style="margin-left:auto;color:#cbd5e1"></i></button>'; }
    var ov = document.createElement('div'); ov.id = 'nxReps'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:380px"><div class="mt"><span><i class="ti ti-chart-bar"></i> Reportes</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxReps\').remove()"><i class="ti ti-x"></i></button></div>' +
      item('nxRifaTickets', 'ti-list-details', 'Lista de tickets', '#4f46e5') +
      item('nxRifaStats', 'ti-chart-histogram', 'Estadísticas', '#0891b2') +
      item('nxRifaPorCuenta', 'ti-building-bank', 'Recaudado por cuenta', '#16a34a') +
      item('nxRifaLiquidacion', 'ti-users', 'Liquidación de vendedores', '#7c3aed') +
      item('nxRifaMayorComprador', 'ti-crown', 'Mayor comprador', '#d97706') +
      '</div>';
    document.body.appendChild(ov);
  };

  // ── LISTA DE TICKETS ──
  function tkEstInfo(b) {
    if (b.estado === 'confirmado') return ['Verificado', '#16a34a'];
    if (b.estado === 'anulado') return ['Anulado', '#94a3b8'];
    if (b.estado === 'apartado') return ['Apartado', '#64748b'];
    return ['Pendiente', '#d97706'];
  }
  function fechaTk(d) { if (!d) return ''; try { var x = new Date(d); return x.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + x.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return String(d).slice(0, 10); } }
  function pagoTk(b) { var c = b.cuenta_id ? (_cuentas.find(function (x) { return String(x.id) === String(b.cuenta_id); }) || {}).banco : ''; return c || b.metodo_pago || '—'; }
  var _tkEst = '';
  function tkRowsHTML(q) {
    var ql = (q || '').trim().toLowerCase();
    var list = _boletos.filter(function (b) {
      if (_tkEst && b.estado !== _tkEst) return false;
      if (!ql) return true;
      return (String(b.numero) + ' ' + (b.comprador_nombre || '') + ' ' + (b.comprador_telefono || '')).toLowerCase().indexOf(ql) >= 0;
    });
    if (!list.length) return '<tr><td colspan="7" style="text-align:center;color:#475569;padding:18px;font-size:12px">Sin tickets con ese filtro.</td></tr>';
    return list.map(function (b) {
      var e = tkEstInfo(b);
      return '<tr onclick="window.nxTkOpen(\'' + b.id + '\')" style="cursor:pointer" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}"><td class="tkNumC">' + esc(String(b.numero)) + '</td>' +
        '<td><b>' + esc(b.comprador_nombre || '—') + '</b><div class="tkSub">' + esc(b.comprador_telefono || '') + (b.vendedor_nombre ? ' · ' + esc(b.vendedor_nombre) : '') + '</div></td>' +
        '<td class="tkNw">' + esc(fechaTk(b.created_at)) + '</td>' +
        '<td>' + esc(pagoTk(b)) + '</td>' +
        '<td class="tkR2">' + fmt(b.precio) + '</td>' +
        '<td><span class="tkBadge" style="color:' + e[1] + ';background:' + e[1] + '1a">' + e[0] + '</span></td>' +
        '<td class="tkNw">' + (b.origen === 'online' ? 'online' : 'offline') + '</td></tr>';
    }).join('');
  }
  window.nxTkBuscar = function (v) { var b = document.getElementById('tkBody'); if (b) b.innerHTML = tkRowsHTML(v); };
  window.nxTkOpen = function (id) { var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (b) gestBoleto(b); };
  window.nxRifaTickets = function (estado, titulo) {
    var r = currentRifa(); if (!r) return;
    _tkEst = (['confirmado', 'por_confirmar', 'apartado', 'anulado'].indexOf(estado) >= 0) ? estado : '';
    var ttl = (typeof titulo === 'string' && titulo) ? titulo : 'Control de boletos';
    var n = _tkEst ? _boletos.filter(function (b) { return b.estado === _tkEst; }).length : _boletos.length;
    cerrarModal('nxTks');
    var ov = document.createElement('div'); ov.id = 'nxTks'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:560px;max-height:92vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-list-details"></i> ' + esc(ttl) + ' (' + n + ')</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxTks\').remove()"><i class="ti ti-x"></i></button></div>' +
      (_tkEst === 'por_confirmar' && n ? '<div style="font-size:11px;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:7px 10px;margin-bottom:9px">Toca un boleto para ver el voucher y <b>Confirmar</b> el pago.</div>' : '') +
      '<div style="margin-bottom:9px">' + rfBuscador({ id: 'tkQ', placeholder: 'Buscar número, comprador o teléfono…', oninput: 'window.nxTkBuscar(this.value)' }) + '</div>' +
      '<div class="tw" style="overflow:auto;flex:1"><table class="tkTbl"><thead><tr><th>No.</th><th>Participante</th><th>Fecha</th><th>Pago</th><th>Monto</th><th>Estado</th><th>Modo</th></tr></thead><tbody id="tkBody">' + tkRowsHTML('') + '</tbody></table></div></div>';
    document.body.appendChild(ov);
  };

  // ── ESTADÍSTICAS (gráficas) ──
  window.nxRifaStats = function () {
    var r = currentRifa(); if (!r) return;
    cerrarModal('nxStats');
    var act = _boletos.filter(function (b) { return b.estado !== 'anulado'; });
    var tickets = act.length;
    var comp = {}; act.forEach(function (b) { var k = String(b.comprador_telefono || '').replace(/\D/g, '') || ('n:' + (b.comprador_nombre || '?')); comp[k] = 1; });
    var nComp = Object.keys(comp).length;
    var recaudado = act.reduce(function (s, b) { return s + (b.estado === 'confirmado' ? Number(b.precio || 0) : 0); }, 0);
    var conf = act.filter(function (b) { return b.estado === 'confirmado'; }).length;
    var pend = act.filter(function (b) { return b.estado === 'por_confirmar'; }).length;
    var apar = act.filter(function (b) { return b.estado === 'apartado'; }).length;
    // Medios de pago (sobre lo confirmado)
    function ctaName(cid) { var c = _cuentas.filter(function (x) { return String(x.id) === String(cid); })[0]; return c ? (c.banco || ({ banco: 'Banco', tarjeta: 'Tarjeta', movil: 'Pago móvil' }[c.tipo]) || 'Cuenta') : 'Cuenta'; }
    function capMed(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    var medios = {};
    act.forEach(function (b) { if (b.estado !== 'confirmado') return; var k = b.metodo_pago ? capMed(b.metodo_pago) : (b.cuenta_id ? ctaName(b.cuenta_id) : 'Sin especificar'); medios[k] = (medios[k] || 0) + Number(b.precio || 0); });
    var PIEPAL = ['#4f46e5', '#16a34a', '#f59e0b', '#0891b2', '#db2777', '#7c3aed', '#64748b', '#ea580c'];
    var segs = Object.keys(medios).map(function (k) { return { k: k, v: medios[k] }; }).sort(function (a, b) { return b.v - a.v; });
    var pieHTML = '';
    if (recaudado > 0 && segs.length) {
      var accD = 0; var stops = segs.map(function (s, i) { var a = accD, b2 = accD + s.v / recaudado * 360; accD = b2; s.c = PIEPAL[i % PIEPAL.length]; return s.c + ' ' + a + 'deg ' + b2 + 'deg'; }).join(',');
      var legend = segs.map(function (s) { var p = Math.round(s.v / recaudado * 100); return '<div class="pieRow"><span class="pieDot" style="background:' + s.c + '"></span><span class="pieK">' + esc(s.k) + '</span><b>' + fmt(s.v) + '</b><span class="piePct">' + p + '%</span></div>'; }).join('');
      pieHTML = '<div class="stT" style="margin-top:16px">Medios de pago (confirmados)</div><div class="pie" style="background:conic-gradient(' + stops + ')"></div><div class="pieLeg">' + legend + '</div>';
    }
    var dias = {}; act.forEach(function (b) { var d = String(b.created_at || '').slice(0, 10); if (d) dias[d] = (dias[d] || 0) + 1; });
    var keys = Object.keys(dias).sort().slice(-14);
    var maxV = Math.max.apply(null, keys.map(function (k) { return dias[k]; }).concat([1]));
    var bars = keys.length ? keys.map(function (k) { var h = Math.max(4, Math.round(dias[k] / maxV * 100)); return '<div class="stCol"><div class="stBarWrap"><div class="stBar" style="height:' + h + '%" title="' + dias[k] + '"></div></div><div class="stLbl">' + k.slice(8) + '/' + k.slice(5, 7) + '</div></div>'; }).join('') : '<div style="color:#94a3b8;font-size:12px;padding:14px;text-align:center;width:100%">Sin ventas aún</div>';
    function stRow(lbl, n, col) { var p = tickets ? Math.round(n / tickets * 100) : 0; return '<div class="stStat"><div class="stStatTop"><span>' + lbl + '</span><b>' + n + ' (' + p + '%)</b></div><div class="stStatBar"><div style="width:' + p + '%;background:' + col + '"></div></div></div>'; }
    var ov = document.createElement('div'); ov.id = 'nxStats'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:440px;max-height:92vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-chart-histogram"></i> Estadísticas</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxStats\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="overflow-y:auto;flex:1">' +
      '<div class="rfKpis" style="margin-bottom:14px"><div class="rfKpi"><span>Compradores</span><b>' + nComp + '</b></div><div class="rfKpi"><span>Tickets</span><b>' + tickets + '</b></div><div class="rfKpi"><span>Recaudado</span><b style="color:#16a34a">' + fmt(recaudado) + '</b></div></div>' +
      '<div class="stT">Ventas por día (últimos 14)</div><div class="stChart">' + bars + '</div>' +
      '<div class="stT" style="margin-top:16px">Estado de los tickets</div>' + stRow('Confirmados', conf, '#16a34a') + stRow('Por confirmar', pend, '#d97706') + stRow('Apartados', apar, '#64748b') +
      pieHTML +
      '</div></div>';
    document.body.appendChild(ov);
  };

  // ── BOLETO-TARJETA (ver / imagen PNG / imprimir / WhatsApp) ──
  var _bolActual = null;
  var BOL_CSS = '.rfBol{max-width:300px;margin:0 auto;border-radius:16px;overflow:hidden;background:var(--bc,#1f4b63);box-shadow:0 10px 26px rgba(15,23,42,.25)}.rfBolHd{background:#fff;color:#0f172a;text-align:center;font-weight:800;font-size:14px;padding:11px 10px;letter-spacing:.3px}.rfBolBody{padding:12px 14px;color:#eaf2f7}.rfBolBanner{border-radius:10px;overflow:hidden;margin-bottom:10px}.rfBolBanner img{width:100%;display:block}.rfBolPrem{font-weight:800;font-size:14px;color:#fff;margin-bottom:9px;line-height:1.2}.rfBolEst{font-weight:800;font-size:13px;margin-bottom:9px}.rfBolEst.ok{color:#34d399}.rfBolEst.pend{color:#fbbf24}.rfBolEst.anu{color:#f87171}.rfBolLn{font-size:12.5px;margin:4px 0;color:#dbe9f1}.rfBolLn b{color:#fff;font-weight:700}.rfBolFecha{text-align:center;font-weight:800;font-size:13px;color:#cfe3ee;padding:9px;border-top:1px dashed rgba(255,255,255,.35)}.rfBolNum{background:#fff;color:#0f172a;text-align:center;margin:0 14px 14px;border-radius:10px;padding:11px;font-size:30px;font-weight:800;letter-spacing:4px;font-family:var(--mono);border:2px dashed #94a3b8}.rfBolQR{display:flex;align-items:center;gap:11px;margin:0 14px 14px;padding:10px;border-radius:10px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.22)}.rfBolQR img{width:84px;height:84px;display:block;border-radius:6px;background:#fff;padding:5px;flex-shrink:0}.rfBolQRt{font-size:11.5px;color:#dbe9f1;line-height:1.45;min-width:0}.rfBolQRt b{display:block;color:#fff;font-weight:800;font-size:13px;letter-spacing:1.2px;font-family:var(--mono);margin-top:3px;word-break:break-all}';
  function empNomRf() { try { return (window.CFG && (CFG.empNom || CFG.empresa_nom)) || 'Mi negocio'; } catch (e) { return 'Mi negocio'; } }
  // ── QR de verificacion del boleto (anti-falsificacion) ────────────────────
  // El QR lleva a la pagina publica del boleto (boleto.html?id=...), que lee el
  // registro REAL del servidor. Un boleto inventado (con IA o a mano) no existe
  // en la base: al escanearlo, la pagina dice que no se encontro. Y si le copian
  // el QR a un boleto real, sale el nombre y el numero del comprador REAL, no el
  // del falsificador. La seguridad no la da el dibujo del QR: la da el servidor.
  // La libreria se baja SOLO la primera vez que se abre un boleto (no la carga
  // quien nunca entra a Rifas).
  var _qrLibCola = null;
  function qrEnsureLib(cb) {
    if (typeof window.QRCode === 'function') { cb(true); return; }
    if (_qrLibCola) { _qrLibCola.push(cb); return; }
    _qrLibCola = [cb];
    var s = document.createElement('script');
    s.src = 'qrcode.js?v=' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '1');
    var fin = function (ok) { var q = _qrLibCola || []; _qrLibCola = null; q.forEach(function (f) { try { f(ok); } catch (e) {} }); };
    s.onload = function () { fin(typeof window.QRCode === 'function'); };
    s.onerror = function () { fin(false); };
    document.head.appendChild(s);
  }
  function qrDataURL(texto, size, cb) {
    qrEnsureLib(function (ok) {
      if (!ok) { cb(''); return; }
      var box = null;
      try {
        box = document.createElement('div');
        box.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden';
        document.body.appendChild(box);
        new window.QRCode(box, { text: texto, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.M });
        var cv = box.querySelector('canvas');
        cb(cv ? cv.toDataURL('image/png') : '');
      } catch (e) { cb(''); }
      finally { if (box && box.parentNode) box.parentNode.removeChild(box); }
    });
  }
  // Codigo corto derivado del id del boleto. NO se guarda en la base: se calcula
  // igual aqui y en boleto.html, asi el que recibe el boleto puede comparar a
  // simple vista que el codigo impreso es el mismo que muestra la pagina.
  function bolCodigo(id) {
    var h = String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
    return h.length === 8 ? h.slice(0, 4) + '-' + h.slice(4) : h;
  }
  function bolData(b, r) {
    var ses = curSes(); var org = (ses && ses.org) || {};
    var fcompra = ''; try { fcompra = new Date(b.created_at).toLocaleString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
    var fsorteo = ''; if (r.mostrar_fecha !== false && r.fecha_sorteo) { try { fsorteo = new Date(r.fecha_sorteo).toLocaleString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) {} }
    return { id: b.id, biz: org.nombre || empNomRf(), premio: r.premio || r.nombre || '', banner: r.imagen || '', conf: b.estado === 'confirmado', anulado: b.estado === 'anulado', comprador: b.comprador_nombre || '', tel: b.comprador_telefono || '', fcompra: fcompra, fsorteo: fsorteo, numero: String(b.numero), color: org.color || '#1f4b63', codigo: bolCodigo(b.id), qr: '' };
  }
  function bolTexto(b, r) {
    var prem = (r && (r.premio || r.nombre)) || 'la rifa';
    var est = b.estado === 'confirmado' ? 'Pago verificado' : (b.estado === 'apartado' ? 'Apartado' : 'Por confirmar');
    return 'Hola ' + (b.comprador_nombre || '') + ' 👋, tu boleto de ' + prem + ' es el número ' + b.numero + '. Estado: ' + est + '. ¡Mucha suerte!';
  }
  // Enlace de WhatsApp DIRECTO al número del cliente, con el texto + enlace de su boleto.
  function boletoWaHref(b, r) {
    var wa = String(b.comprador_telefono || '').replace(/\D/g, ''); if (wa.length === 10) wa = '1' + wa;
    return 'https://wa.me/' + wa + '?text=' + encodeURIComponent(bolTexto(b, r) + '\n\nMira tu boleto aquí: ' + BOL_PAGE + '?id=' + b.id);
  }
  function bolCardHTML(d) {
    return '<div class="rfBol" style="--bc:' + esc(d.color) + '">' +
      '<div class="rfBolHd">' + esc(d.biz) + '</div>' +
      '<div class="rfBolBody">' +
      (d.banner ? '<div class="rfBolBanner"><img src="' + esc(d.banner) + '" alt="Imagen de la rifa"></div>' : '') +
      (d.premio ? '<div class="rfBolPrem">' + esc(d.premio.toUpperCase()) + '</div>' : '') +
      '<div class="rfBolEst ' + (d.anulado ? 'anu' : (d.conf ? 'ok' : 'pend')) + '">' + (d.anulado ? '✕ ANULADO — no válido' : (d.conf ? '✓ Pago Verificado' : '• Por confirmar')) + '</div>' +
      '<div class="rfBolLn"><b>Comprador:</b> ' + esc(d.comprador || '—') + '</div>' +
      (d.tel ? '<div class="rfBolLn"><b>WhatsApp:</b> ' + esc(d.tel) + '</div>' : '') +
      '<div class="rfBolLn"><b>Compra:</b> ' + esc(d.fcompra) + '</div>' +
      '</div>' +
      (d.fsorteo ? '<div class="rfBolFecha">' + esc(d.fsorteo) + '</div>' : '') +
      '<div class="rfBolNum">' + esc(d.numero) + '</div>' +
      (d.qr ? '<div class="rfBolQR"><img src="' + d.qr + '" alt="Código QR para verificar este boleto"><div class="rfBolQRt">Escanea este código para verificar el boleto en el sistema.<b>' + esc(d.codigo) + '</b></div></div>' : '') +
      '</div>';
  }
  window.nxRifaBoleto = function (id) {
    var b = _boletos.find(function (x) { return String(x.id) === String(id); }); if (!b) return;
    var r = currentRifa() || _rifas.find(function (x) { return String(x.id) === String(b.rifa_id); }); if (!r) return;
    _bolActual = bolData(b, r); _bolTexto = bolTexto(b, r);
    // El QR se arma ANTES de pintar la tarjeta: asi la misma imagen sirve para
    // el modal, la impresion y el PNG de WhatsApp, sin recalcularla 3 veces.
    // Si la libreria no carga, d.qr queda vacio y el boleto sale como siempre.
    qrDataURL(BOL_PAGE + '?id=' + b.id, 296, function (du) {
      _bolActual.qr = du || '';
      nxBolAbrirModal(b, r);
    });
  };
  function nxBolAbrirModal(b, r) {
    var waHref = boletoWaHref(b, r);
    cerrarModal('nxBolView');
    var ov = document.createElement('div'); ov.id = 'nxBolView'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:340px;max-height:94vh;display:flex;flex-direction:column">' +
      '<div class="mt"><span><i class="ti ti-ticket"></i> Boleto</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxBolView\').remove()"><i class="ti ti-x"></i></button></div>' +
      '<div style="overflow-y:auto;flex:1;padding:4px 2px 8px">' + bolCardHTML(_bolActual) + '</div>' +
      '<div class="fe" style="gap:7px;flex-wrap:wrap;margin-top:8px"><button class="btn bsm bghost" type="button" onclick="window.nxRifaBoletoImprimir()"><i class="ti ti-printer"></i> Imprimir</button><button class="btn bsm bghost" type="button" onclick="window.nxBolDescargar()"><i class="ti ti-download"></i> Guardar</button><a class="btn bsm bc1" href="' + waHref + '" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> Enviar</a></div>' +
      '</div>';
    document.body.appendChild(ov);
    prepararBolFile();
  }
  window.nxRifaBoletoImprimir = function () {
    var d = _bolActual; if (!d) return;
    var w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes para imprimir'); return; }
    w.document.write('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boleto ' + esc(d.numero) + '</title><style>body{font-family:Segoe UI,system-ui,-apple-system,sans-serif;background:#eef1f6;margin:0;padding:18px}' + BOL_CSS + '@media print{body{background:#fff}.np{display:none}}</style></head><body>' + bolCardHTML(d) + '<div class="np" style="text-align:center;margin-top:16px"><button onclick="window.print()" style="padding:11px 18px;background:#4f46e5;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer">Imprimir / Guardar PDF</button></div></body></html>');
    w.document.close();
  };
  function bolRR(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function bolWrap(ctx, text, maxW) { var words = String(text).split(' '), lines = [], cur = ''; for (var i = 0; i < words.length; i++) { var t = cur ? cur + ' ' + words[i] : words[i]; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = t; } if (cur) lines.push(cur); return lines; }
  function bolFit(ctx, text, x, y, maxW) { var fs = 26; ctx.font = '800 ' + fs + 'px Arial'; while (ctx.measureText(text).width > maxW && fs > 12) { fs -= 1; ctx.font = '800 ' + fs + 'px Arial'; } ctx.fillText(text, x, y); }
  function bolCover(ctx, img, x, y, w, h) { var ir = img.width / img.height, tr = w / h, sw, sh, sx, sy; if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2; sy = 0; } else { sw = img.width; sh = sw / tr; sx = 0; sy = (img.height - sh) / 2; } ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h); }
  function bolCanvas(d, cb) {
    var qrImg = null;
    var build = function (banner) {
      try {
        var W = 560, m = 18;
        var tmp = document.createElement('canvas').getContext('2d'); tmp.font = '800 24px Arial';
        var pLines = d.premio ? bolWrap(tmp, d.premio.toUpperCase(), W - 2 * m - 44) : [];
        var H = m + 16 + 64 + 24 + pLines.length * 30 + (d.premio ? 10 : 0) + (banner ? 206 : 0) + 36 + 30 + (d.tel ? 30 : 0) + 14 + (d.fsorteo ? 38 : 0) + 22 + 20 + 72 + (d.qr ? 118 : 0) + 18 + m;
        var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        var col = d.color || '#1f4b63';
        bolRR(ctx, m, m, W - 2 * m, H - 2 * m, 24); ctx.fillStyle = col; ctx.fill();
        bolRR(ctx, m + 16, m + 16, W - 2 * m - 32, 64, 14); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a'; bolFit(ctx, (d.biz || '').toUpperCase(), W / 2, m + 16 + 32, W - 2 * m - 60);
        var y = m + 16 + 64 + 24;
        if (d.premio) { ctx.fillStyle = '#fff'; ctx.font = '800 24px Arial'; pLines.forEach(function (ln) { ctx.fillText(ln, W / 2, y); y += 30; }); y += 10; }
        if (banner) { var bw = W - 2 * m - 32, bh = 190, bx = m + 16; bolRR(ctx, bx, y, bw, bh, 12); ctx.save(); ctx.clip(); bolCover(ctx, banner, bx, y, bw, bh); ctx.restore(); y += bh + 16; }
        ctx.textAlign = 'left'; ctx.font = '800 20px Arial'; ctx.fillStyle = d.conf ? '#34d399' : '#fbbf24';
        ctx.fillText(d.conf ? '✓ Pago Verificado' : '• Por confirmar', m + 26, y); y += 36;
        ctx.fillStyle = '#e6eef3'; ctx.font = '600 19px Arial';
        ctx.fillText('Comprador: ' + (d.comprador || '—'), m + 26, y); y += 30;
        if (d.tel) { ctx.fillText('WhatsApp: ' + d.tel, m + 26, y); y += 30; }
        ctx.fillText('Compra: ' + d.fcompra, m + 26, y); y += 14;
        if (d.fsorteo) { y += 24; ctx.textAlign = 'center'; ctx.fillStyle = '#cfe3ee'; ctx.font = '800 21px Arial'; ctx.fillText(d.fsorteo, W / 2, y); y += 14; }
        y += 22;
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m + 26, y); ctx.lineTo(W - m - 26, y); ctx.stroke(); ctx.setLineDash([]);
        y += 20;
        var nbW = W - 2 * m - 52, nbx = m + 26, nbH = 72;
        bolRR(ctx, nbx, y, nbW, nbH, 12); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.font = '800 50px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d.numero, W / 2, y + nbH / 2);
        // Bloque de verificacion: QR + codigo corto. El QR se dibuja sobre una caja
        // BLANCA con margen (zona de silencio) — sin eso, un QR sobre el color oscuro
        // de la tarjeta no lo lee ningun telefono.
        if (d.qr && qrImg) {
          y += nbH + 16;
          var qs = 92, qpad = 7, qbx = nbx, qby = y;
          bolRR(ctx, qbx, qby, qs + qpad * 2, qs + qpad * 2, 10); ctx.fillStyle = '#fff'; ctx.fill();
          ctx.drawImage(qrImg, qbx + qpad, qby + qpad, qs, qs);
          var tx = qbx + qs + qpad * 2 + 16;
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#cfe3ee'; ctx.font = '600 16px Arial';
          bolWrap(ctx, 'Escanea este codigo para verificar el boleto.', W - m - 26 - tx).slice(0, 3)
            .forEach(function (ln, i) { ctx.fillText(ln, tx, qby + 24 + i * 21); });
          ctx.fillStyle = '#ffffff'; ctx.font = '800 21px monospace';
          ctx.fillText(d.codigo || '', tx, qby + 24 + 3 * 21 + 6);
        }
        // Componer con margen para que WhatsApp muestre el boleto COMPLETO (no lo recorta en la vista previa)
        var padV = 28;
        var outH = H + padV * 2;
        var outW = Math.max(W, Math.round(outH * 0.8));
        var out = document.createElement('canvas'); out.width = outW; out.height = outH;
        var octx = out.getContext('2d');
        octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, outW, outH);
        octx.drawImage(cv, Math.round((outW - W) / 2), padV);
        cb(out);
      } catch (e) { cb(null); }
    };
    // Primero el QR (es un dataURL local, carga al instante y nunca mancha el
    // canvas), despues el banner. Si alguno falla, el boleto se arma igual sin el.
    var seguir = function () {
      if (d.banner) { var im = new Image(); try { im.crossOrigin = 'anonymous'; } catch (e) {} im.onload = function () { build(im); }; im.onerror = function () { build(null); }; im.src = d.banner; }
      else build(null);
    };
    if (d.qr) { var qi = new Image(); qi.onload = function () { qrImg = qi; seguir(); }; qi.onerror = function () { qrImg = null; seguir(); }; qi.src = d.qr; }
    else seguir();
  }
  // Pre-genera la imagen al abrir el boleto, para que "Compartir" la envíe AL INSTANTE
  // (iOS exige que navigator.share corra dentro del toque; si se genera después, no envía nada).
  var _bolFile = null, _bolTexto = '';
  var BOL_URL = 'https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/boleto';
  var BOL_PAGE = location.origin + '/boleto.html';
  function prepararBolFile() {
    _bolFile = null;
    var d = _bolActual; if (!d) return;
    bolCanvas(d, function (cv) {
      if (!cv) return;
      try {
        cv.toBlob(function (blob) {
          if (!blob) return;
          try { _bolFile = new File([blob], 'boleto-' + d.numero + '.png', { type: 'image/png' }); } catch (e) { _bolFile = blob; }
          var bts = document.querySelectorAll('.bolShareBtnEl');
          for (var i = 0; i < bts.length; i++) { bts[i].disabled = false; bts[i].innerHTML = '<i class="ti ti-brand-whatsapp"></i> ' + (bts[i].getAttribute('data-lbl') || 'Compartir'); }
        }, 'image/png');
      } catch (e) {}
    });
  }
  window.nxBolShare = function () {
    var f = _bolFile;
    if (!f) { toast('info', 'Preparando imagen…', 'Espera un segundito e intenta de nuevo'); return; }
    var puede = false; try { puede = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [f] })); } catch (e) { puede = false; }
    if (puede) { navigator.share({ files: [f], text: _bolTexto || '', title: 'Boleto' }).catch(function () {}); }
    else { window.nxBolDescargar(); }
  };
  window.nxBolDescargar = function () {
    var f = _bolFile;
    if (!f) { toast('info', 'Preparando imagen…', 'Espera un segundito'); return; }
    try { var url = URL.createObjectURL(f); var a = document.createElement('a'); a.href = url; a.download = (f.name || 'boleto.png'); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1500); toast('ok', 'Imagen guardada', 'Adjúntala en WhatsApp'); } catch (e) { toast('err', 'No se pudo'); }
  };

  function inyectarCSS() {
    if (document.getElementById('nxRifasCSS')) return;
    var st = document.createElement('style'); st.id = 'nxRifasCSS';
    st.textContent = '.nxRfGrid{display:grid;grid-template-columns:1fr;gap:11px}@media(min-width:680px){.nxRfGrid{grid-template-columns:1fr 1fr}}.nxRfCard{background:#fff;border:1px solid #e8edf3;border-radius:15px;padding:14px;box-shadow:0 4px 14px rgba(15,23,42,.05)}.nxRfTop{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:9px}.nxRfNom{font-weight:800;font-size:14.5px;color:#0f172a;line-height:1.15}.nxRfSub{font-size:11.5px;color:#64748b;margin-top:2px}.nxRfEst{font-size:9px;font-weight:800;padding:3px 8px;border-radius:20px;white-space:nowrap;flex-shrink:0}.nxRfMeta{display:flex;flex-wrap:wrap;gap:9px;font-size:11px;color:#475569;font-weight:600;margin-bottom:9px}.nxRfMeta i{font-size:13px;color:#94a3b8}.nxRfBar{height:8px;background:#eef2f7;border-radius:5px;overflow:hidden;margin-bottom:11px}.nxRfBar>div{height:100%;background:linear-gradient(90deg,#6366f1,#4338ca);border-radius:5px}.nxRfAct{display:flex;gap:6px}.nxRfAct .bc1{flex:1}.nxRfK{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:4px}.nxRfKi{background:#f8fafc;border:1px solid #e8edf3;border-radius:12px;padding:11px}.nxRfKi span{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.3px}.nxRfKi b{display:block;font-size:18px;font-weight:800;color:#0f172a;margin-top:3px}.nxRfHid{font-size:10.5px;color:#94a3b8;font-weight:600;display:flex;align-items:center;gap:5px;margin-bottom:11px}.nxRfHid i{font-size:13px}.rfKpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.rfKpi{background:#f8fafc;border:1px solid #e8edf3;border-radius:11px;padding:8px 5px;text-align:center;position:relative}.rfKpi span{font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.2px}.rfKpi b{display:block;font-size:15px;font-weight:800;color:#0f172a;margin-top:2px}.rfKpiT{cursor:pointer;-webkit-tap-highlight-color:transparent}.rfKpiT::after{content:"\\203A";position:absolute;top:2px;right:6px;color:#cbd5e1;font-weight:800;font-size:13px;line-height:1}.rfKpiT:active{background:#eef2ff;border-color:#c7d2fe}.rfKpi.on{background:#eef2ff;border-color:#c7d2fe}.rfKpi.on span{color:#4338ca}.rfKpiT:focus-visible{outline:2px solid #4338ca;outline-offset:2px}.rfCtl{display:flex;gap:8px;margin:11px 0 9px}.rfSearch{flex:1;position:relative}.rfSearch i{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:15px}.rfSearch input{width:100%;height:38px;padding:0 12px 0 32px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:var(--mono);outline:none}.rfLegend{display:flex;flex-wrap:wrap;gap:9px;font-size:10px;color:#475569;font-weight:600;margin-bottom:9px}.rfLegend span{display:inline-flex;align-items:center;gap:4px}.rfLegend .d{width:10px;height:10px;border-radius:3px}.rfBoard{display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:5px}.rfN{font-family:var(--mono);font-size:11.5px;font-weight:800;padding:7px 2px;border-radius:7px;border:1.5px solid;cursor:pointer}.rfN:active{opacity:.65}.rfN-disp{background:#f8fafc;border-color:#e2e8f0;color:#64748b}.rfN-pend{background:#fff7ed;border-color:#fdba74;color:#c2410c}.rfN-conf{background:#f0fdf4;border-color:#86efac;color:#15803d}.rfN-apar{background:#fffbeb;border-color:#fde68a;color:#b45309}.rfPager{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:13px;font-size:12px;font-weight:700;color:#475569}.rsBanner{background:linear-gradient(135deg,#fef9c3,#fef3c7);border:1px solid #fde68a;border-radius:12px;padding:10px 12px;margin:10px 0;font-size:12.5px;color:#92400e;font-weight:700;display:flex;align-items:center;gap:7px}.rsBanner i{color:#d97706;font-size:17px;flex-shrink:0}.rsWin{background:linear-gradient(160deg,#16a34a,#15803d);color:#fff;border-radius:14px;padding:16px;text-align:center;box-shadow:0 8px 20px rgba(22,163,74,.3)}.rsWinT{font-size:13px;font-weight:800;letter-spacing:1px}.rsWinNum{font-size:38px;font-weight:800;font-family:var(--mono);letter-spacing:5px;margin:4px 0}.rsWinNom{font-size:17px;font-weight:800}.rsWinTel{font-size:13px;opacity:.95;margin-top:2px}.rsWinEst{font-size:11.5px;opacity:.9;margin-top:3px}.rsNone{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px;font-size:12.5px;color:#9a3412;text-align:center}.rsNone i{font-size:24px;display:block;margin-bottom:6px;color:#ea580c}.ctaRow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 2px;border-bottom:1px solid #f1f5f9;font-size:13px}.ctaRow:last-child{border-bottom:0}.ctaL{display:flex;align-items:center;gap:10px;min-width:0}.ctaL i{font-size:18px;color:#4f46e5;flex-shrink:0}.ctaL b{font-weight:700;font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ctaL span{display:block;font-size:10.5px;color:#64748b}.liqRow{border:1px solid #e8edf3;border-radius:12px;padding:10px 12px;margin-bottom:8px;background:#fff}.liqTop{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:5px}.liqTop b{font-size:13.5px;font-weight:800}.liqTop span{font-size:11px;color:#64748b;font-weight:600;white-space:nowrap}.liqBot{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:#475569}.rsConBox{background:#fff;border:1px solid #e8edf3;border-radius:12px;padding:10px 12px;margin-top:10px}.rsConT{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px}.rsCon{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:4px 0;color:#334155}.rsCon span b{color:#0f172a;font-family:var(--mono)}.repItem{display:flex;align-items:center;gap:11px;width:100%;border:0;background:#fff;cursor:pointer;padding:12px 4px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#334155;text-align:left;font-family:inherit}.repItem:last-child{border-bottom:0}.repItem:active{background:#f8fafc}.repIco{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}.tkTbl{width:100%;border-collapse:collapse;font-size:11.5px;min-width:520px}.tkTbl thead th{background:#f8fafc;font-size:9px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;text-align:left;padding:8px 9px;border-bottom:1px solid #e2e8f0;white-space:nowrap;position:sticky;top:0}.tkTbl tbody td{padding:8px 9px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle}.tkTbl tbody tr:active{background:#f8fafc}.tkNumC{font-family:var(--mono);font-weight:800;color:#4338ca}.tkSub{font-size:9.5px;color:#94a3b8}.tkNw{white-space:nowrap}.tkR2{text-align:right;font-weight:800;color:#0f172a;white-space:nowrap}.tkBadge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:20px;white-space:nowrap}.stT{font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px}.stChart{display:flex;align-items:flex-end;gap:4px;height:122px;border-bottom:1px solid #e8edf3;padding-bottom:2px}.stCol{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}.stBarWrap{width:100%;height:100px;display:flex;align-items:flex-end;justify-content:center}.stBar{width:72%;min-width:8px;background:linear-gradient(180deg,#6366f1,#4338ca);border-radius:4px 4px 0 0}.stLbl{font-size:8px;color:#94a3b8;white-space:nowrap}.stStat{margin-bottom:9px}.stStatTop{display:flex;justify-content:space-between;font-size:12px;color:#475569;margin-bottom:3px}.stStatTop b{color:#0f172a}.stStatBar{height:8px;background:#f1f5f9;border-radius:5px;overflow:hidden}.stStatBar>div{height:100%;border-radius:5px}.pie{width:148px;height:148px;border-radius:50%;margin:6px auto 12px;box-shadow:0 4px 14px rgba(15,23,42,.10)}.pieLeg{display:flex;flex-direction:column;gap:0}.pieRow{display:flex;align-items:center;gap:9px;font-size:12.5px;padding:7px 2px;border-bottom:1px solid #f5f7fa}.pieRow:last-child{border-bottom:0}.pieDot{width:12px;height:12px;border-radius:3px;flex:0 0 auto}.pieK{flex:1;color:#334155;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pieRow b{color:#0f172a;font-weight:800;white-space:nowrap}.piePct{color:#64748b;font-weight:700;min-width:36px;text-align:right}' +
      // ── RIFAS V3 (panel administrativo) — tabs internas, atención requerida, bandeja de pagos
      // y panel lateral (drawer) para gestBoleto. .rfCtl gana flex-wrap para el select nuevo.
      '.rfCtl{flex-wrap:wrap}#rfBoardEstSel,#rfTkEstSel{height:38px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;padding:0 8px;flex:0 0 auto;background:#fff;color:#334155}' +
      '.rfTabs{display:flex;gap:0;overflow-x:auto;margin:12px 0 10px;padding:6px;border-radius:9999px;background:linear-gradient(180deg,#f2f4f7 0%,#dde1e6 50%,#f2f4f7 100%);box-shadow:inset 3px 3px 7px rgba(30,41,59,.20),inset -3px -3px 7px #f2f4f7}' +
      '.rfTab{border:0;background:transparent;padding:9px 12px;font-size:12.5px;font-weight:700;color:#64748b;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;-webkit-tap-highlight-color:transparent}' +
      /* Scoped a .rfTabs (la barra horizontal, no la .rfSide vertical de escritorio — misma
         clase .rfTab reciclada para las dos, ver comentario "MISMA clase .rfTab" más arriba)
         para no filtrarle la línea divisoria ni el relieve a la lista lateral. */
      '.rfTabs .rfTab{border-right:1px solid rgba(0,0,0,.10);transition:box-shadow .18s ease,color .18s ease,transform .12s ease}' +
      '.rfTabs .rfTab:last-child{border-right:none}.rfTabs .rfTab:active{transform:translateY(1px)}.rfTabs .rfTab:hover{color:#1ca2a4}' +
      '.rfTabs .rfTab.on{color:#1ca2a4;font-weight:800;border-radius:9999px;background:linear-gradient(180deg,rgba(30,41,59,.20) 0%,#f2f4f7 45%,rgba(30,41,59,.20) 100%);box-shadow:inset 3px 3px 6px rgba(30,41,59,.20),inset -3px -3px 6px #f2f4f7,inset 0 3px 5px rgba(30,41,59,.20),inset 0 -3px 5px #f2f4f7}' +
      '.rfTabBadge{background:#fef3c7;color:#b45309;font-size:9.5px;font-weight:800;padding:1px 6px;border-radius:20px}' +
      '.rfAttn{background:#fffbeb;border:1px solid #fde68a;border-radius:13px;padding:2px 10px;margin:10px 0}' +
      '.rfAttnT{font-size:10.5px;font-weight:800;color:#92400e;text-transform:uppercase;letter-spacing:.3px;padding:8px 2px 2px;display:flex;align-items:center;gap:5px}.rfAttnT i{font-size:13px}' +
      '.rfAttnRow{display:flex;align-items:center;width:100%;border:0;background:transparent;text-align:left;padding:8px 2px;gap:2px;cursor:pointer;border-top:1px solid rgba(180,83,9,.15);-webkit-tap-highlight-color:transparent}' +
      '.rfAttnRow:active{background:rgba(180,83,9,.08)}.rfAttnRow b{font-size:12.5px;font-weight:800;color:#78350f;white-space:nowrap}.rfAttnRow span{font-size:10.5px;color:#92400e;font-weight:600;flex:1;margin-left:6px}.rfAttnRow i{color:#d97706;font-size:14px;flex-shrink:0}' +
      '.rfPayRow{display:flex;align-items:center;gap:10px;width:100%;background:#fff;border:1px solid #e8edf3;border-radius:12px;padding:10px 11px;margin-bottom:7px;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent}.rfPayRow:active{background:#f8fafc}' +
      '.rfPayIni{width:34px;height:34px;border-radius:50%;background:#eef2ff;color:#4338ca;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}' +
      '.rfPayInfo{min-width:0;flex:1}.rfPayInfo b{display:block;font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rfPayInfo span{display:block;font-size:10.5px;color:#94a3b8;margin-top:1px}' +
      '.rfPayR{display:flex;align-items:center;gap:6px;flex-shrink:0}.rfPayR b{font-size:13px;font-weight:800;color:#0f172a}' +
      // Aprobar/Rechazar de 1 toque en la bandeja de "Pagos por revisar" — verde=confirmar,
      // rojo=rechazar (mismo reglamento +/− del sistema). stopPropagation en el onclick evita
      // que también dispare el click de la fila completa (que abre el panel lateral).
      '.rfPayBtns{display:flex;gap:5px;flex-shrink:0}' +
      '.rfPayBtn{width:30px;height:30px;border-radius:9px;border:1.5px solid;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;background:#fff;flex-shrink:0;-webkit-tap-highlight-color:transparent}.rfPayBtn:active{opacity:.65}' +
      '.rfPayBtnOk{border-color:#bbf7d0;color:#16a34a;background:#f0fdf4}.rfPayBtnNo{border-color:#fecaca;color:#dc2626;background:#fef2f2}' +
      '.rfPayEmpty{text-align:center;color:#475569;font-size:12.5px;padding:26px 10px}.rfPayEmpty i{font-size:26px;display:block;margin-bottom:8px;color:#16a34a}' +
      '.rfVouThumb{display:block;width:100%;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;padding:0;background:#f8fafc;cursor:pointer;margin-bottom:10px;text-align:left}.rfVouThumb img{width:100%;max-height:180px;object-fit:cover;display:block}.rfVouThumb span{display:flex;align-items:center;justify-content:center;gap:5px;font-size:11px;font-weight:700;color:#4338ca;padding:7px}' +
      // Miniatura del comprobante DENTRO de la fila de "Pagos por revisar" (reemplaza el avatar de
      // iniciales cuando hay voucher) — mismo tamaño/posición que .rfPayIni para no romper el layout.
      '.rfPayThumb{width:34px;height:34px;border-radius:9px;object-fit:cover;flex-shrink:0;border:1px solid #e2e8f0}' +
      // Participantes (vista agregada por persona, no por ticket): total a la derecha de la fila,
      // apilado (confirmado grande + pendiente chico en ámbar si hay algo por confirmar).
      '.rfPartR{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0}.rfPartR>b{font-size:13px;font-weight:800;color:#16a34a}.rfPartPend{font-size:9.5px;font-weight:700;color:#d97706;white-space:nowrap}' +
      // Chips de boleto dentro del detalle de un participante (nxRfPartVer) — mismo lenguaje visual
      // que los badges de estado ya usados en tkRowsHTML/tkBadge, en formato botón (abre el boleto).
      '.rfPartTk{display:inline-flex;align-items:center;gap:5px;border:1px solid;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:800;font-family:var(--mono);cursor:pointer;background:transparent}.rfPartTkM{font-family:var(--ff);font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:.2px;opacity:.85}' +
      // Pestaña "Resumen" — dashboard de 3 tarjetas reales (próximo sorteo/por cobrar en revisión/
      // ingreso potencial), no decorativo: cada número sale de rifas.fecha_sorteo o de _boletos.
      '.rfSumGrid{display:grid;grid-template-columns:1fr;gap:11px}@media(min-width:640px){.rfSumGrid{grid-template-columns:repeat(3,1fr)}}' +
      '.rfSumCard{background:#fff;border:1px solid #e8edf3;border-radius:14px;padding:14px}.rfSumT{font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.3px;display:flex;align-items:center;gap:6px;margin-bottom:8px}.rfSumT i{font-size:14px;color:#94a3b8}' +
      '.rfSumBig{font-size:19px;font-weight:800;color:#0f172a;line-height:1.2}.rfSumSub{font-size:11px;color:#64748b;font-weight:600;margin-top:3px}' +
      '.rfSumEmpty{font-size:12.5px;color:#94a3b8;font-weight:600}' +
      '.rfSumLink{display:inline-flex;align-items:center;gap:3px;border:0;background:transparent;color:#4338ca;font-size:11.5px;font-weight:800;padding:8px 0 0;cursor:pointer}.rfSumLink i{font-size:13px}' +
      // Panel lateral (drawer): reusa .overlay/.modal de siempre — solo cambia SU posición/tamaño
      // vía estas 2 clases nuevas, sin tocar la base compartida por el resto del sistema. El
      // fondo se aclara (mantener visible la pantalla detrás, pedido explícito del prototipo) y
      // pierde el blur — con !important + 3 clases para ganarle al tema oscuro
      // (body.tema-premium .overlay{...!important}, que es más específico por el selector `body`).
      '.overlay.open.rfDrawerOv{background:rgba(15,23,42,.25)!important;backdrop-filter:none!important;align-items:stretch;justify-content:flex-end;padding:0}' +
      '.overlay.open.rfDrawerOv .modal.rfDrawer{margin:0;max-width:400px;width:100%;height:100%;max-height:100%;border-radius:0;box-shadow:-10px 0 30px rgba(15,23,42,.2);overflow-y:auto;animation:rfDrawerIn .22s cubic-bezier(.32,.72,0,1) both}' +
      '@keyframes rfDrawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}' +
      '@media(max-width:480px){.overlay.open.rfDrawerOv .modal.rfDrawer{max-width:100%}}' +
      // RIFAS V3.2 (formato): ícono con círculo de color en cada tarjeta KPI (mismo patrón que
      // ya usa .rfPayIni), barra lateral fija en escritorio para las 5 pestañas (misma clase
      // .rfTab que ya trae la fila horizontal — solo se apila distinto vía CSS) y columna fija
      // de detalle en la pestaña Números (#rfDetailDock) en vez del cajón, también solo en
      // escritorio. Móvil (<900px) queda IDÉNTICO a como estaba: fila de pestañas + cajón.
      '.rfKpiIco{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;margin:0 auto 5px}' +
      '.rfShell{display:block}.rfSide{display:none}.rfMain{min-width:0}' +
      '@media(min-width:900px){' +
      '.rfShell{display:flex;gap:16px;align-items:flex-start}' +
      '.rfSide{display:flex;flex-direction:column;gap:2px;width:186px;flex-shrink:0;position:sticky;top:10px;background:#fff;border:1px solid #e8edf3;border-radius:14px;padding:9px}' +
      '.rfSide .rfTab{width:100%;text-align:left;justify-content:flex-start;padding:9px 10px;border-radius:9px;border-bottom:0;font-size:12.5px}' +
      '.rfSide .rfTab i{font-size:15px;width:17px;text-align:center;color:#94a3b8}' +
      '.rfSide .rfTab.on{background:#eef2ff;color:#4338ca}.rfSide .rfTab.on i{color:#4338ca}' +
      '.rfSide .rfTabBadge{margin-left:auto}' +
      '.rfMain{flex:1;min-width:0}' +
      '.rfTabs{display:none}' +
      '}' +
      '.rfNumRow{display:block}.rfDetailDock{display:none}' +
      '@media(min-width:900px){.rfNumRow{display:grid;grid-template-columns:1fr 360px;gap:14px;align-items:start}.rfDetailDock{display:block;position:sticky;top:10px}}' +
      '.rfDockCard{background:#fff;border:1px solid #e8edf3;border-radius:15px;padding:14px;box-shadow:0 4px 14px rgba(15,23,42,.05)}' +
      '.rfDockEmpty{text-align:center;color:#94a3b8;font-size:12.5px;padding:38px 10px}.rfDockEmpty i{font-size:26px;display:block;margin-bottom:8px;color:#cbd5e1}' +
      BOL_CSS;
    document.head.appendChild(st);
  }
  function registrar() { try { if (window.nxMERegistrar) window.nxMERegistrar({ orden: 4, nombre: 'Rifas', desc: 'Boletos, vendedores y sorteo', icon: 'ti-ticket', color: '#4f46e5', bg: '#eef2ff', onclick: 'window.nxAbrirRifas()' }); } catch (e) {} }
  function init() { inyectarCSS(); var n = 0; var t = function () { n++; if (window.nxMERegistrar) { registrar(); return; } if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
