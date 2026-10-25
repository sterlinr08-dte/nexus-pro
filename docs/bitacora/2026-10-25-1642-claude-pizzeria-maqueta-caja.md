# Pizzería Unive 2: maqueta de la pantalla de venta (skill apple-design)

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2` · solo es una maqueta: no cambió código de NEXUS ni la base.

- El dueño invocó `/apple-design`. Se aplicó a la caja de la pizzería con la paleta de la dueña.
- **Maqueta interactiva** (Artifact privado): https://claude.ai/artifact/JynWpSvB2H4GaueppMTMD2
- **Qué tiene:**
  - tipo de pedido: Mesa / Para llevar / Delivery;
  - categorías y cuadrícula de productos;
  - hoja de tamaños (Personal, Mediana, Grande, Familiar);
  - pedido con + / − / «Quitar» (ícono y texto, no rojo);
  - propina del 10 % solo en Mesa;
  - «Enviar a cocina» y «Cobrar RD$…» (botón principal en Tomato Red).
  - En el celular, una barra flotante translúcida abre la hoja del pedido. En la PC (≥900 px), el ticket queda fijo a la derecha.
- **Principios de Apple aplicados:**
  - respuesta al tocar (escala 0.97 en 100 ms);
  - hojas con resorte críticamente amortiguado (respuesta 0.3 s);
  - las hojas se pueden interrumpir y arrastrar 1:1, con proyección de impulso al soltar;
  - resistencia elástica en el borde;
  - material translúcido en la barra;
  - respeta reducir movimiento y reducir transparencia.
- **Medido con Playwright a 390 y 1280 px:**
  - 0 controles por debajo de 44×44 (el interruptor de propina se agrandó de 52×32 a 52×44);
  - botón principal de 54 px;
  - sin desborde horizontal.
- Se corrigió un error de JS en la primera versión (`api` usada antes de definirse).
- **Datos de ejemplo:** precios, productos, y el ITBIS (incluido o aparte) están pendientes de las respuestas de la dueña. Los emojis ocupan el lugar de las fotos reales del menú.
