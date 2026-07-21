from pathlib import Path
import json
import re

OLD_START = "/* ═══════════════════════════════════════════════════════════════════════\n   NEXUS PREFactura Visual 2.5 — v48.83"
NEW_MARKER = "NEXUS PREFactura Visual 2.5 — v48.84"

PATCH = r'''

/* ═══════════════════════════════════════════════════════════════════════
   NEXUS PREFactura Visual 2.5 — v48.84
   Corrige el alcance: detecta la vista real por su encabezado y aplica
   la clase visual al contenedor activo. Solo presentación.
   ═══════════════════════════════════════════════════════════════════════ */
(function nxPrefacturaVisual2484(){
  'use strict';
  if(document.getElementById('nx-prefactura-visual-2484')) return;

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
  st.id='nx-prefactura-visual-2484';
  st.textContent=`
  .nx-prefactura-real{--pv-bg:#f4f6f9;--pv-panel:#fff;--pv-line:#e5e9f0;--pv-text:#172033;--pv-muted:#667085;--pv-primary:#3157d5;background:var(--pv-bg)!important}
  .nx-prefactura-real.nxPf,.nx-prefactura-real .nxPf{max-width:1500px;margin:0 auto;padding:14px 16px 28px!important;color:var(--pv-text)}
  .nx-prefactura-real .ph{background:transparent!important;border:0!important;box-shadow:none!important;padding:4px 2px 14px!important;margin-bottom:0!important}
  .nx-prefactura-real .ph h1,.nx-prefactura-real .ph h2,.nx-prefactura-real .ph .pt{font-size:21px!important;line-height:1.2!important;font-weight:800!important;letter-spacing:-.02em!important;color:var(--pv-text)!important}
  .nx-prefactura-real .ph p,.nx-prefactura-real .ph .ps{color:var(--pv-muted)!important;font-size:11.5px!important}
  .nx-prefactura-real .card,.nx-prefactura-real .cartcard,.nx-prefactura-real .nx-inv-card,.nx-prefactura-real .nxFacCard{background:var(--pv-panel)!important;border:1px solid var(--pv-line)!important;border-radius:14px!important;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px rgba(16,24,40,.05)!important}
  .nx-prefactura-real .venderlayout,.nx-prefactura-real .nx-inv-layout,.nx-prefactura-real .fac-layout{gap:14px!important;align-items:start!important}
  .nx-prefactura-real .cartcard{position:sticky!important;top:12px!important;overflow:hidden!important}
  .nx-prefactura-real .clibox,.nx-prefactura-real .nx-inv-client,.nx-prefactura-real .faccli{background:#fbfcfe!important;border:1px solid var(--pv-line)!important;border-radius:12px!important;padding:11px 12px!important}
  .nx-prefactura-real label{font-size:10px!important;font-weight:750!important;letter-spacing:.025em!important;color:#596579!important}
  .nx-prefactura-real input,.nx-prefactura-real select,.nx-prefactura-real textarea{border:1px solid #d9dfe8!important;border-radius:9px!important;background:#fff!important;color:var(--pv-text)!important;min-height:38px!important;box-shadow:none!important;transition:border-color .14s,box-shadow .14s!important}
  .nx-prefactura-real input:focus,.nx-prefactura-real select:focus,.nx-prefactura-real textarea:focus{border-color:#6f85df!important;box-shadow:0 0 0 3px rgba(49,87,213,.11)!important;outline:0!important}
  .nx-prefactura-real .vsearch input,.nx-prefactura-real .nx-inv-search input{height:44px!important;font-size:13px!important;padding-left:40px!important}
  .nx-prefactura-real .vrow,.nx-prefactura-real .cartitem,.nx-prefactura-real .nx-inv-row,.nx-prefactura-real .nxFacTbl tbody tr{border-color:#edf0f4!important;transition:background .12s,border-color .12s!important}
  .nx-prefactura-real .vrow:hover,.nx-prefactura-real .cartitem:hover,.nx-prefactura-real .nx-inv-row:hover,.nx-prefactura-real .nxFacTbl tbody tr:hover{background:#f8faff!important}
  .nx-prefactura-real .vnom,.nx-prefactura-real .cartnom,.nx-prefactura-real .nx-inv-name{font-weight:750!important;color:var(--pv-text)!important}
  .nx-prefactura-real .vprecio,.nx-prefactura-real .cartprice,.nx-prefactura-real .nx-inv-money,.nx-prefactura-real .nxFacTbl td:last-child{font-variant-numeric:tabular-nums!important;font-weight:750!important}
  .nx-prefactura-real .carttot,.nx-prefactura-real .carttotals,.nx-prefactura-real .nx-inv-summary{background:#fafbfc!important;border-top:1px solid var(--pv-line)!important;padding:12px 14px!important}
  .nx-prefactura-real .cartpaytot b{font-size:22px!important;letter-spacing:-.025em!important;color:#172033!important;font-variant-numeric:tabular-nums!important}
  .nx-prefactura-real .cartsavebtn{height:39px!important;border:1px solid #d8deea!important;border-radius:9px!important;background:#fff!important;color:#344054!important;font-weight:750!important}
  .nx-prefactura-real .cartcobrar,.nx-prefactura-real .g1{height:46px!important;border-radius:10px!important;background:#3157d5!important;border:1px solid #294bc0!important;color:#fff!important;font-weight:800!important;box-shadow:0 5px 14px rgba(49,87,213,.22)!important}
  @media(max-width:768px){
    .nx-prefactura-real.nxPf,.nx-prefactura-real .nxPf{padding:10px 10px 104px!important}
    .nx-prefactura-real .venderlayout,.nx-prefactura-real .nx-inv-layout,.nx-prefactura-real .fac-layout{display:block!important}
    .nx-prefactura-real .cartcard{position:relative!important;top:auto!important;margin-top:12px!important}
    .nx-prefactura-real input,.nx-prefactura-real select{font-size:16px!important}
  }
  body.tema-oscuro .nx-prefactura-real,body.tema-premium .nx-prefactura-real{--pv-bg:#101521;--pv-panel:#171e2b;--pv-line:#2a3445;--pv-text:#edf2fa;--pv-muted:#a5b0c2}
  `;
  document.head.appendChild(st);
  marcarVista();
  new MutationObserver(()=>requestAnimationFrame(marcarVista)).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
  document.addEventListener('click',()=>setTimeout(marcarVista,80),true);
})();
'''

parches = Path('parches.js')
src = parches.read_text(encoding='utf-8')
if OLD_START in src:
    start = src.index(OLD_START)
    end_marker = "})();"
    end = src.find(end_marker, start)
    if end != -1:
        end += len(end_marker)
        src = src[:start] + src[end:]
if NEW_MARKER not in src:
    src += PATCH
parches.write_text(src, encoding='utf-8')

index = Path('index.html')
text = index.read_text(encoding='utf-8')
text2, count = re.subn(r"const APP_VERSION='48\.83';", "const APP_VERSION='48.84';", text, count=1)
if count != 1 and "const APP_VERSION='48.84';" not in text:
    raise SystemExit('No se encontró APP_VERSION 48.83 en index.html')
index.write_text(text2, encoding='utf-8')

version = Path('version.json')
data = json.loads(version.read_text(encoding='utf-8'))
data['version'] = '48.84'
message = ('CORREGIDO (POS · Prefactura/Preventa — alcance visual real): el rediseño ahora detecta '
           'la pantalla real de Prefactura/Preventa por su encabezado y aplica el nuevo estilo al '
           'contenedor activo. Antes apuntaba a un selector que esa pantalla no utilizaba, por eso '
           'visualmente se veía igual. Sin cambios de lógica, inventario, impuestos, NCF o Supabase.')
if message not in data.setdefault('cambios', []):
    data['cambios'].insert(0, message)
version.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
