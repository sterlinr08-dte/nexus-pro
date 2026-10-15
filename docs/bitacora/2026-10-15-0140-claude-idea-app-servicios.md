# 2026-10-15 01:40 — Claude — Idea en pausa: app de iPhone para servicios técnicos a domicilio

- Origen: el dueño mandó un reel sobre **xtool** (github.com/xtool-org/xtool: compilar, firmar e instalar apps de iPhone en SwiftPM desde Linux/Windows). No es referencia de diseño; no se agregó a `docs/REFERENCIAS-DISENO.md`.
- Límites explicados al dueño:
  - el iPhone debe estar conectado a la PC donde corre xtool (no se puede desde la sesión en la nube) y la primera vez pide bajar Xcode con la cuenta de Apple;
  - con cuenta gratis la app se vence a los 7 días y hay un máximo de 3 apps;
  - para técnicos y clientes hace falta la cuenta de desarrollador de Apple (US$99/año).
- Lo que respondió el dueño:
  - **para quién:** su propio negocio de servicios (sus técnicos);
  - **servicios iniciales:** aires acondicionados, electricidad y plomería, electrodomésticos, celulares y equipos;
  - **formato:** app de iPhone desde el inicio.
- Primera versión propuesta:
  - cliente: elige el servicio, describe con fotos, ubicación y fecha, sigue el estado y recibe avisos;
  - técnico: trabajos del día, mapa, «llegué / terminé» con foto y registro del cobro;
  - administrador: solicitudes, asignación y cobrado del día.
- Decisiones pendientes:
  1. nombre de la marca;
  2. repositorio nuevo + proyecto Supabase nuevo (posible costo de unos US$10/mes) o usar el de Bayol;
  3. cómo compilar: PC con xtool o Mac.
- **Estado: en pausa por decisión del dueño («Vamos a dejarlo para después», 15-oct-2026).** No se creó nada.
