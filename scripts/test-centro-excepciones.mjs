import fs from 'node:fs';
import assert from 'node:assert/strict';

const migration = fs.readFileSync('supabase/migrations/20260916013000_centro_excepciones_operativas.sql', 'utf8');
const ui = fs.readFileSync('parches-excepciones.js', 'utf8');
const loader = fs.readFileSync('parches-seguros.js', 'utf8');

const tipos = [
  'POS_VENTA_IMEI_SIN_CONFIRMAR',
  'POS_VENTA_ITEMS_INCOMPLETOS',
  'REP_ENTREGA_INCOMPLETA',
  'POS_VENTA_INVENTARIO_PENDIENTE',
  'ASIENTO_DESCUADRADO'
];

for (const tipo of tipos) {
  assert.match(migration, new RegExp(tipo), `la migración debe capturar ${tipo}`);
  assert.match(ui, new RegExp(tipo), `la UI debe etiquetar ${tipo}`);
}

assert.doesNotMatch(migration, /POS_ANULACION_NCF_PENDIENTE/, 'los eventos fiscales deben quedar fuera');
assert.match(migration, /enable row level security/i);
assert.match(migration, /mi_rol\(\) = 'admin'/);
assert.match(migration, /organizacion_id = public\.mi_organizacion\(\)/);
assert.match(migration, /length\(trim\(coalesce\(p_nota/);
assert.match(migration, /estado = 'abierta'/);
assert.match(migration, /EXCEPCION_OPERATIVA_RESUELTA/);
assert.match(loader, /parches-excepciones\.js/);
assert.match(loader, /b=5880/);
assert.match(ui, /sesion\.rol !== 'admin'/);
assert.match(ui, /rpc\/resolver_excepcion_operativa/);

console.log('centro de excepciones checks: OK');
