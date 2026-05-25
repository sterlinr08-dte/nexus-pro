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
          font-size: 9.5px;
          font-weight: 700;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          border-radius: 14px;
          cursor: pointer;
          touch-action: manipulation;
          overflow: hidden !important;
          min-width: 0;
          padding: 0 2px;
          line-height: 1.1;
        }
        
        .mobile-bottom-nav-clean button span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          display: block;
          color: inherit !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        
        .mobile-bottom-nav-clean button span.ico {
          overflow: visible;
          text-overflow: clip;
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
    
    // Caso especial: Historial de pagos (va al módulo cobros que tiene el historial)
    if (vista === 'historial') {
      if (typeof window.nav === 'function') {
        try {
          window.nav('cobros');
          console.log('nav("cobros") → historial ✓');
          return true;
        } catch(e) {
          console.error('historial falló:', e);
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
      <button type="button" data-go="proceso">
        <span class="ico">📋</span>
        <span>Proceso</span>
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
      <button type="button" data-go="cobros">
        <span class="icon">💰</span>
        <span><b>Cobros</b></span>
      </button>
      <button type="button" data-go="historial">
        <span class="icon">📜</span>
        <span><b>Historial de pagos</b></span>
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
  // 4.5. CERRAR MENÚ "MÁS" AL TOCAR FUERA
  // ═══════════════════════════════════════════════════════════
  function setupCierreMenuFuera() {
    document.addEventListener('click', function(ev) {
      const sheet = document.querySelector('.mobile-more-sheet-clean');
      if (!sheet || !sheet.classList.contains('open')) return;
      // Si el clic NO fue dentro del sheet ni en el botón "Más"
      if (ev.target.closest('.mobile-more-sheet-clean')) return;
      if (ev.target.closest('button[data-go="mas"]')) return;
      sheet.classList.remove('open');
    }, true);
    // En móvil también con touchstart para que responda más rápido
    document.addEventListener('touchstart', function(ev) {
      const sheet = document.querySelector('.mobile-more-sheet-clean');
      if (!sheet || !sheet.classList.contains('open')) return;
      if (ev.target.closest('.mobile-more-sheet-clean')) return;
      if (ev.target.closest('button[data-go="mas"]')) return;
      sheet.classList.remove('open');
    }, true);
  }

  // ═══════════════════════════════════════════════════════════
  // 5. INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════
  function init() {
    injectCSS();
    if (!isMobile()) return;
    crearBarraInferior();
    crearMenuMas();
    setupCierreMenuFuera();
    console.log('%c⚙ Parches NEXUS PRO Móvil cargado', 'color:#2563eb;font-weight:bold');
  }
  
  // ═══════════════════════════════════════════════════════════
  // 5.5. REGISTRO AUTOMÁTICO EN CHANGELOG
  // ═══════════════════════════════════════════════════════════
  function registrarEnChangelog() {
    // Esperar a que el sistema esté cargado
    if (typeof window.guardarChangelogAuto !== 'function') {
      setTimeout(registrarEnChangelog, 1000);
      return;
    }
    
    // ID único de esta versión del parche (para no duplicar)
    const PARCHE_VERSION = 'parches-mobile-v4-2026-05-23';
    
    // Verificar si ya está registrado
    let registrados = [];
    try {
      registrados = JSON.parse(localStorage.getItem('nx_parches_registrados') || '[]');
    } catch(e) {}
    
    if (registrados.includes(PARCHE_VERSION)) return;
    
    // Registrar en el changelog
    try {
      const descripcion = [
        '📱 Parche Móvil v4 aplicado',
        '• Barra inferior: Inicio, Clientes, Facturas, En proceso, Más',
        '• Menú Más: Cobros, Historial, Configuración, Usuarios, Reportes',
        '• Menú Más se cierra al tocar fuera',
        '• Menú ⋮ del cliente blindado (no se puede tocar más)'
      ].join('\\n');
      
      window.guardarChangelogAuto(descripcion);
      
      // Marcar como registrado
      registrados.push(PARCHE_VERSION);
      localStorage.setItem('nx_parches_registrados', JSON.stringify(registrados));
      
      console.log('%c✓ Parche registrado en Changelog', 'color:#10b981;font-weight:bold');
    } catch(e) {
      console.error('No se pudo registrar en changelog:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. (Removido) Fix toggleAccMenu - ahora vive bloqueado en el HTML
  // ═══════════════════════════════════════════════════════════
  // El HTML tiene la versión correcta y protegida.
  // El parche ya NO intenta sobreescribirla.

  // Aplicar al cargar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(registrarEnChangelog, 2000);
    });
  } else {
    init();
    setTimeout(registrarEnChangelog, 2000);
  }

  // Reaplica al cambiar tamaño (rotar pantalla)
  window.addEventListener('resize', function() {
    setTimeout(init, 200);
  });


  // ═══════════════════════════════════════════════════════════
  // 8. (Removido) - Reemplazado por código de Fase 2 más abajo
  // ═══════════════════════════════════════════════════════════
  // El código de Fase 2 al final del archivo maneja:
  // - Click en COBRADO → Reporte Agente
  // - Desglose enriquecido por agente
  // - Transferencias entre agentes

})();


/* ==========================================================================
   NEXUS PRO - FASE 2: Reporte premium + Transferencias entre agentes
   Código de ChatGPT integrado y validado por Claude
   ========================================================================== */

(function () {
  "use strict";

  if (window.__NEXUS_AGENTES_COBROS_V2__) return;
  window.__NEXUS_AGENTES_COBROS_V2__ = true;

  const TRANSFER_TABLE = "transferencias_agentes";
  const PATCH_ID = "nexus_agentes_cobros_v2_sin_parpadeo";

  let isRendering = false;
  let lastRenderAt = 0;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function normalize(txt) {
    return String(txt || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function money(v) {
    if (typeof window.fmt === "function") return window.fmt(Number(v || 0));
    return "RD$ " + Number(v || 0).toLocaleString("es-DO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  function today() {
    if (typeof window.hoy === "function") return window.hoy();
    return new Date().toISOString().slice(0, 10);
  }

  function toastSafe(type, title, msg) {
    if (typeof window.toast === "function") window.toast(type, title, msg);
    else alert(title + "\n" + (msg || ""));
  }

  function st() { 
    // Acceder a ST directamente (variable global del sistema, no window.ST)
    try { 
      return (typeof ST !== 'undefined') ? ST : (window.ST || {}); 
    } catch(e) { 
      return window.ST || {}; 
    }
  }
  function getAgentes() { 
    const agt = Array.isArray(st().agentes) ? st().agentes : [];
    return agt;
  }
  
  // Acceder a API directamente
  function getAPI() {
    try {
      return (typeof API !== 'undefined') ? API : window.API;
    } catch(e) {
      return window.API;
    }
  }
  
  // Cargar agentes desde API si ST está vacío
  async function getAgentesAsync() {
    let agt = getAgentes();
    if (agt.length > 0) return agt;
    
    // Esperar a que ST.agentes se llene
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 250));
      agt = getAgentes();
      if (agt.length > 0) return agt;
    }
    
    // Último recurso: cargar directamente desde API
    const api = getAPI();
    if (api && typeof api.get === "function") {
      try {
        const data = await api.get("agentes", "select=*&order=nom");
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn("No se pudieron cargar agentes desde API:", e);
      }
    }
    return [];
  }
  function getClientes() { return Array.isArray(st().clientes) ? st().clientes : []; }
  function getFacturas() { return Array.isArray(st().facturas) ? st().facturas : []; }

  async function getAbonos() {
    // SIEMPRE cargar desde API porque ST.abonos no existe en NEXUS PRO
    const api = getAPI();
    if (api && typeof api.get === "function") {
      try {
        const data = await api.get("abonos", "select=*&order=fecha.desc&limit=5000");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn("NEXUS V2: no se pudieron cargar abonos:", e);
        return [];
      }
    }
    return [];
  }

  async function getTransferencias() {
    const api = getAPI();
    if (api && typeof api.get === "function") {
      try {
        const data = await api.get(TRANSFER_TABLE, "select=*&order=fecha.desc,created_at.desc&limit=1000");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function getClienteById(id) { return getClientes().find(c => String(c.id) === String(id)); }
  function getAgenteById(id) { return getAgentes().find(a => String(a.id) === String(id)); }
  function getAgenteNombreById(id) {
    const a = getAgenteById(id);
    return a?.nom || a?.nombre || a?.name || (id ? "Agente no encontrado" : "Sin agente");
  }
  function getAgenteNombre(agente) { return agente?.nom || agente?.nombre || agente?.name || "Sin nombre"; }
  function getAgenteRol(agente) { return agente?.cargo || agente?.rol || agente?.tipo || "Agente / corredor"; }
  function getAgenteLicencia(agente) { return agente?.licencia || agente?.lic || agente?.codigo || "Sin licencia"; }
  function getInitial(name) { return String(name || "A").trim().charAt(0).toUpperCase() || "A"; }

  function getAbonoAgenteId(abono) {
    return abono.agente_cobro || abono.agente_id || abono.agente ||
      getClienteById(abono.cliente_id)?.agente_id || "";
  }

  function tipoMetodo(metodo) {
    const m = normalize(metodo);
    if (m.includes("efectivo")) return "efectivo";
    if (m.includes("transferencia") || m.includes("deposito") || m.includes("depósito")) return "banco";
    if (m.includes("cheque")) return "cheque";
    return "otros";
  }

  function bancoNombre(abono) {
    const raw = abono.banco || abono.banco_nombre || abono.banco_otro || abono.bank || "";
    return String(raw || "Sin banco").trim() || "Sin banco";
  }

  function getFacturaClienteId(f) { return f.cliente_id || f.clienteId || f.id_cliente || ""; }

  function getFacturaPendiente(f) {
    const total = Number(f.total || 0);
    const pagado = Number(f.pagado || f.cobrado || 0);
    const estado = normalize(f.estado);
    if (estado.includes("pagado")) return 0;
    if (typeof f.pendiente !== "undefined") return Number(f.pendiente || 0);
    if (typeof f.balance !== "undefined") return Number(f.balance || 0);
    return Math.max(0, total - pagado);
  }

  function getClientePendiente(cliente) {
    const direct = cliente.pendiente ?? cliente.deuda_pendiente ?? cliente.balance ?? cliente.deuda_total ?? 0;
    return Number(direct || 0);
  }

  function calcularPendienteAgente(agenteId) {
    const clientesAgente = getClientes().filter(c => String(c.agente_id || "") === String(agenteId));
    const ids = new Set(clientesAgente.map(c => String(c.id)));
    const factPend = getFacturas().filter(f => ids.has(String(getFacturaClienteId(f))))
      .reduce((sum, f) => sum + getFacturaPendiente(f), 0);
    if (factPend > 0) return factPend;
    return clientesAgente.reduce((sum, c) => sum + getClientePendiente(c), 0);
  }

  function getMetaAgente(agente) {
    const direct = agente?.meta_mensual ?? agente?.meta ?? agente?.meta_cobros ?? agente?.objetivo ?? 0;
    const num = Number(direct || 0);
    return num > 0 ? num : 0;
  }

  function emptyStat(agente) {
    return { agente, total: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, bancos: {}, cobros: 0, clientes: 0, pendiente: 0, meta: 0, recibido: 0, entregado: 0, enMano: 0 };
  }

  function buildStats(abonos, transferencias) {
    const agentes = getAgentes();
    const clientes = getClientes();
    const stats = {};

    agentes.forEach(a => {
      const id = String(a.id);
      stats[id] = emptyStat(a);
      stats[id].clientes = clientes.filter(c => String(c.agente_id || "") === id).length;
      stats[id].pendiente = calcularPendienteAgente(id);
      stats[id].meta = getMetaAgente(a);
    });

    abonos.forEach(abono => {
      const agenteId = String(getAbonoAgenteId(abono) || "SIN_AGENTE");
      const monto = Number(abono.monto || 0);
      if (!monto) return;
      if (!stats[agenteId]) {
        stats[agenteId] = emptyStat({ id: agenteId, nom: agenteId === "SIN_AGENTE" ? "Sin agente asignado" : getAgenteNombreById(agenteId) });
      }
      const tipo = tipoMetodo(abono.metodo);
      stats[agenteId].total += monto;
      stats[agenteId][tipo] += monto;
      stats[agenteId].cobros += 1;
      if (tipo === "banco") {
        const banco = bancoNombre(abono);
        stats[agenteId].bancos[banco] = Number(stats[agenteId].bancos[banco] || 0) + monto;
      }
    });

    transferencias.forEach(t => {
      const monto = Number(t.monto || 0);
      if (!monto) return;
      const desde = String(t.desde_agente || t.agente_origen || t.desde || "");
      const hacia = String(t.hacia_agente || t.agente_destino || t.hacia || "");
      if (desde && !stats[desde]) stats[desde] = emptyStat({ id: desde, nom: getAgenteNombreById(desde) });
      if (hacia && !stats[hacia]) stats[hacia] = emptyStat({ id: hacia, nom: getAgenteNombreById(hacia) });
      if (desde) stats[desde].entregado += monto;
      if (hacia) stats[hacia].recibido += monto;
    });

    Object.values(stats).forEach(s => {
      s.enMano = Number(s.total || 0) + Number(s.recibido || 0) - Number(s.entregado || 0);
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }

  function efectividad(stat) {
    const base = Number(stat.meta || 0) || Number(stat.total + stat.pendiente || 0);
    if (!base) return 0;
    return Math.min(100, Math.round((Number(stat.total || 0) / base) * 100));
  }

  function generalFromStats(stats) {
    return stats.reduce((acc, s) => {
      acc.total += Number(s.total || 0);
      acc.efectivo += Number(s.efectivo || 0);
      acc.banco += Number(s.banco || 0);
      acc.cheque += Number(s.cheque || 0);
      acc.otros += Number(s.otros || 0);
      acc.pendiente += Number(s.pendiente || 0);
      acc.clientes += Number(s.clientes || 0);
      acc.enMano += Number(s.enMano || 0);
      Object.entries(s.bancos || {}).forEach(([b, v]) => { acc.bancos[b] = Number(acc.bancos[b] || 0) + Number(v || 0); });
      return acc;
    }, { total: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, pendiente: 0, clientes: 0, enMano: 0, bancos: {} });
  }

  function colorByPct(pct) {
    if (pct < 40) return "#dc2626";
    if (pct < 70) return "#d97706";
    return "#059669";
  }
  function createTransferModal() {
    if (q("#nxModalTransferAgenteV2")) return;
    const modal = document.createElement("div");
    modal.className = "overlay";
    modal.id = "nxModalTransferAgenteV2";
    modal.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="mt">
          <span>// TRANSFERENCIA ENTRE AGENTES</span>
          <button class="btn bghost bsm" type="button" onclick="window.nxCerrarTransferenciaAgenteV2()"><i class="ti ti-x"></i></button>
        </div>
        <div class="gf2">
          <div class="fr"><label>Agente que entrega *</label><select id="nxTA2Desde"></select></div>
          <div class="fr"><label>Agente que recibe *</label><select id="nxTA2Hacia"></select></div>
          <div class="fr"><label>Monto RD$ *</label><input type="number" id="nxTA2Monto" min="0.01" step="0.01" placeholder="0.00"></div>
          <div class="fr"><label>Método *</label><select id="nxTA2Metodo"><option>Efectivo</option><option>Transferencia</option></select></div>
          <div class="fr" id="nxTA2BancoWrap" style="display:none"><label>Banco</label><select id="nxTA2Banco"><option value="">Seleccionar...</option><option>BHD</option><option>Banreservas</option><option>Popular</option><option>Otros</option></select></div>
          <div class="fr" id="nxTA2BancoOtroWrap" style="display:none"><label>Otro banco</label><input type="text" id="nxTA2BancoOtro" placeholder="Nombre del banco"></div>
          <div class="fr"><label>Referencia *</label><input type="text" id="nxTA2Ref" placeholder="Número de recibo o transferencia"></div>
          <div class="fr"><label>Nota</label><input type="text" id="nxTA2Nota" placeholder="Opcional"></div>
        </div>
        <div class="nx-info-box-v2">Este movimiento ajusta el control interno para saber qué agente tiene el dinero.</div>
        <div class="fe">
          <button class="btn" type="button" onclick="window.nxCerrarTransferenciaAgenteV2()">Cancelar</button>
          <button class="btn bxl" type="button" onclick="window.nxGuardarTransferenciaAgenteV2()" id="nxTA2Btn"><i class="ti ti-check"></i> Guardar transferencia</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    q("#nxTA2Metodo")?.addEventListener("change", toggleBancoTransfer);
    q("#nxTA2Banco")?.addEventListener("change", toggleBancoOtroTransfer);
  }

  function fillAgentesSelects() {
    const agentes = getAgentes();
    const opts = '<option value="">Seleccionar...</option>' + agentes.map(a => '<option value="' + esc(a.id) + '">' + esc(getAgenteNombre(a)) + '</option>').join("");
    if (q("#nxTA2Desde")) q("#nxTA2Desde").innerHTML = opts;
    if (q("#nxTA2Hacia")) q("#nxTA2Hacia").innerHTML = opts;
  }

  function toggleBancoTransfer() {
    const metodo = q("#nxTA2Metodo")?.value || "";
    const show = metodo === "Transferencia";
    if (q("#nxTA2BancoWrap")) q("#nxTA2BancoWrap").style.display = show ? "block" : "none";
    if (!show) {
      if (q("#nxTA2Banco")) q("#nxTA2Banco").value = "";
      if (q("#nxTA2BancoOtro")) q("#nxTA2BancoOtro").value = "";
      if (q("#nxTA2BancoOtroWrap")) q("#nxTA2BancoOtroWrap").style.display = "none";
    } else {
      toggleBancoOtroTransfer();
    }
  }

  function toggleBancoOtroTransfer() {
    const banco = q("#nxTA2Banco")?.value || "";
    if (q("#nxTA2BancoOtroWrap")) q("#nxTA2BancoOtroWrap").style.display = banco === "Otros" ? "block" : "none";
  }

  window.nxAbrirTransferenciaAgenteV2 = async function () {
    createTransferModal();
    
    // Mostrar modal abierto con loading
    q("#nxModalTransferAgenteV2")?.classList.add("open");
    
    // Cargar agentes (con fallback a API)
    const agentes = await getAgentesAsync();
    
    if (agentes.length === 0) {
      if (typeof window.toast === 'function') {
        window.toast('err', 'Sin agentes', 'No hay agentes registrados en el sistema. Crea agentes desde Configuración primero.');
      }
      return;
    }
    
    // Llenar los selects con los agentes cargados
    fillAgentesSelects();
    toggleBancoTransfer();
  };

  window.nxCerrarTransferenciaAgenteV2 = function () {
    q("#nxModalTransferAgenteV2")?.classList.remove("open");
  };

  window.nxGuardarTransferenciaAgenteV2 = async function () {
    const desde = q("#nxTA2Desde")?.value || "";
    const hacia = q("#nxTA2Hacia")?.value || "";
    const monto = Number(q("#nxTA2Monto")?.value || 0);
    const metodo = q("#nxTA2Metodo")?.value || "Efectivo";
    const ref = (q("#nxTA2Ref")?.value || "").trim();
    const nota = (q("#nxTA2Nota")?.value || "").trim();
    let banco = "";

    if (!desde) return toastSafe("err", "Agente requerido", "Selecciona el agente que entrega");
    if (!hacia) return toastSafe("err", "Agente requerido", "Selecciona el agente que recibe");
    if (desde === hacia) return toastSafe("err", "Movimiento inválido", "El agente que entrega y recibe no puede ser el mismo");
    if (!monto || monto <= 0) return toastSafe("err", "Monto inválido", "Escribe un monto mayor a cero");
    if (!ref) return toastSafe("err", "Referencia requerida", "Escribe una referencia");

    if (metodo === "Transferencia") {
      banco = q("#nxTA2Banco")?.value || "";
      if (!banco) return toastSafe("err", "Banco requerido", "Selecciona el banco");
      if (banco === "Otros") {
        banco = (q("#nxTA2BancoOtro")?.value || "").trim();
        if (!banco) return toastSafe("err", "Banco requerido", "Escribe el nombre del banco");
      }
    }

    const api = getAPI();
    if (!api?.post) return toastSafe("err", "API no disponible", "No se encontró API.post");

    const btn = q("#nxTA2Btn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spin"></div>'; }

    const payload = { desde_agente: desde, hacia_agente: hacia, monto, metodo, banco: banco || null, referencia: ref, nota: nota || null, fecha: today() };

    try {
      await api.post(TRANSFER_TABLE, payload);
      if (typeof window.logAudit === "function") {
        window.logAudit("TRANSFERENCIA_AGENTE", getAgenteNombreById(desde) + " → " + getAgenteNombreById(hacia) + " · " + money(monto) + " · " + metodo + (banco ? " · " + banco : ""), "Cobros");
      }
      toastSafe("ok", "Transferencia registrada", getAgenteNombreById(desde) + " → " + getAgenteNombreById(hacia) + " · " + money(monto));
      window.nxCerrarTransferenciaAgenteV2();
      // Refrescar Detalles de Cobro si está visible
      if (typeof window.nxAbrirDetallesCobro === 'function') {
        const cDet = document.getElementById('nxDetallesCobroV1');
        if (cDet && cDet.style.display !== 'none') {
          window.nxAbrirDetallesCobro();
        }
      }
    } catch (e) {
      console.error("Error guardando transferencia:", e);
      toastSafe("err", "No se pudo guardar", "Verifica que exista la tabla transferencias_agentes en Supabase");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar transferencia'; }
    }
  };




  function injectStyles() {
    if (q("#nxReporteAgentesV2CSS")) return;
    const style = document.createElement("style");
    style.id = "nxReporteAgentesV2CSS";
    style.textContent = `#nxReporteAgentesV2{margin-bottom:14px}.nx-report-v2{border-top:4px solid #7c3aed !important}.nx-report-head-v2{align-items:flex-start !important}.nx-actions-v2{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.nx-top-summary-v2{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-bottom:12px}.nx-top-summary-v2>div{border-radius:16px;padding:14px;border:1px solid #e2e8f0;background:#fff}.nx-top-summary-v2 span{display:block;font-size:10px;font-weight:900;color:#64748b;letter-spacing:.5px;text-transform:uppercase}.nx-top-summary-v2 b{display:block;margin-top:5px;font-size:22px;color:#0f172a}.nx-top-summary-v2 .green{background:#f0fdf4;border-color:#bbf7d0}.nx-top-summary-v2 .green b{color:#059669}.nx-top-summary-v2 .blue{background:#eff6ff;border-color:#bfdbfe}.nx-top-summary-v2 .blue b{color:#2563eb}.nx-top-summary-v2 .red{background:#fef2f2;border-color:#fecaca}.nx-top-summary-v2 .red b{color:#dc2626}.nx-top-summary-v2 .gray{background:#f8fafc;border-color:#e2e8f0}.nx-method-summary-v2{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;margin-bottom:12px}.nx-method-card{border:1px solid;border-radius:14px;padding:12px}.nx-method-card span{display:block;font-size:10px;font-weight:900;letter-spacing:.4px}.nx-method-card b{display:block;margin-top:5px;font-size:19px;font-weight:900}.nx-two-cols-v2{display:grid;grid-template-columns:1fr 1.2fr;gap:10px;margin-bottom:12px}.nx-box-v2{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px}.nx-box-v2 h3{font-size:12px;margin:0 0 8px;color:#0f172a;font-weight:900}.nx-bank-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #eef2f7;font-size:12px}.nx-bank-row span{font-weight:800;color:#1e293b}.nx-bank-row b{color:#2563eb}.nx-transfer-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.nx-transfer-table-wrap table{min-width:680px}.nx-transfer-table-wrap td,.nx-transfer-table-wrap th{font-size:11px}.nx-agents-grid-v2{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}.nx-agent-card-v2{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:16px;box-shadow:0 10px 28px rgba(15,23,42,.08)}.nx-agent-head-v2{display:flex;align-items:center;gap:12px}.nx-agent-avatar-v2{width:50px;height:50px;border-radius:18px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;display:grid;place-items:center;font-size:20px;font-weight:900;box-shadow:0 10px 22px rgba(124,58,237,.28);flex:0 0 auto}.nx-agent-info-v2{min-width:0;flex:1}.nx-agent-name-v2{font-size:15px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-agent-role-v2,.nx-agent-license-v2,.nx-agent-clientes-v2{font-size:10px;color:#64748b;margin-top:2px;font-weight:700}.nx-agent-effect-v2{text-align:center;flex:0 0 auto}.nx-effect-circle-v2{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(closest-side,#fff 72%,transparent 74%),conic-gradient(var(--clr) calc(var(--pct) * 1%),#e2e8f0 0)}.nx-effect-circle-v2 span{font-size:12px;font-weight:900;color:var(--clr)}.nx-agent-effect-v2 small{display:block;margin-top:3px;font-size:8px;color:#64748b;font-weight:900}.nx-agent-main-money{background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:18px;padding:14px;margin:14px 0 10px}.nx-agent-main-money span{display:block;font-size:10px;color:#059669;font-weight:900;letter-spacing:.6px}.nx-agent-main-money b{display:block;margin-top:4px;font-size:24px;line-height:1;color:#059669;font-weight:900}.nx-agent-methods-v2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:10px}.nx-mini-title{font-size:9px;color:#64748b;font-weight:900;text-transform:uppercase;margin:7px 0}.nx-bank-pills{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}.nx-bank-pills span{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800}.nx-agent-balance-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}.nx-agent-balance-grid>div{background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:9px}.nx-agent-balance-grid span{display:block;font-size:8px;color:#64748b;font-weight:900;text-transform:uppercase}.nx-agent-balance-grid b{display:block;margin-top:4px;font-size:12px;color:#0f172a;font-weight:900}.nx-agent-balance-grid b.danger{color:#dc2626}.nx-agent-balance-grid b.blue{color:#2563eb}.nx-agent-balance-grid small{display:block;font-size:8px;color:#94a3b8;margin-top:3px;line-height:1.2}.nx-transfer-mini{display:flex;gap:8px;flex-wrap:wrap;font-size:10px;color:#64748b;margin-top:8px}.nx-transfer-mini b{color:#0f172a}.nx-progress-v2{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:9px}.nx-progress-v2 i{display:block;height:100%;border-radius:999px}.nx-empty-soft{background:#f8fafc;border:1px dashed #cbd5e1;color:#94a3b8;border-radius:12px;padding:10px;font-size:10px;font-weight:800}.nx-empty-card-v2{background:#f8fafc;border:1px dashed #cbd5e1;color:#64748b;border-radius:18px;padding:24px;text-align:center;font-weight:800}.nx-info-box-v2{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;font-size:11px;color:#1e3a6e;margin-top:8px}@media(max-width:768px){.nx-two-cols-v2{grid-template-columns:1fr}.nx-agents-grid-v2{grid-template-columns:1fr}.nx-method-summary-v2{grid-template-columns:1fr}.nx-agent-methods-v2{grid-template-columns:1fr}.nx-agent-balance-grid{grid-template-columns:1fr}.nx-top-summary-v2{grid-template-columns:repeat(2,minmax(0,1fr))}.nx-actions-v2{justify-content:flex-start;margin-top:8px}}`;
    document.head.appendChild(style);
  }

  function init() {
    injectStyles();
    createTransferModal();
    // DESACTIVADO: el reporte premium viejo. Ahora vive en Detalles de Cobro V2
    // wrapReporteAgente();
    // bindDashboardCobrado();
    // (no se ejecuta el render automático del reporte viejo)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  // DESACTIVADO: listeners del reporte premium viejo (ahora en Detalles de Cobro V2)
})();


/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - DETALLES DE COBRO DASHBOARD V2 PREMIUM
   - Diseño 1:1 con la referencia (KPIs en fila, donut SVG, tabla agentes)
   - Mantiene: ciclos 20-20, selector 7 ciclos, botón Volver,
              hook KPI COBRADO, botón Transferir, ST/API directos
   ════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (window.__NEXUS_DETALLES_COBRO_V2__) return;
  window.__NEXUS_DETALLES_COBRO_V2__ = true;

  // ═══════════════════════════════════════════════════════════
  // HELPERS — ST y API directos (sin window.ST / window.API)
  // ═══════════════════════════════════════════════════════════
  function st() {
    try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); }
    catch(e) { return window.ST || {}; }
  }
  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function getFmt() {
    return (typeof fmt === 'function') ? fmt :
      (n => 'RD$ ' + Number(n||0).toLocaleString('en-US',
        {minimumFractionDigits: 0, maximumFractionDigits: 0}));
  }
  function fmtCorto(n) {
    n = Number(n || 0);
    if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'') + 'M';
    if (n >= 1000) return Math.round(n/1000) + 'K';
    return n.toFixed(0);
  }
  function getGAgt(id) {
    if (typeof gAgt === 'function') return gAgt(id);
    return (st().agentes || []).find(a => String(a.id) === String(id));
  }
  function normMet(m) {
    const s = String(m||'').toLowerCase();
    if (s.includes('efectivo')) return 'efectivo';
    if (s.includes('transferencia') || s.includes('deposito') || s.includes('depósito')) return 'banco';
    if (s.includes('cheque')) return 'cheque';
    return 'otros';
  }
  function fmtFecha(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-DO', { day:'2-digit', month:'2-digit', year:'numeric' });
    } catch(e) { return iso; }
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  // ═══════════════════════════════════════════════════════════
  // CICLOS 20-20
  // ═══════════════════════════════════════════════════════════
  function calcularPeriodo() {
    const hoy = new Date();
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 20);
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 20);
    return { inicio, fin };
  }
  function enRango(fechaStr, inicio, fin) {
    if (!fechaStr) return false;
    try {
      const f = new Date(fechaStr);
      return f >= inicio && f < fin;
    } catch(e) { return false; }
  }
  function nombreCiclo(periodo) {
    const meses = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    const di = String(periodo.inicio.getDate()).padStart(2,'0');
    const df = String(periodo.fin.getDate()).padStart(2,'0');
    const mi = meses[periodo.inicio.getMonth()];
    const mf = meses[periodo.fin.getMonth()];
    const yf = periodo.fin.getFullYear();
    return `${di} ${mi} – ${df} ${mf} ${yf}`;
  }

  let cicloSeleccionado = null;

  function calcularUltimosCiclos(cantidad) {
    cantidad = cantidad || 6;
    const ciclos = [];
    const base = calcularPeriodo();

    // Ciclo EN CURSO (siguiente al cerrado actual)
    const cursoIni = new Date(base.inicio);
    const cursoFin = new Date(base.fin);
    cursoIni.setMonth(cursoIni.getMonth() + 1);
    cursoFin.setMonth(cursoFin.getMonth() + 1);
    ciclos.push({
      inicio: cursoIni, fin: cursoFin,
      nombre: nombreCiclo({inicio: cursoIni, fin: cursoFin}) + ' · EN CURSO',
      key: `${cursoIni.getTime()}_${cursoFin.getTime()}`,
      enCurso: true
    });

    // 6 ciclos cerrados (del más reciente al más antiguo)
    for (let i = 0; i < cantidad; i++) {
      const ini = new Date(base.inicio); ini.setMonth(ini.getMonth() - i);
      const fin = new Date(base.fin); fin.setMonth(fin.getMonth() - i);
      ciclos.push({
        inicio: ini, fin: fin,
        nombre: nombreCiclo({inicio: ini, fin: fin}),
        key: `${ini.getTime()}_${fin.getTime()}`
      });
    }
    return ciclos;
  }

  function handleCambioCiclo(key, ciclos) {
    const c = ciclos.find(x => x.key === key);
    if (c) { cicloSeleccionado = c; renderDetallesCobro(); }
  }
  function navegarCiclo(direccion, ciclos) {
    const actualKey = cicloSeleccionado ? cicloSeleccionado.key : ciclos[0].key;
    const idx = ciclos.findIndex(c => c.key === actualKey);
    const nuevoIdx = idx + direccion;
    if (nuevoIdx >= 0 && nuevoIdx < ciclos.length) {
      cicloSeleccionado = ciclos[nuevoIdx];
      renderDetallesCobro();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // COLORES DE AGENTE (hash estable por nombre)
  // ═══════════════════════════════════════════════════════════
  const AGENT_COLORS = ['#a855f7','#06b6d4','#ef4444','#f97316','#ec4899','#10b981','#3b82f6','#f59e0b','#8b5cf6','#14b8a6'];
  function colorForAgent(nombre) {
    let hash = 0;
    const s = String(nombre || '');
    for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
    return AGENT_COLORS[Math.abs(hash) % AGENT_COLORS.length];
  }

  // ═══════════════════════════════════════════════════════════
  // CARGA DE DATOS (API directa)
  // ═══════════════════════════════════════════════════════════
  async function cargarAbonos() {
    const api = getAPI();
    if (!api || !api.get) return [];
    try {
      const data = await api.get('abonos', 'select=*&order=fecha.desc&limit=5000');
      return Array.isArray(data) ? data : [];
    } catch(e) {
      console.warn('No se pudieron cargar abonos:', e);
      return [];
    }
  }
  async function cargarTransferencias() {
    const api = getAPI();
    if (!api || !api.get) return [];
    try {
      const data = await api.get('transferencias_agentes', 'select=*&order=fecha.desc&limit=1000');
      return Array.isArray(data) ? data : [];
    } catch(e) { return []; }
  }

  async function cargarEntregasAdmin() {
    const api = getAPI();
    if (!api || !api.get) return [];
    try {
      const data = await api.get('entregas_admin', 'select=*&order=fecha.desc,created_at.desc&limit=2000');
      return Array.isArray(data) ? data : [];
    } catch(e) {
      console.warn('No se pudieron cargar entregas_admin:', e);
      return [];
    }
  }

  // Verifica si el usuario actual es admin (mismo patrón que aplicarRolSidebar)
  function esAdmin() {
    try {
      return (typeof sesion !== 'undefined') && sesion?.rol === 'admin';
    } catch(e) {
      try { return window.sesion?.rol === 'admin'; } catch(_) { return false; }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════
  function calcularKPIs(abonos, periodo) {
    const enPeriodo = abonos.filter(a => enRango(a.fecha, periodo.inicio, periodo.fin));
    const total = enPeriodo.reduce((s, a) => s + Number(a.monto || 0), 0);
    const stats = {
      total, cantidad: enPeriodo.length,
      efectivo: 0, banco: 0, cheque: 0, otros: 0
    };
    enPeriodo.forEach(a => { stats[normMet(a.metodo)] += Number(a.monto || 0); });
    return { stats, abonosPeriodo: enPeriodo };
  }

  function calcularPendienteTotal() {
    const facturas = Array.isArray(st().facturas) ? st().facturas : [];
    const clientes = Array.isArray(st().clientes) ? st().clientes : [];
    const factPend = facturas.reduce((sum, f) => {
      const estado = String(f.estado||'').toLowerCase();
      if (estado.includes('pagado')) return sum;
      const total = Number(f.total || 0);
      const pagado = Number(f.pagado || f.cobrado || 0);
      const pend = (f.pendiente != null) ? Number(f.pendiente) :
                   (f.balance != null)   ? Number(f.balance) :
                   Math.max(0, total - pagado);
      return sum + pend;
    }, 0);
    if (factPend > 0) return factPend;
    return clientes.reduce((sum, c) =>
      sum + Number(c.pendiente ?? c.deuda_pendiente ?? c.balance ?? c.deuda_total ?? 0), 0);
  }

  function bancoNombre(a) {
    const raw = a.banco || a.banco_nombre || a.banco_otro || a.bank || '';
    return String(raw).trim() || 'Sin banco';
  }

  function calcularPorBanco(abonosPeriodo) {
    const porBanco = {};
    abonosPeriodo.forEach(a => {
      if (normMet(a.metodo) !== 'banco') return;
      const b = bancoNombre(a);
      if (!porBanco[b]) porBanco[b] = { monto: 0, cantidad: 0 };
      porBanco[b].monto += Number(a.monto || 0);
      porBanco[b].cantidad += 1;
    });
    return Object.entries(porBanco)
      .map(([nombre, d]) => ({nombre, ...d}))
      .sort((x, y) => y.monto - x.monto);
  }

  function calcularPorAgente(abonosPeriodo, transferenciasPeriodo, abonosAll, transferenciasAll, periodoFin, entregasAll) {
    const agentes = Array.isArray(st().agentes) ? st().agentes : [];

    // ACUMULADO: todo lo que pasó ANTES del fin del ciclo seleccionado
    // (igual a las funciones del periodo pero sin el filtro de inicio)
    const hasta = periodoFin ? new Date(periodoFin) : new Date();
    const antesDelFin = (arr) => (Array.isArray(arr) ? arr : []).filter(x => {
      if (!x.fecha) return false;
      try { return new Date(x.fecha) < hasta; } catch(e) { return false; }
    });
    const abonosAcum = antesDelFin(abonosAll);
    const transferenciasAcum = antesDelFin(transferenciasAll);
    const entregasAcum = antesDelFin(entregasAll || []);
    const entregasPeriodo = (entregasAll || []).filter(e =>
      enRango(e.fecha, periodoFin ? new Date(new Date(periodoFin).getTime() - 31*24*60*60*1000) : new Date(0), new Date(periodoFin))
    );

    return agentes.map(ag => {
      // ── DEL CICLO ──
      const propios = abonosPeriodo.filter(a => String(a.agente_cobro) === String(ag.id));
      const cobrado = propios.reduce((s, a) => s + Number(a.monto || 0), 0);
      const desglose = { efectivo: 0, banco: 0, cheque: 0, otros: 0 };
      propios.forEach(a => { desglose[normMet(a.metodo)] += Number(a.monto || 0); });
      const recibidas = transferenciasPeriodo
        .filter(t => String(t.hacia_agente) === String(ag.id))
        .reduce((s, t) => s + Number(t.monto || 0), 0);
      const entregadas = transferenciasPeriodo
        .filter(t => String(t.desde_agente) === String(ag.id))
        .reduce((s, t) => s + Number(t.monto || 0), 0);
      const entregadasAdmin = entregasPeriodo
        .filter(e => String(e.agente_id) === String(ag.id))
        .reduce((s, e) => s + Number(e.monto || 0), 0);
      const enMano = cobrado + recibidas - entregadas - entregadasAdmin;

      // ── ACUMULADO (hasta el fin del ciclo) ──
      const propiosAcum = abonosAcum.filter(a => String(a.agente_cobro) === String(ag.id));
      const cobradoAcum = propiosAcum.reduce((s, a) => s + Number(a.monto || 0), 0);
      const recibidasAcum = transferenciasAcum
        .filter(t => String(t.hacia_agente) === String(ag.id))
        .reduce((s, t) => s + Number(t.monto || 0), 0);
      const entregadasAcum = transferenciasAcum
        .filter(t => String(t.desde_agente) === String(ag.id))
        .reduce((s, t) => s + Number(t.monto || 0), 0);
      const entregadasAdminAcum = entregasAcum
        .filter(e => String(e.agente_id) === String(ag.id))
        .reduce((s, e) => s + Number(e.monto || 0), 0);
      const entregasAdminPendientes = entregasAcum
        .filter(e => String(e.agente_id) === String(ag.id) && !e.confirmado)
        .reduce((s, e) => s + Number(e.monto || 0), 0);
      const enManoAcumulado = cobradoAcum + recibidasAcum - entregadasAcum - entregadasAdminAcum;

      return {
        id: ag.id,
        nombre: ag.nom,
        inicial: String(ag.nom || 'A').trim().charAt(0).toUpperCase() || 'A',
        color: colorForAgent(ag.nom),
        cantidad: propios.length,
        cobrado, desglose,
        recibidas, entregadas, entregadasAdmin, enMano,
        cobradoAcum, recibidasAcum, entregadasAcum, entregadasAdminAcum,
        entregasAdminPendientes, enManoAcumulado
      };
    }).filter(a => a.cobrado > 0 || a.recibidas > 0 || a.entregadas > 0 ||
                   a.entregadasAdmin > 0 || a.enManoAcumulado !== 0)
      .sort((a, b) => b.cobrado - a.cobrado);
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — DONUT SVG
  // ═══════════════════════════════════════════════════════════
  function renderDonut(stats) {
    const total = stats.total;
    const F = getFmt();

    if (total === 0) {
      return `
        <div class="nxDC-donut-block">
          <div class="nxDC-donut-chart">
            <svg viewBox="0 0 200 200" class="nxDC-donut-svg" aria-hidden="true">
              <circle cx="100" cy="100" r="70" fill="none" stroke="#e2e8f0" stroke-width="24"/>
            </svg>
            <div class="nxDC-donut-center">
              <div class="nxDC-donut-lbl">Sin datos</div>
            </div>
          </div>
          <div class="nxDC-legend"><div class="nxDC-leg-empty">Sin cobros en este ciclo</div></div>
        </div>
      `;
    }

    const radius = 70, cx = 100, cy = 100;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const segmentos = [
      { color: '#10b981', value: stats.efectivo, label: 'Efectivo' },
      { color: '#3b82f6', value: stats.banco,    label: 'Banco / Transferencia' },
      { color: '#f59e0b', value: stats.cheque,   label: 'Cheque' },
      { color: '#a855f7', value: stats.otros,    label: 'Otros' }
    ];

    const paths = segmentos.map(s => {
      if (s.value === 0) return '';
      const pct = s.value / total;
      const len = pct * circumference;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${radius}"
        fill="none" stroke="${s.color}" stroke-width="24"
        stroke-dasharray="${len.toFixed(2)} ${circumference.toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})"
        style="transition:stroke-dasharray .4s ease"/>`;
      offset += len;
      return seg;
    }).join('');

    const leyenda = segmentos.map(s => {
      const pct = total > 0 ? ((s.value/total)*100).toFixed(1) : '0.0';
      return `
        <div class="nxDC-leg-item">
          <div class="nxDC-leg-dot" style="background:${s.color}"></div>
          <div class="nxDC-leg-name">${s.label}</div>
          <div class="nxDC-leg-val">${F(s.value)}</div>
          <div class="nxDC-leg-pct">${pct}%</div>
        </div>
      `;
    }).join('');

    return `
      <div class="nxDC-donut-block">
        <div class="nxDC-donut-chart">
          <svg viewBox="0 0 200 200" class="nxDC-donut-svg" aria-hidden="true">
            <circle cx="100" cy="100" r="70" fill="none" stroke="#f1f5f9" stroke-width="24"/>
            ${paths}
          </svg>
          <div class="nxDC-donut-center">
            <div class="nxDC-donut-amt">RD$</div>
            <div class="nxDC-donut-val">${fmtCorto(total)}</div>
            <div class="nxDC-donut-lbl">Total</div>
          </div>
        </div>
        <div class="nxDC-legend">${leyenda}</div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — HEADER PREMIUM
  // ═══════════════════════════════════════════════════════════
  function renderHeader(ciclos, periodoActivo, indexActual) {
    const opts = ciclos.map(c =>
      `<option value="${c.key}" ${c.key === periodoActivo.key ? 'selected' : ''}>${esc(c.nombre)}</option>`
    ).join('');

    return `
      <div class="nxDC-head">
        <div class="nxDC-head-left">
          <div class="nxDC-head-icon"><i class="ti ti-currency-dollar"></i></div>
          <div>
            <h1 class="nxDC-head-title">DETALLES DE COBRO</h1>
            <div class="nxDC-head-sub">Control financiero por agente, método, banco y transferencias internas</div>
          </div>
        </div>
        <div class="nxDC-head-right">
          <div class="nxDC-period">
            <div class="nxDC-period-label">Período de facturación</div>
            <div class="nxDC-period-controls">
              <button class="nxDC-period-nav" id="nxDCAnterior" ${indexActual === ciclos.length - 1 ? 'disabled' : ''} title="Ciclo anterior" type="button">
                <i class="ti ti-chevron-left"></i>
              </button>
              <select id="nxDCCicloSelect" class="nxDC-period-select">${opts}</select>
              <button class="nxDC-period-nav" id="nxDCSiguiente" ${indexActual === 0 ? 'disabled' : ''} title="Ciclo más reciente" type="button">
                <i class="ti ti-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — 4 KPIs PRINCIPALES
  // ═══════════════════════════════════════════════════════════
  function renderKPIsRow(stats, pendiente, totalTransferido, dineroEnMano, dineroEnManoAcumulado) {
    const F = getFmt();
    const acum = (typeof dineroEnManoAcumulado === 'number') ? dineroEnManoAcumulado : dineroEnMano;
    return `
      <div class="nxDC-kpis-row">
        <div class="nxDC-kpi">
          <div class="nxDC-kpi-icon" style="background:#dcfce7;color:#059669">
            <i class="ti ti-currency-dollar"></i>
          </div>
          <div class="nxDC-kpi-body">
            <div class="nxDC-kpi-label">TOTAL COBRADO DEL CICLO</div>
            <div class="nxDC-kpi-value" style="color:#059669">${F(stats.total)}</div>
            <div class="nxDC-kpi-sub">Acumulado del período actual</div>
          </div>
        </div>
        <div class="nxDC-kpi">
          <div class="nxDC-kpi-icon" style="background:#ffedd5;color:#ea580c">
            <i class="ti ti-trophy"></i>
          </div>
          <div class="nxDC-kpi-body">
            <div class="nxDC-kpi-label">TOTAL PENDIENTE DEL MES</div>
            <div class="nxDC-kpi-value" style="color:#ea580c">${F(pendiente)}</div>
            <div class="nxDC-kpi-sub">Pendiente por cobrar</div>
          </div>
        </div>
        <div class="nxDC-kpi">
          <div class="nxDC-kpi-icon" style="background:#dbeafe;color:#2563eb">
            <i class="ti ti-transfer"></i>
          </div>
          <div class="nxDC-kpi-body">
            <div class="nxDC-kpi-label">TRANSFERIDO ENTRE AGENTES</div>
            <div class="nxDC-kpi-value" style="color:#2563eb">${F(totalTransferido)}</div>
            <div class="nxDC-kpi-sub">Envíos entre agentes</div>
          </div>
        </div>
        <div class="nxDC-kpi">
          <div class="nxDC-kpi-icon" style="background:#f3e8ff;color:#7c3aed">
            <i class="ti ti-wallet"></i>
          </div>
          <div class="nxDC-kpi-body">
            <div class="nxDC-kpi-label">DINERO EN MANO REAL</div>
            <div class="nxDC-kpi-value" style="color:#7c3aed">${F(acum)}</div>
            <div class="nxDC-kpi-sub">Acumulado · <strong>${F(dineroEnMano)}</strong> del ciclo</div>
          </div>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — BANCOS (lista limpia con total)
  // ═══════════════════════════════════════════════════════════
  function renderBancos(porBanco, totalBanco) {
    const F = getFmt();
    if (!porBanco.length) {
      return `
        <div class="nxDC-card">
          <div class="nxDC-card-title">DÓNDE ESTÁ EL DINERO (BANCOS)</div>
          <div class="nxDC-empty-soft">Sin cobros por transferencia/depósito en este ciclo</div>
        </div>
      `;
    }
    const rows = porBanco.map(b => `
      <div class="nxDC-banco-row">
        <div class="nxDC-banco-cell">
          <i class="ti ti-building-bank"></i>
          <span>${esc(b.nombre)}</span>
        </div>
        <div class="nxDC-banco-monto">${F(b.monto)}</div>
      </div>
    `).join('');

    return `
      <div class="nxDC-card">
        <div class="nxDC-card-title">DÓNDE ESTÁ EL DINERO (BANCOS)</div>
        <div class="nxDC-bancos-list">
          ${rows}
          <div class="nxDC-banco-total">
            <div>Total en bancos</div>
            <div>${F(totalBanco)}</div>
          </div>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — TABLA DE AGENTES
  // ═══════════════════════════════════════════════════════════
  function renderTablaAgentes(porAgente, hayTransferencias) {
    const F = getFmt();
    if (!porAgente.length) {
      return `
        <div class="nxDC-card">
          <div class="nxDC-card-head">
            <div class="nxDC-card-title">DETALLE POR AGENTE</div>
          </div>
          <div class="nxDC-empty-soft">Sin actividad de agentes en este ciclo</div>
        </div>
      `;
    }

    const totales = porAgente.reduce((acc, a) => {
      acc.cobrado += a.cobrado;
      acc.efectivo += a.desglose.efectivo;
      acc.banco += a.desglose.banco;
      acc.cheque += a.desglose.cheque;
      acc.otros += a.desglose.otros;
      acc.enMano += a.enMano;
      acc.enManoAcumulado += (a.enManoAcumulado || 0);
      return acc;
    }, {cobrado:0, efectivo:0, banco:0, cheque:0, otros:0, enMano:0, enManoAcumulado:0});

    const filas = porAgente.map(a => `
      <tr>
        <td class="nxDC-ag-name-cell">
          <div class="nxDC-ag-avatar" style="background:${a.color}">${esc(a.inicial)}</div>
          <span>${esc(a.nombre)}</span>
        </td>
        <td class="nxDC-num nxDC-num-green">${F(a.cobrado)}</td>
        <td class="nxDC-num">${F(a.desglose.efectivo)}</td>
        <td class="nxDC-num">${F(a.desglose.banco)}</td>
        <td class="nxDC-num">${F(a.desglose.cheque)}</td>
        <td class="nxDC-num">${F(a.desglose.otros)}</td>
        <td class="nxDC-num nxDC-num-stack">
          <div class="nxDC-stack-big nxDC-num-blue">${F(a.enManoAcumulado || 0)}</div>
          <div class="nxDC-stack-small">+ ${F(a.enMano)} <span class="nxDC-muted-xs">ciclo</span></div>
        </td>
      </tr>
    `).join('');

    return `
      <div class="nxDC-card">
        <div class="nxDC-card-head">
          <div class="nxDC-card-title">DETALLE POR AGENTE</div>
        </div>
        <div class="nxDC-table-wrap">
          <table class="nxDC-table">
            <thead>
              <tr>
                <th>AGENTE</th>
                <th class="nxDC-num">TOTAL COBRADO<br>DEL CICLO</th>
                <th class="nxDC-num">EFECTIVO</th>
                <th class="nxDC-num">BANCO</th>
                <th class="nxDC-num">CHEQUE</th>
                <th class="nxDC-num">OTROS</th>
                <th class="nxDC-num">DINERO EN MANO<br><span class="nxDC-muted-sm">acumulado / ciclo</span></th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
            <tfoot>
              <tr>
                <td><strong>TOTAL GENERAL</strong></td>
                <td class="nxDC-num nxDC-num-green"><strong>${F(totales.cobrado)}</strong></td>
                <td class="nxDC-num nxDC-num-green"><strong>${F(totales.efectivo)}</strong></td>
                <td class="nxDC-num nxDC-num-green"><strong>${F(totales.banco)}</strong></td>
                <td class="nxDC-num nxDC-num-green"><strong>${F(totales.cheque)}</strong></td>
                <td class="nxDC-num nxDC-num-green"><strong>${F(totales.otros)}</strong></td>
                <td class="nxDC-num nxDC-num-stack">
                  <div class="nxDC-stack-big nxDC-num-blue"><strong>${F(totales.enManoAcumulado)}</strong></div>
                  <div class="nxDC-stack-small">+ ${F(totales.enMano)} <span class="nxDC-muted-xs">ciclo</span></div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — TRANSFERENCIAS: resumen + historial
  // ═══════════════════════════════════════════════════════════
  function renderTransferenciasResumen(transferenciasPeriodo) {
    const F = getFmt();
    const totalEnviado = transferenciasPeriodo.reduce((s, t) => s + Number(t.monto || 0), 0);
    const totalRecibido = totalEnviado;
    const neto = Math.abs(totalEnviado - totalRecibido);

    return `
      <div class="nxDC-card">
        <div class="nxDC-card-title">TRANSFERENCIAS ENTRE AGENTES <span class="nxDC-muted">(RESUMEN)</span></div>
        <div class="nxDC-transf-summary">
          <div class="nxDC-transf-box nxDC-transf-out">
            <div class="nxDC-transf-head">
              <i class="ti ti-arrow-up"></i>
              <span>ENVIADO</span>
            </div>
            <div class="nxDC-transf-val">${F(totalEnviado)}</div>
            <div class="nxDC-transf-sub">Total enviado</div>
          </div>
          <div class="nxDC-transf-box nxDC-transf-in">
            <div class="nxDC-transf-head">
              <i class="ti ti-arrow-down"></i>
              <span>RECIBIDO</span>
            </div>
            <div class="nxDC-transf-val">${F(totalRecibido)}</div>
            <div class="nxDC-transf-sub">Total recibido</div>
          </div>
        </div>
        <div class="nxDC-neto">
          <div class="nxDC-neto-label">NETO ENTRE AGENTES</div>
          <div class="nxDC-neto-val">${F(neto)}</div>
          <div class="nxDC-neto-sub">Envíos − Recibidos</div>
        </div>
      </div>
    `;
  }

  function renderHistorialTransferencias(transferencias) {
    if (!transferencias.length) {
      return `
        <div class="nxDC-card">
          <div class="nxDC-card-title">HISTORIAL DE TRANSFERENCIAS</div>
          <div class="nxDC-empty-soft">Sin transferencias en este ciclo</div>
        </div>
      `;
    }
    const F = getFmt();
    const filas = transferencias.slice(0, 15).map((t, idx) => {
      const desde = getGAgt(t.desde_agente)?.nom || '—';
      const hacia = getGAgt(t.hacia_agente)?.nom || '—';
      const ref = t.referencia || `TRF-${String(idx+1).padStart(4,'0')}`;
      return `
        <tr>
          <td class="nxDC-tx-fecha">${fmtFecha(t.fecha)}</td>
          <td>${esc(desde)}</td>
          <td>${esc(hacia)}</td>
          <td class="nxDC-num">${F(t.monto)}</td>
          <td><span class="nxDC-tx-tag nxDC-tx-out">Envío</span></td>
          <td class="nxDC-tx-ref">${esc(ref)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="nxDC-card">
        <div class="nxDC-card-head">
          <div class="nxDC-card-title">HISTORIAL DE TRANSFERENCIAS</div>
          ${transferencias.length > 15 ? `<a class="nxDC-link" href="#" onclick="event.preventDefault()">Ver todas</a>` : ''}
        </div>
        <div class="nxDC-table-wrap">
          <table class="nxDC-table nxDC-tx-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>DESDE</th>
                <th>HACIA</th>
                <th class="nxDC-num">MONTO</th>
                <th>TIPO</th>
                <th>REFERENCIA</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════
  async function renderDetallesCobro() {
    const cont = document.getElementById('nxDetallesCobroV1');
    if (!cont) return;

    cont.innerHTML = '<div class="nxDC-loading"><div class="spin"></div><span>Cargando detalles de cobro...</span></div>';

    const listaCiclos = calcularUltimosCiclos(6);
    const periodo = cicloSeleccionado || listaCiclos[0];
    const indexActual = listaCiclos.findIndex(c => c.key === periodo.key);

    const [abonos, transferencias, entregas] = await Promise.all([
      cargarAbonos(),
      cargarTransferencias(),
      cargarEntregasAdmin()
    ]);

    const { stats, abonosPeriodo } = calcularKPIs(abonos, periodo);
    const porBanco = calcularPorBanco(abonosPeriodo);
    const transferenciasPeriodo = transferencias.filter(t => enRango(t.fecha, periodo.inicio, periodo.fin));
    const entregasPeriodo = entregas.filter(e => enRango(e.fecha, periodo.inicio, periodo.fin));
    const porAgente = calcularPorAgente(abonosPeriodo, transferenciasPeriodo, abonos, transferencias, periodo.fin, entregas);
    const hayTransferencias = transferenciasPeriodo.length > 0;
    const pendiente = calcularPendienteTotal();
    const totalTransferido = transferenciasPeriodo.reduce((s, t) => s + Number(t.monto || 0), 0);
    const dineroEnMano = porAgente.reduce((s, a) => s + Number(a.enMano || 0), 0);
    const dineroEnManoAcumulado = porAgente.reduce((s, a) => s + Number(a.enManoAcumulado || 0), 0);

    cont.innerHTML = `
      <div class="nxDC-wrap">
        ${renderHeader(listaCiclos, periodo, indexActual)}
        ${renderKPIsRow(stats, pendiente, totalTransferido, dineroEnMano, dineroEnManoAcumulado)}
        <div class="nxDC-row-2col">
          <div class="nxDC-card">
            <div class="nxDC-card-title">RESUMEN POR MÉTODO DE COBRO</div>
            ${renderDonut(stats)}
          </div>
          ${renderBancos(porBanco, stats.banco)}
        </div>
        ${renderTablaAgentes(porAgente, hayTransferencias)}
        ${esAdmin() ? renderCajaCentral(entregas, entregasPeriodo) : ''}
        <div class="nxDC-row-2col">
          ${renderTransferenciasResumen(transferenciasPeriodo)}
          ${renderHistorialTransferencias(transferenciasPeriodo)}
        </div>
      </div>
    `;

    // Eventos del selector
    const sel = document.getElementById('nxDCCicloSelect');
    const btnAnt = document.getElementById('nxDCAnterior');
    const btnSig = document.getElementById('nxDCSiguiente');
    if (sel) sel.onchange = (e) => handleCambioCiclo(e.target.value, listaCiclos);
    if (btnAnt) btnAnt.onclick = () => navegarCiclo(1, listaCiclos);
    if (btnSig) btnSig.onclick = () => navegarCiclo(-1, listaCiclos);
  }

  // ═══════════════════════════════════════════════════════════
  // INTEGRACIÓN EN DASHBOARD
  // ═══════════════════════════════════════════════════════════
  function crearContenedor() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    if (document.getElementById('nxDetallesCobroV1')) return true;
    const cont = document.createElement('div');
    cont.id = 'nxDetallesCobroV1';
    cont.style.display = 'none';
    vDash.appendChild(cont);
    return true;
  }

  function mostrarDetalles() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return;

    // Asegurar que estamos en Dashboard
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    vDash.classList.add('on');

    // Ocultar todo el contenido del dashboard excepto nuestro módulo y el botón volver
    Array.from(vDash.children).forEach(child => {
      if (child.id === 'nxDetallesCobroV1') return;
      if (child.id === 'nxDCBotonVolver') return;
      if (child.dataset.nxDCPrevDisplay === undefined) {
        child.dataset.nxDCPrevDisplay = child.style.display || '';
      }
      child.style.display = 'none';
    });

    // Botón volver
    if (!document.getElementById('nxDCBotonVolver')) {
      const btn = document.createElement('div');
      btn.id = 'nxDCBotonVolver';
      btn.innerHTML = `
        <button class="btn bsm bghost" type="button" onclick="window.nxVolverResumen()" style="margin-bottom:12px">
          <i class="ti ti-arrow-left"></i> Volver al Resumen
        </button>
      `;
      vDash.insertBefore(btn, document.getElementById('nxDetallesCobroV1'));
    } else {
      document.getElementById('nxDCBotonVolver').style.display = '';
    }

    // Mostrar y renderizar
    const cDetalles = document.getElementById('nxDetallesCobroV1');
    if (cDetalles) {
      cDetalles.style.display = '';
      renderDetallesCobro();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.nxVolverResumen = function() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return;
    const cDetalles = document.getElementById('nxDetallesCobroV1');
    if (cDetalles) cDetalles.style.display = 'none';
    const btnVolver = document.getElementById('nxDCBotonVolver');
    if (btnVolver) btnVolver.style.display = 'none';
    Array.from(vDash.children).forEach(child => {
      if (child.id === 'nxDetallesCobroV1') return;
      if (child.id === 'nxDCBotonVolver') return;
      if (child.dataset.nxDCPrevDisplay !== undefined) {
        child.style.display = child.dataset.nxDCPrevDisplay;
        delete child.dataset.nxDCPrevDisplay;
      } else {
        child.style.display = '';
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.nxAbrirDetallesCobro = mostrarDetalles;

  // ═══════════════════════════════════════════════════════════════
  // ENTREGAS A ADMIN — Caja Central
  // ═══════════════════════════════════════════════════════════════

  function renderCajaCentral(entregasAll, entregasPeriodo) {
    const F = getFmt();
    const all = Array.isArray(entregasAll) ? entregasAll : [];

    const recibidoTotal     = all.reduce((s, e) => s + Number(e.monto || 0), 0);
    const pendienteConfirmar = all.filter(e => !e.confirmado).reduce((s, e) => s + Number(e.monto || 0), 0);
    const pendientesCount    = all.filter(e => !e.confirmado).length;
    const enCajaCentral     = all.filter(e => e.confirmado && !e.depositado).reduce((s, e) => s + Number(e.monto || 0), 0);
    const yaDepositado      = all.filter(e => e.depositado).reduce((s, e) => s + Number(e.monto || 0), 0);
    const recibidoPeriodo   = (entregasPeriodo || []).reduce((s, e) => s + Number(e.monto || 0), 0);

    const linkSolicitudes = (pendientesCount > 0)
      ? `<a class="nxDC-link" href="#" onclick="event.preventDefault();window.nxAbrirSolicitudes&&window.nxAbrirSolicitudes()">${pendientesCount} pendiente${pendientesCount === 1 ? '' : 's'} en Solicitudes →</a>`
      : `<a class="nxDC-link" href="#" onclick="event.preventDefault();window.nxAbrirSolicitudes&&window.nxAbrirSolicitudes()">Ir a Solicitudes →</a>`;

    return `
      <div class="nxDC-card nxDC-caja-card">
        <div class="nxDC-card-head">
          <div class="nxDC-card-title">CAJA CENTRAL <span class="nxDC-muted">(ADMIN — solo info)</span></div>
          ${linkSolicitudes}
        </div>

        <div class="nxDC-caja-mini-kpis">
          <div class="nxDC-caja-mini nxDC-caja-cash">
            <div class="nxDC-caja-mini-lbl">EN CAJA CENTRAL</div>
            <div class="nxDC-caja-mini-val">${F(enCajaCentral)}</div>
            <div class="nxDC-caja-mini-sub">Confirmado, no depositado</div>
          </div>
          <div class="nxDC-caja-mini nxDC-caja-pend">
            <div class="nxDC-caja-mini-lbl">PENDIENTE CONFIRMAR</div>
            <div class="nxDC-caja-mini-val">${F(pendienteConfirmar)}</div>
            <div class="nxDC-caja-mini-sub">${pendientesCount} acción${pendientesCount === 1 ? '' : 'es'} esperando</div>
          </div>
          <div class="nxDC-caja-mini nxDC-caja-dep">
            <div class="nxDC-caja-mini-lbl">DEPOSITADO AL BANCO</div>
            <div class="nxDC-caja-mini-val">${F(yaDepositado)}</div>
            <div class="nxDC-caja-mini-sub">Histórico total</div>
          </div>
          <div class="nxDC-caja-mini nxDC-caja-cic">
            <div class="nxDC-caja-mini-lbl">RECIBIDO DEL CICLO</div>
            <div class="nxDC-caja-mini-val">${F(recibidoPeriodo)}</div>
            <div class="nxDC-caja-mini-sub">${F(recibidoTotal)} histórico</div>
          </div>
        </div>
      </div>
    `;
  }

  function crearModalEntregaAdmin() {
    if (document.getElementById('nxModalEntregaAdmin')) return;
    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.id = 'nxModalEntregaAdmin';
    modal.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="mt">
          <span>// RECIBIR ENTREGA DEL AGENTE</span>
          <button class="btn bghost bsm" type="button" onclick="window.nxCerrarEntregaAdmin()"><i class="ti ti-x"></i></button>
        </div>
        <div class="gf2">
          <div class="fr"><label>Agente que entrega *</label><select id="nxEA_Agente"></select></div>
          <div class="fr"><label>Monto RD$ *</label><input type="number" id="nxEA_Monto" min="0.01" step="0.01" placeholder="0.00"></div>
          <div class="fr"><label>Método *</label>
            <select id="nxEA_Metodo">
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Depósito</option>
              <option>Cheque</option>
            </select>
          </div>
          <div class="fr"><label>Fecha *</label><input type="date" id="nxEA_Fecha"></div>
          <div class="fr" id="nxEA_BancoWrap" style="display:none"><label>Banco</label>
            <select id="nxEA_Banco">
              <option value="">Seleccionar...</option>
              <option>BHD</option><option>Banreservas</option><option>Popular</option>
              <option>Scotiabank</option><option>Otros</option>
            </select>
          </div>
          <div class="fr" id="nxEA_BancoOtroWrap" style="display:none"><label>Otro banco</label><input type="text" id="nxEA_BancoOtro" placeholder="Nombre del banco"></div>
          <div class="fr" style="grid-column:1/-1"><label>Referencia / # recibo *</label><input type="text" id="nxEA_Ref" placeholder="Ej: REC-001, # transferencia"></div>
          <div class="fr" style="grid-column:1/-1"><label>Nota</label><input type="text" id="nxEA_Nota" placeholder="Opcional"></div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:11px;cursor:pointer;margin-top:10px;background:#f0fdf4;padding:10px;border-radius:8px;border:1px solid #bbf7d0">
          <input type="checkbox" id="nxEA_Confirmar" style="width:16px;height:16px;accent-color:#059669"/>
          <span><strong>Confirmar al guardar</strong> · marca esta entrega como verificada físicamente</span>
        </label>
        <div class="nx-info-box-v2" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;font-size:11px;color:#1e3a6e;margin-top:8px">
          Esta entrega reduce el "Dinero en Mano" del agente al instante.
        </div>
        <div class="fe">
          <button class="btn" type="button" onclick="window.nxCerrarEntregaAdmin()">Cancelar</button>
          <button class="btn bxl" type="button" onclick="window.nxGuardarEntregaAdmin()" id="nxEA_Btn"><i class="ti ti-check"></i> Registrar entrega</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Listeners del modal
    document.getElementById('nxEA_Metodo')?.addEventListener('change', () => {
      const m = document.getElementById('nxEA_Metodo').value || '';
      const show = (m === 'Transferencia' || m === 'Depósito');
      const bw = document.getElementById('nxEA_BancoWrap');
      if (bw) bw.style.display = show ? 'block' : 'none';
      if (!show) {
        document.getElementById('nxEA_Banco').value = '';
        document.getElementById('nxEA_BancoOtro').value = '';
        document.getElementById('nxEA_BancoOtroWrap').style.display = 'none';
      }
    });
    document.getElementById('nxEA_Banco')?.addEventListener('change', () => {
      const b = document.getElementById('nxEA_Banco').value || '';
      document.getElementById('nxEA_BancoOtroWrap').style.display = (b === 'Otros') ? 'block' : 'none';
    });
  }

  window.nxAbrirEntregaAdmin = function() {
    if (!esAdmin()) {
      if (typeof window.toast === 'function') window.toast('err', 'Sin permisos', 'Solo el administrador puede registrar entregas');
      return;
    }
    crearModalEntregaAdmin();
    const agentes = Array.isArray(st().agentes) ? st().agentes : [];
    const opts = '<option value="">Seleccionar...</option>' +
      agentes.map(a => `<option value="${esc(a.id)}">${esc(a.nom || 'Sin nombre')}</option>`).join('');
    const selAg = document.getElementById('nxEA_Agente');
    if (selAg) selAg.innerHTML = opts;
    const fechaIn = document.getElementById('nxEA_Fecha');
    if (fechaIn) fechaIn.value = new Date().toISOString().slice(0, 10);
    document.getElementById('nxModalEntregaAdmin')?.classList.add('open');
  };

  window.nxCerrarEntregaAdmin = function() {
    document.getElementById('nxModalEntregaAdmin')?.classList.remove('open');
    // Reset campos
    ['nxEA_Monto','nxEA_Ref','nxEA_Nota','nxEA_Banco','nxEA_BancoOtro'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const conf = document.getElementById('nxEA_Confirmar');
    if (conf) conf.checked = false;
  };

  window.nxGuardarEntregaAdmin = async function() {
    if (!esAdmin()) return;
    const agente_id = document.getElementById('nxEA_Agente')?.value || '';
    const monto = Number(document.getElementById('nxEA_Monto')?.value || 0);
    const metodo = document.getElementById('nxEA_Metodo')?.value || 'Efectivo';
    const fecha = document.getElementById('nxEA_Fecha')?.value || new Date().toISOString().slice(0, 10);
    const ref = (document.getElementById('nxEA_Ref')?.value || '').trim();
    const nota = (document.getElementById('nxEA_Nota')?.value || '').trim();
    const confirmarAhora = !!document.getElementById('nxEA_Confirmar')?.checked;
    let banco = '';

    const toastSafe = (t, ti, m) => {
      if (typeof window.toast === 'function') window.toast(t, ti, m); else alert(ti + '\n' + (m||''));
    };

    if (!agente_id) return toastSafe('err', 'Agente requerido', 'Selecciona el agente que entrega');
    if (!monto || monto <= 0) return toastSafe('err', 'Monto inválido', 'Escribe un monto mayor a cero');
    if (!ref) return toastSafe('err', 'Referencia requerida', 'Escribe una referencia o # de recibo');

    if (metodo === 'Transferencia' || metodo === 'Depósito') {
      banco = document.getElementById('nxEA_Banco')?.value || '';
      if (!banco) return toastSafe('err', 'Banco requerido', 'Selecciona el banco');
      if (banco === 'Otros') {
        banco = (document.getElementById('nxEA_BancoOtro')?.value || '').trim();
        if (!banco) return toastSafe('err', 'Banco requerido', 'Escribe el nombre del banco');
      }
    }

    const api = getAPI();
    if (!api?.post) return toastSafe('err', 'API no disponible', 'No se encontró API.post');

    const btn = document.getElementById('nxEA_Btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spin"></div>'; }

    const payload = {
      agente_id, monto, metodo,
      banco: banco || null,
      referencia: ref,
      nota: nota || null,
      fecha,
      confirmado: confirmarAhora,
      confirmado_at: confirmarAhora ? new Date().toISOString() : null,
      confirmado_por: confirmarAhora ? (window.sesion?.usuario || 'admin') : null,
      created_by: window.sesion?.usuario || 'admin'
    };

    try {
      await api.post('entregas_admin', payload);
      const nombreAg = (st().agentes || []).find(a => String(a.id) === String(agente_id))?.nom || agente_id;
      if (typeof window.logAudit === 'function') {
        window.logAudit('ENTREGA_ADMIN', `Recibido de ${nombreAg}: RD$ ${monto.toLocaleString()} · ${metodo}${banco ? ' · ' + banco : ''}${confirmarAhora ? ' · CONFIRMADO' : ''}`, 'Cobros');
      }
      toastSafe('ok', 'Entrega registrada', `${nombreAg} entregó RD$ ${monto.toLocaleString()}`);
      window.nxCerrarEntregaAdmin();
      if (typeof window.nxRefrescarSolicitudes === 'function') await window.nxRefrescarSolicitudes();
      if (document.getElementById('nxDetallesCobroV1')?.style.display !== 'none' && typeof renderDetallesCobro === 'function') await renderDetallesCobro();
    } catch (e) {
      console.error('Error guardando entrega_admin:', e);
      toastSafe('err', 'No se pudo guardar', 'Verifica que exista la tabla entregas_admin en Supabase');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Registrar entrega'; }
    }
  };

  window.nxConfirmarEntregaAdmin = async function(id) {
    if (!esAdmin()) return;
    if (!confirm('¿Confirmar esta entrega? Esto verifica que recibiste físicamente el dinero.')) return;
    const api = getAPI();
    if (!api?.patch) {
      if (typeof window.toast === 'function') window.toast('err', 'API no disponible', 'No se encontró API.patch');
      return;
    }
    try {
      await api.patch('entregas_admin', `id=eq.${id}`, {
        confirmado: true,
        confirmado_at: new Date().toISOString(),
        confirmado_por: window.sesion?.usuario || 'admin'
      });
      if (typeof window.toast === 'function') window.toast('ok', 'Confirmado', 'Entrega marcada como verificada');
      if (typeof window.nxRefrescarSolicitudes === 'function') await window.nxRefrescarSolicitudes();
      if (document.getElementById('nxDetallesCobroV1')?.style.display !== 'none') await renderDetallesCobro();
    } catch (e) {
      console.error('Error confirmando entrega:', e);
      if (typeof window.toast === 'function') window.toast('err', 'Error', 'No se pudo confirmar');
    }
  };

  window.nxDepositarEntregaAdmin = async function(id) {
    if (!esAdmin()) return;
    const banco = prompt('¿En qué banco depositaste este dinero?\n(Ej: BHD, Banreservas, Popular)');
    if (!banco || !banco.trim()) return;
    const api = getAPI();
    if (!api?.patch) {
      if (typeof window.toast === 'function') window.toast('err', 'API no disponible', 'No se encontró API.patch');
      return;
    }
    try {
      await api.patch('entregas_admin', `id=eq.${id}`, {
        depositado: true,
        depositado_at: new Date().toISOString(),
        depositado_banco: banco.trim()
      });
      if (typeof window.toast === 'function') window.toast('ok', 'Depositado', `Marcado como depositado en ${banco.trim()}`);
      if (typeof window.nxRefrescarSolicitudes === 'function') await window.nxRefrescarSolicitudes();
      if (document.getElementById('nxDetallesCobroV1')?.style.display !== 'none') await renderDetallesCobro();
    } catch (e) {
      console.error('Error depositando entrega:', e);
      if (typeof window.toast === 'function') window.toast('err', 'Error', 'No se pudo marcar como depositado');
    }
  };

  // Anular: elimina la entrega_admin. Útil cuando el depósito directo no llegó al banco.
  // El cobro original NO se elimina (el cliente igual quedó marcado como pagado).
  // El "Dinero en Mano" del agente vuelve a subir automáticamente.
  window.nxAnularEntregaAdmin = async function(id) {
    if (!esAdmin()) return;
    if (!confirm('¿Anular esta entrega?\n\n• La entrega se borrará\n• El cobro del cliente NO se afecta (la factura sigue pagada)\n• El "Dinero en Mano" del agente subirá por ese monto (queda responsable)\n\n¿Continuar?')) return;
    const api = getAPI();
    if (!api?.delete) {
      if (typeof window.toast === 'function') window.toast('err', 'API no disponible', 'No se encontró API.delete');
      return;
    }
    try {
      await api.delete('entregas_admin', `id=eq.${id}`);
      if (typeof window.toast === 'function') window.toast('ok', 'Anulada', 'La entrega fue eliminada. Investiga con el agente.');
      if (typeof window.logAudit === 'function') window.logAudit('ENTREGA_ADMIN_ANULADA', `ID: ${id}`, 'Cobros');
      if (typeof window.nxRefrescarSolicitudes === 'function') await window.nxRefrescarSolicitudes();
      if (document.getElementById('nxDetallesCobroV1')?.style.display !== 'none') await renderDetallesCobro();
    } catch (e) {
      console.error('Error anulando entrega:', e);
      if (typeof window.toast === 'function') window.toast('err', 'Error', 'No se pudo anular');
    }
  };

  // Crear el modal al cargar (queda oculto hasta que se llame nxAbrirEntregaAdmin)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', crearModalEntregaAdmin, { once: true });
  } else {
    crearModalEntregaAdmin();
  }

  // Hook al KPI "COBRADO" del Dashboard - rotación de períodos + long press para Detalles
  function bindCobradoKPI() {
    // Estado: período actual del KPI
    if (typeof window.__nxKPIPeriodo === 'undefined') {
      window.__nxKPIPeriodo = 0; // 0=día, 1=semana, 2=quincena, 3=mes
    }
    const periodos = ['HOY', 'SEMANA', 'QUINCENA', 'MES'];
    
    // Calcula el total cobrado en un período
    async function calcularPeriodoKPI(idx) {
      const abonos = await cargarAbonos();
      const ahora = new Date();
      let inicio, fin;
      
      if (idx === 0) {
        // HOY: 00:00 a 23:59 de hoy
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
      } else if (idx === 1) {
        // SEMANA: últimos 7 días
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 6);
        fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
      } else if (idx === 2) {
        // QUINCENA: últimos 15 días
        inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 14);
        fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
      } else {
        // MES: ciclo 20-20
        const periodo = calcularPeriodo();
        inicio = periodo.inicio;
        fin = periodo.fin;
      }
      
      const total = abonos
        .filter(a => {
          if (!a.fecha) return false;
          try {
            const f = new Date(a.fecha);
            return f >= inicio && f < fin;
          } catch(e) { return false; }
        })
        .reduce((s, a) => s + Number(a.monto || 0), 0);
      
      return total;
    }
    
    // Actualiza el KPI con el período actual
    async function actualizarKPI() {
      const labels = document.querySelectorAll('.kl');
      let kpiKL = null;
      for (const l of labels) {
        if (l.textContent.trim().toUpperCase().includes('COBRADO')) {
          kpiKL = l;
          break;
        }
      }
      if (!kpiKL) return;
      
      const idx = window.__nxKPIPeriodo;
      const total = await calcularPeriodoKPI(idx);
      
      // Cambiar label
      kpiKL.textContent = 'COBRADO ' + periodos[idx];
      
      // Buscar el valor (suele estar arriba/abajo del label)
      const kpi = kpiKL.closest('.kpi, .nc, .qa, [class*="kpi"]') || kpiKL.parentElement;
      if (kpi) {
        // Buscar el span del valor (números grandes)
        const valor = kpi.querySelector('.kv, .nx-kpi-val, [class*="val"], strong, b');
        if (valor) {
          const F = getFmt();
          valor.textContent = F(total);
        }
      }
    }
    
    // Variables para detectar press
    let pressTimer = null;
    let isLongPress = false;
    
    // Función para encontrar el KPI cobrado
    function findCobradoKPI(el) {
      const kpiKL = el.closest?.('.kl');
      if (!kpiKL) return null;
      if (!kpiKL.textContent.trim().toUpperCase().includes('COBRADO')) return null;
      const vDash = document.getElementById('v-dashboard');
      if (!vDash || !vDash.classList.contains('on')) return null;
      return kpiKL;
    }
    
    // MOUSEDOWN/TOUCHSTART: iniciar timer para long press
    function onPressStart(e) {
      const kpi = findCobradoKPI(e.target);
      if (!kpi) return;
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        // Vibrar si el dispositivo lo soporta
        if (navigator.vibrate) navigator.vibrate(50);
        // Abrir Detalles de Cobro
        if (typeof mostrarDetalles === 'function') mostrarDetalles();
      }, 500);
    }
    
    // MOUSEUP/TOUCHEND: cancelar timer o ejecutar click corto
    function onPressEnd(e) {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }
    
    // CLICK: ejecutar rotación SOLO si NO fue long press
    function onClick(e) {
      const kpi = findCobradoKPI(e.target);
      if (!kpi) return;
      e.preventDefault();
      e.stopPropagation();
      
      if (isLongPress) {
        // Ya se ejecutó el long press, no hacer nada más
        isLongPress = false;
        return;
      }
      
      // Click corto: rotar período
      window.__nxKPIPeriodo = (window.__nxKPIPeriodo + 1) % 4;
      actualizarKPI();
    }
    
    // Listeners (touch + mouse)
    document.addEventListener('mousedown', onPressStart, true);
    document.addEventListener('touchstart', onPressStart, true);
    document.addEventListener('mouseup', onPressEnd, true);
    document.addEventListener('touchend', onPressEnd, true);
    document.addEventListener('click', onClick, true);
    
    // Inicializar el KPI con el período actual al cargar
    setTimeout(actualizarKPI, 1500);
    
    // Refrescar cada 30 segundos
    setInterval(actualizarKPI, 30000);
  }

  // ═══════════════════════════════════════════════════════════
  // CSS PREMIUM
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if (document.getElementById('nxDC-css-v2')) return;
    // Eliminar CSS viejo de V1 si existe
    const oldCss = document.getElementById('nxDC-css');
    if (oldCss) oldCss.remove();

    const style = document.createElement('style');
    style.id = 'nxDC-css-v2';
    style.textContent = `
      /* ═══ ESTRUCTURA GENERAL ═══ */
      #nxDetallesCobroV1 { animation: nxDCFade .3s ease-out; }
      @keyframes nxDCFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      .nxDC-wrap { display:flex; flex-direction:column; gap:14px; }
      .nxDC-loading { display:flex; align-items:center; gap:10px; padding:30px; justify-content:center; color:#64748b; font-weight:600; }
      
      /* ═══ KPI COBRADO ROTATIVO (click corto rota / largo abre Detalles) ═══ */
      #v-dashboard .kpi:has(.kl),
      #v-dashboard [class*="kpi"]:has(.kl) {
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        transition: transform 0.1s ease;
      }
      #v-dashboard .kpi:active:has(.kl) {
        transform: scale(0.97);
      }

      /* ═══ HEADER PREMIUM ═══ */
      .nxDC-head { background:#fff; border:1px solid #e2e8f0; border-radius:18px; padding:18px 20px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,.03); }
      .nxDC-head-left { display:flex; align-items:center; gap:14px; min-width:0; flex:1 1 320px; }
      .nxDC-head-icon { width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; display:grid; place-items:center; font-size:22px; flex:0 0 auto; box-shadow:0 6px 16px rgba(59,130,246,.32); }
      .nxDC-head-title { margin:0; font-size:22px; font-weight:900; color:#0f172a; letter-spacing:.3px; line-height:1.1; }
      .nxDC-head-sub { font-size:12px; color:#64748b; margin-top:3px; font-weight:500; }
      .nxDC-head-right { flex:0 0 auto; }
      .nxDC-period { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:8px 12px; min-width:280px; }
      .nxDC-period-label { font-size:10px; color:#64748b; font-weight:700; letter-spacing:.4px; margin-bottom:4px; }
      .nxDC-period-controls { display:flex; align-items:center; gap:6px; }
      .nxDC-period-select { flex:1; border:0; background:transparent; font-size:13px; font-weight:700; color:#0f172a; cursor:pointer; outline:none; padding:4px; min-width:0; }
      .nxDC-period-nav { width:28px; height:28px; border-radius:8px; border:1px solid #e2e8f0; background:#fff; color:#475569; cursor:pointer; display:grid; place-items:center; transition:all .15s; flex:0 0 auto; }
      .nxDC-period-nav:hover:not(:disabled) { background:#eff6ff; border-color:#3b82f6; color:#2563eb; }
      .nxDC-period-nav:disabled { opacity:.35; cursor:not-allowed; }

      /* ═══ 4 KPIs PRINCIPALES ═══ */
      .nxDC-kpis-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
      .nxDC-kpi { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; gap:12px; align-items:flex-start; box-shadow:0 1px 3px rgba(0,0,0,.03); }
      .nxDC-kpi-icon { width:44px; height:44px; border-radius:12px; display:grid; place-items:center; font-size:20px; flex:0 0 auto; }
      .nxDC-kpi-body { min-width:0; flex:1; }
      .nxDC-kpi-label { font-size:10px; font-weight:800; color:#64748b; letter-spacing:.5px; line-height:1.3; margin-bottom:5px; }
      .nxDC-kpi-value { font-size:22px; font-weight:900; line-height:1.1; margin-bottom:3px; font-family:var(--mono,'SF Mono',monospace); letter-spacing:-.3px; }
      .nxDC-kpi-sub { font-size:11px; color:#94a3b8; font-weight:500; }

      /* ═══ ROW 2 COL ═══ */
      .nxDC-row-2col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

      /* ═══ CARDS GENÉRICAS ═══ */
      .nxDC-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:18px; box-shadow:0 1px 3px rgba(0,0,0,.03); }
      .nxDC-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:10px; flex-wrap:wrap; }
      .nxDC-card-title { font-size:11px; font-weight:800; color:#475569; letter-spacing:.7px; }
      .nxDC-card-head .nxDC-card-title { margin:0; }
      .nxDC-muted { color:#94a3b8; font-weight:600; }
      .nxDC-empty-soft { padding:24px; text-align:center; color:#94a3b8; font-size:12px; font-weight:600; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px; }
      .nxDC-link { color:#2563eb; font-size:11px; font-weight:700; text-decoration:none; }

      /* ═══ DONUT ═══ */
      .nxDC-donut-block { display:grid; grid-template-columns:auto 1fr; gap:18px; align-items:center; }
      .nxDC-donut-chart { position:relative; width:160px; height:160px; flex:0 0 auto; }
      .nxDC-donut-svg { width:100%; height:100%; }
      .nxDC-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
      .nxDC-donut-amt { font-size:11px; color:#64748b; font-weight:700; }
      .nxDC-donut-val { font-size:22px; font-weight:900; color:#0f172a; font-family:var(--mono,monospace); line-height:1; margin:2px 0; }
      .nxDC-donut-lbl { font-size:10px; color:#94a3b8; font-weight:700; letter-spacing:.5px; }
      .nxDC-legend { display:flex; flex-direction:column; gap:10px; min-width:0; }
      .nxDC-leg-item { display:grid; grid-template-columns:auto 1fr auto auto; align-items:center; gap:10px; font-size:12px; }
      .nxDC-leg-dot { width:10px; height:10px; border-radius:50%; flex:0 0 auto; }
      .nxDC-leg-name { color:#475569; font-weight:600; }
      .nxDC-leg-val { color:#0f172a; font-weight:700; font-family:var(--mono,monospace); font-size:11px; }
      .nxDC-leg-pct { color:#64748b; font-weight:700; font-size:11px; min-width:42px; text-align:right; }
      .nxDC-leg-empty { color:#94a3b8; font-size:12px; padding:10px; text-align:center; }

      /* ═══ BANCOS ═══ */
      .nxDC-bancos-list { display:flex; flex-direction:column; gap:2px; }
      .nxDC-banco-row { display:flex; justify-content:space-between; align-items:center; padding:10px 4px; border-bottom:1px solid #f1f5f9; }
      .nxDC-banco-row:last-of-type { border-bottom:0; }
      .nxDC-banco-cell { display:flex; align-items:center; gap:10px; color:#0f172a; font-weight:600; font-size:13px; }
      .nxDC-banco-cell i { font-size:18px; color:#64748b; }
      .nxDC-banco-monto { font-weight:700; color:#0f172a; font-family:var(--mono,monospace); font-size:13px; }
      .nxDC-banco-total { display:flex; justify-content:space-between; align-items:center; padding:12px 4px 4px; border-top:1px solid #e2e8f0; margin-top:8px; }
      .nxDC-banco-total > div:first-child { font-weight:800; color:#0f172a; font-size:13px; }
      .nxDC-banco-total > div:last-child { font-weight:800; color:#2563eb; font-family:var(--mono,monospace); font-size:15px; }

      /* ═══ TABLA AGENTES + TRANSFERENCIAS ═══ */
      .nxDC-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
      .nxDC-table { width:100%; border-collapse:collapse; font-size:12px; }
      .nxDC-table thead th { padding:10px 12px; text-align:left; font-size:9px; font-weight:800; color:#64748b; letter-spacing:.6px; background:#f8fafc; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
      .nxDC-table tbody td { padding:12px; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600; }
      .nxDC-table tbody tr:last-child td { border-bottom:0; }
      .nxDC-table tfoot td { padding:12px; background:#f8fafc; border-top:2px solid #e2e8f0; font-size:13px; }
      .nxDC-table .nxDC-num { text-align:right; font-family:var(--mono,monospace); white-space:nowrap; }
      .nxDC-table th.nxDC-num { text-align:right; }
      .nxDC-num-green { color:#059669; font-weight:700; }
      .nxDC-num-blue { color:#2563eb; font-weight:700; }
      .nxDC-num-stack { text-align:right; vertical-align:middle; }
      .nxDC-stack-big { font-weight:700; font-size:13px; line-height:1.15; font-family:var(--mono,monospace); }
      .nxDC-stack-small { font-size:10px; color:#64748b; font-weight:500; margin-top:3px; font-family:var(--mono,monospace); }
      .nxDC-muted-xs { color:#94a3b8; font-size:9px; font-family:inherit; }
      .nxDC-muted-sm { color:#94a3b8; font-size:8.5px; font-weight:600; letter-spacing:.3px; display:block; margin-top:2px; }

      /* ═══ CAJA CENTRAL (ADMIN) ═══ */
      .nxDC-caja-card { border:1px solid #bfdbfe; background:linear-gradient(180deg,#f8fbff,#ffffff); }
      .nxDC-caja-mini-kpis {
        display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px;
      }
      .nxDC-caja-mini {
        padding:12px; border-radius:12px; border:1px solid #e2e8f0; background:#fff;
        box-shadow:0 1px 3px rgba(0,0,0,.04);
      }
      .nxDC-caja-cash { background:linear-gradient(135deg,#ecfdf5,#dcfce7); border-color:#bbf7d0; }
      .nxDC-caja-pend { background:linear-gradient(135deg,#fffbeb,#fef3c7); border-color:#fde68a; }
      .nxDC-caja-dep  { background:linear-gradient(135deg,#eff6ff,#dbeafe); border-color:#bfdbfe; }
      .nxDC-caja-cic  { background:linear-gradient(135deg,#f8fafc,#f1f5f9); border-color:#e2e8f0; }
      .nxDC-caja-mini-lbl { font-size:9.5px; font-weight:800; color:#64748b; letter-spacing:.5px; margin-bottom:6px; }
      .nxDC-caja-cash .nxDC-caja-mini-lbl { color:#059669; }
      .nxDC-caja-pend .nxDC-caja-mini-lbl { color:#d97706; }
      .nxDC-caja-dep  .nxDC-caja-mini-lbl { color:#2563eb; }
      .nxDC-caja-mini-val { font-size:18px; font-weight:900; line-height:1.1; font-family:var(--mono,monospace); color:#0f172a; }
      .nxDC-caja-cash .nxDC-caja-mini-val { color:#059669; }
      .nxDC-caja-pend .nxDC-caja-mini-val { color:#d97706; }
      .nxDC-caja-dep  .nxDC-caja-mini-val { color:#2563eb; }
      .nxDC-caja-mini-sub { font-size:9.5px; color:#94a3b8; font-weight:500; margin-top:4px; line-height:1.3; }
      .nxDC-caja-hist-title { font-size:10.5px; font-weight:800; color:#475569; letter-spacing:.6px; margin:14px 0 10px; }

      /* Badges de estado */
      .nxDC-tag-pend { background:#fef3c7; color:#d97706; }
      .nxDC-tag-conf { background:#dbeafe; color:#2563eb; }
      .nxDC-tag-dep  { background:#dcfce7; color:#059669; }

      /* Botones mini de acciones */
      .nxDC-actions-cell { white-space:nowrap; }
      .nxDC-mini-btn {
        width:26px; height:26px; border:0; border-radius:7px; cursor:pointer;
        display:inline-flex; align-items:center; justify-content:center; margin-right:4px;
        font-size:13px; transition:all .15s; padding:0;
      }
      .nxDC-mini-conf { background:#dbeafe; color:#2563eb; }
      .nxDC-mini-conf:hover { background:#bfdbfe; transform:translateY(-1px); }
      .nxDC-mini-dep { background:#dcfce7; color:#059669; }
      .nxDC-mini-dep:hover { background:#bbf7d0; transform:translateY(-1px); }
      .nxDC-ag-name-cell { display:flex; align-items:center; gap:10px; min-width:140px; }
      .nxDC-ag-avatar { width:30px; height:30px; border-radius:50%; color:#fff; display:grid; place-items:center; font-weight:800; font-size:13px; flex:0 0 auto; }

      /* ═══ TRANSFERENCIAS RESUMEN ═══ */
      .nxDC-transf-summary { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
      .nxDC-transf-box { padding:14px; border-radius:14px; border:1px solid; }
      .nxDC-transf-out { background:#ecfdf5; border-color:#bbf7d0; }
      .nxDC-transf-in  { background:#eff6ff; border-color:#bfdbfe; }
      .nxDC-transf-head { display:flex; align-items:center; gap:8px; font-size:11px; font-weight:800; letter-spacing:.5px; margin-bottom:6px; }
      .nxDC-transf-out .nxDC-transf-head { color:#059669; }
      .nxDC-transf-in  .nxDC-transf-head { color:#2563eb; }
      .nxDC-transf-head i { width:24px; height:24px; border-radius:50%; display:grid; place-items:center; font-size:14px; }
      .nxDC-transf-out .nxDC-transf-head i { background:#bbf7d0; }
      .nxDC-transf-in  .nxDC-transf-head i { background:#bfdbfe; }
      .nxDC-transf-val { font-size:20px; font-weight:900; font-family:var(--mono,monospace); }
      .nxDC-transf-out .nxDC-transf-val { color:#059669; }
      .nxDC-transf-in  .nxDC-transf-val { color:#2563eb; }
      .nxDC-transf-sub { font-size:11px; color:#94a3b8; font-weight:500; margin-top:4px; }
      .nxDC-neto { padding-top:14px; border-top:1px solid #e2e8f0; }
      .nxDC-neto-label { font-size:11px; font-weight:800; color:#64748b; letter-spacing:.5px; margin-bottom:6px; }
      .nxDC-neto-val { font-size:24px; font-weight:900; color:#2563eb; font-family:var(--mono,monospace); }
      .nxDC-neto-sub { font-size:11px; color:#94a3b8; font-weight:500; margin-top:3px; }

      /* ═══ HISTORIAL TRANSFERENCIAS ═══ */
      .nxDC-tx-table tbody td { font-size:12px; }
      .nxDC-tx-fecha { font-family:var(--mono,monospace); color:#64748b; font-size:11px; }
      .nxDC-tx-ref { font-family:var(--mono,monospace); color:#64748b; font-size:11px; }
      .nxDC-tx-tag { display:inline-block; padding:3px 8px; border-radius:6px; font-size:10px; font-weight:800; letter-spacing:.4px; }
      .nxDC-tx-out { background:#fee2e2; color:#dc2626; }
      .nxDC-tx-in  { background:#dcfce7; color:#059669; }

      /* ═══ RESPONSIVE TABLET (1024px) ═══ */
      @media (max-width: 1024px) {
        .nxDC-kpis-row { grid-template-columns:repeat(2,1fr); }
        .nxDC-row-2col { grid-template-columns:1fr; }
      }

      /* ═══ RESPONSIVE MÓVIL (768px) — APP-LIKE ═══ */
      @media (max-width: 768px) {
        /* Espaciado más app-like + padding-bottom para barra inferior flotante */
        .nxDC-wrap { gap:10px; padding-bottom:calc(96px + env(safe-area-inset-bottom)); }

        /* Header compacto SIN hueco vertical */
        .nxDC-head {
          padding:12px;
          flex-direction:column;
          align-items:stretch;
          justify-content:flex-start;
          gap:10px;
          border-radius:14px;
        }
        .nxDC-head-left { flex-direction:row; gap:10px; align-items:center; flex:0 0 auto; }
        .nxDC-head-icon {
          width:38px; height:38px;
          font-size:16px;
          border-radius:10px;
          box-shadow:0 4px 10px rgba(59,130,246,.28);
        }
        .nxDC-head-title { font-size:16px; line-height:1.15; }
        .nxDC-head-sub { font-size:10.5px; margin-top:2px; line-height:1.3; }
        .nxDC-head-right { width:100%; }
        .nxDC-period { width:100%; min-width:0; padding:7px 10px; border-radius:10px; }
        .nxDC-period-label { font-size:9px; margin-bottom:2px; }
        .nxDC-period-select { font-size:12px; padding:2px; }
        .nxDC-period-nav { width:26px; height:26px; border-radius:7px; }

        /* KPIs en 2x2 más compactos */
        .nxDC-kpis-row { grid-template-columns:1fr 1fr; gap:8px; }
        .nxDC-kpi { padding:11px; gap:9px; border-radius:14px; }
        .nxDC-kpi-icon { width:34px; height:34px; font-size:15px; border-radius:10px; }
        .nxDC-kpi-label { font-size:8.5px; line-height:1.25; margin-bottom:3px; }
        .nxDC-kpi-value { font-size:16px; margin-bottom:2px; }
        .nxDC-kpi-sub { font-size:9.5px; }

        /* Cards compactas */
        .nxDC-card { padding:12px; border-radius:14px; }
        .nxDC-card-title { font-size:10.5px; letter-spacing:.5px; }
        .nxDC-row-2col { gap:8px; }

        /* Donut centrado */
        .nxDC-donut-block { grid-template-columns:1fr; gap:12px; }
        .nxDC-donut-chart { width:130px; height:130px; margin:0 auto; }
        .nxDC-donut-val { font-size:19px; }
        .nxDC-legend { gap:8px; }
        .nxDC-leg-item { font-size:11.5px; gap:8px; }
        .nxDC-leg-val, .nxDC-leg-pct { font-size:10.5px; }
        .nxDC-leg-pct { min-width:38px; }

        /* Bancos */
        .nxDC-banco-row { padding:8px 4px; }
        .nxDC-banco-cell, .nxDC-banco-monto { font-size:12px; }
        .nxDC-banco-total > div:last-child { font-size:14px; }

        /* Tabla con scroll horizontal */
        .nxDC-table { min-width:600px; }
        .nxDC-table thead th, .nxDC-table tbody td, .nxDC-table tfoot td {
          padding:8px 10px; font-size:10.5px;
        }
        .nxDC-ag-avatar { width:26px; height:26px; font-size:12px; }

        /* Transferencias compactas (2 cajas lado a lado en vez de stacked) */
        .nxDC-transf-summary { grid-template-columns:1fr 1fr; gap:8px; }
        .nxDC-caja-mini-kpis { grid-template-columns:1fr 1fr; gap:8px; }
        .nxDC-caja-mini { padding:10px; }
        .nxDC-caja-mini-val { font-size:15px; }
        .nxDC-mini-btn { width:24px; height:24px; font-size:12px; }
        .nxDC-transf-box { padding:11px; border-radius:12px; }
        .nxDC-transf-val { font-size:17px; }
        .nxDC-transf-sub { font-size:10px; }
        .nxDC-neto-val { font-size:20px; }

        /* Botón "Volver al Resumen" estilo app */
        #nxDCBotonVolver {
          margin:0 0 6px;
          padding-top:calc(env(safe-area-inset-top) + 4px);
        }
        #nxDCBotonVolver .btn {
          width:100%;
          justify-content:center;
          background:#fff;
          border:1px solid #e2e8f0;
          color:#475569;
          font-weight:700;
          padding:9px 14px;
          border-radius:12px;
          box-shadow:0 1px 3px rgba(0,0,0,.04);
        }
      }

      /* ═══ MÓVIL PEQUEÑO (480px) ═══ */
      @media (max-width: 480px) {
        .nxDC-head { padding:11px; }
        .nxDC-head-title { font-size:15px; }
        .nxDC-head-sub { font-size:10px; }
        .nxDC-head-icon { width:34px; height:34px; font-size:14px; border-radius:9px; }
        .nxDC-kpi { padding:10px; gap:8px; }
        .nxDC-kpi-value { font-size:14.5px; }
        .nxDC-kpi-icon { width:30px; height:30px; font-size:13px; border-radius:9px; }
        .nxDC-kpi-label { font-size:8px; }
        .nxDC-kpi-sub { font-size:9px; }
        .nxDC-card { padding:11px; }
        .nxDC-card-title { font-size:10px; }
        .nxDC-donut-chart { width:120px; height:120px; }
        .nxDC-donut-val { font-size:17px; }
        .nxDC-transf-val { font-size:15px; }
        .nxDC-neto-val { font-size:18px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    injectCSS();
    let intentos = 0;
    const tryInit = function() {
      intentos++;
      if (crearContenedor()) {
        bindCobradoKPI();
        return;
      }
      if (intentos < 30) setTimeout(tryInit, 500);
    };
    tryInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - VISUAL PREMIUM 3D PARA DETALLES DE COBRO
   Solo mejora visual. No cambia lógica. No agrega botones.
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NEXUS_VISUAL_3D_COBROS__) return;
  window.__NEXUS_VISUAL_3D_COBROS__ = true;

  function injectCSS() {
    if (document.getElementById('nx-visual-3d-cobros-css')) return;

    const style = document.createElement('style');
    style.id = 'nx-visual-3d-cobros-css';
    style.textContent = `
      #nxDetallesCobroV1 .nxDC-card,
      #nxDetallesCobroV1 .nxDC-kpi,
      #nxDetallesCobroV1 .nxDC-head,
      #nxDetallesCobroV1 .nxDC-period {
        background: linear-gradient(145deg, #ffffff, #f8fbff) !important;
        border: 1px solid rgba(59,130,246,.18) !important;
        box-shadow:
          0 14px 30px rgba(37,99,235,.12),
          0 4px 10px rgba(15,23,42,.06),
          inset 0 1px 0 rgba(255,255,255,.9) !important;
      }

      #nxDetallesCobroV1 .nxDC-card:hover,
      #nxDetallesCobroV1 .nxDC-kpi:hover {
        transform: translateY(-2px);
        box-shadow:
          0 18px 38px rgba(37,99,235,.18),
          0 6px 14px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.9) !important;
      }

      #nxDetallesCobroV1 .nxDC-card,
      #nxDetallesCobroV1 .nxDC-kpi {
        transition: all .22s ease;
      }

      #nxDetallesCobroV1 .nxDC-head {
        background:
          radial-gradient(circle at top left, rgba(59,130,246,.12), transparent 38%),
          linear-gradient(145deg, #ffffff, #f8fbff) !important;
      }

      #nxDetallesCobroV1 .nxDC-head-icon,
      #nxDetallesCobroV1 .nxDC-kpi-icon {
        box-shadow:
          0 10px 20px rgba(37,99,235,.25),
          inset 0 1px 0 rgba(255,255,255,.55) !important;
      }

      #nxDetallesCobroV1 .nxDC-kpi-value,
      #nxDetallesCobroV1 .nxDC-banco-monto,
      #nxDetallesCobroV1 .nxDC-num {
        text-shadow: 0 1px 0 rgba(255,255,255,.8);
      }

      #nxDetallesCobroV1 .nxDC-banco-row {
        background: linear-gradient(145deg, #ffffff, #f1f7ff);
        border: 1px solid rgba(59,130,246,.12);
        border-radius: 14px;
        padding: 12px 14px !important;
        margin-bottom: 8px;
        box-shadow:
          0 8px 18px rgba(37,99,235,.10),
          inset 0 1px 0 rgba(255,255,255,.85);
      }

      #nxDetallesCobroV1 .nxDC-banco-cell i {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        background: linear-gradient(145deg, #dbeafe, #ffffff);
        color: #2563eb !important;
        display: grid;
        place-items: center;
        box-shadow:
          0 8px 16px rgba(37,99,235,.18),
          inset 0 1px 0 rgba(255,255,255,.9);
      }

      #nxDetallesCobroV1 .nxDC-banco-cell span {
        font-weight: 900 !important;
        color: #0f172a !important;
      }

      #nxDetallesCobroV1 .nxDC-banco-total {
        background: linear-gradient(145deg, #eff6ff, #ffffff);
        border: 1px solid rgba(37,99,235,.18) !important;
        border-radius: 14px;
        padding: 14px !important;
        margin-top: 12px !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.9);
      }

      #nxDetallesCobroV1 .nxDC-table thead th {
        background: linear-gradient(145deg, #eff6ff, #f8fbff) !important;
        color: #1e3a8a !important;
      }

      #nxDetallesCobroV1 .nxDC-table tbody tr {
        transition: background .18s ease;
      }

      #nxDetallesCobroV1 .nxDC-table tbody tr:hover {
        background: #f8fbff !important;
      }

      #nxDetallesCobroV1 .nxDC-ag-avatar {
        box-shadow:
          0 8px 18px rgba(37,99,235,.20),
          inset 0 1px 0 rgba(255,255,255,.35);
      }

      #nxDetallesCobroV1 .nxDC-donut-chart {
        filter: drop-shadow(0 12px 18px rgba(37,99,235,.16));
      }

      #nxDetallesCobroV1 .nxDC-period-nav,
      #nxDetallesCobroV1 .nxDC-period-select {
        box-shadow: inset 0 1px 0 rgba(255,255,255,.85);
      }

      @media(max-width:768px) {
        #nxDetallesCobroV1 .nxDC-card,
        #nxDetallesCobroV1 .nxDC-kpi,
        #nxDetallesCobroV1 .nxDC-head {
          box-shadow:
            0 10px 22px rgba(37,99,235,.12),
            0 3px 8px rgba(15,23,42,.05) !important;
        }

        #nxDetallesCobroV1 .nxDC-banco-row {
          padding: 10px 12px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();

})();
/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - THEME GLOBAL SEMI-GLASS AZUL PREMIUM
   Solo visual. No cambia lógica. No agrega botones.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_SEMI_GLASS_GLOBAL_V1__) return;
  window.__NEXUS_SEMI_GLASS_GLOBAL_V1__ = true;

  function injectCSS() {
    if (document.getElementById("nx-semi-glass-global-css")) return;

    const style = document.createElement("style");
    style.id = "nx-semi-glass-global-css";

    style.textContent = `
      :root{
        --nx-bg1:#eef7ff;
        --nx-bg2:#dbeafe;
        --nx-blue:#2563eb;
        --nx-blue2:#3b82f6;
        --nx-blue3:#60a5fa;
        --nx-text:#0f172a;
        --nx-muted:#64748b;
        --nx-glass:rgba(255,255,255,.72);
        --nx-glass-strong:rgba(255,255,255,.88);
        --nx-border:rgba(59,130,246,.20);
        --nx-shadow:0 18px 45px rgba(37,99,235,.14),0 6px 16px rgba(15,23,42,.06),inset 0 1px 0 rgba(255,255,255,.92);
        --nx-shadow-soft:0 10px 28px rgba(37,99,235,.12),0 3px 10px rgba(15,23,42,.05),inset 0 1px 0 rgba(255,255,255,.88);
      }

      html,body{
        background:
          radial-gradient(circle at 18% 8%, rgba(96,165,250,.34), transparent 32%),
          radial-gradient(circle at 85% 18%, rgba(37,99,235,.18), transparent 34%),
          linear-gradient(135deg,var(--nx-bg1),var(--nx-bg2)) !important;
        color:var(--nx-text) !important;
      }

      body::before{
        content:"";
        position:fixed;
        inset:0;
        pointer-events:none;
        background:
          linear-gradient(135deg, rgba(255,255,255,.45), transparent 35%),
          radial-gradient(circle at 50% 0%, rgba(255,255,255,.65), transparent 30%);
        z-index:-1;
      }

      .view,
      main,
      .main,
      .content,
      .page,
      .wrap{
        background:transparent !important;
      }

      aside,
      .sidebar,
      .side,
      nav.side,
      .nav{
        background:rgba(255,255,255,.62) !important;
        backdrop-filter:blur(22px) saturate(145%) !important;
        -webkit-backdrop-filter:blur(22px) saturate(145%) !important;
        border:1px solid rgba(255,255,255,.75) !important;
        box-shadow:var(--nx-shadow) !important;
      }

      .topbar,
      header,
      .bar,
      .appbar{
        background:rgba(255,255,255,.60) !important;
        backdrop-filter:blur(20px) saturate(140%) !important;
        -webkit-backdrop-filter:blur(20px) saturate(140%) !important;
        border-bottom:1px solid rgba(59,130,246,.16) !important;
        box-shadow:0 10px 28px rgba(37,99,235,.10) !important;
      }

      .nc,
      .card,
      .kpi,
      .sm,
      .qa,
      .box,
      .panel,
      .modal,
      .dropdown,
      .menu,
      .acc-menu,
      .mobile-more-sheet-clean,
      #nxDetallesCobroV1 .nxDC-card,
      #nxDetallesCobroV1 .nxDC-kpi,
      #nxDetallesCobroV1 .nxDC-head,
      #nxDetallesCobroV1 .nxDC-period{
        background:
          linear-gradient(145deg, rgba(255,255,255,.86), rgba(241,248,255,.68)) !important;
        backdrop-filter:blur(18px) saturate(145%) !important;
        -webkit-backdrop-filter:blur(18px) saturate(145%) !important;
        border:1px solid var(--nx-border) !important;
        box-shadow:var(--nx-shadow-soft) !important;
      }

      .nc,
      .card,
      .kpi,
      .sm,
      .qa,
      .box,
      .panel,
      #nxDetallesCobroV1 .nxDC-card,
      #nxDetallesCobroV1 .nxDC-kpi{
        border-radius:22px !important;
        transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease !important;
      }

      .nc:hover,
      .card:hover,
      .kpi:hover,
      .sm:hover,
      .qa:hover,
      #nxDetallesCobroV1 .nxDC-card:hover,
      #nxDetallesCobroV1 .nxDC-kpi:hover{
        transform:translateY(-2px);
        border-color:rgba(37,99,235,.30) !important;
        box-shadow:0 20px 46px rgba(37,99,235,.18),0 8px 18px rgba(15,23,42,.07),inset 0 1px 0 rgba(255,255,255,.95) !important;
      }

      .btn,
      button,
      .bsm,
      .bxl{
        border-radius:14px !important;
        border:1px solid rgba(59,130,246,.20) !important;
        box-shadow:0 8px 18px rgba(37,99,235,.12),inset 0 1px 0 rgba(255,255,255,.90) !important;
      }

      .btn.bc1,
      .btn.bxl,
      .bc1{
        background:linear-gradient(145deg,#3b82f6,#2563eb) !important;
        color:#fff !important;
        border-color:rgba(255,255,255,.35) !important;
        box-shadow:0 14px 28px rgba(37,99,235,.28),inset 0 1px 0 rgba(255,255,255,.45) !important;
      }

      input,
      select,
      textarea{
        background:rgba(255,255,255,.78) !important;
        border:1px solid rgba(59,130,246,.20) !important;
        border-radius:14px !important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 6px 16px rgba(37,99,235,.07) !important;
      }

      input:focus,
      select:focus,
      textarea:focus{
        border-color:rgba(37,99,235,.55) !important;
        box-shadow:0 0 0 4px rgba(59,130,246,.13),inset 0 1px 0 rgba(255,255,255,.95) !important;
        outline:none !important;
      }

      table{
        border-collapse:separate !important;
        border-spacing:0 !important;
      }

      thead th{
        background:linear-gradient(145deg,rgba(239,246,255,.95),rgba(255,255,255,.85)) !important;
        color:#1e3a8a !important;
      }

      tbody tr{
        transition:background .16s ease, transform .16s ease !important;
      }

      tbody tr:hover{
        background:rgba(239,246,255,.75) !important;
      }

      .ct,
      h1,h2,h3{
        color:#0f172a !important;
        letter-spacing:.2px;
      }

      .ct-s,
      label,
      small,
      .muted{
        color:var(--nx-muted) !important;
      }

      .av,
      .avatar,
      .ico,
      .nxDC-head-icon,
      .nxDC-kpi-icon,
      .nxDC-ag-avatar{
        box-shadow:0 10px 22px rgba(37,99,235,.20),inset 0 1px 0 rgba(255,255,255,.55) !important;
      }

      .mobile-bottom-nav-clean{
        background:rgba(255,255,255,.78) !important;
        backdrop-filter:blur(22px) saturate(150%) !important;
        -webkit-backdrop-filter:blur(22px) saturate(150%) !important;
        border:1px solid rgba(255,255,255,.85) !important;
        box-shadow:0 20px 45px rgba(37,99,235,.18),inset 0 1px 0 rgba(255,255,255,.90) !important;
      }

      .mobile-bottom-nav-clean button.active{
        background:linear-gradient(145deg,#eff6ff,#dbeafe) !important;
        color:#2563eb !important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.95),0 8px 18px rgba(37,99,235,.14) !important;
      }

      #nxDetallesCobroV1 .nxDC-wrap{
        gap:16px !important;
      }

      #nxDetallesCobroV1 .nxDC-head{
        background:
          radial-gradient(circle at top left, rgba(96,165,250,.22), transparent 38%),
          linear-gradient(145deg, rgba(255,255,255,.88), rgba(239,246,255,.70)) !important;
      }

      #nxDetallesCobroV1 .nxDC-banco-row{
        background:linear-gradient(145deg,rgba(255,255,255,.88),rgba(239,246,255,.70)) !important;
        border:1px solid rgba(59,130,246,.16) !important;
        border-radius:16px !important;
        margin-bottom:8px !important;
        box-shadow:0 8px 18px rgba(37,99,235,.10),inset 0 1px 0 rgba(255,255,255,.92) !important;
      }

      #nxDetallesCobroV1 .nxDC-banco-cell i{
        width:34px;
        height:34px;
        border-radius:12px;
        display:grid;
        place-items:center;
        background:linear-gradient(145deg,#dbeafe,#ffffff) !important;
        color:#2563eb !important;
      }

      #nxDetallesCobroV1 .nxDC-donut-chart{
        filter:drop-shadow(0 14px 18px rgba(37,99,235,.18)) !important;
      }

      .overlay.on,
      .overlay.open{
        background:rgba(15,23,42,.18) !important;
        backdrop-filter:blur(8px) !important;
        -webkit-backdrop-filter:blur(8px) !important;
      }

      .modal{
        border-radius:24px !important;
      }

      ::-webkit-scrollbar{
        width:10px;
        height:10px;
      }

      ::-webkit-scrollbar-track{
        background:rgba(219,234,254,.55);
      }

      ::-webkit-scrollbar-thumb{
        background:linear-gradient(180deg,#93c5fd,#3b82f6);
        border-radius:999px;
        border:2px solid rgba(255,255,255,.75);
      }

      @media(max-width:768px){
        .nc,
        .card,
        .kpi,
        .sm,
        .qa,
        .box,
        .panel,
        #nxDetallesCobroV1 .nxDC-card,
        #nxDetallesCobroV1 .nxDC-kpi{
          border-radius:18px !important;
          box-shadow:0 10px 24px rgba(37,99,235,.12),0 3px 8px rgba(15,23,42,.05),inset 0 1px 0 rgba(255,255,255,.88) !important;
        }

        body{
          background:
            radial-gradient(circle at 20% 0%, rgba(96,165,250,.32), transparent 36%),
            linear-gradient(135deg,#f2f8ff,#dbeafe) !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();
})();
/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - SIDEBAR V3 BLANCO/GLASS + TICKER BLANCO + ADMIN AZUL
   Reemplaza los 3 bloques anteriores que fallaban (apuntaban a
   aside/.sidebar/.side cuando el HTML usa nav.sb).
   - Items del menú estilo card flotante con box-shadow suave
   - Activo: fondo azul claro con sombra premium
   - Ticker: blanco/glass igualando el tono del sidebar
   - Badge ADMIN: morado → azul
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_SIDEBAR_V3__) return;
  window.__NEXUS_SIDEBAR_V3__ = true;

  function injectCSS() {
    if (document.getElementById("nx-sidebar-v3-css")) return;

    // Limpiar restos de versiones anteriores si quedaron sueltos
    ['nx-fix-sidebar-glass-css', 'nx-force-white-sidebar', 'nx-force-drawer-glass-v2',
     'nx-force-white-sidebar-fuerte', 'nx-force-drawer-glass-v2-css'].forEach(id => {
      const old = document.getElementById(id);
      if (old) old.remove();
    });

    const style = document.createElement("style");
    style.id = "nx-sidebar-v3-css";
    style.textContent = `
      /* ═══ SIDEBAR nav.sb — fondo blanco/glass ═══ */
      nav.sb {
        background:
          radial-gradient(circle at top left, rgba(96,165,250,.18), transparent 45%),
          linear-gradient(180deg, #ffffff, #f1f5f9) !important;
        backdrop-filter: blur(24px) saturate(160%);
        -webkit-backdrop-filter: blur(24px) saturate(160%);
        border-right: 1px solid rgba(59,130,246,.18) !important;
        box-shadow:
          8px 0 28px rgba(37,99,235,.10),
          inset 1px 0 0 rgba(255,255,255,.95) !important;
      }

      /* Header del sidebar (logo + nombre) */
      nav.sb .sb-top {
        border-bottom: 1px solid rgba(59,130,246,.12) !important;
      }
      nav.sb .sb-mk {
        box-shadow:
          0 6px 16px rgba(59,130,246,.35),
          inset 0 1px 0 rgba(255,255,255,.4) !important;
      }
      nav.sb .sb-nm { color: #0f172a !important; }
      nav.sb .sb-sm { color: #64748b !important; }

      /* Subtítulos de sección (PRINCIPAL, SISTEMA) */
      nav.sb .ss { color: #94a3b8 !important; }

      /* ═══ ITEMS DEL MENÚ — estilo card flotante ═══ */
      nav.sb .ni {
        color: #475569;
        background: #ffffff;
        border: 1px solid rgba(59,130,246,.08);
        box-shadow:
          0 1px 3px rgba(15,23,42,.04),
          0 1px 2px rgba(15,23,42,.02);
        transition: all .18s ease;
      }
      nav.sb .ni:hover {
        background: linear-gradient(135deg, #eff6ff, #dbeafe) !important;
        border-color: rgba(59,130,246,.25);
        box-shadow:
          0 4px 12px rgba(37,99,235,.12),
          0 2px 4px rgba(15,23,42,.05),
          inset 0 1px 0 rgba(255,255,255,.9);
        transform: translateY(-1px);
      }

      /* Item activo */
      nav.sb .ni.on {
        background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
        border-color: rgba(37,99,235,.35);
        box-shadow:
          0 6px 16px rgba(37,99,235,.18),
          0 2px 6px rgba(15,23,42,.06),
          inset 0 1px 0 rgba(255,255,255,.7) !important;
      }
      nav.sb .ni.on::before {
        background: #2563eb !important;
      }

      /* Íconos y labels */
      nav.sb .ni-i { color: #64748b !important; }
      nav.sb .ni:hover .ni-i,
      nav.sb .ni.on   .ni-i { color: #2563eb !important; }

      nav.sb .ni-l { color: #475569 !important; }
      nav.sb .ni:hover .ni-l { color: #0f172a !important; font-weight: 600; }
      nav.sb .ni.on   .ni-l { color: #0f172a !important; font-weight: 700; }

      /* Chevrons de Contabilidad/Configuración */
      nav.sb .ni i.ti-chevron-down { color: #94a3b8 !important; }

      /* Badges rojos (Clientes/Pólizas pendientes) */
      nav.sb .ni-b {
        box-shadow: 0 2px 6px rgba(239,68,68,.35);
      }

      /* Badge ADMIN (morado → azul) */
      nav.sb #niAdmin2 > span:not(.ni-l) {
        background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
        box-shadow: 0 2px 6px rgba(37,99,235,.35) !important;
      }

      /* ═══ FOOTER (perfil de usuario) ═══ */
      nav.sb .sb-ft {
        border-top: 1px solid rgba(59,130,246,.12) !important;
      }
      nav.sb .sb-u {
        background: linear-gradient(135deg, #ffffff, #f8fafc) !important;
        border: 1px solid rgba(59,130,246,.12);
        box-shadow:
          0 2px 8px rgba(15,23,42,.05),
          inset 0 1px 0 rgba(255,255,255,.9);
        transition: all .18s ease;
      }
      nav.sb .sb-u:hover {
        background: linear-gradient(135deg, #eff6ff, #dbeafe) !important;
        box-shadow:
          0 4px 14px rgba(37,99,235,.15),
          inset 0 1px 0 rgba(255,255,255,.9) !important;
      }
      nav.sb .sb-av {
        box-shadow:
          0 4px 10px rgba(59,130,246,.35),
          inset 0 1px 0 rgba(255,255,255,.4) !important;
      }
      nav.sb .sb-un { color: #0f172a !important; }
      nav.sb .sb-ur { color: #64748b !important; }

      /* ═══ TICKER (barra superior con PRIMA/COBRADO/PENDIENTE) ═══ */
      .ticker {
        background:
          linear-gradient(180deg, rgba(255,255,255,.92), rgba(241,245,249,.88)) !important;
        backdrop-filter: blur(20px) saturate(160%);
        -webkit-backdrop-filter: blur(20px) saturate(160%);
        border-bottom: 1px solid rgba(59,130,246,.15) !important;
        color: #475569 !important;
        box-shadow: 0 1px 3px rgba(15,23,42,.04) !important;
      }
      .ticker .ti { color: #475569 !important; }
      .ticker .tu { color: #059669 !important; }  /* verdes: ONLINE, COBRADO, ACTIVOS */
      .ticker .td { color: #dc2626 !important; }  /* rojos: PENDIENTE, PÓLIZAS POR VENCER */

      /* Ajuste móvil: padding para que los items-card respiren */
      @media (max-width: 768px) {
        nav.sb .sb-nav { padding: 8px 8px; }
        nav.sb .ni { padding: 9px 11px; margin-bottom: 4px; }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectCSS, { once: true });
  } else {
    injectCSS();
  }
})();
/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - ANIMACIÓN GLOBAL DE MÓDULOS Y CONTENIDOS
   Solo visual. No cambia lógica.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_GLOBAL_MOTION_V1__) return;
  window.__NEXUS_GLOBAL_MOTION_V1__ = true;

  function injectCSS() {
    if (document.getElementById("nx-global-motion-css")) return;

    const style = document.createElement("style");
    style.id = "nx-global-motion-css";

    style.textContent = `
      @keyframes nxFadeSlideUp {
        from {
          opacity: 0;
          transform: translateY(14px) scale(.985);
          filter: blur(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }
      }

      @keyframes nxFadeSlideRight {
        from {
          opacity: 0;
          transform: translateX(18px);
          filter: blur(4px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
          filter: blur(0);
        }
      }

      .view.on {
        animation: nxFadeSlideRight .34s cubic-bezier(.2,.8,.2,1) both;
      }

      .view.on .nc,
      .view.on .card,
      .view.on .kpi,
      .view.on .sm,
      .view.on .qa,
      .view.on .panel,
      .view.on .box,
      .view.on table,
      .view.on form,
      #nxDetallesCobroV1 .nxDC-card,
      #nxDetallesCobroV1 .nxDC-kpi,
      #nxDetallesCobroV1 .nxDC-head {
        animation: nxFadeSlideUp .38s cubic-bezier(.2,.8,.2,1) both;
      }

      .view.on .nc:nth-child(1),
      .view.on .card:nth-child(1),
      .view.on .kpi:nth-child(1) { animation-delay: .03s; }

      .view.on .nc:nth-child(2),
      .view.on .card:nth-child(2),
      .view.on .kpi:nth-child(2) { animation-delay: .06s; }

      .view.on .nc:nth-child(3),
      .view.on .card:nth-child(3),
      .view.on .kpi:nth-child(3) { animation-delay: .09s; }

      .view.on .nc:nth-child(4),
      .view.on .card:nth-child(4),
      .view.on .kpi:nth-child(4) { animation-delay: .12s; }

      .view.on .nc:nth-child(5),
      .view.on .card:nth-child(5),
      .view.on .kpi:nth-child(5) { animation-delay: .15s; }

      .btn,
      button,
      .mobile-bottom-nav-clean button,
      .mobile-more-sheet-clean button {
        transition:
          transform .18s ease,
          box-shadow .18s ease,
          background .18s ease,
          color .18s ease !important;
      }

      .btn:active,
      button:active,
      .mobile-bottom-nav-clean button:active,
      .mobile-more-sheet-clean button:active {
        transform: scale(.96) !important;
      }

      .nc,
      .card,
      .kpi,
      .sm,
      .qa,
      .panel,
      .box {
        transition:
          transform .22s ease,
          box-shadow .22s ease,
          border-color .22s ease,
          background .22s ease !important;
      }

      .nc:hover,
      .card:hover,
      .kpi:hover,
      .sm:hover,
      .qa:hover {
        transform: translateY(-2px);
      }

      .overlay.open .modal,
      .overlay.on .modal {
        animation: nxFadeSlideUp .28s cubic-bezier(.2,.8,.2,1) both;
      }

      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();
})();
/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - ICONOS DASHBOARD 3D CENTRALIZADOS
   Solo visual. No cambia lógica.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_DASHBOARD_ICONS_3D__) return;
  window.__NEXUS_DASHBOARD_ICONS_3D__ = true;

  function injectCSS() {
    if (document.getElementById("nx-dashboard-icons-3d-css")) return;

    const style = document.createElement("style");
    style.id = "nx-dashboard-icons-3d-css";

    style.textContent = `
      #v-dashboard .ti,
      #v-dashboard i[class*="ti-"],
      #v-dashboard .ico,
      #v-dashboard svg {
        display: inline-grid !important;
        place-items: center !important;
        text-align: center !important;
        vertical-align: middle !important;
      }

      #v-dashboard .kpi i,
      #v-dashboard .kpi .ti,
      #v-dashboard .sm i,
      #v-dashboard .sm .ti,
      #v-dashboard .qa i,
      #v-dashboard .qa .ti,
      #v-dashboard .nc i,
      #v-dashboard .nc .ti {
        width: 46px !important;
        height: 46px !important;
        min-width: 46px !important;
        border-radius: 16px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,.96), rgba(219,234,254,.86)) !important;
        color: #2563eb !important;
        box-shadow:
          0 12px 24px rgba(37,99,235,.24),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(37,99,235,.10) !important;
        border: 1px solid rgba(59,130,246,.20) !important;
        font-size: 22px !important;
        line-height: 1 !important;
      }

      #v-dashboard .kpi,
      #v-dashboard .sm,
      #v-dashboard .qa {
        align-items: center !important;
      }

      #v-dashboard .kpi > *,
      #v-dashboard .sm > *,
      #v-dashboard .qa > * {
        align-self: center !important;
      }

      #v-dashboard .kpi i::before,
      #v-dashboard .sm i::before,
      #v-dashboard .qa i::before,
      #v-dashboard .nc i::before {
        display: block !important;
        line-height: 1 !important;
      }

      #v-dashboard .kpi:hover i,
      #v-dashboard .sm:hover i,
      #v-dashboard .qa:hover i,
      #v-dashboard .nc:hover i {
        transform: translateY(-2px) scale(1.04);
        box-shadow:
          0 16px 30px rgba(37,99,235,.30),
          0 6px 14px rgba(15,23,42,.10),
          inset 0 1px 0 rgba(255,255,255,1),
          inset 0 -2px 8px rgba(37,99,235,.14) !important;
      }

      #v-dashboard .kpi i,
      #v-dashboard .sm i,
      #v-dashboard .qa i,
      #v-dashboard .nc i {
        transition: transform .18s ease, box-shadow .18s ease !important;
      }

      @media(max-width:768px){
        #v-dashboard .kpi i,
        #v-dashboard .kpi .ti,
        #v-dashboard .sm i,
        #v-dashboard .sm .ti,
        #v-dashboard .qa i,
        #v-dashboard .qa .ti,
        #v-dashboard .nc i,
        #v-dashboard .nc .ti {
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          border-radius: 14px !important;
          font-size: 19px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - MÓDULO SOLICITUDES (ADMIN)
   Vista nueva accesible desde el sidebar con badge de pendientes.
   Centraliza acciones que requieren tu atención:
     1. Entregas pendientes de confirmar/depositar/anular
     2. Transferencias entre agentes (resumen + nueva)
     3. Recibir entrega física de agente
   Solo visible si sesion.rol === 'admin'.
   ════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (window.__NEXUS_SOLICITUDES_V1__) return;
  window.__NEXUS_SOLICITUDES_V1__ = true;

  // ── Helpers compartidos (mismo patrón que V2) ──
  function st() {
    try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); }
    catch(e) { return window.ST || {}; }
  }
  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function getFmt() {
    return (typeof fmt === 'function') ? fmt :
      (n => 'RD$ ' + Number(n||0).toLocaleString('en-US', {minimumFractionDigits:0, maximumFractionDigits:0}));
  }
  function esAdmin() {
    try { return (typeof sesion !== 'undefined') && sesion?.rol === 'admin'; }
    catch(e) { try { return window.sesion?.rol === 'admin'; } catch(_) { return false; } }
  }
  // Obtiene el ID del agente del usuario actual (no admin)
  function getMiAgenteId() {
    try {
      const s = (typeof sesion !== 'undefined') ? sesion : window.sesion;
      if (!s) return null;
      // Intentar varios campos posibles
      return s.agente_id || s.agenteId || s.usuario_id || s.id || null;
    } catch(e) { return null; }
  }
  // Filtra solicitudes según el rol (admin ve todo, agente ve solo suyas)
  function filtrarPorRol(items, campoAgente) {
    if (esAdmin()) return items;
    const miId = getMiAgenteId();
    if (!miId) return [];
    // campoAgente puede ser string (un campo) o array (varios)
    const campos = Array.isArray(campoAgente) ? campoAgente : [campoAgente];
    return items.filter(it => campos.some(c => String(it[c]) === String(miId)));
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function fmtFecha(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('es-DO', {day:'2-digit', month:'2-digit', year:'numeric'}); }
    catch(e) { return iso; }
  }

  // ── Estado local ──
  let _entregasCache = [];
  let _transferenciasCache = [];

  // ═══════════════════════════════════════════════════════════════
  // INYECCIÓN: sidebar item + view container
  // ═══════════════════════════════════════════════════════════════
  function inyectarSidebarItem() {
    if (document.getElementById('niSolicit')) return true;
    const sbNav = document.querySelector('nav.sb .sb-nav');
    if (!sbNav) return false;
    // Insertar después de CLIENTES
    const anchor = document.getElementById('niCli') || document.getElementById('niPol');
    const item = document.createElement('div');
    item.className = 'ni';
    item.id = 'niSolicit';
    // Visible para TODOS los roles
    item.setAttribute('onclick', "nav('solicitudes', this); window.nxRenderSolicitudes && window.nxRenderSolicitudes()");
    item.innerHTML = `
      <i class="ti ti-inbox ni-i"></i>
      <span class="ni-l">SOLICITUDES</span>
      <span class="ni-b" id="niSolicitBadge" style="display:none">0</span>
    `;
    if (anchor && anchor.nextSibling) {
      sbNav.insertBefore(item, anchor.nextSibling);
    } else if (anchor) {
      sbNav.appendChild(item);
    } else {
      sbNav.appendChild(item);
    }
    return true;
  }

  function inyectarVistaContainer() {
    if (document.getElementById('v-solicitudes')) return true;
    const cnt = document.getElementById('cnt');
    if (!cnt) return false;
    const view = document.createElement('div');
    view.className = 'view';
    view.id = 'v-solicitudes';
    view.innerHTML = '<div class="nxSL-loading">Cargando solicitudes...</div>';
    cnt.appendChild(view);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // BOTÓN EN DASHBOARD (acceso rápido) - visible para todos los roles
  // ═══════════════════════════════════════════════════════════════
  function inyectarBotonDashboard() {
    if (document.getElementById('qaSolicit')) return true;
    
    // Buscar el grid de accesos rápidos del Dashboard
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    
    // Buscar el primer .qa para clonar la estructura
    const qaExistente = vDash.querySelector('.qa');
    if (!qaExistente) return false;
    
    const qaGrid = qaExistente.parentElement;
    if (!qaGrid) return false;
    
    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaSolicit';
    btn.setAttribute('onclick', "window.nxAbrirSolicitudes && window.nxAbrirSolicitudes()");
    btn.style.position = 'relative';
    btn.innerHTML = `
      <span class="qa-i" style="position:relative">
        <i class="ti ti-inbox"></i>
        <span class="qaSolicitBadge" id="qaSolicitBadge" style="display:none"></span>
      </span>
      <div class="qa-l">Solicitudes</div>
    `;
    
    // Insertar al inicio del grid para que sea visible
    qaGrid.insertBefore(btn, qaGrid.firstChild);
    
    // Actualizar badge del Dashboard
    actualizarBadgeDashboard();
    return true;
  }
  
  async function actualizarBadgeDashboard() {
    const badge = document.getElementById('qaSolicitBadge');
    if (!badge) return;
    if (!esAdmin()) {
      badge.style.display = 'none';
      return;
    }
    try {
      const entregas = _entregasCache.length ? _entregasCache : await cargarEntregas();
      const pend = entregas.filter(e => !e.confirmado).length;
      if (pend > 0) {
        badge.textContent = pend > 9 ? '9+' : String(pend);
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    } catch(e) {}
  }

  // ═══════════════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ═══════════════════════════════════════════════════════════════
  async function cargarEntregas() {
    const api = getAPI();
    if (!api || !api.get) return [];
    try {
      const data = await api.get('entregas_admin', 'select=*&order=fecha.desc,created_at.desc&limit=500');
      return Array.isArray(data) ? data : [];
    } catch(e) { return []; }
  }
  async function cargarTransferencias() {
    const api = getAPI();
    if (!api || !api.get) return [];
    try {
      const data = await api.get('transferencias_agentes', 'select=*&order=fecha.desc&limit=500');
      return Array.isArray(data) ? data : [];
    } catch(e) { return []; }
  }

  // ═══════════════════════════════════════════════════════════════
  // BADGE DE PENDIENTES (siempre visible en sidebar)
  // ═══════════════════════════════════════════════════════════════
  async function actualizarBadge() {
    const it = document.getElementById('niSolicit');
    if (it) it.style.display = ''; // Visible para todos
    const badge = document.getElementById('niSolicitBadge');
    const dashBadge = document.getElementById('qaSolicitBadge');
    try {
      const entregas = await cargarEntregas();
      _entregasCache = entregas;
      const transferencias = await cargarTransferencias();
      _transferenciasCache = transferencias;
      
      let pend = 0;
      if (esAdmin()) {
        // Admin: cuenta TODAS las entregas pendientes de confirmar
        pend = entregas.filter(e => !e.confirmado).length;
      } else {
        // Agente: cuenta solo las transferencias entrantes pendientes hacia él
        const miId = getMiAgenteId();
        if (miId) {
          pend = transferencias.filter(t => 
            String(t.hacia_agente) === String(miId) && 
            t.estado === 'pendiente'
          ).length;
        }
      }
      
      // Badge sidebar
      if (badge) {
        if (pend > 0) {
          badge.textContent = pend > 99 ? '99+' : String(pend);
          badge.style.display = '';
        } else {
          badge.style.display = 'none';
        }
      }
      // Badge dashboard
      if (dashBadge) {
        if (pend > 0) {
          dashBadge.textContent = pend > 9 ? '9+' : String(pend);
          dashBadge.style.display = '';
        } else {
          dashBadge.style.display = 'none';
        }
      }
    } catch(e) {
      if (badge) badge.style.display = 'none';
      if (dashBadge) dashBadge.style.display = 'none';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL DEL MÓDULO
  // ═══════════════════════════════════════════════════════════════
  async function renderSolicitudes() {
    const view = document.getElementById('v-solicitudes');
    if (!view) return;
    view.innerHTML = '<div class="nxSL-loading">Cargando...</div>';

    const [entregas, transferencias] = await Promise.all([cargarEntregas(), cargarTransferencias()]);
    
    // FILTRAR según rol
    let entregasView = entregas;
    let transferenciasView = transferencias;
    if (!esAdmin()) {
      const miId = getMiAgenteId();
      if (miId) {
        // Agente: solo sus entregas (donde él entregó)
        entregasView = entregas.filter(e => String(e.agente_id) === String(miId));
        // Agente: solo transferencias donde él participa (desde o hacia)
        transferenciasView = transferencias.filter(t => 
          String(t.desde_agente) === String(miId) || 
          String(t.hacia_agente) === String(miId)
        );
      } else {
        entregasView = [];
        transferenciasView = [];
      }
    }
    
    _entregasCache = entregas; // cache global completo (para admin)
    _transferenciasCache = transferencias;

    view.innerHTML = `
      <div class="nxSL-wrap">
        ${renderHeaderSolicitudes(entregasView, transferenciasView)}
        ${renderSeccionEntregasPendientes(entregasView)}
        ${renderSeccionTransferencias(transferenciasView)}
        ${renderSeccionHistorial(entregasView, transferenciasView)}
        ${renderSeccionRecibirEntrega()}
      </div>
    `;

    // Refrescar badge en sidebar
    actualizarBadge();
  }

  function renderHeaderSolicitudes(entregas, transferencias) {
    const F = getFmt();
    const pendientes = entregas.filter(e => !e.confirmado);
    const directosPend = pendientes.filter(e => e.es_directo);
    const fisicasPend = pendientes.filter(e => !e.es_directo);
    const montoPend = pendientes.reduce((s, e) => s + Number(e.monto || 0), 0);

    return `
      <div class="nxSL-head">
        <div class="nxSL-head-icon"><i class="ti ti-inbox"></i></div>
        <div class="nxSL-head-body">
          <h1 class="nxSL-title">SOLICITUDES PENDIENTES</h1>
          <div class="nxSL-sub">Acciones que requieren tu atención como administrador</div>
        </div>
        <div class="nxSL-head-stats">
          <div class="nxSL-stat">
            <div class="nxSL-stat-val">${pendientes.length}</div>
            <div class="nxSL-stat-lbl">Por confirmar</div>
          </div>
          <div class="nxSL-stat">
            <div class="nxSL-stat-val">${F(montoPend)}</div>
            <div class="nxSL-stat-lbl">Monto total</div>
          </div>
          <div class="nxSL-stat">
            <div class="nxSL-stat-val">${directosPend.length}</div>
            <div class="nxSL-stat-lbl">Depósitos directos</div>
          </div>
          <div class="nxSL-stat">
            <div class="nxSL-stat-val">${fisicasPend.length}</div>
            <div class="nxSL-stat-lbl">Entregas físicas</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSeccionEntregasPendientes(entregas) {
    const F = getFmt();
    const pend = entregas.filter(e => !e.confirmado);
    const confirmadasNoDep = entregas.filter(e => e.confirmado && !e.depositado);

    const pendRows = pend.map(e => {
      const ag = (st().agentes || []).find(a => String(a.id) === String(e.agente_id));
      const nomAg = ag?.nom || '—';
      const directoBadge = e.es_directo ? '<span class="nxSL-tag nxSL-tag-direct"><i class="ti ti-arrow-down"></i> DIRECTO</span>' : '<span class="nxSL-tag nxSL-tag-fisico"><i class="ti ti-cash"></i> FÍSICO</span>';
      // Botones según rol: confirmar y anular SOLO admin
      const accionesPend = esAdmin() ? `
            <button class="nxSL-btn nxSL-btn-conf" onclick="window.nxConfirmarEntregaAdmin('${esc(e.id)}')" title="Confirmar"><i class="ti ti-check"></i> Confirmar</button>
            <button class="nxSL-btn nxSL-btn-anu" onclick="window.nxAnularEntregaAdmin('${esc(e.id)}')" title="Anular"><i class="ti ti-x"></i> Anular</button>
      ` : '<span class="nxSL-muted">Esperando confirmación del admin</span>';
      return `
        <tr>
          <td class="nxSL-tx-fecha">${fmtFecha(e.fecha)}</td>
          <td><strong>${esc(nomAg)}</strong></td>
          <td class="nxSL-num">${F(e.monto)}</td>
          <td>${esc(e.metodo || '')}${e.banco ? `<br><span class="nxSL-muted">${esc(e.banco)}</span>` : ''}</td>
          <td class="nxSL-tx-ref">${esc(e.referencia || '—')}</td>
          <td>${directoBadge}</td>
          <td class="nxSL-actions">${accionesPend}</td>
        </tr>
      `;
    }).join('');

    const depRows = confirmadasNoDep.map(e => {
      const ag = (st().agentes || []).find(a => String(a.id) === String(e.agente_id));
      const nomAg = ag?.nom || '—';
      // Depositar: admin SIEMPRE, agente solo si es SU propia entrega
      const miId = getMiAgenteId();
      const puedeDepositar = esAdmin() || (miId && String(e.agente_id) === String(miId));
      const accionesDep = puedeDepositar ? `
            <button class="nxSL-btn nxSL-btn-dep" onclick="window.nxDepositarEntregaAdmin('${esc(e.id)}')" title="Marcar como depositado"><i class="ti ti-building-bank"></i> Depositar</button>
      ` : '<span class="nxSL-muted">—</span>';
      return `
        <tr>
          <td class="nxSL-tx-fecha">${fmtFecha(e.fecha)}</td>
          <td><strong>${esc(nomAg)}</strong></td>
          <td class="nxSL-num">${F(e.monto)}</td>
          <td>${esc(e.metodo || '')}</td>
          <td class="nxSL-tx-ref">${esc(e.referencia || '—')}</td>
          <td class="nxSL-actions">${accionesDep}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="nxSL-section nxSL-section-pend">
        <div class="nxSL-section-head">
          <div class="nxSL-section-title"><i class="ti ti-alert-circle"></i> ENTREGAS PENDIENTES DE CONFIRMAR</div>
          <div class="nxSL-section-count">${pend.length}</div>
        </div>
        ${pend.length === 0 ?
          '<div class="nxSL-empty-soft">✓ No tienes entregas pendientes. Todo al día.</div>' :
          `<div class="nxSL-table-wrap">
            <table class="nxSL-table">
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>AGENTE</th>
                  <th class="nxSL-num">MONTO</th>
                  <th>MÉTODO / BANCO</th>
                  <th>REFERENCIA</th>
                  <th>TIPO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>${pendRows}</tbody>
            </table>
          </div>`
        }
      </div>

      ${confirmadasNoDep.length > 0 ? `
      <div class="nxSL-section nxSL-section-dep">
        <div class="nxSL-section-head">
          <div class="nxSL-section-title"><i class="ti ti-building-bank"></i> CONFIRMADAS — POR DEPOSITAR AL BANCO</div>
          <div class="nxSL-section-count nxSL-count-blue">${confirmadasNoDep.length}</div>
        </div>
        <div class="nxSL-table-wrap">
          <table class="nxSL-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>AGENTE</th>
                <th class="nxSL-num">MONTO</th>
                <th>MÉTODO</th>
                <th>REFERENCIA</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>${depRows}</tbody>
          </table>
        </div>
      </div>
      ` : ''}
    `;
  }

  function renderSeccionTransferencias(transferencias) {
    const F = getFmt();
    
    // Separar pendientes (las que el usuario actual debe aprobar/rechazar)
    const miId = getMiAgenteId();
    let pendientesEntrantes = [];
    if (esAdmin()) {
      pendientesEntrantes = transferencias.filter(t => t.estado === 'pendiente');
    } else if (miId) {
      pendientesEntrantes = transferencias.filter(t => 
        t.estado === 'pendiente' && String(t.hacia_agente) === String(miId)
      );
    }
    
    // Resto: confirmadas o historial
    const historial = transferencias.filter(t => !t.estado || t.estado === 'aceptada');
    const ultimas = historial.slice(0, 10);
    const totalMes = historial
      .filter(t => {
        if (!t.fecha) return false;
        try {
          const d = new Date(t.fecha);
          const ahora = new Date();
          return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
        } catch(e) { return false; }
      })
      .reduce((s, t) => s + Number(t.monto || 0), 0);
    
    // Filas de PENDIENTES con botones de Aceptar/Rechazar
    const filasPendientes = pendientesEntrantes.map(t => {
      const desde = (st().agentes || []).find(a => String(a.id) === String(t.desde_agente))?.nom || '—';
      const hacia = (st().agentes || []).find(a => String(a.id) === String(t.hacia_agente))?.nom || '—';
      return `
        <tr>
          <td class="nxSL-tx-fecha">${fmtFecha(t.fecha)}</td>
          <td>${esc(desde)}</td>
          <td><i class="ti ti-arrow-right" style="color:#f59e0b"></i></td>
          <td><strong>${esc(hacia)}</strong></td>
          <td class="nxSL-num">${F(t.monto)}</td>
          <td>${esc(t.metodo || '')}${t.banco ? `<br><span class="nxSL-muted">${esc(t.banco)}</span>` : ''}</td>
          <td class="nxSL-tx-ref">${esc(t.referencia || '—')}</td>
          <td class="nxSL-actions">
            <button class="nxSL-btn nxSL-btn-conf" onclick="window.nxAceptarTransferencia('${esc(t.id)}')" title="Aceptar"><i class="ti ti-check"></i> Aceptar</button>
            <button class="nxSL-btn nxSL-btn-anu" onclick="window.nxRechazarTransferencia('${esc(t.id)}')" title="Rechazar"><i class="ti ti-x"></i> Rechazar</button>
          </td>
        </tr>
      `;
    }).join('');

    const filas = ultimas.map(t => {
      const desde = (st().agentes || []).find(a => String(a.id) === String(t.desde_agente))?.nom || '—';
      const hacia = (st().agentes || []).find(a => String(a.id) === String(t.hacia_agente))?.nom || '—';
      return `
        <tr>
          <td class="nxSL-tx-fecha">${fmtFecha(t.fecha)}</td>
          <td>${esc(desde)}</td>
          <td><i class="ti ti-arrow-right" style="color:#2563eb"></i></td>
          <td><strong>${esc(hacia)}</strong></td>
          <td class="nxSL-num">${F(t.monto)}</td>
          <td>${esc(t.metodo || '')}${t.banco ? `<br><span class="nxSL-muted">${esc(t.banco)}</span>` : ''}</td>
          <td class="nxSL-tx-ref">${esc(t.referencia || '—')}</td>
        </tr>
      `;
    }).join('');
    
    // Bloque de pendientes (si hay)
    const bloquePendientes = pendientesEntrantes.length > 0 ? `
      <div class="nxSL-transfer-hist-title" style="color:#d97706">⚠️ TRANSFERENCIAS PENDIENTES DE TU APROBACIÓN (${pendientesEntrantes.length})</div>
      <div class="nxSL-table-wrap">
        <table class="nxSL-table">
          <thead>
            <tr>
              <th>FECHA</th>
              <th>DESDE</th>
              <th></th>
              <th>HACIA</th>
              <th class="nxSL-num">MONTO</th>
              <th>MÉTODO</th>
              <th>REF</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>${filasPendientes}</tbody>
        </table>
      </div>
    ` : '';

    return `
      <div class="nxSL-section nxSL-section-transfer">
        <div class="nxSL-section-head">
          <div class="nxSL-section-title"><i class="ti ti-transfer"></i> TRANSFERENCIAS ENTRE AGENTES</div>
          <button class="nxSL-action-btn nxSL-action-blue" onclick="window.nxAbrirTransferenciaAgenteV2 && window.nxAbrirTransferenciaAgenteV2()">
            <i class="ti ti-plus"></i> Nueva transferencia
          </button>
        </div>
        ${bloquePendientes}
        <div class="nxSL-transfer-stats">
          <div class="nxSL-transfer-stat">
            <div class="nxSL-transfer-stat-lbl">TRANSFERIDO ESTE MES</div>
            <div class="nxSL-transfer-stat-val">${F(totalMes)}</div>
          </div>
          <div class="nxSL-transfer-stat">
            <div class="nxSL-transfer-stat-lbl">MOVIMIENTOS TOTALES</div>
            <div class="nxSL-transfer-stat-val">${historial.length}</div>
          </div>
        </div>
        ${ultimas.length === 0 ?
          '<div class="nxSL-empty-soft">No hay transferencias entre agentes registradas.</div>' :
          `<div class="nxSL-transfer-hist-title">ÚLTIMAS ${ultimas.length} TRANSFERENCIAS</div>
          <div class="nxSL-table-wrap">
            <table class="nxSL-table">
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>DESDE</th>
                  <th></th>
                  <th>HACIA</th>
                  <th class="nxSL-num">MONTO</th>
                  <th>MÉTODO / BANCO</th>
                  <th>REFERENCIA</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>`
        }
      </div>
    `;
  }

  function renderSeccionHistorial(entregas, transferencias) {
    const F = getFmt();
    
    // Entregas: confirmadas (depositadas o no)
    const entregasHist = entregas.filter(e => e.confirmado)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 30); // Últimas 30
    
    // Transferencias: aceptadas o rechazadas (no pendientes)
    const transfHist = transferencias.filter(t => t.estado === 'aceptada' || t.estado === 'rechazada')
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 30);
    
    const totalHist = entregasHist.length + transfHist.length;
    
    if (totalHist === 0) {
      return `
        <div class="nxSL-section nxSL-section-historial">
          <div class="nxSL-section-head">
            <div class="nxSL-section-title"><i class="ti ti-history"></i> HISTORIAL DE SOLICITUDES</div>
            <div class="nxSL-section-badge nxSL-badge-gray">0</div>
          </div>
          <div class="nxSL-empty-soft">Aún no hay solicitudes procesadas en el historial.</div>
        </div>
      `;
    }
    
    // Filas de entregas confirmadas
    const filasEntregas = entregasHist.map(e => {
      const ag = (st().agentes || []).find(a => String(a.id) === String(e.agente_id));
      const nomAg = ag?.nom || '—';
      const estado = e.depositado ? 'DEPOSITADO' : 'CONFIRMADO';
      const estadoClass = e.depositado ? 'nxSL-hist-dep' : 'nxSL-hist-conf';
      const fechaProc = e.confirmado_at || e.depositado_at || e.fecha;
      return `
        <tr>
          <td class="nxSL-hist-fecha">${fmtFecha(fechaProc)}</td>
          <td><span class="nxSL-hist-tipo nxSL-hist-tipo-entrega">Entrega</span></td>
          <td>${esc(nomAg)}</td>
          <td class="nxSL-hist-monto">${F(e.monto)}</td>
          <td>${esc(e.metodo || '')}</td>
          <td class="nxSL-hist-ref">${esc(e.referencia || '—')}</td>
          <td><span class="nxSL-hist-estado ${estadoClass}">${estado}</span></td>
        </tr>
      `;
    }).join('');
    
    // Filas de transferencias
    const filasTransf = transfHist.map(t => {
      const desde = (st().agentes || []).find(a => String(a.id) === String(t.desde_agente))?.nom || '—';
      const hacia = (st().agentes || []).find(a => String(a.id) === String(t.hacia_agente))?.nom || '—';
      const estadoClass = t.estado === 'aceptada' ? 'nxSL-hist-acept' : 'nxSL-hist-rech';
      const estadoTxt = t.estado === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA';
      return `
        <tr>
          <td class="nxSL-hist-fecha">${fmtFecha(t.fecha)}</td>
          <td><span class="nxSL-hist-tipo nxSL-hist-tipo-transf">Transfer</span></td>
          <td>${esc(desde)} → ${esc(hacia)}</td>
          <td class="nxSL-hist-monto">${F(t.monto)}</td>
          <td>${esc(t.metodo || '')}</td>
          <td class="nxSL-hist-ref">${esc(t.referencia || '—')}</td>
          <td><span class="nxSL-hist-estado ${estadoClass}">${estadoTxt}</span></td>
        </tr>
      `;
    }).join('');
    
    return `
      <div class="nxSL-section nxSL-section-historial">
        <div class="nxSL-section-head">
          <div class="nxSL-section-title"><i class="ti ti-history"></i> HISTORIAL DE SOLICITUDES</div>
          <div class="nxSL-section-badge nxSL-badge-gray">${totalHist}</div>
        </div>
        <div class="nxSL-section-sub">Últimas solicitudes procesadas (confirmadas, rechazadas o depositadas)</div>
        <div class="nxSL-hist-tabs">
          <button class="nxSL-hist-tab nxSL-hist-tab-active" onclick="window.nxFiltrarHistorial('todos', this)" type="button">Todos (${totalHist})</button>
          <button class="nxSL-hist-tab" onclick="window.nxFiltrarHistorial('entregas', this)" type="button">Entregas (${entregasHist.length})</button>
          <button class="nxSL-hist-tab" onclick="window.nxFiltrarHistorial('transf', this)" type="button">Transferencias (${transfHist.length})</button>
        </div>
        <div class="nxSL-hist-table-wrap">
          <table class="nxSL-hist-table" id="nxSL-hist-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>TIPO</th>
                <th>AGENTE / RUTA</th>
                <th class="nxSL-hist-monto">MONTO</th>
                <th>MÉTODO</th>
                <th>REFERENCIA</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>${filasEntregas}${filasTransf}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Filtrar historial por tipo
  window.nxFiltrarHistorial = function(tipo, btn) {
    const tabla = document.getElementById('nxSL-hist-table');
    if (!tabla) return;
    // Cambiar tab activo
    document.querySelectorAll('.nxSL-hist-tab').forEach(t => t.classList.remove('nxSL-hist-tab-active'));
    if (btn) btn.classList.add('nxSL-hist-tab-active');
    // Filtrar filas
    const rows = tabla.querySelectorAll('tbody tr');
    rows.forEach(r => {
      const tipoCell = r.querySelector('.nxSL-hist-tipo');
      if (!tipoCell) { r.style.display = ''; return; }
      const esEntrega = tipoCell.classList.contains('nxSL-hist-tipo-entrega');
      const esTransf = tipoCell.classList.contains('nxSL-hist-tipo-transf');
      if (tipo === 'todos') r.style.display = '';
      else if (tipo === 'entregas' && esEntrega) r.style.display = '';
      else if (tipo === 'transf' && esTransf) r.style.display = '';
      else r.style.display = 'none';
    });
  };

  function renderSeccionRecibirEntrega() {
    const titulo = esAdmin() ? 'RECIBIR ENTREGA DE AGENTE' : 'ENTREGAR DINERO AL ADMIN';
    const texto = esAdmin() 
      ? 'Cuando un agente te entrega <strong>efectivo en mano</strong> o te hace una <strong>transferencia bancaria</strong>, regístralo aquí. Esto reduce el "Dinero en Mano" del agente y suma a tu Caja Central.'
      : 'Cuando vayas a entregar <strong>efectivo en mano</strong> o hacer una <strong>transferencia bancaria</strong> al administrador, regístralo aquí. El admin debe confirmarlo para que se efectúe.';
    const textoBoton = esAdmin() ? 'Registrar nueva entrega' : 'Crear nueva entrega';
    const nota = esAdmin()
      ? 'Tip: si el cliente depositó directo a tu cuenta al momento de cobrar, el agente puede marcar el checkbox <strong>"Depositado directo a mi cuenta"</strong> en el modal de registrar cobro. Esa entrega aparecerá automáticamente arriba en "PENDIENTES DE CONFIRMAR".'
      : 'Tip: si al cobrar el cliente depositó directo a la cuenta del admin, puedes marcar el checkbox <strong>"Depositado directo a cuenta admin"</strong> en el modal de registrar cobro. Esa entrega aparecerá automáticamente arriba en "PENDIENTES DE CONFIRMAR".';
    
    return `
      <div class="nxSL-section nxSL-section-recibir">
        <div class="nxSL-section-head">
          <div class="nxSL-section-title"><i class="ti ti-cash"></i> ${titulo}</div>
        </div>
        <div class="nxSL-recibir-body">
          <div class="nxSL-recibir-text">${texto}</div>
          <button class="nxSL-action-btn nxSL-action-green" onclick="window.nxAbrirEntregaAdmin && window.nxAbrirEntregaAdmin()">
            <i class="ti ti-cash"></i> ${textoBoton}
          </button>
        </div>
        <div class="nxSL-recibir-note">
          <i class="ti ti-info-circle"></i>
          ${nota}
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // CSS
  // ═══════════════════════════════════════════════════════════════
  function inyectarCSS() {
    if (document.getElementById('nxSL-css')) return;
    const style = document.createElement('style');
    style.id = 'nxSL-css';
    style.textContent = `
      #v-solicitudes { padding: 0; }
      .nxSL-wrap { display:flex; flex-direction:column; gap:12px; padding-bottom:calc(96px + env(safe-area-inset-bottom)); }
      .nxSL-loading, .nxSL-empty { padding:40px; text-align:center; color:#64748b; font-weight:600; }

      /* Header */
      .nxSL-head {
        background: linear-gradient(135deg, #ffffff, #f8fafc);
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 18px 20px;
        display: flex;
        gap: 16px;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0,0,0,.03);
        flex-wrap: wrap;
      }
      .nxSL-head-icon {
        width: 52px; height: 52px;
        border-radius: 14px;
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        color: #fff;
        display: grid; place-items: center;
        font-size: 24px;
        flex: 0 0 auto;
        box-shadow: 0 6px 16px rgba(245,158,11,.35), inset 0 1px 0 rgba(255,255,255,.4);
      }
      .nxSL-head-body { flex: 1 1 280px; min-width: 0; }
      .nxSL-title { margin:0; font-size:22px; font-weight:900; color:#0f172a; letter-spacing:.3px; }
      .nxSL-sub { font-size:12px; color:#64748b; margin-top:3px; }
      .nxSL-head-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        flex: 1 1 100%;
      }
      .nxSL-stat {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
        text-align: center;
      }
      .nxSL-stat-val { font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1; font-family: var(--mono, monospace); }
      .nxSL-stat-lbl { font-size: 9.5px; font-weight: 700; color: #64748b; letter-spacing: .4px; margin-top: 6px; }

      /* Sections */
      .nxSL-section {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 1px 3px rgba(0,0,0,.03);
      }
      .nxSL-section-pend { border-left: 4px solid #f59e0b; }
      .nxSL-section-dep { border-left: 4px solid #2563eb; }
      .nxSL-section-transfer { border-left: 4px solid #7c3aed; }
      .nxSL-section-recibir { border-left: 4px solid #10b981; }

      .nxSL-section-head {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 14px; gap: 10px; flex-wrap: wrap;
      }
      .nxSL-section-title {
        font-size: 12px; font-weight: 800; color: #0f172a; letter-spacing: .6px;
        display: flex; align-items: center; gap: 8px;
      }
      .nxSL-section-title i { font-size: 17px; color:#f59e0b; }
      .nxSL-section-dep .nxSL-section-title i { color:#2563eb; }
      .nxSL-section-transfer .nxSL-section-title i { color:#7c3aed; }
      .nxSL-section-recibir .nxSL-section-title i { color:#10b981; }
      .nxSL-section-count {
        background: #fef3c7; color: #d97706;
        font-size: 12px; font-weight: 900;
        padding: 4px 10px; border-radius: 999px;
        min-width: 28px; text-align: center;
      }
      .nxSL-count-blue { background:#dbeafe; color:#2563eb; }

      /* Action buttons (Nueva transferencia, etc.) */
      .nxSL-action-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 8px 14px; border: 0; border-radius: 10px;
        font-size: 12px; font-weight: 700; cursor: pointer;
        color: #fff;
        transition: all .15s;
        box-shadow: 0 2px 6px rgba(0,0,0,.08);
      }
      .nxSL-action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,.12); }
      .nxSL-action-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
      .nxSL-action-green { background: linear-gradient(135deg, #10b981, #059669); }

      /* Tables */
      .nxSL-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .nxSL-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 720px; }
      .nxSL-table thead th {
        padding: 10px 12px; text-align: left;
        font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: .6px;
        background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
      }
      .nxSL-table tbody td {
        padding: 12px; border-bottom: 1px solid #f1f5f9;
        color: #0f172a; font-weight: 600;
      }
      .nxSL-table tbody tr:last-child td { border-bottom: 0; }
      .nxSL-table .nxSL-num { text-align: right; font-family: var(--mono, monospace); white-space: nowrap; font-weight: 700; }
      .nxSL-table th.nxSL-num { text-align: right; }
      .nxSL-tx-fecha { font-family: var(--mono, monospace); color: #64748b; font-size: 11px; white-space: nowrap; }
      .nxSL-tx-ref { font-family: var(--mono, monospace); color: #64748b; font-size: 11px; }
      .nxSL-muted { color: #94a3b8; font-size: 10px; }

      /* Tags (DIRECTO vs FÍSICO) */
      .nxSL-tag {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 3px 8px; border-radius: 6px;
        font-size: 9.5px; font-weight: 800; letter-spacing: .3px;
        white-space: nowrap;
      }
      .nxSL-tag i { font-size: 11px; }
      .nxSL-tag-direct { background: #dbeafe; color: #2563eb; }
      .nxSL-tag-fisico { background: #dcfce7; color: #059669; }

      /* Action mini buttons */
      .nxSL-actions { white-space: nowrap; display: flex; gap: 4px; }
      .nxSL-btn {
        display: inline-flex; align-items: center; gap: 4px;
        border: 0; border-radius: 8px;
        padding: 6px 10px;
        font-size: 11px; font-weight: 700; cursor: pointer;
        transition: all .15s;
      }
      .nxSL-btn i { font-size: 13px; }
      .nxSL-btn:hover { transform: translateY(-1px); }
      .nxSL-btn-conf { background: #dbeafe; color: #2563eb; }
      .nxSL-btn-conf:hover { background: #bfdbfe; }
      .nxSL-btn-anu { background: #fee2e2; color: #dc2626; }
      .nxSL-btn-anu:hover { background: #fecaca; }
      .nxSL-btn-dep { background: #dcfce7; color: #059669; }
      .nxSL-btn-dep:hover { background: #bbf7d0; }

      /* Transferencias section stats */
      .nxSL-transfer-stats {
        display: grid; grid-template-columns: 1fr 1fr;
        gap: 10px; margin-bottom: 14px;
      }
      .nxSL-transfer-stat {
        background: linear-gradient(135deg, #faf5ff, #f3e8ff);
        border: 1px solid #e9d5ff;
        border-radius: 12px;
        padding: 12px 14px;
      }
      .nxSL-transfer-stat-lbl { font-size: 9.5px; font-weight: 800; color: #7c3aed; letter-spacing: .5px; margin-bottom: 4px; }
      .nxSL-transfer-stat-val { font-size: 20px; font-weight: 900; color: #7c3aed; font-family: var(--mono, monospace); }
      .nxSL-transfer-hist-title { font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: .5px; margin: 14px 0 8px; }

      /* Recibir entrega section */
      .nxSL-recibir-body {
        display: flex; align-items: center; gap: 14px;
        padding: 16px; background: #f0fdf4;
        border: 1px solid #bbf7d0; border-radius: 12px;
        margin-bottom: 10px;
      }
      .nxSL-recibir-text { flex: 1; min-width: 0; font-size: 12px; color: #064e3b; line-height: 1.4; }
      .nxSL-recibir-note {
        display: flex; align-items: flex-start; gap: 8px;
        padding: 10px 12px; background: #eff6ff; border: 1px solid #bfdbfe;
        border-radius: 10px; font-size: 11px; color: #1e3a6e; line-height: 1.4;
      }
      .nxSL-recibir-note i { color: #2563eb; font-size: 14px; flex: 0 0 auto; margin-top: 1px; }

      /* Empty soft */
      .nxSL-empty-soft {
        padding: 20px; text-align: center;
        color: #94a3b8; font-size: 12px; font-weight: 600;
        background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;
      }

      /* Badge en sidebar (override del .ni-b para que se vea mejor) */
      nav.sb #niSolicit .ni-b {
        background: linear-gradient(135deg, #f59e0b, #ea580c);
        color: #fff;
        box-shadow: 0 2px 6px rgba(245,158,11,.4);
      }

      /* Móvil */
      @media (max-width: 768px) {
        .nxSL-head { padding: 14px; flex-direction: column; align-items: stretch; }
        .nxSL-head-icon { width: 42px; height: 42px; font-size: 19px; border-radius: 12px; }
        .nxSL-title { font-size: 17px; }
        .nxSL-sub { font-size: 11px; }
        .nxSL-head-stats { grid-template-columns: 1fr 1fr; gap: 8px; }
        .nxSL-stat { padding: 10px; }
        .nxSL-stat-val { font-size: 17px; }
        .nxSL-stat-lbl { font-size: 8.5px; }
        .nxSL-section { padding: 14px; border-radius: 14px; }
        .nxSL-section-title { font-size: 11px; }
        .nxSL-transfer-stats { grid-template-columns: 1fr; }
        .nxSL-transfer-stat-val { font-size: 17px; }
        .nxSL-recibir-body { flex-direction: column; align-items: stretch; gap: 10px; }
        .nxSL-action-btn { justify-content: center; width: 100%; }
        .nxSL-actions { flex-direction: column; gap: 4px; }
        .nxSL-btn { width: 100%; justify-content: center; }
      }
      
      /* ═══ HISTORIAL ═══ */
      .nxSL-section-historial { border-left: 4px solid #64748b; }
      .nxSL-section-historial .nxSL-section-title i { color:#64748b; }
      .nxSL-section-sub {
        font-size: 11px; color: #64748b; margin-bottom: 12px; font-weight: 500;
      }
      .nxSL-badge-gray {
        background: #e2e8f0; color: #475569;
        font-size: 12px; font-weight: 900;
        padding: 4px 10px; border-radius: 999px;
        min-width: 28px; text-align: center;
      }
      .nxSL-empty-soft {
        padding: 24px; text-align: center; color: #94a3b8;
        font-size: 12px; font-weight: 600;
        background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;
      }
      .nxSL-hist-tabs {
        display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;
      }
      .nxSL-hist-tab {
        background: #f1f5f9; border: 1px solid #e2e8f0; color: #475569;
        padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 700;
        cursor: pointer; transition: all .15s;
      }
      .nxSL-hist-tab:hover { background: #e2e8f0; }
      .nxSL-hist-tab-active {
        background: #2563eb !important; color: #fff !important; border-color: #2563eb !important;
        box-shadow: 0 2px 6px rgba(37,99,235,.25);
      }
      .nxSL-hist-table-wrap {
        overflow-x: auto; -webkit-overflow-scrolling: touch;
        border-radius: 12px; border: 1px solid #e2e8f0;
      }
      .nxSL-hist-table {
        width: 100%; border-collapse: collapse; font-size: 12px; background: #fff;
      }
      .nxSL-hist-table thead th {
        background: #f8fafc; padding: 10px 12px; text-align: left;
        font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: .5px;
        border-bottom: 1px solid #e2e8f0; white-space: nowrap;
      }
      .nxSL-hist-table th.nxSL-hist-monto { text-align: right; }
      .nxSL-hist-table tbody td {
        padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a;
        font-weight: 600;
      }
      .nxSL-hist-table tbody tr:last-child td { border-bottom: 0; }
      .nxSL-hist-table tbody tr:hover { background: #f8fafc; }
      .nxSL-hist-fecha { font-family: var(--mono, monospace); color: #64748b; font-size: 11px; }
      .nxSL-hist-ref { font-family: var(--mono, monospace); color: #64748b; font-size: 11px; }
      .nxSL-hist-monto { text-align: right; font-family: var(--mono, monospace); font-weight: 700; color: #059669; white-space: nowrap; }
      .nxSL-hist-tipo {
        display: inline-block; padding: 3px 8px; border-radius: 6px;
        font-size: 10px; font-weight: 800;
      }
      .nxSL-hist-tipo-entrega { background: #dcfce7; color: #059669; }
      .nxSL-hist-tipo-transf  { background: #ede9fe; color: #7c3aed; }
      .nxSL-hist-estado {
        display: inline-block; padding: 3px 8px; border-radius: 6px;
        font-size: 10px; font-weight: 800;
      }
      .nxSL-hist-conf  { background: #dbeafe; color: #2563eb; }
      .nxSL-hist-dep   { background: #dcfce7; color: #059669; }
      .nxSL-hist-acept { background: #dcfce7; color: #059669; }
      .nxSL-hist-rech  { background: #fee2e2; color: #dc2626; }
      
      /* ═══ BADGE EN DASHBOARD ═══ */
      .qaSolicitBadge {
        position: absolute; top: -4px; right: -4px;
        background: #dc2626; color: #fff;
        min-width: 18px; height: 18px; padding: 0 5px;
        border-radius: 9px; font-size: 10px; font-weight: 900;
        display: flex; align-items: center; justify-content: center;
        border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,.2);
        z-index: 5;
      }
      
      @media (max-width: 768px) {
        .nxSL-hist-table { min-width: 700px; font-size: 11px; }
        .nxSL-hist-table thead th, .nxSL-hist-table tbody td { padding: 8px 10px; }
        .nxSL-hist-tabs { gap: 4px; }
        .nxSL-hist-tab { padding: 5px 10px; font-size: 10px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════
  // API PÚBLICA
  // ═══════════════════════════════════════════════════════════════
  window.nxRenderSolicitudes = renderSolicitudes;
  
  // Aceptar transferencia entrante (admin o agente que recibe)
  window.nxAceptarTransferencia = async function(id) {
    const api = getAPI();
    if (!api?.patch) {
      if (typeof window.toast === 'function') window.toast('err', 'API no disponible', '');
      return;
    }
    if (!confirm('¿Aceptar esta transferencia? Se efectuará el movimiento.')) return;
    try {
      await api.patch('transferencias_agentes', `id=eq.${id}`, {
        estado: 'aceptada'
      });
      if (typeof window.logAudit === 'function') {
        window.logAudit('TRANSFERENCIA_ACEPTADA', 'ID: ' + id, 'Cobros');
      }
      if (typeof window.toast === 'function') window.toast('ok', 'Aceptada', 'La transferencia se efectuó');
      await renderSolicitudes();
    } catch(e) {
      console.error('Error al aceptar:', e);
      if (typeof window.toast === 'function') window.toast('err', 'No se pudo aceptar', e.message || '');
    }
  };
  
  // Rechazar transferencia entrante
  window.nxRechazarTransferencia = async function(id) {
    const api = getAPI();
    if (!api?.patch) {
      if (typeof window.toast === 'function') window.toast('err', 'API no disponible', '');
      return;
    }
    if (!confirm('¿Rechazar esta transferencia? El dinero NO se moverá.')) return;
    try {
      await api.patch('transferencias_agentes', `id=eq.${id}`, {
        estado: 'rechazada'
      });
      if (typeof window.logAudit === 'function') {
        window.logAudit('TRANSFERENCIA_RECHAZADA', 'ID: ' + id, 'Cobros');
      }
      if (typeof window.toast === 'function') window.toast('ok', 'Rechazada', 'La transferencia se rechazó');
      await renderSolicitudes();
    } catch(e) {
      console.error('Error al rechazar:', e);
      if (typeof window.toast === 'function') window.toast('err', 'No se pudo rechazar', e.message || '');
    }
  };
  window.nxRefrescarSolicitudes = async function() {
    await actualizarBadge();
    if (document.getElementById('v-solicitudes')?.classList.contains('on')) {
      await renderSolicitudes();
    }
  };
  window.nxAbrirSolicitudes = function() {
    if (typeof window.nav === 'function') {
      const item = document.getElementById('niSolicit');
      window.nav('solicitudes', item);
      renderSolicitudes();
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════
  function init() {
    inyectarCSS();
    let intentos = 0;
    const tryInit = function() {
      intentos++;
      const ok1 = inyectarSidebarItem();
      const ok2 = inyectarVistaContainer();
      const ok3 = inyectarBotonDashboard();
      if (ok1 && ok2) {
        actualizarBadge();
        // Refrescar badge cada 60 segundos
        setInterval(actualizarBadge, 60000);
        return;
      }
      if (intentos < 60) setTimeout(tryInit, 100);
    };
    tryInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();


/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - COBRO DIRECTO A CUENTA DEL ADMIN
   Inyecta un checkbox en el modal #mAbono "Depositado directo a mi
   cuenta" (solo si método = Transferencia/Depósito). Al guardar,
   adicionalmente crea una entrega_admin con es_directo=true,
   depositado=true, confirmado=false → aparece en Solicitudes para
   que el admin verifique en su estado de cuenta y confirme o anule.
   ════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  if (window.__NEXUS_COBRO_DIRECTO_ADMIN__) return;
  window.__NEXUS_COBRO_DIRECTO_ADMIN__ = true;

  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function st() {
    try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); }
    catch(e) { return window.ST || {}; }
  }

  function actualizarVisibilidad() {
    const met = document.getElementById('aMet')?.value || '';
    const wrap = document.getElementById('aDirectoWrap');
    if (!wrap) return;
    const show = (met === 'Transferencia' || met === 'Depósito');
    wrap.style.display = show ? 'block' : 'none';
    if (!show) {
      const chk = document.getElementById('aDirectoAdmin');
      if (chk) chk.checked = false;
    }
  }

  function inyectarCheckbox() {
    if (document.getElementById('aDirectoAdmin')) return true;
    const modal = document.getElementById('mAbono');
    if (!modal) return false;
    const refField = modal.querySelector('input#aRef')?.closest('.fr');
    if (!refField) return false;

    const wrap = document.createElement('div');
    wrap.id = 'aDirectoWrap';
    wrap.style.cssText = 'display:none;margin:8px 0;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px';
    wrap.innerHTML = `
      <label style="display:flex;align-items:flex-start;gap:8px;font-size:11px;cursor:pointer;line-height:1.4">
        <input type="checkbox" id="aDirectoAdmin" style="width:18px;height:18px;accent-color:#2563eb;margin-top:1px;flex:0 0 auto"/>
        <span>
          <strong style="color:#1e3a6e;display:block;margin-bottom:3px">Depositado directo a mi cuenta (admin)</strong>
          <span style="font-size:10px;color:#475569">
            El cliente depositó/transfirió directo a la cuenta del administrador.
            NO se le suma al "Dinero en Mano" del agente.
            Aparecerá en Solicitudes como PENDIENTE DE CONFIRMAR hasta que verifiques el depósito en tu estado de cuenta.
          </span>
        </span>
      </label>
    `;
    refField.parentElement.insertBefore(wrap, refField.nextSibling);

    const aMet = document.getElementById('aMet');
    if (aMet) aMet.addEventListener('change', actualizarVisibilidad);

    actualizarVisibilidad();
    return true;
  }

  function envolverRegAbono() {
    if (typeof window.regAbono !== 'function') return false;
    if (window.__regAbonoEnvuelto) return true;
    window.__regAbonoEnvuelto = true;

    const original = window.regAbono;

    window.regAbono = async function() {
      const chk = document.getElementById('aDirectoAdmin');
      const esDirecto = chk?.checked || false;

      // Capturar datos ANTES (el original puede modificar el DOM al final)
      let snapshot = null;
      if (esDirecto) {
        const monto = parseFloat(document.getElementById('aMnt')?.value || 0);
        const metodo = document.getElementById('aMet')?.value || '';
        const ref = (document.getElementById('aRef')?.value || '').trim();
        const agente = document.getElementById('aAgente')?.value || '';
        let banco = null;
        const bSel = document.getElementById('aBanco')?.value || '';
        if (bSel === 'Otros') {
          banco = (document.getElementById('aBancoOtros')?.value || '').trim();
        } else if (bSel) {
          banco = bSel;
        }
        const clienteId = window.abonoCliId || null;
        snapshot = { monto, metodo, ref, agente, banco, clienteId };
      }

      const reciboDiv = document.getElementById('reciboWAbtn');
      const wasReciboVisible = reciboDiv?.style.display === 'flex';
      const btnAbo = document.getElementById('btnAbo');
      const wasBtnVisible = btnAbo?.style.display !== 'none';

      // Ejecutar el regAbono original
      const result = await original.apply(this, arguments);

      // Detectar éxito: reciboWA visible o btnAbo oculto
      const ahoraReciboVisible = reciboDiv?.style.display === 'flex';
      const ahoraBtnOculto = btnAbo?.style.display === 'none';
      const exitoso = (!wasReciboVisible && ahoraReciboVisible) ||
                      (wasBtnVisible && ahoraBtnOculto);

      // Si fue exitoso Y directo → crear entrega_admin
      if (exitoso && esDirecto && snapshot && snapshot.agente && snapshot.monto > 0) {
        try {
          const cliente = (st().clientes || []).find(c => c.id === snapshot.clienteId);
          const nomCli = cliente?.nom || snapshot.clienteId;
          const usr = (typeof sesion !== 'undefined' ? sesion : window.sesion)?.usuario || 'admin';
          const api = getAPI();

          const payload = {
            agente_id: snapshot.agente,
            monto: snapshot.monto,
            metodo: snapshot.metodo,
            banco: snapshot.banco,
            referencia: snapshot.ref,
            nota: `Depósito directo de cliente ${nomCli}`,
            fecha: (typeof hoy === 'function' ? hoy() : new Date().toISOString().slice(0,10)),
            confirmado: false,
            depositado: true,
            depositado_at: new Date().toISOString(),
            depositado_banco: snapshot.banco,
            es_directo: true,
            cobro_id: snapshot.clienteId,
            created_by: usr
          };

          await api.post('entregas_admin', payload);

          if (typeof window.toast === 'function') {
            window.toast('ok', 'Pendiente de confirmar',
              'Verifica el depósito en tu cuenta y confírmalo en Solicitudes');
          }
          if (typeof window.logAudit === 'function') {
            window.logAudit('COBRO_DIRECTO_ADMIN',
              `${nomCli} depositó RD$ ${snapshot.monto.toLocaleString()} directo a cuenta admin · ${snapshot.banco || ''} · ${snapshot.ref}`,
              'Cobros');
          }
          if (typeof window.nxRefrescarSolicitudes === 'function') {
            await window.nxRefrescarSolicitudes();
          }
        } catch(e) {
          console.error('Error creando entrega_admin para depósito directo:', e);
          if (typeof window.toast === 'function') {
            window.toast('err', 'Aviso',
              'Cobro guardado, pero no se creó la entrega admin. Verifica que la tabla entregas_admin tenga las columnas es_directo y cobro_id.');
          }
        }
        // Reset checkbox
        if (chk) chk.checked = false;
      }

      return result;
    };

    return true;
  }

  function init() {
    let intentos = 0;
    const tryInit = function() {
      intentos++;
      const ok1 = inyectarCheckbox();
      const ok2 = envolverRegAbono();
      if (ok1 && ok2) return;
      if (intentos < 30) setTimeout(tryInit, 500);
    };
    tryInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
