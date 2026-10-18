# Inicio en vidrio, parte 2: «Lo próximo» (59.35, sin publicar) — Claude

- **Pedido del dueño:** «Publícalo y continúa». Se publicó la parte 1 (59.34) y se hizo esta parte 2 de 4.
- **Fuente revisada:**
  - La Agenda del Inicio (`nxIGPintarCrm`) lee las tareas pendientes del CRM (`crm_tareas`, `estado=pendiente`), las mismas que el CRM. Las ordena por `vence_en`, con las vencidas primero, y mostraba 3.
  - En el CRM, «completar» usa la RPC `crm_completar_tarea`. Es idempotente y deja la nota «Tarea completada» en el historial del cliente. «Deshacer» hace un `PATCH` a `estado='pendiente'`.
  - «Cobrar» en todo el sistema es `abrirAbono(cliente)`, el formulario «Registrar pago». WhatsApp es `nxAbrirWhatsAppDeCliente(cliente)`, el Buzón.
- **Archivo `index.html`:** con la capa `#nxInicioPane` encendida, la sección «Agenda» pasa a llamarse **«Lo próximo»**.
  - **Tarjeta grande** con la tarea más urgente:
    - tipo y cuándo («vencida desde el 14 oct», «hoy · 3:00 p. m.», «mañana»);
    - nombre del cliente y título de la tarea;
    - botones **Cobrar** y **WhatsApp**, más un ✓ para marcarla hecha.

    Tocar el nombre abre la ficha del CRM, igual que antes.
  - **Debajo, las 3 siguientes**, cada una con un círculo para marcarla hecha. Se tacha y se va, con el aviso «Tarea completada» y **Deshacer** durante 8 s, como en el CRM.
  - **Funciones nuevas:** `nxIGPane`, `nxIGCuando`, `nxIGPintarProximo`, `nxIGCobrar`, `nxIGWhatsApp`, `nxIGHecha` y `nxIGToastDeshacer`. Marcar hecha usa la **misma RPC** y deja el mismo registro de auditoría (`CRM_TAREA_COMPLETADA` / `CRM_TAREA_REABIERTA`), y avisa al CRM para que refresque (`nxCrmActualizarAgenda`).
  - **Sin consultas nuevas** y sin cambios en Supabase, en el dinero ni en la lógica de cobro.
  - **Alturas fijas** desde el esqueleto (tarjeta de 148 px, filas de 56 px): nada salta. Todo lo tocable mide 44 px o más.
  - **Sin la capa** (`nx_inicio_pane_off=1`), la Agenda se ve como siempre.
  - `APP_VERSION` pasa a `'59.35'`.
- **Archivo `scripts/qa-inicio-glass.mjs`:** ahora cuenta las filas nuevas (`.nxIG-pt`) y toca la tarjeta grande (`.nxIG-proxa`) cuando la capa está encendida.
- **Pruebas:**
  - `qa-inicio-glass.mjs`: **129 PASS · 0 FAIL**.
  - Prueba propia contra la REST simulada:
    - el círculo llama a `POST rpc/crm_completar_tarea` y la tarea sale de la lista;
    - «Deshacer» llama a `PATCH crm_tareas` y la tarea vuelve;
    - «Cobrar» abre «Registrar pago» con el cliente correcto;
    - sin errores de consola en claro (390), glass oscuro (390) y claro (1280).
- **Publicación:** NO publicado. Rama `claude/inicio-vidrio`. Esperar «publícalo».
- **Siguiente:** parte 3, el buscador y la ficha rápida del cliente.
