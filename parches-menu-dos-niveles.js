/* NEXUS PRO · Menú de dos niveles (18-nov-2026). Dueño: «el número 7 para nexus pro» (reel Df5TYQDoAQ3, estilo «Two-level»;
   ver docs/REFERENCIAS-DISENO.md). A la izquierda, los iconos de las secciones; al lado, las páginas de la sección elegida.
   · No duplica botones ni lógica: lee los botones del menú de siempre (nav#sbEl .ni, que sigue en la página, escondido por
     CSS) y al tocar una página hace .click() sobre ese mismo botón. Así se respetan los permisos (un botón escondido por rol
     no aparece), los contadores (.ni-b) y las acciones (nav, navConfig, Solicitudes…).
   · La página activa sale del .ni.on de siempre; tocar el icono de una sección solo cambia la lista (no navega), salvo que la
     sección tenga una sola página (Inicio): ahí abre esa página.
   · Celular: el mismo menú de dos columnas dentro del cajón ☰ (sigue a la clase mob-open de nav#sbEl, que maneja toggleSB).
   · Solo temas Glass oscuro y Claro, y solo empresas de seguros (en tienda, rifa y consultorio el CSS deja el menú de siempre).
   Estilos (primer pintado) en index.html, style#nxMenu2.
   APAGAR: localStorage.setItem('nx_m2_off','1') y recargar. */
(function () {
  'use strict';
  if (window.__nxMenu2) return;
  window.__nxMenu2 = true;
  var html = document.documentElement;
  try { if (localStorage.getItem('nx_m2_off') === '1' || window.NX_MENU2 === false) { html.classList.remove('nx-m2'); return; } } catch (e) {}

  var SECCIONES = [
    { id: 'inicio', ic: 'ti-home', t: 'Inicio', s: 'Resumen del día' },
    // 25-nov-2026 (dueño: «pon el icono de Multiempresa junto a Inicio»): sección propia en el riel. Solo sale si existe el
    // botón #niMultiM2, que se crea únicamente para el dueño del sistema (ver agregarMultiempresa).
    { id: 'multi', ic: 'ti-building-skyscraper', t: 'Multiempresa', s: 'Todas las empresas' },
    { id: 'seguros', ic: 'ti-shield-check', t: 'Seguros', s: 'Cartera y cobros' },
    { id: 'mensajes', ic: 'ti-message-circle', t: 'Mensajes', s: 'WhatsApp y clientes' },
    { id: 'conta', ic: 'ti-chart-bar', t: 'Contabilidad', s: 'Libros y estados' },
    { id: 'reportes', ic: 'ti-report-analytics', t: 'Reportes', s: 'Agentes, cartera y custodia' },
    { id: 'config', ic: 'ti-settings', t: 'Configuración', s: 'Empresa, usuarios y ajustes' },
    { id: 'mas', ic: 'ti-dots', t: 'Más', s: 'Otras páginas' }
  ];
  var VISTA_SEC = {
    dashboard: 'inicio',
    facturas: 'seguros', clientes: 'seguros', polizas: 'seguros', solicitudes: 'seguros', cobros: 'seguros',
    crm: 'mensajes', waInbox: 'mensajes',
    mayor: 'conta', asientos: 'conta', balance: 'conta', pyg: 'conta', dgii: 'conta', comisiones: 'conta',
    'rep-agente': 'reportes', custodia: 'reportes', 'rep-plan': 'reportes', 'rep-empresa': 'reportes', 'rep-aging': 'reportes'
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var movil = function () { return window.innerWidth <= 768; };
  var mostrar = function (el) { return !!el && !el.hidden && getComputedStyle(el).display !== 'none'; };

  var raiz, sb, navEl, viendo = null, ultimaActiva = null, programado = false, ultimoHtml = '';

  function seccionDe(n) {
    var oc = n.getAttribute('onclick') || '';
    if (/navConfig\(/.test(oc)) return 'config';
    if (/nxAbrirMultiempresa/.test(oc)) return 'multi';
    var m = oc.match(/nav\(\s*['"]([\w-]+)['"]/);
    if (m && VISTA_SEC[m[1]]) return VISTA_SEC[m[1]];
    if (n.closest('#sbContab')) return 'conta';
    if (n.closest('#sbConfig')) return 'config';
    return 'mas';
  }
  /* Rótulo legible: «SOLICITUDES» → «Solicitudes» (algunos botones vienen en mayúsculas). */
  function rotulo(n) {
    var l = n.querySelector('.ni-l'); var t = ((l || n).textContent || '').replace(/\s+/g, ' ').trim();
    if (/^[A-ZÁÉÍÓÚÑ]{4,}$/.test(t)) t = t.charAt(0) + t.slice(1).toLowerCase(); // solo una palabra entera en mayúsculas (no «DGII / ARS»)
    return t;
  }
  function icono(n) {
    var i = n.querySelector('.ni-i'); if (!i) return 'ti-point';
    var c = [].filter.call(i.classList, function (x) { return /^ti-/.test(x); })[0];
    return c || 'ti-point';
  }
  function contador(n) {
    // El menú de siempre plegado (.sb.col) esconde los contadores por CSS; aquí cuenta lo que su dueño decidió (estilo en línea).
    var b = n.querySelector('.ni-b'); if (!b || b.hidden || /display\s*:\s*none/.test(b.getAttribute('style') || '')) return '';
    var t = (b.textContent || '').trim(); return (t && t !== '0') ? t : '';
  }

  /* Botones que este usuario puede usar, agrupados por sección. Los encabezados que solo despliegan (Contabilidad,
     Configuración) no son páginas; sus opciones cuentan solo si el encabezado está visible (permiso por rol). */
  function leer() {
    var grupos = {}; var activa = null;
    SECCIONES.forEach(function (s) { grupos[s.id] = []; });
    var contab = document.getElementById('niContab'), config = document.getElementById('niAdmin2');
    [].forEach.call(navEl.querySelectorAll('.ni'), function (n, i) {
      var oc = n.getAttribute('onclick') || '';
      if (!oc || /toggle(Contab|Config)\(/.test(oc)) return;
      if (!mostrar(n)) return;
      if (n.closest('#sbContab') && !mostrar(contab)) return;
      if (n.closest('#sbConfig') && !mostrar(config)) return;
      n.setAttribute('data-m2i', String(i));
      var sec = seccionDe(n);
      var it = { i: i, t: rotulo(n), ic: icono(n), b: contador(n), on: n.classList.contains('on') };
      grupos[sec].push(it);
      if (it.on) activa = sec;
    });
    return { grupos: grupos, activa: activa };
  }

  function pintar() {
    programado = false;
    agregarMultiempresa();
    if (!raiz || !navEl) return;
    var d = leer();
    var hay = SECCIONES.filter(function (s) { return d.grupos[s.id].length; });
    if (!hay.length) { raiz.innerHTML = ''; ultimoHtml = ''; return; }
    // Módulo con su propia columna de páginas abierto (Punto de venta: #nxTSide): en PC queda solo el riel, para no ver tres columnas.
    var solo = !!document.querySelector('.view.on #nxTSide, .view.on .nxTShell');
    raiz.classList.toggle('m2-solo', solo);
    // Si la página activa cambió (también desde un botón de la pantalla), la columna muestra su sección.
    if (d.activa && d.activa !== ultimaActiva) viendo = d.activa;
    ultimaActiva = d.activa;
    if (!viendo || !d.grupos[viendo] || !d.grupos[viendo].length) viendo = d.activa || hay[0].id;
    var sec = SECCIONES.filter(function (s) { return s.id === viendo; })[0];
    var av = document.getElementById('sbAv'), nom = document.getElementById('sbNom'), rol = document.getElementById('sbRol');
    var ini = esc(((av && av.textContent) || 'NX').trim());
    var foco = document.activeElement && raiz.contains(document.activeElement) ? document.activeElement.getAttribute('data-m2k') : null;

    var rail = '<div class="m2-mk" aria-hidden="true"><i class="ti ti-shield-check"></i></div>' +
      hay.map(function (s) {
        var punto = d.grupos[s.id].some(function (x) { return x.b; });
        var cur = !solo && s.id === viendo;
        return '<button type="button" class="m2-sec" data-m2k="s-' + s.id + '" data-sec="' + s.id + '" title="' + esc(s.t) + '" aria-label="' + esc(s.t) +
          (punto ? ' (con avisos)' : '') + '"' + (cur ? ' aria-current="true"' : '') + '><i class="ti ' + s.ic + '" aria-hidden="true"></i>' +
          (punto ? '<span class="m2-dot" aria-hidden="true"></span>' : '') + '</button>';
      }).join('') +
      '<div class="m2-sp"></div><div class="m2-av" aria-hidden="true">' + ini + '</div>';

    var paginas = d.grupos[viendo].map(function (p) {
      return '<button type="button" class="m2-pg" data-m2k="p-' + p.i + '" data-i="' + p.i + '"' + (p.on ? ' aria-current="page"' : '') + '>' +
        '<i class="ti ' + esc(p.ic) + '" aria-hidden="true"></i><span>' + esc(p.t) + '</span>' + (p.b ? '<em aria-label="' + esc(p.b) + ' pendientes">' + esc(p.b) + '</em>' : '') + '</button>';
    }).join('');
    var kbd = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '') ? '⌘K' : 'Ctrl K';
    var col = '<div class="m2-hd"><i class="ti ' + sec.ic + '" aria-hidden="true"></i><div><b>' + esc(sec.t) + '</b><small>' + esc(sec.s) + '</small></div></div>' +
      '<button type="button" class="m2-bus" data-m2k="bus"><i class="ti ti-search" aria-hidden="true"></i>Buscar<kbd>' + kbd + '</kbd></button>' +
      '<div class="m2-list" role="list">' + paginas + '</div>' +
      '<div class="m2-ft"><button type="button" class="m2-user" data-m2k="user" title="Cerrar sesión"><div class="m2-av" aria-hidden="true">' + ini + '</div><div><b>' +
      esc((nom && nom.textContent) || '') + '</b><small>' + esc((rol && rol.textContent) || '') + '</small></div><i class="ti ti-logout" aria-hidden="true"></i></button></div>';

    // 25-nov-2026 (dueño, grabación del iPhone): dentro de un chat de WhatsApp la vista cambia de clase varias veces por
    // segundo y esto se repintaba cada vez; al reemplazar los botones, el toque caía en uno que ya no existía y el menú
    // «no respondía». Si el dibujo es el mismo, no se toca nada.
    var html = '<div class="m2-rail">' + rail + '</div><div class="m2-col">' + col + '</div>';
    if (html === ultimoHtml && raiz.firstChild) return;
    ultimoHtml = html;
    raiz.innerHTML = html;
    if (foco) { var f = raiz.querySelector('[data-m2k="' + foco + '"]'); if (f) f.focus({ preventScroll: true }); }
  }
  function programar() { if (programado) return; programado = true; requestAnimationFrame(pintar); }

  function alTocar(e) {
    var b = e.target.closest('button'); if (!b || !raiz.contains(b)) return;
    if (b.classList.contains('m2-sec')) {
      viendo = b.getAttribute('data-sec');
      var g = leer().grupos[viendo] || [];
      // Una sola página (Inicio), o desde un módulo con su propia columna (Punto de venta, solo riel en PC): abre la primera página.
      if (g.length && (g.length === 1 || (raiz.classList.contains('m2-solo') && !movil()))) { tocarPagina(g[0].i); return; }
      pintar();
      var p = raiz.querySelector('.m2-pg'); if (p && !movil()) p.focus({ preventScroll: true });
      return;
    }
    if (b.classList.contains('m2-pg')) { tocarPagina(Number(b.getAttribute('data-i'))); return; }
    if (b.classList.contains('m2-bus')) {
      cerrarCelular();
      if (typeof window.abrirGlobalSearch === 'function') window.abrirGlobalSearch();
      return;
    }
    if (b.classList.contains('m2-user')) { var u = sb && sb.querySelector('.sb-u'); if (u) u.click(); }
  }
  function tocarPagina(i) {
    var n = navEl.querySelector('.ni[data-m2i="' + i + '"]');
    if (n) n.click();
    cerrarCelular();
    programar();
  }
  function cerrarCelular() { if (movil() && sb && sb.classList.contains('mob-open') && typeof window.closeMobSB === 'function') window.closeMobSB(); }
  function seguirCajon() { if (raiz && sb) raiz.classList.toggle('m2-open', sb.classList.contains('mob-open')); }

  function iniciar() {
    raiz = document.getElementById('nxM2'); sb = document.getElementById('sbEl'); navEl = document.getElementById('sbNav');
    if (!raiz || !sb || !navEl) return false;
    raiz.addEventListener('click', alTocar);
    raiz.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { cerrarCelular(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var lista = [].slice.call(raiz.querySelectorAll(e.target.classList.contains('m2-sec') ? '.m2-sec' : '.m2-pg'));
      var k = lista.indexOf(e.target); if (k < 0) return;
      e.preventDefault();
      var sig = lista[(k + (e.key === 'ArrowDown' ? 1 : -1) + lista.length) % lista.length]; if (sig) sig.focus();
    });
    new MutationObserver(function (rs) { if (rs.some(function (r) { return !(r.target.closest && r.target.closest('#springInd')) && r.attributeName !== 'data-m2i'; })) programar(); }).observe(navEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'], characterData: true });
    ['sbNom', 'sbRol', 'sbAv', 'niContab', 'niAdmin2'].forEach(function (id) {
      var el = document.getElementById(id); if (el) new MutationObserver(programar).observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
    });
    new MutationObserver(seguirCajon).observe(sb, { attributes: true, attributeFilter: ['class'] });
    var cnt = document.getElementById('cnt');
    if (cnt) new MutationObserver(function (rs) { if (rs.some(function (r) { var x = r.target; return x === cnt || (x.classList && x.classList.contains('view')) || x.id === 'v-pos'; })) programar(); })
      .observe(cnt, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', programar);
    window.nxMenu2Repintar = programar;
    seguirCajon();
    pintar();
    agregarMultiempresa();
    return true;
  }

  /* 19-nov-2026 (dueño: «MULTI EMPRESA PONLO EN INICIO PERO SOLO YO PUEDO VERLO»): página «Multiempresa» dentro de la
     sección Inicio, solo si el servidor confirma que quien entró es el dueño del sistema (rpc mi_es_superadmin, la misma
     comprobación del Panel del Dueño). Para cualquier otro usuario, administradores incluidos, no aparece. */
  /* 25-nov-2026 (dueño: «el icono nuevo no sale»): la pregunta se hacía una sola vez, al cargar la página, muchas veces
     ANTES de que la sesión estuviera lista; sin sesión la API firma con la clave pública, el servidor responde «no» y no se
     volvía a preguntar. Ahora se pregunta solo con la sesión puesta (API.token) y otra vez si cambia (entra otro usuario). */
  var multiToken = null, multiPreguntando = false;
  function agregarMultiempresa() {
    var api = (typeof API !== 'undefined') ? API : window.API;
    if (!api || !api.post || !api.token) return;
    if (api.token === multiToken || multiPreguntando) return;
    if (typeof window.nxAbrirMultiempresa !== 'function') return;
    var tk = api.token; multiPreguntando = true;
    api.post('rpc/mi_es_superadmin', {}).then(function (r) {
      multiPreguntando = false;
      if (api.token !== tk) return; // cambió la sesión mientras se preguntaba: la próxima llamada vuelve a preguntar
      multiToken = tk;
      var ya = document.getElementById('niMultiM2');
      if (!(r === true || r === 'true')) { if (ya) { ya.remove(); programar(); } return; }
      if (ya) return;
      var ini = navEl.querySelector('.ni[onclick*="nav(\'dashboard\'"]');
      var b = document.createElement('div');
      b.className = 'ni'; b.id = 'niMultiM2'; b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
      b.setAttribute('onclick', "window.nxAbrirMultiempresa()");
      b.setAttribute('onkeydown', "if(event.keyCode==13||event.keyCode==32){event.preventDefault();this.click()}");
      b.innerHTML = '<i class="ti ti-building-skyscraper ni-i"></i><span class="ni-l">Multiempresa</span>';
      if (ini && ini.parentNode) ini.parentNode.insertBefore(b, ini.nextSibling); else navEl.appendChild(b);
      programar();
    }).catch(function () { multiPreguntando = false; }); // si falla la consulta no se guarda: se vuelve a preguntar
  }
  if (!iniciar()) {
    var intentos = 0, t = setInterval(function () { if (iniciar() || ++intentos > 40) clearInterval(t); }, 250);
  }
})();
