import fs from 'node:fs';
import assert from 'node:assert/strict';

const js = fs.readFileSync('parches-pos.js','utf8');
const sql = fs.readFileSync('supabase/migrations/20260916052000_pos_caja_por_cajero.sql','utf8');
const index = fs.readFileSync('index.html','utf8');
const version = JSON.parse(fs.readFileSync('version.json','utf8'));

assert.match(js,/function authUidPOS\(\)/);
assert.match(js,/usuario_id=eq\./);
assert.match(js,/rpc\/pos_abrir_mi_caja/);
assert.match(js,/rpc\/pos_registrar_movimiento_mi_caja/);
assert.match(js,/rpc\/pos_eliminar_movimiento_mi_caja/);
assert.match(js,/rpc\/pos_cerrar_mi_caja/);
assert.doesNotMatch(js,/select=\*&estado=eq\.abierta&order=apertura\.desc&limit=1/);
assert.doesNotMatch(js,/patch\('pos_cajas',[^\n]*estado:\s*'cerrada'/);

assert.match(sql,/pos_cajas_una_abierta_por_usuario_uidx/);
assert.match(sql,/usuario_id := auth\.uid\(\)/);
assert.match(sql,/CAJA_AJENA_O_CERRADA/);
assert.match(sql,/CAJA_CIERRE_USE_RPC/);
assert.match(sql,/for update/);
assert.match(sql,/v_esperado:=v_caja\.monto_inicial\+v_efe\+v_abono\+v_ent-v_sal/);
assert.match(sql,/security invoker/gi);
assert.match(sql,/revoke all[\s\S]*from public,anon,authenticated/i);

assert.match(index,/const APP_VERSION='58\.38'/);
assert.equal(version.version,'58.38');
assert.equal(version.cambios[0].version,'58.38');

console.log('POS caja por cajero checks: OK');
