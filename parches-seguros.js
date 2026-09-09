/* NEXUS PRO · Seguros loader
   Carga funcional secuencial + capas visuales profesionales desde el primer instante. */
(function(){
  'use strict';
  if(window.__nxSegurosLoader20260906)return;
  window.__nxSegurosLoader20260906=true;

  function qv(){
    try{
      var s=document.currentScript&&document.currentScript.src||'',q=s.indexOf('?');
      var base=q>=0?s.slice(q):'';
      return base?(base+'&b=5854'):'?b=5854';
    }catch(e){return '?b=5854';}
  }

  function load(src,done){
    var s=document.createElement('script');
    s.src=src+qv();
    s.async=false;
    s.onload=function(){if(done)done();};
    s.onerror=function(){
      console.error('[NEXUS PRO] No se pudo cargar '+src);
      if(done)done();
    };
    (document.head||document.documentElement).appendChild(s);
  }

  function css(src){
    var l=document.createElement('link');
    l.rel='stylesheet';
    l.href=src+qv();
    l.onerror=function(){console.error('[NEXUS PRO] No se pudo cargar '+src);};
    (document.head||document.documentElement).appendChild(l);
    return l;
  }

  /*
   * FIX 2026-09-09 · salto visual / estilos que cambian a los pocos segundos.
   *
   * Antes, estas cuatro capas se pedían al FINAL de una cadena de más de 40 scripts.
   * Resultado: la pantalla pintaba primero con estilos viejos y 2-4 s después cambiaba
   * de tamaño/forma. Algunos módulos además inyectan <style> al abrirse por primera vez,
   * por lo que al cambiar de pestaña podían volver a ganar momentáneamente la cascada.
   *
   * Solución:
   * 1) pedir las cuatro capas profesionales inmediatamente y en paralelo;
   * 2) mantenerlas como una única pila ordenada;
   * 3) si un módulo añade CSS después, mover ESA MISMA pila al final del <head>.
   * Reubicar un <link> ya cargado no vuelve a descargarlo: solo restablece prioridad.
   */
  var visualCss=[
    'parches-ui-profesional-compacta.css',
    'parches-ui-profesional-fase2.css',
    'parches-ui-profesional-fase3.css',
    'parches-ui-profesional-fase4.css'
  ];
  var visualLinks=[];
  var head=document.head||document.documentElement;

  function visualId(src){return 'nxProf_'+src.replace(/[^a-z0-9]+/gi,'_');}
  function cargarVisual(src){
    var id=visualId(src),l=document.getElementById(id);
    if(l)return l;
    l=document.createElement('link');
    l.id=id;
    l.rel='stylesheet';
    l.href=src+qv();
    l.setAttribute('data-nx-prof','1');
    l.onerror=function(){console.error('[NEXUS PRO] No se pudo cargar '+src);};
    head.appendChild(l);
    return l;
  }
  function promoverVisuales(){
    for(var i=0;i<visualLinks.length;i++){
      var l=visualLinks[i];
      if(l&&l.parentNode===head)head.appendChild(l);
    }
  }

  for(var vi=0;vi<visualCss.length;vi++)visualLinks.push(cargarVisual(visualCss[vi]));

  /* Si un módulo lazy agrega CSS al abrir/cambiar de pestaña, las capas profesionales
     vuelven al final de la cascada en el siguiente frame. Esto evita el cambio visual
     posterior sin crear estilos duplicados ni tocar la lógica de los módulos. */
  var promoteQueued=false;
  if(window.MutationObserver&&head){
    new MutationObserver(function(muts){
      var externo=false;
      for(var mi=0;mi<muts.length&&!externo;mi++){
        var ns=muts[mi].addedNodes||[];
        for(var ni=0;ni<ns.length;ni++){
          var n=ns[ni];
          if(!n||n.nodeType!==1||n.getAttribute('data-nx-prof')==='1')continue;
          var tag=(n.tagName||'').toUpperCase();
          if(tag==='STYLE'||(tag==='LINK'&&String(n.rel||'').toLowerCase()==='stylesheet')){externo=true;break;}
        }
      }
      if(!externo||promoteQueued)return;
      promoteQueued=true;
      requestAnimationFrame(function(){promoteQueued=false;promoverVisuales();});
    }).observe(head,{childList:true});
  }

  /* Secuencia funcional: se mantiene el orden histórico de JS y CSS propios de cada módulo.
     Las cuatro capas profesionales ya NO esperan aquí; se cargaron arriba inmediatamente. */
  var pasos=[
    ['js','parches-seguros-base.js'],
    ['js','parches-crm-seguros.js'],
    ['css','parches-crm-seguros-v2.css'],
    ['js','parches-crm-entrada.js'],
    ['js','parches-crm-operativo.js'],
    ['js','parches-cumpleanos-clientes.js'],
    ['js','parches-whatsapp-inbox.js'],
    ['js','parches-whatsapp-visual.js'],
    ['css','parches-whatsapp-visual-v2.css'],
    ['js','parches-whatsapp-visual-v3.js'],
    ['js','parches-whatsapp-visual-v4.js'],
    ['js','parches-whatsapp-visual-v5.js'],
    ['js','parches-whatsapp-visual-v6.js'],
    ['js','parches-whatsapp-visual-v7.js'],
    ['js','parches-whatsapp-contactos-uhd.js'],
    ['js','parches-whatsapp-contactos-fix.js'],
    ['js','parches-whatsapp-inbox-uhd.js'],
    ['js','parches-whatsapp-animaciones.js'],
    ['js','parches-whatsapp-iconos-flat.js'],
    ['js','parches-whatsapp-chat-acciones.js'],
    ['js','parches-whatsapp-chat-final.js'],
    ['js','parches-whatsapp-voz-mensajes.js'],
    ['js','parches-whatsapp-media-historial.js'],
    ['js','parches-whatsapp-scroll-estable.js'],
    ['js','parches-whatsapp-menu-flotante.js'],
    ['js','parches-whatsapp-aura.js'],
    ['js','parches-whatsapp-aura-compact.js'],
    ['js','parches-whatsapp-aura-size-fix.js'],
    ['js','parches-whatsapp-aura-safari-fix.js'],
    ['js','parches-whatsapp-burbuja-fit-final.js'],
    ['js','parches-whatsapp-replica-referencia.js'],
    ['js','parches-whatsapp-composer-minimal-final.js'],
    ['js','parches-whatsapp-ventana-redonda-final.js'],
    ['js','parches-whatsapp-marco-redondo-definitivo.js'],
    ['js','parches-whatsapp-send-flight.js'],
    ['js','parches-whatsapp-enrutamiento-nexus.js'],
    ['js','parches-whatsapp-plantillas-facil.js'],
    ['js','parches-whatsapp-automatizaciones.js'],
    ['js','parches-whatsapp-reglas-inteligentes.js'],
    ['js','parches-whatsapp-automatizaciones-acceso-mobile.js'],
    ['js','parches-whatsapp-pagos-validacion-v2.js'],
    ['js','parches-solicitudes-pagos-validacion.js'],
    ['js','parches-whatsapp-cobranza-notificar.js'],
    ['js','parches-whatsapp-admin-delete.js']
  ];

  var i=0;
  function next(){
    if(i>=pasos.length){promoverVisuales();return;}
    var p=pasos[i++];
    if(p[0]==='css'){
      css(p[1]);
      next();
      return;
    }
    load(p[1],next);
  }

  next();
})();
