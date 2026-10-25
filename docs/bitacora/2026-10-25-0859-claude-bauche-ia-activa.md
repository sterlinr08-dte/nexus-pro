# Bauches: la IA ya lee + lectura de los 140 viejos + verificación de 59.57

Sigue a `2026-10-22-1030-claude-publicacion-59-56-bauche.md`.

## Verificación de la publicación 59.57 (PR #405)
- En nexusprord.com: `APP_VERSION` 59.57, `style#nxLuz` presente y clase `nx-luz` puesta.
- 82 de 82 archivos con el número de publicación nuevo. 0 errores de JS.

## Clave de la IA
- El dueño creó en platform.claude.com la clave «NEXUS PRO BAUCHE» y la puso en Supabase → NEXUS → Edge Functions → Secrets (`ANTHROPIC_API_KEY`).
- La clave no pasó por el chat. Se le recomendó que no venza a los 30 días.

## Lectura de los viejos (`comprobante-leer`, modo lote)
- Se usó una llave de un solo uso: hash en `_comprobante_lote_llaves`, vence a los 30 min. La copia local se borró.
- **Resultado:**
  - 140 de 141 comprobantes leídos (el que falta es el archivo de otro proyecto, ya anotado);
  - 2 no son comprobantes;
  - 139 con monto, 121 con número de transacción y 83 con banco;
  - confianza media 0,83;
  - consumo: 490,812 tokens de entrada y 52,188 de salida (Haiku 5.5), menos de US$1.
- Primera prueba: el monto y la fecha leídos coincidieron con el pago guardado (RD$ 6,000).

## Hallazgos (no se tocó ningún dato; los decide el dueño)

| Número (parcial) | Pagos | Suma de los pagos | Monto del bauche | Clientes | Fecha |
|---|---|---|---|---|---|
| 742…16 | 2 | RD$ 12,000 | **RD$ 6,000** (Banreservas, 08-sep) | MIELFA GLORIBEL MERCEDES ABREU ABREU | 10-sep y **15-oct** |
| 243…60 | 5 | RD$ 27,500 | RD$ 27,000 | 5 clientes | 04-oct |
| 243…69 | 2 | RD$ 8,500 | RD$ 8,300 | ELIOENAI SANTANA / NURIS PEREZ | 30-sep |

- **MIELFA:** la **misma foto** (misma huella exacta) se usó en dos pagos de RD$ 6,000, el 10-sep y el 15-oct. El bauche es del 08-sep, por un solo depósito de RD$ 6,000. Es un bauche repetido de verdad: entró antes de que el control estuviera en vivo (22-oct).
- **Los otros dos:** depósitos compartidos donde los pagos pasan el monto del bauche por RD$ 500 y RD$ 200. Puede ser que esa diferencia se pagara en efectivo, o que la IA leyera mal el monto. Hay que revisarlos.
- Otros 6 depósitos compartidos caben dentro de su monto y están bien.

## Desde hoy
- El control compara también por **número de transacción** y avisa «posible repetido» por monto, fecha, banco, hora y quien envía.
- Llena solos la referencia y el banco.
