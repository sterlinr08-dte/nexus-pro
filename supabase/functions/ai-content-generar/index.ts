// RETIRADA el 15-nov-2026 (auditoría de seguridad previa a la demo pública).
// Aceptaba a cualquiera que tuviera la llave pública del sistema y gastaba el saldo de IA, y ninguna pantalla
// de NEXUS PRO la llama. La versión anterior (generador de contenido) queda en el historial de Supabase.
// Si se vuelve a necesitar: exigir sesión (auth.getUser), rol admin y empresa autorizada antes de llamar a la IA.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  return new Response(JSON.stringify({ ok: false, error: "Función retirada." }), { status: 410, headers: { ...CORS, "Content-Type": "application/json" } });
});
