import { assertEquals } from "jsr:@std/assert@1";
import { crearFakeDb, crearFakeFetch, respuestaJson, todas, ultima, type Llamada, type Ruta } from "../_shared/pruebas/fake_db.ts";
import { crearLector } from "./_lib.ts";

const AHORA = new Date("2026-09-30T12:00:00Z");
const HILO = { id: "hilo-1", telefono_e164: "18095551234", ultimo_inbound_at: "2026-09-30T11:00:00Z", no_leidos_count: 2 };

function armar(rutas: Ruta[], hilo: any = HILO, apiKey = "k") {
  const { db, llamadas } = crearFakeDb((l: Llamada) => {
    if (l.tabla === "whatsapp_hilos" && l.op === "select") return { data: hilo };
    if (l.tabla === "whatsapp_config") return { data: { zernio_account_id: "acc_1" } };
    if (l.tabla === "profiles") return { data: { rol: "agente", usuario_sistema_id: "us-1" } };
    if (l.tabla === "usuarios_sistema") return { data: { organizacion_id: "org-1" } };
    if (l.tabla === "organizaciones") return { data: { id: "org-1" } };
    return {};
  });
  const { fetchFn, peticiones } = crearFakeFetch(rutas);
  return { lector: crearLector({ db, fetchFn, zernioApiKey: apiKey, ahora: () => AHORA, timeoutMs: 1000 }), llamadas, peticiones };
}

Deno.test("leer: pone no_leidos_count=0 y llama al endpoint read de Zernio", async () => {
  const { lector, llamadas, peticiones } = armar([{ metodo: "POST", url: "/inbox/conversations/18095551234/read", responder: () => respuestaJson({ success: true, markedCount: 2 }) }]);
  const r = await lector.manejar({ hilo_id: "hilo-1", accion: "leer" });
  assertEquals(r.status, 200);
  assertEquals(r.body, { ok: true, proveedor: true, markedCount: 2 });
  const u = ultima(llamadas, "whatsapp_hilos", "update")!;
  assertEquals(u.datos.no_leidos_count, 0);
  assertEquals(peticiones[0].body, { accountId: "acc_1" });
  assertEquals(peticiones[0].headers.authorization, "Bearer k");
});

Deno.test("leer: tolera 4xx/5xx y excepciones de Zernio (ok:true, proveedor:false)", async () => {
  const { lector, llamadas } = armar([{ metodo: "POST", url: "/read", responder: () => respuestaJson({ success: false, error: "coexistence" }, 400) }]);
  const r = await lector.manejar({ hilo_id: "hilo-1", accion: "leer" });
  assertEquals(r.status, 200);
  assertEquals(r.body, { ok: true, proveedor: false, markedCount: null });
  assertEquals(todas(llamadas, "whatsapp_hilos", "update").length, 1);
  const { lector: l2 } = armar([{ metodo: "POST", url: "/read", responder: () => { throw new Error("red caida"); } }]);
  assertEquals((await l2.manejar({ hilo_id: "hilo-1", accion: "leer" })).body, { ok: true, proveedor: false, markedCount: null });
});

Deno.test("leer: sin inbound marca local y no llama a Zernio; sin API key tampoco", async () => {
  const { lector, peticiones, llamadas } = armar([], { ...HILO, ultimo_inbound_at: null });
  const r = await lector.manejar({ hilo_id: "hilo-1", accion: "leer" });
  assertEquals(r.body, { ok: true, proveedor: false, motivo: "sin_inbound" });
  assertEquals(peticiones.length, 0);
  assertEquals(todas(llamadas, "whatsapp_hilos", "update").length, 1);
  const { lector: l2, peticiones: p2 } = armar([], HILO, "");
  assertEquals((await l2.manejar({ hilo_id: "hilo-1", accion: "leer" })).body, { ok: true, proveedor: false, motivo: "sin_configurar" });
  assertEquals(p2.length, 0);
});

Deno.test("escribiendo: llama a typing solo con inbound reciente; 4xx devuelve ok:false sin lanzar", async () => {
  const { lector, peticiones, llamadas } = armar([{ metodo: "POST", url: "/inbox/conversations/18095551234/typing", responder: () => respuestaJson({ success: true }) }]);
  const r = await lector.manejar({ hilo_id: "hilo-1", accion: "escribiendo" });
  assertEquals(r.body, { ok: true, proveedor: true });
  assertEquals(peticiones.length, 1);
  assertEquals(todas(llamadas, "whatsapp_hilos", "update").length, 0, "typing no toca contadores");

  const { lector: l2, peticiones: p2 } = armar([], { ...HILO, ultimo_inbound_at: "2026-09-28T11:00:00Z" });
  assertEquals((await l2.manejar({ hilo_id: "hilo-1", accion: "escribiendo" })).body, { ok: false, proveedor: false, motivo: "sin_inbound_reciente" });
  assertEquals(p2.length, 0);

  const { lector: l3 } = armar([{ metodo: "POST", url: "/typing", responder: () => respuestaJson({ success: false }, 422) }]);
  const r3 = await l3.manejar({ hilo_id: "hilo-1", accion: "escribiendo" });
  assertEquals(r3.status, 200);
  assertEquals(r3.body, { ok: false, proveedor: false, status: 422 });
});

Deno.test("validaciones: hilo_id, accion, hilo inexistente, bsid", async () => {
  const { lector } = armar([]);
  assertEquals((await lector.manejar({ accion: "leer" })).status, 400);
  assertEquals((await lector.manejar({ hilo_id: "h", accion: "x" as any })).status, 400);
  const { lector: l2 } = armar([], null);
  assertEquals((await l2.manejar({ hilo_id: "h", accion: "leer" })).status, 404);
  const { lector: l3, peticiones } = armar([{ metodo: "POST", url: "/inbox/conversations/abc123/read", responder: () => respuestaJson({ success: true, markedCount: 0 }) }], { ...HILO, telefono_e164: "bsid:abc123" });
  assertEquals((await l3.manejar({ hilo_id: "h", accion: "leer" })).body.proveedor, true);
  assertEquals(peticiones.length, 1);
});

Deno.test("autorizado exige org nexus-pro", async () => {
  const { lector } = armar([]);
  assertEquals(await lector.autorizado("sub-1"), true);
  assertEquals(await lector.autorizado(null), false);
});
