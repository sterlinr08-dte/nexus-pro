# Salidas de custodia del administrador · base de datos preparada (sin aplicar)

## Pedido del dueño
Tras la auditoría Fase 0 (bitácora «auditoria-fase0-acumulados», en la rama `claude/review-claude-md-jpzk7k`), eligió «2 · Salidas del administrador».
- Motivos reales: pago a la aseguradora, gastos del negocio y retiro del dueño.
- El depósito de efectivo al banco no es salida: solo pasa de efectivo a banco.
- Para el saldo viejo: «una salida inicial» de ajuste, con la cifra real que él dé.

## Diagnóstico
La custodia del administrador solo subía (RD$ 2,067,910: efectivo 124,500 y banco 1,943,410). Se registran las entradas, pero no existía ningún movimiento de salida.

## Qué se preparó
Migración `supabase/migrations/20261109230000_seguros_salidas_custodia.sql`. **No está aplicada.**
- Tabla nueva `seguros_salidas_custodia`:
  - motivo: `aseguradora`, `gasto`, `retiro`, `ajuste_inicial` o `deposito_banco`;
  - método: Efectivo o Banco;
  - anulación con fecha y motivo;
  - RLS: solo lee el administrador.
- Mismas firmas, solo cambia el cuerpo (no hay que borrar funciones):
  - `seguros_acumulado_validado_agente`, `seguros_saldo_validado_agente_asof` y `seguros_resumen_ciclo_agente_core` restan las salidas;
  - `seguros_custodia_desglose_agente` resta del efectivo las salidas en efectivo.
- Funciones nuevas: `seguros_registrar_salida_custodia`, `seguros_anular_salida_custodia` y `seguros_salidas_ciclo`. Solo para el administrador, con candado de saldo por bolsa (efectivo o banco), llave contra doble envío y auditoría.
- Reglas:
  - una salida no toca lo cobrado;
  - cuenta por su fecha de registro (no se puede fechar hacia atrás, así un ciclo cerrado no cambia);
  - anularla devuelve el dinero en el ciclo en que se anula;
  - `deposito_banco` no baja el total.

## Pruebas (en la base real, dentro de un bloque que termina en error → todo revertido)
- Con la migración puesta y cero salidas: ninguna cifra cambia (ciclos 2026-08, 09 y 10, los dos agentes).
- Salida de 100,000 por banco en el ciclo actual:
  - custodia de Esterlin −100,000 (banco −100,000, efectivo igual);
  - Robinson igual; lo cobrado igual;
  - ciclos cerrados iguales; diferencia de reconciliación 0.
- Depósito de 50,000 de efectivo al banco: total igual, efectivo −50,000, banco +50,000.
- Salida anulada en el mismo ciclo: sin efecto, diferencia 0.
- Salida del ciclo anterior anulada en este: el ciclo anterior queda con la salida, el actual la reintegra, y la diferencia es 0 en ambos.
- Depósito al banco con método «Banco»: lo bloquea el candado.
- Verificado después: la tabla no existe y las funciones siguen como estaban.
- No probado todavía: las tres funciones nuevas con un usuario real (necesitan sesión de administrador). Se prueban al aplicar.

## Riesgos y pendientes
- Las líneas `revoke … from public, anon` pueden quedar retenidas por la herramienta de Supabase; las funciones igual exigen rol de administrador por dentro.
- El reporte del ciclo y el resumen de WhatsApp aún no muestran la columna «Salidas»: el saldo final ya las incluiría, pero falta mostrarlas (función `seguros_salidas_ciclo` lista para eso).
- Falta la pantalla (botón «Salida» en Custodia, lista y anular).
- Falta la cifra real del dueño para el ajuste inicial.

## Estado
Rama `claude/salidas-custodia` (desde `main`). Sin aplicar a la base y sin publicar. Requiere el OK del dueño.
