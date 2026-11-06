# 06-nov-2026 · Ocultar «Comisiones» del menú (RAMA, sin publicar)

- Dueño: «oculta Comisiones». Los agentes no tienen comisión (regla de CLAUDE.md, 11-sep-2026).
- `index.html`: el renglón «Comisiones» del menú (Contabilidad) lleva `hidden` y `display:none`. La pantalla `#v-comisiones` y sus datos siguen ahí, pero ya no se llega desde el menú.
- El «Ir a…» del buscador nuevo (rama `claude/mejoras-inicio-menu`) no muestra lo que está oculto, porque solo lista las filas del menú que se ven.
- No se tocó: la sección «💼 Agentes/comisiones» del reporte por correo o WhatsApp (`parches-seguros-base.js:7992`). Es otra pieza; si el dueño quiere, se quita aparte.
- Volver atrás: quitar `hidden` y `display:none` de esa línea.
