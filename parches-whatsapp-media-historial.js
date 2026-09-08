/* NEXUS PRO · WhatsApp · historial completo de multimedia/enlaces/docs · 2026-09-08
   Capa aislada: intercepta solo la acción "Multimedia, enlaces y docs".
   Pagina el historial real por hilo sin tocar el render del chat ni Contactos. */
(function(){
  'use strict';
  if(window.__nxWaMediaHist20260908)return;
  window.__nxWaMediaHist20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const PAGE=100;
  const state={hiloId:null,rows:[],offset:0,done:false,loading:false,tab:'media',signed:new Map()};

  function api(){try{return typeof API!=='undefined'?API:window.API;}catch(e){return window.API;}}
  function toastSafe(tipo,tit,sub){try{if(typeof toast==='function')return toast(tipo,tit,sub);}catch(e){} console.log('[WA media]',tit,sub||'');}
  function hiloActualId(){
    const r=$('#v-waInbox .nxWaRow.on');
    const oc=r&&r.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function fecha(v){
    try{return new Intl.DateTimeFormat('es-DO',{day:'2-digit',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(v));}
    catch(e){return String(v||'');}
  }
  function linksDe(texto){
    const s=String(texto||'');
    const re=/https?:\/\/[^\s<>()\[\]{}"']+/ig;
    return (s.match(re)||[]).map(x=>x.replace(/[.,;:!?]+$/,''));
  }
  function hostDe(url){try{return new URL(url).hostname.replace(/^www\./,'');}catch(e){return url;}}
  function esMedia(m){return ['imagen','video','audio'].includes(String(m?.tipo_contenido||''));}
  function esDoc(m){return String(m?.tipo_contenido||'')==='documento' || (!!m?.media_path && !esMedia(m));}
  function items(tab){
    if(tab==='links'){
      const out=[];
      state.rows.forEach(m=>linksDe(m.cuerpo).forEach((u,i)=>out.push({kind:'link',url:u,id:String(m.id)+'-'+i,created_at:m.created_at,direccion:m.direccion,cuerpo:m.cuerpo})));
      return out;
    }
    return state.rows.filter(m=>tab==='docs'?esDoc(m):esMedia(m));
  }

  function css(){
    if($('#nxWaMediaHistCss'))return;
    const s=document.createElement('style');s.id='nxWaMediaHistCss';s.textContent=`
.nxWaMhOv{position:fixed;inset:0;z-index:100420;background:rgba(15,23,42,.38);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:grid;place-items:center;padding:14px;animation:nxWaMhFade .15s ease both}
.nxWaMhCard{width:min(760px,100%);height:min(82dvh,760px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(255,255,255,.9);border-radius:24px;background:#fff;box-shadow:0 32px 90px -42px rgba(15,23,42,.72);animation:nxWaMhIn .2s cubic-bezier(.16,1,.3,1) both}
.nxWaMhHead{display:flex;align-items:center;gap:10px;padding:13px 14px 10px;border-bottom:1px solid #e6edf7}.nxWaMhIcon{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:#eaf2ff;color:#2563eb;font-size:19px;flex:none}.nxWaMhTitle{min-width:0;flex:1}.nxWaMhTitle b{display:block;color:#0c2249;font-size:13px}.nxWaMhTitle span{display:block;margin-top:2px;color:#7184a5;font-size:9px;font-weight:750}.nxWaMhClose{width:36px;height:36px;border:0;border-radius:50%;background:#f3f6fb;color:#526b91;display:grid;place-items:center;font-size:18px}
.nxWaMhTabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:9px 10px;border-bottom:1px solid #e7edf6;background:#fbfdff}.nxWaMhTab{height:38px;border:1px solid #dde7f4;border-radius:12px;background:#fff;color:#536987;font:inherit;font-size:9.5px;font-weight:850;display:flex;align-items:center;justify-content:center;gap:6px}.nxWaMhTab.on{background:#eaf2ff;border-color:#b9d2f7;color:#1d5bb2}.nxWaMhTab em{font-style:normal;min-width:20px;padding:2px 5px;border-radius:999px;background:#f1f5fa;font-size:8px}.nxWaMhTab.on em{background:#fff}
.nxWaMhBody{min-height:0;flex:1;overflow:auto;padding:11px;background:linear-gradient(180deg,#fbfdff,#f6f9fd)}
.nxWaMhGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.nxWaMhMedia{position:relative;aspect-ratio:1;border:1px solid #dfe8f4;border-radius:15px;overflow:hidden;background:#eef3f9;text-decoration:none;color:#395272;display:grid;place-items:center}.nxWaMhMedia img,.nxWaMhMedia video{width:100%;height:100%;object-fit:cover}.nxWaMhMedia .ph{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:9px;font-weight:850;text-align:center;padding:8px}.nxWaMhMedia .ph i{font-size:25px;color:#2563eb}.nxWaMhMedia .meta{position:absolute;left:6px;right:6px;bottom:6px;padding:4px 6px;border-radius:8px;background:rgba(13,29,54,.72);color:#fff;font-size:7.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(6px)}
.nxWaMhList{display:flex;flex-direction:column;gap:7px}.nxWaMhRow{min-height:58px;border:1px solid #e0e8f3;border-radius:14px;background:#fff;padding:9px 10px;display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit}.nxWaMhRow:active{transform:scale(.995)}.nxWaMhRow .ic{width:39px;height:39px;border-radius:12px;background:#eef4ff;color:#2563eb;display:grid;place-items:center;font-size:18px;flex:none}.nxWaMhRow .tx{min-width:0;flex:1}.nxWaMhRow b{display:block;color:#14325f;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxWaMhRow span{display:block;color:#7184a5;font-size:8.5px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxWaMhRow .go{font-size:17px;color:#91a2bc}
.nxWaMhEmpty{min-height:180px;display:grid;place-items:center;text-align:center;color:#7184a5;font-size:10px;line-height:1.45;padding:25px}.nxWaMhEmpty i{display:block;font-size:32px;color:#a8b8cf;margin-bottom:7px}.nxWaMhFoot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 11px max(10px,env(safe-area-inset-bottom));border-top:1px solid #e6edf7;background:#fff}.nxWaMhStatus{font-size:8.5px;color:#7184a5;font-weight:750}.nxWaMhMore{height:37px;border:0;border-radius:12px;background:#2563eb;color:#fff;padding:0 13px;font:inherit;font-size:9px;font-weight:900;display:flex;align-items:center;gap:6px}.nxWaMhMore:disabled{opacity:.55}.nxWaMhSpin{width:14px;height:14px;border:2px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;animation:nxWaMhSpin .7s linear infinite}
body.tema-premium .nxWaMhCard,body.tema-premium .nxWaMhFoot,body.tema-premium .nxWaMhTabs{background:#172235;border-color:rgba(148,163,184,.13)}body.tema-premium .nxWaMhBody{background:#101a2a}body.tema-premium .nxWaMhTitle b,body.tema-premium .nxWaMhRow b{color:#eef4fb}body.tema-premium .nxWaMhTab,body.tema-premium .nxWaMhRow{background:#1d2a40;border-color:rgba(148,163,184,.14);color:#dce7f5}body.tema-premium .nxWaMhTab.on{background:#203c68;color:#dcecff}
@media(max-width:760px){.nxWaMhOv{padding:0;place-items:end center}.nxWaMhCard{width:100%;height:min(88dvh,820px);border-radius:24px 24px 0 0}.nxWaMhGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.nxWaMhTabs{padding-left:8px;padding-right:8px}.nxWaMhTab{font-size:8.7px}}
@media(max-width:390px){.nxWaMhGrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.nxWaMhMedia{border-radius:12px}}
@keyframes nxWaMhFade{from{opacity:0}to{opacity:1}}@keyframes nxWaMhIn{from{opacity:.5;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}@keyframes nxWaMhSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.nxWaMhOv,.nxWaMhCard,.nxWaMhSpin{animation:none!important}}
`;
    document.head.appendChild(s);
  }

  async function signed(path){
    if(!path)return null;
    if(state.signed.has(path))return state.signed.get(path);
    const A=api();if(!A?.url||!A?.key)return null;
    try{
      const r=await fetch(`${A.url}/storage/v1/object/sign/whatsapp-inbox-media/${path}`,{method:'POST',headers:{apikey:A.key,Authorization:'Bearer '+(A.token||A.key),'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
      if(!r.ok)return null;
      const d=await r.json();const part=d.signedURL||d.signedUrl;if(!part)return null;
      const url=String(part).startsWith('http')?part:`${A.url}/storage/v1${part}`;
      state.signed.set(path,url);return url;
    }catch(e){return null;}
  }

  function modal(){return $('#nxWaMhOv');}
  function cerrar(){modal()?.remove();}
  function crearModal(){
    cerrar();css();
    const ov=document.createElement('div');ov.id='nxWaMhOv';ov.className='nxWaMhOv';
    ov.innerHTML=`<section class="nxWaMhCard" role="dialog" aria-modal="true" aria-label="Multimedia, enlaces y documentos">
      <div class="nxWaMhHead"><div class="nxWaMhIcon"><i class="ti ti-files"></i></div><div class="nxWaMhTitle"><b>Multimedia, enlaces y documentos</b><span>Historial completo · carga progresiva por conversación</span></div><button class="nxWaMhClose" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>
      <div class="nxWaMhTabs"><button class="nxWaMhTab on" data-tab="media"><i class="ti ti-photo"></i> Multimedia <em>0</em></button><button class="nxWaMhTab" data-tab="links"><i class="ti ti-link"></i> Enlaces <em>0</em></button><button class="nxWaMhTab" data-tab="docs"><i class="ti ti-file-description"></i> Documentos <em>0</em></button></div>
      <div class="nxWaMhBody"><div class="nxWaMhEmpty"><div><i class="ti ti-loader-2"></i>Cargando historial…</div></div></div>
      <div class="nxWaMhFoot"><span class="nxWaMhStatus">Preparando historial…</span><button class="nxWaMhMore" disabled><span class="nxWaMhSpin"></span> Cargando</button></div>
    </section>`;
    document.body.appendChild(ov);
    $('.nxWaMhClose',ov)?.addEventListener('click',cerrar);
    ov.addEventListener('click',e=>{if(e.target===ov)cerrar();});
    $$('.nxWaMhTab',ov).forEach(b=>b.addEventListener('click',async()=>{state.tab=b.dataset.tab||'media';render();if(items(state.tab).length===0&&!state.done)await cargar(false,2);}));
    $('.nxWaMhMore',ov)?.addEventListener('click',()=>cargar(false,1));
  }

  async function cargar(reset=false,autoPages=1){
    const A=api();if(!A?.get||!state.hiloId)return;
    if(state.loading)return;
    if(reset){state.rows=[];state.offset=0;state.done=false;state.signed.clear();}
    if(state.done){render();return;}
    state.loading=true;render();
    try{
      let paginas=0;
      do{
        const q=`hilo_id=eq.${encodeURIComponent(state.hiloId)}&order=created_at.desc,id.desc&limit=${PAGE}&offset=${state.offset}&select=id,direccion,tipo_contenido,cuerpo,media_path,created_at,wa_message_id`;
        const page=await A.get('whatsapp_hilo_mensajes',q)||[];
        const seen=new Set(state.rows.map(x=>String(x.id)));
        page.forEach(x=>{if(!seen.has(String(x.id))){state.rows.push(x);seen.add(String(x.id));}});
        state.offset+=page.length;
        if(page.length<PAGE)state.done=true;
        paginas++;
      }while(!state.done && paginas<autoPages && items(state.tab).length===0);
    }catch(e){toastSafe('err','No se pudo cargar el historial',e?.message||String(e));}
    finally{state.loading=false;render();}
  }

  function render(){
    const ov=modal();if(!ov)return;
    const counts={media:items('media').length,links:items('links').length,docs:items('docs').length};
    $$('.nxWaMhTab',ov).forEach(b=>{b.classList.toggle('on',b.dataset.tab===state.tab);const em=$('em',b);if(em)em.textContent=counts[b.dataset.tab]||0;});
    const body=$('.nxWaMhBody',ov),list=items(state.tab);
    if(!body)return;
    if(!list.length){
      body.innerHTML=`<div class="nxWaMhEmpty"><div><i class="ti ${state.loading?'ti-loader-2':'ti-folder-open'}"></i>${state.loading?'Buscando elementos en el historial…':state.done?'No hay elementos de este tipo en esta conversación.':'Todavía no aparecen elementos en las páginas cargadas.'}</div></div>`;
    }else if(state.tab==='media'){
      body.innerHTML=`<div class="nxWaMhGrid">${list.map(m=>`<a class="nxWaMhMedia" data-mid="${esc(m.id)}" data-path="${esc(m.media_path||'')}" href="#" target="_blank" rel="noopener"><div class="ph"><i class="ti ${m.tipo_contenido==='imagen'?'ti-photo':m.tipo_contenido==='video'?'ti-video':'ti-microphone'}"></i>${esc(m.tipo_contenido==='imagen'?'Imagen':m.tipo_contenido==='video'?'Video':'Audio')}</div><div class="meta">${esc(fecha(m.created_at))}</div></a>`).join('')}</div>`;
      hidratarMedia();
    }else{
      body.innerHTML=`<div class="nxWaMhList">${list.map(x=>state.tab==='links'?`<a class="nxWaMhRow" href="${esc(x.url)}" target="_blank" rel="noopener"><div class="ic"><i class="ti ti-link"></i></div><div class="tx"><b>${esc(hostDe(x.url))}</b><span>${esc(x.url)} · ${esc(fecha(x.created_at))}</span></div><i class="ti ti-external-link go"></i></a>`:`<a class="nxWaMhRow" data-doc="1" data-path="${esc(x.media_path||'')}" href="#" target="_blank" rel="noopener"><div class="ic"><i class="ti ti-file-description"></i></div><div class="tx"><b>${esc((x.cuerpo||'Documento').slice(0,120))}</b><span>${esc(fecha(x.created_at))} · ${x.direccion==='out'?'Enviado':'Recibido'}</span></div><i class="ti ti-download go"></i></a>`).join('')}</div>`;
      if(state.tab==='docs')hidratarDocs();
    }
    const status=$('.nxWaMhStatus',ov);if(status)status.textContent=`${state.rows.length} mensajes revisados${state.done?' · historial completo':' · puedes cargar más atrás'}`;
    const more=$('.nxWaMhMore',ov);if(more){more.disabled=state.loading||state.done;more.innerHTML=state.loading?'<span class="nxWaMhSpin"></span> Cargando':state.done?'<i class="ti ti-check"></i> Todo cargado':'<i class="ti ti-history"></i> Cargar anteriores';}
  }

  async function hidratarMedia(){
    const ov=modal();if(!ov)return;
    const nodes=$$('.nxWaMhMedia[data-path]',ov);
    await Promise.all(nodes.map(async a=>{
      const path=a.dataset.path;if(!path)return;
      const row=state.rows.find(x=>String(x.id)===String(a.dataset.mid));if(!row)return;
      const url=await signed(path);if(!url||!a.isConnected)return;
      a.href=url;
      const meta=$('.meta',a)?.outerHTML||'';
      if(row.tipo_contenido==='imagen')a.innerHTML=`<img src="${esc(url)}" alt="Imagen compartida" loading="lazy">${meta}`;
      else if(row.tipo_contenido==='video')a.innerHTML=`<video src="${esc(url)}" preload="metadata" muted playsinline></video>${meta}`;
      else a.innerHTML=`<div class="ph"><i class="ti ti-player-play-filled"></i>Reproducir audio</div>${meta}`;
    }));
  }
  async function hidratarDocs(){
    const ov=modal();if(!ov)return;
    await Promise.all($$('.nxWaMhRow[data-doc][data-path]',ov).map(async a=>{const u=await signed(a.dataset.path);if(u&&a.isConnected)a.href=u;}));
  }

  async function abrir(){
    const id=hiloActualId();if(!id){toastSafe('info','Abre una conversación primero');return;}
    state.hiloId=id;state.tab='media';crearModal();await cargar(true,2);
  }

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('.nxWaMainMenu [data-a="media"]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    b.closest('.nxWaChatPop')?.remove();
    abrir();
  },true);

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal())cerrar();});
})();
