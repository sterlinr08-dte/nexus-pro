/* NEXUS PRO · 59.82 — Facturas, Cobros e Historial de pagos: lectura más clara (06-nov-2026).
   Solo visual y claridad. No cambia cálculos, filtros, guardados ni consultas: lee lo que ya pintaron
   rFact(), rCob(), aplicarFiltrosPagos() y rPagos() y lo deja más fácil de leer.
   1. Listas vacías que explican POR QUÉ están vacías y ofrecen el arreglo a un toque:
      · Facturas: «el mes no tiene facturas», «todas están pagadas» (Ver todas), «la búsqueda o el agente
        no coinciden» (Quitar búsqueda y agente) y «no hay atrasadas» (sin emoji).
      · Cobros: «ningún cliente coincide» (Quitar filtros).
      · Historial: «no hay pagos con estos filtros» (Quitar filtros, sin tocar el período ni las fechas)
        y, si la carga falla, «Volver a intentar».
   2. Historial de pagos: la fecha se lee «jue 6 nov» en vez de «2026-11-06» (el año solo si no es el actual).
      La fecha original queda en el título de la celda. Ordenar y exportar siguen usando el dato de siempre.
   3. Historial en el celular: si el pago no tiene banco o no dice quién lo registró, no se muestra
      «Banco: —» ni «Registró: —» (antes cortaban la línea y el banco salía «Banc…»).
   Apagar en un equipo: localStorage.nx_facturas_cobros_ui_off='1' (vuelve todo como antes). */
(function () {
  'use strict';
  if (window.__nxFcuUI) return; window.__nxFcuUI = true;
  try { if (localStorage.getItem('nx_facturas_cobros_ui_off') === '1') return; } catch (e) {}

  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIA3 = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const val = id => { const e = document.getElementById(id); return e ? String(e.value || '') : ''; };
  const G = n => { try { switch (n) {
    case 'ST': return typeof ST !== 'undefined' ? ST : window.ST;
    case 'mesCorte': return typeof mesCorte === 'function' ? mesCorte : window.mesCorte;
    default: return window[n];
  } } catch (e) { return window[n]; } };
  const llamar = (n, ...a) => { try { const f = window[n]; if (typeof f === 'function') return f(...a); } catch (e) { console.warn('[fcu]', n, e); } };

  /* ── estilos (tema oscuro por defecto y claro) ─────────────────────────────── */
  const css = `
  .nxFcuVacio{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:28px 16px 24px;margin:4px 0 8px;border-radius:16px;border:1px dashed rgba(148,163,184,.28);background:rgba(148,163,184,.06);font-family:inherit}
  .nxFcuVacio .ic{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;background:rgba(59,130,246,.14);color:#60a5fa}
  .nxFcuVacio.ok .ic{background:rgba(34,197,94,.14);color:#4ade80}
  .nxFcuVacio.err .ic{background:rgba(239,68,68,.14);color:#f87171}
  .nxFcuVacio b{font-size:15px;font-weight:700;line-height:1.3;color:#f1f5f9;letter-spacing:-.005em;text-transform:none}
  .nxFcuVacio span{font-size:13px;line-height:1.45;color:#94a3b8;max-width:340px;text-transform:none;letter-spacing:0}
  .nxFcuVacio .acc{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px}
  .nxFcuVacio .acc button{min-height:44px;min-width:44px;padding:0 18px;border-radius:999px;font-family:inherit;font-size:14px;font-weight:600;line-height:1;cursor:pointer;border:1px solid rgba(96,165,250,.45);background:rgba(37,99,235,.18);color:#bfdbfe;text-transform:none;letter-spacing:0;transition:transform .16s cubic-bezier(.22,1,.36,1),background .16s}
  .nxFcuVacio .acc button.sec{border-color:rgba(148,163,184,.3);background:transparent;color:#cbd5e1}
  .nxFcuVacio .acc button:active{transform:scale(.96)}
  .nxFcuVacio .acc button:focus-visible{outline:none;box-shadow:0 0 0 4px rgba(59,130,246,.35)}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio{background:#f8fafc;border-color:rgba(15,23,42,.12)}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio b{color:#0f172a}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio span{color:#475569}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio .ic{background:#eff6ff;color:#1d4ed8}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio.ok .ic{background:#f0fdf4;color:#15803d}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio.err .ic{background:#fef2f2;color:#b91c1c}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio .acc button{background:#2563eb;border-color:#2563eb;color:#fff}
  html:is(.tema-claro,[data-nx-tema="clasico"]) .nxFcuVacio .acc button.sec{background:#fff;border-color:rgba(15,23,42,.14);color:#0f172a}
  #tbPagos td[data-lb="Fecha"].nxFcuF{font-variant-numeric:tabular-nums;white-space:nowrap}
  @media(max-width:720px){
    #panelPagos table.sf-tbl td.nxFcuSinDato{display:none!important}
  }
  @media (prefers-reduced-motion:reduce){.nxFcuVacio .acc button{transition:none}}
  `;
  function ponerCSS() {
    if (document.getElementById('nxFcuCSS')) return;
    const s = document.createElement('style'); s.id = 'nxFcuCSS'; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ── bloque de lista vacía ───────────────────────────────────────────────── */
  // acciones: [{t:'Texto', k:'clave', sec:true}]
  function vacioHTML(tipo, icono, titulo, texto, acciones) {
    return `<div class="nxFcuVacio ${tipo || ''}" role="status" data-nxfcu="1"><div class="ic" aria-hidden="true"><i class="ti ${icono}"></i></div>` +
      `<b>${esc(titulo)}</b>${texto ? `<span>${esc(texto)}</span>` : ''}` +
      (acciones && acciones.length ? `<div class="acc">${acciones.map(a => `<button type="button" data-fcu="${a.k}"${a.sec ? ' class="sec"' : ''}>${esc(a.t)}</button>`).join('')}</div>` : '') +
      `</div>`;
  }
  const soloVacio = tb => { if (!tb) return null; const e = tb.querySelector(':scope > .empty'); return e && tb.children.length === 1 ? e : null; };
  const limpiarLupa = (boxId, hiddenId) => {
    const h = document.getElementById(hiddenId); if (h) h.value = '';
    try { if (window.__nbiReg && window.__nbiReg[hiddenId]) window.__nbiReg[hiddenId].term = ''; } catch (e) {}
    const b = document.getElementById(boxId); if (b) b.innerHTML = ''; // la función pintarLupa* la vuelve a dibujar limpia
  };
  const nombreMes = (m, a) => (MES[(m || 1) - 1] || '') + ' ' + a;

  /* Facturas */
  function vacioFacturas(tb) {
    const e = soloVacio(tb); if (!e) return;
    const ST_ = G('ST') || {}; const fac = ST_.facturas || [];
    const mc = (G('mesCorte') || (() => ({ mes: new Date().getMonth() + 1, anio: new Date().getFullYear() })))();
    const mes = parseInt(val('fMes') || mc.mes, 10), anio = parseInt(val('fAnio') || mc.anio, 10);
    const key = `${anio}-${String(mes).padStart(2, '0')}`, hoyKey = `${mc.anio}-${String(mc.mes).padStart(2, '0')}`;
    const est = val('fFactEstado') || 'activas';
    const q = (val('factQ') || '').trim(), ag = val('fAgenteFact');
    const atrasadasN = fac.filter(f => f.periodo < hoyKey && f.estado !== 'Pagado' && f.estado !== 'Anulada').length;
    let h;
    if (q || ag) {
      h = vacioHTML('', 'ti-search-off', 'Ninguna factura coincide', (q ? `Búsqueda: «${q}». ` : '') + (ag ? 'Hay un agente elegido. ' : '') + 'Quite el filtro para ver la lista completa.', [{ t: 'Quitar búsqueda y agente', k: 'fact-limpiar' }]);
    } else if (est === 'atrasadas') {
      h = vacioHTML('ok', 'ti-circle-check', 'No hay facturas atrasadas', 'Ningún cliente debe meses anteriores.', [{ t: 'Ver las del mes', k: 'fact-activas', sec: true }]);
    } else {
      const delMes = fac.filter(f => f.periodo === key);
      const nm = nombreMes(mes, anio);
      const acc = [];
      if (!delMes.length) {
        if (key !== hoyKey) acc.push({ t: 'Ir al mes en curso', k: 'fact-hoy' });
        if (atrasadasN) acc.push({ t: `Ver atrasadas (${atrasadasN})`, k: 'fact-atrasadas', sec: true });
        h = vacioHTML('', 'ti-file-invoice', `Aún no hay facturas de ${nm}`, key === hoyKey ? 'Para crearlas use «Generar», arriba.' : 'Ese mes no tiene facturas.', acc);
      } else {
        const txtEst = { activas: 'pendientes', Pendiente: 'pendientes', Parcial: 'parciales', Pagado: 'pagadas', Anulada: 'anuladas' }[est] || '';
        acc.push({ t: `Ver todas (${delMes.length})`, k: 'fact-todas' });
        if (atrasadasN && est === 'activas') acc.push({ t: `Ver atrasadas (${atrasadasN})`, k: 'fact-atrasadas', sec: true });
        const todasPag = (est === 'activas' || est === 'Pendiente') && delMes.every(f => f.estado === 'Pagado' || f.estado === 'Anulada');
        h = todasPag
          ? vacioHTML('ok', 'ti-circle-check', `Todo cobrado en ${nm}`, `Las ${delMes.length} facturas del mes están pagadas o anuladas.`, acc)
          : vacioHTML('', 'ti-filter', `No hay facturas ${txtEst} en ${nm}`, `El mes tiene ${delMes.length} en total.`, acc);
      }
    }
    tb.innerHTML = h;
  }
  /* Cobros */
  function vacioCobros(tb) {
    if (!soloVacio(tb)) return;
    const q = val('cobQ').trim(), ag = val('fAgenteCob'), est = val('fCobEst');
    let h;
    if (q || ag) h = vacioHTML('', 'ti-search-off', 'Ningún cliente coincide', (q ? `Búsqueda: «${q}». ` : '') + 'Quite los filtros para ver a todos.', [{ t: 'Quitar filtros', k: 'cob-limpiar' }]);
    else if (est === 'deuda') h = vacioHTML('ok', 'ti-circle-check', 'Nadie tiene deuda pendiente', 'Todos los clientes activos están al día.', [{ t: 'Ver a todos', k: 'cob-limpiar', sec: true }]);
    else if (est === 'aldia') h = vacioHTML('', 'ti-alert-triangle', 'Ningún cliente está al día', 'Todos los clientes activos deben algo.', [{ t: 'Ver a todos', k: 'cob-limpiar', sec: true }]);
    else h = vacioHTML('', 'ti-users', 'No hay clientes activos', 'Cuando registre clientes, aparecerán aquí.', []);
    tb.innerHTML = h;
  }
  /* Historial de pagos */
  function vacioPagos(tb) {
    const e = soloVacio(tb); if (!e) return;
    const t = (e.textContent || '').toLowerCase();
    if (/error/.test(t)) { tb.innerHTML = vacioHTML('err', 'ti-wifi-off', 'No se pudieron cargar los pagos', 'Revise la conexión e intente otra vez.', [{ t: 'Volver a intentar', k: 'pag-reintentar' }]); return; }
    if (!/no hay pagos/.test(t)) return; // «Cargando pagos…» se deja como está
    const hay = ['pgBuscar', 'pgEmpresa', 'pgAgente', 'pgMetodo', 'pgBanco'].some(id => val(id));
    tb.innerHTML = hay
      ? vacioHTML('', 'ti-filter-off', 'No hay pagos con estos filtros', 'El período y las fechas se quedan igual.', [{ t: 'Quitar filtros', k: 'pag-limpiar' }])
      : vacioHTML('', 'ti-calendar', 'No hay pagos en estas fechas', 'Elija otro período arriba.', []);
  }

  /* acciones de los botones (todas usan las funciones que ya existen) */
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('.nxFcuVacio [data-fcu]'); if (!b) return;
    ev.preventDefault();
    const k = b.getAttribute('data-fcu');
    const setv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    if (k === 'fact-limpiar') { limpiarLupa('factQLupa', 'factQ'); setv('fAgenteFact', ''); llamar('rFact'); }
    else if (k === 'fact-todas') { setv('fFactEstado', 'todas'); llamar('rFact'); }
    else if (k === 'fact-activas') { setv('fFactEstado', 'activas'); llamar('rFact'); }
    else if (k === 'fact-atrasadas') { setv('fFactEstado', 'atrasadas'); llamar('rFact'); }
    else if (k === 'fact-hoy') { const mc = (G('mesCorte') || (() => null))(); if (mc) { setv('fMes', String(mc.mes)); setv('fAnio', String(mc.anio)); } llamar('rFact'); }
    else if (k === 'cob-limpiar') { limpiarLupa('cobQLupa', 'cobQ'); setv('fAgenteCob', ''); setv('fCobEst', ''); llamar('rCob'); }
    else if (k === 'pag-limpiar') { limpiarLupa('pgBuscarLupa', 'pgBuscar'); ['pgEmpresa', 'pgAgente', 'pgMetodo', 'pgBanco'].forEach(id => setv(id, '')); llamar('pintarLupaPagos'); llamar('rPagos'); }
    else if (k === 'pag-reintentar') { llamar('rPagos'); }
  }, true);

  /* fecha legible y celdas vacías del historial */
  function fechaCorta(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return null;
    const a = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(a, mo - 1, d); if (isNaN(dt)) return null;
    return `${DIA3[dt.getDay()]} ${d} ${MES3[mo - 1]}` + (a !== new Date().getFullYear() ? ` ${a}` : '');
  }
  function pulirPagos(tb) {
    tb.querySelectorAll('td[data-lb="Fecha"]:not(.nxFcuF)').forEach(td => {
      const iso = (td.textContent || '').trim(); const f = fechaCorta(iso);
      td.classList.add('nxFcuF');
      if (f) { td.textContent = f; td.title = iso; td.setAttribute('aria-label', 'Fecha ' + iso); }
    });
    tb.querySelectorAll('td:is([data-lb="Banco"],[data-lb="Usuario"]):not(.nxFcuR)').forEach(td => {
      td.classList.add('nxFcuR');
      const t = (td.textContent || '').trim(); if (!t || t === '—' || t === '-') td.classList.add('nxFcuSinDato');
    });
  }

  /* ── vigilar las tres listas (no se tocan las funciones originales) ─────────── */
  function vigilar(id, fn) {
    const tb = document.getElementById(id); if (!tb) return false;
    if (tb.__nxFcu) return true; tb.__nxFcu = true;
    let pend = false;
    const correr = () => { pend = false; try { fn(tb); } catch (e) { console.warn('[fcu]', id, e); } };
    new MutationObserver(() => { if (!pend) { pend = true; Promise.resolve().then(correr); } }).observe(tb, { childList: true });
    correr();
    return true;
  }
  function iniciar() {
    ponerCSS();
    const okF = vigilar('tbFact', vacioFacturas);
    const okC = vigilar('tbCob', vacioCobros);
    const okP = vigilar('tbPagos', tb => { vacioPagos(tb); pulirPagos(tb); });
    if (!(okF && okC && okP)) setTimeout(iniciar, 600);
  }
  window.__nxFcuUIApi = { fechaCorta };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
