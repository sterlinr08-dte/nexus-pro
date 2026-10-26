// Cliente de la API e-CF de MSeller (https://docs.ecf.mseller.app). Separado de Deno.serve para probarlo con un fetch simulado.
// Autenticación (docs «Autenticación API»): POST /{entorno}/customer/authentication con {email,password} → idToken (60 min)
// + refreshToken (30 días). Cada llamada lleva «Authorization: Bearer {idToken}» y «X-API-KEY». El token se reutiliza y se
// renueva con {refreshToken, username: sub del idToken}; autenticarse en cada llamada gasta cuota.

export const ENTORNOS = ["TesteCF", "CerteCF", "eCF"] as const;
export type Entorno = typeof ENTORNOS[number];
export const BASE = "https://ecf.api.mseller.app";

export type Credenciales = { email: string; password: string; apiKey: string; entorno: Entorno };
type Token = { idToken: string; refreshToken: string; sub: string; vence: number };

export function entornoValido(v: unknown): Entorno {
  const e = String(v || "").trim();
  return (ENTORNOS as readonly string[]).includes(e) ? (e as Entorno) : "TesteCF";
}

// sub del JWT (payload en Base64URL). No hace falta validar la firma: MSeller la valida al renovar.
export function leerJwt(idToken: string): { sub: string; exp: number } {
  const parte = (idToken.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  const relleno = parte + "=".repeat((4 - (parte.length % 4)) % 4);
  const p = JSON.parse(atob(relleno));
  return { sub: String(p.sub || p["cognito:username"] || ""), exp: Number(p.exp || 0) };
}

export class MSellerError extends Error {
  constructor(public status: number, public codigo: string, mensaje: string) { super(mensaje); }
}

export function crearCliente(cred: Credenciales, fetchFn: typeof fetch = fetch, ahora: () => number = Date.now) {
  let tok: Token | null = null;
  const url = (ruta: string) => `${BASE}/${cred.entorno}${ruta}`;

  async function leerCuerpo(r: Response) {
    const t = await r.text();
    try { return t ? JSON.parse(t) : null; } catch { return { mensaje: t.slice(0, 300) }; }
  }

  async function pedirToken(cuerpo: Record<string, string>): Promise<{ idToken: string; refreshToken?: string }> {
    const r = await fetchFn(url("/customer/authentication"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const d = await leerCuerpo(r);
    if (!r.ok || !d?.idToken) throw new MSellerError(r.status, d?.code || "AUTH_ERROR", d?.error || d?.message || `No se pudo iniciar sesión en MSeller (${r.status})`);
    return d;
  }

  async function token(): Promise<string> {
    const margen = 5 * 60_000;
    if (tok && tok.vence - margen > ahora()) return tok.idToken;
    if (tok?.refreshToken && tok.sub) {
      try {
        const d = await pedirToken({ refreshToken: tok.refreshToken, username: tok.sub });
        const j = leerJwt(d.idToken);
        tok = { ...tok, idToken: d.idToken, vence: j.exp ? j.exp * 1000 : ahora() + 55 * 60_000 };
        return tok.idToken;
      } catch { tok = null; } // refreshToken vencido (30 días): se vuelve a entrar con email y contraseña
    }
    const d = await pedirToken({ email: cred.email, password: cred.password });
    const j = leerJwt(d.idToken);
    tok = { idToken: d.idToken, refreshToken: d.refreshToken || "", sub: j.sub, vence: j.exp ? j.exp * 1000 : ahora() + 55 * 60_000 };
    return tok.idToken;
  }

  async function llamar(metodo: "GET" | "POST", ruta: string, cuerpo?: unknown) {
    const hacer = async () => fetchFn(url(ruta), {
      method: metodo,
      headers: { Authorization: `Bearer ${await token()}`, "X-API-KEY": cred.apiKey, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    let r = await hacer();
    if (r.status === 401) { tok = tok ? { ...tok, vence: 0 } : null; r = await hacer(); } // token vencido: se renueva una vez
    return { status: r.status, datos: await leerCuerpo(r) };
  }

  return {
    entorno: cred.entorno,
    // Solo lectura: inicia sesión y consulta un e-NCF que no existe. 401 = token malo; 403 = API key inválida o sin permiso.
    async probar() {
      await token();
      const r = await llamar("GET", "/documentos-ecf?ecf=E320000000000");
      const apiKeyOk = r.status !== 403 && r.status !== 401;
      return { ok: apiKeyOk, sesion: true, apiKey: apiKeyOk, status: r.status, respuesta: r.datos };
    },
    consultar: (ecf: string) => llamar("GET", `/documentos-ecf?ecf=${encodeURIComponent(ecf)}`),
    // Varios a la vez (hasta 100; docs «Consulta en batch»): una sola llamada para la cuota → {total, results:[{ecf,status,found,data}]}
    consultarLote: (ecfs: string[]) => llamar("POST", "/documentos-ecf/status/batch", { ecfs }),
    // validate=true: MSeller revisa el JSON sin enviarlo a la DGII ni gastar secuencia (docs «Envío de e-CF»).
    validar: (doc: unknown) => llamar("POST", "/documentos-ecf?validate=true", doc),
    // Envío real: responde al instante {rnc, ecf, internalTrackId, securityCode, qr_url, signedDate}; la DGII contesta después.
    enviar: (doc: unknown) => llamar("POST", "/documentos-ecf", doc),
  };
}
