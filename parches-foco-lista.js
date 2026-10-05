/* NEXUS PRO · RUEDA en listas — solo visual (dueño 05-oct-2026: «quiero que se vea como si fuera una rueda giratoria»,
   opción elegida «Rueda al desplazar»; reemplaza el foco por puntero de 59.10–59.11).
   Como el selector de hora del iPhone: al desplazar, la fila que pasa por el CENTRO de la pantalla queda en foco (grande,
   nítida, con marco de esquinas y resplandor) y las de arriba y abajo se inclinan hacia atrás como un cilindro que gira,
   cada vez más pequeñas, oscuras y (en la computadora) borrosas según su distancia al centro.
   Lo «smart»:
   · Solo LISTAS VERTICALES reales (filas del mismo tipo, con la misma clase, apiladas en la misma columna; al menos 3).
     Tablas, menús, barras, formularios, ventanas y paneles emergentes (p. ej. el del clip del chat), burbujas del chat
     y la cabecera/barra de escribir de WhatsApp no entran.
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
  // Rueda nativa: con animaciones ligadas al desplazamiento (Safari 26+, Chrome 115+) el NAVEGADOR inclina cada fila
  // según su posición, sin JavaScript en cada cuadro (fluye como el scroll nativo). Si no hay soporte, se calcula aquí.
  var NATIVA=!!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline','view()'));
  // WhatsApp sin rueda (dueño 05-oct-2026, 59.15: «Quítale el efecto al WhatsApp»): la lista de chats queda normal.
  var NO='nav,.sb,#sbEl,.tnav,form,.modal,.overlay,[role="dialog"],[class*="Pop"],[class*="pop"],[class*="Menu"],[class*="menu"],[class*="Sheet"],[class*="sheet"],[class*="Modal"],thead,#nxWaMsgsBox,.nxWaLista,.nxWaListScroll,.nxWaListCol,.nxWaRowWrap,.nxWaHead,.nxWaComposer,.nxWaCerrada,input,textarea,select,[contenteditable="true"],.nx-foco-no,.nx-vidrio,[role="menu"],[role="listbox"]';
  var lista=null,filas=[],centro=null,marco=null,raf=0;

  // ── Detección de listas (medidas sin transformar: offset*) ──────────────────────────────────────────────────────
  function comparten(a,b){
    // Filas de una tabla en modo tarjeta (Facturas en el iPhone): cada una lleva la clase de su estado (u-aldia, u-grave…).
    if(a.tagName==='TR')return a.parentElement===b.parentElement;
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
  // Una tabla de verdad (filas «table-row», computadora) no gira: inclinar celdas rompe sus columnas. Si la pantalla la
  // convierte en tarjetas (Facturas en el iPhone), cada fila es una tarjeta más y sí gira.
  function tablaReal(el){var tr=el.closest&&el.closest('tr');return !!(tr&&getComputedStyle(tr).display==='table-row');}
  function filaDe(t){
    var el=t&&t.nodeType===1?t:(t&&t.parentElement),n=0;
    if(el&&tablaReal(el))return null;
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
  // Desfase del origen de «fixed» (Safari con capas transformadas): se mide UNA vez al crear el marco y al cambiar el
  // tamaño de la ventana, no en cada cuadro (medirlo en cada cuadro obligaba a recalcular toda la página).
  var desfase=null;
  function medirDesfase(m){
    poner(m,'--f-x','0px');poner(m,'--f-y','0px');
    var q=m.getBoundingClientRect();desfase={x:-q.left,y:-q.top};
  }
  // Solo escribe (en la hoja propia): la geometría llega ya leída de la fase de lectura.
  function colocarMarco(cx,cy,w0,h0,s){
    var m=crearMarco(),g=FINO?8:6;
    if(!desfase)medirDesfase(m);
    var w=w0*s+g*2,h=h0*s+g*2;
    poner(m,'--f-w',w.toFixed(1)+'px');poner(m,'--f-h',h.toFixed(1)+'px');
    poner(m,'--f-x',(cx-w/2+desfase.x).toFixed(1)+'px');poner(m,'--f-y',(cy-h/2+desfase.y).toFixed(1)+'px');
    clase(m,'on',true);
  }

  // Los valores de la rueda y del marco NO se escriben en las filas (style="…"): van a una hoja de estilos propia que
  // ninguna otra capa vigila. Escribir en las filas en cada cuadro despertaba los MutationObserver de otras capas
  // (WhatsApp, brillo fijo, novedades…) y cada cuadro costaba cientos de ms en un iPhone (medido: 311 ms → ver bitácora).
  var hoja=null,hojaEl=null,cssPrevio='';
  function hojaPoner(css){
    if(css===cssPrevio)return;cssPrevio=css;
    try{
      if(!hoja&&!hojaEl&&typeof CSSStyleSheet==='function'&&'replaceSync' in CSSStyleSheet.prototype&&'adoptedStyleSheets' in document){
        hoja=new CSSStyleSheet();document.adoptedStyleSheets=document.adoptedStyleSheets.concat([hoja]);
      }
    }catch(e){hoja=null;}
    if(hoja){hoja.replaceSync(css);return;}
    if(!hojaEl){hojaEl=document.createElement('style');hojaEl.setAttribute('data-nx','rueda');document.head.appendChild(hojaEl);}
    hojaEl.textContent=css;
  }
  var reglasFilas='',reglaMarco='';
  function volcar(){hojaPoner(reglasFilas+reglaMarco);}

  // ── La rueda ────────────────────────────────────────────────────────────────────────────────────────────────────
  var PROPS=['--rw-t','--rw-o','--rw-f'];
  // Solo se escribe en el DOM lo que cambió: en cada cuadro de giro se recalcula todo, pero una clase o un estilo que ya
  // tiene ese valor no se vuelve a escribir. Otras capas (WhatsApp, brillo fijo…) vigilan cambios de clase/estilo con
  // MutationObserver y se redibujarían en cada cuadro (cerraba el panel del clip del chat en el iPhone).
  function clase(el,c,on){if(el.classList.contains(c)!==!!on)el.classList.toggle(c,!!on);}
  function poner(el,k,v){var m=el.__nxRw||(el.__nxRw={});if(m[k]!==v){m[k]=v;el.style.setProperty(k,v);}}
  // Al soltarla queda marcada «ya vista»: si no, su animación de entrada (nxFadeUp) se repetiría y la fila parpadearía.
  function soltarFila(el){if(NATIVA)clase(el,'nx-rueda-vista',true);clase(el,'nx-rueda-fila',false);clase(el,'nx-foco',false);if(el.hasAttribute('data-rw'))el.removeAttribute('data-rw');if(el.__nxRw){for(var i=0;i<PROPS.length;i++)el.style.removeProperty(PROPS[i]);el.__nxRw=null;}}
  function limpiar(){
    for(var i=0;i<filas.length;i++)soltarFila(filas[i]);
    if(lista)lista.classList.remove('nx-rueda','nx-rueda-tactil','nx-vidrio-no','nx-rueda-gira','nx-rueda-nativa');
    for(var r=0;r<recortes.length;r++)recortes[r].classList.remove('nx-rueda-clip');recortes=[];
    if(marco)clase(marco,'on',false);
    reglasFilas='';volcar();
    lista=null;filas=[];centro=null;
  }
  // Cada cuadro en tres fases para no obligar al navegador a recalcular la página varias veces por cuadro:
  //   1) LEER todas las posiciones de una vez, 2) CALCULAR, 3) ESCRIBIR solo lo que cambió.
  // La lista y sus filas se detectan una vez y se reutilizan; se vuelven a buscar solo cuando la pantalla cambia
  // (MutationObserver), cuando la lista sale del centro o al cambiar el tamaño de la ventana.
  var sucio=true,recortes=[];
  function detectar(){
    var f=filaCentral(),p=f?f.parentElement:null;
    if(!p){limpiar();return false;}
    if(p!==lista){limpiar();lista=p;p.classList.add('nx-rueda','nx-vidrio-no');if(!FINO)p.classList.add('nx-rueda-tactil');if(NATIVA)p.classList.add('nx-rueda-nativa');}
    // La luz de vidrio (parches-vidrio-global.js) no se dibuja sobre la lista que gira (59.14). La rueda ya resalta la
    // del centro con su marco y resplandor.
    var nuevas=[],k=p.children;
    for(var i=0;i<k.length;i++){var c=k[i];if(c===f||(c.tagName===f.tagName&&comparten(c,f)&&medida(c)))nuevas.push(c);}
    for(var j=0;j<filas.length;j++){if(nuevas.indexOf(filas[j])<0)soltarFila(filas[j]);}
    filas=nuevas;sucio=false;
    // Nativa: la animación toma el centro de la caja que se desplaza más cercana. En el iPhone la lista va dentro de
    // cajas con overflow:auto que NO se desplazan (.nc): la rueda giraba alrededor del centro de toda la lista y no del
    // de la pantalla. A esas cajas quietas se les pone overflow:clip (no son zona de desplazamiento, se ven igual).
    if(NATIVA&&filas.length){
      var real=contenedor(filas[0]),a=p.parentElement,nc=[];
      while(a&&a!==real&&a!==document.body&&a!==document.documentElement){
        var ca=getComputedStyle(a);
        if(!a.classList.contains('nx-rueda-clip')&&(ca.overflowY!=='visible'||ca.overflowX!=='visible')&&ca.overflowY!=='clip'){
          if(a.scrollHeight<=a.clientHeight+1&&a.scrollWidth<=a.clientWidth+1)nc.push(a);
        }else if(a.classList.contains('nx-rueda-clip'))nc.push(a);
        a=a.parentElement;
      }
      for(var r=0;r<recortes.length;r++)if(nc.indexOf(recortes[r])<0)recortes[r].classList.remove('nx-rueda-clip');
      for(var r2=0;r2<nc.length;r2++)clase(nc[r2],'nx-rueda-clip',true);
      recortes=nc;
    }
    // Cada fila lleva su número (una sola escritura por fila al detectar); los valores van a la hoja propia.
    for(var q=0;q<filas.length;q++){var nq=String(q);if(filas[q].getAttribute('data-rw')!==nq)filas[q].setAttribute('data-rw',nq);clase(filas[q],'nx-rueda-fila',true);}
    return true;
  }
  function pintar(reintento){
    raf=0;
    if(sucio||!lista||!filas.length||!document.documentElement.contains(lista)){if(!detectar())return;}
    // ── 1) LEER ──
    var vc=centroDe(filas[0]),n=filas.length,rs=new Array(n),hs=new Array(n),ws=new Array(n),unidad=0,cruza=false;
    for(var i=0;i<n;i++){
      var el=filas[i];rs[i]=el.getBoundingClientRect();hs[i]=el.offsetHeight;ws[i]=el.offsetWidth;unidad+=hs[i];
      if(rs[i].top<=vc&&rs[i].bottom>=vc)cruza=true;
    }
    unidad=(unidad/n||100)*1.08;
    // La lista ya no cruza el centro (se desplazó fuera o cambió la pantalla): se busca de nuevo una sola vez.
    if(!cruza&&!reintento){sucio=true;return pintar(true);}
    if(!cruza){limpiar();return;}
    // ── 2) CALCULAR ──
    var mejor=-1,md=1e9,vals=new Array(n);
    for(var k=0;k<n;k++){
      var d0=((rs[k].top+rs[k].height/2)-vc)/unidad,a0=Math.abs(d0);
      if(a0<md){md=a0;mejor=k;}
      // Fuera de la pantalla (más de 4 filas del centro) todas quedan igual: no se recalculan cuadro a cuadro.
      var a=Math.min(4,Math.max(0,a0-0.4)),d=d0<0?-a:a;
      var rx=Math.max(-68,Math.min(68,-d*24));
      var sF=FINO?Math.min(1.06,1+36/(ws[k]||1)):Math.min(1.04,1+24/(ws[k]||1));
      var s=a<1?sF+(0.94-sF)*a:Math.max(0.78,0.94-(a-1)*0.05);
      var o=a<0.1?1:Math.max(0.16,1-(a-0.05)*0.36);
      // Mientras gira no hay desenfoque (es lo más caro de dibujar); vuelve al quedarse quieto.
      var b=(FINO&&!girando)?Math.min(4.5,Math.max(0,(a-0.1)*1.7)):0;
      var br=a<0.1?1.12:Math.max(0.7,0.92-(a-0.1)*0.08);
      vals[k]=['perspective(1100px) rotateX('+rx.toFixed(1)+'deg) scale('+s.toFixed(3)+')',o.toFixed(2),
               (b>0.05?'blur('+b.toFixed(1)+'px) ':'')+'brightness('+br.toFixed(2)+')'+(a<0.1?' saturate(1.08)':' saturate(.75)'),sF];
    }
    // ── 3) ESCRIBIR (solo lo que cambió) ──
    var gira=Date.now()-ultimoScroll<300;
    clase(lista,'nx-rueda-gira',gira);if(marco)clase(marco,'gira',gira);
    // Nativa: el navegador ya inclina las filas; aquí solo se elige la del centro y se coloca el marco.
    var css='';
    if(!NATIVA)for(var w=0;w<n;w++)css+='.nx-rueda>[data-rw="'+w+'"]{--rw-t:'+vals[w][0]+';--rw-o:'+vals[w][1]+';--rw-f:'+vals[w][2]+'}';
    reglasFilas=css;
    var nuevo=mejor>=0?filas[mejor]:null;
    if(centro!==nuevo){if(centro)clase(centro,'nx-foco',false);centro=nuevo;}
    if(centro&&md<0.75){
      clase(centro,'nx-foco',true);
      var r=rs[mejor];colocarMarco(r.left+r.width/2,r.top+r.height/2,ws[mejor],hs[mejor],NATIVA?1.03:vals[mejor][3]);
    }else{if(centro)clase(centro,'nx-foco',false);if(marco)clase(marco,'on',false);}
    volcar();
  }
  function pedir(){if(!raf)raf=requestAnimationFrame(function(){pintar(false);});}
  // Mientras se desplaza (incluida la inercia del iPhone) se recalcula en CADA cuadro hasta 300 ms después del último
  // evento de desplazamiento: la rueda y el marco van pegados al dedo.
  var ultimoScroll=0,girando=0;
  function bucle(){pintar(false);if(Date.now()-ultimoScroll<300)girando=requestAnimationFrame(bucle);else{girando=0;pintar(false);}}
  window.addEventListener('scroll',function(){
    ultimoScroll=Date.now();
    if(!girando){if(raf){cancelAnimationFrame(raf);raf=0;}girando=requestAnimationFrame(bucle);}
  },{passive:true,capture:true});
  window.addEventListener('resize',function(){if(scrollDe)scrollDe=new WeakMap();sucio=true;desfase=null;pedir();},{passive:true});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)pedir();});
  function iniciar(){
    pedir();
    // La pantalla se redibuja (cambio de módulo, filtros, recarga de datos): se vuelve a calcular en el siguiente cuadro.
    new MutationObserver(function(rs){
      for(var i=0;i<rs.length;i++){
        var t=rs[i].target;
        if(t===marco||(t.classList&&(t.classList.contains('nx-rueda-fila')||t.classList.contains('nx-foco-marco'))))continue;
        sucio=true;return pedir();
      }
    }).observe(document.body,{subtree:true,childList:true});
    setInterval(function(){if(!document.hidden){sucio=true;pedir();}},1500);
  }
  if(document.body)iniciar();else document.addEventListener('DOMContentLoaded',iniciar);
})();
