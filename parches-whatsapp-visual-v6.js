/* NEXUS PRO · WhatsApp visual 2026 · quinta pasada
   Limpieza del flujo real: sin renovación formal en WhatsApp + corrección del acceso Cobranza.
   No modifica mensajes, pagos, webhooks ni datos. */
(function(){
  'use strict';
  if(window.__nxWaVisualV6_20260907)return;
  window.__nxWaVisualV6_20260907=true;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let queued=false,obs=null;
  const txt=e=>String(e?.textContent||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function css(){
    if($('#nxWaVisualV6Css'))return;
    const s=document.createElement('style');s.id='nxWaVisualV6Css';s.textContent=`
#v-waInbox .nxWaNoRenew{display:none!important}
#v-waInbox .nxWaTag.nxWaSeguimiento,#v-waInbox .nxWaContact .st.nxWaSeguimiento{background:#eef2ff!important;color:#4f46e5!important}
.nxWaCtxOverlay .nxWaContact .st.nxWaSeguimiento{background:#eef2ff!important;color:#4f46e5!important}
body.tema-premium #v-waInbox .nxWaTag.nxWaSeguimiento,body.tema-premium #v-waInbox .nxWaContact .st.nxWaSeguimiento,body.tema-premium .nxWaCtxOverlay .nxWaContact .st.nxWaSeguimiento{background:rgba(79,70,229,.18)!important;color:#c7d2fe!important}
`;
    document.head.appendChild(s);
  }

  function patchCobranza(){
    if(window.nxWaAbrirCobranza&&window.nxWaAbrirCobranza.__nxWaCobrosFix)return;
    const f=function(){
      try{
        if(typeof nav==='function')nav('facturas',null);
        setTimeout(()=>{try{if(typeof switchTab==='function')switchTab('cob');}catch(e){}},120);
      }catch(e){}
    };
    f.__nxWaCobrosFix=1;
    window.nxWaAbrirCobranza=f;
  }

  function limpiarRenovacionEn(root){
    if(!root)return;
    $$('.nxWaProKpi',root).forEach(e=>{if(txt(e).includes('renovacion'))e.classList.add('nxWaNoRenew');});
    $$('.nxWaProActs button',root).forEach(e=>{if(txt(e).includes('renovacion'))e.classList.add('nxWaNoRenew');});
    $$('.nxWaContactTabs button',root).forEach(e=>{if(/^renovar\b/.test(txt(e)))e.classList.add('nxWaNoRenew');});
    $$('.nxWaContactsFoot button',root).forEach(e=>{if(txt(e).includes('renovacion'))e.classList.add('nxWaNoRenew');});
    $$('.nxWaTag,.nxWaContact .st',root).forEach(e=>{
      if(txt(e)==='renovar'){
        e.textContent='Seguimiento';e.classList.add('nxWaSeguimiento');
      }
    });
  }

  function enhance(){
    queued=false;css();patchCobranza();
    limpiarRenovacionEn($('#v-waInbox'));
    limpiarRenovacionEn($('#nxWaCtxOverlay'));
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){css();patchCobranza();queue();obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();