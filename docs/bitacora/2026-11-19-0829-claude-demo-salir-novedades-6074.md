# 19-Nov-2026 08:29 (RD) — Claude — La demo sale a «Entrar a la demo»; novedades sin sesión (6074)

## Prueba de Muse (6073, iPhone, demo de la tienda)
- **Anular factura: aprobado.**
  - Sale la ventana de NEXUS PRO.
  - «No» no cambia nada.
  - «Sí, anular» anula la factura, devuelve el stock (119 → 120) y revierte la contabilidad.
- **Sombra del cajón: no la vio.**
  - En su pantalla la lista completa cabe sin desplazar.
  - La sombra solo sale cuando quedan opciones abajo (verificado a 664 px de alto), así que se comporta como debe. Sin cambio.
- **Cerrar sesión: parcial.**
  - La ventana y «Seguir aquí» funcionan.
  - Al confirmar, iba a la pantalla de usuario y clave y no a la de la demo. Ya era así antes de la 6072.
  - Además salía el aviso «No se pudieron cargar las novedades / The string did not match the expected pattern».

## Causa
- `logout()` hacía `location.reload()` y siempre caía en la pantalla de entrada normal.
- `parches-clientes-novedades.js` llama `cargar()` al instalarse, aunque no haya sesión ni sea una empresa de seguros.
  - Sin sesión, Safari rechaza la consulta (cabecera vacía) y salía el aviso rojo.

## Cambios
- `index.html`, `logout()`: si la empresa es la demo (`sesion.org.slug === 'demo'`) y el cierre es del usuario, va a `/demo`. El cierre forzado y las demás empresas siguen igual.
- `parches-clientes-novedades.js`: `puedeCargar()`.
  - No carga sin sesión.
  - No carga si la empresa no es de seguros (por `sesion.org.tipo`, la clase `org-*` o `nx_org_tipo` guardado).
- `parches-seguros.js`: `b=6073` → `b=6074`.

## Pruebas
- Demo en vivo con los archivos nuevos (iPhone 13 simulado):
  - dentro de la tienda, 0 consultas de novedades (antes, 1);
  - «Cerrar sesión» → `/demo` con el botón «Entrar a la demo»;
  - sin avisos ni errores.
- Seguros (servidor de prueba local): las novedades cargan al arrancar (1) y al abrir la pestaña (1); sin errores.
- No verificado en Safari: el mensaje exacto «The string did not match…» es de Safari, y aquí solo hay Chrome.

## Estado
- Rama `claude/demo-salir-novedades`. Espera el «Publícalo».
