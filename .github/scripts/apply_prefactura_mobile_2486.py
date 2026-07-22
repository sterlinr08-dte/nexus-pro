from pathlib import Path
import json
import re

MARKER = "NEXUS PREFactura Mobile Fix — v48.86"
PATCH = r'''

/* ═══════════════════════════════════════════════════════════════════════
   NEXUS PREFactura Mobile Fix — v48.86
   Corrige desborde horizontal, número cortado y distribución móvil.
   Solo presentación.
   ═══════════════════════════════════════════════════════════════════════ */
(function nxPrefacturaMobile2486(){
  'use strict';
  if(document.getElementById('nx-prefactura-mobile-2486')) return;

  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function marcar(){
    const vistas=[...document.querySelectorAll('.nx-prefactura-real')];
    document.body.classList.toggle('nx-prefactura-open', vistas.length>0);
    vistas.forEach(v=>{
      v.querySelectorAll('label,.label,.fg label,.fl').forEach(l=>{
        const t=norm(l.textContent);
        if(t.includes('prefactura no')){
          const card=l.closest('.card,.nxFacCard,.fg,.form-group,.field,section,div');
          if(card) card.classList.add('nx-pf-number-card');
        }
      });
      const candidatos=[...v.querySelectorAll('div,section,nav')].filter(el=>{
        const t=norm(el.textContent);
        return t.includes('cliente')&&t.includes('productos')&&t.includes('pago')&&t.includes('confirmar')&&t.length<120;
      }).sort((a,b)=>a.querySelectorAll('*').length-b.querySelectorAll('*').length);
      if(candidatos[0]) candidatos[0].classList.add('nx-pf-stepper-mobile');
    });
  }

  const st=document.createElement('style');
  st.id='nx-prefactura-mobile-2486';
  st.textContent=`
  @media(max-width:768px){
    html,body{overflow-x:hidden!important;max-width:100%!important}
    body.nx-prefactura-open .main,body.nx-prefactura-open .content,body.nx-prefactura-open [class*="main"]{margin-left:0!important;max-width:100%!important}
    .nx-prefactura-real{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;overflow-x:hidden!important}
    .nx-prefactura-real.nxPf,.nx-prefactura-real .nxPf{width:100%!important;max-width:100%!important;min-width:0!important;padding-left:10px!important;padding-right:10px!important;overflow-x:hidden!important}
    .nx-prefactura-real .card,.nx-prefactura-real .cartcard,.nx-prefactura-real .nx-inv-card,.nx-prefactura-real .nxFacCard,.nx-prefactura-real .fg,.nx-prefactura-real .form-group{width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden!important}
    .nx-prefactura-real *{min-width:0}
    .nx-prefactura-real .nx-pf-number-card{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important;align-items:start!important}
    .nx-prefactura-real .nx-pf-number-card>*{width:100%!important;max-width:100%!important;min-width:0!important}
    .nx-prefactura-real .nx-pf-number-card input,.nx-prefactura-real .nx-pf-number-card select,.nx-prefactura-real .nx-pf-number-card .input,.nx-prefactura-real .nx-pf-number-card [class*="input"]{width:100%!important;max-width:100%!important;box-sizing:border-box!important}
    .nx-prefactura-real .nx-pf-number-card [style*="justify-content:space-between"],.nx-prefactura-real .nx-pf-number-card [style*="justify-content: space-between"]{justify-content:flex-start!important;flex-wrap:wrap!important;gap:8px!important}
    .nx-prefactura-real .nx-pf-stepper-mobile{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;width:100%!important;max-width:100%!important}
    .nx-prefactura-real .nx-pf-stepper-mobile>*{width:100%!important;max-width:100%!important;min-width:0!important}
    .nx-prefactura-real .nx-pf-stepper-mobile>*:has(>span:only-child){min-width:0!important}
    .nx-prefactura-real .ph{overflow:hidden!important}
    .nx-prefactura-real .ph h1,.nx-prefactura-real .ph h2,.nx-prefactura-real .ph .pt{white-space:normal!important;overflow-wrap:anywhere!important}
    body.nx-prefactura-open .nx-fab{right:14px!important;bottom:92px!important;width:54px!important;height:54px!important}
  }
  `;
  document.head.appendChild(st);
  marcar();
  new MutationObserver(()=>requestAnimationFrame(marcar)).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('click',()=>setTimeout(marcar,60),true);
})();
'''

p=Path('parches.js')
s=p.read_text(encoding='utf-8')
if MARKER not in s:
    s += PATCH
p.write_text(s,encoding='utf-8')

idx=Path('index.html')
t=idx.read_text(encoding='utf-8')
t2,n=re.subn(r"const APP_VERSION='48\.85';","const APP_VERSION='48.86';",t,count=1)
if n!=1 and "const APP_VERSION='48.86';" not in t:
    raise SystemExit('No se encontró APP_VERSION 48.85')
idx.write_text(t2,encoding='utf-8')

v=Path('version.json')
data=json.loads(v.read_text(encoding='utf-8'))
data['version']='48.86'
msg='POS · Prefactura 2.5 móvil: corregido el desborde horizontal, el número de prefactura cortado, la distribución de pasos y el margen lateral visible en iPhone. Solo presentación.'
if msg not in data.setdefault('cambios',[]): data['cambios'].insert(0,msg)
v.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
