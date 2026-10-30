# 2026-10-30 08:54 (RD) · Claude · Ficha del cliente: WhatsApp y teléfonos de otro país (59.75, rama `claude/whatsapp-internacional`, SIN publicar)

## Pedido del dueño
- El dueño dijo «sí»: necesita crear clientes con WhatsApp de otro país.
- La 59.73 (ya en `main`) exigía 10 dígitos 809/829/849 en **WhatsApp**, **Teléfono** y **WhatsApp de la referencia** de la ficha «Nuevo / Editar cliente» (`#mCli`), y eso impedía crearlos (pendiente anotado en la bitácora `2026-10-30-0028`).
- Objetivo: devolver esa capacidad **sin perder la validación dominicana**, y hacerlo «smart» (regla del dueño, `DESIGN.md`).

## Fuente de verdad revisada
- `index.html`: `nxTelRD`, `nxTelFmt`, `nxWa`, `guardarCli()` (validaciones, aviso de WhatsApp repetido, datos que se guardan), bloque `script#nxCliFichaJs` (formato al abrir y al salir del campo).
- **Hallazgo nuevo:** `parches-rapidez.js` (bloque 4, «campos que se forman solos») aplica una **máscara al escribir** en `cWA` y `cTel`: quita todo lo que no es dígito, corta a 10 dígitos y pone `809-555-1234`. Aunque `guardarCli` aceptara el «+», el usuario **no podía ni escribirlo**. Había que tocarla también.
- Cómo arman el número los envíos de WhatsApp (ver sección aparte): `parches-seguros-base.js` (`waNumero`, `waNum`), `parches-pos.js`, `parches-financiamiento.js`, `parches-pos-fidelidad.js`, `parches-whatsapp-inbox.js` (`soloDigitos`, `formatearTelefono`, `coincide`), y las Edge Functions `whatsapp-notificar`, `whatsapp-envio-masivo`, `whatsapp-automatizaciones-run`, `whatsapp-notificar-atraso-v2`, `whatsapp-recordatorio-pendiente-manual`, `whatsapp-pagos-agente-notificar`, `whatsapp-reporte-diario-agentes`, `whatsapp-resumen-ciclo-agentes`, `whatsapp-plantillas-gestionar`.

## Regla implementada (un solo lugar decide: `nxTelNorm`)
| Lo que se escribe | Tipo | Qué pasa |
|---|---|---|
| 10 dígitos 809/829/849 (acepta `+1` o `1` delante) | `rd` | Igual que hoy: WhatsApp se guarda `1`+10 dígitos; Teléfono `809-555-1234`; se ve `809-555-1234`. |
| Empieza por `+` o por `00`, o tiene más de 10 dígitos sin ser de RD | `intl` | De 8 a 15 dígitos en total (E.164). Se guarda `+<código><número>` (solo dígitos tras el `+`). Se ve con un espacio tras el código de país: `+34 612345678`, `+1 3055551234`, `+507 61234567`. |
| 10 dígitos con otro prefijo y sin `+` | `fueraRD` | **No se bloquea a ciegas:** aviso suave «Número fuera de RD · En RD empieza por 809, 829 u 849. Si es de otro país, escríbalo con +código (ej. +1 305…)». Se guarda solo si lo escribe con `+`. El aviso sale **al salir del campo** (una vez por número) y otra vez al tocar Guardar si no lo corrigió. |
| Lo demás (muy corto, más de 15, o un 809/829/849 con dígitos de más o de menos) | `mal` | «WhatsApp / Teléfono / WhatsApp de la referencia no válido: Escriba 10 dígitos de RD (809, 829 u 849) o, si es de otro país, el número con +código». |

- **Al editar**, un número viejo que no se cambió (RD o no) se respeta **tal cual**: no bloquea y no se reescribe (antes el WhatsApp sin cambio pasaba por `nxWa`, que le habría quitado el `+`).
- **WhatsApp repetido** sigue avisando (no bloquea) con ambos formatos: se compara por dígitos (`18095551234`, `8095551234` y `+34612345678` se entienden) y la consulta de solo lectura a `clientes` lleva el `+` codificado (`wa.eq.%2B34612345678`) más las variantes con y sin `+` y sin el `1`.
- `nxWa` (index.html): si el número viene con `+`, ya trae su código de país: **no se le antepone el `1` de RD** y se acepta desde 8 dígitos. Sin `+` se comporta exactamente igual que antes.
- Código de país para el espacio (`nxTelCC`): `1` y `7` son de un dígito; `20, 27, 30–34, 36, 39, 40, 41, 43–49, 51–58, 60–66, 81, 82, 84, 86, 90–95, 98` de dos; el resto de tres (regla E.164).
- Máscara al escribir (`parches-rapidez.js`): si el campo empieza por `+` o `00`, ya no se corta a 10 dígitos ni se le quita el `+`; se forma `+44 7911123456` mientras se escribe (tope 15 dígitos) y el `00` se convierte en `+`. Para RD sigue formando `809-555-1234`. Aplica también a los teléfonos de Préstamos (`prTel`, `prcTel`…): solo cambia cuando el usuario escribe `+` o `00`.
- `maxlength` de los 3 campos: 16 → 20 (un `+`, 15 dígitos y espacios). `inputmode="tel"` se mantiene (el teclado tiene el `+`).
- `APP_VERSION` → **59.75** (todos los `.js` propios se recargan con el número de publicación).

## Archivos modificados
- `index.html`: `nxWa`, nuevas `nxTelNorm`, `nxTelCC`, `NX_TEL_MSG`, `NX_TEL_FUERA`; `nxTelFmt` (RD y otro país); `guardarCli` (WhatsApp, Teléfono y WhatsApp de la referencia con `telOpc`, `err` sin toast vacío, aviso de repetido por dígitos y consulta codificada, `tel`/`referencia_wa` desde lo normalizado); `script#nxCliFichaJs` (formato al abrir y al salir, aviso «fuera de RD» al salir); `maxlength="20"`; `APP_VERSION='59.75'`.
- `parches-rapidez.js`: `fmtTel` respeta `+`/`00`.
- Nuevo: `docs/bitacora/img/2026-10-30-whatsapp-internacional/` (pruebas ampliadas, resultados JSON y capturas a 390).
- `docs/MEMORIA.md`: línea de la 59.75.

## Migraciones, RPC, triggers, Edge Functions
**Ninguna.** No se tocó Supabase ni ninguna Edge Function. La columna `clientes.wa` es texto; `+34612345678` cabe sin cambios.

## Qué pasa con el envío por WhatsApp a un número internacional
Todo el sistema (frontend y Edge Functions) arma el destinatario igual: **quita lo que no es dígito, si quedan exactamente 10 le antepone `1`, y exige al menos 11**. Meta Cloud API recibe los dígitos sin `+`. Con el nuevo formato guardado `+<código><número>`:
- **Funciona sin tocar nada** para cualquier país cuyo número completo tenga **11 a 15 dígitos** (EE. UU./PR `+1…`, España `+34` + 9, Venezuela `+58` + 10, Colombia `+57` + 10, Haití `+509` + 8, Panamá `+507` + 8, México `+52` + 10, Chile `+56` + 9, Argentina `+54`…): plantillas (`whatsapp-notificar`, `whatsapp-envio-masivo`, automatizaciones, atraso, recordatorio manual), `wa.me/<dígitos>` en Inbox, POS, financiamiento y panel del dueño, y el enlace hilo ↔ cliente del Inbox (`coincide` compara por dígitos y por terminación ≥ 10). `formatearTelefono` del Inbox ya muestra `+<dígitos>` para lo que no es RD.
- **Caso límite (no resuelto a propósito):** países cuyo número completo tiene **exactamente 10 dígitos** (Cuba `+53` + 8, Guatemala/El Salvador/Honduras/Nicaragua/Costa Rica `+50x` + 8 = 11 ✓ no aplica; sí aplica Cuba y algunos de 2 dígitos de código + 8) recibirían un `1` delante en las copias de `waNum/waNumero` de `parches-seguros-base.js`, `parches-pos.js`, `parches-financiamiento.js`, `parches-pos-fidelidad.js` y en `telefono()/formatearTelefono()` de las Edge Functions. Y los de **8–10 dígitos en total** sin llegar a 11 saldrían como «sin WhatsApp». `nxWa` de `index.html` ya los trata bien. **Si el dueño tiene clientes en esos países, el siguiente paso es llevar la misma regla del `+` a esas copias y a las Edge Functions (cambio pequeño y mecánico, con su auditoría).**
- El webhook de Meta trae `telefono_e164` como dígitos sin `+`; el Inbox lo enlaza con el cliente por dígitos, así que un hilo de `+34612345678` encuentra al cliente guardado con `+`.

## Pruebas (Playwright, API simulada, red a Supabase bloqueada)
`docs/bitacora/img/2026-10-30-whatsapp-internacional/pruebas.js` = las 93 de la 59.74 + 28 nuevas. Se ajustó una expectativa de la 59.73: «WhatsApp 1234567890» (10 dígitos no RD, sin `+`) ya no da «WhatsApp no válido» sino el aviso «fuera de RD» (sigue sin guardar).
- **390 px: 121/121 OK · 1280 px: 121/121 OK · capa de secciones apagada: 92/92 OK a 390 y 1280.**
- Nuevas: RD válido sigue igual (`18095551112`, `829-555-0002`, `18495550003`); RD mal (`80955512345`, `809555123412345`) bloquea; `+34 612 345 670` → `+34612345670`; `0034 612 345 671` → `+34612345671`; `3055551234` sin `+` → aviso «fuera de RD», no guarda, ventana abierta; `+1 305 555 9876` → `+13055559876`; `13055559876` (11 con 1 delante, no RD) → `+13055559876`; `+34 12345` (7 dígitos) y 16 dígitos bloquean; teléfono y referencia de otro país → `+584121234567` y `+17875551234`; teléfono / referencia de 10 dígitos no RD sin `+` → aviso; repetido internacional en memoria (`+1 305…` vs viejo `13055551234`; `0034…` vs `+34612345678`) pregunta; repetido en la base: la consulta lleva `%2B` y los dígitos; editar viejo `13055551234` sin cambiar → guarda tal cual; editar `+34612345678` sin cambiar → se ve `+34 612345678` / `+58 4121234567` y guarda sin cambiar; editar y cambiar → guarda el nuevo; al salir del campo: `+1 305 555 1234` → `+1 3055551234`, `00 44…` → `+44 7911123456`, RD → `829-555-1234`, 10 dígitos no RD → aviso una sola vez y campo marcado; al escribir (máscara): `+44…` y `0034…` no se cortan, RD se forma, tope 15; `nxWa('+5351234567')` = `5351234567` (no antepone 1); formato con código de 2 y 3 dígitos y `+1 809…` vuelve a RD; campos de 48 px, letra 16 px, `inputmode=tel`, `maxlength` 20 y dentro de la ventana a 390 y 1280; sin errores de JavaScript.
- Capturas a 390: `aviso-fuera-rd-390.png` (aviso al tocar Guardar), `aviso-al-salir-390.png` (aviso al salir del campo), `internacional-formato-390.png` (`+34 612345678` y `+58 4121234567`).

## Smart (regla del dueño, 30-oct)
1. **Piensa por el usuario:** el `00` se vuelve `+` solo; el formato se arma al escribir y al salir; avisa antes de Guardar; no adivina el país (pide el `+código`) para no mandar WhatsApp a un número equivocado.
2. **Elegante:** mismos campos, mismo estilo; solo cambian los textos de aviso.
3. **iPhone y PC:** medido a 390 y 1280; teclado `tel` con `+`.

## Riesgos y pendientes
- Copias de `waNum/waNumero` en `parches-*.js` y `telefono()` en las Edge Functions: ver el caso límite de 10 dígitos en total. No se tocaron por la regla de no tocar Supabase en este encargo.
- Un cliente de otro país escrito **sin** `+` y con más de 10 dígitos en el teclado real queda cortado a 10 por la máscara (y entonces sale el aviso «fuera de RD»): es el comportamiento buscado, el `+` es la señal.
- Pendiente del dueño: probar en su iPhone escribir `+34…` y `00 34…` en WhatsApp de la ficha.

## Rama, commit, publicación
- Rama `claude/whatsapp-internacional` desde `origin/main` (`5946640`). **Sin PR y sin publicar**; `main` no se tocó.

## Siguiente paso
1. Que el dueño lo vea en el iPhone y decida publicar (PR a `main`).
2. Si tiene clientes de países con 10 dígitos en total (Cuba), llevar la regla del `+` a las copias de `parches-*.js` y a las Edge Functions.
