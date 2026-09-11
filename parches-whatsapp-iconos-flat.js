/* NEXUS PRO · WhatsApp iconos flat · 2026-09-08
   Quita relieve/3D de los iconos del modulo WhatsApp. Solo UI. */
(function(){
  'use strict';
  if(window.__nxWaFlatIcons20260908)return;
  window.__nxWaFlatIcons20260908=true;

  function inject(){
    if(document.getElementById('nxWaFlatIconsCss'))return;
    var s=document.createElement('style');
    s.id='nxWaFlatIconsCss';
    s.textContent=`
/* Iconografia plana: sin brillo, relieve ni sombras volumetricas */

/* El check de los mensajes salia como un circulo morado 3D. No venia del modulo
   WhatsApp: es el tratamiento GLOBAL de iconos de parches-seguros-base.js, que
   convierte todo .ti "suelto" en una pastilla de 1.7em con gradiente
   #8b5cf6 -> #22d3ee, sombra interior y un ::after de reflejo cristalino.
   En una burbuja de chat no pega: WhatsApp pone un glifo pequeno del color de la
   hora. Se desactiva SOLO dentro del pie del mensaje, para no tocar el resto de
   iconos del sistema, que si quieren ese aspecto. */
/* Red mas amplia a proposito. El selector anterior apuntaba solo a
   .nxWaMsgMeta i.ti y no basto -- el dueno seguia viendo el circulo morado en
   produccion. En vez de seguir persiguiendo el nodo exacto se aplana cualquier .ti
   dentro de una burbuja y, por si acaso, los iconos de visto esten donde esten.
   Aplanar un check no puede romper nada. */
#v-waInbox .nxWaBub .ti,
#v-waInbox .nxWaMsgMeta .ti,
#v-waInbox .nxWaBubMeta .ti,
#v-waInbox .nxWaMsgState .ti,
#v-waInbox .ti-checks,
#v-waInbox .ti-check{
  width:auto!important;height:auto!important;min-width:0!important;
  background:none!important;border:0!important;border-radius:0!important;
  box-shadow:none!important;backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;overflow:visible!important;
  color:inherit!important;font-size:12px!important;line-height:1!important;
  vertical-align:-1px!important;transform:none!important;
}
#v-waInbox .nxWaBub .ti::after,
#v-waInbox .nxWaMsgMeta .ti::after,
#v-waInbox .nxWaMsgState .ti::after,
#v-waInbox .ti-checks::after,
#v-waInbox .ti-check::after{content:none!important;display:none!important}
#v-waInbox .nxWaBub.out .nxWaMsgState.st-leido i.ti{color:#53bdeb!important}
#v-waInbox .nxWaUhdHeroIcon{
  background:#21c766!important;
  box-shadow:none!important;
  border:1px solid rgba(5,150,105,.18)!important;
  filter:none!important;
}
#v-waInbox .nxWaUhdKpiIcon{
  background:#eef5ff!important;
  color:#1769e0!important;
  box-shadow:none!important;
  border:1px solid rgba(37,99,235,.10)!important;
  filter:none!important;
}
#v-waInbox .nxWaProKpi[data-wau-kind="cobranza"] .nxWaUhdKpiIcon{
  background:#edf9f2!important;
  color:#14945a!important;
  border-color:rgba(20,148,90,.10)!important;
}
#v-waInbox .nxWaProKpi[data-wau-kind="sin-responder"] .nxWaUhdKpiIcon{
  background:#eef5ff!important;
  color:#1769e0!important;
}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxIcon{
  background:#21c766!important;
  box-shadow:none!important;
  border:1px solid rgba(5,150,105,.18)!important;
  filter:none!important;
}
#v-waInbox .nxWaSearchToggle,
.nxWaCtxOverlay.nxWaUhdContacts .nxWaUhdTune,
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxClose{
  box-shadow:none!important;
  filter:none!important;
}
#v-waInbox .nxWaProActs .nxWaVisualContactsBtn i,
#v-waInbox .nxWaSearchToggle i,
.nxWaCtxOverlay.nxWaUhdContacts .nxWaUhdSearchBox i,
.nxWaCtxOverlay.nxWaUhdContacts .nxWaUhdTune i,
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxClose i{
  filter:none!important;
  text-shadow:none!important;
}
body.tema-premium #v-waInbox .nxWaUhdKpiIcon{
  background:rgba(59,130,246,.10)!important;
  border-color:rgba(147,197,253,.12)!important;
  color:#93c5fd!important;
}
body.tema-premium #v-waInbox .nxWaUhdHeroIcon,
body.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxIcon{
  background:#16a85a!important;
  border-color:rgba(74,222,128,.16)!important;
}
`;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});
  else inject();
})();
