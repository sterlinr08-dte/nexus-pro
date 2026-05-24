/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - BANCOS V67
   FIX DE CONFLICTO: limpia V64/V66 y deja Bancos como panel real
   PEGAR AL FINAL DE parches.js
   Luego cargar: parches.js?v=67

   Motivo:
   Había varias versiones activas al mismo tiempo:
   - V61: crea modal mBancos
   - V64: crea panel + botón que abre modal viejo
   - V66: crea otro panel, pero V64 seguía reconstruyéndose
   Este V67 neutraliza las versiones anteriores y usa un solo panel.
   ════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__NEXUS_BANCOS_V67__) return;
  window.__NEXUS_BANCOS_V67__ = true;

  let bancos = [];
  let ocultos = [];

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

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

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

  function api() {
    try { return (typeof API !== 'undefined' && API) ? API : null; }
    catch(e) { return null; }
  }

  function st() {
    try { return (typeof ST !== 'undefined' && ST) ? ST : {}; }
    catch(e) { return {}; }
  }

  function toastSafe(type, title, msg) {
    if (typeof toast === 'function') toast(type, title, msg);
    else alert(title + (msg ? '\n' + msg : ''));
  }

  function auditSafe(action, detail) {
    try {
      if (typeof logAudit === 'function') logAudit(action, detail, 'Bancos');
    } catch(e) {}
  }

  function user() {
    const s = st();
    return s.usuario || s.user || s.sessionUser || window.sessionUser || window.user || null;
  }

  function canManage() {
    const u = user();

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

    if (Array.isArray(permisos)) {
      return permisos.map(norm).includes('gestionar_bancos');
    }

    if (typeof permisos === 'object' && permisos) {
      return permisos.gestionar_bancos === true || permisos.bancos === true;
    }

    return false;
  }

  function deny() {
    if (canManage()) return false;
    toastSafe('err', 'Sin permiso', 'No tienes permiso para gestionar bancos.');
    return true;
  }

  function sortBanks(arr) {
    return [...arr].sort((a, b) => {
      if (norm(a.nombre) === 'otros') return 1;
      if (norm(b.nombre) === 'otros') return -1;
      return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es');
    });
  }

  async function loadBanks(force) {
    if (bancos.length && !force) return bancos;

    const a = api();

    try {
      if (a?.get) {
        const data = await a.get('bancos', 'select=*&order=nombre.asc');
        if (Array.isArray(data) && data.length) {
          bancos = sortBanks(data.map(b => ({
            id: b.id,
            nombre: b.nombre,
            activo: b.activo !== false
          })));
          return bancos;
        }
      }
    } catch(e) {
      console.warn('Bancos V67 fallback:', e);
    }

    bancos = sortBanks(FALLBACK.map(b => ({ ...b })));
    return bancos;
  }

  function duplicate(name, excludeId) {
    const n = norm(name);
    return bancos.some(b => norm(b.nombre) === n && String(b.id) !== String(excludeId || ''));
  }

  async function bankInUse(name) {
    const a = api();
    if (!a?.get) return false;

    try {
      const data = await a.get('abonos', 'select=id,banco&limit=5000');
      return Array.isArray(data) && data.some(x => norm(x.banco) === norm(name));
    } catch(e) {
      return false;
    }
  }

  async function refreshCobrosSelect() {
    if (typeof window.nxActualizarSelectBancoCobros === 'function') {
      try { await window.nxActualizarSelectBancoCobros(); } catch(e) {}
    }
  }

  function rootConfig() {
    return q('#v-config') || q('#config') || q('[data-view="config"]') || q('#v-sistema') || q('#sistema');
  }

  function tabsRoot(root) {
    if (!root) return null;

    return qa('div, nav, section', root).find(el => {
      const txt = norm(el.textContent || '');
      const buttons = el.querySelectorAll('button').length;

      return buttons >= 2 &&
        (
          txt.includes('apariencia') ||
          txt.includes('coberturas') ||
          txt.includes('empresa') ||
          txt.includes('notificacion') ||
          txt.includes('agentes') ||
          txt.includes('usuarios') ||
          txt.includes('roles') ||
          txt.includes('auditoria')
        );
    });
  }

  function removeOldBankUI() {
    [
      '#btnGestionarBancos',
      '#nxBtnConfigBancosV63',
      '#nxConfigTabBancosV64',
      '#nxPanelBancosConfigV64',
      '#nxConfigTabBancosV65',
      '#nxPanelBancosV65',
      '#nxConfigTabBancosV66',
      '#nxPanelBancosV66',
      '#nxBancoFallbackTabBarV66',
      '#mBancos'
    ].forEach(sel => q(sel)?.remove());
  }

  function createTab() {
    const root = rootConfig();
    if (!root) return;

    removeOldBankUI();

    if (q('#nxConfigTabBancosV67')) return;

    const btn = document.createElement('button');
    btn.id = 'nxConfigTabBancosV67';
    btn.type = 'button';
    btn.className = 'btn bghost';
    btn.innerHTML = '<i class="ti ti-building-bank"></i> BANCOS';
    btn.onclick = openPanel;

    const tabs = tabsRoot(root);

    if (tabs) {
      tabs.appendChild(btn);
    } else {
      const bar = document.createElement('div');
      bar.id = 'nxBancosTabBarV67';
      bar.className = 'nc p3';
      bar.style.marginBottom = '10px';
      bar.appendChild(btn);
      root.insertAdjacentElement('afterbegin', bar);
    }
  }

  function createPanel() {
    const root = rootConfig();
    if (!root) return null;

    let panel = q('#nxPanelBancosV67');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'nxPanelBancosV67';
    panel.className = 'nc p5';
    panel.style.display = 'none';
    panel.innerHTML = `
      <div class="ch nxBancosHeadV67">
        <div>
          <div class="ct">🏦 GESTIÓN DE BANCOS</div>
          <div class="ct-s">Administra los bancos disponibles para cobros por transferencia o depósito</div>
        </div>
        <button class="btn bsm bghost" type="button" onclick="window.nxCerrarBancosV67()">
          <i class="ti ti-arrow-left"></i> Volver
        </button>
      </div>

      <div class="nxBancosInfoV67">
        Este módulo controla los bancos que aparecen al registrar un cobro. El empleado solo selecciona; el administrador gestiona.
      </div>

      <div class="nxBancosFormV67">
        <div class="fr">
          <label>Nombre del banco</label>
          <input type="text" id="nxBancoNombreV67" placeholder="Ej: Banco López">
        </div>
        <button class="btn bxl bc1" type="button" onclick="window.nxAgregarBancoV67()">
          <i class="ti ti-plus"></i> Agregar banco
        </button>
      </div>

      <div class="div"></div>
      <div id="nxListaBancosV67"></div>
    `;

    const tabs = tabsRoot(root);

    if (tabs) tabs.insertAdjacentElement('afterend', panel);
    else root.insertAdjacentElement('afterbegin', panel);

    return panel;
  }

  function hideConfigForBanks() {
    const root = rootConfig();
    if (!root) return;

    hiddenRestore();

    const panel = q('#nxPanelBancosV67');
    const tab = q('#nxConfigTabBancosV67');
    const tabBar = tab ? tab.closest('.nc, .card, div, nav, section') : null;

    qa(':scope > *', root).forEach(el => {
      if (el === panel) return;
      if (el === tabBar || el.contains(tab)) return;
      if (el.id === 'nxBancosTabBarV67') return;

      const txt = norm(el.textContent || '');

      // No ocultar una barra clara de pestañas.
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

      ocultos.push([el, el.style.display || '']);
      el.style.display = 'none';
    });
  }

  function hiddenRestore() {
    ocultos.forEach(([el, display]) => {
      if (el && el.style) el.style.display = display;
    });

    ocultos = [];

    const panel = q('#nxPanelBancosV67');
    if (panel) panel.style.display = 'none';

    q('#nxConfigTabBancosV67')?.classList.remove('active', 'on');
  }

  async function openPanel() {
    if (deny()) return;

    removeOldBankUI();
    createTab();

    const panel = createPanel();
    if (!panel) return;

    hideConfigForBanks();

    panel.style.display = '';
    q('#nxConfigTabBancosV67')?.classList.add('active');

    await loadBanks(true);
    renderList();
  }

  function renderList() {
    const cont = q('#nxListaBancosV67');
    if (!cont) return;

    const allowed = canManage();

    if (!bancos.length) {
      cont.innerHTML = '<div class="nxBancosEmptyV67">No hay bancos registrados.</div>';
      return;
    }

    cont.innerHTML = `
      <div class="nxBancosListV67">
        ${bancos.map(b => `
          <div class="nxBancosRowV67">
            <div class="nxBancosBankV67">
              <div class="nxBancosNameV67">🏦 ${esc(b.nombre)}</div>
              <div class="nxBancosStateV67 ${b.activo ? 'ok' : 'off'}">${b.activo ? 'ACTIVO' : 'INACTIVO'}</div>
            </div>

            <div class="nxBancosActionsV67">
              <button class="btn bsm bghost" type="button" ${allowed ? '' : 'disabled'} onclick="window.nxEditarBancoV67('${esc(b.id)}')">
                <i class="ti ti-edit"></i> Editar
              </button>
              <button class="btn bsm ${b.activo ? 'bghost' : 'bc1'}" type="button" ${allowed ? '' : 'disabled'} onclick="window.nxToggleBancoV67('${esc(b.id)}')">
                <i class="ti ${b.activo ? 'ti-circle-off' : 'ti-check'}"></i> ${b.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn bsm bghost" type="button" ${allowed ? '' : 'disabled'} onclick="window.nxEliminarBancoV67('${esc(b.id)}')">
                <i class="ti ti-trash"></i> Eliminar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  async function addBank() {
    if (deny()) return;

    const input = q('#nxBancoNombreV67');
    const name = String(input?.value || '').trim();

    if (!name) {
      toastSafe('err', 'Nombre requerido', 'Escribe el nombre del banco.');
      return;
    }

    await loadBanks(true);

    if (duplicate(name)) {
      toastSafe('err', 'Banco duplicado', 'Ese banco ya existe.');
      return;
    }

    const a = api();

    if (!a?.post) {
      toastSafe('err', 'API no disponible', 'No se pudo guardar.');
      return;
    }

    try {
      await a.post('bancos', { nombre: name, activo: true });
      toastSafe('ok', 'Banco agregado', name);
      auditSafe('BANCO_AGREGADO', name);

      if (input) input.value = '';

      await loadBanks(true);
      await refreshCobrosSelect();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo agregar', 'Verifica duplicado o permisos.');
    }
  }

  async function editBank(id) {
    if (deny()) return;

    await loadBanks(true);

    const bank = bancos.find(b => String(b.id) === String(id));
    if (!bank) return;

    const next = prompt('Nuevo nombre del banco:', bank.nombre);
    if (next === null) return;

    const name = String(next || '').trim();

    if (!name) {
      toastSafe('err', 'Nombre requerido', 'El nombre no puede estar vacío.');
      return;
    }

    if (duplicate(name, id)) {
      toastSafe('err', 'Banco duplicado', 'Ya existe un banco con ese nombre.');
      return;
    }

    const a = api();

    if (!a?.patch) {
      toastSafe('err', 'API no disponible', 'No se pudo actualizar.');
      return;
    }

    try {
      await a.patch('bancos', 'id=eq.' + id, { nombre: name });
      toastSafe('ok', 'Banco actualizado', name);
      auditSafe('BANCO_EDITADO', bank.nombre + ' → ' + name);

      await loadBanks(true);
      await refreshCobrosSelect();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo editar', 'Verifica duplicado o permisos.');
    }
  }

  async function toggleBank(id) {
    if (deny()) return;

    await loadBanks(true);

    const bank = bancos.find(b => String(b.id) === String(id));
    if (!bank) return;

    const a = api();
    const active = !bank.activo;

    if (!a?.patch) {
      toastSafe('err', 'API no disponible', 'No se pudo actualizar.');
      return;
    }

    try {
      await a.patch('bancos', 'id=eq.' + id, { activo: active });
      toastSafe('ok', active ? 'Banco activado' : 'Banco desactivado', bank.nombre);
      auditSafe(active ? 'BANCO_ACTIVADO' : 'BANCO_DESACTIVADO', bank.nombre);

      await loadBanks(true);
      await refreshCobrosSelect();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo actualizar', 'Verifica permisos.');
    }
  }

  async function deleteBank(id) {
    if (deny()) return;

    await loadBanks(true);

    const bank = bancos.find(b => String(b.id) === String(id));
    if (!bank) return;

    if (!confirm('¿Seguro que deseas eliminar/desactivar este banco?\n\n' + bank.nombre)) return;

    const a = api();

    if (!a) {
      toastSafe('err', 'API no disponible', 'No se pudo eliminar.');
      return;
    }

    const used = await bankInUse(bank.nombre);

    if (used) {
      toastSafe('err', 'Banco en uso', 'Este banco tiene abonos asociados. Se desactivará.');

      try {
        await a.patch('bancos', 'id=eq.' + id, { activo: false });
        auditSafe('BANCO_DESACTIVADO_EN_USO', bank.nombre);
      } catch(e) {}

      await loadBanks(true);
      await refreshCobrosSelect();
      renderList();
      return;
    }

    if (!a.delete) {
      toastSafe('err', 'API no disponible', 'No se encontró API.delete.');
      return;
    }

    try {
      await a.delete('bancos', 'id=eq.' + id);
      toastSafe('ok', 'Banco eliminado', bank.nombre);
      auditSafe('BANCO_ELIMINADO', bank.nombre);

      await loadBanks(true);
      await refreshCobrosSelect();
      renderList();
    } catch(e) {
      console.error(e);
      toastSafe('err', 'No se pudo eliminar', 'Se desactivará en su lugar.');

      try { await a.patch('bancos', 'id=eq.' + id, { activo: false }); } catch(_) {}

      await loadBanks(true);
      await refreshCobrosSelect();
      renderList();
    }
  }

  function injectCSS() {
    if (q('#nx-bancos-v67-css')) return;

    const style = document.createElement('style');
    style.id = 'nx-bancos-v67-css';
    style.textContent = `
      #mAbono #btnGestionarBancos,
      #nxBtnConfigBancosV63,
      #nxConfigTabBancosV64,
      #nxPanelBancosConfigV64,
      #nxConfigTabBancosV65,
      #nxPanelBancosV65,
      #nxConfigTabBancosV66,
      #nxPanelBancosV66,
      #mBancos {
        display: none !important;
      }

      #nxConfigTabBancosV67 {
        white-space: nowrap !important;
      }

      #nxConfigTabBancosV67.active,
      #nxConfigTabBancosV67.on {
        background: #2563eb !important;
        color: #fff !important;
        border-color: #2563eb !important;
      }

      #nxPanelBancosV67 {
        border-top: 4px solid #d97706 !important;
      }

      .nxBancosInfoV67 {
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

      .nxBancosFormV67 {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: end;
        margin-bottom: 12px;
      }

      .nxBancosListV67 {
        display: grid;
        gap: 10px;
      }

      .nxBancosRowV67 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        background: #fff;
      }

      .nxBancosNameV67 {
        color: #0f172a;
        font-size: 14px;
        font-weight: 900;
      }

      .nxBancosStateV67 {
        margin-top: 3px;
        font-size: 11px;
        font-weight: 900;
      }

      .nxBancosStateV67.ok {
        color: #059669;
      }

      .nxBancosStateV67.off {
        color: #dc2626;
      }

      .nxBancosActionsV67 {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 6px;
      }

      .nxBancosActionsV67 button[disabled] {
        opacity: .45 !important;
        pointer-events: none !important;
      }

      .nxBancosEmptyV67 {
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 14px;
        padding: 18px;
        color: #64748b;
        font-weight: 800;
      }

      @media(max-width:768px) {
        #nxPanelBancosV67 .ch,
        .nxBancosHeadV67 {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
        }

        .nxBancosFormV67 {
          grid-template-columns: 1fr !important;
        }

        .nxBancosFormV67 .btn {
          width: 100% !important;
          min-height: 48px !important;
          justify-content: center !important;
        }

        .nxBancosRowV67 {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 10px !important;
          padding: 14px !important;
        }

        .nxBancosNameV67 {
          font-size: 16px !important;
          line-height: 1.2 !important;
          overflow-wrap: anywhere !important;
        }

        .nxBancosActionsV67 {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          width: 100% !important;
          gap: 6px !important;
        }

        .nxBancosActionsV67 .btn {
          width: 100% !important;
          min-width: 0 !important;
          min-height: 44px !important;
          font-size: 10px !important;
          padding: 6px 4px !important;
          justify-content: center !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }

        #nxBancoNombreV67 {
          min-height: 44px !important;
          font-size: 16px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  window.nxAgregarBancoV67 = addBank;
  window.nxEditarBancoV67 = editBank;
  window.nxToggleBancoV67 = toggleBank;
  window.nxEliminarBancoV67 = deleteBank;
  window.nxCerrarBancosV67 = hiddenRestore;

  function init() {
    injectCSS();
    removeOldBankUI();
    createTab();
    createPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  document.addEventListener('click', function () {
    setTimeout(function () {
      removeOldBankUI();
      createTab();
      createPanel();
    }, 350);
  }, true);
})();