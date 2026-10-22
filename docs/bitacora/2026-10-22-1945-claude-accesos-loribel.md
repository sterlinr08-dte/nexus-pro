# Auditoría (solo lectura): accesos de LORIBEL en NEXUS PRO

**Pedido del dueño:** «Quiero saber cuáles accesos tiene ella.»

## Datos (producción, solo lectura)
- `usuarios_sistema` `840197dd…`:
  - nom LORIBEL, cargo CAJERA, login `loribel`, rol **cajero**, activo;
  - organización `nexus-pro`, `permisos_override` null, no es superadmin, no está ligada a un agente.
- Auth: `loribel@nexus-pro.local`, creado el 15-oct; último ingreso el 21-oct-2026 21:05 UTC.
- `configuracion.roles_perms` → cajero: `ver_clientes`, `ver_facturas`, `cobrar`. Ninguno de los tres se consulta en el código (`tienePermiso` solo mira `modificar_precio`, `editar_facturas`, `can_view_accounting` y `tabla_comparativa`).
- `aplicarRolSidebar()`: quien no es admin no ve Configuración ni el menú Administración. Contabilidad solo con `can_view_accounting`.
- Solo un admin puede reversar cobros (RPC `seguros_reversar_cobro`) y aprobar un comprobante repetido (59.56).
- `puede_cobrar_todos` no se usa en ninguna parte.

## Hallazgo
- Hay **otro usuario con el mismo login `loribel`**: «Francis (Bayolsale)», rol admin, organización `bayolsale`, creado el 19-jun. Está en otra empresa; no da acceso a NEXUS, pero puede confundir. Se informa al dueño. No se cambió nada.

## Sin cambios en código ni en datos.
