# 15-nov-2026 — Claude — Seguridad multiempresa previa a la demo: PUBLICADA

**Autorización:** el dueño escribió «Publícalo» tras ver el ensayo. Referencia: auditoría `…auditoria-seguridad-demo-publica.md`.

## Ensayo con vuelta atrás (producción, deshecho con `raise exception`)
Cajera: lee config 1; cambia config 0 (bloqueado); avanza NCF 2 (permitido); crea NCF bloqueado; borra NCF 0; custodia directa bloqueada; lista e-CF bloqueada. Admin: cambia config 1, roles 4, crea NCF ok, ve solo su empresa (1). `seguros_custodia_desglose_agente` dio «permission denied», pero ya antes no era ejecutable por `authenticated` (verificado); todas las funciones que usan las revocadas son `security definer` de `postgres`.

## Aplicado en producción
- **Base** (migración `20261115160000_seguridad_multiempresa_previa_demo.sql`, por SQL directo): `pos_config`, `pos_acceso` → lectura para la empresa, escritura solo admin; `pos_ncf_secuencias` → leer/avanzar la empresa, crear/borrar solo admin; tabla `pos_ecf_autorizadas` (RLS, sin políticas, vacía); `revoke execute` a `anon/authenticated` en `seguros_acumulado_validado_agente`, `seguros_cuenta_es_del_admin`, `seguros_entrega_directa_vigente_at`, `tablas_para_respaldo`, `rifa_expirar_apartados` (verificado: `service_role` conserva el permiso).
- **`ai-content-generar` v21:** retirada (410). Ninguna pantalla la llamaba. La v20 queda en el historial de Supabase.
- **`sms-httpsms-enviar` v17:** exige sesión real (`auth.getUser`), usuario activo, teléfono de un cliente de la empresa (bajo RLS) y consentimiento leído de `pos_clientes`; largo máximo 480.
- Verificado con la llave pública: SMS → 401; IA → 410.

## NO desplegado todavía
- **`ecf-mseller`** con lista de empresas autorizadas: el código está en el repo (este PR) pero **no se desplegó** (4 archivos, ~45 KB; desplegarlo a mano por la herramienta arriesga alterar código fiscal). Mientras tanto, emitir e-CF exige emisor (`pos_config.ecf_rnc`) y secuencia E, que desde hoy solo un admin puede crear. Queda cerrado para un usuario no administrador; sigue abierto para un admin de otra empresa. Desplegar antes del registro por la web.

## Pendiente
`enviar-reporte-email` (exigir empresa), `rifa`/`boleto`/`vendedor`, borrar funciones sobrantes, `supabase/config.toml`, buckets de Storage.
