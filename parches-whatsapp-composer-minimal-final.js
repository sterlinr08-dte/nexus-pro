/* NEXUS PRO · WhatsApp · composer mínimo final · 2026-09-08
   Elimina acciones duplicadas del composer y deja Emoji + Adjuntar + Mic/Enviar.
   Cámara, galería, documento, contacto y ubicación siguen dentro de Adjuntar.
   Visual-only/DOM-safe: no toca envío, voz, scroll, Contactos ni backend. */
(function(){
  'use strict';
  if(window.__nxWaComposerMinimalFinal20260908)return;
  window.__nxWaComposerMinimalFinal20260908=true;

  function css(){
    if(document.getElementById('nxWaComposerMinimalFinalCss'))return;
    var s=document.createElement('style');
    s.id='nxWaComposerMinimalFinalCss';
    s.textContent=`
/* Acciones repetidas de la réplica: fuera. */
#v-waInbox .nxWaRefPlus,
#v-waInbox .nxWaRefCamera,
#v-waInbox .nxWaRefClosedPlus{
  display:none!important;
}

/* La ventana del compositor pasa de caja a píldora glass. */
#v-waInbox .nxWaComposerWrap{
  box-sizing:border-box!important;
  margin:8px 10px max(9px,env(safe-area-inset-bottom))!important;
  padding:6px 7px!important;
  border:1px solid rgba(255,255,255,.88)!important;
  border-radius:34px!important;
  background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(236,243,255,.74))!important;
  box-shadow:0 15px 34px -25px rgba(45,70,116,.38),inset 0 1px 0 rgba(255,255,255,.92)!important;
  backdrop-filter:blur(22px) saturate(120%)!important;
  -webkit-backdrop-filter:blur(22px) saturate(120%)!important;
  overflow:visible!important;
}
#v-waInbox .nxWaComposer{
  min-height:52px!important;
  margin:0!important;
  padding:0!important;
  gap:6px!important;
  border:0!important;
  border-radius:999px!important;
  background:transparent!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaRefTextPill{
  min-height:48px!important;
  padding:3px 5px 3px 12px!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.78)!important;
  border:1px solid rgba(255,255,255,.94)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.94),0 9px 22px -21px rgba(40,65,108,.35)!important;
}
#v-waInbox .nxWaRefTextPill #nxWaTexto{
  min-height:38px!important;
  padding:8px 4px!important;
}

/* Solo dos acciones inline: emoji y clip. */
#v-waInbox .nxWaRefEmoji,
#v-waInbox .nxWaRefTextPill .nxWaIconBtn{
  width:38px!important;
  height:38px!important;
  flex:0 0 38px!important;
  border-radius:50%!important;
  background:transparent!important;
  color:#263854!important;
  border:0!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaRefEmoji{color:#128d60!important}
#v-waInbox .nxWaRefTextPill .nxWaIconBtn{color:#176fd1!important}

/* Micrófono cuando está vacío; Enviar ocupa el mismo lugar cuando hay texto. */
#v-waInbox .nxWaVoiceBtn,
#v-waInbox #nxWaSendBtn,
#v-waInbox .nxWaTextSendBtn{
  width:48px!important;
  height:48px!important;
  flex:0 0 48px!important;
  border-radius:50%!important;
  margin:0!important;
}
#v-waInbox .nxWaVoiceBtn{
  background:linear-gradient(145deg,#18c77a,#0eaa65)!important;
  color:#fff!important;
  border:1px solid rgba(255,255,255,.38)!important;
  box-shadow:0 10px 22px -16px rgba(16,185,129,.62)!important;
}
#v-waInbox #nxWaSendBtn,
#v-waInbox .nxWaTextSendBtn{
  background:linear-gradient(145deg,#2c8df1,#1768d7)!important;
  color:#fff!important;
  border:1px solid rgba(255,255,255,.34)!important;
  box-shadow:0 10px 22px -16px rgba(37,99,235,.56)!important;
}

/* El aviso 24h queda separado y no convierte la píldora en rectángulo. */
#v-waInbox .nxWaCerrada{
  border-radius:22px!important;
}

@media(max-width:760px){
  #v-waInbox .nxWaComposerWrap{
    margin:7px 8px max(8px,env(safe-area-inset-bottom))!important;
    padding:5px 6px!important;
    border-radius:31px!important;
  }
  #v-waInbox .nxWaComposer{min-height:50px!important;gap:4px!important}
  #v-waInbox .nxWaRefTextPill{min-height:46px!important;padding-left:10px!important}
  #v-waInbox .nxWaRefEmoji,
  #v-waInbox .nxWaRefTextPill .nxWaIconBtn{width:35px!important;height:35px!important;flex-basis:35px!important;font-size:18px!important}
  #v-waInbox .nxWaVoiceBtn,
  #v-waInbox #nxWaSendBtn,
  #v-waInbox .nxWaTextSendBtn{width:46px!important;height:46px!important;flex-basis:46px!important}
}

body.tema-premium #v-waInbox .nxWaComposerWrap{
  background:linear-gradient(145deg,rgba(25,38,58,.90),rgba(18,29,47,.86))!important;
  border-color:rgba(255,255,255,.10)!important;
}
body.tema-premium #v-waInbox .nxWaRefTextPill{
  background:rgba(31,45,66,.86)!important;
  border-color:rgba(255,255,255,.10)!important;
}

@media(prefers-reduced-motion:reduce){
  #v-waInbox .nxWaComposerWrap,#v-waInbox .nxWaComposer button{transition:none!important;animation:none!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  function clean(){
    var root=document.getElementById('v-waInbox');
    if(!root)return;
    root.querySelectorAll('.nxWaRefPlus,.nxWaRefCamera').forEach(function(el){
      try{el.remove();}catch(e){el.style.display='none';}
    });
    var emoji=root.querySelector('.nxWaRefEmoji');
    if(emoji){emoji.setAttribute('aria-label','Emoji');emoji.setAttribute('title','Emoji');}
    var attach=root.querySelector('.nxWaComposer .nxWaIconBtn');
    if(attach){attach.setAttribute('aria-label','Adjuntar');attach.setAttribute('title','Adjuntar');}
    var voice=root.querySelector('.nxWaVoiceBtn');
    if(voice){voice.setAttribute('aria-label','Nota de voz');voice.setAttribute('title','Nota de voz');}
  }

  function boot(){
    css();
    clean();
    var root=document.getElementById('v-waInbox');
    if(!root)return;
    var q=false;
    var obs=new MutationObserver(function(){
      if(q)return;q=true;
      requestAnimationFrame(function(){q=false;clean();});
    });
    obs.observe(root,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
