/* NEXUS PRO · WhatsApp visual 2026 · sexta pasada
   Hora/estado real por mensaje + refinamiento del compositor.
   Solo lee los campos YA existentes de whatsapp_hilo_mensajes; no escribe datos,
   no modifica envíos, pagos, webhooks ni reglas de negocio. */
(function(){
  'use strict';
  if(window.__nxWaVisualV7_20260907)return;
  window.__nxWaVisualV7_20260907=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let queued=false,obs=null,fetchingId=null,lastHilo=null;

  function css(){
    if($('#nxWaVisualV7Css'))return;
    const s=document.createElement('style');s.id='nxWaVisualV7Css';s.textContent=`
#v-waInbox .nxWaMsgs{scroll-behavior:smooth}
#v-waInbox .nxWaBub{position:relative;padding-bottom:7px!important}
#v-waInbox .nxWaMsgMeta{display:flex;align-items:center;justify-content:flex-end;gap:3px;min-height:11px;margin-top:4px;font-size:7.2px;line-height:1;color:#7b8798;font-weight:700;white-space:nowrap;user-select:none;-webkit-user-select:none}
#v-waInbox .nxWaBub.in .nxWaMsgMeta{color:#8a94a3}
#v-waInbox .nxWaMsgState{display:inline-flex;align-items:center;gap:2px;min-width:11px;justify-content:flex-end}
#v-waInbox .nxWaMsgState i{font-size:9.5px;line-height:1}
/* El visto es texto, no un icono: asi ninguna regla de .ti puede pintarlo. Los dos
   checks van juntos con letter-spacing negativo para parecerse al glifo de WhatsApp. */
#v-waInbox .nxWaMsgCheck{font-size:11px;line-height:1;letter-spacing:-3px;padding-right:3px;font-weight:700}
#v-waInbox .nxWaMsgState.st-leido .nxWaMsgCheck{color:#53bdeb}
/* Animacion del visto al pasar a leido. Deliberadamente acotada al <span> del check:
   .nxWaBub y .nxWaBubWrap tienen animation/transition/transform apagados por las capas
   22 (aura-safari-fix) y 24, por artefactos de iOS Safari, y eso NO se toca aqui.
   Solo se dispara en la transicion real a leido, nunca al pintar la conversacion. */
@keyframes nxWaCheckRead{
  0%{transform:scale(1);opacity:.55}
  45%{transform:scale(1.5)}
  70%{transform:scale(.94)}
  100%{transform:scale(1);opacity:1}
}
#v-waInbox .nxWaMsgState.nxWaCheckJustRead .nxWaMsgCheck{
  display:inline-block;animation:nxWaCheckRead .5s cubic-bezier(.2,1.5,.3,1) both;
}
@media(prefers-reduced-motion:reduce){
  #v-waInbox .nxWaMsgState.nxWaCheckJustRead .nxWaMsgCheck{animation:none}
}
#v-waInbox .nxWaMsgState.st-enviando{color:#94a3b8}
#v-waInbox .nxWaMsgState.st-enviado{color:#64748b}
#v-waInbox .nxWaMsgState.st-entregado{color:#64748b}
#v-waInbox .nxWaMsgState.st-leido{color:#1687d9}
#v-waInbox .nxWaMsgState.st-fallido{color:#dc2626;font-weight:900;gap:3px}
#v-waInbox .nxWaMsgState.st-fallido span{font-size:7px}
#v-waInbox .nxWaDaySep{align-self:center;display:inline-flex;align-items:center;justify-content:center;min-height:24px;margin:4px auto;padding:0 9px;border:1px solid rgba(148,163,184,.15);border-radius:999px;background:rgba(255,255,255,.70);color:#64748b;font-size:7.5px;font-weight:850;box-shadow:0 8px 18px -18px rgba(15,23,42,.46);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);user-select:none;-webkit-user-select:none}
#v-waInbox .nxWaBub img,#v-waInbox .nxWaBub video{box-shadow:0 5px 14px -13px rgba(15,23,42,.45)}
#v-waInbox .nxWaBub audio{display:block;width:min(260px,100%)!important;max-width:100%!important;margin:1px 0 3px}
#v-waInbox .nxWaBub video{display:block;max-width:min(300px,100%)!important;width:auto!important;border-radius:12px!important;margin-bottom:4px}
#v-waInbox .nxWaBub a{color:#2563eb;font-weight:800;text-decoration:none}
#v-waInbox .nxWaBub a:hover{text-decoration:underline}
#v-waInbox .nxWaComposer{min-height:48px!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease!important}
#v-waInbox .nxWaComposer:focus-within{border-color:rgba(37,99,235,.22)!important;background:rgba(255,255,255,.92)!important;box-shadow:0 12px 30px -24px rgba(15,23,42,.58),0 0 0 3px rgba(37,99,235,.055)!important}
#v-waInbox .nxWaComposer input{font-size:12px!important;letter-spacing:0!important}
#v-waInbox .nxWaComposer input::placeholder{color:#94a3b8;opacity:1}
#v-waInbox .nxWaComposer button{width:38px!important;height:38px!important;flex-basis:38px!important;transition:transform .12s ease,filter .12s ease,opacity .12s ease!important}
#v-waInbox .nxWaComposer button:hover{filter:saturate(1.08) brightness(1.02)}
#v-waInbox .nxWaComposer button i{font-size:15px}
#v-waInbox .nxWaComposer input:disabled+#nxWaSendBtn,#v-waInbox .nxWaComposer button:disabled{opacity:.55}
body.tema-premium #v-waInbox .nxWaMsgMeta{color:#93a4ba}
body.tema-premium #v-waInbox .nxWaMsgState.st-leido{color:#60a5fa}
body.tema-premium #v-waInbox .nxWaDaySep{background:rgba(30,41,59,.76);border-color:rgba(148,163,184,.12);color:#a9b8cc}
body.tema-premium #v-waInbox .nxWaComposer:focus-within{background:rgba(27,36,52,.86)!important;border-color:rgba(96,165,250,.18)!important;box-shadow:0 12px 30px -24px rgba(0,0,0,.45),0 0 0 3px rgba(59,130,246,.07)!important}
@media(max-width:760px){
  #v-waInbox .nxWaBub{max-width:86%!important;padding:9px 10px 7px!important;font-size:11.5px!important}
  #v-waInbox .nxWaMsgMeta{font-size:7.4px;margin-top:4px}
  #v-waInbox .nxWaDaySep{min-height:23px;font-size:7.5px;margin:3px auto}
  /* 16px evita el zoom automático de Safari al enfocar el campo. */
  #v-waInbox .nxWaComposer input{font-size:16px!important;height:38px!important}
  #v-waInbox .nxWaComposer{min-height:50px!important;padding:5px 5px 5px 11px!important}
  #v-waInbox .nxWaComposer button{width:40px!important;height:40px!important;flex-basis:40px!important}
  #v-waInbox .nxWaBub audio{width:min(245px,100%)!important}
  #v-waInbox .nxWaBub video{max-width:100%!important}
}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaComposer,#v-waInbox .nxWaComposer button{transition:none!important}#v-waInbox .nxWaMsgs{scroll-behavior:auto}}
`;
    document.head.appendChild(s);
  }

  function root(){return $('#v-waInbox');}
  function api(){try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}}
  function hiloId(){
    const r=root(),row=r&&$('.nxWaRow.on',r);if(!row)return null;
    const oc=row.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function hora(iso){
    if(!iso)return'';
    try{return new Date(iso).toLocaleTimeString('es-DO',{hour:'numeric',minute:'2-digit'}).replace(/\s+/g,' ').trim()}catch(e){return''}
  }
  function diaKey(iso){
    try{const d=new Date(iso);return[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}catch(e){return''}
  }
  function labelDia(iso){
    try{
      const d=new Date(iso),h=new Date(),a=new Date();a.setDate(h.getDate()-1);
      const key=x=>[x.getFullYear(),x.getMonth(),x.getDate()].join('-');
      if(key(d)===key(h))return'Hoy';
      if(key(d)===key(a))return'Ayer';
      return d.toLocaleDateString('es-DO',{day:'numeric',month:'short',...(d.getFullYear()!==h.getFullYear()?{year:'numeric'}:{})});
    }catch(e){return''}
  }
  // Estado anterior de cada mensaje, para animar SOLO la transicion a leido y no el
  // primer pintado. Vive en un Map y no en el dataset del nodo porque pintar()
  // reconstruye el innerHTML y el dataset se pierde: sin esto, cada refresco de
  // Realtime volveria a animar todos los mensajes ya leidos.
  const estadoPrevio=new Map();

  function estadoInfo(est){
    const e=String(est||'').toLowerCase();
    if(e==='enviando')return{cls:'st-enviando',ico:'ti-clock',txt:'Enviando',txto:'\u25CB'};
    if(e==='enviado')return{cls:'st-enviado',ico:'ti-check',txt:'Enviado',txto:'\u2713'};
    if(e==='entregado')return{cls:'st-entregado',ico:'ti-checks',txt:'Entregado',txto:'\u2713\u2713'};
    if(e==='leido')return{cls:'st-leido',ico:'ti-checks',txt:'Leído',txto:'\u2713\u2713'};
    if(e==='fallido')return{cls:'st-fallido',ico:'ti-alert-circle',txt:'No enviado',txto:'!'};
    return null;
  }

  function aplicarMeta(rows,id){
    const r=root(),box=r&&$('#nxWaMsgsBox',r);if(!box||hiloId()!==id)return;
    const bubbles=$$('.nxWaBub',box);if(!bubbles.length)return;
    const wasBottom=(box.scrollHeight-box.scrollTop-box.clientHeight)<70;
    $$('.nxWaDaySep',box).forEach(x=>x.remove());
    let prev='';
    bubbles.forEach((b,i)=>{
      const m=rows[i];if(!m)return;
      b.dataset.nxWaMsgId=m.id||'';b.dataset.nxWaEstado=m.estado||'';
      $('.nxWaMsgMeta',b)?.remove();
      const dk=diaKey(m.created_at);
      if(dk&&dk!==prev){
        const sep=document.createElement('div');sep.className='nxWaDaySep';sep.textContent=labelDia(m.created_at);b.before(sep);prev=dk;
      }
      const meta=document.createElement('div');meta.className='nxWaMsgMeta';
      const t=document.createElement('span');t.className='nxWaMsgTime';t.textContent=hora(m.created_at);meta.appendChild(t);
      const estadoAntes=estadoPrevio.get(m.id);
      estadoPrevio.set(m.id,m.estado);
      const acabaDeLeerse=(m.direccion==='out'&&m.estado==='leido'&&estadoAntes&&estadoAntes!=='leido');
      if(m.direccion==='out'){
        const inf=estadoInfo(m.estado);
        if(inf){
          const st=document.createElement('span');st.className='nxWaMsgState '+inf.cls;st.title=inf.txt+(m.estado==='fallido'&&m.error_detalle?' · '+String(m.error_detalle).slice(0,160):'');st.setAttribute('aria-label',inf.txt);
          // El visto NO usa <i class="ti">. Se probo cuatro veces a neutralizar por CSS el
          // recuadro morado con relieve que le caia encima y no se logro localizar la regla
          // responsable. Con un caracter de texto el problema desaparece por construccion:
          // ninguna regla de iconos puede alcanzarlo, porque ya no es un icono.
          if(acabaDeLeerse)st.classList.add('nxWaCheckJustRead');
          st.innerHTML='<span class="nxWaMsgCheck">'+inf.txto+'</span>'+(m.estado==='fallido'?'<span>No enviado</span>':'');meta.appendChild(st);
        }
      }
      b.appendChild(meta);
    });
    if(wasBottom)requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight;});
    lastHilo=id;
  }

  async function decorateMessages(){
    const r=root(),box=r&&$('#nxWaMsgsBox',r),id=hiloId();if(!box||!id)return;
    const bubbles=$$('.nxWaBub',box);if(!bubbles.length)return;
    const needs=bubbles.some(b=>!b.dataset.nxWaMsgId||!$('.nxWaMsgMeta',b));
    if(!needs&&lastHilo===id)return;
    if(fetchingId===id)return;
    const A=api();if(!A?.get)return;
    fetchingId=id;
    try{
      const rows=await A.get('whatsapp_hilo_mensajes',`hilo_id=eq.${id}&order=created_at.asc&limit=200&select=id,direccion,estado,error_detalle,created_at`)||[];
      aplicarMeta(rows,id);
    }catch(e){/* visual solamente: si falla la lectura, el chat base queda intacto */}
    finally{if(fetchingId===id)fetchingId=null;}
  }

  function enhanceComposer(){
    const r=root(),inp=r&&$('#nxWaTexto',r),btn=inp&&inp.closest('.nxWaComposer')?.querySelector('button');if(!inp)return;
    inp.setAttribute('aria-label','Escribir mensaje');inp.setAttribute('autocapitalize','sentences');inp.setAttribute('enterkeyhint','send');inp.setAttribute('spellcheck','true');
    if(btn){btn.id='nxWaSendBtn';btn.setAttribute('aria-label','Enviar mensaje');btn.setAttribute('title','Enviar');}
  }

  function enhance(){queued=false;css();enhanceComposer();decorateMessages();}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
  function start(){
    css();queue();
    if(window.__nxWaObsBus)window.__nxWaObsBus.subscribe(queue);
    else{obs=new MutationObserver(queue);obs.observe(document.body,{childList:true,subtree:true,characterData:true});}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
