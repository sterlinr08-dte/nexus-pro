// NEXUS PRO · Conector personal para Claude (MCP) — etapa 1, SOLO CONSULTAR (06-nov-2026).
// Enlace para la app de Claude (Ajustes → Conectores → Agregar conector personalizado):
//   https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/nexus-mcp/<LLAVE>
// <LLAVE> = el Secret NEXUS_MCP_LLAVE de Supabase (mínimo 32 caracteres), que el DUEÑO escribe él mismo en el panel.
// Sin ese Secret (o con uno corto) el conector responde 401 a todo: queda apagado.
// verify_jwt = false a propósito: la app de Claude no manda la sesión de Supabase; el candado es la llave del enlace.
// Para apagarlo de inmediato: borrar o cambiar el Secret NEXUS_MCP_LLAVE.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";
import { manejarHttp } from "./mcp.ts";
import { crearConsultas } from "./datos.ts";

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  const llave = (Deno.env.get('NEXUS_MCP_LLAVE') || '').trim();
  try {
    return await manejarHttp(req, llave, crearConsultas(db));
  } catch (e) {
    console.error('[nexus-mcp]', (e as Error)?.message || e);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Error interno' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
