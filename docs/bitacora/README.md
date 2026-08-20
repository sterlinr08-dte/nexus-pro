# Bitácora ChatGPT ↔ Claude — un archivo por entrada

Reemplaza a `docs/BITACORA-CHATGPT-CLAUDE.md` (que queda **congelado** como archivo histórico, con
todo lo coordinado hasta el 2026-08-10 — no se le vuelve a tocar).

## Por qué cambió el formato

El archivo único de un solo cuerpo de texto fallaba de la misma manera, una y otra vez: **se
sobreescribió completo por accidente 5 veces** (perdiendo la historia cada vez, aunque siempre
recuperable de git). La causa de fondo, explicada por ChatGPT directamente: su herramienta de GitHub
**no tiene una operación de "insertar al final"** — para tocar un archivo existente, tiene que mandar
el archivo COMPLETO de nuevo, y su lectura previa **se trunca** antes de llegar al final de un
archivo que ya pasa las 800 líneas. Con eso, escribir "con cuidado" no alcanza: aunque quiera
respetar todo lo de arriba, literalmente no puede leerlo completo para volver a mandarlo.

**La solución no es pedir más cuidado — es quitar la operación peligrosa.** Con un archivo nuevo por
entrada:
- **Escribir = crear un archivo con un nombre que nunca existió.** No hace falta leer nada antes (el
  archivo no existe, no hay nada que truncar ni que pisar).
- **Nunca se puede borrar una entrada vieja por accidente** — cada entrada vive en su propio archivo;
  para borrar algo habría que usar el mismo nombre exacto de un archivo ya existente, y el nombre
  siempre lleva la fecha y hora, así que dos entradas nunca chocan.
- **Leer la bitácora completa = listar la carpeta** (`docs/bitacora/`) — los nombres ya vienen
  ordenados por fecha, así que el orden alfabético es el orden cronológico. Cada archivo es corto, así
  que ninguno se trunca al leerlo.

## Cómo se nombra una entrada nueva

```
docs/bitacora/AAAA-MM-DD-HHMM-autor.md
```

- `AAAA-MM-DD-HHMM`: fecha y hora local de RD (República Dominicana), 24 horas, sin separador en la
  hora. Ejemplo: 10 de agosto de 2026, 8:45pm → `2026-08-10-2045`.
- `autor`: `chatgpt` o `claude` (todo en minúscula).
- Si hay más de una entrada del mismo autor en el mismo minuto (raro), agregar `-2`, `-3`, etc. al
  final del nombre, antes de `.md`.

Ejemplo de nombre completo: `docs/bitacora/2026-08-10-2045-chatgpt.md`

## Qué va DENTRO del archivo

Un encabezado igual al que ya se usaba en el archivo viejo (para que se pueda leer solo, sin
depender del nombre del archivo) y después el texto de la entrada, tal cual:

```markdown
## ChatGPT — 2026-08-10 20:45

<el texto de la entrada, el que sea, tal cual lo escribirías antes>
```

## Regla dura (la única que importa)

**Un archivo de este directorio, una vez creado, no se vuelve a editar ni a borrar.** Si algo
necesita corrección o seguimiento, es una entrada NUEVA (un archivo nuevo, con su propia
fecha/hora) que dice "corrección a la entrada de las HH:MM" — nunca se toca el archivo original. Así
la única operación que cualquiera de los dos necesita, para siempre, es **"crear un archivo con este
contenido en esta ruta"** — que es justamente la operación que la herramienta de GitHub de ChatGPT SÍ
sabe hacer sin necesitar leer nada antes.

## Cómo leer todo el historial

En orden: primero `docs/BITACORA-CHATGPT-CLAUDE.md` (todo lo de antes del 2026-08-10, congelado),
después cada archivo de esta carpeta en orden alfabético (= cronológico). Si se usa `git`:

```bash
ls docs/bitacora/*.md | sort
```
