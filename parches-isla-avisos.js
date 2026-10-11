/* NEXUS PRO · Isla de avisos (estilo Dynamic Island) · 59.20 · 2026-10-11
   Pedido del dueño (11-oct-2026, a partir de un reel de @adrien.ninet): «NEXUS PRO, con pagos y WhatsApp».
   Una píldora negra arriba al centro que se estira, muestra el aviso y se vuelve a recoger.
   · iPhone con isla y la app abierta desde el ícono (pantalla completa, barra de estado black-translucent):
     la píldora nace justo debajo de la isla real, así que parece que la isla misma crece.
   · En lo demás (Safari, iPhone sin isla, Android, computadora): píldora negra flotante arriba al centro.
   Solo ESCUCHA lo que la app ya hace. No hace consultas propias ni cambia la lógica de pagos ni de WhatsApp:
   · WhatsApp entrante: evento `nxwa:mensaje` (parches-whatsapp-inbox.js, Realtime). Mismas reglas que el sonido
     de parches-whatsapp-lista-original.js: no avisa de chats silenciados ni del chat que ya tienes abierto.
   · Pagos hechos: los avisos «Pago registrado», «Pago a deuda anterior», «Pago validado», «Pago confirmado» y
     «Abono registrado» de window.toast salen en la isla en vez de en la esquina. Errores y reversos siguen igual.
   · Pagos por validar nuevos: evento `nxpagos:pendientes` (la lista que parches-whatsapp-pagos-validacion-v2.js
     ya consulta cada minuto). La primera lista de la sesión no se anuncia; solo lo que llega después, y solo
     los que este usuario puede validar (puede_validar = admin o dueño de la cuenta).
   Apagar sin publicar nada: localStorage.setItem('nxIslaAvisos','0') → vuelven los avisos de siempre.
   QA: window.NX_ISLA_QA = {iphone, standalone, insetTop} simula el iPhone con isla en Chromium. */
(function(){
  'use strict';
  if(window.__nxIslaAvisos20261011)return;
  window.__nxIslaAvisos20261011=true;

  const $=(s,r=document)=>r.querySelector(s);
  const activa=()=>{try{return localStorage.getItem('nxIslaAvisos')!=='0';}catch(e){return true;}};
  const reducido=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // window.toast recibe HTML: aquí se queda solo el texto, en una línea.
  const plano=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  const dinero=n=>'RD$ '+Math.round(Number(n)||0).toLocaleString('es-DO');   // mismo formato que fmt() de index.html
  const mayus=t=>t?t.charAt(0).toUpperCase()+t.slice(1):t;
  let serie=0;

  /* ── Estilos ── */
  // Resorte con un rebote leve (amortiguación 0,72; respuesta 0,5 s): así crece la isla del iPhone.
  // Recogerse va sin rebote. Navegadores sin linear() usan la curva de respaldo.
  const RESORTE='linear(0, 0.021, 0.0754, 0.1521, 0.2421, 0.3384, 0.4352, 0.5288, 0.6161, 0.6954, 0.7657, 0.8265, 0.8781, 0.9207, 0.9551, 0.9821, 1.0026, 1.0175, 1.0277, 1.0341, 1.0375, 1.0384, 1.0376, 1.0355, 1.0325, 1.029, 1.0253, 1.0216, 1.018, 1.0147, 1.0116, 1.0089, 1.0066, 1.0046, 1.003, 1.0017, 1.0007, 0.9999, 0.9993, 0.9989, 1)';
  function css(){
    if($('#nxIslaCss'))return;
    const s=document.createElement('style');s.id='nxIslaCss';
    s.textContent=`
#nxIsla{--resorte:cubic-bezier(.3,1.3,.5,1);--salida:cubic-bezier(.32,.72,0,1);
  position:fixed;left:50%;top:var(--t,10px);z-index:2147483000;box-sizing:border-box;margin:0;padding:0;
  width:var(--w,124px);height:var(--h,36px);border-radius:var(--r,18px);
  transform:translate3d(-50%,var(--y,0px),0) scale(var(--s,1));transform-origin:50% 0;
  background:#000;color:#fff;overflow:hidden;opacity:0;visibility:hidden;pointer-events:none;
  -webkit-font-smoothing:antialiased;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;
  text-transform:none;letter-spacing:normal;   /* como los avisos del iPhone; no hereda las «MAYÚSCULAS GLOBALES» de index.html */
  transition:width .69s var(--resorte),height .69s var(--resorte),border-radius .69s var(--resorte),transform .42s var(--salida),opacity .18s ease,visibility 0s linear .18s}
@supports (transition-timing-function:linear(0,1)){#nxIsla{--resorte:${RESORTE}}}
#nxIsla.visible{opacity:1;visibility:visible;pointer-events:auto;
  transition:width .69s var(--resorte),height .69s var(--resorte),border-radius .69s var(--resorte),transform .42s var(--salida),opacity .18s ease}
#nxIsla[data-modo="flota"]{box-shadow:0 18px 40px -18px rgba(0,0,0,.6),0 0 0 .5px rgba(255,255,255,.12)}
#nxIsla.cerrando{transition:width .38s var(--salida),height .38s var(--salida),border-radius .38s var(--salida),transform .38s var(--salida),opacity .16s ease .3s,visibility 0s linear .46s}
#nxIsla.quieta,#nxIsla.quieta .nxIsla-c{transition:none!important}
#nxIsla.golpe{--s:1.025}
#nxIsla .nxIsla-c{position:absolute;left:0;right:0;bottom:0;top:var(--pt,0px);box-sizing:border-box;display:flex;align-items:center;gap:11px;
  padding:0 16px 0 12px;opacity:0;transform:scale(.92);filter:blur(6px);outline:none;cursor:default;
  transition:opacity .14s ease,transform .14s ease,filter .14s ease}
#nxIsla.abierta .nxIsla-c:not(.sale){opacity:1;transform:none;filter:none;
  transition:opacity .28s ease .14s,transform .5s var(--salida) .1s,filter .28s ease .14s}
#nxIsla .nxIsla-c.entra{opacity:0!important;transform:scale(.96)!important;filter:blur(4px)!important;transition:none!important}
#nxIsla .nxIsla-c.accion{cursor:pointer}
#nxIsla .nxIsla-c:focus-visible{box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}
#nxIsla .ti{color:inherit!important}   /* el tema glass oscuro pinta todos los íconos de azul claro; aquí van del color de su círculo */
#nxIsla .nxIsla-ic{flex:0 0 auto;position:relative;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;
  color:#fff;font-size:21px;line-height:1}
#nxIsla .nxIsla-ic.pago{background:#30d158}
#nxIsla .nxIsla-ic.pendiente{background:#ff9f0a}
#nxIsla .nxIsla-ic.wa{background:linear-gradient(180deg,#a1a1a6,#6e6e73);font-size:14px;font-weight:600;letter-spacing:.02em}
#nxIsla .nxIsla-ic.wa.solo{background:#25d366;font-size:22px}
#nxIsla .nxIsla-mini{position:absolute;right:-4px;bottom:-4px;width:16px;height:16px;border-radius:50%;background:#25d366;
  box-shadow:0 0 0 2px #000;display:grid;place-items:center;font-size:10px;letter-spacing:0;color:#fff}
#nxIsla .nxIsla-tx{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:1px}
#nxIsla .nxIsla-t{font-size:15px;font-weight:600;letter-spacing:-.012em;line-height:1.25;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nxIsla .nxIsla-s{font-size:13px;font-weight:400;letter-spacing:-.004em;line-height:1.3;color:rgba(235,235,245,.64);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#nxIsla .nxIsla-s .ti{font-size:13px;margin-right:4px;vertical-align:-1px}
#nxIsla .nxIsla-d{flex:0 0 auto;font-size:15px;font-weight:600;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:#30d158;white-space:nowrap}
#nxIsla .nxIsla-d.ambar{color:#ffb340}
#nxIsla .nxIsla-d.tenue{color:rgba(235,235,245,.6);font-size:12px;font-weight:500}
#nxIsla .nxIsla-d.cuenta{min-width:22px;height:22px;padding:0 7px;border-radius:11px;background:#25d366;color:#fff;font-size:12.5px;
  display:grid;place-items:center;box-sizing:border-box}
@media (prefers-reduced-motion:reduce){
  #nxIsla,#nxIsla.cerrando{transition:opacity .2s ease,visibility 0s linear .2s!important}
  #nxIsla.visible{transition:opacity .2s ease!important}
  #nxIsla .nxIsla-c,#nxIsla.abierta .nxIsla-c:not(.sale){transition:opacity .2s ease!important;transform:none!important;filter:none!important}
  #nxIsla.golpe{--s:1}
}`;
    (document.head||document.documentElement).appendChild(s);
  }

  /* ── Dónde va y de qué tamaño ── */
  function medirInset(){
    let p=document.getElementById('nxIslaMedida');
    if(!p){
      p=document.createElement('div');p.id='nxIslaMedida';p.setAttribute('aria-hidden','true');
      p.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)';
      document.body.appendChild(p);
    }
    return parseFloat(getComputedStyle(p).paddingTop)||0;
  }
  // «isla»: debajo de la isla real (iPhone con isla, app instalada, en vertical). «flota»: todo lo demás.
  function geometria(){
    const qa=window.NX_ISLA_QA||{};
    const vw=document.documentElement.clientWidth||window.innerWidth;
    const inset=qa.insetTop!=null?Number(qa.insetTop):medirInset();
    const instalada=qa.standalone!=null?!!qa.standalone:(navigator.standalone===true||(!!window.matchMedia&&matchMedia('(display-mode: standalone)').matches));
    const iphone=qa.iphone!=null?!!qa.iphone:/iPhone/.test(navigator.userAgent||'');
    const vertical=!window.matchMedia||matchMedia('(orientation: portrait)').matches;
    if(iphone&&instalada&&vertical&&inset>=51&&vw<=500){
      // La isla mide ~126×37 y su borde de arriba queda ~48 px antes del final del área segura
      // (iPhone 14 Pro/15/16: área 59 → 11 px; 16 Pro: 62 → 14 px).
      const top=Math.min(20,Math.max(9,Math.round(inset-48)));
      const pt=Math.max(36,Math.round(inset-top)-8);   // el texto empieza justo debajo de la isla y de la hora/batería
      return {modo:'isla',top,cw:126,ch:37,w:Math.min(vw-18,420),h:pt+60,r:42,pt};
    }
    const movil=vw<=760;
    return {modo:'flota',top:Math.round(inset+(movil?8:14)),cw:124,ch:36,w:Math.min(vw-(movil?16:40),movil?420:380),h:62,r:31,pt:0};
  }

  /* ── La isla ── */
  let el=null,geo=null,actual=null,cola=[],fase='oculta',desde=0,finHold=0,restante=0;
  let tHold=0,tCerrar=0,tSig=0,arr=null,tragarClick=false;
  const pausa=new Set();

  function asegurar(){
    if(el&&el.isConnected)return el;
    css();
    el=document.createElement('div');el.id='nxIsla';
    el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');
    document.body.appendChild(el);
    el.addEventListener('pointerdown',bajar);
    el.addEventListener('pointermove',mover);
    el.addEventListener('pointerup',soltar);
    el.addEventListener('pointercancel',cancelar);
    el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')pausar('raton');});
    el.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')reanudar('raton');});
    el.addEventListener('click',clic);
    el.addEventListener('keydown',tecla);
    return el;
  }
  function tam(compacta){
    const g=geo;el.dataset.modo=g.modo;
    el.style.setProperty('--t',g.top+'px');
    el.style.setProperty('--pt',g.pt+'px');
    el.style.setProperty('--w',(compacta?g.cw:g.w)+'px');
    el.style.setProperty('--h',(compacta?g.ch:g.h)+'px');
    el.style.setProperty('--r',(compacta?g.ch/2:g.r)+'px');
  }
  function contenido(a){
    const c=document.createElement('div');
    c.className='nxIsla-c'+(a.accion?' accion':'');
    if(a.accion){c.setAttribute('role','button');c.tabIndex=0;}
    c.setAttribute('aria-label',[a.titulo,a.texto,a.monto,a.accion?'Toca para abrir':''].filter(Boolean).join('. '));
    let ic;
    if(a.tipo==='wa')ic=a.ini
      ?`<div class="nxIsla-ic wa">${esc(a.ini)}<span class="nxIsla-mini"><i class="ti ti-brand-whatsapp"></i></span></div>`
      :'<div class="nxIsla-ic wa solo"><i class="ti ti-brand-whatsapp"></i></div>';
    else if(a.tipo==='pendiente')ic='<div class="nxIsla-ic pendiente"><i class="ti ti-receipt-2"></i></div>';
    else ic='<div class="nxIsla-ic pago"><i class="ti ti-check"></i></div>';
    const sub=a.texto?`<div class="nxIsla-s">${a.icTexto?`<i class="ti ${esc(a.icTexto)}"></i>`:''}${esc(a.texto)}</div>`:'';
    let der='';
    if(a.tipo==='wa')der=a.cuenta>1?`<div class="nxIsla-d cuenta">${a.cuenta>99?'99+':a.cuenta}</div>`:'<div class="nxIsla-d tenue">ahora</div>';
    else if(a.monto)der=`<div class="nxIsla-d${a.tipo==='pendiente'?' ambar':''}">${esc(a.monto)}</div>`;
    c.innerHTML=ic+`<div class="nxIsla-tx"><div class="nxIsla-t">${esc(a.titulo)}</div>${sub}</div>`+der;
    return c;
  }
  // Pone el contenido nuevo; si la isla ya está abierta, el viejo se desvanece y el nuevo aparece encima.
  function ponerContenido(a,animar){
    el.querySelectorAll('.nxIsla-c').forEach(n=>{
      if(!animar){n.remove();return;}
      n.classList.add('sale');setTimeout(()=>n.remove(),220);
    });
    const c=contenido(a);
    if(animar)c.classList.add('entra');
    el.appendChild(c);
    if(animar){void c.offsetWidth;c.classList.remove('entra');}
  }

  function abrir(a){
    asegurar();geo=geometria();actual=a;fase='abierta';desde=Date.now();
    const rm=reducido();
    el.classList.add('quieta');
    el.classList.remove('cerrando','abierta','visible','golpe');
    el.style.setProperty('--y','0px');
    ponerContenido(a,false);
    tam(!rm);                    // nace como la píldora; con «reducir movimiento», ya grande
    void el.offsetWidth;         // fija el punto de partida antes de animar
    el.classList.remove('quieta');
    el.classList.add('visible');
    const crecer=()=>{if(actual!==a||fase!=='abierta')return;tam(false);el.classList.add('abierta');};
    if(rm)crecer();
    else if(geo.modo==='isla')requestAnimationFrame(()=>requestAnimationFrame(crecer));   // la píldora ya está escondida bajo la isla real
    else setTimeout(crecer,110);                                                       // flotando: primero se ve la píldora
    programar(a.dur||4200);
  }
  function reemplazar(a){
    actual=a;desde=Date.now();
    ponerContenido(a,true);
    if(!reducido()){el.classList.add('golpe');setTimeout(()=>{if(el)el.classList.remove('golpe');},150);}
    programar(a.dur||4200);
  }
  // Llega un aviso mientras se está recogiendo: vuelve a crecer desde donde va (no espera a cerrarse).
  function reabrir(a){
    clearTimeout(tCerrar);
    fase='abierta';actual=a;desde=Date.now();
    el.classList.remove('cerrando');el.classList.add('visible');
    el.style.setProperty('--y','0px');   // si se estaba yendo hacia arriba, vuelve a su sitio
    ponerContenido(a,true);
    tam(false);el.classList.add('abierta');
    programar(a.dur||4200);
  }
  function cerrar(inmediato){
    clearTimeout(tHold);pausa.clear();
    if(!el||fase==='oculta'||fase==='cerrando')return;
    fase='cerrando';
    if(inmediato){el.classList.add('quieta');fin();requestAnimationFrame(()=>{if(el)el.classList.remove('quieta');});return;}
    el.classList.remove('abierta','golpe','visible');
    el.classList.add('cerrando');
    if(!reducido())tam(true);
    if(geo&&geo.modo==='isla')el.style.setProperty('--y','0px');
    clearTimeout(tCerrar);
    tCerrar=setTimeout(fin,reducido()?240:520);
  }
  function fin(){
    clearTimeout(tCerrar);
    if(el){
      el.classList.remove('cerrando','visible','abierta','golpe');
      el.querySelectorAll('.nxIsla-c').forEach(n=>n.remove());
    }
    fase='oculta';actual=null;
    clearTimeout(tSig);
    tSig=setTimeout(avanzar,cola.length?200:0);
  }
  function avanzar(){
    if(fase!=='oculta'||!cola.length)return;
    if(document.hidden){cola=[];return;}
    abrir(cola.shift());
  }

  /* ── Tiempo en pantalla ── */
  function programar(ms){
    clearTimeout(tHold);
    restante=Math.max(0,ms);finHold=Date.now()+restante;
    if(!pausa.size)tHold=setTimeout(finDeHold,restante);
  }
  function pausar(motivo){
    if(fase!=='abierta')return;
    if(!pausa.size){clearTimeout(tHold);restante=Math.max(900,finHold-Date.now());}
    pausa.add(motivo);
  }
  function reanudar(motivo){
    if(!pausa.delete(motivo)||pausa.size||fase!=='abierta')return;
    finHold=Date.now()+restante;tHold=setTimeout(finDeHold,restante);
  }
  function finDeHold(){
    if(fase!=='abierta')return;
    if(cola.length){reemplazar(cola.shift());return;}   // el siguiente aparece sin recoger la isla
    cerrar();
  }

  /* ── Cola: los mensajes del mismo chat se suman en un solo aviso ── */
  function fusionar(x,a){
    x.cuenta=(x.cuenta||1)+(a.cuenta||1);
    if(a.texto){x.texto=a.texto;x.icTexto=a.icTexto||'';}
    if(a.monto)x.monto=a.monto;
    if(a.accion)x.accion=a.accion;
    x.dur=Math.min(7000,(x.dur||4200)+600);
  }
  function resumir(){
    const wa=cola.filter(x=>x.tipo==='wa');
    if(wa.length>2){
      const n=wa.reduce((s,x)=>s+(x.cuenta||1),0),chats=wa.reduce((s,x)=>s+(x.chats||1),0);
      cola=cola.filter(x=>x.tipo!=='wa');
      cola.push({tipo:'wa',clave:'wa:varios',titulo:'WhatsApp',texto:n+' mensajes nuevos de '+chats+' chats',ini:'',cuenta:n,chats,dur:4600,accion:()=>abrirChat('')});
    }
    if(cola.length>6)cola=cola.slice(-6);
  }
  function encolar(a){
    if(!a||!activa()||document.hidden)return false;
    if(fase==='abierta'&&actual&&actual.clave===a.clave){fusionar(actual,a);reemplazar(actual);return true;}
    if(fase==='cerrando'&&el){
      if(actual&&actual.clave===a.clave){fusionar(actual,a);a=actual;}
      reabrir(a);return true;
    }
    const i=cola.findIndex(x=>x.clave===a.clave);
    if(i>=0)fusionar(cola[i],a);else cola.push(a);
    resumir();
    if(fase==='oculta'){clearTimeout(tSig);avanzar();}
    else if(fase==='abierta'&&!pausa.size){
      // El aviso que se está viendo se queda al menos 1,5 s antes de dar paso al siguiente.
      const resta=Math.max(0,1500-(Date.now()-desde));
      if(resta<finHold-Date.now())programar(resta);
    }
    return true;
  }

  /* ── Gestos: tocar abre; deslizar hacia arriba la recoge ── */
  function goma(d,dim){const k=.55;return (d*dim*k)/(dim+k*Math.abs(d));}
  function bajar(e){
    if(fase!=='abierta')return;
    arr={id:e.pointerId,x0:e.clientX,y0:e.clientY,dy:0,mov:false,hist:[[e.clientY,e.timeStamp]]};
    if(e.pointerType!=='mouse')pausar('toque');
  }
  function mover(e){
    if(!arr||e.pointerId!==arr.id)return;
    const dx=e.clientX-arr.x0,dy=e.clientY-arr.y0;
    if(!arr.mov){
      if(Math.hypot(dx,dy)<8)return;
      arr.mov=true;el.classList.add('quieta');
      try{el.setPointerCapture(arr.id);}catch(err){}
    }
    arr.dy=dy;arr.hist.push([e.clientY,e.timeStamp]);if(arr.hist.length>6)arr.hist.shift();
    // Hacia arriba sigue al dedo; hacia abajo se resiste, como una goma.
    el.style.setProperty('--y',(dy<0?dy:goma(dy,90)).toFixed(1)+'px');
  }
  function soltar(e){
    if(!arr||e.pointerId!==arr.id)return;
    const a=arr;arr=null;
    if(e.pointerType!=='mouse')reanudar('toque');
    if(!a.mov)return;   // fue un toque: lo atiende «click»
    tragarClick=true;setTimeout(()=>{tragarClick=false;},400);
    el.classList.remove('quieta');
    const p0=a.hist[0],p1=a.hist[a.hist.length-1],v=(p1[0]-p0[0])/Math.max(1,p1[1]-p0[1]);   // px por ms
    if(a.dy<-26||v<-.35){descartar();return;}
    el.style.setProperty('--y','0px');
  }
  function cancelar(e){
    if(!arr||e.pointerId!==arr.id)return;
    arr=null;reanudar('toque');
    el.classList.remove('quieta');el.style.setProperty('--y','0px');
  }
  function descartar(){
    // En modo isla se recoge dentro de la isla; flotando sube y se va.
    if(geo&&geo.modo==='flota'&&!reducido())el.style.setProperty('--y',(-(geo.top+geo.h+12))+'px');
    cola=cola.filter(x=>x.tipo==='pendiente');   // quien la aparta no quiere ver la fila de mensajes atrasados
    cerrar();
  }
  function clic(){
    if(tragarClick){tragarClick=false;return;}
    if(fase!=='abierta'||!actual)return;
    const a=actual;
    cerrar();
    if(typeof a.accion==='function'){try{a.accion();}catch(err){}}
  }
  function tecla(e){
    if(fase!=='abierta')return;
    if(e.key==='Escape'){e.preventDefault();cerrar();return;}
    if((e.key==='Enter'||e.key===' ')&&actual&&actual.accion){e.preventDefault();clic();}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cola=[];if(fase!=='oculta')cerrar(true);}});
  window.addEventListener('resize',()=>{if(el&&fase==='abierta'){geo=geometria();tam(false);}},{passive:true});

  /* ── WhatsApp entrante ── */
  const TIPOS={imagen:['ti-photo','Foto'],video:['ti-video','Video'],audio:['ti-microphone','Mensaje de voz'],sticker:['ti-sticker','Sticker'],
    ubicacion:['ti-map-pin','Ubicación'],contacto:['ti-user','Contacto'],documento:['ti-file','Documento']};
  function vistaPrevia(m){
    const t=TIPOS[m&&m.tipo_contenido]||(m&&m.media_path?TIPOS.documento:null);
    const c=plano(m&&m.cuerpo);
    const generico=!c||/^\[?(imagen|foto|audio|video|documento|sticker|ubicaci[oó]n|contacto|contenido de whatsapp no visible)\]?$/i.test(c);
    if(t)return {ic:t[0],tx:generico?t[1]:c};
    return {ic:'',tx:generico?'Mensaje nuevo':c};
  }
  function telefono(v){
    const d=String(v||'').replace(/\D/g,'');
    if(d.length===11&&d[0]==='1')return d.slice(1,4)+'-'+d.slice(4,7)+'-'+d.slice(7);
    return d?'+'+d:'';
  }
  // Mismo nombre que la lista del Buzón: el del cliente de NEXUS si el chat está vinculado; si no, el de WhatsApp.
  function nombreChat(h){
    try{
      const st=window.ST||(typeof ST!=='undefined'?ST:null);
      const c=h&&h.cliente_id&&st&&Array.isArray(st.clientes)?st.clientes.find(x=>String(x.id)===String(h.cliente_id)):null;
      if(c&&c.nom)return plano(c.nom);
    }catch(e){}
    return plano(h&&h.nombre_perfil)||telefono(h&&h.telefono_e164)||'WhatsApp';
  }
  function iniciales(n){
    if(!n||/^[0-9+]/.test(n))return '';
    const p=n.replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/).filter(Boolean);
    if(!p.length)return '';
    return ((p[0][0]||'')+(p.length>1?p[p.length-1][0]:'')).toUpperCase();
  }
  function abrirChat(id){
    try{if(typeof window.nav==='function')window.nav('waInbox',null);}catch(e){}
    if(id&&typeof window.nxWaAbrirHilo==='function')setTimeout(()=>{try{window.nxWaAbrirHilo(id);}catch(e){}},80);
  }
  document.addEventListener('nxwa:mensaje',e=>{
    try{
      const d=e.detail||{},m=d.mensaje||{},h=d.hilo||null;
      if(!activa()||document.hidden)return;
      if(h&&typeof window.nxWaHiloSilenciado==='function'&&window.nxWaHiloSilenciado(h))return;   // chat silenciado
      const enfocado=document.hasFocus();
      if(d.abierto&&enfocado)return;                                                              // ya lo estás leyendo
      // En el Buzón con la lista a la vista, el mensaje ya se ve llegar en la lista.
      const enBuzon=!!$('#v-waInbox.on');
      const abierto=typeof window.nxWaHiloAbierto==='function'?window.nxWaHiloAbierto():null;
      if(enBuzon&&enfocado&&(!abierto||window.innerWidth>760))return;
      const id=m.hilo_id||(h&&h.id)||'';
      const nom=nombreChat(h),vp=vistaPrevia(m);
      encolar({tipo:'wa',clave:'wa:'+id,titulo:nom,texto:vp.tx,icTexto:vp.ic,ini:iniciales(nom),cuenta:1,chats:1,dur:4200,accion:()=>abrirChat(id)});
    }catch(err){}
  });

  /* ── Pagos hechos: los avisos de window.toast ── */
  const PAGO_OK=/^(pago registrado|pago a deuda anterior|pago validado|pago confirmado|abono registrado)$/i;
  function partirMonto(msg){
    const t=plano(msg),m=t.match(/RD\$\s?[\d.,]*\d/);
    if(!m)return {monto:'',resto:t};
    const resto=t.replace(m[0],' ').replace(/\s+/g,' ').replace(/^[\s—–·,:-]+|[\s—–·,:-]+$/g,'').replace(/\s*[—–·]\s*[—–·]\s*/g,' · ').trim();
    return {monto:m[0].replace(/^RD\$\s?/,'RD$ '),resto};
  }
  function avisoPago(ttl,msg){
    const titulo=plano(ttl);
    // En «Pago validado» el RD$ es el acumulado del agente, no el pago: va completo debajo.
    const p=/^pago validado$/i.test(titulo)?{monto:'',resto:plano(msg)}:partirMonto(msg);
    return encolar({tipo:'pago',clave:'pago:'+(++serie),titulo,texto:mayus(p.resto),monto:p.monto,dur:3800,accion:null});
  }
  function envolverToast(){
    const orig=window.toast;
    if(typeof orig!=='function')return false;
    if(orig.__nxIsla)return true;
    const w=function(tp,ttl,msg){
      try{if(tp==='ok'&&PAGO_OK.test(plano(ttl))&&avisoPago(ttl,msg))return;}catch(e){}
      return orig.apply(this,arguments);   // todo lo demás (y la isla apagada) sale como siempre
    };
    w.__nxIsla=true;w.__nxIslaOriginal=orig;
    window.toast=w;
    return true;
  }

  /* ── Pagos por validar nuevos ── */
  let pendVistos=null;
  function abrirSolicitudes(){try{if(typeof window.nav==='function')window.nav('solicitudes',null);}catch(e){}}
  document.addEventListener('nxpagos:pendientes',e=>{
    try{
      const items=e.detail&&Array.isArray(e.detail.items)?e.detail.items:[];
      const id=p=>String(p&&(p.abono_id||p.id)||'');
      if(!pendVistos){pendVistos=new Set(items.map(id).filter(Boolean));return;}   // primera lista de la sesión: es la base
      if(!activa()||document.hidden)return;                                         // se anuncian en la próxima lista a la vista
      const nuevos=items.filter(p=>id(p)&&!pendVistos.has(id(p)));
      items.forEach(p=>{const k=id(p);if(k)pendVistos.add(k);});
      const mios=nuevos.filter(p=>p.puede_validar!==false);                         // solo lo que este usuario puede validar
      if(!mios.length)return;
      if(mios.length===1){
        const p=mios[0];
        encolar({tipo:'pendiente',clave:'pend:'+id(p),titulo:'Pago por validar',texto:[plano(p.cliente)||'Cliente',plano(p.metodo)].filter(Boolean).join(' · '),
          monto:p.monto!=null&&p.monto!==''?dinero(p.monto):'',dur:5200,accion:abrirSolicitudes});
        return;
      }
      const total=mios.reduce((s,p)=>s+(Number(p.monto)||0),0),noms=mios.map(p=>plano(p.cliente)).filter(Boolean);
      encolar({tipo:'pendiente',clave:'pend:lote:'+(++serie),titulo:mios.length+' pagos por validar',
        texto:noms.slice(0,2).join(', ')+(noms.length>2?' y '+(noms.length-2)+' más':''),monto:dinero(total),dur:5600,accion:abrirSolicitudes});
    }catch(err){}
  });

  window.nxIsla={
    mostrar:encolar,
    cerrar:()=>cerrar(),
    estado:()=>({fase,actual:actual&&actual.clave,cola:cola.map(x=>x.clave),modo:geo&&geo.modo})
  };
  function iniciar(){
    css();
    if(!envolverToast()){let n=0;const t=setInterval(()=>{if(envolverToast()||++n>40)clearInterval(t);},250);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar,{once:true});else iniciar();
})();
