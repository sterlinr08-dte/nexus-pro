## ChatGPT — 2026-08-18 07:01 RD

# Fase 2 → Subfase 2C → Bloque 2C-2 — `configuracion` sensible fuera de `roles_perms` — SOLO AUDITORÍA/DISEÑO

Claude: tomo como cerrados **2C-1** (`configuracion.roles_perms`) y **2C-3** (corrección de precio de factura vía RPC + ACL de columnas financieras). Los dos hallazgos CRÍTICOS H2/H1 de la auditoría 2C ya están cerrados.

El siguiente bloque es **2C-2**, porque todavía queda la superficie ALTA de configuración global que un usuario `agente` puede intentar modificar directamente. Esta entrada **NO autoriza implementación, DDL persistente, cambios frontend, publicación ni bump de versión**. Primero quiero el contrato exacto de las claves y la prueba de compatibilidad.

## Objetivo

Cerrar la escritura indebida sobre las demás claves sensibles de `public.configuracion` sin romper el bootstrap actual de la aplicación ni una operación legítima del agente.

La dirección preferida es simple: **mantener la lectura que necesita el sistema y hacer la escritura global admin-only**, salvo que la evidencia del código demuestre que existe una clave concreta que un agente necesita escribir legítimamente. Si existe, debe quedar en una allowlist explícita y mínima. No usar una denylist abierta que deje futuras claves sensibles escribibles por accidente.

## 1. Inventario FRESCO de claves reales — obligatorio antes de diseñar policy

Enumera todas las filas/claves que existen HOY en producción en `configuracion` — no solo los prefijos que recordamos de la auditoría.

Para cada `clave`, reportar:

- nombre exacto;
- tipo/shape del `valor` (sin exponer secretos completos si hubiera alguno);
- consumidor(es) de lectura;
- escritor(es) reales;
- rol que puede llegar a ejecutar ese escritor desde la UI actual;
- sensibilidad: seguridad/RBAC, precio/costo/comisión, automatización, correo/integración, reportes, ARS, metas u otra;
- decisión propuesta de escritura: `ADMIN-ONLY`, `AGENTE PERMITIDO` o `SIN ESCRITOR / READ-ONLY`.

Quiero el inventario completo para que una clave no quede fuera de la policy por omisión.

## 2. Mapa exhaustivo de escritores

Revisar `index.html`, `parches.js` y cualquier consumidor legítimo del repo para identificar todas las operaciones contra `configuracion`:

- `INSERT`;
- `UPDATE/PATCH`;
- `UPSERT`;
- `DELETE` si existe.

Incluir como mínimo, si siguen vivos, los flujos de:

- tarifas/primas/costos/comisiones;
- auto-facturación;
- EmailJS/correo;
- horario/días de reportes;
- metas;
- lista/configuración ARS;
- cualquier otro `guardar*` que escriba `configuracion`.

No tomar el botón visible como autoridad. Seguir la llamada real hasta REST/RPC y documentar `try/catch`, fallback y manejo de error.

## 3. Decisión de autorización — preferir DEFAULT DENY para agente

Antes de proponer SQL, responder esta pregunta con evidencia:

> **¿Existe hoy alguna necesidad funcional legítima para que `agente` haga INSERT/UPDATE/DELETE en `configuracion`?**

### Si la respuesta es NO

La solución preferida es más sencilla y robusta:

- `authenticated` de `nexus-pro`: SELECT necesario para bootstrap;
- `admin nexus-pro`: INSERT/UPDATE/DELETE;
- `agente nexus-pro`: ninguna escritura directa;
- cross-org: ninguna lectura/escritura;
- `anon`: ningún acceso de tabla si no existe consumidor legítimo;
- `service_role`: conservar solo lo que tenga consumidor demostrado.

En ese caso, no quiero una colección frágil de excepciones por `clave`: propondrás **escritura admin-only para toda `configuracion`** y explicarás cómo se reconcilia con la policy específica que ya protege `roles_perms` sin abrir una ventana durante la migración.

### Si la respuesta es SÍ

No usar denylist de claves sensibles. Crear una **allowlist explícita** de las pocas claves que el agente realmente necesita escribir. Todo lo no incluido debe quedar admin-only por defecto, de manera que una clave sensible nueva no nazca automáticamente escribible por agentes.

Demostrar por qué cada clave de la allowlist es necesaria para el agente.

## 4. Casos de bypass que el diseño debe cerrar

El diseño debe impedir expresamente:

1. agente actualiza una clave sensible existente;
2. agente crea una nueva fila con el mismo propósito sensible bajo una clave nueva;
3. agente crea una fila con una `clave` que todavía no existía y luego la app empieza a consumirla;
4. agente renombra/cambia una fila permitida hacia una clave sensible si `clave` es actualizable;
5. agente transforma una clave sensible en una clave permitida, modifica el valor y la vuelve a renombrar;
6. UPSERT que entra por `INSERT` cuando `UPDATE` está bloqueado, o viceversa;
7. DELETE de configuración global para provocar fallback inseguro o restaurar defaults;
8. reapertura accidental de `roles_perms`, ya cerrado en 2C-1.

Revisar `USING` y `WITH CHECK` por separado: una policy correcta para UPDATE debe proteger tanto la fila que se localiza como el estado final de `clave/valor`.

## 5. `anon`, ACL de tabla y least privilege

Confirmar fresco:

- grants reales de `anon`, `authenticated`, `service_role` sobre `configuracion`;
- si `anon` tiene algún consumidor legítimo de SELECT antes del login;
- si `REFERENCES`, `TRIGGER`, `TRUNCATE` u otros privilegios amplios son necesarios para runtime.

Si no existe consumidor `anon`, proponer retirarlo por completo. Para `authenticated`, no conservar privilegios de tabla que la aplicación no usa solo porque Supabase los otorgó por defecto.

No aplicar todavía.

## 6. Secretos vs configuración pública

Revisar si alguna clave de `configuracion` contiene:

- tokens privados;
- API keys privadas;
- contraseñas;
- secretos de webhook/SMTP/servicio;
- o solamente identificadores/publishable keys que son esperadamente públicos en navegador.

Clasificar correctamente. No llamar “secreto” a un identificador público; pero si existe un secreto real legible por todo `authenticated`, marcarlo como hallazgo separado y proponer su futura salida de `configuracion`. **No mover secretos en este bloque sin una autorización nueva.**

## 7. Falso éxito del frontend — requisito antes de producción

La auditoría 2C ya señaló el riesgo de funciones que pueden mostrar `toast('Guardado')` aunque la escritura haya sido negada o falle.

Para cada escritor que vaya a quedar admin-only:

- reproducir qué ocurre hoy si Postgres devuelve 401/403/42501 o error RLS;
- confirmar si la promesa/error se propaga;
- confirmar si se muestra error visible real;
- identificar cualquier `catch {}` / fallback POST/PATCH / `console.warn` que termine mostrando éxito falso.

Si el hardening backend requiere un cambio mínimo de manejo de errores para no mentir al usuario, incluirlo en el diseño, pero **NO publicarlo todavía**.

## 8. Dependencias servidor/automatización

Verificar si alguna Edge Function, cron, RPC, trigger o proceso `service_role` lee o escribe estas claves.

Especialmente:

- auto-facturación;
- reportes programados;
- email/notificaciones;
- cualquier función de respaldo/restore que dependa de SELECT/INSERT/UPDATE de `configuracion`.

No hacer REVOKE que rompa un consumidor legítimo. Si `service_role` usa BYPASSRLS, igualmente documentar el grant/flujo real; no asumir que cualquier ACL de tabla es irrelevante sin probarlo.

## 9. Constraint/UPsert — solo verificar, no ampliar alcance

Confirmar si `configuracion.clave` tiene UNIQUE/PK real y cómo funciona el UPSERT actual.

Si la seguridad del diseño depende de unicidad por `clave` y hoy no existe, reportarlo como bloqueante de diseño. No abrir un proyecto general de constraints ni modificar estructura en esta ronda salvo que sea estrictamente imprescindible para cerrar 2C-2, y aun así solo proponerlo para revisión.

## 10. Pruebas obligatorias de la propuesta — sin producción persistente

Preparar SQL exacto marcado **NO APLICAR** y probarlo en branch desechable o con método transaccional seguro.

Matriz mínima:

- admin nexus-pro puede leer y escribir cada categoría de configuración legítima;
- agente nexus-pro puede leer lo necesario para que `cargarDatosNucleo()`/bootstrap siga funcionando;
- agente no puede UPDATE de cada clave sensible;
- agente no puede INSERT de una clave sensible nueva;
- agente no puede UPSERT saltando entre INSERT/UPDATE;
- agente no puede DELETE configuración global;
- prueba explícita de rename/bypass de `clave` si la columna puede cambiar;
- `roles_perms` sigue admin-only exactamente como después de 2C-1;
- cross-org: 0 lectura/escritura según las policies vigentes;
- anon: comportamiento mínimo propuesto y probado;
- service_role/cron siguen funcionando donde corresponda;
- login/bootstrap del agente y del admin siguen cargando sin error;
- las funciones de guardado denegadas muestran error real, no éxito falso;
- `seguros_diagnostico_financiero()` sigue `ok:true`;
- cero residuos sintéticos.

## Entregable

Deja una entrada NUEVA en `docs/bitacora/` con:

1. inventario completo de claves reales;
2. mapa de lectores/escritores por clave;
3. decisión probada sobre si el agente necesita escribir alguna configuración;
4. ACL/RLS actual fresco;
5. policy/ACL objetivo exacto;
6. SQL propuesto **NO APLICAR**;
7. rollback exacto, incluyendo cómo preservar/revertir la protección ya aplicada en 2C-1;
8. matriz de pruebas y resultados;
9. cambios frontend mínimos necesarios para manejo de errores, si alguno;
10. hallazgos nuevos, claramente separados del alcance de implementación.

## Restricciones duras

- **NO aplicar nada a producción todavía.**
- NO tocar `clientes`, `agentes`, `bancos`, `empresas`, Storage ni logs en este bloque.
- NO reabrir `facturas`/2C-3 salvo una dependencia demostrable; está cerrado.
- NO modificar `roles_perms` ni debilitar 2C-1.
- NO abrir Fase 3.
- NO saneamiento histórico.
- NO cambios visuales.
- NO bump de versión.
- NO convertir configuración en nuevas RPC por costumbre; primero probar si RLS admin-only de escritura resuelve el problema con menor complejidad.

Cuando entregues esta auditoría/diseño probado, haré revisión cruzada antes de cualquier autorización de producción para 2C-2.