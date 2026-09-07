/* NEXUS PRO · WhatsApp visual 2026
   Capa visual aislada: no modifica API, pagos, webhooks ni reglas de negocio. */
(function(){
  'use strict';
  if(window.__nxWaVisual20260906)return;
  window.__nxWaVisual20260906=true;

  const $=(s,r=document)=>r.querySelector(s);
  let searchTerm='';
  let observer=null;
  let enhanceQueued=false;

  function injectCss(){
    if($('#nxWaVisualCss'))return;
    const s=document.createElement('style');
    s.id='nxWaVisualCss';
    s.textContent=`
#v-waInbox{
  --wav-green:#21c766;--wav-blue:#2563eb;--wav-ink:#0f172a;--wav-muted:#64748b;
  --wav-line:rgba(148,163,184,.20);--wav-glass:rgba(255,255,255,.72);
  --wav-glass-strong:rgba(255,255,255,.88);--wav-shadow:0 18px 46px -38px rgba(15,23,42,.42);
  background:linear-gradient(180deg,#f8fbff 0%,#f6f8fb 100%)!important;
}
#v-waInbox .nxCrmHomeHead{
  min-height:0!important;margin:0 0 8px!important;padding:10px 12px!important;border-radius:16px!important;
  display:flex!important;align-items:center!important;justify-content:space-between!important;
  background:linear-gradient(135deg,rgba(255,255,255,.84),rgba(239,246,255,.66))!important;
  border:1px solid rgba(255,255,255,.92)!important;box-shadow:var(--wav-shadow)!important;
  backdrop-filter:blur(18px) saturate(150%)!important;-webkit-backdrop-filter:blur(18px) saturate(150%)!important;
}
#v-waInbox .nxCrmHomeHead:after{height:2px!important;left:12px!important;right:12px!important;opacity:.72!important}
#v-waInbox .nxCrmHomeHead h1{font-size:18px!important;line-height:1!important;margin:2px 0 2px!important;letter-spacing:-.02em!important}
#v-waInbox .nxCrmHomeHead p{font-size:9px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px!important}
#v-waInbox .nxCrmHomeBadge{padding:4px 8px!important;font-size:7.5px!important;background:rgba(33,199,102,.10)!important}
#v-waInbox .nxWaPro{
  margin:0 0 8px!important;padding:7px 8px!important;border-radius:15px!important;
  background:rgba(255,255,255,.64)!important;border:1px solid rgba(255,255,255,.9)!important;
  box-shadow:0 14px 36px -34px rgba(15,23,42,.42)!important;
  backdrop-filter:blur(16px) saturate(145%)!important;-webkit-backdrop-filter:blur(16px) saturate(145%)!important;
}
#v-waInbox .nxWaProHead{display:none!important}
#v-waInbox .nxWaProGrid{display:flex!important;overflow-x:auto!important;gap:6px!important;margin:0 0 6px!important;padding:1px!important;scrollbar-width:none}
#v-waInbox .nxWaProGrid::-webkit-scrollbar{display:none}
#v-waInbox .nxWaProKpi{
  flex:0 0 auto!important;min-width:92px!important;padding:7px 9px!important;border-radius:999px!important;
  display:flex!important;align-items:center!important;gap:6px!important;background:rgba(255,255,255,.72)!important;
  box-shadow:none!important;transform:none!important;
}
#v-waInbox .nxWaProKpi .l{font-size:8px!important;text-transform:none!important;letter-spacing:0!important;color:#475569!important}
#v-waInbox .nxWaProKpi .v{font-size:12px!important;margin:0!important;color:var(--wav-ink)!important;order:-1}
#v-waInbox .nxWaProKpi .s{display:none!important}
#v-waInbox .nxWaProKpi.on{background:linear-gradient(135deg,rgba(37,99,235,.13),rgba(33,199,102,.09))!important;border-color:rgba(37,99,235,.30)!important}
#v-waInbox .nxWaProActs{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;gap:6px!important;scrollbar-width:none}
#v-waInbox .nxWaProActs::-webkit-scrollbar{display:none}
#v-waInbox .nxWaProActs button{height:29px!important;flex:0 0 auto!important;padding:0 9px!important;font-size:8px!important;background:rgba(255,255,255,.70)!important}
#v-waInbox .nxWaProActs button.primary{background:linear-gradient(135deg,var(--wav-green),var(--wav-blue))!important;color:#fff!important}
#v-waInbox .nxWaContacts{display:none!important;margin-top:7px!important}
#v-waInbox.nxWaContactsOpen .nxWaContacts{display:block!important;animation:nxWaFadeUp .16s ease both}
#v-waInbox .nxWaVisualContactsBtn{display:inline-flex!important}
#v-waInbox #nxWaPendPanel{margin:0 0 8px!important}
#v-waInbox #nxWaPendPanel.nxWaPendEmpty{display:none!important}
#v-waInbox #nxWaPendPanel>.nxCrmPanel{padding:7px 9px!important;border-radius:14px!important;background:rgba(255,255,255,.70)!important;border:1px solid rgba(255,255,255,.90)!important;box-shadow:0 12px 34px -34px rgba(15,23,42,.5)!important}
#v-waInbox #nxWaPendPanel .nxCrmPH{margin:0!important;min-height:28px!important}
#v-waInbox #nxWaPendPanel .nxCrmPH h3{font-size:9.5px!important}
#v-waInbox #nxWaPendPanel .nxWaPendToggle{margin-left:auto;border:1px solid rgba(148,163,184,.25);border-radius:999px;background:rgba(255,255,255,.8);height:26px;padding:0 9px;font:inherit;font-size:8px;font-weight:800;color:#1d4ed8;cursor:pointer}
#v-waInbox #nxWaPendPanel.nxWaPendCollapsed #nxWaPendList{display:none!important}
#v-waInbox #nxWaPendPanel:not(.nxWaPendCollapsed) #nxWaPendList{margin-top:7px;animation:nxWaFadeUp .16s ease both}
#v-waInbox .nxWaShell{grid-template-columns:minmax(300px,340px) minmax(0,1fr)!important;gap:9px!important;height:calc(100dvh - 205px)!important;min-height:520px!important}
#v-waInbox .nxWaCol{
  border-radius:17px!important;background:rgba(255,255,255,.78)!important;border:1px solid rgba(255,255,255,.92)!important;
  box-shadow:0 18px 46px -38px rgba(15,23,42,.48)!important;backdrop-filter:blur(16px) saturate(140%)!important;-webkit-backdrop-filter:blur(16px) saturate(140%)!important;
}
#v-waInbox .nxWaListCol{position:relative}
#v-waInbox .nxWaListTools{display:flex;gap:6px;padding:8px;border-bottom:1px solid var(--wav-line);background:rgba(255,255,255,.62)}
#v-waInbox .nxWaSearch{position:relative;display:flex;align-items:center;flex:1;min-width:0}
#v-waInbox .nxWaSearch i{position:absolute;left:10px;color:#94a3b8;font-size:13px;pointer-events:none}
#v-waInbox .nxWaSearch input{width:100%;height:34px;border:1px solid rgba(148,163,184,.22);border-radius:999px;background:rgba(248,250,252,.84);padding:0 34px 0 31px;font:inherit;font-size:10px;color:var(--wav-ink);outline:none}
#v-waInbox .nxWaSearch input:focus{border-color:rgba(37,99,235,.35);box-shadow:0 0 0 3px rgba(37,99,235,.08);background:#fff}
#v-waInbox .nxWaSearchClear{position:absolute;right:5px;width:25px;height:25px;border:0;border-radius:50%;background:transparent;color:#94a3b8;display:grid;place-items:center;cursor:pointer}
#v-waInbox .nxWaListScroll{background:rgba(248,250,252,.30)!important}
#v-waInbox .nxWaRow{position:relative;gap:10px!important;padding:11px 10px!important;border-bottom:1px solid rgba(226,232,240,.72)!important;transform:none!important}
#v-waInbox .nxWaRow:before{content:"";position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 999px 999px 0;background:transparent;transition:.16s ease}
#v-waInbox .nxWaRow:hover{background:rgba(248,250,252,.88)!important}
#v-waInbox .nxWaRow.on{background:linear-gradient(90deg,rgba(37,99,235,.10),rgba(33,199,102,.045))!important}
#v-waInbox .nxWaRow.on:before{background:linear-gradient(180deg,var(--wav-blue),var(--wav-green))}
#v-waInbox .nxWaAv{width:41px!important;height:41px!important;border-radius:50%!important;font-size:11px!important;background:linear-gradient(135deg,#eaf2ff,#dcfce7)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.9)}
#v-waInbox .nxWaWho b{font-size:10.8px!important;line-height:1.2!important}
#v-waInbox .nxWaWho span{font-size:9px!important;line-height:1.25!important;margin-top:3px!important}
#v-waInbox .nxWaTag{margin-top:4px!important;padding:2px 6px!important;font-size:7px!important;background:rgba(241,245,249,.85)!important}
#v-waInbox .nxWaBadge{min-width:18px;height:18px;padding:0 5px!important;display:grid;place-items:center;font-size:7.5px!important;box-shadow:0 4px 10px -6px rgba(220,38,38,.8)}
#v-waInbox .nxWaDetailCol{position:relative;background:rgba(255,255,255,.76)!important}
#v-waInbox .nxWaHead{min-height:54px!important;padding:9px 12px!important;display:flex!important;align-items:center!important;gap:8px!important;font-size:11.5px!important;border-bottom:1px solid rgba(226,232,240,.72)!important;background:rgba(255,255,255,.76)!important;backdrop-filter:blur(18px)!important;-webkit-backdrop-filter:blur(18px)!important}
#v-waInbox .nxWaHead:after{content:"WhatsApp";margin-left:auto;padding:4px 7px;border-radius:999px;background:rgba(33,199,102,.10);color:#047857;font-size:7px;font-weight:800}
#v-waInbox .nxWaBack{display:none;width:32px;height:32px;border:0;border-radius:50%;background:rgba(241,245,249,.9);color:#0f172a;place-items:center;cursor:pointer;flex:none}
#v-waInbox .nxWaMsgs{
  padding:14px 14px 18px!important;gap:8px!important;background-color:#edf4f1!important;
  background-image:radial-gradient(circle at 15% 20%,rgba(255,255,255,.72) 0 1px,transparent 1.5px),radial-gradient(circle at 80% 35%,rgba(37,99,235,.035) 0 1px,transparent 1.5px),linear-gradient(180deg,rgba(248,250,252,.82),rgba(238,246,242,.86))!important;
  background-size:28px 28px,34px 34px,100% 100%!important;
}
#v-waInbox .nxWaBub{max-width:min(74%,560px)!important;padding:9px 11px!important;border-radius:16px!important;font-size:11.5px!important;line-height:1.43!important;box-shadow:0 8px 22px -19px rgba(15,23,42,.44)!important;animation:nxWaBubbleIn .16s ease both}
#v-waInbox .nxWaBub.in{background:rgba(255,255,255,.94)!important;border:1px solid rgba(226,232,240,.92)!important;border-top-left-radius:6px!important}
#v-waInbox .nxWaBub.out{background:linear-gradient(135deg,#dff9d9,#c8f4d1)!important;border:1px solid rgba(33,199,102,.13)!important;border-top-right-radius:6px!important}
#v-waInbox .nxWaBub img{max-width:min(260px,100%)!important;border-radius:12px!important;margin-bottom:5px}
#v-waInbox .nxWaBub audio{max-width:100%}
#v-waInbox .nxWaComposer{margin:7px 9px 9px!important;padding:5px 5px 5px 10px!important;gap:6px!important;border:1px solid rgba(255,255,255,.94)!important;border-radius:999px!important;background:rgba(255,255,255,.80)!important;box-shadow:0 13px 30px -24px rgba(15,23,42,.55)!important;backdrop-filter:blur(18px) saturate(150%)!important;-webkit-backdrop-filter:blur(18px) saturate(150%)!important}
#v-waInbox .nxWaComposer input{height:35px!important;padding:0 8px!important;border:0!important;background:transparent!important;box-shadow:none!important;font-size:10.8px!important}
#v-waInbox .nxWaComposer input:focus{box-shadow:none!important}
#v-waInbox .nxWaComposer button{width:36px!important;height:36px!important;flex:0 0 36px;border-radius:50%!important;background:linear-gradient(135deg,var(--wav-green),#10b981)!important;box-shadow:0 8px 18px -11px rgba(16,185,129,.75)}
#v-waInbox .nxWaCerrada{margin:7px 9px 9px!important;border:1px solid rgba(245,158,11,.20)!important;border-radius:13px!important;background:rgba(255,247,237,.90)!important;font-size:9.5px!important;line-height:1.35!important}
#v-waInbox .nxWaContactList{grid-template-columns:repeat(3,minmax(0,1fr))!important}
#v-waInbox .nxWaContact{border-radius:11px!important;padding:7px!important}
body.tema-premium #v-waInbox{--wav-glass:rgba(25,33,48,.72);--wav-glass-strong:rgba(27,36,52,.9);--wav-line:rgba(148,163,184,.13);background:linear-gradient(180deg,#141a25,#111722)!important}
body.tema-premium #v-waInbox .nxCrmHomeHead,body.tema-premium #v-waInbox .nxWaPro,body.tema-premium #v-waInbox .nxWaCol,body.tema-premium #v-waInbox .nxWaComposer{background:rgba(27,36,52,.74)!important;border-color:rgba(255,255,255,.06)!important}
body.tema-premium #v-waInbox .nxCrmHomeHead h1,body.tema-premium #v-waInbox .nxWaHead,body.tema-premium #v-waInbox .nxWaWho b{color:#f8fafc!important}
body.tema-premium #v-waInbox .nxCrmHomeHead p,body.tema-premium #v-waInbox .nxWaWho span{color:#9fb0c7!important}
body.tema-premium #v-waInbox .nxWaListTools,body.tema-premium #v-waInbox .nxWaHead{background:rgba(27,36,52,.74)!important}
body.tema-premium #v-waInbox .nxWaSearch input{background:rgba(15,23,42,.48)!important;color:#f8fafc!important;border-color:rgba(148,163,184,.14)!important}
body.tema-premium #v-waInbox .nxWaMsgs{background-color:#101722!important;background-image:linear-gradient(180deg,rgba(15,23,42,.95),rgba(17,27,37,.98))!important}
body.tema-premium #v-waInbox .nxWaBub.in{background:#202b3d!important;border-color:rgba(148,163,184,.12)!important;color:#f8fafc!important}
body.tema-premium #v-waInbox .nxWaBub.out{background:linear-gradient(135deg,#14532d,#166534)!important;color:#f0fdf4!important}
@media(max-width:760px){
  #v-waInbox{padding:0 7px calc(8px + env(safe-area-inset-bottom))!important;overflow:hidden}
  #v-waInbox .nxCrmHomeHead{padding:8px 10px!important;margin-bottom:6px!important;border-radius:14px!important}
  #v-waInbox .nxCrmHomeHead h1{font-size:16px!important}
  #v-waInbox .nxCrmHomeHead p{display:none!important}
  #v-waInbox .nxWaPro{padding:6px!important;margin-bottom:6px!important;border-radius:13px!important}
  #v-waInbox .nxWaProActs{display:none!important}
  #v-waInbox .nxWaProKpi{min-width:84px!important;padding:6px 8px!important}
  #v-waInbox .nxWaContactList{grid-template-columns:1fr!important}
  #v-waInbox #nxWaPendPanel{margin-bottom:6px!important}
  #v-waInbox .nxWaShell{display:block!important;height:calc(100dvh - 220px)!important;min-height:420px!important}
  #v-waInbox .nxWaListCol,#v-waInbox .nxWaDetailCol{height:100%!important;min-height:0!important;max-height:none!important;border-radius:15px!important}
  #v-waInbox .nxWaDetailCol{display:none!important}
  #v-waInbox.nxWaChatOpen .nxCrmHomeHead,#v-waInbox.nxWaChatOpen .nxWaPro,#v-waInbox.nxWaChatOpen #nxWaPendPanel{display:none!important}
  #v-waInbox.nxWaChatOpen .nxWaShell{height:calc(100dvh - 78px)!important;min-height:0!important}
  #v-waInbox.nxWaChatOpen .nxWaListCol{display:none!important}
  #v-waInbox.nxWaChatOpen .nxWaDetailCol{display:flex!important;height:100%!important;animation:nxWaSlideIn .18s ease both}
  #v-waInbox .nxWaBack{display:grid!important}
  #v-waInbox .nxWaHead{min-height:52px!important;padding:7px 9px!important;padding-top:max(7px,env(safe-area-inset-top))!important}
  #v-waInbox .nxWaMsgs{padding:11px 9px 15px!important}
  #v-waInbox .nxWaBub{max-width:84%!important;font-size:11px!important}
  #v-waInbox .nxWaComposer{margin:6px 7px calc(6px + env(safe-area-inset-bottom))!important}
  #v-waInbox .nxWaCerrada{margin-bottom:calc(7px + env(safe-area-inset-bottom))!important}
}
@media(max-width:360px){#v-waInbox .nxWaProKpi{min-width:78px!important}#v-waInbox .nxWaAv{width:38px!important;height:38px!important}#v-waInbox .nxWaRow{padding:10px 8px!important}}
@keyframes nxWaFadeUp{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
@keyframes nxWaBubbleIn{from{opacity:.55;transform:translateY(2px)}to{opacity:1;transform:none}}
@keyframes nxWaSlideIn{from{opacity:.72;transform:translateX(12px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){#v-waInbox *,#v-waInbox *:before,#v-waInbox *:after{animation:none!important;transition:none!important}}
`;
    document.head.appendChild(s);
  }

  function view(){return $('#v-waInbox');}

  function applySearch(){
    const v=view();if(!v)return;
    const q=searchTerm.trim().toLocaleLowerCase('es');
    v.querySelectorAll('.nxWaRow').forEach(row=>{
      const ok=!q||String(row.textContent||'').toLocaleLowerCase('es').includes(q);
      row.style.display=ok?'':'none';
    });
  }

  function ensureSearch(){
    const v=view(),col=v&&$('.nxWaListCol',v);if(!col)return;
    let tools=$('.nxWaListTools',col);
    if(!tools){
      tools=document.createElement('div');tools.className='nxWaListTools';
      tools.innerHTML='<label class="nxWaSearch"><i class="ti ti-search"></i><input id="nxWaVisualSearch" type="search" autocomplete="off" placeholder="Buscar conversación…" aria-label="Buscar conversación"><button class="nxWaSearchClear" type="button" aria-label="Limpiar búsqueda" onclick="nxWaVisualClearSearch()"><i class="ti ti-x"></i></button></label>';
      col.insertBefore(tools,col.firstChild);
      const input=$('#nxWaVisualSearch',tools);
      input.value=searchTerm;
      input.addEventListener('input',()=>{searchTerm=input.value||'';applySearch();});
    }
    applySearch();
  }

  window.nxWaVisualClearSearch=function(){
    searchTerm='';const i=$('#nxWaVisualSearch');if(i)i.value='';applySearch();
  };

  function ensureContactsToggle(){
    const v=view(),acts=v&&$('.nxWaProActs',v);if(!acts||$('.nxWaVisualContactsBtn',acts))return;
    const b=document.createElement('button');b.className='nxWaVisualContactsBtn';b.type='button';b.innerHTML='<i class="ti ti-address-book"></i> Contactos';
    b.onclick=()=>{v.classList.toggle('nxWaContactsOpen');};
    acts.appendChild(b);
  }

  function refreshPend(){
    const v=view(),p=v&&$('#nxWaPendPanel',v);if(!p)return;
    const list=$('#nxWaPendList',p);if(!list)return;
    const items=list.querySelectorAll('.nxWaPend').length;
    const empty=!!$('.nxCrmEmpty',list)&&/no hay bauches pendientes/i.test($('.nxCrmEmpty',list).textContent||'');
    p.classList.toggle('nxWaPendEmpty',empty);
    if(!p.dataset.nxWaInit){p.dataset.nxWaInit='1';p.classList.add('nxWaPendCollapsed');}
    const ph=$('.nxCrmPH',p);if(ph){
      let b=$('.nxWaPendToggle',ph);
      if(!b){b=document.createElement('button');b.type='button';b.className='nxWaPendToggle';b.onclick=()=>p.classList.toggle('nxWaPendCollapsed');ph.appendChild(b);}
      const txt=items?('Ver '+items):'Ver';if(b.textContent!==txt)b.textContent=txt;
    }
  }

  function ensureBack(){
    const v=view(),head=v&&$('.nxWaHead',v);if(!head||$('.nxWaBack',head))return;
    const b=document.createElement('button');b.type='button';b.className='nxWaBack';b.setAttribute('aria-label','Volver a conversaciones');b.innerHTML='<i class="ti ti-chevron-left"></i>';b.onclick=()=>window.nxWaVisualVolver();head.prepend(b);
  }

  window.nxWaVisualVolver=function(){const v=view();if(v)v.classList.remove('nxWaChatOpen');};

  function wrapOpenHilo(){
    const f=window.nxWaAbrirHilo;if(typeof f!=='function'||f.__nxWaVisualWrap)return;
    const w=async function(){
      const r=await f.apply(this,arguments);
      const v=view();if(v&&window.matchMedia('(max-width:760px)').matches)v.classList.add('nxWaChatOpen');
      queueEnhance();return r;
    };
    w.__nxWaVisualWrap=1;window.nxWaAbrirHilo=w;
  }

  function enhance(){enhanceQueued=false;injectCss();const v=view();if(!v)return;ensureSearch();ensureContactsToggle();refreshPend();ensureBack();wrapOpenHilo();}
  function queueEnhance(){if(enhanceQueued)return;enhanceQueued=true;requestAnimationFrame(enhance);}
  function start(){
    injectCss();wrapOpenHilo();queueEnhance();
    observer=new MutationObserver(queueEnhance);observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',()=>{if(window.innerWidth>760){const v=view();if(v)v.classList.remove('nxWaChatOpen');}},{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();