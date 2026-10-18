# AGENTS.md — punto de entrada fijo para ChatGPT / Codex y Claude (NEXUS PRO Seguros)

**Ruta fija:** `https://github.com/sterlinr08-dte/nexus-pro/blob/main/AGENTS.md`
Este archivo no cambia de sitio ni de nombre. Toda sesión de IA en NEXUS PRO empieza aquí, siempre en la rama `main`.

## 1. Orden de lectura obligatorio (en este orden, sin saltarse ninguno)

1. `AGENTS.md` (este archivo).
2. `CLAUDE.md` — reglas del proyecto, estado estable, plantillas WhatsApp, iniciativa de acumulados/transferencias, encargo visual vigente.
3. `docs/bitacora/README.md` — cómo se escribe la bitácora.
4. Las **cinco entradas más recientes** de `docs/bitacora/` (orden alfabético = cronológico), sean `-claude.md` o `-chatgpt.md`.
5. `REGLAMENTOS.md` y `POLITICA-SEGURIDAD.md` cuando el cambio toque reglas de negocio o seguridad.
6. `HERRAMIENTAS.md` (skills y conectores) y `docs/TRASPASO-CLAUDE.md` (lo que sabe Claude: recetas, trampas y estado de todos los trabajos al 13-oct-2026).
7. El código real que se va a tocar (`index.html`, `parches-seguros-base.js`, `parches-whatsapp-*.js`, `parches-pos.js`, `supabase/`). Nunca asumir cómo funciona un módulo sin leerlo.

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
  - **Excepción decidida por el dueño (07-oct-2026, Fase 1 de `docs/PLAN-POS-DESDE-STUDIO.md`):** se permite portar al POS multiempresa **funciones y código genérico** de STUDIO. Nunca sus datos, su base (`edbknlkjnlfmkkiizdbe`), su dominio, sus teléfonos, su marca (negro y oro, `studio-*.css`, `html.nx-studio`) ni los respaldos `'STUDIO'` en textos: en NEXUS se usa el nombre de la organización. Lista completa de lo que no se porta en la última sección del plan.

## 4. Estado vivo (actualizar aquí en cada entrega)

- Producción: `https://nexusprord.com` = Worker Cloudflare `nexus-pro`. Versión publicada: **59.22** (12-oct-2026: modo claro nuevo —gemelo claro del grafito, `html.tema-claro`; se vuelve al Clásico de antes con `localStorage.nx_claro_off='1'` en un equipo o `NX_TEMA_CLARO=false` para todos—; riel azul NEXUS con su apertura animada, solo en la PC; Premium y Liquid Glass sin el cuadro clásico al abrir; la píldora del menú sigue a la pantalla abierta; «ea4a» de WhatsApp; bitácoras `2026-10-12-1000-claude.md` y `2026-10-12-1029-claude.md`; antes 59.21, 11-oct-2026: modo oscuro grafito; botones «nivel pro» y sin el botón flotante ☰ del celular; «Cobrar» en los menús de WhatsApp y menú del mensaje como el del iPhone; pantalla de Cobros; «Hoy, en vivo» en el Inicio —gráfica de lo cobrado hoy que sube sola, lee los abonos de hoy cada 30 s, se oculta con `window.NX_COBRO_VIVO=false`—; bitácoras `2026-10-11-2045-claude.md`, `2026-10-11-2257-claude.md`, `2026-10-11-2328-claude.md` y `2026-10-11-2331-claude.md`; antes 59.20, 11-oct-2026: isla de avisos de pagos y WhatsApp estilo Dynamic Island, `parches-isla-avisos.js`; se apaga en un equipo con `localStorage.nxIslaAvisos='0'`; bitácoras `2026-10-11-1834-claude.md` y `2026-10-11-1934-claude.md`; antes 59.19, 09-oct-2026: listas sin el efecto de rueda —Clientes, Facturas y demás—, bitácora `2026-10-09-1610-claude.md`; antes 59.18, 07-oct-2026: botón «Compartir imagen» en el recibo de Seguros, PR #402; antes 59.17 POS Fase 2 solo app, PR #401). La migración `20261007120000_pos_fiado_abono_servidor.sql` **NO está aplicada**: falta correr `supabase/pruebas/20261007120000_prueba_fiado.sql`.
- Lista para publicar: **59.23** en la rama `claude/claro-contraste` (12-oct-2026): contraste del modo claro en Préstamos y Punto de venta (solo CSS, §12 de `style#nxTemaClaro`; de 1,402 textos con poco contraste a 0 en 78 pantallas, medido con `scripts/qa-claro-modulos.mjs`) y arreglo de los botones del POS que salían blancos sobre blanco. Bitácora `2026-10-12-1200-claude.md`. No publicar sin «publícalo».
- Publicada **59.34** (18-oct-2026): Inicio en vidrio, parte 1, capa `#nxInicioPane` (se apaga con `NX_INICIO_PANE=false` o `localStorage.nx_inicio_pane_off='1'`). Publicada **59.35** (parte 2, «Lo próximo»). Lista para revisar: **59.36** en `claude/inicio-vidrio`: parte 3, buscador en vidrio y ficha rápida del cliente (bitácora `2026-10-18-1155-claude-inicio-vidrio-parte3.md`). No publicar sin «publícalo».
- Supabase madre `tnwsgcxurfyuszxsewsn` — NEXUS PRO Seguros.
- WhatsApp: plantillas aprobadas listadas en `CLAUDE.md`; Inbox corporativo y automatizaciones en producción.
- Iniciativa abierta: acumulados por agente y ciclo (20 → 20), transferencias entre agentes, notificaciones, cierre por ciclo y consolidado mensual — empezar por la Fase 0 de auditoría descrita en `CLAUDE.md`.
- Trabajos abiertos: PR #326 (WhatsApp desktop compacto, borrador) y PR #327 (fix falso "0 conversaciones"); encargo visual móvil del Inbox de WhatsApp (ver `CLAUDE.md`).
- Pendiente del dueño: rotar la Global API Key de Cloudflare y actualizar el Vault (`cloudflare_api_token`); borrar Edge Functions de diagnóstico `nx-cf-dominio` y `nx-env-nombres`.

## 5. Coordinación entre las dos IA

- Antes de empezar, leer la última bitácora de la otra IA para no pisar trabajo. Si dos ramas tocan el mismo archivo, la segunda rebasa sobre `main` y lo dice en su bitácora.
- Ramas: `chatgpt/*` o `codex/*` para ChatGPT; `claude/*` para Claude. Un PR por entrega, con la bitácora dentro del mismo PR.
- Dudas de alcance: preguntar al dueño en el chat, no decidir por él.
