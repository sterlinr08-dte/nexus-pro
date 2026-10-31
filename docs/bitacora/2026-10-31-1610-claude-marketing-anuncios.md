# 2026-10-31 16:10 (RD) — Claude — Marketing: conectores, reportes por cliente y estrategia de campañas

> Entrada de **marketing** (anuncios de Meta, Instagram, precios de la competencia). No toca NEXUS PRO:
> sin cambios de código, Supabase, migraciones ni deploy.

## Pedido del dueño
- Desde ahora, **todo lo que se haga en marketing queda anotado en la bitácora**.
- Reporte diario **separado por cliente** (Bayol Cell, SL Celular Shop, Studio). Son clientes diferentes y sus cifras no se mezclan.
- Manejar todas las cuentas desde un solo conector para revisar, crear y modificar campañas.
- Trabajar las campañas de SL Celular Shop.

## Conectores (estado al 31-oct)
| Conector | Estado | Uso |
|---|---|---|
| Windsor.ai | **Plan Basic pagado** (mensual, US$23), cuenta `sterlinr08@gmail.com` | Lectura y escritura de anuncios de Meta en todas las cuentas, más Instagram público |
| Meta Ads (MCP) | Bayol y Navarrete sí; **SL bloqueada** por Meta («se habilita de forma gradual»); Studio ya no aparece | Apoyo para Bayol |
| Supermetrics | Prueba vencida el 23-oct | Sin uso |
| Firecrawl | Créditos bajos | Solo como respaldo |

- **Windsor, Meta Ads:** cuentas 988971888850978 (Bayol), 2042534513118769 (Bayol Navarrete), 1570989400521001 (SL), 1467569175031161 y 1784394786159387 (Studio), y otras.
- **Windsor, Instagram Public:**
  - clientes, conectados con permiso de administrador: `bayolcell`, `slcelularshop` y `studio__rd` (este último con el segundo perfil de Facebook del dueño);
  - competencia, como cuentas seguidas: `deorocell` y `reystoremoca`.
- **Límite del plan Basic:** 3 fuentes y 75 cuentas, **sin refresco inmediato**; Windsor actualiza los datos cada pocas horas.

## Precios de la competencia
- El catálogo web de deorocell.com está **desactualizado** (confirmado por el dueño). **No usarlo.**
- Los precios reales salen de los posts de Instagram de @deorocell y @reystoremoca, leídos con Windsor (`media_caption`; si el precio está en la foto, se lee `media_url`).
- **Retiro la propuesta de precios del 30-oct** (subir el 16 PM a 49,990, etc.), porque se basó en ese catálogo viejo.
- Primeros datos reales:

| Competidor | Equipo | Precio | Bayol |
|---|---|---|---|
| De Oro | 14 PM | 28,990 (oferta de sábado y domingo, sin capacidad indicada) | 30,990 (128 GB) |
| De Oro | 15 Plus 128 | 26,990 (oferta de fin de semana) | 27,990 |
| Rey Store | 17 PM | 79,990 sellado / 67,990 suelto | — |

## Reporte diario (trigger `trig_017LZDubNfyDEKzx1wjT3w6p`, 7:48 a. m. RD)
Prompt actualizado: tres reportes separados (Bayol, SL y Studio), cada uno con sus anuncios y su Instagram. En el de Bayol, además, los precios de la competencia sacados de Instagram. Sigue siendo **solo lectura**: propone cambios, pero no los ejecuta.

## SL Celular Shop — diagnóstico (Windsor, últimos 30 días)
| Campaña | Presupuesto diario | Público | Gasto | Conversaciones | Costo por conversación |
|---|---|---|---|---|---|
| CELULARES (120220711089670238) | US$9.50 | Prov. Santiago, 18–65 años, con público automático (Advantage) | 315 | 888 | 0.35 |
| REPARACIONES (120220506402110238) | US$9.50 | Prov. Santiago, 18–60 años, sin público automático | 297 | 380 | 0.78 |

- **Anuncios:**
  - Video de Emili: 0.34.
  - Financiamiento: 0.36, con frecuencia de 2.66.
  - Batería y Pantalla: unos 0.60.
  - Tapa trasera video: 0.87.
  - **Tapa trasera IP Claude: 1.73, con CTR de 0.62 %** → propuesto pausarlo, o no pasarlo a la campaña duplicada.
- **Últimos 7 días:** 0.46 (la semana anterior: 0.50).
- El dueño dejó en **borrador** un duplicado de Reparaciones. Los borradores no se ven por API; se leen después de publicar.

## Estrategia de campañas del dueño (es estrategia, NO reglamento: el dueño verifica antes de empezar)
1. **Cada 2 meses** se duplica la campaña y **se apaga la original**.
2. Si la original tiene **más de US$10 diarios**, la nueva **arranca en US$8**.
3. La **primera semana no se toca**. Desde la segunda, se sube un **+5 % semanal** sobre la semana anterior, hasta **+30 %** sobre el arranque (con arranque de 8: 8.00 → 8.40 → 8.82 → 9.26 → 9.72 → 10.21 → tope 10.40).
4. Si hace falta subir presupuesto para conseguir más conversaciones, se usa esta misma escalera.

**Antecedente real (Bayol):** el 15-oct se apagaron las campañas viejas y se crearon nuevas. El costo por conversación bajó de **0.45** (3–9 oct) a **0.28** (últimos 7 días al 30-oct). La mejora también coincidió con anuncios nuevos y con campañas por zona.

**Nota técnica:**
- Según el dueño, Meta le informó que duplicar mantiene el aprendizaje.
- [Probable] Según la ayuda de Meta, el **conjunto** duplicado pasa otra vez por la fase de aprendizaje.
- Lo que sí se conserva son las señales de la cuenta y de la página.
- En la práctica, la estrategia funcionó en Bayol; se mide caso por caso.

## Pendiente (decisión del dueño)
- **SL:** las dos campañas tienen US$9.50, que no supera los US$10. Falta definir con qué presupuesto arranca la duplicada.
- **SL:** ¿pausar «Tapa trasera IP Claude»? ¿Mover presupuesto de Reparaciones a Celulares? Depende del margen de una reparación frente a la venta de un celular.
- **Bayol:** activar la campaña de seguidores (120252519900420594, en pausa); ponerle fecha a la rifa (hoy dice «a los 50K», con ~4,100 seguidores).
- **Studio:** cuenta de anuncios restringida por pago; Instagram con 3 posts en 14 días.

## Siguiente paso recomendado
Publicar los duplicados de SL **sin** «Tapa trasera IP Claude», apagar las originales el mismo día y medir 7 días contra la base: 0.46 en general, 0.35 en Celulares y 0.71 en Reparaciones (últimos 7 días).
