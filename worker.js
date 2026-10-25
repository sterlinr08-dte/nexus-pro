// ──────────────────────────────────────────────────────────────────────────
// Cloudflare Worker — Vista previa (Open Graph) del BOLETO de rifa para WhatsApp.
//
// Problema: WhatsApp arma la tarjeta de preview leyendo etiquetas <meta og:*>
// FIJAS del HTML; NO ejecuta el JavaScript que pinta el banner/numero. Por eso
// boleto.html (estatico) siempre mostraba el logo generico.
//
// Este Worker interviene la ruta /boleto.html?id=... (y desde el 25-oct-2026 pone la
// huella ETag a la página principal "/", ver conHuella): trae los datos del
// boleto de la funcion Edge publica e inyecta og:image=banner y og:title con el
// numero, para que llegue el banner + numero en la vista previa.
//
// SEGURIDAD: todo va dentro de try/catch y ante CUALQUIER problema cae a servir
// el archivo estatico tal cual (env.ASSETS). No puede tumbar el sitio. El resto
// del dominio (seguros, POS, demas paginas) se sirve estatico sin cambios.
// ──────────────────────────────────────────────────────────────────────────

const FUNC = "https://tnwsgcxurfyuszxsewsn.supabase.co/functions/v1/boleto";
const LOGO = "https://nexusprord.com/icon-512.png";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c];
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      if (request.method === "GET" && url.pathname === "/boleto.html" && id) {
        const ssr = await ssrBoleto(request, env, id);
        if (ssr) return ssr;
      }
      // 25-oct-2026: la página principal (/) sale de Cloudflare sin ETag y el teléfono la
      // bajaba entera (~395 KB) en cada visita. Se le pone una huella del contenido para
      // que el navegador pregunte «¿cambió?» y reciba 304 (casi 0 bytes) si no cambió.
      if (request.method === "GET" && url.pathname === "/") {
        const r = await conHuella(request, env);
        if (r) return r;
      }
    } catch (e) { /* cualquier error -> servir estatico */ }
    return env.ASSETS.fetch(request);
  }
};

async function conHuella(request, env) {
  // Cloudflare quita al final del camino toda huella ETag del HTML (fuerte o débil).
  // Se usa la fecha de la publicación (env.CF_VERSION: cambia en cada despliegue)
  // como Last-Modified, y el navegador pregunta con If-Modified-Since → 304.
  const resp = await env.ASSETS.fetch(request);
  const ts = env.CF_VERSION && env.CF_VERSION.timestamp;
  if (resp.status !== 200 || !ts) return resp;
  const fecha = new Date(ts);
  if (isNaN(fecha)) return resp;
  const lm = fecha.toUTCString();
  const headers = new Headers(resp.headers);
  headers.set("last-modified", lm);
  headers.set("cache-control", "no-cache");
  const ims = Date.parse(request.headers.get("if-modified-since") || "");
  // Solo si es EXACTAMENTE la misma publicación (igualdad, no «más nueva»): así, si se vuelve
  // a una versión anterior, el teléfono también la baja. Fechas HTTP: precisión de segundos.
  if (!isNaN(ims) && Math.floor(fecha.getTime() / 1000) === Math.floor(ims / 1000)) {
    headers.delete("content-length");
    return new Response(null, { status: 304, headers });
  }
  // Número de esta publicación para los cargadores (index.html, parches-seguros.js, parches-rifas.js):
  // lo agregan a la URL de cada archivo, que así se puede guardar en el teléfono sin preguntar.
  const dep = String((env.CF_VERSION && env.CF_VERSION.id) || "").replace(/[^a-z0-9]/gi, "").slice(0, 8);
  if (!dep) return new Response(resp.body, { status: 200, headers });
  headers.delete("content-length");
  return new HTMLRewriter()
    .on("meta[charset]", { element(e) { e.after('<script>window.NX_DEPLOY="' + dep + '";</script>', { html: true }); } })
    .transform(new Response(resp.body, { status: 200, headers }));
}

async function ssrBoleto(request, env, id) {
  // 1) Datos del boleto (si falla, devolvemos null -> preview generico).
  let d = null;
  try {
    const r = await fetch(FUNC + "?id=" + encodeURIComponent(id));
    if (r.ok) d = await r.json();
  } catch (e) { d = null; }
  if (!d || d.numero == null) return null;

  // 2) HTML estatico original.
  const url = new URL(request.url);
  const assetResp = await env.ASSETS.fetch(new Request(url.origin + "/boleto.html", { method: "GET" }));
  let html = await assetResp.text();

  // 3) Etiquetas dinamicas (banner + numero).
  const num = esc(d.numero);
  const prem = d.premio ? esc(d.premio) : "";
  const biz = d.biz ? esc(d.biz) : "Rifa";
  const estado = d.conf ? "Pago verificado ✓" : "Por confirmar";
  const comprador = d.comprador ? esc(d.comprador) : "";
  const title = "🎟️ Boleto N° " + num + (prem ? " — " + prem : "");
  const desc = (prem ? prem + " · " : "") + estado + (comprador ? " · " + comprador : "");
  const hasImg = !!d.hasImg;
  const img = hasImg ? (FUNC + "?id=" + encodeURIComponent(id) + "&img=1") : LOGO;
  const card = hasImg ? "summary_large_image" : "summary";

  const tags =
    '<meta property="og:type" content="website">' +
    '<meta property="og:title" content="' + title + '">' +
    '<meta property="og:description" content="' + desc + '">' +
    '<meta property="og:image" content="' + img + '">' +
    '<meta property="og:image:alt" content="' + (prem || biz) + '">' +
    '<meta name="twitter:card" content="' + card + '">' +
    '<meta name="twitter:title" content="' + title + '">' +
    '<meta name="twitter:description" content="' + desc + '">' +
    '<meta name="twitter:image" content="' + img + '">';

  // Sustituimos el bloque og generico por el dinamico (y limpiamos los sueltos).
  html = html
    .replace(/<meta property="og:type"[^>]*>/i, tags)
    .replace(/<meta property="og:title"[^>]*>/i, "")
    .replace(/<meta property="og:description"[^>]*>/i, "")
    .replace(/<meta property="og:image"[^>]*>/i, "")
    .replace(/<meta name="twitter:card"[^>]*>/i, "");

  const headers = new Headers(assetResp.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300");
  headers.delete("content-length");
  return new Response(html, { status: 200, headers });
}
