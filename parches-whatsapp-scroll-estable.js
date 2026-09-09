/* NEXUS PRO · WhatsApp · apertura estable en último mensaje · 2026-09-08
   Corrige el desplazamiento visible al abrir un hilo en móvil:
   - neutraliza scroll-behavior:smooth global del contenedor de mensajes
   - mantiene el área de mensajes oculta mientras el Inbox termina su anclaje inicial
   - no toca Contactos, envío, Realtime ni lógica de negocio
*/
(function(){
  'use strict';
  if(window.__nxWaScrollEstable20260908)return;
  window.__nxWaScrollEstable20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  let seq=0,lastOpened=null,baseOpen=null,wrapped=false;

  function root(){return $('#v-waInbox');}
  function box(){return $('#v-waInbox .nxWaMsgs');}
  function detail(){return $('#v-waInbox .nxWaDetalle');}
  function hiloActualId(){
    const r=$('#v-waInbox .nxWaRow.on');
    const oc=r&&r.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function css(){
    if($('#nxWaScrollEstableCss'))return;
    const s=document.createElement('style');
    s.id='nxWaScrollEstableCss';
    s.textContent=`
#v-waInbox .nxWaMsgs{scroll-behavior:auto!important}
#v-waInbox.nxWaBottomPreparing .nxWaMsgs{visibility:hidden!important;pointer-events:none!important;scroll-behavior:auto!important}
#v-waInbox.nxWaBottomPreparing .nxWaDetailCol{animation:none!important}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaMsgs{scroll-behavior:auto!important}}
`;
    document.head.appendChild(s);
  }
  function forceBottom(el){
    if(!el)return;
    const prev=el.style.scrollBehavior;
    el.style.scrollBehavior='auto';
    el.scrollTop=Math.max(0,el.scrollHeight-el.clientHeight);
    if(prev)el.style.scrollBehavior=prev;else el.style.removeProperty('scroll-behavior');
  }
  function release(token,id){
    if(token!==seq)return;
    const r=root(),b=box();
    if(b)forceBottom(b);
    requestAnimationFrame(()=>{
      if(token!==seq)return;
      const bb=box();if(bb)forceBottom(bb);
      r?.classList.remove('nxWaBottomPreparing');
    });
  }
  function settle(id,token){
    const r=root();if(!r)return;
    r.classList.add('nxWaBottomPreparing');
    const started=performance.now();
    let stable=0,lastHeight=-1,lastCount=-1,readyAt=0;
    const step=()=>{
      if(token!==seq)return;
      const now=performance.now(),b=box(),d=detail(),current=hiloActualId();
      if(current&&String(current)!==String(id)){
        r.classList.remove('nxWaBottomPreparing');
        return;
      }
      if(!b){
        if(now-started>2500)return release(token,id);
        return requestAnimationFrame(step);
      }
      forceBottom(b);
      const preparing=b.classList.contains('prep-bottom')||d?.classList.contains('prep-bottom');
      if(preparing){stable=0;readyAt=0;return requestAnimationFrame(step);}
      if(!readyAt)readyAt=now;
      const h=b.scrollHeight,c=b.childElementCount,atBottom=Math.abs((b.scrollTop+b.clientHeight)-h)<4;
      if(h===lastHeight&&c===lastCount&&atBottom)stable++;else stable=0;
      lastHeight=h;lastCount=c;
      if((stable>=4&&now-readyAt>=80)||now-started>2500)return release(token,id);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function wrapOpen(){
    if(wrapped)return true;
    const fn=window.nxWaAbrirHilo;
    if(typeof fn!=='function')return false;
    baseOpen=fn;
    const wrappedFn=function(id){
      const current=hiloActualId();
      const isNew=String(current||'')!==String(id||'') || String(lastOpened||'')!==String(id||'');
      let token=null;
      if(isNew){
        token=++seq;lastOpened=String(id||'');
        root()?.classList.add('nxWaBottomPreparing');
      }
      const out=baseOpen.apply(this,arguments);
      if(isNew){
        Promise.resolve(out).catch(()=>{}).finally(()=>settle(id,token));
        setTimeout(()=>settle(id,token),0);
      }
      return out;
    };
    wrappedFn.__nxWaScrollEstableWrapped=true;
    window.nxWaAbrirHilo=wrappedFn;
    wrapped=true;
    return true;
  }
  function start(){
    css();
    if(!wrapOpen()){
      let tries=0;
      const t=setInterval(()=>{tries++;if(wrapOpen()||tries>80)clearInterval(t);},50);
    }
    const obs=new MutationObserver(()=>{
      css();
      if(!wrapped)wrapOpen();
    });
    obs.observe(document.documentElement,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
