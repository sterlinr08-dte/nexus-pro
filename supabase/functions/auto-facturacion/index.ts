// auto-facturacion — v8 (REAL_BLINDADO_V2) + seguridad 28-sep-2026:
//   · solo corre con x-cron-token = cron_secretos('auto_facturacion') (lo envía run_auto_facturacion() desde pg_cron);
//     antes cualquiera en internet podía dispararla (verify_jwt=false y sin clave);
//   · la respuesta ya no trae nombres de clientes, NCF ni montos: solo totales. El detalle completo sigue en auto_jobs_log.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const token = (req.headers.get("x-cron-token") || "").trim();
  const { data: sec } = await supabase.from("cron_secretos").select("valor").eq("nombre", "auto_facturacion").maybeSingle();
  if (!sec?.valor || token !== String(sec.valor)) return Response.json({ ok: false, error: "no_autorizado" }, { status: 401 });

  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();
  const periodo = `${anio}-${String(mes).padStart(2, "0")}`;

  const resultado: any = {
    modo: "REAL_BLINDADO_V2",
    mensaje: "Facturación automática real. v2: precios de PLAN (no costo), dependientes parseados (deps TEXT) y permitir_facturacion null-safe.",
    fecha: hoy.toISOString(),
    periodo,
    clientes_revisados: 0,
    facturas_generadas: 0,
    omitidos: [],
    generadas: [],
    errores: []
  };

  try {
    const { data: config } = await supabase
      .from("configuracion")
      .select("clave, valor");

    const precios: any = {};
    for (const item of config || []) {
      precios[item.clave] = Number(item.valor || 0);
    }

    // Solo activos; permitir_facturacion se evalúa en JS (null = SÍ facturar, igual que la app)
    const { data: clientes, error: clientesError } = await supabase
      .from("clientes")
      .select("id, nom, plan, empresa_id, activo, permitir_facturacion, dia_facturacion, tipo_ncf, deps, deuda_total, pagado, precio_titular, precio_dep")
      .eq("activo", true);

    if (clientesError) throw clientesError;

    resultado.clientes_revisados = clientes?.length || 0;

    for (const cliente of clientes || []) {
      try {
        if (cliente.permitir_facturacion === false) {
          resultado.omitidos.push({ cliente: cliente.nom || "SIN NOMBRE", razon: "Facturación automática desactivada" });
          continue;
        }
        if (!cliente.id || !cliente.nom) {
          resultado.omitidos.push({ cliente: cliente.nom || "SIN NOMBRE", razon: "Cliente sin ID o nombre válido" });
          continue;
        }
        if (!cliente.dia_facturacion || Number(cliente.dia_facturacion) < 1 || Number(cliente.dia_facturacion) > 31) {
          resultado.omitidos.push({ cliente: cliente.nom, razon: "Día de facturación inválido", dia_facturacion: cliente.dia_facturacion });
          continue;
        }
        if (!cliente.plan) {
          resultado.omitidos.push({ cliente: cliente.nom, razon: "Cliente sin plan asignado" });
          continue;
        }
        if (Number(cliente.dia_facturacion) !== diaHoy) {
          resultado.omitidos.push({ cliente: cliente.nom, razon: "Hoy no es su día de facturación", dia_facturacion: cliente.dia_facturacion, dia_hoy: diaHoy });
          continue;
        }

        // PRECIOS DE PLAN (lo que PAGA el cliente). OJO: costo_* es lo que le cuesta al negocio — NO usar aquí.
        const plan = cliente.plan || "";
        const planKey = plan.toLowerCase();
        let precioTitularPlan = 0;
        let precioDepPlan = 0;

        if (planKey.includes("básico") || planKey.includes("basico")) {
          precioTitularPlan = precios.prima_basico || 0;
          precioDepPlan = precios.dep_basico || 0;
        } else if (planKey.includes("superior")) {
          precioTitularPlan = precios.prima_superior || 0;
          precioDepPlan = precios.dep_superior || 0;
        } else if (planKey.includes("esencial")) {
          precioTitularPlan = precios.prima_esencial || 0;
          precioDepPlan = precios.dep_esencial || 0;
        }

        // Precio ESPECIAL del cliente manda si existe y es > 0 (igual que la app)
        const ptCliente = Number(cliente.precio_titular);
        const primaBase = (cliente.precio_titular != null && String(cliente.precio_titular) !== "" && !isNaN(ptCliente) && ptCliente > 0) ? ptCliente : precioTitularPlan;
        const pdCliente = Number(cliente.precio_dep);
        const precioDependiente = (cliente.precio_dep != null && String(cliente.precio_dep) !== "" && !isNaN(pdCliente) && pdCliente > 0) ? pdCliente : precioDepPlan;

        if (primaBase <= 0) {
          resultado.omitidos.push({ cliente: cliente.nom, razon: "Prima base inválida o en cero", plan: cliente.plan, prima_base: primaBase });
          continue;
        }

        // deps es columna TEXT: llega como STRING JSON — hay que parsearla (antes contaba 0 SIEMPRE)
        let depsArr: any[] = [];
        if (Array.isArray(cliente.deps)) depsArr = cliente.deps;
        else if (typeof cliente.deps === "string" && cliente.deps.trim()) {
          try { const p = JSON.parse(cliente.deps); if (Array.isArray(p)) depsArr = p; } catch (_e) { /* deps ilegible: cuenta 0 */ }
        }
        const dependientes = depsArr.length;
        const primaDeps = dependientes * precioDependiente;
        const deudaAnt = Math.max(Number(cliente.deuda_total || 0) - Number(cliente.pagado || 0), 0);
        const total = primaBase + primaDeps + deudaAnt;
        const aumentoDeuda = primaBase + primaDeps;
        const tipoNcf = cliente.tipo_ncf || "B02";

        const { data: txResult, error: txError } = await supabase.rpc("crear_factura_auto_tx", {
          p_cliente_id: cliente.id,
          p_cliente_nom: cliente.nom,
          p_plan: cliente.plan,
          p_empresa_id: cliente.empresa_id,
          p_periodo: periodo,
          p_mes: mes,
          p_anio: anio,
          p_prima_base: primaBase,
          p_prima_deps: primaDeps,
          p_deuda_ant: deudaAnt,
          p_total: total,
          p_tipo_ncf: tipoNcf,
          p_fecha_emision: hoy.toISOString().slice(0, 10),
          p_aumento_deuda: aumentoDeuda
        });

        if (txError) throw txError;
        if (!txResult?.ok) {
          resultado.omitidos.push({ cliente: cliente.nom, razon: txResult?.razon || "Omitido por RPC", periodo });
          continue;
        }

        resultado.facturas_generadas++;
        resultado.generadas.push({
          cliente_id: cliente.id, cliente: cliente.nom, factura_id: txResult.factura_id,
          ncf: txResult.ncf, referencia: txResult.referencia, prima_base: primaBase,
          dependientes, prima_deps: primaDeps, deuda_anterior: deudaAnt, total,
          aumento_deuda: aumentoDeuda, uso_precio_especial: ptCliente > 0
        });
      } catch (error) {
        resultado.errores.push({ cliente: cliente?.nom || "CLIENTE DESCONOCIDO", error: String(error?.message || error) });
      }
    }

    await supabase.from("auto_jobs_log").insert({
      estado: resultado.errores.length > 0 ? "BLINDADO_CON_ERRORES" : "BLINDADO_OK",
      facturas_generadas: resultado.facturas_generadas,
      errores: resultado.errores.length,
      detalle: resultado
    });

    if (resultado.facturas_generadas > 0) {
      await supabase.from("auto_notificaciones_log").insert({
        tipo: "FACTURAS_GENERADAS",
        titulo: "Facturas generadas automáticamente",
        mensaje: `Se generaron ${resultado.facturas_generadas} factura(s) del período ${periodo}.`,
        estado: "enviado",
        detalle: resultado
      });
    }

    if (resultado.errores.length > 0) {
      await supabase.from("auto_notificaciones_log").insert({
        tipo: "ALERTA_ERROR",
        titulo: "Error en facturación automática",
        mensaje: `La facturación automática tuvo ${resultado.errores.length} error(es). Revisar auto_jobs_log.`,
        estado: "enviado",
        detalle: resultado
      });
    }

    return Response.json({ ok: true, periodo, clientes_revisados: resultado.clientes_revisados, facturas_generadas: resultado.facturas_generadas, omitidos: resultado.omitidos.length, errores: resultado.errores.length });
  } catch (error) {
    const detalleError = { modo: "REAL_BLINDADO_V2", error: String(error?.message || error) };
    await supabase.from("auto_jobs_log").insert({ estado: "ERROR", facturas_generadas: 0, errores: 1, detalle: detalleError });
    return Response.json({ ok: false, error: "error_interno" }, { status: 500 });
  }
});
