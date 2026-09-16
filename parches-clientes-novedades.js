/* NEXUS PRO · Clientes / Novedades
   Sustituye visualmente "En proceso" por una bandeja operativa de novedades.
   Compatible con el flujo legado: 'proceso' queda como alias interno para no romper accesos viejos. */
(function(){
  'use strict';
  if(window.__nxClientesNovedades20260915)return;
  window.__nxClientesNovedades20260915=true;

  var activo=false;
  var modo='pendientes';
  var tipo='TODOS';
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
  function notify(tipoAviso,titulo,sub){try{if(typeof toast==='function')toast(tipoAviso,titulo,sub||'');}catch(e){}}

  // Clasificación operativa sin cambiar el estado real del cliente.
  // ENTRADA = activación / proceso. SALIDA = candidato por 2+ meses vencidos o retiro ya escalado.
  // Un solo mes vencido sigue visible como EN_RIESGO, pero NO entra en SALIDA ni habilita retiro.
  function mesesMora(n){
    try{var m=n&&n.metadata&&n.metadata.meses;return Math.max(0,Number(m)||0);}catch(e){return 0;}
  }
  function tipoNovedad(n){
    if(!n)return 'OTRO';
    if(n.estado==='POR_RETIRAR')return 'SALIDA';
    if(n.origen_clave==='mora_fifo')return mesesMora(n)>=2?'SALIDA':'OTRO';
    if(n.origen_clave==='proceso_actual'||n.estado==='POR_ACTIVAR')return 'ENTRADA';
    return 'OTRO';
  }
  function coincideTipo(n){return tipo==='TODOS'||tipoNovedad(n)===tipo;}
  function tipoLabel(n){var t=tipoNovedad(n);return t==='ENTRADA'?'Entrada':t==='SALIDA'?'Salida':'';}

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
        if(titulo){titulo.textContent='Novedades pendientes';var sub=titulo.parentElement&&titulo.parentElement.querySelector('.ct-s');if(sub)sub.textContent='entradas, gestiones, riesgo y salidas';}
      }
    }catch(e){}
  }

  function abiertas(){return cache.filter(function(n){return n.abierta!==false;});}
  function actualizarContador(){ajustarEtiqueta();var c=document.getElementById('cntProc');if(c)c.textContent=abiertas().length;}

  function ocultarControles(on){
    var v=document.getElementById('v-clientes');if(!v)return;
    v.classList.toggle('nxnov-activo',!!on);
  }

  function enModo(n){return modo==='pendientes'?n.abierta!==false:n.abierta===false;}
  function conteoEstado(k){return cache.filter(function(n){return enModo(n)&&coincideTipo(n)&&(k==='TODOS'||n.estado===k);}).length;}
  function conteoTipo(k){return cache.filter(function(n){return enModo(n)&&(k==='TODOS'||tipoNovedad(n)===k);}).length;}

  function ageClass(d){return d>=10?'danger':d>=4?'hot':'';}

  function reduceMotion(){try{return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}}
  function rubberband(overshoot,dimension){var c=.55;return (overshoot*dimension*c)/(dimension+c*Math.abs(overshoot));}

  // La pastilla del segmentado persiste su última posición en esta variable (no en el DOM,
  // porque pintar() reconstruye el árbol completo en cada render) para poder animar un
  // desplazamiento real aunque el nodo del segmentado se destruya y se cree de nuevo.
  var thumbRect=null;
  function moverThumb(segEl,instant){
    if(!segEl)return;
    var on=segEl.querySelector('.nxnov-seg.on');
    var thumb=segEl.querySelector('.nxnov-seg-thumb');
    if(!on||!thumb)return;
    var segBox=segEl.getBoundingClientRect();
    var onBox=on.getBoundingClientRect();
    var left=onBox.left-segBox.left;
    var width=onBox.width;
    var previo=thumbRect;
    thumbRect={left:left,width:width};
    if(instant||reduceMotion()||!previo){
      thumb.style.transition='none';
      thumb.style.transform='translateX('+left+'px)';
      thumb.style.width=width+'px';
      return;
    }
    thumb.style.transition='none';
    thumb.style.transform='translateX('+previo.left+'px)';
    thumb.style.width=previo.width+'px';
    thumb.getBoundingClientRect();
    requestAnimationFrame(function(){
      thumb.style.transition='transform .28s cubic-bezier(.2,.85,.25,1), width .28s cubic-bezier(.2,.85,.25,1)';
      thumb.style.transform='translateX('+left+'px)';
      thumb.style.width=width+'px';
    });
  }

  // Arrastre real del asa de la hoja (pointerdown/move/up), con rebote en el límite superior y
  // umbral de distancia+velocidad para decidir si cierra o vuelve a su sitio. Se desactiva del
  // todo si el usuario prefiere menos movimiento: el asa queda decorativa, como antes.
  function instalarArrastreHoja(sheet){
    var handle=sheet&&sheet.querySelector('.nxnov-handle');
    if(!handle||handle.__nxDragBound)return;
    handle.__nxDragBound=true;
    if(reduceMotion())return;
    var DIST=120,VEL=.55;
    var arrastrando=false,inicioY=0,base=0,ultY=0,ultT=0,vel=0,alto=0;
    function yActual(){
      try{return new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42;}catch(e){return 0;}
    }
    handle.addEventListener('pointerdown',function(e){
      if(e.pointerType==='mouse'&&e.button!==0)return;
      arrastrando=true;
      try{handle.setPointerCapture(e.pointerId);}catch(err){}
      alto=sheet.getBoundingClientRect().height||1;
      inicioY=e.clientY;base=yActual();ultY=e.clientY;ultT=e.timeStamp;vel=0;
      sheet.style.transition='none';
    });
    handle.addEventListener('pointermove',function(e){
      if(!arrastrando)return;
      var dy=e.clientY-inicioY;
      var y=base+dy;
      if(y<0)y=rubberband(y,alto);
      sheet.style.transform='translateY('+y+'px)';
      var dt=e.timeStamp-ultT;
      if(dt>0)vel=(e.clientY-ultY)/dt;
      ultY=e.clientY;ultT=e.timeStamp;
    });
    function terminar(e){
      if(!arrastrando)return;
      arrastrando=false;
      try{handle.releasePointerCapture(e.pointerId);}catch(err){}
      var y=yActual();
      var cerrar=(y>DIST)||(vel>VEL&&y>20);
      if(cerrar){
        sheet.style.transition='transform .22s cubic-bezier(.2,.7,.3,1)';
        sheet.style.transform='translateY(100%)';
        var ov=document.getElementById('nxNovOverlay');if(ov)ov.classList.remove('open');
        setTimeout(function(){sheet.style.transition='';sheet.style.transform='';},240);
      }else{
        sheet.style.transition='transform .32s cubic-bezier(.2,.85,.25,1)';
        sheet.style.transform='';
        setTimeout(function(){sheet.style.transition='';},340);
      }
    }
    handle.addEventListener('pointerup',terminar);
    handle.addEventListener('pointercancel',terminar);
  }

  function card(n){
    var c=cliente(n.cliente_id)||{};
    var a=agente(n.agente_id||c.agente_id)||{};
    var d=diasDesde(n.fecha_inicio||n.created_at);
    var auto=n.origen==='AUTOMATICA';
    var seg=n.fecha_seguimiento?(' · Seguimiento '+fmtFecha(n.fecha_seguimiento)):'';
    var ced=c.cedula||'Sin cédula';
    var t=tipoNovedad(n),tl=tipoLabel(n);
    var meses=mesesMora(n);
    var salidaLista=t==='SALIDA'&&n.estado==='EN_RIESGO';
    return '<div class="nxnov-card" data-estado="'+h(n.estado)+'" data-tipo="'+h(t)+'">'+
      '<div class="nxnov-mark"></div>'+
      '<div class="nxnov-main">'+
        '<div class="nxnov-row1"><span class="nxnov-name">'+h(c.nom||'Cliente')+'</span><span class="nxnov-badge">'+h(etiquetaEstado(n.estado))+'</span></div>'+
        '<div class="nxnov-meta">Céd. '+h(ced)+(a.nom?' · '+h(a.nom):'')+' · '+(auto?'Automática':'Manual')+(tl?' · '+h(tl):'')+(n.origen_clave==='mora_fifo'&&meses?' · '+meses+' mes'+(meses===1?'':'es')+' vencido'+(meses===1?'':'s'):'')+h(seg)+'</div>'+
        '<div class="nxnov-reason">'+h(n.motivo||'Novedad')+'</div>'+
        (n.detalle?'<div class="nxnov-detail">'+h(n.detalle)+'</div>':'')+
        '<div class="nxnov-age '+ageClass(d)+'"><i class="ti ti-clock"></i> '+d+' día'+(d===1?'':'s')+' pendiente'+(d===1?'':'s')+'</div>'+
      '</div>'+
      '<div class="nxnov-actions">'+
        '<button class="nxnov-ico" onclick="event.stopPropagation();editarCli(\''+h(c.id||'')+'\')" title="Abrir cliente" aria-label="Abrir cliente"><i class="ti ti-user"></i></button>'+
        (salidaLista?'<button class="nxnov-ico risk" onclick="event.stopPropagation();nxNovPorRetirar(\''+h(n.id)+'\')" title="Marcar por retirar" aria-label="Marcar por retirar"><i class="ti ti-user-minus"></i></button>':'')+
        (!auto&&n.abierta!==false?'<button class="nxnov-ico" onclick="event.stopPropagation();nxNovEditar(\''+h(n.id)+'\')" title="Editar novedad" aria-label="Editar novedad"><i class="ti ti-edit"></i></button>':'')+
        (!auto&&n.abierta!==false?'<button class="nxnov-ico resolve" onclick="event.stopPropagation();nxNovResolver(\''+h(n.id)+'\')" title="Resolver" aria-label="Resolver"><i class="ti ti-check"></i></button>':'')+
      '</div></div>';
  }

  function pintar(){
    var box=document.getElementById('tbCli');if(!box)return;
    ocultarControles(true);
    ajustarEtiqueta();
    var baseModo=cache.filter(enModo);
    var base=baseModo.filter(coincideTipo);
    var list=base.filter(function(n){return filtro==='TODOS'||n.estado===filtro;});
    var op=abiertas();
    var entradas=op.filter(function(n){return tipoNovedad(n)==='ENTRADA';}).length;
    var salidas=op.filter(function(n){return tipoNovedad(n)==='SALIDA';}).length;
    var kg={POR_ACTIVAR:0,EN_GESTION:0,EN_RIESGO:0,POR_RETIRAR:0};
    op.forEach(function(n){if(kg[n.estado]!=null)kg[n.estado]++;});
    box.innerHTML='<div class="nxnov-shell">'+
      '<section class="nxnov-hero"><div class="nxnov-head"><div class="nxnov-title"><h3>Novedades de clientes</h3><p>Entradas para activación y salidas por falta de pago. Salida se selecciona automáticamente solo al acumular 2 meses vencidos; la baja nunca se ejecuta sola.</p></div><button class="nxnov-new" onclick="nxNovNueva()"><i class="ti ti-plus"></i><span>Nueva novedad</span></button></div>'+
      '<div class="nxnov-kpis"><div class="nxnov-kpi"><b>'+op.length+'</b><span>Pendientes</span></div><div class="nxnov-kpi"><b>'+entradas+'</b><span>Entradas</span></div><div class="nxnov-kpi"><b>'+salidas+'</b><span>Salidas</span></div><div class="nxnov-kpi"><b>'+kg.EN_RIESGO+'</b><span>En riesgo</span></div></div></section>'+
      '<div class="nxnov-segments" role="tablist" aria-label="Tipo de novedad"><button class="nxnov-seg '+(tipo==='TODOS'?'on':'')+'" onclick="nxNovTipo(\'TODOS\')">Todas <span>'+conteoTipo('TODOS')+'</span></button><button class="nxnov-seg '+(tipo==='ENTRADA'?'on':'')+'" onclick="nxNovTipo(\'ENTRADA\')">Entrada <span>'+conteoTipo('ENTRADA')+'</span></button><button class="nxnov-seg '+(tipo==='SALIDA'?'on':'')+'" onclick="nxNovTipo(\'SALIDA\')">Salida <span>'+conteoTipo('SALIDA')+'</span></button></div>'+
      '<div class="nxnov-segments" role="tablist"><div class="nxnov-seg-thumb"></div><button class="nxnov-seg '+(modo==='pendientes'?'on':'')+'" onclick="nxNovModo(\'pendientes\')">Pendientes <span>'+abiertas().length+'</span></button><button class="nxnov-seg '+(modo==='resueltos'?'on':'')+'" onclick="nxNovModo(\'resueltos\')">Resueltos <span>'+cache.filter(function(n){return n.abierta===false;}).length+'</span></button></div>'+
      '<div class="nxnov-filterbar">'+
        filtroBtn('TODOS','Todos',base.length)+
        filtroBtn('POR_ACTIVAR','Por activar',conteoEstado('POR_ACTIVAR'))+
        filtroBtn('EN_GESTION','En gestión',conteoEstado('EN_GESTION'))+
        filtroBtn('EN_RIESGO','En riesgo',conteoEstado('EN_RIESGO'))+
        filtroBtn('POR_RETIRAR','Por retirar',conteoEstado('POR_RETIRAR'))+
      '</div>'+
      '<div class="nxnov-list">'+(list.length?list.map(card).join(''):'<div class="nxnov-empty"><i class="ti ti-circle-check"></i><b>No hay casos en esta vista</b><span>Cuando aparezca una novedad, quedará aquí hasta resolverse.</span></div>')+'</div></div>';
    moverThumb(box.querySelector('.nxnov-segments:has(.nxnov-seg-thumb)'));
    inyectarAccesosRapidos();
  }

  function filtroBtn(k,l,n){return '<button class="nxnov-filter '+(filtro===k?'on':'')+'" onclick="nxNovFiltro(\''+k+'\')">'+l+' <span class="n">'+n+'</span></button>';}

  function asegurarModal(){
    if(document.getElementById('nxNovOverlay'))return;
    var o=document.createElement('div');o.id='nxNovOverlay';o.className='nxnov-overlay';o.onclick=function(e){if(e.target===o)nxNovCerrar();};
    o.innerHTML='<div class="nxnov-sheet" role="dialog" aria-modal="true" aria-labelledby="nxNovTitulo"><div class="nxnov-handle"></div><div class="nxnov-sheet-h"><h3 id="nxNovTitulo">Nueva novedad</h3><button class="nxnov-close" onclick="nxNovCerrar()" aria-label="Cerrar"><i class="ti ti-x"></i></button></div><input type="hidden" id="nxNovId"><div class="nxnov-field"><label>Cliente</label><select id="nxNovCliente"></select></div><div class="nxnov-grid2"><div class="nxnov-field"><label>Estado</label><select id="nxNovEstado"><option value="POR_ACTIVAR">Por activar</option><option value="EN_GESTION">En gestión</option><option value="EN_RIESGO">En riesgo</option><option value="POR_RETIRAR">Por retirar</option></select></div><div class="nxnov-field"><label>Prioridad</label><select id="nxNovPrioridad"><option value="MEDIA">Media</option><option value="ALTA">Alta</option><option value="BAJA">Baja</option></select></div></div><div class="nxnov-field"><label>Motivo</label><input id="nxNovMotivo" placeholder="Ej. Falta documento, aprobación ARS, promesa de pago"></div><div class="nxnov-field"><label>Detalle / seguimiento</label><textarea id="nxNovDetalle" placeholder="Qué falta, qué se habló o cuál es el próximo paso"></textarea></div><div class="nxnov-field"><label>Fecha de seguimiento</label><input id="nxNovSeguimiento" type="date"></div><button id="nxNovGuardar" class="nxnov-save" onclick="nxNovGuardar()">Guardar novedad</button></div>';
    document.body.appendChild(o);
    instalarArrastreHoja(o.querySelector('.nxnov-sheet'));
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
    if(tipoNovedad(n)!=='SALIDA'){
      notify('info','Aún no corresponde a salida','Salida se habilita cuando el cliente acumula 2 meses vencidos.');
      return;
    }
    var existe=cache.some(function(x){return x.abierta!==false&&x.estado==='POR_RETIRAR'&&String(x.cliente_id)===String(c.id);});
    if(existe){notify('info','Ya está por retirar',c.nom);return;}
    try{await API.post('cliente_novedades',{cliente_id:c.id,agente_id:c.agente_id||null,estado:'POR_RETIRAR',motivo:'Retiro pendiente de confirmar',detalle:'Caso escalado desde seguimiento por falta de pago. La salida NO se ejecuta automáticamente.',origen:'MANUAL',prioridad:'ALTA',abierta:true,created_by_name:(window.sesion&&sesion.nom)||null});notify('ok','Marcado por retirar','La salida sigue pendiente de confirmación humana.');await cargar();}catch(e){notify('err','No se pudo marcar',e.message||String(e));}
  };

  window.nxNovModo=function(v){modo=v;filtro='TODOS';pintar();};
  window.nxNovTipo=function(v){tipo=v;filtro='TODOS';pintar();};
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
          activo=true;modo='pendientes';tipo='TODOS';filtro='TODOS';ocultarControles(true);
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
    window.addEventListener('resize',function(){
      if(!activo)return;
      var box=document.getElementById('tbCli');
      if(box)moverThumb(box.querySelector('.nxnov-segments:has(.nxnov-seg-thumb)'),true);
    },{passive:true});
    cargar();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(instalar,0);},{once:true});
  else setTimeout(instalar,0);
})();