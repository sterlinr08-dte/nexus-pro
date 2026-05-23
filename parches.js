/* ===========================================================================
   NEXU PRO - PARCHES COMPLETO MÓVIL WEB v3.2 ESTABLE
   Reemplazo completo de parches.js

   Corrige:
   - Barra inferior funcional sin bloquear modales.
   - Botón Más funcional.
   - Menú de acciones de Clientes por encima y ejecutable.
   - Modales cerrables.
   - Se quita "Historial de actualizaciones" de Más.
   - Se agrega "Clientes en proceso" en Más.
   - Se restaura Dashboard donde aplique.
   - Solo móvil web <= 768px.
   =========================================================================== */

(function () {
  "use strict";

  const PATCH_ID = "nexu-pro-mobile-v3-2-estable";
  const MOBILE_MAX = 768;

  if (window[PATCH_ID]) return;
  window[PATCH_ID] = true;

  const isMobile = () => window.innerWidth <= MOBILE_MAX;
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function normalize(txt) {
    return String(txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function visible(el) {
    if (!el) return false;
    const st = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return st.display !== "none" && st.visibility !== "hidden" && r.width > 0 && r.height > 0;
  }

  function isOwnPatch(el) {
    return !!(el.closest(".mobile-bottom-nav-nexu") || el.closest(".mobile-more-sheet-nexu") || el.closest(".mobile-view-nexu"));
  }

  function fireClick(el) {
    if (!el) return false;
    try {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      if (typeof el.click === "function") el.click();
      return true;
    } catch (e) {
      try {
        el.click();
        return true;
      } catch (_) {
        return false;
      }
    }
  }

  function findOriginalByText(labels) {
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
      "[data-view]",
      "[data-target]",
      "li"
    ].join(",");

    const els = qa(selectors).filter(el => visible(el) && !isOwnPatch(el));

    let found = els.find(el => {
      const txt = normalize(el.innerText || el.textContent || el.getAttribute("aria-label") || el.title || "");
      return wanted.some(w => txt === w);
    });

    if (!found) {
      found = els.find(el => {
        const txt = normalize(el.innerText || el.textContent || el.getAttribute("aria-label") || el.title || "");
        return wanted.some(w => txt.includes(w));
      });
    }

    return found || null;
  }

  function callGlobal(section) {
    const functions = [
      "showSection", "mostrarSeccion", "openSection", "navigateTo",
      "goTo", "irA", "showPage", "openPage", "switchSection",
      "cambiarSeccion", "loadSection"
    ];

    const aliases = {
      dashboard: ["dashboard", "inicio", "principal", "home"],
      clientes: ["clientes", "clients"],
      facturas: ["facturas", "facturacion", "invoices"],
      cobros: ["cobros", "pagos", "payments"],
      sistema: ["sistema", "configuracion", "ajustes", "settings"],
      usuarios: ["usuarios", "users"],
      reportes: ["reportes", "reports"],
      clientesProceso: ["clientes-proceso", "clientes_en_proceso", "clientesProceso", "proceso", "en-proceso"],
      historialPagos: ["historial-pagos", "historialPagos", "pagos", "cobros"]
    };

    for (const fn of functions) {
      if (typeof window[fn] === "function") {
        for (const arg of aliases[section] || [section]) {
          try {
            window[fn](arg);
            return true;
          } catch (e) {}
        }
      }
    }
    return false;
  }

  function navigate(section) {
    const labels = {
      dashboard: ["Dashboard", "Inicio", "Principal"],
      clientes: ["Clientes"],
      facturas: ["Facturas", "Facturación"],
      cobros: ["Cobros", "Pagos"],
      sistema: ["Sistema", "Configuración", "Ajustes"],
      usuarios: ["Usuarios"],
      reportes: ["Reportes"],
      clientesProceso: ["Clientes en proceso", "En proceso", "Proceso"],
      historialPagos: ["Historial de pagos", "Pagos", "Cobros"]
    };

    closeMoreSheet();

    if (fireClick(findOriginalByText(labels[section] || [section]))) return true;
    if (callGlobal(section)) return true;

    try {
      const hash = {
        dashboard: "dashboard",
        clientes: "clientes",
        facturas: "facturas",
        cobros: "cobros",
        sistema: "configuracion",
        usuarios: "usuarios",
        reportes: "reportes",
        clientesProceso: "clientes-proceso",
        historialPagos: "historial-pagos"
      }[section] || section;
      location.hash = hash;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      return true;
    } catch (e) {
      return false;
    }
  }

  function injectCSS() {
    if (q("#nexu-mobile-v32-css")) return;

    const style = document.createElement("style");
    style.id = "nexu-mobile-v32-css";
    style.textContent = `
      @media (max-width: ${MOBILE_MAX}px) {
        html, body {
          max-width: 100%;
          overflow-x: hidden !important;
          background: #f6f8fc !important;
          -webkit-tap-highlight-color: transparent;
        }

        body {
          padding-bottom: 105px !important;
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

        .mobile-bottom-nav-v3,
        .mobile-more-sheet-v3,
        .mobile-bottom-nav-v31,
        .mobile-more-sheet-v31 {
          display: none !important;
          pointer-events: none !important;
        }

        .mobile-bottom-nav-nexu {
          position: fixed !important;
          left: 12px !important;
          right: 12px !important;
          bottom: 12px !important;
          z-index: 2000000 !important;
          height: 72px !important;
          display: grid !important;
          grid-template-columns: repeat(5, 1fr) !important;
          align-items: center !important;
          gap: 4px !important;
          padding: 8px !important;
          background: rgba(255,255,255,.98) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(226,232,240,.95) !important;
          border-radius: 28px !important;
          box-shadow: 0 18px 45px rgba(15,23,42,.18) !important;
          pointer-events: auto !important;
        }

        .mobile-bottom-nav-nexu.nexu-hidden-for-layer {
          display: none !important;
          pointer-events: none !important;
        }

        .mobile-bottom-nav-nexu button {
          border: 0 !important;
          background: transparent !important;
          color: #64748b !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
          min-height: 54px !important;
          border-radius: 18px !important;
          cursor: pointer !important;
          touch-action: manipulation !important;
        }

        .mobile-bottom-nav-nexu button.active {
          background: #eff6ff !important;
          color: #2563eb !important;
        }

        .mobile-bottom-nav-nexu .ico {
          font-size: 21px !important;
          line-height: 1 !important;
        }

        .mobile-more-sheet-nexu {
          position: fixed !important;
          left: 12px !important;
          right: 12px !important;
          bottom: 92px !important;
          z-index: 2200000 !important;
          background: rgba(255,255,255,.99) !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 26px !important;
          box-shadow: 0 24px 60px rgba(15,23,42,.22) !important;
          padding: 14px !important;
          display: none !important;
          pointer-events: auto !important;
        }

        .mobile-more-sheet-nexu.open {
          display: block !important;
        }

        .mobile-more-sheet-nexu h3 {
          margin: 4px 6px 12px !important;
          font-size: 14px !important;
          color: #64748b !important;
          text-transform: uppercase !important;
          letter-spacing: .04em !important;
        }

        .mobile-more-sheet-nexu button {
          width: 100% !important;
          border: 0 !important;
          background: #fff !important;
          border-bottom: 1px solid #eef2f7 !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          padding: 14px 10px !important;
          font-size: 15px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          cursor: pointer !important;
          text-align: left !important;
          touch-action: manipulation !important;
        }

        .mobile-more-sheet-nexu button:last-child {
          border-bottom: 0 !important;
        }

        .mobile-more-sheet-nexu .more-icon {
          width: 38px !important;
          height: 38px !important;
          border-radius: 14px !important;
          display: grid !important;
          place-items: center !important;
          background: #eff6ff !important;
          color: #2563eb !important;
          font-size: 20px !important;
          flex: 0 0 auto !important;
        }

        .mobile-view-nexu {
          position: fixed;
          inset: 0;
          z-index: 2100000;
          background: #f8fafc;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: env(safe-area-inset-top) 16px 110px;
          box-sizing: border-box;
        }

        .mobile-view-nexu-header {
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

        .mobile-view-nexu-header button {
          width: 40px;
          height: 40px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 22px;
          cursor: pointer;
        }

        .mobile-view-nexu-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
        }

        .mobile-summary-grid-nexu {
          display: grid;
          grid-template-columns: repeat(5, minmax(76px, 1fr));
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .mobile-mini-card-nexu {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 12px 10px;
          text-align: center;
          min-width: 76px;
          box-shadow: 0 8px 22px rgba(15,23,42,.06);
        }

        .mobile-mini-card-nexu .n {
          font-size: 19px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 5px;
        }

        .mobile-mini-card-nexu .l {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
        }

        .mobile-search-nexu {
          display: flex;
          gap: 10px;
          margin: 14px 0;
        }

        .mobile-search-nexu input {
          flex: 1;
          height: 48px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          padding: 0 14px;
          font-size: 15px;
          background: #fff;
        }

        .mobile-client-list-nexu {
          background: #fff;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
          box-shadow: 0 10px 26px rgba(15,23,42,.06);
        }

        .mobile-client-row-nexu {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-bottom: 1px solid #eef2f7;
          cursor: pointer;
        }

        .mobile-client-row-nexu:last-child { border-bottom: 0; }

        .mobile-avatar-nexu {
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

        .mobile-client-main-nexu { min-width: 0; flex: 1; }

        .mobile-client-main-nexu b {
          display: block;
          font-size: 14px;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mobile-client-main-nexu span {
          display: block;
          font-size: 12px;
          color: #64748b;
        }

        .mobile-badge-nexu {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          background: #dcfce7;
          color: #15803d;
        }

        .mobile-badge-nexu.warn { background: #ffedd5; color: #ea580c; }
        .mobile-badge-nexu.bad { background: #fee2e2; color: #dc2626; }
        .mobile-badge-nexu.off { background: #e5e7eb; color: #475569; }

        .mobile-payment-row-nexu {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 14px;
          margin-bottom: 10px;
          box-shadow: 0 8px 22px rgba(15,23,42,.05);
        }

        .mobile-payment-row-nexu .top {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          font-weight: 900;
        }

        .mobile-payment-row-nexu .sub {
          color: #64748b;
          font-size: 12px;
          margin-top: 5px;
        }

        .mobile-filter-pills-nexu {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 8px 0 14px;
        }

        .mobile-filter-pills-nexu button {
          border: 1px solid #dbeafe;
          background: #fff;
          color: #2563eb;
          font-weight: 900;
          border-radius: 999px;
          padding: 9px 13px;
          white-space: nowrap;
        }

        .nexu-layer-open .mobile-bottom-nav-nexu {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function removeOldPatchUI() {
    qa(".mobile-bottom-nav-v3, .mobile-more-sheet-v3, .mobile-bottom-nav-v31, .mobile-more-sheet-v31").forEach(el => {
      el.classList.remove("open");
      el.style.display = "none";
      el.style.pointerEvents = "none";
      el.setAttribute("aria-hidden", "true");
    });
  }

  function readClientes() {
    const keys = ["clientes", "clients", "nexu_clientes", "nexuProClientes"];
    for (const key of keys) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(val) && val.length) return val;
      } catch (e) {}
    }
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
    const view = q(".mobile-view-nexu");
    if (view) view.remove();
    setLayerState();
  }

  function showClientesResumido() {
    if (!isMobile()) return navigate("clientes");
    closeMobileView();

    const clientes = readClientes();
    const activos = clientes.filter(c => getClientStatus(c) === "activo").length || 0;
    const morosos = clientes.filter(c => getClientStatus(c) === "moroso").length || 0;
    const pendientes = clientes.filter(c => getClientStatus(c) === "pendiente").length || 0;
    const inactivos = clientes.filter(c => getClientStatus(c) === "inactivo").length || 0;
    const nuevos = clientes.filter(c => {
      const f = c.created_at || c.fechaCreacion || c.fecha || "";
      return String(f).slice(0, 7) === new Date().toISOString().slice(0, 7);
    }).length || 0;

    const view = document.createElement("div");
    view.className = "mobile-view-nexu";
    view.innerHTML = `
      <div class="mobile-view-nexu-header">
        <button type="button" data-back>‹</button>
        <div class="mobile-view-nexu-title">Clientes resumido</div>
        <button type="button" title="Filtro">☰</button>
      </div>

      <div class="mobile-summary-grid-nexu">
        <div class="mobile-mini-card-nexu"><div>👥</div><div class="l">Activos</div><div class="n">${activos}</div></div>
        <div class="mobile-mini-card-nexu"><div>📄</div><div class="l">Nuevos</div><div class="n">${nuevos}</div></div>
        <div class="mobile-mini-card-nexu"><div>⚠️</div><div class="l">Morosos</div><div class="n">${morosos}</div></div>
        <div class="mobile-mini-card-nexu"><div>⏱️</div><div class="l">Pendientes</div><div class="n">${pendientes}</div></div>
        <div class="mobile-mini-card-nexu"><div>👤</div><div class="l">Inactivos</div><div class="n">${inactivos}</div></div>
      </div>

      <div class="mobile-search-nexu">
        <input type="search" placeholder="Buscar cliente..." data-client-search>
      </div>

      <h3 style="font-size:16px;margin:12px 2px;color:#0f172a;">Últimos clientes</h3>
      <div class="mobile-client-list-nexu" data-client-list></div>

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

      list.innerHTML = data.length ? data.map(c => {
        const name = getClientName(c);
        const initials = name.split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "CL";
        const st = getClientStatus(c);
        const badgeClass = st === "moroso" ? "bad" : st === "pendiente" ? "warn" : st === "inactivo" ? "off" : "";
        const deuda = c.deuda || c.balance || c.pendiente || c.total_pendiente || 0;
        return `
          <div class="mobile-client-row-nexu">
            <div class="mobile-avatar-nexu">${initials}</div>
            <div class="mobile-client-main-nexu">
              <b>${name}</b>
              <span>${getClientPhone(c) || "Sin teléfono"}</span>
            </div>
            <span class="mobile-badge-nexu ${badgeClass}">${st}</span>
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
      navigate("clientes");
    });
    q("[data-client-search]", view).addEventListener("input", e => render(e.target.value));
    list.addEventListener("click", () => {
      closeMobileView();
      navigate("clientes");
    });

    setLayerState();
  }

  function showHistorialPagos() {
    if (!isMobile()) return navigate("historialPagos");
    closeMobileView();

    const pagos = readPagos().slice(-30).reverse();

    const view = document.createElement("div");
    view.className = "mobile-view-nexu";
    view.innerHTML = `
      <div class="mobile-view-nexu-header">
        <button type="button" data-back>‹</button>
        <div class="mobile-view-nexu-title">Historial de pagos</div>
        <button type="button">⌕</button>
      </div>
      <div class="mobile-search-nexu">
        <input type="search" placeholder="Buscar pagos..." data-pay-search>
      </div>
      <div class="mobile-filter-pills-nexu">
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
          <div class="mobile-payment-row-nexu">
            <div class="top"><span>${name}</span><span>${money(amount)}</span></div>
            <div class="sub">${fecha ? String(fecha).slice(0, 10) : ""} · ${estado}</div>
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
      navigate("historialPagos");
    });
    q("[data-pay-search]", view).addEventListener("input", e => render(e.target.value));

    setLayerState();
  }

  function showCobrosPendientes() {
    closeMobileView();
    navigate("cobros");
  }

  function closeMoreSheet() {
    const sheet = q(".mobile-more-sheet-nexu");
    if (sheet) sheet.classList.remove("open");
  }

  function buildMoreSheet() {
    let sheet = q(".mobile-more-sheet-nexu");
    if (sheet) return sheet;

    sheet = document.createElement("div");
    sheet.className = "mobile-more-sheet-nexu";
    sheet.innerHTML = `
      <h3>Más opciones</h3>

      <button type="button" data-go="dashboard">
        <span class="more-icon">🏠</span>
        <span><b>Principal</b><br><small>Panel principal del sistema</small></span>
      </button>

      <button type="button" data-go="sistema">
        <span class="more-icon">⚙️</span>
        <span><b>Sistema</b><br><small>Configuración y ajustes del sistema</small></span>
      </button>

      <button type="button" data-go="clientesProceso">
        <span class="more-icon">🟢</span>
        <span><b>Clientes en proceso</b><br><small>Clientes pendientes de afiliación o revisión</small></span>
      </button>

      <button type="button" data-go="usuarios">
        <span class="more-icon">👥</span>
        <span><b>Usuarios</b><br><small>Gestionar usuarios del sistema</small></span>
      </button>

      <button type="button" data-go="reportes">
        <span class="more-icon">📊</span>
        <span><b>Reportes</b><br><small>Ver reportes y estadísticas</small></span>
      </button>
    `;
    document.body.appendChild(sheet);

    const handler = ev => {
      const btn = ev.target.closest("button[data-go]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      sheet.classList.remove("open");
      navigate(btn.dataset.go);
      setLayerState();
    };

    sheet.addEventListener("click", handler, true);
    sheet.addEventListener("touchend", handler, { passive: false, capture: true });

    return sheet;
  }

  function buildBottomNav() {
    if (!isMobile()) return;

    removeOldPatchUI();

    let nav = q(".mobile-bottom-nav-nexu");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "mobile-bottom-nav-nexu";
      nav.innerHTML = `
        <button type="button" class="active" data-nav="dashboard"><span class="ico">🏠</span><span>Dashboard</span></button>
        <button type="button" data-nav="clientes"><span class="ico">👥</span><span>Clientes</span></button>
        <button type="button" data-nav="facturas"><span class="ico">📄</span><span>Facturas</span></button>
        <button type="button" data-nav="cobros"><span class="ico">💵</span><span>Cobros</span></button>
        <button type="button" data-nav="mas"><span class="ico">•••</span><span>Más</span></button>
      `;
      document.body.appendChild(nav);
    }

    if (nav.dataset.boundNexu === "1") return;
    nav.dataset.boundNexu = "1";

    const handler = ev => {
      const btn = ev.target.closest("button[data-nav]");
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();

      qa(".mobile-bottom-nav-nexu button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.dataset.nav;

      if (target === "mas") {
        const sheet = buildMoreSheet();
        sheet.classList.toggle("open");
        setLayerState();
        return;
      }

      closeMoreSheet();
      navigate(target);
      setLayerState();
    };

    nav.addEventListener("click", handler, true);
    nav.addEventListener("touchend", handler, { passive: false, capture: true });
  }

  function restoreDashboardName() {
    if (!isMobile()) return;

    const roots = qa(".sidebar, .side-menu, aside, .drawer, .menu-lateral, nav").filter(visible);

    roots.forEach(root => {
      if (root.classList.contains("mobile-bottom-nav-nexu")) return;

      qa("a, button, [role='button'], .nav-item, .sidebar-item, li, div, span", root).forEach(el => {
        if (isOwnPatch(el)) return;

        const attrs = [
          el.getAttribute("data-section"),
          el.getAttribute("data-page"),
          el.getAttribute("data-view"),
          el.getAttribute("href"),
          el.getAttribute("onclick"),
          el.getAttribute("aria-label")
        ].map(normalize).join(" ");

        const txt = normalize(el.innerText || el.textContent || "");

        if (attrs.includes("dashboard") && !txt.includes("dashboard")) {
          if ((el.innerText || "").trim().length === 0) {
            const span = document.createElement("span");
            span.textContent = "Dashboard";
            span.style.marginLeft = "8px";
            span.style.fontWeight = "800";
            el.appendChild(span);
          } else if (txt === "inicio" || txt === "principal") {
            el.innerText = "Dashboard";
          }
        }
      });
    });
  }

  function bindDashboardCards() {
    if (!isMobile()) return;

    const cards = qa("button, a, .card, .stat-card, .dashboard-card, [class*='card'], [role='button']");

    cards.forEach(el => {
      if (isOwnPatch(el)) return;
      if (el.dataset.nexuCardBound === "1") return;
      const text = normalize(el.innerText || el.textContent || "");

      if (text.includes("cobrado")) {
        el.dataset.nexuCardBound = "1";
        el.style.cursor = "pointer";
        el.addEventListener("click", ev => {
          ev.preventDefault();
          ev.stopPropagation();
          showHistorialPagos();
        }, true);
      } else if (text.includes("pendiente") && !text.includes("historial")) {
        el.dataset.nexuCardBound = "1";
        el.style.cursor = "pointer";
        el.addEventListener("click", ev => {
          ev.preventDefault();
          ev.stopPropagation();
          showCobrosPendientes();
        }, true);
      } else if (text.includes("clientes") && (text.includes("resumido") || text.includes("activos") || /^\s*clientes/i.test(el.innerText || ""))) {
        el.dataset.nexuCardBound = "1";
        el.style.cursor = "pointer";
        el.addEventListener("click", ev => {
          ev.preventDefault();
          ev.stopPropagation();
          showClientesResumido();
        }, true);
      }
    });
  }

  function isLayerVisibleByTextOrRole(el) {
    if (!visible(el)) return false;
    if (isOwnPatch(el)) return false;

    const txt = normalize(el.innerText || el.textContent || "");
    const cls = normalize(el.className || "");

    const looksLikeModal =
      cls.includes("modal") ||
      cls.includes("dialog") ||
      cls.includes("popup") ||
      txt.includes("cobros —") ||
      txt.includes("cobros -") ||
      txt.includes("total de cobros") ||
      txt.includes("este cliente no tiene cobros") ||
      txt.includes("cerrar") ||
      txt.includes("guardar");

    const looksLikeActionMenu =
      cls.includes("acciones") ||
      cls.includes("action") ||
      cls.includes("dropdown") ||
      cls.includes("acc-menu") ||
      txt.includes("cobros guardados") ||
      txt.includes("certificado pdf") ||
      txt.includes("documentos") ||
      txt.includes("enviar coberturas whatsapp");

    return looksLikeModal || looksLikeActionMenu;
  }

  function getOpenLayers() {
    const selectors = [
      ".modal",
      ".modal-content",
      ".dialog",
      ".popup",
      "[class*='modal']",
      "[class*='dialog']",
      "[class*='popup']",
      ".acc-menu",
      ".actions-menu",
      ".dropdown-menu",
      ".client-actions-menu",
      "[class*='acciones']",
      "[class*='action-menu']",
      "[class*='dropdown']"
    ].join(",");

    const direct = qa(selectors).filter(el => visible(el) && !isOwnPatch(el));

    const byText = qa("div, section, article, aside").filter(isLayerVisibleByTextOrRole);

    return Array.from(new Set([...direct, ...byText]));
  }

  function setLayerState() {
    if (!isMobile()) return;

    const bottomNav = q(".mobile-bottom-nav-nexu");
    const layers = getOpenLayers();

    if (bottomNav) {
      if (layers.length) bottomNav.classList.add("nexu-hidden-for-layer");
      else bottomNav.classList.remove("nexu-hidden-for-layer");
    }

    layers.forEach(el => {
      el.style.zIndex = "2147483000";
      el.style.pointerEvents = "auto";
    });

    qa(".acc-menu, .actions-menu, .dropdown-menu, .client-actions-menu, [class*='acciones'], [class*='action-menu'], [class*='dropdown']").forEach(el => {
      if (isOwnPatch(el) || !visible(el)) return;
      el.style.zIndex = "2147483600";
      el.style.pointerEvents = "auto";
      el.style.opacity = "1";
      el.style.visibility = "visible";
    });

    qa("button, a, [role='button'], [onclick]").forEach(btn => {
      if (!visible(btn)) return;
      btn.style.touchAction = "manipulation";
    });
  }

  function suppressLoginRefreshToast() {
    try {
      const originalAlert = window.alert;
      window.alert = function (msg) {
        const txt = normalize(msg);
        const nav = performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
        const reloaded = nav && nav.type === "reload";
        if (reloaded && txt.includes("inicio") && txt.includes("sesion")) return;
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
        version: "v3.2 estable",
        fecha: new Date().toISOString(),
        titulo: "Parche móvil estable",
        cambios: [
          "Barra inferior móvil corregida sin bloquear modales.",
          "Opción Más corregida.",
          "Se quitó Historial de actualizaciones del menú Más.",
          "Se agregó Clientes en proceso al menú Más.",
          "Se corrigieron capas de modales y menú de acciones en Clientes.",
          "Se restauró Dashboard en navegación lateral."
        ]
      });
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }

  function init() {
    injectCSS();
    suppressLoginRefreshToast();

    if (!isMobile()) return;

    removeOldPatchUI();
    buildBottomNav();
    buildMoreSheet();
    restoreDashboardName();
    bindDashboardCards();
    setLayerState();
    addChangelog();
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("resize", init);

  document.addEventListener("click", () => {
    setTimeout(() => {
      init();
      setLayerState();
    }, 120);
  }, true);

  document.addEventListener("touchstart", () => {
    setTimeout(setLayerState, 40);
  }, true);

  document.addEventListener("touchend", () => {
    setTimeout(() => {
      init();
      setLayerState();
    }, 120);
  }, true);

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    init();
    setLayerState();
    if (tries > 80) clearInterval(timer);
  }, 500);
})();
