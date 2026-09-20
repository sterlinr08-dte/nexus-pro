/* NEXUS PRO · Ajuste global de contenido móvil · 2026-09-20
   Corrige el recorte de formularios, modales y tablas en iPhone
   cuando el sidebar-rail de 76px está visible.

   Problemas resueltos:
   1. Modales (.overlay) z-index < sidebar rail → contenido tapado a la izquierda
   2. Tablas con min-width:600px desbordan el ancho disponible
   3. Contenido genérico recortado por overflow-x:hidden

   No toca DOM, lógica, scroll vertical, envío, pagos ni Realtime.
   Reversible: eliminar de parches-seguros.js para deshacer. */
(function(){
  'use strict';
  if(window.__nxContenidoMovilAjuste20260920)return;
  window.__nxContenidoMovilAjuste20260920=true;

  function mount(){
    if(document.getElementById('nxContenidoMovilAjusteCss'))return;
    var s=document.createElement('style');
    s.id='nxContenidoMovilAjusteCss';
    s.textContent=`
@media(max-width:768px){

  /* ── MODALES ──
     El sidebar-rail tiene z-index:10700. Los modales (.overlay) tienen z-index:100.
     El rail se pinta ENCIMA del modal y tapa el contenido por la izquierda.
     Fix: el overlay abierto sube por encima del rail pero debajo del
     mobOverlay (10699) para no romper el drawer. */
  .overlay.open{
    z-index:10701 !important;
    padding-left:calc(8px + env(safe-area-inset-left,0px)) !important;
    padding-right:calc(8px + env(safe-area-inset-right,0px)) !important
  }

  /* El modal dentro usa todo el ancho disponible sin desbordar */
  .overlay.open .modal{
    max-width:100% !important;
    width:100% !important;
    box-sizing:border-box !important;
    overflow-x:auto !important
  }

  /* ── TABLAS ──
     table{min-width:600px} (index.html) fuerza tablas más anchas que
     el viewport menos el rail. Reducimos el min-width para que sea
     scrollable dentro de .tw sin crear un desborde invisible. */
  .tw{
    overflow-x:auto !important;
    -webkit-overflow-scrolling:touch !important;
    max-width:100% !important
  }
  table{
    min-width:420px !important;
    width:100% !important;
    table-layout:auto !important
  }

  /* Tablas que no están dentro de .tw — envolverlas visualmente */
  .content > table,
  .content > div > table{
    display:block !important;
    overflow-x:auto !important;
    -webkit-overflow-scrolling:touch !important
  }

  /* ── CONTENIDO PRINCIPAL ──
     .content tiene overflow-x:hidden que recorta contenido silenciosamente.
     En móvil permitimos scroll horizontal controlado para que nada se pierda. */
  .content{
    overflow-x:auto !important;
    max-width:100% !important
  }

  /* Formularios genéricos: asegurar que no desborden */
  .gf2,.frow,.fr{
    max-width:100% !important;
    box-sizing:border-box !important
  }
  .fr input,.fr select,.fr textarea{
    max-width:100% !important;
    box-sizing:border-box !important
  }

  /* Cards y contenedores comunes */
  .nc,.card{
    max-width:100% !important;
    box-sizing:border-box !important;
    overflow-x:auto !important
  }

  /* Grids que podrían desbordar */
  .g2,.g3,.g4,.gf2{
    max-width:100% !important;
    overflow-x:visible !important
  }
}

@media(max-width:480px){
  /* Tablas en pantallas más pequeñas: aún más compactas */
  table{
    min-width:340px !important;
    font-size:9px !important
  }
  thead th{padding:4px 6px !important;font-size:7.5px !important}
  tbody td{padding:4px 6px !important}
}
`;
    (document.head||document.documentElement).appendChild(s);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
