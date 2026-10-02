/* NEXUS PRO · Barra superior de vidrio como el video del dueño («Glassy Navbar UI») — solo visual.
   59.04: línea de luz del borde superior que sigue al mouse (variable CSS --nx-glass-x en .tnav).
   59.05 (02-oct-2026, «el reflejo como en el video y la animación cuando se desliza de un lugar a otro»):
   · DESLIZADOR: una sola luz (píldora de vidrio + rayita) que se desliza con resorte de un botón de la barra al
     siguiente mientras el mouse pasa por ellos.
   · El reflejo del borde superior se centra sobre el botón señalado (como en el video) y entre botones sigue al mouse.
   59.07 (dueño: «que el brillo de la barra superior se quede fijo; yo selecciono algo y que se quede ahí»):
   · FIJO: el botón que tocas/clicas queda ELEGIDO: la luz se estaciona sobre él y no se apaga. Al pasar el mouse por
     otros botones la luz los visita y, al salir, vuelve deslizándose al elegido.
   · El reflejo del borde superior queda siempre encendido (sobre el elegido, o al centro si aún no eliges nada).
   · También en el iPhone: tocar un botón de la barra deja la luz fija en él (sin el deslizamiento por hover).
   Se agrega UN solo elemento decorativo (aria-hidden, sin eventos) dentro de .tnav, detrás del contenido.
   Con «reducir movimiento» no hace nada. Dibujo: parches-sidebar-curva.css. */
(function(){
  'use strict';
  if(window.__nxPointerGlass)return;
  window.__nxPointerGlass=true;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var precise=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if(reduce)return;
  var BOTON='button,[role="button"],a,.err-badge';
  var bar=null,glide=null,item=null,fijo=null,raf=0,lastX=0,visible=false;
  function glideDe(b){
    var g=b.querySelector(':scope > .nx-glide');
    if(!g){g=document.createElement('span');g.className='nx-glide';g.setAttribute('aria-hidden','true');b.appendChild(g);}
    return g;
  }
  function botonDe(t,b){
    b=b||bar;
    if(!t||!t.closest||!b)return null;
    var x=t.closest(BOTON);
    if(!x||!b.contains(x)||x===b)return null;
    var r=x.getBoundingClientRect();
    return (r.width>=16&&r.height>=16)?x:null;
  }
  // El elegido sigue valiendo solo si sigue en la barra y a la vista (un botón que se esconde suelta la luz).
  function fijoVivo(){
    if(!fijo)return null;
    if(!bar||!bar.contains(fijo)){fijo=null;return null;}
    var r=fijo.getBoundingClientRect();
    if(r.width<16||r.height<16){return null;}
    return fijo;
  }
  function paint(){
    raf=0;
    if(!bar)return;
    var br=bar.getBoundingClientRect();
    if(br.width<1)return;
    var x=lastX;
    var en=item||fijoVivo();
    bar.classList.toggle('nx-glass-fijo',!!fijoVivo());
    if(en&&glide){
      var r=en.getBoundingClientRect();
      // Primera vez: aparece en su sitio, sin venir deslizándose desde el último lugar.
      if(!visible){glide.classList.add('nx-glide-sin');}
      glide.style.setProperty('--g-x',(r.left-br.left).toFixed(1)+'px');
      glide.style.setProperty('--g-w',r.width.toFixed(1)+'px');
      glide.style.setProperty('--g-y',(r.top-br.top).toFixed(1)+'px');
      glide.style.setProperty('--g-h',r.height.toFixed(1)+'px');
      if(!visible){void glide.offsetWidth;glide.classList.remove('nx-glide-sin');}
      glide.classList.add('on');visible=true;
      glide.classList.toggle('fijo',en===fijo);
      x=r.left+r.width/2;
    }else{
      if(glide){glide.classList.remove('on','fijo');}
      visible=false;
      if(!item)x=br.left+br.width/2;
    }
    var px=Math.max(0,Math.min(100,(x-br.left)/br.width*100));
    bar.style.setProperty('--nx-glass-x',px.toFixed(1)+'%');
  }
  function pedir(){if(!raf)raf=requestAnimationFrame(paint);}
  function tomar(b){
    if(b===bar)return;
    if(bar){bar.classList.remove('nx-glass-active','nx-glass-fijo');}
    bar=b;glide=bar?glideDe(bar):null;visible=false;
  }
  // Mouse: la luz visita el botón señalado; al salir de la barra vuelve al elegido.
  if(precise){
    document.addEventListener('pointermove',function(ev){
      if(ev.pointerType&&ev.pointerType!=='mouse')return;
      var t=ev.target&&ev.target.closest?ev.target.closest('.tnav'):null;
      if(t){tomar(t);bar.classList.add('nx-glass-active');item=botonDe(ev.target);lastX=ev.clientX;pedir();}
      else if(bar&&(item||bar.classList.contains('nx-glass-active'))){bar.classList.remove('nx-glass-active');item=null;pedir();}
    },{passive:true});
    var salir=function(){if(bar){bar.classList.remove('nx-glass-active');item=null;pedir();}};
    document.addEventListener('pointerleave',salir,{passive:true});
    window.addEventListener('blur',salir,{passive:true});
  }
  // Clic o toque en un botón de la barra: queda ELEGIDO y la luz se queda ahí.
  document.addEventListener('click',function(ev){
    var t=ev.target&&ev.target.closest?ev.target.closest('.tnav'):null;
    if(!t)return;
    var b=botonDe(ev.target,t);
    if(!b)return;
    tomar(t);fijo=b;if(!precise)item=null;pedir();
  },true);
  // Si la barra cambia de tamaño (pantalla, aparece/desaparece un botón) la luz se reacomoda sobre el elegido.
  window.addEventListener('resize',pedir,{passive:true});
  if(window.ResizeObserver){
    var ro=new ResizeObserver(pedir),vigilada=null;
    setInterval(function(){
      var t=document.querySelector('.tnav .tn-r');
      if(t&&t!==vigilada){if(vigilada)ro.unobserve(vigilada);ro.observe(t);vigilada=t;tomar(t.closest('.tnav'));pedir();}
    },1500);
  }
})();
