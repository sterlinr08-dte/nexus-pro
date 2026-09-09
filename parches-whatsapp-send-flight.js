/* NEXUS PRO · WhatsApp · send flight animation · 2026-09-08
   Visual-only. Envuelve envío individual y confirmación masiva sin alterar backend ni flujo. */
(function(){
  'use strict';
  if(window.__nxWaSendFlight20260908)return;
  window.__nxWaSendFlight20260908=true;

  function css(){
    if(document.getElementById('nxWaSendFlightCss'))return;
    var s=document.createElement('style');
    s.id='nxWaSendFlightCss';
    s.textContent=`
.nxWaSendFly{position:fixed;z-index:100500;width:31px;height:31px;pointer-events:none;color:#20283d;filter:drop-shadow(0 8px 13px rgba(55,65,81,.18));transform-origin:center;animation:nxWaFlyOut .72s cubic-bezier(.16,.84,.32,1) forwards}
.nxWaSendFly svg{display:block;width:100%;height:100%;fill:currentColor}
.nxWaSendFly:before,.nxWaSendFly:after{content:"";position:absolute;right:19px;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,rgba(74,92,145,.22));transform:rotate(-29deg);transform-origin:right center;opacity:.85}
.nxWaSendFly:before{top:20px;width:34px}.nxWaSendFly:after{top:26px;width:24px;animation:nxWaTrailShort .72s ease-out forwards}
.nxWaSendFly.mass{color:#4f46e5;filter:drop-shadow(0 9px 14px rgba(79,70,229,.2))}
#v-waInbox #nxWaSendBtn.nxWaSendLaunching,#v-waInbox .nxWaTextSendBtn.nxWaSendLaunching,#v-waInbox .nxWaEnvioMasivoActs .bwa.nxWaSendLaunching{animation:nxWaSendPress .48s cubic-bezier(.2,.75,.25,1)}
#v-waInbox #nxWaSendBtn.nxWaSendLaunching i,#v-waInbox .nxWaTextSendBtn.nxWaSendLaunching i{animation:nxWaSendIconKick .48s cubic-bezier(.2,.75,.25,1)}
@keyframes nxWaFlyOut{0%{opacity:0;transform:translate3d(0,0,0) rotate(-8deg) scale(.76)}12%{opacity:1;transform:translate3d(5px,-4px,0) rotate(-10deg) scale(1.03)}42%{opacity:1;transform:translate3d(31px,-34px,0) rotate(-13deg) scale(.98)}100%{opacity:0;transform:translate3d(92px,-102px,0) rotate(-17deg) scale(.66)}}
@keyframes nxWaTrailShort{0%,18%{opacity:0}32%{opacity:.9}100%{opacity:0;width:8px}}
@keyframes nxWaSendPress{0%{transform:scale(1)}26%{transform:scale(.86)}58%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes nxWaSendIconKick{0%{transform:translate3d(0,0,0) rotate(0)}30%{transform:translate3d(2px,-2px,0) rotate(-12deg)}72%{transform:translate3d(-1px,1px,0) rotate(3deg)}100%{transform:none}}
@media(prefers-reduced-motion:reduce){.nxWaSendFly{display:none!important}#v-waInbox .nxWaSendLaunching,#v-waInbox .nxWaSendLaunching i{animation:none!important}}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  function svgPlane(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.8 2.6a1.1 1.1 0 0 0-1.14-.22L2.9 9.48a1.1 1.1 0 0 0 .08 2.07l6.1 2.03 2.03 6.1a1.1 1.1 0 0 0 2.07.08l7.1-17.76a1.1 1.1 0 0 0-.48-1.4ZM10.56 12.1 6.2 10.65l10.36-4.14-6 5.59Zm2.79 6.2-1.45-4.36 5.59-6-4.14 10.36Z"/></svg>';
  }

  function originEl(el){
    if(el&&el.getBoundingClientRect)return el;
    return document.querySelector('#v-waInbox #nxWaSendBtn:not([hidden]),#v-waInbox .nxWaTextSendBtn:not([hidden])');
  }

  function launchFrom(el,opt){
    if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    el=originEl(el);if(!el)return;
    var r=el.getBoundingClientRect();
    if(!r.width||!r.height)return;
    var p=document.createElement('span');
    p.className='nxWaSendFly'+(opt&&opt.mass?' mass':'');
    p.innerHTML=svgPlane();
    var dx=(opt&&opt.dx)||0,dy=(opt&&opt.dy)||0,delay=(opt&&opt.delay)||0;
    p.style.left=(r.left+r.width/2-15+dx)+'px';
    p.style.top=(r.top+r.height/2-15+dy)+'px';
    if(delay)p.style.animationDelay=delay+'ms';
    document.body.appendChild(p);
    setTimeout(function(){try{p.remove();}catch(e){}},1000+delay);
  }

  function press(el){
    if(!el)return;
    el.classList.remove('nxWaSendLaunching');
    void el.offsetWidth;
    el.classList.add('nxWaSendLaunching');
    setTimeout(function(){try{el.classList.remove('nxWaSendLaunching');}catch(e){}},560);
  }

  function singleAnimation(){
    var inp=document.getElementById('nxWaTexto');
    if(!inp||!String(inp.value||'').trim())return;
    var btn=document.querySelector('#v-waInbox #nxWaSendBtn,#v-waInbox .nxWaTextSendBtn');
    press(btn);
    launchFrom(btn);
  }

  function massAnimation(){
    var btn=document.querySelector('#nxWaEnvioMasivoOverlay .nxWaEnvioMasivoActs .bwa');
    if(!btn)return;
    press(btn);
    launchFrom(btn,{mass:true,dx:-8,dy:0,delay:0});
    launchFrom(btn,{mass:true,dx:1,dy:5,delay:75});
    launchFrom(btn,{mass:true,dx:10,dy:10,delay:145});
  }

  function wrap(){
    if(typeof window.nxWaEnviar==='function'&&!window.nxWaEnviar.__nxWaFlightWrapped){
      var orig=window.nxWaEnviar;
      var wrapped=function(){singleAnimation();return orig.apply(this,arguments);};
      wrapped.__nxWaFlightWrapped=true;
      wrapped.__nxWaFlightOrig=orig;
      window.nxWaEnviar=wrapped;
    }
    if(typeof window.nxWaConfirmarEnvioMasivo==='function'&&!window.nxWaConfirmarEnvioMasivo.__nxWaFlightWrapped){
      var origMass=window.nxWaConfirmarEnvioMasivo;
      var wrappedMass=function(){massAnimation();return origMass.apply(this,arguments);};
      wrappedMass.__nxWaFlightWrapped=true;
      wrappedMass.__nxWaFlightOrig=origMass;
      window.nxWaConfirmarEnvioMasivo=wrappedMass;
    }
  }

  function boot(){
    css();wrap();
    /* Fallback por si otra capa registra globals después de DOMContentLoaded. */
    setTimeout(wrap,0);setTimeout(wrap,500);setTimeout(wrap,1600);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
