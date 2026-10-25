# Unive 2: qué ya tiene el POS de NEXUS y qué falta (mapa, 25-oct-2026)

Sacado con búsquedas en `parches-pos.js` (13,012 líneas) y en el esquema clonado `supabase/studio/` (65 tablas). Es un mapa por palabras clave: **cada punto se confirma leyendo el código en la fase de plano.**

## Ya existe (se reutiliza)
| Necesidad | Cómo está hoy |
|---|---|
| Vender, artículos y totales con ITBIS | `pos_ventas`, `pos_venta_items` |
| Caja, apertura y **cierre o cuadre** | `pos_cajas`, `pos_caja_movimientos` (64 menciones de cierre o cuadre) |
| **Pedidos en espera** (sirve para mesas abiertas) | `pos_ventas_suspendidas` |
| Buscador, favoritos y más vendidos | Sí (118 y 19 menciones) |
| Impresión del recibo | Sí (160 menciones) |
| Fiado y abonos | `pos_abonos`, `pos_credito_eventos` |
| Inventario y almacén | `pos_stock_almacen`, `pos_inv_movimientos` |
| Categorías y niveles de precio | `pos_categorias`, `pos_niveles_precio` |
| NCF de papel (B01/B02/B04) | `pos_ncf_secuencias`, con apartado atómico |
| Usuarios y permisos por rol | `pos_acceso` |
| Contabilidad y nómina | `pos_asientos`, `rrhh_*` (opcional para Unive 2) |

## Falta (trabajo nuevo)
| Necesidad | Para qué |
|---|---|
| **Tamaños y opciones** (Personal…Familiar; pan de agua o sobao, con queso o sin queso) | Hoy no hay variantes ni modificadores |
| **Mesas** (abrir, sumar y cobrar) | Hay 3 menciones; por confirmar si sirve |
| **Propina del 10 %** | 0 menciones |
| **Comanda por estación** (horno, plancha, jugos) | 0 menciones |
| **Delivery** (dirección, envío, motorista) | 7 menciones, por revisar |
| **Recetas o insumos** (masa, queso) | Opcional, fase 2 |
| **Menú por horario** (desayuno y tarde) | Si la dueña lo confirma |
| **e-CF** con MSeller | Cuando tenga RNC (`docs/e-cf/`) |
| Diseño: fondo D, vidrio y efectos de NEXUS | Maqueta aprobada en dirección (JynWpSvB2H4GaueppMTMD2) |

## Sobra para Unive 2 (no se activa)
Reparaciones y seriales, financiamientos, apartados, transferencias entre almacenes y conciliación bancaria. Estas tablas vienen en el esquema clonado: se dejan sin usar o se omiten.

## Dónde vive hoy cada cliente con base propia
| Cliente | Repositorio | Dominio |
|---|---|---|
| Deluxe Beauty Center | `DELUXE-BEAUTY-CENTER-` | deluxe.nexusprord.com |
| Amatista Dental | `AMATISTA-DENTAL` | amatista.nexusprord.com |
| STUDIO | `studio-rd` (POS clonado de NEXUS) | studiord.net |
| (Geriatra) | `geriatria` | base borrada el 25-oct |

**Todos los repositorios son públicos.** No hay secretos en ellos según las reglas, pero sí lógica de negocio a la vista. Para clientes conviene que sean privados (la integración de Cloudflare funciona igual).
