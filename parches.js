/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - DETALLES DE COBRO DASHBOARD V2 PREMIUM
   Pegar AL FINAL de parches.js
   Mantiene lógica real: ST + API directo, ciclo 20-20, bancos, agentes y transferencias
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (window.__NEXUS_DETALLES_COBRO_V2_PREMIUM__) return;
  window.__NEXUS_DETALLES_COBRO_V2_PREMIUM__ = true;

  var cache = { abonos: [], transferencias: [], cargado: false };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.from((r || document).querySelectorAll(s)); }

  function getST() {
    try { return (typeof ST !== 'undefined' && ST) ? ST : {}; }
    catch (e) { return {}; }
  }

  function getAPI() {
    try { return (typeof API !== 'undefined' && API) ? API : null; }
    catch (e) { return null; }
  }

  function money(n) {
    var num = Number(n || 0);
    try { if (typeof fmt === 'function') return fmt(num); } catch (e) {}
    return 'RD$ ' + num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function toastSafe(t, a, b) {
    try { if (typeof toast === 'function') return toast(t, a, b); } catch (e) {}
    console.log(a, b || '');
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fechaLocal(v) {
    if (!v) return null;
    if (typeof v === 'string') {
      var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function iso(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function fmtPeriodoFecha(d) {
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  }

  function calcularPeriodo() {
    var hoy = new Date();
    var fin;
    if (hoy.getDate() < 20) {
      fin = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 20);
    } else {
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 20);
    }
    var inicio = new Date(fin.getFullYear(), fin.getMonth() - 1, 20);
    return { inicio: inicio, fin: fin, inicioISO: iso(inicio), finISO: iso(fin) };
  }

  function enPeriodo(fecha, periodo) {
    var d = fechaLocal(fecha);
    return !!d && d >= periodo.inicio && d < periodo.fin;
  }

  function tipoMetodo(metodo) {
    var m = norm(metodo);
    if (m.includes('efectivo')) return 'efectivo';
    if (m.includes('transferencia') || m.includes('deposito') || m.includes('depósito')) return 'banco';
    if (m.includes('cheque')) return 'cheque';
    return 'otros';
  }

  function getAgentes() {
    var st = getST();
    return Array.isArray(st.agentes) ? st.agentes : [];
  }

  function getAgente(id) {
    try { if (typeof gAgt === 'function') return gAgt(id); } catch (e) {}
    return getAgentes().find(function (a) { return String(a.id) === String(id); }) || null;
  }

  function agenteNombre(id) {
    var a = getAgente(id);
    return a ? (a.nom || a.nombre || a.name || 'Agente') : 'Sin agente';
  }

  function nombreAgenteObj(a) {
    return a ? (a.nom || a.nombre || a.name || 'Agente') : 'Sin agente';
  }

  function abonoAgenteId(a) {
    return a.agente_cobro || a.agente_id || a.agente || a.cobrador_id || '';
  }

  async function cargarAbonos(force) {
    if (cache.cargado && !force) return cache.abonos;
    var api = getAPI();
    if (!api || typeof api.get !== 'function') return [];
    try {
      var data = await api.get('abonos', 'select=*&order=fecha.desc&limit=5000');
      cache.abonos = Array.isArray(data) ? data : [];
      return cache.abonos;
    } catch (e) {
      console.warn('Detalles Cobro: no se pudieron cargar abonos', e);
      return [];
    }
  }

  async function cargarTransferencias(force) {
    if (cache.cargado && !force) return cache.transferencias;
    var api = getAPI();
    if (!api || typeof api.get !== 'function') return [];
    try {
      var data = await api.get('transferencias_agentes', 'select=*&order=fecha.desc&limit=1000');
      cache.transferencias = Array.isArray(data) ? data : [];
      return cache.transferencias;
    } catch (e) {
      cache.transferencias = [];
      return [];
    }
  }

  function calcularKPIs(abonos) {
    var out = {
      total: { monto: 0, cant: 0 },
      efectivo: { monto: 0, cant: 0 },
      banco: { monto: 0, cant: 0 },
      cheque: { monto: 0, cant: 0 },
      otros: { monto: 0, cant: 0 }
    };
    abonos.forEach(function (a) {
      var monto = Number(a.monto || 0);
      var tipo = tipoMetodo(a.metodo);
      out.total.monto += monto; out.total.cant += 1;
      out[tipo].monto += monto; out[tipo].cant += 1;
    });
    return out;
  }

  function calcularPorBanco(abonos) {
    var map = {};
    abonos.forEach(function (a) {
      if (tipoMetodo(a.metodo) !== 'banco') return;
      var banco = String(a.banco || a.banco_nombre || a.bank || 'Sin banco').trim() || 'Sin banco';
      if (!map[banco]) map[banco] = { banco: banco, monto: 0, cant: 0 };
      map[banco].monto += Number(a.monto || 0);
      map[banco].cant += 1;
    });
    return Object.values(map).sort(function (a, b) { return b.monto - a.monto; });
  }

  function calcularPorAgente(abonos, transferencias) {
    var agentes = getAgentes();
    var map = {};
    agentes.forEach(function (a) {
      var id = String(a.id);
      map[id] = { id: id, nombre: nombreAgenteObj(a), total: 0, cant: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, recibido: 0, entregado: 0, enMano: 0 };
    });
    abonos.forEach(function (a) {
      var id = String(abonoAgenteId(a) || 'SIN_AGENTE');
      if (!map[id]) map[id] = { id: id, nombre: id === 'SIN_AGENTE' ? 'Sin agente' : agenteNombre(id), total: 0, cant: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, recibido: 0, entregado: 0, enMano: 0 };
      var monto = Number(a.monto || 0);
      var tipo = tipoMetodo(a.metodo);
      map[id].total += monto;
      map[id].cant += 1;
      map[id][tipo] += monto;
    });
    transferencias.forEach(function (t) {
      var monto = Number(t.monto || 0);
      var desde = String(t.desde_agente || t.agente_origen || t.desde || '');
      var hacia = String(t.hacia_agente || t.agente_destino || t.hacia || '');
      if (desde) {
        if (!map[desde]) map[desde] = { id: desde, nombre: agenteNombre(desde), total: 0, cant: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, recibido: 0, entregado: 0, enMano: 0 };
        map[desde].entregado += monto;
      }
      if (hacia) {
        if (!map[hacia]) map[hacia] = { id: hacia, nombre: agenteNombre(hacia), total: 0, cant: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, recibido: 0, entregado: 0, enMano: 0 };
        map[hacia].recibido += monto;
      }
    });
    Object.values(map).forEach(function (x) { x.enMano = x.total + x.recibido - x.entregado; });
    return Object.values(map).sort(function (a, b) { return b.total - a.total; });
  }

  function sum(arr, key) { return arr.reduce(function (s, x) { return s + Number(x[key] || 0); }, 0); }

  function injectCSS() {
    var old = $('#nxDC-css');
    if (old) old.remove();
    if ($('#nxDC-premium-css')) return;
    var stl = document.createElement('style');
    stl.id = 'nxDC-premium-css';
    stl.textContent = `
      #nxDCTabs{display:flex;gap:8px;margin:0 0 14px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:7px;box-shadow:0 10px 26px rgba(15,23,42,.06)}
      #nxDCTabs .nxDC-tab{border:0;background:transparent;color:#64748b;border-radius:14px;padding:11px 14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;flex:1;letter-spacing:.2px}
      #nxDCTabs .nxDC-tab.active{background:#eff6ff;color:#2563eb;box-shadow:inset 0 0 0 1px #bfdbfe}
      .nxDC-pane{display:none}.nxDC-pane.active{display:block}
      #nxDetallesCobroV1{padding-bottom:90px}.nxDC-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.nxDC-title{display:flex;align-items:center;gap:12px}.nxDC-icon{width:54px;height:54px;border-radius:16px;background:#2563eb;color:#fff;display:grid;place-items:center;font-size:30px;box-shadow:0 12px 26px rgba(37,99,235,.28)}.nxDC-title h2{margin:0;color:#0f172a;font-size:30px;line-height:1;font-weight:950;letter-spacing:.3px}.nxDC-title p{margin:6px 0 0;color:#64748b;font-size:13px;font-weight:700}.nxDC-period{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:13px 16px;min-width:230px;box-shadow:0 10px 24px rgba(15,23,42,.06)}.nxDC-period small{display:block;color:#64748b;font-size:11px;font-weight:800}.nxDC-period b{display:block;margin-top:5px;color:#0f172a;font-size:13px;font-weight:950}.nxDC-refresh{margin-top:8px;width:100%}
      .nxDC-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-bottom:14px}.nxDC-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:16px;box-shadow:0 10px 25px rgba(15,23,42,.06)}.nxDC-kpi{display:flex;gap:12px;align-items:flex-start;min-height:118px}.nxDC-badge{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:22px;flex:0 0 auto}.nxDC-green{background:#16a34a}.nxDC-blue{background:#2563eb}.nxDC-orange{background:#f97316}.nxDC-purple{background:#9333ea}.nxDC-gray{background:#64748b}.nxDC-kpi h4{margin:3px 0 12px;color:#0f172a;font-size:11px;font-weight:950;text-transform:uppercase;line-height:1.25}.nxDC-kpi .val{font-size:22px;font-weight:950;line-height:1;color:#0f172a;white-space:nowrap}.nxDC-kpi .sub{margin-top:10px;color:#64748b;font-size:11px;font-weight:700}.nxDC-kpi.total .val{color:#16a34a}.nxDC-kpi.bank .val{color:#2563eb}.nxDC-kpi.cheque .val{color:#f97316}.nxDC-kpi.otros .val{color:#9333ea}
      .nxDC-grid2{display:grid;grid-template-columns:1.1fr .9fr;gap:14px;margin-bottom:14px}.nxDC-section-title{font-size:13px;font-weight:950;color:#0f172a;margin:0 0 14px;text-transform:uppercase}.nxDC-method-wrap{display:grid;grid-template-columns:170px 1fr;gap:18px;align-items:center}.nxDC-donut{width:150px;height:150px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#16a34a 0 var(--ef),#2563eb var(--ef) var(--bc),#f97316 var(--bc) var(--ch),#9333ea var(--ch) 100%);position:relative}.nxDC-donut:after{content:"";width:82px;height:82px;background:#fff;border-radius:50%;position:absolute}.nxDC-donut span{position:relative;z-index:1;text-align:center;color:#0f172a;font-weight:950;font-size:13px;line-height:1.1}.nxDC-legend{display:grid;gap:8px}.nxDC-leg{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;border-bottom:1px solid #eef2f7;padding-bottom:8px;font-size:12px}.nxDC-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}.nxDC-bank-list{display:grid;gap:10px}.nxDC-bank-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;border-bottom:1px solid #eef2f7;padding:8px 0}.nxDC-bank-row b{color:#0f172a;font-size:13px}.nxDC-bank-row small{display:block;color:#64748b;font-size:10px;font-weight:700;margin-top:2px}.nxDC-bank-row strong{color:#0f172a;font-size:13px}.nxDC-total-line{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:2px solid #eef2f7;font-weight:950}.nxDC-total-line b{color:#2563eb}
      .nxDC-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.nxDC-table{width:100%;border-collapse:collapse;min-width:760px}.nxDC-table th{background:#f8fafc;color:#0f172a;text-align:left;font-size:11px;text-transform:uppercase;padding:12px;border-bottom:1px solid #e2e8f0}.nxDC-table td{padding:12px;border-bottom:1px solid #eef2f7;color:#0f172a;font-size:12px;font-weight:700}.nxDC-table .money-green{color:#16a34a;font-weight:950}.nxDC-table .money-blue{color:#2563eb;font-weight:950}.nxDC-avatar{width:30px;height:30px;border-radius:50%;display:inline-grid;place-items:center;background:#2563eb;color:#fff;font-weight:950;margin-right:8px}.nxDC-transfer-grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:14px}.nxDC-transfer-mini{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nxDC-transfer-box{background:#f8fafc;border-radius:16px;padding:18px;border:1px solid #e2e8f0}.nxDC-transfer-box b{display:block;font-size:22px;margin-top:8px}.nxDC-transfer-box.green b{color:#16a34a}.nxDC-transfer-box.blue b{color:#2563eb}.nxDC-neto{margin-top:14px;padding-top:14px;border-top:1px solid #e2e8f0}.nxDC-neto strong{display:block;font-size:24px;color:#2563eb;margin-top:8px}.nxDC-empty{padding:20px;text-align:center;color:#64748b;font-weight:800;border:1px dashed #cbd5e1;border-radius:16px;background:#f8fafc}
      @media(max-width:900px){.nxDC-head{display:grid}.nxDC-period{min-width:0}.nxDC-kpis{grid-template-columns:1fr 1fr}.nxDC-grid2{grid-template-columns:1fr}.nxDC-method-wrap{grid-template-columns:1fr}.nxDC-donut{margin:auto}.nxDC-transfer-grid{grid-template-columns:1fr}}
      @media(max-width:560px){#nxDCTabs .nxDC-tab{font-size:12px;padding:10px 8px}.nxDC-title h2{font-size:24px}.nxDC-kpis{grid-template-columns:1fr}.nxDC-kpi{min-height:auto}.nxDC-transfer-mini{grid-template-columns:1fr}.nxDC-leg{grid-template-columns:1fr auto}.nxDC-leg .pct{display:none}}
    `;
    document.head.appendChild(stl);
  }

  function crearPestanasDashboard() {
    var dash = $('#v-dashboard');
    if (!dash) return false;

    var tabs = $('#nxDCTabs');
    var resumen = $('#nxDCResumen');
    var detalles = $('#nxDetallesCobroV1');

    if (!tabs || !resumen || !detalles) {
      var hijos = Array.from(dash.children).filter(function (el) { return el.id !== 'nxDCTabs' && el.id !== 'nxDCResumen' && el.id !== 'nxDetallesCobroV1'; });
      tabs = document.createElement('div');
      tabs.id = 'nxDCTabs';
      tabs.innerHTML = '<button class="nxDC-tab active" type="button" data-tab="resumen" onclick="window.nxDashboardTab(\'resumen\')"><i class="ti ti-layout-dashboard"></i> Resumen</button><button class="nxDC-tab" type="button" data-tab="detalles" onclick="window.nxDashboardTab(\'detalles\')"><i class="ti ti-wallet"></i> Detalles de Cobro</button>';
      resumen = document.createElement('div');
      resumen.id = 'nxDCResumen';
      resumen.className = 'nxDC-pane active';
      hijos.forEach(function (h) { resumen.appendChild(h); });
      detalles = document.createElement('div');
      detalles.id = 'nxDetallesCobroV1';
      detalles.className = 'nxDC-pane';
      dash.appendChild(tabs);
      dash.appendChild(resumen);
      dash.appendChild(detalles);
    }
    return true;
  }

  function renderKPICards(k, trans) {
    var transferido = sum(trans, 'monto');
    return '<div class="nxDC-kpis">' +
      '<div class="nxDC-card nxDC-kpi total"><div class="nxDC-badge nxDC-green">$</div><div><h4>Total cobrado del período</h4><div class="val">' + money(k.total.monto) + '</div><div class="sub">' + k.total.cant + ' abonos registrados</div></div></div>' +
      '<div class="nxDC-card nxDC-kpi"><div class="nxDC-badge nxDC-green">💵</div><div><h4>Efectivo</h4><div class="val">' + money(k.efectivo.monto) + '</div><div class="sub">' + k.efectivo.cant + ' abonos</div></div></div>' +
      '<div class="nxDC-card nxDC-kpi bank"><div class="nxDC-badge nxDC-blue">🏦</div><div><h4>Banco / Transferencia</h4><div class="val">' + money(k.banco.monto) + '</div><div class="sub">' + k.banco.cant + ' abonos</div></div></div>' +
      '<div class="nxDC-card nxDC-kpi cheque"><div class="nxDC-badge nxDC-orange">📝</div><div><h4>Cheque</h4><div class="val">' + money(k.cheque.monto) + '</div><div class="sub">' + k.cheque.cant + ' abonos</div></div></div>' +
      '<div class="nxDC-card nxDC-kpi otros"><div class="nxDC-badge nxDC-purple">⇄</div><div><h4>Transferido entre agentes</h4><div class="val">' + money(transferido) + '</div><div class="sub">' + trans.length + ' movimientos</div></div></div>' +
      '</div>';
  }

  function renderMetodo(k) {
    var total = k.total.monto || 1;
    var ef = (k.efectivo.monto / total) * 100;
    var bc = ef + (k.banco.monto / total) * 100;
    var ch = bc + (k.cheque.monto / total) * 100;
    function row(color, label, obj) {
      var pct = k.total.monto ? ((obj.monto / k.total.monto) * 100).toFixed(1) + '%' : '0%';
      return '<div class="nxDC-leg"><span><i class="nxDC-dot" style="background:' + color + '"></i>' + label + '</span><b>' + money(obj.monto) + '</b><span class="pct">' + pct + '</span></div>';
    }
    return '<div class="nxDC-card"><h3 class="nxDC-section-title">Resumen por método de cobro</h3><div class="nxDC-method-wrap"><div class="nxDC-donut" style="--ef:' + ef + '%;--bc:' + bc + '%;--ch:' + ch + '%"><span>' + money(k.total.monto) + '<br><small>Total</small></span></div><div class="nxDC-legend">' +
      row('#16a34a', 'Efectivo', k.efectivo) + row('#2563eb', 'Banco / Transferencia', k.banco) + row('#f97316', 'Cheque', k.cheque) + row('#9333ea', 'Otros', k.otros) + '</div></div></div>';
  }

  function renderBancos(bancos, totalBanco) {
    if (!bancos.length) return '<div class="nxDC-card"><h3 class="nxDC-section-title">Dónde está el dinero (bancos)</h3><div class="nxDC-empty">Sin cobros por banco en este período.</div></div>';
    return '<div class="nxDC-card"><h3 class="nxDC-section-title">Dónde está el dinero (bancos)</h3><div class="nxDC-bank-list">' + bancos.map(function (b) {
      return '<div class="nxDC-bank-row"><div><b>🏦 ' + esc(b.banco) + '</b><small>' + b.cant + ' abonos</small></div><strong>' + money(b.monto) + '</strong></div>';
    }).join('') + '</div><div class="nxDC-total-line"><span>Total en bancos</span><b>' + money(totalBanco) + '</b></div></div>';
  }

  function renderAgentes(agentes) {
    if (!agentes.length) return '<div class="nxDC-card"><h3 class="nxDC-section-title">Detalle por agente</h3><div class="nxDC-empty">No hay agentes registrados.</div></div>';
    var tot = { total: sum(agentes, 'total'), efectivo: sum(agentes, 'efectivo'), banco: sum(agentes, 'banco'), cheque: sum(agentes, 'cheque'), otros: sum(agentes, 'otros'), enMano: sum(agentes, 'enMano') };
    return '<div class="nxDC-card"><h3 class="nxDC-section-title">Detalle por agente</h3><div class="nxDC-table-wrap"><table class="nxDC-table"><thead><tr><th>Agente</th><th>Total cobrado</th><th>Efectivo</th><th>Banco</th><th>Cheque</th><th>Otros</th><th>Dinero en mano real</th></tr></thead><tbody>' +
      agentes.map(function (a) {
        var ini = esc(String(a.nombre || 'A').charAt(0).toUpperCase());
        return '<tr><td><span class="nxDC-avatar">' + ini + '</span>' + esc(a.nombre) + '</td><td class="money-green">' + money(a.total) + '</td><td>' + money(a.efectivo) + '</td><td>' + money(a.banco) + '</td><td>' + money(a.cheque) + '</td><td>' + money(a.otros) + '</td><td class="money-blue">' + money(a.enMano) + '</td></tr>';
      }).join('') + '<tr><td><b>TOTAL GENERAL</b></td><td class="money-green">' + money(tot.total) + '</td><td><b>' + money(tot.efectivo) + '</b></td><td><b>' + money(tot.banco) + '</b></td><td><b>' + money(tot.cheque) + '</b></td><td><b>' + money(tot.otros) + '</b></td><td class="money-blue">' + money(tot.enMano) + '</td></tr></tbody></table></div></div>';
  }

  function renderTransferencias(trans) {
    if (!trans.length) return '';
    var enviado = sum(trans, 'monto');
    return '<div class="nxDC-transfer-grid"><div class="nxDC-card"><h3 class="nxDC-section-title">Transferencias entre agentes (resumen)</h3><div class="nxDC-transfer-mini"><div class="nxDC-transfer-box green"><span>↑ Enviado</span><b>' + money(enviado) + '</b><small>Total enviado</small></div><div class="nxDC-transfer-box blue"><span>↓ Movimientos</span><b>' + trans.length + '</b><small>Transferencias</small></div></div><div class="nxDC-neto"><span>Neto entre agentes</span><strong>' + money(enviado) + '</strong><small>Envíos registrados</small></div></div>' +
      '<div class="nxDC-card"><h3 class="nxDC-section-title">Historial de transferencias</h3><div class="nxDC-table-wrap"><table class="nxDC-table"><thead><tr><th>Fecha</th><th>Desde</th><th>Hacia</th><th>Monto</th><th>Método</th><th>Referencia</th></tr></thead><tbody>' + trans.map(function (t) {
        return '<tr><td>' + esc(String(t.fecha || t.created_at || '').slice(0, 10)) + '</td><td>' + esc(agenteNombre(t.desde_agente || t.agente_origen || t.desde)) + '</td><td>' + esc(agenteNombre(t.hacia_agente || t.agente_destino || t.hacia)) + '</td><td class="money-blue">' + money(t.monto) + '</td><td>' + esc(t.metodo || '—') + '</td><td>' + esc(t.referencia || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';
  }

  async function renderDetalles(force) {
    var cont = $('#nxDetallesCobroV1');
    if (!cont) return;
    var periodo = calcularPeriodo();
    cont.innerHTML = '<div class="nxDC-card"><div class="loading"><div class="spin"></div> Cargando detalles de cobro...</div></div>';
    var abonosAll = await cargarAbonos(force);
    var transAll = await cargarTransferencias(force);
    cache.cargado = true;
    var abonos = abonosAll.filter(function (a) { return enPeriodo(a.fecha, periodo); });
    var trans = transAll.filter(function (t) { return enPeriodo(t.fecha || t.created_at, periodo); });
    var k = calcularKPIs(abonos);
    var bancos = calcularPorBanco(abonos);
    var agentes = calcularPorAgente(abonos, trans);
    cont.innerHTML = '<div class="nxDC-head"><div class="nxDC-title"><div class="nxDC-icon">$</div><div><h2>DETALLES DE COBRO</h2><p>Control financiero por agente, método, banco y transferencias internas</p></div></div><div class="nxDC-period"><small>Período de facturación</small><b>' + fmtPeriodoFecha(periodo.inicio) + ' — ' + fmtPeriodoFecha(periodo.fin) + '</b><button class="btn bsm bghost nxDC-refresh" type="button" onclick="window.nxRecargarDetallesCobroV2()"><i class="ti ti-refresh"></i> Recargar</button></div></div>' + renderKPICards(k, trans) + '<div class="nxDC-grid2">' + renderMetodo(k) + renderBancos(bancos, k.banco.monto) + '</div>' + renderAgentes(agentes) + renderTransferencias(trans);
  }

  window.nxRecargarDetallesCobroV2 = function () { cache.cargado = false; renderDetalles(true); };

  window.nxDashboardTab = function (tab) {
    crearPestanasDashboard();
    $$('#nxDCTabs .nxDC-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    var resumen = $('#nxDCResumen');
    var detalles = $('#nxDetallesCobroV1');
    if (tab === 'detalles') {
      if (resumen) resumen.classList.remove('active');
      if (detalles) detalles.classList.add('active');
      renderDetalles(false);
    } else {
      if (detalles) detalles.classList.remove('active');
      if (resumen) resumen.classList.add('active');
    }
  };

  function bindCobrado() {
    if (window.__NEXUS_DC_V2_COBRADO_BOUND__) return;
    window.__NEXUS_DC_V2_COBRADO_BOUND__ = true;
    document.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('#nxDetallesCobroV1')) return;
      var box = ev.target.closest && ev.target.closest('.kpi,.qa,.sm,.card,.stat-card,[class*="kpi"]');
      if (!box) return;
      var txt = norm(box.textContent || '');
      if (!txt.includes('cobrado')) return;
      var dash = $('#v-dashboard');
      if (!dash || !dash.classList.contains('on')) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      window.nxDashboardTab('detalles');
    }, true);
  }

  function init() {
    injectCSS();
    var tries = 0;
    (function waitDash() {
      tries++;
      if (crearPestanasDashboard()) { bindCobrado(); return; }
      if (tries < 30) setTimeout(waitDash, 300);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
