# e-CF con MSeller — fase 1: conexión (Edge `ecf-mseller` v1)

## Pedido
- El dueño escribió: «Lee la documentación de MSeller ECF… y ayúdame a integrarla en mi sistema».
- Se leyó completa https://docs.ecf.mseller.app/llms-full.txt. El plan por fases está en `docs/planes/2026-10-26-ecf-mseller.md`.

## Hecho
- `supabase/functions/ecf-mseller/`:
  - `_lib.ts`: cliente de la API. Inicia sesión con email y contraseña, **reutiliza** el `idToken` y lo renueva con `refreshToken` + `sub` sin reenviar la contraseña. Ante un 401 renueva y reintenta una vez. Trae `probar` (solo lectura), `consultar` y `validar` (`?validate=true`: no va a la DGII ni gasta secuencia).
  - `index.ts`: acciones `estado`, `probar`, `consultar` y `validar`. **No emite comprobantes.** Acceso: admin activo (sesión de NEXUS), clave de servicio o llave de un solo uso (`_comprobante_lote_llaves`, como `bauche-auto-leer`).
  - Secretos: `MSELLER_EMAIL`, `MSELLER_PASSWORD`, `MSELLER_API_KEY` y `MSELLER_ENTORNO` (opcional, TesteCF por defecto).
  - `_lib_test.ts`: **8/8** con un MSeller simulado. `deno check` del `index.ts` sin errores.
- **Desplegada v1** (`verify_jwt` false; hace su propia verificación). Es una función nueva: no cambia nada de lo que ya funciona.
- Comprobado en vivo:
  - sin llave responde **401**;
  - con llave, `estado` dice `faltan: [MSELLER_EMAIL, MSELLER_PASSWORD]`, es decir, **`MSELLER_API_KEY` sí está guardada**;
  - entorno: TesteCF.

## Siguiente paso
- Cuando el dueño guarde el correo y la contraseña: `probar` en TesteCF (solo lectura) y reportar el resultado.
- Después, las fases 2 a 5 (secuencias e-NCF, emisión desde la caja, seguimiento y notas de crédito) en su propia ronda, con auditoría previa, porque tocan facturas y dinero.
