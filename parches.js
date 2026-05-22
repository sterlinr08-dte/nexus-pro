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
    // (vacío por ahora - los parches se irán agregando aquí abajo)


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
