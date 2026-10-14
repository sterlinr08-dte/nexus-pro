/* NEXUS PRO · 59.24 — detalles «pro» con ideas de beUI (dueño 14-oct-2026: «las 4 sugerencias»).
   Capa visual aislada: no toca datos, RPC ni lógica de dinero; solo mira lo que ya pintó la app y le agrega movimiento.
   1) Números que ruedan en los resúmenes (Cobros, Historial de pagos, Solicitudes, Inbox, Inicio).
   2) Barra de pasos en los formularios largos por secciones (Préstamo y Prestatario): marca dónde vas y salta a cada parte.
   3) Ficha del cliente (Cliente 360) en el celular: 3 acciones a la vista y «Más» que despliega el resto.
   (La fila deslizable del Inbox va en parches-whatsapp-lista-original.js, que es quien maneja ese gesto.)
   Para apagarla: borrar su línea en parches-seguros.js, o en un equipo localStorage.nxBeuiPro='0'. */
(function(){
  'use strict';
  if(window.__nxBeuiPro)return;window.__nxBeuiPro=true;
  try{if(localStorage.getItem('nxBeuiPro')==='0'||window.NX_BEUI_PRO===false)return;}catch(e){}

  const sinMov=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
  const movil=()=>{try{return matchMedia('(max-width:760px)').matches;}catch(e){return false;}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  /* ── Estilos ── (plantilla JS: sin acentos graves ni dólar-llave dentro) */
  function css(){
    if(document.getElementById('nxBeuiProCss'))return;
    const s=document.createElement('style');s.id='nxBeuiProCss';s.textContent=`
.nxBePasos{position:sticky;top:0;z-index:5;margin:-2px 0 12px;padding:8px 0 10px;background:inherit;-webkit-backdrop-filter:saturate(1.4) blur(12px);backdrop-filter:saturate(1.4) blur(12px)}
.nxBePasos .fila{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.nxBePasos .fila::-webkit-scrollbar{display:none}
.nxBePasos button{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 6px;border-radius:999px;border:1px solid rgba(124,58,237,.22);background:rgba(124,58,237,.06);color:#475569;font:700 11px/1 inherit;cursor:pointer;box-shadow:none;transition:background .22s ease,color .22s ease,border-color .22s ease,padding .26s cubic-bezier(.22,1,.36,1)}
.nxBePasos button .n{width:20px;height:20px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:rgba(124,58,237,.14);color:#6d28d9;font-size:10px;font-weight:800;flex:none;transition:background .22s ease,color .22s ease}
.nxBePasos button .t{max-width:0;overflow:hidden;white-space:nowrap;opacity:0;transition:max-width .3s cubic-bezier(.22,1,.36,1),opacity .2s ease}
.nxBePasos button.on{padding:0 12px 0 6px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-color:transparent;color:#fff}
.nxBePasos button.on .n{background:rgba(255,255,255,.22);color:#fff}
.nxBePasos button.on .t{max-width:190px;opacity:1}
.nxBePasos button.hecho .n{background:#7c3aed;color:#fff}
.nxBePasos button[disabled]{opacity:.45;cursor:default}
.nxBePasos .barra{height:3px;margin-top:8px;border-radius:3px;background:rgba(124,58,237,.12);overflow:hidden}
.nxBePasos .barra i{display:block;height:100%;width:100%;border-radius:3px;background:linear-gradient(90deg,#7c3aed,#a78bfa);transform-origin:left;transform:scaleX(var(--p,0));transition:transform .35s cubic-bezier(.22,1,.36,1)}
@media(min-width:761px){.nxBePasos button .t{max-width:190px;opacity:1}.nxBePasos button{padding:0 12px 0 6px}}
html.tema-glass-oscuro .nxBePasos button{color:#CBD5E1;border-color:rgba(167,139,250,.25);background:rgba(167,139,250,.08)}
html.tema-glass-oscuro .nxBePasos button .n{background:rgba(167,139,250,.18);color:#DDD6FE}
html.tema-glass-oscuro .nxBePasos button.on{color:#fff}
#v-cliente360 .sf-actions.nxBeMas .sf-btn.nxBeExtra{display:none}
#v-cliente360 .sf-actions.nxBeMas.abierto .sf-btn.nxBeExtra{display:flex;animation:nxBeEntra .32s cubic-bezier(.22,1,.36,1) both;animation-delay:calc(var(--i,0)*35ms)}
#v-cliente360 .sf-actions.nxBeMas .nxBeMasBtn i.ti-chevron-down{transition:transform .26s cubic-bezier(.22,1,.36,1)}
#v-cliente360 .sf-actions.nxBeMas.abierto .nxBeMasBtn i.ti-chevron-down{transform:rotate(180deg)}
@keyframes nxBeEntra{from{opacity:0;transform:translateY(-6px) scale(.96)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.nxBePasos button,.nxBePasos button .t,.nxBePasos .barra i{transition:none!important}#v-cliente360 .sf-actions.nxBeMas.abierto .sf-btn.nxBeExtra{animation:none!important}}
`;
    document.head.appendChild(s);
  }

  /* ── 1) Números que ruedan ──
     Solo se anima cuando el número cambia (o la primera vez que aparece en esta visita). Si la app vuelve a escribir
     el mismo valor (Solicitudes lo hace cada 2,5 s) no pasa nada; si escribe otro valor a mitad del giro, se respeta
     el de la app y se vuelve a girar desde ahí. */
  const NUM_SEL=['#cobResumen .sf-kpi .v','#pgTotalMonto','#pgTotalCant','#pgClientesPagaron','#pgPromedio',
    '.nxSL-stat-val','.nxSL-section-count','.nxWaProKpi .v','.nxIG-kv'].join(',');
  const memoria=new Map();
  const NUM_RE=/-?\d[\d,]*(?:\.\d+)?/;
  function leerNum(txt){
    const m=String(txt||'').match(NUM_RE);if(!m)return null;
    const raw=m[0],dec=(raw.split('.')[1]||'').length;
    const v=Number(raw.replace(/,/g,''));if(!isFinite(v))return null;
    return {v,dec,coma:raw.indexOf(',')>=0||Math.abs(v)<1000,pre:txt.slice(0,m.index),pos:txt.slice(m.index+raw.length)};
  }
  const formatear=(n,p)=>p.pre+(p.coma?n.toLocaleString('en-US',{minimumFractionDigits:p.dec,maximumFractionDigits:p.dec}):n.toFixed(p.dec))+p.pos;
  function claveNum(el){
    if(el.id)return '#'+el.id;
    const card=el.closest('.sf-kpi,.nxSL-stat,.nxSL-section,.nxWaProKpi,.nxIG-card');
    const lb=card&&(card.querySelector('.lb,.nxSL-stat-lbl,.nxSL-section-title,.l'));
    return (el.className||'')+'|'+(lb?lb.textContent.trim():'');
  }
  function girar(el,desde,txtFinal,p){
    const t0=performance.now(),dur=Math.min(900,420+Math.log10(Math.abs(p.v-desde)+10)*110);
    el.__nxRueda=true;let escrito=null;
    const paso=now=>{
      if(escrito!==null&&el.textContent!==escrito){el.__nxRueda=false;programar();return;} // la app escribió otra cosa
      const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);
      const val=k>=1?null:desde+(p.v-desde)*e;
      escrito=val===null?txtFinal:formatear(p.dec?val:Math.round(val),p);
      el.textContent=escrito;
      if(k<1)requestAnimationFrame(paso);else el.__nxRueda=false;
    };
    requestAnimationFrame(paso);
  }
  function numeros(){
    document.querySelectorAll(NUM_SEL).forEach(el=>{
      if(el.__nxRueda||el.children.length)return;
      const txt=el.textContent,p=leerNum(txt);if(!p)return;
      const k=claveNum(el),antes=memoria.get(k);
      memoria.set(k,p.v);
      if(antes===p.v||el.__nxVisto===txt)return;
      el.__nxVisto=txt;
      if(sinMov()||!el.offsetParent)return;
      const desde=antes===undefined?0:antes;if(desde===p.v)return;
      girar(el,desde,txt,p);
    });
  }

  /* ── 2) Barra de pasos en formularios por secciones ──
     Las secciones las dibuja prSec(n,título) en parches-financiamiento.js: un div con [span número][span título]. */
  function encabezados(raiz){
    return [...raiz.querySelectorAll('div')].filter(d=>{
      const c=d.children;return c.length===2&&c[0].tagName==='SPAN'&&c[1].tagName==='SPAN'&&/^\d$/.test(c[0].textContent.trim())&&d.closest('.nxPrForm,.modal');
    });
  }
  const scroller=el=>{let n=el.parentElement;while(n&&n!==document.body){const o=getComputedStyle(n).overflowY;if((o==='auto'||o==='scroll')&&n.scrollHeight>n.clientHeight+4)return n;n=n.parentElement;}return null;};
  function pasos(){
    document.querySelectorAll('.overlay.open .modal').forEach(modal=>{
      if(modal.__nxPasos&&modal.contains(modal.__nxPasos.bar))return actualizarPasos(modal);
      const hs=encabezados(modal);if(hs.length<3)return;
      const sc=scroller(hs[1]);if(!sc)return;
      const bar=document.createElement('div');bar.className='nxBePasos';bar.setAttribute('role','navigation');bar.setAttribute('aria-label','Secciones del formulario');
      bar.innerHTML='<div class="fila">'+hs.map((h,i)=>'<button type="button" data-i="'+i+'"><span class="n">'+esc(h.children[0].textContent.trim())+'</span><span class="t">'+esc(h.children[1].textContent.trim().toLowerCase().replace(/^./,c=>c.toUpperCase()))+'</span></button>').join('')+'</div><div class="barra"><i></i></div>';
      // Fondo casi sólido (el del propio formulario) para que no se lea lo que pasa por detrás, y pegada al borde de arriba
      // aunque el contenedor tenga relleno.
      try{
        const f=n=>{for(;n;n=n.parentElement){const c=getComputedStyle(n).backgroundColor;const m=/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c||'');if(m&&(m[4]===undefined||+m[4]>0.05))return 'rgb('+m[1]+','+m[2]+','+m[3]+')';}return '';};
        const c=f(sc)||(document.documentElement.classList.contains('tema-glass-oscuro')?'rgb(22,24,29)':'rgb(255,255,255)');
        bar.style.background=c;
        const pt=parseFloat(getComputedStyle(sc).paddingTop)||0;
        if(pt){bar.style.top=(-pt)+'px';bar.style.marginTop=(-pt)+'px';bar.style.paddingTop=(pt>8?pt:8)+'px';}
      }catch(e){}
      sc.insertBefore(bar,sc.firstChild);
      modal.__nxPasos={bar,hs,sc};
      bar.addEventListener('click',e=>{
        const b=e.target.closest('button[data-i]');if(!b||b.disabled)return;
        const h=hs[+b.dataset.i];if(!h)return;
        modal.__nxPasos.fijo=+b.dataset.i;clearTimeout(modal.__nxPasos.tFijo);
        modal.__nxPasos.tFijo=setTimeout(()=>{modal.__nxPasos.fijo=null;actualizarPasos(modal);},900);
        actualizarPasos(modal);
        const y=h.getBoundingClientRect().top-sc.getBoundingClientRect().top+sc.scrollTop-bar.offsetHeight-6;
        sc.scrollTo({top:Math.max(0,y),behavior:sinMov()?'auto':'smooth'});
      });
      sc.addEventListener('scroll',()=>actualizarPasos(modal),{passive:true});
      actualizarPasos(modal);
    });
  }
  function actualizarPasos(modal){
    const P=modal.__nxPasos;if(!P)return;
    const top=P.bar.getBoundingClientRect().bottom+24;
    let act=0;
    P.hs.forEach((h,i)=>{const vis=!!h.offsetParent;const b=P.bar.querySelector('button[data-i="'+i+'"]');if(b)b.disabled=!vis;if(vis&&h.getBoundingClientRect().top<=top)act=i;});
    if(P.sc.scrollTop+P.sc.clientHeight>=P.sc.scrollHeight-4){for(let i=P.hs.length-1;i>=0;i--){if(P.hs[i].offsetParent){act=i;break;}}}
    if(P.fijo!=null&&P.hs[P.fijo]&&P.hs[P.fijo].offsetParent)act=P.fijo;
    if(P.act===act)return;P.act=act;
    P.bar.querySelectorAll('button[data-i]').forEach(b=>{const i=+b.dataset.i;b.classList.toggle('on',i===act);b.classList.toggle('hecho',i<act);if(i===act)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
    const vis=P.hs.filter(h=>h.offsetParent).length||1;
    P.bar.style.setProperty('--p',String(Math.min(1,(P.hs.slice(0,act+1).filter(h=>h.offsetParent).length)/vis)));
    // Centrar la píldora activa moviendo solo la fila de píldoras: scrollIntoView movería también el formulario y
    // cortaría el desplazamiento suave que lleva a la sección.
    const on=P.bar.querySelector('button.on'),fila=P.bar.querySelector('.fila');
    if(on&&fila&&fila.scrollWidth>fila.clientWidth){const x=on.offsetLeft-(fila.clientWidth-on.offsetWidth)/2;try{fila.scrollTo({left:Math.max(0,x),behavior:sinMov()?'auto':'smooth'});}catch(e){fila.scrollLeft=Math.max(0,x);}}
  }

  /* ── 3) Acciones de la ficha (Cliente 360) en el celular ── */
  let masAbierto=false;
  function accionesCliente(){
    const box=document.querySelector('#v-cliente360 .sf-actions');if(!box)return;
    if(!movil()){if(box.classList.contains('nxBeMas')){box.classList.remove('nxBeMas','abierto');box.querySelectorAll('.nxBeMasBtn').forEach(b=>b.remove());}return;}
    if(box.classList.contains('nxBeMas')&&box.querySelector('.nxBeMasBtn'))return;
    const btns=[...box.children].filter(b=>b.classList.contains('sf-btn')&&!b.classList.contains('nxBeMasBtn'));
    if(btns.length<=4)return;
    btns.forEach((b,i)=>{b.classList.toggle('nxBeExtra',i>=3);if(i>=3)b.style.setProperty('--i',String(i-3));});
    const mas=document.createElement('button');mas.type='button';mas.className='sf-btn nxBeMasBtn';mas.setAttribute('aria-expanded',String(masAbierto));
    mas.innerHTML='<i class="ti ti-dots"></i> Más <i class="ti ti-chevron-down"></i>';
    box.insertBefore(mas,btns[3]);
    box.classList.add('nxBeMas');box.classList.toggle('abierto',masAbierto);
    mas.addEventListener('click',()=>{masAbierto=!box.classList.contains('abierto');box.classList.toggle('abierto',masAbierto);mas.setAttribute('aria-expanded',String(masAbierto));});
  }

  /* ── Motor: un solo observador, limitado a un barrido cada ~120 ms ── */
  let pendiente=false,ultimo=0;
  function barrer(){pendiente=false;ultimo=performance.now();try{numeros();}catch(e){}try{pasos();}catch(e){}try{accionesCliente();}catch(e){}}
  function programar(){
    if(pendiente)return;pendiente=true;
    const espera=Math.max(0,120-(performance.now()-ultimo));
    setTimeout(()=>requestAnimationFrame(barrer),espera);
  }
  function iniciar(){
    css();
    new MutationObserver(muts=>{
      for(const m of muts){const t=m.target;if(t&&t.__nxRueda)continue;if(t&&t.parentElement&&t.parentElement.__nxRueda)continue;programar();return;}
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
    addEventListener('resize',programar,{passive:true});
    programar();
  }
  if(document.body)iniciar();else document.addEventListener('DOMContentLoaded',iniciar);
})();
