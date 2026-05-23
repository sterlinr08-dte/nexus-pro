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
  // 7. COBROS — validaciones y campo Banco
  // ═══════════════════════════════════════════════════════════
  function setupCobrosValidaciones() {
    // Esperar a que regAbono exista
    if (typeof window.regAbono !== 'function') {
      setTimeout(setupCobrosValidaciones, 500);
      return;
    }
    if (window.__cobrosFixed) return;
    window.__cobrosFixed = true;

    // 1) Agregar campo Banco al modal mAbono (después del Método)
    function agregarCampoBanco() {
      // Solo si no existe ya
      if (document.getElementById('aBanco')) return;
      const aMet = document.getElementById('aMet');
      if (!aMet) return;
      
      const contMet = aMet.closest('.fr');
      if (!contMet) return;
      
      // Crear contenedor del banco
      const divBanco = document.createElement('div');
      divBanco.className = 'fr';
      divBanco.id = 'aBancoCont';
      divBanco.style.display = 'none';
      divBanco.innerHTML = `
        <label>Banco *</label>
        <select id="aBanco" style="width:100%;font-size:11px;padding:7px;border:1px solid rgba(0,229,199,.1);border-radius:var(--r6);background:var(--bg3);color:var(--tx1)">
          <option value="">Seleccionar banco...</option>
          <option value="BHD">BHD</option>
          <option value="Banreservas">Banreservas</option>
          <option value="Popular">Popular</option>
          <option value="Otros">Otros</option>
        </select>
      `;
      
      // Insertar después del campo Método
      contMet.parentNode.insertBefore(divBanco, contMet.nextSibling);
      
      // Contenedor para "Otros" (texto libre)
      const divOtros = document.createElement('div');
      divOtros.className = 'fr';
      divOtros.id = 'aBancoOtrosCont';
      divOtros.style.display = 'none';
      divOtros.innerHTML = `
        <label>Especificar banco *</label>
        <input type="text" id="aBancoOtros" placeholder="Nombre del banco" style="width:100%"/>
      `;
      contMet.parentNode.insertBefore(divOtros, divBanco.nextSibling);
      
      // Listener: mostrar/ocultar campo Banco según método
      aMet.addEventListener('change', actualizarVisibilidadBanco);
      
      // Listener: mostrar campo "Otros" si selecciona Otros
      document.getElementById('aBanco').addEventListener('change', function(e) {
        const otros = document.getElementById('aBancoOtrosCont');
        if (e.target.value === 'Otros') {
          otros.style.display = '';
        } else {
          otros.style.display = 'none';
          document.getElementById('aBancoOtros').value = '';
        }
      });
      
      // Estado inicial
      actualizarVisibilidadBanco();
    }
    
    function actualizarVisibilidadBanco() {
      const met = document.getElementById('aMet')?.value;
      const cont = document.getElementById('aBancoCont');
      const otros = document.getElementById('aBancoOtrosCont');
      if (!cont) return;
      
      if (met === 'Transferencia') {
        cont.style.display = '';
      } else {
        cont.style.display = 'none';
        otros.style.display = 'none';
        // Limpiar valores cuando no es transferencia
        const sel = document.getElementById('aBanco');
        const inp = document.getElementById('aBancoOtros');
        if (sel) sel.value = '';
        if (inp) inp.value = '';
      }
    }
    
    // 2) Observar cuando se abre el modal para agregar el campo
    // El modal puede abrirse muchas veces, hay que asegurarse de tenerlo siempre
    const modal = document.getElementById('mAbono');
    if (modal) {
      // Observar cambios en el modal (cuando se abre cambia de display:none a display:flex)
      const obs = new MutationObserver(function() {
        if (modal.classList.contains('open') || 
            (modal.style.display && modal.style.display !== 'none')) {
          setTimeout(agregarCampoBanco, 100);
        }
      });
      obs.observe(modal, { attributes: true, attributeFilter: ['class', 'style'] });
      // También intentar agregar de una vez
      agregarCampoBanco();
    }
    
    // 3) Sobrescribir regAbono con validaciones
    const _regAbonoOriginal = window.regAbono;
    window.regAbono = async function() {
      // Validación 1: Agente obligatorio
      const aAgente = document.getElementById('aAgente');
      if (!aAgente || !aAgente.value) {
        if (typeof window.toast === 'function') {
          window.toast('err', 'Agente requerido', 'Selecciona el agente que cobró');
        } else {
          alert('Selecciona el agente que cobró');
        }
        return;
      }
      
      // Validación 2: Referencia obligatoria
      const aRef = document.getElementById('aRef');
      if (!aRef || !aRef.value || !aRef.value.trim()) {
        if (typeof window.toast === 'function') {
          window.toast('err', 'Referencia requerida', 'Escribe una referencia');
        } else {
          alert('Escribe una referencia');
        }
        return;
      }
      
      // Validación 3: Si es transferencia, banco obligatorio
      const metodo = document.getElementById('aMet')?.value;
      if (metodo === 'Transferencia') {
        const banco = document.getElementById('aBanco')?.value;
        if (!banco) {
          if (typeof window.toast === 'function') {
            window.toast('err', 'Banco requerido', 'Selecciona el banco de la transferencia');
          } else {
            alert('Selecciona el banco de la transferencia');
          }
          return;
        }
        // Si banco es "Otros", validar texto
        if (banco === 'Otros') {
          const bancoOtros = document.getElementById('aBancoOtros')?.value;
          if (!bancoOtros || !bancoOtros.trim()) {
            if (typeof window.toast === 'function') {
              window.toast('err', 'Banco requerido', 'Escribe el nombre del banco');
            } else {
              alert('Escribe el nombre del banco');
            }
            return;
          }
        }
      }
      
      // Interceptar API.post para agregar el banco al objeto
      const apiOriginal = window.API?.post;
      if (apiOriginal && metodo === 'Transferencia') {
        window.API.post = async function(tabla, datos) {
          if (tabla === 'abonos' && datos && !datos.banco) {
            // Determinar el banco final
            const bancoSel = document.getElementById('aBanco')?.value;
            const bancoFinal = bancoSel === 'Otros' 
              ? document.getElementById('aBancoOtros')?.value?.trim() 
              : bancoSel;
            datos.banco = bancoFinal || null;
          }
          return apiOriginal.call(this, tabla, datos);
        };
      }
      
      try {
        // Llamar al regAbono original
        const resultado = await _regAbonoOriginal.apply(this, arguments);
        return resultado;
      } finally {
        // Restaurar API.post original
        if (apiOriginal) {
          window.API.post = apiOriginal;
        }
      }
    };
    
    console.log('%c✓ Cobros: validaciones + Banco aplicados', 'color:#10b981;font-weight:bold');
  }
  
  // Iniciar después de un segundo
  setTimeout(setupCobrosValidaciones, 1000);

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

  function st() { return window.ST || {}; }
  function getAgentes() { return Array.isArray(st().agentes) ? st().agentes : []; }
  function getClientes() { return Array.isArray(st().clientes) ? st().clientes : []; }
  function getFacturas() { return Array.isArray(st().facturas) ? st().facturas : []; }

  async function getAbonos() {
    if (Array.isArray(st().abonos) && st().abonos.length) return st().abonos;
    if (window.API && typeof window.API.get === "function") {
      try {
        const data = await window.API.get("abonos", "select=*&order=fecha.desc&limit=5000");
        return Array.isArray(data) ? data : [];
      } catch (e) {
        console.warn("NEXUS V2: no se pudieron cargar abonos:", e);
      }
    }
    return Array.isArray(st().abonos) ? st().abonos : [];
  }

  async function getTransferencias() {
    if (window.API && typeof window.API.get === "function") {
      try {
        const data = await window.API.get(TRANSFER_TABLE, "select=*&order=fecha.desc,created_at.desc&limit=1000");
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

  window.nxAbrirTransferenciaAgenteV2 = function () {
    createTransferModal();
    fillAgentesSelects();
    toggleBancoTransfer();
    q("#nxModalTransferAgenteV2")?.classList.add("open");
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

    if (!window.API?.post) return toastSafe("err", "API no disponible", "No se encontró API.post");

    const btn = q("#nxTA2Btn");
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spin"></div>'; }

    const payload = { desde_agente: desde, hacia_agente: hacia, monto, metodo, banco: banco || null, referencia: ref, nota: nota || null, fecha: today() };

    try {
      await window.API.post(TRANSFER_TABLE, payload);
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
