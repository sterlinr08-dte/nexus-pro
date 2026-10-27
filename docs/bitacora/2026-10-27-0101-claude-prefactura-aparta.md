# Caja: prefactura que aparta la mercancía (59.67)

**Contexto y decisión del dueño**
- El dueño pidió que la prefactura «reduzca el inventario como una venta interna». Se explicó que si la mercancía sale hacia un cliente es una venta y debe facturarse, así que se negó la parte de no facturar.
- Se ofreció la prefactura que **aparta**, y el dueño respondió: «Sí, haz la prefactura que aparta y reduce internamente».

## Cómo funciona (`parches-pos.js`, sin cambios en la base)
- **Apartado:** `apartadoDe(pid)` suma las cantidades de las prefacturas abiertas y vigentes (`_prefs`, que ya se cargaban).
- **Disponible:** `stockDisponible(p) = max(0, stock − apartado)`. Lo usan la factura, el carrito de Vender, el catálogo (oculta lo que no tiene disponible) y el tope de cantidad.
- **El inventario real** (`p.stock`) **no baja** hasta facturar, como siempre.
- **Vigencia:** días en Ajustes → «Prefacturas que apartan» (por equipo, `localStorage.nx_pos_pref_dias`, 7 por defecto; 0 = no vence). La prefactura vencida o anulada deja de apartar sola.
- **Al facturar una prefactura** (ya existía): pasa a «facturada», sale de `_prefs` y la mercancía pasa a la factura.
- **Pantallas:**
  - Inventario: «N apartados · M disponibles».
  - Tarjeta de Vender: «X und · N apart.» o «Apartado».
  - Lista de prefacturas: «Aparta la mercancía hasta el dd/mm/aaaa hh:mm» o «Vencida: la mercancía ya no está apartada».
- **Al guardar:** si no alcanza lo disponible, la prefactura se guarda igual (es preventa) y avisa «sin mercancía suficiente para apartar: X faltan N».
- **Aviso al vender:** «Sin stock disponible — disponibles 1 (2 apartados en prefacturas)».

## Pruebas
- `scripts/qa-pos-apartar.mjs` (nueva): **10/10** a 390 y 1280 px.
- Las demás siguen bien: cubre6 14, ecf-caja 59, margen 88, volumen 51, empresas 76, compra segura 50, fidelidad 62.

## Límites
- Lo apartado se calcula con las prefacturas que el equipo cargó al abrir la caja (las 200 abiertas más recientes). Otro equipo lo ve al recargar.
- Los días que aparta se guardan por equipo, no para toda la empresa.

**Rama:** `claude/compite-integrado`. Sin publicar.
