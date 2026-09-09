/* NEXUS PRO · WhatsApp · Burbuja azul fit final · 2026-09-08
   SOLO ajusta mensajes salientes. No toca ventana, header, composer, scroll,
   Contactos, animaciones funcionales ni backend. */
(function(){
  'use strict';
  if(window.__nxWaBubbleFitFinal20260908)return;
  window.__nxWaBubbleFitFinal20260908=true;

  function mount(){
    if(document.getElementById('nxWaBubbleFitFinalCss'))return;
    var s=document.createElement('style');
    s.id='nxWaBubbleFitFinalCss';
    s.textContent=`
/* Wrapper: conserva el ancho del chat, pero NO estira la burbuja */
#v-waInbox .nxWaBubWrap.out{
  display:flex!important;
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  align-items:flex-start!important;
  justify-content:flex-end!important;
  flex:0 0 auto!important;
}

/* Burbuja azul: tamaño derivado del texto */
#v-waInbox .nxWaBub.out{
  display:inline-block!important;
  width:fit-content!important;
  min-width:0!important;
  min-height:0!important;
  height:auto!important;
  max-width:min(72%,560px)!important;
  flex:0 0 auto!important;
  align-self:flex-end!important;
  box-sizing:border-box!important;
  margin:0!important;
  padding:5px 8px 4px!important;
  border-radius:15px 15px 6px 15px!important;
  background:linear-gradient(145deg,#e8f5ff 0%,#d9efff 55%,#cbe7ff 100%)!important;
  border:1px solid rgba(91,168,240,.22)!important;
  box-shadow:0 6px 16px -14px rgba(45,126,203,.34)!important;
  color:#203751!important;
  font-size:11px!important;
  font-weight:650!important;
  line-height:1.24!important;
  letter-spacing:-.003em!important;
  white-space:pre-wrap!important;
  overflow-wrap:anywhere!important;
  word-break:break-word!important;
  animation:none!important;
  transform:none!important;
  will-change:auto!important;
}
#v-waInbox .nxWaBub.out:after{content:none!important;display:none!important}

/* Hora y checks: mínimos y pegados al contenido */
#v-waInbox .nxWaBub.out .nxWaBubMeta,
#v-waInbox .nxWaBub.out .nxWaMsgMeta{
  display:flex!important;
  align-items:center!important;
  justify-content:flex-end!important;
  width:auto!important;
  min-width:0!important;
  min-height:0!important;
  height:auto!important;
  margin:2px 0 0!important;
  padding:0!important;
  gap:2px!important;
  line-height:1!important;
  font-size:6.8px!important;
  font-weight:700!important;
  color:#617b98!important;
}

/* Controles flotantes no deben contar dentro de la medida de la burbuja */
#v-waInbox .nxWaBub.out .nxWaBubMenu{
  position:absolute!important;
}

/* Adjuntos conservan un ancho práctico independiente del texto */
#v-waInbox .nxWaBub.out:has(img),
#v-waInbox .nxWaBub.out:has(video),
#v-waInbox .nxWaBub.out:has(audio){
  width:auto!important;
  max-width:min(86%,620px)!important;
  padding:6px!important;
}

@media(max-width:760px){
  #v-waInbox .nxWaBub.out{
    width:fit-content!important;
    max-width:74%!important;
    padding:5px 7px 4px!important;
    font-size:10.9px!important;
    font-weight:650!important;
    line-height:1.22!important;
  }
  #v-waInbox .nxWaBub.out .nxWaBubMeta,
  #v-waInbox .nxWaBub.out .nxWaMsgMeta{
    font-size:6.6px!important;
    margin-top:2px!important;
  }
  #v-waInbox .nxWaBub.out:has(img),
  #v-waInbox .nxWaBub.out:has(video),
  #v-waInbox .nxWaBub.out:has(audio){max-width:86%!important}
}

@media(max-width:380px){
  #v-waInbox .nxWaBub.out{max-width:76%!important;font-size:10.7px!important}
}

@media(prefers-reduced-motion:reduce){
  #v-waInbox .nxWaBub.out{animation:none!important;transition:none!important;transform:none!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
