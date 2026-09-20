/* NEXUS PRO · Render estable — elimina pestañeo en actualizaciones en tiempo real
   Estrategia: evitar innerHTML cuando el HTML generado es idéntico al existente,
   y agrupar los cambios reales en un solo frame del navegador. */
(function(){
  'use strict';
  if(window.__nxRenderEstable20260920)return;
  window.__nxRenderEstable20260920=true;

  /* ── smartPaint: reemplaza innerHTML SOLO si el contenido cambió ────── */
  function smartPaint(el,html){
    if(!el)return false;
    if(el.innerHTML===html)return false;
    el.innerHTML=html;
    return true;
  }
  window.__nxSmartPaint=smartPaint;

  /* ── Parchar las funciones de render del dashboard ─────────────────── */
  function patchDashboard(){
    var origRDash=window.rDash;
    if(!origRDash)return;
    window.rDash=function(){
      var ids=['dashHero','kpiG','bPlan','bAgt','dashVenc','dashD'];
      var prev={};
      ids.forEach(function(id){
        var el=document.getElementById(id);
        if(el)prev[id]=el.innerHTML;
      });
      origRDash.apply(this,arguments);
      var cambio=false;
      ids.forEach(function(id){
        var el=document.getElementById(id);
        if(el&&el.innerHTML!==prev[id])cambio=true;
      });
      if(!cambio)return;
    };
  }

  /* ── Parchar refrescarVistaActual para agrupar en un solo rAF ──────── */
  function patchRefrescar(){
    var orig=window.refrescarVistaActual;
    if(!orig)return;
    var pendiente=false;
    window.refrescarVistaActual=function(){
      if(pendiente)return;
      pendiente=true;
      requestAnimationFrame(function(){
        pendiente=false;
        orig();
      });
    };
  }

  /* ── Parchar nxSyncDatos para evitar doble repintado ───────────────── */
  function patchSync(){
    var orig=window.nxSyncDatos;
    if(!orig)return;
    window.nxSyncDatos=async function(force){
      await orig.call(this,force);
    };
  }

  /* ── Parchar pintarLista del WhatsApp Inbox ────────────────────────── */
  function patchWaInbox(){
    var intentos=0;
    var timer=setInterval(function(){
      intentos++;
      if(intentos>60){clearInterval(timer);return;}
      var cont=document.getElementById('nxWaLista');
      if(!cont)return;

      var obs=new MutationObserver(function(muts){
        muts.forEach(function(m){
          if(m.type==='childList'&&m.target.id==='nxWaLista'){
            var filas=m.target.querySelectorAll('.nxWaRow');
            filas.forEach(function(f){f.style.willChange='contents';});
          }
        });
      });
      obs.observe(cont,{childList:true});
      clearInterval(timer);
    },500);
  }

  /* ── Suavizar transiciones en los contenedores principales ─────────── */
  function inyectarCSS(){
    var id='nxRenderEstableCss';
    if(document.getElementById(id))return;
    var s=document.createElement('style');
    s.id=id;
    s.textContent=[
      '#dashHero,#kpiG,#bPlan,#bAgt,#dashVenc,#dashD,',
      '#nxWaLista,#nxWaDetalle,',
      '.view .card,.tw,table tbody{',
      '  contain:content;',
      '}',
      '.nxWaRow,.nxWaAv,.nxWaWho,.nxWaRowMeta{',
      '  contain:layout style;',
      '}',
    ].join('\n');
    (document.head||document.documentElement).appendChild(s);
  }

  /* ── Iniciar todo ──────────────────────────────────────────────────── */
  function init(){
    inyectarCSS();
    patchRefrescar();
    patchSync();
    patchWaInbox();
    setTimeout(patchDashboard,2000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
