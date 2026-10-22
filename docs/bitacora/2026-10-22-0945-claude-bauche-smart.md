# 59.56 — Bauche repetido «smart» (retoma la 59.25, que nunca se publicó)

## Pedido del dueño
«Como ya tenemos crédito para lo del CRM habilita para que el sistema detecte bauche repetido de manera smart.»

## Diagnóstico
- La herramienta ya existía: `2026-10-14-0500-claude.md`, rama `claude/bauche-unico` (59.25). **Nunca se publicó.**
  Se quedó esperando porque la `ANTHROPIC_API_KEY` de NEXUS daba 401.
- Producción (22-oct): no existen `pago_comprobantes` ni las RPC `comprobante_*`. Hay 139 pagos con comprobante.
- La Edge `comprobante-leer` v2 ya está desplegada en producción, pero nadie la llama.

## Qué se hizo (rama `claude/bauche-smart`, sacada de `main` 59.55)
1. Se trajo el commit `eeecd6e` (59.25) encima de 59.55. Se resolvieron los choques en `index.html` (versión) y `parches-seguros.js` (build `6033`, capa después de `parches-transferir-arrastrar.js`).
2. **Nuevo — aviso «Posible repetido» (ámbar, no bloquea).** Detecta otra captura del mismo depósito (recortada o reenviada) donde la IA no leyó el número.
   - Coinciden el monto exacto, la fecha (±1 día), el banco emisor y la cuenta destino, si se ven.
   - Además debe coincidir la **hora (±2 min)** o **quien envía**.
   - Migración `20261022120000_comprobantes_parecidos.sql`, RPC `comprobante_parecidos`: solo lectura, `security definer`, mismo permiso que las otras.
   - Por qué no basta monto+fecha+banco: probado en producción, cuotas iguales (RD$4,500 Banreservas) del mismo día daban hasta 6 «parecidos» por pago. Se descartó comparar con `abonos` viejos por la misma razón (`abonos.banco` es la cuenta que recibe, no el banco del cliente).
3. **Edge `comprobante-leer`:**
   - la IA también lee `hora` y `ordenante`;
   - devuelve `ia_error` (`clave`, `credito`, `sin_clave`, `ocupado`, `otro`) sin detalles de la clave.
4. **Pantalla:**
   - si no hubo lectura, la tarjeta verde dice «Se revisó solo la foto exacta: la IA no tiene crédito», o el motivo que sea;
   - se guardan la hora y quien envía en `ia_json`, para comparar los próximos;
   - tamaños: «Ver» ≥44×44, «Aprobar» 48 px, motivo con letra de 16 px. Antes los botones medían menos de 44 y el `font` abreviado con `inherit` no era válido.

## Pruebas
- `scripts/qa-bauche-unico.mjs`: **64 PASS / 0 FAIL** a 390 y 1280 px. Agrega los casos H (parecido, no bloquea, guarda hora y quien envía, «Ver» 56×44) e I (motivo de no lectura).
- Regresión: `qa-registrar-pago.mjs` **58/58**, `qa-cobro-adelanto.mjs` **20/20**.
- SQL: expresiones de hora, nombre y banco comprobadas en producción con un `select` (sin escribir).

## Estado
- **No publicado.** Para publicar, con «publícalo»:
  1. aplicar `20261014120000`, `20261014120100` (backfill de huellas) y `20261022120000`, en partes;
  2. desplegar `comprobante-leer` v3;
  3. subir a `main` y verificar en vivo.
- **Clave de la IA:** no se puede ver desde aquí si la de NEXUS ya sirve. El crédito del CRM es de la cuenta de Bayol. Al primer comprobante, la tarjeta dirá si la IA leyó o por qué no. Si dice «clave no válida», el dueño pone una clave nueva en Supabase → NEXUS → Edge Functions → Secrets (`ANTHROPIC_API_KEY`).
- Opcional después: leer con la IA los 139 comprobantes viejos (cuesta menos de US$1) para que también entren en la comparación por número, hora y quien envía.
