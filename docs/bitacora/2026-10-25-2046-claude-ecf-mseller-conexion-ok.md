# e-CF con MSeller: conexión comprobada en TesteCF

Sigue a la bitácora `…-claude-ecf-mseller-fase1.md`.

## Pasos
- El dueño guardó en Supabase → Edge Functions → Secrets: `MSELLER_API_KEY` (nueva, del entorno «Prueba»), `MSELLER_EMAIL` y `MSELLER_PASSWORD`.
- Primer intento: MSeller respondió 400 «Incorrect username or password.». El dueño corrigió los datos y, con su «listo», se probó de nuevo.
- `ecf-mseller` v3: los secretos se leen en cada solicitud. Así un secreto nuevo funciona sin reiniciar la función, y el token se reutiliza mientras las credenciales no cambien.

## Resultado (acción `probar`, solo lectura)
`{"entorno":"TesteCF","ok":true,"sesion":true,"apiKey":true,"status":404,"respuesta":{"code":"DOCUMENT_NOT_FOUND"}}`
- **Inicio de sesión aceptado** y **API key aceptada**: el 404 es lo esperado, porque se consultó a propósito un e-NCF que no existe.
- No se envió nada a la DGII ni se gastaron secuencias.

## Siguiente paso
La fase 2 (secuencias e-NCF y RNC del comprador), con auditoría previa de `pos_ventas` y `pos_ncf_secuencias`.
