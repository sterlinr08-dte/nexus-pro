/* ════════════════════════════════════════════════════════════════
   NEXUS PRO - GESTIÓN DE BANCOS V61
   PEGAR ESTE BLOQUE AL FINAL DE parches.js

   Requiere:
   - tabla bancos creada en Supabase
   - columna abonos.banco creada
   - el sistema usa ST y API directos
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
      sinOtros.map(b => `<option value="${esc(b.nombre)}">${esc(b.nombre)}</option>`).join('') +
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
      divBanco.innerHTML = `
        <label>Banco *</label>
        <select id="aBanco" style="width:100%">
          <option value="">Seleccionar banco...</option>
        </select>
      `;

      const divOtros = document.createElement('div');
      divOtros.className = 'fr';
      divOtros.id = 'aBancoOtrosCont';
      divOtros.style.display = 'none';
      divOtros.innerHTML = `
        <label>Especificar banco *</label>
        <input type="text" id="aBancoOtros" placeholder="Nombre del banco" style="width:100%">
      `;

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

    cont.innerHTML = `
      <div style="display:grid;gap:8px">
        ${bancosCache.map(b => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">
            <div>
              <div style="font-weight:900;color:#0f172a">🏦 ${esc(b.nombre)}</div>
              <div style="font-size:11px;color:${b.activo ? '#059669' : '#dc2626'};font-weight:800">
                ${b.activo ? 'Activo' : 'Inactivo'}${b.fallback ? ' · Temporal' : ''}
              </div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
              <button class="btn bsm bghost" type="button" onclick="window.nxEditarBanco('${esc(b.id)}')">
                <i class="ti ti-edit"></i> Editar
              </button>
              <button class="btn bsm ${b.activo ? 'bghost' : 'bc1'}" type="button" onclick="window.nxToggleBanco('${esc(b.id)}')">
                <i class="ti ${b.activo ? 'ti-circle-off' : 'ti-check'}"></i> ${b.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button class="btn bsm bghost" type="button" onclick="window.nxEliminarBanco('${esc(b.id)}')">
                <i class="ti ti-trash"></i> Eliminar
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
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
      await api.patch('bancos', `id=eq.${id}`, { nombre: nuevoNombre });
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
      await api.patch('bancos', `id=eq.${id}`, { activo: nuevo });
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
        try { await api.patch('bancos', `id=eq.${id}`, { activo: false }); } catch (e) {}
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
      await api.delete('bancos', `id=eq.${id}`);
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