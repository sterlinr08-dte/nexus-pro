import fs from 'node:fs';
import assert from 'node:assert/strict';

const js = fs.readFileSync('parches-pos.js', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20260916050000_pos_venta_nucleo_atomico.sql', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const version = JSON.parse(fs.readFileSync('version.json', 'utf8'));

const inicio = js.indexOf('window.nxPosConfirmar = async function');
const fin = js.indexOf('// ── Ticket imprimible', inicio);
assert.ok(inicio > 0 && fin > inicio, 'debe localizar el flujo de cobro');
const confirmar = js.slice(inicio, fin);

assert.match(confirmar, /rpc\/pos_registrar_venta_atomica/);
assert.doesNotMatch(confirmar, /post\('pos_ventas'/, 'el navegador no debe crear primero la cabecera');
assert.doesNotMatch(confirmar, /post\('pos_venta_items'/, 'el navegador no debe insertar líneas por separado');
assert.doesNotMatch(confirmar, /rpc\/pos_aplicar_inventario_venta/, 'el inventario debe quedar dentro de la transacción');
assert.match(confirmar, /p_operacion_id: _ventaOperacionId/);
assert.match(confirmar, /p_reserva_token: _imeiReserva/);
assert.match(confirmar, /itemsInsertados\.length !== items\.length/);

assert.match(sql, /create unique index[\s\S]*pos_ventas_org_operacion_uidx/i);
assert.match(sql, /security invoker/i);
assert.match(sql, /pos_confirmar_seriales_reservados/);
assert.match(sql, /pos_aplicar_inventario_venta/);
assert.match(sql, /VENTA_TOTAL_NO_CUADRA/);
assert.match(sql, /VENTA_CAJA_CERRADA/);
assert.match(sql, /VENTA_IMEI_OTRO_ALMACEN/);
assert.match(sql, /revoke all[\s\S]*from anon/i);
assert.match(sql, /grant execute[\s\S]*to authenticated/i);

assert.match(index, /const APP_VERSION='58\.37'/);
assert.equal(version.version, '58.37');
assert.equal(version.cambios[0].version, '58.37');

console.log('POS venta atómica checks: OK');
