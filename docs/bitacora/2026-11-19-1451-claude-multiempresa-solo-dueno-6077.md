# 19-Nov-2026 14:51 (RD) — Claude — La pantalla Multiempresa solo abre para el dueño (6077)

## Pedido
- Tras la 6076, el dueño respondió: «Sí, ciérrala solo para mí».

## Cambios
- `parches-financiamiento.js`:
  - `esDueno()`, también como `window.nxEsDuenoSistema`: llama `rpc/mi_es_superadmin` una vez y guarda la respuesta. Si la consulta falla, no la guarda y vuelve a preguntar.
  - `nxAbrirMultiempresa` ahora es `async` y solo abre si el dueño está confirmado.
    - Si no: aviso «Acceso restringido · Solo el dueño del sistema».
    - Si no había ninguna pantalla abierta (por ejemplo, al restaurar «dónde me quedé»), vuelve a Inicio.
  - Al abrirse, marca `#niMultiM2` en el menú nuevo.
  - La tarjeta `#qaMultiempresa` del tablero también sale solo para el dueño.
- `parches-menu-dos-niveles.js`: el botón ya no marca nada por su cuenta (lo hace `nxAbrirMultiempresa`).
- `parches-seguros.js`: `b=6076` → `b=6077`.

## Efecto en otros administradores
- No ven ni abren Multiempresa.
- Los botones «Volver a Multiempresa» de Financiamiento, Vehículos, Rifas y el Punto de venta del administrador les dan el aviso y se quedan donde están.
- Esos módulos no se cerraron. Solo la pantalla Multiempresa.

## Seguridad
- El cierre es en la pantalla y se apoya en la respuesta del servidor (`mi_es_superadmin`).
- Los datos de cada módulo siguen protegidos por sus propias reglas en la base (RLS). Eso no cambió.

## Pruebas (servidor de prueba local; `mi_es_superadmin` simulado)
| Caso | Llamada directa | Tarjeta del tablero | Menú, sección Inicio |
|---|---|---|---|
| Dueño | Abre Multiempresa | Sí | Inicio y Multiempresa; al tocar, abre y queda marcada |
| Otro administrador | «Acceso restringido · Solo el dueño del sistema»; se queda en Inicio | No | Solo Inicio |
- Sin errores de consola.
- `qa-menu-dos-niveles` en verde.

## Estado
- Rama `claude/multiempresa-solo-dueno`. Espera el «Publícalo».
