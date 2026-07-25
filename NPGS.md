# NEXUS PRO GLOBAL STANDARDS (NPGS)

**Design System · UX/UI · Development Standards · Engineering Rules**

---

## PRIORIDAD MÁXIMA

Este documento es la **máxima autoridad** del proyecto NEXUS PRO.

Antes de analizar, diseñar, modificar o escribir una sola línea de código, debes leer y cumplir
todas las reglas descritas aquí.

Estas reglas tienen prioridad sobre cualquier decisión propia. No puedes ignorarlas, modificarlas
ni sustituirlas, salvo autorización expresa del propietario del proyecto.

**Si alguna implementación contradice este documento, debes detenerte, explicarlo y proponer una
solución que cumpla el estándar.**

El objetivo es que todo NEXUS PRO parezca desarrollado por el mismo equipo, tenga la misma
experiencia de usuario y mantenga una calidad comparable con software de clase mundial.

> **Relación con `CLAUDE.md`:** NPGS manda en **cómo se diseña y se construye** (estándar de
> calidad, UX, componentes). `CLAUDE.md` guarda **qué es NEXUS PRO** (el contexto del negocio, el
> historial de decisiones, el esquema real de la base, el flujo de publicación). Los dos se leen
> siempre; no se sustituyen entre sí. Donde NPGS fije un estándar de diseño, NPGS gana. Donde
> `CLAUDE.md` documente un hecho del sistema (una tabla, un bug ya resuelto, una decisión que el
> dueño ya tomó), ese hecho no se inventa de nuevo.

---

## 1. FILOSOFÍA DEL SISTEMA

NEXUS PRO no debe parecer un sistema tradicional. Debe sentirse como un software SaaS moderno
inspirado en: **Stripe · Shopify · Linear · Notion · Apple · Raycast · Arc Browser ·
Revolut Business**.

Todo debe transmitir: simplicidad · velocidad · consistencia · profesionalismo · elegancia.

---

## 2. DISEÑAR ANTES DE PROGRAMAR

Antes de escribir código debes:

1. Analizar el flujo completo.
2. Pensar la experiencia del usuario.
3. Diseñar la interfaz.
4. Validar la distribución.
5. Solo después comenzar la programación.

**Nunca programar primero.**

---

## 3. BOTONES

Está **prohibido** crear botones gigantes, largos, desproporcionados o con exceso de padding.

| Tipo | Altura |
|---|---|
| Normal | 40 px |
| Principal | 44 px |
| Pequeño | 34 px |

Los botones **nunca** deben ocupar todo el ancho, salvo que la experiencia realmente lo requiera.

---

## 4. POSICIÓN DE BOTONES

| Acción | Posición |
|---|---|
| Guardar | Abajo derecha |
| Cancelar | Abajo izquierda |
| Editar | Parte superior derecha |
| Eliminar | Nunca junto a Guardar. Requiere confirmación |
| Volver | Siempre arriba izquierda |
| Cerrar (X) | Siempre esquina superior derecha |
| Imprimir | Siempre junto a Compartir |
| Compartir | Siempre junto a Imprimir |
| Exportar | Siempre agrupado |

**No mover estas posiciones entre módulos.**

---

## 5. BUSCADORES

Todos los buscadores del ERP deben comportarse igual.

Siempre mostrar únicamente: **🔍**

Al hacer clic: **abrir una ventana flotante de búsqueda.** Nunca buscar directamente desde una
barra fija.

La ventana debe incluir: Buscar · Recientes · Favoritos · Filtros · Resultados.

**Queda prohibido crear buscadores diferentes para cada módulo.**

---

## 6. NO DUPLICAR FUNCIONES

Nunca crear dos botones, dos menús, dos acciones ni dos ventanas que hagan exactamente lo mismo.
Debe existir **una única forma correcta** de realizar cada acción.

---

## 7. VENTANAS

Las ventanas deben ser compactas, equilibradas y profesionales.

Nunca excesivamente anchas. Nunca demasiado altas. Nunca llenar la pantalla sin necesidad.
Reducir espacios vacíos. La información debe verse concentrada y fácil de leer.

---

## 8. FORMULARIOS

Los formularios deben mostrar únicamente la información necesaria. Los campos avanzados deben
aparecer únicamente cuando sean requeridos. **No mostrar veinte campos desde el inicio.**

---

## 9. TABLAS

Todas las tablas deben incluir: Buscar · Filtros · Ordenar · Seleccionar columnas · Exportar ·
Paginación · Selección múltiple · Acciones agrupadas.

**Nunca llenar la pantalla de botones.**

---

## 10. ACCIONES

Si existen muchas acciones, agruparlas dentro del menú **⋮ Más acciones**: Duplicar · Compartir ·
Exportar · Imprimir · Historial · Auditoría.

**No llenar la interfaz de botones.**

---

## 11. COLORES

No abusar del rojo.

| Color | Significado |
|---|---|
| Rojo | Acciones principales · Errores · Alertas · Eliminar |
| Verde | Correcto · Pagado · Finalizado |
| Azul | Información |
| Amarillo | Advertencia |
| Morado | Funciones IA |

Los colores deben tener significado. **Nunca decorar solamente.**

---

## 12. CONSISTENCIA

Todo el ERP debe compartir exactamente: tipografía · iconos · botones · sombras · bordes ·
animaciones · tablas · buscadores · formularios · espaciados.

**El usuario nunca debe sentir que cambió de sistema.**

---

## 13. ESPACIOS

No desperdiciar espacio. Cada píxel debe aportar información. Reducir espacios vacíos, tarjetas
gigantes, formularios enormes y ventanas innecesarias.

---

## 14. JERARQUÍA VISUAL

Mostrar primero: **Estado · Nombre · Monto · Acciones · Información secundaria**.

La información importante debe verse en menos de cinco segundos.

---

## 15. DASHBOARD

Todo módulo importante debe iniciar mostrando indicadores. **Nunca abrir directamente una tabla.**
Mostrar siempre KPI relevantes.

---

## 16. CONFIGURACIÓN

Todo módulo nuevo debe tener su propia configuración. Como mínimo: Permisos · Campos · Estados ·
Notificaciones · Plantillas · Impresión · Automatizaciones · Integraciones · Variables ·
Numeración · Auditoría · Personalización.

---

## 17. IMPRESIÓN Y COMPARTIR

Todo módulo que genere documentos debe incluir: **Imprimir · Compartir · Exportar · PDF**.

**Nunca implementar una sola opción.**

---

## 18. RESPONSIVE

Todo módulo debe funcionar correctamente en Desktop · Laptop · Tablet · Móvil.

No crear diseños diferentes. Debe existir **un único diseño adaptable**.

---

## 19. IA

Antes de finalizar un módulo debes preguntarte: **¿Qué puede hacer la Inteligencia Artificial
aquí?** Siempre evaluar: predicciones · automatización · autocompletar · recomendaciones ·
análisis.

---

## 20. AUDITORÍA

Toda acción importante debe registrar: Usuario · Fecha · Hora · Sucursal · Antes · Después.

---

## 21. RENDIMIENTO

Nunca cargar información innecesaria. Usar: Lazy Loading · Paginación · Carga progresiva ·
Cache inteligente · Virtualización.

---

## 22. MICROANIMACIONES

Las animaciones deben durar aproximadamente **200–300 ms**. Nunca exageradas. Solo mejorar la
experiencia.

---

## 23. MENOS ES MÁS

Antes de agregar cualquier botón o función debes preguntarte:

- ¿Es realmente necesaria?
- ¿Ya existe otra que haga lo mismo?
- ¿Puede resolverse con menos clics?
- ¿Mejora la experiencia?

Si la respuesta es NO, **no implementarla**.

---

## 24. CHECKLIST OBLIGATORIO

Antes de dar cualquier tarea por terminada debes verificar:

- ☑ No existen botones gigantes.
- ☑ No existen funciones duplicadas.
- ☑ Los buscadores cumplen el estándar.
- ☑ Guardar, Cancelar, Editar, Eliminar, Volver y Cerrar están correctamente ubicados.
- ☑ Las ventanas son compactas.
- ☑ El diseño mantiene la identidad del ERP.
- ☑ Los colores siguen la guía oficial.
- ☑ El módulo es consistente con el resto del sistema.
- ☑ La experiencia es comparable con software SaaS de clase mundial.
- ☑ La implementación respeta todas las reglas de este documento.

---

## REGLA FINAL

Nunca tomes decisiones de diseño por conveniencia técnica. Si una solución es más fácil de
programar pero ofrece una peor experiencia de usuario, debes proponer primero la mejor experiencia
posible y luego buscar la forma correcta de implementarla.

**El objetivo de NEXUS PRO es ser un ERP de clase mundial, no simplemente un software funcional.**

---

*Decretado por el propietario del proyecto el 25-jul-2026.*
*Estado de cumplimiento del sistema actual y plan de convergencia: ver `DESIGN_SYSTEM.md`.*
