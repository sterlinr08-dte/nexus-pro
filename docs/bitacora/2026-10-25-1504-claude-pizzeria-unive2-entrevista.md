# PIZZERÍA UNIVE 2: arranque y formulario de entrevista para la clienta

**Fecha:** 2026-10-25 15:04 (RD)
**Autor:** Claude
**Rama:** `claude/pizzeria-unive2` (solo esta bitácora; no hay cambios de código ni de base)

## Solicitud del dueño
Proyecto nuevo: caja / punto de venta para **PIZZERÍA UNIVE 2**, que es clienta del dueño. Lo decidido en otro chat (25-oct):
- base Supabase propia;
- subdominio bajo nexusprord.com, con el modelo de Deluxe y Amatista;
- nada que ver con STUDIO.

Se usó la skill `the-architect` para la entrevista.

## Decisiones del dueño en este chat
- **La clienta responde la entrevista de su negocio** con un formulario web.
- Las decisiones que no se le dejan a la clienta: subdominio, PSFE y precio. Esas quedan para el dueño.
- **Se quitó la pregunta del RNC.** La clienta **todavía no se ha constituido** y no tiene RNC.
- Consecuencia: la caja arranca **sin NCF ni e-CF**. La parte fiscal se queda lista para encenderla cuando tenga RNC y certificado digital (REGLAMENTOS §4).

## Hecho
- Formulario «Caja de Pizzería Unive 2» (Artifact privado): https://claude.ai/artifact/N4ZXnNso4FPEF5EuBZ8pkL
- Tiene 13 preguntas:
  - quién responde;
  - cómo vende (mesas, llevar, delivery, apps, WhatsApp) y cómo cobra el envío;
  - qué vende (tamaños, mitad y mitad, extras, porción, combos);
  - quién cobra y cuántos empleados hay;
  - si fía;
  - la comanda para cocina;
  - formas de pago;
  - propina del 10 %;
  - cuadre de caja;
  - horario;
  - lo que más le complica hoy.
- No se piden claves, tarjetas ni datos fiscales.
- Cómo llegan las respuestas:
  - el botón «Enviar» las guarda en la base del Artifact, solo si la clienta tiene acceso de colaboradora;
  - si no lo tiene, quedan los botones «Mandarlas por WhatsApp» (wa.me con el texto) y «Copiar el texto».
- Botones de 44 px como mínimo, campos de 48 px y letra de 16 px, botón principal de 54 px. No se midió con Playwright: es un Artifact, no una pantalla de NEXUS.

## Pendientes y riesgos
- El dueño tiene que **compartir el enlace** con la clienta desde el menú «Compartir». Si no le da acceso de colaboradora, ella responde por WhatsApp.
- **Supabase restringe los proyectos desde el 27-oct.** Hay que revisar la cuota y el plan con el dueño antes de crear la base.
- e-CF: la obligación es desde el 15-nov-2026. Sin RNC no aplica todavía. Cuando se constituya, se tramitan el certificado y el PSFE. Queda ofrecido averiguar precios de Alanube y otros.
- Hallazgo del código: el POS no tiene comanda de cocina ni propina (búsqueda en `parches-pos.js`). Sí tiene cuadre de caja.

## Siguiente paso
1. Con las respuestas: preguntarle al dueño el subdominio y la cuota de Supabase.
2. Después, entregar el plano completo antes de programar.
