/* NEXUS PRO · 59.81 · WhatsApp masivo a los clientes elegidos (dueño, 06-nov-2026: «vamos a arreglar el problema de WhatsApp masivo», opción A).
   Antes: «WhatsApp masivo» (Clientes con casillas) y «WA masivo» (Facturas › Más filtros) llamaban a abrirWAMasivo(), que se
   borró cuando el envío viejo por pestañas wa.me se cambió por el envío automático del Buzón → daban error y no enviaban nada.
   Ahora: abrirWAMasivo() abre una ventana con 1) qué mensaje (factura, recordatorio de pago o póliza por vencer), 2) a quiénes,
   con la lista completa y los que no tienen WhatsApp aparte, y 3) «Confirmar y enviar». Al confirmar usa el MISMO envío de
   WhatsApp › Contactos (window.nxWaIniciarEnvioMasivo → RPC whatsapp_crear_lote_envio_masivo + Edge whatsapp-envio-masivo),
   con sus plantillas aprobadas, cadencia y bajas. Nada sale sin «Confirmar y enviar».
   Apagar en un equipo: localStorage.nx_wa_masivo_elegidos_off = '1' (el botón vuelve a avisar en vez de enviar). */
(function () {
  'use strict';
  if (window.__nxWaMasivoElegidos) return;
  window.__nxWaMasivoElegidos = true;
  var OFF = false; try { OFF = localStorage.getItem('nx_wa_masivo_elegidos_off') === '1'; } catch (e) {}

  function esc(v) { try { return escHtml(String(v == null ? '' : v)); } catch (e) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); } }
  function aviso(tp, t, m) { try { toast(tp, t, m || ''); } catch (e) {} }
  function clientes() { try { return (window.ST || ST || {}).clientes || []; } catch (e) { return []; } }

  var TIPOS = [
    { k: 'factura', ic: 'ti-file-invoice', t: 'Factura del mes', d: 'La factura generada de cada cliente' },
    { k: 'pago', ic: 'ti-cash', t: 'Recordatorio de pago', d: 'Aviso de lo que tiene pendiente' },
    { k: 'vence', ic: 'ti-shield-check', t: 'Póliza por vencer', d: 'Aviso para renovar a tiempo' }
  ];

  function estilos() {
    if (document.getElementById('nxWaMasivoElegidosCss')) return;
    var st = document.createElement('style'); st.id = 'nxWaMasivoElegidosCss';
    st.textContent = [
      ':root{--nxme-bg:#ffffff;--nxme-fg:#0f172a;--nxme-sub:#475569;--nxme-line:#e2e8f0;--nxme-soft:#f8fafc;--nxme-on:#eff6ff;--nxme-acc:#2563eb;--nxme-wa:#16a34a;--nxme-scrim:rgba(15,23,42,.42)}',
      'html.tema-glass-oscuro{--nxme-bg:#161b22;--nxme-fg:#f1f5f9;--nxme-sub:#a3adbd;--nxme-line:#2a3240;--nxme-soft:#1c222c;--nxme-on:#1a2a44;--nxme-acc:#60a5fa;--nxme-wa:#22c55e;--nxme-scrim:rgba(0,0,0,.55)}',
      /* La ventana de progreso del Buzón, cuando se abre fuera del Buzón (sobre la página). */
      'body>.nxWaEnvioMasivoOverlay,.nxMeOv{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--nxme-scrim);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}',
      'body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoBox{width:min(100%,460px);max-height:min(82vh,620px);overflow-y:auto;padding:18px;border-radius:18px;background:var(--nxme-bg);color:var(--nxme-fg);box-shadow:0 30px 80px -40px rgba(15,23,42,.9)}',
      'body>.nxWaEnvioMasivoOverlay h3{margin:0 0 8px;font-size:16px;font-weight:900}',
      'body>.nxWaEnvioMasivoOverlay p{margin:8px 0;font-size:13px;color:var(--nxme-sub);line-height:1.45}',
      'body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoActs{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}',
      'body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoActs .btn{min-height:44px}',
      'body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoBarra{height:8px;border-radius:999px;background:var(--nxme-line);overflow:hidden}',
      'body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoBarraRelleno{height:100%;background:linear-gradient(90deg,#25d366,#16a34a)}',
      'body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoFallos{margin-top:10px;display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;font-size:12px}',
      /* Ventana nueva */
      '.nxMeBox{width:min(100%,480px);max-height:min(88vh,680px);display:flex;flex-direction:column;border-radius:20px;background:var(--nxme-bg);color:var(--nxme-fg);box-shadow:0 30px 80px -36px rgba(15,23,42,.9);overflow:hidden;font-size:14px;transform-origin:center;animation:nxMeIn .2s cubic-bezier(.23,1,.32,1)}',
      '.nxMeBox,.nxMeBox *,body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoBox,body>.nxWaEnvioMasivoOverlay .nxWaEnvioMasivoBox *{text-transform:none;letter-spacing:normal}',
      '.nxMeBox .nxMePaso{text-transform:uppercase;letter-spacing:.04em}',
      '@keyframes nxMeIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}',
      '.nxMeHd{display:flex;align-items:center;gap:10px;padding:16px 16px 6px}',
      '.nxMeHd .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(34,197,94,.14);color:var(--nxme-wa);font-size:20px}',
      '.nxMeHd h3{margin:0;font-size:17px;font-weight:900}.nxMeHd small{display:block;color:var(--nxme-sub);font-size:13px;margin-top:2px}',
      '.nxMeBody{padding:6px 16px 4px;overflow-y:auto}',
      '.nxMePaso{margin:12px 0 6px;font-size:13px;font-weight:800;color:var(--nxme-sub);text-transform:uppercase;letter-spacing:.04em}',
      '.nxMeTipos{display:grid;gap:8px}',
      '.nxMeTipo{display:flex;align-items:center;gap:12px;min-height:56px;padding:8px 12px;border:1.5px solid var(--nxme-line);border-radius:14px;background:var(--nxme-soft);color:inherit;text-align:left;cursor:pointer;font:inherit;transition:border-color .15s ease,background .15s ease,transform .12s ease-out}',
      '.nxMeTipo:active{transform:scale(.98)}.nxMeTipo i{font-size:20px;color:var(--nxme-acc)}',
      '.nxMeTipo b{display:block;font-size:14px}.nxMeTipo span{display:block;font-size:13px;color:var(--nxme-sub)}',
      '.nxMeTipo[aria-checked="true"]{border-color:var(--nxme-acc);background:var(--nxme-on)}',
      '.nxMeTipo .ck{margin-left:auto;width:22px;height:22px;border-radius:50%;border:2px solid var(--nxme-line);flex:none}',
      '.nxMeTipo[aria-checked="true"] .ck{border:7px solid var(--nxme-acc)}',
      '.nxMeLista{max-height:210px;overflow-y:auto;border:1px solid var(--nxme-line);border-radius:14px}',
      '.nxMeFila{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid var(--nxme-line);font-size:14px}',
      '.nxMeFila:last-child{border-bottom:0}.nxMeFila span{color:var(--nxme-sub);font-size:13px;white-space:nowrap}',
      '.nxMeSin{margin-top:8px;font-size:13px;color:var(--nxme-sub)}.nxMeSin summary{cursor:pointer;min-height:44px;display:flex;align-items:center}',
      '.nxMeNota{margin:12px 0 4px;font-size:13px;color:var(--nxme-sub);line-height:1.4}',
      '.nxMeAct{display:flex;gap:8px;padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--nxme-line)}',
      '.nxMeAct button{min-height:54px;border-radius:14px;font:inherit;font-weight:800;cursor:pointer;border:1px solid var(--nxme-line);background:transparent;color:inherit;padding:0 16px}',
      '.nxMeAct .ok{flex:1;border:0;background:var(--nxme-wa);color:#fff;font-size:15px}',
      '.nxMeAct .ok:disabled{opacity:.45;cursor:not-allowed}',
      '@media (prefers-reduced-motion: reduce){.nxMeBox{animation:none}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function cerrar() { var o = document.getElementById('nxMeOv'); if (o) o.remove(); document.removeEventListener('keydown', teclaEsc); }
  function teclaEsc(e) { if (e.key === 'Escape') cerrar(); }

  function abrir(ids, origen, tipoInicial) {
    var todos = clientes(), porId = {};
    todos.forEach(function (c) { porId[String(c.id)] = c; });
    var vistos = {}, con = [], sin = [];
    (ids || []).forEach(function (id) {
      id = String(id); if (vistos[id]) return; vistos[id] = 1;
      var c = porId[id]; if (!c) return;
      if (c.activo !== false && c.wa && String(c.wa).trim()) con.push(c); else sin.push(c);
    });
    if (!con.length) { aviso('warn', 'Nadie para enviar', sin.length ? 'Los clientes elegidos no tienen WhatsApp registrado.' : 'No hay clientes elegidos.'); return; }
    estilos(); cerrar();
    var tipo = tipoInicial || '';
    var ov = document.createElement('div'); ov.id = 'nxMeOv'; ov.className = 'nxMeOv';
    ov.innerHTML = '<div class="nxMeBox" role="dialog" aria-modal="true" aria-labelledby="nxMeTit">'
      + '<div class="nxMeHd"><div class="ic"><i class="ti ti-brand-whatsapp"></i></div><div><h3 id="nxMeTit">Enviar por WhatsApp</h3><small>' + con.length + ' cliente' + (con.length === 1 ? '' : 's') + ' · ' + esc(origen) + '</small></div></div>'
      + '<div class="nxMeBody">'
      + '<div class="nxMePaso">1 · Qué mensaje</div><div class="nxMeTipos" role="radiogroup" aria-label="Qué mensaje">'
      + TIPOS.map(function (t) { return '<button type="button" class="nxMeTipo" role="radio" aria-checked="' + (t.k === tipo) + '" data-k="' + t.k + '"><i class="ti ' + t.ic + '"></i><div><b>' + t.t + '</b><span>' + t.d + '</span></div><i class="ck" aria-hidden="true"></i></button>'; }).join('')
      + '</div>'
      + '<div class="nxMePaso">2 · A quiénes (' + con.length + ')</div><div class="nxMeLista">'
      + con.map(function (c) { return '<div class="nxMeFila"><b>' + esc(c.nom || 'Cliente') + '</b><span>' + esc(c.wa) + '</span></div>'; }).join('')
      + '</div>'
      + (sin.length ? '<details class="nxMeSin"><summary>' + sin.length + ' sin WhatsApp: no se les envía</summary>' + sin.map(function (c) { return esc(c.nom || 'Cliente'); }).join(', ') + '</details>' : '')
      + '<p class="nxMeNota">Se usan las plantillas aprobadas por Meta. Quien pidió no recibir mensajes se salta solo; en el recordatorio de pago, también quien ya recibió uno hace pocos días.</p>'
      + '</div>'
      + '<div class="nxMeAct"><button type="button" class="no">Cancelar</button><button type="button" class="ok"' + (tipo ? '' : ' disabled') + '>' + (tipo ? 'Confirmar y enviar a ' + con.length : 'Elija el mensaje') + '</button></div>'
      + '</div>';
    document.body.appendChild(ov);
    var ok = ov.querySelector('.ok');
    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.closest('.no')) return cerrar();
      var t = e.target.closest('.nxMeTipo');
      if (t) {
        tipo = t.getAttribute('data-k');
        Array.prototype.forEach.call(ov.querySelectorAll('.nxMeTipo'), function (b) { b.setAttribute('aria-checked', String(b === t)); });
        ok.disabled = false; ok.textContent = 'Confirmar y enviar a ' + con.length;
        return;
      }
      if (e.target.closest('.ok') && tipo && !ok.disabled) {
        ok.disabled = true;
        var lista = con.map(function (c) { return c.id; });
        cerrar();
        if (typeof window.nxWaIniciarEnvioMasivo !== 'function') { aviso('err', 'WhatsApp no está listo', 'Abra WhatsApp una vez y vuelva a intentar.'); return; }
        window.nxWaIniciarEnvioMasivo(tipo, lista);
      }
    });
    document.addEventListener('keydown', teclaEsc);
    setTimeout(function () { var f = ov.querySelector('.nxMeTipo[aria-checked="true"]') || ov.querySelector('.nxMeTipo'); if (f) f.focus(); }, 30);
  }

  // abrirWAMasivo(ids) → Clientes (los marcados). abrirWAMasivo() → Facturas (clientes de las facturas que se ven con el filtro).
  window.abrirWAMasivo = function (ids) {
    if (OFF) { aviso('warn', 'Envío masivo apagado en este equipo', 'Use WhatsApp › Contactos.'); return; }
    if (Array.isArray(ids)) return abrir(ids, 'clientes marcados');
    var fs = window._nxFactListaVisible;
    if (!Array.isArray(fs)) { aviso('warn', 'Abra la lista de Facturas', 'Se envía a los clientes de las facturas que se ven.'); return; }
    fs = fs.filter(function (f) { return f && f.estado !== 'Anulada'; });
    var est = (document.getElementById('fFactEstado') || {}).value || '';
    var pendientes = fs.length && fs.every(function (f) { return f.estado !== 'Pagado'; });
    abrir(fs.map(function (f) { return f.cliente_id; }), 'de las facturas en pantalla', (est === 'atrasadas' || pendientes) ? 'pago' : '');
  };
  try { estilos(); } catch (e) {}
  window.nxWaMasivoElegidos = { abrir: abrir };
})();
