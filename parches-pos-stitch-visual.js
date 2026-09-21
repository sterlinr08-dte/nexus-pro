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

    /* nxPfEnsureCSS se crea al abrir el POS. Reinsertar nuestra capa después
       garantiza que la mejora visual conserve prioridad sin tocar su lógica. */
    function priorizar(){
      var base=document.getElementById('nxPfCSS');
      if(base&&style.parentNode&&style.parentNode.lastElementChild!==style)style.parentNode.appendChild(style);
    }
    priorizar();
    new MutationObserver(priorizar).observe(document.head||document.documentElement,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();