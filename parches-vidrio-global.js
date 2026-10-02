/* NEXUS PRO · Luz de vidrio en TODO lo que se señala o se toca — solo visual (dueño 02-oct-2026: «que ese efecto se
   vea en todo lo que uno ponga el puntero y clickea», sobre el video «Glassy Navbar UI»).
   · Computadora: donde esté el puntero (botón, ítem del menú, pestaña, enlace, chip, fila tocable…) aparece una píldora
     de vidrio con rayita de luz debajo; al pasar al siguiente se DESLIZA con resorte. Al hacer clic se hunde y rebota.
   · iPhone / pantalla táctil: al tocar algo aparece un destello breve de vidrio sobre lo tocado (sin seguir el dedo).
   · Es UNA sola capa flotante (position:fixed, pointer-events:none, aria-hidden) colgada del <body>: no se mete dentro de
     las pantallas, no cambia el tamaño ni la posición de nada y no recibe clics. Se recorta al área visible de la lista
     o ventana que tenga desplazamiento.
   · Movimiento reducido: no hace nada. La barra superior tiene su propio deslizador (parches-glass-pointer.js), por eso
     aquí se excluye .tnav. Dibujo en parches-sidebar-curva.css («LUZ DE VIDRIO GLOBAL»). */
(function(){
  'use strict';
  if(window.__nxVidrioGlobal)return;
  window.__nxVidrioGlobal=true;
  var mq=function(q){return !!(window.matchMedia&&window.matchMedia(q).matches);};
  if(mq('(prefers-reduced-motion: reduce)'))return;
  var FINO=mq('(hover: hover) and (pointer: fine)');
  var TOCABLE='button,a[href],[role="button"],[role="tab"],[role="menuitem"],[role="option"],[role="switch"],summary,select,label[for],.ni,.btn,.chip,[onclick],[tabindex="0"]';
  var NO='.tnav,input,textarea,[contenteditable="true"],.nx-vidrio-no,iframe,video,canvas';
  var capa=null,actual=null,raf=0,visible=false,ultimo=0;
  function crear(){
    if(capa&&document.body.contains(capa))return capa;
    capa=document.createElement('div');capa.className='nx-vidrio';capa.setAttribute('aria-hidden','true');
    document.body.appendChild(capa);return capa;
  }
  function objetivo(t){
    if(!t||!t.closest)return null;
    if(t.closest(NO))return null;
    var el=t.closest(TOCABLE);
    if(!el||el===document.body||el===document.documentElement)return null;
    if(el.disabled||el.getAttribute('aria-disabled')==='true')return null;
    var r=el.getBoundingClientRect();
    // Solo controles: nada enorme (tarjetas, paneles enteros) ni diminuto.
    if(r.width<14||r.height<14||r.height>120||r.width>Math.min(720,window.innerWidth*0.9))return null;
    return el;
  }
  // Recorte al área visible del contenedor con desplazamiento (listas, ventanas) para que la luz no se salga.
  function recorte(el,r){
    var top=0,left=0,right=window.innerWidth,bottom=window.innerHeight,p=el.parentElement,n=0;
    while(p&&p!==document.body&&n<12){
      var cs=getComputedStyle(p);
      if(/(auto|scroll|hidden|clip)/.test(cs.overflowY+cs.overflowX)){
        var q=p.getBoundingClientRect();
        top=Math.max(top,q.top);left=Math.max(left,q.left);right=Math.min(right,q.right);bottom=Math.min(bottom,q.bottom);
      }
      p=p.parentElement;n++;
    }
    return 'inset('+Math.max(0,top-r.top).toFixed(1)+'px '+Math.max(0,r.right-right).toFixed(1)+'px '+Math.max(0,r.bottom-bottom).toFixed(1)+'px '+Math.max(0,left-r.left).toFixed(1)+'px round 0)';
  }
  function colocar(el,deslizar){
    var c=crear(),r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    var rad=parseFloat(cs.borderTopLeftRadius)||0;
    if(rad<6)rad=Math.min(10,r.height/2);
    if(rad>r.height/2)rad=r.height/2;
    if(!deslizar){c.classList.add('sin');}
    c.style.setProperty('--v-x',r.left.toFixed(1)+'px');
    c.style.setProperty('--v-y',r.top.toFixed(1)+'px');
    c.style.setProperty('--v-w',r.width.toFixed(1)+'px');
    c.style.setProperty('--v-h',r.height.toFixed(1)+'px');
    c.style.setProperty('--v-r',rad.toFixed(1)+'px');
    c.style.clipPath=recorte(el,r);
    c.classList.toggle('alto',r.height>56);
    if(!deslizar){void c.offsetWidth;c.classList.remove('sin');}
  }
  function pintar(){
    raf=0;
    if(!actual||!document.documentElement.contains(actual)){apagar();return;}
    var r=actual.getBoundingClientRect();
    if(r.width<1){apagar();return;}
    colocar(actual,visible);
    crear().classList.add('on');visible=true;
  }
  function apagar(){if(capa){capa.classList.remove('on','press');}visible=false;actual=null;}
  function programar(){if(!raf)raf=requestAnimationFrame(pintar);}

  if(FINO){
    document.addEventListener('pointermove',function(ev){
      if(ev.pointerType&&ev.pointerType!=='mouse')return;
      var el=objetivo(ev.target);
      if(el===actual)return;
      actual=el;
      if(!el){if(capa)capa.classList.remove('on');visible=false;return;}
      programar();
    },{passive:true});
    document.addEventListener('pointerdown',function(ev){
      if(ev.pointerType&&ev.pointerType!=='mouse')return;
      if(actual&&capa){capa.classList.add('press');}
    },{passive:true});
    document.addEventListener('pointerup',function(){if(capa)capa.classList.remove('press');},{passive:true});
    document.addEventListener('pointerleave',apagar,{passive:true});
    window.addEventListener('blur',apagar,{passive:true});
    // Al desplazarse o cambiar de tamaño, la luz se queda pegada al mismo control.
    window.addEventListener('scroll',function(){if(actual&&visible){visible=false;programar();}},{passive:true,capture:true});
    window.addEventListener('resize',function(){if(actual)programar();},{passive:true});
    // Si la pantalla se redibuja y el control desaparece, se apaga.
    document.addEventListener('click',function(){setTimeout(function(){if(actual&&!document.documentElement.contains(actual))apagar();},60);},{passive:true,capture:true});
  }else{
    // Táctil: destello breve sobre lo que se tocó (no sigue el dedo; no estorba el desplazamiento).
    document.addEventListener('pointerdown',function(ev){
      var el=objetivo(ev.target);
      if(!el)return;
      var ahora=Date.now();if(ahora-ultimo<80)return;ultimo=ahora;
      colocar(el,false);
      var c=crear();c.classList.remove('flash');void c.offsetWidth;c.classList.add('flash');
    },{passive:true});
  }
})();
