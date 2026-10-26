# e-CF con MSeller — fase 2: datos en la base (aplicado)

## Pedido
El dueño dijo «Sí, empieza» a la fase 2 (números e-NCF y RNC del comprador). Plan: `docs/planes/2026-10-26-ecf-mseller.md`.

## Auditoría previa (solo lectura)
- `pos_siguiente_ncf(p_tipo)` aparta el NCF de papel de forma atómica (`UPDATE…RETURNING`) y lo rellena con **8 dígitos** (B0100000001). Está en uso, así que **no se tocó**.
- Ya existe un índice único `pos_ventas_ncf_unico_por_org (organizacion_id, ncf)`. El e-NCF va en esa misma columna y queda protegido igual.
- `pos_ventas` no guardaba el RNC del comprador ni los datos de MSeller. `pos_clientes` tiene `cedula` (sirve para RNC de 9 dígitos o cédula de 11).
- Datos actuales: 3 secuencias (B01 de nexus-pro y de bayolsale, B02 de nexus-pro) y 1 venta con NCF.

## Aplicado en producción (`supabase/migrations/20261026010000_ecf_fase2_datos.sql`, en partes pequeñas con `execute_sql`)
- **`pos_ventas`**: 12 columnas nuevas, todas vacías (`comprador_rnc`, `comprador_razon_social`, `ecf_tipo`, `ecf_entorno`, `ecf_estado`, `ecf_security_code`, `ecf_qr_url`, `ecf_track_id`, `ecf_firmado`, `ecf_enviado_at`, `ecf_actualizado_at` y `ecf_respuesta`).
- **Candados nuevos:**
  - RNC de 9 dígitos o cédula de 11, sin guiones;
  - estados de MSeller + «pendiente»;
  - entorno TesteCF, CerteCF o eCF;
  - en `pos_ncf_secuencias`, los tipos E31/E32/E33/E34/E41/E43/E44/E45/E46/E47 llevan prefijo igual al tipo y hasta 10 dígitos.
- Índice de pendientes de la DGII.
- **RPC nueva `pos_siguiente_encf(p_tipo)`**: e-NCF de 13 caracteres (E + tipo + 10 dígitos), apartado atómico igual que el NCF de papel. Sin secuencia vigente devuelve null y no inventa números. Permisos: `authenticated` sí; `public` y `anon` no.

## Pruebas (dentro de transacciones que se deshicieron)
- Secuencia E32 de prueba (1 a 3) → `E320000000001`, `…0002`, `…0003` y luego `null`. Después del rollback quedan 0 restos y 3 secuencias, como antes.
- Los candados rechazan: un E32 con prefijo B02, un tipo `B02` en la RPC nueva y un RNC `101-00000-1`.

## Siguiente paso: fase 3 (caja)
- Pantalla para crear las secuencias E31/E32/E34 (las autoriza la DGII).
- Elegir el RNC del cliente en la venta.
- Al cobrar: armar el JSON, mandarlo por `ecf-mseller` (acción «emitir», todavía por hacer), guardar el QR y el código, e imprimir.
- Sin publicar sin «publícalo».
