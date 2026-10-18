# 59.36–59.38 publicadas, y «custodia» en todo el sistema (59.39, sin publicar) — Claude

## Publicación (dueño: «Aplícalo y continúa»)
- Fast-forward de `claude/inicio-vidrio` a `main` (`dcf3a30..134506e`). Incluye:
  - 59.36: buscador en vidrio y ficha rápida;
  - 59.37: ventana de cobro rediseñada;
  - 59.38: textos profesionales en la ventana de cobro.
- **Verificado en vivo:** `https://nexusprord.com` sirve `APP_VERSION='59.38'`. El sha256 de `index.html` (`c3f47287…`) y el de `parches-seguros-base.js` (`a3395e26…`) son iguales a los de `main`.

## 59.39: el mismo término en todo el sistema (lo propuesto en la bitácora 1340)
- **Pantallas que cambiaron (solo texto):**
  - **Menú Contabilidad:** «Dinero en poder» → «**Custodia de fondos**». El título de la vista pasa de «DINERO EN PODER» a «CUSTODIA DE FONDOS».
  - **Vista de custodia:** «Dinero en poder de cada uno» → «Custodia de fondos por agente».
    - Subtítulo: «Quién custodia el dinero cobrado y por qué».
    - Tarjeta: «En su poder» → «En custodia».
    - Total: «En poder de todos · este ciclo» → «Total en custodia · este ciclo».
    - Ecuación: «= en poder de todos» → «= total en custodia».
    - Nota «Cómo se calcula»: «bajo custodia de quien lo recibió / del titular de la cuenta de destino».
    - Movimientos: «queda bajo su custodia», «sigue sumando a su custodia».
    - Detalle: «… = RD$ X bajo su custodia».
    - Nombre accesible de la tarjeta (aria-label).
  - **Inicio, «Cobranza por agente»:** «RD$ X en poder» → «RD$ X en custodia», también en el esqueleto.
- **Archivos:**
  - `index.html` (`APP_VERSION` pasa a `'59.39'`);
  - `scripts/qa-custodia.mjs`, `scripts/qa-inicio-glass.mjs`: los textos que revisan.
- **Sin cambios:** cifras, RPC (`seguros_resumen_ciclo_admin`), cálculos, Supabase. Los comentarios internos del código que dicen «en poder» se dejaron como están: no se ven.
- **No revisado aquí:** los mensajes de WhatsApp del reporte diario los arma la base. No se encontró «en poder» en `supabase/migrations` ni en `supabase/functions`.
- **Pruebas:**
  - `qa-custodia.mjs`: **68 PASS · 0 FAIL**;
  - `qa-inicio-glass.mjs`: **129 PASS · 0 FAIL**;
  - `qa-registrar-pago.mjs`: **58 PASS · 0 FAIL**.
- **Publicación:** 59.39 NO publicada. Rama `claude/inicio-vidrio`. Esperar «publícalo».
