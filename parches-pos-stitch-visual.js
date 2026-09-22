/* NEXUS PRO · Stitch visual layer — POS Multiempresa
   Strictly presentational: applies only to the Multiempresa hub and #v-pos.
   It does not modify sales, inventory, permissions, API calls or navigation. */
(function(){
  'use strict';
  if(window.__nxPosStitchVisual)return;
  window.__nxPosStitchVisual=true;

  function install(){
    if(document.getElementById('nxPosStitchVisualCSS'))return;
    var style=document.createElement('style');
    style.id='nxPosStitchVisualCSS';
    style.textContent=`
/* Multiempresa hub: one clear administrative entry point. */
#v-multiempresa .nc{
  max-width:1180px;
  margin-inline:auto;
  border:1px solid rgba(148,163,184,.18);
  border-radius:22px;
  background:rgba(255,255,255,.96);
  box-shadow:0 18px 42px rgba(15,23,42,.07);
}
#v-multiempresa .ch{
  padding-bottom:16px;
  border-bottom:1px solid rgba(148,163,184,.14);
}
#v-multiempresa .ct{
  letter-spacing:-.02em;
  color:#0f172a;
}
#v-multiempresa .nxMeGrid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
  gap:14px;
}
#v-multiempresa .nxMeCard{
  min-height:112px;
  padding:18px;
  border:1px solid rgba(148,163,184,.18);
  border-radius:18px;
  background:#fff;
  box-shadow:0 1px 2px rgba(15,23,42,.03);
  transition:transform 220ms cubic-bezier(.22,1,.36,1),box-shadow 220ms ease,border-color 220ms ease;
}
#v-multiempresa .nxMeCard:focus-visible{outline:2px solid #2563eb;outline-offset:3px}
#v-multiempresa .nxMeCard:hover{
  transform:translateY(-2px);
  border-color:rgba(37,99,235,.30);
  box-shadow:0 14px 30px rgba(15,23,42,.09);
}
#v-multiempresa .nxMeIco{
  width:42px;height:42px;border-radius:14px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8);
}
#v-multiempresa .nxMeNom{font-size:15px;letter-spacing:-.01em;color:#0f172a}
#v-multiempresa .nxMeDesc{margin-top:3px;line-height:1.45;color:#64748b}
#v-multiempresa .nxMeArr{color:#94a3b8;transition:transform 180ms cubic-bezier(.22,1,.36,1)}
#v-multiempresa .nxMeCard:hover .nxMeArr{transform:translateX(3px);color:#2563eb}

/* POS shell: an operations workspace, calm enough for repeated daily use. */
#v-pos .nxTShell{
  background:#f8fafc;
  color:#0f172a;
}
#v-pos .nxTSide{
  background:linear-gradient(165deg,#173f8f 0%,#1d4ed8 54%,#1e40af 100%);
  box-shadow:8px 0 28px rgba(15,23,42,.10);
}
#v-pos .nxTBrand{
  border-bottom-color:rgba(255,255,255,.15);
}
#v-pos .nxTLogo{
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 5px 15px rgba(15,23,42,.16);
}
#v-pos .nxTSearchBtn{
  border-color:rgba(255,255,255,.20);
  background:rgba(255,255,255,.10);
  transition:transform 160ms cubic-bezier(.22,1,.36,1),background 160ms ease;
}
#v-pos .nxTSearchBtn:hover{transform:translateY(-1px);background:rgba(255,255,255,.16)}
#v-pos .nxTNav{
  border-radius:11px;
  transition:transform 160ms cubic-bezier(.22,1,.36,1),background 160ms ease,color 160ms ease;
}
#v-pos .nxTNav:hover{transform:translateX(2px)}
#v-pos .nxTNav.on{
  background:rgba(255,255,255,.17);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14);
}
#v-pos .nxTTop{
  border-bottom:1px solid rgba(148,163,184,.15);
  box-shadow:0 5px 18px rgba(15,23,42,.035);
}
#v-pos .nxTQuick{
  border-radius:12px;
  background:#2563eb;
  box-shadow:0 5px 14px rgba(37,99,235,.20);
  transition:transform 160ms cubic-bezier(.22,1,.36,1),box-shadow 160ms ease;
}
#v-pos .nxTQuick:hover{transform:translateY(-1px);box-shadow:0 9px 18px rgba(37,99,235,.23)}

/* Operational dashboard: hierarchy through spacing and edges, not decorative cards. */
#v-pos .nxInicio{max-width:1440px;margin-inline:auto}
#v-pos .nxIniHi{letter-spacing:-.035em;color:#0f172a}
#v-pos .nxIniBiz{color:#64748b}
#v-pos .nxTKpi,
#v-pos .nxTPanel,
#v-pos .nxApp{
  border:1px solid rgba(148,163,184,.17);
  box-shadow:0 7px 20px rgba(15,23,42,.045);
}
#v-pos .nxTKpi{
  border-radius:16px;
  background:#fff;
  transition:transform 220ms cubic-bezier(.22,1,.36,1),box-shadow 220ms ease;
}
#v-pos .nxTKpi:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(15,23,42,.08)}
#v-pos .nxTKpiV{font-variant-numeric:tabular-nums;letter-spacing:-.03em}
#v-pos .nxTPanel{border-radius:18px;background:#fff}
#v-pos .nxAppGrid{gap:10px}
#v-pos .nxApp{
  border-radius:15px;
  background:#fff;
  transition:transform 180ms cubic-bezier(.22,1,.36,1),box-shadow 180ms ease,border-color 180ms ease;
}
#v-pos .nxApp:hover{
  transform:translateY(-2px);
  border-color:rgba(37,99,235,.25);
  box-shadow:0 12px 24px rgba(15,23,42,.08);
}
#v-pos .nxAppIco{border-radius:12px}
#v-pos .nxAppNom{color:#27364b}

/* Facturas: lista de documentos con lectura rápida y acciones contenidas. */
#nxFacHistM .nxPrForm{
  width:min(94vw,560px) !important;
  padding:0 !important;
  overflow:hidden;
  border:1px solid rgba(148,163,184,.18);
  border-radius:20px !important;
  background:#f8fafc;
  box-shadow:0 22px 54px rgba(15,23,42,.18);
}
#nxFacHistM .mt{
  min-height:62px;
  padding:0 16px;
  border-bottom:1px solid rgba(148,163,184,.16);
  background:#fff;
}
#nxFacHistRows{
  padding:4px 12px 10px;
  background:#f8fafc;
}
#nxFacHistRows>div{
  margin:8px 0;
  padding:12px 11px !important;
  border:1px solid rgba(148,163,184,.18) !important;
  border-radius:14px;
  background:#fff;
  box-shadow:0 2px 8px rgba(15,23,42,.035);
  transition:transform 180ms cubic-bezier(.22,1,.36,1),box-shadow 180ms ease,border-color 180ms ease;
}
#nxFacHistRows>div:hover{
  transform:translateY(-1px);
  border-color:rgba(37,99,235,.30) !important;
  box-shadow:0 10px 20px rgba(15,23,42,.08);
}
#nxFacHistRows>div>div:first-child>div:first-child{
  font-size:12px !important;
  letter-spacing:-.01em;
}
#nxFacHistRows>div>div:first-child>div:last-child{
  margin-top:3px;
  line-height:1.4;
  color:#64748b !important;
}
#nxFacHistRows>div>b{
  min-width:76px;
  padding:6px 8px;
  border-radius:9px;
  background:#eff6ff;
  color:#1d4ed8;
  text-align:right;
  font-variant-numeric:tabular-nums;
}
#nxFacHistRows>div .ab{
  flex:0 0 30px;
  width:30px !important;
  height:30px !important;
  border-radius:9px;
}
#nxFacHistNav{
  display:flex;
  justify-content:center;
  padding:12px 14px 14px;
  border-top:1px solid rgba(148,163,184,.15);
  background:#fff;
}
#nxFacHistNav>div{margin-top:0 !important}
@media(max-width:480px){
  #nxFacHistM .nxPrForm{width:calc(100vw - 20px) !important;border-radius:16px !important}
  #nxFacHistRows{padding-inline:9px}
  #nxFacHistRows>div{gap:7px !important;padding:11px 9px !important}
  #nxFacHistRows>div>b{min-width:66px;font-size:11.5px !important;padding:5px 6px}
}


/* Factura: lista principal de artículos. Solo jerarquía visual; no cambia el cálculo ni el cobro. */
#v-pos .nx-invoice-pro #facTabla{
  margin-top:14px;
  padding:4px 10px 10px;
  border:1px solid rgba(148,163,184,.17);
  border-radius:16px;
  background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);
}
#v-pos .nx-invoice-pro .docTbl{
  border-collapse:separate !important;
  border-spacing:0 7px !important;
}
#v-pos .nx-invoice-pro .docTbl thead th{
  padding:7px 10px !important;
  border:0 !important;
  color:#64748b !important;
  font-size:9px !important;
  letter-spacing:.07em;
}
#v-pos .nx-invoice-pro .docTbl tbody tr{
  filter:drop-shadow(0 3px 6px rgba(15,23,42,.045));
  transition:transform 180ms cubic-bezier(.22,1,.36,1),filter 180ms ease;
}
#v-pos .nx-invoice-pro .docTbl tbody tr:hover{
  transform:translateY(-1px);
  filter:drop-shadow(0 9px 14px rgba(15,23,42,.10));
}
#v-pos .nx-invoice-pro .docTbl tbody td{
  padding:11px 9px !important;
  border-top:1px solid rgba(148,163,184,.18) !important;
  border-bottom:1px solid rgba(148,163,184,.18) !important;
  background:#fff !important;
}
#v-pos .nx-invoice-pro .docTbl tbody td:first-child{
  border-left:1px solid rgba(148,163,184,.18) !important;
  border-radius:12px 0 0 12px;
  color:#2563eb !important;
  font-variant-numeric:tabular-nums;
}
#v-pos .nx-invoice-pro .docTbl tbody td:last-child{
  border-right:1px solid rgba(148,163,184,.18) !important;
  border-radius:0 12px 12px 0;
}
#v-pos .nx-invoice-pro .docTbl .dnm{
  color:#0f172a !important;
  font-size:12.5px !important;
  font-weight:800 !important;
}
#v-pos .nx-invoice-pro .docTbl .dsub{
  margin-top:4px;
  color:#64748b !important;
}
#v-pos .nx-invoice-pro .docTbl .imp{
  color:#1d4ed8 !important;
  font-weight:800 !important;
  font-variant-numeric:tabular-nums;
}
#v-pos .nx-invoice-pro .docTbl .pin,
#v-pos .nx-invoice-pro .docTbl .dsc input{
  border-color:#dbe4f0 !important;
  background:#f8fafc !important;
}
#v-pos .nx-invoice-pro .docTbl .stp{
  border:1px solid #dbe4f0;
  border-radius:9px;
  background:#f8fafc;
  overflow:hidden;
}
#v-pos .nx-invoice-pro .docTbl .del{
  border-radius:9px !important;
  background:#fff1f2 !important;
  color:#e11d48 !important;
}
#v-pos .nx-invoice-pro .cnt{
  margin:2px 4px 0;
  color:#64748b !important;
  font-weight:700;
}
@media(max-width:640px){
  #v-pos .nx-invoice-pro #facTabla{margin-top:11px;padding:3px 7px 8px;border-radius:14px}
  #v-pos .nx-invoice-pro .docTbl{border-spacing:0 6px !important}
  #v-pos .nx-invoice-pro .docTbl tbody td{padding:9px 7px !important}
  #v-pos .nx-invoice-pro .docTbl .dnm{font-size:12px !important}
  #v-pos .nx-invoice-pro .docTbl .imp{font-size:12px !important}
}


/* Factura > Buscar artículo: catálogo en lista de decisión rápida. */
#v-pos .nx-invoice-pro .nxPpkInline{
  margin-top:10px;
  overflow:hidden;
  border:1px solid rgba(148,163,184,.20);
  border-radius:16px;
  background:#f8fafc;
  box-shadow:0 12px 30px rgba(15,23,42,.07);
}
#v-pos .nx-invoice-pro .nxPpkInline>.mt{
  min-height:54px;
  padding:0 14px;
  border-bottom:1px solid rgba(148,163,184,.16);
  background:#fff;
}
#v-pos .nx-invoice-pro #ppkList{
  padding:8px !important;
  background:#f8fafc;
}
#v-pos .nx-invoice-pro .nxPpkGrid{
  display:flex;
  flex-direction:column;
  gap:8px;
}
#v-pos .nx-invoice-pro .nxPpkWrap{
  margin:0 !important;
  overflow:hidden;
  border:1px solid rgba(148,163,184,.18);
  border-radius:13px;
  background:#fff;
  box-shadow:0 2px 7px rgba(15,23,42,.035);
  transition:transform 180ms cubic-bezier(.22,1,.36,1),box-shadow 180ms ease,border-color 180ms ease;
}
#v-pos .nx-invoice-pro .nxPpkWrap:hover,
#v-pos .nx-invoice-pro .nxPpkWrap.on{
  transform:translateY(-1px);
  border-color:rgba(37,99,235,.36);
  box-shadow:0 10px 20px rgba(15,23,42,.09);
}
#v-pos .nx-invoice-pro .nxPpkIt{
  min-height:62px;
  padding:10px 11px !important;
  background:#fff !important;
}
#v-pos .nx-invoice-pro .nxPpkIt>div:first-child>div:first-child{
  color:#0f172a !important;
  font-size:12.5px !important;
  font-weight:800 !important;
}
#v-pos .nx-invoice-pro .nxPpkIt .nxPosStkB{
  border-radius:999px;
  padding:3px 6px;
  font-size:8.5px;
  letter-spacing:.02em;
}
#v-pos .nx-invoice-pro .nxPpkChev{
  width:28px;
  height:28px;
  border-radius:9px;
  background:#eff6ff;
  color:#2563eb !important;
}
#v-pos .nx-invoice-pro .nxPpkDet{
  border-top:1px solid rgba(148,163,184,.15);
  background:#f8fafc;
}
#v-pos .nx-invoice-pro .nxPpkBox{
  margin:9px !important;
  border:1px solid rgba(148,163,184,.15);
  border-radius:11px;
  background:#fff;
}
#v-pos .nx-invoice-pro .nxPpkElegir{
  min-height:38px !important;
  border-radius:10px !important;
  box-shadow:0 5px 12px rgba(37,99,235,.20);
}
@media(max-width:640px){
  #v-pos .nx-invoice-pro .nxPpkInline{border-radius:14px}
  #v-pos .nx-invoice-pro #ppkList{padding:7px !important}
  #v-pos .nx-invoice-pro .nxPpkIt{min-height:58px;padding:9px 10px !important}
}


/* Factura móvil: líneas agregadas legibles y sin quedar debajo de Cobrar. */
#v-pos .nx-invoice-pro .nxFacProductLead{
  display:flex;
  align-items:flex-start;
  gap:10px;
  min-width:0;
}
#v-pos .nx-invoice-pro .nxFacProductIcon{
  width:34px;
  height:34px;
  flex:0 0 34px;
  display:grid;
  place-items:center;
  border-radius:10px;
  background:linear-gradient(145deg,#eff6ff,#dbeafe);
  color:#2563eb;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9);
}
#v-pos .nx-invoice-pro .nxFacProductIcon i{font-size:17px}
#v-pos .nx-invoice-pro .nxFacProductInfo{min-width:0;flex:1}
@media(max-width:760px){
  #v-pos .nx-invoice-pro #facTabla{padding-bottom:94px !important}
  #v-pos .nx-invoice-pro .docTbl tr{
    overflow:hidden;
    border-radius:16px !important;
    padding:0 12px !important;
    background:#fff;
    box-shadow:0 8px 18px rgba(15,23,42,.075);
  }
  #v-pos .nx-invoice-pro .docTbl td[data-l="Descripción"]{
    margin:0 -12px;
    padding:13px 12px !important;
    border-bottom:1px solid #e8eef6 !important;
    background:linear-gradient(135deg,#fff 0%,#f8fbff 100%) !important;
  }
  #v-pos .nx-invoice-pro .docTbl td[data-l="Importe"]{
    padding-top:11px !important;
    border-top:1px solid #e8eef6 !important;
  }
  #v-pos .nx-invoice-pro .docTbl td[data-l="Importe"] .imp{font-size:14px !important}
}


/* Factura: lista de artículos sobria y compacta. */
#v-pos .nx-invoice-pro #facTabla{
  margin-top:10px !important;
  padding:0 0 94px !important;
  border:0 !important;
  border-radius:0 !important;
  background:transparent !important;
}
#v-pos .nx-invoice-pro .docTbl{
  border-collapse:collapse !important;
  border-spacing:0 !important;
  background:#fff;
  border:1px solid #edf1f6;
  border-radius:12px;
  overflow:hidden;
}
#v-pos .nx-invoice-pro .docTbl thead th{
  padding:9px 8px !important;
  border-bottom:1px solid #e5eaf1 !important;
  background:#fafbfd;
  color:#94a3b8 !important;
}
#v-pos .nx-invoice-pro .docTbl tbody tr{
  filter:none !important;
  transform:none !important;
  transition:background 160ms ease;
}
#v-pos .nx-invoice-pro .docTbl tbody tr:hover{
  transform:none !important;
  filter:none !important;
}
#v-pos .nx-invoice-pro .docTbl tbody td{
  padding:9px 8px !important;
  border:0 !important;
  border-bottom:1px solid #edf1f6 !important;
  background:#fff !important;
}
#v-pos .nx-invoice-pro .docTbl tbody tr:last-child td{border-bottom:0 !important}
#v-pos .nx-invoice-pro .docTbl tbody td:first-child,
#v-pos .nx-invoice-pro .docTbl tbody td:last-child{
  border-radius:0 !important;
}
#v-pos .nx-invoice-pro .docTbl .dnm{
  font-size:12px !important;
  font-weight:700 !important;
}
#v-pos .nx-invoice-pro .docTbl .dsub{margin-top:2px}
#v-pos .nx-invoice-pro .docTbl .imp{
  color:#0f172a !important;
  font-size:12px;
  font-weight:800 !important;
}
#v-pos .nx-invoice-pro .docTbl .stp{
  border-color:#e5eaf1 !important;
  background:#fafbfd !important;
  box-shadow:none !important;
}
#v-pos .nx-invoice-pro .docTbl .del{
  background:transparent !important;
  color:#94a3b8 !important;
}
#v-pos .nx-invoice-pro .docTbl .cnt{
  margin:0 !important;
  padding:7px 2px 0 !important;
  text-align:left;
  font-size:10px;
}
@media(max-width:760px){
  #v-pos .nx-invoice-pro .docTbl{
    display:block;
    border-radius:12px;
    overflow:visible;
    background:transparent;
    border:0;
  }
  #v-pos .nx-invoice-pro .docTbl tbody{display:block}
  #v-pos .nx-invoice-pro .docTbl tr{
    display:block;
    margin:0 !important;
    padding:0 11px !important;
    border:1px solid #edf1f6 !important;
    border-radius:0 !important;
    box-shadow:none !important;
    background:#fff !important;
  }
  #v-pos .nx-invoice-pro .docTbl tr:first-child{border-radius:12px 12px 0 0 !important}
  #v-pos .nx-invoice-pro .docTbl tr:last-child{border-radius:0 0 12px 12px !important}
  #v-pos .nx-invoice-pro .docTbl tr+tr{border-top:0 !important}
  #v-pos .nx-invoice-pro .docTbl td[data-l="Descripción"]{
    margin:0 !important;
    padding:10px 0 7px !important;
    background:#fff !important;
    border-bottom:1px solid #edf1f6 !important;
  }
  #v-pos .nx-invoice-pro .docTbl td{
    padding:7px 0 !important;
    border-bottom:1px solid #f1f4f8 !important;
  }
}

/* Motion is deliberately short and can be disabled by the OS. */
#v-pos .nxTShell .nxTKpi,
#v-pos .nxTShell .nxApp,
#v-multiempresa .nxMeCard{
  animation:nxPosStitchEnter 260ms cubic-bezier(.22,1,.36,1) both;
}
#v-pos .nxTShell .nxTKpi:nth-child(2),
#v-pos .nxTShell .nxApp:nth-child(2),
#v-multiempresa .nxMeCard:nth-child(2){animation-delay:24ms}
#v-pos .nxTShell .nxTKpi:nth-child(3),
#v-pos .nxTShell .nxApp:nth-child(3),
#v-multiempresa .nxMeCard:nth-child(3){animation-delay:48ms}
#v-pos .nxTShell .nxTKpi:nth-child(4),
#v-pos .nxTShell .nxApp:nth-child(4),
#v-multiempresa .nxMeCard:nth-child(4){animation-delay:72ms}
@keyframes nxPosStitchEnter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:768px){
  #v-multiempresa .nc{border-radius:16px}
  #v-multiempresa .nxMeGrid{grid-template-columns:1fr}
  #v-pos .nxTQuick{min-height:44px}
  #v-pos .nxTKpi,#v-pos .nxTPanel,#v-pos .nxApp{box-shadow:0 5px 14px rgba(15,23,42,.045)}
}
@media (prefers-reduced-motion:reduce){
  #v-pos .nxTShell .nxTKpi,#v-pos .nxTShell .nxApp,#v-multiempresa .nxMeCard{
    animation-duration:.01ms !important;
  }
  #v-pos .nxTShell *,#v-multiempresa .nxMeCard{transition-duration:.01ms !important}
}
`;
    (document.head||document.documentElement).appendChild(style);

    /* ── Línea gráfica única del POS (DESIGN.md, decisión del dueño 22-sep-2026) ──
       Tokens Nexus + Geist/JetBrains Mono + un solo acento (Nexus Blue). Cubre #v-pos,
       el hub Multiempresa y los modales del POS (clases nxPrForm/nxPf) aunque cuelguen
       de body. Seguros no se toca: nada aquí aplica fuera de esos ámbitos. Solo CSS. */
    var linea=document.createElement('style');
    linea.id='nxLineaUnicaCSS';
    linea.textContent=`
#v-pos,#v-multiempresa,.nxPf,.modal.nxPrForm,body.org-tienda{
  --nx-bg:#f8fafc;--nx-surface:#ffffff;--nx-ink:#0f172a;--nx-steel:#64748b;--nx-mute:#94a3b8;
  --nx-line:rgba(148,163,184,.12);--nx-line-2:rgba(148,163,184,.18);
  --nx-blue:#2563eb;--nx-blue-d:#1d4ed8;--nx-blue-l:#eff6ff;--nx-blue-b:#bfdbfe;
  --nx-r:16px;--nx-r-md:12px;--nx-r-sm:10px;
  --nx-font:'Geist','Segoe UI',system-ui,-apple-system,sans-serif;
  --nx-mono:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
  --mono:var(--nx-mono);
}
/* Tipografía: una sola familia; montos y referencias en mono tabular. */
#v-pos,#v-multiempresa,.nxPf,.modal.nxPrForm,body.org-tienda .overlay .modal{font-family:var(--nx-font)}
body:not(.tema-premium) .nxPf{font-family:var(--nx-font);--pf-purple:var(--nx-blue);--pf-purple-l:var(--nx-blue-l);--pf-bg:var(--nx-bg);--pf-line:var(--nx-line-2);--pf-txt:var(--nx-ink);--pf-txt2:var(--nx-steel);--pf-txt3:var(--nx-mute)}
#v-pos .kpitile .v,#v-pos .nxTKpiV,.nxPf .ser,.modal.nxPrForm .ser,#v-pos [data-nx-money],.modal.nxPrForm [data-nx-money],.nxPf [data-nx-money],
#v-pos [style*="var(--mono"],.modal.nxPrForm [style*="var(--mono"],.nxPf [style*="var(--mono"]{font-family:var(--nx-mono) !important;font-variant-numeric:tabular-nums}
/* Superficies: blanco puro, borde susurro, radio 16. */
#v-pos .kpitile,#v-pos .nxPf .card,.modal.nxPf .card{border-radius:var(--nx-r);border-color:var(--nx-line-2);background:var(--nx-surface)}
#v-pos div[style*="background:#fff"][style*="border-radius:14px"],#v-pos div[style*="background:#fff"][style*="border-radius:12px"],
.modal.nxPrForm div[style*="background:#fff"][style*="border-radius:14px"]{border-radius:var(--nx-r) !important;border-color:var(--nx-line-2) !important}
#v-pos .tw,.modal.nxPrForm .tw{border-radius:var(--nx-r);border-color:var(--nx-line-2)}
.overlay .modal.nxPrForm,.overlay .modal.nxPf{border-radius:20px;border:1px solid var(--nx-line-2);box-shadow:0 22px 54px rgba(15,23,42,.18)}
@media(max-width:480px){.overlay .modal.nxPrForm,.overlay .modal.nxPf{border-radius:16px}}
/* Un solo acento: Nexus Blue. El morado heredado se reasigna sin tocar plantillas. */
#v-pos .bc1,.modal.nxPrForm .bc1,.nxPf .bc1,body.org-tienda .bc1{background:var(--nx-blue);border-color:var(--nx-blue);color:#fff}
#v-pos .bc1:hover,.modal.nxPrForm .bc1:hover,.nxPf .bc1:hover,body.org-tienda .bc1:hover{background:var(--nx-blue-d);border-color:var(--nx-blue-d);color:#fff}
#v-pos .btn:hover,.modal.nxPrForm .btn:hover,.nxPf .btn:hover,body.org-tienda .btn:hover{border-color:var(--nx-blue);color:var(--nx-blue-d);background:var(--nx-blue-l)}
#v-pos .btn,.modal.nxPrForm .btn,.nxPf .btn,body.org-tienda .btn,#v-pos button,#v-pos select,#v-pos input,.modal.nxPrForm button,.modal.nxPrForm select,.modal.nxPrForm input{font-family:var(--nx-font)}
#v-pos .btn,.modal.nxPrForm .btn,.nxPf .btn,body.org-tienda .btn{border-radius:var(--nx-r-sm);transition:transform 160ms cubic-bezier(.22,1,.36,1),background 160ms ease,border-color 160ms ease,color 160ms ease}
@media(hover:hover){#v-pos .btn:hover,.modal.nxPrForm .btn:hover,.nxPf .btn:hover,body.org-tienda .btn:hover{transform:translateY(-1px)}}
#v-pos .btn:active,.modal.nxPrForm .btn:active,.nxPf .btn:active,body.org-tienda .btn:active{transform:translateY(1px)}
#v-pos [style*="color:#6d28d9"],.modal.nxPrForm [style*="color:#6d28d9"],.nxPf [style*="color:#6d28d9"],
#v-pos [style*="color:#7c3aed"],.modal.nxPrForm [style*="color:#7c3aed"],.nxPf [style*="color:#7c3aed"],
#v-pos [style*="color:#4f46e5"],.modal.nxPrForm [style*="color:#4f46e5"],.nxPf [style*="color:#4f46e5"],
#v-pos [style*="color: #6d28d9"],.modal.nxPrForm [style*="color: #6d28d9"]{color:var(--nx-blue) !important}
#v-pos [style*="background:#6d28d9"],.modal.nxPrForm [style*="background:#6d28d9"],.nxPf [style*="background:#6d28d9"],
#v-pos [style*="background:#7c3aed"],.modal.nxPrForm [style*="background:#7c3aed"],
#v-pos [style*="background:#4f46e5"],.modal.nxPrForm [style*="background:#4f46e5"]{background:var(--nx-blue) !important}
#v-pos [style*="linear-gradient(135deg,#6d28d9,#4f46e5)"],.modal.nxPrForm [style*="linear-gradient(135deg,#6d28d9,#4f46e5)"],
#v-pos [style*="linear-gradient(145deg,#818cf8,#4f46e5)"],.modal.nxPrForm [style*="linear-gradient(145deg,#818cf8,#4f46e5)"]{background:linear-gradient(135deg,var(--nx-blue),var(--nx-blue-d)) !important}
#v-pos [style*="background:#f5f3ff"],.modal.nxPrForm [style*="background:#f5f3ff"],.nxPf [style*="background:#f5f3ff"],
#v-pos [style*="background:#ede9fe"],.modal.nxPrForm [style*="background:#ede9fe"],
#v-pos [style*="background:#eef2ff"],.modal.nxPrForm [style*="background:#eef2ff"],
#v-pos [style*="background:#faf5ff"],.modal.nxPrForm [style*="background:#faf5ff"]{background:var(--nx-blue-l) !important}
#v-pos [style*="#ddd6fe"],.modal.nxPrForm [style*="#ddd6fe"],#v-pos [style*="#ede9fe"],.modal.nxPrForm [style*="#ede9fe"]{border-color:var(--nx-blue-b) !important}
#v-pos .ser,.modal.nxPrForm .ser,.nxPf .ser{color:var(--nx-blue-d)}
#v-pos .nxFP-hero,#v-pos .nxFP-hA{background:linear-gradient(120deg,#1e40af,#1d4ed8 55%,#2563eb)}
#v-pos .nxFP-qico.primary,#v-pos .nxFP-pgBtns button.on{background:var(--nx-blue);border-color:var(--nx-blue);box-shadow:0 4px 12px rgba(37,99,235,.22)}
#v-pos .nxFP-ref,#v-pos .nxFP-emptyIco{background:var(--nx-blue-l);color:var(--nx-blue-d)}
#v-pos .nxFP-gVal.accent,#v-pos .nxFP-menuPop button i,#v-pos .nxFP-tRef,#v-pos .nxFP-cobSideRow.big b{color:var(--nx-blue-d)}
#v-pos .nxFP-cobEvent:before{background:var(--nx-blue)}
#v-pos .nxFP-tAcc button:hover,#v-pos .nxFP-pgBtns button:hover:not(:disabled):not(.on){background:var(--nx-blue-l);color:var(--nx-blue-d);border-color:var(--nx-blue-b)}
#v-pos .nxFP-hAR .nxFP-hAst:nth-child(4) .nxFP-hAsi{background:linear-gradient(140deg,#60a5fa,#2563eb)}
/* Formularios: foco azul sin halo neón; radios medianos. */
#v-pos .fr input,#v-pos .fr select,#v-pos .fr textarea,.modal.nxPrForm .fr input,.modal.nxPrForm .fr select,.modal.nxPrForm .fr textarea{border-radius:var(--nx-r-sm);border-color:#e2e8f0;background:#fff;font-family:var(--nx-font)}
#v-pos .fr input:focus,#v-pos .fr select:focus,#v-pos .fr textarea:focus,.modal.nxPrForm .fr input:focus,.modal.nxPrForm .fr select:focus,.modal.nxPrForm .fr textarea:focus{border-color:var(--nx-blue);box-shadow:0 0 0 3px rgba(37,99,235,.12);background:#fff}
#v-pos .fr label,.modal.nxPrForm .fr label{color:var(--nx-steel);font-family:var(--nx-font)}
/* Barra fija de acción (Cobrar / Guardar compra): la acción principal es azul, no negra. */
body.org-tienda .fbP,#v-pos .fbP,.fbP{background:var(--nx-blue,#2563eb);border-radius:var(--nx-r-md,12px)}
body.org-tienda .fbP:active,#v-pos .fbP:active,.fbP:active{background:var(--nx-blue-d,#1d4ed8)}
.fbC,.fbG{border-radius:var(--nx-r-md,12px)}
/* Pestañas y chips del POS. */
#v-pos .nxPosTab.on{background:var(--nx-blue)}
#v-pos .nxPpkChip,.modal.nxPrForm .nxPpkChip{border-radius:999px}
/* Accesibilidad: foco visible en la línea Nexus. */
#v-pos :focus-visible,.modal.nxPrForm :focus-visible,.nxPf :focus-visible{outline:2px solid var(--nx-blue);outline-offset:2px}
@media (prefers-reduced-motion:reduce){#v-pos .btn,.modal.nxPrForm .btn,.nxPf .btn,body.org-tienda .btn{transition-duration:.01ms !important;transform:none !important}}
`;
    (document.head||document.documentElement).appendChild(linea);

    /* Tipografías de la línea única, solo cuando el POS entra en escena. display=optional:
       si la fuente no está lista en el primer pintado se usa la del sistema y no hay salto. */
    function ensureFonts(){
      if(document.getElementById('nxLineaUnicaFonts'))return;
      var l=document.createElement('link');l.id='nxLineaUnicaFonts';l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=optional';
      (document.head||document.documentElement).appendChild(l);
    }
    try{
      if(document.body&&(document.body.classList.contains('org-tienda')||document.querySelector('#v-pos.on')))ensureFonts();
      ['nxAbrirPOS','nxAbrirMultiempresa'].forEach(function(fn){
        var orig=window[fn];
        if(typeof orig==='function'&&!orig.__nxLineaFonts){
          var w=function(){ensureFonts();return orig.apply(this,arguments)};
          w.__nxLineaFonts=true;window[fn]=w;
        }
      });
    }catch(e){}

    /* nxPfEnsureCSS se crea al abrir el POS. Reinsertar nuestras capas después
       garantiza que la mejora visual conserve prioridad sin tocar su lógica. */
    function priorizar(){
      var base=document.getElementById('nxPfCSS');
      if(base&&style.parentNode&&style.parentNode.lastElementChild!==linea){style.parentNode.appendChild(style);style.parentNode.appendChild(linea);}
    }
    priorizar();
    new MutationObserver(priorizar).observe(document.head||document.documentElement,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();