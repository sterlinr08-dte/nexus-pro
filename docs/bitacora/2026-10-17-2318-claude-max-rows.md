# «Max rows» de la Data API: NEXUS subido a 5000 por el dueño — Claude

Continúa `docs/bitacora/2026-10-17-2217-claude.md` (riesgo del tope de filas).

- **Hallazgo:** el proyecto `tnwsgcxurfyuszxsewsn` tenía **Max rows = 1000**, según la captura del dueño en Integrations → Data API.
  - `asientos` tiene 1,014 filas y se carga con `order=created_at.desc` (index.html, carga de contabilidad), así que **los 14 asientos más viejos (14 al 20 de mayo de 2026) no llegaban** a Mayor, Diario, Balance ni P&G.
  - No afectaba a abonos (452), clientes ni facturas.
- **Cambio (lo hizo el dueño en el panel):** Max rows pasó de 1000 a **5000**, el 18-oct-2026.
  - No toca datos y se revierte poniendo 1000 otra vez.
  - No se puede leer desde SQL: no está en `pg_db_role_setting`.
- **Bayol** (`vkhwdvjtowrhkhqavnvk`) también tiene 1000. Hoy ninguna tabla del Dashboard lo pasa, pero `tareas_trabajo` (784) va en orden ascendente: al pasar de 1,000 perdería **las más nuevas**. Se le recomendó al dueño subirlo también a 5000.
- **Aviso del panel:** «Organization exceeded its quota in the previous billing cycle — Projects will be restricted from 27 Oct, 2026». Se pidió al dueño la captura de «Review usage» para saber qué cuota se pasó.
- **Siguiente:**
  - que la contabilidad pida `asientos` por partes, para no depender del tope;
  - revisar el uso de la cuota.
