# 59.39 publicada y anillos del ciclo en el Inicio (59.40, sin publicar) — Claude

## 59.39 publicada (dueño: «Publicar y continuar»)
- Fast-forward de `claude/inicio-vidrio` a `main` (`134506e..466edd2`): «custodia» en todo el sistema.
- `https://nexusprord.com` sirve `APP_VERSION='59.39'`. El sha256 de lo publicado es igual al de `index.html` en `main`.

## 59.40: Inicio en vidrio, parte 4 (anillos del ciclo 20 → 20)
- **La meta:** el dueño no la había definido todavía. Revisando el código, ya existía una **«Meta cobros»** en Configuración → Metas mensuales (`localStorage.nx_metas.cobros`), que usaba la barra de «Ciclo actual».
  - El anillo usa esa meta cuando está puesta.
  - Si no, usa la **prima mensual de la cartera activa** (`d.prima`, la misma cifra de la columna derecha).
  - El rótulo dice cuál usa («Cobrado (meta)» o «Cobrado (prima)») y al pasar el mouse muestra «RD$ X de RD$ Y».
- **Tres anillos dentro de «Ciclo actual»,** en lugar de la barra (solo con la capa `#nxInicioPane`):
  1. **Cobrado:** `c.cobCiclo`, el mismo «cobrado en el ciclo», contra la meta o la prima.
  2. **Clientes al día:** `alDia / act`, los mismos del KPI «Clientes activos».
  3. **Días del ciclo:** día X de N. Si el 1 va por detrás del 3, el ciclo va atrasado.

  No hay consultas nuevas ni cálculos nuevos: solo se dibujan cifras que ya existían.
- **Archivo `index.html`:**
  - esqueleto `#nxIGani` con su SVG y la leyenda (alto fijo desde el primer cuadro);
  - función `nxIGAnillos()`, alimentada desde `nxIGPintar()` y `nxIGCiclo()` (`_nxIG.ani`);
  - CSS en `#nxInicioPane`. Si la tarjeta mide menos de 330 px, los anillos van arriba y la leyenda debajo;
  - corrección: «Faltan 1 día» pasa a «Falta 1 día»;
  - `APP_VERSION` pasa a `'59.40'`.
- **Pruebas:**
  - `qa-inicio-glass.mjs`: **129 PASS · 0 FAIL**, sin saltos del esqueleto a los datos.
  - Comprobación propia: 19,000 / 36,000 = 53 %, 4 de 8 al día, día 29 de 30. Los anillos dibujan exactamente esos porcentajes, en claro (390) y glass oscuro (1280), sin errores.
- **Pendiente del dueño:** confirmar si la meta debe ser la prima mensual de la cartera activa o un monto fijo. Para un monto fijo basta escribirlo en Configuración → Metas mensuales → «Meta cobros», y el anillo lo toma solo.
- **Publicación:** NO publicado. Rama `claude/inicio-vidrio`. Esperar «publícalo».
