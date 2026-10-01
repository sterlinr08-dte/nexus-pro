/* NEXUS PRO · Botones de navegación de ventanas al estilo Apple (HIG)
   Capa aislada y reversible: para desactivarla basta con quitar su línea en
   parches-seguros.js. No cambia ningún onclick/handler: solo clasifica, mueve,
   viste y anima los botones de salida que ya existen en cada cabecera.

   Reglas (HIG):
   - ✕ a la derecha = salida de una ventana abierta desde una pantalla.
   - ‹ a la izquierda = solo si la ventana está ENCIMA de otra ventana abierta.
   - Una sola salida por acción; el texto suelto se oculta, no se borra.
   - Título centrado entre los dos lados.
   Comportamiento «smart»: clasificación en microtarea (antes del pintado),
   Esc = salida de la ventana de arriba (respeta buscadores/menús), deslizar la
   cabecera hacia abajo para cerrar en móvil, prefers-reduced-* respetados. */
(function () {
  'use strict';
  if (window.__nxNavApple) return;
  window.__nxNavApple = true;

  /* ── Familias de ventana: raíz visible → cabecera. Se evalúan en orden. ── */
  /* Cubre `.overlay > .modal > .mt|.mh` (101 ventanas), `.modal.nxPf > .head`
     (16 de POS) y la fila superior de `#mAbono`. WhatsApp y las hojas sin
     cabecera quedan fuera a propósito. */
  var CAB = ':scope > .modal > .mt, :scope > .modal > .mh, :scope > .modal.nxPf > .head, :scope > .modal > .aboHead > .aboHead-row';
  var FAMILIAS = [
    { raiz: '.overlay.open', cab: CAB, mueve: ':scope > .modal' },
    { raiz: '.overlay.on',   cab: CAB, mueve: ':scope > .modal' }
  ];
  /* Quien ya maneja Esc: si alguno está visible, Esc no cierra la ventana. */
  var CONSUMIDORES_ESC = [
    '.nxBusca-c.open', '.nfcPanel', '#notifPanel.show', '#gsOverlay', '.nxWaChatPop',
    '#nxProdPick', '.nxWaMsgMenu', '.nxWaPreview', '[data-nx-esc-propio]'
  ];
  var MOVIL = function () { return window.innerWidth <= 768; };
  var TACTIL = (function () { try { return matchMedia('(hover:none),(pointer:coarse)').matches; } catch (e) { return false; } })();

  /* ── Resortes de Apple (response 0,35 s) → curvas linear() ──────────────── */
  function resorte(response, zeta) {
    var w0 = 2 * Math.PI / response;
    function x(t) {
      if (zeta >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
      var wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
    }
    var T = 0, t;
    for (t = 0; t < 3; t += 0.005) if (Math.abs(1 - x(t)) > 0.001) T = t;
    T = Math.ceil((T + 0.02) * 100) / 100;
    var n = Math.max(12, Math.round(T / 0.01)), pts = [], i;
    for (i = 0; i <= n; i++) pts.push(x(i / n * T).toFixed(4));
    pts[n] = '1';
    return { dur: T, curva: 'linear(' + pts.join(',') + ')' };
  }
  var SOPORTA_LINEAR = (function () { try { return CSS.supports('animation-timing-function', 'linear(0, 1)'); } catch (e) { return false; } })();
  var SP = {
    d100: resorte(0.35, 1.0),
    d080: resorte(0.35, 0.8),
    d070: resorte(0.35, 0.7)
  };
  /* Respaldo cuando el navegador no entiende linear(): bezier aproximado. */
  var BEZ = { d100: 'cubic-bezier(.22,1,.36,1)', d080: 'cubic-bezier(.34,1.3,.64,1)', d070: 'cubic-bezier(.34,1.56,.64,1)' };
  function curva(k) { return SOPORTA_LINEAR ? SP[k].curva : BEZ[k]; }
  window.__nxNavResortes = SP;

  /* ── CSS ─────────────────────────────────────────────────────────────────
     Peso: `html body .x.x:not(#_)` = (1,2,2) + !important. Hace falta porque
     seguros-base viste .btn/.modal/.mt con !important y hay "blindajes" tipo
     `#mAbono .btn{…!important}` (1,1,0) que de otro modo ganarían. */
  var B = 'html body .nx-nav-btn.nx-nav-btn:not(#_)';
  var H = 'html body [data-nx-nav-cab]:not(#_)';
  var css = ''
    + ':root{--nx-nav-size:36px;--nx-nav-sp1:' + curva('d100') + ';--nx-nav-sp08:' + curva('d080') + ';--nx-nav-sp07:' + curva('d070') + ';'
    + '--nx-nav-t1:' + SP.d100.dur + 's;--nx-nav-t08:' + SP.d080.dur + 's;--nx-nav-t07:' + SP.d070.dur + 's;'
    + '--nx-nav-bg:rgba(255,255,255,.58);--nx-nav-bd:rgba(15,23,42,.10);--nx-nav-hi:rgba(255,255,255,.75);--nx-nav-fg:#0f172a;--nx-nav-bg-h:rgba(255,255,255,.82)}'
    + 'body.tema-premium{--nx-nav-bg:rgba(255,255,255,.08);--nx-nav-bd:rgba(255,255,255,.14);--nx-nav-hi:rgba(255,255,255,.12);--nx-nav-fg:#e8edf7;--nx-nav-bg-h:rgba(255,255,255,.14)}'
    + '@media(max-width:768px){:root{--nx-nav-size:44px}}'
    /* Cabecera: los botones van absolutos a cada lado; el padding simétrico
       hace de espaciador en el lado vacío y el título queda centrado. */
    + H + '{position:relative!important;min-height:var(--nx-nav-size)!important;padding-left:calc(var(--nx-nav-size) + 10px)!important;padding-right:calc(var(--nx-nav-size) + 10px)!important;box-sizing:border-box!important}'
    + H + '[data-nx-nav-centra]{justify-content:center!important;text-align:center!important}'
    + H + '[data-nx-nav-centra]>:not(.nx-nav-btn):not(.nx-nav-grab){flex:0 1 auto!important;min-width:0;text-align:center!important}'
    + H + ' .nx-nav-dup{display:none!important}'
    + H + ' .nx-nav-txt{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;white-space:nowrap!important;margin:0!important;padding:0!important}'
    /* Botón: círculo de cristal, mismo componente para ‹ y ✕ */
    + B + '{position:absolute!important;top:50%!important;margin:0!important;transform:translateY(-50%)!important;width:var(--nx-nav-size)!important;height:var(--nx-nav-size)!important;min-width:0!important;min-height:0!important;max-width:none!important;padding:0!important;border-radius:9999px!important;'
    + 'display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;'
    + 'background:var(--nx-nav-bg)!important;border:1px solid var(--nx-nav-bd)!important;color:var(--nx-nav-fg)!important;'
    + 'box-shadow:inset 0 1px 0 var(--nx-nav-hi),0 1px 2px rgba(15,23,42,.06)!important;'
    + '-webkit-backdrop-filter:blur(14px) saturate(160%)!important;backdrop-filter:blur(14px) saturate(160%)!important;'
    + 'cursor:pointer!important;font-size:0!important;line-height:0!important;letter-spacing:0!important;text-transform:none!important;overflow:visible!important;'
    + 'outline:none!important;-webkit-tap-highlight-color:transparent!important;touch-action:manipulation!important;z-index:3!important;'
    + 'transition:transform var(--nx-nav-t07) var(--nx-nav-sp07),background-color .16s ease-out,border-color .16s ease-out,opacity .16s ease-out!important;will-change:transform}'
    + B + '::before{content:"";position:absolute;inset:-6px;border-radius:9999px}' /* área táctil +6 px */
    + B + '[data-nx-kind="back"]{left:var(--nx-nav-inset,0px)!important;right:auto!important}'
    + B + '[data-nx-kind="x"]{right:var(--nx-nav-inset,0px)!important;left:auto!important}'
    /* Cabeceras con padding propio (modal sin padding): el botón se separa del borde */
    + 'html body .modal.nxPf > .head[data-nx-nav-cab],html body .aboHead-row[data-nx-nav-cab]{--nx-nav-inset:12px;padding-left:calc(var(--nx-nav-size) + 22px)!important;padding-right:calc(var(--nx-nav-size) + 22px)!important}'
    + B + ' .nx-nav-ico{width:calc(var(--nx-nav-size) * .5)!important;height:calc(var(--nx-nav-size) * .5)!important;display:block!important;stroke:currentColor!important;fill:none!important;stroke-width:2.4!important;stroke-linecap:round!important;stroke-linejoin:round!important;transition:transform .22s var(--nx-nav-sp1)!important;pointer-events:none}'
    + B + ' > i,' + B + ' > .ti,' + B + ' > svg:not(.nx-nav-ico),' + B + ' > img{display:none!important}'
    + B + ':hover{background:var(--nx-nav-bg-h)!important;transform:translateY(-50%)!important}'
    + B + ':focus-visible{outline:2px solid #2563eb!important;outline-offset:2px!important}'
    /* Pulsado: clase vía JS (iOS no confía en :active). Hunde en 90 ms y vuelve con rebote d0,7 */
    + B + ':active{transform:translateY(-50%)!important;box-shadow:inset 0 1px 0 var(--nx-nav-hi),0 1px 2px rgba(15,23,42,.06)!important}'
    + B + '.nx-press{transform:translateY(-50%) scale(.86)!important;transition:transform 90ms cubic-bezier(.2,0,0,1)!important}'
    /* Micro-gestos: con mouse la ✕ gira 90°, la ‹ se adelanta 2 px; al tocar, igual */
    + '@media(hover:hover){' + B + '[data-nx-kind="x"]:hover .nx-nav-ico{transform:rotate(90deg)!important}' + B + '[data-nx-kind="back"]:hover .nx-nav-ico{transform:translateX(-2px)!important}}'
    + B + '[data-nx-kind="x"].nx-press .nx-nav-ico{transform:rotate(90deg)!important}' + B + '[data-nx-kind="back"].nx-press .nx-nav-ico{transform:translateX(-2px)!important}'
    /* Entrada: se materializa con la ventana (escala .4→1, desenfoque 6→0, opacidad; d0,8). La ✕ gira −90°→0 50 ms después. */
    + '@keyframes nxNavIn{from{opacity:0;transform:translateY(-50%) scale(.4);filter:blur(6px)}to{opacity:1;transform:translateY(-50%) scale(1);filter:blur(0)}}'
    + '@keyframes nxNavInX{from{transform:rotate(-90deg)}to{transform:rotate(0)}}'
    + B + '.nx-nav-enter{animation:nxNavIn var(--nx-nav-t08) var(--nx-nav-sp08) both!important}'
    + B + '.nx-nav-enter[data-nx-kind="x"] .nx-nav-ico{animation:nxNavInX var(--nx-nav-t08) var(--nx-nav-sp08) 50ms both!important}'
    /* Agarradera y arrastre (móvil) */
    + H + ' .nx-nav-grab{position:absolute!important;left:50%!important;top:4px!important;width:36px!important;height:5px!important;margin-left:-18px!important;border-radius:3px!important;background:var(--nx-nav-fg)!important;opacity:.22!important;pointer-events:none!important;display:none!important}'
    + '@media(max-width:768px){' + H + ' .nx-nav-grab{display:block!important}' + H + '[data-nx-nav-swipe]{touch-action:pan-x!important}}'
    + 'html body .nx-nav-dragging:not(#_){transition:none!important;animation:none!important}'
    + 'html body .nx-nav-settle:not(#_){transition:transform var(--nx-nav-t1) var(--nx-nav-sp1)!important}'
    + 'html body .nx-nav-leaving:not(#_){transition:transform .32s cubic-bezier(.4,0,1,1),opacity .28s ease-in!important;opacity:0!important}'
    /* Accesibilidad */
    + '@media(prefers-reduced-motion:reduce){'
    + B + ',' + B + '.nx-press,' + B + '.nx-nav-enter{transition:opacity .18s ease!important;animation:none!important;transform:translateY(-50%)!important}'
    + B + '.nx-press{opacity:.6!important}'
    + B + ' .nx-nav-ico,' + B + ':hover .nx-nav-ico,' + B + '.nx-press .nx-nav-ico{transition:none!important;animation:none!important;transform:none!important}'
    + 'html body .nx-nav-settle:not(#_),html body .nx-nav-leaving:not(#_){transition:opacity .18s ease!important}}'
    + '@media(prefers-reduced-transparency:reduce){:root{--nx-nav-bg:#ffffff;--nx-nav-bg-h:#f1f5f9}body.tema-premium{--nx-nav-bg:#1e293b;--nx-nav-bg-h:#334155}' + B + '{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}}'
    + '@media(prefers-contrast:more){' + B + '{border:2px solid currentColor!important;box-shadow:none!important}}';
  var st = document.createElement('style');
  st.id = 'nx-nav-apple-css';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  /* ── Utilidades ─────────────────────────────────────────────────────────── */
  function visible(el) {
    if (!el || !el.isConnected) return false;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function q1(raiz, sel) {
    var partes = sel.split(','), i, e;
    for (i = 0; i < partes.length; i++) { try { e = raiz.querySelector(partes[i].trim()); } catch (err) { e = null; } if (e) return e; }
    return null;
  }
  function textoDe(btn) {
    var t = '', i, n;
    for (i = 0; i < btn.childNodes.length; i++) {
      n = btn.childNodes[i];
      if (n.nodeType === 3) t += n.textContent;
      else if (n.nodeType === 1 && !n.matches('i,svg,img,.nx-nav-ico,.nx-nav-txt')) t += n.textContent;
    }
    return t.trim();
  }
  var RX_X = /(^|\s)ti-x(\s|$)|ti-circle-x|ti-square-x/;
  var RX_BACK = /arrow-left|chevron-left|arrow-narrow-left|arrow-back/;
  function clasificarBoton(btn) {
    if (btn.classList.contains('nx-nav-grab')) return null;
    var ic = btn.querySelector('i[class*="ti-"]');
    var cls = ic ? ic.className : '';
    var txt = textoDe(btn);
    var aria = (btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('title') || '');
    var esX = RX_X.test(cls) || /^[✕×x✖]$/i.test(txt) || (/cerrar/i.test(aria) && !RX_BACK.test(cls));
    var esBack = RX_BACK.test(cls) || /^[←‹<]/.test(txt) || /\bvolver\b|\batr[aá]s\b|\bregresar\b/i.test(txt);
    if (/\bcerrar\b/i.test(txt) && !esBack) esX = true;
    if (!esX && !esBack) return null;
    if (btn.classList.contains('nx-volver-btn')) return 'legacy';
    return esBack && !esX ? 'back' : 'x';
  }
  function raizDe(el) {
    var i, r;
    for (i = 0; i < FAMILIAS.length; i++) { r = el.closest(FAMILIAS[i].raiz); if (r) return { el: r, fam: FAMILIAS[i] }; }
    return null;
  }
  function ventanasVisibles() {
    var out = [], i, lista, j;
    for (i = 0; i < FAMILIAS.length; i++) {
      try { lista = document.querySelectorAll(FAMILIAS[i].raiz); } catch (e) { continue; }
      for (j = 0; j < lista.length; j++) if (visible(lista[j]) && out.indexOf(lista[j]) < 0) out.push(lista[j]);
    }
    /* Orden visual: z-index, luego orden en el DOM */
    out.sort(function (a, b) {
      var za = parseInt(getComputedStyle(a).zIndex, 10) || 0, zb = parseInt(getComputedStyle(b).zIndex, 10) || 0;
      if (za !== zb) return za - zb;
      return (a.compareDocumentPosition(b) & 4) ? -1 : 1;
    });
    return out;
  }
  function ventanaSuperior() { var v = ventanasVisibles(); return v.length ? v[v.length - 1] : null; }
  function famDe(raiz) { var i; for (i = 0; i < FAMILIAS.length; i++) if (raiz.matches(FAMILIAS[i].raiz)) return FAMILIAS[i]; return null; }
  function cabeceraDe(raiz) { var f = famDe(raiz); return f ? q1(raiz, f.cab) : null; }
  function cuerpoMovible(raiz) { var f = famDe(raiz); return (f && f.mueve && q1(raiz, f.mueve)) || raiz.firstElementChild; }
  function salidaDe(raiz) {
    var cab = cabeceraDe(raiz);
    if (!cab) return null;
    return cab.querySelector('.nx-nav-btn[data-nx-kind="back"]:not(.nx-nav-dup)') || cab.querySelector('.nx-nav-btn[data-nx-kind="x"]:not(.nx-nav-dup)');
  }

  var SVG_X = '<svg class="nx-nav-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var SVG_BACK = '<svg class="nx-nav-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>';

  function vestir(btn, kind) {
    btn.classList.add('nx-nav-btn');
    btn.classList.remove('nx-nav-dup');
    btn.setAttribute('data-nx-kind', kind);
    btn.setAttribute('aria-label', kind === 'x' ? 'Cerrar' : 'Volver');
    if (!TACTIL) btn.setAttribute('title', kind === 'x' ? 'Cerrar (Esc)' : 'Volver (Esc)'); else btn.removeAttribute('title');
    if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');
    /* Texto suelto → span oculto (no se borra) */
    var i, n, nodos = [];
    for (i = 0; i < btn.childNodes.length; i++) { n = btn.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) nodos.push(n); }
    for (i = 0; i < nodos.length; i++) { var s = document.createElement('span'); s.className = 'nx-nav-txt'; nodos[i].parentNode.insertBefore(s, nodos[i]); s.appendChild(nodos[i]); }
    var ico = btn.querySelector(':scope > .nx-nav-ico');
    var quiere = kind === 'x' ? 'x' : 'back';
    if (!ico || ico.getAttribute('data-k') !== quiere) {
      if (ico) ico.remove();
      btn.insertAdjacentHTML('beforeend', kind === 'x' ? SVG_X : SVG_BACK);
      btn.lastElementChild.setAttribute('data-k', quiere);
    }
  }
  function entrada(btn) {
    if (!btn) return;
    btn.classList.remove('nx-nav-enter');
    void btn.offsetWidth; /* reinicia la animación en cada apertura */
    btn.classList.add('nx-nav-enter');
  }
  function mismaAccion(a, b, raiz) {
    if (a.classList.contains('nx-volver-btn') || b.classList.contains('nx-volver-btn')) return true;
    var oa = (a.getAttribute('onclick') || '').replace(/\s+/g, ''), ob = (b.getAttribute('onclick') || '').replace(/\s+/g, '');
    if (oa && ob) return oa === ob;
    var id = raiz.id;
    var rx = id ? new RegExp("closeM\\(['\"]" + id + "['\"]\\)|#?" + id + "\\b.*remove\\(") : null;
    return !!(rx && (rx.test(oa) || rx.test(ob)));
  }

  /* ── Clasificación de una ventana al abrirse / cambiar ───────────────────── */
  function procesar(raiz, apilada, esNueva) {
    var cab = cabeceraDe(raiz);
    if (!cab) return;
    cab.dataset.nxVolverIgnore = '1'; /* frena el inyector legado de seguros-base */
    var btns = Array.prototype.slice.call(cab.querySelectorAll('button,a,[role="button"]'));
    var xs = [], backs = [], legacy = [], i, k;
    for (i = 0; i < btns.length; i++) {
      k = clasificarBoton(btns[i]);
      if (k === 'x') xs.push(btns[i]); else if (k === 'back') backs.push(btns[i]); else if (k === 'legacy') legacy.push(btns[i]);
    }
    var firma = (apilada ? 'A' : 'S') + ':' + xs.length + ':' + backs.length + ':' + legacy.length;
    if (cab.dataset.nxNavFirma === firma && !esNueva) return;
    cab.dataset.nxNavFirma = firma;

    var todos = xs.concat(backs, legacy);
    for (i = 0; i < todos.length; i++) todos[i].classList.add('nx-nav-dup');

    var principal = null, secundario = null;
    if (!apilada) {
      /* Ventana suelta: una sola ✕ a la derecha. «← Volver» suelto también es ✕. */
      principal = xs[0] || backs[0] || legacy[0];
      if (principal) vestir(principal, 'x');
      /* Un ← con acción distinta (p. ej. paso anterior de un asistente) se conserva como ‹ */
      for (i = 0; i < backs.length; i++) if (backs[i] !== principal && !mismaAccion(backs[i], principal, raiz)) { secundario = backs[i]; break; }
      if (secundario) vestir(secundario, 'back');
    } else {
      /* Apilada: la salida vuelve a la ventana de abajo → ‹ a la izquierda. */
      principal = backs[0] || legacy[0] || xs[0];
      if (principal) vestir(principal, 'back');
      for (i = 0; i < xs.length; i++) if (xs[i] !== principal && !mismaAccion(xs[i], principal, raiz)) { secundario = xs[i]; break; }
      if (secundario) vestir(secundario, 'x');
    }
    /* Sin salida en la cabecera: se le da una ✕ real (solo si sabemos cerrarla con closeM) */
    if (!principal && raiz.id && raiz.classList.contains('overlay') && typeof window.closeM === 'function') {
      var nb = document.createElement('button');
      nb.type = 'button';
      nb.className = 'btn bghost bsm nx-nav-creado';
      nb.setAttribute('onclick', "closeM('" + raiz.id + "')");
      nb.innerHTML = '<i class="ti ti-x"></i>';
      cab.appendChild(nb);
      principal = nb;
      vestir(nb, apilada ? 'back' : 'x');
    }
    cab.setAttribute('data-nx-nav-cab', '1');
    /* Centrado del título: solo cuando el resto de la cabecera es un único bloque */
    var otros = Array.prototype.filter.call(cab.children, function (c) { return !c.classList.contains('nx-nav-btn') && !c.classList.contains('nx-nav-grab') && !c.classList.contains('nx-nav-dup') && visible(c); });
    if (otros.length <= 1 && !cab.classList.contains('aboHead-row')) cab.setAttribute('data-nx-nav-centra', '1'); else cab.removeAttribute('data-nx-nav-centra');
    if (!cab.querySelector(':scope > .nx-nav-grab')) { var g = document.createElement('div'); g.className = 'nx-nav-grab'; g.setAttribute('aria-hidden', 'true'); cab.appendChild(g); }
    cab.setAttribute('data-nx-nav-swipe', '1');
    if (esNueva) { entrada(principal); if (secundario) entrada(secundario); }
  }

  var abiertas = new Set();
  var pendiente = false;
  function barrido() {
    pendiente = false;
    var vis = ventanasVisibles(), i, r;
    for (i = 0; i < vis.length; i++) {
      r = vis[i];
      var esNueva = !abiertas.has(r);
      if (esNueva) { abiertas.add(r); r.setAttribute('data-nx-apilada', i > 0 ? '1' : '0'); }
      procesar(r, r.getAttribute('data-nx-apilada') === '1', esNueva);
    }
    abiertas.forEach(function (r) { if (vis.indexOf(r) < 0) { abiertas.delete(r); r.removeAttribute('data-nx-apilada'); } });
  }
  var nBarridos = 0, fusibleArmado = false;
  function programar() {
    if (pendiente) return;
    /* Fusible: barridos encadenados por microtarea sin que el navegador llegue a
       pintar. Se reinicia en una macrotarea; si pasa de 100 seguidos, se corta. */
    if (!fusibleArmado) { fusibleArmado = true; setTimeout(function () { fusibleArmado = false; nBarridos = 0; }, 0); }
    if (++nBarridos > 100) { try { observador.disconnect(); console.error('[nav-apple] bucle de mutaciones; capa detenida'); } catch (e) {} return; }
    pendiente = true;
    queueMicrotask(barrido); /* antes del pintado: sin parpadeo ni salto */
  }
  var observador = new MutationObserver(programar);
  observador.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', programar); else programar();

  /* ── Pulsado en pointer-down (visible ≥ 90 ms); arrastrar fuera cancela ──── */
  var pressT = 0;
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.nx-nav-btn');
    if (!b || e.button > 0) return;
    pressT = performance.now();
    b.classList.add('nx-press');
    b.__nxPressId = e.pointerId;
  }, true);
  function soltar(e, cancelado) {
    var b = document.querySelector('.nx-nav-btn.nx-press');
    if (!b) return;
    var resto = Math.max(0, 90 - (performance.now() - pressT));
    setTimeout(function () { b.classList.remove('nx-press'); }, resto);
    if (cancelado) b.__nxCancelado = true;
  }
  document.addEventListener('pointerup', function (e) { soltar(e, false); }, true);
  document.addEventListener('pointercancel', function (e) { soltar(e, true); }, true);
  document.addEventListener('pointermove', function (e) {
    var b = document.querySelector('.nx-nav-btn.nx-press');
    if (!b || b.__nxPressId !== e.pointerId) return;
    var r = b.getBoundingClientRect(), m = 6 + 10; /* área ampliada + histéresis */
    if (e.clientX < r.left - m || e.clientX > r.right + m || e.clientY < r.top - m || e.clientY > r.bottom + m) soltar(e, true);
  }, true);

  /* ── Esc = salida de la ventana de arriba, respetando a quien ya la usa ──── */
  var escOcupado = false;
  function hayConsumidorEsc(e) {
    var i, el;
    var a = document.activeElement;
    if (a && a.matches && a.matches('input[type="search"],[role="combobox"],[aria-expanded="true"]')) return true;
    if (a && a.tagName === 'SELECT') return true;
    for (i = 0; i < CONSUMIDORES_ESC.length; i++) { try { el = document.querySelector(CONSUMIDORES_ESC[i]); } catch (err) { el = null; } if (el && visible(el)) return true; }
    return false;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') escOcupado = hayConsumidorEsc(e); }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.defaultPrevented || escOcupado) return;
    var top = ventanaSuperior();
    if (!top) return;
    var s = salidaDe(top);
    if (!s) return;
    e.preventDefault();
    s.classList.add('nx-press');
    setTimeout(function () { s.classList.remove('nx-press'); }, 110);
    s.click();
  }, false);

  /* ── Móvil: deslizar la cabecera hacia abajo para cerrar ─────────────────── */
  var REDUCIDO = function () { try { return matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { return false; } };
  function rubber(x, d) { var c = 0.55; return x * d * c / (d + c * Math.abs(x)); }
  function proyectar(v) { return v * 0.998 / (1 - 0.998); } /* v en px/ms */
  function tyActual(el) {
    var t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    var m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!m) return 0;
    var p = m[1].split(',').map(parseFloat);
    return p.length === 16 ? p[13] : p[5];
  }
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' || !MOVIL()) return;
    var cab = e.target.closest && e.target.closest('[data-nx-nav-swipe]');
    if (!cab || e.target.closest('.nx-nav-btn,input,select,textarea,a,[contenteditable]')) return;
    var raiz = raizDe(cab); if (!raiz) return;
    var cuerpo = cuerpoMovible(raiz.el); if (!cuerpo) return;
    var y0 = tyActual(cuerpo); /* si estaba volviendo, se agarra desde donde está */
    cuerpo.classList.remove('nx-nav-settle');
    cuerpo.style.animation = 'none';
    drag = { cab: cab, raiz: raiz.el, cuerpo: cuerpo, id: e.pointerId, x0: e.clientX, y0: e.clientY, base: y0, modo: y0 ? 'v' : null, hist: [], alto: cuerpo.getBoundingClientRect().height || 400 };
    try { cab.setPointerCapture(e.pointerId); } catch (err) {}
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.modo) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; /* histéresis */
      if (Math.abs(dx) > Math.abs(dy)) { drag = null; return; }  /* horizontal: no es nuestro */
      drag.modo = 'v';
      drag.y0 = e.clientY; /* desde aquí sigue el dedo 1:1, sin salto al cruzar la histéresis */
      dy = 0;
      drag.cuerpo.classList.add('nx-nav-dragging');
    }
    e.preventDefault();
    var y = drag.base + dy;
    if (y < 0) y = rubber(y, drag.alto);
    drag.cuerpo.style.transform = 'translateY(' + y + 'px)';
    drag.hist.push({ t: e.timeStamp, y: y });
    if (drag.hist.length > 6) drag.hist.shift();
  }, { passive: false, capture: true });
  function finDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null;
    try { d.cab.releasePointerCapture(d.id); } catch (err) {}
    d.cuerpo.classList.remove('nx-nav-dragging');
    if (!d.modo) return;
    var h = d.hist, v = 0;
    if (h.length >= 2) { var a = h[0], b = h[h.length - 1]; if (b.t > a.t) v = (b.y - a.y) / (b.t - a.t); }
    var y = tyActual(d.cuerpo);
    var destino = y + proyectar(v);
    var umbral = Math.min(220, Math.max(120, d.alto / 2));
    var salida = salidaDe(d.raiz);
    if (destino > umbral && salida && e.type !== 'pointercancel') {
      try { if (navigator.vibrate && !/iPhone|iPad|iPod/.test(navigator.userAgent)) navigator.vibrate(12); } catch (err) {}
      var cerrar = function () {
        d.cuerpo.classList.remove('nx-nav-leaving');
        d.cuerpo.style.transform = ''; /* sin desplazamiento para la próxima vez */
        d.cuerpo.style.animation = '';
        salida.click(); /* el botón real, mismo handler */
      };
      if (REDUCIDO()) { cerrar(); return; }
      d.cuerpo.classList.add('nx-nav-leaving');
      d.cuerpo.style.transform = 'translateY(' + Math.max(d.alto, window.innerHeight) + 'px)';
      var hecho = false, fin = function () { if (hecho) return; hecho = true; d.cuerpo.removeEventListener('transitionend', fin); cerrar(); };
      d.cuerpo.addEventListener('transitionend', fin);
      setTimeout(fin, 380);
    } else {
      d.cuerpo.classList.add('nx-nav-settle'); /* vuelve con resorte d1,0 */
      d.cuerpo.style.transform = 'translateY(0px)';
      var limpiar = function () { d.cuerpo.removeEventListener('transitionend', limpiar); d.cuerpo.classList.remove('nx-nav-settle'); d.cuerpo.style.transform = ''; };
      d.cuerpo.addEventListener('transitionend', limpiar);
      setTimeout(limpiar, SP.d100.dur * 1000 + 60);
    }
  }
  document.addEventListener('pointerup', finDrag, true);
  document.addEventListener('pointercancel', finDrag, true);

  window.nxNavApple = { ventanas: ventanasVisibles, superior: ventanaSuperior, salida: salidaDe, procesar: barrido, resortes: SP };
})();
