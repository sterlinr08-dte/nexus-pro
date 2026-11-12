/* NEXUS PRO · Seguros loader
   Mantiene el parche histórico intacto y carga después el CRM operativo. */
(function(){
  'use strict';
  if(window.__nxSegurosLoader20260906)return;
  window.__nxSegurosLoader20260906=true;

  /* La consulta se calcula UNA vez, al cargar este archivo: document.currentScript solo existe
     en ese momento (antes, dentro de los callbacks valía null y las capas salían solo con ?b=).
     NX_DEPLOY lo pone Cloudflare en la página principal y cambia en cada publicación (25-oct-2026):
     así el teléfono puede guardar las capas sin preguntar y nunca usa una vieja. Sin NX_DEPLOY
     (respaldo de GitHub, servidor local) se pide fresco con la hora, como si no hubiera caché. */
  var QV=(function(){
    var base='';
    try{
      var s=document.currentScript&&document.currentScript.src||'',q=s.indexOf('?');
      base=q>=0?s.slice(q):'';
    }catch(e){}
    var d=window.NX_DEPLOY?('d='+window.NX_DEPLOY):('t='+Date.now());
    /* Build de esta publicación: fuerza a Safari/CDN a pedir frescas las capas
       WhatsApp/Solicitudes/Novedades sin tocar el index.html monolítico solo por una versión. */
    if(base&&base.indexOf('d=')<0&&base.indexOf('t=')<0)base+='&'+d;
    return base?(base+'&b=6035'):('?b=6035&'+d);
  })();
  function qv(){return QV;}

  function load(src,done){
    var s=document.createElement('script');
    s.src=src+qv();
    s.async=false;
    s.onload=function(){if(done)done();};
    s.onerror=function(){
      console.error('[NEXUS PRO] No se pudo cargar '+src);
      if(done)done();
    };
    (document.head||document.documentElement).appendChild(s);
  }

  function css(src){
    var l=document.createElement('link');
    l.rel='stylesheet';
    l.href=src+qv();
    l.onerror=function(){console.error('[NEXUS PRO] No se pudo cargar '+src);};
    (document.head||document.documentElement).appendChild(l);
  }

  /* Secuencia explícita: evita anidar callbacks y reduce el riesgo de dejar
     paréntesis/bloques sin cerrar al agregar una nueva capa visual. */
  var pasos=[
    ['js','parches-seguros-base.js'],
    ['css','parches-sidebar-curva.css'],
    ['js','parches-glass-pointer.js'],
    ['js','parches-vidrio-global.js'],
    ['js','parches-brillo-fijo.js'],
    /* Rueda en listas (parches-foco-lista.css/.js) RETIRADA en 59.19 (dueño 09-oct-2026: «vamos a quitarle ese efecto»).
       Los archivos siguen en el repo por si se quiere volver; para reactivarla, devolver aquí esas dos líneas. */
    ['js','parches-reporte-ciclo-agentes.js'],
    ['js','parches-excepciones.js'],
    /* CRM unificado (29-sep-2026): parches-crm.css + parches-crm.js reemplazan a los tres JS y el CSS
       anteriores, que quedan como shims vacíos (siguen en la cadena por si algún navegador trae en caché
       una copia vieja: la nueva capa fija sus banderas de guarda para que esa copia no haga nada). */
    ['css','parches-crm.css'],
    ['js','parches-crm.js'],
    ['js','parches-crm-seguros.js'],
    ['css','parches-crm-seguros-v2.css'],
    ['js','parches-crm-entrada.js'],
    ['js','parches-crm-operativo.js'],
    ['js','parches-cumpleanos-clientes.js'],
    ['css','parches-clientes-novedades.css'],
    ['js','parches-clientes-novedades-compat.js'],
    ['js','parches-clientes-novedades.js'],
    ['js','parches-whatsapp-inbox.js'],
    ['js','parches-whatsapp-masivo-elegidos.js'],
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
    ['js','parches-whatsapp-admin-delete.js'],
    ['js','parches-whatsapp-sin-3d.js'],
    ['js','parches-whatsapp-iconos-sistema.js'],
    ['js','parches-whatsapp-motion-v2.js'],
    ['js','parches-whatsapp-texto-natural.js'],
    ['js','parches-whatsapp-inbox-compact-mobile.js'],
    ['js','parches-whatsapp-lista-original.js'],
    ['js','parches-contenido-movil-ajuste.js'],
    ['js','parches-render-estable.js'],
    ['css','parches-fase1-ui-motion.css'],
    ['css','parches-motion-fase2.css'],
    ['js','parches-motion-fase2.js'],
    /* 59.20 (dueño 11-oct-2026): avisos de pagos y WhatsApp en una isla negra arriba (estilo Dynamic Island).
       Para quitarla, borrar esta línea; o en un equipo, localStorage.nxIslaAvisos='0'. */
    ['js','parches-isla-avisos.js'],
    /* 59.24 (dueño 14-oct-2026): números que ruedan, barra de pasos en formularios largos y «Más» en la ficha del
       cliente (ideas de beUI). Para quitarla, borrar esta línea; o en un equipo, localStorage.nxBeuiPro='0'. */
    ['js','parches-beui-pro.js'],
    /* 59.26 (dueño 14-oct-2026, «aplica las 4», ideas de Raycast): línea fina de progreso, filas de espera en vez de
       ruedas, «Deshacer» al archivar un chat y campos de teléfono/cédula que se forman solos con el cursor en su sitio.
       Para quitarla, borrar esta línea; o en un equipo, localStorage.nxRapidez='0'. */
    ['js','parches-rapidez.js'],
    /* 59.32 (dueño 16-oct-2026, idea de bencho.dev): en «Transferir dinero» el billete se arrastra al agente que
       recibe (solo elige el destino; el envío sigue igual). Para quitarla, borrar esta línea; o en un equipo,
       localStorage.nxArrastrar='0'. */
    ['js','parches-transferir-arrastrar.js'],
    /* Pulido global (06-nov-2026): pulido de interfaz (ciclo 20→20 y Comisiones en el celular, campos de 48 px, pestañas de
       Configuración con aviso de que hay más). Solo aspecto. Apagar: localStorage.nx_pulido_global_off='1'. */
    ['js','parches-pulido-global.js'],
    /* 59.25 (dueño 14-oct-2026): un comprobante de pago no se puede usar dos veces (huella exacta y lectura con IA;
       un depósito compartido se permite dentro de su monto; si no, bloquea y solo el admin aprueba con motivo). Para quitarla, borrar esta línea; o localStorage.nxBaucheUnico='0'. */
    ['js','parches-bauche-unico.js'],
    ['js','parches-whatsapp-parloteo.js'],
    /* 06-nov-2026 (encargo «WhatsApp móvil» de CLAUDE.md): Buzón compacto en el celular (cabecera de una línea, datos y
       Contactos en 2 columnas, filas de 2 líneas, campana y lupa de 44 px). Solo CSS ≤760 px.
       Apagar: localStorage.nx_whatsapp_movil_off='1'. */
    ['js','parches-whatsapp-movil.js'],
    /* 59.78 (dueño 05-nov-2026): «Generar factura» de un solo cliente eligiendo el mes o los meses; se ofrece al
       registrar un cliente nuevo y la abre «Nueva factura» de la ficha. Apagar: localStorage.nx_fact_cli_off='1'. */
    ['js','parches-factura-cliente.js'],
    /* Inicio y menú (dueño 06-nov-2026, «mejoras y ajustes»): buscador ⌘K con «Ir a…» (secciones del menú), ⌘K en Mac y «Ctrl K»
       en Windows. El CSS va en index.html (#nxInicioMenu). Apagar: localStorage.nx_inicio_menu_off='1'. */
    ['js','parches-inicio-menu.js'],
    /* 06-nov-2026: Clientes y ficha del cliente — búsqueda que perdona tildes y guiones, barra de selección legible
       con «Elegir los de esta página», toques de 44 px en la cuadrícula y avisos al momento en la ficha (cédula,
       correo, WhatsApp repetido). No cambia el guardado. Apagar: localStorage.nx_clientes_ficha_off='1'. */
    ['js','parches-clientes-ficha.js'],
    /* 59.82 (06-nov-2026): Facturas, Cobros e Historial de pagos más claros (listas vacías que dicen por qué y
       ofrecen el arreglo, fecha «jue 6 nov» en el historial, sin «Banco: —» en el celular). Solo visual.
       Apagar: localStorage.nx_facturas_cobros_ui_off='1'. */
    ['js','parches-facturas-cobros-ui.js'],
    /* 59.83 (dueño 09-nov-2026): «Salidas» de la custodia del administrador — botón «Salida» y lista en Custodia de
       fondos (pago a la aseguradora, gasto, retiro, depósito al banco, ajuste inicial) y columna «Salidas» en el
       reporte del ciclo. Solo administrador. Apagar: localStorage.nx_salidas_custodia_off='1'. */
    ['js','parches-salidas-custodia.js'],
    /* 12-nov-2026 (dueño: «Clientes y facturas», idea «Costado» de Moxen): tocar el nombre en la lista de Clientes o de
       Facturas abre su resumen al costado sin tapar la lista (de lado en la PC, desde abajo en el celular; ▲▼ pasan al
       siguiente). Solo lee; los botones abren lo de siempre. Apagar: localStorage.nx_costado_off='1'. */
    ['js','parches-costado.js'],
    /* 12-nov-2026 (dueño: reel «Stepper», «1 y 2»): los controles «− número +» (carrito y factura del POS, meses
       adelantados del cobro) responden al toque: el botón se hunde y el número nuevo entra desde el lado tocado.
       Solo aspecto; no cambia cantidades. Apagar: localStorage.nx_stepper_off='1'. */
    ['js','parches-stepper.js']
  ];

  /* Descarga por adelantado una ventana pequeña. Mantiene la ejecución
     estrictamente ordenada (los parches tienen dependencias), pero evita que
     cada JS espere a que empiece a descargarse el siguiente. */
  var precargados={};
  function precargar(p){
    if(!p||precargados[p[1]])return;
    precargados[p[1]]=true;
    try{
      var l=document.createElement('link');
      l.rel='preload';
      l.as=p[0]==='css'?'style':'script';
      l.href=p[1]+qv();
      (document.head||document.documentElement).appendChild(l);
    }catch(e){}
  }
  var i=0;
  function calentarSiguientes(){
    for(var n=i;n<Math.min(i+3,pasos.length);n++)precargar(pasos[n]);
  }
  function next(){
    if(i>=pasos.length)return;
    calentarSiguientes();
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
