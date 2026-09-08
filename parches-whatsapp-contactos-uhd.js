/* NEXUS PRO · Contactos WhatsApp UHD · 2026-09-08
   Capa exclusivamente visual sobre el panel contextual existente.
   Mantiene intactos filtros, segmentos, envios y reglas de negocio. */
(function(){
  'use strict';
  if(window.__nxWaContactosUhd20260908)return;
  window.__nxWaContactosUhd20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let queued=false,obs=null;

  function css(){
    if($('#nxWaContactosUhdCss'))return;
    const s=document.createElement('style');s.id='nxWaContactosUhdCss';s.textContent=`
/* ── Fondo y hoja ───────────────────────────────────────────── */
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxBackdrop{background:rgba(20,35,61,.32)!important;backdrop-filter:blur(8px) saturate(115%)!important;-webkit-backdrop-filter:blur(8px) saturate(115%)!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxSheet{width:min(620px,calc(100vw - 32px))!important;max-height:min(88dvh,860px)!important;border-radius:28px!important;border:1px solid rgba(255,255,255,.88)!important;background:linear-gradient(165deg,rgba(255,255,255,.96),rgba(241,247,255,.91))!important;box-shadow:0 40px 110px -42px rgba(15,39,78,.65),inset 0 1px 0 rgba(255,255,255,.96)!important;backdrop-filter:blur(30px) saturate(150%)!important;-webkit-backdrop-filter:blur(30px) saturate(150%)!important;overflow:hidden!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxHead{padding:18px 20px 15px!important;gap:13px!important;border-bottom:1px solid rgba(202,216,238,.65)!important;background:linear-gradient(135deg,rgba(255,255,255,.97),rgba(239,246,255,.86))!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxIcon{width:48px!important;height:48px!important;border-radius:17px!important;background:linear-gradient(145deg,#27d86f,#0dbf5b)!important;color:#fff!important;font-size:23px!important;box-shadow:0 12px 25px -14px rgba(16,185,129,.8),inset 0 1px 0 rgba(255,255,255,.38)!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxTitle b{font-size:19px!important;letter-spacing:-.35px!important;color:#0b1d40!important;font-weight:900!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxTitle span{margin-top:4px!important;font-size:10.5px!important;line-height:1.35!important;color:#6d80a4!important;font-weight:650!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxClose{width:40px!important;height:40px!important;border-radius:50%!important;background:rgba(255,255,255,.82)!important;border-color:rgba(174,194,225,.36)!important;color:#244a85!important;font-size:17px!important;box-shadow:0 10px 20px -17px rgba(15,39,78,.55)!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxBody{padding:14px 16px 0!important;background:linear-gradient(180deg,rgba(247,251,255,.78),rgba(238,246,255,.58))!important;scrollbar-gutter:stable}

/* ── Buscar ─────────────────────────────────────────────────── */
.nxWaUhdSearch{display:flex;align-items:center;gap:9px;margin:1px 0 12px;position:sticky;top:-14px;z-index:7;padding:5px 0 6px;background:linear-gradient(180deg,rgba(247,251,255,.98) 72%,rgba(247,251,255,0))}
.nxWaUhdSearchBox{height:48px;min-width:0;flex:1;display:flex;align-items:center;gap:10px;padding:0 15px;border:1px solid rgba(185,204,232,.55);border-radius:17px;background:rgba(255,255,255,.88);box-shadow:0 12px 28px -25px rgba(24,61,112,.52),inset 0 1px 0 rgba(255,255,255,.9)}
.nxWaUhdSearchBox i{font-size:20px;color:#315d9e;flex:none}.nxWaUhdSearchBox input{width:100%;height:100%;min-width:0;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;color:#0f254b;font:inherit;font-size:12px;font-weight:650;padding:0!important}.nxWaUhdSearchBox input::placeholder{color:#8aa0c2}
.nxWaUhdTune{width:48px;height:48px;flex:0 0 48px;border:1px solid rgba(185,204,232,.55);border-radius:17px;background:rgba(255,255,255,.88);color:#2861a9;display:grid;place-items:center;font-size:19px;cursor:pointer;box-shadow:0 12px 28px -25px rgba(24,61,112,.52)}
.nxWaUhdTune.on{background:#eaf3ff;border-color:rgba(37,99,235,.25);color:#1d4ed8}

/* ── Filtros tipo pildora ───────────────────────────────────── */
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactTabs{position:relative!important;top:auto!important;z-index:3!important;margin:0 0 12px!important;padding:0 1px 3px!important;display:flex!important;gap:7px!important;overflow-x:auto!important;overflow-y:hidden!important;background:transparent!important;scrollbar-width:none}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactTabs::-webkit-scrollbar{display:none}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactTabs button{height:36px!important;min-width:max-content!important;padding:0 13px!important;border-radius:999px!important;border:1px solid rgba(176,198,231,.48)!important;background:rgba(255,255,255,.76)!important;color:#2d568e!important;font-size:9.5px!important;font-weight:800!important;box-shadow:0 9px 22px -20px rgba(29,78,140,.55)!important;transition:transform .14s ease,background .14s ease,border-color .14s ease!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactTabs button.on{background:linear-gradient(135deg,#348af8,#1873eb)!important;border-color:#2b7fe9!important;color:#fff!important;box-shadow:0 12px 25px -15px rgba(37,99,235,.72)!important}
.nxWaCtxOverlay.nxWaUhdContacts.nxWaUhdFiltersOff .nxWaContactTabs{display:none!important}

/* ── Lista y tarjetas ───────────────────────────────────────── */
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactList{display:flex!important;flex-direction:column!important;gap:9px!important;padding:0 0 12px!important;background:transparent!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact{min-height:78px!important;padding:12px 14px!important;display:flex!important;align-items:center!important;gap:12px!important;border:1px solid rgba(205,218,238,.62)!important;border-radius:19px!important;background:rgba(255,255,255,.92)!important;box-shadow:0 16px 34px -32px rgba(15,47,92,.64),inset 0 1px 0 rgba(255,255,255,.98)!important;transform:none!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact:hover{border-color:rgba(71,126,207,.30)!important;box-shadow:0 18px 38px -30px rgba(22,70,137,.50)!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .av{width:52px!important;height:52px!important;flex:0 0 52px!important;border-radius:50%!important;display:grid!important;place-items:center!important;font-size:13px!important;font-weight:900!important;color:#1655b3!important;background:linear-gradient(145deg,#eef5ff,#dfeafe)!important;border:1px solid rgba(255,255,255,.9)!important;box-shadow:0 8px 20px -16px rgba(37,99,235,.5)!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .tx{min-width:0!important;flex:1!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .tx b{display:block!important;margin:0 0 4px!important;font-size:12.5px!important;line-height:1.18!important;letter-spacing:-.16px!important;color:#0c1d3e!important;font-weight:900!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .tx span{display:block!important;font-size:9.6px!important;line-height:1.42!important;color:#57739d!important;font-weight:650!important;white-space:normal!important;overflow-wrap:anywhere!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .st{min-width:max-content!important;flex:none!important;border-radius:999px!important;padding:7px 11px!important;font-size:8.8px!important;font-weight:900!important;border:1px solid transparent!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .st.err{background:#fff0f1!important;color:#e12938!important;border-color:#ffd7db!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .st.warn{background:#fff6df!important;color:#c97600!important;border-color:#ffe7aa!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .st.ok{background:#eafaf1!important;color:#118a50!important;border-color:#c9efd9!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact.nxWaUhdHidden{display:none!important}
.nxWaUhdNoResults{display:none;min-height:170px;place-items:center;align-content:center;text-align:center;gap:8px;color:#7185a7;font-size:10px}.nxWaUhdNoResults.show{display:grid}.nxWaUhdNoResults i{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#edf5ff;color:#276dcc;font-size:20px}.nxWaUhdNoResults b{font-size:11px;color:#304c76}

/* ── Acciones inferiores, igual al mockup ───────────────────── */
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot{position:sticky!important;bottom:0!important;z-index:8!important;margin:0 -16px!important;padding:12px 16px calc(13px + env(safe-area-inset-bottom))!important;border-top:1px solid rgba(194,211,235,.55)!important;background:rgba(246,250,255,.94)!important;backdrop-filter:blur(22px) saturate(145%)!important;-webkit-backdrop-filter:blur(22px) saturate(145%)!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;overflow:visible!important}
.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button{min-width:0!important;width:100%!important;height:62px!important;padding:7px 5px!important;border-radius:16px!important;border:1px solid rgba(150,188,236,.54)!important;background:rgba(255,255,255,.78)!important;color:#1760bd!important;font-size:8.5px!important;font-weight:850!important;line-height:1.15!important;box-shadow:0 12px 25px -25px rgba(37,99,235,.58)!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button.primary{background:linear-gradient(145deg,#f4f9ff,#eaf4ff)!important;color:#0f62c5!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button i{font-size:18px!important;margin-bottom:1px}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button:active{transform:scale(.96)!important}

/* ── Tema oscuro ────────────────────────────────────────────── */
body.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxSheet{background:linear-gradient(160deg,rgba(23,32,47,.97),rgba(15,23,42,.96))!important;border-color:rgba(255,255,255,.07)!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxHead{background:linear-gradient(135deg,rgba(31,42,60,.96),rgba(23,32,48,.94))!important;border-color:rgba(148,163,184,.12)!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxTitle b{color:#f8fafc!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxTitle span{color:#9fb0c7!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxBody{background:rgba(15,23,42,.72)!important}.tema-premium .nxWaUhdSearch{background:linear-gradient(180deg,rgba(15,23,42,.98) 72%,rgba(15,23,42,0))}.tema-premium .nxWaUhdSearchBox,.tema-premium .nxWaUhdTune{background:rgba(30,41,59,.9)!important;border-color:rgba(148,163,184,.14)!important;color:#93c5fd!important}.tema-premium .nxWaUhdSearchBox input{color:#f8fafc!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaContactTabs button{background:rgba(30,41,59,.76)!important;border-color:rgba(148,163,184,.13)!important;color:#b9c9df!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaContact{background:rgba(30,41,59,.88)!important;border-color:rgba(148,163,184,.12)!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .tx b{color:#f8fafc!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .tx span{color:#9eb0c8!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot{background:rgba(20,29,43,.95)!important;border-color:rgba(148,163,184,.12)!important}.tema-premium .nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button{background:rgba(30,41,59,.86)!important;border-color:rgba(96,165,250,.15)!important;color:#93c5fd!important}

/* ── iPhone / movil ─────────────────────────────────────────── */
@media(max-width:760px){
 .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxSheet{left:0!important;right:0!important;top:auto!important;bottom:0!important;width:100%!important;max-height:88dvh!important;min-height:66dvh!important;border-radius:29px 29px 0 0!important;transform:translateY(24px)!important;padding-bottom:0!important}
 .nxWaCtxOverlay.nxWaUhdContacts.open .nxWaCtxSheet{transform:none!important}
 .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxSheet:before{content:"";width:38px;height:4px;border-radius:999px;background:#bdc9dc;position:absolute;top:7px;left:50%;transform:translateX(-50%);z-index:10}
 .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxHead{padding:20px 14px 13px!important;gap:10px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxIcon{width:44px!important;height:44px!important;border-radius:16px!important;font-size:21px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxTitle b{font-size:17px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxTitle span{font-size:9.2px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxClose{width:38px!important;height:38px!important}
 .nxWaCtxOverlay.nxWaUhdContacts .nxWaCtxBody{padding:11px 11px 0!important}.nxWaUhdSearch{top:-11px;margin-bottom:9px;padding-top:4px}.nxWaUhdSearchBox{height:44px;border-radius:15px;padding:0 12px}.nxWaUhdSearchBox i{font-size:18px}.nxWaUhdSearchBox input{font-size:16px!important}.nxWaUhdTune{width:44px;height:44px;flex-basis:44px;border-radius:15px}
 .nxWaCtxOverlay.nxWaUhdContacts .nxWaContactTabs{margin-bottom:9px!important;gap:6px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactTabs button{height:34px!important;padding:0 11px!important;font-size:8.8px!important}
 .nxWaCtxOverlay.nxWaUhdContacts .nxWaContactList{gap:8px!important;padding-bottom:9px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact{min-height:74px!important;padding:10px 11px!important;border-radius:18px!important;gap:10px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .av{width:48px!important;height:48px!important;flex-basis:48px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .tx b{font-size:11.3px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .tx span{font-size:8.8px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .st{padding:6px 9px!important;font-size:8.1px!important}
 .nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot{margin:0 -11px!important;padding:10px 10px calc(10px + env(safe-area-inset-bottom))!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button{height:58px!important;border-radius:14px!important;font-size:7.7px!important;padding:5px 3px!important}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button i{font-size:17px!important}
}
@media(max-width:390px){.nxWaCtxOverlay.nxWaUhdContacts .nxWaContact .st{max-width:78px;overflow:hidden;text-overflow:ellipsis}.nxWaCtxOverlay.nxWaUhdContacts .nxWaContactsFoot.nxWaContactsActGrid button{font-size:7.2px!important}}
@media(prefers-reduced-motion:reduce){.nxWaCtxOverlay.nxWaUhdContacts *{transition:none!important;animation:none!important}}
`;
    document.head.appendChild(s);
  }

  function overlay(){return $('#nxWaCtxOverlay');}
  function body(){return $('#nxWaCtxBody');}

  function applySearch(){
    const o=overlay(),b=body();if(!o||!b||o.dataset.panel!=='contactos')return;
    const input=$('#nxWaUhdSearchInput',b),q=String(input?.value||'').trim().toLocaleLowerCase('es');
    const rows=$$('.nxWaContact',b);let visibles=0;
    rows.forEach(r=>{
      const ok=!q||String(r.textContent||'').toLocaleLowerCase('es').includes(q);
      r.classList.toggle('nxWaUhdHidden',!ok);if(ok)visibles++;
    });
    let empty=$('.nxWaUhdNoResults',b);
    if(!empty){empty=document.createElement('div');empty.className='nxWaUhdNoResults';empty.innerHTML='<i class="ti ti-user-search"></i><b>Sin resultados</b><span>Prueba con otro nombre, teléfono, plan o ARS.</span>';$('.nxWaContactList',b)?.after(empty);}
    empty.classList.toggle('show',rows.length>0&&visibles===0);
  }

  function enhance(){
    queued=false;css();
    const o=overlay(),b=body();if(!o||!b)return;
    const isContacts=o.classList.contains('open')&&o.dataset.panel==='contactos';
    o.classList.toggle('nxWaUhdContacts',isContacts);
    if(!isContacts)return;
    if(!$('.nxWaUhdSearch',b)){
      const bar=document.createElement('div');bar.className='nxWaUhdSearch';bar.innerHTML='<label class="nxWaUhdSearchBox"><i class="ti ti-search"></i><input id="nxWaUhdSearchInput" type="search" autocomplete="off" placeholder="Buscar contacto, teléfono, plan o ARS…" aria-label="Buscar contactos WhatsApp"></label><button class="nxWaUhdTune" type="button" aria-label="Mostrar u ocultar filtros" title="Filtros"><i class="ti ti-adjustments-horizontal"></i></button>';
      b.prepend(bar);
      $('#nxWaUhdSearchInput',bar)?.addEventListener('input',applySearch);
      $('.nxWaUhdTune',bar)?.addEventListener('click',function(){o.classList.toggle('nxWaUhdFiltersOff');this.classList.toggle('on',!o.classList.contains('nxWaUhdFiltersOff'));});
    }
    applySearch();
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){css();queue();obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','data-panel']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
