// Pruebas de _doc.ts (JSON e-CF) y _emitir.ts (orden de emisión) con base y MSeller simulados.
// Uso: deno test supabase/functions/ecf-mseller/_emitir_test.ts
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { armarEcf, fechaRD } from "./_doc.ts";
import { actualizar, type DebitoFila, type Deps, emitir, emitirDebito, emitirNota, type NotaFila, seguimiento, type VentaFila } from "./_emitir.ts";

const emisor = { rnc: "131880657", razonSocial: "Pizzería Unive 2 SRL", direccion: "Calle Principal 1, Santiago" };
const T0 = Date.parse("2026-10-26T15:00:00Z");
const suma = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

Deno.test("E32: precios con ITBIS incluido → montos sin ITBIS que cuadran exacto con el total", () => {
  const d = armarEcf({ tipo: 32, encf: "E320000000001", emisor, ahora: () => T0,
    venta: { total: 1000 },
    items: [{ nombre: "Pizza grande", precio: 650, cantidad: 1, itbis: true, importe: 650 }, { nombre: "Refresco", precio: 175, cantidad: 2, itbis: true, importe: 350 }] });
  const t = d.ECF.Encabezado.Totales as Record<string, number>;
  assertEquals(t.MontoGravadoI1, 847.46);
  assertEquals(t.TotalITBIS1, 152.54);
  assertEquals(t.MontoExento, 0);
  assertEquals(t.MontoTotal, 1000);
  assertEquals(suma([t.MontoGravadoI1, t.TotalITBIS1, t.MontoExento]), 1000);
  const it = d.ECF.DetallesItems.Item;
  assertEquals(suma(it.map((i) => i.MontoItem)), t.MontoGravadoI1);
  assertEquals(it[1].CantidadItem, 2);
  assertEquals(it[0].IndicadorFacturacion, 1);
  assertEquals((d.ECF.Encabezado as any).Comprador, undefined); // consumo sin RNC: no se manda comprador
  assertEquals((d.ECF.Encabezado as any).Emisor.FechaEmision, "26-10-2026");
  assertEquals((d.ECF.Encabezado as any).IdDoc.TipoPago, 1);
});

Deno.test("descuento global y artículo exento: se prorratea y sigue cuadrando", () => {
  const d = armarEcf({ tipo: 32, encf: "E320000000002", emisor, ahora: () => T0,
    venta: { total: 900 }, // 1000 − 10 %
    items: [{ nombre: "Combo", precio: 700, cantidad: 1, itbis: true, importe: 700 }, { nombre: "Agua", precio: 100, cantidad: 3, itbis: false, importe: 300 }] });
  const t = d.ECF.Encabezado.Totales as Record<string, number>;
  assertEquals(t.MontoExento, 270);
  assertEquals(suma([t.MontoGravadoI1, t.TotalITBIS1, t.MontoExento]), 900);
  const it = d.ECF.DetallesItems.Item;
  assertEquals(it[1].IndicadorFacturacion, 4);
  assertEquals(it[1].MontoItem, 270);
  assertEquals(it[1].PrecioUnitarioItem, 90);
  assertEquals(it[0].MontoItem, t.MontoGravadoI1);
});

Deno.test("redondeo: tres líneas de 33.33 no dejan centavos sueltos", () => {
  const d = armarEcf({ tipo: 32, encf: "E320000000003", emisor, ahora: () => T0, venta: { total: 100 },
    items: [1, 2, 3].map((n) => ({ nombre: "Pan " + n, precio: 33.33, cantidad: 1, itbis: true, importe: 33.33 })) });
  const t = d.ECF.Encabezado.Totales as Record<string, number>;
  assertEquals(suma(d.ECF.DetallesItems.Item.map((i) => i.MontoItem)), t.MontoGravadoI1);
  assertEquals(suma([t.MontoGravadoI1, t.TotalITBIS1]), 100);
});

Deno.test("E31: exige RNC del cliente y vencimiento; a crédito lleva TipoPago 2 y fecha límite", () => {
  const base = { tipo: 31 as const, encf: "E310000000001", emisor, ahora: () => T0, items: [{ nombre: "Catering", precio: 5900, cantidad: 1, itbis: true, importe: 5900 }] };
  assertThrows(() => armarEcf({ ...base, venta: { total: 5900 }, vencimientoSecuencia: "2027-12-31" }), Error, "RNC");
  assertThrows(() => armarEcf({ ...base, venta: { total: 5900, comprador_rnc: "131880657" } }), Error, "vencimiento");
  const d = armarEcf({ ...base, vencimientoSecuencia: "2027-12-31", venta: { total: 5900, comprador_rnc: "131880657", comprador_razon_social: "Cliente SRL", a_credito: true, credito_vencimiento: "2026-11-25" } });
  const id = (d.ECF.Encabezado as any).IdDoc;
  assertEquals(id.FechaVencimientoSecuencia, "31-12-2027");
  assertEquals(id.TipoPago, 2);
  assertEquals(id.FechaLimitePago, "25-11-2026");
  assertEquals((d.ECF.Encabezado as any).Comprador, { RNCComprador: "131880657", RazonSocialComprador: "Cliente SRL" });
});

Deno.test("datos malos se rechazan antes de enviar", () => {
  const ok = { emisor, venta: { total: 100 }, items: [{ nombre: "A", precio: 100, cantidad: 1, itbis: true, importe: 100 }] };
  assertThrows(() => armarEcf({ ...ok, tipo: 32, encf: "E310000000001" }), Error, "no corresponde");
  assertThrows(() => armarEcf({ ...ok, tipo: 32, encf: "E320000000001", emisor: { ...emisor, rnc: "13-188" } }), Error, "emisor");
  assertThrows(() => armarEcf({ ...ok, tipo: 32, encf: "E320000000001", venta: { total: 300000 }, items: [{ nombre: "A", precio: 300000, cantidad: 1, itbis: true, importe: 300000 }] }), Error, "250,000");
});

Deno.test("fechaRD usa la hora de Santo Domingo (UTC−4)", () => {
  assertEquals(fechaRD("2026-10-27T02:30:00Z"), "26-10-2026");
  assertEquals(fechaRD("2026-10-27T04:30:00Z"), "27-10-2026");
});

// ── _emitir.ts ──
function base(v: Partial<VentaFila> = {}, ms: { enviar?: number[]; consultar?: { status: number; datos: any } } = {}, n: Partial<NotaFila> = {}, dd: Partial<DebitoFila> = {}) {
  const venta: VentaFila = { id: "00000000-0000-4000-8000-000000000001", organizacion_id: "org", estado: "completada", total: 500, fecha: "2026-10-20T15:00:00Z", ncf: null, ecf_tipo: null, ecf_estado: null, ecf_track_id: null, ...v };
  const nota: NotaFila = { id: "00000000-0000-4000-8000-0000000000n1", organizacion_id: "org", venta_id: venta.id, total: 500, motivo: "Anulación de factura completa", created_at: "2026-10-26T15:00:00Z", ncf: null, ecf_estado: null, ecf_track_id: null, ...n };
  const debito: DebitoFila = { id: "00000000-0000-4000-8000-0000000000d1", organizacion_id: "org", venta_id: venta.id, total: 150, concepto: "Delivery", lleva_itbis: true, created_at: "2026-10-26T15:00:00Z", estado: "emitida", ncf: null, ecf_estado: null, ecf_track_id: null, ...dd };
  const log: string[] = [], enviados: any[] = [];
  let numero = 0, nEnv = 0;
  const reclamadas = new Set<string>();
  const tabla = <T extends { id: string }>(fila: T, nombre: string) => ({
    async leer(id: string) { return id === fila.id ? { ...fila } : null; },
    async reclamar(id: string) { if (reclamadas.has(id)) return false; reclamadas.add(id); log.push("reclamar " + nombre); return true; },
    async guardar(id: string, c: Record<string, unknown>) { Object.assign(fila, c); if ("ecf_enviado_at" in c && c.ecf_enviado_at === null) reclamadas.delete(id); log.push("guardar " + Object.keys(c).join(",")); },
  });
  const deps: Deps = {
    cliente: {
      entorno: "TesteCF",
      async enviar(doc) {
        enviados.push(doc); const st = (ms.enviar || [200])[Math.min(nEnv++, (ms.enviar || [200]).length - 1)];
        if (st === 0) throw new Error("red");
        return st === 200 ? { status: 200, datos: { ecf: (doc as any).ECF.Encabezado.IdDoc.eNCF, securityCode: "fWCZCV", qr_url: "https://ecf.dgii.gov.do/testecf/consultatimbrefc?x=1", internalTrackId: "trk-1", signedDate: "26-10-2026 11:00:00" } }
          : { status: st, datos: { message: "TIPO_ECF_MISMATCH", code: "ECF_VALIDATION_FAILED" } };
      },
      async consultar() { log.push("consultar"); return ms.consultar || { status: 404, datos: null }; },
    },
    ventas: tabla(venta, "venta"),
    notas: tabla(nota, "nota"),
    debitos: tabla(debito, "debito"),
    async leerItems() { return [{ nombre: "Pizza", precio: 500, cantidad: 1, itbis: true, importe: 500 }]; },
    async leerItemsNota() { return [{ nombre: "Pizza", precio: 500, cantidad: nota.total / 500, itbis: true, importe: nota.total }]; },
    async leerEmisor() { return emisor; },
    async vencimiento() { return "2027-12-31"; },
    async siguienteEncf(t) { log.push("numero " + t); numero++; return `${t}${String(numero).padStart(10, "0")}`; },
  };
  return { venta, nota, debito, log, enviados, deps, numeroUsados: () => numero };
}

Deno.test("emitir E32: guarda el e-NCF ANTES de enviar y luego QR, código y seguimiento", async () => {
  const s = base();
  const r = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r.ok, true);
  assertEquals(s.venta.ncf, "E320000000001");
  assertEquals(s.venta.ecf_estado, "En Cola");
  assertEquals(s.venta.ecf_security_code, "fWCZCV");
  assertEquals(s.venta.ecf_track_id, "trk-1");
  assert(s.log.indexOf("guardar ncf,ecf_tipo,ecf_entorno,ecf_estado,ecf_respuesta") < s.log.findIndex((l) => l.startsWith("guardar ecf_entorno,ecf_security_code")));
  assertEquals(s.enviados[0].ECF.Encabezado.IdDoc.eNCF, "E320000000001");
});

Deno.test("emitir dos veces: la segunda no reenvía ni gasta otro número", async () => {
  const s = base();
  await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  const r2 = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r2.ya, true);
  assertEquals(s.enviados.length, 1);
  assertEquals(s.numeroUsados(), 1);
});

Deno.test("ya reclamada por otro toque: 409 sin enviar", async () => {
  const s = base();
  await s.deps.ventas.reclamar(s.venta.id, "");
  const r = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r.status, 409);
  assertEquals(s.enviados.length, 0);
});

Deno.test("error 4xx de MSeller: queda Error con el mismo e-NCF y el reintento no gasta otro", async () => {
  const s = base({}, { enviar: [400, 200] });
  const r = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r.ok, false); assertEquals(r.status, 422);
  assertEquals(s.venta.ecf_estado, "Error");
  const r2 = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r2.ok, true);
  assertEquals(s.numeroUsados(), 1);
  assertEquals(s.enviados[1].ECF.Encabezado.IdDoc.eNCF, "E320000000001");
});

Deno.test("sin red: queda pendiente; el reintento primero consulta y recupera lo que MSeller sí recibió", async () => {
  const s = base({}, { enviar: [0], consultar: { status: 200, datos: { status: "Aceptado", securityCode: "AbC123", qr_url: "https://q", internalTrackId: "trk-9", signedDate: "x" } } });
  const r = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r.pendiente, true);
  assertEquals(s.venta.ecf_estado, "pendiente");
  const r2 = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r2.recuperada, true);
  assertEquals(s.venta.ecf_estado, "Aceptado");
  assertEquals(s.enviados.length, 1); // no se envió dos veces
});

Deno.test("datos incompletos: no se gasta e-NCF", async () => {
  const s = base();
  s.deps.leerEmisor = async () => null;
  const r = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r.status, 400);
  assertEquals(s.numeroUsados(), 0);
  const e31 = base();
  const r31 = await emitir({ ventaId: e31.venta.id, tipo: 31 }, e31.deps, () => T0);
  assertEquals(r31.status, 400); // E31 sin RNC del cliente
  assertEquals(e31.numeroUsados(), 0);
});

Deno.test("venta con NCF B02 o anulada: no se toca", async () => {
  const b = base({ ncf: "B0200000001" });
  assertEquals((await emitir({ ventaId: b.venta.id, tipo: 32 }, b.deps, () => T0)).status, 409);
  const a = base({ estado: "anulada" });
  assertEquals((await emitir({ ventaId: a.venta.id, tipo: 32 }, a.deps, () => T0)).status, 409);
  assertEquals(b.numeroUsados() + a.numeroUsados(), 0);
});

Deno.test("sin secuencia E32: avisa y suelta la venta", async () => {
  const s = base();
  s.deps.siguienteEncf = async () => null;
  const r = await emitir({ ventaId: s.venta.id, tipo: 32 }, s.deps, () => T0);
  assertEquals(r.status, 409);
  assert(String(r.error).includes("Ajustes"));
  assertEquals(s.enviados.length, 0);
});

Deno.test("actualizar: copia el estado de la DGII", async () => {
  const s = base({ ncf: "E320000000001", ecf_estado: "En Cola", ecf_track_id: "trk-1" }, { consultar: { status: 200, datos: { status: "Aceptado", securityCode: "fWCZCV", qr_url: "https://q" } } });
  const r = await actualizar(s.venta.id, s.deps, () => T0);
  assertEquals(r.ok, true);
  assertEquals(s.venta.ecf_estado, "Aceptado");
});

// ── Fase 5: nota de crédito E34 ──
const enviada = { ncf: "E320000000007", ecf_tipo: 32, ecf_estado: "Aceptado", ecf_track_id: "trk-0", ecf_security_code: "AbC123" };

Deno.test("E34 de una anulación total: CodigoModificacion 1, referencia a la factura y dentro de 30 días", async () => {
  const s = base(enviada);
  const r = await emitirNota({ notaId: s.nota.id }, s.deps, () => T0);
  assertEquals(r.ok, true);
  assertEquals(s.nota.ncf, "E340000000001");
  assertEquals(s.log.filter((l) => l.startsWith("numero")), ["numero E34"]);
  const d = s.enviados[0].ECF;
  assertEquals(d.Encabezado.IdDoc.TipoeCF, 34);
  assertEquals(d.Encabezado.IdDoc.IndicadorNotaCredito, 0);
  assertEquals(d.Encabezado.IdDoc.FechaVencimientoSecuencia, undefined);
  assertEquals(d.InformacionReferencia.NCFModificado, "E320000000007");
  assertEquals(d.InformacionReferencia.FechaNCFModificado, "20-10-2026");
  assertEquals(d.InformacionReferencia.CodigoModificacion, 1);
  assertEquals(d.InformacionReferencia.RazonModificacion, "Anulación de factura completa");
  assertEquals(d.Encabezado.Totales.MontoTotal, 500);
  assertEquals(s.venta.ncf, "E320000000007"); // la factura original no se toca
});

Deno.test("E34 de una devolución parcial: CodigoModificacion 3 y monto de la nota", async () => {
  const s = base({ ...enviada, total: 1000 }, {}, { total: 500, motivo: "Pizza fría" });
  await emitirNota({ notaId: s.nota.id }, s.deps, () => T0);
  const d = s.enviados[0].ECF;
  assertEquals(d.InformacionReferencia.CodigoModificacion, 3);
  assertEquals(d.Encabezado.Totales.MontoTotal, 500);
});

Deno.test("E34 más de 30 días después: IndicadorNotaCredito 1", async () => {
  const s = base({ ...enviada, fecha: "2026-09-01T15:00:00Z" });
  await emitirNota({ notaId: s.nota.id }, s.deps, () => T0);
  assertEquals(s.enviados[0].ECF.Encabezado.IdDoc.IndicadorNotaCredito, 1);
});

Deno.test("E34: si la factura original nunca llegó a MSeller, no se emite ni se gasta número", async () => {
  const s = base({ ncf: "E320000000007", ecf_tipo: 32, ecf_estado: "Error" });
  const r = await emitirNota({ notaId: s.nota.id }, s.deps, () => T0);
  assertEquals(r.status, 409); assertEquals(r.sinOriginal, true);
  assertEquals(s.numeroUsados(), 0);
  const b = base({ ncf: "B0200000001" });
  assertEquals((await emitirNota({ notaId: b.nota.id }, b.deps, () => T0)).status, 409);
});

Deno.test("E34: monto mayor que la factura se rechaza; nota ya enviada no se reenvía", async () => {
  const s = base(enviada, {}, { total: 900 });
  assertEquals((await emitirNota({ notaId: s.nota.id }, s.deps, () => T0)).status, 400);
  const y = base(enviada, {}, { ncf: "E340000000004", ecf_track_id: "trk-n" });
  const r = await emitirNota({ notaId: y.nota.id }, y.deps, () => T0);
  assertEquals(r.ya, true); assertEquals(y.enviados.length, 0);
});

// ── Fase 4: seguimiento ──
Deno.test("seguimiento: actualiza los que esperan, reintenta el pendiente sin número nuevo y cuenta rechazados", async () => {
  const s = base({ ncf: "E320000000003", ecf_tipo: 32, ecf_estado: "En Cola", ecf_track_id: "trk-1" }, { consultar: { status: 200, datos: { status: "Rechazado", securityCode: "fWCZCV" } } },
    { ncf: "E340000000002", ecf_tipo: 34, ecf_estado: "pendiente" });
  // la nota necesita su factura original enviada: la venta tiene track
  const r = await seguimiento([{ tabla: "ventas", id: s.venta.id, ecf_estado: "En Cola" }, { tabla: "notas", id: s.nota.id, ecf_estado: "pendiente" }], s.deps, () => T0);
  assertEquals(s.venta.ecf_estado, "Rechazado");
  assertEquals(r.revisados, 2);
  assertEquals(r.rechazados >= 1, true);
  assertEquals(s.numeroUsados(), 0); // nunca toma números nuevos
  assertEquals(s.nota.ncf, "E340000000002");
});

Deno.test("seguimiento: un error no detiene a los demás", async () => {
  const s = base({ ncf: "E320000000003", ecf_tipo: 32, ecf_estado: "En Cola", ecf_track_id: "trk-1" }, { consultar: { status: 200, datos: { status: "Aceptado", securityCode: "x" } } });
  s.deps.notas.leer = async () => { throw new Error("base caída"); };
  const r = await seguimiento([{ tabla: "notas", id: "x", ecf_estado: "En Cola" }, { tabla: "ventas", id: s.venta.id, ecf_estado: "En Cola" }], s.deps, () => T0);
  assertEquals(r.errores, 1); assertEquals(r.aceptados, 1);
});

// ── Nota de débito E33 ──
Deno.test("E33: cargo adicional con referencia a la factura, código 3 y vencimiento de su secuencia", async () => {
  const s = base(enviada);
  const r = await emitirDebito({ debitoId: s.debito.id }, s.deps, () => T0);
  assertEquals(r.ok, true);
  assertEquals(s.debito.ncf, "E330000000001");
  const d = s.enviados[0].ECF;
  assertEquals(d.Encabezado.IdDoc.TipoeCF, 33);
  assertEquals(d.Encabezado.IdDoc.FechaVencimientoSecuencia, "31-12-2027");
  assertEquals(d.Encabezado.IdDoc.IndicadorNotaCredito, undefined);
  assertEquals(d.InformacionReferencia.NCFModificado, "E320000000007");
  assertEquals(d.InformacionReferencia.CodigoModificacion, 3);
  assertEquals(d.InformacionReferencia.RazonModificacion, "Delivery");
  assertEquals(d.DetallesItems.Item.length, 1);
  assertEquals(d.DetallesItems.Item[0].IndicadorBienoServicio, 2);
  assertEquals(d.Encabezado.Totales.MontoTotal, 150);
  assertEquals(d.Encabezado.Totales.MontoGravadoI1, 127.12);
  assertEquals(d.Encabezado.Totales.TotalITBIS1, 22.88);
});

Deno.test("E33 sin ITBIS: todo exento", async () => {
  const s = base(enviada, {}, {}, { lleva_itbis: false, total: 200 });
  await emitirDebito({ debitoId: s.debito.id }, s.deps, () => T0);
  const t = s.enviados[0].ECF.Encabezado.Totales;
  assertEquals(t.MontoExento, 200); assertEquals(t.MontoGravadoI1, undefined);
});

Deno.test("E33: factura sin enviar, nota anulada o sin vencimiento → no se emite ni se gasta número", async () => {
  const a = base({ ncf: "E320000000007", ecf_estado: "Error" });
  assertEquals((await emitirDebito({ debitoId: a.debito.id }, a.deps, () => T0)).status, 409);
  const b = base(enviada, {}, {}, { estado: "anulada" });
  assertEquals((await emitirDebito({ debitoId: b.debito.id }, b.deps, () => T0)).status, 409);
  const c = base(enviada); c.deps.vencimiento = async () => null;
  assertEquals((await emitirDebito({ debitoId: c.debito.id }, c.deps, () => T0)).status, 400);
  assertEquals(a.numeroUsados() + b.numeroUsados() + c.numeroUsados(), 0);
});

Deno.test("seguimiento también revisa notas de débito", async () => {
  const s = base(enviada, { consultar: { status: 200, datos: { status: "Aceptado", securityCode: "x" } } }, {}, { ncf: "E330000000002", ecf_estado: "En Cola", ecf_track_id: "t" });
  const r = await seguimiento([{ tabla: "debitos", id: s.debito.id, ecf_estado: "En Cola" }], s.deps, () => T0);
  assertEquals(r.aceptados, 1); assertEquals(s.debito.ecf_estado, "Aceptado");
});
