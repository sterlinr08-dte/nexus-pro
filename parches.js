/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BANCOS V63
   Gestión de Bancos en Configuración + control por roles/permisos
   PEGAR AL FINAL DE parches.js

   Cambios:
   - Quita el botón "Gestionar bancos" del modal Registrar Abono.
   - Mantiene el select Banco en Cobros.
   - Agrega acceso a Gestión de Bancos desde Configuración.
   - Solo ADMIN / SUPERADMIN / permiso gestionar_bancos pueden administrar.
   - Mejora responsive móvil del modal bancos.
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NEXUS_BANCOS_CONFIG_V63__) return;
  window.__NEXUS_BANCOS_CONFIG_V63__ = true;

  function getST() {
    try { return (typeof ST !== 'undefined' && ST) ? ST : {}; }
    catch (e) { return {}; }
  }

  function getUser() {
    const st = getST();
    return st.usuario || st.user || st.sessionUser || window.sessionUser || window.user || null;
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function toastSafe(type, title, msg) {
    if (typeof toast === 'function') toast(type, title, msg);
    else alert((title || '') + (msg ? '\n' + msg : ''));
  }

  function tienePermisoBancos() {
    const u = getUser();

    if (!u) {
      // Si el sistema no expone usuario, permitir solo para no bloquear al dueño.
      // Cuando roles estén expuestos, esta función aplicará la restricción.
      return true;
    }

    const rol = norm(u.rol || u.role || u.tipo || u.perfil || u.cargo || '');

    if (
      rol.includes('admin') ||
      rol.includes('superadmin') ||
      rol.includes('super admin') ||
      rol.includes('administrador')
    ) {
      return true;
    }

    const permisos = u.permisos || u.permissions || u.claims?.permisos || [];

    if (Array.isArray(permisos)) {
      return permisos.map(norm).includes('gestionar_bancos');
    }

    if (typeof permisos === 'object' && permisos) {
      return permisos.gestionar_bancos === true || permisos.bancos === true;
    }

    return false;
  }

  function bloquearSiNoTienePermiso() {
    if (tienePermisoBancos()) return false;

    toastSafe(
      'err',
      'Sin permiso',
      'No tienes permiso para gestionar bancos. Contacta al administrador.'
    );

    return true;
  }

  function quitarBotonGestionDeCobros() {
    const btn = document.getElementById('btnGestionarBancos');
    if (btn) btn.remove();
  }

  function abrirGestionBancosConPermiso() {
    if (bloquearSiNoTienePermiso()) return;

    if (typeof window.nxAbrirModalBancos === 'function') {
      window.nxAbrirModalBancos();
      return;
    }

    toastSafe(
      'err',
      'Módulo no disponible',
      'El módulo de bancos no está cargado todavía.'
    );
  }

  function agregarBotonBancosConfig() {
    const posiblesContenedores = [
      '#v-config',
      '#config',
      '[data-view="config"]',
      '#v-sistema',
      '#sistema'
    ];

    let cont = null;

    for (const sel of posiblesContenedores) {
      cont = document.querySelector(sel);
      if (cont) break;
    }

    if (!cont) {
      // Fallback: buscar una vista que contenga texto de configuración.
      cont = Array.from(document.querySelectorAll('.view, section, main, div')).find(el => {
        const txt = norm((el.id || '') + ' ' + (el.className || '') + ' ' + (el.textContent || '').slice(0, 200));
        return txt.includes('config') || txt.includes('sistema') || txt.includes('ajuste');
      });
    }

    if (!cont) return;
    if (document.getElementById('nxBtnConfigBancosV63')) return;

    const card = document.createElement('div');
    card.id = 'nxBtnConfigBancosV63';
    card.className = 'nc p4';
    card.style.marginBottom = '12px';
    card.innerHTML = `
      <div class="ch">
        <div>
          <div class="ct">🏦 Gestión de Bancos</div>
          <div class="ct-s">Agregar, editar, activar o desactivar bancos disponibles para cobros</div>
        </div>
        <button class="btn bxl bc1" type="button" onclick="window.nxAbrirBancosConfigV63()">
          <i class="ti ti-building-bank"></i> Gestionar bancos
        </button>
      </div>
    `;

    const primerCard = cont.querySelector('.nc, .card, .panel');
    if (primerCard && primerCard.parentNode === cont) {
      cont.insertBefore(card, primerCard);
    } else {
      cont.insertAdjacentElement('afterbegin', card);
    }
  }

  function protegerAccionesModalBancos() {
    const modal = document.getElementById('mBancos');
    if (!modal) return;

    const permitido = tienePermisoBancos();

    const botonesAccion = modal.querySelectorAll(
      'button[onclick*="nxAgregarBanco"], button[onclick*="nxEditarBanco"], button[onclick*="nxToggleBanco"], button[onclick*="nxEliminarBanco"]'
    );

    botonesAccion.forEach(btn => {
      if (permitido) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
        return;
      }

      btn.disabled = true;
      btn.style.opacity = '.45';
      btn.style.pointerEvents = 'none';
    });

    let aviso = document.getElementById('nxBancosPermisoAvisoV63');

    if (!permitido && !aviso) {
      aviso = document.createElement('div');
      aviso.id = 'nxBancosPermisoAvisoV63';
      aviso.style.cssText = 'background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:10px;margin:10px 0;font-size:12px;font-weight:800;';
      aviso.textContent = 'No tienes permiso para modificar bancos. Solo puedes visualizarlos.';
      const lista = document.getElementById('nxListaBancos');
      if (lista && lista.parentNode) lista.parentNode.insertBefore(aviso, lista);
    }

    if (permitido && aviso) aviso.remove();
  }

  function wrapFuncionesBancosConPermiso() {
    const wrappers = [
      'nxAgregarBancoDesdeUI',
      'nxEditarBanco',
      'nxToggleBanco',
      'nxEliminarBanco'
    ];

    wrappers.forEach(nombre => {
      const fn = window[nombre];
      if (typeof fn !== 'function') return;
      if (fn.__v63PermisoWrapped) return;

      const original = fn;

      const wrapped = function () {
        if (bloquearSiNoTienePermiso()) return;
        return original.apply(this, arguments);
      };

      wrapped.__v63PermisoWrapped = true;
      window[nombre] = wrapped;
    });
  }

  function injectCSS() {
    if (document.getElementById('nx-bancos-config-v63-css')) return;

    const style = document.createElement('style');
    style.id = 'nx-bancos-config-v63-css';
    style.textContent = `
      /* V63: ocultar botón bancos en cobros si algún parche viejo lo vuelve a insertar */
      #mAbono #btnGestionarBancos {
        display: none !important;
      }

      @media (max-width: 768px) {
        #nxBtnConfigBancosV63 {
          border-radius: 18px !important;
          overflow: hidden !important;
        }

        #nxBtnConfigBancosV63 .ch {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        #nxBtnConfigBancosV63 .btn {
          width: 100% !important;
          min-height: 48px !important;
          justify-content: center !important;
        }

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

        body:has(#mBancos.open) .mobile-bottom-nav-clean,
        body:has(#mBancos.open) .mobile-more-sheet-clean,
        body:has(#mBancos.on) .mobile-bottom-nav-clean,
        body:has(#mBancos.on) .mobile-more-sheet-clean {
          display: none !important;
        }

        #nxListaBancos {
          padding-bottom: 24px !important;
        }

        #nxListaBancos > div {
          display: grid !important;
          gap: 10px !important;
        }

        #nxListaBancos > div > div {
          display: grid !important;
          grid-template-columns: 1fr !important;
          align-items: stretch !important;
          gap: 10px !important;
          padding: 14px !important;
          border-radius: 16px !important;
          overflow: hidden !important;
        }

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

        #nxListaBancos > div > div > div:last-child {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          gap: 6px !important;
          width: 100% !important;
          justify-content: stretch !important;
          align-items: stretch !important;
        }

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

  window.nxAbrirBancosConfigV63 = abrirGestionBancosConPermiso;

  function init() {
    injectCSS();
    quitarBotonGestionDeCobros();
    agregarBotonBancosConfig();
    wrapFuncionesBancosConPermiso();
    protegerAccionesModalBancos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('click', function () {
    setTimeout(function () {
      quitarBotonGestionDeCobros();
      agregarBotonBancosConfig();
      wrapFuncionesBancosConPermiso();
      protegerAccionesModalBancos();
    }, 150);
  }, true);

  const obs = new MutationObserver(function () {
    setTimeout(function () {
      quitarBotonGestionDeCobros();
      agregarBotonBancosConfig();
      protegerAccionesModalBancos();
    }, 120);
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });
})();