/* NEXUS PRO · WhatsApp voz + menú de mensaje · 2026-09-08
   Capa aislada sobre el Inbox real:
   - nota de voz grabada en navegador con preview antes de enviar
   - menú por mensaje: responder, reaccionar, copiar, reenviar, info y reintentar
   - no reconstruye Contactos ni toca su MutationObserver
*/
(function(){
  'use strict';
  if(window.__nxWaVozMensajes20260908)return;
  window.__nxWaVozMensajes20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}catch(e){return String(v||'').toLowerCase().trim();}};
  let queued=false,obs=null,lastHydrateKey='',hydrateBusy=false;
  const voice={pressing:false,pointerId:null,startX:0,cancel:false,rec:null,stream:null,chunks:[],started:0,hiloId:null,timer:null,discard:false,blob:null,url:null,mime:'',duration:0,sending:false};

  function api(){try{return typeof API!=='undefined'?API:window.API;}catch(e){return window.API;}}
  function clientes(){try{return (window.ST||ST||{}).clientes||[];}catch(e){return [];}}
  function agentes(){try{return (window.ST||ST||{}).agentes||[];}catch(e){return [];}}
  function toastSafe(tipo,tit,sub){try{if(typeof toast==='function')return toast(tipo,tit,sub);}catch(e){} console.log('[WA]',tit,sub||'');}
  function hiloActualId(){
    const r=$('#v-waInbox .nxWaRow.on');
    const oc=r&&r.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function authHeaders(json=true){
    const A=api();const h={apikey:A?.key||'',Authorization:'Bearer '+(A?.token||A?.key||'')};if(json)h['Content-Type']='application/json';return h;
  }
  async function edgeSend(payload){
    const A=api();if(!A?.url||!A?.key)throw new Error('WhatsApp no configurado');
    const r=await fetch(A.url+'/functions/v1/whatsapp-inbox-enviar',{method:'POST',headers:authHeaders(true),body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.mensaje||d.error||('Error '+r.status));return d;
  }
  async function edgeReact(payload){
    const A=api();if(!A?.url||!A?.key)throw new Error('WhatsApp no configurado');
    const r=await fetch(A.url+'/functions/v1/whatsapp-inbox-reaccionar',{method:'POST',headers:authHeaders(true),body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.mensaje||d.error||('Error '+r.status));return d;
  }
  async function fetchMsg(id){
    const A=api();if(!A?.get)return null;
    const rows=await A.get('whatsapp_hilo_mensajes',`id=eq.${id}&limit=1&select=*`)||[];
    return rows[0]||null;
  }
  function css(){
    if($('#nxWaVozMensajesCss'))return;
    const s=document.createElement('style');s.id='nxWaVozMensajesCss';s.textContent=`
#v-waInbox .nxWaComposer{position:relative}
#v-waInbox .nxWaVoiceBtn{width:42px!important;height:42px!important;flex:0 0 42px!important;border:0!important;border-radius:50%!important;background:#eef4fc!important;color:#1f5da8!important;display:grid!important;place-items:center!important;font-size:19px!important;box-shadow:none!important;touch-action:none;-webkit-user-select:none;user-select:none;transition:transform .13s ease,background .13s ease,color .13s ease!important}
#v-waInbox .nxWaVoiceBtn:active{transform:scale(.91)!important;background:#e1ecfb!important}
#v-waInbox .nxWaVoiceBtn i{font-size:19px!important}
#v-waInbox .nxWaComposer.nxWaHasText .nxWaVoiceBtn,#v-waInbox .nxWaComposer.nxWaRecording .nxWaVoiceBtn,#v-waInbox .nxWaComposer.nxWaVoiceReady .nxWaVoiceBtn{display:none!important}
#v-waInbox .nxWaComposer:not(.nxWaHasText):not(.nxWaRecording):not(.nxWaVoiceReady) .nxWaTextSendBtn{display:none!important}
#v-waInbox .nxWaComposer.nxWaRecording textarea,#v-waInbox .nxWaComposer.nxWaVoiceReady textarea,#v-waInbox .nxWaComposer.nxWaRecording>.nxWaIconBtn,#v-waInbox .nxWaComposer.nxWaVoiceReady>.nxWaIconBtn,#v-waInbox .nxWaComposer.nxWaRecording .nxWaTextSendBtn,#v-waInbox .nxWaComposer.nxWaVoiceReady .nxWaTextSendBtn{display:none!important}
#v-waInbox .nxWaVoiceRec{min-width:0;flex:1;height:40px;display:flex;align-items:center;gap:8px;padding:0 5px;color:#526b91;animation:nxWaVoiceIn .16s ease both}
#v-waInbox .nxWaVoiceDot{width:9px;height:9px;border-radius:50%;background:#dc2626;box-shadow:0 0 0 4px rgba(220,38,38,.08);animation:nxWaVoicePulse 1s ease-in-out infinite;flex:none}
#v-waInbox .nxWaVoiceTime{min-width:38px;color:#b42318;font-size:10px;font-weight:900;font-variant-numeric:tabular-nums}
#v-waInbox .nxWaVoiceWave{height:24px;display:flex;align-items:center;gap:2px;flex:1;min-width:28px;overflow:hidden}
#v-waInbox .nxWaVoiceWave i{display:block;width:2px;border-radius:4px;background:#7f9ec9;animation:nxWaWave 700ms ease-in-out infinite alternate}
#v-waInbox .nxWaVoiceWave i:nth-child(2n){animation-delay:-180ms}.nxWaVoiceWave i:nth-child(3n){animation-delay:-330ms}
#v-waInbox .nxWaVoiceHint{font-size:8.5px;font-weight:800;color:#8295b4;white-space:nowrap;transition:color .12s ease,transform .12s ease}
#v-waInbox .nxWaVoiceRec.cancel .nxWaVoiceHint{color:#dc2626;transform:translateX(-5px)}
#v-waInbox .nxWaVoiceReadyBox{min-width:0;flex:1;display:flex;align-items:center;gap:7px;animation:nxWaVoiceIn .16s ease both}
#v-waInbox .nxWaVoiceReadyBox audio{height:34px!important;min-width:0;flex:1;max-width:310px}
#v-waInbox .nxWaVoiceReadyBox .dur{font-size:9px;color:#607697;font-weight:850;min-width:32px;text-align:center;font-variant-numeric:tabular-nums}
#v-waInbox .nxWaVoiceReadyBox button{width:38px!important;height:38px!important;flex:0 0 38px!important;border:0!important;border-radius:50%!important;display:grid!important;place-items:center!important;box-shadow:none!important}
#v-waInbox .nxWaVoiceDelete{background:#fff0f0!important;color:#b42318!important}.nxWaVoiceSend{background:#2563eb!important;color:#fff!important}.nxWaVoiceSend.busy{opacity:.6}
.nxWaMsgPro{position:fixed;z-index:100260;width:min(240px,calc(100vw - 20px));padding:6px;border:1px solid rgba(190,207,233,.72);border-radius:17px;background:rgba(255,255,255,.985);box-shadow:0 24px 60px -30px rgba(15,39,78,.58);backdrop-filter:blur(24px) saturate(145%);-webkit-backdrop-filter:blur(24px) saturate(145%);animation:nxWaMsgMenuIn .16s cubic-bezier(.16,1,.3,1) both}
.nxWaMsgPro button{width:100%;min-height:40px;border:0;border-radius:11px;background:transparent;color:#17345f;display:flex;align-items:center;gap:10px;padding:0 10px;font:inherit;font-size:10.5px;font-weight:800;text-align:left;cursor:pointer}.nxWaMsgPro button:hover{background:#f3f7fd}.nxWaMsgPro button:active{transform:scale(.985)}.nxWaMsgPro button i{width:20px;text-align:center;font-size:16px;color:#2563eb}.nxWaMsgPro .sep{height:1px;background:#e7edf6;margin:4px 6px}.nxWaMsgPro .danger,.nxWaMsgPro .danger i{color:#b42318}
.nxWaReactTray{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;padding:4px}.nxWaReactTray button{min-height:38px!important;padding:0!important;justify-content:center!important;font-size:20px!important;border-radius:12px!important}.nxWaReactTray button.on{background:#eaf2ff!important;box-shadow:inset 0 0 0 1px #b9d3fb}.nxWaReactRemove{grid-column:1/-1!important;font-size:9.5px!important;color:#b42318!important}
#v-waInbox .nxWaBubWrap{position:relative}
#v-waInbox .nxWaMsgDrop{position:absolute;z-index:3;top:2px;width:24px;height:24px;border:0;border-radius:50%;background:rgba(255,255,255,.88);color:#607697;display:grid;place-items:center;opacity:0;pointer-events:none;box-shadow:0 5px 15px -12px rgba(15,23,42,.55);transition:opacity .12s ease,transform .12s ease}
#v-waInbox .nxWaBubWrap.in .nxWaMsgDrop{right:-28px}#v-waInbox .nxWaBubWrap.out .nxWaMsgDrop{left:-28px}
@media(hover:hover) and (min-width:761px){#v-waInbox .nxWaBubWrap:hover .nxWaMsgDrop{opacity:1;pointer-events:auto}#v-waInbox .nxWaMsgDrop:hover{transform:scale(1.06)}}
@media(max-width:760px){#v-waInbox .nxWaMsgDrop{display:none!important}.nxWaMsgPro{width:min(250px,calc(100vw - 18px))}#v-waInbox .nxWaVoiceHint{font-size:8px}#v-waInbox .nxWaVoiceReadyBox audio{max-width:210px}}
#v-waInbox .nxWaReactionBadge{position:absolute;z-index:2;bottom:-8px;min-width:25px;height:20px;padding:0 6px;border-radius:999px;border:1px solid #dce6f3;background:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;line-height:1;box-shadow:0 5px 14px -10px rgba(15,23,42,.5)}
#v-waInbox .nxWaBubWrap.in .nxWaReactionBadge{left:8px}#v-waInbox .nxWaBubWrap.out .nxWaReactionBadge{right:8px}
.nxWaForwardCard{width:min(500px,100%)}.nxWaForwardSearch{padding:10px 12px;border-bottom:1px solid #e6edf7}.nxWaForwardSearch input{width:100%;height:42px;border:1px solid #dce6f3;border-radius:13px;padding:0 12px;font:inherit;font-size:16px;outline:none}.nxWaForwardSearch input:focus{border-color:#7aa7ec;box-shadow:0 0 0 3px rgba(37,99,235,.07)}.nxWaForwardList{display:flex;flex-direction:column;gap:6px;padding:10px;overflow:auto;max-height:55dvh}.nxWaForwardRow{width:100%;border:1px solid #e2eaf5;border-radius:14px;background:#fff;min-height:54px;padding:8px 10px;display:flex;align-items:center;gap:10px;text-align:left}.nxWaForwardRow:active{transform:scale(.99)}.nxWaForwardRow .av{width:38px;height:38px;border-radius:50%;background:#eaf3ff;color:#2563eb;display:grid;place-items:center;font-size:11px;font-weight:900;flex:none}.nxWaForwardRow .tx{min-width:0;flex:1}.nxWaForwardRow b{display:block;color:#102a56;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxWaForwardRow span{display:block;margin-top:3px;color:#7184a5;font-size:9px}.nxWaForwardRow i{font-size:17px;color:#8ca0bd}
.nxWaMsgInfo{display:grid;grid-template-columns:130px 1fr;gap:9px 12px;font-size:10px;line-height:1.35}.nxWaMsgInfo dt{color:#7184a5;font-weight:800}.nxWaMsgInfo dd{color:#18345f;font-weight:800;word-break:break-word}.nxWaMsgInfo .ok{color:#0f8a55}.nxWaMsgInfo .bad{color:#b42318}
@keyframes nxWaVoiceIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}@keyframes nxWaVoicePulse{50%{opacity:.45;transform:scale(.82)}}@keyframes nxWaWave{from{height:5px}to{height:20px}}@keyframes nxWaMsgMenuIn{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
body.tema-premium .nxWaMsgPro{background:rgba(23,34,53,.985);border-color:rgba(148,163,184,.15)}body.tema-premium .nxWaMsgPro button{color:#e5edf8}body.tema-premium .nxWaMsgPro button:hover{background:#202e44}body.tema-premium .nxWaMsgPro .sep{background:rgba(148,163,184,.13)}body.tema-premium #v-waInbox .nxWaReactionBadge{background:#1f2c40;border-color:#33445e}body.tema-premium .nxWaForwardRow,body.tema-premium .nxWaForwardSearch input{background:#172235;border-color:rgba(148,163,184,.14);color:#eef4fb}body.tema-premium .nxWaForwardRow b,body.tema-premium .nxWaMsgInfo dd{color:#eef4fb}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaVoiceDot,#v-waInbox .nxWaVoiceWave i,.nxWaMsgPro,#v-waInbox .nxWaVoiceRec,#v-waInbox .nxWaVoiceReadyBox{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(s);
  }

  function chooseMime(){
    const xs=['audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'];
    for(const x of xs){try{if(window.MediaRecorder?.isTypeSupported?.(x))return x;}catch(e){}}
    return'';
  }
  function extFor(m){m=String(m||'').toLowerCase();if(m.includes('mp4'))return'm4a';if(m.includes('ogg'))return'ogg';if(m.includes('webm'))return'webm';return'audio';}
  function fmtSecs(ms){const s=Math.max(0,Math.round((Number(ms)||0)/1000)),m=Math.floor(s/60),r=s%60;return m+':'+String(r).padStart(2,'0');}
  function stopTracks(){try{voice.stream?.getTracks?.().forEach(t=>t.stop());}catch(e){}voice.stream=null;}
  function clearTimer(){if(voice.timer){clearInterval(voice.timer);voice.timer=null;}}
  function revokeVoiceUrl(){if(voice.url){try{URL.revokeObjectURL(voice.url);}catch(e){}voice.url=null;}}
  function composer(){return $('#v-waInbox .nxWaComposer');}
  function refreshVoiceClasses(){
    const c=composer();if(!c)return;const ta=$('textarea',c);c.classList.toggle('nxWaHasText',!!String(ta?.value||'').trim());
  }
  function resetVoice(){
    clearTimer();stopTracks();revokeVoiceUrl();
    voice.pressing=false;voice.pointerId=null;voice.cancel=false;voice.rec=null;voice.chunks=[];voice.started=0;voice.hiloId=null;voice.discard=false;voice.blob=null;voice.mime='';voice.duration=0;voice.sending=false;
    const c=composer();if(c){c.classList.remove('nxWaRecording','nxWaVoiceReady');$('.nxWaVoiceRec',c)?.remove();$('.nxWaVoiceReadyBox',c)?.remove();refreshVoiceClasses();}
  }
  function renderRecording(){
    const c=composer();if(!c)return;c.classList.add('nxWaRecording');c.classList.remove('nxWaVoiceReady');$('.nxWaVoiceReadyBox',c)?.remove();
    let box=$('.nxWaVoiceRec',c);if(!box){box=document.createElement('div');box.className='nxWaVoiceRec';box.innerHTML='<span class="nxWaVoiceDot"></span><span class="nxWaVoiceTime">0:00</span><span class="nxWaVoiceWave">'+Array.from({length:18},()=>'<i></i>').join('')+'</span><span class="nxWaVoiceHint"><i class="ti ti-arrow-left"></i> Desliza para cancelar</span>';c.insertBefore(box,$('.nxWaVoiceBtn',c)||null);}
    const tick=()=>{const t=$('.nxWaVoiceTime',box);if(t)t.textContent=fmtSecs(Date.now()-voice.started);};tick();voice.timer=setInterval(tick,250);
  }
  function renderVoiceReady(){
    const c=composer();if(!c||!voice.blob)return;c.classList.remove('nxWaRecording');c.classList.add('nxWaVoiceReady');$('.nxWaVoiceRec',c)?.remove();clearTimer();revokeVoiceUrl();voice.url=URL.createObjectURL(voice.blob);
    const box=document.createElement('div');box.className='nxWaVoiceReadyBox';box.innerHTML=`<button type="button" class="nxWaVoiceDelete" aria-label="Eliminar nota"><i class="ti ti-trash"></i></button><audio src="${esc(voice.url)}" controls preload="metadata"></audio><span class="dur">${esc(fmtSecs(voice.duration))}</span><button type="button" class="nxWaVoiceSend" aria-label="Enviar nota"><i class="ti ti-send"></i></button>`;
    c.insertBefore(box,$('.nxWaVoiceBtn',c)||null);
    $('.nxWaVoiceDelete',box)?.addEventListener('click',()=>resetVoice());
    $('.nxWaVoiceSend',box)?.addEventListener('click',()=>sendVoice());
  }
  function recorderStopped(){
    const dur=Date.now()-voice.started;clearTimer();stopTracks();
    if(voice.discard||dur<450||!voice.chunks.length){const short=!voice.discard&&dur<450;resetVoice();if(short)toastSafe('info','Nota demasiado corta');return;}
    const mime=voice.rec?.mimeType||voice.mime||voice.chunks[0]?.type||'audio/webm';voice.duration=dur;voice.mime=mime;voice.blob=new Blob(voice.chunks,{type:mime});voice.rec=null;voice.chunks=[];renderVoiceReady();
  }
  async function startVoice(e){
    if(voice.rec||voice.blob||voice.sending)return;
    const id=hiloActualId();if(!id)return toastSafe('info','Abre una conversación primero');
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return toastSafe('err','Grabación no compatible','Este navegador no permite grabar notas de voz.');
    voice.pressing=true;voice.pointerId=e.pointerId;voice.startX=e.clientX;voice.cancel=false;voice.hiloId=id;voice.discard=false;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      if(!voice.pressing||hiloActualId()!==id){stream.getTracks().forEach(t=>t.stop());return;}
      voice.stream=stream;const mime=chooseMime();voice.mime=mime;
      const rec=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);voice.rec=rec;voice.chunks=[];
      rec.ondataavailable=ev=>{if(ev.data&&ev.data.size)voice.chunks.push(ev.data);};rec.onstop=recorderStopped;rec.onerror=()=>{toastSafe('err','No se pudo grabar la nota');resetVoice();};
      voice.started=Date.now();rec.start(250);renderRecording();
      try{e.target.setPointerCapture?.(e.pointerId);}catch(_e){}
    }catch(err){voice.pressing=false;stopTracks();toastSafe('err','Micrófono no disponible','Permite acceso al micrófono para grabar notas de voz.');}
  }
  function finishVoice(cancel){
    if(!voice.rec)return;voice.discard=!!cancel;voice.pressing=false;
    try{if(voice.rec.state!=='inactive')voice.rec.stop();}catch(e){resetVoice();}
  }
  async function sendVoice(){
    if(voice.sending||!voice.blob)return;const id=hiloActualId();if(!id||id!==voice.hiloId){toastSafe('err','La conversación cambió','Vuelve a grabar la nota en el chat correcto.');return resetVoice();}
    const b=$('.nxWaVoiceSend',composer());if(b){b.classList.add('busy');b.disabled=true;b.innerHTML='<i class="ti ti-loader-2"></i>';}
    voice.sending=true;
    try{
      const ext=extFor(voice.mime),name='nota-voz-'+Date.now()+'.'+ext;
      const pre=await edgeSend({accion:'presign',filename:name,content_type:voice.mime||'audio/webm'});
      const put=await fetch(pre.uploadUrl,{method:'PUT',headers:{'Content-Type':voice.mime||'audio/webm'},body:voice.blob});if(!put.ok)throw new Error('No se pudo subir el audio ('+put.status+')');
      await edgeSend({hilo_id:id,attachment_url:pre.publicUrl,attachment_type:'audio',voice_note:true});
      resetVoice();toastSafe('ok','Nota de voz enviada');
      if(typeof window.nxWaAbrirHilo==='function'){setTimeout(()=>{try{window.nxWaAbrirHilo(id);}catch(e){}},320);setTimeout(()=>{try{if(hiloActualId()===id)window.nxWaAbrirHilo(id);}catch(e){}},1300);}
    }catch(err){voice.sending=false;if(b){b.classList.remove('busy');b.disabled=false;b.innerHTML='<i class="ti ti-send"></i>';}toastSafe('err','No se pudo enviar la nota',String(err&&err.message||err));}
  }

  function ensureComposer(){
    const c=composer(),ta=c&&$('textarea',c);if(!c||!ta)return;
    const buttons=Array.from(c.children).filter(x=>x.tagName==='BUTTON'&&!x.classList.contains('nxWaVoiceBtn'));const send=buttons.find(b=>(b.getAttribute('onclick')||'').includes('nxWaEnviar')||b.querySelector('.ti-send'))||buttons.at(-1);if(send)send.classList.add('nxWaTextSendBtn');
    let mic=$('.nxWaVoiceBtn',c);if(!mic){mic=document.createElement('button');mic.type='button';mic.className='nxWaVoiceBtn';mic.setAttribute('aria-label','Mantén presionado para grabar');mic.setAttribute('title','Nota de voz');mic.innerHTML='<i class="ti ti-microphone"></i>';if(send)c.insertBefore(mic,send);else c.appendChild(mic);
      mic.addEventListener('pointerdown',e=>{if(String(ta.value||'').trim())return;e.preventDefault();startVoice(e);});
    }
    if(!ta.dataset.nxVoiceBound){ta.dataset.nxVoiceBound='1';ta.addEventListener('input',refreshVoiceClasses);}refreshVoiceClasses();
  }

  function viewport(){const v=window.visualViewport;return v?{left:v.offsetLeft||0,top:v.offsetTop||0,width:v.width||innerWidth,height:v.height||innerHeight}:{left:0,top:0,width:innerWidth,height:innerHeight};}
  function placeMenu(p,id){
    requestAnimationFrame(()=>{if(!p?.isConnected)return;const vp=viewport(),w=document.getElementById('nxWaMsg-'+id),r=w?.getBoundingClientRect(),pr=p.getBoundingClientRect(),M=9;let left=r?(r.classList.contains('out')?r.left-pr.width-6:r.right+6):vp.left+vp.width-pr.width-M;let top=r?r.top:vp.top+40;if(left<vp.left+M||left+pr.width>vp.left+vp.width-M){left=Math.max(vp.left+M,Math.min((r?.right||vp.left+vp.width)-pr.width,vp.left+vp.width-pr.width-M));top=(r?.bottom||top)+4;}top=Math.max(vp.top+M,Math.min(top,vp.top+vp.height-pr.height-M));p.style.left=Math.round(left)+'px';p.style.top=Math.round(top)+'px';});
  }
  function closeMsgMenus(){ $$('.nxWaMsgPro,.nxWaCtx').forEach(x=>x.remove()); }
  function setReactionDom(id,emoji){const w=document.getElementById('nxWaMsg-'+id);if(!w)return;let b=$('.nxWaReactionBadge',w);if(!emoji){b?.remove();return;}if(!b){b=document.createElement('span');b.className='nxWaReactionBadge';w.appendChild(b);}b.textContent=emoji;}
  async function reactTo(id,emoji){
    const hilo=hiloActualId();if(!hilo)return;try{await edgeReact({hilo_id:hilo,mensaje_id:id,emoji:emoji||'',quitar:!emoji});setReactionDom(id,emoji||'');toastSafe('ok',emoji?'Reacción enviada':'Reacción quitada');lastHydrateKey='';}catch(e){toastSafe('err','No se pudo reaccionar',String(e&&e.message||e));}
  }
  function reactionTray(p,m,id){
    const emojis=['👍','❤️','😂','😮','😢','🙏'];p.innerHTML=`<div class="nxWaReactTray">${emojis.map(x=>`<button type="button" data-emoji="${x}" class="${m.reaccion_agente===x?'on':''}">${x}</button>`).join('')}${m.reaccion_agente?'<button type="button" class="nxWaReactRemove" data-remove><i class="ti ti-x"></i> Quitar reacción</button>':''}</div>`;
    $$('[data-emoji]',p).forEach(b=>b.addEventListener('click',async()=>{const em=b.dataset.emoji;closeMsgMenus();await reactTo(id,em);}));$('[data-remove]',p)?.addEventListener('click',async()=>{closeMsgMenus();await reactTo(id,'');});placeMenu(p,id);
  }
  async function openMsgMenu(event,id){
    event?.preventDefault?.();event?.stopPropagation?.();closeMsgMenus();
    const p=document.createElement('div');p.className='nxWaMsgPro';p.dataset.id=id;p.innerHTML='<button type="button" disabled><i class="ti ti-loader-2"></i> Cargando…</button>';document.body.appendChild(p);placeMenu(p,id);
    let m=null;try{m=await fetchMsg(id);}catch(e){}if(!p.isConnected)return;if(!m){p.innerHTML='<button type="button" data-act="reply"><i class="ti ti-corner-up-left"></i> Responder</button>';}
    else p.innerHTML=`<button type="button" data-act="reply"><i class="ti ti-corner-up-left"></i> Responder</button><button type="button" data-act="react"><i class="ti ti-mood-smile"></i> Reaccionar${m.reaccion_agente?' · '+esc(m.reaccion_agente):''}</button>${m.cuerpo?'<button type="button" data-act="copy"><i class="ti ti-copy"></i> Copiar</button>':''}<button type="button" data-act="forward"><i class="ti ti-share-3"></i> Reenviar</button><button type="button" data-act="info"><i class="ti ti-info-circle"></i> Info del mensaje</button>${m.direccion==='out'&&m.estado==='fallido'?'<div class="sep"></div><button type="button" class="danger" data-act="retry"><i class="ti ti-refresh"></i> Reintentar</button>':''}`;
    p.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;e.stopPropagation();const a=b.dataset.act;if(a==='reply'){closeMsgMenus();try{window.nxWaSetRespuesta?.(id);}catch(_e){}}else if(a==='react'&&m){reactionTray(p,m,id);}else if(a==='copy'&&m){closeMsgMenus();try{await navigator.clipboard.writeText(String(m.cuerpo||''));toastSafe('ok','Mensaje copiado');}catch(_e){toastSafe('err','No se pudo copiar');}}else if(a==='forward'&&m){closeMsgMenus();openForward(m);}else if(a==='info'&&m){closeMsgMenus();openInfo(m);}else if(a==='retry'){closeMsgMenus();try{window.nxWaReintentarMensaje?.(id);}catch(_e){}}});
    placeMenu(p,id);setTimeout(()=>document.addEventListener('click',()=>p.remove(),{once:true}),0);
  }
  function ensureMsgButtons(){
    $$('#v-waInbox .nxWaBubWrap[id^="nxWaMsg-"]').forEach(w=>{if($('.nxWaMsgDrop',w))return;const id=w.id.slice('nxWaMsg-'.length);const b=document.createElement('button');b.type='button';b.className='nxWaMsgDrop';b.setAttribute('aria-label','Acciones del mensaje');b.innerHTML='<i class="ti ti-chevron-down"></i>';b.addEventListener('click',e=>openMsgMenu(e,id));w.appendChild(b);});
  }
  async function signedMediaUrl(path){
    const A=api();if(!A?.url)throw new Error('Storage no disponible');const clean=String(path||'').replace(/^\/+/,''),enc=clean.split('/').map(encodeURIComponent).join('/');
    const r=await fetch(A.url+'/storage/v1/object/sign/whatsapp-inbox-media/'+enc,{method:'POST',headers:authHeaders(true),body:JSON.stringify({expiresIn:600})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||'No se pudo abrir el archivo');const u=d.signedURL||d.signedUrl;if(!u)throw new Error('No se obtuvo enlace del archivo');return /^https?:/i.test(u)?u:A.url+u;
  }
  function initials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';}
  function openForward(m){
    const ov=document.createElement('div');ov.className='nxWaModalOv nxWaForwardOv';ov.innerHTML='<section class="nxWaModalCard nxWaForwardCard" role="dialog" aria-modal="true"><div class="nxWaModalHead"><b>Reenviar mensaje</b><button type="button" data-close><i class="ti ti-x"></i></button></div><div class="nxWaForwardSearch"><input type="search" placeholder="Buscar cliente…" autocomplete="off"></div><div class="nxWaForwardList"></div></section>';document.body.appendChild(ov);
    const list=$('.nxWaForwardList',ov),input=$('input',ov);const close=()=>ov.remove();$('[data-close]',ov)?.addEventListener('click',close);ov.addEventListener('click',e=>{if(e.target===ov)close();});
    const render=()=>{const q=norm(input.value),xs=clientes().filter(c=>c?.id&&(c.wa||c.tel)&&(!q||norm((c.nom||'')+' '+(c.wa||c.tel||'')).includes(q))).slice(0,120);list.innerHTML=xs.length?xs.map(c=>`<button type="button" class="nxWaForwardRow" data-id="${esc(c.id)}"><span class="av">${esc(initials(c.nom))}</span><span class="tx"><b>${esc(c.nom||'Cliente')}</b><span>${esc(c.wa||c.tel||'')}</span></span><i class="ti ti-send"></i></button>`).join(''):'<div style="padding:26px;text-align:center;color:#7184a5;font-size:10px">No hay coincidencias</div>';};render();input.addEventListener('input',render);setTimeout(()=>input.focus(),80);
    list.addEventListener('click',async e=>{const b=e.target.closest('.nxWaForwardRow');if(!b)return;const cid=b.dataset.id,A=api();if(!A?.post)return;b.disabled=true;const old=b.innerHTML;b.innerHTML='<span class="av"><i class="ti ti-loader-2"></i></span><span class="tx"><b>Reenviando…</b></span>';
      try{const hid=await A.post('rpc/whatsapp_hilo_por_cliente',{p_cliente_id:cid});const target=String(hid||'').replace(/^"|"$/g,'');if(!target)throw new Error('No se pudo abrir el hilo destino');const payload={hilo_id:target};const tipo=String(m.tipo_contenido||'text');const cap=String(m.cuerpo||'').trim();if(m.media_path&&['imagen','audio','video','documento'].includes(tipo)){payload.attachment_url=await signedMediaUrl(m.media_path);payload.attachment_type={imagen:'image',audio:'audio',video:'video',documento:'file'}[tipo];if(cap&&!/^\[(imagen|audio|video|documento)\]$/i.test(cap))payload.mensaje=cap;if(tipo==='documento')payload.attachment_name='Documento';}else{payload.mensaje=cap||('Mensaje reenviado · '+tipo);}await edgeSend(payload);toastSafe('ok','Mensaje reenviado');close();}
      catch(err){b.disabled=false;b.innerHTML=old;toastSafe('err','No se pudo reenviar',String(err&&err.message||err));}
    });
  }
  function agentName(id){if(!id)return'—';const a=agentes().find(x=>String(x?.id)===String(id));return a?.nom||'Agente';}
  function openInfo(m){
    const ov=document.createElement('div');ov.className='nxWaModalOv';const state=String(m.estado||'').toLowerCase(),stateCls=state==='fallido'?'bad':(['leido','entregado','enviado','recibido'].includes(state)?'ok':'');const fecha=(()=>{try{return new Date(m.created_at).toLocaleString('es-DO',{dateStyle:'medium',timeStyle:'short'});}catch(e){return m.created_at||'—';}})();ov.innerHTML=`<section class="nxWaModalCard" role="dialog" aria-modal="true"><div class="nxWaModalHead"><b>Info del mensaje</b><button type="button" data-close><i class="ti ti-x"></i></button></div><div class="nxWaModalBody"><dl class="nxWaMsgInfo"><dt>Dirección</dt><dd>${m.direccion==='out'?'Enviado por NEXUS':'Recibido del cliente'}</dd><dt>Estado</dt><dd class="${stateCls}">${esc(m.estado||'—')}</dd><dt>Tipo</dt><dd>${esc(m.tipo_contenido||'text')}</dd><dt>Fecha y hora</dt><dd>${esc(fecha)}</dd>${m.direccion==='out'?`<dt>Agente</dt><dd>${esc(agentName(m.enviado_por_agente_id))}</dd>`:''}<dt>Respondió a otro</dt><dd>${m.responde_a_id?'Sí':'No'}</dd><dt>Reacción</dt><dd>${esc(m.reaccion_agente||'—')}</dd>${m.error_detalle?`<dt>Error</dt><dd class="bad">${esc(m.error_detalle)}</dd>`:''}<dt>ID WhatsApp</dt><dd>${esc(m.wa_message_id||'Pendiente/no disponible')}</dd></dl></div></section>`;document.body.appendChild(ov);const close=()=>ov.remove();$('[data-close]',ov)?.addEventListener('click',close);ov.addEventListener('click',e=>{if(e.target===ov)close();});
  }
  async function hydrateReactions(){
    const id=hiloActualId(),wraps=$$('#v-waInbox .nxWaBubWrap[id^="nxWaMsg-"]');if(!id||!wraps.length||hydrateBusy)return;const key=id+'|'+wraps.length+'|'+wraps.at(-1)?.id;if(key===lastHydrateKey)return;hydrateBusy=true;try{const A=api(),rows=await A.get('whatsapp_hilo_mensajes',`hilo_id=eq.${id}&order=created_at.asc&limit=200&select=id,reaccion_agente`)||[];rows.forEach(m=>setReactionDom(m.id,m.reaccion_agente||''));lastHydrateKey=key;}catch(e){}finally{hydrateBusy=false;}
  }

  function enhance(){queued=false;css();ensureComposer();ensureMsgButtons();hydrateReactions();if(voice.hiloId&&voice.hiloId!==hiloActualId()&&(voice.rec||voice.blob))resetVoice();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();
    const baseMenu=window.nxWaMsgMenu;window.__nxWaMsgMenuBase=window.__nxWaMsgMenuBase||baseMenu;window.nxWaMsgMenu=function(event,id){return openMsgMenu(event,id);};
    document.addEventListener('contextmenu',e=>{const w=e.target.closest?.('#v-waInbox .nxWaBubWrap[id^="nxWaMsg-"]');if(!w)return;e.preventDefault();openMsgMenu(e,w.id.slice('nxWaMsg-'.length));});
    window.addEventListener('pointermove',e=>{if(!voice.rec||voice.pointerId!==e.pointerId)return;const dx=e.clientX-voice.startX;voice.cancel=dx<-78;const b=$('.nxWaVoiceRec',composer());b?.classList.toggle('cancel',voice.cancel);},{passive:true});
    const end=e=>{if(voice.pointerId!==e.pointerId)return;voice.pressing=false;if(voice.rec)finishVoice(voice.cancel);voice.pointerId=null;};window.addEventListener('pointerup',end,{passive:true});window.addEventListener('pointercancel',e=>{if(voice.pointerId!==e.pointerId)return;voice.pressing=false;if(voice.rec)finishVoice(true);voice.pointerId=null;},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&voice.rec)finishVoice(true);});
    window.visualViewport?.addEventListener('resize',()=>{$('.nxWaMsgPro')&&placeMenu($('.nxWaMsgPro'),$('.nxWaMsgPro')?.dataset?.id||'');});
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);else{const r=$('#v-waInbox')||document.body;obs=new MutationObserver(queue);obs.observe(r,{childList:true,subtree:true});}
    queue();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
