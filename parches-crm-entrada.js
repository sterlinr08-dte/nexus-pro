/* NEXUS PRO · Entrada real al CRM de Seguros de Salud
   Añade un módulo CRM independiente sin alterar Clientes/Pólizas/Cobros existentes. */
(function(){
'use strict';
if(window.__nxCrmEntrada20260905)return;
window.__nxCrmEntrada20260905=true;

const $=s=>document.querySelector(s);
const STX=()=>{try{return window.ST||ST||{}}catch(e){return window.ST||{}}};
const esc=v=>{try{return escHtml(String(v??''))}catch(e){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const money=v=>{try{return fmt(Number(v)||0)}catch(e){return 'RD$ '+Math.round(Number(v)||0).toLocaleString('en-US')}};
const deps=c=>Array.isArray(c&&c.deps)?c.deps:[];
const balance=c=>{try{return Number(pendTot(c))||0}catch(e){return Math.max(0,Number(c&&c.deuda_total||0)-Number(c&&c.pagado||0)+Number(c&&c.deuda_anterior||0))}};
const prima=c=>{try{return Number(getTot(c))||0}catch(e){return Number(c&&c.precio_titular||0)+deps(c).length*Number(c&&c.precio_dep||0)}};
const fecha=v=>{if(!v)return '—';try{return new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('es-DO',{day:'2-digit',month:'short',year:'numeric'})}catch(e){return String(v).slice(0,10)}};
const polEstado=c=>{try{return getEstPol(c)||{est:'vigente'}}catch(e){return {est:c&&c.activo===false?'vencida':'vigente'}}};

function ensureCss(){
  if($('#nxCrmHomeCss'))return;
  const s=document.createElement('style');s.id='nxCrmHomeCss';s.textContent=`
#v-crm{--crm-b:#2563eb;--crm-b2:#1d4ed8;--crm-bg:var(--sf-bg,#f6f8fb);--crm-card:var(--sf-card,#fff);--crm-line:var(--sf-line,#e5eaf2);--crm-tx:var(--sf-tx,#111827);--crm-muted:var(--sf-tx2,#667085);font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif;color:var(--crm-tx)}
#v-crm .nxCrmHomeHead{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}#v-crm .nxCrmHomeHead h1{font-size:24px;line-height:1.1;margin:0 0 5px}#v-crm .nxCrmHomeHead p{font-size:10px;color:var(--crm-muted);margin:0}#v-crm .nxCrmHomeBadge{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#eaf1ff;color:var(--crm-b2);font-size:8.5px;font-weight:800;margin-bottom:7px}
#v-crm .nxCrmTopActs{display:flex;gap:7px;flex-wrap:wrap}#v-crm .nxCrmTopActs button,#v-crm .nxCrmLink{height:34px;border:1px solid var(--crm-line);border-radius:10px;background:var(--crm-card);color:var(--crm-b2);padding:0 11px;font:inherit;font-size:9px;font-weight:800;cursor:pointer}#v-crm .nxCrmTopActs .primary{background:var(--crm-b);border-color:var(--crm-b);color:#fff}
#v-crm .nxCrmKpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-bottom:12px}#v-crm .nxCrmKpi{background:var(--crm-card);border:1px solid var(--crm-line);border-radius:15px;padding:12px;min-width:0;box-shadow:0 8px 22px -19px rgba(15,39,72,.45)}#v-crm .nxCrmKpi .l{font-size:8px;color:var(--crm-muted);font-weight:800;text-transform:uppercase;letter-spacing:.02em}#v-crm .nxCrmKpi .v{font-size:19px;font-weight:800;margin-top:4px;overflow:hidden;text-overflow:ellipsis}#v-crm .nxCrmKpi .s{font-size:8px;color:var(--crm-muted);margin-top:2px}
#v-crm .nxCrmAttention{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:12px}#v-crm .nxCrmAtt{display:flex;align-items:center;gap:10px;text-align:left;background:var(--crm-card);border:1px solid var(--crm-line);border-radius:14px;padding:11px;cursor:pointer;font:inherit;color:inherit}#v-crm .nxCrmAtt .ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#eef4ff;color:var(--crm-b2);font-size:17px;flex:none}#v-crm .nxCrmAtt.warn .ic{background:#fff4dd;color:#b45309}#v-crm .nxCrmAtt.err .ic{background:#fdebec;color:#dc2626}#v-crm .nxCrmAtt b{display:block;font-size:15px}#v-crm .nxCrmAtt span{display:block;font-size:8.5px;color:var(--crm-muted);margin-top:1px}
#v-crm .nxCrmCols{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr);gap:12px;align-items:start}#v-crm .nxCrmPanel{background:var(--crm-card);border:1px solid var(--crm-line);border-radius:15px;padding:13px;box-shadow:0 9px 24px -20px rgba(15,39,72,.45)}#v-crm .nxCrmPanel+.nxCrmPanel{margin-top:10px}#v-crm .nxCrmPH{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}#v-crm .nxCrmPH h3{font-size:12px;margin:0}#v-crm .nxCrmList{display:flex;flex-direction:column;gap:6px}#v-crm .nxCrmRow{display:flex;align-items:center;gap:9px;padding:9px;border:1px solid var(--crm-line);border-radius:11px;background:var(--crm-card);cursor:pointer}#v-crm .nxCrmAv{width:31px;height:31px;border-radius:50%;display:grid;place-items:center;background:#eaf1ff;color:var(--crm-b2);font-size:9px;font-weight:800;flex:none}#v-crm .nxCrmWho{min-width:0;flex:1}#v-crm .nxCrmWho b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#v-crm .nxCrmWho span{display:block;font-size:8.5px;color:var(--crm-muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#v-crm .nxCrmVal{font-size:9px;font-weight:800;text-align:right;white-space:nowrap}#v-crm .nxCrmVal.debt{color:#dc2626}#v-crm .nxCrmEmpty{padding:22px;text-align:center;border:1px dashed var(--crm-line);border-radius:11px;color:var(--crm-muted);font-size:9px}
#v-crm .nxCrmQuick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}#v-crm .nxCrmQuick button{min-height:62px;text-align:left;border:1px solid var(--crm-line);border-radius:12px;background:var(--crm-card);padding:10px;font:inherit;color:var(--crm-tx);cursor:pointer}#v-crm .nxCrmQuick i{font-size:18px;color:var(--crm-b2);display:block;margin-bottom:6px}#v-crm .nxCrmQuick b{font-size:10px;display:block}#v-crm .nxCrmQuick span{font-size:8px;color:var(--crm-muted)}
#nxCrmNav .ni-i{color:#60a5fa}#nxCrmNav.on .ni-i{color:#fff}
@media(max-width:1050px){#v-crm .nxCrmKpis{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:720px){#v-crm .nxCrmHomeHead{align-items:flex-start}#v-crm .nxCrmTopActs{width:100%}#v-crm .nxCrmKpis{grid-template-columns:repeat(2,minmax(0,1fr))}#v-crm .nxCrmAttention{grid-template-columns:repeat(2,minmax(0,1fr))}#v-crm .nxCrmCols{grid-template-columns:1fr}}@media(max-width:360px){#v-crm .nxCrmKpis,#v-crm .nxCrmAttention{grid-template-columns:1fr}}
`;document.head.appendChild(s);
}

function initials(n){return String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?'}

function ensureView(){
  let v=$('#v-crm');if(v)return v;
  v=document.createElement('div');v.id='v-crm';v.className='view nxSf';
  const ref=$('#v-clientes');if(ref&&ref.parentNode)ref.parentNode.insertBefore(v,ref);else document.querySelector('.main')?.appendChild(v);
  return v;
}

function ensureMenu(){
  if($('#nxCrmNav'))return $('#nxCrmNav');
  const clientes=[...document.querySelectorAll('#sbNav .ni')].find(n=>(n.getAttribute('onclick')||'').includes("nav('clientes'"));
  if(!clientes||!clientes.parentNode)return null;
  const n=document.createElement('div');n.className='ni';n.id='nxCrmNav';n.setAttribute('onclick',"nav('crm',this)");n.setAttribute('tabindex','0');n.setAttribute('role','button');n.setAttribute('onkeydown',"if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}");n.innerHTML='<i class="ti ti-heart-handshake ni-i"></i><span class="ni-l">CRM</span>';
  clientes.parentNode.insertBefore(n,clientes.nextSibling);return n;
}

function openCliente(id){
  try{window.__nxCrmCtx=true;window.nav('clientes',null);setTimeout(()=>{try{window.__nxCrmCtx=true;verCliente(id)}catch(e){console.error('[CRM] abrir cliente',e)}},120)}catch(e){console.error('[CRM] abrir cliente',e)}
}
window.nxCrmAbrirCliente=openCliente;
window.nxCrmIr=function(dest){
  if(dest==='cobros'){window.nav('clientes',null);setTimeout(()=>{try{switchTab('cob')}catch(e){}},160);return}
  if(dest==='proceso'){window.nav('clientes',null);setTimeout(()=>{try{switchCliTab('proceso')}catch(e){}},160);return}
  window.nav(dest,null);
};

function row(c,side,sub,cls){return '<div class="nxCrmRow" onclick="nxCrmAbrirCliente(\''+String(c.id).replace(/[^a-zA-Z0-9_-]/g,'')+'\')"><div class="nxCrmAv">'+esc(initials(c.nom))+'</div><div class="nxCrmWho"><b>'+esc(c.nom||'Cliente')+'</b><span>'+esc(sub||((c.ars||'Sin ARS')+' · '+(c.plan||'Sin plan')))+'</span></div><div class="nxCrmVal '+(cls||'')+'">'+esc(side||'')+'</div></div>'}

function render(){
  ensureCss();const v=ensureView(),st=STX(),all=Array.isArray(st.clientes)?st.clientes:[],act=all.filter(c=>c.activo!==false),vidas=act.reduce((n,c)=>n+1+deps(c).length,0),vig=act.filter(c=>c.numero_poliza&&!['vencida','cancelada'].includes(polEstado(c).est)).length,proc=all.filter(c=>c.estado_cliente==='EN_PROCESO'),pend=act.filter(c=>balance(c)>0).sort((a,b)=>balance(b)-balance(a)),pendMonto=pend.reduce((n,c)=>n+balance(c),0),primaMes=act.reduce((n,c)=>n+prima(c),0);
  const now=new Date();now.setHours(0,0,0,0);const end=new Date(now.getTime()+30*86400000);const ren=act.filter(c=>{if(!c.fecha_fin)return false;const d=new Date(String(c.fecha_fin).slice(0,10)+'T12:00:00');return d>=now&&d<=end}).sort((a,b)=>String(a.fecha_fin).localeCompare(String(b.fecha_fin)));
  v.innerHTML='<div class="nxCrmHomeHead"><div><span class="nxCrmHomeBadge"><i class="ti ti-heart-handshake"></i> CRM · Seguros de salud</span><h1>Panel CRM</h1><p>Clientes, pólizas, dependientes, cobranza y renovaciones en una sola operación.</p></div><div class="nxCrmTopActs"><button onclick="nxCrmIr(\'clientes\')"><i class="ti ti-users"></i> Clientes</button><button onclick="nxCrmIr(\'polizas\')"><i class="ti ti-certificate"></i> Pólizas</button><button class="primary" onclick="nxCrmIr(\'cobros\')"><i class="ti ti-cash"></i> Cobros</button></div></div>'+
  '<div class="nxCrmKpis"><div class="nxCrmKpi"><div class="l">Clientes activos</div><div class="v">'+act.length+'</div><div class="s">cartera vigente</div></div><div class="nxCrmKpi"><div class="l">Vidas aseguradas</div><div class="v">'+vidas+'</div><div class="s">titulares + dependientes</div></div><div class="nxCrmKpi"><div class="l">Pólizas vigentes</div><div class="v">'+vig+'</div><div class="s">con número de póliza</div></div><div class="nxCrmKpi"><div class="l">Prima mensual</div><div class="v">'+money(primaMes)+'</div><div class="s">cartera activa</div></div><div class="nxCrmKpi"><div class="l">Pendiente</div><div class="v">'+money(pendMonto)+'</div><div class="s">'+pend.length+' clientes</div></div><div class="nxCrmKpi"><div class="l">Renovaciones</div><div class="v">'+ren.length+'</div><div class="s">próximos 30 días</div></div></div>'+
  '<div class="nxCrmAttention"><button class="nxCrmAtt err" onclick="nxCrmIr(\'cobros\')"><div class="ic"><i class="ti ti-alert-circle"></i></div><div><b>'+pend.length+'</b><span>Pagos pendientes</span></div></button><button class="nxCrmAtt warn" onclick="nxCrmIr(\'polizas\')"><div class="ic"><i class="ti ti-calendar-event"></i></div><div><b>'+ren.length+'</b><span>Renovaciones próximas</span></div></button><button class="nxCrmAtt" onclick="nxCrmIr(\'proceso\')"><div class="ic"><i class="ti ti-progress-check"></i></div><div><b>'+proc.length+'</b><span>Clientes en proceso</span></div></button><button class="nxCrmAtt" onclick="nxCrmIr(\'clientes\')"><div class="ic"><i class="ti ti-users"></i></div><div><b>'+act.length+'</b><span>Ver cartera completa</span></div></button></div>'+
  '<div class="nxCrmCols"><div><section class="nxCrmPanel"><div class="nxCrmPH"><h3>Necesita atención</h3><button class="nxCrmLink" onclick="nxCrmIr(\'cobros\')">Ver cobros</button></div><div class="nxCrmList">'+(pend.length?pend.slice(0,6).map(c=>row(c,money(balance(c)),(c.ars||'Sin ARS')+' · '+(c.plan||'Sin plan'),'debt')).join(''):'<div class="nxCrmEmpty">No hay balances pendientes.</div>')+'</div></section><section class="nxCrmPanel"><div class="nxCrmPH"><h3>Próximas renovaciones</h3><button class="nxCrmLink" onclick="nxCrmIr(\'polizas\')">Ver pólizas</button></div><div class="nxCrmList">'+(ren.length?ren.slice(0,6).map(c=>row(c,fecha(c.fecha_fin),(c.ars||'Sin ARS')+' · '+(c.plan||'Sin plan'))).join(''):'<div class="nxCrmEmpty">No hay renovaciones en los próximos 30 días.</div>')+'</div></section></div><div><section class="nxCrmPanel"><div class="nxCrmPH"><h3>Accesos del CRM</h3></div><div class="nxCrmQuick"><button onclick="nxCrmIr(\'clientes\')"><i class="ti ti-users"></i><b>Clientes</b><span>Ficha 360 y cartera</span></button><button onclick="nxCrmIr(\'polizas\')"><i class="ti ti-certificate"></i><b>Pólizas</b><span>Vigencias y renovaciones</span></button><button onclick="nxCrmIr(\'cobros\')"><i class="ti ti-cash"></i><b>Cobros</b><span>Pendientes y pagos</span></button><button onclick="nxCrmIr(\'proceso\')"><i class="ti ti-progress"></i><b>En proceso</b><span>Onboarding y seguimiento</span></button></div></section><section class="nxCrmPanel"><div class="nxCrmPH"><h3>Clientes en proceso</h3></div><div class="nxCrmList">'+(proc.length?proc.slice(0,5).map(c=>row(c,'En proceso',(c.ars||'Sin ARS')+' · '+(c.plan||'Sin plan'))).join(''):'<div class="nxCrmEmpty">No hay clientes en proceso.</div>')+'</div></section></div></div>';
}

function open(el){
  ensureCss();ensureMenu();const v=ensureView();document.querySelectorAll('.view').forEach(x=>x.classList.remove('on'));v.classList.add('on');document.querySelectorAll('#sbNav .ni').forEach(x=>x.classList.remove('on'));(el&&el.classList?el:$('#nxCrmNav'))?.classList.add('on');render();try{if(window.innerWidth<=900&&typeof closeMobSB==='function')closeMobSB()}catch(e){};try{window.scrollTo({top:0,behavior:'instant'})}catch(e){window.scrollTo(0,0)};return false;
}
window.nxAbrirCrm=open;

function patchNav(){
  try{if(typeof nav==='function'&&!nav.__nxCrmEntry){const o=nav,n=function(view,el){if(view==='crm')return open(el);return o.apply(this,arguments)};n.__nxCrmEntry=1;nav=window.nav=n}}catch(e){console.error('[CRM] nav',e)}
}
function makeTagClickable(){const tag=$('#nxCrmHead .nxCrmTag');if(tag){tag.style.cursor='pointer';tag.setAttribute('role','button');tag.setAttribute('tabindex','0');tag.title='Abrir CRM';tag.onclick=()=>open(null);tag.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(null)}}}}
function start(){ensureCss();ensureView();ensureMenu();patchNav();makeTagClickable();setTimeout(makeTagClickable,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
