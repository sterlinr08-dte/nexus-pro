# Salidas de custodia · base aplicada en producción (pantalla sin publicar)

- El dueño respondió «Sí, aplícalo y sigue» a la pregunta de aplicar el cambio a la base.
- Aplicado en el proyecto `tnwsgcxurfyuszxsewsn` como cuatro migraciones:
  - `seguros_salidas_custodia` (tabla y cuatro funciones de cálculo);
  - `seguros_salidas_custodia_funciones` (registrar, anular y salidas del ciclo);
  - `seguros_salidas_custodia_permisos` (las funciones nuevas sin acceso para `anon`);
  - `seguros_salidas_custodia_tabla_permisos` (la tabla sin acceso para `anon`; `authenticated` solo lee, y la RLS deja leer solo al administrador).
- El archivo `supabase/migrations/20261109230000_seguros_salidas_custodia.sql` contiene lo mismo, incluida la última parte de permisos.
- Verificado después de aplicar, con cero salidas:
  - Robinson 419,690 (efectivo 221,500 / banco 198,190);
  - Esterlin 2,067,910 (efectivo 124,500 / banco 1,943,410);
  - saldo final y cobrado de los ciclos 2026-08, 09 y 10 idénticos a antes, y diferencia de reconciliación 0.
- `anon` no puede ejecutar las tres funciones nuevas; `authenticated` sí, y por dentro exigen rol de administrador.
- Corrige a la entrada «salidas-custodia-base», que decía «sin aplicar».
- Pendiente:
  - publicar la pantalla (59.83, rama `claude/salidas-custodia`) con el OK del dueño;
  - probar registrar y anular con su usuario real;
  - registrar la salida inicial de ajuste con la cifra real que él dé;
  - mostrar las salidas en el resumen de WhatsApp del ciclo.
