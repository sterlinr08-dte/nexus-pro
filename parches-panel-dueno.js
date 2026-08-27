
// ════════════════════════════════════════════════════════════════════
// PANEL DEL DUEÑO (SUPERADMIN) — solo lectura, cross-org, gateado por mi_es_superadmin()
// ════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function _esc(s) { try { return esc(s); } catch (e) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); } }
  function _fmt(n) { try { return fmt(n); } catch (e) { return 'RD$ ' + (Number(n) || 0).toLocaleString('es-DO'); } }

  async function esSuper() { try { var r = await getAPI().post('rpc/mi_es_superadmin', {}); return r === true || r === 'true'; } catch (e) { return false; } }

  function kpi(l, v) { return '<div style="background:#f8fafc;border-radius:8px;padding:7px 5px;text-align:center"><div style="font-size:8.5px;color:#64748b;text-transform:uppercase;font-weight:700;letter-spacing:.2px">' + l + '</div><div style="font-size:13px;font-weight:800;color:#0f172a;margin-top:2px">' + v + '</div></div>'; }
  function orgCard(o) {
    var act = o.activo ? '<span style="background:#dcfce7;color:#16a34a;font-size:9px;font-weight:800;padding:3px 8px;border-radius:20px;white-space:nowrap">ACTIVA</span>' : '<span style="background:#fee2e2;color:#dc2626;font-size:9px;font-weight:800;padding:3px 8px;border-radius:20px;white-space:nowrap">INACTIVA</span>';
    var vence = o.activo_hasta ? '<div style="font-size:10.5px;color:#b45309;font-weight:600;margin-top:2px"><i class="ti ti-clock"></i> Vence: ' + _esc(new Date(o.activo_hasta).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })) + '</div>' : '';
    var dom = o.dominio ? ' · ' + _esc(o.dominio) : '';
    return '<div style="border:1px solid #e8edf3;border-radius:13px;padding:12px;margin-bottom:10px;background:#fff">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div style="min-width:0"><div style="font-weight:800;font-size:14px;color:#0f172a">' + _esc(o.nombre || '') + '</div><div style="font-size:11px;color:#64748b">@' + _esc(o.slug || '') + ' · ' + _esc(o.tipo || '') + dom + '</div>' + vence + '</div>' + act + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">' +
      kpi('Usuarios', o.usuarios || 0) + kpi('Rifas', o.rifas || 0) + kpi('Recaud. rifa', _fmt(o.rifa_recaudado)) +
      kpi('Ventas POS', o.pos_ventas || 0) + kpi('Total POS', _fmt(o.pos_total)) +
      '</div></div>';
  }

  window.nxAbrirSuperadmin = async function () {
    var prev = document.getElementById('nxSuper'); if (prev) prev.remove();
    var ov = document.createElement('div'); ov.id = 'nxSuper'; ov.className = 'overlay open';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = '<div class="modal" style="max-width:470px;max-height:92vh;display:flex;flex-direction:column"><div class="mt"><span><i class="ti ti-crown"></i> Panel del Dueño</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById(\'nxSuper\').remove()"><i class="ti ti-x"></i></button></div><div id="superBody" style="overflow-y:auto;flex:1"><div style="text-align:center;color:#94a3b8;padding:26px;font-size:13px">Cargando todas las empresas…</div></div></div>';
    document.body.appendChild(ov);
    var orgs = []; try { orgs = await getAPI().post('rpc/superadmin_orgs', {}) || []; } catch (e) { orgs = []; }
    var body = document.getElementById('superBody'); if (!body) return;
    if (!orgs.length) { body.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:26px;font-size:13px">No hay acceso o no hay empresas.</div>'; return; }
    var totVentas = orgs.reduce(function (s, o) { return s + (Number(o.pos_total) || 0); }, 0);
    var totRifa = orgs.reduce(function (s, o) { return s + (Number(o.rifa_recaudado) || 0); }, 0);
    var activas = orgs.filter(function (o) { return o.activo; }).length;
    var head = '<div class="rfKpis" style="margin-bottom:12px"><div class="rfKpi"><span>Empresas</span><b>' + orgs.length + '</b></div><div class="rfKpi"><span>Activas</span><b style="color:#16a34a">' + activas + '</b></div><div class="rfKpi"><span>Ventas POS</span><b>' + _fmt(totVentas) + '</b></div><div class="rfKpi"><span>Recaud. rifas</span><b style="color:#4f46e5">' + _fmt(totRifa) + '</b></div></div>';
    body.innerHTML = head + orgs.map(orgCard).join('');
  };

  function registrar() { if (window.nxMERegistrar) window.nxMERegistrar({ orden: 9, nombre: 'Panel del Dueño', desc: 'Todas las empresas y sus totales', icon: 'ti-crown', color: '#b45309', bg: '#fffbeb', onclick: 'window.nxAbrirSuperadmin()' }); }
  function tryReg() { var n = 0; var t = function () { n++; if (window.nxMERegistrar) { registrar(); return; } if (n < 80) setTimeout(t, 200); }; t(); }
  function check(intentos) { esSuper().then(function (ok) { if (ok) { tryReg(); } else if (intentos > 0) { setTimeout(function () { check(intentos - 1); }, 2500); } }); }
  function init() { setTimeout(function () { check(3); }, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

/* ===================== MÓDULO CONSULTORIO MÉDICO (v1 · geriatría) =====================
   Demo "nivel plus" dentro de Multiempresa (patrón Rifas/POS): misma base, aislado por
   organizacion_id + RLS. Si el doctor lo quiere, se le crea su organización + usuario y
   entra a ver SOLO lo suyo. Tablas: med_pacientes, med_citas, med_consultas. */
(function () {
  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; }); }
  // Buscador estándar (reglamento del dueño): respaldo por si index.html aún no trae
  // nxBuscaHTML en caché (mismo criterio que ya usa AGUAPRO/POS).
  function fmt(n) { return 'RD$ ' + Math.round(Number(n || 0)).toLocaleString('en-US'); }
  function toast() { try { return window.toast.apply(null, arguments); } catch (e) {} }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function moneyVal(id) { var e = document.getElementById(id); if (!e) return 0; try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(e.value)) || 0; } catch (er) {} return Number(String(e.value).replace(/[^0-9.-]/g, '')) || 0; }
  function curSes() { try { return (typeof sesion !== 'undefined') ? sesion : window.sesion; } catch (e) { try { return window.sesion; } catch (_) { return null; } } }
  function esAdmin() { var s = curSes(); return !!(s && s.rol === 'admin'); }
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaDMY(d) { if (!d) return ''; try { return new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return String(d).slice(0, 10); } }
  function edad(fnac) { if (!fnac) return ''; try { var n = new Date(fnac), h = new Date(); var a = h.getFullYear() - n.getFullYear(); var m = h.getMonth() - n.getMonth(); if (m < 0 || (m === 0 && h.getDate() < n.getDate())) a--; return a; } catch (e) { return ''; } }
  function cerrar(id) { var o = document.getElementById(id); if (o) o.remove(); }
  function modal(id, html, maxw) {
    cerrar(id);
    var o = document.createElement('div'); o.id = id; o.className = 'nxMdOv';
    o.innerHTML = '<div class="nxMdModal" style="max-width:' + (maxw || 560) + 'px">' + html + '</div>';
    o.addEventListener('click', function (ev) { if (ev.target === o) o.remove(); });
    document.body.appendChild(o);
  }

  var _pacs = [], _citas = [], _cons = [], _mdTab = 'inicio', _mdQ = '', _mdFecha = hoyISO(), _mdCargado = false;

  var MD_CSS = '\n.nxMdOv{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:18px 10px;overflow:auto}\n.nxMdModal{background:#fff;border-radius:16px;box-shadow:0 22px 60px rgba(15,23,42,.28);width:100%;padding:16px;margin:auto 0}\n.nxMdHero{background:linear-gradient(120deg,#0f766e,#0d9488 55%,#14b8a6);border-radius:16px;padding:16px 16px 14px;color:#fff;margin-bottom:12px;position:relative;overflow:hidden}\n.nxMdHero::after{content:"";position:absolute;right:-40px;top:-46px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.10)}\n.nxMdHeroT{font-size:17px;font-weight:800;letter-spacing:.3px;display:flex;align-items:center;gap:8px}\n.nxMdHeroS{font-size:11px;opacity:.9;margin-top:2px}\n.nxMdTabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 12px}\n.nxMdTab{border:0;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:700;background:#f1f5f9;color:#334155;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .18s}\n.nxMdTab.on{background:#0d9488;color:#fff;box-shadow:0 6px 16px rgba(13,148,136,.35)}\n.nxMdKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px}\n.nxMdKpi{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px 12px;box-shadow:0 4px 14px rgba(15,23,42,.05)}\n.nxMdKpi b{display:block;font-size:17px;color:#0f172a;font-variant-numeric:tabular-nums}\n.nxMdKpi span{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.4px}\n.nxMdKpi .ico{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;margin-bottom:6px}\n.nxMdCard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:8px;box-shadow:0 3px 10px rgba(15,23,42,.04)}\n.nxMdRow{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:7px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.04)}\n.nxMdAva{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#ccfbf1,#99f6e4);color:#0f766e;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex:none}\n.nxMdNom{font-weight:700;font-size:13px;color:#0f172a;line-height:1.2}\n.nxMdSub{font-size:10.5px;color:#64748b;margin-top:1px}\n.nxMdChip{display:inline-block;font-size:9.5px;font-weight:700;padding:2px 8px;border-radius:999px;margin:2px 3px 0 0}\n.nxMdHora{font-family:var(--mono);font-weight:800;font-size:12px;background:#f0fdfa;color:#0f766e;border-radius:9px;padding:6px 8px;flex:none}\n.nxMdEmpty{text-align:center;color:#64748b;font-size:12px;padding:26px 10px}\n.nxMdEmpty i{font-size:30px;color:#99f6e4;display:block;margin-bottom:6px}\n.nxMdFr{margin-bottom:9px}\n.nxMdFr label{display:block;font-size:10.5px;font-weight:700;color:#475569;margin-bottom:3px;text-transform:uppercase;letter-spacing:.3px}\n.nxMdFr input,.nxMdFr select,.nxMdFr textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font-size:13px;font-family:inherit;background:#fff}\n.nxMdG2{display:grid;grid-template-columns:1fr 1fr;gap:8px}\n.nxMdG3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}\n@media(max-width:420px){.nxMdG3{grid-template-columns:1fr 1fr}}\n.nxMdBtns{display:flex;gap:7px;margin-top:12px}\n.nxMdBtn{flex:1;border:0;border-radius:11px;padding:11px;font-size:13px;font-weight:800;cursor:pointer}\n.nxMdBtn.p{background:#0d9488;color:#fff;box-shadow:0 6px 16px rgba(13,148,136,.3)}\n.nxMdBtn.g{background:#f1f5f9;color:#334155}\n.nxMdQuick{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px}\n.nxMdQBtn{border:1px solid #e2e8f0;background:#fff;border-radius:14px;padding:12px 10px;cursor:pointer;text-align:center;box-shadow:0 3px 10px rgba(15,23,42,.05);transition:transform .15s}\n.nxMdQBtn:active{transform:scale(.97)}\n.nxMdQBtn i{font-size:19px;display:block;margin-bottom:5px}\n.nxMdQBtn b{font-size:11px;color:#0f172a}\n.nxMdSearch{width:100%;border:1px solid #cbd5e1;border-radius:999px;padding:10px 14px;font-size:13px;margin-bottom:10px;background:#fff}\n.nxMdVit{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:6px;margin:6px 0}\n.nxMdVit .v{background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:6px 8px;text-align:center}\n.nxMdVit .v b{display:block;font-size:12px;color:#0f766e}\n.nxMdVit .v span{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase}\n';
  function inyectarCSS() { if (document.getElementById('nxMdCSS')) return; var s = document.createElement('style'); s.id = 'nxMdCSS'; s.textContent = MD_CSS; document.head.appendChild(s); }

  function ensureView() {
    var v = document.getElementById('v-consultorio');
    if (v) return v;
    var dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-consultorio';
    dash.parentElement.appendChild(v);
    return v;
  }

  async function cargarMed() {
    try { _pacs = await getAPI().get('med_pacientes', 'select=*&order=nombre.asc') || []; } catch (e) { _pacs = []; }
    try { _citas = await getAPI().get('med_citas', 'select=*&order=fecha.asc,hora.asc&limit=800') || []; } catch (e) { _citas = []; }
    try { _cons = await getAPI().get('med_consultas', 'select=*&order=fecha.desc,created_at.desc&limit=300') || []; } catch (e) { _cons = []; }
    _mdCargado = true;
  }
  function pacDe(id) { return _pacs.find(function (p) { return String(p.id) === String(id); }); }
  function nomPac(x) { return (x && (x.paciente_nombre || (pacDe(x.paciente_id) || {}).nombre)) || '—'; }

  window.nxAbrirConsultorio = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    inyectarCSS();
    var view = ensureView(); if (!view) return;
    try { window.nxGuardarLugar && window.nxGuardarLugar('consultorio'); } catch (e) {}
    document.querySelectorAll('.view').forEach(function (x) { x.classList.remove('on'); });
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(function (n) { n.classList.remove('on'); });
    var pt = document.getElementById('pttl'); if (pt) pt.textContent = 'CONSULTORIO';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:8px;font-weight:600">Cargando consultorio...</div></div></div>';
    try { await cargarMed(); renderMed(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudo cargar.<br><span style="font-size:11px;color:#475569">' + esc(String(e && e.message || e)) + '</span></div></div>'; }
  };

  window.nxMdTab = function (t) { _mdTab = t; var v = document.getElementById('v-consultorio'); if (v) renderMed(v); };

  function estCita(e) {
    var m = { pendiente: ['#d97706', '#fffbeb', 'Pendiente'], confirmada: ['#2563eb', '#eff6ff', 'Confirmada'], atendida: ['#16a34a', '#f0fdf4', 'Atendida'], cancelada: ['#dc2626', '#fef2f2', 'Cancelada'] };
    return m[e] || m.pendiente;
  }

  function renderMed(view) {
    var s = curSes(); var org = (s && s.org) || {};
    var nomNeg = (org.tipo === 'consultorio' && org.nombre) ? org.nombre : 'Consultorio Geriátrico';
    var hoy = hoyISO();
    var citasHoy = _citas.filter(function (c) { return String(c.fecha).slice(0, 10) === hoy && c.estado !== 'cancelada'; });
    var mesKey = hoy.slice(0, 7);
    var consMes = _cons.filter(function (c) { return String(c.fecha).slice(0, 7) === mesKey; });
    var ingMes = consMes.reduce(function (t, c) { return t + Number(c.precio || 0); }, 0);
    // Modo SOLO-CONSULTORIO (org tipo 'consultorio'): el doctor no tiene a dónde "volver" — cierra sesión.
    var btnHdr = org.tipo === 'consultorio'
      ? '<button class="btn bsm" style="background:rgba(255,255,255,.16);color:#fff;border:0" type="button" onclick="window.logout&&window.logout()"><i class="ti ti-logout"></i> Cerrar sesión</button>'
      : '<button class="btn bsm" style="background:rgba(255,255,255,.16);color:#fff;border:0" type="button" onclick="window.nav&&window.nav(\'dashboard\',null)"><i class="ti ti-arrow-left"></i> Volver</button>';
    var head =
      '<div class="nxMdHero"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;position:relative;z-index:1">' +
      '<div><div class="nxMdHeroT"><i class="ti ti-stethoscope"></i> ' + esc(nomNeg) + '</div><div class="nxMdHeroS">Medicina geriátrica · ' + fechaDMY(hoy) + '</div></div>' +
      btnHdr +
      '</div></div>';
    var tabs = [['inicio', 'ti-home', 'Inicio'], ['agenda', 'ti-calendar', 'Agenda'], ['pacientes', 'ti-users', 'Pacientes'], ['consultas', 'ti-clipboard-heart', 'Consultas']];
    var tabsH = '<div class="nxMdTabs">' + tabs.map(function (t) { return '<button type="button" class="nxMdTab' + (_mdTab === t[0] ? ' on' : '') + '" onclick="window.nxMdTab(\'' + t[0] + '\')"><i class="ti ' + t[1] + '"></i> ' + t[2] + '</button>'; }).join('') + '</div>';
    var body = _mdTab === 'agenda' ? bodyAgenda() : _mdTab === 'pacientes' ? bodyPacientes() : _mdTab === 'consultas' ? bodyConsultas() : bodyInicio(citasHoy, consMes, ingMes);
    view.innerHTML = '<div style="max-width:860px;margin:0 auto">' + head + tabsH + body + '</div>';
    // NPGS §5: la lupa se pinta DESPUÉS de inyectar el HTML — el <span> recién existe aquí.
    if (_mdTab === 'pacientes') try { pintarLupaMd(); } catch (e) {}
  }

  function bodyInicio(citasHoy, consMes, ingMes) {
    var kpis =
      '<div class="nxMdKpis">' +
      '<div class="nxMdKpi"><div class="ico" style="background:#f0fdfa;color:#0d9488"><i class="ti ti-calendar-heart"></i></div><b>' + citasHoy.length + '</b><span>Citas hoy</span></div>' +
      '<div class="nxMdKpi"><div class="ico" style="background:#eff6ff;color:#2563eb"><i class="ti ti-users"></i></div><b>' + _pacs.filter(function (p) { return p.activo !== false; }).length + '</b><span>Pacientes</span></div>' +
      '<div class="nxMdKpi"><div class="ico" style="background:#fdf4ff;color:#a21caf"><i class="ti ti-clipboard-heart"></i></div><b>' + consMes.length + '</b><span>Consultas del mes</span></div>' +
      '<div class="nxMdKpi"><div class="ico" style="background:#f0fdf4;color:#16a34a"><i class="ti ti-cash"></i></div><b>' + fmt(ingMes) + '</b><span>Ingresos del mes</span></div>' +
      '</div>';
    var quick =
      '<div class="nxMdQuick">' +
      '<button type="button" class="nxMdQBtn" onclick="window.nxMdCitaNueva()"><i class="ti ti-calendar-plus" style="color:#0d9488"></i><b>Nueva cita</b></button>' +
      '<button type="button" class="nxMdQBtn" onclick="window.nxMdPacNuevo()"><i class="ti ti-user-plus" style="color:#2563eb"></i><b>Nuevo paciente</b></button>' +
      '<button type="button" class="nxMdQBtn" onclick="window.nxMdConNueva()"><i class="ti ti-report-medical" style="color:#a21caf"></i><b>Nueva consulta</b></button>' +
      '</div>';
    var agenda = citasHoy.length ? citasHoy.sort(function (a, b) { return String(a.hora || '').localeCompare(String(b.hora || '')); }).map(filaCita).join('') :
      '<div class="nxMdEmpty"><i class="ti ti-calendar-smile"></i>Sin citas para hoy</div>';
    return kpis + quick + '<div class="nxMdCard"><div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:8px"><i class="ti ti-clock-heart" style="color:#0d9488"></i> Agenda de hoy</div>' + agenda + '</div>';
  }

  function filaCita(c) {
    var e = estCita(c.estado); var p = pacDe(c.paciente_id);
    var ed = p ? edad(p.fecha_nacimiento) : '';
    // Recordatorio por WhatsApp (al teléfono del paciente o del familiar responsable)
    var telW = p ? String(p.telefono || p.contacto_telefono || '').replace(/\D/g, '') : '';
    var wa = '';
    if (telW && c.estado !== 'atendida' && c.estado !== 'cancelada') {
      var sw = curSes(); var ow = (sw && sw.org) || {};
      var neg = (ow.tipo === 'consultorio' && ow.nombre) ? ow.nombre : 'Consultorio Geriátrico';
      var msg = 'Hola ' + ((p && p.nombre) || '') + ', le recordamos su cita en ' + neg + ' el ' + fechaDMY(c.fecha) + (c.hora ? ' a las ' + c.hora : '') + '. ¡Le esperamos!';
      wa = '<a class="btn bsm" style="background:#f0fdf4;color:#16a34a;border:0" href="https://wa.me/1' + telW + '?text=' + encodeURIComponent(msg) + '" target="_blank" title="Recordar por WhatsApp" aria-label="Recordar por WhatsApp" onclick="event.stopPropagation()"><i class="ti ti-brand-whatsapp"></i></a>';
    }
    var acc = c.estado === 'atendida' || c.estado === 'cancelada' ? '' :
      '<button class="btn bsm bc1" type="button" onclick="window.nxMdConNueva(\'' + (c.paciente_id || '') + '\',\'' + c.id + '\')" title="Atender" aria-label="Atender"><i class="ti ti-stethoscope"></i></button>' +
      '<button class="btn bsm bghost" type="button" onclick="window.nxMdCitaEstado(\'' + c.id + '\',\'cancelada\')" title="Cancelar" aria-label="Cancelar"><i class="ti ti-x" style="color:#dc2626"></i></button>';
    return '<div class="nxMdRow"><div class="nxMdHora">' + esc(c.hora || '--:--') + '</div>' +
      '<div style="flex:1;min-width:0"><div class="nxMdNom">' + esc(nomPac(c)) + (ed !== '' ? ' <span style="color:#64748b;font-weight:600;font-size:11px">· ' + ed + ' años</span>' : '') + '</div>' +
      '<div class="nxMdSub">' + esc(c.motivo || 'Consulta') + '</div></div>' +
      '<span class="nxMdChip" style="background:' + e[1] + ';color:' + e[0] + '">' + e[2] + '</span>' + wa + acc + '</div>';
  }

  // ── AGENDA ──
  window.nxMdFechaMueve = function (d) { var f = new Date(_mdFecha + 'T12:00:00'); f.setDate(f.getDate() + d); _mdFecha = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); window.nxMdTab('agenda'); };
  window.nxMdFechaSet = function (v) { if (v) { _mdFecha = v; window.nxMdTab('agenda'); } };
  function bodyAgenda() {
    var del = _citas.filter(function (c) { return String(c.fecha).slice(0, 10) === _mdFecha; }).sort(function (a, b) { return String(a.hora || '').localeCompare(String(b.hora || '')); });
    var nav = '<div class="nxMdCard" style="display:flex;align-items:center;gap:8px">' +
      '<button aria-label="Día anterior" class="btn bsm bghost" type="button" onclick="window.nxMdFechaMueve(-1)"><i class="ti ti-chevron-left"></i></button>' +
      '<input type="date" value="' + _mdFecha + '" onchange="window.nxMdFechaSet(this.value)" style="flex:1;border:1px solid #cbd5e1;border-radius:10px;padding:8px;font-size:13px;text-align:center">' +
      '<button aria-label="Día siguiente" class="btn bsm bghost" type="button" onclick="window.nxMdFechaMueve(1)"><i class="ti ti-chevron-right"></i></button>' +
      '<button class="btn bsm bc1" type="button" onclick="window.nxMdCitaNueva()"><i class="ti ti-plus"></i> Cita</button></div>';
    var lista = del.length ? del.map(filaCita).join('') : '<div class="nxMdEmpty"><i class="ti ti-calendar-off"></i>Sin citas el ' + fechaDMY(_mdFecha) + '</div>';
    return nav + lista;
  }

  window.nxMdCitaNueva = function () {
    var ops = _pacs.filter(function (p) { return p.activo !== false; }).map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + '</option>'; }).join('');
    modal('nxMdMCita',
      '<div style="font-weight:800;font-size:14px;margin-bottom:10px"><i class="ti ti-calendar-plus" style="color:#0d9488"></i> Nueva cita</div>' +
      '<div class="nxMdFr"><label>Paciente</label><select id="mdCiPac">' + (ops || '<option value="">— registra un paciente primero —</option>') + '</select></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Fecha</label><input type="date" id="mdCiFecha" value="' + _mdFecha + '"></div>' +
      '<div class="nxMdFr"><label>Hora</label><input type="time" id="mdCiHora" value="09:00"></div></div>' +
      '<div class="nxMdFr"><label>Motivo</label><input id="mdCiMotivo" placeholder="Chequeo, seguimiento, presión..."></div>' +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxMdMCita\').remove()">Cancelar</button>' +
      '<button class="nxMdBtn p" type="button" onclick="window.nxMdCitaGuardar()">Guardar cita</button></div>');
  };
  window.nxMdCitaGuardar = async function () {
    var pid = val('mdCiPac'); if (!pid) { toast('err', 'Falta el paciente'); return; }
    var p = pacDe(pid);
    try {
      var r = await getAPI().post('med_citas', { paciente_id: pid, paciente_nombre: p ? p.nombre : null, fecha: val('mdCiFecha') || hoyISO(), hora: val('mdCiHora') || null, motivo: val('mdCiMotivo').trim() || null, estado: 'pendiente' });
      if (r && r[0]) _citas.push(r[0]);
      try { window.logAudit && window.logAudit('MED_CITA_NUEVA', (p ? p.nombre : pid) + ' · ' + val('mdCiFecha') + ' ' + val('mdCiHora'), 'Consultorio'); } catch (e) {}
      cerrar('nxMdMCita'); toast('ok', 'Cita agendada'); window.nxMdTab(_mdTab);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxMdCitaEstado = async function (id, est) {
    try {
      await getAPI().patch('med_citas', 'id=eq.' + id, { estado: est });
      var c = _citas.find(function (x) { return String(x.id) === String(id); }); if (c) c.estado = est;
      window.nxMdTab(_mdTab);
    } catch (e) { toast('err', 'Error', String(e && e.message || e)); }
  };

  // ── PACIENTES ──
  window.nxMdBuscar = function (q) { _mdQ = String(q || '').toLowerCase(); var w = document.getElementById('mdPacLista'); if (w) w.innerHTML = pacsHTML(); };
  function pacsHTML() {
    var lst = _pacs.filter(function (p) { return p.activo !== false && (!_mdQ || (p.nombre || '').toLowerCase().indexOf(_mdQ) >= 0 || (p.cedula || '').indexOf(_mdQ) >= 0 || (p.telefono || '').indexOf(_mdQ) >= 0); });
    if (!lst.length) return '<div class="nxMdEmpty" data-nbf-ignorar><i class="ti ti-user-search"></i>' + (_mdQ ? 'Sin resultados' : 'Aún no hay pacientes — registra el primero') + '</div>';
    return lst.map(function (p) {
      var ini = (p.nombre || 'P').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
      var ed = edad(p.fecha_nacimiento);
      var chips = (p.condiciones || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 3).map(function (x) { return '<span class="nxMdChip" style="background:#fff7ed;color:#9a3412">' + esc(x) + '</span>'; }).join('');
      return '<div class="nxMdRow" style="cursor:pointer" onclick="window.nxMdPacFicha(\'' + p.id + '\')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div class="nxMdAva">' + esc(ini) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="nxMdNom">' + esc(p.nombre) + (ed !== '' ? ' <span style="color:#64748b;font-weight:600;font-size:11px">· ' + ed + ' años</span>' : '') + '</div>' +
        '<div class="nxMdSub">' + esc(p.telefono || 'sin teléfono') + (p.ars ? ' · ' + esc(p.ars) : '') + '</div><div>' + chips + '</div></div>' +
        '<i class="ti ti-chevron-right" style="color:#94a3b8"></i></div>';
    }).join('');
  }
  function bodyPacientes() {
    return '<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center"><span id="mdQLupa"></span>' +
      '<button aria-label="Nuevo paciente" class="btn bc1" type="button" style="border-radius:999px;flex:none;margin-left:auto" onclick="window.nxMdPacNuevo()"><i class="ti ti-user-plus"></i></button></div>' +
      '<div id="mdPacLista">' + pacsHTML() + '</div>';
  }
  // NPGS §5: lupa colapsada. cont: sirve — las filas son <div> hijos directos de #mdPacLista
  // (se reconstruyen por tecla); el estado vacío lleva data-nbf-ignorar.
  function pintarLupaMd() {
    var box = document.getElementById('mdQLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_mdQ')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'mdQ',
      placeholder: 'Nombre, cédula o teléfono…', value: _mdQ,
      onterm: function (v) { window.nxMdBuscar(v); }
    });
  }
  function formPac(p) {
    p = p || {};
    return '<div class="nxMdG2"><div class="nxMdFr"><label>Nombre completo *</label><input id="mdPNom" value="' + esc(p.nombre || '') + '"></div>' +
      '<div class="nxMdFr"><label>Cédula</label><input id="mdPCed" value="' + esc(p.cedula || '') + '"></div></div>' +
      '<div class="nxMdG3"><div class="nxMdFr"><label>Nacimiento</label><input type="date" id="mdPNac" value="' + esc(p.fecha_nacimiento || '') + '"></div>' +
      '<div class="nxMdFr"><label>Sexo</label><select id="mdPSexo"><option value="">—</option><option' + (p.sexo === 'M' ? ' selected' : '') + ' value="M">Masculino</option><option' + (p.sexo === 'F' ? ' selected' : '') + ' value="F">Femenino</option></select></div>' +
      '<div class="nxMdFr"><label>Sangre</label><input id="mdPSan" value="' + esc(p.sangre || '') + '" placeholder="O+"></div></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Teléfono</label><input id="mdPTel" value="' + esc(p.telefono || '') + '"></div>' +
      '<div class="nxMdFr"><label>ARS</label><input id="mdPArs" value="' + esc(p.ars || '') + '" placeholder="SENASA, Humano..."></div></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Familiar responsable</label><input id="mdPConNom" value="' + esc(p.contacto_nombre || '') + '"></div>' +
      '<div class="nxMdFr"><label>Tel. del familiar</label><input id="mdPConTel" value="' + esc(p.contacto_telefono || '') + '"></div></div>' +
      '<div class="nxMdFr"><label>Dirección</label><input id="mdPDir" value="' + esc(p.direccion || '') + '"></div>' +
      '<div class="nxMdFr"><label>Alergias</label><input id="mdPAle" value="' + esc(p.alergias || '') + '" placeholder="Penicilina, sulfas..."></div>' +
      '<div class="nxMdFr"><label>Condiciones crónicas (separadas por coma)</label><input id="mdPCond" value="' + esc(p.condiciones || '') + '" placeholder="Hipertensión, diabetes, artritis..."></div>' +
      '<div class="nxMdFr"><label>Medicamentos actuales</label><textarea id="mdPMed" rows="2" placeholder="Losartán 50mg 1/día...">' + esc(p.medicamentos || '') + '</textarea></div>';
  }
  window.nxMdPacNuevo = function () {
    modal('nxMdMPac', '<div style="font-weight:800;font-size:14px;margin-bottom:10px"><i class="ti ti-user-plus" style="color:#0d9488"></i> Nuevo paciente</div>' + formPac() +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxMdMPac\').remove()">Cancelar</button>' +
      '<button class="nxMdBtn p" type="button" onclick="window.nxMdPacGuardar()">Guardar paciente</button></div>', 620);
  };
  window.nxMdPacEditar = function (id) {
    var p = pacDe(id); if (!p) return;
    modal('nxMdMPac', '<div style="font-weight:800;font-size:14px;margin-bottom:10px"><i class="ti ti-edit" style="color:#0d9488"></i> Editar paciente</div>' + formPac(p) +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxMdMPac\').remove()">Cancelar</button>' +
      '<button class="nxMdBtn p" type="button" onclick="window.nxMdPacGuardar(\'' + id + '\')">Guardar cambios</button></div>', 620);
  };
  window.nxMdPacGuardar = async function (id) {
    var nom = val('mdPNom').trim(); if (!nom) { toast('err', 'Falta el nombre'); return; }
    var d = { nombre: nom.toUpperCase(), cedula: val('mdPCed').trim() || null, fecha_nacimiento: val('mdPNac') || null, sexo: val('mdPSexo') || null, sangre: val('mdPSan').trim() || null, telefono: val('mdPTel').trim() || null, ars: val('mdPArs').trim() || null, contacto_nombre: val('mdPConNom').trim() || null, contacto_telefono: val('mdPConTel').trim() || null, direccion: val('mdPDir').trim() || null, alergias: val('mdPAle').trim() || null, condiciones: val('mdPCond').trim() || null, medicamentos: val('mdPMed').trim() || null };
    try {
      if (id) { await getAPI().patch('med_pacientes', 'id=eq.' + id, d); var i = _pacs.findIndex(function (x) { return String(x.id) === String(id); }); if (i >= 0) _pacs[i] = Object.assign({}, _pacs[i], d); }
      else { var r = await getAPI().post('med_pacientes', d); if (r && r[0]) _pacs.push(r[0]); _pacs.sort(function (a, b) { return String(a.nombre).localeCompare(String(b.nombre)); }); }
      try { window.logAudit && window.logAudit(id ? 'MED_PACIENTE_EDITADO' : 'MED_PACIENTE_NUEVO', nom, 'Consultorio'); } catch (e) {}
      cerrar('nxMdMPac'); toast('ok', id ? 'Paciente actualizado' : 'Paciente registrado', nom); window.nxMdTab(_mdTab);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxMdPacFicha = function (id) {
    var p = pacDe(id); if (!p) return;
    var ed = edad(p.fecha_nacimiento);
    var hist = _cons.filter(function (c) { return String(c.paciente_id) === String(id); }).slice(0, 12);
    var histH = hist.length ? hist.map(function (c) {
      return '<div class="nxMdRow" style="cursor:pointer" onclick="window.nxMdConVer(\'' + c.id + '\')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div style="flex:1"><div class="nxMdNom" style="font-size:12px">' + esc(c.diagnostico || c.motivo || 'Consulta') + '</div><div class="nxMdSub">' + fechaDMY(c.fecha) + (Number(c.precio) ? ' · ' + fmt(c.precio) : '') + '</div></div>' + (c.receta ? '<i class="ti ti-prescription" style="color:#0d9488"></i>' : '') + '</div>';
    }).join('') : '<div class="nxMdEmpty" style="padding:14px"><i class="ti ti-clipboard-off"></i>Sin consultas todavía</div>';
    var info = function (l, v) { return v ? '<div style="margin-bottom:6px"><span style="font-size:9.5px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.4px">' + l + '</span><div style="font-size:12.5px;color:#0f172a">' + esc(v) + '</div></div>' : ''; };
    modal('nxMdMFicha',
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><div class="nxMdAva" style="width:46px;height:46px;font-size:17px">' + esc((p.nombre || 'P')[0]) + '</div>' +
      '<div style="flex:1"><div style="font-weight:800;font-size:15px">' + esc(p.nombre) + '</div><div class="nxMdSub">' + (ed !== '' ? ed + ' años · ' : '') + esc(p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : '') + (p.sangre ? ' · ' + esc(p.sangre) : '') + '</div></div>' +
      (p.telefono ? '<a class="btn bsm" style="background:#f0fdf4;color:#16a34a;border:0" href="https://wa.me/1' + String(p.telefono).replace(/\D/g, '') + '" target="_blank"><i class="ti ti-brand-whatsapp"></i></a>' : '') + '</div>' +
      '<div class="nxMdG2">' + info('Cédula', p.cedula) + info('Teléfono', p.telefono) + info('ARS', p.ars) + info('Dirección', p.direccion) + info('Familiar responsable', p.contacto_nombre) + info('Tel. familiar', p.contacto_telefono) + '</div>' +
      (p.alergias ? '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 10px;margin:6px 0"><b style="font-size:10px;color:#dc2626;text-transform:uppercase"><i class="ti ti-alert-triangle"></i> Alergias</b><div style="font-size:12px;color:#7f1d1d">' + esc(p.alergias) + '</div></div>' : '') +
      info('Condiciones crónicas', p.condiciones) + info('Medicamentos actuales', p.medicamentos) +
      '<div style="font-weight:800;font-size:12.5px;margin:10px 0 6px"><i class="ti ti-history" style="color:#0d9488"></i> Historial de consultas</div>' + histH +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="window.nxMdPacEditar(\'' + id + '\')"><i class="ti ti-edit"></i> Editar</button>' +
      '<button class="nxMdBtn p" type="button" onclick="document.getElementById(\'nxMdMFicha\').remove();window.nxMdConNueva(\'' + id + '\')"><i class="ti ti-stethoscope"></i> Nueva consulta</button></div>', 620);
  };

  // ── CONSULTAS ──
  function bodyConsultas() {
    var lst = _cons.slice(0, 60);
    var h = lst.length ? lst.map(function (c) {
      return '<div class="nxMdRow" style="cursor:pointer" onclick="window.nxMdConVer(\'' + c.id + '\')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button"><div style="flex:1;min-width:0"><div class="nxMdNom">' + esc(nomPac(c)) + '</div>' +
        '<div class="nxMdSub">' + esc(c.diagnostico || c.motivo || 'Consulta') + ' · ' + fechaDMY(c.fecha) + '</div></div>' +
        (Number(c.precio) ? '<span class="nxMdChip" style="background:' + (c.pagado ? '#f0fdf4;color:#16a34a' : '#fffbeb;color:#d97706') + '">' + fmt(c.precio) + (c.pagado ? ' ✓' : '') + '</span>' : '') +
        (c.receta ? '<i class="ti ti-prescription" style="color:#0d9488"></i>' : '') + '</div>';
    }).join('') : '<div class="nxMdEmpty"><i class="ti ti-clipboard-plus"></i>Aún no hay consultas</div>';
    // Resumen de ingresos del mes en curso
    var mesKey = hoyISO().slice(0, 7);
    var cm = _cons.filter(function (c) { return String(c.fecha).slice(0, 7) === mesKey; });
    var tot = cm.reduce(function (t, c) { return t + Number(c.precio || 0); }, 0);
    var cob = cm.filter(function (c) { return c.pagado; }).reduce(function (t, c) { return t + Number(c.precio || 0); }, 0);
    var ing = '<div class="nxMdKpis" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">' +
      '<div class="nxMdKpi"><b>' + fmt(tot) + '</b><span>Facturado (mes)</span></div>' +
      '<div class="nxMdKpi"><b style="color:#16a34a">' + fmt(cob) + '</b><span>Cobrado</span></div>' +
      '<div class="nxMdKpi"><b style="color:#d97706">' + fmt(tot - cob) + '</b><span>Pendiente</span></div>' +
      '</div>';
    return ing + '<div style="display:flex;justify-content:flex-end;gap:7px;margin-bottom:10px">' +
      '<button class="btn bsm bghost" type="button" onclick="window.nxMdRepIngresos()"><i class="ti ti-printer"></i> Reporte del mes</button>' +
      '<button class="btn bc1" type="button" onclick="window.nxMdConNueva()"><i class="ti ti-plus"></i> Nueva consulta</button></div>' + h;
  }

  // ── Reporte de ingresos del mes (imprimible) ──
  window.nxMdRepIngresos = function () {
    var mesKey = hoyISO().slice(0, 7);
    var cm = _cons.filter(function (c) { return String(c.fecha).slice(0, 7) === mesKey; })
      .sort(function (a, b) { return String(a.fecha).localeCompare(String(b.fecha)); });
    var s = curSes(); var org = (s && s.org) || {};
    var nomNeg = (org.tipo === 'consultorio' && org.nombre) ? org.nombre : 'Consultorio Geriátrico';
    var mesNom = new Date(mesKey + '-15T12:00:00').toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    var tot = 0, cob = 0;
    var filas = cm.map(function (c) {
      tot += Number(c.precio || 0); if (c.pagado) cob += Number(c.precio || 0);
      return '<tr><td>' + String(c.fecha).slice(0, 10) + '</td><td>' + esc(nomPac(c)) + '</td><td>' + esc(c.diagnostico || c.motivo || '') + '</td>' +
        '<td style="text-align:right">' + fmt(c.precio) + '</td><td style="text-align:center">' + (c.pagado ? '✓ Pagada' : 'Pendiente') + '</td></tr>';
    }).join('');
    var w = window.open('', '_blank');
    if (!w) { toast('err', 'Permite las ventanas emergentes'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Ingresos ' + esc(mesNom) + '</title><style>' +
      'body{font-family:Segoe UI,system-ui,-apple-system,sans-serif;padding:26px;color:#1e293b}h1{font-size:17px;color:#0f766e;margin:0}small{color:#64748b}' +
      'table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}th{background:#f0fdfa;color:#0f766e;text-align:left;padding:7px 8px;border-bottom:2px solid #0d9488}td{padding:6px 8px;border-bottom:1px solid #e2e8f0}' +
      '.tot{margin-top:14px;font-size:13px;text-align:right}.tot b{font-size:15px;color:#0f766e}@media print{body{padding:12px}}</style></head><body>' +
      '<h1>' + esc(nomNeg) + '</h1><small>Reporte de consultas e ingresos · ' + esc(mesNom) + ' · ' + cm.length + ' consulta(s)</small>' +
      '<table><tr><th>Fecha</th><th>Paciente</th><th>Diagnóstico / motivo</th><th style="text-align:right">Precio</th><th style="text-align:center">Estado</th></tr>' +
      (filas || '<tr><td colspan="5" style="text-align:center;color:#94a3b8">Sin consultas este mes</td></tr>') + '</table>' +
      '<div class="tot">Facturado: <b>' + fmt(tot) + '</b> · Cobrado: <b style="color:#16a34a">' + fmt(cob) + '</b> · Pendiente: <b style="color:#d97706">' + fmt(tot - cob) + '</b></div>' +
      '<script>window.print();<\/script></body></html>');
    w.document.close();
  };
  // Plantilla de examen físico por sistemas (sale con lo normal; el doctor cambia solo lo anormal)
  var EXAM_SISTEMAS = [
    ['general', 'Estado general', 'Alerta, orientado, buen estado general, afebril'],
    ['cabeza', 'Cabeza', 'Normocéfalo, sin lesiones'],
    ['ojos', 'Ojos', 'Pupilas isocóricas reactivas, conjuntivas normales'],
    ['orl', 'Oído/Nariz/Garganta', 'Sin secreciones, faringe normal'],
    ['cuello', 'Cuello', 'Sin adenopatías, tiroides normal, sin ingurgitación yugular'],
    ['torax', 'Tórax / Pulmones', 'Murmullo vesicular conservado, sin estertores'],
    ['cardio', 'Cardiovascular', 'Ruidos cardíacos rítmicos, sin soplos'],
    ['abdomen', 'Abdomen', 'Blando, depresible, no doloroso, sin masas'],
    ['extremidades', 'Extremidades', 'Sin edema, pulsos presentes, movilidad conservada'],
    ['neuro', 'Neurológico', 'Sin déficit focal, fuerza y sensibilidad conservadas'],
    ['piel', 'Piel', 'Íntegra, sin lesiones'],
    ['mental', 'Estado mental / cognición', 'Sin deterioro evidente'],
    ['marcha', 'Marcha / equilibrio', 'Marcha estable, sin riesgo de caídas']
  ];
  window.nxMdExReset = function () { EXAM_SISTEMAS.forEach(function (s) { var el = document.getElementById('mdEx_' + s[0]); if (el) el.value = s[2]; }); };
  window.nxMdConNueva = function (pacId, citaId) {
    var ops = _pacs.filter(function (p) { return p.activo !== false; }).map(function (p) { return '<option value="' + p.id + '"' + (String(p.id) === String(pacId || '') ? ' selected' : '') + '>' + esc(p.nombre) + '</option>'; }).join('');
    modal('nxMdMCon',
      '<div style="font-weight:800;font-size:14px;margin-bottom:10px"><i class="ti ti-report-medical" style="color:#0d9488"></i> Nueva consulta</div>' +
      '<div class="nxMdFr"><label>Paciente</label><select id="mdCoPac">' + (ops || '<option value="">— registra un paciente primero —</option>') + '</select></div>' +
      '<div class="nxMdFr"><label>Motivo</label><input id="mdCoMotivo" placeholder="Chequeo general, dolor..."></div>' +
      '<div style="font-size:10.5px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:.4px;margin:4px 0">Signos vitales</div>' +
      '<div class="nxMdG3"><div class="nxMdFr"><label>Presión</label><input id="mdCoPre" placeholder="120/80"></div>' +
      '<div class="nxMdFr"><label>Pulso</label><input id="mdCoPul" placeholder="72"></div>' +
      '<div class="nxMdFr"><label>Temp. °C</label><input id="mdCoTem" placeholder="36.8"></div>' +
      '<div class="nxMdFr"><label>Peso lb</label><input id="mdCoPes" placeholder="150"></div>' +
      '<div class="nxMdFr"><label>Glucosa</label><input id="mdCoGlu" placeholder="98"></div></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin:6px 0 2px"><span style="font-size:10.5px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:.4px">Examen físico por sistemas</span><button type="button" onclick="window.nxMdExReset()" style="border:1px solid #99f6e4;background:#f0fdfa;color:#0d9488;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit">Todo normal</button></div>' +
      '<div style="font-size:10.5px;color:#94a3b8;margin-bottom:6px">Ya viene con lo normal — cambia solo lo que encuentres anormal.</div>' +
      '<div style="display:grid;gap:5px;margin-bottom:8px">' + EXAM_SISTEMAS.map(function (s) { return '<div style="display:grid;grid-template-columns:132px 1fr;gap:8px;align-items:center"><label style="font-size:11px;font-weight:700;color:#0f766e">' + esc(s[1]) + '</label><input id="mdEx_' + s[0] + '" value="' + esc(s[2]) + '" style="width:100%;height:34px;border:1.5px solid #e2e8f0;border-radius:8px;padding:0 9px;font-size:12.5px;color:#0f172a;background:#fff;font-family:inherit;outline:none"></div>'; }).join('') + '</div>' +
      '<div class="nxMdFr"><label>Diagnóstico</label><input id="mdCoDia"></div>' +
      '<div class="nxMdFr"><label>Tratamiento / plan</label><textarea id="mdCoTra" rows="2"></textarea></div>' +
      '<div class="nxMdFr"><label>Récipe (una línea por medicamento)</label><textarea id="mdCoRec" rows="3" placeholder="Losartán 50mg — 1 diaria x 30 días"></textarea></div>' +
      '<div class="nxMdFr"><label>Indicaciones al paciente</label><textarea id="mdCoInd" rows="2"></textarea></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Precio consulta RD$</label><input id="mdCoPre2" data-nx-money inputmode="numeric" placeholder="1,500"></div>' +
      '<div class="nxMdFr"><label>¿Pagada?</label><select id="mdCoPag"><option value="si">Sí, pagada</option><option value="no">Pendiente</option></select></div></div>' +
      '<input type="hidden" id="mdCoCita" value="' + esc(citaId || '') + '">' +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxMdMCon\').remove()">Cancelar</button>' +
      '<button class="nxMdBtn p" type="button" onclick="window.nxMdConGuardar()">Guardar consulta</button></div>', 640);
  };
  window.nxMdConGuardar = async function () {
    var pid = val('mdCoPac'); if (!pid) { toast('err', 'Falta el paciente'); return; }
    var p = pacDe(pid); var citaId = val('mdCoCita');
    var _ex = EXAM_SISTEMAS.map(function (s) { var v = (val('mdEx_' + s[0]) || '').trim(); return v ? s[1] + ': ' + v : ''; }).filter(Boolean).join('\n');
    var d = { paciente_id: pid, paciente_nombre: p ? p.nombre : null, cita_id: citaId || null, fecha: hoyISO(), motivo: val('mdCoMotivo').trim() || null, presion: val('mdCoPre').trim() || null, pulso: val('mdCoPul').trim() || null, temperatura: val('mdCoTem').trim() || null, peso: val('mdCoPes').trim() || null, glucosa: val('mdCoGlu').trim() || null, examen_fisico: _ex || null, diagnostico: val('mdCoDia').trim() || null, tratamiento: val('mdCoTra').trim() || null, receta: val('mdCoRec').trim() || null, indicaciones: val('mdCoInd').trim() || null, precio: moneyVal('mdCoPre2'), pagado: val('mdCoPag') === 'si' };
    try {
      var r = await getAPI().post('med_consultas', d);
      if (r && r[0]) _cons.unshift(r[0]);
      if (citaId) { try { await getAPI().patch('med_citas', 'id=eq.' + citaId, { estado: 'atendida' }); var ci = _citas.find(function (x) { return String(x.id) === String(citaId); }); if (ci) ci.estado = 'atendida'; } catch (e) {} }
      try { window.logAudit && window.logAudit('MED_CONSULTA', (p ? p.nombre : pid) + (d.precio ? ' · ' + fmt(d.precio) : ''), 'Consultorio'); } catch (e) {}
      cerrar('nxMdMCon'); toast('ok', 'Consulta guardada', p ? p.nombre : '');
      if (r && r[0] && d.receta) window.nxMdReceta(r[0].id); else window.nxMdTab(_mdTab);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxMdConVer = function (id) {
    var c = _cons.find(function (x) { return String(x.id) === String(id); }); if (!c) return;
    var vit = [['Presión', c.presion], ['Pulso', c.pulso], ['Temp.', c.temperatura], ['Peso', c.peso], ['Glucosa', c.glucosa]].filter(function (x) { return x[1]; });
    var vitH = vit.length ? '<div class="nxMdVit">' + vit.map(function (x) { return '<div class="v"><b>' + esc(x[1]) + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>' : '';
    var sec = function (t, v) { return v ? '<div style="margin-bottom:8px"><b style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.4px">' + t + '</b><div style="font-size:12.5px;color:#0f172a;white-space:pre-wrap">' + esc(v) + '</div></div>' : ''; };
    modal('nxMdMVer',
      '<div style="font-weight:800;font-size:14px;margin-bottom:2px">' + esc(nomPac(c)) + '</div><div class="nxMdSub" style="margin-bottom:10px">' + fechaDMY(c.fecha) + (Number(c.precio) ? ' · ' + fmt(c.precio) + (c.pagado ? ' (pagada)' : ' (pendiente)') : '') + '</div>' +
      vitH + sec('Motivo', c.motivo) + sec('Examen físico', c.examen_fisico) + sec('Diagnóstico', c.diagnostico) + sec('Tratamiento', c.tratamiento) + sec('Récipe', c.receta) + sec('Indicaciones', c.indicaciones) +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxMdMVer\').remove()">Cerrar</button>' +
      (c.receta ? '<button class="nxMdBtn p" type="button" onclick="window.nxMdReceta(\'' + c.id + '\')"><i class="ti ti-printer"></i> Imprimir récipe</button>' : '') + '</div>', 600);
  };

  // ── RÉCIPE imprimible (formato médico RD) ──
  window.nxMdReceta = function (id) {
    var c = _cons.find(function (x) { return String(x.id) === String(id); }); if (!c) { toast('err', 'Consulta no encontrada'); return; }
    var p = pacDe(c.paciente_id) || {};
    var s = curSes(); var org = (s && s.org) || {};
    var nomNeg = (org.tipo === 'consultorio' && org.nombre) ? org.nombre : 'Consultorio Geriátrico';
    var ed = edad(p.fecha_nacimiento);
    var rx = (c.receta || '').split('\n').filter(Boolean).map(function (l) { return '<div style="margin-bottom:10px;font-size:15px">• ' + esc(l) + '</div>'; }).join('');
    var w = window.open('', '_blank');
    if (!w) { toast('err', 'Permite las ventanas emergentes'); return; }
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Récipe</title><style>' +
      'body{font-family:Segoe UI,system-ui,-apple-system,sans-serif;margin:0;padding:34px;color:#1e293b;max-width:640px}' +
      '.top{border-bottom:3px double #0d9488;padding-bottom:12px;margin-bottom:16px;text-align:center}' +
      '.top h1{margin:0;font-size:21px;color:#0f766e;letter-spacing:.5px}.top small{color:#64748b;font-size:11px}' +
      '.dat{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}' +
      '.rx{font-size:44px;color:#0f766e;font-weight:700;margin:16px 0 6px;font-family:Segoe UI,system-ui,-apple-system,sans-serif}' +
      '.ind{margin-top:22px;background:#f8fafc;border-left:3px solid #0d9488;padding:10px 12px;font-size:12.5px}' +
      '.firma{margin-top:70px;text-align:center}.firma .line{border-top:1.5px solid #1e293b;width:250px;margin:0 auto 4px}' +
      '.firma small{font-size:11px;color:#64748b}@media print{body{padding:20px}}</style></head><body>' +
      '<div class="top"><h1>' + esc(nomNeg) + '</h1><small>Medicina Geriátrica · Consulta y seguimiento del adulto mayor</small></div>' +
      '<div class="dat"><span><b>Paciente:</b> ' + esc(p.nombre || c.paciente_nombre || '') + '</span><span><b>Edad:</b> ' + (ed !== '' ? ed + ' años' : '—') + '</span><span><b>Fecha:</b> ' + fechaDMY(c.fecha) + '</span></div>' +
      (c.diagnostico ? '<div style="font-size:12px;color:#475569"><b>Dx:</b> ' + esc(c.diagnostico) + '</div>' : '') +
      '<div class="rx">℞</div>' + (rx || '<div style="color:#94a3b8">—</div>') +
      (c.indicaciones ? '<div class="ind"><b>Indicaciones:</b><br>' + esc(c.indicaciones).replace(/\n/g, '<br>') + '</div>' : '') +
      '<div class="firma"><div class="line"></div><small>Firma y exequátur</small></div>' +
      '<script>window.print();<\/script></body></html>');
    w.document.close();
  };

  // ── Registro en el hub Multiempresa ──
  function registrar() { try { if (window.nxMERegistrar) window.nxMERegistrar({ orden: 5, nombre: 'Consultorio Médico', desc: 'Pacientes, citas, consultas y récipes', icon: 'ti-stethoscope', color: '#0d9488', bg: '#f0fdfa', onclick: 'window.nxAbrirConsultorio()' }); } catch (e) {} }
  function init() { inyectarCSS(); var n = 0; var t = function () { n++; if (window.nxMERegistrar) { registrar(); return; } if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

/* ===================== MÓDULO CLIENTES SaaS (cobros por sistema/base) =====================
   Control del DUEÑO: los clientes que pagan mensualidad por su sistema (Deluxe, Amatista,
   Consultorio...). Tablas saas_suscripciones + saas_pagos (org+RLS). Solo admin. */
(function () {
  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]; }); }
  function fmt(n) { return 'RD$ ' + Math.round(Number(n || 0)).toLocaleString('en-US'); }
  function toast() { try { return window.toast.apply(null, arguments); } catch (e) {} }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function moneyVal(id) { var e = document.getElementById(id); if (!e) return 0; try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(e.value)) || 0; } catch (er) {} return Number(String(e.value).replace(/[^0-9.-]/g, '')) || 0; }
  function curSes() { try { return (typeof sesion !== 'undefined') ? sesion : window.sesion; } catch (e) { try { return window.sesion; } catch (_) { return null; } } }
  function esAdmin() { var s = curSes(); return !!(s && s.rol === 'admin'); }
  function cerrar(id) { var o = document.getElementById(id); if (o) o.remove(); }
  function modal(id, html, maxw) {
    cerrar(id);
    var o = document.createElement('div'); o.id = id; o.className = 'nxMdOv';
    o.innerHTML = '<div class="nxMdModal" style="max-width:' + (maxw || 540) + 'px">' + html + '</div>';
    o.addEventListener('click', function (ev) { if (ev.target === o) o.remove(); });
    document.body.appendChild(o);
  }
  function mesActual() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function mesNombre(p) { try { return new Date(p + '-15T12:00:00').toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }); } catch (e) { return p; } }

  var _sus = [], _pagos = [];
  var SA_CSS = '\n.nxSaCard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px;margin-bottom:9px;box-shadow:0 3px 10px rgba(15,23,42,.05)}\n.nxSaTop{display:flex;align-items:center;gap:10px;margin-bottom:8px}\n.nxSaIco{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#047857;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none}\n.nxSaNom{font-weight:800;font-size:13.5px;color:#0f172a;line-height:1.15}\n.nxSaSub{font-size:10.5px;color:#64748b;margin-top:1px}\n.nxSaEst{font-size:10px;font-weight:800;padding:4px 10px;border-radius:999px;flex:none}\n.nxSaMeta{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#475569;margin-bottom:9px}\n.nxSaMeta b{color:#0f172a}\n.nxSaBtns{display:flex;gap:6px;flex-wrap:wrap}\n';
  function inyectarCSS() { if (document.getElementById('nxSaCSS')) return; var s = document.createElement('style'); s.id = 'nxSaCSS'; s.textContent = SA_CSS; document.head.appendChild(s); if (!document.getElementById('nxMdCSS')) { /* usa modal del consultorio si no está */ var s2 = document.createElement('style'); s2.id = 'nxMdCSS'; s2.textContent = '.nxMdOv{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:18px 10px;overflow:auto}.nxMdModal{background:#fff;border-radius:16px;box-shadow:0 22px 60px rgba(15,23,42,.28);width:100%;padding:16px;margin:auto 0}.nxMdFr{margin-bottom:9px}.nxMdFr label{display:block;font-size:10.5px;font-weight:700;color:#475569;margin-bottom:3px;text-transform:uppercase}.nxMdFr input,.nxMdFr select,.nxMdFr textarea{width:100%;border:1px solid #cbd5e1;border-radius:10px;padding:9px 10px;font-size:13px;font-family:inherit}.nxMdG2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.nxMdBtns{display:flex;gap:7px;margin-top:12px}.nxMdBtn{flex:1;border:0;border-radius:11px;padding:11px;font-size:13px;font-weight:800;cursor:pointer}.nxMdBtn.p{background:#0d9488;color:#fff}.nxMdBtn.g{background:#f1f5f9;color:#334155}.nxMdKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px}.nxMdKpi{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:11px 12px}.nxMdKpi b{display:block;font-size:16px;color:#0f172a}.nxMdKpi span{font-size:10px;color:#64748b;font-weight:600;text-transform:uppercase}'; document.head.appendChild(s2); } }

  function ensureView() {
    var v = document.getElementById('v-saas');
    if (v) return v;
    var dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-saas';
    dash.parentElement.appendChild(v);
    return v;
  }
  async function cargarSaas() {
    try { _sus = await getAPI().get('saas_suscripciones', 'select=*&order=nombre.asc') || []; } catch (e) { _sus = []; }
    try { _pagos = await getAPI().get('saas_pagos', 'select=*&order=fecha.desc&limit=500') || []; } catch (e) { _pagos = []; }
  }
  function pagosDe(id) { return _pagos.filter(function (p) { return String(p.suscripcion_id) === String(id); }); }
  function pagadoMes(id) { var m = mesActual(); return pagosDe(id).some(function (p) { return String(p.periodo || '').slice(0, 7) === m; }); }

  window.nxAbrirSaas = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    inyectarCSS();
    var view = ensureView(); if (!view) return;
    try { window.nxGuardarLugar && window.nxGuardarLugar('saas'); } catch (e) {}
    document.querySelectorAll('.view').forEach(function (x) { x.classList.remove('on'); });
    view.classList.add('on');
    var pt = document.getElementById('pttl'); if (pt) pt.textContent = 'CLIENTES SaaS';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div></div></div>';
    try { await cargarSaas(); renderSaas(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudo cargar.</div></div>'; }
  };

  function renderSaas(view) {
    var m = mesActual();
    var activos = _sus.filter(function (s) { return s.activo !== false; });
    var esperado = activos.reduce(function (t, s) { return t + Number(s.mensualidad || 0); }, 0);
    var cobradoMes = _pagos.filter(function (p) { return String(p.periodo || '').slice(0, 7) === m; }).reduce(function (t, p) { return t + Number(p.monto || 0); }, 0);
    var alDia = activos.filter(function (s) { return pagadoMes(s.id); }).length;
    var hoy = new Date().getDate();
    var cards = _sus.map(function (s) {
      var pagado = pagadoMes(s.id);
      var vencido = !pagado && hoy > Number(s.dia_cobro || 1);
      var est = s.activo === false ? ['#64748b', '#f1f5f9', 'INACTIVO'] : pagado ? ['#16a34a', '#f0fdf4', 'PAGADO ' + mesNombre(m).split(' ')[0].toUpperCase()] : vencido ? ['#dc2626', '#fef2f2', 'VENCIDO'] : ['#d97706', '#fffbeb', 'POR COBRAR'];
      var ult = pagosDe(s.id)[0];
      var telW = String(s.whatsapp || '').replace(/\D/g, '');
      var msg = 'Hola' + (s.contacto ? ' ' + s.contacto : '') + ', le recordamos la mensualidad de su sistema (' + (s.nombre || '') + ') correspondiente a ' + mesNombre(m) + ': ' + fmt(s.mensualidad) + '. ¡Gracias!';
      return '<div class="nxSaCard">' +
        '<div class="nxSaTop"><div class="nxSaIco"><i class="ti ti-server-2"></i></div>' +
        '<div style="flex:1;min-width:0"><div class="nxSaNom">' + esc(s.nombre) + '</div><div class="nxSaSub">' + esc(s.sistema || '') + (s.dominio ? ' · ' + esc(s.dominio) : '') + '</div></div>' +
        '<span class="nxSaEst" style="background:' + est[1] + ';color:' + est[0] + '">' + est[2] + '</span></div>' +
        '<div class="nxSaMeta"><span>Mensualidad: <b>' + fmt(s.mensualidad) + '</b></span><span>Día de cobro: <b>' + (s.dia_cobro || 1) + '</b></span>' +
        (ult ? '<span>Último pago: <b>' + String(ult.fecha).slice(0, 10) + '</b> (' + fmt(ult.monto) + ')</span>' : '<span style="color:#94a3b8">Sin pagos registrados</span>') + '</div>' +
        '<div class="nxSaBtns">' +
        '<button class="btn bsm bc1" type="button" onclick="window.nxSaasPago(\'' + s.id + '\')"><i class="ti ti-cash"></i> Registrar pago</button>' +
        '<button aria-label="Ver el historial de pagos" class="btn bsm bghost" type="button" onclick="window.nxSaasHist(\'' + s.id + '\')"><i class="ti ti-history"></i></button>' +
        (telW ? '<a class="btn bsm" style="background:#f0fdf4;color:#16a34a;border:0" href="https://wa.me/1' + telW + '?text=' + encodeURIComponent(msg) + '" target="_blank"><i class="ti ti-brand-whatsapp"></i></a>' : '') +
        '<button aria-label="Editar este cliente" class="btn bsm bghost" type="button" onclick="window.nxSaasForm(\'' + s.id + '\')"><i class="ti ti-edit"></i></button>' +
        '</div></div>';
    }).join('');
    view.innerHTML = '<div style="max-width:760px;margin:0 auto">' +
      '<div class="nc"><div class="ch"><div><div class="ct"><i class="ti ti-server-2"></i> Clientes SaaS</div><div class="ct-s">Mensualidades de tus sistemas vendidos · ' + esc(mesNombre(m)) + '</div></div>' +
      '<div style="display:flex;gap:6px"><button class="btn bsm" type="button" onclick="window.nav&&window.nav(\'dashboard\',null)"><i class="ti ti-arrow-left"></i> Volver</button>' +
      '<button class="btn bsm bc1" type="button" onclick="window.nxSaasForm()"><i class="ti ti-plus"></i> Cliente</button></div></div>' +
      '<div class="nxMdKpis">' +
      '<div class="nxMdKpi"><b>' + fmt(esperado) + '</b><span>Esperado / mes</span></div>' +
      '<div class="nxMdKpi"><b style="color:#16a34a">' + fmt(cobradoMes) + '</b><span>Cobrado este mes</span></div>' +
      '<div class="nxMdKpi"><b style="color:#d97706">' + fmt(Math.max(0, esperado - cobradoMes)) + '</b><span>Pendiente</span></div>' +
      '<div class="nxMdKpi"><b>' + alDia + '/' + activos.length + '</b><span>Al día</span></div>' +
      '</div>' + (cards || '<div style="text-align:center;color:#64748b;padding:26px;font-size:12px">Sin clientes — agrega el primero</div>') + '</div></div>';
  }

  window.nxSaasForm = function (id) {
    var s = id ? _sus.find(function (x) { return String(x.id) === String(id); }) : {};
    s = s || {};
    modal('nxSaM', '<div style="font-weight:800;font-size:14px;margin-bottom:10px"><i class="ti ti-server-2" style="color:#047857"></i> ' + (id ? 'Editar cliente' : 'Nuevo cliente SaaS') + '</div>' +
      '<div class="nxMdFr"><label>Nombre del negocio *</label><input id="saNom" value="' + esc(s.nombre || '') + '"></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Sistema</label><input id="saSis" value="' + esc(s.sistema || '') + '" placeholder="Salón, dental, consultorio..."></div>' +
      '<div class="nxMdFr"><label>Dominio</label><input id="saDom" value="' + esc(s.dominio || '') + '"></div></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Mensualidad RD$</label><input id="saMen" data-nx-money inputmode="numeric" value="' + (Number(s.mensualidad || 0) ? Math.round(s.mensualidad).toLocaleString('en-US') : '') + '"></div>' +
      '<div class="nxMdFr"><label>Día de cobro</label><input id="saDia" type="number" min="1" max="28" value="' + (s.dia_cobro || 1) + '"></div></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Contacto</label><input id="saCon" value="' + esc(s.contacto || '') + '"></div>' +
      '<div class="nxMdFr"><label>WhatsApp</label><input id="saWa" value="' + esc(s.whatsapp || '') + '" placeholder="8095551234"></div></div>' +
      '<div class="nxMdFr"><label>Nota</label><input id="saNota" value="' + esc(s.nota || '') + '"></div>' +
      (id ? '<div class="nxMdFr"><label>Estado</label><select id="saAct"><option value="si"' + (s.activo !== false ? ' selected' : '') + '>Activo</option><option value="no"' + (s.activo === false ? ' selected' : '') + '>Inactivo (sistema apagado)</option></select></div>' : '') +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxSaM\').remove()">Cancelar</button>' +
      '<button class="nxMdBtn p" type="button" onclick="window.nxSaasGuardar(' + (id ? '\'' + id + '\'' : '') + ')">Guardar</button></div>');
  };
  window.nxSaasGuardar = async function (id) {
    var nom = val('saNom').trim(); if (!nom) { toast('err', 'Falta el nombre'); return; }
    var d = { nombre: nom.toUpperCase(), sistema: val('saSis').trim() || null, dominio: val('saDom').trim() || null, mensualidad: moneyVal('saMen'), dia_cobro: parseInt(val('saDia')) || 1, contacto: val('saCon').trim() || null, whatsapp: val('saWa').trim() || null, nota: val('saNota').trim() || null };
    if (id) d.activo = val('saAct') !== 'no';
    try {
      if (id) { await getAPI().patch('saas_suscripciones', 'id=eq.' + id, d); var i = _sus.findIndex(function (x) { return String(x.id) === String(id); }); if (i >= 0) _sus[i] = Object.assign({}, _sus[i], d); }
      else { var r = await getAPI().post('saas_suscripciones', d); if (r && r[0]) _sus.push(r[0]); }
      try { window.logAudit && window.logAudit(id ? 'SAAS_CLIENTE_EDITADO' : 'SAAS_CLIENTE_NUEVO', nom + ' · ' + fmt(d.mensualidad) + '/mes', 'ClientesSaaS'); } catch (e) {}
      cerrar('nxSaM'); toast('ok', 'Guardado', nom);
      var v = document.getElementById('v-saas'); if (v) renderSaas(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxSaasPago = function (id) {
    var s = _sus.find(function (x) { return String(x.id) === String(id); }); if (!s) return;
    var m = mesActual();
    modal('nxSaP', '<div style="font-weight:800;font-size:14px;margin-bottom:2px"><i class="ti ti-cash" style="color:#16a34a"></i> Registrar pago</div>' +
      '<div style="font-size:11px;color:#64748b;margin-bottom:10px">' + esc(s.nombre) + '</div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Monto RD$</label><input id="spMonto" data-nx-money inputmode="numeric" value="' + (Number(s.mensualidad || 0) ? Math.round(s.mensualidad).toLocaleString('en-US') : '') + '"></div>' +
      '<div class="nxMdFr"><label>Fecha</label><input id="spFecha" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></div></div>' +
      '<div class="nxMdG2"><div class="nxMdFr"><label>Mes que cubre</label><input id="spPer" type="month" value="' + m + '"></div>' +
      '<div class="nxMdFr"><label>Método</label><select id="spMet"><option>Transferencia</option><option>Efectivo</option><option>Depósito</option><option>Otro</option></select></div></div>' +
      '<div class="nxMdFr"><label>Referencia / nota</label><input id="spRef"></div>' +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxSaP\').remove()">Cancelar</button>' +
      '<button class="nxMdBtn p" type="button" onclick="window.nxSaasPagoGuardar(\'' + id + '\')">Registrar</button></div>');
  };
  window.nxSaasPagoGuardar = async function (id) {
    var s = _sus.find(function (x) { return String(x.id) === String(id); }); if (!s) return;
    var monto = moneyVal('spMonto'); if (!monto || monto <= 0) { toast('err', 'Monto inválido'); return; }
    try {
      var r = await getAPI().post('saas_pagos', { suscripcion_id: id, monto: monto, fecha: val('spFecha') || new Date().toISOString().slice(0, 10), periodo: val('spPer') || mesActual(), metodo: val('spMet') || null, referencia: val('spRef').trim() || null });
      if (r && r[0]) _pagos.unshift(r[0]);
      try { window.logAudit && window.logAudit('SAAS_PAGO', s.nombre + ' · ' + fmt(monto) + ' · ' + (val('spPer') || mesActual()), 'ClientesSaaS'); } catch (e) {}
      cerrar('nxSaP'); toast('ok', 'Pago registrado', s.nombre + ' · ' + fmt(monto));
      var v = document.getElementById('v-saas'); if (v) renderSaas(v);
    } catch (e) { toast('err', 'No se pudo registrar', String(e && e.message || e)); }
  };
  window.nxSaasHist = function (id) {
    var s = _sus.find(function (x) { return String(x.id) === String(id); }); if (!s) return;
    var lst = pagosDe(id);
    var h = lst.length ? lst.map(function (p) {
      return '<div style="display:flex;justify-content:space-between;padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px"><span>' + String(p.fecha).slice(0, 10) + ' · ' + esc(mesNombre(String(p.periodo || '').slice(0, 7))) + (p.metodo ? ' · ' + esc(p.metodo) : '') + '</span><b>' + fmt(p.monto) + '</b></div>';
    }).join('') : '<div style="text-align:center;color:#94a3b8;padding:16px;font-size:12px">Sin pagos registrados</div>';
    var tot = lst.reduce(function (t, p) { return t + Number(p.monto || 0); }, 0);
    modal('nxSaH', '<div style="font-weight:800;font-size:14px;margin-bottom:2px"><i class="ti ti-history" style="color:#047857"></i> Historial de pagos</div>' +
      '<div style="font-size:11px;color:#64748b;margin-bottom:10px">' + esc(s.nombre) + ' · Total histórico: <b>' + fmt(tot) + '</b></div>' + h +
      '<div class="nxMdBtns"><button class="nxMdBtn g" type="button" onclick="document.getElementById(\'nxSaH\').remove()">Cerrar</button></div>');
  };

  function registrar() { try { if (window.nxMERegistrar) window.nxMERegistrar({ orden: 8, nombre: 'Clientes SaaS', desc: 'Mensualidades de tus sistemas vendidos', icon: 'ti-server-2', color: '#047857', bg: '#ecfdf5', onclick: 'window.nxAbrirSaas()' }); } catch (e) {} }
  function init() { inyectarCSS(); var n = 0; var t = function () { n++; if (window.nxMERegistrar) { registrar(); return; } if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
