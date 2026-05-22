/* ==========================================================================
   NEXU PRO - PARCHE MÓVIL APP v3
   Autorizado: Dashboard móvil tipo app + navegación corregida
   Alcance: SOLO vista móvil web. No modifica master ni base de datos.
   ========================================================================== */

(function () {
  "use strict";

  const PATCH_ID = "nexu-pro-mobile-app-v3";
  const MOBILE_MAX = 768;

  if (window[PATCH_ID]) return;
  window[PATCH_ID] = true;

  const isMobile = () => window.innerWidth <= MOBILE_MAX;

  function q(sel, root = document) {
    return root.querySelector(sel);
  }

  function qa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function normalize(txt) {
    return String(txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function safeClick(el) {
    if (!el) return false;
    try {
      el.click();
      return true;
    } catch (e) {
      return false;
    }
  }

  function findClickableByText(words) {
    const wanted = words.map(normalize);
    const candidates = qa("button, a, [onclick], [role='button'], .nav-item, .menu-item, .tab, .card, li, div");
    return candidates.find(el => {
      const t = normalize(el.innerText || el.textContent || el.getAttribute("aria-label"));
      return wanted.some(w => t.includes(w));
    });
  }

  function goToModule(names) {
    const el = findClickableByText(names);
    if (safeClick(el)) return true;

    // Fallback para sistemas con función global showSection / mostrarSeccion / navigate
    const aliases = names.map(normalize);
    const guess = aliases[0]?.split(" ")[0] || "";

    ["showSection", "mostrarSeccion", "openSection", "navigateTo", "irA", "goTo"].forEach(fn => {
      if (typeof window[fn] === "function") {
        try { window[fn](guess); } catch (e) {}
      }
    });

    return false;
  }

  function injectStyles() {
    if (q("#nexu-mobile-app-v3-css")) return;

    const css = document.createElement("style");
    css.id = "nexu-mobile-app-v3-css";
    css.textContent = `
      @media (max-width: ${MOBILE_MAX}px) {
        html, body {
          max-width: 100%;
          overflow-x: hidden !important;
          background: #f6f8fc !important;
          -webkit-tap-highlight-color: transparent;
        }

        body {
          padding-bottom: 96px !important;
        }

        .app, .main, main, .content, .page, .section, .container, .dashboard,
        [class*="content"], [class*="dashboard"], [class*="section"] {
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }

        .card, .panel, .box, .widget, .module, .stat-card,
        [class*="card"], [class*="panel"], [class*="widget"] {
          border-radius: 22px !important;
          box-shadow: 0 10px 28px rgba(15, 23, 42, .08) !important;
          border: 1px solid rgba(148, 163, 184, .22) !important;
          box-sizing: border-box !important;
          max-width: 100% !important;
        }

        table {
          min-width: 720px;
        }

        .table-wrap, .table-container, .responsive-table,
        [class*="table"], [class*="grid"] {
          max-width: 100% !important;
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch !important;
        }

        .permissions-grid, .roles-grid, [class*="permission"], [class*="permiso"] {
          max-width: 100% !important;
          overflow-x: auto !important;
        }

        .mobile-bottom-nav-v3 {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 99990;
          height: 72px;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          align-items: center;
          gap: 4px;
          padding: 8px;
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(226,232,240,.95);
          border-radius: 28px;
          box-shadow: 0 18px 45px rgba(15,23,42,.18);
        }

        .mobile-bottom-nav-v3 button {
          border: 0;
          background: transparent;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 54px;
          border-radius: 18px;
          cursor: pointer;
        }

        .mobile-bottom-nav-v3 button.active {
          background: #eff6ff;
          color: #2563eb;
        }

        .mobile-bottom-nav-v3 .ico {
          font-size: 21px;
          line-height: 1;
        }

        .mobile-more-sheet-v3 {
          position: fixed;
          left: 12px;
          right: 12px;
          bottom: 92px;
          z-index: 99991;
          background: rgba(255,255,255,.98);
          border: 1px solid #e5e7eb;
          border-radius: 26px;
          box-shadow: 0 24px 60px rgba(15,23,42,.2);
          padding: 14px;
          display: none;
        }

        .mobile-more-sheet-v3.open {
          display: block;
        }

        .mobile-more-sheet-v3 h3 {
          margin: 4px 6px 12px;
          font-size: 14px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .mobile-more-sheet-v3 button {
          width: 100%;
          border: 0;
          background: #fff;
          border-bottom: 1px solid #eef2f7;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 10px;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          cursor: pointer;
          text-align: left;
        }

        .mobile-more-sheet-v3 button:last-child {
          border-bottom: 0;
        }

        .mobile-more-sheet-v3 .more-icon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: #eff6ff;
          color: #2563eb;
          font-size: 20px;
          flex: 0 0 auto;
        }

        .mobile-fab-v3 {
          position: fixed;
          right: 20px;
          bottom: 104px;
          z-index: 99980;
          width: 60px;
          height: 60px;
          border-radius: 22px;
          border: 0;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          font-size: 34px;
          line-height: 1;
          box-shadow: 0 18px 34px rgba(37,99,235,.35);
          cursor: pointer;
        }

        .mobile-view-v3 {
          position: fixed;
          inset: 0;
          z-index: 99970;
          background: #f8fafc;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: env(safe-area-inset-top) 16px 110px;
          box-sizing: border-box;
        }

        .mobile-view-v3-header {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          background: rgba(248,250,252,.96);
          backdrop-filter: blur(12px);
        }

        .mobile-view-v3-header button {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 22px;
          cursor: pointer;
        }

        .mobile-view-v3-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
        }

        .mobile-summary-grid-v3 {
          display: grid;
          grid-template-columns: repeat(5, minmax(76px, 1fr));
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .mobile-mini-card-v3 {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 12px 10px;
          text-align: center;
          min-width: 76px;
          box-shadow: 0 8px 22px rgba(15,23,42,.06);
        }

        .mobile-mini-card-v3 .n {
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 5px;
        }

        .mobile-mini-card-v3 .l {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
        }

        .mobile-search-v3 {
          display: flex;
          gap: 10px;
          margin: 14px 0;
        }

        .mobile-search-v3 input {
          flex: 1;
          height: 48px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          padding: 0 14px;
          font-size: 15px;
          background: #fff;
        }

        .mobile-client-list-v3 {
          background: #fff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 10px 26px rgba(15,23,42,.06);
        }

        .mobile-client-row-v3 {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-bottom: 1px solid #eef2f7;
          cursor: pointer;
        }

        .mobile-client-row-v3:last-child {
          border-bottom: 0;
        }

        .mobile-avatar-v3 {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #dbeafe;
          display: grid;
          place-items: center;
          color: #2563eb;
          font-weight: 900;
          flex: 0 0 auto;
        }

        .mobile-client-main-v3 {
          min-width: 0;
          flex: 1;
        }

        .mobile-client-main-v3 b {
          display: block;
          font-size: 14px;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mobile-client-main-v3 span {
          display: block;
          font-size: 12px;
          color: #64748b;
        }

        .mobile-badge-v3 {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          background: #dcfce7;
          color: #15803d;
        }

        .mobile-badge-v3.warn { background: #ffedd5; color: #ea580c; }
        .mobile-badge-v3.bad { background: #fee2e2; color: #dc2626; }
        .mobile-badge-v3.off { background: #e5e7eb; color: #475569; }

        .mobile-payment-row-v3 {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 14px;
          margin-bottom: 10px;
          box-shadow: 0 8px 22px rgba(15,23,42,.05);
        }

        .mobile-payment-row-v3 .top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-weight: 900;
        }

        .mobile-payment-row-v3 .sub {
          color: #64748b;
          font-size: 12px;
          margin-top: 5px;
        }

        .mobile-filter-pills-v3 {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px 0 14px;
        }

        .mobile-filter-pills-v3 button {
          border: 1px solid #dbeafe;
          background: #fff;
          color: #2563eb;
          font-weight: 900;
          border-radius: 999px;
          padding: 9px 13px;
          white-space: nowrap;
        }
      }
    `;
    document.head.appendChild(css);
  }

  function readClientes() {
    const keys = ["clientes", "clients", "nexu_clientes", "nexuProClientes"];
    for (const key of keys) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(val) && val.length) return val;
      } catch (e) {}
    }

    // Fallback desde variables globales comunes
    for (const key of ["clientes", "clients", "CLIENTES"]) {
      if (Array.isArray(window[key])) return window[key];
    }

    return [];
  }

  function readPagos() {
    const keys = ["pagos", "payments", "historialPagos", "nexu_pagos", "cobros"];
    for (const key of keys) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(val) && val.length) return val;
      } catch (e) {}
    }

    for (const key of ["pagos", "payments", "historialPagos", "cobros"]) {
      if (Array.isArray(window[key])) return window[key];
    }

    return [];
  }

  function getClientName(c) {
    return c.nombre_completo || c.nombreCompleto || c.name || [c.nombre, c.apellido].filter(Boolean).join(" ") || "Cliente";
  }

  function getClientPhone(c) {
    return c.whatsapp || c.telefono || c.phone || c.celular || "";
  }

  function getClientStatus(c) {
    const raw = normalize(c.estado || c.status || c.estatus);
    if (raw.includes("moroso")) return "moroso";
    if (raw.includes("pend")) return "pendiente";
    if (raw.includes("inactivo")) return "inactivo";
    return "activo";
  }

  function money(v) {
    const n = Number(String(v || 0).replace(/[^\d.-]/g, ""));
    return "RD$ " + (isNaN(n) ? 0 : n).toLocaleString("es-DO");
  }

  function closeMobileView() {
    const view = q(".mobile-view-v3");
    if (view) view.remove();
  }

  function showClientesResumido() {
    if (!isMobile()) return goToModule(["clientes"]);
    closeMobileView();

    const clientes = readClientes();
    const activos = clientes.filter(c => getClientStatus(c) === "activo").length || 0;
    const morosos = clientes.filter(c => getClientStatus(c) === "moroso").length || 0;
    const pendientes = clientes.filter(c => getClientStatus(c) === "pendiente").length || 0;
    const inactivos = clientes.filter(c => getClientStatus(c) === "inactivo").length || 0;
    const nuevos = clientes.filter(c => {
      const f = c.created_at || c.fechaCreacion || c.fecha || "";
      return String(f).slice(0,7) === new Date().toISOString().slice(0,7);
    }).length || 0;

    const view = document.createElement("div");
    view.className = "mobile-view-v3";
    view.innerHTML = `
      <div class="mobile-view-v3-header">
        <button type="button" data-back>‹</button>
        <div class="mobile-view-v3-title">Clientes resumido</div>
        <button type="button" title="Filtro">☰</button>
      </div>

      <div class="mobile-summary-grid-v3">
        <div class="mobile-mini-card-v3"><div>👥</div><div class="l">Activos</div><div class="n">${activos}</div></div>
        <div class="mobile-mini-card-v3"><div>📄</div><div class="l">Nuevos</div><div class="n">${nuevos}</div></div>
        <div class="mobile-mini-card-v3"><div>⚠️</div><div class="l">Morosos</div><div class="n">${morosos}</div></div>
        <div class="mobile-mini-card-v3"><div>⏱️</div><div class="l">Pendientes</div><div class="n">${pendientes}</div></div>
        <div class="mobile-mini-card-v3"><div>👤</div><div class="l">Inactivos</div><div class="n">${inactivos}</div></div>
      </div>

      <div class="mobile-search-v3">
        <input type="search" placeholder="Buscar cliente..." data-client-search>
      </div>

      <h3 style="font-size:16px;margin:12px 2px;color:#0f172a;">Últimos clientes</h3>
      <div class="mobile-client-list-v3" data-client-list></div>

      <button type="button" data-open-all style="width:100%;margin-top:14px;height:50px;border-radius:18px;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;font-weight:900;">
        Ver todos los clientes (${clientes.length})
      </button>
    `;

    document.body.appendChild(view);

    const list = q("[data-client-list]", view);
    const render = (filter = "") => {
      const f = normalize(filter);
      const data = clientes
        .filter(c => normalize(getClientName(c) + " " + getClientPhone(c)).includes(f))
        .slice(0, 25);

      list.innerHTML = data.length ? data.map((c, i) => {
        const name = getClientName(c);
        const initials = name.split(/\s+/).slice(0,2).map(x => x[0]).join("").toUpperCase() || "CL";
        const st = getClientStatus(c);
        const badgeClass = st === "moroso" ? "bad" : st === "pendiente" ? "warn" : st === "inactivo" ? "off" : "";
        const deuda = c.deuda || c.balance || c.pendiente || c.total_pendiente || 0;
        return `
          <div class="mobile-client-row-v3" data-client-index="${i}">
            <div class="mobile-avatar-v3">${initials}</div>
            <div class="mobile-client-main-v3">
              <b>${name}</b>
              <span>${getClientPhone(c) || "Sin teléfono"}</span>
            </div>
            <span class="mobile-badge-v3 ${badgeClass}">${st}</span>
            <b style="font-size:13px;color:#0f172a;">${money(deuda)}</b>
            <span style="color:#64748b;">›</span>
          </div>
        `;
      }).join("") : `
        <div style="padding:22px;text-align:center;color:#64748b;font-weight:700;">
          No hay clientes para mostrar.
        </div>
      `;
    };

    render();

    q("[data-back]", view).addEventListener("click", closeMobileView);
    q("[data-open-all]", view).addEventListener("click", () => {
      closeMobileView();
      goToModule(["clientes"]);
    });
    q("[data-client-search]", view).addEventListener("input", e => render(e.target.value));
    list.addEventListener("click", () => {
      closeMobileView();
      goToModule(["clientes"]);
    });
  }

  function showHistorialPagos() {
    if (!isMobile()) return goToModule(["historial de pagos", "pagos", "cobros"]);
    closeMobileView();

    const pagos = readPagos().slice(-30).reverse();

    const view = document.createElement("div");
    view.className = "mobile-view-v3";
    view.innerHTML = `
      <div class="mobile-view-v3-header">
        <button type="button" data-back>‹</button>
        <div class="mobile-view-v3-title">Historial de pagos</div>
        <button type="button">⌕</button>
      </div>
      <div class="mobile-search-v3">
        <input type="search" placeholder="Buscar pagos..." data-pay-search>
      </div>
      <div class="mobile-filter-pills-v3">
        <button>Todos</button><button>Cobrado</button><button>Parcial</button><button>Anulado</button>
      </div>
      <div data-payment-list></div>
      <button type="button" data-open-real style="width:100%;margin-top:14px;height:50px;border-radius:18px;border:1px solid #bfdbfe;background:#eff6ff;color:#2563eb;font-weight:900;">
        Abrir historial completo
      </button>
    `;
    document.body.appendChild(view);

    const list = q("[data-payment-list]", view);
    const render = (filter = "") => {
      const f = normalize(filter);
      const data = pagos.filter(p => normalize(JSON.stringify(p)).includes(f)).slice(0, 40);
      list.innerHTML = data.length ? data.map(p => {
        const name = p.cliente || p.nombre || p.cliente_nombre || "Cliente";
        const amount = p.monto || p.total || p.valor || 0;
        const fecha = p.fecha || p.created_at || "";
        const estado = p.estado || p.status || "Cobrado";
        return `
          <div class="mobile-payment-row-v3">
            <div class="top"><span>${name}</span><span>${money(amount)}</span></div>
            <div class="sub">${fecha ? String(fecha).slice(0,10) : ""} · ${estado}</div>
          </div>
        `;
      }).join("") : `
        <div style="padding:22px;background:#fff;border-radius:20px;text-align:center;color:#64748b;font-weight:700;">
          No hay pagos guardados para mostrar aquí. Puedes abrir el historial completo.
        </div>
      `;
    };

    render();
    q("[data-back]", view).addEventListener("click", closeMobileView);
    q("[data-open-real]", view).addEventListener("click", () => {
      closeMobileView();
      goToModule(["historial de pagos", "pagos", "cobros"]);
    });
    q("[data-pay-search]", view).addEventListener("input", e => render(e.target.value));
  }

  function showCobrosPendientes() {
    closeMobileView();
    goToModule(["cobros", "pendientes", "facturas pendientes"]);
  }

  function showMoreSheet() {
    if (!isMobile()) return;
    let sheet = q(".mobile-more-sheet-v3");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.className = "mobile-more-sheet-v3";
      sheet.innerHTML = `
        <h3>Más opciones</h3>
        <button type="button" data-go="principal"><span class="more-icon">🏠</span><span><b>Principal</b><br><small>Panel principal del sistema</small></span></button>
        <button type="button" data-go="sistema"><span class="more-icon">⚙️</span><span><b>Sistema</b><br><small>Configuración y ajustes</small></span></button>
        <button type="button" data-go="usuarios"><span class="more-icon">👥</span><span><b>Usuarios</b><br><small>Gestionar usuarios</small></span></button>
        <button type="button" data-go="reportes"><span class="more-icon">📊</span><span><b>Reportes</b><br><small>Ver estadísticas</small></span></button>
        <button type="button" data-go="actualizaciones"><span class="more-icon">🔄</span><span><b>Historial de actualizaciones</b><br><small>Cambios y correcciones</small></span></button>
      `;
      document.body.appendChild(sheet);

      sheet.addEventListener("click", e => {
        const btn = e.target.closest("[data-go]");
        if (!btn) return;
        sheet.classList.remove("open");
        const go = btn.dataset.go;
        if (go === "principal") goToModule(["dashboard", "inicio", "principal"]);
        if (go === "sistema") goToModule(["configuracion", "ajustes", "sistema"]);
        if (go === "usuarios") goToModule(["usuarios"]);
        if (go === "reportes") goToModule(["reportes"]);
        if (go === "actualizaciones") goToModule(["historial de actualizaciones", "changelog", "actualizaciones"]);
      });
    }
    sheet.classList.toggle("open");
  }

  function buildBottomNav() {
    if (!isMobile()) return;
    if (q(".mobile-bottom-nav-v3")) return;

    const nav = document.createElement("nav");
    nav.className = "mobile-bottom-nav-v3";
    nav.innerHTML = `
      <button type="button" class="active" data-nav="inicio"><span class="ico">🏠</span><span>Inicio</span></button>
      <button type="button" data-nav="clientes"><span class="ico">👥</span><span>Clientes</span></button>
      <button type="button" data-nav="facturas"><span class="ico">📄</span><span>Facturas</span></button>
      <button type="button" data-nav="cobros"><span class="ico">💵</span><span>Cobros</span></button>
      <button type="button" data-nav="mas"><span class="ico">•••</span><span>Más</span></button>
    `;
    document.body.appendChild(nav);

    nav.addEventListener("click", e => {
      const btn = e.target.closest("button[data-nav]");
      if (!btn) return;
      qa(".mobile-bottom-nav-v3 button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const n = btn.dataset.nav;
      if (n === "inicio") goToModule(["dashboard", "inicio", "principal"]);
      if (n === "clientes") goToModule(["clientes"]);
      if (n === "facturas") goToModule(["facturas"]);
      if (n === "cobros") goToModule(["cobros"]);
      if (n === "mas") showMoreSheet();
    });
  }

  function buildFab() {
    if (!isMobile()) return;
    if (q(".mobile-fab-v3")) return;

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "mobile-fab-v3";
    fab.textContent = "+";
    fab.title = "Nuevo cliente";
    fab.addEventListener("click", () => goToModule(["nuevo cliente", "crear cliente", "agregar cliente", "clientes"]));
    document.body.appendChild(fab);
  }

  function bindDashboardCards() {
    if (!isMobile()) return;

    const candidates = qa("button, a, .card, .stat-card, .dashboard-card, [class*='card'], [role='button']");
    candidates.forEach(el => {
      if (el.dataset.nexuV3Bound) return;
      const text = normalize(el.innerText || el.textContent);

      if (text.includes("cobrado")) {
        el.dataset.nexuV3Bound = "cobrado";
        el.style.cursor = "pointer";
        el.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          showHistorialPagos();
        }, true);
      }

      if (text.includes("pendiente") && !text.includes("historial")) {
        el.dataset.nexuV3Bound = "pendiente";
        el.style.cursor = "pointer";
        el.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          showCobrosPendientes();
        }, true);
      }

      if (text.includes("clientes") && (text.includes("resumido") || text.includes("activos") || /^\s*clientes/i.test(el.innerText || ""))) {
        el.dataset.nexuV3Bound = "clientes";
        el.style.cursor = "pointer";
        el.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();
          showClientesResumido();
        }, true);
      }
    });
  }

  function suppressLoginRefreshToast() {
    // Evita repetir notificación de inicio de sesión cuando solo se refresca.
    try {
      const now = Date.now();
      const last = Number(sessionStorage.getItem("nexu_last_login_toast") || 0);
      const originalAlert = window.alert;

      window.alert = function (msg) {
        const t = normalize(msg);
        if (t.includes("inicio") && t.includes("sesion")) {
          if (now - last < 15000 || performance.navigation?.type === 1) return;
          sessionStorage.setItem("nexu_last_login_toast", String(Date.now()));
        }
        return originalAlert.apply(window, arguments);
      };
    } catch (e) {}
  }

  function addChangelogEntry() {
    try {
      const key = "nexu_patch_changelog";
      const current = JSON.parse(localStorage.getItem(key) || "[]");
      if (current.some(x => x.id === PATCH_ID)) return;
      current.unshift({
        id: PATCH_ID,
        version: "v3",
        fecha: new Date().toISOString(),
        titulo: "Parche móvil app v3",
        cambios: [
          "Cobrado del Dashboard dirige a Historial de pagos.",
          "Pendiente del Dashboard dirige a Cobros.",
          "Clientes abre vista Clientes resumido.",
          "Botón Más abre Principal, Sistema y herramientas.",
          "Ajustes visuales móviles y módulos mejor adaptados a pantalla."
        ]
      });
      localStorage.setItem(key, JSON.stringify(current));
    } catch (e) {}
  }

  function init() {
    injectStyles();
    suppressLoginRefreshToast();
    addChangelogEntry();

    if (isMobile()) {
      buildBottomNav();
      buildFab();
      bindDashboardCards();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("resize", init);

  // Reintentos por si el dashboard se renderiza después del login
  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    init();
    if (tries > 20) clearInterval(timer);
  }, 700);

})();
