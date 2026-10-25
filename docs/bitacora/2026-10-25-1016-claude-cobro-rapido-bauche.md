# 2026-10-25 10:16 (RD) — Claude — 59.58 «Cobro rápido con el bauche» (rama, sin publicar)

## Pedido del dueño
- «Vamos a usar la IA de los bauches smart para agilizar el proceso de cobro».
- Decisiones del dueño (preguntadas antes de construir):
  - **Cuándo lee la IA:** «Apenas llegan» (al entrar la foto del cliente por WhatsApp, no al tocar «Cobrar»).
  - **Qué monto pone:** «Pone el del bauche y avisa» (si no cubre la deuda, avisa que es abono parcial; si la pasa, avisa que es adelanto).

## Qué hace
1. Un cliente **vinculado** manda una foto por WhatsApp → el webhook la guarda como siempre y, en segundo plano, llama a la Edge `bauche-auto-leer`.
2. La Edge lee la foto con Claude (el mismo modelo y esquema de `comprobante-leer`) y guarda la lectura en `whatsapp_hilo_mensajes.bauche_ia` (+ `bauche_sha256` y `bauche_leido_at`). **No registra pagos ni toca dinero.**
3. En el chat, debajo de la foto, aparece un chip: «Bauche RD$ 4,500 · Banreservas · **Cobrar**». Si ese bauche ya se usó en otro pago, el chip sale en rojo («ya usado en otro pago», botón «Revisar»).
4. La cola de bauches (Solicitudes) muestra el monto, la fecha y el banco leídos; el botón dice «Cobrar RD$X».
5. Al tocar «Cobrar», «Registrar pago» se abre **ya lleno**:
   - método Transferencia (si estaba en Efectivo);
   - monto del bauche;
   - banco y referencia;
   - cuenta de destino sugerida por el historial (`comprobante_cuenta_sugerida`: a qué agente se asignaron antes los pagos que llegaron a esa misma cuenta).
6. Una nota dice «Llenado con el bauche: … Revise antes de registrar», y otra avisa del abono parcial o del adelanto.
7. No se vuelve a pagar la lectura: si la foto ya se leyó al llegar, el cobro usa esa lectura.
8. El control de bauche repetido (59.56) sigue igual. El aviso «¿Es un pago por adelantado?» sigue pidiendo confirmación.

## Archivos
- `supabase/migrations/20261025140000_bauche_auto_lectura.sql` — 3 columnas nulas + RPC de solo lectura `comprobante_cuenta_sugerida` (permiso `_pago_comprobante_permiso()`, `authenticated` sí, `anon`/`public` no).
- `supabase/functions/bauche-auto-leer/index.ts` — nueva. Solo interna: clave de servicio o llave de un solo uso de `_comprobante_lote_llaves`. Idempotente. Ante errores pasajeros no guarda nada. Se apaga con el secreto `BAUCHE_AUTO_LEER=off`.
- `supabase/functions/whatsapp-webhook/_lib.ts`, `index.ts`, `_lib_test.ts` — gancho `alGuardarImagen` (solo foto entrante de un cliente vinculado, después de guardar sin error; un fallo del gancho no afecta el webhook).
- `parches-bauche-unico.js` — `cobroRapido()` (método, monto, cuenta sugerida, notas) y reuso de la lectura previa.
- `parches-whatsapp-inbox.js` — chip bajo la foto, línea del bauche en la cola, «Cobrar RD$X», revisión de repetido del chip.
- `parches-whatsapp-voz-mensajes.js` — «Cobrar» desde el menú del mensaje usa la lectura previa.
- `scripts/qa-bauche-unico.mjs` (prueba E actualizada + prueba J nueva) y `scripts/qa-whatsapp-chat.mjs` (chip).
- `index.html` — `APP_VERSION` 59.58.
- Se incluye la bitácora `2026-10-25-0859-claude-bauche-ia-activa.md` (estaba en la rama `claude/bitacoras-pendientes`).

## Estado en el servidor
| Pieza | Estado |
|---|---|
| Migración (columnas + RPC) | **Aplicada en producción** (solo agrega; no toca datos). Permisos verificados. |
| Edge `bauche-auto-leer` v1 | **Desplegada** (`verify_jwt` false, valida su propia llave). Nadie la llama todavía salvo a mano. |
| Fotos que ya esperaban en la cola | 25 leídas a mano con llave de un solo uso; 23 son bauches. |
| `whatsapp-webhook` | **NO desplegado** (sigue la v13). Activar la lectura «apenas llegan» cambia WhatsApp en vivo: va con el «publícalo» del dueño. |
| Pantalla (JS) | En la rama `claude/cobro-bauche-ia`, sin publicar. |

## Pruebas
- `qa-bauche-unico`: **84/84** (390 y 1280 px). La J: abre en Efectivo → Transferencia; 0 lecturas nuevas con la lectura previa; monto, referencia y cuenta sugerida; aviso de adelanto; registra con `p_monto`, `p_cuenta_destino_id` y `p_permitir_adelanto`.
- `qa-whatsapp-chat`: **97/97** (chip ≥44 px, verde, con monto y banco).
- Deno `_lib_test.ts`: **22/22** (el gancho solo se llama con foto entrante de cliente vinculado; un error del gancho no rompe el webhook).
- Hallazgo aparte: en el simulador, la cita de un mensaje que responde a una foto muestra «Cliente» en letras verticales. **Ya pasa igual en `main`** (comparado con el `parches-whatsapp-inbox.js` de `origin/main`); no lo causa este cambio. Queda pendiente revisarlo en un iPhone real.

## Riesgos
- Costo de IA: una lectura por cada foto que manda un cliente vinculado (también las que no son bauches). Haiku, esfuerzo bajo. Se apaga con `BAUCHE_AUTO_LEER=off`.
- La cuenta sugerida sale del historial; si un agente cambió de cuenta, la sugerencia puede fallar. La cajera la ve y puede cambiarla antes de registrar.

## Siguiente paso
- El dueño ve las capturas y la vista previa. Con «publícalo»: desplegar `whatsapp-webhook` (`index.ts` + `_lib.ts`), unir la rama a `main` y verificar en vivo con una foto de prueba desde el número del dueño.
