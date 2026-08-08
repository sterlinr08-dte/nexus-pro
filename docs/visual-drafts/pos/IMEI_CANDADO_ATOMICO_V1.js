// NEXUS PRO POS — helpers para candado atómico de IMEI.
// Integrar dentro del IIFE real del POS, cerca de los helpers de seriales.

function imeiErrorCode(e) {
  const s = String((e && (e.message || e.error || e.details)) || e || '');
  if (s.includes('IMEI_NO_DISPONIBLE')) return 'IMEI_NO_DISPONIBLE';
  if (s.includes('IMEI_SIN_ORGANIZACION')) return 'IMEI_SIN_ORGANIZACION';
  return 'IMEI_RPC_ERROR';
}

async function reservarImeisCart() {
  const ids = [];
  for (const it of _cart) {
    if (it.seriales && it.seriales.length) {
      for (const s of it.seriales) if (s && s.id) ids.push(String(s.id));
    }
  }
  if (!ids.length) return null;

  try {
    const r = await getAPI().post('rpc/pos_reservar_seriales', { p_serial_ids: ids });
    return Array.isArray(r) ? r[0] : r;
  } catch (e) {
    const code = imeiErrorCode(e);
    if (code === 'IMEI_NO_DISPONIBLE') {
      for (const it of _cart) if (it.seriales && it.seriales.length) it.seriales = [];
      toast('err', 'IMEI ya no disponible', 'Otro usuario pudo vender o reservar uno de los IMEI. Vuelve a seleccionarlo.');
    } else if (code === 'IMEI_SIN_ORGANIZACION') {
      toast('err', 'No autorizado', 'No se pudo validar la organización para reservar el IMEI.');
    } else {
      toast('err', 'No se pudo validar el IMEI', 'Intenta nuevamente. Si persiste, revisa la conexión.');
    }
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
    await getAPI().post('rpc/pos_liberar_reserva_seriales', { p_reserva_token: token });
  } catch (e) {
    console.warn('No se pudo liberar reserva IMEI:', e);
  }
}

/*
INTEGRACIÓN EXACTA EN nxPosConfirmar

A) Después de TODAS las validaciones del carrito y ANTES de crear pos_ventas:

let _imeiReserva = null;
try {
  _imeiReserva = await reservarImeisCart();
} catch (e) {
  return;
}

B) Envolver la creación de la venta para liberar la reserva si la venta NO llegó a existir:

let venta = null;
try {
  const r = await getAPI().post('pos_ventas', body);
  venta = (r && r[0]) || null;
  if (!venta) throw new Error('No se pudo registrar la venta');
} catch (e) {
  if (_imeiReserva) await liberarReservaImeis(_imeiReserva);
  throw e;
}

C) Inmediatamente después de tener `venta`, confirmar IMEI SIN abortar la venta si algo falla:

if (_imeiReserva) {
  const esperados = _cart.reduce((n, it) => n + ((it.seriales || []).length), 0);
  try {
    const confirmados = await confirmarImeisReservados(_imeiReserva, venta.id);
    if (confirmados === esperados) {
      _imeiReserva = null;
    } else {
      try {
        await logAudit('POS_VENTA_IMEI_SIN_CONFIRMAR',
          'Venta ' + (venta.numero_factura || venta.id) + ': esperados ' + esperados + ', confirmados ' + confirmados,
          'Punto de Venta');
      } catch (e2) {}
      toast('err', 'Venta registrada con incidencia de IMEI', 'La venta fue registrada, pero los IMEI requieren revisión administrativa.');
      // NO throw. La venta ya existe y no se revierte por este fallo secundario.
      // NO liberar a ciegas la reserva: podría volver disponible un equipo ya comprometido por una venta real.
    }
  } catch (e) {
    try {
      await logAudit('POS_VENTA_IMEI_SIN_CONFIRMAR',
        'Venta ' + (venta.numero_factura || venta.id) + ': error al confirmar reserva IMEI - ' + String(e && e.message || e),
        'Punto de Venta');
    } catch (e2) {}
    toast('err', 'Venta registrada con incidencia de IMEI', 'La venta fue registrada, pero los IMEI requieren revisión administrativa.');
    // NO throw y NO liberar aquí.
  }
}

D) ELIMINAR el bloque viejo de `best-effort`:
   getAPI().patch('pos_seriales', 'id=eq.' + s.id, { estado: 'vendido', venta_id: venta.id }).catch(() => {});

No deben coexistir ambos mecanismos.
*/
