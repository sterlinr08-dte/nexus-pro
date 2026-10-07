/* NEXUS PRO — buscador inteligente en las listas del Punto de Venta (Fase 1, 07-oct-2026)
   Portado de STUDIO 59.88 (sterlinr08-dte/studio-rd, parches-pos-buscador.js) según
   docs/PLAN-POS-DESDE-STUDIO.md. Solo la función: sin marca STUDIO (acento Nexus Blue de DESIGN.md).

   Diferencia con STUDIO: aquí solo actúa mientras el Punto de Venta está abierto (#v-pos.on).
   Las pantallas de Seguros, WhatsApp y el resto de NEXUS PRO no cambian.

   Se aplica a cualquier <select> con 10 opciones o más (artículos, empleados, clientes, cuentas,
   suplidores…), o a los marcados con data-nx-buscar. Excluir uno: data-nx-buscar="no".
   El <select> real se queda en su sitio y sigue siendo la fuente del valor: los lectores (val('ajProd'),
   onchange="…", .value) no cambian. Al tocarlo se abre un panel con lupa en lugar de la lista nativa;
   al elegir se pone .value y se disparan «input» y «change» como si se hubiera elegido a mano.

   Búsqueda inteligente:
   - sin acentos ni mayúsculas; varias palabras en cualquier orden («pro max 11» encuentra
     «IPHONE 11 PRO MAX»); une palabras («promax» = «pro max»); busca también por código («1024»);
   - tolera un error de letra en palabras de 4+ letras («iphnoe»);
   - ordena: empieza igual > palabras que empiezan igual > contiene; con existencia antes que en 0;
   - «Recientes»: los últimos elegidos en esa lista salen primero con el buscador vacío.
   Solo presentación: no toca datos ni reglas. */
(function () {
  'use strict';
  if (window.nxBuscador) return;

  const MIN_OPC = 10;          // a partir de cuántas opciones una lista lleva buscador
  const MAX_FILAS = 150;       // filas pintadas a la vez (la lista completa se busca igual)
  // flecha de las listas, la misma de index.html (select{background-image:…!important})
  const FLECHA = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' viewBox=\'0 0 10 6\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%2364748b\' stroke-width=\'1.6\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")';
  const LUPA = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%232563EB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='10' cy='10' r='7'/%3E%3Cpath d='M21 21l-6-6'/%3E%3C/svg%3E\")";

  // ── texto ──
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ').trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // distancia ≤ 1 (cambio, falta, sobra o dos letras cambiadas de lugar)
  function casi(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }

  // ── opciones del <select> ──
  function leer(sel) {
    return Array.from(sel.options).map((o, idx) => {
      const txt = (o.textContent || '').replace(/\s+/g, ' ').trim();
      const partes = txt.split(/\s+[—–]\s+/);            // «NOMBRE (COD) — stock 2»
      const titulo = partes[0];
      const meta = partes.slice(1).join(' · ');
      const grupo = o.parentElement && o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : '';
      const mStock = /stock\s+(-?[\d,.]+)/i.exec(txt);
      const n = norm(txt + ' ' + grupo);
      return {
        idx, value: o.value, titulo, meta, grupo, disabled: o.disabled, vacia: o.value === '',
        stock: mStock ? Number(mStock[1].replace(/,/g, '')) : null,
        n, junto: n.replace(/ /g, ''), palabras: n.split(' ')
      };
    });
  }

  // puntaje de una opción para la búsqueda (0 = no aparece)
  function puntuar(it, q, toks) {
    if (!toks.length) return 1;
    let pts = 0;
    for (const t of toks) {
      if (it.palabras.some(w => w === t)) pts += 30;
      else if (it.palabras.some(w => w.startsWith(t))) pts += 20;
      else if (it.n.includes(t)) pts += 10;
      else if (it.junto.includes(t)) pts += 8;
      else if (t.length >= 4 && it.palabras.some(w => casi(t, w) || (w.length > t.length && casi(t, w.slice(0, t.length))))) pts += 3;
      else return 0;
    }
    const nt = norm(it.titulo);
    const qj = q.replace(/ /g, '');
    if (qj.length >= 3 && toks.length > 1 && it.junto.includes(qj)) pts += 25;   // «prd 4» = «PRD-4», «12 pro» seguido
    if (nt.startsWith(q)) pts += 40;
    else if (nt.includes(q)) pts += 15;
    if (it.stock === 0) pts -= 6;                         // con existencia primero
    pts -= Math.min(nt.length, 80) / 40;                  // a igualdad, el nombre más corto
    return Math.max(pts, 0.1);
  }

  function resaltar(txt, toks) {
    if (!toks.length) return esc(txt);
    // marca sobre el texto sin acentos, conservando el original
    const base = txt.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const marca = new Array(txt.length).fill(false);
    for (const t of toks) {
      let i = base.indexOf(t);
      while (i !== -1) { for (let k = i; k < i + t.length && k < txt.length; k++) marca[k] = true; i = base.indexOf(t, i + t.length); }
    }
    let out = '', abierto = false;
    for (let k = 0; k < txt.length; k++) {
      if (marca[k] && !abierto) { out += '<mark>'; abierto = true; }
      if (!marca[k] && abierto) { out += '</mark>'; abierto = false; }
      out += esc(txt[k]);
    }
    return out + (abierto ? '</mark>' : '');
  }

  // ── recientes por lista ──
  const clave = sel => 'nxSbRec:' + (sel.id || sel.getAttribute('name') || sel.getAttribute('aria-label') || '');
  function recientes(sel) { try { return JSON.parse(localStorage.getItem(clave(sel)) || '[]'); } catch (e) { return []; } }
  function guardarReciente(sel, v) {
    if (!v || clave(sel) === 'nxSbRec:') return;
    try { const r = recientes(sel).filter(x => x !== v); r.unshift(v); localStorage.setItem(clave(sel), JSON.stringify(r.slice(0, 5))); } catch (e) {}
  }

  // ── estilos ──
  function estilos() {
    if (document.getElementById('nxSbCss')) return;
    const st = document.createElement('style'); st.id = 'nxSbCss';
    st.textContent = `
      .nxSbPanel{position:fixed;z-index:2147483000;display:flex;flex-direction:column;background:#fff;color:#0F172A;border:1px solid rgba(17,17,17,.12);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.22),0 2px 8px rgba(0,0,0,.08);overflow:hidden;font-family:inherit;transform-origin:top center;animation:nxSbIn .16s cubic-bezier(.2,.8,.2,1)}
      .nxSbPanel.arriba{transform-origin:bottom center}
      @keyframes nxSbIn{from{opacity:0;transform:scale(.97) translateY(-4px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){.nxSbPanel{animation:none}}
      .nxSbHead{display:flex;align-items:center;gap:8px;padding:10px 10px 8px;border-bottom:1px solid rgba(17,17,17,.08)}
      .nxSbQ{flex:1;min-width:0;display:flex;align-items:center;gap:8px;min-height:42px;padding:0 12px;border:1.5px solid rgba(17,17,17,.14);border-radius:11px;background:#F8FAFC}
      .nxSbQ:focus-within{border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.22);background:#fff}
      .nxSbQ>svg{flex:none;color:#1D4ED8}
      .nxSbQ input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:16px;font-weight:600;color:#0F172A;padding:0;text-transform:none}
      .nxSbPanel .nxSbQ input,.nxSbPanel .nxSbQ input:focus{border:0;box-shadow:none;outline:0;background:transparent;height:auto;min-height:0;width:auto;margin:0;border-radius:0}
      .nxSbQ input::-webkit-search-cancel-button{display:none}
      .nxSbQ input::placeholder{color:#94A3B8;font-weight:500}
      .nxSbX{display:flex;border:0;background:transparent;color:#555;font-size:18px;padding:4px;cursor:pointer;line-height:1}
      .nxSbCerrar{flex:none;border:0;background:transparent;color:#0F172A;font:inherit;font-size:13px;font-weight:700;padding:8px 6px;cursor:pointer}
      .nxSbInfo{display:flex;justify-content:space-between;gap:8px;padding:6px 14px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1D4ED8}
      .nxSbLista{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 6px 6px}
      .nxSbIt{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:transparent;color:#0F172A;font:inherit;padding:9px 10px;border-radius:10px;cursor:pointer;min-height:44px}
      .nxSbIt:hover,.nxSbIt.act{background:rgba(37,99,235,.10)}
      .nxSbIt.sel{box-shadow:inset 3px 0 0 #2563EB}
      .nxSbIt[disabled]{opacity:.45;cursor:default}
      .nxSbT{flex:1;min-width:0;font-size:13.5px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}
      .nxSbT small{display:block;font-size:11px;font-weight:500;color:#64748B;margin-top:1px}
      .nxSbT mark{background:rgba(37,99,235,.20);color:inherit;border-radius:3px;padding:0 1px}
      .nxSbChip{flex:none;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#F8FAFC;color:#0F172A;border:1px solid rgba(17,17,17,.1);white-space:nowrap;font-variant-numeric:tabular-nums}
      .nxSbChip.cero{color:#9a3412;background:#fff7ed;border-color:#fed7aa}
      .nxSbChip.hay{color:#166534;background:#f0fdf4;border-color:#bbf7d0}
      .nxSbOk{flex:none;display:flex;color:#1D4ED8}
      .nxSbVacio{padding:22px 14px;text-align:center;color:#64748B;font-size:13px}
      .nxSbMas{padding:8px 14px 10px;text-align:center;color:#64748B;font-size:12px}
      .nxSbVelo{position:fixed;inset:0;z-index:2147482999;background:rgba(10,10,10,.28)}
      select[data-nx-sb]{cursor:pointer}
      html.tema-glass-oscuro .nxSbPanel,body.tema-premium .nxSbPanel{background:#121826;color:#F1F5F9;border-color:rgba(255,255,255,.12)}
      html.tema-glass-oscuro .nxSbQ,body.tema-premium .nxSbQ,html.tema-glass-oscuro .nxSbChip,body.tema-premium .nxSbChip{background:#0B0F19;border-color:rgba(255,255,255,.14);color:#F1F5F9}
      html.tema-glass-oscuro .nxSbQ input,body.tema-premium .nxSbQ input,html.tema-glass-oscuro .nxSbIt,body.tema-premium .nxSbIt,html.tema-glass-oscuro .nxSbCerrar,body.tema-premium .nxSbCerrar{color:#F1F5F9}
      html.tema-glass-oscuro .nxSbInfo,body.tema-premium .nxSbInfo,html.tema-glass-oscuro .nxSbOk,body.tema-premium .nxSbOk,html.tema-glass-oscuro .nxSbQ>svg,body.tema-premium .nxSbQ>svg{color:#93C5FD}
      html.tema-glass-oscuro .nxSbIt:hover,html.tema-glass-oscuro .nxSbIt.act,body.tema-premium .nxSbIt:hover,body.tema-premium .nxSbIt.act{background:rgba(59,130,246,.18)}
    `;
    document.head.appendChild(st);
  }

  // ── panel ──
  let abierto = null;   // { sel, panel, velo, items, vista, act, toks }

  function cerrar(devolverFoco) {
    if (!abierto) return;
    const { sel, panel, velo } = abierto;
    panel.remove(); if (velo) velo.remove();
    abierto = null;
    window.removeEventListener('resize', alCambiarVista);
    if (devolverFoco) try { sel.focus({ preventScroll: true }); } catch (e) {}
  }
  function alCambiarVista() { if (abierto && !abierto.movil) colocar(abierto); }

  function colocar(st) {
    const { sel, panel } = st;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (st.movil) {                                       // celular: hoja arriba, deja sitio al teclado
      panel.style.left = '10px'; panel.style.right = '10px'; panel.style.width = 'auto';
      panel.style.top = 'calc(env(safe-area-inset-top, 0px) + 10px)';
      panel.style.maxHeight = Math.round(vh * 0.62) + 'px';
      return;
    }
    const r = sel.getBoundingClientRect();
    const ancho = Math.min(Math.max(r.width, 340), vw - 20);
    let left = Math.min(Math.max(r.left, 10), vw - ancho - 10);
    const abajo = vh - r.bottom - 12, arriba = r.top - 12;
    const alto = Math.min(420, Math.max(abajo, arriba));
    panel.style.width = ancho + 'px'; panel.style.left = left + 'px'; panel.style.maxHeight = alto + 'px';
    if (abajo >= 260 || abajo >= arriba) { panel.style.top = (r.bottom + 6) + 'px'; panel.style.bottom = 'auto'; panel.classList.remove('arriba'); }
    else { panel.style.bottom = (vh - r.top + 6) + 'px'; panel.style.top = 'auto'; panel.classList.add('arriba'); }
  }

  function pintar(st) {
    const q = norm(st.input.value);
    const toks = q ? q.split(' ') : [];
    st.toks = toks;
    let vista;
    const reales = st.items.filter(it => !it.vacia);
    if (!toks.length) {
      const rec = recientes(st.sel).map(v => st.items.find(it => it.value === v && !it.vacia && !it.disabled)).filter(Boolean);
      const recSet = new Set(rec);
      vista = st.items.filter(it => it.vacia).concat(rec.map(it => Object.assign({}, it, { reciente: true })), st.items.filter(it => !it.vacia && !recSet.has(it)));
    } else {
      vista = reales.map(it => ({ it, p: puntuar(it, q, toks) })).filter(x => x.p > 0).sort((a, b) => b.p - a.p || a.it.idx - b.it.idx).map(x => x.it);
    }
    st.vista = vista;
    st.act = vista.length ? Math.max(0, vista.findIndex(it => !it.disabled)) : -1;
    if (!toks.length) { const iSel = vista.findIndex(it => it.value === st.sel.value && !it.reciente); if (iSel >= 0 && st.sel.value !== '') st.act = iSel; }
    st.info.innerHTML = toks.length
      ? `<span>${vista.length ? vista.length + (vista.length === 1 ? ' resultado' : ' resultados') : 'Sin resultados'}</span><span>${reales.length} en total</span>`
      : `<span>${reales.length} ${reales.length === 1 ? 'opción' : 'opciones'}</span><span>Escribe para buscar</span>`;
    const filas = vista.slice(0, MAX_FILAS).map((it, i) => {
      const chip = it.stock != null
        ? `<span class="nxSbChip ${it.stock > 0 ? 'hay' : 'cero'}">${it.stock > 0 ? it.stock.toLocaleString('en-US') + ' en stock' : 'Sin stock'}</span>`
        : (it.meta ? `<span class="nxSbChip">${esc(it.meta)}</span>` : '');
      const sub = [it.reciente ? 'Reciente' : '', it.grupo].filter(Boolean).join(' · ');
      const elegido = it.value === st.sel.value && !it.vacia;
      return `<button type="button" class="nxSbIt${i === st.act ? ' act' : ''}${elegido ? ' sel' : ''}" data-i="${i}"${it.disabled ? ' disabled' : ''} role="option" aria-selected="${elegido}">
        <span class="nxSbT">${it.vacia ? '<span style="color:#64748B">' + esc(it.titulo || 'Ninguno') + '</span>' : resaltar(it.titulo, toks)}${sub ? '<small>' + esc(sub) + '</small>' : ''}</span>
        ${it.stock != null ? chip : (it.meta ? chip : '')}${elegido ? '<span class="nxSbOk"><svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M5 12l5 5L20 7\"/></svg></span>' : ''}</button>`;
    }).join('');
    st.lista.innerHTML = filas
      ? filas + (vista.length > MAX_FILAS ? `<div class="nxSbMas">Se muestran ${MAX_FILAS} de ${vista.length}. Escribe más para afinar.</div>` : '')
      : `<div class="nxSbVacio">No hay coincidencias con «${esc(st.input.value)}».<br>Prueba con otra palabra o con el código.</div>`;
    st.lista.scrollTop = 0;
    marcarActivo(st, false);
  }

  function marcarActivo(st, desplazar) {
    st.lista.querySelectorAll('.nxSbIt.act').forEach(b => b.classList.remove('act'));
    const b = st.lista.querySelector(`.nxSbIt[data-i="${st.act}"]`);
    if (b) { b.classList.add('act'); if (desplazar !== false) b.scrollIntoView({ block: 'nearest' }); }
  }

  function elegir(st, i) {
    const it = st.vista[i]; if (!it || it.disabled) return;
    const sel = st.sel;
    cerrar(true);
    if (sel.value !== it.value) {
      sel.value = it.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    guardarReciente(sel, it.value);
  }

  function abrir(sel, letra) {
    if (sel.disabled) return;
    cerrar(false); estilos();
    const movil = window.innerWidth < 640;
    const panel = document.createElement('div');
    panel.className = 'nxSbPanel'; panel.setAttribute('role', 'dialog');
    const etiqueta = (sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`)) || (sel.closest('.fr') && sel.closest('.fr').querySelector('label'));
    const nombre = (etiqueta ? etiqueta.textContent : (sel.getAttribute('aria-label') || '')).replace(/\*/g, '').trim().toLowerCase();
    panel.innerHTML = `<div class="nxSbHead"><label class="nxSbQ"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M21 21l-6-6"/></svg><input type="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Buscar${nombre ? ' ' + esc(nombre) : ''} por nombre o código" aria-label="Buscar"><button type="button" class="nxSbX" aria-label="Borrar búsqueda" hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button></label>${movil ? '<button type="button" class="nxSbCerrar">Cerrar</button>' : ''}</div><div class="nxSbInfo"></div><div class="nxSbLista" role="listbox"></div>`;
    let velo = null;
    if (movil) { velo = document.createElement('div'); velo.className = 'nxSbVelo'; velo.addEventListener('click', () => cerrar(false)); document.body.appendChild(velo); }
    document.body.appendChild(panel);
    const st = abierto = { sel, panel, velo, movil, items: leer(sel), input: panel.querySelector('input'), lista: panel.querySelector('.nxSbLista'), info: panel.querySelector('.nxSbInfo') };
    // el campo de búsqueda va sin el marco global de los <input> (también con !important en index.html)
    [['border', '0'], ['box-shadow', 'none'], ['outline', '0'], ['background', 'transparent'], ['padding', '0'], ['min-height', '0'], ['height', 'auto']]
      .forEach(([k, v]) => st.input.style.setProperty(k, v, 'important'));
    const x = panel.querySelector('.nxSbX');
    colocar(st);
    if (letra) st.input.value = letra;
    pintar(st); x.hidden = !st.input.value;
    st.input.addEventListener('input', () => { x.hidden = !st.input.value; pintar(st); });
    x.addEventListener('click', () => { st.input.value = ''; x.hidden = true; pintar(st); st.input.focus(); });
    const c = panel.querySelector('.nxSbCerrar'); if (c) c.addEventListener('click', () => cerrar(true));
    st.input.addEventListener('keydown', ev => {
      const n = Math.min(st.vista.length, MAX_FILAS);
      const mover = d => { if (!n) return; let i = st.act; for (let k = 0; k < n; k++) { i = (i + d + n) % n; if (!st.vista[i].disabled) break; } st.act = i; marcarActivo(st); };
      if (ev.key === 'ArrowDown') { ev.preventDefault(); mover(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); mover(-1); }
      else if (ev.key === 'Enter') { ev.preventDefault(); if (st.act >= 0) elegir(st, st.act); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cerrar(true); }
      else if (ev.key === 'Tab') { cerrar(false); }
    });
    st.lista.addEventListener('click', ev => { const b = ev.target.closest('.nxSbIt'); if (b) elegir(st, Number(b.dataset.i)); });
    st.lista.addEventListener('mousemove', ev => { const b = ev.target.closest('.nxSbIt'); if (b && Number(b.dataset.i) !== st.act && !b.disabled) { st.act = Number(b.dataset.i); marcarActivo(st, false); } });
    window.addEventListener('resize', alCambiarVista);
    setTimeout(() => { try { st.input.focus({ preventScroll: true }); if (letra) st.input.setSelectionRange(letra.length, letra.length); } catch (e) {} }, 0);
  }

  // cierra al tocar fuera (escritorio) o al desplazar la página por debajo
  document.addEventListener('pointerdown', ev => {
    if (!abierto || abierto.movil) return;
    if (abierto.panel.contains(ev.target)) return;
    if (ev.target === abierto.sel) return;
    cerrar(false);
  }, true);
  document.addEventListener('scroll', ev => {
    if (!abierto || abierto.movil) return;
    if (abierto.panel.contains(ev.target)) return;
    colocar(abierto);
  }, true);

  // ── conectar un <select> ──
  function cuenta(sel) { let n = 0; for (const o of sel.options) if (o.value !== '') n++; return n; }
  function aplica(sel) {
    if (sel.multiple || sel.size > 1) return false;
    const m = sel.getAttribute('data-nx-buscar');
    if (m === 'no') return false;
    if (m != null) return true;
    return cuenta(sel) >= MIN_OPC;
  }
  function conectar(sel) {
    if (sel.hasAttribute('data-nx-sb')) return;
    sel.setAttribute('data-nx-sb', '1');
    // lupa a la izquierda + la flecha de siempre a la derecha. index.html fija la flecha de todo
    // <select> con !important; solo un estilo en línea con prioridad la puede acompañar.
    const fija = (k, v) => sel.style.setProperty(k, v, 'important');
    fija('background-image', LUPA + ', ' + FLECHA);
    fija('background-repeat', 'no-repeat, no-repeat');
    fija('background-position', '11px center, right 10px center');
    fija('background-size', '16px 16px, 10px 6px');
    const pl = parseFloat(getComputedStyle(sel).paddingLeft) || 0;
    if (pl < 34) sel.style.paddingLeft = '34px';
    sel.title = sel.title || 'Toca para buscar';
    // la lista nativa no se abre: la reemplaza el panel
    sel.addEventListener('mousedown', ev => {
      if (ev.button !== 0 || sel.disabled) return;
      ev.preventDefault(); sel.focus({ preventScroll: true });
      if (abierto && abierto.sel === sel) cerrar(false); else abrir(sel);
    });
    // en el celular: un toque abre el panel; si el dedo se arrastró (desplazar la página), no
    let t0 = null;
    sel.addEventListener('touchstart', ev => { const t = ev.touches[0]; t0 = t ? [t.clientX, t.clientY] : null; }, { passive: true });
    sel.addEventListener('touchend', ev => {
      const t = ev.changedTouches[0];
      if (!t0 || !t || Math.hypot(t.clientX - t0[0], t.clientY - t0[1]) > 10) return;
      if (!sel.disabled) { ev.preventDefault(); abrir(sel); }
    }, { passive: false });
    sel.addEventListener('keydown', ev => {
      if (ev.ctrlKey || ev.metaKey) return;
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'F4' || (ev.altKey && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'))) { ev.preventDefault(); abrir(sel); }
      else if (ev.key.length === 1 && !ev.altKey && /\S/.test(ev.key)) { ev.preventDefault(); abrir(sel, ev.key); }
    });
  }

  // NEXUS: solo con el Punto de Venta en pantalla (las ventanas del POS se montan en <body>, por eso se
  // mira la vista activa y no el contenedor del <select>).
  function posActivo() { const v = document.getElementById('v-pos'); return !!(v && v.classList.contains('on')); }
  let pendiente = false;
  function revisar() {
    pendiente = false;
    if (!posActivo()) return;
    document.querySelectorAll('select:not([data-nx-sb])').forEach(sel => { if (aplica(sel)) conectar(sel); });
  }
  function programar() { if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); } }
  function iniciar() {
    revisar();
    new MutationObserver(programar).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) iniciar(); else document.addEventListener('DOMContentLoaded', iniciar);

  window.nxBuscador = { abrir, cerrar, revisar, _norm: norm, _puntuar: puntuar, _leer: leer };
})();
