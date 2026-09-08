/* NEXUS PRO · WhatsApp chat + acciones + adjuntos · 2026-09-08
   Capa aislada sobre el Inbox real. No reconstruye Contactos ni altera su observer.
   Añade UI del chat, menú de acciones y envío real de adjuntos/ubicación/contacto. */
(function(){
  'use strict';
  if(window.__nxWaChatAcciones20260908)return;
  window.__nxWaChatAcciones20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>{try{return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}catch(e){return String(v||'').toLowerCase().trim();}};
  let queued=false,obs=null,busy=false;

  function api(){try{return typeof API!=='undefined'?API:window.API;}catch(e){return window.API;}}
  function clientes(){try{return (window.ST||ST||{}).clientes||[];}catch(e){return [];}}
  function toastSafe(tipo,tit,sub){try{if(typeof toast==='function')return toast(tipo,tit,sub);}catch(e){} console.log('[WA]',tit,sub||'');}
  function hiloActualId(){
    const r=$('#v-waInbox .nxWaRow.on');
    const oc=r&&r.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function clienteActual(){
    const head=$('#v-waInbox .nxWaHead');if(!head)return null;
    const nombre=($('.nxWaClientName',head)||$('.nxWaHeadName',head))?.textContent||'';
    const k=norm(nombre);if(!k)return null;
    const xs=clientes().filter(c=>norm(c&&c.nom)===k);
    return xs.length===1?xs[0]:null;
  }
  function telefonoCliente(c){return String(c?.wa||c?.tel||'').replace(/\D/g,'');}

  function css(){
    if($('#nxWaChatAccCss'))return;
    const s=document.createElement('style');s.id='nxWaChatAccCss';s.textContent=`
#v-waInbox .nxWaBack{display:none!important}
#v-waInbox .nxWaHeadAction{display:none!important}
#v-waInbox .nxWaHead>.nxWaHeadAct:not(.nxWaBackMob){display:none!important}
#v-waInbox .nxWaHead{min-height:62px!important;padding:8px 10px!important;gap:8px!important;border-bottom:1px solid rgba(194,211,235,.55)!important;background:rgba(255,255,255,.91)!important;backdrop-filter:blur(22px) saturate(140%)!important;-webkit-backdrop-filter:blur(22px) saturate(140%)!important;box-shadow:0 10px 28px -28px rgba(15,39,78,.65)!important}
#v-waInbox .nxWaBackMob,#v-waInbox .nxWaChatHeadBtn{width:40px!important;height:40px!important;flex:0 0 40px!important;border-radius:14px!important;border:1px solid rgba(180,199,228,.48)!important;background:rgba(255,255,255,.88)!important;color:#163f83!important;display:grid!important;place-items:center!important;font-size:17px!important;box-shadow:none!important;cursor:pointer!important}
#v-waInbox .nxWaHeadMain{min-width:0!important;flex:1!important;gap:9px!important}
#v-waInbox .nxWaHeadAvatar,#v-waInbox .nxWaClientAv{width:42px!important;height:42px!important;flex:0 0 42px!important;border-radius:50%!important;background:linear-gradient(135deg,#14b8a6,#2563eb)!important;color:#fff!important;font-size:11px!important;box-shadow:none!important;border:1px solid rgba(255,255,255,.72)!important}
#v-waInbox .nxWaHeadText,#v-waInbox .nxWaHeadInfo{min-width:0!important;flex:1!important}
#v-waInbox .nxWaHeadName,#v-waInbox .nxWaClientName{font-size:12px!important;line-height:1.18!important;color:#081a45!important;font-weight:900!important;letter-spacing:-.12px!important}
#v-waInbox .nxWaHeadSub,#v-waInbox .nxWaClientMeta{font-size:8.3px!important;line-height:1.25!important;color:#7083a5!important;font-weight:750!important}
#v-waInbox .nxWaChatHeadActions{display:flex;align-items:center;gap:6px;flex:none;margin-left:auto}
#v-waInbox .nxWaChatHeadBtn:active{transform:scale(.94)}
#v-waInbox .nxWaMsgs{padding:15px 12px 22px!important;gap:5px!important;background-color:#f3f8fd!important;background-image:radial-gradient(circle at 12px 12px,rgba(37,99,235,.035) 1px,transparent 1.5px),radial-gradient(circle at 28px 26px,rgba(16,185,129,.028) 1px,transparent 1.5px),linear-gradient(180deg,rgba(249,252,255,.94),rgba(241,248,247,.96))!important;background-size:38px 38px,46px 46px,100% 100%!important}
#v-waInbox .nxWaBub{max-width:min(78%,570px)!important;padding:9px 11px 7px!important;border-radius:15px!important;font-size:11.4px!important;line-height:1.42!important;box-shadow:0 10px 24px -22px rgba(15,23,42,.42)!important}
#v-waInbox .nxWaBub.in{background:#fff!important;border:1px solid rgba(214,225,239,.82)!important;border-top-left-radius:5px!important}
#v-waInbox .nxWaBub.out{background:#dff7df!important;border:1px solid rgba(43,181,91,.18)!important;border-top-right-radius:5px!important}
#v-waInbox .nxWaBubMeta{margin-top:4px!important;font-size:7.8px!important;color:#7283a2!important;gap:4px!important;min-height:10px!important}
#v-waInbox .nxWaDateSep,#v-waInbox .nxWaDate{align-self:center!important;border:1px solid rgba(205,218,236,.52)!important;border-radius:999px!important;background:rgba(255,255,255,.88)!important;color:#3f5f8d!important;font-size:8px!important;font-weight:900!important;padding:5px 9px!important;box-shadow:none!important}
#v-waInbox .nxWaComposerWrap{padding:7px 8px max(8px,env(safe-area-inset-bottom))!important;background:rgba(248,251,255,.92)!important;border-top:1px solid rgba(204,217,236,.62)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important}
#v-waInbox .nxWaComposer{margin:0!important;padding:5px 5px 5px 6px!important;min-height:50px!important;border-radius:22px!important;border:1px solid rgba(187,205,232,.62)!important;background:#fff!important;box-shadow:0 12px 28px -25px rgba(24,61,112,.45)!important;gap:5px!important}
#v-waInbox .nxWaComposer textarea{min-height:38px!important;max-height:104px!important;padding:9px 8px!important;font-size:16px!important;line-height:1.3!important;color:#172b4d!important}
#v-waInbox .nxWaComposer .nxWaIconBtn{width:40px!important;height:40px!important;flex:0 0 40px!important;border-radius:50%!important;background:#eef4fc!important;color:#264f88!important;border:0!important;box-shadow:none!important;font-size:18px!important}
#v-waInbox .nxWaComposer>button:last-child{width:42px!important;height:42px!important;flex:0 0 42px!important;border-radius:50%!important;background:linear-gradient(135deg,#2878f0,#6d28d9)!important;color:#fff!important;border:0!important;box-shadow:none!important;font-size:18px!important}
#v-waInbox .nxWaReplyBar{margin:0 4px 6px!important;border-radius:13px!important;background:#f4f8ff!important;border-left:3px solid #2563eb!important}
#v-waInbox.nxWaWallClean .nxWaMsgs{background:#f7fafc!important;background-image:none!important}
#v-waInbox.nxWaWallBlue .nxWaMsgs{background:linear-gradient(180deg,#eef6ff,#f6faff)!important;background-image:none!important}
#v-waInbox.nxWaWallMint .nxWaMsgs{background:linear-gradient(180deg,#effaf6,#f8fcfb)!important;background-image:none!important}
.nxWaChatPop{position:fixed;z-index:100200;width:min(330px,calc(100vw - 24px));border:1px solid rgba(190,207,233,.70);border-radius:20px;background:rgba(255,255,255,.97);box-shadow:0 28px 70px -34px rgba(15,39,78,.58);backdrop-filter:blur(26px) saturate(145%);-webkit-backdrop-filter:blur(26px) saturate(145%);padding:7px;transform-origin:top right;animation:nxWaPopIn .18s cubic-bezier(.16,1,.3,1) both}
.nxWaChatPop button{width:100%;min-height:43px;border:0;border-radius:13px;background:transparent;color:#102a56;display:flex;align-items:center;gap:11px;padding:0 11px;font:inherit;font-size:11px;font-weight:750;text-align:left;cursor:pointer}.nxWaChatPop button:hover{background:#f3f7fd}.nxWaChatPop button:active{transform:scale(.985)}.nxWaChatPop button i{width:22px;text-align:center;font-size:18px;color:#245eae}.nxWaChatPop .sep{height:1px;background:#e6edf7;margin:4px 6px}.nxWaChatPop .danger{color:#b42318}.nxWaChatPop .danger i{color:#b42318}.nxWaChatPop .arr{margin-left:auto;color:#8295b4}
.nxWaAttachPop{width:min(360px,calc(100vw - 24px));padding:12px;transform-origin:bottom left}.nxWaAttachGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.nxWaAttachGrid button{min-height:88px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:7px!important;padding:8px 4px!important;text-align:center!important;font-size:10px!important}.nxWaAttachGrid button i{width:42px!important;height:42px!important;border-radius:50%;display:grid;place-items:center;font-size:20px!important;background:#eef4ff;color:#245eae}.nxWaAttachGrid button:nth-child(2) i{background:#fff0f6;color:#be185d}.nxWaAttachGrid button:nth-child(3) i{background:#f3edff;color:#6d28d9}.nxWaAttachGrid button:nth-child(4) i{background:#e7fbf5;color:#0f766e}.nxWaAttachGrid button:nth-child(5) i{background:#fff5df;color:#b45309}.nxWaAttachGrid button:nth-child(6) i{background:#eaf6ff;color:#0369a1}
.nxWaModalOv{position:fixed;inset:0;z-index:100190;background:rgba(15,23,42,.34);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);display:grid;place-items:center;padding:16px;animation:nxWaFadeIn .15s ease both}.nxWaModalCard{width:min(520px,100%);max-height:min(78dvh,720px);overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.9);border-radius:23px;background:#fff;box-shadow:0 30px 80px -38px rgba(15,23,42,.65);animation:nxWaModalIn .22s cubic-bezier(.16,1,.3,1) both}.nxWaModalHead{display:flex;align-items:center;gap:9px;padding:13px 14px;border-bottom:1px solid #e6edf7}.nxWaModalHead b{font-size:13px;color:#0c2249;flex:1}.nxWaModalHead button{width:34px;height:34px;border:0;border-radius:50%;background:#f3f6fb;color:#526b91}.nxWaModalBody{padding:12px;overflow:auto;min-height:120px}.nxWaMediaGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.nxWaMediaItem{aspect-ratio:1;border:1px solid #e1e9f4;border-radius:14px;overflow:hidden;background:#f5f8fc;display:grid;place-items:center;color:#526b91;font-size:10px;text-decoration:none}.nxWaMediaItem img,.nxWaMediaItem video{width:100%;height:100%;object-fit:cover}.nxWaContactPicker{display:flex;flex-direction:column;gap:7px}.nxWaContactPick{width:100%;border:1px solid #e2eaf5;border-radius:14px;background:#fff;padding:10px;display:flex;gap:10px;align-items:center;text-align:left}.nxWaContactPick .av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#eaf3ff;color:#2563eb;font-weight:900;flex:none}.nxWaContactPick b{display:block;font-size:10.5px;color:#102a56}.nxWaContactPick span{display:block;margin-top:2px;font-size:9px;color:#7184a5}.nxWaWallChoices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.nxWaWallChoice{height:90px!important;border:1px solid #dfe8f5!important;border-radius:16px!important;display:flex!important;align-items:flex-end!important;padding:9px!important;color:#14325f!important;font-weight:800!important}.nxWaWallChoice[data-wall="soft"]{background:linear-gradient(180deg,#f9fcff,#eff8f5)!important}.nxWaWallChoice[data-wall="clean"]{background:#f7fafc!important}.nxWaWallChoice[data-wall="blue"]{background:linear-gradient(180deg,#eaf4ff,#f7fbff)!important}.nxWaWallChoice[data-wall="mint"]{background:linear-gradient(180deg,#eaf9f4,#f9fcfb)!important}
.nxWaBusy{position:fixed;inset:0;z-index:100300;background:rgba(15,23,42,.18);display:grid;place-items:center;pointer-events:auto}.nxWaBusyBox{padding:13px 17px;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 20px 50px -28px rgba(15,23,42,.6);font-size:11px;font-weight:800;color:#173a71;display:flex;align-items:center;gap:9px}.nxWaBusySpin{width:17px;height:17px;border:2px solid #d9e5f5;border-top-color:#2563eb;border-radius:50%;animation:nxWaSpin .7s linear infinite}
@keyframes nxWaPopIn{from{opacity:0;transform:translateY(-5px) scale(.975)}to{opacity:1;transform:none}}@keyframes nxWaModalIn{from{opacity:.5;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}@keyframes nxWaFadeIn{from{opacity:0}to{opacity:1}}@keyframes nxWaSpin{to{transform:rotate(360deg)}}
body.tema-premium .nxWaChatPop,body.tema-premium .nxWaModalCard{background:#172235;border-color:rgba(148,163,184,.14)}body.tema-premium .nxWaChatPop button,body.tema-premium .nxWaModalHead b{color:#f3f7ff}body.tema-premium .nxWaChatPop button:hover{background:#223047}body.tema-premium .nxWaChatPop .sep,body.tema-premium .nxWaModalHead{border-color:rgba(148,163,184,.14);background-color:transparent}body.tema-premium .nxWaContactPick{background:#1c2a40;border-color:rgba(148,163,184,.14)}body.tema-premium .nxWaContactPick b{color:#f8fafc}
@media(max-width:760px){#v-waInbox .nxWaHead{min-height:60px!important;padding:7px 8px!important}#v-waInbox .nxWaBackMob{display:grid!important}#v-waInbox .nxWaHeadAvatar,#v-waInbox .nxWaClientAv{width:40px!important;height:40px!important;flex-basis:40px!important}#v-waInbox .nxWaHeadName,#v-waInbox .nxWaClientName{font-size:11.4px!important}#v-waInbox .nxWaHeadSub,#v-waInbox .nxWaClientMeta{font-size:7.8px!important;max-width:190px!important}#v-waInbox .nxWaChatHeadBtn{width:38px!important;height:38px!important;flex-basis:38px!important}#v-waInbox .nxWaBub{max-width:84%!important;font-size:11.2px!important}.nxWaChatPop{right:10px!important;left:auto!important;top:auto!important;bottom:calc(76px + env(safe-area-inset-bottom))!important;transform-origin:bottom right}.nxWaAttachPop{left:10px!important;right:auto!important;bottom:calc(76px + env(safe-area-inset-bottom))!important}.nxWaMediaGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.nxWaModalOv{align-items:end;padding:0}.nxWaModalCard{width:100%;max-height:76dvh;border-radius:24px 24px 0 0;border-bottom:0}.nxWaWallChoices{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaChatHeadBtn,.nxWaChatPop,.nxWaModalOv,.nxWaModalCard,.nxWaAttachGrid button{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(s);
  }

  function closePop(){document.querySelectorAll('.nxWaChatPop').forEach(x=>x.remove());}
  function closeModal(){document.querySelectorAll('.nxWaModalOv').forEach(x=>x.remove());}
  function showBusy(label){
    document.querySelectorAll('.nxWaBusy').forEach(x=>x.remove());busy=true;const d=document.createElement('div');d.className='nxWaBusy';d.innerHTML='<div class="nxWaBusyBox"><span class="nxWaBusySpin"></span>'+esc(label||'Procesando…')+'</div>';document.body.appendChild(d);
  }
  function hideBusy(){document.querySelectorAll('.nxWaBusy').forEach(x=>x.remove());busy=false;}
  function positionPop(p,anchor,preferUp){
    document.body.appendChild(p);
    if(window.innerWidth<=760)return;
    const r=anchor?.getBoundingClientRect?.()||{left:window.innerWidth-50,right:window.innerWidth-20,top:70,bottom:100};
    const w=Math.min(330,window.innerWidth-24),h=p.offsetHeight||360;
    let left=Math.min(window.innerWidth-w-12,Math.max(12,r.right-w));
    let top=preferUp?Math.max(12,r.top-h-8):Math.min(window.innerHeight-h-12,r.bottom+7);
    p.style.left=left+'px';p.style.top=top+'px';
  }

  async function edge(payload){
    const A=api();if(!A?.url||!A?.key)throw new Error('WhatsApp no configurado');
    const r=await fetch(A.url+'/functions/v1/whatsapp-inbox-enviar',{method:'POST',headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.ok){const msg=d.mensaje||d.error||('HTTP '+r.status);throw new Error(msg);}
    return d;
  }
  function refrescarHilo(id){
    if(!id||typeof window.nxWaAbrirHilo!=='function')return;
    setTimeout(()=>{try{window.nxWaAbrirHilo(id);}catch(e){}},500);
    setTimeout(()=>{try{if(hiloActualId()===id)window.nxWaAbrirHilo(id);}catch(e){}},1600);
  }

  function openMainMenu(anchor){
    closePop();
    const c=clienteActual();
    const p=document.createElement('div');p.className='nxWaChatPop nxWaMainMenu';
    p.innerHTML=`
      <button data-a="buscar"><i class="ti ti-search"></i><span>Buscar</span></button>
      <button data-a="media"><i class="ti ti-photo"></i><span>Multimedia, enlaces y docs</span></button>
      <button data-a="wall"><i class="ti ti-wallpaper"></i><span>Fondo de pantalla</span></button>
      <div class="sep"></div>
      <button data-a="contact"><i class="ti ti-user"></i><span>Ver contacto</span></button>
      <button data-a="crm" ${c?'':'disabled'}><i class="ti ti-briefcase"></i><span>Abrir ficha CRM</span></button>
      <button data-a="unread"><i class="ti ti-mail"></i><span>Marcar como no leído</span></button>
      <div class="sep"></div>
      <button data-a="more"><i class="ti ti-dots"></i><span>Más</span><i class="ti ti-chevron-right arr"></i></button>`;
    p.addEventListener('click',e=>{
      const b=e.target.closest('button[data-a]');if(!b||b.disabled)return;
      const a=b.dataset.a;
      if(a==='buscar'){closePop();if(typeof window.nxWaToggleBuscar==='function')window.nxWaToggleBuscar(true);}
      else if(a==='media'){closePop();openMedia();}
      else if(a==='wall'){closePop();openWallpaper();}
      else if(a==='contact'){closePop();openContactCard();}
      else if(a==='crm'){closePop();const x=clienteActual();if(x&&typeof window.nxWaVisualAbrirFicha==='function')window.nxWaVisualAbrirFicha(x.id);}
      else if(a==='unread'){closePop();markUnread();}
      else if(a==='more'){closePop();openMoreMenu(anchor);}
    });
    positionPop(p,anchor,false);
  }

  function openMoreMenu(anchor){
    const p=document.createElement('div');p.className='nxWaChatPop';
    p.innerHTML=`<button data-a="back"><i class="ti ti-chevron-left"></i><span>Volver</span></button><div class="sep"></div>
      <button data-a="copy"><i class="ti ti-copy"></i><span>Copiar número</span></button>
      <button data-a="last"><i class="ti ti-arrow-down"></i><span>Ir al último mensaje</span></button>
      <button data-a="refresh"><i class="ti ti-refresh"></i><span>Actualizar conversación</span></button>
      <button data-a="close"><i class="ti ti-arrow-back-up"></i><span>Volver a conversaciones</span></button>`;
    p.addEventListener('click',async e=>{
      const b=e.target.closest('button[data-a]');if(!b)return;
      const a=b.dataset.a;
      if(a==='back'){closePop();openMainMenu(anchor);return;}
      closePop();
      if(a==='copy'){
        const c=clienteActual(),t=telefonoCliente(c)||($('.nxWaHeadSub')?.textContent||'').replace(/\D/g,'');
        if(!t)return toastSafe('info','Sin número disponible');
        try{await navigator.clipboard.writeText(t);toastSafe('ok','Número copiado');}catch(err){toastSafe('err','No se pudo copiar');}
      } else if(a==='last'){$('#nxWaMsgsBox')?.scrollTo({top:$('#nxWaMsgsBox').scrollHeight,behavior:'smooth'});}
      else if(a==='refresh'){const id=hiloActualId();if(id&&typeof window.nxWaAbrirHilo==='function')window.nxWaAbrirHilo(id);}
      else if(a==='close'){if(typeof window.nxWaCerrarDetalleMob==='function')window.nxWaCerrarDetalleMob();}
    });
    positionPop(p,anchor,false);
  }

  async function markUnread(){
    const id=hiloActualId();if(!id)return toastSafe('info','No hay conversación abierta');
    const A=api();
    try{
      if(!A?.post)throw new Error('API no disponible');
      await A.post('rpc/whatsapp_marcar_hilo_no_leido',{p_hilo_id:id});
      toastSafe('ok','Conversación marcada como no leída');
      if(window.innerWidth<=760&&typeof window.nxWaCerrarDetalleMob==='function')window.nxWaCerrarDetalleMob();
    }catch(e){toastSafe('err','No se pudo marcar como no leído',String(e?.message||e));}
  }

  function openContactCard(){
    const c=clienteActual();
    const ov=document.createElement('div');ov.className='nxWaModalOv';
    const content=c?`<div style="display:flex;align-items:center;gap:12px"><div style="width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#eaf3ff;color:#2563eb;font-weight:900">${esc(String(c.nom||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</div><div><b style="font-size:13px;color:#102a56">${esc(c.nom||'Cliente')}</b><div style="font-size:10px;color:#7184a5;margin-top:4px">${esc(c.wa||c.tel||'Sin teléfono')}</div><div style="font-size:9px;color:#7184a5;margin-top:3px">${esc([c.plan,c.ars].filter(Boolean).join(' · '))}</div></div></div>`:'<div style="text-align:center;color:#7184a5;padding:20px">Este chat no está vinculado a un cliente único.</div>';
    ov.innerHTML=`<section class="nxWaModalCard"><div class="nxWaModalHead"><b>Contacto</b><button type="button"><i class="ti ti-x"></i></button></div><div class="nxWaModalBody">${content}</div>${c?`<div style="padding:0 12px 12px"><button class="btn bxl" data-open style="width:100%"><i class="ti ti-briefcase"></i> Abrir ficha CRM</button></div>`:''}</section>`;
    ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('.nxWaModalHead button'))ov.remove();});
    $('[data-open]',ov)?.addEventListener('click',()=>{ov.remove();if(typeof window.nxWaVisualAbrirFicha==='function')window.nxWaVisualAbrirFicha(c.id);});
    document.body.appendChild(ov);
  }

  function openMedia(){
    const box=$('#nxWaMsgsBox');
    const items=[];
    if(box){
      $$('img',box).forEach(x=>{if(x.src)items.push(`<a class="nxWaMediaItem" href="${esc(x.src)}" target="_blank" rel="noopener"><img src="${esc(x.src)}"></a>`);});
      $$('video',box).forEach(x=>{if(x.src)items.push(`<a class="nxWaMediaItem" href="${esc(x.src)}" target="_blank" rel="noopener"><video src="${esc(x.src)}"></video></a>`);});
      $$('a[href]',box).forEach(x=>{const href=x.href;if(href&&!items.some(v=>v.includes(esc(href))))items.push(`<a class="nxWaMediaItem" href="${esc(href)}" target="_blank" rel="noopener"><i class="ti ti-file" style="font-size:25px"></i><span>${esc((x.textContent||'Documento').trim().slice(0,28))}</span></a>`);});
    }
    const ov=document.createElement('div');ov.className='nxWaModalOv';
    ov.innerHTML=`<section class="nxWaModalCard"><div class="nxWaModalHead"><b>Multimedia, enlaces y documentos</b><button><i class="ti ti-x"></i></button></div><div class="nxWaModalBody">${items.length?`<div class="nxWaMediaGrid">${items.join('')}</div>`:'<div style="text-align:center;color:#7184a5;padding:28px 10px">No hay multimedia ni documentos en los mensajes cargados.</div>'}</div></section>`;
    ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('.nxWaModalHead button'))ov.remove();});document.body.appendChild(ov);
  }

  function applyWallpaper(w){
    const root=$('#v-waInbox');if(!root)return;
    ['nxWaWallClean','nxWaWallBlue','nxWaWallMint'].forEach(c=>root.classList.remove(c));
    if(w==='clean')root.classList.add('nxWaWallClean');if(w==='blue')root.classList.add('nxWaWallBlue');if(w==='mint')root.classList.add('nxWaWallMint');
    try{localStorage.setItem('nx_wa_wallpaper',w);}catch(e){}
  }
  function openWallpaper(){
    const ov=document.createElement('div');ov.className='nxWaModalOv';
    ov.innerHTML=`<section class="nxWaModalCard"><div class="nxWaModalHead"><b>Fondo de pantalla</b><button><i class="ti ti-x"></i></button></div><div class="nxWaModalBody"><div class="nxWaWallChoices"><button class="nxWaWallChoice" data-wall="soft">Suave</button><button class="nxWaWallChoice" data-wall="clean">Limpio</button><button class="nxWaWallChoice" data-wall="blue">Azul</button><button class="nxWaWallChoice" data-wall="mint">Menta</button></div></div></section>`;
    ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('.nxWaModalHead button'))ov.remove();const b=e.target.closest('[data-wall]');if(b){applyWallpaper(b.dataset.wall);ov.remove();}});document.body.appendChild(ov);
  }

  function openAttach(anchor){
    if(busy)return;
    closePop();
    const p=document.createElement('div');p.className='nxWaChatPop nxWaAttachPop';
    p.innerHTML=`<div class="nxWaAttachGrid">
      <button data-k="document"><i class="ti ti-file-text"></i><span>Documento</span></button>
      <button data-k="camera"><i class="ti ti-camera"></i><span>Cámara</span></button>
      <button data-k="gallery"><i class="ti ti-photo"></i><span>Galería</span></button>
      <button data-k="audio"><i class="ti ti-microphone"></i><span>Audio</span></button>
      <button data-k="location"><i class="ti ti-map-pin"></i><span>Ubicación</span></button>
      <button data-k="contact"><i class="ti ti-user"></i><span>Contacto</span></button>
    </div>`;
    p.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(!b)return;const k=b.dataset.k;closePop();if(['document','camera','gallery','audio'].includes(k))pickFile(k);else if(k==='location')sendLocation();else if(k==='contact')openContactPicker();});
    positionPop(p,anchor,true);
  }

  function pickFile(kind){
    const input=document.createElement('input');input.type='file';input.style.display='none';
    if(kind==='document')input.accept='.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if(kind==='camera'){input.accept='image/*';input.setAttribute('capture','environment');}
    if(kind==='gallery')input.accept='image/*,video/*';
    if(kind==='audio')input.accept='audio/*';
    input.addEventListener('change',()=>{const f=input.files&&input.files[0];input.remove();if(f)sendFile(f,kind);},{once:true});
    document.body.appendChild(input);input.click();setTimeout(()=>{if(input.isConnected&&!input.files?.length)input.remove();},60000);
  }
  function attachmentType(file,kind){
    const t=String(file.type||'').toLowerCase();
    if(kind==='camera'||t.startsWith('image/'))return'image';
    if(t.startsWith('video/'))return'video';
    if(kind==='audio'||t.startsWith('audio/'))return'audio';
    return'file';
  }
  function sizeLimit(type){return type==='image'?5*1024*1024:(type==='video'||type==='audio')?16*1024*1024:100*1024*1024;}
  async function sendFile(file,kind){
    const id=hiloActualId();if(!id)return toastSafe('info','Abre una conversación primero');
    const type=attachmentType(file,kind),limit=sizeLimit(type);
    if(file.size>limit)return toastSafe('err','Archivo demasiado grande','Máximo '+Math.round(limit/1024/1024)+' MB para este tipo.');
    busy=true;showBusy('Subiendo '+(file.name||'archivo')+'…');
    try{
      const pre=await edge({accion:'presign',filename:file.name||('archivo-'+Date.now()),content_type:file.type||'application/octet-stream'});
      const put=await fetch(pre.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
      if(!put.ok)throw new Error('No se pudo subir el archivo ('+put.status+')');
      const inp=$('#nxWaTexto'),caption=(inp?.value||'').trim();
      await edge({hilo_id:id,mensaje:caption,attachment_url:pre.publicUrl,attachment_type:type,attachment_name:type==='file'?(file.name||'Documento'):null,voice_note:false});
      if(inp){inp.value='';try{if(typeof window.nxWaTextoInput==='function')window.nxWaTextoInput(inp);}catch(e){}}
      toastSafe('ok',type==='image'?'Imagen enviada':type==='video'?'Video enviado':type==='audio'?'Audio enviado':'Documento enviado');
      refrescarHilo(id);
    }catch(e){toastSafe('err','No se pudo enviar el adjunto',String(e?.message||e));}
    finally{hideBusy();}
  }

  async function sendLocation(){
    const id=hiloActualId();if(!id)return toastSafe('info','Abre una conversación primero');
    if(!navigator.geolocation)return toastSafe('err','Ubicación no disponible en este navegador');
    busy=true;showBusy('Obteniendo ubicación…');
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{await edge({hilo_id:id,location:{latitude:pos.coords.latitude,longitude:pos.coords.longitude,name:'Ubicación compartida'}});toastSafe('ok','Ubicación enviada');refrescarHilo(id);}catch(e){toastSafe('err','No se pudo enviar la ubicación',String(e?.message||e));}finally{hideBusy();}
    },err=>{hideBusy();toastSafe('err','No se pudo obtener la ubicación',err.message||'Permiso denegado');},{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  }

  function openContactPicker(){
    const xs=clientes().filter(c=>c&&c.activo!==false&&telefonoCliente(c)).sort((a,b)=>String(a.nom||'').localeCompare(String(b.nom||''),'es'));
    const ov=document.createElement('div');ov.className='nxWaModalOv';
    const rows=xs.slice(0,150).map(c=>{const ini=String(c.nom||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();return `<button class="nxWaContactPick" data-id="${esc(c.id)}"><span class="av">${esc(ini)}</span><span><b>${esc(c.nom||'Cliente')}</b><span>${esc(c.wa||c.tel||'')}</span></span></button>`;}).join('');
    ov.innerHTML=`<section class="nxWaModalCard"><div class="nxWaModalHead"><b>Enviar contacto</b><button><i class="ti ti-x"></i></button></div><div style="padding:9px 12px 0"><input class="inp" data-search placeholder="Buscar contacto…" style="width:100%;height:42px;font-size:16px"></div><div class="nxWaModalBody"><div class="nxWaContactPicker">${rows||'<div style="text-align:center;color:#7184a5">No hay contactos con teléfono.</div>'}</div></div></section>`;
    $('[data-search]',ov)?.addEventListener('input',e=>{const q=norm(e.target.value);$$('.nxWaContactPick',ov).forEach(r=>{r.style.display=!q||norm(r.textContent).includes(q)?'flex':'none';});});
    ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('.nxWaModalHead button')){ov.remove();return;}const b=e.target.closest('.nxWaContactPick');if(b){const c=clientes().find(x=>String(x.id)===String(b.dataset.id));if(c){ov.remove();sendContact(c);}}});document.body.appendChild(ov);
  }
  async function sendContact(c){
    const id=hiloActualId(),tel=telefonoCliente(c);if(!id||!tel)return toastSafe('err','Contacto sin teléfono válido');
    busy=true;showBusy('Enviando contacto…');
    try{await edge({hilo_id:id,contacts:[{name:{formatted_name:c.nom||'Contacto',first_name:c.nom||'Contacto'},phones:[{phone:tel,type:'CELL',wa_id:tel}]}]});toastSafe('ok','Contacto enviado');refrescarHilo(id);}catch(e){toastSafe('err','No se pudo enviar el contacto',String(e?.message||e));}finally{hideBusy();}
  }

  function enhanceHeader(){
    const root=$('#v-waInbox'),head=root&&$('.nxWaHead',root);if(!head)return;
    if(head.dataset.nxWaChatAcc==='1')return;
    head.dataset.nxWaChatAcc='1';
    let acts=$('.nxWaChatHeadActions',head);
    if(!acts){acts=document.createElement('div');acts.className='nxWaChatHeadActions';head.appendChild(acts);}
    const search=document.createElement('button');search.type='button';search.className='nxWaChatHeadBtn nxWaChatSearchBtn';search.setAttribute('aria-label','Buscar en conversación');search.innerHTML='<i class="ti ti-search"></i>';search.onclick=()=>{if(typeof window.nxWaToggleBuscar==='function')window.nxWaToggleBuscar(true);};
    const more=document.createElement('button');more.type='button';more.className='nxWaChatHeadBtn nxWaChatMoreBtn';more.setAttribute('aria-label','Más acciones');more.innerHTML='<i class="ti ti-dots-vertical"></i>';more.onclick=e=>{e.stopPropagation();openMainMenu(more);};
    acts.append(search,more);
  }
  function enhanceComposer(){
    const root=$('#v-waInbox'),comp=root&&$('.nxWaComposer',root);if(!comp)return;
    const b=$('.nxWaIconBtn',comp);if(b&&b.dataset.nxWaAttach!=='1'){
      b.dataset.nxWaAttach='1';b.setAttribute('aria-label','Adjuntar');b.title='Adjuntar';b.onclick=e=>{e.preventDefault();e.stopPropagation();openAttach(b);};
    }
  }
  function enhance(){queued=false;css();enhanceHeader();enhanceComposer();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();try{applyWallpaper(localStorage.getItem('nx_wa_wallpaper')||'soft');}catch(e){}
    queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else{obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true});}
    document.addEventListener('click',e=>{if(!e.target.closest('.nxWaChatPop,.nxWaChatMoreBtn,.nxWaIconBtn'))closePop();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePop();closeModal();}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
