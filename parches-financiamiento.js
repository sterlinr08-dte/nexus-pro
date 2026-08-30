/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - MÓDULO DE PRÉSTAMOS (SOLO ADMIN)
   ────────────────────────────────────────────────────────────────
   Préstamos a personas que NO son clientes del seguro. Monto fijo a
   devolver (lo define el admin). Soporta abonos libres y cuotas fijas.
   Tablas: prestamos, prestamo_pagos (RLS: solo admin via mi_rol()).
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__NX_PRESTAMOS__) return;
  window.__NX_PRESTAMOS__ = true;

  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esAdmin() { try { return (typeof sesion !== 'undefined') && sesion && sesion.rol === 'admin'; } catch (e) { try { return window.sesion && window.sesion.rol === 'admin'; } catch (_) { return false; } } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  // Buscador estándar (reglamento del dueño): respaldo por si index.html aún no trae
  // nxBuscaHTML en caché (mismo criterio que ya usa AGUAPRO/POS).
  function prBuscador(o) {
    if (typeof window.nxBuscaHTML === 'function') return window.nxBuscaHTML(o || {});
    o = o || {};
    return '<div style="position:relative"><i class="ti ti-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#475569;font-size:15px;pointer-events:none"></i><input' + (o.id ? ' id="' + o.id + '"' : '') + ' placeholder="' + esc(o.placeholder || 'Buscar…') + '" value="' + esc(o.value || '') + '" autocomplete="off" oninput="' + (o.oninput || '') + '" style="width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b"></div>';
  }
  function fmt(n) { return 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function toast(t, m, s) { try { if (window.toast) window.toast(t, m, s); } catch (e) {} }
  function cerrarModal(id) { const o = document.getElementById(id); if (o) o.remove(); }
  function parseMoney(v) { try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(v)) || 0; } catch (e) {} return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
  function nomAdmin() { try { return (window.sesion && window.sesion.nom) || 'Admin'; } catch (e) { return 'Admin'; } }

  let _prestamos = [];
  let _pagosByPrestamo = {};
  let _prCfg = {};
  let _modoForm = 'libre';
  let _prCuotaMode = 'num'; // 'num' = pongo # de cuotas · 'monto' = pongo la cuota y calcula cuántas
  let _prFiltro = 'todos';
  let _prPage = 1, _prQuery = '';
  const PR_PAGE_SIZE = 12;
  // Cobranza V2.1 (spec ChatGPT, ver docs/visual-drafts/financiamiento/
  // COBRANZA_V2_INTEGRACION.md + COBRANZA_V2_1_MEJORAS_OPERATIVAS.md): pestaña de
  // prioridad + búsqueda + página propias, distintas de _prFiltro/_prQuery (esas son
  // de la lista general de préstamos). 'pendientes' es el default al entrar a
  // Cobranza — agrupa crítico+alta+mora reciente+por vencer, deja fuera 'al día'.
  let _prCobTab = 'pendientes', _prCobQ = '', _prCobPage = 1;
  const PR_COB_PAGE_SIZE = 25;
  let _prClientes = [], _prView = 'prestamos', _prCliQuery = '', _prSolicitudes = [];
  let _prRepPeriodo = 'todo'; // Reportes: 'mes' | 'anio' | 'todo' — solo alcanza las métricas de FLUJO (colocado/recuperado/cobros); el stock (balance/mora/cartera) siempre es al día de hoy.
  let _tipoPago = 'capital'; // para línea de crédito: 'capital' o 'interes'
  let _prCuotasPend = []; let _prMoraOpen = 0; // marcar cuotas a pagar (nxPrCuotaCheck)
  window.nxPrTipoPago = function (t) {
    _tipoPago = t;
    const bc = document.getElementById('prTipoCap'), bi = document.getElementById('prTipoInt');
    if (bc) bc.className = t === 'capital' ? 'btn bc1' : 'btn';
    if (bi) bi.className = t === 'interes' ? 'btn bc1' : 'btn';
  };

  function addMonths(dateStr, m) { const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00'); d.setMonth(d.getMonth() + m); return d; }
  function mesesCompletos(fecha, hasta) {
    const start = new Date(String(fecha).slice(0, 10) + 'T12:00:00'), end = new Date(String(hasta).slice(0, 10) + 'T12:00:00');
    let k = 0; while (k < 600) { const next = addMonths(fecha, k + 1); if (next <= end) k++; else break; } return k;
  }
  // Cálculo de una LÍNEA DE CRÉDITO: interés por mes completo sobre el capital pendiente,
  // pagos separados en 'capital' (bajan la deuda) e 'interes' (ganancia).
  function creditoCalc(pr) {
    const cap = Number(pr.capital || 0), tasa = Number(pr.tasa_interes || 0) / 100;
    const pagos = _pagosByPrestamo[pr.id] || [];
    const capPagos = pagos.filter(p => p.tipo === 'capital').sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const pagCap = capPagos.reduce((s, p) => s + Number(p.monto || 0), 0);
    const pagInt = pagos.filter(p => p.tipo === 'interes').reduce((s, p) => s + Number(p.monto || 0), 0);
    const capPend = Math.max(0, cap - pagCap);
    const M = mesesCompletos(pr.fecha_prestamo, hoy());
    let interesAcum = 0; const meses = [];
    for (let k = 1; k <= M + 1; k++) { // M completos + 1 en curso (referencial)
      const mStart = addMonths(pr.fecha_prestamo, k - 1);
      let pagAntes = 0; capPagos.forEach(p => { const pf = new Date(String(p.fecha).slice(0, 10) + 'T12:00:00'); if (pf < mStart) pagAntes += Number(p.monto || 0); });
      const saldoK = Math.max(0, cap - pagAntes);
      const intK = Math.round(saldoK * tasa);
      if (k <= M) interesAcum += intK;
      meses.push({ n: k, fecha: mStart.toISOString().slice(0, 10), saldo: saldoK, interes: intK, encurso: k > M });
    }
    const interesPend = Math.max(0, interesAcum - pagInt);
    const totalDebe = capPend + interesPend;
    const fechaLimite = pr.plazo_meses ? addMonths(pr.fecha_prestamo, pr.plazo_meses).toISOString().slice(0, 10) : null;
    const diasRestan = fechaLimite ? Math.ceil((new Date(fechaLimite + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 86400000) : null;
    return { cap, capPend, pagCap, pagInt, interesAcum, interesPend, totalDebe, interesMes: Math.round(capPend * tasa), M, meses, fechaLimite, diasRestan, tasa: Number(pr.tasa_interes || 0) };
  }

  function pagadoDe(pr) { if (pr.modo === 'credito') { const c = creditoCalc(pr); return c.pagCap + c.pagInt; } return (_pagosByPrestamo[pr.id] || []).reduce((s, p) => s + Number(p.monto || 0), 0); }
  function saldoDe(pr) { if (pr.modo === 'credito') return creditoCalc(pr).totalDebe; return Math.max(0, Number(pr.total_devolver || 0) - pagadoDe(pr)); }
  function estadoDe(pr) { if (pr.modo === 'credito') { const c = creditoCalc(pr); return (c.capPend <= 0 && c.interesPend <= 0) ? 'pagado' : 'activo'; } return saldoDe(pr) <= 0 ? 'pagado' : 'activo'; }
  function soloDig(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function waNumero(tel) { let d = soloDig(tel); if (d.length === 10) d = '1' + d; return d.length >= 11 ? d : ''; }
  function fechaUltCuota(pr) { return pr.num_cuotas > 0 ? fechaCuota(pr.fecha_prestamo, pr.frecuencia, pr.num_cuotas) : ''; }
  function esVencido(pr) {
    if (estadoDe(pr) === 'pagado') return false;
    if (pr.modo === 'credito') { const c = creditoCalc(pr); return c.diasRestan != null && c.diasRestan < 0; }
    if (pr.modo === 'cuotas' && pr.num_cuotas > 0) { return fechaUltCuota(pr) < hoy() && saldoDe(pr) > 0; }
    return false; // abonos libres: sin fecha límite
  }
  function interesCobradoDe(pr) {
    if (pr.modo === 'credito') return creditoCalc(pr).pagInt;
    const it = Math.max(0, Number(pr.total_devolver || 0) - Number(pr.capital || 0)), tot = Number(pr.total_devolver || 0), pg = pagadoDe(pr);
    return tot > 0 ? Math.round(it * Math.min(1, pg / tot)) : 0;
  }

  function fechaCuota(base, frec, n) {
    try {
      const d = new Date(String(base).slice(0, 10) + 'T12:00:00');
      if (frec === 'semanal') d.setDate(d.getDate() + 7 * n);
      else if (frec === 'quincenal') d.setDate(d.getDate() + 15 * n);
      else d.setMonth(d.getMonth() + n);
      return d.toISOString().slice(0, 10);
    } catch (e) { return ''; }
  }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function parsePct(v) { return Number(String(v == null ? '' : v).replace(',', '.').replace(/[^0-9.]/g, '')) || 0; }

  // Convierte la tasa MENSUAL a tasa por cuota según la frecuencia, proporcional
  // a los días del período (mes = 30 días): semanal = 7/30, quincenal = 15/30, mensual = 1.
  function tasaPorCuota(tasaMensualPct, frec) {
    const f = frec === 'semanal' ? (7 / 30) : frec === 'quincenal' ? (15 / 30) : 1;
    return (Number(tasaMensualPct) || 0) * f;
  }
  // Amortización método de cuota fija (francés). tasa = % MENSUAL.
  // Trabaja en pesos enteros para que la suma de las cuotas cuadre EXACTO con el total.
  // cuotaFija (7º param, opcional): monto EXACTO de cada cuota; la ÚLTIMA absorbe el resto
  // (modo "calcular por monto de la cuota"). 0/undefined = cuotas parejas de siempre (0 riesgo:
  // todas las llamadas viejas pasan 6 args → cuotaFija=undefined → comportamiento clásico).
  function amortizar(capital, tasaPct, n, base, frec, metodo, cuotaFija) {
    capital = Math.round(Number(capital || 0)); n = parseInt(n, 10) || 0;
    cuotaFija = Math.round(Number(cuotaFija || 0));
    const i = tasaPorCuota(tasaPct, frec) / 100;
    const rows = []; let saldo = capital;
    if (n <= 0 || capital <= 0) return { cuota: 0, total: 0, interesTotal: 0, rows: [] };
    // Método PLANO / interés simple: interés fijo por cuota sobre el capital ORIGINAL,
    // cuotas todas iguales (estilo "a la dominicana"). Más rentable para el prestamista.
    if (metodo === 'plano' && i > 0) {
      const interesTotal = Math.round(capital * i * n);
      const total = capital + interesTotal;
      // Con cuota fija: n-1 cuotas EXACTAS a cuotaFija, la última = total − (n-1)·cuotaFija (el resto).
      // Si el fijo no cabe (última quedaría ≤0 o mayor que el fijo por mucho), cae a cuota pareja.
      const usarFija = cuotaFija > 0 && n > 1 && (total - (n - 1) * cuotaFija) > 0 && cuotaFija <= total;
      const cuotaBase = usarFija ? cuotaFija : Math.round(total / n);
      const intBase = Math.round(interesTotal / n);
      let accCuota = 0, accCap = 0;
      for (let k = 1; k <= n; k++) {
        let cuotaK, capPart, interes;
        if (k === n) { cuotaK = total - accCuota; capPart = capital - accCap; interes = cuotaK - capPart; } // la última cuadra el redondeo
        else if (usarFija) { cuotaK = cuotaFija; interes = intBase; capPart = cuotaFija - intBase; }
        else { cuotaK = cuotaBase; interes = intBase; capPart = cuotaBase - intBase; }
        accCuota += cuotaK; accCap += capPart;
        saldo = Math.max(0, capital - accCap);
        rows.push({ n: k, fecha: fechaCuota(base, frec, k), cuota: cuotaK, interes: interes, capital: capPart, saldo: saldo });
      }
      return { cuota: usarFija ? cuotaFija : cuotaBase, total: total, interesTotal: total - capital, rows: rows };
    }
    // Saldo insoluto (francés). Con cuota fija: pago fijo = cuotaFija; el interés baja con el saldo,
    // el capital sube, y la última cuota salda lo que quede (siempre ≤ cuotaFija porque cuotasParaMonto
    // garantiza que el fijo cubre el interés de la 1ra cuota, el mayor de todos).
    const fija = cuotaFija > 0 && n > 1 && cuotaFija > Math.round(capital * i);
    const cuota = fija ? cuotaFija : (i > 0 ? Math.round(capital * i / (1 - Math.pow(1 + i, -n))) : Math.round(capital / n));
    for (let k = 1; k <= n; k++) {
      const interes = Math.round(saldo * i);
      let capPart, cuotaK;
      if (k === n) { capPart = saldo; cuotaK = saldo + interes; } // última cuota salda el resto
      else { capPart = Math.min(saldo, cuota - interes); cuotaK = capPart + interes; }
      saldo = Math.max(0, saldo - capPart);
      rows.push({ n: k, fecha: fechaCuota(base, frec, k), cuota: cuotaK, interes: interes, capital: capPart, saldo: saldo });
    }
    const total = rows.reduce((s, r) => s + r.cuota, 0);
    return { cuota: cuota, total: total, interesTotal: total - capital, rows: rows };
  }

  async function cargarPrestamos() {
    _prestamos = await getAPI().get('prestamos', 'select=*&order=created_at.desc') || [];
    const pagos = await getAPI().get('prestamo_pagos', 'select=*&order=fecha.asc') || [];
    _pagosByPrestamo = {};
    pagos.forEach(p => { (_pagosByPrestamo[p.prestamo_id] = _pagosByPrestamo[p.prestamo_id] || []).push(p); });
    try { const cfg = await getAPI().get('prestamos_config', 'select=*&id=eq.1'); _prCfg = (cfg && cfg[0]) || {}; } catch (e) { _prCfg = {}; }
    try { _prClientes = await getAPI().get('prestamo_clientes', 'select=*&order=nombre.asc') || []; } catch (e) { _prClientes = []; }
    try { _prSolicitudes = await getAPI().get('prestamo_solicitudes', 'select=*&order=created_at.desc') || []; } catch (e) { _prSolicitudes = []; }
  }

  // ════════════════════════════════════════════════════════════════════
  // ── FINANCIAMIENTO PREMIUM (rediseño v48.17, a pedido del dueño — mismo
  //    motor/tablas/RLS de siempre, solo interfaz nueva. Reusa el look
  //    .nxFP-* ya construido para Cuotas del POS, ver window.nxFPEnsureCSS ──
  // ════════════════════════════════════════════════════════════════════
  // Sigue usada por nxPrestamoVer (detalle del préstamo, con el botón Cobrar) —
  // NO se tocó ese modal, solo se movió aquí de vuelta el helper que necesita.
  function kpi(lbl, val, col) {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;text-align:center"><div style="font-size:9px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px">${lbl}</div><div style="font-size:15px;font-weight:900;color:${col};margin-top:2px">${val}</div></div>`;
  }
  const PR_AVATAR_COLORES = ['#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#0284c7'];
  function prIniciales(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    const ini = partes.length ? (partes[0][0] + (partes[1] ? partes[1][0] : '')).toUpperCase() : '—';
    let hash = 0; const s = String(nombre || ''); for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
    return { ini: ini, color: PR_AVATAR_COLORES[hash % PR_AVATAR_COLORES.length] };
  }
  // Estado real: este módulo solo tiene 3 estados de verdad (no hay concepto de mora/gracia ni
  // cancelado aquí — no se inventan para parecerse a Cuotas del POS, que sí los tiene).
  function prEstadoInfo(p) {
    const est = estadoDe(p);
    if (est === 'pagado') return { key: 'pagado', label: 'PAGADO' };
    if (esVencido(p)) return { key: 'vencido', label: 'VENCIDO' };
    return { key: 'activo', label: 'ACTIVO' };
  }
  function prTipoTxt(p) {
    return p.modo === 'credito'
      ? ('Línea de crédito' + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '%/mes' : ''))
      : p.modo === 'cuotas'
        ? ((p.num_cuotas || 0) + ' cuotas ' + (p.frecuencia || '') + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '%/mes' : ''))
        : ('Abonos libres' + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '% interés' : ''));
  }
  function prVencFecha(p) {
    if (p.modo === 'credito') { const c = creditoCalc(p); return c.fechaLimite || ''; }
    if (p.modo === 'cuotas' && p.num_cuotas > 0) return fechaUltCuota(p);
    return '';
  }
  function prDiasVencido(p) {
    if (p.modo === 'credito') { const c = creditoCalc(p); return c.diasRestan != null ? Math.max(0, -c.diasRestan) : 0; }
    const f = prVencFecha(p); if (!f) return 0;
    return Math.max(0, Math.floor((new Date(hoy() + 'T12:00:00') - new Date(f + 'T12:00:00')) / 86400000));
  }

  function cardHTML(p) {
    const info = prEstadoInfo(p), av = prIniciales(p.nombre);
    const saldo = saldoDe(p), pag = pagadoDe(p);
    const vFecha = prVencFecha(p), vDias = prDiasVencido(p);
    const metaBits = [p.cedula, p.telefono].filter(Boolean).map(esc);
    return `<div class="nxFP-card nxPrCard" data-busca="${esc((p.nombre || '').toLowerCase() + ' ' + (p.cedula || ''))}" onclick="window.nxPrestamoVer('${p.id}')" style="cursor:pointer" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">
      <div class="nxFP-avatar" style="background:${av.color}">${av.ini}</div>
      <div class="nxFP-cardBody">
        <div class="nxFP-cardTop"><div class="nxFP-cardNom">${esc(p.nombre || 'Sin nombre')}</div><span class="nxFP-badge ${info.key}">${info.label}</span></div>
        <div class="nxFP-cardMeta">${metaBits.length ? metaBits.join(' · ') : 'Sin cédula/teléfono'}</div>
        <div class="nxFP-refRow"><span class="nxFP-ref">${esc(prTipoTxt(p))}</span></div>
        <div class="nxFP-cardGrid">
          <div><div class="nxFP-gLbl">Prestó</div><div class="nxFP-gVal">${fmt(p.capital)}</div></div>
          <div><div class="nxFP-gLbl">Saldo</div><div class="nxFP-gVal ${saldo > 0 ? 'accent' : ''}">${fmt(saldo)}</div></div>
          <div><div class="nxFP-gLbl">Pagado</div><div class="nxFP-gVal">${fmt(pag)}</div></div>
          <div>${info.key === 'pagado' ? `<div class="nxFP-gLbl">Estado</div><div class="nxFP-gVal">Completado</div>` : vFecha ? `<div class="nxFP-gLbl">${vDias > 0 ? 'Días vencido' : 'Vence'}</div><div class="nxFP-gVal ${vDias > 0 ? 'danger' : ''}">${vDias > 0 ? vDias + ' días' : vFecha}</div></div>` : `<div class="nxFP-gLbl">Plazo</div><div class="nxFP-gVal">Abono libre</div></div>`}</div>
        </div>
      </div>
      <div class="nxFP-cardMenuWrap">
        <button type="button" class="nxFP-menuBtn" aria-label="Más opciones de ${esc(p.nombre || '')}" onclick="window.nxPrMenu(event,'${p.id}')"><i class="ti ti-dots-vertical"></i></button>
        <div class="nxFP-menuPop" id="prMenu_${p.id}">
          <button type="button" onclick="window.nxPrMenuGo(event,'${p.id}','ver')"><i class="ti ti-eye"></i> Ver detalle</button>
          <button type="button" onclick="window.nxPrMenuGo(event,'${p.id}','estado')"><i class="ti ti-printer"></i> Estado de cuenta</button>
          ${p.telefono ? `<button type="button" onclick="window.nxPrMenuGo(event,'${p.id}','wa')"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
        </div>
      </div>
    </div>`;
  }

  // Código de referencia estable derivado del id (NO es un folio consecutivo real —
  // la tabla prestamos no tiene columna número; es solo para mostrar en pantalla).
  function prRef(p) { const s = String(p.id || '').replace(/-/g, ''); return 'PR-' + (s.slice(0, 6).toUpperCase() || '------'); }
  // Fecha del PRÓXIMO pago pendiente (real): la primera cuota aún no cubierta.
  function prProximoPago(p) {
    if (p.modo === 'cuotas' && p.num_cuotas > 0 && Number(p.tasa_interes || 0) > 0) {
      const a = amortizar(Number(p.capital || 0), Number(p.tasa_interes || 0), p.num_cuotas, p.fecha_prestamo, p.frecuencia, p.metodo_interes || 'saldo', Number(p.cuota_fija) || 0);
      const pag = pagadoDe(p); let acum = 0;
      for (const r of a.rows) { acum += r.cuota; if (pag < acum - 0.5) return r.fecha; }
      return '';
    }
    if (p.modo === 'cuotas' && p.num_cuotas > 0) { // sin interés: cuotas iguales del total
      const cuota = Number(p.total_devolver || 0) / p.num_cuotas, pag = pagadoDe(p); let acum = 0;
      for (let i = 1; i <= p.num_cuotas; i++) { acum += cuota; if (pag < acum - 0.5) return fechaCuota(p.fecha_prestamo, p.frecuencia, i); }
      return '';
    }
    if (p.modo === 'credito') { const c = creditoCalc(p); return c.fechaLimite || ''; }
    return '';
  }
  // Estado para la TABLA: 4 vistas DERIVADAS de fechas reales (no inventa mora/gracia):
  // Al día / Por vencer (próximo pago ≤7 días) / Vencido / Pagado.
  function prEstadoTabla(p) {
    const info = prEstadoInfo(p);
    if (info.key === 'pagado') return { key: 'pagado', label: 'Pagado' };
    if (info.key === 'vencido') return { key: 'vencido', label: 'Vencido' };
    const f = prProximoPago(p);
    if (f) { const d = Math.floor((new Date(f + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 86400000); if (d >= 0 && d <= 7) return { key: 'porvencer', label: 'Por vencer' }; }
    return { key: 'activo', label: 'Al día' };
  }
  function prListaFiltrada() {
    const f = _prFiltro, q = _prQuery.trim().toLowerCase();
    return _prestamos.filter(p => {
      if (f === 'activos' && estadoDe(p) === 'pagado') return false;
      if (f === 'pagados' && estadoDe(p) !== 'pagado') return false;
      if (f === 'vencidos' && !esVencido(p)) return false;
      if ((f === 'credito' || f === 'cuotas' || f === 'libre') && (p.modo || 'libre') !== f) return false;
      if (q) { const b = (p.nombre || '').toLowerCase() + ' ' + (p.cedula || ''); if (!b.includes(q)) return false; }
      return true;
    });
  }
  function prTablaHTML() {
    if (_prestamos.length === 0) return `<div class="nxFP-empty"><div class="nxFP-emptyIco"><i class="ti ti-file-off"></i></div><h3>Aún no hay préstamos</h3><p>Toca "Nuevo préstamo" para registrar el primero.</p><button type="button" class="nxFP-qbtn" style="max-width:220px;margin:14px auto 0" onclick="window.nxPrestamoNuevo()"><div class="nxFP-qico primary"><i class="ti ti-plus"></i></div><span>Nuevo préstamo</span></button></div>`;
    const lista = prListaFiltrada();
    if (lista.length === 0) return `<div class="nxFP-empty"><div class="nxFP-emptyIco"><i class="ti ti-search-off"></i></div><h3>Nada por aquí</h3><p>Ningún préstamo coincide con este filtro.</p></div>`;
    const pages = Math.max(1, Math.ceil(lista.length / PR_PAGE_SIZE));
    if (_prPage > pages) _prPage = pages; if (_prPage < 1) _prPage = 1;
    const start = (_prPage - 1) * PR_PAGE_SIZE;
    const pageRows = lista.slice(start, start + PR_PAGE_SIZE);
    const rows = pageRows.map(p => {
      const et = prEstadoTabla(p), vDias = prDiasVencido(p), prox = prProximoPago(p);
      return `<tr onclick="window.nxPrestamoVer('${p.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}">
        <td data-l="Ref" class="nxFP-tRef">${prRef(p)}</td>
        <td data-l="Prestatario" class="nxFP-tdNom"><div class="nxFP-tNom">${esc(p.nombre || 'Sin nombre')}</div>${p.telefono ? `<div class="nxFP-tSub">${esc(p.telefono)}</div>` : ''}</td>
        <td data-l="Cédula" class="nxFP-tCed">${esc(p.cedula || '—')}</td>
        <td data-l="Capital" class="nxFP-tMoney nxFP-tCap">${fmt(p.capital)}</td>
        <td data-l="Total a devolver" class="nxFP-tMoney nxFP-tTot">${fmt(p.total_devolver)}</td>
        <td data-l="Próximo pago" class="nxFP-tProx">${prox || '—'}</td>
        <td data-l="Estado" class="nxFP-tEst"><span class="nxFP-tBadge ${et.key}">${et.label}</span></td>
        <td data-l="Días venc." class="nxFP-tDias ${vDias > 0 ? 'bad' : 'cero'}">${vDias > 0 ? vDias : '0'}</td>
        <td data-l="Acciones" class="nxFP-tAccC"><div class="nxFP-tAcc">
          <button type="button" title="Ver detalle" aria-label="Ver ${esc(p.nombre || '')}" onclick="event.stopPropagation();window.nxPrestamoVer('${p.id}')"><i class="ti ti-eye"></i></button>
          <button type="button" title="Editar" aria-label="Editar ${esc(p.nombre || '')}" onclick="event.stopPropagation();window.nxPrestamoEditar('${p.id}')"><i class="ti ti-pencil"></i></button>
          <button type="button" title="Estado de cuenta" aria-label="Estado de cuenta" onclick="event.stopPropagation();window.nxPrestamoEstadoCuenta('${p.id}')"><i class="ti ti-printer"></i></button>
          ${p.telefono ? `<button type="button" title="WhatsApp" aria-label="WhatsApp" onclick="event.stopPropagation();window.nxPrestamoWA('${p.id}')"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
        </div></td>
      </tr>`;
    }).join('');
    let pg = '';
    if (pages > 1) {
      const btn = (n, lbl, on, dis) => `<button type="button"${on ? ' class="on"' : ''}${dis ? ' disabled' : ''} onclick="window.nxPrTablaPagina(${n})">${lbl}</button>`;
      pg = btn(_prPage - 1, '<i class="ti ti-chevron-left"></i>', false, _prPage <= 1);
      for (let n = 1; n <= pages; n++) { if (pages > 7 && n > 2 && n < pages - 1 && Math.abs(n - _prPage) > 1) { if (n === 3 || n === pages - 2) pg += '<button type="button" disabled>…</button>'; continue; } pg += btn(n, String(n), n === _prPage, false); }
      pg += btn(_prPage + 1, '<i class="ti ti-chevron-right"></i>', false, _prPage >= pages);
    }
    return `<div class="nxFP-tblWrap"><table class="nxFP-tbl"><thead><tr>
        <th>Ref</th><th>Prestatario</th><th>Cédula</th><th>Capital</th><th>Total a devolver</th><th>Próximo pago</th><th>Estado</th><th>Días venc.</th><th>Acciones</th>
      </tr></thead><tbody>${rows}</tbody></table></div>
      <div class="nxFP-pager"><div class="nxFP-pgInfo">Mostrando ${start + 1}–${Math.min(start + PR_PAGE_SIZE, lista.length)} de ${lista.length} ${lista.length === 1 ? 'préstamo' : 'préstamos'}</div><div class="nxFP-pgBtns">${pg}</div></div>`;
  }
  function repintarPrLista() { const el = document.getElementById('nxPrLista'); if (el) el.innerHTML = prTablaHTML(); }
  window.nxPrTablaPagina = function (n) { _prPage = n; repintarPrLista(); };

  // ══════════════════════════════════════════════════════════════════
  //  COBRANZA V2.1 (spec ChatGPT "Cobranza V2 Integración" + auditoría/mejoras
  //  operativas "V2.1") — vista dedicada dentro del mismo shell, sin observadores DOM
  //  ni timers. Consume EXCLUSIVAMENTE _prestamos y _pagosByPrestamo (ya cargados por
  //  cargarPrestamos), ningún estado nuevo en Supabase.
  // ══════════════════════════════════════════════════════════════════
  // Días entre HOY y una fecha ISO — negativo = ya pasó, positivo = todavía falta.
  function diasHasta(f) { return f ? Math.floor((new Date(f + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 86400000) : null; }
  // Prioridad DERIVADA (nunca escrita). A diferencia de esVencido()/prDiasVencido()
  // —que para préstamos 'cuotas' miden el vencimiento contra la fecha de la ÚLTIMA
  // cuota del préstamo, no contra la más vieja sin pagar—, aquí se usa SIEMPRE
  // prProximoPago(p): la fecha de la cuota más vieja aún sin cubrir. Así un préstamo
  // con la cuota #1 vencida hace meses se detecta de inmediato, sin esperar a que
  // venza la última cuota del plazo. BUG REAL encontrado y corregido en la auditoría
  // (v56.5): la versión anterior de esta función solo atrapaba d en [0,7] ("por
  // vencer"); si la cuota YA había vencido (d<0), caía sin darse cuenta en "Al día"
  // — un préstamo atrasado a mitad de plazo se veía como si estuviera al corriente.
  // Para línea de crédito, prProximoPago(p) YA devuelve la misma fecha límite que
  // usaba esVencido — mismo resultado, sin ramificar por modo. Cero cambios a
  // esVencido()/prDiasVencido()/prMoraDe(): siguen igual en el resto del módulo
  // (lista general, mora, reportes) — esto es solo la clasificación de Cobranza.
  function prPrioridadCobranza(p) {
    if (estadoDe(p) === 'pagado') return null;
    const d = diasHasta(prProximoPago(p));
    if (d == null) return 'aldia'; // sin cronograma (abonos libres) o sin fecha límite: nada que vigilar
    if (d < 0) { const dv = -d; return dv > 30 ? 'critico' : dv >= 8 ? 'alta' : 'morareciente'; }
    return d <= 7 ? 'porvencer' : 'aldia';
  }
  const PR_COB_LBL = { critico: 'Crítico', alta: 'Alta prioridad', morareciente: 'Mora reciente', porvencer: 'Por vencer', aldia: 'Al día' };
  const PR_COB_ORD = { critico: 0, alta: 1, morareciente: 2, porvencer: 3, aldia: 4 };
  const PR_COB_TAB_LBL = { pendientes: 'Pendientes', critico: 'Críticos', alta: 'Alta prioridad', morareciente: 'Mora reciente', porvencer: 'Por vencer', aldia: 'Al día', todos: 'Todos' };
  const PR_COB_PENDIENTES = ['critico', 'alta', 'morareciente', 'porvencer']; // todo lo que necesita gestión — deja fuera 'al día'

  // Modelo derivado ÚNICO — se calcula una sola vez al entrar/recargar Cobranza
  // (prCobranzaMainHTML) y se reutiliza en KPIs, pestañas, resumen lateral, tabla,
  // paginación y exportación: evita recorrer _prestamos y recalcular prPrioridadCobranza
  // (y amortizar() para préstamos con interés) varias veces por render — antes se
  // llamaba ~6 veces por cada entrada a la pantalla.
  // Monto VENCIDO real — solo lo que ya pasó su fecha y sigue sin cubrir, NUNCA el
  // saldo completo del préstamo (que incluye cuotas futuras aún no vencidas). Es un
  // dato NUEVO (Cobranza V3, mockup de ChatGPT pedía la columna "Monto vencido"
  // separada de "Saldo" — se verificó que es real y calculable, no se inventó ni se
  // fingió). Recorre el MISMO cronograma que ya usa prProximoPago() y suma, cuota
  // por cuota, la parte de cada una VENCIDA que sigue sin cubrirse (reparto
  // acumulado oldest-first, el mismo criterio ya usado en todo el sistema). Cuotas
  // futuras no vencidas nunca cuentan aquí, aunque falten por pagar — eso es "Saldo".
  function prMontoVencidoDe(p) {
    if (estadoDe(p) === 'pagado') return 0;
    if (p.modo === 'credito') { const c = creditoCalc(p); return esVencido(p) ? c.totalDebe : 0; }
    if (p.modo !== 'cuotas' || !(p.num_cuotas > 0)) return 0; // abonos libres: sin cronograma, nada que aislar
    let rows;
    if (Number(p.tasa_interes || 0) > 0) {
      rows = amortizar(Number(p.capital || 0), Number(p.tasa_interes || 0), p.num_cuotas, p.fecha_prestamo, p.frecuencia, p.metodo_interes || 'saldo', Number(p.cuota_fija) || 0).rows;
    } else {
      const cuota = Number(p.total_devolver || 0) / p.num_cuotas;
      rows = []; for (let i = 1; i <= p.num_cuotas; i++) rows.push({ cuota: cuota, fecha: fechaCuota(p.fecha_prestamo, p.frecuencia, i) });
    }
    const pag = pagadoDe(p), hoyISO = hoy();
    let acum = 0, vencido = 0;
    for (const r of rows) {
      acum += r.cuota;
      const pendienteDeEsta = Math.max(0, Math.min(r.cuota, acum - pag));
      if (pendienteDeEsta > 0.5 && r.fecha < hoyISO) vencido += pendienteDeEsta;
    }
    return vencido;
  }
  let _prCobModelo = [];
  function prCobranzaCalcularModelo() {
    _prCobModelo = _prestamos.map(function (p) {
      const prio = prPrioridadCobranza(p);
      if (!prio) return null;
      const prox = prProximoPago(p), d = diasHasta(prox), diasVencido = (d != null && d < 0) ? -d : 0;
      const pagos = _pagosByPrestamo[p.id] || [];
      let ultimoPago = null;
      for (let i = 0; i < pagos.length; i++) { if (!ultimoPago || (pagos[i].fecha || '') > (ultimoPago.fecha || '')) ultimoPago = pagos[i]; }
      return { p: p, prio: prio, saldo: saldoDe(p), prox: prox, d: d, diasVencido: diasVencido, ultimoPago: ultimoPago, montoVencido: prMontoVencidoDe(p) };
    }).filter(Boolean);
    return _prCobModelo;
  }
  function prCobranzaListaFiltrada() {
    const q = (_prCobQ || '').trim().toLowerCase();
    const arr = _prCobModelo.filter(function (x) {
      if (_prCobTab === 'pendientes') { if (PR_COB_PENDIENTES.indexOf(x.prio) === -1) return false; }
      else if (_prCobTab !== 'todos' && x.prio !== _prCobTab) return false;
      if (q) {
        const b = [x.p.nombre, x.p.cedula, x.p.telefono, prRef(x.p)].filter(Boolean).join(' ').toLowerCase();
        if (b.indexOf(q) === -1) return false;
      }
      return true;
    });
    // Orden operativo: prioridad → más días vencido primero → próximo pago más cercano → mayor saldo.
    arr.sort(function (a, b) {
      return (PR_COB_ORD[a.prio] - PR_COB_ORD[b.prio])
        || (b.diasVencido - a.diasVencido)
        || ((a.prox || '9999-12-31') < (b.prox || '9999-12-31') ? -1 : (a.prox || '9999-12-31') > (b.prox || '9999-12-31') ? 1 : 0)
        || (b.saldo - a.saldo);
    });
    return arr;
  }
  function fCortaCob(iso) { const s = String(iso || '').slice(0, 10).split('-'); return s.length === 3 ? (s[2] + '/' + s[1] + '/' + s[0]) : '—'; }
  // Formato V3 (mockup ChatGPT, aprobado solo en botones/ubicación/formato — el color
  // sigue siendo el morado del módulo, NO el azul del mockup, "un color por app"):
  // Cliente (avatar+nombre+tel) / Referencia / Estado / Días vencido / Próxima cuota /
  // Monto vencido / Saldo / Último pago / Acciones (Cobrar + "…").
  function prCobranzaFilaHTML(x) {
    const p = x.p, prio = x.prio, av = prIniciales(p.nombre);
    const diasTxt = x.diasVencido ? (x.diasVencido + (x.diasVencido === 1 ? ' día' : ' días')) : '0 días';
    const proxTxt = x.d == null ? '—' : x.d < 0 ? 'Vencida' : ('Vence el ' + fCortaCob(x.prox));
    const ultTxt = x.ultimoPago ? (fCortaCob(x.ultimoPago.fecha) + ' · ' + fmt(x.ultimoPago.monto)) : '—';
    return `<tr onclick="window.nxPrestamoVer('${p.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" aria-label="Préstamo de ${esc(p.nombre || 'sin nombre')}, ${PR_COB_LBL[prio]}, saldo ${fmt(x.saldo)}">
        <td data-l="Cliente" class="nxFP-tCliCell"><div class="nxFP-tClient"><div class="nxFP-avatar sm" style="background:${av.color}">${av.ini}</div><div class="nxFP-tId"><div class="nxFP-tNom">${esc(p.nombre || 'Sin nombre')}</div>${p.telefono ? `<div class="nxFP-tSub">${esc(p.telefono)}</div>` : ''}</div></div></td>
        <td data-l="Referencia" class="nxFP-tRef">${prRef(p)}</td>
        <td data-l="Estado" class="nxFP-tEst"><span class="nxFP-tBadge ${prio}">${PR_COB_LBL[prio]}</span></td>
        <td data-l="Días vencido" class="nxFP-tDiasV${x.diasVencido ? ' late' : ''}">${diasTxt}</td>
        <td data-l="Próxima cuota" class="nxFP-tProxCuota">${proxTxt}</td>
        <td data-l="Monto vencido" class="nxFP-tMoney nxFP-tVencido${x.montoVencido > 0.5 ? ' late' : ''}">${x.montoVencido > 0.5 ? fmt(x.montoVencido) : '—'}</td>
        <td data-l="Saldo" class="nxFP-tMoney nxFP-tSaldo">${fmt(x.saldo)}</td>
        <td data-l="Último pago" class="nxFP-tUlt">${ultTxt}</td>
        <td data-l="Acciones" class="nxFP-tAccC"><div class="nxFP-tAcc">
          <button type="button" class="nxFP-tPay" aria-label="Registrar pago de ${esc(p.nombre || '')}" onclick="event.stopPropagation();window.nxPrCobPagar('${p.id}')"><i class="ti ti-cash"></i><span>Cobrar</span></button>
          <span class="nxFP-tMenuWrap">
            <button type="button" class="nxFP-menuBtn" aria-label="Más opciones de ${esc(p.nombre || '')}" onclick="window.nxPrCobMenu(event,'${p.id}')"><i class="ti ti-dots-vertical"></i></button>
            <div class="nxFP-menuPop" id="prCobMenu_${p.id}">
              <button type="button" onclick="window.nxPrCobMenuGo(event,'${p.id}','ver')"><i class="ti ti-eye"></i> Ver detalle</button>
              ${p.cliente_id ? `<button type="button" onclick="window.nxPrCobMenuGo(event,'${p.id}','cliente')"><i class="ti ti-user"></i> Ver cliente</button>` : ''}
              <button type="button" onclick="window.nxPrCobMenuGo(event,'${p.id}','editar')"><i class="ti ti-pencil"></i> Editar</button>
              <button type="button" onclick="window.nxPrCobMenuGo(event,'${p.id}','estado')"><i class="ti ti-printer"></i> Estado de cuenta</button>
              ${p.telefono ? `<button type="button" onclick="window.nxPrCobMenuGo(event,'${p.id}','wa')"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
            </div>
          </span>
        </div></td>
      </tr>`;
  }
  // Registrar pago DESDE la fila de Cobranza: reutiliza el formulario real (vive en
  // el pie FIJO de nxPrestamoVer, siempre visible sin scroll) — no se inventa un
  // modal nuevo. appendChild es síncrono, así que el campo ya existe al enfocar
  // (sin timers, per spec).
  window.nxPrCobPagar = function (id) {
    window.nxPrestamoVer(id);
    const inp = document.getElementById('prPagoMonto'); if (inp) inp.focus();
  };
  window.nxPrCobMenu = function (ev, id) {
    if (ev) ev.stopPropagation();
    document.querySelectorAll('.nxFP-menuPop.open').forEach(function (m) { if (m.id !== 'prCobMenu_' + id) m.classList.remove('open'); });
    const pop = document.getElementById('prCobMenu_' + id); if (pop) pop.classList.toggle('open');
  };
  window.nxPrCobMenuGo = function (ev, id, accion) {
    if (ev) ev.stopPropagation();
    const pop = document.getElementById('prCobMenu_' + id); if (pop) pop.classList.remove('open');
    if (accion === 'ver') window.nxPrestamoVer(id);
    else if (accion === 'cliente') { const p = _prestamos.find(x => String(x.id) === String(id)); if (p && p.cliente_id) window.nxPrHistCredito(p.cliente_id); }
    else if (accion === 'editar') window.nxPrestamoEditar(id);
    else if (accion === 'estado') window.nxPrestamoEstadoCuenta(id);
    else if (accion === 'wa') window.nxPrestamoWA(id);
  };
  function prCobranzaPagFooterHTML(total, totalPag, desde) {
    if (total <= PR_COB_PAGE_SIZE) return '';
    const btn = (n, lbl, dis) => `<button type="button"${dis ? ' disabled' : ''} onclick="window.nxPrCobPagina(${n})">${lbl}</button>`;
    let pg = btn(_prCobPage - 1, '<i class="ti ti-chevron-left"></i>', _prCobPage <= 1);
    for (let n = 1; n <= totalPag; n++) { if (totalPag > 7 && n > 2 && n < totalPag - 1 && Math.abs(n - _prCobPage) > 1) { if (n === 3 || n === totalPag - 2) pg += '<button type="button" disabled>…</button>'; continue; } pg += `<button type="button"${n === _prCobPage ? ' class="on"' : ''} onclick="window.nxPrCobPagina(${n})">${n}</button>`; }
    pg += btn(_prCobPage + 1, '<i class="ti ti-chevron-right"></i>', _prCobPage >= totalPag);
    return `<div class="nxFP-pager"><div class="nxFP-pgInfo">Mostrando ${desde + 1}–${Math.min(desde + PR_COB_PAGE_SIZE, total)} de ${total} ${total === 1 ? 'préstamo' : 'préstamos'}</div><div class="nxFP-pgBtns">${pg}</div></div>`;
  }
  function prCobranzaTablaHTML() {
    const todos = prCobranzaListaFiltrada();
    if (!todos.length) return `<div class="nxFP-empty"><div class="nxFP-emptyIco"><i class="ti ti-mood-smile"></i></div><h3>Nada por cobrar aquí</h3><p>Ningún préstamo coincide con este filtro.</p></div>`;
    const totalPag = Math.max(1, Math.ceil(todos.length / PR_COB_PAGE_SIZE));
    if (_prCobPage > totalPag) _prCobPage = totalPag; if (_prCobPage < 1) _prCobPage = 1;
    const desde = (_prCobPage - 1) * PR_COB_PAGE_SIZE;
    const rows = todos.slice(desde, desde + PR_COB_PAGE_SIZE).map(prCobranzaFilaHTML).join('');
    return `<div class="nxFP-tblWrap"><table class="nxFP-tbl nxFP-cobTbl"><thead><tr>
        <th>Cliente</th><th>Referencia</th><th>Estado</th><th>Días vencido</th><th>Próxima cuota</th><th>Monto vencido</th><th>Saldo</th><th>Último pago</th><th>Acciones</th>
      </tr></thead><tbody>${rows}</tbody></table></div>${prCobranzaPagFooterHTML(todos.length, totalPag, desde)}`;
  }
  function prCobranzaTabsHTML() {
    const n = k => k === 'todos' ? _prCobModelo.length : k === 'pendientes' ? _prCobModelo.filter(x => PR_COB_PENDIENTES.indexOf(x.prio) !== -1).length : _prCobModelo.filter(x => x.prio === k).length;
    const tabs = [['pendientes', 'Pendientes', 'ti-alert-circle'], ['critico', 'Críticos', 'ti-alert-octagon'], ['alta', 'Alta prioridad', 'ti-alert-triangle'], ['morareciente', 'Mora reciente', 'ti-clock-exclamation'], ['porvencer', 'Por vencer', 'ti-calendar-due'], ['aldia', 'Al día', 'ti-circle-check'], ['todos', 'Todos', 'ti-layout-grid']];
    return tabs.map(t => `<button type="button" class="nxFP-tab ${_prCobTab === t[0] ? 'on' : ''}" onclick="window.nxPrCobTab('${t[0]}')"><i class="ti ${t[2]}"></i> ${t[1]} <span class="nxFP-tabN">${n(t[0])}</span></button>`).join('');
  }
  window.nxPrCobTab = function (k) {
    _prCobTab = k || 'pendientes';
    _prCobPage = 1;
    const t = document.getElementById('nxPrCobTabs'); if (t) t.innerHTML = prCobranzaTabsHTML();
    const l = document.getElementById('nxPrCobLista'); if (l) l.innerHTML = prCobranzaTablaHTML();
  };
  window.nxPrCobBuscar = function (v) {
    _prCobQ = v || '';
    _prCobPage = 1;
    const l = document.getElementById('nxPrCobLista'); if (l) l.innerHTML = prCobranzaTablaHTML();
  };
  window.nxPrCobPagina = function (n) { _prCobPage = n; const l = document.getElementById('nxPrCobLista'); if (l) l.innerHTML = prCobranzaTablaHTML(); };
  // Exportación PROPIA de Cobranza (spec V2.1 #8): respeta pestaña activa + búsqueda +
  // orden actual — a diferencia de nxPrestamoExportar(), que SIEMPRE exporta la
  // cartera completa sin filtrar (confirmado leyendo esa función en la auditoría).
  // Mismo motor CSV que ya usa nxPrestamoExportar (Blob + <a download>), sin librería
  // nueva. Nota: el nombre real es .csv, no .xlsx como pedía el spec — sería fingir un
  // formato que no se genera (mismo criterio ya usado en todo el sistema: nunca un
  // nombre de archivo que prometa algo que el contenido no es).
  window.nxPrCobranzaExportar = function () {
    const lista = prCobranzaListaFiltrada();
    if (!lista.length) { toast('warn', 'No hay préstamos para exportar en este filtro'); return; }
    const cab = ['Referencia', 'Cliente', 'Cédula', 'Teléfono', 'Saldo pendiente', 'Próximo pago', 'Días vencido', 'Prioridad', 'Fecha último pago', 'Monto último pago'];
    const filas = lista.map(x => [
      prRef(x.p), x.p.nombre || '', x.p.cedula || '', x.p.telefono || '',
      Math.round(x.saldo), x.prox || '', x.diasVencido || '', PR_COB_LBL[x.prio] || '',
      x.ultimoPago ? String(x.ultimoPago.fecha || '').slice(0, 10) : '', x.ultimoPago ? Math.round(Number(x.ultimoPago.monto || 0)) : ''
    ]);
    const esc2 = v => { const s = String(v == null ? '' : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cab, ...filas].map(r => r.map(esc2).join(',')).join('\r\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'cobranza-' + _prCobTab + '-' + hoy() + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 500);
      toast('ok', 'Excel exportado', lista.length + ' préstamos de "' + (PR_COB_TAB_LBL[_prCobTab] || _prCobTab) + '"');
    } catch (e) { toast('err', 'No se pudo exportar', String(e && e.message || e)); }
  };
  // NPGS §5: sin cont: — la tabla vive envuelta en .nxFP-tblWrap (el contador contaría
  // 1 wrapper, no las filas), mismo criterio ya usado en pintarLupaPr() para la lista general.
  function pintarLupaPrCob() {
    const box = document.getElementById('nxPrCobBuscarLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_nxPrCobBuscar')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'nxPrCobBuscar',
      placeholder: 'Nombre, cédula, teléfono o referencia…', value: _prCobQ,
      onterm: function (v) { window.nxPrCobBuscar(v); }
    });
  }
  // Formato V3 (mockup ChatGPT, aprobado solo en botones/ubicación/formato — el
  // color/tipografía siguen siendo los del módulo, morado + Plus Jakarta, NO el
  // azul/Inter del mockup): 5 KPIs separados (antes "alta"+"mora" iban combinados
  // en un solo "SALDO VENCIDO"), panel lateral reformado a "Resumen del día" +
  // "Pagos recientes" REALES (el mockup traía "Promesas de pago"/"Meta del
  // día"/"Actividad reciente" — ninguno tiene dato real detrás en este módulo, se
  // omiten por completo en vez de fingirlos; "Pagos recientes" sí es real, mismo
  // dato ya cargado en _pagosByPrestamo).
  function prCobranzaMainHTML() {
    prCobranzaCalcularModelo(); // modelo derivado ÚNICO — de aquí en adelante todo lee _prCobModelo
    const modelo = _prCobModelo;
    const bucket = k => modelo.filter(x => x.prio === k);
    const critico = bucket('critico'), alta = bucket('alta'), morareciente = bucket('morareciente'), porvencer = bucket('porvencer'), aldia = bucket('aldia');
    const sumSaldo = arr => arr.reduce((s, x) => s + x.saldo, 0);
    const sumVencido = arr => arr.reduce((s, x) => s + x.montoVencido, 0);
    // "Cobrar hoy" = lo que YA venció y sigue sin cubrir en toda la cartera con
    // gestión pendiente — el monto real que hay que perseguir, no una meta inventada.
    const cobrarHoy = sumVencido(critico) + sumVencido(alta) + sumVencido(morareciente);
    // "Pagos registrados hoy" — suma real de prestamo_pagos.monto con fecha=hoy, de _pagosByPrestamo
    // (ya cargado por cargarPrestamos, mismo objeto que usa renderLista para "Cobrado este mes").
    const pagosHoy = Object.values(_pagosByPrestamo).reduce((s, arr) => s + arr.filter(pg => String(pg.fecha || '').slice(0, 10) === hoy()).reduce((s2, pg) => s2 + Number(pg.monto || 0), 0), 0);
    // Pagos RECIENTES (no "actividad" inventada) — últimos 5 pagos de toda la
    // cartera, más nuevo primero. Reusa _pagosByPrestamo ya cargado, cero consulta nueva.
    const pagosRecientes = [];
    Object.keys(_pagosByPrestamo).forEach(function (pid) {
      const pr = _prestamos.find(function (x) { return x.id === pid; });
      (_pagosByPrestamo[pid] || []).forEach(function (pg) { pagosRecientes.push({ nombre: (pr && pr.nombre) || 'Cliente', fecha: pg.fecha, monto: pg.monto }); });
    });
    pagosRecientes.sort(function (a, b) { return (b.fecha || '') < (a.fecha || '') ? -1 : (b.fecha || '') > (a.fecha || '') ? 1 : 0; });
    const repKpi = (ico, bg, col, lbl, val, sub) => `<div class="nxFP-kpi"><div class="nxFP-kpiTop"><div class="nxFP-kpiIco" style="background:${bg};color:${col}"><i class="ti ${ico}"></i></div><div class="nxFP-kpiLbl">${lbl}</div></div><div class="nxFP-kpiVal">${val}</div><div class="nxFP-kpiSub">${sub}</div></div>`;
    return `
      <div class="nxFP-topbar">
        <button type="button" class="nxFP-burger" onclick="window.nxFPToggleSide()" aria-label="Abrir menú"><i class="ti ti-menu-2"></i></button>
        <div><div class="nxFP-topTitle">Cobranza</div><div class="nxFP-topSub">Gestión y seguimiento de cartera</div></div>
        <div class="nxFP-topActions"><button type="button" onclick="window.nxPrCobranzaExportar()"><i class="ti ti-file-spreadsheet"></i> <span>Excel</span></button></div>
      </div>
      <div class="nxFP-kpis">
        ${repKpi('ti-alert-octagon', '#fee2e2', '#b91c1c', 'SALDO CRÍTICO', fmt(sumSaldo(critico)), critico.length + (critico.length === 1 ? ' cliente' : ' clientes'))}
        ${repKpi('ti-alert-triangle', '#ffedd5', '#c2410c', 'ALTA PRIORIDAD', fmt(sumSaldo(alta)), alta.length + (alta.length === 1 ? ' cliente' : ' clientes'))}
        ${repKpi('ti-clock-exclamation', '#fef3c7', '#92400e', 'MORA RECIENTE', fmt(sumSaldo(morareciente)), morareciente.length + (morareciente.length === 1 ? ' cliente' : ' clientes'))}
        ${repKpi('ti-calendar-due', '#dbeafe', '#1d4ed8', 'VENCE EN 7 DÍAS', fmt(sumSaldo(porvencer)), porvencer.length + (porvencer.length === 1 ? ' cliente' : ' clientes'))}
        ${repKpi('ti-circle-check', '#dcfce7', '#15803d', 'AL DÍA', String(aldia.length), 'clientes sin atrasos')}
      </div>
      <div class="nxFP-searchRow"><span id="nxPrCobBuscarLupa"></span></div>
      <div class="nxFP-tabs" id="nxPrCobTabs">${prCobranzaTabsHTML()}</div>
      <div class="nxFP-cobGrid">
        <aside class="nxFP-cobSide">
          <div class="nxFP-cobSideTit">Resumen del día</div>
          <div class="nxFP-cobSideRow big"><span>Cobrar hoy</span><b>${fmt(cobrarHoy)}</b></div>
          <div class="nxFP-cobSideRow crit"><span><i class="ti ti-alert-octagon"></i> Clientes críticos</span><b>${critico.length}</b></div>
          <div class="nxFP-cobSideRow"><span><i class="ti ti-cash-banknote"></i> Pagos registrados hoy</span><b>${fmt(pagosHoy)}</b></div>
          <div class="nxFP-cobSideDiv"></div>
          <div class="nxFP-cobSideActivity">
            <div class="nxFP-cobSideTit">Pagos recientes</div>
            ${pagosRecientes.length ? pagosRecientes.slice(0, 5).map(function (e) { return `<div class="nxFP-cobEvent">${esc(e.nombre)} · pago ${fmt(e.monto)}</div>`; }).join('') : '<div class="nxFP-cobEmpty">Sin pagos registrados todavía.</div>'}
          </div>
        </aside>
        <div id="nxPrCobLista">${prCobranzaTablaHTML()}</div>
      </div>`;
  }

  function renderLista(view) {
    window.nxFPEnsureCSS();
    _prPage = 1; _prQuery = '';
    _prCobTab = 'pendientes'; _prCobQ = ''; _prCobPage = 1;
    const totalCap = _prestamos.reduce((s, p) => s + Number(p.capital || 0), 0);
    const totalPag = _prestamos.reduce((s, p) => s + pagadoDe(p), 0);
    const totalSaldo = _prestamos.reduce((s, p) => s + saldoDe(p), 0);
    const totalIntCob = _prestamos.reduce((s, p) => s + interesCobradoDe(p), 0);
    const totalVencido = _prestamos.filter(esVencido).reduce((s, p) => s + saldoDe(p), 0);
    const clientesActivos = new Set(_prestamos.filter(p => estadoDe(p) !== 'pagado').map(p => (p.cedula || p.nombre || '').toLowerCase())).size;
    // Cobrado este mes vs mes anterior — real, de los pagos con fecha (mismo criterio que Cuotas del POS)
    const ym = hoy().slice(0, 7);
    const dAnt = new Date(ym + '-01T12:00:00'); dAnt.setMonth(dAnt.getMonth() - 1);
    const ymAnt = dAnt.getFullYear() + '-' + String(dAnt.getMonth() + 1).padStart(2, '0');
    let cobradoMes = 0, cobradoMesAnt = 0;
    Object.values(_pagosByPrestamo).forEach(arr => arr.forEach(pg => {
      const ymPg = String(pg.fecha || '').slice(0, 7);
      if (ymPg === ym) cobradoMes += Number(pg.monto || 0); else if (ymPg === ymAnt) cobradoMesAnt += Number(pg.monto || 0);
    }));
    const tendencia = cobradoMesAnt > 0 ? Math.round((cobradoMes - cobradoMesAnt) / cobradoMesAnt * 100) : null;
    const nActivos = _prestamos.filter(p => estadoDe(p) !== 'pagado').length;
    const nVencidos = _prestamos.filter(esVencido).length;
    const proxVencer = _prestamos.filter(p => {
      if (estadoDe(p) === 'pagado' || esVencido(p)) return false;
      const f = prProximoPago(p); if (!f) return false;
      const d = Math.floor((new Date(f + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 86400000);
      return d >= 0 && d <= 7;
    }).length;
    const nav = (key, lbl, ico) => `<button type="button" class="nxFP-navItem${_prView === 'prestamos' && _prFiltro === key ? ' on' : ''}" onclick="window.nxPrestamoFiltroTipo('${key}')"><i class="ti ${ico}"></i> ${lbl}</button>`;
    view.innerHTML = `<div class="nxFP nxFPShell" id="nxFPShell">
      <div class="nxFP-sideOverlay" onclick="window.nxFPToggleSide()"></div>
      <aside class="nxFP-side">
        <div class="nxFP-sideBrand"><div class="nxFP-sideLogo"><i class="ti ti-cash"></i></div><div><b>NEXUS PRO</b><span>Financiamiento</span></div></div>
        <button type="button" class="nxFP-sideNew" onclick="window.nxPrestamoNuevo()"><i class="ti ti-plus"></i> Nuevo préstamo</button>
        <nav class="nxFP-sideNav">
          ${nav('todos', 'Dashboard', 'ti-layout-dashboard')}
          ${nav('activos', 'Activos', 'ti-circle-check')}
          ${nav('vencidos', 'Cobranza', 'ti-user-dollar')}
          ${nav('cuotas', 'Cuotas', 'ti-calendar-dollar')}
          ${nav('pagados', 'Pagados', 'ti-checks')}
          ${nav('credito', 'Líneas de crédito', 'ti-credit-card')}
          <button type="button" class="nxFP-navItem${_prView === 'clientes' ? ' on' : ''}" onclick="window.nxPrView('clientes')"><i class="ti ti-users-group"></i> Clientes</button>
          <button type="button" class="nxFP-navItem${_prView === 'evaluacion' ? ' on' : ''}" onclick="window.nxPrView('evaluacion')"><i class="ti ti-clipboard-check"></i> Evaluación</button>
          <button type="button" class="nxFP-navItem${_prView === 'solicitudes' ? ' on' : ''}" onclick="window.nxPrView('solicitudes')"><i class="ti ti-file-check"></i> Solicitudes${_prSolicitudes.filter(s => s.estado === 'enviada').length ? ` (${_prSolicitudes.filter(s => s.estado === 'enviada').length})` : ''}</button>
          <div class="nxFP-sideDiv"></div>
          <button type="button" class="nxFP-navItem${_prView === 'reportes' ? ' on' : ''}" onclick="window.nxPrView('reportes')"><i class="ti ti-report-money"></i> Reportes</button>
          <button type="button" class="nxFP-navItem" onclick="window.nxPrestamoConfig()"><i class="ti ti-settings"></i> Configuración</button>
        </nav>
        <button type="button" class="nxFP-sideBack" onclick="window.nxAbrirMultiempresa()"><i class="ti ti-arrow-left"></i> Volver a Multiempresa</button>
      </aside>
      <div class="nxFP-main">${_prView === 'clientes' ? prClientesMainHTML() : _prView === 'evaluacion' ? prEvalMainHTML() : _prView === 'reportes' ? prReportesMainHTML() : _prView === 'solicitudes' ? prSolicitudesMainHTML() : (_prView === 'prestamos' && _prFiltro === 'vencidos') ? prCobranzaMainHTML() : `
        <div class="nxFP-topbar">
          <button type="button" class="nxFP-burger" onclick="window.nxFPToggleSide()" aria-label="Abrir menú"><i class="ti ti-menu-2"></i></button>
          <div><div class="nxFP-topTitle">Financiamiento</div><div class="nxFP-topSub">Administra y controla todos los préstamos</div></div>
          <div class="nxFP-topActions"><button type="button" onclick="window.nxPrestamoExportar()"><i class="ti ti-file-spreadsheet"></i> <span>Excel</span></button><button type="button" class="prim" onclick="window.nxPrestamoNuevo()"><i class="ti ti-plus"></i> <span>Nuevo</span></button></div>
        </div>
        <div class="nxFP-hA">
          <div class="nxFP-hAL">
            <div class="nxFP-hAeb">Total por cobrar</div>
            <div class="nxFP-hAbig">${fmt(totalSaldo)}</div>
            <div class="nxFP-hAsub">Cobrado este mes: ${fmt(cobradoMes)}${tendencia !== null ? ' · <b>' + (tendencia >= 0 ? '+' : '') + tendencia + '% vs mes ant.</b>' : ''}</div>
          </div>
          <div class="nxFP-hAR">
            <div class="nxFP-hAst"><div class="nxFP-hAsi"><i class="ti ti-wallet"></i></div><div><div class="nxFP-hAsl">Prestado</div><div class="nxFP-hAsv">${fmt(totalCap)}</div></div></div>
            <div class="nxFP-hAst"><div class="nxFP-hAsi"><i class="ti ti-hand-click"></i></div><div><div class="nxFP-hAsl">Cobrado</div><div class="nxFP-hAsv">${fmt(totalPag)}</div></div></div>
            <div class="nxFP-hAst"><div class="nxFP-hAsi warn"><i class="ti ti-clock-exclamation"></i></div><div><div class="nxFP-hAsl">Vencido</div><div class="nxFP-hAsv">${fmt(totalVencido)}</div></div></div>
            <div class="nxFP-hAst"><div class="nxFP-hAsi"><i class="ti ti-users"></i></div><div><div class="nxFP-hAsl">Clientes</div><div class="nxFP-hAsv">${clientesActivos} activos</div></div></div>
          </div>
        </div>
        <div class="nxFP-searchRow"><span id="nxPrBuscarLupa"></span></div>
        <div class="nxFP-listHead"><span>LISTA DE PRÉSTAMOS</span></div>
        <div id="nxPrLista">${prTablaHTML()}</div>
        <div class="nxFP-dash">
          <div class="nxFP-dcard"><div class="nxFP-dico"><i class="ti ti-percentage"></i></div><div><div class="nxFP-dlbl">INTERÉS COBRADO</div><div class="nxFP-dval">${fmt(totalIntCob)}</div><div class="nxFP-dsub">Total histórico</div></div></div>
          <div class="nxFP-dcard"><div class="nxFP-dico green"><i class="ti ti-circle-check"></i></div><div><div class="nxFP-dlbl">COBRADO DEL MES</div><div class="nxFP-dval">${fmt(cobradoMes)}</div><div class="nxFP-dsub">${tendencia !== null ? (tendencia >= 0 ? '+' : '') + tendencia + '% vs mes ant.' : 'Sin datos del mes anterior'}</div></div></div>
          <div class="nxFP-dcard"><div class="nxFP-dico red"><i class="ti ti-alert-triangle"></i></div><div><div class="nxFP-dlbl">VENCIDOS</div><div class="nxFP-dval">${nVencidos}</div><div class="nxFP-dsub">Préstamos vencidos</div></div></div>
          <div class="nxFP-dcard"><div class="nxFP-dico amber"><i class="ti ti-clock-hour-4"></i></div><div><div class="nxFP-dlbl">PRÓXIMOS A VENCER</div><div class="nxFP-dval">${proxVencer}</div><div class="nxFP-dsub">En los próximos 7 días</div></div></div>
          <div class="nxFP-dcard"><div class="nxFP-dico blue"><i class="ti ti-list-check"></i></div><div><div class="nxFP-dlbl">TOTAL PRÉSTAMOS</div><div class="nxFP-dval">${_prestamos.length}</div><div class="nxFP-dsub">Histórico</div></div></div>
        </div>`}
      </div>
    </div>`;
    renderFPDock();
    if (_prView === 'evaluacion') { try { evInit(); } catch (e) {} }
    // NPGS §5: pintar la lupa DESPUÉS de view.innerHTML — el <span> recién existe aquí.
    // Espeja el ternario de arriba: clientes → su lupa; Cobranza → la suya; el ELSE (lista
    // general de préstamos) → la de siempre.
    if (_prView === 'clientes') { try { pintarLupaPrCli(); } catch (e) {} }
    else if (_prView === 'prestamos' && _prFiltro === 'vencidos') { try { pintarLupaPrCob(); } catch (error) { console.error('[Cobranza] Error al inicializar el buscador:', error); } }
    else if (_prView !== 'evaluacion' && _prView !== 'reportes' && _prView !== 'solicitudes') { try { pintarLupaPr(); } catch (e) {} }
  }
  // ══════════════════════════════════════════════════════════════════
  //  REPORTES DE FINANCIAMIENTO (dashboard, spec ChatGPT "Reportes V1")
  //  100% datos reales de prestamos/prestamo_pagos. Sin agentes/sucursales
  //  (no existen en este módulo de un solo dueño) — ver notas de omisión.
  // ══════════════════════════════════════════════════════════════════
  const PR_MES3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const PR_MET_COL = ['#4f46e5', '#22c55e', '#a855f7', '#f59e0b', '#0891b2', '#ec4899', '#64748b', '#14b8a6'];
  function prRepRango(pz) { const t = hoy(); if (pz === 'mes') return [t.slice(0, 7) + '-01', t]; if (pz === 'anio') return [t.slice(0, 4) + '-01-01', t]; return [null, null]; }
  function prRepPeriodoTxt(pz) { const t = hoy(); if (pz === 'mes') return 'Este mes'; if (pz === 'anio') return 'Año ' + t.slice(0, 4); return 'Todo el histórico'; }
  // Antigüedad de cartera (aging) sobre préstamos ACTIVOS, por días de atraso reales.
  function prRepAging() {
    const b = [
      { label: 'Al día', color: '#16a34a', n: 0, cap: 0 },
      { label: '1 - 30 días', color: '#f59e0b', n: 0, cap: 0 },
      { label: '31 - 60 días', color: '#f97316', n: 0, cap: 0 },
      { label: '61 - 90 días', color: '#ef4444', n: 0, cap: 0 },
      { label: 'Más de 90 días', color: '#b91c1c', n: 0, cap: 0 }
    ];
    _prestamos.forEach(p => {
      if (estadoDe(p) === 'pagado') return;
      const d = esVencido(p) ? prDiasVencido(p) : 0, cap = saldoDe(p);
      const i = d === 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4;
      b[i].n++; b[i].cap += cap;
    });
    return b;
  }
  // Colocaciones (capital prestado por mes de fecha_prestamo) vs Cobros (pagos por mes) — últimos 12 meses.
  function prRepMeses() {
    const arr = [], idx = {}, now = new Date(hoy() + 'T12:00:00');
    for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); idx[ym] = arr.length; arr.push({ ym: ym, label: PR_MES3[d.getMonth()], col: 0, cob: 0 }); }
    _prestamos.forEach(p => { const ym = String(p.fecha_prestamo || '').slice(0, 7); if (idx[ym] != null) arr[idx[ym]].col += Number(p.capital || 0); });
    Object.values(_pagosByPrestamo).forEach(a => a.forEach(pg => { const ym = String(pg.fecha || '').slice(0, 7); if (idx[ym] != null) arr[idx[ym]].cob += Number(pg.monto || 0); }));
    return arr;
  }
  // Cobros agrupados por método de pago (real: prestamo_pagos.metodo) dentro del rango.
  function prRepMetodos(desde, hasta) {
    const m = {};
    Object.values(_pagosByPrestamo).forEach(a => a.forEach(pg => { const f = String(pg.fecha || '').slice(0, 10); if (desde && f < desde) return; if (hasta && f > hasta) return; const k = (String(pg.metodo || '').trim()) || 'Sin especificar'; m[k] = (m[k] || 0) + Number(pg.monto || 0); }));
    return Object.keys(m).map(k => ({ label: k, val: m[k] })).sort((a, b) => b.val - a.val);
  }
  function prRepColocadoMes(ym) { let s = 0; _prestamos.forEach(p => { if (String(p.fecha_prestamo || '').slice(0, 7) === ym) s += Number(p.capital || 0); }); return s; }
  function prRepCobradoMes(ym) { let s = 0; Object.values(_pagosByPrestamo).forEach(a => a.forEach(pg => { if (String(pg.fecha || '').slice(0, 7) === ym) s += Number(pg.monto || 0); })); return s; }
  // Donut SVG (técnica de stroke-dasharray, fiable en móvil e impresión).
  function prDonutSVG(segs, centerTop, centerSub, size) {
    size = size || 158; const r = 56, cx = size / 2, cy = size / 2, C = 2 * Math.PI * r;
    const tot = segs.reduce((s, x) => s + (x.val || 0), 0) || 1;
    let off = 0;
    const circles = segs.filter(s => s.val > 0).map(s => { const dash = (s.val / tot) * C; const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="17" stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`; off += dash; return el; }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" class="nxFP-donut" role="img"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#eef0f5" stroke-width="17"/>${circles}<text x="${cx}" y="${cy - 3}" text-anchor="middle" class="nxFP-donutTop">${centerTop}</text><text x="${cx}" y="${cy + 15}" text-anchor="middle" class="nxFP-donutSub">${centerSub}</text></svg>`;
  }
  // Gráfica de barras agrupadas Colocaciones vs Cobros (12 meses).
  function prBarsSVG(meses) {
    const W = 580, H = 220, padB = 26, padL = 10, padT = 12;
    const max = Math.max(1, ...meses.map(m => Math.max(m.col, m.cob)));
    const n = meses.length, gw = (W - padL * 2) / n, bw = Math.min(10, gw / 3.2);
    let bars = '', labels = '';
    meses.forEach((m, i) => {
      const x = padL + i * gw + gw / 2;
      const hc = (m.col / max) * (H - padB - padT), hb = (m.cob / max) * (H - padB - padT);
      bars += `<rect x="${(x - bw - 1).toFixed(1)}" y="${(H - padB - hc).toFixed(1)}" width="${bw}" height="${Math.max(0, hc).toFixed(1)}" rx="2" fill="#4f46e5"/>`;
      bars += `<rect x="${(x + 1).toFixed(1)}" y="${(H - padB - hb).toFixed(1)}" width="${bw}" height="${Math.max(0, hb).toFixed(1)}" rx="2" fill="#22c55e"/>`;
      labels += `<text x="${x.toFixed(1)}" y="${H - 9}" text-anchor="middle" class="nxFP-barLbl">${m.label}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="nxFP-bars" preserveAspectRatio="xMidYMid meet" role="img">${bars}${labels}</svg>`;
  }
  function prReportesMainHTML() {
    const pz = _prRepPeriodo || 'todo', rango = prRepRango(pz), desde = rango[0], hasta = rango[1];
    // FLUJO (alcanzado por el período)
    let colocado = 0; _prestamos.forEach(p => { const f = String(p.fecha_prestamo || '').slice(0, 10); if (desde && f < desde) return; if (hasta && f > hasta) return; colocado += Number(p.capital || 0); });
    let recuperado = 0; Object.values(_pagosByPrestamo).forEach(a => a.forEach(pg => { const f = String(pg.fecha || '').slice(0, 10); if (desde && f < desde) return; if (hasta && f > hasta) return; recuperado += Number(pg.monto || 0); }));
    // STOCK (siempre al día de hoy)
    const balance = _prestamos.reduce((s, p) => s + saldoDe(p), 0);
    const intereses = _prestamos.reduce((s, p) => s + interesCobradoDe(p), 0);
    const mora = _prestamos.reduce((s, p) => s + prMoraDe(p), 0);
    const moraOn = Number((_prCfg || {}).mora_pct || 0) > 0;
    const aging = prRepAging();
    const activos = aging.reduce((s, b) => s + b.n, 0);
    const balAg = aging.reduce((s, b) => s + b.cap, 0);
    const enMora = aging.slice(1).reduce((s, b) => s + b.n, 0);
    const balVenc = aging.slice(1).reduce((s, b) => s + b.cap, 0);
    const indice = balAg > 0 ? (balVenc / balAg * 100) : 0;
    const meses = prRepMeses();
    const metodos = prRepMetodos(desde, hasta);
    const totMet = metodos.reduce((s, m) => s + m.val, 0);
    // Deltas reales mes vs mes anterior (momentum)
    const ym = hoy().slice(0, 7), dA = new Date(ym + '-01T12:00:00'); dA.setMonth(dA.getMonth() - 1);
    const ymA = dA.getFullYear() + '-' + String(dA.getMonth() + 1).padStart(2, '0');
    const dCol = (function () { const b = prRepColocadoMes(ymA); return b > 0 ? Math.round((prRepColocadoMes(ym) - b) / b * 100) : null; })();
    const dCob = (function () { const b = prRepCobradoMes(ymA); return b > 0 ? Math.round((prRepCobradoMes(ym) - b) / b * 100) : null; })();
    const trend = d => d == null ? '<span class="nxFP-repMuted">Sin dato del mes anterior</span>' : `<span class="nxFP-t${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%</span> vs mes ant.`;
    // Alertas REALES
    const a30 = _prestamos.filter(p => esVencido(p) && prDiasVencido(p) > 30).length;
    const prox = _prestamos.filter(p => { if (estadoDe(p) === 'pagado' || esVencido(p)) return false; const f = prProximoPago(p); if (!f) return false; const dd = Math.floor((new Date(f + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 86400000); return dd >= 0 && dd <= 7; }).length;
    const repKpi = (ico, bg, col, lbl, val, sub) => `<div class="nxFP-kpi"><div class="nxFP-kpiTop"><div class="nxFP-kpiIco" style="background:${bg};color:${col}"><i class="ti ${ico}"></i></div><div class="nxFP-kpiLbl">${lbl}</div></div><div class="nxFP-kpiVal">${val}</div><div class="nxFP-kpiSub">${sub}</div></div>`;
    const perBtn = (k, l) => `<button type="button" class="nxFP-perBtn${pz === k ? ' on' : ''}" onclick="window.nxPrRepPeriodo('${k}')">${l}</button>`;
    // Donut estado de cartera (por cantidad)
    const cartSegs = aging.map(b => ({ val: b.n, color: b.color }));
    const cartLeg = aging.map(b => `<div class="nxFP-legRow"><span class="nxFP-dot" style="background:${b.color}"></span><span class="nxFP-legLbl">${b.label}</span><span class="nxFP-legN">${b.n}</span><span class="nxFP-legPct">${activos ? (b.n / activos * 100).toFixed(1) : '0.0'}%</span></div>`).join('');
    // Donut métodos de pago
    const metSegs = metodos.map((m, i) => ({ val: m.val, color: PR_MET_COL[i % PR_MET_COL.length] }));
    const metLeg = metodos.length ? metodos.map((m, i) => `<div class="nxFP-legRow"><span class="nxFP-dot" style="background:${PR_MET_COL[i % PR_MET_COL.length]}"></span><span class="nxFP-legLbl">${esc(m.label)}</span><span class="nxFP-legN">${fmt(m.val)}</span><span class="nxFP-legPct">${totMet ? (m.val / totMet * 100).toFixed(1) : '0.0'}%</span></div>`).join('') : '<div class="nxFP-repEmpty">Sin cobros registrados en el período.</div>';
    // Antigüedad tabla
    const agRows = aging.map(b => `<tr><td data-l="Rango" class="nxFP-tdNom"><span class="nxFP-dot" style="background:${b.color}"></span> ${b.label}</td><td data-l="Préstamos">${b.n}</td><td data-l="Capital pendiente" class="nxFP-tMoney">${fmt(b.cap)}</td><td data-l="% del total">${balAg ? (b.cap / balAg * 100).toFixed(1) : '0.0'}%</td></tr>`).join('');
    // Alertas (solo reales)
    const alertas = [];
    if (a30 > 0) alertas.push(`<div class="nxFP-alertRow err"><i class="ti ti-alert-triangle"></i><span>${a30} préstamo${a30 === 1 ? '' : 's'} con más de 30 días de atraso</span></div>`);
    if (enMora > 0) alertas.push(`<div class="nxFP-alertRow warn"><i class="ti ti-clock-exclamation"></i><span>${enMora} préstamo${enMora === 1 ? '' : 's'} vencido${enMora === 1 ? '' : 's'} (${fmt(balVenc)} en cartera)</span></div>`);
    if (prox > 0) alertas.push(`<div class="nxFP-alertRow info"><i class="ti ti-calendar-due"></i><span>${prox} préstamo${prox === 1 ? '' : 's'} con pago en los próximos 7 días</span></div>`);
    if (!alertas.length) alertas.push('<div class="nxFP-alertRow ok"><i class="ti ti-circle-check"></i><span>Sin alertas — la cartera está al día.</span></div>');
    const qa = (ico, col, lbl, on) => `<button type="button" class="nxFP-qbtn" onclick="${on}"><div class="nxFP-qico" style="color:${col}"><i class="ti ${ico}"></i></div><span>${lbl}</span></button>`;
    return `
      <div class="nxFP-topbar">
        <button type="button" class="nxFP-burger" onclick="window.nxFPToggleSide()" aria-label="Abrir menú"><i class="ti ti-menu-2"></i></button>
        <div><div class="nxFP-topTitle">Reportes de financiamiento</div><div class="nxFP-topSub">Centro de análisis y seguimiento de la cartera de préstamos</div></div>
        <div class="nxFP-topActions"><button type="button" onclick="window.nxPrestamoExportar()"><i class="ti ti-file-spreadsheet"></i> <span>Exportar</span></button><button type="button" class="prim" onclick="window.nxPrestamoReporte()"><i class="ti ti-printer"></i> <span>Imprimir</span></button></div>
      </div>
      <div class="nxFP-repBar">
        <div class="nxFP-repPer">${perBtn('mes', 'Este mes')}${perBtn('anio', 'Este año')}${perBtn('todo', 'Todo')}</div>
        <div class="nxFP-repPerNote"><i class="ti ti-calendar"></i> Flujo: ${prRepPeriodoTxt(pz)} · Cartera y mora: al día de hoy</div>
      </div>
      <div class="nxFP-kpis nxFP-kpis6">
        ${repKpi('ti-cash-banknote', '#eef2ff', '#4f46e5', 'CAPITAL COLOCADO', fmt(colocado), trend(dCol))}
        ${repKpi('ti-cash', '#ecfdf5', '#059669', 'CAPITAL RECUPERADO', fmt(recuperado), trend(dCob))}
        ${repKpi('ti-wallet', '#eff6ff', '#2563eb', 'BALANCE PENDIENTE', fmt(balance), activos + (activos === 1 ? ' préstamo activo' : ' préstamos activos'))}
        ${repKpi('ti-percentage', '#f5f3ff', '#7c3aed', 'INTERESES COBRADOS', fmt(intereses), 'Acumulado')}
        ${repKpi('ti-alert-triangle', '#fff7ed', '#ea580c', 'MORA PENDIENTE', fmt(mora), moraOn ? 'Recargo por atraso' : 'Recargo desactivado')}
        ${repKpi('ti-gauge', '#fef2f2', '#dc2626', 'ÍNDICE DE MORA', indice.toFixed(1) + '%', enMora + (enMora === 1 ? ' préstamo en mora' : ' préstamos en mora'))}
      </div>
      <div class="nxFP-repGrid">
        <div class="nxFP-repCard">
          <div class="nxFP-repTit">Colocaciones vs Cobros <span>(últimos 12 meses)</span></div>
          <div class="nxFP-repLegTop"><span class="nxFP-legRow"><span class="nxFP-dot" style="background:#4f46e5"></span>Colocaciones</span><span class="nxFP-legRow"><span class="nxFP-dot" style="background:#22c55e"></span>Cobros</span></div>
          ${prBarsSVG(meses)}
        </div>
        <div class="nxFP-repCard">
          <div class="nxFP-repTit">Estado de la cartera</div>
          <div class="nxFP-repDonutWrap">${prDonutSVG(cartSegs, activos, 'Activos')}<div class="nxFP-legend">${cartLeg}</div></div>
          <div class="nxFP-repDonutFoot"><div><div class="nxFP-repFootLbl">Índice de mora</div><div class="nxFP-repFootVal danger">${indice.toFixed(1)}%</div></div><div><div class="nxFP-repFootLbl">Préstamos en mora</div><div class="nxFP-repFootVal">${enMora}</div></div></div>
        </div>
      </div>
      <div class="nxFP-repGrid">
        <div class="nxFP-repCard">
          <div class="nxFP-repTit">Antigüedad de cartera</div>
          <div class="nxFP-tblWrap"><table class="nxFP-tbl"><thead><tr><th>Rango de días</th><th>Préstamos</th><th>Capital pendiente</th><th>% del total</th></tr></thead><tbody>${agRows}<tr class="nxFP-tTotal"><td class="nxFP-tdNom">Total</td><td>${activos}</td><td class="nxFP-tMoney">${fmt(balAg)}</td><td>100%</td></tr></tbody></table></div>
        </div>
        <div class="nxFP-repCard">
          <div class="nxFP-repTit">Cobros por método de pago <span>(${prRepPeriodoTxt(pz)})</span></div>
          <div class="nxFP-repDonutWrap">${prDonutSVG(metSegs, fmt(totMet).replace('RD$ ', ''), 'Total')}<div class="nxFP-legend">${metLeg}</div></div>
        </div>
      </div>
      <div class="nxFP-repGrid">
        <div class="nxFP-repCard">
          <div class="nxFP-repTit">Alertas importantes</div>
          <div class="nxFP-alerts">${alertas.join('')}</div>
        </div>
        <div class="nxFP-repCard">
          <div class="nxFP-repTit">Acciones rápidas</div>
          <div class="nxFP-quick nxFP-repQuick">
            ${qa('ti-folder', '#4f46e5', 'Reporte de cartera', 'window.nxPrestamoReporte()')}
            ${qa('ti-cash', '#059669', 'Cobranza', 'window.nxPrestamoCobranza()')}
            ${qa('ti-file-spreadsheet', '#0891b2', 'Exportar Excel', 'window.nxPrestamoExportar()')}
            ${qa('ti-checks', '#7c3aed', 'Préstamos cerrados', "window.nxPrestamoFiltroTipo('pagados')")}
            ${qa('ti-settings', '#64748b', 'Configuración', 'window.nxPrestamoConfig()')}
          </div>
        </div>
      </div>`;
  }
  window.nxPrRepPeriodo = function (v) { _prRepPeriodo = v || 'todo'; const view = document.getElementById('v-prestamos'); if (view) renderLista(view); };
  window.nxPrView = function (v) { _prView = v; _prCliQuery = ''; const view = document.getElementById('v-prestamos'); if (view) renderLista(view); };
  // ── Pantalla de CLIENTES de Financiamiento (tabla prestamo_clientes) ──
  function prCliStats(c) {
    // cuántos préstamos y saldo por cliente (enlace por prestamos.cliente_id)
    const suyos = _prestamos.filter(p => String(p.cliente_id || '') === String(c.id));
    return { n: suyos.length, saldo: suyos.reduce((s, p) => s + saldoDe(p), 0), activos: suyos.filter(p => estadoDe(p) !== 'pagado').length };
  }
  function prClientesFiltrados() {
    const q = _prCliQuery.trim().toLowerCase();
    if (!q) return _prClientes;
    return _prClientes.filter(c => ((c.nombre || '') + ' ' + (c.cedula || '') + ' ' + (c.telefono || '')).toLowerCase().indexOf(q) >= 0);
  }
  function prClientesTablaHTML() {
    if (!_prClientes.length) return `<div class="nxFP-empty"><div class="nxFP-emptyIco"><i class="ti ti-user-off"></i></div><h3>Aún no hay clientes</h3><p>Toca "Nuevo cliente" para registrar el primero.</p><button type="button" class="nxFP-qbtn" style="max-width:220px;margin:14px auto 0" onclick="window.nxPrClienteNuevo()"><div class="nxFP-qico primary"><i class="ti ti-plus"></i></div><span>Nuevo cliente</span></button></div>`;
    const lista = prClientesFiltrados();
    if (!lista.length) return `<div class="nxFP-empty"><div class="nxFP-emptyIco"><i class="ti ti-search-off"></i></div><h3>Nada por aquí</h3><p>Ningún cliente coincide con la búsqueda.</p></div>`;
    const rows = lista.map(c => {
      const st = prCliStats(c);
      return `<tr onclick="window.nxPrClienteVer('${c.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}">
        <td data-l="Cliente" class="nxFP-tdNom"><div class="nxFP-tNom">${esc(c.nombre || 'Sin nombre')}</div>${c.ocupacion ? `<div class="nxFP-tSub">${esc(c.ocupacion)}</div>` : ''}</td>
        <td data-l="Cédula">${esc(c.cedula || '—')}</td>
        <td data-l="Teléfono">${esc(c.telefono || '—')}</td>
        <td data-l="Ciudad">${esc([c.sector, c.ciudad].filter(Boolean).join(', ') || '—')}</td>
        <td data-l="Préstamos" class="nxFP-tMoney">${st.n}${st.activos ? ` <span style="color:var(--pf-green);font-weight:800">(${st.activos} act.)</span>` : ''}</td>
        <td data-l="Saldo" class="nxFP-tMoney">${fmt(st.saldo)}</td>
        <td data-l="Acciones"><div class="nxFP-tAcc">
          <button type="button" title="Historial crediticio" aria-label="Historial crediticio" onclick="event.stopPropagation();window.nxPrHistCredito('${c.id}')"><i class="ti ti-history"></i></button>
          <button type="button" title="Editar" aria-label="Editar" onclick="event.stopPropagation();window.nxPrClienteEditar('${c.id}')"><i class="ti ti-pencil"></i></button>
          ${c.telefono ? `<button type="button" title="WhatsApp" aria-label="WhatsApp" onclick="event.stopPropagation();window.nxPrClienteWA('${c.id}')"><i class="ti ti-brand-whatsapp"></i></button>` : ''}
          <button type="button" title="Nuevo préstamo" aria-label="Nuevo préstamo" onclick="event.stopPropagation();window.nxPrestamoNuevoDeCliente('${c.id}')"><i class="ti ti-cash-plus"></i></button>
          <button type="button" title="${st.n ? 'No se puede eliminar: tiene préstamos' : 'Eliminar cliente'}" aria-label="Eliminar cliente" onclick="event.stopPropagation();window.nxPrClienteBorrar('${c.id}')"><i class="ti ti-minus" style="color:${st.n ? '#cbd5e1' : '#dc2626'}"></i></button>
        </div></td>
      </tr>`;
    }).join('');
    return `<div class="nxFP-tblWrap"><table class="nxFP-tbl"><thead><tr>
        <th>Cliente</th><th>Cédula</th><th>Teléfono</th><th>Ubicación</th><th>Préstamos</th><th>Saldo</th><th>Acciones</th>
      </tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function prClientesMainHTML() {
    const conPrestamo = new Set(_prestamos.map(p => String(p.cliente_id || '')).filter(Boolean)).size;
    const enMora = _prClientes.filter(c => _prestamos.some(p => String(p.cliente_id || '') === String(c.id) && esVencido(p))).length;
    const kpi2 = (ico, bg, col, lbl, val, sub) => `<div class="nxFP-kpi"><div class="nxFP-kpiTop"><div class="nxFP-kpiIco" style="background:${bg};color:${col}"><i class="ti ${ico}"></i></div><div class="nxFP-kpiLbl">${lbl}</div></div><div class="nxFP-kpiVal">${val}</div><div class="nxFP-kpiSub">${sub}</div></div>`;
    return `
      <div class="nxFP-topbar">
        <button type="button" class="nxFP-burger" onclick="window.nxFPToggleSide()" aria-label="Abrir menú"><i class="ti ti-menu-2"></i></button>
        <div><div class="nxFP-topTitle">Clientes</div><div class="nxFP-topSub">Registro de prestatarios</div></div>
        <div class="nxFP-topActions"><button type="button" class="prim" onclick="window.nxPrClienteNuevo()"><i class="ti ti-plus"></i> <span>Nuevo cliente</span></button></div>
      </div>
      <div class="nxFP-kpis">
        ${kpi2('ti-users-group', '#eef2ff', '#4f46e5', 'TOTAL CLIENTES', _prClientes.length, 'Registrados')}
        ${kpi2('ti-user-check', '#ecfdf5', '#059669', 'CON PRÉSTAMO', conPrestamo, 'Tienen al menos uno')}
        ${kpi2('ti-alert-triangle', '#fef2f2', '#dc2626', 'EN MORA', enMora, 'Con préstamo vencido')}
      </div>
      <div class="nxFP-searchRow"><span id="nxPrCliBuscarLupa"></span></div>
      <div class="nxFP-listHead"><span>LISTA DE CLIENTES</span></div>
      <div id="nxPrCliLista">${prClientesTablaHTML()}</div>`;
  }
  window.nxPrClienteFiltrar = function (q) { _prCliQuery = String(q || ''); const el = document.getElementById('nxPrCliLista'); if (el) el.innerHTML = prClientesTablaHTML(); };
  window.nxPrClienteNuevo = function () { abrirClienteForm(null, null); };
  window.nxPrClienteEditar = function (id) { const c = _prClientes.find(x => String(x.id) === String(id)); if (c) abrirClienteForm(c, null); };
  // Eliminar cliente. La base NO permite borrar un cliente con préstamos (prestamos.cliente_id es
  // NO ACTION → Postgres rechazaría el DELETE con un error técnico). Se comprueba ANTES y se avisa
  // claro: borrar un cliente con historial destruiría el registro de sus préstamos.
  window.nxPrClienteBorrar = async function (id) {
    const c = _prClientes.find(x => String(x.id) === String(id)); if (!c) return;
    const st = prCliStats(c);
    if (st.n > 0) {
      toast('err', 'No se puede eliminar', esc(c.nombre || 'Este cliente') + ' tiene ' + st.n + (st.n === 1 ? ' préstamo registrado' : ' préstamos registrados') + (st.activos ? ' (' + st.activos + ' sin saldar)' : '') + '. Borra primero sus préstamos, o déjalo como está para conservar el historial.');
      return;
    }
    try {
      const ok = (typeof window.swalConfirm === 'function')
        ? await window.swalConfirm('🗑️', '¿Eliminar este cliente?', esc(c.nombre || '') + ' — no tiene préstamos registrados. No se puede deshacer.', { ok: 'Eliminar', color: '#ef4444' })
        : window.confirm('¿Eliminar a ' + (c.nombre || 'este cliente') + '? No se puede deshacer.');
      if (!ok) return;
      await getAPI().del('prestamo_clientes', 'id=eq.' + id);
      cerrarModal('nxPrCliForm');
      try { window.logAudit && window.logAudit('PRESTAMO_CLIENTE_ELIMINADO', (c.nombre || '') + (c.cedula ? ' · ' + c.cedula : ''), 'Financiamiento'); } catch (e) {}
      toast('ok', 'Cliente eliminado', c.nombre || '');
      await cargarPrestamos();
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al eliminar', String(e && e.message || e)); }
  };
  window.nxPrClienteVer = function (id) { window.nxPrClienteEditar(id); };
  window.nxPrClienteWA = function (id) { const c = _prClientes.find(x => String(x.id) === String(id)); if (!c) return; const tel = String(c.telefono || '').replace(/\D/g, ''); if (!tel) { toast('err', 'Sin teléfono'); return; } window.open('https://wa.me/1' + tel, '_blank'); };
  let _prPrefillCli = null;
  window.nxPrestamoNuevoDeCliente = function (id) { const c = _prClientes.find(x => String(x.id) === String(id)); _prPrefillCli = c || null; _prView = 'prestamos'; abrirForm(null); };
  function abrirClienteForm(cli, onSaved) {
    cerrarModal('nxPrCliForm');
    try { window.nxFPEnsureCSS(); } catch (e) {}
    const c = cli || {};
    _prCliOnSaved = typeof onSaved === 'function' ? onSaved : null;
    const fr = (lbl, id, ph, val0, extra) => `<div class="fr"><label>${lbl}</label><input id="${id}" class="no-upper" ${extra || ''} value="${esc(val0 == null ? '' : val0)}" placeholder="${esc(ph || '')}"></div>`;
    const ov = document.createElement('div'); ov.id = 'nxPrCliForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:480px;max-height:92vh;display:flex;flex-direction:column">
      <div class="mt"><span><i class="ti ti-user-plus"></i> ${cli ? 'Editar cliente' : 'Nuevo cliente'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrCliForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
      <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch;padding-right:1px">
        <div class="prCard">
        ${prSec(1, 'Datos personales')}
        <div class="fr"><label>Nombre completo *</label><input id="prcNom" class="no-upper" value="${esc(c.nombre || '')}" placeholder="Nombre y apellido"></div>
        <div class="fr-row">${fr('Cédula', 'prcCed', '000-0000000-0', c.cedula, 'inputmode="numeric"')}<div class="fr"><label>Fecha de nacimiento</label><input id="prcNac" type="date" value="${esc(c.fecha_nacimiento || '')}"></div></div>
        <div class="fr-row"><div class="fr"><label>Estado civil</label><select id="prcCivil"><option value="">—</option>${['Soltero(a)', 'Casado(a)', 'Unión libre', 'Divorciado(a)', 'Viudo(a)'].map(o => `<option${c.estado_civil === o ? ' selected' : ''}>${o}</option>`).join('')}</select></div>${fr('Nacionalidad', 'prcNacion', 'Dominicana', c.nacionalidad || 'Dominicana')}</div>
        </div>
        <div class="prCard">
        ${prSec(2, 'Contacto y dirección')}
        <div class="fr-row">${fr('Teléfono *', 'prcTel', '809-000-0000', c.telefono, 'inputmode="tel"')}${fr('Teléfono alterno', 'prcTelAlt', 'Opcional', c.telefono_alterno, 'inputmode="tel"')}</div>
        ${fr('Correo', 'prcEmail', 'Opcional', c.email, 'type="email"')}
        ${fr('Dirección', 'prcDir', 'Calle, número', c.direccion)}
        <div class="fr-row">${fr('Sector', 'prcSector', 'Opcional', c.sector)}${fr('Ciudad / Municipio', 'prcCiudad', 'Opcional', c.ciudad)}</div>
        ${fr('Provincia', 'prcProv', 'Opcional', c.provincia)}
        </div>
        <div class="prCard">
        ${prSec(3, 'Información financiera')}
        <div class="fr-row">${fr('Ocupación', 'prcOcup', 'A qué se dedica', c.ocupacion)}${fr('Lugar de trabajo', 'prcTrabajo', 'Empresa/negocio', c.lugar_trabajo)}</div>
        <div class="fr-row"><div class="fr"><label>Tipo de ingreso</label><select id="prcTipoIng"><option value="">—</option>${['Empleado', 'Negocio propio', 'Independiente', 'Remesas', 'Pensión', 'Otro'].map(o => `<option${c.tipo_ingreso === o ? ' selected' : ''}>${o}</option>`).join('')}</select></div><div class="fr"><label>Ingreso mensual RD$</label><input id="prcIngreso" data-nx-money inputmode="numeric" value="${c.ingreso_mensual ? Math.round(c.ingreso_mensual) : ''}" placeholder="0"></div></div>
        </div>
        <div class="prCard">
        ${prSec(4, 'Referencias')}
        <div class="fr-row">${fr('Referencia 1 — nombre', 'prcR1N', 'Nombre', c.ref1_nombre)}${fr('Teléfono', 'prcR1T', '809-...', c.ref1_telefono, 'inputmode="tel"')}</div>
        ${fr('Relación (ref. 1)', 'prcR1Rel', 'Familiar, amigo...', c.ref1_relacion)}
        <div class="fr-row">${fr('Referencia 2 — nombre', 'prcR2N', 'Nombre', c.ref2_nombre)}${fr('Teléfono', 'prcR2T', '809-...', c.ref2_telefono, 'inputmode="tel"')}</div>
        ${fr('Relación (ref. 2)', 'prcR2Rel', 'Familiar, amigo...', c.ref2_relacion)}
        <div class="fr" style="margin-top:8px"><label style="display:flex;align-items:center;gap:9px;cursor:pointer"><input type="checkbox" id="prcFiador"${c.tiene_fiador ? ' checked' : ''} onchange="window.nxPrCliFiador()" style="width:17px;height:17px"> Tiene fiador / garante</label></div>
        <div id="prcFiadorBox" style="display:${c.tiene_fiador ? 'block' : 'none'}">
          <div class="fr-row">${fr('Fiador — nombre', 'prcFN', 'Nombre', c.fiador_nombre)}${fr('Cédula', 'prcFC', '000-...', c.fiador_cedula, 'inputmode="numeric"')}</div>
          <div class="fr-row">${fr('Teléfono', 'prcFT', '809-...', c.fiador_telefono, 'inputmode="tel"')}${fr('Dirección', 'prcFD', 'Opcional', c.fiador_direccion)}</div>
        </div>
        </div>
        <div class="prCard">
        ${prSec(5, 'Notas')}
        <div class="fr"><textarea id="prcNotas" rows="2" class="no-upper" placeholder="Observaciones">${esc(c.notas || '')}</textarea></div>
        </div>
      </div>
      <div style="padding-top:10px;display:flex;gap:8px">${cli ? `<button class="btn" type="button" style="flex:none;border-color:#fecaca;color:#dc2626" onclick="window.nxPrClienteBorrar('${cli.id}')" aria-label="Eliminar cliente"><i class="ti ti-minus"></i></button>` : ''}<button class="btn bghost" type="button" style="flex:0 0 auto" onclick="document.getElementById('nxPrCliForm').remove()">Cancelar</button><button class="btn bc1" type="button" style="flex:0 0 auto;margin-left:auto;min-width:120px" onclick="window.nxPrClienteGuardar('${cli ? cli.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button></div>
    </div>`;
    document.body.appendChild(ov);
    try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(ov); } catch (e) {}
  }
  window.nxPrCliFiador = function () { const b = document.getElementById('prcFiadorBox'); const c = document.getElementById('prcFiador'); if (b) b.style.display = (c && c.checked) ? 'block' : 'none'; };
  let _prCliOnSaved = null;
  window.nxPrClienteGuardar = async function (id) {
    const nom = (val('prcNom') || '').trim();
    if (!nom) { toast('err', 'Falta el nombre'); return; }
    const tel = (val('prcTel') || '').trim();
    // Duplicado (solo al crear): mismo teléfono o cédula normalizados
    if (!id) {
      const telN = tel.replace(/\D/g, ''), cedN = (val('prcCed') || '').replace(/\D/g, '');
      const dup = (telN || cedN) ? _prClientes.find(x => { const t = (x.telefono || '').replace(/\D/g, ''), ce = (x.cedula || '').replace(/\D/g, ''); return (telN && t === telN) || (cedN && ce === cedN); }) : null;
      if (dup) { const ok = confirm('Ya existe "' + (dup.nombre || '') + '" con el mismo ' + ((cedN && (dup.cedula || '').replace(/\D/g, '') === cedN) ? 'cédula' : 'teléfono') + '.\n\nAceptar = crear otro.\nCancelar = editar el existente.'); if (!ok) { abrirClienteForm(dup, _prCliOnSaved); return; } }
    }
    const body = {
      nombre: nom, cedula: (val('prcCed') || '').trim() || null, fecha_nacimiento: val('prcNac') || null,
      estado_civil: val('prcCivil') || null, nacionalidad: (val('prcNacion') || '').trim() || null,
      telefono: tel || null, telefono_alterno: (val('prcTelAlt') || '').trim() || null, email: (val('prcEmail') || '').trim() || null,
      direccion: (val('prcDir') || '').trim() || null, sector: (val('prcSector') || '').trim() || null, ciudad: (val('prcCiudad') || '').trim() || null, provincia: (val('prcProv') || '').trim() || null,
      ocupacion: (val('prcOcup') || '').trim() || null, lugar_trabajo: (val('prcTrabajo') || '').trim() || null, tipo_ingreso: val('prcTipoIng') || null, ingreso_mensual: parseMoney(val('prcIngreso')),
      ref1_nombre: (val('prcR1N') || '').trim() || null, ref1_telefono: (val('prcR1T') || '').trim() || null, ref1_relacion: (val('prcR1Rel') || '').trim() || null,
      ref2_nombre: (val('prcR2N') || '').trim() || null, ref2_telefono: (val('prcR2T') || '').trim() || null, ref2_relacion: (val('prcR2Rel') || '').trim() || null,
      tiene_fiador: !!(document.getElementById('prcFiador') || {}).checked,
      fiador_nombre: (val('prcFN') || '').trim() || null, fiador_cedula: (val('prcFC') || '').trim() || null, fiador_telefono: (val('prcFT') || '').trim() || null, fiador_direccion: (val('prcFD') || '').trim() || null,
      notas: (val('prcNotas') || '').trim() || null, updated_at: new Date().toISOString()
    };
    try {
      let cliId = id, saved = null;
      if (id) { await getAPI().patch('prestamo_clientes', 'id=eq.' + id, body); saved = Object.assign({ id: id }, body); }
      else { body.created_by_name = nomAdmin(); const r = await getAPI().post('prestamo_clientes', body); cliId = r && r[0] && r[0].id; saved = (r && r[0]) || Object.assign({ id: cliId }, body); }
      toast('ok', id ? 'Cliente actualizado' : 'Cliente creado', nom);
      cerrarModal('nxPrCliForm');
      await cargarPrestamos();
      const cb = _prCliOnSaved; _prCliOnSaved = null;
      if (cb) { cb(saved); return; }
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  window.nxPrestamoFiltrar = function (q) {
    _prQuery = String(q || ''); _prPage = 1; repintarPrLista();
  };
  // NPGS §5: lupa colapsada que abre la ventana compartida (Buscar/Recientes/Favoritos).
  // Sin cont: — la tabla vive envuelta en .nxFP-tblWrap (el contador contaría 1 wrapper,
  // no las filas) y además pagina de a 12, así que un conteo de página engañaría.
  function pintarLupaPr() {
    const box = document.getElementById('nxPrBuscarLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_nxPrBuscar')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'nxPrBuscar',
      placeholder: 'Nombre o cédula…', value: _prQuery,
      onterm: function (v) { window.nxPrestamoFiltrar(v); }
    });
  }
  function pintarLupaPrCli() {
    const box = document.getElementById('nxPrCliBuscarLupa');
    if (!box || typeof nxBuscaInlineHTML !== 'function') return;
    if (document.getElementById('nbiIn_nxPrCliBuscar')) return; // no reconstruir a mitad de escritura
    box.innerHTML = nxBuscaInlineHTML({
      id: 'nxPrCliBuscar',
      placeholder: 'Nombre, cédula o teléfono…', value: _prCliQuery,
      onterm: function (v) { window.nxPrClienteFiltrar(v); }
    });
  }
  window.nxFPToggleSide = function () { const s = document.getElementById('nxFPShell'); if (s) s.classList.toggle('side-open'); };
  // Dock de 5 iconos de Financiamiento (Opción B, 19-ago-2026 → pedido por el
  // dueño al ver la Opción A en vivo, "quiero el dock de 5 iconos"): reemplaza
  // el cajón lateral off-canvas del celular por una barra fija de 5 accesos —
  // los 4 destinos más usados (Dashboard/Cobranza/Cuotas/Clientes) a 1 toque
  // + "Más" abre una hoja agrupada con el resto (mismo mecanismo visual de
  // vidrio que ya usaba la Opción A, y que el FAB global de Seguros usa para
  // su .mobile-more-sheet-clean) pero autocontenido aquí — no toca el FAB
  // global (es de toda la app, sin noción de los ítems de este módulo). La
  // hoja de "Más" se cierra sola en la mayoría de sus ítems porque cada uno
  // ya dispara renderLista() → renderFPDock() (rehace el host entero, sin la
  // clase dock-open); los 3 que NO re-renderizan (Nuevo préstamo/
  // Configuración/Volver) la cierran a mano en su propio onclick, ver abajo.
  //
  // BUG REAL reportado por el dueño ("no se queda fija en la parte inferior",
  // 20-ago-2026): el dock vivía DENTRO de #nxFPShell, que a su vez cuelga de
  // .content{overflow-y:auto} — un position:fixed anidado en un contenedor
  // CON SCROLL PROPIO (no <body>) es un quirk conocido de iOS Safari donde el
  // elemento fijo se desplaza CON el contenedor en vez de quedar anclado al
  // viewport real. Mismo problema de fondo (aunque otra trampa puntual —
  // container-type) que ya se resolvió una vez en este archivo para el POS
  // (ver nxStickyBarSet, `.nxFacBar` — cuelga de document.body a propósito,
  // fuera de cualquier contenedor con scroll). Se replica la misma técnica
  // aquí: el dock/backdrop/hoja YA NO se arman dentro de view.innerHTML —
  // renderFPDock() los cuelga de un host propio, HIJO DIRECTO DE <body>,
  // fuera del árbol con scroll. Que solo se vea con Financiamiento activo lo
  // garantiza el CSS con :has() (ver nxFPEnsureCSS,
  // `body:not(:has(#v-prestamos.on)) #nxFPDockHost{display:none}`) — no hace
  // falta cazar en JS cada camino posible de "salir de Financiamiento" para
  // desmontar el host a mano.
  function renderFPDock() {
    let host = document.getElementById('nxFPDockHost');
    if (!host) {
      host = document.createElement('div'); host.id = 'nxFPDockHost'; document.body.appendChild(host);
    }
    const nSol = _prSolicitudes.filter(s => s.estado === 'enviada').length;
    const dockBtn = (key, lbl, ico) => { const on = _prView === 'prestamos' && _prFiltro === key; return `<button type="button" role="tab" aria-selected="${on}" class="nxFP-dockBtn${on ? ' on' : ''}" onclick="window.nxPrestamoFiltroTipo('${key}')"><i class="ti ${ico}"></i><span>${lbl}</span></button>`; };
    const dockView = (v, lbl, ico) => { const on = _prView === v; return `<button type="button" role="tab" aria-selected="${on}" class="nxFP-dockBtn${on ? ' on' : ''}" onclick="window.nxPrView('${v}')"><i class="ti ${ico}"></i><span>${lbl}</span></button>`; };
    const masOn = _prView === 'evaluacion' || _prView === 'solicitudes' || _prView === 'reportes' || (_prView === 'prestamos' && ['activos', 'pagados', 'credito'].includes(_prFiltro));
    const moreItem = (key, lbl, ico) => `<button type="button" class="nxFP-popItem${_prView === 'prestamos' && _prFiltro === key ? ' on' : ''}" onclick="window.nxPrestamoFiltroTipo('${key}')"><i class="ti ${ico}"></i> ${lbl}</button>`;
    const moreView = (v, lbl, ico, badge) => `<button type="button" class="nxFP-popItem${_prView === v ? ' on' : ''}" onclick="window.nxPrView('${v}')"><i class="ti ${ico}"></i> ${lbl}${badge ? ` (${badge})` : ''}</button>`;
    host.innerHTML = `<div class="nxFP-dockBackdrop" onclick="window.nxFPToggleMore()"></div>
      <div class="nxFP-dockSheet">
        <div class="nxFP-popHead"><div class="nxFP-sideLogo"><i class="ti ti-cash"></i></div><div><b>Financiamiento</b><span>NEXUS PRO</span></div></div>
        <button type="button" class="nxFP-popNew" onclick="document.getElementById('nxFPDockHost').classList.remove('dock-open');window.nxPrestamoNuevo()"><i class="ti ti-plus"></i> Nuevo préstamo</button>
        <div class="nxFP-popGrp">Cartera</div>
        ${moreItem('activos', 'Activos', 'ti-circle-check')}
        ${moreItem('pagados', 'Pagados', 'ti-checks')}
        ${moreItem('credito', 'Líneas de crédito', 'ti-credit-card')}
        <div class="nxFP-popGrp">Personas</div>
        ${moreView('evaluacion', 'Evaluación', 'ti-clipboard-check')}
        ${moreView('solicitudes', 'Solicitudes', 'ti-file-check', nSol)}
        <div class="nxFP-popGrp">Sistema</div>
        ${moreView('reportes', 'Reportes', 'ti-report-money')}
        <button type="button" class="nxFP-popItem" onclick="document.getElementById('nxFPDockHost').classList.remove('dock-open');window.nxPrestamoConfig()"><i class="ti ti-settings"></i> Configuración</button>
        <div class="nxFP-popDiv"></div>
        <button type="button" class="nxFP-popBack" onclick="document.getElementById('nxFPDockHost').classList.remove('dock-open');window.nxAbrirMultiempresa()"><i class="ti ti-arrow-left"></i> Volver a Multiempresa</button>
      </div>
      <nav class="nxFP-dock" role="tablist" aria-label="Navegación de Financiamiento">
        ${dockBtn('todos', 'Dashboard', 'ti-layout-dashboard')}
        ${dockBtn('vencidos', 'Cobranza', 'ti-user-dollar')}
        ${dockBtn('cuotas', 'Cuotas', 'ti-calendar-dollar')}
        ${dockView('clientes', 'Clientes', 'ti-users-group')}
        <button type="button" role="tab" aria-selected="${masOn}" class="nxFP-dockBtn nxFP-dockMore${masOn ? ' on' : ''}" onclick="window.nxFPToggleMore()" aria-label="Más opciones de Financiamiento"><i class="ti ti-dots"></i><span>Más</span>${nSol ? `<b class="nxFP-dockBadge">${nSol}</b>` : ''}</button>
      </nav>`;
    host.classList.remove('dock-open');
  }
  window.nxFPToggleMore = function () { const s = document.getElementById('nxFPDockHost'); if (s) s.classList.toggle('dock-open'); };

  // ── Selección del dock — AURA, no cápsula (pedido del dueño, tras verla y
  // aprobarla primero en la lista de préstamos): "ese mismo aura... en los
  // íconos de la barra inferior... alrededor de los cuadros blancos, no
  // encima". Reemplaza de raíz la cápsula de neón física con resortes
  // amortiguados (v56.66-67, ~150 líneas de JS + un SVG que se
  // medía/reconstruía en cada clic) por lo mismo que ya se ve en
  // `.nxFP-tbl tbody tr:active` — un halo (box-shadow) alrededor del propio
  // botón cuando está activo, 100% CSS, sin loop de animación, sin
  // ResizeObserver, sin física. El botón activo lleva su PROPIO fondo
  // blanco (`.nxFP-dockBtn.on`, el "cuadro blanco" pedido) y el aura se
  // pinta AFUERA del borde vía box-shadow — nunca tapa el ícono/texto de
  // adentro ("no encima"). Ver `.nxFP-dockBtn.on` en nxFPEnsureCSS.


  function ensureView() {
    let v = document.getElementById('v-prestamos');
    if (v) return v;
    const dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-prestamos';
    dash.parentElement.appendChild(v);
    return v;
  }

  // ── Hub MULTIEMPRESA: contenedor de módulos (Financiamiento, y futuros) ──
  function ensureHubView() {
    let v = document.getElementById('v-multiempresa');
    if (v) return v;
    const dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-multiempresa';
    dash.parentElement.appendChild(v);
    return v;
  }

  // Registro compartido de módulos de Multiempresa (cada módulo se inscribe aquí)
  window.nxMEReg = window.nxMEReg || [];
  window.nxMERegistrar = function (m) {
    if (!m || !m.nombre) return;
    if (!window.nxMEReg.some(x => x.nombre === m.nombre)) window.nxMEReg.push(m);
    window.nxMEReg.sort((a, b) => (a.orden || 99) - (b.orden || 99));
  };
  window.nxMERegistrar({ orden: 1, nombre: 'Financiamiento', desc: 'Préstamos, cuotas y líneas de crédito', icon: 'ti-cash', color: '#059669', bg: '#ecfdf5', onclick: 'window.nxAbrirPrestamos()' });

  function renderHub(view) {
    const mods = (window.nxMEReg && window.nxMEReg.length) ? window.nxMEReg : [
      { nombre: 'Financiamiento', desc: 'Préstamos, cuotas y líneas de crédito', icon: 'ti-cash', color: '#059669', bg: '#ecfdf5', onclick: 'window.nxAbrirPrestamos()' }
    ];
    const cards = mods.map(m => `
      <button type="button" class="nxMeCard" onclick="${m.onclick}">
        <span class="nxMeIco" style="background:${m.bg};color:${m.color}"><i class="ti ${m.icon}"></i></span>
        <span class="nxMeTxt"><span class="nxMeNom">${esc(m.nombre)}</span><span class="nxMeDesc">${esc(m.desc)}</span></span>
        <i class="ti ti-chevron-right nxMeArr"></i>
      </button>`).join('');
    view.innerHTML = `
      <div class="nc">
        <div class="ch">
          <div><div class="ct"><i class="ti ti-building-skyscraper"></i> Multiempresa</div><div class="ct-s">Solo visible para el administrador</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn bsm" type="button" onclick="window.nav&&window.nav('dashboard',null)"><i class="ti ti-arrow-left"></i> Volver</button>
          </div>
        </div>
        <div style="font-size:12px;color:#475569;margin-bottom:12px">Elige una empresa o módulo.</div>
        <div class="nxMeGrid">${cards}</div>
      </div>`;
  }

  window.nxAbrirMultiempresa = function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    // Modo TIENDA: el hub Multiempresa no aplica; rebota al Punto de Venta.
    try { if (window.sesion && window.sesion.org && window.sesion.org.tipo === 'tienda') { if (window.nxAbrirPOS) window.nxAbrirPOS(); return; } } catch (e) {}
    // Modo RIFA: el hub no aplica; rebota al módulo de Rifas.
    try { if (window.sesion && window.sesion.org && window.sesion.org.tipo === 'rifa') { if (window.nxAbrirRifas) window.nxAbrirRifas(); return; } } catch (e) {}
    const view = ensureHubView();
    if (!view) return;
    try { window.nxGuardarLugar && window.nxGuardarLugar('multiempresa'); } catch (e) {}
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const pt = document.getElementById('pttl'); if (pt) pt.textContent = 'MULTIEMPRESA';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    renderHub(view);
  };

  window.nxAbrirPrestamos = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    const view = ensureView();
    if (!view) return;
    try { window.nxGuardarLugar && window.nxGuardarLugar('financiamiento'); } catch (e) {}
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const pt = document.getElementById('pttl'); if (pt) pt.textContent = 'FINANCIAMIENTO';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:8px;font-weight:600">Cargando financiamiento...</div></div></div>';
    try { await cargarPrestamos(); renderLista(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudieron cargar los préstamos.<br><span style="font-size:11px;color:#475569">' + esc(String(e && e.message || e)) + '</span></div></div>'; }
  };

  // ── Formulario nuevo/editar ──
  window.nxPrestamoNuevo = function () { abrirForm(null); };
  window.nxPrestamoEditar = function (id) { const p = _prestamos.find(x => String(x.id) === String(id)); if (p) abrirForm(p); };
  window.nxPrModo = function (m) { _modoForm = m; pintarModo(); };
  window.nxPrCuotaMode = function (mode) {
    _prCuotaMode = (mode === 'monto') ? 'monto' : 'num';
    const sn = document.getElementById('prSegNum'), sm = document.getElementById('prSegMonto');
    if (sn) sn.className = _prCuotaMode === 'num' ? 'on' : '';
    if (sm) sm.className = _prCuotaMode === 'monto' ? 'on' : '';
    const fn = document.getElementById('prNumCuotasField'), fm = document.getElementById('prCuotaMontoField');
    if (fn) fn.style.display = _prCuotaMode === 'num' ? '' : 'none';
    if (fm) fm.style.display = _prCuotaMode === 'monto' ? '' : 'none';
    const hint = document.getElementById('prCuotaHint'); if (hint && _prCuotaMode === 'num') hint.style.display = 'none';
    window.nxPrRecalc();
  };
  // Cuántas cuotas hacen falta para una cuota-objetivo dada (según método/frecuencia). null = imposible/muy baja.
  function cuotasParaMonto(capital, tasaPct, frec, metodo, cuotaObj) {
    capital = Math.round(Number(capital || 0)); cuotaObj = Math.round(Number(cuotaObj || 0));
    if (capital <= 0 || cuotaObj <= 0) return null;
    const i = tasaPorCuota(tasaPct, frec) / 100;
    if (i <= 0) return Math.min(360, Math.max(1, Math.ceil(capital / cuotaObj)));
    const intPorCuota = capital * i;
    if (cuotaObj <= intPorCuota) return null; // no cubre ni el interés → nunca termina
    let n;
    if (metodo === 'plano') n = Math.ceil(capital / (cuotaObj - intPorCuota));
    else n = Math.ceil(-Math.log(1 - intPorCuota / cuotaObj) / Math.log(1 + i)); // saldo insoluto (francés)
    if (!isFinite(n) || n < 1) return null;
    if (n > 360) return null; // cuota tan baja que tardaría una eternidad
    return n;
  }
  // En modo 'monto': lee la cuota que quiere pagar el cliente y escribe el # de cuotas calculado en prNumCuotas.
  function sincronizarCuotasPorMonto() {
    if (_prCuotaMode !== 'monto' || _modoForm !== 'cuotas') return;
    const hint = document.getElementById('prCuotaHint'), nEl = document.getElementById('prNumCuotas');
    const cap = parseMoney(val('prCap')), tasa = parsePct(val('prTasa')), frec = val('prFrec') || 'mensual', metodo = val('prMetodo') || 'plano';
    const cuotaObj = parseMoney(val('prCuotaObjetivo'));
    if (!cuotaObj || !cap) { if (nEl) nEl.value = ''; if (hint) hint.style.display = 'none'; return; }
    const n = cuotasParaMonto(cap, tasa, frec, metodo, cuotaObj);
    if (!n) {
      if (nEl) nEl.value = '';
      if (hint) { hint.style.display = 'block'; hint.style.color = '#dc2626'; hint.textContent = 'Esa cuota es muy baja para este préstamo (no alcanza a cubrir el interés o tardaría demasiado).'; }
      return;
    }
    if (nEl) nEl.value = n;
    if (hint) { hint.style.display = 'block'; hint.style.color = '#6d28d9'; const fr = frec === 'semanal' ? 'semanales' : frec === 'quincenal' ? 'quincenales' : 'mensuales'; hint.textContent = 'Serán ' + n + ' cuota' + (n === 1 ? '' : 's') + ' ' + fr + ' (la última puede variar un poco).'; }
  }

  function pintarModo() {
    const bl = document.getElementById('prModoLibre'), bc = document.getElementById('prModoCuotas'), bcr = document.getElementById('prModoCredito');
    if (bl) bl.className = _modoForm === 'libre' ? 'btn bc1' : 'btn';
    if (bc) bc.className = _modoForm === 'cuotas' ? 'btn bc1' : 'btn';
    if (bcr) bcr.className = _modoForm === 'credito' ? 'btn bc1' : 'btn';
    const box = document.getElementById('prCuotasBox'), cbox = document.getElementById('prCreditoBox');
    if (box) box.style.display = _modoForm === 'cuotas' ? 'block' : 'none';
    if (cbox) cbox.style.display = _modoForm === 'credito' ? 'block' : 'none';
    const hint = document.getElementById('prTasaHint');
    if (hint) hint.textContent = _modoForm === 'cuotas' ? '· mensual' : _modoForm === 'credito' ? '· mensual sobre el saldo' : '· una vez, sobre el capital';
    window.nxPrRecalc();
  }

  // Calcula el total a devolver según el modo y la tasa.
  // cuotas + tasa>0 -> amortización (tasa mensual). libre + tasa>0 -> interés fijo (capital × tasa%).
  function calcPrestamo() {
    const cap = parseMoney(val('prCap')), n = parseInt(val('prNumCuotas'), 10) || 0, tasa = parsePct(val('prTasa')), frec = val('prFrec') || 'mensual';
    const metodo = val('prMetodo') || 'plano';
    // En modo "monto de la cuota": la cuota queda EXACTA en lo que escribió el dueño y la última se ajusta.
    const cuotaFija = (_prCuotaMode === 'monto' && _modoForm === 'cuotas') ? parseMoney(val('prCuotaObjetivo')) : 0;
    if (_modoForm === 'cuotas' && tasa > 0 && cap > 0 && n > 0) {
      const a = amortizar(cap, tasa, n, val('prFecha') || hoy(), frec, metodo, cuotaFija);
      return { computa: true, modo: 'cuotas', cap, tasa, n, frec, metodo, cuotaFija, total: Math.round(a.total), interes: a.interesTotal, cuota: a.cuota };
    }
    if (_modoForm === 'libre' && tasa > 0 && cap > 0) {
      const total = Math.round(cap * (1 + tasa / 100));
      return { computa: true, modo: 'libre', cap, tasa, total, interes: total - cap };
    }
    return { computa: false, modo: _modoForm, cap, tasa, n, frec };
  }
  // Tabla de cuotas/meses en vivo dentro del formulario (mismas amortizar()/creditoCalc() que
  // ya usa nxPrestamoVer) — se corta a 3 filas, el calendario completo se ve al guardar.
  function prMostrarSchedule(rows, cols) {
    const wrap = document.getElementById('prScheduleWrap'), box = document.getElementById('prSchedule');
    if (!wrap || !box) return;
    if (!rows || !rows.length) { wrap.style.display = 'none'; return; }
    const th = cols.map(c => `<th style="padding:6px;text-align:${c.al || 'left'}">${c.h}</th>`).join('');
    const td = rows.slice(0, 3).map(r => `<tr>${cols.map(c => `<td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:${c.al || 'left'}${c.strong ? ';font-weight:700' : ''}${c.color ? ';color:' + c.color : ''}">${c.get(r)}</td>`).join('')}</tr>`).join('');
    const mas = rows.length > 3 ? `<div style="text-align:center;font-size:10.5px;color:#7c3aed;font-weight:700;padding:6px">+ ${rows.length - 3} más — el calendario completo se ve al guardar</div>` : '';
    box.innerHTML = `<div style="overflow-x:auto;border:1px solid #e2e8f0;border-radius:10px"><table style="width:100%;border-collapse:collapse;font-size:10.5px;background:#fff"><thead><tr style="background:#f8fafc;color:#475569;font-size:9.5px">${th}</tr></thead><tbody>${td}</tbody></table></div>${mas}`;
    wrap.style.display = 'block';
  }
  window.nxPrRecalc = function () {
    const preview = document.getElementById('prPreview');
    const resumenWrap = document.getElementById('prResumenWrap');
    const scheduleWrap = document.getElementById('prScheduleWrap');
    const totRow = document.getElementById('prTotRow');
    const cap = parseMoney(val('prCap')), fecha = val('prFecha') || hoy();
    if (_modoForm === 'credito') {
      if (totRow) totRow.style.display = 'none';
      const tasa = parsePct(val('prTasa')), plazo = parseInt(val('prPlazo'), 10) || 0;
      if (cap > 0 && tasa > 0) {
        const intMes = Math.round(cap * tasa / 100);
        const lim = plazo > 0 ? addMonths(fecha, plazo).toISOString().slice(0, 10) : '—';
        if (resumenWrap) resumenWrap.style.display = 'block';
        if (preview) preview.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${kpi('Interés del 1er mes', fmt(intMes), '#ea580c')}${kpi('Fecha límite del capital', lim, '#0f172a')}</div><div style="font-size:10.5px;color:#475569;margin-top:8px">Cada mes el interés se calcula sobre lo que falte de capital. Abonar al capital baja el interés futuro.</div>`;
        const cc = creditoCalc({ id: '__preview__', capital: cap, tasa_interes: tasa, fecha_prestamo: fecha, plazo_meses: plazo, modo: 'credito' });
        prMostrarSchedule(cc.meses, [
          { h: 'Mes', get: m => '#' + m.n },
          { h: 'Desde', get: m => m.fecha },
          { h: 'Capital base', al: 'right', get: m => fmt(m.saldo) },
          { h: 'Interés', al: 'right', color: '#ea580c', strong: true, get: m => fmt(m.interes) }
        ]);
      } else { if (resumenWrap) resumenWrap.style.display = 'none'; if (scheduleWrap) scheduleWrap.style.display = 'none'; }
      return;
    }
    sincronizarCuotasPorMonto();
    const c = calcPrestamo();
    if (totRow) totRow.style.display = c.computa ? 'none' : '';
    if (c.computa && c.modo === 'cuotas') {
      const ic = tasaPorCuota(c.tasa, c.frec);
      const notaFrec = c.frec !== 'mensual' ? `${c.tasa}% mensual = ${(Math.round(ic * 100) / 100)}% por ${c.frec === 'semanal' ? 'semana' : 'quincena'}` : '';
      const notaMet = c.metodo === 'plano' ? 'Método: interés plano — interés fijo sobre el monto' : 'Método: saldo insoluto — el interés baja cada cuota';
      const nota = [notaFrec, notaMet].filter(Boolean).join(' · ');
      if (resumenWrap) resumenWrap.style.display = 'block';
      if (preview) preview.innerHTML = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${kpi('Cuota por pago', fmt(c.cuota), '#0f172a')}${kpi('Total a devolver', fmt(c.total), '#16a34a')}${kpi('Total interés', fmt(c.interes), '#ea580c')}</div>${nota ? `<div style="font-size:10.5px;color:#475569;margin-top:8px">${nota}</div>` : ''}`;
      const a = amortizar(c.cap, c.tasa, c.n, fecha, c.frec, c.metodo, c.cuotaFija);
      prMostrarSchedule(a.rows, [
        { h: '#', get: r => '#' + r.n },
        { h: 'Fecha', get: r => r.fecha },
        { h: 'Cuota', al: 'right', strong: true, get: r => fmt(r.cuota) },
        { h: 'Capital', al: 'right', color: '#6d28d9', get: r => fmt(r.capital) },
        { h: 'Saldo', al: 'right', get: r => fmt(r.saldo) }
      ]);
    } else if (c.computa && c.modo === 'libre') {
      if (resumenWrap) resumenWrap.style.display = 'block';
      if (preview) preview.innerHTML = `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">${kpi('Total a devolver', fmt(c.total), '#16a34a')}${kpi('Total interés', fmt(c.interes), '#ea580c')}</div><div style="font-size:10.5px;color:#475569;margin-top:8px">${c.tasa}% una vez · se paga en abonos libres, sin cronograma fijo</div>`;
      if (scheduleWrap) scheduleWrap.style.display = 'none';
    } else {
      if (resumenWrap) resumenWrap.style.display = 'none';
      if (scheduleWrap) scheduleWrap.style.display = 'none';
    }
  };

  // Insignia numerada de sección (mismo lenguaje visual morado del resto de Financiamiento).
  function prSec(n, title) {
    return `<div style="display:flex;align-items:center;gap:8px;margin:${n === 1 ? '0' : '18px'} 0 10px">
      <span style="width:20px;height:20px;border-radius:6px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">${n}</span>
      <span style="font-size:11px;font-weight:800;color:#334155;letter-spacing:.3px;text-transform:uppercase">${esc(title)}</span>
    </div>`;
  }
  function abrirForm(pr) {
    cerrarModal('nxPrModal');
    _modoForm = (pr && pr.modo) || 'libre';
    _prCuotaMode = 'num'; // siempre arranca por # de cuotas; el usuario cambia a "monto de cuota" si quiere
    const p = pr || {};
    const ov = document.createElement('div'); ov.id = 'nxPrModal'; ov.className = 'overlay open nxPrOvFull';
    ov.innerHTML = `
      <div class="modal nxPrForm nxPrFormFull">
        <div class="nxPrFormTop"><span><i class="ti ti-cash"></i> ${pr ? 'Editar préstamo' : 'Nuevo préstamo'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrModal').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="nxPrFormScroll">
         <div class="nxPrFormInner">
          ${prSec(1, 'Datos del prestatario')}
          <input type="hidden" id="prCliId" value="${esc(p.cliente_id || '')}">
          <div style="display:flex;gap:6px;margin-bottom:8px">
            <button type="button" class="btn bsm" style="flex:1" onclick="window.nxPrElegirCliente()"><i class="ti ti-users-group"></i> Elegir cliente</button>
            <button type="button" class="btn bsm" style="flex:1" onclick="window.nxPrClienteNuevoDesdeForm()"><i class="ti ti-user-plus"></i> Nuevo cliente</button>
          </div>
          <div class="fr"><label>Nombre del prestatario</label><input id="prNom" class="no-upper" value="${esc(p.nombre || '')}" placeholder="Nombre completo"></div>
          <div class="fr-row">
            <div class="fr"><label>Cédula</label><input id="prCed" class="no-upper" value="${esc(p.cedula || '')}" placeholder="000-0000000-0"></div>
            <div class="fr"><label>Teléfono</label><input id="prTel" class="no-upper" value="${esc(p.telefono || '')}" placeholder="809-000-0000"></div>
          </div>
          ${prSec(2, 'Información del préstamo')}
          <div class="fr-row">
            <div class="fr"><label>Capital prestado</label><input id="prCap" data-nx-money inputmode="numeric" oninput="window.nxPrRecalc()" value="${p.capital ? Number(p.capital).toLocaleString('en-US') : ''}" placeholder="0"></div>
            <div class="fr"><label>Fecha del préstamo</label><input id="prFecha" type="date" onchange="window.nxPrRecalc()" value="${p.fecha_prestamo || hoy()}"></div>
          </div>
          ${prSec(3, 'Tipo de préstamo')}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
            <button type="button" id="prModoLibre" class="btn" onclick="window.nxPrModo('libre')" style="flex:1 1 88px;flex-direction:column;gap:4px;padding:10px 6px;min-height:52px"><i class="ti ti-wallet" style="font-size:16px"></i><span style="font-size:10.5px">Abonos libres</span></button>
            <button type="button" id="prModoCuotas" class="btn" onclick="window.nxPrModo('cuotas')" style="flex:1 1 88px;flex-direction:column;gap:4px;padding:10px 6px;min-height:52px"><i class="ti ti-calendar-dollar" style="font-size:16px"></i><span style="font-size:10.5px">Cuotas fijas</span></button>
            <button type="button" id="prModoCredito" class="btn" onclick="window.nxPrModo('credito')" style="flex:1 1 88px;flex-direction:column;gap:4px;padding:10px 6px;min-height:52px"><i class="ti ti-credit-card" style="font-size:16px"></i><span style="font-size:10.5px">Línea de crédito</span></button>
          </div>
          <div class="fr"><label>Tasa de interés (%) <span id="prTasaHint" style="font-weight:400;color:#475569;font-size:10px"></span></label><input id="prTasa" inputmode="decimal" oninput="window.nxPrRecalc()" value="${Number(p.tasa_interes || 0) > 0 ? p.tasa_interes : ''}" placeholder="0 = sin interés (ej: 10)"></div>
          <div id="prCuotasBox" style="display:none">
            <div class="fr"><label>Calcular por</label>
              <div class="prSeg" id="prCuotaSeg">
                <button type="button" id="prSegNum" class="on" onclick="window.nxPrCuotaMode('num')">Número de cuotas</button>
                <button type="button" id="prSegMonto" onclick="window.nxPrCuotaMode('monto')">Monto de la cuota</button>
              </div>
            </div>
            <div class="fr-row">
              <div class="fr" id="prNumCuotasField"><label># de cuotas</label><input id="prNumCuotas" type="number" min="1" oninput="window.nxPrRecalc()" value="${p.num_cuotas || ''}" placeholder="4"></div>
              <div class="fr" id="prCuotaMontoField" style="display:none"><label>Cuota que pagará</label><input id="prCuotaObjetivo" data-nx-money inputmode="numeric" oninput="window.nxPrRecalc()" placeholder="0"></div>
              <div class="fr"><label>Frecuencia</label><select id="prFrec" onchange="window.nxPrRecalc()"><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option></select></div>
            </div>
            <div id="prCuotaHint" style="display:none;font-size:11px;color:#6d28d9;font-weight:700;margin:-4px 0 10px"></div>
            <div class="fr"><label>Método de interés</label><select id="prMetodo" onchange="window.nxPrRecalc()"><option value="plano">Interés plano</option><option value="saldo">Saldo insoluto — el interés baja cada cuota</option></select></div>
          </div>
          <div id="prCreditoBox" style="display:none">
            <div class="fr"><label>Plazo (meses) <span style="font-weight:400;color:#475569;font-size:10px">· fecha límite para devolver el capital</span></label><input id="prPlazo" type="number" min="1" oninput="window.nxPrRecalc()" value="${p.plazo_meses || ''}" placeholder="6"></div>
          </div>
          <div class="fr" id="prTotRow"><label>Total a devolver</label><input id="prTot" data-nx-money inputmode="numeric" oninput="window.nxPrRecalc()" value="${p.total_devolver ? Number(p.total_devolver).toLocaleString('en-US') : ''}" placeholder="0"></div>
          <div id="prResumenWrap" style="display:none">
            ${prSec(4, 'Resumen del préstamo')}
            <div id="prPreview"></div>
          </div>
          <div id="prScheduleWrap" style="display:none;margin-top:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap"><span style="font-size:10.5px;font-weight:800;color:#94a3b8;letter-spacing:.3px;text-transform:uppercase;min-width:0">Vista previa de cuotas</span><div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="btn bsm bghost" type="button" onclick="window.nxPrPropuesta()" title="Compartir esta propuesta con el cliente" aria-label="Compartir propuesta con el cliente"><i class="ti ti-share" style="color:#6d28d9"></i> Compartir</button><button class="btn bsm bc1" type="button" onclick="window.nxPrGenerarLinkFirma()" title="Generar un link para que el cliente suba su cédula y firme" aria-label="Generar link de firma"><i class="ti ti-signature"></i> Link de firma</button></div></div>
            <div id="prSchedule"></div>
          </div>
          ${prSec(5, 'Notas (opcional)')}
          <div class="fr"><textarea id="prNotas" rows="2" class="no-upper" maxlength="500" oninput="document.getElementById('prNotasCnt').textContent=this.value.length">${esc(p.notas || '')}</textarea>
            <div style="text-align:right;font-size:10px;color:#94a3b8;margin-top:2px"><span id="prNotasCnt">${esc(p.notas || '').length}</span> / 500</div>
          </div>
          <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px 12px;font-size:11px;color:#5b21b6;line-height:1.6;margin-top:4px">
            <div style="font-weight:800;margin-bottom:3px">ℹ️ Cómo funciona</div>
            <div>• La tasa de interés es <b>mensual</b>.</div>
            <div>• La cuota incluye capital + interés cuando hay tasa.</div>
            <div>• <b>Interés plano:</b> el interés se cobra sobre el monto completo en cada cuota. <b>Saldo insoluto:</b> solo sobre lo que falta (baja cada cuota).</div>
            <div>• En "Abonos libres" no hay cronograma fijo — se abona cuando el prestatario pueda.</div>
            <div>• Este préstamo no calcula mora automática; el vencimiento es solo referencia.</div>
          </div>
         </div>
        </div>
        <div class="nxPrFormFoot"><div class="nxPrFormInner" style="display:flex;gap:8px"><button class="btn bghost" type="button" style="flex:0 0 auto" onclick="document.getElementById('nxPrModal').remove()">Cancelar</button><button class="btn bc1" type="button" style="flex:0 0 auto;margin-left:auto;min-width:120px" onclick="window.nxPrestamoGuardar('${pr ? pr.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button></div></div>
      </div>`;
    document.body.appendChild(ov);
    pintarModo();
    let _reCalc = false;
    if (p.frecuencia) { const s = document.getElementById('prFrec'); if (s) { s.value = p.frecuencia; _reCalc = true; } }
    if (p.metodo_interes) { const sm = document.getElementById('prMetodo'); if (sm) { sm.value = p.metodo_interes; _reCalc = true; } }
    // Recalcular DESPUÉS de restaurar frecuencia/método: pintarModo() ya corrió nxPrRecalc con los
    // valores por defecto (semanal/plano), así que sin esto el resumen quedaba con la matemática
    // equivocada al EDITAR un préstamo quincenal/mensual o de método saldo insoluto.
    if (_reCalc) { try { window.nxPrRecalc(); } catch (e) {} }
    // Si el préstamo se guardó con cuota EXACTA (modo "monto de la cuota"), reabrir en ese modo
    // con el monto precargado — para que editar conserve la cuota fija y su última cuota ajustada.
    if (pr && Number(p.cuota_fija) > 0 && p.modo === 'cuotas') {
      const co = document.getElementById('prCuotaObjetivo');
      if (co) co.value = Number(p.cuota_fija).toLocaleString('en-US');
      try { window.nxPrCuotaMode('monto'); } catch (e) {}
    }
    if (!pr && _prPrefillCli) { prFormPonerCliente(_prPrefillCli); _prPrefillCli = null; }
    try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(ov); } catch (e) {}
  }
  function prFormPonerCliente(c) {
    if (!c) return;
    const setv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setv('prCliId', c.id); setv('prNom', c.nombre); setv('prCed', c.cedula); setv('prTel', c.telefono);
  }
  window.nxPrClienteNuevoDesdeForm = function () {
    abrirClienteForm(null, function (saved) { abrirForm(null); setTimeout(function () { prFormPonerCliente(saved); }, 30); });
  };
  window.nxPrElegirCliente = function (target) {
    _prCliPickTarget = target === 'eval' ? 'eval' : 'form';
    cerrarModal('nxPrCliPick');
    const ov = document.createElement('div'); ov.id = 'nxPrCliPick'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    const filas = _prClientes.length ? _prClientes.map(c => `<button type="button" class="prCliPickRow" onclick="window.nxPrCliPickSel('${c.id}')"><b>${esc(c.nombre || '')}</b><span>${esc([c.cedula, c.telefono].filter(Boolean).join(' · ') || 'sin datos')}</span></button>`).join('') : '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">No hay clientes. Toca "Nuevo cliente".</div>';
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:420px;max-height:80vh;display:flex;flex-direction:column">
      <div class="mt"><span><i class="ti ti-users-group"></i> Elegir cliente</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrCliPick').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
      <div style="margin-bottom:8px">${prBuscador({ id: 'nxPrCliPickQ', placeholder: 'Buscar por nombre, cédula o teléfono...', oninput: 'window.nxPrCliPickFiltrar(this.value)' })}</div>
      <div id="prCliPickList" style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:6px">${filas}</div>
    </div>`;
    document.body.appendChild(ov);
  };
  window.nxPrCliPickFiltrar = function (q) {
    const t = String(q || '').trim().toLowerCase();
    const lista = !t ? _prClientes : _prClientes.filter(c => ((c.nombre || '') + ' ' + (c.cedula || '') + ' ' + (c.telefono || '')).toLowerCase().indexOf(t) >= 0);
    const box = document.getElementById('prCliPickList'); if (!box) return;
    box.innerHTML = lista.length ? lista.map(c => `<button type="button" class="prCliPickRow" onclick="window.nxPrCliPickSel('${c.id}')"><b>${esc(c.nombre || '')}</b><span>${esc([c.cedula, c.telefono].filter(Boolean).join(' · ') || 'sin datos')}</span></button>`).join('') : '<div style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">Nada coincide.</div>';
  };
  let _prCliPickTarget = 'form';
  window.nxPrCliPickSel = function (id) { const c = _prClientes.find(x => String(x.id) === String(id)); cerrarModal('nxPrCliPick'); if (!c) return; if (_prCliPickTarget === 'eval') evClientePuesto(c); else prFormPonerCliente(c); };

  // ══════════════════════════════════════════════════════════════════════
  //  EVALUACIÓN FINANCIERA (spec ChatGPT "Evaluación Financiera V1" + mockup rico)
  //  Cliente → Info económica/adicional → Análisis (5 indicadores) → Score /1000 →
  //  Simulador (motor real) → Resumen + Recomendación → "Aprobar y crear préstamo".
  //  Todo sobre datos REALES (prestamo_clientes + amortizar/calcPrestamo/nxPrestamoGuardar).
  //  Sin tabla nueva: la evaluación se guarda como NOTA en el préstamo al aprobar.
  //  Campos que la tabla NO tiene (gastos, antigüedad laboral, dependientes) son
  //  entradas EN VIVO usadas para el análisis — no se guardan (no se finge nada).
  // ══════════════════════════════════════════════════════════════════════
  let _evCli = null, _evScore = null, _evRec = '', _evRatio = 0;
  function evEdad(fnac) {
    if (!fnac) return null;
    const d = new Date(String(fnac).slice(0, 10) + 'T12:00:00'); if (isNaN(d)) return null;
    const h = new Date(); let a = h.getFullYear() - d.getFullYear();
    const m = h.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && h.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  }
  function evTiempoCliente(cr) {
    if (!cr) return null;
    const d = new Date(cr); if (isNaN(d)) return null;
    let meses = (new Date().getFullYear() - d.getFullYear()) * 12 + (new Date().getMonth() - d.getMonth());
    if (meses < 0) meses = 0;
    const an = Math.floor(meses / 12), me = meses % 12;
    if (an <= 0 && me <= 0) return 'nuevo';
    return [an ? an + (an === 1 ? ' año' : ' años') : '', me ? me + (me === 1 ? ' mes' : ' meses') : ''].filter(Boolean).join(', ');
  }
  // Compromiso MENSUAL estimado del préstamo (para el ratio cuota/ingreso).
  function evCompromisoMensual() {
    if (_modoForm === 'credito') {
      const cap = parseMoney(val('prCap')), tasa = parsePct(val('prTasa'));
      return (cap > 0 && tasa > 0) ? Math.round(cap * tasa / 100) : 0;
    }
    const c = calcPrestamo();
    if (c.computa && c.modo === 'cuotas') {
      const porMes = c.frec === 'semanal' ? 4.33 : c.frec === 'quincenal' ? 2 : 1;
      return Math.round(c.cuota * porMes);
    }
    return 0; // libre: sin cuota fija
  }
  // Score 0-100 determinístico (fórmula transparente, ajustable). deudas = gastos+deudas mensuales.
  function evCalcularScore(ingresoTotal, compromiso, gastos, antig) {
    if (!(ingresoTotal > 0) || !(compromiso > 0)) return null;
    const ratioTot = (compromiso + gastos) / ingresoTotal;
    let base;
    if (ratioTot <= 0.30) base = 90;
    else if (ratioTot <= 0.40) base = 72;
    else if (ratioTot <= 0.50) base = 55;
    else if (ratioTot <= 0.65) base = 38;
    else base = 18;
    if (_evCli) {
      if (_evCli.tiene_fiador) base += 5;
      if (_evCli.tipo_ingreso === 'Empleado') base += 5;
      else if (_evCli.tipo_ingreso === 'Pensión') base += 3;
    }
    if (antig >= 4) base += 5; else if (antig >= 2) base += 3; else if (antig >= 1) base += 1;
    return Math.max(0, Math.min(100, Math.round(base)));
  }
  function evRecInfo(score) {
    if (score == null) return { txt: 'Sin evaluar', col: '#64748b', bg: '#f1f5f9', ico: 'ti-minus', riesgo: '—' };
    if (score >= 70) return { txt: 'Aprobable', col: '#059669', bg: '#ecfdf5', ico: 'ti-circle-check', riesgo: 'Bajo' };
    if (score >= 50) return { txt: 'Revisar', col: '#d97706', bg: '#fffbeb', ico: 'ti-alert-triangle', riesgo: 'Medio' };
    return { txt: 'No recomendado', col: '#dc2626', bg: '#fef2f2', ico: 'ti-circle-x', riesgo: 'Alto' };
  }
  // Badge de calificación por valor. thr = [excelente, bueno, aceptable]; inv=true = menor es mejor.
  function evRating(v, thr, inv) {
    const good = inv ? [v <= thr[0], v <= thr[1], v <= thr[2]] : [v >= thr[0], v >= thr[1], v >= thr[2]];
    if (good[0]) return { t: 'Excelente', c: '#059669', b: '#ecfdf5' };
    if (good[1]) return { t: 'Bueno', c: '#0891b2', b: '#ecfeff' };
    if (good[2]) return { t: 'Aceptable', c: '#d97706', b: '#fffbeb' };
    return { t: 'Bajo', c: '#dc2626', b: '#fef2f2' };
  }
  function evAnRow(ico, lbl, valTxt, barPct, rat) {
    return `<div class="ev-an">
      <div class="ev-anhd"><i class="ti ${ico}"></i><span class="ev-anlbl">${lbl}</span><span class="ev-anval">${valTxt}</span></div>
      <div class="ev-bar"><div class="ev-barf" style="width:${Math.max(2, Math.min(100, barPct))}%;background:${rat.c}"></div></div>
      <div class="ev-anbadge" style="color:${rat.c};background:${rat.b}">${rat.t}</div>
    </div>`;
  }
  function evClienteBoxHTML() {
    if (!_evCli) return `<div class="ev-cliempty"><i class="ti ti-user-search"></i> Elige un cliente para empezar la evaluación.</div>`;
    const c = _evCli, edad = evEdad(c.fecha_nacimiento), tc = evTiempoCliente(c.created_at);
    const dato = (lbl, v) => `<div class="ev-cdcol"><div class="ev-cdlbl">${lbl}</div><div class="ev-cdval">${esc(v || '—')}</div></div>`;
    return `<div class="ev-clihead">
        <div class="ev-avatar">${esc((c.nombre || '?').trim().charAt(0).toUpperCase())}</div>
        <div style="min-width:0;flex:1">
          <div class="ev-clitop"><span class="ev-clinom">${esc(c.nombre || 'Sin nombre')}</span><span class="ev-clibadge">Cliente activo</span></div>
          <div class="ev-cddat">${dato('Cédula', c.cedula)}${dato('Teléfono', c.telefono)}${dato('Edad', edad != null ? edad + ' años' : null)}${dato('Tiempo como cliente', tc)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;flex:0 0 auto;align-self:flex-start">
          <button type="button" class="btn bsm" onclick="window.evVerPerfil()"><i class="ti ti-user"></i> Ver perfil</button>
          <button type="button" class="btn bsm" onclick="window.nxPrHistCredito('${esc(c.id)}')"><i class="ti ti-history"></i> Historial crediticio</button>
        </div>
      </div>`;
  }
  function prEvalMainHTML() {
    return `
      <div class="nxFP-topbar">
        <button type="button" class="nxFP-burger" onclick="window.nxFPToggleSide()" aria-label="Abrir menú"><i class="ti ti-menu-2"></i></button>
        <div><div class="nxFP-topTitle">Nueva evaluación financiera</div><div class="nxFP-topSub">Analiza la capacidad de pago y determina las condiciones recomendadas</div></div>
      </div>
      <div class="ev-clicard nxPrForm">
        <div class="ev-sechd" style="margin-bottom:10px"><i class="ti ti-user-circle" style="color:#4f46e5"></i> Cliente</div>
        <div id="evCliBox">${evClienteBoxHTML()}</div>
        <input type="hidden" id="prCliId"><input type="hidden" id="prNom"><input type="hidden" id="prCed"><input type="hidden" id="prTel">
        <div style="display:flex;gap:6px;margin-top:12px">
          <button type="button" class="btn bsm" style="flex:1" onclick="window.nxPrElegirCliente('eval')"><i class="ti ti-users-group"></i> Elegir cliente</button>
          <button type="button" class="btn bsm" style="flex:1" onclick="window.evNuevoCliente()"><i class="ti ti-user-plus"></i> Nuevo cliente</button>
        </div>
      </div>
      <div class="ev-tabs">
        <button type="button" class="ev-tab on" onclick="window.evTab(this,'evColGeneral')"><span class="ev-tn">1</span> Información general</button>
        <button type="button" class="ev-tab" onclick="window.evTab(this,'evColAnalisis')"><i class="ti ti-chart-bar"></i> Análisis financiero</button>
        <button type="button" class="ev-tab" onclick="window.evTab(this,'evColSimulador')"><i class="ti ti-calculator"></i> Simulador</button>
        <button type="button" class="ev-tab" onclick="window.evTab(this,'evSecRecom')"><i class="ti ti-clipboard-check"></i> Recomendación</button>
      </div>
      <div class="ev-grid nxPrForm">
        <div class="ev-cols">
          <div class="ev-col on" id="evColGeneral">
            <div class="ev-card" id="evSecGeneral">
              <div class="ev-sechd">Información económica</div>
              <div class="fr-row">
                <div class="fr"><label>Ingresos mensuales *</label><input id="evIngreso" data-nx-money inputmode="numeric" oninput="window.evRecalc()" placeholder="0"></div>
                <div class="fr"><label>Gastos mensuales</label><input id="evGastos" data-nx-money inputmode="numeric" oninput="window.evRecalc()" placeholder="0"></div>
              </div>
              <div class="fr-row">
                <div class="fr"><label>Cargo / Actividad</label><input id="evOcup" class="no-upper" oninput="window.evRecalc()" placeholder="Ej: Vendedor"></div>
                <div class="fr"><label>Antigüedad laboral (años)</label><input id="evAntig" type="number" min="0" step="0.5" inputmode="decimal" oninput="window.evRecalc()" placeholder="0"></div>
              </div>
              <div class="fr"><label>Otros ingresos RD$ <span class="ev-opt">(opcional)</span></label><input id="evOtros" data-nx-money inputmode="numeric" oninput="window.evRecalc()" placeholder="0"></div>
              <div class="ev-hint">Gastos y antigüedad se usan solo para el análisis — no se guardan en el cliente.</div>
            </div>
            <div class="ev-card">
              <div class="ev-sechd">Información adicional</div>
              <div class="fr-row">
                <div class="fr"><label>Estado civil</label><input id="evCivil" class="no-upper" placeholder="—"></div>
                <div class="fr"><label>Dependientes</label><input id="evDeps" type="number" min="0" placeholder="0"></div>
              </div>
              <div class="fr"><label>Dirección</label><input id="evDir" class="no-upper" placeholder="—"></div>
              <div class="fr-row">
                <div class="fr"><label>Referencia personal</label><input id="evRef1" class="no-upper" placeholder="—"></div>
                <div class="fr"><label>Referencia comercial</label><input id="evRef2" class="no-upper" placeholder="—"></div>
              </div>
            </div>
            <div class="ev-card">
              <div class="ev-sechd">Notas del asesor</div>
              <textarea id="evNotas" rows="3" class="no-upper" maxlength="500" oninput="var e=document.getElementById('evNotasCnt');if(e)e.textContent=this.value.length" placeholder="Observaciones sobre el cliente, comportamiento de pago, referencias…"></textarea>
              <div style="text-align:right;font-size:10px;color:#94a3b8;margin-top:2px"><span id="evNotasCnt">0</span> / 500</div>
            </div>
          </div>
          <div class="ev-col" id="evColAnalisis">
            <div class="ev-card" id="evSecAnalisis">
              <div class="ev-sechd">Análisis financiero</div>
              <div id="evAnalisis"></div>
            </div>
            <div class="ev-card">
              <div class="ev-sechd">Score interno</div>
              <div id="evScoreBox"></div>
            </div>
          </div>
          <div class="ev-col" id="evColSimulador">
            <div class="ev-card" id="evSecSimul">
              <div class="ev-sechd">Simulador de préstamo</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                <button type="button" id="prModoLibre" class="btn ev-modo" onclick="window.evModo('libre')">Abonos libres</button>
                <button type="button" id="prModoCuotas" class="btn ev-modo" onclick="window.evModo('cuotas')">Cuotas fijas</button>
                <button type="button" id="prModoCredito" class="btn ev-modo" onclick="window.evModo('credito')">Línea de crédito</button>
              </div>
              <div class="ev-sl"><div class="ev-slhd"><label>Capital solicitado</label><div class="ev-slnum"><span>RD$</span><input id="prCap" data-nx-money inputmode="numeric" value="20,000" oninput="window.evSyncSl('prCapSl','prCap',true);window.evRecalc()"></div></div>
                <input id="prCapSl" type="range" min="5000" max="200000" step="1000" value="20000" oninput="window.evSyncNum('prCap','prCapSl',true);window.evRecalc()">
                <div class="ev-slmm"><span>RD$ 5,000</span><span>RD$ 200,000+</span></div></div>
              <div class="ev-sl"><div class="ev-slhd"><label>Tasa de interés mensual (%)</label><div class="ev-slnum"><input id="prTasa" inputmode="decimal" value="10" oninput="window.evSyncSl('prTasaSl','prTasa',false);window.evRecalc()"><span>%</span></div></div>
                <input id="prTasaSl" type="range" min="0" max="20" step="0.25" value="10" oninput="window.evSyncNum('prTasa','prTasaSl',false);window.evRecalc()">
                <div class="ev-slmm"><span>0%</span><span>20%+</span></div></div>
              <div id="prCuotasBox">
                <div class="ev-sl"><div class="ev-slhd"><label># de cuotas</label><div class="ev-slnum"><input id="prNumCuotas" type="number" min="1" inputmode="numeric" value="8" oninput="window.evSyncSl('prNumCuotasSl','prNumCuotas',false);window.evRecalc()"></div></div>
                  <input id="prNumCuotasSl" type="range" min="1" max="60" step="1" value="8" oninput="window.evSyncNum('prNumCuotas','prNumCuotasSl',false);window.evRecalc()">
                  <div class="ev-slmm"><span>1</span><span>60+</span></div></div>
                <div class="fr-row">
                  <div class="fr"><label>Frecuencia</label><select id="prFrec" onchange="window.evRecalc()"><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual" selected>Mensual</option></select></div>
                  <div class="fr"><label>Método</label><select id="prMetodo" onchange="window.evRecalc()"><option value="plano">Interés plano</option><option value="saldo">Saldo insoluto</option></select></div>
                </div>
              </div>
              <div id="prCreditoBox" style="display:none">
                <div class="ev-sl"><div class="ev-slhd"><label>Plazo (meses)</label><div class="ev-slnum"><input id="prPlazo" type="number" min="1" inputmode="numeric" value="6" oninput="window.evSyncSl('prPlazoSl','prPlazo',false);window.evRecalc()"></div></div>
                  <input id="prPlazoSl" type="range" min="1" max="60" step="1" value="6" oninput="window.evSyncNum('prPlazo','prPlazoSl',false);window.evRecalc()">
                  <div class="ev-slmm"><span>1</span><span>60+</span></div></div>
              </div>
              <div id="prTotRow" class="fr" style="display:none"><label>Total a devolver</label><input id="prTot" data-nx-money inputmode="numeric" oninput="window.evRecalc()" placeholder="0"></div>
              <textarea id="prNotas" style="display:none"></textarea>
              <div id="evCuotaCard"></div>
            </div>
          </div>
        </div>
        <aside class="ev-aside" id="evSecRecom">
          <div class="ev-card ev-sticky">
            <div class="ev-ashd">Resumen de la evaluación</div>
            <div id="evResumen"></div>
            <div class="ev-pasos">
              <div class="ev-pashd">Próximos pasos</div>
              <div class="ev-paso"><i class="ti ti-circle"></i> Revisar documentación</div>
              <div class="ev-paso"><i class="ti ti-circle"></i> Validar referencias</div>
              <div class="ev-paso"><i class="ti ti-circle"></i> Aprobación final</div>
            </div>
            <div class="ev-asesor" id="evAsesor"></div>
            <button type="button" class="btn bc1 ev-aprobar" id="evAprobarBtn" onclick="window.evAprobar()" disabled><i class="ti ti-circle-check"></i> Aprobar y crear préstamo</button>
            <button type="button" class="ev-cancel" onclick="window.nxPrView('prestamos')">Cancelar</button>
          </div>
        </aside>
      </div>`;
  }
  window.evTab = function (btn, id) {
    try { document.querySelectorAll('.ev-tab').forEach(b => b.classList.remove('on')); if (btn) btn.classList.add('on'); } catch (e) {}
    const el = document.getElementById(id); if (!el) return;
    if (el.classList && el.classList.contains('ev-col')) {
      try { document.querySelectorAll('.ev-cols > .ev-col').forEach(c => c.classList.remove('on')); } catch (e) {}
      el.classList.add('on');
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  window.evVerPerfil = function () { if (_evCli) abrirClienteForm(_evCli, null); };
  function evInit() {
    _evCli = null; _evScore = null; _evRec = ''; _evRatio = 0;
    _modoForm = 'cuotas';
    const box = document.getElementById('evCliBox'); if (box) box.innerHTML = evClienteBoxHTML();
    try { if (typeof pintarModo === 'function') pintarModo(); } catch (e) {}
    window.evRecalc();
    const as = document.getElementById('evAsesor');
    if (as) { const d = new Date(), f = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); as.innerHTML = `<div class="ev-aslbl">Asesor responsable</div><div class="ev-asnom"><i class="ti ti-user-circle"></i> ${esc(nomAdmin())}</div><div class="ev-asfch">Fecha de evaluación: ${f}</div>`; }
    try { const ov = document.getElementById('v-prestamos'); if (window.nxMoney && window.nxMoney.scan && ov) window.nxMoney.scan(ov); } catch (e) {}
  }
  window.evModo = function (m) { _modoForm = m; try { pintarModo(); } catch (e) {} window.evRecalc(); };
  // Simulador de "ambas formas": el número (fuente de verdad, sin tope) y el deslizador sincronizados.
  window.evSyncSl = function (slId, numId, money) {
    const s = document.getElementById(slId), n = document.getElementById(numId); if (!s || !n) return;
    const v = money ? parseMoney(n.value) : (Number(String(n.value).replace(',', '.')) || 0);
    s.value = Math.max(Number(s.min), Math.min(Number(s.max), v)); // el slider solo llega a su tope; el número puede pasarse
  };
  window.evSyncNum = function (numId, slId, money) {
    const s = document.getElementById(slId), n = document.getElementById(numId); if (!s || !n) return;
    n.value = money ? Number(s.value).toLocaleString('en-US') : s.value;
  };
  window.evNuevoCliente = function () {
    abrirClienteForm(null, function (saved) { window.nxPrView('evaluacion'); setTimeout(function () { evClientePuesto(saved); }, 40); });
  };
  function evClientePuesto(c) {
    _evCli = c || null;
    const setv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v == null ? '' : v; };
    setv('prCliId', c && c.id); setv('prNom', c && c.nombre); setv('prCed', c && c.cedula); setv('prTel', c && c.telefono);
    const box = document.getElementById('evCliBox'); if (box) box.innerHTML = evClienteBoxHTML();
    if (c) {
      const ing = document.getElementById('evIngreso');
      if (ing && c.ingreso_mensual != null && !parseMoney(ing.value)) ing.value = Math.round(Number(c.ingreso_mensual) || 0).toLocaleString('en-US');
      setv('evOcup', c.ocupacion); setv('evCivil', c.estado_civil); setv('evDir', c.direccion);
      setv('evRef1', [c.ref1_nombre, c.ref1_telefono && ('(' + c.ref1_telefono + ')')].filter(Boolean).join(' '));
      setv('evRef2', [c.ref2_nombre, c.ref2_telefono && ('(' + c.ref2_telefono + ')')].filter(Boolean).join(' '));
    }
    window.evRecalc();
  }
  window.evVerAmort = function () {
    const c = calcPrestamo();
    let rows = [], cols = '';
    if (_modoForm === 'credito') {
      const cc = creditoCalc({ id: '__ev__', capital: parseMoney(val('prCap')), tasa_interes: parsePct(val('prTasa')), fecha_prestamo: val('prFecha') || hoy(), plazo_meses: parseInt(val('prPlazo'), 10) || 0, modo: 'credito' });
      rows = (cc.meses || []).map(m => `<tr><td>#${m.n}</td><td>${m.fecha}</td><td style="text-align:right">${fmt(m.saldo)}</td><td style="text-align:right;color:#ea580c">${fmt(m.interes)}</td></tr>`).join('');
      cols = '<th>Mes</th><th>Desde</th><th style="text-align:right">Capital base</th><th style="text-align:right">Interés</th>';
    } else if (c.computa && c.modo === 'cuotas') {
      const a = amortizar(c.cap, c.tasa, c.n, val('prFecha') || hoy(), c.frec, c.metodo, c.cuotaFija);
      rows = a.rows.map(r => `<tr><td>#${r.n}</td><td>${r.fecha}</td><td style="text-align:right;font-weight:700">${fmt(r.cuota)}</td><td style="text-align:right;color:#6d28d9">${fmt(r.capital)}</td><td style="text-align:right">${fmt(r.saldo)}</td></tr>`).join('');
      cols = '<th>#</th><th>Fecha</th><th style="text-align:right">Cuota</th><th style="text-align:right">Capital</th><th style="text-align:right">Saldo</th>';
    } else { toast('err', 'Completa el simulador primero'); return; }
    cerrarModal('evAmort');
    const ov = document.createElement('div'); ov.id = 'evAmort'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:520px;max-height:85vh;display:flex;flex-direction:column">
      <div class="mt"><span><i class="ti ti-table"></i> Amortización detallada</span><span style="display:flex;gap:6px;align-items:center;flex:none"><button class="btn bsm bghost" type="button" onclick="window.nxPrPropuesta()" title="Compartir esta propuesta" aria-label="Compartir propuesta con el cliente"><i class="ti ti-share" style="color:#6d28d9"></i> Compartir</button><button class="nxBack" type="button" onclick="document.getElementById('evAmort').remove()"><i class="ti ti-arrow-left"></i> Volver</button></span></div>
      <div style="overflow:auto;flex:1"><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:#f8fafc;color:#475569;position:sticky;top:0">${cols}</tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
    document.body.appendChild(ov);
  };
  window.evRecalc = function () {
    const totRow = document.getElementById('prTotRow'); if (totRow) totRow.style.display = _modoForm === 'libre' ? '' : 'none';
    const ingreso = parseMoney(val('evIngreso')), otros = parseMoney(val('evOtros')), gastos = parseMoney(val('evGastos'));
    const antig = Number(val('evAntig')) || 0;
    const ingresoTotal = ingreso + otros;
    const compromiso = evCompromisoMensual();
    const capacidad = ingresoTotal - gastos;
    const relIngGas = ingresoTotal > 0 ? capacidad / ingresoTotal : 0;
    const nivelEndeud = ingresoTotal > 0 ? compromiso / ingresoTotal : 0;
    const liquidez = (gastos + compromiso) > 0 ? ingresoTotal / (gastos + compromiso) : (ingresoTotal > 0 ? 9 : 0);
    _evRatio = nivelEndeud;
    const score = evCalcularScore(ingresoTotal, compromiso, gastos, antig);
    _evScore = score; const rec = evRecInfo(score); _evRec = rec.txt;
    const c = calcPrestamo();
    // valores del slider
    const pct = v => (Math.round(v * 1000) / 10).toFixed(0) + '%';
    // ── Análisis (5 indicadores) ──
    const an = document.getElementById('evAnalisis');
    if (an) {
      if (!(ingresoTotal > 0)) { an.innerHTML = `<div class="ev-hint">Ingresa los ingresos del cliente para ver el análisis.</div>`; }
      else {
        an.innerHTML =
          evAnRow('ti-cash', 'Capacidad de pago', fmt(capacidad), (capacidad / ingresoTotal) * 100, evRating(capacidad / ingresoTotal, [0.5, 0.35, 0.2], false)) +
          evAnRow('ti-scale', 'Relación ingresos/gastos', pct(relIngGas), relIngGas * 100, evRating(relIngGas, [0.5, 0.35, 0.2], false)) +
          evAnRow('ti-percentage', 'Nivel de endeudamiento', pct(nivelEndeud), nivelEndeud * 100, evRating(nivelEndeud, [0.2, 0.35, 0.5], true)) +
          evAnRow('ti-droplet', 'Liquidez estimada', (Math.round(liquidez * 10) / 10).toFixed(1), (liquidez / 3) * 100, evRating(liquidez, [2, 1.5, 1], false)) +
          evAnRow('ti-briefcase', 'Estabilidad laboral', antig > 0 ? antig + (antig === 1 ? ' año' : ' años') : 'sin dato', (antig / 5) * 100, evRating(antig, [3, 1, 0.5], false));
      }
    }
    // ── Score interno (gauge /1000 + estrellas + riesgo) ──
    const sb = document.getElementById('evScoreBox');
    if (sb) {
      if (score == null) { sb.innerHTML = `<div class="ev-hint">El score aparece al completar ingresos y el simulador.</div>`; }
      else {
        const mil = score * 10, full = Math.round(score / 20);
        const stars = Array.from({ length: 5 }, (_, i) => `<i class="ti ti-star${i < full ? '-filled' : ''}"></i>`).join('');
        const desc = score >= 70 ? 'El cliente presenta un buen perfil de pago.' : score >= 50 ? 'Perfil aceptable — conviene revisar referencias.' : 'Perfil de riesgo — evaluar con cuidado.';
        sb.innerHTML = `<div class="ev-scorewrap">
          <div class="ev-gauge" style="--pct:${score};--gc:${rec.col}"><div class="ev-gaugein"><div class="ev-gnum">${mil}</div><div class="ev-gsub">de 1000</div></div></div>
          <div style="flex:1;min-width:0"><div class="ev-stars" style="color:#f59e0b">${stars} <span style="color:${rec.col};font-weight:800;font-size:12px">${rec.riesgo === 'Bajo' ? 'Bueno' : rec.riesgo === 'Medio' ? 'Regular' : 'Bajo'}</span></div>
            <div class="ev-sdesc">${desc}</div>
            <div class="ev-rbadge" style="color:${rec.col};background:${rec.bg}">Riesgo: ${rec.riesgo}</div></div></div>`;
      }
    }
    // ── Cuota estimada (tarjeta) ──
    const cc = document.getElementById('evCuotaCard');
    if (cc) {
      if (_modoForm === 'cuotas' && c.computa) {
        const a = amortizar(c.cap, c.tasa, c.n, val('prFecha') || hoy(), c.frec, c.metodo, c.cuotaFija);
        const f1 = a.rows[0] ? a.rows[0].fecha : '—', f2 = a.rows[a.rows.length - 1] ? a.rows[a.rows.length - 1].fecha : '—';
        cc.innerHTML = `<div class="ev-quota"><div class="ev-qlbl">Cuota estimada</div><div class="ev-qbig">${fmt(c.cuota)}</div>
          <div class="ev-qrow"><span>Interés total</span><b>${fmt(c.interes)}</b></div>
          <div class="ev-qrow"><span>Total a devolver</span><b>${fmt(c.total)}</b></div>
          <div class="ev-qrow"><span>Fecha primer pago</span><b>${f1}</b></div>
          <div class="ev-qrow"><span>Fecha última pago</span><b>${f2}</b></div>
          <button type="button" class="ev-amort" onclick="window.evVerAmort()"><i class="ti ti-table"></i> Ver amortización detallada</button></div>`;
      } else if (_modoForm === 'libre' && c.computa) {
        cc.innerHTML = `<div class="ev-quota"><div class="ev-qlbl">Total a devolver</div><div class="ev-qbig">${fmt(c.total)}</div>
          <div class="ev-qrow"><span>Interés</span><b>${fmt(c.interes)}</b></div>
          <div class="ev-qrow"><span>Modalidad</span><b>Abonos libres</b></div></div>`;
      } else if (_modoForm === 'credito' && compromiso > 0) {
        cc.innerHTML = `<div class="ev-quota"><div class="ev-qlbl">Interés del 1er mes</div><div class="ev-qbig">${fmt(compromiso)}</div>
          <div class="ev-qrow"><span>Sobre el capital</span><b>${fmt(parseMoney(val('prCap')))}</b></div>
          <button type="button" class="ev-amort" onclick="window.evVerAmort()"><i class="ti ti-table"></i> Ver detalle por mes</button></div>`;
      } else { cc.innerHTML = ''; }
    }
    // ── Resumen ──
    const capital = parseMoney(val('prCap'));
    let recomendado = capital;
    if (compromiso > 0 && ingresoTotal > 0 && nivelEndeud > 0.35) recomendado = Math.max(0, Math.round(capital * (0.35 * ingresoTotal / compromiso) / 1000) * 1000);
    const tipoTxt = _modoForm === 'cuotas' ? 'Cuotas fijas' : _modoForm === 'credito' ? 'Línea de crédito' : 'Abonos libres';
    const cuotaTxt = _modoForm === 'credito' ? (compromiso > 0 ? fmt(compromiso) + '/mes' : '—')
      : (c.computa && c.modo === 'cuotas') ? fmt(c.cuota) : (c.computa && c.modo === 'libre') ? fmt(c.total) : '—';
    const rs = document.getElementById('evResumen');
    if (rs) {
      const row = (l, v, col) => `<div class="ev-rsrow"><span>${l}</span><b${col ? ` style="color:${col}"` : ''}>${v}</b></div>`;
      rs.innerHTML =
        row('Monto solicitado', fmt(capital)) +
        row('Monto recomendado', fmt(recomendado), recomendado < capital ? '#d97706' : '#059669') +
        row('Cuota estimada', cuotaTxt) +
        row('Tipo de préstamo', tipoTxt) +
        row('Ratio endeudamiento', ingresoTotal > 0 ? pct(nivelEndeud) : '—') +
        `<div class="ev-rsrow ev-rsrisk"><span>Nivel de riesgo</span><b style="color:${rec.col};background:${rec.bg}">${rec.riesgo}</b></div>` +
        `<div class="ev-rsrow ev-rsrisk"><span>Resultado</span><b style="color:${rec.col};background:${rec.bg}">${rec.txt}</b></div>`;
    }
    // ── Botón ──
    const btn = document.getElementById('evAprobarBtn');
    if (btn) {
      const ok = !!_evCli && (c.computa || (_modoForm === 'libre' && parseMoney(val('prTot')) > 0) || (_modoForm === 'credito' && parseMoney(val('prCap')) > 0 && parsePct(val('prTasa')) > 0));
      btn.disabled = !ok;
    }
  };
  window.evAprobar = async function () {
    if (!_evCli) { toast('err', 'Elige un cliente primero'); return; }
    const c = calcPrestamo();
    const okCalc = c.computa || (_modoForm === 'libre' && parseMoney(val('prTot')) > 0) || (_modoForm === 'credito' && parseMoney(val('prCap')) > 0 && parsePct(val('prTasa')) > 0);
    if (!okCalc) { toast('err', 'Completa el simulador del préstamo (capital, tasa, cuotas)'); return; }
    if (_evScore != null && _evScore < 70) {
      const ok = confirm('La evaluación da "' + _evRec + '" (score ' + _evScore + '/100).\n\n¿Crear el préstamo de todos modos?');
      if (!ok) return;
    }
    const notaEval = _evScore != null
      ? 'Evaluación: score ' + _evScore + '/100 · ' + _evRec + ' · ratio endeudamiento ' + (Math.round(_evRatio * 1000) / 10).toFixed(1) + '%'
      : 'Evaluación financiera realizada';
    const notasAsesor = (val('evNotas') || '').trim();
    const nt = document.getElementById('prNotas'); if (nt) nt.value = notaEval + (notasAsesor ? '\n' + notasAsesor : '');
    await window.nxPrestamoGuardar('');
  };

  // ══════════════════════════════════════════════════════════════════════
  //  HISTORIAL CREDITICIO (spec + mockup ChatGPT "Historial Crediticio V1")
  //  Vista de solo lectura del comportamiento crediticio del cliente, sobre
  //  DATOS REALES (prestamos + prestamo_pagos + prestamo_clientes). Layout de
  //  2 columnas como el mockup: KPIs, comportamiento mensual, tabla de
  //  préstamos + panel (Recomendación / Indicadores / Alertas).
  //  Mora AHORA es real y configurable (prestamos_config.mora_pct/dias_gracia,
  //  apagada por defecto = 0, igual que Cuotas del POS). Lo que el módulo NO
  //  tiene se muestra con estado vacío honesto (Documentos: sin Storage;
  //  Gestiones de cobro: sin tabla) o en 0 real (Promesas incumplidas).
  // ══════════════════════════════════════════════════════════════════════
  const PR_MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  function prMesLabel(ym) { const p = String(ym || '').split('-'); return p.length === 2 ? (PR_MESES[(parseInt(p[1], 10) || 1) - 1] + ' ' + p[0]) : ym; }
  function prClienteLoans(cid) { return _prestamos.filter(p => String(p.cliente_id || '') === String(cid)); }
  // Mora (recargo ÚNICO) del préstamo, EN VIVO — solo si está configurada y vencido más allá de la gracia.
  function prMoraDe(p) {
    const pct = Number((_prCfg || {}).mora_pct || 0); if (!(pct > 0)) return 0;
    if (!esVencido(p)) return 0;
    const gracia = Number((_prCfg || {}).mora_dias_gracia || 0);
    if (prDiasVencido(p) <= gracia) return 0;
    return Math.round(saldoDe(p) * pct / 100);
  }
  function prHistScore(loans) {
    if (!loans.length) return { s: null, mil: 0, clas: 'Sin historial', riesgo: '—', estado: 'Sin evaluar', col: '#64748b' };
    const total = loans.length, pagados = loans.filter(p => estadoDe(p) === 'pagado').length;
    const vencidos = loans.filter(p => esVencido(p)).length;
    const pag = loans.reduce((s, p) => s + pagadoDe(p), 0);
    const debe = loans.reduce((s, p) => s + Number(p.total_devolver || 0), 0);
    let base = 60;
    base += (pagados / total) * 20;
    if (debe > 0) base += Math.min(15, (pag / debe) * 15);
    base -= Math.min(45, vencidos * 15);
    if (vencidos === 0 && pagados >= 1) base += 5;
    const s = Math.max(0, Math.min(100, Math.round(base)));
    const clas = s >= 80 ? 'Excelente' : s >= 65 ? 'Muy bueno' : s >= 50 ? 'Bueno' : s >= 35 ? 'Regular' : 'Bajo';
    const riesgo = s >= 65 ? 'Bajo' : s >= 45 ? 'Medio' : 'Alto';
    const estado = s >= 65 ? 'Aprobable' : s >= 45 ? 'Revisión' : 'No recomendable';
    const col = s >= 65 ? '#059669' : s >= 45 ? '#d97706' : '#dc2626';
    return { s, mil: s * 10, clas, riesgo, estado, col };
  }
  // Puntos por cuota (ESTIMADO: aplica los pagos en orden a las cuotas).
  function prCuotaDots(p) {
    if (p.modo !== 'cuotas' || !(Number(p.num_cuotas) > 0)) return null;
    let a; try { a = amortizar(Number(p.capital), Number(p.tasa_interes), p.num_cuotas, p.fecha_prestamo || hoy(), p.frecuencia, p.metodo_interes || 'saldo', Number(p.cuota_fija) || 0); } catch (e) { return null; }
    const pagos = (_pagosByPrestamo[p.id] || []).slice().sort((x, y) => (x.fecha || '') < (y.fecha || '') ? -1 : 1);
    const H = hoy(); let cum = 0;
    return a.rows.map(r => {
      cum += r.cuota;
      let acc = 0, cov = null;
      for (const pg of pagos) { acc += Number(pg.monto || 0); if (acc >= cum - 1) { cov = pg.fecha; break; } }
      if (cov) { const dl = Math.floor((new Date(cov + 'T12:00:00') - new Date(r.fecha + 'T12:00:00')) / 86400000); return { c: dl <= 0 ? 'ok' : dl <= 5 ? 'y' : dl <= 15 ? 'o' : 'r', f: r.fecha }; }
      if (r.fecha > H) return { c: 'g', f: r.fecha };
      const dl = Math.floor((new Date(H + 'T12:00:00') - new Date(r.fecha + 'T12:00:00')) / 86400000);
      return { c: dl <= 5 ? 'y' : dl <= 15 ? 'o' : 'r', f: r.fecha };
    });
  }
  // % de cuotas YA vencidas que se pagaron a tiempo (mismo dato que pinta la línea de
  // tiempo). Antes se calculaba con "préstamos vencidos HOY / total préstamos", lo que
  // podía dar 100% aunque el historial mostrara meses en mora — quedaba
  // contradictorio con los puntos rojo/amarillo de abajo. Si el cliente no tiene
  // préstamos en modo cuotas (línea de crédito / abonos libres), se usa el criterio
  // anterior como respaldo.
  function prPuntualidad(loans) {
    let ok = 0, cont = 0;
    loans.forEach(p => { const dots = prCuotaDots(p); if (!dots) return; dots.forEach(d => { if (d.c === 'g') return; cont++; if (d.c === 'ok') ok++; }); });
    if (cont) return Math.round((ok / cont) * 100);
    const total = loans.length;
    return total ? Math.round(((total - loans.filter(p => esVencido(p)).length) / total) * 100) : 100;
  }
  // Línea de tiempo MENSUAL: peor estado de las cuotas que caen en cada mes (últimos 12 con actividad).
  function prTimelineMeses(loans) {
    const byM = {}, rank = { ok: 0, g: 1, y: 2, o: 3, r: 4 };
    loans.forEach(p => { const d = prCuotaDots(p); if (!d) return; d.forEach(x => { const m = (x.f || '').slice(0, 7); if (!m) return; if (!byM[m] || rank[x.c] > rank[byM[m]]) byM[m] = x.c; }); });
    return Object.keys(byM).sort().slice(-12).map(m => ({ m: m, c: byM[m] }));
  }
  function prUltActividad(loans) {
    let m = '';
    loans.forEach(p => { if ((p.fecha_prestamo || '') > m) m = p.fecha_prestamo || ''; (_pagosByPrestamo[p.id] || []).forEach(pg => { if ((pg.fecha || '') > m) m = pg.fecha; }); });
    return m || '—';
  }
  function prCuotaFmt(p) { try { if (p.modo === 'cuotas' && Number(p.num_cuotas) > 0) { const a = amortizar(Number(p.capital), Number(p.tasa_interes), p.num_cuotas, p.fecha_prestamo || hoy(), p.frecuencia, p.metodo_interes || 'saldo', Number(p.cuota_fija) || 0); return fmt(a.cuota); } } catch (e) {} return '—'; }
  function prPlazoTxt(p) { return p.modo === 'cuotas' && Number(p.num_cuotas) > 0 ? (p.num_cuotas + ' ' + (p.frecuencia === 'semanal' ? 'sem' : p.frecuencia === 'quincenal' ? 'quinc' : 'meses')) : p.modo === 'credito' ? ((p.plazo_meses || '—') + ' meses') : '—'; }
  let _hcCid = null, _hcTab = 'resumen';
  window.nxPrHistCredito = function (cid) {
    const c = _prClientes.find(x => String(x.id) === String(cid)); if (!c) { toast('err', 'Cliente no encontrado'); return; }
    // Cliente 360 (Seguros/Financiamiento/POS cruzados) reemplaza este botón cuando
    // el prestatario también es cliente del seguro (vínculo por cédula/teléfono,
    // mismo criterio que ya usa el propio expediente). Si no hay match, este
    // cliente de Financiamiento no existe en Seguros — cae al Historial
    // Crediticio de siempre (Financiamiento-only), que sigue siendo real y útil.
    if (typeof window.nxC360AbrirPorContacto === 'function' && window.nxC360AbrirPorContacto(c.cedula, c.telefono)) return;
    _hcCid = cid; _hcTab = 'resumen';
    cerrarModal('nxPrHc');
    const ov = document.createElement('div'); ov.id = 'nxPrHc'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxFP hcModal" style="max-width:1120px;width:97vw;max-height:95vh;display:flex;flex-direction:column;padding:0">
      <div class="hc-top"><div style="min-width:0"><div class="hc-title">Historial crediticio</div><div class="hc-sub">Consulta el comportamiento crediticio y financiero del cliente</div></div>
        <button class="nxBack" type="button" onclick="document.getElementById('nxPrHc').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
      <div id="hcBody" style="overflow-y:auto;flex:1;padding:16px"></div>
    </div>`;
    document.body.appendChild(ov);
    hcRender();
  };
  window.nxPrHcTab = function (t) { _hcTab = t; hcRender(); };
  function hcRender() {
    const body = document.getElementById('hcBody'); if (!body) return;
    const c = _prClientes.find(x => String(x.id) === String(_hcCid)); if (!c) return;
    const loans = prClienteLoans(_hcCid);
    const sc = prHistScore(loans);
    const total = loans.length, activos = loans.filter(p => estadoDe(p) !== 'pagado').length, pagados = loans.filter(p => estadoDe(p) === 'pagado').length;
    const vencidos = loans.filter(p => esVencido(p));
    const financiado = loans.reduce((s, p) => s + Number(p.capital || 0), 0);
    const pagado = loans.reduce((s, p) => s + pagadoDe(p), 0);
    const balance = loans.reduce((s, p) => s + saldoDe(p), 0);
    const intereses = loans.reduce((s, p) => s + interesCobradoDe(p), 0);
    const moraAcum = loans.reduce((s, p) => s + prMoraDe(p), 0);
    const promAtraso = vencidos.length ? Math.round(vencidos.reduce((s, p) => s + prDiasVencido(p), 0) / vencidos.length) : 0;
    const puntualidad = prPuntualidad(loans);
    // ── Header cliente (con gauge de puntualidad, mismo dato que abajo en Indicadores) ──
    const dato = (ico, lbl, v) => `<div class="hc-cd"><div class="hc-cdl"><i class="ti ${ico}"></i> ${lbl}</div><div class="hc-cdv">${esc(v || '—')}</div></div>`;
    const puntCol = puntualidad >= 80 ? '#059669' : puntualidad >= 50 ? '#d97706' : '#dc2626';
    const clihead = `<div class="hc-cli">
      <div class="hc-clav">${esc((c.nombre || '?').trim().charAt(0).toUpperCase())}</div>
      <div style="flex:1;min-width:0"><div class="hc-clnm">${esc(c.nombre || 'Sin nombre')}</div><span class="hc-clbadge">Cliente activo</span>
        <div class="hc-cgrid">${dato('ti-id', 'Cédula', c.cedula)}${dato('ti-phone', 'Teléfono', c.telefono)}${dato('ti-mail', 'Correo', c.email)}${dato('ti-calendar', 'Cliente desde', c.created_at ? String(c.created_at).slice(0, 10) : '—')}${dato('ti-clock', 'Última actividad', prUltActividad(loans))}</div>
      </div>
      <div class="hc-hgauge"><div class="ev-gauge hc-gsm" style="--pct:${puntualidad};--gc:${puntCol}"><div class="ev-gaugein"><div class="ev-gnum">${puntualidad}%</div></div></div><div class="hc-hglbl">Puntualidad<br>de pago</div></div>
      </div>`;
    // ── 9 KPI tiles (icono en insignia circular de color) ──
    const kt = (ico, col, lbl, v) => `<div class="hc-k"><div class="hc-kic" style="background:linear-gradient(140deg,${col},${col}cc)"><i class="ti ${ico}"></i></div><div style="min-width:0"><div class="hc-kl">${lbl}</div><div class="hc-kv">${v}</div></div></div>`;
    const kpis = `<div class="hc-kpis">
      ${kt('ti-chart-bar', '#2563eb', 'Total préstamos', total)}${kt('ti-file-dollar', '#0891b2', 'Préstamos activos', activos)}${kt('ti-circle-check', '#059669', 'Préstamos pagados', pagados)}${kt('ti-cash-banknote', '#6d28d9', 'Monto financiado', fmt(financiado))}${kt('ti-wallet', '#059669', 'Total pagado', fmt(pagado))}
      ${kt('ti-clock-dollar', '#d97706', 'Balance pendiente', fmt(balance))}${kt('ti-percentage', '#0891b2', 'Intereses pagados', fmt(intereses))}${kt('ti-alert-triangle', '#dc2626', 'Mora acumulada', fmt(moraAcum))}${kt('ti-calendar-stats', '#d97706', 'Promedio atraso', promAtraso + (promAtraso === 1 ? ' día' : ' días'))}</div>`;
    // ── Tabs ──
    const tabDef = [['resumen', 'ti-layout-dashboard', 'Resumen'], ['prestamos', 'ti-file-dollar', 'Préstamos'], ['pagos', 'ti-cash', 'Pagos'], ['evaluaciones', 'ti-clipboard-check', 'Evaluaciones'], ['gestiones', 'ti-phone-call', 'Gestiones de cobro'], ['documentos', 'ti-files', 'Documentos']];
    const tabs = `<div class="hc-tabs">${tabDef.map(t => `<button type="button" class="hc-tab${_hcTab === t[0] ? ' on' : ''}" onclick="window.nxPrHcTab('${t[0]}')"><i class="ti ${t[1]}"></i> ${t[2]}</button>`).join('')}</div>`;
    // ── Tabla de préstamos (helper) ──
    const loanRows = (lista) => lista.map(p => {
      const info = prEstadoInfo(p), dias = esVencido(p) ? prDiasVencido(p) : 0;
      const col = info.key === 'pagado' ? '#059669' : info.key === 'vencido' ? '#dc2626' : '#2563eb';
      return `<tr>
        <td data-l="# Préstamo"><a class="hc-ref" onclick="document.getElementById('nxPrHc').remove();window.nxPrestamoVer('${p.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">${esc(prRef(p))}</a></td>
        <td data-l="Fecha">${esc(p.fecha_prestamo || '—')}</td><td data-l="Monto" style="text-align:right">${fmt(Number(p.capital || 0))}</td>
        <td data-l="Tasa" style="text-align:right">${Number(p.tasa_interes || 0) > 0 ? p.tasa_interes + '%' : '—'}</td><td data-l="Plazo">${esc(prPlazoTxt(p))}</td>
        <td data-l="Cuota" style="text-align:right">${prCuotaFmt(p)}</td><td data-l="Total pagado" style="text-align:right;color:#059669">${fmt(pagadoDe(p))}</td>
        <td data-l="Balance" style="text-align:right;color:${saldoDe(p) > 0 ? '#d97706' : '#059669'}">${fmt(saldoDe(p))}</td>
        <td data-l="Estado"><span class="hc-est-b" style="color:${col};background:${col}14">${info.label}</span></td>
        <td data-l="Días atraso" style="text-align:center">${dias > 0 ? '<span class="hc-diasb">' + dias + '</span>' : '0'}</td>
        <td data-l="Acciones" style="text-align:center"><div class="nxFP-tAcc" style="justify-content:center">
          <button type="button" title="Ver / cobrar" aria-label="Ver / cobrar" onclick="document.getElementById('nxPrHc').remove();window.nxPrestamoVer('${p.id}')"><i class="ti ti-eye"></i></button>
          <button type="button" title="Contrato" aria-label="Contrato" onclick="window.nxPrestamoContrato('${p.id}')"><i class="ti ti-file-certificate"></i></button>
          <button type="button" title="Documentos${Array.isArray(p.documentos) && p.documentos.length ? ' (' + p.documentos.length + ')' : ''}" aria-label="Documentos" onclick="window.nxPrestamoDocs('${p.id}')"><i class="ti ti-folder"></i></button>
          ${_prSolicitudes.some(s => String(s.prestamo_id) === String(p.id)) ? `<button type="button" title="Expediente firmado" aria-label="Expediente firmado" onclick="window.nxPrestamoExpediente('${p.id}')"><i class="ti ti-file-check"></i></button>` : ''}
          <button type="button" title="Borrar préstamo" aria-label="Borrar préstamo" onclick="document.getElementById('nxPrHc').remove();window.nxPrestamoBorrar('${p.id}')"><i class="ti ti-minus" style="color:#dc2626"></i></button>
        </div></td></tr>`;
    }).join('');
    const loanTable = (lista) => `<div class="hc-tblwrap"><table class="hc-tbl"><thead><tr><th># Préstamo</th><th>Fecha</th><th style="text-align:right">Monto</th><th style="text-align:right">Tasa</th><th>Plazo</th><th style="text-align:right">Cuota</th><th style="text-align:right">Total pagado</th><th style="text-align:right">Balance</th><th>Estado</th><th style="text-align:center">Días</th><th></th></tr></thead><tbody>${lista.length ? loanRows(lista) : '<tr><td colspan="11" class="hc-empty">Sin préstamos.</td></tr>'}</tbody></table></div>`;
    // ── Contenido por pestaña ──
    let mainTab = '';
    if (_hcTab === 'resumen') {
      const tl = prTimelineMeses(loans);
      let comp = '';
      if (tl.length) {
        comp = `<div class="hc-card"><div class="hc-ct">Comportamiento de pago <span class="hc-est">(estimado)</span></div>
          <div class="hc-tlwrap"><div class="hc-tl">${tl.map(x => `<div class="hc-tli"><div class="hc-tlm">${esc(prMesLabel(x.m))}</div><span class="hc-dot hc-${x.c}"></span></div>`).join('')}</div></div>
          <div class="hc-leg"><span class="hc-dot hc-ok"></span>Pagó puntual <span class="hc-dot hc-y"></span>1-5 días <span class="hc-dot hc-o"></span>6-15 días <span class="hc-dot hc-r"></span>Más de 15 <span class="hc-dot hc-g"></span>Sin pago</div></div>`;
      }
      const ult = loans.slice().sort((a, b) => (b.fecha_prestamo || '') < (a.fecha_prestamo || '') ? -1 : 1);
      const first = ult.slice(0, 6);
      const tabla = `<div class="hc-card"><div class="hc-ct">Últimos préstamos</div>${loanTable(first)}${ult.length > 6 ? `<div class="hc-verall" onclick="window.nxPrHcTab('prestamos')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">Ver todos los préstamos (${ult.length}) <i class="ti ti-chevron-down"></i></div>` : ''}</div>`;
      mainTab = comp + tabla;
    } else if (_hcTab === 'prestamos') {
      const ult = loans.slice().sort((a, b) => (b.fecha_prestamo || '') < (a.fecha_prestamo || '') ? -1 : 1);
      mainTab = `<div class="hc-card"><div class="hc-ct">Todos los préstamos (${ult.length})</div>${loanTable(ult)}<div class="hc-note">Estados reales del módulo: Activo / Pagado / Vencido.</div></div>`;
    } else if (_hcTab === 'pagos') {
      const pagos = []; loans.forEach(p => (_pagosByPrestamo[p.id] || []).forEach(pg => pagos.push({ pg, p })));
      pagos.sort((a, b) => (b.pg.fecha || '') < (a.pg.fecha || '') ? -1 : 1);
      const rows = pagos.map(x => `<tr><td data-l="Fecha">${esc(x.pg.fecha || '—')}</td><td data-l="Préstamo"><a class="hc-ref" onclick="document.getElementById('nxPrHc').remove();window.nxPrestamoVer('${x.p.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">${esc(prRef(x.p))}</a></td><td data-l="Monto" style="text-align:right;color:#059669;font-weight:800">${fmt(Number(x.pg.monto || 0))}</td><td data-l="Método">${esc(x.pg.metodo || x.pg.tipo || '—')}</td><td data-l="Registró">${esc(x.pg.created_by_name || '—')}</td></tr>`).join('');
      const totPag = pagos.reduce((s, x) => s + Number(x.pg.monto || 0), 0);
      mainTab = `<div class="hc-card"><div class="hc-ct">Pagos (${pagos.length})</div>${pagos.length ? `<div class="hc-tblwrap"><table class="hc-tbl"><thead><tr><th>Fecha</th><th>Préstamo</th><th style="text-align:right">Monto</th><th>Método</th><th>Registró</th></tr></thead><tbody>${rows}</tbody></table></div><div class="hc-note">Total pagado: ${fmt(totPag)}</div>` : '<div class="hc-empty">Sin pagos registrados.</div>'}</div>`;
    } else if (_hcTab === 'evaluaciones') {
      const evals = loans.filter(p => /Evaluaci[oó]n:\s*score/i.test(p.notas || '')).map(p => ({ p, linea: (String(p.notas || '').split('\n').find(l => /Evaluaci[oó]n:\s*score/i.test(l)) || '').trim() }));
      mainTab = `<div class="hc-card"><div class="hc-ct">Evaluaciones</div>${evals.length ? evals.map(e => `<div class="hc-evrow"><a class="hc-ref" onclick="document.getElementById('nxPrHc').remove();window.nxPrestamoVer('${e.p.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">${esc(prRef(e.p))}</a> · ${esc(e.p.fecha_prestamo || '')} — <span style="color:#4f46e5">${esc(e.linea)}</span></div>`).join('') : '<div class="hc-empty">Aún no hay evaluaciones guardadas. Las evaluaciones que hagas desde la pantalla "Evaluación" quedan como nota en el préstamo y aparecen aquí.</div>'}</div>`;
    } else if (_hcTab === 'gestiones') {
      mainTab = `<div class="hc-card"><div class="hc-ct">Gestiones de cobro</div><div class="hc-empty">Este módulo aún no registra gestiones de cobro (llamadas, promesas de pago, visitas). Es una función que se puede agregar si la necesitas.</div></div>`;
    } else if (_hcTab === 'documentos') {
      // Real (Storage ya existe — ver v49.40): agrupa los documentos de CADA préstamo del
      // cliente, reusando window.nxPrestamoDocs(id) para administrar (sin duplicar subida/
      // borrado/URL firmada — spec ChatGPT "mover documentos a la ficha del cliente").
      const docBlock = loans.map(p => {
        const info = prEstadoInfo(p), col = info.key === 'pagado' ? '#059669' : info.key === 'vencido' ? '#dc2626' : '#2563eb';
        const docs = Array.isArray(p.documentos) ? p.documentos : [];
        const irADocs = `document.getElementById('nxPrHc').remove();window.nxPrestamoDocs('${p.id}')`;
        const nombres = docs.slice(0, 3).map(d => { const t = DOC_TIPOS.find(t => t.k === d.tipo) || {}; return esc(d.nombre || t.lbl || 'Documento'); });
        const lista = docs.length
          ? `<div>${nombres.map(n => `<div style="font-size:11.5px;color:#475569;padding:3px 0"><i class="ti ti-circle-check" style="color:#059669"></i> ${n}</div>`).join('')}${docs.length > 3 ? `<div class="hc-verall" style="text-align:left;padding:4px 0" onclick="${irADocs}" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">+${docs.length - 3} más — Ver todos</div>` : ''}</div>`
          : `<div style="font-size:11px;color:#94a3b8;padding:2px 0">Sin documentos todavía.</div>`;
        return `<div class="hc-card" style="margin-bottom:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:2px">
            <a class="hc-ref" onclick="document.getElementById('nxPrHc').remove();window.nxPrestamoVer('${p.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}" role="button">${esc(prRef(p))}</a>
            <span class="hc-est-b" style="color:${col};background:${col}14">${info.label}</span>
          </div>
          <div style="font-size:10.5px;color:#94a3b8;margin-bottom:8px">${esc(p.fecha_prestamo || '—')} · Saldo ${fmt(saldoDe(p))} · ${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'}</div>
          ${lista}
          <button class="btn bsm bghost" type="button" style="width:100%;margin-top:8px" onclick="${irADocs}"><i class="ti ti-folder" style="color:#6d28d9"></i> Administrar documentos</button>
        </div>`;
      }).join('');
      mainTab = loans.length ? docBlock : '<div class="hc-card"><div class="hc-ct">Documentos</div><div class="hc-empty">Este cliente todavía no tiene préstamos.</div></div>';
    }
    // ── Panel derecho: Recomendación ──
    const caps = loans.map(p => Number(p.capital || 0)).filter(x => x > 0), maxCap = caps.length ? Math.max.apply(null, caps) : 0;
    const montoRec = sc.s == null ? 0 : sc.s >= 65 ? Math.round(maxCap * 1.2 / 1000) * 1000 : sc.s >= 45 ? maxCap : Math.round(maxCap * 0.7 / 1000) * 1000;
    const tasas = loans.map(p => Number(p.tasa_interes || 0)).filter(x => x > 0), tasaSug = tasas.length ? (Math.round((tasas.reduce((a, b) => a + b, 0) / tasas.length) * 100) / 100) + '%' : '—';
    const plazos = loans.filter(p => Number(p.num_cuotas) > 0).map(p => p.num_cuotas), plazoSug = plazos.length ? Math.max.apply(null, plazos) + ' meses' : '—';
    const recTitulo = sc.s == null ? 'Sin historial suficiente' : sc.s >= 65 ? 'Cliente confiable' : sc.s >= 45 ? 'Riesgo medio' : 'Riesgo alto';
    const recSub = sc.s == null ? 'Aún no tiene préstamos para evaluar.' : sc.s >= 65 ? ('Historial mayormente positivo. Ha completado ' + pagados + ' préstamo' + (pagados === 1 ? '' : 's') + '.') : sc.s >= 45 ? 'Historial mixto — conviene revisar antes de aprobar.' : 'Historial con atrasos — evaluar con cuidado.';
    const rec = `<div class="hc-pcard"><div class="hc-pt">Recomendación del sistema</div>
      <div class="hc-rechd"><div class="hc-recico" style="background:${sc.col}14;color:${sc.col}"><i class="ti ${sc.s >= 65 ? 'ti-shield-check' : sc.s >= 45 ? 'ti-alert-triangle' : 'ti-shield-x'}"></i></div><div><div class="hc-rectit" style="color:${sc.col}">${recTitulo}</div></div></div>
      <div class="hc-recsub">${recSub}</div>
      <div class="hc-prow"><span>Recomendación de monto</span><b style="color:#059669">${montoRec > 0 ? fmt(montoRec) : '—'}</b></div>
      <div class="hc-prow"><span>Tasa sugerida</span><b>${tasaSug}</b></div>
      <div class="hc-prow"><span>Plazo máximo sugerido</span><b>${plazoSug}</b></div>
      <div class="hc-prow" style="border:0"><span>Nivel de riesgo: <b style="color:${sc.col}">${sc.riesgo}</b></span><span class="hc-est-b" style="color:${sc.col};background:${sc.col}14">${sc.estado}</span></div></div>`;
    // ── Panel: Indicadores del cliente ──
    const ind = (ico, lbl, v, col) => `<div class="hc-prow"><span><i class="ti ${ico}" style="color:#94a3b8"></i> ${lbl}</span><b${col ? ` style="color:${col}"` : ''}>${v}</b></div>`;
    const indicadores = `<div class="hc-pcard"><div class="hc-pt">Indicadores del cliente</div>
      ${ind('ti-thumb-up', 'Puntualidad de pago', puntualidad + '%', puntualidad >= 80 ? '#059669' : '#d97706')}
      ${ind('ti-calendar-stats', 'Días promedio de atraso', promAtraso + (promAtraso === 1 ? ' día' : ' días'))}
      ${ind('ti-circle-check', 'Préstamos completados', pagados)}
      ${ind('ti-alert-triangle', 'Préstamos en mora', vencidos.length, vencidos.length ? '#dc2626' : '')}
      ${ind('ti-notes-off', 'Promesas incumplidas', 0)}
      ${ind('ti-shield', 'Nivel de riesgo', sc.riesgo, sc.col)}
      <div class="hc-scorerow"><span><i class="ti ti-gauge" style="color:#94a3b8"></i> Score interno</span>
        <div class="hc-scmini"><div class="ev-gauge hc-gsm" style="--pct:${sc.s == null ? 0 : sc.s};--gc:${sc.col}"><div class="ev-gaugein"><div class="ev-gnum">${sc.s == null ? '—' : sc.mil}</div><div class="ev-gsub">/1000</div></div></div><div class="hc-scclas" style="color:${sc.col}">${sc.clas}</div></div></div></div>`;
    // ── Panel: Alertas importantes (solo reales) ──
    const alertas = [];
    if (vencidos.length) alertas.push({ ico: 'ti-alert-triangle', col: '#dc2626', t: vencidos.length + ' préstamo' + (vencidos.length === 1 ? '' : 's') + ' con atraso activo' });
    if (moraAcum > 0) alertas.push({ ico: 'ti-cash-off', col: '#d97706', t: 'Mora acumulada: ' + fmt(moraAcum) });
    if (balance > 0 && !vencidos.length) alertas.push({ ico: 'ti-clock-dollar', col: '#0891b2', t: 'Balance pendiente por cobrar: ' + fmt(balance) });
    const alertPanel = `<div class="hc-pcard"><div class="hc-pt">Alertas importantes</div>${alertas.length ? alertas.map(a => `<div class="hc-alrow"><i class="ti ${a.ico}" style="color:${a.col}"></i> ${esc(a.t)}</div>`).join('') : '<div class="hc-empty" style="padding:14px">Sin alertas por ahora. Todo al día.</div>'}<div class="hc-note">Solo se muestran alertas con datos reales del módulo. (Evaluación pendiente, documento vencido o garantía pendiente no existen aún aquí — no se inventan.)</div></div>`;

    body.innerHTML = clihead + kpis + `<div class="hc-2col"><div class="hc-main">${tabs}${mainTab}</div><aside class="hc-side">${rec}${indicadores}${alertPanel}</aside></div>`;
  }

  window.nxPrestamoGuardar = async function (id) {
    const nom = (val('prNom') || '').trim();
    if (!nom) { toast('err', 'Falta el nombre'); return; }
    const modo = _modoForm || 'libre';
    const fecha = val('prFecha') || hoy();
    const capital = parseMoney(val('prCap'));
    let total, tasaStore, plazoStore = null, cuotaFijaStore = null;
    if (modo === 'credito') {
      const tasa = parsePct(val('prTasa')), plazo = parseInt(val('prPlazo'), 10) || 0;
      if (capital <= 0) { toast('err', 'Pon el capital prestado'); return; }
      if (tasa <= 0) { toast('err', 'Pon la tasa de interés mensual'); return; }
      total = capital; tasaStore = tasa; plazoStore = plazo || null;
    } else {
      const c = calcPrestamo();
      if (c.computa) { total = c.total; tasaStore = c.tasa; cuotaFijaStore = (c.cuotaFija && c.cuotaFija > 0) ? c.cuotaFija : null; }
      else { total = parseMoney(val('prTot')); tasaStore = 0; }
      if (total <= 0) { toast('err', c.computa ? 'Revisa el capital, las cuotas y la tasa' : 'Pon el total a devolver'); return; }
    }
    const datos = {
      nombre: nom,
      cedula: (val('prCed') || '').trim(),
      telefono: (val('prTel') || '').trim(),
      cliente_id: val('prCliId') || null,
      capital: capital,
      total_devolver: total,
      tasa_interes: tasaStore,
      plazo_meses: plazoStore,
      fecha_prestamo: fecha,
      modo: modo,
      num_cuotas: modo === 'cuotas' ? (parseInt(val('prNumCuotas'), 10) || null) : null,
      frecuencia: modo === 'cuotas' ? (val('prFrec') || 'mensual') : null,
      metodo_interes: modo === 'cuotas' ? (val('prMetodo') || 'plano') : 'saldo',
      cuota_fija: modo === 'cuotas' ? cuotaFijaStore : null,
      notas: (val('prNotas') || '').trim()
    };
    try {
      if (id) { await getAPI().patch('prestamos', 'id=eq.' + id, datos); }
      else { datos.created_by_name = nomAdmin(); await getAPI().post('prestamos', datos); }
      cerrarModal('nxPrModal');
      toast('ok', id ? 'Préstamo actualizado' : 'Préstamo creado', nom);
      await cargarPrestamos();
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al guardar', String(e && e.message || e)); }
  };

  // ── Detalle + pagos ──
  // Pantalla de cobro: solo lo que hace falta para cobrar (WhatsApp, Estado de
  // cuenta, Imprimir, Editar). Contrato/Documentos/Expediente/Borrar viven en la
  // ficha del cliente (hcRender → loanRows, pestaña Préstamos) — pedido del dueño
  // para no mezclar tareas de cobranza diaria con gestión del expediente.
  window.nxPrestamoVer = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    cerrarModal('nxPrModal');
    _tipoPago = 'capital';
    _prCuotasPend = []; _prMoraOpen = 0;
    const pagos = (_pagosByPrestamo[id] || []).slice().sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const pag = pagadoDe(p), saldo = saldoDe(p), est = estadoDe(p);
    const esCredito = p.modo === 'credito';
    const cc = esCredito ? creditoCalc(p) : null;
    // Capital pagado / próxima cuota / mora — derivados de datos reales (nunca inventados). Cada
    // modo tiene su propia forma real de calcularlo: crédito ya lo separa (creditoCalc), cuotas con
    // interés lo saca de la tabla de amortización real, y cuotas/libre sin interés no tienen forma
    // de separar capital de interés (no hay campo para eso) así que ahí "capital pagado" = pagado.
    let capPagado = pag, proximaFecha = '', proximaMonto = 0, moraActual = 0, interesTotalMostrado = 0;
    let scheduleHTML = '';
    // Título del cronograma + botón para compartir/imprimir la tabla (igual en los 3 modos)
    const schedTit = txt => `<div style="display:flex;align-items:center;gap:8px;margin:12px 0 4px"><span style="font-size:11px;font-weight:800;color:#475569;min-width:0">${txt}</span><button class="btn bsm bghost" type="button" style="flex:none;margin-left:auto" onclick="window.nxPrestamoAmortizacion('${id}')" title="Compartir / imprimir la tabla" aria-label="Compartir tabla de amortización"><i class="ti ti-share" style="color:#6d28d9"></i></button></div>`;
    if (esCredito) {
      capPagado = cc.pagCap; interesTotalMostrado = cc.interesAcum;
      const rows = cc.meses.map(m => `<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">#${m.n}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;color:#475569;white-space:nowrap">${m.fecha}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt(m.saldo)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ea580c;font-weight:700">${fmt(m.interes)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${m.encurso ? '<span style="color:#475569;font-size:9px">en curso</span>' : '<span style="color:#16a34a;font-weight:800">✓</span>'}</td></tr>`).join('');
      scheduleHTML = `${schedTit(`INTERÉS POR MES · ${p.tasa_interes}% sobre el saldo de capital`)}
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #e2e8f0;border-radius:10px">
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;min-width:340px;background:#fff">
            <thead><tr style="background:#f8fafc;color:#475569;font-size:9.5px"><th style="padding:6px;text-align:left">Mes</th><th style="padding:6px;text-align:left">Desde</th><th style="padding:6px;text-align:right">Capital base</th><th style="padding:6px;text-align:right">Interés</th><th style="padding:6px;text-align:center">Estado</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0 && Number(p.tasa_interes || 0) > 0) {
      const met = p.metodo_interes || 'saldo';
      const a = amortizar(Number(p.capital || 0), Number(p.tasa_interes), p.num_cuotas, p.fecha_prestamo, p.frecuencia, met, Number(p.cuota_fija) || 0);
      interesTotalMostrado = a.interesTotal;
      const moraDelPrestamo = prMoraDe(p); let moraAsignada = false;
      let acum = 0, capAcum = 0;
      const rows = a.rows.map(r => {
        acum += r.cuota;
        const cub = pag >= acum - 0.5;
        if (!cub) _prCuotasPend.push({ n: r.n, monto: r.cuota });
        if (cub) capAcum += r.capital;
        else if (!moraAsignada) { proximaFecha = r.fecha; proximaMonto = r.cuota; moraActual = moraDelPrestamo; moraAsignada = true; }
        const moraFila = (!cub && moraAsignada && r.fecha === proximaFecha) ? moraDelPrestamo : 0;
        return `<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">#${r.n}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;color:#475569;white-space:nowrap">${r.fecha}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">${fmt(r.cuota)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ea580c">${fmt(r.interes)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;color:#6d28d9">${fmt(r.capital)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right${moraFila > 0 ? ';color:#dc2626;font-weight:700' : ''}">${moraFila > 0 ? fmt(moraFila) : '—'}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt(r.saldo)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${cub ? '<span style="color:#16a34a;font-weight:800">✓</span>' : `<input type="checkbox" class="prCuotaChk" data-n="${r.n}" data-monto="${r.cuota}" onclick="window.nxPrCuotaCheck(${r.n})" aria-label="Marcar cuota ${r.n} para pagar" style="width:15px;height:15px;cursor:pointer;accent-color:#6d28d9">`}</td></tr>`;
      }).join('');
      _prMoraOpen = moraDelPrestamo;
      capPagado = capAcum;
      scheduleHTML = `${schedTit(`TABLA DE AMORTIZACIÓN · ${p.tasa_interes}% mensual · ${met === 'plano' ? 'interés plano' : 'saldo insoluto'} · cuota ${fmt(a.cuota)} · interés total ${fmt(a.interesTotal)}`)}
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #e2e8f0;border-radius:10px">
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;min-width:480px;background:#fff">
            <thead><tr style="background:#f8fafc;color:#475569;font-size:9.5px"><th style="padding:6px;text-align:left">#</th><th style="padding:6px;text-align:left">Fecha</th><th style="padding:6px;text-align:right">Cuota</th><th style="padding:6px;text-align:right">Interés</th><th style="padding:6px;text-align:right">Capital</th><th style="padding:6px;text-align:right">Mora</th><th style="padding:6px;text-align:right">Saldo</th><th style="padding:6px;text-align:center">Pag.</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0) {
      const cuota = Number(p.total_devolver || 0) / p.num_cuotas;
      let acum = 0; let asignada = false; const rows = [];
      for (let i = 0; i < p.num_cuotas; i++) {
        const due = fechaCuota(p.fecha_prestamo, p.frecuencia, i + 1);
        acum += cuota;
        const cubierta = pag >= acum - 0.5;
        if (!cubierta) _prCuotasPend.push({ n: i + 1, monto: cuota });
        if (!cubierta && !asignada) { proximaFecha = due; proximaMonto = cuota; asignada = true; }
        rows.push(`<tr><td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #f1f5f9">#${i + 1}</td><td style="padding:6px 10px;font-size:11px;color:#475569;border-bottom:1px solid #f1f5f9">${due}</td><td style="padding:6px 10px;font-size:11px;text-align:right;font-weight:700;border-bottom:1px solid #f1f5f9">${fmt(cuota)}</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #f1f5f9">${cubierta ? '<span style="color:#16a34a;font-weight:800;font-size:10px">PAGADA</span>' : `<label style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;justify-content:flex-end"><input type="checkbox" class="prCuotaChk" data-n="${i + 1}" data-monto="${cuota}" onclick="window.nxPrCuotaCheck(${i + 1})" aria-label="Marcar cuota ${i + 1} para pagar" style="width:15px;height:15px;cursor:pointer;accent-color:#6d28d9"><span style="color:#dc2626;font-weight:800;font-size:10px">PENDIENTE</span></label>`}</td></tr>`);
      }
      moraActual = prMoraDe(p);
      _prMoraOpen = moraActual;
      scheduleHTML = `${schedTit(`CALENDARIO DE CUOTAS (${fmt(cuota)} c/u)`)}<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${rows.join('')}</table>`;
    } else if (p.modo === 'libre' && Number(p.tasa_interes || 0) > 0) {
      interesTotalMostrado = Number(p.total_devolver || 0) - Number(p.capital || 0);
    }
    const pctCapital = Number(p.capital || 0) > 0 ? Math.max(0, Math.min(100, Math.round((capPagado / Number(p.capital || 0)) * 100))) : 0;
    const kpiCard = (ico, lbl, val, sub, col) => `<div class="nxFP-kpi"><div class="nxFP-kpiTop"><div class="nxFP-kpiIco" style="background:${col}1a;color:${col}"><i class="ti ${ico}"></i></div><div class="nxFP-kpiLbl">${lbl}</div></div><div class="nxFP-kpiVal">${val}</div>${sub ? `<div class="nxFP-kpiSub">${sub}</div>` : ''}</div>`;
    const kpisHTML = [
      kpiCard('ti-cash-banknote', 'MONTO PRESTADO', fmt(p.capital), esc(p.fecha_prestamo || ''), '#4f46e5'),
      kpiCard('ti-hourglass', 'BALANCE PENDIENTE', fmt(esCredito ? cc.totalDebe : saldo), est === 'pagado' ? 'Saldado' : (esCredito ? 'Capital + interés' : (saldo > 0 ? 'Pendiente por cobrar' : 'Saldado')), (esCredito ? cc.totalDebe : saldo) > 0 ? '#dc2626' : '#16a34a'),
      kpiCard('ti-circle-check', esCredito ? 'PAGADO A CAPITAL' : 'CAPITAL PAGADO', fmt(capPagado), `${pctCapital}% del capital`, '#16a34a'),
      proximaFecha ? kpiCard('ti-calendar-due', 'PRÓXIMA CUOTA', proximaFecha, fmt(proximaMonto) + (moraActual > 0 ? ' + ' + fmt(moraActual) + ' mora' : ''), '#d97706')
        : (esCredito && cc.fechaLimite ? kpiCard('ti-calendar-due', 'FECHA LÍMITE CAPITAL', cc.fechaLimite, cc.diasRestan != null ? (cc.diasRestan < 0 ? Math.abs(cc.diasRestan) + ' días de atraso' : 'Faltan ' + cc.diasRestan + ' días') : '', cc.diasRestan != null && cc.diasRestan < 0 ? '#dc2626' : '#0891b2')
          : kpiCard('ti-wallet', 'MODALIDAD', p.modo === 'libre' ? 'Abonos libres' : 'Línea de crédito', 'Sin fecha fija de cuota', '#64748b')),
      kpiCard('ti-report-money', 'TOTAL DEL PRÉSTAMO', fmt(esCredito ? cc.cap : (p.total_devolver || p.capital)), interesTotalMostrado > 0 ? 'Interés: ' + fmt(interesTotalMostrado) : 'Sin interés', '#0f172a')
    ].join('');
    const pagosHTML = pagos.length === 0
      ? '<div style="color:#475569;font-size:11px;padding:10px">Sin pagos aún</div>'
      : pagos.map(x => { const tb = x.tipo === 'capital' ? ' <span style="color:#6d28d9;font-weight:800;font-size:8.5px;background:#eff6ff;padding:1px 5px;border-radius:6px">CAPITAL</span>' : x.tipo === 'interes' ? ' <span style="color:#ea580c;font-weight:800;font-size:8.5px;background:#fff7ed;padding:1px 5px;border-radius:6px">INTERÉS</span>' : ''; return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><div><b style="color:#059669">${fmt(x.monto)}</b>${tb} <span style="color:#475569">${(x.fecha || '').slice(0, 10)}${x.metodo ? ' · ' + esc(x.metodo) : ''}</span>${x.nota ? `<div style="color:#475569;font-size:10px">${esc(x.nota)}</div>` : ''}</div><div style="display:flex;gap:4px;flex:none"><button class="btn bsm bghost" type="button" onclick="window.nxPrestamoComprobante('${x.id}','${id}')" title="Comprobante de pago" aria-label="Comprobante de pago"><i class="ti ti-receipt" style="color:#6d28d9"></i></button><button class="btn bsm bghost" type="button" onclick="window.nxPrestamoBorrarPago('${x.id}','${id}')" title="Eliminar pago" aria-label="Eliminar pago"><i class="ti ti-minus" style="color:#dc2626"></i></button></div></div>`; }).join('');
    // Línea de tiempo — SOLO eventos reales (creado + cada pago). No se inventan pasos de
    // "aprobado/contrato firmado/desembolso": este módulo crea el préstamo directo, sin ese flujo.
    const tlEventos = [{ f: p.created_at || p.fecha_prestamo, tit: 'Préstamo creado', sub: fmt(p.capital) + ' · ' + (p.nombre || '') }]
      .concat(pagos.map(x => ({ f: x.fecha, tit: 'Pago registrado', sub: fmt(x.monto) + (x.metodo ? ' · ' + x.metodo : '') })));
    if (est === 'pagado' && pagos.length) tlEventos.push({ f: pagos[pagos.length - 1].fecha, tit: 'Préstamo saldado', sub: 'Balance en RD$0' });
    const tlHTML = tlEventos.map(ev => `<div class="nxPrTlItem"><div class="nxPrTlDot"><i class="ti ti-check" style="font-size:11px"></i></div><div class="nxPrTlTxt"><b>${esc(ev.tit)}</b><span>${esc(String(ev.f || '').slice(0, 10))} · ${esc(ev.sub)}</span></div></div>`).join('');
    const cliCard = `<div class="prCard">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:44px;height:44px;border-radius:12px;background:${prIniciales(p.nombre).color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;flex:0 0 auto">${esc(prIniciales(p.nombre).ini)}</div>
        <div style="min-width:0;flex:1"><div style="font-size:14px;font-weight:800;color:#1e1b4b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.nombre || '')}</div><div style="font-size:10.5px;font-weight:800;color:${est === 'pagado' ? '#16a34a' : (est === 'vencido' ? '#dc2626' : '#16a34a')}">${est === 'pagado' ? '● Saldado' : (esVencido(p) ? '● En mora' : '● Al día')}</div></div>
        ${p.cliente_id ? `<button class="btn bsm bghost" type="button" style="flex:none" onclick="document.getElementById('nxPrModal').remove();window.nxPrHistCredito('${p.cliente_id}')" title="Ver ficha del cliente (contrato, documentos, historial)"><i class="ti ti-id-badge-2" style="color:#6d28d9"></i> Ficha</button>` : ''}
      </div>
      <div style="font-size:11.5px;color:#475569;display:flex;flex-direction:column;gap:4px">
        ${p.telefono ? `<div><i class="ti ti-phone" style="color:#94a3b8;width:16px;display:inline-block"></i> ${esc(p.telefono)}</div>` : ''}
        ${p.cedula ? `<div><i class="ti ti-id" style="color:#94a3b8;width:16px;display:inline-block"></i> ${esc(p.cedula)}</div>` : ''}
      </div>
    </div>`;
    const detCard = `<div class="prCard">
      <div style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin-bottom:8px">Detalles del préstamo</div>
      <div style="font-size:12px;color:#334155;display:flex;flex-direction:column;gap:7px">
        <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Monto otorgado</span><b>${fmt(p.capital)}</b></div>
        <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Interés</span><b>${p.tasa_interes ? p.tasa_interes + '%/mes' : 'Sin interés'}</b></div>
        ${p.modo === 'cuotas' ? `<div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Plazo</span><b>${p.num_cuotas} cuotas</b></div><div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Cuota ${esc(p.frecuencia || '')}</span><b>${fmt(proximaMonto || (Number(p.total_devolver || 0) / (p.num_cuotas || 1)))}</b></div>` : ''}
        ${esCredito && p.plazo_meses ? `<div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Plazo del capital</span><b>${p.plazo_meses} meses</b></div>` : ''}
        <div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Fecha de inicio</span><b>${esc(p.fecha_prestamo || '')}</b></div>
      </div>
    </div>`;
    const progCard = `<div class="prCard">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px"><span style="font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px">Progreso del préstamo</span><b style="color:#6d28d9;font-size:13px">${pctCapital}%</b></div>
      <div class="nxPrBar"><div style="width:${pctCapital}%"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-top:4px"><span>Capital pagado: <b style="color:#16a34a">${fmt(capPagado)}</b></span><span>Faltante: <b style="color:#dc2626">${fmt(Math.max(0, Number(p.capital || 0) - capPagado))}</b></span></div>
    </div>`;
    const ov = document.createElement('div'); ov.id = 'nxPrModal'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm nxPrDetWide" style="max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-user"></i> ${esc(p.nombre || '')}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrModal').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">${prRef(p)} · Otorgado ${esc(p.fecha_prestamo || '')}</div>
          <div class="nxFP-kpis" style="margin-bottom:12px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${kpisHTML}</div>
          ${cliCard}
          ${detCard}
          ${progCard}
          ${p.notas ? `<div style="font-size:11px;color:#475569;margin-bottom:10px;background:#f8fafc;border-radius:8px;padding:7px 9px">📝 ${esc(p.notas)}</div>` : ''}
          ${scheduleHTML}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 4px">PAGOS (${pagos.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:12px">${pagosHTML}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 8px">LÍNEA DE TIEMPO</div>
          <div class="nxPrTl">${tlHTML}</div>
        </div>
        <div style="border-top:1px solid #f1f5f9;padding-top:10px;margin-top:10px">
          ${est !== 'pagado' ? `${esCredito ? `<div style="display:flex;gap:6px;margin-bottom:6px"><button id="prTipoCap" class="btn bc1" type="button" onclick="window.nxPrTipoPago('capital')" style="flex:1">A capital</button><button id="prTipoInt" class="btn" type="button" onclick="window.nxPrTipoPago('interes')" style="flex:1">A interés</button></div>` : ''}
          ${_prCuotasPend.length ? '<div id="prPagoCuotasInfo" style="font-size:11px;color:#6d28d9;font-weight:700;margin-bottom:6px">Marca &#9744; las cuotas en la tabla y el monto se calcula solo.</div>' : ''}
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <input id="prPagoMonto" data-nx-money inputmode="numeric" placeholder="Monto a pagar" style="flex:1;min-width:0;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none">
            <input id="prPagoFecha" type="date" value="${hoy()}" style="flex:0 0 auto;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none">
          </div>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <select id="prPagoMetodo" style="flex:1;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff"><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Cheque">Cheque</option><option value="Otro">Otro</option></select>
            <input id="prPagoNota" class="no-upper" placeholder="Referencia / nota (opcional)" style="flex:1;min-width:0;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none">
          </div>
          <button class="btn bc1 nxPrPagar" type="button" onclick="window.nxPrestamoPagar('${id}')"><i class="ti ti-plus"></i> Registrar pago</button>` : '<div style="text-align:center;color:#16a34a;font-weight:800;font-size:12px;margin-bottom:8px">✓ Préstamo saldado</div>'}
          <div class="nxPrActs">
            ${waNumero(p.telefono) ? `<button class="nxPrAcc wa" type="button" onclick="window.nxPrestamoWA('${id}')"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
            <button class="nxPrAcc" type="button" onclick="window.nxPrestamoEstadoCuenta('${id}')"><i class="ti ti-file-text"></i> Estado</button>
            <button class="nxPrAcc" type="button" onclick="window.nxPrestamoAmortizacion('${id}')"><i class="ti ti-printer"></i> Imprimir</button>
            <button class="nxPrAcc" type="button" onclick="window.nxPrestamoEditar('${id}')"><i class="ti ti-edit"></i> Editar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(ov); } catch (e) {}
  };

  window.nxPrestamoPagar = async function (id) {
    const monto = parseMoney(document.getElementById('prPagoMonto') && document.getElementById('prPagoMonto').value);
    if (monto <= 0) { toast('err', 'Pon el monto del pago'); return; }
    const pr = _prestamos.find(x => String(x.id) === String(id));
    const body = {
      prestamo_id: id, monto: monto,
      fecha: val('prPagoFecha') || hoy(),
      metodo: val('prPagoMetodo') || 'Efectivo',
      nota: (val('prPagoNota') || '').trim() || null,
      created_by_name: nomAdmin()
    };
    if (pr && pr.modo === 'credito') body.tipo = _tipoPago || 'capital';
    try {
      const rows = await getAPI().post('prestamo_pagos', body);
      const pagoId = rows && rows[0] && rows[0].id;
      toast('ok', 'Pago registrado', fmt(monto) + (body.tipo ? ' · ' + (body.tipo === 'capital' ? 'a capital' : 'a interés') : ''));
      await cargarPrestamos();
      const p = _prestamos.find(x => String(x.id) === String(id));
      if (p && estadoDe(p) === 'pagado' && p.estado !== 'pagado') { try { await getAPI().patch('prestamos', 'id=eq.' + id, { estado: 'pagado' }); p.estado = 'pagado'; } catch (e) {} }
      window.nxPrestamoVer(id);
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
      if (pagoId && p && window.nxReciboAnimado) {
        const cli = (p.cliente_id && _prClientes.find(x => String(x.id) === String(p.cliente_id))) || null;
        window.nxReciboAnimado({
          empresa: (typeof CFG !== 'undefined' && CFG.empNom) || 'NEXUS PRO', titulo: 'Pago registrado', cliente: cli ? cli.nombre : '', monto: monto,
          filas: [{ label: 'Método', valor: body.metodo }, { label: 'Préstamo', valor: 'PR-' + String(id).slice(-6).toUpperCase() }],
          folio: 'PAG-' + String(pagoId).slice(-8).toUpperCase()
        }, [{ label: 'Ver recibo / compartir', icon: 'ti-receipt', onclick: () => window.nxPrestamoComprobante(pagoId, id) }]);
      }
    } catch (e) { toast('err', 'Error al registrar el pago', String(e && e.message || e)); }
  };

  // Marcar cuotas a pagar en el detalle del préstamo (tabla de amortización): selección
  // consecutiva desde la más vieja (calza con cómo el pago se aplica en orden). Suma las
  // cuotas marcadas + la mora del préstamo si aplica, y llena "Monto a pagar" solo.
  window.nxPrCuotaCheck = function (n) {
    const chks = Array.prototype.slice.call(document.querySelectorAll('.prCuotaChk')).sort((a, b) => Number(a.dataset.n) - Number(b.dataset.n));
    if (!chks.length) return;
    const clicked = chks.filter(c => Number(c.dataset.n) === n)[0];
    const target = (clicked && clicked.checked) ? n : n - 1;
    let total = 0, count = 0;
    chks.forEach(c => { const on = Number(c.dataset.n) <= target; c.checked = on; if (on) { total += Number(c.dataset.monto || 0); count++; } });
    const mora = count > 0 ? Number(_prMoraOpen || 0) : 0;
    const grand = Math.round(total + mora);
    const inp = document.getElementById('prPagoMonto');
    if (inp) inp.value = count > 0 ? ((window.nxMoney && window.nxMoney.format) ? window.nxMoney.format(String(grand)) : String(grand)) : '';
    const info = document.getElementById('prPagoCuotasInfo');
    if (info) info.innerHTML = count > 0 ? ('<b>' + count + ' cuota' + (count > 1 ? 's' : '') + '</b> seleccionada' + (count > 1 ? 's' : '') + ' \u00b7 ' + fmt(total) + (mora > 0 ? ' + ' + fmt(mora) + ' mora' : '')) : 'Marca &#9744; las cuotas en la tabla y el monto se calcula solo.';
  };

  window.nxPrestamoBorrarPago = async function (pagoId, prestamoId) {
    try {
      const ok = (typeof window.swalConfirm === 'function') ? await window.swalConfirm('💸', '¿Eliminar este pago?', 'Se restará del total pagado', { ok: 'Eliminar', color: '#ef4444' }) : window.confirm('¿Eliminar este pago?');
      if (!ok) return;
      await getAPI().del('prestamo_pagos', 'id=eq.' + pagoId);
      await cargarPrestamos();
      window.nxPrestamoVer(prestamoId);
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al eliminar el pago'); }
  };

  // ── COMPROBANTE DE PAGO (recibo imprimible / PDF / WhatsApp / correo) ──
  // Genera el recibo de UN pago del préstamo. 100% datos reales de prestamo_pagos/
  // prestamos/prestamo_clientes. Omite a propósito lo que el módulo NO guarda
  // (sucursal, caja, desglose capital/interés/mora por pago, voucher, QR de
  // verificación, contador de reimpresiones) — ver notas en CLAUDE.md.
  window.nxPrestamoComprobante = function (pagoId, prestamoId) {
    const p = _prestamos.find(x => String(x.id) === String(prestamoId)); if (!p) return;
    const x = (_pagosByPrestamo[prestamoId] || []).find(pg => String(pg.id) === String(pagoId)); if (!x) { toast('err', 'No se encontró el pago'); return; }
    const cli = (p.cliente_id && _prClientes.find(c => String(c.id) === String(p.cliente_id))) || null;
    const nombre = p.nombre || (cli && cli.nombre) || 'Cliente';
    const cedula = p.cedula || (cli && cli.cedula) || '';
    const tel = p.telefono || (cli && cli.telefono) || '';
    const direccion = (cli && cli.direccion) || '';
    const email = (cli && cli.email) || '';
    const monto = Number(x.monto || 0);
    const balAct = saldoDe(p);              // saldo al día de hoy
    const balAnt = balAct + monto;          // saldo antes de este pago (= actual + este pago)
    const rec = 'REC-' + (String(x.id || '').replace(/-/g, '').slice(0, 6).toUpperCase() || '------');
    const fechaHora = (function () { try { const d = new Date(x.created_at || (x.fecha + 'T12:00:00')); if (isNaN(d)) return (x.fecha || ''); const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'), yy = d.getFullYear(); let h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0'), ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return dd + '/' + mm + '/' + yy + ' ' + h + ':' + m + ' ' + ap; } catch (e) { return (x.fecha || ''); } })();
    const letras = (function () { const w = numLetras(Math.floor(monto)); const s = w.charAt(0) + w.slice(1).toLowerCase(); const c = Math.round((monto - Math.floor(monto)) * 100); return s + ' pesos dominicanos' + (c ? ' con ' + c + '/100' : ''); })();
    const aplicado = p.modo === 'credito' ? (x.tipo === 'capital' ? 'Abono a capital' : x.tipo === 'interes' ? 'Pago de interés' : 'Abono') : 'Abono al préstamo';
    const info = prEstadoInfo(p);
    const prox = prProximoPago(p);
    const av = prIniciales(nombre);
    const metodo = String(x.metodo || 'Efectivo');
    const METS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Pago móvil', 'Cheque'];
    const metActivo = METS.find(m => m.toLowerCase() === metodo.toLowerCase());
    const metTiles = METS.map(m => { const on = m === metActivo; return `<div class="met${on ? ' on' : ''}">${m}${on ? ' ✓' : ''}</div>`; }).join('') + (!metActivo ? `<div class="met on">${esc(metodo)} ✓</div>` : '');
    const empNom = empresaNom();
    const estCol = info.key === 'pagado' ? '#16a34a' : info.key === 'vencido' ? '#dc2626' : '#4f46e5';
    const waMsg = `*COMPROBANTE DE PAGO* — ${empNom}\n${rec}\n\nCliente: ${nombre}\nMonto recibido: ${fmt(monto)}\n(${letras})\nMétodo: ${metodo}\nFecha: ${fechaHora}\nContrato: ${prRef(p)}\nBalance actual: ${fmt(balAct)}\n\nGracias por su pago.`;
    const waNum = waNumero(tel);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comprobante ${rec} — ${esc(nombre)}</title>
      <style>
        *{box-sizing:border-box}body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;margin:0;background:#f1f5f9}
        .wrap{max-width:720px;margin:0 auto;padding:16px}
        .doc{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.08)}
        .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px;border-bottom:1px solid #eef0f5;flex-wrap:wrap}
        .brand{display:flex;align-items:center;gap:10px}.blogo{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,#4f46e5,#6d28d9);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
        .bnom{font-weight:800;font-size:16px;color:#0f172a;line-height:1}.bsub{font-size:10px;font-weight:700;color:#6d28d9;letter-spacing:.5px}
        .htitle{text-align:center;flex:1;min-width:180px}.htitle h1{font-size:19px;margin:0;color:#0f172a;letter-spacing:.5px}.htitle span{font-size:11px;color:#94a3b8}
        .recbox{text-align:right}.rec{font-size:17px;font-weight:800;color:#4f46e5;font-variant-numeric:tabular-nums}.badge{display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#15803d;font-size:10px;font-weight:800;padding:3px 9px;border-radius:999px;margin-top:3px}.recsub{font-size:9px;color:#94a3b8;margin-top:3px}
        .meta{display:flex;gap:14px;flex-wrap:wrap;padding:12px 22px;background:#faf9ff;border-bottom:1px solid #eef0f5;font-size:11.5px}
        .meta div b{display:block;font-size:9px;color:#94a3b8;font-weight:800;text-transform:uppercase;letter-spacing:.3px}
        .body{padding:18px 22px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .card{border:1px solid #eef0f5;border-radius:14px;padding:14px 16px;min-width:0}
        .ct{font-size:11px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:.3px;margin-bottom:10px}
        .cli{display:flex;align-items:center;gap:12px}.av{width:52px;height:52px;border-radius:14px;color:#fff;font-weight:800;font-size:20px;display:flex;align-items:center;justify-content:center;flex:none}
        .cnom{font-weight:800;font-size:15px;color:#0f172a}.cced{color:#4f46e5;font-weight:700;font-size:12px}.crow{font-size:12px;color:#475569;margin-top:2px}
        .kv{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:4px 0}.kv b{font-variant-numeric:tabular-nums}
        .montobox{border:1px solid #d1fae5;background:#f0fdf4;border-radius:14px;padding:14px;text-align:center;margin-bottom:10px}
        .montolbl{font-size:10px;font-weight:800;color:#059669;letter-spacing:.3px}.montoval{font-size:30px;font-weight:800;color:#059669;line-height:1.1;font-variant-numeric:tabular-nums}.montoletras{font-size:11px;color:#475569;margin-top:2px}
        .mets{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.met{border:1px solid #e2e8f0;border-radius:9px;padding:7px 11px;font-size:11px;font-weight:700;color:#94a3b8;background:#fff}.met.on{border-color:#4f46e5;background:#eef2ff;color:#4f46e5}
        .full{grid-column:1/-1}
        .obs{background:#f8fafc;border:1px solid #eef0f5;border-radius:12px;padding:11px 13px;font-size:12px;color:#475569}
        .firmas{display:flex;gap:24px;flex-wrap:wrap;margin-top:8px}.firma{flex:1;min-width:150px;text-align:center;padding-top:26px;border-top:1px solid #cbd5e1;font-size:11px;color:#475569}.firma b{display:block;color:#0f172a;font-size:12px}
        .regnote{font-size:10.5px;color:#94a3b8;padding:10px 22px;border-top:1px solid #eef0f5;background:#faf9ff}
        .acts{position:sticky;top:0;z-index:9;display:flex;gap:8px;flex-wrap:wrap;background:#4f46e5;padding:11px 16px}
        .acts button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:9px;padding:9px 15px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
        .b-close{background:rgba(255,255,255,.16);color:#fff}.b-print{background:#fff;color:#4f46e5}.b-wa{background:#22c55e;color:#fff}.b-mail{background:#0ea5e9;color:#fff}
        @media print{.acts{display:none}body{background:#fff}.doc{box-shadow:none}.wrap{padding:0;max-width:100%}}
        @media(max-width:640px){.body{grid-template-columns:1fr}}
      </style></head><body>
      <div class="acts">
        <button class="b-close" onclick="window.close()">✕ Cerrar</button>
        <button class="b-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
        ${waNum ? `<button class="b-wa" id="cpWA">WhatsApp</button>` : ''}
        <button class="b-mail" id="cpMail">Correo</button>
      </div>
      <div class="wrap"><div class="doc">
        <div class="hd">
          <div class="brand"><div class="blogo">N</div><div><div class="bnom">${esc(empNom)}</div><div class="bsub">FINANCIAMIENTO</div></div></div>
          <div class="htitle"><h1>COMPROBANTE DE PAGO</h1><span>Recibo de pago de préstamo</span></div>
          <div class="recbox"><div class="rec">${rec}</div><div class="badge">✓ REGISTRADO</div><div class="recsub">Comprobante de pago</div></div>
        </div>
        <div class="meta">
          <div><b>Fecha y hora</b>${esc(fechaHora)}</div>
          <div><b>Recibido por</b>${esc(x.created_by_name || '—')}</div>
        </div>
        <div class="body">
          <div class="card">
            <div class="ct">Cliente</div>
            <div class="cli"><div class="av" style="background:${av.color}">${av.ini}</div><div><div class="cnom">${esc(nombre)}</div>${cedula ? `<div class="cced">Cédula: ${esc(cedula)}</div>` : ''}${tel ? `<div class="crow">📞 ${esc(tel)}</div>` : ''}${direccion ? `<div class="crow">📍 ${esc(direccion)}</div>` : ''}</div></div>
          </div>
          <div class="card">
            <div class="ct">Información del préstamo</div>
            <div class="kv"><span>Contrato #</span><b>${esc(prRef(p))}</b></div>
            <div class="kv"><span>Fecha del préstamo</span><b>${esc(p.fecha_prestamo || '—')}</b></div>
            <div class="kv"><span>Monto aprobado</span><b>${fmt(p.capital)}</b></div>
            <div class="kv"><span>Balance anterior</span><b>${fmt(balAnt)}</b></div>
            <div class="kv"><span>Balance actual</span><b style="color:#059669">${fmt(balAct)}</b></div>
            ${prox ? `<div class="kv"><span>Próxima cuota</span><b>${esc(prox)}</b></div>` : ''}
            <div class="kv"><span>Estado</span><b style="color:${estCol}">${info.label}</b></div>
          </div>
          <div class="card full">
            <div class="ct">Detalle del pago</div>
            <div class="montobox"><div class="montolbl">MONTO RECIBIDO</div><div class="montoval">${fmt(monto)}</div><div class="montoletras">${letras}</div></div>
            <div class="kv"><span>Aplicado a</span><b>${aplicado}</b></div>
            <div class="ct" style="margin-top:10px">Método de pago</div>
            <div class="mets">${metTiles}</div>
          </div>
          ${x.nota ? `<div class="card full"><div class="ct">Observaciones</div><div class="obs">${esc(x.nota)}</div></div>` : ''}
          <div class="card full">
            <div class="firmas"><div class="firma"><b>${esc(x.created_by_name || '')}</b>Recibido por</div><div class="firma"><b>${esc(nombre)}</b>Firma del cliente</div></div>
          </div>
        </div>
        <div class="regnote">Pago registrado el ${esc(fechaHora)} en el sistema. El No. ${rec} identifica este recibo dentro del sistema (no es un comprobante fiscal).</div>
      </div></div>
      <script>
        (function(){
          var MSG=${JSON.stringify(waMsg)}, TEL=${JSON.stringify(waNum)}, MAIL=${JSON.stringify(email)}, SUBJ=${JSON.stringify('Comprobante de pago ' + rec)};
          var wa=document.getElementById('cpWA'); if(wa) wa.addEventListener('click',function(){ window.open('https://wa.me/'+TEL+'?text='+encodeURIComponent(MSG),'_blank'); });
          var ml=document.getElementById('cpMail'); if(ml) ml.addEventListener('click',function(){ window.location.href='mailto:'+MAIL+'?subject='+encodeURIComponent(SUBJ)+'&body='+encodeURIComponent(MSG); });
        })();
      </script>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('err', 'Permite las ventanas emergentes para ver el comprobante'); return; } w.document.write(html); w.document.close(); }
    catch (e) { toast('err', 'No se pudo abrir el comprobante', String(e && e.message || e)); }
  };

  // ── Tabla de amortización imprimible / compartible (WhatsApp · Correo) ──
  // Recalcula el MISMO cronograma que muestra nxPrestamoVer (amortizar/creditoCalc), no guarda nada.
  window.nxPrestamoAmortizacion = function (idOPrestamo) {
    // Acepta el id de un préstamo GUARDADO, o un objeto "borrador" del simulador (propuesta,
    // marcado con _propuesta:true). En modo propuesta nada se ha pagado y NO hay contrato todavía.
    const p = (idOPrestamo && typeof idOPrestamo === 'object') ? idOPrestamo : _prestamos.find(x => String(x.id) === String(idOPrestamo));
    if (!p) return;
    const esProp = !!p._propuesta;
    const dmy = f => { const s = String(f || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('/') : s; };
    const pag = esProp ? 0 : pagadoDe(p);
    const cli = (p.cliente_id && _prClientes.find(c => String(c.id) === String(p.cliente_id))) || null;
    const nombre = p.nombre || (cli && cli.nombre) || 'Cliente';
    const cedula = p.cedula || (cli && cli.cedula) || '';
    const tel = p.telefono || (cli && cli.telefono) || '';
    const email = (cli && cli.email) || '';
    const frecTxt = p.frecuencia === 'semanal' ? 'Semanal' : p.frecuencia === 'quincenal' ? 'Quincenal' : 'Mensual';
    let titulo = '', cols = [], filas = [], resumen = [], waLineas = [];
    if (p.modo === 'credito') {
      const cc = creditoCalc(p);
      titulo = 'INTERÉS POR MES';
      cols = [['Mes', 'l'], ['Desde', 'l'], ['Capital base', 'r'], ['Interés', 'r'], ['Estado', 'c']];
      filas = cc.meses.map(m => [['#' + m.n, 'l'], [dmy(m.fecha), 'l'], [fmt(m.saldo), 'r'], [fmt(m.interes), 'r m-int'], [m.encurso ? 'En curso' : 'Cerrado', 'c']]);
      waLineas = cc.meses.map(m => 'Mes ' + m.n + ' · ' + dmy(m.fecha) + ' · interés ' + fmt(m.interes));
      resumen = [['Tipo', 'Línea de crédito'], ['Tasa', p.tasa_interes + '% mensual sobre el saldo'], ['Capital', fmt(p.capital)], ['Capital pendiente', fmt(cc.capPend)], ['Interés pendiente', fmt(cc.interesPend)], ['Debe ahora', fmt(cc.totalDebe)]];
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0 && Number(p.tasa_interes || 0) > 0) {
      const met = p.metodo_interes || 'saldo';
      const a = amortizar(Number(p.capital || 0), Number(p.tasa_interes), p.num_cuotas, p.fecha_prestamo, p.frecuencia, met, Number(p.cuota_fija) || 0);
      titulo = 'TABLA DE AMORTIZACIÓN';
      cols = [['#', 'l'], ['Fecha', 'l'], ['Cuota', 'r'], ['Interés', 'r'], ['Capital', 'r'], ['Saldo', 'r'], ['Estado', 'c']];
      let acum = 0;
      filas = a.rows.map(r => {
        acum += r.cuota; const cub = pag >= acum - 0.5;
        return [['#' + r.n, 'l'], [dmy(r.fecha), 'l'], [fmt(r.cuota), 'r b'], [fmt(r.interes), 'r m-int'], [fmt(r.capital), 'r m-cap'], [fmt(r.saldo), 'r'], [cub ? 'Pagada' : 'Pendiente', 'c ' + (cub ? 'ok' : 'pend')]];
      });
      waLineas = a.rows.map(r => 'Cuota ' + r.n + ' · ' + dmy(r.fecha) + ' · ' + fmt(r.cuota));
      resumen = [['Capital prestado', fmt(p.capital)], ['Tasa', p.tasa_interes + '% mensual'], ['Método', met === 'plano' ? 'Interés plano' : 'Saldo insoluto'], ['Cuotas', p.num_cuotas + ' · ' + frecTxt], ['Cuota', fmt(a.cuota)], ['Interés total', fmt(a.interesTotal)], ['Total a devolver', fmt(a.total)]];
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0) {
      const cuota = Number(p.total_devolver || 0) / p.num_cuotas;
      titulo = 'CALENDARIO DE CUOTAS';
      cols = [['#', 'l'], ['Fecha', 'l'], ['Cuota', 'r'], ['Estado', 'c']];
      let acum = 0;
      for (let i = 0; i < p.num_cuotas; i++) {
        const f = fechaCuota(p.fecha_prestamo, p.frecuencia, i + 1);
        acum += cuota; const cub = pag >= acum - 0.5;
        filas.push([['#' + (i + 1), 'l'], [dmy(f), 'l'], [fmt(cuota), 'r b'], [cub ? 'Pagada' : 'Pendiente', 'c ' + (cub ? 'ok' : 'pend')]]);
        waLineas.push('Cuota ' + (i + 1) + ' · ' + dmy(f) + ' · ' + fmt(cuota));
      }
      resumen = [['Capital prestado', fmt(p.capital)], ['Cuotas', p.num_cuotas + ' · ' + frecTxt], ['Cuota', fmt(cuota)], ['Total a devolver', fmt(p.total_devolver)], ['Interés', 'Sin interés']];
    } else {
      toast('err', 'Este préstamo no tiene cronograma', 'Los abonos libres no tienen cuotas fijas que compartir.');
      return;
    }
    // En una propuesta nadie ha pagado nada: la columna Estado (siempre la última) no aporta y se quita.
    if (esProp) { cols.pop(); filas.forEach(f => f.pop()); }
    const av = prIniciales(nombre), empNom = empresaNom();
    const info = esProp ? { key: 'propuesta', label: 'PROPUESTA' } : prEstadoInfo(p);
    const ref = esProp ? '' : prRef(p);
    const estCol = info.key === 'pagado' ? '#16a34a' : info.key === 'vencido' ? '#dc2626' : '#4f46e5';
    const hoyTxt = dmy(hoy());
    const docTit = esProp ? 'PROPUESTA DE FINANCIAMIENTO' : titulo;
    // WhatsApp: resumen + cronograma. Se acota para no armar un enlace absurdamente largo.
    const TOPE = 40;
    const lineasWA = waLineas.slice(0, TOPE).join('\n') + (waLineas.length > TOPE ? '\n… y ' + (waLineas.length - TOPE) + ' más (ver documento completo)' : '');
    const waMsg = '*' + docTit + '* — ' + empNom + (esProp ? '' : '\nContrato: ' + ref) + '\n\nCliente: ' + nombre + '\n' + resumen.map(r => r[0] + ': ' + r[1]).join('\n') + '\n\n*Cronograma*\n' + lineasWA + (esProp ? '\n\n_Propuesta sujeta a aprobación. No es un préstamo aprobado._' : '');
    const waNum = waNumero(tel);
    const thead = '<tr>' + cols.map(c => '<th class="' + c[1] + '">' + esc(c[0]) + '</th>').join('') + '</tr>';
    const tbody = filas.map(f => '<tr>' + f.map(c => '<td class="' + c[1] + '">' + esc(c[0]) + '</td>').join('') + '</tr>').join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(docTit)} ${esc(ref)} — ${esc(nombre)}</title>
      <style>
        *{box-sizing:border-box}body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;margin:0;background:#f1f5f9}
        .wrap{max-width:820px;margin:0 auto;padding:16px}
        .doc{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.08)}
        .hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 22px;border-bottom:1px solid #eef0f5;flex-wrap:wrap}
        .brand{display:flex;align-items:center;gap:10px}.blogo{width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,#4f46e5,#6d28d9);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}
        .bnom{font-weight:800;font-size:16px;color:#0f172a;line-height:1}.bsub{font-size:10px;font-weight:700;color:#6d28d9;letter-spacing:.5px}
        .htitle{text-align:center;flex:1;min-width:180px}.htitle h1{font-size:18px;margin:0;color:#0f172a;letter-spacing:.5px}.htitle span{font-size:11px;color:#94a3b8}
        .recbox{text-align:right}.rec{font-size:16px;font-weight:800;color:#4f46e5;font-variant-numeric:tabular-nums}.badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:3px 9px;border-radius:999px;margin-top:3px;background:#eef2ff;color:${estCol}}.recsub{font-size:9px;color:#94a3b8;margin-top:3px}
        .body{padding:18px 22px;display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .card{border:1px solid #eef0f5;border-radius:14px;padding:14px 16px;min-width:0}
        .ct{font-size:11px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:.3px;margin-bottom:10px}
        .cli{display:flex;align-items:center;gap:12px}.av{width:52px;height:52px;border-radius:14px;color:#fff;font-weight:800;font-size:20px;display:flex;align-items:center;justify-content:center;flex:none}
        .cnom{font-weight:800;font-size:15px;color:#0f172a}.cced{color:#4f46e5;font-weight:700;font-size:12px}.crow{font-size:12px;color:#475569;margin-top:2px}
        .kv{display:flex;justify-content:space-between;gap:8px;font-size:12px;padding:4px 0}.kv b{font-variant-numeric:tabular-nums}
        .full{grid-column:1/-1}
        .tblwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #eef0f5;border-radius:12px}
        table{width:100%;border-collapse:collapse;font-size:12px;min-width:460px;background:#fff}
        thead th{background:#faf9ff;color:#94a3b8;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.3px;padding:9px 10px;border-bottom:1px solid #eef0f5;white-space:nowrap}
        tbody td{padding:8px 10px;border-bottom:1px solid #f4f5f9;font-variant-numeric:tabular-nums;white-space:nowrap}
        tbody tr:last-child td{border-bottom:0}
        .l{text-align:left}.r{text-align:right}.c{text-align:center}
        .b{font-weight:700;color:#0f172a}.m-int{color:#ea580c}.m-cap{color:#6d28d9}
        .ok{color:#16a34a;font-weight:800}.pend{color:#94a3b8;font-weight:700}
        .regnote{font-size:10.5px;color:#94a3b8;padding:10px 22px;border-top:1px solid #eef0f5;background:#faf9ff}
        .acts{position:sticky;top:0;z-index:9;display:flex;gap:8px;flex-wrap:wrap;background:#4f46e5;padding:11px 16px}
        .acts button{display:inline-flex;align-items:center;gap:6px;border:0;border-radius:9px;padding:9px 15px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
        .b-close{background:rgba(255,255,255,.16);color:#fff}.b-print{background:#fff;color:#4f46e5}.b-wa{background:#22c55e;color:#fff}.b-mail{background:#0ea5e9;color:#fff}
        @media print{.acts{display:none}body{background:#fff}.doc{box-shadow:none}.wrap{padding:0;max-width:100%}.tblwrap{border:0}table{min-width:0}}
        @media(max-width:640px){.body{grid-template-columns:1fr}}
      </style></head><body>
      <div class="acts">
        <button class="b-close" onclick="window.close()">✕ Cerrar</button>
        <button class="b-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
        ${waNum ? '<button class="b-wa" id="amWA">WhatsApp</button>' : ''}
        <button class="b-mail" id="amMail">Correo</button>
      </div>
      <div class="wrap"><div class="doc">
        <div class="hd">
          <div class="brand"><div class="blogo">N</div><div><div class="bnom">${esc(empNom)}</div><div class="bsub">FINANCIAMIENTO</div></div></div>
          <div class="htitle"><h1>${esc(docTit)}</h1><span>${esProp ? 'Simulación de las condiciones conversadas' : 'Plan de pagos del préstamo'}</span></div>
          <div class="recbox">${esProp ? '' : `<div class="rec">${esc(ref)}</div>`}<div class="badge">${esc(info.label)}</div><div class="recsub">${esProp ? 'Emitida' : 'Emitido'} ${esc(hoyTxt)}</div></div>
        </div>
        <div class="body">
          <div class="card">
            <div class="ct">Cliente</div>
            <div class="cli"><div class="av" style="background:${av.color}">${av.ini}</div><div><div class="cnom">${esc(nombre)}</div>${cedula ? '<div class="cced">Cédula: ' + esc(cedula) + '</div>' : ''}${tel ? '<div class="crow">📞 ' + esc(tel) + '</div>' : ''}</div></div>
          </div>
          <div class="card">
            <div class="ct">Condiciones del préstamo</div>
            ${resumen.map(r => '<div class="kv"><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>').join('')}
            <div class="kv"><span>Fecha del préstamo</span><b>${esc(dmy(p.fecha_prestamo))}</b></div>
          </div>
          <div class="card full">
            <div class="ct">Cronograma (${filas.length} ${filas.length === 1 ? 'línea' : 'líneas'})</div>
            <div class="tblwrap"><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>
          </div>
        </div>
        <div class="regnote">${esProp
        ? 'Propuesta generada el ' + esc(hoyTxt) + '. Es una <b>simulación</b> de las condiciones conversadas: <b>no es un préstamo aprobado</b> ni un compromiso de desembolso, y las condiciones pueden variar hasta la aprobación. Este documento no tiene número de contrato porque el préstamo todavía no existe en el sistema.'
        : 'Documento informativo generado el ' + esc(hoyTxt) + '. El estado de cada cuota se calcula con lo pagado hasta hoy (' + fmt(pag) + '); si se registra un pago nuevo, vuelve a generarlo para verlo al día.'}</div>
      </div></div>
      <script>
        (function(){
          var MSG=${JSON.stringify(waMsg)}, TEL=${JSON.stringify(waNum)}, MAIL=${JSON.stringify(email)}, SUBJ=${JSON.stringify(docTit + (ref ? ' ' + ref : '') + ' — ' + nombre)};
          var wa=document.getElementById('amWA'); if(wa) wa.addEventListener('click',function(){ window.open('https://wa.me/'+TEL+'?text='+encodeURIComponent(MSG),'_blank'); });
          var ml=document.getElementById('amMail'); if(ml) ml.addEventListener('click',function(){ window.location.href='mailto:'+MAIL+'?subject='+encodeURIComponent(SUBJ)+'&body='+encodeURIComponent(MSG); });
        })();
      </script>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('err', 'Permite las ventanas emergentes para ver la tabla'); return; } w.document.write(html); w.document.close(); }
    catch (e) { toast('err', 'No se pudo abrir la tabla', String(e && e.message || e)); }
  };

  // ── PROPUESTA: compartir el cronograma de un préstamo que TODAVÍA NO EXISTE ──
  // Sirve mientras se negocia con un cliente (nuevo o ya registrado). Lee el simulador del DOM
  // — Evaluación y el formulario de Nuevo préstamo usan los MISMOS ids, así que una sola función
  // cubre las dos pantallas. No guarda nada: arma un préstamo "borrador" y lo manda a imprimir.
  window.nxPrPropuesta = function () {
    const cap = parseMoney(val('prCap')), tasa = parsePct(val('prTasa'));
    const fecha = val('prFecha') || hoy();
    const nombre = (val('prNom') || (_evCli && _evCli.nombre) || '').trim();
    const base = {
      _propuesta: true, id: '__propuesta__', fecha_prestamo: fecha,
      nombre: nombre, cedula: (val('prCed') || '').trim(), telefono: (val('prTel') || '').trim()
    };
    let draft = null;
    if (_modoForm === 'credito') {
      const plazo = parseInt(val('prPlazo'), 10) || 0;
      if (!(cap > 0 && tasa > 0)) { toast('err', 'Completa el simulador primero', 'Faltan el capital o la tasa.'); return; }
      draft = Object.assign({}, base, { modo: 'credito', capital: cap, tasa_interes: tasa, plazo_meses: plazo });
    } else if (_modoForm === 'cuotas') {
      const n = parseInt(val('prNumCuotas'), 10) || 0;
      if (!(cap > 0 && n > 0)) { toast('err', 'Completa el simulador primero', 'Faltan el capital o el número de cuotas.'); return; }
      const frec = val('prFrec') || 'mensual', met = val('prMetodo') || 'plano';
      const cf = (_prCuotaMode === 'monto') ? parseMoney(val('prCuotaObjetivo')) : 0;
      const a = tasa > 0 ? amortizar(cap, tasa, n, fecha, frec, met, cf) : null;
      draft = Object.assign({}, base, { modo: 'cuotas', capital: cap, tasa_interes: tasa, num_cuotas: n, frecuencia: frec, metodo_interes: met, cuota_fija: cf || null, total_devolver: a ? a.total : cap });
    } else {
      toast('err', 'Los abonos libres no tienen cuotas fijas', 'Cambia a "Cuotas fijas" o "Línea de crédito" para armar una propuesta.');
      return;
    }
    window.nxPrestamoAmortizacion(draft);
  };

  // ── Link de firma (link público, sin login) — el cliente sube cédula+firma y esto crea
  // la solicitud (tabla `prestamo_solicitudes`, RLS solo-admin — el link público NUNCA escribe
  // aquí directo, siempre a través de la función Edge `prestamo-solicitud` con service role).
  // Mismo criterio que `nxPrPropuesta`: lee el simulador tal cual está en pantalla, sin tocar
  // `nxPrestamoGuardar`. El préstamo real NO se crea aquí — nace cuando el admin aprueba la
  // solicitud ya con la cédula/firma adjuntas (ver nxPrSolicitudAprobar).
  // Guion que el cliente va a leer en el video. MISMA lógica que `guionTexto()` de
  // firma-prestamo.html — se calcula aquí también para poder mostrárselo al dueño y dejarlo
  // corregir ANTES de mandar el link. Lo que quede aquí se guarda en `video_guion` y es lo
  // que la página pública muestra (ella solo lo genera sola si la solicitud no trae ninguno).
  function prGuionTexto(d) {
    const nom = String(d.nombre || '').trim();
    if (d.modo === 'credito') {
      return 'Yo, ' + nom + ', declaro que recibí una línea de crédito de ' + fmt(d.capital)
        + ' con ' + (d.tasa_interes || 0) + ' por ciento de interés mensual'
        + (d.plazo_meses ? ', y me comprometo a devolver el capital en un plazo de ' + d.plazo_meses + ' meses' : '')
        + ', y a pagar los intereses cada mes.';
    }
    const frecTxt = { semanal: 'semanales', quincenal: 'quincenales', mensual: 'mensuales' }[d.frecuencia] || '';
    return 'Yo, ' + nom + ', declaro que recibí un préstamo de ' + fmt(d.capital)
      + ', y me comprometo a pagarlo en ' + (d.num_cuotas || '—') + ' cuotas ' + frecTxt
      + ' de ' + fmt(d.cuota_calculada) + ' cada una.';
  }
  // Declaración de compromiso: el recuadro que el cliente ve ARRIBA, en la tarjeta del préstamo.
  // Misma pareja que `prGuionTexto`: se calcula aquí para poder corregirla antes de enviar el
  // link, y lo aprobado se guarda en `declaracion`. Duplica la lógica de `terminosTexto()` de
  // firma-prestamo.html a propósito (son archivos independientes) — si cambia, tocar los dos.
  function prDeclaracionTexto(d) {
    const nom = String(d.nombre || '').trim();
    const detalle = d.modo === 'credito'
      ? ('Línea de crédito de ' + fmt(d.capital) + ' con ' + (d.tasa_interes || 0) + '% de interés mensual'
        + (d.plazo_meses ? ', a devolver el capital en un plazo de ' + d.plazo_meses + ' meses' : '') + '.')
      : ((d.num_cuotas || '—') + ' cuotas ' + (d.frecuencia || '') + ' de ' + fmt(d.cuota_calculada)
        + ' cada una, sobre un capital de ' + fmt(d.capital) + '.');
    return 'Yo, ' + nom + ', declaro que acordé este préstamo con el negocio y me comprometo a pagarlo según lo descrito arriba: ' + detalle;
  }
  let _prLinkDraft = null; // términos ya calculados, a la espera de que el dueño confirme

  window.nxPrGenerarLinkFirma = function () {
    const cap = parseMoney(val('prCap')), tasa = parsePct(val('prTasa'));
    const fecha = val('prFecha') || hoy();
    const nombre = (val('prNom') || (_evCli && _evCli.nombre) || '').trim();
    if (!nombre) { toast('err', 'Falta el nombre del cliente'); return; }
    const datos = {
      cliente_id: val('prCliId') || null, nombre,
      cedula: (val('prCed') || '').trim(), telefono: (val('prTel') || '').trim(),
      fecha_prestamo: fecha, notas: (val('prNotas') || '').trim(), created_by_name: nomAdmin()
    };
    if (_modoForm === 'credito') {
      const plazo = parseInt(val('prPlazo'), 10) || 0;
      if (!(cap > 0 && tasa > 0)) { toast('err', 'Completa el simulador primero', 'Faltan el capital o la tasa.'); return; }
      Object.assign(datos, { modo: 'credito', capital: cap, tasa_interes: tasa, plazo_meses: plazo || null, total_devolver: cap, cuota_calculada: null });
    } else if (_modoForm === 'cuotas') {
      const n = parseInt(val('prNumCuotas'), 10) || 0;
      if (!(cap > 0 && n > 0)) { toast('err', 'Completa el simulador primero', 'Faltan el capital o el número de cuotas.'); return; }
      const frec = val('prFrec') || 'mensual', met = val('prMetodo') || 'plano';
      const cf = (_prCuotaMode === 'monto') ? parseMoney(val('prCuotaObjetivo')) : 0;
      const a = tasa > 0 ? amortizar(cap, tasa, n, fecha, frec, met, cf) : null;
      Object.assign(datos, { modo: 'cuotas', capital: cap, tasa_interes: tasa, num_cuotas: n, frecuencia: frec, metodo_interes: met, cuota_fija: cf || null, total_devolver: a ? a.total : cap, cuota_calculada: a ? a.cuota : Math.round(cap / n) });
    } else {
      toast('err', 'Los abonos libres no tienen cuotas fijas', 'Cambia a "Cuotas fijas" o "Línea de crédito" para generar un link de firma.');
      return;
    }
    _prLinkDraft = datos;
    window.nxPrLinkRevisar();
  };

  // Pantalla de revisión: el dueño ve TODO lo que el cliente va a recibir y puede corregir el
  // guion del video y el mensaje de WhatsApp antes de que nada se cree. Nada se guarda hasta
  // que toca "Crear el link".
  window.nxPrLinkRevisar = function () {
    const d = _prLinkDraft; if (!d) return;
    cerrarModal('nxPrLinkRev');
    const terminos = d.modo === 'credito'
      ? `Línea de crédito · Capital ${fmt(d.capital)} · Tasa ${d.tasa_interes || 0}% mensual${d.plazo_meses ? ` · Plazo ${d.plazo_meses} meses` : ''}`
      : `${d.num_cuotas || '—'} cuotas ${d.frecuencia || ''} · Capital ${fmt(d.capital)} · Cuota ${fmt(d.cuota_calculada)} · Total a devolver ${fmt(d.total_devolver)}`;
    const msgWA = `Hola ${(d.nombre || '').split(' ')[0]}, para completar tu préstamo entra a este link, sube tu cédula y firma:`;
    const ov = document.createElement('div'); ov.id = 'nxPrLinkRev'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:520px;max-height:90vh;display:flex;flex-direction:column">
      <div class="mt"><span><i class="ti ti-eye-check"></i> Revisa antes de enviar</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById('nxPrLinkRev').remove()"><i class="ti ti-x"></i></button></div>
      <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
        <div style="font-size:12px;color:#475569;margin-bottom:10px">Esto es lo que <b>${esc(d.nombre || '')}</b> va a ver en su teléfono. Corrige lo que quieras — todavía no se ha creado nada.</div>
        <div class="prCard">
          <div style="font-size:10.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">Términos que verá</div>
          <div style="font-size:12.5px;color:#4c1d95;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:9px;padding:9px">${esc(terminos)}</div>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:6px">Para cambiarlos, cierra esto y ajusta el simulador.</div>
        </div>
        <div class="prCard">
          <div style="font-size:10.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">Declaración que verá en pantalla</div>
          <textarea id="prLkDecl" rows="4" style="width:100%;padding:11px 12px;border:1.5px solid #e6e8ef;border-radius:11px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;background:#f8fafc;resize:vertical">${esc(prDeclaracionTexto(d))}</textarea>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Es el recuadro morado que sale debajo de los términos, arriba del todo.</div>
        </div>
        <div class="prCard">
          <div style="font-size:10.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">Texto que leerá en el video</div>
          <textarea id="prLkGuion" rows="5" style="width:100%;padding:11px 12px;border:1.5px solid #e6e8ef;border-radius:11px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;background:#f8fafc;resize:vertical">${esc(prGuionTexto(d))}</textarea>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Se le muestra en pantalla para que lo lea en voz alta mientras graba.</div>
        </div>
        <div class="prCard">
          <div style="font-size:10.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">Mensaje de WhatsApp</div>
          <textarea id="prLkMsg" rows="2" style="width:100%;padding:11px 12px;border:1.5px solid #e6e8ef;border-radius:11px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;background:#f8fafc;resize:vertical">${esc(msgWA)}</textarea>
          <div style="font-size:10.5px;color:#94a3b8;margin-top:4px">El link se agrega solo al final del mensaje.</div>
        </div>
      </div>
      <div style="border-top:1px solid #f1f5f9;padding-top:10px;margin-top:10px;display:flex;gap:8px">
        <button class="btn bsm bghost" type="button" style="flex:0 0 auto" onclick="document.getElementById('nxPrLinkRev').remove()">Cancelar</button>
        <button class="btn bsm bc1" type="button" style="flex:1" onclick="window.nxPrLinkCrear()"><i class="ti ti-link"></i> Crear el link</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
  };

  window.nxPrLinkCrear = async function () {
    const d = _prLinkDraft; if (!d) return;
    const guion = (val('prLkGuion') || '').trim();
    const decl = (val('prLkDecl') || '').trim();
    const msg = (val('prLkMsg') || '').trim();
    if (!guion) { toast('err', 'El texto del video no puede quedar vacío'); return; }
    if (!decl) { toast('err', 'La declaración no puede quedar vacía'); return; }
    const btn = document.querySelector('#nxPrLinkRev .bc1');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Creando…'; }
    const datos = Object.assign({}, d, { video_guion: guion, declaracion: decl });
    try {
      const r = await getAPI().post('prestamo_solicitudes', datos);
      const id = r && r[0] && r[0].id;
      if (!id) { toast('err', 'No se pudo generar el link'); if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-link"></i> Crear el link'; } return; }
      try { window.logAudit && window.logAudit('PRESTAMO_SOLICITUD_CREADA', d.nombre + ' · ' + fmt(d.capital), 'Financiamiento'); } catch (e) {}
      _prSolicitudes.unshift(Object.assign({ id, estado: 'pendiente', created_at: new Date().toISOString() }, datos));
      cerrarModal('nxPrLinkRev');
      _prLinkDraft = null;
      window.nxPrLinkFirmaMostrar(id, d.nombre, d.telefono, msg);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-link"></i> Crear el link'; }
      toast('err', 'Error al generar el link', String(e && e.message || e));
    }
  };
  window.nxPrLinkFirmaMostrar = function (id, nombre, telefono, mensaje) {
    cerrarModal('nxPrLinkFirma');
    // El `v=` no lo usa la página (solo lee `id`): está para que cada versión publicada
    // genere una dirección distinta y el teléfono del cliente nunca abra una copia vieja
    // guardada en caché — un arreglo publicado después no le llegaba (pasó de verdad).
    const ver = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '';
    const link = location.origin + '/firma-prestamo.html?id=' + id + (ver ? '&v=' + ver : '');
    const ov = document.createElement('div'); ov.id = 'nxPrLinkFirma'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    const num = telefono ? waNumero(telefono) : '';
    // El mensaje lo escribió (o corrigió) el dueño en la pantalla de revisión; si por lo que sea
    // no llegó, se cae al texto de siempre. El link siempre se pega al final.
    const msg = (mensaje || `Hola ${(nombre || '').split(' ')[0]}, para completar tu préstamo entra a este link, sube tu cédula y firma:`) + '\n' + link;
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:420px"><div class="mt"><span><i class="ti ti-link"></i> Link de firma generado</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById('nxPrLinkFirma').remove()"><i class="ti ti-x"></i></button></div>
      <div style="font-size:12px;color:#475569;margin-bottom:8px">Comparte este enlace con <b>${esc(nombre || '')}</b> para que suba su cédula y firme desde su teléfono. Cuando lo publique, aparece en <b>"Solicitudes"</b> para que lo apruebes.</div>
      <input id="prLkInp" readonly value="${esc(link)}" onclick="this.select()" style="width:100%;height:42px;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;background:#f8fafc;color:#334155">
      <div class="fe" style="margin-top:10px;gap:8px;flex-wrap:wrap">
        <button class="btn bsm bghost" type="button" onclick="window.nxPrLinkCopiar()"><i class="ti ti-copy"></i> Copiar</button>
        <a class="btn bsm bghost" href="${esc(link)}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> Abrir</a>
        ${num ? `<a class="btn bsm bc1" href="https://wa.me/${num}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>` : ''}
      </div></div>`;
    document.body.appendChild(ov);
  };
  window.nxPrLinkCopiar = function () {
    const i = document.getElementById('prLkInp'); if (!i) return;
    try { i.select(); document.execCommand('copy'); } catch (e) {}
    try { if (navigator.clipboard) navigator.clipboard.writeText(i.value); } catch (e) {}
    toast('ok', 'Link copiado');
  };

  // Puente entre el préstamo ya aprobado y su expediente firmado (cédula, foto, video, firma).
  // Sin esto, la única pista era la nota de texto del préstamo ("...en la solicitud 09705b0c")
  // y había que ir a buscarla a mano en la lista de Solicitudes.
  window.nxPrestamoExpediente = function (id) {
    const s = _prSolicitudes.find(x => String(x.prestamo_id) === String(id));
    if (!s) { toast('err', 'Este préstamo no se creó desde un link de firma'); return; }
    cerrarModal('nxPrModal');
    window.nxPrSolicitudVer(s.id);
  };

  // ── Solicitudes de firma (revisión admin) — cédula+firma que el cliente ya envió por el
  // link público. `estado`: pendiente (link sin usar) → enviada (esperando revisión) →
  // aprobada (ya es un préstamo real, prestamo_id apunta a él) | rechazada.
  function prSolTablaHTML() {
    if (!_prSolicitudes.length) return `<div class="nxFP-empty"><div class="nxFP-emptyIco"><i class="ti ti-file-off"></i></div><h3>Aún no hay solicitudes</h3><p>Genera un link de firma desde "Nuevo préstamo" para empezar.</p></div>`;
    const badge = (s, corr) => (s === 'pendiente' && corr) ? '<span style="font-size:9px;font-weight:800;color:#b45309;background:#fef3c7;padding:2px 8px;border-radius:20px;white-space:nowrap">POR CORREGIR</span>'
      : s === 'pendiente' ? '<span style="font-size:9px;font-weight:800;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:20px;white-space:nowrap">SIN ENVIAR</span>'
      : s === 'enviada' ? '<span style="font-size:9px;font-weight:800;color:#d97706;background:#fef3c7;padding:2px 8px;border-radius:20px;white-space:nowrap">POR REVISAR</span>'
      : s === 'aprobada' ? '<span style="font-size:9px;font-weight:800;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px;white-space:nowrap">APROBADA</span>'
      : '<span style="font-size:9px;font-weight:800;color:#dc2626;background:#fee2e2;padding:2px 8px;border-radius:20px;white-space:nowrap">RECHAZADA</span>';
    const rows = _prSolicitudes.map(s => `<tr onclick="window.nxPrSolicitudVer('${s.id}')" tabindex="0" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}">
      <td data-l="Cliente" class="nxFP-tdNom"><div class="nxFP-tNom">${esc(s.nombre || '')}</div>${s.cedula ? `<div class="nxFP-tSub">${esc(s.cedula)}</div>` : ''}</td>
      <td data-l="Monto" class="nxFP-tMoney">${fmt(s.capital)}</td>
      <td data-l="Estado">${badge(s.estado, s.correccion_motivo)}</td>
      <td data-l="Fecha">${esc(String(s.created_at || '').slice(0, 10))}</td>
    </tr>`).join('');
    return `<div class="nxFP-tblWrap"><table class="nxFP-tbl"><thead><tr><th>Cliente</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function prSolicitudesMainHTML() {
    const porRevisar = _prSolicitudes.filter(s => s.estado === 'enviada').length;
    const sinEnviar = _prSolicitudes.filter(s => s.estado === 'pendiente').length;
    const aprobadas = _prSolicitudes.filter(s => s.estado === 'aprobada').length;
    const kpi2 = (ico, bg, col, lbl, val, sub) => `<div class="nxFP-kpi"><div class="nxFP-kpiTop"><div class="nxFP-kpiIco" style="background:${bg};color:${col}"><i class="ti ${ico}"></i></div><div class="nxFP-kpiLbl">${lbl}</div></div><div class="nxFP-kpiVal">${val}</div><div class="nxFP-kpiSub">${sub}</div></div>`;
    return `
      <div class="nxFP-topbar">
        <button type="button" class="nxFP-burger" onclick="window.nxFPToggleSide()" aria-label="Abrir menú"><i class="ti ti-menu-2"></i></button>
        <div><div class="nxFP-topTitle">Solicitudes de firma</div><div class="nxFP-topSub">Cédula y firma que el cliente envió por el link, para validar</div></div>
      </div>
      <div class="nxFP-kpis">
        ${kpi2('ti-clock-hour-4', '#fef3c7', '#d97706', 'POR REVISAR', porRevisar, 'El cliente ya envió sus datos')}
        ${kpi2('ti-send', '#f1f5f9', '#64748b', 'SIN ENVIAR', sinEnviar, 'El link aún no lo usan')}
        ${kpi2('ti-circle-check', '#dcfce7', '#16a34a', 'APROBADAS', aprobadas, 'Ya son préstamos reales')}
      </div>
      <div class="nxFP-listHead"><span>SOLICITUDES</span></div>
      <div id="nxPrSolLista">${prSolTablaHTML()}</div>`;
  }
  window.nxPrSolicitudVer = function (id) {
    const s = _prSolicitudes.find(x => String(x.id) === String(id)); if (!s) return;
    cerrarModal('nxPrSolModal');
    const ov = document.createElement('div'); ov.id = 'nxPrSolModal'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    const terminos = s.modo === 'credito'
      ? `Línea de crédito · Capital ${fmt(s.capital)} · Tasa ${s.tasa_interes || 0}% mensual${s.plazo_meses ? ` · Plazo ${s.plazo_meses} meses` : ''}`
      : `${s.num_cuotas || '—'} cuotas ${s.frecuencia || ''} · Capital ${fmt(s.capital)} · Total a devolver ${fmt(s.total_devolver)}${s.cuota_calculada ? ` · Cuota ${fmt(s.cuota_calculada)}` : ''}`;
    const avisoCorr = s.correccion_motivo ? `<div style="font-size:11.5px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:9px;margin-bottom:10px"><b>Se le pidió corregir:</b> ${esc(s.correccion_motivo)}</div>` : '';
    const docs = s.estado === 'pendiente'
      ? `${avisoCorr}<div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px"><i class="ti ti-hourglass" style="font-size:26px;display:block;margin-bottom:6px"></i>${s.correccion_motivo ? 'Esperando a que el cliente lo envíe corregido.' : 'El cliente todavía no ha abierto el link.'}</div>`
      : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          ${s.cedula_frente ? `<div><div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:4px">CÉDULA FRENTE</div><img src="${s.cedula_frente}" style="width:100%;border-radius:8px;border:1px solid #e2e8f0" alt="Cédula del cliente, lado frontal"></div>` : ''}
          ${s.cedula_dorso ? `<div><div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:4px">CÉDULA DORSO</div><img src="${s.cedula_dorso}" style="width:100%;border-radius:8px;border:1px solid #e2e8f0" alt="Cédula del cliente, lado del dorso"></div>` : ''}
        </div>
        ${s.selfie ? `<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:4px">FOTO CON LA CÉDULA</div><img src="${s.selfie}" style="width:100%;border-radius:8px;border:1px solid #e2e8f0" alt="Foto del cliente sosteniendo su cédula"></div>` : ''}
        ${s.video_path ? `<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:4px">VIDEO DE COMPROMISO</div><div id="nxPrSolVid" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;color:#94a3b8;font-size:11.5px">Cargando video…</div>${s.video_guion ? `<div style="font-size:11px;color:#475569;background:#f8fafc;border-radius:8px;padding:8px;margin-top:6px"><b>Lo que se le pidió decir:</b> ${esc(s.video_guion)}</div>` : ''}</div>` : ''}
        ${s.firma ? `<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:4px">FIRMA</div><img src="${s.firma}" style="width:100%;max-height:140px;object-fit:contain;background:#fff;border-radius:8px;border:1px solid #e2e8f0" alt="Firma del cliente"></div>` : ''}`;
    const btnCorregir = `<button class="btn bsm bghost" type="button" style="color:#b45309" onclick="window.nxPrSolicitudPedirCorreccion('${s.id}')"><i class="ti ti-rotate-clockwise"></i> Pedir corrección</button>`;
    const acciones = s.estado === 'enviada'
      ? `<div class="fe" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn bsm bghost" type="button" style="color:#dc2626" onclick="window.nxPrSolicitudRechazar('${s.id}')"><i class="ti ti-x"></i> Rechazar</button>${btnCorregir}<button class="btn bsm bc1" type="button" style="flex:1;min-width:150px" onclick="window.nxPrSolicitudAprobar('${s.id}')"><i class="ti ti-check"></i> Aprobar y crear préstamo</button></div>`
      : s.estado === 'rechazada'
      ? `${s.motivo_rechazo ? `<div style="font-size:11.5px;color:#dc2626;background:#fef2f2;border-radius:8px;padding:8px;margin-top:8px"><b>Motivo:</b> ${esc(s.motivo_rechazo)}</div>` : ''}
         <div style="margin-top:8px">${btnCorregir}</div>`
      : s.estado === 'aprobada' && s.prestamo_id
      // Ya es un préstamo real: el expediente se queda aquí como respaldo permanente, y desde
      // aquí se salta al préstamo (el camino de vuelta lo da el botón "Expediente firmado").
      ? `<div style="font-size:11.5px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:9px;margin-top:8px">✓ Aprobada — ya es un préstamo real. Estos documentos quedan guardados aquí como respaldo.</div>
         <button class="btn bsm bc1" type="button" style="width:100%;margin-top:8px" onclick="document.getElementById('nxPrSolModal').remove();window.nxPrestamoVer('${s.prestamo_id}')"><i class="ti ti-cash"></i> Ver el préstamo</button>`
      : (s.estado === 'rechazada' && s.motivo_rechazo ? `<div style="font-size:11.5px;color:#dc2626;background:#fef2f2;border-radius:8px;padding:8px;margin-top:8px"><b>Motivo:</b> ${esc(s.motivo_rechazo)}</div>` : '');
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:440px;max-height:88vh;overflow-y:auto">
      <div class="mt"><span><i class="ti ti-file-check"></i> Solicitud de ${esc(s.nombre || '')}</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById('nxPrSolModal').remove()"><i class="ti ti-x"></i></button></div>
      <div style="font-size:12px;color:#475569;margin-bottom:10px">${esc(s.telefono || 'Sin teléfono')}${s.cedula ? ' · ' + esc(s.cedula) : ''}</div>
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px;font-size:12px;color:#4c1d95;margin-bottom:12px"><b>Términos:</b> ${esc(terminos)}</div>
      ${docs}
      ${acciones}
    </div>`;
    document.body.appendChild(ov);
    // El video vive en un bucket PRIVADO (es un documento legal, no se sirve público) — hay
    // que pedir una URL firmada temporal para poder reproducirlo. Se hace después de pintar
    // el modal para no retrasar lo demás; si falla, se avisa en su lugar en vez de dejar un
    // reproductor roto.
    if (s.video_path) window.nxPrSolVideoCargar(s.video_path);
  };
  window.nxPrSolVideoCargar = async function (path) {
    const cont = document.getElementById('nxPrSolVid'); if (!cont) return;
    try {
      const api = getAPI();
      const r = await fetch(`${api.url}/storage/v1/object/sign/documentos/${path}`, {
        method: 'POST',
        headers: { 'apikey': api.key, 'Authorization': 'Bearer ' + (api.token || api.key), 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 3600 })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      const url = `${api.url}/storage/v1${d.signedURL || d.signedUrl}`;
      cont.outerHTML = `<video controls playsinline preload="metadata" src="${esc(url)}" style="width:100%;max-height:260px;background:#000;border-radius:8px;border:1px solid #e2e8f0"></video>`;
    } catch (e) {
      cont.innerHTML = 'No se pudo cargar el video. Recarga la página e intenta de nuevo.';
    }
  };
  window.nxPrSolicitudAprobar = async function (id) {
    const s = _prSolicitudes.find(x => String(x.id) === String(id)); if (!s) return;
    try {
      const ok = (typeof window.swalConfirm === 'function') ? await window.swalConfirm('✅', '¿Aprobar y crear el préstamo?', 'Se creará el préstamo real con los términos de esta solicitud.', { ok: 'Aprobar', color: '#16a34a' }) : window.confirm('¿Aprobar y crear el préstamo real?');
      if (!ok) return;
      const datos = {
        nombre: s.nombre, cedula: s.cedula || '', telefono: s.telefono || '', cliente_id: s.cliente_id || null,
        capital: s.capital, total_devolver: s.total_devolver || s.capital, tasa_interes: s.tasa_interes || 0,
        plazo_meses: s.plazo_meses || null, fecha_prestamo: s.fecha_prestamo || hoy(), modo: s.modo,
        num_cuotas: s.modo === 'cuotas' ? s.num_cuotas : null, frecuencia: s.modo === 'cuotas' ? s.frecuencia : null,
        metodo_interes: s.modo === 'cuotas' ? (s.metodo_interes || 'plano') : 'saldo',
        cuota_fija: (s.modo === 'cuotas' && Number(s.cuota_fija) > 0) ? Number(s.cuota_fija) : null,
        // La nota lista SOLO lo que de verdad llegó en esta solicitud (no se da por hecho
        // que haya video o foto: el flujo pudo cambiar entre una solicitud vieja y una nueva).
        notas: ((s.notas || '') + ' [Firmado por link — ' + ['cédula', 'firma'].concat(s.selfie ? ['foto con cédula'] : []).concat(s.video_path ? ['video de compromiso'] : []).join(', ') + ' en la solicitud ' + String(s.id).slice(0, 8) + ']').trim(),
        created_by_name: nomAdmin()
      };
      const r = await getAPI().post('prestamos', datos);
      const prestamoId = r && r[0] && r[0].id;
      await getAPI().patch('prestamo_solicitudes', 'id=eq.' + id, { estado: 'aprobada', prestamo_id: prestamoId || null, revisado_at: new Date().toISOString(), revisado_por: nomAdmin() });
      try { window.logAudit && window.logAudit('PRESTAMO_SOLICITUD_APROBADA', s.nombre + ' · ' + fmt(s.capital), 'Financiamiento'); } catch (e) {}
      cerrarModal('nxPrSolModal');
      toast('ok', 'Préstamo creado', s.nombre);
      await cargarPrestamos();
      // El expediente (cédula, foto, firma, video) pasa a los Documentos del préstamo, para
      // verlo y manejarlo junto al resto. Va DESPUÉS de recargar (necesita el préstamo en
      // memoria) y no bloquea: si algo falla, el préstamo ya está creado y queda el botón
      // "Traer expediente firmado" en Documentos.
      try {
        if (prestamoId) {
          const n = await copiarExpedienteADocs(prestamoId, s);
          if (n) toast('ok', 'Expediente guardado en Documentos', n + ' archivo(s)');
        }
      } catch (e) { toast('err', 'El préstamo se creó, pero el expediente no se copió', 'Ábrelo en Documentos y toca "Traer expediente firmado".'); }
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al aprobar', String(e && e.message || e)); }
  };
  // ── Pedir corrección: devuelve la solicitud al cliente para que la vuelva a llenar ──────
  // La foto salió borrosa, el video sin sonido, mandó la cédula de otra persona… En vez de
  // rechazarla del todo (que la cierra) o crear un link nuevo (que pierde el hilo), se
  // devuelve a estado `pendiente`: el MISMO link vuelve a servir, porque la función Edge solo
  // acepta envíos de solicitudes pendientes. Lo anterior NO se borra — se sobrescribe cuando
  // el cliente reenvía, así que si nunca vuelve, la evidencia previa sigue ahí.
  window.nxPrSolicitudPedirCorreccion = function (id) {
    const s = _prSolicitudes.find(x => String(x.id) === String(id)); if (!s) return;
    cerrarModal('nxPrCorr');
    const ov = document.createElement('div'); ov.id = 'nxPrCorr'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:440px">
      <div class="mt"><span><i class="ti ti-rotate-clockwise"></i> Pedir corrección</span><button aria-label="Cerrar ventana" class="nxBack" type="button" onclick="document.getElementById('nxPrCorr').remove()"><i class="ti ti-x"></i></button></div>
      <div style="font-size:12px;color:#475569;margin-bottom:10px"><b>${esc(s.nombre || '')}</b> va a recibir el mismo enlace otra vez y podrá volver a subir todo. Lo que mandó antes se queda guardado hasta que envíe lo nuevo.</div>
      <div class="prCard">
        <div style="font-size:10.5px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">¿Qué debe corregir?</div>
        <textarea id="prCorrMotivo" rows="3" placeholder="Ej.: La foto del dorso de la cédula salió borrosa, tómala de nuevo con buena luz." style="width:100%;padding:11px 12px;border:1.5px solid #e6e8ef;border-radius:11px;font-size:14px;font-family:inherit;box-sizing:border-box;outline:none;background:#f8fafc;resize:vertical">${esc(s.correccion_motivo || '')}</textarea>
        <div style="font-size:10.5px;color:#94a3b8;margin-top:4px">Se lo verá en pantalla al abrir el enlace, y va también en el mensaje de WhatsApp.</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn bsm bghost" type="button" style="flex:0 0 auto" onclick="document.getElementById('nxPrCorr').remove()">Cancelar</button>
        <button class="btn bsm bc1" type="button" style="flex:1" onclick="window.nxPrSolicitudReenviar('${id}')"><i class="ti ti-send"></i> Reenviar al cliente</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
  };
  window.nxPrSolicitudReenviar = async function (id) {
    const s = _prSolicitudes.find(x => String(x.id) === String(id)); if (!s) return;
    const motivo = (val('prCorrMotivo') || '').trim();
    if (!motivo) { toast('err', 'Escribe qué debe corregir', 'Es lo que el cliente va a leer.'); return; }
    const btn = document.querySelector('#nxPrCorr .bc1');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Enviando…'; }
    try {
      await getAPI().patch('prestamo_solicitudes', 'id=eq.' + id, {
        estado: 'pendiente', correccion_motivo: motivo, correccion_at: new Date().toISOString(),
        motivo_rechazo: null, revisado_at: new Date().toISOString(), revisado_por: nomAdmin()
      });
      Object.assign(s, { estado: 'pendiente', correccion_motivo: motivo, motivo_rechazo: null });
      try { window.logAudit && window.logAudit('PRESTAMO_SOLICITUD_CORRECCION', s.nombre + ' · ' + motivo.slice(0, 80), 'Financiamiento'); } catch (e) {}
      cerrarModal('nxPrCorr'); cerrarModal('nxPrSolModal');
      await cargarPrestamos();
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
      const msg = `Hola ${(s.nombre || '').split(' ')[0]}, necesitamos que corrijas algo para completar tu préstamo:\n\n${motivo}\n\nEntra otra vez al mismo enlace y vuelve a enviarlo:`;
      window.nxPrLinkFirmaMostrar(id, s.nombre, s.telefono, msg);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Reenviar al cliente'; }
      toast('err', 'No se pudo reenviar', String(e && e.message || e));
    }
  };

  window.nxPrSolicitudRechazar = async function (id) {
    const s = _prSolicitudes.find(x => String(x.id) === String(id)); if (!s) return;
    const motivo = window.prompt('¿Por qué se rechaza? (puedes explicárselo al cliente después)', '');
    if (motivo === null) return;
    try {
      await getAPI().patch('prestamo_solicitudes', 'id=eq.' + id, { estado: 'rechazada', motivo_rechazo: motivo || null, revisado_at: new Date().toISOString(), revisado_por: nomAdmin() });
      try { window.logAudit && window.logAudit('PRESTAMO_SOLICITUD_RECHAZADA', s.nombre, 'Financiamiento'); } catch (e) {}
      cerrarModal('nxPrSolModal');
      toast('ok', 'Solicitud rechazada');
      await cargarPrestamos();
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error', String(e && e.message || e)); }
  };

  window.nxPrestamoBorrar = async function (id) {
    try {
      const ok = (typeof window.swalConfirm === 'function') ? await window.swalConfirm('🗑️', '¿Eliminar este préstamo?', 'Se borran también todos sus pagos. No se puede deshacer.', { ok: 'Eliminar', color: '#ef4444' }) : window.confirm('¿Eliminar este préstamo y todos sus pagos?');
      if (!ok) return;
      await getAPI().del('prestamos', 'id=eq.' + id);
      cerrarModal('nxPrModal');
      toast('ok', 'Préstamo eliminado');
      await cargarPrestamos();
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al eliminar', String(e && e.message || e)); }
  };

  // ── Filtro por estado/tipo ──
  // BUG REAL (encontrado en vivo con agent-browser, barriendo el dock de derecha a
  // izquierda): esta función solo tocaba _prFiltro, nunca _prView — así que desde
  // Clientes/Evaluación/Solicitudes/Reportes, tocar Inicio/Cobros/Activos/Cuotas/
  // Pagados/Crédito (dock, sidebar o la hoja "Más") no hacía NADA en silencio, porque
  // renderLista() decide qué pintar por _prView antes que por _prFiltro. Se fuerza
  // _prView='prestamos' aquí — es el único caso de uso real de esta función en las 7
  // llamadas que existen (dock/sidebar/"Más"/accesos rápidos del dashboard).
  window.nxPrestamoFiltroTipo = function (k) { _prView = 'prestamos'; _prFiltro = k; _prPage = 1; _prQuery = ''; const view = document.getElementById('v-prestamos'); if (view) renderLista(view); };

  // ── Menú "..." de la tarjeta premium ──
  window.nxPrMenu = function (ev, id) {
    if (ev) ev.stopPropagation();
    document.querySelectorAll('.nxFP-menuPop.open').forEach(m => { if (m.id !== 'prMenu_' + id) m.classList.remove('open'); });
    const pop = document.getElementById('prMenu_' + id); if (pop) pop.classList.toggle('open');
  };
  window.nxPrMenuGo = function (ev, id, accion) {
    if (ev) ev.stopPropagation();
    const pop = document.getElementById('prMenu_' + id); if (pop) pop.classList.remove('open');
    if (accion === 'ver') window.nxPrestamoVer(id);
    else if (accion === 'estado') window.nxPrestamoEstadoCuenta(id);
    else if (accion === 'wa') window.nxPrestamoWA(id);
  };

  // ── Acceso rápido "Cobranza" (accesos rápidos) ──
  window.nxPrestamoCobranza = function () { window.nxPrestamoFiltroTipo('vencidos'); };

  // ── Acceso rápido "Reportes": cartera vencida imprimible ──
  window.nxPrestamoReporte = function () {
    const vencidos = _prestamos.filter(esVencido).map(p => ({ p, dias: prDiasVencido(p), saldo: saldoDe(p) })).sort((a, b) => b.dias - a.dias);
    const biz = (function () { try { return (window.CFG && CFG.empresa_nom) || 'NEXUS PRO'; } catch (e) { return 'NEXUS PRO'; } })();
    const totalVenc = vencidos.reduce((s, x) => s + x.saldo, 0);
    const filas = vencidos.length ? vencidos.map(x => `<tr><td>${esc(x.p.nombre || '')}</td><td>${esc(prTipoTxt(x.p))}</td><td style="text-align:center">${x.dias}</td><td style="text-align:right">${fmt(x.saldo)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#888">Sin préstamos vencidos</td></tr>';
    const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes'); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cartera vencida - Financiamiento</title><style>body{font-family:Segoe UI,system-ui,-apple-system,sans-serif;padding:24px;color:#1e293b;max-width:680px;margin:0 auto;font-size:13px}h1{font-size:16px;margin:0 0 2px}h2{font-size:11px;color:#64748b;font-weight:600;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#f8fafc;text-align:left;padding:7px 9px;border-bottom:2px solid #1e293b;font-size:10px;text-transform:uppercase}td{padding:7px 9px;border-bottom:1px solid #e2e8f0}.tot{font-size:14px;font-weight:800;margin-top:14px;text-align:right}</style></head><body>
      <h1>${esc(biz)} — Cartera vencida (Financiamiento)</h1><h2>${new Date().toLocaleDateString('es-DO')} · ${vencidos.length} préstamo(s) vencido(s)</h2>
      <table><tr><th>Cliente</th><th>Tipo</th><th style="text-align:center">Días vencido</th><th style="text-align:right">Saldo</th></tr>${filas}</table>
      <div class="tot">Total vencido: ${fmt(totalVenc)}</div>
      <script>window.print();</` + `script></body></html>`);
    w.document.close();
  };

  // ── Recordatorio / recibo por WhatsApp ──
  window.nxPrestamoWA = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const num = waNumero(p.telefono); if (!num) { toast('err', 'Sin teléfono válido'); return; }
    const nom = (p.nombre || '').split(' ')[0] || '';
    const saldo = saldoDe(p);
    let msg;
    if (p.modo === 'credito') {
      const c = creditoCalc(p);
      msg = `Hola ${nom}, le recordamos su préstamo:\n• Capital pendiente: ${fmt(c.capPend)}\n• Interés pendiente: ${fmt(c.interesPend)}\n• Total a la fecha: ${fmt(c.totalDebe)}` + (c.fechaLimite ? `\n• Fecha límite del capital: ${c.fechaLimite}` : '') + `\n\nGracias.`;
    } else {
      msg = `Hola ${nom}, le recordamos su préstamo:\n• Prestado: ${fmt(p.capital)}\n• A devolver: ${fmt(p.total_devolver)}\n• Pagado: ${fmt(pagadoDe(p))}\n• Saldo pendiente: ${fmt(saldo)}` + (p.modo === 'cuotas' ? `\n• Próxima(s) cuota(s) de ${p.num_cuotas} ${p.frecuencia || ''}` : '') + `\n\nGracias.`;
    }
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  };

  // ── Exportar préstamos a Excel (CSV) ──
  window.nxPrestamoExportar = function () {
    if (!_prestamos.length) { toast('warn', 'No hay préstamos para exportar'); return; }
    const tipoTxt = m => m === 'credito' ? 'Línea de crédito' : m === 'cuotas' ? 'Cuotas fijas' : 'Abonos libres';
    const cab = ['Nombre', 'Cédula', 'Teléfono', 'Tipo', 'Capital', 'Tasa%', 'Cuotas/Plazo', 'Total a devolver', 'Pagado', 'Saldo', 'Estado', 'Vencido', 'Fecha', 'Notas'];
    const filas = _prestamos.map(p => {
      const esC = p.modo === 'credito';
      return [
        p.nombre || '', p.cedula || '', p.telefono || '', tipoTxt(p.modo),
        Math.round(Number(p.capital || 0)), Number(p.tasa_interes || 0),
        esC ? ((p.plazo_meses || '') + ' meses') : (p.modo === 'cuotas' ? ((p.num_cuotas || '') + ' ' + (p.frecuencia || '')) : 'libre'),
        esC ? '' : Math.round(Number(p.total_devolver || 0)),
        Math.round(pagadoDe(p)), Math.round(saldoDe(p)),
        estadoDe(p) === 'pagado' ? 'Pagado' : 'Activo', esVencido(p) ? 'SÍ' : '',
        p.fecha_prestamo || '', (p.notas || '').replace(/[\r\n]+/g, ' ')
      ];
    });
    const esc2 = v => { const s = String(v == null ? '' : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cab, ...filas].map(r => r.map(esc2).join(',')).join('\r\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'prestamos_' + hoy() + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 500);
      toast('ok', 'Excel exportado', _prestamos.length + ' préstamos');
    } catch (e) { toast('err', 'No se pudo exportar', String(e && e.message || e)); }
  };

  // ── Estado de cuenta del prestatario (para imprimir / guardar PDF / compartir) ──
  window.nxPrestamoEstadoCuenta = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const pagos = (_pagosByPrestamo[id] || []).slice().sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const esC = p.modo === 'credito';
    const cc = esC ? creditoCalc(p) : null;
    const empNom = (function () { try { return (window.CFG && CFG.empresa_nom) || (window.ST && ST.config && ST.config.empresa_nom) || 'NEXUS PRO'; } catch (e) { return 'NEXUS PRO'; } })();
    const filasPagos = pagos.length ? pagos.map(x => `<tr><td>${(x.fecha || '').slice(0, 10)}</td><td>${esc(x.metodo || '')}${x.tipo ? ' · ' + esc(x.tipo) : ''}</td><td style="text-align:right">${fmt(x.monto)}</td><td>${esc(x.nota || '')}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#888">Sin pagos</td></tr>';
    const resumen = esC
      ? `<tr><td>Capital prestado</td><td style="text-align:right">${fmt(cc.cap)}</td></tr><tr><td>Pagado a capital</td><td style="text-align:right">${fmt(cc.pagCap)}</td></tr><tr><td>Capital pendiente</td><td style="text-align:right"><b>${fmt(cc.capPend)}</b></td></tr><tr><td>Interés acumulado</td><td style="text-align:right">${fmt(cc.interesAcum)}</td></tr><tr><td>Interés pagado</td><td style="text-align:right">${fmt(cc.pagInt)}</td></tr><tr><td><b>Total a la fecha</b></td><td style="text-align:right"><b>${fmt(cc.totalDebe)}</b></td></tr>${cc.fechaLimite ? `<tr><td>Fecha límite del capital</td><td style="text-align:right">${cc.fechaLimite}</td></tr>` : ''}`
      : `<tr><td>Capital prestado</td><td style="text-align:right">${fmt(p.capital)}</td></tr><tr><td>Total a devolver</td><td style="text-align:right">${fmt(p.total_devolver)}</td></tr><tr><td>Pagado</td><td style="text-align:right">${fmt(pagadoDe(p))}</td></tr><tr><td><b>Saldo pendiente</b></td><td style="text-align:right"><b>${fmt(saldoDe(p))}</b></td></tr>`;
    const tipoTxt = esC ? 'Línea de crédito · ' + (p.tasa_interes || 0) + '%/mes' : p.modo === 'cuotas' ? (p.num_cuotas || 0) + ' cuotas ' + (p.frecuencia || '') + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '%/mes' : '') : 'Abonos libres' + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '% interés' : '');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estado de cuenta - ${esc(p.nombre || '')}</title>
      <style>body{font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#1e293b;max-width:560px;margin:0 auto;padding:18px}h1{font-size:18px;margin:0 0 2px}.sub{color:#475569;font-size:12px;margin-bottom:14px}table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12.5px}td,th{padding:7px 9px;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f3f4f6}.tit{font-size:12px;font-weight:800;color:#475569;margin:6px 0 4px}.box{border:1px solid #e5e7eb;border-radius:10px;padding:4px 10px;margin-bottom:12px}.foot{color:#475569;font-size:11px;text-align:center;margin-top:18px}@media print{.noprint{display:none}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;background:#1e3a6e;margin:-18px -18px 16px;padding:11px 16px"><button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:Segoe UI,system-ui,-apple-system,sans-serif">&#10005; Cerrar</button><span style="color:#fff;font-size:11.5px;opacity:.85;font-family:Segoe UI,system-ui,-apple-system,sans-serif"></span></div>
        <h1>📄 Estado de cuenta</h1>
        <div class="sub">${esc(empNom)} · Generado ${hoy()}</div>
        <div class="box"><table><tr><td>Cliente</td><td style="text-align:right"><b>${esc(p.nombre || '')}</b></td></tr>${p.cedula ? `<tr><td>Cédula</td><td style="text-align:right">${esc(p.cedula)}</td></tr>` : ''}${p.telefono ? `<tr><td>Teléfono</td><td style="text-align:right">${esc(p.telefono)}</td></tr>` : ''}<tr><td>Tipo</td><td style="text-align:right">${esc(tipoTxt)}</td></tr><tr><td>Fecha del préstamo</td><td style="text-align:right">${esc(p.fecha_prestamo || '')}</td></tr></table></div>
        <div class="tit">RESUMEN</div>
        <table>${resumen}</table>
        <div class="tit">PAGOS (${pagos.length})</div>
        <table><thead><tr><th>Fecha</th><th>Método</th><th style="text-align:right">Monto</th><th>Nota</th></tr></thead><tbody>${filasPagos}</tbody></table>
        <button class="noprint" onclick="window.print()" style="width:100%;padding:12px;background:#6d28d9;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer">🖨️ Imprimir / Guardar PDF</button>
        <div class="foot">NEXUS PRO · Préstamos</div>
      </body></html>`;
    try {
      const w = window.open('', '_blank');
      if (!w) { toast('err', 'Permite las ventanas emergentes para ver el estado de cuenta'); return; }
      w.document.write(html); w.document.close();
    } catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };

  // ════════════════════════════════════════════════════════════════
  //  CONTRATO DE PRÉSTAMO (documento imprimible / PDF)
  // ════════════════════════════════════════════════════════════════
  function numLetras(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return 'CERO';
    const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
    const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    function men100(x) {
      if (x <= 20) return U[x];
      if (x < 30) return 'VEINTI' + U[x - 20];
      const d = Math.floor(x / 10), u = x % 10;
      return D[d] + (u ? ' Y ' + U[u] : '');
    }
    function men1000(x) {
      if (x === 100) return 'CIEN';
      const c = Math.floor(x / 100), r = x % 100;
      return ((c ? C[c] + ' ' : '') + (r ? men100(r) : '')).trim();
    }
    let txt = '';
    const millones = Math.floor(n / 1000000), miles = Math.floor((n % 1000000) / 1000), cientos = n % 1000;
    if (millones) txt += (millones === 1 ? 'UN MILLÓN' : men1000(millones) + ' MILLONES') + ' ';
    if (miles) txt += (miles === 1 ? 'MIL' : men1000(miles) + ' MIL') + ' ';
    if (cientos) txt += men1000(cientos);
    return txt.trim();
  }
  function fechaLarga(d) {
    try {
      const dt = new Date(String(d || hoy()).slice(0, 10) + 'T12:00:00');
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return dt.getDate() + ' días del mes de ' + meses[dt.getMonth()] + ' del año ' + dt.getFullYear();
    } catch (e) { return String(d || ''); }
  }
  function empresaNom() { try { return (window.CFG && CFG.empresa_nom) || (window.ST && ST.config && ST.config.empresa_nom) || 'NEXUS PRO'; } catch (e) { return 'NEXUS PRO'; } }

  // ── Configuración del contrato: empresa que presta + datos del abogado ──
  window.nxPrestamoConfig = function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    cerrarModal('nxPrCfg');
    const c = _prCfg || {};
    const fld = (id, lbl, val, ph, extra) => `<div class="fr"><label>${lbl}</label><input id="${id}" class="no-upper" value="${esc(val || '')}" placeholder="${ph || ''}" ${extra || ''}></div>`;
    const ov = document.createElement('div'); ov.id = 'nxPrCfg'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:460px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-settings"></i> Datos del contrato</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrCfg').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11px;color:#475569;margin-bottom:10px">Estos datos saldrán en el contrato de préstamo (el acreedor que presta y la legalización del abogado).</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">EMPRESA / PERSONA QUE PRESTA</div>
          ${fld('cfgEmpNom', 'Nombre del acreedor', c.empresa_nombre, 'Ej: Inversiones XYZ, SRL')}
          <div class="fr-row">
            ${fld('cfgEmpDoc', 'RNC / Cédula', c.empresa_doc, '0-00-00000-0')}
            ${fld('cfgEmpTel', 'Teléfono', c.empresa_telefono, '809-000-0000')}
          </div>
          ${fld('cfgEmpDir', 'Dirección', c.empresa_direccion, 'Calle, sector, ciudad')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">ABOGADO (LEGALIZACIÓN)</div>
          ${fld('cfgAboNom', 'Nombre del abogado(a)', c.abogado_nombre, 'Lic. Nombre Apellido')}
          <div class="fr-row">
            ${fld('cfgAboCed', 'Cédula', c.abogado_cedula, '000-0000000-0')}
            ${fld('cfgAboMat', 'Matrícula (CARD)', c.abogado_matricula, 'No. de matrícula')}
          </div>
          ${fld('cfgAboTel', 'Teléfono / Estudio', c.abogado_telefono, '809-000-0000')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">TESTIGOS (opcional)</div>
          <div class="fr-row">
            ${fld('cfgT1Nom', 'Testigo 1 — nombre', c.testigo1_nombre, 'Nombre Apellido')}
            ${fld('cfgT1Ced', 'Cédula', c.testigo1_cedula, '000-0000000-0')}
          </div>
          <div class="fr-row">
            ${fld('cfgT2Nom', 'Testigo 2 — nombre', c.testigo2_nombre, 'Nombre Apellido')}
            ${fld('cfgT2Ced', 'Cédula', c.testigo2_cedula, '000-0000000-0')}
          </div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxPrCfg').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxPrestamoGuardarConfig()"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };

  window.nxPrestamoGuardarConfig = async function () {
    const body = {
      empresa_nombre: (val('cfgEmpNom') || '').trim() || null,
      empresa_doc: (val('cfgEmpDoc') || '').trim() || null,
      empresa_telefono: (val('cfgEmpTel') || '').trim() || null,
      empresa_direccion: (val('cfgEmpDir') || '').trim() || null,
      abogado_nombre: (val('cfgAboNom') || '').trim() || null,
      abogado_cedula: (val('cfgAboCed') || '').trim() || null,
      abogado_matricula: (val('cfgAboMat') || '').trim() || null,
      abogado_telefono: (val('cfgAboTel') || '').trim() || null,
      testigo1_nombre: (val('cfgT1Nom') || '').trim() || null,
      testigo1_cedula: (val('cfgT1Ced') || '').trim() || null,
      testigo2_nombre: (val('cfgT2Nom') || '').trim() || null,
      testigo2_cedula: (val('cfgT2Ced') || '').trim() || null,
      updated_at: new Date().toISOString()
    };
    // UPSERT atómico (antes era patch y, si no encontraba fila, un post de respaldo con el
    // error silenciado — si algo fallaba (RLS, red, lo que sea) el toast igual decía "Guardado"
    // sin haber escrito nada. Con on_conflict=id queda en una sola llamada, sin ambigüedad, y
    // cualquier error real ahora SÍ se muestra.
    try {
      const api = getAPI();
      const r = await fetch(api.url + '/rest/v1/prestamos_config?on_conflict=id', {
        method: 'POST',
        headers: api.hdr({ Prefer: 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify(Object.assign({ id: 1 }, body))
      });
      if (!r.ok) throw new Error(await r.text());
      const rows = await r.json();
      if (!rows || !rows.length) throw new Error('El servidor no confirmó el guardado');
      _prCfg = Object.assign({}, _prCfg, body);
      cerrarModal('nxPrCfg');
      toast('ok', 'Datos del contrato guardados');
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  window.nxPrestamoContrato = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const esC = p.modo === 'credito';
    const cap = Number(p.capital || 0);
    const cfg = _prCfg || {};
    const acreedor = (cfg.empresa_nombre && cfg.empresa_nombre.trim()) || (function () { try { return (window.CFG && CFG.empresa_nom) || nomAdmin() || empresaNom(); } catch (e) { return empresaNom(); } })();
    const empNom = acreedor;
    const acreedorDet = [
      cfg.empresa_doc ? 'RNC/Cédula No. <b>' + esc(cfg.empresa_doc) + '</b>' : '',
      cfg.empresa_direccion ? 'con domicilio en ' + esc(cfg.empresa_direccion) : '',
      cfg.empresa_telefono ? 'teléfono ' + esc(cfg.empresa_telefono) : ''
    ].filter(Boolean).join(', ');
    const firmaTestigo = (nom, ced) => nom ? `<div class="firma" style="max-width:48%">${esc(nom)}<br><span style="color:#777;font-size:11px">Testigo${ced ? '<br>Céd. ' + esc(ced) : ''}</span></div>` : '';
    // ── Expediente firmado por link: la firma va DENTRO del contrato y la cédula en un anexo.
    // Las imágenes se toman de la solicitud (dataURL ya en memoria) y no de Storage, para que
    // el documento quede autocontenido: se imprime o se guarda en PDF sin depender de la red.
    const solF = _prSolicitudes.find(x => String(x.prestamo_id) === String(id));
    const firmaDeudor = (solF && solF.firma && /^data:/.test(solF.firma)) ? solF.firma : '';
    const fFirma = (solF && solF.revisado_at) ? String(solF.revisado_at).slice(0, 10) : (p.fecha_prestamo || '');
    // Cláusula de firma electrónica: SOLO si de verdad firmó por link. Describe lo que el sistema
    // tiene de verdad (firma manuscrita capturada + cédula + foto + video), sin atribuirle una
    // certificación de entidad autorizada, que este sistema no emite.
    const clausulaFirma = firmaDeudor ? `<p><b>SEXTA — Firma electrónica y expediente digital:</b> Las partes reconocen que EL DEUDOR aceptó y firmó el presente contrato por medios electrónicos, a través de un enlace personal enviado por EL ACREEDOR, en fecha <b>${esc(fFirma)}</b>. Consta en el expediente digital de este préstamo: su firma manuscrita capturada en pantalla, las imágenes de ambas caras de su cédula de identidad y electoral${solF.selfie ? ', una fotografía de su rostro sosteniendo dicha cédula' : ''}${solF.video_path ? ' y una grabación de video en la que declara de viva voz su compromiso de pago en los términos aquí establecidos' : ''}. Las partes otorgan a dicha aceptación electrónica el mismo valor y fuerza obligatoria que a una firma manuscrita, conforme a la Ley No. 126-02 sobre Comercio Electrónico, Documentos y Firmas Digitales.</p>` : '';
    const anexoHTML = firmaDeudor ? `
        <div class="anexo">
          <h2>ANEXO — EXPEDIENTE DE IDENTIDAD</h2>
          <div class="anexoSub">Documentos recibidos de <b>${esc(p.nombre || '')}</b> al firmar electrónicamente el ${esc(fFirma)}.</div>
          ${solF.cedula_frente ? `<div class="anexoIt"><div class="anexoLbl">CÉDULA DE IDENTIDAD — FRENTE</div><img src="${solF.cedula_frente}" alt="Cédula del cliente, lado frontal"></div>` : ''}
          ${solF.cedula_dorso ? `<div class="anexoIt"><div class="anexoLbl">CÉDULA DE IDENTIDAD — DORSO</div><img src="${solF.cedula_dorso}" alt="Cédula del cliente, lado del dorso"></div>` : ''}
          ${solF.selfie ? `<div class="anexoIt"><div class="anexoLbl">FOTOGRAFÍA DEL DEUDOR CON SU CÉDULA</div><img src="${solF.selfie}" alt="Foto del cliente sosteniendo su cédula"></div>` : ''}
          ${solF.video_path ? `<div class="anexoIt"><div class="anexoLbl">VIDEO DE COMPROMISO</div><div class="anexoNota">Grabación archivada en el expediente digital de este préstamo. No puede reproducirse en papel: se consulta desde el sistema, en los Documentos del préstamo.${solF.video_guion ? '<br><br><b>Texto declarado por EL DEUDOR:</b> «' + esc(solF.video_guion) + '»' : ''}</div></div>` : ''}
        </div>` : '';
    const testigosHTML = (cfg.testigo1_nombre || cfg.testigo2_nombre)
      ? `<div style="font-size:12px;text-align:center;color:#475569;margin:36px 0 0;font-weight:700">TESTIGOS</div>
         <div class="firmas" style="margin-top:40px;justify-content:space-around">${firmaTestigo(cfg.testigo1_nombre, cfg.testigo1_cedula)}${firmaTestigo(cfg.testigo2_nombre, cfg.testigo2_cedula)}</div>`
      : '';
    let clausulaPago = '';
    if (esC) {
      const c = creditoCalc(p);
      clausulaPago = `<p><b>SEGUNDA — Intereses:</b> Sobre el capital adeudado se aplicará una tasa de interés de <b>${p.tasa_interes || 0}% mensual</b>, calculada sobre el saldo de capital pendiente. EL DEUDOR se compromete a pagar dichos intereses de forma mensual.</p>
        <p><b>TERCERA — Plazo del capital:</b> EL DEUDOR deberá reembolsar la totalidad del capital prestado a más tardar el día <b>${c.fechaLimite || '____________'}</b>${p.plazo_meses ? ' (plazo de ' + p.plazo_meses + ' meses)' : ''}. EL DEUDOR podrá realizar abonos parciales al capital en cualquier momento, reduciendo así los intereses futuros.</p>`;
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0) {
      const total = Number(p.total_devolver || 0);
      const tieneInt = Number(p.tasa_interes || 0) > 0;
      let cuotaTxt = '';
      if (tieneInt) { const a = amortizar(cap, p.tasa_interes, p.num_cuotas, p.fecha_prestamo, p.frecuencia, p.metodo_interes || 'saldo', Number(p.cuota_fija) || 0); cuotaTxt = fmt(a.cuota); }
      else { cuotaTxt = fmt(total / p.num_cuotas); }
      const ultima = fechaCuota(p.fecha_prestamo, p.frecuencia, p.num_cuotas);
      const primera = fechaCuota(p.fecha_prestamo, p.frecuencia, 1);
      clausulaPago = `<p><b>SEGUNDA — Forma de pago:</b> EL DEUDOR se obliga a devolver la suma total de <b>${fmt(total)}</b>${tieneInt ? ' (capital más intereses al ' + p.tasa_interes + '% mensual)' : ''}, pagadera en <b>${p.num_cuotas} cuotas ${p.frecuencia || ''}</b> de aproximadamente <b>${cuotaTxt}</b> cada una.</p>
        <p><b>TERCERA — Vencimientos:</b> La primera cuota vence el <b>${primera}</b> y la última el <b>${ultima}</b>. El detalle completo consta en la tabla de amortización anexa al estado de cuenta.</p>`;
    } else {
      const total = Number(p.total_devolver || 0);
      const tieneInt = Number(p.tasa_interes || 0) > 0;
      clausulaPago = `<p><b>SEGUNDA — Forma de pago:</b> EL DEUDOR se obliga a devolver la suma total de <b>${fmt(total)}</b>${tieneInt ? ' (capital de ' + fmt(cap) + ' más un ' + p.tasa_interes + '% de interés)' : ''}, mediante abonos libres, sin un calendario fijo de cuotas, hasta saldar la totalidad de la deuda.</p>
        <p><b>TERCERA — Saldo:</b> EL DEUDOR podrá abonar las cantidades que estime convenientes en cualquier momento hasta cubrir el monto total adeudado.</p>`;
    }
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contrato de préstamo - ${esc(p.nombre || '')}</title>
      <style>body{font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:26px 22px;line-height:1.55;font-size:13.5px}h1{font-size:19px;text-align:center;margin:0 0 2px;letter-spacing:1px}.sub{text-align:center;color:#555;font-size:12px;margin-bottom:18px}p{margin:9px 0;text-align:justify}.parte{background:#f6f7f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin:10px 0;font-size:12.5px}.firmas{display:flex;justify-content:space-between;gap:24px;margin-top:54px}.firma{flex:1;text-align:center;border-top:1.5px solid #1a1a1a;padding-top:6px;font-size:12px;position:relative}.firmaImg{position:absolute;left:50%;transform:translateX(-50%);bottom:100%;max-height:58px;max-width:92%;margin-bottom:2px}.anexo{page-break-before:always;margin-top:40px;border-top:2px solid #1a1a1a;padding-top:18px}.anexo h2{font-size:15px;text-align:center;letter-spacing:.6px;margin:0 0 4px}.anexoSub{text-align:center;color:#555;font-size:11.5px;margin-bottom:16px}.anexoIt{margin-bottom:16px;page-break-inside:avoid}.anexoLbl{font-size:10.5px;font-weight:700;color:#555;letter-spacing:.4px;margin-bottom:5px}.anexoIt img{display:block;margin:0 auto;max-width:100%;max-height:420px;width:auto;border:1px solid #ccc;border-radius:6px}.anexoNota{font-size:11.5px;color:#444;background:#f6f7f9;border:1px solid #e2e8f0;border-radius:6px;padding:10px;text-align:justify}.foot{color:#999;font-size:10.5px;text-align:center;margin-top:26px}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;background:#1e3a6e;margin:-26px -22px 18px;padding:11px 16px"><button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:Segoe UI,system-ui,-apple-system,sans-serif">&#10005; Cerrar</button><span style="color:#fff;font-size:11.5px;opacity:.85;font-family:Segoe UI,system-ui,-apple-system,sans-serif"></span></div>
        <h1>CONTRATO DE PRÉSTAMO</h1>
        <div class="sub">${esc(empNom)}</div>
        <p>En la República Dominicana, a los <b>${fechaLarga(p.fecha_prestamo)}</b>, entre las partes que más abajo se identifican, se ha convenido y pactado el siguiente contrato de préstamo:</p>
        <div class="parte"><b>EL ACREEDOR:</b> ${esc(acreedor)}${acreedorDet ? ', ' + acreedorDet : ''}, quien en lo adelante se denominará <b>EL ACREEDOR</b>.</div>
        <div class="parte"><b>EL DEUDOR:</b> ${esc(p.nombre || '____________')}${p.cedula ? ', portador(a) de la cédula de identidad No. <b>' + esc(p.cedula) + '</b>' : ''}${p.telefono ? ', teléfono ' + esc(p.telefono) : ''}, quien en lo adelante se denominará <b>EL DEUDOR</b>.</div>
        <p><b>PRIMERA — Objeto:</b> EL ACREEDOR entrega en este acto a EL DEUDOR, en calidad de préstamo, la suma de <b>${fmt(cap)}</b> (<b>${numLetras(cap)} PESOS DOMINICANOS</b>), que EL DEUDOR declara haber recibido a su entera satisfacción.</p>
        ${clausulaPago}
        <p><b>CUARTA — Mora:</b> La falta de pago en las fechas convenidas facultará a EL ACREEDOR a exigir el saldo total adeudado y a iniciar las acciones legales correspondientes, corriendo por cuenta de EL DEUDOR los gastos y costas que ello genere.</p>
        <p><b>QUINTA — Compromiso de pago (pagaré):</b> EL DEUDOR reconoce deber y se obliga a pagar a EL ACREEDOR la suma antes indicada en las condiciones aquí establecidas, sirviendo el presente documento como pagaré y reconocimiento de deuda.</p>
        ${clausulaFirma}
        <p>Hecho y firmado de buena fe, en dos (2) originales de un mismo tenor y efecto, uno para cada parte${testigosHTML ? ', ante los testigos que firman al pie' : ''}.</p>
        <div class="firmas">
          <div class="firma">EL ACREEDOR<br><span style="color:#777;font-size:11px">${esc(acreedor)}</span></div>
          <div class="firma">${firmaDeudor ? `<img class="firmaImg" src="${firmaDeudor}" alt="Firma de EL DEUDOR">` : ''}EL DEUDOR<br><span style="color:#777;font-size:11px">${esc(p.nombre || '')}${p.cedula ? '<br>Céd. ' + esc(p.cedula) : ''}${firmaDeudor ? '<br>Firmado electrónicamente' : ''}</span></div>
        </div>
        ${testigosHTML}
        ${cfg.abogado_nombre ? `<div style="margin-top:40px;border-top:1px dashed #bbb;padding-top:16px">
          <p style="font-size:12px"><b>LEGALIZACIÓN DE FIRMAS.</b> Yo, <b>${esc(cfg.abogado_nombre)}</b>, Abogado(a) Notario(a)${cfg.abogado_matricula ? ', con Matrícula del Colegio de Abogados de la República Dominicana (CARD) No. <b>' + esc(cfg.abogado_matricula) + '</b>' : ''}${cfg.abogado_cedula ? ', portador(a) de la cédula de identidad y electoral No. <b>' + esc(cfg.abogado_cedula) + '</b>' : ''}${cfg.abogado_telefono ? ', Tel. ' + esc(cfg.abogado_telefono) : ''}, CERTIFICO Y DOY FE de que las firmas que anteceden fueron puestas libre y voluntariamente en mi presencia por las partes contratantes, quienes me declararon que esas son las firmas que acostumbran usar en todos los actos de su vida pública y privada. En la República Dominicana, a los ${fechaLarga(p.fecha_prestamo)}.</p>
          <div class="firmas" style="margin-top:46px"><div class="firma" style="max-width:60%">${esc(cfg.abogado_nombre)}<br><span style="color:#777;font-size:11px">Abogado(a) Notario(a)${cfg.abogado_matricula ? '<br>CARD No. ' + esc(cfg.abogado_matricula) : ''}</span></div></div>
        </div>` : ''}
        ${anexoHTML}
        <button class="noprint" onclick="window.print()" style="width:100%;padding:13px;margin-top:30px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:Segoe UI,system-ui,-apple-system,sans-serif">🖨️ Imprimir / Guardar PDF</button>
        <div class="foot">${esc(empNom)} · Documento generado el ${hoy()}</div>
      </body></html>`;
    try {
      const w = window.open('', '_blank');
      if (!w) { toast('err', 'Permite las ventanas emergentes para ver el contrato'); return; }
      w.document.write(html); w.document.close();
    } catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };

  // ════════════════════════════════════════════════════════════════
  //  DOCUMENTOS DEL PRÉSTAMO (cédula, contrato firmado, garantías…)
  // ════════════════════════════════════════════════════════════════
  const DOCS_BUCKET = 'comprobantes'; // bucket público (mismo que los bauches)
  // `soloLectura`: tipos que NO se suben a mano (llegan del expediente firmado) — se usan
  // para la etiqueta y el ícono de la lista, pero no pintan un tile de subida.
  const DOC_TIPOS = [
    { k: 'cedula', lbl: 'Cédula', ic: 'ti-id' },
    { k: 'contrato', lbl: 'Contrato firmado', ic: 'ti-file-certificate' },
    { k: 'garantia', lbl: 'Garantía', ic: 'ti-shield-check' },
    { k: 'otro', lbl: 'Otro', ic: 'ti-paperclip' },
    { k: 'selfie', lbl: 'Foto con la cédula', ic: 'ti-user-scan', soloLectura: true },
    { k: 'firma', lbl: 'Firma digital', ic: 'ti-signature', soloLectura: true },
    { k: 'video', lbl: 'Video de compromiso', ic: 'ti-video', soloLectura: true }
  ];
  let _docSubiendo = false;

  async function subirDocPrestamo(id, file) {
    const api = getAPI();
    if (!api || !api.url || !api.key) throw new Error('Sin conexión');
    let ext = '';
    if (file.name && file.name.includes('.')) ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext) ext = (file.type && file.type.includes('png')) ? 'png' : (file.type && file.type.includes('pdf')) ? 'pdf' : 'jpg';
    const path = `prestamos/${id}/${Date.now()}.${ext}`;
    const fd = new FormData();
    fd.append('', file, 'doc.' + ext);
    const headers = { 'apikey': api.key, 'Authorization': 'Bearer ' + (api.token || api.key) };
    let resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'POST', headers, body: fd });
    if (!resp.ok && resp.status === 400) {
      resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'PUT', headers, body: fd });
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + (await resp.text()).slice(0, 120));
    return { path: path, url: `${api.url}/storage/v1/object/public/${DOCS_BUCKET}/${path}` };
  }

  // ── Expediente firmado → carpeta DOCS del préstamo ───────────────────────────
  // Las 4 imágenes viven como dataURL en `prestamo_solicitudes`; se suben a Storage igual
  // que cualquier documento subido a mano, para que se vean y se manejen igual que el resto.
  // El VIDEO no se copia: ya está en el bucket privado `documentos` y pesa varios MB —
  // duplicarlo sería tirar espacio. Se guarda una referencia y se firma al abrirlo.
  function dataUrlABlob(du) {
    const partes = String(du || '').split(',');
    const mime = (String(partes[0]).match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(partes[1] || '');
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }
  const EXPEDIENTE_PIEZAS = [
    { campo: 'cedula_frente', tipo: 'cedula', nombre: 'Cédula (frente)' },
    { campo: 'cedula_dorso', tipo: 'cedula', nombre: 'Cédula (dorso)' },
    { campo: 'selfie', tipo: 'selfie', nombre: 'Foto con la cédula' },
    { campo: 'firma', tipo: 'firma', nombre: 'Firma del cliente' }
  ];
  async function copiarExpedienteADocs(prestamoId, s) {
    const p = _prestamos.find(x => String(x.id) === String(prestamoId));
    const arr = (p && Array.isArray(p.documentos)) ? p.documentos.slice() : [];
    const yaEsta = c => arr.some(d => d.origen === 'firma' && d.campo === c);
    let nuevos = 0;
    for (const pieza of EXPEDIENTE_PIEZAS) {
      const du = s[pieza.campo];
      if (!du || !/^data:/.test(String(du)) || yaEsta(pieza.campo)) continue;
      try {
        const blob = dataUrlABlob(du);
        const ext = /png/.test(blob.type) ? 'png' : 'jpg';
        const r = await subirDocPrestamo(prestamoId, new File([blob], pieza.nombre + '.' + ext, { type: blob.type }));
        arr.push({ nombre: pieza.nombre, tipo: pieza.tipo, url: r.url, path: r.path, mime: blob.type, fecha: hoy(), origen: 'firma', campo: pieza.campo, solicitud_id: s.id });
        nuevos++;
      } catch (e) { /* si una pieza falla, se siguen guardando las demás */ }
    }
    // El video: referencia al bucket privado, no una copia.
    if (s.video_path && !yaEsta('video_path')) {
      arr.push({ nombre: 'Video de compromiso', tipo: 'video', privado: true, bucket: 'documentos', path: s.video_path, mime: 'video/mp4', fecha: hoy(), origen: 'firma', campo: 'video_path', solicitud_id: s.id });
      nuevos++;
    }
    if (!nuevos) return 0;
    await getAPI().patch('prestamos', 'id=eq.' + prestamoId, { documentos: arr });
    if (p) p.documentos = arr;
    return nuevos;
  }
  // Para préstamos aprobados ANTES de que existiera esta copia automática (o si una pieza
  // falló al aprobar): trae el expediente a Docs a pedido, sin repetir lo que ya está.
  window.nxPrestamoTraerExpediente = async function (id) {
    const s = _prSolicitudes.find(x => String(x.prestamo_id) === String(id));
    if (!s) { toast('err', 'Este préstamo no se creó desde un link de firma'); return; }
    toast('ok', 'Trayendo el expediente…');
    try {
      const n = await copiarExpedienteADocs(id, s);
      toast('ok', n ? 'Expediente guardado en Documentos' : 'El expediente ya estaba guardado', n ? n + ' archivo(s)' : '');
      window.nxPrestamoDocs(id);
    } catch (e) { toast('err', 'No se pudo traer el expediente', String(e && e.message || e).slice(0, 90)); }
  };
  // Los archivos del bucket privado no tienen URL pública: se firma una temporal al abrirlos.
  window.nxPrDocVerPrivado = async function (bucket, path) {
    try {
      const api = getAPI();
      const r = await fetch(`${api.url}/storage/v1/object/sign/${bucket}/${path}`, {
        method: 'POST',
        headers: { 'apikey': api.key, 'Authorization': 'Bearer ' + (api.token || api.key), 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 3600 })
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      window.open(`${api.url}/storage/v1${d.signedURL || d.signedUrl}`, '_blank');
    } catch (e) { toast('err', 'No se pudo abrir el archivo', String(e && e.message || e).slice(0, 90)); }
  };

  window.nxPrestamoSubirDoc = async function (id, input, tipo) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!/^image\//.test(file.type) && !/pdf$/i.test(file.type || '') && !/\.(jpg|jpeg|png|webp|pdf|heic)$/i.test(file.name || '')) {
      toast('err', 'Archivo no válido', 'Sube una imagen o PDF'); input.value = ''; return;
    }
    if (_docSubiendo) return;
    _docSubiendo = true;
    const p = _prestamos.find(x => String(x.id) === String(id));
    toast('ok', 'Subiendo documento…', file.name);
    try {
      const r = await subirDocPrestamo(id, file);
      const arr = Array.isArray(p.documentos) ? p.documentos.slice() : [];
      arr.push({ nombre: file.name, tipo: tipo || 'otro', url: r.url, path: r.path, mime: file.type || '', fecha: hoy() });
      await getAPI().patch('prestamos', 'id=eq.' + id, { documentos: arr });
      p.documentos = arr;
      toast('ok', 'Documento guardado', file.name);
      window.nxPrestamoDocs(id);
    } catch (e) {
      toast('err', 'No se pudo subir el documento', String(e && e.message || e).slice(0, 90));
    }
    _docSubiendo = false;
    try { input.value = ''; } catch (e) {}
  };

  window.nxPrestamoBorrarDoc = async function (id, idx) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const arr = Array.isArray(p.documentos) ? p.documentos.slice() : [];
    const doc = arr[idx]; if (!doc) return;
    if (!confirm('¿Eliminar el documento "' + (doc.nombre || '') + '"?')) return;
    arr.splice(idx, 1);
    try {
      await getAPI().patch('prestamos', 'id=eq.' + id, { documentos: arr });
      p.documentos = arr;
      // Intentar borrar el archivo del storage (sin bloquear si falla)
      try {
        const api = getAPI();
        if (doc.path && api) await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${doc.path}`, { method: 'DELETE', headers: { 'apikey': api.key, 'Authorization': 'Bearer ' + (api.token || api.key) } });
      } catch (e) {}
      toast('ok', 'Documento eliminado');
      window.nxPrestamoDocs(id);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  window.nxPrestamoDocs = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    cerrarModal('nxPrDocs');
    const docs = Array.isArray(p.documentos) ? p.documentos : [];
    const tiles = DOC_TIPOS.filter(t => !t.soloLectura).map(t => `
      <label style="flex:1 1 70px;min-width:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:11px 6px;text-align:center">
        <input type="file" accept="image/*,.pdf" style="display:none" onchange="window.nxPrestamoSubirDoc('${id}',this,'${t.k}')">
        <i class="ti ${t.ic}" style="font-size:20px;color:#6d28d9"></i>
        <span style="font-size:10px;font-weight:700;color:#475569;line-height:1.1">${t.lbl}</span>
      </label>`).join('');
    const lista = docs.length ? docs.map((d, i) => {
      const t = DOC_TIPOS.find(t => t.k === d.tipo) || {};
      const tlbl = t.lbl || 'Documento';
      const ico = d.privado ? (t.ic || 'ti-video') : /pdf/i.test(d.mime || d.url || '') ? 'ti-file-type-pdf' : (t.soloLectura && t.ic) ? t.ic : 'ti-photo';
      // Los privados (video) no tienen URL pública: se firma una temporal al abrirlos.
      const abrir = d.privado
        ? `window.nxPrDocVerPrivado('${esc(d.bucket || 'documentos')}','${esc(d.path || '')}')`
        : `window.nxVerComprobante && window.nxVerComprobante('${esc(d.url)}')`;
      return `<div style="display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid #f1f5f9">
          <i class="ti ${ico}" style="font-size:18px;color:${d.origen === 'firma' ? '#6d28d9' : '#475569'}"></i>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.nombre || tlbl)}</div>
            <div style="font-size:10px;color:#475569">${esc(tlbl)} · ${esc((d.fecha || '').slice(0, 10))}${d.origen === 'firma' ? ' · <b style="color:#6d28d9">Firmado por link</b>' : ''}</div>
          </div>
          <button class="btn bsm bghost" type="button" onclick="${abrir}" title="Ver" aria-label="Ver"><i class="ti ti-eye" style="color:#6d28d9"></i></button>
          <button class="btn bsm bghost" type="button" onclick="window.nxPrestamoBorrarDoc('${id}',${i})" title="Eliminar" aria-label="Eliminar"><i class="ti ti-minus" style="color:#dc2626"></i></button>
        </div>`;
    }).join('') : '<div style="color:#475569;font-size:11px;padding:14px;text-align:center">Sin documentos. Toca un tipo arriba para subir.</div>';
    // Si el préstamo nació de un link de firma pero su expediente todavía no está aquí
    // (aprobado antes de esta versión, o una pieza falló), se puede traer a pedido.
    const solFirma = _prSolicitudes.find(x => String(x.prestamo_id) === String(id));
    const faltaExpediente = solFirma && !docs.some(d => d.origen === 'firma');
    const avisoExp = faltaExpediente
      ? `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:10px;margin-bottom:10px">
          <div style="font-size:11.5px;color:#4c1d95;margin-bottom:7px">Este préstamo se firmó por link. Trae aquí la cédula, la foto, la firma y el video.</div>
          <button class="btn bsm bc1" type="button" style="width:100%" onclick="window.nxPrestamoTraerExpediente('${id}')"><i class="ti ti-download"></i> Traer expediente firmado</button>
        </div>` : '';
    const ov = document.createElement('div'); ov.id = 'nxPrDocs'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:86vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-folder"></i> Documentos del préstamo</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrDocs').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11.5px;color:#64748b;font-weight:700;margin-bottom:8px">${esc(p.nombre || '')} · ${esc(prRef(p))}</div>
          ${avisoExp}
          <div style="font-size:11px;color:#475569;margin-bottom:8px">Sube cédula, contrato firmado, garantías u otros archivos (imágenes o PDF).</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${tiles}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:4px 0 4px">ARCHIVOS (${docs.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${lista}</div>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };

  // ── Estilos del formulario + tile del dashboard ──
  function inyectarCSS() {
    if (document.getElementById('nxPrestamosCSS')) return;
    const st = document.createElement('style'); st.id = 'nxPrestamosCSS';
    st.textContent = '.nxPrForm{font-family:"Plus Jakarta Sans",var(--ff),sans-serif}.nxPrForm .mt{font-weight:800}.nxPrForm .prCard{background:#fff;border:1px solid #ece9f7;border-radius:14px;padding:13px 14px;margin-bottom:11px;box-shadow:0 1px 3px rgba(76,29,149,.05)}.nxPrForm .prCard>div:first-child{margin-top:0 !important}.nxPrForm .prCard>.fr:last-child,.nxPrForm .prCard>.fr-row:last-child,.nxPrForm .prCard>div:last-child{margin-bottom:0}.nxPrForm .fr{margin-bottom:11px;min-width:0}.nxPrForm .fr>label{font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:5px}.nxPrForm .fr input,.nxPrForm .fr select,.nxPrForm .fr textarea{width:100%;padding:11px 12px;border:1.5px solid #e6e8ef;border-radius:11px;font-size:14px;box-sizing:border-box;outline:none;background:#f8fafc;color:#1e293b;font-family:inherit;transition:border-color .15s,background .15s,box-shadow .15s}.nxPrForm .fr input:focus,.nxPrForm .fr select:focus,.nxPrForm .fr textarea:focus{border-color:#6d28d9;background:#fff;box-shadow:0 0 0 3px rgba(109,40,217,.12)}.nxPrForm .fr-row{display:flex;gap:8px;flex-wrap:wrap}.nxPrForm .fr-row>.fr{flex:1 1 132px}.nxPrForm .prSeg{display:flex;gap:6px}.nxPrForm .prSeg>button{flex:1;padding:9px 6px;border:1.5px solid #e6e8ef;border-radius:11px;background:#f8fafc;color:#475569;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .15s}.nxPrForm .prSeg>button.on{background:#6d28d9;border-color:#6d28d9;color:#fff}.nxPrActs{display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:6px}.nxPrActs>.nxPrAcc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;min-width:0;height:54px;padding:6px 3px;margin:0;font-family:inherit;font-size:10.5px;line-height:1.1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;color:#475569;cursor:pointer;transition:opacity .15s}.nxPrActs>.nxPrAcc i{font-size:17px;flex:0 0 auto;margin:0;color:#475569}.nxPrActs>.nxPrAcc:active{opacity:.6}.nxPrActs>.nxPrAcc.wa{border-color:#bbf7d0;background:#f0fdf4;color:#16a34a}.nxPrActs>.nxPrAcc.wa i{color:#16a34a}.nxPrActs>.nxPrAcc.del{color:#dc2626}.nxPrActs>.nxPrAcc.del i{color:#dc2626}.nxPrPagar.nxPrPagar{display:flex;width:fit-content;min-width:0;min-height:0;height:auto;margin:0 auto 8px;padding:6px 18px;font-size:11.5px;line-height:1;align-items:center;gap:5px}.nxPrPagar.nxPrPagar i{font-size:14px}.nxMeGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.nxMeCard{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;cursor:pointer;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,.04);transition:box-shadow .15s,opacity .15s}.nxMeCard:hover{box-shadow:0 6px 18px rgba(0,0,0,.1)}.nxMeCard:active{opacity:.85}.nxMeIco{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:25px;flex:0 0 auto}.nxMeTxt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.nxMeNom{font-size:14.5px;font-weight:800;color:#1e293b}.nxMeDesc{font-size:11px;color:#475569;line-height:1.25}.nxMeArr{color:#cbd5e1;font-size:18px;flex:0 0 auto}.nxBack{display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:9px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex:0 0 auto}.nxBack i{font-size:15px}.nxBack:active{opacity:.65}.mt:has(.nxBack){gap:8px}' +
      '.nxPrDetWide{max-width:640px}.nxPrBar{height:9px;background:#ede9fe;border-radius:20px;overflow:hidden;margin:6px 0 2px}.nxPrBar>div{height:100%;background:linear-gradient(90deg,#6d28d9,#8b5cf6);border-radius:20px}' +
      '.nxPrTl{display:flex;flex-direction:column;gap:0}.nxPrTlItem{display:flex;gap:10px;padding:0 0 14px;position:relative}.nxPrTlItem:last-child{padding-bottom:0}.nxPrTlDot{width:22px;height:22px;border-radius:50%;background:#6d28d9;color:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;z-index:1}.nxPrTlItem:not(:last-child)::before{content:"";position:absolute;left:10px;top:22px;bottom:0;width:2px;background:#ede9fe}.nxPrTlTxt b{display:block;font-size:12px;color:#1e1b4b}.nxPrTlTxt span{font-size:10.5px;color:#94a3b8}.overlay.nxPrOvFull{padding:0;align-items:stretch;justify-content:stretch}.overlay.nxPrOvFull>.modal.nxPrFormFull{max-width:100%!important;width:100%;height:100dvh;max-height:100dvh;border-radius:0;margin:0;padding:0;box-shadow:none;border:0;background:#f8fafc;display:flex;flex-direction:column;animation:none}.nxPrFormFull>.nxPrFormTop{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;background:#fff;border-bottom:1px solid #e6e8ef;font-weight:800;color:#1e1b4b;font-size:15px}.nxPrFormFull>.nxPrFormTop>span{display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nxPrFormFull>.nxPrFormScroll{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 14px}.nxPrFormFull .nxPrFormInner{max-width:640px;margin:0 auto}.nxPrFormFull>.nxPrFormFoot{flex:0 0 auto;padding:12px 14px;background:#fff;border-top:1px solid #e6e8ef}';
    document.head.appendChild(st);
  }

  function inyectarTile() {
    if (document.getElementById('qaMultiempresa')) return true;
    if (!esAdmin()) return false;
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    const qa = vDash.querySelector('.qa');
    if (!qa || !qa.parentElement) return false;
    const btn = document.createElement('div');
    btn.className = 'qa'; btn.setAttribute('tabindex','0'); btn.setAttribute('role','button'); btn.onkeydown=function(e){if(e.keyCode===13||e.keyCode===32){e.preventDefault();this.click();}}; btn.id = 'qaMultiempresa';
    btn.setAttribute('onclick', 'window.nxAbrirMultiempresa && window.nxAbrirMultiempresa()');
    btn.innerHTML = '<span class="qa-i"><i class="ti ti-building-skyscraper qa-ico c-esmeralda"></i></span><div class="qa-l">Multiempresa</div>';
    qa.parentElement.appendChild(btn);
    return true;
  }

  function init() { inyectarCSS(); let n = 0; const t = function () { n++; if (inyectarTile()) return; if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  try { window.addEventListener('nexus:reinit', function () { try { inyectarTile(); } catch (e) {} }); } catch (e) {}
})();

