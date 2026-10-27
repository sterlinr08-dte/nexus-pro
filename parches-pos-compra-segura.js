/* parches-pos-compra-segura.js — «Compra segura» en el recibo y la factura (27-oct-2026).
 *
 * Herramienta legal para competir contra la venta informal: que el cliente VEA lo que gana
 * comprando en un negocio formal. Solo pinta datos REALES de la venta:
 *   - garantía por artículo con su fecha (pos_venta_items.garantia_hasta);
 *   - IMEI / serial registrado (pos_venta_items.serial);
 *   - comprobante fiscal (NCF serie B o e-NCF, y el QR de la DGII si es e-CF);
 *   - «Guarde esta factura para cualquier reclamo.» (solo si hay algo de lo anterior);
 *   - un texto opcional del negocio (p. ej. su política de devolución).
 * Si la venta no tiene nada de eso, el bloque NO sale (no inventa nada).
 *
 * parches-pos.js solo llama a window.nxCompraSeguraBloque(tipo, datos) desde ticketHTML() y
 * docFacturaHTML(); si esta capa no carga, el recibo sale igual que siempre.
 * Ajustes del POS: tarjeta «Compra segura en el recibo» (interruptor + texto del negocio).
 * Se guarda por equipo en localStorage (pos_config aún no tiene columnas; propuesta en
 * supabase/migrations/20261027_pos_compra_segura_PROPUESTA.sql, sin aplicar).
 * No escribe en Supabase. Apagar la capa entera: localStorage.nx_pos_compra_segura_off='1'.
 */
(function () {
  'use strict';
  var LS_OFF = 'nx_pos_compra_segura_off';   // apaga TODA la capa (recibo y ajustes)
  var LS_MOSTRAR = 'nx_pos_cs_mostrar';      // '0' = interruptor de Ajustes apagado
  var LS_TEXTO = 'nx_pos_cs_texto';          // texto opcional del negocio
  var MAX_TXT = 160;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function capaOff() { return lsGet(LS_OFF) === '1'; }
  function mostrar() { return lsGet(LS_MOSTRAR) !== '0'; }
  function textoNegocio() { return String(lsGet(LS_TEXTO) || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TXT); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  // 'AAAA-MM-DD' (o con hora) → '27-ene-2027'. Se lee el texto tal cual: sin Date(), para que la
  // zona horaria no corra el día.
  function fechaCorta(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    var mes = MESES[Number(m[2]) - 1]; if (!mes) return '';
    return m[3] + '-' + mes + '-' + m[1];
  }

  // Une los datos de la venta (ticket: v con v._items; carta: d con d._venta y d._items).
  function datosVenta(tipo, d) {
    if (!d) return null;
    if (tipo === 'carta') {
      if (!d._venta) return null;                      // vista previa / prefactura: aún no es una venta
      return { v: d._venta, items: d._items || [], qr: d._qr || '' };
    }
    return { v: d, items: d._items || [], qr: '' };
  }

  function lineas(v, items) {
    var out = { gar: [], ser: [], fiscal: null };
    (items || []).forEach(function (it) {
      var nom = String(it.nombre || 'Artículo');
      var f = fechaCorta(it.garantia_hasta);
      if (f) out.gar.push({ nom: nom, f: f });
      var s = String(it.serial || '').trim();
      if (s) out.ser.push({ nom: nom, s: s });
    });
    var ncf = String(v.ncf || '').trim();
    var e = /^E(3[1-4])/.exec(ncf);
    if (e) out.fiscal = { ecf: true, ncf: ncf, sello: !!v.ecf_security_code };
    else if (/^B\d{2}\d+/.test(ncf)) out.fiscal = { ecf: false, ncf: ncf, credito: /^B01/.test(ncf) };
    return out;
  }

  var CSS_TICKET = '<style>.nxCs{border:1px solid #111;border-radius:6px;padding:6px 7px;margin:8px 0;font-size:11px;line-height:1.4;overflow-wrap:anywhere;word-break:break-word;page-break-inside:avoid;break-inside:avoid}'
    + '.nxCs .t{font-weight:800;font-size:12px;text-align:center;margin-bottom:3px}.nxCs .r{margin:2px 0}.nxCs .r b{font-weight:800}.nxCs .g{margin-top:4px;text-align:center;font-weight:700}.nxCs .n{margin-top:4px;border-top:1px dashed #999;padding-top:4px;color:#333}</style>';
  var CSS_CARTA = '<style>.nxCs{margin-top:18px;border:1px solid #d1fae5;background:#f0fdf4;border-radius:12px;padding:12px 14px;font-size:12px;color:#14532d;line-height:1.6;overflow-wrap:anywhere;page-break-inside:avoid;break-inside:avoid}'
    + '.nxCs .t{font-size:13px;font-weight:800;color:#15803d;margin-bottom:4px;display:flex;align-items:center;gap:6px}.nxCs .r{margin:1px 0}.nxCs .r b{color:#0f172a}'
    + '.nxCs .cols{display:flex;gap:14px;align-items:flex-start}.nxCs .cols>div:first-child{flex:1;min-width:0}.nxCs .qr img{display:block;width:110px;height:110px}.nxCs .qr div{font-size:10px;color:#475569;text-align:center;margin-top:2px}'
    + '.nxCs .g{margin-top:6px;font-weight:700;color:#15803d}.nxCs .n{margin-top:6px;color:#334155}'
    + '@media print{.nxCs{background:#fff;border-color:#94a3b8;color:#111}.nxCs .t,.nxCs .g{color:#111}}</style>';

  // Lo que se llama desde parches-pos.js. Devuelve '' si no hay nada real que mostrar.
  window.nxCompraSeguraBloque = function (tipo, d) {
    if (capaOff() || !mostrar()) return '';
    var x = datosVenta(tipo, d); if (!x || !x.v) return '';
    var v = x.v;
    if (v.anulada || v.estado === 'anulada') return '';
    var L = lineas(v, x.items);
    var txt = textoNegocio();
    var hayDatos = L.gar.length || L.ser.length || L.fiscal;
    if (!hayDatos && !txt) return '';
    var rs = [];
    var ck = '✓ ';
    L.gar.forEach(function (g) { rs.push('<div class="r">' + ck + 'Garantía hasta <b>' + esc(g.f) + '</b>' + (L.gar.length > 1 || x.items.length > 1 ? ' · ' + esc(g.nom) : '') + '</div>'); });
    L.ser.forEach(function (s) { rs.push('<div class="r">' + ck + 'IMEI / serial registrado: <b>' + esc(s.s) + '</b>' + (L.ser.length > 1 || x.items.length > 1 ? ' · ' + esc(s.nom) : '') + '</div>'); });
    if (L.fiscal) {
      if (L.fiscal.ecf) {
        var conQR = tipo === 'carta' ? !!x.qr : L.fiscal.sello;
        rs.push('<div class="r">' + ck + 'Factura electrónica e-NCF <b>' + esc(L.fiscal.ncf) + '</b>' + (conQR ? (tipo === 'carta' ? ': verifíquela con el código QR de la DGII' : ': verifíquela con el código QR de arriba') : '') + '</div>');
      } else {
        rs.push('<div class="r">' + ck + 'Comprobante fiscal NCF <b>' + esc(L.fiscal.ncf) + '</b>' + (L.fiscal.credito ? ' (crédito fiscal)' : '') + '</div>');
      }
    }
    var cuerpo = rs.join('')
      + (hayDatos ? '<div class="g">Guarde esta factura para cualquier reclamo.</div>' : '')
      + (txt ? '<div class="n">' + esc(txt) + '</div>' : '');
    if (tipo === 'carta') {
      var qr = (L.fiscal && L.fiscal.ecf && x.qr) ? '<div class="qr"><img src="' + x.qr + '" alt="Código QR de la DGII" width="110" height="110"><div>QR de la DGII</div></div>' : '';
      return CSS_CARTA + '<div class="nxCs" role="note" aria-label="Compra segura"><div class="t">✓ Compra segura</div>'
        + (qr ? '<div class="cols"><div>' + cuerpo + '</div>' + qr + '</div>' : cuerpo) + '</div>';
    }
    return CSS_TICKET + '<div class="nxCs" role="note" aria-label="Compra segura"><div class="t">Compra segura</div>' + cuerpo + '</div>';
  };

  // ── Ajustes del POS: tarjeta «Compra segura en el recibo» ──
  var CSS_AJ = '#nxCsCard,#nxCsCard *{text-transform:none!important;letter-spacing:normal}'
    + '#nxCsCard .csRow{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px}'
    + '#nxCsCard .csLbl{font-size:14px;font-weight:700;color:var(--pf-txt,#0f172a)}'
    + '#nxCsCard .csSw{flex:none;position:relative;width:52px;min-width:52px;height:44px;border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '#nxCsCard .csSw::before{content:"";position:absolute;left:0;top:10px;width:52px;height:24px;border-radius:999px;background:var(--pf-pill-bg,#dde1e6);transition:background .22s cubic-bezier(.22,1,.36,1)}'
    + '#nxCsCard .csSw::after{content:"";position:absolute;left:3px;top:13px;width:18px;height:18px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.3);transition:transform .22s cubic-bezier(.22,1,.36,1)}'
    + '#nxCsCard .csSw[aria-checked="true"]::before{background:var(--pf-green,#16a34a)}#nxCsCard .csSw[aria-checked="true"]::after{transform:translateX(28px)}'
    + '#nxCsCard .csSw:focus-visible{outline:2px solid var(--pf-blue,#2563eb);outline-offset:2px;border-radius:12px}'
    + '#nxCsCard textarea{width:100%;min-height:48px;box-sizing:border-box;border-radius:12px;border:1.5px solid var(--pf-line,#e8ebf0);background:var(--pf-panel,#fff);color:var(--pf-txt,#0f172a);font:inherit;font-size:16px;line-height:1.4;padding:12px;resize:vertical;outline:0;text-transform:none}'
    + '#nxCsCard textarea:focus{border-color:rgba(59,130,246,.6);box-shadow:0 0 0 4px rgba(59,130,246,.16)}'
    + '#nxCsCard .csCnt{font-size:12px;color:var(--pf-txt3,#94a3b8);text-align:right;margin-top:4px;font-variant-numeric:tabular-nums}'
    + '#nxCsCard .csLab{font-size:13px;font-weight:700;color:var(--pf-txt2,#64748b);margin:12px 0 6px;display:block;text-transform:none;letter-spacing:0}'
    + '@media (prefers-reduced-motion:reduce){#nxCsCard .csSw::before,#nxCsCard .csSw::after{transition:none}}';

  function tarjetaHTML() {
    var on = mostrar(), t = textoNegocio();
    return '<div class="card" id="nxCsCard"><h4><i class="ti ti-shield-check" style="color:var(--pf-green)"></i> Compra segura en el recibo</h4>'
      + '<div class="ajd">Recuadro en el ticket y la factura con lo que el cliente gana al comprar formal: garantía con fecha, IMEI registrado y comprobante fiscal. Solo sale lo que tenga esa venta. Se guarda en este equipo.</div>'
      + '<div class="csRow"><span class="csLbl" id="nxCsLbl">Mostrar bloque Compra segura en el recibo</span>'
      + '<button type="button" class="csSw" id="nxCsSw" role="switch" aria-labelledby="nxCsLbl" aria-checked="' + (on ? 'true' : 'false') + '" onclick="window.nxCompraSeguraSw()"></button></div>'
      + '<label class="csLab" for="nxCsTxt">Texto del negocio (opcional)</label>'
      + '<textarea id="nxCsTxt" class="no-upper" rows="2" maxlength="' + MAX_TXT + '" placeholder="Ej.: Cambios en 7 días con factura y empaque original." oninput="window.nxCompraSeguraTxt(this)">' + esc(t) + '</textarea>'
      + '<div class="csCnt" id="nxCsCnt">' + t.length + ' / ' + MAX_TXT + '</div></div>';
  }
  window.nxCompraSeguraSw = function () {
    var on = !mostrar();
    lsSet(LS_MOSTRAR, on ? null : '0');
    var b = document.getElementById('nxCsSw'); if (b) b.setAttribute('aria-checked', on ? 'true' : 'false');
  };
  var _tTxt = null;
  window.nxCompraSeguraTxt = function (el) {
    var v = String(el.value || '').slice(0, MAX_TXT);
    if (v !== el.value) el.value = v;
    var c = document.getElementById('nxCsCnt'); if (c) c.textContent = v.length + ' / ' + MAX_TXT;
    clearTimeout(_tTxt);
    _tTxt = setTimeout(function () { lsSet(LS_TEXTO, v.trim() ? v : null); }, 250);
  };

  function inyectar() {
    if (capaOff()) return;
    var w = document.querySelector('.nxAjWrap');
    if (!w || w.querySelector('#nxCsCard')) return;
    if (!document.getElementById('nxCsAjCSS')) { var st = document.createElement('style'); st.id = 'nxCsAjCSS'; st.textContent = CSS_AJ; document.head.appendChild(st); }
    // Debajo de «Garantía de reparación» (la tarjeta con #cfgGarantiaRepDias); si no está, al final.
    var ref = w.querySelector('#cfgGarantiaRepDias');
    var card = ref ? ref.closest('.card') : null;
    var tmp = document.createElement('div'); tmp.innerHTML = tarjetaHTML();
    var nuevo = tmp.firstChild;
    if (card && card.parentNode === w) w.insertBefore(nuevo, card.nextSibling); else w.appendChild(nuevo);
  }
  // MutationObserver: se inserta en el mismo ciclo en que se pinta Ajustes (antes del repintado), sin parpadeo.
  if (!capaOff()) {
    try {
      var mo = new MutationObserver(function () { if (document.querySelector('.nxAjWrap') && !document.getElementById('nxCsCard')) inyectar(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    inyectar();
  }
})();
