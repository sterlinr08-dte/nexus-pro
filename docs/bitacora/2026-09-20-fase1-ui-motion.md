# 2026-09-20 — Fase 1: base visual y movimiento transversal

## Alcance

Se añade una capa CSS final y aislada para unificar el acabado de NEXUS PRO sin tocar Supabase, datos, permisos, navegación ni funciones existentes.

## Cambios

- Fondo operativo Niebla Azul y superficies blancas con profundidad sobria.
- Tablas y contenedores operativos con bordes, radios y hover consistentes.
- Foco visible para teclado y accesibilidad.
- Presión táctil estable: evita escalados que causan saltos en Safari/iOS.
- Utilidades `nx-ui-enter` y `nx-skeleton` para que los módulos adopten transiciones y carga real progresivamente.
- Scrollbar ligero y modo `prefers-reduced-motion`.
- Móvil: controles con objetivo táctil mínimo de 44 px y contenedores sin desbordamiento accidental.

## Límites

No se cambian datos, lógica, cobros, filtros, mensajes, Zernio, webhooks, Supabase, iconos existentes ni GitHub Actions.