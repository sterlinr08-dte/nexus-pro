// NEXUS PRO · Conector para Claude — consultas de SOLO LECTURA (etapa 1).
// Mismas reglas que la app: pendiente = deuda_total − pagado (facturas) + deuda_anterior (bolsa aparte);
// un pago anulado/eliminado/inactivo/reversado no cuenta, ni el de tipo 'deuda_anterior' (saldo de arranque).
// El ciclo de agentes sale de la RPC oficial seguros_resumen_ciclo_agente_core (la misma que usa
// seguros_resumen_ciclo_admin y el reporte «Ciclo 20→20»): aquí no se reconstruye custodia.
// Lo único que escribe es una fila en «auditoria» por cada consulta (quién preguntó qué y cuándo).
import type { Consultas } from './mcp.ts';
import { hoyRD } from './mcp.ts';

const ANULADOS = new Set(['ANULADO', 'ELIMINADO', 'INACTIVO', 'REVERSADO']);
const sinTilde = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const digitos = (s: string) => String(s || '').replace(/\D/g, '');
const pendFact = (c: any) => Math.max(0, (Number(c.deuda_total) || 0) - (Number(c.pagado) || 0));
const deudaAnt = (c: any) => Math.max(0, Number(c.deuda_anterior) || 0);

// PostgREST devuelve hasta 1000 filas por llamada: se pide por páginas.
async function todas(hacer: (desde: number, hasta: number) => any, tope = 20000): Promise<any[]> {
  const out: any[] = [];
  for (let desde = 0; desde < tope; desde += 1000) {
    const { data, error } = await hacer(desde, desde + 999);
    if (error) throw new Error(error.message || 'Error de consulta');
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function crearConsultas(db: any): Consultas {
  let agentesCache: Map<string, string> | null = null;
  const agentes = async () => {
    if (agentesCache) return agentesCache;
    const { data, error } = await db.from('agentes').select('id,nom');
    if (error) throw new Error(error.message);
    agentesCache = new Map((data || []).map((a: any) => [String(a.id), a.nom]));
    return agentesCache;
  };
  const CLI = 'id,nom,cedula,numero_poliza,wa,tel,agente_id,activo,deuda_total,pagado,deuda_anterior,plan,ars,fecha_fin';
  const clientes = () => todas((a, b) => db.from('clientes').select(CLI).order('nom').range(a, b));

  return {
    async buscarClientes(texto, limite) {
      const [cs, ag] = await Promise.all([clientes(), agentes()]);
      const palabras = sinTilde(texto).split(/\s+/).filter(Boolean);
      const dig = digitos(texto);
      const r = cs.filter((c: any) => {
        const nom = sinTilde(c.nom), pol = sinTilde(c.numero_poliza || '');
        if (palabras.length && palabras.every(p => nom.includes(p) || pol.includes(p))) return true;
        if (dig.length >= 4 && [c.cedula, c.wa, c.tel, c.numero_poliza].some(v => digitos(v).includes(dig))) return true;
        return false;
      });
      r.sort((x: any, y: any) => Number(y.activo !== false) - Number(x.activo !== false));
      return r.slice(0, limite).map((c: any) => ({
        id: c.id, nombre: c.nom, cedula: c.cedula, poliza: c.numero_poliza, wa: c.wa, plan: c.plan, ars: c.ars,
        agente: ag.get(String(c.agente_id)) || null, activo: c.activo !== false,
        pendiente: pendFact(c) + deudaAnt(c),
      }));
    },

    async estadoCuenta(id) {
      const { data: c, error } = await db.from('clientes').select(CLI + ',created_at').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!c) return null;
      const [ag, fac, ab] = await Promise.all([
        agentes(),
        db.from('facturas').select('periodo,total,prima_base,prima_deps,estado').eq('cliente_id', id).not('estado', 'in', '("Pagado","Anulada")').order('periodo'),
        db.from('abonos').select('fecha,monto,metodo,banco,agente_cobro,estado,tipo').eq('cliente_id', id).order('fecha', { ascending: false }).limit(5),
      ]);
      if (fac.error) throw new Error(fac.error.message);
      if (ab.error) throw new Error(ab.error.message);
      return {
        id: c.id, nombre: c.nom, activo: c.activo !== false, poliza: c.numero_poliza, plan: c.plan, ars: c.ars,
        agente: ag.get(String(c.agente_id)) || null, wa: c.wa,
        vence: c.fecha_fin ? String(c.fecha_fin).slice(0, 10) : null,
        deuda_total: Number(c.deuda_total) || 0, pagado: Number(c.pagado) || 0,
        pendiente_facturas: pendFact(c), deuda_anterior: deudaAnt(c), pendiente_total: pendFact(c) + deudaAnt(c),
        facturas_abiertas: (fac.data || []).map((f: any) => ({ periodo: f.periodo, total: Number(f.total) || (Number(f.prima_base) || 0) + (Number(f.prima_deps) || 0), estado: f.estado })),
        ultimos_pagos: (ab.data || []).map((p: any) => ({
          fecha: p.fecha ? hoyRD(new Date(p.fecha)).fecha : null, monto: Number(p.monto) || 0, metodo: p.metodo, banco: p.banco,
          agente: p.agente_cobro, estado: p.estado || null, tipo: p.tipo || null,
        })),
      };
    },

    async quienDebe(mesesMin, agente, limite) {
      const h = hoyRD();
      const hoyKey = `${h.anio}-${String(h.mes).padStart(2, '0')}`;
      const [fac, cs, ag] = await Promise.all([
        todas((a, b) => db.from('facturas').select('cliente_id,periodo').not('estado', 'in', '("Pagado","Anulada")').lt('periodo', hoyKey).order('periodo').range(a, b)),
        clientes(), agentes(),
      ]);
      const porCli = new Map<string, { n: number; vieja: string }>();
      for (const f of fac) {
        const k = String(f.cliente_id), x = porCli.get(k) || { n: 0, vieja: f.periodo };
        x.n++; if (f.periodo < x.vieja) x.vieja = f.periodo; porCli.set(k, x);
      }
      const filtroAg = agente ? sinTilde(agente) : null;
      return cs.filter((c: any) => c.activo !== false && (porCli.get(String(c.id))?.n || 0) >= mesesMin)
        .map((c: any) => ({ c, x: porCli.get(String(c.id))!, nomAg: ag.get(String(c.agente_id)) || '' }))
        .filter(o => !filtroAg || sinTilde(o.nomAg).includes(filtroAg))
        .map(o => ({ id: o.c.id, nombre: o.c.nom, atrasadas: o.x.n, mas_vieja: o.x.vieja, pendiente: pendFact(o.c) + deudaAnt(o.c), agente: o.nomAg || null, wa: o.c.wa }))
        .sort((a, b) => b.pendiente - a.pendiente)
        .slice(0, limite);
    },

    async cobrosDelDia(fecha) {
      const ini = new Date(fecha + 'T04:00:00Z'), fin = new Date(ini.getTime() + 86400000);
      const { data, error } = await db.from('abonos').select('cliente_id,monto,metodo,banco,agente_cobro,estado,tipo,fecha,validacion_estado')
        .gte('fecha', ini.toISOString()).lt('fecha', fin.toISOString()).order('fecha').limit(1000);
      if (error) throw new Error(error.message);
      const vivos = (data || []).filter((a: any) => String(a.tipo || '') !== 'deuda_anterior' && !ANULADOS.has(String(a.estado || '').toUpperCase()));
      const ids = [...new Set(vivos.map((a: any) => a.cliente_id).filter(Boolean))];
      const nombres = new Map<string, string>();
      if (ids.length) {
        const { data: cs } = await db.from('clientes').select('id,nom').in('id', ids);
        (cs || []).forEach((c: any) => nombres.set(String(c.id), c.nom));
      }
      const pa = new Map<string, { cantidad: number; total: number }>(), pm = new Map<string, number>();
      let total = 0;
      const pagos = vivos.map((a: any) => {
        const m = Number(a.monto) || 0; total += m;
        const ag = a.agente_cobro || 'Sin agente', me = a.metodo || 'Sin método';
        const x = pa.get(ag) || { cantidad: 0, total: 0 }; x.cantidad++; x.total += m; pa.set(ag, x);
        pm.set(me, (pm.get(me) || 0) + m);
        const d = new Date(new Date(a.fecha).getTime() - 4 * 3600000);
        return { hora: `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`, cliente: nombres.get(String(a.cliente_id)) || 'Cliente', monto: m, metodo: a.metodo, banco: a.banco, agente: a.agente_cobro, validacion: a.validacion_estado || null };
      });
      return {
        fecha, total, pagos,
        por_agente: [...pa].map(([agente, x]) => ({ agente, ...x })).sort((a, b) => b.total - a.total),
        por_metodo: [...pm].map(([metodo, t]) => ({ metodo, total: t })).sort((a, b) => b.total - a.total),
      };
    },

    async resumenCiclo(periodo) {
      const lim = await db.rpc('seguros_ciclo_limites', { p_periodo: periodo });
      if (lim.error) throw new Error(lim.error.message);
      const { data: as, error } = await db.from('agentes').select('id,nom,activo').order('nom');
      if (error) throw new Error(error.message);
      const filas = await Promise.all((as || []).map(async (a: any) => {
        const r = await db.rpc('seguros_resumen_ciclo_agente_core', { p_agente_id: a.id, p_periodo: periodo });
        if (r.error) throw new Error(r.error.message);
        const x = (r.data || [])[0] || {};
        return { a, x };
      }));
      const n = (v: any) => Number(v) || 0;
      // Mismo criterio que seguros_resumen_ciclo_admin: activos, o con cualquier movimiento/saldo.
      const elegibles = filas.filter(({ a, x }) => a.activo !== false || ['saldo_inicial', 'cobrado_validado', 'transferido_confirmado', 'recibido_confirmado', 'entregado_admin_directo', 'directo_recibido', 'reversas_cobros_previos', 'reintegros_entregas_previas', 'directos_previos_anulados', 'saldo_final'].some(k => Math.abs(n(x[k])) > 0.005));
      const agentesOut = elegibles.map(({ a, x }) => ({
        agente: a.nom, cobrado: n(x.cobrado_validado), transferido: n(x.transferido_confirmado), recibido: n(x.recibido_confirmado),
        entregado_admin: n(x.entregado_admin_directo), en_custodia: n(x.saldo_final), saldo_inicial: n(x.saldo_inicial),
        diferencia: n(x.diferencia_reconciliacion),
      }));
      const l = (lim.data || [])[0] || {};
      return {
        periodo, inicio: l.inicio, fin: l.fin, cerrado: !!(filas[0]?.x?.cerrado),
        total_cobrado: agentesOut.reduce((s, a) => s + a.cobrado, 0), agentes: agentesOut,
      };
    },

    async polizasPorVencer(dias, limite) {
      const h = hoyRD();
      const desde = h.fecha, hastaD = new Date(Date.parse(h.fecha + 'T12:00:00Z') + dias * 86400000);
      const hasta = hastaD.toISOString().slice(0, 10);
      const [r, ag] = await Promise.all([
        db.from('clientes').select('id,nom,wa,agente_id,fecha_fin,activo').or('activo.is.null,activo.eq.true').gte('fecha_fin', desde).lte('fecha_fin', hasta + 'T23:59:59').order('fecha_fin').limit(limite),
        agentes(),
      ]);
      if (r.error) throw new Error(r.error.message);
      return (r.data || []).map((c: any) => {
        const v = String(c.fecha_fin).slice(0, 10);
        return { id: c.id, nombre: c.nom, vence: v, dias: Math.round((Date.parse(v + 'T12:00:00Z') - Date.parse(desde + 'T12:00:00Z')) / 86400000), agente: ag.get(String(c.agente_id)) || null, wa: c.wa };
      });
    },

    async registrar(accion, detalle) {
      await db.from('auditoria').insert({
        ts: new Date().toISOString(), usuario: 'Dueño (vía Claude)', rol: 'admin', accion, detalle: detalle.slice(0, 500),
        modulo: 'Conector Claude', origen: 'claude-mcp', result: 'ok',
      });
    },
  };
}
