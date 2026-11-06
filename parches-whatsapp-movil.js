/* NEXUS PRO · WhatsApp · Buzón compacto en el celular · 06-nov-2026
   Encargo visual de CLAUDE.md («WhatsApp móvil»): ver más chats por pantalla sin perder datos.
   Solo CSS, solo ≤760 px y solo dentro de #v-waInbox. No toca carga, envío, Realtime, el chat abierto ni Supabase.
   Gana la cascada por especificidad (html.nx-wam … #v-waInbox:not(#_)), no por orden de carga: las capas anteriores
   (nxWaInboxUhdCss, nxWaInboxCompactMobileCss, nxTemaGlassOscuro, nxWaListaOriginalCss) siguen cargando igual.
   1. Cabecera en una sola línea (ícono + «WhatsApp» + «Inbox»), 48 px.
   2. Los 5 datos y «Contactos» en una cuadrícula de 2 columnas de 44 px (antes 5 datos en 3 filas + Contactos aparte).
      Arregla también el modo claro, donde «Póliza» y «Sin vincular» quedaban cortados fuera de la pantalla.
   3. Barra «Conversaciones»: campana y lupa de 44×44 (antes 30 y 40 px).
   4. Filas de chat de 2 líneas: la etiqueta (Nuevo, Cobro…) va al lado del nombre; nombre 15 px y vista previa 13 px
      (antes 11 px en 3 líneas).
   Apagar en un equipo: localStorage.nx_whatsapp_movil_off='1'. Para todos: window.NX_WHATSAPP_MOVIL=false o borrar
   la línea en parches-seguros.js. */
(function(){
  'use strict';
  if(window.__nxWhatsappMovil20261106)return;
  window.__nxWhatsappMovil20261106=true;
  try{if(localStorage.getItem('nx_whatsapp_movil_off')==='1')return;}catch(e){}
  if(window.NX_WHATSAPP_MOVIL===false)return;

  /* OJO: plantilla de JS. No escribir acentos graves ni dólar-llave dentro del CSS. */
  var P='html.nx-wam body #cnt #v-waInbox:not(#_)';
  var css=`
@media(max-width:760px){
  ${P}{padding:0 0 10px!important}

  /* 1. Cabecera: una línea */
  ${P} .nxCrmHomeHead{min-height:48px!important;height:auto!important;padding:6px 12px!important;gap:10px!important;margin:0 0 8px!important;border-radius:16px!important;align-items:center!important}
  ${P} .nxCrmHomeHead > div:not(.nxWaUhdHeroIcon):not(.nxWaUhdHeroTag){display:flex!important;align-items:center!important;gap:8px!important;min-width:0!important;flex:1 1 auto!important}
  ${P} .nxWaUhdHeroIcon{width:32px!important;height:32px!important;flex:0 0 32px!important;border-radius:10px!important;font-size:18px!important}
  ${P} .nxCrmHomeBadge{font-size:12px!important;padding:3px 9px!important;letter-spacing:.04em!important;margin:0!important}
  ${P} .nxCrmHomeHead h1{font-size:18px!important;line-height:1.1!important;margin:0!important}
  ${P} .nxCrmHomeHead p,${P} .nxWaUhdHeroTag{display:none!important}

  /* 2. Datos + Contactos: una cuadrícula de 2 columnas */
  ${P} .nxWaPro{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;padding:6px!important;margin:0 0 8px!important;border-radius:16px!important;overflow:visible!important;min-height:0!important;height:auto!important}
  ${P} .nxWaPro > :not(.nxWaProGrid):not(.nxWaProActs){grid-column:1 / -1!important}
  ${P} .nxWaProGrid,${P} .nxWaProActs{display:contents!important}
  ${P} .nxWaProKpi{display:flex!important}
  ${P} .nxWaProKpi,${P} .nxWaProActs > button{
    grid-column:auto!important;width:auto!important;min-width:0!important;max-width:none!important;
    height:44px!important;min-height:44px!important;margin:0!important;padding:0 8px!important;
    flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:5px!important;
    border-radius:13px!important;text-align:left!important;box-sizing:border-box!important;overflow:hidden!important}
  ${P} .nxWaProKpi .nxWaUhdKpiIcon{width:20px!important;height:20px!important;flex:0 0 20px!important;margin:0!important;border-radius:7px!important;font-size:13px!important;display:grid!important;place-items:center!important}
  ${P} .nxWaProKpi .l{order:1!important;flex:1 1 auto!important;min-width:0!important;font-size:13px!important;line-height:1.15!important;margin:0!important;letter-spacing:-.012em!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;display:block!important;-webkit-line-clamp:unset!important}
  ${P} .nxWaProKpi .v{order:2!important;flex:0 0 auto!important;font-size:16px!important;line-height:1!important;margin:0!important;font-variant-numeric:tabular-nums!important}
  ${P} .nxWaProKpi .s{display:none!important}
  ${P} .nxWaProActs > button{font-size:14px!important;font-weight:600!important;letter-spacing:0!important;text-transform:none!important}
  ${P} .nxWaProActs > button > i{font-size:17px!important;flex:0 0 auto!important}
  ${P} .nxWaProActs > button .nxWaCtxCount{margin-left:auto!important;min-width:22px!important;height:22px!important;font-size:12px!important;display:inline-grid!important;place-items:center!important}

  /* Con un chat abierto, cabecera y datos se esconden como antes (nxWaVisualCss); esta regla gana a las de arriba */
  ${P}.nxWaChatOpen .nxCrmHomeHead,${P}.nxWaChatOpen .nxWaPro{display:none!important}

  /* 3. Barra «Conversaciones» */
  ${P} .nxWaListTools{min-height:52px!important;padding:4px 6px 4px 12px!important;gap:4px!important;align-items:center!important}
  ${P} .nxWaListCaption b{font-size:14px!important;line-height:1.15!important}
  ${P} .nxWaListCaption .nxWaListCount{font-size:12px!important;line-height:1.2!important}
  ${P} .nxWaSoundToggle{width:44px!important;height:44px!important;min-width:44px!important;flex:0 0 44px!important;padding:0!important;display:grid!important;place-items:center!important;font-size:18px!important}
  ${P} .nxWaListTools .nxWaSearchToggle{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important}

  /* 4. Filas de chat en 2 líneas */
  ${P} .nxWaListScroll{padding:4px 4px calc(16px + env(safe-area-inset-bottom,0px))!important}
  ${P} .nxWaRow{min-height:58px!important;padding:8px 8px 8px 10px!important;gap:10px!important;margin-bottom:2px!important;align-items:center!important}
  ${P} .nxWaAv{width:40px!important;height:40px!important;flex:0 0 40px!important;font-size:13px!important}
  ${P} .nxWaWho{display:grid!important;grid-template-columns:minmax(0,auto) auto 1fr!important;grid-template-areas:"nom tag ." "prev prev prev"!important;align-items:center!important;column-gap:6px!important;row-gap:2px!important;min-width:0!important}
  ${P} .nxWaWho > b{grid-area:nom!important;min-width:0!important;font-size:15px!important;line-height:1.25!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  ${P} .nxWaWho > span{grid-area:prev!important;min-width:0!important;margin:0!important;font-size:13px!important;line-height:1.3!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  ${P} .nxWaWho > .nxWaTag{grid-area:tag!important;margin:0!important;font-size:11px!important;line-height:1.3!important;padding:1px 7px!important;white-space:nowrap!important}
  ${P} .nxWaTime{font-size:12px!important}
  ${P} .nxWaRowMeta{min-width:44px!important}
}
@media(max-width:380px){
  /* iPhone SE / mini: sin el ícono de cada dato para que el nombre quepa entero */
  ${P} .nxWaProKpi .nxWaUhdKpiIcon{display:none!important}
}
`;
  function mount(){
    var h=document.documentElement;
    if(!h.classList.contains('nx-wam'))h.classList.add('nx-wam');
    if(document.getElementById('nxWhatsappMovilCss'))return;
    var s=document.createElement('style');s.id='nxWhatsappMovilCss';s.textContent=css;
    (document.head||h).appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
