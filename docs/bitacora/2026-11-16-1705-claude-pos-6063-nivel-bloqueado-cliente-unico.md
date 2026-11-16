# 16-nov-2026 17:05 (RD) — Claude — POS 6063: nivel de precio bloqueado y cliente sin duplicar

## Pedido del dueño
1. «El nivel del precio solo se puede facturar o prefacturar a los clientes que lo tengan asignado, y los empleados no lo pueden cambiar.»
2. Prueba de Muse a la 6062 (16-nov, 16:40–16:46): un solo «Guardar» de la Prefactura creó el cliente nuevo **dos veces**.

## Diagnóstico
- **Nivel:** la Prefactura tenía un selector de nivel que cualquiera podía cambiar. La ficha del cliente también dejaba cambiar el nivel a cualquier rol.
- **Duplicado:** en la base de la demo, «Cliente Prueba V6062» quedó dos veces, con 0,58 s de diferencia (20:45:01.20 y 20:45:01.78 UTC). La PF-00004 quedó con el segundo.
  - El único lugar que crea ese cliente es `pfbAsegurarCliente`, y todas las vías de guardar pasan por el candado `_prefGuardando`.
  - Con Playwright en la demo en vivo (1440 y 390 px; con «Guardar» y con «Guardar e imprimir») las escrituras se interceptaron y no llegaron a la base. Hubo **un solo** POST `pos_clientes` en cada caso. No se pudo reproducir.
  - Por eso se blindó el alta, en vez de suponer la causa.

## Cambios
**`parches-pos.js`**
- `nivelForzado()` ya no fuerza ningún nivel. El «Precio» de la Prefactura es un dato fijo con candado: muestra el nivel del cliente y no se puede cambiar (se quitó el select `nxPfbNivel`).
- En la ficha del cliente, `#entNivel` queda deshabilitado para quien no es administrador ni gerente, con el aviso «Solo el administrador o el gerente cambia el nivel.».
- `nxEntGuardar`: un empleado no envía `nivel_id` ni `nivel_precio` al editar. Un cliente nuevo creado por un empleado queda con el nivel por defecto (`es_default`) o sin nivel, con precio `final`.
- `pfbAsegurarCliente`:
  - una sola alta a la vez: las llamadas que coinciden comparten la misma promesa;
  - antes de crear el cliente, consulta `pos_clientes` por el WhatsApp (en los formatos `8095550188` y `809-555-0188`). Si ya existe, usa ese cliente y no crea otro. Esto sirve también con otra pestaña abierta.

**`parches-seguros.js`:** `b=6062` → `b=6063`.

**Migración `20261116130000_pos_clientes_nivel_candado.sql`** (ya aplicada):
- trigger `trg_pos_clientes_nivel_candado`;
- solo administrador o gerente cambian `nivel_id` o `nivel_precio`;
- el alta hecha por otro rol debe usar el nivel por defecto (o ninguno) con precio `final`; si no, da el error `NIVEL_SOLO_ADMIN`.

**`scripts/qa-pos-prefactura-bayol.mjs`:**
- el stub ahora entiende el filtro `in.(…)`;
- prueba nueva: varios «Guardar» seguidos crean 1 cliente y 1 prefactura;
- prueba nueva: si el WhatsApp ya existe en la base (aunque la pantalla no lo tenga cargado), se usa ese cliente.

## Pruebas
- Regresión completa del POS: todo en verde, salvo las 4 fallas ya conocidas de `qa-pos-margen` (tema oscuro).
- `qa-pos-prefactura-bayol`: 110/110 (con las 6 pruebas nuevas, 2 por ancho). `qa-pos-prefactura`: 18/18.

## Otros puntos del informe de Muse
- «Cliente Prueba V6061» (8095550199) se creó con la 6061, antes del formato con guiones. No se tocó, porque es un dato de prueba de la demo.
- Al recargar con F5, la sesión de visitante demo se cierra y hay que tocar «Entrar» otra vez. Es el comportamiento actual de la demo; queda anotado como mejora posible.

## Estado
- Rama `claude/pos-nivel-bloqueado`. Sin publicar; espera el «Publícalo» del dueño.
