/* NEXUS PRO · Línea de luz de la barra superior que sigue al mouse — solo visual.
   02-oct-2026 (Claude, video del dueño «Glassy Navbar UI»): antes (capa de ChatGPT del mismo día) se metía un
   <span> de reflejo dentro de TODAS las tarjetas, menús y botones; ahora solo se mueve una variable CSS en la barra
   superior (.tnav) — no se agrega nada al DOM ni se toca ninguna otra pantalla. El dibujo está en
   parches-sidebar-curva.css («BARRA SUPERIOR DE VIDRIO»). En celular y con movimiento reducido no hace nada. */
(function(){
  'use strict';
  if(window.__nxPointerGlass)return;
  window.__nxPointerGlass=true;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var precise=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(reduce||!precise)return;
  var bar=null,raf=0,lastX=0;
  function paint(){
    raf=0;
    if(!bar)return;
    var r=bar.getBoundingClientRect();
    if(r.width<1)return;
    var x=Math.max(0,Math.min(100,(lastX-r.left)/r.width*100));
    bar.style.setProperty('--nx-glass-x',x.toFixed(1)+'%');
  }
  document.addEventListener('pointermove',function(ev){
    if(ev.pointerType&&ev.pointerType!=='mouse')return;
    var t=ev.target&&ev.target.closest?ev.target.closest('.tnav'):null;
    if(t!==bar){
      if(bar)bar.classList.remove('nx-glass-active');
      bar=t;
      if(bar)bar.classList.add('nx-glass-active');
    }
    if(!bar)return;
    lastX=ev.clientX;
    if(!raf)raf=requestAnimationFrame(paint);
  },{passive:true});
  function salir(){if(bar){bar.classList.remove('nx-glass-active');bar=null;}}
  document.addEventListener('pointerleave',salir,{passive:true});
  window.addEventListener('blur',salir,{passive:true});
})();
