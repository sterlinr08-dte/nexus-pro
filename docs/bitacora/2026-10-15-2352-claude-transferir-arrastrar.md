# 2026-10-15-2352 — Claude — 59.32: arrastrar el billete al agente en «Transferir dinero» (sin publicar)

## Solicitud del dueño
De la revisión de bencho.dev eligió la idea 1: «Arrastrar dinero a un amigo» para las transferencias entre agentes de NEXUS.

## Fuente de verdad revisada (antes de tocar nada de dinero)
- Las transferencias ya existen (Bloque 4C):
  - tabla `transferencias_agentes`;
  - RPC `transferencias_crear`, `transferencias_aceptar` y `transferencias_rechazar`, con saldo real, candado por agente e idempotencia.
- Ventana «Transferir dinero»: `parches-seguros-base.js` (`createTransferModal`, `nxGuardarTransferenciaAgenteV2` → `rpc/transferencias_crear`).
- **No se toca nada de esto.** La transferencia sigue pendiente hasta que la acepte quien recibe.

## Qué se hizo
- Capa nueva y aislada: `parches-transferir-arrastrar.js`, cargada al final de `parches-seguros.js`.
  - Arriba de la ventana aparece una franja con un **billete verde** que muestra el monto mientras se escribe, y los **círculos de los agentes** con sus iniciales. Quien entrega no aparece en esa lista.
  - Se arrastra el billete con el dedo o el ratón y sigue al dedo 1:1. Al soltarlo sobre un agente, el billete «entra» en el círculo y el agente queda marcado con ✓. Abajo dice «Para X · RD$… · confirma con Enviar transferencia».
  - También se puede **tocar** el círculo. La lista «Recibe» de siempre sigue y se sincroniza en las dos direcciones.
  - Si se suelta fuera, el billete vuelve a su sitio y no cambia nada.
  - Respeta «reducir movimiento». Vibra un poco en el celular al elegir.
- Solo llena el mismo `<select id="nxTA2Hacia">`. El envío sigue siendo el botón «Enviar transferencia», sin cambios.
- Interruptor: `localStorage.nxArrastrar='0'`, o borrar su línea del cargador.
- Versión 59.32 (build 6032).
- Mock de QA: `transferencias_crear` responde ok.

## Pruebas
- `scripts/qa-transferir-arrastrar.mjs`: **44 PASS / 0 FAIL** en 390, 430 y 1280 px. Comprueba:
  - arrastrar y soltar elige el destino;
  - soltar fuera no cambia nada;
  - tocar el círculo también elige, y la lista de siempre sigue sincronizada;
  - se manda **una sola** `rpc/transferencias_crear` con el destino, el monto y el origen elegidos;
  - no hay errores en la página;
  - el interruptor apaga la franja.
- Regresión:
  - `qa-custodia` 68/0;
  - `qa-registrar-pago` 54/0;
  - `qa-rapidez` 46/0.

## Rama y publicación
Rama `claude/transferir-arrastrar`, sacada de `main` (59.31). **Sin publicar**: espera el «publícalo» del dueño.

## Riesgos
- Ninguno en dinero: no cambia la base, las RPC ni la lógica de envío.
- Visual: probado en el tema oscuro del QA. Falta verlo en el iPhone real del dueño.
