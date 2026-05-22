// ════════════════════════════════════════════════════════════════
// NEXUS PRO — SISTEMA DE PARCHES
// ════════════════════════════════════════════════════════════════
//
// Este archivo aplica correcciones y mejoras al sistema SIN tocar
// el HTML principal. Se carga al final, por lo que puede sobrescribir
// cualquier función del sistema.
//
// REGLAS DE ORO:
//   1. NUNCA borrar parches viejos sin entender qué hacen
//   2. Cada parche tiene su sección con fecha y descripción
//   3. Después de aplicar un parche, validar que el sistema sigue funcionando
//   4. Si un parche rompe algo, comentarlo (con //) y reportar
//
// PARA APLICAR UN PARCHE:
//   1. Pegar el código del parche en este archivo
//   2. Subir solo parches.js a GitHub (sin tocar index.html)
//   3. Ctrl+Shift+R en el navegador para recargar
//
// ════════════════════════════════════════════════════════════════

(function(){
  'use strict';

  // Esperar a que el sistema esté cargado antes de aplicar parches
  function aplicarParches(){
    console.log('%c⚙ Sistema de parches NEXUS PRO cargado','color:#7c3aed;font-weight:bold');

    // ════════════════════════════════════════════════════════════
    // PARCHES ACTIVOS
    // ════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────
    // PARCHE-001 · 2026-05-22
    // Fix modal cliente cortado en iPhone (botón Guardar no funciona)
    // Causa: barra inferior de Safari iOS tapa el botón.
    // Solución: agregar espacio seguro inferior al modal mCli en móvil.
    // ─────────────────────────────────────────────────────────────
    try {
      // Solo aplica en móviles (no afecta PC)
      if (window.innerWidth <= 640) {
        const css = `
          /* Espacio seguro inferior para que botones no queden tapados */
          #mCli .mb {
            padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important;
            max-height: calc(100vh - 80px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          /* El botón Guardar siempre visible y por encima de la barra de Safari */
          #mCli #btnGCli {
            position: sticky !important;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
            z-index: 10 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,.15) !important;
            margin-top: 16px !important;
          }
        `;
        const style = document.createElement('style');
        style.id = 'patch-001-mcli-mobile';
        style.textContent = css;
        document.head.appendChild(style);
        console.log('  ✓ PARCHE-001 aplicado: Modal cliente fix iPhone');
      }
    } catch(e) {
      console.error('  ✗ PARCHE-001 falló:', e);
    }


    // ── EJEMPLO DE PARCHE (comentado, solo para referencia) ────
    /*
    // PARCHE-001 · 2026-05-22 · Corregir cálculo de prima
    if (typeof window.getTot === 'function') {
      const _getTotOriginal = window.getTot;
      window.getTot = function(c) {
        // Versión corregida aquí
        return _getTotOriginal(c); // o lógica nueva
      };
      console.log('  ✓ PARCHE-001 aplicado: getTot corregido');
    }
    */

    // ════════════════════════════════════════════════════════════
    // FIN DE PARCHES
    // ════════════════════════════════════════════════════════════

    console.log('%c✓ Parches aplicados correctamente','color:#10b981;font-weight:bold');
  }

  // Si el sistema ya cargó, aplicar inmediatamente
  if (document.readyState === 'complete') {
    setTimeout(aplicarParches, 100);
  } else {
    window.addEventListener('load', function(){
      setTimeout(aplicarParches, 100);
    });
  }
})();
