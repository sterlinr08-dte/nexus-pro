---
name: redaccion-clara
description: Revisa o reescribe textos en español que verá el dueño, las empleadas o los clientes (avisos en pantalla, mensajes de WhatsApp, plantillas, correos, respuestas de la IA) para que queden cortos, profesionales, que informen y sin muletillas «de robot». Usar siempre antes de dejar un texto nuevo en el sistema. Modos: detectar o reescribir.
---

# Redacción clara (español)

Regla del dueño (REGLAMENTOS §4, 22-oct-2026): «Palabras que informen, profesionales, sin redundancia». Esta skill la
aplica a cualquier texto en español. Las categorías de patrones se tomaron de la skill *avoid-ai-writing* (Conor
Bronsdon, MIT), que está calibrada para inglés; aquí están adaptadas al español dominicano del negocio.

## Cómo se usa
- `/redaccion-clara detectar <texto>` → lista los problemas, sin cambiar nada.
- `/redaccion-clara <texto>` → devuelve una sola versión corregida (modo por defecto). Si el texto ya está bien, se dice
  «está bien» y no se toca.
- Para un archivo: indicar la ruta; se corrigen solo las cadenas de texto visibles, nunca el código.

## Qué se corrige
1. **Largo.** Una o dos frases por aviso. Una idea por frase. Nada de párrafos en un toast.
2. **Redundancias.** «subir arriba», «volver a repetir», «prefactura preliminar», «totalmente gratis», «cada uno de los».
3. **Relleno que no informa.** «Es importante destacar que», «cabe mencionar», «a continuación», «en resumen», «sin
   duda», «de manera exitosa», «con éxito», «por favor tenga en cuenta», «le informamos que».
4. **Muletillas de IA.** «¡Claro!», «¡Por supuesto!», «¡Excelente pregunta!», «Espero que esto le ayude», «no dude en»,
   «estoy aquí para ayudarle», ternas forzadas («rápido, fácil y seguro»), «no solo… sino también», guiones largos como
   pausa dramática, emojis en avisos del sistema.
5. **Instrucciones de más.** El aviso dice qué pasó y, si hace falta, qué hacer. No explica el porqué técnico ni repite
   lo que la pantalla ya muestra.
6. **Voz.** Al cliente y al dueño siempre de «usted». Verbos directos: «Guarde», «Escriba», «Anule». Sin pasivas
   («será procesado») cuando se puede decir quién hace qué.
7. **Palabras infladas.** «optimizar» → «mejorar»; «implementar» → «poner»; «funcionalidad» → «función»;
   «proceder a» → (quitar); «realizar un pago» → «pagar»; «visualizar» → «ver»; «a nivel de» → «en».
8. **Números y dinero.** «RD$ 11,691.00», fechas «22-oct-2026», horas «8:30 pm». Nada de «aprox.» si se sabe la cifra.

## Cómo se entrega
- Modo detectar: tabla `Fragmento · Problema · Propuesta`.
- Modo reescribir: el texto final y, debajo, una línea con lo que cambió. Sin explicar la teoría.
- Si el texto va a una plantilla de WhatsApp, respetar las variables `{{1}}` y el límite de Meta (1,024 caracteres en el cuerpo).

## Ejemplos
| Antes | Después |
|---|---|
| «Info Plus no cambia el descuento ni el comentario de una prefactura ya enviada. Para cambiarlos, anule la Nº X en Info Plus y cree una nueva.» | «Esta prefactura no se modificará en Info Plus. Los cambios quedan solo en este sistema.» |
| «¡Claro! Con gusto le comparto a continuación nuestras cuentas bancarias para que pueda realizar su pago de manera exitosa.» | «Cuentas de BAYOL CELL para transferencias: …» |
| «Se ha procedido a guardar la prefactura con éxito.» | «Prefactura guardada.» |
