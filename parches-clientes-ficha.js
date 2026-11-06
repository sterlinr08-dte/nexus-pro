/* NEXUS PRO · Clientes y ficha del cliente: llenar más rápido y con menos errores (06-nov-2026)
   Solo vista y avisos. NO cambia cómo se guarda un cliente (guardarCli sigue igual) ni toca Supabase.
   1) Búsqueda de Clientes que perdona tildes, guiones, espacios y el orden de las palabras
      («jose perez» encuentra «PÉREZ, JOSÉ»; «00112345678» encuentra «001-1234567-8»; «809 555 1234» el teléfono).
   2) Cuadrícula: barra de selección legible en el tema oscuro, botones de 44 px y «Elegir los de esta página».
   3) Cuadrícula: casilla, estrella y «⋮» con zona de toque de 44 × 44; las páginas en su propia fila y de 44 px.
   4) Ficha Nuevo/Editar: avisos al momento debajo del campo (cédula legible y RNC de 9 dígitos, correo con
      «¿Quiso decir …@gmail.com?», WhatsApp que ya tiene otro cliente). Son avisos: el guardado valida como antes.
   Apagar en un equipo: localStorage.nx_clientes_ficha_off='1' (y recargar). */
(function () {
  'use strict';
  try { if (localStorage.getItem('nx_clientes_ficha_off') === '1') return; } catch (e) {}
  if (window.__nxClientesFicha) return;
  window.__nxClientesFicha = true;
  document.documentElement.classList.add('nx-clif');

  /* ── 1) Búsqueda que perdona ─────────────────────────────────────────────── */
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ@.\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const dig = s => String(s || '').replace(/\D/g, '');
  // ST es «let» en index.html: no cuelga de window (por eso el aviso de cédula repetida de la capa base nunca salía)
  const clientes = () => { try { return (typeof ST !== 'undefined' && ST && ST.clientes) || []; } catch (e) { return []; } };
  window.nxCliCoincide = function (c, q) {
    if (!c) return false;
    const qn = norm(q); if (!qn) return true;
    // Palabras: todas deben estar en el nombre, el apodo, la póliza o el correo (en cualquier orden)
    const texto = norm([c.nom, c.referencia, c.numero_poliza, c.email].join(' '));
    if (qn.split(' ').every(p => texto.includes(p))) return true;
    // Números: cédula, teléfonos y póliza comparados solo por sus dígitos
    const qd = dig(q), qsin = String(q).replace(/\s/g, '');
    if (qd.length >= 4 && qd.length >= qsin.length * 0.6) {
      return [c.cedula, c.tel, c.wa, c.referencia_wa, c.numero_poliza].some(v => dig(v).includes(qd));
    }
    return false;
  };

  /* ── 2 y 3) Estilos (cuadrícula y barra de selección) ─────────────────────── */
  const css = `
html.nx-clif #v-clientes #cliBulkBar{font-size:13px;gap:8px 10px}
html.nx-clif #v-clientes #cliBulkBar .btn{min-height:44px!important;font-size:13px!important;padding:0 16px!important;border-radius:9999px!important}
html.nx-clif #v-clientes #cliBulkBar .nxClifPag{white-space:nowrap}
html.nx-clif #v-clientes #cliBulkBar .nxClifPag[hidden]{display:none!important}
html.nx-clif #v-clientes #cliBulkBar.nxClifVacia{background:transparent;border-style:dashed;color:inherit}
html.nx-clif #v-clientes #cliBulkBar.nxClifVacia #cliBulkCnt{font-weight:600;opacity:.85}
html.nx-clif #v-clientes #cliBulkBar.nxClifVacia>.btn:not(.nxClifPag){display:none!important}
html.nx-clif.tema-glass-oscuro #v-clientes #cliBulkBar{background:rgba(37,99,235,.16);border-color:rgba(96,165,250,.38);color:#dbeafe}
html.nx-clif.tema-glass-oscuro #v-clientes #cliBulkBar.nxClifVacia{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.16);color:#cbd5e1}
html.nx-clif.tema-glass-oscuro #v-clientes #cliBulkBar .btn.bghost{background:rgba(255,255,255,.10)!important;color:#f1f5f9!important;border:1px solid rgba(255,255,255,.18)!important}
html.nx-clif.tema-glass-oscuro #v-clientes #cliBulkBar .btn.bc1{background:#2563eb!important;color:#fff!important;border:0!important}
/* casilla, estrella y «⋮»: el dibujo queda igual; la zona que responde al dedo mide 44 × 44 */
html.nx-clif #tbCli .cliCard-top{top:11px;left:11px;right:11px}
html.nx-clif #tbCli .cliCard-chk{width:24px!important;height:24px!important;overflow:visible}
html.nx-clif #tbCli :is(.cliCard-chk,.cliCard-star,.cliCard-more)::before{content:'';position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%);border-radius:0;background:none;box-shadow:none}
html.nx-clif #tbCli .cliCard-chk:checked::after{left:8px;top:4px}
html.nx-clif #tbCli .cliCard-star{position:relative;width:32px!important;height:32px!important;min-height:0!important;min-width:0!important;padding:0!important;border-radius:50%!important}
html.nx-clif #tbCli .cliCard-more{position:relative}
html.nx-clif #tbCli .cliCard-menuWrap{bottom:8px;right:8px}
html.nx-clif #tbCli.cliGrid>div:not(.cliCard){grid-column:1/-1}
html.nx-clif #tbCli .nxpag-btn{min-width:44px!important;height:44px!important;font-size:14px!important}
/* 4) avisos debajo del campo */
html.nx-clif #mCli #nx-cedula-aviso,html.nx-clif #mCli .nxClifAviso{font-size:13px!important;line-height:1.35;margin-top:6px;font-weight:600}
html.nx-clif #mCli #nx-cedula-aviso[data-tono=ok],html.nx-clif #mCli .nxClifAviso[data-tono=ok]{color:#047857!important}
html.nx-clif #mCli #nx-cedula-aviso[data-tono=warn],html.nx-clif #mCli .nxClifAviso[data-tono=warn]{color:#b45309!important}
html.nx-clif #mCli #nx-cedula-aviso[data-tono=err],html.nx-clif #mCli .nxClifAviso[data-tono=err]{color:#b91c1c!important}
html.nx-clif #mCli #nx-cedula-aviso[data-tono=info]{color:#475569!important}
html.nx-clif.tema-glass-oscuro #mCli #nx-cedula-aviso[data-tono=ok],html.nx-clif.tema-glass-oscuro #mCli .nxClifAviso[data-tono=ok]{color:#6ee7b7!important}
html.nx-clif.tema-glass-oscuro #mCli #nx-cedula-aviso[data-tono=warn],html.nx-clif.tema-glass-oscuro #mCli .nxClifAviso[data-tono=warn]{color:#fcd34d!important}
html.nx-clif.tema-glass-oscuro #mCli #nx-cedula-aviso[data-tono=err],html.nx-clif.tema-glass-oscuro #mCli .nxClifAviso[data-tono=err]{color:#fca5a5!important}
html.nx-clif.tema-glass-oscuro #mCli #nx-cedula-aviso[data-tono=info]{color:#cbd5e1!important}
html.nx-clif #mCli #nx-cedula-aviso a{display:inline-flex;align-items:center;min-height:44px;padding:0 4px;color:inherit!important}
html.nx-clif #mCli .nxClifAviso button{display:inline-flex;align-items:center;min-height:44px;margin:4px 0 0;padding:0 16px;border-radius:9999px;border:1px solid currentColor;background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}
`;
  function ponerCss() {
    if (document.getElementById('nxClientesFicha')) return;
    const st = document.createElement('style'); st.id = 'nxClientesFicha'; st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }
  ponerCss();

  /* ── 2) Barra de selección: siempre a la vista en la cuadrícula y «Elegir los de esta página» ── */
  function casillas() { return [...document.querySelectorAll('#tbCli .cliCard-chk')]; }
  window.nxClifElegirPagina = function () {
    const cs = casillas(), todas = cs.length && cs.every(c => c.checked);
    cs.forEach(c => { if (c.checked === todas) c.click(); }); // si ya estaban todas, las quita
  };
  function pintarBarra() {
    const bar = document.getElementById('cliBulkBar'); if (!bar) return;
    let vista = 'lista'; try { vista = _cliVista; } catch (e) {}
    const cs = casillas(); let n = 0; try { n = _cliSeleccion.length; } catch (e) {}
    if (vista !== 'cuadricula' || !cs.length) { bar.classList.remove('nxClifVacia'); return; }
    let b = bar.querySelector('.nxClifPag');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'btn bsm bghost nxClifPag';
      b.setAttribute('onclick', 'nxClifElegirPagina()');
      const sp = bar.querySelector('.sp'); bar.insertBefore(b, sp ? sp.nextSibling : null);
    }
    const todas = cs.every(c => c.checked);
    // Con todas marcadas el botón se esconde: para quitarlas ya está «Quitar selección» (una sola entrada por acción)
    b.textContent = `Elegir los ${cs.length} de esta página`; b.hidden = todas;
    bar.classList.toggle('nxClifVacia', n === 0);
    if (n === 0) {
      bar.classList.add('show');
      const cnt = document.getElementById('cliBulkCnt'); if (cnt) cnt.textContent = 'Marque clientes para enviarles un WhatsApp';
    }
  }
  function envolver() {
    const o = window.pintarCliBulkBar;
    if (typeof o !== 'function') return false;
    if (o.__nxClif) return true;
    const w = function () { const r = o.apply(this, arguments); try { pintarBarra(); } catch (e) {} return r; };
    w.__nxClif = true; window.pintarCliBulkBar = w;
    // rCli pinta la barra ANTES de dibujar las tarjetas: se vuelve a pintar cuando cambian
    const tb = document.getElementById('tbCli');
    if (tb) new MutationObserver(() => { try { pintarBarra(); } catch (e) {} }).observe(tb, { childList: true });
    return true;
  }

  /* ── 4) Avisos al momento en la ficha ─────────────────────────────────────── */
  const DOM = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com',
    'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com',
    'icloud.co': 'icloud.com', 'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com' };
  function aviso(input, id) {
    let a = document.getElementById(id);
    if (!a && input && input.parentElement) { a = document.createElement('div'); a.id = id; a.className = 'nxClifAviso'; a.setAttribute('aria-live', 'polite'); a.hidden = true; input.parentElement.appendChild(a); }
    return a;
  }
  const esc = s => (window.escHtml ? window.escHtml(s) : String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])));
  function quitar(a) { if (a) { a.hidden = true; a.innerHTML = ''; a.removeAttribute('data-tono'); } }

  function revisarCorreo(fin) {
    const e = document.getElementById('cEmail'); if (!e) return;
    const a = aviso(e, 'nxClifCorreo'); const v = e.value.trim();
    if (!v) return quitar(a);
    const m = v.toLowerCase().match(/^([^\s@]+)@([^\s@]+)$/);
    const sug = m && DOM[m[2]] ? m[1] + '@' + DOM[m[2]] : '';
    if (sug) {
      a.hidden = false; a.dataset.tono = 'warn';
      a.innerHTML = `¿Quiso decir <strong>${esc(sug)}</strong>?<br><button type="button" class="nxClifUsar">Usar ${esc(sug)}</button>`;
      a.querySelector('button').onclick = () => { e.value = sug; e.removeAttribute('aria-invalid'); quitar(a); };
      return;
    }
    const ok = typeof nxCorreoOk === 'function' ? nxCorreoOk(v) : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    if (ok) return quitar(a);
    if (!fin) return; // mientras escribe no se regaña; solo al salir del campo
    a.hidden = false; a.dataset.tono = 'err'; a.textContent = 'Revise el correo (ejemplo: nombre@correo.com).';
  }

  function revisarWa() {
    const e = document.getElementById('cWA'); if (!e) return;
    const a = aviso(e, 'nxClifWa'); const d = dig(e.value);
    if (d.length < 8) return quitar(a);
    let edit = null; try { edit = editCliId; } catch (x) {}
    const nw = v => (typeof nxWa === 'function' ? nxWa(v) : dig(v));
    const mio = nw(e.value) || d;
    const otro = clientes().find(c => String(c.id) !== String(edit) && c.wa && (dig(c.wa) === d || nw(c.wa) === mio));
    if (!otro) return quitar(a);
    a.hidden = false; a.dataset.tono = 'warn';
    a.innerHTML = `Este WhatsApp ya está en <strong>${esc(otro.nom || 'otro cliente')}</strong>${otro.activo === false ? ' (inhabilitado)' : ''}. Puede guardar igual si es correcto.`;
  }

  // El aviso de cédula ya existe (parches-seguros-base.js); aquí solo se hace legible y se aclara el RNC.
  function pulirCedula() {
    const a = document.getElementById('nx-cedula-aviso'), e = document.getElementById('cCed'); if (!a || !e) return;
    const d = dig(e.value), t = a.textContent || '';
    if (!d) { a.removeAttribute('data-tono'); return; }
    let edit = null; try { edit = editCliId; } catch (x) {}
    const dup = (d.length === 9 || d.length === 11) && clientes().find(c => String(c.id) !== String(edit) && dig(c.cedula) === d);
    if (dup) {
      a.style.display = 'block'; a.dataset.tono = 'err';
      a.innerHTML = `Esta cédula ya es de <strong>${esc(dup.nom)}</strong> (${dup.activo === false ? 'inhabilitado' : 'activo'}). No se puede repetir.`;
      return;
    }
    if (/ya es de/.test(t)) a.dataset.tono = 'err';
    else if (/^✓/.test(t)) a.dataset.tono = 'ok';
    else if (/no parece válido/.test(t)) { a.dataset.tono = 'warn'; a.textContent = 'El último dígito no corresponde. Revise la cédula.'; }
    else if (d.length === 9) { a.dataset.tono = 'info'; a.textContent = 'RNC de 9 dígitos (si es cédula, faltan 2).'; }
    else if (/\/11/.test(t)) { a.dataset.tono = 'info'; a.textContent = `${d.length} de 11 dígitos`; }
  }

  const tarde = f => setTimeout(() => { try { f(); } catch (e) {} }, 0); // después de las capas que ya escuchan el campo
  document.addEventListener('input', ev => {
    const t = ev.target; if (!t || !t.id) return;
    if (t.id === 'cCed') tarde(pulirCedula);
    else if (t.id === 'cEmail') revisarCorreo(false);
    else if (t.id === 'cWA') { const a = document.getElementById('nxClifWa'); if (a && !a.hidden) tarde(revisarWa); }
  });
  document.addEventListener('focusout', ev => {
    const t = ev.target; if (!t || !t.id) return;
    if (t.id === 'cCed') tarde(pulirCedula);
    else if (t.id === 'cEmail') revisarCorreo(true);
    else if (t.id === 'cWA') tarde(revisarWa);
  });
  // Al abrir la ficha: los avisos se calculan con lo que trae (antes podía quedar el de la ficha anterior)
  function alAbrir() {
    setTimeout(() => {
      try { const c = document.getElementById('cCed'); if (c) { c.dispatchEvent(new Event('blur')); pulirCedula(); } } catch (e) {}
      try { quitar(document.getElementById('nxClifCorreo')); quitar(document.getElementById('nxClifWa')); } catch (e) {}
    }, 120);
  }

  function init() {
    let n = 0; const t = setInterval(() => { if (envolver() || ++n > 120) clearInterval(t); }, 250);
    const o = document.getElementById('mCli');
    if (o) { let era = o.classList.contains('open'); new MutationObserver(() => { const ya = o.classList.contains('open'); if (ya && !era) alAbrir(); era = ya; }).observe(o, { attributes: true, attributeFilter: ['class'] }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
