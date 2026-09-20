/* NEXUS PRO · Ajuste global de contenido móvil · 2026-09-20
   Corrige el recorte de formularios, modales y tablas en iPhone
   cuando el sidebar-rail de 76px está visible.

   Problemas resueltos:
   1. Todos los paneles fullscreen (.overlay, .mbbOv, .nbfOv, .swal-overlay,
      .acc-backdrop, .cs-overlay) quedan debajo del sidebar rail (z-index 10700)
      → contenido tapado a la izquierda. Fix: subirlos a 10701+.
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

  /* ── PANELES FULLSCREEN: POR ENCIMA Y DESPUÉS DEL SIDEBAR RAIL ──
     El sidebar-rail ocupa left:0 con width:var(--nx-rail,76px) y z-index:10700.
     Subir z-index no es suficiente: los paneles que usan left:0/inset:0 tienen
     su contenido físicamente detrás del rail. Solución: mover el borde izquierdo
     de TODOS los paneles al final del rail para que nada quede tapado. */

  .overlay.open{
    z-index:10701 !important;
    left:var(--nx-rail,76px) !important;
    padding-left:calc(8px + env(safe-area-inset-left,0px)) !important;
    padding-right:calc(8px + env(safe-area-inset-right,0px)) !important
  }

  .mbbOv{
    z-index:10701 !important;
    left:var(--nx-rail,76px) !important
  }
  .nbfOv{
    z-index:10701 !important;
    left:var(--nx-rail,76px) !important
  }
  .swal-overlay{
    z-index:10701 !important;
    left:var(--nx-rail,76px) !important
  }
  .acc-backdrop{
    z-index:10701 !important;
    left:var(--nx-rail,76px) !important
  }
  .cs-overlay{
    z-index:10701 !important;
    left:var(--nx-rail,76px) !important
  }
  .cs-panel{
    z-index:10702 !important;
    left:var(--nx-rail,76px) !important;
    width:calc(100vw - var(--nx-rail,76px)) !important
  }
  .cs-panel.open{
    transform:translateY(0) !important
  }
  .nfcPanel{
    z-index:10702 !important
  }

  /* El modal dentro usa todo el ancho disponible sin desbordar */
  .overlay.open .modal{
    max-width:100% !important;
    width:100% !important;
    box-sizing:border-box !important;
    overflow-x:auto !important
  }

  /* Modales dentro de .mbbOv y .nbfOv */
  .mbbOv > div,
  .nbfOv > div{
    max-width:100% !important;
    box-sizing:border-box !important
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
