/* NEXUS PRO · WhatsApp · réplica visual de referencia · 2026-09-08
   Replica la ventana aprobada sin alterar lógica de mensajes, scroll, API, Zernio,
   Contactos ni reglas Meta 24h. Reutiliza adjuntos/cámara/voz reales ya existentes. */
(function(){
  'use strict';
  if(window.__nxWaReplicaReferencia20260908)return;
  window.__nxWaReplicaReferencia20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let queued=false,obs=null;

  function css(){
    if($('#nxWaReplicaReferenciaCss'))return;
    const s=document.createElement('style');
    s.id='nxWaReplicaReferenciaCss';
    s.textContent=`
/* ===== Ventana completa: mismo tamaño funcional, acabado glass de la referencia ===== */
#v-waInbox .nxWaDetailCol{
  position:relative!important;
  width:100%!important;
  margin:0!important;
  border-radius:28px!important;
  overflow:hidden!important;
  background:rgba(242,247,255,.88)!important;
  border:1px solid rgba(255,255,255,.86)!important;
  box-shadow:0 24px 64px -42px rgba(42,73,125,.34)!important;
}
#v-waInbox .nxWaDetalle{
  height:100%!important;
  min-height:0!important;
  background:linear-gradient(180deg,#f2f6ff 0%,#eef4fb 100%)!important;
}

/* Cabecera flotante glass */
#v-waInbox .nxWaHead{
  position:relative!important;
  z-index:8!important;
  flex:0 0 auto!important;
  min-height:68px!important;
  margin:10px 10px 0!important;
  padding:8px 10px!important;
  border:1px solid rgba(255,255,255,.92)!important;
  border-radius:27px!important;
  background:linear-gradient(145deg,rgba(255,255,255,.78),rgba(239,244,255,.72))!important;
  box-shadow:0 16px 34px -25px rgba(57,81,129,.34),inset 0 1px 0 rgba(255,255,255,.88)!important;
  backdrop-filter:blur(24px) saturate(125%)!important;
  -webkit-backdrop-filter:blur(24px) saturate(125%)!important;
}
#v-waInbox .nxWaBackMob,
#v-waInbox .nxWaChatHeadBtn{
  width:46px!important;height:46px!important;flex:0 0 46px!important;
  border-radius:50%!important;border:1px solid rgba(255,255,255,.88)!important;
  background:rgba(255,255,255,.66)!important;color:#142544!important;
  box-shadow:0 9px 22px -18px rgba(39,61,104,.38),inset 0 1px 0 rgba(255,255,255,.85)!important;
}
#v-waInbox .nxWaHeadAvatar,#v-waInbox .nxWaClientAv{
  width:48px!important;height:48px!important;flex:0 0 48px!important;
  border-radius:50%!important;background:linear-gradient(145deg,#32a8ff,#1778e8)!important;
  border:1px solid rgba(255,255,255,.85)!important;box-shadow:0 10px 24px -18px rgba(26,117,226,.55)!important;
}
#v-waInbox .nxWaHeadMain{gap:11px!important}
#v-waInbox .nxWaHeadName,#v-waInbox .nxWaClientName{
  color:#18223b!important;font-size:13px!important;font-weight:850!important;letter-spacing:.01em!important;
}
#v-waInbox .nxWaHeadSub,#v-waInbox .nxWaClientMeta{
  margin-top:2px!important;color:#65718e!important;font-size:9.2px!important;font-weight:600!important;
}
#v-waInbox .nxWaChatHeadActions{gap:8px!important}

/* Fondo del chat: luz azul/lila suave, sin transformaciones GPU */
#v-waInbox .nxWaMsgs{
  flex:1!important;min-height:0!important;
  padding:28px 16px 20px!important;gap:9px!important;
  background:
    radial-gradient(ellipse at 3% 36%,rgba(176,190,237,.28) 0 16%,transparent 17%),
    radial-gradient(ellipse at 94% 14%,rgba(216,224,249,.46) 0 21%,transparent 22%),
    radial-gradient(ellipse at 72% 86%,rgba(197,214,246,.34) 0 24%,transparent 25%),
    linear-gradient(150deg,#f5f7ff 0%,#edf4fb 52%,#f3f5ff 100%)!important;
  scroll-behavior:auto!important;
}

/* Fecha centrada */
#v-waInbox .nxWaDateSep,#v-waInbox .nxWaDate{
  align-self:center!important;
  width:max-content!important;
  margin:0 auto 10px!important;
  padding:6px 13px!important;
  border:0!important;border-radius:999px!important;
  background:rgba(226,229,244,.72)!important;
  color:#67718a!important;font-size:9.5px!important;font-weight:650!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.68)!important;
}

/* Filas y burbujas: caja ajustada al contenido */
#v-waInbox .nxWaBubWrap{
  width:100%!important;min-height:0!important;height:auto!important;
  flex:0 0 auto!important;align-items:flex-start!important;
  margin:0!important;transform:none!important;
}
#v-waInbox .nxWaBubWrap.out{justify-content:flex-end!important}
#v-waInbox .nxWaBubWrap.in{justify-content:flex-start!important}
#v-waInbox .nxWaBubWrap.same-prev{margin-top:2px!important}
#v-waInbox .nxWaBubWrap.diff-prev{margin-top:6px!important}
#v-waInbox .nxWaBub{
  display:block!important;width:fit-content!important;min-width:0!important;min-height:0!important;height:auto!important;
  max-width:min(79%,620px)!important;flex:0 0 auto!important;box-sizing:border-box!important;
  margin:0!important;padding:10px 12px 8px!important;
  font-size:11.7px!important;font-weight:600!important;line-height:1.38!important;letter-spacing:.002em!important;
  white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;
  animation:none!important;transform:none!important;will-change:auto!important;
}
#v-waInbox .nxWaBub.out{
  color:#243956!important;
  background:linear-gradient(145deg,rgba(221,241,255,.96),rgba(192,226,255,.94))!important;
  border:1px solid rgba(101,181,240,.32)!important;
  border-radius:23px 23px 8px 23px!important;
  box-shadow:0 13px 27px -22px rgba(48,121,184,.54),inset 0 1px 0 rgba(255,255,255,.78)!important;
  overflow:visible!important;
}
#v-waInbox .nxWaBub.in{
  color:#25354d!important;background:rgba(255,255,255,.92)!important;
  border:1px solid rgba(206,216,234,.78)!important;
  border-radius:23px 23px 23px 8px!important;
  box-shadow:0 12px 26px -23px rgba(55,78,118,.42),inset 0 1px 0 rgba(255,255,255,.88)!important;
}
#v-waInbox .nxWaBub.out:after{content:none!important;display:none!important}
#v-waInbox .nxWaBubMeta,#v-waInbox .nxWaMsgMeta{
  min-width:0!important;min-height:0!important;height:auto!important;
  margin:5px 0 0!important;padding:0!important;gap:4px!important;
  font-size:7.7px!important;font-weight:650!important;line-height:1!important;color:#60708b!important;
}
#v-waInbox .nxWaBub.out .nxWaBubMeta,#v-waInbox .nxWaBub.out .nxWaMsgMeta{color:#5f738e!important}
#v-waInbox .nxWaBub.out .nxWaBubMeta span:last-child,#v-waInbox .nxWaBub.out .nxWaMsgMeta span:last-child{color:#1686e8!important}
#v-waInbox .nxWaBub.nxWaRefShort{
  display:flex!important;align-items:flex-end!important;gap:13px!important;
  padding:9px 12px!important;
}
#v-waInbox .nxWaBub.nxWaRefShort .nxWaMsgText{white-space:nowrap!important}
#v-waInbox .nxWaBub.nxWaRefShort .nxWaBubMeta,#v-waInbox .nxWaBub.nxWaRefShort .nxWaMsgMeta{margin:0 0 1px!important;white-space:nowrap!important}
/* ── Pie de la burbuja: uno solo, y pegado al texto como en WhatsApp ──────────
   La burbuja traia DOS pies apilados: .nxWaBubMeta (del marcado base de inbox.js,
   con el ✓✓ crudo) y .nxWaMsgMeta (que anade visual-v7 y ya lleva hora Y estado).
   Al ser dos <div> quedaban en renglones distintos: el texto arriba, los checks en
   una linea, la hora en otra. Eso es lo que estiraba la burbuja y separaba los
   checks de la hora.
   Se ocultan los <span> del primero, no el contenedor: estadoMsg() siempre devuelve
   un <span> y el boton Reintentar de un mensaje fallido es un <button>, asi que
   sobrevive. Se hace asi, y no con :not(:has(.nxWaRetry)), porque si algun Safari no
   parsea ese selector descarta la regla entera y el pie duplicado reaparece. */
#v-waInbox .nxWaBubMeta{margin:0!important;padding:0!important;min-height:0!important}
#v-waInbox .nxWaBubMeta>span{display:none!important}

/* El pie va INLINE, no flotado. Con float el navegador lo empujaba a su propio
   renglon muy a menudo, porque la burbuja es width:fit-content y el calculo de
   ancho no le reserva sitio -- y ese renglon extra era la franja azul de sobra.
   Como .nxWaMsgText es un span inline, un inline-flex justo despues se coloca al
   final de la ultima linea de texto si cabe, y baja solo si no cabe. Que es
   exactamente lo que hace WhatsApp, sin las rarezas de float + fit-content. */
#v-waInbox .nxWaBub:not(.nxWaRefShort) .nxWaMsgMeta{
  display:inline-flex!important;float:none!important;
  margin:0 0 0 8px!important;padding:0!important;
  vertical-align:bottom!important;white-space:nowrap!important;
}
#v-waInbox .nxWaBubMenu,#v-waInbox .nxWaMsgDrop{position:absolute!important}

/* Multimedia mantiene proporción propia */
#v-waInbox .nxWaBub:has(img),#v-waInbox .nxWaBub:has(video),#v-waInbox .nxWaBub:has(audio){
  width:auto!important;max-width:min(86%,650px)!important;padding:7px!important;
}

/* ===== Composer como la referencia ===== */
#v-waInbox .nxWaComposerWrap{
  flex:0 0 auto!important;
  padding:10px 10px max(10px,env(safe-area-inset-bottom))!important;
  border-top:0!important;background:linear-gradient(180deg,rgba(239,244,255,.58),rgba(229,236,249,.82))!important;
  box-shadow:none!important;
}
#v-waInbox .nxWaComposer{
  display:flex!important;align-items:center!important;gap:8px!important;
  min-height:58px!important;margin:0!important;padding:0!important;
  border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;
}
#v-waInbox .nxWaRefPlus,
#v-waInbox .nxWaVoiceBtn,
#v-waInbox #nxWaSendBtn,
#v-waInbox .nxWaTextSendBtn{
  width:50px!important;height:50px!important;flex:0 0 50px!important;border-radius:50%!important;
  display:grid!important;place-items:center!important;border:1px solid rgba(255,255,255,.82)!important;
  box-shadow:0 10px 24px -19px rgba(52,70,109,.48),inset 0 1px 0 rgba(255,255,255,.72)!important;
}
#v-waInbox .nxWaRefPlus{
  order:1!important;background:rgba(255,255,255,.58)!important;color:#283651!important;font-size:24px!important;
}
#v-waInbox .nxWaRefTextPill{
  order:2!important;flex:1!important;min-width:0!important;min-height:50px!important;
  display:flex!important;align-items:center!important;gap:3px!important;
  padding:4px 5px 4px 12px!important;border:1px solid rgba(255,255,255,.88)!important;border-radius:25px!important;
  background:rgba(255,255,255,.70)!important;
  box-shadow:0 10px 26px -22px rgba(49,70,111,.42),inset 0 1px 0 rgba(255,255,255,.82)!important;
  backdrop-filter:blur(18px) saturate(115%)!important;-webkit-backdrop-filter:blur(18px) saturate(115%)!important;
}
#v-waInbox .nxWaRefTextPill #nxWaTexto{
  flex:1!important;min-width:0!important;min-height:38px!important;max-height:104px!important;
  padding:9px 3px!important;border:0!important;background:transparent!important;box-shadow:none!important;
  color:#33405a!important;font-size:16px!important;line-height:1.25!important;resize:none!important;outline:none!important;
}
#v-waInbox .nxWaRefTextPill #nxWaTexto::placeholder{color:#7e879d!important;opacity:1!important}
#v-waInbox .nxWaRefInlineBtn,
#v-waInbox .nxWaRefTextPill .nxWaIconBtn{
  width:36px!important;height:36px!important;flex:0 0 36px!important;border:0!important;border-radius:50%!important;
  display:grid!important;place-items:center!important;background:transparent!important;color:#24324d!important;
  box-shadow:none!important;font-size:20px!important;padding:0!important;
}
#v-waInbox .nxWaVoiceBtn{
  order:3!important;background:linear-gradient(145deg,#30364a,#171b2a)!important;color:#fff!important;font-size:20px!important;border-color:rgba(255,255,255,.24)!important;
}
#v-waInbox #nxWaSendBtn,#v-waInbox .nxWaTextSendBtn{
  order:3!important;background:linear-gradient(145deg,#2688ef,#1668d5)!important;color:#fff!important;border-color:rgba(255,255,255,.28)!important;
}
#v-waInbox .nxWaComposer.nxWaRecording .nxWaRefPlus,
#v-waInbox .nxWaComposer.nxWaRecording .nxWaRefTextPill,
#v-waInbox .nxWaComposer.nxWaVoiceReady .nxWaRefPlus,
#v-waInbox .nxWaComposer.nxWaVoiceReady .nxWaRefTextPill{display:none!important}
#v-waInbox .nxWaComposer.nxWaRecording .nxWaVoiceRec,
#v-waInbox .nxWaComposer.nxWaVoiceReady .nxWaVoiceReadyBox{order:2!important;flex:1!important}

/* Aviso de 24 h como panel glass inferior */
#v-waInbox .nxWaCerrada{
  margin:9px 0 0!important;padding:12px 16px max(12px,env(safe-area-inset-bottom))!important;
  border:1px solid rgba(255,255,255,.58)!important;border-radius:22px!important;
  background:rgba(237,240,250,.70)!important;color:#6d7892!important;
  font-size:9.5px!important;font-weight:600!important;line-height:1.45!important;text-align:center!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.62)!important;
}
#v-waInbox .nxWaRefClosedComposer{
  min-height:58px;display:flex;align-items:center;gap:8px;margin:0;padding:0;opacity:.78;pointer-events:none;user-select:none;
}
#v-waInbox .nxWaRefClosedPlus,#v-waInbox .nxWaRefClosedMic{width:50px;height:50px;flex:0 0 50px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(255,255,255,.8)}
#v-waInbox .nxWaRefClosedPlus{background:rgba(255,255,255,.58);font-size:24px;color:#35415b}
#v-waInbox .nxWaRefClosedMic{background:#242a3a;color:#fff;font-size:20px}
#v-waInbox .nxWaRefClosedPill{flex:1;min-width:0;height:50px;padding:0 8px 0 14px;border:1px solid rgba(255,255,255,.88);border-radius:25px;background:rgba(255,255,255,.7);display:flex;align-items:center;gap:8px;color:#7f889d}
#v-waInbox .nxWaRefClosedPill span{flex:1;font-size:11px}.nxWaRefClosedPill i{font-size:18px;color:#35415b}

/* Emoji picker funcional */
.nxWaEmojiPop{
  position:fixed;z-index:100310;width:236px;padding:9px;border:1px solid rgba(255,255,255,.82);border-radius:19px;
  background:rgba(255,255,255,.96);box-shadow:0 24px 55px -30px rgba(35,53,91,.58);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  display:grid;grid-template-columns:repeat(6,1fr);gap:4px;
}
.nxWaEmojiPop button{height:34px;border:0;border-radius:9px;background:transparent;font-size:20px}.nxWaEmojiPop button:active{background:#edf3fb;transform:scale(.94)}

@media(max-width:760px){
  #v-waInbox .nxWaDetailCol{width:100%!important;margin:0!important;border-radius:26px!important}
  #v-waInbox .nxWaHead{margin:8px 8px 0!important;min-height:64px!important;border-radius:25px!important;padding:7px 8px!important}
  #v-waInbox .nxWaBackMob,#v-waInbox .nxWaChatHeadBtn{width:44px!important;height:44px!important;flex-basis:44px!important}
  #v-waInbox .nxWaHeadAvatar,#v-waInbox .nxWaClientAv{width:45px!important;height:45px!important;flex-basis:45px!important}
  #v-waInbox .nxWaHeadName,#v-waInbox .nxWaClientName{font-size:12.2px!important}
  #v-waInbox .nxWaHeadSub,#v-waInbox .nxWaClientMeta{font-size:8.5px!important}
  #v-waInbox .nxWaMsgs{padding:24px 12px 18px!important;gap:8px!important}
  #v-waInbox .nxWaBub{max-width:82%!important;padding:9px 11px 7px!important;font-size:11.4px!important;font-weight:600!important;line-height:1.34!important}
  #v-waInbox .nxWaBub.nxWaRefShort{padding:8px 11px!important;gap:12px!important}
  #v-waInbox .nxWaBub.in,#v-waInbox .nxWaBub.out{padding:5px 9px 4px!important}
  #v-waInbox .nxWaComposerWrap{padding:9px 8px max(9px,env(safe-area-inset-bottom))!important}
  #v-waInbox .nxWaComposer{gap:6px!important}
  #v-waInbox .nxWaRefPlus,#v-waInbox .nxWaVoiceBtn,#v-waInbox #nxWaSendBtn,#v-waInbox .nxWaTextSendBtn{width:46px!important;height:46px!important;flex-basis:46px!important}
  #v-waInbox .nxWaRefTextPill{min-height:46px!important;padding-left:10px!important}
  #v-waInbox .nxWaRefTextPill #nxWaTexto{font-size:16px!important;min-height:36px!important;padding:8px 2px!important}
  #v-waInbox .nxWaRefInlineBtn,#v-waInbox .nxWaRefTextPill .nxWaIconBtn{width:32px!important;height:32px!important;flex-basis:32px!important;font-size:18px!important}
  #v-waInbox .nxWaRefClosedComposer{gap:6px}.nxWaRefClosedPlus,.nxWaRefClosedMic{width:46px!important;height:46px!important;flex-basis:46px!important}.nxWaRefClosedPill{height:46px!important}
}

@media(max-width:390px){
  #v-waInbox .nxWaHead{margin-inline:6px!important}
  #v-waInbox .nxWaMsgs{padding-inline:9px!important}
  #v-waInbox .nxWaBub{max-width:84%!important;font-size:11.2px!important}
  #v-waInbox .nxWaRefInlineBtn,#v-waInbox .nxWaRefTextPill .nxWaIconBtn{width:30px!important;height:30px!important;flex-basis:30px!important}
}

body.tema-premium #v-waInbox .nxWaDetailCol,body.tema-premium #v-waInbox .nxWaDetalle{background:#111a2b!important}
body.tema-premium #v-waInbox .nxWaHead,body.tema-premium #v-waInbox .nxWaRefTextPill{background:rgba(30,40,59,.82)!important;border-color:rgba(255,255,255,.09)!important}
body.tema-premium #v-waInbox .nxWaHeadName,body.tema-premium #v-waInbox .nxWaClientName,body.tema-premium #v-waInbox .nxWaRefTextPill #nxWaTexto{color:#eef4fb!important}
body.tema-premium #v-waInbox .nxWaBub.in{background:#1b2739!important;color:#e7edf7!important;border-color:rgba(255,255,255,.08)!important}

@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaBub,#v-waInbox .nxWaBubWrap,.nxWaEmojiPop{animation:none!important;transition:none!important;transform:none!important}}
`;
    document.head.appendChild(s);
  }

  function closeEmoji(){const p=$('.nxWaEmojiPop');if(p)p.remove();}
  function openEmoji(btn){
    closeEmoji();
    const p=document.createElement('div');p.className='nxWaEmojiPop';
    const emojis=['😀','😂','😊','😍','👍','🙏','❤️','👏','🔥','🎉','✅','👋','😉','😅','🤝','💙','📌','📎'];
    p.innerHTML=emojis.map(x=>'<button type="button" data-e="'+x+'">'+x+'</button>').join('');
    document.body.appendChild(p);
    const r=btn.getBoundingClientRect(),vv=window.visualViewport;
    const vw=vv?.width||innerWidth,vh=vv?.height||innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;
    const w=236,h=p.offsetHeight||120;
    p.style.left=Math.max(8+ox,Math.min(r.left+ox,vw+ox-w-8))+'px';
    p.style.top=Math.max(8+oy,Math.min(r.top+oy-h-8,vh+oy-h-8))+'px';
    p.addEventListener('click',e=>{
      const b=e.target.closest('[data-e]');if(!b)return;
      const inp=$('#nxWaTexto');if(!inp)return;
      const start=Number.isFinite(inp.selectionStart)?inp.selectionStart:inp.value.length;
      const end=Number.isFinite(inp.selectionEnd)?inp.selectionEnd:start;
      inp.value=inp.value.slice(0,start)+b.dataset.e+inp.value.slice(end);
      const pos=start+b.dataset.e.length;try{inp.setSelectionRange(pos,pos);}catch(_e){}
      try{window.nxWaTextoInput?.(inp);}catch(_e){}
      inp.dispatchEvent(new Event('input',{bubbles:true}));inp.focus();closeEmoji();
    });
    setTimeout(()=>document.addEventListener('pointerdown',e=>{if(!p.contains(e.target)&&e.target!==btn)closeEmoji();},{once:true}),0);
  }

  function decorateBubbles(){
    $$('#v-waInbox .nxWaBub').forEach(b=>{
      if(b.dataset.nxWaRefText==='1')return;
      b.dataset.nxWaRefText='1';
      let txt='';
      Array.from(b.childNodes).forEach(n=>{
        if(n.nodeType!==3||!String(n.nodeValue||'').trim())return;
        // El cuerpo del mensaje entraba CRUDO: si traia saltos de linea al final -- cosa
        // normal en lo que llega de WhatsApp -- `white-space:pre-wrap` los dibujaba como
        // espacio vacio y la burbuja quedaba altisima con el texto arriba y la hora abajo.
        // Se nota en que las burbujas de <=18 caracteres NO tenian el problema: esas reciben
        // .nxWaRefShort, que fuerza white-space:nowrap y colapsaba los saltos por accidente.
        // Solo se quitan los blancos de los extremos QUE CONTIENEN UN SALTO, para no comerse
        // un espacio simple legitimo ni el formato interno del mensaje.
        const limpio=String(n.nodeValue||'').replace(/^\s*\n\s*/,'').replace(/\s*\n\s*$/,'');
        const span=document.createElement('span');span.className='nxWaMsgText';span.textContent=limpio;
        txt+=String(n.nodeValue||'').trim();b.replaceChild(span,n);
      });
      if(!txt){const span=$('.nxWaMsgText',b);txt=span?.textContent?.trim()||'';}
      if(txt&&txt.length<=18&&!b.querySelector('img,video,audio,.nxWaQuote,.nxWaReplyQuote'))b.classList.add('nxWaRefShort');
    });
  }

  function cameraFromExisting(attach){
    attach.click();
    setTimeout(()=>{const cam=$('.nxWaAttachPop [data-k="camera"]');if(cam)cam.click();},30);
  }

  function enhanceComposer(){
    const comp=$('#v-waInbox .nxWaComposer');if(!comp||comp.dataset.nxWaReplica==='1')return;
    const inp=$('#nxWaTexto',comp),attach=$('.nxWaIconBtn',comp);if(!inp||!attach)return;
    comp.dataset.nxWaReplica='1';

    const plus=document.createElement('button');plus.type='button';plus.className='nxWaRefPlus';plus.setAttribute('aria-label','Adjuntar');plus.innerHTML='<i class="ti ti-plus"></i>';
    plus.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();attach.click();});

    const pill=document.createElement('div');pill.className='nxWaRefTextPill';
    const emoji=document.createElement('button');emoji.type='button';emoji.className='nxWaRefInlineBtn nxWaRefEmoji';emoji.setAttribute('aria-label','Emoji');emoji.innerHTML='<i class="ti ti-mood-smile"></i>';emoji.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openEmoji(emoji);});
    const camera=document.createElement('button');camera.type='button';camera.className='nxWaRefInlineBtn nxWaRefCamera';camera.setAttribute('aria-label','Cámara');camera.innerHTML='<i class="ti ti-camera"></i>';camera.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();cameraFromExisting(attach);});

    comp.insertBefore(plus,comp.firstChild);
    comp.insertBefore(pill,inp);
    pill.appendChild(inp);pill.appendChild(emoji);pill.appendChild(attach);pill.appendChild(camera);
  }

  function enhanceClosed(){
    const root=$('#v-waInbox');if(!root)return;
    const closed=$('.nxWaCerrada',root);if(!closed||$('.nxWaComposer',root)||$('.nxWaRefClosedComposer',root))return;
    const box=document.createElement('div');box.className='nxWaRefClosedComposer';box.setAttribute('aria-disabled','true');
    box.innerHTML='<div class="nxWaRefClosedPlus"><i class="ti ti-plus"></i></div><div class="nxWaRefClosedPill"><span>Escribe un mensaje...</span><i class="ti ti-mood-smile"></i><i class="ti ti-paperclip"></i><i class="ti ti-camera"></i></div><div class="nxWaRefClosedMic"><i class="ti ti-microphone"></i></div>';
    closed.parentNode.insertBefore(box,closed);
  }

  function enhance(){
    queued=false;css();enhanceComposer();enhanceClosed();decorateBubbles();
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else{obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
