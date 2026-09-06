/* NEXUS PRO · Seguros loader
   Mantiene el parche histórico intacto y carga después el CRM visual 2026. */
(function(){
  'use strict';
  if(window.__nxSegurosLoader20260905)return;
  window.__nxSegurosLoader20260905=true;
  function qv(){try{var s=document.currentScript&&document.currentScript.src||'',q=s.indexOf('?');return q>=0?s.slice(q):'';}catch(e){return '';}}
  function load(src,done){var s=document.createElement('script');s.src=src+qv();s.async=false;s.onload=function(){if(done)done();};s.onerror=function(){console.error('[NEXUS PRO] No se pudo cargar '+src);};(document.head||document.documentElement).appendChild(s);}
  function css(src){var l=document.createElement('link');l.rel='stylesheet';l.href=src+qv();l.onerror=function(){console.error('[NEXUS PRO] No se pudo cargar '+src);};(document.head||document.documentElement).appendChild(l);}
  load('parches-seguros-base.js',function(){load('parches-crm-seguros.js',function(){css('parches-crm-seguros-v2.css');});});
})();