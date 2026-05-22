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
    // PARCHE-001 · 2026-05-22 · v2
    // Fix modal cliente cortado en iPhone (botón Guardar no funciona)
    // Causa: barra inferior de Safari iOS tapa el botón.
    // Solución: CSS con @media query (siempre activo en móvil).
    // ─────────────────────────────────────────────────────────────
    try {
      const css = `
        @media (max-width: 640px) {
          /* El modal de cliente con scroll y espacio para el botón */
          #mCli .mb {
            padding-bottom: 120px !important;
            padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px)) !important;
            max-height: calc(100vh - 60px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          /* El botón Guardar visible y por encima de la barra de Safari */
          #mCli #btnGCli {
            position: -webkit-sticky !important;
            position: sticky !important;
            bottom: 16px !important;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
            z-index: 100 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,.2) !important;
            margin-top: 20px !important;
            background: var(--c1, #2563eb) !important;
          }
          /* Asegurar que el overlay/modal no tape el botón */
          #mCli {
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
          }
        }
      `;
      // Quitar versión vieja si existe
      const viejo = document.getElementById('patch-001-mcli-mobile');
      if (viejo) viejo.remove();
      const style = document.createElement('style');
      style.id = 'patch-001-mcli-mobile';
      style.textContent = css;
      document.head.appendChild(style);
      console.log('  ✓ PARCHE-001 v2 aplicado: Modal cliente fix iPhone');
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
