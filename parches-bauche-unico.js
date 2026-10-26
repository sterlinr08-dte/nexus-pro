/* NEXUS PRO · 59.25 — «Que no se repita el mismo bauche de pago» (dueño, 14-oct-2026).
   Al adjuntar un comprobante en «Registrar pago» (subido, pegado o traído de WhatsApp) se verifica antes de guardar:
     1) huella exacta del archivo (SHA-256) y el mismo archivo guardado,
     2) número de transacción leído por Claude (Edge «comprobante-leer»; si no responde, sigue la 1).
     (La huella visual dHash se guarda como dato, pero no bloquea: recibos distintos del mismo banco salen casi iguales.)
   Un mismo depósito puede pagar a varios clientes: se permite mientras la suma de los pagos no pase del monto del
   comprobante («compartido»). Si se pasa, o no se sabe el monto: se BLOQUEA y solo un administrador puede aprobarlo
   escribiendo el motivo (opción B).
   El servidor lo vuelve a comprobar en la RPC comprobante_registrar (no se puede saltar desde el navegador), y después
   de guardar el pago el comprobante queda vinculado a ese pago (comprobante_vincular).
   No cambia la lógica del cobro: envuelve regAbono() por fuera, igual que la capa del bauche (parches-seguros-base.js).
   Para apagarla: borrar su línea en parches-seguros.js, o en un equipo localStorage.nxBaucheUnico='0'. */
(function () {
  'use strict';
  if (window.__nxBaucheUnico) return; window.__nxBaucheUnico = true;
  try { if (localStorage.getItem('nxBaucheUnico') === '0') return; } catch (e) {}

  const api = () => { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } };
  const ses = () => { try { return (typeof sesion !== 'undefined') ? sesion : null; } catch (e) { return null; } };
  const esAdmin = () => { const s = ses(); return !!(s && s.rol === 'admin'); };
  const toast = (t, a, b) => { try { window.toast && window.toast(t, a, b || ''); } catch (e) {} };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => { try { return typeof window.fmt === 'function' ? window.fmt(n) : 'RD$ ' + Number(n || 0).toLocaleString('en-US'); } catch (e) { return 'RD$ ' + n; } };
  const fecha = f => { if (!f) return ''; const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(f)); if (m) return m[3] + '/' + m[2] + '/' + m[1]; const d = new Date(f); return isNaN(d) ? String(f).slice(0, 10) : d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');

  // Estado de la verificación del comprobante adjunto ahora mismo en la ventana de pago.
  let V = null; // {ref, estado:'verificando'|'nuevo'|'repetido'|'error', sha, dhash, ia, coinc:[], aprobado, motivo, promesa}

  /* ── Huellas en el navegador ── */
  async function urlParaLeer(ref, preview) {
    if (ref.indexOf('wa-media:') !== 0) return ref;
    if (preview && /^https?:/.test(preview)) return preview;
    const a = api(); const path = ref.slice(9);
    const r = await fetch(`${a.url}/storage/v1/object/sign/whatsapp-inbox-media/${path}`, { method: 'POST', headers: { apikey: a.key, Authorization: 'Bearer ' + (a.token || a.key), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 600 }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(); return `${a.url}/storage/v1${d.signedURL || d.signedUrl}`;
  }
  async function dHash(blob) {
    if (!/^image\//.test(blob.type || 'image/')) return null;
    const bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas'); c.width = 9; c.height = 8;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0, 9, 8);
    const px = x.getImageData(0, 0, 9, 8).data; let bits = '';
    const g = (cx, cy) => { const i = (cy * 9 + cx) * 4; return px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114; };
    for (let y = 0; y < 8; y++) for (let k = 0; k < 8; k++) bits += g(k, y) > g(k + 1, y) ? '1' : '0';
    let h = ''; for (let i = 0; i < 64; i += 4) h += parseInt(bits.slice(i, i + 4), 2).toString(16);
    try { bmp.close && bmp.close(); } catch (e) {}
    return h;
  }
  async function leerIA(ref) {
    // 59.58: si la foto vino por WhatsApp y el servidor ya la leyó al llegar (bauche-auto-leer), se usa esa lectura.
    try { const pre = window.__nxBaucheIaPre; if (pre && pre.ref === ref && pre.ia) { window.__nxBaucheIaPre = null; return { ia: pre.ia, err: null }; } } catch (e) {}
    const a = api(); if (!a || !a.token) return null;
    try {
      const r = await fetch(`${a.url}/functions/v1/comprobante-leer`, { method: 'POST', headers: { apikey: a.key, Authorization: 'Bearer ' + a.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ ref }) });
      if (!r.ok) return { ia: null, err: 'red' }; const d = await r.json();
      return { ia: d && d.ok && d.ia && !d.ia.error ? d.ia : null, err: (d && d.ia_error) || null };
    } catch (e) { return { ia: null, err: 'red' }; }
  }
  async function rpc(fn, body) {
    const a = api(); const r = await fetch(`${a.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: a.hdr(), body: JSON.stringify(body) });
    const tx = await r.text(); let d = null; try { d = tx ? JSON.parse(tx) : null; } catch (e) { d = tx; }
    if (!r.ok) { const err = new Error((d && (d.message || d.error)) || ('HTTP ' + r.status)); err.detalle = d && d.details; throw err; }
    return d;
  }

  /* ── Verificar el comprobante adjunto ── */
  async function verificar(ref, preview) {
    const v = V = { ref, estado: 'verificando', sha: null, dhash: null, ia: null, coinc: [], aprobado: false, motivo: '' };
    pintar();
    v.promesa = (async () => {
      try {
        const u = await urlParaLeer(ref, preview);
        const resp = await fetch(u); if (!resp.ok) throw new Error('No se pudo leer el archivo (' + resp.status + ')');
        const blob = await resp.blob();
        v.sha = hex(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
        try { v.dhash = await dHash(blob); } catch (e) { v.dhash = null; }
      } catch (e) { console.warn('[bauche único] huella', e); }
      if (V !== v) return;
      const li = await leerIA(ref) || {};
      v.ia = li.ia || null; v.iaErr = v.ia ? null : (li.err || null);
      if (V !== v) return;
      try {
        v.coinc = await rpc('comprobante_buscar', { p_sha256: v.sha, p_dhash: v.dhash, p_numero: v.ia && v.ia.numero_transaccion || null, p_storage_ref: ref }) || [];
        v.estado = v.coinc.length ? 'repetido' : 'nuevo';
        evaluar(v);
        // 59.56 «smart»: sin coincidencia exacta, ¿otro comprobante con el mismo monto, fecha y banco, y además la misma
        // hora o la misma persona que envía? (solo monto+fecha+banco da falsos: cuotas iguales el mismo día). Solo avisa.
        if (v.estado === 'nuevo' && v.ia && v.ia.es_comprobante !== false && Number(v.ia.monto) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(v.ia.fecha || '') && (v.ia.hora || v.ia.ordenante)) {
          try {
            v.parecidos = await rpc('comprobante_parecidos', { p_monto: Number(v.ia.monto), p_fecha: v.ia.fecha, p_banco: v.ia.banco || null, p_cuenta: v.ia.cuenta_destino || null, p_excluir_ref: ref, p_hora: v.ia.hora || null, p_ordenante: v.ia.ordenante || null }) || [];
            if (v.parecidos.length) v.estado = 'parecido';
          } catch (e) { v.parecidos = []; }
        }
      } catch (e) { v.estado = 'error'; v.error = e.message; }
      if (V !== v) return;
      autollenar(v); pintar();
      if (v.estado === 'repetido') { try { navigator.vibrate && navigator.vibrate([30, 60, 30]); } catch (e) {} }
    })();
    return v.promesa;
  }

  // Lo que leyó Claude ayuda a llenar el formulario: la referencia real del banco y el banco, si están vacíos.
  function autollenar(v) {
    const ia = v.ia; if (!ia || ia.es_comprobante === false) return;
    const ref = document.getElementById('aRef');
    if (ref && ia.numero_transaccion && !ref.value.trim()) { ref.value = ia.numero_transaccion; ref.dispatchEvent(new Event('input', { bubbles: true })); v.refAuto = true; }
    const sel = document.getElementById('aBanco');
    if (sel && ia.banco && !sel.value) {
      const w = String(ia.banco).toLowerCase().replace(/banco|dominicano|de|s\.?a\.?/g, ' ').trim().split(/\s+/)[0];
      const op = w && [...sel.options].find(o => o.value && o.text.toLowerCase().includes(w));
      if (op) { sel.value = op.value; sel.dispatchEvent(new Event('change', { bubbles: true })); v.bancoAuto = op.text; }
    }
    cobroRapido(v);
  }

  /* 59.58 «Cobro rápido con el bauche» (dueño, 25-oct-2026). Con lo que leyó la IA se llena el resto del cobro:
     método Transferencia (si seguía en Efectivo), el MONTO DEL BAUCHE (decisión del dueño: «pone el del bauche y avisa»;
     si pasa lo que debe, NEXUS ya lo trata como adelanto) y la cuenta de destino según el historial
     (RPC comprobante_cuenta_sugerida: a qué cuenta se asignaron antes los bauches con esa misma cuenta). Nunca registra:
     el agente revisa y toca «Registrar». Se hace una sola vez por bauche; lo que el agente cambie después se respeta. */
  async function cobroRapido(v) {
    const ia = v.ia; if (!ia || ia.es_comprobante === false || v.rapido) return;
    v.rapido = true;
    const met = document.getElementById('aMet');
    if (met && (!met.value || met.value === 'Efectivo')) {
      met.value = 'Transferencia'; met.dispatchEvent(new Event('change', { bubbles: true }));
      try { if (typeof window.nxChipsSync === 'function') window.nxChipsSync('mAbono'); } catch (e) {}
      v.metAuto = true;
    }
    const monto = Number(ia.monto);
    const mnt = document.getElementById('aMnt');
    if (mnt && monto > 0) {
      mnt.value = window.nxMoney && window.nxMoney.format ? window.nxMoney.format(String(monto)) : String(monto);
      mnt.dispatchEvent(new Event('input', { bubbles: true }));
      v.montoAuto = monto;
      try { const c = (window.ST || ST).clientes.find(x => x.id === abonoCliId); v.deuda = c && typeof pend === 'function' ? Number(pend(c)) || 0 : null; } catch (e) { v.deuda = null; }
    }
    if (ia.cuenta_destino) {
      try {
        const sug = await rpc('comprobante_cuenta_sugerida', { p_cuenta: String(ia.cuenta_destino) });
        const sel = document.getElementById('aDirectoCuenta');
        if (V === v && sug && sug.agente_id && sel && !sel.value && [...sel.options].some(o => String(o.value) === String(sug.agente_id))) {
          sel.value = sug.agente_id; sel.dispatchEvent(new Event('change', { bubbles: true }));
          try { if (typeof window.nxOptChips === 'function') window.nxOptChips('aDirectoCuenta', 'aDirectoChips', { iniciales: true }); } catch (e) {}
          v.cuentaAuto = sug.nombre || 'sugerida';
        }
      } catch (e) { /* sin sugerencia: el agente elige la cuenta */ }
    }
    try { if (typeof window.nxAboActualizarResumen === 'function') window.nxAboActualizarResumen(); } catch (e) {}
    if (V === v) pintar();
  }
  // ¿Mismo depósito para varios pagos? Igual que el servidor: permitido si lo ya usado + este pago no pasa del monto
  // del comprobante (+1 peso de redondeo). El monto sale de lo que leyó la IA o, si no, del registro anterior.
  function evaluar(v) {
    if (!v || !v.coinc || !v.coinc.length || v.estado === 'verificando' || v.estado === 'error') return;
    const topes = v.coinc.map(h => Number(h.tope)).filter(n => n > 0);
    const tope = v.ia && Number(v.ia.monto) > 0 ? Number(v.ia.monto) : (topes.length ? Math.max(...topes) : null);
    const usado = v.coinc.reduce((a, h) => a + (Number(h.monto) || 0), 0);
    const mf = montoFormulario();
    v.tope = tope; v.usado = usado;
    v.estado = tope && mf > 0 && usado + mf <= tope + 1 ? 'compartido' : 'repetido';
  }
  function montoFormulario() {
    const el = document.getElementById('aMnt'); if (!el) return 0;
    try { return window.nxMoney ? window.nxMoney.parse(el.value) : parseFloat(String(el.value).replace(/[^\d.]/g, '')); } catch (e) { return 0; }
  }

  /* Qué mes(es) paga este monto. Las facturas pendientes del cliente (ST.facturas, periodo AAAA-MM) se saldan de la más
     vieja a la más nueva; lo ya abonado (pend(c) es menor que la suma) se descuenta primero de la más vieja. */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const nomMes = (k) => { const [a, m] = String(k || '').split('-'); return MESES[+m - 1] ? MESES[+m - 1] + ' ' + a : ''; };
  function quePaga(monto) {
    try {
      const st = window.ST || ST; const c = st.clientes.find(x => x.id === abonoCliId); if (!c) return '';
      if ((document.getElementById('aDestino')?.value || 'facturas') === 'deuda_anterior') return 'Abono a la deuda anterior';
      const fs = (st.facturas || []).filter(f => String(f.cliente_id) === String(c.id) && /^\d{4}-\d{2}$/.test(String(f.periodo || '')) && !/pagad|anulad/i.test(String(f.estado || '')))
        .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));
      const deuda = typeof pend === 'function' ? Number(pend(c)) || 0 : 0;
      let yaAbonado = Math.max(0, fs.reduce((n, f) => n + (Number(f.total) || 0), 0) - deuda);
      let resto = monto; const completos = [], parcial = [];
      for (const f of fs) {
        let falta = Number(f.total) || 0;
        const ab = Math.min(yaAbonado, falta); yaAbonado -= ab; falta -= ab;
        if (falta < 0.01 || resto < 0.01) continue;
        if (resto + 0.01 >= falta) { completos.push(f.periodo); resto -= falta; } else { parcial.push(f.periodo); resto = 0; }
      }
      const lista = (ks) => { const n = ks.map(nomMes); return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0]; };
      const partes = [];
      if (completos.length) partes.push((completos.length > 1 ? 'Paga las cuotas de ' : 'Paga la cuota de ') + lista(completos));
      if (parcial.length) partes.push((partes.length ? 'abona a ' : 'Abono a la cuota de ') + lista(parcial));
      if (resto >= 1 && fs.length) partes.push('adelanta ' + fmt(resto));
      if (!partes.length && resto >= 1) partes.push('Pago adelantado de ' + fmt(resto));
      return partes.join(' y ');
    } catch (e) { return ''; }
  }

  /* ── Tarjeta bajo el comprobante ── */
  const TIPO = { misma_foto: 'La misma foto', mismo_numero: 'El mismo número de transacción' };
  function css() {
    if (document.getElementById('nxBaucheUnicoCss')) return;
    const s = document.createElement('style'); s.id = 'nxBaucheUnicoCss'; s.textContent = `
#nxBaucheCheck{margin-top:8px;border-radius:12px;padding:10px 12px;font-size:12px;line-height:1.35;border:1px solid transparent}
#nxBaucheCheck.verificando{background:rgba(100,116,139,.10);color:#475569}
#nxBaucheCheck.nuevo{background:rgba(22,163,74,.10);border-color:rgba(22,163,74,.25);color:#166534}
#nxBaucheCheck.repetido{background:rgba(220,38,38,.10);border-color:rgba(220,38,38,.35);color:#991b1b;animation:nxBuSacude .36s cubic-bezier(.36,.07,.19,.97)}
#nxBaucheCheck.compartido{background:rgba(37,99,235,.09);border-color:rgba(37,99,235,.28);color:#1e3a8a}
#nxBaucheCheck.aprobado{background:rgba(217,119,6,.12);border-color:rgba(217,119,6,.35);color:#92400e}
#nxBaucheCheck.error{background:rgba(217,119,6,.10);color:#92400e}
#nxBaucheCheck.parecido{background:rgba(217,119,6,.11);border-color:rgba(217,119,6,.38);color:#92400e}
#nxBaucheCheck.parecido .hit .ver{background:#b45309}
#nxBaucheCheck .cab{display:flex;align-items:center;gap:8px;font-weight:800}
#nxBaucheCheck .cab i.ti{font-size:17px}
#nxBaucheCheck .ia{margin-top:6px;display:flex;flex-wrap:wrap;gap:4px 10px;font-weight:600;opacity:.92}
#nxBaucheCheck .aviso{margin-top:6px;font-weight:700;color:#b45309}
#nxBaucheCheck .hit{margin-top:8px;padding:8px;border-radius:10px;background:rgba(255,255,255,.55);display:flex;gap:8px;align-items:flex-start}
#nxBaucheCheck .hit b{display:block}
#nxBaucheCheck .hit .ver{margin-left:auto;flex:none;border:0;border-radius:8px;min-height:44px;min-width:56px;padding:6px 12px;font-weight:700;font-size:13px;font-family:inherit;background:#991b1b;color:#fff;cursor:pointer}
#nxBaucheCheck.compartido .hit .ver{background:#1d4ed8}
#nxBaucheCheck textarea{width:100%;margin-top:8px;min-height:60px;border-radius:10px;border:1px solid rgba(153,27,27,.35);padding:10px;font-weight:500;font-size:16px;font-family:inherit;box-sizing:border-box;background:#fff;color:#111}
#nxBaucheCheck .aprobar{margin-top:6px;width:100%;min-height:48px;border:0;border-radius:10px;font-weight:800;font-size:14px;font-family:inherit;background:#b45309;color:#fff;cursor:pointer}
#nxBaucheCheck .spin{width:14px;height:14px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:nxBuGira .7s linear infinite}
html.tema-glass-oscuro #nxBaucheCheck.verificando{color:#CBD5E1}
html.tema-glass-oscuro #nxBaucheCheck.nuevo{color:#86EFAC}
html.tema-glass-oscuro #nxBaucheCheck.repetido{color:#FCA5A5}
html.tema-glass-oscuro #nxBaucheCheck.compartido{color:#93C5FD}
html.tema-glass-oscuro #nxBaucheCheck.aprobado,html.tema-glass-oscuro #nxBaucheCheck.error,html.tema-glass-oscuro #nxBaucheCheck.parecido{color:#FCD34D}
html.tema-glass-oscuro #nxBaucheCheck .hit{background:rgba(0,0,0,.25)}
html.tema-glass-oscuro #nxBaucheCheck .aviso{color:#FCD34D}
@keyframes nxBuGira{to{transform:rotate(360deg)}}
@keyframes nxBuSacude{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
@media(prefers-reduced-motion:reduce){#nxBaucheCheck.repetido{animation:none}#nxBaucheCheck .spin{animation-duration:2s}}
`; document.head.appendChild(s);
  }
  function caja() {
    const prev = document.getElementById('nxBauchePreview'); if (!prev) return null;
    let c = document.getElementById('nxBaucheCheck');
    if (!c) { c = document.createElement('div'); c.id = 'nxBaucheCheck'; c.setAttribute('role', 'status'); c.setAttribute('aria-live', 'polite'); prev.parentElement.insertBefore(c, prev.nextSibling); }
    return c;
  }
  function pintar() {
    css(); const c = caja(); if (!c) return;
    if (!V) { c.remove(); return; }
    const v = V;
    evaluar(v);
    const ia = v.ia && v.ia.es_comprobante !== false ? v.ia : null;
    const datos = ia ? `<div class="ia">${ia.banco ? `<span><i class="ti ti-building-bank"></i> ${esc(ia.banco)}</span>` : ''}${ia.monto != null ? `<span><i class="ti ti-cash"></i> ${esc(fmt(ia.monto))}</span>` : ''}${ia.fecha ? `<span><i class="ti ti-calendar"></i> ${esc(fecha(ia.fecha))}</span>` : ''}${ia.numero_transaccion ? `<span><i class="ti ti-hash"></i> ${esc(ia.numero_transaccion)}</span>` : ''}</div>` : '';
    const mf = montoFormulario();
    const IAERR = { clave: 'la clave de la IA no es válida', credito: 'la IA no tiene crédito', sin_clave: 'falta la clave de la IA', ocupado: 'la IA está ocupada', red: 'no hubo conexión con la IA', rechazo: 'la IA no pudo leerlo', otro: 'la IA no pudo leerlo' };
    const notaIA = !ia && v.iaErr ? `<div class="ia"><i class="ti ti-robot-off"></i> Se revisó solo la foto exacta: ${esc(IAERR[v.iaErr] || IAERR.otro)}.</div>` : '';
    const llenos = [v.montoAuto ? 'monto' : '', v.metAuto ? 'método' : '', v.bancoAuto ? 'banco' : '', v.refAuto ? 'referencia' : '', v.cuentaAuto ? 'cuenta (' + v.cuentaAuto + ')' : ''].filter(Boolean);
    // Dueño, 26-oct: en vez de listar los campos llenados, decir qué paga (mes o meses de la cuota). Revise antes de registrar.
    const paga = mf > 0 ? quePaga(mf) : '';
    const notaRapido = paga ? `<div class="ia"><i class="ti ti-calendar-check"></i> ${esc(paga)}. Revise antes de registrar.</div>`
      : llenos.length ? `<div class="ia"><i class="ti ti-sparkles"></i> Datos tomados del bauche. Revise antes de registrar.</div>` : '';
    const dif = v.montoAuto && v.deuda != null ? Math.round((v.montoAuto - v.deuda) * 100) / 100 : 0;
    const notaDeuda = !v.montoAuto || v.deuda == null || Math.abs(dif) < 1 ? '' : dif < 0
      ? `<div class="aviso"><i class="ti ti-info-circle"></i> Abono parcial: el bauche cubre ${esc(fmt(v.montoAuto))} y debe ${esc(fmt(v.deuda))}. Quedaría pendiente ${esc(fmt(-dif))}.</div>`
      : `<div class="aviso"><i class="ti ti-info-circle"></i> El bauche pasa lo que debe por ${esc(fmt(dif))}: se aplica como adelanto.</div>`;
    const avisoMonto = ia && ia.monto != null && mf > 0 && Math.abs(Number(ia.monto) - mf) >= 1
      ? `<div class="aviso"><i class="ti ti-alert-triangle"></i> El comprobante dice ${esc(fmt(ia.monto))} y estás cobrando ${esc(fmt(mf))}.</div>` : '';
    if (v.estado === 'verificando') { c.className = 'verificando'; c.innerHTML = '<div class="cab"><span class="spin"></span> Leyendo el comprobante…</div>'; return; }
    if (v.estado === 'error') { c.className = 'error'; c.innerHTML = `<div class="cab"><i class="ti ti-wifi-off"></i> No se pudo revisar ahora. Se revisará otra vez al guardar.</div>${datos}`; return; }
    if (v.estado === 'nuevo') { c.className = 'nuevo'; c.innerHTML = `<div class="cab"><i class="ti ti-circle-check"></i> Comprobante listo</div>${datos}${notaIA}${notaRapido}${notaDeuda}${avisoMonto}`; return; }
    if (v.estado === 'parecido') {
      const ph = v.parecidos.slice(0, 3).map((h, i) => `<div class="hit"><i class="ti ti-eye-search"></i><div><b>Mismo monto, fecha, banco y ${v.ia.hora ? 'hora' : 'quien envía'}</b>${esc(h.cliente || 'Cliente')} · ${esc(fmt(h.monto))} · ${esc(fecha(h.fecha))}${h.agente ? ' · ' + esc(h.agente) : ''}</div>${h.comprobante ? `<button type="button" class="ver" data-p="${i}">Ver</button>` : ''}</div>`).join('');
      c.className = 'parecido';
      c.innerHTML = `<div class="cab"><i class="ti ti-alert-triangle"></i> Posible repetido: revise la foto antes de guardar</div>${datos}<div class="ia">No es la misma foto ni el mismo número, pero ya hay ${v.parecidos.length === 1 ? 'un pago' : v.parecidos.length + ' pagos'} con el mismo monto, fecha, banco y ${v.ia.hora ? 'hora' : 'persona que envía'}. Si es otro depósito, puede guardar.</div>${ph}${avisoMonto}`;
      c.querySelectorAll('.ver').forEach(b => b.onclick = () => { const h = v.parecidos[+b.dataset.p]; if (h && window.nxVerComprobante) window.nxVerComprobante(h.comprobante); });
      return;
    }
    const hits = v.coinc.slice(0, 3).map((h, i) => `<div class="hit"><i class="ti ti-copy"></i><div><b>${esc(TIPO[h.tipo] || 'Coincide')}</b>${esc(h.cliente || 'Cliente')} · ${esc(fmt(h.monto))} · ${esc(fecha(h.fecha))}${h.agente ? ' · ' + esc(h.agente) : ''}</div>${h.comprobante ? `<button type="button" class="ver" data-i="${i}">Ver</button>` : ''}</div>`).join('');
    if (v.estado === 'compartido') {
      const queda = Math.max(0, v.tope - v.usado - mf);
      c.className = 'compartido';
      c.innerHTML = `<div class="cab"><i class="ti ti-arrows-split-2"></i> Depósito compartido: permitido</div>${datos}<div class="ia">Este comprobante de ${esc(fmt(v.tope))} ya pagó ${esc(fmt(v.usado))} en ${v.coinc.length} pago${v.coinc.length === 1 ? '' : 's'}. Con este cobro de ${esc(fmt(mf))} quedan ${esc(fmt(queda))} sin usar.</div>${hits}`;
    } else if (v.aprobado) {
      c.className = 'aprobado';
      c.innerHTML = `<div class="cab"><i class="ti ti-shield-exclamation"></i> Repetido, aprobado por administrador</div><div class="ia">Motivo: ${esc(v.motivo)}</div>${hits}`;
    } else {
      c.className = 'repetido';
      c.innerHTML = `<div class="cab"><i class="ti ti-ban"></i> Este comprobante ya se usó en otro pago</div>${datos}${hits}`
        + (esAdmin()
          ? `<textarea id="nxBuMotivo" placeholder="Si es correcto (por ejemplo, un depósito que paga a dos clientes de la misma familia), escribe el motivo">${esc(v.motivo)}</textarea><button type="button" class="aprobar" id="nxBuAprobar"><i class="ti ti-check"></i> Aprobar de todas formas</button>`
          : `<div class="ia">No se puede guardar el pago con este comprobante. Si es correcto, pide a un administrador que lo apruebe.</div>`)
        + (v.tope ? `<div class="aviso"><i class="ti ti-alert-triangle"></i> El comprobante es de ${esc(fmt(v.tope))}; ya se usaron ${esc(fmt(v.usado))} y este cobro lo pasa.</div>` : '');
    }
    c.querySelectorAll('.ver').forEach(b => b.onclick = () => { const h = v.coinc[+b.dataset.i]; if (h && window.nxVerComprobante) window.nxVerComprobante(h.comprobante); });
    const ap = c.querySelector('#nxBuAprobar');
    if (ap) ap.onclick = () => { const m = (document.getElementById('nxBuMotivo').value || '').trim(); if (m.length < 5) { toast('err', 'Falta el motivo', 'Escribe por qué se aprueba este comprobante repetido'); return; } v.aprobado = true; v.motivo = m; pintar(); };
  }

  /* ── Detectar cuándo se adjunta o se quita un comprobante ── */
  let ultimoRef = null;
  function revisarCambio() {
    const ref = window._nxBaucheURL || null;
    if (ref === ultimoRef) return;
    ultimoRef = ref;
    if (!ref) { V = null; pintar(); return; }
    const img = document.querySelector('#nxBauchePreview img');
    verificar(ref, img && img.src);
  }
  new MutationObserver(() => revisarCambio()).observe(document.documentElement, { childList: true, subtree: true });
  // Por si el monto cambia después de leer el comprobante (aviso de monto distinto).
  document.addEventListener('input', e => { if (V && e.target && e.target.id === 'aMnt') pintar(); }, true);

  /* ── Candado al guardar: verifica, registra en el servidor y después vincula al pago ── */
  function envolver() {
    if (window.__nxRegAbonoBaucheUnico) return true;
    if (typeof window.regAbono !== 'function' || !window.__nxRegAbonoBauche) return false; // va por fuera de la capa del bauche
    window.__nxRegAbonoBaucheUnico = true;
    const orig = window.regAbono;
    window.regAbono = async function () {
      const ref = window._nxBaucheURL || null;
      if (!ref) return orig.apply(this, arguments);
      if (!V || V.ref !== ref) { revisarCambio(); }
      if (V && V.promesa) { try { await V.promesa; } catch (e) {} }
      const v = V;
      if (v && v.estado === 'repetido' && !v.aprobado) {
        toast('err', 'Comprobante repetido', esAdmin() ? 'Escribe el motivo y toca «Aprobar de todas formas»' : 'Este comprobante ya se usó en otro pago');
        try { document.getElementById('nxBaucheCheck').scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        return;
      }
      const ia = v && v.ia ? { banco: v.ia.banco, monto: v.ia.monto, fecha: v.ia.fecha, numero: v.ia.numero_transaccion, cuenta_destino: v.ia.cuenta_destino, confianza: v.ia.confianza, modelo: v.ia.modelo, titular_destino: v.ia.titular_destino, hora: v.ia.hora || null, ordenante: v.ia.ordenante || null, es_comprobante: v.ia.es_comprobante } : null;
      let idComp = null;
      try {
        idComp = await rpc('comprobante_registrar', { p_storage_ref: ref, p_sha256: v && v.sha, p_dhash: v && v.dhash, p_ia: ia, p_motivo: v && v.aprobado ? v.motivo : null, p_nombre: (ses() && ses().nom) || null, p_monto: montoFormulario() || null });
      } catch (e) {
        const msg = String(e.message || '');
        if (/COMPROBANTE_DUPLICADO/.test(msg)) {
          let coinc = []; try { coinc = JSON.parse(e.detalle || '[]'); } catch (_) {}
          if (v) { v.estado = 'repetido'; v.coinc = coinc.length ? coinc : v.coinc; v.aprobado = false; pintar(); }
          toast('err', 'Comprobante repetido', /SOLO_ADMIN/.test(msg) ? 'Solo un administrador puede aprobarlo' : 'Este comprobante ya se usó en otro pago');
          return;
        }
        // Si la tabla aún no existe (versión del servidor sin publicar) o falla la red: no se frena el cobro, se avisa.
        console.warn('[bauche único] no se pudo registrar el comprobante', e);
        toast('info', 'Comprobante sin verificar', 'El pago se guarda; el comprobante no quedó en la lista de usados');
      }
      const ult = () => { try { return (typeof _ultimoAbono !== 'undefined') ? _ultimoAbono : window._ultimoAbono; } catch (e) { return window._ultimoAbono; } };
      const antes = ult();
      const r = await orig.apply(this, arguments);
      const desp = ult();
      if (idComp && desp && desp !== antes && desp.abonoId) {
        try { await rpc('comprobante_vincular', { p_id: idComp, p_abono_id: desp.abonoId }); } catch (e) { console.warn('[bauche único] vincular', e); }
        V = null; ultimoRef = null;
      }
      return r;
    };
    return true;
  }
  let n = 0; const t = setInterval(() => { if (envolver() || ++n > 120) clearInterval(t); }, 250);
})();
