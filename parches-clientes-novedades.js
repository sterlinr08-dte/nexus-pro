/* NEXUS PRO · Clientes / Novedades
   Sustituye visualmente "En proceso" por una bandeja operativa de novedades.
   Compatible con el flujo legado: 'proceso' queda como alias interno para no romper accesos viejos. */
(function(){
  'use strict';
  if(window.__nxClientesNovedades20260915)return;
  window.__nxClientesNovedades20260915=true;

  var activo=false;
  var modo='pendientes';
  var filtro='TODOS';
  var cache=[];
  var cargando=false;
  var ESTADOS={
    POR_ACTIVAR:{label:'Por activar',icon:'ti-shield-plus'},
    EN_GESTION:{label:'En gestión',icon:'ti-progress'},
    EN_RIESGO:{label:'En riesgo',icon:'ti-alert-triangle'},
    POR_RETIRAR:{label:'Por retirar',icon:'ti-user-minus'},
    RESUELTO:{label:'Resuelto',icon:'ti-circle-check'}
  };

  function h(v){
    try{return typeof escHtml==='function'?escHtml(String(v==null?'':v)):String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}catch(e){return String(v==null?'':v);}
  }
  function cliente(id){try{return (ST.clientes||[]).find(function(c){return String(c.id)===String(id);})||null;}catch(e){return null;}}
  function agente(id){try{return (ST.agentes||[]).find(function(a){return String(a.id)===String(id);})||null;}catch(e){return null;}}
  function diasDesde(ts){if(!ts)return 0;var d=new Date(ts);if(isNaN(d))return 0;return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}
  function etiquetaEstado(k){return (ESTADOS[k]||{label:k||'Novedad'}).label;}
  function fmtFecha(v){if(!v)return '';try{return new Date(v.length===10?v+'T12:00:00':v).toLocaleDateString('es-DO',{day:'2-digit',month:'short'});}catch(e){return String(v);}}
  function notify(tipo,titulo,sub){try{if(typeof toast==='function')toast(tipo,titulo,sub||'');}catch(e){}}

  async function rpcSync(){
    try{
      if(!window.API||!API.url)return;
      var r=await fetch(API.url+'/rest/v1/rpc/novedades_sync_automaticas',{method:'POST',headers:API.hdr(),body:'{}'});
      if(!r.ok)console.warn('[Novedades] sync',await r.text());
    }catch(e){console.warn('[Novedades] sync',e);}
  }

  async function cargar(opts){
    opts=opts||{};
    if(cargando)return;
    cargando=true;
    try{
      if(opts.sync)await rpcSync();
      cache=await API.get('cliente_novedades','select=*&order=abierta.desc,fecha_inicio.asc&limit=1200')||[];
    }catch(e){
      console.error('[Novedades] cargar',e);
      notify('err','No se pudieron cargar las novedades',e.message||String(e));
    }finally{cargando=false;}
    actualizarContador();
    if(activo)pintar();
  }

  function ajustarEtiqueta(){
    var b=document.getElementById('cliTabProc');
    if(b){
      b.setAttribute('onclick',"switchCliTab('novedades')");
      b.innerHTML='<i class="ti ti-sparkles"></i> Novedades <span id="cntProc" class="nxft-cnt">'+abiertas().length+'</span>';
      b.title='Pendientes operativos de clientes';
    }
    try{
      var v=document.getElementById('v-clientes');
      if(v){
        var titulo=[].slice.call(document.querySelectorAll('#v-dashboard .ct')).find(function(x){return /Clientes en proceso/i.test(x.textContent||'');});
        if(titulo){titulo.textContent='Novedades pendientes';var sub=titulo.parentElement&&titulo.parentElement.querySelector('.ct-s');if(sub)sub.textContent='activaciones, gestiones y casos de riesgo';}
      }
    }catch(e){}
  }

  function abiertas(){return cache.filter(function(n){return n.abierta!==false;});}
  function actualizarContador(){ajustarEtiqueta();var c=document.getElementById('cntProc');if(c)c.textContent=abiertas().length;}

  function ocultarControles(on){
    var v=document.getElementById('v-clientes');if(!v)return;
    v.classList.toggle('nxnov-activo',!!on);
  }

  function conteoEstado(k){return cache.filter(function(n){return (modo==='pendientes'?n.abierta!==false:n.abierta===false)&&(k==='TODOS'||n.estado===k);}).length;}

  function ageClass(d){return d>=10?'danger':d>=4?'hot':'';}

  function card(n){
    var c=cliente(n.cliente_id)||{};
    var a=agente(n.agente_id||c.agente_id)||{};
    var d=diasDesde(n.fecha_inicio||n.created_at);
    var auto=n.origen==='AUTOMATICA';
    var seg=n.fecha_seguimiento?(' · Seguimiento '+fmtFecha(n.fecha_seguimiento)):'';
    var ced=c.cedula||'Sin cédula';
    return '<div class="nxnov-card" data-estado="'+h(n.estado)+'">'+
      '<div class="nxnov-mark"></div>'+
      '<div class="nxnov-main">'+
        '<div class="nxnov-row1"><span class="nxnov-name">'+h(c.nom||'Cliente')+'</span><span class="nxnov-badge">'+h(etiquetaEstado(n.estado))+'</span></div>'+
        '<div class="nxnov-meta">Céd. '+h(ced)+(a.nom?' · '+h(a.nom):'')+' · '+(auto?'Automática':'Manual')+h(seg)+'</div>'+
        '<div class="nxnov-reason">'+h(n.motivo||'Novedad')+'</div>'+
        (n.detalle?'<div class="nxnov-detail">'+h(n.detalle)+'</div>':'')+
        '<div class="nxnov-age '+ageClass(d)+'"><i class="ti ti-clock"></i> '+d+' día'+(d===1?'':'s')+' pendiente'+(d===1?'':'s')+'</div>'+
      '</div>'+
      '<div class="nxnov-actions">'+
        '<button class="nxnov-ico" onclick="event.stopPropagation();editarCli(\''+h(c.id||'')+'\')" title="Abrir cliente" aria-label="Abrir cliente"><i class="ti ti-user"></i></button>'+
        (n.estado==='EN_RIESGO'?'<button class="nxnov-ico risk" onclick="event.stopPropagation();nxNovPorRetirar(\''+h(n.id)+'\')" title="Marcar por retirar" aria-label="Marcar por retirar"><i class="ti ti-user-minus"></i></button>':'')+
        (!auto&&n.abierta!==false?'<button class="nxnov-ico" onclick="event.stopPropagation();nxNovEditar(\''+h(n.id)+'\')" title="Editar novedad" aria-label="Editar novedad"><i class="ti ti-edit"></i></button>':'')+
        (!auto&&n.abierta!==false?'<button class="nxnov-ico resolve" onclick="event.stopPropagation();nxNovResolver(\''+h(n.id)+'\')" title="Resolver" aria-label="Resolver"><i class="ti ti-check"></i></button>':'')+
      '</div></div>';
  }

  function pintar(){
    var box=document.getElementById('tbCli');if(!box)return;
    ocultarControles(true);
    ajustarEtiqueta();
    var base=cache.filter(function(n){return modo==='pendientes'?n.abierta!==false:n.abierta===false;});
    var list=base.filter(function(n){return filtro==='TODOS'||n.estado===filtro;});
    var op=abiertas();
    var kg={POR_ACTIVAR:0,EN_GESTION:0,EN_RIESGO:0,POR_RETIRAR:0};
    op.forEach(function(n){if(kg[n.estado]!=null)kg[n.estado]++;});
    box.innerHTML='<div class="nxnov-shell">'+
      '<section class="nxnov-hero"><div class="nxnov-head"><div class="nxnov-title"><h3>Novedades de clientes</h3><p>Lo que necesita atención antes de cerrar el ciclo. Los casos automáticos se actualizan con los datos reales del sistema.</p></div><button class="nxnov-new" onclick="nxNovNueva()"><i class="ti ti-plus"></i><span>Nueva novedad</span></button></div>'+
      '<div class="nxnov-kpis"><div class="nxnov-kpi"><b>'+op.length+'</b><span>Pendientes</span></div><div class="nxnov-kpi"><b>'+kg.EN_GESTION+'</b><span>En gestión</span></div><div class="nxnov-kpi"><b>'+kg.EN_RIESGO+'</b><span>En riesgo</span></div><div class="nxnov-kpi"><b>'+kg.POR_RETIRAR+'</b><span>Por retirar</span></div></div></section>'+
      '<div class="nxnov-segments" role="tablist"><button class="nxnov-seg '+(modo==='pendientes'?'on':'')+'" onclick="nxNovModo(\'pendientes\')">Pendientes <span>'+abiertas().length+'</span></button><button class="nxnov-seg '+(modo==='resueltos'?'on':'')+'" onclick="nxNovModo(\'resueltos\')">Resueltos <span>'+cache.filter(function(n){return n.abierta===false;}).length+'</span></button></div>'+
      '<div class="nxnov-filterbar">'+
        filtroBtn('TODOS','Todos',base.length)+
        filtroBtn('POR_ACTIVAR','Por activar',conteoEstado('POR_ACTIVAR'))+
        filtroBtn('EN_GESTION','En gestión',conteoEstado('EN_GESTION'))+
        filtroBtn('EN_RIESGO','En riesgo',conteoEstado('EN_RIESGO'))+
        filtroBtn('POR_RETIRAR','Por retirar',conteoEstado('POR_RETIRAR'))+
      '</div>'+
      '<div class="nxnov-list">'+(list.length?list.map(card).join(''):'<div class="nxnov-empty"><i class="ti ti-circle-check"></i><b>No hay casos en esta vista</b><span>Cuando aparezca una novedad, quedará aquí hasta resolverse.</span></div>')+'</div></div>';
    inyectarAccesosRapidos();
  }

  function filtroBtn(k,l,n){return '<button class="nxnov-filter '+(filtro===k?'on':'')+'" onclick="nxNovFiltro(\''+k+'\')">'+l+' <span class="n">'+n+'</span></button>';}

  function asegurarModal(){
    if(document.getElementById('nxNovOverlay'))return;
    var o=document.createElement('div');o.id='nxNovOverlay';o.className='nxnov-overlay';o.onclick=function(e){if(e.target===o)nxNovCerrar();};
    o.innerHTML='<div class="nxnov-sheet" role="dialog" aria-modal="true" aria-labelledby="nxNovTitulo"><div class="nxnov-handle"></div><div class="nxnov-sheet-h"><h3 id="nxNovTitulo">Nueva novedad</h3><button class="nxnov-close" onclick="nxNovCerrar()" aria-label="Cerrar"><i class="ti ti-x"></i></button></div><input type="hidden" id="nxNovId"><div class="nxnov-field"><label>Cliente</label><select id="nxNovCliente"></select></div><div class="nxnov-grid2"><div class="nxnov-field"><label>Estado</label><select id="nxNovEstado"><option value="POR_ACTIVAR">Por activar</option><option value="EN_GESTION">En gestión</option><option value="EN_RIESGO">En riesgo</option><option value="POR_RETIRAR">Por retirar</option></select></div><div class="nxnov-field"><label>Prioridad</label><select id="nxNovPrioridad"><option value="MEDIA">Media</option><option value="ALTA">Alta</option><option value="BAJA">Baja</option></select></div></div><div class="nxnov-field"><label>Motivo</label><input id="nxNovMotivo" placeholder="Ej. Falta documento, aprobación ARS, promesa de pago"></div><div class="nxnov-field"><label>Detalle / seguimiento</label><textarea id="nxNovDetalle" placeholder="Qué falta, qué se habló o cuál es el próximo paso"></textarea></div><div class="nxnov-field"><label>Fecha de seguimiento</label><input id="nxNovSeguimiento" type="date"></div><button id="nxNovGuardar" class="nxnov-save" onclick="nxNovGuardar()">Guardar novedad</button></div>';
    document.body.appendChild(o);
  }

  function llenarClientes(sel,pre){
    var arr=(ST.clientes||[]).slice().sort(function(a,b){return String(a.nom||'').localeCompare(String(b.nom||''));});
    sel.innerHTML='<option value="">Selecciona un cliente</option>'+arr.map(function(c){return '<option value="'+h(c.id)+'" '+(String(c.id)===String(pre)?'selected':'')+'>'+h(c.nom)+' · '+h(c.cedula||'sin cédula')+'</option>';}).join('');
  }

  window.nxNovNueva=function(clienteId,estado){
    asegurarModal();
    document.getElementById('nxNovTitulo').textContent='Nueva novedad';
    document.getElementById('nxNovId').value='';
    llenarClientes(document.getElementById('nxNovCliente'),clienteId||'');
    document.getElementById('nxNovCliente').disabled=false;
    document.getElementById('nxNovEstado').value=estado||'EN_GESTION';
    document.getElementById('nxNovPrioridad').value='MEDIA';
    document.getElementById('nxNovMotivo').value='';document.getElementById('nxNovDetalle').value='';document.getElementById('nxNovSeguimiento').value='';
    document.getElementById('nxNovOverlay').classList.add('open');setTimeout(function(){document.getElementById(clienteId?'nxNovMotivo':'nxNovCliente')?.focus();},120);
  };

  window.nxNovEditar=function(id){
    var n=cache.find(function(x){return String(x.id)===String(id);});if(!n)return;
    asegurarModal();document.getElementById('nxNovTitulo').textContent='Editar novedad';document.getElementById('nxNovId').value=n.id;
    llenarClientes(document.getElementById('nxNovCliente'),n.cliente_id);document.getElementById('nxNovCliente').disabled=true;
    document.getElementById('nxNovEstado').value=n.estado;document.getElementById('nxNovPrioridad').value=n.prioridad||'MEDIA';document.getElementById('nxNovMotivo').value=n.motivo||'';document.getElementById('nxNovDetalle').value=n.detalle||'';document.getElementById('nxNovSeguimiento').value=n.fecha_seguimiento||'';document.getElementById('nxNovOverlay').classList.add('open');
  };
  window.nxNovCerrar=function(){document.getElementById('nxNovOverlay')?.classList.remove('open');};

  window.nxNovGuardar=async function(){
    var btn=document.getElementById('nxNovGuardar');if(btn)btn.disabled=true;
    try{
      var id=document.getElementById('nxNovId').value;
      var cid=document.getElementById('nxNovCliente').value;
      var c=cliente(cid);
      var estado=document.getElementById('nxNovEstado').value;
      var motivo=(document.getElementById('nxNovMotivo').value||'').trim();
      if(!cid||!motivo){notify('err','Falta información','Selecciona el cliente y escribe el motivo.');return;}
      var data={estado:estado,motivo:motivo,detalle:(document.getElementById('nxNovDetalle').value||'').trim()||null,prioridad:document.getElementById('nxNovPrioridad').value,fecha_seguimiento:document.getElementById('nxNovSeguimiento').value||null,agente_id:c&&c.agente_id||null,updated_at:new Date().toISOString()};
      if(id){await API.patch('cliente_novedades','id=eq.'+encodeURIComponent(id),data);}
      else{data.cliente_id=cid;data.origen='MANUAL';data.abierta=true;data.created_by_name=(window.sesion&&sesion.nom)||null;await API.post('cliente_novedades',data);}
      nxNovCerrar();notify('ok',id?'Novedad actualizada':'Novedad creada');await cargar();
    }catch(e){notify('err','No se pudo guardar',e.message||String(e));}finally{if(btn)btn.disabled=false;}
  };

  window.nxNovResolver=async function(id){
    var n=cache.find(function(x){return String(x.id)===String(id);});if(!n||n.origen==='AUTOMATICA')return;
    if(!confirm('¿Marcar esta novedad como resuelta? El historial se conservará.'))return;
    try{await API.patch('cliente_novedades','id=eq.'+encodeURIComponent(id),{abierta:false,estado:'RESUELTO',resultado:'RESUELTO',resuelto_at:new Date().toISOString(),resuelto_por:(window.sesion&&sesion.nom)||'Usuario'});notify('ok','Novedad resuelta');await cargar();}catch(e){notify('err','No se pudo resolver',e.message||String(e));}
  };

  window.nxNovPorRetirar=async function(id){
    var n=cache.find(function(x){return String(x.id)===String(id);});if(!n)return;
    var c=cliente(n.cliente_id);if(!c)return;
    var existe=cache.some(function(x){return x.abierta!==false&&x.estado==='POR_RETIRAR'&&String(x.cliente_id)===String(c.id);});
    if(existe){notify('info','Ya está por retirar',c.nom);return;}
    try{await API.post('cliente_novedades',{cliente_id:c.id,agente_id:c.agente_id||null,estado:'POR_RETIRAR',motivo:'Retiro pendiente de confirmar',detalle:'Caso escalado desde seguimiento por falta de pago. La salida NO se ejecuta automáticamente.',origen:'MANUAL',prioridad:'ALTA',abierta:true,created_by_name:(window.sesion&&sesion.nom)||null});notify('ok','Marcado por retirar','La salida sigue pendiente de confirmación humana.');await cargar();}catch(e){notify('err','No se pudo marcar',e.message||String(e));}
  };

  window.nxNovModo=function(v){modo=v;filtro='TODOS';pintar();};
  window.nxNovFiltro=function(v){filtro=v;pintar();};
  window.nxNovAbrir=function(){try{nav('clientes',null);}catch(e){}setTimeout(function(){switchCliTab('novedades');},180);};

  function inyectarAccesosRapidos(){
    // Acceso general desde Facturas/Pendientes: no duplica funciones ni necesita seleccionar fila.
    var tabs=document.querySelector('#v-facturas .nxft-tabs');
    if(tabs&&!document.getElementById('nxNovQuickFact')){
      var b=document.createElement('button');b.id='nxNovQuickFact';b.type='button';b.className='nxft-tab nxnov-quick';b.innerHTML='<i class="ti ti-sparkles"></i> Novedades';b.onclick=window.nxNovAbrir;tabs.appendChild(b);
    }
    // Acceso contextual desde el menú de acciones del cliente.
    document.querySelectorAll('#tbCli .acc-menu[id^="accMenu_"]').forEach(function(m){
      if(m.querySelector('.nxnov-menu-action'))return;
      var cid=m.id.replace('accMenu_','');
      var b=document.createElement('button');b.type='button';b.className='acc-i-purple nxnov-menu-action';b.innerHTML='<i class="ti ti-sparkles"></i> Crear novedad';b.onclick=function(){try{if(typeof cerrarAccMenus==='function')cerrarAccMenus();}catch(e){}nxNovNueva(cid);};m.appendChild(b);
    });
  }

  function instalar(){
    ajustarEtiqueta();inyectarAccesosRapidos();
    if(typeof window.switchCliTab==='function'&&!window.switchCliTab.__nxNovWrapped){
      var orig=window.switchCliTab;
      var fn=function(tab){
        if(tab==='novedades'||tab==='proceso'){
          activo=true;modo='pendientes';filtro='TODOS';ocultarControles(true);
          var r=orig.call(this,'proceso');
          ajustarEtiqueta();
          setTimeout(function(){cargar({sync:true});},30);
          return r;
        }
        activo=false;ocultarControles(false);
        var out=orig.apply(this,arguments);setTimeout(function(){ajustarEtiqueta();actualizarContador();inyectarAccesosRapidos();},30);return out;
      };
      fn.__nxNovWrapped=true;window.switchCliTab=fn;
    }
    if(typeof window.rCli==='function'&&!window.rCli.__nxNovWrapped){
      var origR=window.rCli;
      var rf=function(){if(activo){pintar();return;}var out=origR.apply(this,arguments);setTimeout(function(){ajustarEtiqueta();actualizarContador();inyectarAccesosRapidos();},15);return out;};
      rf.__nxNovWrapped=true;window.rCli=rf;
    }
    var tb=document.getElementById('tbCli');if(tb&&window.MutationObserver){new MutationObserver(function(){if(!activo)inyectarAccesosRapidos();}).observe(tb,{childList:true,subtree:true});}
    cargar();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(instalar,0);},{once:true});
  else setTimeout(instalar,0);
})();
