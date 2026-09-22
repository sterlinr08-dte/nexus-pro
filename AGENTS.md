# AGENTS.md — punto de entrada fijo para ChatGPT / Codex y Claude (NEXUS PRO Seguros)

**Ruta fija:** `https://github.com/sterlinr08-dte/nexus-pro/blob/main/AGENTS.md`
Este archivo no cambia de sitio ni de nombre. Toda sesión de IA en NEXUS PRO empieza aquí, siempre en la rama `main`.

## 1. Orden de lectura obligatorio (en este orden, sin saltarse ninguno)

1. `AGENTS.md` (este archivo).
2. `CLAUDE.md` — reglas del proyecto, estado estable, plantillas WhatsApp, iniciativa de acumulados/transferencias, encargo visual vigente.
3. `docs/bitacora/README.md` — cómo se escribe la bitácora.
4. Las **cinco entradas más recientes** de `docs/bitacora/` (orden alfabético = cronológico), sean `-claude.md` o `-chatgpt.md`.
5. `REGLAMENTOS.md` y `POLITICA-SEGURIDAD.md` cuando el cambio toque reglas de negocio o seguridad.
6. El código real que se va a tocar (`index.html`, `parches-seguros-base.js`, `parches-whatsapp-*.js`, `parches-pos.js`, `supabase/`). Nunca asumir cómo funciona un módulo sin leerlo.

## 2. Dónde escribir

- Cada cambio, auditoría o publicación deja **una entrada nueva** en `docs/bitacora/AAAA-MM-DD-HHMM-chatgpt.md` (ChatGPT/Codex) o `-claude.md` (Claude). Hora de República Dominicana. Nunca editar ni borrar entradas anteriores.
- Reglas y estado del proyecto: `CLAUDE.md`. Reglas de negocio decretadas por el dueño: `REGLAMENTOS.md`.
- Migraciones y Edge Functions: `supabase/` del proyecto madre `tnwsgcxurfyuszxsewsn`.

## 3. Reglas que no se negocian

- No publicar a `main` sin autorización explícita del dueño ("publícalo", "súbelo", "ponlo en vivo"). Trabajar en rama y PR.
- El deploy de `main` lo hace la integración Git de Cloudflare Workers; no usar GitHub Actions para publicar.
- Dinero, cobros, transferencias, comisiones y cierres: auditar la fuente de verdad primero y evitar doble contabilización. Una transferencia entre agentes no es un nuevo cobro.
- No tocar datos históricos ni hacer reparaciones masivas sin autorización específica.
- No enviar mensajes de WhatsApp a clientes sin autorización del dueño; pruebas solo al número del dueño. Dejar las plantillas como están.
- `ZERNIO_API_KEY` y cualquier secreto: jamás en frontend, logs, repo, bitácoras ni chat.
- Cambios visuales: aislados por módulo y reversibles; revisar la cascada `parches-whatsapp-*` antes de añadir capas; nada que reintroduzca FOUC en iPhone.
- **STUDIO ya no vive aquí**: es `sterlinr08-dte/studio-rd` con su propia base. No añadir nada de STUDIO a este repositorio.

## 4. Estado vivo (actualizar aquí en cada entrega)

- Producción: `https://nexusprord.com` = Worker Cloudflare `nexus-pro`. Versión publicada: **58.85** (22-sep-2026: STUDIO separado, mapa de bases por dominio retirado).
- Supabase madre `tnwsgcxurfyuszxsewsn` — NEXUS PRO Seguros.
- WhatsApp: plantillas aprobadas listadas en `CLAUDE.md`; Inbox corporativo y automatizaciones en producción.
- Iniciativa abierta: acumulados por agente y ciclo (20 → 20), transferencias entre agentes, notificaciones, cierre por ciclo y consolidado mensual — empezar por la Fase 0 de auditoría descrita en `CLAUDE.md`.
- Trabajos abiertos: PR #326 (WhatsApp desktop compacto, borrador) y PR #327 (fix falso "0 conversaciones"); encargo visual móvil del Inbox de WhatsApp (ver `CLAUDE.md`).
- Pendiente del dueño: rotar la Global API Key de Cloudflare y actualizar el Vault (`cloudflare_api_token`); borrar Edge Functions de diagnóstico `nx-cf-dominio` y `nx-env-nombres`.

## 5. Coordinación entre las dos IA

- Antes de empezar, leer la última bitácora de la otra IA para no pisar trabajo. Si dos ramas tocan el mismo archivo, la segunda rebasa sobre `main` y lo dice en su bitácora.
- Ramas: `chatgpt/*` o `codex/*` para ChatGPT; `claude/*` para Claude. Un PR por entrega, con la bitácora dentro del mismo PR.
- Dudas de alcance: preguntar al dueño en el chat, no decidir por él.
