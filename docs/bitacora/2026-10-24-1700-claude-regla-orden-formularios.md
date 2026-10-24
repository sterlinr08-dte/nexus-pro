# 24-oct-2026 17:00 RD · Regla de orden de formularios y ventanas (compartida con Bayol y STUDIO)

**Origen:** en el CRM de Bayol Cell la ventana «Solicitud de financiamiento» salía con etiquetas en MAYÚSCULAS y casillas sueltas.
El dueño pidió textos formales, todo alineado, y que sea **reglamento para todo el sistema**.

**Qué se escribió:** `DESIGN.md §4b` (misma sección en los 3 proyectos): etiquetas en minúscula normal, textos formales y cortos
en usted sin paréntesis explicativos, casillas en fila con su texto dentro de una tarjeta de 48 px, campos 48/16 px, botón
principal 54 px, la capa gana a la cascada heredada y se prueba a 390 px. Las ventanas nuevas nacen así; las existentes se
corrigen al tocarlas, sin rediseños masivos (regla anti-FOUC de NEXUS).

**En NEXUS PRO no se tocó código:** solo la regla. Al revisar cualquier ventana (Registrar pago, fichas, Configuración) se
aplica.
