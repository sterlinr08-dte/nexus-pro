/* Pulido global (06-nov-2026): pulido general de interfaz fuera de Inicio, Clientes, Facturas/Cobros y WhatsApp.
   Solo aspecto y tacto; no toca datos, dinero, la base ni ningún envío.

   1. Reporte de agentes › Ciclo 20→20 (celular): el elegidor del ciclo se cortaba en «20 oct».
      Ahora ocupa su propio renglón y se lee completo; Ciclo/Consolidado y Excel van debajo.
   2. Comisiones (celular): la fila Mes · Año · Calcular · Excel se salía de la tarjeta y
      «Excel» quedaba fuera de la pantalla. Ahora baja de renglón.
   3. Campos al tamaño de la regla (48 px de alto; 16 px de letra en el celular para que el iPhone
      no haga zoom; nunca menos de 13 px): ciclo de Custodia (tenía 14 px → zoom en iPhone),
      filtro de Pólizas (11,5 px en PC) y buscadores de Empresas y Agentes (44 px).
   4. Configuración: las pestañas que no caben se cortaban sin aviso («Aparienci…»). Ahora el borde
      se desvanece del lado donde hay más pestañas y en PC la rueda del ratón las desplaza.

   Apagar en un equipo: localStorage.nx_pulido_global_off='1'. Para todos: borrar su línea en parches-seguros.js. */
(function () {
  'use strict';
  try { if (localStorage.getItem('nx_pulido_global_off') === '1') return; } catch (e) {}
  if (window.__nxPulidoGlobal) return;
  window.__nxPulidoGlobal = true;
  document.documentElement.classList.add('nx-pulido');

  /* Las capas anteriores usan #v-x repetido 4 veces con !important; aquí 5 veces para ganar sin pelear más. */
  var RA = '#v-rep-agente#v-rep-agente#v-rep-agente#v-rep-agente#v-rep-agente';
  var CU = '#v-custodia#v-custodia#v-custodia#v-custodia#v-custodia';
  var CO = '#v-comisiones#v-comisiones#v-comisiones#v-comisiones#v-comisiones';
  var PO = '#v-polizas#v-polizas#v-polizas#v-polizas#v-polizas';
  var CF = '#v-config#v-config#v-config#v-config#v-config';

  var CSS = ''
    /* 1. Ciclo 20→20 en el celular */
    + '@media(max-width:720px){'
    + 'html.nx-pulido ' + RA + ' #nxCiclo20 .nxC20Top{flex-wrap:wrap!important}'
    + 'html.nx-pulido ' + RA + ' #nxCiclo20 .nxC20Sel{flex:1 1 100%!important;width:100%!important;max-width:none!important;min-width:0!important;min-height:48px!important;font-size:16px!important}'
    + 'html.nx-pulido ' + RA + ' #nxCiclo20 .nxC20Tabs{flex:1 1 auto!important}'
    + '}'
    /* 2. Comisiones en el celular */
    + '@media(max-width:720px){'
    + 'html.nx-pulido ' + CO + ' .ch>div:last-child{flex-wrap:wrap!important;max-width:100%!important;min-width:0!important;width:100%}'
    + 'html.nx-pulido ' + CO + ' .ch>div:last-child>.btn{flex:1 1 auto!important;justify-content:center}'
    + '}'
    /* 3. Campos: 48 px y letra legible */
    + 'html.nx-pulido ' + CU + ' select#cusPer{height:48px!important;min-height:48px!important}'
    + 'html.nx-pulido ' + PO + ' select#polEst{min-height:48px!important;font-size:13px!important}'
    + 'html.nx-pulido :is(#nxBus_emp,#nxBus_agt){height:48px!important;min-height:48px!important;font-size:16px!important}'
    + '@media(max-width:768px){'
    + 'html.nx-pulido ' + CU + ' select#cusPer,html.nx-pulido ' + PO + ' select#polEst{font-size:16px!important}'
    + '}'
    /* 4. Pestañas de Configuración: borde que se desvanece donde hay más */
    + 'html.nx-pulido ' + CF + ' .cfg-tabs-bar.nxPgDer{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 48px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 48px),transparent)}'
    + 'html.nx-pulido ' + CF + ' .cfg-tabs-bar.nxPgIzq{-webkit-mask-image:linear-gradient(90deg,transparent,#000 48px);mask-image:linear-gradient(90deg,transparent,#000 48px)}'
    + 'html.nx-pulido ' + CF + ' .cfg-tabs-bar.nxPgIzq.nxPgDer{-webkit-mask-image:linear-gradient(90deg,transparent,#000 48px,#000 calc(100% - 48px),transparent);mask-image:linear-gradient(90deg,transparent,#000 48px,#000 calc(100% - 48px),transparent)}';

  function ponerCSS() {
    if (document.getElementById('nxPulidoGlobalCSS')) return;
    var st = document.createElement('style');
    st.id = 'nxPulidoGlobalCSS';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* Pestañas de Configuración: marca los lados con más pestañas y deja usar la rueda en PC. */
  function marcar(bar) {
    var max = bar.scrollWidth - bar.clientWidth;
    bar.classList.toggle('nxPgIzq', max > 2 && bar.scrollLeft > 2);
    bar.classList.toggle('nxPgDer', max > 2 && bar.scrollLeft < max - 2);
  }
  function prepararPestanas() {
    var bar = document.querySelector('#v-config .cfg-tabs-bar');
    if (!bar || bar.__nxPg) return !!bar;
    bar.__nxPg = true;
    var pend = false;
    var luego = function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; marcar(bar); }); };
    bar.addEventListener('scroll', luego, { passive: true });
    window.addEventListener('resize', luego, { passive: true });
    bar.addEventListener('wheel', function (e) {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return; // el trackpad ya desplaza de lado
      var max = bar.scrollWidth - bar.clientWidth;
      if (max <= 2) return;
      var antes = bar.scrollLeft;
      bar.scrollLeft = Math.max(0, Math.min(max, antes + e.deltaY));
      if (bar.scrollLeft !== antes) e.preventDefault(); // en los extremos la página sigue bajando
    }, { passive: false });
    try { if (window.ResizeObserver) new ResizeObserver(luego).observe(bar); } catch (e) {}
    luego();
    return true;
  }

  ponerCSS();
  var n = 0;
  (function intentar() {
    if (prepararPestanas()) {
      var bar = document.querySelector('#v-config .cfg-tabs-bar');
      /* La barra mide 0 mientras Configuración está oculta: se vuelve a medir al abrirla
         (cambiar de pestaña ya mueve la barra y dispara «scroll»). */
      try { new MutationObserver(function () { marcar(bar); }).observe(document.getElementById('v-config'), { attributes: true, attributeFilter: ['class'] }); } catch (e) {}
      return;
    }
    if (++n < 80) setTimeout(intentar, 250);
  })();
})();
