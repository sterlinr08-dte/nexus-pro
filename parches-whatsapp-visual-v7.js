/* NEXUS PRO · WhatsApp visual 2026 · sexta pasada
   Refinamiento del compositor (aria/enterkeyhint) y estilos de enlaces/adjuntos.
   58.94: la hora, el estado (✓ ○ ✓✓ ✓✓ azul !) y los separadores de día los pinta ahora el núcleo
   (parches-whatsapp-inbox.js) con los mismos nombres de clase (.nxWaMsgMeta, .nxWaMsgTime,
   .nxWaMsgState.st-*, .nxWaMsgCheck, .nxWaDaySep). Se retiró de aquí el emparejamiento posicional
   de burbujas con un segundo fetch, que se desalineaba en cuanto el núcleo insertaba nodos. */
(function(){
  'use strict';
  if(window.__nxWaVisualV7_20260907)return;
  window.__nxWaVisualV7_20260907=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let queued=false,obs=null;

  function css(){
    if($('#nxWaVisualV7Css'))return;
    const s=document.createElement('style');s.id='nxWaVisualV7Css';s.textContent=`
#v-waInbox .nxWaMsgs{scroll-behavior:smooth}
#v-waInbox .nxWaBub{position:relative;padding-bottom:7px!important}
#v-waInbox .nxWaBub img,#v-waInbox .nxWaBub video{box-shadow:0 5px 14px -13px rgba(15,23,42,.45)}
#v-waInbox .nxWaBub audio{display:block;width:min(260px,100%)!important;max-width:100%!important;margin:1px 0 3px}
#v-waInbox .nxWaBub video{display:block;max-width:min(300px,100%)!important;width:auto!important;border-radius:12px!important;margin-bottom:4px}
#v-waInbox .nxWaBub a{color:#2563eb;font-weight:800;text-decoration:none}
#v-waInbox .nxWaBub a:hover{text-decoration:underline}
#v-waInbox .nxWaComposer{min-height:48px!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease!important}
#v-waInbox .nxWaComposer:focus-within{border-color:rgba(37,99,235,.22)!important;background:rgba(255,255,255,.92)!important;box-shadow:0 12px 30px -24px rgba(15,23,42,.58),0 0 0 3px rgba(37,99,235,.055)!important}
#v-waInbox .nxWaComposer input{font-size:12px!important;letter-spacing:0!important}
#v-waInbox .nxWaComposer input::placeholder{color:#94a3b8;opacity:1}
#v-waInbox .nxWaComposer button{width:38px!important;height:38px!important;flex-basis:38px!important;transition:transform .12s ease,filter .12s ease,opacity .12s ease!important}
#v-waInbox .nxWaComposer button:hover{filter:saturate(1.08) brightness(1.02)}
#v-waInbox .nxWaComposer button i{font-size:15px}
#v-waInbox .nxWaComposer input:disabled+#nxWaSendBtn,#v-waInbox .nxWaComposer button:disabled{opacity:.55}
body.tema-premium #v-waInbox .nxWaComposer:focus-within{background:rgba(27,36,52,.86)!important;border-color:rgba(96,165,250,.18)!important;box-shadow:0 12px 30px -24px rgba(0,0,0,.45),0 0 0 3px rgba(59,130,246,.07)!important}
@media(max-width:760px){
  #v-waInbox .nxWaBub{max-width:86%!important;padding:9px 10px 7px!important;font-size:11.5px!important}
  /* 16px evita el zoom automático de Safari al enfocar el campo. */
  #v-waInbox .nxWaComposer input{font-size:16px!important;height:38px!important}
  #v-waInbox .nxWaComposer{min-height:50px!important;padding:5px 5px 5px 11px!important}
  #v-waInbox .nxWaComposer button{width:40px!important;height:40px!important;flex-basis:40px!important}
  #v-waInbox .nxWaBub audio{width:min(245px,100%)!important}
  #v-waInbox .nxWaBub video{max-width:100%!important}
}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaComposer,#v-waInbox .nxWaComposer button{transition:none!important}#v-waInbox .nxWaMsgs{scroll-behavior:auto}}
`;
    document.head.appendChild(s);
  }

  function root(){return $('#v-waInbox');}
  function enhanceComposer(){
    const r=root(),inp=r&&$('#nxWaTexto',r),btn=inp&&inp.closest('.nxWaComposer')?.querySelector('button');if(!inp)return;
    inp.setAttribute('aria-label','Escribir mensaje');inp.setAttribute('autocapitalize','sentences');inp.setAttribute('enterkeyhint','send');inp.setAttribute('spellcheck','true');
    if(btn){btn.id='nxWaSendBtn';btn.setAttribute('aria-label','Enviar mensaje');btn.setAttribute('title','Enviar');}
  }

  function enhance(){queued=false;css();enhanceComposer();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else{obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
