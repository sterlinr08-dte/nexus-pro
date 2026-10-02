/* NEXUS PRO · Barra superior de vidrio como el video del dueño («Glassy Navbar UI») — solo visual, solo con mouse.
   59.04: línea de luz del borde superior que sigue al mouse (variable CSS --nx-glass-x en .tnav).
   59.05 (02-oct-2026, «el reflejo como en el video y la animación cuando se desliza de un lugar a otro»):
   · DESLIZADOR: una sola luz (píldora de vidrio + rayita debajo) que se desliza con resorte de un botón de la barra al
     siguiente mientras el mouse pasa por ellos; al entrar aparece sobre el botón, al salir de la barra se apaga.
   · El reflejo del borde superior se centra sobre el botón señalado (como en el video) y entre botones sigue al mouse.
   · El botón señalado se levanta un poco y se aclara (CSS en parches-sidebar-curva.css).
   Se agrega UN solo elemento decorativo (aria-hidden, sin eventos) dentro de .tnav, detrás del contenido.
   En celular, con movimiento reducido o sin mouse no hace nada. Dibujo: parches-sidebar-curva.css. */
(function(){
  'use strict';
  if(window.__nxPointerGlass)return;
  window.__nxPointerGlass=true;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var precise=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(reduce||!precise)return;
  var BOTON='button,[role="button"],a,.err-badge';
  var bar=null,glide=null,item=null,raf=0,lastX=0,visible=false;
  function glideDe(b){
    var g=b.querySelector(':scope > .nx-glide');
    if(!g){g=document.createElement('span');g.className='nx-glide';g.setAttribute('aria-hidden','true');b.appendChild(g);}
    return g;
  }
  function botonDe(t){
    if(!t||!t.closest||!bar)return null;
    var b=t.closest(BOTON);
    if(!b||!bar.contains(b)||b===bar)return null;
    var r=b.getBoundingClientRect();
    return (r.width>=16&&r.height>=16)?b:null;
  }
  function paint(){
    raf=0;
    if(!bar)return;
    var br=bar.getBoundingClientRect();
    if(br.width<1)return;
    var x=lastX;
    if(item&&glide){
      var r=item.getBoundingClientRect();
      var left=r.left-br.left, w=r.width;
      // Primera vez (o tras salir): aparece en su sitio, sin venir deslizándose desde el último lugar.
      if(!visible){glide.classList.add('nx-glide-sin');}
      glide.style.setProperty('--g-x',left.toFixed(1)+'px');
      glide.style.setProperty('--g-w',w.toFixed(1)+'px');
      glide.style.setProperty('--g-y',(r.top-br.top).toFixed(1)+'px');
      glide.style.setProperty('--g-h',r.height.toFixed(1)+'px');
      if(!visible){void glide.offsetWidth;glide.classList.remove('nx-glide-sin');}
      glide.classList.add('on');visible=true;
      x=r.left+r.width/2;
    }else if(glide){glide.classList.remove('on');visible=false;}
    var px=Math.max(0,Math.min(100,(x-br.left)/br.width*100));
    bar.style.setProperty('--nx-glass-x',px.toFixed(1)+'%');
  }
  function soltar(){
    if(bar){bar.classList.remove('nx-glass-active');}
    if(glide){glide.classList.remove('on');}
    bar=null;glide=null;item=null;visible=false;
  }
  document.addEventListener('pointermove',function(ev){
    if(ev.pointerType&&ev.pointerType!=='mouse')return;
    var t=ev.target&&ev.target.closest?ev.target.closest('.tnav'):null;
    if(t!==bar){soltar();bar=t;if(bar){bar.classList.add('nx-glass-active');glide=glideDe(bar);}}
    if(!bar)return;
    item=botonDe(ev.target);
    lastX=ev.clientX;
    if(!raf)raf=requestAnimationFrame(paint);
  },{passive:true});
  document.addEventListener('pointerleave',soltar,{passive:true});
  window.addEventListener('blur',soltar,{passive:true});
  window.addEventListener('scroll',function(){if(item&&!raf)raf=requestAnimationFrame(paint);},{passive:true,capture:true});
})();
