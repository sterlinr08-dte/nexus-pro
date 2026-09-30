/* NEXUS PRO · WhatsApp · lista de chats como el original · 2026-09-30
   Gestos y menú de la lista (fijar / silenciar / archivar / leído), deslizar en móvil,
   selector de emojis completo, sonido/vibración/contador del título al llegar mensajes y
   arreglo de la cabecera de la lista en escritorio. Los datos los pinta el núcleo
   (parches-whatsapp-inbox.js: nxWaHiloAccion, nxWaHilos, eventos nxwa:lista / nxwa:mensaje).
   No toca Supabase directamente ni la conversación abierta. */
(function(){
  'use strict';
  if(window.__nxWaListaOriginal20260930)return;
  window.__nxWaListaOriginal20260930=true;

  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const movil=()=>window.matchMedia('(max-width:760px)').matches;
  const toastSafe=(t,a,b)=>{try{if(typeof window.toast==='function')window.toast(t,a,b||'');}catch(e){}};
  const norm=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();

  /* OJO: plantilla de JS. No escribir acentos graves ni dolar-llave dentro del CSS. */
  function css(){
    if($('#nxWaListaOriginalCss'))return;
    const s=document.createElement('style');s.id='nxWaListaOriginalCss';s.textContent=`
#v-waInbox #nxWaLista,#v-waInbox #nxWaLista *,#v-waInbox .nxWaListTools,#v-waInbox .nxWaListTools *{text-transform:none}
#v-waInbox .nxWaRowWrap{position:relative;overflow:hidden}
#v-waInbox .nxWaRowWrap .nxWaSwipeBg{position:absolute;inset:0;display:flex;align-items:center;padding:0 18px;color:#fff;font-size:12px;font-weight:700;gap:6px;opacity:0;pointer-events:none;background:#2563eb}
#v-waInbox .nxWaRowWrap .nxWaSwipeBg.der{justify-content:flex-end}
#v-waInbox .nxWaRowWrap .nxWaSwipeBg.izq{justify-content:flex-start;background:#3b82f6}
#v-waInbox .nxWaRowWrap .nxWaRow{position:relative;z-index:1;touch-action:pan-y;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#v-waInbox .nxWaRow.nxWaSwiping{transition:none}
#v-waInbox .nxWaRow.nxWaSnap{transition:transform .18s ease}
#v-waInbox .nxWaRow .nxWaWho b{font-weight:600}
#v-waInbox .nxWaRow .nxWaWho span span{display:inline}
#v-waInbox .nxWaListTools input::placeholder{text-transform:none}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaTag:not(.ok):not(.err):not(.warn){background:rgba(147,179,221,.16)!important;color:#BFDBFE!important}
#v-waInbox .nxWaRow.nxWaUnread .nxWaWho b{font-weight:800}
#v-waInbox .nxWaRow.nxWaUnread .nxWaTime{color:#2563eb}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaRow.nxWaUnread .nxWaTime{color:#60A5FA!important}
#v-waInbox .nxWaRow .nxWaWho span .nxWaPrevIco,#v-waInbox .nxWaRow .nxWaWho span .nxWaPrevTick{font-size:1.15em;margin-right:3px;vertical-align:-2px;opacity:.9}
#v-waInbox .nxWaRow .nxWaPrevTick.leido{color:#53BDEB!important}
#v-waInbox .nxWaRow .nxWaPrevTick.fallido{color:#F87171!important}
#v-waInbox .nxWaRow .nxWaPrevDraft{color:#2563eb!important;font-weight:700}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaRow .nxWaPrevDraft{color:#60A5FA!important}
#v-waInbox .nxWaRowIcos{display:flex;align-items:center;justify-content:flex-end;gap:5px;min-height:18px}
#v-waInbox .nxWaRowIcos i.ti{font-size:13px;color:#94a3b8}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaRowIcos i.ti{color:var(--wa-sub,#9FB3D1)!important}
#v-waInbox .nxWaRow.nxWaHitMsg .nxWaWho b:after{content:" · en mensajes";font-size:.82em;font-weight:500;color:#2563eb}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaRow.nxWaHitMsg .nxWaWho b:after{color:#60A5FA}
#v-waInbox .nxWaArchRow{display:flex;align-items:center;gap:10px;padding:10px 14px;margin:0 0 4px;border-radius:12px;cursor:pointer;font-size:12px;color:#334155;background:rgba(148,163,184,.10)}
#v-waInbox .nxWaArchRow b{flex:1;font-weight:700}
#v-waInbox .nxWaArchRow i.ti{font-size:16px;color:#64748b}
#v-waInbox .nxWaArchRow .nxWaArchCount{font-size:11px;font-weight:700;color:#2563eb}
#v-waInbox .nxWaArchRow .nxWaArchChev{transition:transform .18s ease;font-size:14px}
#v-waInbox .nxWaArchRow.abierto .nxWaArchChev{transform:rotate(180deg)}
#v-waInbox .nxWaArchSec{margin:0 0 6px;padding:0 0 4px;border-bottom:1px dashed rgba(148,163,184,.35)}
#v-waInbox .nxWaArchSec .nxWaRow{opacity:.86}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaArchRow{background:rgba(255,255,255,.05);color:#E2E8F0}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaArchRow i.ti{color:#9FB3D1!important}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaArchRow .nxWaArchCount{color:#93C5FD}
#v-waInbox .nxWaSoundToggle{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border:1px solid rgba(148,163,184,.22);border-radius:50%;background:rgba(255,255,255,.76);color:#1d4ed8;cursor:pointer;font-size:14px}
#v-waInbox .nxWaSoundToggle.off{color:#94a3b8}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaSoundToggle{background:rgba(255,255,255,.07)!important;border:1px solid rgba(147,179,221,.22)!important;color:#BFDBFE!important}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaSoundToggle.off{color:#7C8DA6!important}
html.tema-glass-oscuro body #cnt #v-waInbox .nxWaSoundToggle i{color:inherit!important}
@media(min-width:761px){
  #v-waInbox .nxWaListTools{flex-wrap:wrap;row-gap:8px}
  #v-waInbox .nxWaListCaption{flex:1 1 auto!important;min-width:0!important}
  #v-waInbox .nxWaListCaption b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
  #v-waInbox .nxWaSearch{flex:1 1 100%;order:5}
  #v-waInbox .nxWaSearchToggle{display:none!important}
}
@media(max-width:760px){
  #v-waInbox .nxWaListTools:not(.nxWaSearchFolded) .nxWaSoundToggle{display:none}
  #v-waInbox .nxWaSoundToggle{width:30px;height:30px;flex-basis:30px;border-radius:10px}
}
.nxWaListMenu{position:fixed;z-index:100320;min-width:224px;max-width:min(92vw,300px);padding:6px;border-radius:14px;background:rgba(14,28,52,.94);border:1px solid rgba(147,179,221,.22);box-shadow:0 22px 50px -24px rgba(0,0,0,.7);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);color:#F1F5F9;font-family:inherit;text-transform:none;animation:nxWaLmIn .14s ease both}
.nxWaListMenu .cab{padding:8px 12px 6px;font-size:11px;color:#9FB3D1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxWaListMenu button{display:flex;align-items:center;gap:10px;width:100%;min-height:42px;padding:0 12px;border:0!important;border-radius:10px;background:transparent!important;box-shadow:none!important;color:#F1F5F9;font:inherit;font-size:13px;text-align:left;cursor:pointer;text-transform:none}
.nxWaListMenu button i.ti{font-size:17px;color:#BFDBFE;width:20px;text-align:center;background:none!important;box-shadow:none!important;filter:none!important;-webkit-text-fill-color:currentColor!important}
.nxWaListMenu button:hover,.nxWaListMenu button:focus-visible{background:rgba(255,255,255,.08)!important;outline:none}
.nxWaListMenu button:active{background:rgba(255,255,255,.14)!important}
.nxWaListMenu button .sub{margin-left:auto;font-size:14px;color:#9FB3D1}
.nxWaListMenu button.rojo{color:#FCA5A5}
@keyframes nxWaLmIn{from{opacity:0;transform:scale(.96) translateY(4px)}to{opacity:1;transform:none}}
.nxWaEmojiPanel{position:fixed;z-index:100330;width:340px;max-width:calc(100vw - 16px);height:330px;display:flex;flex-direction:column;border-radius:16px;background:rgba(14,28,52,.96);border:1px solid rgba(147,179,221,.22);box-shadow:0 22px 50px -24px rgba(0,0,0,.7);backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%);color:#F1F5F9;overflow:hidden;text-transform:none;animation:nxWaLmIn .14s ease both}
.nxWaEmojiPanel.abajo{left:0!important;width:100%!important;max-width:none;border-radius:16px 16px 0 0;height:300px}
.nxWaEmojiPanel .cab{display:flex;align-items:center;gap:6px;padding:8px 8px 4px}
.nxWaEmojiPanel .cab input{flex:1;min-width:0;height:34px!important;border:0!important;border-radius:10px!important;padding:0 12px!important;background:rgba(255,255,255,.08)!important;color:#F1F5F9!important;-webkit-text-fill-color:#F1F5F9!important;box-shadow:none!important;font:inherit;font-size:14px!important;outline:none;text-transform:none!important}
.nxWaEmojiPanel .cab input::placeholder{color:#9FB3D1!important;text-transform:none!important}
.nxWaEmojiPanel .cab .cerrar{width:34px;height:34px;border:0!important;border-radius:10px;background:transparent!important;box-shadow:none!important;color:#BFDBFE;font-size:16px;cursor:pointer}
.nxWaEmojiPanel .cats{display:flex;gap:2px;padding:0 6px 4px}
.nxWaEmojiPanel .cats button{flex:1;height:32px;border:0!important;border-radius:9px;background:transparent!important;box-shadow:none!important;color:#9FB3D1;font-size:16px;cursor:pointer}
.nxWaEmojiPanel .cats button i.ti{background:none!important;box-shadow:none!important;filter:none!important;-webkit-text-fill-color:currentColor!important;color:inherit!important}
.nxWaEmojiPanel .cats button.on{background:rgba(37,99,235,.35)!important;color:#fff}
.nxWaEmojiPanel .grid{flex:1;overflow-y:auto;padding:4px 8px 10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:2px;align-content:start;overscroll-behavior:contain}
.nxWaEmojiPanel .grid .tit{grid-column:1/-1;padding:8px 4px 2px;font-size:11px;font-weight:700;color:#9FB3D1}
.nxWaEmojiPanel .grid button{height:38px;border:0!important;border-radius:9px;background:transparent!important;box-shadow:none!important;font-size:24px;line-height:1;cursor:pointer;padding:0}
.nxWaEmojiPanel .grid button:hover,.nxWaEmojiPanel .grid button:focus-visible{background:rgba(255,255,255,.1)!important;outline:none}
.nxWaEmojiPanel .grid .vacio{grid-column:1/-1;padding:24px 8px;text-align:center;font-size:12px;color:#9FB3D1}
@media(prefers-reduced-motion:reduce){.nxWaListMenu,.nxWaEmojiPanel{animation:none!important}#v-waInbox .nxWaRow.nxWaSnap{transition:none!important}}
`;
    document.head.appendChild(s);
  }

  /* ── Datos del hilo desde el núcleo ── */
  const hilos=()=>{try{return (typeof window.nxWaHilos==='function'?window.nxWaHilos():[])||[];}catch(e){return [];}};
  const hiloDe=row=>{const id=row&&row.dataset.hilo;return id?hilos().find(h=>String(h.id)===String(id))||null:null;};
  const soporta=()=>{try{return window.nxWaListaSoporta?window.nxWaListaSoporta():{};}catch(e){return {};}};
  const silenciado=h=>{try{return !!(window.nxWaHiloSilenciado&&window.nxWaHiloSilenciado(h));}catch(e){return false;}};
  const accion=(id,a,v)=>{try{return window.nxWaHiloAccion?window.nxWaHiloAccion(id,a,v):Promise.resolve(false);}catch(e){return Promise.resolve(false);}};
  const nombreDe=row=>(row&&$('.nxWaWho b',row)?.textContent||'').trim();

  /* ── Menú contextual (pulsación larga / clic derecho) ── */
  function cerrarMenu(){const m=$('.nxWaListMenu');if(m)m.remove();}
  function colocar(el,x,y){
    const vv=window.visualViewport;const vw=vv?.width||innerWidth,vh=vv?.height||innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;
    const w=el.offsetWidth||240,h=el.offsetHeight||200;
    el.style.left=Math.max(8+ox,Math.min(x,vw+ox-w-8))+'px';
    el.style.top=Math.max(8+oy,Math.min(y,vh+oy-h-8))+'px';
  }
  function abrirMenu(row,x,y){
    cerrarMenu();
    const h=hiloDe(row);if(!h)return;
    const sop=soporta();const id=h.id;
    const m=document.createElement('div');m.className='nxWaListMenu';m.setAttribute('role','menu');
    const it=(k,ico,txt,extra)=>'<button type="button" data-k="'+k+'"'+(extra||'')+'><i class="ti '+ico+'"></i><span>'+esc(txt)+'</span>'+(k==='silenciar'?'<i class="ti ti-chevron-right sub"></i>':'')+'</button>';
    const principal=()=>{
      const noLeidos=Number(h.no_leidos_count)>0;
      m.innerHTML='<div class="cab">'+esc(nombreDe(row)||'Conversación')+'</div>'
        +(sop.fijar?it(h.fijado_at?'desfijar':'fijar',h.fijado_at?'ti-pinned-off':'ti-pin',h.fijado_at?'Desfijar chat':'Fijar chat'):'')
        +(sop.silenciar?(silenciado(h)?it('silencio_quitar','ti-bell','Dejar de silenciar'):it('silenciar','ti-bell-off','Silenciar notificaciones')):'')
        +(sop.archivar?it(h.archivado_at?'desarchivar':'archivar',h.archivado_at?'ti-archive-off':'ti-archive',h.archivado_at?'Desarchivar chat':'Archivar chat'):'')
        +it(noLeidos?'leido':'no_leido',noLeidos?'ti-mail-opened':'ti-mail','Marcar como '+(noLeidos?'leído':'no leído'));
    };
    const submenu=()=>{
      const ms=n=>new Date(Date.now()+n).toISOString();
      m.innerHTML='<div class="cab">Silenciar notificaciones</div>'
        +it('sil_8h','ti-clock','8 horas')+it('sil_1s','ti-calendar','1 semana')+it('sil_siempre','ti-infinity','Siempre')
        +(silenciado(h)?it('silencio_quitar','ti-bell','Quitar silencio'):'')+it('volver','ti-arrow-left','Volver');
      m.dataset.sil8=ms(8*3600e3);m.dataset.sil1s=ms(7*86400e3);
    };
    principal();
    document.body.appendChild(m);colocar(m,x,y);
    m.addEventListener('click',async e=>{
      const b=e.target.closest('[data-k]');if(!b)return;e.preventDefault();e.stopPropagation();
      const k=b.dataset.k;
      if(k==='silenciar'){submenu();colocar(m,x,y);return;}
      if(k==='volver'){principal();colocar(m,x,y);return;}
      cerrarMenu();
      let ok=false;
      if(k==='fijar')ok=await accion(id,'fijar',true);
      else if(k==='desfijar')ok=await accion(id,'fijar',false);
      else if(k==='archivar')ok=await accion(id,'archivar',true);
      else if(k==='desarchivar')ok=await accion(id,'archivar',false);
      else if(k==='silencio_quitar')ok=await accion(id,'silenciar',null);
      else if(k==='sil_8h')ok=await accion(id,'silenciar',m.dataset.sil8);
      else if(k==='sil_1s')ok=await accion(id,'silenciar',m.dataset.sil1s);
      else if(k==='sil_siempre')ok=await accion(id,'silenciar','infinity');
      else if(k==='leido')ok=await accion(id,'leido');
      else if(k==='no_leido')ok=await accion(id,'no_leido');
      if(ok){const txt={fijar:'Chat fijado',desfijar:'Chat desfijado',archivar:'Chat archivado',desarchivar:'Chat desarchivado',silencio_quitar:'Notificaciones activadas',sil_8h:'Silenciado por 8 horas',sil_1s:'Silenciado por 1 semana',sil_siempre:'Silenciado',leido:'Marcado como leído',no_leido:'Marcado como no leído'}[k];if(txt)toastSafe('ok',txt);}
    });
    setTimeout(()=>{
      const fuera=e=>{if(!m.contains(e.target)){cerrarMenu();document.removeEventListener('pointerdown',fuera,true);}};
      document.addEventListener('pointerdown',fuera,true);
    },0);
  }
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){cerrarMenu();cerrarEmoji();}});

  /* ── Gestos sobre las filas: pulsación larga (520 ms), clic derecho y deslizar en móvil ── */
  // El gesto se identifica por el id del hilo, no por el nodo: la lista se vuelve a pintar entera
  // con cada evento de Realtime o del polling y el nodo original puede quedar suelto a mitad del gesto.
  // Tras una pulsación larga o un deslizamiento, el navegador dispara un «click» al soltar: se
  // traga ese primer click (no hay pointerdown nuevo en medio) para que no abra el chat ni toque el menú.
  let g=null,tragarClick=false;
  const filaDe=t=>t&&t.closest?t.closest('#nxWaLista .nxWaRow'):null;
  const filaPorId=id=>id?document.querySelector('#nxWaLista .nxWaRow[data-hilo="'+id+'"]'):null;
  function bgSwipe(row,lado){
    const wrap=row.parentElement;if(!wrap||!wrap.classList.contains('nxWaRowWrap'))return null;
    let bg=$('.nxWaSwipeBg',wrap);
    if(!bg){bg=document.createElement('div');bg.className='nxWaSwipeBg';wrap.insertBefore(bg,row);}
    const h=hiloDe(row);
    if(lado==='der'){bg.className='nxWaSwipeBg der';bg.innerHTML='<i class="ti '+(h?.archivado_at?'ti-archive-off':'ti-archive')+'"></i>'+(h?.archivado_at?'Desarchivar':'Archivar');}
    else{const nl=Number(h?.no_leidos_count)>0;bg.className='nxWaSwipeBg izq';bg.innerHTML='<i class="ti '+(nl?'ti-mail-opened':'ti-mail')+'"></i>'+(nl?'Leído':'No leído');}
    return bg;
  }
  function limpiarSwipe(row){
    row.classList.remove('nxWaSwiping');row.classList.add('nxWaSnap');row.style.transform='';
    const bg=row.parentElement&&$('.nxWaSwipeBg',row.parentElement);if(bg)bg.style.opacity='0';
    setTimeout(()=>{row.classList.remove('nxWaSnap');if(bg)bg.remove();},220);
  }
  document.addEventListener('pointerdown',e=>{
    tragarClick=false;
    if(e.button!==0&&e.pointerType==='mouse')return;
    const row=filaDe(e.target);if(!row)return;
    if(e.target.closest('button,a,input'))return;
    const hid=row.dataset.hilo;
    g={hid,x0:e.clientX,y0:e.clientY,dx:0,modo:null,id:e.pointerId,timer:null};
    g.timer=setTimeout(()=>{if(!g||g.hid!==hid||g.modo)return;g.modo='lp';tragarClick=true;const r=filaPorId(hid);if(r)abrirMenu(r,e.clientX,e.clientY);try{navigator.vibrate&&navigator.vibrate(12);}catch(_e){}},520);
  },true);
  document.addEventListener('pointermove',e=>{
    if(!g||e.pointerId!==g.id)return;
    const dx=e.clientX-g.x0,dy=e.clientY-g.y0;
    if(!g.modo){
      if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)&&(movil()||e.pointerType==='touch')&&soporta().archivar!==undefined){
        g.modo='swipe';clearTimeout(g.timer);
      }else if(Math.abs(dx)>8||Math.abs(dy)>8){clearTimeout(g.timer);if(g.modo!=='lp')g=null;return;}
    }
    if(g&&g.modo==='swipe'){
      e.preventDefault();
      const row=filaPorId(g.hid);if(!row)return;
      row.classList.add('nxWaSwiping');
      const max=120;g.dx=Math.max(-max,Math.min(max,dx));
      row.style.transform='translateX('+g.dx+'px)';
      const bg=bgSwipe(row,g.dx<0?'der':'izq');if(bg)bg.style.opacity=String(Math.min(1,Math.abs(g.dx)/60));
    }
  },{passive:false,capture:true});
  async function terminarSwipe(cancelado){
    const s=g;g=null;if(!s)return;clearTimeout(s.timer);
    if(s.modo!=='swipe')return;
    const row=filaPorId(s.hid);if(!row)return;const h=hiloDe(row);tragarClick=true;
    if(cancelado||Math.abs(s.dx)<80||!h){limpiarSwipe(row);return;}
    if(s.dx<0){
      if(!soporta().archivar){limpiarSwipe(row);return;}
      row.classList.remove('nxWaSwiping');row.classList.add('nxWaSnap');row.style.transform='translateX(-110%)';
      const ok=await accion(h.id,'archivar',!h.archivado_at);
      if(!ok)limpiarSwipe(row);else toastSafe('ok',h.archivado_at?'Chat archivado':'Chat desarchivado');
    }else{
      limpiarSwipe(row);
      const nl=Number(h.no_leidos_count)>0;
      const ok=await accion(h.id,nl?'leido':'no_leido');
      if(ok)toastSafe('ok',nl?'Marcado como leído':'Marcado como no leído');
    }
  }
  document.addEventListener('pointerup',e=>{if(g&&e.pointerId===g.id)terminarSwipe(false);},true);
  document.addEventListener('pointercancel',e=>{if(g&&e.pointerId===g.id)terminarSwipe(true);},true);
  document.addEventListener('click',e=>{
    if(!tragarClick)return;
    tragarClick=false;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  },true);
  document.addEventListener('contextmenu',e=>{
    const row=filaDe(e.target);if(!row)return;
    e.preventDefault();if(g){clearTimeout(g.timer);g=null;}
    abrirMenu(row,e.clientX,e.clientY);
  });

  /* ── Sonido, vibración y contador del título ── */
  const notif={sonidos:0,vibraciones:0,ctx:null};
  window.__nxWaNotif=notif;
  const sonidoActivo=()=>{try{return localStorage.getItem('nxWaSonido')!=='0';}catch(e){return true;}};
  function ctxAudio(){
    try{
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
      if(!notif.ctx)notif.ctx=new AC();
      if(notif.ctx.state==='suspended')notif.ctx.resume().catch(()=>{});
      return notif.ctx;
    }catch(e){return null;}
  }
  ['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{if(sonidoActivo())ctxAudio();},{once:true,passive:true}));
  function sonar(){
    notif.sonidos++;
    const c=ctxAudio();if(!c)return;
    try{
      const t=c.currentTime;
      [[880,0],[1174.7,.09]].forEach(([f,d])=>{
        const o=c.createOscillator(),gn=c.createGain();
        o.type='sine';o.frequency.value=f;
        gn.gain.setValueAtTime(0.0001,t+d);gn.gain.exponentialRampToValueAtTime(0.18,t+d+.012);gn.gain.exponentialRampToValueAtTime(0.0001,t+d+.14);
        o.connect(gn);gn.connect(c.destination);o.start(t+d);o.stop(t+d+.16);
      });
    }catch(e){}
  }
  function vibrar(){try{if(navigator.vibrate&&movil()){navigator.vibrate(40);notif.vibraciones++;}}catch(e){}}
  document.addEventListener('nxwa:mensaje',e=>{
    const d=e.detail||{};
    if(d.hilo&&silenciado(d.hilo))return;
    const enfocado=document.hasFocus()&&!document.hidden;
    if(d.abierto&&enfocado)return;
    if(sonidoActivo())sonar();
    vibrar();
    setTimeout(actualizarTitulo,450);
  });
  let tituloBase=document.title;
  function noLeidosLista(){
    return hilos().filter(h=>Number(h.no_leidos_count)>0&&!h.archivado_at&&!silenciado(h)).length;
  }
  function actualizarTitulo(){
    if(/^\(\d+\) /.test(document.title))document.title=document.title.replace(/^\(\d+\) /,'');
    tituloBase=document.title;
    const n=noLeidosLista();
    const fuera=document.hidden||!document.hasFocus();
    document.title=(n>0&&fuera?'('+n+') ':'')+tituloBase;
  }
  window.nxWaTituloBadge=actualizarTitulo;
  document.addEventListener('nxwa:lista',()=>setTimeout(actualizarTitulo,0));
  window.addEventListener('focus',()=>setTimeout(actualizarTitulo,0));
  window.addEventListener('blur',()=>setTimeout(actualizarTitulo,0));
  document.addEventListener('visibilitychange',()=>setTimeout(actualizarTitulo,0));

  function ensureSoundToggle(){
    const tools=$('#v-waInbox .nxWaListTools');if(!tools||$('.nxWaSoundToggle',tools))return;
    const b=document.createElement('button');b.type='button';b.className='nxWaSoundToggle';
    const pintar=()=>{const on=sonidoActivo();b.classList.toggle('off',!on);b.innerHTML='<i class="ti '+(on?'ti-bell':'ti-bell-off')+'"></i>';b.setAttribute('aria-label',on?'Sonido de mensajes activado':'Sonido de mensajes desactivado');b.title=b.getAttribute('aria-label');};
    pintar();
    b.addEventListener('click',()=>{const on=!sonidoActivo();try{localStorage.setItem('nxWaSonido',on?'1':'0');}catch(e){}pintar();if(on){ctxAudio();sonar();}toastSafe('ok',on?'Sonido de mensajes activado':'Sonido de mensajes desactivado');});
    tools.appendChild(b);
  }

  /* ── Selector de emojis ── */
  const CATS=[
    ['recientes','ti-clock','Recientes',''],
    ['caritas','ti-mood-smile','Caritas','😀 sonrisa feliz|😃 sonrisa grande|😄 risa alegre|😁 sonrisa dientes|😆 risa fuerte|😅 risa sudor nervios|🤣 rodando de risa|😂 llorando de risa|🙂 leve sonrisa|🙃 al revés|😉 guiño|😊 sonrojado feliz|😇 ángel inocente|🥰 enamorado corazones|😍 ojos de corazón|🤩 estrellas asombro|😘 beso|😗 besito|😚 beso ojos cerrados|😙 beso sonriendo|🥲 lágrima feliz|😋 delicioso rico|😛 lengua|😜 guiño lengua|🤪 loco|😝 lengua ojos cerrados|🤑 dinero|🤗 abrazo|🤭 mano en la boca|🤫 silencio|🤔 pensando|🤐 boca cerrada|🤨 ceja levantada|😐 neutral|😑 sin expresión|😶 sin boca|😏 pícaro|😒 aburrido|🙄 ojos en blanco|😬 mueca|🤥 mentiroso|😌 aliviado|😔 pensativo triste|😪 sueño|🤤 babeando|😴 dormido|😷 mascarilla|🤒 enfermo termómetro|🤕 vendado herido|🤢 náuseas|🤮 vómito|🤧 estornudo|🥵 calor|🥶 frío|🥴 mareado|😵 desmayado|🤯 cabeza explota|🤠 vaquero|🥳 fiesta cumpleaños|🥸 disfraz|😎 gafas de sol genial|🤓 nerd|🧐 monóculo|😕 confundido|😟 preocupado|🙁 ceño fruncido|☹️ triste|😮 sorprendido|😯 asombrado|😲 impactado|😳 sonrojado|🥺 suplicante por favor|😦 boca abierta|😧 angustiado|😨 miedo|😰 ansioso|😥 decepcionado|😢 llorando|😭 llanto|😱 grito susto|😖 frustrado|😣 esfuerzo|😞 desilusión|😓 sudor|😩 cansado|😫 agotado|🥱 bostezo|😤 resoplando|😡 enojado furioso|😠 molesto|🤬 groserías|😈 diablillo|👿 demonio|💀 calavera|💩 caca|🤡 payaso|👻 fantasma|👽 alien|🤖 robot|😺 gato sonriente|😸 gato risa|😻 gato enamorado|😿 gato llorando'],
    ['gestos','ti-hand-stop','Gestos y personas','👋 saludo hola adiós mano|🤚 mano levantada|✋ palma alto|🖖 saludo vulcano|👌 ok perfecto|🤌 pellizco|🤏 poquito|✌️ victoria paz|🤞 dedos cruzados suerte|🤟 te amo|🤘 rock|🤙 llámame|👈 izquierda|👉 derecha|👆 arriba|👇 abajo|☝️ índice uno|👍 pulgar arriba bien ok|👎 pulgar abajo mal|✊ puño|👊 puñetazo|🤛 puño izquierda|🤜 puño derecha|👏 aplauso|🙌 manos arriba celebrar|👐 manos abiertas|🤲 palmas juntas|🤝 apretón de manos trato|🙏 gracias por favor rezar|✍️ escribiendo|💅 uñas|🤳 selfie|💪 músculo fuerza|👀 ojos mirando|👁️ ojo|👂 oreja|👃 nariz|🧠 cerebro|🦷 diente|👶 bebé|👦 niño|👧 niña|🧑 persona|👨 hombre|👩 mujer|🧓 mayor|👴 abuelo|👵 abuela|👮 policía|👷 obrero|💁 información|🙋 mano levantada persona|🙇 reverencia|🤦 facepalm|🤷 no sé encogerse de hombros|🚶 caminando|🏃 corriendo|💃 bailando|👨‍👩‍👧 familia'],
    ['corazones','ti-heart','Corazones','❤️ corazón rojo amor|🧡 corazón naranja|💛 corazón amarillo|💚 corazón verde|💙 corazón azul|💜 corazón morado|🖤 corazón negro|🤍 corazón blanco|🤎 corazón marrón|💔 corazón roto|❤️‍🔥 corazón en llamas|❣️ corazón exclamación|💕 dos corazones|💞 corazones giratorios|💓 corazón latiendo|💗 corazón creciendo|💖 corazón brillante|💘 corazón flecha|💝 corazón regalo|💟 corazón decorado|💌 carta de amor|💋 beso labios|💯 cien puntos|💢 enojo|💥 explosión|💫 mareo estrellas|💦 gotas|💨 viento rápido|💬 globo de diálogo|💤 dormir zzz'],
    ['objetos','ti-bulb','Objetos','📱 celular teléfono móvil|📞 teléfono llamada|☎️ teléfono fijo|💻 laptop computadora|🖥️ computadora escritorio|⌨️ teclado|🖨️ impresora|📷 cámara foto|📸 cámara flash|📹 videocámara|🎥 cine|📺 televisión|📻 radio|🎧 audífonos|🎤 micrófono|🔋 batería|🔌 enchufe|💡 bombilla idea|🔦 linterna|🕯️ vela|📚 libros|📖 libro abierto|📝 nota memo|✏️ lápiz|🖊️ bolígrafo|📌 chincheta pin|📍 ubicación pin|📎 clip|📏 regla|✂️ tijeras|🗂️ carpetas|📁 carpeta|📂 carpeta abierta|📅 calendario fecha|📆 calendario|🗓️ agenda|📊 gráfico barras|📈 gráfico subida|📉 gráfico bajada|📋 portapapeles|📄 documento página|📃 página|🧾 recibo factura comprobante|📦 paquete caja|📫 buzón|✉️ sobre correo|📧 email|💰 bolsa dinero|💵 billete dólar|💶 euro|💳 tarjeta crédito|💸 dinero volando|🪙 moneda|🏦 banco|🏧 cajero|🔑 llave|🔒 candado cerrado|🔓 candado abierto|🔐 candado seguro|🛡️ escudo seguro protección|🔧 llave inglesa|🔨 martillo|⚙️ engranaje configuración|🧰 caja herramientas|🚗 carro auto vehículo|🚕 taxi|🚙 camioneta jeepeta|🚌 autobús guagua|🚑 ambulancia|🚒 bomberos|🏍️ moto motor|🛵 motoneta pasola|🚲 bicicleta|✈️ avión viaje|🚀 cohete|⛽ gasolina|🏠 casa hogar|🏡 casa jardín|🏢 edificio oficina|🏥 hospital clínica|🏫 escuela|🏪 tienda colmado|⛪ iglesia|🎁 regalo|🎈 globo|🎉 fiesta confeti celebrar|🎊 confeti|🎂 pastel cumpleaños bizcocho|🍰 pastel|☕ café|🍺 cerveza|🍕 pizza|🍔 hamburguesa|🍎 manzana|🌹 rosa flor|🌻 girasol|🌴 palmera playa|☀️ sol|🌧️ lluvia|⛈️ tormenta|🌈 arcoíris|⭐ estrella|🌟 estrella brillante|🔥 fuego|💧 gota agua|⚡ rayo|🎯 diana objetivo meta|🏆 trofeo campeón|🥇 medalla oro|⚽ fútbol|⚾ béisbol pelota|🏀 baloncesto|🎵 nota musical|🎶 música|🐶 perro|🐱 gato|🐭 ratón|🐮 vaca|🐷 cerdo|🐔 gallina pollo|🐢 tortuga|🐟 pez'],
    ['simbolos','ti-hash','Símbolos','✅ check verde correcto listo|☑️ casilla marcada|✔️ check|❌ equis error no|❎ equis cuadro|➕ más suma|➖ menos resta|➗ división|✖️ multiplicación|❓ interrogación pregunta|❔ interrogación blanca|❗ exclamación|❕ exclamación blanca|‼️ doble exclamación|⁉️ interrobang|⚠️ advertencia alerta cuidado|🚫 prohibido|⛔ no entrar|🔴 círculo rojo|🟠 círculo naranja|🟡 círculo amarillo|🟢 círculo verde|🔵 círculo azul|🟣 círculo morado|⚫ círculo negro|⚪ círculo blanco|🔶 rombo naranja|🔷 rombo azul|▶️ reproducir play|⏸️ pausa|⏹️ detener|⏩ avance|⏪ retroceso|🔄 recargar actualizar|🔁 repetir|⬆️ flecha arriba|⬇️ flecha abajo|⬅️ flecha izquierda|➡️ flecha derecha|↩️ volver|↪️ adelante|🔔 campana notificación|🔕 campana silencio|🔊 volumen alto|🔇 silencio mute|📢 altavoz anuncio|📣 megáfono|🆕 nuevo|🆗 ok|🆙 up|🆒 cool|🆓 gratis|🔝 top|🔙 back|ℹ️ información|🅿️ parking|♻️ reciclaje|♿ silla de ruedas|🚻 baño|🕐 reloj una|⏰ despertador alarma|⏳ reloj de arena tiempo|⌛ reloj arena|⏱️ cronómetro|🌐 globo internet web|📶 señal|📳 vibración|📴 apagado|🔍 lupa buscar|🔎 lupa|♥️ corazón naipe|♦️ diamante|♣️ trébol|♠️ pica|🔟 diez|#️⃣ numeral|*️⃣ asterisco|0️⃣ cero|1️⃣ uno|2️⃣ dos|3️⃣ tres|4️⃣ cuatro|5️⃣ cinco|©️ copyright|®️ registrado|™️ marca|〰️ onda|➰ bucle|✳️ asterisco ocho|✴️ estrella ocho|❇️ chispa|🇩🇴 bandera república dominicana|🇺🇸 bandera estados unidos|🏳️ bandera blanca|🏁 bandera cuadros meta']
  ];
  const EMOJIS=CATS.map(c=>[c[0],c[1],c[2],c[3]?c[3].split('|').map(x=>{const i=x.indexOf(' ');return {e:x.slice(0,i),n:x.slice(i+1),k:norm(x.slice(i+1))};}):[]]);
  const recientes=()=>{try{return JSON.parse(localStorage.getItem('nxWaEmojiRecientes')||'[]').filter(x=>typeof x==='string').slice(0,32);}catch(e){return [];}};
  const recordar=e=>{try{const r=[e].concat(recientes().filter(x=>x!==e)).slice(0,32);localStorage.setItem('nxWaEmojiRecientes',JSON.stringify(r));}catch(_e){}};
  function cerrarEmoji(){const p=$('.nxWaEmojiPanel');if(p)p.remove();}
  // Último cursor conocido del campo (se pierde el foco al tocar el botón de emoji); si el campo
  // nunca tuvo foco con este texto, el emoji va al final, como en WhatsApp.
  let cursor=null;
  document.addEventListener('focusout',e=>{const t=e.target;if(t&&t.id==='nxWaTexto')cursor={s:t.selectionStart,e:t.selectionEnd,v:t.value};},true);
  function insertarEmoji(e){
    const inp=$('#nxWaTexto');if(!inp)return;
    let start=inp.value.length,end=start;
    if(document.activeElement===inp&&Number.isFinite(inp.selectionStart)){start=inp.selectionStart;end=inp.selectionEnd;}
    else if(cursor&&cursor.v===inp.value&&Number.isFinite(cursor.s)){start=cursor.s;end=cursor.e;}
    inp.value=inp.value.slice(0,start)+e+inp.value.slice(end);
    const pos=start+e.length;try{inp.setSelectionRange(pos,pos);}catch(_e){}
    cursor={s:pos,e:pos,v:inp.value};
    try{window.nxWaTextoInput?.(inp);}catch(_e){}
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    recordar(e);
  }
  function colocarEmoji(p,btn){
    const vv=window.visualViewport;const vw=vv?.width||innerWidth,vh=vv?.height||innerHeight,ox=vv?.offsetLeft||0,oy=vv?.offsetTop||0;
    if(movil()){p.classList.add('abajo');p.style.left=ox+'px';p.style.top=(oy+vh-p.offsetHeight)+'px';return;}
    p.classList.remove('abajo');
    const r=btn?btn.getBoundingClientRect():{left:vw/2,top:vh/2,bottom:vh/2};
    const w=p.offsetWidth||340,h=p.offsetHeight||330;
    p.style.left=Math.max(8+ox,Math.min(r.left+ox-8,vw+ox-w-8))+'px';
    p.style.top=Math.max(8+oy,Math.min(r.top+oy-h-10,vh+oy-h-8))+'px';
  }
  window.nxWaEmojiAbrir=function(btn){
    if($('.nxWaEmojiPanel')){cerrarEmoji();return;}
    cerrarMenu();
    const p=document.createElement('div');p.className='nxWaEmojiPanel';p.setAttribute('role','dialog');p.setAttribute('aria-label','Emojis');
    p.innerHTML='<div class="cab"><input type="search" placeholder="Buscar emoji" aria-label="Buscar emoji" autocomplete="off"><button type="button" class="cerrar" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>'
      +'<div class="cats">'+EMOJIS.map(c=>'<button type="button" data-cat="'+c[0]+'" title="'+esc(c[2])+'" aria-label="'+esc(c[2])+'"><i class="ti '+c[1]+'"></i></button>').join('')+'</div>'
      +'<div class="grid"></div>';
    const grid=$('.grid',p),inp=$('input',p);
    let cat=recientes().length?'recientes':'caritas';
    const pintar=()=>{
      const q=norm(inp.value);
      let html='';
      if(q){
        const hits=[];EMOJIS.forEach(c=>c[3].forEach(x=>{if(x.k.includes(q)&&!hits.some(y=>y.e===x.e))hits.push(x);}));
        html=hits.length?hits.slice(0,120).map(x=>'<button type="button" data-e="'+esc(x.e)+'" title="'+esc(x.n)+'" aria-label="'+esc(x.n)+'">'+x.e+'</button>').join(''):'<div class="vacio">Sin resultados</div>';
      }else if(cat==='recientes'){
        const r=recientes();
        html='<div class="tit">Recientes</div>'+(r.length?r.map(e=>'<button type="button" data-e="'+esc(e)+'">'+e+'</button>').join(''):'<div class="vacio">Los emojis que uses aparecerán aquí</div>');
      }else{
        const c=EMOJIS.find(x=>x[0]===cat);
        html='<div class="tit">'+esc(c[2])+'</div>'+c[3].map(x=>'<button type="button" data-e="'+esc(x.e)+'" title="'+esc(x.n)+'" aria-label="'+esc(x.n)+'">'+x.e+'</button>').join('');
      }
      grid.innerHTML=html;grid.scrollTop=0;
      p.querySelectorAll('.cats button').forEach(b=>b.classList.toggle('on',!q&&b.dataset.cat===cat));
    };
    p.addEventListener('click',e=>{
      const c=e.target.closest('[data-cat]');if(c){cat=c.dataset.cat;inp.value='';pintar();return;}
      const b=e.target.closest('[data-e]');if(b){insertarEmoji(b.dataset.e);if(!movil())cerrarEmoji();else{if(cat==='recientes')pintar();}return;}
      if(e.target.closest('.cerrar')){cerrarEmoji();$('#nxWaTexto')?.focus();}
    });
    p.addEventListener('pointerdown',e=>{if(!e.target.closest('input'))e.preventDefault();});
    inp.addEventListener('input',pintar);
    document.body.appendChild(p);
    pintar();colocarEmoji(p,btn);
    const reubicar=()=>colocarEmoji(p,btn);
    if(window.visualViewport){window.visualViewport.addEventListener('resize',reubicar);window.visualViewport.addEventListener('scroll',reubicar);}
    const fuera=e=>{if(!p.contains(e.target)&&e.target!==btn&&!(btn&&btn.contains(e.target))){cerrarEmoji();}};
    setTimeout(()=>document.addEventListener('pointerdown',fuera,true),0);
    const obs=new MutationObserver(()=>{if(!document.body.contains(p)){obs.disconnect();document.removeEventListener('pointerdown',fuera,true);if(window.visualViewport){window.visualViewport.removeEventListener('resize',reubicar);window.visualViewport.removeEventListener('scroll',reubicar);}}});
    obs.observe(document.body,{childList:true});
    if(!movil())setTimeout(()=>inp.focus(),30);
  };
  window.nxWaEmojiCerrar=cerrarEmoji;

  let queued=false;
  function enhance(){queued=false;css();ensureSoundToggle();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
