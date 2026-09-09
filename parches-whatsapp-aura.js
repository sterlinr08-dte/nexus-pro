/* NEXUS PRO · WhatsApp · Azul Aura · 2026-09-08
   Capa visual aislada y cargada al final:
   - burbujas salientes azul aura
   - burbujas entrantes blanco cristal
   - medidas mas compactas sin tocar DOM, scroll, observers ni logica de envio
*/
(function(){
  'use strict';
  if(window.__nxWaAura20260908)return;
  window.__nxWaAura20260908=true;

  function mount(){
    if(document.getElementById('nxWaAuraCss'))return;
    var s=document.createElement('style');
    s.id='nxWaAuraCss';
    s.textContent=`
/* Contenedor del chat: mantiene el fondo existente, solo refina profundidad */
#v-waInbox .nxWaMsgs{
  --nx-aura-1:#e8f5ff;
  --nx-aura-2:#d6edff;
  --nx-aura-3:#c7e5ff;
  --nx-aura-line:rgba(91,168,240,.24);
  --nx-aura-text:#203751;
}

/* Burbuja saliente · Azul Aura */
#v-waInbox .nxWaBub.out{
  position:relative!important;
  overflow:hidden!important;
  background:
    radial-gradient(circle at 88% 12%,rgba(255,255,255,.72),transparent 34%),
    linear-gradient(145deg,var(--nx-aura-1) 0%,var(--nx-aura-2) 55%,var(--nx-aura-3) 100%)!important;
  color:var(--nx-aura-text)!important;
  border:1px solid var(--nx-aura-line)!important;
  border-radius:19px 19px 7px 19px!important;
  box-shadow:
    0 9px 22px -17px rgba(45,126,203,.46),
    inset 0 1px 0 rgba(255,255,255,.68)!important;
  padding:8px 11px 7px!important;
  line-height:1.34!important;
  letter-spacing:-.005em!important;
}
#v-waInbox .nxWaBub.out:after{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  border-radius:inherit;
  background:linear-gradient(115deg,rgba(255,255,255,.22),transparent 38%,rgba(255,255,255,.08));
  opacity:.68;
}
#v-waInbox .nxWaBub.out>*{position:relative;z-index:1}

/* Burbuja entrante · blanco cristal */
#v-waInbox .nxWaBub.in{
  background:rgba(255,255,255,.91)!important;
  color:#22344c!important;
  border:1px solid rgba(203,217,236,.72)!important;
  border-radius:19px 19px 19px 7px!important;
  box-shadow:0 8px 20px -18px rgba(31,65,112,.42),inset 0 1px 0 rgba(255,255,255,.82)!important;
  backdrop-filter:blur(14px) saturate(125%);
  -webkit-backdrop-filter:blur(14px) saturate(125%);
  padding:8px 11px 7px!important;
  line-height:1.34!important;
}

/* Hora y estados integrados, discretos */
#v-waInbox .nxWaBub.out .nxWaMsgMeta{color:#5f7896!important}
#v-waInbox .nxWaBub.in .nxWaMsgMeta{color:#8290a5!important}
#v-waInbox .nxWaBub.out .nxWaMsgMeta i,
#v-waInbox .nxWaBub.out .nxWaMsgMeta .ti-check,
#v-waInbox .nxWaBub.out .nxWaMsgMeta .ti-checks{color:#2388f5!important}

/* Reacciones: armonizan con el aura sin agrandar la burbuja */
#v-waInbox .nxWaReactionBadge{
  background:rgba(255,255,255,.96)!important;
  border-color:rgba(138,184,230,.36)!important;
  box-shadow:0 6px 14px -10px rgba(44,112,180,.42)!important;
}

/* Menos aire vertical entre mensajes, conservando agrupacion */
#v-waInbox .nxWaMsgs{gap:5px!important}
#v-waInbox .nxWaBubWrap{margin-block:0!important}

/* Las colas antiguas verdes quedan anuladas visualmente */
#v-waInbox .nxWaBubWrap.diff-prev.out .nxWaBub:before{
  border-top-color:#d9efff!important;
}
#v-waInbox .nxWaBubWrap.diff-prev.in .nxWaBub:before{
  border-top-color:rgba(255,255,255,.94)!important;
}

/* Movil: mas compacto y parecido al mockup aprobado */
@media(max-width:760px){
  #v-waInbox .nxWaMsgs{padding:11px 9px 11px!important;gap:5px!important}
  #v-waInbox .nxWaBub{
    max-width:84%!important;
    font-size:11.4px!important;
  }
  #v-waInbox .nxWaBub.out,#v-waInbox .nxWaBub.in{
    padding:8px 10px 7px!important;
  }
  #v-waInbox .nxWaMsgMeta{
    margin-top:3px!important;
    font-size:7.4px!important;
  }
}

/* Escritorio: conserva lectura comoda sin burbujas gigantes */
@media(min-width:761px){
  #v-waInbox .nxWaBub{max-width:min(72%,680px)!important}
}

/* Tema oscuro: aura profunda, no verde */
body.tema-premium #v-waInbox .nxWaBub.out{
  background:
    radial-gradient(circle at 88% 12%,rgba(109,186,255,.18),transparent 34%),
    linear-gradient(145deg,#173b61 0%,#164d7e 58%,#176197 100%)!important;
  border-color:rgba(113,190,255,.2)!important;
  color:#eef7ff!important;
  box-shadow:0 10px 24px -18px rgba(26,126,218,.58),inset 0 1px 0 rgba(255,255,255,.08)!important;
}
body.tema-premium #v-waInbox .nxWaBub.in{
  background:rgba(24,36,54,.94)!important;
  border-color:rgba(148,163,184,.14)!important;
  color:#eef4fb!important;
}
body.tema-premium #v-waInbox .nxWaBub.out .nxWaMsgMeta{color:#b8d4ef!important}

@media(prefers-reduced-motion:reduce){
  #v-waInbox .nxWaBub{transition:none!important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
