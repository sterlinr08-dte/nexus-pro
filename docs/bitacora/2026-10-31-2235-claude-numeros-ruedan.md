# 31-oct-2026 22:35 · Claude · 59.76 «Números que ruedan» cifra por cifra (idea de React Vibe)

## Pedido del dueño
- Mandó un reel de React Vibe (reactvibe.com). Se le mostró una maqueta con 3 ideas (https://claude.ai/artifact/A86QzgUMVNJ6jEhtHSNRWN) y eligió: **«La 2 en NEXUS»**, es decir, números que ruedan.

## Diagnóstico y fuente de verdad
- NEXUS ya tenía números que ruedan desde 59.24 (`parches-beui-pro.js`, idea de beUI): un contador que reescribe `textContent` desde el valor viejo hasta el nuevo.
- Se aplica a: resumen de Cobros (`#cobResumen .sf-kpi .v`), Historial de pagos (`#pgTotal*`, `#pgClientesPagaron`, `#pgPromedio`), Solicitudes (`.nxSL-*`), Inbox (`.nxWaProKpi .v`) e Inicio (`.nxIG-kv`).
- No se creó otra capa. Se cambió el dibujo del giro dentro de la misma capa.

## Qué cambió (solo `parches-beui-pro.js`; no toca datos, RPC ni cálculos)
- `odometro()`: cada cifra es una columna 0–9 que gira hasta su número, como un cuentakilómetros.
  - Solo giran las cifras que cambian, de derecha a izquierda (35 ms entre cifras, máximo 280 ms).
  - Duración 0,7 s con la curva de la casa `cubic-bezier(.22,1,.36,1)`.
- **El texto real nunca cambia mientras gira.** Los dígitos de las columnas se pintan con CSS `::before` y el valor exacto queda en un span oculto (`.nxOdoTxt`). Así `textContent` siempre es el valor verdadero, para la app y para los lectores de pantalla. Al terminar se deja el texto plano de la app.
- Bordes desvanecidos (`mask-image`) para que no se asomen las cifras vecinas a mitad del giro.
- Cifras con `tabular-nums` en esos cuadros, para que no cambien de ancho.
- Si el elemento es en línea, ocupa varias líneas o tiene alto raro, se usa el contador de siempre (respaldo).
- Con «Reducir movimiento» no gira nada, igual que antes.
- Si la app escribe otro valor a mitad del giro, gana el de la app y se vuelve a girar desde ahí.

## Pruebas
- `scripts/qa-beui-pro.mjs` actualizado: **64/64 PASS** a 390, 430 y 1280 (oscuro y clásico) y con reducir movimiento. Verifica:
  - que gira cifra por cifra;
  - que el texto real no cambia y el alto no salta;
  - que termina en texto plano;
  - que repintar el mismo valor no gira;
  - que un pago nuevo solo gira las cifras que cambian (3 de 5 en 16,500 → 21,000);
  - que no hay errores.
- Capturas mirando el giro cuadro por cuadro: `img/2026-10-31-numeros-ruedan/giro-390.png` (Inicio, oscuro) y `giro-1280.png` (Cobros, claro).

## Estado
- Rama `claude/nexus-numeros-ruedan` (sacada de `main`). **Sin publicar.**
- Para apagarlo en un equipo: `localStorage.nxBeuiPro='0'` (apaga toda la capa 59.24, como siempre).

## Siguiente paso
- Que el dueño lo vea y diga «publícalo». Entonces se abre el PR y se une a `main`.
