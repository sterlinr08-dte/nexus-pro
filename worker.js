// ──────────────────────────────────────────────────────────────────────────
// Cloudflare Worker — Vista previa (Open Graph) del BOLETO de rifa para WhatsApp.
//
// Problema: WhatsApp arma la tarjeta de preview leyendo etiquetas <meta og:*>
// FIJAS del HTML; NO ejecuta el JavaScript que pinta el banner/numero. Por eso
// boleto.html (estatico) siempre mostraba el logo generico.
//
// Este Worker SOLO interviene la ruta /boleto.html?id=... : trae los datos del
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
    } catch (e) { /* cualquier error -> servir estatico */ }
    return env.ASSETS.fetch(request);
  }
};

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
