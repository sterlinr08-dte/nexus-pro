/* NEXUS PRO · 59.28 — «Tamaño de los textos» (dueño, 14-oct-2026: «Sí, el tamaño de los textos, hazlo»).
   Configuración → Apariencia gana dos controles por usuario:
     · Cuadros: tarjetas e indicadores (números grandes del Inicio, totales de Cobros/Facturas/Clientes, KPI de Préstamos,
       Solicitudes y WhatsApp, cajitas de Reportes, títulos de tarjeta).
     · Listas: filas y tablas (Cobros, Facturas, Clientes, Pólizas, Pagos, Préstamos, Solicitudes, chats de WhatsApp).
   Tamaños: Pequeño 90 % · Normal 100 % · Grande 115 % · Extra grande 130 %.
   Cómo funciona: NEXUS tiene ~1,000 tamaños fijos en px (muchos con !important), así que una regla CSS no alcanza.
   La capa mide el tamaño original de cada texto dentro de esos cuadros/listas y le pone ese tamaño × el factor
   (también el interlineado si es fijo). Los textos nuevos que aparecen al pintar una pantalla se ajustan antes del
   siguiente pintado (MutationObserver), así que no se ve el cambio. Con «Normal» no toca nada.
   No toca: menú, barra de arriba, menú de abajo, ventanas, avisos, el chat abierto de WhatsApp, botones ni campos de formulario.
   Preferencia: en la base (usuario_preferencias vía nxPrefSet), igual que el tema. Copia local SOLO para el primer
   pintado antes de que llegue la base (como 'nx_tema'): 'nx_txt' = "factorCuadros,factorListas".
   Para quitarla: borrar su línea en parches-seguros.js; o en un equipo, localStorage.nxTamanoTexto='0'. */
(function () {
  'use strict';
  if (window.__nxTamanoTexto) return; window.__nxTamanoTexto = true;
  try { if (localStorage.getItem('nxTamanoTexto') === '0') return; } catch (e) {}

  var OPC = [{ id: 'chico', nom: 'Pequeño', k: 0.9 }, { id: 'normal', nom: 'Normal', k: 1 }, { id: 'grande', nom: 'Grande', k: 1.15 }, { id: 'xl', nom: 'Extra grande', k: 1.3 }];
  var K = { c: 1, l: 1 };
  var factor = function (id) { for (var i = 0; i < OPC.length; i++) if (OPC[i].id === id) return OPC[i].k; return 1; };
  var idDe = function (k) { for (var i = 0; i < OPC.length; i++) if (Math.abs(OPC[i].k - k) < 0.001) return OPC[i].id; return 'normal'; };

  var CUADROS = ['.kpi', 'div.sm:not(.ab):not(.nxFP-avatar)', '.nxSf .sf-kpi', '.nxIG-card', '.nxFP-kpi', '#v-crm .nxCrmKpi', '#v-waInbox .nxWaProKpi',
    '.nc > .ch .ct', '.nxSf .sf-panel h3'].join(',');
  var LISTAS = ['.tw table', 'table.sf-tbl', '#tbFact', '#tbCob', '.nxCobFila', '.nxCobCard', '#tbCli', '.clirow', '.sf-fancard',
    '.cliCard', '#tbPol', '#tbPagos', '.nxFP-card', '.nxFP-tbl', '.prCard', '#nxWaLista .nxWaRow', '.nxCrmList', '.nxCrmCard',
    '.nxSolPayCard'].join(',');
  var NO = ['nav', '.sb', '#sbEl', '.tnav', '#pttl', '.mobile-bottom-nav-clean', '.mobile-more-sheet-clean', '.nx-fab', '.overlay',
    '.modal', '[role="dialog"]', '.nxCrmModal', '.nxWaChatPop', '.factMenu', '.acc-menu', '#toastS', '.toast', '.nxIsla',
    '#loginScreen', 'button', '.ab', '.btn', '#nxWaMsgsBox', '.nxWaMsgs', '.nxWaHead', '.nxWaComposer', '.nxWaCerrada', '#nxTxtPrev'].join(',');
  var SALTAR = { INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1, SCRIPT: 1, STYLE: 1, SVG: 1, svg: 1, IMG: 1, CANVAS: 1, VIDEO: 1 };

  function tieneTexto(el) {
    for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }
  function esIcono(el) { var c = el.className; return typeof c === 'string' && /(^|\s)(ti|ti-[\w-]+)(\s|$)/.test(c) && !tieneTexto(el); }

  /* Ajusta un elemento ya marcado con su grupo (c = cuadros, l = listas). Lecturas primero, escrituras después. */
  function medir(el) {
    if (el.__nxTxt0) return el.__nxTxt0;
    var cs = getComputedStyle(el), fs = parseFloat(cs.fontSize) || 0, lh = cs.lineHeight;
    el.__nxTxt0 = { fs: fs, lh: /px$/.test(lh) ? parseFloat(lh) : 0 };
    return el.__nxTxt0;
  }
  function escribir(el, o, k) {
    if (k === 1) {
      if (el.__nxTxtK) { el.style.removeProperty('font-size'); el.style.removeProperty('line-height'); el.__nxTxtK = 0; }
      return;
    }
    if (el.__nxTxtK === k) return;
    el.style.setProperty('font-size', (o.fs * k).toFixed(2) + 'px', 'important');
    if (o.lh) el.style.setProperty('line-height', (o.lh * k).toFixed(2) + 'px', 'important');
    el.__nxTxtK = k;
  }
  function grupoDe(el) {
    if (el.closest(NO)) return '';
    if (el.closest(CUADROS)) return 'c';
    if (el.closest(LISTAS)) return 'l';
    return '';
  }
  /* Recorre un subárbol y ajusta los elementos con texto propio que estén dentro de cuadros o listas. */
  function procesar(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    if (K.c === 1 && K.l === 1 && !raiz.querySelector('[data-nx-txt]') && !raiz.hasAttribute('data-nx-txt')) return;
    var cnt = document.getElementById('cnt'); if (!cnt || !cnt.contains(raiz)) return;
    var todos = [raiz].concat(Array.prototype.slice.call(raiz.querySelectorAll('*')));
    var trabajo = [];
    for (var i = 0; i < todos.length; i++) {
      var el = todos[i];
      if (SALTAR[el.tagName] || esIcono(el)) continue;
      if (!tieneTexto(el) && !el.hasAttribute('data-nx-txt')) continue;
      var g = el.getAttribute('data-nx-txt') || grupoDe(el);
      if (!g) continue;
      var k = K[g];
      if (k === 1 && !el.__nxTxtK) continue;
      if (!el.__nxTxtK) { el.style.removeProperty('font-size'); el.style.removeProperty('line-height'); }
      trabajo.push([el, g, k]);
    }
    for (var j = 0; j < trabajo.length; j++) medir(trabajo[j][0]);           // lecturas
    for (var m = 0; m < trabajo.length; m++) {                                // escrituras
      var t = trabajo[m]; t[0].setAttribute('data-nx-txt', t[1]); escribir(t[0], t[0].__nxTxt0, t[2]);
    }
  }
  function todo() { procesar(document.getElementById('cnt')); }

  /* Textos nuevos (cada pantalla se pinta con innerHTML): se ajustan en el mismo microtask, antes del pintado. */
  var mo = new MutationObserver(function (lista) {
    if (K.c === 1 && K.l === 1) return;
    var vistos = [];
    for (var i = 0; i < lista.length; i++) {
      var r = lista[i];
      if (r.type === 'characterData') { if (r.target.parentElement) vistos.push(r.target.parentElement); continue; }
      for (var j = 0; j < r.addedNodes.length; j++) {
        var n = r.addedNodes[j];
        if (n.nodeType === 1) vistos.push(n); else if (n.nodeType === 3 && n.parentElement) vistos.push(n.parentElement);
      }
    }
    for (var v = 0; v < vistos.length; v++) {
      var el = vistos[v];
      if (el.__nxTxt0 && el.nodeType === 1) { el.__nxTxt0 = null; el.__nxTxtK = 0; } // su texto cambió: volver a medir
      procesar(el);
    }
  });
  function observar() {
    var cnt = document.getElementById('cnt'); if (!cnt) return false;
    mo.observe(cnt, { childList: true, subtree: true, characterData: true });
    return true;
  }

  /* Cambio de ancho (girar el celular): los tamaños originales cambian por las reglas de móvil; se vuelven a medir. */
  var tRes = 0, anchoPrev = innerWidth;
  addEventListener('resize', function () {
    if (Math.abs(innerWidth - anchoPrev) < 40) return; anchoPrev = innerWidth;
    clearTimeout(tRes); tRes = setTimeout(function () { reiniciar(); todo(); }, 200);
  });
  function reiniciar() {
    var ms = document.querySelectorAll('[data-nx-txt]');
    for (var i = 0; i < ms.length; i++) { var el = ms[i]; el.style.removeProperty('font-size'); el.style.removeProperty('line-height'); el.__nxTxt0 = null; el.__nxTxtK = 0; }
  }

  function aplicar(kc, kl) {
    K.c = kc; K.l = kl;
    var h = document.documentElement;
    h.setAttribute('data-nx-txt-c', idDe(kc)); h.setAttribute('data-nx-txt-l', idDe(kl));
    try { localStorage.setItem('nx_txt', kc + ',' + kl); } catch (e) {}   // espejo SOLO para el primer pintado
    todo();
  }
  window.nxTamanoTexto = { aplicar: aplicar, factores: function () { return { c: K.c, l: K.l }; }, procesar: todo };

  /* CSS: el número del Inicio tiene alto fijo (30 px) y se cortaría al crecer. */
  var css = document.createElement('style'); css.id = 'nxTamanoTextoCss';
  css.textContent = 'html:not([data-nx-txt-c="normal"]) .nxIG-kv{height:auto!important;min-height:30px}' +
    '.nxTxtSeg{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.nxTxtSeg button{min-width:0;min-height:44px;padding:6px 4px;border-radius:12px;' +
    'border:1.5px solid var(--border,#e2e8f0);background:transparent;color:var(--tx1);font:700 11.5px/1.2 inherit;letter-spacing:0;cursor:pointer;overflow-wrap:anywhere}' +
    '.nxTxtSeg button.on{border-color:var(--c1);background:color-mix(in srgb,var(--c1) 14%,transparent);color:var(--c1)}' +
    '.nxTxtSeg button:active{transform:scale(.97)}' +
    '#nxTxtPrev{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:12px}' +
    '#nxTxtPrev .pv{border:1px solid var(--border,#e2e8f0);border-radius:14px;padding:12px}' +
    '#nxTxtPrev .pl{font-size:10px;color:var(--tx3);font-weight:700;letter-spacing:.04em}#nxTxtPrev .pk{font-size:19px;font-weight:800;color:var(--tx1);margin-top:2px}' +
    '#nxTxtPrev .rn{font-size:14px;font-weight:700;color:var(--tx1)}#nxTxtPrev .rs{font-size:11.5px;color:var(--tx3);margin-top:2px}' +
    '@media(max-width:560px){#nxTxtPrev{grid-template-columns:1fr}}';
  (document.head || document.documentElement).appendChild(css);

  /* Primer pintado: copia local; luego la base manda (al cargar la sesión). */
  (function () {
    var kc = 1, kl = 1;
    try { var v = (localStorage.getItem('nx_txt') || '').split(','); if (v.length === 2) { kc = +v[0] || 1; kl = +v[1] || 1; } } catch (e) {}
    K.c = kc; K.l = kl;
    document.documentElement.setAttribute('data-nx-txt-c', idDe(kc)); document.documentElement.setAttribute('data-nx-txt-l', idDe(kl));
  })();
  function desdeBase() {
    try {
      if (typeof nxPref !== 'function') return;
      var c = factor(nxPref('texto_cuadros', 'normal')), l = factor(nxPref('texto_listas', 'normal'));
      if (c !== K.c || l !== K.l) aplicar(c, l); else todo();
    } catch (e) {}
  }
  /* cargarTemaGuardado() corre justo después de traer las preferencias de la base: ahí se aplica la del usuario. */
  function engancharTema() {
    var o = window.cargarTemaGuardado;
    if (typeof o !== 'function' || o.__nxTxt) return !!o;
    var n = function () { var r = o.apply(this, arguments); try { desdeBase(); } catch (e) {} return r; };
    n.__nxTxt = true; window.cargarTemaGuardado = n; return true;
  }

  /* Control en Configuración → Apariencia (debajo de los temas). */
  function tarjeta() {
    var c = idDe(K.c), l = idDe(K.l);
    var seg = function (g, sel) {
      return '<div class="nxTxtSeg" role="radiogroup" aria-label="' + (g === 'c' ? 'Tamaño de los cuadros' : 'Tamaño de las listas') + '">' +
        OPC.map(function (o) { return '<button type="button" role="radio" aria-checked="' + (o.id === sel) + '" class="' + (o.id === sel ? 'on' : '') + '" data-g="' + g + '" data-t="' + o.id + '">' + o.nom + '</button>'; }).join('') + '</div>';
    };
    return '<div class="nc" id="nxTxtCard" style="margin-top:14px"><div class="ch"><div class="ct">🔠 Tamaño de los textos</div></div>' +
      '<div style="font-size:11px;color:var(--tx2);margin-bottom:12px;line-height:1.5">Agranda o achica las letras de NEXUS. Se guarda para tu usuario y lo verás igual en el celular y en la computadora.</div>' +
      '<div style="font-size:12px;font-weight:700;color:var(--tx1);margin:4px 0 8px">Cuadros e indicadores <span style="font-weight:500;color:var(--tx3)">(números grandes, totales)</span></div>' + seg('c', c) +
      '<div style="font-size:12px;font-weight:700;color:var(--tx1);margin:14px 0 8px">Listas <span style="font-weight:500;color:var(--tx3)">(Cobros, Facturas, Clientes, chats)</span></div>' + seg('l', l) +
      '<div id="nxTxtPrev" aria-hidden="true"><div class="pv"><div class="pl">COBRADO HOY</div><div class="pk">RD$ 25,000</div></div>' +
      '<div class="pv"><div class="rn">María Rodríguez</div><div class="rs">Al día · Agente Robinson · RD$ 1,250</div></div></div></div>';
  }
  function pintarPrev() {
    var p = document.getElementById('nxTxtPrev'); if (!p) return;
    var set = function (sel, base, k) { var e = p.querySelector(sel); if (e) e.style.fontSize = (base * k).toFixed(1) + 'px'; };
    set('.pl', 10, K.c); set('.pk', 19, K.c); set('.rn', 14, K.l); set('.rs', 11.5, K.l);
  }
  function montar() {
    var cont = document.getElementById('cfgApariencia'); if (!cont || document.getElementById('nxTxtCard')) return;
    cont.insertAdjacentHTML('beforeend', tarjeta()); pintarPrev();
    cont.querySelector('#nxTxtCard').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-g]'); if (!b) return;
      var g = b.getAttribute('data-g'), t = b.getAttribute('data-t'), k = factor(t);
      b.parentNode.querySelectorAll('button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
      aplicar(g === 'c' ? k : K.c, g === 'l' ? k : K.l);
      try { if (typeof nxPrefSet === 'function') nxPrefSet(g === 'c' ? 'texto_cuadros' : 'texto_listas', t === 'normal' ? null : t); } catch (err) {}
      pintarPrev();
    });
  }
  function engancharApariencia() {
    var o = window.rApariencia;
    if (typeof o !== 'function' || o.__nxTxt) return !!o;
    var n = function () { var r = o.apply(this, arguments); try { montar(); } catch (e) {} return r; };
    n.__nxTxt = true; window.rApariencia = n; return true;
  }

  var intentos = 0;
  (function arrancar() {
    var a = engancharTema(), b = engancharApariencia(), c = observar();
    if (!(a && b && c) && ++intentos < 200) { if (!c) mo.disconnect(); return setTimeout(arrancar, 100); }
    try { if (typeof sesion !== 'undefined' && sesion && sesion.id && typeof nxPref === 'function') desdeBase(); else todo(); } catch (e) { todo(); }
    try { if (document.getElementById('cfgApariencia') && document.getElementById('cfgApariencia').children.length) montar(); } catch (e) {}
  })();
})();
