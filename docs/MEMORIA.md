# MEMORIA.md — memoria corta de NEXUS PRO para la IA (borrador, 21-oct-2026)

> Parte técnica y detalle: `docs/MEMORIA-TECNICA.md` (leerla cuando el trabajo toque esas piezas).

## 1. Para qué sirve este archivo
- Se vuelve a leer solo después de cada compactación del contexto. Es un resumen; la fuente completa sigue siendo `AGENTS.md`, `CLAUDE.md` y la bitácora.
- Se actualiza en cada entrega. Nunca se borra una regla del dueño sin su OK.

## 2. Dueño y forma de trabajar
- Dueño: Sterling (sterlinr08). No es técnico. Hablarle en español sencillo, de usted, con respuestas cortas: una idea por renglón y tablas cuando haya que decidir.
- Quiere **ver** el resultado: capturas o video a 390–430 px (iPhone) y en PC.
- Escribe en mensajes cortos y con errores de dictado. Interpretar lo más probable y confirmarlo en una línea.
- **Publicar a `main`** solo con «publícalo», «súbelo», «ponlo en vivo» o algo equivalente. Vale **solo para esa entrega**. Sin eso, se trabaja en una rama `claude/*`.
- **Bitácora:** cada cambio, auditoría o publicación deja una entrada nueva `docs/bitacora/AAAA-MM-DD-HHMM-claude.md` (hora de RD). Nunca se edita ni se borra una entrada anterior.
- Las decisiones del dueño se escriben en `CLAUDE.md`, `REGLAMENTOS.md` o la bitácora. Lo que solo se dijo en el chat se pierde.
- **Secretos** (`ZERNIO_API_KEY`, claves, tokens): nunca en el frontend, los logs, el repo, la bitácora ni el chat. El dueño escribe sus claves él mismo en el panel.
- No poner IDs de modelo de IA en commits ni en PR.
- No conectar cuentas, iniciar sesión ni gastar sin su OK.
- WhatsApp: nada a clientes sin su OK. Las pruebas, solo a su número.
- **«Recuerda todo lo que me gusta» (dueño, 25-oct-2026).** Todo diseño nuevo lleva estos gustos sin que él los repita. Vale también para sistemas de clientes como Pizzería Unive 2.
  1. **Nada de barra fija abajo.** Las acciones van dentro de la pantalla o en una píldora arriba.
  2. **Botones encendidos.** El botón principal y la opción elegida llevan luz realista en su propio color (59.57). Los demás botones, no.
  3. **Vidrio.** Paneles translúcidos (capas `#nx*Pane`); la isla de avisos estilo Dynamic Island.
  4. **ⓘ de ayuda** para las notas, en vez de texto suelto.
  5. **Rapidez tipo Raycast:**
     - abrir con lo guardado y refrescar por detrás;
     - línea fina de carga en vez de ruedas;
     - respuesta al tocar.
  6. **Números que ruedan** (beUI) y **gráfica en vivo** (Liveline).
  7. **The Kitchen:** impresora de recibos animada y «mantén presionado para confirmar» en lo destructivo.
  8. **Botones de 44 px como mínimo,** 48 px en campos y 54 px en el principal. Se miden a 390 y 1280 px.
  9. **Ver antes de aprobar:** opciones con maqueta primero, y capturas en iPhone y en PC.
  10. Respetar «reducir movimiento». Sin efectos pesados en pantallas de trabajo.
  - Lista completa de referencias: `docs/REFERENCIAS-DISENO.md`.
- **Skills:** leer `HERRAMIENTAS.md` al empezar cada pedido y usar la skill que corresponda sin esperar a que la nombre. Para diseño, leer primero `DESIGN.md` y `docs/REFERENCIAS-DISENO.md`.
- Una referencia de diseño nueva se agrega en los 3 proyectos (`nexus-pro`, `bayolcell-taller` y `studio-rd`), con su bitácora en cada uno.
- STUDIO no vive aquí (`studio-rd`). Solo se puede portar al POS código genérico, nunca sus datos ni su marca.

## 3. Qué tenemos funcionando (producción = **59.58**, verificado en vivo el 25-oct-2026)
| Módulo | Estado / versión |
|---|---|
| Inicio en vidrio (saludo, «Lo próximo», buscador ⌘K y ficha rápida, anillos del ciclo 20→20) | 59.34–59.36 y 59.40; capa `#nxInicioPane` |
| «Hoy, en vivo» (gráfica de lo cobrado hoy) | 59.21; desde 59.33 lee la RPC `seguros_inicio_cobros` |
| Ventana de cobro «Registrar pago» en vidrio, con textos profesionales | 59.31, 59.37 y 59.38; capa `#nxCobroPane`; las notas van detrás de una ⓘ (59.41) |
| ⓘ de ayuda en todo el sistema | 59.42–59.43; capa `#nxInfoI` |
| Ficha Nuevo/Editar cliente y ficha resumen | 59.44 (`#nxFichaPane`) y 59.46 (`#nxCsPane`) |
| Facturas, Clientes, Cobros e Historial de pagos | 59.45 (`#nxFactPane`), 59.48 (`#nxCliPane`) y 59.49 (`#nxCobPane`) |
| Custodia de fondos y ventana «Cobros del cliente» | 59.50 (`#nxCusPane`); la palabra «custodia» en todo el sistema desde 59.39 |
| Pólizas, Agentes, Empresas y Documentos | 59.51 (`#nxP4Pane`) |
| Configuración/Usuarios, Contabilidad y ventanas | 59.52 (`#nxP5Pane`) |
| CRM, Solicitudes, Pendientes, Avisos y Novedades | 59.53 (`#nxP6Pane`) |
| Reportes (agente con ciclo 20→20, antigüedad, empresa y plan), filtros de Facturas en PC y botón del menú | 59.54 (`#nxP7Pane`) |
| «Registrar pago»: meses por adelantado a la vista (cuotas, cuadrícula de meses, «pagado hasta») | 59.55 (`#nxAdelPane`, apagar `nx_adel_off`) |
| Bauche repetido (foto/número bloquea, compartido, «posible repetido») | 59.56; Edge `comprobante-leer` v6 (clave «NEXUS PRO BAUCHE» activa desde el 25-oct) |
| Cobro rápido con el bauche: la IA lee la foto apenas llega, chip «Bauche RD$… · Cobrar» en el chat y «Registrar pago» se llena solo (monto del bauche + aviso) | 59.58, **publicado** (PR #406, webhook v14); Edge `bauche-auto-leer`; columnas `bauche_ia`; RPC `comprobante_cuenta_sugerida`; apagar con el secreto `BAUCHE_AUTO_LEER=off` |
| Chat de WhatsApp «Parloteo» (degradado continuo, «✓✓ Leído h:mm», reacciones rápidas con chat borroso, enviar/micrófono azul, «escribiendo…» entre agentes) | 59.59, rama `claude/chat-parloteo` **sin publicar**; `style#nxParloteo` + `parches-whatsapp-parloteo.js`; apagar `nx_parloteo_off` |
| Usuarios con acceso real (empleado y clave en un paso, sincronizado con Auth) | 59.30; Edge Function `usuarios-acceso` |
| Transferir dinero arrastrando el billete al agente | 59.32; `parches-transferir-arrastrar.js` |
| Isla de avisos (pagos y WhatsApp) | 59.20; `parches-isla-avisos.js` |
| Temas: oscuro grafito y modo claro gemelo | 59.21 y 59.22; contraste del claro en Préstamos y POS en 59.23 |
| «Detalles pro» (beUI) y rapidez tipo Raycast | 59.24 y 59.26; Cobros en dos líneas 59.27 |
| Solicitudes: una sola cola «PAGOS PENDIENTES POR VALIDAR» | PR #312 |
| WhatsApp: Inbox corporativo, plantillas y automatizaciones | En producción (capas `parches-whatsapp-*`) |

- Cada capa visual se apaga para todos con `NX_<CAPA>=false` o en un equipo con `localStorage.nx_<capa>_off='1'`. Ejemplos: `nx_inicio_pane_off`, `nx_cobro_pane_off`, `nx_info_off` y `nx_p7_pane_off`. El detalle de cada una está en su bitácora.
- **Regla de botones (18-oct-2026):** todo lo que se toca mide ≥44×44 px; los campos 48 px con letra de 16 px; el botón principal 54 px. Se mide con Playwright a 390 y 1280 px y se anota en la bitácora.

- **Botones encendidos (25-oct-2026, 59.57, publicado en PR #405):** el principal de cada pantalla y la opción elegida llevan luz realista en su propio color (`style#nxLuz`, apagar con `nx_luz_off`). El dueño eligió el estilo NEXUS (no la maqueta genérica) y «el acabado realista». Solo dentro de las pantallas; nada de barra fija abajo.

- **Bauches con IA (dueño, 25-oct-2026):** la IA lee las fotos «apenas llegan» y en el cobro «pone el del bauche y avisa». Nunca registra un pago sola: el cobro siempre lo confirma una persona.
- Pendiente visual aparte (ya estaba en 59.57): en el simulador, la cita de un mensaje que responde a una foto muestra «Cliente» en letras verticales. Revisar si pasa en el iPhone real.

- **WhatsApp no avisa cuando el CLIENTE escribe** (Meta no lo manda a ningún sistema). El «escribiendo…» de NEXUS es entre agentes del mismo chat (canal Realtime `nx-wa-escribiendo`, solo hilo + primer nombre).

## 5. Reglas de negocio clave
- **Los agentes no tienen comisión.** Nada de comisión en reportes, acumulados ni plantillas.
- **Ciclo de agentes: del día 20 al día 20.** Un pago nunca cae en dos ciclos.
- El acumulado del agente va por la **fecha real del cobro**, no por el período de la factura.
- **Una transferencia entre agentes no es un cobro:** solo cambia la custodia. Custodia = cobrado + recibido confirmado − enviado confirmado. Lo pendiente no cuenta hasta que el receptor lo acepta.
- Antes de tocar dinero, cobros o cierres: auditar la fuente de verdad, no crear contabilidad paralela y evitar la doble contabilización. No tocar datos históricos sin autorización.
- **Seguros (REGLAMENTOS §9):**
  - `deuda_total` = suma de las primas facturadas.
  - `deuda_anterior` es una bolsa aparte.
  - El estado de la factura es una caché: hay que resincronizar todas las del cliente.
  - Se cobra con agente, referencia y banco.
  - El NCF es atómico y sin guion.
- La cajera cobra **a nombre de quien recibió el depósito del cliente** (caso LORIBEL, 15-oct).

## 7. Pendientes y esperas
- **PIZZERÍA Y CAFETERÍA UNIVE 2** (cliente nuevo, 25-oct-2026, rama `claude/pizzeria-unive2`). **No es solo pizzería: también es cafetería dominicana** (desayunos, sándwiches, chimis, frituras, jugos, café…). Fondo elegido: **D «Mantel con caja»**.
  - Base Supabase propia **`gzdkzcspmvyxgfcytpgy`**, VACÍA. Datos: us-east-1, Micro, la paga el dueño. Seguridad: Data API ✅, auto-expose ⬜, auto-RLS ✅.
  - **Sin RNC**: la caja arranca sin NCF ni e-CF.
  - La entrevista la responde la dueña en el formulario https://claude.ai/artifact/N4ZXnNso4FPEF5EuBZ8pkL. Subdominio: `unive2.nexusprord.com`.
  - El plano va **antes** de aplicar el esquema POS (`supabase/studio/`).
- **Supabase (25-oct):**
  - una sola organización `sterlinr08` (Pro) para todos los clientes;
  - Geriatra borrada (su respaldo se le dio al dueño);
  - **«sterlinr08-dte's Project» = DELUXE HAIR CENTER, en uso: NO tocar**;
  - el exceso de cuota fue de llamadas a Edge Functions en septiembre; el ciclo actual va al 8 %.
- **Caché en Cloudflare** (rama `claude/nexus-cache`, sin publicar, 24-oct-2026): `_headers` + Worker solo en `/` y `/boleto.html`; `/` con Last-Modified = fecha de la publicación (Cloudflare borra el ETag del HTML). 2ª visita 461→77 KB. Bitácoras `2026-10-24-2148` y `2200`.
- **Clave IA de NEXUS inválida:** el dueño pone `ANTHROPIC_API_KEY`; luego leer los 138 viejos (modo `lote`, bitácora 22-oct 10:30).
- **Iniciativa de acumulados y transferencias por ciclo:** empieza por la Fase 0 de auditoría (ver `CLAUDE.md`). Ya existen la custodia, las transferencias y el reporte del ciclo 20→20. Falta completar cierre, consolidado y notificaciones según la auditoría.
- **Encargo visual móvil del Inbox de WhatsApp** (`CLAUDE.md`): compactar sin tocar la lógica. Antes, auditar la cascada `parches-whatsapp-*`.
- Meta del anillo «Cobrado»: la decide el dueño (Configuración → Metas mensuales → «Meta cobros»).
- **Supabase avisó** que la organización superó su cuota y que los proyectos quedan restringidos desde el 27-oct-2026. Falta revisar el uso con el dueño.
- La contabilidad debería pedir `asientos` por partes, para no depender del tope de filas.
- **Pendiente del dueño:**
  - rotar la Global API Key de Cloudflare y actualizar el Vault (`cloudflare_api_token`);
  - borrar las Edge Functions de diagnóstico `nx-cf-dominio` y `nx-env-nombres`.
- **En pausa o en estudio:** app nativa de iPhone con xtool (solo estudio) y app de servicios técnicos.
- **OpenClaw:** es el agente del dueño en WhatsApp, en su PC, para Bayol. Se reactivó el 19-oct.

## 8. Errores que no se deben repetir
- **Caché de JS/CSS por 1 año (paso 2, rama `claude/version-auto`):** todo `.js`/`.css` propio debe cargarse con el número de publicación (`qv()` en parches-seguros.js, el cargador final de index.html o `window.NX_DEPLOY`). Un cargador nuevo sin él dejaría ese archivo viejo en los teléfonos hasta un año.
- **FOUC en iPhone:** el rediseño masivo de las fases 1–4 se revirtió (PR #311). Por eso:
  - nada de capas tardías ni rediseños masivos;
  - los cambios visuales van aislados por módulo, son reversibles, se cargan desde el primer pintado y se prueban a 390 px.
- **La herramienta MCP de Supabase retiene las sentencias «destructivas»** (`drop policy`, `revoke`, `drop trigger`, incluso dentro de `execute`). Espera una confirmación que no llega y la llamada muere o vuelve «cancelled» sin ejecutar nada.
  - No intentar burlar ese control.
  - Partir el trabajo en bloques sin esas sentencias, o dejar que el dueño lo pegue en el SQL Editor.
  - Después, verificar en el catálogo que no quedó nada a medias.
- En pruebas de concurrencia con `execute_sql`, un `DO` con candados dejó sesiones colgadas (hubo que usar `pg_terminate_backend`). Cada paso que deba quedar confirmado va en su propia llamada.
- **No citar identificadores con acentos graves (backticks) dentro de plantillas CSS en JS**, porque rompen la plantilla. Antes de publicar una capa hay que **ejecutarla**, no solo parsearla.
- **Diagnosticar desde el marcado que arma el elemento**, no por correlaciones vistas en el CSS o en la captura.
- **Pruebas `qa-*` en paralelo:** mezclan las preferencias del simulador y dan falsos fallos.
- No mezclar `claude/review-claude-md-jpzk7k` con `main` ni sacar ramas nuevas de ella: hay que sacarlas de `main`.
- **Zernio:** `POST /v1/webhooks/settings` **crea** una suscripción nueva en cada llamada (el CRM del taller llegó a 25 copias). Nunca llamarlo en cada apertura.
- En las vistas, el corte 20→20 manda: antes del día 20, el mes vigente es el anterior.

- Conector de Supabase (comprobado en Bayol, 21-oct-2026): `apply_migration` y los SQL largos pueden colgarse 60 s → aplicar en sentencias pequeñas con `execute_sql`; un `UPDATE` sin `WHERE` se queda esperando confirmación.
- Al compactar se pierden detalles: esta MEMORIA se recarga sola. Lo importante que solo quedó en el chat, anotarlo aquí.

- **Candado de secretos** (hook `secretos.sh`) y skill `redaccion-clara` instalados el 23-oct (HERRAMIENTAS.md).

## 9. Dónde buscar más
- `AGENTS.md` (estado vivo, en `origin/main`), `CLAUDE.md`, `REGLAMENTOS.md`, `HERRAMIENTAS.md`, `docs/TRASPASO-CLAUDE.md`, `docs/bitacora/` y `docs/MEMORIA-TECNICA.md`.

- **Puntos de control (dueño, 23-oct-2026, reel de VibeWise):** antes de código no trivial, 2–3 opciones con ventajas y desventajas (maqueta si se puede), él decide; después informe de qué cambió y qué pruebas pasaron. Skill `puntos-de-control` en los 3 proyectos.
