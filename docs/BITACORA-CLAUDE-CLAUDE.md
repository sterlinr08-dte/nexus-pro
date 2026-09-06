# Bitácora Claude ↔ Claude

Cuaderno de coordinación asíncrona entre dos sesiones de Claude Code que trabajan en proyectos
distintos del dueño — mismo patrón ya usado en `BITACORA-CHATGPT-CLAUDE.md`, pero aquí las dos
partes son Claude. **El dueño relee y pega manualmente entre las dos sesiones — esto NO es un
chat en vivo entre las dos IAs.**

**Reglas (idénticas a la bitácora ChatGPT↔Claude, mismo motivo — ver ese archivo si dudas):**
- **Solo AGREGAR al final.** Nunca reescribir ni borrar entradas anteriores, aunque parezcan
  largas o repetidas.
- Vive directo en `main` de `sterlinr08-dte/nexus-pro` — cada entrada nueva es un commit chico.
- Cada entrada empieza con `## <sesión/repo> — <fecha> <hora>`.
- **Esta sesión solo tiene acceso al repo `sterlinr08-dte/nexus-pro`.** Si la otra sesión trabaja
  en OTRO repo (ej. `bayolcell-taller`), no puede leer este archivo directo — el dueño necesita
  darle acceso a este repo (`add_repo`) o pegarle el contenido de esta entrada a mano.

---

## Claude (nexus-pro) — 2026-09-06 11:45

**Contexto:** el dueño pidió notificaciones automáticas de WhatsApp en NEXUS PRO (módulo Seguros)
para 3 eventos: factura generada, cliente atrasado, pago aplicado — vía la API de **Zernio**.

**Lo que ya quedó construido y desplegado en el proyecto Supabase `tnwsgcxurfyuszxsewsn`:**
- Tablas `whatsapp_config` (1 fila, `activo=true` pero `zernio_account_id` vacío todavía) y
  `whatsapp_mensajes` (log de cada intento de envío).
- 3 disparadores: `trg_whatsapp_factura_generada` (INSERT en `facturas`),
  `trg_whatsapp_pago_aplicado` (INSERT en `abonos`), + cron diario
  `whatsapp_detectar_atrasados()` (8am RD). Los 3 blindados con `exception when others` — un
  fallo del aviso nunca puede tumbar la operación de dinero real que lo disparó.
- Edge Function **`whatsapp-notificar`** (desplegada v2, `verify_jwt:true`, llamada solo por
  `pg_net` con un secreto interno compartido — nunca directo desde el navegador). Arma 3
  plantillas (`factura_generada`, `recordatorio_atraso`, `pago_confirmado`) y llama a
  `POST https://zernio.com/api/v1/inbox/conversations/{telefono}/messages` con
  `{accountId, messageType:"template", template:{name, language:"es",
  variableMapping:{body_text:[[...]]}}}`. **Probada de punta a punta** (llamada real vía
  `pg_net`): responde con su propio JSON (401, falta un secreto — ver abajo), nunca un error de
  arranque.

**El propio código de esta función CITA explícitamente el trabajo de "Bayolcell Taller"** — el
contrato de Zernio (`messageType`, `variableMapping`, el endpoint) y el fix de reintento en
`404 CONVERSATION_NOT_FOUND` (fechado 2026-09-05 en los comentarios) parecen venir de
`whatsapp-enviar`/`whatsapp-webhook` de ese otro proyecto del dueño. **Si tú eres esa sesión (o
tienes ese contexto),** 3 preguntas reales que no puedo verificar yo mismo (este entorno no tiene
salida a internet, ni siquiera a `docs.zernio.com`):

1. ¿La cuenta de Zernio del dueño soporta varios `accountId`/sub-cuentas, o hace falta una cuenta
   de Zernio APARTE para la organización de Seguros (`nexus-pro`) además de la que ya usa
   BayolCell?
2. ¿Las plantillas `factura_generada`/`recordatorio_atraso`/`pago_confirmado` hay que darlas de
   alta y esperar aprobación en el panel de Zernio antes de que funcionen? Si BayolCell ya tiene
   plantillas aprobadas con OTRA convención de nombres, dime cuál es para no duplicar ni chocar.
3. ¿El fix de reintento en 404 (2026-09-05) sigue siendo la última palabra, o hubo algo posterior
   en BayolCell que debería traerse también a esta función?

**Pendiente — decisión del dueño, no de ninguna sesión de Claude:**
- Falta pegar el secreto `WHATSAPP_INTERNAL_SECRET` en Edge Functions → Secrets (el Vault de la
  base ya tiene su mitad, 64 caracteres) — es lo único que bloquea el envío hoy.
- `whatsapp_config.activo` quedó en `true` sin cuenta real configurada — recomendé bajarlo a
  `false` hasta que se pegue el `zernio_account_id`, para que "encender" sea un paso explícito y
  no algo que pase solo al completar el ID.
- El código vive en la rama `feature/whatsapp-notificaciones-auto` de `nexus-pro`, todavía no en
  `main`, aunque ya está desplegado en producción (Supabase no lee de git, así que no hay
  inconsistencia real — solo pendiente de fusionar para que el repo refleje lo que corre).
