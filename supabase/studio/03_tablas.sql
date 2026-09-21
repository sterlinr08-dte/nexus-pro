-- STUDIO — 03 tablas
-- 65 tablas extraídas de pg_attribute/pg_attrdef/pg_constraint de la base madre (tnwsgcxurfyuszxsewsn).
-- Incluye columnas, tipos, NOT NULL, DEFAULT y constraints PK/UNIQUE/CHECK. Las FKs y los índices van en 04.
-- Orden: tablas base, luego pos_* (alfabético), rrhh_*, saas_*. No hay columnas identity ni generadas en este set.
-- pos_compras.numero y pos_ventas.numero usan nextval() sobre secuencias públicas: se crean aquí de forma
-- idempotente (05_secuencias.sql las vuelve a declarar con "if not exists" para documentarlas).

create sequence if not exists public.pos_compra_seq as integer start with 1 increment by 1 minvalue 1 maxvalue 2147483647 cache 1 no cycle;
create sequence if not exists public.pos_venta_seq  as integer start with 1 increment by 1 minvalue 1 maxvalue 2147483647 cache 1 no cycle;
create sequence if not exists public.recibo_seq     as integer start with 1 increment by 1 minvalue 1 maxvalue 2147483647 cache 1 no cycle;

-- ================================================================ Base
create table public.organizaciones (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  nombre text not null,
  tipo text default 'seguros'::text not null,
  logo text,
  color text,
  dominio text,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  auth_url text,
  auth_key text,
  email_dominio text,
  activo_hasta timestamp with time zone,
  constraint organizaciones_pkey PRIMARY KEY (id),
  constraint organizaciones_slug_key UNIQUE (slug)
);

create table public.usuarios_sistema (
  id uuid default gen_random_uuid() not null,
  nom text,
  cargo text,
  login text,
  pwd text,
  rol text,
  activo boolean,
  created_at timestamp with time zone default now(),
  email text,
  password_hash text,
  ultimo_login text,
  updated_at timestamp with time zone,
  tema_preferido text,
  permisos_override jsonb,
  creado_por text,
  actualizado_por text,
  puede_cobrar_todos boolean,
  organizacion_id uuid,
  es_superadmin boolean default false not null,
  almacen_id uuid,
  constraint usuarios_sistema_pkey PRIMARY KEY (id)
);

create table public.profiles (
  id uuid not null,
  usuario_sistema_id uuid,
  login text,
  nom text,
  rol text default 'agente'::text,
  agente_id uuid,
  activo boolean default true,
  must_change_password boolean default true,
  created_at timestamp with time zone default now(),
  constraint profiles_pkey PRIMARY KEY (id)
);

-- "if not exists" porque 02_helpers.sql ya la crea (mi_agente_efectivo la referencia).
create table if not exists public.agentes (
  id uuid default gen_random_uuid() not null,
  nom text,
  cargo text,
  tel text,
  email text,
  activo boolean,
  created_at timestamp with time zone default now(),
  licencia text,
  lic_vence text,
  constraint agentes_pkey PRIMARY KEY (id)
);

create table public.bancos (
  id uuid default gen_random_uuid() not null,
  nombre text,
  activo boolean,
  created_at timestamp with time zone default now(),
  constraint bancos_pkey PRIMARY KEY (id)
);

create table public.auditoria (
  id uuid default gen_random_uuid() not null,
  ts text,
  usuario text,
  rol text,
  accion text,
  detalle text,
  modulo text,
  created_at timestamp with time zone default now(),
  user_id text,
  entity_table text,
  entity_id text,
  old_data text,
  new_data text,
  result text,
  error_message text,
  ip text,
  device text,
  origen text,
  cliente_id uuid,
  sucursal text,
  organizacion_id uuid,
  constraint auditoria_pkey PRIMARY KEY (id)
);

create table public.secuencias_ncf (
  tipo text not null,
  ultimo_numero numeric,
  constraint secuencias_ncf_pkey PRIMARY KEY (tipo)
);

create table public.recibo_contador (
  anio integer not null,
  ultimo integer default 0 not null,
  constraint recibo_contador_pkey PRIMARY KEY (anio)
);

create table public.usuario_preferencias (
  usuario_id uuid not null,
  datos jsonb default '{}'::jsonb not null,
  updated_at timestamp with time zone default now() not null,
  constraint usuario_preferencias_pkey PRIMARY KEY (usuario_id)
);

-- ================================================================ POS
create table public.pos_abonos (
  id uuid default gen_random_uuid() not null,
  cliente_id uuid not null,
  venta_id uuid,
  monto numeric default 0 not null,
  fecha date default CURRENT_DATE not null,
  metodo text default 'Efectivo'::text not null,
  nota text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  caja_id uuid,
  organizacion_id uuid,
  numero text,
  constraint pos_abonos_pkey PRIMARY KEY (id)
);

create table public.pos_acceso (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  rol text not null,
  label text,
  modulos jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_acceso_pkey PRIMARY KEY (id),
  constraint pos_acceso_organizacion_id_rol_key UNIQUE (organizacion_id, rol)
);

create table public.pos_almacenes (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  nombre text not null,
  direccion text,
  es_principal boolean default false not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_almacenes_pkey PRIMARY KEY (id)
);

create table public.pos_apartado_pagos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  apartado_id uuid,
  monto numeric not null,
  metodo text,
  fecha date default CURRENT_DATE,
  created_at timestamp with time zone default now(),
  constraint pos_apartado_pagos_pkey PRIMARY KEY (id)
);

create table public.pos_apartados (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  numero text,
  cliente_nombre text not null,
  telefono text,
  descripcion text not null,
  producto_id uuid,
  total numeric not null,
  abonado numeric default 0,
  fecha_limite date,
  estado text default 'activo'::text,
  nota text,
  created_at timestamp with time zone default now(),
  cliente_id uuid,
  almacen_id uuid,
  serial_id uuid,
  constraint pos_apartados_pkey PRIMARY KEY (id)
);

create table public.pos_asiento_lineas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  asiento_id uuid,
  cuenta_id uuid,
  cuenta_codigo text,
  cuenta_nombre text,
  descripcion text,
  debito numeric default 0 not null,
  credito numeric default 0 not null,
  constraint pos_asiento_lineas_pkey PRIMARY KEY (id)
);

create table public.pos_asientos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  fecha date default CURRENT_DATE not null,
  concepto text,
  referencia text,
  tipo text default 'manual'::text not null,
  origen_id uuid,
  created_at timestamp with time zone default now() not null,
  numero text,
  constraint pos_asientos_pkey PRIMARY KEY (id)
);

create table public.pos_banco_conciliaciones (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  cuenta_bancaria_id uuid not null,
  movimiento_id uuid not null,
  extracto_id uuid not null,
  nota text,
  conciliado_por uuid,
  conciliado_at timestamp with time zone default now() not null,
  constraint pos_banco_conciliaciones_pkey PRIMARY KEY (id)
);

create table public.pos_banco_extractos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  cuenta_bancaria_id uuid not null,
  fecha date not null,
  monto numeric not null,
  descripcion text not null,
  referencia text,
  fingerprint text not null,
  creado_por uuid,
  created_at timestamp with time zone default now() not null,
  constraint pos_banco_extractos_monto_check CHECK ((monto <> (0)::numeric)),
  constraint pos_banco_extractos_pkey PRIMARY KEY (id)
);

create table public.pos_banco_movimientos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  cuenta_bancaria_id uuid not null,
  fecha timestamp with time zone default now() not null,
  monto numeric not null,
  concepto text not null,
  referencia text,
  origen_tipo text,
  origen_id uuid,
  origen_clave text,
  creado_por uuid,
  created_at timestamp with time zone default now() not null,
  constraint pos_banco_movimientos_monto_check CHECK ((monto <> (0)::numeric)),
  constraint pos_banco_movimientos_pkey PRIMARY KEY (id)
);

create table public.pos_caja_movimientos (
  id uuid default gen_random_uuid() not null,
  caja_id uuid not null,
  tipo text default 'salida'::text not null,
  concepto text,
  monto numeric default 0 not null,
  fecha timestamp with time zone default now() not null,
  created_by_name text,
  organizacion_id uuid,
  constraint pos_caja_movimientos_pkey PRIMARY KEY (id)
);

create table public.pos_cajas (
  id uuid default gen_random_uuid() not null,
  apertura timestamp with time zone default now() not null,
  cierre timestamp with time zone,
  monto_inicial numeric default 0 not null,
  estado text default 'abierta'::text not null,
  ventas_efectivo numeric default 0 not null,
  ventas_tarjeta numeric default 0 not null,
  ventas_transferencia numeric default 0 not null,
  ventas_credito numeric default 0 not null,
  abonos_efectivo numeric default 0 not null,
  entradas numeric default 0 not null,
  salidas numeric default 0 not null,
  efectivo_esperado numeric default 0 not null,
  efectivo_contado numeric default 0 not null,
  descuadre numeric default 0 not null,
  notas text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  organizacion_id uuid,
  usuario_id uuid,
  usuario_nombre text,
  constraint pos_cajas_pkey PRIMARY KEY (id)
);

create table public.pos_categorias (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  orden integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  organizacion_id uuid,
  constraint pos_categorias_pkey PRIMARY KEY (id)
);

create table public.pos_clientes (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  cedula text,
  telefono text,
  direccion text,
  limite_credito numeric default 0 not null,
  notas text,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  organizacion_id uuid,
  codigo text,
  tipo_persona text default 'fisica'::text not null,
  contacto text,
  representante text,
  email text,
  es_cliente boolean default true not null,
  es_empleado boolean default false not null,
  es_proveedor boolean default false not null,
  es_banco boolean default false not null,
  nivel_precio text default 'final'::text not null,
  acepta_whatsapp boolean default false,
  acepta_whatsapp_fecha timestamp with time zone,
  nivel_id uuid,
  constraint pos_clientes_pkey PRIMARY KEY (id)
);

create table public.pos_compra_items (
  id uuid default gen_random_uuid() not null,
  compra_id uuid not null,
  producto_id uuid,
  nombre text,
  cantidad numeric default 1 not null,
  costo numeric default 0 not null,
  importe numeric default 0 not null,
  organizacion_id uuid,
  constraint pos_compra_items_pkey PRIMARY KEY (id)
);

create table public.pos_compra_pagos (
  id uuid default gen_random_uuid() not null,
  proveedor_id uuid not null,
  compra_id uuid,
  monto numeric default 0 not null,
  fecha date default CURRENT_DATE not null,
  metodo text default 'Efectivo'::text not null,
  nota text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  organizacion_id uuid,
  numero text,
  cuenta_bancaria_id uuid,
  constraint pos_compra_pagos_pkey PRIMARY KEY (id)
);

create table public.pos_compras (
  id uuid default gen_random_uuid() not null,
  numero integer default nextval('pos_compra_seq'::regclass) not null,
  fecha date default CURRENT_DATE not null,
  proveedor_id uuid,
  proveedor_nombre text,
  ncf text,
  subtotal numeric default 0 not null,
  itbis numeric default 0 not null,
  total numeric default 0 not null,
  a_credito boolean default false not null,
  estado text default 'recibida'::text not null,
  notas text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  organizacion_id uuid,
  almacen_id uuid,
  email text,
  empleado_id uuid,
  empleado_nombre text,
  vencimiento date,
  orden_no text,
  liquidacion_no text,
  operacion_id uuid,
  constraint pos_compras_pkey PRIMARY KEY (id)
);

create table public.pos_config (
  organizacion_id uuid not null,
  prefijo_contado text default 'CO'::text not null,
  prefijo_credito text default 'CR'::text not null,
  created_at timestamp with time zone default now() not null,
  mora_pct numeric default 0 not null,
  mora_dias_gracia integer default 0 not null,
  garantia_rep_dias integer default 0 not null,
  constraint pos_config_pkey PRIMARY KEY (organizacion_id)
);

create table public.pos_cotizacion_items (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  cotizacion_id uuid,
  producto_id uuid,
  nombre text,
  precio numeric default 0 not null,
  cantidad numeric default 1 not null,
  itbis boolean default true not null,
  descuento numeric default 0 not null,
  importe numeric default 0 not null,
  constraint pos_cotizacion_items_pkey PRIMARY KEY (id)
);

create table public.pos_cotizaciones (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  numero text,
  cliente_id uuid,
  cliente_nombre text,
  fecha date default CURRENT_DATE not null,
  validez_dias integer default 15 not null,
  subtotal numeric default 0 not null,
  itbis numeric default 0 not null,
  descuento numeric default 0 not null,
  total numeric default 0 not null,
  estado text default 'vigente'::text not null,
  notas text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  constraint pos_cotizaciones_pkey PRIMARY KEY (id)
);

create table public.pos_credito_eventos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  cliente_id uuid,
  venta_id uuid,
  financiamiento_id uuid,
  tipo text not null,
  monto numeric default 0 not null,
  fecha_compromiso date,
  nota text,
  creado_por uuid,
  created_at timestamp with time zone default now() not null,
  constraint pos_credito_eventos_check CHECK (((venta_id IS NOT NULL) OR (financiamiento_id IS NOT NULL))),
  constraint pos_credito_eventos_tipo_check CHECK ((tipo = ANY (ARRAY['promesa'::text, 'refinanciacion'::text, 'castigo'::text, 'vencimiento'::text]))),
  constraint pos_credito_eventos_pkey PRIMARY KEY (id)
);

create table public.pos_crm (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  nombre text not null,
  cliente_id uuid,
  contacto text,
  telefono text,
  email text,
  monto_estimado numeric default 0 not null,
  etapa text default 'nuevo'::text not null,
  fuente text,
  proxima_accion date,
  notas text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  cerrado_at timestamp with time zone,
  numero text,
  constraint pos_crm_pkey PRIMARY KEY (id)
);

create table public.pos_cuentas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  codigo text not null,
  nombre text not null,
  tipo text default 'activo'::text not null,
  naturaleza text default 'deudora'::text not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_cuentas_pkey PRIMARY KEY (id)
);

create table public.pos_cuentas_bancarias (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  banco_nombre text not null,
  alias text not null,
  numero text not null,
  tipo text default 'corriente'::text not null,
  moneda text default 'DOP'::text not null,
  saldo_inicial numeric default 0 not null,
  fecha_saldo_inicial date default CURRENT_DATE not null,
  predeterminada boolean default false not null,
  activa boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint pos_cuentas_bancarias_tipo_check CHECK ((tipo = ANY (ARRAY['corriente'::text, 'ahorros'::text, 'otro'::text]))),
  constraint pos_cuentas_bancarias_pkey PRIMARY KEY (id)
);

create table public.pos_devolucion_items (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  devolucion_id uuid,
  producto_id uuid,
  nombre text,
  cantidad numeric default 1 not null,
  precio numeric default 0 not null,
  itbis boolean default true not null,
  importe numeric default 0 not null,
  constraint pos_devolucion_items_pkey PRIMARY KEY (id)
);

create table public.pos_devoluciones (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  venta_id uuid,
  numero text,
  ncf text,
  fecha date default CURRENT_DATE not null,
  cliente_id uuid,
  cliente_nombre text,
  motivo text,
  subtotal numeric default 0 not null,
  itbis numeric default 0 not null,
  total numeric default 0 not null,
  metodo text,
  estado text default 'emitida'::text not null,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  constraint pos_devoluciones_pkey PRIMARY KEY (id)
);

create table public.pos_documento_eventos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  documento_id uuid not null,
  evento text not null,
  detalle text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  constraint pos_documento_eventos_pkey PRIMARY KEY (id)
);

create table public.pos_documentos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  tipo text not null,
  codigo text,
  tabla_origen text not null,
  registro_id uuid not null,
  documento_padre_id uuid,
  cliente_id uuid,
  monto numeric,
  estado text default 'vigente'::text not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_documentos_tipo_check CHECK ((tipo = ANY (ARRAY['cotizacion'::text, 'prefactura'::text, 'factura'::text, 'garantia'::text]))),
  constraint pos_documentos_pkey PRIMARY KEY (id)
);

create table public.pos_fin_cuotas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  financiamiento_id uuid not null,
  numero integer not null,
  fecha_venc date not null,
  monto numeric not null,
  pagado boolean default false,
  fecha_pago date,
  metodo text,
  created_at timestamp with time zone default now(),
  monto_pagado numeric default 0 not null,
  mora_pagada numeric default 0 not null,
  mora_generada numeric default 0 not null,
  constraint pos_fin_cuotas_pkey PRIMARY KEY (id),
  constraint pos_fin_cuotas_org_id_key UNIQUE (organizacion_id, id)
);

create table public.pos_fin_pagos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  financiamiento_id uuid not null,
  cuota_id uuid not null,
  monto numeric not null,
  metodo text,
  fecha date default CURRENT_DATE,
  referencia text,
  created_by_name text,
  created_at timestamp with time zone default now(),
  tipo text default 'pago'::text not null,
  reversa_de_id uuid,
  motivo_reversa text,
  operacion_id uuid,
  monto_principal numeric default 0 not null,
  monto_mora numeric default 0 not null,
  caja_id uuid,
  cuenta_bancaria_id uuid,
  constraint pos_fin_pagos_monto_positivo CHECK ((monto > (0)::numeric)),
  constraint pos_fin_pagos_tipo_check CHECK ((tipo = ANY (ARRAY['pago'::text, 'reversa'::text]))),
  constraint pos_fin_pagos_pkey PRIMARY KEY (id)
);

create table public.pos_financiamientos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  venta_id uuid,
  cliente_id uuid,
  cliente_nombre text,
  descripcion text,
  monto_total numeric default 0,
  inicial numeric default 0,
  monto_financiado numeric not null,
  cuotas_total integer not null,
  cuota_monto numeric not null,
  frecuencia text default 'semanal'::text,
  estado text default 'activo'::text not null,
  created_at timestamp with time zone default now(),
  refinanciado_desde_id uuid,
  refinanciado_a_id uuid,
  castigo_monto numeric default 0 not null,
  castigo_fecha date,
  castigo_motivo text,
  castigo_por uuid,
  constraint pos_financiamientos_estado_check CHECK ((estado = ANY (ARRAY['activo'::text, 'saldado'::text, 'cancelado'::text, 'refinanciado'::text, 'castigado'::text]))),
  constraint pos_financiamientos_pkey PRIMARY KEY (id),
  constraint pos_financiamientos_org_id_key UNIQUE (organizacion_id, id)
);

create table public.pos_inv_movimientos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  producto_id uuid,
  producto_nombre text,
  tipo text default 'ajuste'::text not null,
  cantidad numeric default 0 not null,
  stock_anterior numeric,
  stock_nuevo numeric,
  referencia text,
  motivo text,
  created_by_name text,
  fecha timestamp with time zone default now() not null,
  constraint pos_inv_movimientos_tipo_check CHECK ((tipo = ANY (ARRAY['compra'::text, 'venta'::text, 'ajuste'::text, 'transferencia'::text, 'garantia'::text, 'taller'::text, 'produccion'::text, 'devolucion'::text, 'anulacion'::text, 'apertura'::text]))),
  constraint pos_inv_movimientos_pkey PRIMARY KEY (id)
);

create table public.pos_ncf_secuencias (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  tipo text not null,
  descripcion text,
  prefijo text not null,
  desde bigint default 1 not null,
  hasta bigint default 1 not null,
  actual bigint default 1 not null,
  vencimiento date,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_ncf_secuencias_pkey PRIMARY KEY (id)
);

create table public.pos_niveles_precio (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  nombre text not null,
  orden integer default 0 not null,
  es_default boolean default false not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  descripcion text,
  tipo text default 'fijo'::text not null,
  color text,
  constraint pos_niveles_precio_pkey PRIMARY KEY (id),
  constraint pos_niveles_precio_organizacion_id_nombre_key UNIQUE (organizacion_id, nombre)
);

create table public.pos_periodos_contables (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  periodo date not null,
  estado text default 'abierto'::text not null,
  cerrado_at timestamp with time zone,
  cerrado_por uuid,
  reabierto_at timestamp with time zone,
  reabierto_por uuid,
  motivo_reapertura text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint pos_periodos_contables_estado_check CHECK ((estado = ANY (ARRAY['abierto'::text, 'cerrado'::text]))),
  constraint pos_periodos_contables_periodo_check CHECK ((periodo = (date_trunc('month'::text, (periodo)::timestamp with time zone))::date)),
  constraint pos_periodos_contables_pkey PRIMARY KEY (id),
  constraint pos_periodos_contables_organizacion_id_periodo_key UNIQUE (organizacion_id, periodo)
);

create table public.pos_prefacturas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  numero text,
  cliente_id uuid,
  cliente_nombre text,
  items jsonb default '[]'::jsonb,
  total numeric default 0,
  nota text,
  estado text default 'abierta'::text,
  created_by_name text,
  created_at timestamp with time zone default now(),
  notas text,
  constraint pos_prefacturas_pkey PRIMARY KEY (id)
);

create table public.pos_producto_niveles (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  producto_id uuid not null,
  nivel_id uuid not null,
  precio_contado numeric default 0 not null,
  precio_credito numeric,
  precio_minimo numeric,
  created_at timestamp with time zone default now() not null,
  precio_especial numeric,
  cantidad_minima numeric default 1,
  credito_pct numeric,
  credito_monto numeric,
  precio_anterior numeric,
  descuento_pct numeric,
  constraint pos_producto_niveles_pkey PRIMARY KEY (id),
  constraint pos_producto_niveles_organizacion_id_producto_id_nivel_id_key UNIQUE (organizacion_id, producto_id, nivel_id)
);

create table public.pos_productos (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  codigo text,
  categoria_id uuid,
  precio numeric default 0 not null,
  costo numeric default 0 not null,
  stock numeric default 0 not null,
  itbis boolean default true not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  marca text,
  referencia text,
  imagen text,
  precio_credito numeric default 0 not null,
  tipo text default 'producto'::text not null,
  stock_min numeric default 0 not null,
  garantia_dias integer default 0 not null,
  serial boolean default false not null,
  no_descuento boolean default false not null,
  organizacion_id uuid,
  precio_mayor numeric,
  precio_minimo numeric default 0,
  combo_items jsonb default '[]'::jsonb,
  proveedor_id uuid,
  comision_pct numeric,
  favorito boolean default false not null,
  descripcion text,
  notas text,
  constraint pos_productos_pkey PRIMARY KEY (id)
);

create table public.pos_proveedores (
  id uuid default gen_random_uuid() not null,
  nombre text not null,
  rnc text,
  telefono text,
  direccion text,
  contacto text,
  notas text,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  organizacion_id uuid,
  tiempo_entrega_dias integer,
  constraint pos_proveedores_pkey PRIMARY KEY (id)
);

create table public.pos_reparacion_piezas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid not null,
  reparacion_id uuid not null,
  producto_id uuid not null,
  almacen_id uuid,
  cantidad numeric not null,
  costo_unitario numeric default 0 not null,
  estado text default 'reservada'::text not null,
  reservada_at timestamp with time zone default now() not null,
  usada_at timestamp with time zone,
  devuelta_at timestamp with time zone,
  creado_por uuid,
  created_at timestamp with time zone default now() not null,
  constraint pos_reparacion_piezas_cantidad_check CHECK ((cantidad > (0)::numeric)),
  constraint pos_reparacion_piezas_estado_check CHECK ((estado = ANY (ARRAY['reservada'::text, 'usada'::text, 'devuelta'::text]))),
  constraint pos_reparacion_piezas_pkey PRIMARY KEY (id)
);

create table public.pos_reparaciones (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  numero text,
  cliente_nombre text not null,
  cliente_telefono text,
  equipo text not null,
  imei text,
  clave text,
  accesorios text,
  falla text,
  estado_fisico text,
  diagnostico text,
  presupuesto numeric default 0,
  abono numeric default 0,
  costo_piezas numeric default 0,
  estado text default 'recibido'::text,
  tecnico text,
  nota text,
  cobrado boolean default false,
  cobrado_monto numeric default 0,
  cobrado_metodo text,
  entregado_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  garantia_hasta date,
  garantia_origen_id uuid,
  es_garantia boolean default false not null,
  garantia_cobro_autorizado boolean default false not null,
  garantia_cobro_motivo text,
  garantia_cobro_autorizado_por uuid,
  constraint pos_reparaciones_pkey PRIMARY KEY (id)
);

create table public.pos_secuencias (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  tipo text not null,
  nombre text,
  prefijo text default ''::text not null,
  longitud integer default 5 not null,
  proximo bigint default 1 not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_secuencias_pkey PRIMARY KEY (id),
  constraint pos_secuencias_organizacion_id_tipo_key UNIQUE (organizacion_id, tipo)
);

create table public.pos_seriales (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  producto_id uuid not null,
  serial text not null,
  estado text default 'disponible'::text not null,
  almacen_id uuid,
  venta_id uuid,
  notas text,
  created_at timestamp with time zone default now() not null,
  email text,
  compra_id uuid,
  color text,
  reserva_token uuid,
  reserva_hasta timestamp with time zone,
  constraint pos_seriales_estado_check CHECK ((estado = ANY (ARRAY['disponible'::text, 'reservado'::text, 'vendido'::text]))),
  constraint pos_seriales_pkey PRIMARY KEY (id)
);

create table public.pos_stock_almacen (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  producto_id uuid not null,
  almacen_id uuid not null,
  stock numeric default 0 not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_stock_almacen_pkey PRIMARY KEY (id),
  constraint pos_stock_almacen_producto_id_almacen_id_key UNIQUE (producto_id, almacen_id)
);

create table public.pos_transferencia_item_seriales (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  transferencia_item_id uuid not null,
  serial_id uuid not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_transferencia_item_seriales_pkey PRIMARY KEY (id)
);

create table public.pos_transferencia_items (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  transferencia_id uuid,
  producto_id uuid,
  nombre text,
  cantidad numeric default 0 not null,
  constraint pos_transferencia_items_pkey PRIMARY KEY (id)
);

create table public.pos_transferencias (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  numero text,
  fecha date default CURRENT_DATE not null,
  origen_id uuid,
  destino_id uuid,
  origen_nombre text,
  destino_nombre text,
  notas text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  constraint pos_transferencias_pkey PRIMARY KEY (id)
);

create table public.pos_vendedores (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  nombre text not null,
  telefono text,
  comision_pct numeric default 0 not null,
  activo boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint pos_vendedores_pkey PRIMARY KEY (id)
);

create table public.pos_venta_items (
  id uuid default gen_random_uuid() not null,
  venta_id uuid not null,
  producto_id uuid,
  nombre text,
  precio numeric default 0 not null,
  cantidad numeric default 1 not null,
  itbis boolean default true not null,
  importe numeric default 0 not null,
  organizacion_id uuid,
  descuento numeric default 0 not null,
  serial text,
  garantia_hasta date,
  linea_orden integer,
  costo_unitario numeric,
  constraint pos_venta_items_pkey PRIMARY KEY (id)
);

create table public.pos_ventas (
  id uuid default gen_random_uuid() not null,
  numero integer default nextval('pos_venta_seq'::regclass) not null,
  fecha timestamp with time zone default now() not null,
  cliente_nombre text,
  subtotal numeric default 0 not null,
  itbis numeric default 0 not null,
  total numeric default 0 not null,
  metodo_pago text default 'Efectivo'::text not null,
  recibido numeric default 0 not null,
  devuelta numeric default 0 not null,
  estado text default 'completada'::text not null,
  notas text,
  created_by_name text,
  created_at timestamp with time zone default now() not null,
  cliente_id uuid,
  a_credito boolean default false not null,
  caja_id uuid,
  descuento numeric default 0 not null,
  pagos jsonb default '[]'::jsonb not null,
  pagado_efectivo numeric default 0 not null,
  pagado_tarjeta numeric default 0 not null,
  pagado_transferencia numeric default 0 not null,
  pagado_otro numeric default 0 not null,
  credito_monto numeric default 0 not null,
  organizacion_id uuid,
  tipo_comprobante text,
  numero_factura text,
  ncf text,
  vendedor_id uuid,
  vendedor_nombre text,
  almacen_id uuid,
  inventario_aplicado boolean default true not null,
  operacion_id uuid,
  credito_vencimiento date,
  constraint pos_ventas_pkey PRIMARY KEY (id)
);

create table public.pos_ventas_suspendidas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  numero text,
  cliente_id uuid,
  cliente_nombre text,
  items jsonb default '[]'::jsonb,
  total numeric default 0,
  notas text,
  created_by_name text,
  created_at timestamp with time zone default now(),
  constraint pos_ventas_suspendidas_pkey PRIMARY KEY (id)
);

-- ================================================================ RRHH
create table public.rrhh_empleados (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  nombre text not null,
  cedula text,
  telefono text,
  email text,
  puesto text,
  departamento text,
  salario numeric default 0 not null,
  tipo_pago text default 'mensual'::text not null,
  fecha_ingreso date,
  tss text,
  cuenta_banco text,
  banco text,
  activo boolean default true not null,
  notas text,
  created_at timestamp with time zone default now() not null,
  entidad_id uuid,
  constraint rrhh_empleados_pkey PRIMARY KEY (id)
);

create table public.rrhh_nomina_lineas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  nomina_id uuid,
  empleado_id uuid,
  empleado_nombre text,
  salario_bruto numeric default 0 not null,
  bonos numeric default 0 not null,
  sfs numeric default 0 not null,
  afp numeric default 0 not null,
  isr numeric default 0 not null,
  otras_deducciones numeric default 0 not null,
  neto numeric default 0 not null,
  notas text,
  constraint rrhh_nomina_lineas_pkey PRIMARY KEY (id)
);

create table public.rrhh_nominas (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  periodo text,
  descripcion text,
  fecha date default CURRENT_DATE not null,
  tipo text default 'mensual'::text not null,
  total_bruto numeric default 0 not null,
  total_deducciones numeric default 0 not null,
  total_neto numeric default 0 not null,
  estado text default 'borrador'::text not null,
  created_at timestamp with time zone default now() not null,
  numero text,
  constraint rrhh_nominas_pkey PRIMARY KEY (id)
);

-- ================================================================ SaaS
create table public.saas_pagos (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  suscripcion_id uuid,
  monto numeric not null,
  fecha date default CURRENT_DATE not null,
  periodo text,
  metodo text,
  referencia text,
  nota text,
  created_at timestamp with time zone default now(),
  constraint saas_pagos_pkey PRIMARY KEY (id)
);

create table public.saas_suscripciones (
  id uuid default gen_random_uuid() not null,
  organizacion_id uuid,
  nombre text not null,
  sistema text,
  base_ref text,
  dominio text,
  mensualidad numeric default 0,
  costo_base numeric default 0,
  dia_cobro integer default 1,
  whatsapp text,
  contacto text,
  nota text,
  activo boolean default true,
  created_at timestamp with time zone default now(),
  constraint saas_suscripciones_pkey PRIMARY KEY (id)
);
