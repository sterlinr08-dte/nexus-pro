from pathlib import Path

TARGET = Path('parches.js')
START = '/* NEXUS POS 2.5 — VENDER CATALOGO — START */'
END = '/* NEXUS POS 2.5 — VENDER CATALOGO — END */'

PATCH = r'''
/* NEXUS POS 2.5 — VENDER CATALOGO — START */
(function () {
  'use strict';
  if (window.__nxPosCatalogo25) return;
  window.__nxPosCatalogo25 = true;

  const STYLE_ID = 'nx-pos-catalogo-25-css';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.org-tienda {
        --nx-pos-blue:#2563eb;
        --nx-pos-blue-dark:#1d4ed8;
        --nx-pos-ink:#0f172a;
        --nx-pos-muted:#64748b;
        --nx-pos-line:#e5e7eb;
        --nx-pos-soft:#f8fafc;
        --nx-pos-card:#ffffff;
        --nx-pos-ok:#16a34a;
      }

      body.org-tienda .nx25-catalog-root {
        min-width:0;
      }

      body.org-tienda .nx25-product-grid {
        display:grid !important;
        grid-template-columns:repeat(10,minmax(0,1fr)) !important;
        gap:8px !important;
        align-items:stretch !important;
      }

      body.org-tienda .nx25-product-card {
        position:relative !important;
        min-width:0 !important;
        min-height:190px !important;
        padding:9px !important;
        border:1px solid var(--nx-pos-line) !important;
        border-radius:12px !important;
        background:var(--nx-pos-card) !important;
        box-shadow:0 1px 2px rgba(15,23,42,.04) !important;
        overflow:hidden !important;
        transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease !important;
      }

      body.org-tienda .nx25-product-card:hover {
        border-color:#93c5fd !important;
        box-shadow:0 8px 20px rgba(15,23,42,.09) !important;
        transform:translateY(-1px) !important;
      }

      body.org-tienda .nx25-product-card img {
        width:100% !important;
        height:84px !important;
        object-fit:contain !important;
        display:block !important;
        margin:0 auto 7px !important;
        transition:transform .16s ease !important;
      }

      body.org-tienda .nx25-product-card:hover img {
        transform:scale(1.025) !important;
      }

      body.org-tienda .nx25-product-card h1,
      body.org-tienda .nx25-product-card h2,
      body.org-tienda .nx25-product-card h3,
      body.org-tienda .nx25-product-card h4,
      body.org-tienda .nx25-product-card strong,
      body.org-tienda .nx25-product-card b {
        color:var(--nx-pos-ink) !important;
      }

      body.org-tienda .nx25-product-card .nx25-name {
        display:-webkit-box !important;
        -webkit-line-clamp:2 !important;
        -webkit-box-orient:vertical !important;
        overflow:hidden !important;
        min-height:30px !important;
        margin:0 0 3px !important;
        font-size:11.5px !important;
        line-height:1.28 !important;
        font-weight:750 !important;
        color:var(--nx-pos-ink) !important;
      }

      body.org-tienda .nx25-product-card .nx25-meta {
        display:block !important;
        white-space:nowrap !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
        margin-bottom:5px !important;
        font-size:9.5px !important;
        line-height:1.25 !important;
        color:var(--nx-pos-muted) !important;
      }

      body.org-tienda .nx25-product-card .nx25-price {
        display:block !important;
        margin:3px 0 7px !important;
        font-size:12.5px !important;
        line-height:1.15 !important;
        font-weight:800 !important;
        letter-spacing:-.15px !important;
        color:var(--nx-pos-ink) !important;
      }

      body.org-tienda .nx25-product-card .nx25-stock {
        display:inline-flex !important;
        align-items:center !important;
        min-height:18px !important;
        padding:2px 6px !important;
        border-radius:999px !important;
        background:#ecfdf3 !important;
        color:#15803d !important;
        font-size:8.5px !important;
        line-height:1 !important;
        font-weight:750 !important;
      }

      body.org-tienda .nx25-product-card .nx25-add {
        position:absolute !important;
        right:7px !important;
        bottom:7px !important;
        width:24px !important;
        height:24px !important;
        min-width:24px !important;
        min-height:24px !important;
        padding:0 !important;
        border:0 !important;
        border-radius:50% !important;
        display:grid !important;
        place-items:center !important;
        overflow:hidden !important;
        font-size:0 !important;
        color:#fff !important;
        background:linear-gradient(135deg,var(--nx-pos-blue),var(--nx-pos-blue-dark)) !important;
        box-shadow:0 5px 12px rgba(37,99,235,.28) !important;
      }

      body.org-tienda .nx25-product-card .nx25-add::before {
        content:'+';
        font-size:17px;
        line-height:1;
        font-weight:500;
        color:#fff;
      }

      body.org-tienda .nx25-product-card .nx25-add:hover {
        filter:brightness(.97);
        transform:translateY(-1px);
      }

      @media (max-width:2200px) {
        body.org-tienda .nx25-product-grid {grid-template-columns:repeat(8,minmax(0,1fr)) !important;}
      }
      @media (max-width:1750px) {
        body.org-tienda .nx25-product-grid {grid-template-columns:repeat(7,minmax(0,1fr)) !important;}
      }
      @media (max-width:1500px) {
        body.org-tienda .nx25-product-grid {grid-template-columns:repeat(6,minmax(0,1fr)) !important;}
      }
      @media (max-width:1250px) {
        body.org-tienda .nx25-product-grid {grid-template-columns:repeat(5,minmax(0,1fr)) !important;}
      }
      @media (max-width:980px) {
        body.org-tienda .nx25-product-grid {grid-template-columns:repeat(4,minmax(0,1fr)) !important;}
      }
      @media (max-width:760px) {
        body.org-tienda .nx25-product-grid {grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:9px !important;}
        body.org-tienda .nx25-product-card {min-height:206px !important;padding:10px !important;border-radius:13px !important;}
        body.org-tienda .nx25-product-card img {height:102px !important;}
        body.org-tienda .nx25-product-card .nx25-name {font-size:12px !important;min-height:31px !important;}
        body.org-tienda .nx25-product-card .nx25-price {font-size:13px !important;}
        body.org-tienda .nx25-product-card .nx25-add {width:28px !important;height:28px !important;min-width:28px !important;min-height:28px !important;}
      }
      @media (max-width:360px) {
        body.org-tienda .nx25-product-grid {gap:7px !important;}
        body.org-tienda .nx25-product-card {padding:8px !important;}
      }
    `;
    document.head.appendChild(style);
  }

  function textOf(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
  }

  function findVenderRoot() {
    const direct = [
      '#v-vender', '#pos-vender', '[data-view="vender"]', '[data-pos-view="vender"]',
      '.vender-view', '.pos-vender', '.nx-vender'
    ].map(s => document.querySelector(s)).find(Boolean);
    if (direct) return direct;

    const headings = [...document.querySelectorAll('h1,h2,h3,[role="heading"]')]
      .filter(visible)
      .filter(el => /punto de venta|vender/i.test(textOf(el)));
    if (!headings.length) return null;
    return headings[0].closest('.view,section,main,[class*="content"],[class*="panel"]') || headings[0].parentElement;
  }

  function cardCandidate(btn, root) {
    let el = btn;
    for (let i = 0; i < 6 && el && el !== root; i += 1, el = el.parentElement) {
      const t = textOf(el);
      const hasPrice = /RD\$|\$\s?\d|\d[\d,.]*\s?(DOP|USD)/i.test(t);
      const hasImg = !!el.querySelector('img');
      if (hasPrice && hasImg && t.length < 420) return el;
    }
    return null;
  }

  function findGrid(cards, root) {
    if (!cards.length) return null;
    let node = cards[0].parentElement;
    while (node && node !== root) {
      const count = cards.filter(c => c.parentElement === node).length;
      if (count >= Math.min(3, cards.length)) return node;
      node = node.parentElement;
    }
    return cards[0].parentElement;
  }

  function markCard(card, addBtn) {
    card.classList.add('nx25-product-card');
    addBtn.classList.add('nx25-add');

    const image = card.querySelector('img');
    if (image) image.loading = 'lazy';

    const candidates = [...card.querySelectorAll('h1,h2,h3,h4,strong,b,p,span,div')]
      .filter(el => el.children.length === 0)
      .filter(el => textOf(el).length > 1);

    const price = candidates.find(el => /RD\$|\$\s?\d|\d[\d,.]*\s?(DOP|USD)/i.test(textOf(el)));
    if (price) price.classList.add('nx25-price');

    const stock = candidates.find(el => /stock|existencia|disponible/i.test(textOf(el)));
    if (stock) stock.classList.add('nx25-stock');

    const name = candidates.find(el => {
      const t = textOf(el);
      return el !== price && el !== stock && !/agregar|añadir|stock|existencia|RD\$/i.test(t) && t.length >= 3 && t.length <= 90;
    });
    if (name) name.classList.add('nx25-name');

    const meta = candidates.find(el => {
      const t = textOf(el);
      return el !== name && el !== price && el !== stock && !/agregar|añadir/i.test(t) && /GB|TB|negro|blanco|azul|verde|dorado|gris|titanio|generación|metro|original/i.test(t);
    });
    if (meta) meta.classList.add('nx25-meta');
  }

  function applyCatalog() {
    ensureStyle();
    const root = findVenderRoot();
    if (!root || !visible(root)) return;
    root.classList.add('nx25-catalog-root');

    const buttons = [...root.querySelectorAll('button,[role="button"]')]
      .filter(visible)
      .filter(btn => /agregar|añadir|\+/.test(textOf(btn).toLowerCase()));

    const pairs = [];
    const seen = new Set();
    buttons.forEach(btn => {
      const card = cardCandidate(btn, root);
      if (card && !seen.has(card)) {
        seen.add(card);
        pairs.push([card, btn]);
      }
    });

    if (pairs.length < 2) return;
    const cards = pairs.map(x => x[0]);
    const grid = findGrid(cards, root);
    if (grid) grid.classList.add('nx25-product-grid');
    pairs.forEach(([card, btn]) => markCard(card, btn));
  }

  let timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(applyCatalog, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCatalog, { once:true });
  } else {
    applyCatalog();
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('resize', schedule, { passive:true });
})();
/* NEXUS POS 2.5 — VENDER CATALOGO — END */
'''

text = TARGET.read_text(encoding='utf-8')
if START in text and END in text:
    before = text.split(START, 1)[0].rstrip()
    after = text.split(END, 1)[1].lstrip()
    text = before + '\n\n' + PATCH.strip() + '\n\n' + after
else:
    text = text.rstrip() + '\n\n' + PATCH.strip() + '\n'

TARGET.write_text(text, encoding='utf-8')
print('POS Vender Catalogo 2.5 patch applied')
