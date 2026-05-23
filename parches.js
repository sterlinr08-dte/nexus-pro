==========================================================================
   NEXU PRO - PARCHE v4.1 ACCIONES COMO PC EN MÓVIL
   Objetivo:
   - El menú de acciones de Clientes funciona en móvil igual que en PC.
   - Elimina hoja inferior, backdrop/capa gris y opacidad.
   - No agrega barra inferior ni look app.
   - Solo corrige el menú de acciones y limpia restos de parches anteriores.
   ========================================================================== */

(function () {
  "use strict";

  if (window.__NEXU_ACCIONES_COMO_PC_V41__) return;
  window.__NEXU_ACCIONES_COMO_PC_V41__ = true;

  const MOBILE_MAX = 768;

  function qa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function isMobile() {
    return window.innerWidth <= MOBILE_MAX;
  }

  function removeAppPatchUI() {
    qa([
      ".mobile-bottom-nav-v3",
      ".mobile-more-sheet-v3",
      ".mobile-bottom-nav-v31",
      ".mobile-more-sheet-v31",
      ".mobile-bottom-nav-nexu",
      ".mobile-more-sheet-nexu",
      ".mobile-view-nexu",
      ".mobile-fab-v3"
    ].join(",")).forEach(el => {
      try { el.remove(); } catch (e) { el.style.display = "none"; }
    });
  }

  function cleanActionBackdrops() {
    qa(".acc-backdrop, .dropdown-backdrop, .modal-backdrop").forEach(el => {
      try { el.remove(); } catch (e) { el.style.display = "none"; }
    });
  }

  function closeActionMenus() {
    qa(".acc-menu").forEach(menu => {
      menu.style.display = "none";
      menu.classList.remove("nexu-acc-open-v41");
    });
    cleanActionBackdrops();
  }

  function placeMenuBesideButton(menu, button) {
    const btn = button.getBoundingClientRect();

    menu.style.cssText = "";
    menu.style.display = "block";
    menu.style.position = "fixed";
    menu.style.zIndex = "2147483000";
    menu.style.pointerEvents = "auto";
    menu.style.opacity = "1";
    menu.style.visibility = "visible";
    menu.style.filter = "none";
    menu.style.webkitFilter = "none";
    menu.style.background = "#ffffff";
    menu.style.border = "1px solid #e8edf3";
    menu.style.borderRadius = "20px";
    menu.style.boxShadow = "0 18px 55px rgba(15,31,61,.28), 0 4px 12px rgba(15,31,61,.12)";
    menu.style.padding = "7px";
    menu.style.overflowY = "auto";
    menu.style.maxHeight = "min(70vh, 460px)";
    menu.style.width = isMobile() ? "min(92vw, 360px)" : "";
    menu.style.minWidth = isMobile() ? "260px" : "248px";
    menu.style.right = "auto";
    menu.style.bottom = "auto";
    menu.style.transform = "none";
    menu.classList.add("nexu-acc-open-v41");

    const rect = menu.getBoundingClientRect();
    const menuW = rect.width || (isMobile() ? Math.min(window.innerWidth * 0.92, 360) : 248);
    const menuH = rect.height || 320;
    const margin = 8;

    let left = btn.right - menuW;
    if (left < margin) left = margin;
    if (left + menuW > window.innerWidth - margin) {
      left = window.innerWidth - menuW - margin;
    }

    let top = btn.bottom + 6;
    if (top + menuH > window.innerHeight - margin) {
      top = btn.top - menuH - 6;
    }

    if (top < margin) {
      top = margin;
      menu.style.maxHeight = Math.max(220, window.innerHeight - 24) + "px";
    }

    menu.style.left = left + "px";
    menu.style.top = top + "px";

    menu.querySelectorAll("button, a, [role='button'], [onclick]").forEach(btnEl => {
      btnEl.style.pointerEvents = "auto";
      btnEl.style.touchAction = "manipulation";
      btnEl.style.opacity = "1";
      btnEl.style.visibility = "visible";
    });
  }

  window.cerrarAccMenus = closeActionMenus;

  window.toggleAccMenu = function (ev, cid) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }

    removeAppPatchUI();
    cleanActionBackdrops();

    const menu = document.getElementById("accMenu_" + cid);
    if (!menu) return;

    const wasOpen = menu.style.display === "block";
    closeActionMenus();

    if (wasOpen) return;

    const button = ev && (ev.currentTarget || (ev.target && ev.target.closest("button, a, [role='button'], [onclick]")));
    if (!button) return;

    placeMenuBesideButton(menu, button);
  };

  function injectCSS() {
    if (document.getElementById("nexu-acciones-como-pc-v41-css")) return;

    const style = document.createElement("style");
    style.id = "nexu-acciones-como-pc-v41-css";
    style.textContent = `
      @media (max-width: ${MOBILE_MAX}px) {
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

        .acc-backdrop,
        .dropdown-backdrop {
          display: none !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }

        .acc-menu.nexu-acc-open-v41 {
          position: fixed !important;
          z-index: 2147483000 !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          filter: none !important;
          -webkit-filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .acc-menu.nexu-acc-open-v41 button,
        .acc-menu.nexu-acc-open-v41 a,
        .acc-menu.nexu-acc-open-v41 [role="button"],
        .acc-menu.nexu-acc-open-v41 [onclick] {
          pointer-events: auto !important;
          touch-action: manipulation !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        body {
          padding-bottom: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function bindCloseEvents() {
    if (window.__NEXU_ACCIONES_COMO_PC_V41_EVENTS__) return;
    window.__NEXU_ACCIONES_COMO_PC_V41_EVENTS__ = true;

    document.addEventListener("click", function (e) {
      if (e.target.closest(".acc-menu")) return;
      if (e.target.closest("[onclick*='toggleAccMenu']")) return;
      closeActionMenus();
    }, true);

    document.addEventListener("touchend", function (e) {
      if (e.target.closest(".acc-menu")) return;
      if (e.target.closest("[onclick*='toggleAccMenu']")) return;
      closeActionMenus();
    }, { passive: true, capture: true });

    window.addEventListener("scroll", function () {
      closeActionMenus();
    }, true);

    window.addEventListener("resize", function () {
      closeActionMenus();
    }, true);
  }

  function init() {
    injectCSS();
    removeAppPatchUI();
    cleanActionBackdrops();
    bindCloseEvents();
  }

  document.addEventListener("DOMContentLoaded", init);
  setTimeout(init, 300);
  setTimeout(init, 1200);
  setTimeout(init, 3000);
})();
