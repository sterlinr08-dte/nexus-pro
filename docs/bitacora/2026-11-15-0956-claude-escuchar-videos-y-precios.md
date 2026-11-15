# 15-nov-2026 — Claude — Escuchar videos (transcripción) y referencia de página de precios

**Pedido del dueño:** antes de arrancar la demo del POS, ver el reel `https://www.instagram.com/reel/Dftu0gdDtuT/` y escucharlo; «qué te hace falta para escuchar».

## Qué se hizo
- Se bajó el reel con yt-dlp (skill `ver-video-redes`), mosaico de cuadros y audio.
- **Ahora sí se puede escuchar:** `faster-whisper` (gratis, local, sin cuentas) instalado en el scratchpad transcribió el audio completo. Error encontrado y resuelto: `pip` instala para Python 3.13 y `python3` es 3.11 → usar `python3 -m pip`.
- Se agregó la sección «Escuchar lo que dicen» a `.claude/skills/ver-video-redes/SKILL.md`.
- `docs/MEMORIA.md`: decisiones del dueño sobre el POS estándar.

## Contenido del reel (cuenta saas_in_house): página de precios en 6 bloques
1. **Ancla:** un plan caro (249) para que el del medio (79) parezca razonable; subir el de entrada (19→29).
2. **El del medio destacado:** más grande, borde de color, etiqueta «El más elegido».
3. **Para quién es** debajo de cada plan (para ti solo / equipos hasta 5 / empresas de más de 20): nadie lee funciones.
4. **Función barrera:** una sola función de uso diario (p. ej. informes) solo desde el plan del medio.
5. **Mensual o anual con el ahorro en dinero** («ahorras 158», «2 meses gratis»), no en porcentaje.
6. **Frase que quita el miedo** debajo del botón: «Sin permanencia. Cancela en un clic».

## Decisiones del dueño sobre el POS estándar (15-nov-2026)
Solo RD; tienda general primero; registro por la web; nombre comercial NEXUS PRO. Motivo: los interesados piden demo. Propuesta aceptada en principio: demo primero en `demo.nexusprord.com`; falta su «arranca».

## Estado
Solo documentación y skill. Sin cambios en el sistema ni en la base. Los precios del reel son un ejemplo en euros; los precios reales de NEXUS PRO los decide el dueño.
