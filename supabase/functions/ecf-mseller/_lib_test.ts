// Pruebas de _lib.ts con un MSeller simulado. Uso: deno test supabase/functions/ecf-mseller/_lib_test.ts
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { crearCliente, entornoValido, leerJwt, MSellerError } from "./_lib.ts";

const jwt = (sub: string, exp: number) => "h." + btoa(JSON.stringify({ sub, exp })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") + ".f";
const resp = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function simulado(opts: { auth?: number; consulta?: number[] } = {}) {
  const log: { url: string; body: any; headers: Record<string, string> }[] = [];
  let nConsulta = 0, t = 1_000_000_000_000;
  const fetchFn = (async (u: string, init: RequestInit = {}) => {
    const body = init.body ? JSON.parse(String(init.body)) : null;
    log.push({ url: u, body, headers: (init.headers || {}) as Record<string, string> });
    if (u.endsWith("/customer/authentication")) {
      if (opts.auth && opts.auth !== 200) return resp(opts.auth, { error: "Incorrect username or password.", code: "AUTH_ERROR" });
      const exp = Math.floor(t / 1000) + 3600;
      return resp(200, body.refreshToken ? { idToken: jwt("sub-1", exp), accessToken: "a" } : { idToken: jwt("sub-1", exp), accessToken: "a", refreshToken: "r-1" });
    }
    const st = (opts.consulta || [404])[Math.min(nConsulta++, (opts.consulta || [404]).length - 1)];
    return resp(st, st === 404 ? { message: "No encontrado" } : st === 403 ? { message: "Forbidden" } : { status: "Aceptado" });
  }) as typeof fetch;
  return { log, fetchFn, ahora: () => t, avanzar: (ms: number) => { t += ms; } };
}
const cred = { email: "a@b.do", password: "x", apiKey: "k", entorno: "TesteCF" as const };

Deno.test("entorno: solo TesteCF, CerteCF o eCF; por defecto TesteCF", () => {
  assertEquals(entornoValido("eCF"), "eCF");
  assertEquals(entornoValido(""), "TesteCF");
  assertEquals(entornoValido("Produccion"), "TesteCF");
});

Deno.test("leerJwt saca el sub del payload Base64URL", () => {
  assertEquals(leerJwt(jwt("3f2a-9c1e", 99)).sub, "3f2a-9c1e");
});

Deno.test("probar: inicia sesión y consulta con Bearer + X-API-KEY en TesteCF; 404 = API key buena", async () => {
  const s = simulado();
  const r = await crearCliente(cred, s.fetchFn, s.ahora).probar();
  assertEquals(r.ok, true); assertEquals(r.apiKey, true); assertEquals(r.status, 404);
  assertEquals(s.log[0].url, "https://ecf.api.mseller.app/TesteCF/customer/authentication");
  assertEquals(s.log[0].body, { email: "a@b.do", password: "x" });
  assert(s.log[1].url.startsWith("https://ecf.api.mseller.app/TesteCF/documentos-ecf?ecf="));
  assert(s.log[1].headers.Authorization.startsWith("Bearer h."));
  assertEquals(s.log[1].headers["X-API-KEY"], "k");
});

Deno.test("probar: 403 = API key inválida", async () => {
  const s = simulado({ consulta: [403] });
  const r = await crearCliente(cred, s.fetchFn, s.ahora).probar();
  assertEquals(r.ok, false); assertEquals(r.apiKey, false); assertEquals(r.status, 403);
});

Deno.test("credenciales malas: MSellerError con el mensaje de MSeller", async () => {
  const s = simulado({ auth: 400 });
  const e = await assertRejects(() => crearCliente(cred, s.fetchFn, s.ahora).probar(), MSellerError);
  assertEquals(e.status, 400); assertEquals(e.codigo, "AUTH_ERROR");
});

Deno.test("reutiliza el token y lo renueva con refreshToken + sub al vencer (sin reenviar la contraseña)", async () => {
  const s = simulado();
  const c = crearCliente(cred, s.fetchFn, s.ahora);
  await c.consultar("E320000000001"); await c.consultar("E320000000002");
  assertEquals(s.log.filter((l) => l.url.endsWith("/authentication")).length, 1);
  s.avanzar(58 * 60_000);
  await c.consultar("E320000000003");
  const auths = s.log.filter((l) => l.url.endsWith("/authentication"));
  assertEquals(auths.length, 2);
  assertEquals(auths[1].body, { refreshToken: "r-1", username: "sub-1" });
});

Deno.test("401 en una llamada: renueva el token y reintenta una vez", async () => {
  const s = simulado({ consulta: [401, 200] });
  const r = await crearCliente(cred, s.fetchFn, s.ahora).consultar("E320000000001");
  assertEquals(r.status, 200);
  assertEquals(s.log.filter((l) => l.url.includes("documentos-ecf")).length, 2);
});

Deno.test("validar usa ?validate=true (no va a la DGII)", async () => {
  const s = simulado({ consulta: [200] });
  await crearCliente(cred, s.fetchFn, s.ahora).validar({ ECF: { Encabezado: {} } });
  const v = s.log.find((l) => l.url.includes("documentos-ecf"))!;
  assert(v.url.endsWith("/TesteCF/documentos-ecf?validate=true"));
  assertEquals(v.body, { ECF: { Encabezado: {} } });
});
