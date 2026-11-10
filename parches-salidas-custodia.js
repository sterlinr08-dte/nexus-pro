/* NEXUS PRO · 59.83 — «Salidas» de la custodia del administrador (dueño, 09-nov-2026: eligió «2 · Salidas del
   administrador»; motivos reales: pago a la aseguradora, gastos del negocio y retiro del dueño; el depósito de
   efectivo al banco no es salida, solo pasa de efectivo a banco; y un «ajuste inicial» para el saldo viejo).
   · Solo la ve el administrador, en «Custodia de fondos»: botón «Salida» en la cabecera y lista «Salidas» debajo.
   · Ventana «Registrar salida»: motivo, monto (con comas al escribir), de dónde sale (Efectivo / Banco), banco,
     nota, referencia y fecha real. Llave contra doble envío por cada apertura de la ventana.
   · La lista permite «Anular» (pide el motivo). Las anuladas quedan tachadas.
   · El navegador NO calcula la custodia ni el tope: lo valida el servidor (RPC seguros_registrar_salida_custodia y
     seguros_anular_salida_custodia) y aquí se muestra su mensaje tal cual. Después de registrar o anular se vuelve
     a pedir la custodia con el refresco que ya existe (cusCargar(true)).
   · Una salida NO es un cobro: baja la custodia del administrador y no toca lo cobrado.
   Apagar: localStorage.nx_salidas_custodia_off='1' y recargar (también quita la columna «Salidas» del reporte del
   ciclo). Para quitarla del todo, borrar su línea en parches-seguros.js. */
(function () {
  'use strict';
  if (window.__nxSalCus) return; window.__nxSalCus = true;
  try { if (localStorage.getItem('nx_salidas_custodia_off') === '1') return; } catch (e) {}

  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => 'RD$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Variables y funciones del index (algunas son let/const: no viven en window, se leen por su nombre).
  const G = n => { try { switch (n) {
    case 'API': return typeof API !== 'undefined' ? API : window.API;
    case 'sesion': return typeof sesion !== 'undefined' ? sesion : window.sesion;
    case '_cus': return typeof _cus !== 'undefined' ? _cus : window._cus;
    default: return window[n];
  } } catch (e) { return undefined; } };
  const esAdmin = () => { const s = G('sesion'); return !!(s && s.rol === 'admin'); };
  const toast = (t, a, b) => { try { const f = G('toast'); if (typeof f === 'function') f(t, a, b || ''); } catch (e) {} };
  const idem = () => { try { const f = G('nxNuevaIdemKey'); if (typeof f === 'function') return f(); } catch (e) {} return 'sal-' + Date.now() + '-' + Math.random().toString(36).slice(2); };
  const errTxt = e => { try { const f = G('nxRpcErr'); if (typeof f === 'function') return f(e); } catch (_) {} return String(e && e.message || e); };
  const hoyRD = () => { const p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).forEach(x => p[x.type] = x.value); return p.year + '-' + p.month + '-' + p.day; };
  const fechaCorta = v => { if (!v) return '—'; try { return new Date(v).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', timeZone: 'America/Santo_Domingo' }).replace('.', ''); } catch (e) { return String(v).slice(0, 10); } };
  const fechaDia = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); if (!m) return ''; const M = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']; return Number(m[3]) + ' ' + M[Number(m[2]) - 1]; };

  const MOTIVOS = [
    { v: 'aseguradora', t: 'Pago a la aseguradora', i: 'ti-shield-dollar' },
    { v: 'gasto', t: 'Gasto del negocio', i: 'ti-receipt-2' },
    { v: 'retiro', t: 'Retiro del dueño', i: 'ti-user-dollar' },
    { v: 'deposito_banco', t: 'Depósito al banco', i: 'ti-building-bank' }
  ];
  const MOTIVO_TXT = { aseguradora: 'Pago a la aseguradora', gasto: 'Gasto del negocio', retiro: 'Retiro del dueño', deposito_banco: 'Depósito al banco', ajuste_inicial: 'Ajuste inicial' };

  const est = { lista: null, cargando: false, error: null, req: 0 };

  // ── Estilos (se inyectan al cargar la capa, antes de que se pinte la pantalla) ──
  function css() {
    if ($('#nxSalCusCss')) return;
    const s = document.createElement('style'); s.id = 'nxSalCusCss'; s.textContent = `
#v-custodia .nxSalBtn.nxSalBtn{height:44px!important;min-height:44px!important;padding:0 16px!important;border-radius:999px!important;border:0!important;background:#2563eb!important;color:#fff!important;font-size:14px!important;font-weight:800!important;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:transform .16s cubic-bezier(.22,1,.36,1)}
#v-custodia .nxSalBtn.nxSalBtn i{color:#fff!important;font-size:17px}
#v-custodia .nxSalBtn:active{transform:scale(.96)}
#v-custodia .nxSalBtn:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
#v-custodia .nxSal{margin-top:14px;border-radius:16px;background:var(--cu-card,#fff);border:1px solid var(--cu-edge,#e2e8f0);padding:14px}
#v-custodia .nxSalTit{margin:0 0 8px;font-size:15px;font-weight:800;color:var(--cu-t1,#0f172a);display:flex;align-items:center;gap:8px}
#v-custodia .nxSalTit i{color:var(--cu-acc,#2563eb);font-size:18px}
#v-custodia .nxSalVacio{font-size:14px;color:var(--cu-t3,#64748b);padding:10px 2px 4px;line-height:1.45}
#v-custodia .nxSalFila{display:grid;grid-template-columns:64px minmax(0,1fr) auto auto;align-items:center;column-gap:12px;min-height:56px;padding:6px 0;border-top:1px solid var(--cu-edge,#e2e8f0)}
#v-custodia .nxSalFila:first-of-type{border-top:0}
#v-custodia .nxSalF{font-size:13px;color:var(--cu-t3,#64748b);white-space:nowrap}
#v-custodia .nxSalQ{min-width:0}
#v-custodia .nxSalQ b{display:block;font-size:14px;font-weight:700;color:var(--cu-t1,#0f172a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#v-custodia .nxSalQ span{display:block;font-size:12.5px;color:var(--cu-t3,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px}
#v-custodia .nxSalM{font-size:15px;font-weight:800;color:var(--cu-t1,#0f172a);font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}
#v-custodia .nxSalAnu.nxSalAnu{min-width:44px!important;height:44px!important;min-height:44px!important;padding:0 14px!important;border-radius:999px!important;border:1px solid var(--cu-edge,#e2e8f0)!important;background:transparent!important;color:var(--cu-err,#b91c1c)!important;font-size:13px!important;font-weight:700!important;cursor:pointer}
#v-custodia .nxSalFila.anu .nxSalQ b,#v-custodia .nxSalFila.anu .nxSalM{text-decoration:line-through;color:var(--cu-t3,#64748b)}
#v-custodia .nxSalTag{font-size:12px;font-weight:700;color:var(--cu-t3,#64748b);white-space:nowrap;padding:0 6px}
@media(max-width:640px){
  #v-custodia .nxSalBtn.nxSalBtn{flex:0 0 auto}
  /* 59.84: en el celular el selector del ciclo va en su propia fila (se recortaba «20 oct → 20 no…»); debajo, Actualizar y Salida a partes iguales. */
  #v-custodia .cuHead.nxSalCuHead .cuSel{flex:1 1 100%!important}
  #v-custodia .cuHead.nxSalCuHead .cuBtn{flex:1 1 0!important;justify-content:center!important}
  #v-custodia .nxSalFila{grid-template-columns:minmax(0,1fr) auto;row-gap:2px;padding:10px 0}
  #v-custodia .nxSalF{grid-column:1;grid-row:2}
  #v-custodia .nxSalQ span{white-space:normal;overflow-wrap:anywhere}
  #v-custodia .nxSalQ{grid-column:1;grid-row:1}
  #v-custodia .nxSalM{grid-column:2;grid-row:1}
  #v-custodia .nxSalAnu.nxSalAnu,#v-custodia .nxSalTag{grid-column:2;grid-row:2;justify-self:end}
}
.nxSalOv{position:fixed;inset:0;z-index:2147482700;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Plus Jakarta Sans','Segoe UI',system-ui,sans-serif}
.nxSalOv *{box-sizing:border-box;text-transform:none!important;letter-spacing:0!important}
.nxSalOv [hidden]{display:none!important}
.nxSalCard{width:min(520px,100%);max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;scroll-padding:72px 0 96px;background:#fff;color:#0f172a;border-radius:20px;box-shadow:0 0 0 1px rgba(15,23,42,.06),0 30px 70px -24px rgba(15,23,42,.45),0 12px 24px -12px rgba(15,23,42,.18);animation:nxSalIn .24s cubic-bezier(.22,1,.36,1)}
@keyframes nxSalIn{from{opacity:0;transform:translateY(10px) scale(.97)}}
.nxSalHead{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 20px;border-bottom:1px solid #edf1f6;position:sticky;top:0;background:inherit;z-index:1;border-radius:20px 20px 0 0}
.nxSalHead i.nxSalIco{color:#2563eb;font-size:20px}
.nxSalHead b{font-size:17px;font-weight:800;color:#0f172a;flex:1;min-width:0}
.nxSalOv .nxSalX{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;flex:none;border:0!important;border-radius:50%!important;background:#f1f5f9!important;color:#475569!important;font-size:18px!important;cursor:pointer;display:grid;place-items:center;padding:0!important}
.nxSalBody{padding:20px 20px 8px}
.nxSalCampo{margin:0 0 20px;min-width:0;border:0;padding:0}
.nxSalLbl{display:block;font-size:13px;font-weight:700;color:#334155;margin:0 0 8px;padding:0}
.nxSalSeg{display:grid;gap:8px}
.nxSalSeg.m4{grid-template-columns:1fr 1fr}
.nxSalSeg.m2{grid-template-columns:1fr 1fr}
.nxSalOv .nxSalOp{min-height:48px!important;height:auto!important;border:1.5px solid #dbe3ee!important;border-radius:14px!important;background:#fff!important;color:#0f172a!important;font:inherit;font-size:14px!important;font-weight:700!important;line-height:1.2;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;padding:6px 10px!important;text-align:center;transition:transform .16s cubic-bezier(.22,1,.36,1),background-color .16s,border-color .16s;box-shadow:none!important}
.nxSalOv .nxSalOp i{font-size:17px;color:#2563eb}
.nxSalOv .nxSalOp:active{transform:scale(.97)}
.nxSalOv .nxSalOp[aria-pressed="true"]{background:#2563eb!important;border-color:#2563eb!important;color:#fff!important}
.nxSalOv .nxSalOp[aria-pressed="true"] i{color:#fff}
.nxSalOv .nxSalOp:focus-visible,.nxSalOv .nxSalMas:focus-visible,.nxSalOv .nxSalX:focus-visible,.nxSalOv .nxSalSi:focus-visible,.nxSalOv .nxSalNo:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.nxSalOv .nxSalMas{min-height:44px!important;margin-top:4px;border:0!important;background:transparent!important;color:#64748b!important;font:inherit;font-size:13px!important;font-weight:600!important;cursor:pointer;padding:0 6px!important;text-decoration:underline;text-underline-offset:3px;box-shadow:none!important}
.nxSalOv .nxSalMas[aria-pressed="true"]{color:#1d4ed8!important;font-weight:800!important}
.nxSalOv .nxSalIn{display:block;width:100%!important;height:48px!important;min-height:48px!important;border:1.5px solid #dbe3ee!important;border-radius:13px!important;background:#fff!important;color:#0f172a!important;font:inherit;font-size:16px!important;font-weight:500;padding:0 14px!important;margin:0!important;outline:0;box-shadow:none;-webkit-appearance:none;appearance:none;transition:border-color .16s,box-shadow .16s}
.nxSalOv select.nxSalIn{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")!important;background-repeat:no-repeat!important;background-position:right 14px center!important;padding-right:40px!important}
.nxSalOv .nxSalIn:focus{border-color:rgba(59,130,246,.6)!important;box-shadow:0 0 0 4px rgba(59,130,246,.16)!important}
.nxSalOv .nxSalIn.mal{border-color:#dc2626!important}
.nxSalMonto{position:relative}
.nxSalMonto span{position:absolute;left:14px;top:0;height:48px;display:flex;align-items:center;font-size:16px;font-weight:700;color:#64748b;pointer-events:none}
.nxSalOv .nxSalMonto .nxSalIn{padding-left:52px!important;font-weight:800;font-variant-numeric:tabular-nums}
.nxSalFijo{min-height:48px;display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:#0f172a}
.nxSalFijo i{color:#2563eb;font-size:19px}
.nxSalNota{margin:4px 0 0;font-size:13px;line-height:1.4;color:#b45309}
.nxSalNota.mal{color:#b91c1c}
.nxSalDet{margin:0 0 20px}
.nxSalOv .nxSalDet summary{min-height:44px;display:flex;align-items:center;gap:6px;font-size:14px;font-weight:700;color:#1d4ed8;cursor:pointer;list-style:none;background:none!important;border:0!important;box-shadow:none!important;padding:0!important;border-radius:8px}
.nxSalOv .nxSalDet summary::before,.nxSalOv .nxSalDet summary::after{display:none!important}
.nxSalOv .nxSalDet summary::-webkit-details-marker{display:none}
.nxSalDet summary i{transition:transform .16s cubic-bezier(.22,1,.36,1)}
.nxSalDet[open] summary i{transform:rotate(90deg)}
.nxSalDet[open] summary{margin-bottom:8px}
.nxSalDos{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.nxSalDos .nxSalCampo{margin-bottom:0}
.nxSalErr{margin:0 0 16px;padding:10px 12px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:14px;line-height:1.4;display:flex;gap:8px;align-items:flex-start}
.nxSalErr[hidden]{display:none}
.nxSalFoot{display:flex;gap:8px;padding:4px 20px 20px;position:sticky;bottom:0;background:inherit;border-radius:0 0 20px 20px}
.nxSalOv .nxSalFoot button{height:54px!important;min-height:54px!important;border-radius:15px!important;font:inherit;font-size:16px!important;font-weight:800!important;cursor:pointer;padding:0 16px!important;transition:transform .16s cubic-bezier(.22,1,.36,1)}
.nxSalOv .nxSalFoot button:active{transform:scale(.97)}
.nxSalOv .nxSalNo{flex:0 0 auto;border:1px solid #dce4ef!important;background:#fff!important;color:#475569!important}
.nxSalOv .nxSalSi{flex:1;min-width:0;border:0!important;background:#2563eb!important;color:#fff!important;box-shadow:0 12px 24px -14px rgba(37,99,235,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxSalOv .nxSalSi.rojo{background:#b91c1c!important;box-shadow:0 12px 24px -14px rgba(185,28,28,.9)}
.nxSalOv .nxSalSi:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.nxSalRes{font-size:14px;line-height:1.45;color:#475569;margin:0 0 20px}
.nxSalRes b{color:#0f172a}
html.tema-glass-oscuro .nxSalCard{background:#151b26;color:#e2e8f0}
html.tema-glass-oscuro .nxSalHead{border-color:#243044}
html.tema-glass-oscuro .nxSalHead b,html.tema-glass-oscuro .nxSalFijo,html.tema-glass-oscuro .nxSalRes b{color:#f1f5f9}
html.tema-glass-oscuro .nxSalLbl,html.tema-glass-oscuro .nxSalRes{color:#cbd5e1}
html.tema-glass-oscuro .nxSalOv .nxSalOp,html.tema-glass-oscuro .nxSalOv .nxSalIn,html.tema-glass-oscuro .nxSalOv .nxSalNo{background-color:#1b2332!important;border-color:#2a364b!important;color:#e2e8f0!important}
html.tema-glass-oscuro .nxSalOv .nxSalOp[aria-pressed="true"]{background:#2563eb!important;border-color:#3b82f6!important;color:#fff!important}
html.tema-glass-oscuro .nxSalOv .nxSalX{background:#1b2332!important;color:#cbd5e1!important}
html.tema-glass-oscuro .nxSalOv .nxSalMas{color:#94a3b8!important}
html.tema-glass-oscuro .nxSalOv .nxSalMas[aria-pressed="true"],html.tema-glass-oscuro .nxSalOv .nxSalDet summary{color:#93c5fd!important}
html.tema-glass-oscuro .nxSalErr{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35);color:#fecaca}
html.tema-glass-oscuro .nxSalNota{color:#fcd34d}html.tema-glass-oscuro .nxSalNota.mal{color:#fecaca}
@media(min-width:561px){.nxSalSeg.m4{grid-template-columns:repeat(4,1fr)}.nxSalOv .nxSalSeg.m4 .nxSalOp{flex-direction:column;min-height:72px!important;font-size:13px!important}}
@media(max-width:560px){
  .nxSalOv{align-items:end;padding:0}
  .nxSalCard{width:100%;max-height:calc(100dvh - 12px);border-radius:20px 20px 0 0;animation-name:nxSalUp}
  .nxSalBody{padding:24px 16px 8px}
  .nxSalHead{padding-left:16px}
  .nxSalFoot{padding:4px 16px calc(16px + env(safe-area-inset-bottom,0px));border-radius:0}
  .nxSalOv .nxSalNo{display:none}
}
@keyframes nxSalUp{from{transform:translateY(24px);opacity:0}}
@media(prefers-reduced-motion:reduce){.nxSalCard{animation:none}.nxSalOv .nxSalOp,.nxSalOv .nxSalFoot button,#v-custodia .nxSalBtn,.nxSalDet summary i{transition:none}}`;
    document.head.appendChild(s);
  }

  // ── Monto con comas mientras se escribe ──
  function limpiarMonto(v) {
    let t = String(v || '').replace(/[^\d.]/g, '');
    const p = t.indexOf('.');
    if (p >= 0) t = t.slice(0, p + 1) + t.slice(p + 1).replace(/\./g, '').slice(0, 2);
    return t;
  }
  function conComas(t) {
    if (!t) return '';
    const p = t.indexOf('.');
    let ent = p >= 0 ? t.slice(0, p) : t; const dec = p >= 0 ? t.slice(p) : '';
    ent = ent.replace(/^0+(?=\d)/, '');
    return ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + dec;
  }
  const montoNum = v => { const n = parseFloat(limpiarMonto(v)); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
  function formatearMonto(inp) {
    const antes = inp.value, pos = inp.selectionStart == null ? antes.length : inp.selectionStart;
    const utiles = antes.slice(0, pos).replace(/[^\d.]/g, '').length; // dígitos y punto a la izquierda del cursor
    const nuevo = conComas(limpiarMonto(antes));
    if (nuevo === antes) return;
    inp.value = nuevo;
    let i = 0, n = 0;
    while (i < nuevo.length && n < utiles) { if (/[\d.]/.test(nuevo[i])) n++; i++; }
    try { inp.setSelectionRange(i, i); } catch (e) {}
  }

  // Custodia del administrador que ya está en pantalla (cifra del servidor, solo del ciclo en curso).
  function custodiaEnPantalla() {
    try {
      const c = G('_cus'), fA = G('cusPeriodoActual');
      if (!c || !c.data || !Array.isArray(c.data.rows) || typeof fA !== 'function' || c.periodo !== fA()) return null;
      const r = c.data.rows.find(x => /admin/i.test(x.cargo || ''));
      if (!r) return null;
      const n = Number(r.saldo_final); return isFinite(n) ? n : null;
    } catch (e) { return null; }
  }

  function cerrar(ov) { if (ov && ov.parentNode) { try { document.removeEventListener('keydown', ov._esc, true); } catch (e) {} ov.remove(); } }
  function overlay(html, etiqueta) {
    css();
    const ov = document.createElement('div'); ov.className = 'nxSalOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', etiqueta);
    ov.innerHTML = html; ov._ocupado = false;
    ov._esc = e => { if (e.key === 'Escape' && !ov._ocupado) { e.stopPropagation(); cerrar(ov); } };
    document.addEventListener('keydown', ov._esc, true);
    ov.addEventListener('mousedown', e => { if (e.target === ov && !ov._ocupado) cerrar(ov); });
    document.body.appendChild(ov);
    return ov;
  }

  // ── Ventana «Registrar salida» ──
  async function abrir() {
    if (!esAdmin() || $('.nxSalOv')) return;
    const f = { motivo: 'aseguradora', metodo: 'Efectivo', llave: idem(), guardando: false };
    const hoy = hoyRD();
    const ov = overlay(`<form class="nxSalCard" novalidate autocomplete="off">
      <div class="nxSalHead"><i class="ti ti-arrow-up-right nxSalIco"></i><b id="nxSalTitulo">Registrar salida</b><button type="button" class="nxSalX" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>
      <div class="nxSalBody">
        <div class="nxSalCampo" role="group" aria-labelledby="nxSalLMot"><span class="nxSalLbl" id="nxSalLMot">Motivo</span>
          <div class="nxSalSeg m4">${MOTIVOS.map(m => `<button type="button" class="nxSalOp" data-mot="${m.v}" aria-pressed="${m.v === f.motivo}"><i class="ti ${m.i}"></i><span>${m.t}</span></button>`).join('')}</div>
          <button type="button" class="nxSalMas" data-mot="ajuste_inicial" aria-pressed="false">Ajuste inicial</button>
        </div>
        <div class="nxSalCampo"><label class="nxSalLbl" for="nxSalMonto">Monto</label>
          <div class="nxSalMonto"><span>RD$</span><input class="nxSalIn" id="nxSalMonto" type="text" inputmode="decimal" placeholder="0.00" aria-describedby="nxSalAviso"></div>
          <p class="nxSalNota" id="nxSalAviso" hidden></p>
        </div>
        <div class="nxSalCampo" role="group" aria-labelledby="nxSalLMet"><span class="nxSalLbl" id="nxSalLMet">De dónde sale</span>
          <div class="nxSalSeg m2" id="nxSalMetSeg"><button type="button" class="nxSalOp" data-met="Efectivo" aria-pressed="true"><i class="ti ti-cash"></i><span>Efectivo</span></button><button type="button" class="nxSalOp" data-met="Banco" aria-pressed="false"><i class="ti ti-building-bank"></i><span>Banco</span></button></div>
          <div class="nxSalFijo" id="nxSalMetFijo" hidden><i class="ti ti-cash"></i><span>Efectivo</span></div>
        </div>
        <div class="nxSalCampo" id="nxSalBancoCampo" hidden><label class="nxSalLbl" for="nxSalBanco" id="nxSalLBanco">Banco</label>
          <select class="nxSalIn" id="nxSalBanco"><option value="">Elija el banco</option></select>
          <input class="nxSalIn" id="nxSalBancoOtro" type="text" maxlength="60" placeholder="Nombre del banco" aria-label="Nombre del banco" hidden style="margin-top:8px!important">
          <p class="nxSalNota mal" id="nxSalBancoErr" hidden></p>
        </div>
        <div class="nxSalCampo"><label class="nxSalLbl" for="nxSalNota" id="nxSalLNota">Nota (opcional)</label>
          <input class="nxSalIn" id="nxSalNota" type="text" maxlength="200">
          <p class="nxSalNota mal" id="nxSalNotaErr" hidden></p>
        </div>
        <details class="nxSalDet"><summary><i class="ti ti-chevron-right"></i>Referencia y fecha</summary>
          <div class="nxSalDos">
            <div class="nxSalCampo"><label class="nxSalLbl" for="nxSalRef">Referencia</label><input class="nxSalIn" id="nxSalRef" type="text" maxlength="80"></div>
            <div class="nxSalCampo"><label class="nxSalLbl" for="nxSalFecha">Fecha real</label><input class="nxSalIn" id="nxSalFecha" type="date" max="${hoy}"></div>
          </div>
        </details>
        <div class="nxSalErr" id="nxSalErr" role="alert" hidden></div>
      </div>
      <div class="nxSalFoot"><button type="button" class="nxSalNo">Cancelar</button><button type="submit" class="nxSalSi" id="nxSalSi">Registrar salida</button></div>
    </form>`, 'Registrar salida');
    const q = s => $(s, ov), inMonto = q('#nxSalMonto'), btn = q('#nxSalSi'), selBanco = q('#nxSalBanco'), inOtro = q('#nxSalBancoOtro');
    const disponible = custodiaEnPantalla();

    function pintar() {
      const dep = f.motivo === 'deposito_banco', aj = f.motivo === 'ajuste_inicial';
      if (dep) f.metodo = 'Efectivo'; // el depósito al banco siempre sale del efectivo
      ov.querySelectorAll('[data-mot]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mot === f.motivo)));
      ov.querySelectorAll('[data-met]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.met === f.metodo)));
      q('#nxSalMetSeg').hidden = dep; q('#nxSalMetFijo').hidden = !dep;
      const conBanco = dep || f.metodo === 'Banco';
      q('#nxSalBancoCampo').hidden = !conBanco;
      q('#nxSalLBanco').textContent = dep ? 'Banco destino' : 'Banco';
      inOtro.hidden = !(conBanco && selBanco.value === '__otro');
      q('#nxSalLNota').textContent = aj ? 'Nota' : 'Nota (opcional)';
      q('#nxSalTitulo').textContent = dep ? 'Registrar depósito al banco' : 'Registrar salida';
      const m = montoNum(inMonto.value);
      btn.textContent = f.guardando ? 'Guardando…' : (dep ? 'Registrar depósito' : 'Registrar salida') + (m > 0 ? ' ' + money(m) : '');
      btn.disabled = f.guardando;
      // Aviso antes del error: solo con la cifra del servidor que ya está en pantalla. El tope real lo valida el servidor.
      const av = q('#nxSalAviso');
      if (disponible != null && m > disponible + 0.004) { av.textContent = 'Supera la custodia: ' + money(Math.max(disponible, 0)); av.hidden = false; }
      else av.hidden = true;
    }
    function mal(sel, errSel, txt) { const e = q(sel); e.classList.add('mal'); if (errSel) { const p = q(errSel); p.textContent = txt; p.hidden = false; } try { e.focus(); } catch (_) {} }
    function limpiarErr() { ov.querySelectorAll('.nxSalIn.mal').forEach(e => e.classList.remove('mal')); q('#nxSalBancoErr').hidden = true; q('#nxSalNotaErr').hidden = true; q('#nxSalErr').hidden = true; }

    ov.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t || f.guardando) return;
      if (t.dataset.mot) { f.motivo = t.dataset.mot; limpiarErr(); pintar(); }
      else if (t.dataset.met) { f.metodo = t.dataset.met; limpiarErr(); pintar(); }
      else if (t.classList.contains('nxSalX') || t.classList.contains('nxSalNo')) cerrar(ov);
    });
    inMonto.addEventListener('input', () => { formatearMonto(inMonto); inMonto.classList.remove('mal'); q('#nxSalErr').hidden = true; pintar(); });
    selBanco.addEventListener('change', () => { limpiarErr(); pintar(); if (selBanco.value === '__otro') { try { inOtro.focus(); } catch (_) {} } });
    q('#nxSalNota').addEventListener('input', () => { q('#nxSalNota').classList.remove('mal'); q('#nxSalNotaErr').hidden = true; });

    q('form').addEventListener('submit', async e => {
      e.preventDefault();
      if (f.guardando) return; // contra el doble toque
      limpiarErr();
      const monto = montoNum(inMonto.value), dep = f.motivo === 'deposito_banco', conBanco = dep || f.metodo === 'Banco';
      const banco = conBanco ? (selBanco.value === '__otro' ? inOtro.value.trim() : selBanco.value) : '';
      const nota = q('#nxSalNota').value.trim(), ref = q('#nxSalRef').value.trim(), fecha = q('#nxSalFecha').value;
      if (!(monto > 0)) { mal('#nxSalMonto'); return; }
      if (conBanco && !banco) { mal(selBanco.value === '__otro' ? '#nxSalBancoOtro' : '#nxSalBanco', '#nxSalBancoErr', 'Elija el banco'); return; }
      if (f.motivo === 'ajuste_inicial' && !nota) { mal('#nxSalNota', '#nxSalNotaErr', 'Escriba la nota'); return; }
      f.guardando = true; ov._ocupado = true; pintar();
      try {
        const r = await G('API').post('rpc/seguros_registrar_salida_custodia', {
          p_monto: monto, p_motivo: f.motivo, p_metodo: f.metodo, p_banco: banco || null, p_referencia: ref || null,
          p_nota: nota || null, p_fecha_real: fecha || null, p_comprobante_url: null, p_idempotency_key: f.llave
        });
        if (r && r.ok === false) throw new Error(r.razon || r.message || 'No se pudo registrar');
        cerrar(ov);
        toast('ok', dep ? 'Depósito registrado' : 'Salida registrada', money(monto));
        refrescar();
      } catch (err) {
        f.guardando = false; ov._ocupado = false; pintar();
        const box = q('#nxSalErr'); box.innerHTML = '<i class="ti ti-alert-circle"></i><span>' + esc(errTxt(err)) + '</span>'; box.hidden = false;
        try { box.scrollIntoView({ block: 'nearest' }); } catch (_) {}
      }
    });

    pintar();
    try { inMonto.focus(); } catch (e) {}
    // Catálogo de bancos del sistema (el mismo de «Registrar pago»).
    try {
      const fB = G('cargarBancos'); const lista = typeof fB === 'function' ? await fB() : [];
      const act = (lista || []).filter(b => b && b.activo !== false && !/^otros?$/i.test(String(b.nombre || '').trim()));
      if (ov.isConnected) selBanco.innerHTML = '<option value="">Elija el banco</option>' + act.map(b => `<option value="${esc(b.nombre)}">${esc(b.nombre)}</option>`).join('') + '<option value="__otro">Otro</option>';
    } catch (e) { if (ov.isConnected) selBanco.innerHTML = '<option value="">Elija el banco</option><option value="__otro">Otro</option>'; }
  }

  // ── Ventana «Anular salida» (pide el motivo) ──
  function abrirAnular(id) {
    if (!esAdmin() || $('.nxSalOv')) return;
    const s = (est.lista || []).find(x => String(x.id) === String(id)); if (!s || s.anulado) return;
    let guardando = false;
    const ov = overlay(`<form class="nxSalCard" novalidate autocomplete="off">
      <div class="nxSalHead"><i class="ti ti-arrow-back-up nxSalIco"></i><b>Anular salida</b><button type="button" class="nxSalX" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>
      <div class="nxSalBody">
        <p class="nxSalRes"><b>${esc(MOTIVO_TXT[s.motivo] || s.motivo)}</b> · ${esc(money(s.monto))} · ${esc(fechaCorta(s.created_at))}</p>
        <div class="nxSalCampo"><label class="nxSalLbl" for="nxSalAnuMot">Motivo</label>
          <input class="nxSalIn" id="nxSalAnuMot" type="text" maxlength="200">
          <p class="nxSalNota mal" id="nxSalAnuMotErr" hidden></p>
        </div>
        <div class="nxSalErr" id="nxSalErr" role="alert" hidden></div>
      </div>
      <div class="nxSalFoot"><button type="button" class="nxSalNo">Cancelar</button><button type="submit" class="nxSalSi rojo" id="nxSalAnuSi">Anular salida</button></div>
    </form>`, 'Anular salida');
    const q = x => $(x, ov), inp = q('#nxSalAnuMot'), btn = q('#nxSalAnuSi');
    ov.addEventListener('click', e => { const t = e.target.closest('button'); if (t && !guardando && (t.classList.contains('nxSalX') || t.classList.contains('nxSalNo'))) cerrar(ov); });
    inp.addEventListener('input', () => { inp.classList.remove('mal'); q('#nxSalAnuMotErr').hidden = true; });
    q('form').addEventListener('submit', async e => {
      e.preventDefault(); if (guardando) return;
      const motivo = inp.value.trim(); q('#nxSalErr').hidden = true;
      if (!motivo) { inp.classList.add('mal'); const p = q('#nxSalAnuMotErr'); p.textContent = 'Escriba el motivo'; p.hidden = false; try { inp.focus(); } catch (_) {} return; }
      guardando = true; ov._ocupado = true; btn.disabled = true; btn.textContent = 'Anulando…';
      try {
        const r = await G('API').post('rpc/seguros_anular_salida_custodia', { p_id: s.id, p_motivo: motivo });
        if (r && r.ok === false) throw new Error(r.razon || r.message || 'No se pudo anular');
        cerrar(ov); toast('ok', 'Salida anulada', money(s.monto)); refrescar();
      } catch (err) {
        guardando = false; ov._ocupado = false; btn.disabled = false; btn.textContent = 'Anular salida';
        const box = q('#nxSalErr'); box.innerHTML = '<i class="ti ti-alert-circle"></i><span>' + esc(errTxt(err)) + '</span>'; box.hidden = false;
      }
    });
    try { inp.focus(); } catch (e) {}
  }

  // Tras registrar o anular: la lista de salidas y la custodia se vuelven a pedir al servidor (no se calcula aquí).
  function refrescar() {
    cargarLista();
    try { const f = G('cusCargar'); if (typeof f === 'function' && $('#cusBody')) f(true); } catch (e) {}
    try { if (typeof window.nxC20Invalidar === 'function') window.nxC20Invalidar(); } catch (e) {}
  }

  // ── Lista «Salidas» ──
  function pintarLista() {
    const box = $('#nxSalLista'); if (!box) return;
    if (est.error) { box.innerHTML = '<div class="nxSalVacio">No se pudo cargar. ' + esc(est.error) + '</div><button type="button" class="cuBtn" data-sal="recargar" style="margin-top:8px">Reintentar</button>'; return; }
    if (est.lista == null) { box.innerHTML = '<div class="nxSalVacio">Cargando…</div>'; return; }
    if (!est.lista.length) { box.innerHTML = '<div class="nxSalVacio">Sin salidas. Registre la primera con «Salida».</div>'; return; }
    box.innerHTML = est.lista.map(s => {
      const de = s.motivo === 'deposito_banco' ? 'Efectivo → ' + (s.banco || 'banco') : (s.metodo || '') + (s.metodo === 'Banco' && s.banco ? ' ' + s.banco : '');
      const partes = [de, s.created_by];
      if (s.fecha_real) partes.push('fecha real ' + fechaDia(s.fecha_real));
      if (s.referencia) partes.push('ref. ' + s.referencia);
      if (s.nota) partes.push(s.nota);
      if (s.anulado) partes.unshift('Anulada' + (s.anulado_motivo ? ': ' + s.anulado_motivo : ''));
      const det = partes.filter(Boolean).join(' · ');
      return `<div class="nxSalFila${s.anulado ? ' anu' : ''}" data-id="${esc(s.id)}">
        <span class="nxSalF">${esc(fechaCorta(s.created_at))}</span>
        <span class="nxSalQ"><b>${esc(MOTIVO_TXT[s.motivo] || s.motivo)}</b><span title="${esc(det)}">${esc(det)}</span></span>
        <span class="nxSalM">${esc(money(s.monto))}</span>
        ${s.anulado ? '<span class="nxSalTag">Anulada</span>' : `<button type="button" class="nxSalAnu" data-sal="anular" data-id="${esc(s.id)}" aria-label="Anular la salida de ${esc(money(s.monto))}">Anular</button>`}
      </div>`;
    }).join('');
  }
  async function cargarLista() {
    if (!esAdmin()) return;
    const req = ++est.req;
    if (est.lista == null) pintarLista();
    try {
      const r = await G('API').get('seguros_salidas_custodia', 'select=id,monto,motivo,metodo,banco,referencia,nota,fecha_real,created_at,created_by,anulado,anulado_at,anulado_por,anulado_motivo&order=created_at.desc&limit=50');
      if (req !== est.req) return;
      est.lista = Array.isArray(r) ? r : []; est.error = null;
    } catch (e) {
      if (req !== est.req) return;
      est.error = errTxt(e).slice(0, 160);
    }
    pintarLista();
  }

  // ── Montaje en «Custodia de fondos» (botón en la cabecera y lista debajo) ──
  function montar() {
    if (!esAdmin()) return;
    const wrap = $('#v-custodia .cuWrap'), head = $('#v-custodia .cuHead'); if (!wrap || !head) return;
    css();
    if (!$('.nxSalBtn', head)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cuBtn nxSalBtn'; b.id = 'nxSalAbrir';
      b.innerHTML = '<i class="ti ti-arrow-up-right"></i><span>Salida</span>';
      b.addEventListener('click', abrir);
      head.appendChild(b);
      head.classList.add('nxSalCuHead');
    }
    if (!$('#nxSalBox', wrap)) {
      const sec = document.createElement('section'); sec.id = 'nxSalBox'; sec.className = 'nxSal'; sec.setAttribute('aria-label', 'Salidas');
      sec.innerHTML = '<h3 class="nxSalTit"><i class="ti ti-arrow-up-right"></i>Salidas</h3><div id="nxSalLista"></div>';
      sec.addEventListener('click', e => {
        const t = e.target.closest('[data-sal]'); if (!t) return;
        if (t.dataset.sal === 'anular') abrirAnular(t.dataset.id);
        else if (t.dataset.sal === 'recargar') { est.error = null; est.lista = null; cargarLista(); }
      });
      wrap.appendChild(sec);
      pintarLista();
      cargarLista();
    }
  }
  function instalar() {
    const orig = window.rCustodia;
    if (typeof orig !== 'function') return false;
    if (orig.__nxSal) return true;
    const w = function () { const r = orig.apply(this, arguments); try { montar(); } catch (e) { console.error('[NEXUS PRO] salidas-custodia', e); } return r; };
    w.__nxSal = true; w.__nxSalOrig = orig;
    window.rCustodia = w;
    if ($('#v-custodia .cuWrap')) { try { montar(); } catch (e) {} }
    return true;
  }

  css();
  window.nxSalidaCustodia = abrir;
  if (!instalar()) { let n = 0; const t = setInterval(() => { n++; if (instalar() || n >= 30) clearInterval(t); }, 200); }
})();
