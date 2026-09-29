/* NEXUS PRO · CRM Seguros de Salud — módulo unificado (29-sep-2026, v58.86)
   Une en un solo archivo lo que hacían parches-crm-seguros.js (cabecera de Clientes + ficha 360 en
   modo CRM), parches-crm-entrada.js (vista #v-crm, menú #nxCrmNav, panel) y parches-crm-operativo.js
   (tareas, actividad, control operativo). Los tres archivos viejos quedan como shims vacíos para que
   la cadena de carga y cualquier referencia externa sigan funcionando.
   Estilos: parches-crm.css (misma cadena, se carga antes que este archivo).

   Qué corrige respecto a la versión anterior (auditoría 29-sep-2026):
   - La ficha CRM (historial + tareas del cliente) ahora abre de verdad en Cliente 360 (nxCrmAbrirCliente),
     con pintarC360Expediente envuelto y el contexto CRM reiniciado al navegar.
   - Errores del servidor nunca llegan crudos al usuario: errTxt() los traduce; el detalle va a consola.
   - «Seguimientos vencidos» se cuenta con una consulta propia (antes salía de una agenda limitada a 8).
   - Fechas con zona horaria de Santo Domingo (hoyISO/diaRD) y un solo criterio de «vencida».
   - Tras guardar o completar, la agenda se recarga fresca (antes reutilizaba una petición en vuelo).
   - Sin navegación por temporizadores; ayudantes duplicados fusionados; mesesAtraso con memoria por render.
   - open() fija #pttl, guarda el lugar (nxGuardarLugar), respeta el candado tienda/rifa/consultorio y
     escucha nexus:reinit (el menú no se filtra a organizaciones que no son de seguros).
   - Nuevo: tareas hechas/deshechas con «Deshacer», buscador de cliente en «Nueva tarea», filtro
     Mis tareas/Todas, búsqueda, botón Actualizar y la sección Prospectos (embudo nuevo → cotizado →
     documentos → emitida | perdida) sobre la tabla crm_prospectos (si la migración no está aplicada,
     la sección muestra «Pendiente de activar»).
   Sin cambios en dinero: balance/prima/pendTot/_saldoFacturasCliente se siguen leyendo del núcleo. */
(function(){
'use strict';
if(window.__nxCrm20260929)return;
window.__nxCrm20260929=1;
// Copias viejas en caché (Safari/CDN) de los tres archivos anteriores hacen `return` al ver sus banderas.
window.__nxCrmEntrada20260905=true;window.__nxCrmOperativo20260906=1;window.__nxCrmSeguros20260905=1;

/* ───────────────────────── Ayudantes ───────────────────────── */
const $=s=>document.querySelector(s);
const STX=()=>{try{return window.ST||ST||{}}catch(e){return window.ST||{}}};
const SES=()=>{try{return window.sesion||sesion||null}catch(e){return window.sesion||null}};
const api=()=>{try{return window.API||API}catch(e){return window.API||null}};
const esc=v=>{try{return escHtml(String(v??''))}catch(e){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const money=v=>{try{return fmt(Number(v)||0)}catch(e){return 'RD$ '+Math.round(Number(v)||0).toLocaleString('es-DO')}};
const deps=c=>Array.isArray(c&&c.deps)?c.deps:[];
const balance=c=>{try{return Number(pendTot(c))||0}catch(e){return Math.max(0,Number(c&&c.deuda_total||0)-Number(c&&c.pagado||0)+Number(c&&c.deuda_anterior||0))}};
const prima=c=>{try{return Number(getTot(c))||0}catch(e){return Number(c&&c.precio_titular||0)+deps(c).length*Number(c&&c.precio_dep||0)}};
const polEstado=c=>{try{return getEstPol(c)||{est:'vigente',lbl:'Activa'}}catch(e){return {est:c&&c.activo===false?'vencida':'vigente',lbl:c&&c.activo===false?'Inactiva':'Activa'}}};
const agenteNom=c=>{try{return gAgt(c&&c.agente_id)?.nom||'Sin asignar'}catch(e){return 'Sin asignar'}};
const empresaNom=c=>{try{return gEmp(c&&c.empresa_id)?.nom||'Particular'}catch(e){return 'Particular'}};
const clientes=()=>Array.isArray(STX().clientes)?STX().clientes:[];
const agentes=()=>(Array.isArray(STX().agentes)?STX().agentes:[]).filter(a=>a.activo!==false);
const cliente=id=>clientes().find(c=>String(c.id)===String(id));
const agente=id=>agentes().find(a=>String(a.id)===String(id))||(STX().agentes||[]).find(a=>String(a.id)===String(id));
const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>(x[0]||'').toUpperCase()).join('')||'?';
const idSafe=v=>String(v??'').replace(/[^a-zA-Z0-9_-]/g,'');
const title=v=>String(v??'').trim().slice(0,160);
const waNum=t=>{const d=String(t||'').replace(/\D/g,'');if(d.length===10)return '1'+d;if(d.length===11&&d[0]==='1')return d;return ''};
const toastFn=(t,tt,m)=>{try{toast(t,tt,m||'')}catch(e){}};
const audit=(a,d,c)=>{try{logAudit(a,d,'CRM',c||null)}catch(e){}};

// Fechas: siempre en hora de República Dominicana, un solo criterio en todo el módulo.
const TZ='America/Santo_Domingo';
const hoyISO=()=>{try{return new Date().toLocaleDateString('en-CA',{timeZone:TZ})}catch(e){return new Date().toISOString().slice(0,10)}};
const diaRD=v=>{if(!v)return '';const s=String(v);if(s.length===10)return s;try{return new Date(s).toLocaleDateString('en-CA',{timeZone:TZ})}catch(e){return s.slice(0,10)}};
const diasEntre=(a,b)=>Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/86400000);
const diasDesde=v=>{const d=diaRD(v);return d?Math.max(0,diasEntre(d,hoyISO())):0};
const fechaCorta=v=>{if(!v)return 'Sin fecha';try{return new Date(v).toLocaleDateString('es-DO',{day:'2-digit',month:'short',timeZone:TZ})}catch(e){return diaRD(v)}};
const fechaLarga=v=>{if(!v)return '—';try{const s=String(v);return new Date(s.length===10?s+'T12:00:00':s).toLocaleDateString('es-DO',{day:'2-digit',month:'short',year:'numeric',timeZone:TZ})}catch(e){return diaRD(v)}};
const horaRD=v=>{try{return new Date(v).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit',timeZone:TZ})}catch(e){return ''}};
const ago=v=>{if(!v)return 'Sin fecha';const d=diasDesde(v);return d<=0?'Hoy':d===1?'Ayer':'hace '+d+' días'};
const isoLocal=v=>{if(!v)return null;const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null};
const vencida=t=>!!(t&&t.vence_en&&t.estado!=='completada'&&new Date(t.vence_en).getTime()<Date.now());
const venceHoy=t=>!!(t&&t.vence_en&&diaRD(t.vence_en)===hoyISO());

// Errores del servidor → texto claro en español. El detalle técnico solo va a la consola.
function errTxt(e){
  const m=String((e&&e.message)||e||'');
  try{console.error('[CRM]',e)}catch(x){}
  const mapa=[
    [/tarea no encontrada/i,'La tarea ya no existe'],
    [/titulo requerido|titulo de tarea requerido/i,'Escribe un título de al menos 2 letras'],
    [/cliente requerido/i,'Elige un cliente'],
    [/PGRST205|Could not find the table|relation .* does not exist|42P01/i,'Esta función todavía no está activada en el sistema'],
    [/row-level security|permission denied|42501|PGRST301/i,'No tienes permiso para esta acción'],
    [/JWT|401|expired/i,'Tu sesión venció. Entra de nuevo al sistema'],
    [/Failed to fetch|NetworkError|Load failed|network/i,'Sin conexión. Revisa tu internet e intenta de nuevo'],
    [/duplicate key|23505/i,'Ya existe un registro igual'],
    [/check constraint|23514|invalid input value/i,'Hay un dato que no es válido'],
    [/violates foreign key|23503/i,'El registro relacionado ya no existe'],
    [/CRM_MOTIVO_PERDIDA/i,'Indica el motivo de la pérdida'],
    [/CRM_ETAPA_INVALIDA/i,'Etapa no válida'],
    [/CRM_CLIENTE_REQUERIDO/i,'Para marcar la póliza como emitida hay que vincular un cliente']
  ];
  for(const [re,tx] of mapa)if(re.test(m))return tx;
  return 'No se pudo completar la operación. Intenta de nuevo';
}
const tablaNoExiste=e=>/PGRST205|Could not find the table|relation .* does not exist|42P01/i.test(String((e&&e.message)||e||''));

// "Clientes en riesgo": misma fórmula auditada de Avisos (mesCorte + _saldoFacturasCliente), sin tocar.
// Solo se agrega memoria por render: cada cliente se calcula UNA vez aunque se pinte en varias listas.
let atrasoMemo=new Map(),facsMemo=null;
function nuevoRender(){atrasoMemo=new Map();facsMemo=null}
function facturasDe(cid){
  if(!facsMemo){facsMemo=new Map();(STX().facturas||[]).forEach(f=>{const k=String(f.cliente_id);if(!facsMemo.has(k))facsMemo.set(k,[]);facsMemo.get(k).push(f)})}
  return facsMemo.get(String(cid))||[];
}
function mesesAtrasoCalc(c){try{const mc=mesCorte(),hoyKey=`${mc.anio}-${String(mc.mes).padStart(2,'0')}`;const m=_saldoFacturasCliente(c.id);return facturasDe(c.id).filter(f=>f.estado!=='Anulada'&&f.periodo<hoyKey&&(m[f.id]??0)>0.009).length}catch(e){return 0}}
function mesesAtraso(c){const k=String(c&&c.id);if(atrasoMemo.has(k))return atrasoMemo.get(k);const v=mesesAtrasoCalc(c);atrasoMemo.set(k,v);return v}
// Fórmula original (sin memoria) — solo para la comprobación de QA, no se usa en la interfaz.
function mesesAtrasoLegacy(c){try{const mc=mesCorte(),hoyKey=`${mc.anio}-${String(mc.mes).padStart(2,'0')}`;const m=_saldoFacturasCliente(c.id);return (STX().facturas||[]).filter(f=>String(f.cliente_id)===String(c.id)&&f.estado!=='Anulada'&&f.periodo<hoyKey&&(m[f.id]??0)>0.009).length}catch(e){return 0}}

/* ───────────────────────── Catálogos ───────────────────────── */
const TIPO_TAREA={seguimiento:'Seguimiento',documento:'Documento',cobro:'Cobro',afiliacion:'Afiliación',renovacion:'Renovación',otro:'Otro'};
const PRIORIDAD={baja:'Baja',media:'Media',alta:'Alta',urgente:'Urgente'};
const ACT={llamada:['Llamada','ti-phone'],whatsapp:['WhatsApp','ti-brand-whatsapp'],nota:['Nota','ti-notes'],cotizacion:['Cotización','ti-file-dollar'],renovacion:['Renovación','ti-refresh'],documento:['Documento','ti-file-description'],cobro:['Cobro','ti-cash'],sistema:['Sistema','ti-settings-automation']};
const ETAPAS=[['nuevo','Nuevo','ti-sparkles'],['cotizado','Cotizado','ti-file-dollar'],['documentos','Documentos','ti-files'],['emitida','Emitida','ti-shield-check'],['perdida','Perdida','ti-circle-x']];
const ABIERTAS=['nuevo','cotizado','documentos'];
const etNom=k=>(ETAPAS.find(x=>x[0]===k)||ETAPAS[0])[1];
const etIco=k=>(ETAPAS.find(x=>x[0]===k)||ETAPAS[0])[2];
const MOTIVOS=[['precio','Precio'],['otra_aseguradora','Se fue con otra aseguradora'],['no_respondio','No respondió'],['no_califico','No calificó'],['otro','Otro']];
const motivoNom=k=>(MOTIVOS.find(x=>x[0]===k)||[])[1]||k||'Sin motivo';
const ORIGENES=['WhatsApp','Referido','Redes','Llamada','Visita','Otro'];
const DIAS_SIN_MOVIMIENTO=7;

/* ───────────────────────── Estado ───────────────────────── */
const S={
  tab:'panel',filtro:'todas',q:'',qPros:'',
  agenda:[],pendientes:[],cargando:false,error:'',gen:0,cargaAgenda:null,verTodas:false,
  recientes:new Map(),busy:new Set(),miAgente:undefined,guardando:false,
  pros:[],prosDisp:null,prosError:'',prosCargando:false,prosGen:0,
  ficha:null,fichaHist:[],fichaHistCargando:false,vincularPendiente:null
};
try{const f=nxPref('crm_filtro','todas');if(f==='mias'||f==='todas')S.filtro=f}catch(e){}
try{const t=nxPref('crm_tab','panel');if(t==='panel'||t==='prospectos')S.tab=t}catch(e){}
let abriendoDesdeCrm=false;

/* ───────────────────────── Vista, menú y navegación ───────────────────────── */
function orgBloqueada(){
  try{const s=SES();const t=s&&s.org&&s.org.tipo;if(t&&t!=='seguros')return true;const b=document.body.classList;return b.contains('org-tienda')||b.contains('org-rifa')||b.contains('org-consultorio')}catch(e){return false}
}
function ensureView(){
  let v=$('#v-crm');if(v)return v;
  v=document.createElement('div');v.id='v-crm';v.className='view nxSf';
  const ref=$('#v-clientes');if(ref&&ref.parentNode)ref.parentNode.insertBefore(v,ref);else document.querySelector('.main')?.appendChild(v);
  return v;
}
function ensureMenu(){
  let n=$('#nxCrmNav');
  if(orgBloqueada()){if(n)n.style.display='none';return null}
  if(n)return n;
  const cli=[...document.querySelectorAll('#sbNav .ni')].find(x=>(x.getAttribute('onclick')||'').includes("nav('clientes'"));
  if(!cli||!cli.parentNode)return null;
  n=document.createElement('div');n.className='ni';n.id='nxCrmNav';n.setAttribute('onclick',"nav('crm',this)");n.setAttribute('tabindex','0');n.setAttribute('role','button');n.setAttribute('onkeydown',"if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}");
  n.innerHTML='<i class="ti ti-heart-handshake ni-i"></i><span class="ni-l">CRM</span>';
  cli.parentNode.insertBefore(n,cli.nextSibling);return n;
}
function open(el){
  if(orgBloqueada()){
    // Mismo candado que nav(): tienda/rifa/consultorio siempre van a su módulo.
    try{const s=SES(),t=s&&s.org&&s.org.tipo,b=document.body.classList;const f=t==='tienda'||b.contains('org-tienda')?'nxAbrirPOS':t==='rifa'||b.contains('org-rifa')?'nxAbrirRifas':'nxAbrirConsultorio';if(typeof window[f]==='function')window[f]()}catch(e){}
    return false;
  }
  const v=ensureView();ensureMenu();
  window.__nxCrmCtx=false;
  try{if(typeof window.nxSidebarSpringSync==='function')window.nxSidebarSpringSync()}catch(e){}
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('on'));v.classList.add('on');
  document.querySelectorAll('.ni').forEach(x=>x.classList.remove('on'));(el&&el.classList?el:$('#nxCrmNav'))?.classList.add('on');
  try{document.querySelectorAll('.nxFacBar').forEach(b=>b.remove());const fab=document.querySelector('.nx-fab');if(fab)fab.classList.remove('nxFabLift')}catch(e){}
  try{const p=$('#pttl');if(p)p.textContent='CRM'}catch(e){}
  render();
  cargar({fresh:true});cargarProspectos();
  try{if(window.innerWidth<=768&&typeof closeMobSB==='function')closeMobSB()}catch(e){}
  try{if(typeof nxGuardarLugar==='function')nxGuardarLugar('seguros','crm')}catch(e){}
  try{window.scrollTo({top:0,behavior:'instant'})}catch(e){try{window.scrollTo(0,0)}catch(x){}}
  try{logError('info','Navegación: CRM','','crm')}catch(e){}
  return false;
}
window.nxAbrirCrm=open;
function patchNav(){
  try{
    if(typeof nav!=='function'||nav.__nxCrm)return;
    const o=nav;
    const n=function(view,el){
      if(view==='crm')return open(el);
      // El contexto CRM de la ficha 360 solo vive cuando la abrió el CRM; cualquier otra navegación lo apaga.
      window.__nxCrmCtx=(view==='cliente360')?!!abriendoDesdeCrm:false;
      abriendoDesdeCrm=false;
      return o.apply(this,arguments);
    };
    n.__nxCrm=1;nav=window.nav=n;
  }catch(e){console.error('[CRM] nav',e)}
}
// Abrir la ficha CRM de un cliente: Cliente 360 con las pestañas del CRM (historial + tareas).
function abrirCliente(id){
  const c=cliente(id);if(!c){toastFn('warn','Cliente no encontrado','Actualiza la lista de clientes');return}
  try{
    abriendoDesdeCrm=true;
    if(typeof window.nav==='function')window.nav('cliente360',null);
    abriendoDesdeCrm=false;window.__nxCrmCtx=true;
    if(typeof nxC360Abrir==='function')nxC360Abrir(c.id);
    else if(typeof verCliente==='function')verCliente(c.id);
    try{window.scrollTo({top:0,behavior:'instant'})}catch(e){}
  }catch(e){console.error('[CRM] abrir cliente',e);toastFn('err','No se pudo abrir la ficha','Intenta de nuevo')}
}
window.nxCrmAbrirCliente=abrirCliente;
window.nxCrmIr=function(dest){
  // "Cobros" es una pestaña DENTRO de Facturas (#panelCob vive en #v-facturas).
  if(dest==='cobros'){window.nav('facturas',null);try{switchTab('cob')}catch(e){}return}
  if(dest==='proceso'){window.nav('clientes',null);try{switchCliTab('proceso')}catch(e){}return}
  if(dest==='agenda'){S.tab='panel';render();pintarTodo();try{$('#nxCrmAgendaHost')?.scrollIntoView({behavior:'smooth',block:'start'})}catch(e){}return}
  window.nav(dest,null);
};

/* ───────────────────────── Render del Panel ───────────────────────── */
function row(c,side,sub,cls){
  return '<div class="nxCrmRow" role="button" tabindex="0" onclick="nxCrmAbrirCliente(\''+idSafe(c.id)+'\')" onkeydown="nxCrm.tecla(event,this)"><div class="nxCrmAv">'+esc(initials(c.nom))+'</div><div class="nxCrmWho"><b>'+esc(c.nom||'Cliente')+'</b><span>'+esc(sub||((c.ars||'Sin ARS')+' · '+(c.plan||'Sin plan')))+'</span></div><div class="nxCrmVal '+(cls||'')+'">'+esc(side||'')+'</div></div>';
}
function coincide(txt){const q=S.q.trim().toLowerCase();return !q||String(txt||'').toLowerCase().includes(q)}
function render(){
  const v=ensureView();nuevoRender();
  const all=clientes(),act=all.filter(c=>c.activo!==false);
  const vidas=act.reduce((n,c)=>n+1+deps(c).length,0);
  const vig=act.filter(c=>c.numero_poliza&&!['vencida','cancelada'].includes(polEstado(c).est)).length;
  const proc=all.filter(c=>c.estado_cliente==='EN_PROCESO');
  const pend=act.filter(c=>balance(c)>0).sort((a,b)=>balance(b)-balance(a)),pendMonto=pend.reduce((n,c)=>n+balance(c),0);
  const primaMes=act.reduce((n,c)=>n+prima(c),0);
  const riesgo=act.map(c=>({c,meses:mesesAtraso(c)})).filter(x=>x.meses>=2).sort((a,b)=>b.meses-a.meses||balance(b.c)-balance(a.c));
  const vencidas=S.pendientes.filter(vencida).length;
  const prosAb=S.pros.filter(p=>ABIERTAS.includes(p.etapa)).length;
  const pendF=pend.filter(c=>coincide(c.nom)),riesgoF=riesgo.filter(x=>coincide(x.c.nom));
  const head='<div class="nxCrmHomeHead"><div><span class="nxCrmHomeBadge"><i class="ti ti-heart-handshake"></i> CRM · Seguros de salud</span><h1>Panel CRM</h1><p>Clientes, pólizas, cobranza, seguimiento y prospectos en una sola operación.</p></div><div class="nxCrmTopActs"><button type="button" onclick="nxCrmIr(\'clientes\')"><i class="ti ti-users"></i> Clientes</button><button type="button" onclick="nxCrmIr(\'polizas\')"><i class="ti ti-certificate"></i> Pólizas</button><button type="button" class="primary" onclick="nxCrmIr(\'cobros\')"><i class="ti ti-cash"></i> Cobros</button><button type="button" class="icon" id="nxCrmRefrescar" title="Actualizar" aria-label="Actualizar el CRM" onclick="nxCrm.refrescar()"><i class="ti ti-refresh"></i></button></div></div>';
  const seg='<div class="nxCrmSeg" role="tablist"><button type="button" role="tab" aria-selected="'+(S.tab==='panel')+'" class="'+(S.tab==='panel'?'on':'')+'" onclick="nxCrm.tab(\'panel\')"><i class="ti ti-layout-dashboard"></i> Panel</button><button type="button" role="tab" aria-selected="'+(S.tab==='prospectos')+'" class="'+(S.tab==='prospectos'?'on':'')+'" onclick="nxCrm.tab(\'prospectos\')"><i class="ti ti-target-arrow"></i> Prospectos'+(prosAb?' <span class="n">'+prosAb+'</span>':'')+'</button></div>';
  let body='';
  if(S.tab==='panel'){
    body='<div class="nxCrmKpis"><div class="nxCrmKpi"><div class="l">Clientes activos</div><div class="v">'+act.length+'</div><div class="s">cartera vigente</div></div><div class="nxCrmKpi"><div class="l">Vidas aseguradas</div><div class="v">'+vidas+'</div><div class="s">titulares + dependientes</div></div><div class="nxCrmKpi"><div class="l">Pólizas vigentes</div><div class="v">'+vig+'</div><div class="s">con número de póliza</div></div><div class="nxCrmKpi"><div class="l">Prima mensual</div><div class="v">'+money(primaMes)+'</div><div class="s">cartera activa</div></div><div class="nxCrmKpi"><div class="l">Pendiente</div><div class="v">'+money(pendMonto)+'</div><div class="s">'+pend.length+' clientes</div></div><div class="nxCrmKpi"><div class="l">En riesgo</div><div class="v">'+riesgo.length+'</div><div class="s">2+ meses de atraso</div></div></div>'+
    '<div class="nxCrmAttention"><button type="button" class="nxCrmAtt err" onclick="nxCrmIr(\'cobros\')"><div class="ic"><i class="ti ti-alert-circle"></i></div><div><b>'+pend.length+'</b><span>Pagos pendientes</span></div></button><button type="button" class="nxCrmAtt warn" onclick="nxCrmIr(\'cobros\')"><div class="ic"><i class="ti ti-user-exclamation"></i></div><div><b>'+riesgo.length+'</b><span>Clientes en riesgo</span></div></button><button type="button" class="nxCrmAtt '+(vencidas?'err':'')+'" onclick="nxCrmIr(\'agenda\')"><div class="ic"><i class="ti ti-calendar-exclamation"></i></div><div><b id="nxCrmAttVencidas">'+(S.cargando&&!S.pendientes.length?'…':vencidas)+'</b><span>Seguimientos vencidos</span></div></button><button type="button" class="nxCrmAtt" onclick="nxCrmIr(\'proceso\')"><div class="ic"><i class="ti ti-progress-check"></i></div><div><b>'+proc.length+'</b><span>Clientes en proceso</span></div></button></div>'+
    '<div class="nxCrmTools"><div class="nxCrmChips" role="group" aria-label="Filtro de tareas"><button type="button" class="'+(S.filtro==='todas'?'on':'')+'" aria-pressed="'+(S.filtro==='todas')+'" onclick="nxCrm.filtro(\'todas\')">Todas</button><button type="button" class="'+(S.filtro==='mias'?'on':'')+'" aria-pressed="'+(S.filtro==='mias')+'" onclick="nxCrm.filtro(\'mias\')">Mis tareas</button></div><label class="nxCrmSearch"><i class="ti ti-search"></i><input id="nxCrmQ" type="search" placeholder="Buscar cliente o tarea…" aria-label="Buscar cliente o tarea" value="'+esc(S.q)+'" oninput="nxCrm.buscar(this.value)">'+(S.q?'<button type="button" aria-label="Limpiar búsqueda" onclick="nxCrm.buscar(\'\',true)"><i class="ti ti-x"></i></button>':'')+'</label><button type="button" class="nxCrmLink primary" onclick="nxCrmNuevaTarea()" style="background:linear-gradient(135deg,var(--crm-b),var(--crm-b3));border-color:transparent;color:#fff"><i class="ti ti-plus"></i> Nueva tarea</button></div>'+
    '<div class="nxCrmCols"><div><div id="nxCrmAgendaHost"></div><div id="nxCrmVencidosHost"></div>'+
    '<section class="nxCrmPanel"><div class="nxCrmPH"><h3>Necesita atención</h3><button type="button" class="nxCrmLink" onclick="nxCrmIr(\'cobros\')">Ver cobros</button></div><div class="nxCrmList">'+(pendF.length?pendF.slice(0,6).map(c=>row(c,money(balance(c)),(c.ars||'Sin ARS')+' · '+(c.plan||'Sin plan'),'debt')).join(''):'<div class="nxCrmEmpty">'+(S.q?'Ningún cliente con balance coincide con la búsqueda.':'No hay balances pendientes.')+'</div>')+'</div></section>'+
    '<section class="nxCrmPanel"><div class="nxCrmPH"><h3>Clientes en riesgo</h3><button type="button" class="nxCrmLink" onclick="nxCrmIr(\'cobros\')">Ver cobros</button></div><div class="nxCrmList">'+(riesgoF.length?riesgoF.slice(0,6).map(x=>row(x.c,money(balance(x.c)),x.meses+' meses de atraso · '+(x.c.ars||'Sin ARS'),'debt')).join(''):'<div class="nxCrmEmpty">'+(S.q?'Ningún cliente en riesgo coincide con la búsqueda.':'No hay clientes con 2 o más meses de atraso.')+'</div>')+'</div></section></div>'+
    '<div><section class="nxCrmPanel"><div class="nxCrmPH"><h3>Accesos del CRM</h3></div><div class="nxCrmQuick"><button type="button" onclick="nxCrmIr(\'clientes\')"><i class="ti ti-users"></i><b>Clientes</b><span>Ficha 360 y cartera</span></button><button type="button" onclick="nxCrmIr(\'polizas\')"><i class="ti ti-certificate"></i><b>Pólizas</b><span>Vigencias de póliza</span></button><button type="button" onclick="nxCrmIr(\'cobros\')"><i class="ti ti-cash"></i><b>Cobros</b><span>Pendientes y pagos</span></button><button type="button" onclick="nxCrm.tab(\'prospectos\')"><i class="ti ti-target-arrow"></i><b>Prospectos</b><span>Embudo de ventas</span></button></div></section>'+
    '<div id="nxCrmControlHost"></div><div id="nxCrmEquipoHost"></div></div></div>';
  }else{
    body='<div id="nxCrmProsHost"></div>';
  }
  v.innerHTML=head+seg+body;
  if(S.tab==='panel'){pintarAgenda();pintarControl()}else pintarProspectos();
}
function pintarTodo(){if(!$('#v-crm.on'))return;if(S.tab==='panel'){pintarAgenda();pintarControl()}else pintarProspectos()}

/* ───────────────────────── Tareas: carga y agenda ───────────────────────── */
async function miAgenteId(){
  if(S.miAgente!==undefined)return S.miAgente;
  let id=null;const A=api();
  // Con Auth, RLS de profiles devuelve solo la fila propia (id = auth.uid()); con el login viejo no hay fila.
  try{if(A&&A.token){const r=await A.get('profiles','select=agente_id&limit=1');if(r&&r[0]&&r[0].agente_id)id=r[0].agente_id}}catch(e){}
  if(!id){const s=SES();const nom=String((s&&s.nom)||'').trim().toLowerCase();const a=nom?agentes().find(x=>String(x.nom||'').trim().toLowerCase()===nom):null;if(a)id=a.id}
  S.miAgente=id||null;return S.miAgente;
}
async function cargar(opts){
  const A=api();if(!A||!A.get)return;
  if(S.cargaAgenda&&!(opts&&opts.fresh))return S.cargaAgenda;
  const gen=++S.gen;
  const p=(async()=>{
    S.cargando=true;S.error='';pintarTodo();
    try{
      const [agenda,lite]=await Promise.all([
        A.get('crm_tareas','estado=eq.pendiente&order=vence_en.asc.nullslast,created_at.asc&limit=60&select=*'),
        // Consulta ligera de TODAS las pendientes: vencidas reales y carga por agente (antes se contaba sobre 8 filas).
        A.get('crm_tareas','estado=eq.pendiente&select=id,cliente_id,asignado_agente_id,vence_en,titulo,tipo,prioridad,estado&limit=5000'),
        miAgenteId()
      ]);
      if(gen!==S.gen)return;
      S.agenda=agenda||[];S.pendientes=lite||[];
      S.agenda.forEach(t=>S.recientes.set(String(t.id),t));
    }catch(e){if(gen!==S.gen)return;S.error=errTxt(e)}
    S.cargando=false;pintarTodo();
  })();
  S.cargaAgenda=p;
  try{await p}finally{if(S.cargaAgenda===p)S.cargaAgenda=null}
}
function filtrar(list){
  let l=list;
  if(S.filtro==='mias'&&S.miAgente)l=l.filter(t=>String(t.asignado_agente_id||'')===String(S.miAgente));
  if(S.q.trim()){l=l.filter(t=>{const c=cliente(t.cliente_id);return coincide(t.titulo)||coincide(c&&c.nom)})}
  return l;
}
function dueTxt(t){if(!t.vence_en)return 'Sin fecha';if(venceHoy(t))return 'Hoy · '+horaRD(t.vence_en);return fechaCorta(t.vence_en)}
function taskHtml(t){
  const c=cliente(t.cliente_id),ag=agente(t.asignado_agente_id),done=t.estado==='completada',vd=vencida(t);
  const meta=[c?c.nom:'Cliente',TIPO_TAREA[t.tipo]||'Seguimiento'];if(ag)meta.push(ag.nom);if(t.prioridad&&t.prioridad!=='media')meta.push('Prioridad '+(PRIORIDAD[t.prioridad]||t.prioridad).toLowerCase());
  return '<div class="nxOpsTask '+(vd&&!done?'is-overdue':'')+(done?' is-done':'')+'" role="button" tabindex="0" data-id="'+esc(t.id)+'" onclick="nxCrm.abrirTarea(\''+idSafe(t.id)+'\')" onkeydown="nxCrm.tecla(event,this)"><button type="button" class="nxOpsCheck" aria-label="'+(done?'Reabrir tarea':'Marcar como hecha')+'" aria-pressed="'+done+'" onclick="event.stopPropagation();nxCrm.toggleTarea(\''+idSafe(t.id)+'\','+(done?'false':'true')+')"><i class="ti '+(done?'ti-check':'ti-circle')+'"></i></button><div class="nxOpsBody"><b>'+esc(t.titulo)+'</b><span>'+esc(meta.join(' · '))+'</span></div><div class="nxOpsDue '+(vd&&!done?'bad':venceHoy(t)&&!done?'hoy':'')+'">'+esc(done?'Hecha':dueTxt(t))+'</div></div>';
}
function pintarAgenda(){
  const host=$('#nxCrmAgendaHost');if(!host)return;
  const att=$('#nxCrmAttVencidas');const vencidas=S.pendientes.filter(vencida);if(att)att.textContent=S.cargando&&!S.pendientes.length?'…':String(vencidas.length);
  const l=filtrar(S.agenda);const lim=S.verTodas?l.length:8;
  const aviso=S.filtro==='mias'&&!S.miAgente?'<div class="nxCrmAviso"><i class="ti ti-info-circle"></i> No encontramos tu agente en la lista; se muestran todas las tareas.</div>':'';
  let rows;
  if(S.error)rows='<div class="nxOpsEmpty">'+esc(S.error)+' <button type="button" class="nxCrmLink2" onclick="nxCrm.refrescar()">Reintentar</button></div>';
  else if(S.cargando&&!S.agenda.length)rows='<div class="nxOpsEmpty">Cargando tareas…</div>';
  else if(!l.length)rows='<div class="nxOpsEmpty">'+(S.q?'Ninguna tarea coincide con la búsqueda.':S.filtro==='mias'?'No tienes tareas pendientes asignadas.':'No hay seguimientos pendientes. La cartera está al día.')+'</div>';
  else rows=l.slice(0,lim).map(taskHtml).join('')+(l.length>lim?'<button type="button" class="nxOpsMore" onclick="nxCrm.verTodas()">Ver las '+l.length+' tareas</button>':'');
  host.innerHTML='<section class="nxCrmPanel"><div class="nxOpsHead"><div><h3>Agenda de seguimiento</h3><div class="nxOpsFilter">'+(S.filtro==='mias'?'Tus tareas pendientes':'Tareas pendientes de toda la cartera')+(S.pendientes.length?' · '+S.pendientes.length+' en total':'')+'</div></div><button type="button" class="nxCrmLink" onclick="nxCrmNuevaTarea()">+ Nueva tarea</button></div>'+aviso+'<div class="nxOpsRows">'+rows+'</div></section>';
  const vh=$('#nxCrmVencidosHost');
  if(vh){
    const vl=filtrar(vencidas).sort((a,b)=>String(a.vence_en).localeCompare(String(b.vence_en)));
    vh.innerHTML='<section class="nxCrmPanel"><div class="nxOpsHead"><div><h3>Seguimientos vencidos</h3><div class="nxOpsFilter">'+vl.length+' requiere'+(vl.length===1?'':'n')+' atención</div></div></div><div class="nxOpsRows">'+(S.cargando&&!S.pendientes.length?'<div class="nxOpsEmpty">Cargando…</div>':vl.length?vl.slice(0,6).map(taskHtml).join('')+(vl.length>6?'<div class="nxOpsFilter" style="text-align:center;margin-top:6px">Y '+(vl.length-6)+' más en la agenda</div>':''):'<div class="nxOpsEmpty">No hay tareas vencidas.</div>')+'</div></section>';
  }
  pintarEquipo();
}
function filaAtencion(c,reason,ico){
  return '<div class="nxOpsTask" role="button" tabindex="0" onclick="nxCrmAbrirCliente(\''+idSafe(c.id)+'\')" onkeydown="nxCrm.tecla(event,this)"><div class="nxCrmAv"><i class="ti ti-'+ico+'"></i></div><div class="nxOpsBody"><b>'+esc(c.nom||'Cliente')+'</b><span>'+esc(reason)+'</span></div><div class="nxOpsDue">Abrir</div></div>';
}
function pintarControl(){
  const host=$('#nxCrmControlHost');if(!host)return;
  const all=clientes(),act=all.filter(c=>c.activo!==false);
  const proceso=all.filter(c=>c.estado_cliente==='EN_PROCESO'&&coincide(c.nom)).sort((a,b)=>String(a.fecha_seguimiento||'9999').localeCompare(String(b.fecha_seguimiento||'9999')));
  const sinArs=act.filter(c=>!String(c.ars||'').trim()&&coincide(c.nom));
  const block=(t,count,rows,empty)=>'<section class="nxCrmPanel"><div class="nxOpsHead"><div><h3>'+t+'</h3><div class="nxOpsFilter">'+count+' requiere'+(count===1?'':'n')+' atención</div></div></div><div class="nxOpsRows">'+(rows.length?rows.slice(0,5).join(''):'<div class="nxOpsEmpty">'+empty+'</div>')+'</div></section>';
  host.innerHTML=block('Clientes en proceso',proceso.length,proceso.map(c=>filaAtencion(c,(c.motivo_proceso||'Proceso pendiente')+(c.fecha_seguimiento?' · seguimiento '+fechaLarga(c.fecha_seguimiento):''),'progress-check')),'No hay clientes en proceso.')+
    block('Datos por completar',sinArs.length,sinArs.map(c=>filaAtencion(c,'Falta asignar ARS','building-hospital')),'Todos tienen ARS asignada.');
}
function pintarEquipo(){
  const host=$('#nxCrmEquipoHost');if(!host)return;
  const map=new Map();
  S.pendientes.forEach(t=>{const k=t.asignado_agente_id||'_sin';if(!map.has(k))map.set(k,{pendientes:0,vencidas:0});const x=map.get(k);x.pendientes++;if(vencida(t))x.vencidas++});
  const items=[...map.entries()].sort((a,b)=>b[1].vencidas-a[1].vencidas||b[1].pendientes-a[1].pendientes);
  const cards=S.cargando&&!S.pendientes.length?'<div class="nxOpsEmpty">Cargando…</div>':items.length?items.map(([id,x])=>{const a=agente(id);return '<div class="nxOpsTask"><div class="nxCrmAv">'+esc(a?initials(a.nom):'—')+'</div><div class="nxOpsBody"><b>'+esc(a?a.nom:'Sin asignar')+'</b><span>'+x.pendientes+' pendiente'+(x.pendientes===1?'':'s')+(x.vencidas?' · '+x.vencidas+' vencida'+(x.vencidas===1?'':'s'):'')+'</span></div><div class="nxOpsDue '+(x.vencidas?'bad':'')+'">'+(x.vencidas?'Atender':'Al día')+'</div></div>'}).join(''):'<div class="nxOpsEmpty">Aún no hay tareas asignadas.</div>';
  host.innerHTML='<section class="nxCrmPanel"><div class="nxOpsHead"><div><h3>Seguimiento por agente</h3><div class="nxOpsFilter">Carga pendiente de cada responsable</div></div></div><div class="nxOpsRows">'+cards+'</div></section>';
}

/* ───────────────────────── Modales ───────────────────────── */
function trapTab(e,m){
  const f=[...m.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(x=>x.offsetParent!==null||x===document.activeElement);
  if(!f.length)return;const a=f[0],z=f[f.length-1];
  if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}
}
function escGlobal(){
  // Respaldo: si el foco se perdió (p. ej. la ficha se repintó), Escape sigue cerrando la ventana de arriba.
  if(window.__nxCrmEscGlobal)return;window.__nxCrmEscGlobal=1;
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const ms=document.querySelectorAll('.nxCrmModal');if(!ms.length)return;const top=ms[ms.length-1];if(top.contains(e.target))return;cerrarModal(top.id)});
}
function modal(id,html,opts){
  cerrarModal(id);escGlobal();
  const m=document.createElement('div');m.id=id;m.className='nxCrmModal';
  m.innerHTML='<div class="nxCrmDialog '+(opts&&opts.wide?'wide':'')+'" role="dialog" aria-modal="true" tabindex="-1" style="outline:none" aria-labelledby="'+id+'T">'+html+'</div>';
  m.addEventListener('click',e=>{if(e.target===m)cerrarModal(id)});
  m.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();cerrarModal(id)}else if(e.key==='Tab')trapTab(e,m)});
  m.__antes=document.activeElement;
  document.body.appendChild(m);document.body.classList.add('nxCrmModalOpen');
  const f=m.querySelector('[data-autofocus]')||m.querySelector('input:not([type=hidden]),select,textarea,button');
  setTimeout(()=>{try{f&&f.focus()}catch(e){}},0);
  return m;
}
function cerrarModal(id){
  const m=$('#'+id);if(m){const a=m.__antes;m.remove();try{a&&a.focus&&a.focus()}catch(e){}}
  if(!document.querySelector('.nxCrmModal'))document.body.classList.remove('nxCrmModalOpen');
}
// Buscador de cliente (reemplaza el <select> gigante): entrada + lista filtrada, teclado y lector de pantalla.
function pickerHtml(id,label,sel){
  const c=sel?cliente(sel):null;
  return '<div class="nxOpsField full" id="'+id+'Wrap"><label for="'+id+'Q">'+label+'</label><input type="hidden" id="'+id+'" value="'+esc(sel||'')+'"><div class="nxCrmPick"><i class="ti ti-search"></i><input id="'+id+'Q" autocomplete="off" placeholder="Escribe nombre, cédula o teléfono…" value="'+(c?esc(c.nom):'')+'" oninput="nxCrm.pickBuscar(\''+id+'\',this.value)" onfocus="nxCrm.pickBuscar(\''+id+'\',this.value)" onkeydown="nxCrm.pickTecla(event,\''+id+'\')" role="combobox" aria-expanded="false" aria-controls="'+id+'L" aria-autocomplete="list"></div><div class="nxCrmPickList" id="'+id+'L" role="listbox" hidden></div><div class="nxCrmPickSel" id="'+id+'S">'+(c?'<i class="ti ti-user-check"></i> '+esc(c.nom)+(c.cedula?' · '+esc(c.cedula):''):'')+'</div></div>';
}
function pickBuscar(id,q){
  const L=$('#'+id+'L'),H=$('#'+id),Q=$('#'+id+'Q');if(!L||!H)return;
  const t=String(q||'').trim().toLowerCase(),d=t.replace(/\D/g,'');
  const c=H.value?cliente(H.value):null;
  if(c&&String(c.nom).toLowerCase()!==t){H.value='';const s=$('#'+id+'S');if(s)s.innerHTML=''}
  let l=clientes().filter(x=>x.activo!==false);
  if(t)l=l.filter(x=>String(x.nom||'').toLowerCase().includes(t)||(d&&(String(x.cedula||'').replace(/\D/g,'').includes(d)||String(x.tel||'').replace(/\D/g,'').includes(d)||String(x.wa||'').replace(/\D/g,'').includes(d))));
  l=l.sort((a,b)=>String(a.nom).localeCompare(String(b.nom))).slice(0,30);
  L.innerHTML=l.length?l.map(x=>'<button type="button" role="option" data-id="'+esc(x.id)+'" onclick="nxCrm.pickElegir(\''+id+'\',\''+idSafe(x.id)+'\')"><div class="nxCrmAv" style="width:30px;height:30px;font-size:11px">'+esc(initials(x.nom))+'</div><div><b>'+esc(x.nom)+'</b><span>'+esc([x.cedula,x.ars||'Sin ARS',x.plan].filter(Boolean).join(' · '))+'</span></div></button>').join(''):'<div class="vacio">'+(t?'Ningún cliente coincide.':'No hay clientes activos.')+'</div>';
  L.hidden=false;if(Q)Q.setAttribute('aria-expanded','true');
}
function pickElegir(id,cid){
  const c=cliente(cid),H=$('#'+id),Q=$('#'+id+'Q'),L=$('#'+id+'L'),Sx=$('#'+id+'S');if(!c||!H)return;
  H.value=c.id;if(Q){Q.value=c.nom;Q.setAttribute('aria-expanded','false')}if(L)L.hidden=true;
  if(Sx)Sx.innerHTML='<i class="ti ti-user-check"></i> '+esc(c.nom)+(c.cedula?' · '+esc(c.cedula):'');
  try{Q&&Q.focus()}catch(e){}
}
function pickTecla(e,id){
  const L=$('#'+id+'L');if(!L)return;
  const ops=[...L.querySelectorAll('[role=option]')];let i=ops.findIndex(o=>o.classList.contains('is-hl'));
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(L.hidden)pickBuscar(id,e.target.value);const n=e.key==='ArrowDown'?Math.min(ops.length-1,i+1):Math.max(0,i-1);ops.forEach(o=>o.classList.remove('is-hl'));if(ops[n]){ops[n].classList.add('is-hl');ops[n].scrollIntoView({block:'nearest'})}}
  else if(e.key==='Enter'){if(!L.hidden&&ops.length){e.preventDefault();(ops[i>=0?i:0]).click()}}
  else if(e.key==='Escape'){if(!L.hidden){e.stopPropagation();L.hidden=true;e.target.setAttribute('aria-expanded','false')}}
}
function optAgentes(sel){return '<option value="">Sin asignar</option>'+agentes().slice().sort((a,b)=>String(a.nom).localeCompare(String(b.nom))).map(a=>'<option value="'+esc(a.id)+'"'+(String(sel||'')===String(a.id)?' selected':'')+'>'+esc(a.nom)+'</option>').join('')}
function optionsDe(obj,sel){return Object.keys(obj).map(k=>'<option value="'+k+'"'+(k===sel?' selected':'')+'>'+obj[k]+'</option>').join('')}

// ── Nueva tarea ──
function modalTarea(clienteId){
  modal('nxOpsModal','<h2 id="nxOpsModalT"><i class="ti ti-checkbox"></i> Nueva tarea de seguimiento</h2><p>Queda en la ficha del cliente y en la agenda del CRM.</p><div class="nxOpsGrid">'+pickerHtml('nxOpsCliente','Cliente',clienteId)+'<div class="nxOpsField full"><label for="nxOpsTitulo">Tarea</label><input id="nxOpsTitulo" maxlength="160" placeholder="Ej.: Confirmar documentos de afiliación"></div><div class="nxOpsField"><label for="nxOpsTipo">Tipo</label><select id="nxOpsTipo">'+optionsDe(TIPO_TAREA,'seguimiento')+'</select></div><div class="nxOpsField"><label for="nxOpsPrioridad">Prioridad</label><select id="nxOpsPrioridad">'+optionsDe(PRIORIDAD,'media')+'</select></div><div class="nxOpsField"><label for="nxOpsAgente">Responsable</label><select id="nxOpsAgente">'+optAgentes(S.filtro==='mias'?S.miAgente:'')+'</select></div><div class="nxOpsField"><label for="nxOpsVence">Fecha de seguimiento</label><input id="nxOpsVence" type="datetime-local"></div><div class="nxOpsField full"><label for="nxOpsNota">Nota (opcional)</label><textarea id="nxOpsNota" maxlength="1500" placeholder="Qué debe resolverse o verificarse"></textarea></div></div><div class="nxOpsFoot"><button type="button" onclick="nxCrmCerrarTarea()">Cancelar</button><button type="button" class="primary" id="nxOpsGuardar" onclick="nxCrmGuardarTarea()">Guardar tarea</button></div>');
  setTimeout(()=>{try{(clienteId?$('#nxOpsTitulo'):$('#nxOpsClienteQ'))?.focus()}catch(e){}},0);
}
window.nxCrmNuevaTarea=()=>modalTarea('');
window.nxCrmNuevaTareaCliente=()=>{let id='';try{id=typeof _c360Sel!=='undefined'&&_c360Sel?_c360Sel:''}catch(e){}modalTarea(id)};
window.nxCrmCerrarTarea=()=>cerrarModal('nxOpsModal');
async function registrarActividad(A,p){
  return await A.post('rpc/crm_registrar_actividad',{
    p_cliente_id:p.cliente_id,p_tipo:p.tipo,p_titulo:p.titulo,p_detalle:p.detalle||null,p_resultado:p.resultado||null,
    p_proxima_accion_en:p.proxima_accion_en||null,p_crear_tarea:!!p.crear_tarea,p_tarea_titulo:p.tarea_titulo||null,
    p_tarea_tipo:p.tarea_tipo||'seguimiento',p_prioridad:p.prioridad||'media',p_asignado_agente_id:p.asignado_agente_id||null
  });
}
function fichaAbiertaDe(id){try{return typeof _c360Sel!=='undefined'&&String(_c360Sel)===String(id)&&typeof _c360Tab!=='undefined'&&_c360Tab==='actividad'&&!!window.__nxCrmCtx}catch(e){return false}}
async function refrescarFichaSi(id){if(fichaAbiertaDe(id)){try{await cargarSeguimientoCliente(id)}catch(e){}}}
window.nxCrmGuardarTarea=async()=>{
  if(S.guardando)return;
  const A=api(),cliente_id=$('#nxOpsCliente')?.value,tit=title($('#nxOpsTitulo')?.value),tipo=$('#nxOpsTipo')?.value,prioridad=$('#nxOpsPrioridad')?.value,asignado=$('#nxOpsAgente')?.value||null,vence=$('#nxOpsVence')?.value,nota=($('#nxOpsNota')?.value||'').trim();
  if(!A||!A.post){toastFn('err','Sin conexión con el sistema','Recarga la página');return}
  if(!cliente_id){toastFn('warn','Elige un cliente','Escribe el nombre y selecciónalo en la lista');try{$('#nxOpsClienteQ')?.focus()}catch(e){}return}
  if(tit.length<2){toastFn('warn','Escribe la tarea','Mínimo 2 letras');try{$('#nxOpsTitulo')?.focus()}catch(e){}return}
  const venceIso=isoLocal(vence);if(vence&&!venceIso){toastFn('warn','Fecha de seguimiento inválida');return}
  S.guardando=true;const b=$('#nxOpsGuardar');if(b){b.disabled=true;b.textContent='Guardando…'}
  try{
    await registrarActividad(A,{cliente_id,tipo:'nota',titulo:title('Tarea creada: '+tit),detalle:nota||null,proxima_accion_en:venceIso,crear_tarea:true,tarea_titulo:tit,tarea_tipo:tipo,prioridad,asignado_agente_id:asignado});
    S.guardando=false;cerrarModal('nxOpsModal');
    audit('CRM_TAREA_CREADA',tit,cliente_id);toastFn('ok','Tarea creada',tit);
    await cargar({fresh:true});await refrescarFichaSi(cliente_id);
  }catch(e){S.guardando=false;toastFn('err','No se pudo guardar la tarea',errTxt(e));if(b){b.disabled=false;b.textContent='Guardar tarea'}}
};

// ── Hecha / deshecha con «Deshacer» ──
function repintarFila(t){
  const id=String(t.id),tenia=!!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.nxOpsTask[data-id="'+id+'"]'));
  document.querySelectorAll('.nxOpsTask[data-id="'+id+'"]').forEach(el=>{el.outerHTML=taskHtml(t)});
  if(tenia){try{document.querySelector('.nxOpsTask[data-id="'+id+'"] .nxOpsCheck')?.focus({preventScroll:true})}catch(e){}}
}
function buscarTarea(id){return S.agenda.find(t=>String(t.id)===String(id))||S.recientes.get(String(id))||null}
function toastDeshacer(ttl,msg,fn){
  const host=$('#toastS');if(!host){toastFn('ok',ttl,msg);return}
  const el=document.createElement('div');el.className='toast ok';
  el.innerHTML='<div class="ti-ic"><i class="ti ti-circle-check"></i></div><div class="ti-b"><div class="ti-t">'+esc(ttl)+'</div>'+(msg?'<div class="ti-m">'+esc(msg)+'</div>':'')+'</div><button type="button" class="nxCrmLink2" style="min-height:44px;padding:0 8px">Deshacer</button><button type="button" class="ti-x" aria-label="Cerrar aviso"><i class="ti ti-x"></i></button>';
  el.querySelector('.nxCrmLink2').onclick=()=>{el.remove();try{fn()}catch(e){}};
  el.querySelector('.ti-x').onclick=()=>el.remove();
  host.appendChild(el);setTimeout(()=>el.remove(),8000);
}
async function toggleTarea(id,hacer){
  id=String(id);if(S.busy.has(id))return;
  const t=buscarTarea(id);const A=api();if(!t||!A||!A.post){toastFn('warn','La tarea ya no está en pantalla','Actualiza el CRM');return}
  S.busy.add(id);const antes={estado:t.estado,completada_en:t.completada_en};
  t.estado=hacer?'completada':'pendiente';t.completada_en=hacer?new Date().toISOString():null;S.recientes.set(id,t);
  repintarFila(t);
  try{
    if(hacer)await A.post('rpc/crm_completar_tarea',{p_tarea_id:id});
    else await A.patch('crm_tareas','id=eq.'+encodeURIComponent(id),{estado:'pendiente',completada_en:null});
    audit(hacer?'CRM_TAREA_COMPLETADA':'CRM_TAREA_REABIERTA',t.titulo,t.cliente_id);
    if(hacer)toastDeshacer('Tarea completada',t.titulo,()=>toggleTarea(id,false));else toastFn('ok','Tarea reabierta',t.titulo);
    S.busy.delete(id);
    await cargar({fresh:true});await refrescarFichaSi(t.cliente_id);
  }catch(e){
    Object.assign(t,antes);repintarFila(t);
    toastFn('err',hacer?'No se pudo completar la tarea':'No se pudo reabrir la tarea',errTxt(e));
  }finally{S.busy.delete(id)}
}
window.nxCrmCompletarTarea=id=>toggleTarea(id,true);

/* ───────────────────────── Ficha del cliente (Cliente 360 en modo CRM) ───────────────────────── */
function fichaTareasHtml(pend,hechas){
  const p=pend.length?pend.map(taskHtml).join(''):'<div class="nxOpsEmpty">No tiene tareas pendientes.</div>';
  const h=hechas.length?'<div class="nxOpsFilter" style="margin:10px 0 6px">Completadas recientemente</div>'+hechas.map(taskHtml).join(''):'';
  return p+h;
}
function seguimientoHtml(acts,pend,hechas){
  const tl=acts.length?'<ol class="nxCrmTL">'+acts.map(a=>{const d=ACT[a.tipo]||ACT.nota;return '<li><div class="nxCrmAv"><i class="ti '+d[1]+'"></i></div><div><p>'+esc(a.titulo)+'</p><small>'+esc(d[0])+' · '+esc(fechaLarga(a.created_at))+' '+esc(horaRD(a.created_at))+(a.detalle||a.resultado?' · '+esc(a.detalle||a.resultado):'')+(a.proxima_accion_en?' · próximo: '+esc(fechaLarga(a.proxima_accion_en)):'')+'</small></div></li>'}).join('')+'</ol>':'<div class="nxOpsEmpty">Aún no hay actividad registrada para este cliente.</div>';
  return '<div class="nxCrmGridSeg"><section class="nxCrmCard"><div class="nxOpsHead"><div><h3>Historial de seguimiento</h3><div class="nxOpsFilter">Llamadas, notas, documentos y acciones</div></div><button type="button" class="nxCrmBtn" onclick="nxCrmNuevaActividadCliente()"><i class="ti ti-plus"></i> Nota</button></div>'+tl+'</section><section class="nxCrmCard"><div class="nxOpsHead"><div><h3>Tareas</h3><div class="nxOpsFilter">Pendientes de resolver</div></div><button type="button" class="nxCrmBtn" onclick="nxCrmNuevaTareaCliente()"><i class="ti ti-plus"></i> Tarea</button></div><div class="nxOpsRows">'+fichaTareasHtml(pend,hechas)+'</div></section></div>';
}
let fichaPeticion=0;
async function cargarSeguimientoCliente(id){
  const body=$('#c360TabBody'),A=api();if(!body||!A||!A.get)return;
  const req=++fichaPeticion;
  const vigente=()=>req===fichaPeticion&&fichaAbiertaDe(id)&&$('#c360TabBody')===body;
  body.innerHTML='<div class="nxCrmEmpty">Cargando seguimiento…</div>';
  try{
    const q=encodeURIComponent(id);
    const [acts,pend,hechas]=await Promise.all([
      A.get('crm_actividades','cliente_id=eq.'+q+'&order=created_at.desc&limit=40&select=*'),
      A.get('crm_tareas','cliente_id=eq.'+q+'&estado=eq.pendiente&order=vence_en.asc.nullslast&select=*'),
      A.get('crm_tareas','cliente_id=eq.'+q+'&estado=eq.completada&order=completada_en.desc&limit=5&select=*')
    ]);
    if(!vigente())return;
    (pend||[]).concat(hechas||[]).forEach(t=>S.recientes.set(String(t.id),t));
    body.innerHTML=seguimientoHtml(acts||[],pend||[],hechas||[]);
  }catch(e){if(vigente())body.innerHTML='<div class="nxCrmEmpty">'+esc(errTxt(e))+'</div>'}
}
function modalActividadCliente(){
  let id='';try{id=typeof _c360Sel!=='undefined'&&_c360Sel?_c360Sel:''}catch(e){}
  if(!id){toastFn('warn','Abre primero la ficha de un cliente');return}
  const c=cliente(id);
  const m=modal('nxOpsModal','<h2 id="nxOpsModalT"><i class="ti ti-notes"></i> Registrar seguimiento</h2><p>'+esc(c?c.nom:'Cliente')+' · queda guardado en su historial.</p><div class="nxOpsGrid"><div class="nxOpsField"><label for="nxActTipo">Canal</label><select id="nxActTipo"><option value="llamada">Llamada</option><option value="whatsapp">WhatsApp</option><option value="nota">Nota</option><option value="documento">Documento</option><option value="cotizacion">Cotización</option><option value="cobro">Cobro</option></select></div><div class="nxOpsField"><label for="nxActProxima">Próximo seguimiento</label><input id="nxActProxima" type="datetime-local"></div><div class="nxOpsField full"><label for="nxActTitulo">Resumen</label><input id="nxActTitulo" data-autofocus maxlength="160" placeholder="Ej.: Cliente confirmó envío de documentos"></div><div class="nxOpsField full"><label for="nxActDetalle">Resultado / detalle</label><textarea id="nxActDetalle" maxlength="1500" placeholder="Qué se conversó, qué falta y qué se acordó"></textarea></div><div class="nxOpsField full"><label class="chk"><input id="nxActCrearTarea" type="checkbox"> Crear una tarea para el próximo seguimiento</label></div></div><div class="nxOpsFoot"><button type="button" onclick="nxCrmCerrarTarea()">Cancelar</button><button type="button" class="primary" id="nxActGuardar" onclick="nxCrmGuardarActividadCliente()">Guardar seguimiento</button></div>');
  m.dataset.clienteId=String(id);
}
window.nxCrmNuevaActividadCliente=modalActividadCliente;
window.nxCrmGuardarActividadCliente=async()=>{
  if(S.guardando)return;
  const id=$('#nxOpsModal')?.dataset?.clienteId||'',A=api(),tipo=$('#nxActTipo')?.value,tit=title($('#nxActTitulo')?.value),detalle=($('#nxActDetalle')?.value||'').trim(),proxima=$('#nxActProxima')?.value,crear=!!$('#nxActCrearTarea')?.checked;
  if(!A||!A.post){toastFn('err','Sin conexión con el sistema','Recarga la página');return}
  if(!id||tit.length<2){toastFn('warn','Escribe el resumen del seguimiento','Mínimo 2 letras');return}
  const when=isoLocal(proxima);if(proxima&&!when){toastFn('warn','Fecha del próximo seguimiento inválida');return}
  if(crear&&!when){toastFn('warn','Elige la fecha para crear la tarea');return}
  S.guardando=true;const b=$('#nxActGuardar');if(b){b.disabled=true;b.textContent='Guardando…'}
  try{
    await registrarActividad(A,{cliente_id:id,tipo,titulo:tit,detalle:detalle||null,proxima_accion_en:when,crear_tarea:crear&&!!when,tarea_titulo:title('Seguimiento: '+tit),tarea_tipo:'seguimiento',prioridad:'media'});
    S.guardando=false;cerrarModal('nxOpsModal');
    audit('CRM_SEGUIMIENTO_REGISTRADO',tit,id);toastFn('ok','Seguimiento registrado',tit);
    await refrescarFichaSi(id);if(crear)await cargar({fresh:true});
  }catch(e){S.guardando=false;toastFn('err','No se pudo guardar el seguimiento',errTxt(e));if(b){b.disabled=false;b.textContent='Guardar seguimiento'}}
};

// Cabecera y KPIs de la vista Clientes (existían en parches-crm-seguros.js; se conservan).
function headerClientes(){
  const v=$('#v-clientes');if(!v)return null;v.classList.add('nxCrm');
  let h=$('#nxCrmHead');
  if(!h){h=document.createElement('div');h.id='nxCrmHead';h.className='nxCrmHead';h.innerHTML='<div><span class="nxCrmTag" role="button" tabindex="0" title="Abrir CRM">CRM · Seguros de salud</span><h1>Cartera de clientes</h1><p>Clientes, pólizas, dependientes, cobros y seguimiento en una sola vista.</p></div><div class="nxCrmPulse"><div><b id="nxCrmVidas">0</b><span>Vidas aseguradas</span></div><div><b id="nxCrmPol">0</b><span>Pólizas vigentes</span></div><div><b id="nxCrmProc">0</b><span>En proceso</span></div></div>';const k=$('#cliKpis');k?.parentNode?.insertBefore(h,k);const tag=h.querySelector('.nxCrmTag');tag.onclick=()=>open(null);tag.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(null)}}}
  return h;
}
function kpisClientes(){
  if(!headerClientes())return;nuevoRender();
  const all=clientes(),act=all.filter(c=>c.activo!==false),vidas=act.reduce((n,c)=>n+1+deps(c).length,0),vig=act.filter(c=>c.numero_poliza&&!['vencida','cancelada'].includes(polEstado(c).est)).length,proc=all.filter(c=>c.estado_cliente==='EN_PROCESO').length,con=act.filter(c=>balance(c)>0),monto=con.reduce((n,c)=>n+balance(c),0),aldia=act.length-con.length,riesgo=act.filter(c=>mesesAtraso(c)>=2).length;
  const set=(x,v)=>{const e=document.getElementById(x);if(e)e.textContent=v};
  set('nxCrmVidas',vidas);set('nxCrmPol',vig);set('nxCrmProc',proc);set('cliKpiTotal',act.length);set('cliKpiTotalSub',vidas+' vidas aseguradas');set('cliKpiAlDia',aldia);set('cliKpiPendCount',money(monto));set('cliKpiPendRD',con.length+' clientes');set('cliKpiRenuevan',riesgo);
  const k=$('#cliKpis');if(!k)return;
  const tiles=k.querySelectorAll('.sf-kpi');if(tiles.length>=4)tiles[3].className='sf-kpi err';
  const ics=k.querySelectorAll('.sf-kpi .ic i');if(ics.length>=4)ics[3].className='ti ti-user-exclamation';
  const ls=k.querySelectorAll('.sf-kpi .lb');if(ls.length>=4)['Clientes activos','Al día','Pendiente por cobrar','En riesgo'].forEach((t,i)=>ls[i].textContent=t);
  const subs=k.querySelectorAll('.sf-kpi .sub');if(subs.length>=4)subs[3].textContent='2+ meses de atraso';
}
function depHtml(c,all){const d=deps(c),xs=all?d:d.slice(0,4);if(!d.length)return '<div class="nxCrmEmpty">No hay dependientes registrados.</div>';return '<div class="nxCrmDeps">'+xs.map(x=>'<div class="nxCrmDep"><div class="nxCrmAv">'+esc(initials(x.nom))+'</div><div class="txt"><b>'+esc(x.nom||'Dependiente')+'</b><span>'+esc(x.rel||'Dependiente')+(x.cedula?' · '+esc(x.cedula):'')+'</span></div><span class="nxCrmIncluded">Incluido</span></div>').join('')+'</div>'}
function resumen(c,cache){
  const b=balance(c),p=polEstado(c),cl=['vencida','cancelada'].includes(p.est)?'err':b>0?'warn':'';
  const last=Array.isArray(cache&&cache.abonos)&&cache.abonos.length?cache.abonos.slice().sort((a,z)=>String(z.fecha||z.created_at||'').localeCompare(String(a.fecha||a.created_at||'')))[0]:null;
  const x=idSafe(c.id),f=(k,v)=>'<div class="nxCrmField"><small>'+k+'</small><b>'+v+'</b></div>';
  return '<div class="nxCrmGrid"><section class="nxCrmCard"><div class="nxCrmTitle"><h3>Seguro de salud</h3><span class="nxCrmState '+cl+'">'+esc(p.lbl||'Activa')+'</span></div><div class="nxCrmFields">'+f('ARS',esc(c.ars||'Sin ARS'))+f('Plan',esc(c.plan||'Sin plan'))+f('Póliza',esc(c.numero_poliza||'Sin número asignado'))+f('Prima mensual',money(prima(c)))+f('Inicio de cobertura',fechaLarga(c.fecha_inicio))+f('Día de facturación',esc(c.dia_facturacion||'—'))+f('Agente',esc(agenteNom(c)))+f('Empresa',esc(empresaNom(c)))+f('Dependientes',deps(c).length)+f('Último cobro',last?money(last.monto):'—')+'</div></section><div><section class="nxCrmCard"><div class="nxCrmTitle"><h3>Estado de cobro</h3></div><div class="nxCrmAmount '+(b>0?'debt':'')+'">'+money(b)+'</div><div class="nxCrmHint">'+(b>0?'Balance pendiente del cliente.':'Cliente al día, sin balance pendiente.')+'</div><div class="nxCrmActs"><button type="button" class="wa" onclick="nxWaElegir(\''+x+'\')">WhatsApp</button><button type="button" class="pay" onclick="abrirAbono(\''+x+'\')">Cobrar</button><button type="button" onclick="editarCli(\''+x+'\')">Editar</button></div></section><section class="nxCrmCard"><div class="nxCrmTitle"><h3>Dependientes ('+deps(c).length+')</h3><button type="button" class="nxCrmBtn" onclick="nxCrmTab(\'dependientes\')">Ver todos</button></div>'+depHtml(c,false)+'</section></div></div>';
}
function preparar(){
  const v=$('#v-cliente360');if(!v)return;
  if(!window.__nxCrmCtx){v.classList.remove('nxCrm');return}
  v.classList.add('nxCrm');const b=$('#c360TabsBar');if(!b)return;
  ['financiamiento','facturas','pos','equipos','historial'].forEach(k=>{const x=$('#c360tab-'+k);if(x)x.style.display='none'});
  const s=$('#c360tab-seguros');if(s)s.innerHTML='<i class="ti ti-shield-heart"></i> Póliza';
  const p=$('#c360tab-pagos');if(p)p.innerHTML='<i class="ti ti-wallet"></i> Cobros';
  const a=$('#c360tab-actividad');if(a)a.innerHTML='<i class="ti ti-activity"></i> Seguimiento';
  let d=$('#c360tab-dependientes');
  if(!d){d=document.createElement('button');d.className='nxft-tab';d.id='c360tab-dependientes';d.type='button';d.onclick=()=>window.nxCrmTab('dependientes');d.innerHTML='<i class="ti ti-users-group"></i> Dependientes'}
  const docs=$('#c360tab-documentos');docs?b.insertBefore(d,docs):b.appendChild(d);
  ['resumen','seguros','dependientes','pagos','documentos','actividad'].forEach(k=>{const x=$('#c360tab-'+k);if(x)b.appendChild(x)});
}
window.nxCrmTab=t=>{try{_c360Tab=t}catch(e){}document.querySelectorAll('#c360TabsBar .nxft-tab').forEach(x=>x.classList.remove('is-active'));$('#c360tab-'+t)?.classList.add('is-active');try{pintarC360Tab()}catch(e){console.error('[CRM]',e)}};
function patchFicha(){
  try{if(typeof rCli==='function'&&!rCli.__nxCrm){const o=rCli,n=function(){const z=o.apply(this,arguments);try{kpisClientes()}catch(e){}return z};n.__nxCrm=1;rCli=window.rCli=n}}catch(e){}
  try{if(typeof rCliente360==='function'&&!rCliente360.__nxCrm){const o=rCliente360,n=function(){const z=o.apply(this,arguments);try{preparar()}catch(e){}return z};n.__nxCrm=1;rCliente360=window.rCliente360=n}}catch(e){}
  // pintarC360Expediente reconstruye #c360TabsBar en cada apertura: sin envolverlo, preparar() nunca corría.
  try{if(typeof pintarC360Expediente==='function'&&!pintarC360Expediente.__nxCrm){const o=pintarC360Expediente,n=function(){const z=o.apply(this,arguments);try{preparar();if(window.__nxCrmCtx&&typeof _c360Tab!=='undefined'&&_c360Tab==='resumen')pintarC360Tab()}catch(e){}return z};n.__nxCrm=1;pintarC360Expediente=window.pintarC360Expediente=n}}catch(e){}
  try{if(typeof pintarC360Tab==='function'&&!pintarC360Tab.__nxCrm){const o=pintarC360Tab,n=function(){
    try{
      if(window.__nxCrmCtx&&typeof _c360Sel!=='undefined'&&_c360Sel&&typeof _c360Tab!=='undefined'){
        const c=cliente(_c360Sel),body=$('#c360TabBody');
        if(c&&body){
          if(_c360Tab==='resumen'){const ca=(typeof _c360Cache!=='undefined'&&_c360Cache&&_c360Cache[c.id])||{};body.innerHTML=resumen(c,ca);return}
          if(_c360Tab==='dependientes'){body.innerHTML='<section class="nxCrmCard"><div class="nxCrmTitle"><h3>Dependientes ('+deps(c).length+')</h3><button type="button" class="nxCrmBtn" onclick="editarCli(\''+idSafe(c.id)+'\')">Editar cliente</button></div>'+depHtml(c,true)+'</section>';return}
          if(_c360Tab==='actividad'){cargarSeguimientoCliente(c.id);return}
        }
      }
    }catch(e){console.error('[CRM] ficha',e)}
    return o.apply(this,arguments)};n.__nxCrm=1;pintarC360Tab=window.pintarC360Tab=n}}catch(e){}
}

/* ───────────────────────── Prospectos ───────────────────────── */
const prospecto=id=>S.pros.find(p=>String(p.id)===String(id));
async function cargarProspectos(force){
  const A=api();if(!A||!A.get)return;
  if(S.prosDisp===false&&!force)return;
  const gen=++S.prosGen;S.prosCargando=true;S.prosError='';pintarProspectos();
  try{
    const r=await A.get('crm_prospectos','select=*&order=etapa_cambiada_en.desc&limit=1000');
    if(gen!==S.prosGen)return;
    S.pros=r||[];S.prosDisp=true;
  }catch(e){
    if(gen!==S.prosGen)return;
    if(tablaNoExiste(e)){S.prosDisp=false;S.pros=[];try{console.warn('[CRM] crm_prospectos no existe todavía (migración pendiente)')}catch(x){}}
    else S.prosError=errTxt(e);
  }
  S.prosCargando=false;pintarProspectos();
  // El contador de la pestaña vive en la cabecera: se repinta sin tocar el resto.
  try{const b=$('#v-crm .nxCrmSeg button:nth-child(2)');if(b){const n=S.pros.filter(p=>ABIERTAS.includes(p.etapa)).length;b.innerHTML='<i class="ti ti-target-arrow"></i> Prospectos'+(n?' <span class="n">'+n+'</span>':'')}}catch(e){}
}
function coincidePros(p){const q=S.qPros.trim().toLowerCase();if(!q)return true;const d=q.replace(/\D/g,'');return String(p.nombre||'').toLowerCase().includes(q)||String(p.interes||'').toLowerCase().includes(q)||(d&&String(p.telefono||'').replace(/\D/g,'').includes(d))}
function prosCardHtml(p){
  const dias=diasDesde(p.etapa_cambiada_en||p.created_at),stale=ABIERTAS.includes(p.etapa)&&dias>=DIAS_SIN_MOVIMIENTO,ag=agente(p.asignado_agente_id),wa=waNum(p.telefono),tel=String(p.telefono||'').replace(/\D/g,''),x=idSafe(p.id);
  return '<article class="nxProsCard '+(stale?'is-stale':'')+'" role="button" tabindex="0" onclick="nxCrm.prosAbrir(\''+x+'\')" onkeydown="nxCrm.tecla(event,this)" aria-label="'+esc(p.nombre)+', '+esc(etNom(p.etapa))+'"><div class="nxProsTop"><b>'+esc(p.nombre||'Sin nombre')+'</b><span class="nxProsDias" title="Días en esta etapa">'+dias+' d</span></div><div class="nxProsMeta">'+esc([p.interes||'Sin producto definido',p.aseguradora].filter(Boolean).join(' · '))+'</div><div class="nxProsMeta">'+esc([ag?ag.nom:'Sin asignar',p.origen].filter(Boolean).join(' · '))+(p.prima_estimada?' · '+money(p.prima_estimada)+'/mes':'')+'</div><div class="nxProsActs">'+(tel?'<a class="nxProsBtn" href="tel:'+esc(tel)+'" aria-label="Llamar a '+esc(p.nombre)+'" onclick="event.stopPropagation()"><i class="ti ti-phone"></i></a>':'')+(wa?'<a class="nxProsBtn wa" href="https://wa.me/'+wa+'" target="_blank" rel="noopener" aria-label="Abrir WhatsApp de '+esc(p.nombre)+'" onclick="event.stopPropagation()"><i class="ti ti-brand-whatsapp"></i></a>':'')+(p.etapa!=='emitida'?'<button type="button" class="nxProsBtn primary" onclick="event.stopPropagation();nxCrm.prosPasar(\''+x+'\')"><i class="ti ti-arrow-right"></i> Pasar a…</button>':(p.cliente_id?'<button type="button" class="nxProsBtn primary" onclick="event.stopPropagation();nxCrmAbrirCliente(\''+idSafe(p.cliente_id)+'\')"><i class="ti ti-user-check"></i> Ver cliente</button>':''))+'</div></article>';
}
function pintarProspectos(){
  const host=$('#nxCrmProsHost');if(!host)return;
  if(S.prosDisp===false){
    host.innerHTML='<div class="nxProsPend"><i class="ti ti-plug-connected-x"></i><h3>Prospectos · pendiente de activar</h3><p>El embudo de prospectos ya está listo en la aplicación, pero la tabla <b>crm_prospectos</b> todavía no se ha creado en la base de datos. Cuando el dueño autorice aplicar la migración, esta sección se activa sola.</p><div style="margin-top:12px"><button type="button" class="nxCrmBtn" onclick="nxCrm.prosRecargar()"><i class="ti ti-refresh"></i> Volver a comprobar</button></div></div>';
    return;
  }
  if(S.prosError){host.innerHTML='<div class="nxProsPend"><i class="ti ti-alert-triangle"></i><h3>No se pudieron cargar los prospectos</h3><p>'+esc(S.prosError)+'</p><div style="margin-top:12px"><button type="button" class="nxCrmBtn" onclick="nxCrm.prosRecargar()"><i class="ti ti-refresh"></i> Reintentar</button></div></div>';return}
  if(S.prosCargando&&!S.pros.length){host.innerHTML='<div class="nxCrmEmpty">Cargando prospectos…</div>';return}
  const mes=hoyISO().slice(0,7);
  const porEtapa=k=>S.pros.filter(p=>p.etapa===k);
  const sinMov=S.pros.filter(p=>ABIERTAS.includes(p.etapa)&&diasDesde(p.etapa_cambiada_en||p.created_at)>=DIAS_SIN_MOVIMIENTO);
  const perdMes=S.pros.filter(p=>p.etapa==='perdida'&&diaRD(p.etapa_cambiada_en).slice(0,7)===mes);
  const motivos=MOTIVOS.map(m=>[m[1],perdMes.filter(p=>p.motivo_perdida===m[0]).length]).filter(x=>x[1]>0);
  const emitMes=S.pros.filter(p=>p.etapa==='emitida'&&diaRD(p.etapa_cambiada_en).slice(0,7)===mes).length;
  const kpi=(l,v,s)=>'<div class="nxCrmKpi"><div class="l">'+l+'</div><div class="v">'+v+'</div><div class="s">'+s+'</div></div>';
  const kpis='<div class="nxProsKpis">'+kpi('Nuevos',porEtapa('nuevo').length,'sin contactar')+kpi('Cotizados',porEtapa('cotizado').length,'con propuesta')+kpi('Documentos',porEtapa('documentos').length,'en trámite')+kpi('Emitidas',emitMes,'este mes')+kpi('Sin movimiento',sinMov.length,DIAS_SIN_MOVIMIENTO+'+ días sin cambio')+kpi('Perdidos del mes',perdMes.length,motivos.length?motivos.map(x=>x[0]+' '+x[1]).join(' · '):'sin pérdidas')+'</div>';
  const tools='<div class="nxCrmTools"><label class="nxCrmSearch"><i class="ti ti-search"></i><input id="nxCrmQPros" type="search" placeholder="Buscar prospecto…" aria-label="Buscar prospecto" value="'+esc(S.qPros)+'" oninput="nxCrm.prosBuscar(this.value)"></label><button type="button" class="nxCrmLink" onclick="nxCrm.prosRecargar()" aria-label="Actualizar prospectos"><i class="ti ti-refresh"></i></button><button type="button" class="nxCrmLink" onclick="nxCrm.prosNuevo()" style="background:linear-gradient(135deg,var(--crm-b),var(--crm-b3));border-color:transparent;color:#fff"><i class="ti ti-plus"></i> Nuevo prospecto</button></div>';
  const cols=ETAPAS.filter(e=>e[0]!=='perdida').map(e=>{const l=porEtapa(e[0]).filter(coincidePros).sort((a,b)=>String(a.etapa_cambiada_en).localeCompare(String(b.etapa_cambiada_en)));return '<section class="nxProsCol e-'+e[0]+'" aria-label="'+e[1]+'"><div class="nxProsColH"><h3><i class="ti '+e[2]+'"></i> '+e[1]+'</h3><span class="n">'+l.length+'</span></div><div class="nxProsCards">'+(l.length?l.map(prosCardHtml).join(''):'<div class="nxCrmEmpty">'+(e[0]==='nuevo'?'Sin prospectos nuevos.':'Nada en esta etapa.')+'</div>')+'</div></section>'}).join('');
  const perd=porEtapa('perdida').filter(coincidePros).sort((a,b)=>String(b.etapa_cambiada_en).localeCompare(String(a.etapa_cambiada_en)));
  const perdidos='<section class="nxCrmPanel nxProsPerdidos"><div class="nxOpsHead"><div><h3>Perdidos</h3><div class="nxOpsFilter">'+perd.length+' en total · se pueden reabrir</div></div></div><div class="nxOpsRows">'+(perd.length?perd.slice(0,12).map(p=>'<div class="nxOpsTask" role="button" tabindex="0" onclick="nxCrm.prosAbrir(\''+idSafe(p.id)+'\')" onkeydown="nxCrm.tecla(event,this)"><div class="nxCrmAv" style="background:#fff1f2;color:#dc2626"><i class="ti ti-circle-x"></i></div><div class="nxOpsBody"><b>'+esc(p.nombre)+'</b><span>'+esc(motivoNom(p.motivo_perdida))+(p.motivo_detalle?' · '+esc(p.motivo_detalle):'')+' · '+esc(fechaLarga(p.etapa_cambiada_en))+'</span></div><button type="button" class="nxProsBtn" onclick="event.stopPropagation();nxCrm.prosPasar(\''+idSafe(p.id)+'\')">Reabrir</button></div>').join(''):'<div class="nxOpsEmpty">No hay prospectos perdidos.</div>')+'</div></section>';
  host.innerHTML=kpis+tools+'<div class="nxProsBoard">'+cols+'</div>'+perdidos;
}
function modalProspecto(p){
  const nuevo=!p;p=p||{etapa:'nuevo',origen:'WhatsApp'};
  const ars=(()=>{try{return Array.isArray(_arsList)?_arsList:[]}catch(e){return []}})();
  const datalist='<datalist id="nxProsArsList">'+ars.map(a=>'<option value="'+esc(a)+'">').join('')+'</datalist>';
  return '<div class="nxOpsGrid"><div class="nxOpsField full"><label for="nxProsNom">Nombre *</label><input id="nxProsNom" data-autofocus maxlength="120" value="'+esc(p.nombre||'')+'" placeholder="Nombre de la persona o empresa"></div><div class="nxOpsField"><label for="nxProsTel">Teléfono / WhatsApp *</label><input id="nxProsTel" inputmode="tel" maxlength="20" value="'+esc(p.telefono||'')+'" placeholder="8091234567"></div><div class="nxOpsField"><label for="nxProsCed">Cédula (opcional)</label><input id="nxProsCed" maxlength="20" value="'+esc(p.cedula||'')+'" placeholder="000-0000000-0"></div><div class="nxOpsField"><label for="nxProsInt">Producto de interés</label><input id="nxProsInt" maxlength="120" value="'+esc(p.interes||'')+'" placeholder="Ej.: Plan de salud familiar"></div><div class="nxOpsField"><label for="nxProsArs">ARS / aseguradora</label><input id="nxProsArs" list="nxProsArsList" maxlength="80" value="'+esc(p.aseguradora||'')+'" placeholder="Opcional">'+datalist+'</div><div class="nxOpsField"><label for="nxProsOrigen">Origen</label><select id="nxProsOrigen">'+ORIGENES.map(o=>'<option'+(o===(p.origen||'WhatsApp')?' selected':'')+'>'+o+'</option>').join('')+'</select></div><div class="nxOpsField"><label for="nxProsAg">Responsable</label><select id="nxProsAg">'+optAgentes(p.asignado_agente_id||(nuevo?S.miAgente:''))+'</select></div><div class="nxOpsField"><label for="nxProsPrima">Prima estimada (RD$, informativa)</label><input id="nxProsPrima" inputmode="decimal" value="'+(p.prima_estimada?Math.round(Number(p.prima_estimada)):'')+'" placeholder="0"></div><div class="nxOpsField full"><label for="nxProsNotas">Notas</label><textarea id="nxProsNotas" maxlength="2000" placeholder="Qué busca, qué le preocupa, cuándo volver a llamar">'+esc(p.notas||'')+'</textarea></div></div>';
}
function leerProspecto(){
  const g=id=>($('#'+id)?.value||'').trim();
  const prima=g('nxProsPrima').replace(/[^\d.]/g,'');
  return {nombre:g('nxProsNom').slice(0,120),telefono:g('nxProsTel').slice(0,20),cedula:g('nxProsCed').slice(0,20)||null,interes:g('nxProsInt').slice(0,120)||null,aseguradora:g('nxProsArs').slice(0,80)||null,origen:g('nxProsOrigen')||'Otro',asignado_agente_id:g('nxProsAg')||null,prima_estimada:prima?Number(prima):null,notas:g('nxProsNotas').slice(0,2000)||null};
}
function validarProspecto(d){
  if(d.nombre.length<2){toastFn('warn','Escribe el nombre del prospecto','Mínimo 2 letras');$('#nxProsNom')?.focus();return false}
  if(String(d.telefono).replace(/\D/g,'').length<10){toastFn('warn','Teléfono incompleto','Escribe los 10 dígitos (ej. 8091234567)');$('#nxProsTel')?.focus();return false}
  return true;
}
function prosNuevo(){
  modal('nxProsModal','<h2 id="nxProsModalT"><i class="ti ti-user-plus"></i> Nuevo prospecto</h2><p>Entra al embudo en la etapa <b>Nuevo</b>. No crea cliente ni factura.</p>'+modalProspecto(null)+'<div class="nxOpsFoot"><button type="button" onclick="nxCrm.cerrar(\'nxProsModal\')">Cancelar</button><button type="button" class="primary" id="nxProsGuardar" onclick="nxCrm.prosGuardarNuevo()">Guardar prospecto</button></div>');
}
async function prosGuardarNuevo(){
  if(S.guardando)return;const A=api();const d=leerProspecto();if(!validarProspecto(d))return;
  if(!A||!A.post){toastFn('err','Sin conexión con el sistema');return}
  S.guardando=true;const b=$('#nxProsGuardar');if(b){b.disabled=true;b.textContent='Guardando…'}
  try{
    const r=await A.post('crm_prospectos',{...d,etapa:'nuevo'});const fila=Array.isArray(r)?r[0]:r;
    if(fila&&fila.id)S.pros.unshift(fila);
    S.guardando=false;cerrarModal('nxProsModal');audit('CRM_PROSPECTO_CREADO',d.nombre);toastFn('ok','Prospecto guardado',d.nombre);
    pintarProspectos();cargarProspectos(true);
  }catch(e){S.guardando=false;toastFn('err','No se pudo guardar el prospecto',errTxt(e));if(b){b.disabled=false;b.textContent='Guardar prospecto'}}
}
async function prosGuardarCambios(id){
  if(S.guardando)return;const p=prospecto(id),A=api();if(!p||!A)return;const d=leerProspecto();if(!validarProspecto(d))return;
  S.guardando=true;const b=$('#nxProsGuardarCambios');if(b){b.disabled=true;b.textContent='Guardando…'}
  const antes={...p};Object.assign(p,d);pintarProspectos();
  try{const r=await A.patch('crm_prospectos','id=eq.'+encodeURIComponent(id),d);const fila=Array.isArray(r)?r[0]:r;if(fila&&fila.id)Object.assign(p,fila);S.guardando=false;toastFn('ok','Prospecto actualizado',p.nombre);pintarFichaProspecto()}
  catch(e){Object.assign(p,antes);S.guardando=false;pintarProspectos();toastFn('err','No se pudieron guardar los cambios',errTxt(e));if(b){b.disabled=false;b.textContent='Guardar cambios'}}
}
function prosPasar(id){
  const p=prospecto(id);if(!p)return;
  const ops=ETAPAS.filter(e=>e[0]!==p.etapa).map(e=>'<button type="button" class="'+(e[0]==='perdida'?'perdida':'')+'" onclick="nxCrm.prosMover(\''+idSafe(id)+'\',\''+e[0]+'\')"><i class="ti '+e[2]+'"></i> '+e[1]+(e[0]==='emitida'?' <small style="color:#5b6577;font-weight:700">· vincular cliente</small>':e[0]==='perdida'?' <small style="color:#5b6577;font-weight:700">· pide motivo</small>':'')+'</button>').join('');
  modal('nxProsPasar','<h2 id="nxProsPasarT"><i class="ti ti-arrows-right"></i> Pasar a…</h2><p>'+esc(p.nombre)+' está en <b>'+esc(etNom(p.etapa))+'</b>. Elige la nueva etapa.</p><div class="nxCrmOpciones">'+ops+'</div><div class="nxOpsFoot"><button type="button" onclick="nxCrm.cerrar(\'nxProsPasar\')">Cancelar</button></div>');
}
async function prosMover(id,etapa,extra){
  const p=prospecto(id),A=api();if(!p||!A||!ETAPAS.some(e=>e[0]===etapa))return;
  if(p.etapa===etapa&&!extra){cerrarModal('nxProsPasar');return}
  if(etapa==='perdida'&&!extra){modalMotivo(id);return}
  if(etapa==='emitida'&&!(extra&&extra.cliente_id)){modalEmitida(id);return}
  cerrarModal('nxProsPasar');cerrarModal('nxProsMotivo');cerrarModal('nxProsEmitida');
  const body={etapa};
  if(etapa==='perdida'){body.motivo_perdida=extra.motivo;body.motivo_detalle=extra.detalle||null}
  else{body.motivo_perdida=null;body.motivo_detalle=null}
  if(etapa==='emitida'){body.cliente_id=extra.cliente_id;if(extra.numero_poliza)body.numero_poliza=extra.numero_poliza}
  // Optimista: se pinta ya y, si el servidor falla, se devuelve a como estaba.
  const antes={...p};Object.assign(p,body,{etapa_cambiada_en:new Date().toISOString()});pintarProspectos();pintarFichaProspecto();
  try{
    const r=await A.patch('crm_prospectos','id=eq.'+encodeURIComponent(id),body);const fila=Array.isArray(r)?r[0]:r;if(fila&&fila.id)Object.assign(p,fila);
    audit('CRM_PROSPECTO_ETAPA',p.nombre+' → '+etNom(etapa),p.cliente_id||null);
    toastFn('ok',etNom(etapa),p.nombre);
    pintarProspectos();if(S.ficha&&String(S.ficha)===String(id)){await cargarHistorial(id);pintarFichaProspecto()}
  }catch(e){Object.assign(p,antes);pintarProspectos();pintarFichaProspecto();toastFn('err','No se pudo mover el prospecto',errTxt(e))}
}
function modalMotivo(id){
  const p=prospecto(id);if(!p)return;
  modal('nxProsMotivo','<h2 id="nxProsMotivoT"><i class="ti ti-circle-x" style="color:#dc2626"></i> ¿Por qué se perdió?</h2><p>'+esc(p.nombre)+' · el motivo queda en el historial.</p><div class="nxCrmOpciones" role="radiogroup" aria-label="Motivo">'+MOTIVOS.map(m=>'<button type="button" role="radio" aria-checked="false" data-m="'+m[0]+'" onclick="nxCrm.prosMotivoElegir(this)"><i class="ti ti-circle"></i> '+m[1]+'</button>').join('')+'</div><div class="nxOpsField full" style="margin-top:10px"><label for="nxProsMotTx">Detalle (opcional)</label><input id="nxProsMotTx" maxlength="300" placeholder="Ej.: se fue con ARS X por RD$ 500 menos"></div><div class="nxOpsFoot"><button type="button" onclick="nxCrm.cerrar(\'nxProsMotivo\')">Cancelar</button><button type="button" class="danger" id="nxProsMotOk" disabled onclick="nxCrm.prosMotivoOk(\''+idSafe(id)+'\')">Marcar como perdido</button></div>');
}
function prosMotivoElegir(btn){
  const m=btn.closest('.nxCrmModal');if(!m)return;
  m.querySelectorAll('[role=radio]').forEach(b=>{b.setAttribute('aria-checked','false');b.querySelector('i').className='ti ti-circle'});
  btn.setAttribute('aria-checked','true');btn.querySelector('i').className='ti ti-circle-check';m.dataset.motivo=btn.dataset.m;
  const ok=m.querySelector('#nxProsMotOk');if(ok)ok.disabled=false;
}
function prosMotivoOk(id){
  const m=$('#nxProsMotivo');const motivo=m&&m.dataset.motivo;
  if(!motivo){toastFn('warn','Elige un motivo de la lista');return}
  prosMover(id,'perdida',{motivo,detalle:($('#nxProsMotTx')?.value||'').trim().slice(0,300)||null});
}
function modalEmitida(id){
  const p=prospecto(id);if(!p)return;
  modal('nxProsEmitida','<h2 id="nxProsEmitidaT"><i class="ti ti-shield-check" style="color:#0f9d50"></i> Póliza emitida</h2><p>Vincula al cliente real de <b>'+esc(p.nombre)+'</b>. Esto no crea facturas ni cobros.</p><div class="nxOpsGrid">'+pickerHtml('nxProsCli','Cliente existente',p.cliente_id||'')+'<div class="nxOpsField full" style="text-align:center;color:#5b6577;font-size:12px;font-weight:800">— o —</div><div class="nxOpsField full"><button type="button" class="nxCrmBtn" style="width:100%" onclick="nxCrm.prosCrearCliente(\''+idSafe(id)+'\')"><i class="ti ti-user-plus"></i> Crear cliente nuevo con estos datos</button></div><div class="nxOpsField full"><label for="nxProsPol">Número de póliza (opcional)</label><input id="nxProsPol" maxlength="60" value="'+esc(p.numero_poliza||'')+'" placeholder="Se puede completar después"></div></div><div class="nxOpsFoot"><button type="button" onclick="nxCrm.cerrar(\'nxProsEmitida\')">Cancelar</button><button type="button" class="primary" onclick="nxCrm.prosEmitidaOk(\''+idSafe(id)+'\')">Marcar como emitida</button></div>');
}
function prosEmitidaOk(id){
  const cid=$('#nxProsCli')?.value;
  if(!cid){toastFn('warn','Vincula un cliente','Búscalo en la lista o créalo con el botón');try{$('#nxProsCliQ')?.focus()}catch(e){}return}
  prosMover(id,'emitida',{cliente_id:cid,numero_poliza:($('#nxProsPol')?.value||'').trim().slice(0,60)||null});
}
// Crear cliente desde el prospecto: usa la MISMA pantalla de Nuevo cliente del sistema (abrirNuevoCli/guardarCli).
function prosCrearCliente(id){
  const p=prospecto(id);if(!p)return;
  if(typeof abrirNuevoCli!=='function'){toastFn('warn','La pantalla de Nuevo cliente no está disponible');return}
  cerrarModal('nxProsEmitida');cerrarModal('nxProsFicha');
  try{abrirNuevoCli()}catch(e){toastFn('err','No se pudo abrir Nuevo cliente',errTxt(e));return}
  const set=(k,v)=>{const e=document.getElementById(k);if(e&&v)e.value=v};
  set('cNom',p.nombre);set('cCed',p.cedula);set('cWA',waNum(p.telefono)||p.telefono);set('cTel',p.telefono);
  try{const a=document.getElementById('cARS');if(a&&p.aseguradora&&[...a.options].some(o=>o.value===p.aseguradora))a.value=p.aseguradora}catch(e){}
  try{const ag=document.getElementById('cAgente');if(ag&&p.asignado_agente_id&&[...ag.options].some(o=>o.value===String(p.asignado_agente_id)))ag.value=String(p.asignado_agente_id)}catch(e){}
  S.vincularPendiente={prospectoId:p.id,antes:new Set(clientes().map(c=>String(c.id)))};
  toastFn('info','Completa y guarda el cliente','Al guardarlo, el prospecto pasa a Emitida automáticamente');
}
function patchGuardarCli(){
  try{
    if(typeof guardarCli!=='function'||guardarCli.__nxCrm)return;
    const o=guardarCli;
    const n=async function(){
      const pend=S.vincularPendiente;
      const r=await o.apply(this,arguments);
      try{
        if(pend&&S.vincularPendiente===pend){
          const nuevo=clientes().find(c=>!pend.antes.has(String(c.id)));
          if(nuevo){S.vincularPendiente=null;await prosMover(pend.prospectoId,'emitida',{cliente_id:nuevo.id,numero_poliza:nuevo.numero_poliza||null})}
        }
      }catch(e){console.error('[CRM] vincular prospecto',e)}
      return r;
    };
    n.__nxCrm=1;guardarCli=window.guardarCli=n;
  }catch(e){}
}
async function cargarHistorial(id){
  const A=api();if(!A)return;S.fichaHistCargando=true;
  try{S.fichaHist=await A.get('crm_prospectos_historial','prospecto_id=eq.'+encodeURIComponent(id)+'&order=fecha.desc&limit=200&select=*')||[]}
  catch(e){S.fichaHist=[];try{console.error('[CRM] historial prospecto',e)}catch(x){}}
  S.fichaHistCargando=false;
}
async function prosAbrir(id){
  const p=prospecto(id);if(!p)return;
  S.ficha=p.id;S.fichaHist=[];pintarFichaProspecto();
  await cargarHistorial(p.id);if(String(S.ficha)===String(p.id))pintarFichaProspecto();
}
function pintarFichaProspecto(){
  if(!S.ficha)return;const p=prospecto(S.ficha);
  if(!p){cerrarModal('nxProsFicha');S.ficha=null;return}
  const ag=agente(p.asignado_agente_id),c=p.cliente_id?cliente(p.cliente_id):null,wa=waNum(p.telefono),tel=String(p.telefono||'').replace(/\D/g,'');
  const chips='<div class="nxCrmChipsEt" role="group" aria-label="Etapa">'+ETAPAS.map(e=>'<button type="button" class="e-'+e[0]+(p.etapa===e[0]?' on':'')+'" aria-pressed="'+(p.etapa===e[0])+'" onclick="nxCrm.prosMover(\''+idSafe(p.id)+'\',\''+e[0]+'\')"><i class="ti '+e[2]+'"></i> '+e[1]+'</button>').join('')+'</div>';
  const hist=S.fichaHistCargando?'<div class="nxOpsEmpty">Cargando historial…</div>':S.fichaHist.length?'<ol class="nxCrmTL">'+S.fichaHist.map(h=>{const nota=h.tipo==='nota';const ag2=agente(h.agente_id);return '<li><div class="nxCrmAv"'+(nota?'':' style="background:#f5f3ff;color:#7c3aed"')+'><i class="ti '+(nota?'ti-notes':'ti-arrows-right')+'"></i></div><div><p>'+(nota?esc(h.nota||''):esc(etNom(h.etapa_anterior))+' → '+esc(etNom(h.etapa_nueva))+(h.nota?' · '+esc(h.nota):''))+'</p><small>'+esc(fechaLarga(h.fecha))+' '+esc(horaRD(h.fecha))+(ag2?' · '+esc(ag2.nom):'')+'</small></div></li>'}).join('')+'</ol>':'<div class="nxOpsEmpty">Sin movimientos todavía.</div>';
  const tareas=c?'<div class="nxOpsFilter">Las tareas de este prospecto se llevan en la ficha del cliente vinculado.</div><button type="button" class="nxCrmBtn" style="margin-top:8px" onclick="nxCrm.cerrar(\'nxProsFicha\');nxCrmAbrirCliente(\''+idSafe(c.id)+'\')"><i class="ti ti-user-check"></i> Abrir ficha de '+esc(c.nom)+'</button>':'<div class="nxOpsFilter">Las tareas con fecha se activan al vincular un cliente (cuando la póliza se emite). Mientras, usa las notas.</div>';
  const scroll=(()=>{try{return $('#nxProsFicha .nxCrmDialog').scrollTop}catch(e){return 0}})();
  const html='<h2 id="nxProsFichaT"><i class="ti ti-target-arrow"></i> '+esc(p.nombre)+'</h2><p class="nxCrmSub">'+esc(etNom(p.etapa))+' · '+diasDesde(p.etapa_cambiada_en||p.created_at)+' días en la etapa · creado '+esc(fechaLarga(p.created_at))+'</p>'+chips+(p.etapa==='perdida'?'<div class="nxCrmLost"><i class="ti ti-circle-x"></i> Perdido: '+esc(motivoNom(p.motivo_perdida))+(p.motivo_detalle?' · '+esc(p.motivo_detalle):'')+'</div>':'')+(c?'<div class="nxCrmPickSel" style="margin:0 0 10px"><i class="ti ti-user-check"></i> Cliente vinculado: '+esc(c.nom)+(p.numero_poliza?' · Póliza '+esc(p.numero_poliza):'')+'</div>':'')+
    '<div class="nxProsActs" style="display:flex;gap:6px;margin-bottom:6px">'+(tel?'<a class="nxCrmBtn" href="tel:'+esc(tel)+'"><i class="ti ti-phone"></i> Llamar</a>':'')+(wa?'<a class="nxCrmBtn" style="color:#0f9d50" href="https://wa.me/'+wa+'" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>':'')+'</div>'+
    '<section class="nxCrmSec"><h4>Datos</h4>'+modalProspecto(p)+'<div class="nxOpsFoot" style="position:static;margin-top:10px"><button type="button" class="primary" id="nxProsGuardarCambios" onclick="nxCrm.prosGuardarCambios(\''+idSafe(p.id)+'\')">Guardar cambios</button></div></section>'+
    '<section class="nxCrmSec"><h4>Notas</h4><div class="nxOpsField full"><label for="nxProsNotaTx">Nueva nota</label><div style="display:flex;gap:6px"><input id="nxProsNotaTx" maxlength="500" placeholder="Qué pasó o qué se acordó" onkeydown="if(event.key===\'Enter\'){event.preventDefault();nxCrm.prosNota(\''+idSafe(p.id)+'\')}"><button type="button" class="nxCrmBtn primary" onclick="nxCrm.prosNota(\''+idSafe(p.id)+'\')"><i class="ti ti-plus"></i></button></div></div></section>'+
    '<section class="nxCrmSec"><h4>Historial</h4>'+hist+'</section>'+
    '<section class="nxCrmSec"><h4>Tareas</h4>'+tareas+'</section>'+
    '<div class="nxOpsFoot"><button type="button" onclick="nxCrm.cerrar(\'nxProsFicha\')">Cerrar</button></div>';
  let m=$('#nxProsFicha');
  if(!m)m=modal('nxProsFicha','<div class="nxProsFichaBody"></div>',{wide:true});
  const d=m.querySelector('.nxCrmDialog'),focoId=document.activeElement&&m.contains(document.activeElement)?document.activeElement.id:'';
  d.innerHTML=html;try{d.scrollTop=scroll}catch(e){}
  // Repintar no debe dejar el foco en <body>: vuelve al mismo campo o al diálogo (Escape y Tab siguen funcionando).
  try{const f=focoId?d.querySelector('#'+focoId):null;(f||d).focus({preventScroll:true})}catch(e){}
}
async function prosNota(id){
  const p=prospecto(id),A=api(),tx=($('#nxProsNotaTx')?.value||'').trim().slice(0,500);
  if(!p||!A)return;if(tx.length<2){toastFn('warn','Escribe la nota','Mínimo 2 letras');return}
  const b=$('#nxProsNotaTx');if(b)b.disabled=true;
  try{await A.post('crm_prospectos_historial',{prospecto_id:p.id,tipo:'nota',etapa_anterior:p.etapa,etapa_nueva:p.etapa,nota:tx,agente_id:S.miAgente||null});toastFn('ok','Nota guardada');await cargarHistorial(p.id);pintarFichaProspecto()}
  catch(e){if(b){b.disabled=false}toastFn('err','No se pudo guardar la nota',errTxt(e))}
}

/* ───────────────────────── API pública del módulo ───────────────────────── */
window.nxCrm={
  tab(t){if(t!=='panel'&&t!=='prospectos')return;S.tab=t;try{nxPrefSet('crm_tab',t)}catch(e){}render();if(t==='prospectos'&&S.prosDisp!==false&&!S.pros.length)cargarProspectos()},
  filtro(f){S.filtro=f==='mias'?'mias':'todas';try{nxPrefSet('crm_filtro',S.filtro)}catch(e){}S.verTodas=false;render();pintarTodo();if(S.filtro==='mias'&&S.miAgente===undefined)miAgenteId().then(()=>pintarTodo())},
  buscar(q,repintar){
    // Las listas de clientes (atención/riesgo) y la agenda se repintan completas sin perder el foco ni el cursor del buscador.
    S.q=String(q||'');S.verTodas=false;const inp=$('#nxCrmQ'),pos=inp?inp.selectionStart:0;render();pintarTodo();
    if(!repintar){const i2=$('#nxCrmQ');if(i2){i2.focus();try{i2.setSelectionRange(pos,pos)}catch(e){}}}},
  verTodas(){S.verTodas=true;pintarAgenda()},
  async refrescar(){const b=$('#nxCrmRefrescar');if(b)b.classList.add('girando');S.miAgente=undefined;try{await Promise.all([cargar({fresh:true}),cargarProspectos(true)])}finally{if(b)b.classList.remove('girando')}render();pintarTodo();toastFn('ok','CRM actualizado')},
  tecla(e,el){if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click()}},
  abrirTarea(id){const t=buscarTarea(id);if(t&&t.cliente_id)abrirCliente(t.cliente_id)},
  toggleTarea,cerrar:cerrarModal,pickBuscar,pickElegir,pickTecla,
  prosAbrir,prosNuevo,prosGuardarNuevo,prosGuardarCambios,prosPasar,prosMover,prosMotivoElegir,prosMotivoOk,prosEmitidaOk,prosCrearCliente,prosNota,
  prosBuscar(q){S.qPros=String(q||'');const inp=$('#nxCrmQPros'),pos=inp?inp.selectionStart:0;pintarProspectos();const i2=$('#nxCrmQPros');if(i2){i2.focus();try{i2.setSelectionRange(pos,pos)}catch(e){}}},
  prosRecargar(){cargarProspectos(true)},
  // Solo para QA: comparar la fórmula con memoria contra la original.
  qa:{mesesAtraso:c=>{nuevoRender();return mesesAtraso(c)},mesesAtrasoLegacy,hoyISO,diaRD,errTxt,estado:()=>S}
};
// Compatibilidad con el nombre que usaba parches-crm-entrada.js.
window.nxCrmActualizarAgenda=()=>{if($('#v-crm.on'))cargar({fresh:true})};

/* ───────────────────────── Arranque ───────────────────────── */
function autoRestaurar(){
  // Si el lugar guardado era el CRM y nav('crm') corrió antes de que este archivo cargara, el título
  // quedó en "CRM" sin ninguna vista encendida: se abre el CRM para no dejar la pantalla en blanco.
  try{if(!document.querySelector('.view.on')&&($('#pttl')?.textContent||'').trim()==='CRM'&&$('#app')&&$('#app').style.display!=='none')open(null)}catch(e){}
}
function start(){
  try{if(typeof TITLES==='object'&&TITLES&&!TITLES.crm)TITLES.crm='CRM'}catch(e){}
  ensureView();ensureMenu();patchNav();patchFicha();patchGuardarCli();
  try{kpisClientes()}catch(e){}
  try{preparar()}catch(e){}
  autoRestaurar();
  window.addEventListener('nexus:reinit',()=>{try{ensureMenu();patchNav();patchFicha();patchGuardarCli();autoRestaurar()}catch(e){}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
