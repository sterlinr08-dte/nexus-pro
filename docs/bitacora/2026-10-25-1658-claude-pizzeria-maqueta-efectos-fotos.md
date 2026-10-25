# Pizzería Unive 2: maqueta v5 con todos los efectos de NEXUS y fotos reales

**Autor:** Claude · **Rama:** `claude/pizzeria-unive2` · solo es maqueta: no cambió código de NEXUS ni la base.

- **Pedido del dueño (25-oct-2026):** «Hazla con todos los efectos de nexus y las imágenes realistas».
- **Maqueta v5:** https://claude.ai/artifact/JynWpSvB2H4GaueppMTMD2

**Efectos de NEXUS aplicados (rehechos en JS y CSS normales):**
- **Vidrio:** paneles translúcidos sobre la foto de una pizza muy difuminada. Las hojas también son de vidrio.
- **Botones encendidos:** en Cobrar, Agregar, la píldora y las opciones elegidas (59.57).
- **Isla de avisos:** «Agregada al pedido», «Comanda enviada», «Cobrado RD$…» (59.20).
- **«Hoy, en vivo»:** gráfica que sube con cada cobro (Liveline, 59.21), más un odómetro de números que ruedan (beUI).
- **Border beam** en «Enviar a cocina» mientras queda algo sin enviar. Después, cada fila dice «En cocina ✓».
- **Línea fina de carga** al enviar a cocina (Raycast).
- **Impresora de recibos** y **mantén presionado para vaciar** (The Kitchen).
- **Deslizar a la izquierda para quitar** una fila (beUI), con resistencia elástica.
- **La foto vuela a la píldora** al agregar un producto.
- **Hojas con resorte**, que se pueden arrastrar e interrumpir (skill apple-design).
- **Sin barra fija abajo.**
- Respeta «reducir movimiento» y «reducir transparencia».

**Fotos:**
- Son 12 fotos reales de **Unsplash**, con licencia gratuita también para uso comercial y sin atribución obligatoria.
- Se bajaron de `images.unsplash.com` (ids obtenidos con Firecrawl).
- Se recortaron a 480×360 y pesan unos 315 KB en total.
- Se evitaron marcas: se descartó una foto de Coca-Cola y se recortó la etiqueta de una botella. La del agua tiene un rótulo pequeño.
- Se publicaron junto a la maqueta en `fotos/`. **No están en el repo.**
- En el sistema real van las fotos del menú de la pizzería.

**Medido con Playwright a 390 y 1280 px:**
- 0 controles por debajo de 44 px;
- Cobrar de 54 px;
- sin desborde;
- 0 errores de JS.

Se corrigió que el texto «Quitar» se transparentaba detrás de la fila: ahora la fila es opaca (`--solid`).

**Pendiente:** fotos, precios y ITBIS reales (formulario de la dueña).
