/* NEXUS PRO · CRM Operativo · tareas y actividad */
(function(){
'use strict';
if(window.__nxCrmOperativo20260906)return;
window.__nxCrmOperativo20260906=1;
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=()=>{try{return window.API||API}catch(e){return null}};
const clientes=()=>{try{return (window.ST||ST||{}).clientes||[]}catch(e){return[]}};
const agentes=()=>{try{return ((window.ST||ST||{}).agentes||[]).filter(a=>a.activo!==false)}catch(e){return[]}};
const ago=v=>{if(!v)return 'Sin fecha';const d=new Date(v),n=Date.now()-d.getTime(),days=Math.floor(n/86400000);return days<=0?'Hoy':days===1?'Ayer':'hace '+days+' días'};
const title=v=>String(v??'').trim().slice(0,160);
const isoLocal=v=>{if(!v)return null;const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null};
// La RPC guarda actividad+tarea en una sola transaccion y conserva las validaciones de produccion.
async function registrarActividad(A,p){
 return await A.post('rpc/crm_registrar_actividad',{
  p_cliente_id:p.cliente_id,p_tipo:p.tipo,p_titulo:p.titulo,p_detalle:p.detalle||null,p_resultado:p.resultado||null,
  p_proxima_accion_en:p.proxima_accion_en||null,p_crear_tarea:!!p.crear_tarea,p_tarea_titulo:p.tarea_titulo||null,
  p_tarea_tipo:p.tarea_tipo||'seguimiento',p_prioridad:p.prioridad||'media',p_asignado_agente_id:p.asignado_agente_id||null
 });
}
let agendaTareas=[], fichaTareas=[];
let cargaAgenda=null, fichaPeticion=0, guardandoTarea=false, guardandoActividad=false;
const completandoTareas=new Set();

function css(){
 if($('#nxCrmOpsCss'))return;
 const s=document.createElement('style');s.id='nxCrmOpsCss';s.textContent=`
 #v-crm .nxOpsPanel{margin-top:12px}.nxOpsHead{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:10px}.nxOpsHead h3{font-size:12px;margin:0;font-weight:900}.nxOpsFilter{font-size:8px;color:#64748b;margin-top:2px}.nxOpsRows{display:flex;flex-direction:column;gap:7px}.nxOpsTask{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid rgba(226,232,240,.92);border-radius:13px;padding:10px;background:rgba(255,255,255,.72);box-shadow:0 11px 24px -25px rgba(15,23,42,.62);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}.nxOpsTask:hover{transform:translateX(2px);border-color:rgba(37,99,235,.22);background:rgba(255,255,255,.92);box-shadow:0 14px 28px -25px rgba(15,23,42,.7)}.nxOpsTask.is-overdue{border-left:4px solid var(--crm-danger,#dc2626);background:linear-gradient(90deg,rgba(254,242,242,.9),rgba(255,255,255,.78))}.nxOpsCheck{width:25px;height:25px;border-radius:9px;border:1px solid rgba(203,213,225,.95);background:linear-gradient(180deg,#fff,#f8fafc);color:#94a3b8;cursor:pointer;display:grid;place-items:center}.nxOpsCheck:hover{background:linear-gradient(135deg,#2563eb,#7c3aed);border-color:transparent;color:#fff}.nxOpsTask b{font-size:10px;display:block;font-weight:900}.nxOpsTask span{font-size:8.5px;color:#64748b;display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxOpsDue{font-size:8px;font-weight:900;color:#475569;text-align:right;border-radius:999px;background:#f8fafc;border:1px solid #eef2f7;padding:5px 7px;white-space:nowrap}.nxOpsDue.bad{color:#dc2626;background:#fff1f2;border-color:#ffe4e6}.nxOpsEmpty{font-size:9px;color:#64748b;padding:18px;text-align:center;border:1px dashed rgba(148,163,184,.62);border-radius:12px;background:rgba(248,250,252,.62)}
 .nxOpsModal{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.46);display:grid;place-items:center;padding:16px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}.nxOpsDialog{width:min(500px,100%);max-height:min(720px,calc(100dvh - 32px));overflow:auto;background:rgba(255,255,255,.96);border:1px solid rgba(255,255,255,.82);border-radius:18px;box-shadow:0 30px 80px rgba(15,23,42,.3);padding:17px}.nxOpsDialog h2{font-size:16px;margin:0;font-weight:900}.nxOpsDialog p{font-size:9px;color:#64748b;margin:5px 0 14px}.nxOpsGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.nxOpsField{display:block}.nxOpsField.full{grid-column:1/-1}.nxOpsField label{font-size:8px;font-weight:900;color:#475569;display:block;margin:0 0 5px}.nxOpsField input,.nxOpsField select,.nxOpsField textarea{font:inherit;font-size:11px;width:100%;box-sizing:border-box;border:1px solid #dbe3ee;border-radius:11px;padding:9px 10px;outline:none;background:#fff;transition:border-color .16s ease,box-shadow .16s ease}.nxOpsField input:focus,.nxOpsField select:focus,.nxOpsField textarea:focus{border-color:rgba(37,99,235,.55);box-shadow:0 0 0 4px rgba(37,99,235,.1)}.nxOpsField textarea{resize:vertical;min-height:72px}.nxOpsFoot{display:flex;justify-content:flex-end;gap:7px;margin-top:15px}.nxOpsFoot button{height:35px;border-radius:999px;padding:0 13px;border:1px solid #dbe3ee;background:#fff;font:inherit;font-size:9px;font-weight:900;cursor:pointer}.nxOpsFoot .primary{background:linear-gradient(135deg,#2563eb,#7c3aed);border-color:transparent;color:#fff}
 @media(max-width:520px){.nxOpsGrid{grid-template-columns:1fr}.nxOpsField.full{grid-column:auto}.nxOpsDialog{padding:14px;border-radius:16px}.nxOpsFoot{position:sticky;bottom:-14px;background:linear-gradient(180deg,rgba(255,255,255,.1),#fff 35%);padding-top:10px}.nxOpsFoot button{flex:1}.nxOpsTask{grid-template-columns:auto minmax(0,1fr);align-items:start}.nxOpsDue{grid-column:2;justify-self:start}}
 `;document.head.appendChild(s);
}
function dueClass(t){return t.vence_en&&new Date(t.vence_en).getTime()<Date.now()?'bad':''}
function taskHtml(t){
 const c=clientes().find(x=>String(x.id)===String(t.cliente_id));const due=t.vence_en?new Date(t.vence_en).toLocaleDateString('es-DO',{day:'2-digit',month:'short'}):'Sin fecha';const ag=agentes().find(a=>String(a.id)===String(t.asignado_agente_id));
 return '<div class="nxOpsTask '+(dueClass(t)?'is-overdue':'')+'"><button class="nxOpsCheck" title="Completar" onclick="nxCrmCompletarTarea(\''+esc(t.id)+'\')"><i class="ti ti-check"></i></button><div><b>'+esc(t.titulo)+'</b><span>'+esc(c?.nom||'Cliente')+' · '+esc(t.tipo||'seguimiento')+(ag?' · '+esc(ag.nom):'')+'</span></div><div class="nxOpsDue '+dueClass(t)+'">'+due+'</div></div>';
}
async function cargar(){
 const A=api();if(!A?.get)return;
 if(cargaAgenda)return cargaAgenda;
 cargaAgenda=(async()=>{
  try{agendaTareas=await A.get('crm_tareas','estado=eq.pendiente&order=vence_en.asc.nullslast,created_at.asc&limit=8&select=*')||[];pintar();ensureControl();await cargarEquipo();}
  catch(e){console.error('[CRM] tareas',e);pintar('No se pudieron cargar las tareas.');}
 })();
 try{await cargaAgenda;}finally{cargaAgenda=null;}
}
function pintar(err){
 const host=$('#nxCrmOps');if(!host)return;
 host.innerHTML='<section class="nxCrmPanel nxOpsPanel"><div class="nxOpsHead"><div><h3>Agenda de seguimiento</h3><div class="nxOpsFilter">Tareas pendientes de toda la cartera</div></div><button class="nxCrmLink" onclick="nxCrmNuevaTarea()">+ Nueva tarea</button></div><div class="nxOpsRows">'+(err?'<div class="nxOpsEmpty">'+esc(err)+'</div>':agendaTareas.length?agendaTareas.map(taskHtml).join(''):'<div class="nxOpsEmpty">No hay seguimientos pendientes. La cartera está al día.</div>')+'</div></section>';
}
function ensure(){
 css();const cols=$('#v-crm .nxCrmCols');if(!cols)return false;
 if(!$('#nxCrmOps')){const h=document.createElement('div');h.id='nxCrmOps';cols.parentNode.insertBefore(h,cols.nextSibling);}
 cargar();return true;
}
function optionClientes(){return clientes().filter(c=>c.activo!==false).sort((a,b)=>String(a.nom).localeCompare(String(b.nom))).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.nom)+'</option>').join('')}
function optionAgentes(){return agentes().sort((a,b)=>String(a.nom).localeCompare(String(b.nom))).map(a=>'<option value="'+esc(a.id)+'">'+esc(a.nom)+'</option>').join('')}
function modal(){
 $('#nxOpsModal')?.remove();
 const m=document.createElement('div');m.id='nxOpsModal';m.className='nxOpsModal';m.innerHTML='<div class="nxOpsDialog" role="dialog" aria-modal="true" aria-labelledby="nxOpsTitle"><h2 id="nxOpsTitle">Nueva tarea de seguimiento</h2><p>Se registrará en la ficha del cliente y aparecerá en la agenda del CRM.</p><div class="nxOpsGrid"><div class="nxOpsField full"><label>Cliente</label><select id="nxOpsCliente"><option value="">Selecciona un cliente…</option>'+optionClientes()+'</select></div><div class="nxOpsField full"><label>Tarea</label><input id="nxOpsTitulo" maxlength="160" placeholder="Ej.: Confirmar documentos de afiliación"></div><div class="nxOpsField"><label>Tipo</label><select id="nxOpsTipo"><option value="seguimiento">Seguimiento</option><option value="documento">Documento</option><option value="renovacion">Renovación</option><option value="cobro">Cobro</option><option value="afiliacion">Afiliación</option><option value="otro">Otro</option></select></div><div class="nxOpsField"><label>Prioridad</label><select id="nxOpsPrioridad"><option value="media">Media</option><option value="alta">Alta</option><option value="urgente">Urgente</option><option value="baja">Baja</option></select></div><div class="nxOpsField"><label>Responsable</label><select id="nxOpsAgente"><option value="">Sin asignar</option>'+optionAgentes()+'</select></div><div class="nxOpsField full"><label>Fecha de seguimiento</label><input id="nxOpsVence" type="datetime-local"></div><div class="nxOpsField full"><label>Nota (opcional)</label><textarea id="nxOpsNota" maxlength="1500" placeholder="Qué debe resolverse o verificarse"></textarea></div></div><div class="nxOpsFoot"><button onclick="nxCrmCerrarTarea()">Cancelar</button><button class="primary" id="nxOpsGuardar" onclick="nxCrmGuardarTarea()">Guardar tarea</button></div></div>';m.addEventListener('click',e=>{if(e.target===m)window.nxCrmCerrarTarea()});document.body.appendChild(m);setTimeout(()=>$('#nxOpsCliente')?.focus(),0);
}
window.nxCrmNuevaTarea=modal;
window.nxCrmCerrarTarea=()=>$('#nxOpsModal')?.remove();
window.nxCrmGuardarTarea=async()=>{
 if(guardandoTarea)return;
 const A=api(),cliente_id=$('#nxOpsCliente')?.value,titulo=title($('#nxOpsTitulo')?.value),tipo=$('#nxOpsTipo')?.value,prioridad=$('#nxOpsPrioridad')?.value,asignado_agente_id=$('#nxOpsAgente')?.value||null,vence=$('#nxOpsVence')?.value,nota=$('#nxOpsNota')?.value.trim();
 if(!A?.post){try{toast('err','API no disponible')}catch(e){};return}
 if(!cliente_id||titulo.length<2){try{toast('warn','Completa cliente y tarea')}catch(e){};return}
 const venceIso=isoLocal(vence);if(vence&&!venceIso){try{toast('warn','Fecha de seguimiento inválida')}catch(e){};return}
 guardandoTarea=true;const b=$('#nxOpsGuardar');if(b){b.disabled=true;b.textContent='Guardando…';}
 try{
  await registrarActividad(A,{cliente_id,tipo:'nota',titulo:title('Tarea creada: '+titulo),detalle:nota||null,proxima_accion_en:venceIso,crear_tarea:true,tarea_titulo:titulo,tarea_tipo:tipo,prioridad,asignado_agente_id});
  guardandoTarea=false;window.nxCrmCerrarTarea();await cargar();try{if(typeof _c360Sel!=='undefined'&&String(_c360Sel)===String(cliente_id)&&typeof _c360Tab!=='undefined'&&_c360Tab==='actividad')await cargarSeguimientoCliente(cliente_id)}catch(e){}
  try{logAudit('CRM_TAREA_CREADA',titulo,'CRM',cliente_id);toast('ok','Tarea creada',titulo)}catch(e){}
 }catch(e){console.error(e);try{toast('err','No se pudo guardar',e.message)}catch(x){};guardandoTarea=false;if(b){b.disabled=false;b.textContent='Guardar tarea';}}
};
window.nxCrmCompletarTarea=async id=>{
 if(completandoTareas.has(String(id)))return;
 const A=api(),t=[...fichaTareas,...agendaTareas].find(x=>String(x.id)===String(id));if(!t||!A?.post)return;
 completandoTareas.add(String(id));
 try{await A.post('rpc/crm_completar_tarea',{p_tarea_id:id});await cargar();try{if(typeof _c360Sel!=='undefined'&&String(_c360Sel)===String(t.cliente_id)&&typeof _c360Tab!=='undefined'&&_c360Tab==='actividad')await cargarSeguimientoCliente(t.cliente_id)}catch(e){}try{toast('ok','Tarea completada')}catch(e){}}
 catch(e){try{toast('err','No se pudo completar',e.message)}catch(x){}}
 finally{completandoTareas.delete(String(id))}
};

function seguimientoHtml(acts,ts){
 const actRows=acts.length?acts.map(a=>'<div class="nxOpsTask"><div class="nxCrmAv"><i class="ti ti-'+({llamada:'phone',whatsapp:'brand-whatsapp',renovacion:'refresh',documento:'file-description',cobro:'cash'}[a.tipo]||'notes')+'"></i></div><div><b>'+esc(a.titulo)+'</b><span>'+esc(a.detalle||a.resultado||a.tipo)+' · '+ago(a.created_at)+'</span></div></div>').join(''):'<div class="nxOpsEmpty">Aún no hay actividad registrada para este cliente.</div>';
 const taskRows=ts.length?ts.map(taskHtml).join(''):'<div class="nxOpsEmpty">No tiene tareas pendientes.</div>';
 return '<div class="nxCrmGrid"><section class="nxCrmCard"><div class="nxOpsHead"><div><h3>Historial de seguimiento</h3><div class="nxOpsFilter">Llamadas, notas, documentos y acciones</div></div><button class="nxCrmLink" onclick="nxCrmNuevaActividadCliente()">+ Nota</button></div><div class="nxOpsRows">'+actRows+'</div></section><section class="nxCrmCard"><div class="nxOpsHead"><div><h3>Tareas abiertas</h3><div class="nxOpsFilter">Pendientes de resolver</div></div><button class="nxCrmLink" onclick="nxCrmNuevaTareaCliente()">+ Tarea</button></div><div class="nxOpsRows">'+taskRows+'</div></section></div>';
}
async function cargarSeguimientoCliente(id){
 const body=$('#c360TabBody'),A=api();if(!body||!A?.get)return;
 const request=++fichaPeticion;
 const vigente=()=>request===fichaPeticion&&typeof _c360Sel!=='undefined'&&String(_c360Sel)===String(id)&&typeof _c360Tab!=='undefined'&&_c360Tab==='actividad'&&$('#c360TabBody')===body;
 body.innerHTML='<div class="nxCrmEmpty">Cargando seguimiento…</div>';
 try{const rs=await Promise.all([A.get('crm_actividades','cliente_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=25&select=*'),A.get('crm_tareas','cliente_id=eq.'+encodeURIComponent(id)+'&estado=eq.pendiente&order=vence_en.asc.nullslast&select=*')]);if(!vigente())return;fichaTareas=rs[1]||[];body.innerHTML=seguimientoHtml(rs[0]||[],fichaTareas);}
 catch(e){if(vigente())body.innerHTML='<div class="nxCrmEmpty">No se pudo cargar el seguimiento.</div>';console.error('[CRM] seguimiento',e)}
}
function patchFicha(){
 try{if(typeof pintarC360Tab==='function'&&!pintarC360Tab.__crmOps){const o=pintarC360Tab,n=function(){try{if(window.__nxCrmCtx&&typeof _c360Tab!=='undefined'&&_c360Tab==='actividad'&&typeof _c360Sel!=='undefined'&&_c360Sel){cargarSeguimientoCliente(_c360Sel);return;}}catch(e){}return o.apply(this,arguments)};n.__crmOps=1;pintarC360Tab=window.pintarC360Tab=n}}catch(e){console.error('[CRM] ficha',e)}
}
window.nxCrmNuevaTareaCliente=()=>{try{modal();const id=typeof _c360Sel!=='undefined'?_c360Sel:'';const f=$('#nxOpsCliente');if(f&&id)f.value=String(id)}catch(e){modal()}};
function modalActividadCliente(){
 const id=typeof _c360Sel!=='undefined'?_c360Sel:'';if(!id)return;
 const c=clientes().find(x=>String(x.id)===String(id));$('#nxOpsModal')?.remove();
 const m=document.createElement('div');m.id='nxOpsModal';m.className='nxOpsModal';m.dataset.clienteId=String(id);
 m.innerHTML='<div class="nxOpsDialog" role="dialog" aria-modal="true" aria-labelledby="nxActTitle"><h2 id="nxActTitle">Registrar seguimiento</h2><p>'+esc(c?.nom||'Cliente')+' · queda guardado en su historial.</p><div class="nxOpsGrid"><div class="nxOpsField"><label>Canal</label><select id="nxActTipo"><option value="llamada">Llamada</option><option value="whatsapp">WhatsApp</option><option value="nota">Nota</option><option value="renovacion">Renovación</option><option value="documento">Documento</option><option value="cotizacion">Cotización</option></select></div><div class="nxOpsField"><label>Próximo seguimiento</label><input id="nxActProxima" type="datetime-local"></div><div class="nxOpsField full"><label>Resumen</label><input id="nxActTitulo" maxlength="160" placeholder="Ej.: Cliente confirmó envío de documentos"></div><div class="nxOpsField full"><label>Resultado / detalle</label><textarea id="nxActDetalle" maxlength="1500" placeholder="Qué se conversó, qué falta y qué se acordó"></textarea></div><div class="nxOpsField full"><label style="display:flex;gap:7px;align-items:center;font-size:9px"><input id="nxActCrearTarea" type="checkbox" style="width:auto"> Crear una tarea para el próximo seguimiento</label></div></div><div class="nxOpsFoot"><button onclick="nxCrmCerrarTarea()">Cancelar</button><button class="primary" id="nxActGuardar" onclick="nxCrmGuardarActividadCliente()">Guardar seguimiento</button></div></div>';
 m.addEventListener('click',e=>{if(e.target===m)window.nxCrmCerrarTarea()});document.body.appendChild(m);setTimeout(()=>$('#nxActTitulo')?.focus(),0);
}
window.nxCrmNuevaActividadCliente=modalActividadCliente;
window.nxCrmGuardarActividadCliente=async()=>{
 if(guardandoActividad)return;
 const id=$('#nxOpsModal')?.dataset?.clienteId||(typeof _c360Sel!=='undefined'?_c360Sel:''),A=api(),tipo=$('#nxActTipo')?.value,titulo=title($('#nxActTitulo')?.value),detalle=$('#nxActDetalle')?.value.trim(),proxima=$('#nxActProxima')?.value,crear=$('#nxActCrearTarea')?.checked;
 if(!A?.post){try{toast('err','API no disponible')}catch(e){};return}
 if(!id||titulo.length<2){try{toast('warn','Escribe el resumen del seguimiento')}catch(e){};return}
 const when=isoLocal(proxima);if(proxima&&!when){try{toast('warn','Próximo seguimiento inválido')}catch(e){};return}
 if(crear&&!when){try{toast('warn','Elige la fecha para crear la tarea')}catch(e){};return}
 guardandoActividad=true;const b=$('#nxActGuardar');if(b){b.disabled=true;b.textContent='Guardando…';}
 try{await registrarActividad(A,{cliente_id:id,tipo,titulo,detalle:detalle||null,proxima_accion_en:when,crear_tarea:crear&&!!when,tarea_titulo:title('Seguimiento: '+titulo),tarea_tipo:'seguimiento',prioridad:'media'});guardandoActividad=false;window.nxCrmCerrarTarea();try{if(typeof _c360Sel!=='undefined'&&String(_c360Sel)===String(id)&&typeof _c360Tab!=='undefined'&&_c360Tab==='actividad')await cargarSeguimientoCliente(id)}catch(e){}await cargar();try{logAudit('CRM_SEGUIMIENTO_REGISTRADO',titulo,'CRM',id);toast('ok','Seguimiento registrado')}catch(e){}}
 catch(e){try{toast('err','No se pudo guardar',e.message)}catch(x){};guardandoActividad=false;if(b){b.disabled=false;b.textContent='Guardar seguimiento';}}
};


function abrirClienteDesdeOps(id){try{window.nxCrmAbrirCliente(id)}catch(e){}}
function filaAtencion(c,reason,tag){
 return "<div class=\"nxOpsTask\" onclick=\"nxCrmAbrirCliente('"+esc(c.id)+"')\" style=\"cursor:pointer\"><div class=\"nxCrmAv\"><i class=\"ti ti-"+tag+"\"></i></div><div><b>"+esc(c.nom||'Cliente')+"</b><span>"+esc(reason)+"</span></div><div class=\"nxOpsDue\">Abrir</div></div>";
}
function controlOperativo(){
 const host=$('#nxCrmControl');if(!host)return;
 const all=clientes(),act=all.filter(c=>c.activo!==false),today=new Date().toISOString().slice(0,10);
 const proceso=all.filter(c=>c.estado_cliente==='EN_PROCESO').sort((a,b)=>String(a.fecha_seguimiento||'9999').localeCompare(String(b.fecha_seguimiento||'9999')));
 const sinArs=act.filter(c=>!String(c.ars||'').trim());
 const sinRen=act.filter(c=>!c.fecha_fin);
 const vencidos=agendaTareas.filter(t=>t.vence_en&&String(t.vence_en).slice(0,10)<today);
 const block=(title,count,rows,empty)=>'<section class="nxCrmPanel nxOpsPanel"><div class="nxOpsHead"><div><h3>'+title+'</h3><div class="nxOpsFilter">'+count+' requiere'+(count===1?'':'n')+' atención</div></div></div><div class="nxOpsRows">'+(rows.length?rows.slice(0,5).join(''):'<div class="nxOpsEmpty">'+empty+'</div>')+'</div></section>';
 const taskRows=vencidos.map(taskHtml);
 host.innerHTML='<div class="nxCrmCols"><div>'+block('Seguimientos vencidos',vencidos.length,taskRows,'No hay tareas vencidas.')+block('Clientes en proceso',proceso.length,proceso.map(c=>filaAtencion(c,(c.motivo_proceso||'Proceso pendiente')+(c.fecha_seguimiento?' · '+String(c.fecha_seguimiento).slice(0,10):''),'progress-check')),'No hay clientes en proceso.')+'</div><div>'+block('Datos por completar',sinArs.length,sinArs.map(c=>filaAtencion(c,'Falta asignar ARS','building-hospital')),'Todos tienen ARS asignada.')+block('Renovación por registrar',sinRen.length,sinRen.map(c=>filaAtencion(c,'Falta fecha de renovación','calendar-x')),'Todas las renovaciones tienen fecha.')+'</div></div>';
}
function ensureControl(){
 const ops=$('#nxCrmOps');if(!ops)return;
 if(!$('#nxCrmControl')){const h=document.createElement('div');h.id='nxCrmControl';ops.parentNode.insertBefore(h,ops.nextSibling);}
 controlOperativo();
}


function pintarEquipo(rows){
 const host=$('#nxCrmEquipo');if(!host)return;
 const hoy=new Date().toISOString().slice(0,10),ags=agentes(),map=new Map();
 rows.forEach(t=>{const k=t.asignado_agente_id||'_sin';if(!map.has(k))map.set(k,{pendientes:0,vencidas:0});const x=map.get(k);x.pendientes++;if(t.vence_en&&String(t.vence_en).slice(0,10)<hoy)x.vencidas++;});
 const items=[...map.entries()].sort((a,b)=>b[1].vencidas-a[1].vencidas||b[1].pendientes-a[1].pendientes);
 const cards=items.length?items.map(([id,x])=>{const a=ags.find(v=>String(v.id)===String(id));return '<div class="nxOpsTask"><div class="nxCrmAv">'+esc(a?.nom?.split(/\s+/).map(z=>z[0]).slice(0,2).join('').toUpperCase()||'—')+'</div><div><b>'+esc(a?.nom||'Sin asignar')+'</b><span>'+x.pendientes+' pendiente'+(x.pendientes===1?'':'s')+(x.vencidas?' · '+x.vencidas+' vencida'+(x.vencidas===1?'':'s'):'')+'</span></div><div class="nxOpsDue '+(x.vencidas?'bad':'')+'">'+(x.vencidas?'Atender':'Al día')+'</div></div>';}).join(''):'<div class="nxOpsEmpty">Aún no hay tareas asignadas.</div>';
 host.innerHTML='<section class="nxCrmPanel nxOpsPanel"><div class="nxOpsHead"><div><h3>Seguimiento por agente</h3><div class="nxOpsFilter">Carga pendiente de cada responsable</div></div></div><div class="nxOpsRows">'+cards+'</div></section>';
}
async function cargarEquipo(){
 const ops=$('#nxCrmControl'),A=api();if(!ops||!A?.get)return;
 if(!$('#nxCrmEquipo')){const h=document.createElement('div');h.id='nxCrmEquipo';ops.parentNode.insertBefore(h,ops.nextSibling);}
 try{pintarEquipo(await A.get('crm_tareas','estado=eq.pendiente&select=asignado_agente_id,vence_en')||[])}catch(e){console.error('[CRM] equipo',e)}
}

window.nxCrmActualizarAgenda=ensure;
function start(){css();patchFicha();if($('#v-crm.on'))ensure();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
