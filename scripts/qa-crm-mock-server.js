// QA del CRM (29-sep-2026): sirve el repo NEXUS PRO tal cual y simula la REST de Supabase (PostgREST) en /supa.
// Uso: node scripts/qa-crm-mock-server.js  (puerto 8942) y en otra terminal node scripts/qa-crm.mjs
// Sin red externa. Datos en memoria. Emula los triggers/RPC del CRM lo justo para probar la interfaz.
const http = require('http'), fs = require('fs'), path = require('path'), url = require('url');
const REPO = path.resolve(__dirname, '..'); // raíz del repo NEXUS PRO
const PORT = Number(process.env.PORT || 8942);
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = () => new Date().toISOString();
const dias = (d) => new Date(Date.now() + d * 86400000).toISOString();

const AG = [
  { id: uuid(101), nom: 'Esterlin Espinal', activo: true, tel: '8090000001', cargo: 'ADMIN' },
  { id: uuid(102), nom: 'Robinson Perez', activo: true, tel: '8090000002', cargo: 'AGENTE' },
  { id: uuid(103), nom: 'Maria Gomez', activo: true, tel: '8090000003', cargo: 'AGENTE' },
];
const CLI = [];
const FAC = [];
const nombres = ['Maria Perez', 'Juan Rodriguez', 'Ana Martinez', 'Pedro Sanchez', 'Luisa Fernandez', 'Carlos Diaz', 'Rosa Jimenez', 'Miguel Torres'];
nombres.forEach((nom, i) => {
  const id = uuid(200 + i);
  const pagado = [8000, 4000, 0, 12000, 8000, 2000, 4000, 8000][i];
  CLI.push({ id, nom, cedula: `001-00000${i}0-1`, wa: `1809555000${i}`, tel: `809555000${i}`, ars: i === 5 ? '' : ['ARS Humano', 'ARS Universal', 'ARS Senasa'][i % 3], plan: 'Básico', activo: true,
    estado_cliente: i === 6 ? 'EN_PROCESO' : 'ACTIVO', motivo_proceso: i === 6 ? 'Falta cédula' : null, fecha_seguimiento: i === 6 ? dias(2).slice(0, 10) : null,
    pagado, deuda_total: 8000, deuda_anterior: 0, deps: i % 2 ? [{ nom: 'Dep Uno', rel: 'Hijo/a' }] : [], numero_poliza: i < 6 ? `POL-${1000 + i}` : null,
    agente_id: AG[i % 3].id, precio_titular: 4000, precio_dep: 1000, fecha_inicio: '2025-01-15', dia_facturacion: 20, created_at: '2025-01-15T12:00:00Z', email: '' });
  // Dos facturas viejas (2020) por cliente: quien pagó menos queda atrasado (misma fórmula que Avisos).
  ['2020-01', '2020-02'].forEach((per, j) => FAC.push({ id: uuid(3000 + i * 10 + j), cliente_id: id, periodo: per, prima_base: 4000, prima_deps: 0, total: 4000, estado: 'Pendiente', mes: j + 1, anio: 2020, created_at: '2020-0' + (j + 1) + '-20T12:00:00Z' }));
});

let TAREAS = [];
let ACTS = [];
// 12 pendientes: 4 vencidas (más de las 8 que veía la agenda vieja), 1 de hoy, 7 futuras; 1 completada.
for (let i = 0; i < 12; i++) {
  const c = CLI[i % CLI.length];
  const vence = i < 4 ? dias(-(i + 1)) : i === 4 ? new Date(Date.now() + 60 * 60000).toISOString() : dias(i);
  TAREAS.push({ id: uuid(400 + i), cliente_id: c.id, actividad_id: null, titulo: `Seguimiento ${i + 1} de ${c.nom.split(' ')[0]}`, tipo: ['seguimiento', 'documento', 'cobro', 'afiliacion'][i % 4], prioridad: i % 5 === 0 ? 'alta' : 'media', estado: 'pendiente', vence_en: vence, asignado_agente_id: AG[i % 3].id, completada_en: null, creado_por: null, created_at: dias(-10), updated_at: dias(-10) });
}
TAREAS.push({ id: uuid(499), cliente_id: CLI[0].id, actividad_id: null, titulo: 'Tarea vieja ya hecha', tipo: 'seguimiento', prioridad: 'media', estado: 'completada', vence_en: dias(-20), asignado_agente_id: AG[0].id, completada_en: dias(-19), creado_por: null, created_at: dias(-25), updated_at: dias(-19) });
CLI.forEach((c, i) => ACTS.push({ id: uuid(520 + i), cliente_id: c.id, tipo: 'nota', titulo: 'Cliente registrado en el CRM', detalle: null, resultado: null, proxima_accion_en: null, creado_por: null, created_at: dias(-30), updated_at: dias(-30) }));
ACTS.push({ id: uuid(500), cliente_id: CLI[0].id, tipo: 'llamada', titulo: 'Llamada de bienvenida', detalle: 'Cliente contento con el plan', resultado: null, proxima_accion_en: null, creado_por: null, created_at: dias(-3), updated_at: dias(-3) });
ACTS.push({ id: uuid(501), cliente_id: CLI[0].id, tipo: 'whatsapp', titulo: 'Envió documentos', detalle: null, resultado: 'ok', proxima_accion_en: dias(2), creado_por: null, created_at: dias(-1), updated_at: dias(-1) });

let PROS = [], HIST = [];
let prospectosActivos = true, fallarSiguientePatch = false;
function seedPros() {
  PROS = []; HIST = [];
  const mk = (n, o) => ({ id: uuid(600 + n), nombre: o.nombre, telefono: o.tel, cedula: null, interes: o.interes || 'Plan de salud familiar', aseguradora: o.ars || null, origen: o.origen || 'WhatsApp', etapa: o.etapa || 'nuevo', motivo_perdida: o.motivo || null, motivo_detalle: null, asignado_agente_id: o.ag || AG[1].id, cliente_id: o.cliente_id || null, numero_poliza: null, prima_estimada: o.prima || null, notas: o.notas || null, creado_por: null, etapa_cambiada_en: o.cambio || now(), created_at: o.cambio || now(), updated_at: now() });
  PROS.push(mk(1, { nombre: 'Prospecto Nuevo Uno', tel: '8291110001', prima: 3500, notas: 'Quiere cobertura para dos hijos' }));
  PROS.push(mk(2, { nombre: 'Prospecto Frio Dos', tel: '8291110002', cambio: dias(-12), ag: AG[2].id }));
  PROS.push(mk(3, { nombre: 'Prospecto Cotizado Tres', tel: '8291110003', etapa: 'cotizado', cambio: dias(-2), ars: 'ARS Humano' }));
  PROS.push(mk(4, { nombre: 'Prospecto Documentos Cuatro', tel: '8291110004', etapa: 'documentos', cambio: dias(-1) }));
  PROS.push(mk(5, { nombre: 'Prospecto Perdido Cinco', tel: '8291110005', etapa: 'perdida', motivo: 'no_respondio', cambio: dias(-3) }));
  PROS.forEach(p => HIST.push({ id: uuid(7000 + HIST.length), prospecto_id: p.id, tipo: 'etapa', etapa_anterior: null, etapa_nueva: 'nuevo', agente_id: p.asignado_agente_id, usuario_id: null, fecha: p.created_at, nota: 'Prospecto creado' }));
}
seedPros();

const DB = {
  clientes: CLI, agentes: AG, facturas: FAC,
  usuarios_sistema: [{ id: uuid(1), nom: 'Esterlin Espinal', rol: 'admin', login: 'admin', activo: true, organizacion_id: uuid(9) }, { id: uuid(2), nom: 'Robinson Perez', rol: 'agente', login: 'robinson', activo: true, organizacion_id: uuid(9) }],
  organizaciones: [{ id: uuid(9), slug: 'nexus-pro', nombre: 'NEXUS PRO Seguros', tipo: 'seguros' }],
  configuracion: [], empresas: [], abonos: [], auditoria: [], prestamos: [], usuario_preferencias: [],
  get crm_tareas() { return TAREAS; }, set crm_tareas(v) { TAREAS = v; },
  get crm_actividades() { return ACTS; }, set crm_actividades(v) { ACTS = v; },
  get crm_prospectos() { return PROS; }, set crm_prospectos(v) { PROS = v; },
  get crm_prospectos_historial() { return HIST; }, set crm_prospectos_historial(v) { HIST = v; },
};
const LOG = [];
let seq = 9000;

function filtrar(rows, qs) {
  let out = rows.slice();
  for (const [k, v] of qs.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
    const m = /^(eq|neq|lt|gt|lte|gte|in|is|ilike|like)\.(.*)$/s.exec(v); if (!m) continue;
    const op = m[1], val = m[2];
    out = out.filter(r => {
      const x = r[k];
      if (op === 'eq') return String(x) === val;
      if (op === 'neq') return String(x) !== val;
      if (op === 'lt') return x != null && String(x) < val;
      if (op === 'gt') return x != null && String(x) > val;
      if (op === 'lte') return x != null && String(x) <= val;
      if (op === 'gte') return x != null && String(x) >= val;
      if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(x));
      if (op === 'is') return val === 'null' ? x == null : val === 'true' ? x === true : x === false;
      return true;
    });
  }
  const order = qs.get('order');
  if (order) {
    const partes = order.split(',').map(o => { const p = o.split('.'); return { col: p[0], desc: p.includes('desc'), nullslast: p.includes('nullslast') }; });
    out.sort((a, b) => { for (const p of partes) { const x = a[p.col], y = b[p.col]; if (x == null && y == null) continue; if (x == null) return p.nullslast ? 1 : -1; if (y == null) return p.nullslast ? -1 : 1; if (x < y) return p.desc ? 1 : -1; if (x > y) return p.desc ? -1 : 1; } return 0; });
  }
  const lim = Number(qs.get('limit')); if (lim) out = out.slice(0, lim);
  const sel = qs.get('select');
  if (sel && sel !== '*') { const cols = sel.split(',').map(s => s.trim()); out = out.map(r => { const o = {}; cols.forEach(c => { if (c in r) o[c] = r[c]; }); return o; }); }
  return out;
}
function pgErr(res, code, status, msg) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code, message: msg, details: null, hint: null })); }
function json(res, data, status = 200) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(data === null ? '' : JSON.stringify(data)); }
function body(req) { return new Promise(r => { let s = ''; req.on('data', c => s += c); req.on('end', () => { try { r(s ? JSON.parse(s) : null); } catch (e) { r(null); } }); }); }

function triggerPros(row, old) {
  row.updated_at = now();
  if (!old) {
    row.etapa_cambiada_en = row.etapa_cambiada_en || now();
    HIST.push({ id: uuid(seq++), prospecto_id: row.id, tipo: 'etapa', etapa_anterior: null, etapa_nueva: row.etapa, agente_id: row.asignado_agente_id || null, usuario_id: null, fecha: now(), nota: 'Prospecto creado' });
    return;
  }
  if (row.etapa !== old.etapa) {
    row.etapa_cambiada_en = now();
    if (row.etapa !== 'perdida') { row.motivo_perdida = null; row.motivo_detalle = null; }
    if (row.etapa === 'perdida' && !row.motivo_perdida) throw new Error('23514 check constraint crm_prospectos_perdida_check');
    if (row.etapa === 'emitida' && !row.cliente_id) throw new Error('23514 check constraint crm_prospectos_emitida_check');
    HIST.push({ id: uuid(seq++), prospecto_id: row.id, tipo: 'etapa', etapa_anterior: old.etapa, etapa_nueva: row.etapa, agente_id: null, usuario_id: null, fecha: now(), nota: row.etapa === 'perdida' ? 'Motivo: ' + row.motivo_perdida + (row.motivo_detalle ? ' · ' + row.motivo_detalle : '') : row.etapa === 'emitida' ? 'Cliente vinculado' + (row.numero_poliza ? ' · póliza ' + row.numero_poliza : '') : null });
  } else row.etapa_cambiada_en = old.etapa_cambiada_en;
}

async function rest(req, res, u) {
  const parts = u.pathname.replace(/^\/supa\/rest\/v1\//, '').split('/');
  const qs = u.searchParams;
  if (parts[0] === 'rpc') {
    const b = await body(req) || {};
    const fn = parts[1];
    LOG.push({ m: req.method, t: 'rpc/' + fn, b });
    if (fn === 'crm_registrar_actividad') {
      if (!b.p_cliente_id) return pgErr(res, 'P0001', 400, 'cliente requerido');
      const tit = String(b.p_titulo || '').trim().slice(0, 160); if (tit.length < 2) return pgErr(res, 'P0001', 400, 'titulo requerido');
      const a = { id: uuid(seq++), cliente_id: b.p_cliente_id, tipo: b.p_tipo, titulo: tit, detalle: b.p_detalle || null, resultado: b.p_resultado || null, proxima_accion_en: b.p_proxima_accion_en || null, creado_por: null, created_at: now(), updated_at: now() };
      ACTS.push(a); let t = null;
      if (b.p_crear_tarea) { t = { id: uuid(seq++), cliente_id: b.p_cliente_id, actividad_id: a.id, titulo: String(b.p_tarea_titulo || ('Seguimiento: ' + tit)).slice(0, 160), tipo: b.p_tarea_tipo || 'seguimiento', prioridad: b.p_prioridad || 'media', estado: 'pendiente', vence_en: b.p_proxima_accion_en || null, asignado_agente_id: b.p_asignado_agente_id || null, completada_en: null, creado_por: null, created_at: now(), updated_at: now() }; TAREAS.push(t); }
      return json(res, [{ actividad_id: a.id, tarea_id: t ? t.id : null }]);
    }
    if (fn === 'crm_completar_tarea') {
      const t = TAREAS.find(x => x.id === b.p_tarea_id); if (!t) return pgErr(res, 'P0001', 400, 'tarea no encontrada');
      if (t.estado !== 'completada') { t.estado = 'completada'; t.completada_en = now(); t.updated_at = now(); ACTS.push({ id: uuid(seq++), cliente_id: t.cliente_id, tipo: 'nota', titulo: ('Tarea completada: ' + t.titulo).slice(0, 160), detalle: null, resultado: null, proxima_accion_en: null, creado_por: null, created_at: now(), updated_at: now() }); }
      return json(res, [{ tarea_id: t.id, actividad_id: null }]);
    }
    return json(res, null);
  }
  const table = parts[0];
  if ((table === 'crm_prospectos' || table === 'crm_prospectos_historial') && !prospectosActivos) return pgErr(res, 'PGRST205', 404, `Could not find the table 'public.${table}' in the schema cache`);
  if (!(table in DB)) { LOG.push({ m: req.method, t: table, desconocida: true }); return json(res, []); }
  if (req.method === 'GET') { LOG.push({ m: 'GET', t: table, q: u.search }); return json(res, filtrar(DB[table], qs)); }
  if (req.method === 'POST') {
    const b = await body(req); const rows = Array.isArray(b) ? b : [b];
    LOG.push({ m: 'POST', t: table, b });
    const out = rows.map(r => { const row = { id: uuid(seq++), created_at: now(), updated_at: now(), ...r }; if (table === 'crm_prospectos') triggerPros(row, null); if (table === 'crm_prospectos_historial') { row.fecha = row.fecha || now(); if (row.tipo !== 'nota') throw new Error('42501 row-level security'); } DB[table].push(row); return row; });
    return json(res, out, 201);
  }
  if (req.method === 'PATCH') {
    const b = await body(req) || {}; LOG.push({ m: 'PATCH', t: table, q: u.search, b });
    if (table === 'crm_prospectos' && fallarSiguientePatch) { fallarSiguientePatch = false; return pgErr(res, 'XX000', 500, 'simulated failure'); }
    const objetivo = filtrar(DB[table], new url.URLSearchParams([...qs.entries()].filter(([k]) => !['select', 'order', 'limit'].includes(k))));
    const out = [];
    try {
      objetivo.forEach(r => { const old = { ...r }; Object.assign(r, b); if (table === 'crm_prospectos') triggerPros(r, old); r.updated_at = now(); out.push(r); });
    } catch (e) { return pgErr(res, '23514', 400, e.message); }
    return json(res, out);
  }
  if (req.method === 'DELETE') { const objetivo = filtrar(DB[table], qs); DB[table] = DB[table].filter(r => !objetivo.includes(r)); return json(res, null, 204); }
  json(res, []);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const u = new url.URL(req.url, `http://127.0.0.1:${PORT}`);
  try {
    if (u.pathname.startsWith('/__qa/')) {
      const [, , cmd, val] = u.pathname.split('/');
      if (cmd === 'prospectos') { prospectosActivos = val === '1'; if (val === 'reset') { prospectosActivos = true; seedPros(); } return json(res, { prospectosActivos }); }
      if (cmd === 'orgtipo') { DB.organizaciones[0].tipo = val || 'seguros'; return json(res, DB.organizaciones[0]); }
      if (cmd === 'fallar') { fallarSiguientePatch = val === '1'; return json(res, { fallarSiguientePatch }); }
      if (cmd === 'log') return json(res, LOG);
      if (cmd === 'estado') return json(res, { tareas: TAREAS, pros: PROS, hist: HIST, acts: ACTS });
      return json(res, { ok: true });
    }
    if (u.pathname.startsWith('/supa/')) return await rest(req, res, u);
    let p = u.pathname === '/' ? '/index.html' : u.pathname;
    const file = path.join(REPO, decodeURIComponent(p));
    if (!file.startsWith(REPO) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { LOG.push({ error: String(e) }); res.writeHead(500); res.end(String(e)); }
});
server.listen(PORT, () => console.log('QA server en http://127.0.0.1:' + PORT));
