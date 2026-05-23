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
  // 8. MODAL "COBRADO POR AGENTE" - Click en tarjeta del Dashboard
  // ═══════════════════════════════════════════════════════════
  function setupModalCobradoAgente() {
    // Esperar a que el sistema esté cargado
    if (!window.ST || !window.fmt) {
      setTimeout(setupModalCobradoAgente, 500);
      return;
    }
    if (window.__cobradoAgenteFixed) return;
    window.__cobradoAgenteFixed = true;

    // Hacer la tarjeta Cobrado clickeable
    function hacerCobradoClickeable() {
      // Buscar la tarjeta KPI "COBRADO" en el Dashboard
      const labels = document.querySelectorAll('.kl');
      labels.forEach(function(lbl) {
        if (lbl.textContent.trim().toUpperCase() === 'COBRADO') {
          const card = lbl.closest('.kpi');
          if (card && !card.dataset.cobradoBound) {
            card.dataset.cobradoBound = '1';
            card.style.cursor = 'pointer';
            card.addEventListener('click', abrirModalCobradoAgente);
          }
        }
      });
    }

    // Abrir el modal con el desglose
    window.abrirModalCobradoAgente = function() {
      const ST = window.ST;
      const fmt = window.fmt;
      
      // Calcular datos
      const abonos = ST.abonos || [];
      const agentes = ST.agentes || [];
      const clientes = ST.clientes || [];
      
      // Total cobrado general
      const totalGeneral = abonos.reduce((s, a) => s + Number(a.monto || 0), 0);
      
      // Agrupar por agente
      const porAgente = {};
      let sinAgente = 0;
      abonos.forEach(function(a) {
        const agId = a.agente_cobro;
        if (!agId) {
          sinAgente += Number(a.monto || 0);
          return;
        }
        if (!porAgente[agId]) {
          porAgente[agId] = { total: 0, efectivo: 0, banco: 0, cheque: 0, otros: 0, transBancos: {} };
        }
        const monto = Number(a.monto || 0);
        porAgente[agId].total += monto;
        const metodo = (a.metodo || '').toLowerCase();
        if (metodo === 'efectivo') {
          porAgente[agId].efectivo += monto;
        } else if (metodo === 'transferencia' || metodo === 'depósito' || metodo === 'deposito') {
          porAgente[agId].banco += monto;
          const banco = a.banco || 'Sin especificar';
          porAgente[agId].transBancos[banco] = (porAgente[agId].transBancos[banco] || 0) + monto;
        } else if (metodo === 'cheque') {
          porAgente[agId].cheque += monto;
        } else {
          porAgente[agId].otros += monto;
        }
      });
      
      // Agrupar por método global (todos los agentes)
      let totalEfectivo = 0, totalBanco = 0, totalCheque = 0, totalOtros = 0;
      const totalPorBanco = {};
      abonos.forEach(function(a) {
        const monto = Number(a.monto || 0);
        const metodo = (a.metodo || '').toLowerCase();
        if (metodo === 'efectivo') totalEfectivo += monto;
        else if (metodo === 'transferencia' || metodo === 'depósito' || metodo === 'deposito') {
          totalBanco += monto;
          const banco = a.banco || 'Sin especificar';
          totalPorBanco[banco] = (totalPorBanco[banco] || 0) + monto;
        }
        else if (metodo === 'cheque') totalCheque += monto;
        else totalOtros += monto;
      });
      
      // Construir HTML del modal
      let html = `
        <div style="padding:8px 0">
          <!-- Total general -->
          <div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:14px;border-radius:12px;margin-bottom:14px;text-align:center">
            <div style="font-size:10px;font-weight:700;letter-spacing:.5px;opacity:.9">TOTAL COBRADO</div>
            <div style="font-size:22px;font-weight:800;margin-top:4px;font-family:monospace">${fmt(totalGeneral)}</div>
          </div>
          
          <!-- Resumen por método -->
          <div style="margin-bottom:14px">
            <div style="font-size:9px;color:#94a3b8;letter-spacing:.5px;font-weight:700;margin-bottom:8px;font-family:monospace">POR MÉTODO</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
              <div style="background:#f0fdf4;padding:10px;border-radius:10px;border:1px solid #bbf7d0">
                <div style="font-size:9px;color:#16a34a;font-weight:700">💵 EFECTIVO</div>
                <div style="font-size:14px;font-weight:800;color:#16a34a;font-family:monospace">${fmt(totalEfectivo)}</div>
              </div>
              <div style="background:#eff6ff;padding:10px;border-radius:10px;border:1px solid #bfdbfe">
                <div style="font-size:9px;color:#2563eb;font-weight:700">🏦 BANCO</div>
                <div style="font-size:14px;font-weight:800;color:#2563eb;font-family:monospace">${fmt(totalBanco)}</div>
              </div>
              ${totalCheque > 0 ? `
              <div style="background:#fef3c7;padding:10px;border-radius:10px;border:1px solid #fde68a">
                <div style="font-size:9px;color:#d97706;font-weight:700">📝 CHEQUE</div>
                <div style="font-size:14px;font-weight:800;color:#d97706;font-family:monospace">${fmt(totalCheque)}</div>
              </div>
              ` : ''}
              ${totalOtros > 0 ? `
              <div style="background:#f3f4f6;padding:10px;border-radius:10px;border:1px solid #e5e7eb">
                <div style="font-size:9px;color:#6b7280;font-weight:700">⋯ OTROS</div>
                <div style="font-size:14px;font-weight:800;color:#6b7280;font-family:monospace">${fmt(totalOtros)}</div>
              </div>
              ` : ''}
            </div>
          </div>
      `;
      
      // Desglose por banco
      if (Object.keys(totalPorBanco).length > 0) {
        html += `
          <div style="margin-bottom:14px">
            <div style="font-size:9px;color:#94a3b8;letter-spacing:.5px;font-weight:700;margin-bottom:8px;font-family:monospace">DESGLOSE POR BANCO</div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
        `;
        const bancosOrdenados = Object.entries(totalPorBanco).sort((a,b) => b[1] - a[1]);
        bancosOrdenados.forEach(function([banco, monto], idx) {
          html += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;${idx > 0 ? 'border-top:1px solid #f1f5f9' : ''}">
              <span style="font-weight:600;color:#0f172a">${banco}</span>
              <span style="font-weight:800;color:#2563eb;font-family:monospace">${fmt(monto)}</span>
            </div>
          `;
        });
        html += `</div></div>`;
      }
      
      // Desglose por agente
      html += `
        <div>
          <div style="font-size:9px;color:#94a3b8;letter-spacing:.5px;font-weight:700;margin-bottom:8px;font-family:monospace">POR AGENTE</div>
      `;
      
      const agentesOrdenados = Object.entries(porAgente)
        .map(([id, datos]) => ({ id, ...datos, nom: (agentes.find(a => a.id === id) || {}).nom || 'Agente desconocido' }))
        .sort((a, b) => b.total - a.total);
      
      if (agentesOrdenados.length === 0 && sinAgente === 0) {
        html += `<div style="padding:20px;text-align:center;color:#94a3b8">Sin cobros registrados</div>`;
      } else {
        agentesOrdenados.forEach(function(ag) {
          html += `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-weight:700;color:#0f172a">${ag.nom}</div>
                <div style="font-weight:800;color:#10b981;font-family:monospace;font-size:14px">${fmt(ag.total)}</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
                ${ag.efectivo > 0 ? `<div style="color:#16a34a">💵 Efectivo: <b>${fmt(ag.efectivo)}</b></div>` : ''}
                ${ag.banco > 0 ? `<div style="color:#2563eb">🏦 Banco: <b>${fmt(ag.banco)}</b></div>` : ''}
                ${ag.cheque > 0 ? `<div style="color:#d97706">📝 Cheque: <b>${fmt(ag.cheque)}</b></div>` : ''}
                ${ag.otros > 0 ? `<div style="color:#6b7280">⋯ Otros: <b>${fmt(ag.otros)}</b></div>` : ''}
              </div>
              ${Object.keys(ag.transBancos).length > 0 ? `
                <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0">
                  <div style="font-size:9px;color:#94a3b8;font-weight:700;margin-bottom:4px">BANCOS:</div>
                  ${Object.entries(ag.transBancos).map(([b, m]) => `
                    <div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0">
                      <span style="color:#475569">${b}</span>
                      <span style="font-weight:700;color:#2563eb;font-family:monospace">${fmt(m)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        });
        
        if (sinAgente > 0) {
          html += `
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:12px;margin-bottom:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div style="font-weight:700;color:#92400e">⚠️ Sin agente asignado</div>
                <div style="font-weight:800;color:#d97706;font-family:monospace">${fmt(sinAgente)}</div>
              </div>
            </div>
          `;
        }
      }
      
      html += `</div></div>`;
      
      // Crear modal flotante
      let modal = document.getElementById('mCobradoAgente');
      if (modal) modal.remove();
      
      modal = document.createElement('div');
      modal.id = 'mCobradoAgente';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:20px;overflow-y:auto;backdrop-filter:blur(4px)';
      modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;max-width:520px;width:100%;padding:18px;box-shadow:0 25px 70px rgba(0,0,0,.3);max-height:90vh;overflow-y:auto">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
            <div style="font-size:14px;font-weight:800;color:#0f172a;font-family:monospace">// COBRADO POR AGENTE</div>
            <button onclick="document.getElementById('mCobradoAgente').remove()" style="border:0;background:#f1f5f9;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;color:#64748b">×</button>
          </div>
          ${html}
        </div>
      `;
      
      // Click fuera cierra
      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });
      
      document.body.appendChild(modal);
    };

    // Aplicar cuando se cargue el Dashboard y reintentar
    hacerCobradoClickeable();
    setInterval(hacerCobradoClickeable, 2000); // por si el Dashboard se re-renderiza
    
    console.log('%c✓ Modal Cobrado por Agente activado', 'color:#10b981;font-weight:bold');
  }
  
  setTimeout(setupModalCobradoAgente, 1500);

})();
