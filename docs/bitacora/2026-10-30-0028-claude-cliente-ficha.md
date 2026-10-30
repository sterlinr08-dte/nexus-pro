# 2026-10-30 00:28 (RD) · Claude · Ficha «Nuevo / Editar cliente»: paquete B de la auditoría (59.73, SIN publicar)

## Pedido del dueño
- Se auditó la ventana `#mCli` y salieron 35 hallazgos: 4 graves, 16 importantes y 15 menores.
- El dueño eligió el **paquete C** (B más reordenar en secciones).
- Por la regla de puntos de control se hace en dos partes:
  1. Esta entrega: paquete B completo. Incluye los arreglos de A (vista y textos).
  2. Siguiente: una maqueta de la reorganización C para que el dueño decida. Todavía no hay código de C.

## Fuente de verdad revisada
- `guardarCli()`, `abrirNuevoCli()`, `editarCli()`, `actualizarProgreso()` y `nxDeudaUnlock()` en `index.html`.
- Las capas `#nxFichaPane`, `#nxFormEspaciado` y `#nxInfoI`.
- `parches-cumpleanos-clientes.js` (envuelve `guardarCli`), `parches-crm.js` (crea un cliente desde un prospecto) y `parches-nav-botones.js` (Esc y deslizar tocan la ✕).
- `parches-seguros-base.js:7880`: tocar fuera de la ventana la cierra.
- REGLAMENTOS §7.2 (duplicados) y §9 (seguros).

## Qué cambió

### Lógica de datos (`guardarCli`, con cuidado máximo)
- **G1 · Sin reintentos silenciosos.** Antes, cualquier error repetía el guardado sin estado, facturación, VIP ni pendientes.
  - Ahora `nxCliEnviar()` reintenta **solo** si la base dice que falta una columna (PGRST204 o 42703).
  - Quita **esa** columna nada más y avisa: «La base aún no tiene: …».
  - Cualquier otro error se muestra («Sin conexión…» o el mensaje del servidor). La ventana queda abierta y el usuario vuelve a tocar Guardar.
- **G2 · Un solo guardado a la vez.** La bandera `_nxCliGuardando` evita guardados dobles.
  - A los 12 s solo se avisa «Sigue guardando…». El botón **ya no se reactiva** mientras haya un envío en curso.
  - El número de póliza se aparta **una vez por alta** (`_nxCliNumPol`) y se reusa si hay que reintentar. Se vuelve a pedir al abrir otra ficha nueva.
- **G3 · Estado al crear.** Un cliente creado como Cancelado o Suspendido queda con `activo=false`. Antes `activo:true` pisaba ese valor y el cliente entraba en la facturación automática.
- **G4 · Estado que se ve.** Al marcar un pendiente, el estado pasa a «En proceso» y **la ficha encendida también**: se llama a `nxChipsSync` y sale el aviso «Estado: En proceso».
- **Validaciones:**
  - **Cédula:** 11 dígitos con dígito verificador (módulo 10 de la JCE), o un RNC de 9 dígitos. Se guarda como `000-0000000-0`. Sigue permitida la ficha sin cédula.
  - **Cédula vieja:** al EDITAR, si la cédula guardada no se cambió, no se bloquea; solo se avisa «Revise la cédula».
  - **Cédula duplicada:** se sigue bloqueando, como antes.
  - **WhatsApp:** 10 dígitos que empiezan por 809, 829 u 849. Acepta «+1» y se guarda como antes (`1` + 10 dígitos). Un número viejo no dominicano que no se cambió se respeta al editar.
  - **WhatsApp repetido:** **se avisa, no se bloquea.** Primero se busca en memoria y después con un `GET clientes?select=id,nom,activo&or=(wa.eq…)&limit=1` de **solo lectura**. El diálogo propio pregunta «¿Desea guardar de todos modos?».
  - **Teléfono y WhatsApp de la referencia:** si se escriben, deben ser números de RD. El teléfono se guarda como `809-555-1234`.
  - **Correo:** si se escribe, debe ser válido.
  - **Día de facturación:** solo del 1 al 28.
  - **B01 (crédito fiscal):** exige un RNC o una cédula válidos.
  - **Nacimiento:** no antes de 1900 ni en el futuro.
- **`fecha_nacimiento`** se envía dentro del mismo INSERT/PATCH: `guardarCli` lee `#cFecNac`.
  - `parches-cumpleanos-clientes.js` **ya no reemplaza `API.post` ni `API.patch` de todo el sistema**. Solo valida la fecha y llama a `guardarCli`.
- **`parches-crm.js`:** el agente del prospecto se precarga en `#cAgt` y luego se llama a `nxChipsSync`. Antes buscaba `#cAgente`, que no existe.
- **Diálogos:** «Ajustar deuda» y «¿Pasar a Activo?» usan el diálogo propio `swalConfirm` en lugar de `confirm()`.
  - «¿Pasar a Activo?» ahora usa el id real del cliente nuevo. Antes tomaba el último de la lista.

### Uso, accesibilidad y teclado
Todo esto está en el `script#nxCliFichaJs` nuevo, después de `#nxFichaPaneJs`, y en el HTML de `#mCli`.
- **Antes de descartar se pregunta.** Si hay cambios sin guardar, la ✕, «Cancelar», Esc, deslizar hacia abajo y tocar fuera preguntan «¿Descartar los cambios?». Sin cambios, la ventana cierra directo.
  - Tocar fuera se intercepta con un `click` en captura, antes del cierre de `parches-seguros-base`.
- **Foco:**
  - al abrir entra a la ventana (en PC al Nombre; en el celular a la ventana, para no abrir el teclado);
  - Tab no se sale de la ventana;
  - al cerrar vuelve a donde estaba.
- **Lector de pantalla:**
  - `role=dialog`, `aria-modal` y `aria-labelledby=mCliT`;
  - cada `<label>` con su `for`;
  - los grupos de fichas con `role=group` y su rótulo;
  - el campo con error queda en rojo (`aria-invalid`) y recibe el foco.
- **Teclado del celular:**
  - WhatsApp, Teléfono y el WhatsApp de la referencia son `type=tel` con `inputmode=tel`;
  - la cédula y el día usan `inputmode=numeric`;
  - el correo lleva `autocomplete=email`, `autocapitalize=off` y `spellcheck=false`;
  - el nombre lleva `autocomplete=name` y la dirección `street-address`;
  - todos tienen `enterkeyhint`, y **Enter pasa al siguiente campo**.
- **Formato a la vista:** al abrir y al salir del campo, los teléfonos se ven como `809-555-1234` y la cédula como `000-0000000-0`. El dato no cambia hasta que se guarda.

### Vista y textos
Va en el `style#nxCliFicha` nuevo, con la misma llave `nx-fcli` que la ficha en vidrio.
- **Título:** queda alineado con los campos (x 16/40, antes 71/87). Se quitó el espaciador de 44 px de `parches-nav-botones`.
- **Huecos:** de «Fecha de seguimiento» a «Agente responsable» hay 20 px (antes 40).
- **Letra:** «Pendientes del cliente», «Avance del trámite», el porcentaje y «Precio personalizado» van a 13 px (antes 11).
- **Empresa cotizante:**
  - va sin la caja de 80 px con su propio desplazamiento, así que se ven todas las empresas;
  - las fichas miden 44 px en claro y en oscuro, sin la escala de «presionado» ni el borde extra;
  - claro y oscuro miden ahora lo mismo; antes, en claro y a 1280, la tercera empresa saltaba de fila.
- **Casillas de pendientes:** 8 px entre filas.
- **Ejemplos:** sin MAYÚSCULAS y más cortos («Nombres y apellidos», «Ej.: Doña Ana», «809-555-1234»).
- **Rótulos:** «Correo», «Cédula o RNC», «Referencia o apodo» (sin «(opcional)», que partía la etiqueta en dos líneas), «Inicio/Fin de la póliza», «Tipo de comprobante (NCF)», «Deuda antes del sistema (RD$)» y «Avance del trámite».
- **Trato de usted:** «Toque Ajustar», «Si la apaga…», «Marque los que faltan», «Déjelo en blanco…», «vaya a Facturas y use…» y «Revise su internet».
- **ⓘ:** las reglas de `#nxInfoI` reconocen los textos nuevos.
- **Versión:** `APP_VERSION` pasa a **59.73**.

## Migraciones, RPC, triggers y Edge Functions
**Ninguna.** No se escribió en la base. La única consulta nueva es el `GET` de solo lectura que busca el WhatsApp repetido.

## Pruebas
- **Pruebas funcionales:** Playwright con administrador falso, red a Supabase bloqueada y API simulada en memoria. **52/52 a 390 px y 52/52 a 1280 px.** Script en `docs/bitacora/img/2026-10-30-cliente-ficha/pruebas.js`.
  - **Altas:**
    - alta normal (cédula `001-1882756-7`, WhatsApp `18095551234`, teléfono `829-555-0001` y nacimiento en el mismo INSERT);
    - cortesía (`permitir_facturacion=false`);
    - crear Cancelado y Suspendido (`activo=false`).
  - **15 validaciones que deben bloquear:** sin nombre, WhatsApp 1234567890 y de 15 dígitos, cédula «12», dígito verificador malo, cédula duplicada, día 31 y −5, correo «maria@», teléfono «abc», WhatsApp de la referencia malo, B01 sin RNC, nacimiento 1850 y futuro, y fechas invertidas.
  - **Lo que debe pasar:** B01 con RNC, `+1 849…` y el día 28.
  - **Edición:**
    - un cliente viejo con cédula mala y WhatsApp de EE. UU. sin cambiar guarda y avisa;
    - cambiarlo a una cédula mala bloquea.
  - **WhatsApp repetido (memoria y base):** pregunta; «Cancelar» no guarda y deja el botón libre; «Guardar igual» guarda.
  - **Red caída:** 1 solo POST y el aviso «Sin conexión». Al reintentar se usa el **mismo número de póliza** (una sola reserva) y se conserva la cortesía.
  - **Columna faltante (`vip`):** se reintenta quitando solo `vip` y se avisa.
  - **Servidor lento (14 s) con 3 clics:** 1 solo POST y el botón sigue bloqueado a los 12 s.
  - **Otras:** G4 (estado y ficha coinciden), el CRM precarga el agente, y Esc, ✕ y tocar fuera con y sin cambios (pregunta, «Cancelar» conserva lo escrito y «Descartar» cierra).
  - **Teclado y accesibilidad:** `inputmode`/`autocomplete`, `role=dialog`, 0 campos sin etiqueta, Enter de Nombre a Cédula, 90 pulsaciones de Tab sin salir de la ventana, formato al salir del campo y «Ajustar deuda» con el diálogo propio.
  - 0 errores de JavaScript en la página.
- **Regla de formularios** (herramienta `m5.js` de 59.72) en Registrar pago, Nuevo cliente, Usuario, Agente y Empresa, a 390 y a 1280: **0 fallas en las 5**.
- **Plano de medidas a 390 y 1280, en claro y oscuro:**
  - campos de 48 px con letra de 16 px y botón de 54 px;
  - toques de 44 px o más;
  - sin desbordes horizontales;
  - el título alineado.
- **Capturas** antes y después en `docs/bitacora/img/2026-10-30-cliente-ficha/`.
- Limitación del simulador: no carga la fuente de iconos, así que la ✕ y el ✓ se ven vacíos en las capturas.

## Riesgos y pendientes
- **Cédulas sin el formato correcto en la base.** Al editar no bloquean si no se cambian. Si se cambian, deben ser válidas. Las cédulas válidas nuevas se guardan con guiones, y la búsqueda por texto sigue igual.
- **WhatsApp no dominicano.** Los clientes con WhatsApp de otro país no se pueden **crear** desde esta ficha. Al editarlos, si el número no se cambia, se respeta. Si el dueño necesita clientes del extranjero, hay que abrir una excepción.
- **Petición colgada.** Si la red se queda colgada sin responder, el botón sigue bloqueado hasta que llegue la respuesta o hasta recargar la página. Así se evita el cliente repetido.
- **Caché del parche de cumpleaños.** Si un teléfono conserva el `parches-cumpleanos-clientes.js` viejo, ese parche vuelve a poner `fecha_nacimiento`. No daña nada, porque la columna existe.
- **Paquete C pendiente.** La maqueta está en el scratchpad (`maqueta-c.html`). El dueño decide antes de escribir código.

## Rama y estado
- Rama `claude/cliente-ficha`, sacada de `origin/main` 89f609d.
- **Sin PR y sin publicar.**
- Siguiente paso: que el dueño vea la versión 59.73 y la maqueta de C, y diga «publícalo» o pida cambios.
