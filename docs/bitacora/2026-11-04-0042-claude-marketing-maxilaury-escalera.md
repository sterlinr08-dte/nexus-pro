# 2026-11-04 00:42 (RD) — Claude — Maxilaury: presupuesto en US$10 y escalera +5 % semanal

## Decisión del dueño
- «Déjala en 10 y haz el aumento semanal de un 5% adicional hasta llegar al 30%».
- Campaña «OCTUBRE 2026» (52695059463884), presupuesto de campaña de US$10 diarios. **No se bajó a US$8.**

## Gasto real (Windsor, últimos 7 días)
- Campaña: US$77.44, unos US$11.06 al día.
- Publicación promocionada «Nuestra segunda y...»: US$37.06, unos US$5.29 al día. Es la **única** promocionada que gastó en la semana.
- Total: unos US$16.35 al día.
- **Corrección** a la entrada de conexión: no son 7 promocionadas gastando ahora, sino 1.

## Escalera (sobre la semana anterior, tope +30 % = US$13.00)
| Lunes | Diario |
|---|---|
| 9-nov | 10.50 |
| 16-nov | 11.03 |
| 23-nov | 11.58 |
| 30-nov | 12.16 |
| 7-dic | 12.76 |
| 14-dic | 13.00 (tope; ahí termina) |

## Cómo se ejecuta
- **Tarea programada** «Maxilaury: subida semanal de presupuesto +5%» (`trig_01W23aPgMsHf2YwSB2Aiweha`), lunes a las 8:21 a. m. RD.
- Usa Windsor `set_campaign_budget`.
- **No sube si:**
  - el costo por conversación de 7 días pasa de US$0.70 (base de octubre: US$0.47);
  - alguien ya cambió el presupuesto a mano.
- En esos casos avisa al dueño.
- Cada subida deja su entrada en la bitácora. Al llegar al tope se deshabilita.
