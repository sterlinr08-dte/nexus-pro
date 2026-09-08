/* NEXUS PRO · WhatsApp visual 2026 · tercera pasada
   Pulido de uso diario: toolbar móvil, lectura de chats y acceso al último mensaje.
   No modifica API, envíos, pagos, webhooks ni reglas de negocio. */
(function(){
  'use strict';
  if(window.__nxWaVisualV4_20260907)return;
  window.__nxWaVisualV4_20260907=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let queued=false,obs=null;

  function css(){
    if($('#nxWaVisualV4Css'))return;
    const s=document.createElement('style');
    s.id='nxWaVisualV4Css';
    s.textContent=`
#v-waInbox .nxWaListTools{align-items:center!important;min-height:48px}
#v-waInbox .nxWaListCaption{display:flex;flex-direction:column;justify-content:center;min-width:92px;padding:0 2px}
#v-waInbox .nxWaListCaption b{font-size:10.5px;line-height:1.1;color:#0f172a;font-weight:900}
#v-waInbox .nxWaListCaption span{margin-top:2px;font-size:7.5px;color:#64748b;font-weight:750;white-space:nowrap}
#v-waInbox .nxWaListUnread{color:#2563eb!important}
#v-waInbox .nxWaSearchToggle{display:none;width:34px;height:34px;flex:0 0 34px;border:1px solid rgba(148,163,184,.22);border-radius:50%;background:rgba(255,255,255,.76);color:#1d4ed8;place-items:center;cursor:pointer;font-size:13px;box-shadow:0 8px 18px -17px rgba(15,23,42,.5)}
#v-waInbox .nxWaSearchToggle:active,#v-waInbox .nxWaComposer button:active,#v-waInbox .nxWaBack:active,#v-waInbox .nxWaHeadAction:active{transform:scale(.94)!important}
#v-waInbox .nxWaRow{min-height:64px;align-items:flex-start}
#v-waInbox .nxWaRow .nxWaWho{padding-top:1px}
#v-waInbox .nxWaRow .nxWaWho span{max-width:100%}
#v-waInbox .nxWaRow:has(.nxWaBadge):after{content:"";position:absolute;right:10px;bottom:9px;width:5px;height:5px;border-radius:50%;background:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
#v-waInbox .nxWaBub{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;user-select:text;-webkit-user-select:text}
#v-waInbox .nxWaHead{position:relative;z-index:5}
#v-waInbox .nxWaComposer{position:relative;z-index:5;touch-action:manipulation}
#v-waInbox .nxWaLatest{position:absolute;right:18px;bottom:70px;z-index:6;width:34px;height:34px;border:1px solid rgba(148,163,184,.22);border-radius:50%;background:rgba(255,255,255,.90);color:#2563eb;display:grid;place-items:center;box-shadow:0 10px 22px -14px rgba(15,23,42,.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);opacity:0;pointer-events:none;transform:translateY(5px);transition:opacity .15s ease,transform .15s ease;cursor:pointer}
#v-waInbox .nxWaLatest.show{opacity:1;pointer-events:auto;transform:none}
#v-waInbox .nxWaLatest i{font-size:15px}
#v-waInbox .nxWaEmpty.nxWaEmptyPolished{display:grid;place-items:center;align-content:center;gap:7px;min-height:160px;color:#64748b}
#v-waInbox .nxWaEmpty.nxWaEmptyPolished:before{content:"\ea4a";font-family:"tabler-icons";width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(37,99,235,.07);color:#2563eb;font-size:17px}
body.tema-premium #v-waInbox .nxWaListCaption b{color:#f8fafc}
body.tema-premium #v-waInbox .nxWaListCaption span{color:#9fb0c7}
body.tema-premium #v-waInbox .nxWaSearchToggle,body.tema-premium #v-waInbox .nxWaLatest{background:rgba(15,23,42,.72);border-color:rgba(148,163,184,.13);color:#93c5fd}
@media(max-width:760px){
  #v-waInbox .nxWaListTools{min-height:46px!important;padding:6px 7px!important;gap:6px!important}
  #v-waInbox .nxWaSearchToggle{display:grid}
  #v-waInbox .nxWaListCaption{flex:1;min-width:0}
  #v-waInbox .nxWaListCaption b{font-size:11px}
  #v-waInbox .nxWaListTools.nxWaSearchFolded .nxWaSearch{display:none!important}
  #v-waInbox .nxWaListTools:not(.nxWaSearchFolded) .nxWaListCaption{display:none!important}
  #v-waInbox .nxWaListTools:not(.nxWaSearchFolded) .nxWaSearch{display:flex!important;animation:nxWaV4SearchIn .14s ease both}
  #v-waInbox .nxWaSearch input{height:34px!important;font-size:11px!important}
  #v-waInbox .nxWaRow{min-height:62px!important}
  #v-waInbox .nxWaRow:has(.nxWaBadge):after{right:8px;bottom:8px}
  #v-waInbox.nxWaChatOpen .nxWaLatest{right:14px;bottom:calc(67px + env(safe-area-inset-bottom))}
  #v-waInbox.nxWaChatOpen .nxWaHead{position:sticky;top:0}
  #v-waInbox.nxWaChatOpen .nxWaComposer{position:sticky;bottom:0}
}
@keyframes nxWaV4SearchIn{from{opacity:.55;transform:scale(.985)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaLatest,#v-waInbox .nxWaSearchToggle{transition:none!important}#v-waInbox .nxWaListTools:not(.nxWaSearchFolded) .nxWaSearch{animation:none!important}}
`;
    document.head.appendChild(s);
  }

  function v(){return $('#v-waInbox');}
  function isMobile(){return window.matchMedia('(max-width:760px)').matches;}

  function ensureToolbar(){
    const root=v(),tools=root&&$('.nxWaListTools',root);if(!tools)return;
    let caption=$('.nxWaListCaption',tools);
    if(!caption){
      caption=document.createElement('div');caption.className='nxWaListCaption';
      caption.innerHTML='<b>Conversaciones</b><span class="nxWaListCount">0 chats</span>';
      tools.prepend(caption);
    }
    let toggle=$('.nxWaSearchToggle',tools);
    if(!toggle){
      toggle=document.createElement('button');toggle.type='button';toggle.className='nxWaSearchToggle';toggle.setAttribute('aria-label','Buscar conversación');toggle.innerHTML='<i class="ti ti-search"></i>';
      toggle.onclick=function(){
        tools.classList.toggle('nxWaSearchFolded');
        if(!tools.classList.contains('nxWaSearchFolded'))setTimeout(()=>$('#nxWaVisualSearch',tools)?.focus(),20);
      };
      tools.appendChild(toggle);
    }
    const input=$('#nxWaVisualSearch',tools);
    if(input&&!input.dataset.nxWaV4){
      input.dataset.nxWaV4='1';
      input.addEventListener('input',()=>{if(input.value)tools.classList.remove('nxWaSearchFolded');queue();});
      $('.nxWaSearchClear',tools)?.addEventListener('click',()=>setTimeout(()=>{if(isMobile()&&!input.value)tools.classList.add('nxWaSearchFolded');queue();},30));
    }
    if(isMobile()){
      if(!tools.dataset.nxWaV4Init){tools.dataset.nxWaV4Init='1';if(!input?.value)tools.classList.add('nxWaSearchFolded');}
    }else tools.classList.remove('nxWaSearchFolded');
    updateToolbarCount();
  }

  function updateToolbarCount(){
    const root=v(),count=root&&$('.nxWaListCount',root);if(!count)return;
    const rows=$$('.nxWaRow',root),visible=rows.filter(r=>r.style.display!=='none'),unread=rows.filter(r=>$('.nxWaBadge',r)).length;
    count.textContent=(visible.length!==rows.length?visible.length+' de '+rows.length:rows.length+' chats')+(unread?' · '+unread+' sin leer':'');
    count.classList.toggle('nxWaListUnread',unread>0);
  }

  function ensureLatest(){
    const root=v(),detail=root&&$('.nxWaDetailCol',root),box=root&&$('#nxWaMsgsBox',root);if(!detail)return;
    let b=$('.nxWaLatest',detail);
    if(!b){
      b=document.createElement('button');b.type='button';b.className='nxWaLatest';b.setAttribute('aria-label','Ir al último mensaje');b.innerHTML='<i class="ti ti-chevron-down"></i>';detail.appendChild(b);
      b.onclick=()=>{const x=$('#nxWaMsgsBox',detail);if(x)x.scrollTo({top:x.scrollHeight,behavior:'smooth'});};
    }
    if(!box){b.classList.remove('show');return;}
    if(!box.dataset.nxWaV4Scroll){
      box.dataset.nxWaV4Scroll='1';
      const sync=()=>{const d=box.scrollHeight-box.scrollTop-box.clientHeight;b.classList.toggle('show',d>90);};
      box.addEventListener('scroll',sync,{passive:true});
      requestAnimationFrame(sync);
    }else{
      const d=box.scrollHeight-box.scrollTop-box.clientHeight;b.classList.toggle('show',d>90);
    }
  }

  function polishEmpty(){
    const root=v();if(!root)return;
    $$('.nxWaEmpty',root).forEach(e=>{
      const t=(e.textContent||'').trim().toLowerCase();
      if(t.includes('selecciona una conversación')||t.includes('sin mensajes')||t.includes('todavia no han llegado')||t.includes('no hay conversaciones'))e.classList.add('nxWaEmptyPolished');
    });
  }

  function enhance(){queued=false;css();ensureToolbar();ensureLatest();polishEmpty();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else{obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
    window.addEventListener('resize',queue,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
