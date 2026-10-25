# Plan para cobrarle la e-CF a cada cliente

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2` · solo lectura en la madre.

- **El dueño (25-oct-2026):** cada cliente tiene su certificado y su plan; si consigue más empresas, tiene que saber cuánto consumió cada una para cobrarle.
- **Auditoría:** ya existe «Clientes SaaS» (`saas_suscripciones` y `saas_pagos`).
  - Tiene 3 suscripciones de RD$1,200 cada una y 0 pagos.
  - Geriatra sigue activa aunque su base se borró.
- **MSeller** permite que el proveedor pague y cobre, y su panel muestra el consumo de cada cliente.
- **Borrador:** `docs/e-cf/PLAN-COBRO-ECF-CLIENTES.md`. Tiene 3 opciones (A, B y C, recomendada la C); el contador propio `saas_consumo_ecf` con cuadre mensual; el certificado siempre a nombre del cliente; y las fases.
- **Pendiente del dueño:** elegir la opción y el margen. No se tocó la base.
