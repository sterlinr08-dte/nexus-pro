/* NEXUS PRO · WhatsApp Inbox · Compactación móvil · 2026-09-20
   Solo CSS dimensional para móvil ≤760px.
   Reduce header, KPIs, acciones y filas de conversación para mostrar
   más chats en pantalla (iPhone 390-430px).
   No toca DOM, lógica, scroll, envío, pagos ni Realtime.
   Reversible: eliminar de parches-seguros.js para deshacer. */
(function(){
  'use strict';
  if(window.__nxWaInboxCompactMobile20260920)return;
  window.__nxWaInboxCompactMobile20260920=true;

  function mount(){
    if(document.getElementById('nxWaInboxCompactMobileCss'))return;
    var s=document.createElement('style');
    s.id='nxWaInboxCompactMobileCss';
    s.textContent=`
@media(max-width:760px){
  /* Container: padding más ajustado */
  #v-waInbox{padding:0 8px 10px!important}

  /* Header: de 72px a ~42px */
  #v-waInbox .nxCrmHomeHead{
    min-height:42px!important;
    padding:7px 10px!important;
    border-radius:14px!important;
    gap:7px!important;
    margin-bottom:6px!important
  }
  #v-waInbox .nxWaUhdHeroIcon{
    width:28px!important;height:28px!important;flex-basis:28px!important;
    border-radius:9px!important;font-size:15px!important
  }
  #v-waInbox .nxCrmHomeBadge{font-size:7px!important;padding:2px 7px!important}
  #v-waInbox .nxCrmHomeHead h1{font-size:15px!important;margin:2px 0!important}
  #v-waInbox .nxCrmHomeHead p{display:none!important}

  /* KPI grid: más compacto */
  #v-waInbox .nxWaProGrid{
    gap:4px!important;
    margin-bottom:4px!important
  }

  /* KPI cards: de 62px a ~38px */
  #v-waInbox .nxWaProKpi{
    min-height:38px!important;
    padding:4px 4px!important;
    border-radius:10px!important
  }
  #v-waInbox .nxWaUhdKpiIcon{
    width:16px!important;height:16px!important;
    border-radius:5px!important;margin-bottom:2px!important;
    font-size:9px!important
  }
  #v-waInbox .nxWaProKpi .v{font-size:13px!important}
  #v-waInbox .nxWaProKpi .l{font-size:6.6px!important}

  /* Sección .nxWaPro (contenedor KPI+acciones): reducir padding */
  #v-waInbox .nxWaPro{
    padding:6px!important;
    margin-bottom:4px!important;
    border-radius:13px!important
  }

  /* Acciones: botón Contactos más compacto */
  #v-waInbox .nxWaProActs .nxWaVisualContactsBtn{
    height:28px!important;
    padding:0 9px!important;
    font-size:9px!important;
    border-radius:8px!important
  }

  /* Toolbar de lista: de 48px a 36px */
  #v-waInbox .nxWaListTools{
    min-height:36px!important;
    padding:5px 9px!important
  }
  #v-waInbox .nxWaListCaption b{font-size:11px!important}
  #v-waInbox .nxWaSearchToggle{
    width:30px!important;height:30px!important;flex-basis:30px!important;
    border-radius:10px!important
  }

  /* Lista de conversaciones: padding inferior ajustado */
  #v-waInbox .nxWaListScroll{
    padding:4px 6px calc(72px + env(safe-area-inset-bottom,0px))!important
  }

  /* Filas de conversación: de 62px a ~48px */
  #v-waInbox .nxWaRow{
    min-height:48px!important;
    padding:7px!important;
    margin-bottom:3px!important;
    gap:7px!important;
    border-radius:12px!important
  }

  /* Avatar: de 40px a 32px */
  #v-waInbox .nxWaAv{
    width:32px!important;height:32px!important;flex-basis:32px!important;
    font-size:10px!important;border-radius:50%!important
  }

  /* Nombre y preview más compactos */
  #v-waInbox .nxWaWho b{font-size:10.5px!important;line-height:1.15!important}
  #v-waInbox .nxWaWho span{font-size:8px!important;margin-top:2px!important}

  /* Tag/badge más pequeño */
  #v-waInbox .nxWaTag{
    font-size:6px!important;
    padding:1px 5px!important;
    margin-top:3px!important
  }

  /* Hora y meta */
  #v-waInbox .nxWaTime{font-size:7.5px!important}
  #v-waInbox .nxWaRowMeta{min-width:36px!important}

  /* Chevron UHD más discreto */
  #v-waInbox .nxWaUhdChevron{font-size:13px!important}

  /* Pendientes panel: más compacto */
  #v-waInbox #nxWaPendPanel{margin-bottom:4px!important}
}

@media(max-width:360px){
  #v-waInbox .nxWaProKpi{padding:3px!important}
  #v-waInbox .nxWaProKpi .v{font-size:12px!important}
  #v-waInbox .nxWaRow{padding:6px!important;gap:6px!important}
  #v-waInbox .nxWaAv{width:30px!important;height:30px!important;flex-basis:30px!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
