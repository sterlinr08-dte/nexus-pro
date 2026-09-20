/* NEXUS PRO · Stitch motion foundation
   Adds one short, compositor-only cascade after a true view/navigation change. */
(function(){
  'use strict';
  if(window.__nxStitchMotionFoundation)return;
  window.__nxStitchMotionFoundation=true;

  var selector='.dhero,.nc,.tw,.sf-kpi,.role-card,.meta-card';
  var pending=0,run=0;
  function reduce(){
    return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function visible(el){
    var r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&r.bottom>0&&r.top<window.innerHeight;
  }
  function animate(root){
    if(reduce())return;
    var scope=root||document;
    var nodes=Array.prototype.slice.call(scope.querySelectorAll(selector))
      .filter(visible).slice(0,12);
    var id=String(++run);

    /* Un solo flush de layout para toda la cascada, no uno por tarjeta. */
    nodes.forEach(function(el){
      el.classList.remove('nx-motion-item');
      el.style.removeProperty('--nx-motion-delay');
    });
    if(nodes.length)void document.body.offsetWidth;
    nodes.forEach(function(el,index){
      el.dataset.nxMotionRun=id;
      el.style.setProperty('--nx-motion-delay',(index*22)+'ms');
      el.classList.add('nx-motion-item');
    });

    /* Libera will-change al terminar, evitando gasto de memoria de GPU. */
    window.setTimeout(function(){
      nodes.forEach(function(el){
        if(el.dataset.nxMotionRun===id){
          el.classList.remove('nx-motion-item');
          el.style.removeProperty('--nx-motion-delay');
        }
      });
    },560);
  }
  function schedule(root,delay){
    window.clearTimeout(pending);
    pending=window.setTimeout(function(){animate(root);},delay||0);
  }

  document.addEventListener('click',function(event){
    var nav=event.target.closest&&event.target.closest('.ni');
    if(nav)schedule(document.querySelector('.view.on')||document,40);
  },true);

  function boot(){
    schedule(document.querySelector('.view.on')||document,80);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
})();