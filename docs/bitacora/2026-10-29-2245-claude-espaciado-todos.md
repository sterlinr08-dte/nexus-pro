# 2026-10-29 22:45 (RD) · Claude · Espaciado de formularios 59.72: «Recibido por» y el resto de NEXUS (SIN publicar)

Sigue a `2026-10-29-2120-claude-espaciado-piloto.md`, que no se edita.

## Pedido del dueño
El dueño aprobó el piloto 59.71 con este mensaje: «Me gusta así, corrige lo de recibido por».
Se pidió lo siguiente, en la misma rama `claude/espaciado-piloto`, sin PR y sin publicar:
1. Que en Registrar pago el pie fijo no tape «Recibido por» y que un campo con foco quede visible sobre el pie.
2. Llevar la regla al resto de formularios de la auditoría (`nexus.json`) con el mismo cuidado: solo espacios, altos y letras de la regla, reglas acotadas por id y sin rediseñar. Quedan fuera «Cobrar venta» del POS y el chat/inbox de WhatsApp.
3. Versión 59.72, bitácora nueva y MEMORIA al día.

## 1) Registrar pago: «Recibido por»
**Diagnóstico.** El pie es fijo (`position:sticky`) y lleva el resumen y el botón, con 175 px en celular y 199 px en PC.
- Al bajar hasta el final, el contenido ya terminaba antes del pie.
- Al poner el foco en un campo (Referencia, por ejemplo), el navegador no tenía en cuenta el pie, y el campo quedaba debajo de él. Pasa igual en `main`.

**Arreglo.** Va dentro de `style#nxFormEspaciado` y no toca JS:
- en PC: `#mAbono .modal{scroll-padding:124px 0 240px}`;
- en celular: `scroll-padding:100px 0 224px`.

Es el alto del pie más unos 24 px abajo y el de la cabecera más 16 px arriba.

**Medido a 390 y 1280.**
| Prueba | `main` | 59.72 |
|---|---|---|
| Al bajar hasta el final, ¿algún control queda tapado por el pie? | ninguno | ninguno |
| Foco programático en Referencia (con «Transferencia»), empezando desde arriba | tapado | **visible** |
| Foco programático en Referencia, empezando desde abajo | visible | visible |
| `scrollIntoView({block:'nearest'})` en Referencia | tapado | **visible** |
| Al abrir, con la ventana sin desplazar | «Sin asignar / Agente» quedan bajo el pie (390) | igual: hay que bajar un poco (el pie fijo es así) |

Capturas en `docs/bitacora/img/2026-10-29-espaciado-todos/registrar-pago-recibido-{390,1280}.jpg` (antes y después lado a lado, al final del desplazamiento).

**Opción para el dueño (no aplicada):** dejar fijo solo el botón y que el resumen se desplace con el contenido. Así «Recibido por» se vería entero al abrir en el celular.

## 2) El resto de formularios
Todo va en la misma capa `style#nxFormEspaciado`, entre `/* ⟦59.72⟧ */` y `/* ⟦/59.72⟧ */`, y se organiza según la pieza base que comparten.

Cada grupo usa un solo `:is(#id1,#id2,…,#_fe#_fe#_fe#_fe#_fe#_fe)`. El argumento `#_fe×6` no existe en la página: solo sube la prioridad a 6 ids, para ganar a las capas propias sin repetir cada id. Todo va bajo `html:not(.nx-fesp-off)`, y el celular se define con `@media (max-width:600px)`.

| Grupo | Ventanas | Qué cambia |
|---|---|---|
| 4) `.overlay > .modal` (`.mt` · `.fr` · `.fe`) | Asiento, Inhabilitar, Documentos, Respaldo, Cambiar contraseña, Recibir entrega, Rechazar transferencia, Cobertura, Notificaciones, Cuenta bancaria, Destinatario, Egreso, Préstamos (cliente, préstamo, configuración), Vehículos (vehículo, configuración), POS (cuenta contable, asiento, almacén, empleado, staff, secuencia NCF, rol, vendedor, NCF, categorías, ajuste de inventario), Rifas (rifa, cuenta, combo, vendedor) | relleno 48/40 en PC y 24/16 en celular; cabecera de 44 px y 24 hasta el primer campo (8 si debajo va una ayuda); etiqueta → cajita 8 (13 px, tipo oración); campo → campo 20; campos de 48 px con letra 16; pie a 24 con botones a 8; tocables ≥ 44; botón principal 54; casillas con fila de 44; líneas del asiento POS a 8 (lista) con columna de 44 para la × |
| 5) POS `.modal.nxPf` | Producto, cliente/proveedor/entidad, cotización, oportunidad CRM, reparación, apartado, nivel de precio | cabecera 48/40 (12 + línea + 11 hasta el contenido = 24); tarjetas a 24; `.fld` con etiqueta → cajita 8 y campo → campo 20; cajitas 48/16; pie `.actions`/`.docAcc` con 48 abajo; botón principal 54 |
| 6) `.nxMdModal` | Consultorio (cita, paciente, consulta), Panel del dueño (empresa SaaS) | relleno 48/40 · 24/16; título → campos 24; `.nxMdFr` a 20; etiquetas 8/13; cajitas 48/16; botones 44/54 a 8 |
| 7) CRM `#nxOpsModal .nxCrmDialog` | Nueva tarea, registrar actividad | relleno; título → ayuda 8 → campos 24; rejilla 20; etiquetas 8/13; cajitas 48/16; pie 12 + 12 |
| 8) `#nxNovOverlay .nxnov-sheet` | Nueva novedad | relleno (contando la manija); campos 20; etiquetas 8/13; cajitas 48/16; Guardar 54 |
| 9) `.nxTA2-*` | Transferir a otro agente | solo espacios y altos (cabecera, cuerpo a 20, selects y campos de 48, pie y botones 44/54); el monto y la lógica no cambian |
| 10) `#loginScreen .lbox` | Inicio de sesión | relleno 48/40 · 24/16; título → subtítulo 8 → campos 24; campos 48 (antes 56); etiquetas 13 tipo oración; ojo y enlaces de 44; botón 54 (antes 58) |
| 11) `#v-config .cfg-panel .nc` | Configuración | tarjetas 48/40 · 24/16; campos 20; etiquetas 8/13; subtítulos 24 arriba y 8 abajo; botones 44/54 |
| 12) `#nxWaTplOverlay` | WhatsApp «Crear plantilla» (asistente fácil) | etiqueta 13 a 8; cajita 16; ayuda a 4; botones 44/54 con letra 13. El chat y el inbox no se tocan |

**Ventanas que no se pudieron abrir para medir NO reciben la regla.** No se aplica a ciegas a caja, cierre, nómina, cobros de reparación, rifas por boleto, préstamos por solicitud ni «Cambiar usuario de acceso».

## Cómo se midió
- Se usó Playwright con el simulador de la auditoría (administrador falso y red a Supabase bloqueada), a 390 y 1280.
  - **Antes** es `origin/main` (59.70).
  - **Después** es esta rama.
  - **Apagado** es esta rama con `nx_fesp_off='1'`.
- Todo se midió con el mismo medidor, con animaciones apagadas para que no midiera ventanas a medio abrir.
- Al medidor de la auditoría se le corrigieron cinco casos que daban medidas falsas. Afectan igual al antes y al después:
  1. Una ayuda justo debajo del campo, aunque esté fuera de su contenedor, cuenta como «cajita → ayuda».
  2. Una tarjeta interna con fondo o borde marca el borde del contenido y el fin de su grupo.
  3. Si la ventana se desplaza, se mide su caja interna y no el fondo, y «campos → botón» se mide al final del desplazamiento.
  4. El título tiene que tener texto (una manija decorativa no cuenta).
  5. Un texto dentro de un botón no cuenta como ayuda.
- Además se comprobó:
  - que en ningún formulario aparece scroll horizontal;
  - que el botón principal se puede ver tras desplazar, en todos menos Configuración a 390, que ya fallaba en `main` porque se desplaza la página;
  - que con `nx_fesp_off='1'` las medidas son **idénticas a `main` en todos**.
- Resultado completo: `docs/bitacora/img/2026-10-29-espaciado-todos/estado-formularios.json`.

## Conteo (87 filas: 74 ventanas que se intentan abrir + 13 «por código» de la auditoría)
| Estado | Antes (`main`) | Después (59.72) |
|---|---:|---:|
| cumple | 0 | **52** |
| casi | 2 | 1 |
| no cumple | 56 | 5 (los 5 tienen motivo abajo) |
| sin campos (no es formulario) | 1 | 1 |
| no medible (no abre con datos de prueba) | 15 | 15 |
| por código (no se toca) | 13 | 13 |

## Tabla por formulario
| Formulario | Antes | Después | Nota |
|---|---|---|---|
| Login (Iniciar sesión) | no cumple | no cumple | pendiente: la casilla «Recordarme» mide 20×20 (toda la fila de 44 px la activa por label for). Agrandar la casilla cambia su dibujo; se deja al dueño. |
| Nuevo cliente / Ficha del cliente | no cumple | **cumple** |  |
| Registrar pago (Cobro) | no cumple | **cumple** |  |
| Nueva empresa | no cumple | **cumple** |  |
| Nuevo agente | no cumple | **cumple** |  |
| Nuevo asiento (Seguros) | no cumple | **cumple** |  |
| Usuario (nuevo/editar) | no cumple | **cumple** |  |
| Inhabilitar cliente | no cumple | **cumple** |  |
| Documentos del cliente | no cumple | **cumple** |  |
| Respaldo (Backup) | no cumple | **cumple** |  |
| Historial de cobros | sin campos | sin campos | no es formulario (lista sin campos). |
| Cambiar contraseña | no cumple | **cumple** |  |
| Cambiar usuario de acceso | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| Transferir a otro agente | no cumple | casi | casi: el monto (campo protagonista) lleva letra de 20 px en PC; la regla pide 16 y es más grande, no más chica. |
| Recibir entrega del agente | no cumple | **cumple** |  |
| Rechazar transferencia | no cumple | **cumple** |  |
| Configurar consulta de cobertura | no cumple | **cumple** |  |
| Configurar notificaciones | no cumple | **cumple** |  |
| Nueva cuenta bancaria (Mis cuentas) | no cumple | **cumple** |  |
| Nuevo destinatario | no cumple | **cumple** |  |
| Nuevo egreso (Contabilidad) | no cumple | **cumple** |  |
| Cierre de caja (Seguros) | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| Nueva tarea (CRM) | no cumple | **cumple** |  |
| Registrar actividad (CRM) | no cumple | **cumple** |  |
| Nueva novedad del cliente | no cumple | **cumple** |  |
| WhatsApp: nueva plantilla | casi | **cumple** |  |
| WhatsApp: plantillas fácil | casi | **cumple** |  |
| WhatsApp: automatizaciones | no medible | no medible | no medible y pendiente: letra 8,5–10 px en su CSS propio; no se tocó (excepción WhatsApp). |
| WhatsApp: reglas inteligentes | no medible | no medible | no medible y pendiente: letra 8,5–10 px en su CSS propio; no se tocó (excepción WhatsApp). |
| WhatsApp: validar pagos | no medible | no medible | no medible y pendiente: letra pequeña y pantalla de dinero; no se tocó. |
| Préstamos: nuevo cliente | no cumple | **cumple** |  |
| Préstamos: nuevo préstamo | no cumple | **cumple** |  |
| Préstamos: configuración | no cumple | **cumple** |  |
| Vehículos: nuevo vehículo | no cumple | **cumple** |  |
| Vehículos: configuración | no cumple | **cumple** |  |
| POS: nuevo producto | no cumple | no cumple | excepción: «Guardar artículo» es un botón partido (Guardar + flecha pegados, 0 px a propósito); en PC el hueco final mide 34 por la columna de resumen a la dere |
| POS: nuevo cliente | no cumple | **cumple** |  |
| POS: nuevo proveedor | no cumple | **cumple** |  |
| POS: abrir caja | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: cerrar caja / arqueo | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: movimiento de caja | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: cobrar venta | no medible | no medible | excluido por orden: pantalla de dinero, primero medir en vivo. No se tocó. |
| POS: nueva cuenta contable | no cumple | **cumple** |  |
| POS: nuevo asiento | no cumple | no cumple | excepción de lista: las líneas Debe/Haber son filas de una misma lista y van a 8 px (regla de listas); el medidor las cuenta como campo → campo. |
| POS: registrar gasto | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: nueva cotización | no cumple | **cumple** |  |
| POS: nuevo almacén | no cumple | **cumple** |  |
| POS: nueva oportunidad CRM | no cumple | **cumple** |  |
| POS: nuevo empleado | no cumple | **cumple** |  |
| POS: nueva reparación | no cumple | **cumple** |  |
| POS: nuevo financiamiento | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: configuración financiamiento | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: nuevo apartado | no cumple | **cumple** |  |
| POS: crear usuario de staff | no cumple | **cumple** |  |
| POS: nueva secuencia NCF | no cumple | **cumple** |  |
| POS: nuevo rol | no cumple | **cumple** |  |
| POS: nuevo vendedor | no cumple | **cumple** |  |
| POS: nuevo NCF | no cumple | **cumple** |  |
| POS: nota de débito | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: devolución / nota de crédito | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| POS: nueva entidad | no cumple | **cumple** |  |
| POS: categorías | no cumple | **cumple** |  |
| POS: nivel de precio | no cumple | **cumple** |  |
| POS: nueva compra | no medible | no medible | no abre con datos de prueba (necesita caja abierta, venta o registro real); no se le aplica la regla a ciegas |
| Rifas: nueva rifa | no cumple | **cumple** |  |
| Rifas: cuenta de cobro | no cumple | **cumple** |  |
| Rifas: combo / paquete | no cumple | **cumple** |  |
| Rifas: vendedor | no cumple | **cumple** |  |
| Consultorio: nueva cita | no cumple | **cumple** |  |
| Consultorio: nuevo paciente | no cumple | **cumple** |  |
| Consultorio: nueva consulta | no cumple | no cumple | excepción de lista: el examen físico son 13 filas de una lista (8 px) con etiquetas escritas en MAYÚSCULAS en el código; el resto del formulario cumple. |
| Panel dueño: nueva empresa SaaS | no cumple | **cumple** |  |
| Configuración (pantalla) | no cumple | no cumple | no aplica en PC: es una pantalla con dos tarjetas lado a lado (cada tarjeta ya tiene 48/40 por dentro) y subsecciones con título (24 + título + 8); a 390 cumple |
| POS: ajuste de inventario | no cumple | **cumple** |  |
| POS: entrada/salida de efectivo (movimiento de caja) | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| POS: abonar a factura de proveedor | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| POS: transferencia / despacho entre almacenes | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| POS: generar nómina | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| POS: entregar y cobrar reparación | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| POS: plan de financiamiento | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| Rifas: vender boleto | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| Rifas: editar boleto | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| Rifas: cambiar número | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| Rifas: rechazar pago | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| Préstamos: pedir corrección de solicitud | no cumple (por código) | por código (sin tocar) | misma pieza .overlay>.modal (.mt/.fr/.fe) que las demás, pero no se pudo abrir sin datos reales (caja abierta, venta, boleto…); no se le aplica la regla a ciega |
| WhatsApp: reglas inteligentes (nueva regla) | no cumple (por código) | por código (sin tocar) | no medible y pendiente: letra 8,5–10 px en su CSS propio; no se tocó (excepción WhatsApp). |
| POS: cobrar venta (pago en caja) | no cumple (por código) | por código (sin tocar) | excluido por orden: pantalla de dinero, primero medir en vivo. No se tocó. |

## Pendientes, con motivo
- **Login:** la casilla «Recordarme» mide 20 × 20. Toda la fila de 44 px la activa (`label for`), pero agrandar la casilla cambia su dibujo; lo decide el dueño.
- **POS nuevo artículo:** «Guardar artículo» es un botón partido (Guardar y la flecha van pegados a propósito). En PC el hueco final mide 34 por la columna de resumen.
- **POS nuevo asiento:** las líneas Debe/Haber son filas de una lista y van a 8 px, como dice la regla de listas. El medidor las cuenta como campo → campo.
- **Consultorio, nueva consulta:** el examen físico son 13 filas de lista y sus nombres están escritos en MAYÚSCULAS en el código. El resto del formulario cumple.
- **Configuración en PC:** son dos tarjetas lado a lado (cada una con 48/40 por dentro) con subsecciones; el borde del panel no aplica. A 390 cumple.
- **Transferir a otro agente (casi):** el monto, que es el campo protagonista, usa letra de 20 px en PC.
- **No medibles y por código, sin tocar:**
  - Cobrar venta: excluido por orden del dueño.
  - Abrir caja, cerrar caja/arqueo, movimiento de caja, gasto, nota de débito, devolución, compra, financiamiento (nuevo, configuración y plan), nómina, abono a proveedor, transferencia entre almacenes y entregar reparación.
  - Rifas (vender, editar, cambiar número, rechazar), corrección de préstamo, Cierre de caja (Seguros) y Cambiar usuario de acceso.
  - WhatsApp automatizaciones, reglas inteligentes y validar pagos (letra de 8,5–10 px en su CSS propio).
  - Todos necesitan medirse en vivo con datos reales antes de aplicarles la regla.

## Archivos
- `index.html`: capa `style#nxFormEspaciado` (piloto + bloque 59.72) y `APP_VERSION` 59.71 → **59.72**.
- `docs/MEMORIA.md`:
  - línea del espaciado actualizada;
  - se corrige que **59.70 ya está publicada en `main` (PR #420)**: encabezado de producción y línea de Premium Blue.
- `docs/bitacora/img/2026-10-29-espaciado-todos/`: comparativas antes/después y `estado-formularios.json`.
- No se tocaron Supabase, RPC, Edge Functions, datos, JS de lógica ni otras ramas.

## Cómo apagarlo
- En un equipo: `localStorage.setItem('nx_fesp_off','1')`.
- Para todos: `NX_FESP=false` en `script#nxFormEspaciadoOn`.
- Apaga a la vez el piloto y lo nuevo.

## Riesgos
- **Las ventanas crecen** (48/40 en PC). Las que ya no caben en 1280 × 900 se desplazan, y el botón principal sigue alcanzable; se midió.
- **Login:** campos de 56 a 48 px y botón de 58 a 54. Es la pantalla que más se ve; revisar en iPhone.
- **Prioridad de 6 ids:** gana a todas las capas existentes. Si una capa futura quiere cambiar esos espacios, tiene que usar `html.nx-fesp-off` o subir su prioridad.

## Siguiente paso
1. El dueño revisa las comparativas y la rama y decide si dice «publícalo».
2. Medir en vivo (con caja abierta y datos reales) las ventanas «por código» y aplicarles la regla una por una.
3. Decidir la casilla del login y si el resumen del cobro deja de ser fijo.

## Estado
Rama `claude/espaciado-piloto`, sin PR y sin publicar.
