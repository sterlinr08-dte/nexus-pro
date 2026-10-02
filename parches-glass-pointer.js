/* NEXUS PRO · Reflejo glass que sigue el puntero — visual-only */
(function(){
  'use strict';
  if(window.__nxPointerGlass)return;
  window.__nxPointerGlass=true;

  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var precise=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(reduce||!precise)return;

  var SEL=[
    '.tnav','.sb','.nc','.tw','.sf-kpi','.role-card','.meta-card',
    '.nxWaPro','.nxWaProKpi','.nxCrmKpi','.nxProsCol','.nxProsCard',
    '.nxPf','.nx-card','.qa','.tn-b','.btn','.modal','.dialog','.pop'
  ].join(',');
  var active=null,layer=null,raf=0,lastX=0,lastY=0;

  function clear(){
    if(!active)return;
    active.classList.remove('nx-glass-active','nx-glass-host');
    if(layer&&layer.parentNode===active)layer.remove();
    active=null; layer=null;
  }
  function setActive(next){
    if(next===active)return;
    clear();
    if(!next)return;
    active=next;
    active.classList.add('nx-glass-host','nx-glass-active');
    layer=document.createElement('span');
    layer.className='nx-pointer-glass';
    layer.setAttribute('aria-hidden','true');
    active.appendChild(layer);
  }
  function paint(){
    raf=0;
    if(!active)return;
    var rect=active.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return;
    var x=Math.max(0,Math.min(100,(lastX-rect.left)/rect.width*100));
    var y=Math.max(0,Math.min(100,(lastY-rect.top)/rect.height*100));
    active.style.setProperty('--nx-glass-x',x.toFixed(2)+'%');
    active.style.setProperty('--nx-glass-y',y.toFixed(2)+'%');
  }
  document.addEventListener('pointermove',function(ev){
    if(ev.pointerType&&ev.pointerType!=='mouse')return;
    var node=ev.target&&ev.target.nodeType===1?ev.target:null;
    var next=node&&node.closest?node.closest(SEL):null;
    setActive(next);
    if(!active)return;
    lastX=ev.clientX; lastY=ev.clientY;
    if(!raf)raf=requestAnimationFrame(paint);
  },{passive:true});
  document.addEventListener('pointerout',function(ev){
    if(!active)return;
    var to=ev.relatedTarget&&ev.relatedTarget.nodeType===1?ev.relatedTarget:null;
    var next=to&&to.closest?to.closest(SEL):null;
    if(next!==active)clear();
  },{passive:true});
  window.addEventListener('blur',clear,{passive:true});
})();