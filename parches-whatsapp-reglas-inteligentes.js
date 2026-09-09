/* NEXUS PRO · WhatsApp · Constructor de reglas inteligentes · 2026-09-09
   UX: Cuando X -> hacer Y. Solo usa disparadores y acciones implementados realmente en Supabase.
   Antes de guardar muestra cuántos clientes coinciden ahora mismo. */
(function(){
  'use strict';
  if(window.__nxWaReglasInteligentes20260909)return;
  window.__nxWaReglasInteligentes20260909=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api=()=>{try{return window.API||(typeof API!=='undefined'?API:null)}catch(e){return window.API||null}};
  const toastSafe=(t,a,b)=>{try{if(typeof window.toast==='function')window.toast(t,a,b||'')}catch(e){}};

  const TRIGGERS={
    documentos_pendientes:{icon:'ti-files',name:'Documentos pendientes',desc:'Cuando un documento lleve pendiente varios días.',days:'Después de cuántos días pendiente',def:2,title:'Revisar documentos pendientes'},
    cotizacion_sin_cerrar:{icon:'ti-file-description',name:'Cotización sin cerrar',desc:'Cuando una cotización siga vigente sin convertirse o cerrarse.',days:'Después de cuántos días',def:3,title:'Dar seguimiento a cotización'},
    sin_respuesta_whatsapp:{icon:'ti-message-off',name:'Cliente sin responder',desc:'Cuando nosotros escribimos y el cliente no ha respondido.',days:'Después de cuántos días sin respuesta',def:2,title:'Seguimiento: cliente sin responder'},
    seguimiento_vencido:{icon:'ti-calendar-exclamation',name:'Seguimiento vencido',desc:'Cuando llegue o pase la fecha de seguimiento guardada en el cliente.',days:'Cuántos días después del vencimiento',def:0,title:'Seguimiento vencido'},
    poliza_riesgo:{icon:'ti-shield-exclamation',name:'Póliza próxima a fecha fin',desc:'Detecta clientes cuya póliza se acerca a la fecha fin para dar seguimiento.',days:'Avisar cuando falten hasta cuántos días',def:15,title:'Seguimiento de póliza próxima a fecha fin'},
    proceso_sin_movimiento:{icon:'ti-progress-alert',name:'En proceso sin movimiento',desc:'Cuando un cliente en proceso lleve varios días sin actualización.',days:'Después de cuántos días sin movimiento',def:3,title:'Revisar cliente en proceso'}
  };

  const MAP_BASE=[
    ['cliente.nombre','Nombre del cliente'],['cliente.ars','ARS'],['cliente.plan','Plan'],
    ['cliente.numero_poliza','Número de póliza'],['cliente.fecha_fin','Fecha fin de póliza'],
    ['cliente.responsable','Responsable de seguimiento'],['regla.dias','Días configurados']
  ];
  const MAP_CTX={
    documentos_pendientes:[['contexto.cantidad','Cantidad de documentos pendientes'],['contexto.documento_tipo','Tipo de documento'],['contexto.desde','Fecha desde que está pendiente']],
    cotizacion_sin_cerrar:[['contexto.numero','Número de cotización'],['contexto.total','Total de cotización'],['contexto.fecha','Fecha de cotización'],['contexto.estado','Estado de cotización']],
    sin_respuesta_whatsapp:[['contexto.ultimo_envio','Fecha del último mensaje nuestro'],['contexto.ultimo_cliente','Último mensaje recibido del cliente']],
    seguimiento_vencido:[['contexto.fecha_seguimiento','Fecha de seguimiento'],['contexto.responsable','Responsable'],['contexto.prioridad','Prioridad']],
    poliza_riesgo:[['contexto.fecha_fin','Fecha fin'],['contexto.numero_poliza','Número de póliza'],['contexto.ars','ARS de la póliza'],['contexto.plan','Plan de la póliza']],
    proceso_sin_movimiento:[['contexto.motivo','Motivo del proceso'],['contexto.prioridad','Prioridad del proceso'],['contexto.progreso','Porcentaje de progreso'],['contexto.ultima_actualizacion','Última actualización']]
  };

  let reglas=[];
  let plantillas=[];
  let editing=null;
  let previewSig='';
  let previewData=null;

  function css(){
    if($('#nxWaRulesCss'))return;
    const s=document.createElement('style');s.id='nxWaRulesCss';s.textContent=`
.nxWaRulesOverlay{position:fixed;inset:0;z-index:2147482700;background:rgba(15,23,42,.36);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Plus Jakarta Sans',system-ui;color:#0f172a}
.nxWaRulesBox{width:min(880px,100%);max-height:min(90vh,850px);overflow:auto;border-radius:30px;background:rgba(255,255,255,.975);border:1px solid rgba(255,255,255,.92);box-shadow:0 35px 90px -38px rgba(15,23,42,.68)}
.nxWaRulesHead{position:sticky;top:0;z-index:4;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 17px 13px;border-bottom:1px solid rgba(226,232,240,.82);background:rgba(255,255,255,.95);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:30px 30px 0 0}
.nxWaRulesTitle{display:flex;align-items:center;gap:10px;min-width:0}.nxWaRulesMark{width:38px;height:38px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#eff6ff,#eef2ff);color:#2563eb;font-size:19px}.nxWaRulesHead h3{margin:0;font-size:16px;font-weight:900}.nxWaRulesHead p{margin:3px 0 0;font-size:9px;color:#64748b}.nxWaRulesX{width:34px;height:34px;border:0;border-radius:50%;background:#f1f5f9;color:#334155;font-size:18px;cursor:pointer}
.nxWaRulesBody{padding:15px 17px 18px}.nxWaRulesToolbar{display:flex;justify-content:space-between;align-items:center;gap:9px;margin-bottom:12px}.nxWaRulesToolbar .tx b{display:block;font-size:11px}.nxWaRulesToolbar .tx span{font-size:9px;color:#64748b}.nxWaRuleBtn{border:0;border-radius:999px;padding:9px 12px;font:850 9.5px/1 'Plus Jakarta Sans',system-ui;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}.nxWaRuleBtn.primary{background:linear-gradient(135deg,#2563eb,#6878ff);color:#fff}.nxWaRuleBtn.ghost{background:#f1f5f9;color:#334155}.nxWaRuleBtn.danger{background:#fff1f2;color:#be123c}.nxWaRuleBtn:disabled{opacity:.5;cursor:not-allowed}
.nxWaRulesList{display:grid;gap:9px}.nxWaRuleCard{border:1px solid rgba(226,232,240,.92);border-radius:20px;padding:12px;background:#fff}.nxWaRuleCardTop{display:flex;gap:10px;align-items:flex-start}.nxWaRuleIcon{width:38px;height:38px;border-radius:14px;display:grid;place-items:center;background:#f8fafc;color:#2563eb;font-size:18px;flex:none}.nxWaRuleCardMain{min-width:0;flex:1}.nxWaRuleCardMain b{display:block;font-size:11px}.nxWaRuleCardMain p{margin:4px 0 0;font-size:9px;color:#64748b;line-height:1.4}.nxWaRuleState{font-size:8px;font-weight:900;padding:5px 8px;border-radius:999px;background:#dcfce7;color:#15803d}.nxWaRuleState.off{background:#f1f5f9;color:#64748b}.nxWaRuleFlow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px}.nxWaRulePill{padding:6px 8px;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8.5px;font-weight:800;color:#475569}.nxWaRuleArrow{color:#94a3b8;font-size:13px}.nxWaRuleMeta{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:9px;padding-top:9px;border-top:1px solid #f1f5f9}.nxWaRuleLast{font-size:8px;color:#64748b}.nxWaRuleCardActs{display:flex;gap:6px}
.nxWaRuleEmpty{padding:30px 14px;text-align:center;border:1px dashed #cbd5e1;border-radius:20px;color:#64748b}.nxWaRuleEmpty i{display:block;font-size:28px;color:#94a3b8;margin-bottom:7px}.nxWaRuleEmpty b{display:block;font-size:11px;color:#334155}.nxWaRuleEmpty span{font-size:9px;line-height:1.4}
.nxWaRuleForm{display:grid;gap:12px}.nxWaRuleSection{border:1px solid rgba(226,232,240,.92);border-radius:20px;padding:12px;background:#fff}.nxWaRuleSectionHead{display:flex;align-items:center;gap:8px;margin-bottom:10px}.nxWaRuleStep{width:23px;height:23px;border-radius:9px;background:#eff6ff;color:#2563eb;display:grid;place-items:center;font-size:9px;font-weight:900}.nxWaRuleSectionHead b{font-size:10.5px}.nxWaRuleGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.nxWaRuleField label{display:block;font-size:8.5px;font-weight:850;color:#475569;margin:0 0 5px}.nxWaRuleInput,.nxWaRuleSelect{width:100%;box-sizing:border-box;border:1px solid #dbe4f0;border-radius:13px;background:#fff;color:#0f172a;padding:9px 10px;font:700 10px/1.3 'Plus Jakarta Sans',system-ui;outline:none}.nxWaRuleInput:focus,.nxWaRuleSelect:focus{border-color:#93b4ff;box-shadow:0 0 0 3px rgba(37,99,235,.07)}.nxWaRuleHelp{font-size:8px;color:#64748b;line-height:1.4;margin-top:5px}.nxWaRuleActionBox{margin-top:9px;padding:10px;border-radius:15px;background:#f8fafc;border:1px solid #e2e8f0}.nxWaRuleParams{display:grid;gap:7px;margin-top:9px}.nxWaRuleParam{display:grid;grid-template-columns:80px 1fr;gap:8px;align-items:center}.nxWaRuleParam b{font-size:8.5px;color:#475569}.nxWaRuleTplPreview{margin-top:8px;padding:9px;border-radius:13px;background:#fff;border:1px solid #e2e8f0;font-size:9px;line-height:1.45;color:#475569;white-space:pre-wrap}.nxWaRulePreview{border:1px solid #bfdbfe;background:linear-gradient(135deg,#f8fbff,#f5f3ff);border-radius:18px;padding:11px}.nxWaRulePreview b{font-size:10px}.nxWaRulePreview .big{font-size:22px;font-weight:900;color:#1d4ed8;margin:2px 0}.nxWaRuleSamples{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.nxWaRuleSample{font-size:8px;padding:5px 7px;border-radius:999px;background:#fff;border:1px solid #dbeafe;color:#475569}.nxWaRuleFooter{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.nxWaRuleFooter .right{display:flex;gap:7px;flex-wrap:wrap}.nxWaRulesLoading{padding:30px;text-align:center;color:#64748b;font-size:10px}
#nxWaAutoOverlay .nxWaRulesEntry{display:inline-flex!important}
@media(max-width:700px){.nxWaRulesOverlay{align-items:flex-end;padding:8px}.nxWaRulesBox{width:100%;max-height:92vh;border-radius:30px 30px 20px 20px}.nxWaRulesHead{border-radius:30px 30px 0 0}.nxWaRuleGrid{grid-template-columns:1fr}.nxWaRuleFooter .right,.nxWaRuleFooter .nxWaRuleBtn{width:100%}.nxWaRuleFooter .right .nxWaRuleBtn{flex:1}.nxWaRuleParam{grid-template-columns:62px 1fr}}
`;(document.head||document.documentElement).appendChild(s);
  }

  async function rpc(name,args={}){
    const A=api();if(!A?.post)throw new Error('Sin conexión con NEXUS PRO');
    return await A.post('rpc/'+name,args);
  }
  async function cargarPlantillas(){
    const A=api();if(!A)throw new Error('Sin conexión');
    try{
      const r=await fetch(`${A.url}/functions/v1/whatsapp-plantillas-gestionar`,{method:'POST',headers:{'Content-Type':'application/json',apikey:A.key,Authorization:'Bearer '+(A.token||A.key)},body:JSON.stringify({accion:'listar',estado:'APPROVED'})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d.ok)throw new Error(d.error||'No se pudieron leer las plantillas');
      plantillas=(d.templates||[]).filter(t=>String(t?.status||'').toUpperCase()==='APPROVED');
    }catch(e){plantillas=[];}
  }
  function bodyText(t){const c=Array.isArray(t?.components)?t.components:[];const b=c.find(x=>String(x?.type||'').toUpperCase()==='BODY');return String(b?.text||'')}
  function varCount(text){const nums=[...String(text||'').matchAll(/\{\{(\d+)\}\}/g)].map(m=>Number(m[1])||0);return nums.length?Math.max(...nums):0}
  function tplLang(t){return String(t?.language||t?.languageCode||'es')}
  function tplByName(name,lang){return plantillas.find(t=>String(t?.name)===String(name)&&tplLang(t)===String(lang||'es'))||plantillas.find(t=>String(t?.name)===String(name))||null}
  function fmtDate(v){if(!v)return 'Nunca';try{return new Date(v).toLocaleString('es-DO',{day:'2-digit',month:'short',hour:'numeric',minute:'2-digit'})}catch(e){return String(v)}}
  function actionLabel(r){if(r.accion_tipo==='crear_tarea')return 'Crear tarea';const n=r.accion_config?.template_name;return n?'WhatsApp · '+n:'Enviar plantilla WhatsApp'}
  function triggerLabel(r){const t=TRIGGERS[r.trigger_tipo];if(!t)return r.trigger_tipo;return t.name+(r.trigger_dias!=null?' · '+r.trigger_dias+' d':'')}

  function close(){const o=$('#nxWaRulesOverlay');if(o)o.remove()}
  window.nxWaReglasCerrar=close;

  async function abrir(){
    css();const old=$('#nxWaAutoOverlay');if(old)old.remove();close();editing=null;
    const o=document.createElement('div');o.id='nxWaRulesOverlay';o.className='nxWaRulesOverlay';
    o.innerHTML=`<div class="nxWaRulesBox" role="dialog" aria-modal="true"><div class="nxWaRulesHead"><div class="nxWaRulesTitle"><div class="nxWaRulesMark"><i class="ti ti-route"></i></div><div><h3>Reglas inteligentes</h3><p>Cuando ocurra X → NEXUS PRO hace Y automáticamente</p></div></div><button class="nxWaRulesX" aria-label="Cerrar">×</button></div><div class="nxWaRulesBody" id="nxWaRulesBody"><div class="nxWaRulesLoading">Cargando reglas…</div></div></div>`;
    o.addEventListener('click',e=>{if(e.target===o)close()});$('.nxWaRulesX',o).addEventListener('click',close);(document.body||document.documentElement).appendChild(o);
    try{await Promise.all([cargarReglas(),cargarPlantillas()]);renderLista()}catch(e){$('#nxWaRulesBody').innerHTML=`<div class="nxWaRulesLoading">No se pudieron cargar las reglas.<br>${esc(e?.message||e)}</div>`}
  }
  window.nxWaAbrirReglasInteligentes=abrir;

  async function cargarReglas(){
    const r=await rpc('whatsapp_reglas_custom_listar',{});
    reglas=Array.isArray(r)?r:(r&&Array.isArray(r.data)?r.data:[]);
    return reglas;
  }

  function renderLista(){
    const b=$('#nxWaRulesBody');if(!b)return;
    b.innerHTML=`<div class="nxWaRulesToolbar"><div class="tx"><b>${reglas.length} regla${reglas.length===1?'':'s'} creada${reglas.length===1?'':'s'}</b><span>El motor revisa las reglas cada hora y evita repetir la misma acción accidentalmente.</span></div><button class="nxWaRuleBtn primary" id="nxWaRuleNew"><i class="ti ti-plus"></i> Nueva regla</button></div>
      <div class="nxWaRulesList">${reglas.length?reglas.map(card).join(''):`<div class="nxWaRuleEmpty"><i class="ti ti-route-off"></i><b>Todavía no hay reglas inteligentes</b><span>Crea la primera sin tocar código. Antes de activarla verás cuántos clientes coinciden.</span></div>`}</div>
      <div style="margin-top:12px"><button class="nxWaRuleBtn ghost" id="nxWaRuleBack"><i class="ti ti-arrow-left"></i> Automatizaciones</button></div>`;
    $('#nxWaRuleNew')?.addEventListener('click',()=>editor(null));
    $('#nxWaRuleBack')?.addEventListener('click',()=>{close();if(typeof window.nxWaAbrirAutomatizaciones==='function')window.nxWaAbrirAutomatizaciones()});
    $$('.nxWaRuleEdit',b).forEach(x=>x.addEventListener('click',()=>editor(reglas.find(r=>String(r.id)===x.dataset.id))));
    $$('.nxWaRuleToggle',b).forEach(x=>x.addEventListener('click',()=>toggle(x.dataset.id)));
    $$('.nxWaRuleDelete',b).forEach(x=>x.addEventListener('click',()=>eliminar(x.dataset.id)));
  }
  function card(r){const t=TRIGGERS[r.trigger_tipo]||{icon:'ti-bolt',name:r.trigger_tipo,desc:''};return `<div class="nxWaRuleCard"><div class="nxWaRuleCardTop"><div class="nxWaRuleIcon"><i class="ti ${esc(t.icon)}"></i></div><div class="nxWaRuleCardMain"><b>${esc(r.nombre)}</b><p>${esc(t.desc)}</p></div><span class="nxWaRuleState ${r.activo?'':'off'}">${r.activo?'Activa':'Pausada'}</span></div><div class="nxWaRuleFlow"><span class="nxWaRulePill">${esc(triggerLabel(r))}</span><i class="ti ti-arrow-right nxWaRuleArrow"></i><span class="nxWaRulePill">${esc(actionLabel(r))}</span>${Number(r.repetir_dias)>0?`<span class="nxWaRulePill">Repetir cada ${Number(r.repetir_dias)} d</span>`:'<span class="nxWaRulePill">Una vez por condición</span>'}</div><div class="nxWaRuleMeta"><div class="nxWaRuleLast">Última ejecución: <b>${esc(fmtDate(r.ultimo_en))}</b>${r.ultimo_estado?` · ${esc(r.ultimo_estado)}`:''}</div><div class="nxWaRuleCardActs"><button class="nxWaRuleBtn ghost nxWaRuleToggle" data-id="${esc(r.id)}">${r.activo?'Pausar':'Activar'}</button><button class="nxWaRuleBtn ghost nxWaRuleEdit" data-id="${esc(r.id)}"><i class="ti ti-pencil"></i></button><button class="nxWaRuleBtn danger nxWaRuleDelete" data-id="${esc(r.id)}"><i class="ti ti-trash"></i></button></div></div></div>`}

  async function toggle(id){
    const r=reglas.find(x=>String(x.id)===String(id));if(!r)return;
    try{await guardarRpc({...r,activo:!r.activo});await cargarReglas();renderLista();toastSafe('ok','Automatización',!r.activo?'Regla activada.':'Regla pausada.')}catch(e){toastSafe('err','No se pudo cambiar',String(e?.message||e))}
  }
  async function eliminar(id){
    const r=reglas.find(x=>String(x.id)===String(id));if(!r)return;
    if(!window.confirm(`Eliminar la regla “${r.nombre}”?`))return;
    try{await rpc('whatsapp_reglas_custom_eliminar',{p_id:id});await cargarReglas();renderLista();toastSafe('ok','Regla eliminada','')}catch(e){toastSafe('err','No se pudo eliminar',String(e?.message||e))}
  }
  async function guardarRpc(r){
    return rpc('whatsapp_reglas_custom_guardar',{p_id:r.id||null,p_nombre:r.nombre,p_activo:r.activo!==false,p_trigger_tipo:r.trigger_tipo,p_trigger_dias:Number(r.trigger_dias)||0,p_accion_tipo:r.accion_tipo,p_accion_config:r.accion_config||{},p_repetir_dias:Number(r.repetir_dias)||0});
  }

  function editor(r){
    editing=r?JSON.parse(JSON.stringify(r)):null;previewSig='';previewData=null;
    const t0=r?.trigger_tipo||'documentos_pendientes';const tm=TRIGGERS[t0];
    const b=$('#nxWaRulesBody');if(!b)return;
    b.innerHTML=`<div class="nxWaRuleForm">
      <div class="nxWaRuleSection"><div class="nxWaRuleSectionHead"><span class="nxWaRuleStep">1</span><b>¿Cuándo debe actuar?</b></div><div class="nxWaRuleGrid"><div class="nxWaRuleField"><label>Disparador</label><select id="nxWaRuleTrigger" class="nxWaRuleSelect">${Object.entries(TRIGGERS).map(([k,v])=>`<option value="${k}" ${k===t0?'selected':''}>${esc(v.name)}</option>`).join('')}</select><div class="nxWaRuleHelp" id="nxWaRuleTriggerHelp">${esc(tm.desc)}</div></div><div class="nxWaRuleField"><label id="nxWaRuleDaysLabel">${esc(tm.days)}</label><input id="nxWaRuleDays" class="nxWaRuleInput" type="number" min="0" max="365" value="${Number(r?.trigger_dias??tm.def)}"></div></div></div>
      <div class="nxWaRuleSection"><div class="nxWaRuleSectionHead"><span class="nxWaRuleStep">2</span><b>¿Qué debe hacer NEXUS PRO?</b></div><div class="nxWaRuleGrid"><div class="nxWaRuleField"><label>Acción</label><select id="nxWaRuleAction" class="nxWaRuleSelect"><option value="crear_tarea" ${r?.accion_tipo==='whatsapp_plantilla'?'':'selected'}>Crear una tarea de seguimiento</option><option value="whatsapp_plantilla" ${r?.accion_tipo==='whatsapp_plantilla'?'selected':''}>Enviar plantilla de WhatsApp aprobada</option></select></div><div class="nxWaRuleField"><label>Repetición</label><select id="nxWaRuleRepeat" class="nxWaRuleSelect"><option value="0">Solo una vez por condición</option>${[1,2,3,5,7,10,15,30].map(n=>`<option value="${n}" ${Number(r?.repetir_dias)===n?'selected':''}>Repetir cada ${n} día${n===1?'':'s'} si sigue cumpliendo</option>`).join('')}</select></div></div><div id="nxWaRuleActionFields" class="nxWaRuleActionBox"></div></div>
      <div class="nxWaRuleSection"><div class="nxWaRuleSectionHead"><span class="nxWaRuleStep">3</span><b>Nombre y alcance</b></div><div class="nxWaRuleField"><label>Nombre de esta automatización</label><input id="nxWaRuleName" class="nxWaRuleInput" maxlength="100" value="${esc(r?.nombre||tm.title)}"></div><div id="nxWaRulePreviewBox" style="margin-top:10px"></div></div>
      <div class="nxWaRuleFooter"><button class="nxWaRuleBtn ghost" id="nxWaRuleCancel"><i class="ti ti-arrow-left"></i> Volver</button><div class="right"><button class="nxWaRuleBtn ghost" id="nxWaRulePreview"><i class="ti ti-users"></i> Revisar alcance</button><button class="nxWaRuleBtn primary" id="nxWaRuleSave"><i class="ti ti-device-floppy"></i> Guardar regla</button></div></div>
    </div>`;
    $('#nxWaRuleCancel').addEventListener('click',renderLista);$('#nxWaRuleTrigger').addEventListener('change',triggerChanged);$('#nxWaRuleAction').addEventListener('change',()=>{previewSig='';renderActionFields(r)});$('#nxWaRuleDays').addEventListener('input',()=>{previewSig='';previewData=null;renderPreview()});$('#nxWaRuleName').addEventListener('input',()=>{});$('#nxWaRuleRepeat').addEventListener('change',()=>{});$('#nxWaRulePreview').addEventListener('click',previsualizar);$('#nxWaRuleSave').addEventListener('click',guardarDesdeEditor);
    renderActionFields(r);
  }
  function triggerChanged(){const k=$('#nxWaRuleTrigger').value,t=TRIGGERS[k];$('#nxWaRuleTriggerHelp').textContent=t.desc;$('#nxWaRuleDaysLabel').textContent=t.days;$('#nxWaRuleDays').value=t.def;const n=$('#nxWaRuleName');if(!editing&&n)n.value=t.title;previewSig='';previewData=null;renderPreview();renderActionFields(editing)}

  function renderActionFields(r){
    const box=$('#nxWaRuleActionFields');if(!box)return;const action=$('#nxWaRuleAction').value;const cfg=(r?.accion_config)||{};
    if(action==='crear_tarea'){
      const trig=TRIGGERS[$('#nxWaRuleTrigger').value];box.innerHTML=`<div class="nxWaRuleGrid"><div class="nxWaRuleField"><label>Título de la tarea</label><input id="nxWaRuleTaskTitle" class="nxWaRuleInput" value="${esc(cfg.titulo||trig.title)}"></div><div class="nxWaRuleField"><label>Prioridad</label><select id="nxWaRuleTaskPriority" class="nxWaRuleSelect">${['baja','media','alta','urgente'].map(x=>`<option value="${x}" ${(cfg.prioridad||'media')===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></div><div class="nxWaRuleField"><label>Vence en</label><select id="nxWaRuleTaskDue" class="nxWaRuleSelect">${[0,1,2,3,5,7].map(n=>`<option value="${n}" ${Number(cfg.vence_dias??1)===n?'selected':''}>${n===0?'Hoy':n+' día'+(n===1?'':'s')}</option>`).join('')}</select></div><div class="nxWaRuleField"><label>Asignar</label><select id="nxWaRuleTaskAssign" class="nxWaRuleSelect"><option value="agente_cliente" ${cfg.asignar==='ninguno'?'':'selected'}>Al agente del cliente</option><option value="ninguno" ${cfg.asignar==='ninguno'?'selected':''}>Sin asignar</option></select></div></div><div class="nxWaRuleHelp">La tarea queda en el CRM. No envía ningún mensaje al cliente.</div>`;return;
    }
    const approved=plantillas;const selName=cfg.template_name||approved[0]?.name||'';const sel=tplByName(selName,cfg.template_language||'es');
    box.innerHTML=`<div class="nxWaRuleField"><label>Plantilla aprobada por Meta</label><select id="nxWaRuleTpl" class="nxWaRuleSelect">${approved.length?approved.map(t=>`<option value="${esc(t.name)}|${esc(tplLang(t))}" ${t.name===selName?'selected':''}>${esc(t.name)} · ${esc(tplLang(t))}</option>`).join(''):'<option value="">No hay plantillas aprobadas disponibles</option>'}</select></div><div id="nxWaRuleTplParams"></div><div class="nxWaRuleHelp">La regla nunca enviará una plantilla pendiente o rechazada y respeta el opt-out del cliente.</div>`;
    $('#nxWaRuleTpl')?.addEventListener('change',()=>renderTplParams(null));renderTplParams(cfg.param_keys||null);
  }
  function renderTplParams(saved){
    const host=$('#nxWaRuleTplParams');if(!host)return;const val=$('#nxWaRuleTpl')?.value||'';const [name,lang]=val.split('|');const t=tplByName(name,lang);if(!t){host.innerHTML='';return}const text=bodyText(t),count=varCount(text),trigger=$('#nxWaRuleTrigger').value,opts=[...MAP_BASE,...(MAP_CTX[trigger]||[])];const savedArr=Array.isArray(saved)?saved:[];
    host.innerHTML=`<div class="nxWaRuleTplPreview">${esc(text||'Plantilla sin texto de cuerpo')}</div>${count?`<div class="nxWaRuleParams">${Array.from({length:count},(_,i)=>`<div class="nxWaRuleParam"><b>{{${i+1}}}</b><select class="nxWaRuleSelect nxWaRuleParamSelect" data-i="${i}">${opts.map(([k,l])=>`<option value="${esc(k)}" ${(savedArr[i]||'cliente.nombre')===k?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`).join('')}</div>`:'<div class="nxWaRuleHelp">Esta plantilla no tiene variables.</div>'}`;
  }
  function collect(){
    const trigger=$('#nxWaRuleTrigger').value,days=Math.max(0,Math.min(365,Number($('#nxWaRuleDays').value)||0)),action=$('#nxWaRuleAction').value,name=($('#nxWaRuleName').value||'').trim(),repeat=Number($('#nxWaRuleRepeat').value)||0;let cfg={};
    if(action==='crear_tarea')cfg={titulo:($('#nxWaRuleTaskTitle')?.value||TRIGGERS[trigger].title).trim(),prioridad:$('#nxWaRuleTaskPriority')?.value||'media',vence_dias:Number($('#nxWaRuleTaskDue')?.value)||0,asignar:$('#nxWaRuleTaskAssign')?.value||'agente_cliente'};
    else{const raw=$('#nxWaRuleTpl')?.value||'',parts=raw.split('|');cfg={template_name:parts[0]||'',template_language:parts[1]||'es',param_keys:$$('.nxWaRuleParamSelect').map(x=>x.value)}}
    return {id:editing?.id||null,nombre:name,activo:editing?editing.activo!==false:true,trigger_tipo:trigger,trigger_dias:days,accion_tipo:action,accion_config:cfg,repetir_dias:repeat};
  }
  function signature(r){return r.trigger_tipo+'|'+r.trigger_dias}
  async function previsualizar(){
    const r=collect(),btn=$('#nxWaRulePreview');if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Revisando…'}
    try{const d=await rpc('whatsapp_reglas_custom_previsualizar',{p_trigger_tipo:r.trigger_tipo,p_dias:r.trigger_dias});previewData=d||{total:0,muestra:[]};previewSig=signature(r);renderPreview();const s=$('#nxWaRuleSave');if(s)s.innerHTML='<i class="ti ti-device-floppy"></i> Confirmar y guardar'}catch(e){toastSafe('err','No se pudo revisar',String(e?.message||e))}finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-users"></i> Revisar alcance'}}
  }
  function renderPreview(){const h=$('#nxWaRulePreviewBox');if(!h)return;if(!previewData||previewSig!==signature(collect())){h.innerHTML='<div class="nxWaRuleHelp">Antes de guardar, NEXUS PRO te mostrará cuántos clientes cumplen esta condición ahora mismo.</div>';return}const total=Number(previewData.total)||0,s=Array.isArray(previewData.muestra)?previewData.muestra:[];h.innerHTML=`<div class="nxWaRulePreview"><b>Clientes que coinciden ahora</b><div class="big">${total}</div><div class="nxWaRuleHelp">Esta es una vista previa; la regla volverá a evaluar la cartera automáticamente cada hora.</div>${s.length?`<div class="nxWaRuleSamples">${s.map(x=>`<span class="nxWaRuleSample">${esc(x.nombre||'Cliente')}</span>`).join('')}</div>`:''}</div>`}
  async function guardarDesdeEditor(){
    const r=collect();if(!r.nombre){toastSafe('warn','Falta el nombre','Ponle un nombre a la automatización.');return}if(r.accion_tipo==='whatsapp_plantilla'&&!r.accion_config.template_name){toastSafe('warn','Falta la plantilla','Selecciona una plantilla aprobada por Meta.');return}
    if(previewSig!==signature(r)){await previsualizar();return}
    const btn=$('#nxWaRuleSave');if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2"></i> Guardando…'}
    try{await guardarRpc(r);await cargarReglas();renderLista();toastSafe('ok','Automatización guardada','NEXUS PRO la evaluará automáticamente.')}catch(e){toastSafe('err','No se pudo guardar',String(e?.message||e));if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-device-floppy"></i> Confirmar y guardar'}}
  }

  function inject(){
    css();const acts=$('#nxWaAutoOverlay .nxWaAutoActions');if(!acts||$('.nxWaRulesEntry',acts))return;
    const b=document.createElement('button');b.className='nxWaAutoAct ghost nxWaRulesEntry';b.type='button';b.innerHTML='<i class="ti ti-route"></i> Reglas inteligentes';b.addEventListener('click',abrir);acts.prepend(b);
  }
  inject();let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;inject()})}).observe(document.documentElement,{childList:true,subtree:true});
})();
