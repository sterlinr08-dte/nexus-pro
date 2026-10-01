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
    'html.tema-glass-oscuro{--nxnav-s:36px;--nxnav-i:16px}',
    '@media (max-width:768px){html.tema-glass-oscuro{--nxnav-s:44px;--nxnav-i:18px}}',
    /* cabecera: título centrado entre la salida izquierda y la derecha */
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]{position:relative;display:flex!important;align-items:center;justify-content:flex-start!important;gap:10px;padding-left:0!important;min-height:var(--nxnav-s)}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]>[data-nxtitle]{flex:1 1 auto;min-width:0;text-align:center;order:0}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]:not([data-nxl])::before,html.tema-glass-oscuro .modal>.mt[data-nxhead]:not([data-nxr])::after{content:"";flex:0 0 var(--nxnav-s);height:1px}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]::before{order:-10}',
    'html.tema-glass-oscuro .modal>.mt[data-nxhead]::after{order:10}',
    /* :not(#_n) ×2 = peso de dos id: algunas ventanas traen reglas «#mCli .btn{…!important}» */
    /* el botón: círculo de cristal, ícono solo, misma forma para Atrás y Cerrar */
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n){position:static!important;transform:none;flex:0 0 var(--nxnav-s);width:var(--nxnav-s)!important;height:var(--nxnav-s)!important;min-width:0!important;padding:0!important;margin:0!important;border-radius:50%!important;display:inline-flex!important;align-items:center;justify-content:center;gap:0!important;line-height:1;background:rgba(255,255,255,.10)!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(2,8,23,.18)!important;color:#F1F5F9!important;-webkit-backdrop-filter:blur(12px) saturate(140%);backdrop-filter:blur(12px) saturate(140%);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .1s ease-out,background-color .15s ease;opacity:1!important}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n) i{font-size:var(--nxnav-i)!important;color:inherit!important;margin:0!important;line-height:1}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n) [data-nxtxt]{display:none!important}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="back"]:not(#_n):not(#_n){order:-10}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="close"]:not(#_n):not(#_n){order:10}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav="dup"]:not(#_n):not(#_n){display:none!important}',
    '@media (hover:hover){html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):hover{background:rgba(255,255,255,.16)!important}}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):active{transform:scale(.92)!important;background:rgba(255,255,255,.20)!important}',
    'html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):focus-visible{outline:2px solid #60A5FA;outline-offset:2px}',
    '@media (prefers-reduced-motion:reduce){html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n){transition:background-color .15s ease}html.tema-glass-oscuro .modal>.mt [data-nxnav]:not(#_n):not(#_n):active{transform:none!important}}',
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
    if (kind === 'close') { icono(b, 'ti-x'); b.setAttribute('aria-label', 'Cerrar'); b.title = 'Cerrar'; }
    else if (kind === 'back') { icono(b, 'ti-chevron-left'); b.setAttribute('aria-label', 'Volver'); b.title = 'Volver'; }
  }

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
    abiertos.forEach(function (ov, idx) {
      var mt = ov.querySelector('.modal > .mt');
      if (!mt) return;
      // Apilada = hay otra ventana abierta debajo (esta es posterior en el documento)
      var apilada = n > 1 && idx > 0;
      try { procesarCabecera(mt, apilada); } catch (e) { /* nunca romper la ventana */ }
    });
  }

  function init() {
    ponerCSS();
    pasar();
    // Callback del observer = microtarea antes de pintar: no se ve la flecha vieja ni un salto
    new MutationObserver(function () { if (!pend) { pend = true; Promise.resolve().then(pasar); } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
