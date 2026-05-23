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
  // 8. CLICK EN "COBRADO" → REPORTE POR AGENTE ENRIQUECIDO
  // ═══════════════════════════════════════════════════════════
  function setupCobradoToReporte() {
    // Esperar a que el sistema esté cargado
    if (!window.ST || !window.fmt || !window.nav) {
      setTimeout(setupCobradoToReporte, 500);
      return;
    }
    if (window.__cobradoReporteFixed) return;
    window.__cobradoReporteFixed = true;

    // 1) Hacer clickeable la tarjeta "COBRADO" del Dashboard
    function hacerCobradoClickeable() {
      const labels = document.querySelectorAll('.kl');
      labels.forEach(function(lbl) {
        if (lbl.textContent.trim().toUpperCase() === 'COBRADO') {
          const card = lbl.closest('.kpi');
          if (card && !card.dataset.cobradoBound) {
            card.dataset.cobradoBound = '1';
            card.style.cursor = 'pointer';
            card.title = 'Ver desglose por agente';
            card.addEventListener('click', function() {
              // Navegar al reporte de agente
              if (typeof window.nav === 'function') {
                window.nav('rep-agente');
              }
            });
          }
        }
      });
    }

    // 2) Sobrescribir rRepAgt para agregar desglose por método/banco
    if (typeof window.rRepAgt === 'function') {
      const _rRepAgtOriginal = window.rRepAgt;
      
      window.rRepAgt = function() {
        // Primero ejecutar el original (renderiza la lista base de agentes)
        _rRepAgtOriginal.apply(this, arguments);
        
        // Después agregar nuestro desglose
        setTimeout(agregarDesgloseAgentes, 100);
      };
      console.log('%c✓ rRepAgt sobrescrito con desglose', 'color:#10b981;font-weight:bold');
    } else {
      // Si no existe aún, intentar de nuevo
      setTimeout(setupCobradoToReporte, 500);
      return;
    }

    function agregarDesgloseAgentes() {
      const ST = window.ST;
      const fmt = window.fmt;
      const abonos = ST.abonos || [];
      const agentes = ST.agentes || [];
      
      // Calcular desglose por agente
      const porAgente = {};
      abonos.forEach(function(a) {
        const agId = a.agente_cobro;
        if (!agId) return;
        if (!porAgente[agId]) {
          porAgente[agId] = { efectivo: 0, banco: 0, cheque: 0, otros: 0, bancos: {} };
        }
        const monto = Number(a.monto || 0);
        const metodo = (a.metodo || '').toLowerCase();
        if (metodo === 'efectivo') {
          porAgente[agId].efectivo += monto;
        } else if (metodo === 'transferencia' || metodo === 'depósito' || metodo === 'deposito') {
          porAgente[agId].banco += monto;
          const banco = a.banco || 'Sin especificar';
          porAgente[agId].bancos[banco] = (porAgente[agId].bancos[banco] || 0) + monto;
        } else if (metodo === 'cheque') {
          porAgente[agId].cheque += monto;
        } else {
          porAgente[agId].otros += monto;
        }
      });
      
      // Inyectar tarjeta de desglose al inicio del contenedor rAgt
      const rAgtCont = document.getElementById('rAgt');
      if (!rAgtCont) return;
      
      // Si ya existe, quitarla para refrescar
      const existente = document.getElementById('desgloseCobros');
      if (existente) existente.remove();
      
      // Construir HTML del desglose
      const desglose = document.createElement('div');
      desglose.id = 'desgloseCobros';
      desglose.style.cssText = 'background:linear-gradient(135deg,#f0fdfa 0%,#eff6ff 100%);border:1px solid #bfdbfe;border-radius:14px;padding:14px;margin-bottom:14px';
      
      // Totales generales
      let totEf = 0, totBan = 0, totChq = 0, totOtr = 0;
      const totBancos = {};
      Object.values(porAgente).forEach(function(d) {
        totEf += d.efectivo;
        totBan += d.banco;
        totChq += d.cheque;
        totOtr += d.otros;
        Object.entries(d.bancos).forEach(([b, m]) => { totBancos[b] = (totBancos[b] || 0) + m; });
      });
      const totGen = totEf + totBan + totChq + totOtr;
      
      let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-size:11px;font-weight:800;color:#0f172a;font-family:var(--mono)">💰 DESGLOSE DE COBROS</div>
          <div style="font-size:14px;font-weight:800;color:#10b981;font-family:var(--mono)">${fmt(totGen)}</div>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
          <div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #d1fae5">
            <div style="font-size:9px;font-weight:700;color:#10b981">💵 EFECTIVO</div>
            <div style="font-size:14px;font-weight:800;color:#10b981;font-family:var(--mono)">${fmt(totEf)}</div>
          </div>
          <div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #bfdbfe">
            <div style="font-size:9px;font-weight:700;color:#2563eb">🏦 BANCO</div>
            <div style="font-size:14px;font-weight:800;color:#2563eb;font-family:var(--mono)">${fmt(totBan)}</div>
          </div>
      `;
      
      if (totChq > 0) {
        html += `
          <div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #fde68a">
            <div style="font-size:9px;font-weight:700;color:#d97706">📝 CHEQUE</div>
            <div style="font-size:14px;font-weight:800;color:#d97706;font-family:var(--mono)">${fmt(totChq)}</div>
          </div>
        `;
      }
      if (totOtr > 0) {
        html += `
          <div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #e5e7eb">
            <div style="font-size:9px;font-weight:700;color:#6b7280">⋯ OTROS</div>
            <div style="font-size:14px;font-weight:800;color:#6b7280;font-family:var(--mono)">${fmt(totOtr)}</div>
          </div>
        `;
      }
      
      html += `</div>`;
      
      // Bancos
      if (Object.keys(totBancos).length > 0) {
        html += `<div style="margin-bottom:10px"><div style="font-size:9px;font-weight:700;color:#64748b;margin-bottom:6px;font-family:var(--mono)">POR BANCO:</div>`;
        const sorted = Object.entries(totBancos).sort((a,b) => b[1] - a[1]);
        sorted.forEach(([banco, monto]) => {
          html += `
            <div style="display:flex;justify-content:space-between;padding:6px 10px;background:#fff;border-radius:8px;margin-bottom:3px;font-size:11px">
              <span style="color:#475569;font-weight:600">${banco}</span>
              <span style="color:#2563eb;font-weight:800;font-family:var(--mono)">${fmt(monto)}</span>
            </div>
          `;
        });
        html += `</div>`;
      }
      
      // Desglose por agente
      html += `<div style="font-size:9px;font-weight:700;color:#64748b;margin-bottom:6px;font-family:var(--mono)">DETALLE POR AGENTE:</div>`;
      
      const agentesOrdenados = Object.entries(porAgente)
        .map(([id, d]) => ({
          id,
          nom: (agentes.find(a => a.id === id) || {}).nom || 'Agente desconocido',
          ...d,
          total: d.efectivo + d.banco + d.cheque + d.otros
        }))
        .sort((a, b) => b.total - a.total);
      
      if (agentesOrdenados.length === 0) {
        html += `<div style="padding:14px;text-align:center;color:#94a3b8;font-size:11px">Aún no hay cobros con agente asignado</div>`;
      } else {
        agentesOrdenados.forEach(function(ag) {
          html += `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:6px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div style="font-weight:700;font-size:12px;color:#0f172a">${ag.nom}</div>
                <div style="font-weight:800;color:#10b981;font-family:var(--mono);font-size:13px">${fmt(ag.total)}</div>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:10px">
                ${ag.efectivo > 0 ? `<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:6px;font-weight:700">💵 ${fmt(ag.efectivo)}</span>` : ''}
                ${ag.banco > 0 ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-weight:700">🏦 ${fmt(ag.banco)}</span>` : ''}
                ${ag.cheque > 0 ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:6px;font-weight:700">📝 ${fmt(ag.cheque)}</span>` : ''}
                ${ag.otros > 0 ? `<span style="background:#f3f4f6;color:#374151;padding:2px 8px;border-radius:6px;font-weight:700">⋯ ${fmt(ag.otros)}</span>` : ''}
              </div>
              ${Object.keys(ag.bancos).length > 0 ? `
                <div style="margin-top:6px;padding-top:6px;border-top:1px dashed #e2e8f0;font-size:10px">
                  ${Object.entries(ag.bancos).map(([b, m]) => `
                    <span style="color:#64748b;margin-right:8px">${b}: <b style="color:#2563eb;font-family:var(--mono)">${fmt(m)}</b></span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        });
      }
      
      desglose.innerHTML = html;
      
      // Insertar al PRINCIPIO del contenedor rAgt
      rAgtCont.insertBefore(desglose, rAgtCont.firstChild);
    }

    // Activar
    hacerCobradoClickeable();
    setInterval(hacerCobradoClickeable, 2000); // por si el Dashboard se re-renderiza
    
    console.log('%c✓ Cobrado → Reporte Agente activado', 'color:#10b981;font-weight:bold');
  }
  
  setTimeout(setupCobradoToReporte, 1500);

})();
