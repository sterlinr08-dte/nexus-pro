/* NEXUS PRO · WhatsApp · ventana redonda final · 2026-09-08
   Redondea el contenedor exterior del hilo sin reducir ancho/alto ni tocar lógica. */
(function(){
  'use strict';
  if(window.__nxWaVentanaRedondaFinal20260908)return;
  window.__nxWaVentanaRedondaFinal20260908=true;

  function mount(){
    if(document.getElementById('nxWaVentanaRedondaFinalCss'))return;
    var s=document.createElement('style');
    s.id='nxWaVentanaRedondaFinalCss';
    s.textContent=`
/* Marco exterior del chat: mismo tamaño, esquinas realmente redondas. */
#v-waInbox .nxWaDetailCol{
  width:100%!important;
  max-width:none!important;
  margin:0!important;
  border-radius:34px!important;
  overflow:hidden!important;
  background:rgba(242,247,255,.90)!important;
  border:1px solid rgba(255,255,255,.90)!important;
  box-shadow:0 24px 64px -42px rgba(42,73,125,.34)!important;
}
#v-waInbox .nxWaDetalle{
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  border-radius:inherit!important;
  overflow:hidden!important;
  background:linear-gradient(180deg,#f2f6ff 0%,#eef4fb 100%)!important;
}

/* El área de mensajes respeta el recorte del marco, sin caja cuadrada al fondo. */
#v-waInbox .nxWaMsgs{
  min-width:0!important;
  border-radius:0!important;
  overflow-x:hidden!important;
}

/* Compositor exterior también completamente redondo. */
#v-waInbox .nxWaComposerWrap{
  margin:8px 10px max(9px,env(safe-area-inset-bottom))!important;
  border-radius:999px!important;
  overflow:visible!important;
}
#v-waInbox .nxWaComposer,
#v-waInbox .nxWaRefTextPill{
  border-radius:999px!important;
}

/* Aviso de 24h: tarjeta redondeada, nunca rectángulo duro. */
#v-waInbox .nxWaCerrada{
  border-radius:24px!important;
  overflow:hidden!important;
}

@media(max-width:760px){
  #v-waInbox .nxWaDetailCol{
    width:100%!important;
    margin:0!important;
    border-radius:30px!important;
  }
  #v-waInbox .nxWaDetalle{border-radius:30px!important}
  #v-waInbox .nxWaComposerWrap{
    margin:7px 8px max(8px,env(safe-area-inset-bottom))!important;
    border-radius:999px!important;
  }
}

@media(max-width:380px){
  #v-waInbox .nxWaDetailCol,#v-waInbox .nxWaDetalle{border-radius:27px!important}
}

body.tema-premium #v-waInbox .nxWaDetailCol,
body.tema-premium #v-waInbox .nxWaDetalle{
  background:#111a2b!important;
  border-color:rgba(255,255,255,.08)!important;
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
