/* NEXUS PRO · WhatsApp · control del menú flotante global · 2026-09-08
   Evita que el botón flotante grande del menú global invada las burbujas
   cuando un hilo de WhatsApp está abierto en móvil. Su función global se
   conserva fuera del hilo y reaparece al volver a la lista. */
(function(){
  'use strict';
  if(window.__nxWaMenuFlotante20260908)return;
  window.__nxWaMenuFlotante20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let lastTarget=null,timer=null,queued=false;

  function css(){
    if($('#nxWaMenuFlotanteCss'))return;
    const s=document.createElement('style');
    s.id='nxWaMenuFlotanteCss';
    s.textContent=`
.nxWaGlobalFloatMenuHidden{
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
  transform:scale(.82)!important;
  transition:opacity .14s ease,transform .14s ease,visibility 0s linear .14s!important;
}
@media(min-width:761px){.nxWaGlobalFloatMenuHidden{opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important}}
@media(prefers-reduced-motion:reduce){.nxWaGlobalFloatMenuHidden{transition:none!important}}
`;
    document.head.appendChild(s);
  }

  function visible(el){
    if(!el||!el.isConnected)return false;
    const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    return cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>0&&r.width>0&&r.height>0;
  }

  function isCandidate(el){
    if(!el||el.closest('#v-waInbox'))return false;
    const icon=el.querySelector?.('.ti-menu-2');
    if(!icon||!visible(el))return false;
    const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    const large=r.width>=52&&r.height>=52;
    const lowerRight=r.right>=innerWidth-130&&r.bottom>=innerHeight*.52;
    const floating=cs.position==='fixed'||cs.position==='absolute'||lowerRight;
    return large&&floating;
  }

  function findTarget(){
    const nodes=$$('button,a,[role="button"]');
    const xs=nodes.filter(isCandidate);
    if(!xs.length)return null;
    xs.sort((a,b)=>{
      const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
      const sa=(ra.width*ra.height)+(ra.right/Math.max(1,innerWidth))*5000+(ra.bottom/Math.max(1,innerHeight))*5000;
      const sb=(rb.width*rb.height)+(rb.right/Math.max(1,innerWidth))*5000+(rb.bottom/Math.max(1,innerHeight))*5000;
      return sb-sa;
    });
    return xs[0];
  }

  function chatOpen(){
    const r=$('#v-waInbox');
    return !!(r&&innerWidth<=760&&r.classList.contains('nxWaChatOpen'));
  }

  function sync(){
    queued=false;css();
    const hide=chatOpen();
    let target=lastTarget&&lastTarget.isConnected?lastTarget:null;
    if(!target||!isCandidate(target))target=findTarget();
    if(lastTarget&&lastTarget!==target)lastTarget.classList.remove('nxWaGlobalFloatMenuHidden');
    lastTarget=target;
    if(target)target.classList.toggle('nxWaGlobalFloatMenuHidden',hide);
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync);}

  function start(){
    css();sync();
    const r=$('#v-waInbox');
    if(r){
      const obs=new MutationObserver(queue);
      obs.observe(r,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    }
    window.addEventListener('resize',queue,{passive:true});
    window.visualViewport?.addEventListener('resize',queue,{passive:true});
    timer=setInterval(sync,700);
    window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);lastTarget?.classList.remove('nxWaGlobalFloatMenuHidden');},{once:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
