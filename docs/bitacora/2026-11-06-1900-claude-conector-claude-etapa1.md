# 06-nov-2026 · Conector personal para Claude (MCP) — ETAPA 1: solo consultar (RAMA, sin desplegar)

## Pedido del dueño
- Reel de Rogelio Serrano («Crea tu MCP para tu propia App»). El dueño quiere usarlo «para uso personal, para tener más interacción contigo, y me apliques pago o me hagas algo que necesito en el momento».
- Se le ofrecieron A (en 2 etapas, primero solo consultar), B (todo de una vez) y C (nada nuevo). **Eligió A.**
- Etapa 2 (aplicar pago y generar factura **con su confirmación**, usando `seguros_registrar_cobro_con_entrega` y `seguros_generar_factura_manual`) queda para después, con su OK.

## Qué es
- Edge Function nueva `supabase/functions/nexus-mcp/`:
  - `index.ts`: servidor;
  - `mcp.ts`: protocolo MCP «Streamable HTTP» con JSON-RPC por POST y respuesta JSON;
  - `datos.ts`: consultas.
- **6 herramientas, todas de solo lectura** (`readOnlyHint`):
  - `buscar_cliente`: nombre, cédula, póliza o teléfono; sin tildes y con o sin guiones.
  - `estado_cuenta`: pendiente = facturas + deuda anterior, igual que `pendTot()` de la app; facturas abiertas y últimos 5 pagos.
  - `quien_debe`: facturas abiertas de meses anteriores al actual (hora RD), por agente.
  - `cobros_del_dia`: pagos del día RD, sin anulados, eliminados, inactivos, reversados ni `deuda_anterior`, igual que `reconciliarPagosClientes()`.
  - `resumen_ciclo_agentes`: cifras oficiales de `seguros_resumen_ciclo_agente_core`, la misma que usa `seguros_resumen_ciclo_admin`, con el mismo criterio de elegibles. El período es el mes en que empieza el ciclo (20-oct → 20-nov = `2026-10`). Las transferencias no se suman al total.
  - `polizas_por_vencer`.
- Lo único que escribe es una fila en `auditoria` por consulta: `accion='MCP_CONSULTA'`, `origen='claude-mcp'`, `usuario='Dueño (vía Claude)'`.
- **No** cobra, no factura, no cambia datos, no manda WhatsApp. No hay migraciones.

## Seguridad
- La llave va en el enlace: `https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/nexus-mcp/<LLAVE>`.
- `<LLAVE>` es el Secret `NEXUS_MCP_LLAVE` de Supabase, que **el dueño escribe él mismo** en el panel (regla: los secretos no pasan por el chat). Debe tener **32 caracteres o más**; si no existe o es más corta, todo responde 401 y el conector queda apagado.
- La comparación es de tiempo constante y hay una espera de 400 ms ante una llave equivocada. El cuerpo admite como máximo 64 KB y el lote 20 mensajes.
- `verify_jwt=false` a propósito: la app de Claude no manda la sesión de Supabase; el candado es la llave.
- Apagar de inmediato: borrar o cambiar el Secret `NEXUS_MCP_LLAVE`.

## Pruebas
- `deno test scripts/qa-nexus-mcp.test.ts`: **6/6** (llave, initialize, notificación 202, ping, lista, las 6 herramientas, auditoría, fechas RD y ciclo 20→20, JSON roto y GET).
- `deno check` de `index.ts`: sin errores.
- `datos.ts` contra el simulador `qa-crm-mock-server.js`: buscar (por nombre y por dígitos), estado de cuenta, quién debe, cobros del día y pólizas responden bien. El ciclo no está en el simulador: se probó la RPC real en solo lectura con `execute_sql` (`2026-10`, ESTERLIN y ROBINSON devuelven cifras).

## Para ponerlo en vivo (cuando el dueño diga «publícalo»)
1. Desplegar la función `nexus-mcp` con `verify_jwt=false`. Sin el Secret queda apagada.
2. El dueño crea el Secret `NEXUS_MCP_LLAVE` en Supabase → Edge Functions → Secrets, con una frase larga suya de 32+ caracteres, sin espacios.
3. El dueño, en la app de Claude → Ajustes → Conectores → «Agregar conector personalizado», pega el enlace con su llave al final.
4. Primera prueba: «¿Cuánto debe Juan Minaya?».

## Riesgos
- Quien tenga el enlace completo puede consultar datos de clientes: no compartirlo. Si se filtra, cambiar el Secret.
- `quien_debe` usa el estado guardado de las facturas, que es una caché: si alguna está desincronizada (había 11 pendientes de resync), puede salir de más o de menos.
