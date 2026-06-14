# Reglas a aplicar en cada novedad / actualización

Checklist obligatorio **al momento de** y **luego de** aplicar cualquier
novedad o actualización en NEXUS PRO.

## Los 6 puntos

1. **Depurar** — Revisar el código nuevo: quitar restos/dead code, validar que
   no haya errores, y que no rompa funciones existentes (especialmente
   navegación y clics).
2. **Refactorizar** — Dejar el código limpio y consistente con el estilo del
   archivo (nombres, comentarios, sin duplicación innecesaria).
3. **Probar** — Verificar sintaxis (`node --check parches.js`) y la lógica del
   cambio antes de desplegar.
4. **Web móvil angosta** — Comprobar que se vea bien en pantallas angostas
   (≈320–480px): sin desbordes horizontales, texto que no se corta, botones
   tocables.
5. **Auditar los grids** — Revisar las rejillas (`.qa-g`, `.kg`, `.g2/.g3/.g4`,
   etc.) y que sus breakpoints (768 / 640 / 480px) sigan cuadrando.
6. **Rejilla adaptable** — Las rejillas deben ser adaptables
   (`auto-fit`/`auto-fill` + `minmax`, o columnas por breakpoint), nunca anchos
   fijos que desborden.

## Pasos estándar de despliegue (recordatorio)

- Subir `APP_VERSION` en `index.html` y `version`/changelog en `version.json`
  (mantenerlos sincronizados para que la app avise de la actualización).
- `node --check parches.js` (probar).
- Commit descriptivo y **push a `main`** (la app descarga de `main`; el usuario
  solo le da "Actualizar").
- Pedir captura de cualquier pantalla que se vea rara para corregir.
