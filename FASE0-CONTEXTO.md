# FASE 0 — CONTEXTO Y CÓDIGO REAL (para generar el parche)

> Código fuente **verbatim** de `parches.js` + esquemas exactos de las tablas Supabase,
> para corregir los **7 bugs de dinero** de la Fase 0 (ver `AUDITORIA-POS.md`).
> Copiado tal cual del repo — **no resumido, no modificado**.

## ⚠️ Reglas antes de tocar
- App de UN solo archivo grande **sin framework ni build**: `index.html` + `parches.js`. **NO reescribir en React/Vue.**
- El POS es un IIFE grande dentro de `parches.js`. Todas las funciones de abajo viven en ese IIFE.
- Backend Supabase por **REST/PostgREST** vía `getAPI()`: `API.get(tabla, query)`, `API.post(tabla, body)`, `API.patch(tabla, filtro, body)`, `API.del(tabla, filtro)`. **No hay SQL crudo ni RPC** en estas funciones.
- Cada push a `main` se despliega solo en `nexusprord.com` (Cloudflare). No romper la sintaxis (`node --check parches.js`).

---

## LOS 7 BUGS DE LA FASE 0 (Capa A de la auditoría)
- **A1** — Fiado no se revierte al anular (`cargarSaldosCli` no excluye `estado=anulada`; `nxPosAnularVenta` no resta `_fiadoByCli`).
- **A2** — Sin costo de ventas (COGS): `postAsientoVenta` no baja el inventario contable (cuenta `1104`).
- **A3** — Stock por almacén puede quedar negativo (`upsertStockAlm` sin piso en 0; revalida contra total, no contra almacén).
- **A4** — `asignarNCF`: `(s.prefijo || tipo)` usa variable `tipo` inexistente (debe ser `cod`).
- **A5** — Nota de crédito como pago se contabiliza como Caja (`1101`) en `postAsientoVenta`.
- **A6** — Anulación no revierte NCF ni cancela `pos_financiamientos`/`pos_fin_cuotas`.
- **A7** — `cargarDashKPI` suma ventas con `estado=anulada`.

---

## ESQUEMAS DE TABLAS (exactos, information_schema)

### `pos_venta_items` (NO tiene columna de costo)
```
id uuid PK default gen_random_uuid() · venta_id uuid NOT NULL · producto_id uuid · nombre text
precio numeric NOT NULL d0 · cantidad numeric NOT NULL d1 · itbis boolean NOT NULL d true
importe numeric NOT NULL d0 · organizacion_id uuid · descuento numeric NOT NULL d0
serial text · garantia_hasta date
```

### `pos_productos` (el costo está aquí: `costo`)
```
id uuid PK · nombre text NOT NULL · codigo text · categoria_id uuid · precio numeric NOT NULL d0
costo numeric NOT NULL d0 · stock numeric NOT NULL d0 · itbis boolean NOT NULL d true
activo boolean NOT NULL d true · created_at timestamptz NOT NULL d now() · marca text · referencia text
imagen text · precio_credito numeric NOT NULL d0 · tipo text NOT NULL d 'producto' · stock_min numeric NOT NULL d0
garantia_dias integer NOT NULL d0 · serial boolean NOT NULL d false · no_descuento boolean NOT NULL d false
organizacion_id uuid · precio_mayor numeric · precio_minimo numeric d0 · combo_items jsonb d '[]'
```

### `pos_financiamientos`
```
id uuid PK · organizacion_id uuid · venta_id uuid · cliente_id uuid · cliente_nombre text · descripcion text
monto_total numeric d0 · inicial numeric d0 · monto_financiado numeric NOT NULL · cuotas_total integer NOT NULL
cuota_monto numeric NOT NULL · frecuencia text d 'semanal' · estado text d 'activo' · created_at timestamptz d now()
```

### `pos_fin_cuotas`
```
id uuid PK · organizacion_id uuid · financiamiento_id uuid · numero integer NOT NULL · fecha_venc date NOT NULL
monto numeric NOT NULL · pagado boolean d false · fecha_pago date · metodo text · created_at timestamptz d now()
```

### Campo de costo
Es **`costo`** en `pos_productos`. NO existe `costo_promedio`/`ultimo_costo`/`precio_compra`/`costo_unitario`.
`pos_venta_items` **no** guarda costo → para el COGS hay que leer `pos_productos.costo` (o snapshotearlo en la venta).

---

## CÓDIGO REAL

### `getAPI()` (wrapper REST)
```js
  function getAPI() {
    try {
      return (typeof API !== 'undefined') ? API : window.API;
    } catch(e) {
      return window.API;
    }
  }
```

### `nextSeq(tipo)`
```js
  async function nextSeq(tipo) {
    try {
      const s = (_secuencias || []).find(x => x.tipo === tipo && x.activo !== false);
      if (!s) return null;
      const num = Number(s.proximo || 1);
      const fmt = (s.prefijo || '') + String(num).padStart(Number(s.longitud || 5), '0');
      await getAPI().patch('pos_secuencias', 'id=eq.' + s.id, { proximo: num + 1 });
      s.proximo = num + 1;
      return fmt;
    } catch (e) { return null; }
  }
```

### `totalesCaja` + `cargarDashKPI` (A7) + `cargarSaldosCli` (A1) + `saldoCli`
```js
  async function totalesCaja(caja) {
    let ventas = [], abonos = [], movs = [];
    try { ventas = await getAPI().get('pos_ventas', 'select=pagado_efectivo,pagado_tarjeta,pagado_transferencia,pagado_otro,credito_monto&caja_id=eq.' + caja.id + '&estado=eq.completada') || []; } catch (e) {}
    try { abonos = await getAPI().get('pos_abonos', 'select=metodo,monto&caja_id=eq.' + caja.id) || []; } catch (e) {}
    try { movs = await getAPI().get('pos_caja_movimientos', 'select=*&caja_id=eq.' + caja.id + '&order=fecha.asc') || []; } catch (e) {}
    let efe = 0, tar = 0, tra = 0, cre = 0, otro = 0;
    ventas.forEach(v => { efe += Number(v.pagado_efectivo || 0); tar += Number(v.pagado_tarjeta || 0); tra += Number(v.pagado_transferencia || 0); otro += Number(v.pagado_otro || 0); cre += Number(v.credito_monto || 0); });
    let abEfe = 0, abOtro = 0;
    abonos.forEach(a => { const m = Number(a.monto || 0); if ((a.metodo || 'Efectivo') === 'Efectivo') abEfe += m; else abOtro += m; });
    let ent = 0, sal = 0;
    movs.forEach(m => { const mo = Number(m.monto || 0); if (m.tipo === 'entrada') ent += mo; else sal += mo; });
    const esperado = Number(caja.monto_inicial || 0) + efe + abEfe + ent - sal;
    return { efe: efe, tar: tar, tra: tra, cre: cre, abEfe: abEfe, abOtro: abOtro, ent: ent, sal: sal, esperado: esperado, movs: movs, nventas: ventas.length };
  }
  // ── KPIs del dashboard de tienda (ventas de hoy, caja). Best-effort, no rompe si falla ──
  async function cargarDashKPI() {
    try {
      const d = new Date();
      const desde = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T00:00:00';
      const vs = await getAPI().get('pos_ventas', 'select=total&created_at=gte.' + desde) || [];
      let tot = 0; vs.forEach(v => tot += Number(v.total || 0));
      let cajaEf = null;
      if (_caja) { try { const t = await totalesCaja(_caja); cajaEf = t ? t.esperado : null; } catch (e) {} }
      _dashKPI = { ventasHoy: tot, facturasHoy: vs.length, cajaEf: cajaEf };
    } catch (e) { _dashKPI = null; }
  }
  async function cargarVentas() {
    _ventas = await getAPI().get('pos_ventas', 'select=*&order=created_at.desc&limit=400') || [];
  }
  async function cargarSaldosCli() {
    _fiadoByCli = {}; _abonosByCli = {};
    try {
      const fi = await getAPI().get('pos_ventas', 'select=cliente_id,credito_monto&credito_monto=gt.0') || [];
      fi.forEach(v => { if (v.cliente_id) _fiadoByCli[v.cliente_id] = (_fiadoByCli[v.cliente_id] || 0) + Number(v.credito_monto || 0); });
      const ab = await getAPI().get('pos_abonos', 'select=cliente_id,monto') || [];
      ab.forEach(a => { if (a.cliente_id) _abonosByCli[a.cliente_id] = (_abonosByCli[a.cliente_id] || 0) + Number(a.monto || 0); });
    } catch (e) {}
  }
  function saldoCli(c) { const id = c && c.id; return Math.max(0, (_fiadoByCli[id] || 0) - (_abonosByCli[id] || 0)); }
```

### `asignarNCF(tipoFactura)` (A4: `s.prefijo || tipo` → `tipo` no existe)
```js
  async function asignarNCF(tipoFactura) {
    try {
      if (!tipoFactura || tipoFactura === 'sin') return null;
      const cod = NCF_MAP[tipoFactura] || tipoFactura;
      const s = _ncfSecs.find(x => x.tipo === cod && x.activo !== false && Number(x.actual || 0) <= Number(x.hasta || 0));
      if (!s) return null;
      const num = Number(s.actual || s.desde || 1);
      const ncf = (s.prefijo || tipo) + String(num).padStart(8, '0');
      await getAPI().patch('pos_ncf_secuencias', 'id=eq.' + s.id, { actual: num + 1 });
      s.actual = num + 1;
      return ncf;
    } catch (e) { return null; }
  }
```

### `nxPosConfirmar` — crea la venta (valida stock, guarda items, financiamiento, NCF, asiento, descuenta stock)
```js
  window.nxPosConfirmar = async function () {
    if (!_cart.length) return;
    // IMEI obligatorio: para artículos con serial hay que elegir el/los IMEI antes de cobrar
    for (let i = 0; i < _cart.length; i++) {
      const it = _cart[i]; const p = _prods.find(x => String(x.id) === String(it.producto_id));
      if (p && p.serial && (it.seriales || []).length < Number(it.cantidad)) {
        toast('err', 'Falta elegir el IMEI', p.nombre + ' (' + (it.seriales || []).length + ' de ' + it.cantidad + ')');
        window.nxFacSerial(i);
        return;
      }
    }
    // POLÍTICA ESTRICTA: sin stock no se factura (revalida contra el inventario actual).
    const _pedidoPorProd = {};
    for (const it of _cart) { const k = String(it.producto_id); _pedidoPorProd[k] = (_pedidoPorProd[k] || 0) + Number(it.cantidad || 0); }
    for (const pid in _pedidoPorProd) {
      const _p = _prods.find(x => String(x.id) === pid);
      if (_p && _p.tipo !== 'servicio' && _pedidoPorProd[pid] > Number(_p.stock || 0)) {
        toast('err', 'Sin stock suficiente', _p.nombre + ' — quedan ' + Number(_p.stock || 0) + ' y la factura pide ' + _pedidoPorProd[pid]);
        return;
      }
    }
    // Piso de negociación: nadie sin permiso factura por debajo del precio mínimo
    if (!puedeVerMin()) {
      for (const it of _cart) {
        const _p = _prods.find(x => String(x.id) === String(it.producto_id));
        const _min = _p ? Number(_p.precio_minimo || 0) : 0;
        if (_min > 0 && Number(it.precio) < _min) { toast('err', 'Precio por debajo del mínimo', it.nombre + ' no puede venderse a ese precio'); return; }
      }
    }
    const c = leerCobro();
    const cliId = val('posCliId') || null;
    if (c.credito > 0 && !cliId) { toast('err', 'Hay monto a crédito: elige un cliente'); return; }
    const cliNom = cliId ? ((_clientes.find(x => String(x.id) === String(cliId)) || {}).nombre || null) : ((val('posCli') || '').trim() || null);
    const vendId = val('posVendId') || null;
    const vendNom = vendId ? ((_vendedores.find(x => String(x.id) === String(vendId)) || {}).nombre || null) : null;
    const pagosArr = [];
    if (c.efe > 0) pagosArr.push({ metodo: 'Efectivo', monto: c.efe });
    if (c.tar > 0) pagosArr.push({ metodo: 'Tarjeta', monto: c.tar });
    if (c.tra > 0) pagosArr.push({ metodo: 'Transferencia', monto: c.tra });
    if (c.che > 0) pagosArr.push({ metodo: 'Cheque', monto: c.che });
    if (c.nc > 0) pagosArr.push({ metodo: 'Nota de crédito', monto: c.nc });
    if (c.credito > 0) pagosArr.push({ metodo: 'Crédito', monto: c.credito });
    const metodoLabel = pagosArr.length === 0 ? 'Efectivo' : pagosArr.length === 1 ? pagosArr[0].metodo : 'Mixto';
    const esCred = c.credito > 0;
    let numFac = '';
    try { numFac = (await nextSeq(esCred ? 'factura_credito' : 'factura_contado')) || ''; } catch (e) {}
    if (!numFac) {
      try {
        const pref = prefijoFac(esCred);
        const last = await getAPI().get('pos_ventas', `a_credito=eq.${esCred}&numero_factura=like.${encodeURIComponent(pref)}*&select=numero_factura&order=created_at.desc&limit=1`);
        let nx = 1; if (last && last[0] && last[0].numero_factura) { const m = String(last[0].numero_factura).match(/(\d+)\s*$/); if (m) nx = parseInt(m[1], 10) + 1; }
        numFac = pref + String(nx).padStart(8, '0');
      } catch (e) {}
    }
    const body = {
      cliente_id: cliId, cliente_nombre: cliNom, a_credito: c.credito > 0,
      subtotal: c.subtotal, itbis: c.itbis, total: c.total, descuento: c.descMonto,
      metodo_pago: metodoLabel, pagos: pagosArr,
      pagado_efectivo: c.efe, pagado_tarjeta: c.tar, pagado_transferencia: c.tra, pagado_otro: c.che + c.nc,
      credito_monto: c.credito, recibido: c.efe, devuelta: c.devuelta,
      tipo_comprobante: _facNCF || 'sin', numero_factura: numFac || null,
      vendedor_id: vendId, vendedor_nombre: vendNom,
      almacen_id: (_almacenes.length && _almacenSel) ? _almacenSel : null,
      estado: 'completada', caja_id: (_caja && _caja.id) || null, created_by_name: nomAdmin()
    };
    if (_facFecha) body.fecha = _facFecha;
    try {
      const r = await getAPI().post('pos_ventas', body);
      const venta = (r && r[0]) || null;
      if (!venta) throw new Error('No se pudo registrar la venta');
      // VENTA EN CUOTAS: si se marcó financiar, crear el plan (best-effort, no rompe la venta)
      try {
        const finChk = document.getElementById('finChk');
        if (finChk && finChk.checked && c.credito > 0 && cliId) {
          const n = Math.max(1, parseInt(val('finN')) || 1);
          const frec = val('finFrec') || 'semanal';
          const paso = frec === 'mensual' ? 30 : frec === 'quincenal' ? 15 : 7;
          const cuota = Math.round((c.credito / n) * 100) / 100;
          const rf = await getAPI().post('pos_financiamientos', { venta_id: venta.id, cliente_id: cliId, cliente_nombre: cliNom, descripcion: (_cart[0] ? _cart[0].nombre : 'Venta') + (_cart.length > 1 ? ' +' + (_cart.length - 1) : ''), monto_total: c.total, inicial: c.pagado, monto_financiado: c.credito, cuotas_total: n, cuota_monto: cuota, frecuencia: frec });
          const fin = rf && rf[0];
          if (fin) {
            const cuotas = []; const base = new Date();
            for (let i = 1; i <= n; i++) { const f = new Date(base.getTime() + paso * i * 86400000); cuotas.push({ financiamiento_id: fin.id, numero: i, fecha_venc: f.toISOString().slice(0, 10), monto: i === n ? Math.round((c.credito - cuota * (n - 1)) * 100) / 100 : cuota }); }
            const rc = await getAPI().post('pos_fin_cuotas', cuotas);
            _fins.unshift(fin); (rc || cuotas).forEach(x => _finCuotas.push(x));
            try { window.logAudit && window.logAudit('POS_FINANCIAMIENTO', cliNom + ' · ' + fmt(c.credito) + ' en ' + n + ' cuotas (' + frec + ')', 'POS'); } catch (e2) {}
            toast('ok', 'Plan de cuotas creado', n + ' cuotas de ' + fmt(cuota));
          }
        }
      } catch (eFin) { console.error('financiamiento:', eFin); }
      const items = _cart.map(it => {
        const _p = _prods.find(x => String(x.id) === String(it.producto_id));
        const gd = _p ? Number(_p.garantia_dias || 0) : 0;
        const gh = gd > 0 ? new Date(Date.now() + gd * 86400000).toISOString().slice(0, 10) : null;
        return { venta_id: venta.id, producto_id: it.producto_id, nombre: it.nombre, precio: it.precio, cantidad: it.cantidad, itbis: it.itbis, descuento: Math.round(lineDescMonto(it)), importe: Math.round(lineImporte(it)), serial: (it.seriales && it.seriales.length) ? it.seriales.map(s => s.serial).join(', ') : null, garantia_hasta: gh };
      });
      try { await getAPI().post('pos_venta_items', items); } catch (e) {}
      // Marcar seriales/IMEI vendidos (best-effort)
      try { for (const it of _cart) { if (it.seriales && it.seriales.length) { for (const s of it.seriales) { getAPI().patch('pos_seriales', 'id=eq.' + s.id, { estado: 'vendido', venta_id: venta.id }).catch(() => {}); } } } } catch (e) {}
      // Asignar NCF fiscal si hay secuencia activa para el tipo elegido (best-effort)
      let ncfAsignado = null;
      try { ncfAsignado = await asignarNCF(_facNCF); if (ncfAsignado) await getAPI().patch('pos_ventas', 'id=eq.' + venta.id, { ncf: ncfAsignado }); } catch (e) {}
      // contabilizar la venta automáticamente (best-effort, no bloquea la venta)
      try { postAsientoVenta(venta, c); } catch (e) {}
      // descontar stock (best-effort; los servicios no manejan stock)
      for (const it of _cart) {
        try { const p = _prods.find(x => String(x.id) === String(it.producto_id)); if (p && p.tipo !== 'servicio') { const prev = Number(p.stock || 0); const ns = prev - Number(it.cantidad); p.stock = ns; getAPI().patch('pos_productos', 'id=eq.' + p.id, { stock: ns }).catch(() => {}); logMov(p, 'venta', -Number(it.cantidad), prev, ns, numFac || ('No. ' + (venta.numero || '')), null); if (_almacenes.length && _almacenSel) { try { upsertStockAlm(it.producto_id, _almacenSel, stockEnAlm(it.producto_id, _almacenSel) - Number(it.cantidad)).catch(() => {}); } catch (e) {} } } } catch (e) {}
      }
      if (c.credito > 0 && cliId) { _fiadoByCli[cliId] = (_fiadoByCli[cliId] || 0) + c.credito; }
      toast('ok', c.credito > 0 ? 'Venta registrada (parte fiada)' : 'Venta registrada', 'No. ' + (venta.numero || '') + ' · ' + fmt(c.total));
      const ventaTicket = Object.assign({}, body, { id: venta.id, numero: venta.numero, fecha: venta.fecha || new Date().toISOString(), ncf: ncfAsignado, _items: items });
      _cart = [];
      _factCli = '';
      _facNCF = 'sin'; _facCredito = false; _facFecha = ''; _facSubTab = 'datos';
      cerrarModal('nxPosPago');
      const view = document.getElementById('v-pos'); if (view && (_posTab === 'vender' || _posTab === 'factura')) renderPOS(view);
      ticketHTML(ventaTicket);
    } catch (e) { toast('err', 'No se pudo cobrar', String(e && e.message || e)); }
  };
```

### Validación de stock antes de vender: `stockDisponible` + `puedeAgregar`
```js
  function stockDisponible(p) { return p && p.tipo !== 'servicio' ? Number(p.stock || 0) : Infinity; }
  function puedeAgregar(pid, extra) {
    if (esPreTab()) return true; // PREVENTA: no valida stock
    const p = _prods.find(x => String(x.id) === String(pid)); if (!p) return false;
    if (p.tipo === 'servicio') return true;
    const en = _cart.filter(x => String(x.producto_id) === String(pid)).reduce((t, x) => t + Number(x.cantidad || 0), 0);
    if (en + (extra || 1) > stockDisponible(p)) { toast('err', 'Sin stock disponible', p.nombre + ' — quedan ' + Number(p.stock || 0)); return false; }
    return true;
  }
```

### `nxPosAnularVenta(id)` (A1/A6)
```js
  window.nxPosAnularVenta = async function (id) {
    const v = (_ventas || []).find(x => String(x.id) === String(id)); if (!v) return;
    if (!confirm('¿Anular la factura ' + (v.numero_factura || '#' + v.numero) + '? Se devolverá el stock.')) return;
    try {
      await getAPI().patch('pos_ventas', 'id=eq.' + id, { estado: 'anulada' });
      try { const items = await getAPI().get('pos_venta_items', 'venta_id=eq.' + id + '&select=producto_id,cantidad'); for (const it of (items || [])) { const p = _prods.find(x => String(x.id) === String(it.producto_id)); if (p && p.tipo !== 'servicio') { const prev = Number(p.stock || 0); const ns = prev + Number(it.cantidad || 0); p.stock = ns; getAPI().patch('pos_productos', 'id=eq.' + p.id, { stock: ns }).catch(() => {}); logMov(p, 'anulacion', Number(it.cantidad || 0), prev, ns, (v.numero_factura || v.numero || ''), 'Anulación de factura'); if (_almacenes.length) { const aid = v.almacen_id || (almPrincipal() && almPrincipal().id); if (aid) { try { upsertStockAlm(it.producto_id, aid, stockEnAlm(it.producto_id, aid) + Number(it.cantidad || 0)).catch(() => {}); } catch (e) {} } } } } } catch (e) {}
      // Asiento inverso de la venta (revierte Ventas + ITBIS contra Caja/CxC)
      try {
        const byc = await ctasMap();
        if (Object.keys(byc).length) {
          const caja = Number(v.pagado_efectivo || 0) + Number(v.pagado_tarjeta || 0) + Number(v.pagado_transferencia || 0) + Number(v.pagado_otro || 0);
          const ln = [lnCta(byc, '4101', 'Ventas', Number(v.subtotal || 0), 0), lnCta(byc, '2102', 'ITBIS por pagar', Number(v.itbis || 0), 0), lnCta(byc, '1101', 'Caja', 0, caja), lnCta(byc, '1103', 'Cuentas por cobrar (clientes)', 0, Number(v.credito_monto || 0))].filter(Boolean);
          if (ln.length >= 2) await postAsientoConcepto(isoHoy(), 'Anulación venta ' + (v.numero_factura || ('No. ' + (v.numero || ''))), 'anulacion', v.id, ln, v.numero_factura || String(v.numero || ''));
        }
      } catch (e) {}
      try { await getAPI().patch('pos_seriales', 'venta_id=eq.' + id, { estado: 'disponible', venta_id: null }); } catch (e) {}
      v.estado = 'anulada';
      toast('ok', 'Factura anulada', 'Stock devuelto y contabilidad revertida');
      pintarHistorial();
    } catch (e) { toast('err', 'No se pudo anular', String(e && e.message || e)); }
  };
```

### `postAsientoVenta` (A2/A5) + helpers de asientos
```js
  async function postAsientoVenta(venta, c) {
    try {
      let cu = _cuentas;
      if (!cu || !cu.length) { try { cu = await getAPI().get('pos_cuentas', 'select=id,codigo,nombre') || []; } catch (e) { cu = []; } }
      if (!cu.length) return; // sin plan de cuentas: no se contabiliza
      const byc = {}; cu.forEach(x => byc[x.codigo] = x);
      const ln = (cod, nom, d, h) => { const x = byc[cod]; if (!x || (Math.round(d) === 0 && Math.round(h) === 0)) return null; return { cuenta_id: x.id, cuenta_codigo: cod, cuenta_nombre: x.nombre || nom, debito: Math.round(d), credito: Math.round(h) }; };
      const caja = Number(c.efe || 0) + Number(c.tar || 0) + Number(c.tra || 0) + Number(c.che || 0) + Number(c.nc || 0);
      const lineas = [ln('1101', 'Caja', caja, 0), ln('1103', 'Cuentas por cobrar (clientes)', Number(c.credito || 0), 0), ln('4101', 'Ventas', 0, Number(c.subtotal || 0)), ln('2102', 'ITBIS por pagar', 0, Number(c.itbis || 0))].filter(Boolean);
      if (lineas.length < 2) return;
      const as = await getAPI().post('pos_asientos', { numero: await nextSeq('asiento'), fecha: (String(venta.fecha || '').slice(0, 10)) || isoHoy(), concepto: 'Venta ' + (venta.numero_factura || ('No. ' + (venta.numero || ''))), referencia: venta.numero_factura || String(venta.numero || ''), tipo: 'venta', origen_id: venta.id });
      const aid = (as && as[0] && as[0].id); if (!aid) return;
      await getAPI().post('pos_asiento_lineas', lineas.map(l => Object.assign({ asiento_id: aid }, l)));
    } catch (e) {}
  }
  async function ctasMap() {
    let cu = _cuentas;
    if (!cu || !cu.length) { try { cu = await getAPI().get('pos_cuentas', 'select=id,codigo,nombre') || []; } catch (e) { cu = []; } }
    const byc = {}; cu.forEach(x => byc[x.codigo] = x); return byc;
  }
  function lnCta(byc, cod, nomDef, d, h) { const x = byc[cod]; if (!x || (Math.round(d) === 0 && Math.round(h) === 0)) return null; return { cuenta_id: x.id, cuenta_codigo: cod, cuenta_nombre: x.nombre || nomDef, debito: Math.round(d), credito: Math.round(h) }; }
  async function postAsientoConcepto(fecha, concepto, tipo, origenId, lineas, referencia) {
    lineas = lineas.filter(Boolean); if (lineas.length < 2) return;
    try {
      const as = await getAPI().post('pos_asientos', { numero: await nextSeq('asiento'), fecha: (String(fecha || '').slice(0, 10)) || isoHoy(), concepto: concepto, referencia: referencia || null, tipo: tipo, origen_id: origenId || null });
      const aid = (as && as[0] && as[0].id); if (!aid) return;
      await getAPI().post('pos_asiento_lineas', lineas.map(l => Object.assign({ asiento_id: aid }, l)));
    } catch (e) {}
  }
  // Compra: Debe Inventario (1104) (+ITBIS adelantado) / Haber Caja o CxP  ← referencia de cómo SÍ se mueve 1104
  async function postAsientoCompra(compra, subtotal, itbis, aCredito) {
    try {
      const byc = await ctasMap(); if (!Object.keys(byc).length) return;
      const monto = Number(subtotal || 0) + Number(itbis || 0);
      const lineas = [lnCta(byc, '1104', 'Inventario de mercancías', Number(subtotal || 0), 0), lnCta(byc, '1105', 'ITBIS pagado (adelantado)', Number(itbis || 0), 0)];
      if (aCredito) lineas.push(lnCta(byc, '2101', 'Cuentas por pagar (proveedores)', 0, monto));
      else lineas.push(lnCta(byc, '1101', 'Caja', 0, monto));
      await postAsientoConcepto(compra.fecha, 'Compra ' + (compra.proveedor_nombre ? 'a ' + compra.proveedor_nombre : ('No. ' + (compra.numero || ''))), 'compra', compra.id, lineas, String(compra.numero || ''));
    } catch (e) {}
  }
  async function postAsientoAbono(cliNom, monto, metodo, fecha, origenId) {
    try {
      const byc = await ctasMap(); if (!Object.keys(byc).length) return;
      const efe = (metodo || 'Efectivo') === 'Efectivo';
      const lineas = [lnCta(byc, efe ? '1101' : '1102', efe ? 'Caja' : 'Banco', Number(monto || 0), 0), lnCta(byc, '1103', 'Cuentas por cobrar (clientes)', 0, Number(monto || 0))];
      await postAsientoConcepto(fecha, 'Abono cliente' + (cliNom ? ' ' + cliNom : ''), 'cobro', origenId || null, lineas);
    } catch (e) {}
  }
  async function delAsientoOrigen(tipo, origenId) {
    try {
      const as = await getAPI().get('pos_asientos', 'select=id&tipo=eq.' + tipo + '&origen_id=eq.' + origenId) || [];
      for (const a of as) { try { await getAPI().del('pos_asiento_lineas', 'asiento_id=eq.' + a.id); await getAPI().del('pos_asientos', 'id=eq.' + a.id); } catch (e) {} }
    } catch (e) {}
  }
```

### `stockEnAlm` + `upsertStockAlm` (A3) + `logMov` + helpers de almacén
```js
  function almPrincipal() { return _almacenes.find(a => a.es_principal) || _almacenes[0] || null; }
  function almNombre(id) { const a = _almacenes.find(x => String(x.id) === String(id)); return a ? a.nombre : ''; }
  function stockKey(pid, aid) { return String(pid) + '|' + String(aid); }
  function stockEnAlm(pid, aid) { const r = _stockAlmRows[stockKey(pid, aid)]; return r ? Number(r.stock || 0) : 0; }
  function almTotalUnidades(aid) { let s = 0; Object.keys(_stockAlmRows).forEach(k => { if (k.endsWith('|' + aid)) s += Number(_stockAlmRows[k].stock || 0); }); return s; }
  async function upsertStockAlm(pid, aid, nuevo) {
    const k = stockKey(pid, aid); const r = _stockAlmRows[k];
    if (r && r.id) { await getAPI().patch('pos_stock_almacen', 'id=eq.' + r.id, { stock: nuevo }); r.stock = nuevo; }
    else { const res = await getAPI().post('pos_stock_almacen', { producto_id: pid, almacen_id: aid, stock: nuevo }); const row = res && res[0]; _stockAlmRows[k] = { id: row ? row.id : null, stock: nuevo }; }
  }
  async function logMov(prod, tipo, cantidad, stockAnterior, stockNuevo, referencia, motivo) {
    try { await getAPI().post('pos_inv_movimientos', { producto_id: prod.id, producto_nombre: prod.nombre, tipo: tipo, cantidad: cantidad, stock_anterior: stockAnterior, stock_nuevo: stockNuevo, referencia: referencia || null, motivo: motivo || null, created_by_name: (typeof nomAdmin === 'function' ? nomAdmin() : null) }); } catch (e) {}
  }
```

### Generador de Nota de Crédito fiscal (NCF B04) — `nxDevGuardar` (flujo Devolución; NO se dispara al anular)
```js
  window.nxDevGuardar = async function () {
    const lineas = _devEdit.lineas.filter(l => Number(l.cant || 0) > 0);
    if (!lineas.length) { toast('err', 'Indica al menos una cantidad a devolver'); return; }
    const t = devTotales();
    const v = _devEdit.venta;
    const metodo = val('devMet') || 'Efectivo';
    let ncfDev = null;
    try {
      let prev = []; try { prev = await getAPI().get('pos_devoluciones', 'select=numero&order=created_at.desc&limit=1') || []; } catch (e) {}
      const numero = (await nextSeq('nota_credito')) || devProxNumero(prev);
      try { ncfDev = await asignarNCF('B04'); } catch (e) {}
      const body = { venta_id: v.id, numero: numero, ncf: ncfDev, fecha: isoHoy(), cliente_id: v.cliente_id || null, cliente_nombre: v.cliente_nombre || null, motivo: (val('devMot') || '').trim() || null, subtotal: t.subtotal, itbis: t.itbis, total: t.total, metodo: metodo, estado: 'emitida', created_by_name: nomAdmin() };
      const r = await getAPI().post('pos_devoluciones', body);
      const dev = (r && r[0]) || null; if (!dev) throw new Error('No se pudo registrar');
      _notasCred.unshift(dev);
      const items = lineas.map(l => ({ devolucion_id: dev.id, producto_id: l.producto_id, nombre: l.nombre, cantidad: l.cant, precio: Math.round(l.precio), itbis: !!l.itbis, importe: Math.round(l.precio * l.cant) }));
      await getAPI().post('pos_devolucion_items', items);
      for (const l of lineas) { try { const p = _prods.find(x => String(x.id) === String(l.producto_id)); if (p && p.tipo !== 'servicio') { const prev = Number(p.stock || 0); const ns = prev + Number(l.cant || 0); p.stock = ns; getAPI().patch('pos_productos', 'id=eq.' + p.id, { stock: ns }).catch(() => {}); logMov(p, 'devolucion', Number(l.cant || 0), prev, ns, (dev.numero || ''), 'Devolución'); if (_almacenes.length) { const aid = v.almacen_id || (almPrincipal() && almPrincipal().id); if (aid) { try { upsertStockAlm(l.producto_id, aid, stockEnAlm(l.producto_id, aid) + Number(l.cant || 0)).catch(() => {}); } catch (e) {} } } } } catch (e) {}
      }
      if (metodo.indexOf('CxC') >= 0 && v.cliente_id) { _abonosByCli[v.cliente_id] = (_abonosByCli[v.cliente_id] || 0) + t.total; }
      try { postAsientoDevolucion(dev, t, metodo, v); } catch (e) {}
      cerrarModal('nxDevForm');
      toast('ok', 'Devolución emitida', (ncfDev ? 'NCF ' + ncfDev + ' · ' : '') + fmt(t.total));
      nxDevImprimirObj(Object.assign({}, dev, { _items: items, _venta: v }));
    } catch (e) { toast('err', 'No se pudo emitir', String(e && e.message || e)); }
  };
```

### Costo de Ventas (COGS)
**No existe** ninguna función que lo registre. `postAsientoVenta` no genera línea de costo de ventas. El costo solo está en `pos_productos.costo`; `pos_venta_items` no lo guarda.
