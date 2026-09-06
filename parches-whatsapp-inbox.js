/* NEXUS PRO · Inbox de WhatsApp (fase 2) — chat de dos vías + revisión de bauches.
   Mismo patrón de parches-crm-entrada.js (nav + vista nueva sin tocar index.html). */
(function () {
  'use strict';
  if (window.__nxWaInbox20260906) return;
  window.__nxWaInbox20260906 = true;

  const $ = s => document.querySelector(s);
  const esc = v => { try { return escHtml(String(v ?? '')); } catch (e) { return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); } };
  const getAPI = () => { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } };
  const clientes = () => { try { return (window.ST || ST || {}).clientes || []; } catch (e) { return []; } };

  let hilos = [], hiloAbiertoId = null, mensajes = [];
  let sb = null, canal = null;

  function css() {
    if ($('#nxWaInboxCss')) return;
    const s = document.createElement('style'); s.id = 'nxWaInboxCss'; s.textContent = `
#v-waInbox{font-family:'Plus Jakarta Sans','Segoe UI',system-ui,sans-serif}
#v-waInbox .nxWaShell{display:grid;grid-template-columns:300px 1fr;gap:12px;height:calc(100vh - 140px);min-height:480px}
#v-waInbox .nxWaCol{background:var(--sf-card,#fff);border:1px solid var(--sf-line,#e5eaf2);border-radius:15px;overflow:hidden;display:flex;flex-direction:column}
#v-waInbox .nxWaListScroll{overflow-y:auto;flex:1}
#v-waInbox .nxWaRow{display:flex;gap:9px;padding:11px;border-bottom:1px solid var(--sf-line,#eef2f7);cursor:pointer}
#v-waInbox .nxWaRow:hover{background:#f8fafc}
#v-waInbox .nxWaRow.on{background:#eaf1ff}
#v-waInbox .nxWaAv{width:34px;height:34px;border-radius:50%;background:#eaf1ff;color:#1d4ed8;display:grid;place-items:center;font-size:11px;font-weight:800;flex:none}
#v-waInbox .nxWaWho{min-width:0;flex:1}
#v-waInbox .nxWaWho b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaWho span{display:block;font-size:9.5px;color:#667085;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v-waInbox .nxWaBadge{background:#dc2626;color:#fff;border-radius:999px;font-size:8.5px;font-weight:800;padding:1px 6px;flex:none}
#v-waInbox .nxWaDetalle{display:flex;flex-direction:column;height:100%}
#v-waInbox .nxWaHead{padding:11px;border-bottom:1px solid var(--sf-line,#eef2f7);font-size:11px;font-weight:800}
#v-waInbox .nxWaMsgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:7px;background:#f6f8fb}
#v-waInbox .nxWaBub{max-width:70%;padding:8px 10px;border-radius:10px;font-size:11.5px;line-height:1.4}
#v-waInbox .nxWaBub.in{align-self:flex-start;background:#fff;border:1px solid #e5eaf2}
#v-waInbox .nxWaBub.out{align-self:flex-end;background:#dcf8c6}
#v-waInbox .nxWaBub img{max-width:220px;border-radius:8px;display:block;cursor:pointer}
#v-waInbox .nxWaComposer{display:flex;gap:7px;padding:10px;border-top:1px solid var(--sf-line,#eef2f7)}
#v-waInbox .nxWaComposer input{flex:1;border:1px solid #dbe3ee;border-radius:9px;padding:9px;font:inherit;font-size:11.5px}
#v-waInbox .nxWaComposer button{border:0;background:#2563eb;color:#fff;border-radius:9px;padding:0 14px;font-weight:800;cursor:pointer}
#v-waInbox .nxWaCerrada{padding:10px;text-align:center;font-size:10.5px;color:#92400e;background:#fff7ed;border-top:1px solid #fed7aa}
#v-waInbox .nxWaEmpty{padding:24px;text-align:center;color:#64748b;font-size:10.5px}
#v-waInbox .nxWaPend{border:1px solid #e5eaf2;border-radius:11px;padding:9px;display:flex;gap:9px;align-items:center;margin-bottom:7px}
#v-waInbox .nxWaPend img{width:44px;height:44px;object-fit:cover;border-radius:8px;flex:none}
#v-waInbox .nxWaPend .acts{display:flex;gap:6px;margin-left:auto}
#v-waInbox .nxWaPend button{border:1px solid #dbe3ee;border-radius:8px;background:#fff;font-size:9.5px;font-weight:800;padding:6px 9px;cursor:pointer}
#v-waInbox .nxWaPend button.primary{background:#2563eb;border-color:#2563eb;color:#fff}
    `; document.head.appendChild(s);
  }

  function ensureView() {
    let v = $('#v-waInbox'); if (v) return v;
    v = document.createElement('div'); v.id = 'v-waInbox'; v.className = 'view nxSf';
    const ref = $('#v-crm') || $('#v-clientes');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.querySelector('.main')?.appendChild(v);
    return v;
  }

  function ensureMenu() {
    if ($('#nxWaInboxNav')) return $('#nxWaInboxNav');
    const crm = $('#nxCrmNav') || [...document.querySelectorAll('#sbNav .ni')].find(n => (n.getAttribute('onclick') || '').includes("nav('clientes'"));
    if (!crm || !crm.parentNode) return null;
    const n = document.createElement('div'); n.className = 'ni'; n.id = 'nxWaInboxNav';
    n.setAttribute('onclick', "nav('waInbox',this)"); n.setAttribute('tabindex', '0'); n.setAttribute('role', 'button');
    n.innerHTML = '<i class="ti ti-brand-whatsapp ni-i"></i><span class="ni-l">WhatsApp</span>';
    crm.parentNode.insertBefore(n, crm.nextSibling);
    return n;
  }

  function patchNav() {
    try {
      if (typeof nav === 'function' && !nav.__nxWaInboxEntry) {
        const o = nav, n = function (view, el) { if (view === 'waInbox') return open(el); return o.apply(this, arguments); };
        n.__nxWaInboxEntry = 1; nav = window.nav = n;
      }
    } catch (e) { console.error('[WA Inbox] nav', e); }
  }

  function open(el) {
    css(); ensureMenu(); const v = ensureView();
    document.querySelectorAll('.view').forEach(x => x.classList.remove('on')); v.classList.add('on');
    document.querySelectorAll('#sbNav .ni').forEach(x => x.classList.remove('on'));
    (el && el.classList ? el : $('#nxWaInboxNav'))?.classList.add('on');
    render();
    cargar();
    return false;
  }
  window.nxAbrirWaInbox = open;

  // ── Datos ──────────────────────────────────────────────────────────────
  async function cargar() {
    const A = api(); if (!A?.get) return;
    try { hilos = await A.get('whatsapp_hilos', 'order=ultimo_mensaje_at.desc.nullslast&select=*') || []; } catch (e) { hilos = []; }
    if (hiloAbiertoId) await cargarMensajes(hiloAbiertoId);
    pintar();
  }
  function api() { try { return getAPI(); } catch (e) { return null; } }

  async function urlFirmada(path) {
    const A = api(); if (!A) return null;
    try {
      const r = await fetch(`${A.url}/storage/v1/object/sign/whatsapp-inbox-media/${path}`, {
        method: 'POST',
        headers: { apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key), 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 3600 })
      });
      if (!r.ok) return null;
      const d = await r.json();
      return `${A.url}/storage/v1${d.signedURL || d.signedUrl}`;
    } catch (e) { return null; }
  }

  async function cargarMensajes(hiloId) {
    const A = api(); if (!A?.get) return;
    try {
      mensajes = await A.get('whatsapp_hilo_mensajes', `hilo_id=eq.${hiloId}&order=created_at.asc&select=*`) || [];
      for (const m of mensajes) { if (m.media_path) m._url = await urlFirmada(m.media_path); }
    } catch (e) { mensajes = []; }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function iniciales(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0] || '').join('').toUpperCase() || '?'; }
  function horaRel(iso) {
    if (!iso) return ''; const d = new Date(iso), min = Math.round((Date.now() - d.getTime()) / 60000);
    if (min < 1) return 'ahora'; if (min < 60) return min + ' min'; const h = Math.round(min / 60);
    if (h < 24) return h + ' h'; return Math.round(h / 24) + ' d';
  }

  function render() {
    const v = ensureView();
    v.innerHTML = `<div class="nxCrmHomeHead"><div><span class="nxCrmHomeBadge"><i class="ti ti-brand-whatsapp"></i> WhatsApp</span><h1>Inbox</h1><p>Conversaciones con clientes — preguntas y comprobantes de pago.</p></div></div>
      <div id="nxWaPendPanel" style="margin-bottom:12px"></div>
      <div class="nxWaShell">
        <div class="nxWaCol"><div class="nxWaListScroll" id="nxWaLista"></div></div>
        <div class="nxWaCol"><div class="nxWaDetalle" id="nxWaDetalle"></div></div>
      </div>`;
    pintar();
  }

  function pintar() {
    if (!$('#v-waInbox.on')) return;
    pintarPendientes();
    pintarLista();
    pintarDetalle();
  }

  function pintarPendientes() {
    const host = $('#nxWaPendPanel'); if (!host) return;
    const pendientes = mensajesPendientesCache;
    host.innerHTML = `<section class="nxCrmPanel"><div class="nxCrmPH"><h3>Bauches pendientes de revisar</h3></div><div class="nxCrmList" id="nxWaPendList"><div class="nxCrmEmpty">Cargando…</div></div></section>`;
    cargarPendientes();
  }

  let mensajesPendientesCache = [];
  async function cargarPendientes() {
    const A = api(); if (!A?.get) return;
    let filas = [];
    try { filas = await A.get('whatsapp_hilo_mensajes', "revision_pago_estado=eq.pendiente&order=created_at.asc&select=*") || []; } catch (e) { filas = []; }
    mensajesPendientesCache = filas;
    const list = $('#nxWaPendList'); if (!list) return;
    if (!filas.length) { list.innerHTML = '<div class="nxCrmEmpty">No hay bauches pendientes. Todo revisado.</div>'; return; }
    const filasHtml = await Promise.all(filas.map(async m => {
      const h = hilos.find(x => x.id === m.hilo_id);
      const nombre = h?.nombre_perfil || h?.telefono_e164 || 'Cliente';
      const cliente = h?.cliente_id ? clientes().find(c => String(c.id) === String(h.cliente_id)) : null;
      const url = m.media_path ? await urlFirmada(m.media_path) : null;
      return `<div class="nxWaPend"><img src="${url || ''}" alt="bauche"><div><b>${esc(cliente?.nom || nombre)}</b><div style="font-size:9.5px;color:#64748b">${esc(h?.telefono_e164 || '')}</div></div>
        <div class="acts">
          ${h?.cliente_id ? `<button class="primary" onclick="nxWaAplicarBauche('${m.id}','${h.cliente_id}')">Aplicar como pago</button>` : `<span style="font-size:9px;color:#dc2626">Sin cliente vinculado</span>`}
          <button onclick="nxWaDescartarBauche('${m.id}')">Descartar</button>
        </div></div>`;
    }));
    list.innerHTML = filasHtml.join('');
  }

  window.nxWaAplicarBauche = function (mensajeId, clienteId) {
    const m = mensajesPendientesCache.find(x => x.id === mensajeId); if (!m) return;
    window.__nxWaRevisionPendiente = mensajeId;
    try { abrirAbono(clienteId); } catch (e) { toast('err', 'No se pudo abrir el registro de pago'); return; }
    urlFirmada(m.media_path).then(url => {
      setTimeout(() => { if (window.nxBaucheAsignarExterno) window.nxBaucheAsignarExterno('wa-media:' + m.media_path, url); }, 180);
    });
  };
  window.nxWaDescartarBauche = async function (mensajeId) {
    const A = api(); if (!A?.post) return;
    try { await A.post('rpc/whatsapp_resolver_revision_pago', { p_mensaje_id: mensajeId, p_estado: 'descartado' }); toast('ok', 'Descartado'); cargarPendientes(); } catch (e) { toast('err', 'No se pudo descartar'); }
  };

  // Se dispara despues de que regAbono() completa exitosamente, para cerrar la revision
  // pendiente que quedo marcada en nxWaAplicarBauche. Ver parches-seguros-base.js.
  window.nxWaResolverTrasAbono = async function (abonoId) {
    const mensajeId = window.__nxWaRevisionPendiente; if (!mensajeId) return;
    window.__nxWaRevisionPendiente = null;
    const A = api(); if (!A?.post) return;
    try { await A.post('rpc/whatsapp_resolver_revision_pago', { p_mensaje_id: mensajeId, p_estado: 'aplicado', p_abono_id: abonoId }); cargarPendientes(); } catch (e) {}
  };

  function pintarLista() {
    const cont = $('#nxWaLista'); if (!cont) return;
    if (!hilos.length) { cont.innerHTML = '<div class="nxWaEmpty">Todavía no han llegado mensajes.</div>'; return; }
    cont.innerHTML = hilos.map(h => {
      const nombre = h.nombre_perfil || h.telefono_e164 || 'Sin nombre';
      const cliente = h.cliente_id ? clientes().find(c => String(c.id) === String(h.cliente_id)) : null;
      const on = h.id === hiloAbiertoId ? ' on' : '';
      return `<div class="nxWaRow${on}" onclick="nxWaAbrirHilo('${h.id}')">
        <div class="nxWaAv">${esc(iniciales(cliente?.nom || nombre))}</div>
        <div class="nxWaWho"><b>${esc(cliente?.nom || nombre)}</b><span>${esc(h.ultimo_mensaje_preview || '')}</span></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span style="font-size:8.5px;color:#94a3b8">${horaRel(h.ultimo_mensaje_at)}</span>
          ${h.no_leidos_count ? `<span class="nxWaBadge">${h.no_leidos_count}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  window.nxWaAbrirHilo = async function (id) {
    hiloAbiertoId = id;
    const h = hilos.find(x => x.id === id);
    if (h && h.no_leidos_count) { h.no_leidos_count = 0; try { await api().post('rpc/whatsapp_marcar_hilo_leido', { p_hilo_id: id }); } catch (e) {} }
    await cargarMensajes(id);
    pintarLista(); pintarDetalle();
  };

  function burbujaMedia(m) {
    if (!m.media_path) return '';
    if (!m._url) return '<div style="font-size:10px;color:#94a3b8">📎 Adjunto no disponible</div>';
    if (m.tipo_contenido === 'imagen') return `<img src="${m._url}" onclick="window.open('${m._url}','_blank')">`;
    if (m.tipo_contenido === 'audio') return `<audio controls src="${m._url}" style="width:220px"></audio>`;
    if (m.tipo_contenido === 'video') return `<video controls src="${m._url}" style="max-width:220px"></video>`;
    return `<a href="${m._url}" target="_blank">📎 Ver documento</a>`;
  }

  function pintarDetalle() {
    const cont = $('#nxWaDetalle'); if (!cont) return;
    if (!hiloAbiertoId) { cont.innerHTML = '<div class="nxWaEmpty">Selecciona una conversación.</div>'; return; }
    const h = hilos.find(x => x.id === hiloAbiertoId);
    const cliente = h?.cliente_id ? clientes().find(c => String(c.id) === String(h.cliente_id)) : null;
    const ventanaAbierta = h?.ultimo_inbound_at && (Date.now() - new Date(h.ultimo_inbound_at).getTime()) < 24 * 3600000;
    const filas = mensajes.map(m => `<div class="nxWaBub ${m.direccion}">${burbujaMedia(m)}${m.cuerpo ? esc(m.cuerpo) : ''}</div>`).join('') || '<div class="nxWaEmpty">Sin mensajes todavía.</div>';
    cont.innerHTML = `<div class="nxWaHead">${esc(cliente?.nom || h?.nombre_perfil || h?.telefono_e164 || '')}</div>
      <div class="nxWaMsgs" id="nxWaMsgsBox">${filas}</div>
      ${ventanaAbierta
        ? `<div class="nxWaComposer"><input id="nxWaTexto" placeholder="Escribe un mensaje…" onkeydown="if(event.key==='Enter')nxWaEnviar()"><button onclick="nxWaEnviar()"><i class="ti ti-send"></i></button></div>`
        : `<div class="nxWaCerrada">Pasaron más de 24h desde el último mensaje del cliente — espera a que vuelva a escribir para poder responder con texto libre.</div>`}`;
    const box = $('#nxWaMsgsBox'); if (box) box.scrollTop = box.scrollHeight;
  }

  window.nxWaEnviar = async function () {
    const inp = $('#nxWaTexto'); if (!inp) return;
    const texto = inp.value.trim(); if (!texto) return;
    const hiloDestino = hiloAbiertoId; if (!hiloDestino) return;
    inp.value = ''; inp.disabled = true;
    const A = api();
    try {
      const r = await fetch(`${A.url}/functions/v1/whatsapp-inbox-enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: A.key, Authorization: 'Bearer ' + (A.token || A.key) },
        body: JSON.stringify({ hilo_id: hiloDestino, mensaje: texto })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { toast('err', 'No se pudo enviar', d.mensaje || d.error || ''); inp.value = texto; }
      else { if (hiloAbiertoId === hiloDestino) { await cargarMensajes(hiloDestino); pintarDetalle(); } await cargar(); }
    } catch (e) { toast('err', 'No se pudo enviar', String(e && e.message || e)); inp.value = texto; }
    inp.disabled = false; inp.focus();
  };

  // ── Tiempo real ────────────────────────────────────────────────────────
  async function iniciarRealtime() {
    if (sb) return;
    try {
      if (!window.supabase) await cargarSDK();
      const A = api(); if (!A || !window.supabase) return;
      sb = window.supabase.createClient(A.url, A.key);
      if (A.token) try { sb.realtime.setAuth(A.token); } catch (e) {}
      let debounce = null;
      const refrescar = () => { if (debounce) clearTimeout(debounce); debounce = setTimeout(() => { if ($('#v-waInbox.on')) cargar(); }, 400); };
      canal = sb.channel('nx-wa-inbox')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_hilos' }, refrescar)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_hilo_mensajes' }, refrescar)
        .subscribe();
    } catch (e) { console.error('[WA Inbox] realtime', e); }
  }
  // Primera vez que este codigo usa el SDK de supabase-js en nexus-pro (el resto de la app
  // habla PostgREST/Storage a mano por fetch) -- solo hace falta aca, para Realtime
  // (postgres_changes), que si requiere el SDK. Build UMD: expone window.supabase.
  function cargarSDK() {
    return new Promise((resolve) => {
      if (window.supabase) return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
  }

  // Otro wrap más de window.regAbono (ya conviven varios en esta app, ver
  // parches-seguros-base.js) -- solo cierra la revisión de bauche pendiente cuando
  // el pago se aplicó desde este inbox (window.__nxWaRevisionPendiente marcado en
  // nxWaAplicarBauche). No hace nada si el abono se registró por el flujo normal.
  function envolverRegAbono() {
    if (window.__nxWaRegAbonoWrap) return true;
    if (typeof window.regAbono !== 'function') return false;
    window.__nxWaRegAbonoWrap = true;
    const orig = window.regAbono;
    window.regAbono = async function () {
      const before = window._ultimoAbono;
      const r = await orig.apply(this, arguments);
      const after = window._ultimoAbono;
      if (after && after !== before && after.abonoId && window.__nxWaRevisionPendiente) {
        try { await window.nxWaResolverTrasAbono(after.abonoId); } catch (e) {}
      }
      return r;
    };
    return true;
  }

  function start() {
    css(); ensureMenu(); patchNav(); iniciarRealtime();
    let n = 0; const t = () => { n++; if (envolverRegAbono() || n > 120) return; setTimeout(t, 250); };
    t();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
