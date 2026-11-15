# 15-nov-2026 — Claude — Demo del POS: hallazgos de Muse y bloque 1 (rama, sin publicar el código)

**Quién es Muse:** asistente del dueño (otra IA). No tiene usuario en el sistema ni acceso a datos reales; lee GitHub y el chat. Probó la demo como dueño de tienda primerizo, en ventana de ~500 px y vista de cuadrícula.

## Lo que Muse comprobó que funciona
Entrada sin clave; venta completa (Agua RD$25 + Arroz RD$185 = RD$210, factura CO00000001), recibo, Kardex descuenta; no se ven datos de la correduría; configuración bloqueada; sin IA, Reparaciones, Ajustes ni WhatsApp.

## Hallazgos (verificados contra `origin/main`)
1. Vender en cuadrícula angosta no muestra la existencia (en la lista de PC sí). — pendiente, bloque 4.
2. Tocar un artículo abre la ventana «Buscar artículo» en vez de agregarlo. — pendiente, bloque 4.
3. La caja cerrada solo avisa al confirmar la venta (`parches-pos.js:3917`). — pendiente, bloque 3.
4. El ITBIS no se explica (arroz exento, agua gravada: 25×18/118≈4). — pendiente, bloque 3.
5. Dos números para la misma venta: `numero_factura` CO00000001 y `numero` 62, que es un contador común a todas las empresas. — pendiente, bloque 2.
6. Inicio: «Sin ventas hoy todavía» después de vender. — pendiente, bloque 2.
7. La existencia no se refresca en pantalla tras vender. — pendiente, bloque 2.
8. Módulos de sobra para un colmado. — **hecho** (decisión del dueño, abajo).
9. **Al recargar se veía ~1,5 s la pantalla de Seguros** (módulos, sin datos). — **corregido en esta rama.**
10. Restos de taller: tarjeta «Equipos pendientes / Taller al día» y texto del buscador con IMEI, recepción, garantía, orden. — **corregido en esta rama.**

## Decisión del dueño (15-nov-2026)
En la demo de tienda general se apagan **Entidades, CRM, Recursos Humanos, Cuotas y Apartados**; **Contabilidad queda encendida**.
Aplicado en producción (SQL directo, solo la empresa `demo`): `pos_config.modulos_off` y la semilla dentro de `demo_reiniciar()` → `ia, reparaciones, whatsapp, entidades, crm, rrhh, cuotas, apartados`. Migración `20261115190000` actualizada igual.

## Cambios de código en esta rama (build 6040, SIN publicar)
- `index.html`: el tipo de empresa se guarda en `localStorage.nx_org_tipo`; si es `tienda` y hay sesión, un script en `<head>` oculta `#app` (`html.nx-arranque-tienda`) hasta que abre el POS; salida de seguridad a los 9 s; se quita de inmediato si la empresa no es tienda.
- `demo.html`: deja `nx_org_tipo='tienda'` antes de entrar.
- `parches-pos.js`: la tarjeta «Equipos pendientes» y el texto del buscador dependen de que Reparaciones esté activo.

## Prueba
`e2e` con sesión real de la demo, 500 y 1280 px, muestreo cada 120 ms durante 12 s: **en vivo** al recargar, pantalla de Seguros visible en 14 y 12 muestras; **con el arreglo**, 0 en entrada y recarga; POS visible a los 2,4–3,2 s; sin «Equipos pendientes»; 0 errores de JS. Regresión: negocio 26, prefactura 18, contabilidad 8, fase1 36, fase2 11.
