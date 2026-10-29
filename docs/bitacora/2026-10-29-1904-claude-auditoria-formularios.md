# Auditoría de formularios con la regla de espaciado

## Pedido del dueño (29-oct-2026)
> «Audita y confirma todos los formularios.»

## Cómo se hizo
- Se hizo sobre `origin/main` (lo que está en vivo), en una copia aparte.
- 3 revisores trabajaron a la vez, uno por sistema.
- Cada formulario se abrió en el simulador y se midió con Playwright (`getBoundingClientRect`) a 390 y 1280 px.
  - El simulador usa un usuario falso y Supabase simulado: no se usaron credenciales ni se escribió en la base.
  - Los que necesitan datos reales para abrirse se revisaron leyendo el CSS.
- La medida es la regla «Espaciado de formularios» de DESIGN.md más la regla de botones.
- Solo se leyó: no se cambió nada.

## Resultado
| Sistema | Formularios | Cumplen | Casi | No cumplen |
|---|---:|---:|---:|---:|
| NEXUS PRO | 74 | 0 | 1 | 73 |
| Bayol Cell | 74 | 1 | 2 | 71 |
| STUDIO | 60 | 0 | 0 | 60 |

Fallas comunes en los 3 sistemas:

| Qué falla | Hoy | La regla pide |
|---|---|---|
| Borde interior de la ventana | 14–21 px | 24/16 en celular · 48/40 en PC |
| Etiqueta → cajita | 3–5 px | 8 px |
| Botón principal | 32–44 px | 54 px |
| Campos | 32–42 px de alto | 48 px |
| Campo → campo | 9–16 px | 20 px |
| Cosas que se tocan | menos de 44 px | 44 px |

En STUDIO, además, la letra de los campos es de 12–13 px: en el iPhone la pantalla se acerca sola al tocarlos.

**Causa:** el estilo base de las ventanas es viejo y casi todas lo usan. Una sola capa nueva por sistema arreglaría la mayoría de una vez.

## Archivos
- Detalle de este sistema (NEXUS PRO), una fila por formulario con sus fallas y el arreglo sugerido:
  - `docs/auditorias/2026-10-29-formularios-espaciado.json`
  - `docs/auditorias/2026-10-29-formularios-espaciado.md`
- Informe de los 3 sistemas para el dueño: https://claude.ai/artifact/A6jMdNEnpAgZiFtn6vd7fi

## Límites
- Los íconos no cargaron en el simulador: los botones de solo ícono pueden variar 1–2 px.
- En NEXUS, la pantalla «Cobrar venta» del POS hay que medirla en vivo antes de tocarla.

## Siguiente paso
- El dueño elige cómo corregir: con una capa por sistema que se pueda apagar, formulario por formulario, o con una prueba primero.
- No se publica nada sin su «publícalo».
