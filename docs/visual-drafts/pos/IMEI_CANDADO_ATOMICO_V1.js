// NEXUS PRO POS — helpers para candado atómico de IMEI.
// Integrar dentro del IIFE real del POS, cerca de los helpers de seriales.

async function reservarImeisCart() {
  const ids = [];
  for (const it of _cart) {
    if (it.seriales && it.seriales.length) {
      for (const s of it.seriales) {
        if (s && s.id) ids.push(String(s.id));
      }
    }
  }
  if (!ids.length) return null;

  try {
    const r = await getAPI().post('rpc/pos_reservar_seriales', { p_serial_ids: ids });
    return Array.isArray(r) ? r[0] : r;
  } catch (e) {
    for (const it of _cart) {
      if (it.seriales && it.seriales.length) it.seriales = [];
    }
    toast('err', 'IMEI ya no disponible',
      'Otro usuario pudo vender o reservar uno de los IMEI. Vuelve a seleccionarlo.');
    throw e;
  }
}

async function confirmarImeisReservados(token, ventaId) {
  if (!token) return 0;
  const r = await getAPI().post('rpc/pos_confirmar_seriales_reservados', {
    p_reserva_token: token,
    p_venta_id: ventaId
  });
  return Number(Array.isArray(r) ? r[0] : r) || 0;
}

async function liberarReservaImeis(token) {
  if (!token) return;
  try {
    await getAPI().post('rpc/pos_liberar_reserva_seriales', {
      p_reserva_token: token
    });
  } catch (e) {
    console.warn('No se pudo liberar reserva IMEI:', e);
  }
}

/*
INTEGRACIÓN EXACTA EN nxPosConfirmar:

1) Después de TODAS las validaciones del carrito y ANTES de crear pos_ventas:

let _imeiReserva = null;
try {
  _imeiReserva = await reservarImeisCart();
} catch (e) {
  return;
}

2) Inmediatamente después de crear `venta`:

try {
  if (_imeiReserva) {
    const esperados = _cart.reduce((n, it) => n + ((it.seriales || []).length), 0);
    const confirmados = await confirmarImeisReservados(_imeiReserva, venta.id);
    if (confirmados !== esperados) {
      throw new Error('No se pudieron confirmar todos los IMEI reservados');
    }
    _imeiReserva = null;
  }
} catch (e) {
  toast('err', 'Venta registrada con incidencia de IMEI',
    'La venta existe, pero los IMEI requieren revisión administrativa.');
  console.error('Confirmación IMEI:', e);
  throw e;
}

3) En el catch exterior de la creación de venta, ANTES de salir:

if (_imeiReserva) await liberarReservaImeis(_imeiReserva);

4) ELIMINAR el bloque viejo:
   // Marcar seriales/IMEI vendidos (best-effort)
   try { for (...) { getAPI().patch(...).catch(() => {}); } } catch (e) {}

No deben coexistir ambos mecanismos.
*/
