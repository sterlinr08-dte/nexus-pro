/* ==========================================================================
   NEXU PRO - PARCHE MÓVIL APP v3.1
   REEMPLAZO COMPLETO AUTORIZADO
   ========================================================================== */

(function () {
  "use strict";

  if (window.__NEXU_PRO_V31__) return;
  window.__NEXU_PRO_V31__ = true;

  const MOBILE_MAX = 768;

  const isMobile = () => window.innerWidth <= MOBILE_MAX;

  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

  const q = (s, r = document) => r.querySelector(s);

  const normalize = (txt) =>
    String(txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  function injectCSS() {
    if (q("#nexu-v31-style")) return;

    const style = document.createElement("style");
    style.id = "nexu-v31-style";

    style.textContent = `
      @media (max-width:${MOBILE_MAX}px){

        body{
          padding-bottom:105px!important;
          overflow-x:hidden!important;
          background:#f6f8fc!important;
        }

        .mobile-bottom-nav-v3,
        .mobile-more-sheet-v3{
          display:none!important;
          pointer-events:none!important;
        }

        .mobile-bottom-nav-v31{
          position:fixed;
          left:12px;
          right:12px;
          bottom:12px;
          z-index:999999;
          height:72px;
          display:grid;
          grid-template-columns:repeat(5,1fr);
          align-items:center;
          gap:4px;
          padding:8px;
          background:rgba(255,255,255,.98);
          border:1px solid rgba(226,232,240,.95);
          border-radius:28px;
          box-shadow:0 18px 45px rgba(15,23,42,.18);
          backdrop-filter:blur(16px);
        }

        .mobile-bottom-nav-v31 button{
          border:0;
          background:transparent;
          color:#64748b;
          font-size:11px;
          font-weight:800;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:4px;
          min-height:54px;
          border-radius:18px;
          cursor:pointer;
          touch-action:manipulation;
        }

        .mobile-bottom-nav-v31 button.active{
          background:#eff6ff;
          color:#2563eb;
        }

        .mobile-bottom-nav-v31 .ico{
          font-size:21px;
        }

        .mobile-more-sheet-v31{
          position:fixed;
          left:12px;
          right:12px;
          bottom:92px;
          z-index:999999;
          background:rgba(255,255,255,.99);
          border:1px solid #e5e7eb;
          border-radius:26px;
          box-shadow:0 24px 60px rgba(15,23,42,.22);
          padding:14px;
          display:none;
        }

        .mobile-more-sheet-v31.open{
          display:block;
        }

        .mobile-more-sheet-v31 h3{
          margin:4px 6px 12px;
          font-size:14px;
          color:#64748b;
          text-transform:uppercase;
        }

        .mobile-more-sheet-v31 button{
          width:100%;
          border:0;
          background:#fff;
          border-bottom:1px solid #eef2f7;
          display:flex;
          align-items:center;
          gap:12px;
          padding:14px 10px;
          font-size:15px;
          font-weight:800;
          color:#0f172a;
          cursor:pointer;
          text-align:left;
        }

        .mobile-more-sheet-v31 button:last-child{
          border-bottom:0;
        }

        .mobile-more-sheet-v31 .icon{
          width:38px;
          height:38px;
          border-radius:14px;
          display:grid;
          place-items:center;
          background:#eff6ff;
          color:#2563eb;
          font-size:20px;
          flex:0 0 auto;
        }

      }
    `;

    document.head.appendChild(style);
  }

  function clickByText(labels) {
    const wanted = labels.map(normalize);

    const selectors = [
      "button",
      "a",
      "[role='button']",
      "[onclick]",
      ".nav-item",
      ".sidebar-item",
      ".menu-item",
      ".tab",
      "[data-section]",
      "[data-page]",
      "li"
    ].join(",");

    const els = qa(selectors);

    for (const el of els) {
      if (el.closest(".mobile-bottom-nav-v31")) continue;
      if (el.closest(".mobile-more-sheet-v31")) continue;

      const txt = normalize(
        el.innerText ||
        el.textContent ||
        el.getAttribute("aria-label") ||
        el.title ||
        ""
      );

      if (wanted.some(w => txt.includes(w))) {
        try {
          el.click();
          return true;
        } catch (e) {}
      }
    }

    return false;
  }

  function navigate(section) {

    const map = {
      dashboard: ["dashboard", "inicio", "principal"],
      clientes: ["clientes"],
      facturas: ["facturas", "facturacion"],
      cobros: ["cobros", "pagos"],
      sistema: ["sistema", "configuracion", "ajustes"],
      usuarios: ["usuarios"],
      reportes: ["reportes"],
      clientesProceso: ["clientes en proceso", "en proceso", "proceso"]
    };

    clickByText(map[section] || [section]);
  }

  function restoreDashboardLabel() {

    qa(".sidebar *, aside *, .side-menu *, .drawer *").forEach(el => {

      if (el.closest(".mobile-bottom-nav-v31")) return;

      const txt = normalize(el.innerText || "");

      if (txt === "inicio" || txt === "principal") {
        el.innerText = "Dashboard";
      }

    });
  }

  function buildMoreSheet() {

    let sheet = q(".mobile-more-sheet-v31");

    if (sheet) return sheet;

    sheet = document.createElement("div");

    sheet.className = "mobile-more-sheet-v31";

    sheet.innerHTML = `
      <h3>Más opciones</h3>

      <button data-go="dashboard">
        <span class="icon">🏠</span>
        <span>
          <b>Principal</b><br>
          <small>Panel principal del sistema</small>
        </span>
      </button>

      <button data-go="sistema">
        <span class="icon">⚙️</span>
        <span>
          <b>Sistema</b><br>
          <small>Configuración y ajustes</small>
        </span>
      </button>

      <button data-go="clientesProceso">
        <span class="icon">🟢</span>
        <span>
          <b>Clientes en proceso</b><br>
          <small>Clientes pendientes</small>
        </span>
      </button>

      <button data-go="usuarios">
        <span class="icon">👥</span>
        <span>
          <b>Usuarios</b><br>
          <small>Gestionar usuarios</small>
        </span>
      </button>

      <button data-go="reportes">
        <span class="icon">📊</span>
        <span>
          <b>Reportes</b><br>
          <small>Ver estadísticas</small>
        </span>
      </button>
    `;

    document.body.appendChild(sheet);

    sheet.addEventListener("click", (e) => {

      const btn = e.target.closest("[data-go]");

      if (!btn) return;

      e.preventDefault();

      sheet.classList.remove("open");

      navigate(btn.dataset.go);

    }, true);

    return sheet;
  }

  function buildBottomNav() {

    if (!isMobile()) return;

    qa(".mobile-bottom-nav-v3,.mobile-more-sheet-v3").forEach(el => el.remove());

    if (q(".mobile-bottom-nav-v31")) return;

    const nav = document.createElement("nav");

    nav.className = "mobile-bottom-nav-v31";

    nav.innerHTML = `
      <button class="active" data-nav="dashboard">
        <span class="ico">🏠</span>
        <span>Dashboard</span>
      </button>

      <button data-nav="clientes">
        <span class="ico">👥</span>
        <span>Clientes</span>
      </button>

      <button data-nav="facturas">
        <span class="ico">📄</span>
        <span>Facturas</span>
      </button>

      <button data-nav="cobros">
        <span class="ico">💵</span>
        <span>Cobros</span>
      </button>

      <button data-nav="mas">
        <span class="ico">•••</span>
        <span>Más</span>
      </button>
    `;

    document.body.appendChild(nav);

    nav.addEventListener("click", (e) => {

      const btn = e.target.closest("[data-nav]");

      if (!btn) return;

      e.preventDefault();

      qa(".mobile-bottom-nav-v31 button")
        .forEach(b => b.classList.remove("active"));

      btn.classList.add("active");

      const target = btn.dataset.nav;

      if (target === "mas") {

        const sheet = buildMoreSheet();

        sheet.classList.toggle("open");

        return;
      }

      const sheet = q(".mobile-more-sheet-v31");

      if (sheet) sheet.classList.remove("open");

      navigate(target);

    }, true);

  }

  function fixDashboardCards() {

    const cards = qa(
      ".card,.dashboard-card,.stat-card,[class*='card']"
    );

    cards.forEach(card => {

      const txt = normalize(card.innerText || "");

      if (txt.includes("cobrado")) {

        card.onclick = () => {
          clickByText([
            "historial de pagos",
            "pagos",
            "cobros"
          ]);
        };
      }

      if (txt.includes("pendiente")) {

        card.onclick = () => {
          clickByText([
            "cobros",
            "pagos"
          ]);
        };
      }

      if (txt.includes("clientes")) {

        card.onclick = () => {
          clickByText([
            "clientes"
          ]);
        };
      }

    });

  }

  function suppressLoginToast() {

    try {

      const originalAlert = window.alert;

      window.alert = function (msg) {

        const txt = normalize(msg);

        const reload =
          performance &&
          performance.getEntriesByType &&
          performance.getEntriesByType("navigation")[0]?.type === "reload";

        if (
          reload &&
          txt.includes("inicio") &&
          txt.includes("sesion")
        ) {
          return;
        }

        return originalAlert.apply(window, arguments);

      };

    } catch (e) {}

  }

  function init() {

    injectCSS();

    suppressLoginToast();

    if (!isMobile()) return;

    buildBottomNav();

    buildMoreSheet();

    restoreDashboardLabel();

    fixDashboardCards();

  }

  document.addEventListener("DOMContentLoaded", init);

  window.addEventListener("resize", init);

  setTimeout(init, 1000);

  setTimeout(init, 3000);

})();
