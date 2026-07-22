from pathlib import Path
import json
import re

MARKER = "NEXUS PREFactura Visual Directa — v48.87"
PATCH = r'''

/* ═══════════════════════════════════════════════════════════════════════
   NEXUS PREFactura Visual Directa — v48.87
   Prueba visual evidente y rediseño directo sobre la vista detectada.
   Solo presentación.
   ═══════════════════════════════════════════════════════════════════════ */
(function nxPrefacturaVisualDirecta2487(){
  'use strict';
  if(document.getElementById('nx-prefactura-directa-2487')) return;

  function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}

  function localizar(){
    const titulos=[...document.querySelectorAll('h1,h2,h3,.pt,.page-title,.ph')];
    const titulo=titulos.find(el=>norm(el.textContent).includes('prefactura'));
    if(!titulo) return null;
    let root=titulo.closest('[id^="v-"],.view,.page,.panel,main,section,.nxPf') || titulo.parentElement;
    if(!root) return null;
    root.classList.add('nx-pf-2487-root');
    return {root,titulo};
  }

  function aplicar(){
    const hit=localizar();
    document.body.classList.toggle('nx-pf-2487-open',!!hit);
    if(!hit) return;
    const {root,titulo}=hit;

    if(!root.querySelector('.nx-pf-2487-banner')){
      const banner=document.createElement('div');
      banner.className='nx-pf-2487-banner';
      banner.innerHTML='<div><span class="nx-pf-dot"></span><b>PREFactura 2.5</b><small>Nueva experiencia visual activa</small></div><span class="nx-pf-chip">BORRADOR</span>';
      const anchor=titulo.closest('.ph') || titulo;
      anchor.parentNode.insertBefore(banner,anchor);
    }

    const cards=[...root.querySelectorAll('.card,.nxFacCard,.fg,.form-group,section')];
    cards.slice(0,8).forEach((el,i)=>el.setAttribute('data-nx-pf-card',String(i+1)));
  }

  const st=document.createElement('style');
  st.id='nx-prefactura-directa-2487';
  st.textContent=`
  .nx-pf-2487-root{--nx-pf-bg:#eef4ff;--nx-pf-card:#ffffff;--nx-pf-line:#d9e4f7;--nx-pf-text:#11203b;--nx-pf-blue:#155eef;background:linear-gradient(180deg,#eaf2ff 0,#f7faff 280px,#f8fafc 100%)!important}
  .nx-pf-2487-root .nx-pf-2487-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:16px 18px;border-radius:18px;background:linear-gradient(135deg,#0f3d91,#155eef);color:#fff;box-shadow:0 16px 36px rgba(21,94,239,.28)}
  .nx-pf-2487-banner>div{display:flex;align-items:center;gap:10px;min-width:0}.nx-pf-2487-banner b{font-size:18px;letter-spacing:-.02em}.nx-pf-2487-banner small{font-size:11px;color:#dbe8ff;white-space:nowrap}.nx-pf-dot{width:10px;height:10px;border-radius:50%;background:#43d17a;box-shadow:0 0 0 5px rgba(67,209,122,.18)}
  .nx-pf-chip{font-size:10px;font-weight:900;letter-spacing:.08em;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28)}
  .nx-pf-2487-root .ph{background:transparent!important;border:0!important;box-shadow:none!important;padding:2px 2px 12px!important}
  .nx-pf-2487-root .ph h1,.nx-pf-2487-root .ph h2,.nx-pf-2487-root .ph .pt{font-size:28px!important;color:var(--nx-pf-text)!important}
  .nx-pf-2487-root [data-nx-pf-card]{background:var(--nx-pf-card)!important;border:1px solid var(--nx-pf-line)!important;border-radius:18px!important;box-shadow:0 10px 30px rgba(31,78,140,.08)!important;padding:16px!important}
  .nx-pf-2487-root label{color:#50627d!important;font-size:11px!important;font-weight:850!important;letter-spacing:.03em!important}
  .nx-pf-2487-root input,.nx-pf-2487-root select,.nx-pf-2487-root textarea{border:1px solid #cfdcf0!important;border-radius:12px!important;background:#fbfdff!important;box-shadow:inset 0 1px 0 rgba(17,32,59,.02)!important}
  .nx-pf-2487-root input:focus,.nx-pf-2487-root select:focus,.nx-pf-2487-root textarea:focus{border-color:#155eef!important;box-shadow:0 0 0 4px rgba(21,94,239,.12)!important}
  .nx-pf-2487-root button,.nx-pf-2487-root .btn{border-radius:12px!important}
  @media(max-width:768px){
    body.nx-pf-2487-open{overflow-x:hidden!important}
    .nx-pf-2487-root{width:100%!important;max-width:100%!important;margin:0!important;overflow-x:hidden!important}
    .nx-pf-2487-root .nx-pf-2487-banner{margin:8px 10px 12px;padding:14px;border-radius:16px}
    .nx-pf-2487-banner>div{align-items:flex-start;flex-direction:column;gap:3px}.nx-pf-2487-banner small{white-space:normal}.nx-pf-2487-banner b{font-size:17px}
    .nx-pf-2487-root .ph h1,.nx-pf-2487-root .ph h2,.nx-pf-2487-root .ph .pt{font-size:24px!important}
    .nx-pf-2487-root [data-nx-pf-card]{margin:0 10px 10px!important;padding:14px!important;border-radius:16px!important;max-width:calc(100% - 20px)!important}
    .nx-pf-2487-root input,.nx-pf-2487-root select,.nx-pf-2487-root textarea{font-size:16px!important;max-width:100%!important}
  }
  `;
  document.head.appendChild(st);
  aplicar();
  new MutationObserver(()=>requestAnimationFrame(aplicar)).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('click',()=>setTimeout(aplicar,70),true);
})();
'''

p=Path('parches.js')
s=p.read_text(encoding='utf-8')
if MARKER not in s:
    s += PATCH
p.write_text(s,encoding='utf-8')

idx=Path('index.html')
t=idx.read_text(encoding='utf-8')
t2,n=re.subn(r"const APP_VERSION='48\.86';","const APP_VERSION='48.87';",t,count=1)
if n!=1 and "const APP_VERSION='48.87';" not in t:
    raise SystemExit('No se encontró APP_VERSION 48.86')
idx.write_text(t2,encoding='utf-8')

v=Path('version.json')
data=json.loads(v.read_text(encoding='utf-8'))
data['version']='48.87'
msg='POS · Prefactura 2.5: nueva cabecera azul visible, estado Borrador, fondo renovado y tarjetas premium aplicadas directamente sobre la vista detectada. Solo presentación.'
if msg not in data.setdefault('cambios',[]): data['cambios'].insert(0,msg)
v.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')