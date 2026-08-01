# NEXUS_LOGIN_CORPORATE_BACKGROUND_V1

## Objetivo

Referencia visual para reemplazar únicamente el fondo actual de la pantalla de login de NEXUS PRO por un ambiente corporativo frío, profesional y desenfocado.

## Archivo visual

- `NEXUS_LOGIN_CORPORATE_BACKGROUND_V1.svg`
- Formato panorámico 1280 × 853.
- El SVG contiene la imagen incrustada, por lo que no depende de recursos externos.

## Pantalla

- Login / autenticación.
- No modifica la tarjeta oscura, logo, escudo, campos, checkbox ni botón ya aprobados.

## Dirección visual

- Oficina corporativa moderna.
- Tonos azul oscuro y azul frío.
- Sin personas.
- Sin cafetería.
- Sin elementos decorativos dominantes.
- Desenfoque amplio y zonas de contraste parejo para funcionar detrás de una tarjeta oscura semitransparente.

## Colores que deben conservarse

- Fondo base: `#08101c`
- Tarjeta: `rgba(13,17,23,.95)` con blur.
- Acento: `#2563eb` / `#3b82f6`

## Reglas para Claude

1. Usar la imagen como fondo de la página del login, no dentro de la tarjeta.
2. Mantener la tarjeta y la autenticación actuales sin cambios funcionales.
3. Aplicar encuadre tipo `cover`, centrando la zona de oficina y evitando recortes que coloquen elementos brillantes detrás del formulario.
4. Mantener un overlay oscuro y frío si hace falta legibilidad, pero sin cambiar la paleta aprobada.
5. No añadir personas, texto, ilustraciones, partículas ni nuevas animaciones.
6. No modificar `main` desde esta propuesta; auditar e implementar sobre el código real antes de publicar.

## Mejoras opcionales separadas

### A. Foco de campos

Glow azul muy sutil al enfocar usuario o contraseña. Debe ser independiente del cambio de fondo.

### B. Entrada de tarjeta

Fade + scale de aproximadamente 180 ms al cargar. Sin rebote ni movimiento continuo.

### C. Escudo

Mantener el glow actual; como máximo, ajustar ligeramente su intensidad después de probar el nuevo fondo.

### D. Legibilidad móvil

En pantallas estrechas, priorizar que el centro visual del fondo permanezca detrás de zonas oscuras y no de fuentes de luz.
