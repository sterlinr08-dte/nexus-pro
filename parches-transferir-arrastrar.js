/* 59.32 (dueño 16-oct-2026, idea «Dragging money to a friend» de bencho.dev/finds):
   en «Transferir dinero» el billete se ARRASTRA hasta el agente que lo recibe.

   Solo es una forma más bonita de ELEGIR a quién se le envía: llena el mismo
   <select id="nxTA2Hacia"> de siempre y el envío sigue pasando por
   nxGuardarTransferenciaAgenteV2 → rpc/transferencias_crear (saldo real, candado
   por agente, idempotencia). Este archivo no toca dinero, ni la base, ni la lógica.

   También se puede tocar el círculo del agente en vez de arrastrar, y el <select>
   sigue ahí por si acaso. Para quitarla: borrar su línea en parches-seguros.js;
   o en un equipo, localStorage.nxArrastrar='0'. */
(function () {
  'use strict';
  try { if (localStorage.getItem('nxArrastrar') === '0') return; } catch (e) {}
  if (window.__nxArrastrar) return;
  window.__nxArrastrar = true;

  var MODAL = 'nxModalTransferAgenteV2';
  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iniciales(n) {
    var p = String(n || '').trim().split(/\s+/).filter(Boolean);
    return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }
  function primerNombre(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  var COLORES = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];
  function color(id) { var h = 0, s = String(id); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return COLORES[Math.abs(h) % COLORES.length]; }
  function montoTxt() {
    var v = ($('nxTA2Monto') || {}).value || '';
    var n = window.nxMoney ? window.nxMoney.parse(v) : Number(String(v).replace(/[^0-9.]/g, ''));
    if (!n || n <= 0) return 'RD$ —';
    return 'RD$ ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function css() {
    if ($('nxTAD-css')) return;
    var st = document.createElement('style');
    st.id = 'nxTAD-css';
    st.textContent = [
      '#nxTAD{border:1px solid rgba(124,58,237,.18);border-radius:16px;padding:12px 12px 10px;background:linear-gradient(180deg,rgba(124,58,237,.06),rgba(124,58,237,.015))}',
      '#nxTAD .tad-t{font-size:11px;font-weight:800;letter-spacing:.04em;color:#8b5cf6;display:flex;align-items:center;gap:6px;margin-bottom:10px}',
      '#nxTAD .tad-row{display:flex;align-items:center;gap:12px}',
      '#nxTAD .tad-bill{flex:none;position:relative;z-index:3;width:150px;height:62px;border-radius:12px;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;',
      ' background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;box-shadow:0 6px 16px rgba(21,128,61,.35),inset 0 0 0 2px rgba(255,255,255,.18);',
      ' display:flex;flex-direction:column;justify-content:center;padding:0 10px;transition:transform .18s cubic-bezier(.23,1,.32,1),box-shadow .18s}',
      '#nxTAD .tad-bill:active{cursor:grabbing}',
      '#nxTAD .tad-bill::before{content:"";position:absolute;right:8px;top:50%;width:26px;height:26px;margin-top:-13px;border-radius:50%;border:2px solid rgba(255,255,255,.35)}',
      '#nxTAD .tad-bill small{font-size:9px;font-weight:800;letter-spacing:.08em;opacity:.85}',
      '#nxTAD .tad-bill b{font-size:14px;font-weight:900;font-family:var(--mono,ui-monospace,monospace);white-space:nowrap;max-width:118px;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em}',
      '#nxTAD .tad-bill.drag{transition:none;box-shadow:0 18px 34px rgba(21,128,61,.45),inset 0 0 0 2px rgba(255,255,255,.25)}',
      '#nxTAD .tad-bill.hint{animation:nxTADhint 1.6s cubic-bezier(.45,0,.55,1) 2}',
      '@keyframes nxTADhint{0%,100%{transform:translateX(0)}40%{transform:translateX(14px)}60%{transform:translateX(10px)}}',
      '#nxTAD .tad-arrow{flex:none;color:#a78bfa;font-size:18px}',
      '#nxTAD .tad-list{flex:1;min-width:0;display:flex;gap:10px;overflow-x:auto;padding:8px 4px 6px;scrollbar-width:none}',
      '@media (max-width:440px){#nxTAD .tad-row{gap:8px}#nxTAD .tad-bill{width:124px;padding:0 9px}#nxTAD .tad-bill b{font-size:13px;max-width:104px}#nxTAD .tad-bill::before{width:20px;height:20px;margin-top:-10px;right:7px}#nxTAD .tad-ag{width:58px}#nxTAD .tad-ag span{max-width:58px}#nxTAD .tad-list{gap:8px}}',
      '#nxTAD .tad-list::-webkit-scrollbar{display:none}',
      '#nxTAD .tad-ag{flex:none;width:66px;border:0!important;background:none!important;box-shadow:none!important;min-height:0!important;padding:0!important;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;font:inherit;color:inherit;opacity:1}',
      '#nxTAD .tad-av{position:relative;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:900;font-size:15px;',
      ' box-shadow:0 0 0 3px #fff,0 0 0 4px rgba(15,23,42,.08);transition:transform .2s cubic-bezier(.23,1,.32,1),box-shadow .2s}',
      '#nxTAD .tad-ag span{font-size:10.5px;font-weight:700;max-width:66px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#nxTAD .tad-ag.over .tad-av{transform:scale(1.18);box-shadow:0 0 0 3px #fff,0 0 0 6px rgba(124,58,237,.55)}',
      '#nxTAD .tad-ag.on .tad-av{box-shadow:0 0 0 3px #fff,0 0 0 6px #16a34a}',
      '#nxTAD .tad-ag.on span{color:#15803d}',
      '#nxTAD .tad-ok{position:absolute;right:-4px;bottom:-4px;width:20px;height:20px;border-radius:50%;background:#16a34a;border:2px solid #fff;display:none;place-items:center}',
      '#nxTAD .tad-ok::after{content:"";width:5px;height:9px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg) translate(-1px,-1px)}',
      '#nxTAD .tad-ag.on .tad-ok{display:grid}',
      '#nxTAD .tad-ag.pop .tad-av{animation:nxTADpop .5s cubic-bezier(.34,1.56,.64,1)}',
      '@keyframes nxTADpop{0%{transform:scale(1.18)}35%{transform:scale(.88)}100%{transform:scale(1)}}',
      '#nxTAD .tad-ag:focus-visible{outline:none}#nxTAD .tad-ag:focus-visible .tad-av{box-shadow:0 0 0 3px #fff,0 0 0 6px #7c3aed}',
      '#nxTAD .tad-foot{margin-top:6px;font-size:11px;color:inherit;opacity:.78;min-height:15px}',
      '#nxTAD .tad-foot b{color:#15803d}',
      '#nxTAD-ghost{position:fixed;z-index:100000;pointer-events:none;border-radius:12px;background:linear-gradient(135deg,#16a34a,#15803d);box-shadow:0 10px 24px rgba(21,128,61,.4)}',
      'html.dark #nxTAD,body.dark #nxTAD,[data-theme="dark"] #nxTAD{border-color:rgba(167,139,250,.25);background:rgba(124,58,237,.10)}',
      'html.dark #nxTAD .tad-ag,body.dark #nxTAD .tad-ag,[data-theme="dark"] #nxTAD .tad-ag{color:#e2e8f0}',
      'html.dark #nxTAD .tad-t,body.dark #nxTAD .tad-t,[data-theme="dark"] #nxTAD .tad-t{color:#c4b5fd}',
      '@media (prefers-reduced-motion:reduce){#nxTAD *{animation:none!important;transition:none!important}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ── Construir la franja dentro del modal ── */
  function agentes() {
    var sel = $('nxTA2Hacia'); if (!sel) return [];
    var out = [];
    Array.prototype.forEach.call(sel.options, function (o) { if (o.value) out.push({ id: o.value, nom: o.textContent }); });
    var desde = ($('nxTA2Desde') || {}).value || '';
    return out.filter(function (a) { return a.id !== desde; });
  }

  function pintar() {
    var modal = $(MODAL); if (!modal) return;
    var body = modal.querySelector('.nxTA2-body'); if (!body) return;
    var lista = agentes();
    var box = $('nxTAD');
    if (lista.length === 0) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.id = 'nxTAD';
      box.innerHTML =
        '<div class="tad-t"><i class="ti ti-hand-finger"></i>Arrastra el billete a quien lo recibe</div>' +
        '<div class="tad-row">' +
        '  <div class="tad-bill" id="nxTADbill" role="img" aria-label="Billete a transferir"><small>TRANSFERIR</small><b id="nxTADmonto">RD$ —</b></div>' +
        '  <i class="ti ti-chevrons-right tad-arrow" aria-hidden="true"></i>' +
        '  <div class="tad-list" id="nxTADlist" role="listbox" aria-label="Agente que recibe"></div>' +
        '</div>' +
        '<div class="tad-foot" id="nxTADfoot">También puedes tocar el círculo del agente.</div>';
      body.insertBefore(box, body.firstChild);
      engancharBillete($('nxTADbill'));
      var bill = $('nxTADbill');
      if (!reduce) { bill.classList.add('hint'); setTimeout(function () { bill.classList.remove('hint'); }, 3400); }
    }
    var actual = ($('nxTA2Hacia') || {}).value || '';
    $('nxTADlist').innerHTML = lista.map(function (a) {
      return '<button type="button" class="tad-ag' + (a.id === actual ? ' on' : '') + '" data-id="' + esc(a.id) + '" role="option" aria-selected="' + (a.id === actual) + '" title="' + esc(a.nom) + '">' +
        '<div class="tad-av" style="background:' + color(a.id) + '">' + esc(iniciales(a.nom)) + '<i class="tad-ok"></i></div>' +
        '<span>' + esc(primerNombre(a.nom)) + '</span></button>';
    }).join('');
    Array.prototype.forEach.call($('nxTADlist').querySelectorAll('.tad-ag'), function (b) {
      b.addEventListener('click', function () { elegir(b.getAttribute('data-id'), b, true); });
    });
    $('nxTADmonto').textContent = montoTxt();
    pie();
  }

  function pie() {
    var f = $('nxTADfoot'); if (!f) return;
    var sel = $('nxTA2Hacia');
    var o = sel && sel.value ? sel.options[sel.selectedIndex] : null;
    f.innerHTML = o ? 'Para <b>' + esc(o.textContent) + '</b> · ' + esc(montoTxt()) + ' · confirma con «Enviar transferencia».'
                    : 'También puedes tocar el círculo del agente.';
  }

  function elegir(id, btn, animar) {
    var sel = $('nxTA2Hacia'); if (!sel || !id) return;
    sel.value = id;
    try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll('#nxTADlist .tad-ag'), function (b) {
      var on = b.getAttribute('data-id') === id;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
    });
    if (btn && animar && !reduce) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
    pie();
    var m = $('nxTA2Monto');
    if (m && !m.value) { try { m.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ── Arrastre 1:1 con captura del puntero; al soltar sobre un agente, el billete «entra» en él ── */
  function engancharBillete(bill) {
    var drag = null;
    function agenteBajo(x, y) {
      var el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest('#nxTADlist .tad-ag') : null;
    }
    function marcar(b) {
      Array.prototype.forEach.call(document.querySelectorAll('#nxTADlist .tad-ag.over'), function (x) { if (x !== b) x.classList.remove('over'); });
      if (b) b.classList.add('over');
    }
    bill.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      bill.classList.remove('hint');
      try { bill.setPointerCapture(e.pointerId); } catch (err) {}
      drag = { x0: e.clientX, y0: e.clientY, over: null };
      bill.classList.add('drag');
      e.preventDefault();
    });
    bill.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      bill.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + Math.max(-8, Math.min(8, dx / 20)) + 'deg) scale(1.04)';
      bill.style.pointerEvents = 'none';
      drag.over = agenteBajo(e.clientX, e.clientY);
      bill.style.pointerEvents = '';
      marcar(drag.over);
      // Si el agente está escondido a la derecha de la lista, la lista se corre sola
      var list = $('nxTADlist'), r = list.getBoundingClientRect();
      if (e.clientX > r.right - 24) list.scrollLeft += 8; else if (e.clientX < r.left + 24 && e.clientX > r.left - 40) list.scrollLeft -= 8;
    });
    function soltar(e) {
      if (!drag) return;
      var destino = drag.over; drag = null;
      marcar(null);
      bill.classList.remove('drag');
      if (destino) {
        volarA(bill, destino, function () { elegir(destino.getAttribute('data-id'), destino, true); });
      } else {
        bill.style.transform = '';
      }
    }
    bill.addEventListener('pointerup', soltar);
    bill.addEventListener('pointercancel', soltar);
  }

  // El billete se encoge y entra en el círculo; luego otro aparece en su sitio
  function volarA(bill, destino, fin) {
    var av = destino.querySelector('.tad-av') || destino;
    if (reduce || !bill.animate) { bill.style.transform = ''; fin(); return; }
    var rb = bill.getBoundingClientRect(), ra = av.getBoundingClientRect();
    var g = document.createElement('div');
    g.id = 'nxTAD-ghost';
    g.style.left = rb.left + 'px'; g.style.top = rb.top + 'px'; g.style.width = rb.width + 'px'; g.style.height = rb.height + 'px';
    document.body.appendChild(g);
    bill.style.transition = 'none'; bill.style.transform = ''; bill.style.opacity = '0';
    var dx = (ra.left + ra.width / 2) - (rb.left + rb.width / 2), dy = (ra.top + ra.height / 2) - (rb.top + rb.height / 2);
    var a = g.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1, borderRadius: '12px' },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.22)', opacity: .9, borderRadius: '40px' }
    ], { duration: 320, easing: 'cubic-bezier(.32,.72,0,1)' });
    a.onfinish = function () {
      g.remove(); fin();
      bill.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      bill.style.opacity = ''; bill.style.transition = '';
    };
  }

  /* ── Vigilar el modal: se crea la primera vez que se abre y luego solo cambia de clase ── */
  var vigilado = null;
  function enganchar(modal) {
    if (vigilado === modal) return;
    vigilado = modal;
    css();
    new MutationObserver(function () {
      if (modal.classList.contains('open')) pintar();
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    var hacia = $('nxTA2Hacia'), desde = $('nxTA2Desde'), monto = $('nxTA2Monto');
    if (hacia) {
      new MutationObserver(pintar).observe(hacia, { childList: true });
      hacia.addEventListener('change', function () { pintarSel(); });
    }
    if (desde) desde.addEventListener('change', pintar);
    if (monto) monto.addEventListener('input', function () { var b = $('nxTADmonto'); if (b) b.textContent = montoTxt(); pie(); });
    if (modal.classList.contains('open')) pintar();
  }
  function pintarSel() {
    var id = ($('nxTA2Hacia') || {}).value || '';
    Array.prototype.forEach.call(document.querySelectorAll('#nxTADlist .tad-ag'), function (b) {
      var on = b.getAttribute('data-id') === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
    });
    pie();
  }

  function buscar() { var m = $(MODAL); if (m) enganchar(m); }
  buscar();
  new MutationObserver(function () { if (!vigilado) buscar(); }).observe(document.body, { childList: true });
})();
