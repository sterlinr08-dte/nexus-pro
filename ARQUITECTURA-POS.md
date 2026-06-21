# ARQUITECTURA-POS.md — NEXUS PRO · POS multi-tenant

> Plano completo del sistema (cómo está hecho y cómo escala a millones).
> Documento de diseño. El detalle vivo de cada módulo está en `CLAUDE.md`.

---

## 0. Principio rector: "minimalista pero escalable"

La versión más escalable **no es la que más piezas tiene, sino la que menos
necesita mantener**. NEXUS PRO ya está en el punto correcto:

- **Sin build, sin framework, sin servidor propio** → nada que romper, desplegar
  ni parchear. Un archivo se edita y se sube.
- **Backend administrado (Supabase)** → Postgres real, auth, API y escalado los
  lleva el proveedor. No hay servidores que mantener.
- **Multi-tenant por fila + RLS** → un solo código y una sola base sirven a miles
  de negocios; un arreglo llega a todos.

> Regla: **no reescribir lo que ya escala.** El stack actual (PWA + Supabase +
> RLS) llega a millones de usuarios sin cambiar de arquitectura. Lo que se
> "construye" de aquí en adelante son **mejoras incrementales**, no un rewrite.

---

## 1. Arquitectura del sistema

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENTE (PWA instalable · móvil-first · offline de assets)    │
│  index.html + parches.js  →  render de vistas y POS            │
│  Service Worker (sw.js): cachea SOLO imágenes/iconos           │
└───────────────┬──────────────────────────────────────────────┘
                │ HTTPS (REST / Auth / RPC)  ·  anon key + JWT
                ▼
┌──────────────────────────────────────────────────────────────┐
│  CLOUDFLARE (borde global)                                     │
│  · Workers static assets → sirve el repo (deploy en push main) │
│  · CDN + caché de estáticos · dominio nexusprord.com           │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│  SUPABASE (backend administrado)                              │
│  · PostgREST   → API REST automática sobre cada tabla         │
│  · GoTrue      → Auth (JWT, refresh) · login usuario@org       │
│  · Postgres    → datos + RLS (aislamiento por organización)    │
│  · RPC         → funciones SQL (helpers de negocio)            │
│  · Supavisor   → pooling de conexiones (escala lectura)        │
└──────────────────────────────────────────────────────────────┘
```

**Multi-tenant (cómo se separan los clientes):**
- Cada negocio = una fila en `organizaciones` (`slug`, `tipo`, `dominio`…).
- Cada tabla de datos lleva `organizacion_id`.
- Un **trigger** (`set_organizacion_id()`) lo autocompleta en cada INSERT con
  `mi_organizacion()` (deriva de `auth.uid()` → `profiles` → `usuarios_sistema`).
- **RLS** filtra: `organizacion_id = mi_organizacion()`. Nadie ve datos de otro.
- **Mismo sistema → una base compartida.** **Sistema distinto** (Deluxe) → su
  propia base/subdominio. Puerta abierta a "híbrido": graduar un cliente grande a
  su propia base sin tocar a los demás.

---

## 2. Estructura de archivos

```
nexus-pro/
├── index.html         # Núcleo: HTML + CSS + JS del seguro, login, helpers, shell
├── parches.js         # POS + módulos nuevos (se inyecta sobre el núcleo)
├── sw.js              # Service Worker (cachea solo imágenes/iconos)
├── manifest.json      # Config PWA (instalable)
├── version.json       # Versión + changelog (auto-actualización)
├── wrangler.jsonc     # Config Cloudflare Workers (assets.directory: "./")
├── icon-*.png         # Iconos de la app
├── gen_icon.py        # Generador de iconos
├── CLAUDE.md          # Contexto vivo del proyecto (la memoria entre chats)
├── ARQUITECTURA-POS.md# Este plano
└── muestra-*.html     # Maquetas visuales (descartables)
```

**Convención de capas dentro del código (sin carpetas, pero ordenado):**
- `index.html` → núcleo: `API`, `fmt`, `esc`, `toast`, `sesion`, `CFG`, login,
  navegación de vistas, módulos de seguros.
- `parches.js` → cada módulo es un **IIFE** con sus `render*()`, su estado
  (`_prods`, `_ventas`…), sus helpers locales y su CSS inyectado una vez.

---

## 3. Esquema de base de datos

**Núcleo multi-tenant**
| Tabla | Para qué | Claves |
|---|---|---|
| `organizaciones` | directorio de negocios | `slug`, `nombre`, `tipo`, `logo`, `color`, `dominio`, `auth_url`, `auth_key`, `email_dominio`, `activo` |
| `usuarios_sistema` | usuarios | `login`, `rol`, `organizacion_id`, `activo` |
| `profiles` | enlace con Supabase Auth | `id`(=auth.uid), `usuario_sistema_id`, `rol`, `must_change_password` |

**POS (todas con `organizacion_id` + trigger + RLS):**
`pos_categorias`, `pos_productos`, `pos_clientes` (entidades), `pos_proveedores`,
`pos_ventas`, `pos_venta_items`, `pos_abonos`, `pos_cajas`, `pos_caja_movimientos`,
`pos_compras`, `pos_compra_items`, `pos_compra_pagos`, `pos_cotizaciones`,
`pos_cotizacion_items`, `pos_devoluciones`, `pos_devolucion_items`,
`pos_inv_movimientos`, `pos_almacenes`, `pos_stock_almacen`, `pos_transferencias`,
`pos_transferencia_items`, `pos_crm`, `pos_vendedores`, `pos_secuencias`,
`pos_acceso`, `pos_ncf_secuencias`, `pos_config`, `pos_cuentas`, `pos_asientos`,
`pos_asiento_lineas`.

**RRHH:** `rrhh_empleados`, `rrhh_nominas`, `rrhh_nomina_lineas`.

**Patrón obligatorio de cada tabla nueva (la "receta"):**
```sql
alter table pos_x add column organizacion_id uuid;
create trigger set_org before insert on pos_x
  for each row execute function set_organizacion_id();
alter table pos_x enable row level security;
create policy org_isolation on pos_x for all
  using  (organizacion_id = mi_organizacion())
  with check (organizacion_id = mi_organizacion());
-- índice crítico para escala:
create index on pos_x (organizacion_id);
```

**Helpers SQL (security definer):** `mi_organizacion()`, `mi_rol()`,
`set_organizacion_id()`. **Reglas de escala:** índice en `organizacion_id` en
cada tabla; índices compuestos para los filtros frecuentes
(`(organizacion_id, created_at)`); paginar siempre (`limit`/`order`).

---

## 4. Endpoints de API (Supabase, automáticos)

No se escriben endpoints a mano: PostgREST expone cada tabla. RLS garantiza que
cada llamada solo ve lo de su organización.

| Acción | Método / Endpoint |
|---|---|
| Login | `POST /auth/v1/token?grant_type=password` |
| Refresh | `POST /auth/v1/token?grant_type=refresh_token` |
| Leer | `GET /rest/v1/<tabla>?select=...&<filtros>&order=...&limit=...` |
| Crear | `POST /rest/v1/<tabla>` |
| Editar | `PATCH /rest/v1/<tabla>?id=eq.<id>` |
| Borrar | `DELETE /rest/v1/<tabla>?id=eq.<id>` |
| Lógica | `POST /rest/v1/rpc/<funcion>` |

Cliente JS: helper `API` (`get/post/patch/del`) en `index.html`, con `apikey` +
`Authorization: Bearer <jwt>`. **Buenas prácticas de escala ya aplicadas:**
`select` explícito (no `*` gigante), `limit` en históricos, join de líneas en JS
(no depender del embed), best-effort con `try/catch`.

---

## 5. Arquitectura de UI

- **PWA shell** (núcleo): barra superior, sidebar de seguros, sistema de vistas
  `.view` (`.on` muestra una). Móvil-first (320–480px), `safe-area`, drawer.
- **Modo tienda** (`body.org-tienda`): oculta el shell del seguro y monta el
  **POS independiente** = `shellTienda()` → barra lateral índigo + dashboard.
- **POS** (en `parches.js`): `renderPOS()` orquesta 16 `render*()` (Vender,
  Factura, Productos, Inventario, Compras, Clientes, Caja, Historial, Reportes,
  Contabilidad, RRHH, CRM, Cotizaciones, Entidades, Ajustes, Inicio).
- **Estado**: variables de módulo en memoria (`_prods`, `_ventas`, `_clientes`…)
  + `cargarPOS()` que las llena. Render = string templates → `innerHTML`.
- **Permisos**: `puedeVer(mod)` por rol (`pos_acceso`) controla qué se dibuja.
- **Diseño**: índigo-azul (`#4f46e5/#4338ca/#3730a3`), rejillas `auto-fit/minmax`,
  iconos Tabler, todo imprimible/PDF/WhatsApp, contexto `es-DO` (RD$, ITBIS, NCF).

---

## 6. Camino de escala (a millones)

| Etapa | Qué se hace | Cuándo |
|---|---|---|
| **Hoy** | 1 base compartida + RLS + índices `organizacion_id` | ✅ ya |
| Pooling | Supavisor/pgbouncer para muchas conexiones | incluido en Supabase |
| Lectura | índices compuestos + paginación + `count` estimado | al crecer datos |
| Históricos | particionar tablas grandes por `organizacion_id` o fecha | millones de filas |
| Réplicas | read replicas para reportes pesados | mucho tráfico |
| Híbrido | mover un tenant enorme a su propia base/subdominio | cliente gigante |
| Borde | Cloudflare CDN + caché de estáticos (ya), edge cache de RPC | global |

**Lo que NO se hace (anti-patrones para este caso):** microservicios, Kubernetes,
backend propio, ORM pesado, una base por cliente. Todo eso agrega costo de
mantenimiento sin dar escala real aquí.

---

## 7. Estándar de calidad por cada cambio (checklist)

1. **Depurar** — quitar dead code, no romper navegación/clics.
2. **Refactorizar** — limpio y consistente con el estilo del archivo.
3. **Probar** — `node --check parches.js` + revisar la lógica.
4. **Móvil angosto** — 320–480px, sin desbordes horizontales.
5. **Auditar grids** — `.qa-g`, `.kg`, `.g2/.g3/.g4`; breakpoints 768/640/480.
6. **Rejilla adaptable** — `auto-fit/auto-fill` + `minmax`, nunca anchos fijos.
7. **Ordenamiento por columnas** — tablas (Productos, Historial, Ventas…)
   ordenables al tocar el encabezado (asc/desc), con indicador visual.
8. **Despliegue** — subir `APP_VERSION` + `version.json`, commit, push a `main`.
