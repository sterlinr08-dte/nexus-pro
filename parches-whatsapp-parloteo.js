/* 59.59 «Parloteo» — la ventana del chat de WhatsApp con el estilo del reel que mandó el dueño (25-oct-2026, «Chatea con
   tus clientes», moxen.studio: «mira esa ventana del chat, me gusta… no tenemos la animación cuando el cliente está
   escribiendo»). Eligió «la ventana del chat y sus funciones». El estilo vive en index.html (style#nxParloteo, desde el
   primer pintado); aquí solo lo que necesita JavaScript:
   1) degradado continuo: las burbujas enviadas comparten un solo degradado que va de arriba abajo de la pantalla del chat
      (cada burbuja muestra su franja: --pl-h es el alto del chat y --pl-y la posición de la burbuja; iOS ignora
      background-attachment:fixed, por eso se calcula);
   2) «✓✓ Leído 10:52» / «Entregado» / «Enviado» debajo del último mensaje enviado, si es el último del chat;
   3) placeholder corto «Mensaje» (el largo partía en dos líneas a 390 px);
   4) foco al dejar presionado un mensaje: el resto del chat se ve borroso mientras está abierto su menú (con la fila de
      reacciones rápidas que agrega parches-whatsapp-voz-mensajes.js);
   5) «escribiendo…» entre agentes: WhatsApp NO avisa cuando el CLIENTE escribe (Meta no lo manda a ningún sistema), así
      que los tres puntos salen cuando OTRO AGENTE está respondiendo ese mismo chat — evita dos respuestas a la vez.
      Va por un canal Realtime de difusión propio (nx-wa-escribiendo), aparte del canal del Buzón; solo viaja
      {hilo, id y primer nombre del agente}. No toca la carga, el envío ni la base de datos.
   Apagar: NX_PARLOTEO=false (todos) o localStorage nx_parloteo_off='1' (un equipo). */
(function () {
  'use strict';
  if (!document.documentElement.classList.contains('nx-parl')) return;
  if (window.__nxParloteo) return; window.__nxParloteo = true;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hiloAbierto = () => { try { return window.nxWaHiloAbierto ? window.nxWaHiloAbierto() : null; } catch (e) { return null; } };
  const api = () => { try { return typeof API !== 'undefined' ? API : window.API; } catch (e) { return window.API; } };
  const yo = (() => { try { const s = JSON.parse(sessionStorage.getItem('nx_sesion') || 'null'); return s ? { id: String(s.id || ''), n: String(s.nom || 'Agente').trim().split(/\s+/)[0] } : null; } catch (e) { return null; } })();
  const hora = v => { try { return new Date(v).toLocaleTimeString('es-DO', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };

  /* 1) degradado continuo */
  let raf = 0;
  function degradado() {
    raf = 0;
    const box = $('#nxWaMsgsBox'); if (!box) return;
    const bb = box.getBoundingClientRect(); if (!bb.height) return;
    box.style.setProperty('--pl-h', Math.round(bb.height) + 'px');
    for (const b of box.querySelectorAll('.nxWaBub.out')) {
      const r = b.getBoundingClientRect();
      if (r.bottom < bb.top - 60 || r.top > bb.bottom + 60) continue;
      const y = Math.round(r.top - bb.top);
      b.style.setProperty('--pl-y', y + 'px');
      b.style.setProperty('--pl-ty', (y + Math.round(r.height) - 14) + 'px'); // la colita (::before, 14 px abajo) sigue el mismo degradado
    }
  }
  const pedirDegradado = () => { if (!raf) raf = requestAnimationFrame(degradado); };
  document.addEventListener('scroll', e => { if (e.target && e.target.id === 'nxWaMsgsBox') pedirDegradado(); }, true);
  window.addEventListener('resize', pedirDegradado, { passive: true });

  /* 2) estado debajo del último enviado */
  function estadoUltimo() {
    const box = $('#nxWaMsgsBox'); if (!box) return;
    const wraps = box.querySelectorAll('.nxWaBubWrap');
    const ult = wraps[wraps.length - 1];
    box.querySelectorAll('.nxWaBubWrap[data-pl-estado]').forEach(w => { if (w !== ult) { w.removeAttribute('data-pl-estado'); w.removeAttribute('data-pl-st'); } });
    if (!ult || ult.classList.contains('in')) return;
    const bub = ult.querySelector('.nxWaBub'); if (!bub) return;
    const st = bub.getAttribute('data-nx-wa-estado') || '';
    let m = null; try { m = window.nxWaMensajeCargado ? window.nxWaMensajeCargado(bub.getAttribute('data-nx-wa-msg-id')) : null; } catch (e) {}
    const txt = st === 'leido' ? '✓✓ Leído' + (m && m.leido_at ? ' ' + hora(m.leido_at) : '') : st === 'entregado' ? '✓✓ Entregado' : st === 'enviado' ? '✓ Enviado' : '';
    if (!txt) { ult.removeAttribute('data-pl-estado'); ult.removeAttribute('data-pl-st'); return; }
    if (ult.getAttribute('data-pl-estado') !== txt) { ult.setAttribute('data-pl-estado', txt); ult.setAttribute('data-pl-st', st); }
  }

  /* 3) placeholder corto (una sola vez por caja de texto: otras capas no lo reescriben) */
  function placeholder() {
    const t = $('#nxWaTexto');
    if (t && !t.dataset.plPh) { t.dataset.plPh = '1'; t.setAttribute('placeholder', 'Mensaje'); }
  }

  /* 4) foco con el menú del mensaje abierto */
  function foco() {
    const p = document.querySelector('body > .nxWaMsgPro');
    const sel = document.querySelector('#nxWaMsgsBox .nxPlSel');
    const w = p && p.dataset.id ? document.getElementById('nxWaMsg-' + p.dataset.id) : null;
    if (sel && sel !== w) sel.classList.remove('nxPlSel');
    if (w) w.classList.add('nxPlSel');
    document.documentElement.classList.toggle('nx-parl-foco', !!w);
  }
  new MutationObserver(foco).observe(document.body, { childList: true });

  /* 5) «escribiendo…» entre agentes */
  const escriben = new Map(); // hilo → { n, hasta }
  let sb = null, canal = null, conectando = false, ultimoEnvio = 0, vence = 0;
  async function conectar() {
    if (sb || conectando || !yo || !window.supabase || !$('#v-waInbox.on')) return;
    const A = api(); if (!A || !A.url || !A.key) return;
    conectando = true;
    try {
      sb = window.supabase.createClient(A.url, A.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'nx-parloteo' } });
      if (A.token) { try { await sb.realtime.setAuth(A.token); } catch (e) {} }
      canal = sb.channel('nx-wa-escribiendo', { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'escribe' }, ({ payload }) => recibir(payload, true))
        .on('broadcast', { event: 'para' }, ({ payload }) => recibir(payload, false))
        .subscribe();
    } catch (e) { console.warn('[parloteo] realtime', e); sb = null; }
    conectando = false;
  }
  function recibir(p, escribe) {
    if (!p || !p.h || (yo && String(p.id) === yo.id)) return;
    if (escribe) escriben.set(String(p.h), { n: String(p.n || 'Otro agente').slice(0, 24), hasta: Date.now() + 5000 });
    else escriben.delete(String(p.h));
    pintarEscribiendo();
  }
  function avisar(evento) {
    const h = hiloAbierto(); if (!canal || !h || !yo) return;
    try { canal.send({ type: 'broadcast', event: evento, payload: { h, id: yo.id, n: yo.n } }); } catch (e) {}
  }
  document.addEventListener('input', e => {
    if (!e.target || e.target.id !== 'nxWaTexto') return;
    conectar();
    const lleno = !!e.target.value.trim();
    if (lleno && Date.now() - ultimoEnvio > 2500) { ultimoEnvio = Date.now(); avisar('escribe'); }
    else if (!lleno && ultimoEnvio) { ultimoEnvio = 0; avisar('para'); }
  }, true);
  // al enviar, la caja queda vacía sin evento input: se avisa «para» en el siguiente repintado
  function revisarEnvio() { const t = $('#nxWaTexto'); if (ultimoEnvio && t && !t.value.trim()) { ultimoEnvio = 0; avisar('para'); } }

  function pintarEscribiendo() {
    const h = hiloAbierto(); const x = h ? escriben.get(String(h)) : null;
    const activo = x && x.hasta > Date.now() ? x : null;
    if (x && !activo) escriben.delete(String(h));
    const box = $('#nxWaMsgsBox'), head = $('#v-waInbox .nxWaHead');
    let burb = box && box.querySelector(':scope > .nxPlTyping');
    if (activo && box) {
      const abajo = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
      if (!burb) { burb = document.createElement('div'); burb.className = 'nxPlTyping'; burb.setAttribute('role', 'status'); burb.innerHTML = '<span class="b" aria-hidden="true"><i></i><i></i><i></i></span><span class="n"></span>'; }
      if (burb.parentNode !== box || burb.nextSibling) box.appendChild(burb);
      burb.querySelector('.n').textContent = activo.n + ' está escribiendo…';
      if (abajo) box.scrollTop = box.scrollHeight;
    } else if (burb) burb.remove();
    if (head) {
      head.classList.toggle('nxPlEscribe', !!activo);
      const sub = head.querySelector('.nxWaHeadSub');
      let t = sub && sub.querySelector('.nxPlHeadTyping');
      if (activo && sub) { if (!t) { t = document.createElement('span'); t.className = 'nxPlHeadTyping'; sub.appendChild(t); } t.textContent = activo.n + ' escribiendo…'; } // corto: cabe en la cabecera a 390 px
      else if (t) t.remove();
    }
    clearTimeout(vence);
    if (activo) vence = setTimeout(pintarEscribiendo, Math.max(200, activo.hasta - Date.now() + 50));
  }
  // para pruebas y para quien quiera simularlo desde la consola
  window.nxParloteoEscribiendo = (h, n, ms) => { escriben.set(String(h), { n: String(n || 'Otro agente'), hasta: Date.now() + (ms || 5000) }); pintarEscribiendo(); };

  /* repintado: cada cambio del Buzón */
  let cola = false;
  function todo() {
    cola = false;
    if (!$('#v-waInbox')) return;
    placeholder(); estadoUltimo(); pintarEscribiendo(); revisarEnvio(); pedirDegradado();
    if (!sb && $('#v-waInbox.on')) conectar();
  }
  const pedir = () => { if (!cola) { cola = true; requestAnimationFrame(todo); } };
  function iniciar() {
    if (window.__nxWaObsBus && window.__nxWaObsBus.subscribe) window.__nxWaObsBus.subscribe(pedir);
    else new MutationObserver(pedir).observe($('#cnt') || document.body, { childList: true, subtree: true });
    pedir();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true }); else iniciar();
})();
