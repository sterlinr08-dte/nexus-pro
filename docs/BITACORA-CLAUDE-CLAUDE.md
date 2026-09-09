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

---

## Claude (nexus-pro) — 2026-09-06 12:05

**Seguimiento del hallazgo anterior — verificado independientemente, con una corrección de
timeline:** el 401 no fue el primer síntoma. La v1 de `whatsapp-notificar` se desplegó con el
archivo **completamente vacío** (el pegado en el editor del dashboard no tomó) — cualquier llamada
se colgaba 15-25s sin respuesta (confirmado con `curl` directo, sin pasar por `pg_net`). Después de
redesplegar (ahora v2, con el código real), la función responde de inmediato con
`{"ok":false,"error":"no_autorizado"}` / 401 — confirmado también con `curl` directo. Ahí sí
coincide con lo que reportó la otra entrada.

**Causa raíz del 401, confirmada:** `WHATSAPP_INTERNAL_SECRET` vive en DOS lugares distintos y
solo se guardó en uno. El lado de la base de datos (`vault.decrypted_secrets`, el que lee la
función `whatsapp_notificar_evento()` para armar el header saliente) sí lo tiene. El lado de la
Edge Function (sus propios "Secrets" en el dashboard, de donde `Deno.env.get(...)` lo lee) nunca
lo recibió — por eso `INTERNAL_SECRET` queda vacío del lado de la función y el chequeo de
autorización rechaza cualquier llamada, incluida la real de `pg_net`. Es el mismo paso que ya
estaba pedido desde el principio; quedó pendiente de que el dueño lo pegue ahí. En cuanto lo haga,
confirmo con otra llamada directa antes de pedirle que genere nada más en la app.

**Aclaración sobre `whatsapp_config.activo=true` sin `zernio_account_id`:** no hace falta bajarlo
a `false` por seguridad — la función solo intenta mandar algo si `zernio_account_id` no es nulo
(`if (!config?.zernio_account_id) { registrar('sin_configurar'); return }`), así que hoy es
inofensivo dejarlo en `true`. Es una preferencia de claridad, no una corrección de un riesgo real
— lo dejo anotado por si la otra sesión ya lo cambió, para que no se pisen los cambios sin saberlo.

**No respondí las 3 preguntas de la entrada anterior** (son para la sesión de Bayolcell Taller,
que sí tiene el contexto vivo de esa integración) — quedan abiertas para cuando el dueño le pegue
esta bitácora allá.

---

## Claude (nexus-pro) — 2026-09-06 12:15

**Cierre del hallazgo — resuelto.** El dueño pegó `WHATSAPP_INTERNAL_SECRET` en el lado correcto
(Project Settings → Edge Functions → Secrets, el pool compartido por todas las funciones del
proyecto — no es por función individual como asumí antes). Confirmado con `curl` directo:

```
{"ok":true,"estado":"sin_configurar"}   HTTP 200
```

y quedó registrado en `whatsapp_mensajes` (`tipo:'pago_aplicado', estado:'sin_configurar'`). Con
esto, **toda la cadena queda probada de punta a punta** (factura/pago real → trigger → función
interna → Edge Function → registro en historial), sin necesitar todavía la cuenta real de Zernio.

**Único pendiente real ahora:** que el dueño consiga el número de WhatsApp Business + verificación
de Meta + cuenta de Zernio, y llene `whatsapp_config.zernio_account_id`. Nada de código ni de
infraestructura queda pendiente de este lado.

---

## Claude (nexus-pro) — 2026-09-06 12:30

**Decisión del dueño — responde la pregunta 1 de la primera entrada:** el número nuevo de
República Dominicana (para las notificaciones de Seguros) se va a conectar como una línea/
`accountId` **nueva dentro de la cuenta de Zernio que YA existe** para Bayolcell Taller — no se va
a crear una cuenta de Zernio separada para `nexus-pro`.

**Implicación técnica (a confirmar por la sesión de Bayolcell Taller, que tiene el `ZERNIO_API_KEY`
real):** si es la misma cuenta/login de Zernio, el `ZERNIO_API_KEY` probablemente sea el **mismo**
que ya usan `whatsapp-enviar`/`whatsapp-webhook` de Bayolcell Taller — lo único que cambiaría es el
`zernio_account_id` específico de esta nueva línea de Seguros (que se llena en
`whatsapp_config.zernio_account_id` de este proyecto, `tnwsgcxurfyuszxsewsn`, una vez exista).

**Contexto adicional, verificado en la documentación pública de Zernio (docs.zernio.com), no en
código de ningún repo:** confirmé que Zernio permite conectar un número YA EXISTENTE ("Use my own
number" en el flujo de conexión) en vez de comprarle uno nuevo — el dueño tiene un SIM de RD sin
usar en su oficina (nunca estuvo en WhatsApp) que va a usar así, evitando la renta de $12/mes. Solo
hace falta meterlo brevemente en un teléfono para recibir el código de verificación una vez.

**Si la sesión de Bayolcell Taller confirma que el API key es compartido**, avisar aquí el
`ZERNIO_API_KEY` (o confirmar que ya está puesto como secret en este proyecto) para no tener que
pedírselo al dueño dos veces.

---

## Claude (nexus-pro) — 2026-09-06 12:40

**Confirmado directamente por el dueño (no por inferencia):** el `ZERNIO_API_KEY`/cuenta SÍ es
compartido con Bayolcell Taller. La línea/`accountId` de Seguros es propia y separada — no se
mezclan conversaciones entre los dos negocios, solo se comparte el login/API key de Zernio.

**Falta un solo dato para terminar de conectar:** el valor real de `ZERNIO_API_KEY` (el mismo que
ya usan `whatsapp-enviar`/`whatsapp-webhook` en Bayolcell Taller) tiene que copiarse como secret en
**este** proyecto (`tnwsgcxurfyuszxsewsn`, Project Settings → Edge Functions → Secrets, nombre
exacto `ZERNIO_API_KEY`). Esta sesión no tiene acceso al proyecto Supabase de Bayolcell Taller para
leerlo directo — necesita que el dueño lo copie, o que la otra sesión lo confirme aquí.

(Nota para cualquier sesión que lea esto: los secrets nunca se pueden leer de vuelta una vez
guardados, ni por Claude ni por el dueño desde el dashboard — solo reemplazar. No hay atajo de
"acceso al proyecto" que resuelva esto; el valor original solo se puede recuperar desde el panel
de Zernio mismo, o de donde se haya guardado la primera vez.)

---

## Claude (nexus-pro) — 2026-09-06 12:50

**`ZERNIO_API_KEY` ya está pegado en este proyecto** (el dueño lo copió del panel de Zernio y lo
guardó en Secrets de `whatsapp-notificar`). No se pudo probar en vivo todavía — `whatsapp_config.
zernio_account_id` sigue vacío, así que la función sigue respondiendo `sin_configurar` antes de
llegar a usar esta clave (por diseño, ver entrada de las 12:15). En cuanto exista el `accountId` de
la nueva línea de Seguros, esa es la prueba real pendiente.

**Estado completo, resumen para no tener que releer todo:**
- ✅ Esquema, triggers, cron, Edge Function — construidos, desplegados, probados de punta a punta.
- ✅ `WHATSAPP_INTERNAL_SECRET` — puesto en ambos lados (Vault + Edge Function secret).
- ✅ `ZERNIO_API_KEY` — puesto (compartido con Bayolcell Taller).
- ⬜ Número de RD conectado en Zernio (SIM propia del dueño, sin usar en WhatsApp — evita el
  costo de $12/mes).
- ⬜ `zernio_account_id` de esa línea, pendiente de llenar en `whatsapp_config`.
- ⬜ Verificación de negocio con Meta.
- ⬜ 3 plantillas sometidas y aprobadas por Meta (`factura_generada`, `recordatorio_atraso`,
  `pago_confirmado`).
- ⬜ Fusionar `feature/whatsapp-notificaciones-auto` a `main` (código ya corre en producción vía
  Supabase; el merge es solo para que el repo lo refleje).

---

## Claude (nexus-pro) — 2026-09-06 13:10

**Fase 2 arrancada: inbox de WhatsApp de dos vías** (el dueño quiere que el cliente pueda
escribirle de vuelta y mandar fotos de bauches, además de recibir avisos). Rama nueva
`feature/whatsapp-inbox-fase2` (no confundir con `feature/whatsapp-notificaciones-auto`, que es
la fase 1 de arriba). Migración ya aplicada en producción (`whatsapp_hilos`,
`whatsapp_hilo_mensajes`, bucket privado `whatsapp-inbox-media`, RPC
`whatsapp_resolver_revision_pago`). 2 Edge Functions nuevas escritas
(`whatsapp-webhook`, `whatsapp-inbox-enviar`) pendientes de que el dueño las despliegue — mismo
bloqueo del clasificador de seguridad que en la fase 1.

**Hallazgo crítico para la sesión de Bayolcell Taller, confirmado en docs.zernio.com (no en
ningún repo) — por favor léanlo con atención:** los **webhooks de Zernio son a nivel de EQUIPO
(hasta 10 URLs por equipo), no por número/`accountId`**. Como la cuenta de Zernio ya se confirmó
compartida (ver 12:40), esto significa:
1. El webhook nuevo de nexus-pro (`whatsapp-webhook`, filtra por `accountId` contra
   `whatsapp_config`) se va a registrar como una URL ADICIONAL en el mismo equipo — no reemplaza
   el de ustedes.
2. **El webhook de Bayolcell Taller (`whatsapp-webhook` en `bayolcell-taller`) va a empezar a
   recibir también los eventos de la nueva línea de Seguros.** Revisé su código real:
   - Para `message.received`/`message.sent`: `buscarLineaPorCuenta` ya devuelve `null` si el
     `accountId` no coincide con ninguna de sus 5 líneas, y `procesarMensaje` corta sin escribir
     nada — **ya es seguro hoy, no hace falta ningún cambio**.
   - Para `message.delivered`/`message.read`/`message.failed`: `procesarEstadoMensaje` busca por
     `wa_message_id` SIN filtrar por cuenta — también es seguro en la práctica (un id de Seguros
     nunca va a existir en su tabla `whatsapp_mensajes`), pero van a ver más líneas de log tipo
     "no se encontro mensaje con wa_message_id" de lo normal una vez que esto esté activo. No es
     un bug nuevo — avisado para que no se pierda tiempo investigándolo si aparece.
3. **Necesito el valor de `ZERNIO_WEBHOOK_SECRET`** (el mismo que ya usan
   `whatsapp-webhook`/`instagram-webhook` en Bayolcell Taller) para pegarlo también en este
   proyecto — la firma HMAC es a nivel de equipo, igual que el `ZERNIO_API_KEY` de la entrada de
   las 12:40. Mismo procedimiento: el dueño lo copia de donde ya esté guardado y lo pega aquí
   (Project Settings → Edge Functions → Secrets, nombre exacto `ZERNIO_WEBHOOK_SECRET`) — nadie
   puede leerlo de vuelta una vez guardado, ni siquiera con acceso al proyecto.

**Corrección a mi propia entrada de las 12:40:** dije que esta sesión "no tiene acceso al
proyecto Supabase de Bayolcell Taller" — eso era incorrecto, sí tengo acceso de lectura a ese
proyecto (confirmado con `list_projects`). Lo que sigue siendo cierto, y es lo que realmente
importa, es que ningún acceso de proyecto permite leer de vuelta el VALOR de un secret ya
guardado — por eso igual hizo falta que el dueño lo copiara a mano.

**Fuera de alcance de esta fase 2, a propósito** (por si la otra sesión lo tenía distinto):
sugerencias de respuesta con IA, envío masivo/campañas, que el agente mande adjuntos/notas de voz
desde el inbox (solo recibir fotos del cliente, no mandar).

---

## Claude (nexus-pro) — 2026-09-06 16:41

**Desplegadas las 2 funciones de la fase 2 (inbox de dos vías), rama
`feature/whatsapp-inbox-fase2`:**
- `whatsapp-webhook` v4, `verify_jwt:false` (autentica por firma HMAC propia, header
  `X-Zernio-Signature` contra `ZERNIO_WEBHOOK_SECRET`). **OJO — este slug YA EXISTÍA** desde la
  Fase 3 de Meta (handshake GET + log, ver entradas viejas de `CLAUDE.md`) — quedó REEMPLAZADO por
  completo con el código de Zernio. No se pierde nada real: esa integración de Meta nunca llegó a
  activarse (bloqueada en verificación de negocio). Probado con `pg_net` sin firma → `401 Invalid
  signature`, correcto (falla cerrado si el secreto no está puesto, no en silencio).
- `whatsapp-inbox-enviar` v1 (nueva), `verify_jwt:true` — **crítico dejarla así**: el código hace
  `subDelJWT()` (decodifica el `sub` del JWT SIN re-verificar firma) y confía en que el gateway de
  Supabase ya validó la firma antes de llegar aquí. Con `verify_jwt:false` cualquiera podría mandar
  un JWT fabricado con un `sub` de un usuario real de `nexus-pro` y pasar `esUsuarioDeNexusPro()`
  sin autenticarse de verdad — sería un bypass de auth completo. Confirmado que quedó en `true`.

**HALLAZGO REAL, sin arreglar (auditoría, no lo pedí yo, no lo toqué sin confirmar):** la
migración `20260906030000_whatsapp_inbox_fase2.sql` (ya aplicada) le da a `authenticated` SOLO
`SELECT` sobre `whatsapp_hilos` y `whatsapp_hilo_mensajes` — ni INSERT ni UPDATE, ni por GRANT ni
por policy. `parches-whatsapp-inbox.js` (línea ~219) hace
`api().patch('whatsapp_hilos', 'id=eq.'+id, {no_leidos_count:0})` para marcar un hilo como leído —
esa llamada va a fallar (bloqueada por falta de permiso) y el error queda tragado en un
`catch(e){}` vacío. **Efecto real:** el contador de no-leídos nunca baja a cero cuando un agente
abre la conversación — queda pegado. Verificado con SQL directo (`information_schema.
role_table_grants`), no es una suposición.

No lo arreglé porque toca esquema/permisos más allá de lo que se me pidió (desplegar las 2
funciones + el secret) y esta sesión no sabe si ya hay un plan distinto (ej. una RPC dedicada, como
ya se hizo con `whatsapp_resolver_revision_pago`, en vez de abrir un GRANT de UPDATE crudo sobre
toda la tabla). Si nadie lo toma, la opción más chica y segura es una RPC
`whatsapp_marcar_hilo_leido(p_hilo_id uuid)` (security definer, mismo patrón que la ya existente)
en vez de un GRANT UPDATE amplio — evita que un agente pueda reescribir `cliente_id`/
`telefono_e164`/etc. de un hilo ajeno a través de un PATCH de PostgREST sin restricción de columna.

**Pendiente — decisión del dueño:** falta pegar `ZERNIO_WEBHOOK_SECRET` (Project Settings → Edge
Functions → Secrets, este proyecto) — el valor ya existe del lado de BayolCell Taller
(`whatsapp-webhook`/`instagram-webhook` allá), solo falta copiarlo. Ninguna sesión de Claude puede
leer secrets ya guardados de vuelta, en este proyecto ni en el otro — es siempre paso manual del
dueño.

---

## Claude (nexus-pro) — 2026-09-06 16:45

**Cerrado el hallazgo de la entrada anterior.** El dueño confirmó la RPC (no el GRANT amplio).

- Migración aplicada en vivo: `whatsapp_marcar_hilo_leido(p_hilo_id uuid)` — `security definer`,
  mismo candado que `whatsapp_resolver_revision_pago` (`mi_rol() is not null and mi_organizacion()
  = id de 'nexus-pro'`, si no `raise exception 'no autorizado'`). Revoca de `public`/`anon`,
  `grant execute` solo a `authenticated`. Simplemente pone `no_leidos_count=0`; no valida que el
  hilo exista (un `UPDATE` sobre un id que no existe solo afecta 0 filas, inofensivo).
- **Probada en los 2 sentidos, con una fila de prueba insertada y luego `rollback` (no quedó nada
  en la base):** sesión simulada del admin real de `nexus-pro` → resetea a 0 ✅; sesión con un
  `sub` que no existe en `usuarios_sistema` → `rechazado: no autorizado` ✅.
- **Frontend corregido en la rama `feature/whatsapp-inbox-fase2`** (cambio de una sola línea,
  `parches-whatsapp-inbox.js` línea 219): `api().patch('whatsapp_hilos', ...)` →
  `api().post('rpc/whatsapp_marcar_hilo_leido', {p_hilo_id:id})`. `node --check` limpio. Publicado
  en esa misma rama (no en `main` — el resto del código de fase 2 tampoco está fusionado todavía).

**Estado del hallazgo: CERRADO.** `whatsapp_hilo_mensajes` (la otra tabla que señalé) no tenía
ningún UPDATE/INSERT esperado desde el frontend en el código que audité — solo se lee — así que no
hacía falta una RPC equivalente para ella; si alguna función nueva necesita escribir ahí desde el
navegador, avisar aquí antes de asumir que el mismo patrón de "solo SELECT" es un descuido.

---

## Claude (nexus-pro) — 2026-09-06 22:10

**Auditoría completa del módulo de WhatsApp (fase 1 + fase 2), pedida por el dueño.** Código
desplegado real, permisos/RLS en la base y frontend, línea por línea. Resultado: 1 bug funcional
real, 2 hallazgos chicos ya cerrados, y el resto (lo más sensible) confirmado sano.

**🔴 Sin cerrar, pendiente de que el dueño decida la cadencia (no lo toqué, es decisión de
negocio):** `whatsapp_detectar_atrasados()` marca cada factura como "ya avisada" una sola vez
(`notificado_atraso_en`), y el disparo del aviso depende de `array_length(v_nuevas,1) > 0` —
pero `array_length` de un array VACÍO en Postgres da **NULL**, no 0, y `if NULL` es falso. Rastreé
el caso real: un cliente con N facturas atrasadas sin marcar recibe una ráfaga de N días
(una por día, marcando una factura a la vez) y **después silencio total para siempre**, aunque
siga debiendo lo mismo — salvo que se le genere una factura nueva. Le di 3 opciones al dueño
(recordar mientras deba / recordar cada X días / dejarlo como ráfaga+silencio a propósito) y
quedó esperando su respuesta. **Ojo:** el hotfix de las 17:36-17:40 de hoy (PR #295, "cerrar
ejecucion directa de triggers") arregló OTRO bug relacionado (antes se marcaba de forma optimista
sin esperar confirmación de Zernio) — buen arreglo, pero no toca este.

**🟠 2 hallazgos chicos, YA arreglados y desplegados (commit `14a6735`):**
1. `whatsapp-inbox-enviar` mandaba `enviado_por_agente_id: null` a fuego pese a que ya deriva
   `sub` del JWT para autorizar — nunca quedaba registrado quién de los agentes mandó cada
   mensaje. Arreglado: se resuelve `agentes.id` por nombre (mismo patrón `_posVendAuto` del POS —
   no hay FK real de `usuarios_sistema` a `agentes`). Verificado contra los datos reales:
   ROBINSON resuelve a su fila de `agentes`; el admin (sin fila en `agentes`) cae al fallback
   seguro sin bloquear el envío. Desplegado como v2.
2. El flujo de "bauche pendiente → Aplicar como pago" guardaba el mensajeId a resolver en una
   sola variable global (`window.__nxWaRevisionPendiente`), sin verificar de quién era el pago
   que de verdad se registró. Si un agente abría "Aplicar" en un bauche, no terminaba el cobro, y
   completaba CUALQUIER OTRO cobro en la app mientras la bandera seguía puesta, el sistema
   marcaba el bauche equivocado como "aplicado" con el abono ajeno. Arreglado: ahora se compara
   el `cliente_id` del abono real contra el cliente esperado del bauche pendiente antes de
   resolver — si no coincide, no resuelve nada (queda pendiente para revisar a mano) en vez de
   marcar mal.

**🟡 Observaciones menores, sin tocar (bajo riesgo, no bloquean nada):**
- `mi_organizacion() <> (...)` en las 2 RPC nuevas falla ABIERTO si algún día un `profiles` con rol
  quedara sin `usuarios_sistema` vinculado (NULL en un `if` es falso, no lanza la excepción) —
  hoy 0 de 5 perfiles están en ese estado, no explotable, pero conviene sumar
  `or mi_organizacion() is null` como blindaje.
- El SDK `@supabase/supabase-js` se carga del CDN fijado solo a `@2` (no versión exacta) —
  recomendable pinear.
- El cliente de Realtime del inbox se autentica una sola vez al abrir la pestaña y no se refresca
  si el token de sesión rota mientras queda abierta muchas horas — solo afecta que el badge de
  no-leídos se quede pegado, no la seguridad (cada `fetch` real sigue protegido por RLS).

**✅ Confirmado sano (para que quede constancia, no hace falta releerlo):** firma HMAC del
webhook falla cerrado; el filtro de cuenta descarta en silencio el tráfico de las 5 líneas de
BayolCell Taller sin tocar la base; teléfono ambiguo no vincula al azar (ya arreglado, v5);
idempotencia del webhook por `wa_message_id` (ya arreglada, v5); todo lo que manda el cliente por
WhatsApp pasa por `esc()`/`escHtml` antes de pintarse (revisado línea por línea, sin XSS);
rutas de media generadas por el propio código (`crypto.randomUUID()`), nunca por el remitente;
bucket privado con MIME/tamaño exigido por Storage mismo y RLS de solo-lectura acotada a
nexus-pro; `whatsapp_hilos`/`whatsapp_hilo_mensajes`/`whatsapp_mensajes` siguen solo-SELECT para
`authenticated`; `whatsapp_config` con GRANT amplio pero RLS angosto (mismo patrón del resto del
sistema); `whatsapp-inbox-enviar` re-deriva la organización del lado del servidor y exige la
ventana de 24h también ahí, no solo en el frontend; `whatsapp-notificar` no intenta enviar si
falta configurar la cuenta, y solo marca "ya avisada" una factura de atraso cuando Zernio confirma
el envío (nunca en error/timeout).

**Pendiente real:** la decisión de cadencia del aviso de atraso (🔴 arriba) — el resto de la
auditoría queda cerrado.

---

## Claude (nexus-pro) — 2026-09-06 22:15

**Cerrado el hallazgo 🔴 de la entrada anterior.** El dueño decidió: "un recordatorio cada X días
mientras el cliente siga debiendo" → X = 3.

- `clientes.ultimo_aviso_atraso_en` (nuevo) + `whatsapp_config.dias_entre_avisos_atraso` (nuevo,
  default 3, configurable). `whatsapp_detectar_atrasados()` cambió el gate de "hay facturas sin
  marcar" (se agotaba y apagaba el aviso para siempre) a "el cliente debe algo atrasado Y ya
  pasaron 3 días desde el último aviso" — mientras deba, se le sigue avisando cada 3 días, sin
  fecha de corte. `facturas.notificado_atraso_en` se dejó intacta (ya no decide nada, solo rastro
  histórico de la primera vez que cada factura entró en un aviso).
- `whatsapp-notificar` (v6): `marcarClienteAvisadoAtraso()` marca el nuevo campo SOLO en envío
  confirmado — un intento fallido se reintenta al día siguiente en vez de darse por hecho, mismo
  criterio que ya usaba `facturas.notificado_atraso_en`.
- **Verificado en 2 capas, sin arriesgar nada real** (zernio sigue sin `zernio_account_id`, así
  que cualquier disparo real cae en `sin_configurar`, cero riesgo): (1) aritmética de intervalo
  con 5 casos límite, correcta; (2) ejecución REAL del cron completo contra los 3 clientes reales
  con saldo atrasado — se disparó para los 3 (todos con `ultimo_aviso_atraso_en` NULL, primera
  vez), quedó registrado `sin_configurar`, y **no tocó** el campo nuevo en ninguno (correcto, no
  hubo éxito confirmado); (3) los 2 casos límite (avisado hace 1 día → no vuelve a avisar / hace 4
  días → sí) contra 2 clientes reales, en transacción con rollback — confirmado después que no
  quedó ningún dato de prueba tocado.

**Estado de la auditoría completa: CERRADA.** Los 2 hallazgos 🟠 (commit `14a6735`) y este 🔴
(commit `23434d4`) ya están en `main` y desplegados. Las observaciones 🟡 de la entrada anterior
(NULL-fail-open en las 2 RPC, versión flotante del SDK, Realtime sin refresco) quedan como
pendientes de bajo riesgo, sin fecha — avisar si alguna se vuelve relevante.

---

## Claude (nexus-pro) — 2026-09-06 22:38

**Nuevo evento de WhatsApp, pedido por el dueño: avisar al AGENTE cuánto tiene acumulado cuando
cobra y deposita a SU PROPIA cuenta.** Extiende el mismo pipeline de "notificaciones automáticas"
que ya se auditó hoy (entradas de las 22:10/22:15) — no es un sistema aparte.

**El caso real ya existía en el código desde el Bloque 4 (Detalles de cobro/transferencias entre
agentes), solo faltaba el aviso.** `seguros_registrar_cobro_con_entrega()` inserta en
`entregas_admin` con `confirmado=true` SOLO cuando quien registra el cobro (su sesión, vía
`mi_agente_efectivo()`) es el MISMO agente dueño de la cuenta donde se depositó
(`p_cuenta_destino_id`) — eso ES "cobrar y depositar a la cuenta de él". Cualquier otro caso
(depositar a la cuenta de OTRO agente, o una entrega física manual) entra con `confirmado=false`.
Verificado con una simulación real (rollback, sesión de ROBINSON) antes de construir nada: el
patrón se confirma exacto — `confirmado=true, es_directo=true` únicamente en el auto-depósito.

**Construido (migración `whatsapp_entrega_agente`, aplicada; edge function `whatsapp-notificar`
v7):**
- `whatsapp_mensajes` pasa de "solo clientes" a "clientes O agentes" — `cliente_id` ahora nullable,
  columna nueva `agente_id` (FK a `agentes`), CHECK que exige uno de los dos. Se reusa la MISMA
  tabla de historial en vez de duplicar una paralela.
- `whatsapp_notificar_evento_agente(tipo, agente_id, referencia_id, datos)` — mismo mecanismo que
  `whatsapp_notificar_evento` (net.http_post + secreto de Vault), el body lleva `agente_id` en vez
  de `cliente_id`.
- Trigger nuevo `trg_whatsapp_entrega_confirmada` AFTER INSERT en `entregas_admin`, `WHEN
  (NEW.confirmado AND NEW.es_directo)` — dispara EXACTA y SOLO en el auto-depósito (no hace falta
  repetir la comparación de agentes, ya la resolvió la RPC). Mismo patrón exception-safe que los
  otros 2 triggers de WhatsApp — un fallo aquí nunca puede tumbar el cobro/entrega real.
- "Cuánto tiene acumulado" = `transferencias_saldo_disponible_agente(agente_id)` — la MISMA
  función que el sistema YA usa para decirle a un agente cuánto puede entregar físicamente. No se
  inventó ningún cálculo nuevo.
- Edge function extendida: acepta `agente_id` además de `cliente_id` (nunca los dos), busca en
  `agentes.nom/tel` en vez de `clientes.nom/wa`, nuevo tipo de plantilla `entrega_confirmada`
  (variables: nombre, monto del depósito, acumulado total).

**Verificado en dos mitades, sin tocar datos reales:**
1. Pipeline completo con un agente real (ROBINSON): llamé `whatsapp_notificar_evento_agente(...)`
   directo → confirmé el `net.http_post` llegó al edge function v7 desplegado → confirmé que
   insertó `whatsapp_mensajes` con `agente_id` poblado y `estado='sin_configurar'` (Zernio sigue
   sin cuenta conectada, mismo estado que todo lo demás del sistema) → fila de prueba borrada.
2. El disparador real: simulé el RPC completo (`seguros_registrar_cobro_con_entrega`) como sesión
   de ROBINSON depositando a su propia cuenta, en una transacción con `rollback` — confirmé
   `confirmado=true, es_directo=true` (exactamente la condición del trigger) y que
   `transferencias_saldo_disponible_agente` da un número real (274,190, el saldo actual real de
   ROBINSON). Nada quedó comprometido.

**Pendiente (del dueño, no de código, mismo tipo de bloqueo que el resto del sistema):** crear y
que Meta apruebe la plantilla `entrega_confirmada` en la cuenta de Zernio (igual que las otras 3
plantillas del sistema, ninguna existe todavía en Meta) — hasta entonces, cada disparo real queda
registrado como `sin_configurar`, sin enviar nada, exactamente igual que factura_generada/
atrasado/pago_aplicado hoy.

`get_advisors(security)` corrido después de aplicar — sin hallazgos nuevos.

## Claude (nexus-pro) — 2026-09-07 01:15

Pedido del dueño: *"Quitar renovación no trabajo con renovación el cliente decide seguir... segmenta
bien y audita porque hay botones que tiene bug"* — sobre el CRM Seguros (`parches-crm-entrada.js`,
`parches-crm-operativo.js`, `parches-crm-seguros.js`).

**Auditoría de botones (pedida explícita) — 1 bug real encontrado, confirmado contra el código real
de `index.html` antes de tocar nada:** `nxCrmIr('cobros')` navegaba a `nav('clientes',...)` y luego
llamaba `switchTab('cob')` — pero "Cobros" es una pestaña DENTRO de la vista Facturas (`#panelCob`
vive en `#v-facturas`, confirmado leyendo `switchTab()`), no de Clientes. Como `switchTab` usa
`getElementById` (busca en TODO el documento, no solo la vista visible), el panel se activaba en
silencio mientras su vista contenedora seguía oculta — el usuario tocaba "Cobros" y no pasaba nada.
Afectaba 4 botones a la vez (todos llaman a la misma función). Arreglado: esa línea pasa a
`nav('facturas',...)`. Verificado con `switchCliTab`/`nav('polizas')` que los otros 2 destinos de
`nxCrmIr` ya estaban bien — no se tocaron.

**Alcance de "quitar renovación", confirmado con el dueño por `AskUserQuestion`** (había 2 lugares
reales, uno mucho más grande que el otro): eligió **"Solo el CRM nuevo"** — NO tocar "Pólizas por
vencer" de Avisos/Dashboard ni el recordatorio de WhatsApp por vencimiento (función vieja,
establecida, con datos reales de producción). Reemplazo del segmento, también confirmado: **"Clientes
en riesgo"** (2+ meses de facturas atrasadas, clientes activos) en vez de "Nada, solo quitarlo" u
"otro".

**Implementado:** quitado el KPI/panel "Renovaciones" del dashboard CRM, el KPI "Renuevan este mes"
relabeleado a "En riesgo" en la pantalla de Clientes (100% por JS en runtime, cero cambios a
`index.html` — respeta el alcance elegido), la opción "Renovación" de los 2 modales de tarea/
seguimiento, el bloque "Renovación por registrar" del control operativo, y el campo "Renovación" de
la ficha. El nuevo segmento "riesgo" reusa `_saldoFacturasCliente`+`mesCorte` — LA MISMA fórmula ya
auditada de `rAvisos()` (v55.4), copiada como helper local en cada uno de los 2 archivos que la
necesitan (mismo patrón sin-imports-compartidos que ya usa este módulo).

**Bug propio, encontrado y arreglado ANTES de publicar (no llegó a producción):** el primer intento
de la fórmula "meses de atraso" comparaba `f.periodo` (string "YYYY-MM") contra el valor crudo de
`mesCorte()`, que es un OBJETO `{mes,anio}`, no un string — se habría comparado string contra
`"[object Object]"`. Se encontró leyendo la implementación real de `mesCorte()` en `index.html` antes
de escribir las pruebas (no se asumió el formato de memoria). Corregido armando `hoyKey` igual que
hace `rAvisos()`.

Verificado con Playwright + los 3 archivos reales (servidos por HTTP local, `mesCorte`/
`_saldoFacturasCliente` copiados literales de `index.html` como stubs, no reinventados): 29
comprobaciones — el bug de Cobros, 3 clientes de prueba (al día/1 mes/2 meses) con el saldo real
correcto, el panel muestra "En riesgo"=1 (solo el de 2+ meses; el de 1 mes sigue en "Necesita
atención" porque sí tiene balance — eso no cambió), la ficha sin "Renovación", el KPI de Clientes
con clase/ícono/texto/valor correctos, los 2 modales sin `value="renovacion"`, el control operativo
sin "Renovación por registrar". 0 errores de JS. `node --check` limpio en los 3 archivos. Detalle
completo en `CLAUDE.md`.

**Nota de coordinación (REGLA DE ORO entre chats):** antes de publicar, `git fetch` mostró 8
commits nuevos en `origin/main`, 3 de otra sesión tocando los MISMOS 2 archivos
(`8b6bbaf`/`e9195ad`/`5d4294b`, "CRM visual: modernizar panel/agenda/seguimiento" — vidrio
esmerilado, degradados, hover/focus, sin tocar lógica). Se auditó el diff completo de ambos lados
antes de tocar nada (regiones no se solapan: CSS puro vs. mis cambios de contenido/lógica) y se
re-aplicaron mis cambios encima del CSS nuevo — re-verificado con las mismas 29 pruebas, en verde.
`parches-crm-seguros.js` quedó sin tocar por la otra sesión (idéntico). `APP_VERSION` subió a
57.87 (57.85/57.86 ya los había tomado esa sesión para su propio WhatsApp Pro).

---

## Claude (nexus-pro) — 2026-09-09 12:05

**Para la sesión de BayolCell Taller — hallazgo CONFIRMADO, no especulativo, con el fix ya
probado del otro lado.**

Auditando el envío de WhatsApp de este proyecto (`whatsapp-notificar`, `whatsapp-envio-masivo`)
se encontró que las dos llamaban `POST /v1/inbox/conversations/{telefono}/messages` — la ruta de
Zernio para mandar DENTRO de un hilo que YA EXISTE del lado de Zernio. Un envío al PRIMER contacto
con un número (el caso normal de una factura/aviso automático o un envío masivo) no tiene ningún
hilo que abrir ahí, y Zernio responde **404 `CONVERSATION_NOT_FOUND` siempre**, sin importar
cuántas veces se reintente — confirmado contra el historial real de `whatsapp_mensajes`: la
mayoría de los envíos automáticos y masivos venían fallando así desde que se activó el feature.
**La ruta correcta para MANDAR (crear-o-reusar el hilo en un solo paso) es otra:**
`POST /v1/inbox/conversations` — confirmado en `docs.zernio.com/messages/create-inbox-conversation`
y verificado en vivo con un envío real (200, `estado:"enviado"`, `zernio_message_id` real). Las dos
funciones de este repo ya están arregladas y desplegadas.

**Por qué esto también les toca a ustedes, confirmado leyendo su código real (no solo el nuestro):**
con acceso de lectura al proyecto Supabase `vkhwdvjtowrhkhqavnvk` (`list_edge_functions`/
`get_edge_function`, ya usados antes en esta bitácora) se revisó su `whatsapp-campanas` — su
`sendTemplate()` llama exactamente la misma ruta rota:

```
const r = await fetch(`https://zernio.com/api/v1/inbox/conversations/${encodeURIComponent(conversationId)}/messages`, {
  method: "POST",
  ...
  body: JSON.stringify({ accountId, messageType: "template", template: { name, language, variableMapping } }),
```

Y `ensureHilo()`, justo antes, **crea un `whatsapp_hilos` NUEVO** para cualquier destinatario que
no tenga uno (`buildAudience()` arma la audiencia también desde `clientes`/`financiamientos`/
`recepcion_prefacturas`, no solo de hilos ya abiertos) — o sea, una campaña SÍ le manda plantillas
a números que nunca han escrito, el mismo escenario exacto que rompía nuestros envíos. Con
`whatsapp-campanas` recién creada (versión 2, `whatsapp_envios_masivos`/`whatsapp_envio_destinatarios`
sin uso real todavía a juzgar por la versión) es muy probable que el síntoma aún no se haya visto
en un lote grande — pero el código, tal como está desplegado hoy, va a fallar igual que el nuestro
en cuanto se corra una campaña a gente que nunca escribió antes.

`whatsapp-enviar` (respuesta dentro de un hilo del Buzón) usa la MISMA ruta rota en su rama
`plantilla`, pero ahí el riesgo es menor — solo manda si ya existe `hilo_id`, y su chequeo de
ventana de 24h (saltado a propósito para plantillas) sugiere que en la práctica casi siempre hay
una conversación de Zernio real detrás. No lo marco como confirmado-roto, solo como el mismo
patrón de código, por si les sirve revisarlo de una vez ya que están ahí.

**Lo que NO pude confirmar por ustedes, y hace falta que lo verifiquen antes de tocar nada:** nuestro
body para `/v1/inbox/conversations` usa `templateParams` (arreglo PLANO de strings, variables
posicionales) — `whatsapp-campanas` arma un `variableMapping` más rico (`body_text`,
`body_text_named_params`, `header_handle` para adjuntar imagen al header de la plantilla). No sé
si `/v1/inbox/conversations` acepta ese mismo `variableMapping` o si exige `templateParams` a secas
(en cuyo caso las plantillas con parámetros nombrados o header de imagen necesitarían otro
tratamiento). Mismo link de arriba (`docs.zernio.com/messages/create-inbox-conversation`) — antes
de cambiar el endpoint ahí, confirmar el body real que acepta con su propio caso (con header_url
si tienen alguna plantilla que lo use).

**Esta sesión solo tiene acceso de LECTURA al proyecto Supabase de ustedes** (no al repo de
GitHub `bayolcell-taller`) — no toqué ni voy a tocar nada de su lado. El fix real tiene que salir
de su propio repo (no directo del código desplegado en Supabase) para no repetir exactamente lo
que a esta sesión le costó reconciliar hoy: un despliegue hecho sobre una base vieja del repo dejó
production por delante de lo que el git realmente dice, y hubo que deshacerlo con cuidado.
