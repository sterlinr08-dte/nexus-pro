/* NEXUS PRO · Reporte por agente · Ciclo 20→20
   2026-09-17
   Alcance: SOLO lectura/UI. Reusa las RPC financieras existentes de Fase A/C.
   No crea ledger, no recalcula cobros/custodia y no escribe movimientos. */
(function(){
  'use strict';
  if(window.__NEXUS_REPORTE_CICLO_AGENTES_V1__)return;
  window.__NEXUS_REPORTE_CICLO_AGENTES_V1__=true;

  var cache={};
  var estado={periodo:null,modo:'ciclo',data:null,fuente:null,loading:false,error:null,req:0};

  function q(id){return document.getElementById(id);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function num(v){var n=Number(v);return isFinite(n)?n:0;}
  function money(v){
    try{return 'RD$ '+Math.round(num(v)).toLocaleString('es-DO');}
    catch(_){return 'RD$ '+String(v==null?0:v);}
  }
  function fecha(v){
    if(!v)return '—';
    try{return new Date(v).toLocaleDateString('es-DO',{day:'2-digit',month:'short',year:'numeric'});}
    catch(_){return String(v).slice(0,10);}
  }
  function actual20(){
    var d=new Date();
    if(d.getDate()<20)d=new Date(d.getFullYear(),d.getMonth()-1,1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function keyOffset(base,offset){
    var p=String(base).split('-'),d=new Date(Number(p[0]),Number(p[1])-1+offset,1);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  }
  function labelPeriodo(key){
    var p=String(key).split('-'),d1=new Date(Number(p[0]),Number(p[1])-1,20),d2=new Date(Number(p[0]),Number(p[1]),20);
    var f=function(d){return '20 '+d.toLocaleDateString('es-DO',{month:'short',year:'numeric'}).replace('.','');};
    return f(d1)+' → '+f(d2);
  }
  function esAdmin(){try{return !!(typeof sesion!=='undefined'&&sesion&&sesion.rol==='admin');}catch(_){return false;}}

  function css(){
    if(q('nxCiclo20CSS'))return;
    var s=document.createElement('style');s.id='nxCiclo20CSS';
    s.textContent='\
#nxCiclo20{margin-top:12px}\
#nxCiclo20 .nxC20Top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px}\
#nxCiclo20 .nxC20Title{display:flex;align-items:center;gap:8px;min-width:180px;flex:1}\
#nxCiclo20 .nxC20Title i{font-size:18px;color:#2563eb}\
#nxCiclo20 .nxC20Title b{font-size:13px;color:var(--tx1,#0f172a)}\
#nxCiclo20 .nxC20Title span{display:block;font-size:10px;color:var(--tx3,#64748b);font-weight:500;margin-top:1px}\
#nxCiclo20 .nxC20Sel{height:34px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;color:#334155;padding:0 30px 0 9px;font-size:11px;font-weight:700;max-width:210px}\
#nxCiclo20 .nxC20Tabs{display:inline-flex;padding:3px;background:#eef2f7;border-radius:10px;gap:2px}\
#nxCiclo20 .nxC20Tab{height:28px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:#64748b;font-size:10.5px;font-weight:800;cursor:pointer}\
#nxCiclo20 .nxC20Tab.on{background:#fff;color:#1d4ed8;box-shadow:0 1px 3px rgba(15,23,42,.1)}\
#nxCiclo20 .nxC20Status{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px;font-size:10.5px;color:#64748b}\
#nxCiclo20 .nxC20Badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;font-weight:800;background:#eff6ff;color:#1d4ed8;border:1px solid #dbeafe}\
#nxCiclo20 .nxC20Badge.ok{background:#ecfdf5;color:#047857;border-color:#bbf7d0}\
#nxCiclo20 .nxC20Badge.warn{background:#fffbeb;color:#b45309;border-color:#fde68a}\
#nxCiclo20 .nxC20Badge.err{background:#fef2f2;color:#b91c1c;border-color:#fecaca}\
#nxCiclo20 .nxC20Kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;margin-bottom:10px}\
#nxCiclo20 .nxC20Kpi{background:#fff;border:1px solid #e8edf4;border-radius:12px;padding:10px 11px;min-width:0}\
#nxCiclo20 .nxC20Kpi .l{font-size:9px;text-transform:uppercase;letter-spacing:.35px;color:#64748b;font-weight:800}\
#nxCiclo20 .nxC20Kpi .v{font-size:15px;color:#0f172a;font-weight:850;margin-top:3px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}\
#nxCiclo20 .nxC20Kpi .s{font-size:9px;color:#94a3b8;margin-top:2px}\
#nxCiclo20 .nxC20Table{width:100%;border-collapse:collapse;min-width:760px}\
#nxCiclo20 .nxC20Table th{font-size:8.5px;text-transform:uppercase;letter-spacing:.35px;color:#64748b;text-align:left;padding:8px;border-bottom:1px solid #e8edf4;background:#f8fafc}\
#nxCiclo20 .nxC20Table td{padding:9px 8px;border-bottom:1px solid #eef2f7;font-size:10.5px;color:#334155;vertical-align:middle}\
#nxCiclo20 .nxC20Table td.m{font-family:var(--mono,monospace);font-variant-numeric:tabular-nums;white-space:nowrap}\
#nxCiclo20 .nxC20Agt{font-weight:800;color:#0f172a}.nxC20Cargo{font-size:9px;color:#94a3b8;margin-top:2px}\
#nxCiclo20 .nxC20Pos{color:#047857!important;font-weight:800}.nxC20Neg{color:#b91c1c!important;font-weight:800}\
#nxCiclo20 .nxC20Empty{padding:28px 12px;text-align:center;color:#64748b;font-size:11px}\
#nxCiclo20 .nxC20Load{padding:24px;text-align:center;color:#64748b;font-size:11px}\
#nxCiclo20 .nxC20Note{padding:9px 10px;border-radius:9px;background:#f8fafc;border:1px solid #e8edf4;color:#64748b;font-size:9.5px;line-height:1.5;margin-top:9px}\
@media(max-width:768px){#nxCiclo20 .nxC20Top{align-items:stretch}#nxCiclo20 .nxC20Title{flex-basis:100%}#nxCiclo20 .nxC20Sel{max-width:none;flex:1;min-width:0}#nxCiclo20 .nxC20Tabs{flex:0 0 auto}#nxCiclo20 .nxC20Kpis{grid-template-columns:1fr 1fr}#nxCiclo20 .nxC20Kpi{padding:9px}#nxCiclo20 .nxC20Kpi .v{font-size:13px}}\
@media(prefers-reduced-motion:reduce){#nxCiclo20 *{scroll-behavior:auto!important;transition:none!important}}';
    document.head.appendChild(s);
  }

  function montar(){
    if(!esAdmin())return;
    var vista=q('v-rep-agente'),r=q('rAgt');
    if(!vista||!r)return;
    css();
    var box=q('nxCiclo20');
    if(!box){
      box=document.createElement('section');box.id='nxCiclo20';box.className='nc';
      r.parentNode.insertBefore(box,r.nextSibling);
    }
    if(!estado.periodo)estado.periodo=actual20();
    shell(box);
    cargar();
  }

  function shell(box){
    var opts='';
    for(var i=0;i<18;i++){
      var k=keyOffset(actual20(),-i);
      opts+='<option value="'+k+'"'+(k===estado.periodo?' selected':'')+'>'+esc(labelPeriodo(k))+'</option>';
    }
    box.innerHTML='\
      <div class="nxC20Top">\
        <div class="nxC20Title"><i class="ti ti-calendar-dollar"></i><div><b>Ciclo 20→20</b><span>Custodia y movimientos por agente · fuente: servidor</span></div></div>\
        <select id="nxC20Periodo" class="nxC20Sel" aria-label="Elegir ciclo">'+opts+'</select>\
        <div class="nxC20Tabs" role="tablist">\
          <button type="button" class="nxC20Tab '+(estado.modo==='ciclo'?'on':'')+'" data-modo="ciclo">Ciclo</button>\
          <button type="button" class="nxC20Tab '+(estado.modo==='mes'?'on':'')+'" data-modo="mes">Consolidado</button>\
        </div>\
        <button type="button" class="btn bsm bc4" id="nxC20Export" title="Exportar este reporte"><i class="ti ti-file-spreadsheet"></i> Excel</button>\
      </div>\
      <div id="nxC20Body"><div class="nxC20Load"><div class="spin" style="margin:0 auto 8px"></div>Cargando cifras del servidor…</div></div>';
    q('nxC20Periodo').addEventListener('change',function(){estado.periodo=this.value;estado.data=null;estado.error=null;cargar(true);});
    box.querySelectorAll('.nxC20Tab').forEach(function(b){b.addEventListener('click',function(){estado.modo=this.dataset.modo;estado.data=null;estado.error=null;shell(box);cargar(true);});});
    q('nxC20Export').addEventListener('click',exportar);
  }

  async function cargar(force){
    var body=q('nxC20Body');if(!body)return;
    var modo=estado.modo,periodo=estado.periodo,ck=modo+'|'+periodo,req=++estado.req;
    if(!force&&cache[ck]){
      estado.data=cache[ck].data;estado.fuente=cache[ck].fuente;estado.error=null;estado.loading=false;pintar();return;
    }
    estado.loading=true;estado.error=null;
    body.innerHTML='<div class="nxC20Load"><div class="spin" style="margin:0 auto 8px"></div>Cargando cifras del servidor…</div>';
    try{
      var data=[],fuente='';
      if(modo==='mes'){
        data=await API.post('rpc/seguros_reporte_mensual_admin',{p_mes:periodo})||[];
        fuente='mensual';
      }else{
        var snap=await API.post('rpc/seguros_cierre_ciclo_admin',{p_periodo:periodo})||[];
        if(snap.length){data=snap;fuente='snapshot';}
        else{data=await API.post('rpc/seguros_resumen_ciclo_admin',{p_periodo:periodo})||[];fuente='vivo';}
      }
      cache[ck]={data:Array.isArray(data)?data:[],fuente:fuente};
      if(req!==estado.req||modo!==estado.modo||periodo!==estado.periodo)return;
      estado.data=cache[ck].data;estado.fuente=fuente;
    }catch(e){
      if(req!==estado.req||modo!==estado.modo||periodo!==estado.periodo)return;
      estado.error=rpcMsg(e);
      estado.data=[];estado.fuente=null;
    }
    if(req!==estado.req)return;
    estado.loading=false;pintar();
  }

  function rpcMsg(e){
    var m=(e&&e.message)||String(e||'Error consultando el ciclo');
    try{var j=JSON.parse(m);if(j&&j.message)m=j.message;}catch(_){}
    return m;
  }

  function filtroAgente(rows){
    var sel=q('repAgtSel'),id=sel&&sel.value;
    if(!id)return rows;
    return rows.filter(function(r){return String(r.agente_id)===String(id);});
  }

  function pintar(){
    var body=q('nxC20Body');if(!body)return;
    if(estado.error){body.innerHTML='<div class="nxC20Empty"><span class="nxC20Badge err"><i class="ti ti-alert-circle"></i> No se pudo consultar</span><div style="margin-top:8px">'+esc(estado.error)+'</div></div>';return;}
    var rows=estado.data||[];
    if(!rows.length){body.innerHTML='<div class="nxC20Empty">No hay datos para este '+(estado.modo==='mes'?'mes':'ciclo')+'.</div>';return;}
    if(estado.modo==='mes'){pintarMes(body,rows);return;}
    pintarCiclo(body,rows);
  }

  function pintarCiclo(body,rows){
    var all=rows,vis=filtroAgente(rows),r0=all[0]||{};
    var fuente=estado.fuente==='snapshot'?'Cierre oficial · snapshot inmutable':(r0.cerrado?'Ciclo finalizado · lectura viva':'Ciclo en curso · lectura viva');
    var badge=estado.fuente==='snapshot'?'ok':(r0.cerrado?'warn':'');
    var aprox=all.some(function(r){return !!r.historico_aproximado;});
    var desc=all.some(function(r){return Math.abs(num(r.diferencia_reconciliacion))>0.005;});
    var total=r0.total_negocio_cobrado!=null?r0.total_negocio_cobrado:r0.total_negocio_cobrado_ciclo;
    var kpis='\
      <div class="nxC20Kpis">\
        <div class="nxC20Kpi"><div class="l">Cobrado real del negocio</div><div class="v">'+money(total)+'</div><div class="s">No incluye transferencias internas</div></div>\
        <div class="nxC20Kpi"><div class="l">Agentes mostrados</div><div class="v">'+vis.length+'</div><div class="s">'+(vis.length===all.length?'Todo el ciclo':'Filtro del reporte activo')+'</div></div>'+
        (estado.fuente==='snapshot'?'<div class="nxC20Kpi"><div class="l">Custodia al cierre</div><div class="v">'+money(r0.total_saldo_final)+'</div><div class="s">Suma de saldos positivos · servidor</div></div><div class="nxC20Kpi"><div class="l">Deuda de agentes</div><div class="v">'+money(r0.total_deuda_agentes)+'</div><div class="s">Separada de la custodia</div></div>':'')+
      '</div>';
    var status='<div class="nxC20Status"><span class="nxC20Badge '+badge+'"><i class="ti '+(estado.fuente==='snapshot'?'ti-lock-check':'ti-clock')+'"></i> '+esc(fuente)+'</span><span>'+esc(labelPeriodo(estado.periodo))+'</span>'+(estado.fuente==='snapshot'&&r0.cerrado_at?'<span>· cerrado '+fecha(r0.cerrado_at)+'</span>':'')+(aprox?'<span class="nxC20Badge warn"><i class="ti ti-info-triangle"></i> Histórico aproximado</span>':'')+(desc?'<span class="nxC20Badge err"><i class="ti ti-alert-triangle"></i> Hay diferencia de reconciliación</span>':'')+'</div>';
    var table='<div style="overflow-x:auto"><table class="nxC20Table"><thead><tr><th>Agente</th><th>Cobrado validado</th><th>Transferido</th><th>Recibido</th><th>Entregado admin/directo</th><th>Saldo / custodia</th><th>Diferencia</th></tr></thead><tbody>'+
      vis.map(function(r){
        var saldo=num(r.saldo_final),dif=num(r.diferencia_reconciliacion);
        return '<tr><td><div class="nxC20Agt">'+esc(r.agente||'Agente')+'</div><div class="nxC20Cargo">'+esc(r.cargo||'')+'</div></td><td class="m">'+money(r.cobrado_validado)+'</td><td class="m">'+money(r.transferido_confirmado)+'</td><td class="m">'+money(r.recibido_confirmado)+'</td><td class="m">'+money(r.entregado_admin_directo)+'</td><td class="m '+(saldo<0?'nxC20Neg':(saldo>0?'nxC20Pos':''))+'">'+money(saldo)+'</td><td class="m '+(Math.abs(dif)>0.005?'nxC20Neg':'')+'">'+money(dif)+'</td></tr>';
      }).join('')+'</tbody></table></div>';
    body.innerHTML=status+kpis+table+'<div class="nxC20Note"><b>Fuente de verdad:</b> estas cifras vienen de las RPC financieras de NEXUS PRO. Esta pantalla no suma pagos ni reconstruye custodia en el navegador. Las transferencias entre agentes solo mueven custodia; no aumentan el cobro real del negocio.</div>';
  }

  function pintarMes(body,rows){
    var vis=filtroAgente(rows),r0=rows[0]||{};
    var status='<div class="nxC20Status"><span class="nxC20Badge"><i class="ti ti-report-money"></i> Consolidado oficial por período de apertura</span><span>'+esc(estado.periodo)+'</span></div>';
    var kpis='<div class="nxC20Kpis"><div class="nxC20Kpi"><div class="l">Cobrado real del negocio</div><div class="v">'+money(r0.total_negocio_cobrado_mes)+'</div><div class="s">Servidor · sin transferencias internas</div></div><div class="nxC20Kpi"><div class="l">Agentes mostrados</div><div class="v">'+vis.length+'</div></div><div class="nxC20Kpi"><div class="l">Ciclos incluidos</div><div class="v">'+esc(r0.ciclos_incluidos==null?'—':r0.ciclos_incluidos)+'</div></div></div>';
    var table='<div style="overflow-x:auto"><table class="nxC20Table"><thead><tr><th>Agente</th><th>Cobrado validado</th><th>Transferido</th><th>Recibido</th><th>Entregado</th><th>Último saldo</th></tr></thead><tbody>'+vis.map(function(r){var s=num(r.saldo_final_ultimo);return '<tr><td><div class="nxC20Agt">'+esc(r.agente||'Agente')+'</div></td><td class="m">'+money(r.cobrado_validado)+'</td><td class="m">'+money(r.transferido_confirmado)+'</td><td class="m">'+money(r.recibido_confirmado)+'</td><td class="m">'+money(r.entregado_admin_directo)+'</td><td class="m '+(s<0?'nxC20Neg':(s>0?'nxC20Pos':''))+'">'+money(s)+'</td></tr>';}).join('')+'</tbody></table></div>';
    body.innerHTML=status+kpis+table+'<div class="nxC20Note">El consolidado usa <code>seguros_reporte_mensual_admin</code>. El mes identifica el período de apertura del ciclo 20→20.</div>';
  }

  function exportar(){
    var rows=estado.data||[];if(!rows.length)return;
    var vis=filtroAgente(rows),out=[];
    if(estado.modo==='mes'){
      out.push(['NEXUS PRO — CONSOLIDADO MENSUAL DE AGENTES'],['Período de apertura',estado.periodo],[],['Agente','Cobrado validado','Transferido confirmado','Recibido confirmado','Entregado admin/directo','Último saldo']);
      vis.forEach(function(r){out.push([r.agente,r.cobrado_validado,r.transferido_confirmado,r.recibido_confirmado,r.entregado_admin_directo,r.saldo_final_ultimo]);});
    }else{
      out.push(['NEXUS PRO — CICLO 20→20 POR AGENTE'],['Período',estado.periodo],['Rango',labelPeriodo(estado.periodo)],['Fuente',estado.fuente==='snapshot'?'Snapshot inmutable':'Lectura viva'],[],['Agente','Cargo','Cobrado validado','Transferido confirmado','Recibido confirmado','Entregado admin/directo','Saldo final','Diferencia reconciliación','Histórico aproximado']);
      vis.forEach(function(r){out.push([r.agente,r.cargo||'',r.cobrado_validado,r.transferido_confirmado,r.recibido_confirmado,r.entregado_admin_directo,r.saldo_final,r.diferencia_reconciliacion,r.historico_aproximado?'Sí':'No']);});
    }
    if(typeof descCSV==='function')descCSV(out,'NEXUS_'+(estado.modo==='mes'?'Consolidado':'Ciclo20')+'_'+estado.periodo+'.csv');
  }

  function instalar(){
    if(!esAdmin())return;
    var orig=window.rRepAgt;
    if(typeof orig!=='function'){return false;}
    if(orig.__nxC20Wrapped)return true;
    var w=function(){var ret=orig.apply(this,arguments);setTimeout(montar,0);return ret;};
    w.__nxC20Wrapped=true;w.__nxC20Orig=orig;
    window.rRepAgt=w;
    var sel=q('repAgtSel');if(sel)sel.addEventListener('change',function(){setTimeout(pintar,0);});
    if(q('v-rep-agente')&&q('v-rep-agente').classList.contains('on'))setTimeout(montar,0);
    return true;
  }

  if(!instalar()){
    var n=0,t=setInterval(function(){n++;if(instalar()||n>=30)clearInterval(t);},200);
  }
})();
