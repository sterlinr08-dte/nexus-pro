/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - HOTFIX V62
   Gestión de Bancos móvil:
   - Corrige botones encimados en iPhone.
   - Hace el modal de bancos más usable.
   - Oculta barra inferior mientras mBancos está abierto.
   - Agrega espacio inferior para que Safari no tape contenido.
   PEGAR AL FINAL DE parches.js
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NEXUS_BANCOS_MOBILE_FIX_V62__) return;
  window.__NEXUS_BANCOS_MOBILE_FIX_V62__ = true;

  function injectBancoMobileFixCSS() {
    if (document.getElementById('nexus-bancos-mobile-fix-v62')) return;

    const style = document.createElement('style');
    style.id = 'nexus-bancos-mobile-fix-v62';
    style.textContent = `
      @media (max-width: 768px) {
        /* Modal de bancos por encima de la barra móvil */
        #mBancos.overlay,
        #mBancos.overlay.open,
        #mBancos.overlay.on {
          z-index: 12000 !important;
        }

        #mBancos .modal {
          width: calc(100vw - 24px) !important;
          max-width: calc(100vw - 24px) !important;
          max-height: 84vh !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          padding-bottom: 120px !important;
          box-sizing: border-box !important;
        }

        /* Ocultar barra inferior cuando el modal de bancos esté abierto */
        body:has(#mBancos.open) .mobile-bottom-nav-clean,
        body:has(#mBancos.open) .mobile-more-sheet-clean,
        body:has(#mBancos.on) .mobile-bottom-nav-clean,
        body:has(#mBancos.on) .mobile-more-sheet-clean {
          display: none !important;
        }

        /* Lista de bancos en móvil */
        #nxListaBancos {
          padding-bottom: 24px !important;
        }

        #nxListaBancos > div {
          display: grid !important;
          gap: 10px !important;
        }

        /* Cada banco en formato vertical limpio */
        #nxListaBancos > div > div {
          display: grid !important;
          grid-template-columns: 1fr !important;
          align-items: stretch !important;
          gap: 10px !important;
          padding: 14px !important;
          border-radius: 16px !important;
          overflow: hidden !important;
        }

        /* Nombre + estado */
        #nxListaBancos > div > div > div:first-child {
          min-width: 0 !important;
          width: 100% !important;
        }

        #nxListaBancos > div > div > div:first-child > div:first-child {
          font-size: 16px !important;
          line-height: 1.2 !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
        }

        /* Contenedor de botones */
        #nxListaBancos > div > div > div:last-child {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          gap: 6px !important;
          width: 100% !important;
          justify-content: stretch !important;
          align-items: stretch !important;
        }

        /* Botones */
        #nxListaBancos button {
          width: 100% !important;
          min-width: 0 !important;
          height: 44px !important;
          padding: 6px 4px !important;
          border-radius: 12px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 3px !important;
          font-size: 10px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          box-sizing: border-box !important;
        }

        #nxListaBancos button i {
          font-size: 16px !important;
          flex: 0 0 auto !important;
        }

        /* Campo agregar banco */
        #mBancos .gf2 {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        #mBancos #nxBancoNombre {
          width: 100% !important;
          min-height: 44px !important;
          font-size: 16px !important;
        }

        #mBancos .gf2 .btn {
          width: 100% !important;
          min-height: 48px !important;
          justify-content: center !important;
        }

        #mBancos .fe {
          position: sticky !important;
          bottom: 0 !important;
          background: rgba(255,255,255,.96) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          padding-top: 10px !important;
          padding-bottom: 10px !important;
          z-index: 5 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function observeBancosModal() {
    const modal = document.getElementById('mBancos');
    if (!modal || modal.__nxBancoMobileFixV62) return;

    modal.__nxBancoMobileFixV62 = true;

    const obs = new MutationObserver(function () {
      if (modal.classList.contains('open') || modal.classList.contains('on')) {
        document.body.classList.add('nx-bancos-modal-open');
      } else {
        document.body.classList.remove('nx-bancos-modal-open');
      }
    });

    obs.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  function init() {
    injectBancoMobileFixCSS();
    observeBancosModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('click', function () {
    setTimeout(observeBancosModal, 120);
  }, true);
})();