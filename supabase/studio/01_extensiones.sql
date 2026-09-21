-- STUDIO — 01 extensiones
-- Extraído de la base madre tnwsgcxurfyuszxsewsn (NEXUS PRO Seguros) el 2026-09-21.
-- Ejecutar sobre un proyecto Supabase vacío (Postgres 17). Los schemas auth/storage/extensions ya existen.
-- Se omiten a propósito: pg_net, pg_cron, pg_stat_statements, supabase_vault.

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
