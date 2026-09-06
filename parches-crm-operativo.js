/* NEXUS PRO · CRM Operativo · tareas y actividad */
(function(){
'use strict';
if(window.__nxCrmOperativo20260906)return;
window.__nxCrmOperativo20260906=1;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=()=>{try{return window.API||API}catch(e){return null}};
const clientes=()=>{try{return (window.ST||ST||{}).clientes||[]}catch(e){return[]}};
const ago=v=>{if(!v)return 'Sin fecha';const d=new Date(v),n=Date.now()-d.getTime(),days=Math.floor(n/86400000);return days<=0?'Hoy':days===1?'Ayer':'hace '+days+' días'};
let tareas=[];

function css(){
 if($('#nxCrmOpsCss'))return;
 const s=document.createElement('style');s.id='nxCrmOpsCss';s.textContent=`
 #v-crm .nxOpsPanel{margin-top:12px}.nxOpsHead{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:9px}.nxOpsHead h3{font-size:12px;margin:0}.nxOpsFilter{font-size:8px;color:#64748b}.nxOpsRows{display:flex;flex-direction:column;gap:6px}.nxOpsTask{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;border:1px solid var(--crm-line,#e5eaf2);border-radius:11px;padding:9px}.nxOpsTask.is-overdue{border-left:3px solid #dc2626}.nxOpsCheck{width:22px;height:22px;border-radius:7px;border:1px solid #cbd5e1;background:white;color:#fff;cursor:pointer}.nxOpsTask b{font-size:10px;display:block}.nxOpsTask span{font-size:8.5px;color:#64748b;display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxOpsDue{font-size:8px;font-weight:800;color:#475569;text-align:right}.nxOpsDue.bad{color:#dc2626}.nxOpsEmpty{font-size:9px;color:#64748b;padding:16px;text-align:center;border:1px dashed #dbe3ee;border-radius:10px}
 .nxOpsModal{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.4);display:grid;place-items:center;padding:16px}.nxOpsDialog{width:min(480px,100%);max-height:min(710px,calc(100dvh - 32px));overflow:auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 24px 70px rgba(15,23,42,.28);padding:16px}.nxOpsDialog h2{font-size:16px;margin:0}.nxOpsDialog p{font-size:9px;color:#64748b;margin:4px 0 13px}.nxOpsGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nxOpsField{display:block}.nxOpsField.full{grid-column:1/-1}.nxOpsField label{font-size:8px;font-weight:800;color:#475569;display:block;margin:0 0 4px}.nxOpsField input,.nxOpsField select,.nxOpsField textarea{font:inherit;font-size:11px;width:100%;box-sizing:border-box;border:1px solid #dbe3ee;border-radius:9px;padding:8px;outline:none;background:#fff}.nxOpsField textarea{resize:vertical;min-height:64px}.nxOpsFoot{display:flex;justify-content:flex-end;gap:7px;margin-top:14px}.nxOpsFoot button{height:34px;border-radius:9px;padding:0 12px;border:1px solid #dbe3ee;background:#fff;font:inherit;font-size:9px;font-weight:800;cursor:pointer}.nxOpsFoot .primary{background:#2563eb;border-color:#2563eb;color:#fff}
 @media(max-width:520px){.nxOpsGrid{grid-template-columns:1fr}.nxOpsField.full{grid-column:auto}.nxOpsDialog{padding:14px}}
 `;document.head.appendChild(s);
}
function dueClass(t){return t.vence_en&&new Date(t.vence_en).getTime()<Date.now()?'bad':''}
function taskHtml(t){
 const c=clientes().find(x=>String(x.id)===String(t.cliente_id));const due=t.vence_en?new Date(t.vence_en).toLocaleDateString('es-DO',{day:'2-digit',month:'short'}):'Sin fecha';
 return '<div class="nxOpsTask '+(dueClass(t)?'is-overdue':'')+'"><button class="nxOpsCheck" title="Completar" onclick="nxCrmCompletarTarea(\''+esc(t.id)+'\')"><i class="ti ti-check"></i></button><div><b>'+esc(t.titulo)+'</b><span>'+esc(c?.nom||'Cliente')+' · '+esc(t.tipo||'seguimiento')+'</span></div><div class="nxOpsDue '+dueClass(t)+'">'+due+'</div></div>';
}
async function cargar(){
 const A=api();if(!A?.get)return;
 try{tareas=await A.get('crm_tareas','estado=eq.pendiente&order=vence_en.asc.nullslast,created_at.asc&limit=8&select=*')||[];pintar();}
 catch(e){console.error('[CRM] tareas',e);pintar('No se pudieron cargar las tareas.');}
}
function pintar(err){
 const host=$('#nxCrmOps');if(!host)return;
 host.innerHTML='<section class="nxCrmPanel nxOpsPanel"><div class="nxOpsHead"><div><h3>Agenda de seguimiento</h3><div class="nxOpsFilter">Tareas pendientes de toda la cartera</div></div><button class="nxCrmLink" onclick="nxCrmNuevaTarea()">+ Nueva tarea</button></div><div class="nxOpsRows">'+(err?'<div class="nxOpsEmpty">'+esc(err)+'</div>':tareas.length?tareas.map(taskHtml).join(''):'<div class="nxOpsEmpty">No hay seguimientos pendientes. La cartera está al día.</div>')+'</div></section>';
}
function ensure(){
 css();const cols=$('#v-crm .nxCrmCols');if(!cols)return false;
 if(!$('#nxCrmOps')){const h=document.createElement('div');h.id='nxCrmOps';cols.parentNode.insertBefore(h,cols.nextSibling);}
 cargar();return true;
}
function optionClientes(){return clientes().filter(c=>c.activo!==false).sort((a,b)=>String(a.nom).localeCompare(String(b.nom))).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nom)+'</option>').join('')}
function modal(){
 $('#nxOpsModal')?.remove();
 const m=document.createElement('div');m.id='nxOpsModal';m.className='nxOpsModal';m.innerHTML='<div class="nxOpsDialog" role="dialog" aria-modal="true" aria-labelledby="nxOpsTitle"><h2 id="nxOpsTitle">Nueva tarea de seguimiento</h2><p>Se registrará en la ficha del cliente y aparecerá en la agenda del CRM.</p><div class="nxOpsGrid"><div class="nxOpsField full"><label>Cliente</label><select id="nxOpsCliente"><option value="">Selecciona un cliente…</option>'+optionClientes()+'</select></div><div class="nxOpsField full"><label>Tarea</label><input id="nxOpsTitulo" maxlength="160" placeholder="Ej.: Confirmar documentos de afiliación"></div><div class="nxOpsField"><label>Tipo</label><select id="nxOpsTipo"><option value="seguimiento">Seguimiento</option><option value="documento">Documento</option><option value="renovacion">Renovación</option><option value="cobro">Cobro</option><option value="afiliacion">Afiliación</option><option value="otro">Otro</option></select></div><div class="nxOpsField"><label>Prioridad</label><select id="nxOpsPrioridad"><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option><option value="baja">Baja</option></select></div><div class="nxOpsField full"><label>Fecha de seguimiento</label><input id="nxOpsVence" type="datetime-local"></div><div class="nxOpsField full"><label>Nota (opcional)</label><textarea id="nxOpsNota" maxlength="1500" placeholder="Qué debe resolverse o verificarse"></textarea></div></div><div class="nxOpsFoot"><button onclick="nxCrmCerrarTarea()">Cancelar</button><button class="primary" id="nxOpsGuardar" onclick="nxCrmGuardarTarea()">Guardar tarea</button></div></div>';m.addEventListener('click',e=>{if(e.target===m)window.nxCrmCerrarTarea()});document.body.appendChild(m);setTimeout(()=>$('#nxOpsCliente')?.focus(),0);
}
window.nxCrmNuevaTarea=modal;
window.nxCrmCerrarTarea=()=>$('#nxOpsModal')?.remove();
window.nxCrmGuardarTarea=async()=>{
 const A=api(),cliente_id=$('#nxOpsCliente')?.value,titulo=$('#nxOpsTitulo')?.value.trim(),tipo=$('#nxOpsTipo')?.value,prioridad=$('#nxOpsPrioridad')?.value,vence=$('#nxOpsVence')?.value,nota=$('#nxOpsNota')?.value.trim();
 if(!cliente_id||!titulo){try{toast('warn','Completa cliente y tarea')}catch(e){};return}
 const b=$('#nxOpsGuardar');b.disabled=true;b.textContent='Guardando…';
 try{
  const r=await A.post('crm_tareas',{cliente_id,titulo,tipo,prioridad,vence_en:vence?new Date(vence).toISOString():null});
  await A.post('crm_actividades',{cliente_id,tipo:'nota',titulo:'Tarea creada: '+titulo,detalle:nota||null,proxima_accion_en:vence?new Date(vence).toISOString():null});
  window.nxCrmCerrarTarea();await cargar();try{logAudit('CRM_TAREA_CREADA',titulo,'CRM',cliente_id);toast('ok','Tarea creada',titulo)}catch(e){}
 }catch(e){console.error(e);try{toast('err','No se pudo guardar',e.message)}catch(x){};b.disabled=false;b.textContent='Guardar tarea';}
};
window.nxCrmCompletarTarea=async id=>{
 const A=api(),t=tareas.find(x=>String(x.id)===String(id));if(!t)return;
 try{await A.patch('crm_tareas','id=eq.'+encodeURIComponent(id),{estado:'completada',completada_en:new Date().toISOString(),updated_at:new Date().toISOString()});await A.post('crm_actividades',{cliente_id:t.cliente_id,tipo:'nota',titulo:'Tarea completada: '+t.titulo});await cargar();try{toast('ok','Tarea completada')}catch(e){}}
 catch(e){try{toast('err','No se pudo completar',e.message)}catch(x){}}
};

function seguimientoHtml(acts,ts){
 const actRows=acts.length?acts.map(a=>'<div class="nxOpsTask"><div class="nxCrmAv"><i class="ti ti-'+({llamada:'phone',whatsapp:'brand-whatsapp',renovacion:'refresh',documento:'file-description',cobro:'cash'}[a.tipo]||'notes')+'"></i></div><div><b>'+esc(a.titulo)+'</b><span>'+esc(a.detalle||a.resultado||a.tipo)+' · '+ago(a.created_at)+'</span></div></div>').join(''):'<div class="nxOpsEmpty">Aún no hay actividad registrada para este cliente.</div>';
 const taskRows=ts.length?ts.map(taskHtml).join(''):'<div class="nxOpsEmpty">No tiene tareas pendientes.</div>';
 return '<div class="nxCrmGrid"><section class="nxCrmCard"><div class="nxOpsHead"><div><h3>Historial de seguimiento</h3><div class="nxOpsFilter">Llamadas, notas, documentos y acciones</div></div><button class="nxCrmLink" onclick="nxCrmNuevaActividadCliente()">+ Nota</button></div><div class="nxOpsRows">'+actRows+'</div></section><section class="nxCrmCard"><div class="nxOpsHead"><div><h3>Tareas abiertas</h3><div class="nxOpsFilter">Pendientes de resolver</div></div><button class="nxCrmLink" onclick="nxCrmNuevaTareaCliente()">+ Tarea</button></div><div class="nxOpsRows">'+taskRows+'</div></section></div>';
}
async function cargarSeguimientoCliente(id){
 const body=$('#c360TabBody'),A=api();if(!body||!A?.get)return;
 body.innerHTML='<div class="nxCrmEmpty">Cargando seguimiento…</div>';
 try{const rs=await Promise.all([A.get('crm_actividades','cliente_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=25&select=*'),A.get('crm_tareas','cliente_id=eq.'+encodeURIComponent(id)+'&estado=eq.pendiente&order=vence_en.asc.nullslast&select=*')]);tareas=rs[1]||[];body.innerHTML=seguimientoHtml(rs[0]||[],tareas);}
 catch(e){body.innerHTML='<div class="nxCrmEmpty">No se pudo cargar el seguimiento.</div>';console.error('[CRM] seguimiento',e)}
}
function patchFicha(){
 try{if(typeof pintarC360Tab==='function'&&!pintarC360Tab.__crmOps){const o=pintarC360Tab,n=function(){try{if(window.__nxCrmCtx&&typeof _c360Tab!=='undefined'&&_c360Tab==='actividad'&&typeof _c360Sel!=='undefined'&&_c360Sel){cargarSeguimientoCliente(_c360Sel);return;}}catch(e){}return o.apply(this,arguments)};n.__crmOps=1;pintarC360Tab=window.pintarC360Tab=n}}catch(e){console.error('[CRM] ficha',e)}
}
window.nxCrmNuevaTareaCliente=()=>{try{modal();const id=typeof _c360Sel!=='undefined'?_c360Sel:'';const f=$('#nxOpsCliente');if(f&&id)f.value=String(id)}catch(e){modal()}};
window.nxCrmNuevaActividadCliente=()=>{
 const id=typeof _c360Sel!=='undefined'?_c360Sel:'';if(!id)return;
 const title=prompt('Escribe la nota o resultado del seguimiento:');if(!title?.trim())return;
 const A=api();A.post('crm_actividades',{cliente_id:id,tipo:'nota',titulo:title.trim()}).then(()=>cargarSeguimientoCliente(id)).then(()=>{try{toast('ok','Nota agregada')}catch(e){}}).catch(e=>{try{toast('err','No se pudo guardar',e.message)}catch(x){}});
};
\nfunction start(){css();patchFicha();ensure();const obs=new MutationObserver(()=>{if($('#v-crm.on'))ensure()});obs.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();