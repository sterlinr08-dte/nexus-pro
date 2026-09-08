/* NEXUS PRO · Seguros loader
   Mantiene el parche histórico intacto y carga después el CRM operativo. */
(function(){
  'use strict';
  if(window.__nxSegurosLoader20260906)return;
  window.__nxSegurosLoader20260906=true;

  function qv(){
    try{
      var s=document.currentScript&&document.currentScript.src||'',q=s.indexOf('?');
      var base=q>=0?s.slice(q):'';
      /* Build de esta publicación: fuerza a Safari/CDN a pedir frescas las capas
         WhatsApp nuevas sin tocar el index.html monolítico solo por una versión. */
      return base?(base+'&b=5820'):'?b=5820';
    }catch(e){return '?b=5820';}
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
  }

  /* Secuencia explícita: evita anidar callbacks y reduce el riesgo de dejar
     paréntesis/bloques sin cerrar al agregar una nueva capa visual. */
  var pasos=[
    ['js','parches-seguros-base.js'],
    ['js','parches-crm-seguros.js'],
    ['css','parches-crm-seguros-v2.css'],
    ['js','parches-crm-entrada.js'],
    ['js','parches-crm-operativo.js'],
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
    ['js','parches-whatsapp-media-historial.js']
  ];

  var i=0;
  function next(){
    if(i>=pasos.length)return;
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