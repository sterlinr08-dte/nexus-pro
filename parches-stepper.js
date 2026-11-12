/* NEXUS PRO · Controles «− número +» que responden al toque (dueño, 12-nov-2026: reel `Dfor45ND65b`, «1 y 2»).
 * Variante 1 «Toque suave»: el botón tocado se hunde y vuelve.  Variante 2 «Deslizar»: el número nuevo entra desde el
 * lado que se tocó (desde la derecha al sumar, desde la izquierda al restar) y crece un poco al llegar.
 * SOLO ASPECTO. No cambia cantidades, precios ni existencias: mira el toque, deja que la función de siempre haga su
 * trabajo (nxPosQty, nxFacQtyStep, nxAboPasoMeses…) y anima el número SOLO si de verdad cambió. Si la cantidad no cambió
 * (sin existencia, mínimo alcanzado), no se mueve nada.
 * Funciona con cualquier control formado por dos botones y un número en medio dentro de las cajas de CAJAS (el carrito
 * se vuelve a pintar entero en cada toque: por eso se busca el control por su posición después del repintado).
 * Respeta «reducir movimiento». Apagar: localStorage.nx_stepper_off='1'  ·  window.NX_STEPPER=false
 */
(function(){'use strict';
if(window.__nxStepper)return;
try{if(window.NX_STEPPER===false||localStorage.getItem('nx_stepper_off')==='1')return;}catch(_){}
var CAJAS='.citqty, .stp, .pgStep, .ffCant';           // carrito del POS, líneas de factura del POS, meses adelantados, financiamiento
var CURVA='cubic-bezier(.23,1,.32,1)';
function quieto(){try{return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(_){return false;}}
function partes(w){
  var b=w.querySelectorAll('button'),n=w.querySelector('input, output, b');
  if(b.length!==2||!n)return null;
  return {menos:b[0],mas:b[1],num:n};
}
function valor(n){return String(n&&('value' in n)&&n.tagName!=='B'?n.value:(n?n.textContent:'')).trim();}
function claseDe(w){var c=CAJAS.split(',');for(var i=0;i<c.length;i++){var k=c[i].trim();if(w.matches(k))return k;}return '';}
function animar(w,lado){
  var p=partes(w);if(!p||!p.num.animate)return;
  try{
    p.num.animate([{transform:'translateX('+(lado*9)+'px) scale(.86)',opacity:.15},{transform:'none',opacity:1}],{duration:190,easing:CURVA});
    (lado>0?p.mas:p.menos).animate([{transform:'scale(.88)'},{transform:'none'}],{duration:170,easing:CURVA});
  }catch(_){}
}
document.addEventListener('click',function(ev){
  if(quieto()||!ev.target.closest)return;
  var btn=ev.target.closest('button'),w=btn&&btn.closest(CAJAS);if(!w)return;
  var p=partes(w);if(!p||btn.disabled)return;
  var lado=btn===p.mas?1:btn===p.menos?-1:0;if(!lado)return;
  var k=claseDe(w),i=Array.prototype.indexOf.call(document.querySelectorAll(k),w),antes=valor(p.num),hecho=false;
  var ver=function(){
    if(hecho)return;
    var w2=document.contains(w)?w:document.querySelectorAll(k)[i];if(!w2)return;
    var p2=partes(w2);if(!p2||valor(p2.num)===antes)return;
    hecho=true;animar(w2,lado);
  };
  requestAnimationFrame(function(){ver();requestAnimationFrame(ver);});
  setTimeout(ver,260); // por si la función de siempre tarda un momento en repintar
},true);
window.__nxStepper={version:'20261112a'};
})();
