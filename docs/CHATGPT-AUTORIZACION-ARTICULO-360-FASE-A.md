# ChatGPT → Claude — autorización Fase A Artículo 360°

**Fecha:** 2026-08-10

El dueño autoriza avanzar con la recomendación revisada para **Artículo 360° — Fase A**, bajo estas condiciones estrictas:

- Implementar **solo Fase A**.
- Trabajar en **rama separada**; no tocar `main` funcional.
- **No publicar**, no versionar, no crear release y no aplicar nada en producción.
- **No tocar SQL ni Supabase** en esta fase.
- Alcance funcional: `window.nxArticulo360(id)` + helper mínimo `window.nxArt360Tab(key)` si hace falta; no refactorizar todavía Kardex duplicado fuera de esta vista.
- Mantener las consultas actuales de `nxArticulo360` salvo ajustes estrictamente visuales necesarios para distribuir contenido entre pestañas.
- 5 pestañas: **Resumen / IMEI-Seriales / Kardex / Almacenes / Historial**.
- `IMEI/Seriales` solo si `p.serial===true`.
- `Almacenes` solo si `_almacenes.length>1`.
- `Editar` debe reutilizar `window.nxPosEditProd(id)` / `abrirProd(p)`; no crear otra edición.
- No agregar Imprimir/Compartir si no existe helper estable ya confirmado.
- No mostrar “Calidad de datos”, ubicación física ficticia, `pos_seriales.email` ni métricas sin fuente real.

## Decisión de permisos aprobada

El dueño aprueba introducir la protección de información sensible:

- **Costo, utilidad, margen y cualquier KPI derivado de costo** deben mostrarse solo a roles `admin` y `gerente`.
- Para `cajero`, `vendedor` u otros roles no autorizados, esos bloques simplemente **no se renderizan**; no mostrar cero, guiones ni placeholders que revelen estructura sensible.
- Puedes reutilizar el criterio de roles de `puedeVerMin()` si es el helper real que representa `admin/gerente`; si prefieres no ampliar semánticamente ese helper, crea un helper mínimo y explícito solo para esta vista (por ejemplo `puedeVerCosto360()`), sin alterar permisos globales existentes.
- No cambies el comportamiento de otras pantallas (`renderProductos`, `abrirProd`, etc.) en esta Fase A.

## Referencia visual

Usa como referencia el mockup visual que el dueño te adjuntó directamente en el chat. La imagen define **composición, jerarquía, densidad, distribución PC/móvil y estilo**, pero la auditoría técnica manda sobre cualquier dato ficticio que aparezca en la imagen.

## Entregable antes de cualquier merge/publicación

Cuando termines la Fase A en la rama separada, deja:

1. nombre de la rama;
2. commit SHA;
3. diff exacto contra `main`;
4. funciones/rangos tocados;
5. confirmación de que no hubo SQL/Supabase/versionado;
6. resultados de `node --check parches.js` y demás chequeos de sintaxis relevantes;
7. descripción de cómo se comporta en desktop y móvil;
8. cualquier diferencia inevitable respecto al mockup por datos/funciones reales.

No fusiones ni publiques hasta revisión final del dueño + ChatGPT.