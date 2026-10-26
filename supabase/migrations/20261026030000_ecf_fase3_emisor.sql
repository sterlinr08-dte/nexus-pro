-- e-CF fase 3 (dueño, 26-oct-2026: «Sí, empieza» la caja). Datos del EMISOR que van en cada e-CF (Emisor.RNCEmisor,
-- RazonSocialEmisor, DireccionEmisor). Viven en pos_config de cada organización: la Edge ecf-mseller los lee del servidor,
-- nunca del navegador. Solo agrega columnas nulas; no toca datos.
alter table public.pos_config add column if not exists ecf_rnc text;
alter table public.pos_config add column if not exists ecf_razon_social text;
alter table public.pos_config add column if not exists ecf_direccion text;
alter table public.pos_config add constraint pos_config_ecf_rnc_fmt check (ecf_rnc is null or ecf_rnc ~ '^([0-9]{9}|[0-9]{11})$');
