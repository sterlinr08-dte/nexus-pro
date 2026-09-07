# Envío Masivo de WhatsApp (reemplazo automatizado del WA Masivo actual) — Blueprint

> Generado por The Architect (modo brownfield) el 2026-09-07
> Shape: cambio sobre app existente (sin framework, sin build) · Backend Supabase (Postgres+RLS+RPC) + Edge Functions Deno
> Runtime track: N/A — no hay runtime track de este stack en el catálogo del plugin; ver §2
> Emisión: archivo único (11 pasos — ver §9 y la nota de modo abajo)
> Versión del blueprint: 1
> Versiones verificadas: 2026-09-07 — ver §11 (sin dependencias nuevas)

**Nota de modo:** la tarea que originó este blueprint pedía modo bundle. El propio `SKILL.md` de
The Architect deriva el modo del conteo de pasos de la sección 9 y lo prohíbe explícitamente
("never adjust a step count to reach a packaging you prefer, split steps on build reality"). El
build real de este cambio tiene 11 pasos honestos (ver el mapa de pasos en §9) — 11 o menos exige
archivo único, no bundle. Se sigue la regla del skill en vez de la preferencia inicial; queda
anotado en la bitácora de decisiones (§20.3, fila 7).

---

## 1. Project Overview & Non-Goals

### Visión
NEXUS PRO (correduría de seguros de salud, República Dominicana) ya manda notificaciones
automáticas de WhatsApp una por una (factura generada, atraso, pago aplicado) vía Zernio, y ya
tiene un inbox de dos vías para conversación real con clientes. Lo único que falta es que un agente
pueda mandarle **el mismo tipo de mensaje personalizado** (con el monto/saldo/vencimiento REAL de
cada cliente) **a muchos clientes de una sola vez**, sin abrir una pestaña de WhatsApp por cliente y
sin tener que darle "Enviar" a mano una por una — que es exactamente lo que hace hoy el botón
"WA Masivo".

### Usuarios
| Persona | Qué viene a hacer | Frecuencia |
|---|---|---|
| Agente de cobros/atención | Mandar factura del mes, recordatorio de saldo pendiente, o aviso de renovación a un grupo de clientes (por segmento o selección manual) | Semanal/mensual (ciclo de facturación), y cuando hace falta una campaña puntual |
| Dueño/admin | Revisar cuántos mensajes salieron bien y cuáles fallaron después de una tanda | Cada vez que se manda una tanda |

### Goals — alcance v1
1. Un agente puede elegir un segmento (deuda / renovación / al día / todos) o una lista manual de
   clientes y disparar UNA acción que manda a cada uno su propio mensaje personalizado
   (factura/pago pendiente/renovación), sin abrir ninguna pestaña de navegador.
2. El agente ve el progreso en vivo ("32 de 80 enviados") mientras la tanda corre, con los fallos
   puntuales marcados (ej. "teléfono duplicado") sin que un fallo detenga al resto de la tanda.
3. Ningún cliente puede recibir el mismo mensaje dos veces por la misma tanda, ni siquiera si el
   agente refresca la página o la conexión se corta a mitad de camino (el progreso vive en la base
   de datos, no solo en el navegador).
4. El flujo viejo (`wa.me` por cliente, click manual) queda completamente reemplazado — un solo
   camino que mantener.

### Non-Goals — explícitamente fuera de alcance v1

| No se construye | Por qué no ahora | Revisar cuando |
|---|---|---|
| Usar la API de Broadcasts de Zernio (`POST /v1/broadcasts` + `.../recipients` + `.../send`) | Verificado en vivo contra `docs.zernio.com/broadcasts/create-broadcast`: `template.variableMapping` solo puede tomar `name`/`phone`/`email`/`company` del contacto de Zernio, o UN valor estático (`field:"custom", customValue`) compartido por TODA la tanda — no hay forma de inyectar el saldo/monto propio de cada cliente. Esta es exactamente la personalización que el negocio pidió, así que Broadcasts queda descartado para este caso de uso | Si algún día se quiere mandar una campaña genérica que solo necesite el NOMBRE del cliente (ej. "feliz aniversario", sin montos), ahí sí Broadcasts es la herramienta correcta — ver §20.4 |
| Mandar adjuntos/fotos desde el envío masivo | El negocio pidió texto con monto, no adjuntos; agregar adjuntos multiplica el trabajo de las plantillas de Meta sin pedido real | Si se pide explícitamente mandar, por ejemplo, un PDF de la factura adjunto |
| Programar el envío para más adelante (agendar una tanda) | No se pidió — el flujo actual es "lo mando ahora" | Si el dueño pide poder dejar una tanda lista para las 8am del día siguiente |
| Editar el texto del mensaje desde la UI antes de mandar (más allá de elegir el tipo) | El texto sale de una plantilla de WhatsApp Business ya aprobada por Meta — no se puede editar libremente sin volver a pasar por aprobación | Si Meta permite edición de plantillas en vivo, lo cual no es el caso hoy |
| Reintentar automáticamente un destinatario que falló, sin que el agente lo pida | Un fallo (ej. número inválido) normalmente necesita corrección humana del dato, no un reintento ciego | Si se ve un patrón real de fallos transitorios (no de datos) que ameriten auto-reintento |
| Un panel de analítica/histórico de tandas pasadas más allá de ver el conteo final de la tanda actual | No se pidió; `whatsapp_envio_masivo_lotes` ya queda como registro para consultarlo a mano si hace falta | Si el dueño pide un reporte de campañas |
| Tocar `whatsapp_mensajes` (log de fase 1) o mezclar el envío masivo con ese log | Es la auditoría de las notificaciones automáticas por trigger — un feature distinto, con su propio CHECK de 3 tipos que no encaja con "envío masivo manual" | Nunca — son conceptualmente cosas distintas |

**El builder no debe implementar nada de esta tabla**, aunque parezca una mejora chica mientras
trabaja en un paso cercano.

### Métricas de éxito
| Métrica | Objetivo | Cómo se mide |
|---|---|---|
| Tandas enviadas sin que el agente tenga que hacer click "Enviar" por cliente | 100% de las tandas desde el lanzamiento | Cero uso del flujo `wa.me` viejo (que se elimina en este mismo cambio) |
| Mensajes perdidos/duplicados por refresco de página o corte de conexión | 0 | Auditoría de `whatsapp_envio_masivo_destinatarios`: cada fila pasa de `pendiente` a `enviado`/`fallido` exactamente una vez |

---

## 2. Tech Stack

**Runtime track: NOT APPLICABLE — este repo no usa un runtime track de paquete (no hay
`package.json`, no hay bundler, no hay gestor de paquetes para el frontend).** El plugin no tiene un
`knowledge/runtime-tracks/*.md` para "HTML/JS servido tal cual + Supabase Edge Functions en Deno", así
que esta tabla describe el stack real en vez de mapear a un track del catálogo.

| Capa | Elección | Por qué esto, sobre qué alternativa |
|---|---|---|
| Frontend | JS plano (ES2020+), sin framework, sin build | Ya es la arquitectura de todo `nexus-pro` — introducir React/Vue para un solo feature rompería la convención del repo (§19.1 de `CLAUDE.md`: "sin proceso de build, sin npm, sin bundler") |
| Acceso a datos (frontend) | Wrapper `API` (fetch contra PostgREST) ya existente en `index.html` | Ya existe y lo usa el 100% del resto de la app; no hay SDK de supabase-js en el frontend salvo Realtime en `parches-whatsapp-inbox.js`, que este cambio NO necesita (no hay tiempo real en el envío masivo, es polling explícito del agente) |
| Backend | Supabase (Postgres + RLS + RPC) | Ya es el backend de todo el proyecto |
| Lógica de servidor nueva | Edge Function Deno (`supabase/functions/whatsapp-envio-masivo/index.ts`) | Mismo patrón que `whatsapp-notificar`/`whatsapp-inbox-enviar`, que ya llaman a Zernio de forma probada en producción |
| Base de datos | PostgreSQL vía Supabase, RLS por organización | Ya existente; nuevas tablas siguen el mismo patrón `mi_rol()`/`mi_organizacion()` de `whatsapp_hilos`/`whatsapp_hilo_mensajes` |
| ORM / acceso a datos (Edge Function) | Cliente `@supabase/supabase-js` con `service_role`, **pin exacto `2.112.2`** (ya usado y fijado hoy mismo en `whatsapp-notificar`/`whatsapp-inbox-enviar`) | Un pin flotante (`jsr:@supabase/supabase-js@2`) resolvió una versión rota el mismo día de este blueprint (2026-09-07) — reutilizar el pin ya verificado, no volver a flotarlo |
| Auth (Edge Function) | JWT de usuario (`verify_jwt: true`), mismo patrón `resolverAcceso()` de `whatsapp-inbox-enviar` | Esta función la llama el navegador del agente logueado, no un cron — necesita saber quién es y a qué organización pertenece |
| Mensajería saliente | Zernio (API real de WhatsApp Business), endpoint 1 a 1 `POST /v1/inbox/conversations/{telefono}/messages` con `template.elements` | Ya probado en producción hoy mismo (`whatsapp-notificar`); NO se usa Broadcasts (ver §1 Non-Goals) |
| Hosting frontend | Cloudflare Workers (static assets), deploy automático al hacer push a `main` | Ya existente, sin cambios |
| Hosting backend | Supabase (migraciones + Edge Functions vía MCP tools) | Ya existente, sin cambios |
| Gestor de paquetes | NOT APPLICABLE — Deno resuelve imports por URL/JSR, sin lockfile de npm; el frontend no tiene gestor de paquetes en absoluto | — |

### Chequeo de compatibilidad
NOT APPLICABLE — no existe `knowledge/stack-compatibility.md` con una entrada para esta
combinación (HTML/JS estático + Supabase + Deno Edge Functions + Zernio); no se detectó ninguna
combinación conocida como mala dentro de lo que sí cubre el catálogo del plugin (todo lo relevante
ahí es sobre stacks npm/framework).

---

## 3. Directory Structure

```
nexus-pro/
  supabase/
    migrations/
      20260907XXXXXX_whatsapp_envio_masivo.sql   # NUEVO — paso 1 (§9): tablas + RLS + RPC
    functions/
      whatsapp-envio-masivo/
        index.ts                                  # NUEVO — paso 2 (§9): procesa un lote de a poco
  parches-whatsapp-inbox.js                        # MODIFICADO — pasos 4, 5 (§9): nuevo entrypoint + progreso
  index.html                                       # MODIFICADO — paso 6 (§9): se QUITA el flujo #mWAMasivo viejo
  version.json                                     # MODIFICADO — paso 7 (§9)
  blueprints/
    envio-masivo-whatsapp-blueprint.md             # este archivo (no se toca durante el build)
```

**Reglas de límite**
- Toda la lógica de cálculo de variables por tipo de mensaje (factura/pago/vence) vive DENTRO de
  `whatsapp-envio-masivo/index.ts` — no se reparte entre el frontend y la función. El frontend solo
  manda `{lote_id, limite}` y pinta lo que la función devuelve.
- `parches-whatsapp-inbox.js` es el ÚNICO archivo de frontend que gana lógica nueva (el entrypoint +
  la UI de progreso). `index.html` solo pierde código (el modal/funciones viejas) — no se le agrega
  nada.
- Nada de este cambio toca `whatsapp_mensajes`, `whatsapp_hilos`, `whatsapp_hilo_mensajes`, ni las
  Edge Functions `whatsapp-notificar`/`whatsapp-webhook`/`whatsapp-inbox-enviar` — son features
  aparte que deben seguir funcionando exactamente igual.

**Convención de resolución:** NOT APPLICABLE — este blueprint no declara ninguna convención de
imports/alias/especificadores. El frontend no tiene módulos ES (todo es scripts clásicos cargados
en cadena); la Edge Function nueva importa por URL JSR igual que sus hermanas ya existentes
(`jsr:@supabase/supabase-js@2.112.2`), sin alias ni resolución especial.

---

## 4. Data Model

### Entidades

**`whatsapp_envio_masivo_lotes`** — una tanda de envío masivo (una ejecución del botón "Enviar" del
agente). Vive mientras la tanda está en curso o como historial simple después.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | — |
| `organizacion_id` | uuid | FK `organizaciones.id`, not null | Siempre `nexus-pro` en la práctica; se guarda igual por consistencia con el resto del esquema multiempresa |
| `tipo` | text | not null, CHECK in `('factura','pago','vence')` | Mismos 3 tipos que ya usa el WA Masivo viejo (`selWATipo`) |
| `total_destinatarios` | int | not null, default 0 | Se fija al crear el lote |
| `enviados` | int | not null, default 0 | Recalculado por la Edge Function en cada llamada |
| `fallidos` | int | not null, default 0 | Ídem |
| `estado` | text | not null, default `'en_progreso'`, CHECK in `('en_progreso','completado')` | Pasa a `completado` cuando no quedan filas `pendiente` en destinatarios |
| `creado_por_usuario_id` | uuid | FK `auth.users(id)`, nullable | Quién disparó la tanda — informativo, no bloquea nada si es null |
| `created_at` | timestamptz | not null, default `now()` | — |
| `updated_at` | timestamptz | not null, default `now()` | Se actualiza cada vez que la Edge Function recalcula contadores |

**`whatsapp_envio_masivo_destinatarios`** — una fila por cliente dentro de una tanda. Es la fuente
de verdad de "a quién ya se le mandó" — sin esto, un refresco de página o un corte de red podría
mandar el mismo mensaje dos veces.

| Campo | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` | — |
| `lote_id` | uuid | FK `whatsapp_envio_masivo_lotes(id)` ON DELETE CASCADE, not null | — |
| `cliente_id` | uuid | FK `clientes(id)`, not null | — |
| `estado` | text | not null, default `'pendiente'`, CHECK in `('pendiente','enviado','fallido')` | La Edge Function solo toca filas en `pendiente` |
| `error_detalle` | text | nullable | Motivo si `estado='fallido'` (ej. "cliente sin WhatsApp registrado", el detalle que devuelva Zernio) |
| `zernio_message_id` | text | nullable | Se guarda si Zernio confirma el envío |
| `enviado_at` | timestamptz | nullable | Se fija al pasar a `enviado` o `fallido` |
| `created_at` | timestamptz | not null, default `now()` | — |
| — | — | UNIQUE `(lote_id, cliente_id)` | Un cliente no puede aparecer dos veces en la misma tanda |

### Relaciones
- `whatsapp_envio_masivo_lotes` —(1 a muchos)→ `whatsapp_envio_masivo_destinatarios`, cascada en
  DELETE (borrar una tanda de prueba limpia sus destinatarios).
- `whatsapp_envio_masivo_destinatarios` —(muchos a 1)→ `clientes`, sin cascada (si un cliente se
  borra, el historial de la tanda no debería desaparecer solo por eso — poco probable en la
  práctica, pero no se fuerza `ON DELETE CASCADE` sobre datos de clientes).

### Índices
| Tabla | Índice | Por qué |
|---|---|---|
| `whatsapp_envio_masivo_destinatarios` | `(lote_id) WHERE estado='pendiente'` | La Edge Function siempre selecciona "los próximos N pendientes de este lote" — este índice parcial es exactamente esa consulta |

### Schema
```sql
-- NEXUS PRO · Envío masivo de WhatsApp (reemplazo del flujo wa.me manual)
-- Separado a propósito de whatsapp_mensajes (log de las notificaciones automáticas por trigger,
-- fase 1) y de whatsapp_hilos/whatsapp_hilo_mensajes (inbox de dos vías, fase 2) -- esto es una
-- tercera cosa: tandas de envío disparadas a mano por un agente, con seguimiento de progreso.

create table public.whatsapp_envio_masivo_lotes (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id),
  tipo text not null check (tipo in ('factura', 'pago', 'vence')),
  total_destinatarios int not null default 0,
  enviados int not null default 0,
  fallidos int not null default 0,
  estado text not null default 'en_progreso' check (estado in ('en_progreso', 'completado')),
  creado_por_usuario_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_envio_masivo_lotes enable row level security;

create policy whatsapp_envio_masivo_lotes_lectura on public.whatsapp_envio_masivo_lotes
  for select
  using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

revoke all on public.whatsapp_envio_masivo_lotes from anon, authenticated;
grant select on public.whatsapp_envio_masivo_lotes to authenticated;

create table public.whatsapp_envio_masivo_destinatarios (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.whatsapp_envio_masivo_lotes(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'fallido')),
  error_detalle text,
  zernio_message_id text,
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lote_id, cliente_id)
);

alter table public.whatsapp_envio_masivo_destinatarios enable row level security;

create policy whatsapp_envio_masivo_destinatarios_lectura on public.whatsapp_envio_masivo_destinatarios
  for select
  using (mi_rol() is not null and mi_organizacion() = (select id from public.organizaciones where slug = 'nexus-pro'));

revoke all on public.whatsapp_envio_masivo_destinatarios from anon, authenticated;
grant select on public.whatsapp_envio_masivo_destinatarios to authenticated;

create index whatsapp_envio_masivo_destinatarios_pendientes_idx
  on public.whatsapp_envio_masivo_destinatarios (lote_id)
  where estado = 'pendiente';

-- RPC para crear un lote -- SECURITY DEFINER porque las tablas no tienen policy de INSERT para
-- authenticated a propósito (toda escritura pasa por acá o por la Edge Function con service_role).
-- Re-filtra a clientes activos con WhatsApp real como defensa en profundidad, aunque el frontend ya
-- filtra igual en waContactos() -- nunca confiar solo en el filtro del cliente.
create or replace function public.whatsapp_crear_lote_envio_masivo(p_tipo text, p_cliente_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org uuid;
  v_lote_id uuid;
begin
  if mi_rol() is null then
    raise exception 'no autorizado';
  end if;
  select id into v_org from public.organizaciones where slug = 'nexus-pro';
  if mi_organizacion() <> v_org then
    raise exception 'no autorizado';
  end if;
  if p_tipo not in ('factura', 'pago', 'vence') then
    raise exception 'tipo invalido: %', p_tipo;
  end if;
  if p_cliente_ids is null or array_length(p_cliente_ids, 1) is null then
    raise exception 'sin destinatarios';
  end if;

  insert into public.whatsapp_envio_masivo_lotes (organizacion_id, tipo, creado_por_usuario_id)
  values (v_org, p_tipo, auth.uid())
  returning id into v_lote_id;

  insert into public.whatsapp_envio_masivo_destinatarios (lote_id, cliente_id)
  select v_lote_id, c.id
  from public.clientes c
  where c.id = any(p_cliente_ids) and c.activo and c.wa is not null and c.wa <> ''
  on conflict (lote_id, cliente_id) do nothing;

  update public.whatsapp_envio_masivo_lotes
    set total_destinatarios = (
      select count(*) from public.whatsapp_envio_masivo_destinatarios where lote_id = v_lote_id
    )
    where id = v_lote_id;

  return v_lote_id;
end;
$$;

revoke all on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) from public, anon;
grant execute on function public.whatsapp_crear_lote_envio_masivo(text, uuid[]) to authenticated;
```

### Migraciones
Mismo mecanismo que el resto del proyecto: un archivo `.sql` bajo `supabase/migrations/`, aplicado
con la tool `mcp__claude_ai_Supabase__apply_migration` (o `supabase db push` si se corre desde la
CLI). Convención de nombre: `YYYYMMDDHHMMSS_whatsapp_envio_masivo.sql`, timestamp real al momento
de aplicar. Antes de aplicar de verdad: probar el archivo completo dentro de `begin; ... rollback;`
para confirmar que no hay errores de sintaxis (mismo hábito ya usado para las migraciones de fase 2
de WhatsApp esta misma sesión).

**Regla de producción:** esta migración es puramente aditiva (2 tablas nuevas, 1 función nueva) —
no toca ninguna tabla existente, así que no hay ventana de "expand luego contract" que gestionar.

### Datos semilla
NOT APPLICABLE — no hace falta ningún dato de arranque; las tablas empiezan vacías y se llenan
cuando un agente crea su primera tanda real.

---

## 5. API Design

### Convenciones
- Dos superficies nuevas: 1 RPC de Postgres (`whatsapp_crear_lote_envio_masivo`, ya en §4) y 1 Edge
  Function (`whatsapp-envio-masivo`).
- Envoltorio de respuesta de la Edge Function: éxito `{ ok: true, ...campos }`, error
  `{ ok: false, error: "<código corto>", detalle?: any }` — mismo patrón exacto que
  `whatsapp-inbox-enviar`/`whatsapp-notificar`.
- Sin paginación (no aplica — el "límite por llamada" de la Edge Function no es paginación de
  lectura, es control de cuántos mensajes reales se mandan en una sola invocación, ver abajo).
- Sin idempotency-key explícita: la idempotencia la da el propio modelo de datos (una fila
  `whatsapp_envio_masivo_destinatarios` solo puede pasar de `pendiente` a `enviado`/`fallido` una
  vez — la Edge Function siempre filtra por `estado='pendiente'` antes de tocar una fila).
- Límite de velocidad: no es un rate-limit de la API en sí, sino un límite deliberado de
  **destinatarios procesados por invocación** (default 15) con una pausa corta entre cada envío a
  Zernio dentro de esa invocación (600ms) — así una tanda de 300 clientes nunca intenta mandar 300
  mensajes en un solo request, que arriesgaría el límite de tiempo de ejecución de la Edge Function
  y el rate-limit real de la API de WhatsApp Business.

### Rutas

| Método | Ruta | Descripción | Auth | Límite |
|---|---|---|---|---|
| POST | `rpc/whatsapp_crear_lote_envio_masivo` | Crea un lote + sus filas de destinatarios | Usuario autenticado de `nexus-pro` (RLS/RPC) | — |
| POST | `/functions/v1/whatsapp-envio-masivo` | Procesa hasta `limite` destinatarios pendientes de un lote | JWT de usuario autenticado de `nexus-pro` | Se llama repetidas veces desde el frontend hasta que `terminado:true` |

### Endpoints críticos — detalle completo

#### `POST /functions/v1/whatsapp-envio-masivo`

**Request**
```json
{ "lote_id": "uuid", "limite": 15 }
```
`limite` es opcional, default `15`, tope duro `50` (para no alargar demasiado una sola invocación).

**Verificación de acceso** — idéntica a `whatsapp-inbox-enviar/index.ts` (`resolverAcceso(sub)`):
decodifica el JWT del header `Authorization`, resuelve `profiles → usuarios_sistema →
organizaciones` y confirma que la organización sea `nexus-pro`. Sin esto, `401 no_autorizado` — el
`service_role` que la función usa para leer/escribir las tablas NO reemplaza este chequeo, es
exactamente al revés: el chequeo decide si se usa el `service_role` en absoluto.

**Cuerpo del procesamiento**
1. Leer el lote (`whatsapp_envio_masivo_lotes`), confirmar `organizacion_id` = la del que llama →
   si no, `403`. Si el lote no existe, `404`.
2. Seleccionar hasta `limite` filas de `whatsapp_envio_masivo_destinatarios` con
   `lote_id = ... and estado = 'pendiente'`, unidas a `clientes` para los datos que hacen falta
   según `lote.tipo`:
   - `factura`: `clientes.nom`, `clientes.wa`, más el `total` de la factura más reciente de ese
     cliente (`select total from public.facturas where cliente_id = $1 order by created_at desc
     limit 1`) — igual que `ejecutarWAMasivo()` en `index.html` (usa `f.total` de la factura más
     reciente, cayendo a `getTot(c)` solo si el cliente no tiene ninguna factura todavía; para v1 de
     este cambio, si no hay ninguna factura se salta ese destinatario como `fallido` con
     `error_detalle:"cliente sin facturas generadas"` — reimplementar el motor de precios completo
     de `getTot()`/`getPT()`/`getPD()` queda fuera de este blueprint, ver §20.4).
   - `pago`: `clientes.nom`, `clientes.wa`, `clientes.deuda_total`, `clientes.pagado` → variable =
     `GREATEST(0, deuda_total - pagado)`, exactamente la fórmula de `pend(c)` en `index.html`
     (`const pend=c=>Math.max(0,(c.deuda_total||0)-(c.pagado||0));`).
   - `vence`: `clientes.nom`, `clientes.wa`, `clientes.numero_poliza`, `clientes.fecha_fin` — el
     mensaje usa la fecha tal cual, igual que `ejecutarWAMasivo()` (no repite el cálculo de días de
     `getEstPol()`, ya que ese solo se usa para el badge visual, no para el texto del mensaje).
3. Para cada destinatario de ese lote de hasta `limite`, en orden, uno por uno (nunca en paralelo —
   evita ráfagas contra la API de WhatsApp):
   a. Si el cliente no tiene `wa` válido o (para `factura`) no tiene ninguna factura: marcar esa
      fila `fallido` con el motivo, sin llamar a Zernio.
   b. Si no: armar las variables de la plantilla según el tipo (ver tabla abajo) y llamar a Zernio
      con el MISMO patrón ya probado en `whatsapp-notificar/index.ts`
      (`formatearTelefono`, `armarComponents`, `mandarConReintento` — reusar esas funciones tal
      cual, no reescribirlas): `POST https://zernio.com/api/v1/inbox/conversations/{telefono}/messages`
      con `{accountId, template:{elements:[{name, language:"es", components:[{type:"body",
      parameters:[...]}]}]}}`.
   c. Actualizar la fila del destinatario: `estado='enviado'` + `zernio_message_id` si Zernio
      respondió éxito; `estado='fallido'` + `error_detalle` si no.
   d. Esperar 600ms antes del siguiente destinatario del mismo lote de `limite` (no antes del
      primero).
4. Recontar `enviados`/`fallidos` del lote completo (no solo de este batch) y actualizar
   `whatsapp_envio_masivo_lotes` (`updated_at = now()`, y `estado='completado'` si ya no quedan
   filas `pendiente`).
5. Responder `{ ok: true, procesados: <cuántas filas tocó ESTA llamada>, restantes: <cuántas
   'pendiente' quedan>, terminado: <boolean> }`.

**Nombres de plantilla por tipo** (variables en el mismo orden `[nombre, ...]` que
`whatsapp-notificar` ya usa para sus propios 4 tipos):

| `lote.tipo` | Nombre de plantilla Zernio/Meta | Variables | Plantilla ya aprobada hoy |
|---|---|---|---|
| `factura` | `factura_generada` | `[nombre, monto_formateado, "<mes actual> <año actual>"]` | **Sí** — es la misma que usa `whatsapp-notificar` para el evento automático |
| `pago` | `recordatorio_pago_pendiente` (NUEVA) | `[nombre, saldo_formateado]` | **No** — hay que crearla y conseguir que Meta la apruebe antes de poder mandar este tipo de verdad (ver §10, no es un paso de build) |
| `vence` | `poliza_por_vencer` (NUEVA) | `[nombre, numero_poliza, fecha_fin]` | **No** — ídem |

**Por qué no reusar `atrasado`/`recordatorio_atraso` para `pago`:** esa plantilla existente incluye
"X meses de atraso" en su contenido (pensada para el cron de morosidad, con semántica de "estás
atrasado"), mientras que el botón "Recordar deuda" del WA Masivo manda un tono distinto ("tienes un
saldo pendiente", sin implicar mora) a cualquier cliente con `pend(c)>0`, esté o no técnicamente
atrasado. Forzar la plantilla vieja cambiaría el tono del mensaje sin que nadie lo haya pedido.

**Errores**
| Código | Cuándo |
|---|---|
| `401 no_autorizado` | JWT inválido o el usuario no pertenece a `nexus-pro` |
| `400 falta_lote_id` | Body sin `lote_id` |
| `404 lote_no_encontrado` | El `lote_id` no existe o no pertenece a la organización del que llama |
| `409 lote_ya_completado` | El lote ya no tiene destinatarios pendientes (el frontend debe dejar de llamar apenas reciba `terminado:true`, esto es defensa adicional) |
| `500 error_interno` | Cualquier excepción no prevista — capturada en un `try/catch` de nivel superior alrededor de todo el manejo del request, igual que `whatsapp-inbox-enviar` (nunca dejar que una excepción llegue a la plataforma como 500 crudo sin loguear primero) |

---

## 6. Frontend Architecture

### Rutas
NOT APPLICABLE en el sentido de rutas de un router de SPA — esta app no tiene router, es
`index.html` con vistas que se muestran/ocultan por `nav('<vista>')`. El envío masivo vive DENTRO de
la vista existente "WhatsApp Inbox" (`#v-waInbox`, definida en `parches-whatsapp-inbox.js`), no
como una vista nueva.

| "Ruta" (vista) | Página | Fuente de datos | Auth |
|---|---|---|---|
| `#v-waInbox` (ya existente, panel "Centro WhatsApp Pro") | Botones de segmento (`nxWaAbrirMasivoSegmento`) pasan a abrir el flujo nuevo en vez de `abrirWAMasivo(ids)` | `clientes()` (ya cargado en memoria) + polling del nuevo endpoint mientras una tanda está en curso | Sesión de agente ya logueado (sin cambios) |

### Estrategia de renderizado
NOT APPLICABLE — no hay SSR/SSG/hidratación; todo es JS del lado del cliente que reescribe
`innerHTML` directamente, igual que el resto de `parches-whatsapp-inbox.js`.

### Jerarquía de componentes
```
#v-waInbox
└── #nxWaProPanel ("Centro WhatsApp Pro", ya existe)
    └── botones de segmento (ya existen: nxWaAbrirMasivoSegmento)
        └── [NUEVO] panel/overlay de confirmación + progreso de envío masivo
            ├── resumen: "X clientes recibirán <tipo>" + botón "Confirmar y enviar"
            └── (tras confirmar) barra de progreso + lista de fallos puntuales + botón "Cerrar"
```

### Manejo de estado
- Estado del lote en curso vive en la BASE DE DATOS (`whatsapp_envio_masivo_lotes`/
  `_destinatarios`), no solo en una variable de JS — así un refresco de página no pierde el
  progreso ni permite un doble envío.
- El frontend mantiene únicamente: el `lote_id` activo (si hay uno) y un flag "está corriendo el
  polling ahora mismo" (para no disparar dos loops de polling en paralelo si el agente hace doble
  click).
- Nada de esto se guarda en `localStorage` — si el agente cierra la pestaña a mitad de una tanda, el
  progreso sigue existiendo en la base (puede consultarse volviendo a abrir el panel y leyendo el
  lote por id), pero v1 no reabre automáticamente un polling huérfano al recargar — eso es una
  mejora de UX razonable para después (ver §20.4), no algo que bloquee v1.

### Estados de carga, vacío y error
| Estado | Qué se muestra |
|---|---|
| Cargando (creando el lote) | Botón "Confirmar y enviar" deshabilitado + spinner, mismo patrón visual que otros botones de la app |
| Vacío (segmento sin clientes con WhatsApp) | Toast de aviso, igual que el código ya existente (`toast('warn','Sin contactos', ...)`) — sin cambios, ya está bien resuelto |
| En progreso | Barra/contador "X de Y enviados", con los fallos listados debajo a medida que ocurren (nombre del cliente + motivo corto) |
| Error de red al llamar a la Edge Function | Toast de error + botón "Reintentar" que vuelve a llamar al mismo `lote_id` (los ya enviados no se repiten, por el filtro `estado='pendiente'`) |
| Completado | Resumen final: "78 enviados, 2 fallidos" + botón para ver el detalle de los fallidos |

---

## 7. Design System

**No se define un sistema de diseño nuevo.** Por la enmienda del dueño en `CLAUDE.md`
("no es quien manda por encima, sino lo que más conviene") y `NPGS.md` como máxima autoridad de
diseño ya existente en el repo, este cambio reutiliza tal cual los tokens/clases que
`parches-whatsapp-inbox.js` YA usa en el mismo panel ("Centro WhatsApp Pro"):

| Elemento nuevo | Clase/patrón reusado | De dónde |
|---|---|---|
| Panel de confirmación antes de enviar | `.nxWaPro` / `.nxft-tabs` (mismo look de tarjeta + pestañas) | Ya definido en el CSS de `parches-whatsapp-inbox.js` |
| Barra de progreso | Un `<div>` con ancho `%` inline sobre el fondo `--wa-b`/`--wa-b2` (gradiente verde/azul de WhatsApp ya usado en `.nxWaComposer button`) | Mismo gradiente, sin inventar un color nuevo |
| Botones de acción | `.btn` con las variantes `bwa` (verde WhatsApp) / `bghost` ya existentes en `index.html` | Reuso directo |
| Lista de fallos puntuales | `.nxWaEmpty`/`.nxWaContact` (misma tarjeta chica de contacto ya usada en la lista de contactos del panel) | Reuso directo |

No hace falta ninguna tabla de colores/tipografía nueva — cero tokens nuevos, cero contraste que
verificar de cero (los componentes reusados ya cumplen lo que `NPGS.md` exige, al ser los mismos
componentes que el resto de la vista).

### Movimiento
La barra de progreso se actualiza por reemplazo de `innerHTML` (mismo patrón del resto de la app),
sin animación CSS de transición — evita cualquier problema con `prefers-reduced-motion` porque
simplemente no hay movimiento animado que respetar.

---

## 8. Authentication & Authorization

### Proveedor y justificación
Sin cambios — Supabase Auth, ya en uso por toda la app (`usuario@nexus-pro.local`, sesión armada
desde `profiles`).

### Flujos
NOT APPLICABLE — este cambio no agrega ningún flujo de autenticación nuevo (sign-up, reset de
contraseña, etc.); usa la sesión que el agente YA tiene abierta.

### Protección de rutas
| Superficie | Regla | Dónde se aplica |
|---|---|---|
| RPC `whatsapp_crear_lote_envio_masivo` | `mi_rol() is not null and mi_organizacion() = nexus-pro` | Dentro de la propia función SQL (`security definer`), no en el cliente |
| Edge Function `whatsapp-envio-masivo` | JWT válido + `resolverAcceso()` confirma organización `nexus-pro` | Dentro de `manejar(req)`, igual que `whatsapp-inbox-enviar` |
| Lectura de `whatsapp_envio_masivo_lotes`/`_destinatarios` | RLS: `mi_rol() is not null and mi_organizacion() = nexus-pro` | Policies de Postgres — nunca solo del lado del cliente |

**Regla de refuerzo:** la autorización se verifica del lado del servidor en cada capa (RPC Y Edge
Function), nunca solo ocultando el botón en la UI.

### Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Cualquier usuario autenticado de `nexus-pro` | Crear una tanda, ver el progreso de cualquier tanda de su organización | Ver/tocar tandas de otra organización (no aplica hoy, `nexus-pro` es mono-organización para este feature, pero la policy ya lo deja preparado) |

### Sesiones
Sin cambios — mismo JWT de Supabase Auth que ya usa el resto de la app.

### Multi-tenancy / aislamiento por fila
Mismo mecanismo ya establecido: `mi_organizacion()` (security definer, resuelve
`auth.uid() → profiles → usuarios_sistema → organizacion_id`) comparado contra el id de la
organización `nexus-pro` en cada policy — no "acordarse de filtrar", es una policy real que Postgres
aplica siempre.

---

## 9. BUILD ORDER

**Nota sobre Meta/plantillas:** crear y conseguir la aprobación de Meta para las 2 plantillas nuevas
(`recordatorio_pago_pendiente`, `poliza_por_vencer`) depende de un tercero (Meta) y puede tardar
días — por regla del propio proceso de blueprints, eso **no es un paso de build** (nada que dependa
de la aprobación de un tercero puede ser un gate que un script decida). Vive en §10 como
prerrequisito a arrancar en paralelo desde el día 1, y en el checklist de lanzamiento post-build. El
build de código de abajo NO se bloquea por eso: el tipo `factura` (que reusa una plantilla YA
aprobada) se puede probar de punta a punta hoy mismo; `pago`/`vence` quedan con el código listo y se
verifican en vivo apenas Meta apruebe las plantillas (paso 10 lo cubre explícitamente).

### Mapa de pasos

| # | Paso | Depende de | Toca | Gate |
|---|---|---|---|---|
| 1 | Migración: tablas + RLS + RPC | — | 1 migración nueva | La migración aplica sin error y las policies bloquean a `anon` |
| 2 | Edge Function — estructura base + tipo `factura` | 1 | 1 función nueva | Deploy + llamada real con un cliente de prueba, `estado:'enviado'` |
| 3 | Edge Function — agregar tipos `pago` y `vence` | 2 | misma función | Deploy + llamada de prueba que confirma que arma el nombre/variables correctos para ambos tipos (sin necesitar la plantilla ya aprobada, ver el paso) |
| 4 | Frontend: RPC de creación de lote + nuevo entrypoint | 1 | `parches-whatsapp-inbox.js` | `node --check` + confirmar que `nxWaAbrirMasivoSegmento` ya no llama a `abrirWAMasivo` |
| 5 | Frontend: UI de progreso en vivo | 3, 4 | `parches-whatsapp-inbox.js` | `node --check` + prueba manual de una tanda real chica |
| 6 | Frontend: quitar el flujo viejo | 5 | `index.html` | `node --check index.html`-equivalente (ver Verify) + confirmar que `#mWAMasivo` ya no existe en el DOM |
| 7 | Subir `APP_VERSION` + `version.json` | 6 | `index.html`, `version.json` | Los dos números coinciden |
| 8 | Seguridad: advisors sobre las tablas nuevas | 1 | — (solo verificación) | `get_advisors` no reporta ningún hallazgo nuevo de RLS sobre estas 2 tablas |
| 9 | Prueba manual end-to-end (tipo `factura`, clientes reales de prueba) | 5, 7 | — | Una tanda de 2-3 clientes de prueba corre de punta a punta desde la UI real |
| 10 | Prueba manual de `pago`/`vence` en vivo, una vez Meta aprueba las plantillas | 3 (código), aprobación externa (fuera del build) | — | No gatea el resto del build — se ejecuta cuando la aprobación llegue |
| 11 | Commit + autorización del dueño + push a `main` | 7, 8, 9 | — | Push solo con "sí" explícito del dueño en el momento |

**Heurística de orden aplicada:** dato (1) → función de servidor con la porción ya desbloqueable
(2) → resto de la función (3, no bloquea nada más) → frontend que consume la función (4, 5) →
limpieza del código viejo (6) → versión (7) → seguridad + prueba real (8, 9) → paso externo anotado
en su lugar sin bloquear (10) → release con autorización explícita (11, siempre el último).

---

#### Paso 1 — Migración: tablas + RLS + RPC de creación de lote

**Do**
Crear `supabase/migrations/<timestamp>_whatsapp_envio_masivo.sql` con el contenido exacto de §4
(las 2 tablas, sus policies, el índice parcial, y la función
`whatsapp_crear_lote_envio_masivo`). Antes de aplicarla de verdad, probarla dentro de
`begin; ... rollback;` para descartar errores de sintaxis.

**Done when**
- [ ] WHEN la migración se aplica sobre la base real THE SYSTEM SHALL crear las tablas
      `whatsapp_envio_masivo_lotes` y `whatsapp_envio_masivo_destinatarios` con RLS habilitado en
      ambas.
- [ ] WHEN un usuario `anon` intenta leer `whatsapp_envio_masivo_lotes` THE SYSTEM SHALL devolver
      cero filas (bloqueado por RLS, no por falta de datos).
- [ ] WHEN se llama a `whatsapp_crear_lote_envio_masivo('factura', ARRAY[]::uuid[])` (arreglo vacío)
      THE SYSTEM SHALL lanzar la excepción `sin destinatarios` y no insertar ninguna fila.
- [ ] WHEN se llama a `whatsapp_crear_lote_envio_masivo('tipo_invalido', ARRAY[<un cliente_id
      real>]::uuid[])` THE SYSTEM SHALL lanzar `tipo invalido: tipo_invalido`.
- [ ] WHEN se llama con un tipo válido y al menos un `cliente_id` real, activo y con `wa` no vacío
      THE SYSTEM SHALL devolver un `uuid` de lote y crear exactamente una fila en
      `whatsapp_envio_masivo_destinatarios` por cada cliente activo-con-wa de la lista pasada.

**Verify**
```sql
-- (ejecutar contra la base real de nexus-pro, vía el SQL editor de Supabase o la CLI)
select exists(select 1 from information_schema.tables where table_name = 'whatsapp_envio_masivo_lotes' and table_schema='public');
-- expect: t
select exists(select 1 from information_schema.tables where table_name = 'whatsapp_envio_masivo_destinatarios' and table_schema='public');
-- expect: t
select relrowsecurity from pg_class where relname = 'whatsapp_envio_masivo_lotes';
-- expect: t
select relrowsecurity from pg_class where relname = 'whatsapp_envio_masivo_destinatarios';
-- expect: t
select proname from pg_proc where proname = 'whatsapp_crear_lote_envio_masivo';
-- expect: una fila, whatsapp_crear_lote_envio_masivo
set local role anon;
select count(*) from public.whatsapp_envio_masivo_lotes;
reset role;
-- expect: 0 (RLS bloquea, no hace falta que existan filas)

-- Simular una sesion autenticada real de un usuario de nexus-pro (mismo patron ya usado en esta
-- sesion para probar RLS a mano) -- sin esto mi_rol()/mi_organizacion() devuelven null en el SQL
-- editor y el RPC fallaria con "no autorizado" antes de llegar a los 2 chequeos que se quieren
-- probar aca.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '<uuid de un usuario real de nexus-pro>')::text, true);

do $$
begin
  perform public.whatsapp_crear_lote_envio_masivo('factura', array[]::uuid[]);
  raise exception 'FALLO DEL CHEQUEO: el RPC no lanzo ninguna excepcion con un arreglo vacio';
exception
  when others then
    if sqlerrm <> 'sin destinatarios' then raise; end if;
end $$;
-- expect: el bloque DO completa sin relanzar (el SQLERRM real fue exactamente 'sin destinatarios')
-- -- si el RPC no fallo, o fallo con un mensaje distinto, este bloque relanza y el script se corta

do $$
begin
  perform public.whatsapp_crear_lote_envio_masivo('tipo_invalido', array['00000000-0000-0000-0000-000000000000'::uuid]);
  raise exception 'FALLO DEL CHEQUEO: el RPC no lanzo ninguna excepcion con un tipo invalido';
exception
  when others then
    if sqlerrm <> 'tipo invalido: tipo_invalido' then raise; end if;
end $$;
-- expect: el bloque DO completa sin relanzar

reset role;
```

**Checkpoint**
```bash
git add -A && git commit -m "step 1: migracion envio masivo whatsapp (tablas + RLS + RPC)"
git tag step-01-migracion-envio-masivo
# rollback si el paso 2 sale mal: git reset --hard step-01-migracion-envio-masivo
```

---

#### Paso 2 — Edge Function whatsapp-envio-masivo: estructura base + tipo `factura`

**Do**
Crear `supabase/functions/whatsapp-envio-masivo/index.ts`. Reusar textualmente de
`supabase/functions/whatsapp-inbox-enviar/index.ts`: `subDelJWT`, `resolverAcceso` (adaptado —
esta función no necesita resolver un `agenteId`, solo confirmar que el usuario pertenece a
`nexus-pro`), el patrón de `json()`/CORS/try-catch de nivel superior. Reusar textualmente de
`supabase/functions/whatsapp-notificar/index.ts`: `formatearTelefono`, `armarComponents`,
`mandarPlantilla`, `mandarConReintento`, `esConversacionNoEncontrada`, `esTimeout`. Pin de import:
`jsr:@supabase/supabase-js@2.112.2` (NO flotante — ver §2).

Implementar `manejar(req)`:
1. Verificar acceso (401 si falla).
2. Leer `{lote_id, limite=15}` del body (400 si falta `lote_id`).
3. Leer el lote, confirmar organización (403/404 según corresponda). Si `estado='completado'`,
   responder `409 lote_ya_completado`.
4. Seleccionar hasta `limite` filas `pendiente` de `whatsapp_envio_masivo_destinatarios` para ese
   lote, unidas a `clientes`.
5. **Solo para `lote.tipo === 'factura'`** en este paso: por cada destinatario, buscar su factura
   más reciente (`select total from facturas where cliente_id=$1 order by created_at desc limit 1`);
   si no hay ninguna, marcar esa fila `fallido` con `error_detalle:'cliente sin facturas
   generadas'` sin llamar a Zernio; si hay, armar `[nombre, monto_formateado, "<mes> <año>"]` y
   llamar a `mandarConReintento` con el nombre de plantilla `'factura_generada'`. Esperar 600ms
   entre destinatarios.
6. Actualizar cada fila (`enviado`/`fallido` + `zernio_message_id`/`error_detalle` +
   `enviado_at`), luego recontar y actualizar el lote (`enviados`, `fallidos`, `estado`,
   `updated_at`).
7. Responder `{ok:true, procesados, restantes, terminado}`.

Los tipos `pago`/`vence` quedan explícitamente NO implementados en este paso — si `lote.tipo` no es
`'factura'`, responder `400 tipo_no_soportado_aun` (temporal, el paso 3 lo completa).

**Done when**
- [ ] WHEN se llama sin un JWT válido THE SYSTEM SHALL responder `401` con
      `{ok:false, error:"no_autorizado"}`.
- [ ] WHEN se llama con `lote_id` de un lote `tipo='factura'` que tiene un destinatario cuyo
      cliente SÍ tiene al menos una factura THE SYSTEM SHALL llamar a Zernio con
      `template.elements[0].name === "factura_generada"` y, si Zernio responde éxito, dejar esa
      fila en `estado='enviado'` con `zernio_message_id` no nulo.
- [ ] WHEN un destinatario del lote no tiene ninguna factura THE SYSTEM SHALL marcar su fila
      `fallido` con `error_detalle` mencionando la ausencia de facturas, y SHALL NOT llamar a
      Zernio para ese destinatario.
- [ ] WHEN todos los destinatarios pendientes de un lote quedan procesados en una sola llamada
      THE SYSTEM SHALL responder `terminado:true` y dejar `whatsapp_envio_masivo_lotes.estado =
      'completado'`.
- [ ] WHEN se llama con un `lote_id` que ya tiene `estado='completado'` THE SYSTEM SHALL responder
      `409` con `{ok:false, error:"lote_ya_completado"}` y no tocar ninguna fila.
- [ ] WHEN se llama con `lote.tipo` distinto de `'factura'` THE SYSTEM SHALL responder `400` con
      `{ok:false, error:"tipo_no_soportado_aun"}` (temporal hasta el paso 3).

**Verify**
```bash
# Sintaxis: Deno no tiene "node --check", pero el deploy real (siguiente paso) SÍ falla si el
# archivo no compila -- no hay forma de chequear sintaxis TypeScript de Deno sin desplegar o sin un
# toolchain de Deno instalado localmente (no está instalado en este repo). Se difiere la
# verificación de sintaxis al paso 3 (deploy real), consistente con cómo se verificaron
# whatsapp-notificar/whatsapp-inbox-enviar esta misma sesión: escribir -> desplegar -> probar en
# vivo, no un chequeo estático aparte.
test -f supabase/functions/whatsapp-envio-masivo/index.ts
# expect: exit 0 (el archivo existe)
grep -q "factura_generada" supabase/functions/whatsapp-envio-masivo/index.ts
# expect: exit 0 (el nombre de plantilla correcto está presente)
grep -q "2.112.2" supabase/functions/whatsapp-envio-masivo/index.ts
# expect: exit 0 (el pin correcto, no un @2 flotante)
```
Este paso todavía no despliega la función (eso es el paso 3), así que el 401 y el 409 de arriba —
que son comportamiento HTTP, no algo que un `grep` sobre el código fuente pueda decidir — se
verifican en vivo recién en el bloque de despliegue del paso 3, que es la primera vez que la
función existe como endpoint real (ver ese paso).

**Checkpoint**
```bash
git add -A && git commit -m "step 2: whatsapp-envio-masivo -- estructura base + tipo factura"
git tag step-02-edge-function-factura
```

---

#### Paso 3 — Edge Function: agregar tipos `pago` y `vence`

**Do**
Extender el mismo archivo del paso 2: agregar el cálculo de variables para `pago`
(`[nombre, GREATEST(0, deuda_total - pagado) formateado]`, plantilla `'recordatorio_pago_pendiente'`)
y `vence` (`[nombre, numero_poliza, fecha_fin]`, plantilla `'poliza_por_vencer'`). Quitar la
respuesta `400 tipo_no_soportado_aun` — los 3 tipos ya quedan cubiertos por el mismo bloque de
selección + envío + actualización del paso 2 (parametrizado por tipo, no una función separada por
tipo).

**Done when**
- [ ] WHEN se llama con un lote `tipo='pago'` THE SYSTEM SHALL armar `template.elements[0].name ===
      "recordatorio_pago_pendiente"` con `parameters` = `[nombre, saldo_formateado]`, donde
      `saldo_formateado` es exactamente `GREATEST(0, deuda_total - pagado)` de ese cliente,
      formateado con 2 decimales.
- [ ] WHEN se llama con un lote `tipo='vence'` THE SYSTEM SHALL armar `template.elements[0].name
      === "poliza_por_vencer"` con `parameters` = `[nombre, numero_poliza, fecha_fin]`.
- [ ] WHEN Zernio responde `404 CONVERSATION_NOT_FOUND` para cualquiera de los 3 tipos THE SYSTEM
      SHALL reintentar hasta 2 veces con una espera de 2000ms entre intentos, igual que
      `mandarConReintento` en `whatsapp-notificar`.
- [ ] WHEN Zernio responde que la plantilla no existe o no está aprobada (esperable para `pago`/
      `vence` hasta que Meta las apruebe) THE SYSTEM SHALL marcar esa fila `fallido` con el detalle
      crudo que Zernio devolvió, y SHALL NOT lanzar una excepción no capturada.

**Verify**
```bash
grep -q "recordatorio_pago_pendiente" supabase/functions/whatsapp-envio-masivo/index.ts
# expect: exit 0
grep -q "poliza_por_vencer" supabase/functions/whatsapp-envio-masivo/index.ts
# expect: exit 0
test -f supabase/functions/whatsapp-envio-masivo/index.ts
# expect: exit 0
grep -q "tipo_no_soportado_aun" supabase/functions/whatsapp-envio-masivo/index.ts; test $? -eq 1
# expect: exit 0 (grep sale 1 = "no encontrado" -- la respuesta temporal del paso 2 ya no está; un
# codigo 2 de grep, que es un error real de archivo, haria fallar este chequeo -- a diferencia de
# usar "!", que hubiera aceptado un 2 igual que un 1)
```

Despliegue + prueba en vivo (ejecutado por el humano vía las tools de Supabase, ya que un `git
commit` no despliega nada por sí solo). Este es tambien el primer momento en que se puede probar el
comportamiento HTTP (401/409) que el paso 2 solo dejo declarado en su "Done when" sin un Verify que
lo ejecutara -- recien aca la funcion existe como endpoint real:
```text
1) Desplegar la función: ejecutado vía la tool mcp__claude_ai_Supabase__deploy_edge_function, no un
   comando de shell del repo (mismo estilo que el paso 8 usa para get_advisors).
0) Obtener la URL del proyecto y la clave pública, para usarlas en la terminal del operador (donde
   NADA las exporta automáticamente, a diferencia de dentro de la propia Edge Function) -- vía las
   tools reales del proyecto, NUNCA copiadas de memoria ni adivinadas (ver §10):
   - mcp__claude_ai_Supabase__get_project_url            -> guardar el resultado como SUPABASE_URL
   - mcp__claude_ai_Supabase__get_publishable_api_key    -> guardar el resultado como SUPABASE_ANON_KEY
```
```bash
# Con los 2 valores del punto 0 ya en mano, exportarlos como variables literales (no como
# sustitución de comando -- las dos tools de arriba no son binarios de shell):
export SUPABASE_URL="<el valor real devuelto por get_project_url>"
export SUPABASE_ANON_KEY="<el valor real devuelto por get_publishable_api_key>"

# 2a) Probar el 401 del paso 2 -- llamar SIN Authorization. El comando literal empieza con "curl"
# (nunca con una asignacion de variable delante) para que el permiso Bash(curl:*) lo cubra:
curl -s -o /tmp/resp-401.json -w '%{http_code}' -X POST \
  "$SUPABASE_URL/functions/v1/whatsapp-envio-masivo" \
  -H "Content-Type: application/json" -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"lote_id":"00000000-0000-0000-0000-000000000000"}' > /tmp/codigo-401.txt
grep -qx 401 /tmp/codigo-401.txt
# expect: exit 0 (codigo HTTP fue exactamente 401)
grep -q '"error":"no_autorizado"' /tmp/resp-401.json
# expect: exit 0

# 2b) Insertar un lote de prueba tipo 'pago' con 1 destinatario real de prueba (via SQL directo):
#    select whatsapp_crear_lote_envio_masivo('pago', ARRAY['<id de un cliente de prueba>']::uuid[]);
# 3) Llamar a la función con ese lote_id, con un JWT real de un agente de nexus-pro
# expect: la fila de destinatario queda en 'fallido' con un error_detalle que menciona la
#         plantilla/template (esperado -- Meta todavia no aprobo 'recordatorio_pago_pendiente'),
#         NUNCA un 500 sin loguear ni una excepcion no capturada. Esto prueba que el CODIGO arma
#         bien el nombre/variables sin necesitar la aprobacion de Meta todavia. Tras esta llamada
#         el lote ya no tiene destinatarios 'pendiente', asi que whatsapp_envio_masivo_lotes.estado
#         pasa a 'completado' -- eso es lo que el siguiente chequeo (4) necesita para probar el 409.

# 4) Probar el 409 del paso 2 -- volver a llamar a la funcion con el MISMO lote_id ya completado:
curl -s -o /tmp/resp-409.json -w '%{http_code}' -X POST \
  "$SUPABASE_URL/functions/v1/whatsapp-envio-masivo" \
  -H "Content-Type: application/json" -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer <JWT real de un agente de nexus-pro>" \
  -d '{"lote_id":"<el mismo lote_id ya completado del paso 3>"}' > /tmp/codigo-409.txt
grep -qx 409 /tmp/codigo-409.txt
# expect: exit 0 (codigo HTTP fue exactamente 409)
grep -q '"error":"lote_ya_completado"' /tmp/resp-409.json
# expect: exit 0
```
```sql
-- confirmar que la llamada del punto 4 no toco ninguna fila de nuevo:
select estado, enviado_at from public.whatsapp_envio_masivo_destinatarios
where lote_id = '<el mismo lote_id ya completado del paso 3>';
-- expect: las mismas filas y los mismos enviado_at de antes del punto 4 (nada cambio)
```

**Checkpoint**
```bash
git add -A && git commit -m "step 3: whatsapp-envio-masivo -- agregar tipos pago y vence"
git tag step-03-edge-function-completa
```

---

#### Paso 4 — Frontend: RPC de creación de lote + nuevo entrypoint

**Do**
En `parches-whatsapp-inbox.js`:
- Agregar `window.nxWaIniciarEnvioMasivo(tipo, clienteIds)`: llama a
  `api().post('rpc/whatsapp_crear_lote_envio_masivo', {p_tipo: tipo, p_cliente_ids: clienteIds})`,
  guarda el `lote_id` devuelto en una variable de módulo (`_waLoteEnvioMasivoId`), y abre el panel
  de progreso (ver paso 5 para el pintado real — este paso solo deja el entrypoint y el estado
  listos).
- Cambiar `window.nxWaAbrirMasivoSegmento(tipo)` (función ya existente, líneas ~466-474 de este
  archivo tal como está hoy) para que, en vez de llamar a `abrirWAMasivo(ids)` +
  `setTimeout(...selWATipo...)`, llame a un nuevo panel de confirmación que muestre "`ids.length`
  clientes recibirán el mensaje de `<tipo legible>`" con un botón "Confirmar y enviar" que dispare
  `nxWaIniciarEnvioMasivo(mapa[tipo], ids)` (reusando el mismo `mapa` de traducción
  segmento→tipo-de-mensaje que ya existe en esa función).

**Done when**
- [ ] WHEN `nxWaAbrirMasivoSegmento('deuda')` se llama con al menos un cliente con deuda
      THE SYSTEM SHALL mostrar un panel de confirmación con el conteo correcto de destinatarios,
      SHALL NOT llamar a la función global `abrirWAMasivo` en ningún punto de su ejecución.
- [ ] WHEN el agente confirma el envío THE SYSTEM SHALL llamar a
      `rpc/whatsapp_crear_lote_envio_masivo` con el tipo mapeado correcto (`todos`→`factura`,
      `deuda`→`pago`, `renovar`→`vence`, `aldia`→`factura`, igual que el `mapa` ya existente) y con
      exactamente los `cliente_id` del segmento elegido.
- [ ] WHEN la RPC devuelve un `lote_id` THE SYSTEM SHALL guardarlo y quedar listo para que el
      polling del paso 5 lo use.

**Verify**
```bash
node --check parches-whatsapp-inbox.js
# expect: exit 0
grep -q "nxWaIniciarEnvioMasivo" parches-whatsapp-inbox.js
# expect: exit 0
grep -q "abrirWAMasivo(ids)" parches-whatsapp-inbox.js; test $? -eq 1
# expect: exit 0 (grep sale 1 = "no encontrado" -- nxWaAbrirMasivoSegmento ya no llama al modal
# viejo; un 2 de grep, error real de archivo, haria fallar este chequeo)

# Prueba de paridad del §9.1 fila 2 -- los 4 pares segmento->tipo del "mapa" reusado siguen siendo
# los mismos que ya mandaba el flujo viejo, no una inspeccion visual sino un chequeo real:
grep -A6 "const mapa" parches-whatsapp-inbox.js > /tmp/mapa-check.txt
grep -q "todos: 'factura'" /tmp/mapa-check.txt
# expect: exit 0
grep -q "deuda: 'pago'" /tmp/mapa-check.txt
# expect: exit 0
grep -q "renovar: 'vence'" /tmp/mapa-check.txt
# expect: exit 0
grep -q "aldia: 'factura'" /tmp/mapa-check.txt
# expect: exit 0
```
```sql
-- Este es el contrato mas importante de este paso (la RPC del paso 1 + el llamado nuevo del
-- frontend) y hasta aca ningun paso lo probo en vivo -- probarlo AHORA, antes de construir encima
-- de el en el paso 5, evita descubrir un desacuerdo recien en la prueba end-to-end del paso 9.
select whatsapp_crear_lote_envio_masivo('factura', array['<id de un cliente de prueba activo, con wa>']::uuid[]);
-- expect: devuelve un uuid no nulo (el lote_id) -- el mismo shape que espera nxWaIniciarEnvioMasivo
select count(*) from public.whatsapp_envio_masivo_destinatarios where lote_id = '<el uuid de arriba>';
-- expect: 1
```

**Checkpoint**
```bash
git add -A && git commit -m "step 4: entrypoint de envio masivo (RPC de lote)"
git tag step-04-frontend-entrypoint
```

---

#### Paso 5 — Frontend: UI de progreso en vivo

**Do**
En `parches-whatsapp-inbox.js`: implementar el panel de progreso que, tras crear el lote (paso 4),
llama repetidas veces a `POST /functions/v1/whatsapp-envio-masivo` con `{lote_id, limite:15}`,
actualiza una barra/contador con `enviados+fallidos` sobre `total_destinatarios` (leídos de la
respuesta de cada llamada, o releyendo el lote), agrega a una lista visible cada destinatario que
resultó `fallido` con su motivo, y sigue llamando mientras `terminado===false`. Al recibir
`terminado:true`, muestra el resumen final y limpia `_waLoteEnvioMasivoId`.

**Done when**
- [ ] WHEN una tanda de 40 destinatarios corre con `limite=15` THE SYSTEM SHALL hacer 3 llamadas
      sucesivas a la Edge Function (15+15+10) sin que el agente tenga que interactuar entre una y
      otra.
- [ ] WHEN una llamada a la Edge Function devuelve 2 destinatarios fallidos THE SYSTEM SHALL
      mostrar esos 2 en la lista de fallos sin detener las llamadas siguientes del resto de la
      tanda.
- [ ] WHEN el agente cierra el panel de progreso a mitad de una tanda y lo vuelve a abrir
      manualmente pasando el mismo `lote_id` THE SYSTEM SHALL seguir procesando solo los
      destinatarios que sigan en `estado='pendiente'`, sin volver a mandarle nada a los que ya
      quedaron en `enviado`.
- [ ] WHEN `terminado:true` llega THE SYSTEM SHALL dejar de llamar a la Edge Function para ese
      `lote_id`.

**Verify**
```bash
node --check parches-whatsapp-inbox.js
# expect: exit 0
```
```bash
# El contrato frontend<->Edge Function (esta funcion ya desplegada desde el paso 3) tampoco se
# probo en vivo todavia -- probarlo aca con UNA sola llamada real, antes de construir el resto del
# build (pasos 6-9) encima, evita descubrir un desacuerdo recien en la prueba end-to-end del paso
# 9. Usa el MISMO lote_id que quedo creado (y todavia 'pendiente') por la prueba SQL del paso 4.
#
# Nada exporta SUPABASE_URL/SUPABASE_ANON_KEY automaticamente en la terminal del operador (mismo
# aviso que el paso 3) -- si esta es una terminal nueva desde el paso 3, repetir el mismo par de
# tools antes de seguir (ver paso 3): mcp__claude_ai_Supabase__get_project_url ->
# export SUPABASE_URL="<...>"; mcp__claude_ai_Supabase__get_publishable_api_key ->
# export SUPABASE_ANON_KEY="<...>". Si la MISMA terminal del paso 3 sigue abierta, ya estan.
curl -s -o /tmp/resp-poll.json -w '%{http_code}' -X POST \
  "$SUPABASE_URL/functions/v1/whatsapp-envio-masivo" \
  -H "Content-Type: application/json" -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer <JWT real de un agente de nexus-pro>" \
  -d '{"lote_id":"<el lote_id creado en el paso 4>","limite":15}' > /tmp/codigo-poll.txt
grep -qx 200 /tmp/codigo-poll.txt
# expect: exit 0
grep -q '"ok":true' /tmp/resp-poll.json
# expect: exit 0
```
Prueba manual (no hay runner de UI automatizado en este repo): crear una tanda real de 2-3 clientes
de prueba tipo `factura` desde la UI y observar el contador avanzar en pantalla — cubierto también
por el paso 9, que es donde esta prueba se hace de punta a punta contra datos reales (incluido el
comportamiento de "cerrar y reabrir el panel a mitad de tanda", que el chequeo de arriba no cubre
por ser una sola llamada).

**Checkpoint**
```bash
git add -A && git commit -m "step 5: UI de progreso en vivo del envio masivo"
git tag step-05-frontend-progreso
```

---

#### Paso 6 — Frontend: quitar el flujo viejo

**Do**
En `index.html`: eliminar el modal `<div class="overlay" id="mWAMasivo">...</div>` completo (con
su CSS asociado, bloque `#mWAMasivo` en el `<style>`), y las funciones
`abrirWAMasivo`/`selWATipo`/`renderWAClientes`/`toggleWACli`/`selAllWA`/`selSoloDeuda`/
`updWACount`/`ejecutarWAMasivo`. Confirmar antes de borrar que ninguna otra parte de la app llama a
estas funciones fuera de `parches-whatsapp-inbox.js` (que ya se actualizó en el paso 4 para no
llamarlas).

**Done when**
- [ ] WHEN se busca `id="mWAMasivo"` en `index.html` THE SYSTEM SHALL no encontrar ninguna
      coincidencia.
- [ ] WHEN se busca `function abrirWAMasivo`/`function ejecutarWAMasivo` en `index.html` THE
      SYSTEM SHALL no encontrar ninguna coincidencia.
- [ ] WHEN se abre la app tras este cambio y se revisa la consola del navegador THE SYSTEM SHALL
      no mostrar ningún error causado por una referencia rota a alguna de las funciones eliminadas
      (verificado en vivo en el paso 9, que ya abre la app real como parte de su prueba
      end-to-end — ver ese paso).

**Verify**
```bash
# Primero confirmar que los archivos existen y son legibles -- "grep" sale con codigo 2 (no 1)
# cuando el archivo falta o el glob no expande. Sin este chequeo previo, un archivo movido/
# renombrado por error podia pasar el chequeo de abajo sin haber leido el contenido de verdad.
test -f index.html
# expect: exit 0
test -f parches-whatsapp-inbox.js
# expect: exit 0
ls parches-*.js >/dev/null
# expect: exit 0 (el glob expande a al menos un archivo real)

grep -q 'id="mWAMasivo"' index.html; test $? -eq 1
# expect: exit 0 (grep sale 1 = ya no existe esa referencia)
grep -q "function abrirWAMasivo" index.html; test $? -eq 1
# expect: exit 0
grep -q "function ejecutarWAMasivo" index.html; test $? -eq 1
# expect: exit 0
grep -rq "abrirWAMasivo\|ejecutarWAMasivo\|selWATipo(" parches-*.js; test $? -eq 1
# expect: exit 0 (ningun otro archivo de parche quedo llamando a las funciones borradas)
```

**Checkpoint**
```bash
git add -A && git commit -m "step 6: quitar el flujo viejo de WA Masivo (wa.me manual)"
git tag step-06-quitar-flujo-viejo
```

---

#### Paso 7 — Subir versión

**Do**
Subir `APP_VERSION` en `index.html` (siguiente número tras el actual) y agregar la entrada
correspondiente en `version.json` (`version` + una nota en `cambios[]` describiendo el reemplazo del
WA Masivo), siguiendo exactamente el formato de las entradas ya existentes en `version.json` y la
regla de `REGLAS-ACTUALIZACION.md`.

**Done when**
- [ ] WHEN se lee `APP_VERSION` en `index.html` y `version` en `version.json` THE SYSTEM SHALL
      tener el mismo valor en ambos.
- [ ] WHEN se lee `version.json` THE SYSTEM SHALL tener una entrada nueva en `cambios[]` con
      `version` igual al valor subido y una nota describiendo el cambio.

**Verify**
```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const v=html.match(/const APP_VERSION='([^']+)'/)[1];
const pkg=JSON.parse(fs.readFileSync('version.json','utf8'));
if (v !== pkg.version) { console.error('APP_VERSION ('+v+') != version.json ('+pkg.version+')'); process.exit(1); }
if (!pkg.cambios.some(c => c.version === v)) { console.error('sin entrada de changelog para '+v); process.exit(1); }
console.log('ok:', v);
"
# expect: imprime "ok: <version>" y exit 0
```

**Checkpoint**
```bash
git add -A && git commit -m "step 7: subir version tras reemplazar WA Masivo"
git tag step-07-version
```

---

#### Paso 8 — Seguridad: advisors sobre las tablas nuevas

**Do**
Correr `get_advisors` (tipo seguridad) sobre el proyecto de Supabase después de aplicar la
migración del paso 1, y confirmar que no aparece ningún hallazgo nuevo referido a
`whatsapp_envio_masivo_lotes`/`whatsapp_envio_masivo_destinatarios` (RLS sin habilitar, policy
faltante, función `security definer` sin `search_path` fijo, etc.).

**Done when**
- [ ] WHEN `get_advisors` corre después del paso 1 THE SYSTEM SHALL no reportar ningún advisor de
      seguridad cuyo nombre de tabla/función sea una de las 3 nuevas de este cambio
      (`whatsapp_envio_masivo_lotes`, `whatsapp_envio_masivo_destinatarios`,
      `whatsapp_crear_lote_envio_masivo`).

**Verify**
```text
(ejecutado vía la tool mcp__claude_ai_Supabase__get_advisors, no un comando de shell del repo)
# expect: cero filas del reporte mencionan alguno de los 3 nombres de arriba
```

**Checkpoint**
```bash
git add -A && git commit -m "step 8: verificacion de seguridad post-migracion (sin cambios de codigo)" --allow-empty
git tag step-08-seguridad-verificada
```

---

#### Paso 9 — Prueba manual end-to-end (tipo `factura`, clientes reales de prueba)

**Do**
Desde la app real (ya desplegada), con la consola del navegador abierta (DevTools), abrir el inbox
de WhatsApp, usar el botón de segmento "Factura a todos" sobre un segmento chico armado a propósito
con: 2-3 clientes de prueba reales (número real bajo control del dueño) que SÍ tengan al menos una
factura generada, MÁS 1 cliente de prueba adicional con WhatsApp válido pero **sin ninguna factura
todavía** (para ejercitar el caso "sin facturas" del paso 2, que ningún paso anterior probó en
vivo). Confirmar el envío y observar la tanda de punta a punta: creación del lote, avance del
contador, mensajes reales llegando al WhatsApp de prueba, y el lote quedando `completado` — sin
ningún error nuevo en la consola del navegador (verifica también el criterio del paso 6 sobre no
dejar ninguna referencia rota a las funciones eliminadas).

**Done when**
- [ ] WHEN se manda una tanda de prueba de 2-3 clientes reales con factura, tipo `factura`,
      THE SYSTEM SHALL dejar cada uno en `estado='enviado'` con un `zernio_message_id` real, Y el
      mensaje SHALL llegar de verdad al WhatsApp del número de prueba con el monto correcto de su
      última factura.
- [ ] WHEN esa misma tanda incluye al cliente de prueba SIN ninguna factura THE SYSTEM SHALL dejar
      su fila en `estado='fallido'` con `error_detalle` mencionando la ausencia de facturas, Y
      SHALL NOT haber intentado llamar a Zernio para ese destinatario (criterio del paso 2, línea
      676-678, verificado recién acá).
- [ ] WHEN la tanda termina THE SYSTEM SHALL mostrar en pantalla el resumen "N enviados, 1
      fallido".
- [ ] WHEN se revisa la consola del navegador durante toda la prueba THE SYSTEM SHALL no mostrar
      ningún error causado por una referencia a `abrirWAMasivo`/`ejecutarWAMasivo`/`selWATipo` u
      otra función eliminada en el paso 6.

**Verify**
```sql
-- Contra la base real, después de la prueba manual:
select estado, zernio_message_id, enviado_at, error_detalle
from public.whatsapp_envio_masivo_destinatarios where lote_id = '<el lote_id de la prueba>';
-- expect: las filas de los clientes CON factura en 'enviado' con zernio_message_id no nulo; la
-- fila del cliente SIN factura en 'fallido' con error_detalle mencionando la ausencia de facturas
select estado, enviados, fallidos from public.whatsapp_envio_masivo_lotes where id = '<el lote_id de la prueba>';
-- expect: estado='completado', fallidos=1
```

**Checkpoint**
```bash
git add -A && git commit -m "step 9: prueba manual end-to-end de tipo factura confirmada" --allow-empty
git tag step-09-prueba-e2e-factura
```

---

#### Paso 10 — Prueba manual de `pago`/`vence` en vivo (una vez Meta apruebe las plantillas)

**Do**
Cuando `recordatorio_pago_pendiente` y `poliza_por_vencer` queden con estado `APPROVED` en el
dashboard de Zernio (paso externo, ver §10 — no bloquea nada del build anterior), repetir la misma
prueba del paso 9 para los tipos `pago` y `vence` con clientes de prueba reales.

**Nota:** este paso no tiene una fecha fija — puede correr días o semanas después del paso 9, sin
que eso bloquee el resto del build (que ya quedó completo, probado y potencialmente en producción
solo con el tipo `factura` activo mientras tanto).

**Done when**
- [ ] WHEN las 2 plantillas nuevas están `APPROVED` en Zernio Y se manda una tanda de prueba tipo
      `pago` THE SYSTEM SHALL dejar la fila en `estado='enviado'` con el saldo real del cliente de
      prueba, y el mensaje SHALL llegar al WhatsApp de prueba.
- [ ] WHEN se repite lo mismo para `vence` THE SYSTEM SHALL mostrar la fecha de vencimiento real
      del cliente de prueba en el mensaje recibido.

**Verify**
```sql
select estado, zernio_message_id from public.whatsapp_envio_masivo_destinatarios
where lote_id = '<el lote_id de la prueba de pago>';
-- expect: 'enviado' con zernio_message_id no nulo
select estado, zernio_message_id from public.whatsapp_envio_masivo_destinatarios
where lote_id = '<el lote_id de la prueba de vence>';
-- expect: 'enviado' con zernio_message_id no nulo
```

**Checkpoint**
```bash
git add -A && git commit -m "step 10: prueba manual end-to-end de pago y vence confirmada" --allow-empty
git tag step-10-prueba-e2e-pago-vence
```

---

#### Paso 11 — Commit + autorización del dueño + push a `main`

**Do**
Con los pasos 1-9 ya verificados (el 10 puede seguir pendiente sin bloquear, según la nota de ese
paso), pedir autorización explícita y fresca al dueño para: (a) que la migración y el deploy de la
Edge Function ya estén aplicados en producción (si no se hizo ya en los pasos 1-3), y (b) hacer
`git push origin main` con los cambios de frontend (pasos 4-7). **Nunca asumir autorización de una
sesión anterior** — esta es la regla de todo el proyecto, no una nueva de este blueprint.

**Done when**
- [ ] WHEN el dueño confirma explícitamente en esa conversación THE SYSTEM SHALL recién ahí correr
      `git push origin main`, nunca antes.
- [ ] WHEN el push se completa THE SYSTEM SHALL dejar `main` con los commits de los pasos 1-9 (y
      10 si ya corrió) en orden, cada uno con su tag `step-NN-*`.

**Verify**
```bash
git log --oneline -12
# expect: los ultimos commits corresponden, en orden, a los pasos 1 a 9 (y 10/11 si aplica)
git tag -l 'step-*'
# expect: al menos step-01-migracion-envio-masivo ... step-09-prueba-e2e-factura
git status
# expect: working tree clean (nada sin commitear después del push)
```

**Checkpoint**
```bash
git push origin main
# (sin tag propio -- este paso es el release, no crea un artefacto nuevo que taguear)
```

---

### 9.1 Parity and cutover

Este cambio SÍ reemplaza un flujo existente (el WA Masivo con `wa.me`), pero es un reemplazo de
**una sola función manual** dentro de una app interna de un solo negocio (no un servicio con
tráfico de usuarios externos ni un sistema con SLA) — la maquinaria completa de shadow-traffic/
canary/kill-switch de esta sección está pensada para migraciones de sistemas con usuarios en vivo
que no pueden notar el corte. Aquí se adapta a la escala real del cambio:

#### Conjunto de paridad

| # | Comportamiento que se mantiene | Cómo se prueba | Tolerancia |
|---|---|---|---|
| 1 | Los 3 tipos de mensaje (factura/pago/vence) siguen existiendo, con el mismo contenido de negocio (monto real, saldo real, fecha real) | Paso 9 (factura) y paso 10 (pago/vence) de §9 | Exacto — el monto/saldo/fecha debe ser el mismo que mostraba el preview del modal viejo |
| 2 | Los 4 botones de segmento del panel "Centro WhatsApp Pro" (`todos`/`deuda`/`renovar`/`aldia`) siguen mandando al tipo de mensaje correcto | `grep -A6 "const mapa" parches-whatsapp-inbox.js` (paso 4) confirmando los 4 pares literales `todos→factura`, `deuda→pago`, `renovar→vence`, `aldia→factura` | Exacto |

**Ventana de convivencia:** no aplica un período de "ambos sistemas corriendo en paralelo" — al no
haber tráfico automático ni usuarios externos dependiendo del flujo viejo (es un botón que un agente
aprieta a mano cuando decide mandar una tanda), el corte es directo: el paso 6 elimina el flujo
viejo en el mismo cambio que introduce el nuevo, una vez que los pasos 1-5 ya probaron que el nuevo
camino funciona (paso 9). Mantener ambos caminos vivos a la vez fue evaluado y descartado
explícitamente en la entrevista (ver §20.3, fila 2) porque el dueño pidió un solo camino.

#### Corte

| Fase | Qué cambia | A quién afecta | Reversible por | Verifica |
|---|---|---|---|---|
| Antes del paso 6 | Ambos flujos coexisten en el código (el viejo sigue ahí, el nuevo ya se puede probar por separado desde la consola/SQL sin pasar por el botón de la UI) | Nadie — el botón de la UI sigue yendo al flujo viejo hasta el paso 4 | `git reset` a cualquier tag anterior | Pasos 1-3 verificados por separado |
| Paso 4 | El botón de la UI pasa a usar el flujo nuevo | El agente que use ese botón, desde ese commit en adelante | `git reset --hard step-03-edge-function-completa` | Paso 4 |
| Paso 6 | El código del flujo viejo se borra del repo | Nadie que ya haya migrado a usar el botón (todos, no hay una migración gradual de usuarios en esta app) | `git revert` del commit del paso 6 (el código sigue en el historial de git) | Paso 6 |

**El interruptor de emergencia:** si algo sale mal después del push del paso 11, `git revert` de
los commits de los pasos 4-7 (o `git reset --hard` al tag `step-03-edge-function-completa` seguido
de un force-push, solo con autorización explícita del dueño dado que reescribe `main`) devuelve el
código del flujo viejo. La migración del paso 1 NO se revierte automáticamente (las tablas nuevas
son aditivas y no rompen nada si quedan sin uso) — revertir la migración es un paso aparte, manual,
solo si hiciera falta.

#### Criterios de aborto
- [ ] WHEN el paso 9 (prueba end-to-end de `factura`) falla 2 veces seguidas por un motivo que no
      sea "Meta no aprobó todavía" THE SYSTEM SHALL detener el avance al paso 11 y reportar al
      dueño antes de seguir.
- [ ] WHEN el paso 6 (quitar el flujo viejo) deja algún error de consola al abrir la app THE SYSTEM
      SHALL revertirse ese commit específico antes de continuar a los pasos 7-11.

#### Migración de datos
NOT APPLICABLE — no hay datos que migrar del flujo viejo al nuevo (el flujo viejo no persistía
ningún estado en la base, solo abría pestañas de `wa.me`; no hay "historial de WA Masivo" que
trasladar).

#### Decomiso
El código del flujo viejo se borra en el mismo paso 6 (no hay período de gracia que gestionar,
justificado arriba por no haber usuarios externos ni tráfico automático dependiendo de él). No
queda nada más que decomisar.

---

## 10. Environment Setup

### Prerrequisitos
| Herramienta | Versión | Chequeo |
|---|---|---|
| Node.js | La que ya esté instalada en la máquina que corre `node --check` (sin pin de versión — no hay `package.json` que lo fije) | `node --version` |
| Acceso a los MCP tools de Supabase (`apply_migration`, `deploy_edge_function`, `get_advisors`) | — | Ya configurado en este proyecto, sin cambios |
| Cuenta de Zernio con el número de WhatsApp de `nexus-pro` ya conectado | — | Ya existe (`whatsapp_config.zernio_account_id` ya cargado) |

### Cuentas/accesos a crear primero — y el paso EXTERNO que no bloquea el build
| Qué | Dónde | Bloquea qué |
|---|---|---|
| Plantilla `recordatorio_pago_pendiente` creada + enviada a aprobación de Meta | Dashboard de Zernio → WhatsApp Templates | Solo el paso 10 (prueba en vivo de tipo `pago`) — el resto del build no espera esto |
| Plantilla `poliza_por_vencer` creada + enviada a aprobación de Meta | Ídem | Solo el paso 10, tipo `vence` |

**Recomendación de secuencia (no un paso de build):** enviar estas 2 plantillas a aprobación el
mismo día que se empieza el paso 1 — la aprobación de Meta puede tardar horas o días, así que
conviene que esa espera corra en paralelo con el resto del build, no después.

### Variables de entorno
| Variable | Propósito | De dónde sale | Requerida desde el paso | ¿Secreto? | Ya existe hoy |
|---|---|---|---|---|---|
| `ZERNIO_API_KEY` | Autenticar contra la API de Zernio | Ya configurada como secret de Supabase Edge Functions (usada hoy por `whatsapp-notificar`/`whatsapp-inbox-enviar`) | 2 (la Edge Function la lee desde su primera versión) | Sí | **Ya existe — no hace falta crear nada nuevo, la Edge Function de este blueprint la lee del mismo secret compartido del proyecto** |
| `SUPABASE_URL` | Cliente de base dentro de la Edge Function, Y base de la URL que las pruebas en vivo de los pasos 3 y 5 llaman con `curl` desde la terminal del operador | Inyectada automáticamente dentro de la Edge Function; en la terminal del operador se obtiene con la tool `mcp__claude_ai_Supabase__get_project_url` | 2 (dentro de la función); 3 y 5 (en la terminal, para cada `curl` de prueba — se repite si es una terminal nueva) | No (es pública, ya expuesta en `index.html`) | Ya existe |
| `SUPABASE_SERVICE_ROLE_KEY` | Cliente de base con permisos de servicio dentro de la Edge Function | Inyectada automáticamente por el runtime de Supabase Edge Functions | 2 | Sí | Ya existe |
| `SUPABASE_ANON_KEY` | Header `apikey` en las llamadas HTTP de prueba de los pasos 3 y 5 (mismo header que ya usa el frontend real vía el wrapper `API`) | Se obtiene con la tool `mcp__claude_ai_Supabase__get_publishable_api_key` — NUNCA se adivina ni se copia de memoria | 3 y 5 (solo hace falta para las pruebas en vivo por `curl`, la Edge Function en sí no la lee) | No (es la clave pública/anónima, ya expuesta en `index.html` como `SUPABASE_KEY_FIXED`) | Ya existe |

No hay ningún secret NUEVO que crear para este cambio — reusa el `ZERNIO_API_KEY` que ya existe y
ya está correctamente nombrado (fix de esta misma sesión, documentado en `CLAUDE.md`). Las 4
variables ya están disponibles desde antes del paso 1, así que "requerida desde el paso 2/3/5" no
introduce ninguna ventana donde un paso anterior se rompa por su ausencia (§9 regla 9).

### Archivos que deben quedar commiteados
| Archivo | Por qué | Excepción en el ignore-file |
|---|---|---|
| `supabase/migrations/<timestamp>_whatsapp_envio_masivo.sql` | Es el historial de esquema del proyecto | No aplica — este repo no ignora `supabase/migrations/**` |
| `supabase/functions/whatsapp-envio-masivo/index.ts` | Código fuente de la función | No aplica — este repo no ignora `supabase/functions/**` |
| `blueprints/envio-masivo-whatsapp-blueprint.md` | Este mismo archivo, para que quede como referencia del cambio | Verificar que `.gitignore` no tenga un patrón `blueprints/` — no se detectó ninguno en este repo hoy |

### Arranque (Bootstrap)
```bash
# Este repo NO tiene gestor de paquetes ni proceso de instalación -- "arrancar" es simplemente
# tener el repo clonado y node disponible para node --check. No hay scaffolding que ejecutar, no
# hay lockfile, no hay servicio local que levantar (Supabase es un proyecto remoto ya existente,
# no una instancia local de este build).
git rev-parse --git-dir >/dev/null 2>&1 && echo "repo git ya existe, nada que inicializar"
node --version
# expect: cualquier version reciente de Node -- solo hace falta para node --check
```
No hay copia de `workspace/` que gestionar (modo archivo único — ver §19, los archivos de workspace
van como bloques de código más abajo, para que el dueño los agregue a mano si quiere las reglas de
Claude Code de este cambio en su propio `.claude/`).

---

## 11. Dependencies

**NOT APPLICABLE — este cambio no agrega ninguna dependencia nueva.** El único paquete que la
Edge Function nueva importa (`jsr:@supabase/supabase-js@2.112.2`) ya está pinneado y en uso hoy por
`whatsapp-notificar`/`whatsapp-inbox-enviar` — se reusa el mismo pin exacto, verificado en vivo esta
misma sesión (2026-09-07) contra el problema real de una versión flotante rota. No hace falta una
nueva verificación de registro: es el mismo paquete, la misma versión, ya corriendo en producción.

### Runtime
| Paquete | Versión | Fuente | Verificado | Instalado por | Propósito |
|---|---|---|---|---|---|
| `@supabase/supabase-js` (JSR) | `2.112.2` | Ya pinneado en `supabase/functions/whatsapp-notificar/index.ts` y `whatsapp-inbox-enviar/index.ts`, este mismo repo | 2026-09-07 (sesión donde se fijó este pin tras el incidente de la versión flotante rota) | Import directo por URL en el `index.ts` del paso 2 (§9) — no hay paso de "instalación" separado en Deno | Cliente de Supabase con `service_role` dentro de la Edge Function |

### Desarrollo
NOT APPLICABLE — no hay dependencias de desarrollo (sin linter, sin test runner, sin bundler
configurado en este repo).

### Deliberadamente no usado
| Rechazado | En su lugar | Por qué |
|---|---|---|
| Zernio Broadcasts API | Loop sobre el endpoint 1 a 1 ya probado | Ver §1 Non-Goals — no soporta personalización por cliente |
| `jsr:@supabase/supabase-js@2` (flotante) | `2.112.2` (pin exacto) | Rompió un deploy real el mismo día por una versión rota publicada en JSR |

---

## 12. Deployment Strategy

### Hosting
- Frontend: Cloudflare Workers (static assets), proyecto `nexus-pro`, deploy automático al hacer
  push a `main` (sin build, sirve el repo tal cual). Sin cambios de configuración para este
  blueprint.
- Backend: Supabase (proyecto ya existente) — la migración y la Edge Function se despliegan vía las
  MCP tools (`apply_migration`, `deploy_edge_function`), no vía git push.

### Entornos
| Entorno | Rama | URL | Base de datos | Modo de terceros |
|---|---|---|---|---|
| Producción | `main` | `nexusprord.com` | Proyecto Supabase real de `nexus-pro` | Zernio con la cuenta/número real |

NOT APPLICABLE para Local/Preview: este proyecto no tiene un entorno de desarrollo local separado
ni previews por PR — todo el desarrollo y las pruebas de este blueprint corren contra el mismo
proyecto de Supabase de producción (mismo patrón ya usado toda la sesión para las otras funciones
de WhatsApp), con clientes de prueba reales bajo control del dueño en vez de una base de datos de
staging separada.

### CI/CD
NOT APPLICABLE — no hay pipeline de CI en este repo (no se detectó `.github/workflows`). El "gate"
de este cambio es exactamente la sección 9/20.1 de este blueprint, corrida a mano.

### Release y rollback
- El frontend se revierte con `git revert`/`git reset` + push (Cloudflare vuelve a desplegar la
  versión anterior en segundos, mismo mecanismo que cualquier otro cambio de este repo).
- La migración de datos es aditiva (2 tablas nuevas) — no hace falta revertirla ni siquiera si se
  revierte el frontend; quedan sin uso, sin romper nada.
- La Edge Function se puede volver a desplegar con una versión anterior del archivo si hiciera
  falta (no hay versionado automático de Edge Functions más allá de lo que Supabase guarde
  internamente).

### Dominio, DNS, TLS
Sin cambios — mismo dominio (`nexusprord.com`) y certificado ya existentes.

---

## 13. Testing Strategy

**NOT APPLICABLE — este repo no tiene un framework de pruebas automatizadas (sin Jest, sin
Playwright, sin runner de ningún tipo configurado para esta app).** La verificación real de este
proyecto, documentada en `REGLAS-ACTUALIZACION.md` y usada consistentemente toda esta sesión, es:
`node --check <archivo>.js` para sintaxis, más pruebas manuales/en vivo contra datos reales
(llamadas SQL directas, pruebas de UI a mano). Esa es exactamente la estrategia de verificación que
usa cada paso de la §9 de este blueprint — no se inventa un framework de testing nuevo solo para
este cambio, sería inconsistente con el resto del repo.

### Flujos críticos a cubrir (manualmente, no automatizado)
1. Crear una tanda tipo `factura` con clientes reales de prueba y verla llegar de punta a punta
   (paso 9).
2. Un destinatario sin WhatsApp válido o sin facturas queda `fallido` sin detener al resto de la
   tanda (cubierto por las Done-when del paso 2).
3. Cerrar el panel de progreso a mitad de una tanda y no perder ni duplicar ningún envío al
   reabrirlo (Done-when del paso 5).

### Datos de prueba
Clientes de prueba reales, con números de WhatsApp bajo control del dueño (mismo patrón ya usado
toda la sesión para probar `whatsapp-notificar`/`whatsapp-webhook`) — no una base de datos de test
separada, dado que no existe tal cosa en este proyecto.

### Qué queda deliberadamente sin probar automatizado
Todo — por decisión ya tomada a nivel de todo el repo (sin test runner), no una decisión nueva de
este blueprint.

---

## 14. Security & Secrets

| Concern | Control | Implementado en |
|---|---|---|
| Almacenamiento de secretos | `ZERNIO_API_KEY` como secret de Supabase Edge Functions, nunca en el repo | Ya existente — reusado, no nuevo |
| Rotación de secretos | Sin cambios respecto al proceso ya existente para `ZERNIO_API_KEY` | N/A para este blueprint |
| Validación de entrada | `p_tipo` validado contra un CHECK constraint + un `if` explícito en la RPC; `lote_id` validado por FK + comparación de organización en la Edge Function | RPC `whatsapp_crear_lote_envio_masivo` (§4), Edge Function `whatsapp-envio-masivo` (§5) |
| Inyección SQL | Cero SQL armado por concatenación de strings — la RPC usa parámetros tipados de PL/pgSQL, la Edge Function usa el cliente de Supabase (queries parametrizadas) | Ambos |
| AuthN / AuthZ | Ver §8 — verificado en cada capa (RLS + RPC + Edge Function), nunca solo del lado del cliente | §8 |
| Verificación de webhooks | NOT APPLICABLE — este cambio no agrega ningún webhook nuevo (no confundir con `whatsapp-webhook`, que es una feature aparte, ya existente, no tocada) | — |
| Auditoría de dependencias | NOT APPLICABLE — sin dependencias nuevas (§11) | — |
| Manejo de PII | Los datos que se mandan por WhatsApp (nombre, monto de deuda) son los MISMOS que ya se mandan hoy por las notificaciones automáticas de fase 1 — ningún dato nuevo se expone que no se expusiera ya | `whatsapp_envio_masivo_destinatarios` solo guarda `cliente_id` (FK) + estado del envío, no una copia del contenido del mensaje |
| Higiene de logs | `console.error` en la Edge Function nunca debe imprimir el `ZERNIO_API_KEY` ni el JWT completo del usuario — mismo cuidado ya aplicado en `whatsapp-notificar`/`whatsapp-inbox-enviar` (solo loguean el mensaje de error de Zernio, nunca las credenciales) | `whatsapp-envio-masivo/index.ts` |

**Reglas duras**
- Ningún secreto se commitea, se imprime en un log, ni se manda al navegador — `ZERNIO_API_KEY`
  vive únicamente del lado del servidor (Edge Function), nunca llega al frontend.
- Toda verificación de autorización corre del lado del servidor antes de tocar datos reales.

**Dato regulado:** esta app maneja datos de clientes de un seguro de salud (nombre, teléfono, monto
de facturación) — no datos clínicos/de salud en sí (no hay diagnósticos ni historiales médicos en
las tablas que este cambio toca), así que no aplica HIPAA ni una regulación de datos de salud
específica para este cambio puntual; sí aplica el mismo cuidado de datos personales/financieros que
el resto del sistema ya sigue (RLS por organización, sin exposición pública).

---

## 15. Accessibility

**Objetivo: WCAG 2.2 AA**, con la salvedad honesta de que este repo no tiene ninguna herramienta
automatizada de accesibilidad instalada (sin `axe`, sin auditoría automatizada en ningún flujo
existente) — la verificación de este punto es manual, igual que el resto de QA del proyecto.

### Requisitos base aplicados a la UI nueva (panel de confirmación + progreso)
| Requisito | Cómo se cumple |
|---|---|
| HTML semántico | El panel reusa `<button>`/`<div>` con roles ya usados en el resto de `parches-whatsapp-inbox.js` (no se inventa una estructura nueva) |
| Teclado | Los botones "Confirmar y enviar"/"Cerrar" son `<button>` reales, alcanzables por tab, igual que el resto de los botones ya existentes en este panel |
| Foco visible | Reusa el estilo de foco ya definido para `.btn` en el resto de la app — no se sobreescribe |
| Contraste | Reusa colores ya en uso (`--wa-b`, `--wa-b2`, verde/azul de WhatsApp) que ya pasan el estándar del resto de la app — no se introduce ningún color nuevo que verificar |
| Formularios | No hay ningún input de texto libre nuevo en este flujo (solo botones de confirmación) — nada que etiquetar |
| Movimiento | Sin animaciones nuevas (ver §7) |
| Zoom / reflow | El panel usa el mismo contenedor/breakpoints (`768/640/480px`) que ya audita `REGLAS-ACTUALIZACION.md` punto 4-6 para cualquier novedad — se revisa a mano en el paso 9 de §9 |

### Verificación
NOT APPLICABLE un comando automatizado (no existe la herramienta en este repo). Pase manual:
navegación solo con teclado sobre el panel nuevo + una revisión visual en pantalla angosta (320-
480px), como parte de la prueba manual del paso 9 de §9 (mismo checklist ya obligatorio de
`REGLAS-ACTUALIZACION.md`, no uno nuevo).

---

## 16. Observability & Cost

### Instrumentación
| Señal | Herramienta | Qué captura | Quién lo mira |
|---|---|---|---|
| Errores de la Edge Function | Logs de Supabase Edge Functions (`console.error`, ya el mecanismo usado por `whatsapp-notificar`) | Excepciones no manejadas, respuestas de error de Zernio | El dueño/quien de soporte, cuando un agente reporta que una tanda falló |
| Progreso/resultado de cada tanda | La propia tabla `whatsapp_envio_masivo_lotes`/`_destinatarios` — ES el registro de observabilidad de este feature | Cuántos enviados, cuántos fallidos, por qué | Cualquier usuario autenticado de `nexus-pro`, vía SQL directo o el panel de progreso mismo |

NOT APPLICABLE: un servicio externo de error-tracking (Sentry o similar) — no existe en este
proyecto para ninguna otra parte de la app, así que no se introduce uno nuevo solo para este
cambio.

### Las métricas que importan para este cambio
| Métrica | Objetivo | Alertar en |
|---|---|---|
| Tasa de fallidos por tanda | Menor al 5% en tandas de clientes con datos completos (wa válido + al menos 1 factura) | Más del 20% de una tanda fallida — señal de que algo está mal (plantilla no aprobada, cuenta de Zernio desconectada, etc.), no solo casos aislados de datos incompletos |

### Chequeo de salud
NOT APPLICABLE un endpoint de healthcheck dedicado — la salud de este feature se confirma llamando
a la Edge Function con un lote de prueba real (paso 9/10 de §9), igual que las otras funciones de
WhatsApp de este proyecto no tienen healthcheck propio tampoco.

### Modelo de costo
| Servicio | Free tier | Costo a la escala esperada (50-300 destinatarios por tanda, unas pocas tandas al mes) | Costo a 10x | Punto a vigilar |
|---|---|---|---|---|
| Zernio (mensajes de WhatsApp Business) | Según el plan ya contratado por `nexus-pro` (sin cambios) | Cada mensaje de plantilla ya tiene un costo por conversación de Meta, sin importar si sale por Broadcasts o por este flujo 1 a 1 en bucle — el costo por mensaje NO cambia con este blueprint, cambia el volumen si ahora se manda más seguido | El mismo costo por mensaje, simplemente más mensajes si el volumen crece 10x | Si el volumen mensual sube mucho, vale la pena revisar el plan de Zernio/Meta, pero eso es independiente de este cambio de arquitectura |
| Supabase Edge Functions | Ya incluido en el plan actual | Insignificante — cada invocación es breve (hasta 15 mensajes con 600ms de espera cada uno, ~10s) | Sigue siendo insignificante a este volumen | — |

**Costo estimado adicional por este cambio: prácticamente $0** — no se agrega ningún servicio
nuevo, se reusa la misma cuenta de Zernio y el mismo plan de Supabase ya pagados. El costo por
mensaje de WhatsApp ya existía (lo paga hoy `whatsapp-notificar`); este blueprint solo cambia CÓMO
se dispara ese mismo costo (en bloque, a pedido del agente, en vez de mensaje por mensaje desde una
pestaña de wa.me que ni siquiera pasaba por Zernio).

---

## 17. Model Routing

NOT APPLICABLE — este cambio no llama a ningún LLM en tiempo de ejecución.

---

## 18. Skills to Use During Build

NOT APPLICABLE — no hace falta ninguna skill de Claude Code especial para construir este cambio;
es edición de archivos existentes con el mismo patrón ya usado toda la sesión (leer el archivo real
antes de editar, `node --check` después de cada cambio de JS, verificar en vivo contra Supabase
real).

---

## 19. Agent Workspace

**Modo archivo único: los artefactos de esta sección van como bloques de código para que se copien
a mano, no como archivos reales del bundle** (este blueprint no es un bundle — ver la nota de modo
al principio del documento).

### 19.1 `CLAUDE.md` (fragmento a fusionar con el `CLAUDE.md` real del repo, NO a reemplazarlo)

```markdown
## Envío masivo de WhatsApp (feature agregada 2026-09-07+)

- Reemplaza por completo al viejo "WA Masivo" (que abría pestañas `wa.me` una por una). Ese código
  ya no existe — si ves una referencia a `abrirWAMasivo`/`ejecutarWAMasivo`/`#mWAMasivo` en un
  commit viejo, es historia, no algo a restaurar.
- Vive en 3 lugares: la migración `whatsapp_envio_masivo_lotes`/`_destinatarios` + RPC
  `whatsapp_crear_lote_envio_masivo`, la Edge Function `whatsapp-envio-masivo` (procesa de a
  `limite` destinatarios pendientes por llamada, nunca todos de una vez), y el entrypoint +
  progreso en `parches-whatsapp-inbox.js` (`nxWaIniciarEnvioMasivo`).
- Los 3 tipos de mensaje (`factura`/`pago`/`vence`) usan 3 plantillas distintas de WhatsApp
  Business ya aprobadas por Meta (`factura_generada` reusa la de fase 1; `recordatorio_pago_pendiente`
  y `poliza_por_vencer` son propias de este feature) — si se agrega un 4to tipo, hace falta una
  plantilla nueva aprobada por Meta ANTES de que el tipo sirva de algo en producción.
- Nunca se usó ni se debe usar la API de Broadcasts de Zernio para esto — no soporta variables por
  destinatario más allá de nombre/teléfono/email/empresa (verificado contra su documentación real).
- Verificar sintaxis: `node --check parches-whatsapp-inbox.js`. No hay test runner en este repo.
```

### 19.2 `AGENTS.md` (fragmento)

```markdown
# Envío masivo de WhatsApp — resumen para agentes sin memoria de esta sesión

Feature que reemplazó el viejo botón "WA Masivo" (que abría `wa.me` a mano). Ahora manda mensajes
personalizados (factura/saldo pendiente/renovación) en bloque, vía Zernio, con progreso en vivo.

Comandos: `node --check parches-whatsapp-inbox.js` (único chequeo automatizado de este repo).

3 reglas que importan:
1. Nunca usar Zernio Broadcasts para esto — no soporta variables por cliente.
2. Nunca mandar más de `limite` (default 15) destinatarios por llamada a la Edge Function — es
   deliberado, protege contra el límite de tiempo de ejecución y el rate-limit de WhatsApp.
3. Nunca tocar `whatsapp_mensajes`/`whatsapp_hilos`/`whatsapp_hilo_mensajes` desde este feature —
   son tablas de otras 2 features de WhatsApp, separadas a propósito.

Ver `CLAUDE.md` §"Envío masivo de WhatsApp" para el detalle completo.
```

### 19.3 `.claude/settings.json` (fragmento a fusionar)

```json
{
  "permissions": {
    "allow": [
      "Bash(node --check parches-whatsapp-inbox.js)",
      "Bash(node --check index.html)",
      "Bash(node -e:*)",
      "Bash(node --version)",
      "Bash(git rev-parse:*)",
      "Bash(echo:*)",
      "Bash(test -f:*)",
      "Bash(test:*)",
      "Bash(grep:*)",
      "Bash(wc:*)",
      "Bash(ls:*)",
      "Bash(curl:*)",
      "Bash(export SUPABASE_URL=*)",
      "Bash(export SUPABASE_ANON_KEY=*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git tag:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)"
    ],
    "deny": [
      "Bash(git push:*)"
    ]
  }
}
```
`git push` se deja fuera del `allow` a propósito — sigue requiriendo autorización explícita del
dueño cada vez, tal como establece el paso 11 de §9. `node --check index.html` no es un chequeo de
sintaxis JS válido para un archivo HTML completo (`index.html` mezcla HTML/CSS/JS) — se deja
listado solo porque el paso 6 podría querer extraer el bloque `<script>` a un archivo temporal para
chequearlo; si no se usa, no hace daño tenerlo permitido. `curl` y las dos entradas `export
SUPABASE_*` cubren las pruebas en vivo del paso 3 (§9); `ls` cubre el chequeo de glob del paso 6.
Todas las verificaciones de este blueprint usan la forma positiva del comando (`grep -q ...; test
$? -eq 1` en vez de `! grep -q ...`) precisamente para que el prefijo permitido (`grep`, `test`)
siga siendo el primer token real del comando — un `!` adelante cambiaría el token inicial y dejaría
ese chequeo fuera de este `allow` sin que nada lo avise hasta que el paso se traba pidiendo
aprobación manual.

### 19.4 Skills de proyecto

NOT APPLICABLE — no se identificó ningún flujo de trabajo repetible que amerite una skill de
Claude Code dedicada para este cambio puntual (es un feature que se construye una vez, no un
procedimiento que se repita).

### 19.5 `.claude/rules/*.md`

| Archivo | `paths` | Cubre |
|---|---|---|
| `.claude/rules/whatsapp-envio-masivo.md` | `supabase/functions/whatsapp-envio-masivo/**`, `parches-whatsapp-inbox.js` | Las 3 reglas de `AGENTS.md` arriba, en formato de regla path-scoped |

```markdown
---
paths:
  - "supabase/functions/whatsapp-envio-masivo/**"
  - "parches-whatsapp-inbox.js"
---

# Envío masivo de WhatsApp

- Nunca usar la API de Broadcasts de Zernio acá — no soporta variables por destinatario más allá de
  nombre/teléfono/email/empresa del contacto.
- El parámetro `limite` de la Edge Function nunca debe subir de 50 por invocación sin volver a medir
  el tiempo de ejecución real contra el límite de Supabase Edge Functions.
- Nunca escribir en `whatsapp_mensajes`, `whatsapp_hilos` o `whatsapp_hilo_mensajes` desde este
  feature — son de otras 2 features de WhatsApp.
```

### 19.6 Config crítica para las verificaciones y servicios locales

**NOT APPLICABLE — ninguna de las `Verify` de la §9 necesita un runner de tests, un archivo de
configuración de linter, un compose file, ni ningún servicio local.** Las verificaciones son:
`node --check` (usa Node tal cual está instalado, sin config), consultas SQL directas contra el
proyecto real de Supabase (ya existente, no un servicio que este blueprint deba levantar), y
llamadas HTTP directas a la Edge Function ya desplegada. No hay ningún archivo que emitir bajo un
`workspace/` para que estas verificaciones corran.

#### Matriz de convención de resolución
NOT APPLICABLE — este blueprint no declara ninguna convención de imports/alias (ver §3).

#### Reconciliación de valores entre artefactos
| Valor compartido | Fuente única | Valor literal | Dónde más aparece | Comparado |
|---|---|---|---|---|
| Nombre de la Edge Function | Paso 2 de §9 (`supabase/functions/whatsapp-envio-masivo/index.ts`) | `whatsapp-envio-masivo` | La URL que llama el frontend en el paso 5 (`/functions/v1/whatsapp-envio-masivo`), el nombre de la carpeta en §3 | Sí — mismo string en los 3 lugares |
| Nombre de la RPC | Paso 1 de §9 (la migración) | `whatsapp_crear_lote_envio_masivo` | La llamada del frontend en el paso 4 (`rpc/whatsapp_crear_lote_envio_masivo`) | Sí — mismo string en ambos lugares |
| Nombres de las 3 plantillas | §5 (tabla de plantillas por tipo) | `factura_generada` / `recordatorio_pago_pendiente` / `poliza_por_vencer` | Pasos 2 y 3 de §9, `CLAUDE.md` fragmento de §19.1 | Sí — mismos 3 strings en todos los lugares donde aparecen |
| Nombres de las 2 tablas nuevas | §4 (Schema) | `whatsapp_envio_masivo_lotes` / `whatsapp_envio_masivo_destinatarios` | §5, §8, pasos 1/8/9/10 de §9, §16, §20.1 | Sí — verificado ocurrencia por ocurrencia, mismos 2 strings en todos los lugares |
| Rutas de los 2 archivos que este cambio modifica | §3 (Directory Structure) | `parches-whatsapp-inbox.js` / `index.html` | Pasos 4-9 de §9, §19.1, §19.3, §20.1 | Sí — verificado ocurrencia por ocurrencia, mismas 2 rutas en todos los lugares |

#### Reconciliación de artefactos byte-exactos
NOT APPLICABLE — este blueprint no autoriza ningún archivo golden/fixture/snapshot que algún paso
compare byte a byte contra un literal predefinido.

---

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Global acceptance gate

**Adaptado a este repo — sin `pnpm`/`npm`, sin typecheck/lint/test/build tal como el template
genérico los asume (§11 ya explica por qué: no hay gestor de paquetes en este proyecto).** El
proyecto queda **terminado** cuando cada línea de abajo corre limpia contra el estado real del
repo y de Supabase, no antes:

```bash
node --check parches-whatsapp-inbox.js       # expect: exit 0
test -f supabase/functions/whatsapp-envio-masivo/index.ts   # expect: exit 0
test -f index.html                           # expect: exit 0
grep -q 'id="mWAMasivo"' index.html; test $? -eq 1  # expect: exit 0 (grep sale 1 = flujo viejo eliminado -- ver paso 6)
git status --porcelain | wc -l | grep -qx 0  # expect: exit 0 (nada sin commitear al final)
```

```sql
-- contra la base real de Supabase:
select relrowsecurity from pg_class where relname in ('whatsapp_envio_masivo_lotes','whatsapp_envio_masivo_destinatarios');
-- expect: dos filas, ambas 't'
select count(*) from public.whatsapp_envio_masivo_lotes where estado = 'completado' and tipo = 'factura';
-- expect: al menos 1 (la tanda de prueba del paso 9)
```

Más estos gates manuales, cada uno chequeado una vez antes de considerar el cambio terminado:

- [ ] Cada paso de §9 tiene su tag `step-NN-*` en git (`git tag -l 'step-*'` lista uno por paso,
      del 1 al 9 como mínimo — el 10 puede seguir pendiente de la aprobación de Meta sin bloquear
      esto).
- [ ] El paso 9 (prueba end-to-end de `factura`) corrió contra clientes reales de prueba y el
      mensaje llegó de verdad al WhatsApp de prueba.
- [ ] `get_advisors` no reporta ningún hallazgo nuevo sobre las 2 tablas/1 función de este cambio
      (paso 8).
- [ ] El dueño dio autorización explícita, en esta conversación, antes del `git push` del paso 11.
- [ ] Cada non-goal de §1 sigue sin construirse (en particular: nadie implementó Zernio Broadcasts
      "de paso" mientras tocaba el código de envío).
- [ ] Las 2 plantillas nuevas (`recordatorio_pago_pendiente`, `poliza_por_vencer`) están enviadas a
      aprobación de Meta, aunque el resultado (paso 10) siga pendiente.

**Ningún warning se ignora.** Si `node --check` marca algo, se corrige antes de seguir — no se
"revisa después".

### 20.2 Risk register

| Riesgo | Probabilidad | Impacto | Señal temprana | Mitigación |
|---|---|---|---|---|
| Meta rechaza (no solo demora) alguna de las 2 plantillas nuevas | M | M | El dashboard de Zernio muestra `REJECTED` en vez de `PENDING`/`APPROVED` | Ajustar el texto de la plantilla según el motivo de rechazo de Meta y reenviar — no bloquea `factura`, que ya tiene plantilla aprobada |
| Un cliente con nombre/teléfono con caracteres raros rompe el armado de `template.elements` | B | M | La fila de ese destinatario queda `fallido` con un error de Zernio sobre formato de plantilla | Mismo manejo de error ya usado en `whatsapp-notificar` — el fallo queda contenido a ESA fila, no tumba la tanda entera |
| Un agente dispara 2 tandas al mismo segmento por error (doble click) | M | B | Dos lotes distintos con overlap de `cliente_id` | Cada lote es independiente — un cliente puede terminar recibiendo 2 mensajes reales si esto pasa; mitigación de UX: deshabilitar el botón "Confirmar y enviar" mientras la creación del lote está en curso (parte del paso 5) |
| El volumen real supera los 300 destinatarios estimados y el polling tarda demasiado en pantalla | B | B | Una tanda de +500 tarda varios minutos en completar | El diseño de a `limite` por llamada escala sin cambios de código — solo tarda más en pantalla; si se vuelve un problema real, subir `limite` (tope duro 50) es un cambio de una línea |
| Falla de red a mitad de una tanda deja al agente sin saber si debe reintentar | B | B | El navegador pierde conexión durante el polling | El `lote_id` sigue existiendo con su progreso real en la base — reabrir el panel de progreso con el mismo `lote_id` retoma exactamente donde quedó (Done-when del paso 5) |
| El motor de precios completo (`getTot`/`getPT`/`getPD`) no se replicó en la Edge Function para el tipo `factura` | Certeza (decisión explícita, no un riesgo oculto) | B | — | Se usa el monto de la factura YA GENERADA (`facturas.total`) en vez de recalcular precios — si un cliente no tiene ninguna factura todavía, ese destinatario queda `fallido` con un motivo claro en vez de silenciosamente mal calculado |

### 20.3 Decision log

| # | Decisión | Alternativa rechazada | Por qué | Se revertiría si |
|---|---|---|---|---|
| 1 | Loop sobre el endpoint 1 a 1 de Zernio ya probado, en vez de su API de Broadcasts | Zernio Broadcasts | `variableMapping` no soporta datos por cliente más allá de nombre/teléfono/email/empresa — verificado contra la documentación real, no supuesto | Si Zernio agrega soporte real de variables por contacto en Broadcasts |
| 2 | Reemplazar el flujo `wa.me` por completo, sin dejarlo como respaldo | Mantener los dos caminos | Decisión explícita del dueño en la entrevista de este blueprint — un solo camino que mantener | Si en la práctica Zernio falla seguido y hace falta un respaldo manual |
| 3 | Progreso en vivo en pantalla mientras se manda, en vez de disparar en segundo plano y avisar al final | Envío en segundo plano | Decisión explícita del dueño en la entrevista | Si el volumen real crece tanto que quedarse viendo la barra de progreso deja de ser práctico |
| 4 | El estado de la tanda vive en la base de datos (2 tablas nuevas), no solo en memoria del navegador | Guardar el progreso solo en el frontend (ej. `localStorage`) | Un refresco de página o un corte de red no debe poder duplicar ni perder un envío — solo la base de datos puede garantizar eso de forma confiable | Nunca — es la garantía central de "cero duplicados" que pidió el dueño |
| 5 | Reusar la plantilla `factura_generada` ya aprobada para el tipo `factura`, y pedir 2 plantillas NUEVAS para `pago`/`vence` en vez de reusar `atrasado`/`pago_aplicado` | Reusar las 4 plantillas ya existentes de fase 1 tal cual | El contenido/tono de `atrasado` (menciona "X meses de atraso") y `pago_aplicado` (confirma un pago ya hecho) no coincide con lo que el WA Masivo viejo mandaba para "recordar deuda"/"póliza por vencer" | Si el dueño prefiere el tono de `atrasado` para el recordatorio de deuda, en cuyo lugar se reusaría esa plantilla y no haría falta pedir aprobación nueva de Meta |
| 6 | Procesar de a `limite` (15) destinatarios por invocación de la Edge Function, con polling del frontend, en vez de un solo request que mande toda la tanda | Un solo request gigante | Evita el riesgo de exceder el tiempo de ejecución de la Edge Function y da progreso en vivo real (decisión 3) sin necesitar WebSockets/Realtime | Si Supabase sube mucho el límite de tiempo de ejecución Y se decide que el progreso en vivo ya no hace falta |
| 7 | Modo archivo único (no bundle), aunque la tarea original pedía bundle | Forzar bundle con pasos artificialmente divididos | La regla propia de The Architect deriva el modo del conteo real de pasos (11 ≤ 11 → archivo único) y prohíbe explícitamente inflar el conteo para cambiar el modo | Si de verdad aparecen más pasos genuinos (ej. si Meta pide cambios sustanciales a las plantillas que requieran volver a tocar la Edge Function como un paso aparte) |

### 20.4 Qué construir después

1. **Zernio Broadcasts para campañas genéricas sin monto** (ver §1 Non-Goals, fila 1) — si algún
   día se quiere mandar algo que solo necesite el nombre del cliente (no un monto/saldo/fecha
   propios), ahí Broadcasts sí es la herramienta correcta y evita reinventar el control de
   velocidad que este blueprint construye a mano.
2. **Reimplementar el motor de precios (`getTot`/`getPT`/`getPD`) del lado del servidor**, para que
   el tipo `factura` no dependa de que ya exista una fila en `facturas` (ver §20.2, último riesgo) —
   permitiría mandar "factura generada" incluso a un cliente cuya factura del mes técnicamente no
   se generó todavía como fila, calculándola al vuelo.
3. **Retomar automáticamente un polling huérfano** si el agente recarga la página a mitad de una
   tanda (hoy: el progreso sigue existiendo en la base, pero el agente tiene que reabrir el panel a
   mano y saber el `lote_id` — ver §6 Manejo de estado).
4. **Reintento manual de solo los fallidos** de una tanda ya completada, sin tener que armar una
   tanda nueva desde cero con esos mismos clientes.
5. **Panel de historial de tandas pasadas** (ver §1 Non-Goals, fila 6).

---

*Fin del blueprint. El orden de build es §9. Se considera terminado cuando §20.1 está en verde.*
