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
          /* console.log('nav("clientes") → switchCliTab("proceso") ✓') */;
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
          /* console.log('nav("cobros") → historial ✓') */;
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
        /* console.log('nav("' + v + '") ✓') */;
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
    /* console.log('%c⚙ Parches NEXUS PRO Móvil cargado', 'color:#2563eb;font-weight:bold') */;
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
      
      /* console.log('%c✓ Parche registrado en Changelog', 'color:#10b981;font-weight:bold') */;
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

    // Helper: timeout para cualquier promesa
    function withTimeout(promise, ms, fallback) {
      return Promise.race([
        promise.catch(e => { console.warn('Carga falló:', e); return fallback; }),
        new Promise(resolve => setTimeout(() => {
          console.warn('Timeout después de ' + ms + 'ms');
          resolve(fallback);
        }, ms))
      ]);
    }

    let abonos = [], transferencias = [], entregas = [];
    try {
      const resultados = await Promise.all([
        withTimeout(cargarAbonos(), 15000, []),
        withTimeout(cargarTransferencias(), 15000, []),
        withTimeout(cargarEntregasAdmin(), 15000, [])
      ]);
      abonos = resultados[0] || [];
      transferencias = resultados[1] || [];
      entregas = resultados[2] || [];
    } catch(err) {
      console.error('Error al cargar Detalles de Cobro:', err);
      cont.innerHTML = `
        <div style="padding:30px;text-align:center;background:#fff;border:1px solid #fecaca;border-radius:14px;color:#dc2626">
          <div style="font-size:32px;margin-bottom:10px">⚠️</div>
          <div style="font-weight:800;font-size:16px;margin-bottom:6px">Error al cargar</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:14px">Hubo un problema cargando los datos. Verifica tu conexión.</div>
          <button class="btn bsm bc1" onclick="window.nxAbrirDetallesCobro && window.nxAbrirDetallesCobro()" style="cursor:pointer">
            <i class="ti ti-refresh"></i> Reintentar
          </button>
        </div>
      `;
      return;
    }

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
    if (!(await window.nxConfirm('¿Confirmar entrega?', 'Esto verifica que recibiste físicamente el dinero.', { ok: 'Sí, confirmar', tipo: 'info' }))) return;
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
    if (!(await window.nxConfirm('¿Anular esta entrega?', '• La entrega se borrará\n• El cobro del cliente NO se afecta (factura sigue pagada)\n• El "Dinero en Mano" del agente subirá por ese monto', { ok: 'Sí, anular', tipo: 'danger' }))) return;
    const api = getAPI();
    if (!api?.del) {
      if (typeof window.toast === 'function') window.toast('err', 'API no disponible', 'No se encontró API.del');
      return;
    }
    try {
      await api.del('entregas_admin', `id=eq.${id}`);
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
    
    // Listeners (touch + mouse) - capture:false para NO bloquear multi-touch
    document.addEventListener('mousedown', onPressStart, false);
    document.addEventListener('touchstart', onPressStart, false);
    document.addEventListener('mouseup', onPressEnd, false);
    document.addEventListener('touchend', onPressEnd, false);
    document.addEventListener('click', onClick, false);
    
    // Inicializar el KPI con el período actual al cargar
    setTimeout(actualizarKPI, 1500);
    
    // Refrescar cada 30 segundos (solo cuando página visible, evita leaks)
    if (window.__nxKPIInterval) clearInterval(window.__nxKPIInterval);
    window.__nxKPIInterval = setInterval(() => {
      if (!document.hidden) actualizarKPI();
    }, 30000);
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

    // Helper: timeout para cualquier promesa
    function withTimeout(promise, ms, fallback) {
      return Promise.race([
        promise.catch(e => { console.warn('Carga falló:', e); return fallback; }),
        new Promise(resolve => setTimeout(() => {
          console.warn('Timeout después de ' + ms + 'ms');
          resolve(fallback);
        }, ms))
      ]);
    }

    let entregas = [], transferencias = [];
    try {
      const resultados = await Promise.all([
        withTimeout(cargarEntregas(), 15000, []),
        withTimeout(cargarTransferencias(), 15000, [])
      ]);
      entregas = resultados[0] || [];
      transferencias = resultados[1] || [];
    } catch(err) {
      console.error('Error al cargar Solicitudes:', err);
      view.innerHTML = `
        <div style="padding:30px;text-align:center;background:#fff;border:1px solid #fecaca;border-radius:14px;color:#dc2626;margin:20px">
          <div style="font-size:32px;margin-bottom:10px">⚠️</div>
          <div style="font-weight:800;font-size:16px;margin-bottom:6px">Error al cargar</div>
          <div style="font-size:13px;color:#64748b;margin-bottom:14px">Hubo un problema cargando los datos. Verifica tu conexión.</div>
          <button class="btn bsm bc1" onclick="window.nxRefrescarSolicitudes && window.nxRefrescarSolicitudes()" style="cursor:pointer">
            <i class="ti ti-refresh"></i> Reintentar
          </button>
        </div>
      `;
      return;
    }
    
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

    try {
      view.innerHTML = `
        <div class="nxSL-wrap">
          ${renderHeaderSolicitudes(entregasView, transferenciasView)}
          ${renderSeccionEntregasPendientes(entregasView)}
          ${renderSeccionTransferencias(transferenciasView)}
          ${renderSeccionHistorial(entregasView, transferenciasView)}
          ${renderSeccionRecibirEntrega()}
        </div>
      `;
    } catch(err) {
      console.error('Error al renderizar Solicitudes:', err);
      view.innerHTML = `
        <div style="padding:30px;text-align:center;background:#fff;border:1px solid #fecaca;border-radius:14px;color:#dc2626;margin:20px">
          <div style="font-size:32px;margin-bottom:10px">⚠️</div>
          <div style="font-weight:800;font-size:16px;margin-bottom:6px">Error al mostrar</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:14px;font-family:monospace;text-align:left;background:#fef2f2;padding:8px;border-radius:6px;overflow-x:auto">${(err.message || err).toString().substring(0,300)}</div>
          <button class="btn bsm bc1" onclick="window.nxRefrescarSolicitudes && window.nxRefrescarSolicitudes()" style="cursor:pointer">
            <i class="ti ti-refresh"></i> Reintentar
          </button>
        </div>
      `;
      return;
    }

    // Refrescar badge en sidebar
    try { actualizarBadge(); } catch(e) {}
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
      const cliEntP = (st().clientes || []).find(c => String(c.id) === String(e.cobro_id || e.cliente_id || ''));
      let nomCliP = cliEntP?.nom || '';
      if (!nomCliP && e.nota) { const mm = /cliente\s+(.+)$/i.exec(e.nota); if (mm) nomCliP = mm[1].trim(); }
      nomCliP = nomCliP || '—';
      // Botones según rol: confirmar y anular SOLO admin
      const accionesPend = esAdmin() ? `
            <button class="nxSL-btn nxSL-btn-conf" onclick="window.nxConfirmarEntregaAdmin('${esc(e.id)}')" title="Confirmar"><i class="ti ti-check"></i> Confirmar</button>
            <button class="nxSL-btn nxSL-btn-anu" onclick="window.nxAnularEntregaAdmin('${esc(e.id)}')" title="Anular"><i class="ti ti-x"></i> Anular</button>
      ` : '<span class="nxSL-muted">Esperando confirmación del admin</span>';
      const baucheBtnP = e.comprobante_url ? `<button class="nxSL-btn" style="background:#10b981;color:#fff" onclick="window.nxVerComprobante&&window.nxVerComprobante('${esc(e.comprobante_url)}')" title="Ver bauche"><i class="ti ti-photo"></i> Bauche</button> ` : '';
      return `
        <tr>
          <td class="nxSL-tx-fecha">${fmtFecha(e.fecha)}</td>
          <td><strong>${esc(nomAg)}</strong></td>
          <td>${esc(nomCliP)}</td>
          <td class="nxSL-num">${F(e.monto)}</td>
          <td>${esc(e.metodo || '')}${e.banco ? `<br><span class="nxSL-muted">${esc(e.banco)}</span>` : ''}</td>
          <td class="nxSL-tx-ref">${esc(e.referencia || '—')}</td>
          <td>${directoBadge}</td>
          <td class="nxSL-actions">${baucheBtnP}${accionesPend}</td>
        </tr>
      `;
    }).join('');

    const depRows = confirmadasNoDep.map(e => {
      const ag = (st().agentes || []).find(a => String(a.id) === String(e.agente_id));
      const nomAg = ag?.nom || '—';
      const cliEntD = (st().clientes || []).find(c => String(c.id) === String(e.cobro_id || e.cliente_id || ''));
      let nomCliD = cliEntD?.nom || '';
      if (!nomCliD && e.nota) { const mm = /cliente\s+(.+)$/i.exec(e.nota); if (mm) nomCliD = mm[1].trim(); }
      nomCliD = nomCliD || '—';
      // Depositar: admin SIEMPRE, agente solo si es SU propia entrega
      const miId = getMiAgenteId();
      const puedeDepositar = esAdmin() || (miId && String(e.agente_id) === String(miId));
      const accionesDep = puedeDepositar ? `
            <button class="nxSL-btn nxSL-btn-dep" onclick="window.nxDepositarEntregaAdmin('${esc(e.id)}')" title="Marcar como depositado"><i class="ti ti-building-bank"></i> Depositar</button>
      ` : '<span class="nxSL-muted">—</span>';
      const baucheBtnD = e.comprobante_url ? `<button class="nxSL-btn" style="background:#10b981;color:#fff" onclick="window.nxVerComprobante&&window.nxVerComprobante('${esc(e.comprobante_url)}')" title="Ver bauche"><i class="ti ti-photo"></i> Bauche</button> ` : '';
      return `
        <tr>
          <td class="nxSL-tx-fecha">${fmtFecha(e.fecha)}</td>
          <td><strong>${esc(nomAg)}</strong></td>
          <td>${esc(nomCliD)}</td>
          <td class="nxSL-num">${F(e.monto)}</td>
          <td>${esc(e.metodo || '')}</td>
          <td class="nxSL-tx-ref">${esc(e.referencia || '—')}</td>
          <td class="nxSL-actions">${baucheBtnD}${accionesDep}</td>
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
                  <th>CLIENTE</th>
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
                <th>CLIENTE</th>
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
    if (!(await window.nxConfirm('¿Aceptar transferencia?', 'Se efectuará el movimiento de dinero.', { ok: 'Sí, aceptar', tipo: 'info' }))) return;
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
    if (!(await window.nxConfirm('¿Rechazar transferencia?', 'El dinero NO se moverá.', { ok: 'Sí, rechazar', tipo: 'danger' }))) return;
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
        // Refrescar badge cada 60 segundos (solo si visible, sin duplicados)
        if (window.__nxBadgeInterval) clearInterval(window.__nxBadgeInterval);
        window.__nxBadgeInterval = setInterval(() => {
          if (!document.hidden) actualizarBadge();
        }, 60000);
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
        const clienteId = (typeof abonoCliId !== 'undefined' ? abonoCliId : window.abonoCliId) || null;
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

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - ICONOS SEMÁNTICOS COLOR 3D VIBRANTE
   Asigna colores automáticamente según el tipo de icono Tabler.
   Solo visual. No cambia lógica.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_ICONOS_SEMANTICOS_V1__) return;
  window.__NEXUS_ICONOS_SEMANTICOS_V1__ = true;

  function injectCSS() {
    if (document.getElementById("nx-iconos-semanticos-css")) return;

    const style = document.createElement("style");
    style.id = "nx-iconos-semanticos-css";

    style.textContent = `
      /* ═══ PALETA SEMÁNTICA VIBRANTE 3D ═══
         Cada icono Tabler obtiene un color según su significado.
         Aplica fondo gradiente + sombra del color + glow sutil.
      */
      
      /* Helper: base 3D vibrante */
      i[class*="ti-"], .ti {
        transition: all 0.18s ease;
      }
      
      /* ═══ VERDE VIBRANTE - Dinero, Cobros, Ingresos, Positivo ═══ */
      .kpi i.ti-currency-dollar, .qa i.ti-currency-dollar, .sm i.ti-currency-dollar, .nc i.ti-currency-dollar,
      .kpi i.ti-cash, .qa i.ti-cash, .sm i.ti-cash, .nc i.ti-cash,
      .kpi i.ti-coin, .qa i.ti-coin, .sm i.ti-coin, .nc i.ti-coin,
      .kpi i.ti-receipt, .qa i.ti-receipt, .sm i.ti-receipt, .nc i.ti-receipt,
      .kpi i.ti-receipt-2, .qa i.ti-receipt-2, .sm i.ti-receipt-2, .nc i.ti-receipt-2,
      .kpi i.ti-wallet, .qa i.ti-wallet, .sm i.ti-wallet, .nc i.ti-wallet,
      .kpi i.ti-pig-money, .qa i.ti-pig-money, .sm i.ti-pig-money, .nc i.ti-pig-money,
      .kpi i.ti-moneybag, .qa i.ti-moneybag, .sm i.ti-moneybag, .nc i.ti-moneybag {
        background: linear-gradient(145deg, #d1fae5, #6ee7b7) !important;
        color: #047857 !important;
        box-shadow:
          0 10px 24px rgba(16,185,129,.30),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(5,150,105,.18) !important;
      }
      
      /* ═══ AZUL VIBRANTE - Info, Reportes, Datos, Gráficos ═══ */
      .kpi i.ti-chart-bar, .qa i.ti-chart-bar, .sm i.ti-chart-bar, .nc i.ti-chart-bar,
      .kpi i.ti-chart-line, .qa i.ti-chart-line, .sm i.ti-chart-line, .nc i.ti-chart-line,
      .kpi i.ti-chart-pie, .qa i.ti-chart-pie, .sm i.ti-chart-pie, .nc i.ti-chart-pie,
      .kpi i.ti-chart-donut, .qa i.ti-chart-donut, .sm i.ti-chart-donut, .nc i.ti-chart-donut,
      .kpi i.ti-chart-area, .qa i.ti-chart-area, .sm i.ti-chart-area, .nc i.ti-chart-area,
      .kpi i.ti-report, .qa i.ti-report, .sm i.ti-report, .nc i.ti-report,
      .kpi i.ti-report-analytics, .qa i.ti-report-analytics, .sm i.ti-report-analytics, .nc i.ti-report-analytics,
      .kpi i.ti-info-circle, .qa i.ti-info-circle, .sm i.ti-info-circle, .nc i.ti-info-circle,
      .kpi i.ti-eye, .qa i.ti-eye, .sm i.ti-eye, .nc i.ti-eye,
      .kpi i.ti-presentation-analytics, .qa i.ti-presentation-analytics {
        background: linear-gradient(145deg, #dbeafe, #93c5fd) !important;
        color: #1e40af !important;
        box-shadow:
          0 10px 24px rgba(59,130,246,.30),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(37,99,235,.20) !important;
      }
      
      /* ═══ MORADO VIBRANTE - Personas, Agentes, Clientes, Equipo ═══ */
      .kpi i.ti-user, .qa i.ti-user, .sm i.ti-user, .nc i.ti-user,
      .kpi i.ti-users, .qa i.ti-users, .sm i.ti-users, .nc i.ti-users,
      .kpi i.ti-user-circle, .qa i.ti-user-circle, .sm i.ti-user-circle, .nc i.ti-user-circle,
      .kpi i.ti-user-plus, .qa i.ti-user-plus, .sm i.ti-user-plus, .nc i.ti-user-plus,
      .kpi i.ti-users-group, .qa i.ti-users-group, .sm i.ti-users-group, .nc i.ti-users-group,
      .kpi i.ti-id-badge, .qa i.ti-id-badge, .sm i.ti-id-badge, .nc i.ti-id-badge,
      .kpi i.ti-address-book, .qa i.ti-address-book, .sm i.ti-address-book, .nc i.ti-address-book {
        background: linear-gradient(145deg, #ede9fe, #c4b5fd) !important;
        color: #6d28d9 !important;
        box-shadow:
          0 10px 24px rgba(124,58,237,.30),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(109,40,217,.20) !important;
      }
      
      /* ═══ AZUL OSCURO - Bancos, Edificios, Cuentas ═══ */
      .kpi i.ti-building-bank, .qa i.ti-building-bank, .sm i.ti-building-bank, .nc i.ti-building-bank,
      .kpi i.ti-building, .qa i.ti-building, .sm i.ti-building, .nc i.ti-building,
      .kpi i.ti-credit-card, .qa i.ti-credit-card, .sm i.ti-credit-card, .nc i.ti-credit-card,
      .kpi i.ti-cash-banknote, .qa i.ti-cash-banknote, .sm i.ti-cash-banknote, .nc i.ti-cash-banknote {
        background: linear-gradient(145deg, #c7d2fe, #6366f1) !important;
        color: #ffffff !important;
        box-shadow:
          0 10px 24px rgba(79,70,229,.40),
          0 4px 10px rgba(15,23,42,.10),
          inset 0 1px 0 rgba(255,255,255,.40),
          inset 0 -2px 6px rgba(67,56,202,.30) !important;
      }
      
      /* ═══ NARANJA VIBRANTE - Pendiente, Atención, Trofeos ═══ */
      .kpi i.ti-trophy, .qa i.ti-trophy, .sm i.ti-trophy, .nc i.ti-trophy,
      .kpi i.ti-clock, .qa i.ti-clock, .sm i.ti-clock, .nc i.ti-clock,
      .kpi i.ti-clock-hour-4, .qa i.ti-clock-hour-4, .sm i.ti-clock-hour-4, .nc i.ti-clock-hour-4,
      .kpi i.ti-alert-circle, .qa i.ti-alert-circle, .sm i.ti-alert-circle, .nc i.ti-alert-circle,
      .kpi i.ti-alert-triangle, .qa i.ti-alert-triangle, .sm i.ti-alert-triangle, .nc i.ti-alert-triangle,
      .kpi i.ti-flame, .qa i.ti-flame, .sm i.ti-flame, .nc i.ti-flame,
      .kpi i.ti-bell, .qa i.ti-bell, .sm i.ti-bell, .nc i.ti-bell,
      .kpi i.ti-hourglass, .qa i.ti-hourglass, .sm i.ti-hourglass, .nc i.ti-hourglass {
        background: linear-gradient(145deg, #fed7aa, #fb923c) !important;
        color: #9a3412 !important;
        box-shadow:
          0 10px 24px rgba(249,115,22,.32),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(234,88,12,.22) !important;
      }
      
      /* ═══ ROJO VIBRANTE - Eliminar, Anular, Rechazar, Negativo ═══ */
      .kpi i.ti-trash, .qa i.ti-trash, .sm i.ti-trash, .nc i.ti-trash,
      .kpi i.ti-x, .qa i.ti-x, .sm i.ti-x, .nc i.ti-x,
      .kpi i.ti-circle-x, .qa i.ti-circle-x, .sm i.ti-circle-x, .nc i.ti-circle-x,
      .kpi i.ti-ban, .qa i.ti-ban, .sm i.ti-ban, .nc i.ti-ban,
      .kpi i.ti-power, .qa i.ti-power, .sm i.ti-power, .nc i.ti-power,
      .kpi i.ti-logout, .qa i.ti-logout, .sm i.ti-logout, .nc i.ti-logout,
      .kpi i.ti-flag, .qa i.ti-flag, .sm i.ti-flag, .nc i.ti-flag {
        background: linear-gradient(145deg, #fecaca, #f87171) !important;
        color: #991b1b !important;
        box-shadow:
          0 10px 24px rgba(239,68,68,.32),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(220,38,38,.22) !important;
      }
      
      /* ═══ VERDE FLUORESCENTE - Confirmado, Check, OK ═══ */
      .kpi i.ti-check, .qa i.ti-check, .sm i.ti-check, .nc i.ti-check,
      .kpi i.ti-circle-check, .qa i.ti-circle-check, .sm i.ti-circle-check, .nc i.ti-circle-check,
      .kpi i.ti-shield-check, .qa i.ti-shield-check, .sm i.ti-shield-check, .nc i.ti-shield-check,
      .kpi i.ti-thumb-up, .qa i.ti-thumb-up, .sm i.ti-thumb-up, .nc i.ti-thumb-up {
        background: linear-gradient(145deg, #bbf7d0, #4ade80) !important;
        color: #14532d !important;
        box-shadow:
          0 10px 24px rgba(34,197,94,.35),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(22,163,74,.25) !important;
      }
      
      /* ═══ CYAN VIBRANTE - Mensajes, Notificaciones, Solicitudes ═══ */
      .kpi i.ti-inbox, .qa i.ti-inbox, .sm i.ti-inbox, .nc i.ti-inbox,
      .kpi i.ti-mail, .qa i.ti-mail, .sm i.ti-mail, .nc i.ti-mail,
      .kpi i.ti-message, .qa i.ti-message, .sm i.ti-message, .nc i.ti-message,
      .kpi i.ti-message-circle, .qa i.ti-message-circle, .sm i.ti-message-circle, .nc i.ti-message-circle,
      .kpi i.ti-bell-ringing, .qa i.ti-bell-ringing, .sm i.ti-bell-ringing, .nc i.ti-bell-ringing,
      .kpi i.ti-brand-whatsapp, .qa i.ti-brand-whatsapp, .sm i.ti-brand-whatsapp, .nc i.ti-brand-whatsapp,
      .kpi i.ti-send, .qa i.ti-send, .sm i.ti-send, .nc i.ti-send {
        background: linear-gradient(145deg, #cffafe, #67e8f9) !important;
        color: #155e75 !important;
        box-shadow:
          0 10px 24px rgba(6,182,212,.32),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(8,145,178,.22) !important;
      }
      
      /* ═══ ROSA VIBRANTE - Pólizas, Documentos, Archivos ═══ */
      .kpi i.ti-file, .qa i.ti-file, .sm i.ti-file, .nc i.ti-file,
      .kpi i.ti-file-text, .qa i.ti-file-text, .sm i.ti-file-text, .nc i.ti-file-text,
      .kpi i.ti-file-plus, .qa i.ti-file-plus, .sm i.ti-file-plus, .nc i.ti-file-plus,
      .kpi i.ti-file-invoice, .qa i.ti-file-invoice, .sm i.ti-file-invoice, .nc i.ti-file-invoice,
      .kpi i.ti-clipboard, .qa i.ti-clipboard, .sm i.ti-clipboard, .nc i.ti-clipboard,
      .kpi i.ti-clipboard-text, .qa i.ti-clipboard-text, .sm i.ti-clipboard-text, .nc i.ti-clipboard-text,
      .kpi i.ti-shield, .qa i.ti-shield, .sm i.ti-shield, .nc i.ti-shield,
      .kpi i.ti-certificate, .qa i.ti-certificate, .sm i.ti-certificate, .nc i.ti-certificate {
        background: linear-gradient(145deg, #fce7f3, #f9a8d4) !important;
        color: #9d174d !important;
        box-shadow:
          0 10px 24px rgba(236,72,153,.30),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(219,39,119,.22) !important;
      }
      
      /* ═══ AMARILLO VIBRANTE - Estrellas, Premium, Destacados ═══ */
      .kpi i.ti-star, .qa i.ti-star, .sm i.ti-star, .nc i.ti-star,
      .kpi i.ti-crown, .qa i.ti-crown, .sm i.ti-crown, .nc i.ti-crown,
      .kpi i.ti-medal, .qa i.ti-medal, .sm i.ti-medal, .nc i.ti-medal,
      .kpi i.ti-diamond, .qa i.ti-diamond, .sm i.ti-diamond, .nc i.ti-diamond,
      .kpi i.ti-bolt, .qa i.ti-bolt, .sm i.ti-bolt, .nc i.ti-bolt {
        background: linear-gradient(145deg, #fef3c7, #fbbf24) !important;
        color: #78350f !important;
        box-shadow:
          0 10px 24px rgba(245,158,11,.32),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(217,119,6,.25) !important;
      }
      
      /* ═══ TEAL - Transferencias, Movimientos, Cambios ═══ */
      .kpi i.ti-transfer, .qa i.ti-transfer, .sm i.ti-transfer, .nc i.ti-transfer,
      .kpi i.ti-arrows-exchange, .qa i.ti-arrows-exchange, .sm i.ti-arrows-exchange, .nc i.ti-arrows-exchange,
      .kpi i.ti-arrow-right, .qa i.ti-arrow-right, .sm i.ti-arrow-right, .nc i.ti-arrow-right,
      .kpi i.ti-refresh, .qa i.ti-refresh, .sm i.ti-refresh, .nc i.ti-refresh,
      .kpi i.ti-arrows-up-down, .qa i.ti-arrows-up-down, .sm i.ti-arrows-up-down, .nc i.ti-arrows-up-down {
        background: linear-gradient(145deg, #ccfbf1, #5eead4) !important;
        color: #115e59 !important;
        box-shadow:
          0 10px 24px rgba(20,184,166,.30),
          0 4px 10px rgba(15,23,42,.08),
          inset 0 1px 0 rgba(255,255,255,.95),
          inset 0 -2px 6px rgba(13,148,136,.20) !important;
      }
      
      /* ═══ GRIS OSCURO - Configuración, Sistema, Engranaje ═══ */
      .kpi i.ti-settings, .qa i.ti-settings, .sm i.ti-settings, .nc i.ti-settings,
      .kpi i.ti-adjustments, .qa i.ti-adjustments, .sm i.ti-adjustments, .nc i.ti-adjustments,
      .kpi i.ti-tool, .qa i.ti-tool, .sm i.ti-tool, .nc i.ti-tool,
      .kpi i.ti-tools, .qa i.ti-tools, .sm i.ti-tools, .nc i.ti-tools,
      .kpi i.ti-database, .qa i.ti-database, .sm i.ti-database, .nc i.ti-database {
        background: linear-gradient(145deg, #cbd5e1, #64748b) !important;
        color: #ffffff !important;
        box-shadow:
          0 10px 24px rgba(71,85,105,.32),
          0 4px 10px rgba(15,23,42,.10),
          inset 0 1px 0 rgba(255,255,255,.40),
          inset 0 -2px 6px rgba(51,65,85,.30) !important;
      }
      
      /* ═══ HOVER 3D LIFT (todos los iconos coloreados) ═══ */
      .kpi:hover i[class*="ti-"],
      .qa:hover i[class*="ti-"],
      .sm:hover i[class*="ti-"],
      .nc:hover i[class*="ti-"] {
        transform: translateY(-3px) scale(1.06) !important;
        filter: brightness(1.05);
      }
      
      /* ═══ MÓVIL: mantener color pero reducir profundidad de sombra ═══ */
      @media (max-width: 768px) {
        .kpi i[class*="ti-"],
        .qa i[class*="ti-"],
        .sm i[class*="ti-"],
        .nc i[class*="ti-"] {
          box-shadow:
            0 6px 14px rgba(15,23,42,.18),
            0 2px 5px rgba(15,23,42,.06),
            inset 0 1px 0 rgba(255,255,255,.85) !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BOTÓN "CONSULTAR COBERTURA"
   Abre plataforma externa de ARS en pestaña nueva.
   URL configurable desde Configuración.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_CONSULTAR_COBERTURA_V1__) return;
  window.__NEXUS_CONSULTAR_COBERTURA_V1__ = true;

  const URL_DEFAULT = 'http://186.148.94.28:96/FrmNoLoginExpired.aspx?p=FrmRegistro_Afiliados.aspx';
  const STORAGE_KEY = 'nx_url_cobertura';

  function getUrl() {
    try {
      return localStorage.getItem(STORAGE_KEY) || URL_DEFAULT;
    } catch(e) { return URL_DEFAULT; }
  }

  function setUrl(url) {
    try { localStorage.setItem(STORAGE_KEY, url); } catch(e) {}
  }

  // ═══ ABRIR PLATAFORMA EN NUEVA PESTAÑA ═══
  window.nxAbrirConsultarCobertura = function() {
    const url = getUrl();
    if (!url || !url.trim()) {
      if (typeof window.toast === 'function') {
        window.toast('err', 'URL no configurada', 'Ve a Configuración para agregar la URL de la plataforma');
      } else {
        alert('No hay URL configurada. Ve a Configuración.');
      }
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ═══ MODAL PARA CONFIGURAR URL ═══
  window.nxAbrirConfigCobertura = function() {
    let modal = document.getElementById('nxModalConfigCobertura');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay';
      modal.id = 'nxModalConfigCobertura';
      modal.innerHTML = `
        <div class="modal" style="max-width:520px">
          <div class="mt">
            <span>// URL DE CONSULTAR COBERTURA</span>
            <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalConfigCobertura').classList.remove('open')"><i class="ti ti-x"></i></button>
          </div>
          <div style="padding:8px 0">
            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px">URL de la plataforma</label>
            <input type="text" id="nxConfigCoberturaURL" placeholder="http://..." style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;font-family:monospace">
            <div style="font-size:11px;color:#64748b;margin-top:6px">
              <i class="ti ti-info-circle" style="color:#3b82f6"></i>
              Esta URL se abrirá en una nueva pestaña al tocar "Consultar Cobertura".
            </div>
            <div style="margin-top:14px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:11px;color:#1e3a6e">
              <strong>Plataforma actual:</strong><br>
              <span id="nxConfigCoberturaActual" style="font-family:monospace;word-break:break-all;color:#2563eb"></span>
            </div>
          </div>
          <div class="fe" style="margin-top:14px">
            <button class="btn" type="button" onclick="document.getElementById('nxModalConfigCobertura').classList.remove('open')">Cancelar</button>
            <button class="btn bxl bc1" type="button" onclick="window.nxGuardarConfigCobertura()"><i class="ti ti-check"></i> Guardar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    // Mostrar URL actual
    document.getElementById('nxConfigCoberturaURL').value = getUrl();
    document.getElementById('nxConfigCoberturaActual').textContent = getUrl();
    modal.classList.add('open');
  };

  window.nxGuardarConfigCobertura = function() {
    const url = document.getElementById('nxConfigCoberturaURL')?.value?.trim();
    if (!url) {
      if (typeof window.toast === 'function') window.toast('err', 'URL vacía', 'Escribe la URL');
      return;
    }
    setUrl(url);
    document.getElementById('nxModalConfigCobertura').classList.remove('open');
    if (typeof window.toast === 'function') window.toast('ok', 'URL guardada', 'Plataforma actualizada');
  };

  // ═══ AGREGAR BOTÓN AL DASHBOARD ═══
  function inyectarBoton() {
    if (document.getElementById('qaConsultarCobertura')) return true;
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    const qaExistente = vDash.querySelector('.qa');
    if (!qaExistente) return false;
    const qaGrid = qaExistente.parentElement;
    if (!qaGrid) return false;

    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaConsultarCobertura';
    btn.setAttribute('onclick', "window.nxAbrirConsultarCobertura && window.nxAbrirConsultarCobertura()");
    btn.innerHTML = `
      <span class="qa-i"><i class="ti ti-shield-check"></i></span>
      <div class="qa-l">Consultar Cobertura</div>
    `;
    
    // Insertar como segundo (después del primer qa)
    qaGrid.insertBefore(btn, qaExistente.nextSibling);
    return true;
  }

  // ═══ AGREGAR ITEM AL SIDEBAR (configurar URL) ═══
  // Por ahora solo se accede el modal config con: window.nxAbrirConfigCobertura()
  // Más adelante se podría agregar al menú Configuración nativo

  // ═══ INIT ═══
  function init() {
    let intentos = 0;
    const tryInit = function() {
      intentos++;
      if (inyectarBoton()) return;
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
   NEXUS PRO - NOTIFICACIONES DEL NAVEGADOR
   Muestra notificaciones tipo app cuando ocurren eventos clave.
   Funciona si el navegador está abierto (cualquier pestaña).
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_NOTIFICACIONES_V1__) return;
  window.__NEXUS_NOTIFICACIONES_V1__ = true;

  const STORAGE_KEY = 'nx_notif_permiso';
  const STORAGE_TIPOS = 'nx_notif_tipos';
  const STORAGE_ULTIMO_CHECK = 'nx_notif_ultimo_check';

  // ═══ HELPERS ═══
  function permisoActual() {
    if (!('Notification' in window)) return 'no-soportado';
    return Notification.permission; // 'default', 'granted', 'denied'
  }

  function obtenerTiposActivos() {
    try {
      const v = localStorage.getItem(STORAGE_TIPOS);
      if (!v) return { factura: true, pago: true, error: true, reporte: false };
      return JSON.parse(v);
    } catch(e) { return { factura: true, pago: true, error: true, reporte: false }; }
  }

  function guardarTipos(tipos) {
    try { localStorage.setItem(STORAGE_TIPOS, JSON.stringify(tipos)); } catch(e) {}
  }

  // ═══ MOSTRAR NOTIFICACIÓN ═══
  function mostrarNotificacion(titulo, mensaje, opts = {}) {
    if (permisoActual() !== 'granted') return false;
    try {
      const notif = new Notification(titulo, {
        body: mensaje,
        icon: opts.icon || 'https://api.iconify.design/ph/shield-check-fill.svg?color=%23059669',
        badge: opts.badge,
        tag: opts.tag || 'nexus-pro',
        requireInteraction: opts.requireInteraction || false,
        silent: opts.silent || false
      });
      
      // Auto-cerrar después de 8 segundos (si no requiere interacción)
      if (!opts.requireInteraction) {
        setTimeout(() => { try { notif.close(); } catch(e) {} }, 8000);
      }
      
      // Click en la notificación: enfocar la ventana
      notif.onclick = function() {
        window.focus();
        notif.close();
      };
      
      return true;
    } catch(e) {
      console.error('Error mostrando notificación:', e);
      return false;
    }
  }

  // ═══ SOLICITAR PERMISO ═══
  async function solicitarPermiso() {
    if (!('Notification' in window)) {
      if (typeof window.toast === 'function') window.toast('err', 'No soportado', 'Tu navegador no soporta notificaciones');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      if (typeof window.toast === 'function') window.toast('ok', 'Ya activadas', 'Ya tienes permiso de notificaciones');
      return true;
    }
    
    if (Notification.permission === 'denied') {
      if (typeof window.toast === 'function') {
        window.toast('err', 'Permiso denegado', 'Debes activarlas manualmente desde configuración del navegador');
      }
      return false;
    }
    
    try {
      const resultado = await Notification.requestPermission();
      if (resultado === 'granted') {
        // Mostrar notificación de bienvenida
        mostrarNotificacion('🎉 Notificaciones activadas', 'NEXUS PRO te avisará de eventos importantes', {
          tag: 'welcome'
        });
        if (typeof window.toast === 'function') window.toast('ok', 'Activadas', 'Ya recibirás notificaciones');
        return true;
      } else {
        if (typeof window.toast === 'function') window.toast('warn', 'No activadas', 'Puedes activarlas después desde configuración');
        return false;
      }
    } catch(e) {
      console.error('Error solicitando permiso:', e);
      return false;
    }
  }

  // ═══ API PÚBLICA ═══
  window.nxNotificar = function(tipo, titulo, mensaje, opts = {}) {
    const tipos = obtenerTiposActivos();
    if (tipos[tipo] === false) return false; // tipo desactivado
    return mostrarNotificacion(titulo, mensaje, opts);
  };
  
  window.nxNotificarFactura = function(cliente, monto) {
    return window.nxNotificar('factura', '📄 Factura generada', `${cliente}: RD$ ${monto}`);
  };
  
  window.nxNotificarPago = function(cliente, monto) {
    return window.nxNotificar('pago', '💰 Pago recibido', `${cliente}: RD$ ${monto}`);
  };
  
  window.nxNotificarError = function(titulo, detalle) {
    return window.nxNotificar('error', `⚠️ ${titulo}`, detalle, { requireInteraction: true });
  };

  window.nxSolicitarPermisoNotificaciones = solicitarPermiso;

  // ═══ MODAL DE CONFIGURACIÓN ═══
  window.nxAbrirConfigNotificaciones = function() {
    let modal = document.getElementById('nxModalNotif');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay';
      modal.id = 'nxModalNotif';
      modal.innerHTML = `
        <div class="modal" style="max-width:480px">
          <div class="mt">
            <span><i class="ti ti-bell"></i> NOTIFICACIONES</span>
            <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalNotif').classList.remove('open')"><i class="ti ti-x"></i></button>
          </div>
          <div style="padding:8px 0">
            <div id="nxNotifEstado" style="padding:12px;border-radius:10px;margin-bottom:14px;font-weight:700;text-align:center"></div>
            
            <div style="font-size:12px;color:#475569;font-weight:700;margin-bottom:10px;letter-spacing:0.5px">QUÉ NOTIFICACIONES QUIERES RECIBIR</div>
            
            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer">
              <input type="checkbox" id="nxNotifTipoFactura" style="width:20px;height:20px;cursor:pointer">
              <div>
                <div style="font-weight:700;color:#0f172a">📄 Facturas generadas</div>
                <div style="font-size:11px;color:#64748b">Cuando se crea una factura nueva</div>
              </div>
            </label>
            
            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer">
              <input type="checkbox" id="nxNotifTipoPago" style="width:20px;height:20px;cursor:pointer">
              <div>
                <div style="font-weight:700;color:#0f172a">💰 Pagos recibidos</div>
                <div style="font-size:11px;color:#64748b">Cuando se registra un cobro</div>
              </div>
            </label>
            
            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer">
              <input type="checkbox" id="nxNotifTipoError" style="width:20px;height:20px;cursor:pointer">
              <div>
                <div style="font-weight:700;color:#0f172a">⚠️ Errores del sistema</div>
                <div style="font-size:11px;color:#64748b">Avisos importantes que requieren atención</div>
              </div>
            </label>
            
            <div style="margin-top:14px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;font-size:11px;color:#1e3a6e">
              <i class="ti ti-info-circle" style="color:#3b82f6"></i>
              <strong>Importante:</strong> Las notificaciones solo funcionan si tienes el navegador abierto. Si quieres recibir avisos con el navegador cerrado, usa el email automático o WhatsApp.
            </div>
          </div>
          <div class="fe" style="margin-top:14px;gap:8px">
            <button class="btn" type="button" onclick="window.nxProbarNotificacion()"><i class="ti ti-bell-ringing"></i> Probar</button>
            <button class="btn bxl bc1" type="button" onclick="window.nxGuardarConfigNotif()"><i class="ti ti-check"></i> Guardar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    // Actualizar estado del permiso
    const perm = permisoActual();
    const estadoDiv = document.getElementById('nxNotifEstado');
    if (perm === 'granted') {
      estadoDiv.innerHTML = '✅ <span style="color:#047857">Notificaciones activadas</span>';
      estadoDiv.style.background = '#d1fae5';
    } else if (perm === 'denied') {
      estadoDiv.innerHTML = '❌ <span style="color:#991b1b">Bloqueadas. Activa desde configuración del navegador</span>';
      estadoDiv.style.background = '#fecaca';
    } else if (perm === 'no-soportado') {
      estadoDiv.innerHTML = '⚠️ <span style="color:#92400e">Tu navegador no soporta notificaciones</span>';
      estadoDiv.style.background = '#fed7aa';
    } else {
      estadoDiv.innerHTML = `
        <div style="margin-bottom:8px">🔔 No activadas todavía</div>
        <button class="btn bsm bc1" type="button" onclick="window.nxSolicitarPermisoNotificaciones().then(() => window.nxAbrirConfigNotificaciones())"><i class="ti ti-bell"></i> Activar ahora</button>
      `;
      estadoDiv.style.background = '#fef3c7';
    }
    
    // Cargar tipos activos
    const tipos = obtenerTiposActivos();
    document.getElementById('nxNotifTipoFactura').checked = tipos.factura !== false;
    document.getElementById('nxNotifTipoPago').checked = tipos.pago !== false;
    document.getElementById('nxNotifTipoError').checked = tipos.error !== false;
    
    modal.classList.add('open');
  };

  window.nxGuardarConfigNotif = function() {
    const tipos = {
      factura: document.getElementById('nxNotifTipoFactura').checked,
      pago: document.getElementById('nxNotifTipoPago').checked,
      error: document.getElementById('nxNotifTipoError').checked
    };
    guardarTipos(tipos);
    document.getElementById('nxModalNotif').classList.remove('open');
    if (typeof window.toast === 'function') window.toast('ok', 'Guardado', 'Configuración actualizada');
  };

  window.nxProbarNotificacion = function() {
    if (permisoActual() !== 'granted') {
      window.nxSolicitarPermisoNotificaciones();
      return;
    }
    mostrarNotificacion('🔔 Notificación de prueba', 'NEXUS PRO está listo para avisarte', {
      tag: 'test'
    });
  };

  // ═══ HOOK AUTOMÁTICO: Detectar eventos del sistema ═══
  // Cuando se registra un cobro/pago en el sistema, intentar detectarlo
  // por cambios en la BD a través de polling cada 60 segundos.
  // (Esto es opcional; lo dejo desactivado por defecto para no gastar API calls)
  
  // ═══ INYECTAR EN EL TAB "NOTIFICACIONES" DE CONFIGURACIÓN ═══
  function inyectarEnTabConfig() {
    // Buscar el contenido del tab cfgTab2 (Notificaciones)
    // Está en algún div que se muestra cuando se aprieta cfgTab2
    if (document.getElementById('nxNotifBrowserPanel')) return true;
    
    // Buscar el botón del tab
    const tabBtn = document.getElementById('cfgTab2');
    if (!tabBtn) return false;
    
    // Buscar el panel del tab (suele estar con id similar o tener clase 'cfg-content')
    // Probamos varios selectores comunes
    let panel = document.getElementById('cfgContent2') || 
                document.getElementById('cfgPanel2') ||
                document.getElementById('cfg-content-2') ||
                document.querySelector('[data-cfg-content="2"]');
    
    // Si no encontramos panel específico, buscamos contenedor general de configuración
    if (!panel) {
      const vCfg = document.getElementById('v-configuracion') || document.getElementById('v-config');
      if (!vCfg) return false;
      panel = vCfg;
    }
    
    // Crear nuestro panel de notificaciones de navegador
    const div = document.createElement('div');
    div.id = 'nxNotifBrowserPanel';
    div.style.cssText = 'margin-top:18px;padding:16px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06)';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
        <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#3b82f6,#1e40af);display:grid;place-items:center;color:#fff">
          <i class="ti ti-bell" style="font-size:18px"></i>
        </div>
        <div>
          <div style="font-weight:800;color:#0f172a;font-size:14px">Notificaciones del navegador</div>
          <div style="font-size:11px;color:#64748b">Avisos tipo app cuando ocurren eventos importantes</div>
        </div>
      </div>
      <div id="nxNotifEstadoInline" style="padding:10px;border-radius:10px;margin-bottom:12px;font-weight:600;font-size:12px;text-align:center"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn bc1" type="button" onclick="window.nxAbrirConfigNotificaciones && window.nxAbrirConfigNotificaciones()" style="flex:1;min-width:140px">
          <i class="ti ti-settings"></i> Configurar
        </button>
        <button class="btn" type="button" onclick="window.nxProbarNotificacion && window.nxProbarNotificacion()" style="flex:1;min-width:140px">
          <i class="ti ti-bell-ringing"></i> Probar
        </button>
      </div>
      <div style="margin-top:10px;padding:8px 10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:10px;color:#1e3a6e">
        <i class="ti ti-info-circle"></i> Solo funcionan con el navegador abierto. Para 24/7 usa el email automático.
      </div>
    `;
    
    panel.appendChild(div);
    
    // Actualizar estado inline
    actualizarEstadoInline();
    return true;
  }
  
  function actualizarEstadoInline() {
    const estadoDiv = document.getElementById('nxNotifEstadoInline');
    if (!estadoDiv) return;
    const perm = permisoActual();
    if (perm === 'granted') {
      estadoDiv.innerHTML = '✅ Notificaciones activadas';
      estadoDiv.style.background = '#d1fae5';
      estadoDiv.style.color = '#047857';
    } else if (perm === 'denied') {
      estadoDiv.innerHTML = '❌ Bloqueadas (activar desde navegador)';
      estadoDiv.style.background = '#fecaca';
      estadoDiv.style.color = '#991b1b';
    } else if (perm === 'no-soportado') {
      estadoDiv.innerHTML = '⚠️ Navegador no compatible';
      estadoDiv.style.background = '#fed7aa';
      estadoDiv.style.color = '#92400e';
    } else {
      estadoDiv.innerHTML = '🔔 No activadas — Toca "Configurar" para activar';
      estadoDiv.style.background = '#fef3c7';
      estadoDiv.style.color = '#92400e';
    }
  }
  
  // ═══ CLICK EN "NEXUS PRO" DEL SIDEBAR → DASHBOARD ═══
  function hacerClickeableNexusBrand() {
    // Selectores que probamos
    const sbTop = document.querySelector('.sb-top');
    if (!sbTop) return false;
    if (sbTop.dataset.nxClickable === '1') return true;
    
    sbTop.dataset.nxClickable = '1';
    sbTop.style.cursor = 'pointer';
    sbTop.title = 'Ir al Dashboard';
    
    sbTop.addEventListener('click', function(e) {
      // Evitar conflicto con botones internos
      if (e.target.closest('button') || e.target.closest('input')) return;
      e.preventDefault();
      e.stopPropagation();
      
      // Navegar al dashboard
      if (typeof window.nav === 'function') {
        const dashItem = document.querySelector('.ni[onclick*="dashboard"]');
        window.nav('dashboard', dashItem || null);
      }
    });
    return true;
  }

  // ═══ INIT ═══
  function init() {
    let intentos = 0;
    let listoConfig = false;
    let listoBrand = false;
    const tryInit = function() {
      intentos++;
      if (!listoBrand) listoBrand = hacerClickeableNexusBrand();
      if (!listoConfig) listoConfig = inyectarEnTabConfig();
      if (listoBrand && listoConfig) return;
      if (intentos < 80) setTimeout(tryInit, 150);
    };
    tryInit();
    
    // Re-check estado cuando se vuelve visible la pestaña
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) actualizarEstadoInline();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BOTONES GLASSMORPHISM SUTIL
   Efecto cristal/vidrio en todos los .btn conservando colores.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_BTN_GLASS_V1__) return;
  window.__NEXUS_BTN_GLASS_V1__ = true;

  function injectCSS() {
    if (document.getElementById("nx-btn-glass-css")) return;

    const style = document.createElement("style");
    style.id = "nx-btn-glass-css";
    style.textContent = `
      /* ═══ GLASSMORPHISM BASE PARA TODOS LOS .btn ═══ */
      .btn {
        position: relative;
        backdrop-filter: blur(10px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(10px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.18) !important;
        box-shadow:
          0 4px 14px rgba(15, 23, 42, 0.10),
          0 1px 3px rgba(15, 23, 42, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.45),
          inset 0 -1px 0 rgba(0, 0, 0, 0.06) !important;
        transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1) !important;
        overflow: hidden;
      }
      
      /* Highlight superior tipo vidrio */
      .btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(180deg, rgba(255,255,255,0.22), transparent);
        pointer-events: none;
        border-radius: inherit;
        z-index: 1;
      }
      
      /* Contenido siempre encima del highlight */
      .btn > * {
        position: relative;
        z-index: 2;
      }
      
      /* ═══ HOVER LIFT (PC) ═══ */
      .btn:hover {
        transform: translateY(-2px);
        box-shadow:
          0 8px 22px rgba(15, 23, 42, 0.14),
          0 2px 6px rgba(15, 23, 42, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.55),
          inset 0 -1px 0 rgba(0, 0, 0, 0.08) !important;
          filter: brightness(1.04);
      }
      
      /* ═══ ACTIVE (cuando lo aprietas) ═══ */
      .btn:active {
        transform: translateY(0px) scale(0.97);
        transition: all 0.08s ease !important;
        box-shadow:
          0 2px 8px rgba(15, 23, 42, 0.10),
          inset 0 2px 4px rgba(0, 0, 0, 0.10) !important;
      }
      
      /* ═══ BOTONES CON COLOR (bc1, bc2, bc3, bc4, bc5) ═══ */
      /* Mantienen su color pero con efecto cristal arriba */
      .btn.bc1, .btn.bc2, .btn.bc3, .btn.bc4, .btn.bc5 {
        position: relative;
      }
      
      .btn.bc1::before, .btn.bc2::before, .btn.bc3::before,
      .btn.bc4::before, .btn.bc5::before {
        background: linear-gradient(180deg, rgba(255,255,255,0.30), transparent);
      }
      
      /* ═══ BOTÓN GHOST (transparente) ═══ */
      .btn.bghost {
        background: rgba(255, 255, 255, 0.55) !important;
        border: 1px solid rgba(255, 255, 255, 0.28) !important;
      }
      
      .btn.bghost:hover {
        background: rgba(255, 255, 255, 0.75) !important;
      }
      
      /* ═══ BOTÓN PEQUEÑO (bsm) ═══ */
      .btn.bsm {
        box-shadow:
          0 2px 8px rgba(15, 23, 42, 0.08),
          0 1px 2px rgba(15, 23, 42, 0.04),
          inset 0 1px 0 rgba(255, 255, 255, 0.4),
          inset 0 -1px 0 rgba(0, 0, 0, 0.04) !important;
      }
      
      .btn.bsm:hover {
        transform: translateY(-1px);
      }
      
      /* ═══ BOTÓN EXTRA LARGE (bxl) ═══ */
      .btn.bxl {
        box-shadow:
          0 6px 18px rgba(15, 23, 42, 0.12),
          0 2px 5px rgba(15, 23, 42, 0.06),
          inset 0 1px 0 rgba(255, 255, 255, 0.5),
          inset 0 -1px 0 rgba(0, 0, 0, 0.08) !important;
      }
      
      .btn.bxl:hover {
        transform: translateY(-3px);
        box-shadow:
          0 12px 28px rgba(15, 23, 42, 0.18),
          0 4px 10px rgba(15, 23, 42, 0.10),
          inset 0 1px 0 rgba(255, 255, 255, 0.6),
          inset 0 -1px 0 rgba(0, 0, 0, 0.10) !important;
      }
      
      /* ═══ MÓVIL: efecto active más visible (sin hover) ═══ */
      @media (max-width: 768px) {
        .btn:active {
          transform: scale(0.94);
          transition: all 0.08s ease !important;
        }
        .btn::before {
          background: linear-gradient(180deg, rgba(255,255,255,0.28), transparent);
        }
      }
      
      /* ═══ Disabled (no cristal en desactivados) ═══ */
      .btn:disabled,
      .btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none !important;
        transform: none !important;
      }
      
      .btn:disabled::before,
      .btn.disabled::before {
        display: none;
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - LETRAS NEGRAS CON SOMBRA 3D EN TABLAS
   Cambia texto gris a negro con sombra solo en tablas.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_TABLAS_TEXTO_3D__) return;
  window.__NEXUS_TABLAS_TEXTO_3D__ = true;

  function injectCSS() {
    if (document.getElementById("nx-tablas-texto-3d-css")) return;

    const style = document.createElement("style");
    style.id = "nx-tablas-texto-3d-css";
    style.textContent = `
      /* ═══ TEXTO NEGRO CON SOMBRA 3D - SOLO EN TABLAS ═══ */
      
      /* Aplica a todas las tablas del sistema */
      table td,
      table th,
      .nxSL-table td,
      .nxSL-table th,
      .nxDC-table td,
      .nxDC-table th {
        color: #0f172a !important; /* negro con leve tinte azul */
        text-shadow:
          0 1px 0 rgba(255, 255, 255, 0.7),
          0 2px 4px rgba(0, 0, 0, 0.10) !important;
        font-weight: 600 !important;
      }
      
      /* Headers de tabla más fuertes */
      table th,
      .nxSL-table th,
      .nxDC-table th {
        color: #0a0f1e !important; /* negro más profundo */
        text-shadow:
          0 1px 0 rgba(255, 255, 255, 0.8),
          0 2px 6px rgba(0, 0, 0, 0.15) !important;
        font-weight: 800 !important;
      }
      
      /* Excepción: si tiene su propio color (rojo, verde, azul vibrante), respetarlo */
      table td[style*="color:#"],
      table td[style*="color: #"],
      table th[style*="color:#"],
      table th[style*="color: #"],
      .nxSL-table [style*="color:#"],
      .nxDC-table [style*="color:#"] {
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15) !important;
      }
      
      /* Excepción: badges/tags con fondo de color, mantener su texto */
      table .nxSL-tag,
      table .nxDC-tag,
      table .badge,
      table .tag {
        text-shadow: none !important;
      }
      
      /* Textos secundarios (clase muted) también más oscuros pero suaves */
      table .nxSL-muted,
      table .nxDC-muted,
      .nxSL-table .nxSL-muted,
      .nxDC-table .nxDC-muted {
        color: #334155 !important; /* gris-azul oscuro, no totalmente negro */
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) !important;
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - MODO LIVIANO EN MÓVIL
   Detecta móvil y desactiva efectos pesados que ralentizan Safari iPhone.
   PC sigue viéndose igual de bonito.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_MODO_LIVIANO_MOVIL__) return;
  window.__NEXUS_MODO_LIVIANO_MOVIL__ = true;

  function injectCSS() {
    if (document.getElementById("nx-modo-liviano-css")) return;

    const style = document.createElement("style");
    style.id = "nx-modo-liviano-css";
    style.textContent = `
      /* ═══════════════════════════════════════════════════════════
         MODO LIVIANO - SOLO EN MÓVIL (max-width: 768px)
         Mejora velocidad en iPhone Safari quitando efectos pesados.
         ═══════════════════════════════════════════════════════════ */
      
      @media (max-width: 768px) {
        
        /* ─── 1. QUITAR BACKDROP-FILTER (cristal/blur) ─── */
        /* Es el efecto MÁS pesado en Safari iPhone */
        .btn,
        .btn::before,
        .modal,
        .overlay,
        .sb,
        .nc,
        .kpi,
        .qa,
        .sm,
        .nxSL-section,
        .nxDC-section,
        [class*="glass"] {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        
        /* ─── 2. REDUCIR SOMBRAS COMPLEJAS A SIMPLES ─── */
        .btn {
          box-shadow: 0 2px 6px rgba(15,23,42,0.10) !important;
          transition: opacity 0.1s ease !important;
        }
        
        .btn:active {
          opacity: 0.6;
          transform: none !important;
          box-shadow: 0 1px 3px rgba(15,23,42,0.08) !important;
        }
        
        .btn::before {
          display: none !important;
        }
        
        /* ─── 3. ICONOS SIN MÚLTIPLES SOMBRAS ─── */
        .kpi i[class*="ti-"],
        .qa i[class*="ti-"],
        .sm i[class*="ti-"],
        .nc i[class*="ti-"] {
          box-shadow: 0 4px 8px rgba(15,23,42,0.12) !important;
          transition: none !important;
        }
        
        /* ─── 4. QUITAR HOVER (no existe en móvil pero algunos navegadores lo simulan) ─── */
        .btn:hover,
        .kpi:hover,
        .qa:hover,
        .nc:hover,
        .sm:hover,
        .kpi:hover i,
        .qa:hover i {
          transform: none !important;
          filter: none !important;
          box-shadow: 0 2px 6px rgba(15,23,42,0.10) !important;
        }
        
        /* ─── 5. SIMPLIFICAR ANIMACIONES DE ENTRADA ─── */
        .v.on {
          animation: none !important;
          opacity: 1 !important;
        }
        
        /* ─── 6. TABLAS - QUITAR SOMBRAS DE TEXTO MULTIPLE ─── */
        table td,
        table th,
        .nxSL-table td,
        .nxSL-table th,
        .nxDC-table td,
        .nxDC-table th {
          text-shadow: 0 1px 0 rgba(255,255,255,0.5) !important;
        }
        
        /* ─── 7. MODALES - SIN BLUR DEL FONDO ─── */
        .overlay {
          background: rgba(15,23,42,0.7) !important;
          backdrop-filter: none !important;
        }
        
        /* ─── 8. SIDEBAR - SOMBRA SIMPLE ─── */
        .sb {
          box-shadow: 2px 0 8px rgba(15,23,42,0.10) !important;
        }
        
        /* ─── 9. SCROLL SUAVE (mejor performance en Safari) ─── */
        body, .v {
          -webkit-overflow-scrolling: touch;
        }
        
        /* ─── 10. WILL-CHANGE - hint para el navegador ─── */
        .btn:active,
        .v.on {
          will-change: auto;
        }
        
        /* ─── 11. REDUCIR PSEUDO-ELEMENTOS PESADOS ─── */
        .kpi::before,
        .kpi::after,
        .nc::before,
        .nc::after {
          display: none !important;
        }
      }
      
      /* ─── PC (>768px) - Todo se ve normal ─── */
      @media (min-width: 769px) {
        /* No tocar nada, mantener todos los efectos bonitos */
      }
    `;

    document.head.appendChild(style);
  }

  injectCSS();
  
  // Log para confirmar
  const esMovil = window.matchMedia('(max-width: 768px)').matches;
  if (esMovil) {
    /* console.log('%c⚡ Modo liviano móvil activado', 'color:#059669;font-weight:bold') */;
  }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - OCULTAR TICKER + HAMBURGUESA VERDE ONLINE
   - Oculta la barra superior (ticker con NEXUS PRO ONLINE...)
   - Pinta el botón hamburguesa de verde cuando hay conexión
   - Pinta de rojo cuando se pierde conexión
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_HEADER_LIMPIO_V1__) return;
  window.__NEXUS_HEADER_LIMPIO_V1__ = true;

  function injectCSS() {
    if (document.getElementById("nx-header-limpio-css")) return;

    const style = document.createElement("style");
    style.id = "nx-header-limpio-css";
    style.textContent = `
      /* ═══ 1. OCULTAR TICKER (barra superior con info) ═══ */
      .ticker, #tkr {
        display: none !important;
      }
      
      /* ═══ 2. HAMBURGUESA - ESTADO ONLINE (VERDE) ═══ */
      .tn-tog {
        background: linear-gradient(135deg, #10b981, #059669) !important;
        color: #ffffff !important;
        border: 1px solid rgba(255,255,255,0.25) !important;
        box-shadow:
          0 4px 12px rgba(16, 185, 129, 0.35),
          0 2px 4px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.40) !important;
        transition: all 0.2s ease !important;
        position: relative;
      }
      
      .tn-tog i {
        color: #ffffff !important;
        font-size: 22px !important;
      }
      
      /* Punto verde animado tipo "online" - DESACTIVADO por preferencia del usuario */
      .tn-tog::after {
        display: none !important;
      }
      
      @keyframes nxPulseOnline {
        0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
        70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
        100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
      }
      
      /* ═══ 3. HAMBURGUESA - ESTADO OFFLINE (ROJO) ═══ */
      .tn-tog.nx-offline {
        background: linear-gradient(135deg, #ef4444, #dc2626) !important;
        box-shadow:
          0 4px 12px rgba(239, 68, 68, 0.35),
          0 2px 4px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.40) !important;
      }
      
      .tn-tog.nx-offline::after {
        background: #fca5a5;
        animation: none;
        box-shadow: none;
      }
      
      /* ═══ 4. HOVER (PC) ═══ */
      .tn-tog:hover {
        transform: translateY(-2px);
        filter: brightness(1.08);
      }
      
      .tn-tog:active {
        transform: scale(0.95);
      }
      
      /* ═══ 5. EN MÓVIL - mantener verde pero más simple ═══ */
      @media (max-width: 768px) {
        .tn-tog {
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25) !important;
        }
        .tn-tog.nx-offline {
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25) !important;
        }
        /* En móvil, reducir el animation que es pesado */
        .tn-tog::after {
          animation: none !important;
          box-shadow: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ═══ DETECTAR ONLINE/OFFLINE Y APLICAR CLASE ═══
  function actualizarEstadoConexion() {
    const btn = document.querySelector('.tn-tog');
    if (!btn) return;
    
    if (navigator.onLine) {
      btn.classList.remove('nx-offline');
      btn.title = 'Sistema ONLINE - Toca para abrir menú';
    } else {
      btn.classList.add('nx-offline');
      btn.title = 'Sistema OFFLINE - Sin conexión';
    }
  }

  // ═══ INIT ═══
  function init() {
    injectCSS();
    
    // Aplicar estado inicial cuando el botón exista
    let intentos = 0;
    const tryInit = function() {
      intentos++;
      const btn = document.querySelector('.tn-tog');
      if (btn) {
        actualizarEstadoConexion();
        return;
      }
      if (intentos < 60) setTimeout(tryInit, 100);
    };
    tryInit();
    
    // Listeners para cambio de conexión
    window.addEventListener('online', actualizarEstadoConexion);
    window.addEventListener('offline', actualizarEstadoConexion);
    
    // Re-check cada 30 segundos (solo visible, sin duplicados)
    if (window.__nxConexInterval) clearInterval(window.__nxConexInterval);
    window.__nxConexInterval = setInterval(() => {
      if (!document.hidden) actualizarEstadoConexion();
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - MIS CUENTAS BANCARIAS V2 (SUPABASE)
   Guardadas en tabla mis_cuentas_bancarias.
   Migración automática desde localStorage si existe.
   Botón copiar grande + campo notas.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_MIS_CUENTAS_V2__) return;
  window.__NEXUS_MIS_CUENTAS_V2__ = true;

  const STORAGE_KEY_VIEJO = 'nx_mis_cuentas_bancarias';
  let _cuentasCache = [];

  // ═══ BANCOS PRINCIPALES RD ═══
  const BANCOS = [
    { id: 'popular', nom: 'Banco Popular Dominicano', color: '#0066b3', logoUrl: 'https://www.popularenlinea.com/Style%20Library/PWeb/img/logo-popular.svg' },
    { id: 'bhd', nom: 'BHD', color: '#e85a00', logoUrl: 'https://www.bhd.com.do/wps/wcm/connect/bhdleon/Site/header/logo-bhd.svg' },
    { id: 'reservas', nom: 'Banreservas', color: '#c8102e', logoUrl: null },
    { id: 'scotiabank', nom: 'Scotiabank', color: '#e1141d', logoUrl: null },
    { id: 'bdi', nom: 'Banco BDI', color: '#003876', logoUrl: null },
    { id: 'banesco', nom: 'Banesco', color: '#00a652', logoUrl: null },
    { id: 'caribe', nom: 'Banco Caribe', color: '#0099d4', logoUrl: null },
    { id: 'santacruz', nom: 'Banco Santa Cruz', color: '#1a5490', logoUrl: null },
    { id: 'vimenca', nom: 'Banco Vimenca', color: '#003c71', logoUrl: null },
    { id: 'apap', nom: 'APAP', color: '#00a89c', logoUrl: null },
    { id: 'otro', nom: 'Otro Banco', color: '#64748b', logoUrl: null }
  ];

  // ═══ API HELPER ═══
  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }

  // ═══ HELPERS ═══
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function getBanco(id) {
    return BANCOS.find(b => b.id === id) || BANCOS.find(b => b.id === 'otro');
  }
  function renderLogoBanco(bancoId, size = 44) {
    const b = getBanco(bancoId);
    if (b.logoUrl) {
      return `<div style="width:${size}px;height:${size}px;border-radius:10px;background:#fff;border:1px solid #e2e8f0;display:grid;place-items:center;overflow:hidden;flex-shrink:0">
        <img src="${b.logoUrl}" alt="${esc(b.nom)}" style="max-width:75%;max-height:75%;object-fit:contain" onerror="this.parentElement.innerHTML='<div style=&quot;width:100%;height:100%;background:${b.color};color:#fff;font-weight:900;display:grid;place-items:center;font-size:${Math.floor(size*0.5)}px&quot;>${b.nom[0]}</div>'">
      </div>`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:10px;background:${b.color};color:#fff;display:grid;place-items:center;font-weight:900;font-size:${Math.floor(size*0.5)}px;flex-shrink:0;box-shadow:0 2px 6px rgba(15,23,42,.15)">${b.nom[0]}</div>`;
  }

  // ═══ CARGAR DE SUPABASE ═══
  async function cargarCuentas() {
    const api = getAPI();
    if (!api?.get) return [];
    try {
      const data = await api.get('mis_cuentas_bancarias', 'select=*&order=orden.asc,created_at.asc');
      _cuentasCache = data || [];
      return _cuentasCache;
    } catch(e) {
      console.error('Error cargando cuentas:', e);
      return [];
    }
  }

  // ═══ MIGRACIÓN desde localStorage (una sola vez) ═══
  async function migrarDeLocalStorage() {
    const yaMigrado = localStorage.getItem('nx_cuentas_migradas_v2');
    if (yaMigrado === '1') return;
    
    try {
      const viejas = JSON.parse(localStorage.getItem(STORAGE_KEY_VIEJO) || '[]');
      if (!viejas.length) {
        localStorage.setItem('nx_cuentas_migradas_v2', '1');
        return;
      }
      const api = getAPI();
      if (!api?.post) return;
      
      for (const c of viejas) {
        try {
          await api.post('mis_cuentas_bancarias', {
            banco: c.banco || 'otro',
            tipo: c.tipo || 'Ahorros',
            numero: c.numero || '',
            titular: c.titular || '',
            cedula: c.cedula || '',
            notas: ''
          });
        } catch(e) { console.warn('No se pudo migrar:', c, e); }
      }
      localStorage.setItem('nx_cuentas_migradas_v2', '1');
      // Limpiar el viejo localStorage
      localStorage.removeItem(STORAGE_KEY_VIEJO);
      if (typeof window.toast === 'function') window.toast('ok', '✅ Migrado', viejas.length + ' cuenta(s) salvada(s) a Supabase');
    } catch(e) {
      console.error('Error en migración:', e);
    }
  }

  // ═══ COPIAR AL PORTAPAPELES (sin WhatsApp) ═══
  async function copiarSoloCuenta(id) {
    const c = _cuentasCache.find(x => String(x.id) === String(id));
    if (!c) return;
    const b = getBanco(c.banco);
    let texto = `🏦 *${b.nom}*\n📋 ${c.tipo}\n💳 ${c.numero}\n👤 ${c.titular}`;
    if (c.cedula) texto += `\n🆔 ${c.cedula}`;
    if (c.notas) texto += `\n📝 ${c.notas}`;
    
    // Vibración táctil (haptic feedback)
    try { if (navigator.vibrate) navigator.vibrate(35); } catch(e) {}
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
      } else {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (typeof window.toast === 'function') window.toast('ok', '✅ Info copiada', '');
    } catch(e) {
      if (typeof window.toast === 'function') window.toast('err', 'No se pudo copiar', '');
    }
  }
  window.nxCopiarSoloCuenta = copiarSoloCuenta;
  
  // ═══ ENVIAR POR WHATSAPP (copia + abre WA) ═══
  async function enviarPorWhatsApp(id) {
    const c = _cuentasCache.find(x => String(x.id) === String(id));
    if (!c) return;
    const b = getBanco(c.banco);
    let texto = `🏦 *${b.nom}*\n📋 ${c.tipo}\n💳 ${c.numero}\n👤 ${c.titular}`;
    if (c.cedula) texto += `\n🆔 ${c.cedula}`;
    if (c.notas) texto += `\n📝 ${c.notas}`;
    
    // Vibración
    try { if (navigator.vibrate) navigator.vibrate(35); } catch(e) {}
    
    // Copiar también al portapapeles
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
      }
    } catch(e) {}
    
    if (typeof window.toast === 'function') window.toast('ok', '✅ Abriendo WhatsApp', '');
    
    // Abrir WhatsApp con texto pre-cargado
    setTimeout(() => {
      try {
        const textoCodificado = encodeURIComponent(texto);
        const url = `https://wa.me/?text=${textoCodificado}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch(e) {
        window.open('https://wa.me/', '_blank', 'noopener,noreferrer');
      }
    }, 300);
  }
  window.nxEnviarPorWhatsApp = enviarPorWhatsApp;

  // ═══ MODAL ═══
  async function abrirModal() {
    let modal = document.getElementById('nxModalCuentas');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay';
      modal.id = 'nxModalCuentas';
      // Tap fuera del modal = cerrar
      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.classList.remove('open');
      });
      document.body.appendChild(modal);
    }
    modal.innerHTML = '<div class="modal" style="max-width:560px"><div style="padding:40px;text-align:center;color:#64748b"><div class="spin"></div><div style="margin-top:10px;font-weight:600">Cargando cuentas...</div></div></div>';
    modal.classList.add('open');
    
    await cargarCuentas();
    renderModal(modal);
  }
  window.nxAbrirMisCuentas = abrirModal;

  function renderModal(modal) {
    const cuentas = _cuentasCache;
    const lista = cuentas.length === 0
      ? '<div style="text-align:center;padding:40px 20px;color:#64748b;font-size:13px">No tienes cuentas registradas.<br>Agrega tu primera abajo. 👇</div>'
      : cuentas.map((c) => {
          const b = getBanco(c.banco);
          return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:0;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.04);overflow:hidden">
              <div onclick="window.nxCopiarSoloCuenta('${esc(c.id)}')" style="display:flex;align-items:center;gap:12px;padding:14px;cursor:pointer;transition:background .12s ease,transform .08s ease" onmousedown="this.style.transform='scale(0.98)';this.style.background='#f1f5f9'" onmouseup="this.style.transform='';this.style.background=''" ontouchstart="this.style.transform='scale(0.98)';this.style.background='#f1f5f9'" ontouchend="this.style.transform='';this.style.background=''">
                ${renderLogoBanco(c.banco, 48)}
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;color:#0f172a;font-size:13px">${esc(b.nom)}</div>
                  <div style="font-size:11px;color:#64748b;margin-top:2px">${esc(c.tipo)} · <strong style="color:#1e3a8a">${esc(c.numero)}</strong></div>
                  <div style="font-size:11px;color:#64748b">${esc(c.titular)}${c.cedula ? ' · ' + esc(c.cedula) : ''}</div>
                  ${c.notas ? `<div style="font-size:10px;color:#94a3b8;margin-top:3px;font-style:italic">📝 ${esc(c.notas)}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;color:#2563eb">
                  <i class="ti ti-copy" style="font-size:22px"></i>
                  <span style="font-size:8px;font-weight:700;letter-spacing:.5px">TOCA</span>
                </div>
              </div>
              <div style="display:flex;gap:6px;padding:8px 10px;background:#f8fafc;border-top:1px solid #e2e8f0">
                <button class="btn bxl" style="flex:1;font-weight:800;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none" onclick="window.nxEnviarPorWhatsApp('${esc(c.id)}')"><i class="ti ti-brand-whatsapp" style="font-size:18px"></i> ENVIAR POR WHATSAPP</button>
                <button class="btn bsm bghost" onclick="window.nxEditarCuenta('${esc(c.id)}')" title="Editar"><i class="ti ti-pencil"></i></button>
                <button class="btn bsm bghost" onclick="window.nxEliminarCuenta('${esc(c.id)}')" title="Eliminar" style="color:#dc2626"><i class="ti ti-trash"></i></button>
              </div>
            </div>
          `;
        }).join('');

    modal.innerHTML = `
      <div class="modal" style="max-width:560px;max-height:78vh;display:flex;flex-direction:column;margin-bottom:80px">
        <div class="mt" style="display:flex;align-items:center;gap:8px">
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalCuentas').classList.remove('open')" title="Volver"><i class="ti ti-arrow-left"></i></button>
          <span style="flex:1;text-align:center"><i class="ti ti-building-bank"></i> MIS CUENTAS BANCARIAS</span>
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalCuentas').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>
        <div style="overflow-y:auto;flex:1;padding:8px 4px;-webkit-overflow-scrolling:touch">
          ${lista}
        </div>
        <div style="padding-top:12px;border-top:1px solid #e2e8f0;padding-bottom:8px">
          <button class="btn bxl bc1" style="width:100%" onclick="window.nxAbrirFormCuenta('')"><i class="ti ti-plus"></i> Agregar nueva cuenta</button>
        </div>
      </div>
    `;
  }

  // ═══ FORMULARIO AGREGAR/EDITAR ═══
  window.nxAbrirFormCuenta = function(id) {
    const c = id ? _cuentasCache.find(x => String(x.id) === String(id)) : { banco: 'popular', tipo: 'Ahorros', numero: '', titular: '', cedula: '', notas: '' };
    if (!c) return;
    
    const opcionesBanco = BANCOS.map(b => `<option value="${b.id}" ${b.id === c.banco ? 'selected' : ''}>${esc(b.nom)}</option>`).join('');
    
    let formModal = document.getElementById('nxFormCuenta');
    if (!formModal) {
      formModal = document.createElement('div');
      formModal.className = 'overlay';
      formModal.id = 'nxFormCuenta';
      document.body.appendChild(formModal);
    }
    formModal.innerHTML = `
      <div class="modal" style="max-width:480px;max-height:90vh;overflow-y:auto">
        <div class="mt">
          <span><i class="ti ti-edit"></i> ${id ? 'EDITAR' : 'NUEVA'} CUENTA</span>
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxFormCuenta').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>
        <div style="padding:8px 0">
          <div class="fr"><label>Banco</label>
            <select id="nxCntBanco">${opcionesBanco}</select>
          </div>
          <div class="fr"><label>Tipo de cuenta</label>
            <select id="nxCntTipo">
              <option value="Ahorros" ${c.tipo === 'Ahorros' ? 'selected' : ''}>Ahorros</option>
              <option value="Corriente" ${c.tipo === 'Corriente' ? 'selected' : ''}>Corriente</option>
            </select>
          </div>
          <div class="fr"><label>Número de cuenta</label>
            <input type="text" id="nxCntNumero" value="${esc(c.numero)}" placeholder="Ej: 1234567890" inputmode="numeric">
          </div>
          <div class="fr"><label>Titular</label>
            <input type="text" id="nxCntTitular" value="${esc(c.titular)}" placeholder="Nombre completo">
          </div>
          <div class="fr"><label>Cédula (opcional)</label>
            <input type="text" id="nxCntCedula" value="${esc(c.cedula || '')}" placeholder="000-0000000-0">
          </div>
          <div class="fr"><label>Notas adicionales (opcional)</label>
            <textarea id="nxCntNotas" placeholder="Ej: Para pagos hasta RD$ 50,000..." rows="3" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;resize:vertical;font-family:inherit">${esc(c.notas || '')}</textarea>
          </div>
        </div>
        <div class="fe" style="margin-top:14px;gap:8px">
          <button class="btn" type="button" onclick="document.getElementById('nxFormCuenta').classList.remove('open')">Cancelar</button>
          <button class="btn bxl bc1" type="button" onclick="window.nxGuardarCuenta('${esc(id || '')}')"><i class="ti ti-check"></i> Guardar</button>
        </div>
      </div>
    `;
    formModal.classList.add('open');
  };

  window.nxGuardarCuenta = async function(id) {
    const get = elId => document.getElementById(elId)?.value?.trim() || '';
    const cuenta = {
      banco: document.getElementById('nxCntBanco')?.value || 'popular',
      tipo: document.getElementById('nxCntTipo')?.value || 'Ahorros',
      numero: get('nxCntNumero'),
      titular: get('nxCntTitular'),
      cedula: get('nxCntCedula'),
      notas: get('nxCntNotas')
    };
    if (!cuenta.numero || !cuenta.titular) {
      if (typeof window.toast === 'function') window.toast('err', 'Faltan datos', 'Número y titular son obligatorios');
      return;
    }
    
    const api = getAPI();
    if (!api) {
      if (typeof window.toast === 'function') window.toast('err', 'API no disponible', '');
      return;
    }
    
    try {
      if (id) {
        // Editar
        await api.patch('mis_cuentas_bancarias', `id=eq.${id}`, cuenta);
      } else {
        // Crear
        await api.post('mis_cuentas_bancarias', cuenta);
      }
      document.getElementById('nxFormCuenta').classList.remove('open');
      await cargarCuentas();
      const modalPrincipal = document.getElementById('nxModalCuentas');
      if (modalPrincipal) renderModal(modalPrincipal);
      if (typeof window.toast === 'function') window.toast('ok', 'Guardado', '');
    } catch(e) {
      console.error('Error guardando:', e);
      if (typeof window.toast === 'function') window.toast('err', 'No se pudo guardar', e.message || '');
    }
  };

  window.nxEditarCuenta = function(id) {
    window.nxAbrirFormCuenta(id);
  };

  window.nxEliminarCuenta = async function(id) {
    if (!(await window.nxConfirm('¿Eliminar esta cuenta?', 'Esta acción no se puede deshacer.', { ok: 'Sí, eliminar', tipo: 'danger' }))) return;
    const api = getAPI();
    if (!api?.del) return;
    try {
      await api.del('mis_cuentas_bancarias', `id=eq.${id}`);
      await cargarCuentas();
      const modalPrincipal = document.getElementById('nxModalCuentas');
      if (modalPrincipal) renderModal(modalPrincipal);
      if (typeof window.toast === 'function') window.toast('ok', 'Eliminada', '');
    } catch(e) {
      if (typeof window.toast === 'function') window.toast('err', 'No se pudo eliminar', e.message || '');
    }
  };

  // ═══ BOTÓN EN DASHBOARD ═══
  function inyectarBoton() {
    if (document.getElementById('qaMisCuentas')) return true;
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    const qaExistente = vDash.querySelector('.qa');
    if (!qaExistente) return false;
    const qaGrid = qaExistente.parentElement;
    if (!qaGrid) return false;

    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaMisCuentas';
    btn.setAttribute('onclick', 'window.nxAbrirMisCuentas && window.nxAbrirMisCuentas()');
    btn.innerHTML = `
      <span class="qa-i"><i class="ti ti-building-bank"></i></span>
      <div class="qa-l">Mis Cuentas</div>
    `;
    qaGrid.appendChild(btn);
    return true;
  }

  // ═══ INIT ═══
  function init() {
    let intentos = 0;
    const tryInit = function() {
      intentos++;
      if (inyectarBoton()) {
        // Después de inyectar, intentar migrar (solo una vez)
        setTimeout(migrarDeLocalStorage, 2000);
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
   NEXUS PRO - BARRA INFERIOR AUTO-OCULTAR + BOTÓN VOLVER/X EN MODALES + TAP FUERA
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_UX_EXTRAS_V1__) return;
  window.__NEXUS_UX_EXTRAS_V1__ = true;

  function injectCSS() {
    if (document.getElementById("nx-ux-extras-css")) return;
    const style = document.createElement("style");
    style.id = "nx-ux-extras-css";
    style.textContent = `
      /* ═══ BARRA INFERIOR AUTO-OCULTAR ═══ */
      .mobile-bottom-nav-clean {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      .mobile-bottom-nav-clean.nx-hidden {
        transform: translate(-50%, 100%) translateY(20px) !important;
      }
      
      /* ═══ BOTÓN VOLVER EN MODALES ═══ */
      .modal .mt {
        position: relative;
        padding-left: 44px !important;
      }
      .modal .mt .nx-volver-btn {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(15,23,42,0.06);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: grid;
        place-items: center;
        cursor: pointer;
        color: #1e3a8a;
        font-size: 18px;
        transition: background 0.15s ease;
      }
      .modal .mt .nx-volver-btn:hover {
        background: rgba(15,23,42,0.12);
      }
      .modal .mt .nx-volver-btn:active {
        transform: translateY(-50%) scale(0.92);
      }
    `;
    document.head.appendChild(style);
  }

  // ═══ 1. BARRA INFERIOR: oculta tras 5s + reaparece al deslizar dedo abajo ═══
  function setupAutoHideBar() {
    let bar = null;
    let timer = null;
    let touchStartY = 0;
    
    const findBar = () => {
      bar = document.querySelector('.mobile-bottom-nav-clean');
      return bar;
    };
    
    const mostrarBarra = () => {
      if (!bar && !findBar()) return;
      bar.classList.remove('nx-hidden');
      reiniciarTimer();
    };
    
    const ocultarBarra = () => {
      if (!bar && !findBar()) return;
      bar.classList.add('nx-hidden');
    };
    
    const reiniciarTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(ocultarBarra, 5000);
    };
    
    // Iniciar el timer cuando carga
    const iniciar = () => {
      if (!findBar()) {
        setTimeout(iniciar, 500);
        return;
      }
      reiniciarTimer();
    };
    iniciar();
    
    // Detectar deslizar el dedo HACIA ABAJO (solo con 1 dedo)
    document.addEventListener('touchstart', (e) => {
      // Si hay más de 1 dedo, no interferir (multi-touch)
      if (e.touches.length > 1) return;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      // Si hay más de 1 dedo, no interferir (multi-touch)
      if (e.touches.length > 1) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY;
      // Deslizar hacia abajo (diff positivo) = mostrar barra
      if (diff > 30) {
        mostrarBarra();
        touchStartY = currentY;
      }
    }, { passive: true });
    
    // En PC: mover mouse hacia abajo de la pantalla = mostrar
    document.addEventListener('mousemove', (e) => {
      if (e.clientY > window.innerHeight - 100) {
        mostrarBarra();
      }
    }, { passive: true });
  }
  
  // ═══ 2. INYECTAR BOTÓN VOLVER EN MODALES + TAP FUERA = CERRAR ═══
  function setupModalEnhancements() {
    // Observer para detectar modales nuevos
    const observer = new MutationObserver(() => {
      // Buscar todos los overlay abiertos
      document.querySelectorAll('.overlay.open').forEach(overlay => {
        // Tap fuera = cerrar
        if (!overlay.dataset.nxTapFueraOk) {
          overlay.dataset.nxTapFueraOk = '1';
          overlay.addEventListener('click', function(e) {
            // Solo si tocas en el overlay mismo, no en el modal
            if (e.target === overlay) {
              overlay.classList.remove('open');
              // También buscar y llamar funciones closeM si existe
              try {
                const id = overlay.id;
                if (id && typeof window.closeM === 'function') {
                  window.closeM(id);
                }
              } catch(e) {}
            }
          });
        }
        
        // Botón Volver en el .mt si no existe
        const mt = overlay.querySelector('.modal > .mt, .mh');
        if (mt && !mt.querySelector('.nx-volver-btn') && !mt.dataset.nxVolverIgnore) {
          // No agregar si ya tiene un botón con icono arrow-left
          const haArrowLeft = mt.querySelector('.ti-arrow-left, [class*="arrow-left"]');
          if (haArrowLeft) {
            mt.dataset.nxVolverIgnore = '1';
            return;
          }
          
          const btnVolver = document.createElement('button');
          btnVolver.className = 'nx-volver-btn';
          btnVolver.type = 'button';
          btnVolver.title = 'Volver';
          btnVolver.innerHTML = '<i class="ti ti-arrow-left"></i>';
          btnVolver.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Buscar la X o cerrar overlay
            overlay.classList.remove('open');
            // Si hay función closeM, usarla
            try {
              const id = overlay.id;
              if (id && typeof window.closeM === 'function') {
                window.closeM(id);
              }
            } catch(e) {}
          });
          
          // Insertar al inicio del mt
          mt.insertBefore(btnVolver, mt.firstChild);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }
  
  // ═══ INIT ═══
  function init() {
    injectCSS();
    setupAutoHideBar();
    setupModalEnhancements();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - GESTIÓN DESTINATARIOS DE REPORTE (por empleado + secciones)
   Panel en tab Notificaciones para agregar empleados y elegir qué
   secciones del reporte recibe cada uno. Guarda en reporte_destinatarios.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_REPORTE_DEST_V1__) return;
  window.__NEXUS_REPORTE_DEST_V1__ = true;

  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  // Las 11 secciones disponibles
  const SECCIONES = [
    { id: 'resumen', nom: '📊 Resumen general' },
    { id: 'proceso', nom: '📋 Clientes en proceso' },
    { id: 'cobros_hoy', nom: '💵 Cobros de hoy' },
    { id: 'quien_debe', nom: '📕 Quién debe' },
    { id: 'nuevos', nom: '🆕 Clientes nuevos del día' },
    { id: 'vencer', nom: '⚠️ Pólizas por vencer' },
    { id: 'facturas_hoy', nom: '📄 Facturas generadas hoy' },
    { id: 'comisiones', nom: '💼 Agentes/comisiones' },
    { id: 'transferencias', nom: '🔄 Transferencias del día' },
    { id: 'inhabilitados', nom: '🚫 Inhabilitados/cancelados' },
    { id: 'top_deudores', nom: '🔝 Top 5 deudores' }
  ];

  let _destCache = [];

  async function cargarDest() {
    const api = getAPI();
    if (!api?.get) return [];
    try {
      const data = await api.get('reporte_destinatarios', 'select=*&order=created_at.asc');
      _destCache = data || [];
      return _destCache;
    } catch(e) { return []; }
  }

  function getSecs(d) {
    try { return Array.isArray(d.secciones) ? d.secciones : JSON.parse(d.secciones || '[]'); }
    catch(e) { return []; }
  }

  // ═══ ABRIR MODAL GESTIÓN ═══
  window.nxAbrirDestinatarios = async function() {
    let modal = document.getElementById('nxModalDest');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay';
      modal.id = 'nxModalDest';
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
      document.body.appendChild(modal);
    }
    modal.innerHTML = '<div class="modal" style="max-width:560px"><div style="padding:40px;text-align:center;color:#64748b">Cargando...</div></div>';
    modal.classList.add('open');
    await cargarDest();
    renderDestModal(modal);
  };

  function renderDestModal(modal) {
    const lista = _destCache.length === 0
      ? '<div style="text-align:center;padding:30px;color:#64748b;font-size:13px">No hay empleados configurados.<br>Agrega uno abajo. 👇</div>'
      : _destCache.map(d => {
          const secs = getSecs(d);
          return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <div style="flex:1">
                  <div style="font-weight:800;font-size:13px;color:#0f172a">${esc(d.nombre)}</div>
                  <div style="font-size:11px;color:#64748b">${esc(d.correo)}</div>
                </div>
                <span style="background:${d.activo?'#dcfce7':'#fee2e2'};color:${d.activo?'#059669':'#dc2626'};font-size:9px;font-weight:700;padding:3px 8px;border-radius:10px">${d.activo?'ACTIVO':'INACTIVO'}</span>
              </div>
              <div style="font-size:10px;color:#94a3b8;margin-bottom:8px">Recibe: ${secs.length} sección(es)</div>
              <div style="display:flex;gap:6px">
                <button class="btn bsm bc1" style="flex:1" onclick="window.nxEditarDest('${esc(d.id)}')"><i class="ti ti-pencil"></i> Editar</button>
                <button class="btn bsm bghost" style="color:#dc2626" onclick="window.nxEliminarDest('${esc(d.id)}')"><i class="ti ti-trash"></i></button>
              </div>
            </div>`;
        }).join('');

    modal.innerHTML = `
      <div class="modal" style="max-width:560px;max-height:82vh;display:flex;flex-direction:column;margin-bottom:80px">
        <div class="mt" style="display:flex;align-items:center;gap:8px">
          <button class="btn bghost bsm" onclick="document.getElementById('nxModalDest').classList.remove('open')"><i class="ti ti-arrow-left"></i></button>
          <span style="flex:1;text-align:center"><i class="ti ti-mail-cog"></i> REPORTES POR EMPLEADO</span>
          <button class="btn bghost bsm" onclick="document.getElementById('nxModalDest').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>
        <div style="overflow-y:auto;flex:1;padding:8px 4px">${lista}</div>
        <div style="padding-top:12px;border-top:1px solid #e2e8f0">
          <button class="btn bxl bc1" style="width:100%" onclick="window.nxFormDest('')"><i class="ti ti-plus"></i> Agregar empleado</button>
        </div>
      </div>`;
  }

  // ═══ FORM AGREGAR/EDITAR ═══
  window.nxFormDest = function(id) {
    const d = id ? _destCache.find(x => String(x.id) === String(id)) : { nombre:'', correo:'', secciones:[], activo:true };
    if (!d) return;
    const secsActuales = getSecs(d);

    const checks = SECCIONES.map(s => `
      <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:5px;cursor:pointer;font-size:12px">
        <input type="checkbox" class="nx-sec-chk" value="${s.id}" ${secsActuales.includes(s.id)?'checked':''} style="width:16px;height:16px">
        <span>${s.nom}</span>
      </label>`).join('');

    let fm = document.getElementById('nxFormDestModal');
    if (!fm) {
      fm = document.createElement('div');
      fm.className = 'overlay';
      fm.id = 'nxFormDestModal';
      document.body.appendChild(fm);
    }
    fm.innerHTML = `
      <div class="modal" style="max-width:480px;max-height:88vh;display:flex;flex-direction:column;margin-bottom:80px">
        <div class="mt" style="display:flex;align-items:center;gap:8px">
          <button class="btn bghost bsm" onclick="document.getElementById('nxFormDestModal').classList.remove('open')"><i class="ti ti-arrow-left"></i></button>
          <span style="flex:1;text-align:center">${id?'EDITAR':'NUEVO'} EMPLEADO</span>
          <button class="btn bghost bsm" onclick="document.getElementById('nxFormDestModal').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>
        <div style="overflow-y:auto;flex:1;padding:8px 2px">
          <div class="fr"><label>Nombre del empleado</label><input type="text" id="nxDestNom" value="${esc(d.nombre)}" placeholder="Ej: María"></div>
          <div class="fr"><label>Correo</label><input type="email" id="nxDestCorreo" value="${esc(d.correo)}" placeholder="empleado@gmail.com"></div>
          <div class="fr"><label>Activo</label><select id="nxDestActivo"><option value="si" ${d.activo!==false?'selected':''}>Sí</option><option value="no" ${d.activo===false?'selected':''}>No</option></select></div>
          <div style="font-size:11px;font-weight:700;margin:12px 0 8px;text-transform:uppercase;color:#1e293b">Secciones que recibe</div>
          ${checks}
        </div>
        <div class="fe" style="padding-top:12px;border-top:1px solid #e2e8f0;gap:8px">
          <button class="btn" onclick="document.getElementById('nxFormDestModal').classList.remove('open')">Cancelar</button>
          <button class="btn bxl bc1" onclick="window.nxGuardarDest('${esc(id||'')}')"><i class="ti ti-check"></i> Guardar</button>
        </div>
      </div>`;
    fm.classList.add('open');
  };

  window.nxGuardarDest = async function(id) {
    const nombre = document.getElementById('nxDestNom')?.value?.trim() || '';
    const correo = document.getElementById('nxDestCorreo')?.value?.trim() || '';
    const activo = document.getElementById('nxDestActivo')?.value === 'si';
    const secs = [...document.querySelectorAll('.nx-sec-chk:checked')].map(c => c.value);

    if (!nombre || !correo || !correo.includes('@')) {
      if (typeof window.toast === 'function') window.toast('err', 'Faltan datos', 'Nombre y correo válido obligatorios');
      return;
    }
    const api = getAPI();
    if (!api) { if (typeof window.toast==='function') window.toast('err','API no disponible',''); return; }

    const payload = { nombre, correo, secciones: JSON.stringify(secs), activo };
    try {
      if (id) {
        await api.patch('reporte_destinatarios', `id=eq.${id}`, payload);
      } else {
        await api.post('reporte_destinatarios', payload);
      }
      document.getElementById('nxFormDestModal').classList.remove('open');
      await cargarDest();
      const m = document.getElementById('nxModalDest');
      if (m) renderDestModal(m);
      if (typeof window.toast === 'function') window.toast('ok', 'Guardado', '');
    } catch(e) {
      if (typeof window.toast === 'function') window.toast('err', 'No se pudo guardar', e.message || '');
    }
  };

  window.nxEditarDest = function(id) { window.nxFormDest(id); };

  window.nxEliminarDest = async function(id) {
    if (!(await window.nxConfirm('¿Eliminar empleado?', 'Ya no recibirá reportes por correo.', { ok: 'Sí, eliminar', tipo: 'danger' }))) return;
    const api = getAPI();
    if (!api?.del) return;
    try {
      await api.del('reporte_destinatarios', `id=eq.${id}`);
      await cargarDest();
      const m = document.getElementById('nxModalDest');
      if (m) renderDestModal(m);
      if (typeof window.toast === 'function') window.toast('ok', 'Eliminado', '');
    } catch(e) {
      if (typeof window.toast === 'function') window.toast('err', 'No se pudo eliminar', '');
    }
  };

  // ═══ INYECTAR BOTÓN EN TAB NOTIFICACIONES ═══
  function inyectarBoton() {
    if (document.getElementById('nxDestBtnPanel')) return true;
    const panel = document.getElementById('cfgPanel2');
    if (!panel) return false;
    const nc = panel.querySelector('.nc');
    if (!nc) return false;

    const div = document.createElement('div');
    div.id = 'nxDestBtnPanel';
    div.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid #f1f5f9';
    div.innerHTML = `
      <div style="font-size:11px;font-weight:700;margin-bottom:8px;text-transform:uppercase;color:#1e293b">
        <i class="ti ti-users"></i> Reportes por empleado
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:9px 11px;font-size:10px;color:#1e3a6e;margin-bottom:10px;line-height:1.5">
        💡 Agrega empleados y elige qué secciones del reporte recibe cada uno. Tú (admin) siempre recibes todo.
      </div>
      <button class="btn bxl bc1" style="width:100%" onclick="window.nxAbrirDestinatarios()"><i class="ti ti-mail-cog"></i> Gestionar empleados y secciones</button>
    `;
    nc.appendChild(div);
    return true;
  }

  function init() {
    let intentos = 0;
    const tryInit = () => {
      intentos++;
      if (inyectarBoton()) return;
      if (intentos < 80) setTimeout(tryInit, 200);
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
   NEXUS PRO - PROGRAMACIÓN REPORTE V2 (hora libre + días + prueba)
   Hora exacta HH:MM, días de la semana, y botón de prueba inmediata.
   Guarda en configuracion.reporte_horas (["HH:MM"]) y reporte_dias ([0-6]).
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_REPORTE_PROG_V2__) return;
  window.__NEXUS_REPORTE_PROG_V2__ = true;

  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

  const DIAS = [
    { n: 1, lbl: 'Lun' }, { n: 2, lbl: 'Mar' }, { n: 3, lbl: 'Mié' },
    { n: 4, lbl: 'Jue' }, { n: 5, lbl: 'Vie' }, { n: 6, lbl: 'Sáb' }, { n: 0, lbl: 'Dom' }
  ];

  let _horas = ['07:00', '18:00'];
  let _dias = [0,1,2,3,4,5,6];

  async function cargarConfig() {
    const api = getAPI();
    if (!api?.get) return;
    // Cargar horas y días EN PARALELO (Promise.all)
    const [dH, dD] = await Promise.all([
      api.get('configuracion', "select=valor&clave=eq.reporte_horas").catch(() => null),
      api.get('configuracion', "select=valor&clave=eq.reporte_dias").catch(() => null)
    ]);
    try {
      if (dH && dH[0] && dH[0].valor) {
        const arr = JSON.parse(dH[0].valor);
        if (Array.isArray(arr)) _horas = arr.map(x => typeof x === 'number' ? String(x).padStart(2,'0')+':00' : x);
      }
    } catch(e) {}
    try {
      if (dD && dD[0] && dD[0].valor) {
        const arr = JSON.parse(dD[0].valor);
        if (Array.isArray(arr)) _dias = arr;
      }
    } catch(e) {}
  }

  function renderHorasList() {
    const cont = document.getElementById('nxHorasList');
    if (!cont) return;
    cont.innerHTML = _horas.length === 0
      ? '<div style="color:#94a3b8;font-size:11px;padding:6px">Sin horas. Agrega abajo.</div>'
      : _horas.map((h, i) => `
          <div style="display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:7px 11px;margin-bottom:5px">
            <i class="ti ti-clock" style="color:#2563eb"></i>
            <span style="flex:1;font-weight:700;font-size:13px">${esc(h)}</span>
            <button class="btn bsm bghost" style="color:#dc2626;padding:2px 8px" onclick="window.nxQuitarHora(${i})"><i class="ti ti-x"></i></button>
          </div>`).join('');
  }

  window.nxAgregarHora = function() {
    const input = document.getElementById('nxNuevaHora');
    if (!input || !input.value) return;
    const h = input.value; // formato HH:MM
    if (!_horas.includes(h)) { _horas.push(h); _horas.sort(); }
    renderHorasList();
    input.value = '';
  };
  window.nxQuitarHora = function(i) {
    _horas.splice(i, 1);
    renderHorasList();
  };

  window.nxGuardarProgramacion = async function() {
    const dias = [...document.querySelectorAll('.nx-dia-chk:checked')].map(c => parseInt(c.value));
    if (_horas.length === 0) { if(window.toast) window.toast('err','Agrega al menos 1 hora',''); return; }
    if (dias.length === 0) { if(window.toast) window.toast('err','Elige al menos 1 día',''); return; }
    const api = getAPI();
    if (!api) { if(window.toast) window.toast('err','API no disponible',''); return; }
    try {
      await api.patch('configuracion', 'clave=eq.reporte_horas', { valor: JSON.stringify(_horas) });
      await api.patch('configuracion', 'clave=eq.reporte_dias', { valor: JSON.stringify(dias.sort()) });
      if(window.toast) window.toast('ok','Guardado', _horas.length+' hora(s), '+dias.length+' día(s)');
    } catch(e) {
      if(window.toast) window.toast('err','No se pudo guardar', e.message||'');
    }
  };

  // BOTÓN DE PRUEBA
  window.nxProbarReporte = async function() {
    const api = getAPI();
    if (!api) { if(window.toast) window.toast('err','API no disponible',''); return; }
    if(window.toast) window.toast('ok','📨 Enviando prueba...','Espera unos segundos');
    try {
      // Llamar a la Edge Function con forzar:true
      const url = (api.url || '') + '/functions/v1/enviar-reporte-email';
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (api.key || '') },
        body: JSON.stringify({ forzar: true })
      });
      if (resp.ok) {
        if(window.toast) window.toast('ok','✅ Reporte de prueba enviado','Revisa tu correo');
      } else {
        if(window.toast) window.toast('err','Error al enviar prueba','Código '+resp.status);
      }
    } catch(e) {
      if(window.toast) window.toast('err','Error al enviar', e.message||'');
    }
  };

  async function inyectarPanel() {
    if (document.getElementById('nxProgPanel')) {
      // Ya existe, solo refrescar los datos
      await refrescarPanel();
      return true;
    }
    const panel = document.getElementById('cfgPanel2');
    if (!panel) return false;
    const nc = panel.querySelector('.nc');
    if (!nc) return false;

    await cargarConfig();

    const diasChecks = DIAS.map(d => `
      <label style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:10px">
        <input type="checkbox" class="nx-dia-chk" value="${d.n}" ${_dias.includes(d.n)?'checked':''} style="width:15px;height:15px">
        <span>${d.lbl}</span>
      </label>`).join('');

    const div = document.createElement('div');
    div.id = 'nxProgPanel';
    div.style.cssText = 'margin-top:16px;padding-top:16px;border-top:1px solid #f1f5f9';
    div.innerHTML = `
      <div style="font-size:11px;font-weight:700;margin-bottom:8px;text-transform:uppercase;color:#1e293b"><i class="ti ti-calendar-clock"></i> Programación del reporte</div>
      <div style="background:#eff6ff;border-radius:8px;padding:9px 11px;font-size:10px;color:#1e3a6e;margin-bottom:12px;line-height:1.5">💡 Elige hora exacta (HH:MM) y los días. Tú (admin) siempre recibes todo.</div>
      
      <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:6px">⏰ HORAS</div>
      <div id="nxHorasList" style="margin-bottom:8px"></div>
      <div style="display:flex;gap:6px;margin-bottom:14px">
        <input type="time" id="nxNuevaHora" style="flex:1;padding:8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px">
        <button class="btn bc1" onclick="window.nxAgregarHora()"><i class="ti ti-plus"></i> Agregar</button>
      </div>

      <div style="font-size:10px;font-weight:700;color:#475569;margin-bottom:6px">📅 DÍAS</div>
      <div id="nxDiasGrid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:14px">${diasChecks}</div>

      <button class="btn bxl bc1" style="width:100%;margin-bottom:8px" onclick="window.nxGuardarProgramacion()"><i class="ti ti-device-floppy"></i> Guardar programación</button>
      <button class="btn bxl" style="width:100%;background:linear-gradient(135deg,#059669,#047857);color:#fff;border:none" onclick="window.nxProbarReporte()"><i class="ti ti-send"></i> Probar reporte ahora</button>
    `;
    nc.appendChild(div);
    renderHorasList();
    return true;
  }

  // Refrescar panel con datos frescos de la BD
  async function refrescarPanel() {
    await cargarConfig();
    renderHorasList();
    // Actualizar checkboxes de días
    const grid = document.getElementById('nxDiasGrid');
    if (grid) {
      grid.querySelectorAll('.nx-dia-chk').forEach(chk => {
        chk.checked = _dias.includes(parseInt(chk.value));
      });
    }
  }
  window.nxRefrescarProgramacion = refrescarPanel;

  function init() {
    let intentos = 0;
    const tryInit = () => { intentos++; inyectarPanel().then(ok => { if(!ok && intentos<80) setTimeout(tryInit,200); }); };
    tryInit();
    
    // Cuando se toca el tab Notificaciones, refrescar la programación
    const tabBtn = document.getElementById('cfgTab2');
    if (tabBtn && !tabBtn.dataset.nxProgRefresh) {
      tabBtn.dataset.nxProgRefresh = '1';
      tabBtn.addEventListener('click', () => {
        setTimeout(() => { if (window.nxRefrescarProgramacion) window.nxRefrescarProgramacion(); }, 350);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - OCULTAR EmailJS VIEJO (Bug #8 del análisis)
   El bloque viejo de EmailJS en HTML confunde. Lo oculto desde aquí.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (window.__NEXUS_OCULTAR_EMAILJS__) return;
  window.__NEXUS_OCULTAR_EMAILJS__ = true;

  function ocultar() {
    // Selectores de los inputs viejos
    const idsViejos = ['ejPublicKey', 'ejServiceId', 'ejTemplateId', 'ejEmail', 'ejHora'];
    idsViejos.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        // Subir hasta encontrar el div.g2 o cfgPanel2 padre que tiene todo el bloque
        let parent = el;
        for (let i = 0; i < 6; i++) {
          if (!parent.parentElement) break;
          parent = parent.parentElement;
          if (parent.classList && parent.classList.contains('g2')) {
            parent.style.display = 'none';
            break;
          }
        }
      }
    });
    // También ocultar el bloque de explicación EmailJS y el historial viejo
    const preview = document.getElementById('emailPreview');
    if (preview) {
      let p = preview;
      for (let i = 0; i < 4; i++) { if (p.parentElement) p = p.parentElement; }
      if (p && p.classList && p.classList.contains('g2')) p.style.display = 'none';
    }
    // Ocultar el div con texto "Configuración EmailJS:"
    document.querySelectorAll('strong').forEach(s => {
      if (s.textContent && s.textContent.includes('Configuración EmailJS')) {
        const cont = s.closest('div');
        if (cont) cont.style.display = 'none';
      }
    });
    // Ocultar historial viejo
    const hist = document.getElementById('emailHistorial');
    if (hist) {
      const titulo = hist.previousElementSibling;
      if (titulo) titulo.style.display = 'none';
      hist.parentElement && (hist.parentElement.style.display = 'none');
    }
  }

  function init() {
    ocultar();
    // Reintentar por si carga lento
    setTimeout(ocultar, 500);
    setTimeout(ocultar, 1500);
    // Cuando se entra al tab Notificaciones, asegurar que esté oculto
    const tab = document.getElementById('cfgTab2');
    if (tab && !tab.dataset.nxOcultEjs) {
      tab.dataset.nxOcultEjs = '1';
      tab.addEventListener('click', () => setTimeout(ocultar, 200));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - MODAL DE CONFIRMACIÓN BONITO (Bug #4 del análisis)
   Reemplaza confirm() nativo del navegador por un modal elegante.
   Uso: const ok = await nxConfirm('¿Eliminar?', 'Esto no se puede deshacer');
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (window.__NEXUS_CONFIRM_MODAL__) return;
  window.__NEXUS_CONFIRM_MODAL__ = true;

  // Modal de confirmación bonito que devuelve Promise<boolean>
  window.nxConfirm = function(titulo, mensaje, opciones) {
    opciones = opciones || {};
    const txtOk = opciones.ok || 'Confirmar';
    const txtCancel = opciones.cancel || 'Cancelar';
    const tipo = opciones.tipo || 'warning'; // 'warning', 'danger', 'info'

    return new Promise(resolve => {
      // Crear o reutilizar overlay
      let modal = document.getElementById('nxConfirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'overlay';
        modal.id = 'nxConfirmModal';
        document.body.appendChild(modal);
      }

      const colores = {
        warning: { bg: '#fef3c7', border: '#fbbf24', icon: '#d97706', iconName: 'alert-triangle' },
        danger:  { bg: '#fee2e2', border: '#f87171', icon: '#dc2626', iconName: 'alert-octagon' },
        info:    { bg: '#dbeafe', border: '#60a5fa', icon: '#2563eb', iconName: 'info-circle' }
      };
      const c = colores[tipo] || colores.warning;

      modal.innerHTML = `
        <div class="modal" style="max-width:420px;padding:0;overflow:hidden">
          <div style="padding:24px 22px 18px;text-align:center">
            <div style="width:56px;height:56px;border-radius:50%;background:${c.bg};border:2px solid ${c.border};display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
              <i class="ti ti-${c.iconName}" style="font-size:28px;color:${c.icon}"></i>
            </div>
            <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:8px;line-height:1.3">${(titulo||'').replace(/</g,'&lt;')}</div>
            ${mensaje ? `<div style="font-size:13px;color:#64748b;line-height:1.5;white-space:pre-line">${(mensaje).replace(/</g,'&lt;')}</div>` : ''}
          </div>
          <div style="display:flex;gap:8px;padding:14px 20px 20px;border-top:1px solid #f1f5f9;background:#f8fafc">
            <button id="nxConfirmCancel" class="btn bxl" style="flex:1;background:#fff;border:1.5px solid #e2e8f0;color:#475569">${txtCancel}</button>
            <button id="nxConfirmOk" class="btn bxl bc1" style="flex:1">${txtOk}</button>
          </div>
        </div>`;

      modal.classList.add('open');

      const close = (val) => {
        modal.classList.remove('open');
        resolve(val);
      };
      document.getElementById('nxConfirmOk').onclick = () => close(true);
      document.getElementById('nxConfirmCancel').onclick = () => close(false);
      // Click fuera del modal = cancelar
      modal.onclick = (e) => { if (e.target === modal) close(false); };
    });
  };
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - CENTRO SMART CON IA (Claude API)
   Botón en Dashboard + modal con chat conversacional.
   Conecta a la Edge Function nexus-smart que llama a Claude Haiku 4.5.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (window.__NEXUS_SMART_V1__) return;
  window.__NEXUS_SMART_V1__ = true;

  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  // Sugerencias rápidas
  const SUGERENCIAS = [
    '¿Cuántos clientes activos tengo?',
    '¿Quiénes son mis top 5 deudores?',
    '¿Cómo voy con cobros hoy?',
    '¿Qué clientes están en proceso?',
    'Resumen del mes actual',
    'Sugiere mensaje para cobrar a Carlos'
  ];

  let _historial = []; // mensajes de la conversación actual

  // ═══ PERSISTENCIA EN NAVEGADOR ═══
  const NX_CHAT_ACTUAL = 'nx_smart_chat_actual';
  const NX_CHAT_HISTORIAL = 'nx_smart_historial';

  // Guardar la conversación actual (se mantiene al recargar)
  function guardarChatActual() {
    try {
      // Guardar solo mensajes reales (no los de "cargando")
      const limpio = _historial.filter(m => m.tipo !== 'cargando');
      localStorage.setItem(NX_CHAT_ACTUAL, JSON.stringify(limpio));
    } catch(e) {}
  }

  // Cargar la conversación actual al abrir
  function cargarChatActual() {
    try {
      const s = localStorage.getItem(NX_CHAT_ACTUAL);
      if (s) _historial = JSON.parse(s) || [];
    } catch(e) { _historial = []; }
  }

  // Archivar la conversación actual al historial (cuando empiezas una nueva)
  function archivarChat() {
    try {
      const limpio = _historial.filter(m => m.tipo !== 'cargando' && m.tipo !== 'error');
      if (!limpio.length) return; // no archivar vacíos
      const hist = JSON.parse(localStorage.getItem(NX_CHAT_HISTORIAL) || '[]');
      // Tomar la primera pregunta como título
      const primera = limpio.find(m => m.tipo === 'pregunta');
      hist.unshift({
        fecha: new Date().toISOString(),
        titulo: primera ? primera.texto.slice(0, 50) : 'Conversación',
        mensajes: limpio
      });
      // Mantener solo las últimas 20 conversaciones
      const recortado = hist.slice(0, 20);
      localStorage.setItem(NX_CHAT_HISTORIAL, JSON.stringify(recortado));
    } catch(e) {}
  }

  // Ver el historial de conversaciones pasadas
  window.nxSmartHistorial = function() {
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(NX_CHAT_HISTORIAL) || '[]'); } catch(e) {}

    const modal = document.getElementById('nxSmartModal');
    if (!modal) return;

    const lista = hist.length === 0
      ? '<div style="text-align:center;color:#94a3b8;padding:30px;font-size:13px">No hay conversaciones guardadas todavía</div>'
      : hist.map((c, i) => {
          const fecha = new Date(c.fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          return `<div onclick="window.nxSmartCargarVieja(${i})" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer">
            <div style="font-size:12px;font-weight:700;color:#1e293b">${c.titulo}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:3px">📅 ${fecha} · ${c.mensajes.length} mensajes</div>
          </div>`;
        }).join('');

    const cont = document.getElementById('nxSmartMensajes');
    if (cont) {
      cont.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:13px;font-weight:800;color:#1e293b">📚 Conversaciones guardadas</span>
          <button onclick="window.nxAbrirSmart()" style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:6px 12px;font-size:11px;cursor:pointer;font-weight:700">+ Nueva</button>
        </div>
        ${lista}`;
    }
  };

  // Cargar una conversación vieja del historial
  window.nxSmartCargarVieja = function(idx) {
    try {
      const hist = JSON.parse(localStorage.getItem(NX_CHAT_HISTORIAL) || '[]');
      if (hist[idx]) {
        _historial = hist[idx].mensajes || [];
        guardarChatActual();
        const modal = document.getElementById('nxSmartModal');
        if (modal) renderModal(modal);
      }
    } catch(e) {}
  };


  // ═══ ABRIR MODAL ═══
  window.nxAbrirSmart = function() {
    cargarChatActual(); // recuperar conversación guardada
    let modal = document.getElementById('nxSmartModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay';
      modal.id = 'nxSmartModal';
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
      document.body.appendChild(modal);
    }
    renderModal(modal);
    modal.classList.add('open');
    // Focus en input
    setTimeout(() => {
      const inp = document.getElementById('nxSmartInput');
      if (inp) inp.focus();
    }, 300);
  };

  function renderModal(modal) {
    const sugBtns = SUGERENCIAS.map(s => 
      `<button class="btn bsm" style="background:#eff6ff;color:#1e40af;border:1px solid #dbeafe;font-size:11px;text-align:left;padding:8px 10px;justify-content:flex-start" onclick="window.nxSmartPreguntar(${JSON.stringify(s).replace(/"/g,'&quot;')})">💡 ${esc(s)}</button>`
    ).join('');

    const mensajes = _historial.length === 0 
      ? `<div style="text-align:center;padding:30px 20px;color:#64748b">
          <div style="font-size:42px;margin-bottom:12px">🤖</div>
          <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:6px">NEXUS Smart</div>
          <div style="font-size:12px;line-height:1.5;margin-bottom:16px">Tu asistente inteligente. Pregúntame lo que quieras sobre tu correduría.</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:14px;text-align:left">${sugBtns}</div>
        </div>`
      : _historial.map(m => {
          if (m.tipo === 'pregunta') {
            return `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
              <div style="max-width:80%;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;padding:10px 14px;border-radius:18px 18px 4px 18px;font-size:13px;line-height:1.4">${esc(m.texto)}</div>
            </div>`;
          } else if (m.tipo === 'respuesta') {
            // Convertir markdown básico (**) a HTML bold
            const html = esc(m.texto)
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\n/g, '<br>');
            return `<div style="display:flex;justify-content:flex-start;margin-bottom:10px">
              <div style="max-width:88%;background:#fff;border:1px solid #e2e8f0;color:#0f172a;padding:10px 14px;border-radius:4px 18px 18px 18px;font-size:13px;line-height:1.5">${html}</div>
            </div>`;
          } else if (m.tipo === 'cargando') {
            return `<div style="display:flex;justify-content:flex-start;margin-bottom:10px" id="nxSmartCargando">
              <div style="background:#fff;border:1px solid #e2e8f0;color:#64748b;padding:10px 14px;border-radius:4px 18px 18px 18px;font-size:12px;font-style:italic">
                <span style="display:inline-block;animation:nxPulse 1s infinite">●</span> Pensando...
              </div>
            </div>`;
          } else if (m.tipo === 'error') {
            return `<div style="display:flex;justify-content:flex-start;margin-bottom:10px">
              <div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:10px 14px;border-radius:8px;font-size:12px">❌ ${esc(m.texto)}</div>
            </div>`;
          }
          return '';
        }).join('');

    modal.innerHTML = `
      <style>@keyframes nxPulse{0%,100%{opacity:0.3}50%{opacity:1}}
      #nxSmartModal.open{display:flex !important;align-items:stretch;justify-content:center}
      .nx-smart-full{max-width:600px;width:100%;height:100%;height:100dvh;display:flex;flex-direction:column;background:#f8fafc;padding:0;overflow:hidden;border-radius:0}
      </style>
      <div class="nx-smart-full">
        <div class="mt" style="display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1e40af,#7c3aed);color:#fff;border-radius:0;padding:14px 12px;flex-shrink:0">
          <span style="flex:1;color:#fff;font-weight:700;font-size:15px"><i class="ti ti-sparkles"></i> NEXUS SMART</span>
          <button class="btn bghost bsm" style="color:#fff" onclick="window.nxSmartHistorial()" title="Conversaciones guardadas"><i class="ti ti-history"></i></button>
          <button class="btn bghost bsm" style="color:#fff" onclick="window.nxSmartLimpiar()" title="Nueva conversación"><i class="ti ti-refresh"></i></button>
          <button style="background:rgba(255,255,255,.25);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:18px;font-weight:700;flex-shrink:0;margin-left:4px" onclick="document.getElementById('nxSmartModal').classList.remove('open')" title="Cerrar">✕</button>
        </div>
        <div id="nxSmartMensajes" style="flex:1;overflow-y:auto;padding:14px;background:#f8fafc;-webkit-overflow-scrolling:touch">
          ${mensajes}
        </div>
        <div style="padding:10px 12px;border-top:1px solid #e2e8f0;background:#fff;display:flex;gap:6px;flex-shrink:0;padding-bottom:max(10px,env(safe-area-inset-bottom))">
          <input type="text" id="nxSmartInput" placeholder="Escribe tu pregunta..." style="flex:1;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:24px;font-size:15px;outline:none" onkeydown="if(event.key==='Enter'){window.nxSmartEnviar()}">
          <button class="btn bxl bc1" style="border-radius:50%;width:44px;height:44px;padding:0;flex-shrink:0" onclick="window.nxSmartEnviar()"><i class="ti ti-send"></i></button>
        </div>
      </div>`;
    
    // Scroll al fondo
    setTimeout(() => {
      const cont = document.getElementById('nxSmartMensajes');
      if (cont) cont.scrollTop = cont.scrollHeight;
    }, 50);
  }

  window.nxSmartLimpiar = function() {
    archivarChat(); // guardar la conversación actual al historial
    _historial = [];
    guardarChatActual(); // limpiar la guardada
    const modal = document.getElementById('nxSmartModal');
    if (modal) renderModal(modal);
  };

  window.nxSmartPreguntar = function(texto) {
    const inp = document.getElementById('nxSmartInput');
    if (inp) inp.value = texto;
    window.nxSmartEnviar();
  };

  window.nxSmartEnviar = async function() {
    const inp = document.getElementById('nxSmartInput');
    if (!inp) return;
    const pregunta = inp.value.trim();
    if (!pregunta) return;
    
    inp.value = '';
    _historial.push({ tipo: 'pregunta', texto: pregunta });
    _historial.push({ tipo: 'cargando' });
    
    const modal = document.getElementById('nxSmartModal');
    if (modal) renderModal(modal);

    try {
      const api = getAPI();
      const baseUrl = (api?.url || 'https://tnwsgcxurfyuszxsewsn.supabase.co');
      const anonKey = api?.key || '';
      
      const resp = await fetch(baseUrl + '/functions/v1/nexus-smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + anonKey
        },
        body: JSON.stringify({ pregunta })
      });

      // Remover cargando
      _historial = _historial.filter(m => m.tipo !== 'cargando');

      if (!resp.ok) {
        const err = await resp.text();
        _historial.push({ tipo: 'error', texto: 'No pude conectar: ' + err.slice(0, 100) });
      } else {
        const data = await resp.json();
        if (data.ok && data.respuesta) {
          _historial.push({ tipo: 'respuesta', texto: data.respuesta });
        } else {
          _historial.push({ tipo: 'error', texto: data.error || 'Sin respuesta' });
        }
      }
    } catch(e) {
      _historial = _historial.filter(m => m.tipo !== 'cargando');
      _historial.push({ tipo: 'error', texto: 'Error de conexión: ' + (e.message || e) });
    }
    
    if (modal) renderModal(modal);
    guardarChatActual(); // persistir tras cada respuesta
  };

  // ═══ INYECTAR BOTÓN EN DASHBOARD ═══
  function inyectarBoton() {
    if (document.getElementById('qaNexusSmart')) return true;
    // Solo admin ve el botón
    if (!esAdminSmart()) return true;
    // Buscar grid de Dashboard
    const dash = document.querySelector('#v-dashboard, .v-dashboard');
    if (!dash) return false;
    
    // Buscar contenedor de botones QA
    const qaCont = dash.querySelector('.qaGrid, .qa-grid, [class*="qa"]');
    if (!qaCont) return false;
    
    // Buscar el primer .qa para copiar su estructura
    const ref = qaCont.querySelector('.qa');
    if (!ref) return false;

    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaNexusSmart';
    btn.style.cssText = 'cursor:pointer;position:relative';
    btn.setAttribute('data-go', 'smart');
    btn.onclick = () => window.nxAbrirSmart();
    btn.innerHTML = `
      <span class="qa-i" style="background:#fff;box-shadow:0 0 0 2px rgba(124,58,237,0.25), 0 4px 18px rgba(124,58,237,0.45)">
        <i class="ti ti-sparkles" style="color:#7c3aed"></i>
      </span>
      <span class="qa-l">NEXUS Smart</span>
      <span style="position:absolute;top:6px;right:8px;background:#7c3aed;color:#fff;font-size:8px;font-weight:800;padding:2px 6px;border-radius:8px">IA</span>
    `;
    qaCont.appendChild(btn);
    return true;
  }

  // Solo el administrador puede ver el botón NEXUS Smart
  function esAdminSmart() {
    try {
      const s = sessionStorage.getItem('nx_sesion');
      if (s) return (JSON.parse(s)?.rol || '').toLowerCase() === 'admin';
      return false;
    } catch(_) { return false; }
  }

  function init() {
    let intentos = 0;
    const tryInit = () => {
      intentos++;
      if (inyectarBoton()) return;
      if (intentos < 80) setTimeout(tryInit, 200);
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
   NEXUS PRO — CIERRE DE MES (con histórico)
   
   Botón en el dashboard (solo admin) que abre una ventana con:
   - Resumen del mes actual (cobrado, cobros, pendiente, nuevos)
   - Cobro por agente
   - Histórico de meses con comparativa
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (window.__NEXUS_CIERRE_MES__) return;
  window.__NEXUS_CIERRE_MES__ = true;

  const F = n => 'RD$ ' + Math.round(n || 0).toLocaleString('es-DO');
  const MESES_NOM = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  function esAdminCierre() {
    try {
      const s = sessionStorage.getItem('nx_sesion');
      return s ? (JSON.parse(s)?.rol || '').toLowerCase() === 'admin' : false;
    } catch(_) { return false; }
  }

  function nomMes(ym) {
    // ym = "2026-06" → "Junio 2026"
    const [a, m] = ym.split('-');
    return MESES_NOM[parseInt(m) - 1] + ' ' + a;
  }

  /* Calcular datos del cierre por mes desde ST */
  // Dado una fecha, devuelve a qué "período de cierre" pertenece (corte día 20)
  // Período va del 20 del mes anterior al 19 del mes actual.
  // Si el cobro es día >=20, cuenta para el mes SIGUIENTE.
  function periodoDeCierre(fechaStr) {
    const f = new Date(fechaStr + 'T00:00:00');
    let anio = f.getFullYear();
    let mes = f.getMonth(); // 0-11
    if (f.getDate() >= 20) {
      // Pasa al mes siguiente
      mes += 1;
      if (mes > 11) { mes = 0; anio += 1; }
    }
    // Devolver "YYYY-MM" del período
    return anio + '-' + String(mes + 1).padStart(2, '0');
  }

  function abonoActivoCi(a) {
    const e = String(a.estado || 'ACTIVO').toUpperCase();
    return e !== 'ANULADO' && e !== 'ELIMINADO' && e !== 'INACTIVO';
  }
  function getAPI_ci() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function getST_ci() { try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); } catch (e) { return window.ST || {}; } }

  function calcularHistorico(abonos, agentes, clientes) {
    const meses = {};
    (abonos || []).forEach(a => {
      if (!a.fecha || !abonoActivoCi(a)) return;
      const ym = periodoDeCierre(a.fecha);
      if (!meses[ym]) meses[ym] = { mes: ym, total: 0, num: 0, porAgente: {} };
      meses[ym].total += Number(a.monto || 0);
      meses[ym].num++;
      const cli = (clientes || []).find(c => String(c.id) === String(a.cliente_id));
      const nomA = (cli && cli.agente_id)
        ? ((agentes || []).find(x => String(x.id) === String(cli.agente_id))?.nom || 'Sin agente')
        : 'Sin agente';
      meses[ym].porAgente[nomA] = (meses[ym].porAgente[nomA] || 0) + Number(a.monto || 0);
    });
    return Object.values(meses).sort((a, b) => b.mes.localeCompare(a.mes));
  }

  window.nxAbrirCierre = async function() {
    if (!esAdminCierre()) return;

    const api = getAPI_ci();
    const ST_ = getST_ci();
    let abonos = [], egresos = [];
    try { abonos = (await api.get('abonos', 'select=cliente_id,monto,fecha,estado')) || []; } catch (e) {}
    try { egresos = (await api.get('egresos', 'select=monto,fecha')) || []; } catch (e) {}
    const facturas = Array.isArray(ST_.facturas) ? ST_.facturas : [];
    const clientes = Array.isArray(ST_.clientes) ? ST_.clientes : [];
    const agentes = Array.isArray(ST_.agentes) ? ST_.agentes : [];

    const historico = calcularHistorico(abonos, agentes, clientes);

    const pendientes = facturas.filter(f => {
      const e = (f.estado || '').toLowerCase();
      return e === 'pendiente' || e === 'parcial';
    });
    const montoPendiente = pendientes.reduce((s, f) => s + Number(f.total || 0), 0);

    const hoy = new Date();
    const ymActual = periodoDeCierre(hoy.toISOString().slice(0, 10));
    const mesActual = historico.find(m => m.mes === ymActual) || { mes: ymActual, total: 0, num: 0, porAgente: {} };
    const mesAnterior = historico.find(m => m.mes < ymActual) || { total: 0 };
    const tend = mesAnterior.total > 0 ? Math.round((mesActual.total - mesAnterior.total) / mesAnterior.total * 100) : (mesActual.total > 0 ? 100 : 0);
    const nuevosMes = clientes.filter(c => c.created_at && periodoDeCierre(c.created_at.slice(0, 10)) === ymActual).length;

    const egresoCiclo = (egresos || []).filter(e => e.fecha && periodoDeCierre(e.fecha) === ymActual).reduce((s, e) => s + Number(e.monto || 0), 0);
    const balance = mesActual.total - egresoCiclo;
    const maxHist = Math.max(1, ...historico.map(m => m.total));
    const maxAg = Math.max(1, ...Object.values(mesActual.porAgente), 0);

    // CSS
    if (!document.getElementById('nx-cierre-css')) {
      const st = document.createElement('style');
      st.id = 'nx-cierre-css';
      st.textContent = `
        #nx-cierre-overlay{position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);z-index:99990;display:flex;justify-content:center;align-items:flex-start;padding:20px;overflow-y:auto}
        #nx-cierre-box{background:#f8fafc;border-radius:18px;max-width:560px;width:100%;margin:auto;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)}
        .nxCi-head{background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:20px;display:flex;justify-content:space-between;align-items:center}
        .nxCi-body{padding:16px}
        .nxCi-card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .nxCi-title{font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
        .nxCi-big{font-size:34px;font-weight:800;color:#059669;line-height:1}
        .nxCi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .nxCi-stat{background:#f8fafc;border-radius:10px;padding:12px;text-align:center}
        .nxCi-stat b{font-size:18px;font-weight:800;display:block}
        .nxCi-stat span{font-size:9px;color:#94a3b8;text-transform:uppercase}
        .nxCi-mes{display:flex;justify-content:space-between;align-items:center;padding:11px;background:#f8fafc;border-radius:10px;margin-bottom:7px}
        .nxCi-row{padding:9px 2px;border-bottom:1px solid #f1f5f9}
        .nxCi-row:last-child{border-bottom:none}
        .nxCi-bar-bg{height:7px;background:#f1f5f9;border-radius:5px;overflow:hidden;margin-top:6px}
        .nxCi-bar-fill{height:100%;border-radius:5px;transition:width .5s ease}
        @media(max-width:480px){#nx-cierre-box{margin:0}}
      `;
      document.head.appendChild(st);
    }

    const cerrar = "document.getElementById('nx-cierre-overlay').remove()";

    const overlay = document.createElement('div');
    overlay.id = 'nx-cierre-overlay';
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
      <div id="nx-cierre-box">
        <div class="nxCi-head">
          <div>
            <div style="font-size:18px;font-weight:800">📊 Cierre de Mes</div>
            <div style="font-size:12px;opacity:.85">${nomMes(ymActual)}</div>
            <div style="font-size:10px;opacity:.7;margin-top:2px">📆 Período: 20 al 19 de cada mes</div>
          </div>
          <button onclick="${cerrar}" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
        </div>
        <div class="nxCi-body">

          <div class="nxCi-card">
            <div class="nxCi-title">💰 Cobrado este mes</div>
            <div class="nxCi-big">${F(mesActual.total)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:6px">
              ${mesActual.num} cobros ·
              <span style="color:${tend >= 0 ? '#10b981' : '#ef4444'};font-weight:700">${tend >= 0 ? '↑' : '↓'} ${Math.abs(tend)}%</span>
              vs mes anterior
            </div>
          </div>

          <div class="nxCi-card">
            <div class="nxCi-title">📈 Resumen del ciclo</div>
            <div class="nxCi-grid">
              <div class="nxCi-stat"><b style="color:#ef4444">${F(montoPendiente).replace('RD$ ','')}</b><span>Pendiente RD$</span></div>
              <div class="nxCi-stat"><b style="color:#f59e0b">${pendientes.length}</b><span>Facturas pend.</span></div>
              <div class="nxCi-stat"><b style="color:#10b981">${nuevosMes}</b><span>Clientes nuevos</span></div>
              <div class="nxCi-stat"><b style="color:#dc2626">${F(egresoCiclo).replace('RD$ ','')}</b><span>Egresos RD$</span></div>
            </div>
          </div>

          <div class="nxCi-card" style="background:linear-gradient(135deg,#ecfdf5,#eff6ff)">
            <div class="nxCi-title">⚖️ Balance del ciclo</div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div style="text-align:center;flex:1"><div style="font-size:9px;color:#10b981;font-weight:800;letter-spacing:.3px">ENTRÓ</div><div style="font-size:14px;font-weight:900;color:#059669;margin-top:2px">${F(mesActual.total)}</div></div>
              <div style="color:#cbd5e1;font-size:16px;font-weight:700">−</div>
              <div style="text-align:center;flex:1"><div style="font-size:9px;color:#ef4444;font-weight:800;letter-spacing:.3px">SALIÓ</div><div style="font-size:14px;font-weight:900;color:#dc2626;margin-top:2px">${F(egresoCiclo)}</div></div>
              <div style="color:#cbd5e1;font-size:16px;font-weight:700">=</div>
              <div style="text-align:center;flex:1"><div style="font-size:9px;color:${balance>=0?'#1d4ed8':'#b45309'};font-weight:800;letter-spacing:.3px">QUEDA</div><div style="font-size:14px;font-weight:900;color:${balance>=0?'#1e3a8a':'#92400e'};margin-top:2px">${F(balance)}</div></div>
            </div>
          </div>

          ${Object.keys(mesActual.porAgente).length ? `
          <div class="nxCi-card">
            <div class="nxCi-title">👥 Cobro por agente (este ciclo)</div>
            ${Object.entries(mesActual.porAgente).sort((a,b)=>b[1]-a[1]).map(([nom, monto]) => `
              <div class="nxCi-row">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:12px;font-weight:700;color:#1e293b">${nom}</span>
                  <span style="font-size:13px;font-weight:800;color:#059669">${F(monto)}</span>
                </div>
                <div class="nxCi-bar-bg"><div class="nxCi-bar-fill" style="width:${Math.round(monto/maxAg*100)}%;background:linear-gradient(90deg,#34d399,#059669)"></div></div>
              </div>
            `).join('')}
          </div>` : ''}

          <div class="nxCi-card">
            <div class="nxCi-title">📅 Histórico de ciclos</div>
            ${historico.length ? historico.slice(0,6).map(m => `
              <div class="nxCi-row">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span style="font-size:12px;font-weight:700;color:#1e293b">${nomMes(m.mes)}${m.mes===ymActual?' <span style="font-size:8px;background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:6px;font-weight:800">ACTUAL</span>':''}</span>
                  <span style="font-size:13px;font-weight:800;color:#059669">${F(m.total)}<span style="font-size:9px;color:#94a3b8;font-weight:600"> · ${m.num}</span></span>
                </div>
                <div class="nxCi-bar-bg"><div class="nxCi-bar-fill" style="width:${Math.round(m.total/maxHist*100)}%;background:${m.mes===ymActual?'linear-gradient(90deg,#60a5fa,#1d4ed8)':'linear-gradient(90deg,#a7f3d0,#10b981)'}"></div></div>
              </div>
            `).join('') : '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:14px">Aún no hay cobros registrados</div>'}
          </div>

        </div>
      </div>`;

    document.body.appendChild(overlay);
  };

  /* Inyectar botón en el dashboard */
  function inyectarBotonCierre() {
    if (!esAdminCierre()) return true;
    if (document.getElementById('qaCierreMes')) return true;
    const dash = document.querySelector('#v-dashboard, .v-dashboard');
    if (!dash) return false;
    const qaCont = dash.querySelector('.qaGrid, .qa-grid, [class*="qa"]');
    if (!qaCont) return false;
    const ref = qaCont.querySelector('.qa');
    if (!ref) return false;

    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaCierreMes';
    btn.style.cssText = 'cursor:pointer;position:relative';
    btn.onclick = () => window.nxAbrirCierre();
    btn.innerHTML = `
      <span class="qa-i" style="background:#fff;box-shadow:0 0 0 2px rgba(5,150,105,0.25), 0 4px 18px rgba(5,150,105,0.45)">
        <i class="ti ti-calendar-stats" style="color:#059669"></i>
      </span>
      <span class="qa-l">Cierre de Mes</span>
    `;
    qaCont.appendChild(btn);
    return true;
  }

  function init() {
    let intentos = 0;
    const tryInit = () => {
      intentos++;
      if (inyectarBotonCierre()) return;
      if (intentos < 80) setTimeout(tryInit, 250);
    };
    setTimeout(tryInit, 800);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once: true })
    : init();
})();


/* ════════════════════════════════════════════════════════════════
   NEXUS PRO — VALIDACIÓN Y AVISO DE CÉDULA
   
   En el campo de cédula del formulario de cliente:
   1. Avisa al instante si la cédula ya existe (sin esperar a guardar)
   2. Valida el formato de cédula dominicana (11 dígitos + verificador)
   3. Formatea automáticamente con guiones (000-0000000-0)
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (window.__NEXUS_CEDULA_VALIDA__) return;
  window.__NEXUS_CEDULA_VALIDA__ = true;

  // Validar cédula dominicana (algoritmo módulo 10 - Luhn de la JCE)
  function cedulaValida(ced) {
    const c = ced.replace(/[\s-]/g, '');
    if (!/^\d{11}$/.test(c)) return false;
    let suma = 0;
    for (let i = 0; i < 10; i++) {
      let mult = c[i] * ((i % 2) + 1); // alterna x1, x2
      if (mult > 9) mult -= 9;
      suma += mult;
    }
    const verif = (10 - (suma % 10)) % 10;
    return verif === parseInt(c[10]);
  }

  // Formatear con guiones: 000-0000000-0
  function formatearCedula(v) {
    const c = v.replace(/\D/g, '').slice(0, 11);
    if (c.length <= 3) return c;
    if (c.length <= 10) return c.slice(0, 3) + '-' + c.slice(3);
    return c.slice(0, 3) + '-' + c.slice(3, 10) + '-' + c.slice(10);
  }

  function init() {
    let tries = 0;
    const go = () => {
      tries++;
      const input = document.getElementById('cCed');
      if (!input) { if (tries < 60) setTimeout(go, 500); return; }
      if (input.dataset.nxCedula) return;
      input.dataset.nxCedula = '1';

      // Crear elemento de aviso debajo del campo
      let aviso = document.getElementById('nx-cedula-aviso');
      if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = 'nx-cedula-aviso';
        aviso.style.cssText = 'font-size:10px;margin-top:4px;font-weight:600;display:none';
        input.parentElement.appendChild(aviso);
      }

      function revisar() {
        const valor = input.value.trim();
        const limpio = valor.replace(/[\s-]/g, '');

        if (!limpio) { aviso.style.display = 'none'; input.style.borderColor = ''; return; }

        // 1. ¿Ya existe en el sistema?
        const editId = window.editCliId || (typeof editCliId !== 'undefined' ? editCliId : null);
        const dup = (window.ST?.clientes || []).find(c =>
          (c.cedula || '').replace(/[\s-]/g, '') === limpio && c.id !== editId
        );
        if (dup) {
          const estado = dup.activo === false ? 'inhabilitado' : 'activo';
          aviso.style.display = 'block';
          aviso.style.color = '#dc2626';
          aviso.innerHTML = `⚠️ Esta cédula ya es de <strong>${dup.nom}</strong> (${estado}). <a href="#" onclick="event.preventDefault();document.getElementById('nxSmartModal');window.verCliente&&window.verCliente('${dup.id}')" style="color:#2563eb;text-decoration:underline">Ver cliente</a>`;
          input.style.borderColor = '#dc2626';
          return;
        }

        // 2. Validar formato (solo si tiene 11 dígitos completos)
        if (limpio.length === 11) {
          if (cedulaValida(limpio)) {
            aviso.style.display = 'block';
            aviso.style.color = '#10b981';
            aviso.innerHTML = '✓ Cédula válida y disponible';
            input.style.borderColor = '#10b981';
          } else {
            aviso.style.display = 'block';
            aviso.style.color = '#f59e0b';
            aviso.innerHTML = '⚠️ El número de cédula no parece válido (verifica los dígitos)';
            input.style.borderColor = '#f59e0b';
          }
        } else if (limpio.length > 0) {
          // Incompleta
          aviso.style.display = 'block';
          aviso.style.color = '#94a3b8';
          aviso.innerHTML = `${limpio.length}/11 dígitos`;
          input.style.borderColor = '';
        }
      }

      // Al escribir: formatear y revisar
      input.addEventListener('input', function() {
        const pos = this.selectionStart;
        const antes = this.value;
        const formateado = formatearCedula(this.value);
        if (formateado !== antes) {
          this.value = formateado;
        }
        revisar();
      });

      // Al perder foco, revisar de nuevo
      input.addEventListener('blur', revisar);

      console.log('✅ NEXUS: Validación de cédula activa');
    };
    setTimeout(go, 1000);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once: true })
    : init();
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - CONTABILIDAD (EGRESOS + BALANCE)  ·  SOLO ADMIN
   ────────────────────────────────────────────────────────────────
   Botón en el Dashboard (solo rol admin) que abre una ventana para:
     • Registrar pagos que SALEN:
         - ARS / aseguradoras
         - Salarios de empleados
         - Gastos generales
     • Ver un balance:
         - Entró  = cobros de clientes (tabla "abonos" de Supabase)
         - Salió  = egresos registrados (tabla "egresos" de Supabase)
         - Queda  = Entró - Salió
   Los egresos se guardan en la tabla "egresos" (ya existente).
   Todo vive en parches.js. No se modifica el index.html.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_CONTABILIDAD_V1__) return;
  window.__NEXUS_CONTABILIDAD_V1__ = true;

  // ── Helpers compartidos (mismo patrón que el resto de parches.js) ──
  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch (e) { return window.API; }
  }
  function esAdmin() {
    try { return (typeof sesion !== 'undefined') && sesion?.rol === 'admin'; }
    catch (e) { try { return window.sesion?.rol === 'admin'; } catch (_) { return false; } }
  }
  function usuarioActual() {
    try {
      const s = (typeof sesion !== 'undefined') ? sesion : window.sesion;
      return s?.usuario || s?.nom || s?.login || 'admin';
    } catch (e) { return 'admin'; }
  }
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }
  function fmt(n) {
    return 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  function fmtFecha(iso) {
    if (!iso) return '—';
    try { return new Date(iso + (String(iso).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (e) { return iso; }
  }
  function notify(tipo, titulo, msg) {
    if (typeof window.toast === 'function') window.toast(tipo, titulo, msg || '');
  }

  // ── Tipos de egreso ──
  const TIPOS = {
    ARS:     { label: 'Aseguradora (ARS)', benef: 'Aseguradora / ARS',  icon: 'ti-building-hospital', color: '#7c3aed' },
    SALARIO: { label: 'Salario empleado',  benef: 'Empleado',            icon: 'ti-user-dollar',       color: '#0891b2' },
    GASTO:   { label: 'Gasto general',     benef: 'Proveedor / detalle', icon: 'ti-receipt-2',         color: '#d97706' }
  };
  function tipoInfo(t) { return TIPOS[t] || { label: t || 'Egreso', benef: 'Beneficiario', icon: 'ti-cash', color: '#64748b' }; }

  const METODOS = ['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta', 'Otro'];

  // ════════════════════════════════════════════════════════════════
  // ENLACE CON LA CONTABILIDAD FORMAL (asientos / Estado de Resultados)
  // Cada egreso genera un asiento de doble entrada:
  //   DEBE  = cuenta de gasto (sube el gasto)
  //   HABER = 1101 Efectivo y equivalentes (baja el efectivo)
  // El asiento se enlaza con el egreso por la referencia "EGR-<id>".
  // ════════════════════════════════════════════════════════════════
  function getST() {
    try { return (typeof ST !== 'undefined') ? ST : (window.ST || null); }
    catch (e) { return window.ST || null; }
  }
  function recalcContab() {
    try {
      if (typeof recalcularSaldosContables === 'function') recalcularSaldosContables();
      else if (typeof window.recalcularSaldosContables === 'function') window.recalcularSaldosContables();
    } catch (e) {}
  }
  // Cuenta de gasto según el tipo de egreso (usa el catálogo CUENTAS existente)
  function cuentaGasto(tipo) {
    if (tipo === 'SALARIO') return { cod: '5201', nom: 'Nómina agentes' };
    return { cod: '5101', nom: 'Gastos operativos' }; // ARS y GASTO general
  }
  function asientoDeEgreso(e) {
    const cta = cuentaGasto(e.tipo);
    return {
      fecha: e.fecha || new Date().toISOString().slice(0, 10),
      referencia: 'EGR-' + e.id,
      descripcion: 'Egreso ' + tipoInfo(e.tipo).label + ': ' + (e.concepto || '') + (e.beneficiario ? ' — ' + e.beneficiario : ''),
      cuenta_dr_cod: cta.cod,
      cuenta_dr_nom: cta.nom,
      monto_dr: Number(e.monto || 0),
      cuenta_cr_cod: '1101',
      cuenta_cr_nom: 'Efectivo y equivalentes',
      monto_cr: Number(e.monto || 0)
    };
  }
  // Recarga los asientos en memoria para que los reportes formales se actualicen al instante
  async function sincronizarContabilidad() {
    try {
      const stRef = getST();
      const api = getAPI();
      if (!stRef || !api?.get) return;
      stRef.asientos = await api.get('asientos', 'select=*&order=created_at.desc') || [];
      recalcContab();
    } catch (e) { console.warn('No se pudo sincronizar contabilidad:', e); }
  }
  // Crea el asiento de un egreso recién guardado (no rompe el guardado si falla)
  async function crearAsientoEgreso(e) {
    const api = getAPI();
    if (!api?.post || !e?.id) return;
    try { await api.post('asientos', asientoDeEgreso(e)); }
    catch (err) { console.warn('No se pudo crear el asiento del egreso:', err); }
  }
  // Actualiza (o crea si no existe) el asiento enlazado a un egreso editado
  async function actualizarAsientoEgreso(e) {
    const api = getAPI();
    if (!api?.patch || !e?.id) return;
    const cta = cuentaGasto(e.tipo);
    const cambios = {
      fecha: e.fecha,
      descripcion: 'Egreso ' + tipoInfo(e.tipo).label + ': ' + (e.concepto || '') + (e.beneficiario ? ' — ' + e.beneficiario : ''),
      cuenta_dr_cod: cta.cod, cuenta_dr_nom: cta.nom, monto_dr: Number(e.monto || 0),
      cuenta_cr_cod: '1101', cuenta_cr_nom: 'Efectivo y equivalentes', monto_cr: Number(e.monto || 0)
    };
    try {
      const upd = await api.patch('asientos', `referencia=eq.EGR-${e.id}`, cambios);
      if (!upd || !upd.length) await crearAsientoEgreso(e); // egreso viejo sin asiento: lo crea
    } catch (err) { console.warn('No se pudo actualizar el asiento del egreso:', err); }
  }
  // Borra el asiento enlazado a un egreso eliminado
  async function borrarAsientoEgreso(id) {
    const api = getAPI();
    if (!api?.del || !id) return;
    try { await api.del('asientos', `referencia=eq.EGR-${id}`); }
    catch (err) { console.warn('No se pudo borrar el asiento del egreso:', err); }
  }
  // Crea los asientos que falten para egresos anteriores (auto-conexión, no duplica)
  async function asegurarAsientos() {
    const api = getAPI();
    if (!api?.get || !api?.post || !_egresos.length) return;
    let existentes = [];
    try { existentes = await api.get('asientos', 'select=referencia&referencia=like.EGR-*') || []; }
    catch (e) { return; }
    const set = new Set(existentes.map(a => a.referencia));
    const faltan = _egresos.filter(e => e.id && !set.has('EGR-' + e.id));
    if (!faltan.length) return;
    for (const e of faltan) await crearAsientoEgreso(e);
    await sincronizarContabilidad();
  }

  // ── Estado local ──
  let _egresos = [];
  let _abonos = [];
  let _periodo = 'todos'; // 'todos' o 'YYYY-MM'

  // ═══ CARGA DE DATOS ═══
  async function cargarEgresos() {
    const api = getAPI();
    if (!api?.get) return [];
    try {
      _egresos = await api.get('egresos', 'select=*&order=fecha.desc,created_at.desc') || [];
    } catch (e) { console.error('Error cargando egresos:', e); _egresos = []; }
    return _egresos;
  }

  async function cargarAbonos() {
    const api = getAPI();
    if (!api?.get) { _abonos = []; return; }
    try {
      // Cobros de clientes = abonos activos (se excluyen anulados/eliminados)
      _abonos = await api.get('abonos', 'select=monto,estado,fecha') || [];
    } catch (e) { console.error('Error cargando abonos:', e); _abonos = []; }
  }

  // ── Helpers de CICLO CONTABLE (cierre del día 20 al 20) ──
  // El día 20 ABRE el ciclo. Un pago del 20-may cae en el ciclo "20 may – 19 jun".
  const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function cicloInicioDeFecha(fecha) {
    // Día 20 que abre el ciclo al que pertenece 'fecha'
    const d = new Date(String(fecha) + (String(fecha).length === 10 ? 'T12:00:00' : ''));
    let y = d.getFullYear(), m = d.getMonth();
    if (d.getDate() < 20) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
    return new Date(y, m, 20);
  }
  function finDeCiclo(inicio) { return new Date(inicio.getFullYear(), inicio.getMonth() + 1, 19); }
  function claveCiclo(inicio) { return inicio.getFullYear() + '-' + String(inicio.getMonth() + 1).padStart(2, '0'); }
  function cicloDeFecha(fecha) { return claveCiclo(cicloInicioDeFecha(fecha)); }
  function etiquetaCiclo(inicio, fin) {
    const ya = inicio.getFullYear(), yb = fin.getFullYear();
    const a = `20 ${MES_CORTO[inicio.getMonth()]}`, b = `19 ${MES_CORTO[fin.getMonth()]}`;
    return ya === yb ? `${a} – ${b} ${yb}` : `${a} ${ya} – ${b} ${yb}`;
  }
  function nombreCiclo(clave) {
    const [y, m] = clave.split('-').map(Number);
    const inicio = new Date(y, m - 1, 20);
    return etiquetaCiclo(inicio, finDeCiclo(inicio));
  }

  function abonosActivos() {
    return _abonos.filter(a => {
      const est = String(a.estado || 'ACTIVO').toUpperCase();
      return est !== 'ANULADO' && est !== 'ELIMINADO' && est !== 'INACTIVO';
    });
  }
  function enPeriodo(fecha) { return _periodo === 'todos' || cicloDeFecha(fecha) === _periodo; }
  function totalEntro() {
    return abonosActivos().filter(a => a.fecha && enPeriodo(a.fecha)).reduce((s, a) => s + Number(a.monto || 0), 0);
  }
  function egresosFiltrados() { return _egresos.filter(e => enPeriodo(e.fecha)); }
  function totalSalio() { return egresosFiltrados().reduce((s, e) => s + Number(e.monto || 0), 0); }
  function periodosDisponibles() {
    const set = new Set();
    abonosActivos().forEach(a => { if (a.fecha) set.add(cicloDeFecha(a.fecha)); });
    _egresos.forEach(e => { if (e.fecha) set.add(cicloDeFecha(e.fecha)); });
    set.add(cicloDeFecha(new Date().toISOString().slice(0, 10))); // siempre incluir el ciclo actual
    return Array.from(set).filter(Boolean).sort().reverse();
  }

  // Cambiar el ciclo que se está viendo
  window.nxContabFiltrar = function (val) {
    _periodo = val || 'todos';
    const mp = document.getElementById('nxModalContab');
    if (mp) renderModal(mp);
  };

  // ── Aplica el ciclo 20→20 también al Estado de Resultados FORMAL (P&G) ──
  function instalarCicloContable() {
    try {
      // (mes, anio) = mes/año del día 20 que ABRE el ciclo
      window.periodoContable = function (mes, anio) {
        const desde = new Date(anio, mes - 1, 20, 0, 0, 0, 0);
        const hasta = new Date(anio, mes, 19, 23, 59, 59, 999);
        return { desde, hasta };
      };
      // Llena el selector de períodos del P&G con los ciclos 20→20
      window.llenarPeriodosPYG = function () {
        const sel = document.getElementById('pygPeriodo');
        if (!sel || sel.dataset.ciclo20 === '1') return;
        const actual = cicloInicioDeFecha(new Date().toISOString().slice(0, 10));
        let opts = '';
        for (let i = 0; i < 12; i++) {
          const ini = new Date(actual.getFullYear(), actual.getMonth() - i, 20);
          opts += `<option value="${ini.getFullYear()}-${ini.getMonth() + 1}">${etiquetaCiclo(ini, finDeCiclo(ini))}</option>`;
        }
        sel.innerHTML = opts;
        sel.dataset.ciclo20 = '1';
      };
    } catch (e) { console.warn('No se pudo instalar el ciclo contable 20→20:', e); }
  }

  // ═══ MODAL PRINCIPAL ═══
  async function abrirModal() {
    if (!esAdmin()) { notify('err', 'Acceso restringido', 'Solo el administrador puede ver Contabilidad'); return; }

    let modal = document.getElementById('nxModalContab');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay';
      modal.id = 'nxModalContab';
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
      document.body.appendChild(modal);
    }
    modal.innerHTML = '<div class="modal" style="max-width:620px"><div style="padding:40px;text-align:center;color:#64748b"><div class="spin"></div><div style="margin-top:10px;font-weight:600">Cargando contabilidad...</div></div></div>';
    modal.classList.add('open');

    await Promise.all([cargarEgresos(), cargarAbonos()]);
    asegurarAsientos(); // conecta egresos anteriores con la contabilidad formal (en segundo plano)
    renderModal(modal);
  }
  window.nxAbrirContabilidad = abrirModal;

  function renderModal(modal) {
    const egs = egresosFiltrados();
    const entro = totalEntro();
    const salio = totalSalio();
    const queda = entro - salio;

    // Selector de mes
    const periodos = periodosDisponibles();
    const optPeriodo = `<option value="todos" ${_periodo === 'todos' ? 'selected' : ''}>📅 Todo el tiempo</option>`
      + periodos.map(p => `<option value="${p}" ${p === _periodo ? 'selected' : ''}>${esc(nombreCiclo(p))}</option>`).join('');

    // Desglose de egresos por tipo
    const porTipo = {};
    egs.forEach(e => { const t = e.tipo || 'GASTO'; porTipo[t] = (porTipo[t] || 0) + Number(e.monto || 0); });
    const chips = Object.keys(porTipo).map(t => {
      const ti = tipoInfo(t);
      return `<span style="display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:3px 10px;font-size:10.5px;font-weight:700;color:#475569"><i class="ti ${ti.icon}" style="color:${ti.color}"></i>${esc(ti.label)}: ${fmt(porTipo[t])}</span>`;
    }).join('');

    const lista = egs.length === 0
      ? '<div style="text-align:center;padding:36px 20px;color:#94a3b8;font-size:13px">No hay egresos en este periodo.<br>Registra uno abajo. 👇</div>'
      : egs.map(e => {
          const ti = tipoInfo(e.tipo);
          return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:11px 12px;margin-bottom:9px;display:flex;align-items:center;gap:11px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
              <div style="width:40px;height:40px;border-radius:10px;background:${ti.color}18;color:${ti.color};display:grid;place-items:center;flex-shrink:0"><i class="ti ${ti.icon}" style="font-size:20px"></i></div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:800;color:#0f172a;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.concepto || ti.label)}</div>
                <div style="font-size:11px;color:#64748b;margin-top:1px">${esc(ti.label)}${e.beneficiario ? ' · ' + esc(e.beneficiario) : ''}</div>
                <div style="font-size:10.5px;color:#94a3b8;margin-top:1px">${fmtFecha(e.fecha)}${e.metodo ? ' · ' + esc(e.metodo) : ''}${e.banco ? ' · ' + esc(e.banco) : ''}${e.referencia ? ' · Ref: ' + esc(e.referencia) : ''}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-weight:900;color:#dc2626;font-size:14px;white-space:nowrap">- ${fmt(e.monto)}</div>
                <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:4px">
                  <button class="btn bsm bghost" onclick="window.nxEditarEgreso('${esc(e.id)}')" title="Editar"><i class="ti ti-pencil"></i></button>
                  <button class="btn bsm bghost" onclick="window.nxEliminarEgreso('${esc(e.id)}')" title="Eliminar" style="color:#dc2626"><i class="ti ti-trash"></i></button>
                </div>
              </div>
            </div>`;
        }).join('');

    modal.innerHTML = `
      <div class="modal" style="max-width:620px;max-height:82vh;display:flex;flex-direction:column;margin-bottom:80px">
        <div class="mt" style="display:flex;align-items:center;gap:8px">
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalContab').classList.remove('open')" title="Volver"><i class="ti ti-arrow-left"></i></button>
          <span style="flex:1;text-align:center"><i class="ti ti-calculator"></i> CONTABILIDAD</span>
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalContab').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>

        <!-- FILTRO DE MES -->
        <div style="padding:6px 2px 8px">
          <select id="nxContabPeriodo" onchange="window.nxContabFiltrar(this.value)" style="width:100%;padding:9px 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;color:#1e293b;background:#fff;outline:none">${optPeriodo}</select>
        </div>

        <!-- BALANCE -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 2px 10px">
          <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #a7f3d0;border-radius:14px;padding:12px 10px;text-align:center">
            <div style="font-size:10px;font-weight:800;color:#047857;letter-spacing:.4px"><i class="ti ti-arrow-down-circle"></i> ENTRÓ</div>
            <div style="font-size:16px;font-weight:900;color:#065f46;margin-top:3px">${fmt(entro)}</div>
            <div style="font-size:9px;color:#10b981;font-weight:600;margin-top:1px">Cobros de clientes</div>
          </div>
          <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fecaca;border-radius:14px;padding:12px 10px;text-align:center">
            <div style="font-size:10px;font-weight:800;color:#b91c1c;letter-spacing:.4px"><i class="ti ti-arrow-up-circle"></i> SALIÓ</div>
            <div style="font-size:16px;font-weight:900;color:#991b1b;margin-top:3px">${fmt(salio)}</div>
            <div style="font-size:9px;color:#ef4444;font-weight:600;margin-top:1px">Egresos</div>
          </div>
          <div style="background:linear-gradient(135deg,${queda >= 0 ? '#eff6ff,#dbeafe' : '#fffbeb,#fef3c7'});border:1px solid ${queda >= 0 ? '#bfdbfe' : '#fde68a'};border-radius:14px;padding:12px 10px;text-align:center">
            <div style="font-size:10px;font-weight:800;color:${queda >= 0 ? '#1d4ed8' : '#b45309'};letter-spacing:.4px"><i class="ti ti-wallet"></i> QUEDA</div>
            <div style="font-size:16px;font-weight:900;color:${queda >= 0 ? '#1e3a8a' : '#92400e'};margin-top:3px">${fmt(queda)}</div>
            <div style="font-size:9px;color:${queda >= 0 ? '#3b82f6' : '#d97706'};font-weight:600;margin-top:1px">Balance neto</div>
          </div>
        </div>

        ${chips ? `<div style="display:flex;flex-wrap:wrap;gap:5px;padding:0 2px 8px">${chips}</div>` : ''}

        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 6px">
          <span style="font-size:11px;font-weight:800;color:#475569;letter-spacing:.3px">EGRESOS REGISTRADOS (${egs.length})</span>
        </div>

        <div style="overflow-y:auto;flex:1;padding:2px 2px;-webkit-overflow-scrolling:touch">
          ${lista}
        </div>

        <div style="padding-top:12px;border-top:1px solid #e2e8f0;padding-bottom:8px">
          <button class="btn bxl bc1" style="width:100%" onclick="window.nxAbrirFormEgreso('')"><i class="ti ti-plus"></i> Registrar egreso</button>
        </div>
      </div>`;
  }

  // ═══ FORMULARIO EGRESO (nuevo / editar) ═══
  window.nxAbrirFormEgreso = function (id) {
    if (!esAdmin()) return;
    const e = id
      ? _egresos.find(x => String(x.id) === String(id))
      : { tipo: 'ARS', concepto: '', beneficiario: '', monto: '', metodo: 'Transferencia', banco: '', referencia: '', nota: '', fecha: new Date().toISOString().slice(0, 10) };
    if (!e) return;

    const optTipo = Object.keys(TIPOS).map(k => `<option value="${k}" ${k === e.tipo ? 'selected' : ''}>${esc(TIPOS[k].label)}</option>`).join('');
    const optMetodo = METODOS.map(m => `<option value="${m}" ${m === (e.metodo || '') ? 'selected' : ''}>${esc(m)}</option>`).join('');
    const benefLabel = tipoInfo(e.tipo).benef;

    let f = document.getElementById('nxFormEgreso');
    if (!f) {
      f = document.createElement('div');
      f.className = 'overlay';
      f.id = 'nxFormEgreso';
      f.addEventListener('click', ev => { if (ev.target === f) f.classList.remove('open'); });
      document.body.appendChild(f);
    }
    f.innerHTML = `
      <div class="modal" style="max-width:480px;max-height:90vh;overflow-y:auto">
        <div class="mt">
          <span><i class="ti ti-cash-banknote"></i> ${id ? 'EDITAR' : 'NUEVO'} EGRESO</span>
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxFormEgreso').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>
        <div style="padding:8px 0">
          <div class="fr"><label>Tipo de egreso</label>
            <select id="nxEgTipo" onchange="window.nxEgTipoChange()">${optTipo}</select>
          </div>
          <div class="fr"><label>Concepto *</label>
            <input type="text" id="nxEgConcepto" value="${esc(e.concepto || '')}" placeholder="Ej: Pago mensual póliza colectiva">
          </div>
          <div class="fr"><label id="nxEgBenefLabel">${esc(benefLabel)}</label>
            <input type="text" id="nxEgBenef" value="${esc(e.beneficiario || '')}" placeholder="Nombre del beneficiario">
          </div>
          <div style="display:flex;gap:8px">
            <div class="fr" style="flex:1"><label>Monto *</label>
              <input type="number" id="nxEgMonto" value="${esc(e.monto || '')}" placeholder="0" inputmode="decimal" min="0" step="0.01">
            </div>
            <div class="fr" style="flex:1"><label>Fecha</label>
              <input type="date" id="nxEgFecha" value="${esc(e.fecha || new Date().toISOString().slice(0, 10))}">
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <div class="fr" style="flex:1"><label>Método</label>
              <select id="nxEgMetodo">${optMetodo}</select>
            </div>
            <div class="fr" style="flex:1"><label>Banco (opcional)</label>
              <input type="text" id="nxEgBanco" value="${esc(e.banco || '')}" placeholder="Ej: Popular">
            </div>
          </div>
          <div class="fr"><label>Referencia (opcional)</label>
            <input type="text" id="nxEgRef" value="${esc(e.referencia || '')}" placeholder="No. de transferencia / cheque">
          </div>
          <div class="fr"><label>Nota (opcional)</label>
            <textarea id="nxEgNota" rows="2" placeholder="Detalle adicional..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px;font-size:13px;resize:vertical;font-family:inherit">${esc(e.nota || '')}</textarea>
          </div>
        </div>
        <div class="fe" style="margin-top:14px;gap:8px">
          <button class="btn" type="button" onclick="document.getElementById('nxFormEgreso').classList.remove('open')">Cancelar</button>
          <button class="btn bxl bc1" type="button" onclick="window.nxGuardarEgreso('${esc(id || '')}')"><i class="ti ti-check"></i> Guardar</button>
        </div>
      </div>`;
    f.classList.add('open');
  };

  // Actualiza la etiqueta del beneficiario según el tipo seleccionado
  window.nxEgTipoChange = function () {
    const t = document.getElementById('nxEgTipo')?.value;
    const lbl = document.getElementById('nxEgBenefLabel');
    if (lbl) lbl.textContent = tipoInfo(t).benef;
  };

  window.nxGuardarEgreso = async function (id) {
    if (!esAdmin()) return;
    const val = elId => document.getElementById(elId)?.value?.trim() || '';
    const egreso = {
      tipo: document.getElementById('nxEgTipo')?.value || 'GASTO',
      concepto: val('nxEgConcepto'),
      beneficiario: val('nxEgBenef'),
      monto: Number(document.getElementById('nxEgMonto')?.value || 0),
      metodo: document.getElementById('nxEgMetodo')?.value || '',
      banco: val('nxEgBanco'),
      referencia: val('nxEgRef'),
      nota: val('nxEgNota'),
      fecha: val('nxEgFecha') || new Date().toISOString().slice(0, 10)
    };

    if (!egreso.concepto) { notify('err', 'Falta el concepto', 'Describe el egreso'); return; }
    if (!(egreso.monto > 0)) { notify('err', 'Monto inválido', 'El monto debe ser mayor que 0'); return; }

    const api = getAPI();
    if (!api) { notify('err', 'API no disponible', ''); return; }

    try {
      if (id) {
        await api.patch('egresos', `id=eq.${id}`, egreso);
        await actualizarAsientoEgreso({ ...egreso, id });   // actualiza su apunte contable
      } else {
        egreso.created_by = usuarioActual();
        const res = await api.post('egresos', egreso);
        const nuevo = Array.isArray(res) ? res[0] : res;
        await crearAsientoEgreso({ ...egreso, id: nuevo?.id }); // crea su apunte contable
      }
      await sincronizarContabilidad();                         // refresca el Estado de Resultados
      document.getElementById('nxFormEgreso')?.classList.remove('open');
      await cargarEgresos();
      const mp = document.getElementById('nxModalContab');
      if (mp) renderModal(mp);
      notify('ok', 'Egreso guardado', 'También se registró en tu contabilidad');
    } catch (err) {
      console.error('Error guardando egreso:', err);
      notify('err', 'No se pudo guardar', err.message || '');
    }
  };

  window.nxEditarEgreso = function (id) { window.nxAbrirFormEgreso(id); };

  window.nxEliminarEgreso = async function (id) {
    if (!esAdmin()) return;
    const ok = (typeof window.nxConfirm === 'function')
      ? await window.nxConfirm('¿Eliminar este egreso?', 'Esta acción no se puede deshacer.', { ok: 'Sí, eliminar', tipo: 'danger' })
      : window.confirm('¿Eliminar este egreso?');
    if (!ok) return;
    const api = getAPI();
    if (!api?.del) return;
    try {
      await api.del('egresos', `id=eq.${id}`);
      await borrarAsientoEgreso(id);      // borra también su apunte contable
      await sincronizarContabilidad();    // refresca el Estado de Resultados
      await cargarEgresos();
      const mp = document.getElementById('nxModalContab');
      if (mp) renderModal(mp);
      notify('ok', 'Egreso eliminado', '');
    } catch (err) {
      notify('err', 'No se pudo eliminar', err.message || '');
    }
  };

  // ═══ BOTÓN EN DASHBOARD (solo admin) ═══
  function inyectarBoton() {
    if (document.getElementById('qaContab')) return true;
    if (!esAdmin()) return true; // no es admin: no inyectar, pero detener reintentos
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    const qaExistente = vDash.querySelector('.qa');
    if (!qaExistente) return false;
    const qaGrid = qaExistente.parentElement;
    if (!qaGrid) return false;

    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaContab';
    btn.setAttribute('onclick', 'window.nxAbrirContabilidad && window.nxAbrirContabilidad()');
    btn.innerHTML = `
      <span class="qa-i"><i class="ti ti-calculator"></i></span>
      <div class="qa-l">Contabilidad</div>
    `;
    qaGrid.appendChild(btn);
    return true;
  }

  // ═══ INIT ═══
  function init() {
    instalarCicloContable(); // aplica el ciclo 20→20 al Estado de Resultados formal
    let intentos = 0;
    const tryInit = function () {
      intentos++;
      if (inyectarBoton()) return;
      if (intentos < 80) setTimeout(tryInit, 150);
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
   NEXUS PRO - AVISO: CLIENTES CON FACTURA PENDIENTE DE MESES ANTERIORES
   ────────────────────────────────────────────────────────────────
   Botón dentro de la sección FACTURAS que abre una lista de los
   clientes que cerraron meses anteriores con su factura sin pagar
   (estado Pendiente o Parcial y de un período más viejo que el último).
   Muestra cliente, períodos que debe, monto pendiente y botón WhatsApp.
   Todo en parches.js. No se toca index.html.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_FACT_PENDIENTES_PREV__) return;
  window.__NEXUS_FACT_PENDIENTES_PREV__ = true;

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function getST() { try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); } catch (e) { return window.ST || {}; } }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function fmt(n) { return 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function notify(t, ti, m) { if (typeof window.toast === 'function') window.toast(t, ti, m || ''); }

  function periodoNum(f) { return (Number(f.anio) || 0) * 12 + (Number(f.mes) || 0); }
  function periodoLabel(f) {
    if (f.mes && f.anio) return (MESES[Number(f.mes) - 1] || '') + ' ' + f.anio;
    return f.periodo || '—';
  }
  function esPendiente(f) {
    const e = String(f.estado || '').toLowerCase();
    return e === 'pendiente' || e === 'parcial';
  }

  // Número de WhatsApp en formato internacional (RD = 1 + 10 dígitos)
  function waNumero(cli) {
    let d = String(cli?.wa || cli?.tel || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 10) d = '1' + d;       // 809/829/849 → 1809...
    return d;
  }

  // ═══ ABRIR LISTA ═══
  window.nxAbrirPendientesPrev = async function () {
    const ST_ = getST();
    const facturas = Array.isArray(ST_.facturas) ? ST_.facturas : [];
    const clientes = Array.isArray(ST_.clientes) ? ST_.clientes : [];
    const agentes = Array.isArray(ST_.agentes) ? ST_.agentes : [];

    let modal = document.getElementById('nxModalPendPrev');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'overlay';
      modal.id = 'nxModalPendPrev';
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
      document.body.appendChild(modal);
    }
    modal.innerHTML = '<div class="modal" style="max-width:600px"><div style="padding:40px;text-align:center;color:#64748b"><div class="spin"></div><div style="margin-top:10px;font-weight:600">Revisando facturas...</div></div></div>';
    modal.classList.add('open');

    // Cobros aplicados a cada factura (para descontar lo ya pagado)
    let pagadoPorFactura = {};
    try {
      const abonos = await getAPI().get('abonos', 'select=factura_id,monto,estado') || [];
      abonos.forEach(a => {
        if (!a.factura_id) return;
        const est = String(a.estado || 'ACTIVO').toUpperCase();
        if (est === 'ANULADO' || est === 'ELIMINADO' || est === 'INACTIVO') return;
        pagadoPorFactura[a.factura_id] = (pagadoPorFactura[a.factura_id] || 0) + Number(a.monto || 0);
      });
    } catch (e) { console.warn('No se pudieron cargar abonos:', e); }

    const pendienteDe = f => Math.max(0, Number(f.total || 0) - (pagadoPorFactura[f.id] || 0));

    // "Mes actual" = mes de calendario de hoy. Todo mes anterior a hoy que siga
    // pendiente cuenta como atraso de meses anteriores.
    const hoy = new Date();
    const periodoActual = hoy.getFullYear() * 12 + (hoy.getMonth() + 1);

    // Facturas pendientes de meses ANTERIORES al mes actual
    const atrasadas = facturas.filter(f => esPendiente(f) && periodoNum(f) > 0 && periodoNum(f) < periodoActual && pendienteDe(f) > 0);

    // Agrupar por cliente
    const porCliente = {};
    atrasadas.forEach(f => {
      const cid = String(f.cliente_id || f.cliente_nom || 'sin');
      if (!porCliente[cid]) {
        const cli = clientes.find(c => String(c.id) === String(f.cliente_id)) || { nom: f.cliente_nom };
        const ag = agentes.find(a => String(a.id) === String(cli.agente_id));
        porCliente[cid] = { cli, agente: ag?.nom || '—', total: 0, periodos: [] };
      }
      porCliente[cid].total += pendienteDe(f);
      porCliente[cid].periodos.push({ label: periodoLabel(f), num: periodoNum(f), monto: pendienteDe(f) });
    });

    const lista = Object.values(porCliente).sort((a, b) => b.total - a.total);
    const totalGeneral = lista.reduce((s, x) => s + x.total, 0);

    renderPendPrev(modal, lista, totalGeneral);
  };

  function renderPendPrev(modal, lista, totalGeneral) {
    const filas = lista.length === 0
      ? '<div style="text-align:center;padding:40px 20px;color:#10b981;font-size:14px;font-weight:600">✓ ¡Todo al día!<br><span style="color:#94a3b8;font-weight:400;font-size:12px">Ningún cliente debe facturas de meses anteriores.</span></div>'
      : lista.map((x, i) => {
          const cli = x.cli || {};
          const chips = x.periodos.sort((a, b) => a.num - b.num)
            .map(p => `<span style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;margin:2px 3px 0 0">${esc(p.label)} · ${fmt(p.monto)}</span>`).join('');
          const num = waNumero(cli);
          const idSafe = esc(String(cli.id || i));
          const cid = cli.id ? esc(String(cli.id)) : '';
          const nomData = esc((cli.nom || '').toLowerCase());
          return `
            <div class="nxPendCard" data-nom="${nomData}" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:9px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:38px;height:38px;border-radius:10px;background:#fee2e2;color:#dc2626;display:grid;place-items:center;font-weight:900;flex-shrink:0">${esc((cli.nom || '?').trim().charAt(0).toUpperCase())}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;color:#0f172a;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(cli.nom || 'Cliente')}</div>
                  <div style="font-size:11px;color:#64748b">Agente: ${esc(x.agente)} · ${x.periodos.length} factura(s)</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-weight:900;color:#dc2626;font-size:15px;white-space:nowrap">${fmt(x.total)}</div>
                  <div style="display:flex;flex-direction:column;gap:4px;margin-top:5px">
                    ${cid ? `<button class="btn bsm" style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;font-weight:800" onclick="window.nxCobrarPend('${cid}')"><i class="ti ti-wallet"></i> Cobrar</button>` : ''}
                    ${num ? `<button class="btn bsm" style="background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:none;font-weight:800" onclick="window.nxRecordarPago('${idSafe}','${num}',${x.total})"><i class="ti ti-brand-whatsapp"></i> Recordar</button>` : '<span style="font-size:9px;color:#cbd5e1">Sin WhatsApp</span>'}
                  </div>
                </div>
              </div>
              <div style="margin-top:8px">${chips}</div>
            </div>`;
        }).join('');

    modal.innerHTML = `
      <div class="modal" style="max-width:600px;max-height:82vh;display:flex;flex-direction:column;margin-bottom:80px">
        <div class="mt" style="display:flex;align-items:center;gap:8px">
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalPendPrev').classList.remove('open')" title="Volver"><i class="ti ti-arrow-left"></i></button>
          <span style="flex:1;text-align:center"><i class="ti ti-alert-triangle"></i> PENDIENTES DE MESES ANTERIORES</span>
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxModalPendPrev').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>
        ${lista.length ? `<div style="background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fecaca;border-radius:12px;padding:12px;text-align:center;margin:6px 2px 10px">
          <div style="font-size:10px;font-weight:800;color:#b91c1c;letter-spacing:.4px">TOTAL POR COBRAR DE MESES ANTERIORES</div>
          <div style="font-size:22px;font-weight:900;color:#991b1b;margin-top:2px">${fmt(totalGeneral)}</div>
          <div style="font-size:10px;color:#ef4444;font-weight:600">${lista.length} cliente(s) con atraso</div>
        </div>` : ''}
        ${lista.length ? `<div style="position:relative;margin:0 2px 10px">
          <i class="ti ti-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:15px;pointer-events:none"></i>
          <input type="text" id="nxPendBuscar" placeholder="Buscar cliente..." autocomplete="off" oninput="window.nxFiltrarPend(this.value)" style="width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b">
        </div>` : ''}
        <div style="overflow-y:auto;flex:1;padding:2px 2px;-webkit-overflow-scrolling:touch">
          ${filas}
        </div>
      </div>`;
  }

  // Filtrar la lista de pendientes por nombre de cliente
  window.nxFiltrarPend = function (q) {
    const t = String(q || '').trim().toLowerCase();
    document.querySelectorAll('#nxModalPendPrev .nxPendCard').forEach(c => {
      const nom = c.getAttribute('data-nom') || '';
      c.style.display = (!t || nom.includes(t)) ? '' : 'none';
    });
  };

  // Cobrar: abre el modal de cobro/abono del cliente (reusa la función del sistema)
  window.nxCobrarPend = function (clienteId) {
    const modal = document.getElementById('nxModalPendPrev');
    if (modal) modal.classList.remove('open'); // cerrar para no encimar ventanas
    try {
      if (typeof window.abrirAbono === 'function') { window.abrirAbono(clienteId); return; }
      if (typeof abrirAbono === 'function') { abrirAbono(clienteId); return; }
    } catch (e) {}
    notify('err', 'No se pudo abrir el cobro', '');
  };

  // Abrir WhatsApp con un recordatorio de pago
  window.nxRecordarPago = function (clienteId, numero, monto) {
    const ST_ = getST();
    const cli = (Array.isArray(ST_.clientes) ? ST_.clientes : []).find(c => String(c.id) === String(clienteId));
    const nom = cli?.nom ? cli.nom.split(' ')[0] : '';
    const msg = `Hola ${nom}, le saludamos de la correduría. Le recordamos que tiene un saldo pendiente de meses anteriores por ${fmt(monto)}. Agradecemos su pago. ¡Gracias!`;
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  // ═══ BOTÓN AL LADO DE LA PESTAÑA "COBROS" ═══
  function inyectarBoton() {
    if (document.getElementById('nxBtnPendPrev')) return true;
    const tabCob = document.getElementById('tabCob');
    if (!tabCob || !tabCob.parentElement) return false;

    const btn = document.createElement('button');
    btn.id = 'nxBtnPendPrev';
    btn.type = 'button';
    btn.style.cssText = 'padding:7px 14px;border-radius:9px;border:none;font-size:12px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;box-shadow:0 2px 8px rgba(220,38,38,.3);transition:all .15s';
    btn.setAttribute('onclick', 'window.nxAbrirPendientesPrev && window.nxAbrirPendientesPrev()');
    btn.innerHTML = '<i class="ti ti-alert-triangle"></i> Pendientes';
    tabCob.insertAdjacentElement('afterend', btn); // queda justo al lado de "Cobros"
    return true;
  }

  function init() {
    let intentos = 0;
    const tryInit = function () {
      intentos++;
      if (inyectarBoton()) return;
      if (intentos < 100) setTimeout(tryInit, 200);
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
   NEXUS PRO - ARREGLO DEL BUSCADOR EN MÓVIL
   ────────────────────────────────────────────────────────────────
   En el celular, el cuadro de búsqueda pequeño de la barra superior
   es difícil de usar. Este parche hace que al tocarlo se abra directo
   la BÚSQUEDA GLOBAL de pantalla completa (clientes, facturas, etc.).
   En PC se deja el comportamiento normal. No se toca index.html.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_FIX_BUSCADOR__) return;
  window.__NEXUS_FIX_BUSCADOR__ = true;

  const esMovil = () => window.innerWidth <= 768;

  // Abre la búsqueda global de forma robusta (con respaldo si la función no está)
  function abrirBusqueda() {
    try {
      if (typeof window.abrirGlobalSearch === 'function') { window.abrirGlobalSearch(); return; }
    } catch (e) {}
    const ov = document.getElementById('gsOverlay');
    if (ov) {
      ov.classList.add('show');
      const inp = document.getElementById('gsInput');
      if (inp) setTimeout(() => { try { inp.focus(); } catch (e) {} }, 120);
    }
  }

  function enlazar() {
    const sr = document.querySelector('.tn-sr');
    if (!sr) return false;
    if (sr.dataset.nxFixBuscador === '1') return true;
    sr.dataset.nxFixBuscador = '1';

    // Tocar el cuadro de búsqueda en móvil → abrir la búsqueda global completa
    sr.addEventListener('click', function (ev) {
      if (!esMovil()) return;
      ev.preventDefault();
      ev.stopPropagation();
      abrirBusqueda();
    }, true);

    // Si el input intenta enfocarse en móvil, mejor abrir la búsqueda completa
    const inp = sr.querySelector('input');
    if (inp) {
      inp.addEventListener('focus', function () {
        if (!esMovil()) return;
        try { inp.blur(); } catch (e) {}
        abrirBusqueda();
      });
    }
    return true;
  }

  function init() {
    let n = 0;
    const t = function () {
      n++;
      if (enlazar()) return;
      if (n < 100) setTimeout(t, 200);
    };
    t();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BUSCADOR EN CADA MÓDULO
   ────────────────────────────────────────────────────────────────
   Agrega una barra de búsqueda a los módulos que mostraban listas
   sin buscador: Facturas, Cobros, Empresas, Agentes, Usuarios y
   Asientos. Filtra las filas/tarjetas al escribir y se vuelve a
   aplicar solo cuando la lista se recarga. No se toca index.html.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_BUSCADOR_MODULOS__) return;
  window.__NEXUS_BUSCADOR_MODULOS__ = true;

  // Módulos a los que se les agrega buscador
  const MODULOS = [
    { key: 'fact',  antesDe: '#panelFact .tw', cont: '#tbFact',  fila: ':scope > tr',  ph: 'Buscar factura o cliente...' },
    { key: 'cob',   antesDe: '#panelCob .tw',  cont: '#tbCob',   fila: ':scope > tr',  ph: 'Buscar cliente...' },
    { key: 'emp',   antesDe: '#empGrd',        cont: '#empGrd',  fila: ':scope > div', ph: 'Buscar empresa...' },
    { key: 'agt',   antesDe: '#v-agentes .tw', cont: '#tbAgt',   fila: ':scope > tr',  ph: 'Buscar agente...' },
    { key: 'usu',   antesDe: '#v-usuarios .tw',cont: '#tbUsu',   fila: ':scope > tr',  ph: 'Buscar usuario...' },
    { key: 'asi',   antesDe: '#asientosC',     cont: '#asientosC', fila: ':scope > .ai', ph: 'Buscar asiento...' }
  ];

  // ¿La fila es un encabezado o un mensaje de "cargando/vacío"? → no se filtra
  function esFijo(r) {
    return r.querySelector && (r.querySelector('th') || r.querySelector('.loading') || r.querySelector('.empty'))
      || (r.classList && (r.classList.contains('empty') || r.classList.contains('loading')));
  }

  function aplicar(cont, filaSel, q) {
    const filas = cont.querySelectorAll(filaSel);
    filas.forEach(r => {
      if (esFijo(r)) { r.style.display = ''; return; }
      const txt = (r.textContent || '').toLowerCase();
      r.style.display = (!q || txt.includes(q)) ? '' : 'none';
    });
  }

  function montar(cfg) {
    if (document.getElementById('nxBus_' + cfg.key)) return true;
    const anchor = document.querySelector(cfg.antesDe);
    const cont = document.querySelector(cfg.cont);
    if (!anchor || !cont || !anchor.parentElement) return false;

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;margin:0 0 10px';
    const ico = document.createElement('i');
    ico.className = 'ti ti-search';
    ico.style.cssText = 'position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:15px;pointer-events:none';
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'nxBus_' + cfg.key;
    inp.placeholder = cfg.ph;
    inp.autocomplete = 'off';
    inp.style.cssText = 'width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b';
    wrap.appendChild(ico);
    wrap.appendChild(inp);
    anchor.parentElement.insertBefore(wrap, anchor);

    inp.addEventListener('input', () => aplicar(cont, cfg.fila, inp.value.trim().toLowerCase()));

    // Re-aplicar el filtro cuando la lista se vuelve a generar
    const obs = new MutationObserver(() => {
      const q = inp.value.trim().toLowerCase();
      if (q) aplicar(cont, cfg.fila, q);
    });
    obs.observe(cont, { childList: true });
    return true;
  }

  function init() {
    let n = 0;
    const t = function () {
      n++;
      let faltan = false;
      MODULOS.forEach(cfg => { if (!montar(cfg)) faltan = true; });
      if (!faltan) return;
      if (n < 120) setTimeout(t, 250);
    };
    t();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BAUCHE / COMPROBANTE DE PAGO
   ────────────────────────────────────────────────────────────────
   Al registrar un cobro/abono permite SUBIR o PEGAR la imagen del
   bauche. Se guarda en el bucket público "comprobantes" de Supabase
   (con la llave de servicio) y se enlaza al abono (y a la entrega
   directa). Se puede VER en Historial de pago y en Solicitudes.
   No se toca index.html.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  if (window.__NEXUS_BAUCHE_V1__) return;
  window.__NEXUS_BAUCHE_V1__ = true;

  const BUCKET = 'comprobantes';
  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function notify(t, ti, m) { if (typeof window.toast === 'function') window.toast(t, ti, m || ''); }
  function ultimoAbonoRef() { try { return (typeof _ultimoAbono !== 'undefined') ? _ultimoAbono : window._ultimoAbono; } catch (e) { return window._ultimoAbono; } }

  window._nxBaucheURL = null;
  let _subiendo = false;

  // ════ VISOR DEL BAUCHE ════
  window.nxVerComprobante = function (url) {
    if (!url) return;
    let ov = document.getElementById('nxVisorBauche');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'overlay';
      ov.id = 'nxVisorBauche';
      ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
      document.body.appendChild(ov);
    }
    const esPdf = /\.pdf($|\?)/i.test(url);
    ov.innerHTML = `
      <div class="modal" style="max-width:520px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt" style="display:flex;align-items:center;gap:8px">
          <span style="flex:1;text-align:center"><i class="ti ti-photo"></i> BAUCHE / COMPROBANTE</span>
          <button class="btn bghost bsm" type="button" onclick="document.getElementById('nxVisorBauche').classList.remove('open')"><i class="ti ti-x"></i></button>
        </div>
        <div style="flex:1;overflow:auto;text-align:center;padding:6px">
          ${esPdf
            ? `<iframe src="${url}" style="width:100%;height:60vh;border:none;border-radius:8px"></iframe>`
            : `<img src="${url}" style="max-width:100%;border-radius:10px" alt="bauche">`}
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <a class="btn bxl bc1" href="${url}" target="_blank" rel="noopener" style="text-decoration:none"><i class="ti ti-external-link"></i> Abrir / Descargar</a>
        </div>
      </div>`;
    ov.classList.add('open');
  };

  // ════ SUBIR LA IMAGEN AL BUCKET ════
  async function subirBauche(file) {
    const api = getAPI();
    if (!api || !api.url || !api.key) throw new Error('Sin conexión');
    let ext = '';
    if (file.name && file.name.includes('.')) ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext) ext = (file.type && file.type.includes('png')) ? 'png' : (file.type && file.type.includes('pdf')) ? 'pdf' : 'jpg';
    const cid = (typeof abonoCliId !== 'undefined' ? abonoCliId : window.abonoCliId) || 'sin';
    const path = `abonos/${cid}/${Date.now()}.${ext}`;
    const fd = new FormData();
    fd.append('', file, 'bauche.' + ext);
    const headers = { 'apikey': api.key, 'Authorization': 'Bearer ' + api.key };
    let resp = await fetch(`${api.url}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers, body: fd });
    if (!resp.ok && resp.status === 400) {
      resp = await fetch(`${api.url}/storage/v1/object/${BUCKET}/${path}`, { method: 'PUT', headers, body: fd });
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + (await resp.text()).slice(0, 120));
    return `${api.url}/storage/v1/object/public/${BUCKET}/${path}`;
  }

  async function procesarArchivo(file) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/pdf$/i.test(file.type || '')) { notify('err', 'Archivo no válido', 'Sube una imagen o PDF'); return; }
    if (_subiendo) return;
    _subiendo = true;
    let prevUrl = '';
    try { prevUrl = URL.createObjectURL(file); } catch (e) {}
    pintarEstado('subiendo', prevUrl);
    try {
      const url = await subirBauche(file);
      window._nxBaucheURL = url;
      pintarEstado('listo', url);
      notify('ok', 'Bauche cargado', '');
    } catch (e) {
      window._nxBaucheURL = null;
      pintarEstado('error', null);
      notify('err', 'No se pudo subir el bauche', (e.message || '').slice(0, 80));
    }
    _subiendo = false;
  }

  // Pegar la imagen copiada (p. ej. desde WhatsApp) usando el portapapeles
  window.nxPegarBauche = async function () {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        notify('err', 'Pegar no disponible', 'Usa "Foto / archivo" para subir la imagen');
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const tipo = (item.types || []).find(t => t.indexOf('image/') === 0);
        if (tipo) {
          const blob = await item.getType(tipo);
          const ext = (tipo.split('/')[1] || 'png').replace(/[^a-z0-9]/g, '');
          const file = new File([blob], 'bauche.' + ext, { type: tipo });
          procesarArchivo(file);
          return;
        }
      }
      notify('err', 'No hay imagen copiada', 'Copia el bauche primero y vuelve a tocar "Pegar"');
    } catch (e) {
      notify('err', 'No se pudo pegar', 'Permite el acceso al portapapeles o usa "Foto / archivo"');
    }
  };

  function pintarEstado(estado, src) {
    const box = document.getElementById('nxBaucheBox');
    const prev = document.getElementById('nxBauchePreview');
    if (!box || !prev) return;
    if (estado === 'vacio') { box.style.display = 'block'; prev.style.display = 'none'; prev.innerHTML = ''; return; }
    box.style.display = 'none';
    prev.style.display = 'flex';
    if (estado === 'subiendo') {
      prev.innerHTML = `<div style="display:flex;align-items:center;gap:10px;width:100%"><img src="${src}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0"><div style="flex:1"><div style="font-size:11px;font-weight:700;color:#475569">Subiendo bauche...</div></div><div class="spin"></div></div>`;
    } else if (estado === 'listo') {
      prev.innerHTML = `<div style="display:flex;align-items:center;gap:10px;width:100%"><img src="${src}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer" onclick="window.nxVerComprobante('${src}')"><div style="flex:1"><div style="font-size:11px;font-weight:800;color:#059669"><i class="ti ti-check"></i> Bauche listo</div><div style="font-size:9px;color:#94a3b8">Toca la imagen para verla</div></div><button type="button" class="btn bsm bghost" style="color:#dc2626" onclick="window.nxQuitarBauche()"><i class="ti ti-trash"></i></button></div>`;
    } else if (estado === 'error') {
      prev.innerHTML = `<div style="display:flex;align-items:center;gap:10px;width:100%"><div style="flex:1;font-size:11px;font-weight:700;color:#dc2626"><i class="ti ti-alert-triangle"></i> No se pudo subir</div><button type="button" class="btn bsm bghost" onclick="window.nxQuitarBauche()">Reintentar</button></div>`;
    }
  }

  window.nxQuitarBauche = function () {
    window._nxBaucheURL = null;
    const inp = document.getElementById('nxBaucheInput');
    if (inp) inp.value = '';
    pintarEstado('vacio');
  };

  // ════ INYECTAR EL CARGADOR EN EL MODAL #mAbono ════
  function inyectarCargador() {
    if (document.getElementById('nxBaucheWrap')) return true;
    const modal = document.getElementById('mAbono');
    if (!modal) return false;
    const fe = modal.querySelector('.fe');
    if (!fe || !fe.parentElement) return false;

    const wrap = document.createElement('div');
    wrap.id = 'nxBaucheWrap';
    wrap.style.cssText = 'margin:10px 0';
    wrap.innerHTML = `
      <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px">Bauche / comprobante (opcional)</label>
      <div id="nxBaucheBox" style="border:1.5px dashed #cbd5e1;border-radius:10px;padding:10px;background:#f8fafc">
        <div style="display:flex;gap:8px">
          <button type="button" class="btn bsm" style="flex:1;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;font-weight:800" onclick="document.getElementById('nxBaucheInput').click()"><i class="ti ti-camera"></i> Foto / archivo</button>
          <button type="button" class="btn bsm" style="flex:1;background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;font-weight:800" onclick="window.nxPegarBauche()"><i class="ti ti-clipboard"></i> Pegar</button>
        </div>
        <div style="font-size:9.5px;color:#94a3b8;margin-top:6px;text-align:center">Copia el bauche en WhatsApp y toca <strong>"Pegar"</strong></div>
      </div>
      <div id="nxBauchePreview" style="display:none;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff"></div>
      <input type="file" id="nxBaucheInput" accept="image/*,.pdf" style="display:none">
    `;
    fe.parentElement.insertBefore(wrap, fe);

    const inp = wrap.querySelector('#nxBaucheInput');
    inp.addEventListener('change', function () { if (this.files && this.files[0]) procesarArchivo(this.files[0]); });
    return true;
  }

  // Pegar imagen del portapapeles mientras el modal de abono está abierto
  document.addEventListener('paste', function (ev) {
    const modal = document.getElementById('mAbono');
    if (!modal || !modal.classList.contains('open')) return;
    const items = (ev.clipboardData || window.clipboardData) && (ev.clipboardData || window.clipboardData).items;
    if (!items) return;
    for (const it of items) {
      if (it.type && it.type.indexOf('image') !== -1) {
        const file = it.getAsFile();
        if (file) { ev.preventDefault(); procesarArchivo(file); break; }
      }
    }
  });

  // Resetear el cargador cada vez que se abre el modal de abono
  function envolverAbrirAbono() {
    if (window.__nxAbrirAbonoBauche) return true;
    if (typeof window.abrirAbono !== 'function') return false;
    window.__nxAbrirAbonoBauche = true;
    const orig = window.abrirAbono;
    window.abrirAbono = function () {
      const r = orig.apply(this, arguments);
      window._nxBaucheURL = null;
      setTimeout(() => { inyectarCargador(); const inp = document.getElementById('nxBaucheInput'); if (inp) inp.value = ''; pintarEstado('vacio'); }, 60);
      return r;
    };
    return true;
  }

  // ════ ENLAZAR LA URL DEL BAUCHE AL ABONO (y a la entrega directa) ════
  function envolverRegAbono() {
    if (window.__nxRegAbonoBauche) return true;
    if (typeof window.regAbono !== 'function') return false;
    window.__nxRegAbonoBauche = true;
    const orig = window.regAbono;
    window.regAbono = async function () {
      const url = window._nxBaucheURL || null;
      const cid = (typeof abonoCliId !== 'undefined' ? abonoCliId : window.abonoCliId) || null;
      const before = ultimoAbonoRef();
      const r = await orig.apply(this, arguments);
      const after = ultimoAbonoRef();
      const exito = after && after !== before;
      if (url && exito && cid) {
        const api = getAPI();
        try {
          const ab = await api.get('abonos', `cliente_id=eq.${cid}&order=created_at.desc&limit=1`);
          if (ab && ab[0]) await api.patch('abonos', `id=eq.${ab[0].id}`, { comprobante_url: url });
        } catch (e) { console.warn('No se pudo enlazar bauche al abono:', e); }
        try {
          const ent = await api.get('entregas_admin', `cobro_id=eq.${cid}&order=created_at.desc&limit=1`);
          if (ent && ent[0] && !ent[0].comprobante_url) {
            const edad = Date.now() - new Date(ent[0].created_at).getTime();
            if (edad < 90000) await api.patch('entregas_admin', `id=eq.${ent[0].id}`, { comprobante_url: url });
          }
        } catch (e) {}
        window._nxBaucheURL = null;
      }
      return r;
    };
    return true;
  }

  function init() {
    let n = 0;
    const t = function () {
      n++;
      const a = inyectarCargador();
      const b = envolverAbrirAbono();
      const c = (window.__regAbonoEnvuelto || n > 12) ? envolverRegAbono() : false;
      if (a && b && c) return;
      if (n < 120) setTimeout(t, 250);
    };
    t();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - CUADRE TSS (comparar clientes del sistema vs archivo TSS)
   ────────────────────────────────────────────────────────────────
   Ventana (solo admin) para importar un Excel/CSV de la TSS y compararlo,
   por CÉDULA, con los clientes de una EMPRESA del sistema. Alerta:
   • Clientes del sistema que NO están en el archivo (faltan en TSS).
   • Personas del archivo que NO están en el sistema (extras).
   Lee .xlsx/.xls/.csv (carga SheetJS bajo demanda). No toca index.html.
   ════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (window.__NEXUS_CUADRE_TSS__) return;
  window.__NEXUS_CUADRE_TSS__ = true;

  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function getST() { try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); } catch (e) { return window.ST || {}; } }
  function esAdmin() {
    try { return (typeof sesion !== 'undefined') && sesion?.rol === 'admin'; }
    catch (e) { try { return window.sesion?.rol === 'admin'; } catch (_) { return false; } }
  }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function normCedula(x) { return String(x ?? '').replace(/\D/g, ''); }
  function fmtCed(x) { const d = normCedula(x); return d.length === 11 ? `${d.slice(0,3)}-${d.slice(3,10)}-${d.slice(10)}` : (d || '—'); }

  // Estado del módulo
  let _modo = 'cedula'; // 'cedula' (TSS/Excel) | 'nombre' (PDF Humano)
  let _rows = [];      // filas de datos (arrays)
  let _header = [];    // encabezados (array)
  let _colCed = -1;
  let _colNom = -1;
  let _titulares = []; // PDF Humano: nombres de titulares (sin dependientes)
  let _depCount = 0;   // PDF Humano: cantidad de dependientes ignorados

  // --- Helpers para match por NOMBRE (cuando no hay cédula, ej. Humano) ---
  function quitaAcentos(s) { return String(s ?? '').normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'), ''); }
  function tokensNom(s) {
    return quitaAcentos(s).replace(/[^A-Za-zñÑ\s]/g, ' ').toUpperCase()
      .split(/\s+/).filter(t => t.length > 1);
  }
  // 2 = coincide fuerte (igual o uno contenido en el otro) · 1 = dudoso (≥2 tokens en común) · 0 = no
  function tierNombre(aTok, bTok) {
    if (!aTok.length || !bTok.length) return 0;
    const A = new Set(aTok), B = new Set(bTok);
    let inter = 0; A.forEach(t => { if (B.has(t)) inter++; });
    const subA = aTok.every(t => B.has(t));
    const subB = bTok.every(t => A.has(t));
    if (subA || subB) return 2;
    if (inter >= 2) return 1;
    return 0;
  }

  // Carga SheetJS (lector de Excel) bajo demanda
  function cargarSheetJS() {
    return new Promise((resolve, reject) => {
      if (window.XLSX) return resolve(window.XLSX);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('No cargó el lector'));
      s.onerror = () => reject(new Error('No se pudo descargar el lector de Excel'));
      document.head.appendChild(s);
    });
  }

  function detectarColumnas(header, rows) {
    let colCed = -1, colNom = -1;
    header.forEach((h, i) => {
      const t = String(h).toLowerCase();
      if (colCed < 0 && /c[eé]dula|documento|identificaci|nss|seguro|cedula/.test(t)) colCed = i;
      if (colNom < 0 && /nombre|empleado|trabajador|afiliado|raz[oó]n|apellido/.test(t)) colNom = i;
    });
    // Si no detectó cédula por título, buscar por patrón (columna con muchos números de 9-11 dígitos)
    if (colCed < 0 && header.length) {
      for (let i = 0; i < header.length; i++) {
        let hits = 0, tot = 0;
        rows.slice(0, 25).forEach(r => { const v = normCedula(r[i]); if (v) { tot++; if (v.length >= 9 && v.length <= 11) hits++; } });
        if (tot > 0 && hits / tot > 0.6) { colCed = i; break; }
      }
    }
    if (colNom < 0) colNom = colCed >= 0 ? (colCed === 0 ? 1 : 0) : 0;
    if (colCed < 0) colCed = 0;
    return { colCed, colNom };
  }

  function setArea(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

  // Lee el archivo como ArrayBuffer de forma robusta: intenta file.arrayBuffer()
  // y, si falla (archivo bloqueado por Excel, OneDrive, etc.), reintenta con FileReader.
  function leerBuffer(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error || new Error('NotReadable'));
      try { fr.readAsArrayBuffer(file); } catch (e) { reject(e); }
    });
  }
  async function leerBufferRobusto(file) {
    try { return await file.arrayBuffer(); }
    catch (e1) { return await leerBuffer(file); }
  }

  // Convierte un ArrayBuffer en una matriz (array de filas). Soporta:
  //  - Tabla HTML disfrazada de .xls (caso típico TSS, suele venir en UTF-16)
  //  - Excel real (.xlsx/.xls) y CSV (vía SheetJS)
  async function obtenerMatriz(buf) {
    const bytes = new Uint8Array(buf);
    let texto;
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) texto = new TextDecoder('utf-16le').decode(buf);
    else if (bytes[0] === 0xFE && bytes[1] === 0xFF) texto = new TextDecoder('utf-16be').decode(buf);
    else texto = new TextDecoder('utf-8').decode(buf);

    if (/<\s*(table|tr)[\s>]/i.test(texto)) {
      const doc = new DOMParser().parseFromString(texto, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      const matrix = trs.map(tr => Array.from(tr.querySelectorAll('td,th')).map(td => (td.textContent || '').replace(/\s+/g, ' ').trim()));
      if (matrix.length) return matrix;
    }
    const XLSX = await cargarSheetJS();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  }

  // --- Lector de PDF (factura Humano) sin dependencias externas ---
  function bytesALatin1(u8) {
    let r = ''; const CH = 0x8000;
    for (let i = 0; i < u8.length; i += CH) r += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
    return r;
  }
  async function inflar(u8) {
    for (const fmt of ['deflate', 'deflate-raw']) {
      try {
        const ds = new DecompressionStream(fmt);
        const ab = await new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer();
        return new Uint8Array(ab);
      } catch (e) { /* probar siguiente */ }
    }
    return null;
  }
  // Extrae el texto de un PDF: descomprime streams Flate y junta las cadenas (...) de los operadores Tj/TJ
  async function pdfATexto(buf) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Tu navegador no soporta leer PDF (actualízalo).');
    const u8 = new Uint8Array(buf);
    const lat = bytesALatin1(u8);
    const chunks = [];
    const re = /stream\r?\n/g; let m;
    while ((m = re.exec(lat))) {
      const start = m.index + m[0].length;
      let end = lat.indexOf('endstream', start);
      if (end < 0) continue;
      while (end > start && (u8[end - 1] === 0x0A || u8[end - 1] === 0x0D)) end--;
      const inf = await inflar(u8.slice(start, end));
      if (!inf) continue;
      const ds = bytesALatin1(inf);
      const txt = [];
      const tre = /\((?:[^()\\]|\\.)*\)/g; let tm;
      while ((tm = tre.exec(ds))) txt.push(tm[0].slice(1, -1).replace(/\\([()\\])/g, '$1'));
      if (txt.length) chunks.push(txt.join(' '));
    }
    return chunks.join(' ').replace(/\s+/g, ' ');
  }
  // Separa titulares (código -000) de dependientes en el detalle de la factura Humano
  function parsearHumano(texto) {
    const planSet = new Set();
    let pm; const pre = /Total\s+Plan\s+([A-Za-zñÑ]+)/g;
    while ((pm = pre.exec(texto))) planSet.add(quitaAcentos(pm[1]).toUpperCase());
    const re = /([A-ZÑ][A-ZÑ ,]+?)\s+(\d{1,3})\s+(\d{6,7})-(\d{3})\s+[A-ZÑ]+/g;
    const titMap = new Map(); const deps = [];
    let m;
    while ((m = re.exec(texto))) {
      let nom = m[1].replace(/\s+/g, ' ').trim();
      const toks = nom.split(' ');
      if (toks.length > 1 && planSet.has(quitaAcentos(toks[0]).toUpperCase())) nom = toks.slice(1).join(' ');
      nom = nom.replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
      if (m[4] === '000') {
        const k = tokensNom(nom).slice().sort().join(' ');
        if (k && !titMap.has(k)) titMap.set(k, nom);
      } else deps.push(nom);
    }
    return { titulares: Array.from(titMap.values()), dependientes: deps };
  }

  async function onArchivo(file) {
    if (!file) return;
    setArea('nxTssResultado', '<div style="text-align:center;padding:24px;color:#64748b"><div class="spin"></div><div style="margin-top:8px">Leyendo archivo...</div></div>');
    setArea('nxTssMapeo', '');
    _rows = []; _titulares = []; _depCount = 0;
    let buf;
    try {
      buf = await leerBufferRobusto(file);
    } catch (e) {
      setArea('nxTssResultado', '<div style="color:#dc2626;padding:16px;text-align:center;font-size:13px">⚠️ No se pudo leer el archivo.<br><span style="font-size:12px;color:#64748b">Si está <b>abierto en Excel</b> u otro programa, ciérralo y vuelve a intentarlo.<br>Si está en <b>OneDrive/Drive</b>, descárgalo primero a tu PC.</span></div>');
      return;
    }
    try {
      const u8 = new Uint8Array(buf.slice(0, 5));
      const esPDF = (file.name || '').toLowerCase().endsWith('.pdf') ||
        (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46); // %PDF
      if (esPDF) {
        _modo = 'nombre';
        const texto = await pdfATexto(buf);
        const { titulares, dependientes } = parsearHumano(texto);
        _titulares = titulares; _depCount = dependientes.length;
        if (!titulares.length) {
          setArea('nxTssResultado', '<div style="color:#dc2626;padding:16px;text-align:center">No encontré titulares en el PDF.<br><span style="font-size:11px;color:#94a3b8">¿Es una factura de plan voluntario de Humano?</span></div>');
          return;
        }
        renderInfoPDF();
        comparar();
        return;
      }
      _modo = 'cedula';
      const matrix = await obtenerMatriz(buf);
      let headerIdx = matrix.findIndex(row => row.some(c => /c[eé]dula|nombre|documento|empleado|trabajador|afiliado|cedula|nss/i.test(String(c))));
      if (headerIdx < 0) headerIdx = 0;
      _header = (matrix[headerIdx] || []).map(h => String(h || '').trim());
      _rows = matrix.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim() !== ''));
      const det = detectarColumnas(_header, _rows);
      _colCed = det.colCed; _colNom = det.colNom;
      renderMapeo();
      comparar();
    } catch (e) {
      const txt = String(e?.name || '') + ' ' + String(e?.message || '');
      const bloqueo = /NotReadable|could not be read|permission/i.test(txt);
      const detalle = bloqueo
        ? 'Si está <b>abierto en Excel</b> u otro programa, ciérralo y vuelve a intentarlo.<br>Si está en <b>OneDrive/Drive</b>, descárgalo primero a tu PC.'
        : esc(e?.message || '');
      setArea('nxTssResultado', `<div style="color:#dc2626;padding:16px;text-align:center;font-size:13px">⚠️ No se pudo leer el archivo.<br><span style="font-size:12px;color:#64748b">${detalle}</span></div>`);
    }
  }

  function renderInfoPDF() {
    setArea('nxTssMapeo', `
      <div style="display:flex;gap:8px;margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;font-size:12px;color:#1e40af">
        <i class="ti ti-file-text" style="font-size:16px"></i>
        <div>PDF de Humano detectado · <b>${_titulares.length} titulares</b> · ${_depCount} dependientes ignorados.
        <div style="font-size:10px;color:#64748b;margin-top:2px">Sin cédula en el PDF → la comparación es <b>por nombre</b>.</div></div>
      </div>`);
  }

  // Convierte texto pegado (de Excel, CSV, o una lista) en una matriz de filas
  function matrizDeTexto(txt) {
    const lines = txt.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
    return lines.map(l => {
      if (l.indexOf('\t') >= 0) return l.split('\t').map(c => c.trim());
      if (l.indexOf(';') >= 0) return l.split(';').map(c => c.trim());
      // Coma: solo separar si hay una cédula (dígitos largos) en la línea (CSV);
      // así los nombres "APELLIDOS, NOMBRES" no se parten.
      if (/\d{5,}/.test(l) && l.indexOf(',') >= 0) return l.split(',').map(c => c.trim());
      return [l.trim()];
    });
  }

  // Compara a partir de lo PEGADO en el textarea (detecta cédulas → por cédula; si no → por nombre)
  function compararPegado() {
    const txt = document.getElementById('nxTssPegar')?.value || '';
    if (!txt.trim()) { _rows = []; _titulares = []; _modo = 'cedula'; setArea('nxTssMapeo', ''); comparar(); return; }
    const matrix = matrizDeTexto(txt);
    let headerIdx = matrix.findIndex(row => row.some(c => /c[eé]dula|nombre|documento|empleado|afiliado|nss/i.test(String(c))));
    let header, dataRows;
    if (headerIdx >= 0) { header = matrix[headerIdx].map(h => String(h || '').trim()); dataRows = matrix.slice(headerIdx + 1); }
    else { const w = Math.max(1, ...matrix.map(r => r.length)); header = Array.from({ length: w }, (_, i) => 'Columna ' + (i + 1)); dataRows = matrix; }
    dataRows = dataRows.filter(r => r.some(c => String(c).trim() !== ''));
    const det = detectarColumnas(header, dataRows);
    const hayCed = dataRows.some(r => normCedula(r[det.colCed]).length >= 9);
    if (hayCed) {
      _modo = 'cedula'; _header = header; _rows = dataRows; _colCed = det.colCed; _colNom = det.colNom; _titulares = [];
      renderMapeo();
    } else {
      _modo = 'nombre'; _rows = []; _depCount = 0;
      _titulares = dataRows.map(r => r.slice().sort((a, b) => String(b).replace(/[^A-Za-zñÑ]/g, '').length - String(a).replace(/[^A-Za-zñÑ]/g, '').length)[0]).map(s => String(s || '').trim()).filter(Boolean);
      setArea('nxTssMapeo', `<div style="margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;font-size:12px;color:#1e40af">Pegaste <b>${_titulares.length} nombres</b> (sin cédula) → comparo <b>por nombre</b>.</div>`);
    }
    comparar();
  }
  window.nxTssPegar = compararPegado;

  // Pegar un ARCHIVO copiado (PDF/Excel) usando la API moderna del portapapeles
  window.nxTssPegarArchivo = async function () {
    const aviso = (txt, color) => setArea('nxTssResultado', `<div style="color:${color || '#dc2626'};padding:16px;text-align:center;font-size:13px">${txt}</div>`);
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        aviso('Tu navegador no permite pegar archivos. Usa <b>"Seleccionar archivo"</b> para el PDF.'); return;
      }
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const tipo = (it.types || []).find(t => /pdf|sheet|excel|csv|officedocument|octet-stream/i.test(t));
        if (tipo) {
          const blob = await it.getType(tipo);
          const nombre = /pdf/i.test(tipo) ? 'pegado.pdf' : (/csv/i.test(tipo) ? 'pegado.csv' : 'pegado.xlsx');
          const file = new File([blob], nombre, { type: blob.type || tipo });
          const ta = document.getElementById('nxTssPegar'); if (ta) ta.value = '';
          const fi = document.getElementById('nxTssFile'); if (fi) fi.value = '';
          onArchivo(file);
          return;
        }
      }
      // Si no había archivo, intentar como texto
      let txt = '';
      try { txt = await navigator.clipboard.readText(); } catch (_) {}
      if (txt && txt.trim()) { const ta = document.getElementById('nxTssPegar'); if (ta) { ta.value = txt; compararPegado(); } return; }
      aviso('No encontré un archivo en el portapapeles.<br><span style="color:#64748b;font-size:12px">En iPhone, para el PDF usa <b>"Seleccionar archivo" → "Elegir archivo"</b>.</span>', '#b45309');
    } catch (e) {
      aviso('No se pudo leer el portapapeles.<br><span style="color:#64748b;font-size:12px">Usa <b>"Seleccionar archivo"</b> para el PDF (en iPhone: "Elegir archivo").</span>', '#b45309');
    }
  };

  function renderMapeo() {
    if (!_header.length) { setArea('nxTssMapeo', ''); return; }
    const opts = sel => _header.map((h, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(h || ('Columna ' + (i + 1)))}</option>`).join('');
    setArea('nxTssMapeo', `
      <div style="display:flex;gap:8px;margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px">
        <div style="flex:1"><label style="font-size:10px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">Columna de CÉDULA</label>
          <select id="nxTssColCed" onchange="window.nxTssRemap()" style="width:100%;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">${opts(_colCed)}</select></div>
        <div style="flex:1"><label style="font-size:10px;font-weight:700;color:#64748b;display:block;margin-bottom:3px">Columna de NOMBRE</label>
          <select id="nxTssColNom" onchange="window.nxTssRemap()" style="width:100%;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">${opts(_colNom)}</select></div>
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px">Si las columnas no son correctas, cámbialas aquí.</div>`);
  }
  window.nxTssRemap = function () {
    _colCed = parseInt(document.getElementById('nxTssColCed')?.value || 0);
    _colNom = parseInt(document.getElementById('nxTssColNom')?.value || 0);
    comparar();
  };

  function chip(color, bg, label, val) {
    return `<div style="background:${bg};border-radius:10px;padding:9px;text-align:center;flex:1;min-width:90px">
      <div style="font-size:17px;font-weight:900;color:${color}">${val}</div>
      <div style="font-size:8.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.3px">${label}</div></div>`;
  }
  function listaPersonas(items, color, vacio) {
    if (!items.length) return `<div style="text-align:center;color:#10b981;font-size:12px;padding:14px;font-weight:600">✓ ${vacio}</div>`;
    return items.map(it => {
      const sub = [];
      if (it.ced) sub.push(esc(fmtCed(it.ced)));
      if (it.extra) sub.push(`<span style="color:#d97706">${esc(it.extra)}</span>`);
      return `
      <div style="display:flex;align-items:center;gap:10px;padding:9px;border-bottom:1px solid #f1f5f9">
        <div style="width:30px;height:30px;border-radius:8px;background:${color}1a;color:${color};display:grid;place-items:center;font-weight:800;flex-shrink:0;font-size:13px">${esc((it.nom || '?').trim().charAt(0).toUpperCase())}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;color:#0f172a;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.nom || '(sin nombre)')}</div>
          ${sub.length ? `<div style="font-size:10.5px;color:#64748b">${sub.join(' · ')}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function comparar() {
    const empId = document.getElementById('nxTssEmpresa')?.value || '';
    const hayArchivo = _modo === 'nombre' ? _titulares.length : _rows.length;
    if (!hayArchivo) { setArea('nxTssResultado', '<div style="text-align:center;color:#94a3b8;padding:24px;font-size:13px">📄 Sube un archivo (TSS Excel/CSV o PDF de Humano) para comparar.</div>'); return; }
    if (!empId) { setArea('nxTssResultado', '<div style="text-align:center;color:#f59e0b;padding:24px;font-size:13px">🏢 Elige una empresa arriba para comparar.</div>'); return; }
    if (_modo === 'nombre') return compararNombre(empId);
    return compararCedula(empId);
  }

  function compararCedula(empId) {
    const ST_ = getST();
    const clientes = Array.isArray(ST_.clientes) ? ST_.clientes : [];
    const sysCli = clientes.filter(c => String(c.empresa_id) === String(empId));

    const fileEntries = _rows.map(r => ({ ced: normCedula(r[_colCed]), nom: String(r[_colNom] || '').trim() })).filter(e => e.ced);
    const fileSet = new Set(fileEntries.map(e => e.ced));

    const sysCed = sysCli.map(c => ({ nom: c.nom, ced: normCedula(c.cedula) }));
    const sysSet = new Set(sysCed.filter(c => c.ced).map(c => c.ced));

    // Índice de TODOS los clientes por cédula (para avisar si un "extra" existe en otra empresa)
    const allByCed = {};
    clientes.forEach(c => { const k = normCedula(c.cedula); if (k) allByCed[k] = c; });
    const empresas = Array.isArray(ST_.empresas) ? ST_.empresas : [];
    const nomEmpresa = id => empresas.find(e => String(e.id) === String(id))?.nom || '';

    const faltanEnTSS = sysCed.filter(c => c.ced && !fileSet.has(c.ced));
    const sinCedula = sysCed.filter(c => !c.ced);
    const coinciden = sysCed.filter(c => c.ced && fileSet.has(c.ced)).length;
    // dedup extras por cédula
    const vistos = new Set();
    const extras = [];
    fileEntries.forEach(e => {
      if (sysSet.has(e.ced) || vistos.has(e.ced)) return;
      vistos.add(e.ced);
      const otro = allByCed[e.ced];
      extras.push({ ced: e.ced, nom: e.nom, extra: otro ? `En sistema bajo empresa: ${nomEmpresa(otro.empresa_id) || 'otra'}` : '' });
    });

    setArea('nxTssResultado', `
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0">
        ${chip('#1e293b', '#f1f5f9', 'Sistema', sysCli.length)}
        ${chip('#1e293b', '#f1f5f9', 'En archivo', fileEntries.length)}
        ${chip('#059669', '#ecfdf5', 'Coinciden', coinciden)}
        ${chip('#dc2626', '#fef2f2', 'Faltan TSS', faltanEnTSS.length)}
        ${chip('#d97706', '#fffbeb', 'Extras', extras.length)}
      </div>

      <div style="background:#fff;border:1px solid #fecaca;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fef2f2;padding:9px 12px;font-size:11px;font-weight:800;color:#b91c1c">⚠️ TUS CLIENTES QUE FALTAN EN LA TSS (${faltanEnTSS.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(faltanEnTSS, '#dc2626', 'Todos tus clientes están en el archivo')}</div>
      </div>

      <div style="background:#fff;border:1px solid #fde68a;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fffbeb;padding:9px 12px;font-size:11px;font-weight:800;color:#b45309">📋 EN EL ARCHIVO PERO NO EN EL SISTEMA (${extras.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(extras, '#d97706', 'No hay personas de más en el archivo')}</div>
      </div>

      ${sinCedula.length ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#f8fafc;padding:9px 12px;font-size:11px;font-weight:800;color:#64748b">❔ CLIENTES SIN CÉDULA (no se pueden comparar) (${sinCedula.length})</div>
        <div style="max-height:160px;overflow-y:auto">${listaPersonas(sinCedula, '#64748b', '')}</div>
      </div>` : ''}
    `);
  }
  function compararNombre(empId) {
    const ST_ = getST();
    const clientes = Array.isArray(ST_.clientes) ? ST_.clientes : [];
    const sysCli = clientes.filter(c => String(c.empresa_id) === String(empId)).map(c => ({ nom: c.nom, tok: tokensNom(c.nom) }));
    const tit = _titulares.map(n => ({ nom: n, tok: tokensNom(n) }));

    const usados = new Set();
    const coinciden = [], dudosos = [], soloArchivo = [], pend = [];
    const buscar = (t, tier) => { let best = -1; sysCli.forEach((c, i) => { if (best < 0 && !usados.has(i) && tierNombre(t.tok, c.tok) === tier) best = i; }); return best; };
    // 1ª pasada: coincidencias fuertes (tienen prioridad sobre las dudosas)
    tit.forEach(t => { const b = buscar(t, 2); if (b >= 0) { coinciden.push({ nom: t.nom }); usados.add(b); } else pend.push(t); });
    // 2ª pasada: coincidencias dudosas sobre lo que sobra
    pend.forEach(t => { const b = buscar(t, 1); if (b >= 0) { dudosos.push({ nom: t.nom, extra: `en sistema: ${sysCli[b].nom}` }); usados.add(b); } else soloArchivo.push({ nom: t.nom }); });
    const soloSistema = sysCli.filter((c, i) => !usados.has(i)).map(c => ({ nom: c.nom }));

    setArea('nxTssResultado', `
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0">
        ${chip('#1e293b', '#f1f5f9', 'Titulares PDF', tit.length)}
        ${chip('#1e293b', '#f1f5f9', 'Sistema', sysCli.length)}
        ${chip('#059669', '#ecfdf5', 'Coinciden', coinciden.length)}
        ${chip('#d97706', '#fffbeb', 'Dudosos', dudosos.length)}
        ${chip('#dc2626', '#fef2f2', 'No están', soloArchivo.length)}
      </div>

      ${dudosos.length ? `<div style="background:#fff;border:1px solid #fde68a;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fffbeb;padding:9px 12px;font-size:11px;font-weight:800;color:#b45309">❓ POSIBLE COINCIDENCIA — REVISAR (${dudosos.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(dudosos, '#d97706', '')}</div>
      </div>` : ''}

      <div style="background:#fff;border:1px solid #fecaca;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fef2f2;padding:9px 12px;font-size:11px;font-weight:800;color:#b91c1c">⚠️ EN EL PDF PERO NO EN EL SISTEMA (${soloArchivo.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(soloArchivo, '#dc2626', 'Todos los titulares están en el sistema')}</div>
      </div>

      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#f8fafc;padding:9px 12px;font-size:11px;font-weight:800;color:#64748b">📋 EN EL SISTEMA PERO NO EN EL PDF (${soloSistema.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(soloSistema, '#64748b', 'Todos tus clientes están en el PDF')}</div>
      </div>
    `);
  }
  window.nxTssComparar = comparar;

  window.nxAbrirCuadreTSS = function () {
    if (!esAdmin()) return;
    let ov = document.getElementById('nxTssOverlay');
    if (ov) ov.remove();
    _modo = 'cedula'; _rows = []; _header = []; _colCed = -1; _colNom = -1; _titulares = []; _depCount = 0;

    const ST_ = getST();
    const empresas = (Array.isArray(ST_.empresas) ? ST_.empresas : []).slice().sort((a, b) => String(a.nom).localeCompare(String(b.nom)));
    const opcEmp = '<option value="">— Elegir empresa —</option>' + empresas.map(e => `<option value="${esc(e.id)}">${esc(e.nom)}</option>`).join('');

    ov = document.createElement('div');
    ov.id = 'nxTssOverlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(4px);z-index:99990;display:flex;justify-content:center;align-items:flex-start;padding:16px;overflow-y:auto';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div style="background:#f8fafc;border-radius:18px;max-width:620px;width:100%;margin:auto;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:18px 18px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:17px;font-weight:800">🔍 Tabla Comparativa</div>
            <div style="font-size:11px;opacity:.85;margin-top:2px">Compara tus clientes con la TSS (Excel, por cédula) o Humano (PDF, por nombre)</div>
          </div>
          <button onclick="document.getElementById('nxTssOverlay').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
        </div>
        <div style="padding:16px">
          <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px">1. Empresa a comparar</label>
          <select id="nxTssEmpresa" onchange="window.nxTssComparar()" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:600;background:#fff;margin-bottom:12px">${opcEmp}</select>

          <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px">2. Archivo (TSS o Humano)</label>
          <button type="button" id="nxTssBtnFile" onclick="document.getElementById('nxTssFile').click()" style="width:100%;border:1.5px dashed #93c5fd;background:#eff6ff;color:#2563eb;border-radius:10px;padding:14px;font-weight:700;font-size:13px;cursor:pointer"><i class="ti ti-file-spreadsheet"></i> Seleccionar archivo (Excel, CSV o PDF)<div style="font-size:10px;font-weight:600;color:#64748b;margin-top:3px">o arrastra el archivo aquí · el PDF de Humano va por aquí</div></button>
          <input type="file" id="nxTssFile" accept=".xlsx,.xls,.csv,.pdf,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none">

          <div style="text-align:center;color:#94a3b8;font-size:11px;margin:9px 0;font-weight:700">— o pega los datos —</div>
          <button type="button" onclick="window.nxTssPegarArchivo()" style="width:100%;border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:11px;font-weight:700;font-size:12.5px;cursor:pointer;margin-bottom:8px"><i class="ti ti-clipboard"></i> Pegar archivo copiado (PDF/Excel)</button>
          <textarea id="nxTssPegar" placeholder="…o pega aquí lo copiado de Excel (cédula y nombre), o una lista de cédulas o nombres" style="width:100%;min-height:64px;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>

          <div id="nxTssMapeo"></div>
          <div id="nxTssResultado"></div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const fileInp = document.getElementById('nxTssFile');
    if (fileInp) fileInp.addEventListener('change', function () { if (this.files && this.files[0]) { const ta = document.getElementById('nxTssPegar'); if (ta) ta.value = ''; onArchivo(this.files[0]); } });
    // Arrastrar y soltar el archivo sobre el botón
    const btnFile = document.getElementById('nxTssBtnFile');
    if (btnFile) {
      ['dragenter', 'dragover'].forEach(ev => btnFile.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); btnFile.style.background = '#dbeafe'; }));
      ['dragleave', 'drop'].forEach(ev => btnFile.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); btnFile.style.background = '#eff6ff'; }));
      btnFile.addEventListener('drop', e => { const f = e.dataTransfer?.files?.[0]; if (f) { if (fileInp) fileInp.value = ''; const ta = document.getElementById('nxTssPegar'); if (ta) ta.value = ''; onArchivo(f); } });
    }
    const pegarTa = document.getElementById('nxTssPegar');
    if (pegarTa) {
      pegarTa.addEventListener('input', function () { if (fileInp) fileInp.value = ''; compararPegado(); });
      // Permitir PEGAR un archivo (PDF/Excel) copiado desde el explorador
      pegarTa.addEventListener('paste', function (ev) {
        const cd = ev.clipboardData || window.clipboardData;
        if (cd && cd.files && cd.files.length) {
          ev.preventDefault();
          if (fileInp) fileInp.value = '';
          this.value = '';
          onArchivo(cd.files[0]);
        }
      });
    }
    comparar();
  };

  // Botón en el dashboard (solo admin)
  function inyectarBoton() {
    if (document.getElementById('qaCuadreTSS')) return true;
    if (!esAdmin()) return true;
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    const qa = vDash.querySelector('.qa');
    if (!qa || !qa.parentElement) return false;
    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaCuadreTSS';
    btn.setAttribute('onclick', 'window.nxAbrirCuadreTSS && window.nxAbrirCuadreTSS()');
    btn.innerHTML = `<span class="qa-i"><i class="ti ti-file-search"></i></span><div class="qa-l">Tabla Comparativa</div>`;
    qa.parentElement.appendChild(btn);
    return true;
  }

  function init() {
    let n = 0;
    const t = function () { n++; if (inyectarBoton()) return; if (n < 80) setTimeout(t, 150); };
    t();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();


/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - LOADER (indicador de carga: logo girando + resplandor azul)
   ────────────────────────────────────────────────────────────────
   Overlay a pantalla completa con el logo (escudo azul) girando y un
   resplandor azul pulsante. Se muestra durante la carga de datos
   (cargarTodo) tras el login y al refrescar. Reutilizable vía
   window.nxLoader.show(texto) / window.nxLoader.hide().
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__NEXUS_LOADER__) return;
  window.__NEXUS_LOADER__ = true;

  function inyectarCSS() {
    if (document.getElementById('nxLoaderCSS')) return;
    const st = document.createElement('style');
    st.id = 'nxLoaderCSS';
    st.textContent = `
      @keyframes nxLoaderSpin { to { transform: rotate(360deg); } }
      @keyframes nxLoaderGlow {
        0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,.45), 0 10px 26px rgba(30,58,110,.55); }
        50%     { box-shadow: 0 0 30px 9px rgba(37,99,235,.70), 0 10px 26px rgba(30,58,110,.55); }
      }
      @keyframes nxLoaderRing { 0%{transform:rotate(0);opacity:.9} 100%{transform:rotate(360deg);opacity:.9} }
      #nxLoaderOv{position:fixed;inset:0;z-index:100000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:20px;
        background:radial-gradient(circle at 50% 40%, rgba(30,58,110,.55), rgba(8,14,30,.72));backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);opacity:0;transition:opacity .25s ease}
      #nxLoaderOv.show{opacity:1}
      .nxLoader-wrap{position:relative;width:92px;height:92px;display:flex;align-items:center;justify-content:center}
      .nxLoader-ring{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(59,130,246,.18);border-top-color:#3b82f6;animation:nxLoaderRing 1s linear infinite}
      .nxLoader-mk{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,#1e3a6e,#3b82f6);display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:30px;animation:nxLoaderSpin 1.15s cubic-bezier(.6,.1,.3,.9) infinite, nxLoaderGlow 1.7s ease-in-out infinite}
      .nxLoader-tx{font-weight:800;color:#fff;font-size:15px;letter-spacing:1px;text-align:center}
      .nxLoader-sub{font-size:11px;color:#bcd2ff;text-align:center;margin-top:3px;font-weight:600}
    `;
    document.head.appendChild(st);
  }

  function asegurar() {
    inyectarCSS();
    let ov = document.getElementById('nxLoaderOv');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'nxLoaderOv';
    ov.innerHTML = `
      <div class="nxLoader-wrap">
        <div class="nxLoader-ring"></div>
        <div class="nxLoader-mk"><i class="ti ti-shield-check"></i></div>
      </div>
      <div><div class="nxLoader-tx">NEXUS PRO</div><div class="nxLoader-sub" id="nxLoaderSub">Cargando…</div></div>`;
    (document.body || document.documentElement).appendChild(ov);
    return ov;
  }

  let _t;
  window.nxLoader = {
    show(texto) {
      const ov = asegurar();
      const sub = document.getElementById('nxLoaderSub');
      if (sub) sub.textContent = texto || 'Cargando…';
      clearTimeout(_t);
      ov.style.display = 'flex';
      requestAnimationFrame(() => ov.classList.add('show'));
    },
    hide() {
      const ov = document.getElementById('nxLoaderOv');
      if (!ov) return;
      ov.classList.remove('show');
      clearTimeout(_t);
      _t = setTimeout(() => { ov.style.display = 'none'; }, 280);
    }
  };

  // Envolver cargarTodo para mostrar el loader durante la carga de datos
  function envolver() {
    if (window.__nxLoaderWrapCT) return true;
    if (typeof window.cargarTodo !== 'function') return false;
    const orig = window.cargarTodo;
    window.cargarTodo = async function (...args) {
      const t0 = Date.now();
      try { window.nxLoader.show('Cargando datos…'); } catch (e) {}
      try { return await orig.apply(this, args); }
      finally {
        const restante = 650 - (Date.now() - t0); // tiempo mínimo visible para que no parpadee
        setTimeout(() => { try { window.nxLoader.hide(); } catch (e) {} }, Math.max(0, restante));
      }
    };
    window.__nxLoaderWrapCT = true;
    return true;
  }

  function init() {
    let n = 0;
    const t = function () { n++; if (envolver()) return; if (n < 200) setTimeout(t, 120); };
    t();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
