/* NEXUS PRO · «Costado» en Clientes y Facturas (dueño, 12-nov-2026: «Clientes y facturas», idea del reel de Moxen).
 * Tocar el nombre de un cliente (lista de Clientes) o de una factura (lista de Facturas) abre su resumen AL COSTADO,
 * sin tapar la lista: de lado en la computadora y desde abajo en el celular. Flechas ▲▼ (o ↑ ↓ / J K) pasan al
 * anterior y al siguiente de la lista; Esc cierra.
 * SOLO LEE. No calcula nada nuevo: usa las mismas funciones de la ficha (getEst, pendTot, getTot, getEstPol,
 * _saldoFacturasCliente, clasificarFacturaUrgencia, deudaAnt). Los botones llaman a lo de siempre: abrirAbono /
 * cobrarDesdeFact, WhatsApp, verCliente (ficha completa), verFacturaPDF_id, nxMesesAntVer. Corregir precio y anular
 * siguen SOLO en el menú ⋮ de la factura.
 * Usa el mismo aspecto de la ficha rápida del Inicio (.nxPnFicha, capa #nxInicioPane). Sin esa capa, todo abre como antes.
 * Apagar: localStorage.nx_costado_off='1'  ·  window.NX_COSTADO=false
 */
(function(){'use strict';
if(window.__nxCostado)return;
try{if(window.NX_COSTADO===false||localStorage.getItem('nx_costado_off')==='1')return;}catch(_){}
var actual=null; // {tipo:'cli'|'fac', id}
var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function esc(s){try{return escHtml(s);}catch(_){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}}
function capa(){return document.documentElement.classList.contains('nx-pane');}
function ancho(){return window.innerWidth>=1100;}
function limpio(id){return String(id==null?'':id).replace(/[^\w-]/g,'');}
function dinero(n){try{return fmt(n);}catch(_){return 'RD$ '+Math.round(n||0).toLocaleString('es-DO');}}
function fechaCorta(s){if(!s)return'';try{var d=new Date(String(s).length<=10?s+'T12:00:00':s);return d.toLocaleDateString('es-DO',{day:'numeric',month:'short',year:'numeric'});}catch(_){return String(s).slice(0,10);}}

/* ── Qué se puede abrir en cada lista ── */
function disparadores(tipo){
  var c=document.getElementById(tipo==='cli'?'tbCli':'tbFact');if(!c)return[];
  return Array.prototype.slice.call(c.querySelectorAll(tipo==='cli'?'.cli-main, .cliCard-body':'.sfr-nm, td.cli-cell')).filter(function(e){return !!claveDe(tipo,e);});
}
function filaDe(tipo,el){return el.closest(tipo==='cli'?'.clirow, .cliCard':'article.sfr-cc, tr');}
function claveDe(tipo,el){
  if(tipo==='cli'){var m=String(el.getAttribute('onclick')||'').match(/verCliente\('([^']+)'/);return m?m[1]:'';}
  var f=filaDe('fac',el),b=f&&f.querySelector('[onclick*="nxFactMenu("]'),k=b&&String(b.getAttribute('onclick')||'').match(/nxFactMenu\('([^']+)'/);
  return k?k[1]:'';
}
function elDe(a){if(!a)return null;var L=disparadores(a.tipo);for(var i=0;i<L.length;i++)if(claveDe(a.tipo,L[i])===a.id)return L[i];return null;}

/* ── Panel ── */
function estilos(){
  if(document.getElementById('nxCostCss'))return;
  var s=document.createElement('style');s.id='nxCostCss';s.textContent=
  '#nxCostado .nxPnF-head{padding-right:0;margin-top:52px}'+
  '.nxCost-nav{position:absolute;top:12px;right:12px;display:flex;gap:8px}'+
  '.nxCost-nav button{width:44px;height:44px;border-radius:50%;border:0;background:var(--pf-fill);color:var(--pf-ink);display:grid;place-items:center;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'+
  '.nxCost-nav button svg{width:18px;height:18px;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;fill:none}'+
  '.nxCost-nav button:active{transform:scale(.94)}.nxCost-nav button[disabled]{opacity:.35;cursor:default}'+
  '.nxCost-tipo{position:absolute;top:24px;left:20px;font-size:13px;font-weight:700;color:var(--pf-ink2)}'+
  '#nxCostado .nxPnF-row b{white-space:normal;overflow-wrap:anywhere}'+
  '#nxCostado .nxPnF-btn{touch-action:manipulation}'+
  '.nxCost-act{outline:2px solid #A78BFA!important;outline-offset:-2px;border-radius:14px}'+
  'tr.nxCost-act{outline-offset:-2px}'+
  '@media (min-width:1100px){#nxCostScrim{display:none}'+
    'html.nxcost-on #v-clientes,html.nxcost-on #v-facturas{padding-right:440px;transition:padding-right .3s var(--pf-ease,ease)}}'+
  '@media (max-width:768px){#nxCostado .nxPnF-head{margin-top:44px}.nxCost-nav{top:16px}.nxCost-tipo{top:28px}}'+
  '@media (prefers-reduced-motion:reduce){html.nxcost-on #v-clientes,html.nxcost-on #v-facturas{transition:none}}';
  document.head.appendChild(s);
}
function panel(){
  var el=document.getElementById('nxCostado');if(el)return el;
  estilos();
  var sc=document.createElement('div');sc.id='nxCostScrim';sc.className='nxPnScrim';sc.onclick=function(){cerrar();};
  el=document.createElement('div');el.id='nxCostado';el.className='nxPnFicha';el.setAttribute('role','dialog');el.setAttribute('aria-labelledby','nxCostNom');
  try{el.inert=true;}catch(_){}
  el.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('[data-c]');if(!b||b.disabled||!actual)return;
    var k=b.getAttribute('data-c');
    if(k==='x')return cerrar();
    if(k==='ant')return mover(-1);
    if(k==='sig')return mover(1);
    accion(k);
  });
  document.body.appendChild(sc);document.body.appendChild(el);
  return el;
}
var SVG={ant:'<path d="M6 15l6-6 6 6"/>',sig:'<path d="M6 9l6 6 6-6"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>'};
function nav(i,n){
  var b=function(k,lb,off){return '<button type="button" data-c="'+k+'" aria-label="'+lb+'"'+(off?' disabled':'')+'><svg viewBox="0 0 24 24" aria-hidden="true">'+SVG[k]+'</svg></button>';};
  return '<div class="nxCost-nav">'+b('ant','Anterior',i<=0)+b('sig','Siguiente',i<0||i>=n-1)+b('x','Cerrar',false)+'</div>';
}
function fila(lb,v){return v?'<div class="nxPnF-row"><span>'+lb+'</span><b>'+esc(v)+'</b></div>':'';}
function btn(k,t,cls){return '<button type="button" class="nxPnF-btn'+(cls?' '+cls:'')+'" data-c="'+k+'">'+t+'</button>';}

function htmlCliente(c){
  var est=getEst(c),pol=getEstPol(c)||{},agt=(gAgt(c.agente_id)||{}).nom||'Sin asignar';
  var cl=est==='Al día'?'ok':est==='Inhabilitado'?'bad':'warn',emp=c.empresa_id?(gEmp(c.empresa_id)||{}).nom:'';
  var wa=false;try{wa=!!nxWa(c.wa);}catch(_){}
  return '<span class="nxCost-tipo">Cliente</span>'+
    '<div class="nxPnF-head"><div class="nxPnF-av" aria-hidden="true">'+esc(inits(c.nom))+'</div><div><h3 id="nxCostNom">'+esc(c.nom||'Cliente')+'</h3>'+
    '<p>'+esc([c.plan,c.numero_poliza].filter(Boolean).join(' · ')||'Sin póliza')+'</p><span class="nxPnF-est '+cl+'">'+esc(est)+'</span></div></div>'+
    '<div class="nxPnF-stats"><div><small>Pendiente</small><b>'+dinero(pendTot(c))+'</b></div><div><small>Prima mensual</small><b>'+dinero(getTot(c))+'</b></div><div><small>Vigencia</small><b class="txt">'+esc(pol.lbl||'—')+'</b></div></div>'+
    '<div class="nxPnF-acts">'+btn('cobrar','Cobrar','pri')+(wa?btn('wa','WhatsApp','wa'):'')+'</div>'+
    '<div class="nxPnF-sec">Datos</div>'+
    '<div class="nxPnF-box">'+fila('Agente',agt)+fila('Empresa',emp)+fila('Cédula',c.cedula)+fila('ARS',c.ars)+fila('Teléfono',c.tel||c.wa)+fila('Vence la póliza',fechaCorta(c.fecha_fin&&String(c.fecha_fin).slice(0,10)))+'</div>'+
    '<div class="nxPnF-links">'+btn('ficha','Ficha completa')+'</div>';
}
function datosFactura(f){
  var cid=String(f.cliente_id),cli=(ST.clientes||[]).find(function(c){return String(c.id)===cid;})||null;
  var saldos=_saldoFacturasCliente(cid)||{},sal=Number(saldos[f.id]||0),cla=clasificarFacturaUrgencia(f,sal);
  var prev=cli?deudaAnt(cli):0;
  (ST.facturas||[]).forEach(function(x){if(String(x.cliente_id)===cid&&x.estado!=='Anulada'&&(x.periodo||'')<(f.periodo||''))prev+=Number(saldos[x.id]||0);});
  return {cli:cli,sal:sal,cla:cla,prev:prev,prima:Number(f.prima_base||0)+Number(f.prima_deps||0)};
}
function htmlFactura(f){
  var d=datosFactura(f),cli=d.cli,cla=d.cla,anul=!!cla.anul;
  var cl=(cla.cls==='ok'||cla.cls==='aldia')?'ok':(cla.cls==='debt'||cla.cls==='grave'||cla.cls==='anul')?'bad':'warn';
  var agt=cli?((gAgt(cli.agente_id)||{}).nom||'Sin agente'):'',emp=f.empresa_id?(gEmp(f.empresa_id)||{}).nom:'Particular';
  var per=(MES[(Number(f.mes)||0)-1]||'')+' '+(f.anio||'');
  var nom=f.cliente_nom||(cli&&cli.nom)||'Cliente';
  return '<span class="nxCost-tipo">Factura</span>'+
    '<div class="nxPnF-head"><div class="nxPnF-av" aria-hidden="true">'+esc(inits(nom))+'</div><div><h3 id="nxCostNom">'+esc(nom)+'</h3>'+
    '<p>'+esc('Factura de '+per.trim())+'</p><span class="nxPnF-est '+cl+'">'+esc(cla.pillTxt||'')+'</span></div></div>'+
    '<div class="nxPnF-stats"><div><small>Balance</small><b>'+dinero(d.sal)+'</b></div><div><small>Total</small><b>'+dinero(d.prima)+'</b></div><div><small>Meses anteriores</small><b>'+(d.prev>0.009?dinero(d.prev):'—')+'</b></div></div>'+
    (anul?'':'<div class="nxPnF-acts">'+btn('cobrarF','Cobrar','pri')+btn('waF','WhatsApp','wa')+'</div>')+
    '<div class="nxPnF-sec">Datos</div>'+
    '<div class="nxPnF-box">'+fila('Agente',agt)+fila('Empresa',emp)+fila('Emitida',fechaCorta(f.created_at))+fila('NCF',f.ncf)+fila('Vence la póliza',cli&&cli.fecha_fin?fechaCorta(String(cli.fecha_fin).slice(0,10)):'')+'</div>'+
    '<div class="nxPnF-links">'+btn('pdf','Ver factura')+btn('fichaF','Ficha del cliente')+(d.prev>0.009?btn('meses','Meses anteriores'):'')+'</div>';
}
function registro(a){
  if(a.tipo==='cli')return (ST.clientes||[]).find(function(c){return String(c.id)===String(a.id);})||null;
  return (ST.facturas||[]).find(function(f){return String(f.id)===String(a.id);})||null;
}
function abrir(tipo,id,el){
  if(!capa())return false;
  var a={tipo:tipo,id:String(id)},r=null,html='';
  try{r=registro(a);if(!r)return false;html=tipo==='cli'?htmlCliente(r):htmlFactura(r);}catch(e){try{console.error('[costado]',e);}catch(_){}return false;}
  var p=panel(),L=disparadores(tipo),i=el?L.indexOf(el):-1;if(i<0){el=elDe(a);i=el?L.indexOf(el):-1;}
  if(!actual)p._volver=document.activeElement;
  actual=a;
  p.innerHTML='<div class="nxPnF-grab" aria-hidden="true"></div>'+nav(i,L.length)+html;
  p.scrollTop=0;try{p.inert=false;}catch(_){}
  marcar(el);
  document.documentElement.classList.add('nxcost-on');
  requestAnimationFrame(function(){p.classList.add('on');var sc=document.getElementById('nxCostScrim');if(sc)sc.classList.add('on');});
  try{if(el&&ancho())filaDe(tipo,el).scrollIntoView({block:'nearest'});}catch(_){}
  return true;
}
function marcar(el){
  Array.prototype.forEach.call(document.querySelectorAll('.nxCost-act'),function(x){x.classList.remove('nxCost-act');});
  var f=el&&actual&&filaDe(actual.tipo,el);if(f)f.classList.add('nxCost-act');
}
function cerrar(sinFoco){
  var p=document.getElementById('nxCostado'),sc=document.getElementById('nxCostScrim');if(!actual)return;
  actual=null;
  if(p){p.classList.remove('on');try{p.inert=true;}catch(_){}}
  if(sc)sc.classList.remove('on');
  document.documentElement.classList.remove('nxcost-on');
  marcar(null);
  if(sinFoco!==true&&p&&p._volver){try{if(document.contains(p._volver))p._volver.focus({preventScroll:true});}catch(_){}}
}
function mover(d){
  if(!actual||ventanaAbierta())return;
  var L=disparadores(actual.tipo),i=L.indexOf(elDe(actual)),n=L[i+d];
  if(n)abrir(actual.tipo,claveDe(actual.tipo,n),n);
}
/* Los botones cierran el panel y abren lo de siempre (las ventanas del sistema van por debajo de la ficha). */
function accion(k){
  var a=actual,r=a&&registro(a);if(!r)return;
  var cid=limpio(a.tipo==='cli'?r.id:r.cliente_id),fid=limpio(r.id),per=String(r.periodo||'');
  cerrar(true);
  try{
    if(k==='cobrar'||k==='cobrarF'){if(typeof abrirAbono==='function')abrirAbono(cid);}
    else if(k==='wa'){if(typeof nxAbrirWhatsAppDeCliente==='function')nxAbrirWhatsAppDeCliente(cid);}
    else if(k==='waF'){if(typeof enviarWA==='function')enviarWA(fid);}
    else if(k==='ficha'||k==='fichaF'){if(typeof verCliente==='function')verCliente(cid);}
    else if(k==='pdf'){if(typeof verFacturaPDF_id==='function')verFacturaPDF_id(fid);}
    else if(k==='meses'){if(typeof nxMesesAntVer==='function')nxMesesAntVer(cid,per);}
  }catch(e){try{console.error('[costado]',e);}catch(_){}}
}
function ventanaAbierta(){
  try{
    if(document.querySelector('#csPanel.open, .swal-overlay, .factMenu'))return true;
    var o=document.querySelectorAll('.overlay');
    for(var i=0;i<o.length;i++)if(getComputedStyle(o[i]).display!=='none')return true;
  }catch(_){}
  return false;
}

/* Tocar el nombre abre el costado en vez de la ficha completa. No se corta el clic a las demás capas: solo se apaga
   el onclick de ese elemento para este toque. Con Ctrl/⌘ o sin la capa de vidrio, todo sigue como antes. */
document.addEventListener('click',function(ev){
  if(!capa()||ev.ctrlKey||ev.metaKey||ev.shiftKey||!ev.target.closest)return;
  var tipo=ev.target.closest('#tbCli')?'cli':ev.target.closest('#tbFact')?'fac':'';if(!tipo)return;
  var el=ev.target.closest(tipo==='cli'?'.cli-main, .cliCard-body':'.sfr-nm, td.cli-cell');if(!el)return;
  if(ev.target.closest('button, a, input, select, label'))return;
  var id=claveDe(tipo,el);if(!id)return;
  var oc=el.onclick;el.onclick=null;setTimeout(function(){if(document.contains(el))el.onclick=oc;},0);
  if(!abrir(tipo,id,el)){el.onclick=oc;}
},true);
document.addEventListener('keydown',function(ev){
  if(!actual||ev.ctrlKey||ev.metaKey||ev.altKey)return;
  var t=ev.target,campo=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  if(ventanaAbierta())return;
  if(ev.key==='Escape'){ev.preventDefault();cerrar();return;}
  if(campo)return;
  if(ev.key==='ArrowDown'||ev.key==='j'||ev.key==='J'){ev.preventDefault();mover(1);}
  else if(ev.key==='ArrowUp'||ev.key==='k'||ev.key==='K'){ev.preventDefault();mover(-1);}
});
/* La lista se volvió a pintar (búsqueda, página, cobro) o se cambió de pantalla: si ya no está, se cierra; si está, se actualiza. */
var _t=0;
function revisar(){
  _t=0;if(!actual)return;
  var el=elDe(actual),c=document.getElementById(actual.tipo==='cli'?'tbCli':'tbFact');
  if(!el||!c||!c.offsetParent||!registro(actual))return cerrar(true);
  var f=filaDe(actual.tipo,el);
  if(f&&!f.classList.contains('nxCost-act')){var p=document.getElementById('nxCostado'),y=p?p.scrollTop:0;abrir(actual.tipo,actual.id,el);if(p)p.scrollTop=y;}
}
try{new MutationObserver(function(){if(actual&&!_t)_t=setTimeout(revisar,60);}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});}catch(_){}

window.__nxCostado={version:'20261112a',abrir:function(tipo,id){return abrir(tipo,id,null);},cerrar:cerrar,actual:function(){return actual?{tipo:actual.tipo,id:actual.id}:null;}};
})();
