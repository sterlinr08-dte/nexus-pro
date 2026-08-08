# Integración exacta en `parches.js` — candado atómico de IMEI

Base medida: `main` / `chatgpt/imei-atomic-draft`, función real `window.nxPosConfirmar` alrededor de las líneas 18.7k–19.1k.

> Este archivo describe cambios sobre código REAL leído del repositorio. No sustituye las pruebas. No aplicar a `main` sin autorización explícita.

## 1. Helpers

Insertar los helpers completos de `IMEI_CANDADO_ATOMICO_V1.js` dentro del IIFE del POS, inmediatamente antes de `window.nxPosConfirmar = async function () {`.

No cambiar IDs, DOM ni lógica visual.

## 2. Limpiar reservas vencidas antes de listar IMEI

Antes de las consultas actuales `pos_seriales ... estado=eq.disponible`, ejecutar:

```js
await liberarReservasImeisVencidas();
```

Aplicar en estas funciones reales encontradas:

- `nxCargarSerialesDet(pid)`
- `window.nxSerialMgr(pid)`
- `window.nxFacSerial(i)`
- `window.nxSerialCuadrar(pid)` antes de contar disponibles

El limpiador solo toca `estado=reservado`, `venta_id IS NULL` y `reserva_hasta < ahora`. Una reserva ligada a una venta nunca se libera por TTL.

## 3. Reservar ANTES de crear `pos_ventas`

El código real termina de construir `body` así:

```js
if (_facFecha) body.fecha = _facFecha;
try {
  const r = await getAPI().post('pos_ventas', body);
```

Debe quedar:

```js
if (_facFecha) body.fecha = _facFecha;
let _imeiReserva = null;
let _imeiVentaCreada = false;
try {
  _imeiReserva = await reservarImeisCart();
} catch (e) {
  return;
}
try {
  const r = await getAPI().post('pos_ventas', body);
```

Si el carrito no tiene IMEI, `reservarImeisCart()` devuelve `null` y el flujo normal sigue igual.

## 4. Marcar que la venta ya existe y confirmar la reserva

El código real es:

```js
const r = await getAPI().post('pos_ventas', body);
const venta = (r && r[0]) || null;
if (!venta) throw new Error('No se pudo registrar la venta');
// VENTA EN CUOTAS...
```

Debe quedar:

```js
const r = await getAPI().post('pos_ventas', body);
const venta = (r && r[0]) || null;
if (!venta) throw new Error('No se pudo registrar la venta');
_imeiVentaCreada = true;

if (_imeiReserva) {
  const esperados = _cart.reduce((n, it) => n + ((it.seriales || []).length), 0);
  try {
    const confirmados = await confirmarImeisReservados(_imeiReserva, venta.id, esperados);
    if (confirmados === esperados) {
      _imeiReserva = null;
    } else {
      await fijarReservaImeisAVenta(_imeiReserva, venta.id);
      try {
        window.logAudit && window.logAudit(
          'POS_VENTA_IMEI_SIN_CONFIRMAR',
          'Factura ' + (numFac || ('No. ' + (venta.numero || ''))) + ' — esperados ' + esperados + ', confirmados ' + confirmados,
          'POS'
        );
      } catch (e2) {}
      toast('warn', 'Venta registrada con incidencia de IMEI', 'La venta existe, pero los IMEI requieren revisión administrativa.');
    }
  } catch (e) {
    const fijada = await fijarReservaImeisAVenta(_imeiReserva, venta.id);
    try {
      window.logAudit && window.logAudit(
        'POS_VENTA_IMEI_SIN_CONFIRMAR',
        'Factura ' + (numFac || ('No. ' + (venta.numero || ''))) + ' — error al confirmar reserva IMEI: ' + String(e && e.message || e) + (fijada ? ' · reserva fijada a la venta' : ' · NO se pudo fijar la reserva'),
        'POS'
      );
    } catch (e2) {}
    toast('warn', 'Venta registrada con incidencia de IMEI', 'La venta existe, pero los IMEI requieren revisión administrativa.');
  }
}

// VENTA EN CUOTAS...
```

Regla crítica: después de `_imeiVentaCreada = true`, ningún error de IMEI hace `throw` hacia el catch exterior.

## 5. Eliminar el PATCH viejo

Eliminar COMPLETO este bloque real:

```js
// Marcar seriales/IMEI vendidos (best-effort)
try {
  for (const it of _cart) {
    if (it.seriales && it.seriales.length) {
      for (const s of it.seriales) {
        getAPI().patch('pos_seriales', 'id=eq.' + s.id, { estado: 'vendido', venta_id: venta.id }).catch(() => {});
      }
    }
  }
} catch (e) {}
```

No pueden coexistir los dos mecanismos.

## 6. Catch exterior

El código real termina actualmente:

```js
} catch (e) { toast('err', 'No se pudo cobrar', String(e && e.message || e)); }
```

Debe quedar:

```js
} catch (e) {
  if (!_imeiVentaCreada && _imeiReserva) await liberarReservaImeis(_imeiReserva);
  toast('err', 'No se pudo cobrar', String(e && e.message || e));
}
```

Esto libera únicamente cuando la venta todavía no existe. Una venta creada nunca se revierte por una falla secundaria de IMEI.

## 7. SQL asociado

Aplicar únicamente en un entorno de prueba el contenido de `IMEI_CANDADO_ATOMICO_V1.sql` antes de probar el JS.

La RPC `pos_confirmar_seriales_reservados` recibe:

- `p_reserva_token`
- `p_venta_id`
- `p_esperados`

Si no puede confirmar exactamente `p_esperados`, hace `RAISE IMEI_RESERVA_INCOMPLETA`, por lo que PostgreSQL revierte la confirmación completa de esa llamada.

## 8. Prueba mínima obligatoria

1. Dos sesiones/cajeros cargan el mismo IMEI como disponible.
2. Cajero A confirma primero: reserva → venta → vendido.
3. Cajero B confirma después: `IMEI_NO_DISPONIBLE`; no crea venta y obliga a re-elegir.
4. Simular fallo de `pos_ventas` después de reservar: reserva vuelve a `disponible`.
5. Simular fallo de confirmación después de existir venta: venta permanece, se genera `POS_VENTA_IMEI_SIN_CONFIRMAR` y la reserva queda ligada a `venta_id`.
6. Esperar >60 s: una reserva abandonada sin `venta_id` vuelve a estar disponible al abrir una superficie IMEI; una reserva ligada a venta NO.
7. Anular una venta confirmada: IMEI vuelve a `disponible`.
8. Devolver el IMEI de una venta: vuelve a `disponible`.

No afirmar “listo” hasta ejecutar estas pruebas con datos de prueba y revisar consola.
