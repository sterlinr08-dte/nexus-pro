/* NEXUS PRO · Chat de WhatsApp con el teclado abierto en el celular (25-nov-2026).
   Dueño (captura del iPhone, «Corregir»; pasa igual en Safari y en la app): con el teclado abierto quedaba un hueco vacío
   entre la caja «Mensaje» y el teclado, y arriba los mensajes se metían debajo de la hora y la batería.
   Causa: en el iPhone el teclado NO achica la página; Safari la desplaza para mostrar el campo y el chat conserva su alto
   de siempre (100dvh − 78 px), así que la parte visible no coincide con el chat.
   Arreglo: mientras se escribe en el chat (≤760 px y el foco en la caja del mensaje), el chat ocupa exactamente la parte
   visible de la pantalla (window.visualViewport: alto y desplazamiento): cabecera arriba, debajo de la hora; mensajes al
   medio; caja de escribir pegada encima del teclado. Al soltar el foco vuelve como estaba.
   No toca: envío, voz, adjuntos, Realtime, Supabase ni la lógica del chat. Solo una clase en <html> y dos medidas.
   Apagar: localStorage.setItem('nx_wa_teclado_off','1') y recargar. */
(function () {
  'use strict';
  if (window.__nxWaTeclado) return;
  window.__nxWaTeclado = true;
  try { if (localStorage.getItem('nx_wa_teclado_off') === '1') return; } catch (e) {}

  var root = document.documentElement;
  var CLASE = 'nxWaKb';

  var css = document.createElement('style');
  css.id = 'nxWaTecladoCSS';
  css.textContent =
    '@media (max-width:760px){' +
    /* Las animaciones con transform del buzón y de la columna convierten position:fixed en relativo a ellos: se quitan solo mientras se escribe. */
    'html.' + CLASE + ' #v-waInbox,html.' + CLASE + ' #v-waInbox .nxWaDetailCol{transform:none!important;animation:none!important}' +
    'html.' + CLASE + ' #v-waInbox.nxWaChatOpen .nxWaShell{position:fixed!important;left:0!important;right:0!important;' +
      'top:var(--nxWaVvTop,0px)!important;height:var(--nxWaVvAlto,100dvh)!important;min-height:0!important;max-height:none!important;' +
      'margin:0!important;z-index:9000!important;box-sizing:border-box!important;' +
      'padding:max(6px,env(safe-area-inset-top,0px)) max(6px,env(safe-area-inset-right,0px)) 6px max(6px,env(safe-area-inset-left,0px))!important;' +
      'background:var(--nxWaKbFondo,#eef3fb)!important}' +
    'html.' + CLASE + ' #v-waInbox.nxWaChatOpen .nxWaDetailCol{height:100%!important;min-height:0!important;max-height:none!important}' +
    /* Con el teclado arriba no hay barra de inicio debajo: la caja no necesita ese margen. */
    'html.' + CLASE + ' #v-waInbox.nxWaChatOpen .nxWaComposerWrap{padding-bottom:6px!important;margin-bottom:0!important}' +
    'html.' + CLASE + ' #v-waInbox.nxWaChatOpen .nxWaLatest{bottom:74px!important}' +
    '}';
  (document.head || root).appendChild(css);

  var movil = function () { return window.innerWidth <= 760; };
  function campoDelChat(el) {
    return !!(el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable) &&
      el.closest && el.closest('#v-waInbox .nxWaComposer, #v-waInbox .nxWaComposerWrap'));
  }
  function chatAbierto() { var v = document.getElementById('v-waInbox'); return !!(v && v.classList.contains('nxWaChatOpen')); }
  function caja() { return document.getElementById('nxWaMsgsBox'); }

  var activo = false, cuadro = 0;
  function medir() {
    cuadro = 0;
    var quiere = movil() && chatAbierto() && campoDelChat(document.activeElement);
    if (!quiere) {
      if (activo) {
        activo = false; root.classList.remove(CLASE);
        root.style.removeProperty('--nxWaVvTop'); root.style.removeProperty('--nxWaVvAlto'); root.style.removeProperty('--nxWaKbFondo');
      }
      return;
    }
    var vv = window.visualViewport;
    var alto = vv ? vv.height : window.innerHeight, arriba = vv ? vv.offsetTop : 0;
    var box = caja(), alFondo = box ? (box.scrollHeight - box.scrollTop - box.clientHeight < 80) : false;
    root.style.setProperty('--nxWaVvTop', Math.max(0, Math.round(arriba)) + 'px');
    root.style.setProperty('--nxWaVvAlto', Math.round(alto) + 'px');
    if (!activo) {
      // El fondo detrás del chat sale del tema activo (claro u oscuro), no de un color fijo.
      try {
        var fondo = '', el = document.getElementById('v-waInbox');
        for (; el && !fondo; el = el.parentElement) { var c = getComputedStyle(el).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) fondo = c; }
        if (!fondo) fondo = getComputedStyle(document.body).backgroundColor;
        if (fondo) root.style.setProperty('--nxWaKbFondo', fondo);
      } catch (e) {}
      activo = true; root.classList.add(CLASE);
    }
    // Si se estaba viendo el último mensaje, se sigue viendo después de achicar.
    if (box && alFondo) requestAnimationFrame(function () { box.scrollTop = box.scrollHeight; });
  }
  function programar() { if (!cuadro) cuadro = requestAnimationFrame(medir); }

  document.addEventListener('focusin', function (e) { if (campoDelChat(e.target)) { programar(); setTimeout(programar, 120); setTimeout(programar, 350); } }, true);
  document.addEventListener('focusout', function () { setTimeout(programar, 60); }, true);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', programar, { passive: true });
    window.visualViewport.addEventListener('scroll', programar, { passive: true });
  }
  window.addEventListener('resize', programar, { passive: true });
  window.addEventListener('orientationchange', function () { setTimeout(programar, 250); }, { passive: true });
  window.nxWaTecladoMedir = programar;
})();
