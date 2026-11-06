// NEXUS PRO · Conector personal para Claude (MCP) — ETAPA 1: SOLO CONSULTAR (dueño, 06-nov-2026, opción A).
// Protocolo MCP «Streamable HTTP» mínimo: el cliente (la app de Claude) manda JSON-RPC por POST y aquí se responde con JSON.
// Este archivo no toca la base: recibe las consultas ya hechas (datos.ts) para poder probarlo sin Supabase.
// Nada aquí cobra, factura, cambia datos ni manda WhatsApp. La etapa 2 (aplicar pago / generar factura con confirmación
// del dueño) se agrega aparte, cuando el dueño lo apruebe.

export type Consultas = {
  buscarClientes(texto: string, limite: number): Promise<any[]>;
  estadoCuenta(clienteId: string): Promise<any | null>;
  quienDebe(mesesMin: number, agente: string | null, limite: number): Promise<any[]>;
  cobrosDelDia(fecha: string): Promise<any>;
  resumenCiclo(periodo: string): Promise<any>;
  polizasPorVencer(dias: number, limite: number): Promise<any[]>;
  registrar(accion: string, detalle: string): Promise<void>;
};

export const PROTOCOLOS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const fmt = (n: number) => 'RD$ ' + Math.round(Number(n) || 0).toLocaleString('en-US');
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const mesTxt = (p: string) => { const m = /^(\d{4})-(\d{2})$/.exec(p || ''); return m ? `${MESES[+m[2] - 1]} ${m[1]}` : (p || ''); };

// Fecha y hora de República Dominicana (UTC-4, sin horario de verano).
export function hoyRD(ahora = new Date()) {
  const d = new Date(ahora.getTime() - 4 * 3600 * 1000);
  const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1, dia = d.getUTCDate();
  return { fecha: `${y}-${String(mo).padStart(2, '0')}-${String(dia).padStart(2, '0')}`, anio: y, mes: mo, dia };
}
// Ciclo de agentes del 20 al 20: el período lleva el mes en que EMPIEZA (20-oct → 20-nov = «2026-10»).
export function cicloActual(ahora = new Date()) {
  const h = hoyRD(ahora);
  let y = h.anio, m = h.mes;
  if (h.dia < 20) { m -= 1; if (m === 0) { m = 12; y -= 1; } }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export const HERRAMIENTAS = [
  {
    name: 'buscar_cliente',
    title: 'Buscar cliente',
    description: 'Busca clientes de NEXUS PRO Seguros por nombre, cédula, número de póliza o WhatsApp. Devuelve hasta 10 con su id, agente, estado y lo que deben (facturas + deuda anterior). Úsalo primero cuando el dueño nombre a un cliente.',
    inputSchema: { type: 'object', properties: { texto: { type: 'string', description: 'Nombre, cédula, póliza o teléfono (parcial vale).' } }, required: ['texto'] },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'estado_cuenta',
    title: 'Estado de cuenta de un cliente',
    description: 'Estado de cuenta de UN cliente: pendiente total, deuda anterior, facturas abiertas por mes y sus últimos pagos. Necesita el id que da buscar_cliente.',
    inputSchema: { type: 'object', properties: { cliente_id: { type: 'string', description: 'id (uuid) del cliente, sacado de buscar_cliente.' } }, required: ['cliente_id'] },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'quien_debe',
    title: 'Quién debe',
    description: 'Clientes activos con facturas atrasadas (de meses anteriores al actual, sin pagar), ordenados por lo que deben. Se puede filtrar por agente.',
    inputSchema: { type: 'object', properties: { meses_minimos: { type: 'integer', minimum: 1, maximum: 24, description: 'Mínimo de facturas atrasadas (por defecto 1).' }, agente: { type: 'string', description: 'Nombre (o parte) del agente, opcional.' }, limite: { type: 'integer', minimum: 1, maximum: 50, description: 'Cuántos mostrar (por defecto 20).' } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'cobros_del_dia',
    title: 'Cobros del día',
    description: 'Pagos registrados en un día (hora de República Dominicana): lista, total y total por agente y por método. Sin fecha, es hoy. No cuenta pagos anulados ni reversados.',
    inputSchema: { type: 'object', properties: { fecha: { type: 'string', description: 'AAAA-MM-DD (opcional, por defecto hoy).' } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'resumen_ciclo_agentes',
    title: 'Resumen del ciclo 20→20 por agente',
    description: 'Cifras oficiales del ciclo de agentes (del día 20 al 20): cobrado validado, transferido, recibido, entregado al administrador y lo que cada uno tiene en custodia. Las transferencias entre agentes no son cobros. Sin período, es el ciclo actual. Los agentes no tienen comisión.',
    inputSchema: { type: 'object', properties: { periodo: { type: 'string', description: 'AAAA-MM del mes en que EMPIEZA el ciclo (20-oct→20-nov = 2026-10). Opcional.' } } },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'polizas_por_vencer',
    title: 'Pólizas por vencer',
    description: 'Clientes activos cuya póliza vence en los próximos N días (por defecto 30).',
    inputSchema: { type: 'object', properties: { dias: { type: 'integer', minimum: 1, maximum: 365 }, limite: { type: 'integer', minimum: 1, maximum: 50 } } },
    annotations: { readOnlyHint: true },
  },
];

const INSTRUCCIONES = 'Conector personal del dueño de NEXUS PRO Seguros (República Dominicana, montos en RD$). Responde en español sencillo, de usted, corto y con tablas cuando ayude. ' +
  'ETAPA 1: solo consulta; no puede cobrar, facturar, cambiar datos ni enviar WhatsApp. Si el dueño pide aplicar un pago o generar una factura, dígale que eso todavía se hace en NEXUS (pantalla «Registrar pago» o «Generar factura»). ' +
  'Reglas: los agentes no tienen comisión; el ciclo de agentes va del día 20 al 20; una transferencia entre agentes no es un cobro.';

const ent = (v: unknown, def: number, min: number, max: number) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tabla(cab: string[], filas: (string | number)[][]) {
  if (!filas.length) return '';
  return ['| ' + cab.join(' | ') + ' |', '|' + cab.map(() => '---').join('|') + '|', ...filas.map(f => '| ' + f.map(x => String(x ?? '').replace(/\|/g, '/')).join(' | ') + ' |')].join('\n');
}

export async function ejecutarHerramienta(nombre: string, args: any, q: Consultas, ahora = new Date()): Promise<{ texto: string; datos: any }> {
  args = args && typeof args === 'object' ? args : {};
  if (nombre === 'buscar_cliente') {
    const texto = String(args.texto || '').trim().slice(0, 80);
    if (texto.length < 2) throw new Error('Escriba al menos 2 letras o números.');
    const r = await q.buscarClientes(texto, 10);
    if (!r.length) return { texto: `No encontré clientes con «${texto}».`, datos: { clientes: [] } };
    return {
      texto: `${r.length} cliente(s) con «${texto}»:\n\n` + tabla(['Cliente', 'Cédula', 'Póliza', 'Agente', 'Estado', 'Debe', 'id'],
        r.map(c => [c.nombre, c.cedula || '—', c.poliza || '—', c.agente || '—', c.activo ? 'Activo' : 'Inactivo', fmt(c.pendiente), c.id])),
      datos: { clientes: r },
    };
  }
  if (nombre === 'estado_cuenta') {
    const id = String(args.cliente_id || '').trim();
    if (!uuid.test(id)) throw new Error('Falta el id del cliente: use primero buscar_cliente.');
    const e = await q.estadoCuenta(id);
    if (!e) return { texto: 'No existe un cliente con ese id.', datos: null };
    const fa = tabla(['Mes', 'Total', 'Estado'], (e.facturas_abiertas || []).map((f: any) => [mesTxt(f.periodo), fmt(f.total), f.estado]));
    const pa = tabla(['Fecha', 'Monto', 'Método', 'Banco', 'Agente', 'Estado'], (e.ultimos_pagos || []).map((p: any) => [p.fecha, fmt(p.monto), p.metodo || '—', p.banco || '—', p.agente || '—', p.estado || 'Activo']));
    return {
      texto: `**${e.nombre}**${e.activo ? '' : ' (inactivo)'} · agente ${e.agente || '—'} · póliza ${e.poliza || '—'}${e.vence ? ' · vence ' + e.vence : ''}\n\n` +
        `Debe en facturas: **${fmt(e.pendiente_facturas)}**` + (e.deuda_anterior > 0 ? ` · deuda anterior: ${fmt(e.deuda_anterior)} · total: **${fmt(e.pendiente_total)}**` : '') +
        `\nFacturado: ${fmt(e.deuda_total)} · pagado: ${fmt(e.pagado)}\n\n` +
        (fa ? `Facturas abiertas:\n${fa}\n\n` : 'No tiene facturas abiertas.\n\n') +
        (pa ? `Últimos pagos:\n${pa}` : 'Sin pagos registrados.'),
      datos: e,
    };
  }
  if (nombre === 'quien_debe') {
    const meses = ent(args.meses_minimos, 1, 1, 24), lim = ent(args.limite, 20, 1, 50);
    const agente = args.agente ? String(args.agente).trim().slice(0, 60) : null;
    const r = await q.quienDebe(meses, agente, lim);
    if (!r.length) return { texto: `Nadie tiene ${meses}+ factura(s) atrasada(s)${agente ? ' con el agente «' + agente + '»' : ''}.`, datos: { clientes: [] } };
    const total = r.reduce((s, c) => s + (Number(c.pendiente) || 0), 0);
    return {
      texto: `${r.length} cliente(s) con ${meses}+ factura(s) atrasada(s)${agente ? ' · agente «' + agente + '»' : ''} · suman ${fmt(total)}:\n\n` +
        tabla(['Cliente', 'Atrasadas', 'Más vieja', 'Debe', 'Agente', 'WhatsApp'], r.map(c => [c.nombre, c.atrasadas, mesTxt(c.mas_vieja), fmt(c.pendiente), c.agente || '—', c.wa || '—'])),
      datos: { clientes: r, total },
    };
  }
  if (nombre === 'cobros_del_dia') {
    const fecha = args.fecha ? String(args.fecha).trim() : hoyRD(ahora).fecha;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('La fecha va como AAAA-MM-DD.');
    const r = await q.cobrosDelDia(fecha);
    if (!r.pagos.length) return { texto: `No hay pagos registrados el ${fecha}.`, datos: r };
    return {
      texto: `Pagos del ${fecha}: **${r.pagos.length}** por **${fmt(r.total)}**.\n\nPor agente:\n` +
        tabla(['Agente', 'Pagos', 'Total'], r.por_agente.map((a: any) => [a.agente, a.cantidad, fmt(a.total)])) + '\n\nPor método:\n' +
        tabla(['Método', 'Total'], r.por_metodo.map((m: any) => [m.metodo, fmt(m.total)])) + '\n\nDetalle:\n' +
        tabla(['Hora', 'Cliente', 'Monto', 'Método', 'Agente'], r.pagos.slice(0, 40).map((p: any) => [p.hora, p.cliente, fmt(p.monto), p.metodo || '—', p.agente || '—'])),
      datos: r,
    };
  }
  if (nombre === 'resumen_ciclo_agentes') {
    const periodo = args.periodo ? String(args.periodo).trim() : cicloActual(ahora);
    if (!/^\d{4}-\d{2}$/.test(periodo)) throw new Error('El período va como AAAA-MM (mes en que empieza el ciclo).');
    const r = await q.resumenCiclo(periodo);
    return {
      texto: `Ciclo del 20 de ${mesTxt(periodo)} al 20 del mes siguiente${r.cerrado ? ' (cerrado)' : ' (en curso)'} · total cobrado del negocio: **${fmt(r.total_cobrado)}** (las transferencias no se suman).\n\n` +
        tabla(['Agente', 'Cobrado', 'Transferido', 'Recibido', 'Entregó al admin', 'En custodia'],
          r.agentes.map((a: any) => [a.agente, fmt(a.cobrado), fmt(a.transferido), fmt(a.recibido), fmt(a.entregado_admin), fmt(a.en_custodia)])),
      datos: r,
    };
  }
  if (nombre === 'polizas_por_vencer') {
    const dias = ent(args.dias, 30, 1, 365), lim = ent(args.limite, 30, 1, 50);
    const r = await q.polizasPorVencer(dias, lim);
    if (!r.length) return { texto: `Ninguna póliza vence en los próximos ${dias} días.`, datos: { clientes: [] } };
    return {
      texto: `${r.length} póliza(s) vencen en los próximos ${dias} días:\n\n` + tabla(['Cliente', 'Vence', 'Días', 'Agente', 'WhatsApp'], r.map(c => [c.nombre, c.vence, c.dias, c.agente || '—', c.wa || '—'])),
      datos: { clientes: r },
    };
  }
  throw new Error('Herramienta desconocida: ' + nombre);
}

// JSON-RPC 2.0. Devuelve el objeto de respuesta, o null para notificaciones (sin id).
export async function manejarMensaje(msg: any, q: Consultas, ahora = new Date()): Promise<any | null> {
  const id = msg && Object.prototype.hasOwnProperty.call(msg, 'id') ? msg.id : undefined;
  const ok = (result: any) => ({ jsonrpc: '2.0', id, result });
  const err = (code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(-32600, 'Solicitud inválida');
  if (id === undefined) return null; // notificación (p. ej. notifications/initialized)
  const m = msg.method, p = msg.params || {};
  if (m === 'initialize') {
    const pedida = String(p.protocolVersion || '');
    return ok({
      protocolVersion: PROTOCOLOS.includes(pedida) ? pedida : PROTOCOLOS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'nexus-pro', title: 'NEXUS PRO Seguros', version: '1.0.0' },
      instructions: INSTRUCCIONES,
    });
  }
  if (m === 'ping') return ok({});
  if (m === 'tools/list') return ok({ tools: HERRAMIENTAS });
  if (m === 'tools/call') {
    const nombre = String(p.name || '');
    if (!HERRAMIENTAS.some(h => h.name === nombre)) return err(-32602, 'Herramienta desconocida: ' + nombre);
    try {
      const r = await ejecutarHerramienta(nombre, p.arguments, q, ahora);
      try { await q.registrar('MCP_CONSULTA', `${nombre} ${JSON.stringify(p.arguments || {}).slice(0, 200)}`); } catch (_) { /* la consulta no falla por la auditoría */ }
      return ok({ content: [{ type: 'text', text: r.texto }], structuredContent: { resultado: r.datos }, isError: false });
    } catch (e) {
      return ok({ content: [{ type: 'text', text: 'No se pudo: ' + String((e as Error)?.message || e) }], isError: true });
    }
  }
  if (m === 'resources/list') return ok({ resources: [] });
  if (m === 'prompts/list') return ok({ prompts: [] });
  return err(-32601, 'Método no disponible: ' + m);
}

// Comparación de texto en tiempo constante (para la llave del enlace).
export function igualSeguro(a: string, b: string) {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let d = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) d |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return d === 0;
}

export const LLAVE_MINIMA = 32;

// Petición HTTP completa. La llave va como último tramo del enlace: …/functions/v1/nexus-mcp/<llave>.
export async function manejarHttp(req: Request, llave: string, q: Consultas, ahora = new Date()): Promise<Response> {
  const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const partes = new URL(req.url).pathname.split('/').filter(Boolean);
  const dada = decodeURIComponent(partes[partes.length - 1] || '');
  if (!llave || llave.length < LLAVE_MINIMA || !igualSeguro(dada, llave)) {
    await new Promise(r => setTimeout(r, 400)); // frena a quien prueba llaves
    return new Response(JSON.stringify({ error: 'no autorizado' }), { status: 401, headers: H });
  }
  if (req.method === 'GET') return new Response(null, { status: 405, headers: { Allow: 'POST' } }); // sin canal de eventos
  if (req.method === 'DELETE') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const crudo = await req.text();
  if (crudo.length > 65536) return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Demasiado grande' } }), { status: 413, headers: H });
  let cuerpo: any;
  try { cuerpo = JSON.parse(crudo); } catch (_) { return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }), { status: 400, headers: H }); }
  if (Array.isArray(cuerpo)) {
    const rs = (await Promise.all(cuerpo.slice(0, 20).map(x => manejarMensaje(x, q, ahora)))).filter(Boolean);
    return rs.length ? new Response(JSON.stringify(rs), { status: 200, headers: H }) : new Response(null, { status: 202 });
  }
  const r = await manejarMensaje(cuerpo, q, ahora);
  return r ? new Response(JSON.stringify(r), { status: 200, headers: H }) : new Response(null, { status: 202 });
}
