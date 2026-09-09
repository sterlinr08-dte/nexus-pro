/* NEXUS PRO · WhatsApp · enrutamiento interno cliente/agente · 2026-09-08
   Evita que acciones antiguas abran wa.me / WhatsApp personal del usuario.
   Todo intento de WhatsApp dentro de NEXUS PRO se redirige al Inbox corporativo.
   Reconoce tanto clientes de Seguros como agentes y abre el hilo correcto por teléfono.
   La ventana de 24 h de Meta sigue mandando para texto libre. */
(function(){
  'use strict';
  if(window.__nxWaEnrutamientoNexusClienteAgente20260908)return;
  window.__nxWaEnrutamientoNexusClienteAgente20260908=true;

  var nativeOpen=window.open.bind(window);
  var agentesCache=null,agentesCacheAt=0;

  function api(){
    try{return window.API||(typeof API!=='undefined'?API:null);}catch(e){return window.API||null;}
  }
  function digits(v){return String(v||'').replace(/\D/g,'');}
  function phoneKey(v){
    var d=digits(v);
    if(d.length>10)d=d.slice(-10);
    return d;
  }
  function clientes(){
    try{return (window.ST||{}).clientes||[];}catch(e){return [];}
  }
  function clientePorTelefono(tel){
    var k=phoneKey(tel); if(!k)return null;
    var arr=clientes();
    for(var i=0;i<arr.length;i++){
      var c=arr[i]||{};
      var vals=[c.telefono,c.tel,c.whatsapp,c.wa,c.celular,c.movil];
      for(var j=0;j<vals.length;j++) if(phoneKey(vals[j])===k)return c;
    }
    return null;
  }
  async function cargarAgentes(){
    var ahora=Date.now();
    if(agentesCache&&ahora-agentesCacheAt<60000)return agentesCache;
    try{
      var local=(window.ST||{}).agentes;
      if(Array.isArray(local)&&local.length){agentesCache=local;agentesCacheAt=ahora;return local;}
    }catch(e){}
    try{
      var A=api();
      if(A&&typeof A.get==='function'){
        var rows=await A.get('agentes','select=id,nom,tel,activo&activo=eq.true&order=nom.asc')||[];
        if(Array.isArray(rows)){agentesCache=rows;agentesCacheAt=ahora;return rows;}
      }
    }catch(e){}
    return [];
  }
  async function agentePorTelefono(tel){
    var k=phoneKey(tel); if(!k)return null;
    var arr=await cargarAgentes();
    for(var i=0;i<arr.length;i++){
      var a=arr[i]||{};
      if(phoneKey(a.tel||a.telefono||a.whatsapp)===k)return a;
    }
    return null;
  }
  function toastSafe(tipo,titulo,msg){
    try{if(typeof window.toast==='function')window.toast(tipo,titulo,msg||'');}catch(e){}
  }
  function abrirInbox(){
    try{
      if(typeof window.nxAbrirWaInbox==='function'){window.nxAbrirWaInbox();return true;}
      if(typeof window.nav==='function'){window.nav('waInbox');return true;}
    }catch(e){}
    return false;
  }
  async function abrirHiloPorId(hiloId){
    try{if(typeof window.nav==='function')window.nav('waInbox',null);}catch(e){}
    if(typeof window.nxWaAbrirHilo==='function'){
      await window.nxWaAbrirHilo(hiloId);
      return true;
    }
    abrirInbox();
    return false;
  }
  function prefill(texto,tipoDestino,nombreDestino){
    if(!texto)return;
    var intentos=0;
    function tryFill(){
      intentos++;
      var inp=document.getElementById('nxWaTexto');
      if(inp){
        inp.value=texto;
        try{inp.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
        if(inp.disabled){
          var quien=tipoDestino==='agente'?'El agente '+(nombreDestino||'seleccionado'):'El cliente';
          toastSafe('warn','Ventana de 24 h cerrada',quien+' debe escribir primero al WhatsApp de NEXUS PRO, o debe usarse una plantilla aprobada por Meta. El mensaje quedó preparado en la conversación.');
          return;
        }
        try{inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}catch(e){}
        return;
      }
      if(intentos<24)setTimeout(tryFill,90);
    }
    setTimeout(tryFill,90);
  }

  window.nxWaAbrirPorTelefono=async function(telefono,texto){
    var c=clientePorTelefono(telefono);
    if(c&&c.id&&typeof window.nxAbrirWhatsAppDeCliente==='function'){
      try{
        await window.nxAbrirWhatsAppDeCliente(c.id);
        prefill(texto||'','cliente',c.nom||'');
        return true;
      }catch(e){
        toastSafe('err','WhatsApp NEXUS PRO',String(e&&e.message||e));
        return false;
      }
    }

    var a=await agentePorTelefono(telefono);
    if(a&&a.id){
      try{
        var A=api();
        if(!A||typeof A.post!=='function')throw new Error('API no disponible');
        var hiloId=await A.post('rpc/whatsapp_hilo_por_agente',{p_agente_id:a.id});
        if(!hiloId)throw new Error('No se pudo crear el hilo del agente');
        await abrirHiloPorId(hiloId);
        prefill(texto||'','agente',a.nom||'');
        return true;
      }catch(e){
        toastSafe('err','WhatsApp NEXUS PRO','No se pudo abrir el WhatsApp del agente. '+String(e&&e.message||e));
        return false;
      }
    }

    abrirInbox();
    toastSafe('warn','WhatsApp NEXUS PRO','Ese número no está vinculado a un cliente ni a un agente de Seguros. Se abrió el Inbox de NEXUS PRO.');
    return false;
  };

  function esWaUrl(url){
    if(!url||typeof url!=='string')return false;
    try{
      var u=new URL(url,location.href);
      var h=(u.hostname||'').toLowerCase();
      return h==='wa.me'||h==='www.wa.me'||h==='api.whatsapp.com'||h==='web.whatsapp.com';
    }catch(e){return /^https?:\/\/(?:www\.)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/i.test(url);}
  }
  function parseWa(url){
    var out={telefono:'',texto:''};
    try{
      var u=new URL(url,location.href),h=(u.hostname||'').toLowerCase();
      if(h==='wa.me'||h==='www.wa.me')out.telefono=(u.pathname||'').replace(/^\/+/, '').split('/')[0]||'';
      else out.telefono=u.searchParams.get('phone')||'';
      out.texto=u.searchParams.get('text')||'';
    }catch(e){}
    return out;
  }
  function redirigirWa(url){
    var p=parseWa(url);
    window.nxWaAbrirPorTelefono(p.telefono,p.texto);
  }

  /* Botones JS antiguos que todavía hacen window.open('https://wa.me/...'). */
  window.open=function(url,target,features){
    if(esWaUrl(url)){
      redirigirWa(String(url));
      return null;
    }
    var w=nativeOpen(url,target,features);
    try{
      if(w&&(!url||String(url)===''||String(url).indexOf('about:blank')===0)){
        var childNative=w.open.bind(w);
        w.open=function(cUrl,cTarget,cFeatures){
          if(esWaUrl(cUrl)){
            var p=parseWa(String(cUrl));
            try{if(w.opener&&typeof w.opener.nxWaAbrirPorTelefono==='function')w.opener.nxWaAbrirPorTelefono(p.telefono,p.texto);}catch(e){}
            return null;
          }
          return childNative(cUrl,cTarget,cFeatures);
        };
      }
    }catch(e){}
    return w;
  };

  /* Enlaces <a href="wa.me/..."> antiguos. */
  document.addEventListener('click',function(ev){
    var a=ev.target&&ev.target.closest?ev.target.closest('a[href]'):null;
    if(!a)return;
    var href=a.getAttribute('href')||'';
    if(!esWaUrl(href))return;
    ev.preventDefault();
    ev.stopPropagation();
    if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
    redirigirWa(href);
  },true);

  function marcar(){
    document.querySelectorAll('a[href*="wa.me"],a[href*="api.whatsapp.com"]').forEach(function(a){
      a.setAttribute('title','Abrir en WhatsApp NEXUS PRO');
      a.setAttribute('aria-label','Abrir en WhatsApp NEXUS PRO');
    });
  }
  marcar();
  var q=false;
  new MutationObserver(function(){
    if(q)return;q=true;
    requestAnimationFrame(function(){q=false;marcar();});
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
