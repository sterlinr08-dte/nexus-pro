# Metodología obligatoria — pruebas con datos sintéticos contra producción

**Decretada:** 2026-08-12, a pedido de ChatGPT, como condición para cerrar el Bloque 3B y abrir
cualquier fase siguiente (3C en adelante). Aplica a **todas las fases futuras** de este trabajo
de auditoría/hardening de NEXUS PRO (Claude + ChatGPT sobre Supabase), no solo a Seguros.

## Por qué existe esta regla

Durante la batería de pruebas del Bloque 3B (generación/anulación de facturas vía RPC), un script
de prueba con datos sintéticos terminó en un **COMMIT accidental** en vez de deshacerse — el script
dependía de una línea `ROLLBACK;` escrita a mano al final de un bloque `BEGIN...ROLLBACK`, y esa
dependencia falló. El incidente se contuvo (se identificaron y neutralizaron los residuos: 4
facturas y 2 clientes sintéticos fueron borrados; 8 asientos contables quedaron permanentemente en
el libro porque `trg_seguros_bloquear_delete_asiento` prohíbe borrar asientos por diseño — se
revirtieron a monto neto cero, nunca se eliminaron), pero el método que lo causó era frágil por
construcción y se puede repetir en cualquier fase futura si no se cierra la puerta de raíz.

**Dos formas concretas en que "escribir ROLLBACK a mano" falla, sin que se note en el momento:**
1. Un script de varias sentencias se reparte en **más de una llamada** a la herramienta de SQL
   (`execute_sql` u otra). No hay garantía de que dos llamadas separadas compartan la misma
   sesión/transacción — un `BEGIN` en la llamada 1 y un `ROLLBACK` en la llamada 2 pueden no tener
   ninguna relación real entre sí, y lo de la llamada 1 puede quedar confirmado igual.
2. El script tiene un error a mitad de camino y el flujo nunca LLEGA a la línea `ROLLBACK;` final
   — o el error se traga en silencio y el script sigue de largo, dejando el estado a medias.

## La regla, en una frase

**Ninguna prueba con datos sintéticos contra producción puede depender de que una línea `ROLLBACK`
escrita a mano se ejecute con éxito.** El deshacer tiene que ser estructuralmente inevitable, no
una instrucción que confiamos en que se cumpla.

## El patrón obligatorio: rollback forzado por diseño (no por confianza)

Toda la prueba —montaje de datos sintéticos, llamadas a RPC/funciones, aserciones— vive **dentro
de un solo bloque `DO $$ ... END $$;`**, ejecutado como **una sola llamada** a la herramienta de
SQL (nunca repartido en varias llamadas que dependan de compartir transacción). Al final del
bloque, **sin excepción**, se fuerza un `RAISE EXCEPTION` propio — así no existe ningún camino
dentro del bloque que llegue a un `COMMIT` limpio, ni si todas las aserciones pasan ni si alguna
falla antes:

```sql
DO $$
BEGIN
  -- ═══ TODO el cuerpo de la prueba va AQUÍ DENTRO, en un solo bloque ═══
  -- montaje de datos sintéticos (INSERT), llamadas a RPC vía SELECT,
  -- aserciones (RAISE EXCEPTION si algo no da lo esperado — esto también
  -- aborta la transacción, así que ya cumple el objetivo por sí solo)
  -- ...

  -- Si TODAS las aserciones pasaron, igual se fuerza el abort:
  RAISE EXCEPTION 'ROLLBACK_FORZADO_FIN_DE_PRUEBA: % aserciones OK, deshaciendo todo (intencional)', v_ok_count;
END $$;
```

Por qué esto es a prueba de los 2 fallos de arriba:
- **Es una sola llamada** → no hay forma de que un `BEGIN`/`ROLLBACK` queden desconectados entre
  dos conexiones distintas — el bloque entero corre en la transacción implícita de esa única
  llamada.
- **Nunca hay un camino de salida limpio** → tanto si una aserción falla a mitad de camino
  (`RAISE EXCEPTION` real, aborta) como si todas pasan (`RAISE EXCEPTION` forzado al final, aborta
  igual), la transacción SIEMPRE termina abortada. No existe ninguna combinación de resultados que
  llegue a un `COMMIT`.
- El mensaje del `RAISE EXCEPTION` final debe decir explícitamente que es intencional (prefijo
  `ROLLBACK_FORZADO_...`) — así, al leer el resultado de la herramienta, un error con ese prefijo
  se lee como éxito de la prueba, no como un fallo real.

## Reglas complementarias, obligatorias

1. **Preferir un branch de Supabase sobre producción**, siempre que la prueba no necesite
   específicamente el esquema/datos/políticas reales de producción para ser válida (ej. probar la
   lógica de una función nueva antes de aplicarla). Reservar producción para lo que de verdad
   exige producción — y ahí, con el patrón de arriba.
2. **Nunca confiar en que el rollback funcionó — verificarlo con una consulta de solo lectura
   aparte**, después de que la llamada de prueba haya terminado (con éxito o "error" forzado). El
   propio mensaje `ROLLBACK_FORZADO_...` no es prueba suficiente por sí solo; una consulta `SELECT`
   independiente contra los ids/filas usados en la prueba sí lo es.
3. **Cuando una prueba genuinamente necesita varias llamadas separadas** (ej. porque hay que pasar
   por una API REST/PostgREST real y no solo SQL crudo, que sí abre una sesión nueva por llamada),
   el plan de limpieza se escribe **ANTES** de correr la prueba, no se improvisa después de ver qué
   quedó. Tras la limpieza, se reverifica con `SELECT` — igual que en la regla 2, nunca se da por
   buena la limpieza sin comprobarla.
4. **Nada de esto reemplaza la inmutabilidad ya existente de `asientos`** — un asiento contable no
   se borra nunca, ni por accidente ni por limpieza de prueba; si una prueba de verdad necesita
   generar un asiento real (no evitable), la única forma de "deshacerlo" es un asiento de reversión
   con el neto en cero, dejando rastro explícito de que fue una prueba (mismo criterio ya usado al
   cerrar el incidente del Bloque 3B) — y el patrón de rollback forzado de arriba es precisamente lo
   que evita tener que llegar a esa situación en primer lugar.

## Cuándo aplica

Desde el Bloque 3C en adelante, y para cualquier prueba futura de este trabajo (Claude o ChatGPT)
que necesite insertar/modificar datos sintéticos contra la base real de producción
(`tnwsgcxurfyuszxsewsn`). No aplica a consultas de solo lectura (`SELECT`), que no necesitan
ningún mecanismo de rollback.
