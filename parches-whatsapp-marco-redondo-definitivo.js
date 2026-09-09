/* NEXUS PRO · WhatsApp · marco redondo definitivo · 2026-09-08
   Corrige el rectángulo residual del chat móvil: el root y el shell ya no pintan
   una caja detrás del detalle. Mantiene ancho/alto, lógica, scroll y backend.
   También elimina botones +/cámara duplicados del composer. */
(function(){
  'use strict';
  if(window.__nxWaMarcoRedondoDefinitivo20260908)return;
  window.__nxWaMarcoRedondoDefinitivo20260908=true;

  function mountCss(){
    if(document.getElementById('nxWaMarcoRedondoDefinitivoCss'))return;
    var s=document.createElement('style');
    s.id='nxWaMarcoRedondoDefinitivoCss';
    s.textContent=`
/* Desktop: el detalle sigue siendo una tarjeta, sin alterar el master-detail. */
#v-waInbox .nxWaDetailCol,
#v-waInbox .nxWaDetalle{
  border-radius:34px!important;
}
#v-waInbox .nxWaDetailCol{
  overflow:hidden!important;
}
#v-waInbox .nxWaDetalle{
  overflow:hidden!important;
  background:transparent!important;
}

/* El composer final es una píldora; nunca una caja. */
#v-waInbox .nxWaComposerWrap,
#v-waInbox .nxWaComposer,
#v-waInbox .nxWaRefTextPill{
  border-radius:999px!important;
}
#v-waInbox .nxWaRefPlus,
#v-waInbox .nxWaRefCamera,
#v-waInbox .nxWaRefClosedPlus,
#v-waInbox .nxWaComposer button:has(.ti-plus),
#v-waInbox .nxWaComposer button:has(.ti-camera){
  display:none!important;
}

@media(max-width:760px){
  /* CLAVE: quitar la caja rectangular que se veía detrás del chat redondo. */
  #v-waInbox.nxWaChatOpen{
    background:transparent!important;
    background-image:none!important;
  }
  #v-waInbox.nxWaChatOpen .nxWaShell{
    width:100%!important;
    max-width:none!important;
    gap:0!important;
    border-radius:32px!important;
    overflow:hidden!important;
    isolation:isolate!important;
    background:rgba(243,247,255,.86)!important;
    border:1px solid rgba(255,255,255,.92)!important;
    box-shadow:0 20px 48px -34px rgba(42,73,125,.34)!important;
  }
  #v-waInbox.nxWaChatOpen .nxWaDetailCol{
    width:100%!important;
    max-width:none!important;
    height:100%!important;
    min-height:0!important;
    margin:0!important;
    border:0!important;
    border-radius:32px!important;
    overflow:hidden!important;
    background:linear-gradient(180deg,rgba(246,249,255,.96),rgba(237,244,252,.96))!important;
    box-shadow:none!important;
  }
  #v-waInbox.nxWaChatOpen .nxWaDetalle{
    width:100%!important;
    height:100%!important;
    min-height:0!important;
    border-radius:32px!important;
    overflow:hidden!important;
    background:transparent!important;
  }

  /* Cabecera y pie viven dentro de la misma tarjeta, sin crear marcos cuadrados. */
  #v-waInbox.nxWaChatOpen .nxWaHead{
    border-radius:25px!important;
  }
  #v-waInbox.nxWaChatOpen .nxWaMsgs{
    border-radius:0!important;
    overflow-x:hidden!important;
  }
  #v-waInbox.nxWaChatOpen .nxWaComposerWrap{
    margin:7px 8px max(8px,env(safe-area-inset-bottom))!important;
    border-radius:999px!important;
    overflow:visible!important;
  }
  #v-waInbox.nxWaChatOpen .nxWaCerrada{
    border-radius:22px!important;
    overflow:hidden!important;
  }
}

@media(max-width:380px){
  #v-waInbox.nxWaChatOpen .nxWaShell,
  #v-waInbox.nxWaChatOpen .nxWaDetailCol,
  #v-waInbox.nxWaChatOpen .nxWaDetalle{
    border-radius:28px!important;
  }
}

body.tema-premium #v-waInbox.nxWaChatOpen .nxWaShell,
body.tema-premium #v-waInbox.nxWaChatOpen .nxWaDetailCol{
  background:#111a2b!important;
  border-color:rgba(255,255,255,.08)!important;
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  function cleanComposer(){
    var root=document.getElementById('v-waInbox');
    if(!root)return;
    var selectors='.nxWaRefPlus,.nxWaRefCamera,.nxWaRefClosedPlus';
    root.querySelectorAll(selectors).forEach(function(el){
      try{el.remove();}catch(e){el.style.display='none';}
    });
    root.querySelectorAll('.nxWaComposer button').forEach(function(btn){
      try{
        if(btn.querySelector('.ti-plus')||btn.querySelector('.ti-camera'))btn.remove();
      }catch(e){}
    });
  }

  function boot(){
    mountCss();
    cleanComposer();
    var root=document.getElementById('v-waInbox');
    if(!root)return;
    var queued=false;
    var obs=new MutationObserver(function(){
      if(queued)return;
      queued=true;
      requestAnimationFrame(function(){queued=false;cleanComposer();});
    });
    obs.observe(root,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
