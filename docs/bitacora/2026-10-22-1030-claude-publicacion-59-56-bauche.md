# Publicación 59.56 — Bauche repetido smart (en vivo) + huellas de los comprobantes viejos

Sigue a `2026-10-22-0945-claude-bauche-smart.md`. Dueño: «Publícalo y lee los 139 viejos».

## Base de datos (producción `tnwsgcxurfyuszxsewsn`)
- Aplicado en partes con `execute_sql`:
  - `20261014120000` (tabla `pago_comprobantes`, RLS solo lectura, RPC `comprobante_buscar` / `registrar` / `vincular`);
  - `20261022120000` (`comprobante_parecidos`);
  - `20261022120100` (`_comprobante_lote_llaves`, RLS sin políticas).
- Permisos verificados en el catálogo: `anon` no ejecuta `comprobante_*` ni `_pago_comprobante_permiso`; `authenticated` sí. `anon` y `authenticated` no leen `_comprobante_lote_llaves`. (`pago_comprobante_norm` y `_dist` son funciones puras; las ejecuta cualquiera, sin riesgo.)
- **No se aplicó** el backfill estático `20261014120100`. Queda reemplazado por la lectura por lotes, que calcula las huellas en el servidor.

## Edge `comprobante-leer` v5 (`verify_jwt` activo)
- Lee hora y quien envía; devuelve `ia_error`.
- Modo `lote`: solo un administrador con sesión o una llave de un solo uso (se guarda su SHA-256 y vence en 30 min). Con `solo_huella` no llama a la IA.
- Probado: sin llave responde 401.

## Comprobantes viejos
- **138 de 139 con huella exacta guardada** y vinculada a su pago. Si alguien vuelve a subir uno de esos archivos, NEXUS lo detecta.
- El que falta (abono `15416461…`) es un archivo de un proyecto viejo, igual que el 14-oct; quedó anotado `no_esta_en_nexus`.
- 118 fotos distintas, 14 grupos con la misma foto (depósitos compartidos ya conocidos).
- **Lectura con IA: NO se hizo.** La `ANTHROPIC_API_KEY` de NEXUS responde «clave no válida» (401/403) en la primera prueba; no se gastó nada. El crédito del dueño es de otra clave (CRM de Bayol).
- Para terminar, cuando el dueño ponga la clave buena en Supabase → NEXUS → Edge Functions → Secrets → `ANTHROPIC_API_KEY`: crear una llave nueva y llamar `{"lote":true,"limite":15}` hasta `pendientes: 0`.
- La llave usada hoy vence a los 30 min. El `delete` para borrarla antes se colgó en la herramienta MCP (60 s), igual que dice la MEMORIA; no se forzó. La copia local se borró.

## Frontend
- `main` con `APP_VERSION` 59.56, build `6033`. Verificado en vivo: `parches-bauche-unico.js` con `comprobante_parecidos` y registrado en `parches-seguros.js`.
- Pruebas: `qa-bauche-unico` 64/64, `qa-registrar-pago` 58/58, `qa-cobro-adelanto` 20/20.
- Apagar en un equipo: `localStorage.nxBaucheUnico='0'`.

## Mientras no haya clave de IA
- Funciona: misma foto, mismo archivo y depósito compartido.
- No funciona: número leído, «posible repetido» y llenar la referencia y el banco solos.
- La tarjeta lo dice: «Se revisó solo la foto exacta: la clave de la IA no es válida».
- La misma foto de un pago viejo, sin monto leído, se **bloquea** y la aprueba un administrador con motivo, porque no se sabe el monto del depósito.
