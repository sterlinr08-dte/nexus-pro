/* NEXUS PRO — Botones de barra de navegación de las ventanas (tema Glass oscuro)
   01-oct-2026. Ordena los botones de la cabecera (.modal > .mt) de todas las ventanas con la regla de Apple:
   · Cerrar (✕) siempre a la derecha. Es la salida de una ventana abierta desde una pantalla.
   · Atrás (‹) a la izquierda, solo cuando la ventana está encima de otra ventana (volver a la anterior).
   · Una sola salida por acción: si la flecha que inyecta parches-seguros-base.js («nx-volver-btn») convive
     con una ✕, se oculta; si no hay ✕, esa misma flecha pasa a ser la ✕.
   · «← Cerrar» se muestra como ✕; «← Volver» en una ventana suelta (no apilada) también es una ✕.
   · Título centrado entre ambos lados; círculos de cristal de 44 px en iPhone y 36 px en escritorio.
   No cambia lo que hace ningún botón (mismo onclick); solo su ícono, su lugar y su aspecto.
   Para deshacer: quitar cargarConReintento('parches-nav-botones.js') de index.html. */
(function () {
  'use strict';
  if (window.__nxNavBotones) return;
  window.__nxNavBotones = true;

  var CSS = [
    /* Resortes de Apple como curvas linear() (damping 1.0 / 0.8 / 0.7, response 0.35 s) */
    'html.tema-glass-oscuro{--nxnav-s:36px;--nxnav-i:16px;--nxnav-rel:.37s;' +
      '--nxnav-sp1:linear(0,.024,.082,.158,.243,.33,.413,.491,.562,.626,.682,.731,.774,.81,.841,.868,.89,.909,.925,.938,.949,.958,.965,.972,.977,.981,.984,.987,1);' +
      '--nxnav-sp8:linear(0,.019,.068,.136,.216,.302,.389,.473,.553,.626,.692,.751,.802,.846,.883,.914,.94,.96,.976,.989,.998,1.005,1.009,1.013,1.014,1.015,1.015,1.015,1);' +
      '--nxnav-sp7:linear(0,.025,.088,.176,.278,.385,.491,.591,.682,.763,.832,.889,.936,.972,1,1.02,1.033,1.041,1.045,1.046,1.044,1.041,1.037,1.032,1.027,1.022,1.018,1.014,1)}',
    '@supports not (transition-timing-function:linear(0,1)){html.tema-glass-oscuro{--nxnav-sp1:cubic-bezier(.2,.8,.2,1);--nxnav-sp8:cubic-bezier(.34,1.3,.64,1);--nxnav-sp7:cubic-bezier(.34,1.56,.64,1)}}',
    '@media (max-width:768px){html.tema-glass-oscuro{--nxnav-s:44px;--nxnav-i:18px}}',
    /* cabecera: título centrado entre la salida izquierda y la derecha */
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]{position:relative;display:flex!important;align-items:center;justify-content:flex-start!important;gap:10px;padding-left:0!important;min-height:var(--nxnav-s)}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]>[data-nxtitle]{flex:1 1 auto;min-width:0;text-align:center;order:0}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]:not([data-nxl])::before,html.tema-glass-oscuro .modal>.mt[data-nxhead]:not([data-nxr])::after{content:"";flex:0 0 var(--nxnav-s);height:1px}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]::before{order:-10}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]::after{order:10}',
    /* :not(#_n) ×2 = peso de dos id: algunas ventanas traen reglas «#mCli .btn{…!important}» */
    /* el botón: círculo de cristal, ícono solo, misma forma para Atrás y Cerrar */
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n){position:relative!important;transform:none;flex:0 0 var(--nxnav-s);width:var(--nxnav-s)!important;height:var(--nxnav-s)!important;min-width:0!important;padding:0!important;margin:0!important;border-radius:50%!important;display:inline-flex!important;align-items:center;justify-content:center;gap:0!important;line-height:1;background:rgba(255,255,255,.10)!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(2,8,23,.18)!important;color:#F1F5F9!important;-webkit-backdrop-filter:blur(12px) saturate(140%);backdrop-filter:blur(12px) saturate(140%);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform var(--nxnav-rel) var(--nxnav-sp7),background-color .15s ease,box-shadow .2s ease!important;opacity:1!important}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n) i{font-size:var(--nxnav-i)!important;color:inherit!important;margin:0!important;line-height:1}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n) [data-nxtxt]{display:none!important}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="back"]:not(#_n):not(#_n){order:-10}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="close"]:not(#_n):not(#_n){order:10}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="dup"]:not(#_n):not(#_n){display:none!important}',
    '@media (hover:hover){html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):hover{background:rgba(255,255,255,.16)!important}}',
    /* área táctil ampliada en escritorio (36 px visibles → 48 px tocables) */
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n)::after{content:"";position:absolute;inset:-6px;border-radius:50%}',
    /* pulsado: responde al tocar (pointerdown → .nxp), se hunde rápido y vuelve con un leve rebote */
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n).nxp,html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):active{transform:scale(.86)!important;background:rgba(255,255,255,.22)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 1px 3px rgba(2,8,23,.2)!important;transition:transform 90ms cubic-bezier(.2,.8,.2,1),background-color 90ms ease,box-shadow 90ms ease!important}',
    /* micro-gesto del ícono: la ✕ gira hacia el cierre; la ‹ apunta hacia donde va */
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n) i{transition:transform .37s var(--nxnav-sp1)}',
    '@media (hover:hover){html.tema-glass-oscuro .modal>.mt [data-nxnav="close"]:not(#_n):not(#_n):hover i{transform:rotate(90deg)}html.tema-glass-oscuro .modal>.mt [data-nxnav="back"]:not(#_n):not(#_n):hover i{transform:translateX(-2px)}}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="close"]:not(#_n):not(#_n).nxp i{transform:rotate(90deg) scale(.92)}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="back"]:not(#_n):not(#_n).nxp i{transform:translateX(-3px)}',
    /* entrada: el botón se materializa con la ventana (escala + desenfoque + opacidad, resorte 0.8); la ✕ 50 ms después */
    '@keyframes nxNavIn{from{opacity:0;transform:scale(.4);filter:blur(6px)}to{opacity:1;transform:scale(1);filter:blur(0)}}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n)[data-nxin]{animation:nxNavIn .42s var(--nxnav-sp8) both}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="close"]:not(#_n):not(#_n)[data-nxin]{animation-delay:50ms}',
    '@keyframes nxNavInIco{from{transform:rotate(-90deg)}to{transform:rotate(0)}}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="close"]:not(#_n):not(#_n)[data-nxin] i{animation:nxNavInIco .5s var(--nxnav-sp8) 50ms both}',
    /* deslizar la cabecera hacia abajo para cerrar (iPhone) */
    'html.tema-glass-oscuro .modal>.mt[data-nxhead][data-nxswipe]{touch-action:none;cursor:grab}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead][data-nxswipe]>[data-nxtitle]::before{content:"";position:absolute;left:50%;top:-10px;width:36px;height:5px;margin-left:-18px;border-radius:3px;background:rgba(255,255,255,.28)}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):focus-visible{outline:2px solid #60A5FA;outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n){transition:background-color .15s ease!important}html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n).nxp,html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):active{transform:none!important}html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n)[data-nxin]{animation:nxNavFade .2s ease both!important}html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n)[data-nxin] i,html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n) i{animation:none!important;transform:none!important}}',
    '@keyframes nxNavFade{from{opacity:0}to{opacity:1}}',
    '@media (prefers-reduced-transparency:reduce){html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n){-webkit-backdrop-filter:none;backdrop-filter:none;background:#24406C!important}}',
    '@media (prefers-contrast:more){html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n){border-color:rgba(255,255,255,.6)!important}}'
  ].join('\n');

  function ponerCSS() {
    if (document.getElementById('nxNavBotones')) return;
    var st = document.createElement('style');
    st.id = 'nxNavBotones';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  var RE_BACK_ICON = /\bti-(arrow-left|chevron-left|arrow-back)\b/;
  var RE_CLOSE_ICON = /\bti-(x|circle-x|square-x)\b/;

  function tipoDe(b) {
    var i = b.querySelector('i.ti, i[class*="ti-"]');
    var ic = i ? i.className : '';
    var txt = (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    var lab = ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '')).trim().toLowerCase();
    if (RE_CLOSE_ICON.test(ic) || /^[✕×✖x]$/.test(txt) || (!ic && /^cerrar$/.test(txt))) return 'close';
    if (RE_BACK_ICON.test(ic)) return /^cerrar\b/.test(txt) || /^cerrar\b/.test(lab) ? 'close' : 'back';
    if (/^(←\s*)?volver$/.test(txt)) return 'back';
    return null;
  }

  function icono(b, clase) {
    var i = b.querySelector('i.ti, i[class*="ti-"]');
    if (!i) { i = document.createElement('i'); b.insertBefore(i, b.firstChild); }
    i.className = 'ti ' + clase;
    i.setAttribute('aria-hidden', 'true');
  }

  // El texto suelto («Volver», «Cerrar») se envuelve y se oculta (no se borra): el nombre accesible va en aria-label.
  // No se usa font-size:0 porque la capa de legibilidad sube a 11 px todo tamaño menor.
  function envolverTexto(b) {
    [].slice.call(b.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && n.nodeValue.trim()) {
        var sp = document.createElement('span'); sp.setAttribute('data-nxtxt', ''); sp.textContent = n.nodeValue;
        b.replaceChild(sp, n);
      }
    });
  }

  function marcar(b, kind) {
    envolverTexto(b);
    b.setAttribute('data-nxnav', kind);
    if (kind !== 'dup') entrar(b);
    if (kind === 'close') { icono(b, 'ti-x'); b.setAttribute('aria-label', 'Cerrar'); b.title = TACTIL.matches ? 'Cerrar' : 'Cerrar (Esc)'; }
    else if (kind === 'back') { icono(b, 'ti-chevron-left'); b.setAttribute('aria-label', 'Volver'); b.title = TACTIL.matches ? 'Volver' : 'Volver (Esc)'; }
  }

  // Entrada animada: se quita al terminar para que el giro del ícono al pasar el mouse vuelva a funcionar
  function entrar(b) {
    b.setAttribute('data-nxin', '');
    clearTimeout(b.__nxIn);
    b.__nxIn = setTimeout(function () { b.removeAttribute('data-nxin'); }, 650); // botón .42 s + ícono .05+.5 s
  }
  var REDUCIR = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var TACTIL = window.matchMedia ? matchMedia('(pointer: coarse)') : { matches: false };

  function overlaysAbiertos() {
    var n = 0;
    document.querySelectorAll('.overlay.open').forEach(function (o) {
      if (o.offsetParent !== null || getComputedStyle(o).display !== 'none') n++;
    });
    return n;
  }

  function procesarCabecera(mt, apilada) {
    var botones = [];
    for (var k = 0; k < mt.children.length; k++) {
      var c = mt.children[k];
      if (c.tagName === 'BUTTON' || (c.tagName === 'A' && c.classList.contains('btn'))) botones.push(c);
    }
    var cierres = [], atras = [], inyectado = null;
    botones.forEach(function (b) {
      var ya = b.getAttribute('data-nxnav');
      var t = ya ? (ya === 'dup' ? null : ya) : tipoDe(b);
      if (b.classList.contains('nx-volver-btn')) { inyectado = b; return; }
      if (t === 'close') cierres.push(b);
      else if (t === 'back') atras.push(b);
    });
    if (!botones.length) return;

    if (inyectado && !inyectado.getAttribute('data-nxnav')) {
      if (cierres.length || atras.length) inyectado.setAttribute('data-nxnav', 'dup');
      else { marcar(inyectado, 'close'); cierres.push(inyectado); }
    } else if (inyectado && inyectado.getAttribute('data-nxnav') === 'close') {
      cierres.push(inyectado);
    }

    cierres.forEach(function (b) { if (b.getAttribute('data-nxnav') !== 'close') marcar(b, 'close'); });
    atras.forEach(function (b) {
      if (b.getAttribute('data-nxnav')) return;
      // «Volver» en una ventana suelta es la salida de la ventana → Cerrar a la derecha
      marcar(b, (apilada || cierres.length) ? 'back' : 'close');
    });

    // Un solo Cerrar visible: si quedaron dos (p. ej. «← Volver» suelto + ✕), se oculta el extra
    var vis = mt.querySelectorAll(':scope > [data-nxnav="close"]');
    for (var j = 1; j < vis.length; j++) vis[j].setAttribute('data-nxnav', 'dup');

    var l = mt.querySelector(':scope > [data-nxnav="back"]');
    var r = mt.querySelector(':scope > [data-nxnav="close"]');
    if (!l && !r) return;
    mt.setAttribute('data-nxhead', '');
    mt.dataset.nxVolverIgnore = '1'; // la cabecera ya tiene su salida: que parches-seguros-base.js no inyecte otra flecha
    if (l) mt.setAttribute('data-nxl', ''); else mt.removeAttribute('data-nxl');
    var otrosDerecha = botones.some(function (b) { return !b.hasAttribute('data-nxnav'); });
    if (r || otrosDerecha) mt.setAttribute('data-nxr', ''); else mt.removeAttribute('data-nxr');
    if (!mt.querySelector(':scope > [data-nxtitle]')) {
      for (var m = 0; m < mt.children.length; m++) {
        var e = mt.children[m];
        if (e.tagName !== 'BUTTON' && e.tagName !== 'A') { e.setAttribute('data-nxtitle', ''); break; }
      }
    }
  }

  var pend = false;
  function pasar() {
    pend = false;
    if (!document.documentElement.classList.contains('tema-glass-oscuro')) return;
    var abiertos = document.querySelectorAll('.overlay.open');
    if (!abiertos.length) return;
    var n = overlaysAbiertos();
    document.querySelectorAll('.overlay[data-nxvisto]:not(.open)').forEach(function (o) { o.removeAttribute('data-nxvisto'); });
    abiertos.forEach(function (ov, idx) {
      var mt = ov.querySelector('.modal > .mt');
      if (!mt) return;
      if (!ov.hasAttribute('data-nxvisto')) {
        ov.setAttribute('data-nxvisto', '');
        mt.querySelectorAll(':scope > [data-nxnav="close"], :scope > [data-nxnav="back"]').forEach(entrar);
      }
      // Apilada = hay otra ventana abierta debajo (esta es posterior en el documento)
      var apilada = n > 1 && idx > 0;
      try { procesarCabecera(mt, apilada); } catch (e) { /* nunca romper la ventana */ }
      if (TACTIL.matches && mt.hasAttribute('data-nxhead') && !mt.hasAttribute('data-nxswipe')) mt.setAttribute('data-nxswipe', '');
    });
  }

  // ── Pulsado: respuesta en pointer-down (iOS no aplica :active sin esto), mínimo 90 ms visible ──
  function pulsado() {
    var actual = null, desde = 0;
    function soltar() {
      if (!actual) return;
      var b = actual, quedan = Math.max(0, 90 - (Date.now() - desde)); actual = null;
      setTimeout(function () { b.classList.remove('nxp'); }, quedan);
    }
    document.addEventListener('pointerdown', function (e) {
      var b = e.target && e.target.closest && e.target.closest('.modal > .mt > [data-nxnav]');
      if (!b || !glass()) return;
      actual = b; desde = Date.now(); b.classList.add('nxp');
    }, true);
    ['pointerup', 'pointercancel'].forEach(function (t) { document.addEventListener(t, soltar, true); });
    document.addEventListener('pointerout', function (e) { if (actual && e.target === actual && !actual.contains(e.relatedTarget)) soltar(); }, true);
  }

  function glass() { return document.documentElement.classList.contains('tema-glass-oscuro'); }

  function ventanaArriba() {
    var ovs = [].slice.call(document.querySelectorAll('.overlay.open')).filter(function (o) { return getComputedStyle(o).display !== 'none'; });
    for (var k = ovs.length - 1; k >= 0; k--) {
      var mt = ovs[k].querySelector('.modal > .mt[data-nxhead]');
      if (mt) return { ov: ovs[k], mt: mt, btn: mt.querySelector(':scope > [data-nxnav="back"]') || mt.querySelector(':scope > [data-nxnav="close"]') };
      return null; // la de arriba no es nuestra: no tocarla
    }
    return null;
  }

  // ── Esc = el botón de salida de la ventana de arriba (‹ si está apilada, si no ✕) ──
  // Si otro elemento abierto ya maneja su Esc (buscador, filtro, lista, menú), se respeta.
  var OTROS_ESC = '.nxBusca-c.open,.nfcPanel,[id^="mbbOv_"],#nxProdPick,.nxCrmModal,#nxWaCtxOverlay.open,.gs-overlay.open,.notif-panel.show';
  function teclado() {
    document.addEventListener('keydown', function (e) {
      if ((e.key !== 'Escape' && e.key !== 'Esc') || e.defaultPrevented || !glass()) return;
      if (document.querySelector(OTROS_ESC)) return;
      var a = ventanaArriba(); if (!a || !a.btn) return;
      e.preventDefault();
      a.btn.classList.add('nxp'); setTimeout(function () { a.btn.classList.remove('nxp'); a.btn.click(); }, 90);
    });
  }

  // ── Deslizar la cabecera hacia abajo para cerrar (iPhone), 1:1 con el dedo, proyección de impulso de Apple ──
  function proyectar(vPxMs, d) { d = d || 0.998; return vPxMs * d / (1 - d); } // (v/1000)·d/(1−d) con v en px/s
  function rubber(x, dim) { var c = 0.55; return (x * dim * c) / (dim + c * Math.abs(x)); }
  function deslizar() {
    var g = null;
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'touch' || !glass()) return;
      var mt = e.target.closest && e.target.closest('.modal > .mt[data-nxswipe]');
      if (!mt || e.target.closest('button, a, input, select, textarea')) return;
      var modal = mt.parentNode, ov = modal.closest('.overlay');
      var btn = mt.querySelector(':scope > [data-nxnav="close"]') || mt.querySelector(':scope > [data-nxnav="back"]');
      if (!btn || !ov) return;
      g = { mt: mt, modal: modal, ov: ov, btn: btn, y0: e.clientY, x0: e.clientX, dy: 0, h: [], id: e.pointerId, vivo: false, ini: modal.style.transform, tr: modal.style.transition };
      if (modal.getAnimations) modal.getAnimations().forEach(function (a) { a.cancel(); });
    }, true);
    document.addEventListener('pointermove', function (e) {
      if (!g || e.pointerId !== g.id) return;
      var dy = e.clientY - g.y0, dx = e.clientX - g.x0;
      if (!g.vivo) {
        if (Math.abs(dy) < 10 && Math.abs(dx) < 10) return;        // histéresis de 10 px antes de decidir
        if (Math.abs(dx) > Math.abs(dy)) { g = null; return; }      // era horizontal: no es nuestro gesto
        g.vivo = true; // sin reiniciar el origen: la ventana queda pegada al punto donde se apoyó el dedo
        try { g.mt.setPointerCapture(e.pointerId); } catch (x) {}
        g.modal.style.transition = 'none';
      }
      g.dy = dy;
      var y = dy >= 0 ? dy : rubber(dy, g.modal.offsetHeight || 400); // hacia arriba: resistencia progresiva
      g.modal.style.transform = 'translateY(' + y + 'px)';
      g.h.push({ y: dy, t: e.timeStamp }); if (g.h.length > 6) g.h.shift();
    }, true);
    function fin(e) {
      if (!g || (e && e.pointerId !== g.id)) return;
      var s = g; g = null;
      if (!s.vivo) return;
      var v = 0;
      if (s.h.length > 1) { var a = s.h[0], b = s.h[s.h.length - 1]; v = (b.y - a.y) / Math.max(1, b.t - a.t); } // px/ms
      var destino = s.dy + proyectar(v);
      var umbral = Math.max(120, Math.min((s.modal.offsetHeight || 400) * 0.5, 220)); // como las hojas de iOS: pasar la mitad (proyectada)
      var desde = s.dy >= 0 ? s.dy : rubber(s.dy, s.modal.offsetHeight || 400);
      if (destino > umbral && s.dy > 0) {
        // Cerrar: sigue a la velocidad del dedo hacia abajo y luego toca la salida real (mismo onclick)
        var resto = Math.max(80, innerHeight - desde);
        var dur = Math.max(160, Math.min(320, resto / Math.max(v, 0.6)));
        try { navigator.vibrate && navigator.vibrate(8); } catch (x) {}
        var an = s.modal.animate([{ transform: 'translateY(' + desde + 'px)', opacity: 1 }, { transform: 'translateY(' + (desde + resto) + 'px)', opacity: 0.4 }], { duration: dur, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'forwards' });
        an.onfinish = function () {
          s.btn.click();
          requestAnimationFrame(function () {
            an.cancel(); s.modal.style.transform = s.ini; s.modal.style.transition = s.tr;
            // Si la ventana no se cerró (p. ej. pidió confirmación), vuelve a su sitio
          });
        };
      } else {
        // Volver a su sitio con resorte (damping 1.0), desde donde está ahora
        var an2 = s.modal.animate([{ transform: 'translateY(' + desde + 'px)' }, { transform: 'translateY(0)' }], { duration: 370, easing: getComputedStyle(document.documentElement).getPropertyValue('--nxnav-sp1').trim() || 'ease-out' });
        s.modal.style.transform = s.ini; an2.onfinish = function () { s.modal.style.transition = s.tr; };
      }
    }
    document.addEventListener('pointerup', fin, true);
    document.addEventListener('pointercancel', fin, true);
  }

  function init() {
    ponerCSS();
    pulsado();
    teclado();
    deslizar();
    pasar();
    // Callback del observer = microtarea antes de pintar: no se ve la flecha vieja ni un salto
    new MutationObserver(function () { if (!pend) { pend = true; Promise.resolve().then(pasar); } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
