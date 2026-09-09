/* NEXUS PRO · WhatsApp · Aura Safari stability fix · 2026-09-08
   Corrige artefactos de capas/solapamiento en iOS Safari sin tocar datos ni logica.
*/
(function(){
  'use strict';
  if(window.__nxWaAuraSafariFix20260908)return;
  window.__nxWaAuraSafariFix20260908=true;

  function mount(){
    if(document.getElementById('nxWaAuraSafariFixCss'))return;
    var s=document.createElement('style');
    s.id='nxWaAuraSafariFixCss';
    s.textContent=`
/* Base estable para cada fila de mensaje */
#v-waInbox .nxWaBubWrap{
  position:relative!important;
  flex:0 0 auto!important;
  min-height:0!important;
  height:auto!important;
  transform:none!important;
}
#v-waInbox .nxWaBubWrap.same-prev{margin-top:1px!important}
#v-waInbox .nxWaBubWrap.diff-prev{margin-top:5px!important}

/* Evita capas GPU fantasma: el brillo Aura anterior se elimina y el gradiente queda directo. */
#v-waInbox .nxWaBub.out:after{
  content:none!important;
  display:none!important;
}
#v-waInbox .nxWaBub{
  animation:none!important;
  transform:none!important;
  will-change:auto!important;
  min-height:0!important;
  height:auto!important;
  box-sizing:border-box!important;
}
#v-waInbox .nxWaBubWrap:last-child .nxWaBub{
  animation:none!important;
  transform:none!important;
}

/* Mantiene el Azul Aura aprobado sin depender de pseudo-capas. */
#v-waInbox .nxWaBub.out{
  overflow:visible!important;
  background:linear-gradient(145deg,#e8f5ff 0%,#d6edff 56%,#c7e5ff 100%)!important;
  border:1px solid rgba(91,168,240,.24)!important;
  box-shadow:0 7px 17px -15px rgba(45,126,203,.38),inset 0 1px 0 rgba(255,255,255,.62)!important;
}

/* Los elementos internos no deben crear nuevas capas de composicion. */
#v-waInbox .nxWaBubMeta,
#v-waInbox .nxWaMsgMeta,
#v-waInbox .nxWaQuote,
#v-waInbox .nxWaBub img,
#v-waInbox .nxWaBub video,
#v-waInbox .nxWaBub audio{
  transform:none!important;
  will-change:auto!important;
}

@media(max-width:760px){
  /* Safari iOS: backdrop-filter + transform en una lista desplazable deja snapshots fantasma. */
  #v-waInbox .nxWaBub.in,
  #v-waInbox .nxWaBub.out{
    -webkit-backdrop-filter:none!important;
    backdrop-filter:none!important;
    animation:none!important;
    transform:none!important;
    will-change:auto!important;
    isolation:auto!important;
  }
  #v-waInbox .nxWaBub.in{
    background:#fff!important;
  }

  /* El menu antiguo de chevron queda oculto en movil; las acciones siguen disponibles por pulsacion larga. */
  #v-waInbox .nxWaBubMenu,
  #v-waInbox .nxWaMsgDrop{
    display:none!important;
  }

  /* Nada de margenes negativos entre mensajes en iPhone. */
  #v-waInbox .nxWaBubWrap.same-prev{margin-top:2px!important}
  #v-waInbox .nxWaBubWrap.diff-prev{margin-top:6px!important}
}

@media(prefers-reduced-motion:reduce){
  #v-waInbox .nxWaBub,#v-waInbox .nxWaBubWrap{animation:none!important;transition:none!important;transform:none!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
