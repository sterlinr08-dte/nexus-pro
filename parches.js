// ════════════════════════════════════════════════════════════════
// NEXUS PRO — SISTEMA DE PARCHES
// ════════════════════════════════════════════════════════════════
//
// Este archivo aplica correcciones y mejoras al sistema SIN tocar
// el HTML principal. Se carga al final, por lo que puede sobrescribir
// cualquier función del sistema.
//
// REGLAS DE ORO:
//   1. NUNCA borrar parches viejos sin entender qué hacen
//   2. Cada parche tiene su sección con fecha y descripción
//   3. Después de aplicar un parche, validar que el sistema sigue funcionando
//   4. Si un parche rompe algo, comentarlo (con //) y reportar
//
// PARA APLICAR UN PARCHE:
//   1. Pegar el código del parche en este archivo
//   2. Subir solo parches.js a GitHub (sin tocar index.html)
//   3. Ctrl+Shift+R en el navegador para recargar
//
// ════════════════════════════════════════════════════════════════

(function(){
  'use strict';

  // Esperar a que el sistema esté cargado antes de aplicar parches
  function aplicarParches(){
    console.log('%c⚙ Sistema de parches NEXUS PRO cargado','color:#7c3aed;font-weight:bold');

    // ════════════════════════════════════════════════════════════
    // PARCHES ACTIVOS
    // ════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────────────────────
    // PARCHE-001 · 2026-05-22 · v2
    // Fix modal cliente cortado en iPhone (botón Guardar no funciona)
    // Causa: barra inferior de Safari iOS tapa el botón.
    // Solución: CSS con @media query (siempre activo en móvil).
    // ─────────────────────────────────────────────────────────────
    try {
      const css = `
        @media (max-width: 640px) {
          /* El modal de cliente con scroll y espacio para el botón */
          #mCli .mb {
            padding-bottom: 120px !important;
            padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px)) !important;
            max-height: calc(100vh - 60px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          /* El botón Guardar visible y por encima de la barra de Safari */
          #mCli #btnGCli {
            position: -webkit-sticky !important;
            position: sticky !important;
            bottom: 16px !important;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
            z-index: 100 !important;
            box-shadow: 0 4px 20px rgba(0,0,0,.2) !important;
            margin-top: 20px !important;
            background: var(--c1, #2563eb) !important;
          }
          /* Asegurar que el overlay/modal no tape el botón */
          #mCli {
            padding-bottom: env(safe-area-inset-bottom, 0px) !important;
          }
        }
      `;
      // Quitar versión vieja si existe
      const viejo = document.getElementById('patch-001-mcli-mobile');
      if (viejo) viejo.remove();
      const style = document.createElement('style');
      style.id = 'patch-001-mcli-mobile';
      style.textContent = css;
      document.head.appendChild(style);
      console.log('  ✓ PARCHE-001 v2 aplicado: Modal cliente fix iPhone');
    } catch(e) {
      console.error('  ✗ PARCHE-001 falló:', e);
    }


    // ── EJEMPLO DE PARCHE (comentado, solo para referencia) ────
    /*
    // PARCHE-001 · 2026-05-22 · Corregir cálculo de prima
    if (typeof window.getTot === 'function') {
      const _getTotOriginal = window.getTot;
      window.getTot = function(c) {
        // Versión corregida aquí
        return _getTotOriginal(c); // o lógica nueva
      };
      console.log('  ✓ PARCHE-001 aplicado: getTot corregido');
    }
    */

    // ════════════════════════════════════════════════════════════
    // FIN DE PARCHES
    // ════════════════════════════════════════════════════════════

    console.log('%c✓ Parches aplicados correctamente','color:#10b981;font-weight:bold');
  }

  // Si el sistema ya cargó, aplicar inmediatamente
  if (document.readyState === 'complete') {
    setTimeout(aplicarParches, 100);
  } else {
    window.addEventListener('load', function(){
      setTimeout(aplicarParches, 100);
    });
  }
})();

// ─────────────────────────────────────────────────────────────
// PARCHE-002 · 2026-05-22
// Fix menú móvil "Más acciones" en Clientes: opciones opacas/no ejecutan.
// Aplica sin tocar index.html.
// ─────────────────────────────────────────────────────────────
(function(){
  'use strict';

  function instalarPatchMenuMovil(){
    try{
      const css = `
        @media (max-width: 640px) {
          .acc-backdrop {
            position: fixed !important;
            inset: 0 !important;
            background: rgba(15, 23, 42, .46) !important;
            backdrop-filter: blur(2px) !important;
            -webkit-backdrop-filter: blur(2px) !important;
            z-index: 2147483000 !important;
            pointer-events: auto !important;
          }
          .acc-menu {
            position: fixed !important;
            left: 12px !important;
            right: 12px !important;
            bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
            top: auto !important;
            z-index: 2147483001 !important;
            background: #ffffff !important;
            opacity: 1 !important;
            filter: none !important;
            pointer-events: auto !important;
            max-height: min(68vh, 520px) !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            box-shadow: 0 22px 70px rgba(15, 23, 42, .34), 0 6px 18px rgba(15, 23, 42, .18) !important;
          }
          .acc-menu, .acc-menu button {
            touch-action: manipulation !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          .acc-menu button {
            pointer-events: auto !important;
            opacity: 1 !important;
            color: #0f172a !important;
            background: transparent !important;
          }
          .acc-menu button:active {
            background: #e8edf3 !important;
          }
          body.tema-premium .acc-menu {
            background: #16213d !important;
            opacity: 1 !important;
          }
          body.tema-premium .acc-menu button {
            color: #e2e8f0 !important;
          }
        }
      `;
      const viejo = document.getElementById('patch-002-acc-menu-mobile');
      if(viejo) viejo.remove();
      const style = document.createElement('style');
      style.id = 'patch-002-acc-menu-mobile';
      style.textContent = css;
      document.head.appendChild(style);

      window.cerrarAccMenus = function(){
        document.querySelectorAll('.acc-menu').forEach(function(m){
          m.style.display = 'none';
          m.classList.remove('acc-menu-open-mobile');
        });
        document.querySelectorAll('.acc-backdrop').forEach(function(b){ b.remove(); });
      };

      window.toggleAccMenu = function(ev, cid){
        if(ev){
          ev.preventDefault();
          ev.stopPropagation();
        }
        const menu = document.getElementById('accMenu_' + cid);
        if(!menu) return;

        const estaAbierto = menu.style.display === 'block';
        window.cerrarAccMenus();
        if(estaAbierto) return;

        const esMovil = window.innerWidth <= 640;
        menu.style.cssText = '';
        menu.style.display = 'block';
        menu.style.position = 'fixed';
        menu.style.zIndex = esMovil ? '2147483001' : '5000';
        menu.style.opacity = '1';
        menu.style.pointerEvents = 'auto';

        if(esMovil){
          // Mover temporalmente al body evita que tablas/contenedores con overflow o transform bloqueen los toques.
          if(menu.parentElement !== document.body){
            document.body.appendChild(menu);
          }
          menu.classList.add('acc-menu-open-mobile');
          menu.style.left = '12px';
          menu.style.right = '12px';
          menu.style.bottom = 'calc(16px + env(safe-area-inset-bottom, 0px))';
          menu.style.top = 'auto';
          menu.style.maxHeight = 'min(68vh, 520px)';
          menu.style.overflowY = 'auto';

          const bd = document.createElement('div');
          bd.className = 'acc-backdrop';
          bd.addEventListener('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            window.cerrarAccMenus();
          }, {passive:false});
          document.body.appendChild(bd);
        }else{
          const btn = ev && ev.currentTarget ? ev.currentTarget.getBoundingClientRect() : {bottom:80,right:260,top:40};
          menu.style.top = (btn.bottom + 6) + 'px';
          const ancho = menu.offsetWidth || 248;
          let left = btn.right - ancho;
          if(left < 8) left = 8;
          menu.style.left = left + 'px';
          menu.style.right = 'auto';
          if(btn.bottom + menu.offsetHeight > window.innerHeight - 10){
            menu.style.top = Math.max(8, btn.top - menu.offsetHeight - 6) + 'px';
          }
        }
      };

      // Evita que un toque dentro del menú sea interpretado como clic fuera en navegadores móviles.
      document.addEventListener('touchstart', function(e){
        if(e.target.closest && e.target.closest('.acc-menu')) e.stopPropagation();
      }, {passive:true, capture:true});

      console.log('  ✓ PARCHE-002 aplicado: Menú móvil de acciones corregido');
    }catch(e){
      console.error('  ✗ PARCHE-002 falló:', e);
    }
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(instalarPatchMenuMovil, 150);
  }else{
    window.addEventListener('DOMContentLoaded', function(){ setTimeout(instalarPatchMenuMovil, 150); });
  }
})();

// ─────────────────────────────────────────────────────────────
// PARCHE-003 · 2026-05-22
// Dashboard móvil web tipo app v1.
// Aplica solo en pantallas móviles. No toca index.html.
// ─────────────────────────────────────────────────────────────
(function(){
  'use strict';

  function instalarDashboardMovilApp(){
    try{
      const css = `
        @media (max-width: 768px) {
          body.nxp-mobile-app #app {
            background: #f6f8fc !important;
          }
          body.nxp-mobile-app .ticker {
            display: none !important;
          }
          body.nxp-mobile-app .tnav {
            height: calc(58px + env(safe-area-inset-top, 0px)) !important;
            padding: env(safe-area-inset-top, 0px) 14px 0 14px !important;
            background: rgba(255,255,255,.96) !important;
            backdrop-filter: blur(14px) !important;
            -webkit-backdrop-filter: blur(14px) !important;
            border-bottom: 1px solid rgba(226,232,240,.9) !important;
            box-shadow: 0 8px 24px rgba(15,23,42,.06) !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 90 !important;
          }
          body.nxp-mobile-app .pttl {
            font-size: 0 !important;
            max-width: none !important;
            overflow: visible !important;
          }
          body.nxp-mobile-app .pttl::after {
            content: 'NEXU PRO' !important;
            font-size: 14px !important;
            font-weight: 800 !important;
            letter-spacing: .2px !important;
            color: #0f172a !important;
          }
          body.nxp-mobile-app .tn-sr {
            display: none !important;
          }
          body.nxp-mobile-app .tn-r {
            gap: 8px !important;
          }
          body.nxp-mobile-app .tn-r .tn-b:not(.notif-bell) {
            display: none !important;
          }
          body.nxp-mobile-app .tn-b,
          body.nxp-mobile-app .tn-tog {
            min-width: 38px !important;
            width: 38px !important;
            height: 38px !important;
            border-radius: 14px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: 0 4px 12px rgba(15,23,42,.06) !important;
          }
          body.nxp-mobile-app .content {
            padding: 14px 14px calc(86px + env(safe-area-inset-bottom, 0px)) !important;
            background: linear-gradient(180deg,#f8fbff 0%,#f1f5f9 100%) !important;
          }
          body.nxp-mobile-app #v-dashboard::before {
            content: 'Hola, Admin 👋\AResumen general de tu negocio';
            white-space: pre-line;
            display: block;
            font-size: 20px;
            line-height: 1.35;
            font-weight: 800;
            color: #0f172a;
            margin: 2px 2px 14px;
          }
          body.nxp-mobile-app #v-dashboard::after {
            content: 'Dashboard móvil tipo app · versión de prueba';
            display: block;
            text-align: center;
            color: #94a3b8;
            font-size: 10px;
            font-weight: 600;
            padding: 6px 0 2px;
          }
          body.nxp-mobile-app #v-dashboard .qa-g {
            grid-template-columns: repeat(2, minmax(0,1fr)) !important;
            gap: 10px !important;
            margin-bottom: 14px !important;
          }
          body.nxp-mobile-app #v-dashboard .qa {
            min-height: 92px !important;
            border-radius: 18px !important;
            border: 1px solid rgba(226,232,240,.96) !important;
            background: rgba(255,255,255,.98) !important;
            box-shadow: 0 10px 28px rgba(15,23,42,.08) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 7px !important;
            -webkit-tap-highlight-color: transparent !important;
            touch-action: manipulation !important;
          }
          body.nxp-mobile-app #v-dashboard .qa:active {
            transform: scale(.98) !important;
            background: #eff6ff !important;
          }
          body.nxp-mobile-app #v-dashboard .qa-i {
            width: 38px !important;
            height: 38px !important;
            border-radius: 15px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #dbeafe !important;
            color: #2563eb !important;
            margin: 0 !important;
            font-size: 21px !important;
          }
          body.nxp-mobile-app #v-dashboard .qa:nth-child(2) .qa-i { background:#dcfce7 !important;color:#16a34a !important; }
          body.nxp-mobile-app #v-dashboard .qa:nth-child(3) .qa-i { background:#dcfce7 !important;color:#16a34a !important; }
          body.nxp-mobile-app #v-dashboard .qa:nth-child(4) .qa-i { background:#ede9fe !important;color:#7c3aed !important; }
          body.nxp-mobile-app #v-dashboard .qa:nth-child(5) .qa-i { background:#ffedd5 !important;color:#ea580c !important; }
          body.nxp-mobile-app #v-dashboard .qa:nth-child(6) .qa-i { background:#fce7f3 !important;color:#db2777 !important; }
          body.nxp-mobile-app #v-dashboard .qa-l {
            font-size: 12px !important;
            color: #0f172a !important;
            font-weight: 750 !important;
          }
          body.nxp-mobile-app #v-dashboard .kg {
            grid-template-columns: repeat(2, minmax(0,1fr)) !important;
            gap: 10px !important;
            margin-bottom: 14px !important;
          }
          body.nxp-mobile-app #v-dashboard .kpi {
            min-height: 130px !important;
            border-radius: 18px !important;
            border: 1px solid rgba(226,232,240,.98) !important;
            background: rgba(255,255,255,.99) !important;
            box-shadow: 0 12px 30px rgba(15,23,42,.08) !important;
            padding: 16px 14px !important;
          }
          body.nxp-mobile-app #v-dashboard .kpi::after {
            height: 0 !important;
          }
          body.nxp-mobile-app #v-dashboard .ki {
            opacity: 1 !important;
            right: 12px !important;
            top: 12px !important;
            width: 36px !important;
            height: 36px !important;
            border-radius: 14px !important;
            font-size: 20px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #dbeafe !important;
            color: #2563eb !important;
          }
          body.nxp-mobile-app #v-dashboard .k2 .ki { background:#ede9fe !important;color:#7c3aed !important; }
          body.nxp-mobile-app #v-dashboard .k3 .ki { background:#dcfce7 !important;color:#16a34a !important; }
          body.nxp-mobile-app #v-dashboard .k4 .ki { background:#fee2e2 !important;color:#dc2626 !important; }
          body.nxp-mobile-app #v-dashboard .k5 .ki { background:#fef3c7 !important;color:#d97706 !important; }
          body.nxp-mobile-app #v-dashboard .kl {
            font-size: 10px !important;
            color: #475569 !important;
            letter-spacing: 0 !important;
            text-transform: none !important;
            max-width: 90px !important;
            line-height: 1.25 !important;
          }
          body.nxp-mobile-app #v-dashboard .kv {
            font-size: 22px !important;
            color: #0f172a !important;
            margin-top: 28px !important;
          }
          body.nxp-mobile-app #v-dashboard .ks {
            font-size: 10px !important;
            color: #64748b !important;
          }
          body.nxp-mobile-app #v-dashboard .nc {
            border-radius: 20px !important;
            border: 1px solid rgba(226,232,240,.96) !important;
            background: rgba(255,255,255,.98) !important;
            box-shadow: 0 12px 30px rgba(15,23,42,.07) !important;
            padding: 14px !important;
            margin-bottom: 14px !important;
          }
          body.nxp-mobile-app #v-dashboard .ct {
            font-size: 14px !important;
            color: #0f172a !important;
          }
          body.nxp-mobile-app #v-dashboard .ct-s {
            font-size: 10px !important;
            color: #64748b !important;
          }
          body.nxp-mobile-app .nxp-bottom-nav {
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: calc(8px + env(safe-area-inset-bottom, 0px));
            height: 64px;
            background: rgba(255,255,255,.96);
            border: 1px solid rgba(226,232,240,.95);
            border-radius: 24px;
            box-shadow: 0 18px 45px rgba(15,23,42,.16);
            display: grid;
            grid-template-columns: repeat(5,1fr);
            align-items: center;
            z-index: 120;
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
          }
          body.nxp-mobile-app .nxp-bottom-nav button {
            border: 0;
            background: transparent;
            height: 56px;
            border-radius: 18px;
            color: #64748b;
            font-size: 10px;
            font-weight: 700;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            cursor: pointer;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }
          body.nxp-mobile-app .nxp-bottom-nav button i {
            font-size: 20px;
          }
          body.nxp-mobile-app .nxp-bottom-nav button.on {
            color: #2563eb;
            background: #eff6ff;
          }
          body.nxp-mobile-app .nxp-fab {
            position: fixed;
            right: 18px;
            bottom: calc(86px + env(safe-area-inset-bottom, 0px));
            width: 58px;
            height: 58px;
            border-radius: 22px;
            background: linear-gradient(135deg,#2563eb,#3b82f6);
            color: #fff;
            border: 0;
            box-shadow: 0 18px 38px rgba(37,99,235,.35);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            z-index: 118;
            cursor: pointer;
          }
          body.nxp-mobile-app .nxp-fab:active {
            transform: scale(.96);
          }
          body.nxp-mobile-app.dark .tnav,
          body.nxp-mobile-app.dark .nxp-bottom-nav,
          body.nxp-mobile-app.dark #v-dashboard .qa,
          body.nxp-mobile-app.dark #v-dashboard .kpi,
          body.nxp-mobile-app.dark #v-dashboard .nc {
            background: rgba(30,41,59,.96) !important;
            border-color: rgba(51,65,85,.95) !important;
          }
          body.nxp-mobile-app.dark .content {
            background: linear-gradient(180deg,#0f172a 0%,#111827 100%) !important;
          }
          body.nxp-mobile-app.dark .pttl::after,
          body.nxp-mobile-app.dark #v-dashboard::before,
          body.nxp-mobile-app.dark #v-dashboard .qa-l,
          body.nxp-mobile-app.dark #v-dashboard .kv,
          body.nxp-mobile-app.dark #v-dashboard .ct {
            color: #e2e8f0 !important;
          }
          body.nxp-mobile-app.dark #v-dashboard .kl,
          body.nxp-mobile-app.dark #v-dashboard .ks,
          body.nxp-mobile-app.dark #v-dashboard .ct-s,
          body.nxp-mobile-app.dark .nxp-bottom-nav button {
            color: #94a3b8 !important;
          }
        }
        @media (min-width: 769px) {
          .nxp-bottom-nav,
          .nxp-fab { display: none !important; }
        }
      `;

      const viejo = document.getElementById('patch-003-dashboard-mobile-app');
      if(viejo) viejo.remove();
      const style = document.createElement('style');
      style.id = 'patch-003-dashboard-mobile-app';
      style.textContent = css;
      document.head.appendChild(style);

      function esMovil(){ return window.matchMedia('(max-width: 768px)').matches; }

      function activarClase(){
        document.body.classList.toggle('nxp-mobile-app', esMovil());
      }

      function crearBottomNav(){
        if(document.querySelector('.nxp-bottom-nav')) return;
        const navBox = document.createElement('div');
        navBox.className = 'nxp-bottom-nav';
        navBox.innerHTML = `
          <button data-view="dashboard" onclick="nav('dashboard',null)"><i class="ti ti-home"></i><span>Inicio</span></button>
          <button data-view="clientes" onclick="nav('clientes',null)"><i class="ti ti-users"></i><span>Clientes</span></button>
          <button data-view="facturas" onclick="nav('facturas',null)"><i class="ti ti-file-invoice"></i><span>Facturas</span></button>
          <button data-view="cobros" onclick="nav('clientes',null);setTimeout(function(){ if(typeof switchTab==='function') switchTab('pagos'); },200)"><i class="ti ti-wallet"></i><span>Cobros</span></button>
          <button data-view="mas" onclick="toggleSidebar()"><i class="ti ti-dots"></i><span>Más</span></button>
        `;
        document.body.appendChild(navBox);
      }

      function crearFAB(){
        if(document.querySelector('.nxp-fab')) return;
        const fab = document.createElement('button');
        fab.className = 'nxp-fab';
        fab.type = 'button';
        fab.title = 'Nuevo cliente';
        fab.innerHTML = '<i class="ti ti-plus"></i>';
        fab.addEventListener('click', function(){
          if(typeof abrirNuevoCli === 'function') abrirNuevoCli();
        });
        document.body.appendChild(fab);
      }

      function marcarActivo(){
        const active = document.querySelector('.view.on');
        const id = active ? active.id.replace('v-','') : 'dashboard';
        document.querySelectorAll('.nxp-bottom-nav button').forEach(function(b){
          b.classList.toggle('on', b.dataset.view === id || (id === 'clientes' && b.dataset.view === 'clientes'));
        });
      }

      function instalar(){
        activarClase();
        crearBottomNav();
        crearFAB();
        marcarActivo();
      }

      instalar();
      window.addEventListener('resize', activarClase);
      document.addEventListener('click', function(){ setTimeout(marcarActivo, 80); }, true);
      const obsTarget = document.getElementById('cnt') || document.body;
      const obs = new MutationObserver(function(){ marcarActivo(); });
      obs.observe(obsTarget, {attributes:true, subtree:true, attributeFilter:['class']});

      console.log('  ✓ PARCHE-003 aplicado: Dashboard móvil tipo app v1');
    }catch(e){
      console.error('  ✗ PARCHE-003 falló:', e);
    }
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(instalarDashboardMovilApp, 220);
  }else{
    window.addEventListener('DOMContentLoaded', function(){ setTimeout(instalarDashboardMovilApp, 220); });
  }
})();


// ─────────────────────────────────────────────────────────────
// PARCHE-004 · 2026-05-22
// Ajuste responsive móvil: cada módulo/card se adapta al ancho real.
// No toca index.html. Solo mejora CSS en pantallas móviles.
// ─────────────────────────────────────────────────────────────
(function(){
  'use strict';

  function instalarAjusteModulosMovil(){
    try{
      const css = `
        @media (max-width: 768px) {
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          body.nxp-mobile-app,
          body.nxp-mobile-app * {
            box-sizing: border-box !important;
          }

          body.nxp-mobile-app .app,
          body.nxp-mobile-app .main,
          body.nxp-mobile-app .content,
          body.nxp-mobile-app #cnt,
          body.nxp-mobile-app .view,
          body.nxp-mobile-app #v-dashboard {
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          body.nxp-mobile-app .content {
            padding-left: 12px !important;
            padding-right: 12px !important;
            padding-bottom: calc(112px + env(safe-area-inset-bottom, 0px)) !important;
          }

          body.nxp-mobile-app #v-dashboard {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }

          /* Cualquier módulo interno del dashboard se ajusta a pantalla */
          body.nxp-mobile-app #v-dashboard > *,
          body.nxp-mobile-app #v-dashboard .card,
          body.nxp-mobile-app #v-dashboard .panel,
          body.nxp-mobile-app #v-dashboard .box,
          body.nxp-mobile-app #v-dashboard .nc,
          body.nxp-mobile-app #v-dashboard .qa,
          body.nxp-mobile-app #v-dashboard .kpi,
          body.nxp-mobile-app #v-dashboard .chart,
          body.nxp-mobile-app #v-dashboard .tblwrap {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          /* Grids fluidos: nunca se salen de la pantalla */
          body.nxp-mobile-app #v-dashboard .grid,
          body.nxp-mobile-app #v-dashboard .cards,
          body.nxp-mobile-app #v-dashboard .kpis,
          body.nxp-mobile-app #v-dashboard .quick,
          body.nxp-mobile-app #v-dashboard .quick-actions,
          body.nxp-mobile-app #v-dashboard [class*="grid"] {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          body.nxp-mobile-app #v-dashboard .kpi,
          body.nxp-mobile-app #v-dashboard .qa,
          body.nxp-mobile-app #v-dashboard .nc,
          body.nxp-mobile-app #v-dashboard .card,
          body.nxp-mobile-app #v-dashboard .panel {
            min-width: 0 !important;
            overflow: hidden !important;
            word-break: normal !important;
          }

          /* Texto y montos largos no rompen el diseño */
          body.nxp-mobile-app #v-dashboard .kv,
          body.nxp-mobile-app #v-dashboard .kl,
          body.nxp-mobile-app #v-dashboard .ks,
          body.nxp-mobile-app #v-dashboard .ct,
          body.nxp-mobile-app #v-dashboard .ct-s,
          body.nxp-mobile-app #v-dashboard h1,
          body.nxp-mobile-app #v-dashboard h2,
          body.nxp-mobile-app #v-dashboard h3,
          body.nxp-mobile-app #v-dashboard p,
          body.nxp-mobile-app #v-dashboard span {
            max-width: 100% !important;
            overflow-wrap: anywhere !important;
          }

          /* Tablas/reportes: scroll horizontal interno, no rompe la pantalla */
          body.nxp-mobile-app .tblwrap,
          body.nxp-mobile-app .table-wrap,
          body.nxp-mobile-app [class*="table"] {
            max-width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          body.nxp-mobile-app table {
            max-width: 100% !important;
          }

          /* Formularios y filtros en móvil */
          body.nxp-mobile-app input,
          body.nxp-mobile-app select,
          body.nxp-mobile-app textarea,
          body.nxp-mobile-app button {
            max-width: 100% !important;
          }

          body.nxp-mobile-app .row,
          body.nxp-mobile-app .form-row,
          body.nxp-mobile-app .filters,
          body.nxp-mobile-app .toolbar {
            max-width: 100% !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }

          body.nxp-mobile-app .row > *,
          body.nxp-mobile-app .form-row > *,
          body.nxp-mobile-app .filters > *,
          body.nxp-mobile-app .toolbar > * {
            min-width: 0 !important;
          }
        }

        @media (max-width: 420px) {
          body.nxp-mobile-app .content {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }

          body.nxp-mobile-app #v-dashboard .grid,
          body.nxp-mobile-app #v-dashboard .cards,
          body.nxp-mobile-app #v-dashboard .kpis,
          body.nxp-mobile-app #v-dashboard .quick,
          body.nxp-mobile-app #v-dashboard .quick-actions,
          body.nxp-mobile-app #v-dashboard [class*="grid"] {
            gap: 8px !important;
          }

          body.nxp-mobile-app #v-dashboard .kv {
            font-size: clamp(18px, 6vw, 22px) !important;
          }

          body.nxp-mobile-app #v-dashboard .kl,
          body.nxp-mobile-app #v-dashboard .ks {
            font-size: 10px !important;
          }
        }
      `;

      const viejo = document.getElementById('patch-004-modulos-movil-fluidos');
      if(viejo) viejo.remove();
      const style = document.createElement('style');
      style.id = 'patch-004-modulos-movil-fluidos';
      style.textContent = css;
      document.head.appendChild(style);

      console.log('  ✓ PARCHE-004 aplicado: módulos móviles ajustados a pantalla');
    }catch(e){
      console.error('  ✗ PARCHE-004 falló:', e);
    }
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(instalarAjusteModulosMovil, 260);
  }else{
    window.addEventListener('DOMContentLoaded', function(){ setTimeout(instalarAjusteModulosMovil, 260); });
  }
})();

/* ============================================================================
   PARCHE-005 — MÓVIL APP v2 + NOTIFICACIÓN LOGIN REFRESH + CHANGELOG PATCHES
   Autorizado: convertir web móvil a experiencia tipo app y registrar mejoras.
   Alcance: CSS/JS visual y control de notificación. No modifica index.html.
============================================================================ */
(function(){
  'use strict';

  const PATCH_VERSION = 'Móvil App v2';
  const PATCH_ID = 'patch-005-mobile-app-v2';
  const PATCH_ITEMS = [
    'Corrección: al actualizar la página ya no muestra la notificación “Sistema listo / Bienvenido” si la sesión fue restaurada automáticamente.',
    'Mejora visual global: la web móvil toma estilo tipo app sin afectar escritorio.',
    'Header, contenido, formularios, tablas, tarjetas y modales con mejor ajuste a pantalla móvil.',
    'Botones y controles táctiles más cómodos en celular.',
    'Historial de actualizaciones: se agrega este bloque para que queden visibles las correcciones aplicadas por parches.'
  ];

  const sesionExistiaAlCargar = !!(sessionStorage.getItem('nx_sesion') || localStorage.getItem('nx_sesion_persist'));

  function instalarControlToastRefresh(){
    if(window.__nxpToastRefreshPatch)return;
    window.__nxpToastRefreshPatch = true;

    const envolver = function(){
      if(typeof window.toast !== 'function' || window.toast.__nxpWrapped)return false;
      const originalToast = window.toast;
      const wrapped = function(tp, ttl, msg){
        try{
          const titulo = String(ttl || '').toLowerCase();
          const mensaje = String(msg || '').toLowerCase();
          const esBienvenida = titulo.includes('sistema listo') || mensaje.includes('bienvenido');
          const dentroArranque = performance.now() < 9000;
          const restaurada = sesionExistiaAlCargar && dentroArranque;
          if(restaurada && esBienvenida){
            console.log('  ✓ PARCHE-005: bienvenida de sesión restaurada suprimida');
            return;
          }
        }catch(e){}
        return originalToast.apply(this, arguments);
      };
      wrapped.__nxpWrapped = true;
      wrapped.__nxpOriginal = originalToast;
      window.toast = wrapped;
      return true;
    };

    if(!envolver()){
      const t = setInterval(()=>{ if(envolver()) clearInterval(t); }, 40);
      setTimeout(()=>clearInterval(t), 5000);
    }
  }

  function instalarEstiloMovilGlobal(){
    try{
      const css = `
        @media (max-width: 768px){
          html, body{
            width:100% !important;
            max-width:100% !important;
            overflow-x:hidden !important;
            -webkit-tap-highlight-color: transparent !important;
          }

          body.nxp-mobile-app #app{
            min-height:100dvh !important;
            width:100% !important;
            max-width:100% !important;
            overflow-x:hidden !important;
            background:#f4f7fb !important;
          }

          body.nxp-mobile-app .main,
          body.nxp-mobile-app main,
          body.nxp-mobile-app .content,
          body.nxp-mobile-app .view,
          body.nxp-mobile-app [id^="v-"]{
            width:100% !important;
            max-width:100% !important;
            min-width:0 !important;
            box-sizing:border-box !important;
            overflow-x:hidden !important;
          }

          body.nxp-mobile-app .content,
          body.nxp-mobile-app main{
            padding:12px 12px 86px !important;
          }

          body.nxp-mobile-app .nc,
          body.nxp-mobile-app .card,
          body.nxp-mobile-app .panel,
          body.nxp-mobile-app .box,
          body.nxp-mobile-app .stat,
          body.nxp-mobile-app .kpi,
          body.nxp-mobile-app .cfg-panel,
          body.nxp-mobile-app .dash-card,
          body.nxp-mobile-app [class*="card"],
          body.nxp-mobile-app [class*="panel"]{
            width:100% !important;
            max-width:100% !important;
            min-width:0 !important;
            box-sizing:border-box !important;
            border-radius:18px !important;
            box-shadow:0 10px 28px rgba(15,23,42,.07) !important;
          }

          body.nxp-mobile-app .g2,
          body.nxp-mobile-app .g3,
          body.nxp-mobile-app .g4,
          body.nxp-mobile-app .grid,
          body.nxp-mobile-app [class*="grid"]{
            display:grid !important;
            grid-template-columns:1fr !important;
            width:100% !important;
            max-width:100% !important;
            gap:10px !important;
          }

          body.nxp-mobile-app .ch,
          body.nxp-mobile-app .toolbar,
          body.nxp-mobile-app .filters,
          body.nxp-mobile-app .actions,
          body.nxp-mobile-app .row{
            width:100% !important;
            max-width:100% !important;
            min-width:0 !important;
            flex-wrap:wrap !important;
            gap:8px !important;
          }

          body.nxp-mobile-app input,
          body.nxp-mobile-app select,
          body.nxp-mobile-app textarea{
            width:100% !important;
            max-width:100% !important;
            min-height:42px !important;
            border-radius:12px !important;
            font-size:16px !important;
            box-sizing:border-box !important;
          }

          body.nxp-mobile-app button,
          body.nxp-mobile-app .btn{
            min-height:42px !important;
            border-radius:13px !important;
            touch-action:manipulation !important;
          }

          body.nxp-mobile-app .tw,
          body.nxp-mobile-app .table-wrap,
          body.nxp-mobile-app [class*="table"],
          body.nxp-mobile-app [style*="overflow"]{
            max-width:100% !important;
            overflow-x:auto !important;
            -webkit-overflow-scrolling:touch !important;
          }

          body.nxp-mobile-app table{
            min-width:640px !important;
          }

          body.nxp-mobile-app .overlay{
            padding:10px !important;
            align-items:flex-end !important;
          }

          body.nxp-mobile-app .modal{
            width:100% !important;
            max-width:100% !important;
            max-height:88dvh !important;
            border-radius:22px 22px 0 0 !important;
            overflow:auto !important;
            box-sizing:border-box !important;
          }

          body.nxp-mobile-app .mt{
            position:sticky !important;
            top:0 !important;
            z-index:3 !important;
            background:#fff !important;
          }

          body.nxp-mobile-app .sidebar{
            z-index:8000 !important;
          }

          body.nxp-mobile-app .topbar,
          body.nxp-mobile-app header{
            position:sticky !important;
            top:0 !important;
            z-index:60 !important;
            backdrop-filter:blur(14px) !important;
          }
        }
      `;
      const old = document.getElementById(PATCH_ID + '-css');
      if(old) old.remove();
      const st = document.createElement('style');
      st.id = PATCH_ID + '-css';
      st.textContent = css;
      document.head.appendChild(st);
      document.body && document.body.classList.add('nxp-mobile-app');
      console.log('  ✓ PARCHE-005 aplicado: estilo móvil app global');
    }catch(e){ console.error('  ✗ PARCHE-005 CSS falló:', e); }
  }

  function registrarPatchEnStorage(){
    try{
      const key='nx_changelog_auto';
      const log = JSON.parse(localStorage.getItem(key) || '[]');
      const existe = log.some(x => x && x.patch_id === PATCH_ID);
      if(!existe){
        log.unshift({
          patch_id: PATCH_ID,
          ts: new Date().toISOString(),
          usuario: (window.sesion && window.sesion.nom) || 'Sistema',
          version: PATCH_VERSION,
          descripcion: PATCH_ITEMS.join(' | '),
          resultado: 'Aplicada correctamente'
        });
        localStorage.setItem(key, JSON.stringify(log.slice(0,100)));
      }
    }catch(e){}
  }

  function insertarChangelogPatch(){
    try{
      const el = document.getElementById('changelogList');
      if(!el || document.getElementById('nxpPatchHistoryV2')) return;
      const card = document.createElement('div');
      card.id = 'nxpPatchHistoryV2';
      card.style.cssText = 'border:1px solid #dbeafe;border-radius:14px;margin-bottom:12px;overflow:hidden;background:#fff;box-shadow:0 10px 24px rgba(15,23,42,.06)';
      card.innerHTML = `
        <div style="background:linear-gradient(135deg,#eff6ff,#f8fafc);padding:12px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #dbeafe;flex-wrap:wrap">
          <span style="background:linear-gradient(135deg,#1e3a6e,#2563eb);color:#fff;font-size:11px;font-weight:800;padding:5px 12px;border-radius:20px">${PATCH_VERSION}</span>
          <span style="font-size:11px;color:#64748b">Aplicado por parches.js</span>
          <span style="margin-left:auto;font-size:10px;color:#2563eb;font-weight:800">MÓVIL / UI / CORRECCIÓN</span>
        </div>
        <div style="padding:12px 16px">
          <div style="font-size:12px;font-weight:800;color:#0f172a;margin-bottom:8px">Actualizaciones y correcciones aplicadas</div>
          <ul style="margin:0;padding-left:18px;font-size:11px;color:#334155;line-height:1.8">
            ${PATCH_ITEMS.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>`;
      el.prepend(card);
    }catch(e){ console.error('  ✗ PARCHE-005 changelog falló:', e); }
  }

  function instalarChangelogPersistente(){
    registrarPatchEnStorage();
    const correr = ()=>setTimeout(insertarChangelogPatch,80);
    correr();
    document.addEventListener('click', function(e){
      if(e.target && (e.target.closest('#changelogList') || e.target.closest('[onclick*="navConfig(10"]') || e.target.closest('[onclick*="Changelog"]'))){
        correr();
      }
    }, true);
    const timer = setInterval(insertarChangelogPatch, 1000);
    setTimeout(()=>clearInterval(timer), 20000);
  }

  instalarControlToastRefresh();

  function arrancar(){
    instalarEstiloMovilGlobal();
    instalarChangelogPersistente();
  }

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(arrancar, 120);
  }else{
    window.addEventListener('DOMContentLoaded', function(){ setTimeout(arrancar, 120); });
  }
})();
