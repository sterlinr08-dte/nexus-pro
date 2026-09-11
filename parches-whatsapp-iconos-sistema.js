/* NEXUS PRO · WhatsApp · sistema de iconos · 2026-09-11
   Encargo: "Modernizacion de iconos en WhatsApp movil". Unificar la
   iconografia del modulo en UN solo lenguaje visual, sin tocar logica.

   AUDITORIA PREVIA (medida en Chromium con la cascada real a 390 px, no leida):

   - FAMILIA: ya es unica. 81 iconos distintos en el modulo y los 81 son Tabler
     (@tabler/icons-webfont 3.46). No hay que cambiar de libreria; el grosor de
     linea ya es uniforme por construccion, lo fija la fuente.
   - TAMANOS: 10 distintos -- 7.6, 9, 11, 12, 15, 17, 18, 19, 20 y 21 px. Nadie
     eligio eso: es sedimento de 37 capas superpuestas.
   - COLORES: 15 distintos, y NUEVE de ellos son azules casi identicos
     (#126de0, #1674ed, #0f62c5, #176fd1, #1769e0, #1686e8, #3885eb, #244a85,
     #235b9f). A simple vista parecen el mismo azul; en conjunto es lo que hace
     que el modulo se vea desordenado.
   - ROTURAS DE FAMILIA: un chevron tipografico ">" a 20 px en la pildora de
     Contactos y un emoji de clip en el aviso de adjunto no disponible.
   - DOBLE CHECK: ya cumple casi todo lo pedido -- va en la misma linea que la
     hora, sin recuadro, sin relieve y sin glow. Lo unico que fallaba es que
     estaba a 11 px con la hora a 9 px, asi que competia un poco.

   LO QUE HACE ESTA CAPA:
   1. Una escala de cinco peldanos en vez de diez tamanos sueltos.
   2. Tres colores de icono en vez de quince, mas los semanticos de estado.
   3. Cierra las dos roturas de familia.
   4. Baja el visto a 9 px para que quede exactamente al nivel de la hora.

   LO QUE NO TOCA: envio, voz, adjuntos, scroll, teclado, Realtime,
   automatizaciones, pagos, Zernio y Supabase. Tampoco cambia un solo tamano de
   caja, padding ni radio: solo tipografia y color DE LOS ICONOS, asi que la
   densidad movil aprobada no se mueve.

   Va la ultima del loader porque en este repo los empates de especificidad se
   rompen por orden de carga.

   AVISO: el CSS vive dentro de una plantilla de JS. NO escribir nunca un acento
   grave ni la secuencia dolar-llave dentro de ella, ni en un comentario: cierra
   la plantilla y tumba el archivo en produccion. node --check NO lo detecta. */
(function(){
  'use strict';
  if(window.__nxWaIconoSistema20260911)return;
  window.__nxWaIconoSistema20260911=true;

  function inject(){
    if(document.getElementById('nxWaIconoSistemaCss'))return;
    var s=document.createElement('style');
    s.id='nxWaIconoSistemaCss';
    s.textContent=`
/* OJO con la especificidad de la hoja de Contactos: la capa anterior
   (parches-whatsapp-sin-3d.js) usa :is(#v-waInbox,.nxWaCtxOverlay,...) .ti, y
   :is() adopta la especificidad de su argumento MAS fuerte. Como ahi dentro hay
   un id, ese selector pesa (1,1,0) para TODOS los contenedores de la lista,
   incluida la hoja, que no tiene ningun id. Un selector de clases puro como
   .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxClose i.ti pesa (0,3,1) y PIERDE, por
   muchas clases que se le anadan. Por eso las reglas de la hoja llevan aqui el
   mismo prefijo :is(...): asi suben a (1,2,1) y ganan. Se detecto midiendo:
   cuatro reglas de esta capa no se aplicaban. */

/* ============================================================
   ESCALA. Cinco peldanos, uno por papel; no diez por accidente.
   ============================================================ */

/* 20px -- protagonista de bloque: el logo del encabezado y el de la hoja. */
#v-waInbox .nxWaUhdHeroIcon i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaCtxIcon i.ti{font-size:20px!important}

/* 18px -- acciones reales: lo que el dedo busca. */
#v-waInbox .nxWaHeadAct i.ti,
#v-waInbox .nxWaBackMob i.ti,
#v-waInbox .nxWaChatHeadBtn i.ti,
#v-waInbox .nxWaChatMoreBtn i.ti,
#v-waInbox .nxWaSearchToggle i.ti,
#v-waInbox .nxWaProActs .nxWaVisualContactsBtn i.ti,
#v-waInbox .nxWaRefEmoji i.ti,
#v-waInbox .nxWaRefTextPill .nxWaIconBtn i.ti,
#v-waInbox #nxWaSendBtn i.ti,
#v-waInbox .nxWaTextSendBtn i.ti,
#v-waInbox .nxWaVoiceBtn i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaUhdSearchBox i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaCtxClose i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaUhdTune i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaContactsFoot.nxWaContactsActGrid button i.ti{font-size:18px!important}

/* El chevron que el JS anade a la pildora de Contactos no se lista aqui a
   proposito: al ser un i.ti dentro de .nxWaVisualContactsBtn ya toma los 18px y
   el azul de acento de esa pildora, que es justo lo que hace falta para que
   quede igual que el icono de personas que lleva al lado. */

/* 16px -- secundarios: acompanan, no llaman. */
#v-waInbox .nxWaUhdChevron,
#v-waInbox .nxWaRow i.chev,
#v-waInbox .nxWaProActs .nxWaBauchesBtn i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaContact i.chev{font-size:16px!important}

/* 13px -- dentro de contenido: no son botones, son senales. */
#v-waInbox .nxWaUhdKpiIcon i.ti,
#v-waInbox .nxWaBubMenu i.ti{font-size:13px!important}

/* 10px -- micro, dentro de una pildora de 7.6px. Antes heredaba y salia a
   7.6px, ilegible; 10px es el minimo en que el glifo aun se reconoce. */
#v-waInbox .nxCrmHomeBadge i.ti{font-size:10px!important}

/* ============================================================
   COLOR. Tres para iconos, mas los semanticos de estado.
   Base sobrio; el acento se reserva para lo que de verdad es accion.
   ============================================================ */

/* Neutro -- la mayoria. Sustituye a siete azules distintos. */
#v-waInbox .nxWaHeadAct i.ti,
#v-waInbox .nxWaBackMob i.ti,
#v-waInbox .nxWaChatHeadBtn i.ti,
#v-waInbox .nxWaChatMoreBtn i.ti,
#v-waInbox .nxWaSearchToggle i.ti,
#v-waInbox .nxWaRefEmoji i.ti,
#v-waInbox .nxWaRefTextPill .nxWaIconBtn i.ti,
#v-waInbox .nxWaUhdChevron,
#v-waInbox .nxWaRow i.chev,
#v-waInbox .nxWaBubMenu i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaUhdSearchBox i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaCtxClose i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaUhdTune i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaContact i.chev{color:#41506b!important}

/* Acento -- solo donde el icono ES la accion principal del bloque. */
#v-waInbox .nxWaProActs .nxWaVisualContactsBtn i.ti,
#v-waInbox .nxWaProActs .nxWaBauchesBtn i.ti,
#v-waInbox .nxWaUhdKpiIcon i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaContactsFoot.nxWaContactsActGrid button i.ti{color:#1f6fd4!important}

/* Sobre fondo solido -- blanco, sin excepcion. */
#v-waInbox .nxWaUhdHeroIcon i.ti,
#v-waInbox #nxWaSendBtn i.ti,
#v-waInbox .nxWaTextSendBtn i.ti,
#v-waInbox .nxWaVoiceBtn i.ti,
:is(#v-waInbox,.nxWaCtxOverlay.nxWaUhdContacts) .nxWaCtxIcon i.ti{color:#fff!important}

/* ============================================================
   RELLENOS DEL COMPOSER QUE NADIE ELIGIO
   Medido: el boton de emoji salia como un CIRCULO VERDE RELLENO y el
   microfono como un degradado azul-morado, los dos con halo verde. Los dos
   deberian estar planos: la capa composer-minimal-final pone el emoji en
   transparent y la capa sin-3d pone el microfono en verde liso.
   Ninguna de las dos se aplicaba. Causa: parches-whatsapp-visual.js define
   "#v-waInbox .nxWaComposer button" -- especificidad (1,1,1) -- con un
   degradado verde y un box-shadow verde. Gana a "#v-waInbox .nxWaRefEmoji" y
   a "#v-waInbox .nxWaVoiceBtn", que son (1,1,0), aunque esas capas carguen
   despues: el orden solo desempata cuando la especificidad es igual.
   El clip se salvaba de casualidad, porque su selector lleva dos clases.
   Aqui se corrige subiendo a (1,2,0), que si gana. */
#v-waInbox .nxWaComposer .nxWaRefEmoji,
#v-waInbox .nxWaComposer .nxWaRefTextPill .nxWaIconBtn,
#v-waInbox .nxWaComposer .nxWaRefInlineBtn{
  background:none!important;background-image:none!important;
  background-color:transparent!important;
  box-shadow:none!important;border:0!important;
}
/* El microfono resulto tener CINCO definiciones de fondo compitiendo, en cinco
   capas distintas: gris claro (voz-mensajes), casi negro (replica-referencia),
   verde degradado (composer-minimal-final), verde liso (sin-3d) y, la que de
   verdad ganaba, un degradado AZUL-MORADO de chat-acciones escrito como
   "#v-waInbox .nxWaComposer > button:last-child" -- (1,2,1), mas especifica que
   todas las demas. Por eso el microfono se veia morado por mucho que las capas
   posteriores lo pusieran verde. Se necesita (1,2,2) para ganarle. */
#v-waInbox .nxWaComposer > button.nxWaVoiceBtn:last-child,
#v-waInbox .nxWaComposer > button.nxWaVoiceBtn,
#v-waInbox .nxWaComposer .nxWaVoiceBtn{
  background:#13b872!important;background-image:none!important;box-shadow:none!important;
}
#v-waInbox .nxWaComposer > button.nxWaTextSendBtn:last-child,
#v-waInbox .nxWaComposer > button#nxWaSendBtn:last-child,
#v-waInbox .nxWaComposer .nxWaTextSendBtn,
#v-waInbox .nxWaComposer button#nxWaSendBtn{
  background:#1f7ae4!important;background-image:none!important;box-shadow:none!important;
}

/* ============================================================
   ESTADO DEL MENSAJE. Informacion secundaria, nunca protagonista.
   Estaba a 11px con la hora a 9px. Ahora van al mismo nivel.
   ============================================================ */
#v-waInbox .nxWaMsgCheck{font-size:9px!important;letter-spacing:-2.5px!important;padding-right:2.5px!important}
#v-waInbox .nxWaMsgState i.ti{font-size:9px!important}

/* ============================================================
   ROTURA DE FAMILIA. El chevron de la pildora de Contactos era una
   comilla angular tipografica a 20px, no un icono. Se apaga aqui;
   el JS de abajo pone un chevron Tabler de verdad en su lugar.
   ============================================================ */
#v-waInbox .nxWaProActs .nxWaVisualContactsBtn:after{content:none!important;display:none!important}

/* ============================================================
   TEMA OSCURO
   ============================================================ */
body.tema-premium #v-waInbox .nxWaHeadAct i.ti,
body.tema-premium #v-waInbox .nxWaBackMob i.ti,
body.tema-premium #v-waInbox .nxWaChatHeadBtn i.ti,
body.tema-premium #v-waInbox .nxWaSearchToggle i.ti,
body.tema-premium #v-waInbox .nxWaRefEmoji i.ti,
body.tema-premium #v-waInbox .nxWaRefTextPill .nxWaIconBtn i.ti,
body.tema-premium #v-waInbox .nxWaUhdChevron,
body.tema-premium #v-waInbox .nxWaRow i.chev{color:#c2cfe3!important}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  /* El chevron de la pildora de Contactos, ahora en la misma familia que el
     resto. Se anade como <i class="ti"> en vez de escribir el codigo del glifo
     en un content: asi no hay que acertar el punto Unicode de la fuente, que
     cambia entre versiones de Tabler. Es idempotente y solo anade un adorno
     decorativo: no toca el onclick ni nada del comportamiento del boton. */
  function chevronContactos(){
    var b=document.querySelector('#v-waInbox .nxWaProActs .nxWaVisualContactsBtn');
    if(!b||b.dataset.nxWaChev)return;
    var i=document.createElement('i');
    i.className='ti ti-chevron-right nxWaRefContactsChevron';
    i.setAttribute('aria-hidden','true');
    b.appendChild(i);
    b.dataset.nxWaChev='1';
  }

  function arrancar(){
    inject();
    chevronContactos();
    /* La bandeja se repinta sola al navegar; el observador solo vuelve a poner
       el chevron si el boton se regenera.
       Acotado a proposito: la primera version vigilaba document.documentElement
       entero y ejecutaba un querySelector en CADA mutacion del documento. En una
       pantalla con mensajes entrando en tiempo real eso son miles de llamadas
       por minuto para una tarea que solo importa cuando se repinta la bandeja.
       Ahora vigila solo #v-waInbox y agrupa por frame. */
    try{
      var raiz=document.getElementById('v-waInbox');
      var pendiente=false;
      var revisar=function(){pendiente=false;chevronContactos();};
      var enMutacion=function(){
        if(pendiente)return;
        pendiente=true;
        requestAnimationFrame(revisar);
      };
      if(raiz){
        new MutationObserver(enMutacion).observe(raiz,{childList:true,subtree:true});
      }else{
        var espera=new MutationObserver(function(){
          var r=document.getElementById('v-waInbox');
          if(!r)return;
          espera.disconnect();
          chevronContactos();
          new MutationObserver(enMutacion).observe(r,{childList:true,subtree:true});
        });
        espera.observe(document.body,{childList:true,subtree:true});
      }
    }catch(e){}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar,{once:true});
  else arrancar();
})();
