-- PROPUESTA (NO APLICADA) — 27-oct-2026 · «Compra segura» en el recibo del POS.
-- Hoy el interruptor y el texto del negocio se guardan por equipo (localStorage nx_pos_cs_mostrar /
-- nx_pos_cs_texto) en parches-pos-compra-segura.js. Si el dueño quiere que valga para toda la empresa,
-- se aplica esto y la capa pasa a leer/escribir pos_config. No toca datos existentes.
alter table public.pos_config
  add column if not exists compra_segura_mostrar boolean not null default true,
  add column if not exists compra_segura_texto text;

alter table public.pos_config
  drop constraint if exists pos_config_compra_segura_texto_len;
alter table public.pos_config
  add constraint pos_config_compra_segura_texto_len
  check (compra_segura_texto is null or char_length(compra_segura_texto) <= 160);

comment on column public.pos_config.compra_segura_mostrar is 'Muestra el bloque «Compra segura» (garantía, IMEI, comprobante) en el ticket y la factura.';
comment on column public.pos_config.compra_segura_texto is 'Texto opcional del negocio en el bloque «Compra segura» (p. ej. política de devolución), máx. 160 caracteres.';
