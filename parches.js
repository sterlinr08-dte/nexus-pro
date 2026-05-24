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

  function renderMetodoCard(tipo, valor, showZero) {
    if (!valor && !showZero) return "";
    const map = {
      efectivo: { bg: "#f0fdf4", bd: "#bbf7d0", tx: "#059669", label: "💵 EFECTIVO" },
      banco: { bg: "#eff6ff", bd: "#bfdbfe", tx: "#2563eb", label: "🏦 BANCO" },
      cheque: { bg: "#fffbeb", bd: "#fde68a", tx: "#d97706", label: "📝 CHEQUE" },
      otros: { bg: "#f8fafc", bd: "#e2e8f0", tx: "#64748b", label: "⋯ OTROS" }
    };
    const c = map[tipo] || map.otros;
    return '<div class="nx-method-card" style="background:' + c.bg + ';border-color:' + c.bd + ';color:' + c.tx + '"><span>' + c.label + '</span><b>' + money(valor) + '</b></div>';
  }

  function renderBanks(bancos) {
    const rows = Object.entries(bancos || {}).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return '<div class="nx-empty-soft">Sin bancos registrados.</div>';
    return rows.map(([banco, total]) => '<div class="nx-bank-row"><span>🏦 ' + esc(banco) + '</span><b>' + money(total) + '</b></div>').join("");
  }

  function renderAgentCard(stat) {
    const agente = stat.agente || {};
    const name = getAgenteNombre(agente);
    const pct = efectividad(stat);
    const clr = colorByPct(pct);
    const initials = getInitial(name);
    const bancos = Object.entries(stat.bancos || {}).sort((a, b) => b[1] - a[1]);

    return `
      <div class="nx-agent-card-v2">
        <div class="nx-agent-head-v2">
          <div class="nx-agent-avatar-v2">${esc(initials)}</div>
          <div class="nx-agent-info-v2">
            <div class="nx-agent-name-v2">${esc(name)}</div>
            <div class="nx-agent-role-v2">${esc(getAgenteRol(agente))}</div>
            <div class="nx-agent-license-v2">Licencia: ${esc(getAgenteLicencia(agente))}</div>
            <div class="nx-agent-clientes-v2">👥 ${stat.clientes || 0} clientes asignados</div>
          </div>
          <div class="nx-agent-effect-v2">
            <div class="nx-effect-circle-v2" style="--pct:${pct};--clr:${clr}"><span>${pct}%</span></div>
            <small>Efectividad</small>
          </div>
        </div>
        <div class="nx-agent-main-money">
          <span>COBRADO TOTAL</span>
          <b>${money(stat.total)}</b>
        </div>
        <div class="nx-agent-methods-v2">
          ${renderMetodoCard("efectivo", stat.efectivo, false)}
          ${renderMetodoCard("banco", stat.banco, false)}
          ${renderMetodoCard("cheque", stat.cheque, false)}
          ${renderMetodoCard("otros", stat.otros, false)}
          ${(!stat.efectivo && !stat.banco && !stat.cheque && !stat.otros) ? '<div class="nx-empty-soft">Sin cobros registrados.</div>' : ""}
        </div>
        ${bancos.length ? `
          <div class="nx-mini-title">Bancos recibidos</div>
          <div class="nx-bank-pills">
            ${bancos.map(([b, v]) => '<span>🏦 ' + esc(b) + ' · <b>' + money(v) + '</b></span>').join("")}
          </div>
        ` : ""}
        <div class="nx-agent-balance-grid">
          <div><span>PENDIENTE</span><b class="danger">${money(stat.pendiente)}</b></div>
          <div><span>EN MANO REAL</span><b class="${stat.enMano < 0 ? "danger" : "blue"}">${money(stat.enMano)}</b><small>Cobrado + recibido - entregado</small></div>
          <div><span>META</span><b>${stat.meta ? money(stat.meta) : "Sin meta"}</b></div>
        </div>
        <div class="nx-transfer-mini">
          <span>Recibido: <b>${money(stat.recibido)}</b></span>
          <span>Entregado: <b>${money(stat.entregado)}</b></span>
        </div>
        <div class="nx-progress-v2"><i style="width:${pct}%;background:${clr}"></i></div>
      </div>
    `;
  }

  function renderTransferHistory(transferencias) {
    if (!transferencias.length) return '<div class="nx-empty-soft">Sin transferencias registradas entre agentes.</div>';
    return `
      <div class="nx-transfer-table-wrap">
        <table><thead><tr><th>Fecha</th><th>Entrega</th><th>Recibe</th><th>Método</th><th>Banco</th><th>Monto</th><th>Ref.</th></tr></thead>
        <tbody>
          ${transferencias.map(t => `
            <tr>
              <td>${esc(String(t.fecha || t.created_at || "").slice(0, 10))}</td>
              <td>${esc(getAgenteNombreById(t.desde_agente || t.agente_origen || t.desde))}</td>
              <td>${esc(getAgenteNombreById(t.hacia_agente || t.agente_destino || t.hacia))}</td>
              <td>${esc(t.metodo || "—")}</td>
              <td>${esc(t.banco || "—")}</td>
              <td><b>${money(t.monto)}</b></td>
              <td>${esc(t.referencia || "—")}</td>
            </tr>
          `).join("")}
        </tbody></table>
      </div>
    `;
  }

  async function renderReporteAgentesV2(force = false) {
    const now = Date.now();
    if (isRendering) return;
    if (!force && now - lastRenderAt < 700) return;

    const cont = q("#rAgt");
    if (!cont) return;

    isRendering = true;
    lastRenderAt = now;

    try {
      let wrap = q("#nxReporteAgentesV2");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.id = "nxReporteAgentesV2";
        cont.insertAdjacentElement("afterbegin", wrap);
      }
      wrap.innerHTML = '<div class="nc p5 nx-loading-v2"><div class="loading"><div class="spin"></div> Cargando reporte premium...</div></div>';

      // Cargar agentes (con fallback a API si ST está vacío)
      await getAgentesAsync();

      const [abonos, transferencias] = await Promise.all([getAbonos(), getTransferencias()]);
      const stats = buildStats(abonos, transferencias);
      const general = generalFromStats(stats);

      wrap.innerHTML = `
        <div class="nc p5 nx-report-v2">
          <div class="ch nx-report-head-v2">
            <div>
              <div class="ct">💰 Reporte premium por agente</div>
              <div class="ct-s">Cobros reales, métodos, bancos, transferencias y dinero en mano</div>
            </div>
            <div class="nx-actions-v2">
              <button class="btn bsm bc5" type="button" onclick="window.nxAbrirTransferenciaAgenteV2()"><i class="ti ti-arrows-exchange"></i> Transferir entre agentes</button>
              <button class="btn bsm bc1" type="button" onclick="window.nxRefrescarReporteAgentesV2()"><i class="ti ti-refresh"></i> Actualizar</button>
            </div>
          </div>
          <div class="nx-top-summary-v2">
            <div class="green"><span>Total cobrado</span><b>${money(general.total)}</b></div>
            <div class="blue"><span>En mano real</span><b>${money(general.enMano)}</b></div>
            <div class="red"><span>Pendiente</span><b>${money(general.pendiente)}</b></div>
            <div class="gray"><span>Clientes asignados</span><b>${general.clientes}</b></div>
          </div>
          <div class="nx-method-summary-v2">
            ${renderMetodoCard("efectivo", general.efectivo, true)}
            ${renderMetodoCard("banco", general.banco, true)}
            ${renderMetodoCard("cheque", general.cheque, false)}
            ${renderMetodoCard("otros", general.otros, false)}
          </div>
          <div class="nx-two-cols-v2">
            <div class="nx-box-v2"><h3>🏦 Por banco</h3>${renderBanks(general.bancos)}</div>
            <div class="nx-box-v2"><h3>🔁 Historial de transferencias</h3>${renderTransferHistory(transferencias)}</div>
          </div>
          <div class="nx-agents-grid-v2">
            ${stats.length ? stats.map(renderAgentCard).join("") : '<div class="nx-empty-card-v2">No hay agentes o cobros registrados todavía.</div>'}
          </div>
        </div>
      `;
    } finally {
      isRendering = false;
    }
  }

  window.nxRefrescarReporteAgentesV2 = () => renderReporteAgentesV2(true);

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
      await renderReporteAgentesV2(true);
    } catch (e) {
      console.error("Error guardando transferencia:", e);
      toastSafe("err", "No se pudo guardar", "Verifica que exista la tabla transferencias_agentes en Supabase");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-check"></i> Guardar transferencia'; }
    }
  };

  function wrapReporteAgente() {
    if (window.__NEXUS_RREPAGT_V2_WRAPPED__) return;
    if (typeof window.rRepAgt !== "function") { setTimeout(wrapReporteAgente, 700); return; }
    window.__NEXUS_RREPAGT_V2_WRAPPED__ = true;
    const original = window.rRepAgt;
    window.rRepAgt = function () {
      const result = original.apply(this, arguments);
      setTimeout(() => renderReporteAgentesV2(true), 120);
      return result;
    };
  }

  function irAReporteAgente() {
    if (typeof window.nav === "function") {
      window.nav("rep-agente", null);
      setTimeout(() => {
        if (typeof window.rRepAgt === "function") window.rRepAgt();
        else renderReporteAgentesV2(true);
      }, 180);
      return;
    }
    const btn = qa("[onclick]").find(el => normalize(el.getAttribute("onclick")).includes("rep-agente"));
    if (btn) btn.click();
    setTimeout(() => renderReporteAgentesV2(true), 250);
  }

  function bindDashboardCobrado() {
    qa(".kpi, .card, .stat-card, .dashboard-card, [class*='kpi'], [class*='card'], .qa").forEach(card => {
      if (card.dataset.nxCobradoV2Bound === "1") return;
      const txt = normalize(card.innerText || card.textContent || "");
      if (!txt.includes("cobrado")) return;
      card.dataset.nxCobradoV2Bound = "1";
      card.style.cursor = "pointer";
      card.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        irAReporteAgente();
      }, true);
    });
  }

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
    wrapReporteAgente();
    bindDashboardCobrado();
    if (q("#v-rep-agente.view.on") && q("#rAgt")) {
      setTimeout(() => renderReporteAgentesV2(false), 250);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  document.addEventListener("click", function () {
    setTimeout(bindDashboardCobrado, 120);
  }, true);

  window.addEventListener("resize", function () {
    setTimeout(bindDashboardCobrado, 120);
  });
})();


/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - GESTIÓN DE BANCOS V61
   Código de ChatGPT integrado y validado por Claude
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NEXUS_BANCOS_V61__) return;
  window.__NEXUS_BANCOS_V61__ = true;

  const BANCOS_FALLBACK = [
    { id: 'fb_bhd', nombre: 'BHD', activo: true, fallback: true },
    { id: 'fb_banreservas', nombre: 'Banreservas', activo: true, fallback: true },
    { id: 'fb_popular', nombre: 'Popular', activo: true, fallback: true },
    { id: 'fb_asociacion_cibao', nombre: 'Asociación Cibao', activo: true, fallback: true },
    { id: 'fb_scotiabank', nombre: 'Scotiabank', activo: true, fallback: true },
    { id: 'fb_caribe', nombre: 'Caribe', activo: true, fallback: true },
    { id: 'fb_santa_cruz', nombre: 'Santa Cruz', activo: true, fallback: true },
    { id: 'fb_otros', nombre: 'Otros', activo: true, fallback: true }
  ];

  let bancosCache = [];
  let usandoFallback = false;
  let cargando = false;

  function getAPI() {
    try { return (typeof API !== 'undefined' && API) ? API : null; }
    catch (e) { return null; }
  }

  function toastSafe(type, title, msg) {
    if (typeof toast === 'function') toast(type, title, msg);
    else alert((title || '') + (msg ? '\n' + msg : ''));
  }

  function auditSafe(accion, detalle) {
    try {
      if (typeof logAudit === 'function') logAudit(accion, detalle, 'Bancos');
    } catch (e) {}
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function ordenarBancos(arr) {
    return [...arr].sort((a, b) => {
      if (norm(a.nombre) === 'otros') return 1;
      if (norm(b.nombre) === 'otros') return -1;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    });
  }

  function requiereBanco() {
    const valor = document.getElementById('aMet')?.value || '';
    const metodo = norm(valor);
    return metodo.includes('transferencia') || metodo.includes('deposito') || metodo.includes('depósito');
  }

  async function cargarBancos(force) {
    if (cargando && !force) return bancosCache.length ? bancosCache : BANCOS_FALLBACK;
    if (bancosCache.length && !force) return bancosCache;

    cargando = true;
    const api = getAPI();

    try {
      if (api && typeof api.get === 'function') {
        const data = await api.get('bancos', 'select=*&order=nombre.asc');
        if (Array.isArray(data) && data.length) {
          usandoFallback = false;
          bancosCache = ordenarBancos(data.map(b => ({
            id: b.id,
            nombre: b.nombre,
            activo: b.activo !== false,
            fallback: false
          })));
          return bancosCache;
        }
      }
    } catch (e) {
      console.warn('NEXUS Bancos V61: usando fallback', e);
    } finally {
      cargando = false;
    }

    usandoFallback = true;
    bancosCache = ordenarBancos(BANCOS_FALLBACK.map(b => ({ ...b })));
    return bancosCache;
  }

  function duplicado(nombre, excluirId) {
    const n = norm(nombre);
    return bancosCache.some(b => norm(b.nombre) === n && String(b.id) !== String(excluirId || ''));
  }

  async function bancoEnUso(nombre) {
    const api = getAPI();
    if (!api || typeof api.get !== 'function') return false;

    try {
      const data = await api.get('abonos', 'select=id,banco&limit=5000');
      return Array.isArray(data) && data.some(a => norm(a.banco) === norm(nombre));
    } catch (e) {
      return false;
    }
  }

  async function actualizarSelectBancoCobros() {
    const select = document.getElementById('aBanco');
    if (!select) return;

    const bancos = await cargarBancos();
    const activos = ordenarBancos(bancos.filter(b => b.activo !== false));
    const valorActual = select.value;
    const sinOtros = activos.filter(b => norm(b.nombre) !== 'otros');

    select.innerHTML =
      '<option value="">Seleccionar banco...</option>' +
      sinOtros.map(b => '<option value="' + esc(b.nombre) + '">' + esc(b.nombre) + '</option>').join('') +
      '<option value="Otros">Otros</option>';

    if (valorActual && Array.from(select.options).some(o => o.value === valorActual)) {
      select.value = valorActual;
    }
  }

  function actualizarVisibilidadBanco() {
    const cont = document.getElementById('aBancoCont');
    const otros = document.getElementById('aBancoOtrosCont');
    const sel = document.getElementById('aBanco');
    const inp = document.getElementById('aBancoOtros');

    if (!cont) return;

    if (requiereBanco()) {
      cont.style.display = '';
      if (sel?.value === 'Otros' && otros) otros.style.display = '';
    } else {
      cont.style.display = 'none';
      if (otros) otros.style.display = 'none';
      if (sel) sel.value = '';
      if (inp) inp.value = '';
    }
  }

  function asegurarCampoBanco() {
    const aMet = document.getElementById('aMet');
    if (!aMet) return;

    let select = document.getElementById('aBanco');

    if (!select) {
      const contMet = aMet.closest('.fr');
      if (!contMet || !contMet.parentNode) return;

      const divBanco = document.createElement('div');
      divBanco.className = 'fr';
      divBanco.id = 'aBancoCont';
      divBanco.style.display = 'none';
      divBanco.innerHTML = '<label>Banco *</label><select id="aBanco" style="width:100%"><option value="">Seleccionar banco...</option></select>';

      const divOtros = document.createElement('div');
      divOtros.className = 'fr';
      divOtros.id = 'aBancoOtrosCont';
      divOtros.style.display = 'none';
      divOtros.innerHTML = '<label>Especificar banco *</label><input type="text" id="aBancoOtros" placeholder="Nombre del banco" style="width:100%">';

      contMet.parentNode.insertBefore(divBanco, contMet.nextSibling);
      contMet.parentNode.insertBefore(divOtros, divBanco.nextSibling);
      select = document.getElementById('aBanco');
    }

    if (!aMet.__nxBancoV61Change) {
      aMet.__nxBancoV61Change = true;
      aMet.addEventListener('change', actualizarVisibilidadBanco);
    }

    if (select && !select.__nxBancoV61Change) {
      select.__nxBancoV61Change = true;
      select.addEventListener('change', function () {
        const otros = document.getElementById('aBancoOtrosCont');
        const inp = document.getElementById('aBancoOtros');

        if (this.value === 'Otros') {
          if (otros) otros.style.display = '';
        } else {
          if (otros) otros.style.display = 'none';
          if (inp) inp.value = '';
        }
      });
    }

    agregarBotonGestion();
    actualizarSelectBancoCobros();
    actualizarVisibilidadBanco();
  }

  function agregarBotonGestion() {
    const select = document.getElementById('aBanco');
    if (!select) return;
    if (document.getElementById('btnGestionarBancos')) return;

    const cont = select.closest('.fr') || select.parentElement;
    if (!cont) return;

    const btn = document.createElement('button');
    btn.id = 'btnGestionarBancos';
    btn.type = 'button';
    btn.className = 'btn bsm bghost';
    btn.style.marginTop = '6px';
    btn.innerHTML = '<i class="ti ti-building-bank"></i> Gestionar bancos';
    btn.onclick = abrirModalBancos;

    cont.appendChild(btn);
  }

  function crearModal() {
    if (document.getElementById('mBancos')) return;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.id = 'mBancos';
    overlay.innerHTML = `
      <div class="modal" style="max-width:620px">
        <div class="mt">
          <span>// GESTIONAR BANCOS</span>
          <button class="btn bghost bsm" type="button" onclick="window.nxCerrarModalBancos()">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div class="gf2">
          <div class="fr">
            <label>Nombre del banco</label>
            <input type="text" id="nxBancoNombre" placeholder="Ej: Banco López">
          </div>
          <div class="fr" style="display:flex;align-items:end">
            <button class="btn bxl bc1" type="button" onclick="window.nxAgregarBancoDesdeUI()">
              <i class="ti ti-plus"></i> Agregar banco
            </button>
          </div>
        </div>
        <div class="div"></div>
        <div id="nxListaBancos"></div>
        <div class="fe">
          <button class="btn" type="button" onclick="window.nxCerrarModalBancos()">Cerrar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  async function abrirModalBancos() {
    crearModal();
    await cargarBancos(true);
    renderLista();
    document.getElementById('mBancos')?.classList.add('open');
  }

  function cerrarModalBancos() {
    document.getElementById('mBancos')?.classList.remove('open');
  }

  function renderLista() {
    const cont = document.getElementById('nxListaBancos');
    if (!cont) return;

    if (!bancosCache.length) {
      cont.innerHTML = '<div style="padding:14px;color:#64748b">No hay bancos registrados.</div>';
      return;
    }

    cont.innerHTML = '<div style="display:grid;gap:8px">' + bancosCache.map(b => 
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">' +
        '<div>' +
          '<div style="font-weight:900;color:#0f172a">🏦 ' + esc(b.nombre) + '</div>' +
          '<div style="font-size:11px;color:' + (b.activo ? '#059669' : '#dc2626') + ';font-weight:800">' +
            (b.activo ? 'Activo' : 'Inactivo') + (b.fallback ? ' · Temporal' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">' +
          '<button class="btn bsm bghost" type="button" onclick="window.nxEditarBanco(\'' + esc(b.id) + '\')">' +
            '<i class="ti ti-edit"></i> Editar</button>' +
          '<button class="btn bsm ' + (b.activo ? 'bghost' : 'bc1') + '" type="button" onclick="window.nxToggleBanco(\'' + esc(b.id) + '\')">' +
            '<i class="ti ' + (b.activo ? 'ti-circle-off' : 'ti-check') + '"></i> ' + (b.activo ? 'Desactivar' : 'Activar') + '</button>' +
          '<button class="btn bsm bghost" type="button" onclick="window.nxEliminarBanco(\'' + esc(b.id) + '\')">' +
            '<i class="ti ti-trash"></i> Eliminar</button>' +
        '</div>' +
      '</div>'
    ).join('') + '</div>';
  }

  async function agregarBanco(nombre) {
    nombre = String(nombre || '').trim();

    if (!nombre) {
      toastSafe('err', 'Nombre requerido', 'Escribe el nombre del banco');
      return false;
    }

    await cargarBancos();

    if (duplicado(nombre)) {
      toastSafe('err', 'Banco duplicado', 'Ese banco ya existe');
      return false;
    }

    const api = getAPI();

    if (usandoFallback || !api?.post) {
      bancosCache.push({ id: 'tmp_' + Date.now(), nombre, activo: true, fallback: true });
      bancosCache = ordenarBancos(bancosCache);
      toastSafe('ok', 'Banco agregado temporalmente', nombre);
      auditSafe('BANCO_TEMP_AGREGADO', nombre);
      await actualizarSelectBancoCobros();
      renderLista();
      return true;
    }

    try {
      await api.post('bancos', { nombre, activo: true });
      toastSafe('ok', 'Banco agregado', nombre);
      auditSafe('BANCO_AGREGADO', nombre);
      await cargarBancos(true);
      await actualizarSelectBancoCobros();
      renderLista();
      return true;
    } catch (e) {
      console.error('Error agregando banco:', e);
      toastSafe('err', 'No se pudo agregar', 'Verifica permisos o duplicados');
      return false;
    }
  }

  async function editarBanco(id, nuevoNombre) {
    nuevoNombre = String(nuevoNombre || '').trim();

    if (!nuevoNombre) {
      toastSafe('err', 'Nombre requerido', 'El nombre no puede estar vacío');
      return false;
    }

    await cargarBancos();

    const banco = bancosCache.find(b => String(b.id) === String(id));
    if (!banco) {
      toastSafe('err', 'No encontrado', 'No se encontró el banco');
      return false;
    }

    if (duplicado(nuevoNombre, id)) {
      toastSafe('err', 'Banco duplicado', 'Ya existe un banco con ese nombre');
      return false;
    }

    const api = getAPI();

    if (banco.fallback || usandoFallback || !api?.patch) {
      banco.nombre = nuevoNombre;
      bancosCache = ordenarBancos(bancosCache);
      toastSafe('ok', 'Banco editado temporalmente', nuevoNombre);
      auditSafe('BANCO_TEMP_EDITADO', nuevoNombre);
      await actualizarSelectBancoCobros();
      renderLista();
      return true;
    }

    try {
      await api.patch('bancos', 'id=eq.' + id, { nombre: nuevoNombre });
      toastSafe('ok', 'Banco actualizado', nuevoNombre);
      auditSafe('BANCO_EDITADO', banco.nombre + ' → ' + nuevoNombre);
      await cargarBancos(true);
      await actualizarSelectBancoCobros();
      renderLista();
      return true;
    } catch (e) {
      console.error('Error editando banco:', e);
      toastSafe('err', 'No se pudo editar', 'Verifica permisos o duplicados');
      return false;
    }
  }

  async function toggleBanco(id) {
    await cargarBancos();
    const banco = bancosCache.find(b => String(b.id) === String(id));
    if (!banco) return;

    const nuevo = !banco.activo;
    const api = getAPI();

    if (banco.fallback || usandoFallback || !api?.patch) {
      banco.activo = nuevo;
      toastSafe('ok', nuevo ? 'Banco activado' : 'Banco desactivado', banco.nombre);
      auditSafe(nuevo ? 'BANCO_TEMP_ACTIVADO' : 'BANCO_TEMP_DESACTIVADO', banco.nombre);
      await actualizarSelectBancoCobros();
      renderLista();
      return;
    }

    try {
      await api.patch('bancos', 'id=eq.' + id, { activo: nuevo });
      toastSafe('ok', nuevo ? 'Banco activado' : 'Banco desactivado', banco.nombre);
      auditSafe(nuevo ? 'BANCO_ACTIVADO' : 'BANCO_DESACTIVADO', banco.nombre);
      await cargarBancos(true);
      await actualizarSelectBancoCobros();
      renderLista();
    } catch (e) {
      console.error('Error cambiando banco:', e);
      toastSafe('err', 'No se pudo actualizar', 'Verifica permisos');
    }
  }

  async function eliminarBanco(id) {
    await cargarBancos();
    const banco = bancosCache.find(b => String(b.id) === String(id));
    if (!banco) return;

    if (!confirm('¿Seguro que deseas eliminar/desactivar este banco?\n\n' + banco.nombre)) return;

    const usado = await bancoEnUso(banco.nombre);
    const api = getAPI();

    if (usado) {
      toastSafe('err', 'Banco en uso', 'Este banco tiene abonos asociados. Se desactivará.');
      banco.activo = false;

      if (!banco.fallback && !usandoFallback && api?.patch) {
        try { await api.patch('bancos', 'id=eq.' + id, { activo: false }); } catch (e) {}
      }

      auditSafe('BANCO_DESACTIVADO_EN_USO', banco.nombre);
      await cargarBancos(true);
      await actualizarSelectBancoCobros();
      renderLista();
      return;
    }

    if (banco.fallback || usandoFallback || !api?.delete) {
      bancosCache = bancosCache.filter(b => String(b.id) !== String(id));
      toastSafe('ok', 'Banco eliminado temporalmente', banco.nombre);
      auditSafe('BANCO_TEMP_ELIMINADO', banco.nombre);
      await actualizarSelectBancoCobros();
      renderLista();
      return;
    }

    try {
      await api.delete('bancos', 'id=eq.' + id);
      toastSafe('ok', 'Banco eliminado', banco.nombre);
      auditSafe('BANCO_ELIMINADO', banco.nombre);
      await cargarBancos(true);
      await actualizarSelectBancoCobros();
      renderLista();
    } catch (e) {
      console.error('Error eliminando banco:', e);
      toastSafe('err', 'No se pudo eliminar', 'Se desactivará en su lugar');
      await toggleBanco(id);
    }
  }

  function wrapRegAbono() {
    if (typeof window.regAbono !== 'function') {
      setTimeout(wrapRegAbono, 500);
      return;
    }

    if (window.regAbono.__nxBancoV61Wrapped) return;

    const original = window.regAbono;

    const wrapped = async function () {
      // Validar agente
      const aAgente = document.getElementById('aAgente');
      if (!aAgente || !aAgente.value) {
        toastSafe('err', 'Agente requerido', 'Selecciona el agente que cobró');
        return;
      }
      
      // Validar referencia
      const aRef = document.getElementById('aRef');
      if (!aRef || !aRef.value || !aRef.value.trim()) {
        toastSafe('err', 'Referencia requerida', 'Escribe una referencia');
        return;
      }
      
      if (requiereBanco()) {
        const banco = document.getElementById('aBanco')?.value || '';

        if (!banco) {
          toastSafe('err', 'Banco requerido', 'Selecciona el banco del cobro');
          return;
        }

        if (banco === 'Otros') {
          const otro = document.getElementById('aBancoOtros')?.value?.trim();
          if (!otro) {
            toastSafe('err', 'Banco requerido', 'Escribe el nombre del banco');
            return;
          }
        }
      }

      const api = getAPI();
      const postOriginal = api?.post;

      if (api && postOriginal) {
        api.post = async function (tabla, datos) {
          if (tabla === 'abonos' && datos) {
            const bancoSel = document.getElementById('aBanco')?.value || '';
            const bancoFinal = bancoSel === 'Otros'
              ? document.getElementById('aBancoOtros')?.value?.trim()
              : bancoSel;

            if (bancoFinal) datos.banco = bancoFinal;
          }

          return postOriginal.call(this, tabla, datos);
        };
      }

      try {
        return await original.apply(this, arguments);
      } finally {
        if (api && postOriginal) api.post = postOriginal;
      }
    };

    wrapped.__nxBancoV61Wrapped = true;
    window.regAbono = wrapped;
  }

  window.nxAbrirModalBancos = abrirModalBancos;
  window.nxCerrarModalBancos = cerrarModalBancos;

  window.nxAgregarBancoDesdeUI = async function () {
    const inp = document.getElementById('nxBancoNombre');
    const ok = await agregarBanco(inp ? inp.value : '');
    if (ok && inp) inp.value = '';
  };

  window.nxEditarBanco = async function (id) {
    await cargarBancos();
    const banco = bancosCache.find(b => String(b.id) === String(id));
    if (!banco) return;

    const nuevo = prompt('Nuevo nombre del banco:', banco.nombre);
    if (nuevo === null) return;

    await editarBanco(id, nuevo);
  };

  window.nxToggleBanco = toggleBanco;
  window.nxEliminarBanco = eliminarBanco;
  window.nxActualizarSelectBancoCobros = actualizarSelectBancoCobros;

  function init() {
    crearModal();
    asegurarCampoBanco();
    wrapRegAbono();

    const mAbono = document.getElementById('mAbono');
    if (mAbono && !mAbono.__nxBancoV61Obs) {
      mAbono.__nxBancoV61Obs = true;

      const obs = new MutationObserver(function () {
        setTimeout(function () {
          asegurarCampoBanco();
          wrapRegAbono();
        }, 100);
      });

      obs.observe(mAbono, { attributes: true, attributeFilter: ['class', 'style'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('click', function () {
    setTimeout(function () {
      asegurarCampoBanco();
      wrapRegAbono();
    }, 120);
  }, true);
})();


/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BANCOS V64 (Gestión como pestaña en Configuración)
   Código de ChatGPT integrado y validado por Claude
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NEXUS_BANCOS_CONFIG_TAB_V64__) return;
  window.__NEXUS_BANCOS_CONFIG_TAB_V64__ = true;

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function getST() {
    try { return (typeof ST !== 'undefined' && ST) ? ST : {}; }
    catch (e) { return {}; }
  }

  function getUser() {
    const st = getST();
    return st.usuario || st.user || st.sessionUser || window.sessionUser || window.user || null;
  }

  function toastSafe(type, title, msg) {
    if (typeof toast === 'function') toast(type, title, msg);
    else alert((title || '') + (msg ? '\n' + msg : ''));
  }

  function tienePermisoBancos() {
    const u = getUser();
    if (!u) return true; // Si no detecta usuario, no bloquea
    const rol = norm(u.rol || u.role || u.tipo || u.perfil || u.cargo || '');
    if (rol.includes('admin') || rol.includes('superadmin') || rol.includes('super admin') || rol.includes('administrador')) {
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
    toastSafe('err', 'Sin permiso', 'No tienes permiso para gestionar bancos.');
    return true;
  }

  function quitarBotonesViejos() {
    const btnCobro = document.getElementById('btnGestionarBancos');
    if (btnCobro) btnCobro.remove();
  }

  function buscarConfigRoot() {
    return document.querySelector('#v-config') || document.querySelector('#config') ||
           document.querySelector('[data-view="config"]');
  }

  function buscarBarraTabsConfig(root) {
    if (!root) return null;
    const candidatos = Array.from(root.querySelectorAll('div, nav, section'));
    return candidatos.find(el => {
      const txt = norm(el.textContent || '');
      const botones = el.querySelectorAll('button').length;
      return botones >= 3 && (txt.includes('empresa') || txt.includes('notificacion') || 
             txt.includes('automatizacion') || txt.includes('agentes') || txt.includes('usuarios'));
    });
  }

  function buscarAreaContenidoConfig(root) {
    if (!root) return null;
    const paneles = Array.from(root.querySelectorAll('.nc, .card, .panel, section, form, div'));
    const posible = paneles.find(el => {
      const txt = norm((el.textContent || '').slice(0, 300));
      return txt.includes('datos de la correduria') || txt.includes('datos de la correduría') ||
             txt.includes('notificaciones') || txt.includes('agentes / corredores');
    });
    return posible?.parentElement || root;
  }

  function crearTabBancos() {
    const root = buscarConfigRoot();
    if (!root) return;
    quitarBotonesViejos();
    if (document.getElementById('nxConfigTabBancosV64')) return;
    const tabs = buscarBarraTabsConfig(root);
    const btn = document.createElement('button');
    btn.id = 'nxConfigTabBancosV64';
    btn.type = 'button';
    btn.className = 'btn bghost';
    btn.innerHTML = '<i class="ti ti-building-bank"></i> BANCOS';
    btn.onclick = function () { abrirPanelBancosConfig(); };
    if (tabs) {
      tabs.appendChild(btn);
    } else {
      const bar = document.createElement('div');
      bar.id = 'nxConfigBancoFallbackBarV64';
      bar.className = 'nc p3';
      bar.style.marginBottom = '10px';
      bar.appendChild(btn);
      root.insertAdjacentElement('afterbegin', bar);
    }
  }

  function ocultarPanelesConfig(root) {
    if (!root) return;
    const area = buscarAreaContenidoConfig(root);
    if (!area) return;
    Array.from(area.children).forEach(child => {
      if (child.id === 'nxPanelBancosConfigV64') return;
      if (child.id === 'nxConfigBancoFallbackBarV64') return;
      const txt = norm(child.textContent || '');
      if (txt.includes('empresa') && txt.includes('notificaciones') && txt.includes('agentes')) return;
      child.dataset.nxBancosPrevDisplay = child.style.display || '';
      child.style.display = 'none';
    });
  }

  function restaurarPanelesConfig(root) {
    if (!root) return;
    const area = buscarAreaContenidoConfig(root);
    if (!area) return;
    Array.from(area.children).forEach(child => {
      if (child.id === 'nxPanelBancosConfigV64') return;
      if (child.dataset.nxBancosPrevDisplay !== undefined) {
        child.style.display = child.dataset.nxBancosPrevDisplay;
        delete child.dataset.nxBancosPrevDisplay;
      }
    });
  }

  async function esperarModuloBancos() {
    for (let i = 0; i < 25; i++) {
      if (typeof window.nxAbrirModalBancos === 'function') return true;
      await new Promise(r => setTimeout(r, 250));
    }
    return false;
  }

  function crearPanelBancos() {
    const root = buscarConfigRoot();
    if (!root) return null;
    let panel = document.getElementById('nxPanelBancosConfigV64');
    if (panel) return panel;
    const area = buscarAreaContenidoConfig(root);
    panel = document.createElement('div');
    panel.id = 'nxPanelBancosConfigV64';
    panel.className = 'nc p5';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="ch">
        <div>
          <div class="ct">🏦 GESTIÓN DE BANCOS</div>
          <div class="ct-s">Administra los bancos disponibles para cobros</div>
        </div>
        <button class="btn bsm bghost" type="button" onclick="window.nxCerrarPanelBancosConfigV64()">
          <i class="ti ti-arrow-left"></i> Volver
        </button>
      </div>
      <div style="display:grid;gap:12px;margin-top:12px">
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:14px;color:#1e3a8a;font-size:12px;font-weight:800">
          Este módulo controla los bancos que aparecen al registrar un cobro.
        </div>
        <button class="btn bxl bc1" type="button" onclick="window.nxAbrirBancosConfigV64()">
          <i class="ti ti-building-bank"></i> Abrir gestión de bancos
        </button>
      </div>
    `;
    (area || root).appendChild(panel);
    return panel;
  }

  function marcarTabActivo() {
    const btn = document.getElementById('nxConfigTabBancosV64');
    if (!btn) return;
    const root = buscarConfigRoot();
    if (root) {
      root.querySelectorAll('button').forEach(b => {
        if (b.id !== 'nxConfigTabBancosV64') b.classList.remove('active', 'on');
      });
    }
    btn.classList.add('active');
  }

  function abrirPanelBancosConfig() {
    if (bloquearSiNoTienePermiso()) return;
    const root = buscarConfigRoot();
    if (!root) return;
    const panel = crearPanelBancos();
    if (!panel) return;
    ocultarPanelesConfig(root);
    panel.style.display = '';
    marcarTabActivo();
  }

  window.nxCerrarPanelBancosConfigV64 = function () {
    const root = buscarConfigRoot();
    const panel = document.getElementById('nxPanelBancosConfigV64');
    if (panel) panel.style.display = 'none';
    restaurarPanelesConfig(root);
    const btn = document.getElementById('nxConfigTabBancosV64');
    if (btn) btn.classList.remove('active', 'on');
  };

  window.nxAbrirBancosConfigV64 = async function () {
    if (bloquearSiNoTienePermiso()) return;
    const ok = await esperarModuloBancos();
    if (!ok || typeof window.nxAbrirModalBancos !== 'function') {
      toastSafe('err', 'Módulo no disponible', 'Gestión de bancos no cargó. Recarga.');
      return;
    }
    window.nxAbrirModalBancos();
    setTimeout(function () { protegerAccionesModalBancos(); }, 400);
  };

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
      } else {
        btn.disabled = true;
        btn.style.opacity = '.45';
        btn.style.pointerEvents = 'none';
      }
    });
    let aviso = document.getElementById('nxBancosPermisoAvisoV64');
    if (!permitido && !aviso) {
      aviso = document.createElement('div');
      aviso.id = 'nxBancosPermisoAvisoV64';
      aviso.style.cssText = 'background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:10px;margin:10px 0;font-size:12px;font-weight:800;';
      aviso.textContent = 'No tienes permiso para modificar bancos.';
      const lista = document.getElementById('nxListaBancos');
      if (lista && lista.parentNode) lista.parentNode.insertBefore(aviso, lista);
    }
    if (permitido && aviso) aviso.remove();
  }

  function wrapAccionesBancos() {
    ['nxAgregarBancoDesdeUI', 'nxEditarBanco', 'nxToggleBanco', 'nxEliminarBanco'].forEach(nombre => {
      const fn = window[nombre];
      if (typeof fn !== 'function') return;
      if (fn.__v64PermisoWrapped) return;
      const original = fn;
      const wrapped = function () {
        if (bloquearSiNoTienePermiso()) return;
        return original.apply(this, arguments);
      };
      wrapped.__v64PermisoWrapped = true;
      window[nombre] = wrapped;
    });
  }

  function injectCSS() {
    if (document.getElementById('nx-bancos-config-tab-v64-css')) return;
    const style = document.createElement('style');
    style.id = 'nx-bancos-config-tab-v64-css';
    style.textContent = `
      #mAbono #btnGestionarBancos { display: none !important; }
      #nxConfigTabBancosV64 { white-space: nowrap !important; }
      #nxConfigTabBancosV64.active, #nxConfigTabBancosV64.on {
        background: #2563eb !important; color: #fff !important; border-color: #2563eb !important;
      }
      #nxPanelBancosConfigV64 { border-top: 4px solid #d97706 !important; }
      @media(max-width:768px) {
        #nxConfigTabBancosV64 { min-height: 46px !important; padding-left: 14px !important; padding-right: 14px !important; }
        #nxPanelBancosConfigV64 .ch { display: grid !important; grid-template-columns: 1fr !important; gap: 10px !important; }
        #nxPanelBancosConfigV64 .btn { width: 100% !important; justify-content: center !important; min-height: 48px !important; }
        #mBancos.overlay, #mBancos.overlay.open, #mBancos.overlay.on { z-index: 12000 !important; }
        #mBancos .modal { width: calc(100vw - 24px) !important; max-width: calc(100vw - 24px) !important; max-height: 84vh !important; overflow-y: auto !important; padding-bottom: 120px !important; box-sizing: border-box !important; }
        #nxListaBancos > div { display: grid !important; gap: 10px !important; }
        #nxListaBancos > div > div { display: grid !important; grid-template-columns: 1fr !important; gap: 10px !important; padding: 14px !important; }
        #nxListaBancos > div > div > div:last-child { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 6px !important; }
        #nxListaBancos button { width: 100% !important; height: 44px !important; font-size: 10px !important; }
        #mBancos .gf2 { display: grid !important; grid-template-columns: 1fr !important; gap: 10px !important; }
        #mBancos #nxBancoNombre { width: 100% !important; min-height: 44px !important; font-size: 16px !important; }
        #mBancos .gf2 .btn { width: 100% !important; min-height: 48px !important; }
        #mBancos .fe { position: sticky !important; bottom: 0 !important; background: rgba(255,255,255,.96) !important; padding-top: 10px !important; padding-bottom: 10px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function init() {
    injectCSS();
    quitarBotonesViejos();
    crearTabBancos();
    crearPanelBancos();
    wrapAccionesBancos();
    protegerAccionesModalBancos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // OBSERVADOR LIGERO - solo cuando hay cambios al root de config
  const obs = new MutationObserver(function () {
    setTimeout(function () {
      quitarBotonesViejos();
      crearTabBancos();
    }, 200);
  });
  // Observar solo el body para reducir carga
  obs.observe(document.body, { childList: true, subtree: false });

})();
/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BANCOS V66
   Corrección final: Bancos como ventana propia dentro de Configuración
   PEGAR AL FINAL DE parches.js
   Cargar con: parches.js?v=66
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NEXUS_BANCOS_CONFIG_V66__) return;
  window.__NEXUS_BANCOS_CONFIG_V66__ = true;

  let bancosV66 = [];
  let hiddenV66 = [];
  let loadingV66 = false;

  const FALLBACK = [
    { id:'fb_bhd', nombre:'BHD', activo:true },
    { id:'fb_banreservas', nombre:'Banreservas', activo:true },
    { id:'fb_popular', nombre:'Popular', activo:true },
    { id:'fb_asociacion', nombre:'Asociación Cibao', activo:true },
    { id:'fb_scotiabank', nombre:'Scotiabank', activo:true },
    { id:'fb_caribe', nombre:'Caribe', activo:true },
    { id:'fb_santa_cruz', nombre:'Santa Cruz', activo:true },
    { id:'fb_otros', nombre:'Otros', activo:true }
  ];

  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.from((r || document).querySelectorAll(s)); }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getAPI() {
    try { return (typeof API !== 'undefined' && API) ? API : null; }
    catch(e) { return null; }
  }

  function getST() {
    try { return (typeof ST !== 'undefined' && ST) ? ST : {}; }
    catch(e) { return {}; }
  }

  function getUser() {
    const st = getST();
    return st.usuario || st.user || st.sessionUser || window.sessionUser || window.user || null;
  }

  function toastSafe(type, title, msg) {
    if (typeof toast === 'function') toast(type, title, msg);
    else alert((title || '') + (msg ? '\n' + msg : ''));
  }

  function auditSafe(accion, detalle) {
    try {
      if (typeof logAudit === 'function') logAudit(accion, detalle, 'Bancos');
    } catch(e) {}
  }

  function tienePermiso() {
    const u = getUser();

    if (!u) return true;

    const rol = norm(u.rol || u.role || u.tipo || u.perfil || u.cargo || '');

    if (
      rol.includes('admin') ||
      rol.includes('administrador') ||
      rol.includes('superadmin') ||
      rol.includes('super admin')
    ) {
      return true;
    }

    const permisos = u.permisos || u.permissions || u.claims?.permisos || [];

    if (Array.isArray(permisos)) return permisos.map(norm).includes('gestionar_bancos');

    if (typeof permisos === 'object' && permisos) {
      return permisos.gestionar_bancos === true || permisos.bancos === true;
    }

    return false;
  }

  function bloquear() {
    if (tienePermiso()) return false;
    toastSafe('err', 'Sin permiso', 'No tienes permiso para gestionar bancos.');
    return true;
  }

  function ordenar(arr) {
    return [...arr].sort((a, b) => {
      if (norm(a.nombre) === 'otros') return 1;
      if (norm(b.nombre) === 'otros') return -1;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    });
  }

  async function cargarBancos(force) {
    if (loadingV66 && !force) return bancosV66.length ? bancosV66 : FALLBACK;
    if (bancosV66.length && !force) return bancosV66;

    loadingV66 = true;

    const api = getAPI();

    try {
      if (api && typeof api.get === 'function') {
        const data = await api.get('bancos', 'select=*&order=nombre.asc');

        if (Array.isArray(data) && data.length) {
          bancosV66 = ordenar(data.map(b => ({
            id: b.id,
            nombre: b.nombre,
            activo: b.activo !== false
          })));
          return bancosV66;
        }
      }
    } catch(e) {
      console.warn('Bancos V66 fallback:', e);
    } finally {
      loadingV66 = false;
    }

    bancosV66 = ordenar(FALLBACK.map(b => ({...b})));
    return bancosV66;
  }

  function duplicado(nombre, excluirId) {
    const n = norm(nombre);
    return bancosV66.some(b => norm(b.nombre) === n && String(b.id) !== String(excluirId || ''));
  }

  async function bancoEnUso(nombre) {
    const api = getAPI();
    if (!api || typeof api.get !== 'function') return false;

    try {
      const data = await api.get('abonos', 'select=id,banco&limit=5000');
      return Array.isArray(data) && data.some(a => norm(a.banco) === norm(nombre));
    } catch(e) {
      return false;
    }
  }

  async function refrescarSelectCobros() {
    if (typeof window.nxActualizarSelectBancoCobros === 'function') {
      try { await window.nxActualizarSelectBancoCobros(); } catch(e) {}
    }
  }

  function rootConfig() {
    return q('#v-config') || q('#config') || q('[data-view="config"]');
  }

  function tabsConfig(root) {
    if (!root) return null;

    return qa('div, nav, section', root).find(el => {
      const txt = norm(el.textContent || '');
      const btns = el.querySelectorAll('button').length;
      return btns >= 2 &&
        (
          txt.includes('empresa') ||
          txt.includes('notificacion') ||
          txt.includes('apariencia') ||
          txt.includes('coberturas') ||
          txt.includes('agentes') ||
          txt.includes('usuarios') ||
          txt.includes('roles')
        );
    });
  }

  function hideConfigContent() {
    const root = rootConfig();
    if (!root) return;

    hiddenV66.forEach(([el, display]) => { if (el) el.style.display = display; });
    hiddenV66 = [];

    const panel = q('#nxPanelBancosV66');

    qa(':scope > *', root).forEach(el => {
      if (el === panel) return;
      if (el.id === 'nxBancoFallbackTabBarV66') return;
      if (el.contains(q('#nxConfigTabBancosV66'))) return;

      const txt = norm(el.textContent || '');

      // No ocultar la barra de pestañas.
      if (
        txt.includes('bancos') &&
        (
          txt.includes('apariencia') ||
          txt.includes('coberturas') ||
          txt.includes('empresa') ||
          txt.includes('notificacion') ||
          txt.includes('agentes')
        )
      ) {
        return;
      }

      hiddenV66.push([el, el.style.display || '']);
      el.style.display = 'none';
    });
  }

  function restoreConfigContent() {
    hiddenV66.forEach(([el, display]) => {
      if (el && el.style) el.style.display = display;
    });

    hiddenV66 = [];

    const panel = q('#nxPanelBancosV66');
    if (panel) panel.style.display = 'none';

    q('#nxConfigTabBancosV66')?.classList.remove('active', 'on');
  }

  function createTab() {
    const root = rootConfig();
    if (!root) return;

    q('#btnGestionarBancos')?.remove();
    q('#nxBtnConfigBancosV63')?.remove();
    q('#nxConfigTabBancosV64')?.remove();
    q('#nxPanelBancosConfigV64')?.remove();
    q('#nxPanelBancosV65')?.remove();
    q('#nxConfigTabBancosV65')?.remove();

    if (q('#nxConfigTabBancosV66')) return;

    const btn = document.createElement('button');
    btn.id = 'nxConfigTabBancosV66';
    btn.type = 'button';
    btn.className = 'btn bghost';
    btn.innerHTML = '<i class="ti ti-building-bank"></i> BANCOS';
    btn.onclick = openPanel;

    const tabs = tabsConfig(root);

    if (tabs) {
      tabs.appendChild(btn);
    } else {
      const bar = document.createElement('div');
      bar.id = 'nxBancoFallbackTabBarV66';
      bar.className = 'nc p3';
      bar.style.marginBottom = '10px';
      bar.appendChild(btn);
      root.insertAdjacentElement('afterbegin', bar);
    }
  }

  function createPanel() {
    const root = rootConfig();
    if (!root) return null;

    let panel = q('#nxPanelBancosV66');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'nxPanelBancosV66';
    panel.className = 'nc p5';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="ch nxBancosHeaderV66">
        <div>
          <div class="ct">🏦 GESTIÓN DE BANCOS</div>
          <div class="ct-s">Administra bancos disponibles para cobros por transferencia o depósito</div>
        </div>
        <button class="btn bsm bghost" type="button" onclick="window.nxCerrarPanelBancosV66()">
          <i class="ti ti-arrow-left"></i> Volver
        </button>
      </div>

      <div class="nxBancosInfoV66">
        Este módulo controla los bancos que aparecen al registrar un cobro.
      </div>

      <div class="nxBancosFormV66">
        <div class="fr">
          <label>Nombre del banco</label>
          <input type="text" id="nxBancoNombreV66" placeholder="Ej: Banco López">
        </div>
        <button class="btn bxl bc1" type="button" onclick="window.nxAgregarBancoV66()">
          <i class="ti ti-plus"></i> Agregar banco
        </button>
      </div>

      <div class="div"></div>

      <div id="nxListaBancosV66"></div>
    `;

    const tabs = tabsConfig(root);
    if (tabs) tabs.insertAdjacentElement('afterend', panel);
    else root.insertAdjacentElement('afterbegin', panel);

    return panel;
  }

  async function openPanel() {
    if (bloquear()) return;

    const panel = createPanel();
    if (!panel) return;

    hideConfigContent();

    panel.style.display = '';
    q('#nxConfigTabBancosV66')?.classList.add('active');

    await cargarBancos(true);
    renderList();
  }

  function renderList() {
    const cont = q('#nxListaBancosV66');
    if (!cont) return;

    const puede = tienePermiso();

    if (!bancosV66.length) {
      cont.innerHTML = '<div class="nxBancosEmptyV66">No hay bancos registrados.</div>';
      return;
    }

    cont.innerHTML = `
      <div class="nxBancosListV66">
        ${bancosV66.map(b => `
          <div class="nxBancosRowV66">
            <div class="nxBancosNameBoxV66">
              <div class="nxBancosNameV66">🏦 ${esc(b.nombre)}</div>
              <div class="nxBancosStateV66 ${b.activo ? 'ok' : 'off'}">${b.activo ? 'ACTIVO' : 'INACTIVO'}</div>
            </div>

            <div class="nxBancosActionsV66">
              <button class="btn bsm bghost" type="button" ${puede ? '' : 'disabled'} onclick="window.nxEditarBancoV66('${esc(b.id)}')">
                <i class="ti ti-edit"></i> Editar
              </button>
              <button class="btn bsm ${b.activo ? 'bghost' : 'bc1'}" type="button" ${puede ? '' : 'disabled'} onclick="window.nxToggleBancoV66('${esc(b.id)}')">
                <i class="ti ${b.activo ? 'ti-circle-off' : 'ti-check'}"></i> ${b.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn bsm bghost" type="button" ${puede ? '' : 'disabled'} onclick="window.nxEliminarBancoV66('${esc(b.id)}')">
                <i class="ti ti-trash"></i> Eliminar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  async function addBank() {
    if (bloquear()) return;

    const input = q('#nxBancoNombreV66');
    const nombre = String(input?.value || '').trim();

    if (!nombre) {
      toastSafe('err', 'Nombre requerido', 'Escribe el nombre del banco.');
      return;
    }

    await cargarBancos(true);

    if (duplicado(nombre)) {
      toastSafe('err', 'Banco duplicado', 'Ese banco ya existe.');
      return;
    }

    const api = getAPI();

    if (!api?.post) {
      toastSafe('err', 'API no disponible', 'No se pudo guardar.');
      return;
    }

    try {
      await api.post('bancos', { nombre, activo: true });
      toastSafe('ok', 'Banco agregado', nombre);
      auditSafe('BANCO_AGREGADO', nombre);

      if (input) input.value = '';

      await cargarBancos(true);
      await refrescarSelectCobros();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo agregar', 'Verifica duplicado o permisos.');
    }
  }

  async function editBank(id) {
    if (bloquear()) return;

    await cargarBancos(true);

    const banco = bancosV66.find(b => String(b.id) === String(id));
    if (!banco) return;

    const nuevo = prompt('Nuevo nombre del banco:', banco.nombre);
    if (nuevo === null) return;

    const nombre = String(nuevo || '').trim();

    if (!nombre) {
      toastSafe('err', 'Nombre requerido', 'El nombre no puede estar vacío.');
      return;
    }

    if (duplicado(nombre, id)) {
      toastSafe('err', 'Banco duplicado', 'Ya existe un banco con ese nombre.');
      return;
    }

    const api = getAPI();

    if (!api?.patch) {
      toastSafe('err', 'API no disponible', 'No se pudo actualizar.');
      return;
    }

    try {
      await api.patch('bancos', 'id=eq.' + id, { nombre });
      toastSafe('ok', 'Banco actualizado', nombre);
      auditSafe('BANCO_EDITADO', banco.nombre + ' → ' + nombre);

      await cargarBancos(true);
      await refrescarSelectCobros();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo editar', 'Verifica duplicado o permisos.');
    }
  }

  async function toggleBank(id) {
    if (bloquear()) return;

    await cargarBancos(true);

    const banco = bancosV66.find(b => String(b.id) === String(id));
    if (!banco) return;

    const api = getAPI();
    const nuevo = !banco.activo;

    if (!api?.patch) {
      toastSafe('err', 'API no disponible', 'No se pudo actualizar.');
      return;
    }

    try {
      await api.patch('bancos', 'id=eq.' + id, { activo: nuevo });
      toastSafe('ok', nuevo ? 'Banco activado' : 'Banco desactivado', banco.nombre);
      auditSafe(nuevo ? 'BANCO_ACTIVADO' : 'BANCO_DESACTIVADO', banco.nombre);

      await cargarBancos(true);
      await refrescarSelectCobros();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo actualizar', 'Verifica permisos.');
    }
  }

  async function deleteBank(id) {
    if (bloquear()) return;

    await cargarBancos(true);

    const banco = bancosV66.find(b => String(b.id) === String(id));
    if (!banco) return;

    if (!confirm('¿Seguro que deseas eliminar/desactivar este banco?\n\n' + banco.nombre)) return;

    const api = getAPI();

    if (!api) {
      toastSafe('err', 'API no disponible', 'No se pudo eliminar.');
      return;
    }

    const usado = await bancoEnUso(banco.nombre);

    if (usado) {
      toastSafe('err', 'Banco en uso', 'Este banco tiene abonos asociados. Se desactivará.');
      try {
        await api.patch('bancos', 'id=eq.' + id, { activo: false });
        auditSafe('BANCO_DESACTIVADO_EN_USO', banco.nombre);
      } catch(e) {}

      await cargarBancos(true);
      await refrescarSelectCobros();
      renderList();
      return;
    }

    if (!api.delete) {
      toastSafe('err', 'API no disponible', 'No se encontró API.delete.');
      return;
    }

    try {
      await api.delete('bancos', 'id=eq.' + id);
      toastSafe('ok', 'Banco eliminado', banco.nombre);
      auditSafe('BANCO_ELIMINADO', banco.nombre);

      await cargarBancos(true);
      await refrescarSelectCobros();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo eliminar', 'Se desactivará en su lugar.');

      try { await api.patch('bancos', 'id=eq.' + id, { activo: false }); } catch(_) {}

      await cargarBancos(true);
      await refrescarSelectCobros();
      renderList();
    }
  }

  function injectCSS() {
    if (q('#nx-bancos-v66-css')) return;

    const style = document.createElement('style');
    style.id = 'nx-bancos-v66-css';
    style.textContent = `
      #mAbono #btnGestionarBancos,
      #nxBtnConfigBancosV63,
      #nxConfigTabBancosV64,
      #nxPanelBancosConfigV64,
      #nxConfigTabBancosV65,
      #nxPanelBancosV65,
      #mBancos {
        display: none !important;
      }

      #nxConfigTabBancosV66 {
        white-space: nowrap !important;
      }

      #nxConfigTabBancosV66.active,
      #nxConfigTabBancosV66.on {
        background: #2563eb !important;
        color: #fff !important;
        border-color: #2563eb !important;
      }

      #nxPanelBancosV66 {
        border-top: 4px solid #d97706 !important;
      }

      .nxBancosInfoV66 {
        margin: 12px 0;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e3a8a;
        border-radius: 16px;
        padding: 14px;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.35;
      }

      .nxBancosFormV66 {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: end;
        margin-bottom: 12px;
      }

      .nxBancosListV66 {
        display: grid;
        gap: 10px;
      }

      .nxBancosRowV66 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #fff;
      }

      .nxBancosNameBoxV66 {
        min-width: 0;
      }

      .nxBancosNameV66 {
        color: #0f172a;
        font-weight: 900;
        font-size: 14px;
      }

      .nxBancosStateV66 {
        font-size: 11px;
        font-weight: 900;
        margin-top: 3px;
      }

      .nxBancosStateV66.ok {
        color: #059669;
      }

      .nxBancosStateV66.off {
        color: #dc2626;
      }

      .nxBancosActionsV66 {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: flex-end;
      }

      .nxBancosActionsV66 button[disabled] {
        opacity: .45 !important;
        pointer-events: none !important;
      }

      .nxBancosEmptyV66 {
        padding: 18px;
        border: 1px dashed #cbd5e1;
        border-radius: 14px;
        color: #64748b;
        font-weight: 800;
        background: #f8fafc;
      }

      @media(max-width:768px) {
        #nxPanelBancosV66 .ch,
        .nxBancosHeaderV66 {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        #nxPanelBancosV66 .btn {
          min-height: 44px !important;
        }

        .nxBancosFormV66 {
          grid-template-columns: 1fr !important;
        }

        .nxBancosFormV66 .btn {
          width: 100% !important;
          justify-content: center !important;
        }

        .nxBancosRowV66 {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
          padding: 14px !important;
        }

        .nxBancosNameV66 {
          font-size: 16px !important;
          line-height: 1.2 !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
        }

        .nxBancosActionsV66 {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          width: 100% !important;
          gap: 6px !important;
        }

        .nxBancosActionsV66 .btn {
          width: 100% !important;
          min-width: 0 !important;
          font-size: 10px !important;
          padding: 6px 4px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          justify-content: center !important;
        }

        #nxBancoNombreV66 {
          min-height: 44px !important;
          font-size: 16px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.nxAgregarBancoV66 = addBank;
  window.nxEditarBancoV66 = editBank;
  window.nxToggleBancoV66 = toggleBank;
  window.nxEliminarBancoV66 = deleteBank;
  window.nxCerrarPanelBancosV66 = restoreConfigContent;

  function init() {
    injectCSS();
    q('#btnGestionarBancos')?.remove();
    createTab();
    createPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  document.addEventListener('click', function () {
    setTimeout(function () {
      q('#btnGestionarBancos')?.remove();
      createTab();
      createPanel();
    }, 150);
  }, true);
})();