import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.112.2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// La clave de Anthropic YA NO va escrita aquí (auditoría de seguridad, 3-ago-2026).
// Se lee de un Secret del proyecto. `.trim()` a propósito, mismo criterio que GMAIL_PASS
// en enviar-reporte-email: ya pasó una vez que un secreto se guardó con basura pegada.
const ANTHROPIC_KEY = (Deno.env.get('ANTHROPIC_API_KEY') || '').trim();
const ANTHROPIC_TIMEOUT_MS = 30000;
const MAX_PREGUNTA_CHARS = 2000;
const MAX_BODY_BYTES = 8192;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function pend(c: any): number { return Math.max(0, (Number(c.deuda_total) || 0) - (Number(c.pagado) || 0)); }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── QUIÉN PUEDE PREGUNTARLE A NEXUS SMART (auditoría de seguridad, 3-ago-2026) ───
// Antes cualquiera en internet mandaba un POST y recibía la lista completa de clientes
// (cédula, WhatsApp, deuda, cuentas bancarias) sin sesión. `verify_jwt` se queda en FALSE
// a propósito — activarlo NO cierra el hueco por sí solo: la clave anónima es PÚBLICA (va
// escrita en index.html) y el gateway la acepta como un JWT válido igual que un token real.
// El candado real vive AQUÍ: se exige un token de un usuario logueado con rol admin —
// mismo patrón ya probado en enviar-reporte-email (quienLlama()).
async function esAdmin(req: Request, supabase: any): Promise<{ ok: boolean; quien: string; userId: string | null }> {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, quien: 'sin credencial', userId: null };

  // Nexus Smart es una función interactiva del navegador. No admite el service role
  // como atajo: toda consulta debe quedar ligada a una sesión humana real.
  if (token === SERVICE_KEY) return { ok: false, quien: 'credencial de servicio no permitida', userId: null };
  try {
    const { data, error: authError } = await supabase.auth.getUser(token);
    if (authError) return { ok: false, quien: 'credencial inválida', userId: null };
    const user = data?.user;
    if (!user) return { ok: false, quien: 'credencial sin usuario', userId: null };

    const { data: perfil, error: perfilError } = await supabase
      .from('profiles')
      .select('rol, usuario_sistema_id, activo')
      .eq('id', user.id)
      .maybeSingle();
    if (perfilError || !perfil?.usuario_sistema_id || perfil.activo === false || perfil.rol !== 'admin') {
      return { ok: false, quien: 'usuario sin permiso', userId: user.id };
    }

    const [{ data: usuario, error: usuarioError }, { data: org, error: orgError }] = await Promise.all([
      supabase.from('usuarios_sistema').select('organizacion_id, activo').eq('id', perfil.usuario_sistema_id).maybeSingle(),
      supabase.from('organizaciones').select('id').eq('slug', 'nexus-pro').maybeSingle(),
    ]);
    if (usuarioError || orgError || !usuario?.organizacion_id || usuario.activo === false || !org?.id || usuario.organizacion_id !== org.id) {
      return { ok: false, quien: 'organización no autorizada', userId: user.id };
    }

    return { ok: true, quien: 'admin ' + (user.email || user.id), userId: user.id };
  } catch (_) { return { ok: false, quien: 'credencial inválida', userId: null }; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido.' }, 405);

  const tStart = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const permiso = await esAdmin(req, supabase);
    if (!permiso.ok) {
      console.warn('nexus-smart acceso rechazado:', permiso.quien);
      return json({ ok: false, error: 'No autorizado. Nexus Smart solo responde a un administrador activo de NEXUS PRO.' }, 401);
    }

    if (!ANTHROPIC_KEY) {
      console.error('nexus-smart: falta ANTHROPIC_API_KEY');
      return json({ ok: false, error: 'Nexus Smart no está configurado temporalmente.' }, 503);
    }

    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return json({ ok: false, error: 'Solicitud demasiado grande.' }, 413);

    let body: any;
    try { body = await req.json(); }
    catch { return json({ ok: false, error: 'Solicitud inválida.' }, 400); }

    const pregunta = String(body?.pregunta || '').trim();
    if (!pregunta) {
      return json({ ok: false, error: 'Pregunta vacía.' }, 400);
    }
    if (pregunta.length > MAX_PREGUNTA_CHARS) return json({ ok: false, error: 'La pregunta supera el límite permitido.' }, 400);

    const hoy = new Date().toISOString().slice(0, 10);

    const [clientesRes, facturasRes, abonosRes, agentesRes, empresasRes, entregasRes, transferRes, cuentasRes, cfgRes] = await Promise.all([
      supabase.from('clientes').select('id, nom, cedula, wa, tel, email, plan, activo, estado_cliente, deuda_total, pagado, fecha_inicio, fecha_fin, agente_id, empresa_id, numero_poliza, dia_facturacion, vip, referencia, dir, precio_titular, precio_dep').limit(500),
      supabase.from('facturas').select('id, cliente_nom, cliente_id, total, estado, fecha_emision, mes, ncf').order('fecha_emision', { ascending: false }).limit(300),
      supabase.from('abonos').select('id, monto, cliente_id, fecha, metodo, banco, referencia, comprobante_url').order('fecha', { ascending: false }).limit(200),
      supabase.from('agentes').select('id, nom, activo, cargo, tel'),
      supabase.from('empresas').select('id, nom'),
      supabase.from('entregas_admin').select('id, monto, fecha, metodo, banco, referencia, confirmado, es_directo, cobro_id, agente_id, comprobante_url').order('fecha', { ascending: false }).limit(100),
      supabase.from('transferencias_agentes').select('id, monto, fecha, desde_agente, hacia_agente, estado').eq('estado', 'aceptada').order('fecha', { ascending: false }).limit(50),
      supabase.from('mis_cuentas_bancarias').select('banco, numero, tipo'),
      supabase.from('configuracion').select('clave, valor')
    ]);

    const consultas = [
      ['clientes', clientesRes], ['facturas', facturasRes], ['abonos', abonosRes],
      ['agentes', agentesRes], ['empresas', empresasRes], ['entregas', entregasRes],
      ['transferencias', transferRes], ['cuentas', cuentasRes], ['configuracion', cfgRes],
    ] as const;
    const consultaFallida = consultas.find(([, resultado]) => resultado.error);
    if (consultaFallida) {
      console.error('nexus-smart: consulta fallida', consultaFallida[0], consultaFallida[1].error?.message);
      return json({ ok: false, error: 'No se pudieron cargar todos los datos necesarios. Intenta nuevamente.' }, 503);
    }

    const clientes = clientesRes.data || [];
    const facturas = facturasRes.data || [];
    const abonos = abonosRes.data || [];
    const agentes = agentesRes.data || [];
    const empresas = empresasRes.data || [];
    const entregas = entregasRes.data || [];
    const transferencias = transferRes.data || [];
    const cuentas = cuentasRes.data || [];
    const cfg: any = {};
    for (const it of cfgRes.data || []) cfg[it.clave] = it.valor;

    const agMap: any = {}; for (const a of agentes) agMap[a.id] = a.nom;
    const empMap: any = {}; for (const e of empresas) empMap[e.id] = e.nom;
    const cliMap: any = {}; for (const c of clientes) cliMap[c.id] = c.nom;

    const act = clientes.filter((c: any) => c.activo);
    const totalCartera = act.reduce((s: number, c: any) => s + (Number(c.deuda_total) || 0), 0);
    const totalCobrado = act.reduce((s: number, c: any) => s + (Number(c.pagado) || 0), 0);
    const totalDebido = act.reduce((s: number, c: any) => s + pend(c), 0);
    const pagaronDeMas = act.filter((c:any) => (Number(c.pagado)||0) > (Number(c.deuda_total)||0));
    const excesoPagado = pagaronDeMas.reduce((s:number,c:any)=>s+((Number(c.pagado)||0)-(Number(c.deuda_total)||0)),0);

    const abonosHoy = abonos.filter((a: any) => a.fecha === hoy);
    const cobradoHoy = abonosHoy.reduce((s: number, a: any) => s + Number(a.monto || 0), 0);
    const mesActual = hoy.slice(0, 7);
    const cobradoMes = abonos.filter((a: any) => (a.fecha||'').slice(0,7) === mesActual).reduce((s: number, a: any) => s + Number(a.monto || 0), 0);

    const sinWhatsapp = act.filter((c: any) => !c.wa || c.wa.trim() === '').map((c: any) => c.nom);
    const conWhatsapp = act.filter((c: any) => c.wa && c.wa.trim() !== '').length;
    const sinAgente = act.filter((c: any) => !c.agente_id).map((c: any) => c.nom);
    const sinCedula = act.filter((c: any) => !c.cedula || c.cedula.trim() === '').map((c: any) => c.nom);
    const vips = act.filter((c: any) => c.vip).map((c: any) => c.nom);
    const inhabilitados = clientes.filter((c: any) => !c.activo).map((c: any) => c.nom);
    const enProceso = act.filter((c: any) => c.estado_cliente === 'EN_PROCESO').map((c: any) => c.nom);
    const adelantados = pagaronDeMas.map((c:any)=>({ nom: c.nom, debia: Number(c.deuda_total)||0, pago: Number(c.pagado)||0, de_mas: (Number(c.pagado)||0)-(Number(c.deuda_total)||0) }));

    const hoyD = new Date();
    const morososSet = new Set<string>();
    facturas.forEach((f: any) => {
      const e = (f.estado || '').toLowerCase();
      if ((e === 'pendiente' || e === 'parcial') && f.fecha_emision) {
        const dias = Math.floor((hoyD.getTime() - new Date(f.fecha_emision).getTime()) / 86400000);
        if (dias > 30) morososSet.add(f.cliente_nom || '');
      }
    });
    const morosos = Array.from(morososSet).filter(Boolean);

    const listaClientes = act.map((c: any) => ({
      nombre: c.nom, plan: c.plan, poliza: c.numero_poliza || null,
      cedula: c.cedula || null, whatsapp: c.wa || null, telefono: c.tel || null,
      email: c.email || null, agente: agMap[c.agente_id] || 'Sin agente',
      empresa: empMap[c.empresa_id] || null, debe: pend(c), pagado: Number(c.pagado)||0,
      vip: !!c.vip, estado: c.estado_cliente || 'ACTIVO', dia_facturacion: c.dia_facturacion || null,
      vence: c.fecha_fin || null
    }));

    const topDeudores = act.filter((c: any) => pend(c) > 0)
      .map((c: any) => ({ nom: c.nom, debe: pend(c), tel: c.tel, wa: c.wa, agente: agMap[c.agente_id] || 'Sin agente' }))
      .sort((a: any, b: any) => b.debe - a.debe).slice(0, 30);

    const planes = [...new Set(act.map((c: any) => c.plan))];
    const porPlan = planes.map(p => ({ plan: p, cantidad: act.filter((c: any) => c.plan === p).length, cartera: act.filter((c:any)=>c.plan===p).reduce((s:number,c:any)=>s+(Number(c.deuda_total)||0),0) }));
    const porAgente = agentes.map((a: any) => {
      const clis = act.filter((c: any) => String(c.agente_id) === String(a.id));
      return { agente: a.nom, cargo: a.cargo, clientes: clis.length, cartera: clis.reduce((s:number,c:any)=>s+(Number(c.deuda_total)||0),0), cobrado: clis.reduce((s:number,c:any)=>s+(Number(c.pagado)||0),0) };
    });

    const cobrosRecientes = abonos.slice(0, 30).map((a: any) => ({
      cliente: cliMap[a.cliente_id] || 'Desconocido', monto: Number(a.monto)||0, fecha: a.fecha, metodo: a.metodo, banco: a.banco || null
    }));

    const entregasPend = entregas.filter((e:any)=>!e.confirmado).map((e:any)=>({
      cliente: cliMap[e.cobro_id] || null, agente: agMap[e.agente_id] || null,
      monto: Number(e.monto)||0, metodo: e.metodo, banco: e.banco, fecha: e.fecha,
      directo: !!e.es_directo, tiene_bauche: !!e.comprobante_url
    }));

    const facturasResumen = {
      total: facturas.length,
      pagadas: facturas.filter((f:any)=>(f.estado||'').toLowerCase()==='pagado').length,
      pendientes: facturas.filter((f:any)=>(f.estado||'').toLowerCase()==='pendiente').length,
      parciales: facturas.filter((f:any)=>(f.estado||'').toLowerCase()==='parcial').length,
      monto_pendiente: facturas.filter((f:any)=>['pendiente','parcial'].includes((f.estado||'').toLowerCase())).reduce((s:number,f:any)=>s+Number(f.total||0),0)
    };

    const contexto = {
      empresa: cfg['empresa_nom'] || 'CORREDORES DE SEGURO JM',
      fecha_hoy: hoy,
      resumen: {
        clientes_activos: act.length, clientes_inhabilitados: inhabilitados.length,
        clientes_en_proceso: enProceso.length, agentes_activos: agentes.filter((a:any)=>a.activo).length,
        cartera_total: totalCartera, cobrado_total: totalCobrado, total_pendiente: totalDebido,
        pct_cobranza: totalCartera > 0 ? Math.round(totalCobrado/totalCartera*100) : 0,
        cobrado_hoy: cobradoHoy, cobros_hoy_cantidad: abonosHoy.length, cobrado_mes: cobradoMes,
        con_whatsapp: conWhatsapp, sin_whatsapp: sinWhatsapp.length, vips: vips.length,
        clientes_pagaron_adelantado: pagaronDeMas.length, monto_pagado_adelantado: excesoPagado
      },
      facturas: facturasResumen,
      listas: {
        clientes_sin_whatsapp: sinWhatsapp, clientes_sin_agente: sinAgente,
        clientes_sin_cedula: sinCedula, clientes_vip: vips,
        clientes_inhabilitados: inhabilitados, clientes_en_proceso: enProceso,
        clientes_morosos_30dias: morosos,
        clientes_pagaron_adelantado: adelantados
      },
      top_deudores: topDeudores,
      por_plan: porPlan,
      por_agente: porAgente,
      cobros_recientes: cobrosRecientes,
      depositos_pendientes_confirmar: entregasPend,
      transferencias_entre_agentes: transferencias.map((t:any)=>({ monto: Number(t.monto)||0, fecha: t.fecha, desde: agMap[t.desde_agente]||t.desde_agente, hacia: agMap[t.hacia_agente]||t.hacia_agente })),
      cuentas_bancarias: cuentas.map((c:any)=>({ banco: c.banco, numero: c.numero, tipo: c.tipo })),
      clientes_completo: listaClientes
    };

    const systemPrompt = `Eres NEXUS Smart, el asistente inteligente de una correduria de seguros de salud en Republica Dominicana llamada "${contexto.empresa}".

Eres el asistente del ADMINISTRADOR (dueno). Tienes acceso COMPLETO a los datos del sistema.

=== CONCEPTOS IMPORTANTES (entiende bien antes de responder) ===

1. CONTEO DE CLIENTES: Los clientes "en proceso" YA ESTAN INCLUIDOS dentro de los "activos". NO los sumes aparte. El total de clientes del sistema = activos + inhabilitados. Ejemplo: si hay 98 activos (de los cuales 10 estan en proceso) y 8 inhabilitados, el total es 106 clientes, NO 116.

2. CLIENTES QUE PAGAN ADELANTADO: Algunos clientes pagan varios meses por adelantado. Por eso su campo "pagado" puede ser MAYOR que su "deuda_total". Esto es NORMAL y correcto, NO es un error. Los tienes en la lista clientes_pagaron_adelantado.

3. CALCULO DEL PENDIENTE: El "total_pendiente" se calcula sumando solo lo que cada cliente debe de verdad: por cada cliente max(0, deuda - pagado), luego sumar. NO es igual a (cartera_total - cobrado_total) porque los pagos adelantados inflan el cobrado_total. Confia en el campo total_pendiente que te doy, es el correcto.

4. CARTERA vs FACTURAS: cartera_total es la suma de deuda_total de activos (lo esperado segun polizas). El monto_pendiente de facturas es de facturas emitidas. Pueden diferir por pagos adelantados o meses no facturados. Ambos correctos, miden cosas distintas.

=== REGLAS DE RESPUESTA ===
- Espanol dominicano, profesional pero cercano. Emojis con moderacion.
- Dinero en formato RD$ X,XXX.
- Cuando pidan listas de clientes, usa los datos REALES y nombra a los clientes. Si son mas de 25, di el total y nombra los primeros 25.
- Tienes: clientes_completo (lista con TODOS los datos), listas especiales (sin whatsapp, morosos, vip, adelantados), facturas, cobros, depositos pendientes, transferencias, cuentas bancarias, resumen por plan y por agente.
- Puedes calcular, comparar, redactar mensajes de cobro, dar recomendaciones.
- NUNCA inventes ni reportes "errores" en los datos. Si algo parece no cuadrar, es por los conceptos de arriba. Confia en los campos del resumen.
- Si un dato realmente no esta, dilo con naturalidad.

DATOS COMPLETOS DEL SISTEMA (${contexto.fecha_hoy}):
${JSON.stringify(contexto, null, 2)}`;

    let apiResp: Response;
    try {
      apiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001', max_tokens: 1800,
          system: systemPrompt, messages: [{ role: 'user', content: pregunta }]
        }),
        signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
      });
    } catch (e) {
      console.error('nexus-smart: Anthropic no respondió:', e instanceof Error ? e.message : String(e));
      try { await supabase.from('smart_historial').insert({ pregunta, respuesta: null, error: 'proveedor_no_disponible', duracion_ms: Date.now()-tStart }); } catch(_) {}
      return json({ ok: false, error: 'El servicio de IA no respondió a tiempo. Intenta nuevamente.' }, 504);
    }

    if (!apiResp.ok) {
      const err = await apiResp.text();
      try { await supabase.from('smart_historial').insert({ pregunta, respuesta: null, error: err.slice(0,500), duracion_ms: Date.now()-tStart }); } catch(_) {}
      console.error('nexus-smart: Anthropic respondió', apiResp.status, err.slice(0, 500));
      return json({ ok: false, error: 'El servicio de IA no pudo responder en este momento.' }, 502);
    }

    const apiData = await apiResp.json();
    const respuesta = apiData.content?.[0]?.text || 'Sin respuesta';
    const tokensUsados = (apiData.usage?.input_tokens || 0) + (apiData.usage?.output_tokens || 0);

    try { await supabase.from('smart_historial').insert({ pregunta, respuesta, tokens_usados: tokensUsados, duracion_ms: Date.now()-tStart }); } catch(_) {}

    return json({ ok: true, respuesta, tokens: tokensUsados, duracion_ms: Date.now()-tStart });

  } catch (e) {
    console.error('nexus-smart: error interno:', e instanceof Error ? (e.stack || e.message) : String(e));
    return json({ ok: false, error: 'Error interno de Nexus Smart.' }, 500);
  }
});
