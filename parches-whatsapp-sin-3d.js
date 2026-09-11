/* NEXUS PRO · WhatsApp sin 3D · 2026-09-11
   Encargo del dueno: "vamos a quitar los 3D del whatsapp".

   Que se entiende por 3D aqui y por que se quita:
   1) El badge global de iconos. parches-seguros-base.js convierte TODO .ti
      "suelto" en una pastilla de 1.7em con degradado #8b5cf6 -> #22d3ee, sombra
      interior y un ::after de reflejo cristalino. Dentro de WhatsApp eso pinta
      circulos morados en relieve incluso dentro de los cuadros verde/azul del
      hero, de los KPI y de la hoja de Contactos, porque esos envoltorios son
      <div> y no entran en la lista de excepciones de la base (.btn, button, td,
      label, ...). parches-whatsapp-iconos-flat.js ya lo apagaba, pero solo
      dentro de la burbuja y solo para los envoltorios, no para el glifo interno.
   2) El relieve de las tarjetas: bisel blanco superior (inset 0 1px 0 #fff),
      sombras volumetricas de color y degradados diagonales 135/145/165deg, que
      son lo que hace que un elemento plano parezca abombado.

   Lo que NO se toca, a proposito:
   - El fondo del chat (.nxWaMsgs) y el selector de fondo (.nxWaWallChoice):
     ahi el degradado ES el contenido, no un efecto de relieve.
   - backdrop-filter / blur: el dueno aprobo la estetica glass; difuminar no es
     relieve. Solo se quitan biseles, sombras de volumen y degradados diagonales.
   - Radios, tamanos, paddings, tipografia y layout: esto es solo aplanado de
     color y sombra. Ninguna medida cambia, asi que no altera la densidad que ya
     se aprobo en movil.
   - Nada de logica: ni envio, ni Realtime, ni scroll, ni teclado, ni Supabase.

   Por que esta capa va LA ULTIMA del loader: en este repo los empates de
   especificidad se rompen por orden de carga. Varios intentos anteriores de
   aplanar iconos fallaron por estar en la capa 12 (iconos-flat) peleando contra
   las capas 19-24. Yendo al final no hay empate que perder.

   AVISO: el CSS de abajo vive dentro de una plantilla de JS. NO escribir nunca
   un acento grave ni la secuencia dolar-llave dentro de ella, ni siquiera en un
   comentario: cierra la plantilla y tumba el archivo entero en produccion
   (paso el 2026-09-10 con replica-referencia). node --check NO lo detecta. */
(function(){
  'use strict';
  if(window.__nxWaSin3d20260911)return;
  window.__nxWaSin3d20260911=true;

  function inject(){
    if(document.getElementById('nxWaSin3dCss'))return;
    var s=document.createElement('style');
    s.id='nxWaSin3dCss';
    s.textContent=`
/* ============================================================
   1. Ningun icono de WhatsApp es una pastilla 3D
   ============================================================ */
/* Respaldo sin :is() para Safari antiguo: si el navegador no entendiera :is(),
   descartaria ese bloque entero y el modulo volveria a llenarse de circulos
   morados. Esta pareja cubre el caso mas importante -- la bandeja -- con
   selectores que entiende cualquier version. */
#v-waInbox .ti{
  width:auto!important;height:auto!important;
  min-width:0!important;min-height:0!important;
  border:0!important;border-radius:0!important;
  background:none!important;background-image:none!important;
  box-shadow:none!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  color:inherit!important;
  overflow:visible!important;
  filter:none!important;text-shadow:none!important;
}
#v-waInbox .ti::after{content:none!important;display:none!important}
/* El ::before NO se toca en su "content": ahi es donde la fuente Tabler dibuja
   el glifo, y vaciarlo borraria todos los iconos. Solo se le quita cualquier
   fondo, sombra o filtro, que es el unico hueco que dejaba la regla de arriba:
   se apagaba el ::after (el reflejo) pero nunca el ::before. */
#v-waInbox .ti::before{
  background:none!important;background-image:none!important;
  box-shadow:none!important;filter:none!important;
  border:0!important;outline:0!important;
}

:is(#v-waInbox,.nxWaCtxOverlay,.nxWaCtx,.nxWaModalOv,.nxWaPreviewOv,.nxWaMhOv,
    .nxWaChatPop,.nxWaAttachPop,.nxWaEmojiPop,.nxWaBusy,.nxWaAutoOverlay,
    .nxWaAdminDelOv,.nxWaRulesOverlay,.nxWaTplOverlay,.nxWaEnvioMasivoOverlay) .ti{
  width:auto!important;height:auto!important;
  min-width:0!important;min-height:0!important;
  border:0!important;border-radius:0!important;
  background:none!important;background-image:none!important;
  box-shadow:none!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  color:inherit!important;
  overflow:visible!important;
  filter:none!important;text-shadow:none!important;
}
:is(#v-waInbox,.nxWaCtxOverlay,.nxWaCtx,.nxWaModalOv,.nxWaPreviewOv,.nxWaMhOv,
    .nxWaChatPop,.nxWaAttachPop,.nxWaEmojiPop,.nxWaBusy,.nxWaAutoOverlay,
    .nxWaAdminDelOv,.nxWaRulesOverlay,.nxWaTplOverlay,.nxWaEnvioMasivoOverlay) .ti::after{
  content:none!important;display:none!important;
}
:is(#v-waInbox,.nxWaCtxOverlay,.nxWaCtx,.nxWaModalOv,.nxWaPreviewOv,.nxWaMhOv,
    .nxWaChatPop,.nxWaAttachPop,.nxWaEmojiPop,.nxWaBusy,.nxWaAutoOverlay,
    .nxWaAdminDelOv,.nxWaRulesOverlay,.nxWaTplOverlay,.nxWaEnvioMasivoOverlay) .ti::before{
  background:none!important;background-image:none!important;
  box-shadow:none!important;filter:none!important;
  border:0!important;outline:0!important;
}

/* ============================================================
   2. Bandeja: tarjetas planas, sin bisel ni sombra de volumen
   ============================================================ */
#v-waInbox .nxCrmHomeHead{
  background:rgba(255,255,255,.94)!important;
  box-shadow:none!important;
}
/* El :before de la cabecera NO se quita: son dos manchas de color ambiente
   (azul y verde), no un efecto de relieve. Quitarlas dejaria la cabecera blanca
   del todo y eso ya no seria "quitar el 3D" sino cambiar el diseno. */
#v-waInbox .nxWaProKpi{
  background:#fff!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaListCol,
#v-waInbox .nxWaDetailCol{box-shadow:none!important}
#v-waInbox .nxWaSearchToggle{box-shadow:none!important}
#v-waInbox .nxWaRow{box-shadow:none!important}
#v-waInbox .nxWaRow.on{background:#eef6ff!important}
#v-waInbox .nxWaAv{
  background:#e4f0ff!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaBadge{box-shadow:none!important}
#v-waInbox .nxWaProActs .nxWaVisualContactsBtn{
  background:#f2f8ff!important;
  box-shadow:none!important;
}

/* ============================================================
   3. Ventana de chat: cabecera, burbujas y avisos planos
   ============================================================ */
#v-waInbox .nxWaHead{
  background:rgba(255,255,255,.86)!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaBackMob,
#v-waInbox .nxWaChatHeadBtn,
#v-waInbox .nxWaHeadAct{box-shadow:none!important}
#v-waInbox .nxWaHeadAvatar,
#v-waInbox .nxWaClientAv{
  background:#2b90ee!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaDateSep,
#v-waInbox .nxWaDate{box-shadow:none!important}
#v-waInbox .nxWaBub.out{
  background:#daedfd!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaBub.in{
  background:#fff!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaReactionBadge{box-shadow:none!important}
#v-waInbox .nxWaCerrada{box-shadow:none!important}

/* ============================================================
   4. Composer: pildora plana, boton de enviar de un solo color
   ============================================================ */
#v-waInbox .nxWaComposerWrap{
  background:rgba(244,248,255,.88)!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaRefTextPill{
  background:rgba(255,255,255,.86)!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaRefPlus,
#v-waInbox .nxWaRefClosedPlus,
#v-waInbox .nxWaRefClosedMic,
#v-waInbox .nxWaRefClosedPill{box-shadow:none!important}
#v-waInbox .nxWaVoiceBtn{
  background:#13b872!important;
  box-shadow:none!important;
}
#v-waInbox #nxWaSendBtn,
#v-waInbox .nxWaTextSendBtn{
  background:#1f7ae4!important;
  box-shadow:none!important;
}

/* ============================================================
   5. Hoja de Contactos y paneles auxiliares
   ============================================================ */
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxSheet{
  background:rgba(255,255,255,.96)!important;
  box-shadow:none!important;
}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaUhdSearchBox{box-shadow:none!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact{box-shadow:none!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .av{
  background:#e9f2ff!important;
  box-shadow:none!important;
}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button{box-shadow:none!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button.primary{background:#eef6ff!important}
.nxWaAutoOverlay .nxWaAutoCard{box-shadow:none!important}
.nxWaAutoOverlay .nxWaAutoIcon{background:#eef4ff!important}

/* ============================================================
   6. Tema oscuro: mismos aplanados con la paleta premium
   ============================================================ */
body.tema-premium #v-waInbox .nxCrmHomeHead,
body.tema-premium #v-waInbox .nxWaListCol,
body.tema-premium #v-waInbox .nxWaDetailCol{
  background:rgba(20,30,46,.94)!important;
}
body.tema-premium #v-waInbox .nxWaComposerWrap{
  background:rgba(22,34,52,.90)!important;
}
body.tema-premium #v-waInbox .nxWaBub.out{
  background:#17456f!important;
  box-shadow:none!important;
}
body.tema-premium #v-waInbox .nxWaBub.in{
  background:rgba(24,36,54,.96)!important;
  box-shadow:none!important;
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject,{once:true});
  else inject();
})();
