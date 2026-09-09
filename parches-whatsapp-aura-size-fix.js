/* NEXUS PRO · WhatsApp · Azul Aura size fix · 2026-09-08
   Corrige el crecimiento artificial de las burbujas causado por controles internos
   que quedaron dentro del flujo normal. Visual-only: no toca mensajes ni lógica. */
(function(){
  'use strict';
  if(window.__nxWaAuraSizeFix20260908)return;
  window.__nxWaAuraSizeFix20260908=true;

  function mount(){
    if(document.getElementById('nxWaAuraSizeFixCss'))return;
    var s=document.createElement('style');
    s.id='nxWaAuraSizeFixCss';
    s.textContent=`
/* El wrapper nunca debe estirar la burbuja */
#v-waInbox .nxWaBubWrap{
  min-height:0!important;
  height:auto!important;
  align-items:flex-start!important;
}
#v-waInbox .nxWaBubWrap.out{justify-content:flex-end!important}
#v-waInbox .nxWaBubWrap.in{justify-content:flex-start!important}

/* La burbuja mide exclusivamente su contenido */
#v-waInbox .nxWaBub{
  display:inline-block!important;
  width:auto!important;
  min-width:0!important;
  min-height:0!important;
  height:auto!important;
  flex:0 0 auto!important;
  align-self:auto!important;
  box-sizing:border-box!important;
}

/* Revierte la regla amplia de Aura que metía controles absolutos en el flujo */
#v-waInbox .nxWaBub.out>*{
  position:static!important;
  z-index:auto!important;
}

/* Los controles de mensaje vuelven a ser flotantes: NO ocupan altura */
#v-waInbox .nxWaBub .nxWaBubMenu{
  position:absolute!important;
  z-index:4!important;
  top:-8px!important;
  right:6px!important;
  width:24px!important;
  height:24px!important;
  min-width:24px!important;
  min-height:24px!important;
  margin:0!important;
}
#v-waInbox .nxWaBubWrap.in .nxWaBubMenu{
  right:auto!important;
  left:6px!important;
}
#v-waInbox .nxWaBubWrap.out .nxWaBubMenu{
  left:auto!important;
  right:6px!important;
}

/* Meta de hora/estado compacta y sin altura mínima heredada */
#v-waInbox .nxWaBubMeta,
#v-waInbox .nxWaMsgMeta{
  min-height:0!important;
  height:auto!important;
  margin-top:2px!important;
  line-height:1!important;
}

/* Azul Aura compacto real */
#v-waInbox .nxWaBub.out{
  max-width:min(66%,560px)!important;
  padding:6px 8px 5px!important;
  border-radius:15px 15px 6px 15px!important;
  font-size:10.6px!important;
  line-height:1.24!important;
}
#v-waInbox .nxWaBub.in{
  max-width:min(66%,560px)!important;
  padding:6px 8px 5px!important;
  border-radius:15px 15px 15px 6px!important;
  font-size:10.6px!important;
  line-height:1.24!important;
}

/* Mensajes muy cortos permanecen realmente pequeños */
#v-waInbox .nxWaBub.out:not(:has(img)):not(:has(video)):not(:has(audio)),
#v-waInbox .nxWaBub.in:not(:has(img)):not(:has(video)):not(:has(audio)){
  width:fit-content!important;
}

/* Multimedia necesita un poco más de ancho, pero nunca altura artificial */
#v-waInbox .nxWaBub:has(img),
#v-waInbox .nxWaBub:has(video),
#v-waInbox .nxWaBub:has(audio){
  max-width:min(82%,620px)!important;
  height:auto!important;
}

@media(max-width:760px){
  #v-waInbox .nxWaMsgs{gap:4px!important}
  #v-waInbox .nxWaBub.out,
  #v-waInbox .nxWaBub.in{
    max-width:76%!important;
    padding:6px 8px 5px!important;
    font-size:10.5px!important;
    line-height:1.23!important;
  }
  #v-waInbox .nxWaBub:has(img),
  #v-waInbox .nxWaBub:has(video),
  #v-waInbox .nxWaBub:has(audio){
    max-width:86%!important;
  }
  #v-waInbox .nxWaBubMeta,
  #v-waInbox .nxWaMsgMeta{
    font-size:6.6px!important;
    margin-top:2px!important;
  }
}

@media(max-width:380px){
  #v-waInbox .nxWaBub.out,
  #v-waInbox .nxWaBub.in{max-width:79%!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
