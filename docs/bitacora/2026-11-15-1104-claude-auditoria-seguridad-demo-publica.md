# 15-nov-2026 — Claude — Auditoría de seguridad antes de abrir la demo pública del POS

**Decisión del dueño:** demo en la misma base (opción A), después de auditar. Solo lectura; no se cambió nada.

## Base de datos (producción, verificado)
- 138 tablas, todas con RLS; 129 filtran por empresa. Sin vistas.
- 78 funciones `security definer` ejecutables por `authenticated`; 61 comprueban `mi_organizacion()` (las de seguros exigen `nexus-pro`).
- Sin comprobación de empresa: `seguros_acumulado_validado_agente`, `seguros_cuenta_es_del_admin`, `seguros_entrega_directa_vigente_at` (devuelven un monto / sí-no / fecha con el uuid del agente; riesgo bajo), `rifa_expirar_apartados`, `tablas_para_respaldo`.
- `cron_secretos`: RLS activo, 0 políticas, sin permisos para `anon`/`authenticated`.
- `pos_config`, `pos_acceso`, `pos_ncf_secuencias`: cualquier rol de la empresa puede escribir (no solo admin).
- `organizaciones`: lectura pública incluida `auth_key` (3 llaves, todas tipo `anon`).

## Edge Functions
- WhatsApp (8 funciones con sesión): exigen `nexus-pro`; decodifican el JWT sin verificar firma, pero `verify_jwt=true` en producción → seguras hoy. Mejorar a `auth.getUser`.
- Tareas automáticas (respaldo, reportes, notificaciones): token de `cron_secretos` o secreto interno → seguras.
- **`ecf-mseller` (emitir / notas): RIESGO.** Solo pide sesión; no revisa rol ni empresa; usa la cuenta MSeller global. Un usuario de cualquier empresa puede emitir e-CF.
- **`ai-content-generar`: RIESGO comprobado.** Acepta la llave pública (petición vacía → 400 de validación, no 401). Cualquiera puede gastar el saldo de IA.
- **`sms-httpsms-enviar`: abierta pero dormida.** Acepta la llave pública; responde 500 porque `HTTPSMS_API_KEY`/`HTTPSMS_FROM_NUMBER` no están configuradas. Si se configuran sin corregir, cualquiera podría enviar SMS.
- `rifa` + `boleto`: se pueden enumerar nombre y teléfono de compradores de una rifa pública (riesgo medio, solo rifas).
- `vendedor`: códigos de 4 caracteres sin límite de intentos (bajo).
- `enviar-reporte-email`: el camino de admin no revisa empresa (importa cuando otra empresa tenga admin).
- `crear-usuario-staff`: exige admin y fuerza la empresa del que llama → segura mientras la demo no sea admin.
- Sobrantes para borrar: `restaurar`, `zernio-filtro-nexus-20261014`, `whatsapp-diagnostico-plantillas-temporal` (410), `debug-templates`, `comprobante-prueba-clave-20261014`, `nx-cf-dominio`, `whatsapp-enviar-plantilla` (410).
- El menú de una tienda solo esconde Seguros en pantalla; la protección real es RLS.

## Bloque de cierre propuesto (pendiente de «publícalo»)
1. `ecf-mseller`: solo admin y solo empresas autorizadas por el superadmin.
2. `ai-content-generar`: `getUser` + admin de `nexus-pro`.
3. `sms-httpsms-enviar`: `getUser` + rol + empresa; consentimiento leído de la base.
4. Config POS (`pos_config`, `pos_acceso`, `pos_ncf_secuencias`): escritura solo admin (verificar antes que el avance del NCF en la venta no dependa de eso).
5. Tres funciones de seguros sin comprobación: exigir empresa o quitar permiso de ejecución directa.
6. `enviar-reporte-email`: exigir `nexus-pro`.
7. `rifa`/`boleto`/`vendedor`: quitar el id de la búsqueda, ocultar el teléfono, límite de intentos.
8. Borrar las 7 funciones sobrantes; guardar `supabase/config.toml` con `verify_jwt` de cada función.

## No verificado
Fortaleza de los tokens de cron; RLS de los buckets de Storage y de `rifa_*`.
