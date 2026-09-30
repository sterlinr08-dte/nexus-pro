// whatsapp-inbox-leer — lógica separada de Deno.serve para probarla con dobles.
// accion 'leer': no_leidos_count = 0 (service role) + POST /inbox/conversations/{conv}/read en
//   Zernio (✓✓ azul en el teléfono del cliente; no aplica en cuentas Coexistence).
// accion 'escribiendo': POST .../typing (hasta 25 s; Zernio exige un entrante reciente y marca ese
//   mensaje como leído como efecto secundario).
// Un fallo de Zernio nunca falla la respuesta: se responde ok:true con proveedor:false.

export type Db = { from(tabla: string): any };
export type Deps = { db: Db; zernioApiKey: string; fetchFn?: typeof fetch; ahora?: () => Date; timeoutMs?: number };
export type Body = { hilo_id?: string; accion?: "leer" | "escribiendo" };
export type Respuesta = { status: number; body: Record<string, unknown> };

export const ZERNIO_BASE = "https://zernio.com/api/v1";
// Ventana en la que Meta acepta referenciar el último entrante para el typing indicator.
export const VENTANA_TYPING_H = 24;

export function crearLector(deps: Deps) {
  const db = deps.db;
  const fetchFn = deps.fetchFn ?? fetch;
  const ahora = deps.ahora ?? (() => new Date());
  const timeoutMs = deps.timeoutMs ?? 8000;
  const respuesta = (body: Record<string, unknown>, status = 200): Respuesta => ({ status, body });

  async function autorizado(sub: string | null): Promise<boolean> {
    if (!sub) return false;
    const { data: profile } = await db.from("profiles").select("rol,usuario_sistema_id").eq("id", sub).maybeSingle();
    if (!profile?.rol || !profile.usuario_sistema_id) return false;
    const { data: usuario } = await db.from("usuarios_sistema").select("organizacion_id").eq("id", profile.usuario_sistema_id).maybeSingle();
    if (!usuario?.organizacion_id) return false;
    const { data: org } = await db.from("organizaciones").select("id").eq("slug", "nexus-pro").maybeSingle();
    return !!org?.id && org.id === usuario.organizacion_id;
  }

  async function zernio(conversationId: string, ruta: "read" | "typing", accountId: string): Promise<{ ok: boolean; status: number; data: any }> {
    try {
      const resp = await fetchFn(`${ZERNIO_BASE}/inbox/conversations/${encodeURIComponent(conversationId)}/${ruta}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${deps.zernioApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await resp.json().catch(() => null);
      const ok = resp.ok && data?.success !== false;
      if (!ok) console.error(`whatsapp-inbox-leer: Zernio ${ruta} respondio`, resp.status, JSON.stringify(data)?.slice(0, 300));
      return { ok, status: resp.status, data };
    } catch (e) {
      console.error(`whatsapp-inbox-leer: Zernio ${ruta} excepcion:`, e instanceof Error ? e.message : String(e));
      return { ok: false, status: 0, data: null };
    }
  }

  async function manejar(body: Body): Promise<Respuesta> {
    const hiloId = String(body.hilo_id || "").trim();
    const accion = body.accion === "escribiendo" ? "escribiendo" : body.accion === "leer" ? "leer" : null;
    if (!hiloId) return respuesta({ ok: false, error: "falta_hilo_id" }, 400);
    if (!accion) return respuesta({ ok: false, error: "accion_invalida" }, 400);

    const { data: hilo } = await db.from("whatsapp_hilos").select("id,telefono_e164,ultimo_inbound_at,no_leidos_count").eq("id", hiloId).maybeSingle();
    if (!hilo?.telefono_e164) return respuesta({ ok: false, error: "hilo_no_encontrado" }, 404);

    const horasDesdeInbound = hilo.ultimo_inbound_at ? (ahora().getTime() - new Date(hilo.ultimo_inbound_at).getTime()) / 3600000 : Infinity;

    if (accion === "leer") {
      const { error } = await db.from("whatsapp_hilos").update({ no_leidos_count: 0, updated_at: ahora().toISOString() }).eq("id", hiloId);
      if (error) console.error("whatsapp-inbox-leer: no se pudo poner no_leidos_count=0:", error.message);
      if (!hilo.ultimo_inbound_at) return respuesta({ ok: true, proveedor: false, motivo: "sin_inbound" });
    } else if (horasDesdeInbound > VENTANA_TYPING_H) {
      return respuesta({ ok: false, proveedor: false, motivo: "sin_inbound_reciente" });
    }

    const { data: config } = await db.from("whatsapp_config").select("zernio_account_id").eq("activo", true).limit(1).maybeSingle();
    if (!config?.zernio_account_id || !deps.zernioApiKey) return respuesta({ ok: accion === "leer", proveedor: false, motivo: "sin_configurar" });

    const conversationId = hilo.telefono_e164.startsWith("bsid:") ? hilo.telefono_e164.slice(5) : hilo.telefono_e164;
    const r = await zernio(conversationId, accion === "leer" ? "read" : "typing", config.zernio_account_id);
    if (accion === "leer") return respuesta({ ok: true, proveedor: r.ok, markedCount: r.ok ? (r.data?.markedCount ?? r.data?.data?.markedCount ?? null) : null });
    return respuesta({ ok: r.ok, proveedor: r.ok, ...(r.ok ? {} : { status: r.status || null }) });
  }

  return { autorizado, manejar };
}
