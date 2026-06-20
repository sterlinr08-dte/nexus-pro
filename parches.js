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
          color: #475569;
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
          color: #475569;
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

        /* ═══ BOTÓN FLOTANTE (FAB) + MENÚ ═══ */
        .nx-fab {
          position: fixed; right: 18px; bottom: 18px; z-index: 9000;
          width: 58px; height: 58px; border-radius: 50%; border: 0;
          background: linear-gradient(135deg,#1e3a6e,#2563eb);
          color: #fff; font-size: 26px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 26px rgba(37,99,235,.45);
          cursor: pointer; touch-action: manipulation;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .nx-fab:active { transform: scale(.92); }
        .nx-fab.open { transform: rotate(90deg); }
        .nx-fab i { pointer-events: none; }
        .nx-menu-backdrop {
          position: fixed; inset: 0; z-index: 8999;
          background: rgba(15,23,42,.35);
          backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
          opacity: 0; pointer-events: none; transition: opacity .2s ease;
        }
        .nx-menu-backdrop.open { opacity: 1; pointer-events: auto; }
        /* El menú flota encima del FAB y es desplazable si hay muchas opciones */
        .mobile-more-sheet-clean {
          bottom: 88px; max-height: 66vh;
          overflow-y: auto; -webkit-overflow-scrolling: touch;
        }
        .mobile-more-sheet-clean.open { animation: nxSheetUp .22s ease; }
        @keyframes nxSheetUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
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
        
        /* Cuando hay overlay abierto, ocultar el botón flotante y su menú */
        body:has(.overlay.on) .mobile-bottom-nav-clean,
        body:has(.overlay.on) .nx-fab,
        body:has(.overlay.on) .nx-menu-backdrop,
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
    
    // Caso especial: Cobros e Historial son PESTAÑAS dentro de la vista Facturas.
    // No existe una vista #v-cobros propia → hay que abrir Facturas y cambiar de pestaña.
    if (vista === 'cobros' || vista === 'historial') {
      if (typeof window.nav === 'function') {
        try {
          window.nav('facturas');
          const tab = (vista === 'historial') ? 'pagos' : 'cob';
          setTimeout(function() {
            if (typeof window.switchTab === 'function') window.switchTab(tab);
          }, 200);
          return true;
        } catch(e) {
          console.error(vista + ' falló:', e);
        }
      }
      return false;
    }

    const mapa = {
      'dashboard': 'dashboard',
      'clientes': 'clientes',
      'facturas': 'facturas',
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
  // 3. BOTÓN FLOTANTE (FAB) + MENÚ DE NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════
  function crearFAB() {
    if (!isMobile()) return;
    if (document.querySelector('.nx-fab')) return;
    // Quitar cualquier barra inferior vieja
    document.querySelectorAll('.mobile-bottom-nav-clean, .mobile-bottom-nav-nexu, .mobile-bottom-nav-v3, .mobile-bottom-nav-v31').forEach(el => el.remove());

    const backdrop = document.createElement('div');
    backdrop.className = 'nx-menu-backdrop';
    document.body.appendChild(backdrop);

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'nx-fab';
    fab.setAttribute('aria-label', 'Menú');
    fab.innerHTML = '<i class="ti ti-menu-2"></i>';
    document.body.appendChild(fab);

    // ── Posición guardada + ARRASTRAR para ponerlo donde el usuario quiera ──
    try {
      const sp = JSON.parse(localStorage.getItem('nx_fab_pos') || 'null');
      if (sp && typeof sp.left === 'number') {
        fab.style.left = sp.left + 'px';
        fab.style.top = sp.top + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
      }
    } catch (e) {}

    let drag = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    let suppressClick = false;
    function dragStart(e) {
      const p = e.touches ? e.touches[0] : e;
      drag = true; moved = false;
      sx = p.clientX; sy = p.clientY;
      const r = fab.getBoundingClientRect();
      ox = r.left; oy = r.top;
      document.addEventListener('touchmove', dragMove, { passive: false });
      document.addEventListener('mousemove', dragMove);
      document.addEventListener('touchend', dragEnd);
      document.addEventListener('mouseup', dragEnd);
    }
    function dragMove(e) {
      if (!drag) return;
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - sx, dy = p.clientY - sy;
      if (!moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) moved = true;
      if (moved) {
        if (e.cancelable) e.preventDefault();
        const sz = fab.offsetWidth || 58;
        const nl = Math.max(6, Math.min(window.innerWidth - sz - 6, ox + dx));
        const nt = Math.max(6, Math.min(window.innerHeight - sz - 6, oy + dy));
        fab.style.left = nl + 'px';
        fab.style.top = nt + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
      }
    }
    function dragEnd() {
      document.removeEventListener('touchmove', dragMove);
      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('touchend', dragEnd);
      document.removeEventListener('mouseup', dragEnd);
      if (moved) {
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 350);
        const r = fab.getBoundingClientRect();
        try { localStorage.setItem('nx_fab_pos', JSON.stringify({ left: r.left, top: r.top })); } catch (e) {}
      }
      drag = false;
    }
    fab.addEventListener('touchstart', dragStart, { passive: true });
    fab.addEventListener('mousedown', dragStart);

    function toggleMenu(forceClose) {
      const sheet = document.querySelector('.mobile-more-sheet-clean');
      const willOpen = forceClose ? false : !(sheet && sheet.classList.contains('open'));
      if (sheet) sheet.classList.toggle('open', willOpen);
      backdrop.classList.toggle('open', willOpen);
      fab.classList.toggle('open', willOpen);
      fab.innerHTML = willOpen ? '<i class="ti ti-x"></i>' : '<i class="ti ti-menu-2"></i>';
    }
    window.__nxToggleMenu = toggleMenu;

    fab.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (suppressClick) { suppressClick = false; return; }
      toggleMenu();
    });
    backdrop.addEventListener('click', function () { toggleMenu(true); });
  }

  // ═══════════════════════════════════════════════════════════
  // 3b. (Legacy · ya no se usa) Barra inferior de 5 botones
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
  // 4. MENÚ "MÁS" (personalizable por el usuario)
  // ═══════════════════════════════════════════════════════════
  // Catálogo de TODAS las opciones disponibles para el menú
  const NX_MENU_CATALOG = [
    { go:'dashboard', icon:'🏠', label:'Inicio' },
    { go:'clientes',  icon:'👥', label:'Clientes' },
    { go:'proceso',   icon:'📋', label:'Clientes en proceso' },
    { go:'polizas',   icon:'📜', label:'Pólizas' },
    { go:'facturas',  icon:'📄', label:'Facturas' },
    { go:'cobros',    icon:'💰', label:'Cobros' },
    { go:'historial', icon:'🧾', label:'Historial de pagos' },
    { go:'reportes',  icon:'📊', label:'Reportes' },
    { go:'sistema',   icon:'⚙️', label:'Configuración' },
    { go:'usuarios',  icon:'👤', label:'Usuarios' }
  ];
  const NX_MENU_KEY = 'nx_menu_cfg';

  function nxCatalogItem(go){ return NX_MENU_CATALOG.find(i => i.go === go); }

  // Lista ordenada de claves visibles (por defecto: todas)
  function getMenuCfg(){
    try {
      const raw = JSON.parse(localStorage.getItem(NX_MENU_KEY) || 'null');
      if (Array.isArray(raw)) {
        const valid = raw.filter(go => nxCatalogItem(go));
        if (valid.length) return valid;
      }
    } catch(e){}
    return NX_MENU_CATALOG.map(i => i.go);
  }
  function setMenuCfg(arr){
    try { localStorage.setItem(NX_MENU_KEY, JSON.stringify(arr)); } catch(e){}
  }

  // HTML de los botones del menú según la configuración guardada
  function buildMenuHTML(){
    const items = getMenuCfg().map(go => nxCatalogItem(go)).filter(Boolean);
    return `
      <div class="nx-menu-head">
        <h3>MENÚ</h3>
        <button type="button" class="nx-menu-edit-btn" data-action="edit-menu"><i class="ti ti-pencil"></i> Editar</button>
      </div>
      ${items.map(it => `<button type="button" data-go="${it.go}"><span class="icon">${it.icon}</span><span><b>${it.label}</b></span></button>`).join('')}
    `;
  }

  function renderMenuSheet(){
    const sheet = document.querySelector('.mobile-more-sheet-clean');
    if (!sheet) return;
    const wasOpen = sheet.classList.contains('open');
    sheet.innerHTML = buildMenuHTML();
    if (wasOpen) sheet.classList.add('open');
  }

  function crearMenuMas() {
    if (!isMobile()) return;
    injectMenuEditorCSS();
    if (document.querySelector('.mobile-more-sheet-clean')) return;

    const sheet = document.createElement('div');
    sheet.className = 'mobile-more-sheet-clean';
    sheet.innerHTML = buildMenuHTML();
    document.body.appendChild(sheet);

    sheet.addEventListener('click', function(ev) {
      const editBtn = ev.target.closest('[data-action="edit-menu"]');
      if (editBtn) {
        ev.preventDefault(); ev.stopPropagation();
        abrirEditorMenu();
        return;
      }
      const btn = ev.target.closest('button[data-go]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (window.__nxToggleMenu) window.__nxToggleMenu(true); else sheet.classList.remove('open');
      navegar(btn.dataset.go);
    });
  }

  // ── Editor del menú: elegir qué opciones aparecen y en qué orden ──
  function abrirEditorMenu(){
    if (window.__nxToggleMenu) window.__nxToggleMenu(true); // cerrar el menú flotante

    const visibles = getMenuCfg();
    const ocultas = NX_MENU_CATALOG.map(i => i.go).filter(go => !visibles.includes(go));
    let work = visibles.map(go => ({ go, on:true }))
                       .concat(ocultas.map(go => ({ go, on:false })));

    const old = document.querySelector('.nx-menu-editor');
    if (old) old.remove();

    const ov = document.createElement('div');
    ov.className = 'nx-menu-editor';
    document.body.appendChild(ov);

    function render(){
      ov.innerHTML = `
        <div class="nx-me-card">
          <div class="nx-me-head">
            <span>Editar menú</span>
            <button type="button" class="nx-me-x" data-me="cerrar" aria-label="Cerrar"><i class="ti ti-x"></i></button>
          </div>
          <div class="nx-me-hint">Marca lo que quieres ver y usa las flechas para ordenar.</div>
          <div class="nx-me-list">
            ${work.map((w, idx) => {
              const it = nxCatalogItem(w.go); if (!it) return '';
              return `
              <div class="nx-me-row${w.on ? '' : ' off'}">
                <button type="button" class="nx-me-check" data-me="toggle" data-idx="${idx}" aria-label="Mostrar u ocultar"><i class="ti ti-check"></i></button>
                <span class="nx-me-ico">${it.icon}</span>
                <span class="nx-me-label">${it.label}</span>
                <span class="nx-me-arrows">
                  <button type="button" data-me="up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''} aria-label="Subir"><i class="ti ti-chevron-up"></i></button>
                  <button type="button" data-me="down" data-idx="${idx}" ${idx === work.length - 1 ? 'disabled' : ''} aria-label="Bajar"><i class="ti ti-chevron-down"></i></button>
                </span>
              </div>`;
            }).join('')}
          </div>
          <div class="nx-me-actions">
            <button type="button" class="nx-me-reset" data-me="reset">Restaurar todo</button>
            <button type="button" class="nx-me-save" data-me="guardar">Guardar</button>
          </div>
        </div>`;
    }
    render();

    function cerrar(){ ov.classList.remove('open'); setTimeout(() => ov.remove(), 180); }

    ov.addEventListener('click', function(ev){
      const t = ev.target.closest('[data-me]');
      if (!t) { if (ev.target === ov) cerrar(); return; }
      const action = t.dataset.me;
      const idx = parseInt(t.dataset.idx, 10);
      if (action === 'cerrar') return cerrar();
      if (action === 'toggle') { work[idx].on = !work[idx].on; render(); return; }
      if (action === 'up'   && idx > 0)               { const tmp = work[idx-1]; work[idx-1] = work[idx]; work[idx] = tmp; render(); return; }
      if (action === 'down' && idx < work.length - 1) { const tmp = work[idx+1]; work[idx+1] = work[idx]; work[idx] = tmp; render(); return; }
      if (action === 'reset')   { setMenuCfg(NX_MENU_CATALOG.map(i => i.go)); renderMenuSheet(); cerrar(); return; }
      if (action === 'guardar') {
        const sel = work.filter(w => w.on).map(w => w.go);
        setMenuCfg(sel.length ? sel : NX_MENU_CATALOG.map(i => i.go));
        renderMenuSheet();
        cerrar();
        return;
      }
    });

    requestAnimationFrame(() => ov.classList.add('open'));
  }

  // CSS del editor + botón "Editar" (se inyecta una sola vez)
  function injectMenuEditorCSS(){
    if (document.getElementById('nx-menu-editor-css')) return;
    const st = document.createElement('style');
    st.id = 'nx-menu-editor-css';
    st.textContent = `
      .mobile-more-sheet-clean .nx-menu-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .mobile-more-sheet-clean .nx-menu-head h3{margin:4px 6px 8px}
      .mobile-more-sheet-clean button.nx-menu-edit-btn{width:auto!important;padding:6px 12px!important;margin:0 4px 8px 0!important;font-size:12px!important;font-weight:700!important;color:#2563eb!important;background:#eff6ff!important;border-radius:999px!important;gap:5px!important;border-top:0!important}
      .nx-menu-editor{position:fixed;inset:0;z-index:10001;background:rgba(15,23,42,.45);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .18s ease}
      .nx-menu-editor.open{opacity:1}
      .nx-me-card{background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;padding:16px 14px calc(14px + env(safe-area-inset-bottom,0));max-height:84vh;display:flex;flex-direction:column;transform:translateY(20px);transition:transform .2s ease;box-shadow:0 -10px 40px rgba(15,23,42,.25)}
      .nx-menu-editor.open .nx-me-card{transform:translateY(0)}
      .nx-me-head{display:flex;align-items:center;justify-content:space-between;font-size:16px;font-weight:800;color:#0f172a;margin-bottom:4px}
      .nx-me-x{width:34px;height:34px;border-radius:50%;border:0;background:#f1f5f9;color:#475569;display:grid;place-items:center;cursor:pointer;font-size:16px}
      .nx-me-hint{font-size:12px;color:#475569;margin-bottom:10px}
      .nx-me-list{overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;margin:0 -4px}
      .nx-me-row{display:flex;align-items:center;gap:10px;padding:10px 6px;border-bottom:1px solid #f1f5f9}
      .nx-me-row.off{opacity:.45}
      .nx-me-check{width:26px;height:26px;flex-shrink:0;border-radius:8px;border:2px solid #2563eb;background:#2563eb;color:#fff;display:grid;place-items:center;cursor:pointer;font-size:14px;padding:0}
      .nx-me-row.off .nx-me-check{background:#fff;border-color:#cbd5e1;color:transparent}
      .nx-me-ico{font-size:18px;width:24px;text-align:center}
      .nx-me-label{flex:1;font-size:14px;font-weight:600;color:#0f172a}
      .nx-me-arrows{display:flex;gap:4px}
      .nx-me-arrows button{width:32px;height:32px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;display:grid;place-items:center;cursor:pointer;font-size:15px;padding:0}
      .nx-me-arrows button:disabled{opacity:.3}
      .nx-me-actions{display:flex;gap:8px;margin-top:12px}
      .nx-me-reset{flex:0 0 auto;padding:12px 16px;border-radius:12px;border:1px solid #e2e8f0;background:#fff;color:#475569;font-weight:700;cursor:pointer}
      .nx-me-save{flex:1;padding:12px;border-radius:12px;border:0;background:linear-gradient(135deg,#1e3a6e,#2563eb);color:#fff;font-weight:800;font-size:15px;cursor:pointer}
    `;
    document.head.appendChild(st);
  }
  
  // ═══════════════════════════════════════════════════════════
  // 4.5. CERRAR MENÚ "MÁS" AL TOCAR FUERA
  // ═══════════════════════════════════════════════════════════
  function setupCierreMenuFuera() {
    function maybeClose(ev) {
      const sheet = document.querySelector('.mobile-more-sheet-clean');
      if (!sheet || !sheet.classList.contains('open')) return;
      // Si el clic NO fue dentro del menú ni en el botón flotante
      if (ev.target.closest('.mobile-more-sheet-clean')) return;
      if (ev.target.closest('.nx-fab')) return;
      if (window.__nxToggleMenu) window.__nxToggleMenu(true); else sheet.classList.remove('open');
    }
    document.addEventListener('click', maybeClose, true);
    // En móvil también con touchstart para que responda más rápido
    document.addEventListener('touchstart', maybeClose, true);
  }

  // ═══════════════════════════════════════════════════════════
  // 5. INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════════
  function init() {
    injectCSS();
    if (!isMobile()) return;
    crearFAB();
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
    injectTA2CSS();
    const modal = document.createElement("div");
    modal.className = "overlay";
    modal.id = "nxModalTransferAgenteV2";
    modal.innerHTML = `
      <div class="modal nxTA2-modal">
        <div class="nxTA2-head">
          <div class="nxTA2-head-icon"><i class="ti ti-transfer"></i></div>
          <div class="nxTA2-head-txt">
            <div class="nxTA2-head-title">Transferir dinero</div>
            <div class="nxTA2-head-sub">De un agente a otro · el receptor confirma</div>
          </div>
          <button class="nxTA2-close" type="button" onclick="window.nxCerrarTransferenciaAgenteV2()"><i class="ti ti-x"></i></button>
        </div>
        <div class="nxTA2-body">
          <div class="nxTA2-route">
            <div class="nxTA2-field">
              <label>Entrega</label>
              <div class="nxTA2-control"><i class="ti ti-arrow-up-circle"></i><select id="nxTA2Desde"></select></div>
            </div>
            <div class="nxTA2-route-arrow"><i class="ti ti-arrow-right"></i></div>
            <div class="nxTA2-field">
              <label>Recibe</label>
              <div class="nxTA2-control"><i class="ti ti-arrow-down-circle"></i><select id="nxTA2Hacia"></select></div>
            </div>
          </div>

          <div class="nxTA2-field nxTA2-amount">
            <label>Monto a transferir</label>
            <div class="nxTA2-amount-box">
              <span class="nxTA2-amount-cur">RD$</span>
              <input type="text" id="nxTA2Monto" inputmode="decimal" data-nx-money placeholder="0.00">
            </div>
          </div>

          <div class="nxTA2-field">
            <label>Método</label>
            <div class="nxTA2-control"><i class="ti ti-wallet"></i><select id="nxTA2Metodo"><option>Efectivo</option><option>Transferencia</option></select></div>
          </div>
          <div class="nxTA2-field" id="nxTA2BancoWrap" style="display:none">
            <label>Banco</label>
            <div class="nxTA2-control"><i class="ti ti-building-bank"></i><select id="nxTA2Banco"><option value="">Seleccionar...</option><option>BHD</option><option>Banreservas</option><option>Popular</option><option>Otros</option></select></div>
          </div>
          <div class="nxTA2-field" id="nxTA2BancoOtroWrap" style="display:none">
            <label>Otro banco</label>
            <input class="nxTA2-input" type="text" id="nxTA2BancoOtro" placeholder="Nombre del banco">
          </div>
          <div class="nxTA2-field">
            <label>Referencia</label>
            <input class="nxTA2-input" type="text" id="nxTA2Ref" placeholder="N° de recibo o transferencia">
          </div>
          <div class="nxTA2-field">
            <label>Nota <span class="nxTA2-opt">opcional</span></label>
            <input class="nxTA2-input" type="text" id="nxTA2Nota" placeholder="Detalle adicional">
          </div>

          <div class="nxTA2-info"><i class="ti ti-info-circle"></i><span>El dinero se mueve solo cuando el agente que recibe acepta la transferencia.</span></div>
        </div>
        <div class="nxTA2-foot">
          <button class="nxTA2-btn nxTA2-btn-ghost" type="button" onclick="window.nxCerrarTransferenciaAgenteV2()">Cancelar</button>
          <button class="nxTA2-btn nxTA2-btn-primary" type="button" onclick="window.nxGuardarTransferenciaAgenteV2()" id="nxTA2Btn"><i class="ti ti-send"></i> Enviar transferencia</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    q("#nxTA2Metodo")?.addEventListener("change", toggleBancoTransfer);
    q("#nxTA2Banco")?.addEventListener("change", toggleBancoOtroTransfer);
  }

  function injectTA2CSS() {
    if (document.getElementById("nxTA2-css")) return;
    const s = document.createElement("style");
    s.id = "nxTA2-css";
    s.textContent = `
      #nxModalTransferAgenteV2 .nxTA2-modal{
        padding:0 !important; max-width:460px; border:none !important; overflow:hidden;
        border-radius:22px; box-shadow:0 24px 70px rgba(15,23,42,.28);
        background:#fff !important; color:#0f172a !important;
      }
      #nxModalTransferAgenteV2 .nxTA2-head{
        display:flex; align-items:center; gap:12px; padding:18px 18px 16px;
        background:linear-gradient(135deg,#f5f3ff,#eef2ff); border-bottom:1px solid #eceaf6;
      }
      #nxModalTransferAgenteV2 .nxTA2-head-icon{
        width:42px; height:42px; flex:0 0 42px; border-radius:13px; color:#fff; font-size:20px;
        display:flex; align-items:center; justify-content:center;
        background:linear-gradient(135deg,#7c3aed,#4f46e5); box-shadow:0 8px 18px rgba(79,70,229,.35);
      }
      #nxModalTransferAgenteV2 .nxTA2-head-title{ font-size:16px; font-weight:800; color:#0f172a; }
      #nxModalTransferAgenteV2 .nxTA2-head-sub{ font-size:11px; color:#475569; margin-top:1px; }
      #nxModalTransferAgenteV2 .nxTA2-close{
        margin-left:auto; width:32px; height:32px; border-radius:10px; border:none; cursor:pointer;
        background:rgba(255,255,255,.7); color:#475569; display:flex; align-items:center; justify-content:center; font-size:16px;
      }
      #nxModalTransferAgenteV2 .nxTA2-close:hover{ background:#fff; color:#0f172a; }

      #nxModalTransferAgenteV2 .nxTA2-body{ padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
      #nxModalTransferAgenteV2 .nxTA2-field{ display:flex; flex-direction:column; }
      #nxModalTransferAgenteV2 .nxTA2-field > label{
        font-size:10px; font-weight:800; letter-spacing:.4px; text-transform:uppercase; color:#475569; margin-bottom:5px;
      }
      #nxModalTransferAgenteV2 .nxTA2-opt{ color:#cbd5e1; font-weight:700; text-transform:none; letter-spacing:0; }

      #nxModalTransferAgenteV2 .nxTA2-control{
        position:relative; display:flex; align-items:center;
        background:#f8fafc; border:1.5px solid #e7ecf3; border-radius:12px;
        transition:border-color .15s, box-shadow .15s, background .15s;
      }
      #nxModalTransferAgenteV2 .nxTA2-control:focus-within{ border-color:#7c3aed; background:#fff; box-shadow:0 0 0 3px rgba(124,58,237,.12); }
      #nxModalTransferAgenteV2 .nxTA2-control > i{ position:absolute; left:11px; color:#475569; font-size:15px; pointer-events:none; }
      #nxModalTransferAgenteV2 .nxTA2-control::after{
        content:''; position:absolute; right:13px; width:7px; height:7px;
        border-right:2px solid #475569; border-bottom:2px solid #475569; transform:rotate(45deg); margin-top:-3px; pointer-events:none;
      }
      #nxModalTransferAgenteV2 .nxTA2-control select{
        appearance:none; -webkit-appearance:none; width:100%; border:none; background:transparent; outline:none;
        padding:11px 30px 11px 34px; font-size:13px; font-weight:600; color:#0f172a; cursor:pointer;
      }
      #nxModalTransferAgenteV2 .nxTA2-control select:disabled{ color:#475569; cursor:not-allowed; }

      #nxModalTransferAgenteV2 .nxTA2-input{
        width:100%; background:#f8fafc; border:1.5px solid #e7ecf3; border-radius:12px;
        padding:11px 13px; font-size:13px; color:#0f172a; outline:none; transition:border-color .15s, box-shadow .15s, background .15s;
      }
      #nxModalTransferAgenteV2 .nxTA2-input:focus{ border-color:#7c3aed; background:#fff; box-shadow:0 0 0 3px rgba(124,58,237,.12); }

      #nxModalTransferAgenteV2 .nxTA2-route{ display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:end; }
      #nxModalTransferAgenteV2 .nxTA2-route-arrow{
        width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center;
        background:#eef2ff; color:#4f46e5; font-size:15px; margin-bottom:6px;
      }

      #nxModalTransferAgenteV2 .nxTA2-amount-box{
        display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:14px;
        background:linear-gradient(135deg,#faf5ff,#eff6ff); border:1.5px solid #e9d5ff;
        transition:border-color .15s, box-shadow .15s;
      }
      #nxModalTransferAgenteV2 .nxTA2-amount-box:focus-within{ border-color:#7c3aed; box-shadow:0 0 0 3px rgba(124,58,237,.12); }
      #nxModalTransferAgenteV2 .nxTA2-amount-cur{ font-size:15px; font-weight:800; color:#7c3aed; }
      #nxModalTransferAgenteV2 .nxTA2-amount input{
        flex:1; width:100%; border:none; background:transparent; outline:none; font-size:24px; font-weight:800; color:#0f172a;
      }

      #nxModalTransferAgenteV2 .nxTA2-info{
        display:flex; gap:8px; align-items:flex-start; padding:10px 12px; border-radius:12px;
        background:#eef2ff; border:1px solid #e0e7ff; font-size:11px; color:#4338ca; line-height:1.4;
      }
      #nxModalTransferAgenteV2 .nxTA2-info i{ font-size:15px; margin-top:1px; flex:0 0 auto; }

      #nxModalTransferAgenteV2 .nxTA2-foot{ display:flex; gap:10px; padding:14px 18px 18px; border-top:1px solid #f1f5f9; }
      #nxModalTransferAgenteV2 .nxTA2-btn{
        border:none; border-radius:13px; padding:13px; font-size:13px; font-weight:800; cursor:pointer;
        display:flex; align-items:center; justify-content:center; gap:7px; transition:transform .12s, box-shadow .12s, background .12s;
      }
      #nxModalTransferAgenteV2 .nxTA2-btn-ghost{ flex:0 0 38%; background:#f1f5f9; color:#475569; }
      #nxModalTransferAgenteV2 .nxTA2-btn-ghost:hover{ background:#e2e8f0; }
      #nxModalTransferAgenteV2 .nxTA2-btn-primary{
        flex:1; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; box-shadow:0 8px 20px rgba(79,70,229,.32);
      }
      #nxModalTransferAgenteV2 .nxTA2-btn-primary:hover{ box-shadow:0 10px 24px rgba(79,70,229,.4); }
      #nxModalTransferAgenteV2 .nxTA2-btn-primary:active{ opacity:.85; }
      #nxModalTransferAgenteV2 .nxTA2-btn:disabled{ opacity:.6; cursor:default; transform:none; }

      @media (max-width:560px){
        #nxModalTransferAgenteV2 .nxTA2-route{ grid-template-columns:1fr; gap:6px; }
        #nxModalTransferAgenteV2 .nxTA2-route-arrow{ transform:rotate(90deg); margin:2px auto; }
        #nxModalTransferAgenteV2 .nxTA2-amount input{ font-size:21px; }
      }
    `;
    (document.head || document.documentElement).appendChild(s);
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

  // ── Identidad de la sesión (para bloquear "entrega" a un agente) ──
  function getSesionV2() {
    try { if (typeof sesion !== 'undefined' && sesion) return sesion; } catch(e) {}
    try { return window.sesion || null; } catch(_) { return null; }
  }
  function esAdminV2() {
    const s = getSesionV2();
    return !!(s && s.rol === 'admin');
  }
  // Resuelve el agente vinculado a la sesión (por agente_id o por nombre)
  function miAgenteV2() {
    const s = getSesionV2();
    if (!s) return null;
    const ag = getAgentes();
    const sid = s.agente_id || s.agenteId;
    if (sid) {
      const byId = ag.find(a => String(a.id) === String(sid));
      if (byId) return byId;
    }
    const norm = x => String(x || '').trim().toLowerCase();
    const n = norm(s.nom);
    if (!n) return null;
    return ag.find(a => norm(a.nom) === n) || null;
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

    // Por rol: el admin elige ambos; un agente solo ENVÍA desde sí mismo
    const selDesde = q("#nxTA2Desde");
    const selHacia = q("#nxTA2Hacia");
    if (selDesde) {
      if (esAdminV2()) {
        selDesde.disabled = false;
      } else {
        const mi = miAgenteV2();
        if (!mi) {
          if (typeof window.toast === 'function') {
            window.toast('err', 'Sin agente vinculado', 'Tu usuario no está vinculado a un agente. Pídele al administrador que lo configure.');
          }
          window.nxCerrarTransferenciaAgenteV2();
          return;
        }
        selDesde.value = String(mi.id);
        selDesde.disabled = true;
        selDesde.title = 'Tú entregas el dinero';
        // No puede enviarse a sí mismo: quitarlo de la lista "recibe"
        if (selHacia) {
          Array.from(selHacia.options).forEach(o => { if (o.value === String(mi.id)) o.remove(); });
        }
      }
    }
    toggleBancoTransfer();
  };

  window.nxCerrarTransferenciaAgenteV2 = function () {
    q("#nxModalTransferAgenteV2")?.classList.remove("open");
  };

  window.nxGuardarTransferenciaAgenteV2 = async function () {
    const desde = q("#nxTA2Desde")?.value || "";
    const hacia = q("#nxTA2Hacia")?.value || "";
    const monto = window.nxMoney ? window.nxMoney.parse(q("#nxTA2Monto")?.value) : Number(q("#nxTA2Monto")?.value || 0);
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

    // Entra como "pendiente": el dinero se mueve solo cuando el receptor acepta
    const payload = { desde_agente: desde, hacia_agente: hacia, monto, metodo, banco: banco || null, referencia: ref, nota: nota || null, fecha: today(), estado: 'pendiente' };

    try {
      await api.post(TRANSFER_TABLE, payload);
      if (typeof window.logAudit === "function") {
        window.logAudit("TRANSFERENCIA_AGENTE", getAgenteNombreById(desde) + " → " + getAgenteNombreById(hacia) + " · " + money(monto) + " · " + metodo + (banco ? " · " + banco : "") + " · pendiente", "Cobros");
      }
      toastSafe("ok", "Transferencia enviada", getAgenteNombreById(hacia) + " debe aceptarla · " + money(monto));
      window.nxCerrarTransferenciaAgenteV2();
      // Refrescar avisos y Detalles de Cobro si está visible (sin cambiar período)
      if (typeof window.nxRefrescarSolicitudes === 'function') window.nxRefrescarSolicitudes();
      if (typeof window.nxRefrescarDetallesCobro === 'function') {
        window.nxRefrescarDetallesCobro();
      } else if (typeof window.nxAbrirDetallesCobro === 'function') {
        const cDet = document.getElementById('nxDetallesCobroV1');
        if (cDet && cDet.style.display !== 'none') {
          window.nxAbrirDetallesCobro();
        }
      }
    } catch (e) {
      console.error("Error guardando transferencia:", e);
      toastSafe("err", "No se pudo guardar", "Verifica que exista la tabla transferencias_agentes en Supabase");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Enviar transferencia'; }
    }
  };




  function injectStyles() {
    if (q("#nxReporteAgentesV2CSS")) return;
    const style = document.createElement("style");
    style.id = "nxReporteAgentesV2CSS";
    style.textContent = `#nxReporteAgentesV2{margin-bottom:14px}.nx-report-v2{border-top:4px solid #7c3aed !important}.nx-report-head-v2{align-items:flex-start !important}.nx-actions-v2{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.nx-top-summary-v2{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;margin-bottom:12px}.nx-top-summary-v2>div{border-radius:16px;padding:14px;border:1px solid #e2e8f0;background:#fff}.nx-top-summary-v2 span{display:block;font-size:10px;font-weight:900;color:#475569;letter-spacing:.5px;text-transform:uppercase}.nx-top-summary-v2 b{display:block;margin-top:5px;font-size:22px;color:#0f172a}.nx-top-summary-v2 .green{background:#f0fdf4;border-color:#bbf7d0}.nx-top-summary-v2 .green b{color:#059669}.nx-top-summary-v2 .blue{background:#eff6ff;border-color:#bfdbfe}.nx-top-summary-v2 .blue b{color:#2563eb}.nx-top-summary-v2 .red{background:#fef2f2;border-color:#fecaca}.nx-top-summary-v2 .red b{color:#dc2626}.nx-top-summary-v2 .gray{background:#f8fafc;border-color:#e2e8f0}.nx-method-summary-v2{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px;margin-bottom:12px}.nx-method-card{border:1px solid;border-radius:14px;padding:12px}.nx-method-card span{display:block;font-size:10px;font-weight:900;letter-spacing:.4px}.nx-method-card b{display:block;margin-top:5px;font-size:19px;font-weight:900}.nx-two-cols-v2{display:grid;grid-template-columns:1fr 1.2fr;gap:10px;margin-bottom:12px}.nx-box-v2{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:14px}.nx-box-v2 h3{font-size:12px;margin:0 0 8px;color:#0f172a;font-weight:900}.nx-bank-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #eef2f7;font-size:12px}.nx-bank-row span{font-weight:800;color:#1e293b}.nx-bank-row b{color:#2563eb}.nx-transfer-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.nx-transfer-table-wrap table{min-width:680px}.nx-transfer-table-wrap td,.nx-transfer-table-wrap th{font-size:11px}.nx-agents-grid-v2{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}.nx-agent-card-v2{background:#fff;border:1px solid #e2e8f0;border-radius:22px;padding:16px;box-shadow:0 10px 28px rgba(15,23,42,.08)}.nx-agent-head-v2{display:flex;align-items:center;gap:12px}.nx-agent-avatar-v2{width:50px;height:50px;border-radius:18px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;display:grid;place-items:center;font-size:20px;font-weight:900;box-shadow:0 10px 22px rgba(124,58,237,.28);flex:0 0 auto}.nx-agent-info-v2{min-width:0;flex:1}.nx-agent-name-v2{font-size:15px;font-weight:900;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nx-agent-role-v2,.nx-agent-license-v2,.nx-agent-clientes-v2{font-size:10px;color:#475569;margin-top:2px;font-weight:700}.nx-agent-effect-v2{text-align:center;flex:0 0 auto}.nx-effect-circle-v2{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(closest-side,#fff 72%,transparent 74%),conic-gradient(var(--clr) calc(var(--pct) * 1%),#e2e8f0 0)}.nx-effect-circle-v2 span{font-size:12px;font-weight:900;color:var(--clr)}.nx-agent-effect-v2 small{display:block;margin-top:3px;font-size:8px;color:#475569;font-weight:900}.nx-agent-main-money{background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:18px;padding:14px;margin:14px 0 10px}.nx-agent-main-money span{display:block;font-size:10px;color:#059669;font-weight:900;letter-spacing:.6px}.nx-agent-main-money b{display:block;margin-top:4px;font-size:24px;line-height:1;color:#059669;font-weight:900}.nx-agent-methods-v2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:10px}.nx-mini-title{font-size:9px;color:#475569;font-weight:900;text-transform:uppercase;margin:7px 0}.nx-bank-pills{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}.nx-bank-pills span{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800}.nx-agent-balance-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}.nx-agent-balance-grid>div{background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:9px}.nx-agent-balance-grid span{display:block;font-size:8px;color:#475569;font-weight:900;text-transform:uppercase}.nx-agent-balance-grid b{display:block;margin-top:4px;font-size:12px;color:#0f172a;font-weight:900}.nx-agent-balance-grid b.danger{color:#dc2626}.nx-agent-balance-grid b.blue{color:#2563eb}.nx-agent-balance-grid small{display:block;font-size:8px;color:#475569;margin-top:3px;line-height:1.2}.nx-transfer-mini{display:flex;gap:8px;flex-wrap:wrap;font-size:10px;color:#475569;margin-top:8px}.nx-transfer-mini b{color:#0f172a}.nx-progress-v2{height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;margin-top:9px}.nx-progress-v2 i{display:block;height:100%;border-radius:999px}.nx-empty-soft{background:#f8fafc;border:1px dashed #cbd5e1;color:#475569;border-radius:12px;padding:10px;font-size:10px;font-weight:800}.nx-empty-card-v2{background:#f8fafc;border:1px dashed #cbd5e1;color:#475569;border-radius:18px;padding:24px;text-align:center;font-weight:800}.nx-info-box-v2{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;font-size:11px;color:#1e3a6e;margin-top:8px}@media(max-width:768px){.nx-two-cols-v2{grid-template-columns:1fr}.nx-agents-grid-v2{grid-template-columns:1fr}.nx-method-summary-v2{grid-template-columns:1fr}.nx-agent-methods-v2{grid-template-columns:1fr}.nx-agent-balance-grid{grid-template-columns:1fr}.nx-top-summary-v2{grid-template-columns:repeat(2,minmax(0,1fr))}.nx-actions-v2{justify-content:flex-start;margin-top:8px}}`;
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
  // Una transferencia mueve dinero solo si fue ACEPTADA (o es legado sin estado).
  // Las "pendiente"/"rechazada" no cuentan para dinero en mano ni KPIs.
  function esTxEfectiva(t) {
    return !t.estado || t.estado === 'aceptada';
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
    const D = 20; // día de corte del ciclo de facturación
    let inicio, fin;
    if (hoy.getDate() >= D) {
      // ya pasó el corte: el ciclo vigente va de este mes al próximo
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), D);
      fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, D);
    } else {
      // antes del corte: el ciclo vigente va del mes pasado a este mes
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, D);
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), D);
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

    // Ciclo EN CURSO = el período VIGENTE (el que contiene hoy)
    ciclos.push({
      inicio: new Date(base.inicio), fin: new Date(base.fin),
      nombre: nombreCiclo(base) + ' · EN CURSO',
      key: `${base.inicio.getTime()}_${base.fin.getTime()}`,
      enCurso: true
    });

    // Ciclos cerrados anteriores (del más reciente al más antiguo)
    for (let i = 1; i <= cantidad; i++) {
      const ini = new Date(base.inicio); ini.setMonth(ini.getMonth() - i);
      const fin = new Date(base.fin); fin.setMonth(fin.getMonth() - i);
      ciclos.push({
        inicio: ini, fin: fin,
        nombre: nombreCiclo({inicio: ini, fin: fin}),
        key: `${ini.getTime()}_${fin.getTime()}`
      });
    }

    // Opción para ver TODO junto (todos los períodos anteriores + el actual)
    ciclos.push({
      inicio: new Date(0),                  // 1970
      fin: new Date(8640000000000000),      // fecha máxima válida
      nombre: 'TODOS LOS PERÍODOS',
      key: 'ALL',
      todos: true
    });
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

  // Devuelve la sesión actual de forma segura (tabla usuarios_sistema)
  function getSesion() {
    try {
      if (typeof sesion !== 'undefined' && sesion) return sesion;
    } catch(e) {}
    try { return window.sesion || null; } catch(_) { return null; }
  }

  // Resuelve el AGENTE vinculado a la sesión actual.
  // Usuarios y agentes son tablas distintas; el vínculo es por nombre
  // (o por agente_id si la sesión lo trae). Devuelve el agente o null.
  function agenteDeSesion() {
    const ses = getSesion();
    if (!ses) return null;
    const agentes = Array.isArray(st().agentes) ? st().agentes : [];
    if (!agentes.length) return null;
    const norm = s => String(s || '').trim().toLowerCase();
    // 1) Vínculo directo por id, si existe
    const sid = ses.agente_id || ses.agenteId;
    if (sid) {
      const byId = agentes.find(a => String(a.id) === String(sid));
      if (byId) return byId;
    }
    // 2) Vínculo por nombre
    const n = norm(ses.nom);
    if (!n) return null;
    return agentes.find(a => norm(a.nom) === n) || null;
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

  function calcularPendienteTotal(soloAgenteId) {
    let facturas = Array.isArray(st().facturas) ? st().facturas : [];
    let clientes = Array.isArray(st().clientes) ? st().clientes : [];
    // Si se pasa un agente, limitar el pendiente a SUS clientes/facturas
    if (soloAgenteId) {
      clientes = clientes.filter(c => String(c.agente_id || '') === String(soloAgenteId));
      const idsCli = new Set(clientes.map(c => String(c.id)));
      facturas = facturas.filter(f => idsCli.has(String(f.cliente_id)));
    }
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
      { color: '#10b981', c1: '#34e0aa', c2: '#0b9466', value: stats.efectivo, label: 'Efectivo' },
      { color: '#3b82f6', c1: '#60a5fa', c2: '#1d4ed8', value: stats.banco,    label: 'Banco / Transferencia' },
      { color: '#f59e0b', c1: '#fbbf24', c2: '#d97706', value: stats.cheque,   label: 'Cheque' },
      { color: '#a855f7', c1: '#c084fc', c2: '#9333ea', value: stats.otros,    label: 'Otros' }
    ];

    // Degradados por segmento (luz arriba, sombra abajo) para dar volumen 3D
    const grads = segmentos.map((s, i) => `
      <linearGradient id="nxDonutG${i}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${s.c1}"/>
        <stop offset="55%" stop-color="${s.color}"/>
        <stop offset="100%" stop-color="${s.c2}"/>
      </linearGradient>`).join('');

    // Filtro de profundidad (sombra proyectada suave del aro de color)
    const defs = `
      <defs>
        ${grads}
        <filter id="nxDonut3D" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.22"/>
        </filter>
        <radialGradient id="nxDonutGloss" cx="50%" cy="30%" r="62%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="42%" stop-color="#ffffff" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </radialGradient>
      </defs>`;

    const paths = segmentos.map((s, i) => {
      if (s.value === 0) return '';
      const pct = s.value / total;
      const len = pct * circumference;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${radius}"
        fill="none" stroke="url(#nxDonutG${i})" stroke-width="26"
        stroke-dasharray="${len.toFixed(2)} ${circumference.toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})"
        style="transition:stroke-dasharray .4s ease"/>`;
      offset += len;
      return seg;
    }).join('');

    // Brillo cristalino superior (reflejo de vidrio sobre el aro)
    const gloss = `<circle cx="${cx}" cy="${cy}" r="${radius + 1}" fill="none"
      stroke="url(#nxDonutGloss)" stroke-width="26" transform="rotate(-90 ${cx} ${cy})"
      style="pointer-events:none"/>`;

    const leyenda = segmentos.map(s => {
      const pct = total > 0 ? ((s.value/total)*100).toFixed(1) : '0.0';
      return `
        <div class="nxDC-leg-item">
          <div class="nxDC-leg-dot" style="background-color:${s.color}"></div>
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
            ${defs}
            <circle cx="100" cy="100" r="70" fill="none" stroke="#eef2f7" stroke-width="26"/>
            <g filter="url(#nxDonut3D)">${paths}</g>
            ${gloss}
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
  function renderKPIsRow(stats, pendiente, totalTransferido, dineroEnMano, dineroEnManoAcumulado, todos) {
    const F = getFmt();
    const acum = (typeof dineroEnManoAcumulado === 'number') ? dineroEnManoAcumulado : dineroEnMano;
    const lblCobrado = todos ? 'TOTAL COBRADO (TODOS)' : 'TOTAL COBRADO DEL CICLO';
    const subCobrado = todos ? 'De todos los períodos' : 'Acumulado del período actual';
    const subTransf = todos ? 'Envíos entre agentes (todos)' : 'Envíos entre agentes';
    return `
      <div class="nxDC-kpis-row">
        <div class="nxDC-kpi">
          <div class="nxDC-kpi-icon" style="background:#dcfce7;color:#059669">
            <i class="ti ti-currency-dollar"></i>
          </div>
          <div class="nxDC-kpi-body">
            <div class="nxDC-kpi-label">${lblCobrado}</div>
            <div class="nxDC-kpi-value" style="color:#059669">${F(stats.total)}</div>
            <div class="nxDC-kpi-sub">${subCobrado}</div>
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
            <div class="nxDC-kpi-sub">${subTransf}</div>
          </div>
        </div>
        <div class="nxDC-kpi">
          <div class="nxDC-kpi-icon" style="background:#f3e8ff;color:#7c3aed">
            <i class="ti ti-wallet"></i>
          </div>
          <div class="nxDC-kpi-body">
            <div class="nxDC-kpi-label">DINERO EN MANO REAL</div>
            <div class="nxDC-kpi-value" style="color:#7c3aed">${F(acum)}</div>
            <div class="nxDC-kpi-sub">Acumulado · <strong>${F(dineroEnMano)}</strong> ${todos ? 'en total' : 'del ciclo'}</div>
          </div>
        </div>
      </div>
    `;
  }

  // Badge visual por banco: color de marca + iniciales (referencia rápida).
  // Para bancos no listados, deriva un color estable del nombre.
  function bancoBadge(nombre) {
    var raw = String(nombre == null ? '' : nombre).trim();
    var n = raw.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!n || /SIN\s*BANCO|EFECTIVO|CAJA/.test(n)) {
      return '<span class="nxDC-bank-badge" style="background:linear-gradient(145deg,#475569,#cbd5e1)"><i class="ti ti-wallet"></i></span>';
    }
    // Logos reales (archivos provistos). APAP no debe usar el logo de Popular.
    if (!/APAP|ASOC.*POPULAR/.test(n)) {
      var LB = 'https://raw.githubusercontent.com/sterlinr08-dte/nexus-pro/main/logos/';
      var logos = [[/BANRESERVAS|RESERVAS/, 'banco-banreservas.png'], [/BHD/, 'banco-bhd.png'], [/POPULAR/, 'banco-popular.png']];
      for (var L = 0; L < logos.length; L++) {
        if (logos[L][0].test(n)) {
          return '<span class="nxDC-bank-badge nxDC-bank-logo"><img src="' + LB + logos[L][1] + '" alt="' + esc(raw) + '" loading="lazy"></span>';
        }
      }
    }
    var map = [
      [/APAP|ASOC.*POPULAR/,        '#ea580c', '#fb923c', 'AP'],
      [/BANRESERVAS|RESERVAS/,      '#0d9488', '#14b8a6', 'BR'],
      [/BHD/,                       '#0b3b8f', '#2563eb', 'BHD'],
      [/POPULAR/,                   '#1e40af', '#2563eb', 'BP'],
      [/SCOTIA/,                    '#dc2626', '#f43f5e', 'S'],
      [/SANTA\s*CRUZ/,              '#047857', '#10b981', 'SC'],
      [/PROMERICA/,                 '#15803d', '#22c55e', 'PR'],
      [/CARIBE/,                    '#1e3a8a', '#3b82f6', 'BC'],
      [/VIMENCA/,                   '#b91c1c', '#ef4444', 'VI'],
      [/ADEMI/,                     '#c2410c', '#fb923c', 'AD'],
      [/LAFISE/,                    '#1d4ed8', '#60a5fa', 'LF'],
      [/CIBAO/,                     '#1d4ed8', '#60a5fa', 'AC'],
      [/LOPEZ\s*DE\s*HARO|BLH/,     '#1e40af', '#3b82f6', 'LH'],
      [/BDI/,                       '#0e7490', '#06b6d4', 'BDI'],
      [/BANESCO/,                   '#15803d', '#22c55e', 'BA'],
      [/QIK/,                       '#7c3aed', '#a855f7', 'Q'],
      [/ALAVER/,                    '#b45309', '#f59e0b', 'AL'],
      [/MOTOR\s*CREDITO/,           '#9333ea', '#c084fc', 'MC']
    ];
    for (var i = 0; i < map.length; i++) {
      if (map[i][0].test(n)) {
        return '<span class="nxDC-bank-badge" style="background:linear-gradient(145deg,' + map[i][1] + ',' + map[i][2] + ')">' + map[i][3] + '</span>';
      }
    }
    // Respaldo: color estable derivado del nombre + iniciales
    var h = 0;
    for (var k = 0; k < n.length; k++) h = (h * 31 + n.charCodeAt(k)) >>> 0;
    var hue = h % 360;
    var c1 = 'hsl(' + hue + ',60%,42%)', c2 = 'hsl(' + ((hue + 26) % 360) + ',70%,55%)';
    var words = n.replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    var ab = words.length >= 2 ? (words[0].charAt(0) + words[1].charAt(0)) : (words[0] ? words[0].substring(0, 2) : '?');
    return '<span class="nxDC-bank-badge" style="background:linear-gradient(145deg,' + c1 + ',' + c2 + ')">' + ab + '</span>';
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
          ${bancoBadge(b.nombre)}
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
  // RENDER — PANEL DE TRANSFERENCIAS (crear + aprobar + historial)
  //   verTodo=true  → admin (ve todas)
  //   verTodo=false → agente (solo lo suyo); miId = id de su agente
  // ═══════════════════════════════════════════════════════════
  function renderPanelTransferencias(periodoTx, allTx, verTodo, miId) {
    const F = getFmt();

    // Resumen del ciclo (solo transferencias ACEPTADAS: dinero que ya se movió)
    const efectivasPeriodo = periodoTx.filter(esTxEfectiva);
    let enviado = 0, recibido = 0;
    if (verTodo) {
      enviado = efectivasPeriodo.reduce((s, t) => s + Number(t.monto || 0), 0);
      recibido = enviado;
    } else {
      efectivasPeriodo.forEach(t => {
        if (String(t.desde_agente) === miId) enviado += Number(t.monto || 0);
        if (String(t.hacia_agente) === miId) recibido += Number(t.monto || 0);
      });
    }
    const neto = recibido - enviado;
    const netoColor = neto > 0 ? '#059669' : neto < 0 ? '#dc2626' : '#475569';

    // Pendientes por aprobar (entrantes), de cualquier fecha
    const pendientes = verTodo
      ? allTx.filter(t => t.estado === 'pendiente')
      : allTx.filter(t => t.estado === 'pendiente' && String(t.hacia_agente) === miId);

    const filasPend = pendientes.map(t => {
      const desde = getGAgt(t.desde_agente)?.nom || '—';
      const hacia = getGAgt(t.hacia_agente)?.nom || '—';
      const meta = [fmtFecha(t.fecha), t.metodo, t.banco, t.referencia].filter(Boolean).map(esc).join(' · ');
      return `
        <div class="nxDC-txp-item">
          <div class="nxDC-txp-info">
            <div class="nxDC-txp-ruta"><strong>${esc(desde)}</strong> <i class="ti ti-arrow-right"></i> <strong>${esc(hacia)}</strong></div>
            <div class="nxDC-txp-meta">${meta}</div>
          </div>
          <div class="nxDC-txp-monto">${F(t.monto)}</div>
          <div class="nxDC-txp-acc">
            <button class="nxDC-btn nxDC-btn-ok" type="button" onclick="window.nxAceptarTransferencia && window.nxAceptarTransferencia('${esc(t.id)}')"><i class="ti ti-check"></i> Aceptar</button>
            <button class="nxDC-btn nxDC-btn-no" type="button" onclick="window.nxRechazarTransferencia && window.nxRechazarTransferencia('${esc(t.id)}')"><i class="ti ti-x"></i> Rechazar</button>
          </div>
        </div>`;
    }).join('');

    const bloquePend = pendientes.length ? `
      <div class="nxDC-txp-wrap">
        <div class="nxDC-txp-title"><i class="ti ti-clock-hour-4"></i> POR APROBAR (${pendientes.length})</div>
        ${filasPend}
      </div>` : '';

    // Historial del ciclo
    const estadoBadge = (t) => {
      const e = t.estado || 'aceptada';
      if (e === 'pendiente') return '<span class="nxDC-tx-badge nxDC-tx-pend">Pendiente</span>';
      if (e === 'rechazada') return '<span class="nxDC-tx-badge nxDC-tx-rech">Rechazada</span>';
      return '<span class="nxDC-tx-badge nxDC-tx-ok">Aceptada</span>';
    };
    const hist = periodoTx.slice(0, 15);
    const filasHist = hist.map(t => {
      const desde = getGAgt(t.desde_agente)?.nom || '—';
      const hacia = getGAgt(t.hacia_agente)?.nom || '—';
      const flecha = (!verTodo && String(t.desde_agente) === miId) ? '#dc2626'
                   : (!verTodo && String(t.hacia_agente) === miId) ? '#059669' : '#2563eb';
      return `
        <tr>
          <td class="nxDC-tx-fecha">${fmtFecha(t.fecha)}</td>
          <td>${esc(desde)}</td>
          <td><i class="ti ti-arrow-right" style="color:${flecha}"></i></td>
          <td>${esc(hacia)}</td>
          <td class="nxDC-num">${F(t.monto)}</td>
          <td>${estadoBadge(t)}</td>
        </tr>`;
    }).join('');

    const tablaHist = hist.length ? `
      <div class="nxDC-table-wrap">
        <table class="nxDC-table nxDC-tx-table">
          <thead>
            <tr><th>FECHA</th><th>DESDE</th><th></th><th>HACIA</th><th class="nxDC-num">MONTO</th><th>ESTADO</th></tr>
          </thead>
          <tbody>${filasHist}</tbody>
        </table>
      </div>` : '<div class="nxDC-empty-soft">Sin transferencias en este ciclo</div>';

    return `
      <div class="nxDC-card nxDC-tx-card">
        <div class="nxDC-tx-head">
          <div class="nxDC-card-title" style="margin:0">TRANSFERENCIAS ENTRE AGENTES</div>
          <button class="nxDC-tx-btn" type="button" onclick="window.nxAbrirTransferenciaAgenteV2 && window.nxAbrirTransferenciaAgenteV2()">
            <i class="ti ti-transfer"></i> Transferir dinero
          </button>
        </div>
        <div class="nxDC-tx-chips">
          <div class="nxDC-tx-chip nxDC-tx-chip-out">
            <div class="nxDC-tx-chip-ico" style="background:#fee2e2;color:#dc2626"><i class="ti ti-arrow-up"></i></div>
            <div class="nxDC-tx-chip-body"><div class="nxDC-tx-chip-lbl">ENVIADO</div><div class="nxDC-tx-chip-val">${F(enviado)}</div></div>
          </div>
          <div class="nxDC-tx-chip nxDC-tx-chip-in">
            <div class="nxDC-tx-chip-ico" style="background:#dcfce7;color:#059669"><i class="ti ti-arrow-down"></i></div>
            <div class="nxDC-tx-chip-body"><div class="nxDC-tx-chip-lbl">RECIBIDO</div><div class="nxDC-tx-chip-val">${F(recibido)}</div></div>
          </div>
          <div class="nxDC-tx-chip nxDC-tx-chip-net">
            <div class="nxDC-tx-chip-ico" style="background:#e0e7ff;color:#4f46e5"><i class="ti ti-scale"></i></div>
            <div class="nxDC-tx-chip-body"><div class="nxDC-tx-chip-lbl">NETO</div><div class="nxDC-tx-chip-val" style="color:${netoColor}">${F(neto)}</div></div>
          </div>
        </div>
        ${bloquePend}
        <div class="nxDC-tx-hist-title">HISTORIAL${verTodo ? '' : ' (TUYO)'}</div>
        ${tablaHist}
      </div>`;
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
          <div style="font-size:13px;color:#475569;margin-bottom:14px">Hubo un problema cargando los datos. Verifica tu conexión.</div>
          <button class="btn bsm bc1" onclick="window.nxAbrirDetallesCobro && window.nxAbrirDetallesCobro()" style="cursor:pointer">
            <i class="ti ti-refresh"></i> Reintentar
          </button>
        </div>
      `;
      return;
    }

    // ── ACCESO POR ROL ──
    // El admin ve TODO. Cualquier otro usuario (agente) solo ve lo suyo:
    // sus cobros, su dinero en mano, sus transferencias y su pendiente.
    const verTodo = esAdmin();
    let miAgente = null, miId = null;
    if (!verTodo) {
      miAgente = agenteDeSesion();
      // Si no se resuelve el agente, se usa un id imposible => no ve datos ajenos
      miId = miAgente ? String(miAgente.id) : '__sin_agente__';
      abonos = abonos.filter(a => String(a.agente_cobro) === miId);
      transferencias = transferencias.filter(t =>
        String(t.desde_agente) === miId || String(t.hacia_agente) === miId);
      entregas = entregas.filter(e => String(e.agente_id) === miId);
    }

    const { stats, abonosPeriodo } = calcularKPIs(abonos, periodo);
    const porBanco = calcularPorBanco(abonosPeriodo);
    // TODAS las transferencias (para historial y "por aprobar")
    const transferenciasPeriodo = transferencias.filter(t => enRango(t.fecha, periodo.inicio, periodo.fin));
    // Solo EFECTIVAS (aceptadas) para el dinero: KPIs, dinero en mano, totales
    const txEfectivas = transferencias.filter(esTxEfectiva);
    const txEfectivasPeriodo = txEfectivas.filter(t => enRango(t.fecha, periodo.inicio, periodo.fin));
    const entregasPeriodo = entregas.filter(e => enRango(e.fecha, periodo.inicio, periodo.fin));
    let porAgente = calcularPorAgente(abonosPeriodo, txEfectivasPeriodo, abonos, txEfectivas, periodo.fin, entregas);
    // Un agente solo se ve a sí mismo en el detalle por agente (la contraparte
    // de una transferencia no debe aparecer como fila aparte)
    if (!verTodo) porAgente = porAgente.filter(a => String(a.id) === miId);
    const hayTransferencias = transferenciasPeriodo.length > 0;
    const pendiente = calcularPendienteTotal(verTodo ? null : miId);
    const totalTransferido = txEfectivasPeriodo.reduce((s, t) => s + Number(t.monto || 0), 0);
    const dineroEnMano = porAgente.reduce((s, a) => s + Number(a.enMano || 0), 0);
    const dineroEnManoAcumulado = porAgente.reduce((s, a) => s + Number(a.enManoAcumulado || 0), 0);

    cont.innerHTML = `
      <div class="nxDC-wrap">
        ${renderHeader(listaCiclos, periodo, indexActual)}
        ${renderKPIsRow(stats, pendiente, totalTransferido, dineroEnMano, dineroEnManoAcumulado, !!periodo.todos)}
        <div class="nxDC-row-2col">
          <div class="nxDC-card">
            <div class="nxDC-card-title">RESUMEN POR MÉTODO DE COBRO</div>
            ${renderDonut(stats)}
          </div>
          ${renderBancos(porBanco, stats.banco)}
        </div>
        ${renderTablaAgentes(porAgente, hayTransferencias)}
        ${esAdmin() ? renderCajaCentral(entregas, entregasPeriodo) : ''}
        ${renderPanelTransferencias(transferenciasPeriodo, transferencias, verTodo, miId)}
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

    // Al abrir SIEMPRE mostrar el período vigente (EN CURSO)
    cicloSeleccionado = null;

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
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px">
          <button class="btn bsm bghost" type="button" onclick="window.nxVolverResumen()">
            <i class="ti ti-arrow-left"></i> Volver al Resumen
          </button>
          <button class="btn bsm bghost" type="button" onclick="window.nxVolverResumen()" title="Cerrar">
            <i class="ti ti-x"></i>
          </button>
        </div>
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

  // Refrescar SIN cambiar el período seleccionado (para actualizaciones en vivo,
  // p. ej. al aceptar/rechazar/crear una transferencia)
  window.nxRefrescarDetallesCobro = function() {
    const c = document.getElementById('nxDetallesCobroV1');
    if (c && c.style.display !== 'none') renderDetallesCobro();
  };

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
          <div class="fr"><label>Monto RD$ *</label><input type="text" id="nxEA_Monto" inputmode="decimal" data-nx-money placeholder="0.00"></div>
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
    const monto = window.nxMoney ? window.nxMoney.parse(document.getElementById('nxEA_Monto')?.value) : Number(document.getElementById('nxEA_Monto')?.value || 0);
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
      .nxDC-loading { display:flex; align-items:center; gap:10px; padding:30px; justify-content:center; color:#475569; font-weight:600; }
      
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
      .nxDC-head-sub { font-size:12px; color:#475569; margin-top:3px; font-weight:500; }
      .nxDC-head-right { flex:0 0 auto; }
      .nxDC-period { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:8px 12px; min-width:280px; }
      .nxDC-period-label { font-size:10px; color:#475569; font-weight:700; letter-spacing:.4px; margin-bottom:4px; }
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
      .nxDC-kpi-label { font-size:10px; font-weight:800; color:#475569; letter-spacing:.5px; line-height:1.3; margin-bottom:5px; }
      .nxDC-kpi-value { font-size:22px; font-weight:900; line-height:1.1; margin-bottom:3px; font-family:var(--mono,'SF Mono',monospace); letter-spacing:-.3px; }
      .nxDC-kpi-sub { font-size:11px; color:#475569; font-weight:500; }

      /* ═══ ROW 2 COL ═══ */
      .nxDC-row-2col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

      /* ═══ CARDS GENÉRICAS ═══ */
      .nxDC-card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:18px; box-shadow:0 1px 3px rgba(0,0,0,.03); }
      .nxDC-card-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; gap:10px; flex-wrap:wrap; }
      .nxDC-card-title { font-size:11px; font-weight:800; color:#475569; letter-spacing:.7px; }
      .nxDC-card-head .nxDC-card-title { margin:0; }
      .nxDC-muted { color:#475569; font-weight:600; }
      .nxDC-empty-soft { padding:24px; text-align:center; color:#475569; font-size:12px; font-weight:600; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px; }
      .nxDC-link { color:#2563eb; font-size:11px; font-weight:700; text-decoration:none; }

      /* ═══ DONUT ═══ */
      .nxDC-donut-block { display:grid; grid-template-columns:auto 1fr; gap:18px; align-items:center; }
      .nxDC-donut-chart { position:relative; width:160px; height:160px; flex:0 0 auto; }
      .nxDC-donut-svg { width:100%; height:100%; }
      .nxDC-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
      /* hueco central con profundidad (sombra interior tipo vidrio) */
      .nxDC-donut-center::before { content:''; position:absolute; width:54%; height:54%; border-radius:50%;
        background:radial-gradient(circle at 50% 34%, #ffffff, #eef3f9 78%);
        box-shadow: inset 0 2px 5px rgba(15,23,42,.10), inset 0 -2px 4px rgba(255,255,255,.9), 0 1px 2px rgba(15,23,42,.06);
        z-index:-1; }
      .nxDC-donut-amt { font-size:11px; color:#475569; font-weight:700; }
      .nxDC-donut-val { font-size:22px; font-weight:900; color:#0f172a; font-family:var(--mono,monospace); line-height:1; margin:2px 0; }
      .nxDC-donut-lbl { font-size:10px; color:#475569; font-weight:700; letter-spacing:.5px; }
      .nxDC-legend { display:flex; flex-direction:column; gap:10px; min-width:0; }
      .nxDC-leg-item { display:grid; grid-template-columns:auto 1fr auto auto; align-items:center; gap:10px; font-size:12px; }
      .nxDC-leg-dot { width:13px; height:13px; border-radius:50%; flex:0 0 auto; position:relative;
        box-shadow: inset 0 1.5px 2px rgba(255,255,255,.75), inset 0 -2px 3px rgba(0,0,0,.22), 0 2px 4px rgba(15,23,42,.22);
        background-image: linear-gradient(150deg, rgba(255,255,255,.45), rgba(0,0,0,.12)); }
      .nxDC-leg-name { color:#475569; font-weight:600; }
      .nxDC-leg-val { color:#0f172a; font-weight:700; font-family:var(--mono,monospace); font-size:11px; }
      .nxDC-leg-pct { color:#475569; font-weight:700; font-size:11px; min-width:42px; text-align:right; }
      .nxDC-leg-empty { color:#475569; font-size:12px; padding:10px; text-align:center; }

      /* ═══ BANCOS ═══ */
      .nxDC-bancos-list { display:flex; flex-direction:column; gap:2px; }
      .nxDC-banco-row { display:flex; justify-content:space-between; align-items:center; padding:10px 4px; border-bottom:1px solid #f1f5f9; }
      .nxDC-banco-row:last-of-type { border-bottom:0; }
      .nxDC-banco-cell { display:flex; align-items:center; gap:10px; color:#0f172a; font-weight:600; font-size:13px; }
      .nxDC-banco-cell i { font-size:18px; color:#475569; }
      .nxDC-bank-badge {
        width:36px; height:36px; min-width:36px; flex:0 0 auto;
        border-radius:11px;
        display:inline-flex; align-items:center; justify-content:center;
        color:#fff; font-weight:800; font-size:11.5px; letter-spacing:.3px;
        box-shadow:0 4px 10px rgba(30,58,110,.22), inset 0 1px 0 rgba(255,255,255,.45);
      }
      .nxDC-bank-badge i { font-size:18px; color:#fff !important; }
      .nxDC-bank-badge.nxDC-bank-logo { background:#fff !important; }
      .nxDC-bank-badge.nxDC-bank-logo img { width:100%; height:100%; object-fit:contain; padding:3px; box-sizing:border-box; border-radius:11px; display:block; }
      .nxDC-banco-monto { font-weight:700; color:#0f172a; font-family:var(--mono,monospace); font-size:13px; }
      .nxDC-banco-total { display:flex; justify-content:space-between; align-items:center; padding:12px 4px 4px; border-top:1px solid #e2e8f0; margin-top:8px; }
      .nxDC-banco-total > div:first-child { font-weight:800; color:#0f172a; font-size:13px; }
      .nxDC-banco-total > div:last-child { font-weight:800; color:#2563eb; font-family:var(--mono,monospace); font-size:15px; }

      /* ═══ TABLA AGENTES + TRANSFERENCIAS ═══ */
      .nxDC-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
      .nxDC-table { width:100%; border-collapse:collapse; font-size:12px; }
      .nxDC-table thead th { padding:10px 12px; text-align:left; font-size:9px; font-weight:800; color:#475569; letter-spacing:.6px; background:#f8fafc; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
      .nxDC-table tbody td { padding:12px; border-bottom:1px solid #f1f5f9; color:#0f172a; font-weight:600; }
      .nxDC-table tbody tr:last-child td { border-bottom:0; }
      .nxDC-table tfoot td { padding:12px; background:#f8fafc; border-top:2px solid #e2e8f0; font-size:13px; }
      .nxDC-table .nxDC-num { text-align:right; font-family:var(--mono,monospace); white-space:nowrap; }
      .nxDC-table th.nxDC-num { text-align:right; }
      .nxDC-num-green { color:#059669; font-weight:700; }
      .nxDC-num-blue { color:#2563eb; font-weight:700; }
      .nxDC-num-stack { text-align:right; vertical-align:middle; }
      .nxDC-stack-big { font-weight:700; font-size:13px; line-height:1.15; font-family:var(--mono,monospace); }
      .nxDC-stack-small { font-size:10px; color:#475569; font-weight:500; margin-top:3px; font-family:var(--mono,monospace); }
      .nxDC-muted-xs { color:#475569; font-size:9px; font-family:inherit; }
      .nxDC-muted-sm { color:#475569; font-size:8.5px; font-weight:600; letter-spacing:.3px; display:block; margin-top:2px; }

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
      .nxDC-caja-mini-lbl { font-size:9.5px; font-weight:800; color:#475569; letter-spacing:.5px; margin-bottom:6px; }
      .nxDC-caja-cash .nxDC-caja-mini-lbl { color:#059669; }
      .nxDC-caja-pend .nxDC-caja-mini-lbl { color:#d97706; }
      .nxDC-caja-dep  .nxDC-caja-mini-lbl { color:#2563eb; }
      .nxDC-caja-mini-val { font-size:18px; font-weight:900; line-height:1.1; font-family:var(--mono,monospace); color:#0f172a; }
      .nxDC-caja-cash .nxDC-caja-mini-val { color:#059669; }
      .nxDC-caja-pend .nxDC-caja-mini-val { color:#d97706; }
      .nxDC-caja-dep  .nxDC-caja-mini-val { color:#2563eb; }
      .nxDC-caja-mini-sub { font-size:9.5px; color:#475569; font-weight:500; margin-top:4px; line-height:1.3; }
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
      .nxDC-mini-conf:hover { background:#bfdbfe; }
      .nxDC-mini-dep { background:#dcfce7; color:#059669; }
      .nxDC-mini-dep:hover { background:#bbf7d0; }
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
      .nxDC-transf-sub { font-size:11px; color:#475569; font-weight:500; margin-top:4px; }
      .nxDC-neto { padding-top:14px; border-top:1px solid #e2e8f0; }
      .nxDC-neto-label { font-size:11px; font-weight:800; color:#475569; letter-spacing:.5px; margin-bottom:6px; }
      .nxDC-neto-val { font-size:24px; font-weight:900; color:#2563eb; font-family:var(--mono,monospace); }
      .nxDC-neto-sub { font-size:11px; color:#475569; font-weight:500; margin-top:3px; }

      /* ═══ HISTORIAL TRANSFERENCIAS ═══ */
      .nxDC-tx-table tbody td { font-size:12px; }
      .nxDC-tx-fecha { font-family:var(--mono,monospace); color:#475569; font-size:11px; }
      .nxDC-tx-ref { font-family:var(--mono,monospace); color:#475569; font-size:11px; }
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

      /* ═══ PANEL DE TRANSFERENCIAS (crear + aprobar + historial) ═══ */
      .nxDC-tx-card {
        display:flex; flex-direction:column; gap:14px;
        background:linear-gradient(180deg,#ffffff,#fbfaff); border:1px solid #efeafd;
      }
      .nxDC-tx-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      .nxDC-tx-btn {
        display:inline-flex; align-items:center; justify-content:center; gap:9px;
        background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border:none;
        border-radius:14px; padding:13px 18px; font-size:13px; font-weight:800; letter-spacing:.2px;
        cursor:pointer; white-space:nowrap; flex:1 1 auto;
        box-shadow:0 10px 22px rgba(79,70,229,.30); transition:transform .12s ease, box-shadow .12s ease;
      }
      .nxDC-tx-btn:hover { box-shadow:0 14px 28px rgba(79,70,229,.40); }
      .nxDC-tx-btn:active { opacity:.85; }
      .nxDC-tx-btn i { font-size:17px; }

      /* Rejilla adaptable de resumen */
      .nxDC-tx-chips { display:grid; gap:11px; grid-template-columns:repeat(auto-fit,minmax(148px,1fr)); }
      .nxDC-tx-chip {
        position:relative; display:flex; align-items:center; gap:11px; overflow:hidden;
        background:#fff; border:1px solid #eef0f6; border-radius:16px; padding:13px 14px;
        box-shadow:0 4px 14px rgba(15,23,42,.05);
      }
      .nxDC-tx-chip::before { content:''; position:absolute; left:0; top:0; bottom:0; width:4px; background:#cbd5e1; }
      .nxDC-tx-chip-out::before { background:#ef4444; }
      .nxDC-tx-chip-in::before  { background:#10b981; }
      .nxDC-tx-chip-net::before { background:#6366f1; }
      .nxDC-tx-chip-ico {
        width:38px; height:38px; flex:0 0 38px; border-radius:12px;
        display:flex; align-items:center; justify-content:center; font-size:18px;
      }
      .nxDC-tx-chip-body { min-width:0; }
      .nxDC-tx-chip-lbl { font-size:9px; font-weight:800; letter-spacing:.5px; color:#475569; }
      .nxDC-tx-chip-val { font-size:18px; font-weight:800; color:#0f172a; line-height:1.2; font-variant-numeric:tabular-nums; }

      /* Pendientes por aprobar */
      .nxDC-txp-wrap {
        border:1px solid #fde68a; background:linear-gradient(180deg,#fffdf5,#fffbeb);
        border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:9px;
      }
      .nxDC-txp-title { font-size:11px; font-weight:800; color:#b45309; display:flex; align-items:center; gap:6px; letter-spacing:.3px; }
      .nxDC-txp-item {
        display:grid; gap:9px 12px; align-items:center; grid-template-columns:1fr auto;
        padding:11px; background:#fff; border:1px solid #fde9c8; border-radius:12px;
        box-shadow:0 3px 10px rgba(180,83,9,.06);
      }
      .nxDC-txp-ruta { font-size:12.5px; color:#0f172a; }
      .nxDC-txp-ruta i { color:#f59e0b; font-size:13px; vertical-align:middle; }
      .nxDC-txp-meta { font-size:10px; color:#475569; margin-top:3px; }
      .nxDC-txp-monto { font-size:15px; font-weight:800; color:#b45309; font-variant-numeric:tabular-nums; }
      .nxDC-txp-acc { grid-column:1 / -1; display:flex; gap:8px; flex-wrap:wrap; }
      .nxDC-btn {
        display:inline-flex; align-items:center; gap:6px; border:none; border-radius:10px;
        padding:9px 12px; font-size:11.5px; font-weight:800; cursor:pointer; flex:1 1 auto; justify-content:center;
        transition:background .12s ease;
      }
      .nxDC-btn-ok { background:#dcfce7; color:#047857; }
      .nxDC-btn-ok:hover { background:#bbf7d0; }
      .nxDC-btn-no { background:#fee2e2; color:#b91c1c; }
      .nxDC-btn-no:hover { background:#fecaca; }

      .nxDC-tx-hist-title { font-size:11px; font-weight:800; color:#475569; letter-spacing:.3px; padding-top:2px; }
      .nxDC-tx-badge { font-size:9px; font-weight:800; padding:3px 9px; border-radius:999px; white-space:nowrap; }
      .nxDC-tx-ok { background:#dcfce7; color:#047857; }
      .nxDC-tx-pend { background:#fef3c7; color:#b45309; }
      .nxDC-tx-rech { background:#fee2e2; color:#b91c1c; }

      @media (max-width:560px) {
        .nxDC-tx-btn { width:100%; }
        .nxDC-tx-chip-val { font-size:16px; }
        .nxDC-txp-item { grid-template-columns:1fr; }
        .nxDC-txp-monto { justify-self:start; }
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
        --nx-muted:#475569;
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
        position: relative;
        cursor: pointer;
        background: linear-gradient(150deg,#60a5fa,#3b82f6 52%,#2563eb) !important;
        box-shadow:
          0 9px 20px rgba(37,99,235,.42),
          0 3px 8px rgba(37,99,235,.30),
          inset 0 2px 3px rgba(255,255,255,.6),
          inset 0 -5px 9px rgba(0,0,0,.22) !important;
        transition: transform .15s ease, box-shadow .2s ease;
      }
      /* reflejo cristalino (vidrio) sobre el logo */
      nav.sb .sb-mk::after {
        content:''; position:absolute; left:12%; top:7%; width:76%; height:42%;
        border-radius:50%;
        background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.72), rgba(255,255,255,0) 72%);
        pointer-events:none;
      }
      /* Rebote tipo goma (jelly) al presionar — igual en todo el sistema */
      @keyframes nxRubber {
        0%   { transform: scale(1,1); }
        30%  { transform: scale(1.28,0.72); }
        40%  { transform: scale(0.78,1.22); }
        52%  { transform: scale(1.12,0.88); }
        66%  { transform: scale(0.94,1.06); }
        78%  { transform: scale(1.04,0.96); }
        100% { transform: scale(1,1); }
      }
      nav.sb .sb-mk.nx-spin, .lmk.nx-spin { animation: nxRubber .7s cubic-bezier(.3,.6,.3,1) !important; transform-origin: center !important; }
      nav.sb .sb-mk:active, .lmk:active { transform: scale(.92); }
      @media (prefers-reduced-motion: reduce){
        nav.sb .sb-mk.nx-spin{ animation: none !important; }
      }
      /* ═══ Jelly global suave al tocar (botones, pestañas, KPIs, menú) ═══ */
      @keyframes nxJelly {
        0%   { transform: scale(1,1); }
        25%  { transform: scale(1.06,0.94); }
        45%  { transform: scale(0.96,1.04); }
        62%  { transform: scale(1.03,0.97); }
        80%  { transform: scale(0.99,1.01); }
        100% { transform: scale(1,1); }
      }
      .nx-jelly { animation: nxJelly .5s cubic-bezier(.3,.6,.3,1); transform-origin: center; -webkit-backface-visibility: hidden; backface-visibility: hidden; }
      @media (prefers-reduced-motion: reduce){ .nx-jelly { animation: none !important; } }
      nav.sb .sb-nm { color: #0f172a !important; }
      nav.sb .sb-sm { color: #475569 !important; }

      /* Subtítulos de sección (PRINCIPAL, SISTEMA) */
      nav.sb .ss { color: #475569 !important; }

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
      nav.sb .ni-i { color: #475569 !important; }
      nav.sb .ni:hover .ni-i,
      nav.sb .ni.on   .ni-i { color: #2563eb !important; }

      nav.sb .ni-l { color: #475569 !important; }
      nav.sb .ni:hover .ni-l { color: #0f172a !important; font-weight: 600; }
      nav.sb .ni.on   .ni-l { color: #0f172a !important; font-weight: 700; }

      /* Chevrons de Contabilidad/Configuración */
      nav.sb .ni i.ti-chevron-down { color: #475569 !important; }

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
      nav.sb .sb-ur { color: #475569 !important; }

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

      /* ICONOS C2: badges circulares de color con glow suave */
      #v-dashboard .qa i.qa-ico {
        border-radius: 50% !important;
        color: #ffffff !important;
        border: none !important;
        background: linear-gradient(145deg,#475569,#475569) !important;
        box-shadow:
          0 10px 20px rgba(30,58,110,.22),
          inset 0 2px 3px rgba(255,255,255,.45) !important;
        transition: transform .26s cubic-bezier(.34,1.56,.64,1),
                    box-shadow .2s ease !important;
      }
      /* color por categoria (glow suave) */
      #v-dashboard .qa i.qa-ico.c-azul{background:linear-gradient(145deg,#2563eb,#22d3ee)!important;box-shadow:0 10px 20px rgba(37,99,235,.26),0 4px 10px rgba(34,211,238,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-verde{background:linear-gradient(145deg,#10b981,#84cc16)!important;box-shadow:0 10px 20px rgba(16,185,129,.26),0 4px 10px rgba(132,204,22,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-teal{background:linear-gradient(145deg,#0d9488,#3b82f6)!important;box-shadow:0 10px 20px rgba(13,148,136,.26),0 4px 10px rgba(59,130,246,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-ambar{background:linear-gradient(145deg,#d97706,#fbbf24)!important;box-shadow:0 10px 20px rgba(217,119,6,.26),0 4px 10px rgba(251,191,36,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-rojo{background:linear-gradient(145deg,#dc2626,#f97316)!important;box-shadow:0 10px 20px rgba(220,38,38,.26),0 4px 10px rgba(249,115,22,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-esmeralda{background:linear-gradient(145deg,#059669,#2dd4bf)!important;box-shadow:0 10px 20px rgba(5,150,105,.26),0 4px 10px rgba(45,212,191,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-indigo{background:linear-gradient(145deg,#4f46e5,#6366f1)!important;box-shadow:0 10px 20px rgba(79,70,229,.26),0 4px 10px rgba(99,102,241,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-cielo{background:linear-gradient(145deg,#0891b2,#38bdf8)!important;box-shadow:0 10px 20px rgba(8,145,178,.26),0 4px 10px rgba(56,189,248,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-violeta{background:linear-gradient(145deg,#8b5cf6,#d946ef)!important;box-shadow:0 10px 20px rgba(139,92,246,.26),0 4px 10px rgba(217,70,239,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-naranja{background:linear-gradient(145deg,#ea580c,#fb923c)!important;box-shadow:0 10px 20px rgba(234,88,12,.26),0 4px 10px rgba(251,146,60,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      #v-dashboard .qa i.qa-ico.c-rosa{background:linear-gradient(145deg,#db2777,#f472b6)!important;box-shadow:0 10px 20px rgba(219,39,119,.26),0 4px 10px rgba(244,114,182,.20),inset 0 2px 3px rgba(255,255,255,.45)!important}
      /* NEXUS Smart: morado -> rosa con glow azul+morado */
      #v-dashboard .qa i.qa-ico.c-smart{background:linear-gradient(145deg,#7c3aed,#ec4899)!important;box-shadow:0 12px 22px rgba(37,99,235,.28),0 6px 16px rgba(139,92,246,.32),inset 0 2px 3px rgba(255,255,255,.5)!important}

      /* === ANIMACION AL TOCAR: hundir + rebote 3D === */
      #v-dashboard .qa{
        position: relative;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
        transition: transform .14s cubic-bezier(.2,.7,.3,1) !important;
      }
      #v-dashboard .qa:active{ transform: scale(.95) !important; }
      #v-dashboard .qa:active i.qa-ico{
        box-shadow: 0 4px 10px rgba(30,58,110,.30), inset 0 2px 3px rgba(255,255,255,.4) !important;
      }
      /* el contenido siempre por encima de la onda */
      #v-dashboard .qa .qa-i,
      #v-dashboard .qa .qa-l{ position: relative; z-index: 1; }

      /* === IDEA: SIN tarjeta blanca; esferas más grandes y cristalizadas === */
      #v-dashboard .qa-g .qa {
        background: none !important;
        border: 0 !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        padding: 8px 4px 12px !important;
      }
      #v-dashboard .qa-g .qa i.qa-ico {
        width: 66px !important; height: 66px !important; min-width: 66px !important;
        font-size: 30px !important;
        border: none !important;
        position: relative !important;
        overflow: hidden !important;
        backdrop-filter: blur(3px) saturate(155%);
        -webkit-backdrop-filter: blur(3px) saturate(155%);
        box-shadow:
          0 20px 36px rgba(30,58,110,.38),
          0 9px 16px rgba(30,58,110,.22),
          inset 0 5px 9px rgba(255,255,255,.7),
          inset 0 -11px 18px rgba(0,0,0,.22) !important;
      }
      /* sin caja/sombra de tarjeta tampoco en hover */
      #v-dashboard .qa-g .qa:hover { background:none !important; box-shadow:none !important; border:0 !important; }

      /* Inicio: 3 columnas, esfera y nombre alineados (centrados) y con espacio */
      #v-dashboard .qa-g {
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 14px 8px !important;
        align-items: start !important;
      }
      /* PC/escritorio: iconos más juntos (columnas de ancho fijo, centradas) en vez
         de estirarse a lo ancho de la pantalla */
      @media (min-width: 1024px) {
        #v-dashboard .qa-g {
          grid-template-columns: repeat(6, 124px) !important;
          justify-content: center !important;
          gap: 30px 26px !important;
          max-width: 920px;
          margin-left: auto !important;
          margin-right: auto !important;
        }
      }
      #v-dashboard .qa-g .qa {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 8px !important;
        padding: 6px 2px 8px !important;
      }
      #v-dashboard .qa-g .qa-i { margin: 0 !important; position: relative; perspective: 600px; will-change: transform; }
      /* La esfera GIRA en 3D al presionarla (en vez de flotar) */
      @keyframes nxOrbSpin {
        0%   { transform: scale(.84) rotateY(0deg); }
        55%  { transform: scale(1.07) rotateY(250deg); }
        100% { transform: scale(1) rotateY(360deg); }
      }
      #v-dashboard .qa i.qa-ico.nx-spin { animation: nxRubber .7s cubic-bezier(.3,.6,.3,1); transform-origin: center; }
      /* Reflejo cristalino sutil (no es flotación) */
      @keyframes nxOrbGlint { 0%,86%,100%{ opacity:.6; } 93%{ opacity:1; } }
      #v-dashboard .qa-g .qa i.qa-ico::after{ animation: nxOrbGlint 4.2s ease-in-out infinite; }
      /* Humo del color del icono al presionar */
      .nx-smoke{
        position:absolute; left:50%; top:40%; width:22px; height:22px; border-radius:50%;
        background: radial-gradient(circle, rgba(148,163,184,.95), rgba(148,163,184,0) 70%);
        pointer-events:none; filter:blur(1.5px); z-index:-1;
        transform:translate(-50%,0) scale(.4); opacity:0;
        animation: nxSmoke .85s ease-out forwards;
      }
      @keyframes nxSmoke{
        0%   { opacity:0;  transform:translate(-50%,0) scale(.4); }
        25%  { opacity:.95; }
        100% { opacity:0;  transform: translate(calc(-50% + var(--dx,0px)), -52px) scale(2.1); }
      }
      @media (prefers-reduced-motion: reduce){
        #v-dashboard .qa i.qa-ico.nx-spin{ animation: none !important; }
        #v-dashboard .qa-g .qa i.qa-ico::after{ animation: none !important; }
        .nx-smoke{ display:none !important; }
      }
      #v-dashboard .qa-g .qa-l {
        text-align: center !important;
        font-size: 8.5px !important;
        line-height: 1.2 !important;
        white-space: normal !important;
        width: 100% !important;
        letter-spacing: .2px !important;
        color: var(--tx1, #1e293b) !important;
      }
      @media(max-width:768px){
        #v-dashboard .qa-g .qa i.qa-ico { width: 56px !important; height: 56px !important; min-width: 56px !important; font-size: 25px !important; }
      }
      /* reflejo cristalino (brillo de vidrio en la parte superior) */
      #v-dashboard .qa-g .qa i.qa-ico::after {
        content:''; position:absolute; left:9%; top:4%; width:82%; height:54%;
        border-radius:50%;
        background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.92), rgba(255,255,255,.25) 52%, rgba(255,255,255,0) 76%);
        pointer-events:none; z-index:1;
      }
      @media(max-width:768px){
        #v-dashboard .qa-g .qa i.qa-ico { width: 60px !important; height: 60px !important; min-width: 60px !important; font-size: 27px !important; }
      }
      /* onda de color (ripple) al tocar */
      .nx-ripple{
        position: absolute;
        border-radius: 50%;
        transform: translate(-50%,-50%) scale(0);
        pointer-events: none;
        z-index: 0;
        background: radial-gradient(circle, rgba(99,102,241,.42) 0%, rgba(99,102,241,0) 70%);
        animation: nxRipple .6s ease-out forwards;
      }
      @keyframes nxRipple{ to{ transform: translate(-50%,-50%) scale(1); opacity: 0; } }

      /* === EFECTOS TACTILES EN TODO EL SISTEMA === */
      .btn, .cfg-tab, .kpi{
        position: relative;
        overflow: hidden;
        -webkit-tap-highlight-color: transparent;
      }
      /* OJO: nada de transform:scale en botones. En iPhone, escalar un botón dentro
         de un modal con backdrop-filter lo "infla" enorme. Usamos opacidad (segura). */
      .btn:active{ opacity: .7; }
      .ni:active{ background: rgba(37,99,235,.07); }
      .cfg-tab:active{ opacity: .82; }
      .kpi:active{ opacity: .9; }
      /* incluir transform en la transicion de estos (los botones ya tienen all .15s) */
      .ni, .cfg-tab, .kpi{
        transition: transform .14s cubic-bezier(.2,.7,.3,1),
                    background .35s ease, border-color .35s ease,
                    box-shadow .35s ease, color .35s ease;
      }
      /* el contenido siempre por encima de la onda */
      .btn > *:not(.nx-ripple),
      .cfg-tab > *:not(.nx-ripple),
      .kpi > *:not(.nx-ripple){ position: relative; z-index: 1; }

      /* === Pestanas de Configuracion: icono en circulo centrado + nombre debajo === */
      .cfg-tabs-bar{ gap: 8px !important; padding: 8px 8px !important; align-items: flex-start !important; }
      .cfg-tab{
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 5px !important;
        padding: 4px 3px !important;
        min-width: 66px !important;
        max-width: 88px !important;
        border-radius: 14px !important;
        white-space: normal !important;
      }
      .cfg-tab i{
        width: 44px !important; height: 44px !important;
        border-radius: 50% !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        background: #eef2f7 !important;
        color: #475569 !important;
        font-size: 19px !important;
        transition: transform .2s ease, background .2s ease, box-shadow .2s ease !important;
      }
      .cfg-tab span{
        font-size: 8.5px !important;
        line-height: 1.2 !important;
        font-weight: 700 !important;
        text-align: center !important;
        color: #475569 !important;
        max-width: 80px !important;
        white-space: normal !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        display: -webkit-box !important;
        -webkit-box-orient: vertical !important;
        -webkit-line-clamp: 2 !important;
        overflow: hidden !important;
      }
      .cfg-tab:hover i{ transform: scale(1.06) !important; background: #e2e8f0 !important; }
      .cfg-tab.active-tab{ background: none !important; box-shadow: none !important; }
      .cfg-tab.active-tab i{
        background: linear-gradient(135deg,#1e3a6e,#2563eb) !important;
        color: #fff !important;
        box-shadow: 0 6px 16px rgba(37,99,235,.38) !important;
        transform: none !important;
      }
      .cfg-tab.active-tab span{ color: #2563eb !important; font-weight: 800 !important; }
      /* temas oscuros */
      body.tema-premium .cfg-tab, body.dark .cfg-tab{ background: none !important; }
      body.tema-premium .cfg-tab i, body.dark .cfg-tab i{ background: #1e293b !important; color: #cbd5e1 !important; }
      body.tema-premium .cfg-tab.active-tab i, body.dark .cfg-tab.active-tab i{ background: linear-gradient(135deg,#1e3a6e,#2563eb) !important; color: #fff !important; }
      body.tema-premium .cfg-tab span, body.dark .cfg-tab span{ color: #475569 !important; }
      body.tema-premium .cfg-tab.active-tab span, body.dark .cfg-tab.active-tab span{ color: #60a5fa !important; }

      /* === MENU LATERAL: iconos en circulo de color (sin onda, para no romper el clic del div) === */
      nav.sb .ni .ni-i{
        width: 30px !important; height: 30px !important; min-width: 30px !important;
        border-radius: 50% !important;
        display: inline-flex !important; align-items: center !important; justify-content: center !important;
        font-size: 15px !important;
        color: #fff !important;
        background: linear-gradient(145deg,#475569,#b6c2d4) !important;
        box-shadow: 0 3px 8px rgba(30,58,110,.20) !important;
        transition: transform .18s ease, box-shadow .18s ease !important;
      }
      nav.sb .ni.on .ni-i{ box-shadow: 0 4px 12px rgba(37,99,235,.42) !important; }
      nav.sb .ni:active .ni-i{ transform: scale(.9) !important; }
      /* colores por icono (8 grupos) */
      nav.sb .ni:has(.ti-layout-dashboard) .ni-i,
      nav.sb .ni:has(.ti-building) .ni-i,
      nav.sb .ni:has(.ti-mail) .ni-i,
      nav.sb .ni:has(.ti-chart-line) .ni-i{ background:linear-gradient(145deg,#2563eb,#22d3ee)!important }
      nav.sb .ni:has(.ti-users) .ni-i,
      nav.sb .ni:has(.ti-percentage) .ni-i,
      nav.sb .ni:has(.ti-report-money) .ni-i,
      nav.sb .ni:has(.ti-target) .ni-i{ background:linear-gradient(145deg,#10b981,#84cc16)!important }
      nav.sb .ni:has(.ti-chart-bar) .ni-i,
      nav.sb .ni:has(.ti-user-check) .ni-i,
      nav.sb .ni:has(.ti-database) .ni-i,
      nav.sb .ni:has(.ti-scale) .ni-i{ background:linear-gradient(145deg,#0d9488,#3b82f6)!important }
      nav.sb .ni:has(.ti-book) .ni-i,
      nav.sb .ni:has(.ti-clock-dollar) .ni-i,
      nav.sb .ni:has(.ti-clipboard-list) .ni-i,
      nav.sb .ni:has(.ti-id-badge) .ni-i{ background:linear-gradient(145deg,#d97706,#fbbf24)!important }
      nav.sb .ni:has(.ti-receipt-tax) .ni-i,
      nav.sb .ni:has(.ti-shield-lock) .ni-i{ background:linear-gradient(145deg,#dc2626,#f97316)!important }
      nav.sb .ni:has(.ti-certificate) .ni-i,
      nav.sb .ni:has(.ti-robot) .ni-i,
      nav.sb .ni:has(.ti-palette) .ni-i,
      nav.sb .ni:has(.ti-settings) .ni-i{ background:linear-gradient(145deg,#8b5cf6,#d946ef)!important }
      nav.sb .ni:has(.ti-file-invoice) .ni-i,
      nav.sb .ni:has(.ti-briefcase) .ni-i,
      nav.sb .ni:has(.ti-layers) .ni-i,
      nav.sb .ni:has(.ti-inbox) .ni-i,
      nav.sb .ni:has(.ti-building-bank) .ni-i{ background:linear-gradient(145deg,#4f46e5,#6366f1)!important }
      nav.sb .ni:has(.ti-building-store) .ni-i,
      nav.sb .ni:has(.ti-history) .ni-i,
      nav.sb .ni:has(.ti-list-check) .ni-i{ background:linear-gradient(145deg,#db2777,#f472b6)!important }

      /* === ICONOS GLOBALES: todo icono "suelto" como circulo de color ===
         Base con specificity baja (.ti) para que cualquier componente con
         estilo propio lo sobreescriba; solo afecta iconos sin contexto.
         Tamano en 'em' para que escalen con el icono y no descuadren. */
      .ti{
        width: 1.7em; height: 1.7em;
        border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        background: linear-gradient(145deg,#3b82f6,#22d3ee);
        color: #fff;
        border: none;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(2px) saturate(150%);
        -webkit-backdrop-filter: blur(2px) saturate(150%);
        box-shadow: 0 4px 10px rgba(37,99,235,.30), inset 0 2.5px 3px rgba(255,255,255,.7), inset 0 -3px 6px rgba(0,0,0,.16);
        vertical-align: middle;
        line-height: 1;
        transition: transform .15s ease, box-shadow .2s ease;
      }
      /* reflejo cristalino (vidrio) en todos los iconos badge */
      .ti::after{
        content:''; position:absolute; left:10%; top:6%; width:80%; height:46%;
        border-radius:50%;
        background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.7), rgba(255,255,255,0) 72%);
        pointer-events:none;
      }
      /* Excepciones: estos NO deben ser circulo (romperian el diseno).
         Los componentes ya estilizados (ni-i, qa-ico, cfg-tab) ganan solos
         por mayor specificity, no hace falta listarlos. */
      .btn .ti, button .ti, td .ti, th .ti, label .ti, summary .ti,
      .nx-fab .ti, .sb-mk .ti, .lmk .ti, .smk .ti, .nxs-badge .ti, .nxl-logo .ti,
      .sb-av .ti, .nxDC-bank-badge .ti,
      .ti.ti-search, .ti.ti-search-off,
      i.ti[style*="absolute"], i.ti[style*="position:absolute"]{
        width: auto !important; height: auto !important;
        border-radius: 0 !important;
        background: none !important;
        box-shadow: none !important;
        color: inherit !important;
        display: inline-block !important;
        vertical-align: baseline !important;
        line-height: inherit !important;
        border: 0 !important;
        position: static !important;
        overflow: visible !important;
        backdrop-filter: none !important; -webkit-backdrop-filter: none !important;
      }
      .btn .ti::after, button .ti::after, td .ti::after, th .ti::after, label .ti::after, summary .ti::after,
      .nx-fab .ti::after, .sb-mk .ti::after, .lmk .ti::after, .smk .ti::after, .nxs-badge .ti::after, .nxl-logo .ti::after,
      .sb-av .ti::after, .nxDC-bank-badge .ti::after,
      .ti.ti-search::after, .ti.ti-search-off::after,
      i.ti[style*="absolute"]::after, i.ti[style*="position:absolute"]::after{ content: none !important; }

      /* Los íconos DENTRO de botones (acciones de tablas) NO deben encajonarse */
      #v-dashboard .nc .btn i, #v-dashboard .nc .btn .ti,
      #v-dashboard .nc button i, #v-dashboard .nc button .ti,
      #v-dashboard .nc td i, #v-dashboard .nc td .ti {
        width: auto !important;
        height: auto !important;
        min-width: 0 !important;
        border-radius: 0 !important;
        background: none !important;
        box-shadow: none !important;
        border: 0 !important;
        font-size: 14px !important;
        padding: 0 !important;
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
      // Vínculo directo si la sesión lo trae
      if (s.agente_id || s.agenteId) return s.agente_id || s.agenteId;
      // Usuarios y agentes son tablas distintas: se vinculan por nombre
      const agentes = Array.isArray(st().agentes) ? st().agentes : [];
      const norm = x => String(x || '').trim().toLowerCase();
      const n = norm(s.nom);
      if (n) {
        const ag = agentes.find(a => norm(a.nom) === n);
        if (ag) return ag.id;
      }
      // Último recurso
      return s.usuario_id || s.id || null;
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
    // Insertar ARRIBA de Pólizas (buscando el ítem por su acción nav('polizas'))
    let anchor = document.getElementById('niPol');
    if (!anchor) {
      const items = sbNav.querySelectorAll('.ni');
      for (let k = 0; k < items.length; k++) {
        if (/nav\(['"]polizas/.test(items[k].getAttribute('onclick') || '')) { anchor = items[k]; break; }
      }
    }
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
    if (anchor) {
      sbNav.insertBefore(item, anchor); // justo ARRIBA de Pólizas
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
        <i class="ti ti-inbox qa-ico c-indigo"></i>
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
  // Punto rojo sobre el KPI "COBRADO" del dashboard (entrada a Detalles de
  // Cobro), donde ahora se aprueban las transferencias.
  function setBadgeCobros(count) {
    try {
      let tile = null;
      document.querySelectorAll('#v-dashboard .kl').forEach(l => {
        if (!tile && l.textContent.trim().toUpperCase().includes('COBRADO')) {
          tile = l.closest('.kpi, .nc, [class*="kpi"]') || l.parentElement;
        }
      });
      if (!tile) return;
      if (getComputedStyle(tile).position === 'static') tile.style.position = 'relative';
      let b = tile.querySelector('.nxCobrosBadge');
      if (count > 0) {
        if (!b) {
          b = document.createElement('span');
          b.className = 'nxCobrosBadge';
          b.style.cssText = 'position:absolute;top:6px;right:6px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff;z-index:5';
          tile.appendChild(b);
        }
        b.textContent = count > 9 ? '9+' : String(count);
        b.style.display = 'flex';
      } else if (b) {
        b.style.display = 'none';
      }
    } catch(e) {}
  }

  // Avisa al REMITENTE cuando una transferencia suya pasó a aceptada/rechazada.
  // Usa localStorage para no repetir ni avisar de lo viejo (la primera vez solo
  // memoriza el estado actual, sin mostrar nada).
  function notificarRemitente(transferencias) {
    try {
      const miId = getMiAgenteId();
      if (!miId) return;
      const key = 'nx_tx_notif_' + miId;
      const resueltas = (transferencias || []).filter(t =>
        String(t.desde_agente) === String(miId) &&
        (t.estado === 'aceptada' || t.estado === 'rechazada'));

      let seen = null;
      try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) {}
      if (!Array.isArray(seen)) {
        // Primera vez: memorizar lo actual sin avisar retroactivamente
        try { localStorage.setItem(key, JSON.stringify(resueltas.map(t => String(t.id)))); } catch(e) {}
        return;
      }

      const seenSet = new Set(seen.map(String));
      const nuevas = resueltas.filter(t => !seenSet.has(String(t.id)));
      if (nuevas.length === 0) return;

      const F = getFmt();
      nuevas.forEach(t => {
        const hacia = (st().agentes || []).find(a => String(a.id) === String(t.hacia_agente))?.nom || 'el agente';
        if (typeof window.toast === 'function') {
          if (t.estado === 'aceptada') {
            window.toast('ok', 'Transferencia aceptada', hacia + ' aceptó ' + F(t.monto));
          } else {
            window.toast('err', 'Transferencia rechazada', hacia + ' rechazó ' + F(t.monto) + ' · el dinero sigue contigo');
          }
        }
        seenSet.add(String(t.id));
      });
      try { localStorage.setItem(key, JSON.stringify(Array.from(seenSet))); } catch(e) {}
    } catch(e) {}
  }

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

      // Avisar al remitente si su transferencia fue aceptada o rechazada
      notificarRemitente(transferencias);

      // Solicitudes = solo entregas hacia el admin (las aprueba el admin)
      let pendSolicit = 0;
      // Cobros = transferencias por aprobar (ahora viven en Detalles de Cobro)
      let pendCobros = 0;
      if (esAdmin()) {
        pendSolicit = entregas.filter(e => !e.confirmado).length;
        pendCobros = transferencias.filter(t => t.estado === 'pendiente').length;
      } else {
        const miId = getMiAgenteId();
        if (miId) {
          pendCobros = transferencias.filter(t =>
            String(t.hacia_agente) === String(miId) && t.estado === 'pendiente'
          ).length;
        }
        // El agente no aprueba entregas en Solicitudes
      }

      // Badge de Solicitudes (sidebar)
      if (badge) {
        if (pendSolicit > 0) {
          badge.textContent = pendSolicit > 99 ? '99+' : String(pendSolicit);
          badge.style.display = '';
        } else {
          badge.style.display = 'none';
        }
      }
      // Badge de Solicitudes (dashboard)
      if (dashBadge) {
        if (pendSolicit > 0) {
          dashBadge.textContent = pendSolicit > 9 ? '9+' : String(pendSolicit);
          dashBadge.style.display = '';
        } else {
          dashBadge.style.display = 'none';
        }
      }
      // Aviso de transferencias en la entrada de Detalles de Cobro
      setBadgeCobros(pendCobros);
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
          <div style="font-size:13px;color:#475569;margin-bottom:14px">Hubo un problema cargando los datos. Verifica tu conexión.</div>
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
          ${renderSeccionHistorial(entregasView)}
          ${renderSeccionRecibirEntrega()}
        </div>
      `;
    } catch(err) {
      console.error('Error al renderizar Solicitudes:', err);
      view.innerHTML = `
        <div style="padding:30px;text-align:center;background:#fff;border:1px solid #fecaca;border-radius:14px;color:#dc2626;margin:20px">
          <div style="font-size:32px;margin-bottom:10px">⚠️</div>
          <div style="font-weight:800;font-size:16px;margin-bottom:6px">Error al mostrar</div>
          <div style="font-size:11px;color:#475569;margin-bottom:14px;font-family:monospace;text-align:left;background:#fef2f2;padding:8px;border-radius:6px;overflow-x:auto">${(err.message || err).toString().substring(0,300)}</div>
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
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <button class="btn bsm" type="button" onclick="window.nav('dashboard',null)"><i class="ti ti-arrow-left"></i> Volver</button>
        <button class="btn bsm bghost" type="button" onclick="window.nav('dashboard',null)" title="Cerrar"><i class="ti ti-x"></i></button>
      </div>
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

  // NOTA: "Transferencias entre agentes" se movió a "Detalles de Cobro"
  // (crear + aprobar + historial). Aquí solo quedan las entregas hacia el admin.

  function renderSeccionHistorial(entregas) {
    const F = getFmt();

    // Entregas hacia el admin: confirmadas (depositadas o no)
    const entregasHist = (entregas || []).filter(e => e.confirmado)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 30); // Últimas 30

    if (entregasHist.length === 0) {
      return `
        <div class="nxSL-section nxSL-section-historial">
          <div class="nxSL-section-head">
            <div class="nxSL-section-title"><i class="ti ti-history"></i> HISTORIAL DE ENTREGAS</div>
            <div class="nxSL-section-badge nxSL-badge-gray">0</div>
          </div>
          <div class="nxSL-empty-soft">Aún no hay entregas procesadas en el historial.</div>
        </div>
      `;
    }

    const filasEntregas = entregasHist.map(e => {
      const ag = (st().agentes || []).find(a => String(a.id) === String(e.agente_id));
      const nomAg = ag?.nom || '—';
      const estado = e.depositado ? 'DEPOSITADO' : 'CONFIRMADO';
      const estadoClass = e.depositado ? 'nxSL-hist-dep' : 'nxSL-hist-conf';
      const fechaProc = e.confirmado_at || e.depositado_at || e.fecha;
      return `
        <tr>
          <td class="nxSL-hist-fecha">${fmtFecha(fechaProc)}</td>
          <td>${esc(nomAg)}</td>
          <td class="nxSL-hist-monto">${F(e.monto)}</td>
          <td>${esc(e.metodo || '')}</td>
          <td class="nxSL-hist-ref">${esc(e.referencia || '—')}</td>
          <td><span class="nxSL-hist-estado ${estadoClass}">${estado}</span></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="nxSL-section nxSL-section-historial">
        <div class="nxSL-section-head">
          <div class="nxSL-section-title"><i class="ti ti-history"></i> HISTORIAL DE ENTREGAS</div>
          <div class="nxSL-section-badge nxSL-badge-gray">${entregasHist.length}</div>
        </div>
        <div class="nxSL-section-sub">Últimas entregas al admin (confirmadas o depositadas)</div>
        <div class="nxSL-hist-table-wrap">
          <table class="nxSL-hist-table" id="nxSL-hist-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>AGENTE</th>
                <th class="nxSL-hist-monto">MONTO</th>
                <th>MÉTODO</th>
                <th>REFERENCIA</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>${filasEntregas}</tbody>
          </table>
        </div>
      </div>
    `;
  }

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
      .nxSL-loading, .nxSL-empty { padding:40px; text-align:center; color:#475569; font-weight:600; }

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
      .nxSL-sub { font-size:12px; color:#475569; margin-top:3px; }
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
      .nxSL-stat-lbl { font-size: 9.5px; font-weight: 700; color: #475569; letter-spacing: .4px; margin-top: 6px; }

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
      .nxSL-action-btn:hover { box-shadow: 0 4px 10px rgba(0,0,0,.12); }
      .nxSL-action-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
      .nxSL-action-green { background: linear-gradient(135deg, #10b981, #059669); }

      /* Tables */
      .nxSL-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .nxSL-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 720px; }
      .nxSL-table thead th {
        padding: 10px 12px; text-align: left;
        font-size: 9px; font-weight: 800; color: #475569; letter-spacing: .6px;
        background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
      }
      .nxSL-table tbody td {
        padding: 12px; border-bottom: 1px solid #f1f5f9;
        color: #0f172a; font-weight: 600;
      }
      .nxSL-table tbody tr:last-child td { border-bottom: 0; }
      .nxSL-table .nxSL-num { text-align: right; font-family: var(--mono, monospace); white-space: nowrap; font-weight: 700; }
      .nxSL-table th.nxSL-num { text-align: right; }
      .nxSL-tx-fecha { font-family: var(--mono, monospace); color: #475569; font-size: 11px; white-space: nowrap; }
      .nxSL-tx-ref { font-family: var(--mono, monospace); color: #475569; font-size: 11px; }
      .nxSL-muted { color: #475569; font-size: 10px; }

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
      .nxSL-btn:hover { opacity: .9; }
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
      .nxSL-transfer-hist-title { font-size: 10px; font-weight: 800; color: #475569; letter-spacing: .5px; margin: 14px 0 8px; }

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
        color: #475569; font-size: 12px; font-weight: 600;
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
        .nxSL-head { padding: 14px; flex-direction: column; align-items: stretch; gap: 12px; }
        .nxSL-head-icon { width: 42px; height: 42px; font-size: 19px; border-radius: 12px; }
        .nxSL-head-body { flex: 0 0 auto; }
        .nxSL-title { font-size: 17px; }
        .nxSL-sub { font-size: 11px; }
        .nxSL-head-stats { flex: 0 0 auto; grid-template-columns: 1fr 1fr; gap: 8px; }
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
      .nxSL-section-historial { border-left: 4px solid #475569; }
      .nxSL-section-historial .nxSL-section-title i { color:#475569; }
      .nxSL-section-sub {
        font-size: 11px; color: #475569; margin-bottom: 12px; font-weight: 500;
      }
      .nxSL-badge-gray {
        background: #e2e8f0; color: #475569;
        font-size: 12px; font-weight: 900;
        padding: 4px 10px; border-radius: 999px;
        min-width: 28px; text-align: center;
      }
      .nxSL-empty-soft {
        padding: 24px; text-align: center; color: #475569;
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
        font-size: 9px; font-weight: 800; color: #475569; letter-spacing: .5px;
        border-bottom: 1px solid #e2e8f0; white-space: nowrap;
      }
      .nxSL-hist-table th.nxSL-hist-monto { text-align: right; }
      .nxSL-hist-table tbody td {
        padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a;
        font-weight: 600;
      }
      .nxSL-hist-table tbody tr:last-child td { border-bottom: 0; }
      .nxSL-hist-table tbody tr:hover { background: #f8fafc; }
      .nxSL-hist-fecha { font-family: var(--mono, monospace); color: #475569; font-size: 11px; }
      .nxSL-hist-ref { font-family: var(--mono, monospace); color: #475569; font-size: 11px; }
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
  
  // Refresca el panel de Detalles de Cobro si está visible (las transferencias
  // ahora viven allí). Seguro si el módulo aún no cargó.
  function refrescarDetallesCobroSiVisible() {
    try {
      if (typeof window.nxRefrescarDetallesCobro === 'function') {
        window.nxRefrescarDetallesCobro();
      } else if (typeof window.nxAbrirDetallesCobro === 'function') {
        const cDet = document.getElementById('nxDetallesCobroV1');
        if (cDet && cDet.style.display !== 'none') window.nxAbrirDetallesCobro();
      }
    } catch(e) {}
  }

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
      refrescarDetallesCobroSiVisible();
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
      refrescarDetallesCobroSiVisible();
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
        const monto = window.nxMoney ? window.nxMoney.parse(document.getElementById('aMnt')?.value) : parseFloat(document.getElementById('aMnt')?.value || 0);
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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

      /* Los íconos DENTRO de botones NO llevan el cuadro de color: solo el ícono limpio. */
      .kpi .btn i[class*="ti-"], .qa .btn i[class*="ti-"],
      .sm .btn i[class*="ti-"], .nc .btn i[class*="ti-"],
      td .btn i[class*="ti-"], .tw .btn i[class*="ti-"],
      .kpi .btn .ti, .qa .btn .ti, .sm .btn .ti, .nc .btn .ti,
      td .btn .ti, .tw .btn .ti {
        background: none !important;
        box-shadow: none !important;
        border: 0 !important;
        width: auto !important;
        height: auto !important;
        min-width: 0 !important;
        padding: 0 !important;
      }

      /* En botones SÓLIDOS (azul .bc1 / .bxl) el ícono va BLANCO para que contraste
         y no se pierda el color semántico (p.ej. wallet verde sobre azul). */
      .btn.bc1 i[class*="ti-"], .btn.bxl i[class*="ti-"],
      .btn.bc1 .ti, .btn.bxl .ti {
        color: #ffffff !important;
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
        background: linear-gradient(145deg, #cbd5e1, #475569) !important;
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

      /* ───────────────────────────────────────────────────────────────
         El CUADRO de color (fondo + sombra) queda SOLO para los íconos
         grandes de display del dashboard (#v-dashboard, regla aparte con
         mayor especificidad). En CUALQUIER otro contexto el ícono conserva
         su color pero SIN recuadro: botones, enlaces, celdas de tabla,
         badges, encabezados, texto, etc. Va al final para ganar por orden
         de cascada; el dashboard la sobreescribe por su #id.
         ─────────────────────────────────────────────────────────────── */
      .kpi i[class*="ti-"], .qa i[class*="ti-"], .sm i[class*="ti-"], .nc i[class*="ti-"],
      .kpi .ti, .qa .ti, .sm .ti, .nc .ti {
        background: none !important;
        box-shadow: none !important;
        border: 0 !important;
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
            <div style="font-size:11px;color:#475569;margin-top:6px">
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
      <span class="qa-i"><i class="ti ti-shield-check qa-ico c-cielo"></i></span>
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
                <div style="font-size:11px;color:#475569">Cuando se crea una factura nueva</div>
              </div>
            </label>
            
            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer">
              <input type="checkbox" id="nxNotifTipoPago" style="width:20px;height:20px;cursor:pointer">
              <div>
                <div style="font-weight:700;color:#0f172a">💰 Pagos recibidos</div>
                <div style="font-size:11px;color:#475569">Cuando se registra un cobro</div>
              </div>
            </label>
            
            <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer">
              <input type="checkbox" id="nxNotifTipoError" style="width:20px;height:20px;cursor:pointer">
              <div>
                <div style="font-weight:700;color:#0f172a">⚠️ Errores del sistema</div>
                <div style="font-size:11px;color:#475569">Avisos importantes que requieren atención</div>
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
          <div style="font-size:11px;color:#475569">Avisos tipo app cuando ocurren eventos importantes</div>
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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

      /* ═══ BARRA SUPERIOR: botones cristalinos 3D (menú, campana, refrescar) ═══ */
      .tn-tog {
        border: none !important;
        background: linear-gradient(150deg,#34d399,#10b981 52%,#059669) !important;
        box-shadow:
          0 8px 18px rgba(16,185,129,.42),
          0 3px 7px rgba(16,185,129,.30),
          inset 0 2px 3px rgba(255,255,255,.6),
          inset 0 -5px 9px rgba(0,0,0,.20) !important;
        overflow: visible;
      }
      .tn-tog::after {
        display: block !important;
        content: '' !important;
        position: absolute !important;
        left: 14% !important; top: 8% !important; width: 72% !important; height: 40% !important;
        border-radius: 50% !important;
        background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.72), rgba(255,255,255,0) 72%) !important;
        animation: none !important; box-shadow: none !important; pointer-events: none !important;
      }
      .tn-r > #btnRefrescar, .tn-r > .notif-bell {
        border: none !important;
        border-radius: 50% !important;
        color: #fff !important;
        position: relative;
        overflow: visible;
        transition: transform .15s ease, box-shadow .2s ease !important;
      }
      .tn-r > #btnRefrescar i, .tn-r > .notif-bell i { color: #fff !important; }
      .tn-r > #btnRefrescar {
        background: linear-gradient(150deg,#22d3ee,#3b82f6 55%,#2563eb) !important;
        box-shadow:
          0 8px 18px rgba(37,99,235,.40),
          inset 0 2px 3px rgba(255,255,255,.6),
          inset 0 -5px 9px rgba(0,0,0,.20) !important;
      }
      .tn-r > .notif-bell {
        background: linear-gradient(150deg,#fbbf24,#f59e0b 55%,#d97706) !important;
        box-shadow:
          0 8px 18px rgba(217,119,6,.40),
          inset 0 2px 3px rgba(255,255,255,.6),
          inset 0 -5px 9px rgba(0,0,0,.20) !important;
      }
      .tn-r > #btnRefrescar::after, .tn-r > .notif-bell::after {
        content: ''; position: absolute; left: 16%; top: 9%; width: 68%; height: 38%;
        border-radius: 50%;
        background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.66), rgba(255,255,255,0) 72%);
        pointer-events: none;
      }
      @media (max-width: 768px) {
        .tn-r > .notif-bell { width: 40px !important; height: 40px !important; padding: 0 !important; flex-shrink: 0; }
      }
      /* Menú, campana y actualizar: rebote tipo goma (jelly) al presionar */
      .tn-tog.nx-spin, .tn-r > .notif-bell.nx-spin, .tn-r > #btnRefrescar.nx-spin {
        animation: nxRubber .7s cubic-bezier(.3,.6,.3,1) !important;
        transform-origin: center !important;
      }
      .tn-tog:active, .tn-r > #btnRefrescar:active, .tn-r > .notif-bell:active { transform: scale(.92); }
      @media (prefers-reduced-motion: reduce) {
        .tn-tog.nx-spin, .tn-r > #btnRefrescar.nx-spin, .tn-r > .notif-bell.nx-spin { animation: none !important; }
      }
      /* ═══ Alineación de la barra superior (todo a 40px y centrado) ═══ */
      @media (max-width: 768px) {
        .tnav { align-items: center !important; }
        .tn-tog { width: 40px !important; height: 40px !important; }
        .tn-tog i { font-size: 20px !important; }
        .tn-sr { max-width: none !important; display: flex !important; align-items: center !important; }
        .tn-sr input { height: 40px !important; border-radius: 12px !important; padding: 0 14px 0 36px !important; }
        .tn-sr .si { left: 13px !important; font-size: 15px !important; }
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
    { id: 'popular', nom: 'Banco Popular Dominicano', color: '#0066b3', logoUrl: 'https://raw.githubusercontent.com/sterlinr08-dte/nexus-pro/main/logos/banco-popular.png' },
    { id: 'bhd', nom: 'BHD', color: '#e85a00', logoUrl: 'https://raw.githubusercontent.com/sterlinr08-dte/nexus-pro/main/logos/banco-bhd.png' },
    { id: 'reservas', nom: 'Banreservas', color: '#c8102e', logoUrl: 'https://raw.githubusercontent.com/sterlinr08-dte/nexus-pro/main/logos/banco-banreservas.png' },
    { id: 'scotiabank', nom: 'Scotiabank', color: '#e1141d', logoUrl: null },
    { id: 'bdi', nom: 'Banco BDI', color: '#003876', logoUrl: null },
    { id: 'banesco', nom: 'Banesco', color: '#00a652', logoUrl: null },
    { id: 'caribe', nom: 'Banco Caribe', color: '#0099d4', logoUrl: null },
    { id: 'santacruz', nom: 'Banco Santa Cruz', color: '#1a5490', logoUrl: null },
    { id: 'vimenca', nom: 'Banco Vimenca', color: '#003c71', logoUrl: null },
    { id: 'apap', nom: 'APAP', color: '#00a89c', logoUrl: null },
    { id: 'otro', nom: 'Otro Banco', color: '#475569', logoUrl: null }
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
    modal.innerHTML = '<div class="modal" style="max-width:560px"><div style="padding:40px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:10px;font-weight:600">Cargando cuentas...</div></div></div>';
    modal.classList.add('open');
    
    await cargarCuentas();
    renderModal(modal);
  }
  window.nxAbrirMisCuentas = abrirModal;

  function renderModal(modal) {
    const cuentas = _cuentasCache;
    const lista = cuentas.length === 0
      ? '<div style="text-align:center;padding:40px 20px;color:#475569;font-size:13px">No tienes cuentas registradas.<br>Agrega tu primera abajo. 👇</div>'
      : cuentas.map((c) => {
          const b = getBanco(c.banco);
          return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:0;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.04);overflow:hidden">
              <div onclick="window.nxCopiarSoloCuenta('${esc(c.id)}')" style="display:flex;align-items:center;gap:12px;padding:14px;cursor:pointer;transition:background .12s ease,transform .08s ease" onmousedown="this.style.transform='scale(0.98)';this.style.background='#f1f5f9'" onmouseup="this.style.transform='';this.style.background=''" ontouchstart="this.style.transform='scale(0.98)';this.style.background='#f1f5f9'" ontouchend="this.style.transform='';this.style.background=''">
                ${renderLogoBanco(c.banco, 48)}
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;color:#0f172a;font-size:13px">${esc(b.nom)}</div>
                  <div style="font-size:11px;color:#475569;margin-top:2px">${esc(c.tipo)} · <strong style="color:#1e3a8a">${esc(c.numero)}</strong></div>
                  <div style="font-size:11px;color:#475569">${esc(c.titular)}${c.cedula ? ' · ' + esc(c.cedula) : ''}</div>
                  ${c.notas ? `<div style="font-size:10px;color:#475569;margin-top:3px;font-style:italic">📝 ${esc(c.notas)}</div>` : ''}
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
      <span class="qa-i"><i class="ti ti-building-bank qa-ico c-violeta"></i></span>
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
    let _nxModalPend = false;
    const _procesarOverlays = () => {
      _nxModalPend = false;
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
    };
    const observer = new MutationObserver(() => {
      if (_nxModalPend) return;
      _nxModalPend = true;
      requestAnimationFrame(_procesarOverlays);
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
    modal.innerHTML = '<div class="modal" style="max-width:560px"><div style="padding:40px;text-align:center;color:#475569">Cargando...</div></div>';
    modal.classList.add('open');
    await cargarDest();
    renderDestModal(modal);
  };

  function renderDestModal(modal) {
    const lista = _destCache.length === 0
      ? '<div style="text-align:center;padding:30px;color:#475569;font-size:13px">No hay empleados configurados.<br>Agrega uno abajo. 👇</div>'
      : _destCache.map(d => {
          const secs = getSecs(d);
          return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <div style="flex:1">
                  <div style="font-weight:800;font-size:13px;color:#0f172a">${esc(d.nombre)}</div>
                  <div style="font-size:11px;color:#475569">${esc(d.correo)}</div>
                </div>
                <span style="background:${d.activo?'#dcfce7':'#fee2e2'};color:${d.activo?'#059669':'#dc2626'};font-size:9px;font-weight:700;padding:3px 8px;border-radius:10px">${d.activo?'ACTIVO':'INACTIVO'}</span>
              </div>
              <div style="font-size:10px;color:#475569;margin-bottom:8px">Recibe: ${secs.length} sección(es)</div>
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
      ? '<div style="color:#475569;font-size:11px;padding:6px">Sin horas. Agrega abajo.</div>'
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
            ${mensaje ? `<div style="font-size:13px;color:#475569;line-height:1.5;white-space:pre-line">${(mensaje).replace(/</g,'&lt;')}</div>` : ''}
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
      ? '<div style="text-align:center;color:#475569;padding:30px;font-size:13px">No hay conversaciones guardadas todavía</div>'
      : hist.map((c, i) => {
          const fecha = new Date(c.fecha).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          return `<div onclick="window.nxSmartCargarVieja(${i})" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer">
            <div style="font-size:12px;font-weight:700;color:#1e293b">${c.titulo}</div>
            <div style="font-size:10px;color:#475569;margin-top:3px">📅 ${fecha} · ${c.mensajes.length} mensajes</div>
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
      ? `<div style="text-align:center;padding:30px 20px;color:#475569">
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
              <div style="background:#fff;border:1px solid #e2e8f0;color:#475569;padding:10px 14px;border-radius:4px 18px 18px 18px;font-size:12px;font-style:italic">
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
          <button style="background:rgba(255,255,255,.18);border:none;color:#fff;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0;margin-left:4px;display:inline-flex;align-items:center;justify-content:center" onclick="document.getElementById('nxSmartModal').classList.remove('open')" title="Volver"><i class="ti ti-arrow-left"></i></button>
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
      <span class="qa-i"><i class="ti ti-sparkles qa-ico c-smart"></i></span>
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
        .nxCi-title{font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
        .nxCi-big{font-size:34px;font-weight:800;color:#059669;line-height:1}
        .nxCi-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .nxCi-stat{background:#f8fafc;border-radius:10px;padding:12px;text-align:center}
        .nxCi-stat b{font-size:18px;font-weight:800;display:block}
        .nxCi-stat span{font-size:9px;color:#475569;text-transform:uppercase}
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
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <button onclick="${cerrar}" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center" title="Volver"><i class="ti ti-arrow-left"></i></button>
            <button onclick="${cerrar}" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px" title="Cerrar">✕</button>
          </div>
        </div>
        <div class="nxCi-body">

          <div class="nxCi-card">
            <div class="nxCi-title">💰 Cobrado este mes</div>
            <div class="nxCi-big">${F(mesActual.total)}</div>
            <div style="font-size:12px;color:#475569;margin-top:6px">
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
                  <span style="font-size:13px;font-weight:800;color:#059669">${F(m.total)}<span style="font-size:9px;color:#475569;font-weight:600"> · ${m.num}</span></span>
                </div>
                <div class="nxCi-bar-bg"><div class="nxCi-bar-fill" style="width:${Math.round(m.total/maxHist*100)}%;background:${m.mes===ymActual?'linear-gradient(90deg,#60a5fa,#1d4ed8)':'linear-gradient(90deg,#a7f3d0,#10b981)'}"></div></div>
              </div>
            `).join('') : '<div style="text-align:center;color:#475569;font-size:12px;padding:14px">Aún no hay cobros registrados</div>'}
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
      <span class="qa-i"><i class="ti ti-calendar-stats qa-ico c-naranja"></i></span>
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
          aviso.innerHTML = `⚠️ Esta cédula ya es de <strong>${(window.escHtml?window.escHtml(dup.nom):String(dup.nom||''))}</strong> (${estado}). <a href="#" onclick="event.preventDefault();document.getElementById('nxSmartModal');window.verCliente&&window.verCliente('${dup.id}')" style="color:#2563eb;text-decoration:underline">Ver cliente</a>`;
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
          aviso.style.color = '#475569';
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
  function tipoInfo(t) { return TIPOS[t] || { label: t || 'Egreso', benef: 'Beneficiario', icon: 'ti-cash', color: '#475569' }; }

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
    modal.innerHTML = '<div class="modal" style="max-width:620px"><div style="padding:40px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:10px;font-weight:600">Cargando contabilidad...</div></div></div>';
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
      ? '<div style="text-align:center;padding:36px 20px;color:#475569;font-size:13px">No hay egresos en este periodo.<br>Registra uno abajo. 👇</div>'
      : egs.map(e => {
          const ti = tipoInfo(e.tipo);
          return `
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:11px 12px;margin-bottom:9px;display:flex;align-items:center;gap:11px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
              <div style="width:40px;height:40px;border-radius:10px;background:${ti.color}18;color:${ti.color};display:grid;place-items:center;flex-shrink:0"><i class="ti ${ti.icon}" style="font-size:20px"></i></div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:800;color:#0f172a;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.concepto || ti.label)}</div>
                <div style="font-size:11px;color:#475569;margin-top:1px">${esc(ti.label)}${e.beneficiario ? ' · ' + esc(e.beneficiario) : ''}</div>
                <div style="font-size:10.5px;color:#475569;margin-top:1px">${fmtFecha(e.fecha)}${e.metodo ? ' · ' + esc(e.metodo) : ''}${e.banco ? ' · ' + esc(e.banco) : ''}${e.referencia ? ' · Ref: ' + esc(e.referencia) : ''}</div>
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
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:6px 2px 10px">
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
              <input type="text" id="nxEgMonto" value="${esc(e.monto || '')}" placeholder="0" inputmode="decimal" data-nx-money>
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
      monto: window.nxMoney ? window.nxMoney.parse(document.getElementById('nxEgMonto')?.value) : Number(document.getElementById('nxEgMonto')?.value || 0),
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
      <span class="qa-i"><i class="ti ti-calculator qa-ico c-azul"></i></span>
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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

    const inner = document.getElementById('nxPendInner');
    const panel = document.getElementById('panelPend');
    if (!inner || !panel) return;
    // Mostrar como pestaña inline (igual que Facturas/Cobros/Historial), no como ventana flotante
    ['panelFact', 'panelCob', 'panelPagos'].forEach(id => { const p = document.getElementById(id); if (p) p.style.display = 'none'; });
    panel.style.display = '';
    ['tabFact', 'tabCob', 'tabPagos'].forEach(id => { const t = document.getElementById(id); if (t) t.classList.remove('is-active'); });
    const tabBtn = document.getElementById('nxBtnPendPrev'); if (tabBtn) tabBtn.classList.add('is-active');
    inner.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:10px;font-weight:600">Revisando facturas...</div></div></div>';

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

    renderPendPanel(inner, lista, totalGeneral);
  };

  function renderPendPanel(inner, lista, totalGeneral) {
    const filas = lista.length === 0
      ? '<div style="text-align:center;padding:40px 20px;color:#10b981;font-size:14px;font-weight:600">✓ ¡Todo al día!<br><span style="color:#475569;font-weight:400;font-size:12px">Ningún cliente debe facturas de meses anteriores.</span></div>'
      : lista.map((x, i) => {
          const cli = x.cli || {};
          const chips = x.periodos.sort((a, b) => a.num - b.num)
            .map(p => `<span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:999px;padding:2px 8px;font-size:10px;font-weight:700;margin:2px 3px 0 0">${esc(p.label)} · ${fmt(p.monto)}</span>`).join('');
          const num = waNumero(cli);
          const idSafe = esc(String(cli.id || i));
          const cid = cli.id ? esc(String(cli.id)) : '';
          const nomData = esc((cli.nom || '').toLowerCase());
          return `
            <div class="nxPendCard" data-nom="${nomData}" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:9px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(145deg,#eef2f7,#e2e8f0);color:#475569;display:grid;place-items:center;font-weight:900;flex-shrink:0">${esc((cli.nom || '?').trim().charAt(0).toUpperCase())}</div>
                <div style="flex:1;min-width:0;cursor:pointer" ${cid ? `onclick="window.nxVerClientePend('${cid}')"` : ''} title="Ver resumen del cliente">
                  <div style="font-weight:800;color:#0f172a;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(cli.nom || 'Cliente')}</div>
                  <div style="font-size:11px;color:#475569">Agente: ${esc(x.agente)} · ${x.periodos.length} factura(s)</div>
                  ${cid ? '<div style="font-size:9px;color:#7c3aed;font-weight:700;margin-top:1px"><i class="ti ti-user-search"></i> Toca para ver resumen</div>' : ''}
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

    inner.innerHTML = `
      <div class="nc">
        <div class="ch">
          <div><div class="ct"><i class="ti ti-alert-triangle"></i> Pendientes de meses anteriores</div><div class="ct-s">Facturas de meses anteriores aún por cobrar</div></div>
        </div>
        ${lista.length ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center;margin:0 0 12px;box-shadow:inset 0 1px 2px rgba(15,23,42,.04)">
          <div style="font-size:10px;font-weight:800;color:#475569;letter-spacing:.4px">TOTAL POR COBRAR DE MESES ANTERIORES</div>
          <div style="font-size:24px;font-weight:900;color:#dc2626;margin-top:2px">${fmt(totalGeneral)}</div>
          <div style="font-size:10px;color:#475569;font-weight:600">${lista.length} cliente(s) con atraso</div>
        </div>` : ''}
        ${lista.length ? `<div style="position:relative;margin:0 0 12px">
          <i class="ti ti-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#475569;font-size:15px;pointer-events:none"></i>
          <input type="text" id="nxPendBuscar" placeholder="Buscar cliente..." autocomplete="off" oninput="window.nxFiltrarPend(this.value)" style="width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b">
        </div>` : ''}
        <div>${filas}</div>
      </div>`;
  }

  // Filtrar la lista de pendientes por nombre de cliente
  window.nxFiltrarPend = function (q) {
    const t = String(q || '').trim().toLowerCase();
    document.querySelectorAll('#panelPend .nxPendCard').forEach(c => {
      const nom = c.getAttribute('data-nom') || '';
      c.style.display = (!t || nom.includes(t)) ? '' : 'none';
    });
  };

  // Ver resumen del cliente: cierra este modal y abre la ficha completa (con botón Editar)
  window.nxVerClientePend = function (clienteId) {
    const modal = document.getElementById('nxModalPendPrev');
    if (modal) modal.classList.remove('open'); // cerrar para no encimar ventanas
    try {
      if (typeof window.verCliente === 'function') { window.verCliente(clienteId); return; }
      if (typeof verCliente === 'function') { verCliente(clienteId); return; }
    } catch (e) {}
    notify('err', 'No se pudo abrir el resumen', '');
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
    btn.className = 'nxft-tab nxft-alert'; // mismo control segmentado, acento de alerta
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}

  // Al cambiar a otra pestaña (Facturas/Cobros/Historial), ocultar el panel de
  // Pendientes y desactivar su botón — para que se comporte como una pestaña más.
  try {
    const orig = window.switchTab;
    if (typeof orig === 'function' && !orig.__nxPendWrapped) {
      window.switchTab = function () {
        const panel = document.getElementById('panelPend'); if (panel) panel.style.display = 'none';
        const tb = document.getElementById('nxBtnPendPrev'); if (tb) tb.classList.remove('is-active');
        return orig.apply(this, arguments);
      };
      window.switchTab.__nxPendWrapped = true;
    }
  } catch (e) {}
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
    ico.style.cssText = 'position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#475569;font-size:15px;pointer-events:none';
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
      prev.innerHTML = `<div style="display:flex;align-items:center;gap:10px;width:100%"><img src="${src}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;cursor:pointer" onclick="window.nxVerComprobante('${src}')"><div style="flex:1"><div style="font-size:11px;font-weight:800;color:#059669"><i class="ti ti-check"></i> Bauche listo</div><div style="font-size:9px;color:#475569">Toca la imagen para verla</div></div><button type="button" class="btn bsm bghost" style="color:#dc2626" onclick="window.nxQuitarBauche()"><i class="ti ti-trash"></i></button></div>`;
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
        <div style="font-size:9.5px;color:#475569;margin-top:6px;text-align:center">Copia el bauche en WhatsApp y toca <strong>"Pegar"</strong></div>
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
  try { window.addEventListener('nexus:reinit', init); } catch (e) {}
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
  // Admin SIEMPRE, o cualquier rol al que se le haya dado el permiso 'tabla_comparativa'
  function puedeVerTSS() {
    if (esAdmin()) return true;
    try { return (typeof window.tienePermiso === 'function') && window.tienePermiso('tabla_comparativa'); }
    catch (e) { return false; }
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
  let _acumCed = [];   // VARIOS archivos Excel: cédulas acumuladas {ced,nom,archivo}
  let _acumArchivos = []; // VARIOS archivos: resumen de archivos cargados
  let _ultimoCuadre = null; // último resultado (para descargar Excel)
  let _histData = [];       // historial cargado desde Supabase

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
    setArea('nxTssResultado', '<div style="text-align:center;padding:24px;color:#475569"><div class="spin"></div><div style="margin-top:8px">Leyendo archivo...</div></div>');
    setArea('nxTssMapeo', '');
    _rows = []; _titulares = []; _depCount = 0;
    _acumCed = []; _acumArchivos = [];
    let buf;
    try {
      buf = await leerBufferRobusto(file);
    } catch (e) {
      setArea('nxTssResultado', '<div style="color:#dc2626;padding:16px;text-align:center;font-size:13px">⚠️ No se pudo leer el archivo.<br><span style="font-size:12px;color:#475569">Si está <b>abierto en Excel</b> u otro programa, ciérralo y vuelve a intentarlo.<br>Si está en <b>OneDrive/Drive</b>, descárgalo primero a tu PC.</span></div>');
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
          setArea('nxTssResultado', '<div style="color:#dc2626;padding:16px;text-align:center">No encontré titulares en el PDF.<br><span style="font-size:11px;color:#475569">¿Es una factura de plan voluntario de Humano?</span></div>');
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
      setArea('nxTssResultado', `<div style="color:#dc2626;padding:16px;text-align:center;font-size:13px">⚠️ No se pudo leer el archivo.<br><span style="font-size:12px;color:#475569">${detalle}</span></div>`);
    }
  }

  // Lee un Excel/CSV (buffer) y devuelve sus cédulas {ced,nom,archivo}
  async function cedEntriesDeBuffer(buf, nombreArch) {
    const matrix = await obtenerMatriz(buf);
    let headerIdx = matrix.findIndex(row => row.some(c => /c[eé]dula|nombre|documento|empleado|trabajador|afiliado|cedula|nss/i.test(String(c))));
    if (headerIdx < 0) headerIdx = 0;
    const header = (matrix[headerIdx] || []).map(h => String(h || '').trim());
    const rows = matrix.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim() !== ''));
    const det = detectarColumnas(header, rows);
    return rows
      .map(r => ({ ced: normCedula(r[det.colCed]), nom: String(r[det.colNom] || '').trim(), archivo: nombreArch || '' }))
      .filter(e => e.ced);
  }

  // Procesa VARIOS archivos Excel/CSV a la vez y acumula sus cédulas (sin repetir)
  async function onVariosArchivos(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    _modo = 'cedula'; _rows = []; _titulares = []; _depCount = 0;
    _acumCed = []; _acumArchivos = [];
    setArea('nxTssMapeo', '');
    setArea('nxTssResultado', '<div style="text-align:center;padding:24px;color:#475569"><div class="spin"></div><div style="margin-top:8px">Leyendo ' + files.length + ' archivo(s)...</div></div>');
    const errores = [];
    for (const file of files) {
      try {
        const buf = await leerBufferRobusto(file);
        const u8 = new Uint8Array(buf.slice(0, 4));
        const esPDF = (file.name || '').toLowerCase().endsWith('.pdf') || (u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46);
        if (esPDF) { errores.push((file.name || 'PDF') + ' (PDF: súbelo solo)'); continue; }
        const entries = await cedEntriesDeBuffer(buf, file.name);
        if (entries.length) { _acumCed.push(...entries); _acumArchivos.push((file.name || 'archivo') + ' (' + entries.length + ')'); }
        else errores.push((file.name || 'archivo') + ' (sin cédulas)');
      } catch (e) {
        errores.push((file.name || 'archivo') + ' (no se pudo leer)');
      }
    }
    // dedup por cédula
    const vistos = new Set();
    _acumCed = _acumCed.filter(e => { if (vistos.has(e.ced)) return false; vistos.add(e.ced); return true; });
    const okHtml = _acumArchivos.length
      ? '<div style="font-size:11px;color:#166534;font-weight:700">✓ ' + _acumArchivos.length + ' archivo(s) · ' + _acumCed.length + ' cédulas (sin repetir)</div><div style="font-size:10px;color:#475569;margin-top:3px">' + _acumArchivos.map(esc).join(' · ') + '</div>'
      : '<div style="font-size:11px;color:#b91c1c;font-weight:700">No se leyeron cédulas de los archivos.</div>';
    const errHtml = errores.length ? '<div style="font-size:10px;color:#b91c1c;margin-top:5px">⚠️ ' + errores.map(esc).join(' · ') + '</div>' : '';
    setArea('nxTssMapeo', '<div style="margin-top:10px;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:10px">' + okHtml + errHtml + '</div>');
    comparar();
  }
  window.nxTssVariosArchivos = onVariosArchivos;

  // Descarga el cuadre actual en un Excel bien organizado
  async function exportarExcelCuadre() {
    const c = _ultimoCuadre;
    if (!c) { return; }
    let XLSX;
    try { XLSX = await cargarSheetJS(); } catch (e) { alert('No se pudo cargar el generador de Excel.'); return; }
    const m2 = (x) => Number(x || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Fuente: TSS (Excel por cédula) o Humano/Plan Voluntario (PDF por nombre)
    const esHumano = _modo === 'nombre';
    const F = esHumano ? (/voluntario/i.test(c.empresaNom || '') ? 'Plan Voluntario Humano' : 'Humano') : 'TSS';
    const rows = [['ESTADO', 'NOMBRE', 'CÉDULA', 'EMPRESA', 'DEUDA (RD$)', 'NOTA']];
    (c.coincidenList || []).forEach(p => rows.push(['Coincide (en ' + F + ' y en sistema)', p.nom || '', p.ced || '', c.empresaNom, '', '']));
    (c.faltanEnTSS || []).forEach(p => rows.push(['Falta en ' + F, p.nom || '', p.ced || '', c.empresaNom, '', '']));
    (c.extras || []).forEach(p => rows.push(['En ' + F + ' pero no en sistema', p.nom || '', p.ced || '', '', '', p.extra || '']));
    (c.inhabEnTSS || []).forEach(p => rows.push(['Inhabilitado en ' + F + ' (no debería)', p.nom || '', p.ced || '', c.empresaNom, '', p.extra || '']));
    (c.conDeuda || []).forEach(p => rows.push(['En ' + F + ' con deuda pendiente', p.nom || '', p.ced || '', c.empresaNom, m2(p.deuda), '']));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 34 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 32 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, ('Cuadre ' + F).slice(0, 31));
    const nombre = 'Cuadre_' + (esHumano ? 'Humano' : 'TSS') + '_' + String(c.empresaNom || 'empresa').replace(/[^\w]+/g, '_') + '.xlsx';
    try { XLSX.writeFile(wb, nombre); } catch (e) { alert('No se pudo descargar el Excel: ' + (e && e.message ? e.message : '')); }
  }
  window.nxTssExportarExcel = exportarExcelCuadre;

  // ── HISTORIAL POR PERÍODO (ciclo 20 → 19) ──
  const _MESES_TSS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const _MESC_TSS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function periodoCierreActual() {
    const f = new Date(); let y = f.getFullYear(), m = f.getMonth();
    if (f.getDate() >= 20) { m += 1; if (m > 11) { m = 0; y += 1; } }
    return y + '-' + String(m + 1).padStart(2, '0');
  }
  function etiquetaPeriodo(clave) {
    const p = String(clave || '').split('-').map(Number); const y = p[0], m = p[1];
    if (!y || !m) return String(clave || '');
    return _MESES_TSS[m - 1] + ' ' + y + ' (20 ' + _MESC_TSS[(m - 2 + 12) % 12] + ' – 19 ' + _MESC_TSS[m - 1] + ')';
  }
  function opcionesPeriodo() {
    const actual = periodoCierreActual(); let pa = actual.split('-').map(Number), y = pa[0], m = pa[1];
    const opts = [];
    for (let i = 0; i < 13; i++) {
      const clave = y + '-' + String(m).padStart(2, '0');
      opts.push('<option value="' + clave + '"' + (clave === actual ? ' selected' : '') + '>' + etiquetaPeriodo(clave) + '</option>');
      m--; if (m < 1) { m = 12; y--; }
    }
    return opts.join('');
  }
  window.nxTssOpcionesPeriodo = opcionesPeriodo;

  window.nxTssGuardarHistorial = async function () {
    if (!_ultimoCuadre) { alert('Primero haz un cuadre: elige la empresa y sube el archivo de TSS.'); return; }
    const periodo = document.getElementById('nxTssPeriodo')?.value || periodoCierreActual();
    let usuario = 'Sistema'; try { const s = JSON.parse(sessionStorage.getItem('nx_sesion') || 'null'); if (s && s.nom) usuario = s.nom; } catch (e) { }
    const rec = {
      periodo, empresa_nom: _ultimoCuadre.empresaNom || '', usuario,
      total_deuda: _ultimoCuadre.totalDeuda || 0,
      resumen: {
        fuente: (_modo === 'nombre' ? 'humano' : 'tss'),
        coinciden: (_ultimoCuadre.coincidenList || []).length,
        faltanTSS: (_ultimoCuadre.faltanEnTSS || []).map(p => ({ nom: p.nom, ced: p.ced })),
        extras: (_ultimoCuadre.extras || []).map(p => ({ nom: p.nom, ced: p.ced, extra: p.extra || '' })),
        inhabEnTSS: (_ultimoCuadre.inhabEnTSS || []).map(p => ({ nom: p.nom, ced: p.ced, extra: p.extra || '' })),
        conDeuda: (_ultimoCuadre.conDeuda || []).map(p => ({ nom: p.nom, ced: p.ced, deuda: p.deuda })),
        totalDeuda: _ultimoCuadre.totalDeuda || 0
      }
    };
    try {
      const _api = (typeof API !== 'undefined') ? API : (window.API || null);
      if (!_api || typeof _api.post !== 'function') throw new Error('No se pudo acceder a la base de datos.');
      // Evitar duplicados: mismo período + misma empresa
      const empNom = rec.empresa_nom || '';
      let existentes = [];
      try {
        existentes = await _api.get('cuadre_tss_historial', 'select=id&periodo=eq.' + encodeURIComponent(periodo) + '&empresa_nom=eq.' + encodeURIComponent(empNom));
      } catch (e) { existentes = []; }
      if (Array.isArray(existentes) && existentes.length) {
        const reemplazar = confirm('⚠️ Ya fue guardada esta empresa en ' + etiquetaPeriodo(periodo) + '.\n\n¿Deseas reemplazar el cuadre anterior con este nuevo?');
        if (!reemplazar) {
          if (typeof window.toast === 'function') window.toast('warn', 'Ya fue guardada', etiquetaPeriodo(periodo) + ' · ' + empNom);
          else alert('⚠️ Ya fue guardada — no se duplicó.');
          return;
        }
        // Reemplazar: borrar el/los anteriores antes de insertar
        if (typeof _api.del === 'function') {
          try { await _api.del('cuadre_tss_historial', 'periodo=eq.' + encodeURIComponent(periodo) + '&empresa_nom=eq.' + encodeURIComponent(empNom)); } catch (e) { }
        }
      }
      await _api.post('cuadre_tss_historial', rec);
      const detalle = (empNom ? empNom + ' · ' : '') + etiquetaPeriodo(periodo);
      if (typeof window.toast === 'function') window.toast('ok', '✅ Cuadre guardado', detalle);
      else alert('✅ Cuadre guardado\n' + detalle);
      // Confirmación visible dentro de la ventana (banner verde arriba del resultado)
      try {
        const cont = document.getElementById('nxTssResultado');
        if (cont) {
          const banner = document.createElement('div');
          banner.style.cssText = 'background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:10px;padding:10px 12px;font-size:12px;font-weight:700;margin:10px 0;display:flex;align-items:center;gap:8px;animation:tIn .2s ease';
          banner.innerHTML = '<span style="font-size:16px">💾</span><div>Cuadre guardado en el historial<div style="font-size:10.5px;font-weight:600;color:#047857;margin-top:1px">' + esc(detalle) + '</div></div>';
          cont.prepend(banner);
          setTimeout(() => { try { banner.remove(); } catch (e) { } }, 6000);
        }
      } catch (e) { }
      try { if (typeof window.logAudit === 'function') window.logAudit('CUADRE_TSS_GUARDADO', (rec.empresa_nom || '') + ' · ' + periodo, 'Reportes'); } catch (e) { }
    } catch (e) { alert('No se pudo guardar el cuadre: ' + (e && e.message ? e.message : '')); }
  };

  window.nxTssVerHistorial = async function () {
    setArea('nxTssResultado', '<div style="text-align:center;padding:20px;color:#475569"><div class="spin"></div><div style="margin-top:6px">Cargando historial...</div></div>');
    let data = [];
    try { const _api = (typeof API !== 'undefined') ? API : window.API; data = await _api.get('cuadre_tss_historial', 'select=*&order=created_at.desc&limit=300'); } catch (e) { setArea('nxTssResultado', '<div style="color:#dc2626;padding:16px;text-align:center;font-size:13px">No se pudo cargar el historial.</div>'); return; }
    if (!Array.isArray(data) || !data.length) { setArea('nxTssResultado', '<div style="text-align:center;color:#475569;padding:24px;font-size:13px">📜 Aún no hay cuadres guardados.<br><span style="font-size:11px">Haz un cuadre y toca "Guardar cuadre".</span></div>'); return; }
    _histData = data;
    const items = data.map((r, i) => {
      const fecha = r.created_at ? new Date(r.created_at).toLocaleString('es-DO') : '';
      const res = r.resumen || {};
      return '<div onclick="window.nxTssVerSnapshot(' + i + ')" style="cursor:pointer;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:6px;background:#fff"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-weight:700;font-size:12.5px;color:#1e293b">' + esc(etiquetaPeriodo(r.periodo || '')) + '</div><div style="font-size:10px;color:#475569">' + esc(fecha) + '</div></div><div style="font-size:11px;color:#475569;margin-top:3px">🏢 ' + esc(r.empresa_nom || '—') + ' · 👤 ' + esc(r.usuario || '') + '</div><div style="font-size:10px;color:#475569;margin-top:2px">✅ ' + (res.coinciden || 0) + ' coinciden · ⚠️ ' + ((res.faltanTSS || []).length) + ' faltan · 💰 ' + ((res.conDeuda || []).length) + ' con deuda</div></div>';
    }).join('');
    setArea('nxTssResultado', '<div style="margin:12px 0"><div style="font-size:12px;font-weight:800;color:#1e293b;margin-bottom:8px">📜 HISTORIAL DE CUADRES (' + data.length + ')</div>' + items + '</div>');
  };

  window.nxTssVerSnapshot = function (i) {
    const r = (_histData || [])[i]; if (!r) return;
    const res = r.resumen || {};
    // Fuente del cuadre: TSS (Excel por cédula) o Humano/Plan Voluntario (PDF por nombre)
    const esHumano = res.fuente ? res.fuente === 'humano' : /voluntario|humano/i.test(r.empresa_nom || '');
    const F = esHumano ? (/voluntario/i.test(r.empresa_nom || '') ? 'PLAN VOLUNTARIO HUMANO' : 'HUMANO') : 'TSS';
    const sec = (titulo, color, bg, arr, deuda) => {
      const lista = (arr || []).map(p => {
        const clic = p.ced ? ' onclick="window.nxTssFicha(\'' + esc(p.ced) + '\')"' : '';
        const cur = p.ced ? 'cursor:pointer;' : '';
        return '<div' + clic + ' style="' + cur + 'display:flex;justify-content:space-between;gap:8px;padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:12px"><div style="min-width:0"><div style="font-weight:600">' + esc(p.nom || '') + '</div><div style="font-size:10px;color:#475569;font-family:var(--mono,monospace)">' + esc(p.ced || '') + '</div></div>' + (deuda ? '<div style="font-weight:800;color:#b91c1c;flex-shrink:0">RD$ ' + Number(p.deuda || 0).toLocaleString('es-DO') + '</div>' : (p.extra ? '<div style="font-size:10px;color:#475569;flex-shrink:0">' + esc(p.extra) + '</div>' : '')) + (p.ced ? '<i class="ti ti-chevron-right" style="color:#cbd5e1;flex-shrink:0;font-size:15px"></i>' : '') + '</div>';
      }).join('') || '<div style="padding:10px 12px;color:#475569;font-size:11px">—</div>';
      return '<div style="border:1px solid ' + color + '33;border-radius:10px;margin-bottom:8px;overflow:hidden"><div style="background:' + bg + ';padding:8px 12px;font-size:11px;font-weight:800;color:' + color + '">' + titulo + ' (' + (arr || []).length + ')</div><div style="max-height:180px;overflow-y:auto">' + lista + '</div></div>';
    };
    setArea('nxTssResultado',
      '<button type="button" onclick="window.nxTssVerHistorial()" style="border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:9px;padding:7px 12px;font-weight:700;font-size:11px;cursor:pointer;margin:10px 0"><i class="ti ti-arrow-left"></i> Volver al historial</button>'
      + '<div style="font-size:13px;font-weight:800;color:#1e293b">' + esc(etiquetaPeriodo(r.periodo || '')) + '</div>'
      + '<div style="font-size:11px;color:#475569;margin-bottom:10px">🏢 ' + esc(r.empresa_nom || '—') + ' · 👤 ' + esc(r.usuario || '') + (r.created_at ? ' · ' + esc(new Date(r.created_at).toLocaleString('es-DO')) : '') + '</div>'
      + sec('⚠️ FALTAN EN ' + F, '#dc2626', '#fef2f2', res.faltanTSS)
      + sec('📋 EN ' + F + ' PERO NO EN SISTEMA', '#b45309', '#fffbeb', res.extras)
      + sec('⛔ INHABILITADOS EN ' + F, '#9f1239', '#fff1f2', res.inhabEnTSS)
      + sec('💰 EN ' + F + ' CON DEUDA', '#9a3412', '#fff7ed', res.conDeuda, true)
    );
  };

  function renderInfoPDF() {
    setArea('nxTssMapeo', `
      <div style="display:flex;gap:8px;margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;font-size:12px;color:#1e40af">
        <i class="ti ti-file-text" style="font-size:16px"></i>
        <div>PDF de Humano detectado · <b>${_titulares.length} titulares</b> · ${_depCount} dependientes ignorados.
        <div style="font-size:10px;color:#475569;margin-top:2px">Sin cédula en el PDF → la comparación es <b>por nombre</b>.</div></div>
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
    _acumCed = []; _acumArchivos = [];
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
      aviso('No encontré un archivo en el portapapeles.<br><span style="color:#475569;font-size:12px">En iPhone, para el PDF usa <b>"Seleccionar archivo" → "Elegir archivo"</b>.</span>', '#b45309');
    } catch (e) {
      aviso('No se pudo leer el portapapeles.<br><span style="color:#475569;font-size:12px">Usa <b>"Seleccionar archivo"</b> para el PDF (en iPhone: "Elegir archivo").</span>', '#b45309');
    }
  };

  function renderMapeo() {
    if (!_header.length) { setArea('nxTssMapeo', ''); return; }
    const opts = sel => _header.map((h, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(h || ('Columna ' + (i + 1)))}</option>`).join('');
    setArea('nxTssMapeo', `
      <div style="display:flex;gap:8px;margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px">
        <div style="flex:1"><label style="font-size:10px;font-weight:700;color:#475569;display:block;margin-bottom:3px">Columna de CÉDULA</label>
          <select id="nxTssColCed" onchange="window.nxTssRemap()" style="width:100%;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">${opts(_colCed)}</select></div>
        <div style="flex:1"><label style="font-size:10px;font-weight:700;color:#475569;display:block;margin-bottom:3px">Columna de NOMBRE</label>
          <select id="nxTssColNom" onchange="window.nxTssRemap()" style="width:100%;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px">${opts(_colNom)}</select></div>
      </div>
      <div style="font-size:10px;color:#475569;margin-top:4px">Si las columnas no son correctas, cámbialas aquí.</div>`);
  }
  window.nxTssRemap = function () {
    _colCed = parseInt(document.getElementById('nxTssColCed')?.value || 0);
    _colNom = parseInt(document.getElementById('nxTssColNom')?.value || 0);
    comparar();
  };

  function chip(color, bg, label, val) {
    return `<div style="background:${bg};border-radius:10px;padding:9px;text-align:center;flex:1;min-width:90px">
      <div style="font-size:17px;font-weight:900;color:${color}">${val}</div>
      <div style="font-size:8.5px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.3px">${label}</div></div>`;
  }
  function listaPersonas(items, color, vacio) {
    if (!items.length) return `<div style="text-align:center;color:#10b981;font-size:12px;padding:14px;font-weight:600">✓ ${vacio}</div>`;
    return items.map(it => {
      const sub = [];
      if (it.ced) sub.push(esc(fmtCed(it.ced)));
      if (it.extra) sub.push(`<span style="color:#d97706">${esc(it.extra)}</span>`);
      const clic = it.ced ? `onclick="window.nxTssFicha('${esc(it.ced)}')" style="cursor:pointer"` : '';
      return `
      <div ${clic} class="nxtss-row" style="display:flex;align-items:center;gap:10px;padding:9px;border-bottom:1px solid #f1f5f9">
        <div style="width:30px;height:30px;border-radius:8px;background:${color}1a;color:${color};display:grid;place-items:center;font-weight:800;flex-shrink:0;font-size:13px">${esc((it.nom || '?').trim().charAt(0).toUpperCase())}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;color:#0f172a;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.nom || '(sin nombre)')}</div>
          ${sub.length ? `<div style="font-size:10.5px;color:#475569">${sub.join(' · ')}</div>` : ''}
        </div>
        ${it.ced ? '<i class="ti ti-chevron-right" style="color:#cbd5e1;flex-shrink:0;font-size:16px"></i>' : ''}
      </div>`;
    }).join('');
  }

  // Ficha detallada del cliente (al tocar una fila del cuadre)
  window.nxTssFicha = function (ced) {
    const ST_ = getST();
    const clientes = Array.isArray(ST_.clientes) ? ST_.clientes : [];
    const empresas = Array.isArray(ST_.empresas) ? ST_.empresas : [];
    const k = normCedula(ced);
    const c = clientes.find(x => normCedula(x.cedula) === k);
    // Si el cliente existe en el sistema, abrir su ficha COMPLETA (con botón Editar)
    if (c) {
      const ver = (typeof window.verCliente === 'function') ? window.verCliente : (typeof verCliente === 'function' ? verCliente : null);
      if (ver) { try { ver(c.id); return; } catch (e) {} }
    }
    const nomEmp = id => empresas.find(e => String(e.id) === String(id))?.nom || '—';
    const fmtRD = (x) => 'RD$ ' + Number(x || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const pendDe = (cl) => (typeof window.pend === 'function' ? Number(window.pend(cl) || 0) : Math.max(0, Number(cl.deuda_total || 0) - Number(cl.pagado || 0)));

    let ov = document.getElementById('nxTssFichaOv');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'nxTssFichaOv';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(3px);z-index:99995;display:flex;justify-content:center;align-items:center;padding:18px';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });

    let cuerpo;
    if (!c) {
      cuerpo = `<div style="padding:22px;text-align:center;color:#475569;font-size:13px">
        <div style="font-size:30px;margin-bottom:6px">🔎</div>
        <div style="font-weight:700;color:#0f172a">No está en el sistema</div>
        <div style="font-size:11px;margin-top:4px">Cédula ${esc(fmtCed(k))} aparece en la TSS pero no la tienes registrada como cliente.</div>
      </div>`;
    } else {
      const deuda = pendDe(c);
      const deps = Array.isArray(c.deps) ? c.deps : [];
      const inhab = c.activo === false;
      const fila = (icono, etq, val) => `<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9"><div style="width:20px;text-align:center;flex-shrink:0">${icono}</div><div style="font-size:11px;color:#475569;width:78px;flex-shrink:0">${etq}</div><div style="font-size:12.5px;color:#0f172a;font-weight:600;flex:1;min-width:0;word-break:break-word">${val}</div></div>`;
      const tel = c.tel || c.wa || '';
      cuerpo = `
        <div style="padding:16px">
          ${inhab ? `<div style="background:#fff1f2;border:1px solid #fecdd3;color:#9f1239;border-radius:9px;padding:8px 10px;font-size:11px;font-weight:700;margin-bottom:10px">⛔ Inhabilitado en el sistema${c.motivo_inhab ? ' · ' + esc(c.motivo_inhab) : ''} — no debería estar en la TSS</div>` : ''}
          ${fila('🏢', 'Empresa', esc(nomEmp(c.empresa_id)))}
          ${fila('📋', 'Plan', esc(c.plan || '—'))}
          ${fila('🪪', 'Póliza', esc(c.numero_poliza || '—'))}
          ${fila('📞', 'Teléfono', tel ? esc(tel) : '—')}
          ${fila('👥', 'Dependientes', String(deps.length))}
          ${fila('💰', 'Deuda', `<span style="color:${deuda > 0 ? '#b91c1c' : '#059669'};font-weight:800">${fmtRD(deuda)}</span>`)}
          ${deps.length ? `<div style="margin-top:10px;background:#f8fafc;border-radius:9px;padding:8px 10px"><div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px">Dependientes</div>${deps.map(d => `<div style="font-size:11.5px;color:#334155;padding:2px 0">• ${esc(d.nom || d.nombre || '—')}${d.rel ? ` <span style="color:#475569">— ${esc(d.rel)}</span>` : ''}</div>`).join('')}</div>` : ''}
        </div>`;
    }

    ov.innerHTML = `
      <div style="background:#fff;border-radius:18px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35)" onclick="event.stopPropagation()">
        <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px">
          <div style="min-width:0">
            <div style="font-size:15px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc((c && c.nom) || 'Cédula no registrada')}</div>
            <div style="font-size:11px;opacity:.85;font-family:var(--mono,monospace)">${esc(fmtCed(k))}</div>
          </div>
          <button onclick="document.getElementById('nxTssFichaOv').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;flex-shrink:0">✕</button>
        </div>
        ${cuerpo}
      </div>`;
    document.body.appendChild(ov);
  };

  function comparar() {
    const empId = document.getElementById('nxTssEmpresa')?.value || '';
    const hayArchivo = _modo === 'nombre' ? _titulares.length : (_acumCed.length || _rows.length);
    if (!hayArchivo) { setArea('nxTssResultado', '<div style="text-align:center;color:#475569;padding:24px;font-size:13px">📄 Sube un archivo (TSS Excel/CSV o PDF de Humano) para comparar.</div>'); return; }
    if (!empId) { setArea('nxTssResultado', '<div style="text-align:center;color:#f59e0b;padding:24px;font-size:13px">🏢 Elige una empresa arriba para comparar.</div>'); return; }
    if (_modo === 'nombre') return compararNombre(empId);
    return compararCedula(empId);
  }

  function compararCedula(empId) {
    const ST_ = getST();
    const clientes = Array.isArray(ST_.clientes) ? ST_.clientes : [];
    const sysCli = empId === '__TODAS__' ? clientes.slice() : clientes.filter(c => String(c.empresa_id) === String(empId));

    const fileEntries = (_acumCed && _acumCed.length)
      ? _acumCed.map(e => ({ ced: e.ced, nom: e.nom }))
      : _rows.map(r => ({ ced: normCedula(r[_colCed]), nom: String(r[_colNom] || '').trim() })).filter(e => e.ced);
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

    // ⛔ Inhabilitados que aparecen en la TSS (no deberían estar)
    const vistosInh = new Set();
    const inhabEnTSS = [];
    fileEntries.forEach(e => {
      if (vistosInh.has(e.ced)) return;
      const cli = allByCed[e.ced];
      if (cli && cli.activo === false) {
        vistosInh.add(e.ced);
        inhabEnTSS.push({ ced: e.ced, nom: cli.nom || e.nom, extra: 'Inhabilitado en el sistema' + (cli.motivo_inhab ? ' · ' + cli.motivo_inhab : '') });
      }
    });

    // 💰 Clientes que están en la TSS y tienen deuda pendiente
    const pendDe = (c) => (typeof window.pend === 'function' ? Number(window.pend(c) || 0) : Math.max(0, Number(c.deuda_total || 0) - Number(c.pagado || 0)));
    const conDeuda = sysCli
      .filter(c => { const k = normCedula(c.cedula); return k && fileSet.has(k); })
      .map(c => ({ nom: c.nom, ced: normCedula(c.cedula), deuda: pendDe(c) }))
      .filter(c => c.deuda > 0)
      .sort((a, b) => b.deuda - a.deuda);
    const totalDeuda = conDeuda.reduce((s, c) => s + c.deuda, 0);
    const fmtRD = (x) => 'RD$ ' + Number(x || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const coincidenList = sysCed.filter(c => c.ced && fileSet.has(c.ced));
    _ultimoCuadre = { empresaNom: empId === '__TODAS__' ? 'Todas las empresas' : (nomEmpresa(empId) || ''), coincidenList, faltanEnTSS, extras, inhabEnTSS, conDeuda, totalDeuda };

    // ── RESUMEN EJECUTIVO + ACCIONES SUGERIDAS ──
    const pct = sysCli.length ? Math.round(coinciden / sysCli.length * 100) : 0;
    const acciones = [];
    if (inhabEnTSS.length) acciones.push({ ic: '⛔', col: '#9f1239', bg: '#fff1f2', txt: `Dar de baja en la TSS a <b>${inhabEnTSS.length}</b> inhabilitado(s) que no deberían estar.` });
    if (conDeuda.length) acciones.push({ ic: '💰', col: '#9a3412', bg: '#fff7ed', txt: `Cobrar <b>${fmtRD(totalDeuda)}</b> a <b>${conDeuda.length}</b> cliente(s) con deuda pendiente.` });
    if (faltanEnTSS.length) acciones.push({ ic: '⚠️', col: '#b91c1c', bg: '#fef2f2', txt: `Verificar/incluir en la TSS a <b>${faltanEnTSS.length}</b> cliente(s) tuyo(s) que no aparecen.` });
    if (extras.length) acciones.push({ ic: '📋', col: '#b45309', bg: '#fffbeb', txt: `Revisar <b>${extras.length}</b> persona(s) que están en la TSS pero no en tu sistema.` });
    const todoOk = !acciones.length;
    const resumenHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px">
          <div style="font-size:12px;font-weight:800;color:#1e293b">📊 RESUMEN EJECUTIVO</div>
          <div style="font-size:11px;font-weight:800;color:${pct >= 90 ? '#059669' : pct >= 70 ? '#d97706' : '#dc2626'}">${pct}% cuadra</div>
        </div>
        <div style="height:7px;background:#f1f5f9;border-radius:6px;overflow:hidden;margin-bottom:11px"><div style="height:100%;width:${pct}%;background:${pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'};border-radius:6px"></div></div>
        ${todoOk
        ? `<div style="display:flex;gap:8px;align-items:center;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:10px 12px"><span style="font-size:18px">✅</span><div style="font-size:12px;font-weight:700;color:#065f46">Todo cuadra. No hay acciones pendientes para esta empresa.</div></div>`
        : `<div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin-bottom:7px">Acciones sugeridas (${acciones.length})</div>
           ${acciones.map(a => `<div style="display:flex;gap:9px;align-items:flex-start;background:${a.bg};border-radius:10px;padding:9px 11px;margin-bottom:6px"><span style="font-size:15px;flex-shrink:0;line-height:1.2">${a.ic}</span><div style="font-size:12px;color:${a.col};line-height:1.4">${a.txt}</div></div>`).join('')}`}
      </div>`;

    setArea('nxTssResultado', `
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0">
        ${chip('#1e293b', '#f1f5f9', 'Sistema', sysCli.length)}
        ${chip('#1e293b', '#f1f5f9', 'En TSS', fileEntries.length)}
        ${chip('#059669', '#ecfdf5', 'Coinciden', coinciden)}
        ${chip('#dc2626', '#fef2f2', 'Faltan TSS', faltanEnTSS.length)}
        ${chip('#d97706', '#fffbeb', 'Extras', extras.length)}
        ${inhabEnTSS.length ? chip('#9f1239', '#fff1f2', 'Inhab. en TSS', inhabEnTSS.length) : ''}
        ${conDeuda.length ? chip('#9a3412', '#fff7ed', 'Con deuda', conDeuda.length) : ''}
      </div>

      ${resumenHTML}

      <div style="font-size:10.5px;color:#475569;text-align:center;margin:-4px 0 10px">👆 Toca cualquier persona para ver su ficha</div>

      <button onclick="window.nxTssExportarExcel && window.nxTssExportarExcel()" style="width:100%;border:none;background:linear-gradient(135deg,#047857,#10b981);color:#fff;border-radius:10px;padding:11px;font-weight:700;font-size:12.5px;cursor:pointer;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-file-spreadsheet" style="color:#fff!important"></i> Descargar Excel del cuadre</button>

      ${conDeuda.length ? `<div style="background:#fff;border:1px solid #fed7aa;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fff7ed;padding:9px 12px;font-size:11px;font-weight:800;color:#9a3412;display:flex;justify-content:space-between;gap:8px"><span>💰 EN TSS CON DEUDA PENDIENTE (${conDeuda.length})</span><span>Total: ${fmtRD(totalDeuda)}</span></div>
        <div style="max-height:230px;overflow-y:auto">${conDeuda.map(c => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:12px"><div style="min-width:0"><div style="font-weight:600;color:#0f172a">${esc(c.nom)}</div><div style="font-size:10px;color:#475569;font-family:var(--mono,monospace)">${esc(c.ced)}</div></div><div style="font-weight:800;color:#b91c1c;font-size:12px;flex-shrink:0">${fmtRD(c.deuda)}</div></div>`).join('')}</div>
      </div>` : ''}

      ${inhabEnTSS.length ? `<div style="background:#fff;border:2px solid #fecdd3;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fff1f2;padding:9px 12px;font-size:11px;font-weight:800;color:#9f1239">⛔ INHABILITADOS QUE APARECEN EN TSS — NO DEBERÍAN (${inhabEnTSS.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(inhabEnTSS, '#e11d48', '')}</div>
      </div>` : ''}

      <div style="background:#fff;border:1px solid #fecaca;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fef2f2;padding:9px 12px;font-size:11px;font-weight:800;color:#b91c1c">⚠️ TUS CLIENTES QUE FALTAN EN LA TSS (${faltanEnTSS.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(faltanEnTSS, '#dc2626', 'Todos tus clientes están en la TSS')}</div>
      </div>

      <div style="background:#fff;border:1px solid #fde68a;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fffbeb;padding:9px 12px;font-size:11px;font-weight:800;color:#b45309">📋 EN LA TSS PERO NO EN EL SISTEMA (${extras.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(extras, '#d97706', 'No hay personas de más en el archivo')}</div>
      </div>

      ${sinCedula.length ? `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#f8fafc;padding:9px 12px;font-size:11px;font-weight:800;color:#475569">❔ CLIENTES SIN CÉDULA (no se pueden comparar) (${sinCedula.length})</div>
        <div style="max-height:160px;overflow-y:auto">${listaPersonas(sinCedula, '#475569', '')}</div>
      </div>` : ''}
    `);
  }
  function compararNombre(empId) {
    const ST_ = getST();
    const clientes = Array.isArray(ST_.clientes) ? ST_.clientes : [];
    const empresas = Array.isArray(ST_.empresas) ? ST_.empresas : [];
    const nomEmpresa = id => empresas.find(e => String(e.id) === String(id))?.nom || '';
    const fmtRD = (x) => 'RD$ ' + Number(x || 0).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const pendDe = (cl) => (typeof window.pend === 'function' ? Number(window.pend(cl) || 0) : Math.max(0, Number(cl.deuda_total || 0) - Number(cl.pagado || 0)));
    const sysCli = (empId === '__TODAS__' ? clientes.slice() : clientes.filter(c => String(c.empresa_id) === String(empId))).map(c => ({ nom: c.nom, tok: tokensNom(c.nom), c }));
    const tit = _titulares.map(n => ({ nom: n, tok: tokensNom(n) }));

    const usados = new Set();
    const coinciden = [], dudosos = [], soloArchivo = [], pend = [], matchCli = [];
    const buscar = (t, tier) => { let best = -1; sysCli.forEach((c, i) => { if (best < 0 && !usados.has(i) && tierNombre(t.tok, c.tok) === tier) best = i; }); return best; };
    // 1ª pasada: coincidencias fuertes (tienen prioridad sobre las dudosas)
    tit.forEach(t => { const b = buscar(t, 2); if (b >= 0) { const cl = sysCli[b].c; coinciden.push({ nom: t.nom, ced: normCedula(cl.cedula) }); matchCli.push(cl); usados.add(b); } else pend.push(t); });
    // 2ª pasada: coincidencias dudosas sobre lo que sobra
    pend.forEach(t => { const b = buscar(t, 1); if (b >= 0) { const cl = sysCli[b].c; dudosos.push({ nom: t.nom, ced: normCedula(cl.cedula), extra: `en sistema: ${sysCli[b].nom}` }); matchCli.push(cl); usados.add(b); } else soloArchivo.push({ nom: t.nom }); });
    const soloSistema = sysCli.filter((c, i) => !usados.has(i)).map(c => ({ nom: c.nom, ced: normCedula(c.c.cedula) }));

    // Deuda e inhabilitados sobre los que SÍ aparecen en el PDF (coinciden + dudosos)
    const conDeuda = matchCli
      .map(c => ({ nom: c.nom, ced: normCedula(c.cedula), deuda: pendDe(c) }))
      .filter(c => c.deuda > 0)
      .sort((a, b) => b.deuda - a.deuda);
    const totalDeuda = conDeuda.reduce((s, c) => s + c.deuda, 0);
    const inhabEnTSS = matchCli.filter(c => c.activo === false).map(c => ({ nom: c.nom, ced: normCedula(c.cedula), extra: 'Inhabilitado en el sistema' + (c.motivo_inhab ? ' · ' + c.motivo_inhab : '') }));

    _ultimoCuadre = {
      empresaNom: empId === '__TODAS__' ? 'Todas las empresas' : (nomEmpresa(empId) || ''),
      coincidenList: coinciden.concat(dudosos),
      faltanEnTSS: soloSistema,   // tus clientes que NO aparecen en el PDF
      extras: soloArchivo,        // en el PDF pero NO en tu sistema
      inhabEnTSS, conDeuda, totalDeuda
    };

    // Resumen ejecutivo + acciones
    const baseCuadre = coinciden.length + dudosos.length;
    const pct = sysCli.length ? Math.round(baseCuadre / sysCli.length * 100) : 0;
    const acciones = [];
    if (inhabEnTSS.length) acciones.push({ ic: '⛔', col: '#9f1239', bg: '#fff1f2', txt: `Dar de baja en Humano a <b>${inhabEnTSS.length}</b> inhabilitado(s) que aparecen en el PDF.` });
    if (conDeuda.length) acciones.push({ ic: '💰', col: '#9a3412', bg: '#fff7ed', txt: `Cobrar <b>${fmtRD(totalDeuda)}</b> a <b>${conDeuda.length}</b> cliente(s) con deuda pendiente.` });
    if (soloArchivo.length) acciones.push({ ic: '⚠️', col: '#b91c1c', bg: '#fef2f2', txt: `Registrar en el sistema a <b>${soloArchivo.length}</b> titular(es) del PDF que no tienes.` });
    if (dudosos.length) acciones.push({ ic: '❓', col: '#b45309', bg: '#fffbeb', txt: `Revisar <b>${dudosos.length}</b> posible(s) coincidencia(s) por nombre.` });
    const todoOk = !acciones.length;
    const resumenHTML = `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px">
          <div style="font-size:12px;font-weight:800;color:#1e293b">📊 RESUMEN EJECUTIVO</div>
          <div style="font-size:11px;font-weight:800;color:${pct >= 90 ? '#059669' : pct >= 70 ? '#d97706' : '#dc2626'}">${pct}% cuadra</div>
        </div>
        <div style="height:7px;background:#f1f5f9;border-radius:6px;overflow:hidden;margin-bottom:11px"><div style="height:100%;width:${pct}%;background:${pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'};border-radius:6px"></div></div>
        ${todoOk
        ? `<div style="display:flex;gap:8px;align-items:center;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:10px 12px"><span style="font-size:18px">✅</span><div style="font-size:12px;font-weight:700;color:#065f46">Todo cuadra. No hay acciones pendientes.</div></div>`
        : `<div style="font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin-bottom:7px">Acciones sugeridas (${acciones.length})</div>
           ${acciones.map(a => `<div style="display:flex;gap:9px;align-items:flex-start;background:${a.bg};border-radius:10px;padding:9px 11px;margin-bottom:6px"><span style="font-size:15px;flex-shrink:0;line-height:1.2">${a.ic}</span><div style="font-size:12px;color:${a.col};line-height:1.4">${a.txt}</div></div>`).join('')}`}
      </div>`;

    setArea('nxTssResultado', `
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:12px 0">
        ${chip('#1e293b', '#f1f5f9', 'Titulares PDF', tit.length)}
        ${chip('#1e293b', '#f1f5f9', 'Sistema', sysCli.length)}
        ${chip('#059669', '#ecfdf5', 'Coinciden', coinciden.length)}
        ${chip('#d97706', '#fffbeb', 'Dudosos', dudosos.length)}
        ${chip('#dc2626', '#fef2f2', 'No están', soloArchivo.length)}
        ${conDeuda.length ? chip('#9a3412', '#fff7ed', 'Con deuda', conDeuda.length) : ''}
      </div>

      ${resumenHTML}

      <div style="font-size:10.5px;color:#475569;text-align:center;margin:-4px 0 10px">👆 Toca una persona (con cédula) para ver su ficha</div>

      <button onclick="window.nxTssExportarExcel && window.nxTssExportarExcel()" style="width:100%;border:none;background:linear-gradient(135deg,#047857,#10b981);color:#fff;border-radius:10px;padding:11px;font-weight:700;font-size:12.5px;cursor:pointer;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:6px"><i class="ti ti-file-spreadsheet" style="color:#fff!important"></i> Descargar Excel del cuadre</button>

      ${conDeuda.length ? `<div style="background:#fff;border:1px solid #fed7aa;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fff7ed;padding:9px 12px;font-size:11px;font-weight:800;color:#9a3412;display:flex;justify-content:space-between;gap:8px"><span>💰 EN EL PDF CON DEUDA PENDIENTE (${conDeuda.length})</span><span>Total: ${fmtRD(totalDeuda)}</span></div>
        <div style="max-height:230px;overflow-y:auto">${conDeuda.map(c => `<div onclick="window.nxTssFicha('${esc(c.ced)}')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 12px;border-bottom:1px solid #f1f5f9;font-size:12px"><div style="min-width:0"><div style="font-weight:600;color:#0f172a">${esc(c.nom)}</div><div style="font-size:10px;color:#475569;font-family:var(--mono,monospace)">${esc(fmtCed(c.ced))}</div></div><div style="font-weight:800;color:#b91c1c;font-size:12px;flex-shrink:0">${fmtRD(c.deuda)}</div></div>`).join('')}</div>
      </div>` : ''}

      ${inhabEnTSS.length ? `<div style="background:#fff;border:2px solid #fecdd3;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fff1f2;padding:9px 12px;font-size:11px;font-weight:800;color:#9f1239">⛔ INHABILITADOS QUE APARECEN EN EL PDF — NO DEBERÍAN (${inhabEnTSS.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(inhabEnTSS, '#e11d48', '')}</div>
      </div>` : ''}

      ${dudosos.length ? `<div style="background:#fff;border:1px solid #fde68a;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fffbeb;padding:9px 12px;font-size:11px;font-weight:800;color:#b45309">❓ POSIBLE COINCIDENCIA — REVISAR (${dudosos.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(dudosos, '#d97706', '')}</div>
      </div>` : ''}

      <div style="background:#fff;border:1px solid #fecaca;border-radius:12px;margin-bottom:10px;overflow:hidden">
        <div style="background:#fef2f2;padding:9px 12px;font-size:11px;font-weight:800;color:#b91c1c">⚠️ EN EL PDF PERO NO EN EL SISTEMA (${soloArchivo.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(soloArchivo, '#dc2626', 'Todos los titulares están en el sistema')}</div>
      </div>

      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:#f8fafc;padding:9px 12px;font-size:11px;font-weight:800;color:#475569">📋 EN EL SISTEMA PERO NO EN EL PDF (${soloSistema.length})</div>
        <div style="max-height:200px;overflow-y:auto">${listaPersonas(soloSistema, '#475569', 'Todos tus clientes están en el PDF')}</div>
      </div>
    `);
  }
  window.nxTssComparar = comparar;

  // Crea (una vez) la vista normal del sistema para la Tabla Comparativa
  function ensureTssView() {
    var v = document.getElementById('v-tablatss');
    if (v) return v;
    var dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div');
    v.className = 'view';
    v.id = 'v-tablatss';
    dash.parentElement.appendChild(v);
    return v;
  }

  window.nxAbrirCuadreTSS = function () {
    if (!puedeVerTSS()) return;
    const view = ensureTssView();
    if (!view) return;
    _modo = 'cedula'; _rows = []; _header = []; _colCed = -1; _colNom = -1; _titulares = []; _depCount = 0;
    _acumCed = []; _acumArchivos = [];

    const ST_ = getST();
    const empresas = (Array.isArray(ST_.empresas) ? ST_.empresas : []).slice().sort((a, b) => String(a.nom).localeCompare(String(b.nom)));
    const opcEmp = '<option value="">— Elegir empresa —</option><option value="__TODAS__">★ Todas las empresas (cuadre combinado)</option>' + empresas.map(e => `<option value="${esc(e.id)}">${esc(e.nom)}</option>`).join('');

    view.innerHTML = `
      <div class="nc">
        <div class="ch">
          <div><div class="ct"><i class="ti ti-file-search"></i> Tabla Comparativa</div><div class="ct-s">Compara tus clientes con la TSS (Excel, por cédula) o Humano (PDF, por nombre)</div></div>
          <button class="btn bsm" type="button" onclick="window.nav&&window.nav('dashboard',null)"><i class="ti ti-arrow-left"></i> Volver</button>
        </div>
        <div style="max-width:640px">
          <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px">1. Empresa a comparar</label>
          <select id="nxTssEmpresa" onchange="window.nxTssComparar()" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:600;background:#fff;margin-bottom:12px">${opcEmp}</select>

          <label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px">2. Archivo (TSS o Humano)</label>
          <button type="button" id="nxTssBtnFile" onclick="document.getElementById('nxTssFile').click()" style="width:100%;border:1.5px dashed #93c5fd;background:#eff6ff;color:#2563eb;border-radius:10px;padding:14px;font-weight:700;font-size:13px;cursor:pointer"><i class="ti ti-file-spreadsheet"></i> Seleccionar archivo(s) (Excel, CSV o PDF)<div style="font-size:10px;font-weight:600;color:#475569;margin-top:3px">puedes elegir VARIOS Excel a la vez (titulares + dependientes) · el PDF de Humano va solo</div></button>
          <input type="file" id="nxTssFile" multiple accept=".xlsx,.xls,.csv,.pdf,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none">

          <div style="text-align:center;color:#475569;font-size:11px;margin:9px 0;font-weight:700">— o pega los datos —</div>
          <button type="button" onclick="window.nxTssPegarArchivo()" style="width:100%;border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:11px;font-weight:700;font-size:12.5px;cursor:pointer;margin-bottom:8px"><i class="ti ti-clipboard"></i> Pegar archivo copiado (PDF/Excel)</button>
          <textarea id="nxTssPegar" placeholder="…o pega aquí lo copiado de Excel (cédula y nombre), o una lista de cédulas o nombres" style="width:100%;min-height:64px;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;resize:vertical;font-family:inherit;box-sizing:border-box"></textarea>

          <div id="nxTssMapeo"></div>

          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:stretch;margin:12px 0">
            <select id="nxTssPeriodo" title="Período (ciclo 20 → 19)" style="flex:1 1 100%;padding:9px 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px;font-weight:600;background:#fff;color:#1e293b">${opcionesPeriodo()}</select>
            <button type="button" onclick="window.nxTssGuardarHistorial()" style="flex:1 1 120px;border:none;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border-radius:10px;padding:11px;font-weight:700;font-size:12px;cursor:pointer"><i class="ti ti-device-floppy" style="color:#fff!important"></i> Guardar cuadre</button>
            <button type="button" onclick="window.nxTssVerHistorial()" style="flex:1 1 100px;border:1.5px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:11px;font-weight:700;font-size:12px;cursor:pointer"><i class="ti ti-history"></i> Historial</button>
          </div>

          <div id="nxTssResultado"></div>
        </div>
      </div>`;
    // Mostrar como una ventana normal del sistema (no flotante)
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    var pt = document.getElementById('pttl'); if (pt) pt.textContent = 'TABLA COMPARATIVA';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    const fileInp = document.getElementById('nxTssFile');
    if (fileInp) fileInp.addEventListener('change', function () { if (this.files && this.files.length) { const ta = document.getElementById('nxTssPegar'); if (ta) ta.value = ''; if (this.files.length > 1) onVariosArchivos(this.files); else onArchivo(this.files[0]); } });
    // Arrastrar y soltar el archivo sobre el botón
    const btnFile = document.getElementById('nxTssBtnFile');
    if (btnFile) {
      ['dragenter', 'dragover'].forEach(ev => btnFile.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); btnFile.style.background = '#dbeafe'; }));
      ['dragleave', 'drop'].forEach(ev => btnFile.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); btnFile.style.background = '#eff6ff'; }));
      btnFile.addEventListener('drop', e => { const fs = e.dataTransfer?.files; if (fs && fs.length) { if (fileInp) fileInp.value = ''; const ta = document.getElementById('nxTssPegar'); if (ta) ta.value = ''; if (fs.length > 1) onVariosArchivos(fs); else onArchivo(fs[0]); } });
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

  // Botón en el dashboard (admin o rol con permiso 'tabla_comparativa')
  function inyectarBoton() {
    if (document.getElementById('qaCuadreTSS')) return true;
    if (!puedeVerTSS()) return false; // aún no logueado / sin permiso: seguir reintentando
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    const qa = vDash.querySelector('.qa');
    if (!qa || !qa.parentElement) return false;
    const btn = document.createElement('div');
    btn.className = 'qa';
    btn.id = 'qaCuadreTSS';
    btn.setAttribute('onclick', 'window.nxAbrirCuadreTSS && window.nxAbrirCuadreTSS()');
    btn.innerHTML = `<span class="qa-i"><i class="ti ti-file-search qa-ico c-rosa"></i></span><div class="qa-l">Tabla Comparativa</div>`;
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
  // Reinyectar el mosaico tras iniciar sesión (cuando ya se detecta el admin)
  window.addEventListener('nexus:reinit', function(){ try{ inyectarBoton(); }catch(e){} });
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

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO — PAGINADOR GLOBAL DE TABLAS
   Cualquier tabla con más de 15 filas muestra 15 y un botón
   "Ver más (15)" / "Ver menos". Aplica a todo el sistema.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__NX_TABLE_PAGER__) return;
  window.__NX_TABLE_PAGER__ = true;

  const PAGE = 15;

  function injectCSS() {
    if (document.getElementById('nxPager-css')) return;
    const s = document.createElement('style');
    s.id = 'nxPager-css';
    s.textContent = `
      .nxPager{ display:flex; align-items:center; justify-content:space-between; gap:10px;
        flex-wrap:wrap; padding:9px 4px 2px; font-size:11px; color:#475569; }
      .nxPager-info{ font-weight:700; }
      .nxPager-btns{ display:flex; gap:6px; }
      .nxPager-btn{ border:1px solid #e2e8f0; background:#fff; color:#334155;
        border-radius:9px; padding:7px 13px; font-size:11px; font-weight:800;
        cursor:pointer; transition:background .12s ease; }
      .nxPager-btn:hover{ background:#f1f5f9; }
      .nxPager-more{ color:#4f46e5; border-color:#c7d2fe; background:#eef2ff; }
      .nxPager-more:hover{ background:#e0e7ff; }
      @media (max-width:560px){
        .nxPager{ font-size:10px; }
        .nxPager-btn{ padding:7px 11px; }
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  function ensurePager(table) {
    const tbody = table.tBodies && table.tBodies[0];
    if (!tbody) return;
    const allRows = Array.from(tbody.rows);
    // Elegibles = filas visibles + las que ocultó el propio paginador
    // (así respetamos filtros de otros módulos que ocultan con display:none)
    const rows = allRows.filter(r => r.style.display !== 'none' || r.dataset.nxPagerHidden === '1');
    const total = rows.length;
    let footer = table.__nxPagerEl;

    if (total <= PAGE) {
      rows.forEach(r => { if (r.dataset.nxPagerHidden) { r.style.display = ''; delete r.dataset.nxPagerHidden; } });
      if (footer) { footer.remove(); table.__nxPagerEl = null; }
      table.__nxShown = 0;
      return;
    }

    let shown = (table.__nxShown && table.__nxShown >= PAGE) ? table.__nxShown : PAGE;
    if (shown > total) shown = total;
    table.__nxShown = shown;

    rows.forEach((r, i) => {
      if (i < shown) { if (r.dataset.nxPagerHidden) { r.style.display = ''; delete r.dataset.nxPagerHidden; } }
      else { r.style.display = 'none'; r.dataset.nxPagerHidden = '1'; }
    });

    if (!footer) {
      const anchor = table.closest('.nxDC-table-wrap, .nxSL-hist-table-wrap, .nxSL-table-wrap, .nx-table-wrap, .table-wrap') || table;
      const sib = anchor.nextElementSibling;
      if (sib && sib.classList && sib.classList.contains('nxPager')) {
        footer = sib; // reutilizar uno existente (evita duplicados)
      } else {
        footer = document.createElement('div');
        footer.className = 'nxPager';
        anchor.insertAdjacentElement('afterend', footer);
      }
      table.__nxPagerEl = footer;
    }

    const visibles = Math.min(shown, total);
    const restantes = total - shown;
    footer.innerHTML =
      '<span class="nxPager-info">Mostrando ' + visibles + ' de ' + total + '</span>' +
      '<span class="nxPager-btns">' +
        (restantes > 0 ? '<button type="button" class="nxPager-btn nxPager-more">Ver más (' + Math.min(PAGE, restantes) + ')</button>' : '') +
        (shown > PAGE ? '<button type="button" class="nxPager-btn nxPager-less">Ver menos</button>' : '') +
      '</span>';

    const more = footer.querySelector('.nxPager-more');
    if (more) more.addEventListener('click', function () {
      table.__nxShown = Math.min((table.__nxShown || PAGE) + PAGE, total);
      ensurePager(table);
    });
    const less = footer.querySelector('.nxPager-less');
    if (less) less.addEventListener('click', function () {
      table.__nxShown = PAGE;
      ensurePager(table);
      try { table.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
    });
  }

  const mo = new MutationObserver(function () { scheduleScan(); });

  function scan() {
    // Desconectar mientras escribimos para no auto-disparar el observer
    try { mo.disconnect(); } catch (e) {}
    try {
      document.querySelectorAll('table').forEach(function (t) {
        try { ensurePager(t); } catch (e) {}
      });
    } finally {
      try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
    }
  }

  let pending = null;
  function scheduleScan() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; scan(); }, 200);
  }

  function start() {
    injectCSS();
    scheduleScan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
  try { window.addEventListener('nexus:reinit', scheduleScan); } catch (e) {}
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO — UTILIDAD GLOBAL DE MONTOS (nxMoney)
   Teclado decimal en móvil + miles con coma automáticos mientras se
   escribe. Se aplica a cualquier <input data-nx-money>.
   Para leer el valor numérico real: window.nxMoney.parse(input.value)
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.nxMoney) return;

  // Normaliza una cadena escrita por el usuario (notación RD o US) a sus partes.
  // REGLA: el ÚLTIMO separador ('.' o ',') es DECIMAL solo si va seguido de 1 o 2
  // dígitos. En cualquier otro caso, TODOS los separadores son de miles.
  // Así "4.000" (RD) → 4000, "4.50" → 4.5, "1.234,56" → 1234.56, "40,000" → 40000.
  function _norm(raw) {
    let s = String(raw == null ? '' : raw).replace(/[^\d.,\-]/g, '');
    const neg = s.indexOf('-') !== -1;
    s = s.replace(/-/g, '');
    const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    let ent, dec = '';
    if (lastSep === -1) {
      ent = s.replace(/[.,]/g, '');
    } else {
      const after = s.slice(lastSep + 1).replace(/[.,]/g, '');
      if (after.length >= 1 && after.length <= 2) {
        ent = s.slice(0, lastSep).replace(/[.,]/g, '');
        dec = after;
      } else {
        ent = s.replace(/[.,]/g, ''); // todos los separadores son de miles
      }
    }
    ent = ent.replace(/^0+(?=\d)/, ''); // sin ceros a la izquierda
    return { neg: neg, ent: ent, dec: dec };
  }

  // "1,234.56" / "4.000" / "RD$ 1,234" → número real
  function parse(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = _norm(v);
    const num = Number((n.neg ? '-' : '') + (n.ent || '0') + (n.dec ? '.' + n.dec : ''));
    return isNaN(num) ? 0 : num;
  }

  // Formatea en vivo: miles con coma, hasta 2 decimales. Acepta '.' o ',' como
  // separador. Mientras se escribe, un separador con 3+ dígitos detrás pasa a ser
  // de miles (ej. "4.000" → "4,000"); con 1-2 dígitos es decimal ("4.50").
  function formatLive(raw) {
    let s = String(raw == null ? '' : raw).replace(/[^\d.,]/g, '');
    if (s === '') return '';
    const trailingSep = /[.,]$/.test(s); // usuario empezando los decimales
    const n = _norm(s);
    let out = n.ent ? Number(n.ent).toLocaleString('en-US') : '';
    if (n.dec !== '') {
      if (out === '') out = '0';
      out += '.' + n.dec.slice(0, 2);
    } else if (trailingSep) {
      if (out === '') out = '0';
      out += '.';
    }
    return out;
  }

  function attach(input) {
    if (!input || input.__nxMoney) return;
    input.__nxMoney = true;
    try { if (input.type !== 'text') input.type = 'text'; } catch (e) {}
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('autocomplete', 'off');
    if (input.value) input.value = formatLive(input.value);
    input.addEventListener('input', function () {
      const before = input.value;
      const after = formatLive(before);
      if (after !== before) {
        input.value = after;
        try { const L = input.value.length; input.setSelectionRange(L, L); } catch (e) {}
      }
    });
    // Reformatear valores pre-cargados (p. ej. al abrir un editar) al enfocar
    input.addEventListener('focus', function () {
      if (input.value) {
        const after = formatLive(input.value);
        if (after !== input.value) input.value = after;
      }
    });
  }

  function scan(root) {
    const r = (root && root.querySelectorAll) ? root : document;
    r.querySelectorAll('input[data-nx-money]').forEach(attach);
  }

  // Devuelve un string numérico limpio (sin separadores de miles) para guardar.
  // Entiende notación RD/US igual que parse(); conserva el vacío como vacío.
  function strip(v) {
    const s = String(v == null ? '' : v).trim();
    if (s === '') return '';
    const n = _norm(s);
    return (n.neg ? '-' : '') + (n.ent || '0') + (n.dec ? '.' + n.dec : '');
  }

  window.nxMoney = { parse: parse, format: formatLive, attach: attach, scan: scan, strip: strip };

  let pending = null;
  function schedule() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; scan(document); }, 150);
  }
  try { new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
  try { window.addEventListener('nexus:reinit', schedule); } catch (e) {}
})();

/* ── Onda de color (ripple) al tocar en todo el sistema ─────────────────── */
(function(){
  if (window.__NX_RIPPLE__) return;
  window.__NX_RIPPLE__ = true;
  // OJO: NO incluir '.btn'. En iOS, animar transform:scale en la onda (hija) dentro
  // de un botón con overflow:hidden + border-radius lo promueve a capa y lo "infla"
  // dejándolo bloqueado (no acciona). Los botones ya tienen :active{opacity} estable.
  var SEL = '.cfg-tab, .kpi, #v-dashboard .qa';
  function spawn(e){
    var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!el) return;
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; // no admiten hijos
    if (el.disabled) return;
    var rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var size = Math.max(rect.width, rect.height) * 1.25;
    var x = (e.clientX != null ? e.clientX : rect.left + rect.width / 2) - rect.left;
    var y = (e.clientY != null ? e.clientY : rect.top + rect.height / 2) - rect.top;
    var r = document.createElement('span');
    r.className = 'nx-ripple';
    r.style.width = r.style.height = size + 'px';
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    try { el.appendChild(r); } catch (_) { return; }
    setTimeout(function(){ if (r && r.parentNode) r.parentNode.removeChild(r); }, 650);
  }
  document.addEventListener('pointerdown', spawn, { passive: true });
})();

/* ── Inicio: la esfera gira en 3D y suelta un poco de humo al presionar ───── */
(function(){
  if (window.__NX_ORB_FX__) return;
  window.__NX_ORB_FX__ = true;
  // Toma el color del icono (primer color del degradado de fondo)
  function rgbParts(c){ var m = (c||'').match(/(\d+(?:\.\d+)?)/g); return m && m.length>=3 ? m : null; }
  function iconColor(ico){
    try{
      var bg = getComputedStyle(ico).backgroundImage || '';
      var m = bg.match(/rgba?\([^)]+\)/);
      if (m) { var p = rgbParts(m[0]); if (p) return p; }
      var bc = getComputedStyle(ico).backgroundColor;
      var p2 = rgbParts(bc);
      if (p2 && bc !== 'rgba(0, 0, 0, 0)') return p2;
    }catch(_){}
    return ['148','163','184'];
  }
  // Selector amplio para el jelly suave (resto del sistema)
  // OJO: sin botones. En iOS, animar transform:scale sobre un <button> dentro de
  // un contenedor con backdrop-filter (modales) lo "infla" enormemente al tocarlo.
  // Los botones conservan su :active y la onda (ripple), que son estables.
  var JELLY_SEL = '.kpi, .ni, .sb-u, .err-badge';
  function reTrigger(el, cls){
    el.classList.remove(cls);
    void el.offsetWidth; // reflow para reiniciar la animación
    el.classList.add(cls);
    var done = function(){ el.classList.remove(cls); el.removeEventListener('animationend', done); };
    el.addEventListener('animationend', done);
  }
  function press(e){
    var t = e.target;
    if (!t || !t.closest) return;
    var qa = t.closest('#v-dashboard .qa');
    // logo del encabezado + logo del login + botones cristalinos de la barra superior
    var solid = qa ? null : t.closest('.sb-mk, .lmk, .tn-tog, #btnRefrescar, .notif-bell');
    if (!qa && !solid){
      // Resto del sistema: jelly suave (sin humo)
      var jel = t.closest(JELLY_SEL);
      if (!jel) return;
      var jt = jel.tagName;
      if (jt === 'INPUT' || jt === 'TEXTAREA' || jt === 'SELECT' || jt === 'BUTTON' || jel.disabled) return;
      reTrigger(jel, 'nx-jelly');
      return;
    }
    // Elemento que rebota y de dónde sale el humo / color
    var ico = qa ? qa.querySelector('i.qa-ico') : solid;
    var host = qa ? (qa.querySelector('.qa-i') || ico && ico.parentNode) : solid;
    var rgb = ico ? iconColor(ico) : ['148','163','184'];
    var base = rgb[0]+','+rgb[1]+','+rgb[2];
    // Rebote (re-disparable en cada toque)
    if (ico){
      reTrigger(ico, 'nx-spin');
    }
    // Humo (varias volutas que suben y se desvanecen)
    if (host){
      for (var i=0;i<6;i++){
        (function(n){
          var p = document.createElement('span');
          p.className = 'nx-smoke';
          p.style.background = 'radial-gradient(circle, rgba('+base+',.95), rgba('+base+',0) 70%)';
          p.style.setProperty('--dx', (Math.random()*38 - 19).toFixed(0) + 'px');
          p.style.left = (38 + Math.random()*24) + '%';
          p.style.animationDelay = (n*40) + 'ms';
          try { host.appendChild(p); } catch(_){ return; }
          setTimeout(function(){ if (p.parentNode) p.parentNode.removeChild(p); }, 900 + n*40);
        })(i);
      }
    }
  }
  document.addEventListener('pointerdown', press, { passive: true });
})();

/* ── Iconos multicolor: a cada icono "suelto" su color estable + sombra 3D ── */
(function(){
  if (window.__NX_ICON_COLOR__) return;
  window.__NX_ICON_COLOR__ = true;
  // Contextos donde el icono NO debe ser badge (debe quedar plano)
  var SKIP_CTX = '.btn,button,td,th,label,summary,.cfg-tab,.qa,.ni,.kpi,' +
                 '.nxDC-bank-badge,.sb-mk,.lmk,.smk,.nxs-badge,.nxl-logo,.sb-av,.nx-fab';
  function hue(name){
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  function colorize(root){
    var list = (root || document).querySelectorAll('i.ti:not([data-nxc])');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      el.setAttribute('data-nxc', '1'); // marcar para no reprocesar
      var m = (el.className || '').match(/ti-[a-z0-9]+(?:-[a-z0-9]+)*/);
      if (!m) continue;
      var name = m[0];
      // iconos que deben quedar planos (flechas, chevrons, x, etc.)
      // la lupa de búsqueda queda plana (sin círculo de color)
      if (name === 'ti-search' || name === 'ti-search-off') continue;
      // iconos decorativos posicionados (adornos de inputs) → no colorear
      if (/absolute/.test(el.getAttribute('style') || '')) continue;
      // dentro de un contexto excluido → plano
      try { if (el.closest(SKIP_CTX)) continue; } catch (e) {}
      var hu = hue(name);
      el.style.setProperty('background', 'linear-gradient(145deg,hsl(' + hu + ',70%,48%),hsl(' + ((hu + 22) % 360) + ',75%,60%))', 'important');
      el.style.setProperty('box-shadow', '0 4px 10px hsla(' + hu + ',70%,45%,.34), inset 0 2.5px 3px rgba(255,255,255,.72), inset 0 -3px 6px hsla(' + hu + ',70%,28%,.32)', 'important');
    }
  }
  var pend = null;
  function sched(){ if (pend) return; pend = setTimeout(function(){ pend = null; colorize(document); }, 200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sched, { once: true });
  else sched();
  try { new MutationObserver(sched).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  try { window.addEventListener('nexus:reinit', sched); } catch (e) {}
})();

/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - MÓDULO DE PRÉSTAMOS (SOLO ADMIN)
   ────────────────────────────────────────────────────────────────
   Préstamos a personas que NO son clientes del seguro. Monto fijo a
   devolver (lo define el admin). Soporta abonos libres y cuotas fijas.
   Tablas: prestamos, prestamo_pagos (RLS: solo admin via mi_rol()).
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__NX_PRESTAMOS__) return;
  window.__NX_PRESTAMOS__ = true;

  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esAdmin() { try { return (typeof sesion !== 'undefined') && sesion && sesion.rol === 'admin'; } catch (e) { try { return window.sesion && window.sesion.rol === 'admin'; } catch (_) { return false; } } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function fmt(n) { return 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function toast(t, m, s) { try { if (window.toast) window.toast(t, m, s); } catch (e) {} }
  function cerrarModal(id) { const o = document.getElementById(id); if (o) o.remove(); }
  function parseMoney(v) { try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(v)) || 0; } catch (e) {} return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
  function nomAdmin() { try { return (window.sesion && window.sesion.nom) || 'Admin'; } catch (e) { return 'Admin'; } }

  let _prestamos = [];
  let _pagosByPrestamo = {};
  let _prCfg = {};
  let _modoForm = 'libre';
  let _prFiltro = 'todos';
  let _tipoPago = 'capital'; // para línea de crédito: 'capital' o 'interes'
  window.nxPrTipoPago = function (t) {
    _tipoPago = t;
    const bc = document.getElementById('prTipoCap'), bi = document.getElementById('prTipoInt');
    if (bc) bc.className = t === 'capital' ? 'btn bc1' : 'btn';
    if (bi) bi.className = t === 'interes' ? 'btn bc1' : 'btn';
  };

  function addMonths(dateStr, m) { const d = new Date(String(dateStr).slice(0, 10) + 'T12:00:00'); d.setMonth(d.getMonth() + m); return d; }
  function mesesCompletos(fecha, hasta) {
    const start = new Date(String(fecha).slice(0, 10) + 'T12:00:00'), end = new Date(String(hasta).slice(0, 10) + 'T12:00:00');
    let k = 0; while (k < 600) { const next = addMonths(fecha, k + 1); if (next <= end) k++; else break; } return k;
  }
  // Cálculo de una LÍNEA DE CRÉDITO: interés por mes completo sobre el capital pendiente,
  // pagos separados en 'capital' (bajan la deuda) e 'interes' (ganancia).
  function creditoCalc(pr) {
    const cap = Number(pr.capital || 0), tasa = Number(pr.tasa_interes || 0) / 100;
    const pagos = _pagosByPrestamo[pr.id] || [];
    const capPagos = pagos.filter(p => p.tipo === 'capital').sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const pagCap = capPagos.reduce((s, p) => s + Number(p.monto || 0), 0);
    const pagInt = pagos.filter(p => p.tipo === 'interes').reduce((s, p) => s + Number(p.monto || 0), 0);
    const capPend = Math.max(0, cap - pagCap);
    const M = mesesCompletos(pr.fecha_prestamo, hoy());
    let interesAcum = 0; const meses = [];
    for (let k = 1; k <= M + 1; k++) { // M completos + 1 en curso (referencial)
      const mStart = addMonths(pr.fecha_prestamo, k - 1);
      let pagAntes = 0; capPagos.forEach(p => { const pf = new Date(String(p.fecha).slice(0, 10) + 'T12:00:00'); if (pf < mStart) pagAntes += Number(p.monto || 0); });
      const saldoK = Math.max(0, cap - pagAntes);
      const intK = Math.round(saldoK * tasa);
      if (k <= M) interesAcum += intK;
      meses.push({ n: k, fecha: mStart.toISOString().slice(0, 10), saldo: saldoK, interes: intK, encurso: k > M });
    }
    const interesPend = Math.max(0, interesAcum - pagInt);
    const totalDebe = capPend + interesPend;
    const fechaLimite = pr.plazo_meses ? addMonths(pr.fecha_prestamo, pr.plazo_meses).toISOString().slice(0, 10) : null;
    const diasRestan = fechaLimite ? Math.ceil((new Date(fechaLimite + 'T12:00:00') - new Date(hoy() + 'T12:00:00')) / 86400000) : null;
    return { cap, capPend, pagCap, pagInt, interesAcum, interesPend, totalDebe, interesMes: Math.round(capPend * tasa), M, meses, fechaLimite, diasRestan, tasa: Number(pr.tasa_interes || 0) };
  }

  function pagadoDe(pr) { if (pr.modo === 'credito') { const c = creditoCalc(pr); return c.pagCap + c.pagInt; } return (_pagosByPrestamo[pr.id] || []).reduce((s, p) => s + Number(p.monto || 0), 0); }
  function saldoDe(pr) { if (pr.modo === 'credito') return creditoCalc(pr).totalDebe; return Math.max(0, Number(pr.total_devolver || 0) - pagadoDe(pr)); }
  function estadoDe(pr) { if (pr.modo === 'credito') { const c = creditoCalc(pr); return (c.capPend <= 0 && c.interesPend <= 0) ? 'pagado' : 'activo'; } return saldoDe(pr) <= 0 ? 'pagado' : 'activo'; }
  function soloDig(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function waNumero(tel) { let d = soloDig(tel); if (d.length === 10) d = '1' + d; return d.length >= 11 ? d : ''; }
  function fechaUltCuota(pr) { return pr.num_cuotas > 0 ? fechaCuota(pr.fecha_prestamo, pr.frecuencia, pr.num_cuotas) : ''; }
  function esVencido(pr) {
    if (estadoDe(pr) === 'pagado') return false;
    if (pr.modo === 'credito') { const c = creditoCalc(pr); return c.diasRestan != null && c.diasRestan < 0; }
    if (pr.modo === 'cuotas' && pr.num_cuotas > 0) { return fechaUltCuota(pr) < hoy() && saldoDe(pr) > 0; }
    return false; // abonos libres: sin fecha límite
  }
  function interesCobradoDe(pr) {
    if (pr.modo === 'credito') return creditoCalc(pr).pagInt;
    const it = Math.max(0, Number(pr.total_devolver || 0) - Number(pr.capital || 0)), tot = Number(pr.total_devolver || 0), pg = pagadoDe(pr);
    return tot > 0 ? Math.round(it * Math.min(1, pg / tot)) : 0;
  }

  function fechaCuota(base, frec, n) {
    try {
      const d = new Date(String(base).slice(0, 10) + 'T12:00:00');
      if (frec === 'semanal') d.setDate(d.getDate() + 7 * n);
      else if (frec === 'quincenal') d.setDate(d.getDate() + 15 * n);
      else d.setMonth(d.getMonth() + n);
      return d.toISOString().slice(0, 10);
    } catch (e) { return ''; }
  }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function parsePct(v) { return Number(String(v == null ? '' : v).replace(',', '.').replace(/[^0-9.]/g, '')) || 0; }

  // Convierte la tasa MENSUAL a tasa por cuota según la frecuencia, proporcional
  // a los días del período (mes = 30 días): semanal = 7/30, quincenal = 15/30, mensual = 1.
  function tasaPorCuota(tasaMensualPct, frec) {
    const f = frec === 'semanal' ? (7 / 30) : frec === 'quincenal' ? (15 / 30) : 1;
    return (Number(tasaMensualPct) || 0) * f;
  }
  // Amortización método de cuota fija (francés). tasa = % MENSUAL.
  // Trabaja en pesos enteros para que la suma de las cuotas cuadre EXACTO con el total.
  function amortizar(capital, tasaPct, n, base, frec) {
    capital = Math.round(Number(capital || 0)); n = parseInt(n, 10) || 0;
    const i = tasaPorCuota(tasaPct, frec) / 100;
    const rows = []; let saldo = capital;
    if (n <= 0 || capital <= 0) return { cuota: 0, total: 0, interesTotal: 0, rows: [] };
    const cuota = i > 0 ? Math.round(capital * i / (1 - Math.pow(1 + i, -n))) : Math.round(capital / n);
    for (let k = 1; k <= n; k++) {
      const interes = Math.round(saldo * i);
      let capPart, cuotaK;
      if (k === n) { capPart = saldo; cuotaK = saldo + interes; } // última cuota salda el resto
      else { capPart = Math.min(saldo, cuota - interes); cuotaK = capPart + interes; }
      saldo = Math.max(0, saldo - capPart);
      rows.push({ n: k, fecha: fechaCuota(base, frec, k), cuota: cuotaK, interes: interes, capital: capPart, saldo: saldo });
    }
    const total = rows.reduce((s, r) => s + r.cuota, 0);
    return { cuota: cuota, total: total, interesTotal: total - capital, rows: rows };
  }

  async function cargarPrestamos() {
    _prestamos = await getAPI().get('prestamos', 'select=*&order=created_at.desc') || [];
    const pagos = await getAPI().get('prestamo_pagos', 'select=*&order=fecha.asc') || [];
    _pagosByPrestamo = {};
    pagos.forEach(p => { (_pagosByPrestamo[p.prestamo_id] = _pagosByPrestamo[p.prestamo_id] || []).push(p); });
    try { const cfg = await getAPI().get('prestamos_config', 'select=*&id=eq.1'); _prCfg = (cfg && cfg[0]) || {}; } catch (e) { _prCfg = {}; }
  }

  function kpi(lbl, val, col) {
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px;text-align:center"><div style="font-size:9px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px">${lbl}</div><div style="font-size:15px;font-weight:900;color:${col};margin-top:2px">${val}</div></div>`;
  }

  function cardHTML(p) {
    const est = estadoDe(p), venc = esVencido(p);
    const badge = est === 'pagado'
      ? '<span style="background:#dcfce7;color:#16a34a;font-weight:800;font-size:9px;padding:3px 8px;border-radius:999px">PAGADO</span>'
      : venc
        ? '<span style="background:#fee2e2;color:#dc2626;font-weight:800;font-size:9px;padding:3px 8px;border-radius:999px">VENCIDO</span>'
        : '<span style="background:#fef9c3;color:#a16207;font-weight:800;font-size:9px;padding:3px 8px;border-radius:999px">ACTIVO</span>';
    const sub = p.modo === 'credito'
      ? ('línea de crédito' + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '%/mes' : ''))
      : (p.modo === 'cuotas')
        ? ((p.num_cuotas || 0) + ' cuotas ' + (p.frecuencia || '') + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '%/mes' : ''))
        : ('abonos libres' + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '% interés' : ''));
    const head = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <div style="min-width:0"><div style="font-weight:800;color:#0f172a;font-size:13px">${esc(p.nombre || 'Sin nombre')}</div>
        <div style="font-size:10px;color:#475569">${esc(p.cedula || '')}${p.telefono ? ' · ' + esc(p.telefono) : ''} · ${esc(sub)}</div></div>
        <div style="flex-shrink:0">${badge}</div>
      </div>`;
    let cuerpo;
    if (p.modo === 'credito') {
      const c = creditoCalc(p);
      const venc = c.diasRestan != null && c.diasRestan < 0 && est !== 'pagado';
      const pctCap = c.cap > 0 ? Math.round(c.pagCap / c.cap * 100) : 0;
      cuerpo = `<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:8px;color:#475569"><span>Prestó: <b style="color:#0f172a">${fmt(p.capital)}</b></span><span>Capital pend.: <b style="color:#0f172a">${fmt(c.capPend)}</b></span></div>
      <div style="height:7px;background:#f1f5f9;border-radius:6px;overflow:hidden;margin-top:7px"><div style="height:100%;width:${Math.min(100, pctCap)}%;background:${est === 'pagado' ? '#10b981' : '#2563eb'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:5px"><span style="color:#ea580c;font-weight:700">Interés pend.: ${fmt(c.interesPend)}</span><span style="color:#dc2626;font-weight:800">Debe: ${fmt(c.totalDebe)}</span></div>
      ${c.fechaLimite ? `<div style="font-size:10px;margin-top:4px;color:${venc ? '#dc2626' : '#475569'};font-weight:${venc ? '800' : '400'}">${venc ? '⚠️ Vencido el ' + c.fechaLimite : '📅 Límite: ' + c.fechaLimite + (c.diasRestan != null ? ' (' + c.diasRestan + ' días)' : '')}</div>` : ''}`;
    } else {
      const pag = pagadoDe(p), saldo = saldoDe(p);
      const pct = p.total_devolver > 0 ? Math.round(pag / p.total_devolver * 100) : 0;
      cuerpo = `<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:8px;color:#475569"><span>Prestó: <b style="color:#0f172a">${fmt(p.capital)}</b></span><span>A devolver: <b style="color:#0f172a">${fmt(p.total_devolver)}</b></span></div>
      <div style="height:7px;background:#f1f5f9;border-radius:6px;overflow:hidden;margin-top:7px"><div style="height:100%;width:${Math.min(100, pct)}%;background:${est === 'pagado' ? '#10b981' : '#f59e0b'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:5px"><span style="color:#059669;font-weight:700">Pagó: ${fmt(pag)}</span><span style="color:#dc2626;font-weight:800">Saldo: ${fmt(saldo)}</span></div>`;
    }
    return `<div class="nxPrCard" data-busca="${esc((p.nombre || '').toLowerCase() + ' ' + (p.cedula || ''))}" onclick="window.nxPrestamoVer('${p.id}')" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:9px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.04)">${head}${cuerpo}</div>`;
  }

  function renderLista(view) {
    const totalCap = _prestamos.reduce((s, p) => s + Number(p.capital || 0), 0);
    const totalPag = _prestamos.reduce((s, p) => s + pagadoDe(p), 0);
    const totalSaldo = _prestamos.reduce((s, p) => s + saldoDe(p), 0);
    const totalIntCob = _prestamos.reduce((s, p) => s + interesCobradoDe(p), 0);
    const totalVencido = _prestamos.filter(esVencido).reduce((s, p) => s + saldoDe(p), 0);
    // aplicar filtro
    const f = _prFiltro;
    const lista = _prestamos.filter(p => {
      if (f === 'activos') return estadoDe(p) !== 'pagado';
      if (f === 'pagados') return estadoDe(p) === 'pagado';
      if (f === 'vencidos') return esVencido(p);
      if (f === 'credito' || f === 'cuotas' || f === 'libre') return (p.modo || 'libre') === f;
      return true;
    });
    const chip = (key, lbl) => `<button type="button" class="btn bsm${_prFiltro === key ? ' bc1' : ''}" onclick="window.nxPrestamoFiltroTipo('${key}')" style="font-size:10px;padding:5px 10px">${lbl}</button>`;
    const cards = _prestamos.length === 0
      ? '<div style="text-align:center;padding:36px;color:#475569;font-size:13px">Aún no hay préstamos.<br>Toca <b>"Nuevo préstamo"</b> para empezar.</div>'
      : (lista.length === 0 ? '<div style="text-align:center;padding:30px;color:#475569;font-size:12px">Ningún préstamo en este filtro.</div>' : lista.map(cardHTML).join(''));
    view.innerHTML = `
      <div class="nc">
        <div class="ch">
          <div><div class="ct"><i class="ti ti-cash"></i> Financiamiento</div><div class="ct-s">Multiempresa · solo el administrador</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn bsm" type="button" onclick="window.nxAbrirMultiempresa()"><i class="ti ti-arrow-left"></i> Volver</button>
            <button class="btn bsm" type="button" onclick="window.nxPrestamoConfig()" title="Datos para el contrato"><i class="ti ti-settings"></i> Config</button>
            <button class="btn bsm bc4" type="button" onclick="window.nxPrestamoExportar()"><i class="ti ti-file-spreadsheet"></i> Excel</button>
            <button class="btn bsm bc1" type="button" onclick="window.nxPrestamoNuevo()"><i class="ti ti-plus"></i> Nuevo</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin-bottom:10px">
          ${kpi('Prestado', fmt(totalCap), '#2563eb')}
          ${kpi('Por cobrar', fmt(totalSaldo), '#dc2626')}
          ${kpi('Cobrado', fmt(totalPag), '#059669')}
          ${kpi('Interés cobrado', fmt(totalIntCob), '#9a3412')}
          ${kpi('Vencido', fmt(totalVencido), totalVencido > 0 ? '#dc2626' : '#16a34a')}
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">
          ${chip('todos', 'Todos')}${chip('activos', 'Activos')}${chip('vencidos', 'Vencidos')}${chip('pagados', 'Pagados')}${chip('cuotas', 'Cuotas')}${chip('libre', 'Libres')}${chip('credito', 'Crédito')}
        </div>
        <div style="position:relative;margin-bottom:10px">
          <i class="ti ti-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#475569;font-size:15px;pointer-events:none"></i>
          <input type="text" id="nxPrBuscar" placeholder="Buscar por nombre o cédula..." autocomplete="off" oninput="window.nxPrestamoFiltrar(this.value)" style="width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b">
        </div>
        <div id="nxPrLista">${cards}</div>
      </div>`;
  }

  window.nxPrestamoFiltrar = function (q) {
    const t = String(q || '').trim().toLowerCase();
    document.querySelectorAll('#nxPrLista .nxPrCard').forEach(c => {
      const b = c.getAttribute('data-busca') || '';
      c.style.display = (!t || b.includes(t)) ? '' : 'none';
    });
  };

  function ensureView() {
    let v = document.getElementById('v-prestamos');
    if (v) return v;
    const dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-prestamos';
    dash.parentElement.appendChild(v);
    return v;
  }

  // ── Hub MULTIEMPRESA: contenedor de módulos (Financiamiento, y futuros) ──
  function ensureHubView() {
    let v = document.getElementById('v-multiempresa');
    if (v) return v;
    const dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-multiempresa';
    dash.parentElement.appendChild(v);
    return v;
  }

  // Registro compartido de módulos de Multiempresa (cada módulo se inscribe aquí)
  window.nxMEReg = window.nxMEReg || [];
  window.nxMERegistrar = function (m) {
    if (!m || !m.nombre) return;
    if (!window.nxMEReg.some(x => x.nombre === m.nombre)) window.nxMEReg.push(m);
    window.nxMEReg.sort((a, b) => (a.orden || 99) - (b.orden || 99));
  };
  window.nxMERegistrar({ orden: 1, nombre: 'Financiamiento', desc: 'Préstamos, cuotas y líneas de crédito', icon: 'ti-cash', color: '#059669', bg: '#ecfdf5', onclick: 'window.nxAbrirPrestamos()' });

  function renderHub(view) {
    const mods = (window.nxMEReg && window.nxMEReg.length) ? window.nxMEReg : [
      { nombre: 'Financiamiento', desc: 'Préstamos, cuotas y líneas de crédito', icon: 'ti-cash', color: '#059669', bg: '#ecfdf5', onclick: 'window.nxAbrirPrestamos()' }
    ];
    const cards = mods.map(m => `
      <button type="button" class="nxMeCard" onclick="${m.onclick}">
        <span class="nxMeIco" style="background:${m.bg};color:${m.color}"><i class="ti ${m.icon}"></i></span>
        <span class="nxMeTxt"><span class="nxMeNom">${esc(m.nombre)}</span><span class="nxMeDesc">${esc(m.desc)}</span></span>
        <i class="ti ti-chevron-right nxMeArr"></i>
      </button>`).join('');
    view.innerHTML = `
      <div class="nc">
        <div class="ch">
          <div><div class="ct"><i class="ti ti-building-skyscraper"></i> Multiempresa</div><div class="ct-s">Solo visible para el administrador</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn bsm" type="button" onclick="window.nav&&window.nav('dashboard',null)"><i class="ti ti-arrow-left"></i> Volver</button>
          </div>
        </div>
        <div style="font-size:12px;color:#475569;margin-bottom:12px">Elige una empresa o módulo.</div>
        <div class="nxMeGrid">${cards}</div>
      </div>`;
  }

  window.nxAbrirMultiempresa = function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    // Modo TIENDA: el hub Multiempresa no aplica; rebota al Punto de Venta.
    try { if (window.sesion && window.sesion.org && window.sesion.org.tipo === 'tienda') { if (window.nxAbrirPOS) window.nxAbrirPOS(); return; } } catch (e) {}
    const view = ensureHubView();
    if (!view) return;
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const pt = document.getElementById('pttl'); if (pt) pt.textContent = 'MULTIEMPRESA';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    renderHub(view);
  };

  window.nxAbrirPrestamos = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    const view = ensureView();
    if (!view) return;
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const pt = document.getElementById('pttl'); if (pt) pt.textContent = 'FINANCIAMIENTO';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:8px;font-weight:600">Cargando financiamiento...</div></div></div>';
    try { await cargarPrestamos(); renderLista(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudieron cargar los préstamos.<br><span style="font-size:11px;color:#475569">' + esc(String(e && e.message || e)) + '</span></div></div>'; }
  };

  // ── Formulario nuevo/editar ──
  window.nxPrestamoNuevo = function () { abrirForm(null); };
  window.nxPrestamoEditar = function (id) { const p = _prestamos.find(x => String(x.id) === String(id)); if (p) abrirForm(p); };
  window.nxPrModo = function (m) { _modoForm = m; pintarModo(); };

  function pintarModo() {
    const bl = document.getElementById('prModoLibre'), bc = document.getElementById('prModoCuotas'), bcr = document.getElementById('prModoCredito');
    if (bl) bl.className = _modoForm === 'libre' ? 'btn bc1' : 'btn';
    if (bc) bc.className = _modoForm === 'cuotas' ? 'btn bc1' : 'btn';
    if (bcr) bcr.className = _modoForm === 'credito' ? 'btn bc1' : 'btn';
    const box = document.getElementById('prCuotasBox'), cbox = document.getElementById('prCreditoBox');
    if (box) box.style.display = _modoForm === 'cuotas' ? 'block' : 'none';
    if (cbox) cbox.style.display = _modoForm === 'credito' ? 'block' : 'none';
    const hint = document.getElementById('prTasaHint');
    if (hint) hint.textContent = _modoForm === 'cuotas' ? '· mensual' : _modoForm === 'credito' ? '· mensual sobre el saldo' : '· una vez, sobre el capital';
    window.nxPrRecalc();
  }

  // Calcula el total a devolver según el modo y la tasa.
  // cuotas + tasa>0 -> amortización (tasa mensual). libre + tasa>0 -> interés fijo (capital × tasa%).
  function calcPrestamo() {
    const cap = parseMoney(val('prCap')), n = parseInt(val('prNumCuotas'), 10) || 0, tasa = parsePct(val('prTasa')), frec = val('prFrec') || 'mensual';
    if (_modoForm === 'cuotas' && tasa > 0 && cap > 0 && n > 0) {
      const a = amortizar(cap, tasa, n, val('prFecha') || hoy(), frec);
      return { computa: true, modo: 'cuotas', cap, tasa, n, frec, total: Math.round(a.total), interes: a.interesTotal, cuota: a.cuota };
    }
    if (_modoForm === 'libre' && tasa > 0 && cap > 0) {
      const total = Math.round(cap * (1 + tasa / 100));
      return { computa: true, modo: 'libre', cap, tasa, total, interes: total - cap };
    }
    return { computa: false, modo: _modoForm, cap, tasa, n, frec };
  }
  window.nxPrRecalc = function () {
    const preview = document.getElementById('prPreview');
    const totRow = document.getElementById('prTotRow');
    if (_modoForm === 'credito') {
      if (totRow) totRow.style.display = 'none';
      if (preview) {
        const cap = parseMoney(val('prCap')), tasa = parsePct(val('prTasa')), plazo = parseInt(val('prPlazo'), 10) || 0;
        if (cap > 0 && tasa > 0) {
          const intMes = Math.round(cap * tasa / 100);
          const lim = plazo > 0 ? addMonths(val('prFecha') || hoy(), plazo).toISOString().slice(0, 10) : '—';
          preview.style.display = 'block';
          preview.innerHTML = `<b>Interés del 1er mes:</b> ${fmt(intMes)} (${tasa}% de ${fmt(cap)})<br><b>Fecha límite del capital:</b> ${lim}<br><span style="font-size:10.5px;color:#475569">Cada mes el interés se calcula sobre lo que falte de capital. Abonar al capital baja el interés.</span>`;
        } else { preview.style.display = 'none'; }
      }
      return;
    }
    const c = calcPrestamo();
    if (totRow) totRow.style.display = c.computa ? 'none' : '';
    if (!preview) return;
    if (c.computa && c.modo === 'cuotas') {
      const ic = tasaPorCuota(c.tasa, c.frec);
      const nota = c.frec !== 'mensual' ? `<br><span style="font-size:10.5px;color:#475569">${c.tasa}% mensual = ${(Math.round(ic * 100) / 100)}% por ${c.frec === 'semanal' ? 'semana' : 'quincena'}</span>` : '';
      preview.style.display = 'block';
      preview.innerHTML = `<b>Cuota:</b> ${fmt(c.cuota)} (${c.n} ${c.frec})<br><b>Total a devolver:</b> ${fmt(c.total)} · <b>Interés:</b> ${fmt(c.interes)}${nota}`;
    } else if (c.computa && c.modo === 'libre') {
      preview.style.display = 'block';
      preview.innerHTML = `<b>Total a devolver:</b> ${fmt(c.total)} · <b>Interés:</b> ${fmt(c.interes)} (${c.tasa}% una vez)<br><span style="font-size:10.5px;color:#475569">Se paga en abonos libres</span>`;
    } else {
      preview.style.display = 'none';
    }
  };

  function abrirForm(pr) {
    cerrarModal('nxPrModal');
    _modoForm = (pr && pr.modo) || 'libre';
    const p = pr || {};
    const ov = document.createElement('div'); ov.id = 'nxPrModal'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px">
        <div class="mt"><span><i class="ti ti-cash"></i> ${pr ? 'Editar préstamo' : 'Nuevo préstamo'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrModal').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr"><label>Nombre del prestatario</label><input id="prNom" class="no-upper" value="${esc(p.nombre || '')}" placeholder="Nombre completo"></div>
        <div class="fr-row">
          <div class="fr"><label>Cédula</label><input id="prCed" class="no-upper" value="${esc(p.cedula || '')}" placeholder="000-0000000-0"></div>
          <div class="fr"><label>Teléfono</label><input id="prTel" class="no-upper" value="${esc(p.telefono || '')}" placeholder="809-000-0000"></div>
        </div>
        <div class="fr-row">
          <div class="fr"><label>Capital prestado</label><input id="prCap" data-nx-money inputmode="numeric" oninput="window.nxPrRecalc()" value="${p.capital ? Number(p.capital).toLocaleString('en-US') : ''}" placeholder="0"></div>
          <div class="fr"><label>Fecha del préstamo</label><input id="prFecha" type="date" onchange="window.nxPrRecalc()" value="${p.fecha_prestamo || hoy()}"></div>
        </div>
        <div class="fr"><label>Tipo de préstamo</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" id="prModoLibre" class="btn" onclick="window.nxPrModo('libre')" style="flex:1 1 88px">Abonos libres</button>
            <button type="button" id="prModoCuotas" class="btn" onclick="window.nxPrModo('cuotas')" style="flex:1 1 88px">Cuotas fijas</button>
            <button type="button" id="prModoCredito" class="btn" onclick="window.nxPrModo('credito')" style="flex:1 1 88px">Línea de crédito</button>
          </div>
        </div>
        <div class="fr"><label>Tasa de interés (%) <span id="prTasaHint" style="font-weight:400;color:#475569;font-size:10px"></span></label><input id="prTasa" inputmode="decimal" oninput="window.nxPrRecalc()" value="${Number(p.tasa_interes || 0) > 0 ? p.tasa_interes : ''}" placeholder="0 = sin interés (ej: 10)"></div>
        <div id="prCuotasBox" style="display:none">
          <div class="fr-row">
            <div class="fr"><label># de cuotas</label><input id="prNumCuotas" type="number" min="1" oninput="window.nxPrRecalc()" value="${p.num_cuotas || ''}" placeholder="4"></div>
            <div class="fr"><label>Frecuencia</label><select id="prFrec" onchange="window.nxPrRecalc()"><option value="semanal">Semanal</option><option value="quincenal">Quincenal</option><option value="mensual">Mensual</option></select></div>
          </div>
        </div>
        <div id="prCreditoBox" style="display:none">
          <div class="fr"><label>Plazo (meses) <span style="font-weight:400;color:#475569;font-size:10px">· fecha límite para devolver el capital</span></label><input id="prPlazo" type="number" min="1" oninput="window.nxPrRecalc()" value="${p.plazo_meses || ''}" placeholder="6"></div>
        </div>
        <div id="prPreview" style="display:none;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:9px 11px;font-size:12px;color:#1e40af;margin-bottom:10px;line-height:1.5"></div>
        <div class="fr" id="prTotRow"><label>Total a devolver</label><input id="prTot" data-nx-money inputmode="numeric" oninput="window.nxPrRecalc()" value="${p.total_devolver ? Number(p.total_devolver).toLocaleString('en-US') : ''}" placeholder="0"></div>
        <div class="fr"><label>Notas (opcional)</label><textarea id="prNotas" rows="2" class="no-upper">${esc(p.notas || '')}</textarea></div>
        <button class="btn bc1" type="button" style="width:100%" onclick="window.nxPrestamoGuardar('${pr ? pr.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button>
      </div>`;
    document.body.appendChild(ov);
    pintarModo();
    if (p.frecuencia) { const s = document.getElementById('prFrec'); if (s) s.value = p.frecuencia; }
    try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(ov); } catch (e) {}
  }

  window.nxPrestamoGuardar = async function (id) {
    const nom = (val('prNom') || '').trim();
    if (!nom) { toast('err', 'Falta el nombre'); return; }
    const modo = _modoForm || 'libre';
    const fecha = val('prFecha') || hoy();
    const capital = parseMoney(val('prCap'));
    let total, tasaStore, plazoStore = null;
    if (modo === 'credito') {
      const tasa = parsePct(val('prTasa')), plazo = parseInt(val('prPlazo'), 10) || 0;
      if (capital <= 0) { toast('err', 'Pon el capital prestado'); return; }
      if (tasa <= 0) { toast('err', 'Pon la tasa de interés mensual'); return; }
      total = capital; tasaStore = tasa; plazoStore = plazo || null;
    } else {
      const c = calcPrestamo();
      if (c.computa) { total = c.total; tasaStore = c.tasa; }
      else { total = parseMoney(val('prTot')); tasaStore = 0; }
      if (total <= 0) { toast('err', c.computa ? 'Revisa el capital, las cuotas y la tasa' : 'Pon el total a devolver'); return; }
    }
    const datos = {
      nombre: nom,
      cedula: (val('prCed') || '').trim(),
      telefono: (val('prTel') || '').trim(),
      capital: capital,
      total_devolver: total,
      tasa_interes: tasaStore,
      plazo_meses: plazoStore,
      fecha_prestamo: fecha,
      modo: modo,
      num_cuotas: modo === 'cuotas' ? (parseInt(val('prNumCuotas'), 10) || null) : null,
      frecuencia: modo === 'cuotas' ? (val('prFrec') || 'mensual') : null,
      notas: (val('prNotas') || '').trim()
    };
    try {
      if (id) { await getAPI().patch('prestamos', 'id=eq.' + id, datos); }
      else { datos.created_by_name = nomAdmin(); await getAPI().post('prestamos', datos); }
      cerrarModal('nxPrModal');
      toast('ok', id ? 'Préstamo actualizado' : 'Préstamo creado', nom);
      await cargarPrestamos();
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al guardar', String(e && e.message || e)); }
  };

  // ── Detalle + pagos ──
  window.nxPrestamoVer = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    cerrarModal('nxPrModal');
    _tipoPago = 'capital';
    const pagos = (_pagosByPrestamo[id] || []).slice().sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const pag = pagadoDe(p), saldo = saldoDe(p), est = estadoDe(p);
    const esCredito = p.modo === 'credito';
    const cc = esCredito ? creditoCalc(p) : null;
    let scheduleHTML = '';
    if (esCredito) {
      const rows = cc.meses.map(m => `<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">#${m.n}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;color:#475569;white-space:nowrap">${m.fecha}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt(m.saldo)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ea580c;font-weight:700">${fmt(m.interes)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${m.encurso ? '<span style="color:#475569;font-size:9px">en curso</span>' : '<span style="color:#16a34a;font-weight:800">✓</span>'}</td></tr>`).join('');
      scheduleHTML = `<div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 4px">INTERÉS POR MES · ${p.tasa_interes}% sobre el saldo de capital</div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #e2e8f0;border-radius:10px">
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;min-width:340px;background:#fff">
            <thead><tr style="background:#f8fafc;color:#475569;font-size:9.5px"><th style="padding:6px;text-align:left">Mes</th><th style="padding:6px;text-align:left">Desde</th><th style="padding:6px;text-align:right">Capital base</th><th style="padding:6px;text-align:right">Interés</th><th style="padding:6px;text-align:center">Estado</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0 && Number(p.tasa_interes || 0) > 0) {
      const a = amortizar(Number(p.capital || 0), Number(p.tasa_interes), p.num_cuotas, p.fecha_prestamo, p.frecuencia);
      let acum = 0;
      const rows = a.rows.map(r => {
        acum += r.cuota;
        const cub = pag >= acum - 0.5;
        return `<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">#${r.n}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;color:#475569;white-space:nowrap">${r.fecha}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700">${fmt(r.cuota)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;color:#ea580c">${fmt(r.interes)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;color:#2563eb">${fmt(r.capital)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right">${fmt(r.saldo)}</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">${cub ? '<span style="color:#16a34a;font-weight:800">✓</span>' : '<span style="color:#cbd5e1;font-weight:800">·</span>'}</td></tr>`;
      }).join('');
      scheduleHTML = `<div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 4px">TABLA DE AMORTIZACIÓN · ${p.tasa_interes}% mensual · cuota ${fmt(a.cuota)} · interés total ${fmt(a.interesTotal)}</div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #e2e8f0;border-radius:10px">
          <table style="width:100%;border-collapse:collapse;font-size:10.5px;min-width:430px;background:#fff">
            <thead><tr style="background:#f8fafc;color:#475569;font-size:9.5px"><th style="padding:6px;text-align:left">#</th><th style="padding:6px;text-align:left">Fecha</th><th style="padding:6px;text-align:right">Cuota</th><th style="padding:6px;text-align:right">Interés</th><th style="padding:6px;text-align:right">Capital</th><th style="padding:6px;text-align:right">Saldo</th><th style="padding:6px;text-align:center">Pag.</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0) {
      const cuota = Number(p.total_devolver || 0) / p.num_cuotas;
      let acum = 0; const rows = [];
      for (let i = 0; i < p.num_cuotas; i++) {
        const due = fechaCuota(p.fecha_prestamo, p.frecuencia, i + 1);
        acum += cuota;
        const cubierta = pag >= acum - 0.5;
        rows.push(`<tr><td style="padding:6px 10px;font-size:11px;border-bottom:1px solid #f1f5f9">#${i + 1}</td><td style="padding:6px 10px;font-size:11px;color:#475569;border-bottom:1px solid #f1f5f9">${due}</td><td style="padding:6px 10px;font-size:11px;text-align:right;font-weight:700;border-bottom:1px solid #f1f5f9">${fmt(cuota)}</td><td style="padding:6px 10px;text-align:right;border-bottom:1px solid #f1f5f9">${cubierta ? '<span style="color:#16a34a;font-weight:800;font-size:10px">PAGADA</span>' : '<span style="color:#dc2626;font-weight:800;font-size:10px">PENDIENTE</span>'}</td></tr>`);
      }
      scheduleHTML = `<div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 4px">CALENDARIO DE CUOTAS (${fmt(cuota)} c/u)</div><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${rows.join('')}</table>`;
    }
    const pagosHTML = pagos.length === 0
      ? '<div style="color:#475569;font-size:11px;padding:10px">Sin pagos aún</div>'
      : pagos.map(x => { const tb = x.tipo === 'capital' ? ' <span style="color:#2563eb;font-weight:800;font-size:8.5px;background:#eff6ff;padding:1px 5px;border-radius:6px">CAPITAL</span>' : x.tipo === 'interes' ? ' <span style="color:#ea580c;font-weight:800;font-size:8.5px;background:#fff7ed;padding:1px 5px;border-radius:6px">INTERÉS</span>' : ''; return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><div><b style="color:#059669">${fmt(x.monto)}</b>${tb} <span style="color:#475569">${(x.fecha || '').slice(0, 10)}${x.metodo ? ' · ' + esc(x.metodo) : ''}</span>${x.nota ? `<div style="color:#475569;font-size:10px">${esc(x.nota)}</div>` : ''}</div><button class="btn bsm bghost" type="button" onclick="window.nxPrestamoBorrarPago('${x.id}','${id}')" title="Eliminar pago"><i class="ti ti-trash" style="color:#dc2626"></i></button></div>`; }).join('');
    const ov = document.createElement('div'); ov.id = 'nxPrModal'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:460px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-user"></i> ${esc(p.nombre || '')}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrModal').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">${esc(p.cedula || '')}${p.telefono ? ' · ' + esc(p.telefono) : ''}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
            ${esCredito
        ? `${kpi('Capital pend.', fmt(cc.capPend), '#2563eb')}${kpi('Interés pend.', fmt(cc.interesPend), '#ea580c')}${kpi('Debe ahora', fmt(cc.totalDebe), cc.totalDebe > 0 ? '#dc2626' : '#16a34a')}`
        : `${kpi('Prestó', fmt(p.capital), '#2563eb')}${kpi('A devolver', fmt(p.total_devolver), '#0f172a')}${kpi('Saldo', fmt(saldo), saldo > 0 ? '#dc2626' : '#16a34a')}`}
          </div>
          ${esCredito
        ? `<div style="font-size:11px;color:#475569">Línea de crédito · ${p.tasa_interes}%/mes · desde ${esc(p.fecha_prestamo || '')}</div>
             <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;font-size:11px">
               <div style="background:#eff6ff;border-radius:8px;padding:7px 9px;color:#1e40af">Prestó: <b>${fmt(cc.cap)}</b><br>Pagado a capital: <b>${fmt(cc.pagCap)}</b></div>
               <div style="background:#fff7ed;border-radius:8px;padding:7px 9px;color:#9a3412">Interés acumulado: <b>${fmt(cc.interesAcum)}</b><br>Interés pagado: <b>${fmt(cc.pagInt)}</b></div>
             </div>
             ${cc.fechaLimite ? `<div style="font-size:11px;margin-top:6px;padding:7px 9px;border-radius:8px;${cc.diasRestan != null && cc.diasRestan < 0 && est !== 'pagado' ? 'background:#fef2f2;color:#dc2626;font-weight:700' : 'background:#f8fafc;color:#475569'}">${cc.diasRestan != null && cc.diasRestan < 0 && est !== 'pagado' ? '⚠️ Capital VENCIDO el ' + cc.fechaLimite + ' (' + Math.abs(cc.diasRestan) + ' días de atraso)' : '📅 Fecha límite del capital: ' + cc.fechaLimite + (cc.diasRestan != null ? ' · faltan ' + cc.diasRestan + ' días' : '')}</div>` : ''}`
        : `<div style="display:flex;justify-content:space-between;font-size:11px;flex-wrap:wrap;gap:4px"><span style="color:#059669;font-weight:700">Pagado: ${fmt(pag)}</span><span style="color:#475569">${p.modo === 'cuotas' ? ((p.num_cuotas || 0) + ' cuotas ' + (p.frecuencia || '') + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '%/mes' : '')) : ('Abonos libres' + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '% interés' : ''))} · ${esc(p.fecha_prestamo || '')}</span></div>
             ${(p.modo === 'libre' && Number(p.tasa_interes || 0) > 0) ? `<div style="font-size:11px;color:#1e40af;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:7px 9px;margin-top:6px">Interés (una vez): <b>${fmt(Number(p.total_devolver || 0) - Number(p.capital || 0))}</b> · ${p.tasa_interes}% sobre el capital</div>` : ''}`}
          ${p.notas ? `<div style="font-size:11px;color:#475569;margin-top:6px;background:#f8fafc;border-radius:8px;padding:7px 9px">📝 ${esc(p.notas)}</div>` : ''}
          ${scheduleHTML}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 4px">PAGOS (${pagos.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${pagosHTML}</div>
        </div>
        <div style="border-top:1px solid #f1f5f9;padding-top:10px;margin-top:10px">
          ${est !== 'pagado' ? `${esCredito ? `<div style="display:flex;gap:6px;margin-bottom:6px"><button id="prTipoCap" class="btn bc1" type="button" onclick="window.nxPrTipoPago('capital')" style="flex:1">A capital</button><button id="prTipoInt" class="btn" type="button" onclick="window.nxPrTipoPago('interes')" style="flex:1">A interés</button></div>` : ''}
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <input id="prPagoMonto" data-nx-money inputmode="numeric" placeholder="Monto" style="flex:1;min-width:0;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;outline:none">
            <input id="prPagoFecha" type="date" value="${hoy()}" style="flex:0 0 auto;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none">
          </div>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            <select id="prPagoMetodo" style="flex:1;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff"><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Cheque">Cheque</option><option value="Otro">Otro</option></select>
            <input id="prPagoNota" class="no-upper" placeholder="Nota (opcional)" style="flex:1;min-width:0;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none">
          </div>
          <button class="btn bc1 nxPrPagar" type="button" onclick="window.nxPrestamoPagar('${id}')"><i class="ti ti-plus"></i> Registrar pago</button>` : '<div style="text-align:center;color:#16a34a;font-weight:800;font-size:12px;margin-bottom:8px">✓ Préstamo saldado</div>'}
          <div class="nxPrActs">
            ${waNumero(p.telefono) ? `<button class="nxPrAcc wa" type="button" onclick="window.nxPrestamoWA('${id}')"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
            <button class="nxPrAcc" type="button" onclick="window.nxPrestamoContrato('${id}')"><i class="ti ti-file-certificate"></i> Contrato</button>
            <button class="nxPrAcc" type="button" onclick="window.nxPrestamoEstadoCuenta('${id}')"><i class="ti ti-file-text"></i> Estado</button>
            <button class="nxPrAcc" type="button" onclick="window.nxPrestamoDocs('${id}')"><i class="ti ti-folder"></i> Docs${Array.isArray(p.documentos) && p.documentos.length ? ' (' + p.documentos.length + ')' : ''}</button>
            <button class="nxPrAcc" type="button" onclick="window.nxPrestamoEditar('${id}')"><i class="ti ti-edit"></i> Editar</button>
            <button class="nxPrAcc del" type="button" onclick="window.nxPrestamoBorrar('${id}')"><i class="ti ti-trash"></i> Borrar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(ov); } catch (e) {}
  };

  window.nxPrestamoPagar = async function (id) {
    const monto = parseMoney(document.getElementById('prPagoMonto') && document.getElementById('prPagoMonto').value);
    if (monto <= 0) { toast('err', 'Pon el monto del pago'); return; }
    const pr = _prestamos.find(x => String(x.id) === String(id));
    const body = {
      prestamo_id: id, monto: monto,
      fecha: val('prPagoFecha') || hoy(),
      metodo: val('prPagoMetodo') || 'Efectivo',
      nota: (val('prPagoNota') || '').trim() || null,
      created_by_name: nomAdmin()
    };
    if (pr && pr.modo === 'credito') body.tipo = _tipoPago || 'capital';
    try {
      await getAPI().post('prestamo_pagos', body);
      toast('ok', 'Pago registrado', fmt(monto) + (body.tipo ? ' · ' + (body.tipo === 'capital' ? 'a capital' : 'a interés') : ''));
      await cargarPrestamos();
      const p = _prestamos.find(x => String(x.id) === String(id));
      if (p && estadoDe(p) === 'pagado' && p.estado !== 'pagado') { try { await getAPI().patch('prestamos', 'id=eq.' + id, { estado: 'pagado' }); p.estado = 'pagado'; } catch (e) {} }
      window.nxPrestamoVer(id);
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al registrar el pago', String(e && e.message || e)); }
  };

  window.nxPrestamoBorrarPago = async function (pagoId, prestamoId) {
    try {
      const ok = (typeof window.swalConfirm === 'function') ? await window.swalConfirm('💸', '¿Eliminar este pago?', 'Se restará del total pagado') : window.confirm('¿Eliminar este pago?');
      if (!ok) return;
      await getAPI().del('prestamo_pagos', 'id=eq.' + pagoId);
      await cargarPrestamos();
      window.nxPrestamoVer(prestamoId);
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al eliminar el pago'); }
  };

  window.nxPrestamoBorrar = async function (id) {
    try {
      const ok = (typeof window.swalConfirm === 'function') ? await window.swalConfirm('🗑️', '¿Eliminar este préstamo?', 'Se borran también todos sus pagos. No se puede deshacer.') : window.confirm('¿Eliminar este préstamo y todos sus pagos?');
      if (!ok) return;
      await getAPI().del('prestamos', 'id=eq.' + id);
      cerrarModal('nxPrModal');
      toast('ok', 'Préstamo eliminado');
      await cargarPrestamos();
      const view = document.getElementById('v-prestamos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'Error al eliminar', String(e && e.message || e)); }
  };

  // ── Filtro por estado/tipo ──
  window.nxPrestamoFiltroTipo = function (k) { _prFiltro = k; const view = document.getElementById('v-prestamos'); if (view) renderLista(view); };

  // ── Recordatorio / recibo por WhatsApp ──
  window.nxPrestamoWA = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const num = waNumero(p.telefono); if (!num) { toast('err', 'Sin teléfono válido'); return; }
    const nom = (p.nombre || '').split(' ')[0] || '';
    const saldo = saldoDe(p);
    let msg;
    if (p.modo === 'credito') {
      const c = creditoCalc(p);
      msg = `Hola ${nom}, le recordamos su préstamo:\n• Capital pendiente: ${fmt(c.capPend)}\n• Interés pendiente: ${fmt(c.interesPend)}\n• Total a la fecha: ${fmt(c.totalDebe)}` + (c.fechaLimite ? `\n• Fecha límite del capital: ${c.fechaLimite}` : '') + `\n\nGracias.`;
    } else {
      msg = `Hola ${nom}, le recordamos su préstamo:\n• Prestado: ${fmt(p.capital)}\n• A devolver: ${fmt(p.total_devolver)}\n• Pagado: ${fmt(pagadoDe(p))}\n• Saldo pendiente: ${fmt(saldo)}` + (p.modo === 'cuotas' ? `\n• Próxima(s) cuota(s) de ${p.num_cuotas} ${p.frecuencia || ''}` : '') + `\n\nGracias.`;
    }
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  };

  // ── Exportar préstamos a Excel (CSV) ──
  window.nxPrestamoExportar = function () {
    if (!_prestamos.length) { toast('warn', 'No hay préstamos para exportar'); return; }
    const tipoTxt = m => m === 'credito' ? 'Línea de crédito' : m === 'cuotas' ? 'Cuotas fijas' : 'Abonos libres';
    const cab = ['Nombre', 'Cédula', 'Teléfono', 'Tipo', 'Capital', 'Tasa%', 'Cuotas/Plazo', 'Total a devolver', 'Pagado', 'Saldo', 'Estado', 'Vencido', 'Fecha', 'Notas'];
    const filas = _prestamos.map(p => {
      const esC = p.modo === 'credito';
      return [
        p.nombre || '', p.cedula || '', p.telefono || '', tipoTxt(p.modo),
        Math.round(Number(p.capital || 0)), Number(p.tasa_interes || 0),
        esC ? ((p.plazo_meses || '') + ' meses') : (p.modo === 'cuotas' ? ((p.num_cuotas || '') + ' ' + (p.frecuencia || '')) : 'libre'),
        esC ? '' : Math.round(Number(p.total_devolver || 0)),
        Math.round(pagadoDe(p)), Math.round(saldoDe(p)),
        estadoDe(p) === 'pagado' ? 'Pagado' : 'Activo', esVencido(p) ? 'SÍ' : '',
        p.fecha_prestamo || '', (p.notas || '').replace(/[\r\n]+/g, ' ')
      ];
    });
    const esc2 = v => { const s = String(v == null ? '' : v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cab, ...filas].map(r => r.map(esc2).join(',')).join('\r\n');
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'prestamos_' + hoy() + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 500);
      toast('ok', 'Excel exportado', _prestamos.length + ' préstamos');
    } catch (e) { toast('err', 'No se pudo exportar', String(e && e.message || e)); }
  };

  // ── Estado de cuenta del prestatario (para imprimir / guardar PDF / compartir) ──
  window.nxPrestamoEstadoCuenta = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const pagos = (_pagosByPrestamo[id] || []).slice().sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const esC = p.modo === 'credito';
    const cc = esC ? creditoCalc(p) : null;
    const empNom = (function () { try { return (window.CFG && CFG.empresa_nom) || (window.ST && ST.config && ST.config.empresa_nom) || 'NEXUS PRO'; } catch (e) { return 'NEXUS PRO'; } })();
    const filasPagos = pagos.length ? pagos.map(x => `<tr><td>${(x.fecha || '').slice(0, 10)}</td><td>${esc(x.metodo || '')}${x.tipo ? ' · ' + esc(x.tipo) : ''}</td><td style="text-align:right">${fmt(x.monto)}</td><td>${esc(x.nota || '')}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#888">Sin pagos</td></tr>';
    const resumen = esC
      ? `<tr><td>Capital prestado</td><td style="text-align:right">${fmt(cc.cap)}</td></tr><tr><td>Pagado a capital</td><td style="text-align:right">${fmt(cc.pagCap)}</td></tr><tr><td>Capital pendiente</td><td style="text-align:right"><b>${fmt(cc.capPend)}</b></td></tr><tr><td>Interés acumulado</td><td style="text-align:right">${fmt(cc.interesAcum)}</td></tr><tr><td>Interés pagado</td><td style="text-align:right">${fmt(cc.pagInt)}</td></tr><tr><td><b>Total a la fecha</b></td><td style="text-align:right"><b>${fmt(cc.totalDebe)}</b></td></tr>${cc.fechaLimite ? `<tr><td>Fecha límite del capital</td><td style="text-align:right">${cc.fechaLimite}</td></tr>` : ''}`
      : `<tr><td>Capital prestado</td><td style="text-align:right">${fmt(p.capital)}</td></tr><tr><td>Total a devolver</td><td style="text-align:right">${fmt(p.total_devolver)}</td></tr><tr><td>Pagado</td><td style="text-align:right">${fmt(pagadoDe(p))}</td></tr><tr><td><b>Saldo pendiente</b></td><td style="text-align:right"><b>${fmt(saldoDe(p))}</b></td></tr>`;
    const tipoTxt = esC ? 'Línea de crédito · ' + (p.tasa_interes || 0) + '%/mes' : p.modo === 'cuotas' ? (p.num_cuotas || 0) + ' cuotas ' + (p.frecuencia || '') + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '%/mes' : '') : 'Abonos libres' + (Number(p.tasa_interes || 0) > 0 ? ' · ' + p.tasa_interes + '% interés' : '');
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estado de cuenta - ${esc(p.nombre || '')}</title>
      <style>body{font-family:Arial,sans-serif;color:#1e293b;max-width:560px;margin:0 auto;padding:18px}h1{font-size:18px;margin:0 0 2px}.sub{color:#475569;font-size:12px;margin-bottom:14px}table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12.5px}td,th{padding:7px 9px;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f3f4f6}.tit{font-size:12px;font-weight:800;color:#475569;margin:6px 0 4px}.box{border:1px solid #e5e7eb;border-radius:10px;padding:4px 10px;margin-bottom:12px}.foot{color:#475569;font-size:11px;text-align:center;margin-top:18px}@media print{.noprint{display:none}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;background:#1e3a6e;margin:-18px -18px 16px;padding:11px 16px"><button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">&#10005; Cerrar</button><span style="color:#fff;font-size:11.5px;opacity:.85;font-family:Arial,sans-serif"></span></div>
        <h1>📄 Estado de cuenta</h1>
        <div class="sub">${esc(empNom)} · Generado ${hoy()}</div>
        <div class="box"><table><tr><td>Cliente</td><td style="text-align:right"><b>${esc(p.nombre || '')}</b></td></tr>${p.cedula ? `<tr><td>Cédula</td><td style="text-align:right">${esc(p.cedula)}</td></tr>` : ''}${p.telefono ? `<tr><td>Teléfono</td><td style="text-align:right">${esc(p.telefono)}</td></tr>` : ''}<tr><td>Tipo</td><td style="text-align:right">${esc(tipoTxt)}</td></tr><tr><td>Fecha del préstamo</td><td style="text-align:right">${esc(p.fecha_prestamo || '')}</td></tr></table></div>
        <div class="tit">RESUMEN</div>
        <table>${resumen}</table>
        <div class="tit">PAGOS (${pagos.length})</div>
        <table><thead><tr><th>Fecha</th><th>Método</th><th style="text-align:right">Monto</th><th>Nota</th></tr></thead><tbody>${filasPagos}</tbody></table>
        <button class="noprint" onclick="window.print()" style="width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer">🖨️ Imprimir / Guardar PDF</button>
        <div class="foot">NEXUS PRO · Préstamos</div>
      </body></html>`;
    try {
      const w = window.open('', '_blank');
      if (!w) { toast('err', 'Permite las ventanas emergentes para ver el estado de cuenta'); return; }
      w.document.write(html); w.document.close();
    } catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };

  // ════════════════════════════════════════════════════════════════
  //  CONTRATO DE PRÉSTAMO (documento imprimible / PDF)
  // ════════════════════════════════════════════════════════════════
  function numLetras(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return 'CERO';
    const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
    const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    function men100(x) {
      if (x <= 20) return U[x];
      if (x < 30) return 'VEINTI' + U[x - 20];
      const d = Math.floor(x / 10), u = x % 10;
      return D[d] + (u ? ' Y ' + U[u] : '');
    }
    function men1000(x) {
      if (x === 100) return 'CIEN';
      const c = Math.floor(x / 100), r = x % 100;
      return ((c ? C[c] + ' ' : '') + (r ? men100(r) : '')).trim();
    }
    let txt = '';
    const millones = Math.floor(n / 1000000), miles = Math.floor((n % 1000000) / 1000), cientos = n % 1000;
    if (millones) txt += (millones === 1 ? 'UN MILLÓN' : men1000(millones) + ' MILLONES') + ' ';
    if (miles) txt += (miles === 1 ? 'MIL' : men1000(miles) + ' MIL') + ' ';
    if (cientos) txt += men1000(cientos);
    return txt.trim();
  }
  function fechaLarga(d) {
    try {
      const dt = new Date(String(d || hoy()).slice(0, 10) + 'T12:00:00');
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return dt.getDate() + ' días del mes de ' + meses[dt.getMonth()] + ' del año ' + dt.getFullYear();
    } catch (e) { return String(d || ''); }
  }
  function empresaNom() { try { return (window.CFG && CFG.empresa_nom) || (window.ST && ST.config && ST.config.empresa_nom) || 'NEXUS PRO'; } catch (e) { return 'NEXUS PRO'; } }

  // ── Configuración del contrato: empresa que presta + datos del abogado ──
  window.nxPrestamoConfig = function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    cerrarModal('nxPrCfg');
    const c = _prCfg || {};
    const fld = (id, lbl, val, ph, extra) => `<div class="fr"><label>${lbl}</label><input id="${id}" class="no-upper" value="${esc(val || '')}" placeholder="${ph || ''}" ${extra || ''}></div>`;
    const ov = document.createElement('div'); ov.id = 'nxPrCfg'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:460px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-settings"></i> Datos del contrato</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrCfg').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11px;color:#475569;margin-bottom:10px">Estos datos saldrán en el contrato de préstamo (el acreedor que presta y la legalización del abogado).</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">EMPRESA / PERSONA QUE PRESTA</div>
          ${fld('cfgEmpNom', 'Nombre del acreedor', c.empresa_nombre, 'Ej: Inversiones XYZ, SRL')}
          <div class="fr-row">
            ${fld('cfgEmpDoc', 'RNC / Cédula', c.empresa_doc, '0-00-00000-0')}
            ${fld('cfgEmpTel', 'Teléfono', c.empresa_telefono, '809-000-0000')}
          </div>
          ${fld('cfgEmpDir', 'Dirección', c.empresa_direccion, 'Calle, sector, ciudad')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">ABOGADO (LEGALIZACIÓN)</div>
          ${fld('cfgAboNom', 'Nombre del abogado(a)', c.abogado_nombre, 'Lic. Nombre Apellido')}
          <div class="fr-row">
            ${fld('cfgAboCed', 'Cédula', c.abogado_cedula, '000-0000000-0')}
            ${fld('cfgAboMat', 'Matrícula (CARD)', c.abogado_matricula, 'No. de matrícula')}
          </div>
          ${fld('cfgAboTel', 'Teléfono / Estudio', c.abogado_telefono, '809-000-0000')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">TESTIGOS (opcional)</div>
          <div class="fr-row">
            ${fld('cfgT1Nom', 'Testigo 1 — nombre', c.testigo1_nombre, 'Nombre Apellido')}
            ${fld('cfgT1Ced', 'Cédula', c.testigo1_cedula, '000-0000000-0')}
          </div>
          <div class="fr-row">
            ${fld('cfgT2Nom', 'Testigo 2 — nombre', c.testigo2_nombre, 'Nombre Apellido')}
            ${fld('cfgT2Ced', 'Cédula', c.testigo2_cedula, '000-0000000-0')}
          </div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxPrCfg').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxPrestamoGuardarConfig()"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };

  window.nxPrestamoGuardarConfig = async function () {
    const body = {
      empresa_nombre: (val('cfgEmpNom') || '').trim() || null,
      empresa_doc: (val('cfgEmpDoc') || '').trim() || null,
      empresa_telefono: (val('cfgEmpTel') || '').trim() || null,
      empresa_direccion: (val('cfgEmpDir') || '').trim() || null,
      abogado_nombre: (val('cfgAboNom') || '').trim() || null,
      abogado_cedula: (val('cfgAboCed') || '').trim() || null,
      abogado_matricula: (val('cfgAboMat') || '').trim() || null,
      abogado_telefono: (val('cfgAboTel') || '').trim() || null,
      testigo1_nombre: (val('cfgT1Nom') || '').trim() || null,
      testigo1_cedula: (val('cfgT1Ced') || '').trim() || null,
      testigo2_nombre: (val('cfgT2Nom') || '').trim() || null,
      testigo2_cedula: (val('cfgT2Ced') || '').trim() || null,
      updated_at: new Date().toISOString()
    };
    try {
      let r = await getAPI().patch('prestamos_config', 'id=eq.1', body);
      if (!r || (Array.isArray(r) && r.length === 0)) { try { await getAPI().post('prestamos_config', Object.assign({ id: 1 }, body)); } catch (e) {} }
      _prCfg = Object.assign({}, _prCfg, body);
      cerrarModal('nxPrCfg');
      toast('ok', 'Datos del contrato guardados');
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  window.nxPrestamoContrato = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const esC = p.modo === 'credito';
    const cap = Number(p.capital || 0);
    const cfg = _prCfg || {};
    const acreedor = (cfg.empresa_nombre && cfg.empresa_nombre.trim()) || (function () { try { return (window.CFG && CFG.empresa_nom) || nomAdmin() || empresaNom(); } catch (e) { return empresaNom(); } })();
    const empNom = acreedor;
    const acreedorDet = [
      cfg.empresa_doc ? 'RNC/Cédula No. <b>' + esc(cfg.empresa_doc) + '</b>' : '',
      cfg.empresa_direccion ? 'con domicilio en ' + esc(cfg.empresa_direccion) : '',
      cfg.empresa_telefono ? 'teléfono ' + esc(cfg.empresa_telefono) : ''
    ].filter(Boolean).join(', ');
    const firmaTestigo = (nom, ced) => nom ? `<div class="firma" style="max-width:48%">${esc(nom)}<br><span style="color:#777;font-size:11px">Testigo${ced ? '<br>Céd. ' + esc(ced) : ''}</span></div>` : '';
    const testigosHTML = (cfg.testigo1_nombre || cfg.testigo2_nombre)
      ? `<div style="font-size:12px;text-align:center;color:#475569;margin:36px 0 0;font-weight:700">TESTIGOS</div>
         <div class="firmas" style="margin-top:40px;justify-content:space-around">${firmaTestigo(cfg.testigo1_nombre, cfg.testigo1_cedula)}${firmaTestigo(cfg.testigo2_nombre, cfg.testigo2_cedula)}</div>`
      : '';
    let clausulaPago = '';
    if (esC) {
      const c = creditoCalc(p);
      clausulaPago = `<p><b>SEGUNDA — Intereses:</b> Sobre el capital adeudado se aplicará una tasa de interés de <b>${p.tasa_interes || 0}% mensual</b>, calculada sobre el saldo de capital pendiente. EL DEUDOR se compromete a pagar dichos intereses de forma mensual.</p>
        <p><b>TERCERA — Plazo del capital:</b> EL DEUDOR deberá reembolsar la totalidad del capital prestado a más tardar el día <b>${c.fechaLimite || '____________'}</b>${p.plazo_meses ? ' (plazo de ' + p.plazo_meses + ' meses)' : ''}. EL DEUDOR podrá realizar abonos parciales al capital en cualquier momento, reduciendo así los intereses futuros.</p>`;
    } else if (p.modo === 'cuotas' && p.num_cuotas > 0) {
      const total = Number(p.total_devolver || 0);
      const tieneInt = Number(p.tasa_interes || 0) > 0;
      let cuotaTxt = '';
      if (tieneInt) { const a = amortizar(cap, p.tasa_interes, p.num_cuotas, p.fecha_prestamo, p.frecuencia); cuotaTxt = fmt(a.cuota); }
      else { cuotaTxt = fmt(total / p.num_cuotas); }
      const ultima = fechaCuota(p.fecha_prestamo, p.frecuencia, p.num_cuotas);
      const primera = fechaCuota(p.fecha_prestamo, p.frecuencia, 1);
      clausulaPago = `<p><b>SEGUNDA — Forma de pago:</b> EL DEUDOR se obliga a devolver la suma total de <b>${fmt(total)}</b>${tieneInt ? ' (capital más intereses al ' + p.tasa_interes + '% mensual)' : ''}, pagadera en <b>${p.num_cuotas} cuotas ${p.frecuencia || ''}</b> de aproximadamente <b>${cuotaTxt}</b> cada una.</p>
        <p><b>TERCERA — Vencimientos:</b> La primera cuota vence el <b>${primera}</b> y la última el <b>${ultima}</b>. El detalle completo consta en la tabla de amortización anexa al estado de cuenta.</p>`;
    } else {
      const total = Number(p.total_devolver || 0);
      const tieneInt = Number(p.tasa_interes || 0) > 0;
      clausulaPago = `<p><b>SEGUNDA — Forma de pago:</b> EL DEUDOR se obliga a devolver la suma total de <b>${fmt(total)}</b>${tieneInt ? ' (capital de ' + fmt(cap) + ' más un ' + p.tasa_interes + '% de interés)' : ''}, mediante abonos libres, sin un calendario fijo de cuotas, hasta saldar la totalidad de la deuda.</p>
        <p><b>TERCERA — Saldo:</b> EL DEUDOR podrá abonar las cantidades que estime convenientes en cualquier momento hasta cubrir el monto total adeudado.</p>`;
    }
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contrato de préstamo - ${esc(p.nombre || '')}</title>
      <style>body{font-family:'Times New Roman',Georgia,serif;color:#1a1a1a;max-width:640px;margin:0 auto;padding:26px 22px;line-height:1.55;font-size:13.5px}h1{font-size:19px;text-align:center;margin:0 0 2px;letter-spacing:1px}.sub{text-align:center;color:#555;font-size:12px;margin-bottom:18px}p{margin:9px 0;text-align:justify}.parte{background:#f6f7f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin:10px 0;font-size:12.5px}.firmas{display:flex;justify-content:space-between;gap:24px;margin-top:54px}.firma{flex:1;text-align:center;border-top:1.5px solid #1a1a1a;padding-top:6px;font-size:12px}.foot{color:#999;font-size:10.5px;text-align:center;margin-top:26px}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;background:#1e3a6e;margin:-26px -22px 18px;padding:11px 16px"><button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">&#10005; Cerrar</button><span style="color:#fff;font-size:11.5px;opacity:.85;font-family:Arial,sans-serif"></span></div>
        <h1>CONTRATO DE PRÉSTAMO</h1>
        <div class="sub">${esc(empNom)}</div>
        <p>En la República Dominicana, a los <b>${fechaLarga(p.fecha_prestamo)}</b>, entre las partes que más abajo se identifican, se ha convenido y pactado el siguiente contrato de préstamo:</p>
        <div class="parte"><b>EL ACREEDOR:</b> ${esc(acreedor)}${acreedorDet ? ', ' + acreedorDet : ''}, quien en lo adelante se denominará <b>EL ACREEDOR</b>.</div>
        <div class="parte"><b>EL DEUDOR:</b> ${esc(p.nombre || '____________')}${p.cedula ? ', portador(a) de la cédula de identidad No. <b>' + esc(p.cedula) + '</b>' : ''}${p.telefono ? ', teléfono ' + esc(p.telefono) : ''}, quien en lo adelante se denominará <b>EL DEUDOR</b>.</div>
        <p><b>PRIMERA — Objeto:</b> EL ACREEDOR entrega en este acto a EL DEUDOR, en calidad de préstamo, la suma de <b>${fmt(cap)}</b> (<b>${numLetras(cap)} PESOS DOMINICANOS</b>), que EL DEUDOR declara haber recibido a su entera satisfacción.</p>
        ${clausulaPago}
        <p><b>CUARTA — Mora:</b> La falta de pago en las fechas convenidas facultará a EL ACREEDOR a exigir el saldo total adeudado y a iniciar las acciones legales correspondientes, corriendo por cuenta de EL DEUDOR los gastos y costas que ello genere.</p>
        <p><b>QUINTA — Compromiso de pago (pagaré):</b> EL DEUDOR reconoce deber y se obliga a pagar a EL ACREEDOR la suma antes indicada en las condiciones aquí establecidas, sirviendo el presente documento como pagaré y reconocimiento de deuda.</p>
        <p>Hecho y firmado de buena fe, en dos (2) originales de un mismo tenor y efecto, uno para cada parte${testigosHTML ? ', ante los testigos que firman al pie' : ''}.</p>
        <div class="firmas">
          <div class="firma">EL ACREEDOR<br><span style="color:#777;font-size:11px">${esc(acreedor)}</span></div>
          <div class="firma">EL DEUDOR<br><span style="color:#777;font-size:11px">${esc(p.nombre || '')}${p.cedula ? '<br>Céd. ' + esc(p.cedula) : ''}</span></div>
        </div>
        ${testigosHTML}
        ${cfg.abogado_nombre ? `<div style="margin-top:40px;border-top:1px dashed #bbb;padding-top:16px">
          <p style="font-size:12px"><b>LEGALIZACIÓN DE FIRMAS.</b> Yo, <b>${esc(cfg.abogado_nombre)}</b>, Abogado(a) Notario(a)${cfg.abogado_matricula ? ', con Matrícula del Colegio de Abogados de la República Dominicana (CARD) No. <b>' + esc(cfg.abogado_matricula) + '</b>' : ''}${cfg.abogado_cedula ? ', portador(a) de la cédula de identidad y electoral No. <b>' + esc(cfg.abogado_cedula) + '</b>' : ''}${cfg.abogado_telefono ? ', Tel. ' + esc(cfg.abogado_telefono) : ''}, CERTIFICO Y DOY FE de que las firmas que anteceden fueron puestas libre y voluntariamente en mi presencia por las partes contratantes, quienes me declararon que esas son las firmas que acostumbran usar en todos los actos de su vida pública y privada. En la República Dominicana, a los ${fechaLarga(p.fecha_prestamo)}.</p>
          <div class="firmas" style="margin-top:46px"><div class="firma" style="max-width:60%">${esc(cfg.abogado_nombre)}<br><span style="color:#777;font-size:11px">Abogado(a) Notario(a)${cfg.abogado_matricula ? '<br>CARD No. ' + esc(cfg.abogado_matricula) : ''}</span></div></div>
        </div>` : ''}
        <button class="noprint" onclick="window.print()" style="width:100%;padding:13px;margin-top:30px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:Arial,sans-serif">🖨️ Imprimir / Guardar PDF</button>
        <div class="foot">${esc(empNom)} · Documento generado el ${hoy()}</div>
      </body></html>`;
    try {
      const w = window.open('', '_blank');
      if (!w) { toast('err', 'Permite las ventanas emergentes para ver el contrato'); return; }
      w.document.write(html); w.document.close();
    } catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };

  // ════════════════════════════════════════════════════════════════
  //  DOCUMENTOS DEL PRÉSTAMO (cédula, contrato firmado, garantías…)
  // ════════════════════════════════════════════════════════════════
  const DOCS_BUCKET = 'comprobantes'; // bucket público (mismo que los bauches)
  const DOC_TIPOS = [
    { k: 'cedula', lbl: 'Cédula', ic: 'ti-id' },
    { k: 'contrato', lbl: 'Contrato firmado', ic: 'ti-file-certificate' },
    { k: 'garantia', lbl: 'Garantía', ic: 'ti-shield-check' },
    { k: 'otro', lbl: 'Otro', ic: 'ti-paperclip' }
  ];
  let _docSubiendo = false;

  async function subirDocPrestamo(id, file) {
    const api = getAPI();
    if (!api || !api.url || !api.key) throw new Error('Sin conexión');
    let ext = '';
    if (file.name && file.name.includes('.')) ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext) ext = (file.type && file.type.includes('png')) ? 'png' : (file.type && file.type.includes('pdf')) ? 'pdf' : 'jpg';
    const path = `prestamos/${id}/${Date.now()}.${ext}`;
    const fd = new FormData();
    fd.append('', file, 'doc.' + ext);
    const headers = { 'apikey': api.key, 'Authorization': 'Bearer ' + api.key };
    let resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'POST', headers, body: fd });
    if (!resp.ok && resp.status === 400) {
      resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'PUT', headers, body: fd });
    }
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + (await resp.text()).slice(0, 120));
    return { path: path, url: `${api.url}/storage/v1/object/public/${DOCS_BUCKET}/${path}` };
  }

  window.nxPrestamoSubirDoc = async function (id, input, tipo) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!/^image\//.test(file.type) && !/pdf$/i.test(file.type || '') && !/\.(jpg|jpeg|png|webp|pdf|heic)$/i.test(file.name || '')) {
      toast('err', 'Archivo no válido', 'Sube una imagen o PDF'); input.value = ''; return;
    }
    if (_docSubiendo) return;
    _docSubiendo = true;
    const p = _prestamos.find(x => String(x.id) === String(id));
    toast('ok', 'Subiendo documento…', file.name);
    try {
      const r = await subirDocPrestamo(id, file);
      const arr = Array.isArray(p.documentos) ? p.documentos.slice() : [];
      arr.push({ nombre: file.name, tipo: tipo || 'otro', url: r.url, path: r.path, mime: file.type || '', fecha: hoy() });
      await getAPI().patch('prestamos', 'id=eq.' + id, { documentos: arr });
      p.documentos = arr;
      toast('ok', 'Documento guardado', file.name);
      window.nxPrestamoDocs(id);
    } catch (e) {
      toast('err', 'No se pudo subir el documento', String(e && e.message || e).slice(0, 90));
    }
    _docSubiendo = false;
    try { input.value = ''; } catch (e) {}
  };

  window.nxPrestamoBorrarDoc = async function (id, idx) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    const arr = Array.isArray(p.documentos) ? p.documentos.slice() : [];
    const doc = arr[idx]; if (!doc) return;
    if (!confirm('¿Eliminar el documento "' + (doc.nombre || '') + '"?')) return;
    arr.splice(idx, 1);
    try {
      await getAPI().patch('prestamos', 'id=eq.' + id, { documentos: arr });
      p.documentos = arr;
      // Intentar borrar el archivo del storage (sin bloquear si falla)
      try {
        const api = getAPI();
        if (doc.path && api) await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${doc.path}`, { method: 'DELETE', headers: { 'apikey': api.key, 'Authorization': 'Bearer ' + api.key } });
      } catch (e) {}
      toast('ok', 'Documento eliminado');
      window.nxPrestamoDocs(id);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  window.nxPrestamoDocs = function (id) {
    const p = _prestamos.find(x => String(x.id) === String(id)); if (!p) return;
    cerrarModal('nxPrDocs');
    const docs = Array.isArray(p.documentos) ? p.documentos : [];
    const tiles = DOC_TIPOS.map(t => `
      <label style="flex:1 1 70px;min-width:70px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:11px 6px;text-align:center">
        <input type="file" accept="image/*,.pdf" style="display:none" onchange="window.nxPrestamoSubirDoc('${id}',this,'${t.k}')">
        <i class="ti ${t.ic}" style="font-size:20px;color:#2563eb"></i>
        <span style="font-size:10px;font-weight:700;color:#475569;line-height:1.1">${t.lbl}</span>
      </label>`).join('');
    const lista = docs.length ? docs.map((d, i) => {
      const tlbl = (DOC_TIPOS.find(t => t.k === d.tipo) || {}).lbl || 'Documento';
      return `<div style="display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid #f1f5f9">
          <i class="ti ${/pdf/i.test(d.mime || d.url || '') ? 'ti-file-type-pdf' : 'ti-photo'}" style="font-size:18px;color:#475569"></i>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.nombre || tlbl)}</div>
            <div style="font-size:10px;color:#475569">${esc(tlbl)} · ${esc((d.fecha || '').slice(0, 10))}</div>
          </div>
          <button class="btn bsm bghost" type="button" onclick="window.nxVerComprobante && window.nxVerComprobante('${esc(d.url)}')" title="Ver"><i class="ti ti-eye" style="color:#2563eb"></i></button>
          <button class="btn bsm bghost" type="button" onclick="window.nxPrestamoBorrarDoc('${id}',${i})" title="Eliminar"><i class="ti ti-trash" style="color:#dc2626"></i></button>
        </div>`;
    }).join('') : '<div style="color:#475569;font-size:11px;padding:14px;text-align:center">Sin documentos. Toca un tipo arriba para subir.</div>';
    const ov = document.createElement('div'); ov.id = 'nxPrDocs'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:86vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-folder"></i> Documentos — ${esc((p.nombre || '').split(' ')[0] || '')}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPrDocs').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">Sube cédula, contrato firmado, garantías u otros archivos (imágenes o PDF).</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${tiles}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:4px 0 4px">ARCHIVOS (${docs.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${lista}</div>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };

  // ── Estilos del formulario + tile del dashboard ──
  function inyectarCSS() {
    if (document.getElementById('nxPrestamosCSS')) return;
    const st = document.createElement('style'); st.id = 'nxPrestamosCSS';
    st.textContent = '.nxPrForm .fr{margin-bottom:10px;min-width:0}.nxPrForm .fr>label{font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px}.nxPrForm .fr input,.nxPrForm .fr select,.nxPrForm .fr textarea{width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none;background:#fff;color:#1e293b;font-family:inherit}.nxPrForm .fr input:focus,.nxPrForm .fr select:focus,.nxPrForm .fr textarea:focus{border-color:#3b82f6}.nxPrForm .fr-row{display:flex;gap:8px;flex-wrap:wrap}.nxPrForm .fr-row>.fr{flex:1 1 132px}.nxPrActs{display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:6px}.nxPrActs>.nxPrAcc{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;min-width:0;height:54px;padding:6px 3px;margin:0;font-family:inherit;font-size:10.5px;line-height:1.1;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;color:#475569;cursor:pointer;transition:opacity .15s}.nxPrActs>.nxPrAcc i{font-size:17px;flex:0 0 auto;margin:0;color:#475569}.nxPrActs>.nxPrAcc:active{opacity:.6}.nxPrActs>.nxPrAcc.wa{border-color:#bbf7d0;background:#f0fdf4;color:#16a34a}.nxPrActs>.nxPrAcc.wa i{color:#16a34a}.nxPrActs>.nxPrAcc.del{color:#dc2626}.nxPrActs>.nxPrAcc.del i{color:#dc2626}.nxPrPagar.nxPrPagar{display:flex;width:fit-content;min-width:0;min-height:0;height:auto;margin:0 auto 8px;padding:6px 18px;font-size:11.5px;line-height:1;align-items:center;gap:5px}.nxPrPagar.nxPrPagar i{font-size:14px}.nxMeGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.nxMeCard{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;cursor:pointer;font-family:inherit;box-shadow:0 1px 3px rgba(0,0,0,.04);transition:box-shadow .15s,opacity .15s}.nxMeCard:hover{box-shadow:0 6px 18px rgba(0,0,0,.1)}.nxMeCard:active{opacity:.85}.nxMeIco{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:25px;flex:0 0 auto}.nxMeTxt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.nxMeNom{font-size:14.5px;font-weight:800;color:#1e293b}.nxMeDesc{font-size:11px;color:#475569;line-height:1.25}.nxMeArr{color:#cbd5e1;font-size:18px;flex:0 0 auto}.nxBack{display:inline-flex;align-items:center;gap:4px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;border-radius:9px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;flex:0 0 auto}.nxBack i{font-size:15px}.nxBack:active{opacity:.65}.mt:has(.nxBack){gap:8px}';
    document.head.appendChild(st);
  }

  function inyectarTile() {
    if (document.getElementById('qaMultiempresa')) return true;
    if (!esAdmin()) return false;
    const vDash = document.getElementById('v-dashboard');
    if (!vDash) return false;
    const qa = vDash.querySelector('.qa');
    if (!qa || !qa.parentElement) return false;
    const btn = document.createElement('div');
    btn.className = 'qa'; btn.id = 'qaMultiempresa';
    btn.setAttribute('onclick', 'window.nxAbrirMultiempresa && window.nxAbrirMultiempresa()');
    btn.innerHTML = '<span class="qa-i"><i class="ti ti-building-skyscraper qa-ico c-esmeralda"></i></span><div class="qa-l">Multiempresa</div>';
    qa.parentElement.appendChild(btn);
    return true;
  }

  function init() { inyectarCSS(); let n = 0; const t = function () { n++; if (inyectarTile()) return; if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  try { window.addEventListener('nexus:reinit', function () { try { inyectarTile(); } catch (e) {} }); } catch (e) {}
})();

/* ════════════════════════════════════════════════════════════════════
   MÓDULO: COMPRA Y VENTA DE VEHÍCULOS (dentro de Multiempresa · admin)
   Registro del vehículo + costo de compra, gastos de reacondicionamiento
   que se van sumando, costo total, precio de venta (margen monto/%),
   acto de venta imprimible, documentos y configuración.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__NX_VEHICULOS__) return;
  window.__NX_VEHICULOS__ = true;

  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esAdmin() { try { return (typeof sesion !== 'undefined') && sesion && sesion.rol === 'admin'; } catch (e) { try { return window.sesion && window.sesion.rol === 'admin'; } catch (_) { return false; } } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function fmt(n) { return 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function toast(t, m, s) { try { if (window.toast) window.toast(t, m, s); } catch (e) {} }
  function cerrarModal(id) { const o = document.getElementById(id); if (o) o.remove(); }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function parseMoney(v) { try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(v)) || 0; } catch (e) {} return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
  function nomAdmin() { try { return (window.sesion && window.sesion.nom) || 'Admin'; } catch (e) { return 'Admin'; } }
  function scanMoney(el) { try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(el); } catch (e) {} }
  function kpi(lbl, v, col) { return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px 8px"><div style="font-size:9.5px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.3px">${esc(lbl)}</div><div style="font-size:14px;font-weight:800;color:${col || '#1e293b'};margin-top:2px">${v}</div></div>`; }

  function numLetras(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return 'CERO';
    const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
    const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    function m100(x) { if (x <= 20) return U[x]; if (x < 30) return 'VEINTI' + U[x - 20]; const d = Math.floor(x / 10), u = x % 10; return D[d] + (u ? ' Y ' + U[u] : ''); }
    function m1000(x) { if (x === 100) return 'CIEN'; const c = Math.floor(x / 100), r = x % 100; return ((c ? C[c] + ' ' : '') + (r ? m100(r) : '')).trim(); }
    let t = ''; const mill = Math.floor(n / 1000000), miles = Math.floor((n % 1000000) / 1000), cien = n % 1000;
    if (mill) t += (mill === 1 ? 'UN MILLÓN' : m1000(mill) + ' MILLONES') + ' ';
    if (miles) t += (miles === 1 ? 'MIL' : m1000(miles) + ' MIL') + ' ';
    if (cien) t += m1000(cien);
    return t.trim();
  }
  function fechaLarga(d) {
    try { const dt = new Date(String(d || hoy()).slice(0, 10) + 'T12:00:00'); const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']; return dt.getDate() + ' días del mes de ' + M[dt.getMonth()] + ' del año ' + dt.getFullYear(); } catch (e) { return String(d || ''); }
  }

  let _vehiculos = [];
  let _gastosByVeh = {};
  let _vhCfg = {};
  let _vhFiltro = 'todos';

  function gastosDe(v) { return _gastosByVeh[v.id] || []; }
  function totalGastos(v) { return gastosDe(v).reduce((s, x) => s + Number(x.costo || 0), 0); }
  function costoTotal(v) { return Number(v.compra_precio || 0) + totalGastos(v); }
  function gananciaDe(v) { return Number(v.precio_venta || 0) > 0 ? Number(v.precio_venta || 0) - costoTotal(v) : 0; }
  function margenPctDe(v) { const c = costoTotal(v); return (c > 0 && Number(v.precio_venta || 0) > 0) ? (gananciaDe(v) / c * 100) : 0; }
  function tituloVeh(v) { return [v.marca, v.modelo, v.anio].filter(Boolean).join(' ') || 'Vehículo'; }

  async function cargarVehiculos() {
    _vehiculos = await getAPI().get('vehiculos', 'select=*&order=created_at.desc') || [];
    const g = await getAPI().get('vehiculo_gastos', 'select=*&order=fecha.asc') || [];
    _gastosByVeh = {};
    g.forEach(x => { (_gastosByVeh[x.vehiculo_id] = _gastosByVeh[x.vehiculo_id] || []).push(x); });
    try { const c = await getAPI().get('vehiculos_config', 'select=*&id=eq.1'); _vhCfg = (c && c[0]) || {}; } catch (e) { _vhCfg = {}; }
  }

  // ── Vista / lista ──
  function ensureView() {
    let v = document.getElementById('v-vehiculos');
    if (v) return v;
    const dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-vehiculos';
    dash.parentElement.appendChild(v);
    return v;
  }

  function cardHTML(v) {
    const ct = costoTotal(v), gan = gananciaDe(v), pv = Number(v.precio_venta || 0);
    const vendido = v.estado === 'vendido';
    const badge = vendido
      ? '<span style="font-size:9px;font-weight:800;color:#16a34a;background:#dcfce7;padding:2px 8px;border-radius:20px">VENDIDO</span>'
      : '<span style="font-size:9px;font-weight:800;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:20px">INVENTARIO</span>';
    const sub = [v.color, v.placa ? 'Placa ' + v.placa : '', v.chasis ? 'Chasis ' + (v.chasis || '').slice(-6) : ''].filter(Boolean).join(' · ');
    return `<div class="nxVhCard" data-busca="${esc((tituloVeh(v) + ' ' + (v.placa || '') + ' ' + (v.chasis || '') + ' ' + (v.comprador_nombre || '')).toLowerCase())}" onclick="window.nxVehVer('${v.id}')" style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:9px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.04)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
        <div style="min-width:0"><div style="font-size:14px;font-weight:800;color:#1e293b">${esc(tituloVeh(v))}</div><div style="font-size:11px;color:#475569">${esc(sub || 'Sin datos')}</div></div>
        ${badge}
      </div>
      <div style="display:flex;justify-content:space-between;gap:6px;font-size:11px">
        <span style="color:#475569">Costo: <b style="color:#0f172a">${fmt(ct)}</b></span>
        ${pv > 0 ? `<span style="color:#475569">Venta: <b style="color:#2563eb">${fmt(pv)}</b></span><span style="color:${gan >= 0 ? '#16a34a' : '#dc2626'};font-weight:800">${gan >= 0 ? '+' : ''}${fmt(gan)}</span>` : '<span style="color:#475569">Precio sin definir</span>'}
      </div>
    </div>`;
  }

  function renderLista(view) {
    const enInv = _vehiculos.filter(v => v.estado !== 'vendido');
    const vend = _vehiculos.filter(v => v.estado === 'vendido');
    const invertido = enInv.reduce((s, v) => s + costoTotal(v), 0);
    const ganReal = vend.reduce((s, v) => s + gananciaDe(v), 0);
    const ganPot = enInv.reduce((s, v) => s + gananciaDe(v), 0);
    const f = _vhFiltro;
    const lista = _vehiculos.filter(v => f === 'inventario' ? v.estado !== 'vendido' : f === 'vendidos' ? v.estado === 'vendido' : true);
    const chip = (k, l) => `<button type="button" class="btn bsm${_vhFiltro === k ? ' bc1' : ''}" onclick="window.nxVehFiltro('${k}')" style="font-size:10px;padding:5px 10px">${l}</button>`;
    const cards = _vehiculos.length === 0
      ? '<div style="text-align:center;padding:36px;color:#475569;font-size:13px">Aún no hay vehículos.<br>Toca <b>"Nuevo"</b> para registrar uno.</div>'
      : (lista.length === 0 ? '<div style="text-align:center;padding:30px;color:#475569;font-size:12px">Ningún vehículo en este filtro.</div>' : lista.map(cardHTML).join(''));
    view.innerHTML = `
      <div class="nc">
        <div class="ch">
          <div><div class="ct"><i class="ti ti-car"></i> Compra y Venta de Vehículos</div><div class="ct-s">Multiempresa · solo el administrador</div></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn bsm" type="button" onclick="window.nxAbrirMultiempresa()"><i class="ti ti-arrow-left"></i> Volver</button>
            <button class="btn bsm" type="button" onclick="window.nxVehConfig()" title="Datos para el acto de venta"><i class="ti ti-settings"></i> Config</button>
            <button class="btn bsm bc4" type="button" onclick="window.nxVehExportar()"><i class="ti ti-file-spreadsheet"></i> Excel</button>
            <button class="btn bsm bc1" type="button" onclick="window.nxVehNuevo()"><i class="ti ti-plus"></i> Nuevo</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin-bottom:10px">
          ${kpi('Vehículos', _vehiculos.length, '#1e293b')}
          ${kpi('En inventario', enInv.length, '#2563eb')}
          ${kpi('Invertido', fmt(invertido), '#dc2626')}
          ${kpi('Ganancia potencial', fmt(ganPot), ganPot >= 0 ? '#16a34a' : '#dc2626')}
          ${kpi('Ganancia realizada', fmt(ganReal), '#059669')}
        </div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">${chip('todos', 'Todos')}${chip('inventario', 'En inventario')}${chip('vendidos', 'Vendidos')}</div>
        <div style="position:relative;margin-bottom:10px">
          <i class="ti ti-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#475569;font-size:15px;pointer-events:none"></i>
          <input type="text" id="nxVhBuscar" placeholder="Buscar por marca, placa, chasis o comprador..." autocomplete="off" oninput="window.nxVehBuscar(this.value)" style="width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b">
        </div>
        <div id="nxVhLista">${cards}</div>
      </div>`;
  }

  window.nxVehFiltro = function (k) { _vhFiltro = k; const v = document.getElementById('v-vehiculos'); if (v) renderLista(v); };
  window.nxVehBuscar = function (q) {
    const t = String(q || '').trim().toLowerCase();
    document.querySelectorAll('#nxVhLista .nxVhCard').forEach(c => { const b = c.getAttribute('data-busca') || ''; c.style.display = (!t || b.includes(t)) ? '' : 'none'; });
  };

  window.nxAbrirVehiculos = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    const view = ensureView(); if (!view) return;
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const pt = document.getElementById('pttl'); if (pt) pt.textContent = 'VEHÍCULOS';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:8px;font-weight:600">Cargando vehículos...</div></div></div>';
    try { await cargarVehiculos(); renderLista(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudieron cargar los vehículos.<br><span style="font-size:11px;color:#475569">' + esc(String(e && e.message || e)) + '</span></div></div>'; }
  };

  // ── Formulario nuevo/editar ──
  window.nxVehNuevo = function () { abrirForm(null); };
  window.nxVehEditar = function (id) { const v = _vehiculos.find(x => String(x.id) === String(id)); if (v) abrirForm(v); };

  function fld(id, lbl, value, ph, type, extra) {
    return `<div class="fr"><label>${lbl}</label><input id="${id}" ${type === 'money' ? 'data-nx-money inputmode="numeric"' : type === 'date' ? 'type="date"' : type === 'number' ? 'type="number" inputmode="numeric"' : 'class="no-upper"'} value="${esc(value == null ? '' : value)}" placeholder="${ph || ''}" ${extra || ''}></div>`;
  }

  function abrirForm(v) {
    cerrarModal('nxVhModal');
    const e = v || {};
    const ov = document.createElement('div'); ov.id = 'nxVhModal'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:480px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-car"></i> ${v ? 'Editar vehículo' : 'Nuevo vehículo'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhModal').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">DATOS DEL VEHÍCULO</div>
          <div class="fr-row">${fld('vhMarca', 'Marca', e.marca, 'Toyota')}${fld('vhModelo', 'Modelo', e.modelo, 'Corolla')}</div>
          <div class="fr-row">${fld('vhAnio', 'Año', e.anio, '2018', 'number')}${fld('vhColor', 'Color', e.color, 'Gris')}</div>
          <div class="fr-row">${fld('vhTipo', 'Tipo', e.tipo, 'Sedán / Jeepeta')}${fld('vhPlaca', 'Placa', e.placa, 'A000000')}</div>
          <div class="fr-row">${fld('vhChasis', 'Chasis (VIN)', e.chasis, 'No. de chasis')}${fld('vhMotor', 'No. de motor', e.no_motor, 'No. de motor')}</div>
          ${fld('vhMatricula', 'No. de matrícula', e.no_matricula, 'No. de matrícula')}
          <div class="fr"><label>Descripción / observaciones</label><textarea id="vhDesc" class="no-upper" rows="2" placeholder="Detalles del vehículo">${esc(e.descripcion || '')}</textarea></div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">COMPRA</div>
          <div class="fr-row">${fld('vhCompraPrecio', 'Precio de compra', e.compra_precio ? Math.round(e.compra_precio) : '', '0', 'money')}${fld('vhCompraFecha', 'Fecha de compra', e.compra_fecha || hoy(), '', 'date')}</div>
          <div class="fr-row">${fld('vhVendNom', 'Vendedor (a quién compró)', e.vendedor_nombre, 'Nombre')}${fld('vhVendCed', 'Cédula del vendedor', e.vendedor_cedula, '000-0000000-0')}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxVhModal').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxVehGuardar('${v ? v.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  }

  window.nxVehGuardar = async function (id) {
    const body = {
      marca: (val('vhMarca') || '').trim() || null,
      modelo: (val('vhModelo') || '').trim() || null,
      anio: parseInt(val('vhAnio'), 10) || null,
      color: (val('vhColor') || '').trim() || null,
      tipo: (val('vhTipo') || '').trim() || null,
      placa: (val('vhPlaca') || '').trim() || null,
      chasis: (val('vhChasis') || '').trim() || null,
      no_motor: (val('vhMotor') || '').trim() || null,
      no_matricula: (val('vhMatricula') || '').trim() || null,
      descripcion: (val('vhDesc') || '').trim() || null,
      compra_precio: parseMoney(val('vhCompraPrecio')),
      compra_fecha: val('vhCompraFecha') || hoy(),
      vendedor_nombre: (val('vhVendNom') || '').trim() || null,
      vendedor_cedula: (val('vhVendCed') || '').trim() || null
    };
    if (!body.marca && !body.modelo) { toast('err', 'Pon al menos la marca o el modelo'); return; }
    try {
      if (id) { await getAPI().patch('vehiculos', 'id=eq.' + id, body); }
      else { body.created_by_name = nomAdmin(); await getAPI().post('vehiculos', body); }
      toast('ok', id ? 'Vehículo actualizado' : 'Vehículo registrado');
      cerrarModal('nxVhModal');
      await cargarVehiculos();
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  // ── Detalle ──
  window.nxVehVer = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    cerrarModal('nxVhDet');
    const gastos = gastosDe(v).slice().sort((a, b) => (a.fecha || '') < (b.fecha || '') ? -1 : 1);
    const ct = costoTotal(v), pv = Number(v.precio_venta || 0), gan = gananciaDe(v), mp = margenPctDe(v);
    const vendido = v.estado === 'vendido';
    const datos = [
      ['Año', v.anio], ['Color', v.color], ['Tipo', v.tipo], ['Placa', v.placa],
      ['Chasis', v.chasis], ['Motor', v.no_motor], ['Matrícula', v.no_matricula]
    ].filter(x => x[1]).map(x => `<div style="font-size:11px"><span style="color:#475569">${x[0]}:</span> <b style="color:#1e293b">${esc(x[1])}</b></div>`).join('');
    const gastosHTML = gastos.length === 0
      ? '<div style="color:#475569;font-size:11px;padding:10px">Sin gastos de reacondicionamiento aún</div>'
      : gastos.map(g => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><div><b style="color:#0f172a">${esc(g.concepto || 'Gasto')}</b> <span style="color:#475569">${(g.fecha || '').slice(0, 10)}</span>${g.nota ? `<div style="color:#475569;font-size:10px">${esc(g.nota)}</div>` : ''}</div><div style="display:flex;align-items:center;gap:6px"><b style="color:#dc2626">${fmt(g.costo)}</b><button class="btn bsm bghost" type="button" onclick="window.nxVehDelGasto('${g.id}','${id}')" title="Eliminar"><i class="ti ti-trash" style="color:#dc2626"></i></button></div></div>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxVhDet'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:480px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-car"></i> ${esc(tituloVeh(v))}</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhDet').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px">${datos || '<span style="font-size:11px;color:#475569">Sin datos adicionales</span>'}</div>
            ${vendido ? '<span style="font-size:9px;font-weight:800;color:#16a34a;background:#dcfce7;padding:3px 9px;border-radius:20px">VENDIDO</span>' : '<span style="font-size:9px;font-weight:800;color:#2563eb;background:#eff6ff;padding:3px 9px;border-radius:20px">INVENTARIO</span>'}
          </div>
          ${v.descripcion ? `<div style="font-size:11px;color:#475569;margin-bottom:8px;background:#f8fafc;border-radius:8px;padding:7px 9px">📝 ${esc(v.descripcion)}</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
            ${kpi('Compra', fmt(v.compra_precio), '#2563eb')}${kpi('Reacond.', fmt(totalGastos(v)), '#ea580c')}${kpi('Costo total', fmt(ct), '#0f172a')}
          </div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:8px 0 4px">REACONDICIONAMIENTO (${gastos.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px">${gastosHTML}</div>
          ${!vendido ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:10px">
            <div style="display:flex;gap:6px;margin-bottom:6px"><input id="vhGConcepto" class="no-upper" placeholder="Concepto (pintura, interior...)" style="flex:2;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;outline:none"><input id="vhGCosto" data-nx-money inputmode="numeric" placeholder="Costo" style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;outline:none"></div>
            <div style="display:flex;gap:6px"><input id="vhGFecha" type="date" value="${hoy()}" style="flex:0 0 auto;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;outline:none"><input id="vhGNota" class="no-upper" placeholder="Nota (opcional)" style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;outline:none"><button class="btn bc1 bsm" type="button" onclick="window.nxVehAddGasto('${id}')"><i class="ti ti-plus"></i></button></div>
          </div>` : ''}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:6px 0 4px">PRECIO DE VENTA</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px">
            ${!vendido ? `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;font-size:11px;color:#475569">Margen:
              <input id="vhMargenVal" inputmode="decimal" placeholder="0" value="${v.margen_valor ? Number(v.margen_valor) : ''}" style="width:74px;padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;outline:none">
              <select id="vhMargenTipo" style="padding:7px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;background:#fff"><option value="monto"${v.margen_tipo !== 'porcentaje' ? ' selected' : ''}>RD$</option><option value="porcentaje"${v.margen_tipo === 'porcentaje' ? ' selected' : ''}>%</option></select>
              <button class="btn bsm bghost" type="button" onclick="window.nxVehAplicarMargen('${id}')">Calcular</button></div>
              <div style="display:flex;gap:6px;align-items:center"><input id="vhPrecioVenta" data-nx-money inputmode="numeric" placeholder="Precio de venta" value="${pv ? Math.round(pv) : ''}" oninput="window.nxVehPreviewGanancia('${id}')" style="flex:1;min-width:0;padding:10px;border:1.5px solid #cbd5e1;border-radius:10px;font-size:15px;font-weight:700;outline:none"><button class="btn bc1 bsm" type="button" onclick="window.nxVehGuardarPrecio('${id}')"><i class="ti ti-device-floppy"></i> Guardar</button></div>
              <div id="vhGanPrev" style="font-size:11px;margin-top:6px;color:${gan >= 0 ? '#16a34a' : '#dc2626'};font-weight:700">${pv > 0 ? 'Ganancia: ' + fmt(gan) + ' · margen ' + mp.toFixed(1) + '%' : 'Define un precio para ver la ganancia'}</div>`
        : `<div style="display:flex;justify-content:space-between;font-size:12px"><span style="color:#475569">Precio de venta</span><b style="color:#2563eb">${fmt(pv)}</b></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:4px"><span style="color:#475569">Ganancia</span><b style="color:${gan >= 0 ? '#16a34a' : '#dc2626'}">${fmt(gan)} · ${mp.toFixed(1)}%</b></div>${v.comprador_nombre ? `<div style="font-size:11px;color:#475569;margin-top:6px">Comprador: <b>${esc(v.comprador_nombre)}</b>${v.venta_fecha ? ' · ' + esc(v.venta_fecha) : ''}</div>` : ''}`}
          </div>
        </div>
        <div style="border-top:1px solid #f1f5f9;padding-top:10px;margin-top:10px">
          ${!vendido ? `<button class="btn bc1 nxPrPagar" type="button" onclick="window.nxVehVender('${id}')"><i class="ti ti-cash"></i> Registrar venta</button>` : `<div style="text-align:center;margin-bottom:8px"><button class="btn bsm" type="button" onclick="window.nxVehReabrir('${id}')"><i class="ti ti-rotate"></i> Volver a inventario</button></div>`}
          <div class="nxPrActs">
            <button class="nxPrAcc" type="button" onclick="window.nxVehActoVenta('${id}')"><i class="ti ti-file-certificate"></i> Acto venta</button>
            <button class="nxPrAcc" type="button" onclick="window.nxVehDocs('${id}')"><i class="ti ti-folder"></i> Docs${Array.isArray(v.documentos) && v.documentos.length ? ' (' + v.documentos.length + ')' : ''}</button>
            <button class="nxPrAcc" type="button" onclick="window.nxVehEditar('${id}')"><i class="ti ti-edit"></i> Editar</button>
            <button class="nxPrAcc del" type="button" onclick="window.nxVehBorrar('${id}')"><i class="ti ti-trash"></i> Borrar</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  };

  window.nxVehPreviewGanancia = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const pv = parseMoney(val('vhPrecioVenta')); const ct = costoTotal(v); const gan = pv - ct; const mp = ct > 0 ? gan / ct * 100 : 0;
    const el = document.getElementById('vhGanPrev'); if (!el) return;
    el.style.color = gan >= 0 ? '#16a34a' : '#dc2626';
    el.textContent = pv > 0 ? ('Ganancia: ' + fmt(gan) + ' · margen ' + mp.toFixed(1) + '%') : 'Define un precio para ver la ganancia';
  };

  window.nxVehAplicarMargen = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const ct = costoTotal(v);
    const tipo = val('vhMargenTipo') || 'monto';
    const mv = Number(String(val('vhMargenVal') || '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
    const precio = tipo === 'porcentaje' ? Math.round(ct * (1 + mv / 100)) : Math.round(ct + mv);
    const inp = document.getElementById('vhPrecioVenta');
    if (inp) { inp.value = precio.toLocaleString('en-US'); }
    window.nxVehPreviewGanancia(id);
  };

  window.nxVehGuardarPrecio = async function (id) {
    const precio = parseMoney(val('vhPrecioVenta'));
    const tipo = val('vhMargenTipo') || 'monto';
    const mv = Number(String(val('vhMargenVal') || '').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, { precio_venta: precio, margen_tipo: tipo, margen_valor: mv });
      const v = _vehiculos.find(x => String(x.id) === String(id)); if (v) { v.precio_venta = precio; v.margen_tipo = tipo; v.margen_valor = mv; }
      toast('ok', 'Precio de venta guardado', fmt(precio));
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  window.nxVehAddGasto = async function (id) {
    const concepto = (val('vhGConcepto') || '').trim();
    const costo = parseMoney(val('vhGCosto'));
    if (!concepto) { toast('err', 'Pon el concepto del gasto'); return; }
    if (costo <= 0) { toast('err', 'Pon el costo'); return; }
    try {
      await getAPI().post('vehiculo_gastos', { vehiculo_id: id, concepto: concepto, costo: costo, fecha: val('vhGFecha') || hoy(), nota: (val('vhGNota') || '').trim() || null, created_by_name: nomAdmin() });
      toast('ok', 'Gasto agregado', concepto + ' · ' + fmt(costo));
      await cargarVehiculos();
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo agregar', String(e && e.message || e)); }
  };

  window.nxVehDelGasto = async function (gid, vid) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await getAPI().del('vehiculo_gastos', 'id=eq.' + gid);
      toast('ok', 'Gasto eliminado');
      await cargarVehiculos();
      window.nxVehVer(vid);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  window.nxVehBorrar = async function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    if (!confirm('¿Eliminar el vehículo "' + tituloVeh(v) + '" y todos sus gastos? Esta acción no se puede deshacer.')) return;
    try {
      await getAPI().del('vehiculos', 'id=eq.' + id);
      toast('ok', 'Vehículo eliminado');
      cerrarModal('nxVhDet');
      await cargarVehiculos();
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  window.nxVehReabrir = async function (id) {
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, { estado: 'inventario' });
      const v = _vehiculos.find(x => String(x.id) === String(id)); if (v) v.estado = 'inventario';
      toast('ok', 'Vehículo de vuelta en inventario');
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // ── Registrar venta (comprador) ──
  window.nxVehVender = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    cerrarModal('nxVhVenta');
    const ov = document.createElement('div'); ov.id = 'nxVhVenta'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-cash"></i> Registrar venta</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhVenta').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">${esc(tituloVeh(v))} · costo total ${fmt(costoTotal(v))}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">COMPRADOR</div>
          ${fld('vsNom', 'Nombre del comprador', v.comprador_nombre, 'Nombre Apellido')}
          <div class="fr-row">${fld('vsCed', 'Cédula', v.comprador_cedula, '000-0000000-0')}${fld('vsTel', 'Teléfono', v.comprador_telefono, '809-000-0000')}</div>
          ${fld('vsDir', 'Dirección', v.comprador_direccion, 'Calle, sector, ciudad')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">VENTA</div>
          <div class="fr-row">${fld('vsPrecio', 'Precio de venta', v.precio_venta ? Math.round(v.precio_venta) : '', '0', 'money')}${fld('vsFecha', 'Fecha de venta', v.venta_fecha || hoy(), '', 'date')}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxVhVenta').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxVehConfirmarVenta('${id}')"><i class="ti ti-check"></i> Confirmar venta</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  };

  window.nxVehConfirmarVenta = async function (id) {
    const precio = parseMoney(val('vsPrecio'));
    if (precio <= 0) { toast('err', 'Pon el precio de venta'); return; }
    const body = {
      estado: 'vendido', precio_venta: precio, venta_fecha: val('vsFecha') || hoy(),
      comprador_nombre: (val('vsNom') || '').trim() || null,
      comprador_cedula: (val('vsCed') || '').trim() || null,
      comprador_telefono: (val('vsTel') || '').trim() || null,
      comprador_direccion: (val('vsDir') || '').trim() || null
    };
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, body);
      Object.assign(_vehiculos.find(x => String(x.id) === String(id)) || {}, body);
      toast('ok', 'Venta registrada', fmt(precio));
      cerrarModal('nxVhVenta');
      await cargarVehiculos();
      window.nxVehVer(id);
      const view = document.getElementById('v-vehiculos'); if (view) renderLista(view);
    } catch (e) { toast('err', 'No se pudo registrar la venta', String(e && e.message || e)); }
  };

  // ── Acto de venta (documento imprimible / PDF) ──
  window.nxVehActoVenta = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const c = _vhCfg || {};
    const precio = Number(v.precio_venta || 0);
    const vendNom = (c.vendedor_nombre && c.vendedor_nombre.trim()) || nomAdmin();
    const vendDet = [c.vendedor_cedula ? 'portador(a) de la cédula No. <b>' + esc(c.vendedor_cedula) + '</b>' : '', c.vendedor_direccion ? 'domiciliado(a) en ' + esc(c.vendedor_direccion) : '', c.vendedor_telefono ? 'Tel. ' + esc(c.vendedor_telefono) : ''].filter(Boolean).join(', ');
    const compDet = [v.comprador_cedula ? 'portador(a) de la cédula No. <b>' + esc(v.comprador_cedula) + '</b>' : '', v.comprador_direccion ? 'domiciliado(a) en ' + esc(v.comprador_direccion) : '', v.comprador_telefono ? 'Tel. ' + esc(v.comprador_telefono) : ''].filter(Boolean).join(', ');
    const descFilas = [['Marca', v.marca], ['Modelo', v.modelo], ['Año', v.anio], ['Color', v.color], ['Tipo', v.tipo], ['Chasis (VIN)', v.chasis], ['No. de motor', v.no_motor], ['Placa', v.placa], ['No. de matrícula', v.no_matricula]].filter(x => x[1]).map(x => `<tr><td style="color:#555;width:42%">${x[0]}</td><td><b>${esc(x[1])}</b></td></tr>`).join('');
    const firmaTestigo = (nom, ced) => nom ? `<div class="firma" style="max-width:48%">${esc(nom)}<br><span style="color:#777;font-size:11px">Testigo${ced ? '<br>Céd. ' + esc(ced) : ''}</span></div>` : '';
    const testigosHTML = (c.testigo1_nombre || c.testigo2_nombre) ? `<div style="font-size:12px;text-align:center;color:#475569;margin:36px 0 0;font-weight:700">TESTIGOS</div><div class="firmas" style="margin-top:40px;justify-content:space-around">${firmaTestigo(c.testigo1_nombre, c.testigo1_cedula)}${firmaTestigo(c.testigo2_nombre, c.testigo2_cedula)}</div>` : '';
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acto de venta - ${esc(tituloVeh(v))}</title>
      <style>body{font-family:'Times New Roman',Georgia,serif;color:#1a1a1a;max-width:660px;margin:0 auto;padding:26px 22px;line-height:1.55;font-size:13.5px}h1{font-size:18px;text-align:center;margin:0 0 16px;letter-spacing:.5px}p{margin:9px 0;text-align:justify}.parte{background:#f6f7f9;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;margin:10px 0;font-size:12.5px}table.veh{width:100%;border-collapse:collapse;margin:8px 0;font-size:12.5px}table.veh td{padding:5px 9px;border-bottom:1px solid #ececec}.firmas{display:flex;justify-content:space-between;gap:24px;margin-top:54px}.firma{flex:1;text-align:center;border-top:1.5px solid #1a1a1a;padding-top:6px;font-size:12px}.foot{color:#999;font-size:10.5px;text-align:center;margin-top:26px}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;background:#1e3a6e;margin:-26px -22px 16px;padding:11px 16px"><button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:15px;font-weight:700;cursor:pointer;font-family:Arial,sans-serif">&#10005; Cerrar</button><span style="color:#fff;font-size:11.5px;opacity:.85;font-family:Arial,sans-serif"></span></div>
        <h1>CONTRATO DE VENTA DE VEHÍCULO DE MOTOR</h1>
        <p><b>ENTRE:</b> De una parte, <b>${esc(vendNom)}</b>${vendDet ? ', ' + vendDet : ''}, quien en lo adelante se denominará <b>EL VENDEDOR</b>; y de la otra parte, <b>${esc(v.comprador_nombre || '____________________')}</b>${compDet ? ', ' + compDet : ''}, quien en lo adelante se denominará <b>EL COMPRADOR</b>.</p>
        <p><b>PRIMERO:</b> EL VENDEDOR declara ser el único y legítimo propietario del vehículo de motor que se describe a continuación:</p>
        <table class="veh">${descFilas || '<tr><td colspan="2" style="text-align:center;color:#888">Sin descripción</td></tr>'}</table>
        <p><b>SEGUNDO:</b> EL VENDEDOR, por medio del presente acto, VENDE, CEDE y TRANSFIERE con todas las garantías de derecho, a favor de EL COMPRADOR, el vehículo descrito anteriormente, por el precio convenido de <b>${fmt(precio)}</b> (<b>${numLetras(precio)} PESOS DOMINICANOS</b>).</p>
        <p><b>TERCERO:</b> EL VENDEDOR declara haber recibido de EL COMPRADOR el monto total acordado, otorgándole por medio del presente el más amplio y formal recibo de descargo y finiquito.</p>
        <p><b>CUARTO:</b> EL VENDEDOR transfiere a EL COMPRADOR todos los derechos de propiedad sobre el referido vehículo, declarando que el mismo se encuentra libre de toda carga, gravamen u oposición.</p>
        <p><b>QUINTO:</b> EL COMPRADOR declara aceptar la presente venta y recibir el vehículo en las condiciones físicas y mecánicas en que se encuentra, las cuales declara conocer.</p>
        <p>Hecho y firmado de buena fe, en dos (2) originales de un mismo tenor y efecto, uno para cada parte${testigosHTML ? ', ante los testigos que firman al pie' : ''}, en la República Dominicana, a los <b>${fechaLarga(v.venta_fecha || hoy())}</b>.</p>
        <div class="firmas">
          <div class="firma">EL VENDEDOR<br><span style="color:#777;font-size:11px">${esc(vendNom)}${c.vendedor_cedula ? '<br>Céd. ' + esc(c.vendedor_cedula) : ''}</span></div>
          <div class="firma">EL COMPRADOR<br><span style="color:#777;font-size:11px">${esc(v.comprador_nombre || '')}${v.comprador_cedula ? '<br>Céd. ' + esc(v.comprador_cedula) : ''}</span></div>
        </div>
        ${testigosHTML}
        ${c.abogado_nombre ? `<div style="margin-top:40px;border-top:1px dashed #bbb;padding-top:16px">
          <p style="font-size:12px"><b>LEGALIZACIÓN DE FIRMAS.</b> Yo, <b>${esc(c.abogado_nombre)}</b>, Abogado(a) Notario(a)${c.abogado_matricula ? ', con Matrícula del Colegio de Abogados de la República Dominicana (CARD) No. <b>' + esc(c.abogado_matricula) + '</b>' : ''}${c.abogado_cedula ? ', portador(a) de la cédula No. <b>' + esc(c.abogado_cedula) + '</b>' : ''}${c.abogado_telefono ? ', Tel. ' + esc(c.abogado_telefono) : ''}, CERTIFICO Y DOY FE de que las firmas que anteceden fueron puestas libre y voluntariamente en mi presencia por las partes contratantes, quienes me declararon que esas son las firmas que acostumbran usar en todos los actos de su vida pública y privada. En la República Dominicana, a los ${fechaLarga(v.venta_fecha || hoy())}.</p>
          <div class="firmas" style="margin-top:46px"><div class="firma" style="max-width:60%">${esc(c.abogado_nombre)}<br><span style="color:#777;font-size:11px">Abogado(a) Notario(a)${c.abogado_matricula ? '<br>CARD No. ' + esc(c.abogado_matricula) : ''}</span></div></div>
        </div>` : ''}
        <button class="noprint" onclick="window.print()" style="width:100%;padding:13px;margin-top:30px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:Arial,sans-serif">🖨️ Imprimir / Guardar PDF</button>
        <div class="foot">${esc(vendNom)} · Documento generado el ${hoy()}</div>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('err', 'Permite las ventanas emergentes para ver el acto de venta'); return; } w.document.write(html); w.document.close(); }
    catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };

  // ── Documentos del vehículo ──
  const DOCS_BUCKET = 'comprobantes';
  let _vhDocSubiendo = false;
  async function subirDocVeh(id, file) {
    const api = getAPI();
    if (!api || !api.url || !api.key) throw new Error('Sin conexión');
    let ext = '';
    if (file.name && file.name.includes('.')) ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ext) ext = (file.type && file.type.includes('png')) ? 'png' : (file.type && file.type.includes('pdf')) ? 'pdf' : 'jpg';
    const path = `vehiculos/${id}/${Date.now()}.${ext}`;
    const fd = new FormData(); fd.append('', file, 'doc.' + ext);
    const headers = { 'apikey': api.key, 'Authorization': 'Bearer ' + api.key };
    let resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'POST', headers, body: fd });
    if (!resp.ok && resp.status === 400) resp = await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${path}`, { method: 'PUT', headers, body: fd });
    if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + (await resp.text()).slice(0, 120));
    return { path: path, url: `${api.url}/storage/v1/object/public/${DOCS_BUCKET}/${path}` };
  }
  window.nxVehSubirDoc = async function (id, input, tipo) {
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (!/^image\//.test(file.type) && !/pdf$/i.test(file.type || '') && !/\.(jpg|jpeg|png|webp|pdf|heic)$/i.test(file.name || '')) { toast('err', 'Archivo no válido', 'Sube una imagen o PDF'); input.value = ''; return; }
    if (_vhDocSubiendo) return; _vhDocSubiendo = true;
    const v = _vehiculos.find(x => String(x.id) === String(id));
    toast('ok', 'Subiendo documento…', file.name);
    try {
      const r = await subirDocVeh(id, file);
      const arr = Array.isArray(v.documentos) ? v.documentos.slice() : [];
      arr.push({ nombre: file.name, tipo: tipo || 'otro', url: r.url, path: r.path, mime: file.type || '', fecha: hoy() });
      await getAPI().patch('vehiculos', 'id=eq.' + id, { documentos: arr });
      v.documentos = arr;
      toast('ok', 'Documento guardado', file.name);
      window.nxVehDocs(id);
    } catch (e) { toast('err', 'No se pudo subir', String(e && e.message || e).slice(0, 90)); }
    _vhDocSubiendo = false; try { input.value = ''; } catch (e) {}
  };
  window.nxVehBorrarDoc = async function (id, idx) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    const arr = Array.isArray(v.documentos) ? v.documentos.slice() : []; const doc = arr[idx]; if (!doc) return;
    if (!confirm('¿Eliminar el documento "' + (doc.nombre || '') + '"?')) return;
    arr.splice(idx, 1);
    try {
      await getAPI().patch('vehiculos', 'id=eq.' + id, { documentos: arr }); v.documentos = arr;
      try { const api = getAPI(); if (doc.path && api) await fetch(`${api.url}/storage/v1/object/${DOCS_BUCKET}/${doc.path}`, { method: 'DELETE', headers: { 'apikey': api.key, 'Authorization': 'Bearer ' + api.key } }); } catch (e) {}
      toast('ok', 'Documento eliminado'); window.nxVehDocs(id);
    } catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };
  const VH_DOC_TIPOS = [{ k: 'matricula', lbl: 'Matrícula', ic: 'ti-file-text' }, { k: 'acto', lbl: 'Acto firmado', ic: 'ti-file-certificate' }, { k: 'cedula', lbl: 'Cédula', ic: 'ti-id' }, { k: 'foto', lbl: 'Foto', ic: 'ti-photo' }, { k: 'otro', lbl: 'Otro', ic: 'ti-paperclip' }];
  window.nxVehDocs = function (id) {
    const v = _vehiculos.find(x => String(x.id) === String(id)); if (!v) return;
    cerrarModal('nxVhDocs');
    const docs = Array.isArray(v.documentos) ? v.documentos : [];
    const tiles = VH_DOC_TIPOS.map(t => `<label style="flex:1 1 64px;min-width:64px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;background:#f8fafc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:10px 5px;text-align:center"><input type="file" accept="image/*,.pdf" style="display:none" onchange="window.nxVehSubirDoc('${id}',this,'${t.k}')"><i class="ti ${t.ic}" style="font-size:19px;color:#2563eb"></i><span style="font-size:9.5px;font-weight:700;color:#475569;line-height:1.1">${t.lbl}</span></label>`).join('');
    const lista = docs.length ? docs.map((d, i) => { const tlbl = (VH_DOC_TIPOS.find(t => t.k === d.tipo) || {}).lbl || 'Documento'; return `<div style="display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid #f1f5f9"><i class="ti ${/pdf/i.test(d.mime || d.url || '') ? 'ti-file-type-pdf' : 'ti-photo'}" style="font-size:18px;color:#475569"></i><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(d.nombre || tlbl)}</div><div style="font-size:10px;color:#475569">${esc(tlbl)} · ${esc((d.fecha || '').slice(0, 10))}</div></div><button class="btn bsm bghost" type="button" onclick="window.nxVerComprobante && window.nxVerComprobante('${esc(d.url)}')" title="Ver"><i class="ti ti-eye" style="color:#2563eb"></i></button><button class="btn bsm bghost" type="button" onclick="window.nxVehBorrarDoc('${id}',${i})" title="Eliminar"><i class="ti ti-trash" style="color:#dc2626"></i></button></div>`; }).join('') : '<div style="color:#475569;font-size:11px;padding:14px;text-align:center">Sin documentos. Toca un tipo arriba para subir.</div>';
    const ov = document.createElement('div'); ov.id = 'nxVhDocs'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:86vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-folder"></i> Documentos — ${esc(tituloVeh(v))}</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhDocs').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">Matrícula, acto firmado, cédula del comprador, fotos u otros (imágenes o PDF).</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${tiles}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:4px 0 4px">ARCHIVOS (${docs.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${lista}</div>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };

  // ── Configuración (vendedor + abogado + testigos del acto de venta) ──
  window.nxVehConfig = function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    cerrarModal('nxVhCfg');
    const c = _vhCfg || {};
    const f = (id, lbl, value, ph) => `<div class="fr"><label>${lbl}</label><input id="${id}" class="no-upper" value="${esc(value || '')}" placeholder="${ph || ''}"></div>`;
    const ov = document.createElement('div'); ov.id = 'nxVhCfg'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:460px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-settings"></i> Datos del acto de venta</span><button class="nxBack" type="button" onclick="document.getElementById('nxVhCfg').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:10px">Estos datos salen en el acto de venta como EL VENDEDOR y su legalización.</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:2px 0 6px">VENDEDOR (usted)</div>
          ${f('vcVendNom', 'Nombre del vendedor', c.vendedor_nombre, 'Nombre o empresa')}
          <div class="fr-row">${f('vcVendCed', 'Cédula / RNC', c.vendedor_cedula, '000-0000000-0')}${f('vcVendTel', 'Teléfono', c.vendedor_telefono, '809-000-0000')}</div>
          ${f('vcVendDir', 'Dirección', c.vendedor_direccion, 'Calle, sector, ciudad')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">ABOGADO (legalización)</div>
          ${f('vcAboNom', 'Nombre del abogado(a)', c.abogado_nombre, 'Lic. Nombre Apellido')}
          <div class="fr-row">${f('vcAboCed', 'Cédula', c.abogado_cedula, '000-0000000-0')}${f('vcAboMat', 'Matrícula (CARD)', c.abogado_matricula, 'No. de matrícula')}</div>
          ${f('vcAboTel', 'Teléfono / Estudio', c.abogado_telefono, '809-000-0000')}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:12px 0 6px">TESTIGOS (opcional)</div>
          <div class="fr-row">${f('vcT1Nom', 'Testigo 1 — nombre', c.testigo1_nombre, 'Nombre')}${f('vcT1Ced', 'Cédula', c.testigo1_cedula, '000-0000000-0')}</div>
          <div class="fr-row">${f('vcT2Nom', 'Testigo 2 — nombre', c.testigo2_nombre, 'Nombre')}${f('vcT2Ced', 'Cédula', c.testigo2_cedula, '000-0000000-0')}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxVhCfg').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxVehGuardarConfig()"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.nxVehGuardarConfig = async function () {
    const body = {
      vendedor_nombre: (val('vcVendNom') || '').trim() || null, vendedor_cedula: (val('vcVendCed') || '').trim() || null,
      vendedor_telefono: (val('vcVendTel') || '').trim() || null, vendedor_direccion: (val('vcVendDir') || '').trim() || null,
      abogado_nombre: (val('vcAboNom') || '').trim() || null, abogado_cedula: (val('vcAboCed') || '').trim() || null,
      abogado_matricula: (val('vcAboMat') || '').trim() || null, abogado_telefono: (val('vcAboTel') || '').trim() || null,
      testigo1_nombre: (val('vcT1Nom') || '').trim() || null, testigo1_cedula: (val('vcT1Ced') || '').trim() || null,
      testigo2_nombre: (val('vcT2Nom') || '').trim() || null, testigo2_cedula: (val('vcT2Ced') || '').trim() || null,
      updated_at: new Date().toISOString()
    };
    try {
      let r = await getAPI().patch('vehiculos_config', 'id=eq.1', body);
      if (!r || (Array.isArray(r) && r.length === 0)) { try { await getAPI().post('vehiculos_config', Object.assign({ id: 1 }, body)); } catch (e) {} }
      _vhCfg = Object.assign({}, _vhCfg, body);
      cerrarModal('nxVhCfg'); toast('ok', 'Datos del acto guardados');
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  // ── Exportar a Excel (CSV) ──
  window.nxVehExportar = function () {
    if (!_vehiculos.length) { toast('warn', 'No hay vehículos para exportar'); return; }
    const cab = ['Marca', 'Modelo', 'Año', 'Color', 'Placa', 'Chasis', 'Compra', 'Reacondicionamiento', 'Costo total', 'Precio venta', 'Ganancia', 'Margen %', 'Estado', 'Comprador', 'Fecha venta'];
    const filas = _vehiculos.map(v => [v.marca || '', v.modelo || '', v.anio || '', v.color || '', v.placa || '', v.chasis || '', Math.round(Number(v.compra_precio || 0)), Math.round(totalGastos(v)), Math.round(costoTotal(v)), Math.round(Number(v.precio_venta || 0)), Math.round(gananciaDe(v)), margenPctDe(v).toFixed(1), v.estado === 'vendido' ? 'Vendido' : 'Inventario', v.comprador_nombre || '', v.venta_fecha || '']);
    const esc2 = x => { const s = String(x == null ? '' : x); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cab, ...filas].map(r => r.map(esc2).join(',')).join('\r\n');
    try { const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vehiculos_' + hoy() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { try { URL.revokeObjectURL(a.href); a.remove(); } catch (e) {} }, 500); toast('ok', 'Excel exportado', _vehiculos.length + ' vehículos'); }
    catch (e) { toast('err', 'No se pudo exportar', String(e && e.message || e)); }
  };

  // ── Registrar el módulo en el hub de Multiempresa ──
  function registrar() {
    try { if (window.nxMERegistrar) window.nxMERegistrar({ orden: 2, nombre: 'Compra y Venta de Vehículos', desc: 'Inventario, costos, ganancia y acto de venta', icon: 'ti-car', color: '#2563eb', bg: '#eff6ff', onclick: 'window.nxAbrirVehiculos()' }); } catch (e) {}
  }
  function init() { let n = 0; const t = function () { n++; if (window.nxMERegistrar) { registrar(); return; } if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

/* ════════════════════════════════════════════════════════════════════
   RECIBO DE PAGO POR MESES (pagos por adelantado de clientes del seguro)
   Permite generar un recibo imprimible / WhatsApp indicando los meses
   que el cliente está pagando. Se abre desde el modal de Abono.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__NX_RECIBO__) return;
  window.__NX_RECIBO__ = true;

  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function fmt(n) { return 'RD$ ' + Math.round(Number(n || 0)).toLocaleString('en-US'); }
  function fmtN(n) { return Math.round(Number(n || 0)).toLocaleString('en-US'); }
  function toast(t, m, s) { try { if (window.toast) window.toast(t, m, s); } catch (e) {} }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function parseMoney(v) { try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(v)) || 0; } catch (e) {} return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
  function cerrarModal(id) { const o = document.getElementById(id); if (o) o.remove(); }
  function _ST() { try { return ST; } catch (e) { return window.ST || { clientes: [] }; } }
  function _CFG() { try { return CFG; } catch (e) { return window.CFG || {}; } }
  function _getTot(c) { try { return getTot(c); } catch (e) { return Number(c && c.deuda_total || 0); } }
  function _pend(c) { try { return pend(c); } catch (e) { return Math.max(0, (c && c.deuda_total || 0) - (c && c.pagado || 0)); } }
  function fechaHoyISO() { return new Date().toISOString().slice(0, 10); }
  function fechaDMY(d) { try { const dt = new Date(String(d || fechaHoyISO()).slice(0, 10) + 'T12:00:00'); return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear(); } catch (e) { return String(d || ''); } }
  function waNum(c) { let d = String((c && (c.wa || c.tel)) || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d; return d.length >= 11 ? d : ''; }
  function numLetras(n) {
    n = Math.floor(Math.abs(Number(n) || 0)); if (n === 0) return 'CERO';
    const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
    const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    function m100(x) { if (x <= 20) return U[x]; if (x < 30) return 'VEINTI' + U[x - 20]; const d = Math.floor(x / 10), u = x % 10; return D[d] + (u ? ' Y ' + U[u] : ''); }
    function m1000(x) { if (x === 100) return 'CIEN'; const c = Math.floor(x / 100), r = x % 100; return ((c ? C[c] + ' ' : '') + (r ? m100(r) : '')).trim(); }
    let t = ''; const mill = Math.floor(n / 1000000), miles = Math.floor((n % 1000000) / 1000), cien = n % 1000;
    if (mill) t += (mill === 1 ? 'UN MILLÓN' : m1000(mill) + ' MILLONES') + ' ';
    if (miles) t += (miles === 1 ? 'MIL' : m1000(miles) + ' MIL') + ' ';
    if (cien) t += m1000(cien);
    return t.trim();
  }

  let _recCli = null;
  let _recSel = {}; // 'anio-mes' -> true
  let _recAmt = 0;  // prima mensual del cliente (por defecto por mes)
  let _recMesMonto = {}; // 'anio-mes' -> monto específico (de un pago guardado)
  let _recAbonoId = null; // id del abono al que se guardarán los meses (si aplica)
  let _recNum = null;     // número consecutivo del recibo (por año)
  let _recAnio = null;    // año del recibo (prefijo)

  function mesMonto(o) { const k = selKey(o); return (_recMesMonto[k] != null) ? Number(_recMesMonto[k]) : _recAmt; }
  function anioDe(f) { const y = f ? Number(String(f).slice(0, 4)) : 0; return (y && y > 1900) ? y : new Date().getFullYear(); }
  function recNumStr() { if (_recNum == null) return null; const a = _recAnio || new Date().getFullYear(); return a + '-' + String(_recNum).padStart(4, '0'); }
  function fmtRecNum(n) { return recNumStr() || ('No. ' + String(n).padStart(4, '0')); }

  // Asigna un número consecutivo POR AÑO (contador en la base) al recibo del pago y lo guarda
  async function asignarNumeroRecibo() {
    try {
      const api = (typeof API !== 'undefined') ? API : window.API;
      if (!api || !api.post || !_recAbonoId) return;
      const anio = anioDe(val('recFecha'));
      const r = await api.post('rpc/next_recibo_anio', { p_anio: anio });
      const n = Array.isArray(r) ? Number(r[0]) : Number(r);
      if (!n || isNaN(n)) return;
      _recNum = n; _recAnio = anio;
      try { api.patch('abonos', 'id=eq.' + _recAbonoId, { recibo_num: n, recibo_anio: anio }).catch(() => {}); } catch (e) {}
      try { const cache = (typeof _pagosCache !== 'undefined') ? _pagosCache : null; if (Array.isArray(cache)) { const row = cache.find(p => String(p.id) === String(_recAbonoId)); if (row) { row.recibo_num = n; row.recibo_anio = anio; } } } catch (e) {}
      const lbl = document.getElementById('recNumLbl'); if (lbl) lbl.textContent = 'Recibo No. ' + recNumStr();
    } catch (e) {}
  }

  // Meses con factura PENDIENTE o PARCIAL del cliente (para marcar automáticamente)
  function mesesPendientesDe(c) {
    if (!c) return [];
    let facturas = [];
    try { facturas = (typeof ST !== 'undefined' && ST.facturas) ? ST.facturas : ((window.ST && window.ST.facturas) || []); } catch (e) { facturas = []; }
    const out = [], seen = {};
    facturas.forEach(f => {
      if (String(f.cliente_id) !== String(c.id)) return;
      const est = String(f.estado || '');
      if (est !== 'Pendiente' && est !== 'Parcial') return;
      const mes = Number(f.mes || 0), anio = Number(f.anio || 0);
      if (!mes || !anio) return;
      const k = anio + '-' + mes; if (seen[k]) return; seen[k] = 1;
      out.push({ mes: mes, anio: anio });
    });
    return out;
  }

  function mesesOpciones() {
    const map = {}; const add = (mes, anio) => { map[anio + '-' + mes] = { mes: mes, anio: anio }; };
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 2);
    for (let i = 0; i < 15; i++) { add(d.getMonth() + 1, d.getFullYear()); d.setMonth(d.getMonth() + 1); }
    mesesPendientesDe(_recCli).forEach(o => add(o.mes, o.anio));
    Object.keys(_recSel).forEach(k => { if (_recSel[k]) { const p = k.split('-'); add(Number(p[1]), Number(p[0])); } });
    return Object.values(map).sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes));
  }
  function selKey(o) { return o.anio + '-' + o.mes; }
  function mesesSeleccionados() {
    return Object.keys(_recSel).filter(k => _recSel[k]).map(k => { const p = k.split('-'); return { anio: +p[0], mes: +p[1] }; })
      .sort((a, b) => (a.anio * 12 + a.mes) - (b.anio * 12 + b.mes));
  }
  function totalMeses() { return mesesSeleccionados().reduce((s, o) => s + mesMonto(o), 0); }

  function pintarChips() {
    const cont = document.getElementById('recChips'); if (!cont) return;
    cont.querySelectorAll('[data-k]').forEach(ch => {
      const on = !!_recSel[ch.getAttribute('data-k')];
      ch.style.background = on ? '#2563eb' : '#fff';
      ch.style.color = on ? '#fff' : '#475569';
      ch.style.borderColor = on ? '#2563eb' : '#e2e8f0';
    });
    const t = document.getElementById('recTotMeses');
    const n = mesesSeleccionados().length;
    if (t) t.textContent = n ? (n + ' mes' + (n > 1 ? 'es' : '') + ' · ' + fmt(totalMeses())) : 'Ningún mes seleccionado';
  }

  window.nxReciboToggleMes = function (k) { _recSel[k] = !_recSel[k]; pintarChips(); };

  // Selección rápida de meses: actual / pendientes / limpiar
  window.nxReciboQuick = function (tipo) {
    _recSel = {};
    const cc = document.getElementById('recConcepto');
    if (tipo === 'actual') { const d = new Date(); _recSel[d.getFullYear() + '-' + (d.getMonth() + 1)] = true; if (cc) cc.value = 'Pago de mensualidad'; }
    else if (tipo === 'pend') { mesesPendientesDe(_recCli).forEach(o => { _recSel[o.anio + '-' + o.mes] = true; }); if (!mesesSeleccionados().length) toast('warn', 'Sin meses pendientes', 'Este cliente no tiene facturas pendientes'); else if (cc) cc.value = 'Pago de mensualidad pendiente'; }
    pintarChips();
  };

  // Abre el modal del recibo. opts: {monto, metodo, fecha, ref, meses:[{mes,anio,monto}], abonoId}
  function abrirReciboModal(c, opts) {
    opts = opts || {};
    _recCli = c; _recAmt = _getTot(c) || 0;
    _recSel = {}; _recMesMonto = {}; _recAbonoId = opts.abonoId || null;
    _recNum = (opts.reciboNum != null && opts.reciboNum !== '') ? Number(opts.reciboNum) : null;
    _recAnio = (opts.reciboAnio != null && opts.reciboAnio !== '') ? Number(opts.reciboAnio) : (_recNum != null ? anioDe(opts.fecha) : null);
    (opts.meses || []).forEach(m => { const k = m.anio + '-' + m.mes; _recSel[k] = true; if (m.monto != null) _recMesMonto[k] = Number(m.monto); });
    // Preselección automática (solo si no venían meses guardados)
    if (!(opts.meses && opts.meses.length)) {
      if (opts.preselect === 'pend') { mesesPendientesDe(c).forEach(o => { _recSel[o.anio + '-' + o.mes] = true; }); }
      if (opts.preselect === 'actual' || (opts.preselect === 'pend' && !Object.keys(_recSel).length)) { const dn = new Date(); _recSel[dn.getFullYear() + '-' + (dn.getMonth() + 1)] = true; }
    }
    const m = Number(opts.monto) || 0;
    const metodo = opts.metodo || 'Efectivo';
    const ref = opts.ref || '';
    const concepto = opts.concepto || 'Pago de mensualidad';
    const fecha = (opts.fecha ? String(opts.fecha).slice(0, 10) : fechaHoyISO());
    cerrarModal('nxRecibo');
    const chips = mesesOpciones().map(o => `<button type="button" data-k="${selKey(o)}" onclick="window.nxReciboToggleMes('${selKey(o)}')" style="border:1.5px solid #e2e8f0;background:#fff;color:#475569;border-radius:999px;padding:6px 11px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap">${MESES[o.mes - 1].slice(0, 3)} ${o.anio}</button>`).join('');
    const note = _recAbonoId
      ? '<div style="font-size:10.5px;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:6px 9px;margin-bottom:10px">✓ Los meses marcados se guardarán en este pago (historial/auditoría).</div>'
      : '<div style="font-size:10.5px;color:#475569;background:#f8fafc;border-radius:8px;padding:6px 9px;margin-bottom:10px">Para guardar los meses en el historial, genera el recibo desde el pago (Historial de pagos o ficha del cliente).</div>';
    const ov = document.createElement('div'); ov.id = 'nxRecibo'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:460px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-receipt"></i> Recibo de pago</span><button class="nxBack" type="button" onclick="document.getElementById('nxRecibo').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">
          <div style="font-size:12px;color:#1e293b;font-weight:700">${esc(c.nom || '')}</div>
          <div style="font-size:11px;color:#475569;margin-bottom:6px">Póliza ${esc(c.numero_poliza || '—')} · Plan ${esc(c.plan || '—')} · Prima ${fmt(_recAmt)}/mes</div>
          <div id="recNumLbl" style="font-size:11px;font-weight:800;color:#1e3a6e;margin-bottom:10px">${_recNum != null ? ('Recibo No. ' + recNumStr()) : (_recAbonoId ? 'Recibo (asignando No…)' : 'Recibo sin número (genera desde el pago)')}</div>
          <div class="fr"><label>Monto recibido (RD$)</label><input id="recMonto" data-nx-money inputmode="numeric" value="${m ? Math.round(m) : ''}" placeholder="0"></div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:6px 0 6px">MESES QUE PAGA <span style="font-weight:600;color:#475569">(automático o toca para marcar)</span></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px">
            <button type="button" class="btn bsm bc1" style="font-size:10px;padding:5px 10px" onclick="window.nxReciboQuick('actual')"><i class="ti ti-calendar"></i> Mes actual</button>
            <button type="button" class="btn bsm" style="font-size:10px;padding:5px 10px" onclick="window.nxReciboQuick('pend')"><i class="ti ti-alert-circle"></i> Pendientes</button>
            <button type="button" class="btn bsm" style="font-size:10px;padding:5px 10px" onclick="window.nxReciboQuick('limpiar')"><i class="ti ti-eraser"></i> Limpiar</button>
          </div>
          <div id="recChips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">${chips}</div>
          <div id="recTotMeses" style="font-size:11px;color:#2563eb;font-weight:700;margin-bottom:8px">Ningún mes seleccionado</div>
          ${note}
          <div class="fr"><label>Concepto (sale en el recibo)</label><input id="recConcepto" class="no-upper" value="${esc(concepto)}" placeholder="Pago de mensualidad"></div>
          <div class="fr-row">
            <div class="fr"><label>Método</label><select id="recMetodo"><option${metodo === 'Efectivo' ? ' selected' : ''}>Efectivo</option><option${metodo === 'Transferencia' ? ' selected' : ''}>Transferencia</option><option${metodo === 'Cheque' ? ' selected' : ''}>Cheque</option><option${metodo === 'Tarjeta' ? ' selected' : ''}>Tarjeta</option><option${metodo === 'Depósito' ? ' selected' : ''}>Depósito</option></select></div>
            <div class="fr"><label>Fecha</label><input id="recFecha" type="date" value="${fecha}"></div>
          </div>
          <div class="fr"><label>Referencia (opcional)</label><input id="recRef" class="no-upper" value="${esc(ref)}" placeholder="No. de cheque, transferencia..."></div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px;flex-wrap:wrap">
          ${waNum(c) ? `<button class="btn bwa" type="button" onclick="window.nxReciboWA()"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
          <button class="btn bc2" type="button" onclick="window.nxReciboCompartir()"><i class="ti ti-share"></i> Compartir</button>
          <button class="btn bc1" type="button" onclick="window.nxReciboImprimir()"><i class="ti ti-printer"></i> Imprimir</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(ov); } catch (e) {}
    pintarChips();
    if (_recAbonoId && _recNum == null) asignarNumeroRecibo();
  }

  // Entrada desde el modal de Abono (pago en vivo / recién registrado)
  window.nxReciboMeses = function (cliId, monto) {
    const ST = _ST();
    cliId = cliId || (typeof abonoCliId !== 'undefined' ? abonoCliId : window.abonoCliId);
    const c = (ST.clientes || []).find(x => String(x.id) === String(cliId));
    if (!c) { toast('err', 'Abre el cobro de un cliente primero'); return; }
    let m = Number(monto) || 0;
    if (!m) m = parseMoney(val('aMnt'));
    let ua = null; try { ua = window._ultimoAbono; } catch (e) {}
    const linked = !!(ua && ua.abonoId && String(ua.cliente) === String(c.id));
    if (!m && ua) m = Number(ua.monto) || 0;
    // Meses pendientes: los capturados al registrar el pago (preciso), o los actuales del cliente
    let pend = (linked && Array.isArray(ua.mesesPend) && ua.mesesPend.length) ? ua.mesesPend : mesesPendientesDe(c);
    let meses = (pend || []).map(o => ({ mes: o.mes, anio: o.anio }));
    let concepto = 'Pago de mensualidad';
    if (meses.length) { concepto = 'Pago de mensualidad pendiente'; }
    else { const d = new Date(); meses = [{ mes: d.getMonth() + 1, anio: d.getFullYear() }]; }
    abrirReciboModal(c, { monto: m, metodo: val('aMet') || 'Efectivo', ref: val('aRef') || '', meses: meses, abonoId: linked ? ua.abonoId : null, concepto: concepto });
  };

  // Entrada desde el Historial de pagos / ficha del cliente (pago existente)
  window.nxReciboDeAbono = async function (abonoId, clienteId) {
    const ST = _ST();
    const c = (ST.clientes || []).find(x => String(x.id) === String(clienteId));
    if (!c) { toast('err', 'Cliente no encontrado'); return; }
    const api = (typeof API !== 'undefined') ? API : window.API;
    let ab = null;
    try { if (typeof _pagosCache !== 'undefined' && Array.isArray(_pagosCache)) ab = _pagosCache.find(p => String(p.id) === String(abonoId)); } catch (e) {}
    if (!ab) { try { const r = await api.get('abonos', 'id=eq.' + abonoId); ab = r && r[0]; } catch (e) {} }
    if (!ab) { toast('err', 'No se encontró el pago'); return; }
    abrirReciboModal(c, { monto: ab.monto, metodo: ab.metodo, fecha: ab.fecha, ref: ab.referencia, meses: Array.isArray(ab.meses_cubiertos) ? ab.meses_cubiertos : [], abonoId: ab.id, reciboNum: ab.recibo_num, reciboAnio: ab.recibo_anio });
  };

  function datosRecibo() {
    const c = _recCli; if (!c) return null;
    const monto = parseMoney(val('recMonto'));
    const meses = mesesSeleccionados();
    const metodo = val('recMetodo') || 'Efectivo';
    const fecha = val('recFecha') || fechaHoyISO();
    const ref = (val('recRef') || '').trim();
    const concepto = (val('recConcepto') || '').trim() || 'Pago de mensualidad';
    return { c, monto, meses, metodo, fecha, ref, concepto };
  }

  // Guarda en la base los meses que cubre el pago (si el recibo está enlazado al
  // abono recién registrado). Para historial / auditoría.
  function guardarMesesAbono(d) {
    try {
      if (!_recAbonoId) return;
      const api = (typeof API !== 'undefined') ? API : window.API;
      if (!api || !api.patch) return;
      const targetId = _recAbonoId;
      const payload = d.meses.map(m => ({ mes: m.mes, anio: m.anio, monto: mesMonto(m) }));
      api.patch('abonos', 'id=eq.' + targetId, { meses_cubiertos: payload }).then(() => {
        toast('ok', 'Meses guardados en el pago', d.meses.length + ' mes(es)');
        try { const cache = (typeof _pagosCache !== 'undefined') ? _pagosCache : null; if (Array.isArray(cache)) { const row = cache.find(p => String(p.id) === String(targetId)); if (row) row.meses_cubiertos = payload; } } catch (e) {}
        try { if (typeof aplicarFiltrosPagos === 'function') aplicarFiltrosPagos(); } catch (e) {}
      }).catch(() => {});
    } catch (e) {}
  }

  window.nxReciboImprimir = function () {
    const d = datosRecibo(); if (!d) return;
    if (d.monto <= 0) { toast('err', 'Pon el monto recibido'); return; }
    if (!d.meses.length) { toast('warn', 'Marca al menos un mes que está pagando'); return; }
    guardarMesesAbono(d);
    const cfg = _CFG();
    const empNom = cfg.empNom || cfg.empresa_nom || 'NEXUS PRO';
    const filas = d.meses.map(m => `<tr><td>${MESES[m.mes - 1]} ${m.anio}</td><td style="text-align:right">${fmt(mesMonto(m))}</td></tr>`).join('');
    const mesesTxt = d.meses.map(m => MESES[m.mes - 1] + ' ' + m.anio).join(', ');
    const noRec = recNumStr() || ('S/N-' + d.fecha.replace(/-/g, ''));
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recibo de pago - ${esc(d.c.nom || '')}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;max-width:580px;margin:0 auto;padding:22px}h1{font-size:18px;margin:0}.muted{color:#475569;font-size:12px}.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a6e;padding-bottom:10px;margin-bottom:14px}.box{border:1px solid #e5e7eb;border-radius:10px;padding:8px 12px;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px}td,th{padding:7px 9px;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f3f4f6}.tot{font-size:15px;font-weight:800;color:#1e3a6e}.firma{margin-top:48px;border-top:1.5px solid #1a1a1a;width:60%;padding-top:6px;font-size:12px;text-align:center}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:10px;background:#1e3a6e;margin:-22px -22px 16px;padding:11px 16px"><button onclick="window.close()" style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:15px;font-weight:700;cursor:pointer">&#10005; Cerrar</button><span style="color:#fff;font-size:11.5px;opacity:.85"></span></div>
        <div class="hd"><div><h1>${esc(empNom)}</h1><div class="muted">${cfg.empRNC ? 'RNC: ' + esc(cfg.empRNC) + ' · ' : ''}${esc(cfg.empTel || '')}${cfg.empDir ? '<br>' + esc(cfg.empDir) : ''}</div></div><div style="text-align:right"><div style="font-size:15px;font-weight:800;color:#1e3a6e">RECIBO DE PAGO</div><div class="muted">No. ${noRec}</div><div class="muted">Fecha: ${fechaDMY(d.fecha)}</div></div></div>
        <div class="box"><table style="margin:0"><tr><td>Recibí de</td><td style="text-align:right"><b>${esc(d.c.nom || '')}</b></td></tr>${d.c.cedula ? `<tr><td>Cédula</td><td style="text-align:right">${esc(d.c.cedula)}</td></tr>` : ''}<tr><td>Póliza</td><td style="text-align:right">${esc(d.c.numero_poliza || '—')}</td></tr><tr><td>Plan</td><td style="text-align:right">${esc(d.c.plan || '—')}</td></tr></table></div>
        <p style="font-size:13px">La suma de <b>${fmt(d.monto)}</b> (<b>${numLetras(d.monto)} PESOS DOMINICANOS</b>), por concepto de <b>${esc(d.concepto)}</b> del seguro, correspondiente a: <b>${esc(mesesTxt)}</b>.</p>
        <table><thead><tr><th>Mes pagado</th><th style="text-align:right">Monto</th></tr></thead><tbody>${filas}</tbody><tfoot><tr><td class="tot">TOTAL RECIBIDO</td><td class="tot" style="text-align:right">${fmt(d.monto)}</td></tr></tfoot></table>
        <div class="box"><table style="margin:0"><tr><td>Método de pago</td><td style="text-align:right">${esc(d.metodo)}${d.ref ? ' · Ref. ' + esc(d.ref) : ''}</td></tr><tr><td>Saldo pendiente actual</td><td style="text-align:right"><b>${fmt(_pend(d.c))}</b></td></tr></table></div>
        <div class="firma">Recibido por · ${esc(empNom)}</div>
        <button class="noprint" onclick="window.print()" style="width:100%;padding:13px;margin-top:26px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer">🖨️ Imprimir / Guardar PDF</button>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('err', 'Permite las ventanas emergentes para ver el recibo'); return; } w.document.write(html); w.document.close(); }
    catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };

  function construirTextoRecibo(d) {
    const cfg = _CFG();
    const empNom = cfg.empNom || cfg.empresa_nom || 'NEXUS PRO';
    const mesesTxt = d.meses.map(m => '• ' + MESES[m.mes - 1] + ' ' + m.anio + ' — ' + fmt(mesMonto(m))).join('\n');
    return `Estimado/a *${d.c.nom}*,\n\n✅ Confirmamos su pago:\n${recNumStr() ? '*Recibo:* No. ' + recNumStr() + '\n' : ''}*Concepto:* ${d.concepto}\n*Monto:* ${fmt(d.monto)}\n*Póliza:* ${d.c.numero_poliza || '—'}\n*Plan:* ${d.c.plan || '—'}\n*Fecha:* ${fechaDMY(d.fecha)}\n\n*Meses:*\n${mesesTxt}\n\n*Saldo pendiente:* ${fmt(_pend(d.c))}\n\nGracias por su pago.\n_${empNom}_`;
  }

  window.nxReciboWA = function () {
    const d = datosRecibo(); if (!d) return;
    if (d.monto <= 0) { toast('err', 'Pon el monto recibido'); return; }
    if (!d.meses.length) { toast('warn', 'Marca al menos un mes que está pagando'); return; }
    const num = waNum(d.c); if (!num) { toast('err', 'Cliente sin WhatsApp válido'); return; }
    guardarMesesAbono(d);
    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(construirTextoRecibo(d)), '_blank', 'noopener,noreferrer');
  };

  window.nxReciboCompartir = async function () {
    const d = datosRecibo(); if (!d) return;
    if (d.monto <= 0) { toast('err', 'Pon el monto recibido'); return; }
    if (!d.meses.length) { toast('warn', 'Marca al menos un mes que está pagando'); return; }
    guardarMesesAbono(d);
    const txt = construirTextoRecibo(d);
    const titulo = 'Recibo de pago' + (recNumStr() ? ' No. ' + recNumStr() : '');
    try { if (navigator.share) { await navigator.share({ title: titulo, text: txt }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); toast('ok', 'Recibo copiado', 'Pégalo donde quieras compartirlo'); return; } } catch (e) {}
    toast('warn', 'Compartir no disponible', 'Usa WhatsApp o Imprimir/PDF');
  };
})();

/* ════════════════════════════════════════════════════════════════════
   MÓDULO: PUNTO DE VENTA (POS) — dentro de Multiempresa · admin
   Vender (carrito), Productos (inventario) y Ventas (historial + ticket).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (window.__NX_POS__) return;
  window.__NX_POS__ = true;

  function getAPI() { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } }
  function esAdmin() { try { return (typeof sesion !== 'undefined') && sesion && sesion.rol === 'admin'; } catch (e) { try { return window.sesion && window.sesion.rol === 'admin'; } catch (_) { return false; } } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function fmt(n) { return 'RD$ ' + Math.round(Number(n || 0)).toLocaleString('en-US'); }
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function fechaDMY(d) { try { const dt = new Date(d || Date.now()); return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0') + '/' + dt.getFullYear() + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0'); } catch (e) { return ''; } }
  function toast(t, m, s) { try { if (window.toast) window.toast(t, m, s); } catch (e) {} }
  function cerrarModal(id) { const o = document.getElementById(id); if (o) o.remove(); }
  function val(id) { const e = document.getElementById(id); return e ? e.value : ''; }
  function parseMoney(v) { try { if (window.nxMoney && window.nxMoney.parse) return Number(window.nxMoney.parse(v)) || 0; } catch (e) {} return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
  function nomAdmin() { try { return (window.sesion && window.sesion.nom) || 'Admin'; } catch (e) { return 'Admin'; } }
  function scanMoney(el) { try { if (window.nxMoney && window.nxMoney.scan) window.nxMoney.scan(el); } catch (e) {} }
  function empNom() { try { return (window.CFG && CFG.empNom) || (window.CFG && CFG.empresa_nom) || 'NEXUS PRO'; } catch (e) { return 'NEXUS PRO'; } }
  function empInfo() { try { const c = window.CFG || {}; return { nom: c.empNom || 'NEXUS PRO', rnc: c.empRNC || '', tel: c.empTel || '', dir: c.empDir || '' }; } catch (e) { return { nom: 'NEXUS PRO', rnc: '', tel: '', dir: '' }; } }

  let _cats = [], _prods = [], _ventas = [], _clientes = [];
  let _fiadoByCli = {}, _abonosByCli = {};
  let _cart = [];
  let _posTab = 'vender';
  let _posCat = 'todas';
  let _factCli = '';
  let _facNCF = 'sin';
  let _facCredito = false;
  let _posCfg = { prefijo_contado: 'CO', prefijo_credito: 'CR' };
  let _ncfSecs = [];
  let _vendedores = [];
  let _facFecha = '';
  let _facSubTab = 'datos';
  let _histQ = '', _histDesde = '', _histHasta = '';
  let _caja = null, _cajaTot = null, _cierres = [];
  let _proveedores = [], _compras = [], _compraItems = [];
  let _cxpByProv = {}, _pagosProvByProv = {};
  // ── Contabilidad ──
  let _ctaTab = 'resumen';
  let _cuentas = [], _asientos = [];
  let _ctaDesde = '', _ctaHasta = '', _ctaMayorSel = '';
  let _asEdit = null; // { fecha, concepto, lineas:[{cuenta_id,debito,credito}] }
  // ── Cotizaciones ──
  let _cotizaciones = [], _cotEdit = null;
  // ── Reportes ──
  let _repDesde = '', _repHasta = '', _repVentas = [];
  // ── Recursos Humanos ──
  let _rhTab = 'empleados';
  let _empleados = [], _nominas = [], _nominaSel = null;
  let _nomEdit = null; // { periodo, fecha, tipo, lineas:[...] }

  async function cargarPOS() {
    _cats = await getAPI().get('pos_categorias', 'select=*&order=orden.asc,nombre.asc') || [];
    _prods = await getAPI().get('pos_productos', 'select=*&activo=eq.true&order=nombre.asc') || [];
    try { _clientes = await getAPI().get('pos_clientes', 'select=*&activo=eq.true&order=nombre.asc') || []; } catch (e) { _clientes = []; }
    try { _proveedores = await getAPI().get('pos_proveedores', 'select=*&activo=eq.true&order=nombre.asc') || []; } catch (e) { _proveedores = []; }
    try { const cj = await getAPI().get('pos_cajas', 'select=*&estado=eq.abierta&order=apertura.desc&limit=1'); _caja = (cj && cj[0]) || null; } catch (e) { _caja = null; }
    try { const cf = await getAPI().get('pos_config', 'select=*&limit=1'); if (cf && cf[0]) { _posCfg = { prefijo_contado: cf[0].prefijo_contado || 'CO', prefijo_credito: cf[0].prefijo_credito || 'CR' }; } } catch (e) {}
    try { _ncfSecs = await getAPI().get('pos_ncf_secuencias', 'select=*&order=tipo.asc') || []; } catch (e) { _ncfSecs = []; }
    try { _vendedores = await getAPI().get('pos_vendedores', 'select=*&activo=eq.true&order=nombre.asc') || []; } catch (e) { _vendedores = []; }
  }
  async function cargarComprasTab() {
    try { _proveedores = await getAPI().get('pos_proveedores', 'select=*&activo=eq.true&order=nombre.asc') || []; } catch (e) {}
    try { _compras = await getAPI().get('pos_compras', 'select=*&order=created_at.desc&limit=100') || []; } catch (e) { _compras = []; }
    _cxpByProv = {}; _pagosProvByProv = {};
    try { const cc = await getAPI().get('pos_compras', 'select=proveedor_id,total&a_credito=eq.true') || []; cc.forEach(c => { if (c.proveedor_id) _cxpByProv[c.proveedor_id] = (_cxpByProv[c.proveedor_id] || 0) + Number(c.total || 0); }); } catch (e) {}
    try { const pp = await getAPI().get('pos_compra_pagos', 'select=proveedor_id,monto') || []; pp.forEach(p => { if (p.proveedor_id) _pagosProvByProv[p.proveedor_id] = (_pagosProvByProv[p.proveedor_id] || 0) + Number(p.monto || 0); }); } catch (e) {}
  }
  function saldoProv(p) { const id = p && p.id; return Math.max(0, (_cxpByProv[id] || 0) - (_pagosProvByProv[id] || 0)); }
  async function totalesCaja(caja) {
    let ventas = [], abonos = [], movs = [];
    try { ventas = await getAPI().get('pos_ventas', 'select=pagado_efectivo,pagado_tarjeta,pagado_transferencia,pagado_otro,credito_monto&caja_id=eq.' + caja.id + '&estado=eq.completada') || []; } catch (e) {}
    try { abonos = await getAPI().get('pos_abonos', 'select=metodo,monto&caja_id=eq.' + caja.id) || []; } catch (e) {}
    try { movs = await getAPI().get('pos_caja_movimientos', 'select=*&caja_id=eq.' + caja.id + '&order=fecha.asc') || []; } catch (e) {}
    let efe = 0, tar = 0, tra = 0, cre = 0, otro = 0;
    ventas.forEach(v => { efe += Number(v.pagado_efectivo || 0); tar += Number(v.pagado_tarjeta || 0); tra += Number(v.pagado_transferencia || 0); otro += Number(v.pagado_otro || 0); cre += Number(v.credito_monto || 0); });
    let abEfe = 0, abOtro = 0;
    abonos.forEach(a => { const m = Number(a.monto || 0); if ((a.metodo || 'Efectivo') === 'Efectivo') abEfe += m; else abOtro += m; });
    let ent = 0, sal = 0;
    movs.forEach(m => { const mo = Number(m.monto || 0); if (m.tipo === 'entrada') ent += mo; else sal += mo; });
    const esperado = Number(caja.monto_inicial || 0) + efe + abEfe + ent - sal;
    return { efe: efe, tar: tar, tra: tra, cre: cre, abEfe: abEfe, abOtro: abOtro, ent: ent, sal: sal, esperado: esperado, movs: movs, nventas: ventas.length };
  }
  async function cargarVentas() {
    _ventas = await getAPI().get('pos_ventas', 'select=*&order=created_at.desc&limit=400') || [];
  }
  async function cargarSaldosCli() {
    _fiadoByCli = {}; _abonosByCli = {};
    try {
      const fi = await getAPI().get('pos_ventas', 'select=cliente_id,credito_monto&credito_monto=gt.0') || [];
      fi.forEach(v => { if (v.cliente_id) _fiadoByCli[v.cliente_id] = (_fiadoByCli[v.cliente_id] || 0) + Number(v.credito_monto || 0); });
      const ab = await getAPI().get('pos_abonos', 'select=cliente_id,monto') || [];
      ab.forEach(a => { if (a.cliente_id) _abonosByCli[a.cliente_id] = (_abonosByCli[a.cliente_id] || 0) + Number(a.monto || 0); });
    } catch (e) {}
  }
  function saldoCli(c) { const id = c && c.id; return Math.max(0, (_fiadoByCli[id] || 0) - (_abonosByCli[id] || 0)); }
  function waNum(t) { let d = String(t || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d; return d.length >= 11 ? d : ''; }

  // ── Importe de línea con descuento (% o $) ──
  function lineBase(it) { return Number(it.precio || 0) * Number(it.cantidad || 0); }
  function lineDescMonto(it) { const base = lineBase(it); const d = Number(it.desc || 0); if (!d) return 0; return it.descT === 'mon' ? Math.min(d, base) : Math.min(base * d / 100, base); }
  function lineImporte(it) { return lineBase(it) - lineDescMonto(it); }

  function totales() {
    let total = 0, itbis = 0, descuento = 0;
    _cart.forEach(it => { const imp = lineImporte(it); descuento += lineDescMonto(it); total += imp; if (it.itbis) itbis += imp * 18 / 118; });
    total = Math.round(total); itbis = Math.round(itbis); descuento = Math.round(descuento);
    return { total: total, itbis: itbis, subtotal: total - itbis, descuento: descuento, items: _cart.reduce((s, it) => s + Number(it.cantidad), 0) };
  }
  function catNombre(id) { const c = _cats.find(x => String(x.id) === String(id)); return c ? c.nombre : ''; }

  // ── Vista / navegación ──
  function ensureView() {
    let v = document.getElementById('v-pos');
    if (v) return v;
    const dash = document.getElementById('v-dashboard');
    if (!dash || !dash.parentElement) return null;
    v = document.createElement('div'); v.className = 'view'; v.id = 'v-pos';
    dash.parentElement.appendChild(v);
    return v;
  }

  window.nxAbrirPOS = async function () {
    if (!esAdmin()) { toast('err', 'Acceso restringido', 'Solo el administrador'); return; }
    const view = ensureView(); if (!view) return;
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
    view.classList.add('on');
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const pt = document.getElementById('pttl'); if (pt) pt.textContent = 'PUNTO DE VENTA';
    try { if (window.innerWidth <= 768 && typeof closeMobSB === 'function') closeMobSB(); } catch (e) {}
    try { window.scrollTo(0, 0); } catch (e) {}
    view.innerHTML = '<div class="nc"><div style="padding:36px;text-align:center;color:#475569"><div class="spin"></div><div style="margin-top:8px;font-weight:600">Cargando punto de venta...</div></div></div>';
    try { await cargarPOS(); renderPOS(view); }
    catch (e) { view.innerHTML = '<div class="nc"><div style="padding:30px;text-align:center;color:#dc2626;font-size:13px">No se pudo cargar el POS.<br><span style="font-size:11px;color:#475569">' + esc(String(e && e.message || e)) + '</span></div></div>'; }
  };

  window.nxPosTab = async function (t) {
    _posTab = t;
    const view = document.getElementById('v-pos'); if (!view) return;
    if (t === 'ventas') { try { await cargarVentas(); } catch (e) {} }
    if (t === 'clientes') { try { _clientes = await getAPI().get('pos_clientes', 'select=*&activo=eq.true&order=nombre.asc') || []; await cargarSaldosCli(); } catch (e) {} }
    if (t === 'compras') { try { await cargarComprasTab(); } catch (e) {} }
    if (t === 'caja') { try { const cj = await getAPI().get('pos_cajas', 'select=*&estado=eq.abierta&order=apertura.desc&limit=1'); _caja = (cj && cj[0]) || null; _cajaTot = _caja ? await totalesCaja(_caja) : null; _cierres = await getAPI().get('pos_cajas', 'select=*&estado=eq.cerrada&order=cierre.desc&limit=10') || []; } catch (e) {} }
    if (t === 'contabilidad') { try { await cargarContabilidad(); } catch (e) {} }
    if (t === 'rrhh') { try { await cargarRRHH(); } catch (e) {} }
    if (t === 'reportes') { try { await cargarReportes(); } catch (e) {} }
    if (t === 'cotizaciones') { try { await cargarCotizaciones(); } catch (e) {} }
    renderPOS(view);
  };

  function tabBtn(k, lbl, ic) { return `<button type="button" class="nxPosTab${_posTab === k ? ' on' : ''}" onclick="window.nxPosTab('${k}')"><i class="ti ${ic}"></i> ${lbl}</button>`; }

  function renderPOS(view) {
    const esTienda = !!(window.sesion && window.sesion.org && window.sesion.org.tipo === 'tienda');
    const sub = esTienda ? esc((window.sesion.org.nombre || 'Mi negocio')) : 'Multiempresa · solo el administrador';
    const btnTop = esTienda
      ? `<button class="btn bsm bc3" type="button" onclick="if(window.logout)window.logout()"><i class="ti ti-logout"></i> Cerrar sesión</button>`
      : `<button class="btn bsm" type="button" onclick="window.nxAbrirMultiempresa()"><i class="ti ti-arrow-left"></i> Volver</button>`;
    const head = `<div class="ch">
        <div><div class="ct"><i class="ti ti-shopping-cart"></i> Punto de Venta</div><div class="ct-s">${sub}</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${btnTop}</div>
      </div>
      <div class="nxPosTabs">${tabBtn('vender', 'Vender', 'ti-cash-register')}${tabBtn('factura', 'Factura', 'ti-file-invoice')}${tabBtn('productos', 'Productos', 'ti-box')}${tabBtn('cotizaciones', 'Cotizaciones', 'ti-clipboard-text')}${tabBtn('compras', 'Compras', 'ti-truck-delivery')}${tabBtn('clientes', 'Clientes', 'ti-users')}${tabBtn('caja', 'Caja', 'ti-cash')}${tabBtn('ventas', 'Historial', 'ti-history')}${tabBtn('reportes', 'Reportes', 'ti-chart-pie')}${tabBtn('contabilidad', 'Contabilidad', 'ti-book-2')}${tabBtn('rrhh', 'Recursos Humanos', 'ti-users-group')}${tabBtn('ajustes', 'Ajustes', 'ti-settings')}</div>`;
    let body = '';
    if (_posTab === 'vender') body = renderVender();
    else if (_posTab === 'factura') body = renderFactura();
    else if (_posTab === 'productos') body = renderProductos();
    else if (_posTab === 'compras') body = renderCompras();
    else if (_posTab === 'clientes') body = renderClientes();
    else if (_posTab === 'caja') body = renderCaja();
    else if (_posTab === 'contabilidad') body = renderContabilidad();
    else if (_posTab === 'reportes') body = renderReportes();
    else if (_posTab === 'cotizaciones') body = renderCotizaciones();
    else if (_posTab === 'rrhh') body = renderRRHH();
    else if (_posTab === 'ajustes') body = renderAjustes();
    else body = renderVentas();
    view.innerHTML = `<div class="nc">${head}${body}</div>`;
    if (_posTab === 'vender') pintarCarrito();
    if (_posTab === 'factura') pintarFactura();
  }

  // ── TAB: VENDER ──
  function renderVender() {
    if (!_prods.length) {
      return `<div style="text-align:center;padding:36px;color:#475569;font-size:13px">Aún no hay productos.<br>Ve a <b>"Productos"</b> y agrega el primero.<br><button class="btn bc1 bsm" style="margin-top:10px" onclick="window.nxPosTab('productos')"><i class="ti ti-plus"></i> Agregar producto</button></div>`;
    }
    const chips = ['todas'].concat(_cats.map(c => c.id)).map(cid => {
      const lbl = cid === 'todas' ? 'Todas' : esc(catNombre(cid));
      return `<button type="button" class="btn bsm${_posCat === String(cid) ? ' bc1' : ''}" style="font-size:10px;padding:5px 10px" onclick="window.nxPosCat('${cid}')">${lbl}</button>`;
    }).join('');
    return `<div class="nxPosGridWrap">
        <div class="nxPosLeft">
          <div style="position:relative;margin-bottom:8px"><i class="ti ti-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#475569;font-size:15px;pointer-events:none"></i><input type="text" id="posBuscar" placeholder="Buscar producto o código..." autocomplete="off" oninput="window.nxPosBuscar(this.value)" style="width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b"></div>
          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">${chips}</div>
          <div id="posGrid" class="nxPosGrid">${gridHTML()}</div>
        </div>
        <div class="nxPosRight"><div id="posCartWrap"></div></div>
      </div>`;
  }
  function gridHTML() {
    const lista = _prods.filter(p => _posCat === 'todas' || String(p.categoria_id) === String(_posCat));
    if (!lista.length) return '<div style="grid-column:1/-1;color:#475569;font-size:12px;padding:20px;text-align:center">Sin productos en esta categoría</div>';
    return lista.map(p => `<button type="button" class="nxPosCard" data-busca="${esc(((p.nombre || '') + ' ' + (p.codigo || '') + ' ' + (p.referencia || '') + ' ' + (p.marca || '')).toLowerCase())}" onclick="window.nxPosAdd('${p.id}')">
        <div class="nxPosCardNom">${esc(p.nombre || '')}${p.referencia ? `<span style="display:block;font-weight:400;font-size:9.5px;color:#475569">${esc(p.referencia)}${p.marca ? ' · ' + esc(p.marca) : ''}</span>` : (p.marca ? `<span style="display:block;font-weight:400;font-size:9.5px;color:#475569">${esc(p.marca)}</span>` : '')}</div>
        <div class="nxPosCardBot"><span class="nxPosCardPre">${fmt(p.precio)}</span><span class="nxPosCardStk">${Number(p.stock || 0)} und</span></div>
      </button>`).join('');
  }
  window.nxPosCat = function (cid) { _posCat = String(cid); const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxPosBuscar = function (q) {
    const t = String(q || '').trim().toLowerCase();
    document.querySelectorAll('#posGrid .nxPosCard').forEach(c => { const b = c.getAttribute('data-busca') || ''; c.style.display = (!t || b.includes(t)) ? '' : 'none'; });
  };
  window.nxPosAdd = function (id) {
    const p = _prods.find(x => String(x.id) === String(id)); if (!p) return;
    const ex = _cart.find(x => String(x.producto_id) === String(id));
    if (ex) ex.cantidad += 1;
    else _cart.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio || 0), cantidad: 1, itbis: !!p.itbis });
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
    pintarCarrito();
  };
  window.nxPosQty = function (idx, d) { const it = _cart[idx]; if (!it) return; it.cantidad = Math.max(0, it.cantidad + d); if (it.cantidad === 0) _cart.splice(idx, 1); pintarCarrito(); };
  window.nxPosDel = function (idx) { _cart.splice(idx, 1); pintarCarrito(); };
  window.nxPosVaciar = function () { if (!_cart.length) return; if (!confirm('¿Vaciar el carrito?')) return; _cart = []; pintarCarrito(); };

  function pintarCarrito() {
    const wrap = document.getElementById('posCartWrap'); if (!wrap) return;
    const t = totales();
    const filas = _cart.length ? _cart.map((it, i) => `<div class="nxPosCartIt">
        <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.nombre)}</div><div style="font-size:10.5px;color:#475569">${fmt(it.precio)} c/u</div></div>
        <div class="nxPosQty"><button type="button" onclick="window.nxPosQty(${i},-1)">−</button><span>${it.cantidad}</span><button type="button" onclick="window.nxPosQty(${i},1)">+</button></div>
        <div style="width:74px;text-align:right;font-weight:800;font-size:12px;color:#0f172a">${fmt(it.precio * it.cantidad)}</div>
        <button type="button" class="nxPosX" onclick="window.nxPosDel(${i})"><i class="ti ti-x"></i></button>
      </div>`).join('') : '<div style="color:#475569;font-size:12px;padding:18px;text-align:center">Carrito vacío.<br>Toca un producto para agregarlo.</div>';
    wrap.innerHTML = `<div class="nxPosCart">
        <div class="nxPosCartHd"><span><i class="ti ti-shopping-cart"></i> Carrito (${t.items})</span>${_cart.length ? `<button type="button" class="btn bsm bghost" onclick="window.nxPosVaciar()" title="Vaciar"><i class="ti ti-trash" style="color:#dc2626"></i></button>` : ''}</div>
        <div class="nxPosCartList">${filas}</div>
        <div class="nxPosTot">
          <div class="nxPosTotR"><span>Subtotal</span><span>${fmt(t.subtotal)}</span></div>
          <div class="nxPosTotR"><span>ITBIS (18%)</span><span>${fmt(t.itbis)}</span></div>
          <div class="nxPosTotR nxPosTotBig"><span>TOTAL</span><span>${fmt(t.total)}</span></div>
        </div>
        <button class="btn bc1 nxPosCobrar" type="button" ${_cart.length ? '' : 'disabled style="opacity:.5"'} onclick="window.nxPosCobrar()"><i class="ti ti-cash"></i> Cobrar ${fmt(t.total)}</button>
      </div>`;
  }

  // ── TAB: FACTURA (estilo Infoplus: cabecera + cuadro de artículos) ──
  function prodCodigo(pid) { const p = _prods.find(x => String(x.id) === String(pid)); return p ? (p.codigo || '') : ''; }
  function prodStock(pid) { const p = _prods.find(x => String(x.id) === String(pid)); return p ? Number(p.stock || 0) : 0; }
  function proxNumeroFactura() { let mx = 0; (_ventas || []).forEach(v => { const n = parseInt(v.numero, 10); if (n > mx) mx = n; }); return mx + 1; }
  function prefijoFac(esCredito) { return esCredito ? (_posCfg.prefijo_credito || 'CR') : (_posCfg.prefijo_contado || 'CO'); }
  function proxNumeroFacturaFmt(esCredito) { const pref = prefijoFac(esCredito); let mx = 0; (_ventas || []).forEach(v => { const nf = String(v.numero_factura || ''); if (nf.indexOf(pref) === 0) { const m = nf.match(/(\d+)\s*$/); if (m) { const n = parseInt(m[1], 10); if (n > mx) mx = n; } } }); return pref + String(mx + 1).padStart(8, '0'); }
  const NCF_TIPOS = [['sin', 'Sin comprobante'], ['consumo', 'Consumo (B02)'], ['credito_fiscal', 'Crédito Fiscal (B01)'], ['gubernamental', 'Gubernamental (B15)'], ['regimen_especial', 'Régimen Especial (B14)']];
  function renderFactura() {
    if (!_prods.length) {
      return `<div style="text-align:center;padding:36px;color:#475569;font-size:13px">Aún no hay artículos.<br>Ve a <b>"Productos"</b> (o usa <b>Importar</b>) y agrégalos.<br><button class="btn bc1 bsm" style="margin-top:10px" onclick="window.nxPosTab('productos')"><i class="ti ti-plus"></i> Ir a Productos</button></div>`;
    }
    const cliOpts = `<option value="">— Consumidor final —</option>` + _clientes.map(c => `<option value="${c.id}"${String(_factCli) === String(c.id) ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('');
    const ncfOpts = NCF_TIPOS.map(t => `<option value="${t[0]}"${_facNCF === t[0] ? ' selected' : ''}>${t[1]}</option>`).join('');
    return `<div class="nxFac">
        <div class="nxFacHead">
          <div class="nxFacF" style="grid-column:span 2"><label>Cliente</label><div class="nxFacCliRow"><select id="facCli" onchange="window.nxFacSetCli(this.value)">${cliOpts}</select><button type="button" class="nxFacCliAdd" title="Nuevo cliente" onclick="window.nxPosNuevoCli()"><i class="ti ti-plus"></i></button></div></div>
          <div class="nxFacF nxFacFsm"><label>No. Factura</label><div class="nxFacNum" id="facNumPrev">${proxNumeroFacturaFmt(_facCredito)}</div></div>
          <div class="nxFacF nxFacFsm"><label>Fecha</label><input type="date" id="facFecha" value="${_facFecha || hoy()}" onchange="window.nxFacSetFecha(this.value)"></div>
          <div class="nxFacF"><label>Tipo de comprobante</label><select id="facNCF" onchange="window.nxFacSetNCF(this.value)">${ncfOpts}</select></div>
          <div class="nxFacF nxFacFcred"><label>Condición</label><label class="nxFacCred"><input type="checkbox" id="facCredito" ${_facCredito ? 'checked' : ''} onchange="window.nxFacSetCredito(this.checked)"> A crédito (fiado)</label></div>
        </div>
        <div class="nxFacAdd">
          <i class="ti ti-search"></i>
          <input type="text" id="facBuscar" placeholder="Buscar artículo por nombre o código…" autocomplete="off" oninput="window.nxFacBuscar(this.value)" onfocus="window.nxFacBuscar(this.value)">
          <div id="facSug" class="nxFacSug"></div>
        </div>
        <div id="facTabla"></div>
      </div>`;
  }
  window.nxFacSubTab = function (t) { _facSubTab = t || 'datos'; };
  window.nxFacSetCli = function (v) { _factCli = v || ''; };
  window.nxFacSetFecha = function (v) { _facFecha = v || ''; };
  window.nxFacSetNCF = function (v) { _facNCF = v || 'sin'; };
  window.nxFacSetCredito = function (b) { _facCredito = !!b; const el = document.getElementById('facNumPrev'); if (el) el.textContent = proxNumeroFacturaFmt(_facCredito); };
  window.nxFacBuscar = function (q) {
    const box = document.getElementById('facSug'); if (!box) return;
    const t = String(q || '').trim().toLowerCase();
    if (!t) { box.innerHTML = ''; box.style.display = 'none'; return; }
    const lista = _prods.filter(p => ((p.nombre || '') + ' ' + (p.codigo || '') + ' ' + (p.referencia || '') + ' ' + (p.marca || '')).toLowerCase().includes(t)).slice(0, 8);
    if (!lista.length) { box.innerHTML = '<div class="nxFacSugEmpty">Sin resultados</div>'; box.style.display = 'block'; return; }
    box.innerHTML = lista.map(p => `<div class="nxFacSugIt" onclick="window.nxFacAdd('${p.id}')">
        <div style="flex:1;min-width:0"><div class="nxFacSugNom">${esc(p.nombre || '')}</div><div class="nxFacSugSub">${p.codigo ? '#' + esc(p.codigo) : ''}${p.referencia ? ' · ' + esc(p.referencia) : ''}</div></div>
        <div class="nxFacSugPre">${fmt(p.precio)}<span>${Number(p.stock || 0)} und</span></div>
      </div>`).join('');
    box.style.display = 'block';
  };
  window.nxFacAdd = function (id) {
    const p = _prods.find(x => String(x.id) === String(id)); if (!p) return;
    const ex = _cart.find(x => String(x.producto_id) === String(id));
    if (ex) ex.cantidad += 1; else _cart.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio || 0), cantidad: 1, itbis: !!p.itbis, desc: 0, descT: 'pct' });
    const inp = document.getElementById('facBuscar'); if (inp) { inp.value = ''; inp.focus(); }
    const box = document.getElementById('facSug'); if (box) { box.innerHTML = ''; box.style.display = 'none'; }
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
    pintarFactura();
  };
  window.nxFacCant = function (i, v) { const it = _cart[i]; if (!it) return; const n = Math.max(0, Math.round(Number(String(v).replace(/[^0-9.]/g, '')) || 0)); if (n === 0) { _cart.splice(i, 1); } else it.cantidad = n; pintarFactura(); };
  window.nxFacPrecio = function (i, v) { const it = _cart[i]; if (!it) return; it.precio = Math.max(0, parseMoney(v)); pintarFactura(); };
  window.nxFacDesc = function (i, v) { const it = _cart[i]; if (!it) return; it.desc = Math.max(0, Number(String(v).replace(/[^0-9.]/g, '')) || 0); pintarFactura(); };
  window.nxFacDescTipo = function (i) { const it = _cart[i]; if (!it) return; it.descT = (it.descT === 'mon') ? 'pct' : 'mon'; pintarFactura(); };
  window.nxFacRepaint = function () { const v = document.getElementById('v-pos'); if (v && _posTab === 'factura') pintarFactura(); };
  window.nxFacFacturar = function () { if (!_cart.length) return; window.nxPosCobrar(); };

  // ── TAB: AJUSTES (prefijos del número de factura) ──
  function renderAjustes() {
    return `<div style="max-width:580px">
        <div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:4px"><i class="ti ti-receipt"></i> Numeración de facturas</div>
        <div style="font-size:12px;color:#475569;margin-bottom:16px;line-height:1.5">Define el prefijo del número de factura según el tipo de venta. El consecutivo es automático por empresa.<br>Ejemplo: contado <b style="color:#2563eb">${esc(_posCfg.prefijo_contado)}000001</b> · crédito <b style="color:#2563eb">${esc(_posCfg.prefijo_credito)}000001</b>.</div>
        <div class="fr-row">
          <div class="fr"><label>Prefijo CONTADO</label><input id="cfgPrefCo" value="${esc(_posCfg.prefijo_contado)}" maxlength="6" placeholder="CO" style="text-transform:uppercase"></div>
          <div class="fr"><label>Prefijo CRÉDITO</label><input id="cfgPrefCr" value="${esc(_posCfg.prefijo_credito)}" maxlength="6" placeholder="CR" style="text-transform:uppercase"></div>
        </div>
        <button class="btn bc1" type="button" style="margin-top:8px" onclick="window.nxPosGuardarCfg()"><i class="ti ti-device-floppy"></i> Guardar ajustes</button>
        <div style="border-top:1px solid #eef2f7;margin:22px 0 16px"></div>
        ${ajustesNCF()}
        <div style="border-top:1px solid #eef2f7;margin:22px 0 16px"></div>
        ${ajustesVendedores()}
      </div>`;
  }
  function ajustesVendedores() {
    const filas = _vendedores.length ? _vendedores.map(v => `<tr>
        <td style="font-weight:700">${esc(v.nombre)}</td>
        <td style="text-align:center;color:#475569">${esc(v.telefono || '')}</td>
        <td style="text-align:right;font-weight:700;color:#2563eb">${Number(v.comision_pct || 0)}%</td>
        <td style="text-align:right"><button class="btn bsm bc1" onclick="window.nxVendEdit('${v.id}')"><i class="ti ti-edit"></i></button></td>
      </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:16px;color:#475569;font-size:12px">Sin vendedores. Agrega uno para asignar ventas y calcular comisiones.</td></tr>';
    return `<div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:4px"><i class="ti ti-user-dollar"></i> Vendedores y comisiones</div>
      <div style="font-size:12px;color:#475569;margin-bottom:12px;line-height:1.5">Registra a tus vendedores con su % de comisión. Al cobrar podrás elegir el vendedor; en Reportes ves la comisión de cada uno.</div>
      <div class="tw" style="font-size:12px;margin-bottom:10px"><table style="width:100%"><thead><tr><th>Nombre</th><th style="text-align:center">Teléfono</th><th style="text-align:right">Comisión</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>
      <button class="btn bsm bc1" type="button" onclick="window.nxVendNuevo()"><i class="ti ti-plus"></i> Agregar vendedor</button>`;
  }
  window.nxVendNuevo = function () { abrirVend(null); };
  window.nxVendEdit = function (id) { const v = _vendedores.find(x => String(x.id) === String(id)); if (v) abrirVend(v); };
  function abrirVend(v) {
    cerrarModal('nxVendForm');
    const d = v || {};
    const ov = document.createElement('div'); ov.id = 'nxVendForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:400px">
        <div class="mt"><span><i class="ti ti-user-dollar"></i> ${v ? 'Editar' : 'Nuevo'} vendedor</span><button class="nxBack" type="button" onclick="document.getElementById('nxVendForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr"><label>Nombre *</label><input id="vdN" class="no-upper" value="${esc(d.nombre || '')}" placeholder="Nombre del vendedor"></div>
        <div class="fr-row">
          <div class="fr"><label>Teléfono</label><input id="vdT" class="no-upper" value="${esc(d.telefono || '')}" placeholder="809-..."></div>
          <div class="fr"><label>Comisión (%)</label><input id="vdC" inputmode="decimal" value="${d.comision_pct != null ? Number(d.comision_pct) : '0'}" placeholder="0"></div>
        </div>
        <div class="fr"><label>Activo</label><select id="vdA"><option value="1"${d.activo !== false ? ' selected' : ''}>Sí</option><option value="0"${d.activo === false ? ' selected' : ''}>No</option></select></div>
        <div class="fe" style="margin-top:8px;gap:8px">
          ${v ? `<button class="btn bc3 bsm" type="button" style="margin-right:auto" onclick="window.nxVendDel('${v.id}')"><i class="ti ti-trash"></i></button>` : ''}
          <button class="btn bghost" type="button" onclick="document.getElementById('nxVendForm').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxVendGuardar('${v ? v.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  }
  window.nxVendGuardar = async function (id) {
    const body = { nombre: (val('vdN') || '').trim(), telefono: (val('vdT') || '').trim() || null, comision_pct: parseFloat(val('vdC')) || 0, activo: val('vdA') === '1' };
    if (!body.nombre) { toast('err', 'Falta el nombre'); return; }
    try {
      if (id) await getAPI().patch('pos_vendedores', 'id=eq.' + id, body); else await getAPI().post('pos_vendedores', body);
      cerrarModal('nxVendForm'); toast('ok', 'Vendedor guardado');
      try { _vendedores = await getAPI().get('pos_vendedores', 'select=*&activo=eq.true&order=nombre.asc') || []; } catch (e) {}
      const vv = document.getElementById('v-pos'); if (vv) renderPOS(vv);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxVendDel = async function (id) {
    if (!confirm('¿Eliminar este vendedor?')) return;
    try { await getAPI().del('pos_vendedores', 'id=eq.' + id); cerrarModal('nxVendForm'); toast('ok', 'Vendedor eliminado'); _vendedores = await getAPI().get('pos_vendedores', 'select=*&activo=eq.true&order=nombre.asc') || []; const vv = document.getElementById('v-pos'); if (vv) renderPOS(vv); } catch (e) { toast('err', 'No se pudo eliminar'); }
  };
  const NCF_DESC = { B01: 'Crédito Fiscal', B02: 'Consumo', B14: 'Régimen Especial', B15: 'Gubernamental', B16: 'Exportación', B04: 'Nota de Crédito' };
  // Mapa: valor del selector de comprobante de la Factura -> código NCF de la secuencia
  const NCF_MAP = { consumo: 'B02', credito_fiscal: 'B01', gubernamental: 'B15', regimen_especial: 'B14', B01: 'B01', B02: 'B02', B14: 'B14', B15: 'B15', B16: 'B16', B04: 'B04' };
  function ajustesNCF() {
    const filas = _ncfSecs.length ? _ncfSecs.map(s => {
      const restante = Math.max(0, Number(s.hasta || 0) - Number(s.actual || 0) + 1);
      const bajo = restante <= 10;
      return `<tr${s.activo === false ? ' style="opacity:.5"' : ''}>
        <td><b>${esc(s.tipo)}</b> <span style="font-size:10px;color:#475569">${esc(s.descripcion || NCF_DESC[s.tipo] || '')}</span></td>
        <td style="text-align:center;font-family:var(--mono,monospace);font-size:11px">${esc(s.prefijo)}${String(s.actual).padStart(8, '0')}</td>
        <td style="text-align:right;color:${bajo ? '#dc2626' : '#475569'};font-weight:${bajo ? '800' : '400'}">${restante}${bajo ? ' ⚠' : ''}</td>
        <td style="text-align:right"><button class="btn bsm bc1" onclick="window.nxNcfEdit('${s.id}')"><i class="ti ti-edit"></i></button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="4" style="text-align:center;padding:16px;color:#475569;font-size:12px">Sin secuencias NCF. Agrega una para emitir comprobantes fiscales.</td></tr>';
    return `<div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:4px"><i class="ti ti-file-certificate"></i> Comprobantes Fiscales (NCF)</div>
      <div style="font-size:12px;color:#475569;margin-bottom:12px;line-height:1.5">Carga tus secuencias autorizadas por la DGII. Al facturar con un tipo de comprobante, el NCF se asigna y avanza solo. Te avisa cuando quedan pocos.</div>
      <div class="tw" style="font-size:12px;margin-bottom:10px"><table style="width:100%"><thead><tr><th>Tipo</th><th style="text-align:center">Próximo NCF</th><th style="text-align:right">Restan</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>
      <button class="btn bsm bc1" type="button" onclick="window.nxNcfNuevo()"><i class="ti ti-plus"></i> Agregar secuencia NCF</button>`;
  }
  window.nxNcfNuevo = function () { abrirNcf(null); };
  window.nxNcfEdit = function (id) { const s = _ncfSecs.find(x => String(x.id) === String(id)); if (s) abrirNcf(s); };
  function abrirNcf(s) {
    cerrarModal('nxNcfForm');
    const d = s || {};
    const tipos = Object.keys(NCF_DESC).map(t => `<option value="${t}"${d.tipo === t ? ' selected' : ''}>${t} — ${NCF_DESC[t]}</option>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxNcfForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:420px">
        <div class="mt"><span><i class="ti ti-file-certificate"></i> ${s ? 'Editar' : 'Nueva'} secuencia NCF</span><button class="nxBack" type="button" onclick="document.getElementById('nxNcfForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr"><label>Tipo de comprobante *</label><select id="ncT" onchange="var p=document.getElementById('ncP');if(p&&!p.value)p.value=this.value">${tipos}</select></div>
        <div class="fr"><label>Prefijo (normalmente igual al tipo)</label><input id="ncP" class="no-upper" value="${esc(d.prefijo || d.tipo || '')}" placeholder="Ej: B02"></div>
        <div class="fr-row">
          <div class="fr"><label>Desde *</label><input id="ncD" inputmode="numeric" value="${d.desde != null ? d.desde : '1'}" placeholder="1"></div>
          <div class="fr"><label>Hasta *</label><input id="ncH" inputmode="numeric" value="${d.hasta != null ? d.hasta : ''}" placeholder="Ej: 1000"></div>
        </div>
        <div class="fr-row">
          <div class="fr"><label>Próximo a usar</label><input id="ncA" inputmode="numeric" value="${d.actual != null ? d.actual : (d.desde != null ? d.desde : '1')}" placeholder="1"></div>
          <div class="fr"><label>Vence (opcional)</label><input type="date" id="ncV" value="${esc((d.vencimiento || '').slice(0, 10))}"></div>
        </div>
        <div class="fr"><label>Activa</label><select id="ncAct"><option value="1"${d.activo !== false ? ' selected' : ''}>Sí</option><option value="0"${d.activo === false ? ' selected' : ''}>No</option></select></div>
        <div class="fe" style="margin-top:8px;gap:8px">
          ${s ? `<button class="btn bc3 bsm" type="button" style="margin-right:auto" onclick="window.nxNcfDel('${s.id}')"><i class="ti ti-trash"></i></button>` : ''}
          <button class="btn bghost" type="button" onclick="document.getElementById('nxNcfForm').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxNcfGuardar('${s ? s.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  }
  window.nxNcfGuardar = async function (id) {
    const tipo = val('ncT'); const prefijo = ((val('ncP') || '').trim().toUpperCase() || tipo);
    const desde = parseInt(val('ncD'), 10) || 1, hasta = parseInt(val('ncH'), 10) || 0;
    let actual = parseInt(val('ncA'), 10); if (!actual) actual = desde;
    if (hasta < desde) { toast('err', 'El "hasta" debe ser mayor que el "desde"'); return; }
    const body = { tipo: tipo, descripcion: NCF_DESC[tipo] || null, prefijo: prefijo, desde: desde, hasta: hasta, actual: actual, vencimiento: val('ncV') || null, activo: val('ncAct') === '1' };
    try {
      if (id) await getAPI().patch('pos_ncf_secuencias', 'id=eq.' + id, body); else await getAPI().post('pos_ncf_secuencias', body);
      cerrarModal('nxNcfForm'); toast('ok', 'Secuencia NCF guardada');
      try { _ncfSecs = await getAPI().get('pos_ncf_secuencias', 'select=*&order=tipo.asc') || []; } catch (e) {}
      const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxNcfDel = async function (id) {
    if (!confirm('¿Eliminar esta secuencia NCF?')) return;
    try { await getAPI().del('pos_ncf_secuencias', 'id=eq.' + id); cerrarModal('nxNcfForm'); toast('ok', 'Secuencia eliminada'); _ncfSecs = await getAPI().get('pos_ncf_secuencias', 'select=*&order=tipo.asc') || []; const v = document.getElementById('v-pos'); if (v) renderPOS(v); } catch (e) { toast('err', 'No se pudo eliminar'); }
  };
  // Asigna el próximo NCF de una secuencia activa para el tipo dado (avanza el contador)
  async function asignarNCF(tipoFactura) {
    try {
      if (!tipoFactura || tipoFactura === 'sin') return null;
      const cod = NCF_MAP[tipoFactura] || tipoFactura;
      const s = _ncfSecs.find(x => x.tipo === cod && x.activo !== false && Number(x.actual || 0) <= Number(x.hasta || 0));
      if (!s) return null;
      const num = Number(s.actual || s.desde || 1);
      const ncf = (s.prefijo || tipo) + String(num).padStart(8, '0');
      await getAPI().patch('pos_ncf_secuencias', 'id=eq.' + s.id, { actual: num + 1 });
      s.actual = num + 1;
      return ncf;
    } catch (e) { return null; }
  }
  window.nxPosGuardarCfg = async function () {
    const co = (val('cfgPrefCo') || '').trim().toUpperCase().replace(/\s/g, '') || 'CO';
    const cr = (val('cfgPrefCr') || '').trim().toUpperCase().replace(/\s/g, '') || 'CR';
    try {
      const ex = await getAPI().get('pos_config', 'select=organizacion_id&limit=1');
      if (ex && ex.length) await getAPI().patch('pos_config', 'organizacion_id=eq.' + ex[0].organizacion_id, { prefijo_contado: co, prefijo_credito: cr });
      else await getAPI().post('pos_config', { prefijo_contado: co, prefijo_credito: cr });
      _posCfg = { prefijo_contado: co, prefijo_credito: cr };
      toast('ok', 'Ajustes guardados', 'Contado: ' + co + ' · Crédito: ' + cr);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  function pintarFactura() {
    const cont = document.getElementById('facTabla'); if (!cont) return;
    const t = totales();
    const filas = _cart.length ? _cart.map((it, i) => {
      const exi = prodStock(it.producto_id);
      return `<tr>
        <td class="nxFacCod">${esc(prodCodigo(it.producto_id) || '—')}</td>
        <td class="nxFacDesc">${esc(it.nombre)}</td>
        <td class="nxFacExi"><span${exi <= 0 ? ' class="nxFacExi0"' : ''}>${exi}</span></td>
        <td class="nxFacCant"><input inputmode="numeric" value="${it.cantidad}" onchange="window.nxFacCant(${i},this.value)"></td>
        <td class="nxFacPre"><input inputmode="decimal" value="${Math.round(it.precio)}" onchange="window.nxFacPrecio(${i},this.value)"></td>
        <td class="nxFacDsc"><div class="nxFacDscBox"><input inputmode="decimal" value="${Number(it.desc || 0)}" onchange="window.nxFacDesc(${i},this.value)"><button type="button" onclick="window.nxFacDescTipo(${i})" title="Cambiar % / RD$">${it.descT === 'mon' ? 'RD$' : '%'}</button></div></td>
        <td class="nxFacImp">${fmt(lineImporte(it))}</td>
        <td class="nxFacDel"><button type="button" onclick="window.nxPosDel(${i});window.nxFacRepaint()"><i class="ti ti-x"></i></button></td>
      </tr>`;
    }).join('') : `<tr><td colspan="8" class="nxFacEmpty">Aún no hay artículos. Búscalos arriba y se agregan a la factura.</td></tr>`;
    cont.innerHTML = `<div class="nxFacTblWrap"><table class="nxFacTbl">
        <thead><tr><th>Código</th><th>Descripción</th><th>Exist.</th><th>Cant.</th><th>Precio</th><th>Desc.</th><th>Importe</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
      <div class="nxFacTot">
        ${t.descuento > 0 ? `<div class="nxFacTotR"><span>Descuento</span><span style="color:#dc2626">− ${fmt(t.descuento)}</span></div>` : ''}
        <div class="nxFacTotR"><span>Subtotal</span><span>${fmt(t.subtotal)}</span></div>
        <div class="nxFacTotR"><span>ITBIS (18%)</span><span>${fmt(t.itbis)}</span></div>
        <div class="nxFacTotR nxFacTotBig"><span>TOTAL</span><span>${fmt(t.total)}</span></div>
      </div>
      <div class="nxFacActions">
        ${_cart.length ? `<button type="button" class="btn bghost bsm" onclick="window.nxPosVaciar();window.nxFacRepaint()"><i class="ti ti-trash"></i> Vaciar</button>` : ''}
        <button type="button" class="btn bc1 nxFacBtn" ${_cart.length ? '' : 'disabled style="opacity:.5"'} onclick="window.nxFacFacturar()"><i class="ti ti-cash"></i> Cobrar ${fmt(t.total)}</button>
      </div>`;
  }

  // ── Cobrar / checkout ──
  function leerCobro() {
    const tt = totales(); const base = tt.total; const itbisBruto = tt.itbis;
    const desc = Math.max(0, Math.min(100, Number(String(val('posDesc') || '0').replace(',', '.').replace(/[^0-9.]/g, '')) || 0));
    const descMonto = Math.round(base * desc / 100);
    const total = base - descMonto;
    const itbis = base > 0 ? Math.round(itbisBruto * total / base) : 0;
    const subtotal = total - itbis;
    const efe = parseMoney(val('payEfe')), tar = parseMoney(val('payTar')), tra = parseMoney(val('payTra')), che = parseMoney(val('payChe')), nc = parseMoney(val('payNc'));
    const pagado = efe + tar + tra + che + nc;
    const credito = Math.max(0, total - pagado);
    const devuelta = Math.max(0, pagado - total);
    return { base: base, descPct: desc, descMonto: descMonto, total: total, itbis: itbis, subtotal: subtotal, efe: efe, tar: tar, tra: tra, che: che, nc: nc, pagado: pagado, credito: credito, devuelta: devuelta };
  }
  window.nxPosCobrar = function () {
    if (!_cart.length) return;
    const t = totales();
    cerrarModal('nxPosPago');
    const ov = document.createElement('div'); ov.id = 'nxPosPago'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:92vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-cash"></i> Cobrar</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosPago').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div class="fr"><label>Cliente</label><select id="posCliId" onchange="window.nxPosCobroCalc()"><option value="">— Consumidor final —</option>${_clientes.map(c => `<option value="${c.id}"${String(_factCli) === String(c.id) ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div>
          <div class="fr" id="posCliNomBox"><label>Nombre (opcional, para el ticket)</label><input id="posCli" class="no-upper" placeholder="Nombre del cliente"></div>
          ${_vendedores.length ? `<div class="fr"><label>Vendedor</label><select id="posVendId"><option value="">— Sin vendedor —</option>${_vendedores.map(v => `<option value="${v.id}">${esc(v.nombre)}</option>`).join('')}</select></div>` : ''}
          <div class="fr-row">
            <div class="fr"><label>Descuento %</label><input id="posDesc" inputmode="decimal" value="0" oninput="window.nxPosCobroCalc()"></div>
            <div class="fr"><label>Total a pagar</label><input id="posTotalLbl" readonly value="${fmt(t.total)}" style="background:#f0fdf4;font-weight:800;color:#065f46"></div>
          </div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:6px 0 6px">FORMA DE PAGO <span style="font-weight:600;color:#475569">(deja en 0 lo que no aplique; lo que falte queda fiado)</span></div>
          <div class="fr-row"><div class="fr"><label>Efectivo</label><input id="payEfe" data-nx-money inputmode="numeric" placeholder="0" oninput="window.nxPosCobroCalc()"></div><div class="fr"><label>Tarjeta</label><input id="payTar" data-nx-money inputmode="numeric" placeholder="0" oninput="window.nxPosCobroCalc()"></div></div>
          <div class="fr-row"><div class="fr"><label>Transferencia</label><input id="payTra" data-nx-money inputmode="numeric" placeholder="0" oninput="window.nxPosCobroCalc()"></div><div class="fr"><label>Cheque</label><input id="payChe" data-nx-money inputmode="numeric" placeholder="0" oninput="window.nxPosCobroCalc()"></div></div>
          <div class="fr"><label>Nota de crédito</label><input id="payNc" data-nx-money inputmode="numeric" placeholder="0" oninput="window.nxPosCobroCalc()"></div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px 12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 0"><span style="color:#475569">Pagado</span><b id="cobroPagado">RD$ 0</b></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 0"><span id="cobroRestoLbl" style="color:#475569">Pendiente</span><b id="cobroResto" style="color:#16a34a">RD$ 0</b></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 0"><span style="color:#475569">Devuelta</span><b id="cobroDev" style="color:#16a34a">RD$ 0</b></div>
            <div id="cobroFiadoNote"></div>
          </div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="window.nxPosPagoExacto()">Efectivo exacto</button>
          <button class="btn bc1" type="button" onclick="window.nxPosConfirmar()"><i class="ti ti-check"></i> Confirmar venta</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
    window.nxPosCobroCalc();
  };
  window.nxPosPagoExacto = function () {
    const c = leerCobro(); const el = document.getElementById('payEfe');
    if (el) { el.value = Math.round(c.total).toLocaleString('en-US'); }
    window.nxPosCobroCalc();
  };
  window.nxPosCobroCalc = function () {
    const box = document.getElementById('posCliNomBox'); const cliId = val('posCliId'); if (box) box.style.display = cliId ? 'none' : '';
    const c = leerCobro();
    const setT = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const elTot = document.getElementById('posTotalLbl'); if (elTot) elTot.value = fmt(c.total);
    setT('cobroPagado', fmt(c.pagado)); setT('cobroResto', fmt(c.credito)); setT('cobroDev', fmt(c.devuelta));
    const rl = document.getElementById('cobroRestoLbl'); if (rl) rl.textContent = c.credito > 0 ? 'Falta / Fiado' : 'Pendiente';
    const rEl = document.getElementById('cobroResto'); if (rEl) rEl.style.color = c.credito > 0 ? '#dc2626' : '#16a34a';
    const note = document.getElementById('cobroFiadoNote');
    if (note) note.innerHTML = (c.credito > 0 && !cliId) ? '<div style="font-size:10.5px;color:#dc2626;margin-top:4px">⚠️ Quedan ' + fmt(c.credito) + ' a fiar: elige un cliente.</div>' : (c.credito > 0 ? '<div style="font-size:10.5px;color:#9a3412;margin-top:4px">' + fmt(c.credito) + ' quedará fiado a la cuenta del cliente.</div>' : '');
  };
  window.nxPosConfirmar = async function () {
    if (!_cart.length) return;
    const c = leerCobro();
    const cliId = val('posCliId') || null;
    if (c.credito > 0 && !cliId) { toast('err', 'Hay monto a fiar: elige un cliente'); return; }
    const cliNom = cliId ? ((_clientes.find(x => String(x.id) === String(cliId)) || {}).nombre || null) : ((val('posCli') || '').trim() || null);
    const vendId = val('posVendId') || null;
    const vendNom = vendId ? ((_vendedores.find(x => String(x.id) === String(vendId)) || {}).nombre || null) : null;
    const pagosArr = [];
    if (c.efe > 0) pagosArr.push({ metodo: 'Efectivo', monto: c.efe });
    if (c.tar > 0) pagosArr.push({ metodo: 'Tarjeta', monto: c.tar });
    if (c.tra > 0) pagosArr.push({ metodo: 'Transferencia', monto: c.tra });
    if (c.che > 0) pagosArr.push({ metodo: 'Cheque', monto: c.che });
    if (c.nc > 0) pagosArr.push({ metodo: 'Nota de crédito', monto: c.nc });
    if (c.credito > 0) pagosArr.push({ metodo: 'Crédito (fiado)', monto: c.credito });
    const metodoLabel = pagosArr.length === 0 ? 'Efectivo' : pagosArr.length === 1 ? pagosArr[0].metodo : 'Mixto';
    // Número de factura con prefijo según tipo (contado/crédito) y consecutivo por empresa
    let numFac = '';
    try {
      const esCred = c.credito > 0; const pref = prefijoFac(esCred);
      const last = await getAPI().get('pos_ventas', `a_credito=eq.${esCred}&numero_factura=like.${encodeURIComponent(pref)}*&select=numero_factura&order=created_at.desc&limit=1`);
      let nx = 1; if (last && last[0] && last[0].numero_factura) { const m = String(last[0].numero_factura).match(/(\d+)\s*$/); if (m) nx = parseInt(m[1], 10) + 1; }
      numFac = pref + String(nx).padStart(8, '0');
    } catch (e) {}
    const body = {
      cliente_id: cliId, cliente_nombre: cliNom, a_credito: c.credito > 0,
      subtotal: c.subtotal, itbis: c.itbis, total: c.total, descuento: c.descMonto,
      metodo_pago: metodoLabel, pagos: pagosArr,
      pagado_efectivo: c.efe, pagado_tarjeta: c.tar, pagado_transferencia: c.tra, pagado_otro: c.che + c.nc,
      credito_monto: c.credito, recibido: c.efe, devuelta: c.devuelta,
      tipo_comprobante: _facNCF || 'sin', numero_factura: numFac || null,
      vendedor_id: vendId, vendedor_nombre: vendNom,
      estado: 'completada', caja_id: (_caja && _caja.id) || null, created_by_name: nomAdmin()
    };
    if (_facFecha) body.fecha = _facFecha;
    try {
      const r = await getAPI().post('pos_ventas', body);
      const venta = (r && r[0]) || null;
      if (!venta) throw new Error('No se pudo registrar la venta');
      const items = _cart.map(it => ({ venta_id: venta.id, producto_id: it.producto_id, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad, itbis: it.itbis, descuento: Math.round(lineDescMonto(it)), importe: Math.round(lineImporte(it)) }));
      try { await getAPI().post('pos_venta_items', items); } catch (e) {}
      // Asignar NCF fiscal si hay secuencia activa para el tipo elegido (best-effort)
      let ncfAsignado = null;
      try { ncfAsignado = await asignarNCF(_facNCF); if (ncfAsignado) await getAPI().patch('pos_ventas', 'id=eq.' + venta.id, { ncf: ncfAsignado }); } catch (e) {}
      // contabilizar la venta automáticamente (best-effort, no bloquea la venta)
      try { postAsientoVenta(venta, c); } catch (e) {}
      // descontar stock (best-effort; los servicios no manejan stock)
      for (const it of _cart) {
        try { const p = _prods.find(x => String(x.id) === String(it.producto_id)); if (p && p.tipo !== 'servicio') { const ns = Number(p.stock || 0) - Number(it.cantidad); p.stock = ns; getAPI().patch('pos_productos', 'id=eq.' + p.id, { stock: ns }).catch(() => {}); } } catch (e) {}
      }
      if (c.credito > 0 && cliId) { _fiadoByCli[cliId] = (_fiadoByCli[cliId] || 0) + c.credito; }
      toast('ok', c.credito > 0 ? 'Venta registrada (parte fiada)' : 'Venta registrada', 'No. ' + (venta.numero || '') + ' · ' + fmt(c.total));
      const ventaTicket = Object.assign({}, body, { id: venta.id, numero: venta.numero, fecha: venta.fecha || new Date().toISOString(), ncf: ncfAsignado, _items: items });
      _cart = [];
      _factCli = '';
      _facNCF = 'sin'; _facCredito = false; _facFecha = ''; _facSubTab = 'datos';
      cerrarModal('nxPosPago');
      const view = document.getElementById('v-pos'); if (view && (_posTab === 'vender' || _posTab === 'factura')) renderPOS(view);
      ticketHTML(ventaTicket);
    } catch (e) { toast('err', 'No se pudo cobrar', String(e && e.message || e)); }
  };

  // ── Ticket imprimible ──
  function ticketHTML(v) {
    const e = empInfo();
    const items = v._items || [];
    const filas = items.map(it => `<tr><td>${Number(it.cantidad)}x ${esc(it.nombre)}</td><td style="text-align:right">${fmt(it.importe)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket No. ${v.numero || ''}</title>
      <style>body{font-family:'Courier New',monospace;color:#111;max-width:300px;margin:0 auto;padding:12px;font-size:12.5px}h1{font-size:15px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:2px 0}.line{border-top:1px dashed #999;margin:6px 0}.tot{font-weight:800}.big{font-size:15px}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-12px -12px 10px;padding:9px 12px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-family:Arial">✕ Cerrar</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="c muted">${e.rnc ? 'RNC: ' + esc(e.rnc) : ''}${e.tel ? ' · ' + esc(e.tel) : ''}</div>
        <div class="c muted">${esc(e.dir || '')}</div>
        <div class="line"></div>
        <div class="c"><b>${v.numero_factura ? ('FACTURA ' + v.numero_factura) : ('TICKET DE VENTA No. ' + (v.numero || ''))}</b></div>
        ${v.ncf ? `<div class="c muted">NCF: <b>${esc(v.ncf)}</b></div>` : ''}
        <div class="muted">${fechaDMY(v.fecha)}${v.cliente_nombre ? '<br>Cliente: ' + esc(v.cliente_nombre) : ''}</div>
        <div class="line"></div>
        <table>${filas}</table>
        <div class="line"></div>
        <table>
          <tr><td>Subtotal</td><td style="text-align:right">${fmt(v.subtotal)}</td></tr>
          ${Number(v.descuento || 0) > 0 ? `<tr><td>Descuento</td><td style="text-align:right">- ${fmt(v.descuento)}</td></tr>` : ''}
          <tr><td>ITBIS (18%)</td><td style="text-align:right">${fmt(v.itbis)}</td></tr>
          <tr class="tot big"><td>TOTAL</td><td style="text-align:right">${fmt(v.total)}</td></tr>
        </table>
        <div class="line"></div>
        <table>${(Array.isArray(v.pagos) && v.pagos.length ? v.pagos : [{ metodo: v.metodo_pago, monto: v.total }]).map(p => `<tr><td>${esc(p.metodo)}</td><td style="text-align:right">${fmt(p.monto)}</td></tr>`).join('')}${Number(v.devuelta || 0) > 0 ? `<tr><td>Devuelta</td><td style="text-align:right">${fmt(v.devuelta)}</td></tr>` : ''}</table>
        <div class="line"></div>
        <div class="c muted">¡Gracias por su compra!</div>
        <button class="noprint" onclick="window.print()" style="width:100%;padding:12px;margin-top:14px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:Arial">🖨️ Imprimir</button>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes para ver el ticket'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  }
  window.nxPosTicket = async function (ventaId) {
    let v = _ventas.find(x => String(x.id) === String(ventaId));
    if (!v) return;
    let items = [];
    try { items = await getAPI().get('pos_venta_items', 'select=*&venta_id=eq.' + ventaId) || []; } catch (e) {}
    ticketHTML(Object.assign({}, v, { _items: items }));
  };

  // ── TAB: PRODUCTOS ──
  function renderProductos() {
    const bajos = _prods.filter(p => p.tipo !== 'servicio' && Number(p.stock || 0) <= Number(p.stock_min || 0) && Number(p.stock_min || 0) > 0).length;
    const filas = _prods.length ? _prods.map(p => {
      const serv = p.tipo === 'servicio';
      const bajo = !serv && Number(p.stock || 0) <= Number(p.stock_min || 0) && Number(p.stock_min || 0) > 0;
      return `<tr>
        <td><div style="font-weight:700;font-size:12px">${esc(p.nombre || '')}${serv ? ' <span style="font-size:8px;color:#7c3aed;background:#faf5ff;padding:1px 5px;border-radius:6px">SERVICIO</span>' : ''}</div><div style="font-size:10px;color:#475569">${esc(p.codigo || '')}${p.referencia ? ' · ' + esc(p.referencia) : ''}${p.marca ? ' · ' + esc(p.marca) : ''}</div></td>
        <td style="text-align:right;font-weight:700">${fmt(p.precio)}</td>
        <td style="text-align:right;color:${serv ? '#cbd5e1' : (Number(p.stock) <= 0 ? '#dc2626' : bajo ? '#ea580c' : '#475569')}">${serv ? '—' : Number(p.stock || 0)}${bajo ? ' <i class="ti ti-alert-triangle" style="font-size:11px"></i>' : ''}</td>
        <td style="text-align:center">${p.itbis ? '<span style="font-size:9px;color:#2563eb">18%</span>' : '<span style="font-size:9px;color:#475569">—</span>'}</td>
        <td style="white-space:nowrap;text-align:right"><button class="btn bsm bc1" onclick="window.nxPosEditProd('${p.id}')"><i class="ti ti-edit"></i></button> <button class="btn bsm bc3" onclick="window.nxPosDelProd('${p.id}')"><i class="ti ti-trash"></i></button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:24px;color:#475569;font-size:12px">Sin productos. Toca "Nuevo" para agregar.</td></tr>';
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
        <button class="btn bsm bghost" type="button" onclick="window.nxPosCategorias()"><i class="ti ti-tags"></i> Categorías</button>
        <button class="btn bsm bc1" type="button" onclick="window.nxPosNuevoProd()"><i class="ti ti-plus"></i> Nuevo producto</button>
        <button class="btn bsm bghost" type="button" onclick="window.nxPosImportarUI()"><i class="ti ti-file-import"></i> Importar</button>
        ${bajos > 0 ? `<span style="font-size:10.5px;color:#ea580c;font-weight:700;margin-left:auto"><i class="ti ti-alert-triangle"></i> ${bajos} con stock bajo</span>` : ''}
      </div>
      <div class="tw" style="font-size:11px"><table style="width:100%"><thead><tr><th>Producto</th><th style="text-align:right">Precio</th><th style="text-align:right">Stock</th><th style="text-align:center">ITBIS</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }
  window.nxPosNuevoProd = function () { abrirProd(null); };
  window.nxPosEditProd = function (id) { const p = _prods.find(x => String(x.id) === String(id)); if (p) abrirProd(p); };
  function abrirProd(p) {
    cerrarModal('nxPosProd');
    const e = p || {};
    const catOpts = _cats.map(c => `<option value="${c.id}"${String(e.categoria_id) === String(c.id) ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxPosProd'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `
      <div class="modal nxPrForm" style="max-width:440px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-box"></i> ${p ? 'Editar producto' : 'Nuevo producto'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosProd').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div class="fr"><label>Nombre *</label><input id="ppNom" class="no-upper" value="${esc(e.nombre || '')}" placeholder="Nombre del producto"></div>
          <div class="fr-row">
            <div class="fr"><label>Referencia / spec</label><input id="ppRef" class="no-upper" value="${esc(e.referencia || '')}" placeholder="Ej: 128GB, color..."></div>
            <div class="fr"><label>Marca</label><input id="ppMarca" class="no-upper" value="${esc(e.marca || '')}" placeholder="Ej: Apple"></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Código / barra</label><input id="ppCod" class="no-upper" value="${esc(e.codigo || '')}" placeholder="Opcional"></div>
            <div class="fr"><label>Categoría</label><select id="ppCat"><option value="">— Sin categoría —</option>${catOpts}</select></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Precio CONTADO (con ITBIS)</label><input id="ppPre" data-nx-money inputmode="numeric" value="${e.precio ? Math.round(e.precio) : ''}" placeholder="0"></div>
            <div class="fr"><label>Precio CRÉDITO</label><input id="ppPreCred" data-nx-money inputmode="numeric" value="${e.precio_credito ? Math.round(e.precio_credito) : ''}" placeholder="= contado"></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Costo</label><input id="ppCos" data-nx-money inputmode="numeric" value="${e.costo ? Math.round(e.costo) : ''}" placeholder="0"></div>
            <div class="fr"><label>Stock</label><input id="ppStk" inputmode="numeric" value="${e.stock != null ? Number(e.stock) : '0'}" placeholder="0"></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>¿Lleva ITBIS (18%)?</label><select id="ppItb"><option value="1"${e.itbis !== false ? ' selected' : ''}>Sí</option><option value="0"${e.itbis === false ? ' selected' : ''}>No (exento)</option></select></div>
            <div class="fr"><label>Imagen (URL opcional)</label><input id="ppImg" class="no-upper" value="${esc(e.imagen || '')}" placeholder="https://..."></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Tipo</label><select id="ppTipo"><option value="producto"${e.tipo !== 'servicio' ? ' selected' : ''}>Producto (con stock)</option><option value="servicio"${e.tipo === 'servicio' ? ' selected' : ''}>Servicio (sin stock)</option></select></div>
            <div class="fr"><label>Stock mínimo (alerta)</label><input id="ppMin" inputmode="numeric" value="${e.stock_min != null ? Number(e.stock_min) : '0'}" placeholder="0"></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Garantía (días)</label><input id="ppGar" inputmode="numeric" value="${e.garantia_dias != null ? Number(e.garantia_dias) : '0'}" placeholder="0"></div>
            <div class="fr"><label>¿Maneja serial / IMEI?</label><select id="ppSer"><option value="0"${!e.serial ? ' selected' : ''}>No</option><option value="1"${e.serial ? ' selected' : ''}>Sí</option></select></div>
          </div>
          <div class="fr"><label>¿Permite descuento?</label><select id="ppNoDesc"><option value="0"${!e.no_descuento ? ' selected' : ''}>Sí, permite descuento</option><option value="1"${e.no_descuento ? ' selected' : ''}>No (precio fijo)</option></select></div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          <button class="btn bghost" type="button" onclick="document.getElementById('nxPosProd').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxPosGuardarProd('${p ? p.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  }
  window.nxPosGuardarProd = async function (id) {
    const precio = parseMoney(val('ppPre'));
    const tipo = val('ppTipo') === 'servicio' ? 'servicio' : 'producto';
    const body = {
      nombre: (val('ppNom') || '').trim(),
      referencia: (val('ppRef') || '').trim() || null,
      marca: (val('ppMarca') || '').trim() || null,
      imagen: (val('ppImg') || '').trim() || null,
      codigo: (val('ppCod') || '').trim() || null,
      categoria_id: val('ppCat') || null,
      precio: precio,
      precio_credito: parseMoney(val('ppPreCred')) || precio,
      costo: parseMoney(val('ppCos')),
      stock: tipo === 'servicio' ? 0 : (Number(String(val('ppStk') || '0').replace(/[^0-9.-]/g, '')) || 0),
      itbis: val('ppItb') === '1',
      tipo: tipo,
      stock_min: Number(String(val('ppMin') || '0').replace(/[^0-9.-]/g, '')) || 0,
      garantia_dias: parseInt(val('ppGar'), 10) || 0,
      serial: val('ppSer') === '1',
      no_descuento: val('ppNoDesc') === '1'
    };
    if (!body.nombre) { toast('err', 'Pon el nombre del producto'); return; }
    try {
      if (id) await getAPI().patch('pos_productos', 'id=eq.' + id, body);
      else await getAPI().post('pos_productos', body);
      toast('ok', id ? 'Producto actualizado' : 'Producto agregado', body.nombre);
      cerrarModal('nxPosProd');
      await cargarPOS();
      const view = document.getElementById('v-pos'); if (view) renderPOS(view);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxPosDelProd = async function (id) {
    const p = _prods.find(x => String(x.id) === String(id)); if (!p) return;
    if (!confirm('¿Eliminar el producto "' + (p.nombre || '') + '"?')) return;
    try { await getAPI().patch('pos_productos', 'id=eq.' + id, { activo: false }); toast('ok', 'Producto eliminado'); await cargarPOS(); const view = document.getElementById('v-pos'); if (view) renderPOS(view); }
    catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  // ── Importar productos (desde Infoplus) ──
  // Pega el JSON exportado de Infoplus. Cada fila: [Codigo, Descripcion, Existencia, Referencia, Marca, Imagen].
  // Precio/costo entran en 0 (cada negocio pone sus precios). No duplica por codigo.
  function parseInfoplus(text) {
    let t = (text || '').trim(); if (!t) return [];
    let dstr = null;
    try { const o = JSON.parse(t);
      if (Array.isArray(o)) return o;
      if (o && typeof o.d === 'string') dstr = o.d;
      else if (o && Array.isArray(o.d)) return o.d;
    } catch (e) { dstr = t; }
    if (dstr == null) dstr = t;
    dstr = String(dstr).split('|||')[0].trim();
    const arr = JSON.parse(dstr);
    return Array.isArray(arr) ? arr : [];
  }
  window.nxPosImportarUI = function () {
    cerrarModal('nxPosImp');
    const ov = document.createElement('div'); ov.id = 'nxPosImp'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:460px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-file-import"></i> Importar productos</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosImp').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px;margin-bottom:10px;line-height:1.5">
            Pega aquí el inventario exportado de <b>Infoplus</b> (el texto que empieza con <code>{"d":</code> o con <code>[[</code>).<br>
            Se cargan: <b>descripción, existencia, referencia y marca</b>. El <b>precio y el costo entran en 0</b> — luego los pones tú. No se duplican los códigos que ya existan.
          </div>
          <div class="fr"><label>Datos de Infoplus</label><textarea id="impTxt" class="no-upper" placeholder='{"d":"[[1000,\\"CELULAR...\\",3,\\"128GB\\",\\"M-HORSE\\",\\"\\"]...' style="width:100%;min-height:160px;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:11px;font-family:monospace;outline:none;resize:vertical"></textarea></div>
          <div id="impMsg" style="font-size:11px;color:#475569;min-height:16px;margin-top:4px"></div>
        </div>
        <div style="display:flex;gap:8px;padding-top:10px">
          <button class="btn bghost" type="button" style="flex:1" onclick="document.getElementById('nxPosImp').remove()">Cancelar</button>
          <button class="btn bc1" type="button" style="flex:2" id="impBtn" onclick="window.nxPosImportarRun()"><i class="ti ti-download"></i> Importar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.nxPosImportarRun = async function () {
    const msg = document.getElementById('impMsg'); const btn = document.getElementById('impBtn');
    const setMsg = (t, c) => { if (msg) { msg.textContent = t; msg.style.color = c || '#475569'; } };
    let filas;
    try { filas = parseInfoplus(val('impTxt')); }
    catch (e) { setMsg('No pude leer el texto. Verifica que pegaste el JSON completo de Infoplus.', '#dc2626'); return; }
    if (!filas.length) { setMsg('No se encontraron productos en el texto pegado.', '#dc2626'); return; }
    const existentes = new Set(_prods.map(p => String(p.codigo || '').trim()).filter(Boolean));
    const nuevos = []; let saltados = 0;
    for (const r of filas) {
      const codigo = String(r[0] != null ? r[0] : '').trim();
      const nombre = String(r[1] != null ? r[1] : '').trim();
      if (!nombre) { saltados++; continue; }
      if (codigo && existentes.has(codigo)) { saltados++; continue; }
      if (codigo) existentes.add(codigo);
      nuevos.push({
        nombre: nombre,
        codigo: codigo || null,
        referencia: String(r[3] != null ? r[3] : '').trim() || null,
        marca: String(r[4] != null ? r[4] : '').trim() || null,
        imagen: null,
        precio: 0, precio_credito: 0, costo: 0,
        stock: Number(String(r[2] != null ? r[2] : 0).replace(/[^0-9.-]/g, '')) || 0,
        itbis: true, tipo: 'producto', stock_min: 0, garantia_dias: 0,
        serial: false, no_descuento: false, activo: true
      });
    }
    if (!nuevos.length) { setMsg('Nada nuevo que importar (todos los códigos ya existían).', '#ea580c'); return; }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Importando...'; }
    try {
      const LOTE = 200; let hechos = 0;
      for (let i = 0; i < nuevos.length; i += LOTE) {
        await getAPI().post('pos_productos', nuevos.slice(i, i + LOTE));
        hechos += Math.min(LOTE, nuevos.length - i);
        setMsg('Importando... ' + hechos + ' / ' + nuevos.length, '#2563eb');
      }
      toast('ok', 'Importación lista', hechos + ' productos agregados' + (saltados ? ' · ' + saltados + ' saltados' : ''));
      cerrarModal('nxPosImp');
      await cargarPOS();
      const view = document.getElementById('v-pos'); if (view) renderPOS(view);
    } catch (e) {
      setMsg('Error al guardar: ' + String(e && e.message || e), '#dc2626');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-download"></i> Importar'; }
    }
  };

  // ── Categorías ──
  window.nxPosCategorias = function () {
    cerrarModal('nxPosCats');
    const lista = _cats.length ? _cats.map(c => `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #f1f5f9"><span style="flex:1;font-size:12px;font-weight:700;color:#1e293b">${esc(c.nombre)}</span><button class="btn bsm bghost" onclick="window.nxPosDelCat('${c.id}')"><i class="ti ti-trash" style="color:#dc2626"></i></button></div>`).join('') : '<div style="color:#475569;font-size:11px;padding:14px;text-align:center">Sin categorías</div>';
    const ov = document.createElement('div'); ov.id = 'nxPosCats'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:400px;max-height:84vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-tags"></i> Categorías</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosCats').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="display:flex;gap:6px;margin-bottom:10px"><input id="posCatNom" class="no-upper" placeholder="Nueva categoría" style="flex:1;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;outline:none"><button class="btn bc1 bsm" type="button" onclick="window.nxPosAddCat()"><i class="ti ti-plus"></i></button></div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${lista}</div>
        </div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.nxPosAddCat = async function () {
    const nom = (val('posCatNom') || '').trim(); if (!nom) { toast('err', 'Escribe el nombre'); return; }
    try { await getAPI().post('pos_categorias', { nombre: nom, orden: _cats.length }); toast('ok', 'Categoría agregada', nom); await cargarPOS(); window.nxPosCategorias(); }
    catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxPosDelCat = async function (id) {
    if (!confirm('¿Eliminar esta categoría? Los productos quedarán sin categoría.')) return;
    try { await getAPI().del('pos_categorias', 'id=eq.' + id); toast('ok', 'Categoría eliminada'); await cargarPOS(); window.nxPosCategorias(); }
    catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // ── TAB: VENTAS ──
  function ventasFiltradas() {
    const q = (_histQ || '').trim().toLowerCase();
    return (_ventas || []).filter(v => {
      const f = (v.fecha || v.created_at || '').slice(0, 10);
      if (_histDesde && f < _histDesde) return false;
      if (_histHasta && f > _histHasta) return false;
      if (q) { const hay = ((v.numero_factura || '') + ' ' + (v.numero || '') + ' ' + (v.cliente_nombre || '')).toLowerCase(); if (!hay.includes(q)) return false; }
      return true;
    });
  }
  function kpisHistorial() {
    const lista = ventasFiltradas();
    const total = lista.filter(v => (v.estado || '') !== 'anulada').reduce((s, v) => s + Number(v.total || 0), 0);
    const hoyN = (_ventas || []).filter(v => (v.fecha || v.created_at || '').slice(0, 10) === hoy() && (v.estado || '') !== 'anulada').length;
    return kpi('Facturas', lista.length, '#2563eb') + kpi('Total filtrado', fmt(total), '#059669') + kpi('Hoy', hoyN, '#0f172a');
  }
  function filasHistorial() {
    const lista = ventasFiltradas();
    if (!lista.length) return '<tr><td colspan="6" style="text-align:center;padding:24px;color:#475569;font-size:12px">Sin facturas con esos filtros</td></tr>';
    return lista.map(v => {
      const anulada = (v.estado || '') === 'anulada';
      const esCred = !!v.a_credito;
      return `<tr style="cursor:pointer${anulada ? ';opacity:.5' : ''}" onclick="window.nxPosTicket('${v.id}')">
        <td style="font-weight:700;color:#1e293b;white-space:nowrap">${esc(v.numero_factura || ('#' + (v.numero || '')))}</td>
        <td style="color:#475569;white-space:nowrap">${fechaDMY(v.fecha || v.created_at)}</td>
        <td>${esc(v.cliente_nombre || 'Consumidor final')}</td>
        <td><span style="font-size:9px;font-weight:800;padding:2px 7px;border-radius:6px;background:${esCred ? '#fef3c7' : '#dcfce7'};color:${esCred ? '#92400e' : '#166534'}">${esCred ? 'CRÉDITO' : 'CONTADO'}</span>${anulada ? ' <span style="font-size:9px;color:#dc2626;font-weight:800">ANULADA</span>' : ''}</td>
        <td style="text-align:right;font-weight:800;color:#059669;white-space:nowrap">${fmt(v.total)}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn bsm bghost" onclick="event.stopPropagation();window.nxPosTicket('${v.id}')" title="Ticket"><i class="ti ti-receipt"></i></button>${!anulada ? ` <button class="btn bsm bghost" onclick="event.stopPropagation();window.nxDevNueva('${v.id}')" title="Devolución / Nota de crédito"><i class="ti ti-arrow-back-up" style="color:#ea580c"></i></button> <button class="btn bsm bghost" onclick="event.stopPropagation();window.nxPosAnularVenta('${v.id}')" title="Anular"><i class="ti ti-ban" style="color:#dc2626"></i></button>` : ''}</td>
      </tr>`;
    }).join('');
  }
  function pintarHistorial() { const b = document.getElementById('histBody'); if (b) b.innerHTML = filasHistorial(); const k = document.getElementById('histKpis'); if (k) k.innerHTML = kpisHistorial(); }
  window.nxPosVentasBuscar = function (v) { _histQ = v; pintarHistorial(); };
  window.nxPosHistFecha = function () { _histDesde = val('histDesde') || ''; _histHasta = val('histHasta') || ''; pintarHistorial(); };
  window.nxPosHistLimpiar = function () { _histQ = ''; _histDesde = ''; _histHasta = ''; const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxPosAnularVenta = async function (id) {
    const v = (_ventas || []).find(x => String(x.id) === String(id)); if (!v) return;
    if (!confirm('¿Anular la factura ' + (v.numero_factura || '#' + v.numero) + '? Se devolverá el stock.')) return;
    try {
      await getAPI().patch('pos_ventas', 'id=eq.' + id, { estado: 'anulada' });
      try { const items = await getAPI().get('pos_venta_items', 'venta_id=eq.' + id + '&select=producto_id,cantidad'); for (const it of (items || [])) { const p = _prods.find(x => String(x.id) === String(it.producto_id)); if (p && p.tipo !== 'servicio') { const ns = Number(p.stock || 0) + Number(it.cantidad || 0); p.stock = ns; getAPI().patch('pos_productos', 'id=eq.' + p.id, { stock: ns }).catch(() => {}); } } } catch (e) {}
      v.estado = 'anulada';
      toast('ok', 'Factura anulada', 'Se devolvió el stock');
      pintarHistorial();
    } catch (e) { toast('err', 'No se pudo anular', String(e && e.message || e)); }
  };

  // ════════════════════════════════════════════════════════════════════
  // ── DEVOLUCIONES / NOTAS DE CRÉDITO ──
  // ════════════════════════════════════════════════════════════════════
  let _devEdit = null; // { venta, lineas:[{producto_id,nombre,precio,itbis,maxCant,cant}] }
  window.nxDevNueva = async function (ventaId) {
    let v = (_ventas || []).find(x => String(x.id) === String(ventaId));
    if (!v) { try { const r = await getAPI().get('pos_ventas', 'select=*&id=eq.' + ventaId); v = r && r[0]; } catch (e) {} }
    if (!v) { toast('err', 'Venta no encontrada'); return; }
    let items = []; try { items = await getAPI().get('pos_venta_items', 'select=*&venta_id=eq.' + ventaId) || []; } catch (e) {}
    if (!items.length) { toast('err', 'La venta no tiene artículos'); return; }
    _devEdit = { venta: v, motivo: '', metodo: 'Efectivo', lineas: items.map(it => ({ producto_id: it.producto_id, nombre: it.nombre, precio: Number(it.precio || 0), itbis: it.itbis !== false, maxCant: Number(it.cantidad || 0), cant: Number(it.cantidad || 0) })) };
    abrirDevolucion();
  };
  function devTotales() {
    let total = 0, itbis = 0;
    (_devEdit.lineas || []).forEach(l => { const imp = Number(l.precio || 0) * Number(l.cant || 0); total += imp; if (l.itbis) itbis += imp * 18 / 118; });
    total = Math.round(total); itbis = Math.round(itbis);
    return { total: total, itbis: itbis, subtotal: total - itbis };
  }
  function abrirDevolucion() {
    cerrarModal('nxDevForm');
    const v = _devEdit.venta;
    const ov = document.createElement('div'); ov.id = 'nxDevForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:560px;max-height:94vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-arrow-back-up"></i> Devolución / Nota de crédito</span><button class="nxBack" type="button" onclick="document.getElementById('nxDevForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="font-size:11.5px;color:#475569;margin-bottom:8px">Factura <b>${esc(v.numero_factura || '#' + v.numero)}</b> · ${esc(v.cliente_nombre || 'Consumidor final')}${v.ncf ? ' · NCF ' + esc(v.ncf) : ''}<br>Indica la cantidad a devolver de cada artículo.</div>
        <div id="devLineas" style="overflow-y:auto;flex:1"></div>
        <div class="fr-row">
          <div class="fr"><label>Motivo</label><input id="devMot" class="no-upper" value="" placeholder="Ej: producto defectuoso"></div>
          <div class="fr"><label>Cómo se devuelve</label><select id="devMet"><option>Efectivo</option><option>Nota de crédito</option><option>Transferencia</option><option>Rebaja a cuenta (CxC)</option></select></div>
        </div>
        <div id="devTot" class="nxAsTot"></div>
        <div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxDevForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxDevGuardar()"><i class="ti ti-device-floppy"></i> Emitir devolución</button></div>
      </div>`;
    document.body.appendChild(ov);
    pintarDevLineas();
  }
  window.nxDevCant = function (i, val) { const l = _devEdit.lineas[i]; if (!l) return; let n = parseFloat(val); if (isNaN(n) || n < 0) n = 0; if (n > l.maxCant) n = l.maxCant; l.cant = n; pintarDevTot(); };
  function pintarDevLineas() {
    const wrap = document.getElementById('devLineas'); if (!wrap) return;
    wrap.innerHTML = _devEdit.lineas.map((l, i) => `<div class="nxNomRow" style="grid-template-columns:1fr 110px">
        <div class="nxNomEmp"><div style="font-weight:700;font-size:12px">${esc(l.nombre)}</div><div style="font-size:10px;color:#475569">Precio ${fmt(l.precio)} · vendido ${l.maxCant}</div></div>
        <label class="nxNomF"><span>Devolver</span><input data-devc="${i}" inputmode="numeric" value="${l.cant}" onchange="window.nxDevCant(${i},this.value)"></label>
      </div>`).join('');
    pintarDevTot();
  }
  function pintarDevTot() { const el = document.getElementById('devTot'); if (!el) return; const t = devTotales(); el.innerHTML = `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><span>Subtotal: <b>${fmt(t.subtotal)}</b></span><span>ITBIS: <b>${fmt(t.itbis)}</b></span><span style="color:#dc2626">A devolver: <b>${fmt(t.total)}</b></span></div>`; }
  function devProxNumero(lista) { let mx = 0; (lista || []).forEach(d => { const m = String(d.numero || '').match(/(\d+)\s*$/); if (m) { const n = parseInt(m[1], 10); if (n > mx) mx = n; } }); return 'NC-' + String(mx + 1).padStart(5, '0'); }
  window.nxDevGuardar = async function () {
    const lineas = _devEdit.lineas.filter(l => Number(l.cant || 0) > 0);
    if (!lineas.length) { toast('err', 'Indica al menos una cantidad a devolver'); return; }
    const t = devTotales();
    const v = _devEdit.venta;
    const metodo = val('devMet') || 'Efectivo';
    let ncfDev = null;
    try {
      let prev = []; try { prev = await getAPI().get('pos_devoluciones', 'select=numero&order=created_at.desc&limit=1') || []; } catch (e) {}
      const numero = devProxNumero(prev);
      try { ncfDev = await asignarNCF('B04'); } catch (e) {}
      const body = { venta_id: v.id, numero: numero, ncf: ncfDev, fecha: isoHoy(), cliente_id: v.cliente_id || null, cliente_nombre: v.cliente_nombre || null, motivo: (val('devMot') || '').trim() || null, subtotal: t.subtotal, itbis: t.itbis, total: t.total, metodo: metodo, estado: 'emitida', created_by_name: nomAdmin() };
      const r = await getAPI().post('pos_devoluciones', body);
      const dev = (r && r[0]) || null; if (!dev) throw new Error('No se pudo registrar');
      const items = lineas.map(l => ({ devolucion_id: dev.id, producto_id: l.producto_id, nombre: l.nombre, cantidad: l.cant, precio: Math.round(l.precio), itbis: !!l.itbis, importe: Math.round(l.precio * l.cant) }));
      await getAPI().post('pos_devolucion_items', items);
      // devolver stock
      for (const l of lineas) { try { const p = _prods.find(x => String(x.id) === String(l.producto_id)); if (p && p.tipo !== 'servicio') { const ns = Number(p.stock || 0) + Number(l.cant || 0); p.stock = ns; getAPI().patch('pos_productos', 'id=eq.' + p.id, { stock: ns }).catch(() => {}); } } catch (e) {}
      }
      // si se rebaja a cuenta del cliente (fiado), bajar su saldo
      if (metodo.indexOf('CxC') >= 0 && v.cliente_id) { _abonosByCli[v.cliente_id] = (_abonosByCli[v.cliente_id] || 0) + t.total; }
      // asiento contable inverso a la venta
      try { postAsientoDevolucion(dev, t, metodo, v); } catch (e) {}
      cerrarModal('nxDevForm');
      toast('ok', 'Devolución emitida', (ncfDev ? 'NCF ' + ncfDev + ' · ' : '') + fmt(t.total));
      nxDevImprimirObj(Object.assign({}, dev, { _items: items, _venta: v }));
    } catch (e) { toast('err', 'No se pudo emitir', String(e && e.message || e)); }
  };
  async function postAsientoDevolucion(dev, t, metodo, venta) {
    try {
      const byc = await ctasMap(); if (!Object.keys(byc).length) return;
      // Reversa de la venta: Debe Ventas + ITBIS / Haber Caja o CxC
      const haberCod = (metodo.indexOf('CxC') >= 0) ? '1103' : '1101';
      const lineas = [lnCta(byc, '4101', 'Ventas', Number(t.subtotal || 0), 0), lnCta(byc, '2102', 'ITBIS por pagar', Number(t.itbis || 0), 0), lnCta(byc, haberCod, haberCod === '1103' ? 'Cuentas por cobrar (clientes)' : 'Caja', 0, Number(t.total || 0))];
      await postAsientoConcepto(dev.fecha, 'Devolución ' + (dev.numero || '') + ' (fact. ' + (venta.numero_factura || '#' + venta.numero) + ')', 'devolucion', dev.id, lineas, dev.numero);
    } catch (e) {}
  }
  function nxDevImprimirObj(dev) {
    const e = empInfo();
    const filas = (dev._items || []).map(it => `<tr><td>${Number(it.cantidad)}</td><td>${esc(it.nombre)}</td><td class="r">${fmt(it.precio)}</td><td class="r">${fmt(it.importe)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nota de crédito ${esc(dev.numero || '')}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:540px;margin:0 auto;padding:20px;font-size:12.5px}h1{font-size:16px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:10px 0}th{text-align:left;font-size:10px;text-transform:uppercase;color:#555;border-bottom:1.5px solid #999;padding:6px}td{padding:5px 6px;border-bottom:1px solid #eee}.r{text-align:right}.tot{margin-left:auto;max-width:260px}.tot td{border:none;padding:3px 6px}.gran{font-weight:800;font-size:15px;border-top:1.5px solid #111!important}.line{border-top:1px solid #ccc;margin:8px 0}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-20px -20px 14px;padding:9px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button><button onclick="window.print()" style="background:#fff;color:#1e3a6e;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="c muted">${e.rnc ? 'RNC: ' + esc(e.rnc) : ''}${e.tel ? ' · ' + esc(e.tel) : ''}</div>
        <div class="line"></div>
        <div class="c"><b>NOTA DE CRÉDITO ${esc(dev.numero || '')}</b></div>
        ${dev.ncf ? `<div class="c muted">NCF: <b>${esc(dev.ncf)}</b></div>` : ''}
        <div class="muted">Fecha: ${fechaDMY(dev.fecha)} · Cliente: <b>${esc(dev.cliente_nombre || 'Consumidor final')}</b><br>Factura afectada: ${esc((dev._venta && (dev._venta.numero_factura || '#' + dev._venta.numero)) || '')}${dev.motivo ? '<br>Motivo: ' + esc(dev.motivo) : ''}</div>
        <table><thead><tr><th>Cant.</th><th>Descripción</th><th class="r">Precio</th><th class="r">Importe</th></tr></thead><tbody>${filas}</tbody></table>
        <table class="tot"><tr><td>Subtotal</td><td class="r">${fmt(dev.subtotal)}</td></tr><tr><td>ITBIS (18%)</td><td class="r">${fmt(dev.itbis)}</td></tr><tr class="gran"><td>TOTAL DEVUELTO</td><td class="r">${fmt(dev.total)}</td></tr></table>
        <div class="muted" style="margin-top:8px">Forma de devolución: ${esc(dev.metodo || '')}</div>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  }
  function renderVentas() {
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <div style="position:relative;flex:1;min-width:200px"><i class="ti ti-search" style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#475569;font-size:15px;pointer-events:none"></i><input id="histQ" value="${esc(_histQ)}" oninput="window.nxPosVentasBuscar(this.value)" placeholder="Buscar por No. de factura o cliente…" autocomplete="off" style="width:100%;height:38px;padding:0 12px 0 34px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;outline:none;background:#fff;color:#1e293b"></div>
        <input type="date" id="histDesde" value="${_histDesde}" onchange="window.nxPosHistFecha()" title="Desde" style="height:38px;padding:0 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px">
        <input type="date" id="histHasta" value="${_histHasta}" onchange="window.nxPosHistFecha()" title="Hasta" style="height:38px;padding:0 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:12px">
        <button class="btn bsm bghost" type="button" onclick="window.nxPosHistLimpiar()"><i class="ti ti-filter-off"></i> Limpiar</button>
      </div>
      <div id="histKpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px">${kpisHistorial()}</div>
      <div class="tw" style="font-size:11px"><table style="width:100%"><thead><tr><th>No. Factura</th><th>Fecha</th><th>Cliente</th><th>Tipo</th><th style="text-align:right">Total</th><th></th></tr></thead><tbody id="histBody">${filasHistorial()}</tbody></table></div>`;
  }
  function kpi(lbl, v, col) { return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:9px 8px"><div style="font-size:9.5px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.3px">${esc(lbl)}</div><div style="font-size:14px;font-weight:800;color:${col || '#1e293b'};margin-top:2px">${v}</div></div>`; }

  // ── TAB: CLIENTES (fiado / cuentas por cobrar) ──
  function renderClientes() {
    const totalCobrar = _clientes.reduce((s, c) => s + saldoCli(c), 0);
    const conDeuda = _clientes.filter(c => saldoCli(c) > 0).length;
    const filas = _clientes.length ? _clientes.map(c => {
      const sal = saldoCli(c);
      return `<tr onclick="window.nxPosCliVer('${c.id}')" style="cursor:pointer">
        <td><div style="font-weight:700;font-size:12px">${esc(c.nombre)}</div><div style="font-size:10px;color:#475569">${esc(c.cedula || '')}${c.telefono ? ' · ' + esc(c.telefono) : ''}</div></td>
        <td style="text-align:right;font-weight:800;color:${sal > 0 ? '#dc2626' : '#16a34a'}">${fmt(sal)}</td>
        <td style="text-align:right"><button class="btn bsm bghost" onclick="event.stopPropagation();window.nxPosCliVer('${c.id}')" title="Ver cuenta"><i class="ti ti-eye"></i></button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="3" style="text-align:center;padding:24px;color:#475569;font-size:12px">Sin clientes. Toca "Nuevo cliente".</td></tr>';
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px">
        ${kpi('Clientes', _clientes.length, '#2563eb')}
        ${kpi('Por cobrar (fiado)', fmt(totalCobrar), totalCobrar > 0 ? '#dc2626' : '#16a34a')}
        ${kpi('Con deuda', conDeuda, '#ea580c')}
      </div>
      <div style="margin-bottom:10px"><button class="btn bsm bc1" type="button" onclick="window.nxPosNuevoCli()"><i class="ti ti-plus"></i> Nuevo cliente</button></div>
      <div class="tw" style="font-size:11px"><table style="width:100%"><thead><tr><th>Cliente</th><th style="text-align:right">Saldo (fiado)</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }
  window.nxPosNuevoCli = function () { abrirCli(null); };
  window.nxPosEditCli = function (id) { const c = _clientes.find(x => String(x.id) === String(id)); if (c) abrirCli(c); };
  function abrirCli(c) {
    cerrarModal('nxPosCliForm');
    const e = c || {};
    const ov = document.createElement('div'); ov.id = 'nxPosCliForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:440px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-user"></i> ${c ? 'Editar cliente' : 'Nuevo cliente'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosCliForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div class="fr"><label>Nombre *</label><input id="pcNom" class="no-upper" value="${esc(e.nombre || '')}" placeholder="Nombre del cliente"></div>
          <div class="fr-row"><div class="fr"><label>Cédula / RNC</label><input id="pcCed" class="no-upper" value="${esc(e.cedula || '')}" placeholder="000-0000000-0"></div><div class="fr"><label>Teléfono</label><input id="pcTel" class="no-upper" value="${esc(e.telefono || '')}" placeholder="809-000-0000"></div></div>
          <div class="fr"><label>Dirección</label><input id="pcDir" class="no-upper" value="${esc(e.direccion || '')}" placeholder="Opcional"></div>
          <div class="fr"><label>Límite de crédito (opcional)</label><input id="pcLim" data-nx-money inputmode="numeric" value="${e.limite_credito ? Math.round(e.limite_credito) : ''}" placeholder="0 = sin límite"></div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxPosCliForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxPosGuardarCli('${c ? c.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button></div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  }
  window.nxPosGuardarCli = async function (id) {
    const body = { nombre: (val('pcNom') || '').trim(), cedula: (val('pcCed') || '').trim() || null, telefono: (val('pcTel') || '').trim() || null, direccion: (val('pcDir') || '').trim() || null, limite_credito: parseMoney(val('pcLim')) };
    if (!body.nombre) { toast('err', 'Pon el nombre del cliente'); return; }
    try {
      if (id) await getAPI().patch('pos_clientes', 'id=eq.' + id, body);
      else await getAPI().post('pos_clientes', body);
      toast('ok', id ? 'Cliente actualizado' : 'Cliente agregado', body.nombre);
      cerrarModal('nxPosCliForm');
      _clientes = await getAPI().get('pos_clientes', 'select=*&activo=eq.true&order=nombre.asc') || [];
      const view = document.getElementById('v-pos'); if (view) renderPOS(view);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxPosCliVer = async function (id) {
    const c = _clientes.find(x => String(x.id) === String(id)); if (!c) return;
    cerrarModal('nxPosCli');
    let ventas = [], abonos = [];
    try { ventas = await getAPI().get('pos_ventas', 'select=*&cliente_id=eq.' + id + '&credito_monto=gt.0&order=created_at.desc') || []; } catch (e) {}
    try { abonos = await getAPI().get('pos_abonos', 'select=*&cliente_id=eq.' + id + '&order=fecha.desc') || []; } catch (e) {}
    const totFiado = ventas.reduce((s, v) => s + Number(v.credito_monto || 0), 0);
    const totAb = abonos.reduce((s, a) => s + Number(a.monto || 0), 0);
    const saldo = Math.max(0, totFiado - totAb);
    _fiadoByCli[id] = totFiado; _abonosByCli[id] = totAb;
    const ventasHTML = ventas.length ? ventas.map(v => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><div>#${v.numero || ''} <span style="color:#475569">${fechaDMY(v.fecha || v.created_at)}</span>${Number(v.credito_monto || 0) < Number(v.total || 0) ? `<div style="color:#475569;font-size:9.5px">Venta ${fmt(v.total)} · fiado</div>` : ''}</div><div style="display:flex;align-items:center;gap:6px"><b style="color:#dc2626">${fmt(v.credito_monto)}</b><button class="btn bsm bghost" onclick="window.nxPosTicketVenta('${v.id}')" title="Ticket"><i class="ti ti-receipt"></i></button></div></div>`).join('') : '<div style="color:#475569;font-size:11px;padding:10px">Sin ventas fiadas</div>';
    const abonosHTML = abonos.length ? abonos.map(a => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><div><b style="color:#059669">${fmt(a.monto)}</b> <span style="color:#475569">${(a.fecha || '').slice(0, 10)} · ${esc(a.metodo || '')}</span>${a.nota ? `<div style="color:#475569;font-size:10px">${esc(a.nota)}</div>` : ''}</div><button class="btn bsm bghost" onclick="window.nxPosDelAbono('${a.id}','${id}')" title="Eliminar"><i class="ti ti-trash" style="color:#dc2626"></i></button></div>`).join('') : '<div style="color:#475569;font-size:11px;padding:10px">Sin abonos</div>';
    const ov = document.createElement('div'); ov.id = 'nxPosCli'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:460px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-user"></i> ${esc(c.nombre)}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosCli').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">${esc(c.cedula || '')}${c.telefono ? ' · ' + esc(c.telefono) : ''}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">
            ${kpi('Fiado total', fmt(totFiado), '#0f172a')}${kpi('Abonado', fmt(totAb), '#059669')}${kpi('Saldo', fmt(saldo), saldo > 0 ? '#dc2626' : '#16a34a')}
          </div>
          ${saldo > 0 ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px;margin-bottom:10px">
            <div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:6px">REGISTRAR ABONO</div>
            <div style="display:flex;gap:6px;margin-bottom:6px"><input id="posAbMonto" data-nx-money inputmode="numeric" placeholder="Monto" style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px;outline:none"><input id="posAbFecha" type="date" value="${hoy()}" style="flex:0 0 auto;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;outline:none"></div>
            <div style="display:flex;gap:6px"><select id="posAbMet" style="flex:1;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;background:#fff"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select><input id="posAbNota" class="no-upper" placeholder="Nota" style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;outline:none"><button class="btn bc1 bsm" type="button" onclick="window.nxPosAbonar('${id}')"><i class="ti ti-plus"></i></button></div>
          </div>` : '<div style="text-align:center;color:#16a34a;font-weight:800;font-size:12px;margin-bottom:10px">✓ Sin deuda</div>'}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:8px 0 4px">VENTAS FIADAS (${ventas.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px">${ventasHTML}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:8px 0 4px">ABONOS (${abonos.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${abonosHTML}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px">
          ${waNum(c.telefono) ? `<button class="btn bwa bsm" type="button" onclick="window.nxPosCliWA('${id}')"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>` : ''}
          <button class="btn bsm bghost" type="button" onclick="window.nxPosEstadoCuenta('${id}')"><i class="ti ti-printer"></i> Estado de cuenta</button>
          <button class="btn bsm bghost" type="button" onclick="window.nxPosEditCli('${id}')"><i class="ti ti-edit"></i> Editar</button>
          <button class="btn bsm bghost" type="button" style="color:#dc2626" onclick="window.nxPosDelCli('${id}')"><i class="ti ti-trash"></i> Borrar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  };
  window.nxPosEstadoCuenta = async function (id) {
    const c = _clientes.find(x => String(x.id) === String(id)); if (!c) return;
    let ventas = [], abonos = [];
    try { ventas = await getAPI().get('pos_ventas', 'select=*&cliente_id=eq.' + id + '&credito_monto=gt.0&order=created_at.asc') || []; } catch (e) {}
    try { abonos = await getAPI().get('pos_abonos', 'select=*&cliente_id=eq.' + id + '&order=fecha.asc') || []; } catch (e) {}
    const totFiado = ventas.reduce((s, v) => s + Number(v.credito_monto || 0), 0);
    const totAb = abonos.reduce((s, a) => s + Number(a.monto || 0), 0);
    const saldo = Math.max(0, totFiado - totAb);
    // Movimientos ordenados por fecha con saldo corriente
    const movs = [];
    ventas.forEach(v => movs.push({ f: v.fecha || v.created_at, t: 'Venta a crédito #' + (v.numero || ''), cargo: Number(v.credito_monto || 0), abono: 0 }));
    abonos.forEach(a => movs.push({ f: a.fecha, t: 'Abono' + (a.metodo ? ' (' + a.metodo + ')' : ''), cargo: 0, abono: Number(a.monto || 0) }));
    movs.sort((x, y) => String(x.f).localeCompare(String(y.f)));
    let run = 0;
    const filas = movs.map(m => { run += m.cargo - m.abono; return `<tr><td>${fechaDMY(m.f)}</td><td>${esc(m.t)}</td><td class="r">${m.cargo ? fmt(m.cargo) : ''}</td><td class="r">${m.abono ? fmt(m.abono) : ''}</td><td class="r">${fmt(run)}</td></tr>`; }).join('') || '<tr><td colspan="5" style="text-align:center;color:#777;padding:14px">Sin movimientos</td></tr>';
    const e = empInfo();
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estado de cuenta — ${esc(c.nombre)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:20px;font-size:12.5px}h1{font-size:16px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:10px 0}th{text-align:left;font-size:10px;text-transform:uppercase;color:#555;border-bottom:1.5px solid #999;padding:6px}td{padding:5px 6px;border-bottom:1px solid #eee}.r{text-align:right}.line{border-top:1px solid #ccc;margin:8px 0}.box{display:flex;gap:10px;margin:10px 0}.kp{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center}.kp b{display:block;font-size:16px}.kp span{font-size:10px;color:#555}.sal{font-weight:800;font-size:15px}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-20px -20px 14px;padding:9px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button><button onclick="window.print()" style="background:#fff;color:#1e3a6e;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="c muted">${e.rnc ? 'RNC: ' + esc(e.rnc) : ''}${e.tel ? ' · ' + esc(e.tel) : ''}</div>
        <div class="line"></div>
        <div class="c"><b>ESTADO DE CUENTA</b></div>
        <div class="muted">Cliente: <b>${esc(c.nombre)}</b>${c.cedula ? ' · ' + esc(c.cedula) : ''}${c.telefono ? ' · ' + esc(c.telefono) : ''}<br>Fecha: ${fechaDMY(isoHoy())}</div>
        <div class="box">
          <div class="kp"><b>${fmt(totFiado)}</b><span>Total a crédito</span></div>
          <div class="kp"><b style="color:#059669">${fmt(totAb)}</b><span>Abonado</span></div>
          <div class="kp"><b style="color:${saldo > 0 ? '#dc2626' : '#16a34a'}">${fmt(saldo)}</b><span>Saldo pendiente</span></div>
        </div>
        <table><thead><tr><th>Fecha</th><th>Concepto</th><th class="r">Cargo</th><th class="r">Abono</th><th class="r">Saldo</th></tr></thead><tbody>${filas}</tbody></table>
        <div class="line"></div>
        <div class="c sal">SALDO PENDIENTE: ${fmt(saldo)}</div>
        <div class="muted" style="margin-top:14px">Documento informativo generado por NEXUS PRO el ${fechaDMY(isoHoy())}.</div>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes para ver el estado de cuenta'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  };
  window.nxPosTicketVenta = async function (ventaId) {
    let v = _ventas.find(x => String(x.id) === String(ventaId));
    if (!v) { try { const r = await getAPI().get('pos_ventas', 'select=*&id=eq.' + ventaId); v = r && r[0]; } catch (e) {} }
    if (!v) return;
    let items = []; try { items = await getAPI().get('pos_venta_items', 'select=*&venta_id=eq.' + ventaId) || []; } catch (e) {}
    ticketHTML(Object.assign({}, v, { _items: items }));
  };
  window.nxPosAbonar = async function (id) {
    const monto = parseMoney(val('posAbMonto')); if (monto <= 0) { toast('err', 'Pon el monto del abono'); return; }
    try {
      await getAPI().post('pos_abonos', { cliente_id: id, monto: monto, fecha: val('posAbFecha') || hoy(), metodo: val('posAbMet') || 'Efectivo', nota: (val('posAbNota') || '').trim() || null, caja_id: (_caja && _caja.id) || null, created_by_name: nomAdmin() });
      _abonosByCli[id] = (_abonosByCli[id] || 0) + monto;
      try { const cli = _clientes.find(x => String(x.id) === String(id)); postAsientoAbono(cli && cli.nombre, monto, val('posAbMet') || 'Efectivo', val('posAbFecha') || hoy()); } catch (e) {}
      toast('ok', 'Abono registrado', fmt(monto));
      window.nxPosCliVer(id);
      const view = document.getElementById('v-pos'); if (view && _posTab === 'clientes') renderPOS(view);
    } catch (e) { toast('err', 'No se pudo registrar', String(e && e.message || e)); }
  };
  window.nxPosDelAbono = async function (abId, cliId) {
    if (!confirm('¿Eliminar este abono?')) return;
    try { await getAPI().del('pos_abonos', 'id=eq.' + abId); toast('ok', 'Abono eliminado'); window.nxPosCliVer(cliId); } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxPosDelCli = async function (id) {
    const c = _clientes.find(x => String(x.id) === String(id)); if (!c) return;
    if (saldoCli(c) > 0 && !confirm('Este cliente tiene saldo pendiente. ¿Eliminarlo de todos modos?')) return;
    if (saldoCli(c) <= 0 && !confirm('¿Eliminar el cliente "' + c.nombre + '"?')) return;
    try {
      await getAPI().patch('pos_clientes', 'id=eq.' + id, { activo: false });
      toast('ok', 'Cliente eliminado'); cerrarModal('nxPosCli');
      _clientes = await getAPI().get('pos_clientes', 'select=*&activo=eq.true&order=nombre.asc') || [];
      const view = document.getElementById('v-pos'); if (view) renderPOS(view);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxPosCliWA = function (id) {
    const c = _clientes.find(x => String(x.id) === String(id)); if (!c) return;
    const num = waNum(c.telefono); if (!num) { toast('err', 'Sin teléfono válido'); return; }
    const saldo = saldoCli(c); const nom = (c.nombre || '').split(' ')[0] || '';
    const msg = `Hola ${nom}, le recordamos su cuenta pendiente:\n• Saldo: ${fmt(saldo)}\n\nGracias.\n${empNom()}`;
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(msg), '_blank', 'noopener,noreferrer');
  };

  // ── TAB: COMPRAS / PROVEEDORES ──
  function renderCompras() {
    const totalCxP = _proveedores.reduce((s, p) => s + saldoProv(p), 0);
    const comprasHTML = _compras.length ? _compras.map(c => `<tr onclick="window.nxPosCompraVer('${c.id}')" style="cursor:pointer"><td style="font-size:10px">#${c.numero || ''}<div style="color:#475569">${(c.fecha || '').slice(0, 10)}</div></td><td style="font-size:11px">${esc(c.proveedor_nombre || '—')}</td><td style="font-size:10px">${c.a_credito ? '<span style="color:#dc2626">Crédito</span>' : 'Contado'}</td><td style="text-align:right;font-weight:800">${fmt(c.total)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:24px;color:#475569;font-size:12px">Sin compras registradas</td></tr>';
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:10px">
        ${kpi('Proveedores', _proveedores.length, '#2563eb')}
        ${kpi('Por pagar (CxP)', fmt(totalCxP), totalCxP > 0 ? '#dc2626' : '#16a34a')}
        ${kpi('Compras', _compras.length, '#0f172a')}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <button class="btn bsm bghost" type="button" onclick="window.nxPosProveedores()"><i class="ti ti-building-warehouse"></i> Proveedores</button>
        <button class="btn bsm bc1" type="button" onclick="window.nxPosNuevaCompra()"><i class="ti ti-plus"></i> Nueva compra</button>
      </div>
      <div class="tw" style="font-size:11px"><table style="width:100%"><thead><tr><th>No.</th><th>Proveedor</th><th>Tipo</th><th style="text-align:right">Total</th></tr></thead><tbody>${comprasHTML}</tbody></table></div>`;
  }

  // Nueva compra
  window.nxPosNuevaCompra = function () {
    _compraItems = [];
    cerrarModal('nxPosCompra');
    const provOpts = _proveedores.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
    const prodOpts = _prods.map(p => `<option value="${p.id}">${esc(p.nombre)}${p.codigo ? ' (' + esc(p.codigo) + ')' : ''}</option>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxPosCompra'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:480px;max-height:92vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-truck-delivery"></i> Nueva compra</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosCompra').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div class="fr"><label>Proveedor</label><div style="display:flex;gap:6px"><select id="compProv" style="flex:1">${'<option value="">— Proveedor —</option>' + provOpts}</select><button class="btn bsm bghost" type="button" onclick="window.nxPosNuevoProvDesdeCompra()" title="Nuevo proveedor"><i class="ti ti-plus"></i></button></div></div>
          <div class="fr-row"><div class="fr"><label>Fecha</label><input id="compFecha" type="date" value="${hoy()}"></div><div class="fr"><label>Factura No. (proveedor)</label><input id="compFact" class="no-upper" placeholder="Opcional"></div></div>
          <div class="fr-row"><div class="fr"><label>NCF del proveedor</label><input id="compNcf" class="no-upper" placeholder="B01... (opcional)"></div><div class="fr" style="display:flex;align-items:flex-end"><label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#475569;cursor:pointer"><input type="checkbox" id="compCred" style="width:18px;height:18px"> Compra a crédito (CxP)</label></div></div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:8px 0 6px">ARTÍCULOS</div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;margin-bottom:8px">
            <div class="fr" style="margin-bottom:6px"><select id="compArt"><option value="">— Elige un artículo —</option>${prodOpts}</select></div>
            <div style="display:flex;gap:6px"><input id="compCant" inputmode="numeric" value="1" placeholder="Cant." style="width:62px;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;text-align:center"><input id="compCosto" data-nx-money inputmode="numeric" placeholder="Costo unit." style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px"><button class="btn bc1 bsm" type="button" onclick="window.nxPosCompraAddItem()"><i class="ti ti-plus"></i> Agregar</button></div>
          </div>
          <div id="compItemsList" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px;padding:9px 12px"><span style="font-weight:700;color:#065f46">Total compra</span><b id="compTotal" style="font-size:16px;color:#065f46">RD$ 0</b></div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxPosCompra').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxPosGuardarCompra()"><i class="ti ti-device-floppy"></i> Guardar compra</button></div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
    pintarCompraItems();
  };
  window.nxPosNuevoProvDesdeCompra = function () { abrirProv(null, true); };
  window.nxPosCompraAddItem = function () {
    const pid = val('compArt'); if (!pid) { toast('err', 'Elige un artículo'); return; }
    const p = _prods.find(x => String(x.id) === String(pid)); if (!p) return;
    const cant = Number(String(val('compCant') || '1').replace(/[^0-9.]/g, '')) || 1;
    const costo = parseMoney(val('compCosto')) || Number(p.costo || 0);
    const ex = _compraItems.find(x => String(x.producto_id) === String(pid));
    if (ex) { ex.cantidad += cant; ex.costo = costo; } else _compraItems.push({ producto_id: p.id, nombre: p.nombre, cantidad: cant, costo: costo });
    const cc = document.getElementById('compCant'); if (cc) cc.value = '1';
    const co = document.getElementById('compCosto'); if (co) co.value = '';
    pintarCompraItems();
  };
  window.nxPosCompraDelItem = function (idx) { _compraItems.splice(idx, 1); pintarCompraItems(); };
  function pintarCompraItems() {
    const cont = document.getElementById('compItemsList'); if (!cont) return;
    cont.innerHTML = _compraItems.length ? _compraItems.map((it, i) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 9px;border-bottom:1px solid #f1f5f9;font-size:11px"><div style="flex:1;min-width:0"><b style="color:#1e293b">${esc(it.nombre)}</b><div style="color:#475569">${it.cantidad} × ${fmt(it.costo)}</div></div><b style="color:#0f172a">${fmt(it.costo * it.cantidad)}</b><button class="btn bsm bghost" type="button" onclick="window.nxPosCompraDelItem(${i})"><i class="ti ti-x" style="color:#dc2626"></i></button></div>`).join('') : '<div style="color:#475569;font-size:11px;padding:10px;text-align:center">Sin artículos. Agrega arriba.</div>';
    const tot = _compraItems.reduce((s, it) => s + Math.round(it.costo * it.cantidad), 0);
    const t = document.getElementById('compTotal'); if (t) t.textContent = fmt(tot);
  }
  window.nxPosGuardarCompra = async function () {
    if (!_compraItems.length) { toast('err', 'Agrega al menos un artículo'); return; }
    const provId = val('compProv') || null;
    const aCred = document.getElementById('compCred') && document.getElementById('compCred').checked;
    if (aCred && !provId) { toast('err', 'Para compra a crédito elige un proveedor'); return; }
    const provNom = provId ? ((_proveedores.find(p => String(p.id) === String(provId)) || {}).nombre || null) : null;
    const subtotal = _compraItems.reduce((s, it) => s + Math.round(it.costo * it.cantidad), 0);
    const body = { proveedor_id: provId, proveedor_nombre: provNom, fecha: val('compFecha') || hoy(), ncf: (val('compNcf') || '').trim() || null, subtotal: subtotal, itbis: 0, total: subtotal, a_credito: !!aCred, estado: 'recibida', notas: (val('compFact') || '').trim() ? 'Factura ' + (val('compFact') || '').trim() : null, created_by_name: nomAdmin() };
    try {
      const r = await getAPI().post('pos_compras', body);
      const compra = (r && r[0]) || null; if (!compra) throw new Error('No se pudo registrar');
      const items = _compraItems.map(it => ({ compra_id: compra.id, producto_id: it.producto_id, nombre: it.nombre, cantidad: it.cantidad, costo: it.costo, importe: Math.round(it.costo * it.cantidad) }));
      try { await getAPI().post('pos_compra_items', items); } catch (e) {}
      for (const it of _compraItems) { try { const p = _prods.find(x => String(x.id) === String(it.producto_id)); if (p) { const ns = Number(p.stock || 0) + Number(it.cantidad); p.stock = ns; p.costo = it.costo; getAPI().patch('pos_productos', 'id=eq.' + p.id, { stock: ns, costo: it.costo }).catch(() => {}); } } catch (e) {} }
      if (aCred && provId) { _cxpByProv[provId] = (_cxpByProv[provId] || 0) + subtotal; }
      try { postAsientoCompra(compra, body.subtotal, body.itbis, !!aCred); } catch (e) {}
      toast('ok', 'Compra registrada', 'No. ' + (compra.numero || '') + ' · ' + fmt(subtotal) + ' · stock actualizado');
      _compraItems = []; cerrarModal('nxPosCompra');
      await cargarComprasTab(); await cargarPOS();
      const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo registrar la compra', String(e && e.message || e)); }
  };
  window.nxPosCompraVer = async function (id) {
    const c = _compras.find(x => String(x.id) === String(id)); if (!c) return;
    let items = []; try { items = await getAPI().get('pos_compra_items', 'select=*&compra_id=eq.' + id) || []; } catch (e) {}
    const filas = items.map(it => `<tr><td>${Number(it.cantidad)}x ${esc(it.nombre)}</td><td style="text-align:right">${fmt(it.importe)}</td></tr>`).join('');
    cerrarModal('nxPosCompraDet');
    const ov = document.createElement('div'); ov.id = 'nxPosCompraDet'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:420px;max-height:88vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-receipt"></i> Compra No. ${c.numero || ''}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosCompraDet').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">${esc(c.proveedor_nombre || 'Sin proveedor')} · ${(c.fecha || '').slice(0, 10)} · ${c.a_credito ? 'Crédito' : 'Contado'}${c.ncf ? ' · NCF ' + esc(c.ncf) : ''}</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">${filas}</table>
          <div style="display:flex;justify-content:space-between;border-top:1px dashed #e2e8f0;margin-top:8px;padding-top:8px;font-weight:800"><span>TOTAL</span><span>${fmt(c.total)}</span></div>
        </div>
        <div class="fe" style="margin-top:10px"><button class="btn bsm bghost" type="button" style="color:#dc2626" onclick="window.nxPosDelCompra('${id}')"><i class="ti ti-trash"></i> Eliminar</button></div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.nxPosDelCompra = async function (id) {
    if (!confirm('¿Eliminar esta compra? (No revierte el stock automáticamente)')) return;
    try { await getAPI().del('pos_compras', 'id=eq.' + id); toast('ok', 'Compra eliminada'); cerrarModal('nxPosCompraDet'); await cargarComprasTab(); const v = document.getElementById('v-pos'); if (v) renderPOS(v); } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // Proveedores
  window.nxPosProveedores = function () {
    cerrarModal('nxPosProvs');
    const lista = _proveedores.length ? _proveedores.map(p => { const s = saldoProv(p); return `<div style="display:flex;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid #f1f5f9;cursor:pointer" onclick="window.nxPosProvVer('${p.id}')"><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:#1e293b">${esc(p.nombre)}</div><div style="font-size:10px;color:#475569">${esc(p.rnc || '')}${p.telefono ? ' · ' + esc(p.telefono) : ''}</div></div>${s > 0 ? `<b style="color:#dc2626;font-size:12px">${fmt(s)}</b>` : ''}<i class="ti ti-chevron-right" style="color:#cbd5e1"></i></div>`; }).join('') : '<div style="color:#475569;font-size:11px;padding:14px;text-align:center">Sin proveedores</div>';
    const ov = document.createElement('div'); ov.id = 'nxPosProvs'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:430px;max-height:86vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-building-warehouse"></i> Proveedores</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosProvs').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1"><div style="margin-bottom:10px"><button class="btn bsm bc1" type="button" onclick="window.nxPosNuevoProv()"><i class="ti ti-plus"></i> Nuevo proveedor</button></div><div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${lista}</div></div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.nxPosNuevoProv = function () { abrirProv(null); };
  window.nxPosEditProv = function (id) { const p = _proveedores.find(x => String(x.id) === String(id)); if (p) abrirProv(p); };
  function abrirProv(p, fromCompra) {
    cerrarModal('nxPosProvForm');
    const e = p || {};
    const ov = document.createElement('div'); ov.id = 'nxPosProvForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:430px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-building-warehouse"></i> ${p ? 'Editar proveedor' : 'Nuevo proveedor'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosProvForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div class="fr"><label>Nombre *</label><input id="pvNom" class="no-upper" value="${esc(e.nombre || '')}" placeholder="Nombre / empresa"></div>
          <div class="fr-row"><div class="fr"><label>RNC / Cédula</label><input id="pvRnc" class="no-upper" value="${esc(e.rnc || '')}" placeholder="0-00-00000-0"></div><div class="fr"><label>Teléfono</label><input id="pvTel" class="no-upper" value="${esc(e.telefono || '')}" placeholder="809-000-0000"></div></div>
          <div class="fr"><label>Contacto</label><input id="pvCon" class="no-upper" value="${esc(e.contacto || '')}" placeholder="Persona de contacto"></div>
          <div class="fr"><label>Dirección</label><input id="pvDir" class="no-upper" value="${esc(e.direccion || '')}" placeholder="Opcional"></div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxPosProvForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxPosGuardarProv('${p ? p.id : ''}','${fromCompra ? '1' : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button></div>
      </div>`;
    document.body.appendChild(ov);
  }
  window.nxPosGuardarProv = async function (id, fromCompra) {
    const body = { nombre: (val('pvNom') || '').trim(), rnc: (val('pvRnc') || '').trim() || null, telefono: (val('pvTel') || '').trim() || null, contacto: (val('pvCon') || '').trim() || null, direccion: (val('pvDir') || '').trim() || null };
    if (!body.nombre) { toast('err', 'Pon el nombre del proveedor'); return; }
    try {
      let nuevo = null;
      if (id) await getAPI().patch('pos_proveedores', 'id=eq.' + id, body);
      else { const r = await getAPI().post('pos_proveedores', body); nuevo = (r && r[0]) || null; }
      toast('ok', id ? 'Proveedor actualizado' : 'Proveedor agregado', body.nombre);
      cerrarModal('nxPosProvForm');
      _proveedores = await getAPI().get('pos_proveedores', 'select=*&activo=eq.true&order=nombre.asc') || [];
      if (fromCompra === '1') { const sel = document.getElementById('compProv'); if (sel) { sel.innerHTML = '<option value="">— Proveedor —</option>' + _proveedores.map(p => `<option value="${p.id}"${nuevo && String(p.id) === String(nuevo.id) ? ' selected' : ''}>${esc(p.nombre)}</option>`).join(''); } }
      else { const v = document.getElementById('v-pos'); if (v && _posTab === 'compras') renderPOS(v); if (document.getElementById('nxPosProvs')) window.nxPosProveedores(); }
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxPosProvVer = async function (id) {
    const p = _proveedores.find(x => String(x.id) === String(id)); if (!p) return;
    cerrarModal('nxPosProv');
    let compras = [], pagos = [];
    try { compras = await getAPI().get('pos_compras', 'select=*&proveedor_id=eq.' + id + '&a_credito=eq.true&order=created_at.desc') || []; } catch (e) {}
    try { pagos = await getAPI().get('pos_compra_pagos', 'select=*&proveedor_id=eq.' + id + '&order=fecha.desc') || []; } catch (e) {}
    const totC = compras.reduce((s, c) => s + Number(c.total || 0), 0); const totP = pagos.reduce((s, a) => s + Number(a.monto || 0), 0); const saldo = Math.max(0, totC - totP);
    _cxpByProv[id] = totC; _pagosProvByProv[id] = totP;
    const comprasHTML = compras.length ? compras.map(c => `<div style="display:flex;justify-content:space-between;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><span>#${c.numero || ''} <span style="color:#475569">${(c.fecha || '').slice(0, 10)}</span></span><b style="color:#dc2626">${fmt(c.total)}</b></div>`).join('') : '<div style="color:#475569;font-size:11px;padding:10px">Sin compras a crédito</div>';
    const pagosHTML = pagos.length ? pagos.map(a => `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><span><b style="color:#059669">${fmt(a.monto)}</b> <span style="color:#475569">${(a.fecha || '').slice(0, 10)} · ${esc(a.metodo || '')}</span></span><button class="btn bsm bghost" onclick="window.nxPosDelPagoProv('${a.id}','${id}')"><i class="ti ti-trash" style="color:#dc2626"></i></button></div>`).join('') : '<div style="color:#475569;font-size:11px;padding:10px">Sin pagos</div>';
    const ov = document.createElement('div'); ov.id = 'nxPosProv'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:460px;max-height:90vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-building-warehouse"></i> ${esc(p.nombre)}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosProv').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="font-size:11px;color:#475569;margin-bottom:8px">${esc(p.rnc || '')}${p.telefono ? ' · ' + esc(p.telefono) : ''}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">${kpi('Comprado (créd.)', fmt(totC), '#0f172a')}${kpi('Pagado', fmt(totP), '#059669')}${kpi('Saldo (CxP)', fmt(saldo), saldo > 0 ? '#dc2626' : '#16a34a')}</div>
          ${saldo > 0 ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:9px;margin-bottom:10px"><div style="font-size:11px;font-weight:800;color:#475569;margin-bottom:6px">REGISTRAR PAGO AL PROVEEDOR</div><div style="display:flex;gap:6px"><input id="provPagoMonto" data-nx-money inputmode="numeric" placeholder="Monto" style="flex:1;min-width:0;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:14px"><select id="provPagoMet" style="flex:0 0 auto;padding:9px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:12px;background:#fff"><option>Efectivo</option><option>Transferencia</option><option>Cheque</option></select><button class="btn bc1 bsm" type="button" onclick="window.nxPosPagarProv('${id}')"><i class="ti ti-plus"></i></button></div></div>` : '<div style="text-align:center;color:#16a34a;font-weight:800;font-size:12px;margin-bottom:10px">✓ Sin deuda</div>'}
          <div style="font-size:11px;font-weight:800;color:#475569;margin:8px 0 4px">COMPRAS A CRÉDITO (${compras.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:8px">${comprasHTML}</div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:8px 0 4px">PAGOS (${pagos.length})</div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">${pagosHTML}</div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px"><button class="btn bsm bghost" type="button" onclick="window.nxPosEditProv('${id}')"><i class="ti ti-edit"></i> Editar</button><button class="btn bsm bghost" type="button" style="color:#dc2626" onclick="window.nxPosDelProv('${id}')"><i class="ti ti-trash"></i> Borrar</button></div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  };
  window.nxPosPagarProv = async function (id) {
    const monto = parseMoney(val('provPagoMonto')); if (monto <= 0) { toast('err', 'Pon el monto'); return; }
    try { await getAPI().post('pos_compra_pagos', { proveedor_id: id, monto: monto, metodo: val('provPagoMet') || 'Efectivo', created_by_name: nomAdmin() }); _pagosProvByProv[id] = (_pagosProvByProv[id] || 0) + monto; toast('ok', 'Pago registrado', fmt(monto)); window.nxPosProvVer(id); } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxPosDelPagoProv = async function (pid, provId) { if (!confirm('¿Eliminar este pago?')) return; try { await getAPI().del('pos_compra_pagos', 'id=eq.' + pid); toast('ok', 'Pago eliminado'); window.nxPosProvVer(provId); } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); } };
  window.nxPosDelProv = async function (id) {
    if (!confirm('¿Eliminar este proveedor?')) return;
    try { await getAPI().patch('pos_proveedores', 'id=eq.' + id, { activo: false }); toast('ok', 'Proveedor eliminado'); cerrarModal('nxPosProv'); _proveedores = await getAPI().get('pos_proveedores', 'select=*&activo=eq.true&order=nombre.asc') || []; const v = document.getElementById('v-pos'); if (v) renderPOS(v); if (document.getElementById('nxPosProvs')) window.nxPosProveedores(); } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };

  // ── TAB: CAJA (apertura / arqueo / cierre) ──
  function renderCaja() {
    const cierresHTML = _cierres.length ? _cierres.map(c => `<tr onclick="window.nxPosVerCierre('${c.id}')" style="cursor:pointer"><td style="font-size:10px">${fechaDMY(c.cierre)}</td><td style="text-align:right">${fmt(c.efectivo_esperado)}</td><td style="text-align:right;color:${Number(c.descuadre) < 0 ? '#dc2626' : Number(c.descuadre) > 0 ? '#ea580c' : '#16a34a'};font-weight:700">${Number(c.descuadre) > 0 ? '+' : ''}${fmt(c.descuadre)}</td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;color:#475569;font-size:11px;padding:14px">Sin cierres aún</td></tr>';
    const histo = `<div style="font-size:11px;font-weight:800;color:#475569;margin:14px 0 4px">CIERRES RECIENTES</div><div class="tw" style="font-size:11px"><table style="width:100%"><thead><tr><th>Fecha cierre</th><th style="text-align:right">Esperado</th><th style="text-align:right">Descuadre</th></tr></thead><tbody>${cierresHTML}</tbody></table></div>`;
    if (!_caja) {
      return `<div class="nc" style="border:1px solid #e2e8f0;max-width:420px">
          <div style="text-align:center;padding:6px 0 12px"><i class="ti ti-lock" style="font-size:34px;color:#475569"></i><div style="font-weight:800;color:#1e293b;margin-top:6px">Caja cerrada</div><div style="font-size:11px;color:#475569">Abre la caja para empezar el turno.</div></div>
          <div class="fr nxPrForm" style="display:block"><label style="font-size:11px;font-weight:700;color:#475569;display:block;margin-bottom:4px">Monto inicial (fondo)</label><input id="cajaIni" data-nx-money inputmode="numeric" placeholder="0" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box;outline:none"></div>
          <button class="btn bc1" type="button" style="width:100%;margin-top:10px" onclick="window.nxPosAbrirCaja()"><i class="ti ti-lock-open"></i> Abrir caja</button>
        </div>${histo}`;
    }
    const tt = _cajaTot || { efe: 0, tar: 0, tra: 0, cre: 0, abEfe: 0, ent: 0, sal: 0, esperado: Number(_caja.monto_inicial || 0), movs: [], nventas: 0 };
    const movsHTML = (tt.movs || []).length ? tt.movs.map(m => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><div><b style="color:${m.tipo === 'entrada' ? '#059669' : '#dc2626'}">${m.tipo === 'entrada' ? '+' : '−'}${fmt(m.monto)}</b> <span style="color:#475569">${esc(m.concepto || m.tipo)}</span></div><button class="btn bsm bghost" onclick="window.nxPosDelMov('${m.id}')"><i class="ti ti-trash" style="color:#dc2626"></i></button></div>`).join('') : '<div style="color:#475569;font-size:11px;padding:10px">Sin movimientos</div>';
    return `<div class="nc" style="border:1px solid #e2e8f0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><div style="font-weight:800;color:#16a34a;font-size:13px"><i class="ti ti-lock-open"></i> Caja ABIERTA</div><div style="font-size:11px;color:#475569">Desde ${fechaDMY(_caja.apertura)} · Fondo ${fmt(_caja.monto_inicial)} · ${tt.nventas} ventas</div></div></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:6px;margin-bottom:10px">
          ${kpi('Efectivo', fmt(tt.efe), '#059669')}${kpi('Tarjeta', fmt(tt.tar), '#2563eb')}${kpi('Transfer.', fmt(tt.tra), '#7c3aed')}${kpi('Fiado', fmt(tt.cre), '#dc2626')}${kpi('Abonos efec.', fmt(tt.abEfe), '#059669')}
        </div>
        <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px;padding:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;color:#065f46;font-size:12px">Efectivo esperado en caja</span><b style="font-size:17px;color:#065f46">${fmt(tt.esperado)}</b></div>
        <div style="font-size:11px;font-weight:800;color:#475569;margin:4px 0 4px">MOVIMIENTOS DE EFECTIVO</div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:6px">${movsHTML}</div>
        <div style="display:flex;gap:6px;margin-bottom:12px"><button class="btn bsm bghost" type="button" onclick="window.nxPosMovimiento('entrada')"><i class="ti ti-plus"></i> Entrada</button><button class="btn bsm bghost" type="button" onclick="window.nxPosMovimiento('salida')"><i class="ti ti-minus"></i> Salida / Gasto</button></div>
        <button class="btn bc1" type="button" style="width:100%" onclick="window.nxPosCerrarCaja()"><i class="ti ti-lock"></i> Cerrar caja / Arqueo</button>
      </div>${histo}`;
  }
  window.nxPosAbrirCaja = async function () {
    const ini = parseMoney(val('cajaIni'));
    try {
      const r = await getAPI().post('pos_cajas', { monto_inicial: ini, estado: 'abierta', created_by_name: nomAdmin() });
      _caja = (r && r[0]) || null; _cajaTot = _caja ? await totalesCaja(_caja) : null;
      toast('ok', 'Caja abierta', fmt(ini));
      const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo abrir', String(e && e.message || e)); }
  };
  window.nxPosMovimiento = function (tipo) {
    if (!_caja) return;
    cerrarModal('nxPosMov');
    const ov = document.createElement('div'); ov.id = 'nxPosMov'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:380px"><div class="mt"><span><i class="ti ti-cash"></i> ${tipo === 'entrada' ? 'Entrada de efectivo' : 'Salida / Gasto'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosMov').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr"><label>Concepto</label><input id="movConc" class="no-upper" placeholder="${tipo === 'entrada' ? 'Fondo extra, etc.' : 'Pago a proveedor, retiro...'}"></div>
        <div class="fr"><label>Monto</label><input id="movMonto" data-nx-money inputmode="numeric" placeholder="0"></div>
        <div class="fe" style="gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxPosMov').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxPosAddMov('${tipo}')"><i class="ti ti-check"></i> Registrar</button></div>
      </div>`;
    document.body.appendChild(ov); scanMoney(ov);
  };
  window.nxPosAddMov = async function (tipo) {
    const monto = parseMoney(val('movMonto')); if (monto <= 0) { toast('err', 'Pon el monto'); return; }
    try {
      await getAPI().post('pos_caja_movimientos', { caja_id: _caja.id, tipo: tipo, concepto: (val('movConc') || '').trim() || null, monto: monto, created_by_name: nomAdmin() });
      cerrarModal('nxPosMov'); _cajaTot = await totalesCaja(_caja);
      toast('ok', tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada', fmt(monto));
      const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxPosDelMov = async function (id) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try { await getAPI().del('pos_caja_movimientos', 'id=eq.' + id); _cajaTot = await totalesCaja(_caja); toast('ok', 'Movimiento eliminado'); const v = document.getElementById('v-pos'); if (v) renderPOS(v); } catch (e) { toast('err', 'No se pudo', String(e && e.message || e)); }
  };
  window.nxPosCerrarCaja = function () {
    if (!_caja || !_cajaTot) return;
    cerrarModal('nxPosCierre');
    const denoms = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];
    const rows = denoms.map(d => `<div style="display:flex;align-items:center;gap:8px;padding:2px 0"><span style="width:54px;font-size:12px;font-weight:700;color:#475569;text-align:right">${d.toLocaleString('en-US')}</span><span style="color:#cbd5e1">×</span><input type="number" inputmode="numeric" min="0" data-den="${d}" value="0" oninput="window.nxPosDenom()" style="width:56px;padding:6px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;text-align:center"><span data-densub="${d}" style="margin-left:auto;font-size:12px;color:#475569">RD$ 0</span></div>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxPosCierre'; ov.className = 'overlay open';
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal nxPrForm" style="max-width:440px;max-height:92vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-lock"></i> Cerrar caja / Arqueo</span><button class="nxBack" type="button" onclick="document.getElementById('nxPosCierre').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:10px;padding:9px 12px;margin-bottom:10px;display:flex;justify-content:space-between"><span style="font-weight:700;color:#065f46;font-size:12px">Efectivo esperado</span><b style="color:#065f46;font-size:15px">${fmt(_cajaTot.esperado)}</b></div>
          <div style="font-size:11px;font-weight:800;color:#475569;margin:4px 0 6px">CONTEO DE EFECTIVO (opcional)</div>
          <div id="cierreDenoms" style="display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;margin-bottom:10px">${rows}</div>
          <div class="fr"><label>Efectivo contado</label><input id="cierreContado" inputmode="numeric" value="0" oninput="window.nxPosCierreCalc()" style="font-weight:800"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border-radius:10px;padding:9px 12px;margin-bottom:10px"><span style="font-weight:700;color:#475569;font-size:12px">Descuadre</span><b id="cierreDesc" style="font-size:15px;color:#16a34a">RD$ 0</b></div>
          <div class="fr"><label>Notas (opcional)</label><input id="cierreNotas" class="no-upper" placeholder="Observaciones del turno"></div>
        </div>
        <div class="fe" style="margin-top:10px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxPosCierre').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxPosConfirmarCierre()"><i class="ti ti-check"></i> Cerrar caja</button></div>
      </div>`;
    document.body.appendChild(ov);
  };
  window.nxPosDenom = function () {
    let sum = 0;
    document.querySelectorAll('#cierreDenoms [data-den]').forEach(inp => { const d = Number(inp.getAttribute('data-den')); const q = Number(inp.value) || 0; const st = d * q; sum += st; const lbl = document.querySelector('#cierreDenoms [data-densub="' + d + '"]'); if (lbl) lbl.textContent = 'RD$ ' + st.toLocaleString('en-US'); });
    const c = document.getElementById('cierreContado'); if (c) c.value = sum.toLocaleString('en-US');
    window.nxPosCierreCalc();
  };
  window.nxPosCierreCalc = function () {
    const esperado = (_cajaTot && _cajaTot.esperado) || 0; const contado = parseMoney(val('cierreContado')); const desc = contado - esperado;
    const el = document.getElementById('cierreDesc'); if (el) { el.textContent = (desc > 0 ? '+' : '') + fmt(desc); el.style.color = desc < 0 ? '#dc2626' : desc > 0 ? '#ea580c' : '#16a34a'; }
  };
  window.nxPosConfirmarCierre = async function () {
    if (!_caja || !_cajaTot) return;
    const tt = _cajaTot; const contado = parseMoney(val('cierreContado')); const desc = contado - tt.esperado;
    const body = { estado: 'cerrada', cierre: new Date().toISOString(), ventas_efectivo: tt.efe, ventas_tarjeta: tt.tar, ventas_transferencia: tt.tra, ventas_credito: tt.cre, abonos_efectivo: tt.abEfe, entradas: tt.ent, salidas: tt.sal, efectivo_esperado: tt.esperado, efectivo_contado: contado, descuadre: desc, notas: (val('cierreNotas') || '').trim() || null };
    try {
      await getAPI().patch('pos_cajas', 'id=eq.' + _caja.id, body);
      const cerrada = Object.assign({}, _caja, body, { monto_inicial: _caja.monto_inicial });
      toast('ok', 'Caja cerrada', 'Descuadre ' + (desc > 0 ? '+' : '') + fmt(desc));
      cerrarModal('nxPosCierre');
      const movs = (tt.movs || []).slice();
      _caja = null; _cajaTot = null;
      try { _cierres = await getAPI().get('pos_cajas', 'select=*&estado=eq.cerrada&order=cierre.desc&limit=10') || []; } catch (e) {}
      const v = document.getElementById('v-pos'); if (v) renderPOS(v);
      imprimirCierre(cerrada, movs);
    } catch (e) { toast('err', 'No se pudo cerrar', String(e && e.message || e)); }
  };
  window.nxPosVerCierre = async function (id) {
    let c = _cierres.find(x => String(x.id) === String(id));
    if (!c) { try { const r = await getAPI().get('pos_cajas', 'select=*&id=eq.' + id); c = r && r[0]; } catch (e) {} }
    if (!c) return;
    let movs = []; try { movs = await getAPI().get('pos_caja_movimientos', 'select=*&caja_id=eq.' + id + '&order=fecha.asc') || []; } catch (e) {}
    imprimirCierre(c, movs);
  };
  function imprimirCierre(c, movs) {
    const e = empInfo();
    const row = (l, v, col) => `<tr><td>${l}</td><td style="text-align:right${col ? ';color:' + col : ''}">${fmt(v)}</td></tr>`;
    const movHTML = (movs || []).length ? movs.map(m => `<tr><td>${m.tipo === 'entrada' ? '➕' : '➖'} ${esc(m.concepto || m.tipo)}</td><td style="text-align:right;color:${m.tipo === 'entrada' ? '#059669' : '#dc2626'}">${m.tipo === 'entrada' ? '+' : '−'}${fmt(m.monto)}</td></tr>`).join('') : '';
    const desc = Number(c.descuadre || 0);
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cierre de caja</title>
      <style>body{font-family:Arial,sans-serif;color:#1e293b;max-width:420px;margin:0 auto;padding:18px;font-size:13px}h1{font-size:17px;text-align:center;margin:0}.muted{color:#475569;font-size:11px;text-align:center}table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:6px 4px;border-bottom:1px solid #eef2f6}.tit{font-size:11px;font-weight:800;color:#475569;margin:10px 0 2px}.big td{font-size:15px;font-weight:800}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-18px -18px 12px;padding:10px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button></div>
        <h1>📋 Cierre de Caja</h1>
        <div class="muted">${esc(e.nom)} · ${c.created_by_name ? esc(c.created_by_name) + ' · ' : ''}${fechaDMY(c.cierre)}</div>
        <div class="muted">Apertura: ${fechaDMY(c.apertura)}</div>
        <div class="tit">VENTAS DEL TURNO</div>
        <table>
          ${row('Efectivo', c.ventas_efectivo)}${row('Tarjeta', c.ventas_tarjeta)}${row('Transferencia', c.ventas_transferencia)}${row('Fiado (crédito)', c.ventas_credito, '#dc2626')}${row('Abonos en efectivo', c.abonos_efectivo, '#059669')}
        </table>
        <div class="tit">EFECTIVO</div>
        <table>
          ${row('Fondo inicial', c.monto_inicial)}${row('+ Ventas efectivo', c.ventas_efectivo)}${row('+ Abonos efectivo', c.abonos_efectivo)}${row('+ Entradas', c.entradas)}${row('− Salidas/Gastos', c.salidas)}
          <tr class="big"><td>Efectivo esperado</td><td style="text-align:right">${fmt(c.efectivo_esperado)}</td></tr>
          <tr class="big"><td>Efectivo contado</td><td style="text-align:right">${fmt(c.efectivo_contado)}</td></tr>
          <tr class="big"><td>Descuadre</td><td style="text-align:right;color:${desc < 0 ? '#dc2626' : desc > 0 ? '#ea580c' : '#16a34a'}">${desc > 0 ? '+' : ''}${fmt(desc)}</td></tr>
        </table>
        ${movHTML ? '<div class="tit">MOVIMIENTOS</div><table>' + movHTML + '</table>' : ''}
        ${c.notas ? '<div class="muted" style="text-align:left;margin-top:6px">📝 ' + esc(c.notas) + '</div>' : ''}
        <button class="noprint" onclick="window.print()" style="width:100%;padding:12px;margin-top:16px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes para ver el cierre'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  }

  // ════════════════════════════════════════════════════════════════════
  // ── MÓDULO CONTABILIDAD (POS / multiempresa) ──
  // Plan de cuentas, Libro Diario, Mayor, Balance de comprobación,
  // Estado de Resultados y Balance General. Asientos automáticos desde ventas.
  // ════════════════════════════════════════════════════════════════════
  const PLAN_BASE = [
    ['1101', 'Caja', 'activo', 'deudora'],
    ['1102', 'Banco', 'activo', 'deudora'],
    ['1103', 'Cuentas por cobrar (clientes)', 'activo', 'deudora'],
    ['1104', 'Inventario de mercancías', 'activo', 'deudora'],
    ['1105', 'ITBIS pagado (adelantado)', 'activo', 'deudora'],
    ['2101', 'Cuentas por pagar (proveedores)', 'pasivo', 'acreedora'],
    ['2102', 'ITBIS por pagar', 'pasivo', 'acreedora'],
    ['2103', 'Sueldos por pagar', 'pasivo', 'acreedora'],
    ['2104', 'Retenciones por pagar (TSS/ISR)', 'pasivo', 'acreedora'],
    ['3101', 'Capital', 'capital', 'acreedora'],
    ['3102', 'Resultados acumulados', 'capital', 'acreedora'],
    ['4101', 'Ventas', 'ingreso', 'acreedora'],
    ['4102', 'Otros ingresos', 'ingreso', 'acreedora'],
    ['5101', 'Costo de mercancía vendida', 'costo', 'deudora'],
    ['6101', 'Sueldos y salarios', 'gasto', 'deudora'],
    ['6102', 'Alquiler', 'gasto', 'deudora'],
    ['6103', 'Servicios (luz, agua, internet)', 'gasto', 'deudora'],
    ['6104', 'Gastos varios', 'gasto', 'deudora']
  ];
  const TIPO_LBL = { activo: 'Activo', pasivo: 'Pasivo', capital: 'Capital', ingreso: 'Ingreso', costo: 'Costo', gasto: 'Gasto' };

  function isoHoy() { try { return new Date().toLocaleDateString('en-CA'); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function isoMesIni() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA'); }
  async function cargarContabilidad() {
    _cuentas = await getAPI().get('pos_cuentas', 'select=*&order=codigo.asc') || [];
    _asientos = await getAPI().get('pos_asientos', 'select=*&order=fecha.desc,created_at.desc&limit=600') || [];
    // Unir las líneas en JS (no depende de la detección de relación de PostgREST)
    try {
      const lns = await getAPI().get('pos_asiento_lineas', 'select=*&limit=5000') || [];
      const byA = {}; lns.forEach(l => { (byA[l.asiento_id] = byA[l.asiento_id] || []).push(l); });
      _asientos.forEach(a => { a.lineas = byA[a.id] || []; });
    } catch (e) { _asientos.forEach(a => { a.lineas = a.lineas || []; }); }
    if (!_ctaDesde) _ctaDesde = isoMesIni();
    if (!_ctaHasta) _ctaHasta = isoHoy();
  }
  function ctaById(id) { return _cuentas.find(x => String(x.id) === String(id)); }
  function asLineas(a) { return a.lineas || a.pos_asiento_lineas || []; }
  function enRangoCta(f) { const d = String(f || '').slice(0, 10); if (_ctaDesde && d < _ctaDesde) return false; if (_ctaHasta && d > _ctaHasta) return false; return true; }
  function asientosRango() { return (_asientos || []).filter(a => enRangoCta(a.fecha)); }
  function saldosCta() {
    const m = {};
    _cuentas.forEach(c => { m[c.codigo] = { cuenta: c, debe: 0, haber: 0 }; });
    asientosRango().forEach(a => asLineas(a).forEach(l => {
      let cod = l.cuenta_codigo || ((ctaById(l.cuenta_id) || {}).codigo);
      if (!cod) return;
      if (!m[cod]) { const c = ctaById(l.cuenta_id) || { codigo: cod, nombre: l.cuenta_nombre || cod, tipo: 'gasto', naturaleza: 'deudora' }; m[cod] = { cuenta: c, debe: 0, haber: 0 }; }
      m[cod].debe += Number(l.debito || 0); m[cod].haber += Number(l.credito || 0);
    }));
    return m;
  }
  function saldoNat(o) { const nat = (o.cuenta && o.cuenta.naturaleza) || 'deudora'; return nat === 'deudora' ? o.debe - o.haber : o.haber - o.debe; }
  function sumaPorTipo(saldos, tipo) { let s = 0; Object.values(saldos).forEach(o => { if (o.cuenta && o.cuenta.tipo === tipo) s += saldoNat(o); }); return s; }

  function renderContabilidad() {
    if (!_cuentas.length) {
      return `<div style="text-align:center;padding:40px 16px;color:#475569">
        <div style="font-size:42px;margin-bottom:8px"><i class="ti ti-book-2" style="color:#7c3aed"></i></div>
        <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:6px">Contabilidad lista para empezar</div>
        <div style="font-size:12.5px;max-width:420px;margin:0 auto 16px;line-height:1.5">Crea tu <b>Plan de Cuentas</b> base (Caja, Banco, Ventas, ITBIS, Gastos…). Desde ahí podrás registrar asientos y ver tus reportes. Las <b>ventas del POS se contabilizan solas</b>.</div>
        <button class="btn bc1" type="button" onclick="window.nxCtaInicializar()"><i class="ti ti-sparkles"></i> Crear plan de cuentas base</button>
      </div>`;
    }
    const sub = (k, lbl, ic) => `<button type="button" class="nxFacSubTab${_ctaTab === k ? ' on' : ''}" onclick="window.nxCtaTab('${k}')"><i class="ti ${ic}"></i> ${lbl}</button>`;
    const tabs = `<div class="nxFacSubTabs">${sub('resumen', 'Resumen', 'ti-gauge')}${sub('plan', 'Plan de cuentas', 'ti-list-numbers')}${sub('diario', 'Libro Diario', 'ti-book')}${sub('mayor', 'Libro Mayor', 'ti-file-text')}${sub('balanza', 'Comprobación', 'ti-scale')}${sub('resultados', 'Estado Resultados', 'ti-chart-bar')}${sub('general', 'Balance General', 'ti-report-money')}</div>`;
    const imprimible = ['diario', 'balanza', 'resultados', 'general'].indexOf(_ctaTab) >= 0;
    const rango = (_ctaTab === 'plan') ? '' : `<div class="nxCtaRango">
        <div class="nxFacF"><label>Desde</label><input type="date" value="${_ctaDesde}" onchange="window.nxCtaRango('d',this.value)"></div>
        <div class="nxFacF"><label>Hasta</label><input type="date" value="${_ctaHasta}" onchange="window.nxCtaRango('h',this.value)"></div>
        <div style="font-size:11px;color:#475569;align-self:end;padding-bottom:11px">${asientosRango().length} asiento(s)</div>
        ${imprimible ? `<button class="btn bsm bghost" type="button" style="margin-left:auto;align-self:end" onclick="window.nxCtaImprimir('${_ctaTab}')"><i class="ti ti-printer"></i> Imprimir</button>` : ''}
      </div>`;
    let body = '';
    if (_ctaTab === 'plan') body = ctaPlan();
    else if (_ctaTab === 'diario') body = ctaDiario();
    else if (_ctaTab === 'mayor') body = ctaMayor();
    else if (_ctaTab === 'balanza') body = ctaBalanza();
    else if (_ctaTab === 'resultados') body = ctaResultados();
    else if (_ctaTab === 'general') body = ctaGeneral();
    else body = ctaResumen();
    return tabs + rango + body;
  }

  function ctaResumen() {
    const s = saldosCta();
    const ingresos = sumaPorTipo(s, 'ingreso'), costo = sumaPorTipo(s, 'costo'), gasto = sumaPorTipo(s, 'gasto');
    const utilidad = ingresos - costo - gasto;
    const activos = sumaPorTipo(s, 'activo'), pasivos = sumaPorTipo(s, 'pasivo'), capital = sumaPorTipo(s, 'capital');
    const card = (lbl, val, col) => `<div class="nxCtaKpi"><div class="nxCtaKpiL">${lbl}</div><div class="nxCtaKpiV" style="color:${col}">${fmt(val)}</div></div>`;
    return `<div class="nxCtaKpis">
        ${card('Ingresos del período', ingresos, '#16a34a')}
        ${card('Costos + Gastos', costo + gasto, '#dc2626')}
        ${card('Utilidad / Pérdida', utilidad, utilidad >= 0 ? '#16a34a' : '#dc2626')}
        ${card('Activos', activos, '#2563eb')}
        ${card('Pasivos', pasivos, '#ea580c')}
        ${card('Capital + resultado', capital + utilidad, '#7c3aed')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <button class="btn bsm bc1" type="button" onclick="window.nxCtaGasto()"><i class="ti ti-cash-banknote"></i> Registrar gasto</button>
        <button class="btn bsm bghost" type="button" onclick="window.nxCtaNuevoAsiento()"><i class="ti ti-plus"></i> Nuevo asiento</button>
        <button class="btn bsm bghost" type="button" onclick="window.nxCtaTab('diario')"><i class="ti ti-book"></i> Ver libro diario</button>
        <button class="btn bsm bghost" type="button" onclick="window.nxCtaTab('resultados')"><i class="ti ti-chart-bar"></i> Estado de resultados</button>
      </div>`;
  }

  function ctaPlan() {
    const filas = _cuentas.map(c => `<tr${c.activo === false ? ' style="opacity:.5"' : ''}>
        <td class="nxFacCod">${esc(c.codigo)}</td>
        <td style="font-weight:600">${esc(c.nombre)}</td>
        <td><span class="nxCtaTipo nxCtaTipo-${c.tipo}">${TIPO_LBL[c.tipo] || c.tipo}</span></td>
        <td style="text-align:center;font-size:11px;color:#475569">${c.naturaleza === 'deudora' ? 'Deudora' : 'Acreedora'}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn bsm bc1" onclick="window.nxCtaEditCuenta('${c.id}')"><i class="ti ti-edit"></i></button></td>
      </tr>`).join('');
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        <button class="btn bsm bc1" type="button" onclick="window.nxCtaNuevaCuenta()"><i class="ti ti-plus"></i> Nueva cuenta</button>
        <span style="font-size:11px;color:#475569;align-self:center">${_cuentas.length} cuentas</span>
      </div>
      <div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th style="text-align:center">Naturaleza</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }

  function ctaDiario() {
    const list = asientosRango();
    if (!list.length) return `<div style="text-align:center;padding:30px;color:#475569;font-size:12.5px">Sin asientos en este período.<br><button class="btn bsm bc1" style="margin-top:10px" onclick="window.nxCtaNuevoAsiento()"><i class="ti ti-plus"></i> Nuevo asiento</button></div>`;
    const bloques = list.map(a => {
      const ls = asLineas(a);
      const td = ls.reduce((s, l) => s + Number(l.debito || 0), 0), th = ls.reduce((s, l) => s + Number(l.credito || 0), 0);
      const filas = ls.map(l => `<tr><td class="nxFacCod">${esc(l.cuenta_codigo || '')}</td><td>${esc(l.cuenta_nombre || (ctaById(l.cuenta_id) || {}).nombre || '')}</td><td style="text-align:right">${Number(l.debito) ? fmt(l.debito) : ''}</td><td style="text-align:right">${Number(l.credito) ? fmt(l.credito) : ''}</td></tr>`).join('');
      const badge = a.tipo === 'venta' ? '<span class="nxCtaOrig">auto · venta</span>' : a.tipo === 'manual' ? '' : `<span class="nxCtaOrig">${esc(a.tipo)}</span>`;
      return `<div class="nxCtaAs">
        <div class="nxCtaAsHd"><div><b>${fechaDMY(a.fecha)}</b> · ${esc(a.concepto || 'Asiento')} ${badge}</div>${a.tipo === 'manual' ? `<button class="nxPosX" title="Eliminar" onclick="window.nxCtaDelAsiento('${a.id}')"><i class="ti ti-trash"></i></button>` : ''}</div>
        <table class="nxCtaAsT"><thead><tr><th>Cód.</th><th>Cuenta</th><th style="text-align:right">Debe</th><th style="text-align:right">Haber</th></tr></thead><tbody>${filas}<tr class="nxCtaAsTot"><td></td><td style="text-align:right;font-weight:800">Totales</td><td style="text-align:right;font-weight:800">${fmt(td)}</td><td style="text-align:right;font-weight:800">${fmt(th)}</td></tr></tbody></table>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:10px"><button class="btn bsm bc1" type="button" onclick="window.nxCtaNuevoAsiento()"><i class="ti ti-plus"></i> Nuevo asiento</button></div>${bloques}`;
  }

  function ctaMayor() {
    const opts = _cuentas.map(c => `<option value="${c.id}"${String(_ctaMayorSel) === String(c.id) ? ' selected' : ''}>${esc(c.codigo)} — ${esc(c.nombre)}</option>`).join('');
    let cuerpo = '<div style="text-align:center;padding:24px;color:#475569;font-size:12.5px">Elige una cuenta para ver su movimiento.</div>';
    const c = ctaById(_ctaMayorSel);
    if (c) {
      const movs = [];
      asientosRango().slice().reverse().forEach(a => asLineas(a).forEach(l => {
        const cod = l.cuenta_codigo || ((ctaById(l.cuenta_id) || {}).codigo);
        if (String(cod) === String(c.codigo)) movs.push({ fecha: a.fecha, concepto: a.concepto, debe: Number(l.debito || 0), haber: Number(l.credito || 0) });
      }));
      let saldo = 0;
      const filas = movs.map(m => { saldo += (c.naturaleza === 'deudora' ? (m.debe - m.haber) : (m.haber - m.debe)); return `<tr><td>${fechaDMY(m.fecha)}</td><td>${esc(m.concepto || '')}</td><td style="text-align:right">${m.debe ? fmt(m.debe) : ''}</td><td style="text-align:right">${m.haber ? fmt(m.haber) : ''}</td><td style="text-align:right;font-weight:700">${fmt(saldo)}</td></tr>`; }).join('');
      const td = movs.reduce((s, m) => s + m.debe, 0), th = movs.reduce((s, m) => s + m.haber, 0);
      cuerpo = movs.length ? `<div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th>Fecha</th><th>Concepto</th><th style="text-align:right">Debe</th><th style="text-align:right">Haber</th><th style="text-align:right">Saldo</th></tr></thead><tbody>${filas}<tr class="nxCtaAsTot"><td colspan="2" style="text-align:right;font-weight:800">Totales</td><td style="text-align:right;font-weight:800">${fmt(td)}</td><td style="text-align:right;font-weight:800">${fmt(th)}</td><td style="text-align:right;font-weight:800">${fmt(saldo)}</td></tr></tbody></table></div>` : '<div style="text-align:center;padding:24px;color:#475569;font-size:12.5px">Sin movimientos en el período.</div>';
    }
    return `<div class="nxFacF" style="max-width:420px;margin-bottom:12px"><label>Cuenta</label><select onchange="window.nxCtaMayorSel(this.value)"><option value="">— Elegir cuenta —</option>${opts}</select></div>${cuerpo}`;
  }

  function ctaBalanza() {
    const s = saldosCta();
    const arr = Object.values(s).filter(o => o.debe || o.haber).sort((a, b) => String(a.cuenta.codigo).localeCompare(String(b.cuenta.codigo)));
    if (!arr.length) return '<div style="text-align:center;padding:24px;color:#475569;font-size:12.5px">Sin movimientos contables en el período.</div>';
    let TD = 0, TH = 0;
    const filas = arr.map(o => { TD += o.debe; TH += o.haber; return `<tr><td class="nxFacCod">${esc(o.cuenta.codigo)}</td><td>${esc(o.cuenta.nombre)}</td><td style="text-align:right">${fmt(o.debe)}</td><td style="text-align:right">${fmt(o.haber)}</td></tr>`; }).join('');
    const cuadra = Math.round(TD) === Math.round(TH);
    return `<div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th>Código</th><th>Cuenta</th><th style="text-align:right">Debe</th><th style="text-align:right">Haber</th></tr></thead><tbody>${filas}<tr class="nxCtaAsTot"><td></td><td style="text-align:right;font-weight:800">TOTALES</td><td style="text-align:right;font-weight:800">${fmt(TD)}</td><td style="text-align:right;font-weight:800">${fmt(TH)}</td></tr></tbody></table></div>
      <div style="text-align:center;margin-top:10px;font-size:12px;font-weight:700;color:${cuadra ? '#16a34a' : '#dc2626'}">${cuadra ? '✓ La balanza cuadra (Debe = Haber)' : '⚠ Descuadre de ' + fmt(Math.abs(TD - TH))}</div>`;
  }

  function ctaResultados() {
    const s = saldosCta();
    const ingArr = Object.values(s).filter(o => o.cuenta.tipo === 'ingreso' && saldoNat(o));
    const cosArr = Object.values(s).filter(o => o.cuenta.tipo === 'costo' && saldoNat(o));
    const gasArr = Object.values(s).filter(o => o.cuenta.tipo === 'gasto' && saldoNat(o));
    const ing = ingArr.reduce((a, o) => a + saldoNat(o), 0);
    const cos = cosArr.reduce((a, o) => a + saldoNat(o), 0);
    const gas = gasArr.reduce((a, o) => a + saldoNat(o), 0);
    const bruta = ing - cos, neta = bruta - gas;
    const sec = (titulo, arr, col) => arr.length ? `<tr class="nxCtaSec"><td colspan="2">${titulo}</td></tr>` + arr.map(o => `<tr><td style="padding-left:18px">${esc(o.cuenta.nombre)}</td><td style="text-align:right;color:${col}">${fmt(saldoNat(o))}</td></tr>`).join('') : '';
    return `<div class="nxCtaRep"><table style="width:100%">
        ${sec('INGRESOS', ingArr, '#16a34a')}
        <tr class="nxCtaTotR"><td>Total ingresos</td><td style="text-align:right">${fmt(ing)}</td></tr>
        ${sec('COSTO DE VENTAS', cosArr, '#dc2626')}
        <tr class="nxCtaTotR"><td>Utilidad bruta</td><td style="text-align:right;color:${bruta >= 0 ? '#16a34a' : '#dc2626'}">${fmt(bruta)}</td></tr>
        ${sec('GASTOS OPERATIVOS', gasArr, '#dc2626')}
        <tr class="nxCtaTotR"><td>Total gastos</td><td style="text-align:right">${fmt(gas)}</td></tr>
        <tr class="nxCtaGran"><td>${neta >= 0 ? 'UTILIDAD NETA' : 'PÉRDIDA NETA'}</td><td style="text-align:right;color:${neta >= 0 ? '#16a34a' : '#dc2626'}">${fmt(neta)}</td></tr>
      </table></div>`;
  }

  function ctaGeneral() {
    const s = saldosCta();
    const ing = sumaPorTipo(s, 'ingreso'), cos = sumaPorTipo(s, 'costo'), gas = sumaPorTipo(s, 'gasto');
    const utilidad = ing - cos - gas;
    const actArr = Object.values(s).filter(o => o.cuenta.tipo === 'activo' && saldoNat(o));
    const pasArr = Object.values(s).filter(o => o.cuenta.tipo === 'pasivo' && saldoNat(o));
    const capArr = Object.values(s).filter(o => o.cuenta.tipo === 'capital' && saldoNat(o));
    const act = actArr.reduce((a, o) => a + saldoNat(o), 0);
    const pas = pasArr.reduce((a, o) => a + saldoNat(o), 0);
    const cap = capArr.reduce((a, o) => a + saldoNat(o), 0);
    const patrimonio = cap + utilidad, pasMasCap = pas + patrimonio;
    const cuadra = Math.round(act) === Math.round(pasMasCap);
    const sec = (titulo, arr) => `<tr class="nxCtaSec"><td colspan="2">${titulo}</td></tr>` + (arr.length ? arr.map(o => `<tr><td style="padding-left:18px">${esc(o.cuenta.nombre)}</td><td style="text-align:right">${fmt(saldoNat(o))}</td></tr>`).join('') : '<tr><td style="padding-left:18px;color:#475569">—</td><td></td></tr>');
    return `<div class="nxCtaRep"><table style="width:100%">
        ${sec('ACTIVOS', actArr)}
        <tr class="nxCtaTotR"><td>Total activos</td><td style="text-align:right">${fmt(act)}</td></tr>
        ${sec('PASIVOS', pasArr)}
        <tr class="nxCtaTotR"><td>Total pasivos</td><td style="text-align:right">${fmt(pas)}</td></tr>
        ${sec('PATRIMONIO / CAPITAL', capArr)}
        <tr><td style="padding-left:18px">Resultado del período</td><td style="text-align:right;color:${utilidad >= 0 ? '#16a34a' : '#dc2626'}">${fmt(utilidad)}</td></tr>
        <tr class="nxCtaTotR"><td>Total patrimonio</td><td style="text-align:right">${fmt(patrimonio)}</td></tr>
        <tr class="nxCtaGran"><td>PASIVO + CAPITAL</td><td style="text-align:right">${fmt(pasMasCap)}</td></tr>
      </table>
      <div style="text-align:center;margin-top:10px;font-size:12px;font-weight:700;color:${cuadra ? '#16a34a' : '#dc2626'}">${cuadra ? '✓ Balance cuadrado (Activo = Pasivo + Capital)' : '⚠ Diferencia de ' + fmt(Math.abs(act - pasMasCap))}</div></div>`;
  }

  // ── Acciones Contabilidad ──
  window.nxCtaTab = function (t) { _ctaTab = t; const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxCtaRango = function (k, val) { if (k === 'd') _ctaDesde = val; else _ctaHasta = val; const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxCtaMayorSel = function (id) { _ctaMayorSel = id; const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxCtaInicializar = async function () {
    if (!esAdmin()) return;
    try {
      const rows = PLAN_BASE.map(p => ({ codigo: p[0], nombre: p[1], tipo: p[2], naturaleza: p[3] }));
      await getAPI().post('pos_cuentas', rows);
      toast('ok', 'Plan de cuentas creado', rows.length + ' cuentas');
      await cargarContabilidad(); const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo crear el plan', String(e && e.message || e)); }
  };
  window.nxCtaNuevaCuenta = function () { abrirCuenta(null); };
  window.nxCtaEditCuenta = function (id) { const c = ctaById(id); if (c) abrirCuenta(c); };
  function abrirCuenta(c) {
    cerrarModal('nxCtaForm');
    const e = c || {};
    const tipos = ['activo', 'pasivo', 'capital', 'ingreso', 'costo', 'gasto'].map(t => `<option value="${t}"${e.tipo === t ? ' selected' : ''}>${TIPO_LBL[t]}</option>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxCtaForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:400px">
        <div class="mt"><span><i class="ti ti-list-numbers"></i> ${c ? 'Editar cuenta' : 'Nueva cuenta'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxCtaForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr-row">
          <div class="fr"><label>Código *</label><input id="ctC" class="no-upper" value="${esc(e.codigo || '')}" placeholder="Ej: 6105"></div>
          <div class="fr"><label>Tipo</label><select id="ctT">${tipos}</select></div>
        </div>
        <div class="fr"><label>Nombre *</label><input id="ctN" class="no-upper" value="${esc(e.nombre || '')}" placeholder="Nombre de la cuenta"></div>
        <div class="fr-row">
          <div class="fr"><label>Naturaleza</label><select id="ctNat"><option value="deudora"${e.naturaleza !== 'acreedora' ? ' selected' : ''}>Deudora</option><option value="acreedora"${e.naturaleza === 'acreedora' ? ' selected' : ''}>Acreedora</option></select></div>
          <div class="fr"><label>Activa</label><select id="ctA"><option value="1"${e.activo !== false ? ' selected' : ''}>Sí</option><option value="0"${e.activo === false ? ' selected' : ''}>No</option></select></div>
        </div>
        <div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxCtaForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxCtaGuardarCuenta('${c ? c.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button></div>
      </div>`;
    document.body.appendChild(ov);
  }
  window.nxCtaGuardarCuenta = async function (id) {
    const body = { codigo: (val('ctC') || '').trim(), nombre: (val('ctN') || '').trim(), tipo: val('ctT'), naturaleza: val('ctNat'), activo: val('ctA') === '1' };
    if (!body.codigo || !body.nombre) { toast('err', 'Falta código o nombre'); return; }
    try {
      if (id) await getAPI().patch('pos_cuentas', 'id=eq.' + id, body); else await getAPI().post('pos_cuentas', body);
      cerrarModal('nxCtaForm'); toast('ok', 'Cuenta guardada');
      await cargarContabilidad(); const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxCtaDelAsiento = async function (id) {
    if (!confirm('¿Eliminar este asiento? Esta acción no se puede deshacer.')) return;
    try { await getAPI().del('pos_asiento_lineas', 'asiento_id=eq.' + id); await getAPI().del('pos_asientos', 'id=eq.' + id); toast('ok', 'Asiento eliminado'); await cargarContabilidad(); const v = document.getElementById('v-pos'); if (v) renderPOS(v); }
    catch (e) { toast('err', 'No se pudo eliminar', String(e && e.message || e)); }
  };

  // ── Registrar gasto rápido (Debe gasto / Haber Caja o Banco) ──
  window.nxCtaGasto = function () {
    const gastos = _cuentas.filter(c => (c.tipo === 'gasto' || c.tipo === 'costo') && c.activo !== false);
    if (!gastos.length) { toast('err', 'No hay cuentas de gasto', 'Crea el plan de cuentas primero'); return; }
    cerrarModal('nxGastoForm');
    const opts = gastos.map(c => `<option value="${c.id}">${esc(c.codigo)} — ${esc(c.nombre)}</option>`).join('');
    const ov = document.createElement('div'); ov.id = 'nxGastoForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:420px">
        <div class="mt"><span><i class="ti ti-cash-banknote"></i> Registrar gasto</span><button class="nxBack" type="button" onclick="document.getElementById('nxGastoForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr"><label>Tipo de gasto *</label><select id="gsC">${opts}</select></div>
        <div class="fr-row">
          <div class="fr"><label>Monto *</label><input id="gsM" data-nx-money inputmode="numeric" placeholder="0"></div>
          <div class="fr"><label>Pagado con</label><select id="gsP"><option value="1101">Caja (efectivo)</option><option value="1102">Banco / transferencia</option></select></div>
        </div>
        <div class="fr"><label>Fecha</label><input type="date" id="gsF" value="${isoHoy()}"></div>
        <div class="fr"><label>Concepto</label><input id="gsD" class="no-upper" placeholder="Ej: Pago de luz de junio"></div>
        <div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxGastoForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxCtaGuardarGasto()"><i class="ti ti-device-floppy"></i> Guardar</button></div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  };
  window.nxCtaGuardarGasto = async function () {
    const cid = val('gsC'), monto = parseMoney(val('gsM'));
    if (!cid || monto <= 0) { toast('err', 'Elige el gasto y el monto'); return; }
    const cg = ctaById(cid); const pagCod = val('gsP') || '1101'; const cp = _cuentas.find(c => c.codigo === pagCod);
    if (!cg || !cp) { toast('err', 'Faltan cuentas (Caja/Banco)'); return; }
    const conc = (val('gsD') || '').trim() || ('Gasto: ' + (cg.nombre || ''));
    try {
      const as = await getAPI().post('pos_asientos', { fecha: val('gsF') || isoHoy(), concepto: conc, tipo: 'gasto' });
      const aid = (as && as[0] && as[0].id); if (!aid) throw new Error('No se creó el asiento');
      await getAPI().post('pos_asiento_lineas', [
        { asiento_id: aid, cuenta_id: cg.id, cuenta_codigo: cg.codigo, cuenta_nombre: cg.nombre, debito: Math.round(monto), credito: 0 },
        { asiento_id: aid, cuenta_id: cp.id, cuenta_codigo: cp.codigo, cuenta_nombre: cp.nombre, debito: 0, credito: Math.round(monto) }
      ]);
      cerrarModal('nxGastoForm'); toast('ok', 'Gasto registrado', fmt(monto));
      await cargarContabilidad(); const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  // ── Imprimir reportes contables ──
  window.nxCtaImprimir = function (tipo) {
    const e = empInfo();
    const titulos = { diario: 'LIBRO DIARIO', balanza: 'BALANCE DE COMPROBACIÓN', resultados: 'ESTADO DE RESULTADOS', general: 'BALANCE GENERAL' };
    let cuerpo = '';
    const s = saldosCta();
    if (tipo === 'balanza') {
      const arr = Object.values(s).filter(o => o.debe || o.haber).sort((a, b) => String(a.cuenta.codigo).localeCompare(String(b.cuenta.codigo)));
      let TD = 0, TH = 0;
      const filas = arr.map(o => { TD += o.debe; TH += o.haber; return `<tr><td>${esc(o.cuenta.codigo)}</td><td>${esc(o.cuenta.nombre)}</td><td class="r">${fmt(o.debe)}</td><td class="r">${fmt(o.haber)}</td></tr>`; }).join('');
      cuerpo = `<table><thead><tr><th>Código</th><th>Cuenta</th><th class="r">Debe</th><th class="r">Haber</th></tr></thead><tbody>${filas}<tr class="tot"><td></td><td class="r">TOTALES</td><td class="r">${fmt(TD)}</td><td class="r">${fmt(TH)}</td></tr></tbody></table>`;
    } else if (tipo === 'resultados') {
      const ingArr = Object.values(s).filter(o => o.cuenta.tipo === 'ingreso' && saldoNat(o));
      const cosArr = Object.values(s).filter(o => o.cuenta.tipo === 'costo' && saldoNat(o));
      const gasArr = Object.values(s).filter(o => o.cuenta.tipo === 'gasto' && saldoNat(o));
      const ing = ingArr.reduce((a, o) => a + saldoNat(o), 0), cos = cosArr.reduce((a, o) => a + saldoNat(o), 0), gas = gasArr.reduce((a, o) => a + saldoNat(o), 0);
      const sec = (t, arr) => (arr.length ? `<tr class="sec"><td colspan="2">${t}</td></tr>` + arr.map(o => `<tr><td class="ind">${esc(o.cuenta.nombre)}</td><td class="r">${fmt(saldoNat(o))}</td></tr>`).join('') : '');
      cuerpo = `<table>${sec('INGRESOS', ingArr)}<tr class="tot"><td>Total ingresos</td><td class="r">${fmt(ing)}</td></tr>${sec('COSTO DE VENTAS', cosArr)}<tr class="tot"><td>Utilidad bruta</td><td class="r">${fmt(ing - cos)}</td></tr>${sec('GASTOS', gasArr)}<tr class="tot"><td>Total gastos</td><td class="r">${fmt(gas)}</td></tr><tr class="gran"><td>${(ing - cos - gas) >= 0 ? 'UTILIDAD NETA' : 'PÉRDIDA NETA'}</td><td class="r">${fmt(ing - cos - gas)}</td></tr></table>`;
    } else if (tipo === 'general') {
      const ing = sumaPorTipo(s, 'ingreso'), cos = sumaPorTipo(s, 'costo'), gas = sumaPorTipo(s, 'gasto'), util = ing - cos - gas;
      const actArr = Object.values(s).filter(o => o.cuenta.tipo === 'activo' && saldoNat(o));
      const pasArr = Object.values(s).filter(o => o.cuenta.tipo === 'pasivo' && saldoNat(o));
      const capArr = Object.values(s).filter(o => o.cuenta.tipo === 'capital' && saldoNat(o));
      const act = actArr.reduce((a, o) => a + saldoNat(o), 0), pas = pasArr.reduce((a, o) => a + saldoNat(o), 0), cap = capArr.reduce((a, o) => a + saldoNat(o), 0);
      const sec = (t, arr) => `<tr class="sec"><td colspan="2">${t}</td></tr>` + (arr.length ? arr.map(o => `<tr><td class="ind">${esc(o.cuenta.nombre)}</td><td class="r">${fmt(saldoNat(o))}</td></tr>`).join('') : '<tr><td class="ind">—</td><td></td></tr>');
      cuerpo = `<table>${sec('ACTIVOS', actArr)}<tr class="tot"><td>Total activos</td><td class="r">${fmt(act)}</td></tr>${sec('PASIVOS', pasArr)}<tr class="tot"><td>Total pasivos</td><td class="r">${fmt(pas)}</td></tr>${sec('PATRIMONIO', capArr)}<tr><td class="ind">Resultado del período</td><td class="r">${fmt(util)}</td></tr><tr class="gran"><td>PASIVO + CAPITAL</td><td class="r">${fmt(pas + cap + util)}</td></tr></table>`;
    } else {
      const list = asientosRango();
      cuerpo = list.map(a => { const ls = asLineas(a); const filas = ls.map(l => `<tr><td>${esc(l.cuenta_codigo || '')}</td><td>${esc(l.cuenta_nombre || '')}</td><td class="r">${Number(l.debito) ? fmt(l.debito) : ''}</td><td class="r">${Number(l.credito) ? fmt(l.credito) : ''}</td></tr>`).join(''); return `<div class="as"><b>${fechaDMY(a.fecha)}</b> · ${esc(a.concepto || '')}<table><thead><tr><th>Cód.</th><th>Cuenta</th><th class="r">Debe</th><th class="r">Haber</th></tr></thead><tbody>${filas}</tbody></table></div>`; }).join('') || '<div style="color:#777">Sin asientos en el período.</div>';
    }
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulos[tipo] || 'Reporte'}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:720px;margin:0 auto;padding:20px;font-size:12.5px}h1{font-size:16px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:8px 0}th{text-align:left;font-size:10px;text-transform:uppercase;color:#555;border-bottom:1.5px solid #999;padding:5px 6px}td{padding:4px 6px;border-bottom:1px solid #eee}.r{text-align:right}.tot td{font-weight:800;border-top:1.5px solid #999;border-bottom:none}.gran td{font-weight:800;font-size:14px;border-top:2px solid #111;border-bottom:none}.sec td{font-weight:800;font-size:10px;text-transform:uppercase;color:#555;padding-top:10px}.ind{padding-left:16px}.as{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;margin-bottom:8px}.line{border-top:1px solid #ccc;margin:8px 0}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-20px -20px 14px;padding:9px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button><button onclick="window.print()" style="background:#fff;color:#1e3a6e;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="c muted">${e.rnc ? 'RNC: ' + esc(e.rnc) : ''}${e.tel ? ' · ' + esc(e.tel) : ''}</div>
        <div class="line"></div>
        <div class="c"><b>${titulos[tipo] || 'Reporte'}</b></div>
        <div class="c muted">Del ${fechaDMY(_ctaDesde)} al ${fechaDMY(_ctaHasta)}</div>
        ${cuerpo}
        <div class="muted" style="margin-top:18px">Generado el ${fechaDMY(isoHoy())} · NEXUS PRO</div>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes para imprimir'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  };

  // ── Editor de asiento manual ──
  window.nxCtaNuevoAsiento = function () {
    _asEdit = { fecha: isoHoy(), concepto: '', lineas: [{ cuenta_id: '', debito: '', credito: '' }, { cuenta_id: '', debito: '', credito: '' }] };
    abrirAsiento();
  };
  function asientoCtaOpts(sel) { return '<option value="">— Cuenta —</option>' + _cuentas.filter(c => c.activo !== false).map(c => `<option value="${c.id}"${String(sel) === String(c.id) ? ' selected' : ''}>${esc(c.codigo)} — ${esc(c.nombre)}</option>`).join(''); }
  function abrirAsiento() {
    cerrarModal('nxAsForm');
    const ov = document.createElement('div'); ov.id = 'nxAsForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:560px;max-height:92vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-book"></i> Nuevo asiento</span><button class="nxBack" type="button" onclick="document.getElementById('nxAsForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr-row">
          <div class="fr"><label>Fecha</label><input type="date" id="asF" value="${_asEdit.fecha}"></div>
          <div class="fr" style="flex:2"><label>Concepto</label><input id="asC" class="no-upper" value="${esc(_asEdit.concepto)}" placeholder="Ej: Pago de alquiler"></div>
        </div>
        <div id="asLineas" style="overflow-y:auto;flex:1"></div>
        <div style="margin-top:6px"><button class="btn bsm bghost" type="button" onclick="window.nxAsAddLinea()"><i class="ti ti-plus"></i> Agregar línea</button></div>
        <div id="asTot" class="nxAsTot"></div>
        <div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxAsForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxAsGuardar()"><i class="ti ti-device-floppy"></i> Guardar asiento</button></div>
      </div>`;
    document.body.appendChild(ov);
    pintarAsLineas();
  }
  function leerAsLineas() {
    if (!_asEdit) return;
    const wrap = document.getElementById('asLineas'); if (!wrap) return;
    _asEdit.lineas.forEach((l, i) => {
      const cs = wrap.querySelector(`[data-asc="${i}"]`), db = wrap.querySelector(`[data-asd="${i}"]`), cr = wrap.querySelector(`[data-ash="${i}"]`);
      if (cs) l.cuenta_id = cs.value; if (db) l.debito = db.value; if (cr) l.credito = cr.value;
    });
    const f = document.getElementById('asF'), c = document.getElementById('asC');
    if (f) _asEdit.fecha = f.value; if (c) _asEdit.concepto = c.value;
  }
  function pintarAsLineas() {
    const wrap = document.getElementById('asLineas'); if (!wrap || !_asEdit) return;
    wrap.innerHTML = _asEdit.lineas.map((l, i) => `<div class="nxAsRow">
        <select data-asc="${i}" onchange="window.nxAsTotals()">${asientoCtaOpts(l.cuenta_id)}</select>
        <input data-asd="${i}" inputmode="numeric" placeholder="Debe" value="${l.debito || ''}" oninput="window.nxAsTotals()">
        <input data-ash="${i}" inputmode="numeric" placeholder="Haber" value="${l.credito || ''}" oninput="window.nxAsTotals()">
        <button class="nxPosX" type="button" onclick="window.nxAsDelLinea(${i})"><i class="ti ti-x"></i></button>
      </div>`).join('');
    pintarAsTot();
  }
  function pintarAsTot() {
    const el = document.getElementById('asTot'); if (!el || !_asEdit) return;
    let td = 0, th = 0;
    _asEdit.lineas.forEach(l => { td += Number(l.debito || 0); th += Number(l.credito || 0); });
    const ok = Math.round(td) === Math.round(th) && td > 0;
    el.innerHTML = `<div style="display:flex;justify-content:space-between"><span>Debe: <b>${fmt(td)}</b></span><span>Haber: <b>${fmt(th)}</b></span><span style="color:${ok ? '#16a34a' : '#dc2626'};font-weight:800">${ok ? '✓ cuadra' : 'Diferencia ' + fmt(Math.abs(td - th))}</span></div>`;
  }
  window.nxAsTotals = function () { leerAsLineas(); pintarAsTot(); };
  window.nxAsAddLinea = function () { leerAsLineas(); _asEdit.lineas.push({ cuenta_id: '', debito: '', credito: '' }); pintarAsLineas(); };
  window.nxAsDelLinea = function (i) { leerAsLineas(); if (_asEdit.lineas.length <= 2) { _asEdit.lineas[i] = { cuenta_id: '', debito: '', credito: '' }; } else { _asEdit.lineas.splice(i, 1); } pintarAsLineas(); };
  window.nxAsGuardar = async function () {
    leerAsLineas();
    const lineas = _asEdit.lineas.filter(l => l.cuenta_id && (Number(l.debito) > 0 || Number(l.credito) > 0));
    if (lineas.length < 2) { toast('err', 'El asiento necesita al menos 2 líneas'); return; }
    const td = lineas.reduce((s, l) => s + Number(l.debito || 0), 0), th = lineas.reduce((s, l) => s + Number(l.credito || 0), 0);
    if (Math.round(td) !== Math.round(th)) { toast('err', 'No cuadra', 'El Debe debe ser igual al Haber'); return; }
    try {
      const as = await getAPI().post('pos_asientos', { fecha: _asEdit.fecha || isoHoy(), concepto: (_asEdit.concepto || '').trim() || 'Asiento manual', tipo: 'manual' });
      const aid = (as && as[0] && as[0].id); if (!aid) throw new Error('No se creó el asiento');
      const rows = lineas.map(l => { const c = ctaById(l.cuenta_id) || {}; return { asiento_id: aid, cuenta_id: l.cuenta_id, cuenta_codigo: c.codigo || '', cuenta_nombre: c.nombre || '', debito: Math.round(Number(l.debito || 0)), credito: Math.round(Number(l.credito || 0)) }; });
      await getAPI().post('pos_asiento_lineas', rows);
      cerrarModal('nxAsForm'); _asEdit = null; toast('ok', 'Asiento registrado');
      await cargarContabilidad(); const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };

  // ── Asiento automático desde una venta del POS ──
  async function postAsientoVenta(venta, c) {
    try {
      let cu = _cuentas;
      if (!cu || !cu.length) { try { cu = await getAPI().get('pos_cuentas', 'select=id,codigo,nombre') || []; } catch (e) { cu = []; } }
      if (!cu.length) return; // sin plan de cuentas: no se contabiliza
      const byc = {}; cu.forEach(x => byc[x.codigo] = x);
      const ln = (cod, nom, d, h) => { const x = byc[cod]; if (!x || (Math.round(d) === 0 && Math.round(h) === 0)) return null; return { cuenta_id: x.id, cuenta_codigo: cod, cuenta_nombre: x.nombre || nom, debito: Math.round(d), credito: Math.round(h) }; };
      const caja = Number(c.efe || 0) + Number(c.tar || 0) + Number(c.tra || 0) + Number(c.che || 0) + Number(c.nc || 0);
      const lineas = [ln('1101', 'Caja', caja, 0), ln('1103', 'Cuentas por cobrar (clientes)', Number(c.credito || 0), 0), ln('4101', 'Ventas', 0, Number(c.subtotal || 0)), ln('2102', 'ITBIS por pagar', 0, Number(c.itbis || 0))].filter(Boolean);
      if (lineas.length < 2) return;
      const as = await getAPI().post('pos_asientos', { fecha: (String(venta.fecha || '').slice(0, 10)) || isoHoy(), concepto: 'Venta ' + (venta.numero_factura || ('No. ' + (venta.numero || ''))), referencia: venta.numero_factura || String(venta.numero || ''), tipo: 'venta', origen_id: venta.id });
      const aid = (as && as[0] && as[0].id); if (!aid) return;
      await getAPI().post('pos_asiento_lineas', lineas.map(l => Object.assign({ asiento_id: aid }, l)));
    } catch (e) {}
  }
  // Cuentas en memoria (carga perezosa) para los asientos automáticos
  async function ctasMap() {
    let cu = _cuentas;
    if (!cu || !cu.length) { try { cu = await getAPI().get('pos_cuentas', 'select=id,codigo,nombre') || []; } catch (e) { cu = []; } }
    const byc = {}; cu.forEach(x => byc[x.codigo] = x); return byc;
  }
  function lnCta(byc, cod, nomDef, d, h) { const x = byc[cod]; if (!x || (Math.round(d) === 0 && Math.round(h) === 0)) return null; return { cuenta_id: x.id, cuenta_codigo: cod, cuenta_nombre: x.nombre || nomDef, debito: Math.round(d), credito: Math.round(h) }; }
  async function postAsientoConcepto(fecha, concepto, tipo, origenId, lineas, referencia) {
    lineas = lineas.filter(Boolean); if (lineas.length < 2) return;
    try {
      const as = await getAPI().post('pos_asientos', { fecha: (String(fecha || '').slice(0, 10)) || isoHoy(), concepto: concepto, referencia: referencia || null, tipo: tipo, origen_id: origenId || null });
      const aid = (as && as[0] && as[0].id); if (!aid) return;
      await getAPI().post('pos_asiento_lineas', lineas.map(l => Object.assign({ asiento_id: aid }, l)));
    } catch (e) {}
  }
  // Compra: Debe Inventario (+ITBIS adelantado) / Haber Caja o CxP
  async function postAsientoCompra(compra, subtotal, itbis, aCredito) {
    try {
      const byc = await ctasMap(); if (!Object.keys(byc).length) return;
      const monto = Number(subtotal || 0) + Number(itbis || 0);
      const lineas = [lnCta(byc, '1104', 'Inventario de mercancías', Number(subtotal || 0), 0), lnCta(byc, '1105', 'ITBIS pagado (adelantado)', Number(itbis || 0), 0)];
      if (aCredito) lineas.push(lnCta(byc, '2101', 'Cuentas por pagar (proveedores)', 0, monto));
      else lineas.push(lnCta(byc, '1101', 'Caja', 0, monto));
      await postAsientoConcepto(compra.fecha, 'Compra ' + (compra.proveedor_nombre ? 'a ' + compra.proveedor_nombre : ('No. ' + (compra.numero || ''))), 'compra', compra.id, lineas, String(compra.numero || ''));
    } catch (e) {}
  }
  // Abono de cliente (cobro de fiado): Debe Caja/Banco / Haber Cuentas por cobrar
  async function postAsientoAbono(cliNom, monto, metodo, fecha) {
    try {
      const byc = await ctasMap(); if (!Object.keys(byc).length) return;
      const efe = (metodo || 'Efectivo') === 'Efectivo';
      const lineas = [lnCta(byc, efe ? '1101' : '1102', efe ? 'Caja' : 'Banco', Number(monto || 0), 0), lnCta(byc, '1103', 'Cuentas por cobrar (clientes)', 0, Number(monto || 0))];
      await postAsientoConcepto(fecha, 'Abono cliente' + (cliNom ? ' ' + cliNom : ''), 'cobro', null, lineas);
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════════════
  // ── MÓDULO COTIZACIONES / PRESUPUESTOS (POS) ──
  // ════════════════════════════════════════════════════════════════════
  async function cargarCotizaciones() {
    _cotizaciones = await getAPI().get('pos_cotizaciones', 'select=*&order=created_at.desc&limit=300') || [];
  }
  function cotProxNumero() { let mx = 0; (_cotizaciones || []).forEach(c => { const m = String(c.numero || '').match(/(\d+)\s*$/); if (m) { const n = parseInt(m[1], 10); if (n > mx) mx = n; } }); return 'COT-' + String(mx + 1).padStart(4, '0'); }
  function cotTotales(lineas) {
    let total = 0, itbis = 0, descuento = 0;
    (lineas || []).forEach(it => { const imp = lineImporte(it); descuento += lineDescMonto(it); total += imp; if (it.itbis) itbis += imp * 18 / 118; });
    total = Math.round(total); itbis = Math.round(itbis); descuento = Math.round(descuento);
    return { total: total, itbis: itbis, subtotal: total - itbis, descuento: descuento };
  }
  function cotEstadoBadge(e) {
    const m = { vigente: ['#16a34a', '#f0fdf4', 'VIGENTE'], convertida: ['#2563eb', '#eff6ff', 'CONVERTIDA'], vencida: ['#ea580c', '#fff7ed', 'VENCIDA'], anulada: ['#dc2626', '#fef2f2', 'ANULADA'] };
    const x = m[e] || m.vigente; return `<span style="font-size:9px;font-weight:800;color:${x[0]};background:${x[1]};padding:2px 7px;border-radius:6px">${x[2]}</span>`;
  }
  function cotVigente(c) {
    if (c.estado !== 'vigente') return c.estado;
    try { const venc = new Date(String(c.fecha).slice(0, 10) + 'T12:00:00'); venc.setDate(venc.getDate() + Number(c.validez_dias || 15)); if (venc < new Date()) return 'vencida'; } catch (e) {}
    return 'vigente';
  }
  function renderCotizaciones() {
    const filas = _cotizaciones.length ? _cotizaciones.map(c => {
      const est = cotVigente(c);
      return `<tr>
        <td style="font-weight:700;font-family:var(--mono,monospace);font-size:11px">${esc(c.numero || '')}</td>
        <td>${esc(c.cliente_nombre || '—')}<div style="font-size:10px;color:#475569">${fechaDMY(c.fecha)}</div></td>
        <td style="text-align:center">${cotEstadoBadge(est)}</td>
        <td style="text-align:right;font-weight:700">${fmt(c.total)}</td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn bsm bghost" title="Imprimir" onclick="window.nxCotImprimir('${c.id}')"><i class="ti ti-printer"></i></button>
          ${est === 'vigente' || est === 'vencida' ? `<button class="btn bsm bc1" title="Convertir en venta" onclick="window.nxCotConvertir('${c.id}')"><i class="ti ti-arrow-right"></i></button>` : ''}
          <button class="btn bsm bghost" title="Editar" onclick="window.nxCotEditar('${c.id}')"><i class="ti ti-edit"></i></button>
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" style="text-align:center;padding:24px;color:#475569;font-size:12px">Aún no hay cotizaciones. Crea la primera.</td></tr>';
    return `<div style="margin-bottom:10px"><button class="btn bsm bc1" type="button" onclick="window.nxCotNueva()"><i class="ti ti-plus"></i> Nueva cotización</button></div>
      <div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th>No.</th><th>Cliente</th><th style="text-align:center">Estado</th><th style="text-align:right">Total</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }
  window.nxCotNueva = function () { _cotEdit = { id: null, cliente_id: '', cliente_nombre: '', fecha: isoHoy(), validez_dias: 15, notas: '', lineas: [] }; abrirCotizacion(); };
  window.nxCotEditar = async function (id) {
    const c = _cotizaciones.find(x => String(x.id) === String(id)); if (!c) return;
    let items = []; try { items = await getAPI().get('pos_cotizacion_items', 'select=*&cotizacion_id=eq.' + id) || []; } catch (e) {}
    _cotEdit = { id: c.id, cliente_id: c.cliente_id || '', cliente_nombre: c.cliente_nombre || '', fecha: String(c.fecha).slice(0, 10), validez_dias: c.validez_dias || 15, notas: c.notas || '', estado: c.estado, lineas: items.map(it => ({ producto_id: it.producto_id, nombre: it.nombre, precio: Number(it.precio || 0), cantidad: Number(it.cantidad || 1), itbis: it.itbis !== false, desc: 0, descT: 'pct' })) };
    abrirCotizacion();
  };
  function abrirCotizacion() {
    cerrarModal('nxCotForm');
    const cliOpts = '<option value="">— Cliente / consumidor final —</option>' + _clientes.map(c => `<option value="${c.id}"${String(_cotEdit.cliente_id) === String(c.id) ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('');
    const prodList = _prods.map(p => `<option value="${esc(p.nombre)}${p.codigo ? ' [' + esc(p.codigo) + ']' : ''}">`).join('');
    const ov = document.createElement('div'); ov.id = 'nxCotForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:640px;max-height:94vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-clipboard-text"></i> ${_cotEdit.id ? 'Editar' : 'Nueva'} cotización</span><button class="nxBack" type="button" onclick="document.getElementById('nxCotForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr-row">
          <div class="fr" style="flex:2"><label>Cliente</label><select id="cotCli" onchange="window.nxCotSetCli(this.value)">${cliOpts}</select></div>
          <div class="fr"><label>Fecha</label><input type="date" id="cotFecha" value="${_cotEdit.fecha}" onchange="window.nxCotField('fecha',this.value)"></div>
          <div class="fr"><label>Validez (días)</label><input id="cotVal" inputmode="numeric" value="${_cotEdit.validez_dias}" onchange="window.nxCotField('validez_dias',this.value)"></div>
        </div>
        <div class="nxFacAdd" style="margin:4px 0 10px"><i class="ti ti-search"></i><input list="cotProds" id="cotBuscar" placeholder="Escribe un producto y elígelo para agregar..." autocomplete="off" onchange="window.nxCotAdd(this.value)"><datalist id="cotProds">${prodList}</datalist></div>
        <div id="cotTabla" style="overflow-y:auto;flex:1"></div>
        <div id="cotTot" class="nxAsTot"></div>
        <div class="fr"><label>Notas (opcional)</label><input id="cotNotas" class="no-upper" value="${esc(_cotEdit.notas || '')}" placeholder="Condiciones, entrega..." onchange="window.nxCotField('notas',this.value)"></div>
        <div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxCotForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxCotGuardar()"><i class="ti ti-device-floppy"></i> Guardar cotización</button></div>
      </div>`;
    document.body.appendChild(ov);
    pintarCotTabla();
  }
  window.nxCotSetCli = function (id) { _cotEdit.cliente_id = id; const c = _clientes.find(x => String(x.id) === String(id)); _cotEdit.cliente_nombre = c ? c.nombre : ''; };
  window.nxCotField = function (k, v) { _cotEdit[k] = (k === 'validez_dias') ? (parseInt(v, 10) || 15) : v; };
  window.nxCotAdd = function (txt) {
    if (!txt) return;
    const t = String(txt).toLowerCase();
    let p = _prods.find(x => (x.nombre + (x.codigo ? ' [' + x.codigo + ']' : '')).toLowerCase() === t) || _prods.find(x => String(x.nombre).toLowerCase() === t) || _prods.find(x => x.codigo && String(x.codigo).toLowerCase() === t);
    if (!p) { const m = String(txt).match(/\[([^\]]+)\]/); if (m) p = _prods.find(x => x.codigo && String(x.codigo).toLowerCase() === m[1].toLowerCase()); }
    if (!p) { toast('warn', 'Producto no encontrado', 'Elígelo de la lista'); return; }
    const ex = _cotEdit.lineas.find(l => String(l.producto_id) === String(p.id));
    if (ex) ex.cantidad += 1; else _cotEdit.lineas.push({ producto_id: p.id, nombre: p.nombre, precio: Number(p.precio || 0), cantidad: 1, itbis: p.itbis !== false, desc: 0, descT: 'pct' });
    const inp = document.getElementById('cotBuscar'); if (inp) inp.value = '';
    pintarCotTabla();
  };
  window.nxCotLinea = function (i, k, v) { const l = _cotEdit.lineas[i]; if (!l) return; if (k === 'cantidad') l.cantidad = Math.max(1, parseFloat(v) || 1); else if (k === 'precio') l.precio = parseMoney(v); else if (k === 'desc') l.desc = parseFloat(v) || 0; pintarCotTabla(); };
  window.nxCotDel = function (i) { _cotEdit.lineas.splice(i, 1); pintarCotTabla(); };
  function pintarCotTabla() {
    const wrap = document.getElementById('cotTabla'); if (!wrap) return;
    if (!_cotEdit.lineas.length) { wrap.innerHTML = '<div style="text-align:center;color:#475569;font-size:12px;padding:22px">Agrega productos a la cotización.</div>'; const t = document.getElementById('cotTot'); if (t) t.innerHTML = ''; return; }
    const filas = _cotEdit.lineas.map((l, i) => `<tr>
        <td class="nxFacDesc">${esc(l.nombre)}</td>
        <td class="nxFacCant"><input inputmode="numeric" value="${l.cantidad}" onchange="window.nxCotLinea(${i},'cantidad',this.value)"></td>
        <td class="nxFacPre"><input inputmode="numeric" value="${Math.round(l.precio)}" onchange="window.nxCotLinea(${i},'precio',this.value)"></td>
        <td class="nxFacImp">${fmt(lineImporte(l))}</td>
        <td class="nxFacDel"><button onclick="window.nxCotDel(${i})"><i class="ti ti-x"></i></button></td>
      </tr>`).join('');
    wrap.innerHTML = `<div class="nxFacTblWrap"><table class="nxFacTbl" style="min-width:0"><thead><tr><th>Descripción</th><th style="text-align:right">Cant.</th><th style="text-align:right">Precio</th><th style="text-align:right">Importe</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
    const tt = cotTotales(_cotEdit.lineas); const t = document.getElementById('cotTot');
    if (t) t.innerHTML = `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><span>Subtotal: <b>${fmt(tt.subtotal)}</b></span><span>ITBIS: <b>${fmt(tt.itbis)}</b></span><span style="color:#0f172a">TOTAL: <b>${fmt(tt.total)}</b></span></div>`;
  }
  window.nxCotGuardar = async function () {
    if (!_cotEdit.lineas.length) { toast('err', 'Agrega al menos un producto'); return; }
    const tt = cotTotales(_cotEdit.lineas);
    const numero = _cotEdit.numero || cotProxNumero();
    const body = { numero: numero, cliente_id: _cotEdit.cliente_id || null, cliente_nombre: _cotEdit.cliente_nombre || null, fecha: _cotEdit.fecha || isoHoy(), validez_dias: Number(_cotEdit.validez_dias || 15), subtotal: tt.subtotal, itbis: tt.itbis, descuento: tt.descuento, total: tt.total, notas: (_cotEdit.notas || '').trim() || null, created_by_name: nomAdmin() };
    try {
      let cotId = _cotEdit.id;
      if (cotId) { await getAPI().patch('pos_cotizaciones', 'id=eq.' + cotId, body); await getAPI().del('pos_cotizacion_items', 'cotizacion_id=eq.' + cotId); }
      else { const r = await getAPI().post('pos_cotizaciones', body); cotId = (r && r[0] && r[0].id); }
      if (!cotId) throw new Error('No se pudo guardar');
      const items = _cotEdit.lineas.map(l => ({ cotizacion_id: cotId, producto_id: l.producto_id, nombre: l.nombre, precio: Math.round(l.precio), cantidad: l.cantidad, itbis: !!l.itbis, descuento: Math.round(lineDescMonto(l)), importe: Math.round(lineImporte(l)) }));
      await getAPI().post('pos_cotizacion_items', items);
      cerrarModal('nxCotForm'); toast('ok', 'Cotización guardada', numero);
      await cargarCotizaciones(); const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxCotConvertir = async function (id) {
    const c = _cotizaciones.find(x => String(x.id) === String(id)); if (!c) return;
    if (!confirm('¿Convertir esta cotización en venta? Se cargará en la pantalla Factura para cobrarla.')) return;
    let items = []; try { items = await getAPI().get('pos_cotizacion_items', 'select=*&cotizacion_id=eq.' + id) || []; } catch (e) {}
    if (!items.length) { toast('err', 'La cotización no tiene productos'); return; }
    _cart = items.map(it => ({ producto_id: it.producto_id, nombre: it.nombre, precio: Number(it.precio || 0), cantidad: Number(it.cantidad || 1), itbis: it.itbis !== false, desc: 0, descT: 'pct' }));
    _factCli = c.cliente_id || '';
    try { await getAPI().patch('pos_cotizaciones', 'id=eq.' + id, { estado: 'convertida' }); } catch (e) {}
    toast('ok', 'Cotización cargada', 'Completa el cobro en Factura');
    _posTab = 'factura'; const v = document.getElementById('v-pos'); if (v) renderPOS(v);
  };
  window.nxCotImprimir = async function (id) {
    const c = _cotizaciones.find(x => String(x.id) === String(id)); if (!c) return;
    let items = []; try { items = await getAPI().get('pos_cotizacion_items', 'select=*&cotizacion_id=eq.' + id) || []; } catch (e) {}
    const e = empInfo();
    const filas = items.map(it => `<tr><td>${Number(it.cantidad)}</td><td>${esc(it.nombre)}</td><td class="r">${fmt(it.precio)}</td><td class="r">${fmt(it.importe)}</td></tr>`).join('');
    let venc = ''; try { const d = new Date(String(c.fecha).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + Number(c.validez_dias || 15)); venc = fechaDMY(d.toLocaleDateString('en-CA')); } catch (er) {}
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cotización ${esc(c.numero || '')}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:660px;margin:0 auto;padding:22px;font-size:12.5px}h1{font-size:17px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:10px 0}th{text-align:left;font-size:10px;text-transform:uppercase;color:#555;border-bottom:1.5px solid #999;padding:6px}td{padding:5px 6px;border-bottom:1px solid #eee}.r{text-align:right}.line{border-top:1px solid #ccc;margin:8px 0}.tot{margin-left:auto;max-width:280px}.tot td{padding:3px 6px;border:none}.gran{font-weight:800;font-size:15px;border-top:1.5px solid #111!important}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-22px -22px 14px;padding:9px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button><button onclick="window.print()" style="background:#fff;color:#1e3a6e;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="c muted">${e.rnc ? 'RNC: ' + esc(e.rnc) : ''}${e.tel ? ' · ' + esc(e.tel) : ''}${e.dir ? '<br>' + esc(e.dir) : ''}</div>
        <div class="line"></div>
        <div class="c"><b>COTIZACIÓN ${esc(c.numero || '')}</b></div>
        <div class="muted">Fecha: ${fechaDMY(c.fecha)} · Válida hasta: ${venc}<br>Cliente: <b>${esc(c.cliente_nombre || 'Consumidor final')}</b></div>
        <table><thead><tr><th>Cant.</th><th>Descripción</th><th class="r">Precio</th><th class="r">Importe</th></tr></thead><tbody>${filas}</tbody></table>
        <table class="tot"><tr><td>Subtotal</td><td class="r">${fmt(c.subtotal)}</td></tr>${Number(c.descuento) ? `<tr><td>Descuento</td><td class="r">- ${fmt(c.descuento)}</td></tr>` : ''}<tr><td>ITBIS (18%)</td><td class="r">${fmt(c.itbis)}</td></tr><tr class="gran"><td>TOTAL</td><td class="r">${fmt(c.total)}</td></tr></table>
        ${c.notas ? `<div class="muted" style="margin-top:10px"><b>Notas:</b> ${esc(c.notas)}</div>` : ''}
        <div class="muted" style="margin-top:16px">Esta cotización es un presupuesto y no constituye una factura. Precios sujetos a cambio después de la fecha de validez.</div>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  };

  // ════════════════════════════════════════════════════════════════════
  // ── MÓDULO REPORTES (POS) — analítica sobre ventas existentes ──
  // ════════════════════════════════════════════════════════════════════
  async function cargarReportes() {
    if (!_repDesde) _repDesde = isoMesIni();
    if (!_repHasta) _repHasta = isoHoy();
    _repVentas = await getAPI().get('pos_ventas', 'select=*&estado=eq.completada&order=created_at.desc&limit=2000') || [];
    try {
      const its = await getAPI().get('pos_venta_items', 'select=*&limit=20000') || [];
      const byV = {}; its.forEach(it => { (byV[it.venta_id] = byV[it.venta_id] || []).push(it); });
      _repVentas.forEach(v => { v._items = byV[v.id] || []; });
    } catch (e) {}
  }
  function repFecha(v) { return String(v.fecha || v.created_at || '').slice(0, 10); }
  function repItems(v) { return v._items || v.pos_venta_items || []; }
  function prodCosto(pid) { const p = _prods.find(x => String(x.id) === String(pid)); return p ? Number(p.costo || 0) : 0; }
  function ventasRepRango() { return (_repVentas || []).filter(v => { const f = repFecha(v); return (!_repDesde || f >= _repDesde) && (!_repHasta || f <= _repHasta); }); }

  function renderReportes() {
    const list = ventasRepRango();
    let totVta = 0, totItbis = 0, ganancia = 0, costoTot = 0;
    const porDia = {}, porProd = {}, metodos = { Efectivo: 0, Tarjeta: 0, Transferencia: 0, Otro: 0, 'Crédito (fiado)': 0 };
    list.forEach(v => {
      totVta += Number(v.total || 0); totItbis += Number(v.itbis || 0);
      const f = repFecha(v); porDia[f] = (porDia[f] || 0) + Number(v.total || 0);
      metodos.Efectivo += Number(v.pagado_efectivo || 0); metodos.Tarjeta += Number(v.pagado_tarjeta || 0);
      metodos.Transferencia += Number(v.pagado_transferencia || 0); metodos.Otro += Number(v.pagado_otro || 0);
      metodos['Crédito (fiado)'] += Number(v.credito_monto || 0);
      repItems(v).forEach(it => {
        const cant = Number(it.cantidad || 0), imp = Number(it.importe != null ? it.importe : (Number(it.precio || 0) * cant));
        const sinItbis = it.itbis ? imp - (imp * 18 / 118) : imp;
        const cst = prodCosto(it.producto_id) * cant; costoTot += cst; ganancia += sinItbis - cst;
        const key = it.nombre || it.producto_id || '—';
        if (!porProd[key]) porProd[key] = { cant: 0, monto: 0 };
        porProd[key].cant += cant; porProd[key].monto += imp;
      });
    });
    const kpi = (l, v, c) => `<div class="nxCtaKpi"><div class="nxCtaKpiL">${l}</div><div class="nxCtaKpiV" style="color:${c}">${fmt(v)}</div></div>`;
    const dias = Object.keys(porDia).sort().slice(-14);
    const maxDia = Math.max(1, ...dias.map(d => porDia[d]));
    const barras = dias.length ? dias.map(d => { const h = Math.max(3, Math.round(porDia[d] / maxDia * 90)); const dd = d.slice(8) + '/' + d.slice(5, 7); return `<div class="nxRepBar"><div class="nxRepBarV" style="height:${h}px" title="${fmt(porDia[d])}"></div><div class="nxRepBarL">${dd}</div></div>`; }).join('') : '<div style="color:#475569;font-size:12px;padding:20px">Sin ventas en el período.</div>';
    const top = Object.entries(porProd).sort((a, b) => b[1].monto - a[1].monto).slice(0, 10);
    const topFilas = top.length ? top.map(([nom, o], i) => `<tr><td style="color:#475569;width:22px">${i + 1}</td><td style="font-weight:600">${esc(nom)}</td><td style="text-align:right">${o.cant}</td><td style="text-align:right;font-weight:700">${fmt(o.monto)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:18px;color:#475569;font-size:12px">Sin datos</td></tr>';
    const totMet = Object.values(metodos).reduce((a, b) => a + b, 0) || 1;
    const metFilas = Object.entries(metodos).filter(([k, v]) => v > 0).map(([k, v]) => `<div class="nxRepMet"><div class="nxRepMetTop"><span>${esc(k)}</span><b>${fmt(v)}</b></div><div class="nxRepMetBar"><div style="width:${Math.round(v / totMet * 100)}%"></div></div></div>`).join('') || '<div style="color:#475569;font-size:12px">Sin pagos registrados</div>';
    return `<div class="nxCtaRango">
        <div class="nxFacF"><label>Desde</label><input type="date" value="${_repDesde}" onchange="window.nxRepRango('d',this.value)"></div>
        <div class="nxFacF"><label>Hasta</label><input type="date" value="${_repHasta}" onchange="window.nxRepRango('h',this.value)"></div>
        <div style="font-size:11px;color:#475569;align-self:end;padding-bottom:11px">${list.length} venta(s)</div>
        <div style="margin-left:auto;display:flex;gap:6px;align-self:end">
          ${_vendedores.length ? `<button class="btn bsm bghost" type="button" onclick="window.nxRepComisiones()"><i class="ti ti-user-dollar"></i> Comisiones</button>` : ''}
          <button class="btn bsm bghost" type="button" onclick="window.nxRep607()"><i class="ti ti-file-certificate"></i> Reporte 607 (NCF)</button>
        </div>
      </div>
      <div class="nxCtaKpis">
        ${kpi('Ventas (total)', totVta, '#2563eb')}
        ${kpi('Ganancia estimada', ganancia, ganancia >= 0 ? '#16a34a' : '#dc2626')}
        ${kpi('Costo de lo vendido', costoTot, '#ea580c')}
        ${kpi('ITBIS cobrado', totItbis, '#7c3aed')}
        <div class="nxCtaKpi"><div class="nxCtaKpiL">No. de ventas</div><div class="nxCtaKpiV" style="color:#0f172a">${list.length}</div></div>
        ${kpi('Ticket promedio', list.length ? Math.round(totVta / list.length) : 0, '#0891b2')}
      </div>
      <div class="nxRepGrid">
        <div class="nxRepCard"><div class="nxRepTit"><i class="ti ti-chart-bar"></i> Ventas por día (últimos ${dias.length})</div><div class="nxRepBars">${barras}</div></div>
        <div class="nxRepCard"><div class="nxRepTit"><i class="ti ti-wallet"></i> Por método de pago</div>${metFilas}</div>
      </div>
      <div class="nxRepCard" style="margin-top:12px"><div class="nxRepTit"><i class="ti ti-trophy"></i> Productos más vendidos</div>
        <div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th></th><th>Producto</th><th style="text-align:right">Cant.</th><th style="text-align:right">Monto</th></tr></thead><tbody>${topFilas}</tbody></table></div>
      </div>`;
  }
  window.nxRepRango = function (k, val) { if (k === 'd') _repDesde = val; else _repHasta = val; const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxRepComisiones = function () {
    const list = ventasRepRango();
    const acc = {};
    _vendedores.forEach(v => { acc[v.id] = { nombre: v.nombre, pct: Number(v.comision_pct || 0), ventas: 0, monto: 0 }; });
    list.forEach(v => { if (v.vendedor_id && acc[v.vendedor_id]) { acc[v.vendedor_id].ventas += 1; acc[v.vendedor_id].monto += Number(v.total || 0); } });
    const e = empInfo();
    let tM = 0, tC = 0;
    const filas = Object.values(acc).filter(o => o.ventas > 0).map(o => { const com = o.monto * o.pct / 100; tM += o.monto; tC += com; return `<tr><td>${esc(o.nombre)}</td><td class="r">${o.ventas}</td><td class="r">${fmt(o.monto)}</td><td class="r">${o.pct}%</td><td class="r">${fmt(com)}</td></tr>`; }).join('') || '<tr><td colspan="5" style="text-align:center;color:#777;padding:14px">No hay ventas con vendedor asignado en el período.</td></tr>';
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comisiones</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:620px;margin:0 auto;padding:20px;font-size:12.5px}h1{font-size:16px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:10px 0}th{text-align:left;font-size:10px;text-transform:uppercase;color:#555;border-bottom:1.5px solid #999;padding:6px}td{padding:5px 6px;border-bottom:1px solid #eee}.r{text-align:right}.tot td{font-weight:800;border-top:1.5px solid #999}.line{border-top:1px solid #ccc;margin:8px 0}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-20px -20px 14px;padding:9px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button><button onclick="window.print()" style="background:#fff;color:#1e3a6e;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="line"></div>
        <div class="c"><b>REPORTE DE COMISIONES</b></div>
        <div class="c muted">Del ${fechaDMY(_repDesde)} al ${fechaDMY(_repHasta)}</div>
        <table><thead><tr><th>Vendedor</th><th class="r">Ventas</th><th class="r">Monto</th><th class="r">%</th><th class="r">Comisión</th></tr></thead><tbody>${filas}<tr class="tot"><td>TOTALES</td><td class="r"></td><td class="r">${fmt(tM)}</td><td class="r"></td><td class="r">${fmt(tC)}</td></tr></tbody></table>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  };
  window.nxRep607 = function () {
    const list = ventasRepRango().filter(v => v.ncf);
    const e = empInfo();
    let mSin = 0, mItb = 0, mTot = 0;
    const filas = list.map(v => {
      const total = Number(v.total || 0), itbis = Number(v.itbis || 0), sin = total - itbis;
      mSin += sin; mItb += itbis; mTot += total;
      return `<tr><td>${esc(v.ncf)}</td><td>${fechaDMY(v.fecha || v.created_at)}</td><td>${esc(v.cliente_nombre || 'Consumidor final')}</td><td class="r">${fmt(sin)}</td><td class="r">${fmt(itbis)}</td><td class="r">${fmt(total)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" style="text-align:center;color:#777;padding:14px">No hay ventas con NCF en el período.</td></tr>';
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reporte 607 (NCF)</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:760px;margin:0 auto;padding:20px;font-size:12px}h1{font-size:16px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:10px 0}th{text-align:left;font-size:9.5px;text-transform:uppercase;color:#555;border-bottom:1.5px solid #999;padding:5px}td{padding:4px 5px;border-bottom:1px solid #eee}.r{text-align:right}.tot td{font-weight:800;border-top:1.5px solid #999}.line{border-top:1px solid #ccc;margin:8px 0}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-20px -20px 14px;padding:9px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button><button onclick="window.print()" style="background:#fff;color:#1e3a6e;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">🖨️ Imprimir</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="c muted">${e.rnc ? 'RNC: ' + esc(e.rnc) : ''}</div>
        <div class="line"></div>
        <div class="c"><b>REPORTE 607 — VENTAS CON COMPROBANTE FISCAL (NCF)</b></div>
        <div class="c muted">Del ${fechaDMY(_repDesde)} al ${fechaDMY(_repHasta)} · ${list.length} comprobante(s)</div>
        <table><thead><tr><th>NCF</th><th>Fecha</th><th>Cliente</th><th class="r">Monto sin ITBIS</th><th class="r">ITBIS</th><th class="r">Total</th></tr></thead><tbody>${filas}<tr class="tot"><td colspan="3" class="r">TOTALES</td><td class="r">${fmt(mSin)}</td><td class="r">${fmt(mItb)}</td><td class="r">${fmt(mTot)}</td></tr></tbody></table>
        <div class="muted" style="margin-top:14px">Base para el formato 607 de la DGII. Verifica los datos del cliente (RNC/Cédula) antes de declarar.</div>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  };

  // ════════════════════════════════════════════════════════════════════
  // ── MÓDULO RECURSOS HUMANOS / NÓMINA (POS / multiempresa, RD) ──
  // Empleados + generación de nómina con deducciones de ley (SFS/AFP/ISR),
  // recibo de pago imprimible y asiento contable automático.
  // ════════════════════════════════════════════════════════════════════
  const SFS_PCT = 0.0304, AFP_PCT = 0.0287; // aportes del empleado (TSS RD)
  // Escala ISR anual DGII (RD$)
  function isrAnual(base) {
    if (base <= 416220) return 0;
    if (base <= 624329) return (base - 416220) * 0.15;
    if (base <= 867123) return 31216 + (base - 624329) * 0.20;
    return 79776 + (base - 867123) * 0.25;
  }
  // Deducciones mensuales de un salario bruto mensual (RD)
  function calcDeducciones(salario) {
    const s = Number(salario || 0);
    const sfs = s * SFS_PCT, afp = s * AFP_PCT;
    const baseAnual = (s - sfs - afp) * 12;
    const isr = isrAnual(baseAnual) / 12;
    return { sfs: Math.round(sfs), afp: Math.round(afp), isr: Math.round(isr) };
  }
  async function cargarRRHH() {
    _empleados = await getAPI().get('rrhh_empleados', 'select=*&order=nombre.asc') || [];
    _nominas = await getAPI().get('rrhh_nominas', 'select=*&order=fecha.desc,created_at.desc&limit=200') || [];
  }
  function empById(id) { return _empleados.find(x => String(x.id) === String(id)); }

  function renderRRHH() {
    const sub = (k, lbl, ic) => `<button type="button" class="nxFacSubTab${_rhTab === k ? ' on' : ''}" onclick="window.nxRhTab('${k}')"><i class="ti ${ic}"></i> ${lbl}</button>`;
    const tabs = `<div class="nxFacSubTabs">${sub('empleados', 'Empleados', 'ti-id-badge-2')}${sub('nominas', 'Nóminas', 'ti-receipt-2')}</div>`;
    return tabs + (_rhTab === 'nominas' ? rhNominas() : rhEmpleados());
  }

  function rhEmpleados() {
    const activos = _empleados.filter(e => e.activo !== false);
    const nomMensual = activos.reduce((s, e) => s + Number(e.salario || 0), 0);
    const filas = _empleados.length ? _empleados.map(e => `<tr${e.activo === false ? ' style="opacity:.5"' : ''}>
        <td><div style="font-weight:700;font-size:12.5px">${esc(e.nombre || '')}</div><div style="font-size:10px;color:#475569">${esc(e.puesto || '')}${e.departamento ? ' · ' + esc(e.departamento) : ''}${e.cedula ? ' · ' + esc(e.cedula) : ''}</div></td>
        <td style="text-align:right;font-weight:700">${fmt(e.salario)}</td>
        <td style="text-align:center;font-size:10.5px;color:#475569">${esc(({ mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal', por_hora: 'Por hora' })[e.tipo_pago] || e.tipo_pago || '')}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn bsm bc1" onclick="window.nxRhEditEmp('${e.id}')"><i class="ti ti-edit"></i></button></td>
      </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;padding:24px;color:#475569;font-size:12px">Sin empleados. Toca "Nuevo empleado".</td></tr>';
    return `<div class="nxCtaKpis" style="margin-bottom:12px">
        <div class="nxCtaKpi"><div class="nxCtaKpiL">Empleados activos</div><div class="nxCtaKpiV" style="color:#2563eb">${activos.length}</div></div>
        <div class="nxCtaKpi"><div class="nxCtaKpiL">Nómina mensual (bruto)</div><div class="nxCtaKpiV" style="color:#7c3aed">${fmt(nomMensual)}</div></div>
      </div>
      <div style="margin-bottom:10px"><button class="btn bsm bc1" type="button" onclick="window.nxRhNuevoEmp()"><i class="ti ti-plus"></i> Nuevo empleado</button></div>
      <div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th>Empleado</th><th style="text-align:right">Salario</th><th style="text-align:center">Pago</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }

  function rhNominas() {
    if (_nominaSel) return rhNominaDetalle(_nominaSel);
    const filas = _nominas.length ? _nominas.map(n => {
      const est = n.estado === 'pagada' ? '<span style="font-size:9px;font-weight:800;color:#16a34a;background:#f0fdf4;padding:2px 7px;border-radius:6px">PAGADA</span>' : n.estado === 'anulada' ? '<span style="font-size:9px;font-weight:800;color:#dc2626;background:#fef2f2;padding:2px 7px;border-radius:6px">ANULADA</span>' : '<span style="font-size:9px;font-weight:800;color:#ea580c;background:#fff7ed;padding:2px 7px;border-radius:6px">BORRADOR</span>';
      return `<tr style="cursor:pointer" onclick="window.nxRhVerNomina('${n.id}')">
        <td><div style="font-weight:700;font-size:12.5px">${esc(n.periodo || n.descripcion || 'Nómina')}</div><div style="font-size:10px;color:#475569">${fechaDMY(n.fecha)} · ${esc(({ mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal' })[n.tipo] || n.tipo || '')}</div></td>
        <td style="text-align:center">${est}</td>
        <td style="text-align:right;font-weight:700">${fmt(n.total_neto)}</td>
        <td style="text-align:right"><i class="ti ti-chevron-right" style="color:#cbd5e1"></i></td>
      </tr>`;
    }).join('') : '<tr><td colspan="4" style="text-align:center;padding:24px;color:#475569;font-size:12px">Aún no has generado nóminas.</td></tr>';
    return `<div style="margin-bottom:10px"><button class="btn bsm bc1" type="button" onclick="window.nxRhGenerar()"><i class="ti ti-calculator"></i> Generar nómina</button></div>
      <div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th>Período</th><th style="text-align:center">Estado</th><th style="text-align:right">Neto</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }

  function rhNominaDetalle(n) {
    const ls = n._lineas || [];
    const filas = ls.map(l => `<tr>
        <td style="font-weight:600">${esc(l.empleado_nombre || '')}</td>
        <td style="text-align:right">${fmt(l.salario_bruto)}</td>
        <td style="text-align:right">${Number(l.bonos) ? fmt(l.bonos) : '—'}</td>
        <td style="text-align:right;color:#dc2626">${fmt(Number(l.sfs) + Number(l.afp) + Number(l.isr) + Number(l.otras_deducciones))}</td>
        <td style="text-align:right;font-weight:800">${fmt(l.neto)}</td>
        <td style="text-align:right"><button class="btn bsm bghost" onclick="window.nxRhRecibo('${n.id}','${l.empleado_id || ''}')"><i class="ti ti-printer"></i></button></td>
      </tr>`).join('');
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn bsm bghost" type="button" onclick="window.nxRhVolver()"><i class="ti ti-arrow-left"></i> Volver</button>
        <div style="font-weight:800;font-size:14px;color:#1e293b">${esc(n.periodo || 'Nómina')}</div>
        <span style="font-size:11px;color:#475569">${fechaDMY(n.fecha)}</span>
        ${n.estado !== 'anulada' ? `<button class="btn bsm bc3" style="margin-left:auto" type="button" onclick="window.nxRhAnularNomina('${n.id}')"><i class="ti ti-ban"></i> Anular</button>` : '<span style="margin-left:auto;font-size:11px;font-weight:800;color:#dc2626">ANULADA</span>'}
      </div>
      <div class="nxCtaKpis" style="margin-bottom:12px">
        <div class="nxCtaKpi"><div class="nxCtaKpiL">Total bruto</div><div class="nxCtaKpiV" style="color:#2563eb">${fmt(n.total_bruto)}</div></div>
        <div class="nxCtaKpi"><div class="nxCtaKpiL">Deducciones</div><div class="nxCtaKpiV" style="color:#dc2626">${fmt(n.total_deducciones)}</div></div>
        <div class="nxCtaKpi"><div class="nxCtaKpiL">Neto a pagar</div><div class="nxCtaKpiV" style="color:#16a34a">${fmt(n.total_neto)}</div></div>
      </div>
      <div class="tw" style="font-size:12px"><table style="width:100%"><thead><tr><th>Empleado</th><th style="text-align:right">Bruto</th><th style="text-align:right">Bonos</th><th style="text-align:right">Deducc.</th><th style="text-align:right">Neto</th><th></th></tr></thead><tbody>${filas}</tbody></table></div>`;
  }

  // ── Acciones RRHH ──
  window.nxRhTab = function (t) { _rhTab = t; _nominaSel = null; const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxRhVolver = function () { _nominaSel = null; const v = document.getElementById('v-pos'); if (v) renderPOS(v); };
  window.nxRhNuevoEmp = function () { abrirEmpleado(null); };
  window.nxRhEditEmp = function (id) { const e = empById(id); if (e) abrirEmpleado(e); };
  function abrirEmpleado(e) {
    cerrarModal('nxEmpForm');
    const d = e || {};
    const tp = t => `<option value="${t[0]}"${d.tipo_pago === t[0] ? ' selected' : ''}>${t[1]}</option>`;
    const tipos = [['mensual', 'Mensual'], ['quincenal', 'Quincenal'], ['semanal', 'Semanal'], ['por_hora', 'Por hora']].map(tp).join('');
    const ov = document.createElement('div'); ov.id = 'nxEmpForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:440px;max-height:92vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-id-badge-2"></i> ${e ? 'Editar empleado' : 'Nuevo empleado'}</span><button class="nxBack" type="button" onclick="document.getElementById('nxEmpForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div style="overflow-y:auto;flex:1">
          <div class="fr"><label>Nombre completo *</label><input id="emN" class="no-upper" value="${esc(d.nombre || '')}" placeholder="Nombre y apellido"></div>
          <div class="fr-row">
            <div class="fr"><label>Cédula</label><input id="emC" class="no-upper" value="${esc(d.cedula || '')}" placeholder="000-0000000-0"></div>
            <div class="fr"><label>Teléfono</label><input id="emT" class="no-upper" value="${esc(d.telefono || '')}" placeholder="809-..."></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Puesto</label><input id="emP" class="no-upper" value="${esc(d.puesto || '')}" placeholder="Ej: Cajero"></div>
            <div class="fr"><label>Departamento</label><input id="emD" class="no-upper" value="${esc(d.departamento || '')}" placeholder="Ej: Ventas"></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Salario bruto *</label><input id="emS" data-nx-money inputmode="numeric" value="${d.salario ? Math.round(d.salario) : ''}" placeholder="0"></div>
            <div class="fr"><label>Tipo de pago</label><select id="emTp">${tipos}</select></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Fecha de ingreso</label><input type="date" id="emF" value="${esc((d.fecha_ingreso || '').slice(0, 10))}"></div>
            <div class="fr"><label>No. TSS (NSS)</label><input id="emNss" class="no-upper" value="${esc(d.tss || '')}" placeholder="Opcional"></div>
          </div>
          <div class="fr-row">
            <div class="fr"><label>Banco</label><input id="emB" class="no-upper" value="${esc(d.banco || '')}" placeholder="Opcional"></div>
            <div class="fr"><label>Cuenta banco</label><input id="emCb" class="no-upper" value="${esc(d.cuenta_banco || '')}" placeholder="Opcional"></div>
          </div>
          <div class="fr"><label>Activo</label><select id="emA"><option value="1"${d.activo !== false ? ' selected' : ''}>Sí (activo)</option><option value="0"${d.activo === false ? ' selected' : ''}>No (inactivo)</option></select></div>
        </div>
        <div class="fe" style="margin-top:8px;gap:8px">
          ${e ? `<button class="btn bc3 bsm" type="button" onclick="window.nxRhDelEmp('${e.id}')" style="margin-right:auto"><i class="ti ti-trash"></i></button>` : ''}
          <button class="btn bghost" type="button" onclick="document.getElementById('nxEmpForm').remove()">Cancelar</button>
          <button class="btn bc1" type="button" onclick="window.nxRhGuardarEmp('${e ? e.id : ''}')"><i class="ti ti-device-floppy"></i> Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    scanMoney(ov);
  }
  window.nxRhGuardarEmp = async function (id) {
    const body = {
      nombre: (val('emN') || '').trim(), cedula: (val('emC') || '').trim() || null, telefono: (val('emT') || '').trim() || null,
      puesto: (val('emP') || '').trim() || null, departamento: (val('emD') || '').trim() || null,
      salario: parseMoney(val('emS')), tipo_pago: val('emTp'), fecha_ingreso: val('emF') || null,
      tss: (val('emNss') || '').trim() || null, banco: (val('emB') || '').trim() || null, cuenta_banco: (val('emCb') || '').trim() || null,
      activo: val('emA') === '1'
    };
    if (!body.nombre) { toast('err', 'Falta el nombre'); return; }
    try {
      if (id) await getAPI().patch('rrhh_empleados', 'id=eq.' + id, body); else await getAPI().post('rrhh_empleados', body);
      cerrarModal('nxEmpForm'); toast('ok', 'Empleado guardado');
      await cargarRRHH(); const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo guardar', String(e && e.message || e)); }
  };
  window.nxRhDelEmp = async function (id) {
    if (!confirm('¿Eliminar este empleado? (mejor márcalo como inactivo si ya tuvo nómina)')) return;
    try { await getAPI().del('rrhh_empleados', 'id=eq.' + id); cerrarModal('nxEmpForm'); toast('ok', 'Empleado eliminado'); await cargarRRHH(); const v = document.getElementById('v-pos'); if (v) renderPOS(v); }
    catch (e) { toast('err', 'No se pudo eliminar', 'Si ya tiene nómina, márcalo inactivo'); }
  };

  // ── Generar nómina ──
  window.nxRhGenerar = function () {
    const activos = _empleados.filter(e => e.activo !== false);
    if (!activos.length) { toast('err', 'No hay empleados activos', 'Agrega empleados primero'); return; }
    const d = new Date();
    _nomEdit = {
      periodo: d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }),
      fecha: isoHoy(), tipo: 'mensual',
      lineas: activos.map(e => { const ded = calcDeducciones(e.salario); return { empleado_id: e.id, empleado_nombre: e.nombre, salario_bruto: Number(e.salario || 0), bonos: 0, otras_deducciones: 0, sfs: ded.sfs, afp: ded.afp, isr: ded.isr }; })
    };
    abrirNomina();
  }
  function nomLineaNeto(l) { return Number(l.salario_bruto || 0) + Number(l.bonos || 0) - Number(l.sfs || 0) - Number(l.afp || 0) - Number(l.isr || 0) - Number(l.otras_deducciones || 0); }
  function abrirNomina() {
    cerrarModal('nxNomForm');
    const ov = document.createElement('div'); ov.id = 'nxNomForm'; ov.className = 'overlay open';
    ov.addEventListener('click', ev => { if (ev.target === ov) ov.remove(); });
    ov.innerHTML = `<div class="modal" style="max-width:680px;max-height:94vh;display:flex;flex-direction:column">
        <div class="mt"><span><i class="ti ti-calculator"></i> Generar nómina</span><button class="nxBack" type="button" onclick="document.getElementById('nxNomForm').remove()"><i class="ti ti-arrow-left"></i> Volver</button></div>
        <div class="fr-row">
          <div class="fr" style="flex:2"><label>Período</label><input id="nmP" class="no-upper" value="${esc(_nomEdit.periodo)}" placeholder="Ej: Junio 2026"></div>
          <div class="fr"><label>Fecha</label><input type="date" id="nmF" value="${_nomEdit.fecha}"></div>
          <div class="fr"><label>Tipo</label><select id="nmT"><option value="mensual"${_nomEdit.tipo === 'mensual' ? ' selected' : ''}>Mensual</option><option value="quincenal"${_nomEdit.tipo === 'quincenal' ? ' selected' : ''}>Quincenal</option><option value="semanal"${_nomEdit.tipo === 'semanal' ? ' selected' : ''}>Semanal</option></select></div>
        </div>
        <div style="font-size:10.5px;color:#475569;margin:2px 2px 8px">Deducciones automáticas RD: SFS 3.04% · AFP 2.87% · ISR escala DGII. Puedes editar bonos y otras deducciones.</div>
        <div id="nmLineas" style="overflow-y:auto;flex:1"></div>
        <div id="nmTot" class="nxAsTot"></div>
        <div class="fe" style="margin-top:8px;gap:8px"><button class="btn bghost" type="button" onclick="document.getElementById('nxNomForm').remove()">Cancelar</button><button class="btn bc1" type="button" onclick="window.nxRhGuardarNomina()"><i class="ti ti-device-floppy"></i> Guardar nómina</button></div>
      </div>`;
    document.body.appendChild(ov);
    pintarNomLineas();
  }
  function leerNomLineas() {
    if (!_nomEdit) return;
    const wrap = document.getElementById('nmLineas'); if (!wrap) return;
    _nomEdit.lineas.forEach((l, i) => {
      const b = wrap.querySelector(`[data-nmb="${i}"]`), o = wrap.querySelector(`[data-nmo="${i}"]`);
      if (b) l.bonos = Number(parseMoney(b.value) || 0); if (o) l.otras_deducciones = Number(parseMoney(o.value) || 0);
    });
    const p = document.getElementById('nmP'), f = document.getElementById('nmF'), t = document.getElementById('nmT');
    if (p) _nomEdit.periodo = p.value; if (f) _nomEdit.fecha = f.value; if (t) _nomEdit.tipo = t.value;
  }
  function pintarNomLineas() {
    const wrap = document.getElementById('nmLineas'); if (!wrap || !_nomEdit) return;
    wrap.innerHTML = _nomEdit.lineas.map((l, i) => `<div class="nxNomRow">
        <div class="nxNomEmp"><div style="font-weight:700;font-size:12px">${esc(l.empleado_nombre)}</div><div style="font-size:10px;color:#475569">Bruto ${fmt(l.salario_bruto)} · Ded. ${fmt(Number(l.sfs) + Number(l.afp) + Number(l.isr))}</div></div>
        <label class="nxNomF"><span>Bonos</span><input data-nmb="${i}" data-nx-money inputmode="numeric" value="${l.bonos || ''}" placeholder="0" oninput="window.nxNomTotals()"></label>
        <label class="nxNomF"><span>Otras ded.</span><input data-nmo="${i}" data-nx-money inputmode="numeric" value="${l.otras_deducciones || ''}" placeholder="0" oninput="window.nxNomTotals()"></label>
        <div class="nxNomNeto"><span>Neto</span><b data-nmn="${i}">${fmt(nomLineaNeto(l))}</b></div>
      </div>`).join('');
    try { scanMoney(wrap); } catch (e) {}
    pintarNomTot();
  }
  function pintarNomTot() {
    const el = document.getElementById('nmTot'); if (!el || !_nomEdit) return;
    let bruto = 0, ded = 0, neto = 0;
    _nomEdit.lineas.forEach((l, i) => { bruto += Number(l.salario_bruto || 0) + Number(l.bonos || 0); ded += Number(l.sfs || 0) + Number(l.afp || 0) + Number(l.isr || 0) + Number(l.otras_deducciones || 0); neto += nomLineaNeto(l); const nb = document.querySelector(`[data-nmn="${i}"]`); if (nb) nb.textContent = fmt(nomLineaNeto(l)); });
    el.innerHTML = `<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><span>Bruto: <b>${fmt(bruto)}</b></span><span style="color:#dc2626">Deducciones: <b>${fmt(ded)}</b></span><span style="color:#16a34a">Neto a pagar: <b>${fmt(neto)}</b></span></div>`;
  }
  window.nxNomTotals = function () { leerNomLineas(); pintarNomTot(); };
  window.nxRhGuardarNomina = async function () {
    leerNomLineas();
    if (!_nomEdit.lineas.length) { toast('err', 'Sin empleados en la nómina'); return; }
    let bruto = 0, ded = 0, neto = 0;
    _nomEdit.lineas.forEach(l => { bruto += Number(l.salario_bruto || 0) + Number(l.bonos || 0); ded += Number(l.sfs || 0) + Number(l.afp || 0) + Number(l.isr || 0) + Number(l.otras_deducciones || 0); neto += nomLineaNeto(l); });
    try {
      const nm = await getAPI().post('rrhh_nominas', { periodo: (_nomEdit.periodo || '').trim() || 'Nómina', fecha: _nomEdit.fecha || isoHoy(), tipo: _nomEdit.tipo, total_bruto: Math.round(bruto), total_deducciones: Math.round(ded), total_neto: Math.round(neto), estado: 'pagada' });
      const nid = (nm && nm[0] && nm[0].id); if (!nid) throw new Error('No se creó la nómina');
      const rows = _nomEdit.lineas.map(l => ({ nomina_id: nid, empleado_id: l.empleado_id, empleado_nombre: l.empleado_nombre, salario_bruto: Math.round(l.salario_bruto || 0), bonos: Math.round(l.bonos || 0), sfs: Math.round(l.sfs || 0), afp: Math.round(l.afp || 0), isr: Math.round(l.isr || 0), otras_deducciones: Math.round(l.otras_deducciones || 0), neto: Math.round(nomLineaNeto(l)) }));
      await getAPI().post('rrhh_nomina_lineas', rows);
      try { postAsientoNomina(nm[0], Math.round(bruto), Math.round(ded), Math.round(neto)); } catch (e) {}
      cerrarModal('nxNomForm'); _nomEdit = null; toast('ok', 'Nómina generada', fmt(neto) + ' neto');
      await cargarRRHH(); const v = document.getElementById('v-pos'); if (v) renderPOS(v);
    } catch (e) { toast('err', 'No se pudo generar', String(e && e.message || e)); }
  };
  window.nxRhVerNomina = async function (id) {
    const n = _nominas.find(x => String(x.id) === String(id)); if (!n) return;
    try { n._lineas = await getAPI().get('rrhh_nomina_lineas', 'select=*&nomina_id=eq.' + id) || []; } catch (e) { n._lineas = []; }
    _nominaSel = n; const v = document.getElementById('v-pos'); if (v) renderPOS(v);
  };
  window.nxRhAnularNomina = async function (id) {
    if (!confirm('¿Anular esta nómina?')) return;
    try { await getAPI().patch('rrhh_nominas', 'id=eq.' + id, { estado: 'anulada' }); toast('ok', 'Nómina anulada'); _nominaSel = null; await cargarRRHH(); const v = document.getElementById('v-pos'); if (v) renderPOS(v); }
    catch (e) { toast('err', 'No se pudo anular', String(e && e.message || e)); }
  };

  // Asiento contable de la nómina (si existe plan de cuentas)
  async function postAsientoNomina(nomina, bruto, ded, neto) {
    try {
      let cu = _cuentas;
      if (!cu || !cu.length) { try { cu = await getAPI().get('pos_cuentas', 'select=id,codigo,nombre') || []; } catch (e) { cu = []; } }
      if (!cu.length) return;
      const byc = {}; cu.forEach(x => byc[x.codigo] = x);
      const ln = (cod, d, h) => { const x = byc[cod]; if (!x || (Math.round(d) === 0 && Math.round(h) === 0)) return null; return { cuenta_id: x.id, cuenta_codigo: cod, cuenta_nombre: x.nombre, debito: Math.round(d), credito: Math.round(h) }; };
      const lineas = [ln('6101', bruto, 0), ln('2104', 0, ded), ln('2103', 0, neto)].filter(Boolean);
      if (lineas.length < 2) return;
      const as = await getAPI().post('pos_asientos', { fecha: (String(nomina.fecha || '').slice(0, 10)) || isoHoy(), concepto: 'Nómina ' + (nomina.periodo || ''), referencia: nomina.periodo || '', tipo: 'nomina', origen_id: nomina.id });
      const aid = (as && as[0] && as[0].id); if (!aid) return;
      await getAPI().post('pos_asiento_lineas', lineas.map(l => Object.assign({ asiento_id: aid }, l)));
    } catch (e) {}
  }

  // ── Recibo de pago imprimible ──
  window.nxRhRecibo = function (nominaId, empId) {
    const n = (_nominaSel && String(_nominaSel.id) === String(nominaId)) ? _nominaSel : _nominas.find(x => String(x.id) === String(nominaId));
    if (!n || !n._lineas) { toast('err', 'Abre la nómina primero'); return; }
    const l = n._lineas.find(x => String(x.empleado_id) === String(empId)); if (!l) return;
    const e = empInfo();
    const totDed = Number(l.sfs) + Number(l.afp) + Number(l.isr) + Number(l.otras_deducciones);
    const fila = (lbl, v, neg) => `<tr><td>${lbl}</td><td style="text-align:right">${neg ? '- ' : ''}${fmt(v)}</td></tr>`;
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recibo de pago — ${esc(l.empleado_nombre)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:460px;margin:0 auto;padding:18px;font-size:13px}h1{font-size:17px;text-align:center;margin:0}.c{text-align:center}.muted{color:#555;font-size:11px}table{width:100%;border-collapse:collapse;margin:6px 0}td{padding:4px 0}.line{border-top:1px solid #ccc;margin:8px 0}.tot{font-weight:800;font-size:15px}.sec{font-weight:800;font-size:11px;color:#555;text-transform:uppercase;letter-spacing:.4px;margin-top:8px}.box{border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-top:10px}@media print{.noprint{display:none}body{padding:0}}</style></head>
      <body>
        <div class="noprint" style="position:sticky;top:0;display:flex;gap:8px;background:#1e3a6e;margin:-18px -18px 12px;padding:9px 14px"><button onclick="window.close()" style="background:rgba(255,255,255,.16);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">✕ Cerrar</button></div>
        <h1>${esc(e.nom)}</h1>
        <div class="c muted">${e.rnc ? 'RNC: ' + esc(e.rnc) : ''}${e.tel ? ' · ' + esc(e.tel) : ''}</div>
        <div class="line"></div>
        <div class="c"><b>RECIBO DE PAGO DE NÓMINA</b></div>
        <div class="c muted">${esc(n.periodo || '')} · ${fechaDMY(n.fecha)}</div>
        <div class="box">
          <table><tr><td><b>Empleado</b></td><td style="text-align:right">${esc(l.empleado_nombre)}</td></tr></table>
          <div class="sec">Ingresos</div>
          <table>${fila('Salario', l.salario_bruto)}${Number(l.bonos) ? fila('Bonos', l.bonos) : ''}</table>
          <div class="sec">Deducciones</div>
          <table>${fila('SFS (Seguro Familiar Salud)', l.sfs, true)}${fila('AFP (Pensión)', l.afp, true)}${Number(l.isr) ? fila('ISR', l.isr, true) : ''}${Number(l.otras_deducciones) ? fila('Otras deducciones', l.otras_deducciones, true) : ''}</table>
          <div class="line"></div>
          <table><tr><td>Total deducciones</td><td style="text-align:right">- ${fmt(totDed)}</td></tr><tr class="tot"><td>NETO A PAGAR</td><td style="text-align:right">${fmt(l.neto)}</td></tr></table>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:34px;font-size:12px">
          <div style="text-align:center;width:45%;border-top:1px solid #999;padding-top:4px">Recibí conforme</div>
          <div style="text-align:center;width:45%;border-top:1px solid #999;padding-top:4px">Pagado por</div>
        </div>
        <button class="noprint" onclick="window.print()" style="width:100%;padding:12px;margin-top:18px;background:#1e3a6e;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
      </body></html>`;
    try { const w = window.open('', '_blank'); if (!w) { toast('warn', 'Permite las ventanas emergentes para ver el recibo'); return; } w.document.write(html); w.document.close(); } catch (er) {}
  };

  // ── CSS + registro en el hub ──
  function inyectarCSS() {
    if (document.getElementById('nxPosCSS')) return;
    const st = document.createElement('style'); st.id = 'nxPosCSS';
    st.textContent = '.nxPosTabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.nxPosTab{display:inline-flex;align-items:center;gap:5px;background:#fff;border:1.5px solid #e2e8f0;color:#475569;border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}.nxPosTab.on{background:#2563eb;border-color:#2563eb;color:#fff}.nxPosTab i{font-size:15px}.nxPosGridWrap{display:grid;grid-template-columns:1fr;gap:12px}@media(min-width:860px){.nxPosGridWrap{grid-template-columns:1fr 340px;align-items:start}.nxPosRight{position:sticky;top:10px}}.nxPosGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}.nxPosCard{display:flex;flex-direction:column;justify-content:space-between;gap:8px;min-height:78px;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px;cursor:pointer;text-align:left;font-family:inherit;transition:box-shadow .12s,opacity .12s}.nxPosCard:active{opacity:.7}.nxPosCard:hover{box-shadow:0 4px 12px rgba(0,0,0,.08);border-color:#bfdbfe}.nxPosCardNom{font-size:12px;font-weight:700;color:#1e293b;line-height:1.2}.nxPosCardBot{display:flex;justify-content:space-between;align-items:center}.nxPosCardPre{font-size:13px;font-weight:800;color:#2563eb}.nxPosCardStk{font-size:9.5px;color:#475569}.nxPosCart{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.04)}.nxPosCartHd{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:800;color:#475569;margin-bottom:6px}.nxPosCartList{max-height:42vh;overflow-y:auto;margin-bottom:8px}.nxPosCartIt{display:flex;align-items:center;gap:8px;padding:7px 2px;border-bottom:1px solid #f1f5f9}.nxPosQty{display:flex;align-items:center;gap:6px}.nxPosQty button{width:26px;height:26px;border-radius:8px;border:1.5px solid #e2e8f0;background:#f8fafc;font-size:16px;font-weight:800;color:#475569;cursor:pointer;line-height:1}.nxPosQty span{min-width:18px;text-align:center;font-weight:800;font-size:13px}.nxPosX{background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:15px;padding:2px}.nxPosTot{border-top:1px dashed #e2e8f0;padding-top:8px;margin-bottom:10px}.nxPosTotR{display:flex;justify-content:space-between;font-size:12px;color:#475569;padding:2px 0}.nxPosTotBig{font-size:16px;font-weight:800;color:#0f172a;margin-top:2px}.nxPosCobrar{width:100%;padding:13px;font-size:15px}.nxFacTop{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:10px}.nxFacCli{flex:1;min-width:180px}.nxFacCli label{display:block;font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px}.nxFacCli select{width:100%;height:40px;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;background:#fff;color:#1e293b;font-weight:600;font-family:inherit}.nxFacFecha{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:6px 14px;text-align:center}.nxFacFecha span{display:block;font-size:9px;color:#475569;font-weight:700;text-transform:uppercase}.nxFacFecha b{font-size:12px;color:#334155}.nxFacAdd{position:relative;margin-bottom:12px}.nxFacAdd>i{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#475569;font-size:16px;pointer-events:none}.nxFacAdd input{width:100%;height:42px;padding:0 12px 0 36px;border:1.5px solid #2563eb;border-radius:11px;font-size:13px;outline:none;background:#fff;color:#1e293b;box-shadow:0 2px 8px rgba(37,99,235,.10);font-family:inherit}.nxFacSug{display:none;position:absolute;left:0;right:0;top:46px;z-index:30;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.14);max-height:300px;overflow-y:auto;padding:4px}.nxFacSugIt{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:9px;cursor:pointer}.nxFacSugIt:active,.nxFacSugIt:hover{background:#eff6ff}.nxFacSugNom{font-size:12.5px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nxFacSugSub{font-size:10px;color:#475569}.nxFacSugPre{font-size:13px;font-weight:800;color:#2563eb;text-align:right;white-space:nowrap}.nxFacSugPre span{display:block;font-size:9px;color:#475569;font-weight:600}.nxFacSugEmpty{padding:12px;text-align:center;color:#475569;font-size:12px}.nxFacTblWrap{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;overflow-x:auto;margin-bottom:12px}.nxFacTbl{width:100%;border-collapse:collapse;min-width:470px}.nxFacTbl thead th{background:#f8fafc;font-size:9.5px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;text-align:left;padding:9px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap}.nxFacTbl thead th:nth-child(3),.nxFacTbl thead th:nth-child(4),.nxFacTbl thead th:nth-child(5){text-align:right}.nxFacTbl tbody td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#334155;vertical-align:middle}.nxFacCod{font-family:var(--mono,monospace);font-size:10.5px;color:#475569;white-space:nowrap}.nxFacDesc{font-weight:600;min-width:130px}.nxFacCant,.nxFacPre,.nxFacImp{text-align:right}.nxFacCant input,.nxFacPre input{width:62px;text-align:right;padding:6px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-weight:700;color:#0f172a;background:#fff;font-family:inherit}.nxFacCant input{width:50px}.nxFacImp{font-weight:800;color:#0f172a;white-space:nowrap}.nxFacDel{text-align:center}.nxFacDel button{background:none;border:none;color:#cbd5e1;font-size:16px;cursor:pointer;padding:2px;line-height:1}.nxFacDel button:active,.nxFacDel button:hover{color:#dc2626}.nxFacEmpty{text-align:center;color:#475569;font-size:12px;padding:24px 10px!important}.nxFacTot{border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;margin-bottom:12px;background:#fff}.nxFacTotR{display:flex;justify-content:space-between;font-size:12px;color:#475569;padding:3px 0}.nxFacTotBig{font-size:17px;font-weight:800;color:#0f172a;border-top:1px dashed #e2e8f0;margin-top:4px;padding-top:8px}.nxFacActions{display:flex;gap:8px;justify-content:flex-end;align-items:center}.nxFacBtn{padding:13px 18px;font-size:15px}/* ── Rediseño POS desktop-first ── */#v-pos .nc{max-width:1240px;margin-left:auto;margin-right:auto}.nxPosTabs{gap:2px;border-bottom:2px solid #eef2f7;margin-bottom:16px}.nxPosTab{border:none;background:transparent;color:#475569;border-radius:9px 9px 0 0;padding:10px 16px;border-bottom:3px solid transparent}.nxPosTab:hover{background:#f8fafc;color:#1e293b}.nxPosTab.on{background:transparent;color:#2563eb;border-bottom-color:#2563eb}@media(min-width:900px){.nxPosGridWrap{grid-template-columns:1fr 380px;gap:18px}.nxPosGrid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}.nxPosCard{min-height:92px;padding:12px}.nxPosCardNom{font-size:13px}.nxPosCardPre{font-size:15px}.nxPosCart{padding:16px;border-radius:16px;box-shadow:0 6px 22px rgba(15,23,42,.07)}.nxPosCartList{max-height:52vh}.nxFacTbl{min-width:0}.nxFacTbl thead th{font-size:11px;padding:11px 12px}.nxFacTbl tbody td{font-size:13px;padding:11px 12px}.nxFacCant input{width:64px;padding:8px}.nxFacPre input{width:92px;padding:8px}.nxFacTot{max-width:360px;margin-left:auto}.nxFacBtn{padding:14px 26px;font-size:16px}}.nxFacHead{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px;align-items:end}.nxFacF label{display:block;font-size:9.5px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px}.nxFacF select,.nxFacF input[type=text]{width:100%;height:40px;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;background:#fff;color:#1e293b;font-weight:600;font-family:inherit}.nxFacFsm{max-width:150px}.nxFacNum{height:40px;display:flex;align-items:center;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;font-size:15px;font-weight:800;color:#2563eb}.nxFacCred{display:flex;align-items:center;gap:7px;height:40px;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;font-size:12.5px;font-weight:700;color:#334155;cursor:pointer;white-space:nowrap}.nxFacCred input{width:17px;height:17px;accent-color:#2563eb}.nxFacExi{text-align:center;font-weight:700;color:#475569}.nxFacExi0{color:#dc2626}.nxFacDsc{text-align:center}.nxFacDscBox{display:inline-flex;align-items:center;border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff}.nxFacDscBox input{width:46px;text-align:right;padding:6px;border:none;outline:none;font-size:12px;font-weight:700;color:#0f172a;background:transparent;font-family:inherit}.nxFacDscBox button{border:none;background:#f1f5f9;color:#475569;font-weight:800;font-size:11px;padding:7px 8px;cursor:pointer;border-left:1px solid #e2e8f0;min-width:34px}.nxFacTbl{min-width:600px}.nxFacTbl thead th:nth-child(3){text-align:center}.nxFacTbl thead th:nth-child(4),.nxFacTbl thead th:nth-child(5),.nxFacTbl thead th:nth-child(7){text-align:right}.nxFacTbl thead th:nth-child(6){text-align:center}.nxFacSubTabs{display:flex;gap:2px;flex-wrap:wrap;border-bottom:2px solid #eef2f7;margin-bottom:14px}.nxFacSubTab{border:none;background:transparent;color:#475569;padding:9px 14px;font-size:12.5px;font-weight:700;cursor:pointer;border-bottom:3px solid transparent;font-family:inherit}.nxFacSubTab:hover{color:#1e293b}.nxFacSubTab.on{color:#2563eb;border-bottom-color:#2563eb}.nxFacF input[type=date]{width:100%;height:40px;padding:0 10px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;background:#fff;color:#1e293b;font-weight:600;font-family:inherit}.nxFacCliRow{display:flex;gap:6px;align-items:stretch}.nxFacCliRow select{flex:1;min-width:0}.nxFacCliAdd{border:1.5px solid #2563eb;background:#2563eb;color:#fff;border-radius:10px;width:44px;flex-shrink:0;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center}.nxFacCliAdd:hover{background:#1d4ed8}/* ── Contabilidad ── */.nxCtaRango{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:end}.nxCtaRango .nxFacF{max-width:160px}.nxCtaKpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.nxCtaKpi{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:13px 14px;box-shadow:0 1px 3px rgba(15,23,42,.05)}.nxCtaKpiL{font-size:10.5px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.3px;margin-bottom:5px}.nxCtaKpiV{font-size:18px;font-weight:800;line-height:1}.nxCtaTipo{font-size:10px;font-weight:800;padding:2px 8px;border-radius:7px;text-transform:uppercase;letter-spacing:.2px}.nxCtaTipo-activo{background:#eff6ff;color:#2563eb}.nxCtaTipo-pasivo{background:#fff7ed;color:#ea580c}.nxCtaTipo-capital{background:#faf5ff;color:#7c3aed}.nxCtaTipo-ingreso{background:#f0fdf4;color:#16a34a}.nxCtaTipo-costo{background:#fef2f2;color:#dc2626}.nxCtaTipo-gasto{background:#fef2f2;color:#b91c1c}.nxCtaAs{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:10px;background:#fff}.nxCtaAsHd{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:#334155;margin-bottom:8px;gap:8px}.nxCtaOrig{font-size:9px;font-weight:800;background:#f1f5f9;color:#475569;padding:2px 7px;border-radius:6px;text-transform:uppercase;margin-left:4px}.nxCtaAsT{width:100%;border-collapse:collapse;font-size:11.5px}.nxCtaAsT th{text-align:left;font-size:9px;font-weight:800;color:#475569;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #eef2f7}.nxCtaAsT td{padding:4px 6px;border-bottom:1px solid #f6f8fb;color:#334155}.nxCtaAsTot td{border-top:1.5px solid #e2e8f0;border-bottom:none!important;padding-top:6px}.nxCtaRep{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px}.nxCtaRep table{font-size:12.5px}.nxCtaRep td{padding:5px 6px;color:#334155}.nxCtaSec td{font-size:10px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.3px;padding-top:12px;border-bottom:1px solid #eef2f7}.nxCtaTotR td{font-weight:800;border-top:1px solid #e2e8f0;color:#0f172a}.nxCtaGran td{font-weight:800;font-size:14px;border-top:2px solid #1e293b;padding-top:8px;color:#0f172a}.nxAsRow{display:grid;grid-template-columns:1fr 92px 92px 28px;gap:6px;margin-bottom:6px;align-items:center}.nxAsRow select,.nxAsRow input{height:38px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 8px;font-size:12px;background:#fff;color:#1e293b;font-family:inherit;width:100%}.nxAsRow input{text-align:right;font-weight:700}.nxAsTot{margin-top:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;color:#475569}@media(max-width:520px){.nxAsRow{grid-template-columns:1fr 1fr 1fr 24px}.nxAsRow select{grid-column:1/-1}}/* ── RRHH / Nómina ── */.nxNomRow{display:grid;grid-template-columns:1fr 110px 110px 110px;gap:8px;align-items:center;padding:8px 4px;border-bottom:1px solid #f1f5f9}.nxNomEmp{min-width:0}.nxNomF{display:flex;flex-direction:column;gap:2px}.nxNomF span{font-size:9px;font-weight:800;color:#475569;text-transform:uppercase}.nxNomF input{height:36px;border:1.5px solid #e2e8f0;border-radius:8px;padding:0 8px;font-size:12px;font-weight:700;text-align:right;background:#fff;color:#0f172a;font-family:inherit}.nxNomNeto{display:flex;flex-direction:column;gap:2px;text-align:right}.nxNomNeto span{font-size:9px;font-weight:800;color:#475569;text-transform:uppercase}.nxNomNeto b{font-size:13px;color:#16a34a}@media(max-width:560px){.nxNomRow{grid-template-columns:1fr 1fr;row-gap:6px}.nxNomEmp{grid-column:1/-1}.nxNomNeto{align-items:flex-end}}/* ── Reportes ── */.nxRepGrid{display:grid;grid-template-columns:1fr;gap:12px;margin-top:14px}@media(min-width:760px){.nxRepGrid{grid-template-columns:1.4fr 1fr}}.nxRepCard{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;box-shadow:0 1px 3px rgba(15,23,42,.05)}.nxRepTit{font-size:12px;font-weight:800;color:#475569;margin-bottom:12px;display:flex;align-items:center;gap:6px}.nxRepTit i{color:#7c3aed}.nxRepBars{display:flex;align-items:flex-end;gap:5px;height:120px;overflow-x:auto;padding-bottom:2px}.nxRepBar{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:30px;flex:1}.nxRepBarV{width:70%;min-width:14px;background:linear-gradient(180deg,#3b82f6,#2563eb);border-radius:5px 5px 0 0}.nxRepBarL{font-size:8.5px;color:#475569;white-space:nowrap}.nxRepMet{margin-bottom:10px}.nxRepMetTop{display:flex;justify-content:space-between;font-size:12px;color:#475569;margin-bottom:3px}.nxRepMetTop b{color:#0f172a}.nxRepMetBar{height:7px;background:#f1f5f9;border-radius:5px;overflow:hidden}.nxRepMetBar>div{height:100%;background:linear-gradient(90deg,#7c3aed,#a855f7);border-radius:5px}';
    document.head.appendChild(st);
  }
  function registrar() { try { if (window.nxMERegistrar) window.nxMERegistrar({ orden: 3, nombre: 'Punto de Venta', desc: 'Ventas, productos e inventario', icon: 'ti-shopping-cart', color: '#7c3aed', bg: '#faf5ff', onclick: 'window.nxAbrirPOS()' }); } catch (e) {} }
  function init() { inyectarCSS(); let n = 0; const t = function () { n++; if (window.nxMERegistrar) { registrar(); return; } if (n < 80) setTimeout(t, 150); }; t(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

/* ── Señal: parches.js terminó de aplicar estilos (para ocultar el splash/loader) ── */
try {
  window.__NX_PARCHES_READY__ = true;
  window.dispatchEvent(new Event('nexus:parches-ready'));
} catch (e) {}
