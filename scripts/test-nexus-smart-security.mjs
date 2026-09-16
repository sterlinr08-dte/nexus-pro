import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const edge = await readFile(new URL("../supabase/functions/nexus-smart/index.ts", import.meta.url), "utf8");
const frontend = await readFile(new URL("../parches-seguros-base.js", import.meta.url), "utf8");

assert.match(edge, /supabase\.auth\.getUser\(token\)/, "debe validar la sesión con Supabase Auth");
assert.match(edge, /perfil\.rol !== 'admin'/, "debe exigir rol admin");
assert.match(edge, /perfil\.activo === false/, "debe rechazar perfiles inactivos");
assert.match(edge, /usuario\.activo === false/, "debe rechazar usuarios inactivos");
assert.match(edge, /\.eq\('slug', 'nexus-pro'\)/, "debe verificar la organización NEXUS PRO");
assert.match(edge, /usuario\.organizacion_id !== org\.id/, "debe comparar la organización del usuario");
assert.match(edge, /if \(token === SERVICE_KEY\) return \{ ok: false/, "no debe admitir service_role como sesión humana");
assert.doesNotMatch(edge, /if \(token === SERVICE_KEY\) return \{ ok: true/, "no debe conservar el bypass de service_role");
assert.match(edge, /\.eq\('estado', 'aceptada'\)/, "solo debe incluir transferencias aceptadas");
assert.match(edge, /MAX_PREGUNTA_CHARS/, "debe limitar la pregunta");
assert.match(edge, /AbortSignal\.timeout\(ANTHROPIC_TIMEOUT_MS\)/, "debe limitar el tiempo del proveedor IA");
assert.match(edge, /const consultaFallida = consultas\.find/, "debe rechazar contexto parcial");

assert.match(frontend, /const tokenSesion = api\?\.token \|\| ''/, "el frontend debe exigir token de sesión");
assert.match(frontend, /tokenSesion === api\?\.key/, "el frontend debe rechazar la clave pública como sesión");
assert.doesNotMatch(
  frontend,
  /Authorization': 'Bearer ' \+ \(api\?\.token \|\| api\?\.key/,
  "el frontend no debe volver a usar la clave pública como fallback",
);

console.log("nexus-smart security checks: OK");
