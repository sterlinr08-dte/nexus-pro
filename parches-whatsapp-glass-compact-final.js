/* NEXUS PRO · WhatsApp · Glass + compact final · 2026-09-08
   Visual-only: ventana tipo glass y burbujas ajustadas al contenido.
   No toca DOM funcional, scroll, observers, envío, Contactos ni backend. */
(function(){
  'use strict';
  if(window.__nxWaGlassCompactFinal20260908)return;
  window.__nxWaGlassCompactFinal20260908=true;

  function mount(){
    if(document.getElementById('nxWaGlassCompactFinalCss'))return;
    var s=document.createElement('style');
    s.id='nxWaGlassCompactFinalCss';
    s.textContent=`
/* ===== Ventana del hilo · glass limpio ===== */
#v-waInbox .nxWaDetailCol{
  background:rgba(247,251,255,.88)!important;
  border:1px solid rgba(255,255,255,.92)!important;
  border-radius:24px!important;
  overflow:hidden!important;
  box-shadow:0 20px 52px -38px rgba(33,76,125,.34)!important;
}
#v-waInbox .nxWaDetalle{
  background:linear-gradient(180deg,rgba(246,250,255,.96),rgba(240,247,255,.92))!important;
}
#v-waInbox .nxWaHead{
  min-height:56px!important;
  padding:7px 9px!important;
  background:rgba(255,255,255,.86)!important;
  border-bottom:1px solid rgba(193,211,232,.55)!important;
  box-shadow:0 10px 24px -22px rgba(20,54,92,.32)!important;
  backdrop-filter:blur(18px) saturate(125%)!important;
  -webkit-backdrop-filter:blur(18px) saturate(125%)!important;
}
#v-waInbox .nxWaMsgs{
  padding:10px 9px 11px!important;
  gap:5px!important;
  background:
    radial-gradient(circle at 18% 16%,rgba(137,195,255,.10),transparent 28%),
    radial-gradient(circle at 82% 78%,rgba(180,214,255,.10),transparent 30%),
    linear-gradient(180deg,#f7fbff 0%,#f1f7fd 100%)!important;
}
#v-waInbox .nxWaComposer{
  margin:6px 7px!important;
  padding:5px 6px!important;
  min-height:48px!important;
  border:1px solid rgba(190,208,230,.58)!important;
  border-radius:22px!important;
  background:rgba(255,255,255,.88)!important;
  box-shadow:0 12px 30px -24px rgba(30,74,121,.32)!important;
  backdrop-filter:blur(16px) saturate(120%)!important;
  -webkit-backdrop-filter:blur(16px) saturate(120%)!important;
}
#v-waInbox .nxWaCerrada{
  margin:5px 7px 7px!important;
  padding:7px 10px!important;
  border-radius:16px!important;
  box-shadow:none!important;
}

/* ===== Burbujas: la caja sigue al texto, no al contenedor ===== */
#v-waInbox .nxWaBubWrap{
  display:flex!important;
  width:100%!important;
  min-height:0!important;
  height:auto!important;
  align-items:flex-start!important;
  flex:0 0 auto!important;
  margin-block:0!important;
}
#v-waInbox .nxWaBubWrap.out{justify-content:flex-end!important}
#v-waInbox .nxWaBubWrap.in{justify-content:flex-start!important}
#v-waInbox .nxWaBubWrap.same-prev{margin-top:1px!important}
#v-waInbox .nxWaBubWrap.diff-prev{margin-top:4px!important}

#v-waInbox .nxWaBub{
  display:inline-block!important;
  width:max-content!important;
  min-width:0!important;
  min-height:0!important;
  height:auto!important;
  max-width:min(70%,540px)!important;
  flex:none!important;
  align-self:flex-start!important;
  box-sizing:border-box!important;
  margin:0!important;
  padding:5px 8px 4px!important;
  border-radius:15px!important;
  font-size:10.8px!important;
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
#v-waInbox .nxWaBub.out{
  align-self:flex-end!important;
  color:#203751!important;
  background:linear-gradient(145deg,#e8f5ff 0%,#d9efff 55%,#cbe7ff 100%)!important;
  border:1px solid rgba(91,168,240,.22)!important;
  border-radius:15px 15px 6px 15px!important;
  box-shadow:0 6px 16px -14px rgba(45,126,203,.34)!important;
  overflow:visible!important;
}
#v-waInbox .nxWaBub.in{
  color:#27384d!important;
  background:#fff!important;
  border:1px solid rgba(202,216,233,.66)!important;
  border-radius:15px 15px 15px 6px!important;
  box-shadow:0 6px 16px -15px rgba(38,76,116,.28)!important;
}
#v-waInbox .nxWaBub.out:after{content:none!important;display:none!important}

/* Nada interno debe imponer altura a una burbuja de texto */
#v-waInbox .nxWaBubMeta,
#v-waInbox .nxWaMsgMeta{
  display:flex!important;
  min-height:0!important;
  height:auto!important;
  margin:2px 0 0!important;
  padding:0!important;
  gap:2px!important;
  line-height:1!important;
  font-size:6.8px!important;
  font-weight:700!important;
}
#v-waInbox .nxWaBub.out .nxWaBubMeta,
#v-waInbox .nxWaBub.out .nxWaMsgMeta{color:#617b98!important}
#v-waInbox .nxWaBubMenu,#v-waInbox .nxWaMsgDrop{position:absolute!important}

/* Multimedia conserva medidas prácticas sin volver a agrandar texto normal */
#v-waInbox .nxWaBub:has(img),
#v-waInbox .nxWaBub:has(video),
#v-waInbox .nxWaBub:has(audio){
  width:auto!important;
  max-width:min(84%,620px)!important;
  padding:6px!important;
}

@media(max-width:760px){
  #v-waInbox .nxWaDetailCol{
    margin:5px 6px calc(5px + env(safe-area-inset-bottom))!important;
    width:calc(100% - 12px)!important;
    border-radius:22px!important;
  }
  #v-waInbox .nxWaHead{
    min-height:54px!important;
    padding-left:max(8px,env(safe-area-inset-left))!important;
    padding-right:max(8px,env(safe-area-inset-right))!important;
  }
  #v-waInbox .nxWaMsgs{padding:9px 7px 10px!important;gap:4px!important}
  #v-waInbox .nxWaBub{
    width:max-content!important;
    max-width:72%!important;
    padding:5px 7px 4px!important;
    font-size:10.7px!important;
    font-weight:650!important;
    line-height:1.22!important;
  }
  #v-waInbox .nxWaBub:has(img),
  #v-waInbox .nxWaBub:has(video),
  #v-waInbox .nxWaBub:has(audio){max-width:86%!important}
  #v-waInbox .nxWaBubMeta,#v-waInbox .nxWaMsgMeta{font-size:6.6px!important;margin-top:2px!important}
  #v-waInbox .nxWaComposer{margin:5px 6px!important;border-radius:20px!important}
}

@media(max-width:380px){
  #v-waInbox .nxWaBub{max-width:75%!important;font-size:10.5px!important}
}

body.tema-premium #v-waInbox .nxWaDetailCol{background:rgba(15,27,43,.92)!important;border-color:rgba(148,163,184,.13)!important}
body.tema-premium #v-waInbox .nxWaDetalle{background:#0f1b2b!important}
body.tema-premium #v-waInbox .nxWaHead,body.tema-premium #v-waInbox .nxWaComposer{background:rgba(22,34,52,.92)!important;border-color:rgba(148,163,184,.14)!important}

@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaBub,#v-waInbox .nxWaBubWrap{animation:none!important;transition:none!important;transform:none!important}}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
