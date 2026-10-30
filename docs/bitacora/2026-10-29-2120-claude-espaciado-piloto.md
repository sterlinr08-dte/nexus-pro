# 2026-10-29 21:20 (RD) — Claude — Piloto «Espaciado de formularios» en 5 ventanas (59.71, SIN publicar)

## Pedido del dueño
Regla nueva de `DESIGN.md` «Espaciado de formularios (dueño, 29-oct-2026)» (rama `claude/regla-espaciado`). Tras la
auditoría de formularios, el dueño eligió **«prueba con 5 primero»** en NEXUS: Registrar pago, Nuevo/Editar cliente,
Usuario, Nuevo agente y Nueva empresa. Rama nueva, sin publicar a `main`.

Regla: título → ayuda 8 · etiqueta → cajita 8 · cajita → ayuda/error 4 · campo → campo 20 · grupo → grupo 24 (encabezado →
campos → botón principal → otras opciones) · botones de una lista 8 · borde interior 48 arriba/abajo y 40 a los lados en
PC, 24/16 en celular. Tolerancia ±2 px. Más las de siempre: campos 48 px con letra 16, botón principal 54, tocables ≥ 44.

## Qué se hizo
- **Una sola capa nueva y aislada** al final del `<head>` de `index.html`: `script#nxFormEspaciadoOn` + `style#nxFormEspaciado`.
  Todas las reglas van bajo `html:not(.nx-fesp-off)` y acotadas a `#mAbono`, `#mCli`, `#mUsuario`, `#mAgente`, `#mEmp`
  (id repetido 6 veces: gana a `#nxCobroPane`/`#nxFichaPane`/`#nxP4Pane`/`#nxP5Pane` (4 ids) y a `#nxAdelPane` (5 ids),
  que está más abajo, en el `<body>`). Celular = `@media (max-width:600px)`, el mismo corte que usan las capas de cobro y ficha.
- Solo cambia **espacios** (márgenes, rellenos, separaciones) y el alto del enlace «Historial». Colores, vidrio, ids, chips,
  funciones (`regAbono`, `guardarCli`, `guardarUsuario`…) y los demás formularios no se tocan. Sin JS de lógica.
- `APP_VERSION` 59.70 → **59.71** (el repo no usa `?v=` para `index.html`; solo se sube `APP_VERSION`).

### Cómo apagarlo
- En un equipo: `localStorage.setItem('nx_fesp_off','1')` y recargar.
- Para todos: `var NX_FESP=false` en `script#nxFormEspaciadoOn`.
- Comprobado: con `nx_fesp_off='1'` las medidas de las 5 ventanas son **idénticas** a `main` (10/10) y las capturas
  coinciden píxel a píxel (0 píxeles distintos en las 10).

## Cambios exactos (antes → después)

**Usuario, Nuevo agente, Nueva empresa** (`#mUsuario`, `#mAgente`, `#mEmp`)
| Qué | Antes | Después |
|---|---|---|
| Borde interior (relleno de `.modal`) | 20 px (PC) / 14 px (celular) | 48 · 40 (PC) / 24 · 16 (celular) |
| Cabecera → primer campo (`.mt` margen abajo) | 14 | 24 |
| Etiqueta → cajita | 3 | 8 |
| Campo → campo (`.gf2` fila + `.fr` margen) | 9 + 9 = 18 | 20 (gap 20, margen 0) |
| Últimos campos → botones (`.fe` margen arriba) | 12 + 9 = 21 | 24 |
| Cancelar ↔ Guardar | 7 | 8 |

**Registrar pago** (`#mAbono`, cabecera y pie fijos: el borde va en ellos)
| Qué | Antes | Después |
|---|---|---|
| Lados (`.modal` relleno) | 20 | 40 (PC) / 16 (celular) |
| Arriba (`.mt` relleno superior) | 14 | 48 (PC) / 24 (celular) |
| Abajo (`.fe` relleno inferior + zona segura) | 16 | 48 (PC) / 24 (celular) |
| Título → tarjeta del cliente | 4 | 8 (la tarjeta es la «ayuda» del título: a quién se cobra) |
| Grupo → grupo (`.pgSec`: Monto, Método, Recibido por) | 10 | 24 |
| «Monto» → cajita del monto | 24 | 8 (fila alineada abajo; «Historial» con −8 px abajo para no empujar) |
| «Historial» | 80 × 36 | 80 × 44 |
| Título de sección → fichas (Método, Recibido por, Banco) | 6 + 10 | 8 |
| Campo → campo dentro de «Método» (banco, referencia, cuenta de destino, comprobante) | 10–12 | 20 |
| Nota bajo «Recibido por» | 8 | 4 |
| Último contenido → resumen/botón (`.fe` margen + relleno) | 16 + 10 | 12 + 12 = 24 |

**Nuevo / Editar cliente** (`#mCli`, cabecera y pie fijos)
| Qué | Antes | Después |
|---|---|---|
| Lados / arriba / abajo | 20 / 14 / 16 | 40 / 48 / 48 (PC) · 16 / 24 / 24 (celular) |
| Cabecera → «Empresa cotizante» | 4 + 22 = 26 (medido 22) | 24 |
| Título de sección → lo suyo (Empresa, Referencia, Póliza y ARS, Dependientes) | 4–8 | 8 |
| Campo anterior → título de sección | 14–22 | 24 |
| Etiqueta → cajita | 6 | 8 |
| Campo → campo (`.gf2`, `.frow`, ARS → Dirección) | 14 (y 0 entre ARS y Dirección) | 20 |
| Fichas de empresa → «Nombre completo» | 10 + 8 = 18 | 20 |
| Cajas «Estado y proceso» y «Precio personalizado» | 14–16 | 24 (grupo) |
| Fila de dependientes → lista | 7 (+16 vacío) | 8 (lista vacía oculta) |
| Letra del parentesco (`#dR`) | 15 px | 16 px |
| Último contenido → «Guardar cliente» | 18 + 10 | 12 + 12 = 24 |
| Sombra suave bajo la cabecera fija | — | degradado de 16 px (absoluto, no ocupa espacio) |

## Medidas con Playwright (simulador con admin falso, red a Supabase bloqueada)
Scripts de la auditoría reutilizados (`measure.js` + reglas de `evaluate.js`) con un recorrido nuevo para las 5 ventanas.
En las ventanas con pie fijo (cobro y ficha) el hueco «campos → botón» se mide al final del desplazamiento; por eso la
ficha en `main` suma una falla más que en la auditoría (28 px reales entre el último campo y «Guardar cliente»).

| Formulario | 390 antes | 390 después | 1280 antes | 1280 después |
|---|---|---|---|---|
| Registrar pago | no cumple (4 fallas) | **cumple** | no cumple (4) | **cumple** |
| Nuevo cliente | no cumple (3) | **cumple** | no cumple (3) | **cumple** |
| Usuario | no cumple (4) | **cumple** | no cumple (4) | **cumple** |
| Nuevo agente | no cumple (4) | **cumple** | no cumple (4) | **cumple** |
| Nueva empresa | no cumple (4) | **cumple** | no cumple (4) | **cumple** |

Medidas clave después (390 / 1280): borde interior 24·16 / 48·40 (+1 px del borde de la ventana); etiqueta → cajita 8;
campo → campo 20; cabecera → primer campo 24; campos → botón 24; botones 8; campos 48 px con letra 16; botón principal
54 px (Registrar pago, Guardar cliente, Guardar); nada tocable por debajo de 44 × 44; botón principal a 24 / 48 px del borde
inferior. Con «Transferencia» elegida en el cobro y con «Estado y proceso» abierto en la ficha: etiqueta → cajita 8 en
todos los campos, campo → campo 20, sin tocables chicos.

Otras comprobaciones: sin scroll horizontal en ninguna (390 y 1280); las ventanas largas siguen desplazándose y el botón
principal queda visible y fijo abajo; foco en «Dirección» (ficha) queda a la vista. Capturas lado a lado en
`docs/bitacora/img/2026-10-29-espaciado-piloto/` (antes = `main` 59.70, después = 59.71).

## Riesgos
- **Las ventanas crecen.** En PC, «Registrar pago» ya no cabe entera en 1280 × 900 (antes 799 px de alto, justo): ahora se
  desplaza y el pie fijo tapa «Recibido por» hasta bajar un poco. Las sencillas pasan de 400–409 a 488–512 px de alto en PC (de 550–649 a 616–722 en celular). Es
  lo que pide la regla (48/40), pero el dueño debe verlo.
- Ya existía (no lo causa este cambio): en el cobro, al enfocar «Referencia» por programa, el campo puede quedar detrás del
  pie fijo (pasa igual en `main`).
- Cajas internas (resumen del cobro, «Estado y proceso», «Precio personalizado») conservan su relleno de 12–14 px: la regla
  48/40 se aplicó al borde de la ventana, no a las tarjetas de dentro.
- El monto grande del cobro (letra 42–46 px, 54–60 px de alto) se deja como está: es el campo protagonista.
- Sin FOUC: la clase de apagado se pone en el `<head>` antes del primer pintado, igual que las otras capas.

## Rama, commit y publicación
- Rama `claude/espaciado-piloto` (desde `origin/main` 59.70). **Sin PR y sin publicar.**
- Archivos: `index.html` (capa nueva + `APP_VERSION`), esta bitácora, `docs/MEMORIA.md`, capturas.
- No se tocaron Supabase, RPC, Edge Functions ni datos.

## Siguiente paso
1. El dueño mira las capturas (o la rama) y decide: publicar así, o bajar a 32/24 en PC si las ventanas le quedan muy
   grandes (habría que cambiar la regla en `DESIGN.md`).
2. Si aprueba, abrir PR y publicar con su «publícalo»; luego seguir con los demás formularios de la auditoría por tandas.
