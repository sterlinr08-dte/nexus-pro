// ═══════════════════════════════════════════════════════════════════════════════════════════════
// parches-pos-volumen.js — Precios por cantidad («desde 2 unidades a RD$ X c/u») · 27-oct-2026
// Herramienta legal para competir en precio: escalas por artículo, sin tocar el ITBIS ni el NCF.
//  · Ficha del artículo → pestaña «Precios y Niveles» → tarjeta «Precio por cantidad».
//    Nunca por debajo del costo con ITBIS ni del precio mínimo.
//  · Factura / Prefactura / Vender: al subir la cantidad, el precio de la línea baja solo a la escala
//    que toca y se lee «Precio por cantidad (desde N)». Si el cajero cambió el precio a mano
//    (it.precioManual, lo marca nxFacPrecio), se respeta. Convive con «Cubrir 6 % del ITBIS» (it.cubre6)
//    y con el descuento por línea, que se aplican ENCIMA del precio por cantidad.
//  · Sugerencia: «Lleve 1 más y paga RD$ X c/u» cuando a la línea le falta 1 unidad para la escala.
// Guardado: columna jsonb pos_productos.precio_volumen = [{desde, precio}] (propuesta en
// supabase/migrations/20261027100000_pos_precio_volumen_PROPUESTA.sql). Si la columna no existe,
// la tarjeta muestra un aviso y no envía nada; la caja no cambia.
// Ganchos en parches-pos.js: window.__nxPosVolApi, volAjustar(), volLinea(), nxPosVolBody/Validar/Ficha.
// Apagar: localStorage.nx_pos_volumen_off = '1'.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  try { if (localStorage.getItem('nx_pos_volumen_off') === '1') return; } catch (e) {}
  if (window.__nxPosVolumen) return;
  window.__nxPosVolumen = true;

  const COL = 'precio_volumen';
  const A = () => window.__nxPosVolApi || null;
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const fmt = n => { const a = A(); return a ? a.fmt(n) : 'RD$ ' + r2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const num = v => { const n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };

  // Escalas guardadas de un artículo, limpias y en orden (desde 2 en adelante).
  function escalasDe(p) {
    let a = p && p[COL];
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch (e) { a = null; } }
    if (!Array.isArray(a)) return [];
    return a.map(x => ({ desde: Math.floor(num(x && x.desde)), precio: r2(num(x && x.precio)) }))
      .filter(x => x.desde >= 2 && x.precio > 0)
      .sort((x, y) => x.desde - y.desde);
  }
  // Piso que nunca se cruza: costo con ITBIS (si el artículo lo lleva) y precio mínimo.
  function pisoDe(p) {
    const a = A(); const costo = Number(p && p.costo || 0) * (p && p.itbis !== false ? 1.18 : 1);
    const mn = a && p ? Number(a.minimoDe(p) || 0) : Number(p && p.precio_minimo || 0);
    return Math.max(r2(costo), mn);
  }
  const prodDe = id => { const a = A(); return a ? (a.prods() || []).find(x => String(x.id) === String(id)) : null; };

  // ── Caja: ajusta el precio de cada línea antes de pintar (lo llama pintarFactura/pintarCarrito) ──
  window.nxPosVolAjustar = function (cart) {
    (cart || []).forEach(it => {
      if (!it || it._combo) return;
      if (it.precioManual) { delete it._vol; delete it._volBase; return; } // el cajero manda
      const p = prodDe(it.producto_id); const ls = p ? escalasDe(p) : [];
      const base = it._vol ? Number(it._volBase || 0) : Number(it.precio || 0);
      const piso = p ? pisoDe(p) : 0, cant = Number(it.cantidad || 0);
      let e = null;
      ls.forEach(x => { if (x.desde <= cant && x.precio < base && x.precio >= piso && (!e || x.precio < e.precio)) e = x; });
      if (e) { if (!it._vol) it._volBase = base; it.precio = e.precio; it._vol = e.desde; }
      else if (it._vol) { it.precio = base; delete it._vol; delete it._volBase; }
    });
  };
  // La próxima escala a la que le falta exactamente 1 unidad (para la sugerencia).
  function proxima(it) {
    if (!it || it._combo || it.precioManual) return null;
    const p = prodDe(it.producto_id); if (!p) return null;
    const base = it._vol ? Number(it._volBase || 0) : Number(it.precio || 0), piso = pisoDe(p), cant = Number(it.cantidad || 0);
    const e = escalasDe(p).find(x => x.desde === cant + 1 && x.precio < Number(it.precio || 0) && x.precio < base && x.precio >= piso);
    return e || null;
  }
  window.nxPosVolLinea = function (it, i, modo) {
    if (!it) return '';
    let h = '';
    if (it._vol) h += `<span class="nxVolTag" title="Precio por cantidad (desde ${Number(it._vol)})"><i class="ti ti-stack-2" aria-hidden="true"></i> ${modo === 'vender' ? 'Desde ' + Number(it._vol) + ' u.' : 'Precio por cantidad (desde ' + Number(it._vol) + ')'}</span>`;
    const nx = proxima(it);
    if (nx) {
      const fn = modo === 'vender' ? `window.nxPosQty(${i},1)` : `window.nxFacQtyStep(${i},1)`;
      h += `<button type="button" class="nxVolSug" onclick="event.stopPropagation();${fn}" aria-label="Agregar una unidad más y pagar ${esc(fmt(nx.precio))} cada una"><i class="ti ti-plus" aria-hidden="true"></i> Lleve 1 más y paga ${esc(fmt(nx.precio))} c/u</button>`;
    }
    return h ? `<div class="nxVolLn">${h}</div>` : '';
  };

  // ── ¿La base ya tiene la columna? select=* trae todas, así que basta con mirar un artículo. ──
  let _col = null; // null = sin saber · true · false
  async function columnaExiste() {
    if (_col !== null) return _col;
    const a = A(); const ps = a ? a.prods() || [] : [];
    if (ps.length) { _col = ps.some(p => Object.prototype.hasOwnProperty.call(p, COL)); return _col; }
    try { await a.api().get('pos_productos', 'select=' + COL + '&limit=1'); _col = true; } catch (e) { _col = false; }
    return _col;
  }
  window.nxPosVolColumna = function (v) { _col = v === undefined ? null : !!v; }; // para QA / tras aplicar la migración

  // ── Ficha del artículo ──
  let _filas = [], _activa = false;
  function datosFicha() {
    const g = id => { const el = document.getElementById(id); return el ? el.value : null; };
    const itb = g('ppItb');
    return { costo: num(g('ppCos')), itbis: itb == null ? true : itb === '1', precio: num(g('ppPre')), minimo: g('ppMinP') != null ? num(g('ppMinP')) : (window.__nxPosVolFichaMin || 0) };
  }
  function problema(f, i, d) {
    if (!f.desde && !f.precio) return '';
    if (!(f.desde >= 2)) return 'La cantidad debe ser 2 o más';
    if (!(f.precio > 0)) return 'Escriba el precio por unidad';
    if (_filas.some((o, j) => j !== i && o.desde === f.desde)) return 'Esa cantidad ya tiene precio';
    const costoItb = r2(d.costo * (d.itbis ? 1.18 : 1));
    if (costoItb > 0 && f.precio < costoItb) return 'Queda debajo del costo con ITBIS (' + fmt(costoItb) + ')';
    if (d.minimo > 0 && f.precio < d.minimo) return A() && A().puedeVerMin() ? 'Queda debajo del precio mínimo (' + fmt(d.minimo) + ')' : 'Queda debajo del precio mínimo permitido';
    if (d.precio > 0 && f.precio >= d.precio) return 'Debe ser menor que el precio normal (' + fmt(d.precio) + ')';
    const menor = _filas.filter((o, j) => j !== i && o.desde < f.desde && o.precio > 0);
    if (menor.some(o => f.precio > o.precio)) return 'A más cantidad, el precio no puede subir';
    return '';
  }
  function pintarFilas() {
    const box = document.getElementById('nxVolRows'); if (!box) return;
    const d = datosFicha();
    box.innerHTML = _filas.length ? _filas.map((f, i) => {
      const pr = problema(f, i, d);
      return `<div class="nxVolRow${pr ? ' bad' : ''}">
        <label class="nxVolF"><span>Desde</span><input inputmode="numeric" aria-label="Cantidad mínima de la escala ${i + 1}" value="${f.desde || ''}" placeholder="2" oninput="window.nxPosVolSet(${i},'desde',this.value)"><span>unidades</span></label>
        <label class="nxVolF"><span>RD$</span><input inputmode="decimal" aria-label="Precio por unidad de la escala ${i + 1}" value="${f.precio || ''}" placeholder="0.00" oninput="window.nxPosVolSet(${i},'precio',this.value)"><span>c/u</span></label>
        <button type="button" class="nxVolX" aria-label="Quitar la escala ${i + 1}" onclick="window.nxPosVolQuitar(${i})"><i class="ti ti-x" aria-hidden="true"></i></button>
        <div class="nxVolMsg" id="nxVolMsg${i}" aria-live="polite">${esc(pr)}</div>
      </div>`;
    }).join('') : '<div class="nxVolVacio">Sin escalas. El artículo se vende siempre a su precio normal.</div>';
  }
  function refrescarMsgs() {
    const d = datosFicha();
    _filas.forEach((f, i) => { const m = document.getElementById('nxVolMsg' + i); if (!m) return; const pr = problema(f, i, d); m.textContent = pr; m.parentElement.classList.toggle('bad', !!pr); });
  }
  window.nxPosVolSet = function (i, k, v) { const f = _filas[i]; if (!f) return; f[k] = k === 'desde' ? Math.floor(num(v)) : r2(num(v)); refrescarMsgs(); };
  window.nxPosVolQuitar = function (i) { _filas.splice(i, 1); pintarFilas(); };
  window.nxPosVolAgregar = function () {
    const ult = _filas[_filas.length - 1];
    _filas.push({ desde: ult ? (ult.desde || 1) + 1 : 2, precio: 0 }); pintarFilas();
    const ins = document.querySelectorAll('#nxVolRows .nxVolRow:last-child input'); if (ins[1]) try { ins[1].focus(); } catch (e) {}
  };
  window.nxPosVolFicha = function (e, ov) {
    _activa = false; _filas = [];
    const panel = ov && ov.querySelector('.nxPfProdPanel[data-tab="precios"]'); if (!panel) return;
    window.__nxPosVolFichaMin = Number(e && e.precio_minimo || 0);
    const card = document.createElement('div'); card.className = 'card nxVolCard'; card.id = 'nxVolCard'; card.style.marginTop = '12px';
    card.innerHTML = `<h4><span class="bdg green"><i class="ti ti-stack-2"></i></span> Precio por cantidad <i class="ti ti-info-circle nxVolInfo" tabindex="0" role="img" aria-label="Ayuda" title="Ejemplo: desde 2 unidades RD$ 950 c/u, desde 5 unidades RD$ 900 c/u. En la caja el precio baja solo al subir la cantidad. Nunca por debajo del costo con ITBIS ni del precio mínimo."></i></h4><div id="nxVolCuerpo"><div class="nxVolVacio">Revisando…</div></div>`;
    panel.appendChild(card);
    columnaExiste().then(ok => {
      const cu = document.getElementById('nxVolCuerpo'); if (!cu) return;
      if (!ok) { cu.innerHTML = '<div class="nxVolAviso"><i class="ti ti-database-off" aria-hidden="true"></i> Esta función todavía no está activada en la base de datos. Cuando el administrador del sistema la active, aquí podrá poner precios por cantidad.</div>'; return; }
      _activa = true; _filas = escalasDe(e).map(x => ({ desde: x.desde, precio: x.precio }));
      cu.innerHTML = '<div id="nxVolRows"></div><button type="button" class="nxVolAdd" onclick="window.nxPosVolAgregar()"><i class="ti ti-plus" aria-hidden="true"></i> Agregar escala</button>';
      pintarFilas();
      ['ppCos', 'ppItb', 'ppPre', 'ppMinP'].forEach(id => { const el = document.getElementById(id); if (el) { el.addEventListener('input', refrescarMsgs); el.addEventListener('change', refrescarMsgs); } });
    });
  };
  const fichaAbierta = () => _activa && !!document.getElementById('nxVolRows');
  window.nxPosVolValidar = function () {
    if (!fichaAbierta()) return null;
    const d = datosFicha();
    for (let i = 0; i < _filas.length; i++) { if (!_filas[i].precio) continue; const pr = problema(_filas[i], i, d); if (pr) return 'Precio por cantidad, desde ' + (_filas[i].desde || '?') + ' unidades: ' + pr.charAt(0).toLowerCase() + pr.slice(1); }
    return null;
  };
  window.nxPosVolBody = function () {
    if (!fichaAbierta()) return {};
    const ls = _filas.filter(f => f.desde >= 2 && f.precio > 0).map(f => ({ desde: f.desde, precio: f.precio })).sort((a, b) => a.desde - b.desde);
    return { [COL]: ls.length ? ls : null };
  };

  // ── Estilos (se inyectan al cargar: solo afectan a clases nuevas, sin parpadeo) ──
  const css = `
  .nxVolLn{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
  .nxVolTag{display:inline-flex;align-items:center;gap:4px;min-height:26px;padding:2px 10px;border-radius:999px;background:#f0fdf4;color:#15803d;font:600 12px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;text-transform:none;letter-spacing:0;font-variant-numeric:tabular-nums}
  .nxVolSug{display:inline-flex;align-items:center;gap:5px;min-height:44px;padding:6px 14px;border-radius:999px;border:1.5px dashed #2563eb;background:rgba(59,130,246,.07);color:#1d4ed8;font:600 13px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;text-transform:none;letter-spacing:0;cursor:pointer;font-variant-numeric:tabular-nums;transition:transform .16s cubic-bezier(.22,1,.36,1)}
  .nxVolSug:active{transform:scale(.96)}
  .nxVolCard h4{display:flex;align-items:center;gap:9px}
  .nxVolCard h4,.nxVolCard .nxVolMsg,.nxVolCard .nxVolF,.nxVolCard .nxVolVacio,.nxVolCard .nxVolAviso,.nxVolCard button,.nxVolLn,.nxVolLn *{text-transform:none!important;letter-spacing:0}
  .nxVolInfo{color:#94a3b8;font-size:16px;cursor:help}
  .nxVolRow{display:grid;grid-template-columns:1fr 1fr 44px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(15,23,42,.08)}
  .nxVolF{display:flex;align-items:center;gap:6px;min-width:0;font-size:13px;color:#475569;text-transform:none}
  .nxVolF > span:first-child{min-width:44px}
  #posCartWrap .nxVolTag{white-space:nowrap;font-size:11px;padding:2px 8px}
  .nxVolF input{flex:1;min-width:0;width:100%;height:48px;font-size:16px;padding:0 12px;border-radius:12px;border:1px solid rgba(15,23,42,.14);background:#fff;color:#0f172a;font-variant-numeric:tabular-nums;text-transform:none;box-sizing:border-box}
  .nxVolF input:focus{outline:none;border-color:rgba(59,130,246,.6);box-shadow:0 0 0 4px rgba(59,130,246,.16)}
  .nxVolX{width:44px;height:44px;border-radius:999px;border:0;background:rgba(15,23,42,.06);color:#475569;font-size:18px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
  .nxVolX:active,.nxVolAdd:active{transform:scale(.96)}
  .nxVolMsg{grid-column:1/-1;font-size:12px;color:#b91c1c;min-height:0}
  .nxVolMsg:empty{display:none}
  .nxVolRow.bad input{border-color:#fca5a5}
  .nxVolAdd{margin-top:10px;min-height:44px;padding:8px 16px;border-radius:999px;border:1px solid rgba(37,99,235,.3);background:rgba(59,130,246,.07);color:#1d4ed8;font:600 14px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;text-transform:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
  .nxVolVacio{font-size:13px;color:#64748b;padding:6px 0}
  .nxVolAviso{display:flex;gap:8px;align-items:flex-start;font-size:13px;line-height:1.4;color:#b45309;background:#fef3c7;border-radius:12px;padding:10px 12px}
  @media (max-width:520px){.nxVolRow{grid-template-columns:1fr 44px}.nxVolRow .nxVolF:nth-child(2){grid-column:1/2;grid-row:2}.nxVolRow .nxVolX{grid-row:1/3;grid-column:2}}
  @media (prefers-reduced-motion:reduce){.nxVolSug,.nxVolX,.nxVolAdd{transition:none}}
  /* Oscuro: solo la ficha y el carrito de Vender se oscurecen; la hoja de la factura (.nxDoc) sigue blanca en todos los temas. */
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolTag{background:rgba(34,197,94,.16);color:#4ade80}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolSug,:is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolAdd{background:rgba(59,130,246,.16);color:#bfdbfe;border-color:#3b82f6}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolF{color:#94a3b8}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolF input{background:rgba(15,23,42,.6);color:#e2e8f0;border-color:rgba(255,255,255,.16)}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolX{background:rgba(255,255,255,.08);color:#cbd5e1}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolRow{border-bottom-color:rgba(255,255,255,.08)}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolMsg{color:#fca5a5}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolVacio{color:#94a3b8}
  :is(body.tema-premium,html.tema-glass-oscuro) :is(.nxVolCard,#posCartWrap) .nxVolAviso{background:rgba(245,158,11,.14);color:#fcd34d}`;
  try { if (!document.getElementById('nxPosVolCSS')) { const st = document.createElement('style'); st.id = 'nxPosVolCSS'; st.textContent = css; (document.head || document.documentElement).appendChild(st); } } catch (e) {}
})();
