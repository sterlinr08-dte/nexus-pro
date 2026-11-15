# 15-nov-2026 — Claude — Tiendas del POS (y la demo) siempre en modo claro (rama, sin publicar)

**Pedido del dueño:** «la apariencia ponla blanca, ósea quítale el modo oscuro». Interpretado (confirmado en una línea en el chat): las empresas tipo **tienda** (POS y demo) se ven en modo claro; la correduría queda con la preferencia de cada usuario.

Bloque 5 (segunda prueba de Muse) publicado antes con el PR #483, build 6044, verificado en vivo.

## Cambios en `index.html` (build 6045)
- Arranque (script del `<head>`, antes del primer pintado): si `localStorage.nx_org_tipo === 'tienda'`, el tema es `clasico` (modo claro, `html.tema-claro`) aunque el usuario tenga guardado oscuro.
- `aplicarTema`: en una tienda cualquier tema se convierte en `clasico` y **no** se guarda como preferencia en la base.
- `aplicarOrgSidebar`: al confirmar que la empresa es tienda aplica el claro si no estaba.
- `body.org-tienda #btnDarkMode{display:none}`: el botón de modo oscuro no aparece en las tiendas.
- Apagar: quitar estas líneas (no hay interruptor separado).

## Prueba (sesión real de la demo, local)
Usuario con oscuro guardado (`glass-oscuro` a 390 px, `premium` a 1280 px): 0 de 90 muestras con la app visible en oscuro; queda `tema-claro`; botón oscuro oculto; sigue claro tras recargar; 0 errores. Regresión: negocio 26, fase1 36, compra-segura 50, cobro-caja 22, vender-toque 24.

## Efecto lateral conocido
El espejo local `nx_tema` del navegador queda en `clasico` después de usar una tienda. Si en el mismo navegador se entra luego a la correduría, el primer cuadro puede salir claro y pasa al tema guardado en la base al iniciar sesión.
