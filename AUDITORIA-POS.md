# AUDITORÍA DEL POS — NEXUS PRO

> Diagnóstico honesto del módulo **Punto de Venta (POS)** para decidir qué falta antes de
> venderlo a clientes. Hecho el **6-jul-2026** sobre el código real (`parches.js`).
> Sirve también como **contexto para una segunda opinión** (ChatGPT u otra herramienta):
> lee primero la sección "Arquitectura y reglas" para no romper el sistema.
>
> **FASE 0 COMPLETA (v48.7, 12-jul-2026).** Los 7 bugs de la Capa A están todos corregidos —
> ver el detalle de estado en la tabla de abajo. 5 ya estaban arreglados de una sesión anterior
> (no documentada aquí en su momento); A5 y A6 se cerraron en esta pasada. Queda pendiente la
> Capa B (fiscal/e-CF) y la Capa C (UX/operación).

---

## ⚠️ Arquitectura y reglas (LEER ANTES DE TOCAR / REDISEÑAR)

- **Es una app de UN SOLO archivo grande, SIN framework ni build step.** No es React/Vue/Angular.
  - `index.html` (~7.8k líneas): núcleo (HTML + CSS + JS) del sistema de seguros.
  - `parches.js` (~14.5k líneas): **aquí vive TODO el POS** y los módulos móviles. Se inyecta
    sobre el núcleo. El POS es un IIFE grande que arranca ~línea 13780.
  - `sw.js` (Service Worker, solo cachea imágenes), `manifest.json` (PWA), `version.json` (versión+changelog).
- **Backend: Supabase** (PostgreSQL + RLS + RPC + Edge Functions). Tablas del POS con prefijo `pos_`
  (39 tablas), aisladas por `organizacion_id` + RLS.
- **Sin npm, sin bundler.** Se edita el archivo y se sube. **Cada push a `main` se despliega solo**
  en `nexusprord.com` (Cloudflare Workers).
- **Es una PWA móvil** (iPhone/Android), pensada para pantalla angosta (~320–480px).
- **NO reescribir en un framework.** Eso rompería el despliegue automático, el Service Worker,
  la conexión Supabase y la marca blanca multi-empresa. Si se rediseña, **respetar** el modelo
  "un HTML + parches.js sin build" y las tablas `pos_*` existentes.
- **Lo que la auditoría encontró NO es problema de diseño visual** — es lógica (bugs de dinero) y
  cumplimiento fiscal (e-CF/RNC). Un rediseño de UI no lo arregla.

---

## VEREDICTO

**El POS NO está para empezar de cero.** De **22 módulos, 21 están completos y funcionales**, con
**cero funciones fantasma** (todos los `onclick` tienen su handler). El flujo
**Vender → carrito → Cobrar → ticket → descuenta stock → NCF → contabiliza** funciona de punta a punta.

**Pero NO está listo para vender** por dos razones concretas:
1. **Bugs de dinero silenciosos** que corrompen saldos/contabilidad/inventario sin avisar.
2. **No es una solución fiscal conforme a RD** (sin RNC del comprador, sin e-CF, 607 incompleto, sin 606/608).

Un rediseño no resuelve nada de esto; se arregla en el código que ya existe, por fases.

---

## CAPA A — 🔴 Bugs de dinero SILENCIOSOS (prioridad máxima)
No bloquean la venta, y por eso son peligrosos: corrompen los números por debajo.

| # | Bug | Evidencia | Estado |
|---|-----|-----------|--------|
| A1 | **Fiado no se revierte al anular.** `cargarSaldosCli` reconstruye la deuda con `credito_monto=gt.0` **sin excluir `estado=anulada`**; `nxPosAnularVenta` no resta el saldo. Una venta a crédito anulada sigue como deuda del cliente para siempre. | `parches.js:13965` · `nxPosAnularVenta` ~15719 | ✅ **ARREGLADO** — `cargarSaldosCli` excluye `estado=neq.anulada`; `nxPosAnularVenta` resta de `_fiadoByCli` |
| A2 | **Sin costo de ventas (COGS).** `postAsientoVenta` solo asienta Caja/CxC vs Ventas+ITBIS; falta Debe *Costo de ventas* / Haber *Inventario (1104)*. Como las compras sí debitan 1104, el inventario contable **nunca baja** → activo y ganancia inflados. | `postAsientoVenta` ~17082 | ✅ **ARREGLADO** — Debe 5101 Costo de mercancía vendida / Haber 1104, leyendo `pos_productos.costo` |
| A3 | **Stock por almacén puede quedar NEGATIVO.** La revalidación compara contra el stock TOTAL, no contra el del almacén elegido; `upsertStockAlm` escribe sin piso en 0. | ~15247–15252, `upsertStockAlm` ~17310 | ✅ **ARREGLADO** — revalida contra el almacén activo; `upsertStockAlm` tiene piso `Math.max(0,...)` |
| A4 | **Bug `tipo` inexistente en `asignarNCF`.** `const ncf = (s.prefijo \|\| tipo)` referencia una variable `tipo` que no existe (el parámetro es `tipoFactura`). Si `prefijo` es vacío → `ReferenceError` atrapado → **venta sin NCF en silencio**. | `parches.js:15086` | ✅ **ARREGLADO** — usa `cod`; de paso ya valida vencimiento de la secuencia |
| A5 | **"Nota de crédito" como pago se cuenta como efectivo/caja** (1101) y no se valida que exista/pertenezca al cliente ni se marca consumida. | `postAsientoVenta` ~17089 · body ~15294 | ✅ **ARREGLADO (v48.7)** — se valida contra `pos_devoluciones` real del cliente (`estado=emitida`), se marca `estado=aplicada` al usarla; contablemente va a cuenta nueva 2105 (fallback a 1101 si el org no ha recreado su plan de cuentas) |
| A6 | **Anulación incompleta:** no revierte el NCF (fiscalmente exige nota de crédito B04) ni cancela `pos_financiamientos`/`pos_fin_cuotas` de esa venta. | `nxPosAnularVenta` ~15719 | ✅ **ARREGLADO** — cancela financiamientos/cuotas; **v48.7** además emite automáticamente la NC fiscal B04 (o avisa por audit log + toast si no hay secuencia activa, en vez de fallar en silencio) |
| A7 | **KPIs del día suman ventas anuladas** (`cargarDashKPI` no excluye `estado=anulada`). La caja sí las excluye. | `cargarDashKPI` ~13952 | ✅ **ARREGLADO** — `&estado=neq.anulada` en la consulta |

*(Son arreglos puntuales, no reconstrucción. FASE 0 completa al 100% desde v48.7.)*

---

## CAPA B — 🟠 Fiscal / legal (razón real de "no vendible en RD")

| # | Falta | Evidencia | ¿Bloquea vender legal? |
|---|-------|-----------|------------------------|
| B1 | **No captura ni imprime el RNC/cédula del COMPRADOR.** La venta guarda `cliente_nombre` pero no `cliente_rnc`. Un **B01 (Crédito Fiscal) sin RNC es inválido** ante DGII. El campo `rnc_cedula` existe en la entidad pero el POS no lo usa. | venta ~15290 · ticket ~15371 | **SÍ (B01)** |
| B2 | **Cero e-CF / PSFE.** No hay ninguna integración de factura electrónica (Alanube/otro): sin XML, firma, envío DGII, QR ni TrackID. **Obligatoria el 15-nov-2026.** | (ausente) | **SÍ (desde 15-nov-2026)** |
| B3 | **607 incompleto.** `nxRep607` existe pero sin RNC del cliente, tipo de identificación, NCF modificado, retenciones, ni export al layout oficial. | `nxRep607` ~17835 | Parcial |
| B4 | **No existen 606 (compras) ni 608 (anulados).** El NCF del proveedor sí se captura, pero no hay reporte que lo consolide. | (ausente) | Obligación faltante |
| B5 | **Sin retenciones ITBIS/ISR.** | (ausente) | Según giro |
| B6 | **Solo RD$** (sin US$/multi-moneda). Los celulares se cotizan en dólares. | `fmt` fija "RD$ " | No, pero limita |
| B7 | `asignarNCF` no valida el **vencimiento** de la secuencia ni es atómico (riesgo de NCF duplicado/caduco bajo concurrencia). | `asignarNCF` ~15083 | No |

---

## CAPA C — 🟡 UX / operación / despliegue

| # | Pendiente | Evidencia |
|---|-----------|-----------|
| C1 | **Buscador de cliente en Cobro/Factura** — sigue siendo `<select>` (`facCli`, `posCliId`). Con cientos de clientes es impráctico. El de productos sí existe (`nxProdPicker`). | Factura ~14368 · Cobro ~15163 |
| C2 | **Login de cajeros** depende de la Edge Function `crear-usuario-staff` (Supabase, **no está en el repo**). Hay que confirmar que esté desplegada y probarla. | `nxStaffCrear` ~18846 |
| C3 | **RLS server-side** — el gateo por rol (`puedeVer`) es del lado del cliente; el aislamiento real vive en políticas de Postgres/Supabase (no verificable en el repo). | `puedeVer` ~13798 |

---

## LO QUE SÍ ESTÁ COMPLETO (21/22 módulos)
Inicio, Avisos, Vender, Factura, Prefactura, Reparaciones, Productos, Inventario, Cotizaciones,
Compras, Entidades, CRM, Clientes, Caja, Cuotas, Apartados, Historial, Notas de crédito,
Historial de prefacturas, Reportes, Contabilidad (partida doble real), RRHH (nómina con SFS/AFP/ISR),
Ajustes. **Cero funciones fantasma. ITBIS 18% desglosado bien. Documentos imprimibles (factura,
NC, cotización, conduce, recibo) con RNC de la empresa.**

---

## HOJA DE RUTA (para volverlo vendible, en orden)

| Fase | Qué | Tamaño |
|---|---|---|
| **0. Frenar la corrupción** ✅ | Los 7 bugs de la Capa A (fiado al anular, COGS, stock por almacén, bug NCF `tipo`, NC como pago, anulación completa, KPIs) — **COMPLETA v48.7** | 🟢 Rápido |
| **1. Mínimo fiscal legal** | RNC del comprador en factura + exigirlo en B01 · 607 completo con export · 606 · 608 | 🟠 Medio |
| **2. e-CF DGII** | Integrar PSFE (Alanube) — **antes de 15-nov-2026** | 🔴 Grande |
| **3. Operación** | Buscador de cliente en Cobro/Factura · confirmar/desplegar `crear-usuario-staff` y probar cajero · validar RLS server-side | 🟠 Medio |
| **4. Consistencia + extras** | Historiales consistentes (en curso) · trade-in/usados por IMEI · multi-moneda | 🟢 En curso |

**Recomendación:** empezar por la **Fase 0** (arreglos de raíz que detienen el daño silencioso y
dejan un sistema en el que se puede confiar en los números), luego el mínimo fiscal (Fase 1) y
planear e-CF (Fase 2) con tiempo antes de noviembre.

---

*Auditoría generada sobre el estado del código en `main` al 6-jul-2026. Las referencias `archivo:línea`
son aproximadas (el archivo cambia con cada versión); buscar por nombre de función.*
