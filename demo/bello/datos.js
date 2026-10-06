/* Bello Accesorios — datos de ejemplo del demo (no son datos reales). */
(function () {
  'use strict';
  const MODELOS_IP = ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16', 'iPhone 16 Pro', 'iPhone 16 Pro Max'];
  const MODELOS_SS = ['Galaxy A15', 'Galaxy A25', 'Galaxy A55', 'Galaxy S24', 'Galaxy S24 Ultra'];
  const COLORES = {
    'Negro': '#1c1c1e', 'Blanco': '#f4f3ef', 'Rosa': '#f2b8c6', 'Azul': '#4a78c2', 'Verde': '#6c9a7a', 'Lila': '#b9a4e0',
    'Rojo': '#d23c3c', 'Transparente': '#dfe9f2', 'Marrón': '#8a5a3c', 'Gris': '#8e8e93', 'Dorado': '#c9a227'
  };
  // cat: covers | cargadores | cables | powerbank | protectores | audio | accesorios
  // precio = detalle; mayor = precio por unidad comprando docena (12+); caja = por 50+
  const P = [
    { id: 'cv-sil', cat: 'covers', nombre: 'Cover silicón MagSafe', precio: 650, mayor: 390, caja: 340, costo: 210, modelos: MODELOS_IP, colores: ['Negro', 'Blanco', 'Rosa', 'Azul', 'Lila', 'Verde'], nuevo: true },
    { id: 'cv-tra', cat: 'covers', nombre: 'Cover transparente antigolpe', precio: 450, mayor: 250, caja: 215, costo: 120, modelos: MODELOS_IP.concat(MODELOS_SS), colores: ['Transparente'] },
    { id: 'cv-cue', cat: 'covers', nombre: 'Cover de cuero premium', precio: 1250, mayor: 790, caja: 700, costo: 450, modelos: MODELOS_IP.slice(4), colores: ['Marrón', 'Negro', 'Azul'] },
    { id: 'cv-mat', cat: 'covers', nombre: 'Cover mate con borde de color', precio: 550, mayor: 320, caja: 280, costo: 160, modelos: MODELOS_IP.concat(MODELOS_SS.slice(0, 3)), colores: ['Negro', 'Rojo', 'Azul', 'Verde'] },
    { id: 'cv-ss', cat: 'covers', nombre: 'Cover Samsung antigolpe con anillo', precio: 600, mayor: 350, caja: 300, costo: 170, modelos: MODELOS_SS, colores: ['Negro', 'Azul', 'Rosa'] },
    { id: 'cg-20', cat: 'cargadores', nombre: 'Cargador USB-C 20W carga rápida', precio: 850, mayor: 520, caja: 460, costo: 290, colores: ['Blanco'], nuevo: true },
    { id: 'cg-35', cat: 'cargadores', nombre: 'Cargador doble USB-C 35W', precio: 1450, mayor: 950, caja: 860, costo: 560, colores: ['Blanco', 'Negro'] },
    { id: 'cg-ss', cat: 'cargadores', nombre: 'Cargador Samsung 25W súper rápido', precio: 950, mayor: 590, caja: 520, costo: 330, colores: ['Negro', 'Blanco'] },
    { id: 'cg-car', cat: 'cargadores', nombre: 'Cargador de carro 38W (USB-C + USB-A)', precio: 750, mayor: 450, caja: 395, costo: 240, colores: ['Negro'] },
    { id: 'cg-mag', cat: 'cargadores', nombre: 'Cargador inalámbrico MagSafe 15W', precio: 1350, mayor: 850, caja: 760, costo: 480, colores: ['Blanco'] },
    { id: 'cb-cl1', cat: 'cables', nombre: 'Cable USB-C a Lightning 1 m', precio: 450, mayor: 240, caja: 205, costo: 110, colores: ['Blanco'] },
    { id: 'cb-cl2', cat: 'cables', nombre: 'Cable USB-C a Lightning trenzado 2 m', precio: 650, mayor: 380, caja: 330, costo: 180, colores: ['Negro', 'Blanco'] },
    { id: 'cb-cc1', cat: 'cables', nombre: 'Cable USB-C a USB-C 60W 1 m', precio: 500, mayor: 270, caja: 235, costo: 130, colores: ['Blanco', 'Negro'], nuevo: true },
    { id: 'cb-cc2', cat: 'cables', nombre: 'Cable USB-C a USB-C 100W trenzado 2 m', precio: 850, mayor: 520, caja: 460, costo: 280, colores: ['Negro', 'Gris'] },
    { id: 'cb-al', cat: 'cables', nombre: 'Cable USB-A a Lightning 1 m', precio: 350, mayor: 180, caja: 150, costo: 80, colores: ['Blanco'] },
    { id: 'cb-3', cat: 'cables', nombre: 'Cable 3 en 1 (Lightning, USB-C, Micro)', precio: 550, mayor: 300, caja: 260, costo: 150, colores: ['Negro', 'Rojo'] },
    { id: 'pb-10', cat: 'powerbank', nombre: 'Power Bank MagSafe 10,000 mAh', precio: 2450, mayor: 1650, caja: 1500, costo: 1050, colores: ['Blanco', 'Negro', 'Lila'], nuevo: true },
    { id: 'pb-20', cat: 'powerbank', nombre: 'Power Bank 20,000 mAh 22.5W', precio: 1950, mayor: 1290, caja: 1150, costo: 820, colores: ['Negro', 'Blanco'] },
    { id: 'pb-5', cat: 'powerbank', nombre: 'Power Bank mini 5,000 mAh USB-C', precio: 1150, mayor: 720, caja: 640, costo: 430, colores: ['Rosa', 'Azul', 'Negro'] },
    { id: 'pr-9d', cat: 'protectores', nombre: 'Cristal templado 9D borde negro', precio: 350, mayor: 150, caja: 120, costo: 55, modelos: MODELOS_IP.concat(MODELOS_SS), colores: ['Transparente'] },
    { id: 'pr-priv', cat: 'protectores', nombre: 'Cristal privacidad antiespía', precio: 550, mayor: 280, caja: 240, costo: 120, modelos: MODELOS_IP, colores: ['Negro'] },
    { id: 'pr-cam', cat: 'protectores', nombre: 'Protector de cámara (lentes)', precio: 400, mayor: 200, caja: 170, costo: 85, modelos: MODELOS_IP.slice(3), colores: ['Negro', 'Dorado', 'Blanco'] },
    { id: 'au-bud', cat: 'audio', nombre: 'Audífonos inalámbricos Bello Buds', precio: 1650, mayor: 1050, caja: 940, costo: 650, colores: ['Blanco', 'Negro'] },
    { id: 'au-cab', cat: 'audio', nombre: 'Audífonos con cable USB-C', precio: 550, mayor: 300, caja: 260, costo: 150, colores: ['Blanco'] },
    { id: 'ac-sop', cat: 'accesorios', nombre: 'Soporte magnético para carro', precio: 750, mayor: 450, caja: 395, costo: 240, colores: ['Negro'] },
    { id: 'ac-pop', cat: 'accesorios', nombre: 'PopSocket con diseño', precio: 300, mayor: 140, caja: 115, costo: 55, colores: ['Rosa', 'Negro', 'Lila', 'Azul'] },
    { id: 'ac-cor', cat: 'accesorios', nombre: 'Correa cruzada para celular', precio: 450, mayor: 230, caja: 195, costo: 100, colores: ['Negro', 'Marrón', 'Rosa'] }
  ];
  const CATS = [
    ['todos', 'Todo'], ['covers', 'Covers'], ['cargadores', 'Cargadores'], ['cables', 'Cables'], ['powerbank', 'Power Bank'],
    ['protectores', 'Protectores'], ['audio', 'Audífonos'], ['accesorios', 'Accesorios']
  ];
  // existencia por variante (modelo · color), estable para el demo
  function semilla(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  P.forEach((p, i) => {
    p.sku = 'BA-' + String(1001 + i);
    p.vars = [];
    (p.modelos || ['—']).forEach(m => (p.colores || ['—']).forEach(c => {
      const r = semilla(p.id + m + c) % 100;
      const stock = r < 7 ? 0 : r < 16 ? 1 + (r % 3) : 4 + (r % 37);
      p.vars.push({ modelo: m, color: c, stock: stock });
    }));
  });
  const CLIENTES = [
    ['Celulares El Primo', 'Mayorista', '809-555-0141', 'Santiago', 18500], ['Tecno Max SRL', 'Mayorista', '829-555-0177', 'Santo Domingo Este', 0],
    ['iCenter Bávaro', 'Mayorista', '809-555-0190', 'Punta Cana', 42300], ['Movil Shop La 27', 'Mayorista', '849-555-0122', 'Santo Domingo', 7600],
    ['Accesorios Yeni', 'Mayorista', '809-555-0153', 'La Vega', 0], ['Phone Fix Herrera', 'Mayorista', '829-555-0108', 'Herrera', 12900],
    ['María Rodríguez', 'Detalle', '809-555-0164', 'Santo Domingo', 0], ['José Martínez', 'Detalle', '829-555-0115', 'Los Alcarrizos', 1300],
    ['Ana Pérez', 'Detalle', '849-555-0186', 'Santiago', 0], ['Carlos Gómez', 'Detalle', '809-555-0137', 'San Cristóbal', 0],
    ['Laura Fernández', 'Detalle', '829-555-0199', 'Santo Domingo', 650], ['Pedro Santana', 'Detalle', '809-555-0112', 'Baní', 0],
    ['Yolanda Castillo', 'Detalle', '849-555-0145', 'Santo Domingo Norte', 0], ['Miguel Reyes', 'Detalle', '809-555-0170', 'Moca', 0]
  ].map((c, i) => ({ id: 'cl' + i, codigo: 'C-' + String(1001 + i), nombre: c[0], tipo: c[1], tel: c[2], zona: c[3], saldo: c[4] }));
  window.BELLO = { PRODUCTOS: P, CATS: CATS, CLIENTES: CLIENTES, COLORES: COLORES };

  // ── Ilustraciones de producto (SVG, sin fotos externas) ──
  function hex(c) { return COLORES[c] || '#1c1c1e'; }
  window.BELLO.foto = function (p, color) {
    const c = hex(color || (p.colores || [])[0]);
    const borde = c === '#f4f3ef' || c === '#dfe9f2' ? '#c9c4b8' : 'rgba(0,0,0,.18)';
    const svg = (inner, fondo) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${p.nombre}"><defs><radialGradient id="g${p.id}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${fondo || '#efe9e4'}"/></radialGradient></defs><rect width="120" height="120" rx="18" fill="url(#g${p.id})"/>${inner}</svg>`;
    switch (p.cat) {
      case 'covers': return svg(`<rect x="38" y="16" width="44" height="88" rx="11" fill="${c}" stroke="${borde}" stroke-width="1.5"/>${c === '#dfe9f2' ? '<rect x="42" y="20" width="36" height="80" rx="8" fill="#fff" opacity=".45"/>' : ''}<rect x="43" y="21" width="18" height="18" rx="5" fill="rgba(0,0,0,.22)"/><circle cx="48" cy="26" r="3.2" fill="#2b2b2e"/><circle cx="56" cy="26" r="3.2" fill="#2b2b2e"/><circle cx="48" cy="34" r="3.2" fill="#2b2b2e"/>${p.id === 'cv-sil' || p.id === 'cv-cue' ? '<circle cx="60" cy="62" r="13" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>' : ''}${p.id === 'cv-ss' ? '<circle cx="60" cy="74" r="7" fill="none" stroke="#c9a227" stroke-width="3"/>' : ''}`);
      case 'cargadores': return p.id === 'cg-car' ? svg(`<rect x="50" y="20" width="20" height="56" rx="6" fill="${c}"/><rect x="45" y="72" width="30" height="10" rx="3" fill="${c}"/><rect x="56" y="82" width="8" height="18" rx="2" fill="#9a9a9f"/><rect x="55" y="30" width="10" height="4" rx="1" fill="#555"/><rect x="55" y="40" width="10" height="5" rx="1" fill="#555"/>`)
        : p.id === 'cg-mag' ? svg(`<circle cx="60" cy="56" r="30" fill="${c}" stroke="${borde}" stroke-width="1.5"/><circle cx="60" cy="56" r="18" fill="none" stroke="#d8d4cc" stroke-width="2"/><path d="M60 86 C60 98 70 100 84 104" stroke="#e8e6e0" stroke-width="4" fill="none" stroke-linecap="round"/>`)
        : svg(`<rect x="38" y="34" width="44" height="50" rx="9" fill="${c}" stroke="${borde}" stroke-width="1.5"/><rect x="50" y="22" width="5" height="14" rx="1.5" fill="#9a9a9f"/><rect x="65" y="22" width="5" height="14" rx="1.5" fill="#9a9a9f"/><rect x="53" y="70" width="14" height="5" rx="2.5" fill="rgba(0,0,0,.35)"/>${p.id === 'cg-35' ? '<rect x="53" y="60" width="14" height="5" rx="2.5" fill="rgba(0,0,0,.35)"/>' : ''}`);
      case 'cables': return svg(`<path d="M30 30 C 95 26, 25 70, 90 90" stroke="${c === '#f4f3ef' ? '#e6e3dc' : c}" stroke-width="7" fill="none" stroke-linecap="round"/>${p.id.indexOf('2') > 0 || p.id === 'cb-cc2' ? '<path d="M30 30 C 95 26, 25 70, 90 90" stroke="rgba(0,0,0,.18)" stroke-width="7" fill="none" stroke-dasharray="2 3"/>' : ''}<rect x="18" y="22" width="16" height="16" rx="4" fill="#c7c7cc"/><rect x="84" y="84" width="16" height="16" rx="4" fill="#c7c7cc"/><rect x="22" y="16" width="8" height="8" rx="1.5" fill="#8e8e93"/><rect x="88" y="98" width="8" height="8" rx="1.5" fill="#8e8e93"/>`);
      case 'powerbank': return svg(`<rect x="32" y="22" width="56" height="${p.id === 'pb-5' ? 60 : 78}" rx="12" fill="${c}" stroke="${borde}" stroke-width="1.5"/><circle cx="48" cy="38" r="3" fill="#34c759"/><circle cx="56" cy="38" r="3" fill="#34c759"/><circle cx="64" cy="38" r="3" fill="#34c759"/><circle cx="72" cy="38" r="3" fill="rgba(255,255,255,.35)"/>${p.id === 'pb-10' ? '<circle cx="60" cy="66" r="14" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>' : '<text x="60" y="72" font-family="system-ui" font-size="11" font-weight="700" text-anchor="middle" fill="rgba(255,255,255,.75)">' + (p.id === 'pb-20' ? '20K' : '5K') + '</text>'}`);
      case 'protectores': return svg(`<rect x="36" y="14" width="48" height="92" rx="12" fill="#e8f1f8" stroke="#9fb8cc" stroke-width="1.5"/><rect x="40" y="18" width="40" height="84" rx="9" fill="${p.id === 'pr-priv' ? '#3a3a3c' : '#ffffff'}" opacity=".7"/><path d="M44 30 L76 60" stroke="#fff" stroke-width="4" opacity=".8"/>${p.id === 'pr-cam' ? '<circle cx="52" cy="34" r="8" fill="' + c + '" opacity=".85"/><circle cx="68" cy="34" r="8" fill="' + c + '" opacity=".85"/><circle cx="52" cy="50" r="8" fill="' + c + '" opacity=".85"/>' : ''}`, '#e5eef5');
      case 'audio': return p.id === 'au-bud' ? svg(`<rect x="34" y="44" width="52" height="42" rx="18" fill="${c}" stroke="${borde}" stroke-width="1.5"/><path d="M34 62 H86" stroke="rgba(0,0,0,.15)"/><circle cx="60" cy="72" r="2.5" fill="#34c759"/><rect x="46" y="22" width="9" height="26" rx="4.5" fill="${c}" stroke="${borde}"/><rect x="65" y="22" width="9" height="26" rx="4.5" fill="${c}" stroke="${borde}"/>`)
        : svg(`<path d="M44 30 V60 C44 80 76 80 76 60 V30" stroke="#e6e3dc" stroke-width="4" fill="none"/><circle cx="44" cy="28" r="9" fill="${c}" stroke="${borde}"/><circle cx="76" cy="28" r="9" fill="${c}" stroke="${borde}"/><path d="M60 78 V100" stroke="#e6e3dc" stroke-width="4"/><rect x="55" y="98" width="10" height="10" rx="2" fill="#c7c7cc"/>`);
      default: return p.id === 'ac-pop' ? svg(`<circle cx="60" cy="60" r="30" fill="${c}"/><circle cx="60" cy="60" r="20" fill="rgba(255,255,255,.35)"/><circle cx="60" cy="60" r="8" fill="rgba(255,255,255,.6)"/>`)
        : p.id === 'ac-cor' ? svg(`<path d="M28 30 C 40 100, 80 100, 92 30" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="50" y="78" width="20" height="10" rx="3" fill="#c9a227"/>`)
        : svg(`<rect x="44" y="24" width="32" height="44" rx="8" fill="${c}"/><circle cx="60" cy="46" r="10" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"/><rect x="56" y="68" width="8" height="18" fill="${c}"/><rect x="42" y="86" width="36" height="8" rx="4" fill="${c}"/>`);
    }
  };
  window.BELLO.rd = n => 'RD$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
})();
