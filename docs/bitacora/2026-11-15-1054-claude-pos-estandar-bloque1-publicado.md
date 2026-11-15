# 15-nov-2026 — Claude — POS estándar, bloque 1 PUBLICADO

**Autorización:** el dueño escribió «Publícalo» para este bloque.

## Qué se publicó (build `6037`)
- Datos del negocio y módulos por empresa (Ajustes del POS); una tienda ya no imprime «NEXUS PRO».
- Prefactura: candado contra doble guardado, F9, ticket 80 mm o carta, marca «COPIA», datos de la empresa.
- Base contable: centavos, costo en anulación y devolución, plan de cuentas automático, reportes por páginas.
Detalle en las entradas del 15-nov `…pos-demo-entrega1-y-comparacion-bayol.md` y `…pos-base-contable.md`.

## Base de datos (producción `tnwsgcxurfyuszxsewsn`)
Aplicada por SQL directo la migración `20261115100000_pos_negocio_por_empresa.sql`: `pos_config` + `emp_nombre, emp_rnc, emp_tel, emp_dir, ticket_pie, modulos_off`. Verificado: 16 columnas, 2 filas intactas. No queda en la tabla de migraciones de Supabase.

## Pruebas
negocio 26/26, prefactura 18/18, contabilidad 8/8; regresión fase1 36, fase2 11, compra-segura 50, cubre6 14, empresas 76.

## Pendiente
Empresa de demostración + `demo.nexusprord.com`; pantallas contables de Bayol; resto de mejoras de prefactura; decidir si `bayolsale` se unifica al camino contable común; «Muse»: el dueño dijo que le dio permiso, no está conectado a esta sesión (falta saber qué es).
