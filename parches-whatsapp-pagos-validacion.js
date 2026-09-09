/* NEXUS PRO · Pagos bancarios por validar · 2026-09-09
   Transferencia/Depósito registrados quedan pendientes de validación manual.
   Esta UI NO detecta vouchers ni modifica montos; solo lista y valida pagos ya aplicados. */
(function(){
  'use strict';
  if(window.__nxWaPagosValidacion20260909)return;
  window.__nxWaPagosValidacion20260909=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=()=>{try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}};
  const toastSafe=(t,a,b)=>{try{if(typeof window.toast==='function')window.toast(t,a,b||'')}catch(e){}};
  let pendientes=[];
  let queued=false;

  function money(v){return (Number(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function fecha(v){try{return new Date(v).toLocaleString('es-DO',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return String(v||'')}}

  function css(){
    if($('#nxWaPayValCss'))return;
    const s=document.createElement('style');s.id='nxWaPayValCss';s.textContent=`
.nxWaPayValOverlay{position:fixed;inset:0;z-index:2147482750;background:rgba(15,23,42,.38);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Plus Jakarta Sans',system-ui;color:#0f172a}
.nxWaPayValBox{width:min(760px,100%);max-height:min(90vh,820px);overflow:auto;border-radius:30px;background:rgba(255,255,255,.98);border:1px solid rgba(255,255,255,.92);box-shadow:0 35px 90px -38px rgba(15,23,42,.7)}
.nxWaPayValHead{position:sticky;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 17px 13px;border-bottom:1px solid #e8edf5;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:30px 30px 0 0}
.nxWaPayValTitle{display:flex;align-items:center;gap:10px;min-width:0}.nxWaPayValMark{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#eff6ff,#ecfdf5);color:#1677e8;font-size:19px}.nxWaPayValHead h3{margin:0;font-size:16px;font-weight:900}.nxWaPayValHead p{margin:3px 0 0;font-size:9px;color:#64748b;line-height:1.35}.nxWaPayValX{width:35px;height:35px;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font-size:18px;cursor:pointer}
.nxWaPayValBody{padding:14px 16px 18px}.nxWaPayValIntro{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;margin-bottom:11px;border:1px solid #bfdbfe;background:linear-gradient(135deg,#f8fbff,#f0fdf4);border-radius:17px}.nxWaPayValIntro b{font-size:10.5px}.nxWaPayValIntro span{display:block;margin-top:3px;font-size:8.5px;color:#64748b}.nxWaPayValCount{min-width:34px;height:34px;padding:0 9px;border-radius:999px;background:#2563eb;color:white;display:grid;place-items:center;font-size:12px;font-weight:900}
.nxWaPayValList{display:grid;gap:9px}.nxWaPayValCard{border:1px solid #e2e8f0;border-radius:20px;padding:12px;background:#fff;box-shadow:0 15px 32px -30px rgba(15,23,42,.5)}.nxWaPayValTop{display:flex;align-items:flex-start;gap:9px}.nxWaPayValAv{width:39px;height:39px;border-radius:14px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-size:17px;flex:none}.nxWaPayValMain{min-width:0;flex:1}.nxWaPayValMain b{font-size:11px;font-weight:900;display:block}.nxWaPayValMain span{font-size:8.6px;color:#64748b;display:block;margin-top:3px}.nxWaPayValAmount{font-size:14px;font-weight:900;color:#0f5fc7;white-space:nowrap}
.nxWaPayValMeta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:10px}.nxWaPayValMeta div{padding:7px 8px;border-radius:12px;background:#f8fafc;border:1px solid #edf1f6;min-width:0}.nxWaPayValMeta small{display:block;font-size:7px;font-weight:900;color:#94a3b8;text-transform:uppercase}.nxWaPayValMeta strong{display:block;margin-top:2px;font-size:8.8px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nxWaPayValActions{display:flex;align-items:center;justify-content:space-between;gap:7px;flex-wrap:wrap;margin-top:10px;padding-top:9px;border-top:1px solid #f1f5f9}.nxWaPayValBtn{border:0;border-radius:999px;padding:9px 12px;font:850 9.5px/1 'Plus Jakarta Sans',system-ui;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}.nxWaPayValBtn.primary{background:linear-gradient(135deg,#2563eb,#4f7cff);color:#fff}.nxWaPayValBtn.ghost{background:#f1f5f9;color:#334155}.nxWaPayValBtn.voucher{background:#ecfdf5;color:#087a4c}.nxWaPayValBtn:disabled{opacity:.55;cursor:not-allowed}.nxWaPayValConfirm{display:none;width:100%;padding:9px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa}.nxWaPayValCard.confirming .nxWaPayValConfirm{display:block}.nxWaPayValConfirm p{margin:0 0 7px;font-size:8.7px;color:#9a3412;line-height:1.4}.nxWaPayValConfirm input{width:100%;box-sizing:border-box;border:1px solid #fdba74;border-radius:11px;padding:8px 9px;font:700 9px 'Plus Jakarta Sans',system-ui;outline:none;background:white}.nxWaPayValConfirm .row{display:flex;gap:6px;margin-top:7px}.nxWaPayValConfirm .row button{flex:1}.nxWaPayValEmpty{padding:28px 12px;text-align:center;border:1px dashed #cbd5e1;border-radius:20px;color:#64748b}.nxWaPayValEmpty i{display:block;font-size:28px;color:#22a06b;margin-bottom:7px}.nxWaPayValEmpty b{display:block;font-size:11px;color:#334155}.nxWaPayValEmpty span{display:block;margin-top:4px;font-size:8.8px;line-height:1.4}.nxWaPayValLoading{padding:30px;text-align:center;font-size:10px;color:#64748b}
#nxWaAutoOverlay .nxWaPayValEntry{display:inline-flex!important;position:relative}.nxWaPayValBadge{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#e11d48;color:#fff;display:inline-grid;place-items:center;font-size:7px;font-weight:900}.nxWaPayValBadge.zero{background:#cbd5e1;color:#475569}
#v-waInbox .nxWaAutomationBtn .nxWaPayMainBadge{min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#e11d48;color:#fff;display:inline-grid;place-items:center;font-size:7px;font-weight:900;margin-left:1px}.nxWaPayMainBadge.zero{display:none!important}
@media(max-width:700px){.nxWaPayValOverlay{align-items:flex-end;padding:8px}.nxWaPayValBox{width:100%;max-height:92vh;border-radius:30px 30px 20px 20px}.nxWaPayValHead{border-radius:30px 30px 0 0}.nxWaPayValMeta{grid-template-columns:1fr 1fr}.nxWaPayValActions>.nxWaPayValBtn.primary{width:100%}.nxWaPayValActions>.nxWaPayValBtn.voucher{flex:1}}
`;(document.head||document.documentElement).appendChild(s);
  }

  async function rpc(name,args={}){
    const A=api();if(!A?.post)throw new Error('Sin conexión con NEXUS PRO');
    return await A.post('rpc/'+name,args);
  }

  async function cargar(){
    const r=await rpc('seguros_pagos_pendientes_validacion',{});
    pendientes=Array.isArray(r)?r:(r?[r]:[]);
    actualizarBadges();return pendientes;
  }

  function actualizarBadges(){
    const n=pendientes.length;
    $$('.nxWaPayValBadge').forEach(x=>{x.textContent=String(n);x.classList.toggle('zero',n===0)});
    const main=$('#v-waInbox .nxWaAutomationBtn');
    if(main){let b=$('.nxWaPayMainBadge',main);if(!b){b=document.createElement('span');b.className='nxWaPayMainBadge';main.appendChild(b)}b.textContent=String(n);b.classList.toggle('zero',n===0)}
  }

  function close(){const o=$('#nxWaPayValOverlay');if(o)o.remove()}
  window.nxWaCerrarPagosValidacion=close;

  async function abrir(){
    css();close();
    const o=document.createElement('div');o.id='nxWaPayValOverlay';o.className='nxWaPayValOverlay';
    o.innerHTML=`<div class="nxWaPayValBox" role="dialog" aria-modal="true"><div class="nxWaPayValHead"><div class="nxWaPayValTitle"><div class="nxWaPayValMark"><i class="ti ti-shield-dollar"></i></div><div><h3>Pagos por validar</h3><p>Transferencias y depósitos ya aplicados que requieren verificación manual.</p></div></div><button class="nxWaPayValX" aria-label="Cerrar">×</button></div><div class="nxWaPayValBody" id="nxWaPayValBody"><div class="nxWaPayValLoading">Cargando pagos…</div></div></div>`;
    o.addEventListener('click',e=>{if(e.target===o)close()});$('.nxWaPayValX',o).addEventListener('click',close);(document.body||document.documentElement).appendChild(o);
    try{await cargar();render()}catch(e){const b=$('#nxWaPayValBody');if(b)b.innerHTML=`<div class="nxWaPayValEmpty"><i class="ti ti-alert-circle"></i><b>No se pudieron cargar los pagos</b><span>${esc(e?.message||e)}</span></div>`}
  }
  window.nxWaAbrirPagosValidacion=abrir;

  function card(p){
    const voucher=String(p.comprobante_url||'');
    const hasVoucher=/^https?:\/\//i.test(voucher);
    return `<div class="nxWaPayValCard" data-id="${esc(p.abono_id)}">
      <div class="nxWaPayValTop"><div class="nxWaPayValAv"><i class="ti ti-receipt-2"></i></div><div class="nxWaPayValMain"><b>${esc(p.cliente||'Cliente')}</b><span>${esc(fecha(p.fecha))} · ${esc(p.metodo||'Pago')}</span></div><div class="nxWaPayValAmount">RD$ ${money(p.monto)}</div></div>
      <div class="nxWaPayValMeta"><div><small>Cuenta / agente</small><strong>${esc(p.agente||'—')}</strong></div><div><small>Banco</small><strong>${esc(p.banco||'—')}</strong></div><div><small>Referencia</small><strong>${esc(p.referencia||'—')}</strong></div><div><small>Comprobante</small><strong>${hasVoucher?'Adjunto':'No adjunto'}</strong></div></div>
      <div class="nxWaPayValActions">${hasVoucher?`<button class="nxWaPayValBtn voucher nxWaPayVoucher" data-url="${esc(voucher)}"><i class="ti ti-photo"></i> Ver comprobante</button>`:'<span></span>'}<button class="nxWaPayValBtn primary nxWaPayAsk"><i class="ti ti-shield-check"></i> Validar pago</button>
        <div class="nxWaPayValConfirm"><p>Confirma solo después de verificar que el dinero entró realmente a esa cuenta. Al validar, NEXUS PRO confirmará el pago al cliente.</p><input class="nxWaPayNote" maxlength="240" placeholder="Nota de validación (opcional)"><div class="row"><button class="nxWaPayValBtn ghost nxWaPayCancel">Cancelar</button><button class="nxWaPayValBtn primary nxWaPayConfirm"><i class="ti ti-check"></i> Sí, validar pago</button></div></div>
      </div></div>`;
  }

  function render(){
    const body=$('#nxWaPayValBody');if(!body)return;
    body.innerHTML=`<div class="nxWaPayValIntro"><div><b>${pendientes.length?'Revisa antes de confirmar':'Todo al día'}</b><span>El cliente no recibe confirmación bancaria hasta que tú valides el pago.</span></div><div class="nxWaPayValCount">${pendientes.length}</div></div>${pendientes.length?`<div class="nxWaPayValList">${pendientes.map(card).join('')}</div>`:`<div class="nxWaPayValEmpty"><i class="ti ti-circle-check"></i><b>No hay pagos pendientes de validar</b><span>Las próximas transferencias o depósitos aparecerán aquí automáticamente.</span></div>`}`;
    $$('.nxWaPayVoucher',body).forEach(b=>b.addEventListener('click',()=>{const u=b.dataset.url;if(u)window.open(u,'_blank','noopener')}));
    $$('.nxWaPayAsk',body).forEach(b=>b.addEventListener('click',()=>b.closest('.nxWaPayValCard')?.classList.add('confirming')));
    $$('.nxWaPayCancel',body).forEach(b=>b.addEventListener('click',()=>b.closest('.nxWaPayValCard')?.classList.remove('confirming')));
    $$('.nxWaPayConfirm',body).forEach(b=>b.addEventListener('click',()=>validar(b)));
  }

  async function validar(btn){
    const card=btn.closest('.nxWaPayValCard');const id=card?.dataset.id;if(!id)return;
    const note=$('.nxWaPayNote',card)?.value||'';
    btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Validando…';
    try{
      const r=await rpc('seguros_validar_pago',{p_abono_id:id,p_nota:note||null});
      toastSafe('ok','Pago validado',`Acumulado de la cuenta: RD$ ${money(r?.acumulado)}`);
      await cargar();render();
      setTimeout(()=>{try{if(typeof window.nxWaAbrirAutomatizaciones==='function'&&$('#nxWaAutoOverlay')){} }catch(e){}},0);
    }catch(e){toastSafe('err','No se pudo validar',String(e?.message||e));btn.disabled=false;btn.innerHTML='<i class="ti ti-check"></i> Sí, validar pago'}
  }

  function fixAutoLabels(){
    const root=$('#nxWaAutoOverlay');if(!root)return;
    const labels={
      pago_aplicado:['Al registrar / validar pago','Cliente'],
      pago_pendiente_validacion:['Al registrar transferencia/depósito','Agente de la cuenta'],
      pago_validado_resumen:['Al validar el pago','Agente de la cuenta']
    };
    Object.entries(labels).forEach(([code,vals])=>{
      const c=root.querySelector(`.nxWaAutoCard[data-code="${code}"]`);if(!c)return;
      const xs=c.querySelectorAll('.nxWaAutoMeta strong');if(xs[0])xs[0].textContent=vals[0];if(xs[1])xs[1].textContent=vals[1];
    });
  }

  function inject(){
    css();fixAutoLabels();
    const acts=$('#nxWaAutoOverlay .nxWaAutoActions');
    if(acts&&!$('.nxWaPayValEntry',acts)){
      const b=document.createElement('button');b.className='nxWaAutoAct ghost nxWaPayValEntry';b.type='button';b.innerHTML='<i class="ti ti-shield-dollar"></i> Pagos por validar <span class="nxWaPayValBadge zero">0</span>';b.addEventListener('click',()=>{try{$('#nxWaAutoOverlay')?.remove()}catch(e){}abrir()});acts.prepend(b);
    }
    actualizarBadges();
  }

  async function initCount(){try{await cargar()}catch(e){pendientes=[];actualizarBadges()}}
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;inject()})}
  function start(){css();inject();initCount();const obs=new MutationObserver(queue);obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(inject,500);setTimeout(initCount,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
