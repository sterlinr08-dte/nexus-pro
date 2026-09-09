/* NEXUS PRO · WhatsApp · Centro de Automatizaciones · 2026-09-08
   Administra las automatizaciones reales server-side. No simula envíos ni reemplaza triggers.
   Los envíos manuales siguen disponibles aunque una automatización esté apagada. */
(function(){
  'use strict';
  if(window.__nxWaAutomatizaciones20260908)return;
  window.__nxWaAutomatizaciones20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=()=>{try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}};
  const toastSafe=(t,a,b)=>{try{if(typeof window.toast==='function')window.toast(t,a,b||'')}catch(e){}};
  let estado=[];
  let tplMap={};

  const META={
    factura_generada:{icon:'ti-file-invoice',trigger:'Al generar una factura',destino:'Cliente'},
    pago_aplicado:{icon:'ti-circle-check',trigger:'Al registrar un pago',destino:'Cliente'},
    atrasado:{icon:'ti-alarm',trigger:'Diario · 8:00 a. m. RD',destino:'Cliente'},
    entrega_confirmada:{icon:'ti-user-check',trigger:'Al confirmar una entrega',destino:'Agente'}
  };

  function css(){
    if($('#nxWaAutoCss'))return;
    const s=document.createElement('style');s.id='nxWaAutoCss';s.textContent=`
#v-waInbox .nxWaProActs button.nxWaAutomationBtn{display:inline-flex!important;align-items:center;gap:6px}
.nxWaAutoOverlay{position:fixed;inset:0;z-index:2147482600;background:rgba(15,23,42,.34);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Plus Jakarta Sans',system-ui;animation:nxWaAutoFade .18s ease both}
.nxWaAutoBox{width:min(820px,100%);max-height:min(88vh,820px);overflow:auto;border-radius:30px;background:rgba(255,255,255,.97);border:1px solid rgba(255,255,255,.92);box-shadow:0 34px 90px -38px rgba(15,23,42,.65);color:#0f172a}
.nxWaAutoHead{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px 14px;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(226,232,240,.78);border-radius:30px 30px 0 0}
.nxWaAutoHead h3{font-size:17px;margin:0;font-weight:900}.nxWaAutoHead p{font-size:9.5px;color:#64748b;margin:3px 0 0}.nxWaAutoX{width:35px;height:35px;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font-size:18px;cursor:pointer}
.nxWaAutoBody{padding:15px 18px 18px}.nxWaAutoIntro{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;margin-bottom:12px;border:1px solid rgba(191,219,254,.8);background:linear-gradient(135deg,#f8fbff,#f5f3ff);border-radius:18px}.nxWaAutoIntro b{font-size:10.5px}.nxWaAutoIntro span{font-size:9px;color:#64748b;line-height:1.4}
.nxWaAutoGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nxWaAutoCard{border:1px solid rgba(226,232,240,.92);border-radius:22px;padding:13px;background:#fff;box-shadow:0 16px 36px -32px rgba(15,23,42,.45)}.nxWaAutoTop{display:flex;align-items:flex-start;gap:10px}.nxWaAutoIcon{width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,#eff6ff,#eef2ff);color:#2563eb;display:grid;place-items:center;font-size:18px;flex:none}.nxWaAutoMain{min-width:0;flex:1}.nxWaAutoMain b{display:block;font-size:11.5px;font-weight:900}.nxWaAutoMain p{font-size:9.5px;color:#64748b;line-height:1.45;margin:4px 0 0}.nxWaAutoSwitch{position:relative;width:42px;height:24px;flex:none}.nxWaAutoSwitch input{position:absolute;opacity:0}.nxWaAutoSwitch span{position:absolute;inset:0;border-radius:999px;background:#cbd5e1;cursor:pointer;transition:.18s}.nxWaAutoSwitch span:after{content:'';position:absolute;width:18px;height:18px;left:3px;top:3px;border-radius:50%;background:#fff;box-shadow:0 2px 7px rgba(15,23,42,.25);transition:.18s}.nxWaAutoSwitch input:checked+span{background:linear-gradient(135deg,#2563eb,#4f7cff)}.nxWaAutoSwitch input:checked+span:after{transform:translateX(18px)}
.nxWaAutoMeta{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}.nxWaAutoMeta div{padding:8px 9px;border-radius:13px;background:#f8fafc;border:1px solid rgba(226,232,240,.8)}.nxWaAutoMeta small{display:block;color:#94a3b8;font-size:7.5px;font-weight:850;text-transform:uppercase}.nxWaAutoMeta strong{display:block;margin-top:3px;font-size:9px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nxWaAutoTpl{margin-top:8px;padding:8px 9px;border-radius:13px;background:#fbfdff;border:1px solid rgba(226,232,240,.8);display:flex;align-items:center;justify-content:space-between;gap:8px}.nxWaAutoTpl .tx{min-width:0}.nxWaAutoTpl small{display:block;font-size:7.5px;color:#94a3b8;text-transform:uppercase;font-weight:850}.nxWaAutoTpl b{display:block;font-size:9px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxWaAutoStatus{font-size:7.5px;font-weight:900;padding:4px 7px;border-radius:999px;white-space:nowrap}.nxWaAutoStatus.ok{background:#dcfce7;color:#15803d}.nxWaAutoStatus.wait{background:#fef3c7;color:#92400e}.nxWaAutoStatus.bad{background:#fee2e2;color:#b91c1c}.nxWaAutoStatus.none{background:#f1f5f9;color:#64748b}
.nxWaAutoCadence{display:flex;align-items:center;gap:7px;margin-top:9px;padding:8px 9px;border-radius:13px;background:#fff7ed;border:1px solid #fed7aa}.nxWaAutoCadence label{font-size:8.5px;font-weight:850;color:#9a3412;flex:1}.nxWaAutoCadence input{width:58px;border:1px solid #fdba74;border-radius:10px;padding:7px;text-align:center;font:800 10px 'Plus Jakarta Sans',system-ui;outline:none}.nxWaAutoLast{margin-top:8px;font-size:8.5px;color:#64748b}.nxWaAutoLast b{color:#334155}.nxWaAutoActions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}.nxWaAutoAct{border:0;border-radius:999px;padding:10px 14px;font:850 10px/1 'Plus Jakarta Sans',system-ui;cursor:pointer}.nxWaAutoAct.primary{background:linear-gradient(135deg,#2563eb,#6678ff);color:#fff}.nxWaAutoAct.ghost{background:#f1f5f9;color:#334155}.nxWaAutoAct:disabled{opacity:.55;cursor:not-allowed}.nxWaAutoLoading{padding:32px;text-align:center;color:#64748b;font-size:10.5px}
@keyframes nxWaAutoFade{from{opacity:0}to{opacity:1}}
@media(max-width:760px){#v-waInbox .nxWaProActs button.nxWaAutomationBtn{display:inline-flex!important}.nxWaAutoOverlay{align-items:flex-end;padding:8px}.nxWaAutoBox{width:100%;max-height:91vh;border-radius:30px 30px 20px 20px}.nxWaAutoHead{border-radius:30px 30px 0 0}.nxWaAutoGrid{grid-template-columns:1fr}.nxWaAutoBody{padding:13px}.nxWaAutoActions .nxWaAutoAct{flex:1}}
@media(prefers-reduced-motion:reduce){.nxWaAutoOverlay{animation:none!important}.nxWaAutoSwitch span,.nxWaAutoSwitch span:after{transition:none!important}}
`;(document.head||document.documentElement).appendChild(s);
  }

  function close(){const o=$('#nxWaAutoOverlay');if(o)o.remove()}
  window.nxWaAutomatizacionesCerrar=close;

  function fmtDate(v){
    if(!v)return 'Sin envíos registrados';
    try{return new Date(v).toLocaleString('es-DO',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return String(v)}
  }
  function statusClass(s){s=String(s||'').toUpperCase();if(s==='APPROVED'||s==='ENVIADO'||s==='ENTREGADO'||s==='LEIDO')return'ok';if(s==='PENDING'||s==='PAUSED'||s==='SIN_CONFIGURAR')return'wait';if(s==='REJECTED'||s==='ERROR'||s==='FALLIDO')return'bad';return'none'}
  function statusLabel(s){const x=String(s||'').toUpperCase();return({APPROVED:'Aprobada',PENDING:'En revisión',REJECTED:'Rechazada',PAUSED:'Pausada',ENVIADO:'Enviado',ERROR:'Error',SIN_CONFIGURAR:'Sin configurar'}[x]||s||'Sin datos')}
  function templateStatus(nombre){
    if(!nombre)return {status:'',label:'Sin plantilla'};
    const t=tplMap[String(nombre).toLowerCase()];
    if(!t)return {status:'',label:'No encontrada en Meta'};
    return {status:t.status||'',label:statusLabel(t.status)};
  }
  async function cargarPlantillas(){
    const A=api();if(!A)return;
    try{
      const r=await fetch(`${A.url}/functions/v1/whatsapp-plantillas-gestionar`,{method:'POST',headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},body:JSON.stringify({accion:'listar'})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)return;
      tplMap={};(d.templates||[]).forEach(t=>{if(t?.name)tplMap[String(t.name).toLowerCase()]=t});
    }catch(e){}
  }
  async function cargarEstado(){
    const A=api();if(!A?.post)throw new Error('Sin conexión con NEXUS PRO');
    const r=await A.post('rpc/whatsapp_automatizaciones_estado',{});
    estado=Array.isArray(r)?r:(r?[r]:[]);
    return estado;
  }
  function card(a){
    const m=META[a.codigo]||{icon:'ti-bolt',trigger:'Automático',destino:'Cliente'};
    const ts=templateStatus(a.plantilla_nombre);
    const last=statusLabel(a.ultimo_estado);
    return `<div class="nxWaAutoCard" data-code="${esc(a.codigo)}">
      <div class="nxWaAutoTop">
        <div class="nxWaAutoIcon"><i class="ti ${esc(m.icon)}"></i></div>
        <div class="nxWaAutoMain"><b>${esc(a.nombre)}</b><p>${esc(a.descripcion)}</p></div>
        <label class="nxWaAutoSwitch" title="Activar o desactivar"><input type="checkbox" class="nxWaAutoToggle" ${a.activo?'checked':''}><span></span></label>
      </div>
      <div class="nxWaAutoMeta"><div><small>Disparo</small><strong>${esc(m.trigger)}</strong></div><div><small>Destino</small><strong>${esc(m.destino)}</strong></div></div>
      <div class="nxWaAutoTpl"><div class="tx"><small>Plantilla Meta</small><b>${esc(a.plantilla_nombre||'—')}</b></div><span class="nxWaAutoStatus ${statusClass(ts.status)}">${esc(ts.label)}</span></div>
      ${a.codigo==='atrasado'?`<div class="nxWaAutoCadence"><label>Repetir mientras siga debiendo cada</label><input class="nxWaAutoDias" type="number" min="1" max="30" value="${Number(a.dias_cadencia)||3}"><label style="flex:none">días</label></div>`:''}
      <div class="nxWaAutoLast">Último intento: <b>${esc(fmtDate(a.ultimo_envio_at))}</b>${a.ultimo_estado?` · <span class="nxWaAutoStatus ${statusClass(a.ultimo_estado)}">${esc(last)}</span>`:''}</div>
    </div>`;
  }
  function render(){
    const body=$('#nxWaAutoContent');if(!body)return;
    const activas=estado.filter(x=>x.activo).length;
    body.innerHTML=`<div class="nxWaAutoIntro"><div><b>${activas} de ${estado.length} automatizaciones activas</b><br><span>Estos interruptores solo controlan disparos automáticos. Los envíos manuales siguen disponibles.</span></div><i class="ti ti-shield-check" style="font-size:22px;color:#2563eb"></i></div>
      <div class="nxWaAutoGrid">${estado.map(card).join('')}</div>
      <div class="nxWaAutoActions"><button class="nxWaAutoAct ghost" id="nxWaAutoCrearTpl"><i class="ti ti-file-plus"></i> Crear plantilla</button><button class="nxWaAutoAct primary" id="nxWaAutoGuardar"><i class="ti ti-device-floppy"></i> Guardar cambios</button></div>`;
    $('#nxWaAutoGuardar')?.addEventListener('click',guardar);
    $('#nxWaAutoCrearTpl')?.addEventListener('click',()=>{close();if(typeof window.nxWaAbrirNuevaPlantilla==='function')window.nxWaAbrirNuevaPlantilla();else toastSafe('warn','Plantillas','El asistente de plantillas todavía no está disponible.')});
  }
  async function abrir(){
    close();css();
    const o=document.createElement('div');o.id='nxWaAutoOverlay';o.className='nxWaAutoOverlay';o.innerHTML=`<div class="nxWaAutoBox" role="dialog" aria-modal="true"><div class="nxWaAutoHead"><div><h3>Automatizaciones</h3><p>WhatsApp NEXUS PRO · reglas activas y estado real</p></div><button class="nxWaAutoX" aria-label="Cerrar">×</button></div><div class="nxWaAutoBody" id="nxWaAutoContent"><div class="nxWaAutoLoading">Cargando automatizaciones…</div></div></div>`;
    o.addEventListener('click',e=>{if(e.target===o)close()});$('.nxWaAutoX',o).addEventListener('click',close);(document.body||document.documentElement).appendChild(o);
    try{await Promise.all([cargarEstado(),cargarPlantillas()]);render()}catch(e){const b=$('#nxWaAutoContent');if(b)b.innerHTML=`<div class="nxWaAutoLoading">No se pudieron cargar las automatizaciones.<br>${esc(e?.message||e)}</div>`}
  }
  window.nxWaAbrirAutomatizaciones=abrir;

  async function guardar(){
    const A=api();if(!A?.post)return;
    const btn=$('#nxWaAutoGuardar');if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Guardando…'}
    try{
      for(const a of estado){
        const c=$(`.nxWaAutoCard[data-code="${CSS.escape(a.codigo)}"]`);if(!c)continue;
        const activo=!!$('.nxWaAutoToggle',c)?.checked;
        const dias=a.codigo==='atrasado'?Number($('.nxWaAutoDias',c)?.value||3):null;
        if(a.codigo==='atrasado'&&(dias<1||dias>30||!Number.isFinite(dias)))throw new Error('La cadencia debe estar entre 1 y 30 días.');
        await A.post('rpc/whatsapp_automatizacion_actualizar',{p_codigo:a.codigo,p_activo:activo,p_dias_cadencia:dias});
      }
      await cargarEstado();render();toastSafe('ok','Automatizaciones','Cambios guardados. Los próximos disparos usarán esta configuración.');
    }catch(e){toastSafe('err','No se pudo guardar',String(e?.message||e));if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-device-floppy"></i> Guardar cambios'}}
  }

  function ensureButton(){
    const acts=$('#v-waInbox .nxWaProActs');if(!acts||$('.nxWaAutomationBtn',acts))return;
    const b=document.createElement('button');b.className='nxWaAutomationBtn';b.type='button';b.innerHTML='<i class="ti ti-bolt"></i><span>Automatizaciones</span>';b.addEventListener('click',abrir);acts.appendChild(b);
  }
  css();ensureButton();
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;ensureButton()})}).observe(document.documentElement,{childList:true,subtree:true});
})();
