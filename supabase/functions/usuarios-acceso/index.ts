import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

// Usuarios de la pantalla Configuración → Usuarios, con su ACCESO real.
// Antes esa pantalla solo escribía usuarios_sistema (y un hash viejo de clave),
// así que el empleado nuevo no podía entrar: el login usa Supabase Auth + profiles.
// Aquí se hacen las tres cosas juntas y se mantienen sincronizadas
// (rol, activo, usuario y clave). Solo un ADMIN activo, y solo dentro de SU organización.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ROLES = ["admin", "supervisor", "cajero", "agente", "cobros"];
const DOMINIO = "@nexus-pro.local";
const BLOQUEO = "876000h"; // ~100 años: usuario inactivo no puede iniciar sesión

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
const fallo = (error: string, status = 400) => json({ error }, status);

function uuidOk(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
function limpiarLogin(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}
function loginOk(lg: string) {
  return /^[a-z0-9._-]{3,40}$/.test(lg);
}
function claveOk(c: unknown) {
  return typeof c === "string" && c.length >= 6 && c.length <= 72;
}

type Admin = { authId: string; usuarioId: string; orgId: string; nombre: string };

async function adminQueLlama(req: Request): Promise<Admin | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: u, error } = await db.auth.getUser(token);
  if (error || !u?.user) return null;
  const { data: p } = await db.from("profiles").select("rol,activo,usuario_sistema_id,nom").eq("id", u.user.id).maybeSingle();
  if (!p || p.rol !== "admin" || p.activo === false || !p.usuario_sistema_id) return null;
  const { data: us } = await db.from("usuarios_sistema").select("organizacion_id,activo").eq("id", p.usuario_sistema_id).maybeSingle();
  if (!us?.organizacion_id || us.activo === false) return null;
  return { authId: u.user.id, usuarioId: p.usuario_sistema_id, orgId: us.organizacion_id, nombre: p.nom || "Administrador" };
}

// Usuario de la MISMA organización del admin (nunca de otra).
async function usuarioDeMiOrg(adm: Admin, id: unknown) {
  if (!uuidOk(id)) return null;
  const { data } = await db.from("usuarios_sistema").select("id,nom,login,rol,activo,organizacion_id,es_superadmin").eq("id", id).maybeSingle();
  if (!data || data.organizacion_id !== adm.orgId) return null;
  return data;
}
async function perfilDe(usuarioId: string) {
  const { data } = await db.from("profiles").select("id,rol,activo,login").eq("usuario_sistema_id", usuarioId).maybeSingle();
  return data;
}

async function crearAuthYPerfil(us: { id: string; nom: string; login: string; rol: string; activo: boolean }, clave: string) {
  const { data: nuevo, error: eAuth } = await db.auth.admin.createUser({
    email: us.login + DOMINIO,
    password: clave,
    email_confirm: true,
    ...(us.activo === false ? { ban_duration: BLOQUEO } : {}),
  });
  if (eAuth || !nuevo?.user) {
    const m = String(eAuth?.message || "");
    if (/already|registered|exists/i.test(m)) return { error: "Ya existe un acceso con ese usuario. Cámbiale el usuario o avisa a soporte." };
    return { error: "No se pudo crear el acceso: " + (m || "error desconocido") };
  }
  const { error: eProf } = await db.from("profiles").insert({
    id: nuevo.user.id,
    usuario_sistema_id: us.id,
    login: us.login,
    nom: us.nom,
    rol: us.rol,
    activo: us.activo !== false,
    must_change_password: false,
  });
  if (eProf) {
    await db.auth.admin.deleteUser(nuevo.user.id);
    return { error: "No se pudo crear el perfil: " + eProf.message };
  }
  return { authId: nuevo.user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fallo("Método no permitido", 405);
  try {
    const adm = await adminQueLlama(req);
    if (!adm) return fallo("Solo un administrador activo puede gestionar usuarios", 403);
    const body = await req.json().catch(() => ({}));
    const accion = String(body?.accion || "");

    // ── Estado de acceso de cada usuario de la organización ──
    if (accion === "lista") {
      const { data: us } = await db.from("usuarios_sistema").select("id").eq("organizacion_id", adm.orgId);
      const ids = (us || []).map((u) => u.id);
      if (!ids.length) return json({ ok: true, usuarios: [] });
      const { data: perfiles } = await db.from("profiles").select("id,usuario_sistema_id").in("usuario_sistema_id", ids);
      const out = [];
      for (const p of perfiles || []) {
        const { data: au } = await db.auth.admin.getUserById(p.id);
        out.push({ usuario_id: p.usuario_sistema_id, con_acceso: !!au?.user, ultimo_ingreso: au?.user?.last_sign_in_at || null });
      }
      return json({ ok: true, usuarios: out });
    }

    // ── Empleado nuevo: usuario + acceso + perfil, todo junto ──
    if (accion === "crear") {
      const nom = String(body?.nombre || "").trim().toUpperCase();
      const cargo = String(body?.cargo || "").trim();
      const lg = limpiarLogin(body?.login);
      const rol = String(body?.rol || "");
      if (!nom) return fallo("Escribe el nombre");
      if (!loginOk(lg)) return fallo("El usuario debe tener de 3 a 40 letras o números, sin espacios");
      if (!claveOk(body?.clave)) return fallo("La contraseña debe tener al menos 6 caracteres");
      if (!ROLES.includes(rol)) return fallo("Rol no válido");
      const { data: existe } = await db.from("usuarios_sistema").select("id").eq("login", lg).limit(1);
      if (existe && existe.length) return fallo("Ese usuario ya existe, elige otro", 409);
      const { data: usNuevo, error: eUs } = await db.from("usuarios_sistema")
        .insert({ nom, cargo: cargo || null, login: lg, rol, activo: true, organizacion_id: adm.orgId, creado_por: adm.usuarioId })
        .select("id,nom,login,rol,activo,cargo,organizacion_id,created_at").single();
      if (eUs || !usNuevo) return fallo("No se pudo guardar el usuario: " + (eUs?.message || ""), 500);
      const r = await crearAuthYPerfil(usNuevo, String(body.clave));
      if ("error" in r) {
        await db.from("usuarios_sistema").delete().eq("id", usNuevo.id);
        return fallo(r.error as string, 500);
      }
      return json({ ok: true, usuario: usNuevo });
    }

    // Todas las demás acciones son sobre un usuario existente de MI organización.
    const us = await usuarioDeMiOrg(adm, body?.usuario_id);
    if (!us) return fallo("Usuario no encontrado en tu organización", 404);
    const esYo = us.id === adm.usuarioId;
    // La cuenta del superadministrador solo la toca él mismo.
    if (us.es_superadmin && !esYo) return fallo("La cuenta del superadministrador no se puede modificar desde aquí", 403);
    const perfil = await perfilDe(us.id);

    // ── Usuario creado a medias (sin acceso): ponerle clave y completarlo ──
    if (accion === "crear_acceso") {
      if (perfil) return fallo("Este usuario ya tiene acceso. Usa «Cambiar contraseña».", 409);
      if (!claveOk(body?.clave)) return fallo("La contraseña debe tener al menos 6 caracteres");
      const lg = limpiarLogin(us.login);
      if (!loginOk(lg)) return fallo("Su usuario tiene espacios o letras raras: cámbialo primero");
      if (lg !== us.login) await db.from("usuarios_sistema").update({ login: lg }).eq("id", us.id);
      const r = await crearAuthYPerfil({ ...us, login: lg }, String(body.clave));
      if ("error" in r) return fallo(r.error as string, 500);
      // La clave vieja (hash sin sal) deja de servir: una sola contraseña.
      await db.from("usuarios_sistema").update({ pwd: null, actualizado_por: adm.usuarioId, updated_at: new Date().toISOString() }).eq("id", us.id);
      return json({ ok: true });
    }

    if (accion === "clave") {
      if (!perfil) return fallo("Este usuario todavía no tiene acceso. Usa «Crear acceso».", 409);
      if (!claveOk(body?.clave)) return fallo("La contraseña debe tener al menos 6 caracteres");
      const { error } = await db.auth.admin.updateUserById(perfil.id, { password: String(body.clave) });
      if (error) return fallo("No se pudo cambiar la contraseña: " + error.message, 500);
      await db.from("usuarios_sistema").update({ pwd: null, actualizado_por: adm.usuarioId, updated_at: new Date().toISOString() }).eq("id", us.id);
      return json({ ok: true });
    }

    if (accion === "rol") {
      const rol = String(body?.rol || "");
      if (!ROLES.includes(rol)) return fallo("Rol no válido");
      if (esYo && rol !== "admin") return fallo("No puedes quitarte a ti mismo el rol de administrador");
      const { error } = await db.from("usuarios_sistema").update({ rol, actualizado_por: adm.usuarioId, updated_at: new Date().toISOString() }).eq("id", us.id);
      if (error) return fallo("No se pudo cambiar el rol: " + error.message, 500);
      if (perfil) await db.from("profiles").update({ rol }).eq("id", perfil.id);
      return json({ ok: true });
    }

    if (accion === "estado") {
      const activo = body?.activo === true;
      if (esYo && !activo) return fallo("No puedes desactivarte a ti mismo");
      const { error } = await db.from("usuarios_sistema").update({ activo, actualizado_por: adm.usuarioId, updated_at: new Date().toISOString() }).eq("id", us.id);
      if (error) return fallo("No se pudo cambiar el estado: " + error.message, 500);
      if (perfil) {
        await db.from("profiles").update({ activo }).eq("id", perfil.id);
        await db.auth.admin.updateUserById(perfil.id, { ban_duration: activo ? "none" : BLOQUEO });
      }
      return json({ ok: true });
    }

    if (accion === "login") {
      const lg = limpiarLogin(body?.login);
      if (!loginOk(lg)) return fallo("El usuario debe tener de 3 a 40 letras o números, sin espacios");
      if (lg === us.login) return json({ ok: true });
      const { data: existe } = await db.from("usuarios_sistema").select("id").eq("login", lg).neq("id", us.id).limit(1);
      if (existe && existe.length) return fallo("Ese usuario ya existe, elige otro", 409);
      if (perfil) {
        const { error: eA } = await db.auth.admin.updateUserById(perfil.id, { email: lg + DOMINIO, email_confirm: true });
        if (eA) return fallo("No se pudo cambiar el usuario: " + eA.message, 500);
        await db.from("profiles").update({ login: lg }).eq("id", perfil.id);
      }
      const { error } = await db.from("usuarios_sistema").update({ login: lg, actualizado_por: adm.usuarioId, updated_at: new Date().toISOString() }).eq("id", us.id);
      if (error) return fallo("No se pudo cambiar el usuario: " + error.message, 500);
      return json({ ok: true });
    }

    if (accion === "eliminar") {
      if (esYo) return fallo("No puedes eliminarte a ti mismo");
      // Con historial (por ejemplo, pagos que validó) no se borra: se pone Inactivo.
      const { count } = await db.from("abonos").select("id", { count: "exact", head: true }).eq("validado_por_user_id", us.id);
      if ((count || 0) > 0) return fallo("Este usuario tiene historial en el sistema y no se puede borrar. Ponlo «Inactivo».", 409);
      // Primero el acceso (borra también su perfil por cascade), luego el usuario.
      if (perfil) {
        const { error: eA } = await db.auth.admin.deleteUser(perfil.id);
        if (eA) return fallo("No se pudo quitar el acceso: " + eA.message, 500);
      }
      const { error } = await db.from("usuarios_sistema").delete().eq("id", us.id);
      if (error) return fallo("Se le quitó el acceso, pero el usuario tiene historial y no se pudo borrar. Ponlo «Inactivo».", 409);
      return json({ ok: true });
    }

    return fallo("Acción no válida");
  } catch (e) {
    return fallo(String((e as Error)?.message || e), 500);
  }
});
