/* NEXUS PRO · WhatsApp Motion 2026 · 2026-09-08
   Animaciones de interfaz para Inbox + Contactos. Solo UI.
   No modifica API, Zernio, pagos, filtros ni reglas de negocio. */
(function(){
  'use strict';
  if(window.__nxWaMotion20260908)return;
  window.__nxWaMotion20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let rootObs=null,bodyObs=null,root=null,lastChatOpen=false,queued=false;

  function css(){
    if($('#nxWaMotionCss'))return;
    const s=document.createElement('style');
    s.id='nxWaMotionCss';
    s.textContent=`
#v-waInbox.nxWaAnimEnter .nxCrmHomeHead{animation:nxWaHeroIn .38s cubic-bezier(.16,1,.3,1) both!important}
#v-waInbox.nxWaAnimEnter .nxWaPro{animation:nxWaSectionIn .34s .05s cubic-bezier(.16,1,.3,1) both!important}
#v-waInbox.nxWaAnimEnter .nxWaShell{animation:nxWaSectionIn .38s .10s cubic-bezier(.16,1,.3,1) both!important}
#v-waInbox.nxWaAnimEnter .nxWaProKpi{animation:nxWaKpiIn .34s cubic-bezier(.2,.9,.2,1) both!important}
#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(1){animation-delay:.06s!important}#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(2){animation-delay:.09s!important}#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(3){animation-delay:.12s!important}#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(4){animation-delay:.15s!important}#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(5){animation-delay:.18s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(-n+8){animation:nxWaRowIn .32s cubic-bezier(.2,.85,.25,1) both!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(1){animation-delay:.13s!important}#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(2){animation-delay:.16s!important}#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(3){animation-delay:.19s!important}#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(4){animation-delay:.22s!important}#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(5){animation-delay:.25s!important}#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(6){animation-delay:.28s!important}#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(7){animation-delay:.31s!important}#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(8){animation-delay:.34s!important}
#v-waInbox .nxWaProKpi,#v-waInbox .nxWaRow,#v-waInbox .nxWaVisualContactsBtn,#v-waInbox .nxWaSearchToggle,#v-waInbox .nxWaHeadAct,#v-waInbox .nxWaComposer button{transition:transform .16s cubic-bezier(.2,.8,.2,1),box-shadow .16s ease,filter .16s ease,background-color .16s ease,border-color .16s ease!important;will-change:transform}
#v-waInbox .nxWaProKpi:active,#v-waInbox .nxWaRow:active,#v-waInbox .nxWaVisualContactsBtn:active,#v-waInbox .nxWaSearchToggle:active,#v-waInbox .nxWaHeadAct:active,#v-waInbox .nxWaComposer button:active{transform:scale(.965)!important}
@media(hover:hover){#v-waInbox .nxWaProKpi:hover,#v-waInbox .nxWaRow:hover{transform:translateY(-2px)!important}#v-waInbox .nxWaVisualContactsBtn:hover,#v-waInbox .nxWaSearchToggle:hover,#v-waInbox .nxWaHeadAct:hover{transform:translateY(-1px) scale(1.015)!important}}
@media(max-width:760px){#v-waInbox.nxWaChatOpen .nxWaDetailCol{animation:nxWaChatIn .28s cubic-bezier(.16,1,.3,1) both!important}#v-waInbox.nxWaAnimBack .nxWaListCol{animation:nxWaListBack .26s cubic-bezier(.16,1,.3,1) both!important}}
#v-waInbox .nxWaBub{animation:none!important}#v-waInbox .nxWaBubWrap:last-child .nxWaBub{animation:nxWaMsgIn .18s cubic-bezier(.2,.85,.25,1) both!important}#v-waInbox .nxWaBadge{transition:transform .16s ease,filter .16s ease!important}#v-waInbox.nxWaAnimEnter .nxWaBadge{animation:nxWaBadgePop .36s .24s cubic-bezier(.2,1.4,.3,1) both!important}
.nxWaCtxOverlay.open .nxWaCtxBackdrop{animation:nxWaBackdropIn .18s ease both!important}.nxWaCtxOverlay.open .nxWaCtxSheet{animation:nxWaSheetIn .32s cubic-bezier(.16,1,.3,1) both!important}.nxWaCtxOverlay.open .nxWaCtxHead{animation:nxWaSectionIn .26s .04s cubic-bezier(.16,1,.3,1) both!important}.nxWaCtxOverlay.open .nxWaUhdSearch{animation:nxWaSectionIn .26s .08s cubic-bezier(.16,1,.3,1) both!important}.nxWaCtxOverlay.open .nxWaContactTabs{animation:nxWaSectionIn .26s .11s cubic-bezier(.16,1,.3,1) both!important}
.nxWaCtxOverlay.open .nxWaContact:nth-child(-n+8){animation:nxWaContactIn .28s cubic-bezier(.2,.85,.25,1) both!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(1){animation-delay:.10s!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(2){animation-delay:.12s!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(3){animation-delay:.14s!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(4){animation-delay:.16s!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(5){animation-delay:.18s!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(6){animation-delay:.20s!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(7){animation-delay:.22s!important}.nxWaCtxOverlay.open .nxWaContact:nth-child(8){animation-delay:.24s!important}
.nxWaCtxOverlay .nxWaContact,.nxWaCtxOverlay .nxWaContactTabs button,.nxWaCtxOverlay .nxWaContactsFoot button,.nxWaCtxOverlay .nxWaCtxClose,.nxWaCtxOverlay .nxWaUhdTune{transition:transform .15s cubic-bezier(.2,.8,.2,1),box-shadow .15s ease,filter .15s ease,border-color .15s ease!important}.nxWaCtxOverlay .nxWaContact:active,.nxWaCtxOverlay .nxWaContactTabs button:active,.nxWaCtxOverlay .nxWaContactsFoot button:active,.nxWaCtxOverlay .nxWaCtxClose:active,.nxWaCtxOverlay .nxWaUhdTune:active{transform:scale(.97)!important}
@media(hover:hover){.nxWaCtxOverlay .nxWaContact:hover{transform:translateY(-2px)!important}.nxWaCtxOverlay .nxWaContactTabs button:hover,.nxWaCtxOverlay .nxWaContactsFoot button:hover{transform:translateY(-1px)!important}}
@keyframes nxWaHeroIn{from{opacity:0;transform:translateY(-8px) scale(.992)}to{opacity:1;transform:none}}@keyframes nxWaSectionIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}@keyframes nxWaKpiIn{from{opacity:0;transform:translateY(10px) scale(.975)}to{opacity:1;transform:none}}@keyframes nxWaRowIn{from{opacity:0;transform:translateX(-9px)}to{opacity:1;transform:none}}@keyframes nxWaChatIn{from{opacity:.55;transform:translateX(22px)}to{opacity:1;transform:none}}@keyframes nxWaListBack{from{opacity:.55;transform:translateX(-14px)}to{opacity:1;transform:none}}@keyframes nxWaMsgIn{from{opacity:.55;transform:translateY(7px) scale(.985)}to{opacity:1;transform:none}}@keyframes nxWaBadgePop{0%{transform:scale(.75);opacity:.5}70%{transform:scale(1.14);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes nxWaBackdropIn{from{opacity:0}to{opacity:1}}@keyframes nxWaSheetIn{from{opacity:.35;translate:0 12px;scale:.97}to{opacity:1;translate:0 0;scale:1}}@keyframes nxWaContactIn{from{opacity:0;transform:translateY(8px) scale(.988)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){#v-waInbox *,#v-waInbox *:before,#v-waInbox *:after,.nxWaCtxOverlay *,.nxWaCtxOverlay *:before,.nxWaCtxOverlay *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
    document.head.appendChild(s);
  }

  function runOpenAnimation(){
    if(!root||!root.classList.contains('on'))return;
    root.classList.remove('nxWaAnimEnter');
    void root.offsetWidth;
    root.classList.add('nxWaAnimEnter');
    clearTimeout(root._nxWaAnimTimer);
    root._nxWaAnimTimer=setTimeout(()=>root&&root.classList.remove('nxWaAnimEnter'),720);
  }

  function attachRoot(){
    const r=$('#v-waInbox');
    if(!r||r===root)return;
    if(rootObs)rootObs.disconnect();
    root=r;lastChatOpen=root.classList.contains('nxWaChatOpen');
    rootObs=new MutationObserver(muts=>{
      for(const m of muts){
        if(m.attributeName!=='class')continue;
        const on=root.classList.contains('on');
        const chatOpen=root.classList.contains('nxWaChatOpen');
        if(on&&!root.dataset.nxWaAnimSeen){root.dataset.nxWaAnimSeen='1';runOpenAnimation();}
        if(!on)root.removeAttribute('data-nx-wa-anim-seen');
        if(lastChatOpen&&!chatOpen){root.classList.add('nxWaAnimBack');setTimeout(()=>root&&root.classList.remove('nxWaAnimBack'),320);}
        lastChatOpen=chatOpen;
      }
    });
    rootObs.observe(root,{attributes:true,attributeFilter:['class']});
    if(root.classList.contains('on')){root.dataset.nxWaAnimSeen='1';runOpenAnimation();}
  }

  function enhance(){queued=false;css();attachRoot();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else{bodyObs=new MutationObserver(queue);bodyObs.observe(document.body,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();