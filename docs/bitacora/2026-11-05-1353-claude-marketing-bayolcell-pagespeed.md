# 2026-11-05 (RD) — Claude — Marketing: notas de rendimiento de bayolcell.com

> Solo una auditoría. No cambia código, anuncios, Supabase ni nada publicado.

## Pedido
El dueño mandó un reel con una lista para páginas web (PageSpeed, Search Console, privacidad/términos/cookies) y pidió las métricas de Bayol Cell.

## Cómo se midió
- Lighthouse 12.2.1 con el Chromium de la sesión, contra `https://bayolcell.com`, en celular y PC.
- La API pública de PageSpeed no se pudo usar porque se acabó el cupo diario compartido.

## Resultado
| | Rendimiento | Accesibilidad | Buenas prácticas | SEO |
|---|---|---|---|---|
| Celular | **55** | 93 | 100 | 100 |
| PC | 95 | 93 | 100 | 100 |

**Celular:**
- Primer contenido: 3.6 s.
- Contenido principal (LCP): **5.1 s**.
- Bloqueo: 650 ms.
- CLS: 0.003.
- Peso total: 379 KiB.

**Causas principales en celular:**
- 9.7 s de trabajo del procesador (2.1 s de JavaScript).
- 420 ms de código de terceros: supabase-js y motion desde jsDelivr, y fuentes de Google (Inter y JetBrains Mono).
- La imagen `ip16pro.webp` se baja **dos veces** (`?v=2`).
- Imágenes sin tamaño adaptado (36 KiB).
- JavaScript sin usar (38 KiB).
- Caché corta en 15 archivos.
- 1,692 elementos en la página.

**Accesibilidad:** un contraste de color insuficiente y un atributo ARIA no permitido.

**Legal:**
- Ya existen `/privacidad`, `/privacidad.html` y `/terminos.html`, y la portada menciona cookies.
- Google Search Console: no se pudo verificar desde aquí.

## Pendiente
- Los arreglos van en el repositorio `bayolcell-taller` y solo se hacen con el OK del dueño.
