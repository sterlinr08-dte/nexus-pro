/* NEXUS PRO · WhatsApp · layout compacto desktop · 2026-09-10
   Ajuste visual aislado para recuperar espacio útil en pantallas de escritorio.
   NO modifica mensajes, scroll, APIs, pagos, webhooks, automatizaciones ni lógica de negocio.
   Deliberadamente limitado a >= 900px para no tocar el flujo móvil ya estabilizado. */
(function(){
  'use strict';
  if(window.__nxWaLayoutCompacto20260910)return;
  window.__nxWaLayoutCompacto20260910=true;

  function mount(){
    if(document.getElementById('nxWaLayoutCompactoCss'))return;
    var s=document.createElement('style');
    s.id='nxWaLayoutCompactoCss';
    s.textContent=`
@media (min-width:900px){
  /* Hero: conserva identidad visual, pero deja de consumir casi 100 px. */
  #v-waInbox{padding-bottom:8px!important}
  #v-waInbox .nxCrmHomeHead{
    min-height:54px!important;
    margin:0 0 6px!important;
    padding:7px 12px!important;
    border-radius:14px!important;
  }
  #v-waInbox .nxCrmHomeHead:after{height:2px!important;left:12px!important;right:12px!important}
  #v-waInbox .nxCrmHomeHead h1{
    font-size:16px!important;
    line-height:1.05!important;
    margin:2px 0!important;
  }
  #v-waInbox .nxCrmHomeHead p{
    font-size:8.4px!important;
    line-height:1.2!important;
    margin:0!important;
  }
  #v-waInbox .nxCrmHomeBadge{
    padding:3px 7px!important;
    gap:4px!important;
    font-size:7px!important;
  }
  #v-waInbox .nxCrmHomeBadge i{font-size:10px!important}

  /* KPIs: siguen visibles los cinco a la vez, pero como tarjetas de densidad ejecutiva. */
  #v-waInbox .nxWaPro{
    margin:0 0 6px!important;
    padding:6px!important;
    border-radius:13px!important;
  }
  #v-waInbox .nxWaProHead{display:none!important}
  #v-waInbox .nxWaProGrid{
    display:grid!important;
    grid-template-columns:repeat(5,minmax(0,1fr))!important;
    gap:6px!important;
    margin:0 0 5px!important;
    padding:0!important;
    overflow:visible!important;
  }
  #v-waInbox .nxWaProKpi{
    min-width:0!important;
    min-height:46px!important;
    padding:5px 8px!important;
    border-radius:11px!important;
    display:flex!important;
    flex-direction:column!important;
    align-items:flex-start!important;
    justify-content:center!important;
    gap:1px!important;
    box-shadow:none!important;
    transform:none!important;
  }
  #v-waInbox .nxWaProKpi .v{
    order:0!important;
    margin:0!important;
    font-size:13px!important;
    line-height:1!important;
  }
  #v-waInbox .nxWaProKpi .l{
    font-size:7.8px!important;
    line-height:1.05!important;
  }
  #v-waInbox .nxWaProKpi .s{
    display:block!important;
    margin-top:1px!important;
    font-size:6.5px!important;
    line-height:1.05!important;
    opacity:.72!important;
  }
  #v-waInbox .nxWaProActs{
    gap:5px!important;
    margin:0!important;
    padding:0!important;
  }
  #v-waInbox .nxWaProActs button{
    height:27px!important;
    min-height:27px!important;
    padding:0 9px!important;
    border-radius:999px!important;
    font-size:7.7px!important;
    gap:4px!important;
  }
  #v-waInbox .nxWaProActs button i{font-size:10px!important}

  /* El espacio recuperado se entrega al área que realmente se usa: lista + chat. */
  #v-waInbox .nxWaShell{
    grid-template-columns:minmax(265px,300px) minmax(0,1fr)!important;
    gap:8px!important;
    height:calc(100dvh - 170px)!important;
    min-height:470px!important;
  }
  #v-waInbox .nxWaCol{border-radius:14px!important}

  /* Lista de conversaciones: más filas visibles sin perder legibilidad. */
  #v-waInbox .nxWaListTools{
    gap:5px!important;
    padding:5px 6px!important;
  }
  #v-waInbox .nxWaSearch input{
    height:30px!important;
    padding-left:29px!important;
    font-size:9px!important;
  }
  #v-waInbox .nxWaSearch i{left:9px!important;font-size:11px!important}
  #v-waInbox .nxWaSearchClear{width:23px!important;height:23px!important}
  #v-waInbox .nxWaRow{
    gap:8px!important;
    padding:8px 9px!important;
    min-height:0!important;
  }
  #v-waInbox .nxWaAv{
    width:34px!important;
    height:34px!important;
    min-width:34px!important;
    border-radius:50%!important;
    font-size:9.5px!important;
  }
  #v-waInbox .nxWaWho b{font-size:9.7px!important;line-height:1.12!important}
  #v-waInbox .nxWaWho span{font-size:8px!important;line-height:1.12!important;margin-top:2px!important}
  #v-waInbox .nxWaTag{margin-top:3px!important;font-size:6.3px!important;padding:1px 5px!important}
  #v-waInbox .nxWaTime{font-size:7px!important}
  #v-waInbox .nxWaBadge{min-width:16px!important;height:16px!important;font-size:6.8px!important}

  /* Cabecera del chat: reduce altura; no toca los botones ni su comportamiento. */
  #v-waInbox .nxWaHead{
    min-height:44px!important;
    padding:6px 10px!important;
    gap:7px!important;
    font-size:10.5px!important;
  }
  #v-waInbox .nxWaHead .nxWaAv{
    width:32px!important;
    height:32px!important;
    min-width:32px!important;
  }
  #v-waInbox .nxWaMsgs{
    padding:10px 11px 12px!important;
    gap:5px!important;
  }
}

/* En portátiles 1366x768 / viewport corto recuperamos todavía más alto útil. */
@media (min-width:900px) and (max-height:820px){
  #v-waInbox .nxCrmHomeHead{
    min-height:46px!important;
    padding:5px 10px!important;
    margin-bottom:5px!important;
  }
  #v-waInbox .nxCrmHomeHead p{display:none!important}
  #v-waInbox .nxWaPro{padding:5px!important;margin-bottom:5px!important}
  #v-waInbox .nxWaProKpi{min-height:42px!important;padding:4px 7px!important}
  #v-waInbox .nxWaProKpi .s{display:none!important}
  #v-waInbox .nxWaProActs button{height:25px!important;min-height:25px!important}
  #v-waInbox .nxWaShell{
    height:calc(100dvh - 148px)!important;
    min-height:430px!important;
  }
  #v-waInbox .nxWaRow{padding:7px 8px!important}
  #v-waInbox .nxWaHead{min-height:41px!important;padding:5px 9px!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
