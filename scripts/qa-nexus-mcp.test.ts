// QA del conector personal para Claude (supabase/functions/nexus-mcp) — protocolo, llave y herramientas, con datos falsos.
// Uso: deno test scripts/qa-nexus-mcp.test.ts
import { manejarHttp, manejarMensaje, cicloActual, hoyRD, HERRAMIENTAS } from '../supabase/functions/nexus-mcp/mcp.ts';

const LLAVE = 'x'.repeat(40);
const registros: string[] = [];
const q = {
  async buscarClientes(t: string) { return t.includes('juan') ? [{ id: '11111111-1111-4111-8111-111111111111', nombre: 'Juan Minaya', cedula: '001-0000000-1', poliza: 'NX-1', agente: 'Robinson', activo: true, pendiente: 8000 }] : []; },
  async estadoCuenta(id: string) { return { id, nombre: 'Juan Minaya', activo: true, agente: 'Robinson', poliza: 'NX-1', vence: '2027-01-15', deuda_total: 12000, pagado: 4000, pendiente_facturas: 8000, deuda_anterior: 1500, pendiente_total: 9500, facturas_abiertas: [{ periodo: '2026-10', total: 4000, estado: 'Pendiente' }], ultimos_pagos: [{ fecha: '2026-10-05', monto: 4000, metodo: 'Transferencia', banco: 'Popular', agente: 'Robinson' }] }; },
  async quienDebe(m: number, ag: string | null) { return [{ nombre: 'Ana', atrasadas: 3, mas_vieja: '2026-07', pendiente: 12000, agente: ag || 'Maria', wa: '809' }]; },
  async cobrosDelDia(f: string) { return { fecha: f, total: 6500, pagos: [{ hora: '09:10', cliente: 'Ana', monto: 4000, metodo: 'Efectivo', agente: 'Robinson' }, { hora: '10:00', cliente: 'Luis', monto: 2500, metodo: 'Transferencia', agente: 'Maria' }], por_agente: [{ agente: 'Robinson', cantidad: 1, total: 4000 }, { agente: 'Maria', cantidad: 1, total: 2500 }], por_metodo: [{ metodo: 'Efectivo', total: 4000 }, { metodo: 'Transferencia', total: 2500 }] }; },
  async resumenCiclo(p: string) { return { periodo: p, cerrado: false, total_cobrado: 65000, agentes: [{ agente: 'Robinson', cobrado: 25000, transferido: 20000, recibido: 0, entregado_admin: 0, en_custodia: 5000 }, { agente: 'Esterlin', cobrado: 40000, transferido: 0, recibido: 20000, entregado_admin: 0, en_custodia: 60000 }] }; },
  async polizasPorVencer() { return [{ nombre: 'Luis', vence: '2026-11-20', dias: 14, agente: 'Maria', wa: '829' }]; },
  async registrar(a: string, d: string) { registros.push(a + ' ' + d); },
};
const post = (body: unknown, llave = LLAVE) => new Request('https://x.supabase.co/functions/v1/nexus-mcp/' + llave, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const eq = (a: unknown, b: unknown, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(m + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); };
const ok = (c: unknown, m: string) => { if (!c) throw new Error(m); };

Deno.test('llave: sin llave, corta o equivocada → 401', async () => {
  eq((await manejarHttp(post({}), '', q)).status, 401, 'sin secreto');
  eq((await manejarHttp(post({}, 'corta'), 'corta', q)).status, 401, 'llave corta');
  eq((await manejarHttp(post({}, 'y'.repeat(40)), LLAVE, q)).status, 401, 'equivocada');
});
Deno.test('initialize, notificación, ping y lista de herramientas', async () => {
  const r = await (await manejarHttp(post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'claude' } } }), LLAVE, q)).json();
  eq(r.result.protocolVersion, '2025-06-18', 'versión'); ok(r.result.capabilities.tools, 'capacidad tools'); ok(/solo consulta/i.test(r.result.instructions), 'instrucciones');
  eq((await manejarHttp(post({ jsonrpc: '2.0', method: 'notifications/initialized' }), LLAVE, q)).status, 202, 'notificación 202');
  eq((await manejarMensaje({ jsonrpc: '2.0', id: 2, method: 'ping' }, q)).result, {}, 'ping');
  const l = await manejarMensaje({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, q);
  eq(l.result.tools.map((t: any) => t.name), ['buscar_cliente', 'estado_cuenta', 'quien_debe', 'cobros_del_dia', 'resumen_ciclo_agentes', 'polizas_por_vencer'], 'herramientas');
  ok(HERRAMIENTAS.every(h => h.annotations.readOnlyHint === true), 'todas de solo lectura');
  ok(!HERRAMIENTAS.some(h => /registrar|aplicar|cobrar|generar|enviar/.test(h.name)), 'ninguna escribe');
});
Deno.test('versión de protocolo desconocida → la más nueva', async () => {
  const r = await manejarMensaje({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, q);
  eq(r.result.protocolVersion, '2025-06-18', 'fallback');
});
Deno.test('herramientas responden en texto y quedan en la auditoría', async () => {
  const llamar = (name: string, args: unknown) => manejarMensaje({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name, arguments: args } }, q, new Date('2026-11-06T15:00:00Z'));
  let r = await llamar('buscar_cliente', { texto: 'juan' });
  ok(r.result.content[0].text.includes('Juan Minaya') && r.result.content[0].text.includes('RD$ 8,000'), 'buscar');
  r = await llamar('estado_cuenta', { cliente_id: '11111111-1111-4111-8111-111111111111' });
  ok(/RD\$ 9,500/.test(r.result.content[0].text) && /octubre 2026/.test(r.result.content[0].text), 'estado de cuenta');
  r = await llamar('estado_cuenta', { cliente_id: 'Juan' });
  eq(r.result.isError, true, 'sin id → error amable');
  r = await llamar('quien_debe', { meses_minimos: 2, agente: 'Maria' });
  ok(/julio 2026/.test(r.result.content[0].text), 'quién debe');
  r = await llamar('cobros_del_dia', {});
  ok(/2026-11-06/.test(r.result.content[0].text) && /RD\$ 6,500/.test(r.result.content[0].text), 'cobros de hoy (RD)');
  r = await llamar('resumen_ciclo_agentes', {});
  ok(/octubre 2026/.test(r.result.content[0].text) && /RD\$ 65,000/.test(r.result.content[0].text), 'ciclo actual 2026-10, total sin transferencias');
  r = await llamar('polizas_por_vencer', { dias: 30 });
  ok(/Luis/.test(r.result.content[0].text), 'pólizas');
  ok(registros.length >= 6 && registros.every(x => x.startsWith('MCP_CONSULTA')), 'auditoría');
  const d = await manejarMensaje({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'registrar_pago', arguments: {} } }, q);
  eq(d.error.code, -32602, 'herramienta inexistente');
});
Deno.test('fechas de República Dominicana y ciclo 20→20', () => {
  eq(hoyRD(new Date('2026-11-07T03:30:00Z')).fecha, '2026-11-06', '23:30 en RD sigue siendo el 6');
  eq(cicloActual(new Date('2026-11-06T15:00:00Z')), '2026-10', 'antes del 20 → ciclo que empezó en octubre');
  eq(cicloActual(new Date('2026-11-20T05:00:00Z')), '2026-11', 'desde el 20 → ciclo de noviembre');
  eq(cicloActual(new Date('2026-01-10T15:00:00Z')), '2025-12', 'enero antes del 20 → diciembre del año anterior');
});
Deno.test('JSON roto y método GET', async () => {
  const bad = new Request('https://x/functions/v1/nexus-mcp/' + LLAVE, { method: 'POST', body: '{' });
  eq((await manejarHttp(bad, LLAVE, q)).status, 400, 'JSON roto');
  eq((await manejarHttp(new Request('https://x/functions/v1/nexus-mcp/' + LLAVE), LLAVE, q)).status, 405, 'GET');
});
