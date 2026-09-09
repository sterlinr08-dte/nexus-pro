/* NEXUS PRO · WhatsApp · botón manual de notificación en Cobranza · 2026-09-09
   Solo aparece cuando el KPI/filtro Cobranza está activo. No abre wa.me ni usa texto libre:
   llama a whatsapp-recordatorio-pendiente-manual, que recalcula el saldo y usa plantilla Meta. */
(function(){
  'use strict';
  if(window.__nxWaCobranzaNotificar20260909)return;
  window.__nxWaCobranzaNotificar20260909=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const api=()=>{try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}};
  const toastSafe=(tipo,tit,sub)=>{try{if(typeof window.toast==='function')return window.toast(tipo,tit,sub||'')}catch(e){} console.log('[WA Cobranza]',tit,sub||'')};
  let queued=false;

  function css(){
    if($('#nxWaCobroNotifyCss'))return;
    const s=document.createElement('style');s.id='nxWaCobroNotifyCss';s.textContent=`
#v-waInbox .nxWaCobroNotifyBtn{margin-top:7px;height:29px;min-width:92px;padding:0 10px;border:1px solid rgba(22,163,74,.18);border-radius:999px;background:linear-gradient(135deg,#ecfdf5,#eff6ff);color:#087443;font:850 8.5px/1 'Plus Jakarta Sans',system-ui;display:inline-flex;align-items:center;justify-content:center;gap:5px;cursor:pointer;box-shadow:0 8px 18px -16px rgba(15,118,110,.7);transition:transform .14s ease,opacity .14s ease}
#v-waInbox .nxWaCobroNotifyBtn:active{transform:scale(.96)}
#v-waInbox .nxWaCobroNotifyBtn:disabled{opacity:.62;cursor:default;transform:none}
#v-waInbox .nxWaCobroNotifyBtn.sent{background:#ecfdf5;color:#15803d;border-color:#bbf7d0}
#v-waInbox .nxWaCobroNotifyBtn i{font-size:12px}
@media(max-width:760px){#v-waInbox .nxWaCobroNotifyBtn{height:28px;min-width:88px;font-size:8.2px;margin-top:6px}}
@media(prefers-reduced-motion:reduce){#v-waInbox .nxWaCobroNotifyBtn{transition:none!important}}
`;(document.head||document.documentElement).appendChild(s);
  }

  function cobranzaActiva(){
    const k=$('#v-waInbox .nxWaProKpi.on');
    if(!k)return false;
    const txt=String(k.textContent||'').toLowerCase();
    return txt.includes('cobranza')||txt.includes('cobro');
  }
  function hiloIdDeFila(row){
    const oc=row?.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function limpiar(){
    $$('#v-waInbox .nxWaCobroNotifyBtn').forEach(b=>b.remove());
  }
  function mensajeError(codigo){
    return ({
      cliente_optout:'El cliente pidió no recibir mensajes por WhatsApp.',
      sin_saldo_pendiente:'El cliente ya no tiene saldo pendiente.',
      plantilla_no_aprobada:'La plantilla de pago pendiente no está aprobada en Meta.',
      telefono_invalido:'El cliente no tiene un WhatsApp válido registrado.',
      whatsapp_no_configurado:'WhatsApp NEXUS PRO no tiene una cuenta activa.',
      hilo_sin_cliente:'Esta conversación no está vinculada a un cliente.',
      no_autorizado:'Tu usuario no tiene autorización para esta acción.'
    })[codigo]||'No se pudo enviar la notificación.';
  }

  async function enviar(hiloId,btn){
    if(!hiloId||btn.disabled)return;
    const A=api();if(!A){toastSafe('err','Sin conexión','No se encontró la conexión de NEXUS PRO.');return}
    btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Enviando…';
    try{
      const r=await fetch(`${A.url}/functions/v1/whatsapp-recordatorio-pendiente-manual`,{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},
        body:JSON.stringify({hilo_id:hiloId})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)throw Object.assign(new Error(mensajeError(d.error)),{code:d.error});
      btn.classList.add('sent');
      btn.innerHTML=d.duplicado?'<i class="ti ti-check"></i> Ya enviado':'<i class="ti ti-check"></i> Enviado';
      const monto=Number(d.monto)||0;
      toastSafe('ok',d.duplicado?'Ya estaba notificado':'Notificación enviada',monto?`Saldo pendiente RD$ ${monto.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'');
    }catch(e){
      btn.disabled=false;btn.classList.remove('sent');btn.innerHTML='<i class="ti ti-bell-ringing"></i> Notificar';
      toastSafe('err','No se pudo notificar',String(e?.message||e));
    }
  }

  function sync(){
    queued=false;css();
    const root=$('#v-waInbox');if(!root)return;
    if(!cobranzaActiva()){limpiar();return}
    $$('#nxWaLista .nxWaRow',root).forEach(row=>{
      if($('.nxWaCobroNotifyBtn',row))return;
      const hiloId=hiloIdDeFila(row);if(!hiloId)return;
      const host=$('.nxWaWho',row)||row;
      const b=document.createElement('button');
      b.type='button';b.className='nxWaCobroNotifyBtn';b.innerHTML='<i class="ti ti-bell-ringing"></i> Notificar';
      b.title='Enviar recordatorio manual de saldo pendiente';
      b.setAttribute('aria-label','Notificar factura pendiente por WhatsApp');
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();enviar(hiloId,b)});
      host.appendChild(b);
    });
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  function start(){
    css();sync();
    const r=$('#v-waInbox');if(!r)return;
    const obs=new MutationObserver(queue);
    obs.observe(r,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',queue,{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
