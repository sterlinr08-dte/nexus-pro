/* NEXUS PRO · WhatsApp · Motion v2 · 2026-09-11
   Encargo del dueno: micro-interacciones de los iconos, animar las burbujas del
   chat y pulir las animaciones que ya existian.

   AUDITORIA PREVIA (medida, no leida):
   - El modulo YA tiene 34 @keyframes repartidos en 13 capas, y las animaciones
     de entrada funcionan: cabecera, KPIs escalonados, filas escalonadas, hoja
     de Contactos y contactos. Aqui NO se reescriben: se unifican ritmos.
   - Las burbujas estaban apagadas a proposito en CUATRO capas
     (animaciones, aura-safari-fix, burbuja-fit-final y replica-referencia).
     El motivo, literal en el codigo: "Evita capas GPU fantasma". El problema
     eran las capas de composicion que creaban transform + will-change junto al
     brillo Aura y al backdrop-filter de la burbuja, que iOS Safari manejaba mal
     -- el parpadeo que obligo a revertir el PR #311.
   - Medido hoy: ese escenario YA NO EXISTE. Las burbujas salen con
     backdrop-filter:none, will-change:auto, transform:none y filter:none, y el
     brillo Aura se elimino. Por eso se puede volver a animar, pero con las tres
     precauciones de abajo.

   PRECAUCIONES AL ANIMAR LAS BURBUJAS
   1. Solo se anima un mensaje REALMENTE nuevo. La lista se repinta entera con
      innerHTML en cada actualizacion, asi que animar por CSS (:last-child)
      volveria a animar en cada repintado: eso ES el parpadeo. Aqui se comparan
      los id de las burbujas (cada una trae id="nxWaMsg-<id>") contra los ya
      vistos, y solo se marca lo que no estaba.
   2. Al abrir un chat no se anima nada: la columna ya tiene su propia entrada.
      Tampoco al cambiar de hilo ni al cargar historial hacia arriba.
   3. La clase se quita en cuanto termina la animacion, para no dejar ninguna
      capa de composicion viva despues.

   TRAMPA DE CASCADA IMPORTANTE
   Una declaracion !important del autor GANA a las animaciones, sea cual sea la
   especificidad de estas. Como hay cuatro capas con transform:none!important
   sobre .nxWaBub, un @keyframes que animara "transform" quedaria mudo en la
   parte del movimiento. Por eso este archivo anima "translate" (propiedad
   independiente, que ninguna capa fija) y "opacity". El mismo truco ya lo usa
   nxWaSheetIn en la capa de animaciones, asi que esta probado en este proyecto.

   NO TOCA: Supabase, Zernio, envio, voz, adjuntos, scroll, teclado, Realtime,
   automatizaciones, pagos ni ninguna medida de caja.

   AVISO: el CSS vive dentro de una plantilla de JS. NO escribir nunca un acento
   grave ni la secuencia dolar-llave dentro de ella, ni en un comentario. */
(function(){
  'use strict';
  if(window.__nxWaMotionV220260911)return;
  window.__nxWaMotionV220260911=true;

  function inject(){
    if(document.getElementById('nxWaMotionV2Css'))return;
    var s=document.createElement('style');
    s.id='nxWaMotionV2Css';
    s.textContent=`
/* ============================================================
   1. RITMO UNICO
   Las 34 animaciones se escribieron en capas y momentos distintos, con cinco
   curvas y duraciones sueltas. Se unifican en una escalera de tres:
     .14s  respuesta al tacto          -- tiene que ser instantanea
     .22s  algo aparece o cambia
     .30s  entrada de un bloque entero
   Curva de salida unica: cubic-bezier(.2,.8,.2,1).
   ============================================================ */
#v-waInbox .nxCrmHomeHead,
#v-waInbox .nxWaShell,
#v-waInbox .nxWaPro{animation-duration:.30s!important;animation-timing-function:cubic-bezier(.2,.8,.2,1)!important}
#v-waInbox .nxWaProKpi,
#v-waInbox .nxWaRow,
.nxWaCtxOverlay.open .nxWaContact{animation-duration:.24s!important;animation-timing-function:cubic-bezier(.2,.8,.2,1)!important}
.nxWaCtxOverlay.open .nxWaCtxSheet{animation-duration:.28s!important;animation-timing-function:cubic-bezier(.2,.8,.2,1)!important}

/* Escalonados mas cortos: con .03s entre filas la lista entraba en cascada
   demasiado larga y se notaba lenta al abrir. .022s mantiene la sensacion de
   orden sin hacer esperar. */
#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(1){animation-delay:.03s!important}
#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(2){animation-delay:.052s!important}
#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(3){animation-delay:.074s!important}
#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(4){animation-delay:.096s!important}
#v-waInbox.nxWaAnimEnter .nxWaProKpi:nth-child(5){animation-delay:.118s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(1){animation-delay:.08s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(2){animation-delay:.102s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(3){animation-delay:.124s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(4){animation-delay:.146s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(5){animation-delay:.168s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(6){animation-delay:.19s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(7){animation-delay:.212s!important}
#v-waInbox.nxWaAnimEnter .nxWaRow:nth-child(8){animation-delay:.234s!important}

/* ============================================================
   2. MICRO-INTERACCIONES DE LOS ICONOS
   La capa de animaciones ya daba respuesta al tacto a los KPI, las filas, la
   pildora de Contactos, la lupa y los botones del composer. Faltaban justo los
   iconos del sistema que acabamos de unificar: los de la cabecera del chat, el
   menu de la burbuja, el cierre de la hoja y el boton de Bauches. Se les da la
   MISMA respuesta, para que todos se sientan del mismo sistema.
   ============================================================ */
#v-waInbox .nxWaChatHeadBtn,
#v-waInbox .nxWaChatMoreBtn,
#v-waInbox .nxWaBackMob,
#v-waInbox .nxWaBubMenu,
#v-waInbox .nxWaProActs .nxWaBauchesBtn,
#v-waInbox .nxWaRefEmoji,
#v-waInbox .nxWaRefTextPill .nxWaIconBtn,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaCtxClose,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaUhdTune{
  transition:transform .14s cubic-bezier(.2,.8,.2,1),opacity .14s ease!important;
}
#v-waInbox .nxWaChatHeadBtn:active,
#v-waInbox .nxWaChatMoreBtn:active,
#v-waInbox .nxWaBackMob:active,
#v-waInbox .nxWaBubMenu:active,
#v-waInbox .nxWaProActs .nxWaBauchesBtn:active,
#v-waInbox .nxWaRefEmoji:active,
#v-waInbox .nxWaRefTextPill .nxWaIconBtn:active,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaCtxClose:active,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaUhdTune:active{
  transform:scale(.88)!important;opacity:.7!important;
}

/* El resto del modulo ya tenia .965; se iguala a .92 para que un boton de icono
   y una tarjeta grande no respondan con intensidades distintas. */
#v-waInbox .nxWaProKpi,
#v-waInbox .nxWaRow,
#v-waInbox .nxWaVisualContactsBtn,
#v-waInbox .nxWaSearchToggle,
#v-waInbox .nxWaHeadAct,
#v-waInbox .nxWaComposer button{
  transition-duration:.14s!important;
  transition-timing-function:cubic-bezier(.2,.8,.2,1)!important;
}
#v-waInbox .nxWaSearchToggle:active,
#v-waInbox .nxWaHeadAct:active,
#v-waInbox .nxWaComposer button:active{transform:scale(.9)!important}

/* ============================================================
   3. BURBUJAS: solo lo que acaba de llegar
   Se anima translate y opacity, NUNCA transform: ver la nota de cascada de
   arriba. La especificidad (1,3,0) le gana a los cuatro animation:none.
   ============================================================ */
@keyframes nxWaBubEntraIn{from{opacity:0;translate:-6px 6px}to{opacity:1;translate:0 0}}
@keyframes nxWaBubEntraOut{from{opacity:0;translate:6px 6px}to{opacity:1;translate:0 0}}
#v-waInbox .nxWaBubWrap.nxWaBubNueva.in .nxWaBub{
  animation:nxWaBubEntraIn .22s cubic-bezier(.2,.8,.2,1) both!important;
}
#v-waInbox .nxWaBubWrap.nxWaBubNueva.out .nxWaBub{
  animation:nxWaBubEntraOut .22s cubic-bezier(.2,.8,.2,1) both!important;
}

/* ============================================================
   4. RESPETO A "REDUCIR MOVIMIENTO"
   ============================================================ */
@media(prefers-reduced-motion:reduce){
  #v-waInbox *,#v-waInbox *:before,#v-waInbox *:after,
  .nxWaCtxOverlay *,.nxWaCtxOverlay *:before,.nxWaCtxOverlay *:after{
    animation:none!important;transition:none!important;
  }
  /* La guarda de arriba, "#v-waInbox *", pesa (1,0,0) y PIERDE contra las
     reglas de burbuja de esta misma capa, que pesan (1,3,0). Se detecto
     midiendo: con "reducir movimiento" activado la burbuja seguia animandose.
     Hace falta repetir el selector exacto. La misma trampa afecta a la guarda
     que ya traia parches-whatsapp-animaciones.js. */
  #v-waInbox .nxWaBubWrap.nxWaBubNueva.in .nxWaBub,
  #v-waInbox .nxWaBubWrap.nxWaBubNueva.out .nxWaBub{animation:none!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  /* ---------- Burbujas nuevas ---------- */
  var vistos=new Set();
  var pendiente=false;

  function idsActuales(){
    var out=[],n=document.querySelectorAll('#v-waInbox .nxWaBubWrap[id^="nxWaMsg-"]');
    for(var i=0;i<n.length;i++)out.push(n[i]);
    return out;
  }

  function revisar(){
    pendiente=false;
    var nodos=idsActuales();
    if(!nodos.length)return;

    var ids=nodos.map(function(n){return n.id;});
    var conocidos=0;
    for(var i=0;i<ids.length;i++)if(vistos.has(ids[i]))conocidos++;

    /* Primera pintada, cambio de hilo o carga de historial: se toma nota sin
       animar nada. Se reconoce porque no hay NINGUN id conocido, o porque de
       golpe aparecen mas de tres desconocidos. */
    var nuevos=ids.length-conocidos;
    var siembra=(conocidos===0)||(nuevos>3);

    if(siembra){
      vistos=new Set(ids);
      return;
    }

    /* Solo se animan los desconocidos que ademas estan al final de la lista:
       un mensaje que acaba de llegar. Lo que aparezca arriba es historial. */
    for(var j=Math.max(0,nodos.length-3);j<nodos.length;j++){
      var nodo=nodos[j];
      if(vistos.has(nodo.id))continue;
      marcar(nodo);
    }
    ids.forEach(function(x){vistos.add(x);});
  }

  function sinMovimiento(){
    try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
    catch(e){return false;}
  }

  function marcar(nodo){
    /* Si el telefono pide menos movimiento, no se marca siquiera: asi no
       dependemos solo de que la guarda CSS gane la cascada. */
    if(sinMovimiento())return;
    nodo.classList.add('nxWaBubNueva');
    var burbuja=nodo.querySelector('.nxWaBub');
    var limpiar=function(){
      nodo.classList.remove('nxWaBubNueva');
      if(burbuja)burbuja.removeEventListener('animationend',limpiar);
    };
    if(burbuja)burbuja.addEventListener('animationend',limpiar,{once:true});
    /* Red de seguridad: si la animacion no llega a dispararse (pestana en
       segundo plano, movimiento reducido), la clase se quita igual. */
    setTimeout(limpiar,600);
  }

  function arrancar(){
    inject();
    var raiz=document.getElementById('v-waInbox');
    if(!raiz){
      /* La vista aun no existe. Se espera a que aparezca, observando SOLO el
         body y desconectando en cuanto se encuentra. */
      var espera=new MutationObserver(function(){
        if(document.getElementById('v-waInbox')){espera.disconnect();arrancar();}
      });
      espera.observe(document.body,{childList:true,subtree:true});
      return;
    }
    revisar();
    /* Observador acotado a #v-waInbox y agrupado por frame: no se recorre el
       DOM en cada mutacion suelta. */
    var mo=new MutationObserver(function(){
      if(pendiente)return;
      pendiente=true;
      requestAnimationFrame(revisar);
    });
    mo.observe(raiz,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar,{once:true});
  else arrancar();
})();
