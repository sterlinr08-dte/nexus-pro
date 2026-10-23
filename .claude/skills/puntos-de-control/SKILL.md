---
name: puntos-de-control
description: Forma de trabajar del dueño (23-oct-2026, inspirada en el plugin VibeWise de Noah Kim, MIT): antes de escribir código de un cambio que no sea trivial, la IA se frena, muestra 2–3 opciones en palabras sencillas con ventajas y desventajas, y espera la decisión del dueño; después explica qué cambió, por qué y qué pruebas pasaron; si va a tocar un módulo que no conoce, antes dibuja un mapa corto. Se usa sola, sin que el dueño la nombre.
---

> **Nota de instalación (23-oct-2026):** escrita a mano para los 3 proyectos (`nexus-pro`, `bayolcell-taller`, `studio-rd`) a partir de la
> idea del plugin **VibeWise** (github.com/nykooi1/vibe-wise, MIT, de Noah Kim; no es de Anthropic). **No se instaló el plugin**: trae
> ganchos y scripts de Python y está pensado para programadores que quieren aprender. Aquí queda solo la forma de trabajar, adaptada
> a un dueño que no es técnico. El reel que la originó: instagram.com/reel/De0wcU4Pxl9 (Fer Ayestarán).

# Puntos de control

El dueño pidió «eso»: que la IA **no escriba código a ciegas**. Primero se piensa con él, él decide, y al final se le cuenta qué pasó.

## 1. Antes de escribir (punto de control de decisión)
Aplica a todo cambio que **no sea trivial**: una pantalla nueva, una regla de negocio, algo que toque dinero, WhatsApp, Supabase o
Info Plus, o cualquier cosa con más de una forma razonable de hacerse.
- Decir en **una línea** qué se entendió del pedido.
- Mostrar **2 o 3 opciones** (A, B, C) en palabras sencillas, cada una con **ventajas y desventajas** y, si cambia algo, cuánto
  tarda o qué riesgo tiene. Recomendar una y decir por qué.
- Si el dueño puede **verlo**, mostrarlo: maqueta, captura o ejemplo del mensaje (como las maquetas A/B de la Prefactura del 23-oct).
- **Esperar la decisión.** No se escribe código hasta que elija. Si dice «hazlo» o «dale», se toma la recomendada.
- Cambios triviales (una palabra, un color, un error obvio): se hacen directo y se informan.

## 2. Mientras se trabaja
- Si aparece una decisión nueva que el dueño no vio, se le pregunta con el mismo formato corto; no se decide por él en cosas de
  negocio, dinero o mensajes a clientes.
- Lo que la IA agrega por su cuenta (detalles técnicos) se lista aparte al final, para que él pueda quitarlo.

## 3. Después (informe)
En el mensaje final, siempre:
- **qué cambió** (en palabras de usuario, no de código);
- **por qué** así (la opción que eligió);
- **qué pruebas pasaron** (anchos 390 y 1280, casos probados, sin errores) y qué **no** se probó;
- qué le toca a él (llenar algo, revisar, decir «publícalo»).

## 4. Mapa antes de tocar lo desconocido
Si el módulo no se ha tocado en la sesión, antes de proponer opciones se lee el código real y se dibuja un **mapa corto**: qué
archivos, qué función manda, de dónde salen los datos (fuente de verdad). En NEXUS puede usarse `graphify-nexus`.

## Cómo encaja con las demás skills
- `the-architect` / `interview-me` / `idea-refine`: para proyectos o funciones **grandes** (entrevista completa).
- `doubt-driven-development`: para dudar de una decisión ya tomada.
- Esta skill es la **versión ligera y diaria**: dos o tres opciones, una decisión, un informe. No reemplaza la bitácora ni la regla
  de publicación («publícalo»).
