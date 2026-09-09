/* NEXUS PRO · acceso visible a Automatizaciones en Inbox móvil · 2026-09-09
   Reutiliza el botón existente si ya fue creado por el Centro de Automatizaciones.
   No duplica funciones y se oculta al abrir un chat en móvil. */
(function(){
  'use strict';
  if(window.__nxWaAutoAccessMobile20260909)return;
  window.__nxWaAutoAccessMobile20260909=true;

  const $=(s,r=document)=>r.querySelector(s);
  let queued=false;

  function css(){
    if($('#nxWaAutoAccessMobileCss'))return;
    const s=document.createElement('style');
    s.id='nxWaAutoAccessMobileCss';
    s.textContent=`
#v-waInbox .nxWaProActs button.nxWaAutomationBtn.nxWaAutomationMobileVisible{
  display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;
  height:48px!important;padding:0 15px!important;border-radius:999px!important;
  border:1px solid rgba(146,126,255,.30)!important;
  background:linear-gradient(145deg,#ffffff,#f2efff)!important;
  color:#5b42d6!important;font-size:9.4px!important;font-weight:900!important;
  box-shadow:0 14px 28px -23px rgba(91,66,214,.45)!important;
}
#v-waInbox .nxWaProActs button.nxWaAutomationBtn.nxWaAutomationMobileVisible i{font-size:16px!important;color:#6d4cff!important}
@media(max-width:760px){
  #v-waInbox:not(.nxWaChatOpen) .nxWaProActs button.nxWaAutomationBtn.nxWaAutomationMobileVisible{display:inline-flex!important}
  #v-waInbox.nxWaChatOpen .nxWaProActs button.nxWaAutomationBtn.nxWaAutomationMobileVisible{display:none!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  function openAutos(){
    if(typeof window.nxWaAbrirAutomatizaciones==='function'){
      window.nxWaAbrirAutomatizaciones();
      return;
    }
    try{if(typeof window.toast==='function')window.toast('warn','Automatizaciones','El módulo todavía está cargando. Intenta de nuevo en un momento.')}catch(e){}
  }

  function ensure(){
    queued=false;css();
    const root=$('#v-waInbox');
    const acts=root?.querySelector('.nxWaProActs');
    if(!acts)return;

    let b=acts.querySelector('.nxWaAutomationBtn');
    if(!b){
      b=document.createElement('button');
      b.type='button';
      b.className='nxWaAutomationBtn';
      b.innerHTML='<i class="ti ti-bolt"></i><span>AUTOMATIZACIONES</span>';
      b.addEventListener('click',openAutos);
    }
    b.classList.add('nxWaAutomationMobileVisible');
    b.setAttribute('aria-label','Abrir automatizaciones de WhatsApp NEXUS PRO');
    b.title='Automatizaciones';

    const contacts=acts.querySelector('.nxWaVisualContactsBtn');
    if(contacts && contacts.nextElementSibling!==b) contacts.insertAdjacentElement('afterend',b);
    else if(!b.isConnected) acts.appendChild(b);
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(ensure);}
  function start(){
    css();ensure();
    const root=$('#v-waInbox');
    if(root){
      const obs=new MutationObserver(queue);
      obs.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
    setTimeout(ensure,350);
    setTimeout(ensure,1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
