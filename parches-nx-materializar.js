/* parches-nx-materializar.js — 27-oct-2026. Dueño (reel «Glassy Dashboard V5» de @code.xr): «Me gusta, ponlo en NEXUS»;
   lo que más quería era la animación. Al cambiar de pantalla, las piezas de la pantalla nueva se «materializan» una tras
   otra: entran borrosas, un poco más pequeñas y 10 px más abajo, y se aclaran (como el vidrio del video). Las barras de los
   reportes crecen desde abajo.
   · Solo al cambiar de pantalla de verdad (la .view que se enciende); nunca al refrescar datos ni al abrir la app.
   · Se marca antes del primer dibujo (MutationObserver → microtarea), así no hay parpadeo.
   · Reemplaza la cascada vieja de parches-motion-fase2 (8 px, 22 ms) mientras esta capa está encendida.
   · Máximo 10 piezas; con «reducir movimiento» no anima nada.
   Apagar: window.NX_MATERIALIZAR=false o localStorage.nx_materializar_off='1'. */
(function () {
  'use strict';
  if (window.__nxMaterializar) return;
  window.__nxMaterializar = true;
  try { if (window.NX_MATERIALIZAR === false || localStorage.getItem('nx_materializar_off') === '1') return; } catch (e) {}
  var doc = document, html = doc.documentElement;
  var MAX = 10, PASO = 45, DUR = 460;

  var css = doc.createElement('style');
  css.id = 'nxMaterializarCSS';
  css.textContent =
    'html.nx-mat .nx-motion-item{animation:none!important}' +
    // Gana a las entradas viejas de cada pantalla (p. ej. nxFadeUp de las tarjetas) solo mientras dura la suya.
    'html.nx-mat .view .nx-mat-in{animation:nxMatIn ' + DUR + 'ms cubic-bezier(.22,1,.36,1) backwards!important;animation-delay:var(--nx-mat-d,0ms)!important;will-change:transform,opacity,filter}' +
    'html.nx-mat .view .nx-mat-in.nx-mat-fin{will-change:auto}' +
    '@keyframes nxMatIn{from{opacity:0;filter:blur(8px);transform:translateY(10px) scale(.975)}60%{filter:blur(0)}to{opacity:1;filter:none;transform:none}}' +
    '.nx-mat-bar{animation:nxMatBar 700ms cubic-bezier(.22,1,.36,1) backwards;animation-delay:var(--nx-mat-d,0ms);transform-origin:bottom}' +
    '@keyframes nxMatBar{from{transform:scaleY(.04)}to{transform:none}}' +
    '@media (prefers-reduced-motion:reduce){html.nx-mat .view .nx-mat-in,.nx-mat-bar{animation:none!important}}';
  (doc.head || html).appendChild(css);
  html.classList.add('nx-mat');

  function reducir() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function seVe(el, r) { return r.width > 40 && r.height > 24 && r.bottom > 0 && r.top < innerHeight; }
  // Una «pieza» es un bloque con fondo o borde propio (tarjeta, tabla, panel). Se busca desde arriba y no se entra en una
  // pieza ya elegida, así una tarjeta anima entera y no sus renglones.
  function esPieza(el) {
    if (el.nodeType !== 1 || /^(SCRIPT|STYLE|TEMPLATE|BR|SVG)$/i.test(el.tagName)) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') return false;
    var fondo = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
    var borde = parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
    return (fondo || borde || cs.backgroundImage !== 'none') && parseFloat(cs.borderTopLeftRadius) >= 8;
  }
  function piezas(vista) {
    var out = [], cola = [[vista, 0]];
    while (cola.length && out.length < MAX) {
      var par = cola.shift(), el = par[0], nivel = par[1];
      var hijos = el.children;
      for (var i = 0; i < hijos.length && out.length < MAX; i++) {
        var h = hijos[i], r = h.getBoundingClientRect();
        if (!seVe(h, r)) { if (r.height > 0 && nivel < 5) cola.push([h, nivel + 1]); continue; }
        if (esPieza(h)) out.push(h);
        else if (nivel < 5) cola.push([h, nivel + 1]);
      }
    }
    return out.sort(function (a, b) {
      var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return (Math.round(ra.top / 40) - Math.round(rb.top / 40)) || (ra.left - rb.left); // de arriba abajo y de izquierda a derecha
    });
  }
  var vuelta = 0;
  function materializar(vista) {
    if (reducir() || !vista) return;
    var lista = piezas(vista), id = String(++vuelta);
    lista.forEach(function (el, i) {
      el.classList.remove('nx-mat-in', 'nx-mat-fin');
      el.style.setProperty('--nx-mat-d', (i * PASO) + 'ms');
      el.dataset.nxMat = id;
    });
    if (lista.length) void vista.offsetWidth;
    lista.forEach(function (el) { el.classList.add('nx-mat-in'); });
    var barras = vista.querySelectorAll('.nxRepBarV');
    Array.prototype.slice.call(barras, 0, 40).forEach(function (b, j) {
      b.style.setProperty('--nx-mat-d', (120 + j * 30) + 'ms'); b.classList.remove('nx-mat-bar'); void b.offsetWidth; b.classList.add('nx-mat-bar');
    });
    setTimeout(function () {
      // La marca se queda (ya terminó y se queda en su estado final): si se quitara, volvería a correr la entrada vieja
      // de la pantalla (p. ej. nxFadeUp) y la pieza se animaría dos veces. Solo se libera la memoria de la tarjeta gráfica.
      lista.forEach(function (el) { if (el.dataset.nxMat === id) el.classList.add('nx-mat-fin'); });
      Array.prototype.forEach.call(barras, function (b) { b.classList.remove('nx-mat-bar'); });
    }, DUR + MAX * PASO + 120);
  }

  // Solo cuando una pantalla se enciende (.view gana «on»), no al abrir la app.
  var listo = false;
  var mo = new MutationObserver(function (cambios) {
    if (!listo) return;
    for (var i = 0; i < cambios.length; i++) {
      var t = cambios[i].target;
      if (t.classList && t.classList.contains('view') && t.classList.contains('on') && !(cambios[i].oldValue || '').split(/\s+/).includes('on')) {
        materializar(t);
        return;
      }
    }
  });
  function arrancar() {
    // Se vigila solo cada pantalla (.view), no todo el documento.
    doc.querySelectorAll('.view').forEach(function (v) { mo.observe(v, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }); });
    setTimeout(function () { listo = true; }, 1500); // la primera pantalla al abrir la app no se anima
  }
  if (doc.body) arrancar(); else doc.addEventListener('DOMContentLoaded', arrancar, { once: true });
  window.nxMaterializar = materializar;
})();
