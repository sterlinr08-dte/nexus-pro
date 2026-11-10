# Claude · Referencia de diseño: «Carga que no parpadea · Demora» (Moxen)

- **Pedido:** el dueño mandó el reel `https://www.instagram.com/reel/DffkNoXh1-f/` sin comentario (10-nov-2026).
- **Qué es:** patrón de carga con umbrales: nada antes de 0,3 s; esqueleto desde 0,3 s con mínimo de 0,5 s; aviso con «Cancelar» a los 4 s; «Reintentar» a los 15 s. Evita el parpadeo del «Cargando…» cuando la respuesta es rápida.
- **Qué se hizo:** se agregó la fila en `docs/REFERENCIAS-DISENO.md`, igual en los 3 proyectos (`nexus-pro`, `bayolcell-taller`, `studio-rd`). Solo documentación; no se copió código del recurso (es de pago).
- **Cómo se vio:** skill `ver-video-redes` (yt-dlp + mosaico de cuadros). El video no se guardó en el repo.
- **Sin implementar.** Siguiente paso, si el dueño lo pide: volverlo regla en `DESIGN.md` y aplicarlo módulo por módulo.
