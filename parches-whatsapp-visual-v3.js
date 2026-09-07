/* NEXUS PRO · WhatsApp visual 2026 · segunda pasada
   Solo presentación/navegación de ficha: no toca API, envíos, pagos ni webhooks. */
(function(){
  'use strict';
  if(window.__nxWaVisualV3_20260907)return;
  window.__nxWaVisualV3_20260907=true;

  const $=(s,r=document)=>r.querySelector(s);
  let queued=false,obs=null;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const ini=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>(x[0]||'').toUpperCase()).join('')||'?';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  function clientes(){try{return (window.ST||ST||{}).clientes||[]}catch(e){return []}}

  function css(){
    if($('#nxWaVisualV3Css'))return;
    const s=document.createElement('style');s.id='nxWaVisualV3Css';s.textContent=`
#v-waInbox .nxWaHead:after{display:none!important}
#v-waInbox .nxWaHead{justify-content:flex-start!important}
#v-waInbox .nxWaClientAv{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;flex:0 0 36px;background:linear-gradient(135deg,#e8f1ff,#d9fae4);color:#1d4ed8;font-size:9.5px;font-weight:900;box-shadow:inset 0 0 0 1px rgba(255,255,255,.92)}
#v-waInbox .nxWaHeadInfo{min-width:0;display:flex;flex-direction:column;gap:2px}
#v-waInbox .nxWaClientName{font-size:11.5px;line-height:1.15;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaClientMeta{display:flex;align-items:center;gap:5px;min-width:0;font-size:7.8px;color:#64748b;font-weight:700}
#v-waInbox .nxWaClientMeta>span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaClientPill{flex:none;display:inline-flex;align-items:center;gap:3px;padding:3px 6px;border-radius:999px;background:rgba(33,199,102,.10);color:#047857;font-size:7px;font-weight:900}
#v-waInbox .nxWaClientPill i{font-size:8px}
#v-waInbox .nxWaHeadAction{margin-left:auto;height:30px;border:1px solid rgba(148,163,184,.22);border-radius:999px;background:rgba(255,255,255,.76);padding:0 9px;color:#1d4ed8;font:inherit;font-size:8px;font-weight:900;display:inline-flex;align-items:center;gap:5px;cursor:pointer;box-shadow:0 8px 18px -17px rgba(15,23,42,.5);transition:transform .15s ease,background .15s ease}
#v-waInbox .nxWaHeadAction:hover{background:#fff;transform:translateY(-1px)}
#v-waInbox .nxWaRow:has(.nxWaBadge) .nxWaWho b{font-weight:900!important;color:#0f172a!important}
#v-waInbox .nxWaRow:has(.nxWaBadge){background:rgba(239,246,255,.42)}
#v-waInbox .nxWaRow.on:has(.nxWaBadge){background:linear-gradient(90deg,rgba(37,99,235,.12),rgba(33,199,102,.055))!important}
#v-waInbox .nxWaSearchClear{opacity:.25;transition:opacity .15s ease,background .15s ease}
#v-waInbox .nxWaSearch:focus-within .nxWaSearchClear{opacity:1;background:rgba(241,245,249,.8)}
#v-waInbox .nxWaComposer button:disabled,#v-waInbox .nxWaComposer input:disabled{opacity:.55;cursor:wait}
#v-waInbox .nxWaContact{transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
#v-waInbox .nxWaContact:hover{transform:translateY(-1px);border-color:rgba(37,99,235,.20)!important;box-shadow:0 10px 20px -20px rgba(15,23,42,.5)}
body.tema-premium #v-waInbox .nxWaClientName{color:#f8fafc}
body.tema-premium #v-waInbox .nxWaClientMeta{color:#9fb0c7}
body.tema-premium #v-waInbox .nxWaHeadAction{background:rgba(15,23,42,.46);border-color:rgba(148,163,184,.12);color:#93c5fd}
body.tema-premium #v-waInbox .nxWaRow:has(.nxWaBadge){background:rgba(30,41,59,.42)}
@media(max-width:760px){
  #v-waInbox .nxWaHead{gap:7px!important}
  #v-waInbox .nxWaClientAv{width:35px;height:35px;flex-basis:35px}
  #v-waInbox .nxWaClientName{font-size:11px}
  #v-waInbox .nxWaClientMeta{font-size:7.4px;max-width:180px}
  #v-waInbox .nxWaHeadAction{width:31px;height:31px;padding:0;justify-content:center;flex:0 0 31px}
  #v-waInbox .nxWaHeadAction span{display:none}
  #v-waInbox .nxWaBack{background:rgba(255,255,255,.72)!important;box-shadow:0 6px 14px -12px rgba(15,23,42,.6)}
  #v-waInbox .nxWaListTools{position:sticky;top:0;z-index:3;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaHeadAction,#v-waInbox .nxWaContact{transition:none!important}}
`;
    document.head.appendChild(s);
  }

  function directName(head){
    if(head.dataset.nxWaV3Name)return head.dataset.nxWaV3Name;
    const txt=[...head.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent||'').join(' ').trim();
    if(txt)head.dataset.nxWaV3Name=txt;
    return txt;
  }
  function clienteUnico(nombre){
    const k=norm(nombre);if(!k)return null;
    const xs=clientes().filter(c=>norm(c&&c.nom)===k);
    return xs.length===1?xs[0]:null;
  }

  window.nxWaVisualAbrirFicha=function(id){
    if(id==null)return;
    try{
      if(typeof nav==='function')nav('clientes',null);
      setTimeout(()=>{try{if(typeof verCliente==='function')verCliente(id)}catch(e){}},80);
    }catch(e){}
  };

  function enhanceHead(){
    const v=$('#v-waInbox');if(!v)return;
    const head=$('.nxWaHead',v);if(!head)return;
    const nombre=directName(head);if(!nombre)return;
    if(head.dataset.nxWaV3Done===nombre)return;
    const back=$('.nxWaBack',head);if(back)back.remove();
    const c=clienteUnico(nombre);
    head.innerHTML='';
    if(back)head.appendChild(back);
    const av=document.createElement('div');av.className='nxWaClientAv';av.textContent=ini(c?.nom||nombre);head.appendChild(av);
    const info=document.createElement('div');info.className='nxWaHeadInfo';
    const meta=c?[c.wa,c.plan||c.ars].filter(Boolean).join(' · '):'Contacto de WhatsApp';
    info.innerHTML='<div class="nxWaClientName">'+esc(c?.nom||nombre)+'</div><div class="nxWaClientMeta"><span>'+esc(meta||'Cliente registrado')+'</span>'+(c?'<span class="nxWaClientPill"><i class="ti ti-check"></i> Cliente</span>':'')+'</div>';
    head.appendChild(info);
    if(c&&typeof window.verCliente==='function'){
      const b=document.createElement('button');b.type='button';b.className='nxWaHeadAction';b.setAttribute('aria-label','Abrir ficha del cliente');b.innerHTML='<i class="ti ti-user-circle"></i><span>Abrir ficha</span>';b.onclick=()=>window.nxWaVisualAbrirFicha(c.id);head.appendChild(b);
    }
    head.dataset.nxWaV3Done=nombre;
  }

  function enhanceSearch(){
    const i=$('#nxWaVisualSearch'),b=$('.nxWaSearchClear');if(!i||!b)return;
    b.style.visibility=i.value?'visible':'hidden';
    if(!i.dataset.nxWaV3){i.dataset.nxWaV3='1';i.addEventListener('input',()=>{b.style.visibility=i.value?'visible':'hidden'});}
  }
  function enhance(){queued=false;css();enhanceHead();enhanceSearch();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){css();queue();obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
