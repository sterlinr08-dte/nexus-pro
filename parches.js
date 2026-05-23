/* ==========================================================================
   NEXU PRO - PARCHE LIMPIO v4.0
   MODO MÓVIL COMO PC / ROLLBACK DEL LOOK APP

   Objetivo:
   - Quitar barra inferior móvil agregada por parches anteriores.
   - Quitar menú "Más" móvil agregado por parches anteriores.
   - Quitar paneles flotantes artificiales.
   - Restaurar comportamiento original del sistema como funciona en PC.
   - Mantener solo ajustes mínimos para que en móvil no se rompa el ancho.
   - No tocar base de datos.
   - No modificar lógica original del master.
   ========================================================================== */

(function () {
  "use strict";

  const PATCH_ID = "nexu-pro-mobile-as-desktop-v4";
  const MOBILE_MAX = 768;

  if (window[PATCH_ID]) return;
  window[PATCH_ID] = true;

  const isMobile = () => window.innerWidth <= MOBILE_MAX;

  function qa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function q(sel, root = document) {
    return root.querySelector(sel);
  }

  function removeMobileAppPatchElements() {
    const selectors = [
      ".mobile-bottom-nav-v3",
      ".mobile-more-sheet-v3",
      ".mobile-bottom-nav-v31",
      ".mobile-more-sheet-v31",
      ".mobile-bottom-nav-nexu",
      ".mobile-more-sheet-nexu",
      ".mobile-view-nexu",
      ".mobile-fab-v3",
      ".nexu-action-panel-v34",
      ".nexu-action-panel-v35"
    ];

    qa(selectors.join(",")).forEach(el => {
      try {
        el.remove();
      } catch (e) {
        el.style.display = "none";
        el.style.pointerEvents = "none";
      }
    });
  }

  function removeOldPatchStyles() {
    const ids = [
      "nexu-mobile-app-v3-css",
      "nexu-mobile-fix-v31-css",
      "nexu-mobile-completo-css",
      "nexu-mobile-v32-css",
      "nexu-mobile-v33-css",
      "nexu-action-menu-v34-css",
      "nexu-action-panel-v35-css"
    ];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function injectCleanMobileCSS() {
    if (document.getElementById("nexu-mobile-as-desktop-v4-css")) return;

    const style = document.createElement("style");
    style.id = "nexu-mobile-as-desktop-v4-css";
    style.textContent = `
      @media (max-width: ${MOBILE_MAX}px) {
        html, body {
          max-width: 100% !important;
          overflow-x: hidden !important;
          -webkit-tap-highlight-color: transparent;
        }

        body {
          padding-bottom: 0 !important;
        }

        /* Elimina cualquier navegación inferior creada por parches anteriores */
        .mobile-bottom-nav-v3,
        .mobile-more-sheet-v3,
        .mobile-bottom-nav-v31,
        .mobile-more-sheet-v31,
        .mobile-bottom-nav-nexu,
        .mobile-more-sheet-nexu,
        .mobile-view-nexu,
        .mobile-fab-v3 {
          display: none !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }

        /* Restaurar comportamiento natural de modales, dropdowns y menús */
        .modal,
        .modal-content,
        .dialog,
        .popup,
        [class*="modal"],
        [class*="dialog"],
        [class*="popup"],
        .acc-menu,
        .actions-menu,
        .dropdown-menu,
        .client-actions-menu,
        [class*="acciones"],
        [class*="action-menu"],
        [class*="dropdown"] {
          pointer-events: auto !important;
          opacity: 1 !important;
          visibility: visible !important;
          filter: none !important;
          -webkit-filter: none !important;
        }

        button,
        a,
        [role="button"],
        [onclick],
        input,
        select,
        textarea {
          touch-action: manipulation !important;
          pointer-events: auto;
        }

        /* Tablas y grids: igual lógica de PC, pero con scroll horizontal */
        table {
          min-width: 720px;
        }

        .table-wrap,
        .table-container,
        .responsive-table,
        [class*="table"] {
          max-width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        /* Evita que las tarjetas se salgan del ancho sin cambiar su lógica */
        .app,
        .main,
        main,
        .content,
        .page,
        .section,
        .container,
        [class*="content"],
        [class*="section"] {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function restoreElementsFromOldPatch() {
    qa("[aria-hidden='true']").forEach(el => {
      const cls = String(el.className || "");
      if (
        cls.includes("mobile-bottom-nav") ||
        cls.includes("mobile-more-sheet") ||
        cls.includes("mobile-view")
      ) return;

      // No forzamos todos los aria-hidden, solo evitamos dejar bloqueos heredados por accidente.
      if (
        cls.includes("modal") ||
        cls.includes("dropdown") ||
        cls.includes("acciones") ||
        cls.includes("action")
      ) {
        el.removeAttribute("aria-hidden");
      }
    });

    qa(".nexu-hidden-for-layer, .is-blocked").forEach(el => {
      el.classList.remove("nexu-hidden-for-layer");
      el.classList.remove("is-blocked");
      el.style.display = "";
      el.style.pointerEvents = "";
      el.style.opacity = "";
      el.style.zIndex = "";
    });

    qa(".nexu-overlay-clean").forEach(el => {
      el.classList.remove("nexu-overlay-clean");
      el.style.pointerEvents = "";
    });

    qa(".nexu-action-panel-fixed, .nexu-action-panel-v34, .nexu-action-panel-v35").forEach(el => {
      el.classList.remove("nexu-action-panel-fixed");
      el.classList.remove("nexu-action-panel-v34");
      el.classList.remove("nexu-action-panel-v35");

      el.style.position = "";
      el.style.left = "";
      el.style.top = "";
      el.style.bottom = "";
      el.style.transform = "";
      el.style.width = "";
      el.style.maxHeight = "";
      el.style.overflowY = "";
      el.style.zIndex = "";
      el.style.opacity = "";
      el.style.visibility = "";
      el.style.pointerEvents = "";
      el.style.filter = "";
      el.style.backdropFilter = "";
      el.style.webkitBackdropFilter = "";
      el.style.background = "";
      el.style.borderRadius = "";
      el.style.boxShadow = "";
      el.style.touchAction = "";
    });
  }

  function suppressLoginRefreshToast() {
    try {
      if (window.__NEXU_LOGIN_TOAST_PATCH_V4__) return;
      window.__NEXU_LOGIN_TOAST_PATCH_V4__ = true;

      const originalAlert = window.alert;

      window.alert = function (msg) {
        const txt = String(msg || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const nav = performance && performance.getEntriesByType
          ? performance.getEntriesByType("navigation")[0]
          : null;

        const reloaded = nav && nav.type === "reload";

        if (reloaded && txt.includes("inicio") && txt.includes("sesion")) {
          return;
        }

        return originalAlert.apply(window, arguments);
      };
    } catch (e) {}
  }

  function addChangelog() {
    try {
      const key = "nexu_patch_changelog";
      const list = JSON.parse(localStorage.getItem(key) || "[]");

      if (list.some(x => x.id === PATCH_ID)) return;

      list.unshift({
        id: PATCH_ID,
        version: "v4.0",
        fecha: new Date().toISOString(),
        titulo: "Móvil funcionando como PC",
        cambios: [
          "Se retiró la barra inferior móvil tipo app.",
          "Se retiró el menú Más móvil agregado por parches anteriores.",
          "Se restauró el comportamiento original de botones, modales y acciones.",
          "La web móvil queda funcionando con la lógica original de PC.",
          "Se mantiene solo ajuste de ancho y scroll para pantallas pequeñas."
        ]
      });

      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }

  function init() {
    removeMobileAppPatchElements();
    removeOldPatchStyles();
    injectCleanMobileCSS();
    restoreElementsFromOldPatch();
    suppressLoginRefreshToast();
    addChangelog();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("resize", init);

  document.addEventListener("click", () => {
    setTimeout(init, 80);
  }, true);

  document.addEventListener("touchend", () => {
    setTimeout(init, 80);
  }, true);

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    init();
    if (tries > 40) clearInterval(timer);
  }, 500);
})();
