/* NEXUS PRO · Stitch motion foundation
   Adds one short, compositor-only cascade after a true view/navigation change. */
(function(){
  'use strict';
  if(window.__nxStitchMotionFoundation)return;
  window.__nxStitchMotionFoundation=true;

  var selector='.dhero,.nc,.tw,.sf-kpi,.role-card,.meta-card';
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
    nodes.forEach(function(el,index){
      el.classList.remove('nx-motion-item');
      el.style.removeProperty('--nx-motion-delay');
      // Restart only for a user-driven view transition, never for live data refresh.
      void el.offsetWidth;
      el.style.setProperty('--nx-motion-delay',(index*22)+'ms');
      el.classList.add('nx-motion-item');
    });
  }

  document.addEventListener('click',function(event){
    var nav=event.target.closest&&event.target.closest('.ni');
    if(!nav)return;
    window.setTimeout(function(){
      animate(document.querySelector('.view.on')||document);
    },40);
  },true);

  document.addEventListener('DOMContentLoaded',function(){
    window.setTimeout(function(){
      animate(document.querySelector('.view.on')||document);
    },80);
  });
})();
