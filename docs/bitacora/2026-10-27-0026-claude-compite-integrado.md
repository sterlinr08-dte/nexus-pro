# 5 herramientas para competir de forma legal: integración (59.66)

**Dueño:**
- Sus clientes compiten contra negocios informales que no pagan impuestos.
- Se negó la parte de ocultar ventas o de usar la proforma para no facturar, porque es evasión fiscal.
- Se ofrecieron alternativas legales, y el dueño pidió: «Ponme 5 agentes muy buenos en programación para que me ayuden con esto».

## Ramas unidas en `claude/compite-integrado` (sobre `claude/pos-descuento-itbis`, 59.65 con «Cubrir 6 % del ITBIS»)

| # | Herramienta | Capa | Rama / commit | Base de datos |
|---|---|---|---|---|
| 1 | Margen por producto (Reportes, admin/gerente, solo lectura) | `parches-pos-margen.js` | compite-1-margen `47a0ce3` | no |
| 2 | Precios por cantidad (escalas «desde N») | `parches-pos-volumen.js` | compite-2-volumen `63d518a` | **PROPUESTA** `20261027100000_pos_precio_volumen_PROPUESTA.sql` (columna `pos_productos.precio_volumen` jsonb). Sin ella, la ficha avisa y la caja vende igual. |
| 3 | Clientes con RNC (oferta de crédito fiscal, borrador de WhatsApp sin envío, CSV) | `parches-pos-empresas.js` | compite-3-empresas `2e360bb` | no |
| 4 | Compra segura en el ticket y la factura (garantía, IMEI, NCF/QR) | `parches-pos-compra-segura.js` | compite-4-compra-segura `1386488` | PROPUESTA `20261027120000_pos_compra_segura_PROPUESTA.sql` (opcional; hoy se guarda por equipo) |
| 5 | Clientes que vuelven (frecuentes, por perder, una sola compra; sugerencia de % en la factura) | `parches-pos-fidelidad.js` | compite-5-fidelidad `1f090c0` | no |

- Choques: solo las líneas de carga en `index.html`; se resolvieron conservando todas.
- `parches-pos.js` se unió solo, con los ganchos de cada agente.

## Pruebas sobre la rama unida (servidor 8990, una por una)
- cubre6: 14/14
- ecf-caja: 59/59
- margen: 88/88
- volumen: 51/51
- empresas: 76/76
- compra-segura: 50/50
- fidelidad: 62/62
- **Total: 400/400.**

## Decisiones pendientes del dueño
1. **Botón «Abrir WhatsApp»:**
   - El agente 3 abre el WhatsApp del teléfono y esquiva el desvío al Buzón.
   - El agente 5 respeta el desvío, que manda al Buzón; con clientes del POS el Buzón da «no vinculado».
   - Hay que unificarlo.
2. **Aplicar la columna `precio_volumen`**, sin la cual la herramienta 2 no guarda.
3. (Opcional) Columnas de Compra segura para toda la empresa.
4. Publicar.

**Riesgo anotado por el agente 5:** en el tema oscuro de fábrica, algunos avisos de la factura se leen mal desde antes; no es de esta entrega.
