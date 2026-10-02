/* NEXUS PRO · Luz de vidrio en TODO lo que se señala o se toca — solo visual (dueño 02-oct-2026: «que ese efecto se
   vea en todo lo que uno ponga el puntero y clickea» → «hazlo de lo más smart»), sobre el video «Glassy Navbar UI».
   Una sola capa flotante (position:fixed, pointer-events:none, aria-hidden) colgada del <body>: no se mete dentro de las
   pantallas, no mueve nada y no recibe clics. Dibujo en parches-sidebar-curva.css («LUZ DE VIDRIO GLOBAL»).
   Lo «smart»:
   · Se DESLIZA solo entre controles vecinos (mismo grupo y cerca); si saltas a otra zona, aparece ahí sin cruzar la
     pantalla.
   · IMÁN: dentro del control la luz se inclina 2–3 px hacia el puntero y su brillo de arriba sigue al puntero.
   · COLOR: en botones de color (azul, rojo, verde…) la luz toma el color del botón.
   · Lo que ya está activo (ítem del menú abierto, pestaña elegida) recibe una luz más suave, sin duplicar el resaltado.
   · CLIC: onda que nace donde hiciste clic, la luz se hunde y rebota.
   · TECLADO: con Tab, la luz acompaña al control enfocado (accesibilidad).
   · Se esconde sola mientras desplazas o escribes y vuelve al quedarte quieto; se apaga si la pestaña no está a la vista.
   · iPhone/táctil: destello breve con onda desde el dedo; en equipos muy limitados o con «reducir movimiento», nada.
   · La barra superior tiene su propio deslizador (parches-glass-pointer.js): aquí se excluye .tnav. */
(function(){
  'use strict';
  if(window.__nxVidrioGlobal)return;
  window.__nxVidrioGlobal=true;
  var mq=function(q){return !!(window.matchMedia&&window.matchMedia(q).matches);};
  if(mq('(prefers-reduced-motion: reduce)'))return;
  var FINO=mq('(hover: hover) and (pointer: fine)');
  if(!FINO&&navigator.deviceMemory&&navigator.deviceMemory<=2)return; // celulares muy limitados: nada
  var TOCABLE='button,a[href],[role="button"],[role="tab"],[role="menuitem"],[role="option"],[role="switch"],summary,select,label[for],.ni,.btn,.chip,[onclick],[tabindex="0"]';
  var NO='.tnav,input,textarea,[contenteditable="true"],.nx-vidrio-no,iframe,video,canvas';
  var GRUPO='nav,[role="tablist"],[role="menu"],[role="listbox"],[role="toolbar"],ul,ol,.sb-nav,.tn-r,thead,tbody,form';
  var capa=null,actual=null,raf=0,visible=false,ultimo=0,prev=null,mx=0,my=0,tScroll=0,escribiendo=false,tSalir=0;

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
    if(r.width<14||r.height<14||r.height>120||r.width>Math.min(720,window.innerWidth*0.9))return null;
    return el;
  }
  function grupoDe(el){var g=el.parentElement&&el.parentElement.closest(GRUPO);return g||el.parentElement;}
  // ¿Deslizar o aparecer? Solo se desliza entre vecinos: mismo grupo y a menos de 320 px.
  function vecinos(a,b){
    if(!a||!b||!document.documentElement.contains(a))return false;
    var ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();
    var d=Math.hypot((ra.left+ra.width/2)-(rb.left+rb.width/2),(ra.top+ra.height/2)-(rb.top+rb.height/2));
    return d<320&&(a.parentElement===b.parentElement||grupoDe(a)===grupoDe(b));
  }
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
    return 'inset('+Math.max(0,top-r.top).toFixed(1)+'px '+Math.max(0,r.right-right).toFixed(1)+'px '+Math.max(0,r.bottom-bottom).toFixed(1)+'px '+Math.max(0,left-r.left).toFixed(1)+'px)';
  }
  // Color del botón (si es un botón de color: azul, rojo, verde…) para teñir la luz.
  function tinte(cs){
    var re=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/;
    var m=re.exec(cs.backgroundColor||'');
    // Muchos botones de color usan degradado: entonces el color sale del degradado.
    if(!m||(m[4]!==undefined&&+m[4]<0.35))m=re.exec(cs.backgroundImage||'')||m;
    if(!m)return '';
    var r=+m[1],g=+m[2],b=+m[3],a=m[4]===undefined?1:+m[4];
    if(a<0.35)return '';
    var mx_=Math.max(r,g,b),mn=Math.min(r,g,b);
    if(mx_-mn<60)return ''; // grises: sin tinte
    return Math.min(255,r+40)+','+Math.min(255,g+40)+','+Math.min(255,b+40);
  }
  function esActivo(el){
    return el.classList.contains('on')||el.classList.contains('active')||el.classList.contains('activo')||
      el.getAttribute('aria-current')==='page'||el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-pressed')==='true';
  }
  function colocar(el,deslizar){
    var c=crear(),r=el.getBoundingClientRect(),cs=getComputedStyle(el);
    var rad=parseFloat(cs.borderTopLeftRadius)||0;
    if(rad<6)rad=Math.min(10,r.height/2);
    if(rad>r.height/2)rad=r.height/2;
    if(!deslizar)c.classList.add('sin');
    c.style.setProperty('--v-x',r.left.toFixed(1)+'px');
    c.style.setProperty('--v-y',r.top.toFixed(1)+'px');
    c.style.setProperty('--v-w',r.width.toFixed(1)+'px');
    c.style.setProperty('--v-h',r.height.toFixed(1)+'px');
    c.style.setProperty('--v-r',rad.toFixed(1)+'px');
    c.style.clipPath=recorte(el,r);
    var t=tinte(cs);
    if(t){c.style.setProperty('--v-tinte',t);c.classList.add('tinte');}else{c.classList.remove('tinte');}
    c.classList.toggle('alto',r.height>56);
    c.classList.toggle('actual',esActivo(el));
    iman(r);
    if(!deslizar){void c.offsetWidth;c.classList.remove('sin');}
  }
  // Imán: la luz se inclina un poco hacia el puntero y su brillo de arriba lo sigue.
  function iman(r){
    if(!capa||!r)return;
    var cx=r.left+r.width/2,cy=r.top+r.height/2;
    var dx=Math.max(-1,Math.min(1,(mx-cx)/(r.width/2||1))),dy=Math.max(-1,Math.min(1,(my-cy)/(r.height/2||1)));
    capa.style.setProperty('--v-dx',(dx*Math.min(3,r.width*0.04)).toFixed(2)+'px');
    capa.style.setProperty('--v-dy',(dy*Math.min(2,r.height*0.04)).toFixed(2)+'px');
    capa.style.setProperty('--v-mx',(Math.max(0,Math.min(100,(mx-r.left)/r.width*100))).toFixed(1)+'%');
  }
  function pintar(){
    raf=0;
    if(!actual)return;
    if(!document.documentElement.contains(actual)){apagar();return;}
    var r=actual.getBoundingClientRect();
    if(r.width<1){apagar();return;}
    var deslizar=visible&&prev!==actual&&vecinos(prev,actual);
    if(prev===actual&&visible){iman(r);return;}
    colocar(actual,deslizar);
    crear().classList.add('on');visible=true;prev=actual;
  }
  function apagar(){if(capa){capa.classList.remove('on','press');}visible=false;actual=null;prev=null;}
  function programar(){if(!raf)raf=requestAnimationFrame(pintar);}
  function onda(ev,el){
    if(!capa||!el)return;
    var r=el.getBoundingClientRect();
    capa.style.setProperty('--v-ox',(ev.clientX-r.left).toFixed(1)+'px');
    capa.style.setProperty('--v-oy',(ev.clientY-r.top).toFixed(1)+'px');
    capa.classList.remove('onda');void capa.offsetWidth;capa.classList.add('onda');
  }

  document.addEventListener('visibilitychange',function(){if(document.hidden)apagar();});
  window.addEventListener('blur',apagar,{passive:true});

  if(FINO){
    document.addEventListener('pointermove',function(ev){
      if(ev.pointerType&&ev.pointerType!=='mouse')return;
      mx=ev.clientX;my=ev.clientY;
      if(escribiendo){escribiendo=false;if(capa)capa.classList.remove('quieto');}
      var el=objetivo(ev.target);
      if(el===actual){if(el)programar();return;}
      // Huecos entre controles (márgenes del menú, separaciones): la luz espera 140 ms antes de apagarse, así al
      // llegar al siguiente control se desliza en vez de apagarse y reaparecer.
      if(!el){
        actual=null;
        if(!tSalir)tSalir=setTimeout(function(){tSalir=0;if(!actual){if(capa)capa.classList.remove('on');visible=false;prev=null;}},140);
        return;
      }
      if(tSalir){clearTimeout(tSalir);tSalir=0;}
      actual=el;
      programar();
    },{passive:true});
    document.addEventListener('pointerdown',function(ev){
      if(ev.pointerType&&ev.pointerType!=='mouse')return;
      if(actual&&capa){capa.classList.add('press');onda(ev,actual);}
    },{passive:true});
    document.addEventListener('pointerup',function(){if(capa)capa.classList.remove('press');},{passive:true});
    document.addEventListener('pointerleave',apagar,{passive:true});
    // Desplazarse: se esconde y vuelve sobre el control que quede debajo al quedarse quieto.
    window.addEventListener('scroll',function(){
      if(!capa)return;
      capa.classList.add('quieto');clearTimeout(tScroll);
      tScroll=setTimeout(function(){
        capa.classList.remove('quieto');
        var bajo=document.elementFromPoint(mx,my);
        actual=objetivo(bajo);visible=false;prev=null;
        if(actual)programar();else capa.classList.remove('on');
      },140);
    },{passive:true,capture:true});
    window.addEventListener('resize',function(){if(actual){visible=false;programar();}},{passive:true});
    // Escribir: la luz se aparta; Tab: la luz acompaña al control enfocado (teclado).
    document.addEventListener('keydown',function(ev){
      if(ev.key==='Tab')return;
      if(capa&&!escribiendo){escribiendo=true;capa.classList.add('quieto');}
    },true);
    document.addEventListener('focusin',function(ev){
      var el=ev.target;
      try{if(!el.matches(':focus-visible'))return;}catch(e){return;}
      var o=objetivo(el);if(!o)return;
      escribiendo=false;if(capa)capa.classList.remove('quieto');
      var r=o.getBoundingClientRect();mx=r.left+r.width/2;my=r.top+r.height/2;
      actual=o;programar();
    },true);
    // Si la pantalla se redibuja y el control desaparece, se apaga.
    document.addEventListener('click',function(){setTimeout(function(){if(actual&&!document.documentElement.contains(actual))apagar();},60);},{passive:true,capture:true});
  }else{
    // Táctil: destello breve con onda desde el dedo (no sigue el dedo; no estorba el desplazamiento).
    document.addEventListener('pointerdown',function(ev){
      var el=objetivo(ev.target);
      if(!el)return;
      var ahora=Date.now();if(ahora-ultimo<80)return;ultimo=ahora;
      mx=ev.clientX;my=ev.clientY;
      colocar(el,false);
      var c=crear();onda(ev,el);c.classList.remove('flash');void c.offsetWidth;c.classList.add('flash');
    },{passive:true});
  }
})();
