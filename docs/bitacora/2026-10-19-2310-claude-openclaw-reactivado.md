# 2026-10-19 23:10 — Claude — OpenClaw (agente del dueño en WhatsApp) vuelve a contestar

## Solicitud del dueño
«El agente no está funcionando» (captura: «The background check did not complete» cada hora y «OpenClaw couldn't finish this request»).

## Diagnóstico
- OpenClaw corre en la PC del dueño (Windows, `C:\Users\BAYOCELL\.openclaw`), versión 2026.10.3, conectado al WhatsApp «Administración Bayol».
- Usaba la clave `asistente-whatsapp` del espacio de trabajo **ASISTENTE DE WHATSAPP** de la consola de Anthropic (último uso 14-oct).
- Causas encadenadas:
  1. Límite de gasto de la cuenta → Anthropic rechazaba desde el 14-oct (ver `bayolcell-taller/docs/bitacora/2026-10-19-2320-claude-ia-reactivada.md`). El dueño lo subió (organización US$30).
  2. OpenClaw marcó su único perfil de auth (`anthropic:setup-7a454643…`) en **cooldown rate_limit (3h)**; subir el límite no limpia esa marca.
  3. El modelo por defecto estaba amarrado a ese perfil (`anthropic/claude-sonnet-5-5@anthropic:setup-…`).
- En PowerShell, `openclaw` falla por la política de ejecución de scripts (.ps1): usar `openclaw.cmd`. `openclaw restart` no existe: es `openclaw gateway restart`.

## Arreglo (lo hizo el dueño, guiado)
- Clave nueva `openclaw-2` en ASISTENTE DE WHATSAPP (pegada solo en PowerShell, nunca en el chat).
- `openclaw.cmd models auth login --provider anthropic` → perfil nuevo `anthropic:default`.
- `openclaw.cmd gateway restart` (el aviso amarillo «generation changed before readiness was confirmed» es inofensivo; el servicio queda `running`).
- `/new` y «Hola» por WhatsApp → **contestó** (19-oct, ~5:06 p. m. RD).

## Pendiente
- Opcional: `openclaw.cmd models set anthropic/claude-sonnet-5-5` para quitar el amarre al perfil viejo, y después borrar la clave `asistente-whatsapp` en la consola.
- El crédito «API credit (Max 20x)» de US$200 vence el 24-oct-2026.
