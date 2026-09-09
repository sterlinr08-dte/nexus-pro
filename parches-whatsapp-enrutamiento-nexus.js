/* NEXUS PRO · WhatsApp · enrutamiento interno definitivo · 2026-09-08
   Evita que acciones antiguas abran wa.me / WhatsApp personal del agente.
   Todo intento de WhatsApp dentro de NEXUS PRO se redirige al Inbox interno.
   Si el teléfono corresponde a un cliente de Seguros, abre directamente su hilo.
   No cambia Zernio, Meta, API, envíos, Realtime ni reglas de 24h. */
(function(){
  'use strict';
  if(window.__nxWaEnrutamientoNexus20260908)return;
  window.__nxWaEnrutamientoNexus20260908=true;

  var nativeOpen=window.open.bind(window);

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
  function prefill(texto){
    if(!texto)return;
    var intentos=0;
    function tryFill(){
      intentos++;
      var inp=document.getElementById('nxWaTexto');
      if(inp){
        if(inp.disabled){
          toastSafe('warn','WhatsApp NEXUS PRO','La conversación está fuera de la ventana de 24 h; usa una plantilla para contactar al cliente.');
          return;
        }
        inp.value=texto;
        try{inp.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}
        try{inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}catch(e){}
        return;
      }
      if(intentos<20)setTimeout(tryFill,80);
    }
    setTimeout(tryFill,80);
  }

  window.nxWaAbrirPorTelefono=async function(telefono,texto){
    var c=clientePorTelefono(telefono);
    if(c&&c.id&&typeof window.nxAbrirWhatsAppDeCliente==='function'){
      try{
        await window.nxAbrirWhatsAppDeCliente(c.id);
        prefill(texto||'');
        return true;
      }catch(e){
        toastSafe('err','WhatsApp NEXUS PRO',String(e&&e.message||e));
        return false;
      }
    }
    abrirInbox();
    toastSafe('warn','WhatsApp NEXUS PRO','Ese número no está vinculado a un cliente de Seguros. Se abrió el Inbox de NEXUS PRO.');
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

  /* Intercepta botones JS antiguos que todavía hacen window.open('https://wa.me/...'). */
  window.open=function(url,target,features){
    if(esWaUrl(url)){
      redirigirWa(String(url));
      return null;
    }
    var w=nativeOpen(url,target,features);
    /* Algunos comprobantes abren primero about:blank y desde esa ventana llaman wa.me.
       Si sigue siendo same-origin, parcheamos solo su window.open para devolver la acción al Inbox. */
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

  /* Intercepta enlaces <a href="wa.me/..."> antiguos sin modificar sus módulos. */
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

  /* Etiqueta visual para que quede claro que el destino es el Inbox corporativo. */
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
