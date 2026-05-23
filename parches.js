/* ═══════════════════════════════════════════════════════════════════════
   PARCHE CLAUDE-001 · 2026-05-22
   FIX BARRA INFERIOR MÓVIL
   
   Este parche se agrega DESPUÉS del código de ChatGPT y arregla los
   botones Dashboard, Clientes, Facturas y Cobros que no respondían.
   
   El problema: el parche de ChatGPT no sabía que tu sistema usa la
   función nav() de NEXUS PRO. Este parche corrige eso.
   ═══════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  function aplicarFixBarraInferiorClaude() {
    const navBar = document.querySelector('.mobile-bottom-nav-nexu');
    if (!navBar) return false;
    if (navBar.dataset.claudeFixed === '1') return true;

    const mapaVistas = {
      'dashboard': 'dashboard',
      'clientes': 'clientes',
      'facturas': 'facturas',
      'cobros': 'cobros'
    };

    // Clonar para quitar TODOS los listeners viejos de ChatGPT
    const navNuevo = navBar.cloneNode(true);
    navBar.parentNode.replaceChild(navNuevo, navBar);
    navNuevo.dataset.claudeFixed = '1';

    navNuevo.addEventListener('click', function(ev) {
      const btn = ev.target.closest('button[data-nav]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();

      // Actualizar estado visual
      navNuevo.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.nav;

      // Botón "Más" → manejado por el código de ChatGPT
      if (target === 'mas') {
        const sheet = document.querySelector('.mobile-more-sheet-nexu');
        if (sheet) sheet.classList.toggle('open');
        return;
      }

      // Cerrar el menú "Más" si estaba abierto
      const sheet = document.querySelector('.mobile-more-sheet-nexu');
      if (sheet) sheet.classList.remove('open');

      // Llamar nav() directamente
      const vista = mapaVistas[target] || target;
      if (typeof window.nav === 'function') {
        window.nav(vista);
        console.log('  → nav("' + vista + '") ejecutado');
      } else {
        console.error('  ✗ Función nav() no encontrada en el sistema');
      }
    }, true); // capture:true para ganarle a otros listeners

    return true;
  }

  // Aplicar inmediatamente y reintentar (la barra se crea después)
  let intentos = 0;
  const intervalo = setInterval(function() {
    intentos++;
    if (aplicarFixBarraInferiorClaude()) {
      console.log('%c✓ PARCHE CLAUDE-001 aplicado: Barra inferior funcional', 'color:#10b981;font-weight:bold');
      clearInterval(intervalo);
    } else if (intentos > 30) {
      console.warn('PARCHE CLAUDE-001: barra inferior no encontrada');
      clearInterval(intervalo);
    }
  }, 500);

  // Reaplica al redimensionar o cambiar de vista (defensa contra ChatGPT
  // que recrea la barra constantemente con su setInterval)
  window.addEventListener('resize', function() {
    setTimeout(aplicarFixBarraInferiorClaude, 200);
  });

})();
