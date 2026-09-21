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
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();