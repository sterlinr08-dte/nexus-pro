/* NEXUS PRO · WhatsApp · texto del chat en su forma original · 2026-09-11
   Encargo del dueno: "Quita las mayusculas en el chat".

   DE DONDE VENIAN:
   index.html, linea 2342, con este rotulo literal en el propio codigo:
       /* ==== MAYUSCULAS GLOBALES ==== *(/)
   Es una sola declaracion text-transform:uppercase sobre 28 selectores, y el
   primero de ellos es "body", asi que TODA la aplicacion hereda mayusculas.
   Entre los otros 27 estan "textarea" y "textarea::placeholder": por eso lo que
   el dueno escribe en el compositor tambien se ve en mayusculas mientras lo
   teclea.

   Conviene saber que era solo VISUAL: text-transform no cambia el texto, solo
   como se dibuja. Lo que se guardaba en Supabase y lo que se enviaba por
   WhatsApp siempre fue el texto tal cual lo escribio cada quien. Aqui no se
   repara ningun dato; no hay nada que reparar.

   ALCANCE: SOLO el chat, que es lo que se pidio.
     - el cuerpo de las burbujas y lo que va dentro (cita, pie, media)
     - la cita del mensaje al que se responde
     - el compositor y su texto de ayuda
     - el buscador dentro del chat
   NO se toca el resto de la aplicacion, ni la bandeja de conversaciones, ni las
   etiquetas de interfaz del propio chat: la fecha ("HOY"), las etiquetas de
   estado y los botones siguen en mayusculas, porque ahi las mayusculas son una
   decision de diseno y no el texto de nadie.

   NOTA PARA EL DUENO: la vista previa de cada conversacion en la bandeja
   (.nxWaWho span) tambien es texto del cliente y sigue en mayusculas, porque
   eso es la bandeja y no el chat. Si lo quiere, es una linea mas.

   AVISO: el CSS vive dentro de una plantilla de JS. NO escribir nunca un acento
   grave ni la secuencia dolar-llave dentro de ella, ni en un comentario. */
(function(){
  'use strict';
  if(window.__nxWaTextoNatural20260911)return;
  window.__nxWaTextoNatural20260911=true;

  function inject(){
    if(document.getElementById('nxWaTextoNaturalCss'))return;
    var s=document.createElement('style');
    s.id='nxWaTextoNaturalCss';
    s.textContent=`
/* El mensaje, tal y como lo escribieron. Los hijos heredan, asi que esto cubre
   el cuerpo, la cita, el pie de hora y los textos de la multimedia. */
#v-waInbox .nxWaBub,
#v-waInbox .nxWaBub *,
#v-waInbox .nxWaQuote,
#v-waInbox .nxWaQuote b,
#v-waInbox .nxWaQuote span{text-transform:none!important}

/* La cita del mensaje al que se esta respondiendo, encima del compositor.
   Se incluye tambien el "Respondiendo a <nombre>" de arriba: lleva dentro el
   nombre del cliente, y dejarlo en mayusculas justo encima de una cita en
   minusculas, en la misma cajita, se leeria como un fallo. */
#v-waInbox .nxWaReplyBar .tx b,
#v-waInbox .nxWaReplyBar .tx span{text-transform:none!important}

/* Lo que el dueno escribe. "textarea" y "textarea::placeholder" estan los dos
   en la regla global, asi que hay que apagar los dos o el texto de ayuda
   seguiria gritando. */
#v-waInbox #nxWaTexto,
#v-waInbox .nxWaRefTextPill textarea,
#v-waInbox .nxWaComposer textarea{text-transform:none!important}
#v-waInbox #nxWaTexto::placeholder,
#v-waInbox .nxWaRefTextPill textarea::placeholder,
#v-waInbox .nxWaComposer textarea::placeholder{text-transform:none!important}

/* El buscador dentro de la conversacion. */
#v-waInbox #nxWaSearchInput{text-transform:none!important}
#v-waInbox #nxWaSearchInput::placeholder{text-transform:none!important}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});
  else inject();
})();
