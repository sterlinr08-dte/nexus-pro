// Arma el JSON e-CF (E31 crédito fiscal, E32 consumo) de una venta del POS, con los nombres y la estructura del XML de la
// DGII (docs MSeller «Formato JSON de e-CF» y «Formato por tipo»). Función pura: se prueba sin red ni base.
// Montos: en el POS el precio y el importe de la línea INCLUYEN el ITBIS (18 %) y la venta puede tener un descuento global
// (pos_ventas.descuento). Aquí se manda IndicadorMontoGravado 0 (montos SIN ITBIS): cada línea se lleva a su parte del total
// de la venta y se le quita el ITBIS. El redondeo se reparte para que MontoGravadoI1 + TotalITBIS1 + MontoExento sea
// exactamente pos_ventas.total, y la suma de los MontoItem gravados sea exactamente MontoGravadoI1.

export type VentaEcf = {
  total: number; a_credito?: boolean | null; credito_vencimiento?: string | null; fecha?: string | null;
  comprador_rnc?: string | null; comprador_razon_social?: string | null; cliente_nombre?: string | null;
};
export type ItemEcf = { nombre: string; precio: number; cantidad: number; itbis: boolean; importe: number; servicio?: boolean };
export type EmisorEcf = { rnc: string; razonSocial: string; direccion: string };

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const r4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000;
const ITBIS = 0.18;

// dd-mm-aaaa en hora de Santo Domingo (UTC-4, sin horario de verano)
export function fechaRD(iso?: string | null, ahora: () => number = Date.now): string {
  const t = iso ? Date.parse(iso) : ahora();
  const d = new Date((isNaN(t) ? ahora() : t) - 4 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}
const fechaDMY = (iso: string) => { const [a, m, d] = iso.slice(0, 10).split("-"); return `${d}-${m}-${a}`; };

export const rncValido = (v: unknown) => /^([0-9]{9}|[0-9]{11})$/.test(String(v || ""));

export function armarEcf(o: { tipo: 31 | 32; encf: string; venta: VentaEcf; items: ItemEcf[]; emisor: EmisorEcf; vencimientoSecuencia?: string | null; ahora?: () => number }) {
  const { tipo, encf, venta, emisor } = o;
  if (!new RegExp(`^E${tipo}\\d{10}$`).test(encf)) throw new Error(`e-NCF ${encf} no corresponde al tipo E${tipo}.`);
  if (!rncValido(emisor.rnc) || !emisor.razonSocial.trim() || !emisor.direccion.trim()) throw new Error("Faltan los datos del emisor (RNC, razón social y dirección).");
  const items = o.items.filter((i) => Number(i.cantidad) > 0 && Number(i.importe) > 0);
  if (!items.length) throw new Error("La venta no tiene artículos con monto.");
  const total = r2(Number(venta.total));
  if (!(total > 0)) throw new Error("La venta no tiene total.");
  const rnc = String(venta.comprador_rnc || "").trim();
  if (tipo === 31 && !rncValido(rnc)) throw new Error("La factura de crédito fiscal (E31) necesita el RNC o la cédula del cliente.");
  if (tipo === 32 && total >= 250000 && !rncValido(rnc)) throw new Error("Una factura de consumo de RD$250,000 o más necesita el RNC o la cédula del cliente.");
  if (tipo === 31 && !o.vencimientoSecuencia) throw new Error("La secuencia E31 necesita su fecha de vencimiento.");

  // Parte de cada línea en el total cobrado (descuento global prorrateado), con ITBIS incluido
  const bruto = items.reduce((s, i) => s + Number(i.importe), 0);
  const f = total / bruto;
  const lineas = items.map((i) => ({ i, conItbis: Number(i.importe) * f }));
  const gravIncl = r2(lineas.filter((l) => l.i.itbis).reduce((s, l) => s + l.conItbis, 0));
  const exento = r2(total - gravIncl);
  const gravado = r2(gravIncl / (1 + ITBIS));
  const totItbis = r2(gravIncl - gravado);

  // MontoItem sin ITBIS (gravados) o tal cual (exentos); la última línea de cada grupo absorbe el redondeo
  const montos = lineas.map((l) => r2(l.i.itbis ? l.conItbis / (1 + ITBIS) : l.conItbis));
  for (const [grav, meta] of [[true, gravado], [false, exento]] as const) {
    const idx = lineas.map((l, k) => (l.i.itbis === grav ? k : -1)).filter((k) => k >= 0);
    if (!idx.length) continue;
    const suma = r2(idx.reduce((s, k) => s + montos[k], 0));
    montos[idx[idx.length - 1]] = r2(montos[idx[idx.length - 1]] + meta - suma);
  }

  const Item = lineas.map((l, k) => ({
    NumeroLinea: k + 1,
    IndicadorFacturacion: l.i.itbis ? 1 : 4, // 1 = ITBIS 18 %, 4 = exento
    NombreItem: String(l.i.nombre || "Artículo").replace(/\s+/g, " ").trim().slice(0, 80),
    IndicadorBienoServicio: l.i.servicio ? 2 : 1,
    CantidadItem: r2(Number(l.i.cantidad)),
    UnidadMedida: 43, // unidad
    PrecioUnitarioItem: r4(montos[k] / Number(l.i.cantidad)),
    MontoItem: montos[k],
  }));

  const credito = !!venta.a_credito;
  const IdDoc: Record<string, unknown> = { TipoeCF: tipo, eNCF: encf };
  if (o.vencimientoSecuencia) IdDoc.FechaVencimientoSecuencia = fechaDMY(o.vencimientoSecuencia);
  Object.assign(IdDoc, { IndicadorEnvioDiferido: 0, IndicadorMontoGravado: 0, TipoIngresos: "01", TipoPago: credito ? 2 : 1 });
  if (credito && venta.credito_vencimiento) IdDoc.FechaLimitePago = fechaDMY(venta.credito_vencimiento);

  const Totales: Record<string, number> = {};
  if (gravado > 0) Object.assign(Totales, { MontoGravadoTotal: gravado, MontoGravadoI1: gravado });
  Totales.MontoExento = exento;
  if (gravado > 0) Object.assign(Totales, { ITBIS1: 18, TotalITBIS: totItbis, TotalITBIS1: totItbis });
  Totales.MontoTotal = total;

  const Encabezado: Record<string, unknown> = {
    Version: "1.0",
    IdDoc,
    Emisor: { RNCEmisor: emisor.rnc, RazonSocialEmisor: emisor.razonSocial.trim().slice(0, 150), DireccionEmisor: emisor.direccion.trim().slice(0, 100), FechaEmision: fechaRD(venta.fecha, o.ahora) },
  };
  if (rncValido(rnc)) {
    Encabezado.Comprador = { RNCComprador: rnc, RazonSocialComprador: String(venta.comprador_razon_social || venta.cliente_nombre || "Cliente").trim().slice(0, 150) };
  }
  Encabezado.Totales = Totales;
  return { ECF: { Encabezado, DetallesItems: { Item }, FechaHoraFirma: "" } };
}
