/* ═══════════════════════════════════════════════════════════════════════
   NEXUS PRO - PARCHES MÓVIL (versión limpia)
   ═══════════════════════════════════════════════════════════════════════
   
   Reemplaza el código anterior. Versión depurada que:
   - NO toca el body ni los elementos con clase "card"
   - SOLO afecta cosas específicas de móvil
   - Arregla el modal de cliente para iPhone
   - Mantiene la barra inferior móvil
   - Usa nav() de NEXUS PRO directamente
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__nexusMobilePatch) return;
  window.__nexusMobilePatch = true;

  const MOBILE_MAX = 768;
  const isMobile = () => window.innerWidth <= MOBILE_MAX;

  // ═══════════════════════════════════════════════════════════
  // 1. CSS - solo lo esencial, sin afectar modales ni cards
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if (document.getElementById('nexus-mobile-clean-css')) return;
    
    const style = document.createElement('style');
    style.id = 'nexus-mobile-clean-css';
    style.textContent = `
      /* SOLO EN MÓVIL */
      @media (max-width: 768px) {
        
        /* Barra inferior */
        .mobile-bottom-nav-clean {
          position: fixed !important;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 9000;
          height: 64px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 4px;
          padding: 6px;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 12px 35px rgba(15,23,42,.18);
        }
        
        .mobile-bottom-nav-clean button {
          border: 0;
          background: transparent;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          border-radius: 14px;
          cursor: pointer;
          touch-action: manipulation;
          overflow: visible !important;
          min-width: 0;
        }
        
        .mobile-bottom-nav-clean button span {
          white-space: nowrap;
          overflow: visible;
          color: inherit !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        .mobile-bottom-nav-clean button.active {
          background: #eff6ff;
          color: #2563eb;
        }
        
        .mobile-bottom-nav-clean .ico { font-size: 20px; }
        
        /* Sheet "Más" */
        .mobile-more-sheet-clean {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: 88px;
          z-index: 9001;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(15,23,42,.22);
          padding: 12px;
          display: none;
        }
        
        .mobile-more-sheet-clean.open { display: block; }
        
        .mobile-more-sheet-clean h3 {
          margin: 4px 6px 10px;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 700;
          letter-spacing: .5px;
        }
        
        .mobile-more-sheet-clean button {
          width: 100%;
          border: 0;
          background: transparent;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          text-align: left;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          touch-action: manipulation;
        }
        
        .mobile-more-sheet-clean button:active {
          background: #f1f5f9;
        }
        
        .mobile-more-sheet-clean button + button {
          border-top: 1px solid #eef2f7;
        }
        
        .mobile-more-sheet-clean .icon {
          width: 36px;
          height: 36px;
          background: #eff6ff;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 18px;
        }
        
        /* ═══ FIX MODAL CLIENTE ═══ */
        /* El modal mCli con scroll completo y botón Guardar visible */
        #mCli .modal {
          max-height: 90vh !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          padding-bottom: 24px !important;
        }
        
        /* Z-index del modal por encima de todo */
        .overlay.on {
          z-index: 10000 !important;
        }
        
        /* Cuando hay overlay abierto, ocultar barra inferior */
        body:has(.overlay.on) .mobile-bottom-nav-clean,
        body:has(.overlay.on) .mobile-more-sheet-clean {
          display: none !important;
        }
        
        /* ═══ FIX MENÚ DE ACCIONES (⋮) ═══ */
        /* El menú de 3 puntos del cliente DEBE estar por encima de TODO,
           incluido el modal de editar/cliente. */
        .acc-menu {
          z-index: 2147483647 !important;
          position: fixed !important;
          pointer-events: auto !important;
        }
        
        /* El backdrop SIEMPRE detrás del menú */
        .acc-backdrop {
          z-index: 2147483646 !important;
          pointer-events: auto !important;
        }
        
        /* Cuando el menú esté abierto (display:block) por estilo inline,
           asegurar visibilidad total */
        .acc-menu[style*="display: block"],
        .acc-menu[style*="display:block"] {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════
  // 2. NAVEGACIÓN - usa nav() de NEXUS PRO directamente
  // ═══════════════════════════════════════════════════════════
  function navegar(vista) {
    // Caso especial: Clientes en proceso
    if (vista === 'proceso') {
      if (typeof window.nav === 'function') {
        try {
          window.nav('clientes');
          setTimeout(function() {
            if (typeof window.switchCliTab === 'function') {
              window.switchCliTab('proceso');
            }
          }, 250);
          console.log('nav("clientes") → switchCliTab("proceso") ✓');
          return true;
        } catch(e) {
          console.error('proceso falló:', e);
        }
      }
      return false;
    }
    
    const mapa = {
      'dashboard': 'dashboard',
      'clientes': 'clientes',
      'facturas': 'facturas',
      'cobros': 'cobros',
      'sistema': 'config',
      'usuarios': 'usuarios',
      'reportes': 'rep-agente',
      'auditoria': 'auditoria'
    };
    
    const v = mapa[vista] || vista;
    
    if (typeof window.nav === 'function') {
      try {
        window.nav(v);
        console.log('nav("' + v + '") ✓');
        return true;
      } catch(e) {
        console.error('nav() falló:', e);
      }
    } else {
      console.error('nav() no existe');
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════
  // 3. BARRA INFERIOR
  // ═══════════════════════════════════════════════════════════
  function crearBarraInferior() {
    if (!isMobile()) return;
    if (document.querySelector('.mobile-bottom-nav-clean')) return;

    // Quitar las viejas de ChatGPT si existen
    document.querySelectorAll('.mobile-bottom-nav-nexu, .mobile-bottom-nav-v3, .mobile-bottom-nav-v31').forEach(el => el.remove());
    document.querySelectorAll('.mobile-more-sheet-nexu, .mobile-more-sheet-v3, .mobile-more-sheet-v31').forEach(el => el.remove());

    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav-clean';
    nav.innerHTML = `
      <button type="button" data-go="dashboard" class="active">
        <span class="ico">🏠</span>
        <span>Inicio</span>
      </button>
      <button type="button" data-go="clientes">
        <span class="ico">👥</span>
        <span>Clientes</span>
      </button>
      <button type="button" data-go="facturas">
        <span class="ico">📄</span>
        <span>Facturas</span>
      </button>
      <button type="button" data-go="cobros">
        <span class="ico">💰</span>
        <span>Cobros</span>
      </button>
      <button type="button" data-go="mas">
        <span class="ico">⋯</span>
        <span>Más</span>
      </button>
    `;
    document.body.appendChild(nav);

    nav.addEventListener('click', function(ev) {
      const btn = ev.target.closest('button[data-go]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();

      const target = btn.dataset.go;
      
      // Estado activo
      nav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (target === 'mas') {
        const sheet = document.querySelector('.mobile-more-sheet-clean');
        if (sheet) sheet.classList.toggle('open');
        return;
      }

      // Cerrar el sheet si estaba abierto
      const sheet = document.querySelector('.mobile-more-sheet-clean');
      if (sheet) sheet.classList.remove('open');

      navegar(target);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 4. MENÚ "MÁS"
  // ═══════════════════════════════════════════════════════════
  function crearMenuMas() {
    if (!isMobile()) return;
    if (document.querySelector('.mobile-more-sheet-clean')) return;

    const sheet = document.createElement('div');
    sheet.className = 'mobile-more-sheet-clean';
    sheet.innerHTML = `
      <h3>MÁS OPCIONES</h3>
      <button type="button" data-go="proceso">
        <span class="icon">📋</span>
        <span><b>Clientes en proceso</b></span>
      </button>
      <button type="button" data-go="sistema">
        <span class="icon">⚙️</span>
        <span><b>Configuración</b></span>
      </button>
      <button type="button" data-go="usuarios">
        <span class="icon">👤</span>
        <span><b>Usuarios</b></span>
      </button>
      <button type="button" data-go="reportes">
        <span class="icon">📊</span>
        <span><b>Reportes</b></span>
      </button>
    `;
    document.body.appendChild(sheet);

    sheet.addEventListener('click', function(ev) {
      const btn = ev.target.closest('button[data-go]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      sheet.classList.remove('open');
      navegar(btn.dataset.go);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 5. INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════
  function init() {
    injectCSS();
    if (!isMobile()) return;
    crearBarraInferior();
    crearMenuMas();
    console.log('%c⚙ Parches NEXUS PRO Móvil cargado', 'color:#2563eb;font-weight:bold');
  }

  // ═══════════════════════════════════════════════════════════
  // 6. FIX MENÚ ⋮ (acc-menu) - sobrescribe la función original
  // ═══════════════════════════════════════════════════════════
  function fixToggleAccMenu() {
    if (typeof window.toggleAccMenu !== 'function') {
      // Aún no se cargó, reintentar
      setTimeout(fixToggleAccMenu, 500);
      return;
    }
    
    if (window.__accMenuFixed) return;
    window.__accMenuFixed = true;
    
    const original = window.toggleAccMenu;
    
    window.toggleAccMenu = function(ev, cid) {
      ev.stopPropagation();
      const menu = document.getElementById('accMenu_' + cid);
      if (!menu) return;
      
      const estaAbierto = menu.style.display === 'block';
      
      // Cerrar otros menús
      if (typeof window.cerrarAccMenus === 'function') {
        window.cerrarAccMenus();
      }
      document.querySelectorAll('.acc-backdrop').forEach(b => b.remove());
      
      if (estaAbierto) return;
      
      const esMovil = window.innerWidth <= 768;
      
      // Limpiar estilos previos
      menu.style.cssText = '';
      menu.style.display = 'block';
      menu.style.position = 'fixed';
      menu.style.zIndex = '2147483647'; // MÁXIMO z-index posible
      
      if (esMovil) {
        // Móvil: hoja flotante grande, centrada
        menu.style.left = '16px';
        menu.style.right = '16px';
        menu.style.bottom = '20px';
        menu.style.top = 'auto';
        menu.style.maxHeight = '70vh';
        menu.style.overflowY = 'auto';
        menu.style.webkitOverflowScrolling = 'touch';
        menu.style.borderRadius = '20px';
        menu.style.boxShadow = '0 20px 60px rgba(15,23,42,.3)';
        menu.style.background = '#ffffff';
        menu.style.padding = '8px';
        
        // Crear backdrop CON z-index MENOR que el menú
        const bd = document.createElement('div');
        bd.className = 'acc-backdrop';
        bd.style.position = 'fixed';
        bd.style.inset = '0';
        bd.style.background = 'rgba(15,23,42,.4)';
        bd.style.zIndex = '2147483646'; // MÁXIMO - 1 (debajo del menú)
        bd.onclick = () => {
          if (typeof window.cerrarAccMenus === 'function') {
            window.cerrarAccMenus();
          }
        };
        document.body.appendChild(bd);
      } else {
        // PC: menú junto al botón
        const btn = ev.currentTarget.getBoundingClientRect();
        menu.style.top = (btn.bottom + 6) + 'px';
        const ancho = menu.offsetWidth || 230;
        let left = btn.right - ancho;
        if (left < 8) left = 8;
        menu.style.left = left + 'px';
        menu.style.right = 'auto';
        if (btn.bottom + menu.offsetHeight > window.innerHeight - 10) {
          menu.style.top = (btn.top - menu.offsetHeight - 6) + 'px';
        }
      }
    };
    
    console.log('%c✓ toggleAccMenu sobrescrito', 'color:#10b981;font-weight:bold');
  }

  // Aplicar al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('DOMContentLoaded', fixToggleAccMenu);
  } else {
    init();
    fixToggleAccMenu();
  }

  // Reaplica al cambiar tamaño (rotar pantalla)
  window.addEventListener('resize', function() {
    setTimeout(init, 200);
  });

})();
