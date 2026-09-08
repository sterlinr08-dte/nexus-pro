/* NEXUS PRO · WhatsApp chat final · 2026-09-08
   Pulido seguro sobre parches-whatsapp-chat-acciones.js:
   - corrige cabecera/menu en movil y escritorio usando visualViewport
   - agrega preview + caption + confirmacion antes de enviar adjuntos
   - NO toca Contactos, sus filtros ni su MutationObserver
*/
(function(){
  'use strict';
  if(window.__nxWaChatFinal20260908)return;
  window.__nxWaChatFinal20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let activePreview=null;

  function api(){try{return typeof API!=='undefined'?API:window.API;}catch(e){return window.API;}}
  function toastSafe(tipo,tit,sub){try{if(typeof toast==='function')return toast(tipo,tit,sub);}catch(e){} console.log('[WA]',tit,sub||'');}
  function hiloActualId(){
    const r=$('#v-waInbox .nxWaRow.on');
    const oc=r&&r.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function viewport(){
    const v=window.visualViewport;
    return v?{left:v.offsetLeft||0,top:v.offsetTop||0,width:v.width||innerWidth,height:v.height||innerHeight}:{left:0,top:0,width:innerWidth,height:innerHeight};
  }
  function clampPop(pop,anchor,isAttach){
    if(!pop||!anchor)return;
    requestAnimationFrame(()=>{
      if(!pop.isConnected||!anchor.isConnected)return;
      const vp=viewport(), ar=anchor.getBoundingClientRect(), pr=pop.getBoundingClientRect(), M=10;
      let left=isAttach?ar.left:(ar.right-pr.width);
      left=Math.max(vp.left+M,Math.min(left,vp.left+vp.width-pr.width-M));
      let top;
      if(isAttach){
        top=ar.top-pr.height-10;
        if(top<vp.top+M)top=ar.bottom+10;
      }else{
        top=ar.bottom+8;
        if(top+pr.height>vp.top+vp.height-M)top=ar.top-pr.height-8;
      }
      top=Math.max(vp.top+M,Math.min(top,vp.top+vp.height-pr.height-M));
      pop.style.left=Math.round(left)+'px';
      pop.style.top=Math.round(top)+'px';
      pop.style.right='auto';
      pop.style.bottom='auto';
      pop.style.maxHeight=Math.max(150,Math.floor(vp.height-M*2))+'px';
      pop.style.overflowY='auto';
    });
  }
  function reclampOpen(){
    const p=$('.nxWaChatPop');if(!p)return;
    const attach=p.classList.contains('nxWaAttachPop');
    const a=attach?$('#v-waInbox .nxWaComposer .nxWaIconBtn'):$('#v-waInbox .nxWaChatMoreBtn');
    if(a)clampPop(p,a,attach);
  }

  function css(){
    if($('#nxWaChatFinalCss'))return;
    const s=document.createElement('style');s.id='nxWaChatFinalCss';s.textContent=`
/* En escritorio no debe aparecer la flecha movil. */
@media(min-width:761px){
  #v-waInbox .nxWaBackMob{display:none!important}
  #v-waInbox .nxWaHead{min-height:58px!important}
}
@media(max-width:760px){
  #v-waInbox .nxWaHead{min-height:58px!important;padding-left:max(8px,env(safe-area-inset-left))!important;padding-right:max(8px,env(safe-area-inset-right))!important}
  #v-waInbox .nxWaBackMob,#v-waInbox .nxWaChatHeadBtn{width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important}
  .nxWaChatPop{max-width:calc(100vw - 20px)!important}
}
.nxWaPreviewCard{width:min(560px,100%);max-height:min(88dvh,760px)}
.nxWaPreviewBody{padding:12px 12px 4px;overflow:auto;display:flex;flex-direction:column;gap:11px}
.nxWaPreviewStage{min-height:150px;max-height:48dvh;border:1px solid #dfe8f4;border-radius:18px;background:#f5f8fc;display:grid;place-items:center;overflow:hidden;padding:8px}
.nxWaPreviewStage img,.nxWaPreviewStage video{display:block;max-width:100%;max-height:45dvh;border-radius:13px;object-fit:contain}
.nxWaPreviewStage audio{width:min(100%,430px)}
.nxWaPreviewDoc{width:100%;display:flex;align-items:center;gap:12px;padding:16px;border-radius:14px;background:#fff;border:1px solid #e1e8f2}
.nxWaPreviewDoc i{width:48px;height:48px;border-radius:14px;background:#eef4ff;color:#2563eb;display:grid;place-items:center;font-size:25px;flex:none}
.nxWaPreviewDoc .tx{min-width:0;flex:1}.nxWaPreviewDoc b{display:block;color:#102a56;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxWaPreviewDoc span{display:block;margin-top:4px;color:#7184a5;font-size:9px}
.nxWaPreviewCaption{width:100%;min-height:64px;max-height:130px;resize:none;border:1px solid #dbe5f2;border-radius:15px;background:#fff;color:#172b4d;padding:11px 12px;font:inherit;font-size:16px;line-height:1.35;outline:none}
.nxWaPreviewCaption:focus{border-color:#7aa7ec;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.nxWaPreviewFoot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:10px 12px 12px}
.nxWaPreviewFoot button{min-height:42px;border-radius:13px;padding:0 15px;border:1px solid #dce6f3;background:#fff;color:#24446f;font:inherit;font-size:10.5px;font-weight:850;cursor:pointer}
.nxWaPreviewFoot button.primary{border-color:#2563eb;background:#2563eb;color:#fff}
.nxWaPreviewFoot button:disabled{opacity:.55;cursor:wait}
.nxWaPreviewMeta{font-size:9px;color:#7184a5;text-align:center}
body.tema-premium .nxWaPreviewStage{background:#111d2d;border-color:rgba(148,163,184,.13)}
body.tema-premium .nxWaPreviewDoc,body.tema-premium .nxWaPreviewCaption{background:#172235;border-color:rgba(148,163,184,.14);color:#e6edf7}
body.tema-premium .nxWaPreviewDoc b{color:#f8fafc}
@media(max-width:760px){
  .nxWaModalOv.nxWaPreviewOv{place-items:end center;padding:8px 8px max(8px,env(safe-area-inset-bottom))}
  .nxWaPreviewCard{width:100%;max-height:calc(100dvh - max(12px,env(safe-area-inset-top)) - max(12px,env(safe-area-inset-bottom)));border-radius:22px}
  .nxWaPreviewStage{max-height:43dvh}
  .nxWaPreviewStage img,.nxWaPreviewStage video{max-height:40dvh}
  .nxWaPreviewFoot{padding-bottom:max(12px,env(safe-area-inset-bottom))}
}
@media(prefers-reduced-motion:reduce){.nxWaPreviewOv,.nxWaPreviewCard{animation:none!important}}
`;
    document.head.appendChild(s);
  }

  async function edge(payload){
    const A=api();if(!A?.url||!A?.key)throw new Error('API no disponible');
    const r=await fetch(`${A.url}/functions/v1/whatsapp-inbox-enviar`,{
      method:'POST',
      headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},
      body:JSON.stringify(payload)
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok)throw new Error(d.mensaje||d.error||('Error '+r.status));
    return d;
  }
  function attachmentType(file,kind){
    const t=String(file?.type||'').toLowerCase();
    if(kind==='camera'||t.startsWith('image/'))return'image';
    if(t.startsWith('video/'))return'video';
    if(kind==='audio'||t.startsWith('audio/'))return'audio';
    return'file';
  }
  function sizeLimit(type){return type==='image'?5*1024*1024:(type==='video'||type==='audio')?16*1024*1024:100*1024*1024;}
  function humanSize(n){
    n=Number(n)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB';
  }
  function closePreview(){
    if(!activePreview)return;
    try{activePreview.url&&URL.revokeObjectURL(activePreview.url);}catch(e){}
    try{activePreview.ov?.remove();}catch(e){}
    activePreview=null;
  }
  function previewStage(file,type,url){
    if(type==='image')return `<img src="${esc(url)}" alt="Vista previa">`;
    if(type==='video')return `<video src="${esc(url)}" controls playsinline></video>`;
    if(type==='audio')return `<audio src="${esc(url)}" controls></audio>`;
    return `<div class="nxWaPreviewDoc"><i class="ti ti-file-text"></i><div class="tx"><b>${esc(file.name||'Documento')}</b><span>${esc(file.type||'Archivo')} · ${esc(humanSize(file.size))}</span></div></div>`;
  }
  function showPreview(file,kind){
    closePreview();
    const type=attachmentType(file,kind),limit=sizeLimit(type);
    if(file.size>limit){toastSafe('err','Archivo demasiado grande','Máximo '+Math.round(limit/1024/1024)+' MB para este tipo.');return;}
    const url=URL.createObjectURL(file);
    const ov=document.createElement('div');ov.className='nxWaModalOv nxWaPreviewOv';
    const composer=$('#nxWaTexto'),draft=composer?.value||'';
    ov.innerHTML=`<section class="nxWaModalCard nxWaPreviewCard" role="dialog" aria-modal="true" aria-label="Vista previa del adjunto">
      <div class="nxWaModalHead"><b>Vista previa</b><button type="button" data-close aria-label="Cerrar"><i class="ti ti-x"></i></button></div>
      <div class="nxWaPreviewBody">
        <div class="nxWaPreviewStage">${previewStage(file,type,url)}</div>
        <div class="nxWaPreviewMeta">${esc(file.name||({image:'Imagen',video:'Video',audio:'Audio'}[type]||'Documento'))} · ${esc(humanSize(file.size))}</div>
        <textarea class="nxWaPreviewCaption" rows="2" placeholder="Agregar un mensaje…">${esc(draft)}</textarea>
      </div>
      <div class="nxWaPreviewFoot"><button type="button" data-cancel>Cancelar</button><button type="button" class="primary" data-send><i class="ti ti-send"></i> Enviar</button></div>
    </section>`;
    activePreview={ov,url,file,kind,type};
    const close=()=>closePreview();
    $('[data-close]',ov)?.addEventListener('click',close);
    $('[data-cancel]',ov)?.addEventListener('click',close);
    ov.addEventListener('click',e=>{if(e.target===ov)close();});
    $('[data-send]',ov)?.addEventListener('click',()=>sendPreview());
    document.body.appendChild(ov);
    setTimeout(()=>$('.nxWaPreviewCaption',ov)?.focus(),80);
  }
  async function sendPreview(){
    const x=activePreview;if(!x)return;
    const id=hiloActualId();if(!id){toastSafe('info','Abre una conversación primero');return;}
    const send=$('[data-send]',x.ov),cancel=$('[data-cancel]',x.ov),close=$('[data-close]',x.ov);
    const caption=($('.nxWaPreviewCaption',x.ov)?.value||'').trim();
    if(send){send.disabled=true;send.innerHTML='<i class="ti ti-loader-2"></i> Enviando…';}
    if(cancel)cancel.disabled=true;if(close)close.disabled=true;
    try{
      const pre=await edge({accion:'presign',filename:x.file.name||('archivo-'+Date.now()),content_type:x.file.type||'application/octet-stream'});
      if(!pre.uploadUrl||!pre.publicUrl)throw new Error('No se obtuvo URL segura para el archivo');
      const put=await fetch(pre.uploadUrl,{method:'PUT',headers:{'Content-Type':x.file.type||'application/octet-stream'},body:x.file});
      if(!put.ok)throw new Error('No se pudo subir el archivo ('+put.status+')');
      await edge({hilo_id:id,mensaje:caption,attachment_url:pre.publicUrl,attachment_type:x.type,attachment_name:x.type==='file'?(x.file.name||'Documento'):null,voice_note:false});
      const inp=$('#nxWaTexto');if(inp){inp.value='';try{if(typeof window.nxWaTextoInput==='function')window.nxWaTextoInput(inp);}catch(e){}}
      closePreview();
      toastSafe('ok',x.type==='image'?'Imagen enviada':x.type==='video'?'Video enviado':x.type==='audio'?'Audio enviado':'Documento enviado');
      if(typeof window.nxWaAbrirHilo==='function'){
        setTimeout(()=>{try{window.nxWaAbrirHilo(id);}catch(e){}},320);
        setTimeout(()=>{try{if(hiloActualId()===id)window.nxWaAbrirHilo(id);}catch(e){}},1300);
      }
    }catch(e){
      toastSafe('err','No se pudo enviar el adjunto',String(e&&e.message||e));
      if(send){send.disabled=false;send.innerHTML='<i class="ti ti-send"></i> Enviar';}
      if(cancel)cancel.disabled=false;if(close)close.disabled=false;
    }
  }
  function pickAndPreview(kind){
    const input=document.createElement('input');input.type='file';input.style.display='none';
    if(kind==='document')input.accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if(kind==='camera'){input.accept='image/*';input.setAttribute('capture','environment');}
    if(kind==='gallery')input.accept='image/*,video/*';
    if(kind==='audio')input.accept='audio/*';
    input.addEventListener('change',()=>{const f=input.files&&input.files[0];input.remove();if(f)showPreview(f,kind);},{once:true});
    document.body.appendChild(input);input.click();
    setTimeout(()=>{if(input.isConnected&&!(input.files&&input.files.length))input.remove();},60000);
  }

  function start(){
    css();
    /* Interceptamos SOLO los tipos que antes se enviaban inmediatamente. Ubicacion y Contacto
       continúan usando la implementación funcional existente. */
    document.addEventListener('click',e=>{
      const b=e.target.closest('.nxWaAttachGrid [data-k]');if(!b)return;
      const k=b.dataset.k;if(!['document','camera','gallery','audio'].includes(k))return;
      e.preventDefault();e.stopImmediatePropagation();
      $$('.nxWaAttachPop').forEach(x=>x.remove());
      pickAndPreview(k);
    },true);

    /* La capa anterior crea el popup; aquí solo corregimos su posición DESPUÉS de que exista. */
    document.addEventListener('click',e=>{
      const more=e.target.closest('#v-waInbox .nxWaChatMoreBtn');
      const attach=e.target.closest('#v-waInbox .nxWaComposer .nxWaIconBtn');
      if(more)setTimeout(()=>{const p=$('.nxWaMainMenu')||$('.nxWaChatPop');if(p)clampPop(p,more,false);},0);
      if(attach)setTimeout(()=>{const p=$('.nxWaAttachPop');if(p)clampPop(p,attach,true);},0);
    },false);
    if(window.visualViewport){
      window.visualViewport.addEventListener('resize',reclampOpen,{passive:true});
      window.visualViewport.addEventListener('scroll',reclampOpen,{passive:true});
    }
    window.addEventListener('resize',reclampOpen,{passive:true});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activePreview)closePreview();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
