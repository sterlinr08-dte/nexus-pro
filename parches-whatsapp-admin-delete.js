/* NEXUS PRO · WhatsApp · eliminar chat SOLO administrador · 2026-09-09
   Capa aislada: añade la acción al menú existente sin tocar la lógica base del Inbox.
   La seguridad real vive también en whatsapp-hilo-eliminar (Edge Function): ocultar el
   botón por sí solo NO se considera autorización. */
(function(){
  'use strict';
  if(window.__nxWaAdminDelete20260909)return;
  window.__nxWaAdminDelete20260909=true;

  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let esAdmin=false,rolListo=false;

  function api(){try{return typeof API!=='undefined'?API:window.API;}catch(e){return window.API;}}
  function toastSafe(tipo,tit,sub){try{if(typeof toast==='function')return toast(tipo,tit,sub);}catch(e){} console.log('[WA admin delete]',tit,sub||'');}
  function hiloActualId(){
    const row=$('#v-waInbox .nxWaRow.on');
    const oc=row&&row.getAttribute('onclick')||'';
    const m=oc.match(/nxWaAbrirHilo\(['\"]([^'\"]+)['\"]\)/);
    return m?m[1]:null;
  }
  function nombreActual(){
    return ($('#v-waInbox .nxWaClientName')||$('#v-waInbox .nxWaHeadName'))?.textContent?.trim()||'esta conversación';
  }
  function cerrarPop(){document.querySelectorAll('.nxWaChatPop').forEach(x=>x.remove());}

  function css(){
    if($('#nxWaAdminDeleteCss'))return;
    const s=document.createElement('style');s.id='nxWaAdminDeleteCss';s.textContent=`
.nxWaAdminDeleteBtn{color:#b42318!important}
.nxWaAdminDeleteBtn i{color:#b42318!important}
.nxWaAdminDelOv{position:fixed;inset:0;z-index:100450;display:grid;place-items:center;padding:16px;background:rgba(15,23,42,.42);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.nxWaAdminDelCard{width:min(430px,100%);border-radius:22px;background:#fff;border:1px solid rgba(255,255,255,.9);box-shadow:0 30px 85px -36px rgba(15,23,42,.7);overflow:hidden;font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif}
.nxWaAdminDelHead{display:flex;align-items:center;gap:10px;padding:14px 15px;border-bottom:1px solid #edf1f6}
.nxWaAdminDelIco{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:#fff0ee;color:#c43224;font-size:19px;flex:none}
.nxWaAdminDelHead b{font-size:13px;color:#17233d;flex:1}
.nxWaAdminDelX{width:34px;height:34px;border:0;border-radius:50%;background:#f4f6f9;color:#65738b;display:grid;place-items:center;cursor:pointer}
.nxWaAdminDelBody{padding:14px 15px 8px;color:#506078;font-size:10.5px;line-height:1.55}
.nxWaAdminDelBody strong{color:#17233d}
.nxWaAdminDelWarn{margin:10px 0;padding:10px 11px;border-radius:13px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:9.5px;font-weight:750}
.nxWaAdminDelBody label{display:block;margin:11px 0 5px;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#7a889e}
.nxWaAdminDelBody input{width:100%;height:42px;border:1px solid #dce4ef;border-radius:12px;padding:0 11px;background:#fff;color:#17233d;font:inherit;font-size:10.5px;outline:none}
.nxWaAdminDelBody input:focus{border-color:#ef8f86;box-shadow:0 0 0 3px rgba(220,38,38,.08)}
.nxWaAdminDelFoot{display:flex;justify-content:flex-end;gap:8px;padding:11px 15px 15px}
.nxWaAdminDelFoot button{height:40px;border-radius:12px;padding:0 14px;font:inherit;font-size:10px;font-weight:900;cursor:pointer}
.nxWaAdminDelCancel{border:1px solid #dce4ef;background:#fff;color:#52627b}
.nxWaAdminDelConfirm{border:0;background:#c43224;color:#fff;min-width:142px}
.nxWaAdminDelConfirm:disabled{opacity:.55;cursor:not-allowed}
body.tema-premium .nxWaAdminDelCard{background:#172235;border-color:rgba(148,163,184,.16)}
body.tema-premium .nxWaAdminDelHead{border-color:rgba(148,163,184,.12)}
body.tema-premium .nxWaAdminDelHead b,body.tema-premium .nxWaAdminDelBody strong{color:#edf4ff}
body.tema-premium .nxWaAdminDelBody{color:#9fb0cb}
body.tema-premium .nxWaAdminDelBody input{background:#101827;border-color:#334155;color:#edf4ff}
@media(max-width:640px){.nxWaAdminDelOv{align-items:end;padding:10px}.nxWaAdminDelCard{border-radius:22px 22px 16px 16px}.nxWaAdminDelFoot{display:grid;grid-template-columns:1fr 1fr}.nxWaAdminDelFoot button{width:100%;padding:0 8px}}
`;
    document.head.appendChild(s);
  }

  async function cargarRol(){
    const A=api();
    if(!A?.url||!A?.key){rolListo=true;return;}
    try{
      const r=await fetch(A.url+'/rest/v1/rpc/mi_rol',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},
        body:'{}'
      });
      if(r.ok){
        const data=await r.json();
        esAdmin=String(data||'').toLowerCase()==='admin';
      }
    }catch(e){esAdmin=false;}
    rolListo=true;
    inyectarMenus();
  }

  function inyectarMenu(menu){
    if(!esAdmin||!menu||menu.querySelector('.nxWaAdminDeleteBtn'))return;
    const sep=document.createElement('div');sep.className='sep nxWaAdminDeleteSep';
    const b=document.createElement('button');
    b.type='button';b.className='danger nxWaAdminDeleteBtn';
    b.innerHTML='<i class="ti ti-trash"></i><span>Eliminar chat</span>';
    b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();cerrarPop();abrirConfirmacion();});
    menu.append(sep,b);
  }
  function inyectarMenus(){
    if(!rolListo||!esAdmin)return;
    document.querySelectorAll('.nxWaMainMenu').forEach(inyectarMenu);
  }

  function abrirConfirmacion(){
    if(!esAdmin){toastSafe('err','Acceso restringido','Solo el administrador puede eliminar chats.');return;}
    const id=hiloActualId();
    if(!id){toastSafe('err','Chat no disponible','Abra nuevamente la conversación e inténtelo otra vez.');return;}
    $('.nxWaAdminDelOv')?.remove();
    const nombre=nombreActual();
    const ov=document.createElement('div');ov.className='nxWaAdminDelOv';
    ov.innerHTML=`<div class="nxWaAdminDelCard" role="dialog" aria-modal="true" aria-label="Eliminar chat">
      <div class="nxWaAdminDelHead"><span class="nxWaAdminDelIco"><i class="ti ti-trash"></i></span><b>Eliminar chat</b><button type="button" class="nxWaAdminDelX" aria-label="Cerrar"><i class="ti ti-x"></i></button></div>
      <div class="nxWaAdminDelBody">
        Va a eliminar permanentemente el chat de <strong>${esc(nombre)}</strong> del CRM NEXUS PRO.
        <div class="nxWaAdminDelWarn"><i class="ti ti-alert-triangle"></i> Se eliminarán el historial y los archivos guardados por NEXUS PRO. Esto no borra los mensajes que ya fueron entregados al WhatsApp del cliente.</div>
        <label for="nxWaAdminDelMotivo">Motivo de eliminación (opcional)</label>
        <input id="nxWaAdminDelMotivo" maxlength="500" autocomplete="off" placeholder="Ej.: chat duplicado o conversación de prueba">
      </div>
      <div class="nxWaAdminDelFoot"><button type="button" class="nxWaAdminDelCancel">Cancelar</button><button type="button" class="nxWaAdminDelConfirm"><i class="ti ti-trash"></i> Eliminar definitivamente</button></div>
    </div>`;
    document.body.appendChild(ov);
    const cerrar=()=>ov.remove();
    $('.nxWaAdminDelX',ov).onclick=cerrar;
    $('.nxWaAdminDelCancel',ov).onclick=cerrar;
    ov.addEventListener('click',e=>{if(e.target===ov)cerrar();});
    $('.nxWaAdminDelConfirm',ov).onclick=()=>eliminarChat(id,ov);
  }

  async function eliminarChat(hiloId,ov){
    const A=api();
    if(!A?.url||!A?.key){toastSafe('err','Sin conexión','No se encontró la conexión de NEXUS PRO.');return;}
    const btn=$('.nxWaAdminDelConfirm',ov);const motivo=$('#nxWaAdminDelMotivo',ov)?.value?.trim()||'';
    btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Eliminando…';
    try{
      const r=await fetch(A.url+'/functions/v1/whatsapp-hilo-eliminar',{
        method:'POST',
        headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},
        body:JSON.stringify({hilo_id:hiloId,motivo})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data?.ok){
        const msg=data?.error==='solo_administrador'?'Solo el administrador puede eliminar chats.':data?.error==='chat_no_encontrado'?'Este chat ya no existe.':'No se pudo eliminar el chat.';
        throw new Error(msg);
      }
      ov.remove();
      if(typeof window.nxWaCerrarDetalleMob==='function')window.nxWaCerrarDetalleMob();
      const extra=data.media_cleanup_estado&&data.media_cleanup_estado!=='ok'?' El chat fue eliminado; algunos archivos quedaron pendientes de limpieza.':'';
      toastSafe('ok','Chat eliminado',`${data.mensajes_eliminados||0} mensajes eliminados.${extra}`);
    }catch(e){
      btn.disabled=false;btn.innerHTML='<i class="ti ti-trash"></i> Eliminar definitivamente';
      toastSafe('err','No se pudo eliminar',e?.message||'Inténtelo nuevamente.');
    }
  }

  css();
  cargarRol();
  const obs=new MutationObserver(()=>inyectarMenus());
  obs.observe(document.documentElement,{childList:true,subtree:true});
})();
