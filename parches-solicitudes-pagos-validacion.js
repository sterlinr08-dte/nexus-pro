/* NEXUS PRO · Solicitudes · pagos pendientes por validar · 2026-09-10
   Fusiona la validación bancaria dentro de la cola operativa ya existente de Solicitudes.
   Reusa las RPC reales seguros_pagos_pendientes_validacion / seguros_validar_pago. */
(function(){
'use strict';
if(window.__nxSolicitudesPagosValidacion20260910)return;
window.__nxSolicitudesPagosValidacion20260910=true;

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APIx=()=>{try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}};
let items=[],lastLoad=0,busy=false;

function money(v){return(Number(v)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmtDate(v){try{return new Date(v).toLocaleString('es-DO',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return String(v||'')}}
function toast(t,a,b){try{if(typeof window.toast==='function')window.toast(t,a,b||'')}catch(e){}}
async function rpc(name,args={}){const A=APIx();if(!A?.post)throw new Error('Sin conexión con NEXUS PRO');return await A.post('rpc/'+name,args)}

function css(){
  if($('#nxSolPayCss'))return;
  const s=document.createElement('style');s.id='nxSolPayCss';s.textContent=`
/* La validación de pagos vive dentro de una sola cola en Solicitudes. */
#nxWaAutoOverlay .nxPayV2Entry,#v-waInbox .nxPayV2MainBadge{display:none!important}
#v-solicitudes .nxSL-section-pend.nxSL-section-payval{border-left:4px solid #2563eb}
#v-solicitudes .nxSL-section-pend.nxSL-section-payval .nxSL-section-title i{color:#2563eb}
#v-solicitudes .nxSL-section-pend.nxSL-section-payval .nxSL-section-count{background:#dbeafe;color:#1d4ed8}
#v-solicitudes .nxSL-pay-note{font-size:10px;color:#64748b;margin:-4px 0 12px;line-height:1.45}
#v-solicitudes .nxSL-pay-merged{margin-top:10px;padding-top:10px;border-top:1px solid #e5eaf1}
#v-solicitudes .nxSL-pay-merged-label{font-size:8.5px;font-weight:900;letter-spacing:.45px;color:#64748b;text-transform:uppercase;margin:0 0 8px}
#v-solicitudes .nxSL-pay-amt{font-weight:900;color:#0f5fc7;white-space:nowrap}
#v-solicitudes .nxSL-pay-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
#v-solicitudes .nxSL-pay-btn{height:30px;border:0;border-radius:999px;padding:0 10px;font:800 9px/1 'Plus Jakarta Sans','Segoe UI',system-ui;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
#v-solicitudes .nxSL-pay-btn.validar{background:#eaf1ff;color:#2563eb;box-shadow:0 2px 8px rgba(37,99,235,.12)}
#v-solicitudes .nxSL-pay-btn.voucher{background:#ecfdf5;color:#087a4c}
.nxSolPayOv{position:fixed;inset:0;z-index:2147482800;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-family:'Plus Jakarta Sans','Segoe UI',system-ui}
.nxSolPayCard{width:min(430px,100%);background:#fff;border:1px solid rgba(255,255,255,.9);border-radius:22px;box-shadow:0 30px 85px -36px rgba(15,23,42,.72);overflow:hidden}
.nxSolPayHead{display:flex;align-items:center;gap:10px;padding:14px 15px;border-bottom:1px solid #edf1f6}.nxSolPayIco{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#eaf1ff;color:#2563eb;font-size:18px}.nxSolPayHead b{font-size:12px;color:#17233d;flex:1}.nxSolPayX{width:34px;height:34px;border:0;border-radius:50%;background:#f4f6f9;color:#65738b;cursor:pointer}
.nxSolPayBody{padding:14px 15px 8px;color:#506078;font-size:10px;line-height:1.55}.nxSolPayResume{padding:10px 11px;border-radius:13px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:10px}.nxSolPayResume strong{display:block;color:#17233d;font-size:11px}.nxSolPayResume span{display:block;margin-top:3px}.nxSolPayWarn{padding:9px 10px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:9px;font-weight:700}.nxSolPayBody label{display:block;margin:11px 0 5px;font-size:8px;font-weight:900;text-transform:uppercase;color:#7a889e}.nxSolPayBody input{width:100%;height:40px;border:1px solid #dce4ef;border-radius:12px;padding:0 10px;background:#fff;color:#17233d;font:inherit;outline:none}.nxSolPayBody input:focus{border-color:#93b4ff;box-shadow:0 0 0 3px rgba(37,99,235,.08)}
.nxSL-pay-wait{font:800 8.5px 'Plus Jakarta Sans','Segoe UI',system-ui;color:#64748b;letter-spacing:.03em;white-space:nowrap}
.nxSolPayFoot{display:flex;justify-content:flex-end;gap:8px;padding:11px 15px 15px}.nxSolPayFoot button{height:39px;border-radius:12px;padding:0 13px;font:800 9.5px 'Plus Jakarta Sans','Segoe UI',system-ui;cursor:pointer}.nxSolPayCancel{border:1px solid #dce4ef;background:#fff;color:#52627b}.nxSolPayConfirm{border:0;background:#2563eb;color:#fff;min-width:128px}.nxSolPayConfirm:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:700px){#v-solicitudes .nxSL-pay-actions{justify-content:flex-start}.nxSolPayOv{align-items:end;padding:8px}.nxSolPayCard{border-radius:22px 22px 16px 16px}.nxSolPayFoot{display:grid;grid-template-columns:1fr 1fr}.nxSolPayFoot button{width:100%}}
`;document.head.appendChild(s);
}

async function cargar(force=false){
  if(busy)return items;
  if(!force&&Date.now()-lastLoad<20000)return items;
  busy=true;
  try{
    const r=await rpc('seguros_pagos_pendientes_validacion',{});
    items=Array.isArray(r)?r:(r?[r]:[]);lastLoad=Date.now();
    return items;
  }finally{busy=false}
}

function fila(p){
  const u=String(p.comprobante_url||''),has=/^https?:\/\//i.test(u);
  return `<tr data-pay-id="${esc(p.abono_id)}">
    <td data-label="FECHA">${esc(fmtDate(p.fecha))}</td>
    <td data-label="CUENTA"><strong>${esc(p.agente||'—')}</strong></td>
    <td data-label="COBRÓ">${esc(p.cobrado_por||'—')}</td>
    <td data-label="CLIENTE">${esc(p.cliente||'Cliente')}</td>
    <td data-label="MONTO" class="nxSL-pay-amt">RD$ ${money(p.monto)}</td>
    <td data-label="MÉTODO / BANCO"><strong>${esc(p.metodo||'Pago')}</strong><br><span style="font-size:8px;color:#64748b">${esc(p.banco||'—')}</span></td>
    <td data-label="REFERENCIA">${esc(p.referencia||'—')}</td>
    <td data-label="ACCIONES"><div class="nxSL-pay-actions">${has?`<button type="button" class="nxSL-pay-btn voucher" data-pay-voucher="${esc(u)}"><i class="ti ti-photo"></i> VER</button>`:''}${p.puede_validar!==false?`<button type="button" class="nxSL-pay-btn validar" data-pay-validate><i class="ti ti-shield-check"></i> VALIDAR</button>`:`<span class="nxSL-pay-wait" title="El dinero entró a esa cuenta: solo su dueño o el administrador pueden validarlo">Lo valida ${esc(p.agente||'la cuenta')}</span>`}</div></td>
  </tr>`;
}

function numeroTexto(v){const n=parseInt(String(v||'').replace(/[^0-9]/g,''),10);return Number.isFinite(n)?n:0}

function fusionarSection(){
  const view=$('#v-solicitudes');if(!view)return;

  /* El bloque independiente anterior ya no debe existir. */
  $('#nxSolPaySection',view)?.remove();

  const sec=$('.nxSL-section-pend',view);
  if(!sec)return;
  sec.classList.add('nxSL-section-payval');

  const title=$('.nxSL-section-title',sec);
  if(title)title.innerHTML='<i class="ti ti-shield-dollar"></i> PAGOS PENDIENTES POR VALIDAR';

  const countEl=$('.nxSL-section-count',sec);
  const current=countEl?numeroTexto(countEl.textContent):0;
  const lastMerged=numeroTexto(sec.dataset.nxPayMergedTotal);
  let base=numeroTexto(sec.dataset.nxPayBaseCount);
  if(!sec.dataset.nxPayBaseCount||current!==lastMerged){base=current}
  const total=base+items.length;
  sec.dataset.nxPayBaseCount=String(base);
  sec.dataset.nxPayMergedTotal=String(total);
  sec.dataset.nxPayMerged='1';
  if(countEl)countEl.textContent=String(total);

  let note=$('#nxSolPayNote',sec);
  if(!note){
    note=document.createElement('div');note.id='nxSolPayNote';note.className='nxSL-pay-note';
    const head=$('.nxSL-section-head',sec);
    if(head)head.insertAdjacentElement('afterend',note);else sec.prepend(note);
  }
  note.textContent='Transferencias, depósitos y entregas de fondos que requieren validación. Solo llegan aquí los pagos CRUZADOS: los que registró alguien que no es el dueño de la cuenta donde entró el dinero. Lo valida el dueño de esa cuenta o el administrador; el resto se valida automáticamente y no aparece aquí.';

  $('#nxSolPayMerged',sec)?.remove();

  const empties=$$('.nxSL-empty-soft,.nxSL-empty',sec).filter(el=>/entrega|pendiente|confirm/i.test(el.textContent||''));
  if(base===0&&items.length===0){
    empties.forEach(el=>{el.style.display='';el.textContent='✓ No hay pagos pendientes por validar.'});
  }else if(items.length>0){
    empties.forEach(el=>{if(base===0)el.style.display='none'});
  }

  if(!items.length)return;

  const merged=document.createElement('div');merged.id='nxSolPayMerged';merged.className='nxSL-pay-merged';
  merged.innerHTML=`<div class="nxSL-pay-merged-label">VALIDACIONES BANCARIAS</div><div class="nxSL-table-wrap"><table class="nxSL-table"><thead><tr><th>FECHA</th><th>CUENTA</th><th>COBRÓ</th><th>CLIENTE</th><th>MONTO</th><th>MÉTODO / BANCO</th><th>REFERENCIA</th><th>ACCIONES</th></tr></thead><tbody>${items.map(fila).join('')}</tbody></table></div>`;
  sec.appendChild(merged);
  $$('[data-pay-voucher]',merged).forEach(b=>b.onclick=()=>window.open(b.dataset.payVoucher,'_blank','noopener'));
  $$('[data-pay-validate]',merged).forEach(b=>b.onclick=()=>abrirConfirmacion(b.closest('tr')?.dataset.payId));
}

function abrirConfirmacion(id){
  const p=items.find(x=>String(x.abono_id)===String(id));if(!p)return;
  $('.nxSolPayOv')?.remove();
  const ov=document.createElement('div');ov.className='nxSolPayOv';
  ov.innerHTML=`<div class="nxSolPayCard" role="dialog" aria-modal="true" aria-label="Validar pago"><div class="nxSolPayHead"><span class="nxSolPayIco"><i class="ti ti-shield-check"></i></span><b>Validar pago bancario</b><button type="button" class="nxSolPayX" aria-label="Cerrar"><i class="ti ti-x"></i></button></div><div class="nxSolPayBody"><div class="nxSolPayResume"><strong>${esc(p.cliente||'Cliente')} · RD$ ${money(p.monto)}</strong><span>${esc(p.metodo||'Pago')} · ${esc(p.banco||'—')} · Entró a la cuenta de ${esc(p.agente||'—')}${p.cobrado_por?` · Lo cobró ${esc(p.cobrado_por)}`:''}</span></div><div class="nxSolPayWarn"><i class="ti ti-alert-triangle"></i> Confirma únicamente después de verificar que el dinero entró realmente a esa cuenta.</div><label for="nxSolPayNota">Nota de validación (opcional)</label><input id="nxSolPayNota" maxlength="240" autocomplete="off" placeholder="Ej.: depósito verificado en Banreservas"></div><div class="nxSolPayFoot"><button type="button" class="nxSolPayCancel">Cancelar</button><button type="button" class="nxSolPayConfirm"><i class="ti ti-check"></i> Validar pago</button></div></div>`;
  document.body.appendChild(ov);
  const close=()=>ov.remove();$('.nxSolPayX',ov).onclick=close;$('.nxSolPayCancel',ov).onclick=close;ov.onclick=e=>{if(e.target===ov)close()};$('.nxSolPayConfirm',ov).onclick=()=>validar(id,ov);
}

async function validar(id,ov){
  const btn=$('.nxSolPayConfirm',ov),nota=$('#nxSolPayNota',ov)?.value?.trim()||null;
  btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Validando…';
  try{
    const r=await rpc('seguros_validar_pago',{p_abono_id:id,p_nota:nota});
    ov.remove();toast('ok','Pago validado',`Acumulado de ${r?.agente||'la cuenta'}: RD$ ${money(r?.acumulado)}`);
    lastLoad=0;await cargar(true);
    if(typeof window.nxRefrescarSolicitudes==='function')await window.nxRefrescarSolicitudes();else fusionarSection();
  }catch(e){btn.disabled=false;btn.innerHTML='<i class="ti ti-check"></i> Validar pago';toast('err','No se pudo validar',String(e?.message||e))}
}

async function integrar(force=false){
  css();const view=$('#v-solicitudes');if(!view||!view.classList.contains('on'))return;
  try{await cargar(force);fusionarSection()}catch(e){console.error('[Solicitudes pagos]',e)}
}

function envolver(){
  css();
  const r=window.nxRenderSolicitudes;
  if(typeof r==='function'&&!r.__nxPaySolWrap){const f=async function(){const x=await r.apply(this,arguments);await integrar(true);return x};f.__nxPaySolWrap=true;window.nxRenderSolicitudes=f}
  const rr=window.nxRefrescarSolicitudes;
  if(typeof rr==='function'&&!rr.__nxPaySolWrap){const f=async function(){const x=await rr.apply(this,arguments);await integrar(true);return x};f.__nxPaySolWrap=true;window.nxRefrescarSolicitudes=f}
}

envolver();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',envolver,{once:true});
setInterval(()=>{const v=$('#v-solicitudes');if(!v?.classList.contains('on'))return;const sec=$('.nxSL-section-pend',v);if(sec&&sec.dataset.nxPayMerged!=='1')integrar(false)},2500);
})();
