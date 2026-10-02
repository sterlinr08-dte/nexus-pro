/* NEXUS PRO · BRILLO FIJO en lo seleccionado — solo visual (dueño 02-oct-2026: «cuando uno selecciona cualquier
   selección que se quede fijo, que no se quite; y en la barra lateral, en la línea vertical, que se vea esa línea con
   ese efecto»).
   · Todo lo que el sistema marca como ELEGIDO (pestañas, filtros, chips, segmentos, conversación abierta…: clases
     on/active/activo/selected o aria-selected/aria-pressed/aria-current) lleva la rayita de luz del vidrio en su borde
     de ARRIBA, fija mientras siga elegido. Cambias de elección → la luz pasa al nuevo elegido.
   · Menú lateral: el ítem elegido lleva la rayita en VERTICAL, en su borde izquierdo (en la computadora la dibuja el
     indicador de resorte, así viaja con él: ver parches-sidebar-curva.css «BRILLO FIJO»).
   · No toca la lógica: solo agrega un <i class="nx-marca"> decorativo (aria-hidden, sin eventos, position:absolute,
     fuera del flujo) dentro del elegido y lo quita cuando deja de estarlo. Lo vuelve a poner si la pantalla se repinta.
   · Con «reducir movimiento» se ve igual pero sin animación de entrada. */
(function(){
  'use strict';
  if(window.__nxBrilloFijo)return;
  window.__nxBrilloFijo=true;
  var SEL='.on,.active,.activo,.selected,.is-active,[aria-selected="true"],[aria-pressed="true"],[aria-current="page"]';
  var CONTROL='button,a,[role="button"],[role="tab"],[role="option"],[role="menuitem"],[onclick],.ni,.chip,.tab,.btn,[class*="tab"],[class*="chip"],[class*="pill"],[class*="seg"],[class*="filtro"],[class*="item"]';
  // Nunca: campos, interruptores (on/off no es «elegir»), ventanas/paneles abiertos, capas de efectos, tablas.
  var NO='input,textarea,select,[contenteditable="true"],[role="switch"],[class*="switch"],[class*="toggle"],[class*="tgl"],.nx-vidrio,.nx-glide,.nx-vidrio-no,.tnav,iframe,video,canvas,tr,td,th,dialog,[role="dialog"],[class*="modal"],[class*="overlay"],[class*="backdrop"],[class*="sheet"],[class*="drawer"],[class*="toast"]';
  var marcados=[],raf=0;

  function claro(el){
    // ¿Fondo claro? Entonces la rayita va azul (la blanca no se vería).
    var cs=getComputedStyle(el),m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(cs.backgroundColor||'');
    if(!m||(m[4]!==undefined&&+m[4]<0.5))return false;
    return (0.2126*m[1]+0.7152*m[2]+0.0722*m[3])/255>0.72;
  }
  function apto(el){
    if(!el||!el.matches||el.closest(NO))return false;
    if(!el.matches(CONTROL))return false;
    var r=el.getBoundingClientRect();
    if(r.width<24||r.height<18||r.height>76||r.width>560)return false;
    return true;
  }
  function marcar(el){
    var m=el.querySelector(':scope > i.nx-marca');
    var vertical=el.classList.contains('ni')&&!!el.closest('nav,.sb,#sbEl');
    if(!m){
      m=document.createElement('i');m.className='nx-marca';m.setAttribute('aria-hidden','true');
      if(getComputedStyle(el).position==='static'){el.style.position='relative';el.setAttribute('data-nx-marca-pos','1');}
      el.appendChild(m);
    }
    m.classList.toggle('v',vertical);
    m.classList.toggle('azul',!vertical&&claro(el));
    return el;
  }
  function desmarcar(el){
    var m=el.querySelector(':scope > i.nx-marca');
    if(m)m.remove();
    if(el.getAttribute('data-nx-marca-pos')){el.style.position='';el.removeAttribute('data-nx-marca-pos');}
  }
  function revisar(){
    raf=0;
    var nuevos=[],lista=document.querySelectorAll(SEL);
    for(var i=0;i<lista.length&&nuevos.length<60;i++){if(apto(lista[i]))nuevos.push(marcar(lista[i]));}
    for(var j=0;j<marcados.length;j++){if(nuevos.indexOf(marcados[j])<0)desmarcar(marcados[j]);}
    marcados=nuevos;
  }
  function pedir(){if(!raf)raf=requestAnimationFrame(revisar);}
  function propio(n){return n&&n.nodeType===1&&(n.classList.contains('nx-marca')||n.classList.contains('nx-vidrio')||n.classList.contains('nx-glide'));}
  function iniciar(){
    pedir();
    new MutationObserver(function(rs){
      for(var i=0;i<rs.length;i++){
        var r=rs[i];
        if(r.type==='attributes'){if(!propio(r.target))return pedir();continue;}
        var k,n;
        for(k=0;k<r.addedNodes.length;k++){n=r.addedNodes[k];if(n.nodeType===1&&!propio(n))return pedir();}
        for(k=0;k<r.removedNodes.length;k++){n=r.removedNodes[k];if(n.nodeType===1&&!propio(n))return pedir();}
      }
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','aria-selected','aria-pressed','aria-current']});
    // Cambio de tamaño de pantalla: lo que cabe o no cabe como «control» puede cambiar.
    window.addEventListener('resize',pedir,{passive:true});
    // Lo que se muestra/oculta por estilo (sin cambiar clases) se recoge con un repaso suave cada 2 s.
    setInterval(function(){if(!document.hidden)pedir();},2000);
    // Paneles que aparecen con transición (cajón del menú en el iPhone, pestañas que se despliegan): repaso al terminar.
    document.addEventListener('transitionend',function(e){if(!propio(e.target))pedir();},true);
    document.addEventListener('animationend',function(e){if(!propio(e.target))pedir();},true);
  }
  if(document.body)iniciar();else document.addEventListener('DOMContentLoaded',iniciar);
})();
