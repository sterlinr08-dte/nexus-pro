// Cliente Supabase simulado para pruebas unitarias de las Edge Functions de WhatsApp.
// Registra cada consulta (tabla, operación, datos, filtros) y delega la respuesta a `responder`.
// Solo cubre la superficie del query builder que usan las funciones (thenable al final de la cadena).

export type Llamada = {
  tabla: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  datos?: any;
  opciones?: any;
  columnas?: string;
  filtros: Array<[string, ...unknown[]]>;
  modificadores: string[];
};

export type Respuesta = { data?: any; error?: { message: string } | null; count?: number | null };
export type Responder = (l: Llamada) => Respuesta | undefined;

export type LlamadaStorage = { bucket: string; op: string; args: unknown[] };

const FILTROS = ["eq", "neq", "is", "not", "ilike", "like", "in", "gt", "gte", "lt", "lte", "limit", "order", "range"];

export function crearFakeDb(responder: Responder) {
  const llamadas: Llamada[] = [];
  const storage: LlamadaStorage[] = [];

  function builder(tabla: string) {
    const l: Llamada = { tabla, op: "select", filtros: [], modificadores: [] };
    let opFijada = false;
    const b: any = {
      select(columnas?: string) {
        if (!opFijada) { l.op = "select"; l.columnas = columnas; opFijada = true; }
        else l.modificadores.push(`select:${columnas ?? "*"}`);
        return b;
      },
      maybeSingle() { l.modificadores.push("maybeSingle"); return b; },
      single() { l.modificadores.push("single"); return b; },
      then(res: (v: Respuesta) => unknown, rej?: (e: unknown) => unknown) {
        llamadas.push(l);
        try {
          const r = responder(l) ?? {};
          return Promise.resolve({ data: r.data ?? null, error: r.error ?? null, count: r.count ?? null }).then(res, rej);
        } catch (e) {
          return Promise.reject(e).then(res, rej);
        }
      },
    };
    for (const op of ["insert", "update", "upsert", "delete"] as const) {
      b[op] = (datos?: unknown, opciones?: unknown) => { l.op = op; l.datos = datos; l.opciones = opciones; opFijada = true; return b; };
    }
    for (const f of FILTROS) b[f] = (...args: unknown[]) => { l.filtros.push([f, ...args]); return b; };
    return b;
  }

  const db = {
    from: (tabla: string) => builder(tabla),
    storage: {
      from(bucket: string) {
        const reg = (op: string, ...args: unknown[]) => { storage.push({ bucket, op, args }); };
        return {
          upload: async (path: string, cuerpo: unknown, opts: unknown) => { reg("upload", path, cuerpo, opts); return { data: { path }, error: null }; },
          createSignedUrl: async (path: string, exp: number) => { reg("createSignedUrl", path, exp); return { data: { signedUrl: `https://storage.test/sign/${path}?token=t` }, error: null }; },
          createSignedUploadUrl: async (path: string) => { reg("createSignedUploadUrl", path); return { data: { signedUrl: `https://storage.test/upload/sign/${path}?token=u`, token: "u", path }, error: null }; },
          remove: async (paths: string[]) => { reg("remove", paths); return { data: paths, error: null }; },
        };
      },
    },
  };
  return { db, llamadas, storage };
}

export function filtro(l: Llamada, nombre: string, columna?: string): unknown[] | undefined {
  const f = l.filtros.find((x) => x[0] === nombre && (columna === undefined || x[1] === columna));
  return f ? f.slice(1) : undefined;
}

export function ultima(llamadas: Llamada[], tabla: string, op: Llamada["op"]): Llamada | undefined {
  return [...llamadas].reverse().find((l) => l.tabla === tabla && l.op === op);
}

export function todas(llamadas: Llamada[], tabla: string, op: Llamada["op"]): Llamada[] {
  return llamadas.filter((l) => l.tabla === tabla && l.op === op);
}

// fetch simulado: enruta por (método, sub-cadena de la URL) y guarda cada petición.
export type Peticion = { url: string; metodo: string; headers: Record<string, string>; body: unknown; cuerpoCrudo: BodyInit | null | undefined };
export type Ruta = { metodo?: string; url: string | RegExp; responder: (p: Peticion) => Response | Promise<Response> };

export function crearFakeFetch(rutas: Ruta[]) {
  const peticiones: Peticion[] = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const metodo = (init?.method || "GET").toUpperCase();
    const headers: Record<string, string> = {};
    new Headers(init?.headers || {}).forEach((v, k) => { headers[k.toLowerCase()] = v; });
    let body: unknown = null;
    const crudo = init?.body;
    if (typeof crudo === "string") { try { body = JSON.parse(crudo); } catch { body = crudo; } }
    else if (crudo instanceof FormData) { body = Object.fromEntries(crudo.entries()); }
    const p: Peticion = { url, metodo, headers, body, cuerpoCrudo: crudo };
    peticiones.push(p);
    const ruta = rutas.find((r) => (!r.metodo || r.metodo.toUpperCase() === metodo) && (typeof r.url === "string" ? url.includes(r.url) : r.url.test(url)));
    if (!ruta) return new Response(JSON.stringify({ success: false, error: "ruta_no_simulada", url }), { status: 599 });
    return await ruta.responder(p);
  }) as typeof fetch;
  return { fetchFn, peticiones };
}

export function respuestaJson(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}
