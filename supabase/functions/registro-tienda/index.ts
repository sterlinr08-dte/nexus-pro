import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// Registro público de TIENDAS (15-nov-2026). verify_jwt=false a propósito: lo usa la página nexusprord.com/registro.
// Decisiones del dueño: 14 días de prueba; cobro por transferencia que él activa; teléfono WhatsApp + su aprobación
// (la tienda funciona al instante; él ve los registros nuevos y puede suspender los falsos).
// Crea: organización (tipo tienda, activo_hasta = hoy + 14 días, origen web, aprobado=false), su administrador
// (usuarios_sistema + Auth + profiles) y la deja lista para vender (pos_sembrar_tienda). Devuelve la sesión.
// El correo interno es usuario@<empresa>.nexus-pro.local: dos tiendas pueden tener el mismo usuario.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ORIGENES = ["https://nexusprord.com", "https://www.nexusprord.com"];
const DIAS_PRUEBA = 14;
const MAX_POR_IP_DIA = 3;
const MAX_TOTAL_DIA = 40;
const RESERVADOS = new Set(["nexus-pro", "nexuspro", "nexus", "demo", "admin", "www", "api", "app", "registro", "studio", "bayolcell", "bayolsale",
  "bayolcell-rifa", "deluxe", "amatista", "geriatra", "soporte", "ayuda", "login", "root", "superadmin", "test", "prueba"]);

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGENES.includes(o) ? o : ORIGENES[0], "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}
export function slugDe(nombre: string): string {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30).replace(/-+$/g, "");
}
export function telRD(t: string): string | null {
  const d = t.replace(/\D/g, "");
  const n = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return /^(809|829|849)\d{7}$/.test(n) ? n : null;
}
async function sha(s: string) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, "Content-Type": "application/json", "Cache-Control": "no-store" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const negocio = String(b.negocio ?? "").trim().replace(/\s+/g, " ");
  const nombre = String(b.nombre ?? "").trim().replace(/\s+/g, " ");
  const tel = telRD(String(b.telefono ?? ""));
  const usuario = String(b.usuario ?? "").trim().toLowerCase();
  const clave = String(b.clave ?? "");
  if (negocio.length < 3 || negocio.length > 60) return json({ ok: false, campo: "negocio", error: "Escriba el nombre del negocio (3 a 60 letras)." }, 400);
  if (nombre.length < 3 || nombre.length > 60) return json({ ok: false, campo: "nombre", error: "Escriba su nombre." }, 400);
  if (!tel) return json({ ok: false, campo: "telefono", error: "Escriba un WhatsApp de RD (809, 829 u 849)." }, 400);
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return json({ ok: false, campo: "usuario", error: "Usuario de 3 a 30 letras o números, sin espacios." }, 400);
  if (clave.length < 8 || clave.length > 72) return json({ ok: false, campo: "clave", error: "La clave debe tener al menos 8 caracteres." }, 400);

  // Límite de intentos: por IP y total del día.
  const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ipHash = await sha("nx-registro|" + ip);
  const desde = new Date(Date.now() - 86400000).toISOString();
  const [{ count: nIp }, { count: nTot }] = await Promise.all([
    db.from("registro_intentos").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("creado", desde),
    db.from("registro_intentos").select("id", { count: "exact", head: true }).eq("ok", true).gte("creado", desde),
  ]);
  if ((nIp ?? 0) >= MAX_POR_IP_DIA) return json({ ok: false, error: "Demasiados intentos desde esta conexión. Intente mañana o escríbanos por WhatsApp." }, 429);
  if ((nTot ?? 0) >= MAX_TOTAL_DIA) return json({ ok: false, error: "Hoy no se pueden crear más tiendas. Intente mañana." }, 429);
  await db.from("registro_intentos").insert({ ip_hash: ipHash, ok: false });

  // Dirección única de la empresa.
  let base = slugDe(negocio);
  if (base.length < 3) base = "tienda";
  let slug = base, n = 1;
  for (;;) {
    if (!RESERVADOS.has(slug) && !/^nexus/.test(slug)) {
      const { data: ya } = await db.from("organizaciones").select("id").eq("slug", slug).maybeSingle();
      if (!ya) break;
    }
    n++; slug = (base.slice(0, 26) + "-" + n);
    if (n > 50) return json({ ok: false, error: "No se pudo crear la dirección de la tienda. Pruebe otro nombre." }, 409);
  }
  const dominioMail = "@" + slug + ".nexus-pro.local";
  const email = usuario + dominioMail;
  const hasta = new Date(Date.now() + DIAS_PRUEBA * 86400000).toISOString();

  let orgId: string | null = null, usId: string | null = null, authId: string | null = null;
  const deshacer = async () => {
    try { if (authId) await db.auth.admin.deleteUser(authId); } catch (_e) { /* sigue */ }
    try { if (authId) await db.from("profiles").delete().eq("id", authId); } catch (_e) { /* sigue */ }
    try { if (usId) await db.from("usuarios_sistema").delete().eq("id", usId); } catch (_e) { /* sigue */ }
    try { if (orgId) { for (const t of ["pos_cuentas", "pos_secuencias", "pos_almacenes", "pos_config"]) await db.from(t).delete().eq("organizacion_id", orgId); await db.from("organizaciones").delete().eq("id", orgId); } } catch (_e) { /* sigue */ }
  };
  try {
    const { data: org, error: e1 } = await db.from("organizaciones").insert({
      slug, nombre: negocio, tipo: "tienda", color: "#1d4ed8", activo: true, activo_hasta: hasta,
      email_dominio: dominioMail, contacto_nombre: nombre, contacto_tel: tel, origen: "web", aprobado: false,
    }).select("id").single();
    if (e1 || !org) throw new Error("org");
    orgId = org.id;
    const { data: us, error: e2 } = await db.from("usuarios_sistema").insert({
      nom: nombre.toUpperCase(), cargo: "Dueño", login: usuario, rol: "admin", activo: true, organizacion_id: orgId, es_superadmin: false, creado_por: "registro-web",
    }).select("id").single();
    if (e2 || !us) throw new Error("usuario");
    usId = us.id;
    const { data: au, error: e3 } = await db.auth.admin.createUser({ email, password: clave, email_confirm: true });
    if (e3 || !au?.user) throw new Error("auth");
    authId = au.user.id;
    const { error: e4 } = await db.from("profiles").insert({ id: authId, usuario_sistema_id: usId, login: usuario, nom: nombre.toUpperCase(), rol: "admin", activo: true, must_change_password: false });
    if (e4) throw new Error("perfil");
    const { error: e5 } = await db.rpc("pos_sembrar_tienda", { p_org: orgId });
    if (e5) throw new Error("siembra");
    await db.from("registro_intentos").update({ ok: true }).eq("ip_hash", ipHash).eq("ok", false).gte("creado", desde);
  } catch (e) {
    await deshacer();
    console.error("registro-tienda", e instanceof Error ? e.message : String(e));
    return json({ ok: false, error: "No se pudo crear la tienda. Intente de nuevo." }, 500);
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: ses } = await anon.auth.signInWithPassword({ email, password: clave });
  return json({ ok: true, slug, entrar: usuario + "@" + slug, prueba_hasta: hasta,
    access_token: ses?.session?.access_token || null, refresh_token: ses?.session?.refresh_token || null, expires_in: ses?.session?.expires_in || 3600 });
});
