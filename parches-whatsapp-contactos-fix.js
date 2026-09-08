/* NEXUS PRO · Contactos WhatsApp · hotfix funcional 2026-09-08
   Corrige bugs de la vista UHD sin tocar API, Zernio, lotes ni reglas del inbox:
   - lista/buscador sobre TODOS los contactos del segmento (no solo los primeros 14)
   - "Factura a todos" usa el segmento factura, nunca todos
   - "Al día" funciona como filtro, no como envío de factura
   - conserva búsqueda y scroll cuando cambia el filtro del panel clonado
*/
(function(){
  'use strict';
  if(window.__nxWaContactosFix20260908)return;
  window.__nxWaContactosFix20260908=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const estadoUI={q:'',scroll:0,rendering:false};
  let queued=false,obs=null;

  function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function norm(v){
    try{return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
    catch(e){return String(v||'').toLowerCase();}
  }
  function initials(n){
    return String(n||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?';
  }
  function clientes(){
    try{return ((window.ST||ST||{}).clientes||[]).filter(c=>c&&c.activo!==false&&c.wa);}
    catch(e){return [];}
  }
  function facturasCliente(c){
    try{return ((window.ST||ST||{}).facturas||[]).filter(f=>String(f.cliente_id)===String(c?.id)&&f.estado!=='Anulada');}
    catch(e){return [];}
  }
  function deudaCliente(c){
    try{if(typeof pendTot==='function')return Number(pendTot(c))||0;}catch(e){}
    try{if(typeof pend==='function')return Number(pend(c))||0;}catch(e){}
    return Math.max(0,Number(c?.deuda_total||0)-Number(c?.pagado||0)+Number(c?.deuda_anterior||0));
  }
  function mesesAtraso(c){
    try{
      const mc=typeof mesCorte==='function'?mesCorte():{mes:new Date().getMonth()+1,anio:new Date().getFullYear()};
      const hoyKey=`${mc.anio}-${String(mc.mes).padStart(2,'0')}`;
      const saldo=typeof _saldoFacturasCliente==='function'?_saldoFacturasCliente(String(c.id)):{};
      return facturasCliente(c).filter(f=>f.periodo&&f.periodo<hoyKey&&(saldo[f.id]??Number(f.total||0))>0.009).length;
    }catch(e){return 0;}
  }
  function estadoPoliza(c){
    try{if(typeof getEstPol==='function')return getEstPol(c)||{est:'vigente'};}catch(e){}
    if(!c?.fecha_fin)return{est:'vigente'};
    try{
      const d=new Date(String(c.fecha_fin).slice(0,10)+'T12:00:00');
      const h=new Date();h.setHours(0,0,0,0);
      const dias=Math.ceil((d-h)/86400000);
      return dias<0?{est:'vencida'}:dias<=30?{est:'gracia'}:{est:'vigente'};
    }catch(e){return{est:'vigente'};}
  }
  function registro(c){
    const deuda=deudaCliente(c),meses=mesesAtraso(c),ep=estadoPoliza(c);
    const continuidad=ep.est==='vencida'||ep.est==='gracia';
    const tieneFactura=facturasCliente(c).length>0;
    let estado={key:'aldia',label:'Al día',cls:'ok'};
    if(meses>=2)estado={key:'vencido',label:'Vencido',cls:'err'};
    else if(meses===1)estado={key:'atrasado',label:'Atrasado',cls:'err'};
    else if(deuda>0)estado={key:'deuda',label:'Pendiente',cls:'warn'};
    else if(continuidad)estado={key:'continuidad',label:'Por vencer',cls:'warn'};
    else if(tieneFactura)estado={key:'factura',label:'Factura',cls:''};
    return{c,deuda,meses,estado};
  }
  function todosRegistros(){
    return clientes().map(registro).sort((a,b)=>(b.deuda-a.deuda)||String(a.c.nom||'').localeCompare(String(b.c.nom||''),'es'));
  }
  function porFiltro(tipo){
    const all=todosRegistros();
    if(tipo==='deuda')return all.filter(x=>['deuda','atrasado','vencido'].includes(x.estado.key));
    if(tipo==='atrasado')return all.filter(x=>x.estado.key==='atrasado');
    if(tipo==='vencido')return all.filter(x=>x.estado.key==='vencido');
    if(tipo==='factura')return all.filter(x=>['factura','deuda','atrasado','vencido'].includes(x.estado.key));
    if(tipo==='continuidad')return all.filter(x=>x.estado.key==='continuidad');
    if(tipo==='aldia')return all.filter(x=>x.estado.key==='aldia');
    return all;
  }
  function filtroActivo(body){
    const b=$('.nxWaContactTabs button.on',body);if(!b)return'todos';
    const oc=b.getAttribute('onclick')||'';
    const m=oc.match(/nxWaContactFiltro\(['\"]([^'\"]+)['\"]\)/);
    if(m)return m[1];
    const t=norm(b.textContent);
    if(t.startsWith('atrasado'))return'atrasado';
    if(t.startsWith('vencido'))return'vencido';
    if(t.startsWith('deuda'))return'deuda';
    if(t.startsWith('por vencer'))return'continuidad';
    if(t.startsWith('factura'))return'factura';
    if(t.startsWith('al dia'))return'aldia';
    return'todos';
  }
  function fila(x){
    const c=x.c;
    const sub=[c.wa,c.plan,c.ars].filter(Boolean).join(' · ');
    const mesesTxt=x.meses>0?`${x.meses} mes${x.meses===1?'':'es'} atrasado`:'';
    const avCls=x.estado.cls?` av-${x.estado.cls}`:'';
    return `<div class="nxWaContact nxWaFixRow" role="button" tabindex="0" data-cliente-id="${esc(c.id)}" aria-label="Abrir chat con ${esc(c.nom||'cliente')}">
      <div class="av${avCls}">${esc(initials(c.nom))}</div>
      <div class="tx"><b>${esc(c.nom||'Cliente')}</b><span>${esc(mesesTxt||sub||'WhatsApp registrado')}</span></div>
      <span class="st ${esc(x.estado.cls)}">${esc(x.estado.label)}</span>
      <i class="ti ti-chevron-right chev" aria-hidden="true"></i>
    </div>`;
  }
  function renderLista(){
    const o=$('#nxWaCtxOverlay.open');
    const body=o&&$('#nxWaCtxBody',o);
    if(!o||!body||o.dataset.panel!=='contactos'||estadoUI.rendering)return;
    const list=$('.nxWaContactList',body);if(!list)return;
    const input=$('#nxWaUhdSearchInput',body);
    if(input&&document.activeElement!==input&&input.value!==estadoUI.q)input.value=estadoUI.q;
    const filtro=filtroActivo(body);
    const q=norm(input?input.value:estadoUI.q).trim();
    estadoUI.q=input?input.value:estadoUI.q;
    let data=porFiltro(filtro);
    if(q)data=data.filter(x=>norm([x.c.nom,x.c.wa,x.c.tel,x.c.plan,x.c.ars,x.c.numero_poliza].filter(Boolean).join(' ')).includes(q));
    estadoUI.rendering=true;
    list.innerHTML=data.length?data.map(fila).join(''):'<div class="nxWaUhdNoResults show"><i class="ti ti-user-search"></i><b>Sin resultados</b><span>No hay contactos que coincidan con la búsqueda y el filtro actual.</span></div>';
    $$('.nxWaFixRow',list).forEach(r=>{
      const abrir=()=>{const id=r.dataset.clienteId;if(id&&typeof window.nxWaAbrirContacto==='function')window.nxWaAbrirContacto(id);};
      r.addEventListener('click',abrir);
      r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();abrir();}});
    });
    requestAnimationFrame(()=>{
      const max=Math.max(0,body.scrollHeight-body.clientHeight);
      body.scrollTop=Math.min(estadoUI.scroll,max);
      estadoUI.rendering=false;
    });
  }
  function enhance(){
    queued=false;
    const o=$('#nxWaCtxOverlay.open'),body=o&&$('#nxWaCtxBody',o);
    if(!o||!body||o.dataset.panel!=='contactos')return;
    const input=$('#nxWaUhdSearchInput',body);
    if(input&&!input.dataset.nxFix){
      input.dataset.nxFix='1';
      input.value=estadoUI.q;
      input.addEventListener('input',()=>{estadoUI.q=input.value;estadoUI.scroll=0;renderLista();});
    }
    if(!body.dataset.nxFixScroll){
      body.dataset.nxFixScroll='1';
      body.addEventListener('scroll',()=>{if(!estadoUI.rendering)estadoUI.scroll=body.scrollTop;},{passive:true});
    }
    renderLista();
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(enhance);}

  /* Intercepta SOLO los dos botones que tenían semántica incorrecta. */
  document.addEventListener('click',e=>{
    const btn=e.target.closest('#nxWaCtxOverlay[data-panel="contactos"] .nxWaContactsFoot button');
    if(!btn)return;
    const txt=norm(btn.textContent).replace(/\s+/g,' ').trim();
    if(txt.includes('factura a todos')){
      e.preventDefault();e.stopImmediatePropagation();
      try{if(typeof window.nxWaVisualCerrarPanel==='function')window.nxWaVisualCerrarPanel();}catch(err){}
      if(typeof window.nxWaAbrirMasivoSegmento==='function')window.nxWaAbrirMasivoSegmento('factura');
      return;
    }
    if(txt==='al dia'||txt.startsWith('al dia ')){
      e.preventDefault();e.stopImmediatePropagation();
      estadoUI.q='';estadoUI.scroll=0;
      if(typeof window.nxWaContactFiltro==='function')window.nxWaContactFiltro('aldia');
      setTimeout(queue,30);
    }
  },true);

  /* Guardar estado antes de que el filtro fuente regenere el panel clonado. */
  document.addEventListener('click',e=>{
    const tab=e.target.closest('#nxWaCtxOverlay[data-panel="contactos"] .nxWaContactTabs button');
    if(!tab)return;
    const body=$('#nxWaCtxBody');
    const input=body&&$('#nxWaUhdSearchInput',body);
    if(input)estadoUI.q=input.value;
    if(body)estadoUI.scroll=body.scrollTop;
    setTimeout(queue,40);
  },true);

  function start(){
    queue();
    obs=new MutationObserver(queue);
    obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','data-panel']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
