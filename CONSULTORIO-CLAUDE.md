# CLAUDE.md — CONSULTORIO GERIÁTRICO (proyecto independiente)

> **Cómo usar este archivo:** es el contexto de arranque para el CHAT EXCLUSIVO del
> proyecto Consultorio. Léelo completo al iniciar. Cuando el proyecto tenga su propio
> repo, COPIA este archivo como `CLAUDE.md` en la raíz de ese repo y mantenlo al día.
> Idioma de trabajo: **español** (República Dominicana, `es-DO`). Responde y comenta en español.

---

## Qué es este proyecto

Sistema clínico completo para un **médico geriatra** (cliente de Sterling, dueño del
ecosistema NEXUS PRO). Modelo de venta: **base por cliente (estilo Infoplus)** — el
doctor tiene su PROPIA app, su PROPIA base de datos y su subdominio; nada se cruza
con otros clientes. Es el mismo modelo de **Deluxe** (salón de belleza) y **Amatista
Dental** (clínica dental).

**Molde a clonar: AMATISTA DENTAL** (que a su vez se clonó de Deluxe,
repo `DELUXE-BEAUTY-CENTER-`, Vite/TS). Amatista es una clínica → un consultorio
geriátrico es estructuralmente lo mismo. Su base (Supabase `sdxyqaawxomnfhyaxuyo`)
tiene 50 tablas y **~90% le sirve al geriatra tal cual**:

- **Se replica directo:** clientes/pacientes, historias_clinicas + historia_evoluciones,
  alertas_paciente, imagenes_paciente, documentos, consentimientos, citas + cita_servicios,
  recetas + receta_items, facturas + factura_items/pagos/abonos, presupuestos +
  presupuesto_items, secuencias_ncf, caja_sesiones + caja_movimientos, gastos,
  compras/proveedores/articulos (insumos), empleados + pagos_empleados, roles + perfiles,
  tareas, chat interno, notificaciones, auditoria, ajustes_negocio, servicios + categorias.
- **Se DESCARTA (dental):** odontograma, periodontograma, radiografia_hallazgos,
  ordenes_laboratorio. (radiografias puede quedarse como "estudios/imágenes" genérico.)

## Adaptaciones a GERIATRÍA (lo que pide el dueño)

1. **Ficha del paciente geriátrico:** familiar/tutor RESPONSABLE con su teléfono
   (clave con envejecientes), alergias RESALTADAS en rojo, condiciones crónicas,
   medicamentos actuales, ARS, tipo de sangre, edad calculada.
2. **Consulta con signos vitales:** presión, pulso, temperatura, peso, glucosa.
3. **Récipe imprimible** formato médico RD: ℞ grande, datos del paciente/edad/fecha,
   Dx, indicaciones, línea de firma y exequátur.
4. **Recordatorio de citas por WhatsApp** (al teléfono del paciente o del familiar).
5. "Servicios" = consultas/procedimientos médicos (consulta general, seguimiento,
   certificado médico, curaciones, etc.) en vez de tratamientos dentales.
6. Reporte de ingresos del mes (facturado/cobrado/pendiente) imprimible.

> **Referencia funcional:** en NEXUS PRO ya existe un MÓDULO DEMO del consultorio
> (parches.js, v39.8–39.9, IIFE "CONSULTORIO MÉDICO") con estas 6 cosas ya resueltas
> a pequeña escala — sirve de guía visual y de lógica (helpers `nxMd*`).

## Branding

- Nombre provisional: **"Consultorio Geriátrico"** (el nombre/marca real del doctor
  está PENDIENTE — lo define el dueño al cerrar el trato; actualizarlo en
  `ajustes_negocio` y en la fila de `organizaciones` de NEXUS).
- Color sugerido y ya aprobado en el demo: **teal médico `#0d9488`** (gradiente
  `#0f766e → #14b8a6`). Look "nivel plus": limpio, tarjetas suaves, móvil primero.

## Infraestructura (ecosistema del dueño)

- **Dominio madre:** `nexusprord.com` (Cloudflare, cuenta sterlinr08@gmail.com).
  App del consultorio → **Cloudflare Pages** (build `npm run build`, salida `dist`,
  env `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`), subdominio sugerido:
  **`geriatra.nexusprord.com`** (custom domain en el proyecto Pages).
- **Base de datos propia:** proyecto Supabase NUEVO (org `sterlinr08`).
  ⚠️ **Cuesta US$ 10/mes — el dueño debe confirmarlo ANTES de crearlo.**
  Al crearlo: replicar el esquema de Amatista (menos lo dental) con RLS.
- **Entrada inteligente (ya construida en NEXUS PRO, no tocar):** el doctor escribe
  `doctor@geriatra` en nexusprord.com → la tabla `organizaciones` (base NEXUS
  `tnwsgcxurfyuszxsewsn`) enruta. Para activar la redirección + SSO hay que llenarle
  a la fila `slug='geriatra'`: `dominio` (ej. geriatra.nexusprord.com), `auth_url`
  (URL de la base nueva), `auth_key` (su anon key) y `email_dominio` (ej.
  `@geriatra.local`, según la convención `usuarioAEmail()` del molde — Deluxe usa
  `usuario@deluxe.local`). Con eso el login redirige YA LOGUEADO (flujo implícito,
  hash `#access_token=...`, patrón verificado con Deluxe).

## Estado actual (lo que YA existe, hecho desde el chat de NEXUS PRO)

### ✅ FASE 0 COMPLETADA (2026-07-03)
- **Base de datos propia CREADA:** proyecto Supabase **"Consultorio Geriatra"** en la
  org `sterlinr08` (`gmjedhkktbffnanmebkf`), región `us-east-1`.
  - **project ref / id:** `xqcrpsqhjznltthnfysw`
  - **URL:** `https://xqcrpsqhjznltthnfysw.supabase.co`
  - **anon key:** NO se guarda en el repo — obtenerla con Supabase MCP
    `get_publishable_keys(project_id='xqcrpsqhjznltthnfysw')` cuando se necesite
    (para `VITE_SUPABASE_ANON_KEY` y para `auth_key` del SSO en Fase 3).
- **Esquema clonado FIEL de Amatista** (`sdxyqaawxomnfhyaxuyo`), **sin lo dental**.
  Verificado exacto: **45 tablas, 45 con RLS, 126 políticas, 25 funciones,
  37 triggers, 68 FKs, 58 índices, 14 secuencias, 4 extensiones.**
  - Excluidas: `odontograma`, `periodontograma`, `radiografia_hallazgos`,
    `ordenes_laboratorio`. `radiografias` se conservó (estudios/imágenes genérico).
  - Pendiente menor: la VISTA `chat_mis_conversaciones` NO se clonó (solo tablas);
    recrearla con `CREATE VIEW` si la app la usa.
- **Repo de la app CREADO (vacío):** `sterlinr08-dte/geriatria` (privado, con README).
  Falta clonarle el código del molde.
- **Repo molde (Amatista):** `sterlinr08-dte/amatista-dental`
  (rama de setup `claude/amatista-dental-setup-qqrmq0`). Dar acceso a Claude para
  clonarlo en Fase 1.
- **PENDIENTE de Fase 0:** crear el **usuario auth del doctor** en la base nueva
  (login `doctor@geriatra.local` según convención del molde; la clave la define el
  dueño — NO ponerla en el repo).
- **SIGUIENTE (Fase 1):** hacerlo en un **chat dedicado al Consultorio** con los repos
  `amatista-dental` (molde) y `geriatria` (destino) en alcance: clonar Amatista →
  quitar módulos dentales → rebrandear (teal `#0d9488`) → conectar a la base nueva
  (`VITE_SUPABASE_URL`/`ANON_KEY` de arriba) → probar local.

### Contexto previo (demo dentro de NEXUS PRO)
- **Módulo demo dentro de NEXUS PRO** (base compartida `tnwsgcxurfyuszxsewsn`,
  tablas `med_pacientes`/`med_citas`/`med_consultas`, aisladas por organización).
- **Org `geriatra`** en la base NEXUS (id `af2aa285-6df5-407a-a2f2-af6178a47209`,
  tipo `consultorio`, sin dominio todavía) + **usuario `doctor`** (entra con
  `doctor@geriatra` en nexusprord.com → modo solo-consultorio del demo).
  La clave la tiene el dueño — **NUNCA poner claves en el repo.**
- **Datos demo sembrados** (5 pacientes geriátricos realistas, citas, consultas con
  récipes) en la org del dueño Y en la org geriatra. Cuando el sistema propio esté
  listo, se decide: migrar esos datos o arrancar limpio (y el demo de NEXUS se puede
  apagar poniéndole a la org el dominio para que redirija).

## Plan de trabajo sugerido (por fases, iterativo)

1. **Fase 0:** dueño confirma US$ 10/mes → crear proyecto Supabase → replicar esquema
   de Amatista (sin lo dental) → usuario auth del doctor en la base nueva.
2. **Fase 1:** clonar el repo de Amatista → quitar módulos dentales → rebrandear
   (nombre provisional + teal) → conectar a la base nueva → probar local.
3. **Fase 2:** adaptaciones geriátricas (ficha con familiar responsable/alergias/
   crónicas, vitales en consulta, récipe RD, WhatsApp de citas).
4. **Fase 3:** deploy Cloudflare Pages + subdominio + llenar `organizaciones` en la
   base NEXUS (dominio/auth_url/auth_key/email_dominio) → probar `doctor@geriatra`
   de punta a punta.
5. **Fase 4:** datos reales, clave definitiva del doctor, marca real, capacitación.

## Cómo trabaja el dueño (respetarlo SIEMPRE)

- **Móvil primero** (iPhone): probar todo en pantalla angosta 320–480px, sin desbordes.
- **Publicar en vivo directo a `main`** (deploy automático); versiones pequeñas y
  constantes, probadas. Avisar antes solo si el cambio es grande/riesgoso.
- **Arreglos de RAÍZ**, no parches. **Estética = prioridad real** (nivel plus).
- Contexto RD: RD$, ITBIS, NCF, cédula, ARS, es-DO (punto=miles, coma=decimal).
  **Todo imprimible / PDF / WhatsApp.** Auditoría de acciones.
- **Registrar el contexto en el CLAUDE.md del repo tras cada cambio importante** —
  el chat es desechable, el contexto vive en el repo.
- Claves y secretos: por chat o server-side. **JAMÁS en el repo.**

## Contactos entre sistemas (referencia rápida)

| Sistema | Repo | Base Supabase | Dominio |
|---|---|---|---|
| NEXUS PRO (seguros, madre) | `sterlinr08-dte/nexus-pro` | `tnwsgcxurfyuszxsewsn` | nexusprord.com |
| Deluxe (belleza) | `DELUXE-BEAUTY-CENTER-` | `mrtqkhachhvsczltwakt` | deluxe.nexusprord.com |
| Amatista Dental (MOLDE) | (preguntar al dueño el nombre del repo) | `sdxyqaawxomnfhyaxuyo` | (definido en su chat) |
| BayolCell taller | `bayolcell-taller` | `vkhwdvjtowrhkhqavnvk` | bayolcell.com |
| **Consultorio Geriátrico (ESTE)** | (crear: clon de Amatista) | (crear, US$10/mes pendiente) | geriatra.nexusprord.com (sugerido) |
