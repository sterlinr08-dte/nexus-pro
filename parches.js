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
        <span>En proceso</span>
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
          <button class="btn bxl" type="button" onclick="window.nxGuardarTransferenciaAgenteV2()" id="nxTA2Btn"><i class="ti ti-check"></i> Crear solicitud</button>
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

    const payload = { desde_agente: desde, hacia_agente: hacia, monto, metodo, banco: banco || null, referencia: ref, nota: nota || null, fecha: today(), estado: 'pendiente' };

    try {
      await api.post(TRANSFER_TABLE, payload);
      if (typeof window.logAudit === "function") {
        window.logAudit("SOLICITUD_TRANSFERENCIA_CREADA", getAgenteNombreById(desde) + " → " + getAgenteNombreById(hacia) + " · " + money(monto) + " · " + metodo + (banco ? " · " + banco : ""), "Cobros");
      }
      toastSafe("ok", "Solicitud creada", getAgenteNombreById(hacia) + " debe confirmar para que se efectúe");
      window.nxCerrarTransferenciaAgenteV2();
      // Refrescar la vista de solicitudes si existe
      if (typeof window.nxRenderSolicitudes === 'function') window.nxRenderSolicitudes();
    } catch (e) {
      console.error("Error guardando solicitud:", e);
      toastSafe("err", "No se pudo guardar", "Verifica que la tabla transferencias_agentes tenga columna 'estado'");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Crear solicitud'; }
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
    // DESACTIVADO: el reporte premium viejo. Ahora vive en Detalles de Cobro V1
    // wrapReporteAgente();
    // bindDashboardCobrado();
    // (no se ejecuta el render automático del reporte viejo)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  // DESACTIVADO: listeners del reporte premium viejo (ahora en Detalles de Cobro V1)
})();


/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - DETALLES DE COBRO DASHBOARD V1
   - Pestaña en Dashboard (Resumen / Detalles de Cobro)
   - Ciclo del 20 al 20
   - KPIs por método + bancos + agentes + transferencias
   ════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';
  
  if (window.__NEXUS_DETALLES_COBRO_V1__) return;
  window.__NEXUS_DETALLES_COBRO_V1__ = true;
  
  // ═══ HELPERS ═══
  function st() {
    try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); }
    catch(e) { return window.ST || {}; }
  }
  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function getFmt() {
    return (typeof fmt === 'function') ? fmt : (n => 'RD$ ' + Number(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
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
      return d.toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' });
    } catch(e) { return iso; }
  }
  
  // ═══ CICLO 20-20 ═══
  function calcularPeriodo() {
    const hoy = new Date();
    const dia = hoy.getDate();
    let fin, inicio;
    if (dia < 20) {
      // Antes del 20: ciclo cerrado fue del 20 anterior al 20 anterior
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 20);
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 20);
    } else {
      // Después del 20: ciclo cerrado fue del 20 anterior al 20 actual
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 20);
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 20);
    }
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
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mi = meses[periodo.inicio.getMonth()];
    const mf = meses[periodo.fin.getMonth()];
    return `Ciclo: 20 ${mi} - 20 ${mf} ${periodo.fin.getFullYear()}`;
  }
  
  // ═══ SELECTOR DE CICLOS ═══
  let cicloSeleccionado = null;
  
  function calcularUltimosCiclos(cantidad) {
    cantidad = cantidad || 6;
    const ciclos = [];
    const base = calcularPeriodo(); // ciclo cerrado actual
    
    // PRIMERO: agregar el ciclo EN CURSO (futuro respecto al cerrado)
    const cursoIni = new Date(base.inicio);
    const cursoFin = new Date(base.fin);
    cursoIni.setMonth(cursoIni.getMonth() + 1);
    cursoFin.setMonth(cursoFin.getMonth() + 1);
    const cursoKey = `${cursoIni.getTime()}_${cursoFin.getTime()}`;
    ciclos.push({
      inicio: cursoIni,
      fin: cursoFin,
      nombre: nombreCiclo({ inicio: cursoIni, fin: cursoFin }) + ' · EN CURSO',
      key: cursoKey,
      enCurso: true
    });
    
    // DESPUÉS: ciclos cerrados (del más reciente al más viejo)
    for (let i = 0; i < cantidad; i++) {
      const ini = new Date(base.inicio);
      const fin = new Date(base.fin);
      ini.setMonth(ini.getMonth() - i);
      fin.setMonth(fin.getMonth() - i);
      const key = `${ini.getTime()}_${fin.getTime()}`;
      ciclos.push({ inicio: ini, fin: fin, nombre: nombreCiclo({ inicio: ini, fin: fin }), key: key });
    }
    return ciclos;
  }
  
  function handleCambioCiclo(key, ciclos) {
    const encontrado = ciclos.find(c => c.key === key);
    if (encontrado) {
      cicloSeleccionado = encontrado;
      renderDetallesCobro();
    }
  }
  
  function navegarCiclo(direccion, ciclos) {
    const actualKey = cicloSeleccionado ? cicloSeleccionado.key : ciclos[0].key;
    const index = ciclos.findIndex(c => c.key === actualKey);
    const nuevoIndex = index + direccion;
    if (nuevoIndex >= 0 && nuevoIndex < ciclos.length) {
      cicloSeleccionado = ciclos[nuevoIndex];
      renderDetallesCobro();
    }
  }
  
  function crearBarraSelector(ciclos, periodoActivo, indexActual) {
    return `
      <div class="nxDC-selector">
        <button class="nxDC-nav-btn" id="nxDCAnterior" ${indexActual === ciclos.length - 1 ? 'disabled' : ''} title="Ciclo anterior">
          <i class="ti ti-chevron-left"></i>
        </button>
        <select id="nxDCCicloSelect" class="nxDC-select">
          ${ciclos.map(c => `<option value="${c.key}" ${c.key === periodoActivo.key ? 'selected' : ''}>${c.nombre}</option>`).join('')}
        </select>
        <button class="nxDC-nav-btn" id="nxDCSiguiente" ${indexActual === 0 ? 'disabled' : ''} title="Ciclo más reciente">
          <i class="ti ti-chevron-right"></i>
        </button>
      </div>
    `;
  }
  
  // ═══ CARGAR DATOS ═══
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
    } catch(e) {
      return [];
    }
  }
  
  // ═══ CÁLCULOS ═══
  function calcularKPIs(abonos, periodo) {
    const enPeriodo = abonos.filter(a => enRango(a.fecha, periodo.inicio, periodo.fin));
    const total = enPeriodo.reduce((s, a) => s + Number(a.monto || 0), 0);
    const stats = { 
      total, 
      cantidad: enPeriodo.length,
      efectivo: { monto: 0, cantidad: 0 },
      banco: { monto: 0, cantidad: 0 },
      cheque: { monto: 0, cantidad: 0 },
      otros: { monto: 0, cantidad: 0 }
    };
    enPeriodo.forEach(a => {
      const tipo = normMet(a.metodo);
      stats[tipo].monto += Number(a.monto || 0);
      stats[tipo].cantidad += 1;
    });
    return { stats, abonosPeriodo: enPeriodo };
  }
  
  function calcularPorBanco(abonosPeriodo) {
    const porBanco = {};
    abonosPeriodo.forEach(a => {
      if (normMet(a.metodo) !== 'banco') return;
      const b = a.banco || 'Sin banco';
      if (!porBanco[b]) porBanco[b] = { monto: 0, cantidad: 0 };
      porBanco[b].monto += Number(a.monto || 0);
      porBanco[b].cantidad += 1;
    });
    return Object.entries(porBanco)
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((x, y) => y.monto - x.monto);
  }
  
  function calcularPorAgente(abonosPeriodo, transferenciasPeriodo) {
    // Solo contar transferencias ACEPTADAS (las pendientes/rechazadas no afectan el saldo real)
    const trAceptadas = transferenciasPeriodo.filter(t => !t.estado || t.estado === 'aceptada');
    const agentes = st().agentes || [];
    return agentes.map(ag => {
      const propios = abonosPeriodo.filter(a => String(a.agente_cobro) === String(ag.id));
      const cobrado = propios.reduce((s, a) => s + Number(a.monto || 0), 0);
      const desglose = { efectivo: 0, banco: 0, cheque: 0, otros: 0 };
      propios.forEach(a => {
        desglose[normMet(a.metodo)] += Number(a.monto || 0);
      });
      // Transferencias (solo aceptadas)
      const recibidas = trAceptadas
        .filter(t => String(t.hacia_agente) === String(ag.id))
        .reduce((s, t) => s + Number(t.monto || 0), 0);
      const entregadas = trAceptadas
        .filter(t => String(t.desde_agente) === String(ag.id))
        .reduce((s, t) => s + Number(t.monto || 0), 0);
      const enMano = cobrado + recibidas - entregadas;
      return {
        id: ag.id,
        nombre: ag.nom,
        cargo: ag.cargo || '',
        cantidad: propios.length,
        cobrado,
        desglose,
        recibidas,
        entregadas,
        enMano
      };
    }).sort((a, b) => b.cobrado - a.cobrado);
  }
  
  // ═══ HTML RENDER ═══
  function renderKPIs(stats, periodo) {
    const F = getFmt();
    return `
      <div class="nxDC-kpis">
        <div class="nxDC-kpi-big">
          <div class="nxDC-kpi-label">💰 TOTAL COBRADO DEL CICLO</div>
          <div class="nxDC-kpi-value">${F(stats.total)}</div>
          <div class="nxDC-kpi-sub">${stats.cantidad} cobros · ${nombreCiclo(periodo)}</div>
        </div>
        <div class="nxDC-kpi-grid">
          <div class="nxDC-kpi nxDC-kpi-ef">
            <div class="nxDC-kpi-icon">💵</div>
            <div class="nxDC-kpi-data">
              <div class="nxDC-kpi-num">${F(stats.efectivo.monto)}</div>
              <div class="nxDC-kpi-tag">EFECTIVO · ${stats.efectivo.cantidad}</div>
            </div>
          </div>
          <div class="nxDC-kpi nxDC-kpi-bc">
            <div class="nxDC-kpi-icon">🏦</div>
            <div class="nxDC-kpi-data">
              <div class="nxDC-kpi-num">${F(stats.banco.monto)}</div>
              <div class="nxDC-kpi-tag">BANCO/TRANSF · ${stats.banco.cantidad}</div>
            </div>
          </div>
          <div class="nxDC-kpi nxDC-kpi-ch">
            <div class="nxDC-kpi-icon">📝</div>
            <div class="nxDC-kpi-data">
              <div class="nxDC-kpi-num">${F(stats.cheque.monto)}</div>
              <div class="nxDC-kpi-tag">CHEQUE · ${stats.cheque.cantidad}</div>
            </div>
          </div>
          <div class="nxDC-kpi nxDC-kpi-ot">
            <div class="nxDC-kpi-icon">⋯</div>
            <div class="nxDC-kpi-data">
              <div class="nxDC-kpi-num">${F(stats.otros.monto)}</div>
              <div class="nxDC-kpi-tag">OTROS · ${stats.otros.cantidad}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  function renderBancosSeccion(porBanco, totalBanco) {
    const F = getFmt();
    if (!porBanco.length) {
      return `
        <div class="nc p3 nxDC-section">
          <div class="ch"><div class="ct">🏦 Dónde está el dinero</div><div class="ct-s">Por banco</div></div>
          <div class="empty" style="padding:20px;text-align:center">Sin cobros por transferencia en este ciclo</div>
        </div>
      `;
    }
    return `
      <div class="nc p3 nxDC-section">
        <div class="ch">
          <div><div class="ct">🏦 Dónde está el dinero</div><div class="ct-s">Por banco · Total: ${F(totalBanco)}</div></div>
        </div>
        <div class="nxDC-bancos">
          ${porBanco.map(b => {
            const pct = totalBanco > 0 ? Math.round((b.monto / totalBanco) * 100) : 0;
            return `
              <div class="nxDC-banco">
                <div class="nxDC-banco-head">
                  <div class="nxDC-banco-name">🏦 ${b.nombre}</div>
                  <div class="nxDC-banco-monto">${F(b.monto)}</div>
                </div>
                <div class="nxDC-banco-bar"><div class="nxDC-banco-fill" style="width:${pct}%"></div></div>
                <div class="nxDC-banco-foot">${b.cantidad} cobros · ${pct}% del total</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  function renderAgentesSeccion(porAgente, hayTransferencias) {
    const F = getFmt();
    if (!porAgente.length) {
      return `
        <div class="nc p3 nxDC-section">
          <div class="ch"><div class="ct">👥 Detalle por agente</div></div>
          <div class="empty" style="padding:20px;text-align:center">Sin agentes registrados</div>
        </div>
      `;
    }
    return `
      <div class="nc p3 nxDC-section">
        <div class="ch">
          <div><div class="ct">👥 Detalle por agente</div><div class="ct-s">Desglose y dinero en mano real</div></div>
          ${hayTransferencias && typeof window.nxAbrirTransferenciaAgenteV2 === 'function' ? 
            '<button class="btn bsm bc1" onclick="window.nxAbrirTransferenciaAgenteV2()"><i class="ti ti-transfer"></i> Transferir</button>' : ''}
        </div>
        <div class="nxDC-agentes">
          ${porAgente.map(ag => `
            <div class="nxDC-agente">
              <div class="nxDC-agente-head">
                <div>
                  <div class="nxDC-agente-name">👤 ${ag.nombre}</div>
                  <div class="nxDC-agente-cargo">${ag.cargo || ''} · ${ag.cantidad} cobros</div>
                </div>
                <div class="nxDC-agente-total">${F(ag.cobrado)}</div>
              </div>
              <div class="nxDC-agente-grid">
                <div class="nxDC-mini"><div class="nxDC-mini-v">${F(ag.desglose.efectivo)}</div><div class="nxDC-mini-l">EFECTIVO</div></div>
                <div class="nxDC-mini"><div class="nxDC-mini-v">${F(ag.desglose.banco)}</div><div class="nxDC-mini-l">BANCO</div></div>
                <div class="nxDC-mini"><div class="nxDC-mini-v">${F(ag.desglose.cheque)}</div><div class="nxDC-mini-l">CHEQUE</div></div>
                <div class="nxDC-mini"><div class="nxDC-mini-v">${F(ag.desglose.otros)}</div><div class="nxDC-mini-l">OTROS</div></div>
              </div>
              ${ag.recibidas > 0 || ag.entregadas > 0 ? `
                <div class="nxDC-transf">
                  ${ag.recibidas > 0 ? `<span class="nxDC-transf-rec">+ ${F(ag.recibidas)} recibido</span>` : ''}
                  ${ag.entregadas > 0 ? `<span class="nxDC-transf-ent">− ${F(ag.entregadas)} entregado</span>` : ''}
                </div>
              ` : ''}
              <div class="nxDC-mano">
                <span class="nxDC-mano-label">💰 EN MANO REAL</span>
                <span class="nxDC-mano-value">${F(ag.enMano)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  function renderTransferenciasSeccion(transferencias) {
    if (!transferencias.length) return '';
    const F = getFmt();
    return `
      <div class="nc p3 nxDC-section">
        <div class="ch"><div><div class="ct">🔄 Transferencias del ciclo</div><div class="ct-s">${transferencias.length} movimientos entre agentes</div></div></div>
        <div class="nxDC-transf-list">
          ${transferencias.map(t => {
            const desde = getGAgt(t.desde_agente)?.nom || 'N/D';
            const hacia = getGAgt(t.hacia_agente)?.nom || 'N/D';
            return `
              <div class="nxDC-transf-row">
                <div class="nxDC-transf-fecha">${fmtFecha(t.fecha)}</div>
                <div class="nxDC-transf-flow">
                  <span class="nxDC-transf-from">${desde}</span>
                  <span class="nxDC-transf-arrow">→</span>
                  <span class="nxDC-transf-to">${hacia}</span>
                </div>
                <div class="nxDC-transf-monto">${F(t.monto)}</div>
                <div class="nxDC-transf-meta">${t.metodo || ''} ${t.banco ? '· ' + t.banco : ''} · ${t.referencia || ''}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  // ═══ RENDER PRINCIPAL ═══
  async function renderDetallesCobro() {
    const cont = document.getElementById('nxDetallesCobroV1');
    if (!cont) return;
    
    cont.innerHTML = '<div class="nc p5"><div class="loading"><div class="spin"></div> Cargando detalles de cobro...</div></div>';
    
    // Selector de ciclos
    const listaCiclos = calcularUltimosCiclos(6);
    const periodo = cicloSeleccionado || listaCiclos[0];
    const indexActual = listaCiclos.findIndex(c => c.key === periodo.key);
    
    const [abonos, transferencias] = await Promise.all([cargarAbonos(), cargarTransferencias()]);
    
    const { stats, abonosPeriodo } = calcularKPIs(abonos, periodo);
    const porBanco = calcularPorBanco(abonosPeriodo);
    const transferenciasPeriodo = transferencias.filter(t => enRango(t.fecha, periodo.inicio, periodo.fin));
    // Solo mostrar las ACEPTADAS en la sección de transferencias del periodo
    const transfAceptadas = transferenciasPeriodo.filter(t => !t.estado || t.estado === 'aceptada');
    const porAgente = calcularPorAgente(abonosPeriodo, transferenciasPeriodo);
    const hayTransferencias = transfAceptadas.length > 0;
    
    cont.innerHTML = `
      ${crearBarraSelector(listaCiclos, periodo, indexActual)}
      <div id="nxDC-contenido">
        ${renderKPIs(stats, periodo)}
        ${renderBancosSeccion(porBanco, stats.banco.monto)}
        ${renderAgentesSeccion(porAgente, hayTransferencias)}
        ${hayTransferencias ? renderTransferenciasSeccion(transfAceptadas) : ''}
      </div>
    `;
    
    // Conectar eventos del selector
    const sel = document.getElementById('nxDCCicloSelect');
    const btnAnt = document.getElementById('nxDCAnterior');
    const btnSig = document.getElementById('nxDCSiguiente');
    if (sel) sel.onchange = (e) => handleCambioCiclo(e.target.value, listaCiclos);
    if (btnAnt) btnAnt.onclick = () => navegarCiclo(1, listaCiclos);
    if (btnSig) btnSig.onclick = () => navegarCiclo(-1, listaCiclos);
  }
  
  // ═══ INTEGRACIÓN EN DASHBOARD ═══
  function crearContenedor() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    if (document.getElementById('nxDetallesCobroV1')) return true;
    
    // Crear contenedor oculto al final del Dashboard
    const cDetalles = document.createElement('div');
    cDetalles.id = 'nxDetallesCobroV1';
    cDetalles.style.display = 'none';
    vDash.appendChild(cDetalles);
    
    // Crear botón "Volver al resumen" arriba del contenedor
    return true;
  }
  
  function mostrarDetalles() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return;
    
    // Asegurar que la vista Dashboard esté activa (en caso de venir de otra vista)
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    vDash.classList.add('on');
    
    // Ocultar todos los hijos del dashboard EXCEPTO nuestro contenedor y el botón volver
    Array.from(vDash.children).forEach(child => {
      if (child.id === 'nxDetallesCobroV1') return;
      if (child.id === 'nxDCBotonVolver') return;
      // Guardar el display previo solo si no se ha guardado antes (para no perderlo)
      if (child.dataset.nxDCPrevDisplay === undefined) {
        child.dataset.nxDCPrevDisplay = child.style.display || '';
      }
      child.style.display = 'none';
    });
    
    // Crear botón volver si no existe
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
      // Si ya existe, asegurar que esté visible
      document.getElementById('nxDCBotonVolver').style.display = '';
    }
    
    // Mostrar nuestro contenedor
    const cDetalles = document.getElementById('nxDetallesCobroV1');
    if (cDetalles) {
      cDetalles.style.display = '';
      renderDetallesCobro();
    }
    
    // Scroll arriba para que se vea el selector
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  window.nxVolverResumen = function() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return;
    
    // Ocultar nuestro contenedor y botón
    const cDetalles = document.getElementById('nxDetallesCobroV1');
    if (cDetalles) cDetalles.style.display = 'none';
    
    const btnVolver = document.getElementById('nxDCBotonVolver');
    if (btnVolver) btnVolver.style.display = 'none';
    
    // Restaurar todos los hijos al estado original
    Array.from(vDash.children).forEach(child => {
      if (child.id === 'nxDetallesCobroV1') return;
      if (child.id === 'nxDCBotonVolver') return;
      if (child.dataset.nxDCPrevDisplay !== undefined) {
        child.style.display = child.dataset.nxDCPrevDisplay;
        delete child.dataset.nxDCPrevDisplay;
      } else {
        // Si por alguna razón no hay dataset, quitar el display:none
        child.style.display = '';
      }
    });
    
    // Scroll arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  window.nxAbrirDetallesCobro = mostrarDetalles;
  
  // ═══ INTERCEPTAR CLICK EN KPI COBRADO ═══
  function bindCobradoKPI() {
    document.addEventListener('click', function(e) {
      const target = e.target;
      const kpiKL = target.closest?.('.kl');
      if (!kpiKL) return;
      if (kpiKL.textContent.trim().toUpperCase() !== 'COBRADO') return;
      // Es el KPI COBRADO - asegurar que estamos en Dashboard y abrir detalles
      const vDash = document.getElementById('v-dashboard');
      if (vDash && vDash.classList.contains('on')) {
        e.preventDefault();
        e.stopPropagation();
        mostrarDetalles();
      }
    }, true);
  }
  
  // ═══ CSS ═══
  function injectCSS() {
    if (document.getElementById('nxDC-css')) return;
    const style = document.createElement('style');
    style.id = 'nxDC-css';
    style.textContent = `
      #nxDetallesCobroV1 { animation:nxDCFade .3s ease-out; }
      @keyframes nxDCFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      
      .nxDC-selector { 
        display:flex; gap:10px; align-items:center; background:#fff; border:1px solid #e2e8f0; 
        border-radius:16px; padding:10px; margin-bottom:16px; 
        box-shadow: 0 4px 16px rgba(15,23,42,.08), 0 1px 3px rgba(15,23,42,.04);
        position:sticky; top:0; z-index:100;
        border-bottom: 1px solid #e2e8f0;
      }
      .nxDC-select { 
        flex:1; padding:12px 14px; border:1px solid #cbd5e1; border-radius:12px; 
        font-weight:700; font-size:14px; background:#fff; color:#0f172a; cursor:pointer;
        text-align:center; appearance:none; -webkit-appearance:none;
      }
      .nxDC-nav-btn { 
        width:44px; height:44px; border:1px solid #cbd5e1; border-radius:50%; 
        background: linear-gradient(145deg, #f1f5f9, #e2e8f0); cursor:pointer; 
        display:flex; align-items:center; justify-content:center; color:#1e293b; 
        transition: all 0.2s; box-shadow: inset 0 1px 2px rgba(255,255,255,0.5);
      }
      .nxDC-nav-btn:hover:not(:disabled) { 
        background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
        transform: translateY(-1px);
      }
      .nxDC-nav-btn:active:not(:disabled) {
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
        transform: translateY(0);
      }
      .nxDC-nav-btn:disabled { opacity:.3; cursor:not-allowed; filter: grayscale(1); }
      @media (max-width: 480px) { 
        .nxDC-selector { padding: 8px; gap:6px; } 
        .nxDC-select { font-size: 13px; padding: 10px; } 
        .nxDC-nav-btn { width: 40px; height: 40px; }
      }
      
      .nxDC-kpis { margin-bottom:14px; }
      .nxDC-kpi-big { background:linear-gradient(135deg,#00e5c7,#10b981); color:#fff; border-radius:16px; padding:20px; margin-bottom:10px; box-shadow:0 4px 16px rgba(0,229,199,.25); }
      .nxDC-kpi-label { font-size:12px; font-weight:800; opacity:.9; letter-spacing:1px; }
      .nxDC-kpi-value { font-size:32px; font-weight:900; margin-top:6px; font-family:var(--mono,monospace); }
      .nxDC-kpi-sub { font-size:12px; opacity:.85; margin-top:4px; }
      .nxDC-kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
      .nxDC-kpi { display:flex; align-items:center; gap:10px; background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
      .nxDC-kpi-ef { border-left:4px solid #10b981; }
      .nxDC-kpi-bc { border-left:4px solid #3b82f6; }
      .nxDC-kpi-ch { border-left:4px solid #f59e0b; }
      .nxDC-kpi-ot { border-left:4px solid #6b7280; }
      .nxDC-kpi-icon { font-size:24px; }
      .nxDC-kpi-data { flex:1; min-width:0; }
      .nxDC-kpi-num { font-size:15px; font-weight:800; color:#0f172a; font-family:var(--mono,monospace); }
      .nxDC-kpi-tag { font-size:10px; font-weight:700; color:#64748b; letter-spacing:.5px; }
      
      .nxDC-section { margin-bottom:12px; }
      
      .nxDC-bancos { display:grid; gap:10px; margin-top:10px; }
      .nxDC-banco { padding:12px; border:1px solid #e2e8f0; border-radius:12px; background:#f8fafc; }
      .nxDC-banco-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
      .nxDC-banco-name { font-weight:800; color:#0f172a; font-size:13px; }
      .nxDC-banco-monto { font-weight:800; color:#3b82f6; font-family:var(--mono,monospace); }
      .nxDC-banco-bar { height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; margin:4px 0; }
      .nxDC-banco-fill { height:100%; background:linear-gradient(90deg,#3b82f6,#60a5fa); border-radius:3px; }
      .nxDC-banco-foot { font-size:10px; color:#64748b; font-weight:700; }
      
      .nxDC-agentes { display:grid; gap:12px; margin-top:10px; }
      .nxDC-agente { padding:14px; border:1px solid #e2e8f0; border-radius:14px; background:#fff; }
      .nxDC-agente-head { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; gap:10px; }
      .nxDC-agente-name { font-weight:800; color:#0f172a; font-size:14px; }
      .nxDC-agente-cargo { font-size:10px; color:#64748b; font-weight:700; margin-top:2px; }
      .nxDC-agente-total { font-weight:800; color:#10b981; font-size:16px; font-family:var(--mono,monospace); }
      .nxDC-agente-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-bottom:8px; }
      .nxDC-mini { background:#f8fafc; padding:8px; border-radius:8px; text-align:center; border:1px solid #e2e8f0; }
      .nxDC-mini-v { font-size:11px; font-weight:800; color:#0f172a; font-family:var(--mono,monospace); }
      .nxDC-mini-l { font-size:8px; font-weight:700; color:#64748b; letter-spacing:.5px; margin-top:2px; }
      .nxDC-transf { display:flex; gap:8px; font-size:10px; font-weight:700; margin:6px 0 8px; flex-wrap:wrap; }
      .nxDC-transf-rec { color:#10b981; background:#d1fae5; padding:4px 8px; border-radius:6px; }
      .nxDC-transf-ent { color:#dc2626; background:#fee2e2; padding:4px 8px; border-radius:6px; }
      .nxDC-mano { display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,#fbbf24,#f59e0b); color:#fff; padding:10px 14px; border-radius:10px; }
      .nxDC-mano-label { font-size:11px; font-weight:800; letter-spacing:1px; }
      .nxDC-mano-value { font-size:16px; font-weight:900; font-family:var(--mono,monospace); }
      
      .nxDC-transf-list { display:grid; gap:8px; margin-top:10px; }
      .nxDC-transf-row { padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; }
      .nxDC-transf-fecha { font-size:10px; color:#64748b; font-weight:700; }
      .nxDC-transf-flow { display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:#0f172a; }
      .nxDC-transf-arrow { color:#3b82f6; }
      .nxDC-transf-monto { font-weight:800; color:#10b981; font-family:var(--mono,monospace); }
      .nxDC-transf-meta { grid-column:1/-1; font-size:10px; color:#64748b; font-weight:600; }
      
      @media(max-width:768px) {
        .nxDC-kpi-value { font-size:24px; }
        .nxDC-kpi-grid { grid-template-columns:repeat(2,1fr) !important; }
        .nxDC-kpi-num { font-size:13px; }
        .nxDC-agente-grid { grid-template-columns:repeat(2,1fr) !important; }
        .nxDC-banco-monto { font-size:13px; }
        .nxDC-transf-row { grid-template-columns:1fr; }
        .nxDC-transf-monto { text-align:right; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // ═══ INIT ═══
  function init() {
    injectCSS();
    
    // Esperar a que el dashboard esté listo
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
   NEXUS PRO - SOLICITUDES DE TRANSFERENCIA
   - Vista de solicitudes pendientes con aceptar/rechazar
   - Botón en menú Más + Dashboard
   ════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';
  
  if (window.__NEXUS_SOLICITUDES_V1__) return;
  window.__NEXUS_SOLICITUDES_V1__ = true;
  
  function st() {
    try { return (typeof ST !== 'undefined') ? ST : (window.ST || {}); }
    catch(e) { return window.ST || {}; }
  }
  function getAPI() {
    try { return (typeof API !== 'undefined') ? API : window.API; }
    catch(e) { return window.API; }
  }
  function fmtMoney(n) {
    return 'RD$ ' + Number(n||0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  function gAgtNom(id) {
    const agt = (st().agentes || []).find(a => String(a.id) === String(id));
    return agt ? agt.nom : 'N/D';
  }
  function fmtFecha(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-DO', { day:'2-digit', month:'short', year:'numeric' });
    } catch(e) { return iso; }
  }
  function toastSafe(t, ti, m) {
    if (typeof toast === 'function') toast(t, ti, m);
    else alert(ti + (m ? '\n' + m : ''));
  }
  
  // ═══ CARGAR SOLICITUDES PENDIENTES ═══
  async function cargarSolicitudes() {
    const api = getAPI();
    if (!api?.get) return [];
    try {
      const data = await api.get('transferencias_agentes', 'estado=eq.pendiente&order=created_at.desc&limit=200');
      return Array.isArray(data) ? data : [];
    } catch(e) {
      console.warn('No se pudieron cargar solicitudes:', e);
      return [];
    }
  }
  
  // ═══ CONTAR PENDIENTES (para badge) ═══
  async function contarPendientes() {
    const lista = await cargarSolicitudes();
    return lista.length;
  }
  
  // ═══ ACEPTAR SOLICITUD ═══
  window.nxAceptarSolicitud = async function(id) {
    if (!confirm('¿Aceptar esta solicitud? Se efectuará la transferencia.')) return;
    const api = getAPI();
    if (!api?.patch) {
      toastSafe('err', 'API no disponible', '');
      return;
    }
    try {
      await api.patch('transferencias_agentes', 'id=eq.' + id, { estado: 'aceptada' });
      if (typeof window.logAudit === 'function') {
        window.logAudit('SOLICITUD_ACEPTADA', 'ID: ' + id, 'Cobros');
      }
      toastSafe('ok', 'Solicitud aceptada', 'La transferencia se efectuó');
      await renderSolicitudes();
    } catch(e) {
      console.error('Error al aceptar:', e);
      toastSafe('err', 'No se pudo aceptar', e.message || '');
    }
  };
  
  // ═══ RECHAZAR SOLICITUD ═══
  window.nxRechazarSolicitud = async function(id) {
    if (!confirm('¿Rechazar esta solicitud? No se efectuará la transferencia.')) return;
    const api = getAPI();
    if (!api?.patch) {
      toastSafe('err', 'API no disponible', '');
      return;
    }
    try {
      await api.patch('transferencias_agentes', 'id=eq.' + id, { estado: 'rechazada' });
      if (typeof window.logAudit === 'function') {
        window.logAudit('SOLICITUD_RECHAZADA', 'ID: ' + id, 'Cobros');
      }
      toastSafe('ok', 'Solicitud rechazada', '');
      await renderSolicitudes();
    } catch(e) {
      console.error('Error al rechazar:', e);
      toastSafe('err', 'No se pudo rechazar', e.message || '');
    }
  };
  
  // ═══ RENDER LISTA DE SOLICITUDES ═══
  async function renderSolicitudes() {
    const cont = document.getElementById('nxSolicitudesV1');
    if (!cont) return;
    
    cont.innerHTML = '<div class="nc p5"><div class="loading"><div class="spin"></div> Cargando solicitudes...</div></div>';
    
    const solicitudes = await cargarSolicitudes();
    
    if (solicitudes.length === 0) {
      cont.innerHTML = `
        <div class="nc p5" style="text-align:center;padding:40px">
          <div style="font-size:48px;margin-bottom:10px">✅</div>
          <div style="font-weight:800;color:#059669;font-size:16px">No hay solicitudes pendientes</div>
          <div style="color:#64748b;font-size:13px;margin-top:6px">Todas las transferencias están al día</div>
        </div>
      `;
      return;
    }
    
    cont.innerHTML = `
      <div class="nc p3" style="margin-bottom:12px;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;color:#92400e;border-radius:14px;padding:14px;font-weight:800">
        ⚠️ ${solicitudes.length} solicitud${solicitudes.length>1?'es':''} pendiente${solicitudes.length>1?'s':''} de confirmar
      </div>
      <div style="display:grid;gap:10px">
        ${solicitudes.map(s => `
          <div class="nxSol-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,.04)">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;margin-bottom:10px">
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:4px">${fmtFecha(s.fecha)} · ${s.metodo}</div>
                <div style="font-weight:800;color:#0f172a;font-size:14px">
                  ${gAgtNom(s.desde_agente)} <span style="color:#3b82f6">→</span> ${gAgtNom(s.hacia_agente)}
                </div>
                ${s.banco ? `<div style="font-size:11px;color:#64748b;margin-top:4px">🏦 ${s.banco}</div>` : ''}
                <div style="font-size:11px;color:#64748b;margin-top:2px">Ref: ${s.referencia || '—'}</div>
                ${s.nota ? `<div style="font-size:11px;color:#64748b;margin-top:2px;font-style:italic">"${s.nota}"</div>` : ''}
              </div>
              <div style="font-weight:900;color:#10b981;font-size:18px;font-family:var(--mono,monospace);white-space:nowrap">${fmtMoney(s.monto)}</div>
            </div>
            <div class="nxSol-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
              <button class="btn bsm bc1" type="button" onclick="window.nxAceptarSolicitud('${s.id}')" style="background:#10b981;border-color:#10b981;color:#fff">
                <i class="ti ti-check"></i> Aceptar
              </button>
              <button class="btn bsm bghost" type="button" onclick="window.nxRechazarSolicitud('${s.id}')" style="border-color:#dc2626;color:#dc2626">
                <i class="ti ti-x"></i> Rechazar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  window.nxRenderSolicitudes = renderSolicitudes;
  
  // ═══ MOSTRAR VISTA DE SOLICITUDES ═══
  window.nxAbrirSolicitudes = function() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return;
    
    // Asegurar que estamos en Dashboard
    document.querySelectorAll('.view').forEach(v => v.classList.remove('on'));
    vDash.classList.add('on');
    
    // Cerrar otras vistas si están abiertas
    if (typeof window.nxVolverResumen === 'function') window.nxVolverResumen();
    
    // Ocultar hijos del dashboard
    Array.from(vDash.children).forEach(child => {
      if (child.id === 'nxSolicitudesV1') return;
      if (child.id === 'nxSolBotonVolver') return;
      if (child.dataset.nxSolPrevDisplay === undefined) {
        child.dataset.nxSolPrevDisplay = child.style.display || '';
      }
      child.style.display = 'none';
    });
    
    // Crear contenedor si no existe
    let cont = document.getElementById('nxSolicitudesV1');
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 'nxSolicitudesV1';
      vDash.appendChild(cont);
    }
    cont.style.display = '';
    
    // Crear botón volver
    if (!document.getElementById('nxSolBotonVolver')) {
      const btn = document.createElement('div');
      btn.id = 'nxSolBotonVolver';
      btn.innerHTML = `
        <button class="btn bsm bghost" type="button" onclick="window.nxVolverDeSolicitudes()" style="margin-bottom:12px">
          <i class="ti ti-arrow-left"></i> Volver al Dashboard
        </button>
      `;
      vDash.insertBefore(btn, cont);
    } else {
      document.getElementById('nxSolBotonVolver').style.display = '';
    }
    
    renderSolicitudes();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  window.nxVolverDeSolicitudes = function() {
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return;
    
    const cont = document.getElementById('nxSolicitudesV1');
    if (cont) cont.style.display = 'none';
    
    const btn = document.getElementById('nxSolBotonVolver');
    if (btn) btn.style.display = 'none';
    
    Array.from(vDash.children).forEach(child => {
      if (child.id === 'nxSolicitudesV1') return;
      if (child.id === 'nxSolBotonVolver') return;
      if (child.dataset.nxSolPrevDisplay !== undefined) {
        child.style.display = child.dataset.nxSolPrevDisplay;
        delete child.dataset.nxSolPrevDisplay;
      } else {
        child.style.display = '';
      }
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // ═══ AGREGAR BOTÓN AL DASHBOARD (accesos rápidos) ═══
  function agregarBotonDashboard() {
    if (document.getElementById('nxBtnSolicitudes')) return;
    
    const qaGrid = document.querySelector('.qa-grid') || document.querySelector('[class*="qa"]')?.parentElement;
    if (!qaGrid) return;
    
    // Buscar el botón "Detalles de Cobro" para ponerse cerca
    const btnDC = Array.from(qaGrid.querySelectorAll('.qa')).find(q => q.textContent.includes('Detalles de Cobro'));
    if (!btnDC) return;
    
    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'nxBtnSolicitudes';
    btn.onclick = window.nxAbrirSolicitudes;
    btn.innerHTML = '<span class="qa-i"><i class="ti ti-inbox"></i><span class="nxSolBadge" id="nxSolBadge" style="display:none"></span></span><div class="qa-l">Solicitudes</div>';
    
    btnDC.insertAdjacentElement('afterend', btn);
    
    actualizarBadge();
  }
  
  // ═══ ACTUALIZAR BADGE DE NOTIFICACIÓN ═══
  async function actualizarBadge() {
    const badge = document.getElementById('nxSolBadge');
    if (!badge) return;
    
    const count = await contarPendientes();
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
  
  // ═══ CSS ═══
  function injectCSS() {
    if (document.getElementById('nxSol-css')) return;
    const style = document.createElement('style');
    style.id = 'nxSol-css';
    style.textContent = `
      .nxSolBadge {
        position:absolute; top:-4px; right:-4px;
        background:#dc2626; color:#fff;
        min-width:18px; height:18px; padding:0 5px;
        border-radius:9px; font-size:10px; font-weight:900;
        display:flex; align-items:center; justify-content:center;
        border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,.2);
      }
      #nxBtnSolicitudes .qa-i { position:relative; }
      .nxSol-card { transition: all 0.2s; }
      .nxSol-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); transform: translateY(-1px); }
      @media(max-width:768px) {
        .nxSol-actions { grid-template-columns: 1fr 1fr !important; }
        .nxSol-actions .btn { min-height: 44px !important; justify-content: center !important; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // ═══ AGREGAR AL MENÚ MÁS DEL MÓVIL ═══
  function agregarAMenuMas() {
    // El menú "Más" móvil se crea desde parches.js - lo hookeamos
    const intervalo = setInterval(() => {
      const sheet = document.querySelector('.mobile-more-sheet-clean');
      if (!sheet) return;
      if (document.getElementById('nxSolMobileBtn')) {
        clearInterval(intervalo);
        return;
      }
      
      // Crear botón en el menú Más
      const btn = document.createElement('div');
      btn.id = 'nxSolMobileBtn';
      btn.className = 'more-item';
      btn.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border-bottom:1px solid #f1f5f9;cursor:pointer;position:relative';
      btn.innerHTML = `
        <i class="ti ti-inbox" style="font-size:22px;color:#dc2626"></i>
        <span style="font-weight:700;color:#0f172a;flex:1">Solicitudes</span>
        <span class="nxSolBadge" id="nxSolBadgeMobile" style="display:none;position:static"></span>
      `;
      btn.onclick = function() {
        // Cerrar el sheet móvil
        sheet.classList.remove('open');
        setTimeout(() => window.nxAbrirSolicitudes(), 200);
      };
      
      sheet.insertBefore(btn, sheet.firstChild);
      clearInterval(intervalo);
      
      // Actualizar badge del menú móvil
      actualizarBadgeMobile();
    }, 500);
    
    // Detener después de 30 segundos
    setTimeout(() => clearInterval(intervalo), 30000);
  }
  
  async function actualizarBadgeMobile() {
    const badge = document.getElementById('nxSolBadgeMobile');
    if (!badge) return;
    const count = await contarPendientes();
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
  
  // ═══ INIT ═══
  function init() {
    injectCSS();
    
    let intentos = 0;
    const tryInit = function() {
      intentos++;
      agregarBotonDashboard();
      agregarAMenuMas();
      
      if (intentos < 20 && !document.getElementById('nxBtnSolicitudes')) {
        setTimeout(tryInit, 800);
      }
    };
    tryInit();
    
    // Actualizar badges cada 2 minutos
    setInterval(() => {
      actualizarBadge();
      actualizarBadgeMobile();
    }, 120000);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
