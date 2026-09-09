/* NEXUS PRO · Seguros loader
   Carga funcional secuencial + UI crítica inmediata para evitar FOUC en iOS/Safari. */
(function(){
  'use strict';
  if(window.__nxSegurosLoader20260906)return;
  window.__nxSegurosLoader20260906=true;

  function qv(){
    try{
      var s=document.currentScript&&document.currentScript.src||'',q=s.indexOf('?');
      var base=q>=0?s.slice(q):'';
      return base?(base+'&b=5855'):'?b=5855';
    }catch(e){return '?b=5855';}
  }

  var head=document.head||document.documentElement;

  /*
   * FIX 2026-09-09 · iOS/Safari todavía alcanzaba a mostrar los estilos antiguos
   * mientras descargaba las capas profesionales externas. La captura del dueño
   * confirma el FOUC: accesos rápidos con círculos/gradientes grandes y, después,
   * la versión compacta.
   *
   * Este bloque contiene SOLO geometría/estilo crítico de topbar, sidebar y Dashboard.
   * Se inyecta de forma síncrona en cuanto este loader se ejecuta, antes de esperar
   * ninguna hoja externa. Las capas profesionales completas siguen siendo la fuente
   * final de verdad y lo reemplazan con los mismos valores cuando terminan de cargar.
   */
  (function instalarCssCritico(){
    if(document.getElementById('nxProfCritical5855'))return;
    var st=document.createElement('style');
    st.id='nxProfCritical5855';
    st.setAttribute('data-nx-prof','1');
    st.textContent=`
#app{--nx-critical-line:#dbe3ee;--nx-critical-blue:#2563eb}
#app .tnav{height:48px!important;gap:8px!important;background:rgba(255,255,255,.97)!important;border-bottom:1px solid #e5eaf1!important;box-shadow:0 1px 2px rgba(15,23,42,.04)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
#app .tn-r{gap:5px!important}
#app .tn-tog,#app .tn-b{width:32px!important;min-width:32px!important;height:32px!important;padding:0!important;border:1px solid #dde4ed!important;border-radius:8px!important;background:#fff!important;color:#5e6c82!important;box-shadow:none!important;transform:none!important;font-size:14px!important;gap:0!important}
#app .tn-tog i,#app .tn-b i{font-size:14px!important;line-height:1!important}
#app .tn-b-primary{width:34px!important;min-width:34px!important;background:#eff6ff!important;color:#2563eb!important;border-color:#bfdbfe!important;box-shadow:none!important}
#app .tn-b-primary kbd{display:none!important}
#app .tn-r>.tn-b[title="Instalar como app en iOS/Android"]{display:none!important}
#app .sb{width:188px!important;box-shadow:none!important}
#app .sb.col{width:50px!important}
#app .sb-nav{padding:8px 7px!important}
#app .ni{min-height:32px!important;margin:1px 0!important;padding:6px 8px!important;gap:8px!important;border-radius:7px!important;background:transparent!important;border:1px solid transparent!important;box-shadow:none!important;transform:none!important}
#app .ni-i{width:18px!important;min-width:18px!important;height:18px!important;display:grid!important;place-items:center!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;filter:none!important;font-size:14px!important;line-height:1!important}
#app .ni-l{font-size:10px!important;font-weight:600!important;letter-spacing:.15px!important}
body.tema-glass #app .sb,body.tema-glass #app nav.sb,body.tema-glass #app #sbEl{background:rgba(248,250,252,.97)!important;border-right:1px solid #e2e8f0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body.tema-glass #app .ni-l{color:#526078!important}body.tema-glass #app .ni-i{color:#7a8799!important}
#app #v-dashboard .qa-g{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(118px,1fr))!important;gap:6px!important;margin-bottom:10px!important}
#app #v-dashboard .qa{min-height:46px!important;padding:7px 9px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;text-align:left!important;border:1px solid #dbe3ee!important;border-radius:9px!important;background:#fff!important;box-shadow:none!important;transform:none!important}
#app #v-dashboard .qa-i{width:28px!important;height:28px!important;margin:0!important;flex:0 0 28px!important;display:grid!important;place-items:center!important;border-radius:7px!important;background:#eff6ff!important;color:#2563eb!important;font-size:14px!important;box-shadow:none!important;filter:none!important}
#app #v-dashboard .qa-l{font-size:9.5px!important;font-weight:700!important;color:#334155!important;line-height:1.2!important;box-shadow:none!important;background:transparent!important}
body.tema-premium #app .tnav{background:#111827!important;border-bottom-color:#263244!important}
body.tema-premium #app .tn-tog,body.tema-premium #app .tn-b{background:#182233!important;color:#aebbd0!important;border-color:#2d3a4f!important}
body.tema-premium #app #v-dashboard .qa{background:#182233!important;border-color:#2f3b4d!important}
body.tema-premium #app #v-dashboard .qa-i{background:#162a4a!important;color:#7fb0ff!important}
body.tema-premium #app #v-dashboard .qa-l{color:#d4dbea!important}
@media(max-width:768px){
  #app .tnav{height:48px!important}
  #app .tn-tog,#app .tn-b{width:36px!important;min-width:36px!important;height:36px!important}
  #app #v-dashboard .qa-g{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:5px!important}
  #app #v-dashboard .qa{min-height:44px!important;padding:7px 8px!important}
}
`;
    head.appendChild(st);
  })();

  /* Adelanta la conexión y el webfont de Tabler. En Safari la hoja CSS puede estar
     lista antes que la fuente; eso deja durante un instante botones vacíos. */
  (function precargarTabler(){
    try{
      if(!document.getElementById('nxTiPreconnect')){
        var pc=document.createElement('link');pc.id='nxTiPreconnect';pc.rel='preconnect';pc.href='https://cdn.jsdelivr.net';pc.crossOrigin='anonymous';head.appendChild(pc);
      }
      if(!document.getElementById('nxTiFontPreload')){
        var pf=document.createElement('link');pf.id='nxTiFontPreload';pf.rel='preload';pf.as='font';pf.type='font/woff2';pf.crossOrigin='anonymous';pf.href='https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.46.0/dist/fonts/tabler-icons.woff2?v3.46.0';head.appendChild(pf);
      }
    }catch(e){}
  })();

  function load(src,done){
    var s=document.createElement('script');
    s.src=src+qv();
    s.async=false;
    s.onload=function(){if(done)done();};
    s.onerror=function(){
      console.error('[NEXUS PRO] No se pudo cargar '+src);
      if(done)done();
    };
    head.appendChild(s);
  }

  function css(src){
    var l=document.createElement('link');
    l.rel='stylesheet';
    l.href=src+qv();
    l.onerror=function(){console.error('[NEXUS PRO] No se pudo cargar '+src);};
    head.appendChild(l);
    return l;
  }

  /*
   * FIX 2026-09-09 · salto visual / estilos que cambian a los pocos segundos.
   * Las cuatro capas completas se piden inmediatamente y en paralelo; si un módulo
   * lazy agrega CSS más tarde, se promueve esta misma pila al final de la cascada.
   */
  var visualCss=[
    'parches-ui-profesional-compacta.css',
    'parches-ui-profesional-fase2.css',
    'parches-ui-profesional-fase3.css',
    'parches-ui-profesional-fase4.css'
  ];
  var visualLinks=[];

  function visualId(src){return 'nxProf_'+src.replace(/[^a-z0-9]+/gi,'_');}
  function cargarVisual(src){
    var id=visualId(src),l=document.getElementById(id);
    if(l)return l;
    l=document.createElement('link');
    l.id=id;
    l.rel='stylesheet';
    l.href=src+qv();
    l.setAttribute('data-nx-prof','1');
    l.onerror=function(){console.error('[NEXUS PRO] No se pudo cargar '+src);};
    head.appendChild(l);
    return l;
  }
  function promoverVisuales(){
    for(var i=0;i<visualLinks.length;i++){
      var l=visualLinks[i];
      if(l&&l.parentNode===head)head.appendChild(l);
    }
    var crit=document.getElementById('nxProfCritical5855');
    if(crit&&crit.parentNode===head)head.appendChild(crit);
  }

  for(var vi=0;vi<visualCss.length;vi++)visualLinks.push(cargarVisual(visualCss[vi]));

  var promoteQueued=false;
  if(window.MutationObserver&&head){
    new MutationObserver(function(muts){
      var externo=false;
      for(var mi=0;mi<muts.length&&!externo;mi++){
        var ns=muts[mi].addedNodes||[];
        for(var ni=0;ni<ns.length;ni++){
          var n=ns[ni];
          if(!n||n.nodeType!==1||n.getAttribute('data-nx-prof')==='1')continue;
          var tag=(n.tagName||'').toUpperCase();
          if(tag==='STYLE'||(tag==='LINK'&&String(n.rel||'').toLowerCase()==='stylesheet')){externo=true;break;}
        }
      }
      if(!externo||promoteQueued)return;
      promoteQueued=true;
      requestAnimationFrame(function(){promoteQueued=false;promoverVisuales();});
    }).observe(head,{childList:true});
  }

  var pasos=[
    ['js','parches-seguros-base.js'],
    ['js','parches-crm-seguros.js'],
    ['css','parches-crm-seguros-v2.css'],
    ['js','parches-crm-entrada.js'],
    ['js','parches-crm-operativo.js'],
    ['js','parches-cumpleanos-clientes.js'],
    ['js','parches-whatsapp-inbox.js'],
    ['js','parches-whatsapp-visual.js'],
    ['css','parches-whatsapp-visual-v2.css'],
    ['js','parches-whatsapp-visual-v3.js'],
    ['js','parches-whatsapp-visual-v4.js'],
    ['js','parches-whatsapp-visual-v5.js'],
    ['js','parches-whatsapp-visual-v6.js'],
    ['js','parches-whatsapp-visual-v7.js'],
    ['js','parches-whatsapp-contactos-uhd.js'],
    ['js','parches-whatsapp-contactos-fix.js'],
    ['js','parches-whatsapp-inbox-uhd.js'],
    ['js','parches-whatsapp-animaciones.js'],
    ['js','parches-whatsapp-iconos-flat.js'],
    ['js','parches-whatsapp-chat-acciones.js'],
    ['js','parches-whatsapp-chat-final.js'],
    ['js','parches-whatsapp-voz-mensajes.js'],
    ['js','parches-whatsapp-media-historial.js'],
    ['js','parches-whatsapp-scroll-estable.js'],
    ['js','parches-whatsapp-menu-flotante.js'],
    ['js','parches-whatsapp-aura.js'],
    ['js','parches-whatsapp-aura-compact.js'],
    ['js','parches-whatsapp-aura-size-fix.js'],
    ['js','parches-whatsapp-aura-safari-fix.js'],
    ['js','parches-whatsapp-burbuja-fit-final.js'],
    ['js','parches-whatsapp-replica-referencia.js'],
    ['js','parches-whatsapp-composer-minimal-final.js'],
    ['js','parches-whatsapp-ventana-redonda-final.js'],
    ['js','parches-whatsapp-marco-redondo-definitivo.js'],
    ['js','parches-whatsapp-send-flight.js'],
    ['js','parches-whatsapp-enrutamiento-nexus.js'],
    ['js','parches-whatsapp-plantillas-facil.js'],
    ['js','parches-whatsapp-automatizaciones.js'],
    ['js','parches-whatsapp-reglas-inteligentes.js'],
    ['js','parches-whatsapp-automatizaciones-acceso-mobile.js'],
    ['js','parches-whatsapp-pagos-validacion-v2.js'],
    ['js','parches-solicitudes-pagos-validacion.js'],
    ['js','parches-whatsapp-cobranza-notificar.js'],
    ['js','parches-whatsapp-admin-delete.js']
  ];

  var i=0;
  function next(){
    if(i>=pasos.length){promoverVisuales();return;}
    var p=pasos[i++];
    if(p[0]==='css'){
      css(p[1]);
      next();
      return;
    }
    load(p[1],next);
  }

  next();
})();
