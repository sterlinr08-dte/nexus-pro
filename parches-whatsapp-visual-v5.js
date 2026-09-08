/* NEXUS PRO · WhatsApp visual 2026 · cuarta pasada
   Contactos y bauches como paneles contextuales. Solo presentación/UI:
   no modifica API, envíos, pagos, webhooks ni reglas de negocio. */
(function(){
  'use strict';
  if(window.__nxWaVisualV5_20260907)return;
  window.__nxWaVisualV5_20260907=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let queued=false,obs=null,contactsSig='',bauchesSig='';

  function css(){
    if($('#nxWaVisualV5Css'))return;
    const s=document.createElement('style');s.id='nxWaVisualV5Css';s.textContent=`
/* Los paneles fuente siguen vivos para conservar su lógica, pero dejan de ocupar espacio. */
#v-waInbox .nxWaContacts{display:none!important}
#v-waInbox #nxWaPendPanel{display:none!important}
#v-waInbox .nxWaProActs .nxWaVisualContactsBtn,#v-waInbox .nxWaProActs .nxWaBauchesBtn{position:relative}
#v-waInbox .nxWaProActs .nxWaCtxCount{min-width:16px;height:16px;padding:0 4px;border-radius:999px;display:inline-grid;place-items:center;background:rgba(37,99,235,.10);color:#1d4ed8;font-size:7px;font-weight:900}
#v-waInbox .nxWaProActs .nxWaBauchesBtn.has-items{border-color:rgba(245,158,11,.28)!important;color:#b45309!important;background:rgba(255,247,237,.82)!important}
#v-waInbox .nxWaProActs .nxWaBauchesBtn.has-items .nxWaCtxCount{background:#f59e0b;color:#fff}

.nxWaCtxOverlay{position:fixed;inset:0;z-index:99990;display:none;font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;pointer-events:none}
.nxWaCtxOverlay.open{display:block;pointer-events:auto}
.nxWaCtxBackdrop{position:absolute;inset:0;background:rgba(15,23,42,.24);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;transition:opacity .18s ease}
.nxWaCtxOverlay.open .nxWaCtxBackdrop{opacity:1}
.nxWaCtxSheet{position:absolute;right:14px;top:70px;bottom:14px;width:min(410px,calc(100vw - 28px));display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.88);border-radius:22px;background:rgba(255,255,255,.88);box-shadow:0 30px 80px -38px rgba(15,23,42,.58);backdrop-filter:blur(24px) saturate(155%);-webkit-backdrop-filter:blur(24px) saturate(155%);transform:translateX(18px) scale(.99);opacity:.65;transition:transform .19s cubic-bezier(.2,.8,.2,1),opacity .16s ease}
.nxWaCtxOverlay.open .nxWaCtxSheet{transform:none;opacity:1}
.nxWaCtxHead{display:flex;align-items:center;gap:10px;padding:13px 13px 11px;border-bottom:1px solid rgba(226,232,240,.78);background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(239,246,255,.72));flex:none}
.nxWaCtxIcon{width:35px;height:35px;border-radius:13px;display:grid;place-items:center;flex:none;background:linear-gradient(135deg,#eaf2ff,#dcfce7);color:#1d4ed8;font-size:15px}
.nxWaCtxTitle{min-width:0;flex:1}.nxWaCtxTitle b{display:block;font-size:12px;line-height:1.15;color:#0f172a;font-weight:900}.nxWaCtxTitle span{display:block;margin-top:2px;font-size:8px;line-height:1.3;color:#64748b;font-weight:650}
.nxWaCtxClose{width:32px;height:32px;border:1px solid rgba(148,163,184,.18);border-radius:50%;background:rgba(255,255,255,.72);color:#475569;display:grid;place-items:center;cursor:pointer;flex:none}
.nxWaCtxClose:active{transform:scale(.94)}
.nxWaCtxBody{min-height:0;flex:1;overflow:auto;padding:10px;overscroll-behavior:contain;background:rgba(248,250,252,.54)}
.nxWaCtxBody .nxWaContacts{display:block!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important}
.nxWaCtxBody .nxWaContactsTop{display:none!important}
.nxWaCtxBody .nxWaContactTabs{position:sticky;top:-10px;z-index:2;padding:10px 0 9px!important;margin:0!important;background:linear-gradient(180deg,rgba(248,250,252,.96) 72%,rgba(248,250,252,0))}
.nxWaCtxBody .nxWaContactTabs button{height:31px!important;font-size:8.5px!important;box-shadow:0 7px 16px -16px rgba(15,23,42,.5)}
.nxWaCtxBody .nxWaContactList{grid-template-columns:1fr!important;gap:7px!important;padding:0!important;max-height:none!important;overflow:visible!important}
.nxWaCtxBody .nxWaContact{padding:9px!important;border-radius:13px!important;background:rgba(255,255,255,.86)!important}
.nxWaCtxBody .nxWaContact .av{width:34px!important;height:34px!important;border-radius:50%!important}
.nxWaCtxBody .nxWaContact .tx b{font-size:10px!important}.nxWaCtxBody .nxWaContact .tx span{font-size:8.3px!important}
.nxWaCtxBody .nxWaContactsFoot{position:sticky;bottom:-10px;z-index:2;margin:8px -10px -10px!important;padding:9px 10px calc(9px + env(safe-area-inset-bottom))!important;display:flex!important;gap:6px!important;flex-wrap:nowrap!important;overflow-x:auto!important;background:rgba(255,255,255,.92);border-top:1px solid rgba(226,232,240,.72);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.nxWaCtxBody .nxWaContactsFoot button{flex:0 0 auto!important;height:31px!important;font-size:8.3px!important}
/* La grilla de iconos de acciones masivas (parches-whatsapp-inbox.js) tiene que ganarle a las 2
   reglas de arriba dentro de esta misma ventana clonada -- misma cadena de clases + una clase
   extra le da más especificidad, así no importa el orden de carga entre archivos. */
.nxWaCtxBody .nxWaContactsFoot.nxWaContactsActGrid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(84px,1fr))!important;overflow:visible!important}
.nxWaCtxBody .nxWaContactsFoot.nxWaContactsActGrid button{flex:initial!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;height:52px!important;width:auto!important}
.nxWaCtxBody .nxWaContactsFoot.nxWaContactsActGrid button i{font-size:15px}
.nxWaCtxBauches{display:flex;flex-direction:column;gap:8px}
.nxWaCtxBauches .nxWaPend{margin:0!important;padding:10px!important;border-radius:14px!important;background:rgba(255,255,255,.90)!important;border-color:rgba(226,232,240,.86)!important;box-shadow:0 10px 22px -22px rgba(15,23,42,.5)}
.nxWaCtxBauches .nxWaPend img{width:52px!important;height:52px!important;border-radius:12px!important}
.nxWaCtxBauches .nxWaPend .acts{gap:6px!important}
.nxWaCtxBauches .nxWaPend button{min-height:31px!important;padding:0 10px!important}
.nxWaCtxEmpty{min-height:180px;display:grid;place-items:center;align-content:center;gap:8px;text-align:center;color:#64748b;font-size:9.5px;line-height:1.4}
.nxWaCtxEmpty i{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:rgba(33,199,102,.09);color:#059669;font-size:18px}
body.tema-premium .nxWaCtxSheet{background:rgba(24,33,47,.92);border-color:rgba(255,255,255,.07)}
body.tema-premium .nxWaCtxHead{background:linear-gradient(135deg,rgba(30,41,59,.94),rgba(22,31,45,.88));border-color:rgba(148,163,184,.12)}
body.tema-premium .nxWaCtxTitle b{color:#f8fafc}body.tema-premium .nxWaCtxTitle span{color:#9fb0c7}
body.tema-premium .nxWaCtxBody{background:rgba(15,23,42,.62)}
body.tema-premium .nxWaCtxBody .nxWaContactTabs{background:linear-gradient(180deg,rgba(15,23,42,.97) 72%,rgba(15,23,42,0))}
body.tema-premium .nxWaCtxBody .nxWaContact,body.tema-premium .nxWaCtxBauches .nxWaPend{background:rgba(30,41,59,.84)!important;border-color:rgba(148,163,184,.12)!important;color:#f8fafc}
body.tema-premium .nxWaCtxBody .nxWaContactsFoot{background:rgba(24,33,47,.94);border-color:rgba(148,163,184,.12)}
body.tema-premium .nxWaCtxClose{background:rgba(15,23,42,.55);border-color:rgba(148,163,184,.12);color:#cbd5e1}
@media(max-width:760px){
  #v-waInbox .nxWaProActs{display:flex!important;margin-top:0!important;overflow-x:auto!important}
  #v-waInbox .nxWaProActs .nxWaVisualContactsBtn,#v-waInbox .nxWaProActs .nxWaBauchesBtn{display:inline-flex!important}
  .nxWaCtxSheet{left:0;right:0;top:auto;bottom:0;width:100%;max-height:min(78dvh,700px);height:auto;min-height:46dvh;border-radius:23px 23px 0 0;border-bottom:0;transform:translateY(24px);padding-bottom:env(safe-area-inset-bottom)}
  .nxWaCtxOverlay.open .nxWaCtxSheet{transform:none}
  .nxWaCtxHead{padding:11px 12px 10px}.nxWaCtxIcon{width:34px;height:34px;border-radius:12px}.nxWaCtxTitle b{font-size:11.5px}.nxWaCtxTitle span{font-size:7.8px}
  .nxWaCtxBody{padding:9px 9px 0}.nxWaCtxBody .nxWaContactTabs{top:-9px}.nxWaCtxBody .nxWaContactsFoot{margin:8px -9px 0!important;padding-left:9px!important;padding-right:9px!important}
  .nxWaCtxBauches .nxWaPend{align-items:flex-start!important;flex-wrap:wrap!important}.nxWaCtxBauches .nxWaPend .acts{width:100%!important;margin-left:0!important;justify-content:flex-start!important}
}
@media(prefers-reduced-motion:reduce){.nxWaCtxBackdrop,.nxWaCtxSheet{transition:none!important}}
`;
    document.head.appendChild(s);
  }

  function root(){return $('#v-waInbox');}
  function overlay(){
    let o=$('#nxWaCtxOverlay');if(o)return o;
    o=document.createElement('div');o.id='nxWaCtxOverlay';o.className='nxWaCtxOverlay';
    o.innerHTML='<div class="nxWaCtxBackdrop" data-close="1"></div><section class="nxWaCtxSheet" role="dialog" aria-modal="true"><div class="nxWaCtxHead"><div class="nxWaCtxIcon"><i class="ti ti-brand-whatsapp"></i></div><div class="nxWaCtxTitle"><b id="nxWaCtxTitle">WhatsApp</b><span id="nxWaCtxSub"></span></div><button class="nxWaCtxClose" type="button" aria-label="Cerrar"><i class="ti ti-x"></i></button></div><div class="nxWaCtxBody" id="nxWaCtxBody"></div></section>';
    document.body.appendChild(o);
    $('.nxWaCtxBackdrop',o).onclick=close;
    $('.nxWaCtxClose',o).onclick=close;
    o.addEventListener('click',e=>{
      const b=e.target.closest('.nxWaContactsFoot button,.nxWaCtxBauches button');
      if(b)setTimeout(close,40);
    });
    return o;
  }

  function close(){const o=overlay();o.classList.remove('open');o.removeAttribute('data-panel');}
  window.nxWaVisualCerrarPanel=close;

  function contactosCount(){
    const src=$('.nxWaContacts',root());if(!src)return 0;
    const all=$$('.nxWaContactTabs button',src).find(b=>/^todos\b/i.test((b.textContent||'').trim()));
    const m=all&&String(all.textContent||'').match(/(\d+)/);return m?Number(m[1]):$$('.nxWaContact',src).length;
  }
  function bauchesCount(){const list=$('#nxWaPendList',root());return list?$$('.nxWaPend',list).length:0;}

  function ensureTriggers(){
    const r=root(),acts=r&&$('.nxWaProActs',r);if(!acts)return;
    let c=$('.nxWaVisualContactsBtn',acts);
    if(c){
      c.type='button';c.dataset.nxWaV5='1';c.onclick=()=>openContacts();
      c.innerHTML='<i class="ti ti-address-book"></i> Contactos <span class="nxWaCtxCount">'+contactosCount()+'</span>';
    }
    let b=$('.nxWaBauchesBtn',acts);
    if(!b){b=document.createElement('button');b.type='button';b.className='nxWaBauchesBtn';acts.appendChild(b);}
    const n=bauchesCount();
    b.classList.toggle('has-items',n>0);b.style.display=n?'inline-flex':'none';
    b.innerHTML='<i class="ti ti-receipt"></i> Bauches <span class="nxWaCtxCount">'+n+'</span>';
    b.onclick=()=>openBauches();
    r.classList.remove('nxWaContactsOpen');
  }

  function openContacts(){
    const r=root(),src=r&&$('.nxWaContacts',r);if(!src)return;
    const o=overlay(),body=$('#nxWaCtxBody',o),n=contactosCount();
    $('#nxWaCtxTitle',o).textContent='Contactos WhatsApp';
    $('#nxWaCtxSub',o).textContent=n+' clientes con WhatsApp · segmenta sin salir del inbox';
    body.className='nxWaCtxBody';body.innerHTML=src.outerHTML;
    o.dataset.panel='contactos';o.classList.add('open');
    contactsSig=src.innerHTML;
  }
  function openBauches(){
    const r=root(),list=r&&$('#nxWaPendList',r);if(!list)return;
    const o=overlay(),body=$('#nxWaCtxBody',o),n=bauchesCount();
    $('#nxWaCtxTitle',o).textContent='Bauches pendientes';
    $('#nxWaCtxSub',o).textContent=n?(n+' comprobante'+(n===1?'':'s')+' por revisar'):'Todo revisado';
    body.className='nxWaCtxBody nxWaCtxBauches';
    body.innerHTML=n?$$('.nxWaPend',list).map(x=>x.outerHTML).join(''):'<div class="nxWaCtxEmpty"><i class="ti ti-circle-check"></i><b>No hay bauches pendientes</b><span>Todo está revisado por ahora.</span></div>';
    o.dataset.panel='bauches';o.classList.add('open');
    bauchesSig=list.innerHTML;
  }
  window.nxWaVisualAbrirContactos=openContacts;
  window.nxWaVisualAbrirBauches=openBauches;

  function syncOpen(){
    const o=$('#nxWaCtxOverlay.open'),r=root();if(!o||!r)return;
    if(!r.classList.contains('on')){close();return;}
    if(o.dataset.panel==='contactos'){
      const src=$('.nxWaContacts',r);if(src&&src.innerHTML!==contactsSig)openContacts();
    }else if(o.dataset.panel==='bauches'){
      const list=$('#nxWaPendList',r);if(list&&list.innerHTML!==bauchesSig)openBauches();
    }
  }

  function enhance(){queued=false;css();overlay();ensureTriggers();syncOpen();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();overlay();queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else{obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#nxWaCtxOverlay.open'))close();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();