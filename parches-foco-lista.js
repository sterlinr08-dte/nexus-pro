/* NEXUS PRO · RUEDA en listas — solo visual (dueño 05-oct-2026: «quiero que se vea como si fuera una rueda giratoria»,
   opción elegida «Rueda al desplazar»; reemplaza el foco por puntero de 59.10–59.11).
   Como el selector de hora del iPhone: al desplazar, la fila que pasa por el CENTRO de la pantalla queda en foco (grande,
   nítida, con marco de esquinas y resplandor) y las de arriba y abajo se inclinan hacia atrás como un cilindro que gira,
   cada vez más pequeñas, oscuras y (en la computadora) borrosas según su distancia al centro.
   Lo «smart»:
   · Solo LISTAS VERTICALES reales (filas del mismo tipo, con la misma clase, apiladas en la misma columna; al menos 3).
     Tablas, menús, barras, formularios, ventanas emergentes, burbujas del chat y la cabecera/barra de escribir de
     WhatsApp no entran.
   · Gira la lista que cruza el centro de la pantalla; si ninguna lo cruza, todo se ve normal.
   · Se mide sin transformaciones (offsetTop/Height), así la rueda no se «autoalimenta» al inclinar las filas.
   · Un cálculo por cuadro (requestAnimationFrame) al desplazar, al cambiar el tamaño y cuando la pantalla se redibuja.
   · iPhone: sin desenfoque (rendimiento). Con «reducir movimiento», nada.
   · No cambia clics, orden ni datos: solo variables CSS en las filas y una capa flotante sin eventos (aria-hidden).
   Dibujo en parches-foco-lista.css. Se quita sacando estos dos archivos del loader (parches-seguros.js). */
(function(){
  'use strict';
  if(window.__nxFocoLista)return;
  window.__nxFocoLista=true;
  var mq=function(q){return !!(window.matchMedia&&window.matchMedia(q).matches);};
  if(mq('(prefers-reduced-motion: reduce)'))return;
  var FINO=mq('(hover: hover) and (pointer: fine)');
  var NO='nav,.sb,#sbEl,.tnav,form,.modal,.overlay,[role="dialog"],table,thead,tbody,tr,#nxWaMsgsBox,.nxWaHead,.nxWaComposer,.nxWaCerrada,input,textarea,select,[contenteditable="true"],.nx-foco-no,.nx-vidrio,[role="menu"],[role="listbox"]';
  var lista=null,filas=[],centro=null,marco=null,raf=0;

  // ── Detección de listas (medidas sin transformar: offset*) ──────────────────────────────────────────────────────
  function comparten(a,b){
    var ca=a.classList,cb=b.classList;
    for(var i=0;i<ca.length;i++){if(!/^(on|active|activo|is-|nx-)/.test(ca[i])&&cb.contains(ca[i]))return true;}
    return false;
  }
  function medida(e){
    var h=e.offsetHeight,w=e.offsetWidth;
    return (h>=36&&h<=280&&w>=200)?{left:e.offsetLeft,top:e.offsetTop,width:w,height:h}:null;
  }
  function hermana(a,ra,b){
    if(!b||b.tagName!==a.tagName||!comparten(a,b)||b.offsetParent!==a.offsetParent)return false;
    var rb=medida(b);return !!(rb&&Math.abs(rb.left-ra.left)<=2&&Math.abs(rb.top-ra.top)>=10);
  }
  function esFila(el){
    var r=medida(el);
    if(!r||!el.parentElement||el.parentElement.closest(NO))return false;
    // Campos de un formulario apilados no son una lista: nunca se inclina algo donde se escribe.
    if(el.querySelector('input:not([type=checkbox]):not([type=radio]),select,textarea'))return false;
    var n=1,a=el.previousElementSibling,b=el.nextElementSibling;
    if(hermana(el,r,a)){n++;if(hermana(el,r,a.previousElementSibling))n++;}
    if(hermana(el,r,b)){n++;if(hermana(el,r,b.nextElementSibling))n++;}
    return n>=3;
  }
  function filaDe(t){
    var el=t&&t.nodeType===1?t:(t&&t.parentElement),n=0;
    while(el&&el!==document.body&&n<10){
      if(el.closest&&el.closest(NO))return null;
      if(esFila(el))return el;
      el=el.parentElement;n++;
    }
    return null;
  }
  // Centro de la zona que se desplaza (el contenedor con scroll de la lista, recortado a la ventana). La barra superior
  // fija ocupa espacio arriba: el centro «visual» del área de contenido no es el centro de la ventana.
  var scrollDe=typeof WeakMap!=='undefined'?new WeakMap():null;
  function contenedor(el){
    if(scrollDe&&scrollDe.has(el))return scrollDe.get(el);
    var p=el.parentElement,c=null;
    while(p&&p!==document.body&&p!==document.documentElement){
      var cs=getComputedStyle(p);
      if(/(auto|scroll)/.test(cs.overflowY)&&p.scrollHeight>p.clientHeight+4){c=p;break;}
      p=p.parentElement;
    }
    if(scrollDe)scrollDe.set(el,c);
    return c;
  }
  function centroDe(el){
    var c=el&&contenedor(el),top=0,bot=window.innerHeight;
    if(c){var r=c.getBoundingClientRect();top=Math.max(0,r.top);bot=Math.min(window.innerHeight,r.bottom);}
    return (top+bot)/2;
  }
  // La fila que cruza el centro de la pantalla (se prueba en varias columnas y un poco arriba/abajo por los huecos).
  function filaCentral(){
    var vw=window.innerWidth,xs=[.5,.36,.64,.24,.76],ys=[0,-24,24];
    var yc=centroDe(lista&&lista.firstElementChild||document.querySelector('#cnt')||document.body);
    for(var j=0;j<ys.length;j++){
      for(var i=0;i<xs.length;i++){
        var el=document.elementFromPoint(vw*xs[i],yc+ys[j]);
        if(el&&!(marco&&marco.contains(el))){var f=filaDe(el);if(f)return f;}
      }
    }
    return null;
  }

  // ── Marco de esquinas ───────────────────────────────────────────────────────────────────────────────────────────
  function crearMarco(){
    if(marco&&document.body.contains(marco))return marco;
    marco=document.createElement('div');marco.className='nx-foco-marco';marco.setAttribute('aria-hidden','true');
    if(!FINO)marco.classList.add('tactil');
    document.body.appendChild(marco);return marco;
  }
  function colocarMarco(el,s){
    var m=crearMarco(),r=el.getBoundingClientRect(),g=FINO?8:6;
    var cx=r.left+r.width/2,cy=r.top+r.height/2,w=el.offsetWidth*s+g*2,h=el.offsetHeight*s+g*2;
    var x=cx-w/2,y=cy-h/2;
    m.style.setProperty('--f-w',w.toFixed(1)+'px');
    m.style.setProperty('--f-h',h.toFixed(1)+'px');
    m.style.setProperty('--f-x',x.toFixed(1)+'px');
    m.style.setProperty('--f-y',y.toFixed(1)+'px');
    // El marco se pega a la fila en el mismo cuadro (sin animación de posición). Si algún contenedor de la página hace
    // que «fixed» no cuente desde la ventana (pasa en Safari con capas transformadas), se corrige con lo que mide.
    var q=m.getBoundingClientRect(),dx=x-q.left,dy=y-q.top;
    if(Math.abs(dx)>0.5||Math.abs(dy)>0.5){
      m.style.setProperty('--f-x',(x+dx).toFixed(1)+'px');
      m.style.setProperty('--f-y',(y+dy).toFixed(1)+'px');
    }
    m.classList.add('on');
  }

  // ── La rueda ────────────────────────────────────────────────────────────────────────────────────────────────────
  var PROPS=['--rw-t','--rw-o','--rw-f'];
  function soltarFila(el){el.classList.remove('nx-rueda-fila','nx-foco');for(var i=0;i<PROPS.length;i++)el.style.removeProperty(PROPS[i]);}
  function limpiar(){
    for(var i=0;i<filas.length;i++)soltarFila(filas[i]);
    if(lista)lista.classList.remove('nx-rueda','nx-rueda-tactil','nx-vidrio-no','nx-rueda-gira');
    if(marco)marco.classList.remove('on');
    lista=null;filas=[];centro=null;
  }
  // Escala de la fila central: hasta 6 % (iPhone 4 %), sin crecer más de ~18 px por lado.
  function escalaFoco(el){var w=el.offsetWidth||1;return FINO?Math.min(1.06,1+36/w):Math.min(1.04,1+24/w);}
  function pintar(){
    raf=0;
    var f=filaCentral();
    var p=f?f.parentElement:null;
    if(!p){limpiar();return;}
    if(p!==lista){limpiar();lista=p;p.classList.add('nx-rueda','nx-vidrio-no');if(!FINO)p.classList.add('nx-rueda-tactil');}
    // La luz de vidrio (parches-vidrio-global.js) no se dibuja sobre una lista que gira: seguiría al dedo con retraso.
    if(Date.now()-ultimoScroll<300)p.classList.add('nx-rueda-gira');else p.classList.remove('nx-rueda-gira');
    // Filas de la lista: hijos del mismo tipo y clase que la central.
    var nuevas=[],k=p.children;
    for(var i=0;i<k.length;i++){var c=k[i];if(c===f||(c.tagName===f.tagName&&comparten(c,f)&&medida(c)))nuevas.push(c);}
    for(var j=0;j<filas.length;j++){if(nuevas.indexOf(filas[j])<0)soltarFila(filas[j]);}
    filas=nuevas;
    // Distancia al centro de la pantalla en «filas»: posición sin transformar (la rotación y la escala son desde el centro
    // de cada fila, así que su centro en pantalla no cambia).
    var vc=centroDe(f),mejor=null,md=1e9,unidad=0;
    for(var u=0;u<filas.length;u++)unidad+=filas[u].offsetHeight;
    unidad=(unidad/filas.length||100)*1.08;
    for(var n=0;n<filas.length;n++){
      var el=filas[n],r=el.getBoundingClientRect(),d0=((r.top+r.height/2)-vc)/unidad,a0=Math.abs(d0);
      if(a0<md){md=a0;mejor=el;}
      // Franja de selección: a menos de 0,4 filas del centro la fila queda derecha y grande (como el selector del iPhone).
      var a=Math.max(0,a0-0.4),d=d0<0?-a:a;
      var rx=Math.max(-68,Math.min(68,-d*24));
      var sF=escalaFoco(el),s=a<1?sF+(0.94-sF)*a:Math.max(0.78,0.94-(a-1)*0.05);
      var o=a<0.1?1:Math.max(0.16,1-(a-0.05)*0.36);
      var b=FINO?Math.min(4.5,Math.max(0,(a-0.1)*1.7)):0;
      var br=a<0.1?1.12:Math.max(0.7,0.92-(a-0.1)*0.08);
      el.classList.add('nx-rueda-fila');
      el.style.setProperty('--rw-t','perspective(1100px) rotateX('+rx.toFixed(2)+'deg) scale('+s.toFixed(4)+')');
      el.style.setProperty('--rw-o',o.toFixed(3));
      el.style.setProperty('--rw-f',(b>0.05?'blur('+b.toFixed(2)+'px) ':'')+'brightness('+br.toFixed(3)+')'+(a<0.1?' saturate(1.08)':' saturate(.75)'));
    }
    if(centro!==mejor){if(centro)centro.classList.remove('nx-foco');centro=mejor;}
    if(centro&&md<0.75){centro.classList.add('nx-foco');colocarMarco(centro,escalaFoco(centro));}
    else{if(centro)centro.classList.remove('nx-foco');if(marco)marco.classList.remove('on');}
  }
  function pedir(){if(!raf)raf=requestAnimationFrame(pintar);}
  // Mientras se desplaza (incluida la inercia del iPhone) se recalcula en CADA cuadro hasta 300 ms después del último
  // evento de desplazamiento: la rueda y el marco van pegados al dedo.
  var ultimoScroll=0,girando=0;
  function bucle(){pintar();if(Date.now()-ultimoScroll<300)girando=requestAnimationFrame(bucle);else{girando=0;pintar();}}
  window.addEventListener('scroll',function(){
    ultimoScroll=Date.now();
    if(!girando){if(raf){cancelAnimationFrame(raf);raf=0;}girando=requestAnimationFrame(bucle);}
  },{passive:true,capture:true});
  window.addEventListener('resize',function(){if(scrollDe)scrollDe=new WeakMap();pedir();},{passive:true});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)pedir();});
  function iniciar(){
    pedir();
    // La pantalla se redibuja (cambio de módulo, filtros, recarga de datos): se vuelve a calcular en el siguiente cuadro.
    new MutationObserver(function(rs){
      for(var i=0;i<rs.length;i++){
        var t=rs[i].target;
        if(t===marco||(t.classList&&(t.classList.contains('nx-rueda-fila')||t.classList.contains('nx-foco-marco'))))continue;
        return pedir();
      }
    }).observe(document.body,{subtree:true,childList:true});
    setInterval(function(){if(!document.hidden)pedir();},1500);
  }
  if(document.body)iniciar();else document.addEventListener('DOMContentLoaded',iniciar);
})();
