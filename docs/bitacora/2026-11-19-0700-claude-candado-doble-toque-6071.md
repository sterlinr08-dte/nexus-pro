# 19-Nov-2026 07:00 (RD) — Claude — Candado contra el doble toque en botones de dinero (6071)

## Pedido
- Auditoría de «cargando» (bitácora `*-claude-auditoria-cargando.md`, PR #536).
- El dueño eligió: «Botones de dinero (Recomendado)».

## Cambios
- **`parches-pos.js`** (al final del módulo): candado `candado(nombre, clave, botones)`.
  - Mientras la acción guarda, un segundo toque no hace nada y avisa «Guardando, espere». El botón queda apagado (`aria-busy`, clase `nxGuardando`).
  - El candado se suelta siempre en `finally`.
  - Acciones:
    - `nxPosConfirmar` (Confirmar venta, botón `.nxPgGo`, F4 y Factura);
    - `nxFacConfirmar` (no toca la ventana de impresión/WhatsApp si ya hay una venta guardándose);
    - `nxDevGuardar` (Nota de crédito);
    - `nxPosAddMov` (entrada/salida de caja);
    - `nxPosAnularVenta` (por venta).
  - Apagar en un equipo: `localStorage.nx_candado_off='1'`.
- **`parches-seguros-base.js`**: `nxAceptarTransferencia` con candado por transferencia; su botón se apaga mientras acepta.
- **`parches-bauche-unico.js`**: «Registrar pago» con bauche.
  - Desde el primer toque el botón se apaga y dice «Verificando comprobante…».
  - Justo antes de pasar al cobro de siempre se le devuelve su estado, para que `regAbono` lo maneje igual que sin bauche.
  - Un segundo toque mientras tanto avisa «Guardando, espere».
- `parches-seguros.js`: `b=6070` → `b=6071`.
- No se tocó el servidor, ni RPC, ni tablas.

## Pruebas (3 toques seguidos; escrituras bloqueadas o simuladas, nada se guardó)
| Acción | Antes (`main`) | Ahora |
|---|---|---|
| POS · Confirmar venta (demo en vivo con el archivo nuevo, caja abierta simulada) | 3 ventas enviadas al servidor | 1; botón apagado mientras guarda y encendido otra vez tras el error |
| Seguros · Aceptar transferencia (servidor de prueba local) | 3 aceptaciones | 1; botón apagado y luego encendido |
| Seguros · Registrar pago con bauche (servidor de prueba local) | 3 comprobantes y 3 cobros | 1 y 1; «Verificando comprobante…» y después «Registrar RD$ 5,500» |
- Sin errores de consola.
- Registrar pago sin bauche: no cambia (va directo al cobro de siempre, que ya se bloqueaba).

## No verificado
- Nota de crédito, movimiento de caja y anular venta: usan el mismo candado que Confirmar venta, pero no se probaron uno por uno en pantalla.
- En vivo en una empresa de seguros real: no se probó (no hay demo de seguros).

## Estado
- Rama `claude/candado-doble-toque`. Espera el «Publícalo» del dueño.
- Siguiente: las pantallas que dicen «No hay…» o RD$ 0 cuando falla la carga.
