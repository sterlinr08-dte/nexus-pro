# Textos profesionales en la ventana de cobro (59.38, sin publicar) — Claude

- **Pedido del dueño:** poner más profesionales los textos de la ventana de pago («los textos que dicen quién recibió el efectivo… se siente informal»), recordando «un video que te envié que enseñaba a organizar y comunicar».
- **El video:** no aparece en las bitácoras ni en `docs/REFERENCIAS-DISENO.md` de los 3 proyectos. Lo más cercano es **Stage** (ordenar antes de programar). Se aplicaron las reglas de comunicación de siempre:
  - títulos con nombres, no preguntas;
  - una sola idea por texto;
  - el mismo término para el mismo concepto en toda la ventana;
  - instrucciones de usted, formales y parejas.
  
  Queda pendiente pedirle al dueño el enlace del video para agregarlo a la lista.
- **Cambios de texto** (misma lógica; solo cambia lo que se lee):

  | Antes | Ahora |
  |---|---|
  | Cómo pagó | Método de pago |
  | ¿Quién recibió el efectivo? / ¿Quién gestionó el cobro? | Recibido por / Gestionado por |
  | Ese dinero queda en su poder hasta que lo entregue o lo transfiera. | El efectivo queda bajo su custodia hasta que lo entregue o lo transfiera. |
  | Solo indica quién atendió al cliente. El dinero queda en poder del dueño de la cuenta donde se depositó. | Identifica a quien atendió al cliente. Los fondos quedan bajo custodia del titular de la cuenta de destino. |
  | ¿A qué cuenta llegó el dinero? * | Cuenta de destino * |
  | El dinero queda en poder del dueño de esta cuenta (no de quien gestionó el cobro)… | Los fondos quedan bajo custodia del titular de esta cuenta. Si la cuenta no es suya, el pago queda pendiente de validación en Solicitudes. |
  | En poder de: X · Recibió el efectivo / Depositado a su cuenta — no está en poder de Y | Bajo custodia de: X · Efectivo recibido / Fondos depositados en su cuenta; no quedan bajo custodia de Y |
  | Efectivo · recibió X / gestionó X / a la cuenta de X / falta elegir la cuenta / falta elegir el agente | Efectivo · Recibido por X / Gestionado por X / Cuenta de X / Cuenta de destino sin seleccionar / Responsable sin seleccionar |
  | Queda pendiente / Salda todo lo pendiente / Salda lo pendiente y adelanta / Adelanta | Saldo restante: / Liquida el saldo pendiente / Liquida el saldo y adelanta / Pago adelantado de |
  | Botón: Falta escribir el monto / elegir el banco / escribir el número / elegir la cuenta / elegir quién recibió | Indique el monto / Seleccione el banco / Indique el número de referencia / Seleccione la cuenta de destino / Seleccione quién recibió el efectivo (o gestionó el cobro) |
  | Atajos: 1 cuota / Saldar | Una cuota / Saldo total |
  | Referencias: Número de la transferencia, Aprobación de la tarjeta, «Ej. número de recibo»… | Número de transferencia, Código de aprobación, «Número de recibo»… |
  | Foto / archivo · «Copia el comprobante en WhatsApp y toca "Pegar"» | Adjuntar archivo · «Puede pegar el comprobante copiado desde WhatsApp con «Pegar».» |
  | + Referencia o comprobante | Añadir referencia o comprobante |
  | Pago registrado: Le queda pendiente / El cliente quedó al día | Saldo restante del cliente: / Cliente al día |
  | Avisos: Monto inválido · Agente requerido · Falta la cuenta · Error registrando abono… | Monto no válido · Responsable requerido · Cuenta de destino requerida · No se pudo registrar el pago (con instrucciones de usted) |

- **Archivos:**
  - `index.html`:
    - HTML de `#mAbono`;
    - `nxAboActualizarResumen()` (solo textos);
    - `mostrarCajaRecibo()`: la expresión que quita la línea del saldo se actualizó a los textos nuevos;
    - las validaciones de `regAbono()` (solo textos);
    - el botón de la capa 59.37;
    - `APP_VERSION` pasa a `'59.38'`.
  - `parches-seguros-base.js`: «Cuenta de destino» y su nota; «Adjuntar archivo» y sus 2 avisos; la ayuda de «Pegar».
  - `scripts/qa-registrar-pago.mjs`: expectativas con los textos nuevos.
- **Sin cambios:** cálculos, custodia, RPC, validaciones (solo su texto), Supabase.
- **Pruebas:**
  - `qa-registrar-pago.mjs`: **58 PASS · 0 FAIL**. La transferencia mide 1,448 px; la separación entre secciones se bajó de 12 a 10 px porque los textos nuevos son un poco más largos.
  - `qa-custodia.mjs`: **68 PASS · 0 FAIL**.
- **Nota:** el resto del sistema (reportes, Inicio, custodia por agente) sigue diciendo «en poder». Si el dueño quiere el mismo término en todo, se cambia en una entrega aparte.
- **Publicación:** NO publicado. Rama `claude/inicio-vidrio` (59.36 + 59.37 + 59.38). Esperar «publícalo».
