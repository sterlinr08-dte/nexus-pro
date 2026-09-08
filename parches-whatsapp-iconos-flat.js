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
