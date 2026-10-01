// Se ejecuta DENTRO de la página (page.evaluate). Mide la cabecera de la ventana
// visible de más arriba y sus botones de salida. Sin dependencias.
window.nxMedirVentana = function (rootSel) {
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05;
  };
  const roots = rootSel
    ? [document.querySelector(rootSel)]
    : [...document.querySelectorAll('.overlay.open, [data-nx-ventana]')].filter(vis);
  // La de más arriba: mayor z-index y, a igualdad, la última en el DOM
  const root = roots.filter(Boolean).sort((a, b) => {
    const dz = (+getComputedStyle(b).zIndex || 0) - (+getComputedStyle(a).zIndex || 0);
    return dz || ((a.compareDocumentPosition(b) & 4) ? 1 : -1);
  })[0];
  if (!root) return { ok: false, motivo: 'sin ventana visible' };

  const head = root.querySelector('[data-nx-nav-cab], :scope > .modal > .mt, :scope > .modal > .mh, :scope > .modal.nxPf > .head, :scope > .modal > .aboHead > .aboHead-row, .mt, .mh, header');
  if (!head || !vis(head)) return { ok: false, motivo: 'sin cabecera visible', root: root.id || root.className };

  const hr = head.getBoundingClientRect();
  const btns = [...head.querySelectorAll('button, a, [role="button"], .btn, .c360-back')].filter(vis);

  const lum = (rgb) => {
    const m = rgb.match(/[\d.]+/g) || [0, 0, 0, 1];
    const [r, g, b] = m.slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const alphaOf = (rgb) => { const m = rgb.match(/[\d.]+/g); return m && m.length === 4 ? +m[3] : 1; };
  const bgDe = (el) => {
    let e = el;
    while (e && e !== document.documentElement) {
      const bg = getComputedStyle(e).backgroundColor;
      if (bg && alphaOf(bg) > 0.5) return bg;
      e = e.parentElement;
    }
    return 'rgb(255,255,255)';
  };
  const contraste = (fg, bg) => { const a = lum(fg) + 0.05, b = lum(bg) + 0.05; return +(Math.max(a, b) / Math.min(a, b)).toFixed(2); };

  const salidas = btns.map((b) => {
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const icon = [...b.querySelectorAll('i[class*="ti-"], svg')].find(vis) || null;
    const iconCls = icon ? (icon.className.baseVal !== undefined ? 'svg:' + (icon.getAttribute('data-k') || '') : [...icon.classList].find((c) => c.startsWith('ti-') && c !== 'ti') || '') : '';
    const txt = [...b.childNodes].map((n) => (n.nodeType === 3 ? n.textContent : (n.nodeType === 1 && vis(n) && !n.matches('i,svg') ? n.textContent : ''))).join('').trim();
    const esX = /ti-x$|ti-x\b|svg:x/.test(iconCls) || /^[✕×x]$/i.test(txt) || (!iconCls && /cerrar/i.test(b.getAttribute('aria-label') || ''));
    const esBack = /arrow-left|chevron-left|arrow-narrow-left|svg:back/.test(iconCls) || /^[←‹<]/.test(txt) || /volver|atr[aá]s|regresar/i.test(txt) || (!iconCls && /volver/i.test(b.getAttribute('aria-label') || ''));
    if (!esX && !esBack) return null;
    const cx = r.left + r.width / 2;
    const lado = cx < hr.left + hr.width / 2 ? 'izq' : 'der';
    const radio = parseFloat(cs.borderTopLeftRadius) || 0;
    const circulo = Math.abs(r.width - r.height) <= 2 && radio >= Math.min(r.width, r.height) / 2 - 1;
    return {
      kind: esX ? (esBack ? 'mixto' : 'x') : 'back',
      lado, w: Math.round(r.width), h: Math.round(r.height), circulo, icon: iconCls, texto: txt,
      contraste: contraste(cs.color, bgDe(b)),
      aria: b.getAttribute('aria-label') || '',
      cls: b.className.toString().slice(0, 60),
    };
  }).filter(Boolean);

  const titulo = head.querySelector('[data-nx-title], .nxm-title, span, h1, h2, h3, h4, strong, b') || head;
  const tr = titulo.getBoundingClientRect();
  const centroTitulo = tr.left + tr.width / 2;
  const centroHead = hr.left + hr.width / 2;
  const tituloCentrado = Math.abs(centroTitulo - centroHead) <= 8;
  return {
    ok: true,
    root: root.id || root.getAttribute('data-nx-ventana') || root.className.toString().slice(0, 40),
    head: head.className.toString().slice(0, 40),
    headH: Math.round(hr.height),
    salidas,
    nX: salidas.filter((s) => s.kind === 'x').length,
    nBack: salidas.filter((s) => s.kind === 'back').length,
    tituloCentrado,
    tituloTxt: (titulo.textContent || '').trim().slice(0, 40),
    desvioTitulo: Math.round(centroTitulo - centroHead),
  };
};
