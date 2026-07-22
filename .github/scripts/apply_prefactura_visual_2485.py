from pathlib import Path
import json
import re

OLD_MARKER = "NEXUS PREFactura Visual 2.5 — v48.84"
NEW_MARKER = "NEXUS PREFactura Visual 2.5 — v48.85"

PATCH = r'''

/* ═══════════════════════════════════════════════════════════════════════
   NEXUS PREFactura Visual 2.5 — v48.85
   Sprint 1: cabecera, pasos y formulario móvil. Solo presentación.
   ═══════════════════════════════════════════════════════════════════════ */
(function nxPrefacturaVisual2485(){
  'use strict';
  if(document.getElementById('nx-prefactura-visual-2485')) return;

  function normalizar(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function marcarVista(){
    document.querySelectorAll('.nx-prefactura-real').forEach(el=>el.classList.remove('nx-prefactura-real'));
    const candidatos=[...document.querySelectorAll('h1,h2,h3,.pt,.ph,.page-title,[data-title]')];
    const titulo=candidatos.find(el=>{
      const t=normalizar(el.textContent||el.getAttribute('data-title'));
      return t.includes('prefactura')||t.includes('preventa');
    });
    if(!titulo)return;
    const raiz=titulo.closest('[id^="v-"],.view,.page,.nxPf,.panel,main,section')||titulo.parentElement;
    if(raiz)raiz.classList.add('nx-prefactura-real');
  }

  const st=document.createElement('style');
  st.id='nx-prefactura-visual-2485';
  st.textContent=`
  .nx-prefactura-real{--pf-bg:#f4f7fb;--pf-card:#fff;--pf-line:#e2e8f0;--pf-text:#0f172a;--pf-muted:#64748b;--pf-blue:#2563eb;background:var(--pf-bg)!important}
  .nx-prefactura-real.nxPf,.nx-prefactura-real .nxPf{max-width:1480px;margin:0 auto;padding:16px 18px 32px!important;color:var(--pf-text)}
  .nx-prefactura-real .ph{background:linear-gradient(135deg,#ffffff,#f8fbff)!important;border:1px solid var(--pf-line)!important;border-radius:18px!important;padding:18px 20px!important;margin-bottom:14px!important;box-shadow:0 10px 28px rgba(15,23,42,.06)!important}
  .nx-prefactura-real .ph h1,.nx-prefactura-real .ph h2,.nx-prefactura-real .ph .pt{font-size:24px!important;line-height:1.15!important;font-weight:850!important;letter-spacing:-.025em!important;color:var(--pf-text)!important}
  .nx-prefactura-real .ph p,.nx-prefactura-real .ph .ps{font-size:12px!important;color:var(--pf-muted)!important;margin-top:4px!important}
  .nx-prefactura-real .steps,.nx-prefactura-real .stepper,.nx-prefactura-real [class*="step"]{gap:8px!important}
  .nx-prefactura-real .step,.nx-prefactura-real [class*="step-"]{border-radius:999px!important}
  .nx-prefactura-real .card,.nx-prefactura-real .cartcard,.nx-prefactura-real .nx-inv-card,.nx-prefactura-real .nxFacCard{background:var(--pf-card)!important;border:1px solid var(--pf-line)!important;border-radius:16px!important;box-shadow:0 8px 24px rgba(15,23,42,.05)!important}
  .nx-prefactura-real label{display:block!important;font-size:11px!important;font-weight:800!important;letter-spacing:.025em!important;color:#475569!important;margin-bottom:6px!important}
  .nx-prefactura-real input,.nx-prefactura-real select,.nx-prefactura-real textarea{width:100%;min-height:42px!important;border:1px solid #d8dee9!important;border-radius:11px!important;background:#fff!important;color:var(--pf-text)!important;box-shadow:none!important;padding:10px 12px!important}
  .nx-prefactura-real input:focus,.nx-prefactura-real select:focus,.nx-prefactura-real textarea:focus{border-color:#7aa2ff!important;box-shadow:0 0 0 4px rgba(37,99,235,.10)!important;outline:0!important}
  .nx-prefactura-real button,.nx-prefactura-real .btn{border-radius:11px!important;min-height:40px!important;font-weight:800!important}
  .nx-prefactura-real .g1,.nx-prefactura-real .cartcobrar{background:var(--pf-blue)!important;color:#fff!important;border:1px solid #1d4ed8!important;box-shadow:0 7px 16px rgba(37,99,235,.22)!important}
  @media(max-width:768px){
    .nx-prefactura-real.nxPf,.nx-prefactura-real .nxPf{padding:10px 10px 110px!important}
    .nx-prefactura-real .ph{padding:14px!important;border-radius:15px!important;margin-bottom:10px!important}
    .nx-prefactura-real .ph h1,.nx-prefactura-real .ph h2,.nx-prefactura-real .ph .pt{font-size:22px!important}
    .nx-prefactura-real .steps,.nx-prefactura-real .stepper,.nx-prefactura-real [class*="step"]{display:flex!important;flex-wrap:wrap!important;row-gap:8px!important;column-gap:6px!important}
    .nx-prefactura-real .card,.nx-prefactura-real .cartcard,.nx-prefactura-real .nx-inv-card,.nx-prefactura-real .nxFacCard{border-radius:14px!important;margin-bottom:10px!important}
    .nx-prefactura-real input,.nx-prefactura-real select,.nx-prefactura-real textarea{font-size:16px!important;min-height:46px!important}
    .nx-prefactura-real button,.nx-prefactura-real .btn{min-height:44px!important}
  }
  body.tema-oscuro .nx-prefactura-real,body.tema-premium .nx-prefactura-real{--pf-bg:#0f172a;--pf-card:#172033;--pf-line:#2b3950;--pf-text:#f8fafc;--pf-muted:#a8b3c7}
  `;
  document.head.appendChild(st);
  marcarVista();
  new MutationObserver(()=>requestAnimationFrame(marcarVista)).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('click',()=>setTimeout(marcarVista,80),true);
})();
'''

parches = Path('parches.js')
src = parches.read_text(encoding='utf-8')
if OLD_MARKER in src:
    start = src.index('/* ═══════════════════════════════════════════════════════════════════════', src.index(OLD_MARKER)-120)
    end = src.find('})();', src.index(OLD_MARKER))
    if end != -1:
        end += len('})();')
        src = src[:start] + src[end:]
if NEW_MARKER not in src:
    src += PATCH
parches.write_text(src, encoding='utf-8')

index = Path('index.html')
text = index.read_text(encoding='utf-8')
text2, count = re.subn(r"const APP_VERSION='48\.84';", "const APP_VERSION='48.85';", text, count=1)
if count != 1 and "const APP_VERSION='48.85';" not in text:
    raise SystemExit('No se encontró APP_VERSION 48.84 en index.html')
index.write_text(text2, encoding='utf-8')

version = Path('version.json')
data = json.loads(version.read_text(encoding='utf-8'))
data['version'] = '48.85'
message = ('POS · Prefactura 2.5 Sprint 1: nueva cabecera, mejor jerarquía visual, pasos compactos y formulario optimizado para iPhone. Solo presentación; sin cambios en lógica, Supabase, impuestos, NCF ni inventario.')
if message not in data.setdefault('cambios', []):
    data['cambios'].insert(0, message)
version.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
