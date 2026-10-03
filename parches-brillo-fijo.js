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
   · Con «reducir movimiento» se ve igual pero sin animación de entrada.
   59.08 (dueño: «vamos a ponerle también a la ventana de WhatsApp y los botones»):
   · VENTANA de WhatsApp: el marco, la cabecera del chat, la barra de escribir y el aviso de 24 h llevan la rayita de luz
     fija en su borde de arriba (como el reflejo de la barra superior).
   · BOTONES de WhatsApp (cabecera, barra de escribir, plantillas, herramientas de la lista): el que tocas queda con la
     luz de vidrio fija (píldora + rayita arriba), igual que en la barra superior; tocar otro del mismo grupo la pasa.
     Los mensajes y las filas de conversación no se tocan.
   · Estas luces se insertan como PRIMER hijo (hay reglas «:last-child» en la barra de escribir) y con etiqueta propia
     <nx-luz> para que ninguna regla de iconos (<i>) las afecte. */
(function(){
  'use strict';
  if(window.__nxBrilloFijo)return;
  window.__nxBrilloFijo=true;
  var SEL='.on,.active,.activo,.selected,.is-active,[aria-selected="true"],[aria-pressed="true"],[aria-current="page"]';
  var CONTROL='button,a,[role="button"],[role="tab"],[role="option"],[role="menuitem"],[onclick],.ni,.chip,.tab,.btn,[class*="tab"],[class*="chip"],[class*="pill"],[class*="seg"],[class*="filtro"],[class*="item"]';
  // Nunca: campos, interruptores (on/off no es «elegir»), ventanas/paneles abiertos, capas de efectos, tablas.
  var NO='input,textarea,select,[contenteditable="true"],[role="switch"],[class*="switch"],[class*="toggle"],[class*="tgl"],.nx-vidrio,.nx-glide,.nx-vidrio-no,.tnav,iframe,video,canvas,tr,td,th,dialog,[role="dialog"],[class*="modal"],[class*="overlay"],[class*="backdrop"],[class*="sheet"],[class*="drawer"],[class*="toast"]';
  var marcados=[],raf=0;
  // WhatsApp (59.08)
  var WA='#v-waInbox';
  var WA_SUP=WA+' .nxWaShell,'+WA+' .nxWaHead,'+WA+' .nxWaComposer,'+WA+' .nxWaCerrada';
  var WA_GRUPOS=['nxWaHead','nxWaComposer','nxWaCerrada','nxWaProActs','nxWaListTools'];
  var WA_NO='#nxWaMsgsBox,.nxWaRow,.nxWaRowWrap,textarea,input,select';
  var elegidosWa={}; // grupo → firma del botón tocado (sobrevive a que la pantalla se repinte)
  var vueltas=typeof WeakMap!=='undefined'?new WeakMap():null; // freno: si alguien borra la luz sin parar, se deja

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
  function marcar(el,tipo){
    tipo=tipo||'sel';
    var m=el.querySelector(':scope > .nx-marca');
    var vertical=tipo==='sel'&&el.classList.contains('ni')&&!!el.closest('nav,.sb,#sbEl');
    if(!m){
      if(vueltas){var n=(vueltas.get(el)||0)+1;vueltas.set(el,n);if(n>40)return null;}
      m=document.createElement('nx-luz');m.className='nx-marca';m.setAttribute('aria-hidden','true');
      if(getComputedStyle(el).position==='static'){el.style.position='relative';el.setAttribute('data-nx-marca-pos','1');}
      if(tipo==='sel')el.appendChild(m);else el.insertBefore(m,el.firstChild);
    }
    m.classList.toggle('v',vertical);
    m.classList.toggle('sup',tipo==='sup');
    m.classList.toggle('vid',tipo==='vid');
    if(tipo==='vid')el.setAttribute('data-nx-vid','1');else el.removeAttribute('data-nx-vid');
    m.classList.toggle('azul',tipo==='sel'&&!vertical&&claro(el));
    return el;
  }
  function desmarcar(el){
    var m=el.querySelector(':scope > .nx-marca');
    if(m)m.remove();
    el.removeAttribute('data-nx-vid');
    if(el.getAttribute('data-nx-marca-pos')){el.style.position='';el.removeAttribute('data-nx-marca-pos');}
  }
  function revisar(){
    raf=0;
    var nuevos=[],lista=document.querySelectorAll(SEL),x;
    for(var i=0;i<lista.length&&nuevos.length<60;i++){if(apto(lista[i])&&(x=marcar(lista[i],'sel')))nuevos.push(x);}
    // WhatsApp: superficies con la rayita fija arriba…
    var sup=document.querySelectorAll(WA_SUP);
    for(var s1=0;s1<sup.length;s1++){var r=sup[s1].getBoundingClientRect();if(r.width>40&&r.height>20&&nuevos.indexOf(sup[s1])<0&&(x=marcar(sup[s1],'sup')))nuevos.push(x);}
    // …y en cada grupo, el botón tocado con la luz de vidrio fija.
    for(var g in elegidosWa){
      var cajas=document.querySelectorAll(WA+' .'+g);
      for(var c=0;c<cajas.length;c++){
        var bs=cajas[c].querySelectorAll('button,[role="button"]');
        for(var b=0;b<bs.length;b++){
          if(firma(bs[b])!==elegidosWa[g]||bs[b].closest(WA_NO)||nuevos.indexOf(bs[b])>=0)continue;
          var rb=bs[b].getBoundingClientRect();
          if(rb.width>=16&&rb.height>=16&&(x=marcar(bs[b],'vid')))nuevos.push(x);
          break;
        }
      }
    }
    for(var j=0;j<marcados.length;j++){if(nuevos.indexOf(marcados[j])<0)desmarcar(marcados[j]);}
    marcados=nuevos;
  }
  function pedir(){if(!raf)raf=requestAnimationFrame(revisar);}
  function firma(b){
    var c=[].slice.call(b.classList).filter(function(k){return !/^(on|active|activo|is-|nx-|hover|press|pressed|focus)/.test(k);}).sort().join('.');
    return (b.id||'')+'|'+c+'|'+(b.getAttribute('aria-label')||b.getAttribute('title')||'');
  }
  // Toque/clic en un botón de la ventana de WhatsApp: queda elegido en su grupo.
  document.addEventListener('click',function(ev){
    var t=ev.target;if(!t||!t.closest)return;
    var b=t.closest('button,[role="button"]');
    if(!b||!b.closest(WA)||b.closest(WA_NO))return;
    for(var i=0;i<WA_GRUPOS.length;i++){
      if(b.closest('.'+WA_GRUPOS[i])){elegidosWa[WA_GRUPOS[i]]=firma(b);pedir();return;}
    }
  },true);
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
