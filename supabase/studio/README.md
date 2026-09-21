# STUDIO — clon del esquema POS desde la base madre

Extracción **solo lectura** (catálogo `pg_catalog`/`information_schema`) del proyecto Supabase madre
`tnwsgcxurfyuszxsewsn` (NEXUS PRO Seguros) realizada el 2026-09-21, para levantar un proyecto Supabase
**nuevo e independiente** para el cliente retail **STUDIO**. Nada de esto se ha aplicado a ninguna base.

Ejecutar en orden sobre un proyecto vacío (Postgres 17; `auth`, `storage` y `extensions` ya existen):

| # | Archivo | Contenido | Cantidad |
|---|---|---|---:|
| 1 | `01_extensiones.sql` | `uuid-ossp`, `pgcrypto` en schema `extensions` | 2 |
| 2 | `02_helpers.sql` | `mi_organizacion`, `mi_rol`, `mi_usuario_id`, `set_organizacion_id`, `mi_agente_efectivo` + tabla mínima `agentes` | 5 funciones |
| 3 | `03_tablas.sql` | `CREATE TABLE` con columnas, defaults, NOT NULL y constraints PK/UNIQUE/CHECK (sin FKs) | **65 tablas** (9 base + 51 `pos_*` + 3 `rrhh_*` + 2 `saas_*`) |
| 4 | `04_fks_indices.sql` | FKs (`pg_get_constraintdef`) + índices que no respaldan constraints (`pg_get_indexdef`) | **61 FKs**, **78 índices** |
| 5 | `05_secuencias.sql` | Secuencias públicas sin OWNED BY (`pos_compra_seq`, `pos_venta_seq`, `recibo_seq`) | 3 |
| 6 | `06_funciones.sql` | `pg_get_functiondef` literal: 62 `pos_*` + 6 funciones de trigger (`set_auditoria_metadata`, `nx_*`) | **68 funciones** |
| 7 | `07_triggers.sql` | `pg_get_triggerdef` de triggers no internos sobre las 65 tablas | **72 triggers** |
| 8 | `08_rls.sql` | `enable row level security` (65 tablas) + políticas reconstruidas de `pg_policies` | **79 políticas** |
| 9 | `09_grants_storage.sql` | Grants estándar, buckets `comprobantes`/`documentos`, 4 políticas `storage.objects` | 2 buckets, 4 políticas |

Verificación: `03_tablas.sql` contiene 65 sentencias `create table` = 65 tablas del set en la madre;
`08_rls.sql` contiene 79 `create policy` = 79 políticas consultadas en `pg_policies`. Los cuerpos de las
funciones y el DDL de las tablas se contrastaron por md5 contra `pg_get_functiondef()` y el generador
de DDL ejecutado en la madre (ver bitácora).

Notas de orden:

* `03_tablas.sql` crea las 3 secuencias con `if not exists` antes de las tablas porque `pos_compras.numero`
  y `pos_ventas.numero` tienen `default nextval(...)`; `05_secuencias.sql` es idempotente.
* `02_helpers.sql` y `06_funciones.sql` fijan `check_function_bodies = off` para que las funciones
  `LANGUAGE sql` compilen antes de que existan las tablas y sin importar el orden entre funciones.
* `public.agentes` se crea en 02 (la usa `mi_agente_efectivo`) y se repite en 03 con `if not exists`.
* No existe ninguna función `rrhh_*` en la madre (el enunciado estimaba 66 funciones; hay 62 `pos_*`).
* No hay columnas identity/generadas, ni vistas `pos_*`/`rrhh_*`, ni tablas con FORCE RLS.

## Diferencias respecto al enunciado

* El enunciado hablaba de ~55 tablas `pos_*`, 62 FKs, 79 índices, 74 políticas: los valores reales de la
  madre son 51 / 61 / 78 / 79 respectivamente.
* Se añadió `mi_usuario_id()` a `02_helpers.sql` (no estaba en la lista) porque la referencian
  `pos_fin_registrar_pago_v2`, `pos_fin_reversar_pago` y la política `mias_usuario_preferencias`.
* Se añadieron `alter default privileges` en 09 para que objetos creados después conserven los grants.

## Referencias externas / objetos que NO se pudieron clonar tal cual (decisión del dueño)

| Objeto | Referencia fuera del set | Impacto en STUDIO |
|---|---|---|
| Función `nx_capturar_excepcion_operativa` (trigger `trg_nx_capturar_excepcion_operativa` AFTER INSERT en `auditoria`) | `insert into public.operacion_excepciones` (tabla no incluida) | Fallará todo INSERT en `auditoria` cuya `accion` sea una de las 5 excepciones operativas. Opciones: crear `operacion_excepciones`, hacer stub, o no crear el trigger. |
| Funciones `pos_asegurar_cuentas_operativas`, `pos_reconstruir_asiento_compra`, `pos_reconstruir_asiento_venta`, `pos_snapshot_costo_venta_item` | uuid hardcodeado `'c6e4b954-45ee-46b9-ba94-ae1cbbcc7e10'` (organización de la madre) | La contabilidad automática (asientos de venta/compra, snapshot de costo) **no se ejecutará** para la organización de STUDIO. Hay que sustituir el uuid o eliminar el candado. |
| Funciones `pos_fin_registrar_pago_v2`, `pos_fin_reversar_pago` | cuenta contable `'4103'` (mora) que `pos_asegurar_cuentas_operativas` no crea | Dato, no esquema: si no existe la cuenta 4103 en `pos_cuentas`, la línea de mora del asiento no se inserta. |
| Políticas `all_agentes`, `org_bancos`, `all_recibo_contador`, `all_secuencias_ncf` | `organizaciones.slug = 'nexus-pro'` | En STUDIO el slug será otro: ajustar el literal o reescribir la política por `organizacion_id`. |
| Política `storage.objects.whatsapp_inbox_media_lectura` | bucket `whatsapp-inbox-media`, módulo WhatsApp, slug `nexus-pro` | **No incluida** (fuera del alcance POS). Tampoco los buckets `respaldos` ni `whatsapp-inbox-media`. |
| FKs `profiles_id_fkey`, `pos_cajas_usuario_id_fkey` | `auth.users(id)` | OK: `auth.users` existe en cualquier proyecto Supabase. |
| Columnas `pos_clientes.acepta_whatsapp`, `acepta_whatsapp_fecha`; `saas_suscripciones.whatsapp` | Nombres relacionados con WhatsApp, pero son columnas simples | Sin dependencia externa; se conservan. |
| Funciones con `SECURITY DEFINER` (`mi_*`, `set_organizacion_id`, `set_auditoria_metadata`, `nx_capturar_excepcion_operativa`, `nx_caja_asignar_propietario`, `pos_siguiente_ncf`, `pos_transferir_stock`) | — | Se conservan tal cual; revisar `search_path` fijo (`public`) al auditar seguridad. |

No se encontraron referencias a `clientes`, `abonos`, `whatsapp_*`, `net.http_post`, `vault`, `cron` ni
`cron_secretos` dentro de las 68 funciones ni de las 79 políticas extraídas. No se incluyeron filas de
datos (salvo la semilla de `storage.buckets`), ni DDL de `auth.users`, ni secretos.

## Ajustes ya aplicados a los archivos (2026-09-21)

1. `operacion_excepciones` → se crea en `10_ajustes_studio.sql` (tabla + índice + RLS + grants), copiada de la madre.
2. uuid de organización en las 4 funciones contables de `06_funciones.sql` → sustituido por
   `e404d1c4-24c5-4e17-88f6-84bef09d6d19`, que es el `id` de la fila `slug='studio'` en `organizaciones` de la
   base madre. **La org STUDIO debe sembrarse en la base nueva con ese mismo id** para que la contabilidad
   automática (asientos de venta/compra, snapshot de costo) funcione.
3. Políticas `all_agentes`, `org_bancos`, `all_recibo_contador`, `all_secuencias_ncf` en `08_rls.sql` →
   `organizaciones.slug = 'studio'`.

## Pendientes (siembra de datos, fuera de este extracto)

* `organizaciones` (id fijo arriba, slug `studio`, tipo `tienda`, sin `dominio` — es inquilina de SU base),
  `usuarios_sistema` + `auth.users` + `profiles` del admin, `pos_config`, `pos_acceso`, `pos_cuentas`
  (incluida la cuenta de mora `4103`), almacén y caja iniciales.
