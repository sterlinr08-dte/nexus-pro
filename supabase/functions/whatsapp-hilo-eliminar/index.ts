import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "whatsapp-inbox-media";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function jwtSub(req: Request): string | null {
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

function uuidOk(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function esAdminNexus(sub: string) {
  const { data: profile, error: ep } = await db
    .from("profiles")
    .select("rol,usuario_sistema_id,nom,activo")
    .eq("id", sub)
    .maybeSingle();
  if (ep || !profile || profile.rol !== "admin" || profile.activo === false || !profile.usuario_sistema_id) {
    return { ok: false as const, nombre: null, orgId: null };
  }

  const { data: us, error: eu } = await db
    .from("usuarios_sistema")
    .select("organizacion_id")
    .eq("id", profile.usuario_sistema_id)
    .maybeSingle();
  if (eu || !us?.organizacion_id) return { ok: false as const, nombre: null, orgId: null };

  const { data: org, error: eo } = await db
    .from("organizaciones")
    .select("id")
    .eq("slug", "nexus-pro")
    .maybeSingle();
  if (eo || !org?.id || org.id !== us.organizacion_id) {
    return { ok: false as const, nombre: null, orgId: null };
  }
  return { ok: true as const, nombre: profile.nom || "Administrador", orgId: org.id as string };
}

async function mediaPaths(hiloId: string): Promise<string[]> {
  const out: string[] = [];
  const page = 500;
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from("whatsapp_hilo_mensajes")
      .select("media_path")
      .eq("hilo_id", hiloId)
      .not("media_path", "is", null)
      .range(from, from + page - 1);
    if (error) throw error;
    const xs = (data || []).map((x: any) => String(x.media_path || "").trim()).filter(Boolean);
    out.push(...xs);
    if ((data || []).length < page) break;
  }
  return Array.from(new Set(out));
}

async function limpiarMedia(paths: string[]) {
  if (!paths.length) return { estado: "ok", error: null };
  let removidos = 0;
  const errores: string[] = [];
  for (let i = 0; i < paths.length; i += 100) {
    const lote = paths.slice(i, i + 100);
    const { data, error } = await db.storage.from(BUCKET).remove(lote);
    if (error) errores.push(error.message);
    else removidos += Array.isArray(data) ? data.length : lote.length;
  }
  if (!errores.length) return { estado: "ok", error: null };
  return {
    estado: removidos > 0 ? "parcial" : "error",
    error: errores.join(" | ").slice(0, 1000),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "metodo_no_permitido" }, 405);

  try {
    const sub = jwtSub(req);
    if (!sub) return json({ ok: false, error: "no_autorizado" }, 401);

    const acceso = await esAdminNexus(sub);
    if (!acceso.ok) return json({ ok: false, error: "solo_administrador" }, 403);

    let body: { hilo_id?: string; motivo?: string } = {};
    try { body = await req.json(); } catch { return json({ ok: false, error: "body_invalido" }, 400); }
    if (!uuidOk(body.hilo_id)) return json({ ok: false, error: "hilo_id_invalido" }, 400);
    const hiloId = body.hilo_id;
    const motivo = String(body.motivo || "").trim().slice(0, 500) || null;

    const { data: hilo, error: eh } = await db
      .from("whatsapp_hilos")
      .select("id,cliente_id,telefono_e164,nombre_perfil")
      .eq("id", hiloId)
      .maybeSingle();
    if (eh) throw eh;
    if (!hilo) return json({ ok: false, error: "chat_no_encontrado" }, 404);

    const [{ count: mensajesCount, error: ec }, paths] = await Promise.all([
      db.from("whatsapp_hilo_mensajes").select("id", { count: "exact", head: true }).eq("hilo_id", hiloId),
      mediaPaths(hiloId),
    ]);
    if (ec) throw ec;

    const { data: audit, error: ea } = await db
      .from("whatsapp_hilos_eliminaciones")
      .insert({
        organizacion_id: acceso.orgId,
        hilo_id: hilo.id,
        cliente_id: hilo.cliente_id || null,
        telefono_e164: hilo.telefono_e164,
        nombre_perfil: hilo.nombre_perfil || null,
        mensajes_count: mensajesCount || 0,
        media_count: paths.length,
        motivo,
        eliminado_por: sub,
        eliminado_por_nombre: acceso.nombre,
        media_cleanup_estado: "pendiente",
      })
      .select("id")
      .single();
    if (ea || !audit?.id) throw ea || new Error("no_se_pudo_crear_auditoria");

    const { error: ed } = await db.from("whatsapp_hilos").delete().eq("id", hiloId);
    if (ed) {
      await db.from("whatsapp_hilos_eliminaciones").delete().eq("id", audit.id);
      throw ed;
    }

    const cleanup = await limpiarMedia(paths);
    await db.from("whatsapp_hilos_eliminaciones").update({
      media_cleanup_estado: cleanup.estado,
      media_cleanup_error: cleanup.error,
    }).eq("id", audit.id);

    return json({
      ok: true,
      hilo_id: hiloId,
      mensajes_eliminados: mensajesCount || 0,
      archivos_detectados: paths.length,
      media_cleanup_estado: cleanup.estado,
    });
  } catch (e) {
    console.error("whatsapp-hilo-eliminar", e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: "error_interno" }, 500);
  }
});
