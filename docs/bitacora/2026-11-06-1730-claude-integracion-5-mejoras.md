# 06-nov-2026 · Integración de las 5 mejoras + ocultar Comisiones (RAMA `claude/mejoras-todas`, sin publicar)

## Pedido
- Dueño: «Manda 5 agentes programadores y diseñadores para nexus pro a que hagan mejoras y ajustes». Después: «Sí, sigue y oculta Comisiones».

## Ramas (cada una con su bitácora propia)
| Rama | Qué |
|---|---|
| `claude/mejoras-inicio-menu` | «Inicio» en vez de «Dashboard», textos completos, toques de 44 px, ⌘K con «Ir a…» (`parches-inicio-menu.js`) |
| `claude/mejoras-clientes` | búsqueda sin tildes ni guiones, barra de selección legible + «Elegir los 10», toques de 44 px, avisos al momento en la ficha (`parches-clientes-ficha.js`) |
| `claude/mejoras-facturas-ui` | listas vacías con motivo y arreglo, fecha «vie 6 nov», sin «Banco: —» en el celular, «Volver a intentar» (`parches-facturas-cobros-ui.js`) |
| `claude/mejoras-whatsapp-movil` | Buzón compacto en el celular: de 6 a 8 chats a la vista (`parches-whatsapp-movil.js`) |
| `claude/mejoras-pulido-global` | ciclo 20→20 legible en el celular, campos de 48 px, pestañas de Configuración con aviso (`parches-pulido-global.js`) |
| `claude/ocultar-comisiones` | «Comisiones» fuera del menú (ver `2026-11-06-1700-claude-ocultar-comisiones.md`) |

## Integración
- Al juntar las ramas, `parches-seguros.js` tuvo conflictos. Se resolvieron, pero **faltaban comas** en la lista de capas: `['js','a'] ['js','b']` no es un error de sintaxis, pero hace que esas capas no carguen. Se corrigió en el commit de integración.
- Ninguna rama toca Supabase, dinero ni envíos de WhatsApp. No hay IDs de modelo en archivos ni en commits.

## Pruebas, todas sobre la rama combinada
| Prueba | Resultado |
|---|---|
| inicio-menu | 88/88 |
| clientes-ficha | 72/72 (ver nota) |
| facturas-cobros-ui | 95/95 |
| whatsapp-movil | 44/44 |
| pulido-global | 68/68 |
| wa-masivo (59.81) | 34/34 |
| factura-cliente (59.78) | 34/34 |

- **Nota clientes:**
  - En la primera corrida salió 1 fallo: hubo PATCH a `clientes.pagado` de 3 clientes.
  - **Causa:** `reconciliarPagosClientes()` (`index.html:13558`, código ya en producción y sin cambios) cuadra el pagado con los abonos al cargar. La primera carga del simulador lo dispara, porque sus abonos de ejemplo no están sumados al pagado.
  - Con el simulador ya cargado una vez: 72/72.
  - No es regresión de estas ramas.

## Pendiente
- Que el dueño vea las capturas y elija qué publicar (todo o por partes).
- Al publicar, actualizar `docs/MEMORIA.md` (los agentes no la tocaron para no chocar).
- Aparte, si el dueño quiere: quitar la sección «💼 Agentes/comisiones» del reporte por correo o WhatsApp (`parches-seguros-base.js:7992`).
