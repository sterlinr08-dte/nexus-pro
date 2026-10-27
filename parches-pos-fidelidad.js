/* NEXUS PRO · POS · «Clientes que vuelven» (27-oct-2026)
   Fidelidad y recuperación de clientes sin bajar precios.
   - Tres grupos calculados de pos_ventas (completadas, no anuladas) y pos_clientes:
     frecuentes (3+ compras en 90 días), por perder (compraban seguido y no vuelven hace más de 45 días)
     y una sola compra (una compra en los últimos 120 días).
   - «Preparar mensaje»: borrador editable que una persona copia o abre en wa.me. NUNCA envía solo
     ni llama Edge Functions de WhatsApp.
   - Sugerencia discreta en la factura para el cliente frecuente («puede ofrecerle X %»), con el % en
     Ajustes (localStorage de este equipo; 0 = apagado). No aplica nada: el cajero decide.
   - Solo LECTURA de la base. Apagar: localStorage.nx_pos_fidelidad_off='1'. */
(function () {
  'use strict';
  if (window.__nxPosFid) return;
  window.__nxPosFid = true;
  function apagado() { try { return localStorage.getItem('nx_pos_fidelidad_off') === '1'; } catch (e) { return false; } }
  if (apagado()) return;

  var DIA = 864e5, LS_PCT = 'nx_pos_fid_pct', VIGENCIA = 10 * 60 * 1000;
  function api() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  function fmt(n) { var v = Math.round(Number(n || 0) * 100) / 100; return (v < 0 ? '-RD$ ' : 'RD$ ') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function waNum(t) { var d = String(t || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d; return d.length >= 11 ? d : ''; }
  function fechaTxt(ms) { var d = new Date(ms); return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }
  function toast(t, m, s) { try { if (window.toast) window.toast(t, m, s); } catch (e) {} }
  function pct() { try { var v = parseFloat(String(localStorage.getItem(LS_PCT) || '0').replace(',', '.')); return isFinite(v) && v > 0 ? Math.min(v, 50) : 0; } catch (e) { return 0; } }
  function empresa() {
    try { var s = (typeof sesion !== 'undefined') ? sesion : window.sesion; if (s && s.org && s.org.nombre) return String(s.org.nombre); } catch (e) {}
    try { if (window.CFG && CFG.empNom) return String(CFG.empNom); } catch (e) {}
    return 'nuestro negocio';
  }
  function primerNombre(n) { var p = String(n || '').trim().split(/\s+/)[0] || ''; return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''; }

  // ── Clasificación (función pura; el QA la prueba con fechas conocidas) ──
  // Grupos excluyentes: «por perder» manda sobre «frecuente» (si dejó de venir, hay que recuperarlo).
  function clasificar(ventas, clientes, ahora) {
    ahora = ahora || Date.now();
    var porCli = {}, cli = {};
    (clientes || []).forEach(function (c) { cli[String(c.id)] = c; });
    (ventas || []).forEach(function (v) {
      if (!v || !v.cliente_id || v.estado !== 'completada' || v.anulada) return;
      var ms = Date.parse(v.fecha || v.created_at || ''); if (!isFinite(ms) || ms > ahora + DIA) return;
      var k = String(v.cliente_id), r = porCli[k] || (porCli[k] = { id: k, compras: [], nombre: v.cliente_nombre || '' });
      r.compras.push({ ms: ms, total: Number(v.total || 0), venta_id: v.id });
    });
    var g = { frecuentes: [], perder: [], una: [] }, info = {};
    Object.keys(porCli).forEach(function (k) {
      var r = porCli[k], c = cli[k];
      if (c && c.activo === false) return;
      r.compras.sort(function (a, b) { return b.ms - a.ms; });
      var ult = r.compras[0], dias = Math.floor((ahora - ult.ms) / DIA);
      var en90 = r.compras.filter(function (x) { return ahora - x.ms <= 90 * DIA; });
      var fila = {
        id: k, nombre: (c && c.nombre) || r.nombre || 'Cliente', telefono: (c && (c.telefono || c.celular || c.whatsapp)) || '',
        n: r.compras.length, total: r.compras.reduce(function (a, x) { return a + x.total; }, 0),
        n90: en90.length, total90: en90.reduce(function (a, x) { return a + x.total; }, 0),
        ultima: ult.ms, dias: dias, ultimaVenta: ult.venta_id
      };
      fila.ticket = fila.n ? fila.total / fila.n : 0;
      fila.ticket90 = fila.n90 ? fila.total90 / fila.n90 : 0;
      if (dias > 45 && fila.n >= 3) { fila.grupo = 'perder'; g.perder.push(fila); }
      else if (fila.n90 >= 3) { fila.grupo = 'frecuentes'; g.frecuentes.push(fila); }
      else if (fila.n === 1 && dias <= 120) { fila.grupo = 'una'; g.una.push(fila); }
      info[k] = fila;
    });
    g.frecuentes.sort(function (a, b) { return b.total90 - a.total90; });
    g.perder.sort(function (a, b) { return b.total - a.total; });
    g.una.sort(function (a, b) { return b.ultima - a.ultima; });
    return { grupos: g, porCli: info };
  }

  // ── Lectura (solo GET, paginada) ──
  var _datos = null, _cargando = null, _cargadoEn = 0;
  function cargar(forzar) {
    if (_cargando) return _cargando;
    if (!forzar && _datos && Date.now() - _cargadoEn < VIGENCIA) return Promise.resolve(_datos);
    var desde = new Date(Date.now() - 365 * DIA).toISOString();
    var qs = 'select=id,cliente_id,cliente_nombre,total,estado,fecha,created_at&estado=eq.completada&cliente_id=not.is.null&created_at=gte.' + encodeURIComponent(desde) + '&order=created_at.desc';
    function pagina(off, acc) {
      return api().get('pos_ventas', qs + '&limit=1000&offset=' + off).then(function (r) {
        acc = acc.concat(r || []);
        return (r && r.length === 1000 && off < 9000) ? pagina(off + 1000, acc) : acc;
      });
    }
    _cargando = Promise.all([
      pagina(0, []),
      api().get('pos_clientes', 'select=id,nombre,telefono,activo&activo=eq.true&order=nombre.asc&limit=5000').catch(function () { return []; })
    ]).then(function (r) {
      _datos = clasificar(r[0], r[1], Date.now()); _cargadoEn = Date.now(); return _datos;
    }).catch(function (e) { _datos = _datos || clasificar([], [], Date.now()); return _datos; })
      .then(function (d) { _cargando = null; return d; });
    return _cargando;
  }

  // ── Borradores (usted, sin exclamaciones) ──
  function borrador(f, extra) {
    var nom = primerNombre(f.nombre), emp = empresa(), saludo = 'Buenas' + (nom ? ', ' + nom : '') + '. Le escribe ' + emp + '.';
    if (f.grupo === 'frecuentes') return saludo + '\n\nQueremos darle las gracias por preferirnos. En los últimos meses nos ha visitado ' + f.n90 + ' veces y para nosotros es un gusto atenderle.\n\nSi necesita algo, con gusto le ayudamos por esta vía.';
    if (f.grupo === 'perder') return saludo + '\n\nHace un tiempo que no le vemos por aquí y le extrañamos. Si necesita algo, o tiene alguna duda con lo que compró, con gusto le atendemos.\n\nQuedamos a su orden.';
    var art = extra && extra.articulo ? ' de ' + extra.articulo : '';
    var gar = extra && extra.garantia ? ' Su garantía está vigente hasta el ' + extra.garantia + '.' : '';
    return saludo + '\n\nGracias por su compra' + art + ' del ' + fechaTxt(f.ultima) + '.' + gar + ' Si su artículo necesita algún servicio o tiene alguna pregunta, puede escribirnos por aquí y con gusto le ayudamos.';
  }

  // ── Estilos (se inyectan al cargar la capa, antes de abrir nada: sin FOUC) ──
  function css() {
    if (document.getElementById('nxPosFidCSS')) return;
    var s = document.createElement('style'); s.id = 'nxPosFidCSS';
    s.textContent = [
      '.nxFid{--f-bg:#f5f7fa;--f-panel:#fff;--f-line:rgba(15,23,42,.08);--f-txt:#0f172a;--f-txt2:#475569;--f-txt3:#64748b;--f-blue:#2563eb;--f-blue-l:rgba(59,130,246,.10);--f-green:#15803d;--f-green-l:#f0fdf4;--f-amber:#b45309;--f-amber-l:#fef3c7;--f-shadow:0 1px 0 rgba(255,255,255,.8) inset,0 0 0 1px rgba(15,23,42,.06),0 30px 70px -24px rgba(15,23,42,.45),0 12px 24px -12px rgba(15,23,42,.18);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;color:var(--f-txt);font-variant-numeric:tabular-nums}',
      'html.tema-glass-oscuro .nxFid,body.tema-premium .nxFid{--f-bg:#0b0f19;--f-panel:#121826;--f-line:#232b3d;--f-txt:#f1f5f9;--f-txt2:#cbd5e1;--f-txt3:#94a3b8;--f-blue:#60a5fa;--f-blue-l:rgba(96,165,250,.14);--f-green:#4ade80;--f-green-l:#0c1f14;--f-amber:#fbbf24;--f-amber-l:#2a2004;--f-shadow:0 0 0 1px #232b3d,0 30px 70px -24px rgba(0,0,0,.7)}',
      '.nxFid,.nxFid *,.nxFidAjCard,.nxFidAjCard *,.nxFidAbrir{text-transform:none!important}',
      '.nxFid .nxFidBox{text-align:left;background:var(--f-panel)!important;color:var(--f-txt)!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
      '.nxFid .nxFidHd h3{color:var(--f-txt)!important}',
      '.nxFid .nxFidX,.nxFid .nxFidInfo{border:0!important;color:var(--f-txt2)!important}',
      '.nxFid .nxFidX{background:var(--f-bg)!important}',
      '.nxFid .nxFidTab{background:var(--f-panel)!important;color:var(--f-txt2)!important;border-color:var(--f-line)!important}',
      '.nxFid .nxFidTab.on{background:var(--f-blue)!important;border-color:var(--f-blue)!important;color:#fff!important}',
      '.nxFid .nxFidBtn{background:var(--f-panel)!important;color:var(--f-txt)!important;border-color:var(--f-line)!important}',
      '.nxFid .nxFidBtn.pri{background:var(--f-blue)!important;border-color:var(--f-blue)!important;color:#fff!important}',
      '.nxFid .nxFidBtn.wa{background:#1fa855!important;border-color:#1fa855!important;color:#fff!important}',
      '.nxFid .nxFidTa,.nxFid .nxFidIn{background:var(--f-bg)!important;color:var(--f-txt)!important;border:1px solid var(--f-line)!important;-webkit-text-fill-color:var(--f-txt)!important}',
      'html.tema-glass-oscuro .nxFid .nxFidTab.on,body.tema-premium .nxFid .nxFidTab.on,html.tema-glass-oscuro .nxFid .nxFidBtn.pri,body.tema-premium .nxFid .nxFidBtn.pri{background:#2563eb!important;border-color:#2563eb!important}',
      '#v-pos .nx-invoice-pro .facSugIt.nxFidSug{--tono:#1D4ED8;--fondo:#EFF6FF;height:auto;min-height:44px}',
      '#v-pos .nx-invoice-pro .facSugIt.nxFidSug,#v-pos .nx-invoice-pro .facSugIt.nxFidSug *{text-transform:none!important}',
      '#v-pos .nx-invoice-pro .facSugIt.nxFidSug .facSugTx b{color:#1e3a8a!important;white-space:normal!important;overflow:visible!important;font-variant-numeric:tabular-nums}',
      '#v-pos .nx-invoice-pro .facSugIt.nxFidSug .facSugTx small{color:#475569!important;font-variant-numeric:tabular-nums}',
      '.nxFidOv{position:fixed;inset:0;z-index:9990;background:rgba(15,23,42,.35);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}',
      '.nxFidBox{background:var(--f-panel);border-radius:20px;box-shadow:var(--f-shadow);width:100%;max-width:920px;max-height:calc(100dvh - 32px);display:flex;flex-direction:column;overflow:hidden;animation:nxFidIn .26s cubic-bezier(.34,1.56,.64,1)}',
      '.nxFidBox.sm{max-width:560px}',
      '@keyframes nxFidIn{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}',
      '@media (prefers-reduced-motion:reduce){.nxFidBox{animation:none}}',
      '.nxFidHd{display:flex;align-items:center;gap:10px;padding:14px 14px 10px 18px;border-bottom:1px solid var(--f-line)}',
      '.nxFidHd h3{margin:0;font-size:17px;font-weight:700;flex:1;min-width:0;letter-spacing:-.01em}',
      '.nxFidHd h3 i{color:var(--f-blue);margin-right:6px}',
      '.nxFidX,.nxFidInfo{width:44px;height:44px;border-radius:999px;border:0;background:var(--f-bg);color:var(--f-txt2);display:inline-flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;flex:none}',
      '.nxFidInfo{background:transparent;font-size:19px}',
      '.nxFidX:active,.nxFidBtn:active,.nxFidTab:active{transform:scale(.96)}',
      '.nxFidAyuda{margin:10px 18px 0;padding:10px 12px;border-radius:12px;background:var(--f-bg);font-size:13px;line-height:1.5;color:var(--f-txt2)}',
      '.nxFidAyuda[hidden]{display:none}',
      '.nxFidTabs{display:flex;gap:6px;padding:12px 18px 0;overflow-x:auto;scrollbar-width:none}',
      '.nxFidTab{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--f-line);background:var(--f-panel);color:var(--f-txt2);font:inherit;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:6px}',
      '.nxFidTab b{min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:var(--f-bg);color:var(--f-txt);font-size:12px;display:inline-flex;align-items:center;justify-content:center}',
      '.nxFidTab.on{background:var(--f-blue);border-color:var(--f-blue);color:#fff}',
      '.nxFidTab.on b{background:rgba(255,255,255,.22);color:#fff}',
      '.nxFidBar{display:flex;align-items:center;gap:10px;padding:10px 18px;flex-wrap:wrap}',
      '.nxFidRes{flex:1;min-width:180px;font-size:13px;color:var(--f-txt3)}',
      '.nxFidBtn{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid var(--f-line);background:var(--f-panel);color:var(--f-txt);font:inherit;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;white-space:nowrap}',
      '.nxFidBtn.pri{background:var(--f-blue);border-color:var(--f-blue);color:#fff}',
      '.nxFidBtn.wa{background:#25d366;border-color:#25d366;color:#fff}',
      '.nxFidBtn[aria-disabled="true"]{opacity:.45;pointer-events:none}',
      '.nxFidList{overflow-y:auto;padding:0 18px 18px;-webkit-overflow-scrolling:touch}',
      '.nxFidRow{display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 0;border-top:1px solid var(--f-line)}',
      '.nxFidRow:first-child{border-top:0}',
      '.nxFidNm{flex:1;min-width:0}',
      '.nxFidNm b{display:block;font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.nxFidNm small{display:block;font-size:12px;color:var(--f-txt3);margin-top:2px}',
      '.nxFidMo{text-align:right;font-size:14px;font-weight:700;white-space:nowrap}',
      '.nxFidMo small{display:block;font-size:12px;font-weight:500;color:var(--f-txt3)}',
      '.nxFidVacio{padding:32px 8px;text-align:center;color:var(--f-txt3);font-size:14px}',
      '.nxFidFt{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding:12px 18px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--f-line)}',
      '.nxFidTa{display:block;width:calc(100% - 36px);margin:12px 18px 4px;box-sizing:border-box;min-height:180px;padding:12px 14px;border-radius:14px;border:1px solid var(--f-line);background:var(--f-bg);color:var(--f-txt);font:inherit;font-size:16px;line-height:1.5;resize:vertical;outline:0}',
      '.nxFidTa:focus,.nxFidIn:focus{border-color:rgba(59,130,246,.6);box-shadow:0 0 0 4px rgba(59,130,246,.16)}',
      '.nxFidNota{margin:4px 18px 0;font-size:12px;color:var(--f-txt3)}',
      '.nxFidIn{height:48px;width:120px;padding:0 14px;border-radius:12px;border:1px solid var(--f-line);background:var(--f-panel);color:var(--f-txt);font:inherit;font-size:16px;font-variant-numeric:tabular-nums;outline:0;box-sizing:border-box}',
      '.nxFidAj{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}',
      '.nxFidAj label{font-size:14px;color:var(--f-txt2)}',
      '.nxFidAbrir{min-height:44px!important;height:auto!important}',
      '@media (max-width:640px){.nxFidTabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:visible}.nxFid .nxFidTab{padding:4px 8px;font-size:13px;line-height:1.2;white-space:normal;text-align:center;justify-content:center;border-radius:16px}.nxFidTab > i{display:none}.nxFidOv{padding:0;align-items:flex-end}.nxFidBox{border-radius:20px 20px 0 0;max-height:calc(100dvh - env(safe-area-inset-top) - 12px)}.nxFidRow{flex-wrap:wrap}.nxFidRow .nxFidNm{flex:1 1 60%}.nxFidRow .nxFidBtn{flex:1 1 100%}.nxFidHd{padding-left:16px}.nxFidTabs,.nxFidBar,.nxFidList,.nxFidFt{padding-left:16px;padding-right:16px}.nxFidTa{width:calc(100% - 32px);margin-left:16px;margin-right:16px}}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(s);
  }
  css();

  // ── Panel «Clientes que vuelven» ──
  var GRUPOS = [
    ['frecuentes', 'Frecuentes', 'ti-heart-handshake'],
    ['perder', 'Por perder', 'ti-user-exclamation'],
    ['una', 'Una sola compra', 'ti-user-plus']
  ];
  var _grupo = 'frecuentes';
  function subFila(f) {
    var hace = f.dias === 0 ? 'hoy' : f.dias === 1 ? 'hace 1 día' : 'hace ' + f.dias + ' días';
    var tel = f.telefono ? esc(f.telefono) + ' · ' : 'Sin teléfono · ';
    if (f.grupo === 'frecuentes') return tel + f.n90 + ' compras en 90 días · última ' + hace;
    if (f.grupo === 'perder') return tel + f.n + ' compras en el año · no vuelve ' + hace;
    return tel + 'compró el ' + fechaTxt(f.ultima) + ' (' + hace + ')';
  }
  function montoFila(f) {
    if (f.grupo === 'frecuentes') return fmt(f.total90) + '<small>ticket ' + fmt(f.ticket90) + '</small>';
    if (f.grupo === 'perder') return fmt(f.total) + '<small>ticket ' + fmt(f.ticket) + '</small>';
    return fmt(f.total) + '<small>una compra</small>';
  }
  function pintarPanel() {
    var box = document.getElementById('nxFidPanel'); if (!box || !_datos) return;
    var g = _datos.grupos, lista = g[_grupo] || [];
    box.querySelector('.nxFidTabs').innerHTML = GRUPOS.map(function (x) {
      return '<button type="button" class="nxFidTab' + (x[0] === _grupo ? ' on' : '') + '" role="tab" aria-selected="' + (x[0] === _grupo) + '" data-g="' + x[0] + '" onclick="window.nxPosFidGrupo(\'' + x[0] + '\')"><i class="ti ' + x[2] + '" aria-hidden="true"></i>' + x[1] + ' <b>' + (g[x[0]] || []).length + '</b></button>';
    }).join('');
    var tot = lista.reduce(function (a, f) { return a + (f.grupo === 'frecuentes' ? f.total90 : f.total); }, 0);
    var res = { frecuentes: 'Gastaron ' + fmt(tot) + ' en 90 días. Agradézcales: son los que sostienen el negocio.', perder: 'Gastaron ' + fmt(tot) + ' en el año. Un mensaje a tiempo vale más que una rebaja.', una: 'Compraron ' + fmt(tot) + '. Un recordatorio de garantía o servicio les invita a volver.' }[_grupo];
    box.querySelector('.nxFidRes').textContent = lista.length ? res : '';
    var csvB = box.querySelector('[data-csv]'); if (csvB) csvB.setAttribute('aria-disabled', lista.length ? 'false' : 'true');
    box.querySelector('.nxFidList').innerHTML = lista.length ? lista.map(function (f) {
      return '<div class="nxFidRow" data-cli="' + esc(f.id) + '"><div class="nxFidNm"><b>' + esc(f.nombre) + '</b><small>' + subFila(f) + '</small></div><div class="nxFidMo">' + montoFila(f) + '</div><button type="button" class="nxFidBtn" data-msg onclick="window.nxPosFidMensaje(\'' + esc(f.id) + '\')"><i class="ti ti-message-2" aria-hidden="true"></i> Preparar mensaje</button></div>';
    }).join('') : '<div class="nxFidVacio">' + ({ frecuentes: 'Todavía no hay clientes con 3 compras o más en los últimos 90 días.', perder: 'Ningún cliente habitual lleva más de 45 días sin volver.', una: 'Nadie ha hecho una sola compra en los últimos 120 días.' }[_grupo]) + '</div>';
  }
  window.nxPosFidGrupo = function (k) { _grupo = k; pintarPanel(); };
  window.nxPosFidAbrir = function () {
    cerrar('nxFidPanel');
    var ov = document.createElement('div'); ov.className = 'nxFid nxFidOv'; ov.id = 'nxFidPanel';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Clientes que vuelven');
    ov.innerHTML = '<div class="nxFidBox"><div class="nxFidHd"><h3><i class="ti ti-repeat" aria-hidden="true"></i>Clientes que vuelven</h3>'
      + '<button type="button" class="nxFidInfo" aria-label="Cómo se calcula" aria-expanded="false" onclick="var a=this.closest(\'.nxFidBox\').querySelector(\'.nxFidAyuda\');a.hidden=!a.hidden;this.setAttribute(\'aria-expanded\',String(!a.hidden))"><i class="ti ti-info-circle" aria-hidden="true"></i></button>'
      + '<button type="button" class="nxFidX" aria-label="Cerrar" onclick="window.nxPosFidCerrar()"><i class="ti ti-x" aria-hidden="true"></i></button></div>'
      + '<div class="nxFidAyuda" hidden>Se cuenta cada venta completada (no anulada) con cliente, por la fecha en que se hizo. <b>Frecuentes</b>: 3 compras o más en los últimos 90 días. <b>Por perder</b>: 3 compras o más en el año y más de 45 días sin volver (si un frecuente deja de venir, pasa aquí). <b>Una sola compra</b>: una compra en los últimos 120 días. Los mensajes son borradores: usted los revisa y los envía.</div>'
      + '<div class="nxFidTabs" role="tablist"></div>'
      + '<div class="nxFidBar"><div class="nxFidRes" aria-live="polite">Cargando…</div><button type="button" class="nxFidBtn" data-csv aria-disabled="true" onclick="window.nxPosFidCSV()"><i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Exportar CSV</button></div>'
      + '<div class="nxFidList"><div class="nxFidVacio">Cargando…</div></div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) window.nxPosFidCerrar(); });
    document.body.appendChild(ov);
    cargar(true).then(pintarPanel);
  };
  function cerrar(id) { var o = document.getElementById(id); if (o) o.remove(); }
  window.nxPosFidCerrar = function () { cerrar('nxFidMsg'); cerrar('nxFidPanel'); };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.getElementById('nxFidMsg')) { cerrar('nxFidMsg'); e.stopPropagation(); }
    else if (document.getElementById('nxFidPanel')) { cerrar('nxFidPanel'); e.stopPropagation(); }
  }, true);

  // ── Borrador de WhatsApp: solo copiar o abrir wa.me (una persona lo envía) ──
  window.nxPosFidMensaje = function (id) {
    var f = _datos && _datos.porCli[String(id)]; if (!f) return;
    cerrar('nxFidMsg');
    var num = waNum(f.telefono);
    var ov = document.createElement('div'); ov.className = 'nxFid nxFidOv'; ov.id = 'nxFidMsg';
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Mensaje para ' + f.nombre);
    ov.innerHTML = '<div class="nxFidBox sm"><div class="nxFidHd"><h3><i class="ti ti-message-2" aria-hidden="true"></i>Mensaje para ' + esc(primerNombre(f.nombre) || f.nombre) + '</h3><button type="button" class="nxFidX" aria-label="Cerrar" onclick="this.closest(\'.nxFidOv\').remove()"><i class="ti ti-x" aria-hidden="true"></i></button></div>'
      + '<label class="nxFidNota" for="nxFidTa">Borrador: revíselo y cámbielo a su gusto antes de enviarlo.</label>'
      + '<textarea id="nxFidTa" class="nxFidTa" spellcheck="true">' + esc(borrador(f)) + '</textarea>'
      + '<div class="nxFidNota">' + (num ? '«Abrir WhatsApp» deja el texto listo en la conversación; usted decide si lo envía.' : 'Este cliente no tiene un teléfono válido: copie el texto y envíelo por otra vía.') + '</div>'
      + '<div class="nxFidFt"><button type="button" class="nxFidBtn" data-copiar onclick="window.nxPosFidCopiar()"><i class="ti ti-copy" aria-hidden="true"></i> Copiar texto</button>'
      + '<a class="nxFidBtn wa" data-wa target="_blank" rel="noopener noreferrer" aria-disabled="' + (num ? 'false' : 'true') + '"' + (num ? ' href="#"' : '') + '><i class="ti ti-brand-whatsapp" aria-hidden="true"></i> Abrir WhatsApp</a></div></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    var ta = ov.querySelector('textarea'), a = ov.querySelector('[data-wa]');
    function sync() { if (num) a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(ta.value); }
    ta.addEventListener('input', sync); sync();
    // Para «una sola compra»: nombrar el artículo y la garantía si sigue vigente (lectura).
    if (f.grupo === 'una' && f.ultimaVenta) {
      api().get('pos_venta_items', 'select=nombre,garantia_hasta&venta_id=eq.' + encodeURIComponent(f.ultimaVenta) + '&limit=5').then(function (its) {
        its = its || []; if (!its.length || !document.body.contains(ta) || ta.value !== borrador(f)) return;
        var hoy = new Date().toISOString().slice(0, 10), g = its.filter(function (x) { return x.garantia_hasta && x.garantia_hasta >= hoy; })[0];
        var art = its[0].nombre ? String(its[0].nombre) + (its.length > 1 ? ' y otros artículos' : '') : '';
        var ga = g ? g.garantia_hasta.slice(8, 10) + '/' + g.garantia_hasta.slice(5, 7) + '/' + g.garantia_hasta.slice(0, 4) : '';
        ta.value = borrador(f, { articulo: art, garantia: ga }); sync();
      }).catch(function () {});
    }
    setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) {} }, 60);
  };
  window.nxPosFidCopiar = function () {
    var ta = document.getElementById('nxFidTa'); if (!ta) return;
    var txt = ta.value, listo = function () { toast('ok', 'Texto copiado', 'Péguelo en WhatsApp o donde lo vaya a enviar'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(listo, function () { ta.select(); try { document.execCommand('copy'); listo(); } catch (e) {} }); return; }
    } catch (e) {}
    ta.select(); try { document.execCommand('copy'); listo(); } catch (e) {}
  };

  // ── CSV por grupo ──
  function csvGrupo(k) {
    var lista = (_datos && _datos.grupos[k]) || [];
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var n2 = function (v) { return (Math.round(Number(v || 0) * 100) / 100).toFixed(2); };
    var filas = [['Cliente', 'Teléfono', 'Grupo', 'Compras (90 días)', 'Compras (año)', 'Total gastado', 'Ticket promedio', 'Última compra', 'Días sin comprar']];
    var nom = { frecuentes: 'Frecuente', perder: 'Por perder', una: 'Una sola compra' }[k];
    lista.forEach(function (f) {
      var fr = k === 'frecuentes';
      filas.push([f.nombre, f.telefono, nom, f.n90, f.n, n2(fr ? f.total90 : f.total), n2(fr ? f.ticket90 : f.ticket), new Date(f.ultima).toISOString().slice(0, 10), f.dias]);
    });
    return filas.map(function (r) { return r.map(q).join(','); }).join('\r\n');
  }
  window.nxPosFidCSV = function () {
    if (!_datos) return;
    var txt = '﻿' + csvGrupo(_grupo), nom = { frecuentes: 'frecuentes', perder: 'por-perder', una: 'una-sola-compra' }[_grupo];
    try {
      var url = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
      var a = document.createElement('a'); a.href = url; a.download = 'clientes-' + nom + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) { toast('err', 'No se pudo exportar'); }
  };

  // ── Ganchos que llama parches-pos.js (si esta capa está apagada, no existen y no se ve nada) ──
  window.nxPosFidBotonHTML = function () {
    return '<button class="ab g3 sm nxFidAbrir" type="button" onclick="window.nxPosFidAbrir()"><i class="ti ti-repeat"></i> Clientes que vuelven</button>';
  };
  window.nxPosFidAjustesHTML = function () {
    var p = pct();
    return '<div class="card nxFidAjCard"><h4><i class="ti ti-heart-handshake" style="color:var(--pf-blue)"></i> Descuento de cliente frecuente</h4>'
      + '<div class="ajd">Cuando el cliente de la factura tenga 3 compras o más en 90 días, se le muestra al cajero una sugerencia discreta con este porcentaje. No se aplica solo: el cajero decide si lo da, con el descuento por línea. Se guarda en este equipo. Déjelo en 0 para apagarlo.'
      + (p > 0 ? '<br>Hoy: <b style="color:var(--pf-green)">' + p + ' %</b> sugerido.' : '<br><b style="color:var(--pf-txt3)">Sugerencia apagada.</b>') + '</div>'
      + '<div class="nxFid nxFidAj"><label for="nxFidPct">Porcentaje sugerido</label><input id="nxFidPct" class="nxFidIn" inputmode="decimal" value="' + p + '" placeholder="0" aria-describedby="nxFidPctN"><span id="nxFidPctN" style="font-size:14px;color:var(--f-txt3)">%</span>'
      + '<button type="button" class="nxFidBtn pri" onclick="window.nxPosFidGuardarPct()"><i class="ti ti-device-floppy" aria-hidden="true"></i> Guardar</button></div></div>';
  };
  window.nxPosFidGuardarPct = function () {
    var el = document.getElementById('nxFidPct'); if (!el) return;
    var v = parseFloat(String(el.value || '0').replace(',', '.'));
    if (!isFinite(v) || v < 0 || v > 50) { toast('err', 'Porcentaje no válido', 'Use un número entre 0 y 50'); return; }
    try { localStorage.setItem(LS_PCT, String(Math.round(v * 10) / 10)); } catch (e) { toast('err', 'No se pudo guardar en este equipo'); return; }
    toast('ok', v > 0 ? 'Sugerencia de ' + (Math.round(v * 10) / 10) + ' % guardada' : 'Sugerencia apagada');
    try { if (typeof window.nxPosTab === 'function') window.nxPosTab('ajustes'); } catch (e) {}
  };
  // Sugerencia en la factura (patrón facSugerencias / .facSugIt). Solo informa: no toca el carrito,
  // así convive con it.cubre6 y con los descuentos por línea.
  var _sugPedido = false;
  window.nxPosFidSug = function (c, totalFactura) {
    var p = pct(); if (!p || !c || !c.id) return null;
    if (!_datos || Date.now() - _cargadoEn > VIGENCIA) {
      if (!_sugPedido) { _sugPedido = true; cargar(false).then(function () { _sugPedido = false; try { window.nxFacRepaint && window.nxFacRepaint(); } catch (e) {} }); }
      if (!_datos) return null;
    }
    var f = _datos.porCli[String(c.id)]; if (!f || f.grupo !== 'frecuentes') return null;
    var t = Number(totalFactura || 0);
    return { tone: 'acc nxFidSug', ic: 'ti-heart-handshake', t: 'Cliente frecuente: puede ofrecerle ' + p + ' %', s: f.n90 + ' compras en 90 días' + (t > 0 ? ' · el ' + p + ' % de esta factura son ' + fmt(t * p / 100) : '') + ' · usted decide' };
  };

  // Para el QA (sin efectos: solo calcula)
  window.__nxPosFidTest = { clasificar: clasificar, borrador: borrador, csvGrupo: csvGrupo, datos: function () { return _datos; } };
})();
