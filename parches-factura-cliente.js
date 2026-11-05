/* NEXUS PRO · 59.78 — «Generar factura» de UN cliente, eligiendo el mes o los meses (dueño, 05-nov-2026:
   «botón estratégico de cuando se crea un cliente… que se le genere una factura solamente a ese cliente»; eligió la
   opción A «que pueda elegir el mes o los meses»).
   · Al registrar un cliente NUEVO (activo y con facturación permitida) se ofrece «Generar su factura».
   · En la ficha del cliente, «Nueva factura» abre la misma ventana (antes solo abría la lista de Facturas filtrada).
   · Cada mes elegido llama a la MISMA RPC atómica de la facturación mensual: seguros_generar_factura_manual
     (FOR UPDATE + anti-duplicado por período + NCF + asiento + auditoría). Los meses ya facturados no se pueden elegir;
     si la auto-facturación o otra persona llega antes, la RPC lo salta («ya existe»). Se generan del más viejo al más
     nuevo y al final se resincroniza el estado de las facturas del cliente.
   · Precio: el especial del cliente si lo tiene (getPTReal/getPDReal), si no el del plan — igual que genFacturas.
   · Cada factura dispara la automatización de WhatsApp «Factura generada» que ya está activa (la ventana lo dice).
   Apagar: localStorage.nx_fact_cli_off='1' (vuelve el «Nueva factura» de antes y no se ofrece al registrar). */
(function () {
  'use strict';
  if (window.__nxFactCli) return; window.__nxFactCli = true;
  try { if (localStorage.getItem('nx_fact_cli_off') === '1') return; } catch (e) {}

  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const MES3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const money = n => 'RD$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const toast = (t, a, b) => { try { window.toast && window.toast(t, a, b || ''); } catch (e) {} };
  // Funciones y variables globales del index (algunas son let/const: no viven en window, se leen por su nombre).
  const G = n => { try { switch (n) {
    case 'ST': return typeof ST !== 'undefined' ? ST : window.ST;
    case 'API': return typeof API !== 'undefined' ? API : window.API;
    case 'sesion': return typeof sesion !== 'undefined' ? sesion : window.sesion;
    case 'editCliId': return typeof editCliId !== 'undefined' ? editCliId : window.editCliId;
    case 'getPTReal': return typeof getPTReal !== 'undefined' ? getPTReal : window.getPTReal;
    case 'getPDReal': return typeof getPDReal !== 'undefined' ? getPDReal : window.getPDReal;
    case 'getPT': return typeof getPT !== 'undefined' ? getPT : window.getPT;
    case 'getPD': return typeof getPD !== 'undefined' ? getPD : window.getPD;
    case 'hoyRD': return typeof hoyRD !== 'undefined' ? hoyRD : window.hoyRD;
    default: return window[n];
  } } catch (e) { return undefined; } };
  const rol = () => { const s = G('sesion'); return s && s.rol; };
  const puede = () => ['admin', 'agente'].includes(rol());
  const per = (a, m) => `${a}-${String(m).padStart(2, '0')}`;
  const hoyStr = () => { try { const f = G('hoyRD'); if (typeof f === 'function') { const v = f(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; } } catch (e) {} const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const idem = () => { try { const f = G('nxNuevaIdemKey'); if (typeof f === 'function') return f(); } catch (e) {} return 'fc-' + Date.now() + '-' + Math.random().toString(36).slice(2); };
  const errTxt = e => { try { const f = G('nxRpcErr'); if (typeof f === 'function') return f(e); } catch (_) {} return String(e && e.message || e); };

  function prima(c) {
    const fT = G('getPTReal'), fD = G('getPDReal'), pT = G('getPT'), pD = G('getPD');
    let t = typeof fT === 'function' ? Number(fT(c)) : NaN, d = typeof fD === 'function' ? Number(fD(c)) : NaN;
    if (!(t > 0)) { const v = Number(c.precio_titular); t = v > 0 ? v : (typeof pT === 'function' ? Number(pT(c.plan)) : 0); }
    if (!(d >= 0)) { const v = Number(c.precio_dep); d = v > 0 ? v : (typeof pD === 'function' ? Number(pD(c.plan)) : 0); }
    const nd = (c.deps || []).length;
    return { base: t || 0, deps: nd * (d || 0), nd, total: (t || 0) + nd * (d || 0) };
  }
  function facturados(cid) {
    const ST = G('ST'); const s = new Set();
    ((ST && ST.facturas) || []).forEach(f => { if (String(f.cliente_id) === String(cid) && f.estado !== 'Anulada' && f.periodo) s.add(f.periodo); });
    return s;
  }
  // Meses que se ofrecen: 6 atrás, el actual y 2 adelante (la RPC acepta hasta el año que viene).
  function meses() {
    const d = new Date(); const out = [];
    for (let k = -6; k <= 2; k++) { const x = new Date(d.getFullYear(), d.getMonth() + k, 1); out.push({ a: x.getFullYear(), m: x.getMonth() + 1, k }); }
    return out;
  }

  function css() {
    if ($('#nxFcCss')) return;
    const s = document.createElement('style'); s.id = 'nxFcCss'; s.textContent = `
.nxFcOv{position:fixed;inset:0;z-index:2147482700;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.45);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif}
.nxFcCard{width:min(460px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;border-radius:22px;box-shadow:0 30px 85px -36px rgba(15,23,42,.72);animation:nxFcIn .22s cubic-bezier(.23,1,.32,1)}
@keyframes nxFcIn{from{opacity:0;transform:translateY(10px) scale(.98)}}
.nxFcHead{display:flex;align-items:center;gap:10px;padding:14px 14px 12px 16px;border-bottom:1px solid #edf1f6}
.nxFcIco{width:40px;height:40px;flex:none;border-radius:13px;display:grid;place-items:center;background:#eaf1ff;color:#2563eb;font-size:19px}
.nxFcHead b{display:block;font-size:15px;color:#17233d;line-height:1.2}.nxFcHead small{display:block;font-size:13px;color:#64748b;margin-top:2px}
.nxFcX{margin-left:auto;width:44px;height:44px;flex:none;border:0;border-radius:50%;background:#f4f6f9;color:#65738b;font-size:18px;cursor:pointer}
.nxFcBody{padding:14px 16px 6px;color:#475569;font-size:13px;line-height:1.45}
.nxFcPrima{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:12px}
.nxFcPrima b{color:#17233d;font-size:16px;font-variant-numeric:tabular-nums}
.nxFcLbl{font-size:13px;font-weight:800;color:#17233d;margin:0 0 8px}
.nxFcGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.nxFcMes{min-height:56px;border:1.5px solid #dbe3ee;border-radius:14px;background:#fff;color:#17233d;font:inherit;font-size:14px;font-weight:800;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:transform .14s cubic-bezier(.23,1,.32,1),background-color .14s,border-color .14s}
.nxFcMes small{font-size:12px;font-weight:600;color:#64748b}
.nxFcMes:active{transform:scale(.97)}
.nxFcMes[aria-pressed="true"]{background:#2563eb;border-color:#2563eb;color:#fff}.nxFcMes[aria-pressed="true"] small{color:#dbeafe}
.nxFcMes.hoy:not([aria-pressed="true"]){border-color:#93c5fd}
.nxFcMes:disabled{cursor:not-allowed;background:#f1f5f9;border-color:#e2e8f0;color:#94a3b8}.nxFcMes:disabled small{color:#22a06b}
.nxFcNota{display:flex;gap:7px;align-items:flex-start;margin:12px 0 4px;padding:9px 11px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:13px}
.nxFcAviso{margin:12px 0 4px;padding:10px 12px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:13px}
.nxFcFoot{display:flex;gap:8px;padding:12px 16px 16px}
.nxFcFoot button{min-height:54px;border-radius:15px;font:inherit;font-size:15px;font-weight:800;cursor:pointer;padding:0 16px;transition:transform .14s cubic-bezier(.23,1,.32,1)}
.nxFcFoot button:active{transform:scale(.97)}
.nxFcNo{border:1px solid #dce4ef;background:#fff;color:#52627b;flex:0 0 auto}
.nxFcSi{flex:1;border:0;background:#2563eb;color:#fff;box-shadow:0 12px 24px -14px rgba(37,99,235,.9)}
.nxFcSi:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.nxFcRes{padding:4px 0}.nxFcRes div{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}.nxFcRes b{color:#17233d}
html.tema-glass-oscuro .nxFcCard{background:#151b26;color:#cbd5e1}
html.tema-glass-oscuro .nxFcHead{border-color:#243044}html.tema-glass-oscuro .nxFcHead b,html.tema-glass-oscuro .nxFcLbl,html.tema-glass-oscuro .nxFcPrima b,html.tema-glass-oscuro .nxFcRes b{color:#f1f5f9}
html.tema-glass-oscuro .nxFcPrima{background:#1b2332;border-color:#2a364b}html.tema-glass-oscuro .nxFcMes{background:#1b2332;border-color:#2a364b;color:#e2e8f0}
html.tema-glass-oscuro .nxFcMes:disabled{background:#121821;color:#64748b}html.tema-glass-oscuro .nxFcMes[aria-pressed="true"]{background:#2563eb;border-color:#3b82f6;color:#fff}
html.tema-glass-oscuro .nxFcX,html.tema-glass-oscuro .nxFcNo{background:#1b2332;border-color:#2a364b;color:#cbd5e1}
html.tema-glass-oscuro .nxFcNota{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.3);color:#86efac}
html.tema-glass-oscuro .nxFcAviso{background:rgba(249,115,22,.1);border-color:rgba(249,115,22,.3);color:#fdba74}
html.tema-glass-oscuro .nxFcRes div{border-color:#243044}
.nxFcOv .nxFcMes[aria-pressed="true"],.nxFcOv .nxFcMes[aria-pressed="true"]:hover{background:#2563eb!important;border-color:#2563eb!important;color:#fff!important}
.nxFcOv .nxFcMes:not([aria-pressed="true"]):not(:disabled):hover{border-color:#93c5fd!important}
@media(max-width:560px){.nxFcOv{align-items:end;padding:8px}.nxFcCard{border-radius:22px 22px 16px 16px}}
@media(prefers-reduced-motion:reduce){.nxFcCard{animation:none}.nxFcMes,.nxFcFoot button{transition:none}}`;
    document.head.appendChild(s);
  }

  function abrir(cid, opt = {}) {
    css();
    const ST = G('ST'); const c = ((ST && ST.clientes) || []).find(x => String(x.id) === String(cid));
    if (!c) { toast('err', 'Cliente no encontrado'); return; }
    if (!puede()) { toast('err', 'Sin permiso', 'Solo un administrador o un agente puede generar facturas.'); return; }
    $('.nxFcOv')?.remove();
    const p = prima(c), ya = facturados(cid), ms = meses();
    const bloqueo = c.activo !== true ? 'Este cliente no está activo. Actívelo para poder facturarle.'
      : c.permitir_facturacion === false ? 'Este cliente tiene la facturación apagada (familiar o cortesía).'
      : !(p.total > 0) ? 'Este cliente no tiene precio. Revise su plan o su precio especial.' : '';
    const hoyK = ms.find(x => x.k === 0); const sel = new Set();
    if (!bloqueo && !ya.has(per(hoyK.a, hoyK.m))) sel.add(per(hoyK.a, hoyK.m));
    const ov = document.createElement('div'); ov.className = 'nxFcOv';
    ov.innerHTML = `<div class="nxFcCard" role="dialog" aria-modal="true" aria-labelledby="nxFcTit">
      <div class="nxFcHead"><span class="nxFcIco"><i class="ti ti-file-invoice"></i></span><div><b id="nxFcTit">${opt.nuevo ? 'Cliente registrado' : 'Generar factura'}</b><small>${esc(c.nom)}</small></div><button type="button" class="nxFcX" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>
      <div class="nxFcBody">
        ${opt.nuevo && !bloqueo ? '<p style="margin:0 0 10px">¿Le generamos su factura ahora?</p>' : ''}
        <div class="nxFcPrima"><span>Cuota mensual${p.nd ? ` · titular + ${p.nd} dependiente${p.nd > 1 ? 's' : ''}` : ''}</span><b>${money(p.total)}</b></div>
        ${bloqueo ? `<div class="nxFcAviso">${esc(bloqueo)}</div>` : `
        <p class="nxFcLbl">Elija el mes o los meses</p>
        <div class="nxFcGrid">${ms.map(x => { const k = per(x.a, x.m), hecho = ya.has(k); return `<button type="button" class="nxFcMes${x.k === 0 ? ' hoy' : ''}" data-p="${k}" aria-pressed="${sel.has(k)}"${hecho ? ' disabled' : ''}>${MES3[x.m - 1]} ${x.a}<small>${hecho ? '✓ Facturado' : x.k === 0 ? 'Este mes' : '&nbsp;'}</small></button>`; }).join('')}</div>
        <div class="nxFcNota"><i class="ti ti-brand-whatsapp"></i><span>Al cliente le llega el aviso «Factura generada» por cada factura.</span></div>`}
      </div>
      <div class="nxFcFoot"><button type="button" class="nxFcNo">${opt.nuevo ? 'Ahora no' : 'Cancelar'}</button>${bloqueo ? '' : '<button type="button" class="nxFcSi"></button>'}</div>
    </div>`;
    document.body.appendChild(ov);
    const si = $('.nxFcSi', ov);
    const pintar = () => {
      if (!si) return; const n = sel.size;
      si.disabled = n === 0;
      si.innerHTML = n === 0 ? 'Elija un mes' : `<i class="ti ti-check"></i> Generar ${n === 1 ? 'factura' : n + ' facturas'} · ${money(n * p.total)}`;
    };
    ov.querySelectorAll('.nxFcMes:not(:disabled)').forEach(b => b.onclick = () => { const k = b.dataset.p; if (sel.has(k)) sel.delete(k); else sel.add(k); b.setAttribute('aria-pressed', sel.has(k)); pintar(); });
    const cerrar = () => ov.remove();
    $('.nxFcX', ov).onclick = cerrar; $('.nxFcNo', ov).onclick = cerrar; ov.onclick = e => { if (e.target === ov) cerrar(); };
    const onKey = e => { if (e.key === 'Escape' && document.body.contains(ov)) { cerrar(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
    if (si) si.onclick = () => generar(c, [...sel].sort(), p, ov);
    pintar();
  }

  let _corriendo = false;
  async function generar(c, periodos, p, ov) {
    if (_corriendo || !periodos.length) return; _corriendo = true;
    const si = $('.nxFcSi', ov), no = $('.nxFcNo', ov);
    si.disabled = true; if (no) no.disabled = true;
    const API = G('API'), ST = G('ST'); const hechas = [], saltadas = [], errores = [], asis = [];
    for (let i = 0; i < periodos.length; i++) {
      const k = periodos[i], [a, m] = k.split('-').map(Number);
      si.innerHTML = `<i class="ti ti-loader-2"></i> Generando ${i + 1} de ${periodos.length}…`;
      try {
        const r = await API.post('rpc/seguros_generar_factura_manual', { p_cliente_id: c.id, p_periodo: k, p_mes: m, p_anio: a, p_prima_base: p.base, p_prima_deps: p.deps, p_tipo_ncf: c.tipo_ncf || 'B02', p_fecha_emision: hoyStr(), p_idempotency_key: idem() });
        if (!r) throw new Error('El sistema no confirmó la factura');
        if (r.ok === false) { saltadas.push(k); continue; }
        if (r.factura && ST && ST.facturas) ST.facturas.unshift(r.factura);
        if (r.asiento_id) asis.push(r.asiento_id);
        if (r.cliente_deuda_total != null) c.deuda_total = r.cliente_deuda_total;
        hechas.push({ k, ncf: r.ncf || (r.factura && r.factura.ncf) || '' });
      } catch (e) { errores.push(`${MES[m - 1]} ${a}: ${errTxt(e)}`); }
    }
    try { const f = G('resyncEstadoFacturas'); if (hechas.length && typeof f === 'function') await f(c.id); } catch (e) {}
    if (asis.length) { try { const asi = await API.get('asientos', `id=in.(${asis.join(',')})`); if (asi && ST && ST.asientos) ST.asientos.unshift(...asi); const f = G('recalcularSaldosContables'); if (typeof f === 'function') f(); } catch (e) {} }
    try { const f = G('logAudit'); if (hechas.length && typeof f === 'function') f('FACTURA_CLIENTE_GENERADA', `${c.nom} · ${hechas.map(h => h.k).join(', ')} · ${money(hechas.length * p.total)}`, 'Facturas', c.id); } catch (e) {}
    ['rFact', 'rCli', 'rDash', 'rCob', 'actualizarTicker'].forEach(n => { try { const f = G(n); if (typeof f === 'function') f(); } catch (e) {} });
    _corriendo = false;
    const nom = k => { const [a, m] = k.split('-').map(Number); return `${MES[m - 1]} ${a}`; };
    const body = $('.nxFcBody', ov), foot = $('.nxFcFoot', ov);
    body.innerHTML = `<div class="nxFcRes">${hechas.map(h => `<div><span>✓ ${nom(h.k)}</span><b>${esc(h.ncf || 'Generada')}</b></div>`).join('')}${saltadas.map(k => `<div><span>${nom(k)}</span><span>Ya tenía factura</span></div>`).join('')}</div>${errores.length ? `<div class="nxFcAviso">${errores.map(esc).join('<br>')}</div>` : ''}`;
    $('#nxFcTit', ov).textContent = hechas.length ? (hechas.length === 1 ? 'Factura generada' : hechas.length + ' facturas generadas') : 'No se generó ninguna factura';
    foot.innerHTML = '<button type="button" class="nxFcSi">Listo</button>';
    $('.nxFcSi', foot).onclick = () => ov.remove();
    if (hechas.length) toast('ok', hechas.length === 1 ? 'Factura generada' : hechas.length + ' facturas generadas', c.nom);
    else if (errores.length) toast('err', 'No se pudo generar', errores[0]);
  }

  window.nxFacturarCliente = abrir;

  // Ficha del cliente: «Nueva factura» abre esta ventana.
  function engancharFicha() {
    const orig = window.c360AccionNuevaFactura;
    if (typeof orig !== 'function' || orig.__nxFc) return !!(orig && orig.__nxFc);
    const f = function (id) { if (!puede()) return orig.apply(this, arguments); try { const cs = G('cerrarClientSummary'); if (typeof cs === 'function') cs(); } catch (e) {} abrir(id); };
    f.__nxFc = true; window.c360AccionNuevaFactura = f; return true;
  }
  // Al registrar un cliente NUEVO: ofrecer su factura.
  function engancharAlta() {
    const orig = window.guardarCli;
    if (typeof orig !== 'function' || orig.__nxFc) return !!(orig && orig.__nxFc);
    const f = async function () {
      const ST = G('ST'), editando = !!G('editCliId');
      const antes = new Set(((ST && ST.clientes) || []).map(c => String(c.id)));
      const r = await orig.apply(this, arguments);
      try {
        if (!editando && puede()) {
          const nuevos = ((ST && ST.clientes) || []).filter(c => !antes.has(String(c.id)));
          if (nuevos.length === 1) { const c = nuevos[0]; if (c.activo === true && c.permitir_facturacion !== false) setTimeout(() => abrir(c.id, { nuevo: true }), 450); }
        }
      } catch (e) {}
      return r;
    };
    f.__nxFc = true; window.guardarCli = f; return true;
  }
  let n = 0; const iv = setInterval(() => { const a = engancharFicha(), b = engancharAlta(); if ((a && b) || ++n > 60) clearInterval(iv); }, 500);
  engancharFicha(); engancharAlta();
})();
