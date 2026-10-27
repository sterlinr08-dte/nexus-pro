/* NEXUS PRO · POS · Margen por producto (27-oct-2026)
   Herramienta legal para competir en precio: muestra, por artículo activo, cuánto se gana, el precio
   más bajo al que se puede vender sin perder (precio piso, ITBIS incluido) y lo vendido en 30 días.
   SOLO LECTURA: no cambia precios, no escribe en la base. Solo admin/gerente (puedeVerMin del POS).
   Datos: artículos y categorías del POS (gancho window.__nxPosMargenCtx en parches-pos.js) y
   pos_ventas completadas (no anuladas) + pos_venta_items de los últimos 30 días.
   Fórmulas (mismas que Reportes): precio sin ITBIS = precio / 1.18 si lleva ITBIS; ganancia por unidad
   = precio sin ITBIS − costo; margen = ganancia / precio sin ITBIS; precio piso = costo × 1.18 (o costo
   si es exento). Ganancia de una línea vendida = importe sin ITBIS − costo actual × cantidad.
   Apagar: localStorage.nx_pos_margen_off = '1'. */
(function () {
  'use strict';
  try { if (localStorage.getItem('nx_pos_margen_off') === '1') return; } catch (e) {}
  if (window.__nxPosMargen) return;
  window.__nxPosMargen = true;

  var ITB = 1.18, DIAS = 30, BAJO = 10;
  var st = { q: '', cat: '', bajo: false, sinCosto: false, ventas: null, cargando: false, err: '' };

  function ctx() { return window.__nxPosMargenCtx || null; }
  function puede() { var c = ctx(); try { return !!(c && c.puedeVer()); } catch (e) { return false; } }
  function api() { var c = ctx(); return (c && c.api && c.api()) || window.API; }
  function r2(n) { return Math.round(Number(n || 0) * 100) / 100; }
  function dinero(n) { var v = r2(n); return (v < 0 ? '−RD$ ' : 'RD$ ') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function cant(n) { var v = r2(n); return v.toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sinAcento(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // ── Cálculo puro de un artículo (expuesto para pruebas) ──
  function calc(p, venta) {
    var precio = Number(p.precio || 0), costo = Number(p.costo || 0), conItbis = !!p.itbis;
    var precioSin = conItbis ? precio / ITB : precio;
    var o = { id: p.id, nombre: p.nombre || '', precio: r2(precio), costo: r2(costo), itbis: conItbis, cat: p.categoria_id == null ? '' : String(p.categoria_id) };
    o.unid30 = venta ? r2(venta.cant) : 0;
    o.gan30 = venta ? r2(venta.gan) : 0;
    if (!(costo > 0)) { o.estado = 'sincosto'; o.ganU = null; o.margen = null; o.piso = null; o.bajar = null; return o; }
    o.ganU = r2(precioSin - costo);
    o.margen = precioSin > 0 ? Math.round((precioSin - costo) / precioSin * 1000) / 10 : null;
    o.piso = r2(conItbis ? costo * ITB : costo);
    o.bajar = r2(precio - o.piso);
    if (o.ganU < 0) o.estado = 'perdida';
    else if (o.margen == null || o.margen < BAJO) o.estado = 'justo';
    else o.estado = 'puede';
    return o;
  }

  // Unidades y ganancia de 30 días por producto, desde las líneas de venta.
  function acumular(ventas, prods) {
    var costoDe = {}; (prods || []).forEach(function (p) { costoDe[String(p.id)] = Number(p.costo || 0); });
    var acc = {};
    (ventas || []).forEach(function (v) {
      (v._items || []).forEach(function (it) {
        var pid = String(it.producto_id == null ? '' : it.producto_id); if (!pid || !(pid in costoDe)) return;
        var c = Number(it.cantidad || 0);
        var imp = Number(it.importe != null ? it.importe : Number(it.precio || 0) * c);
        var sin = it.itbis ? imp / ITB : imp;
        var a = acc[pid] || (acc[pid] = { cant: 0, gan: 0 });
        a.cant += c; a.gan += sin - costoDe[pid] * c;
      });
    });
    return acc;
  }

  async function todas(tabla, qs) {
    var out = [], PAG = 1000;
    for (var off = 0; off < 100000; off += PAG) {
      var r = await api().get(tabla, qs + '&limit=' + PAG + '&offset=' + off) || [];
      out.push.apply(out, r); if (r.length < PAG) break;
    }
    return out;
  }
  async function cargarVentas() {
    var desde = new Date(Date.now() - DIAS * 864e5).toISOString();
    var vs = await todas('pos_ventas', 'select=*&estado=eq.completada&created_at=gte.' + encodeURIComponent(desde) + '&order=created_at.desc');
    vs = vs.filter(function (v) { return v.estado !== 'anulada' && !v.anulada; });
    var por = {}; vs.forEach(function (v) { v._items = []; por[String(v.id)] = v; });
    var ids = Object.keys(por);
    for (var i = 0; i < ids.length; i += 100) {
      var parte = ids.slice(i, i + 100);
      var its = await todas('pos_venta_items', 'select=venta_id,producto_id,cantidad,importe,precio,itbis&venta_id=in.(' + parte.join(',') + ')');
      its.forEach(function (it) { var v = por[String(it.venta_id)]; if (v) v._items.push(it); });
    }
    return vs;
  }

  function filas() {
    var c = ctx(); var prods = ((c && c.prods()) || []).filter(function (p) { return p.activo !== false; });
    var acc = acumular(st.ventas || [], prods);
    return prods.map(function (p) { return calc(p, acc[String(p.id)]); });
  }
  function filtrar(rows) {
    var q = sinAcento(st.q).trim();
    return rows.filter(function (r) {
      if (q && sinAcento(r.nombre).indexOf(q) < 0) return false;
      if (st.cat && r.cat !== st.cat) return false;
      if (st.bajo && !(r.estado === 'perdida' || r.estado === 'justo')) return false;
      if (st.sinCosto && r.estado !== 'sincosto') return false;
      return true;
    }).sort(function (a, b) { return (b.gan30 - a.gan30) || a.nombre.localeCompare(b.nombre, 'es'); });
  }

  var ESTADO = {
    puede: ['nxMg-s-ok', 'Puede bajar precio'],
    justo: ['nxMg-s-av', 'Margen justo'],
    perdida: ['nxMg-s-er', 'Vende con pérdida'],
    sincosto: ['nxMg-s-mu', 'Sin costo: no se puede calcular']
  };

  function filaHTML(r) {
    var e = ESTADO[r.estado];
    var bajarTxt = r.estado === 'sincosto' ? 'Cargue el costo del artículo para calcular'
      : r.bajar > 0 ? 'Puede bajar hasta ' + dinero(r.piso) + ' (' + dinero(r.bajar) + ' menos)'
      : r.bajar < 0 ? 'Le faltan ' + dinero(-r.bajar) + ' para no perder'
      : 'Ya está en el precio piso';
    var nd = '<span class="nxMg-nd">—</span>';
    return '<div class="nxMg-row" role="row" data-id="' + esc(r.id) + '" data-estado="' + r.estado + '">'
      + '<div class="nxMg-nom" role="cell"><b>' + esc(r.nombre) + '</b><span class="nxMg-pill ' + e[0] + '"><i></i>' + e[1] + '</span></div>'
      + '<div class="nxMg-c" role="cell" data-l="Precio"><span class="nxMg-precio">' + dinero(r.precio) + '</span><small>' + (r.itbis ? 'con ITBIS' : 'exento') + '</small></div>'
      + '<div class="nxMg-c" role="cell" data-l="Costo">' + (r.costo > 0 ? dinero(r.costo) : nd) + '</div>'
      + '<div class="nxMg-c" role="cell" data-l="Gana por unidad"><span class="nxMg-ganu ' + (r.ganU != null && r.ganU < 0 ? 'neg' : '') + '">' + (r.ganU == null ? nd : dinero(r.ganU)) + '</span>' + (r.ganU == null ? '' : '<small>sin ITBIS</small>') + '</div>'
      + '<div class="nxMg-c" role="cell" data-l="Margen"><span class="nxMg-margen">' + (r.margen == null ? nd : r.margen + ' %') + '</span></div>'
      + '<div class="nxMg-c" role="cell" data-l="Precio piso"><span class="nxMg-piso">' + (r.piso == null ? nd : dinero(r.piso)) + '</span><small>' + (r.piso == null ? '' : r.itbis ? 'con ITBIS' : 'exento') + '</small></div>'
      + '<div class="nxMg-c" role="cell" data-l="Vendidas 30 días"><span class="nxMg-u30">' + cant(r.unid30) + '</span></div>'
      + '<div class="nxMg-c" role="cell" data-l="Ganancia 30 días"><span class="nxMg-g30 ' + (r.gan30 < 0 ? 'neg' : '') + '">' + (r.estado === 'sincosto' ? nd : dinero(r.gan30)) + '</span></div>'
      + '<div class="nxMg-bajar" role="cell">' + bajarTxt + '</div>'
      + '</div>';
  }

  function cuerpo() {
    if (st.cargando) return '<div class="nxMg-vacio"><div class="spin"></div><div>Leyendo las ventas de los últimos 30 días…</div></div>';
    var all = filas(), rows = filtrar(all);
    var n = { perdida: 0, sincosto: 0, justo: 0 }, g = 0;
    all.forEach(function (r) { if (n[r.estado] != null) n[r.estado]++; if (r.estado !== 'sincosto') g += r.gan30; });
    var res = '<div class="nxMg-res">'
      + '<div><span>Artículos</span><b>' + all.length + '</b></div>'
      + '<div><span>Ganancia 30 días</span><b class="' + (g < 0 ? 'neg' : '') + '">' + dinero(g) + '</b></div>'
      + '<div><span>Con pérdida</span><b class="' + (n.perdida ? 'neg' : '') + '">' + n.perdida + '</b></div>'
      + '<div><span>Sin costo</span><b>' + n.sincosto + '</b></div></div>';
    var aviso = st.err ? '<div class="nxMg-err">No se pudieron leer las ventas: ' + esc(st.err) + '. Los márgenes sí están bien; lo vendido en 30 días aparece en cero.</div>' : '';
    var head = '<div class="nxMg-row nxMg-head" role="row"><div role="columnheader">Artículo</div><div role="columnheader">Precio</div><div role="columnheader">Costo</div><div role="columnheader">Gana por unidad</div><div role="columnheader">Margen</div><div role="columnheader">Precio piso</div><div role="columnheader">Vendidas 30 d</div><div role="columnheader">Ganancia 30 d</div></div>';
    var lista = rows.length ? rows.map(filaHTML).join('') : '<div class="nxMg-vacio">No hay artículos con ese filtro.</div>';
    return res + aviso + '<div class="nxMg-cont">' + rows.length + ' de ' + all.length + ' artículos · ordenados por ganancia del mes</div><div class="nxMg-tabla" role="table" aria-label="Margen por producto">' + head + lista + '</div>';
  }

  function pintar() { var b = document.getElementById('nxMgBody'); if (b) b.innerHTML = cuerpo(); }

  function catOpts() {
    var c = ctx(); var cats = (c && c.cats && c.cats()) || [];
    return '<option value="">Todas las categorías</option>' + cats.map(function (k) { return '<option value="' + esc(k.id) + '"' + (String(k.id) === st.cat ? ' selected' : '') + '>' + esc(k.nombre) + '</option>'; }).join('');
  }

  window.nxPosMargenAbrir = async function () {
    if (!puede()) { try { window.toast && window.toast('err', 'Solo admin o gerente pueden ver costos'); } catch (e) {} return; }
    css();
    var viejo = document.getElementById('nxMargenM'); if (viejo) viejo.remove();
    var ov = document.createElement('div'); ov.id = 'nxMargenM'; ov.className = 'nxMg-ov';
    ov.addEventListener('click', function (ev) { if (ev.target === ov) window.nxPosMargenCerrar(); });
    ov.innerHTML = '<div class="nxMg" role="dialog" aria-modal="true" aria-labelledby="nxMgTit">'
      + '<div class="nxMg-top"><div class="nxMg-ico"><i class="ti ti-chart-arrows-vertical"></i></div><div class="nxMg-tt"><h2 id="nxMgTit">Margen por producto</h2><p>Solo lectura · ningún precio cambia desde aquí</p></div>'
      + '<button type="button" class="nxMg-x" aria-label="Cerrar" onclick="window.nxPosMargenCerrar()"><i class="ti ti-x"></i></button></div>'
      + '<div class="nxMg-fil">'
      + '<label class="nxMg-q"><i class="ti ti-search"></i><input id="nxMgQ" type="search" class="no-upper" placeholder="Buscar artículo" autocomplete="off" value="' + esc(st.q) + '" oninput="window.nxPosMargenFiltro(\'q\',this.value)"></label>'
      + '<select id="nxMgCat" aria-label="Categoría" onchange="window.nxPosMargenFiltro(\'cat\',this.value)">' + catOpts() + '</select>'
      + '<button type="button" id="nxMgBajo" class="nxMg-chip' + (st.bajo ? ' on' : '') + '" aria-pressed="' + st.bajo + '" onclick="window.nxPosMargenFiltro(\'bajo\')">Margen bajo (&lt;10 %)</button>'
      + '<button type="button" id="nxMgSin" class="nxMg-chip' + (st.sinCosto ? ' on' : '') + '" aria-pressed="' + st.sinCosto + '" onclick="window.nxPosMargenFiltro(\'sin\')">Sin costo cargado</button>'
      + '</div>'
      + '<details class="nxMg-ayuda"><summary><i class="ti ti-info-circle"></i> ¿Cómo se calcula?</summary><p><b>Gana por unidad</b>: precio sin ITBIS (precio ÷ 1.18 si lleva ITBIS) menos el costo. <b>Margen</b>: esa ganancia entre el precio sin ITBIS. <b>Precio piso</b>: lo menos que puede cobrar, con el ITBIS incluido, sin perder dinero (costo × 1.18; si es exento, el costo). Por debajo del piso vende con pérdida. <b>Vendidas y ganancia de 30 días</b>: ventas completadas (no anuladas), con el costo actual del artículo. «Margen justo» es menos del 10 %.</p></details>'
      + '<div class="nxMg-body" id="nxMgBody"></div></div>';
    document.body.appendChild(ov);
    document.addEventListener('keydown', escTecla);
    if (st.ventas == null) {
      st.cargando = true; st.err = ''; pintar();
      try { st.ventas = await cargarVentas(); } catch (e) { st.ventas = []; st.err = String((e && e.message) || e).slice(0, 120); }
      st.cargando = false;
    }
    pintar();
  };
  function escTecla(ev) { if (ev.key === 'Escape') window.nxPosMargenCerrar(); }
  window.nxPosMargenCerrar = function () {
    var m = document.getElementById('nxMargenM'); if (m) m.remove();
    document.removeEventListener('keydown', escTecla);
    st.ventas = null; // la próxima vez se leen frescas
  };
  window.nxPosMargenFiltro = function (k, v) {
    if (k === 'q') st.q = v || '';
    else if (k === 'cat') st.cat = v || '';
    else if (k === 'bajo') { st.bajo = !st.bajo; if (st.bajo) st.sinCosto = false; }
    else if (k === 'sin') { st.sinCosto = !st.sinCosto; if (st.sinCosto) st.bajo = false; }
    [['nxMgBajo', st.bajo], ['nxMgSin', st.sinCosto]].forEach(function (x) { var b = document.getElementById(x[0]); if (b) { b.classList.toggle('on', x[1]); b.setAttribute('aria-pressed', String(x[1])); } });
    pintar();
  };
  window.nxPosMargen = { calc: calc, acumular: acumular, abrir: window.nxPosMargenAbrir };

  // ── Botón en la barra de Reportes (se agrega al pintarse; no toca parches-pos.js) ──
  function ponerBoton() {
    var bar = document.querySelector('#v-pos .nxRepWrap .nxCtaRango');
    if (!bar || bar.querySelector('.nxMgBtn') || !puede()) return;
    var dest = bar.lastElementChild && bar.lastElementChild.querySelector('button') ? bar.lastElementChild : bar;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn bsm bghost nxMgBtn';
    b.innerHTML = '<i class="ti ti-chart-arrows-vertical"></i> Margen por producto';
    b.addEventListener('click', function () { window.nxPosMargenAbrir(); });
    dest.insertBefore(b, dest.firstChild);
  }
  function vigilar() {
    var v = document.getElementById('v-pos');
    if (!v) { setTimeout(vigilar, 1500); return; }
    new MutationObserver(ponerBoton).observe(v, { childList: true, subtree: true });
    ponerBoton();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar); else vigilar();

  function css() {
    if (document.getElementById('nxPosMargenCSS')) return;
    var s = document.createElement('style'); s.id = 'nxPosMargenCSS';
    s.textContent = [
      '.nxMgBtn{min-height:44px}',
      '#nxMargenM .nxMg,#nxMargenM .nxMg *,#nxMargenM .nxMg *::before,#nxMargenM .nxMg input::placeholder{text-transform:none!important;letter-spacing:normal}',
      '.nxMg-ov{--mg-bg:rgba(255,255,255,.96);--mg-ink:#0f172a;--mg-2:#475569;--mg-3:#64748b;--mg-line:rgba(15,23,42,.08);--mg-soft:#f8fafc;--mg-field:#fff;--mg-blue:#2563eb;--mg-hover:rgba(59,130,246,.07);--mg-ok:#15803d;--mg-okb:#f0fdf4;--mg-av:#b45309;--mg-avb:#fef3c7;--mg-er:#b91c1c;--mg-erb:#fef2f2;--mg-mu:#475569;--mg-mub:#f1f5f9;',
      'position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}',
      'html.tema-glass-oscuro .nxMg-ov,body.tema-premium .nxMg-ov{--mg-bg:rgba(18,24,38,.97);--mg-ink:#f1f5f9;--mg-2:#cbd5e1;--mg-3:#94a3b8;--mg-line:rgba(255,255,255,.10);--mg-soft:rgba(255,255,255,.04);--mg-field:#0b0f19;--mg-blue:#93c5fd;--mg-hover:rgba(59,130,246,.14);--mg-ok:#86efac;--mg-okb:rgba(34,197,94,.14);--mg-av:#fcd34d;--mg-avb:rgba(245,158,11,.16);--mg-er:#fca5a5;--mg-erb:rgba(239,68,68,.16);--mg-mu:#cbd5e1;--mg-mub:rgba(255,255,255,.08);background:rgba(0,0,0,.5)}',
      '#nxMargenM .nxMg{width:100%;max-width:1120px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:var(--mg-bg);color:var(--mg-ink);border-radius:20px;-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);box-shadow:0 1px 0 rgba(255,255,255,.8) inset,0 0 0 1px rgba(15,23,42,.06),0 30px 70px -24px rgba(15,23,42,.45),0 12px 24px -12px rgba(15,23,42,.18);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;animation:nxMgIn .26s cubic-bezier(.34,1.56,.64,1) both;overflow:hidden}',
      '@keyframes nxMgIn{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion:reduce){.nxMg{animation:none}}',
      '#nxMargenM .nxMg-top{display:flex;align-items:center;gap:12px;padding:16px 16px 12px;border-bottom:1px solid var(--mg-line)}',
      '#nxMargenM .nxMg-ico{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(59,130,246,.12);color:var(--mg-blue);font-size:22px;flex-shrink:0}',
      '#nxMargenM .nxMg-tt{flex:1;min-width:0}#nxMargenM .nxMg-tt h2{margin:0;font-size:17px;font-weight:700;color:var(--mg-ink);text-transform:none;letter-spacing:-.01em}#nxMargenM .nxMg-tt p{margin:2px 0 0;font-size:12px;color:var(--mg-3)}',
      '#nxMargenM .nxMg-x{width:44px;height:44px;border-radius:999px;border:none;background:var(--mg-mub);color:var(--mg-2);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}#nxMargenM .nxMg-x:active{transform:scale(.95)}',
      '#nxMargenM .nxMg-fil{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px 4px}',
      '#nxMargenM .nxMg-q{flex:1 1 240px;position:relative;display:block}#nxMargenM .nxMg-q i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--mg-3);font-size:18px;pointer-events:none}',
      '#nxMargenM .nxMg-q input,#nxMargenM .nxMg-fil select{width:100%;height:48px;font-size:16px;border-radius:12px;border:1.5px solid var(--mg-line);background:var(--mg-field)!important;color:var(--mg-ink)!important;font-family:inherit;text-transform:none;box-sizing:border-box;-webkit-appearance:none;appearance:none}',
      '#nxMargenM .nxMg-q input{padding:0 12px 0 40px}#nxMargenM .nxMg-fil select{flex:0 1 220px;width:auto;min-width:180px;padding:0 12px}',
      '#nxMargenM .nxMg-q input:focus,#nxMargenM .nxMg-fil select:focus{outline:none!important;border-color:rgba(59,130,246,.6)!important;box-shadow:0 0 0 4px rgba(59,130,246,.16)!important}',
      '#nxMargenM .nxMg-chip{min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--mg-line);background:var(--mg-field);color:var(--mg-2);font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;text-transform:none;white-space:nowrap}',
      '#nxMargenM .nxMg-chip.on{background:rgba(59,130,246,.14);border-color:rgba(59,130,246,.5);color:var(--mg-blue)}#nxMargenM .nxMg-chip:active{transform:scale(.96)}',
      '#nxMargenM .nxMg-ayuda{margin:4px 16px 0;font-size:13px;color:var(--mg-2)}#nxMargenM .nxMg-ayuda summary{min-height:44px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:var(--mg-blue);font-weight:600;list-style:none}#nxMargenM .nxMg-ayuda summary::-webkit-details-marker{display:none}#nxMargenM .nxMg-ayuda p{margin:0 0 8px;line-height:1.5}',
      '#nxMargenM .nxMg-body{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 16px 16px;flex:1;min-height:120px}',
      '#nxMargenM .nxMg-res{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0 10px}',
      '#nxMargenM .nxMg-res>div{background:var(--mg-soft);border:1px solid var(--mg-line);border-radius:14px;padding:10px 12px;min-width:0}#nxMargenM .nxMg-res span{display:block;font-size:11px;color:var(--mg-3);margin-bottom:2px}#nxMargenM .nxMg-res b{font-size:17px;font-variant-numeric:tabular-nums;color:var(--mg-ink);white-space:nowrap}',
      '#nxMargenM .nxMg .neg{color:var(--mg-er)!important}',
      '#nxMargenM .nxMg-err{background:var(--mg-erb);color:var(--mg-er);border-radius:12px;padding:10px 12px;font-size:13px;margin-bottom:8px}',
      '#nxMargenM .nxMg-cont{font-size:12px;color:var(--mg-3);margin:2px 0 6px}',
      '#nxMargenM .nxMg-tabla{border:1px solid var(--mg-line);border-radius:16px;overflow:hidden}',
      '#nxMargenM .nxMg-row{display:grid;grid-template-columns:minmax(180px,2.2fr) repeat(7,minmax(84px,1fr));column-gap:10px;align-items:center;padding:10px 14px;border-top:1px solid var(--mg-line);font-variant-numeric:tabular-nums;font-size:14px;color:var(--mg-ink);min-height:52px}',
      '#nxMargenM .nxMg-row:first-child{border-top:none}#nxMargenM .nxMg-row:not(.nxMg-head):hover{background:var(--mg-hover)}',
      '#nxMargenM .nxMg-head{background:var(--mg-soft);font-size:12px;color:var(--mg-3);font-weight:600;min-height:40px;padding-top:8px;padding-bottom:8px}#nxMargenM .nxMg-head>div:not(:first-child){text-align:right}',
      '#nxMargenM .nxMg-nom{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:4px}#nxMargenM .nxMg-nom b{font-weight:600;font-size:14px;overflow-wrap:anywhere}',
      '#nxMargenM .nxMg-c{text-align:right;min-width:0;white-space:nowrap}#nxMargenM .nxMg-c small{display:block;font-size:11px;color:var(--mg-3)}',
      '#nxMargenM .nxMg-bajar{grid-column:1/-1;font-size:13px;color:var(--mg-2);padding-top:2px}',
      '#nxMargenM .nxMg-row[data-estado=puede] .nxMg-bajar{color:var(--mg-ok)}#nxMargenM .nxMg-row[data-estado=perdida] .nxMg-bajar{color:var(--mg-er)}',
      '#nxMargenM .nxMg-nd{color:var(--mg-3)}',
      '#nxMargenM .nxMg-pill i{display:inline-block!important;flex:0 0 7px;font-size:0!important;padding:0!important;margin:0!important;box-shadow:none!important}#nxMargenM .nxMg-pill{display:inline-flex;align-items:center;gap:6px;min-height:26px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}#nxMargenM .nxMg-pill i{width:7px;height:7px;border-radius:50%;background:currentColor}',
      '#nxMargenM .nxMg-pill.nxMg-s-ok{color:var(--mg-ok);background:var(--mg-okb)}#nxMargenM .nxMg-pill.nxMg-s-av{color:var(--mg-av);background:var(--mg-avb)}#nxMargenM .nxMg-pill.nxMg-s-er{color:var(--mg-er);background:var(--mg-erb)}#nxMargenM .nxMg-pill.nxMg-s-mu{color:var(--mg-mu);background:var(--mg-mub)}',
      '#nxMargenM .nxMg-vacio{text-align:center;color:var(--mg-3);font-size:14px;padding:32px 12px}#nxMargenM .nxMg-vacio .spin{margin:0 auto 8px}',
      '@media (max-width:760px){',
      '.nxMg-ov{padding:0;align-items:stretch}',
      '#nxMargenM .nxMg{max-width:none;max-height:none;height:100%;border-radius:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}',
      '#nxMargenM .nxMg-fil select{flex:1 1 100%;width:100%}#nxMargenM .nxMg-chip{flex:1 1 0;padding:0 10px;font-size:14px}',
      '#nxMargenM .nxMg-res{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '#nxMargenM .nxMg-tabla{border:none;border-radius:0;display:flex;flex-direction:column;gap:8px}',
      '#nxMargenM .nxMg-head{display:none}',
      '#nxMargenM .nxMg-row{grid-template-columns:repeat(2,minmax(0,1fr));row-gap:8px;border:1px solid var(--mg-line);border-radius:16px;padding:12px}',
      '#nxMargenM .nxMg-row:first-child{border-top:1px solid var(--mg-line)}',
      '#nxMargenM .nxMg-nom{grid-column:1/-1}',
      '#nxMargenM .nxMg-c{text-align:left;white-space:normal}#nxMargenM .nxMg-c::before{content:attr(data-l);display:block;font-size:11px;color:var(--mg-3);margin-bottom:1px}',
      '#nxMargenM .nxMg-c small{display:inline;margin-left:4px}',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }
})();
