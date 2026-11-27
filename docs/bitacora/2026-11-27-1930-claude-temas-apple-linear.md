# 2026-11-27 19:30 RD · Claude — Temas Apple y Linear (sin publicar)

Sigue a `2026-11-27-1910-claude-tema-stripe-publicado.md`. El dueño: «Vamos a revisar para continuar con los otros». Se interpretó así: mientras él revisa Stripe, se hacen Apple y Linear con el mismo método.

## Qué se hizo
- **Un solo mecanismo para los tres temas de paleta.** `script#nxTemaStripeOn` pasa a ser `script#nxTemasPaletaOn` (y `style#nxTemaStripe` pasa a `style#nxTemasPaleta`), con una lista de temas, cada uno con su **tema base** y su **paleta**:
  - **Stripe** = Claro + paleta Stripe. Sin cambios respecto a lo publicado.
  - **Apple** = Claro + tinta `#1d1d1f`, azul `#0066cc` y fondo gris perla liso `#f5f5f7` (sin foto ni degradado).
    - También pasan al azul los **16 morados del sistema** (`#6d28d9` ×277, `#7c3aed` ×129, `#4f46e5` ×96…): Apple usa un solo color.
  - **Linear** = **Glass oscuro** + casi negro `#010102`, paneles `#0f1011`/`#141516` y acento lila `#5e6ad2`.
    - Los azules claros del Glass también pasan a lila (`#93c5fd`→`#828fff`). Los grises de texto pasan a los de Linear.
    - El cristal grafito `rgba(28,30,35,.5)` pasa a `rgba(15,16,17,.5)`.
    - Fondo casi negro con un halo lila suave arriba, en lugar de la foto.
- Cada copia de regla lleva `:where(html.tema-<nombre>)` (no suma prioridad) y va al lado de su original. Se saltan las reglas de los **otros** temas, según su base.
- **`<head>`:** `stripe`/`apple` → clase `tema-claro` + `tema-<nombre>`; `linear` → `tema-glass-oscuro` + `tema-linear`. `data-nx-tema` sigue en el tema base. Interruptores `NX_TEMA_APPLE` y `NX_TEMA_LINEAR`.
- **`aplicarTema`:** generalizado para los tres.
- **Botón sol/luna:** recuerda el último claro (Claro, Stripe o Apple) en `nx_tema_luz` y el último oscuro (Glass oscuro o Linear) en `nx_tema_noche`.
- **Apariencia:** opciones APPLE y LINEAR. Como Stripe, **solo para el dueño del sistema** (`mi_es_superadmin`) o para quien ya lo tenga elegido. Para todos: `NX_TEMA_APPLE_TODOS` / `NX_TEMA_LINEAR_TODOS`.

## Pruebas (app real contra `scripts/qa-crm-mock-server.js`)
- `scripts/qa-tema-stripe.mjs`, ahora con los tres temas (`QA_TEMAS=stripe,apple,linear`): **106/106**.
  - En cada tema: clases, acento, fondo, primer pintado ya con su color, sin desplazamiento de lado en 7 pantallas, Apariencia sin Premium y con el tema marcado, sin errores.
  - Premium guardado pasa a Glass oscuro; Claro y Glass oscuro no cambian.
  - Un administrador que no es el dueño no ve ninguno de los tres.
  - Después de agregar los morados a Apple: Apple 38/38 de nuevo.
- `scripts/qa-tema-stripe-contraste.mjs` (`QA_TEMA=apple|linear`, comparado con su tema base): **ningún texto empeora** en 10 pantallas, a 390 y 1280 px.
- Reglas cambiadas: Stripe 1,755 · Apple ~1,755 + morados · Linear 1,297.
- **Pendiente (menor):** en Apple quedan en morado los avatares de algunas filas y el ícono de «Transferencia». Esos colores vienen escritos directo en la pantalla, no en las hojas de estilo.
- **No verificado:** el iPhone real con sesión real.

## Siguiente paso
- El dueño ve las capturas y dice «Publícalo».
- Después elige qué temas abrir a todos.
