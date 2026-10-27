// ═══════════════════════════════════════════════════════════════════════════════════════════════
// POS · «Clientes con RNC»: lista y oferta de crédito fiscal (27-oct-2026)
// Ventaja legal del negocio formal: la empresa con RNC que compra con factura de crédito fiscal (B01 / E31)
// puede usar el 18 % de ITBIS pagado como crédito fiscal. Esta capa:
//   · agrega el botón «Clientes con RNC» en POS → Clientes (una sola entrada);
//   · lista los pos_clientes con RNC o cédula válidos (9 u 11 dígitos), con lo comprado en 90 días, la última compra,
//     si ya compran con crédito fiscal o solo consumo y su teléfono;
//   · marca «Oportunidad» a quien compra sin crédito fiscal o lleva 60 días sin comprar;
//   · «Preparar mensaje» abre un BORRADOR editable: solo copia el texto o abre wa.me en otra pestaña para que una
//     persona lo envíe. NUNCA envía nada ni llama funciones de WhatsApp;
//   · exporta la lista a CSV.
// Solo LEE la base (pos_clientes y pos_ventas). Apagar: localStorage.nx_pos_empresas_off = '1'.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  try { if (localStorage.getItem('nx_pos_empresas_off') === '1') return; } catch (e) {}
  if (window.__nxPosEmpresas) return; window.__nxPosEmpresas = true;

  const DIA = 86400000;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const fmt = n => { const v = Math.round(Number(n || 0) * 100) / 100; return 'RD$ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const dig = v => String(v || '').replace(/\D/g, '');
  const rncValido = v => /^(\d{9}|\d{11})$/.test(dig(v));
  const rncFmt = v => { const d = dig(v); return d.length === 9 ? d.replace(/^(\d)(\d{2})(\d{5})(\d)$/, '$1-$2-$3-$4') : d.length === 11 ? d.replace(/^(\d{3})(\d{7})(\d)$/, '$1-$2-$3') : d; };
  const waNum = t => { let d = dig(t); if (d.length === 10) d = '1' + d; return d.length >= 11 ? d : ''; };
  const api = () => { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } };
  const fechaVenta = v => { const t = Date.parse(v.fecha && String(v.fecha).length > 10 ? v.fecha : (v.created_at || v.fecha || '')); return isNaN(t) ? 0 : t; };
  const fechaDMY = t => { if (!t) return ''; const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
  // Crédito fiscal = NCF B01 o e-CF E31 (por el número asignado o por el tipo elegido en la caja)
  const esCreditoFiscal = v => /^(B01|E31)/i.test(String(v.ncf || '')) || ['credito_fiscal', 'ecf31', 'B01', 'E31'].includes(String(v.tipo_comprobante || ''));
  function negocio() {
    try { const s = window.sesion || JSON.parse(sessionStorage.getItem('nx_sesion') || 'null'); if (s && s.org && s.org.nombre) return s.org.nombre; } catch (e) {}
    return 'nuestro negocio';
  }
  const tituloNombre = s => String(s || '').toLowerCase().replace(/(^|[\s.-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

  // ── Estilos (se inyectan al cargar la capa, antes de que exista la ventana → sin parpadeo) ──
  const css = `
#nxEmpOv{--e-ink:#0f172a;--e-ink2:#475569;--e-ink3:#64748b;--e-line:rgba(15,23,42,.08);--e-glass:rgba(255,255,255,.96);--e-fill:#f1f5f9;--e-blue:#2563eb;--e-blue-l:rgba(59,130,246,.10);--e-ok:#15803d;--e-ok-l:#f0fdf4;--e-warn:#b45309;--e-warn-l:#fef3c7;--e-cy:#0e7490;--e-cy-l:#ecfeff;
  position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:var(--e-ink)}
body.tema-premium #nxEmpOv{--e-ink:#e2e8f0;--e-ink2:#cbd5e1;--e-ink3:#94a3b8;--e-line:rgba(148,163,184,.18);--e-glass:rgba(15,23,42,.97);--e-fill:#1e293b;--e-blue:#60a5fa;--e-blue-l:rgba(59,130,246,.18);--e-ok:#4ade80;--e-ok-l:rgba(34,197,94,.14);--e-warn:#fbbf24;--e-warn-l:rgba(245,158,11,.16);--e-cy:#67e8f9;--e-cy-l:rgba(6,182,212,.14);background:rgba(2,6,23,.6)}
#nxEmpOv *{box-sizing:border-box}
#nxEmpOv,#nxEmpOv *,#nxEmpOv ::placeholder,#nxEmpDr,#nxEmpDr *,#nxEmpDr ::placeholder{text-transform:none!important}
#nxEmpOv .eCab span{text-transform:uppercase!important}
#nxEmpOv .eBox{width:min(1080px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:var(--e-glass);border-radius:20px;box-shadow:0 0 0 1px var(--e-line),0 30px 70px -24px rgba(15,23,42,.45),0 12px 24px -12px rgba(15,23,42,.18);overflow:hidden;animation:nxEmpIn .26s cubic-bezier(.34,1.56,.64,1)}
@keyframes nxEmpIn{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#nxEmpOv .eBox,#nxEmpDr .eBox{animation:none}}
#nxEmpOv .eHd{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--e-line)}
#nxEmpOv .eTit{margin:0;font-size:17px!important;font-weight:700;flex:1;min-width:0;letter-spacing:0;color:var(--e-ink)!important;-webkit-text-fill-color:currentColor}
#nxEmpOv .eTit i{color:var(--e-blue);margin-right:6px}
#nxEmpOv .eX{width:44px;height:44px;border-radius:999px;border:0!important;background:var(--e-fill)!important;color:var(--e-ink2)!important;box-shadow:none!important;font-size:18px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
#nxEmpOv .eBody{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 16px calc(16px + env(safe-area-inset-bottom,0px))}
#nxEmpOv .eKpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:10px}
#nxEmpOv .eKpi{background:var(--e-fill);border-radius:14px;padding:10px 12px;min-width:0}
#nxEmpOv .eKpi span{display:block;font-size:12px;color:var(--e-ink3);text-transform:none}
#nxEmpOv .eKpi b{display:block;font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#nxEmpOv .eNota{font-size:13px;color:var(--e-ink2);margin:0 0 10px;text-transform:none}
#nxEmpOv .eTools{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
#nxEmpOv .eBusca{flex:1 1 220px;display:flex;align-items:center;gap:8px;height:48px;padding:0 14px;border-radius:14px;background:var(--e-fill);color:var(--e-ink3)}
#nxEmpOv .eBusca input{flex:1;min-width:0;border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;margin:0!important;font-size:16px!important;color:var(--e-ink)!important;outline:none;height:46px!important;border-radius:0!important}
#nxEmpOv .eBusca:focus-within{box-shadow:0 0 0 1px rgba(59,130,246,.6),0 0 0 4px rgba(59,130,246,.16)}
#nxEmpOv .eChips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;max-width:100%}
#nxEmpOv .eChip,#nxEmpOv .eBtn,#nxEmpDr .eBtn{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--e-line)!important;background:var(--e-glass)!important;color:var(--e-ink)!important;box-shadow:none!important;font-size:14px!important;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;white-space:nowrap;text-transform:none;letter-spacing:0;font-family:inherit;text-decoration:none;transition:transform .16s cubic-bezier(.22,1,.36,1)}
#nxEmpOv .eChip:active,#nxEmpOv .eBtn:active,#nxEmpDr .eBtn:active{transform:scale(.96)}
#nxEmpOv .eChip.on{background:var(--e-blue)!important;border-color:var(--e-blue)!important;color:#fff!important}
#nxEmpOv .eChip b{font-variant-numeric:tabular-nums}
#nxEmpOv .eBtn.pri,#nxEmpDr .eBtn.pri{background:var(--e-blue)!important;border-color:var(--e-blue)!important;color:#fff!important}
#nxEmpDr .eBtn[aria-disabled="true"]{opacity:.45;cursor:default}
#nxEmpOv .eLista{border-radius:16px;border:1px solid var(--e-line);overflow:hidden}
#nxEmpOv .eCab{display:none}
#nxEmpOv .eFila{display:grid;grid-template-columns:1fr auto;gap:6px 10px;padding:12px;border-top:1px solid var(--e-line);min-height:52px;align-items:center}
#nxEmpOv .eFila:first-child,#nxEmpOv .eCab+.eFila{border-top:0}
#nxEmpOv .eFila:hover{background:var(--e-blue-l)}
#nxEmpOv .eNom{font-size:15px;font-weight:700;min-width:0;overflow-wrap:anywhere;text-transform:none}
#nxEmpOv .eSub{font-size:12px;color:var(--e-ink3);font-variant-numeric:tabular-nums;text-transform:none}
#nxEmpOv .eMonto{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
#nxEmpOv .eUlt{font-size:13px;color:var(--e-ink2);font-variant-numeric:tabular-nums;white-space:nowrap}
#nxEmpOv .eTags{display:flex;flex-wrap:wrap;gap:6px;grid-column:1/-1}
#nxEmpOv .eTag{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;background:var(--e-fill);color:var(--e-ink2);white-space:nowrap;text-transform:none}
#nxEmpOv .eTag::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.85}
#nxEmpOv .eTag.cf{background:var(--e-ok-l);color:var(--e-ok)}
#nxEmpOv .eTag.co{background:var(--e-cy-l);color:var(--e-cy)}
#nxEmpOv .eTag.op{background:var(--e-warn-l);color:var(--e-warn)}
#nxEmpOv .eAcc{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#nxEmpOv .eTel{font-size:13px;color:var(--e-ink2);font-variant-numeric:tabular-nums;text-transform:none}
#nxEmpOv .eVacio{padding:28px 12px;text-align:center;color:var(--e-ink3);font-size:14px;text-transform:none}
@media (min-width:860px){
  #nxEmpOv .eCab{display:grid;grid-template-columns:minmax(0,2fr) 150px 110px minmax(0,1.6fr) 130px 190px;gap:12px;padding:10px 12px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#94a3b8;font-weight:700}
  #nxEmpOv .eCab span:nth-child(2){text-align:right}
  #nxEmpOv .eFila{grid-template-columns:minmax(0,2fr) 150px 110px minmax(0,1.6fr) 130px 190px;gap:6px 12px}
  #nxEmpOv .eTags,#nxEmpOv .eAcc{grid-column:auto}
  #nxEmpOv .eAcc{justify-content:flex-end;flex-wrap:nowrap}
}
@media (max-width:640px){
  #nxEmpOv{padding:0;align-items:stretch}
  #nxEmpOv .eBox{max-height:none;height:100%;border-radius:0;padding-top:env(safe-area-inset-top,0px)}
  #nxEmpOv .eKpis{gap:6px}
  #nxEmpOv .eKpi{padding:8px 10px}
  #nxEmpOv .eKpi b{font-size:14px}
  #nxEmpOv .eTools .eBtn{flex:1 1 auto}
}
#nxEmpDr{position:fixed;inset:0;z-index:100060;background:rgba(15,23,42,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;
  --e-ink:#0f172a;--e-ink2:#475569;--e-line:rgba(15,23,42,.08);--e-glass:rgba(255,255,255,.97);--e-fill:#f1f5f9;--e-blue:#2563eb}
body.tema-premium #nxEmpDr{--e-ink:#e2e8f0;--e-ink2:#cbd5e1;--e-line:rgba(148,163,184,.18);--e-glass:rgba(15,23,42,.98);--e-fill:#1e293b;--e-blue:#60a5fa;background:rgba(2,6,23,.6)}
#nxEmpDr *{box-sizing:border-box}
#nxEmpDr .eBox{width:min(560px,100%);background:var(--e-glass);color:var(--e-ink);border-radius:20px;box-shadow:0 0 0 1px var(--e-line),0 30px 70px -24px rgba(15,23,42,.45);padding:16px;display:flex;flex-direction:column;gap:10px;max-height:calc(100vh - 32px);overflow-y:auto;animation:nxEmpIn .26s cubic-bezier(.34,1.56,.64,1)}
#nxEmpDr .eTit{margin:0;font-size:17px!important;font-weight:700;letter-spacing:0;color:var(--e-ink)!important;-webkit-text-fill-color:currentColor}
#nxEmpDr p{margin:0;font-size:13px;color:var(--e-ink2);text-transform:none}
#nxEmpDr .eLbl{font-size:13px!important;font-weight:600;color:var(--e-ink2)!important}
#nxEmpDr textarea{width:100%;min-height:220px;border-radius:14px!important;border:1px solid var(--e-line)!important;background:var(--e-fill)!important;color:var(--e-ink)!important;box-shadow:none;font:16px/1.45 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;padding:12px 14px;resize:vertical;text-transform:none;outline:none}
#nxEmpDr textarea:focus{border-color:rgba(59,130,246,.6)!important;box-shadow:0 0 0 4px rgba(59,130,246,.16)!important}
#nxEmpDr .eRow{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
#nxEmpDr .eOk{font-size:13px;color:#15803d;min-height:18px;text-transform:none}
@media (max-width:640px){#nxEmpDr{align-items:flex-end;padding:0}#nxEmpDr .eBox{border-radius:20px 20px 0 0;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));max-height:92vh}#nxEmpDr .eRow .eBtn{flex:1 1 auto}}
body.tema-premium #nxEmpOv .eBtn.pri,body.tema-premium #nxEmpOv .eChip.on,body.tema-premium #nxEmpDr .eBtn.pri{background:#2563eb!important;border-color:#2563eb!important}
.nxEmpAbrir{min-height:44px}
`;
  try { const st = document.createElement('style'); st.id = 'nxPosEmpresasCSS'; st.textContent = css; document.head.appendChild(st); } catch (e) {}

  // ── Estado ──
  let _filas = [], _filtro = 'todos', _q = '', _cargando = false;

  // ── Datos (solo lectura) ──
  async function leerTodas(tabla, qs) {
    const out = [], PAG = 1000;
    for (let off = 0; off < 20000; off += PAG) {
      const r = await api().get(tabla, qs + '&limit=' + PAG + '&offset=' + off) || [];
      out.push.apply(out, r); if (r.length < PAG) break;
    }
    return out;
  }
  async function cargar() {
    const ahora = Date.now();
    const desde = new Date(ahora - 365 * DIA).toISOString();
    const [clientes, ventas] = await Promise.all([
      leerTodas('pos_clientes', 'select=*&activo=eq.true&order=nombre.asc'),
      leerTodas('pos_ventas', 'select=id,cliente_id,total,fecha,created_at,ncf,tipo_comprobante,estado&cliente_id=not.is.null&created_at=gte.' + encodeURIComponent(desde) + '&order=created_at.desc')
    ]);
    const porCli = {};
    for (const v of ventas) {
      if (!v || !v.cliente_id || String(v.estado || '') === 'anulada') continue;
      (porCli[v.cliente_id] = porCli[v.cliente_id] || []).push(v);
    }
    return clientes.filter(c => c && c.es_cliente !== false && rncValido(c.cedula)).map(c => {
      const vs = porCli[c.id] || [];
      let tot90 = 0, ult = 0, nCF = 0, nCo = 0, cons90 = 0;
      for (const v of vs) {
        const t = fechaVenta(v); if (t > ult) ult = t;
        const cf = esCreditoFiscal(v); if (cf) nCF++; else nCo++;
        if (t >= ahora - 90 * DIA) { tot90 += Number(v.total || 0); if (!cf) cons90 += Number(v.total || 0); }
      }
      const comprobante = !vs.length ? 'sin' : nCF && !nCo ? 'cf' : nCF ? 'mixto' : 'consumo';
      const sinCF = vs.length > 0 && nCo > 0; // compra al menos a veces sin crédito fiscal
      const inactivo = !ult || ult < ahora - 60 * DIA;
      const d = dig(c.cedula);
      return {
        id: c.id, nombre: c.nombre || '', doc: d, tipoDoc: d.length === 9 ? 'RNC' : 'Cédula', telefono: c.telefono || '', wa: waNum(c.telefono), aceptaWa: !!c.acepta_whatsapp,
        tot90, cons90, itbis90: Math.round(cons90 / 1.18 * 0.18 * 100) / 100, ult, nCF, nCo, comprobante,
        opSinCF: sinCF, opInactivo: inactivo, oportunidad: sinCF || inactivo
      };
    }).sort((a, b) => (b.oportunidad - a.oportunidad) || (b.tot90 - a.tot90) || a.nombre.localeCompare(b.nombre));
  }

  // ── Vista ──
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const visibles = () => {
    const q = norm(_q.trim()), qd = dig(_q);
    return _filas.filter(f => (_filtro === 'todos' || (_filtro === 'op' && f.oportunidad) || (_filtro === 'cf' && f.nCF > 0))
      && (!q || norm(f.nombre).includes(q) || (qd.length >= 3 && (f.doc.includes(qd) || dig(f.telefono).includes(qd)))));
  };
  function etiquetas(f) {
    const t = [];
    if (f.comprobante === 'cf') t.push('<span class="eTag cf">Crédito fiscal</span>');
    else if (f.comprobante === 'mixto') t.push('<span class="eTag cf">Crédito fiscal a veces</span>');
    else if (f.comprobante === 'consumo') t.push('<span class="eTag co">Solo consumo</span>');
    else t.push('<span class="eTag">Sin compras</span>');
    if (f.opSinCF) t.push('<span class="eTag op" title="Compra sin factura de crédito fiscal: podría usar el ITBIS pagado">Oportunidad: crédito fiscal</span>');
    if (f.opInactivo) t.push('<span class="eTag op" title="Sin compras en los últimos 60 días">Oportunidad: 60 días sin comprar</span>');
    return t.join('');
  }
  function filaHTML(f) {
    return `<div class="eFila" data-emp="${esc(f.id)}"${f.oportunidad ? ' data-op="1"' : ''}>
      <div style="min-width:0"><div class="eNom">${esc(tituloNombre(f.nombre))}</div><div class="eSub">${f.tipoDoc} ${esc(rncFmt(f.doc))}</div></div>
      <div class="eMonto" title="Comprado en los últimos 90 días">${fmt(f.tot90)}<div class="eSub" style="font-weight:400">${f.nCF + f.nCo} compra${f.nCF + f.nCo === 1 ? '' : 's'} en el año</div></div>
      <div class="eUlt">${f.ult ? fechaDMY(f.ult) : 'Nunca'}</div>
      <div class="eTags">${etiquetas(f)}</div>
      <div class="eTel">${f.telefono ? esc(f.telefono) + (f.wa ? ' <i class="ti ti-brand-whatsapp" style="color:#25d366" aria-label="Tiene WhatsApp"></i>' : '') : 'Sin teléfono'}</div>
      <div class="eAcc"><button class="eBtn pri" type="button" data-msg="${esc(f.id)}" onclick="window.nxPosEmpMensaje('${esc(f.id)}')"><i class="ti ti-message-2"></i> Preparar mensaje</button></div>
    </div>`;
  }
  function pintar() {
    const ov = document.getElementById('nxEmpOv'); if (!ov) return;
    const body = ov.querySelector('.eBody');
    if (_cargando) { body.innerHTML = '<div class="eVacio">Cargando clientes con RNC…</div>'; return; }
    const nOp = _filas.filter(f => f.oportunidad).length, nCf = _filas.filter(f => f.nCF > 0).length;
    const tot = _filas.reduce((s, f) => s + f.tot90, 0);
    const chip = (k, t, n) => `<button type="button" class="eChip${_filtro === k ? ' on' : ''}" data-chip="${k}" aria-pressed="${_filtro === k}" onclick="window.nxPosEmpFiltro('${k}')">${t} <b>${n}</b></button>`;
    const vs = visibles();
    const lista = body.querySelector('.eLista');
    const listaHTML = `<div class="eCab"><span>Cliente</span><span>Comprado 90 días</span><span>Última compra</span><span>Comprobante</span><span>Teléfono</span><span></span></div>`
      + (vs.length ? vs.map(filaHTML).join('') : `<div class="eVacio">${_filas.length ? 'Ningún cliente coincide.' : 'Ningún cliente tiene RNC o cédula registrados. Agréguelos en la ficha del cliente.'}</div>`);
    if (lista && body.dataset.listo) { lista.innerHTML = listaHTML; body.querySelectorAll('.eChips').forEach(c => c.outerHTML = `<div class="eChips">${chip('todos', 'Todos', _filas.length)}${chip('op', 'Oportunidad', nOp)}${chip('cf', 'Ya con crédito fiscal', nCf)}</div>`); return; }
    body.dataset.listo = '1';
    body.innerHTML = `
      <div class="eKpis">
        <div class="eKpi"><span>Con RNC o cédula</span><b>${_filas.length}</b></div>
        <div class="eKpi"><span>Oportunidades</span><b style="color:var(--e-warn)">${nOp}</b></div>
        <div class="eKpi"><span>Comprado 90 días</span><b>${fmt(tot)}</b></div>
      </div>
      <p class="eNota">Las empresas que compran con factura de crédito fiscal (B01 o E31) pueden usar el ITBIS pagado (18 %) en su declaración. «Oportunidad» marca a quien compra sin ella o lleva 60 días sin comprar.</p>
      <div class="eTools">
        <label class="eBusca"><i class="ti ti-search"></i><input type="search" id="nxEmpQ" class="no-upper" placeholder="Nombre, RNC o teléfono" aria-label="Buscar cliente con RNC" value="${esc(_q)}" oninput="window.nxPosEmpBuscar(this.value)"></label>
        <div class="eChips">${chip('todos', 'Todos', _filas.length)}${chip('op', 'Oportunidad', nOp)}${chip('cf', 'Ya con crédito fiscal', nCf)}</div>
        <button class="eBtn" type="button" id="nxEmpCSV" onclick="window.nxPosEmpCSV()"><i class="ti ti-file-spreadsheet"></i> Exportar CSV</button>
      </div>
      <div class="eLista">${listaHTML}</div>`;
  }

  window.nxPosEmpresas = async function () {
    if (document.getElementById('nxEmpOv')) return;
    const ov = document.createElement('div'); ov.id = 'nxEmpOv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Clientes con RNC');
    ov.innerHTML = `<div class="eBox"><div class="eHd"><div class="eTit" role="heading" aria-level="2"><i class="ti ti-building"></i>Clientes con RNC</div><button class="eX" type="button" aria-label="Cerrar" onclick="window.nxPosEmpCerrar()"><i class="ti ti-x"></i></button></div><div class="eBody"></div></div>`;
    ov.addEventListener('click', e => { if (e.target === ov) window.nxPosEmpCerrar(); });
    document.body.appendChild(ov);
    _cargando = true; pintar();
    try { _filas = await cargar(); } catch (e) { _filas = []; _cargando = false; const b = ov.querySelector('.eBody'); if (b) b.innerHTML = '<div class="eVacio">No se pudo leer la lista. Revise la conexión e intente otra vez.</div>'; return; }
    _cargando = false; pintar();
  };
  window.nxPosEmpCerrar = function () { const o = document.getElementById('nxEmpOv'); if (o) o.remove(); };
  window.nxPosEmpFiltro = function (k) { _filtro = k; pintar(); };
  window.nxPosEmpBuscar = function (q) { _q = String(q || ''); pintar(); };
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('nxEmpDr')) { document.getElementById('nxEmpDr').remove(); return; }
    window.nxPosEmpCerrar();
  });

  // ── Borrador de mensaje (NUNCA se envía solo) ──
  function borrador(f) {
    const nom = tituloNombre(f.nombre);
    const doc = f.tipoDoc + ' ' + rncFmt(f.doc);
    const neg = negocio();
    if (f.opSinCF) {
      return `Buenos días, ${nom}. Le saluda ${neg}.\n\n`
        + `Le escribimos porque en sus compras con nosotros puede solicitar factura de crédito fiscal a nombre de ${f.tipoDoc === 'RNC' ? 'su empresa' : 'usted'} (${doc}). `
        + `Con esa factura, el ITBIS pagado (18 %) puede usarse como crédito fiscal en su declaración, conforme a las normas de la DGII.`
        + (f.itbis90 > 0 ? ` En sus compras de los últimos 90 días sin crédito fiscal el ITBIS fue de aproximadamente ${fmt(f.itbis90)}.` : '')
        + `\n\nEn su próxima compra solo indíquenos que la desea con crédito fiscal y la emitimos con sus datos.\n\nQuedamos a su disposición.`;
    }
    if (f.opInactivo) {
      return `Buenos días, ${nom}. Le saluda ${neg}.\n\n`
        + `Le recordamos que todas sus compras con nosotros pueden llevar factura de crédito fiscal a nombre de ${f.tipoDoc === 'RNC' ? 'su empresa' : 'usted'} (${doc}), `
        + `para que el ITBIS pagado (18 %) pueda usarse como crédito fiscal en su declaración, conforme a las normas de la DGII.\n\n`
        + `Si necesita una cotización o tiene alguna compra pendiente, con gusto le atendemos.\n\nQuedamos a su disposición.`;
    }
    return `Buenos días, ${nom}. Le saluda ${neg}.\n\n`
      + `Gracias por preferirnos. Le confirmamos que seguimos emitiendo sus facturas de crédito fiscal a nombre de ${f.tipoDoc === 'RNC' ? 'su empresa' : 'usted'} (${doc}).\n\n`
      + `Si necesita una cotización o tiene alguna compra pendiente, con gusto le atendemos.\n\nQuedamos a su disposición.`;
  }
  window.nxPosEmpMensaje = function (id) {
    const f = _filas.find(x => String(x.id) === String(id)); if (!f) return;
    const prev = document.getElementById('nxEmpDr'); if (prev) prev.remove();
    const dr = document.createElement('div'); dr.id = 'nxEmpDr'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-label', 'Borrador de mensaje');
    const waHref = t => f.wa ? 'https://wa.me/' + f.wa + '?text=' + encodeURIComponent(t) : '#';
    const txt = borrador(f);
    dr.innerHTML = `<div class="eBox">
      <div class="eTit" role="heading" aria-level="2">Borrador para ${esc(tituloNombre(f.nombre))}</div>
      <p>Revise y edite el texto. Nada se envía desde aquí: puede copiarlo o abrir WhatsApp para que usted lo envíe.</p>
      <label class="eLbl" for="nxEmpTxt">Mensaje</label>
      <textarea id="nxEmpTxt" class="no-upper" spellcheck="true">${esc(txt)}</textarea>
      <div class="eOk" id="nxEmpOk" aria-live="polite">${f.wa ? '' : 'Este cliente no tiene un teléfono válido para WhatsApp; puede copiar el texto.'}</div>
      <div class="eRow">
        <button class="eBtn" type="button" onclick="document.getElementById('nxEmpDr').remove()">Cerrar</button>
        <button class="eBtn" type="button" id="nxEmpCopiar"><i class="ti ti-copy"></i> Copiar</button>
        <button class="eBtn pri" type="button" id="nxEmpWa" data-href="${esc(waHref(txt))}"${f.wa ? '' : ' aria-disabled="true" disabled'}><i class="ti ti-brand-whatsapp"></i> Abrir WhatsApp</button>
      </div></div>`;
    dr.addEventListener('click', e => { if (e.target === dr) dr.remove(); });
    document.body.appendChild(dr);
    const ta = dr.querySelector('#nxEmpTxt'), a = dr.querySelector('#nxEmpWa'), ok = dr.querySelector('#nxEmpOk');
    ta.addEventListener('input', () => { if (f.wa) a.dataset.href = waHref(ta.value); });
    // Abre wa.me en una pestaña NUEVA con el texto; la persona revisa y pulsa enviar en WhatsApp. Se abre una pestaña
    // en blanco y luego se le pone la dirección: así la capa parches-whatsapp-enrutamiento-nexus (que manda los wa.me de
    // Seguros al Buzón corporativo) no la desvía. El Buzón no sirve aquí: estos clientes de tienda no tienen hilo y Meta
    // no deja escribir texto libre sin que el cliente escriba primero. Nada se envía solo.
    a.addEventListener('click', () => {
      if (!f.wa) return;
      const url = waHref(ta.value);
      let w = null;
      try { w = window.open('', '_blank'); } catch (e) {}
      if (w) { try { w.opener = null; } catch (e) {} w.location.href = url; ok.textContent = 'Se abrió WhatsApp en otra pestaña. Revise el mensaje y envíelo usted.'; }
      else ok.textContent = 'El navegador bloqueó la pestaña nueva. Copie el texto y péguelo en WhatsApp.';
    });
    dr.querySelector('#nxEmpCopiar').addEventListener('click', async () => {
      let hecho = false;
      try { await navigator.clipboard.writeText(ta.value); hecho = true; } catch (e) {}
      if (!hecho) { try { ta.select(); hecho = document.execCommand('copy'); } catch (e) {} }
      ok.textContent = hecho ? 'Texto copiado.' : 'No se pudo copiar; seleccione el texto y cópielo.';
    });
    try { ta.focus({ preventScroll: true }); ta.setSelectionRange(0, 0); } catch (e) {}
  };

  // ── CSV ──
  const celda = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  window.nxPosEmpCSVTexto = function () {
    const cab = ['Cliente', 'Tipo', 'RNC o cédula', 'Teléfono', 'WhatsApp', 'Comprado 90 días', 'Última compra', 'Compras con crédito fiscal (año)', 'Compras solo consumo (año)', 'Comprobante', 'Oportunidad'];
    const comp = { cf: 'Crédito fiscal', mixto: 'Mixto', consumo: 'Solo consumo', sin: 'Sin compras' };
    const filas = visibles().map(f => [f.nombre, f.tipoDoc, rncFmt(f.doc), f.telefono, f.wa, (Math.round(f.tot90 * 100) / 100).toFixed(2), f.ult ? new Date(f.ult).toISOString().slice(0, 10) : '', f.nCF, f.nCo, comp[f.comprobante],
      [f.opSinCF ? 'Compra sin crédito fiscal' : '', f.opInactivo ? '60 días sin comprar' : ''].filter(Boolean).join(' y ')]);
    return '﻿' + [cab].concat(filas).map(r => r.map(celda).join(',')).join('\r\n');
  };
  window.nxPosEmpCSV = function () {
    const blob = new Blob([window.nxPosEmpCSVTexto()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clientes-con-rnc-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  // ── Entrada única: botón en POS → Clientes ──
  function ponerBoton() {
    const tb = document.getElementById('nxCliTb'); if (!tb) return;
    const v = document.getElementById('v-pos'); if (!v) return;
    const bar = v.querySelector('.toolbar2.nxConBusca'); if (!bar || bar.querySelector('.nxEmpAbrir')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ab g3 sm nxEmpAbrir';
    b.innerHTML = '<i class="ti ti-building"></i> Clientes con RNC'; b.onclick = () => window.nxPosEmpresas();
    bar.appendChild(b);
  }
  function vigilar() {
    const v = document.getElementById('v-pos');
    if (!v) { setTimeout(vigilar, 1500); return; }
    ponerBoton();
    new MutationObserver(ponerBoton).observe(v, { childList: true, subtree: true });
  }
  vigilar();
})();
