/* NEXUS PRO · 59.26 — «Que se sienta instantáneo» (dueño, 14-oct-2026: «aplica las 4»; ideas del reel de Raycast de
   @designmotionhq y de su biblioteca de patrones, ver docs/REFERENCIAS-DISENO.md).
     1) Lo guardado primero → está DENTRO de parches-whatsapp-inbox.js (precarga en memoria + nada de «0» mientras carga).
     2) Línea fina arriba en vez de la rueda: aparece sola cuando una lectura a la base tarda más de 300 ms; los
        «Cargando…» de las listas pasan a filas de espera; el ícono de «Enviando…» por fin gira.
     3) «Deshacer» al archivar un chat de WhatsApp (8 s). Nunca en pagos ni en nada de dinero.
     4) Campos que se forman solos: teléfono 809-000-0000, cédula 000-0000000-0 en Préstamos, y el cursor ya no salta
        al final cuando se corrige en medio de un monto, una cédula o un teléfono.
   No toca Supabase, cobros, WhatsApp ni reglas de negocio: solo la vista. No guarda nada en el equipo.
   Para apagarla: borrar su línea en parches-seguros.js, o en un equipo localStorage.nxRapidez='0'. */
(function () {
  'use strict';
  if (window.__nxRapidez) return; window.__nxRapidez = true;
  try { if (localStorage.getItem('nxRapidez') === '0') return; } catch (e) {}

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = () => { try { return (typeof API !== 'undefined') ? API : window.API; } catch (e) { return window.API; } };

  /* ── Estilos ── */
  const css = document.createElement('style'); css.id = 'nxRapidezCss';
  css.textContent = `
#nxLinea{position:fixed;left:0;right:0;top:env(safe-area-inset-top,0px);height:2px;z-index:100002;pointer-events:none;overflow:hidden;opacity:0;transition:opacity .2s ease}
#nxLinea.on{opacity:1}
#nxLinea::before{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;border-radius:2px;background:linear-gradient(90deg,transparent,var(--c1,#00e5c7),transparent);animation:nxLineaVa 1.1s cubic-bezier(.65,0,.35,1) infinite}
@keyframes nxLineaVa{from{transform:translateX(-100%)}to{transform:translateX(260%)}}
div.loading>.spin{display:none}
div.loading{flex-direction:column;align-items:stretch;gap:10px;padding:16px 4px;color:transparent!important;font-size:0!important;min-height:120px}
div.loading::before,div.loading::after{content:"";display:block;height:46px;border-radius:12px;background:linear-gradient(90deg,rgba(148,163,184,.10) 25%,rgba(148,163,184,.20) 37%,rgba(148,163,184,.10) 63%);background-size:400% 100%;animation:nxSkBrillo 1.4s ease infinite}
div.loading::after{opacity:.6}
.nxWaSkRow{display:flex;align-items:center;gap:12px;padding:12px 14px;pointer-events:none}
.nxWaSkRow i,.nxWaSkRow b,.nxWaSkRow span{display:block;background:linear-gradient(90deg,rgba(148,163,184,.12) 25%,rgba(148,163,184,.22) 37%,rgba(148,163,184,.12) 63%);background-size:400% 100%;animation:nxSkBrillo 1.4s ease infinite}
.nxWaSkRow i{flex:none;width:42px;height:42px;border-radius:50%}
.nxWaSkRow div{flex:1;min-width:0}
.nxWaSkRow b{width:46%;height:12px;border-radius:6px;margin-bottom:8px}
.nxWaSkRow span{width:72%;height:10px;border-radius:5px}
.nxSkNum{display:inline-block;min-width:1.6em;border-radius:6px;color:transparent;background:linear-gradient(90deg,rgba(148,163,184,.12) 25%,rgba(148,163,184,.24) 37%,rgba(148,163,184,.12) 63%);background-size:400% 100%;animation:nxSkBrillo 1.4s ease infinite}
.nxSrOnly{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes nxSkBrillo{0%{background-position:100% 50%}100%{background-position:0 50%}}
.ti-loader-2,.ti-loader{display:inline-block;animation:sp .8s linear infinite}
.toast .nxDeshacer{flex:none;min-height:44px;padding:0 10px;border:0;background:transparent;color:var(--c1,#00e5c7);font:800 12px inherit;cursor:pointer;pointer-events:auto}
@media(prefers-reduced-motion:reduce){#nxLinea::before{animation-duration:2.4s}div.loading::before,div.loading::after,.nxWaSkRow *,.nxSkNum{animation:none}.ti-loader-2,.ti-loader{animation-duration:2s}}
`;
  (document.head || document.documentElement).appendChild(css);

  /* ── 2) Línea fina de progreso ── */
  let vuelo = 0, tLinea = null;
  function linea() { let l = document.getElementById('nxLinea'); if (!l && document.body) { l = document.createElement('div'); l.id = 'nxLinea'; l.setAttribute('aria-hidden', 'true'); document.body.appendChild(l); } return l; }
  function marcar(d) {
    vuelo = Math.max(0, vuelo + d);
    if (vuelo > 0 && !tLinea) tLinea = setTimeout(() => { tLinea = null; if (vuelo > 0) linea()?.classList.add('on'); }, 300);
    if (vuelo === 0) { if (tLinea) { clearTimeout(tLinea); tLinea = null; } linea()?.classList.remove('on'); }
  }
  const fetchOriginal = window.fetch;
  if (typeof fetchOriginal === 'function' && !fetchOriginal.__nxLinea) {
    const f = function (input) {
      let mide = false;
      try { const u = String(typeof input === 'string' ? input : (input && input.url) || ''); const A = api(); mide = !!(A && A.url && u.indexOf(A.url) === 0 && /\/(rest|functions|storage)\/v1\//.test(u)); } catch (e) {}
      if (!mide) return fetchOriginal.apply(this, arguments);
      marcar(1);
      let p; try { p = fetchOriginal.apply(this, arguments); } catch (e) { marcar(-1); throw e; }
      return Promise.resolve(p).finally(() => marcar(-1));
    };
    f.__nxLinea = true;
    window.fetch = f;
  }

  /* ── 3) «Deshacer» al archivar un chat ── */
  let ultimoArchivado = null; // {id, t}
  function envolverAccion() {
    const o = window.nxWaHiloAccion;
    if (typeof o !== 'function' || o.__nxDeshacer) return !!o;
    const n = async function (id, accion, valor) {
      const r = await o.apply(this, arguments);
      if (r && accion === 'archivar' && valor) ultimoArchivado = { id, t: Date.now() };
      return r;
    };
    n.__nxDeshacer = true;
    window.nxWaHiloAccion = n;
    return true;
  }
  function toastDeshacer(ttl, id) {
    const host = document.getElementById('toastS'); if (!host) return false;
    const el = document.createElement('div'); el.className = 'toast ok'; el.setAttribute('role', 'status');
    el.innerHTML = '<div class="ti-ic"><i class="ti ti-archive"></i></div><div class="ti-b"><div class="ti-t">' + esc(ttl) + '</div></div><button type="button" class="nxDeshacer">Deshacer</button><button type="button" class="ti-x" aria-label="Cerrar aviso"><i class="ti ti-x"></i></button>';
    el.querySelector('.ti-x').onclick = () => el.remove();
    el.querySelector('.nxDeshacer').onclick = async () => {
      el.remove();
      const ok = await window.nxWaHiloAccion(id, 'archivar', false);
      if (ok) try { toastOriginal('ok', 'Chat de vuelta en la lista', ''); } catch (e) {}
    };
    host.appendChild(el); setTimeout(() => el.remove(), 8000);
    return true;
  }
  let toastOriginal = null;
  function envolverToast() {
    const o = window.toast;
    if (typeof o !== 'function' || o.__nxDeshacer) return !!o;
    toastOriginal = o;
    const n = function (tp, ttl) {
      if (tp === 'ok' && ttl === 'Chat archivado' && ultimoArchivado && Date.now() - ultimoArchivado.t < 3000) {
        const id = ultimoArchivado.id; ultimoArchivado = null;
        if (toastDeshacer(ttl, id)) return;
      }
      return o.apply(this, arguments);
    };
    n.__nxDeshacer = true;
    window.toast = n;
    return true;
  }

  /* ── 4) Campos que se forman solos y cursor que no salta ── */
  const TELEFONOS = ['cTel', 'cWA', 'prTel', 'prcTel', 'prcTelAlt', 'prcR1T', 'prcR2T', 'prcFT'];
  const CEDULAS = ['prCed', 'prcCed', 'prcFC'];
  function fmtTel(v) {
    let d = String(v || '').replace(/\D/g, '');
    let pre = '';
    if (d.length === 11 && d[0] === '1') { pre = '1 '; d = d.slice(1); }
    d = d.slice(0, 10);
    if (d.length <= 3) return pre + d;
    if (d.length <= 6) return pre + d.slice(0, 3) + '-' + d.slice(3);
    return pre + d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  }
  function fmtCed(v) {
    const c = String(v || '').replace(/\D/g, '').slice(0, 11);
    if (c.length <= 3) return c;
    if (c.length <= 10) return c.slice(0, 3) + '-' + c.slice(3);
    return c.slice(0, 3) + '-' + c.slice(3, 10) + '-' + c.slice(10);
  }
  const mascara = el => el && el.id ? (TELEFONOS.includes(el.id) ? fmtTel : CEDULAS.includes(el.id) ? fmtCed : null) : null;
  const vigilado = el => !!(el && el.tagName === 'INPUT' && (mascara(el) || el.hasAttribute('data-nx-money') || el.id === 'cCed'));
  const cuenta = (s, n) => (String(s).slice(0, n).match(/[\d.]/g) || []).length;
  function posDe(s, k) { if (k <= 0) return 0; let c = 0; for (let i = 0; i < s.length; i++) { if (/[\d.]/.test(s[i]) && ++c === k) return i + 1; } return s.length; }
  // Antes de que formatee cualquier capa: cuántos números hay a la izquierda del cursor.
  document.addEventListener('input', e => {
    const el = e.target; if (!vigilado(el)) return;
    try { el.__nxAntes = cuenta(el.value, el.selectionStart ?? el.value.length); el.__nxFin = (el.selectionStart ?? 0) >= el.value.length; } catch (err) { el.__nxAntes = null; }
  }, true);
  // Después (las capas del campo ya formatearon): se aplica la máscara si toca y el cursor vuelve a su sitio.
  document.addEventListener('input', e => {
    const el = e.target; if (!vigilado(el)) return;
    const m = mascara(el);
    if (m) { const v = m(el.value); if (v !== el.value) el.value = v; }
    if (el.__nxAntes == null || el.__nxFin || document.activeElement !== el) return;
    try { const p = posDe(el.value, el.__nxAntes); el.setSelectionRange(p, p); } catch (err) {}
  }, false);
  document.addEventListener('focusin', e => {
    const el = e.target, m = mascara(el); if (!m) return;
    if (TELEFONOS.includes(el.id)) el.setAttribute('inputmode', 'tel'); else el.setAttribute('inputmode', 'numeric');
    el.setAttribute('autocomplete', 'off');
    if (el.value) { const v = m(el.value); if (v !== el.value) el.value = v; }
  }, true);

  window.nxRapidez = { fmtTel, fmtCed, vuelo: () => vuelo };

  let n = 0; const t = setInterval(() => { const a = envolverAccion(), b = envolverToast(); if ((a && b) || ++n > 160) clearInterval(t); }, 250);
})();
