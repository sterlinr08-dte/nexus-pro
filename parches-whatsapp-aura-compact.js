/* NEXUS PRO · WhatsApp · Azul Aura compacto · 2026-09-08
   Ajuste visual aislado: reduce volumen de burbujas salientes sin tocar DOM,
   scroll, mensajes, adjuntos, Contactos ni logica de envio. */
(function(){
  'use strict';
  if(window.__nxWaAuraCompact20260908)return;
  window.__nxWaAuraCompact20260908=true;

  function mount(){
    if(document.getElementById('nxWaAuraCompactCss'))return;
    var s=document.createElement('style');
    s.id='nxWaAuraCompactCss';
    s.textContent=`
/* Azul Aura mas liviano y compacto */
#v-waInbox .nxWaBub.out{
  width:fit-content!important;
  max-width:min(68%,600px)!important;
  padding:6px 9px 5px!important;
  border-radius:16px 16px 6px 16px!important;
  font-size:10.8px!important;
  line-height:1.27!important;
  box-shadow:0 7px 17px -15px rgba(45,126,203,.42),inset 0 1px 0 rgba(255,255,255,.62)!important;
}
#v-waInbox .nxWaBub.out .nxWaMsgMeta{
  margin-top:2px!important;
  min-height:9px!important;
  font-size:6.9px!important;
  gap:2px!important;
}
#v-waInbox .nxWaBub.out .nxWaReplyQuote{
  margin-bottom:5px!important;
  padding:5px 7px!important;
  border-radius:9px!important;
}

/* Multimedia conserva un ancho practico */
#v-waInbox .nxWaBub.out:has(img),
#v-waInbox .nxWaBub.out:has(video),
#v-waInbox .nxWaBub.out:has(audio){
  max-width:min(78%,620px)!important;
}

@media(max-width:760px){
  #v-waInbox .nxWaBub.out{
    max-width:80%!important;
    padding:6px 8px 5px!important;
    border-radius:15px 15px 6px 15px!important;
    font-size:10.7px!important;
    line-height:1.25!important;
  }
  #v-waInbox .nxWaBub.out .nxWaMsgMeta{
    margin-top:2px!important;
    font-size:6.8px!important;
  }
  #v-waInbox .nxWaBub.out:has(img),
  #v-waInbox .nxWaBub.out:has(video),
  #v-waInbox .nxWaBub.out:has(audio){
    max-width:86%!important;
  }
}

@media(max-width:380px){
  #v-waInbox .nxWaBub.out{
    max-width:82%!important;
    font-size:10.5px!important;
    padding:6px 8px 5px!important;
  }
}

@media(prefers-reduced-motion:reduce){
  #v-waInbox .nxWaBub.out{transition:none!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
