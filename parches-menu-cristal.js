/* NEXUS PRO · Menú lateral de cristal (30-sep-2026) — lo que el CSS (style#nxMenuCristal) no puede:
   · botón redondo del canto (chevron) que expande/contrae el riel de escritorio (aria-expanded, Esc contrae) y que en el
     celular cierra el cajón ☰;
   · píldora de búsqueda dentro del menú que abre la MISMA búsqueda global (abrirGlobalSearch, ⌘K), sin otro buscador;
   · glifo de salida en la tarjeta de usuario (el toque sigue siendo cerrar sesión, como siempre);
   · estado expandido/contraído en localStorage 'nx_menu_cristal' (script#nxMenuCristalOn lo aplica antes del primer pintado);
   · en el celular, deslizar el cajón hacia la izquierda lo sigue 1:1 y lo cierra.
   Solo actúa con html.tema-glass-oscuro; sin dependencias; no toca navegación, acordeones ni datos. */
(function () {
  'use strict';
  if (window.__nxMenuCristal) return;
  window.__nxMenuCristal = true;
  var KEY = 'nx_menu_cristal', html = document.documentElement;
  function glass() { return html.classList.contains('tema-glass-oscuro'); }
  function movil() { return window.innerWidth <= 768; }
  function abierto() { return html.classList.contains('nx-mc-open'); }

  function iniciar() {
    var sb = document.getElementById('sbEl'), navEl = document.getElementById('sbNav');
    if (!sb || !navEl || sb.querySelector('.nx-mc-tg')) return;

    // Chevron del canto (+ píldora «Contraer» cuando está expandido).
    var tg = document.createElement('button');
    tg.type = 'button'; tg.className = 'nx-mc-tg';
    tg.innerHTML = '<span class="nx-mc-c"><i class="ti ti-chevron-right" aria-hidden="true"></i></span><span class="nx-mc-p" aria-hidden="true">Contraer</span>';
    sb.appendChild(tg);

    // Buscador: lupa en la columna de íconos, píldora al expandir. Misma búsqueda global que la barra (⌘K).
    var bs = document.createElement('button');
    bs.type = 'button'; bs.className = 'nx-mc-search'; bs.setAttribute('aria-label', 'Buscar cliente, póliza o cédula');
    bs.innerHTML = '<span class="nx-mc-si"><i class="ti ti-search" aria-hidden="true"></i></span><span class="nx-mc-st">Buscar…</span>';
    var primerSS = navEl.querySelector('.ss');
    navEl.insertBefore(bs, primerSS || navEl.firstChild);
    bs.addEventListener('click', function () {
      if (movil() && typeof window.closeMobSB === 'function') window.closeMobSB();
      if (typeof window.abrirGlobalSearch === 'function') window.abrirGlobalSearch();
    });

    // Glifo de salida en la tarjeta de usuario (solo se ve con el menú expandido).
    var u = sb.querySelector('.sb-u');
    if (u && !u.querySelector('.nx-mc-out')) {
      var o = document.createElement('i'); o.className = 'ti ti-logout nx-mc-out'; o.setAttribute('aria-hidden', 'true'); u.appendChild(o);
    }

    function aria() {
      var m = movil(), v = !m && abierto();
      tg.setAttribute('aria-expanded', m ? 'true' : (v ? 'true' : 'false'));
      tg.setAttribute('aria-label', m ? 'Cerrar el menú' : (v ? 'Contraer el menú' : 'Expandir el menú'));
      var mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
      tg.title = m ? 'Cerrar el menú' : ((v ? 'Contraer el menú' : 'Abrir el menú') + (mac ? ' (⌘B)' : ' (Ctrl+B)'));
    }
    function poner(v) {
      html.classList.toggle('nx-mc-open', !!v);
      try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {}
      aria();
      // La barra activa (indicador de resorte) mide su fila al instante; el ancho lo lleva el CSS (left/right 0).
      if (typeof window.nxSidebarSpringSync === 'function') window.nxSidebarSpringSync(true);
    }
    function alternar() {
      if (movil()) { if (typeof window.closeMobSB === 'function') window.closeMobSB(); return; }
      poner(!abierto());
    }
    tg.addEventListener('click', function () { quitarPista(); alternar(); });
    // 59.01: pista — el botón late las primeras veces (hasta que se usa una vez); Ctrl/⌘+B abre y cierra.
    var PISTA = 'nx_menu_cristal_visto';
    function quitarPista() { tg.classList.remove('nx-mc-hint'); try { localStorage.setItem(PISTA, '1'); } catch (e) {} }
    try { if (!localStorage.getItem(PISTA) && !abierto()) tg.classList.add('nx-mc-hint'); } catch (e) {}
    document.addEventListener('keydown', function (ev) {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey || String(ev.key).toLowerCase() !== 'b' || !glass() || movil()) return;
      var a = document.activeElement; if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
      ev.preventDefault(); quitarPista(); alternar();
    });
    aria();
    window.addEventListener('resize', aria);

    // El escudo del riel llamaba a toggleSB() (alterna .col, sin efecto visible en este tema): ahora expande/contrae.
    var orig = window.toggleSB;
    if (typeof orig === 'function') {
      window.toggleSB = function () {
        if (glass() && !movil()) { alternar(); return; }
        return orig.apply(this, arguments);
      };
    }

    // Esc contrae (si no hay ventana/búsqueda abierta ni panel flotante que ya la use).
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape' || !glass() || movil() || !abierto()) return;
      if (document.querySelector('.overlay.open,.gs-overlay.show,.mbbOv,.nbfOv')) return;
      try { if (window._contabAbierto || window._configAbierto) return; } catch (e) {}
      poner(false);
    });

    // Celular: deslizar el cajón hacia la izquierda lo sigue 1:1 y lo cierra (por distancia o por velocidad).
    var sx = null, sy = null, dx = 0, t0 = 0, arr = false;
    function limpiar() { sb.style.removeProperty('transform'); sb.style.removeProperty('transition'); }
    sb.addEventListener('touchstart', function (ev) {
      if (!glass() || !movil() || !sb.classList.contains('mob-open') || ev.touches.length !== 1) { sx = null; return; }
      var t = ev.touches[0]; sx = t.clientX; sy = t.clientY; dx = 0; t0 = Date.now(); arr = false;
    }, { passive: true });
    sb.addEventListener('touchmove', function (ev) {
      if (sx === null) return;
      var t = ev.touches[0], mx = t.clientX - sx, my = t.clientY - sy;
      if (!arr) {
        if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { sx = null; return; } // desplazamiento vertical de la lista
        if (mx > -10) return;
        arr = true;
      }
      dx = Math.min(0, mx);
      sb.style.setProperty('transition', 'none', 'important');
      sb.style.setProperty('transform', 'translateX(' + dx + 'px)', 'important');
    }, { passive: true });
    function soltar() {
      if (sx === null) return;
      var v = dx / Math.max(1, Date.now() - t0); // px/ms
      if (arr && (dx < -sb.offsetWidth / 3 || v < -0.5)) {
        if (typeof window.closeMobSB === 'function') window.closeMobSB();
        requestAnimationFrame(function () { requestAnimationFrame(limpiar); }); // sale desde donde quedó el dedo
      } else { limpiar(); }
      sx = null; arr = false;
    }
    sb.addEventListener('touchend', soltar, { passive: true });
    sb.addEventListener('touchcancel', soltar, { passive: true });
  }

  if (document.getElementById('sbEl')) iniciar();
  else document.addEventListener('DOMContentLoaded', iniciar, { once: true });
})();
