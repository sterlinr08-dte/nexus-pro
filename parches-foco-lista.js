/* NEXUS PRO · FOCO en listas — solo visual (dueño 05-oct-2026, captura «Bomber Jacket»: «en NEXUS PRO Seguros vamos a
   ponerlo así smart»). La fila que señalas se levanta (un poco más grande, nítida, con sombra y marco de esquinas) y las
   demás de la misma lista se desenfocan y se oscurecen.
   Lo «smart»:
   · Detecta solo LISTAS VERTICALES reales (un contenedor con 3 o más hijos del mismo tipo apilados uno debajo de otro:
     clientes, CRM, tareas, conversaciones…). Rejillas de tarjetas, tablas, menús y burbujas del chat no entran.
   · Computadora: se enciende al detenerte 90 ms sobre una fila (pasar de largo no hace parpadear la lista); el marco se
     desliza con resorte de una fila a la siguiente; se apaga al salir de la lista, al desplazar o al escribir.
   · iPhone: dejar el dedo un instante (180 ms) sobre una fila la levanta y oscurece las demás, SIN desenfoque (rendimiento);
     al deslizar la lista no se activa, y al soltar vuelve todo.
   · Si la lista se redibuja y la fila desaparece, el foco se apaga solo.
   · No cambia clics, ni el orden, ni el tamaño real de nada: solo clases decorativas y una capa flotante sin eventos
     (aria-hidden, pointer-events:none). Con «reducir movimiento», nada.
   Dibujo en parches-foco-lista.css. Se quita sacando estos dos archivos del loader (parches-seguros.js). */
(function(){
  'use strict';
  if(window.__nxFocoLista)return;
  window.__nxFocoLista=true;
  var mq=function(q){return !!(window.matchMedia&&window.matchMedia(q).matches);};
  if(mq('(prefers-reduced-motion: reduce)'))return;
  var FINO=mq('(hover: hover) and (pointer: fine)');
  var NO='nav,.sb,#sbEl,.tnav,table,thead,tbody,tr,#nxWaMsgsBox,.nxWaHead,.nxWaComposer,.nxWaCerrada,input,textarea,select,[contenteditable="true"],.nx-foco-no,.nx-vidrio,[role="menu"],[role="listbox"]';
  var listaOk=typeof WeakMap!=='undefined'?new WeakMap():null;
  var lista=null,fila=null,marco=null,tEntrar=0,tSalir=0,tScroll=0,candidata=null;

  // Filas de una misma lista comparten al menos una clase (clirow, nxOpsTask…). Así una columna de piezas distintas
  // apiladas (cabecera + aviso + barra de escribir del chat) no se confunde con una lista.
  function comparten(a,b){
    var ca=a.classList,cb=b.classList;
    for(var i=0;i<ca.length;i++){if(!/^(on|active|activo|is-|nx-foco)/.test(ca[i])&&cb.contains(ca[i]))return true;}
    return false;
  }
  // ¿Esta pieza es una fila de una lista vertical de verdad? Se compara con sus vecinas inmediatas: mismo tipo, misma
  // clase, misma columna y apiladas hacia abajo, con al menos 3 filas así. Se recuerda hasta que cambie la ventana.
  function medida(e){var r=e.getBoundingClientRect();return (r.height>=36&&r.height<=280&&r.width>=200)?r:null;}
  function hermana(a,ra,b){
    if(!b||b.tagName!==a.tagName||!comparten(a,b))return false;
    var rb=medida(b);return !!(rb&&Math.abs(rb.left-ra.left)<=2&&Math.abs(rb.top-ra.top)>=10);
  }
  function esFila(el){
    if(listaOk&&listaOk.has(el))return listaOk.get(el);
    var ok=false,r=medida(el);
    if(r&&el.parentElement&&!el.parentElement.closest(NO)){
      var n=1,a=el.previousElementSibling,b=el.nextElementSibling;
      if(hermana(el,r,a)){n++;if(hermana(el,r,a.previousElementSibling))n++;}
      if(hermana(el,r,b)){n++;if(hermana(el,r,b.nextElementSibling))n++;}
      ok=n>=3;
    }
    if(listaOk)listaOk.set(el,ok);
    return ok;
  }
  // La fila (hijo directo de una lista vertical) bajo el puntero/dedo.
  function filaDe(t){
    var el=t&&t.nodeType===1?t:(t&&t.parentElement),n=0;
    while(el&&el!==document.body&&n<10){
      if(el.closest&&el.closest(NO))return null;
      if(esFila(el))return el;
      el=el.parentElement;n++;
    }
    return null;
  }
  function crearMarco(){
    if(marco&&document.body.contains(marco))return marco;
    marco=document.createElement('div');marco.className='nx-foco-marco';marco.setAttribute('aria-hidden','true');
    document.body.appendChild(marco);return marco;
  }
  // Cuánto se agranda la fila: hasta 6 % (iPhone 4 %), pero nunca más de ~18 px por lado (12 px en el iPhone), para que
  // una fila ancha no se salga del panel.
  function escala(el){var w=el.offsetWidth||1;return FINO?Math.min(1.06,1+36/w):Math.min(1.04,1+24/w);}
  function colocarMarco(el,deslizar){
    // Se mide sin la transformación (offsetWidth/Height y el centro, que no cambia al escalar desde el centro): así el marco
    // abraza la fila ya agrandada aunque la animación vaya a medias.
    var m=crearMarco(),r=el.getBoundingClientRect(),cs=getComputedStyle(el),g=FINO?8:6,s=parseFloat(el.style.getPropertyValue('--nx-foco-s'))||escala(el);
    if(!FINO)m.classList.add('tactil');
    var cx=r.left+r.width/2,cy=r.top+r.height/2,w=el.offsetWidth*s+g*2,h=el.offsetHeight*s+g*2;
    if(!deslizar)m.classList.add('sin');
    m.style.setProperty('--f-x',(cx-w/2).toFixed(1)+'px');
    m.style.setProperty('--f-y',(cy-h/2).toFixed(1)+'px');
    m.style.setProperty('--f-w',w.toFixed(1)+'px');
    m.style.setProperty('--f-h',h.toFixed(1)+'px');
    m.style.setProperty('--f-r',Math.min(24,(parseFloat(cs.borderTopLeftRadius)||10)+g).toFixed(1)+'px');
    if(!deslizar){void m.offsetWidth;m.classList.remove('sin');}
    m.classList.add('on');
  }
  function activar(el){
    var p=el.parentElement;
    var deslizar=!!(fila&&lista===p&&marco&&marco.classList.contains('on'));
    if(lista&&lista!==p)apagar();
    if(fila&&fila!==el){fila.classList.remove('nx-foco');fila.style.removeProperty('--nx-foco-s');}
    lista=p;fila=el;
    el.style.setProperty('--nx-foco-s',escala(el).toFixed(4));
    p.classList.add('nx-foco-lista','nx-foco-on');
    if(!FINO)p.classList.add('nx-foco-tactil');
    el.classList.add('nx-foco');
    requestAnimationFrame(function(){if(fila===el)colocarMarco(el,deslizar);});
  }
  function apagar(){
    clearTimeout(tEntrar);candidata=null;
    if(fila){fila.classList.remove('nx-foco');fila.style.removeProperty('--nx-foco-s');}
    if(lista)lista.classList.remove('nx-foco-on');
    if(marco)marco.classList.remove('on');
    fila=null;lista=null;
  }
  window.addEventListener('resize',function(){if(listaOk)listaOk=new WeakMap();apagar();},{passive:true});
  document.addEventListener('visibilitychange',function(){if(document.hidden)apagar();});
  window.addEventListener('blur',apagar,{passive:true});
  // La lista se redibuja (innerHTML): si la fila ya no está, se apaga; si el contenedor cambió de contenido, se vuelve a medir.
  setInterval(function(){
    if(fila&&!document.documentElement.contains(fila))apagar();
  },700);
  window.addEventListener('scroll',function(){
    if(!fila)return;
    if(!FINO){apagar();return;}
    if(marco)marco.classList.remove('on');
    clearTimeout(tScroll);
    tScroll=setTimeout(function(){if(fila&&document.documentElement.contains(fila))colocarMarco(fila,false);},160);
  },{passive:true,capture:true});

  if(FINO){
    document.addEventListener('pointermove',function(ev){
      if(ev.pointerType&&ev.pointerType!=='mouse')return;
      var el=filaDe(ev.target);
      if(el){
        if(tSalir){clearTimeout(tSalir);tSalir=0;}
        if(el===fila||el===candidata)return;
        candidata=el;clearTimeout(tEntrar);
        // Ya hay foco en esta misma lista: pasar a la vecina es inmediato (se desliza). Si no, espera 90 ms.
        var ya=fila&&lista===el.parentElement;
        tEntrar=setTimeout(function(){if(candidata===el){candidata=null;activar(el);}},ya?0:90);
      }else{
        candidata=null;clearTimeout(tEntrar);
        if(fila&&!tSalir)tSalir=setTimeout(function(){tSalir=0;apagar();},160);
      }
    },{passive:true});
    document.addEventListener('pointerleave',apagar,{passive:true});
    document.addEventListener('keydown',function(ev){if(ev.key!=='Tab'&&ev.key!=='Shift')apagar();},true);
  }else{
    var x0=0,y0=0,tocando=false;
    document.addEventListener('pointerdown',function(ev){
      if(ev.pointerType==='mouse')return;
      var el=filaDe(ev.target);if(!el)return;
      tocando=true;x0=ev.clientX;y0=ev.clientY;candidata=el;clearTimeout(tEntrar);
      tEntrar=setTimeout(function(){if(tocando&&candidata===el){candidata=null;activar(el);}},180);
    },{passive:true});
    document.addEventListener('pointermove',function(ev){
      if(!tocando||ev.pointerType==='mouse')return;
      if(Math.abs(ev.clientX-x0)>8||Math.abs(ev.clientY-y0)>8){tocando=false;apagar();}
    },{passive:true});
    function soltar(){tocando=false;clearTimeout(tEntrar);candidata=null;if(fila)setTimeout(function(){if(!tocando)apagar();},260);}
    document.addEventListener('pointerup',soltar,{passive:true});
    document.addEventListener('pointercancel',function(){tocando=false;apagar();},{passive:true}); // empezó a desplazar
  }
})();
