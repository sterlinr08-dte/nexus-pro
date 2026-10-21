# MEMORIA-TECNICA.md — detalle técnico (complemento de `docs/MEMORIA.md`)

No se carga sola: leerla cuando el trabajo toque estas piezas. Actualizarla en cada entrega igual que la MEMORIA.

## 4. Integraciones y piezas técnicas
- **Supabase** madre: `tnwsgcxurfyuszxsewsn`. Max rows de la Data API subido a 5000 por el dueño (18-oct-2026).
- **Deploy:** la integración Git de Cloudflare Workers publica `main` (Worker `nexus-pro`). No se usa GitHub Actions para publicar.
- Para verificar: `curl` a nexusprord.com, revisar `APP_VERSION` y comparar el sha256 con `index.html` de `main`.
- **Cargador:** `parches-seguros.js` carga las capas con `?b=` (hoy `b=6032`). Las capas nuevas de diseño van en línea dentro de `index.html` (`style#nx…Pane`) para evitar el FOUC.
- **Edge Functions en el repo:**
  - Facturas y otras: `auto-facturacion`, `usuarios-acceso`, `nexus-smart` y `sentry-alerta-whatsapp`.
  - Inbox: `whatsapp-webhook`, `whatsapp-inbox-leer`, `whatsapp-inbox-enviar`, `whatsapp-inbox-reaccionar` y `whatsapp-hilo-eliminar`.
  - Avisos: `whatsapp-notificar`, `whatsapp-notificar-atraso-v2`, `whatsapp-recordatorio-pendiente-manual`, `whatsapp-envio-masivo`, `whatsapp-enviar-plantilla` y `whatsapp-pagos-agente-notificar`.
  - Plantillas: `whatsapp-plantilla-crear` y `whatsapp-plantillas-gestionar`.
  - Automatizaciones: `whatsapp-automatizaciones-run`.
  - Agentes: `whatsapp-reporte-diario-agentes` (v10, con `x-cron-token`; «En su poder» con el desglose efectivo/banco) y `whatsapp-resumen-ciclo-agentes`.
- **Zernio:** proveedor de la API oficial de WhatsApp. La suscripción de NEXUS quedó filtrada a su perfil (14-oct). Los 3 negocios comparten la cuenta de Zernio y la organización de Supabase.
- **Plantillas WhatsApp:**
  - Enviando bien: `factura_generada`, `pago_confirmado_periodo_v2`, `recordatorio_atraso` y `entrega_confirmada`.
  - Aprobadas por Meta: `pago_pendiente_validacion_agente_v2` y `pago_validado_resumen_agente`.
  - Envío masivo: `recordatorio_pago_pendiente` y `poliza_por_vencer`.
  - Todo aviso a un cliente va como plantilla aprobada, nunca como texto libre (REGLAMENTOS §12).
- **Cron y cadencia:** `whatsapp_detectar_atrasados` manda los avisos de atraso. La cadencia vive en `clientes.ultimo_aviso_atraso_en` + `whatsapp_config.dias_entre_avisos_atraso` (3 días) y la comparten el cron, el botón manual y el envío masivo.
- **Dinero (fuente de verdad):**
  - Abonos: `public.abonos`.
  - Cobro: RPC `seguros_registrar_cobro_con_entrega`.
  - Transferencias: tabla `transferencias_agentes` y RPC `transferencias_crear`, `transferencias_aceptar` y `transferencias_rechazar`.
  - Custodia por ciclo: RPC `seguros_resumen_ciclo_admin`.
  - La entrega directa cuenta solo con el pago validado (migración `seguros_entrega_directa_tras_validar`, aplicada).
- **Pruebas:** `scripts/qa-*.mjs` (Playwright contra una REST simulada). Se corren **una detrás de otra**, nunca a la vez. Hay 2 fallos que ya estaban en `main`: `qa-claro-modulos` («CS» en Préstamos) y `qa-inicio-glass` («cobrado hoy» del simulador).

## 6. Ramas, PR y lo que NO está publicado
- `main` = `ef9050f` (21-oct-2026): app 59.54 más las skills `design-taste-frontend` y `the-architect`, y `DESIGN.md`.
- La rama de trabajo de las versiones 59.34–59.54 fue `claude/inicio-vidrio` (se publicaba por fast-forward).
- **`claude/review-claude-md-jpzk7k`:** rama vieja que el dueño decidió **no publicar** tal cual. Se lleva a `main` **solo por cherry-pick** y con su OK. Contiene:
  - **59.28** (tamaño de los textos) y **59.29** (fondo azul marino con el mar). El dueño dijo «dejarlo como está»: **no proponerlas de nuevo** por iniciativa propia.
  - Commits viejos de usuarios con acceso, custodia y reporte diario. Su contenido equivalente ya está en `main` por cherry-pick (59.30 y la publicación del 15-oct). Sus copias en esta rama no se mezclan.
  - Skills que no están en `main`: `ig-*`, `video-understand`, `grill-me`/`grilling`, `wait-what`, `handoff` y `abogado-del-diablo`. El catálogo de `CLAUDE.md` de esta rama es distinto del de `main`.
- **59.25** (comprobantes sin repetir), rama `claude/bauche-unico`: sin publicar. Lleva migraciones y espera la clave nueva de Anthropic y el OK para la base.
- **PR #326** (WhatsApp desktop compacto) y **PR #327** (falso «0 conversaciones»): siguen abiertos y en borrador.
- Migración `20261007120000_pos_fiado_abono_servidor.sql` (POS fiado): **sin aplicar**. Antes falta correr `supabase/pruebas/20261007120000_prueba_fiado.sql` en el editor SQL.

