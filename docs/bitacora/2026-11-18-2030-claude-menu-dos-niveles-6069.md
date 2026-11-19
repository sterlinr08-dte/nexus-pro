# 18-nov-2026 20:30 (RD) — Claude — Menú de dos niveles (estilo 7), versión 6069

## Pedido del dueño
- Reel `Df5TYQDoAQ3` (8 estilos de menú lateral): «el número 7 para nexus pro y el 5 para el taller».
- «Hazlo uno uno». Primero NEXUS PRO.
- Vio la muestra en oscuro y en blanco (modo claro) y dijo: «Sí, pásalo al sistema».

## Qué había
- En PC, el menú era una columna de iconos sin nombres (`nav#sbEl`, 76 px) que se expandía flotando.
- Contabilidad y Configuración eran listas largas que se desplegaban.
- En el celular, el cajón ☰ mostraba una sola lista.
- El Punto de venta de las tiendas tiene su propia columna (`nxTShell`/`nxTSide`); no se tocó.

## Qué se hizo
**Capa nueva `parches-menu-dos-niveles.js`** con su CSS en `index.html` (`style#nxMenu2`, primer pintado) y `<nav id="nxM2">` junto al menú de siempre.
- A la izquierda, un riel de iconos de secciones:
  - Inicio;
  - Seguros (Facturas, Clientes, Solicitudes, Pólizas);
  - Mensajes (WhatsApp, CRM);
  - Contabilidad (Mayor, Diario, Balance, P&G, DGII/ARS);
  - Reportes (Agente, Custodia, Plan, Empresa, Aging);
  - Configuración (13 páginas);
  - «Más», solo si algún botón no tiene sección.
- Al lado, la columna con las páginas de la sección elegida: título y subtítulo, botón «Buscar» (el mismo ⌘K) y la tarjeta del usuario (mismo toque = cerrar sesión).
- **No duplica lógica:**
  - lee los botones del menú de siempre (`#sbNav .ni`), que sigue en la página escondido por CSS;
  - al tocar una página hace `.click()` sobre ese botón (mismos `nav()`, `navConfig()`, permisos y contadores);
  - un botón escondido por rol no aparece, y la sección sin páginas tampoco;
  - Contabilidad y Configuración cuentan solo si su encabezado está visible.
- Tocar una sección solo cambia la lista. Si tiene una sola página (Inicio), la abre.
- Si la pantalla cambia por otro camino, la columna se va a la sección de esa pantalla.
- Punto rojo en la sección cuando una de sus páginas tiene contador (ej. Solicitudes pendientes).
- En el celular, las mismas dos columnas dentro del cajón ☰. Sigue a `mob-open` de `nav#sbEl`, así que se cierra con el fondo oscuro o al elegir. Paneles casi sólidos para que la pantalla de atrás no se mezcle.
- Oscuro (cristal grafito) y claro (paneles blancos). Elegido: fondo azul suave y barra azul a la izquierda.
- Solo empresas de seguros. En `org-tienda`, `org-rifa` y `org-consultorio` sigue el menú de siempre.
- Se esconde la marca de luz `nx-luz` dentro del menú, y se quitan las mayúsculas globales.

**Otros archivos**
- `parches-seguros.js`: `b=6068` → `b=6069`.
- Pruebas:
  - nueva `scripts/qa-menu-dos-niveles.mjs`;
  - `scripts/qa-menu-cristal.mjs` ahora prueba el menú anterior con `nx_m2_off=1`;
  - `scripts/qa-inicio-menu.mjs` no exige el chevron del menú anterior cuando el nuevo está activo.

**Apagar:** `localStorage.setItem('nx_m2_off','1')` y recargar (vuelve el menú anterior).

## Pruebas (app real contra `scripts/qa-crm-mock-server.js`)
- `qa-menu-dos-niveles`: **58/58**, en oscuro y claro, a 1440 y 390 px:
  - dos columnas (72 + 236 px) y el contenido no queda tapado;
  - secciones del admin completas;
  - tocar una sección no navega; Clientes, Balance y Usuarios abren y quedan marcados; Inicio abre directo;
  - sin permiso de Contabilidad la sección desaparece;
  - punto rojo de pendientes; Buscar abre la búsqueda;
  - toques ≥ 44 px; sin scroll horizontal;
  - en el celular: el ☰ abre, Pólizas navega y cierra, tocar fuera cierra;
  - apagado vuelve el menú anterior;
  - sin errores de consola.
- `qa-menu-cristal` (menú anterior, apagado el nuevo): 67/67, igual que en `main`.
- `qa-inicio-menu` (buscador «Ir a…», que lee los mismos botones): 86/86.
- Punto de venta abierto por el administrador (tiene su propia columna `#nxTSide`): en PC queda solo el riel (clase `m2-solo`), sin tres columnas.
  - Tocar una sección desde ahí abre su primera página y vuelven las dos columnas.
  - Incluido en `qa-menu-dos-niveles`, que queda en **62/62**.
- Comparadas contra `main` (mismas pruebas, mismo servidor):
  - `qa-iphone`: el cajón ☰ ahora se mide sobre el menú nuevo y pasa.
  - `qa-iphone`: queda 1 falla («búsqueda: campo entero a todo el ancho»), igual en `main`.
  - `qa-modo-claro`: corre con el menú anterior (`nx_m2_off`). Sus 7 fallas (390 cobros y la ventana Nuevo cliente) salen igual en `main`.
  - `qa-claro-modulos`: las fallas de contraste del Punto de venta («PAGADA», «Bajo: 1 und», la versión al pie de `#nxTSide`, el buscador de la prefactura) ya estaban en `main`.
  - `qa-claro-modulos`: el único texto nuevo con poco contraste era el «Buscar» del menú nuevo en claro (4,29:1). Se corrigió a `#334155`.

## Estado
- Rama `claude/menu-dos-niveles`. Sin publicar; espera el «Publícalo» del dueño.
- Pendiente:
  - el estilo 5 en el taller (`bayolcell-taller`), en su propia entrega;
  - la columna propia del Punto de venta de las tiendas se podría igualar a este diseño más adelante.
