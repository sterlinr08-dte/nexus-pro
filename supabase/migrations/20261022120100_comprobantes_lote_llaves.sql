-- 59.56 — Llaves de un solo uso para la lectura por lotes de comprobantes viejos (Edge comprobante-leer, modo «lote»).
-- Solo guarda el SHA-256 de la llave y su vencimiento. Ningún usuario de la app puede leerla ni escribirla (RLS sin
-- políticas); solo la Edge con la clave de servicio. Se borran al terminar.
create table if not exists public._comprobante_lote_llaves (
  hash  text primary key check (hash ~ '^[0-9a-f]{64}$'),
  vence timestamptz not null
);
alter table public._comprobante_lote_llaves enable row level security;
revoke all on public._comprobante_lote_llaves from anon, authenticated;
