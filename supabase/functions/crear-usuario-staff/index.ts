import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Crea un usuario de STAFF del POS (cajero/vendedor/gerente) en la MISMA organización
// del que llama. Solo un ADMIN logueado puede llamar (verify_jwt + chequeo de rol).
// 15-nov-2026 (registro web): esta fuente no estaba en el repositorio; se copió de la versión desplegada (v16) y se
// cambió solo esto: si la empresa tiene `email_dominio` y no tiene app propia (`dominio`), el correo interno es
// usuario + email_dominio y el usuario es único DENTRO de la empresa (dos tiendas pueden tener «maria»).
// Sin `email_dominio`, todo queda como antes (usuario@nexus-pro.local, único en todo el sistema).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    // Identificar al que llama con SU token
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) return Response.json({ error: "No autorizado" }, { status: 401, headers: CORS });

    const { data: perfil } = await admin.from("profiles").select("rol, usuario_sistema_id").eq("id", caller.user.id).single();
    if (!perfil || perfil.rol !== "admin") return Response.json({ error: "Solo el administrador puede crear usuarios" }, { status: 403, headers: CORS });
    const { data: us } = await admin.from("usuarios_sistema").select("organizacion_id").eq("id", perfil.usuario_sistema_id).single();
    const orgId = us?.organizacion_id;
    if (!orgId) return Response.json({ error: "El administrador no tiene organización" }, { status: 400, headers: CORS });
    const { data: org } = await admin.from("organizaciones").select("email_dominio,dominio,activo,activo_hasta").eq("id", orgId).single();
    if (!org || org.activo === false || (org.activo_hasta && new Date(org.activo_hasta).getTime() < Date.now())) {
      return Response.json({ error: "La empresa está suspendida" }, { status: 403, headers: CORS });
    }
    const porEmpresa = !!(org.email_dominio && !org.dominio);

    const { nombre, login, clave, rol, almacen_id } = await req.json();
    const lg = String(login || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!nombre || !lg || !clave) return Response.json({ error: "Faltan nombre, usuario o clave" }, { status: 400, headers: CORS });
    if (String(clave).length < 6) return Response.json({ error: "La clave debe tener al menos 6 caracteres" }, { status: 400, headers: CORS });
    const rolStaff = ["gerente", "cajero", "vendedor", "admin"].includes(rol) ? rol : "cajero";

    // login único (en la empresa si tiene dominio propio de correo; si no, en todo el sistema)
    let q = admin.from("usuarios_sistema").select("id").eq("login", lg);
    if (porEmpresa) q = q.eq("organizacion_id", orgId);
    const { data: existe } = await q.limit(1);
    if (existe && existe.length) return Response.json({ error: "Ese usuario ya existe, elige otro" }, { status: 409, headers: CORS });

    // 1) auth.users (correo sintético, confirmado)
    const email = lg + (porEmpresa ? String(org.email_dominio) : "@nexus-pro.local");
    const { data: nuevo, error: eAuth } = await admin.auth.admin.createUser({ email, password: String(clave), email_confirm: true });
    if (eAuth || !nuevo?.user) return Response.json({ error: "Auth: " + (eAuth?.message || "no se pudo crear") }, { status: 500, headers: CORS });

    // 2) usuarios_sistema (con su organización y su ALMACÉN)
    const { data: usNuevo, error: eUs } = await admin.from("usuarios_sistema")
      .insert({ nom: String(nombre).toUpperCase(), cargo: rolStaff, login: lg, rol: rolStaff, activo: true, organizacion_id: orgId, almacen_id: almacen_id || null })
      .select().single();
    if (eUs) { await admin.auth.admin.deleteUser(nuevo.user.id); return Response.json({ error: "usuarios_sistema: " + eUs.message }, { status: 500, headers: CORS }); }

    // 3) profiles (liga auth ↔ usuario; la sesión se arma de aquí)
    const { error: eProf } = await admin.from("profiles")
      .insert({ id: nuevo.user.id, usuario_sistema_id: usNuevo.id, login: lg, nom: String(nombre).toUpperCase(), rol: rolStaff, activo: true, must_change_password: false });
    if (eProf) { await admin.auth.admin.deleteUser(nuevo.user.id); await admin.from("usuarios_sistema").delete().eq("id", usNuevo.id); return Response.json({ error: "profiles: " + eProf.message }, { status: 500, headers: CORS }); }

    return Response.json({ ok: true, login: lg, rol: rolStaff, entrar: porEmpresa ? lg + "@" + String(org.email_dominio).slice(1).replace(/\.nexus-pro\.local$/, "") : lg }, { headers: CORS });
  } catch (e) {
    return Response.json({ error: String((e as Error)?.message || e) }, { status: 500, headers: CORS });
  }
});
