from pathlib import Path
import json
import re

MARKER = "NEXUS PREFactura Visual 2.5 — v48.83"
PATCH = r'''

/* ═══════════════════════════════════════════════════════════════════════
   NEXUS PREFactura Visual 2.5 — v48.83
   Capa exclusivamente visual. No altera guardado, inventario, NCF,
   impuestos, Supabase ni flujo comercial.
   ═══════════════════════════════════════════════════════════════════════ */
(function nxPrefacturaVisual25(){
  'use strict';
  if(document.getElementById('nx-prefactura-visual-25')) return;
  const st=document.createElement('style');
  st.id='nx-prefactura-visual-25';
  st.textContent=`
  #v-prefactura{--pv-bg:#f4f6f9;--pv-panel:#fff;--pv-line:#e5e9f0;--pv-text:#172033;--pv-muted:#667085;--pv-primary:#3157d5;background:var(--pv-bg)!important}
  #v-prefactura .nxPf{max-width:1500px;margin:0 auto;padding:14px 16px 28px!important;color:var(--pv-text)}
  #v-prefactura .nxPf>.ph,#v-prefactura .nxPf .ph{background:transparent!important;border:0!important;box-shadow:none!important;padding:4px 2px 14px!important;margin-bottom:0!important}
  #v-prefactura .nxPf .ph h1,#v-prefactura .nxPf .ph h2,#v-prefactura .nxPf .ph .pt{font-size:21px!important;line-height:1.2!important;font-weight:800!important;letter-spacing:-.02em!important;color:var(--pv-text)!important}
  #v-prefactura .nxPf .ph p,#v-prefactura .nxPf .ph .ps{color:var(--pv-muted)!important;font-size:11.5px!important}
  #v-prefactura .nxPf .card,#v-prefactura .nxPf .cartcard,#v-prefactura .nxPf .nx-inv-card,#v-prefactura .nxPf .nxFacCard{background:var(--pv-panel)!important;border:1px solid var(--pv-line)!important;border-radius:14px!important;box-shadow:0 1px 2px rgba(16,24,40,.04),0 8px 24px rgba(16,24,40,.05)!important}
  #v-prefactura .nxPf .venderlayout,#v-prefactura .nxPf .nx-inv-layout,#v-prefactura .nxPf .fac-layout{gap:14px!important;align-items:start!important}
  #v-prefactura .nxPf .cartcard{position:sticky!important;top:12px!important;overflow:hidden!important}
  #v-prefactura .nxPf .clibox,#v-prefactura .nxPf .nx-inv-client,#v-prefactura .nxPf .faccli{background:#fbfcfe!important;border:1px solid var(--pv-line)!important;border-radius:12px!important;padding:11px 12px!important}
  #v-prefactura .nxPf label{font-size:10px!important;font-weight:750!important;letter-spacing:.025em!important;color:#596579!important}
  #v-prefactura .nxPf input,#v-prefactura .nxPf select,#v-prefactura .nxPf textarea{border:1px solid #d9dfe8!important;border-radius:9px!important;background:#fff!important;color:var(--pv-text)!important;min-height:38px!important;box-shadow:none!important;transition:border-color .14s,box-shadow .14s!important}
  #v-prefactura .nxPf input:focus,#v-prefactura .nxPf select:focus,#v-prefactura .nxPf textarea:focus{border-color:#6f85df!important;box-shadow:0 0 0 3px rgba(49,87,213,.11)!important;outline:0!important}
  #v-prefactura .nxPf .vsearch input,#v-prefactura .nxPf .nx-inv-search input{height:44px!important;font-size:13px!important;padding-left:40px!important}
  #v-prefactura .nxPf .vrow,#v-prefactura .nxPf .cartitem,#v-prefactura .nxPf .nx-inv-row,#v-prefactura .nxPf .nxFacTbl tbody tr{border-color:#edf0f4!important;transition:background .12s,border-color .12s!important}
  #v-prefactura .nxPf .vrow:hover,#v-prefactura .nxPf .cartitem:hover,#v-prefactura .nxPf .nx-inv-row:hover,#v-prefactura .nxPf .nxFacTbl tbody tr:hover{background:#f8faff!important}
  #v-prefactura .nxPf .vnom,#v-prefactura .nxPf .cartnom,#v-prefactura .nxPf .nx-inv-name{font-weight:750!important;color:var(--pv-text)!important}
  #v-prefactura .nxPf .vprecio,#v-prefactura .nxPf .cartprice,#v-prefactura .nxPf .nx-inv-money,#v-prefactura .nxPf .nxFacTbl td:last-child{font-variant-numeric:tabular-nums!important;font-weight:750!important}
  #v-prefactura .nxPf .carttot,#v-prefactura .nxPf .carttotals,#v-prefactura .nxPf .nx-inv-summary{background:#fafbfc!important;border-top:1px solid var(--pv-line)!important;padding:12px 14px!important}
  #v-prefactura .nxPf .cartpaytot b{font-size:22px!important;letter-spacing:-.025em!important;color:#172033!important;font-variant-numeric:tabular-nums!important}
  #v-prefactura .nxPf .cartsavebtn{height:39px!important;border:1px solid #d8deea!important;border-radius:9px!important;background:#fff!important;color:#344054!important;font-weight:750!important}
  #v-prefactura .nxPf .cartcobrar,#v-prefactura .nxPf .g1{height:46px!important;border-radius:10px!important;background:#3157d5!important;border:1px solid #294bc0!important;color:#fff!important;font-weight:800!important;box-shadow:0 5px 14px rgba(49,87,213,.22)!important}
  @media(max-width:768px){
    #v-prefactura .nxPf{padding:10px 10px 104px!important}
    #v-prefactura .nxPf .venderlayout,#v-prefactura .nxPf .nx-inv-layout,#v-prefactura .nxPf .fac-layout{display:block!important}
    #v-prefactura .nxPf .cartcard{position:relative!important;top:auto!important;margin-top:12px!important}
    #v-prefactura .nxPf input,#v-prefactura .nxPf select{font-size:16px!important}
  }
  body.tema-oscuro #v-prefactura,body.tema-premium #v-prefactura{--pv-bg:#101521;--pv-panel:#171e2b;--pv-line:#2a3445;--pv-text:#edf2fa;--pv-muted:#a5b0c2}
  `;
  document.head.appendChild(st);
})();
'''

parches = Path('parches.js')
src = parches.read_text(encoding='utf-8')
if MARKER not in src:
    parches.write_text(src + PATCH, encoding='utf-8')

index = Path('index.html')
text = index.read_text(encoding='utf-8')
text2, count = re.subn(r"const APP_VERSION='48\.82';", "const APP_VERSION='48.83';", text, count=1)
if count != 1 and "const APP_VERSION='48.83';" not in text:
    raise SystemExit('No se encontró APP_VERSION 48.82 en index.html')
index.write_text(text2, encoding='utf-8')

version = Path('version.json')
data = json.loads(version.read_text(encoding='utf-8'))
data['version'] = '48.83'
message = ('MEJORADO (POS · Prefactura/Preventa — rediseño visual 2.5): nueva jerarquía visual '
           'exclusiva para Prefactura en PC y móvil. No cambia lógica comercial, inventario, '
           'impuestos, NCF, Supabase ni el proceso de guardado.')
if message not in data.setdefault('cambios', []):
    data['cambios'].insert(0, message)
version.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
