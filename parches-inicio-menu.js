/* parches-inicio-menu.js — (06-nov-2026; dueño: «mejoras y ajustes»).
   Buscador global (⌘K) más rápido de usar, sin tocar cómo busca clientes y facturas:
     · Al abrirlo vacío muestra «Ir a…» con las secciones del menú que este usuario ve (los mismos botones del menú:
       se toca uno y abre la sección). Así se llega a Cobros, WhatsApp, Reportes… en 2 toques desde cualquier pantalla.
     · Al escribir, si el texto coincide con una sección («cobr», «whats», «metas»), sale arriba como «Sección».
     · ⌘K funciona también en Mac (antes solo Ctrl+K) y en Windows la pista dice «Ctrl K».
     · Texto de ayuda más corto, para que no se corte en el iPhone.
   El CSS (primer pintado) está en index.html, <style id="nxInicioMenu">.
   CÓMO APAGARLA: localStorage.setItem('nx_inicio_menu_off','1') y recargar. */
(function () {
  'use strict';
  if (window.__nxInicioMenu) return;
  try { if (localStorage.getItem('nx_inicio_menu_off') === '1') return; } catch (e) {}
  window.__nxInicioMenu = true;

  var esMac = /Mac|iPhone|iPad|iPod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '');
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sinAcento = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  /* Solo display: en el celular el menú cerrado esconde sus filas con visibility, y eso no es un permiso. */
  var visible = function (el) { return !!el && getComputedStyle(el).display !== 'none'; };
  var tactil = function () { try { return matchMedia('(hover:none) and (pointer:coarse)').matches; } catch (e) { return false; } };

  /* Secciones del menú que este usuario puede abrir. Los encabezados que solo despliegan (Contabilidad, Configuración)
     no cuentan; sus opciones sí, si el encabezado está visible (así se respetan los permisos por rol). */
  function secciones() {
    var sb = document.getElementById('sbEl'); if (!sb) return [];
    var out = [], vistos = {};
    [].forEach.call(sb.querySelectorAll('.ni'), function (n, i) {
      var oc = n.getAttribute('onclick') || '';
      if (!oc || /toggle(Contab|Config)\(/.test(oc) || !visible(n)) return;
      var grupo = n.parentElement && n.parentElement.closest('#sbContab,#sbConfig,.ni-sub,.sb-sub');
      if (grupo) { var cab = grupo.previousElementSibling; if (cab && cab.classList.contains('ni') && !visible(cab)) return; }
      var l = n.querySelector('.ni-l'); var t = (l ? l.textContent : n.textContent).replace(/\s+/g, ' ').trim();
      if (!t || vistos[t.toLowerCase()]) return; vistos[t.toLowerCase()] = 1;
      if (t === t.toUpperCase() && t.length > 3) t = t.charAt(0) + t.slice(1).toLowerCase(); /* «SOLICITUDES» → «Solicitudes» */
      var ic = n.querySelector('i.ti'); var icon = ic ? [].filter.call(ic.classList, function (c) { return /^ti-/.test(c); })[0] : '';
      out.push({ i: i, t: t, oc: oc, icon: icon || 'ti-arrow-right', on: n.classList.contains('on') });
    });
    return out;
  }
  function ir(i) {
    var n = document.querySelectorAll('#sbEl .ni')[i];
    try { if (typeof cerrarGlobalSearch === 'function') cerrarGlobalSearch(); } catch (e) {}
    if (n) n.click();
  }
  window.nxIMIr = ir;

  function pintarVacio() {
    var res = document.getElementById('gsResults'); if (!res) return;
    /* Primero las que más se usan; después el resto del menú, en su orden. */
    var PRIO = ["'clientes'", "'facturas'", "'waInbox'", "'solicitudes'", "'crm'", "'polizas'", "'custodia'", "'rep-agente'", "'dashboard'"];
    var peso = function (x) { for (var k = 0; k < PRIO.length; k++) if (x.oc.indexOf(PRIO[k]) >= 0) return k; return 100 + x.i; };
    var s = secciones().filter(function (x) { return !x.on; }).sort(function (a, b) { return peso(a) - peso(b); }).slice(0, 8);
    var tecla = esMac ? '⌘K' : 'Ctrl K';
    res.innerHTML = (s.length ? '<div class="nxIM-sec">Ir a…</div><div class="nxIM-go">' + s.map(function (x) {
      return '<button type="button" onclick="nxIMIr(' + x.i + ')"><i class="ti ' + esc(x.icon) + '" aria-hidden="true"></i>' + esc(x.t) + '</button>';
    }).join('') + '</div>' : '') +
      '<div class="nxIM-tip">Escriba un nombre, cédula, póliza o NCF.' + (tactil() ? '' : ' Abre con <kbd>' + tecla + '</kbd> y cierra con <kbd>Esc</kbd>.') + '</div>';
  }

  /* Coincidencias con secciones, arriba de los resultados normales (mismas filas .gs-item: flechas y Enter funcionan). */
  function filasSeccion(q) {
    var k = sinAcento(q).trim(); if (k.length < 2) return '';
    var s = secciones().filter(function (x) { return sinAcento(x.t).split(/[\s/]+/).some(function (p) { return p.indexOf(k) === 0; }) || sinAcento(x.t).indexOf(k) === 0; }).slice(0, 3);
    return s.map(function (x) {
      return '<div class="gs-item nxIM-it" onclick="nxIMIr(' + x.i + ')" tabindex="0" role="button" onkeydown="if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}">' +
        '<div class="gs-item-icon"><i class="ti ' + esc(x.icon) + '" aria-hidden="true"></i></div>' +
        '<div class="gs-item-info"><div class="gs-item-ttl">' + esc(x.t) + '</div><div class="gs-item-sub">Abrir esta sección</div></div>' +
        '<div class="gs-item-type">Sección</div></div>';
    }).join('');
  }

  function instalar() {
    if (typeof window.globalSearch !== 'function' || typeof window.abrirGlobalSearch !== 'function') return false;
    var inp = document.getElementById('gsInput');
    if (inp) inp.placeholder = 'Buscar cliente, factura o sección…';

    var origBuscar = window.globalSearch;
    window.globalSearch = function (q) {
      var r = origBuscar.apply(this, arguments);
      try {
        var res = document.getElementById('gsResults'); if (!res) return r;
        if (!q || !String(q).trim()) { pintarVacio(); return r; }
        var extra = filasSeccion(q);
        if (extra) {
          if (!res.querySelector('.gs-item')) res.innerHTML = extra; /* «No se encontraron…» o «al menos 2…» → solo secciones */
          else res.insertAdjacentHTML('afterbegin', extra);
        }
      } catch (e) {}
      return r;
    };
    var origAbrir = window.abrirGlobalSearch;
    window.abrirGlobalSearch = function () {
      var r = origAbrir.apply(this, arguments);
      try { var i = document.getElementById('gsInput'); if (!i || !i.value.trim()) pintarVacio(); } catch (e) {}
      return r;
    };

    /* Pista de la barra de arriba según el equipo */
    try { [].forEach.call(document.querySelectorAll('.tnav .tn-b-primary kbd'), function (k) { k.textContent = esMac ? '⌘K' : 'Ctrl K'; }); } catch (e) {}

    /* ⌘K en Mac (Ctrl+K ya lo atiende index.html). En el POS manda su propio buscador. */
    document.addEventListener('keydown', function (e) {
      if (!e.metaKey || e.ctrlKey || e.altKey || String(e.key).toLowerCase() !== 'k') return;
      if (document.getElementById('v-pos')) return;
      e.preventDefault(); window.abrirGlobalSearch();
    });
    return true;
  }
  if (!instalar()) {
    var n = 0, t = setInterval(function () { if (instalar() || ++n > 40) clearInterval(t); }, 250);
  }
})();
